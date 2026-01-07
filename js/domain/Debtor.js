/**
 * Debtor Entity - Persona deudora
 * Permite registrar la información de una persona a la que se le ha prestado dinero
 */

export class Debtor {
  constructor(data = {}) {
    this.id = data.id || null;
    this.nombre = data.nombre || "";
    this.telefono = data.telefono || "";
    this.email = data.email || "";
    this.notas = data.notas || "";
    this.tipo = data.tipo === "empresa" ? "empresa" : "persona";
    this.servicio = data.servicio || "";
    this.montoMensual = Number.isFinite(Number(data.montoMensual))
      ? Number(data.montoMensual)
      : 0;
    this.syncStatus = data.syncStatus || "local";
    this.fechaCreacion = data.fechaCreacion || new Date().toISOString();
    this.fechaActualizacion = data.fechaActualizacion || null;
  }

  /**
   * Validar datos de la persona
   * @returns {{valido: boolean, errores: string[]}}
   */
  validar() {
    const errores = [];

    if (!this.nombre || this.nombre.trim() === "") {
      errores.push("El nombre del contacto es obligatorio");
    }

    if (this.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(this.email)) {
      errores.push("El correo no tiene un formato válido");
    }

    if (
      this.telefono &&
      !/^[0-9+\-\s()]{6,20}$/.test(this.telefono.trim())
    ) {
      errores.push("El teléfono contiene caracteres inválidos");
    }

    if (!["persona", "empresa"].includes(this.tipo)) {
      errores.push("Selecciona si el contacto es persona o empresa");
    }

    if (this.tipo === "empresa" && (!this.servicio || this.servicio.trim() === "")) {
      errores.push("Describe el servicio de la empresa");
    }

    if (this.montoMensual < 0) {
      errores.push("El monto mensual no puede ser negativo");
    }

    return {
      valido: errores.length === 0,
      errores,
    };
  }

  /**
   * Convertir instancia a objeto plano para IndexedDB
   * @returns {Object}
   */
  toJSON() {
    const tipo = this.tipo === "empresa" ? "empresa" : "persona";
    const servicio =
      tipo === "empresa" ? this.servicio.trim() : "";
    const montoMensual =
      tipo === "empresa"
        ? Math.max(0, Number.isFinite(this.montoMensual) ? this.montoMensual : 0)
        : 0;
    const email = (this.email || "").trim();
    const telefono = (this.telefono || "").trim();
    const notas = (this.notas || "").trim();

    const json = {
      nombre: this.nombre.trim(),
      telefono,
      email: email ? email.toLowerCase() : "",
      notas,
      tipo,
      servicio,
      montoMensual,
      syncStatus: this.syncStatus,
      fechaCreacion: this.fechaCreacion,
      fechaActualizacion: new Date().toISOString(),
    };

    if (this.id !== null) {
      json.id = this.id;
    }

    return json;
  }
}
