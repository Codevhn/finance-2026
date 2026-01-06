/**
 * Transaction Entity - Transacción
 * Entidad base para movimientos financieros (ingresos/egresos)
 */

export class Transaction {
  constructor(data = {}) {
    this.id = data.id || null;
    this.tipo = data.tipo || "egreso"; // 'ingreso' o 'egreso'
    this.monto = data.monto || 0;
    this.categoria = data.categoria || "otros";
    this.fecha = data.fecha || new Date().toISOString();
    this.descripcion = data.descripcion || "";
    this.metadata = data.metadata || {}; // Datos adicionales específicos

    // Campos para sincronización futura
    this.syncStatus = data.syncStatus || "local";
    this.lastSyncedAt = data.lastSyncedAt || null;
    this.remoteId = data.remoteId || null;
  }

  /**
   * Validar la transacción
   * @returns {Object}
   */
  validar() {
    const errores = [];

    if (!["ingreso", "egreso"].includes(this.tipo)) {
      errores.push('El tipo debe ser "ingreso" o "egreso"');
    }

    if (this.monto <= 0) {
      errores.push("El monto debe ser mayor a 0");
    }

    if (!this.categoria || this.categoria.trim() === "") {
      errores.push("La categoría es obligatoria");
    }

    return {
      valido: errores.length === 0,
      errores,
    };
  }

  /**
   * Verificar si es un ingreso
   * @returns {boolean}
   */
  esIngreso() {
    return this.tipo === "ingreso";
  }

  /**
   * Verificar si es un egreso
   * @returns {boolean}
   */
  esEgreso() {
    return this.tipo === "egreso";
  }

  /**
   * Obtener el monto con signo (positivo para ingreso, negativo para egreso)
   * @returns {number}
   */
  getMontoConSigno() {
    return this.esIngreso() ? this.monto : -this.monto;
  }

  /**
   * Convertir a objeto plano para almacenamiento
   * @returns {Object}
   */
  toJSON() {
    const json = {
      tipo: this.tipo,
      monto: this.monto,
      categoria: this.categoria,
      fecha: this.fecha,
      descripcion: this.descripcion,
      metadata: this.metadata,
      syncStatus: this.syncStatus,
      lastSyncedAt: this.lastSyncedAt,
      remoteId: this.remoteId,
    };

    // Solo incluir id si no es null (para IndexedDB autoIncrement)
    if (this.id !== null) {
      json.id = this.id;
    }

    return json;
  }
}

/**
 * Categorías predefinidas para transacciones
 */
export const CATEGORIAS = {
  // Ingresos
  SALARIO: "salario",
  FREELANCE: "freelance",
  NEGOCIO: "negocio",
  INVERSION: "inversión",
  REGALO: "regalo",
  OTRO_INGRESO: "otro_ingreso",

  // Egresos
  ALIMENTACION: "alimentación",
  TRANSPORTE: "transporte",
  VIVIENDA: "vivienda",
  SERVICIOS: "servicios",
  ENTRETENIMIENTO: "entretenimiento",
  SALUD: "salud",
  EDUCACION: "educación",
  ROPA: "ropa",
  LOTERIA: "lotería",
  DEUDA: "deuda",
  AHORRO: "ahorro",
  META: "meta",
  OTROS: "otros",
};

/**
 * Obtener categorías por tipo
 * @param {string} tipo - 'ingreso' o 'egreso'
 * @returns {Array}
 */
export function getCategoriasPorTipo(tipo) {
  if (tipo === "ingreso") {
    return [
      CATEGORIAS.SALARIO,
      CATEGORIAS.FREELANCE,
      CATEGORIAS.NEGOCIO,
      CATEGORIAS.INVERSION,
      CATEGORIAS.REGALO,
      CATEGORIAS.OTRO_INGRESO,
    ];
  } else {
    return [
      CATEGORIAS.ALIMENTACION,
      CATEGORIAS.TRANSPORTE,
      CATEGORIAS.VIVIENDA,
      CATEGORIAS.SERVICIOS,
      CATEGORIAS.ENTRETENIMIENTO,
      CATEGORIAS.SALUD,
      CATEGORIAS.EDUCACION,
      CATEGORIAS.ROPA,
      CATEGORIAS.LOTERIA,
      CATEGORIAS.DEUDA,
      CATEGORIAS.AHORRO,
      CATEGORIAS.META,
      CATEGORIAS.OTROS,
    ];
  }
}
