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
      errores.push("El nombre de la persona es obligatorio");
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
    const json = {
      nombre: this.nombre.trim(),
      telefono: this.telefono.trim(),
      email: this.email.trim().toLowerCase(),
      notas: this.notas.trim(),
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
