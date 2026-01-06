/**
 * Sync Manager
 * Gestiona la sincronización bidireccional entre IndexedDB y Supabase
 */

import supabaseClient from "./SupabaseClient.js";
import db from "./db.js";
import authManager from "../auth/AuthManager.js";

class SyncManager {
  constructor() {
    this.isSyncing = false;
    this.lastSyncTime = null;
    this.syncInterval = null;
    this.autoSyncEnabled = true;
    this.syncIntervalMinutes = 5;
  }

  getCurrentUserId() {
    return authManager.getUser()?.id || null;
  }

  getLastSyncKey(tableName) {
    const userId = this.getCurrentUserId();
    return userId ? `lastSync_${tableName}_${userId}` : `lastSync_${tableName}`;
  }

  /**
   * Iniciar sincronización automática
   */
  startAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.autoSyncEnabled = true;

    // Sincronización inicial
    this.syncAll();

    // Sincronización periódica
    this.syncInterval = setInterval(() => {
      if (this.autoSyncEnabled) {
        this.syncAll();
      }
    }, this.syncIntervalMinutes * 60 * 1000);

    console.log(
      `✅ Sincronización automática iniciada (cada ${this.syncIntervalMinutes} minutos)`
    );
  }

  /**
   * Detener sincronización automática
   */
  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    this.autoSyncEnabled = false;
    console.log("⏸️ Sincronización automática detenida");
  }

  /**
   * Sincronizar todas las tablas
   * @returns {Promise<Object>}
   */
  async syncAll() {
    if (this.isSyncing) {
      console.log("⏳ Sincronización ya en progreso...");
      return { success: false, message: "Sync already in progress" };
    }

    const client = supabaseClient.getClient();
    if (!client) {
      console.log("⚠️ Supabase no configurado, omitiendo sincronización");
      return { success: false, message: "Supabase not configured" };
    }

    if (!authManager.isAuthenticated()) {
      console.log("🔒 Usuario no autenticado, omitiendo sincronización remota");
      return { success: false, message: "User not authenticated" };
    }

    this.isSyncing = true;
    const startTime = Date.now();
    const results = {
      goals: { uploaded: 0, downloaded: 0, errors: 0 },
      debts: { uploaded: 0, downloaded: 0, errors: 0 },
      debtors: { uploaded: 0, downloaded: 0, errors: 0 },
      savings: { uploaded: 0, downloaded: 0, errors: 0 },
      lottery: { uploaded: 0, downloaded: 0, errors: 0 },
      transactions: { uploaded: 0, downloaded: 0, errors: 0 },
    };

    try {
      console.log("🔄 Iniciando sincronización completa...");

      const tables = [
        "goals",
        "debts",
        "debtors",
        "savings",
        "lottery",
        "transactions",
      ];

      for (const table of tables) {
        try {
          // 1. Subir cambios locales pendientes
          const uploaded = await this.uploadPendingChanges(table);
          results[table].uploaded = uploaded;

          // 2. Descargar cambios remotos
          const downloaded = await this.downloadRemoteChanges(table);
          results[table].downloaded = downloaded;
        } catch (error) {
          console.error(`❌ Error sincronizando ${table}:`, error);
          results[table].errors++;
        }
      }

      this.lastSyncTime = new Date();
      const duration = Date.now() - startTime;

      console.log(`✅ Sincronización completada en ${duration}ms`, results);

      return {
        success: true,
        results,
        duration,
        timestamp: this.lastSyncTime,
      };
    } catch (error) {
      console.error("❌ Error en sincronización:", error);
      return { success: false, error: error.message };
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Subir cambios locales pendientes a Supabase
   * @param {string} tableName
   * @returns {Promise<number>} Cantidad de registros subidos
   */
  async uploadPendingChanges(tableName) {
    const client = supabaseClient.getClient();
    const database = db.getDB();
    const userId = this.getCurrentUserId();

    if (!userId) {
      console.warn("No hay usuario autenticado, se omite subida de cambios");
      return 0;
    }

    return new Promise((resolve, reject) => {
      const transaction = database.transaction([tableName], "readwrite");
      const store = transaction.objectStore(tableName);
      const index = store.index("syncStatus");
      const request = index.getAll("pending");

      request.onsuccess = async () => {
        const pendingRecords = request.result;

        if (pendingRecords.length === 0) {
          resolve(0);
          return;
        }

        let uploadedCount = 0;

        for (const record of pendingRecords) {
          try {
            const supabaseData = this.convertToSupabaseFormat(record);

            if (record.supabaseId) {
              // Actualizar registro existente
              const { error } = await client
                .from(tableName)
                .update(supabaseData)
                .eq("id", record.supabaseId);

              if (error) throw error;
            } else {
              // Crear nuevo registro
              const { data, error } = await client
                .from(tableName)
                .insert([supabaseData])
                .select();

              if (error) throw error;

              // Guardar ID de Supabase en IndexedDB
              record.supabaseId = data[0].id;
            }

            // Marcar como sincronizado
            record.syncStatus = "synced";
            record.lastSyncedAt = new Date().toISOString();

            const updateRequest = store.put(record);
            await new Promise((res, rej) => {
              updateRequest.onsuccess = res;
              updateRequest.onerror = rej;
            });

            uploadedCount++;
          } catch (error) {
            console.error(`Error subiendo registro ${record.id}:`, error);
          }
        }

        resolve(uploadedCount);
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Descargar cambios remotos de Supabase
   * @param {string} tableName
   * @returns {Promise<number>} Cantidad de registros descargados
   */
  async downloadRemoteChanges(tableName) {
    const client = supabaseClient.getClient();
    const database = db.getDB();
    const userId = this.getCurrentUserId();

    if (!userId) {
      console.warn("No hay usuario autenticado, se omite descarga");
      return 0;
    }

    try {
      // Obtener última fecha de sincronización
      const lastSyncKey = this.getLastSyncKey(tableName);
      const lastSync = localStorage.getItem(lastSyncKey) || "1970-01-01";

      // Obtener registros actualizados desde la última sincronización
      const { data: remoteRecords, error } = await client
        .from(tableName)
        .select("*")
        .gte("updated_at", lastSync)
        .order("updated_at", { ascending: true });

      if (error) throw error;

      if (!remoteRecords || remoteRecords.length === 0) {
        return 0;
      }

      let downloadedCount = 0;

      const transaction = database.transaction([tableName], "readwrite");
      const store = transaction.objectStore(tableName);

      for (const remoteRecord of remoteRecords) {
        try {
          const localData = this.convertToLocalFormat(remoteRecord);

          // Buscar si existe localmente por supabaseId
          const existingRecords = await new Promise((resolve, reject) => {
            const allRequest = store.getAll();
            allRequest.onsuccess = () => {
              const existing = allRequest.result.find(
                (r) => r.supabaseId === remoteRecord.id
              );
              resolve(existing);
            };
            allRequest.onerror = () => reject(allRequest.error);
          });

          if (existingRecords) {
            // Actualizar registro existente
            const updatedRecord = { ...existingRecords, ...localData };
            await new Promise((resolve, reject) => {
              const updateRequest = store.put(updatedRecord);
              updateRequest.onsuccess = resolve;
              updateRequest.onerror = reject;
            });
          } else {
            // Crear nuevo registro local
            await new Promise((resolve, reject) => {
              const addRequest = store.add(localData);
              addRequest.onsuccess = resolve;
              addRequest.onerror = reject;
            });
          }

          downloadedCount++;
        } catch (error) {
          console.error(`Error descargando registro:`, error);
        }
      }

      // Actualizar última fecha de sincronización
      if (remoteRecords.length > 0) {
        const lastRecord = remoteRecords[remoteRecords.length - 1];
        localStorage.setItem(lastSyncKey, lastRecord.updated_at);
      }

      return downloadedCount;
    } catch (error) {
      console.error(`Error descargando de ${tableName}:`, error);
      return 0;
    }
  }

  /**
   * Convertir registro local a formato Supabase
   * @param {Object} record
   * @returns {Object}
   */
  convertToSupabaseFormat(record) {
    const userId = this.getCurrentUserId();
    if (!userId) {
      throw new Error("No hay usuario autenticado para sincronizar");
    }

    const { id, supabaseId, syncStatus, lastSyncedAt, ...data } = record;

    return {
      ...data,
      local_id: id,
      sync_status: syncStatus || "synced",
      user_id: userId,
    };
  }

  /**
   * Convertir registro de Supabase a formato local
   * @param {Object} record
   * @returns {Object}
   */
  convertToLocalFormat(record) {
    const {
      id,
      local_id,
      sync_status,
      created_at,
      updated_at,
      user_id,
      ...data
    } = record;

    return {
      ...data,
      supabaseId: id,
      syncStatus: "synced",
      lastSyncedAt: updated_at,
    };
  }

  /**
   * Marcar registro como pendiente de sincronización
   * @param {string} tableName
   * @param {number} recordId
   */
  async markAsPending(tableName, recordId) {
    const database = db.getDB();

    return new Promise((resolve, reject) => {
      const transaction = database.transaction([tableName], "readwrite");
      const store = transaction.objectStore(tableName);
      const getRequest = store.get(recordId);

      getRequest.onsuccess = () => {
        const record = getRequest.result;
        if (record) {
          record.syncStatus = "pending";
          const putRequest = store.put(record);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          resolve();
        }
      };

      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  /**
   * Obtener estado de sincronización
   * @returns {Object}
   */
  getStatus() {
    return {
      isSyncing: this.isSyncing,
      lastSyncTime: this.lastSyncTime,
      autoSyncEnabled: this.autoSyncEnabled,
      syncIntervalMinutes: this.syncIntervalMinutes,
      isConnected: supabaseClient.isConnected() && authManager.isAuthenticated(),
      userEmail: authManager.getUser()?.email || null,
    };
  }
}

// Singleton instance
const syncManager = new SyncManager();

export default syncManager;
