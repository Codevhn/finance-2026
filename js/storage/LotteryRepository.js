/**
 * Lottery Repository
 * Repositorio para gestión de Lotería
 */

import { BaseRepository } from "./BaseRepository.js";
import { Lottery } from "../domain/Lottery.js";

class LotteryRepository extends BaseRepository {
  constructor() {
    super("lottery");
  }

  /**
   * Obtener instancia única de lotería (singleton pattern)
   * La lotería es un registro único que acumula todas las apuestas y premios
   * @returns {Promise<Lottery>}
   */
  async getInstance() {
    const all = await super.getAll();

    if (all.length === 0) {
      // Crear instancia inicial
      const lottery = new Lottery();
      const lotteryData = lottery.toJSON();
      // Remover el id ya que será auto-generado por IndexedDB
      delete lotteryData.id;
      const id = await super.create(lotteryData);
      lottery.id = id;
      return lottery;
    }

    // Retornar la primera (y única) instancia
    return new Lottery(all[0]);
  }

  /**
   * Actualizar la instancia de lotería
   * @param {Lottery} lottery
   * @returns {Promise<void>}
   */
  async update(lottery) {
    if (!lottery.id) {
      throw new Error("La lotería debe tener un ID para ser actualizada");
    }

    return await super.update(lottery.id, lottery.toJSON());
  }

  /**
   * Registrar una apuesta
   * @param {number} monto
   * @param {string} descripcion
   * @returns {Promise<Object>}
   */
  async registrarApuesta(monto, descripcion = "") {
    const lottery = await this.getInstance();

    const resultado = lottery.registrarApuesta(monto, descripcion);
    if (!resultado.success) {
      throw new Error(resultado.error);
    }

    await this.update(lottery);
    return resultado;
  }

  /**
   * Registrar un premio
   * @param {number} monto
   * @param {string} descripcion
   * @returns {Promise<Object>}
   */
  async registrarPremio(monto, descripcion = "") {
    const lottery = await this.getInstance();

    const resultado = lottery.registrarPremio(monto, descripcion);
    if (!resultado.success) {
      throw new Error(resultado.error);
    }

    await this.update(lottery);
    return resultado;
  }

  /**
   * Obtener estadísticas completas
   * @returns {Promise<Object>}
   */
  async getEstadisticas() {
    const lottery = await this.getInstance();
    return lottery.getEstadisticas();
  }

  /**
   * Obtener estadísticas por rango de fechas
   * @param {Date} fechaInicio
   * @param {Date} fechaFin
   * @returns {Promise<Object>}
   */
  async getEstadisticasPorRango(fechaInicio, fechaFin) {
    const lottery = await this.getInstance();
    return lottery.getEstadisticasPorRango(fechaInicio, fechaFin);
  }

  /**
   * Obtener historial combinado
   * @param {number} limit
   * @returns {Promise<Array>}
   */
  async getHistorial(limit = null) {
    const lottery = await this.getInstance();
    return lottery.getHistorial(limit);
  }
}

// Singleton
const lotteryRepository = new LotteryRepository();
export default lotteryRepository;
