/**
 * Base Repository
 * Clase base para todos los repositorios con operaciones CRUD genéricas
 */

import db from "./db.js";
import syncManager from "./SyncManager.js";

export class BaseRepository {
  constructor(storeName) {
    this.storeName = storeName;
  }

  /**
   * Obtener todos los registros
   * @returns {Promise<Array>}
   */
  async getAll() {
    const database = db.getDB();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction([this.storeName], "readonly");
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () =>
        reject(new Error(`Error al obtener registros de ${this.storeName}`));
    });
  }

  /**
   * Obtener un registro por ID
   * @param {number} id
   * @returns {Promise<Object|null>}
   */
  async getById(id) {
    const database = db.getDB();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction([this.storeName], "readonly");
      const store = transaction.objectStore(this.storeName);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () =>
        reject(
          new Error(`Error al obtener registro ${id} de ${this.storeName}`)
        );
    });
  }

  /**
   * Crear un nuevo registro
   * @param {Object} data
   * @returns {Promise<number>} - ID del registro creado
   */
  async create(data) {
    const database = db.getDB();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(
        [this.storeName, "history"],
        "readwrite"
      );
      const store = transaction.objectStore(this.storeName);

      const request = store.add(data);

      request.onsuccess = async () => {
        const newId = request.result;

        // Registrar en historial
        this._addToHistory(transaction, "create", newId, null, data);

        // Marcar como pendiente de sincronización
        try {
          await syncManager.markAsPending(this.storeName, newId);
        } catch (error) {
          console.warn("No se pudo marcar como pendiente:", error);
        }

        resolve(newId);
      };

      request.onerror = () =>
        reject(new Error(`Error al crear registro en ${this.storeName}`));
    });
  }

  /**
   * Actualizar un registro existente
   * @param {number} id
   * @param {Object} data
   * @returns {Promise<void>}
   */
  async update(id, data) {
    const database = db.getDB();
    const oldData = await this.getById(id);

    return new Promise((resolve, reject) => {
      const transaction = database.transaction(
        [this.storeName, "history"],
        "readwrite"
      );
      const store = transaction.objectStore(this.storeName);

      const dataWithId = { ...data, id };
      const request = store.put(dataWithId);

      request.onsuccess = async () => {
        // Registrar en historial
        this._addToHistory(transaction, "update", id, oldData, dataWithId);

        // Marcar como pendiente de sincronización
        try {
          await syncManager.markAsPending(this.storeName, id);
        } catch (error) {
          console.warn("No se pudo marcar como pendiente:", error);
        }

        resolve();
      };

      request.onerror = () =>
        reject(
          new Error(`Error al actualizar registro ${id} en ${this.storeName}`)
        );
    });
  }

  /**
   * Eliminar un registro
   * @param {number} id
   * @returns {Promise<void>}
   */
  async delete(id) {
    const database = db.getDB();
    const oldData = await this.getById(id);

    return new Promise((resolve, reject) => {
      const transaction = database.transaction(
        [this.storeName, "history"],
        "readwrite"
      );
      const store = transaction.objectStore(this.storeName);

      const request = store.delete(id);

      request.onsuccess = async () => {
        // Registrar en historial
        this._addToHistory(transaction, "delete", id, oldData, null);

        // Marcar como pendiente de sincronización
        try {
          await syncManager.markAsPending(this.storeName, id);
        } catch (error) {
          console.warn("No se pudo marcar como pendiente:", error);
        }

        resolve();
      };

      request.onerror = () =>
        reject(
          new Error(`Error al eliminar registro ${id} de ${this.storeName}`)
        );
    });
  }

  /**
   * Contar registros
   * @returns {Promise<number>}
   */
  async count() {
    const database = db.getDB();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction([this.storeName], "readonly");
      const store = transaction.objectStore(this.storeName);
      const request = store.count();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () =>
        reject(new Error(`Error al contar registros de ${this.storeName}`));
    });
  }

  /**
   * Registrar cambio en historial
   * @private
   */
  _addToHistory(transaction, action, entityId, oldValue, newValue) {
    const historyStore = transaction.objectStore("history");

    const historyEntry = {
      timestamp: new Date().toISOString(),
      entityType: this.storeName,
      entityId: entityId,
      action: action, // 'create', 'update', 'delete'
      oldValue: oldValue,
      newValue: newValue,
    };

    historyStore.add(historyEntry);
  }
}
