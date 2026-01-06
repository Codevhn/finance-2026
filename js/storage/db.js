/**
 * IndexedDB Configuration and Management
 * Database: FinanceApp2026
 * Prepared for future Supabase synchronization
 */

const DB_NAME = "FinanceApp2026";
const DB_VERSION = 3;

class Database {
  constructor() {
    this.db = null;
  }

  /**
   * Initialize IndexedDB
   * @returns {Promise<IDBDatabase>}
   */
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        reject(new Error("Error al abrir la base de datos"));
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        console.log("✅ Base de datos inicializada correctamente");
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        console.log("🔧 Actualizando esquema de base de datos...");

        // Object Store: Goals (Metas Mensuales)
        if (!db.objectStoreNames.contains("goals")) {
          const goalStore = db.createObjectStore("goals", {
            keyPath: "id",
            autoIncrement: true,
          });
          goalStore.createIndex("nombre", "nombre", { unique: false });
          goalStore.createIndex("completada", "completada", { unique: false });
          goalStore.createIndex("fechaCreacion", "fechaCreacion", {
            unique: false,
          });
          goalStore.createIndex("syncStatus", "syncStatus", { unique: false });
          console.log('  ✓ Object Store "goals" creado');
        }

        // Object Store: Debts (Deudas)
        if (!db.objectStoreNames.contains("debts")) {
          const debtStore = db.createObjectStore("debts", {
            keyPath: "id",
            autoIncrement: true,
          });
          debtStore.createIndex("nombre", "nombre", { unique: false });
          debtStore.createIndex("archivada", "archivada", { unique: false });
          debtStore.createIndex("fechaCreacion", "fechaCreacion", {
            unique: false,
          });
          debtStore.createIndex("syncStatus", "syncStatus", { unique: false });
          console.log('  ✓ Object Store "debts" creado');
        }

        // Object Store: Debtors (Personas deudoras)
        if (!db.objectStoreNames.contains("debtors")) {
          const debtorStore = db.createObjectStore("debtors", {
            keyPath: "id",
            autoIncrement: true,
          });
          debtorStore.createIndex("nombre", "nombre", { unique: false });
          debtorStore.createIndex("telefono", "telefono", { unique: false });
          debtorStore.createIndex("email", "email", { unique: false });
          debtorStore.createIndex("syncStatus", "syncStatus", {
            unique: false,
          });
          console.log('  ✓ Object Store "debtors" creado');
        }

        // Object Store: Savings (Ahorros)
        if (!db.objectStoreNames.contains("savings")) {
          const savingStore = db.createObjectStore("savings", {
            keyPath: "id",
            autoIncrement: true,
          });
          savingStore.createIndex("nombre", "nombre", { unique: false });
          savingStore.createIndex("fechaCreacion", "fechaCreacion", {
            unique: false,
          });
          savingStore.createIndex("syncStatus", "syncStatus", {
            unique: false,
          });
          console.log('  ✓ Object Store "savings" creado');
        }

        // Object Store: Lottery (Lotería)
        if (!db.objectStoreNames.contains("lottery")) {
          const lotteryStore = db.createObjectStore("lottery", {
            keyPath: "id",
            autoIncrement: true,
          });
          lotteryStore.createIndex("fecha", "fecha", { unique: false });
          lotteryStore.createIndex("tipo", "tipo", { unique: false }); // 'apuesta' o 'premio'
          lotteryStore.createIndex("syncStatus", "syncStatus", {
            unique: false,
          });
          console.log('  ✓ Object Store "lottery" creado');
        }

        // Object Store: Transactions (Transacciones generales)
        if (!db.objectStoreNames.contains("transactions")) {
          const transactionStore = db.createObjectStore("transactions", {
            keyPath: "id",
            autoIncrement: true,
          });
          transactionStore.createIndex("tipo", "tipo", { unique: false }); // 'ingreso' o 'egreso'
          transactionStore.createIndex("categoria", "categoria", {
            unique: false,
          });
          transactionStore.createIndex("fecha", "fecha", { unique: false });
          transactionStore.createIndex("syncStatus", "syncStatus", {
            unique: false,
          });
          console.log('  ✓ Object Store "transactions" creado');
        }

        // Object Store: History (Historial de cambios para auditoría)
        if (!db.objectStoreNames.contains("history")) {
          const historyStore = db.createObjectStore("history", {
            keyPath: "id",
            autoIncrement: true,
          });
          historyStore.createIndex("timestamp", "timestamp", { unique: false });
          historyStore.createIndex("entityType", "entityType", {
            unique: false,
          });
          historyStore.createIndex("entityId", "entityId", { unique: false });
          historyStore.createIndex("action", "action", { unique: false });
          console.log('  ✓ Object Store "history" creado');
        }

        console.log("✅ Esquema de base de datos actualizado");
      };
    });
  }

  /**
   * Get the database instance
   * @returns {IDBDatabase}
   */
  getDB() {
    if (!this.db) {
      throw new Error("Base de datos no inicializada. Llama a init() primero.");
    }
    return this.db;
  }

  /**
   * Close database connection
   */
  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
      console.log("🔒 Conexión a base de datos cerrada");
    }
  }

  /**
   * Delete entire database (for development/testing)
   */
  static async deleteDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase(DB_NAME);

      request.onsuccess = () => {
        console.log("🗑️ Base de datos eliminada");
        resolve();
      };

      request.onerror = () => {
        reject(new Error("Error al eliminar la base de datos"));
      };
    });
  }
}

// Singleton instance
const db = new Database();

export default db;
