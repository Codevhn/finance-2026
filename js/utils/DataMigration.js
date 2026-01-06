/**
 * Data Migration Utility
 * Herramienta para migrar datos de IndexedDB a Supabase
 */

import supabaseClient from "../storage/SupabaseClient.js";
import db from "../storage/db.js";
import authManager from "../auth/AuthManager.js";

export class DataMigration {
  constructor() {
    this.migrationStatus = {
      inProgress: false,
      currentTable: null,
      progress: 0,
      errors: [],
    };
  }

  /**
   * Migrar todos los datos de IndexedDB a Supabase
   * @returns {Promise<Object>}
   */
  async migrateAll() {
    if (this.migrationStatus.inProgress) {
      throw new Error("Migración ya en progreso");
    }

    if (!authManager.isAuthenticated()) {
      throw new Error("Debes iniciar sesión antes de migrar datos");
    }

    const client = supabaseClient.getClient();
    if (!client) {
      throw new Error("Supabase no está configurado");
    }

    this.migrationStatus.inProgress = true;
    this.migrationStatus.errors = [];

    const tables = [
      "goals",
      "debts",
      "debtors",
      "savings",
      "lottery",
      "transactions",
      "history",
    ];
    const results = {};

    try {
      console.log("🚀 Iniciando migración completa a Supabase...");

      for (let i = 0; i < tables.length; i++) {
        const table = tables[i];
        this.migrationStatus.currentTable = table;
        this.migrationStatus.progress = Math.round((i / tables.length) * 100);

        console.log(
          `📦 Migrando tabla: ${table} (${this.migrationStatus.progress}%)`
        );

        try {
          const result = await this.migrateTable(table);
          results[table] = result;
          console.log(`✅ ${table}: ${result.migrated} registros migrados`);
        } catch (error) {
          console.error(`❌ Error migrando ${table}:`, error);
          this.migrationStatus.errors.push({ table, error: error.message });
          results[table] = { migrated: 0, skipped: 0, error: error.message };
        }
      }

      this.migrationStatus.progress = 100;
      console.log("✅ Migración completada", results);

      return {
        success: true,
        results,
        errors: this.migrationStatus.errors,
      };
    } catch (error) {
      console.error("❌ Error en migración:", error);
      return {
        success: false,
        error: error.message,
        errors: this.migrationStatus.errors,
      };
    } finally {
      this.migrationStatus.inProgress = false;
      this.migrationStatus.currentTable = null;
    }
  }

  /**
   * Migrar una tabla específica
   * @param {string} tableName
   * @returns {Promise<Object>}
   */
  async migrateTable(tableName) {
    const client = supabaseClient.getClient();
    const database = db.getDB();

    // Obtener todos los registros locales
    const localRecords = await new Promise((resolve, reject) => {
      const transaction = database.transaction([tableName], "readonly");
      const store = transaction.objectStore(tableName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    if (localRecords.length === 0) {
      return { migrated: 0, skipped: 0 };
    }

    let migrated = 0;
    let skipped = 0;

    // Migrar en lotes de 100 registros
    const batchSize = 100;
    for (let i = 0; i < localRecords.length; i += batchSize) {
      const batch = localRecords.slice(i, i + batchSize);
      const supabaseRecords = batch.map((record) =>
        this.convertToSupabaseFormat(record, tableName)
      );

      try {
        // Insertar lote en Supabase
        const { data, error } = await client
          .from(tableName)
          .upsert(supabaseRecords, {
            onConflict: "local_id",
            ignoreDuplicates: false,
          })
          .select();

        if (error) {
          console.error(`Error insertando lote en ${tableName}:`, error);
          skipped += batch.length;
          continue;
        }

        // Actualizar registros locales con IDs de Supabase
        const transaction = database.transaction([tableName], "readwrite");
        const store = transaction.objectStore(tableName);

        for (let j = 0; j < batch.length; j++) {
          const localRecord = batch[j];
          const supabaseRecord = data[j];

          if (supabaseRecord) {
            localRecord.supabaseId = supabaseRecord.id;
            localRecord.syncStatus = "synced";
            localRecord.lastSyncedAt = new Date().toISOString();

            await new Promise((resolve, reject) => {
              const updateRequest = store.put(localRecord);
              updateRequest.onsuccess = resolve;
              updateRequest.onerror = reject;
            });

            migrated++;
          }
        }
      } catch (error) {
        console.error(`Error procesando lote:`, error);
        skipped += batch.length;
      }
    }

    return { migrated, skipped };
  }

  /**
   * Convertir registro local a formato Supabase
   * @param {Object} record
   * @param {string} tableName
   * @returns {Object}
   */
  convertToSupabaseFormat(record, tableName) {
    const { id, supabaseId, syncStatus, lastSyncedAt, ...data } = record;
    const userId = authManager.getUser()?.id;

    if (!userId) {
      throw new Error("No hay usuario autenticado para migrar datos");
    }

    // Mapeo de campos según la tabla
    const converted = {
      local_id: id,
      sync_status: "synced",
      user_id: userId,
      ...data,
    };

    // Convertir fechas a formato ISO si es necesario
    if (converted.fechaCreacion) {
      converted.fecha_creacion = new Date(
        converted.fechaCreacion
      ).toISOString();
      delete converted.fechaCreacion;
    }

    if (converted.fechaCompletada) {
      converted.fecha_completada = new Date(
        converted.fechaCompletada
      ).toISOString();
      delete converted.fechaCompletada;
    }

    if (converted.fechaVencimiento) {
      converted.fecha_vencimiento = new Date(converted.fechaVencimiento)
        .toISOString()
        .split("T")[0];
      delete converted.fechaVencimiento;
    }

    if (converted.fechaObjetivo) {
      converted.fecha_objetivo = new Date(converted.fechaObjetivo)
        .toISOString()
        .split("T")[0];
      delete converted.fechaObjetivo;
    }

    // Convertir nombres de campos snake_case
    const fieldMapping = {
      montoObjetivo: "monto_objetivo",
      montoActual: "monto_actual",
      montoTotal: "monto_total",
      montoPagado: "monto_pagado",
      tasaInteres: "tasa_interes",
      montoTotalPrestado: "monto_total_prestado",
      montoTotalPagado: "monto_total_pagado",
      entityType: "entity_type",
      entityId: "entity_id",
      oldValue: "old_value",
      newValue: "new_value",
    };

    Object.keys(fieldMapping).forEach((oldKey) => {
      if (converted[oldKey] !== undefined) {
        converted[fieldMapping[oldKey]] = converted[oldKey];
        delete converted[oldKey];
      }
    });

    return converted;
  }

  /**
   * Exportar todos los datos a JSON
   * @returns {Promise<Object>}
   */
  async exportToJSON() {
    const database = db.getDB();
    const tables = [
      "goals",
      "debts",
      "debtors",
      "savings",
      "lottery",
      "transactions",
      "history",
    ];
    const exportData = {
      exportDate: new Date().toISOString(),
      version: "1.0",
      data: {},
    };

    for (const table of tables) {
      const records = await new Promise((resolve, reject) => {
        const transaction = database.transaction([table], "readonly");
        const store = transaction.objectStore(table);
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      exportData.data[table] = records;
    }

    return exportData;
  }

  /**
   * Importar datos desde JSON
   * @param {Object} jsonData
   * @returns {Promise<Object>}
   */
  async importFromJSON(jsonData) {
    const database = db.getDB();
    const results = {};

    for (const [tableName, records] of Object.entries(jsonData.data)) {
      try {
        const transaction = database.transaction([tableName], "readwrite");
        const store = transaction.objectStore(tableName);

        let imported = 0;
        for (const record of records) {
          try {
            await new Promise((resolve, reject) => {
              const request = store.add(record);
              request.onsuccess = resolve;
              request.onerror = reject;
            });
            imported++;
          } catch (error) {
            // Registro duplicado, intentar actualizar
            try {
              await new Promise((resolve, reject) => {
                const request = store.put(record);
                request.onsuccess = resolve;
                request.onerror = reject;
              });
              imported++;
            } catch (updateError) {
              console.error(`Error importando registro:`, updateError);
            }
          }
        }

        results[tableName] = { imported, total: records.length };
      } catch (error) {
        console.error(`Error importando tabla ${tableName}:`, error);
        results[tableName] = { error: error.message };
      }
    }

    return results;
  }

  /**
   * Descargar datos como archivo JSON
   */
  async downloadBackup() {
    const data = await this.exportToJSON();
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `finance-backup-${
      new Date().toISOString().split("T")[0]
    }.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log("✅ Backup descargado");
  }

  /**
   * Obtener estado de migración
   * @returns {Object}
   */
  getStatus() {
    return { ...this.migrationStatus };
  }
}

export default DataMigration;
