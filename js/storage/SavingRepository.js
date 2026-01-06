/**
 * Saving Repository
 * Repositorio para gestión de Ahorros
 */

import { BaseRepository } from "./BaseRepository.js";
import { Saving } from "../domain/Saving.js";

class SavingRepository extends BaseRepository {
  constructor() {
    super("savings");
  }

  /**
   * Obtener todos los ahorros como instancias de Saving
   * @returns {Promise<Saving[]>}
   */
  async getAll() {
    const data = await super.getAll();
    return data.map((item) => new Saving(item));
  }

  /**
   * Obtener un ahorro por ID como instancia de Saving
   * @param {number} id
   * @returns {Promise<Saving|null>}
   */
  async getById(id) {
    const data = await super.getById(id);
    return data ? new Saving(data) : null;
  }

  /**
   * Crear un nuevo ahorro
   * @param {Saving} saving
   * @returns {Promise<number>}
   */
  async create(saving) {
    const validacion = saving.validar();
    if (!validacion.valido) {
      throw new Error(`Validación fallida: ${validacion.errores.join(", ")}`);
    }

    return await super.create(saving.toJSON());
  }

  /**
   * Actualizar un ahorro existente
   * @param {Saving} saving
   * @returns {Promise<void>}
   */
  async update(saving) {
    if (!saving.id) {
      throw new Error("El ahorro debe tener un ID para ser actualizado");
    }

    const validacion = saving.validar();
    if (!validacion.valido) {
      throw new Error(`Validación fallida: ${validacion.errores.join(", ")}`);
    }

    return await super.update(saving.id, saving.toJSON());
  }

  /**
   * Depositar en un ahorro
   * @param {number} savingId
   * @param {number} monto
   * @param {string} nota
   * @returns {Promise<Object>}
   */
  async depositar(savingId, monto, nota = "") {
    const saving = await this.getById(savingId);
    if (!saving) {
      throw new Error(`Ahorro con ID ${savingId} no encontrado`);
    }

    const resultado = saving.depositar(monto, nota);
    if (!resultado.success) {
      throw new Error(resultado.error);
    }

    await this.update(saving);
    return resultado;
  }

  /**
   * Retirar de un ahorro
   * @param {number} savingId
   * @param {number} monto
   * @param {string} nota
   * @returns {Promise<Object>}
   */
  async retirar(savingId, monto, nota) {
    const saving = await this.getById(savingId);
    if (!saving) {
      throw new Error(`Ahorro con ID ${savingId} no encontrado`);
    }

    const resultado = saving.retirar(monto, nota);
    if (!resultado.success) {
      throw new Error(resultado.error);
    }

    await this.update(saving);
    return resultado;
  }

  /**
   * Actualizar la nota de un movimiento
   * @param {number} savingId
   * @param {number} movimientoIndex
   * @param {string} nota
   * @returns {Promise<Object>}
   */
  async actualizarNotaMovimiento(savingId, movimientoIndex, nota = "") {
    const saving = await this.getById(savingId);
    if (!saving) {
      throw new Error(`Ahorro con ID ${savingId} no encontrado`);
    }

    const resultado = saving.actualizarNotaMovimiento(
      movimientoIndex,
      nota
    );
    if (!resultado.success) {
      throw new Error(resultado.error);
    }

    await this.update(saving);
    return resultado;
  }

  /**
   * Generar ahorro aleatorio
   * @returns {number} - Monto aleatorio entre 10 y 600 Lempiras
   */
  generarAhorroAleatorio() {
    const min = 10;
    const max = 600;
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Obtener estadísticas generales de ahorros
   * @returns {Promise<Object>}
   */
  async getEstadisticas() {
    const todos = await this.getAll();

    const totalAcumulado = todos.reduce((sum, s) => sum + s.montoAcumulado, 0);
    const totalDepositado = todos.reduce(
      (sum, s) => sum + s.getTotalDepositado(),
      0
    );
    const totalRetirado = todos.reduce(
      (sum, s) => sum + s.getTotalRetirado(),
      0
    );

    const conObjetivo = todos.filter((s) => s.objetivoOpcional !== null);
    const totalObjetivos = conObjetivo.reduce(
      (sum, s) => sum + s.objetivoOpcional,
      0
    );

    return {
      totalAhorros: todos.length,
      totalAcumulado,
      totalDepositado,
      totalRetirado,
      ahorrosConObjetivo: conObjetivo.length,
      totalObjetivos,
    };
  }
}

// Singleton
const savingRepository = new SavingRepository();
export default savingRepository;
