/**
 * Debt Entity - Deuda
 * Representa una deuda con pagos parciales y sistema de archivo
 */

export class Debt {
  constructor(data = {}) {
    this.id = data.id || null;
    this.nombre = data.nombre || "";
    this.totalAdeudado = data.totalAdeudado || 0;
    this.pagos = data.pagos || []; // Array de { monto, fecha, nota }
    this.tipo = data.tipo || "me-deben"; // 'me-deben' o 'yo-debo'
    this.personaId = data.personaId || null;
    this.personaNombre = data.personaNombre || "";
    this.personaContacto = data.personaContacto || "";
    this.fechaInicio = data.fechaInicio || data.fechaCreacion || new Date().toISOString();
    this.fechaCreacion = data.fechaCreacion || new Date().toISOString();
    this.fechaLimite = data.fechaLimite || null;
    this.archivada = data.archivada || false;
    this.fechaArchivado = data.fechaArchivado || null;

    // Campos para sincronización futura
    this.syncStatus = data.syncStatus || "local";
    this.lastSyncedAt = data.lastSyncedAt || null;
    this.remoteId = data.remoteId || null;
  }

  /**
   * Agregar un pago a la deuda
   * @param {number} monto - Monto del pago en Lempiras
   * @param {string} nota - Nota opcional del pago
   * @returns {Object} - Resultado de la operación
   */
  agregarPago(monto, nota = "") {
    if (monto <= 0) {
      return { success: false, error: "El monto debe ser mayor a 0" };
    }

    const saldoActual = this.calcularSaldo();
    if (saldoActual <= 0) {
      return {
        success: false,
        error: "Esta deuda ya está pagada",
      };
    }

    let excedente = 0;
    let montoAplicado = monto;

    if (monto > saldoActual) {
      excedente = monto - saldoActual;
      montoAplicado = saldoActual;
    }

    if (montoAplicado <= 0) {
      return {
        success: false,
        error: "No hay saldo disponible para aplicar el pago",
      };
    }

    const pago = {
      monto: parseFloat(montoAplicado),
      fecha: new Date().toISOString(),
      nota: nota.trim(),
    };

    this.pagos.push(pago);
    this.syncStatus = "pending";

    const nuevoSaldo = this.calcularSaldo();

    // Auto-archivar si se completó el pago
    if (nuevoSaldo === 0) {
      this.archivar();
    }

    return {
      success: true,
      pago,
      saldoRestante: nuevoSaldo,
      completada: nuevoSaldo === 0,
      excedente,
    };
  }

  /**
   * Actualizar la nota de un pago existente
   * @param {number} pagoIndex
   * @param {string} nota
   * @returns {Object}
   */
  actualizarNotaPago(pagoIndex, nota = "") {
    if (
      Number.isNaN(pagoIndex) ||
      pagoIndex < 0 ||
      pagoIndex >= this.pagos.length
    ) {
      return { success: false, error: "Pago no encontrado" };
    }

    this.pagos[pagoIndex].nota = nota.trim();
    this.syncStatus = "pending";

    return { success: true, pago: this.pagos[pagoIndex] };
  }

  /**
   * Calcular el saldo restante de la deuda
   * @returns {number} - Saldo en Lempiras
   */
  calcularSaldo() {
    const totalPagado = this.pagos.reduce((sum, pago) => sum + pago.monto, 0);
    const saldo = this.totalAdeudado - totalPagado;
    return Math.max(0, saldo);
  }

  /**
   * Obtener el total pagado
   * @returns {number} - Total pagado en Lempiras
   */
  getTotalPagado() {
    return this.pagos.reduce((sum, pago) => sum + pago.monto, 0);
  }

  /**
   * Calcular el porcentaje de progreso del pago
   * @returns {number} - Porcentaje (0-100)
   */
  calcularProgreso() {
    if (this.totalAdeudado === 0) return 0;
    return (this.getTotalPagado() / this.totalAdeudado) * 100;
  }

  /**
   * Archivar la deuda (cuando se completa el pago)
   */
  archivar() {
    this.archivada = true;
    this.fechaArchivado = new Date().toISOString();
    this.syncStatus = "pending";
  }

  /**
   * Desarchivar la deuda
   */
  desarchivar() {
    this.archivada = false;
    this.fechaArchivado = null;
    this.syncStatus = "pending";
  }

  /**
   * Asociar una persona a la deuda
   * @param {{id:number,nombre:string,telefono?:string,email?:string}} persona
   */
  asignarPersona(persona) {
    if (!persona || !persona.id) {
      this.personaId = null;
      this.personaNombre = "";
      this.personaContacto = "";
    } else {
      this.personaId = persona.id;
      this.personaNombre = persona.nombre;
      const contacto = [persona.telefono, persona.email]
        .filter(Boolean)
        .join(" · ");
      this.personaContacto = contacto;
    }
    this.syncStatus = "pending";
  }

  /**
   * Obtener días transcurridos desde el inicio de la deuda
   * @returns {number|null}
   */
  getDiasTranscurridos() {
    if (!this.fechaInicio) return null;
    const diferencia =
      Date.now() - new Date(this.fechaInicio).getTime();
    if (Number.isNaN(diferencia) || diferencia < 0) return 0;
    return Math.floor(diferencia / (1000 * 60 * 60 * 24));
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
   * Verificar si la deuda está completamente pagada
   * @returns {boolean}
   */
  estaCompletada() {
    return this.calcularSaldo() === 0;
  }

  /**
   * Validar la deuda
   * @returns {Object} - Resultado de validación
   */
  validar() {
    const errores = [];

    if (!this.nombre || this.nombre.trim() === "") {
      errores.push("El nombre es obligatorio");
    }

    if (this.totalAdeudado <= 0) {
      errores.push("El total adeudado debe ser mayor a 0");
    }

    if (!["me-deben", "yo-debo"].includes(this.tipo)) {
      errores.push("El tipo de deuda es inválido");
    }

    if (this.personaNombre && this.personaNombre.trim().length < 3) {
      errores.push("El nombre de la persona debe tener al menos 3 caracteres");
    }

    if (this.fechaLimite) {
      const dueDate = new Date(this.fechaLimite);
      if (Number.isNaN(dueDate.getTime())) {
        errores.push("La fecha límite es inválida");
      } else if (this.fechaInicio) {
        const startDate = new Date(this.fechaInicio);
        if (!Number.isNaN(startDate.getTime()) && dueDate < startDate) {
          errores.push("La fecha límite debe ser posterior a la fecha de inicio");
        }
      }
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
      totalAdeudado: this.totalAdeudado,
      pagos: this.pagos,
      tipo: this.tipo,
      personaId: this.personaId,
      personaNombre: this.personaNombre,
      personaContacto: this.personaContacto,
      fechaInicio: this.fechaInicio,
      fechaCreacion: this.fechaCreacion,
      fechaLimite: this.fechaLimite,
      archivada: this.archivada,
      fechaArchivado: this.fechaArchivado,
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
