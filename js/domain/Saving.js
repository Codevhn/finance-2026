/**
 * Saving Entity - Ahorro
 * Representa un fondo de ahorro acumulativo que nunca se reinicia
 */

export class Saving {
  constructor(data = {}) {
    this.id = data.id || null;
    this.nombre = data.nombre || "";
    this.montoAcumulado = data.montoAcumulado || 0;
    this.objetivoOpcional = data.objetivoOpcional || null; // Puede ser null
    this.depositos = data.depositos || []; // Array de { monto, fecha, tipo, nota }
    this.intocable = data.intocable ?? false;
    this.metaAnual = data.metaAnual ?? false;
    this.anioMeta =
      typeof data.anioMeta === "number" ? data.anioMeta : null;
    this.fechaCreacion = data.fechaCreacion || new Date().toISOString();
    this.ultimaEvaluacion = data.ultimaEvaluacion || null;
    this.prestamoPendiente = Number.isFinite(Number(data.prestamoPendiente))
      ? Number(data.prestamoPendiente)
      : 0;

    // Campos para sincronización futura
    this.syncStatus = data.syncStatus || "local";
    this.lastSyncedAt = data.lastSyncedAt || null;
    this.remoteId = data.remoteId || null;
  }

  /**
   * Depositar dinero en el ahorro
   * @param {number} monto - Monto a depositar en Lempiras
   * @param {string} nota - Nota opcional
   * @returns {Object} - Resultado de la operación
   */
  depositar(monto, nota = "") {
    if (monto <= 0) {
      return { success: false, error: "El monto debe ser mayor a 0" };
    }

    const deposito = {
      monto: parseFloat(monto),
      fecha: new Date().toISOString(),
      tipo: "deposito",
      nota: nota.trim(),
    };

    this.depositos.push(deposito);
    this.montoAcumulado += deposito.monto;
    this.syncStatus = "pending";

    return {
      success: true,
      deposito,
      nuevoMonto: this.montoAcumulado,
      progreso: this.calcularProgreso(),
    };
  }

  /**
   * Retirar dinero del ahorro
   * @param {number} monto - Monto a retirar en Lempiras
   * @param {string} nota - Nota obligatoria para retiros
   * @returns {Object} - Resultado de la operación
   */
  retirar(monto, nota = "") {
    if (this.intocable) {
      return { success: false, error: "Este fondo está protegido y no permite retiros." };
    }

    if (monto <= 0) {
      return { success: false, error: "El monto debe ser mayor a 0" };
    }

    if (!nota || nota.trim() === "") {
      return {
        success: false,
        error: "Debe especificar una razón para el retiro",
      };
    }

    if (monto > this.montoAcumulado) {
      return {
        success: false,
        error: `Fondos insuficientes. Disponible: Lps ${this.montoAcumulado.toFixed(
          2
        )}`,
      };
    }

    const retiro = {
      monto: parseFloat(monto),
      fecha: new Date().toISOString(),
      tipo: "retiro",
      nota: nota.trim(),
    };

    this.depositos.push(retiro);
    this.montoAcumulado -= retiro.monto;
    this.syncStatus = "pending";

    return {
      success: true,
      retiro,
      nuevoMonto: this.montoAcumulado,
      progreso: this.calcularProgreso(),
    };
  }

  /**
   * Actualizar la nota de un movimiento existente
   * @param {number} movimientoIndex
   * @param {string} nota
   * @returns {Object}
   */
  actualizarNotaMovimiento(movimientoIndex, nota = "") {
    if (
      Number.isNaN(movimientoIndex) ||
      movimientoIndex < 0 ||
      movimientoIndex >= this.depositos.length
    ) {
      return { success: false, error: "Movimiento no encontrado" };
    }

    this.depositos[movimientoIndex].nota = nota.trim();
    this.syncStatus = "pending";

    return { success: true, movimiento: this.depositos[movimientoIndex] };
  }

  /**
   * Calcular progreso hacia el objetivo (si existe)
   * @returns {number|null} - Porcentaje o null si no hay objetivo
   */
  calcularProgreso() {
    if (!this.objetivoOpcional || this.objetivoOpcional <= 0) {
      return null;
    }
    return (this.montoAcumulado / this.objetivoOpcional) * 100;
  }

  /**
   * Obtener monto restante para alcanzar objetivo
   * @returns {number|null} - Monto restante o null si no hay objetivo
   */
  getMontoRestante() {
    if (!this.objetivoOpcional || this.objetivoOpcional <= 0) {
      return null;
    }
    const restante = this.objetivoOpcional - this.montoAcumulado;
    return Math.max(0, restante);
  }

  /**
   * Registrar evaluación anual
   * @param {Object} evaluacion - Datos de la evaluación
   * @returns {Object}
   */
  evaluacionAnual(evaluacion = {}) {
    const evaluacionData = {
      fecha: new Date().toISOString(),
      montoAcumulado: this.montoAcumulado,
      totalDepositado: this.getTotalDepositado(),
      totalRetirado: this.getTotalRetirado(),
      notas: evaluacion.notas || "",
      ...evaluacion,
    };

    this.ultimaEvaluacion = evaluacionData;
    this.syncStatus = "pending";

    return { success: true, evaluacion: evaluacionData };
  }

  /**
   * Obtener total depositado
   * @returns {number}
   */
  getTotalDepositado() {
    return this.depositos
      .filter((d) => d.tipo === "deposito")
      .reduce((sum, d) => sum + d.monto, 0);
  }

  /**
   * Obtener total retirado
   * @returns {number}
   */
  getTotalRetirado() {
    return this.depositos
      .filter((d) => d.tipo === "retiro")
      .reduce((sum, d) => sum + d.monto, 0);
  }

  /**
   * Obtener historial de movimientos ordenado por fecha
   * @param {number} limit - Límite de resultados
   * @returns {Array}
   */
  getHistorial(limit = null) {
    const historial = [...this.depositos].sort(
      (a, b) => new Date(b.fecha) - new Date(a.fecha)
    );

    return limit ? historial.slice(0, limit) : historial;
  }

  /**
   * Validar el ahorro
   * @returns {Object}
   */
  validar() {
    const errores = [];

    if (!this.nombre || this.nombre.trim() === "") {
      errores.push("El nombre es obligatorio");
    }

    if (this.objetivoOpcional !== null && this.objetivoOpcional <= 0) {
      errores.push("El objetivo debe ser mayor a 0 o null");
    }

    if (this.prestamoPendiente < 0) {
      errores.push("El préstamo pendiente debe ser positivo");
    }

    return {
      valido: errores.length === 0,
      errores,
    };
  }

  /**
   * Convertir a objeto plano para almacenamiento
   * @returns {Object}
   */
  toJSON() {
    const json = {
      nombre: this.nombre,
      montoAcumulado: this.montoAcumulado,
      objetivoOpcional: this.objetivoOpcional,
      depositos: this.depositos,
      intocable: this.intocable,
      metaAnual: this.metaAnual,
      anioMeta: this.anioMeta,
      fechaCreacion: this.fechaCreacion,
      ultimaEvaluacion: this.ultimaEvaluacion,
      prestamoPendiente: this.prestamoPendiente,
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
