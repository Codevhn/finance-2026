/**
 * Debt Repository
 * Repositorio para gestión de Deudas
 */

import { BaseRepository } from "./BaseRepository.js";
import { Debt } from "../domain/Debt.js";

class DebtRepository extends BaseRepository {
  constructor() {
    super("debts");
  }

  /**
   * Obtener todas las deudas como instancias de Debt
   * @returns {Promise<Debt[]>}
   */
  async getAll() {
    const data = await super.getAll();
    return data.map((item) => new Debt(item));
  }

  /**
   * Obtener una deuda por ID como instancia de Debt
   * @param {number} id
   * @returns {Promise<Debt|null>}
   */
  async getById(id) {
    const data = await super.getById(id);
    return data ? new Debt(data) : null;
  }

  /**
   * Obtener deudas activas (no archivadas)
   * @returns {Promise<Debt[]>}
   */
  async getActivas() {
    const todas = await this.getAll();
    return todas.filter((deuda) => !deuda.archivada);
  }

  /**
   * Obtener deudas archivadas
   * @returns {Promise<Debt[]>}
   */
  async getArchivadas() {
    const todas = await this.getAll();
    return todas.filter((deuda) => deuda.archivada);
  }

  /**
   * Obtener deudas por persona
   * @param {number} personaId
   * @returns {Promise<Debt[]>}
   */
  async getByPersona(personaId) {
    if (!personaId) return [];
    const todas = await this.getAll();
    return todas.filter((deuda) => deuda.personaId === personaId);
  }

  /**
   * Crear una nueva deuda
   * @param {Debt} debt
   * @returns {Promise<number>}
   */
  async create(debt) {
    const validacion = debt.validar();
    if (!validacion.valido) {
      throw new Error(`Validación fallida: ${validacion.errores.join(", ")}`);
    }

    return await super.create(debt.toJSON());
  }

  /**
   * Actualizar una deuda existente
   * @param {Debt} debt
   * @returns {Promise<void>}
   */
  async update(debt) {
    if (!debt.id) {
      throw new Error("La deuda debe tener un ID para ser actualizada");
    }

    const validacion = debt.validar();
    if (!validacion.valido) {
      throw new Error(`Validación fallida: ${validacion.errores.join(", ")}`);
    }

    return await super.update(debt.id, debt.toJSON());
  }

  /**
   * Agregar un pago a una deuda
   * @param {number} debtId
   * @param {number} monto
   * @param {string} nota
   * @returns {Promise<Object>}
   */
  async agregarPago(debtId, monto, nota = "") {
    const debt = await this.getById(debtId);
    if (!debt) {
      throw new Error(`Deuda con ID ${debtId} no encontrada`);
    }

    const resultado = debt.agregarPago(monto, nota);
    if (!resultado.success) {
      throw new Error(resultado.error);
    }

    await this.update(debt);
    return resultado;
  }

  /**
   * Actualizar la nota de un pago
   * @param {number} debtId
   * @param {number} pagoIndex
   * @param {string} nota
   * @returns {Promise<Object>}
   */
  async actualizarNotaPago(debtId, pagoIndex, nota = "") {
    const debt = await this.getById(debtId);
    if (!debt) {
      throw new Error(`Deuda con ID ${debtId} no encontrada`);
    }

    const resultado = debt.actualizarNotaPago(pagoIndex, nota);
    if (!resultado.success) {
      throw new Error(resultado.error);
    }

    await this.update(debt);
    return resultado;
  }

  /**
   * Archivar una deuda
   * @param {number} debtId
   * @returns {Promise<void>}
   */
  async archivar(debtId) {
    const debt = await this.getById(debtId);
    if (!debt) {
      throw new Error(`Deuda con ID ${debtId} no encontrada`);
    }

    debt.archivar();
    await this.update(debt);
  }

  /**
   * Desarchivar una deuda
   * @param {number} debtId
   * @returns {Promise<void>}
   */
  async desarchivar(debtId) {
    const debt = await this.getById(debtId);
    if (!debt) {
      throw new Error(`Deuda con ID ${debtId} no encontrada`);
    }

    debt.desarchivar();
    await this.update(debt);
  }

  /**
   * Obtener estadísticas generales de deudas
   * @returns {Promise<Object>}
   */
  async getEstadisticas() {
    const todas = await this.getAll();
    const activas = todas.filter((d) => !d.archivada);
    const archivadas = todas.filter((d) => d.archivada);

    const totalAdeudado = activas.reduce((sum, d) => sum + d.totalAdeudado, 0);
    const totalPagado = activas.reduce((sum, d) => sum + d.getTotalPagado(), 0);
    const saldoTotal = activas.reduce((sum, d) => sum + d.calcularSaldo(), 0);
    const progresoPromedio =
      activas.length > 0
        ? activas.reduce((sum, d) => sum + d.calcularProgreso(), 0) /
          activas.length
        : 0;

    return {
      totalDeudas: todas.length,
      deudasActivas: activas.length,
      deudasArchivadas: archivadas.length,
      totalAdeudado,
      totalPagado,
      saldoTotal,
      progresoPromedio,
    };
  }
}

// Singleton
const debtRepository = new DebtRepository();
export default debtRepository;
