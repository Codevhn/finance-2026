/**
 * Goal Entity - Meta Mensual
 * Representa una meta financiera mensual con aportes y auto-reinicio
 */

export class Goal {
  constructor(data = {}) {
    this.id = data.id || null;
    this.nombre = data.nombre || "";
    this.montoObjetivo = data.montoObjetivo || 0;
    this.aportes = data.aportes || []; // Array de { monto, fecha, nota }
    this.debtId = data.debtId ?? null;
    this.debtNombre = data.debtNombre || "";
    this.debtApplication = data.debtApplication || null; // { monto, fecha, deudaId, deudaNombre }
    this.fechaCreacion = data.fechaCreacion || new Date().toISOString();
    this.fechaLimite = data.fechaLimite || null;
    this.completada = data.completada || false;
    this.cicloActual = data.cicloActual || 1;
    this.fechaCompletado = data.fechaCompletado || null;
    this.aporteSugeridoDiario = Number.isFinite(Number(data.aporteSugeridoDiario))
      ? Number(data.aporteSugeridoDiario)
      : null;

    // Campos para sincronización futura
    this.syncStatus = data.syncStatus || "local"; // 'local', 'synced', 'pending'
    this.lastSyncedAt = data.lastSyncedAt || null;
    this.remoteId = data.remoteId || null;
  }

  /**
   * Agregar un aporte a la meta
   * @param {number} monto - Monto del aporte en Lempiras
   * @returns {Object} - Resultado de la operación
   */
  agregarAporte(monto, nota = "") {
    if (monto <= 0) {
      return { success: false, error: "El monto debe ser mayor a 0" };
    }

    const aporte = {
      monto: parseFloat(monto),
      fecha: new Date().toISOString(),
      nota: nota.trim(),
    };

    this.aportes.push(aporte);
    this.syncStatus = "pending";

    // Verificar si se completó la meta
    const progresoActual = this.calcularProgreso();
    if (progresoActual >= 100 && !this.completada) {
      this.marcarCompletada();
    }

    return { success: true, aporte, progreso: progresoActual };
  }

  /**
   * Actualizar la nota de un aporte existente
   * @param {number} aporteIndex
   * @param {string} nota
   * @returns {Object}
   */
  actualizarNotaAporte(aporteIndex, nota = "") {
    if (
      Number.isNaN(aporteIndex) ||
      aporteIndex < 0 ||
      aporteIndex >= this.aportes.length
    ) {
      return { success: false, error: "Aporte no encontrado" };
    }

    this.aportes[aporteIndex].nota = nota.trim();
    this.syncStatus = "pending";

    return { success: true, aporte: this.aportes[aporteIndex] };
  }

  /**
   * Calcular el progreso actual de la meta
   * @returns {number} - Porcentaje de progreso (0-100+)
   */
  calcularProgreso() {
    const totalAportado = this.aportes.reduce(
      (sum, aporte) => sum + aporte.monto,
      0
    );
    if (this.montoObjetivo === 0) return 0;
    return (totalAportado / this.montoObjetivo) * 100;
  }

  /**
   * Obtener el total aportado
   * @returns {number} - Total en Lempiras
   */
  getTotalAportado() {
    return this.aportes.reduce((sum, aporte) => sum + aporte.monto, 0);
  }

  /**
   * Obtener el monto restante para completar
   * @returns {number} - Monto restante en Lempiras
   */
  getMontoRestante() {
    const restante = this.montoObjetivo - this.getTotalAportado();
    return Math.max(0, restante);
  }

  /**
   * Obtener días restantes para la fecha límite
   * @returns {number|null}
   */
  getDiasParaVencimiento() {
    if (!this.fechaLimite) return null;
    const dueDate = new Date(this.fechaLimite);
    if (Number.isNaN(dueDate.getTime())) return null;
    const diff = dueDate.getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  /**
   * Marcar la meta como completada
   */
  marcarCompletada() {
    this.completada = true;
    this.fechaCompletado = new Date().toISOString();
    this.syncStatus = "pending";
  }

  /**
   * Reiniciar el ciclo de la meta (automático al completar)
   * @returns {Goal} - Nueva instancia de meta para el siguiente ciclo
   */
  reiniciarCiclo() {
    const nuevaMeta = new Goal({
      nombre: this.nombre,
      montoObjetivo: this.montoObjetivo,
      aporteSugeridoDiario: this.aporteSugeridoDiario,
      cicloActual: this.cicloActual + 1,
      debtId: this.debtId,
      debtNombre: this.debtNombre,
      fechaCreacion: new Date().toISOString(),
      fechaLimite: null,
    });

    return nuevaMeta;
  }

  /**
   * Registrar que el monto se aplicó como pago a una deuda asociada
   * @param {Object} params
   * @param {number} params.monto
   * @param {number|null} params.debtId
   * @param {string} params.debtNombre
   */
  registrarAplicacionDeuda({ monto, debtId, debtNombre }) {
    this.debtApplication = {
      monto,
      debtId,
      debtNombre,
      fecha: new Date().toISOString(),
    };
    this.syncStatus = "pending";
  }

  /**
   * Limpiar el registro de aplicación cuando se desvincula la meta de una deuda
   */
  limpiarAplicacionDeuda() {
    this.debtApplication = null;
    this.syncStatus = "pending";
  }

  /**
   * Validar la meta
   * @returns {Object} - Resultado de validación
   */
  validar() {
    const errores = [];

    if (!this.nombre || this.nombre.trim() === "") {
      errores.push("El nombre es obligatorio");
    }

    if (this.montoObjetivo <= 0) {
      errores.push("El monto objetivo debe ser mayor a 0");
    }

    if (this.fechaLimite) {
      const dueDate = new Date(this.fechaLimite);
      if (Number.isNaN(dueDate.getTime())) {
        errores.push("La fecha límite es inválida");
      } else if (this.fechaCreacion) {
        const startDate = new Date(this.fechaCreacion);
        if (!Number.isNaN(startDate.getTime()) && dueDate < startDate) {
          errores.push(
            "La fecha límite debe ser posterior a la fecha de creación"
          );
        }
      }
    }

    if (
      this.aporteSugeridoDiario !== null &&
      Number(this.aporteSugeridoDiario) < 0
    ) {
      errores.push("El aporte sugerido debe ser un número positivo");
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
    if (!this || typeof this !== "object") {
      return {};
    }
    const json = {
      nombre: this.nombre,
      montoObjetivo: this.montoObjetivo,
      aportes: this.aportes,
      debtId: this.debtId,
      debtNombre: this.debtNombre,
      debtApplication: this.debtApplication,
      fechaCreacion: this.fechaCreacion,
      fechaLimite: this.fechaLimite,
      completada: this.completada,
      cicloActual: this.cicloActual,
      fechaCompletado: this.fechaCompletado,
      aporteSugeridoDiario: this.aporteSugeridoDiario,
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
