/**
 * History Repository
 * Repositorio para consultar el historial de cambios (auditoría)
 */

import { BaseRepository } from "./BaseRepository.js";

class HistoryRepository extends BaseRepository {
  constructor() {
    super("history");
  }

  /**
   * Obtener historial completo ordenado por fecha descendente
   * @param {number} limit - Límite de resultados
   * @returns {Promise<Array>}
   */
  async getAll(limit = null) {
    const data = await super.getAll();
    const sorted = data.sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
    );
    return limit ? sorted.slice(0, limit) : sorted;
  }

  /**
   * Obtener historial por tipo de entidad
   * @param {string} entityType - Tipo de entidad ('goals', 'debts', etc.)
   * @param {number} limit
   * @returns {Promise<Array>}
   */
  async getByEntityType(entityType, limit = null) {
    const all = await this.getAll();
    const filtered = all.filter((entry) => entry.entityType === entityType);
    return limit ? filtered.slice(0, limit) : filtered;
  }

  /**
   * Obtener historial de una entidad específica
   * @param {string} entityType
   * @param {number} entityId
   * @returns {Promise<Array>}
   */
  async getByEntity(entityType, entityId) {
    const all = await this.getAll();
    return all.filter(
      (entry) => entry.entityType === entityType && entry.entityId === entityId
    );
  }

  /**
   * Obtener historial por acción
   * @param {string} action - 'create', 'update', 'delete'
   * @param {number} limit
   * @returns {Promise<Array>}
   */
  async getByAction(action, limit = null) {
    const all = await this.getAll();
    const filtered = all.filter((entry) => entry.action === action);
    return limit ? filtered.slice(0, limit) : filtered;
  }

  /**
   * Obtener historial por rango de fechas
   * @param {Date} fechaInicio
   * @param {Date} fechaFin
   * @returns {Promise<Array>}
   */
  async getByDateRange(fechaInicio, fechaFin) {
    const all = await this.getAll();
    return all.filter((entry) => {
      const timestamp = new Date(entry.timestamp);
      return timestamp >= fechaInicio && timestamp <= fechaFin;
    });
  }

  /**
   * Limpiar historial antiguo
   * @param {number} diasAntiguedad - Eliminar registros más antiguos que X días
   * @returns {Promise<number>} - Número de registros eliminados
   */
  async limpiarHistorialAntiguo(diasAntiguedad = 90) {
    const all = await this.getAll();
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() - diasAntiguedad);

    const aEliminar = all.filter(
      (entry) => new Date(entry.timestamp) < fechaLimite
    );

    for (const entry of aEliminar) {
      await super.delete(entry.id);
    }

    return aEliminar.length;
  }

  /**
   * Obtener estadísticas del historial
   * @returns {Promise<Object>}
   */
  async getEstadisticas() {
    const all = await this.getAll();

    const porTipo = {};
    const porAccion = {};

    all.forEach((entry) => {
      // Por tipo de entidad
      porTipo[entry.entityType] = (porTipo[entry.entityType] || 0) + 1;

      // Por acción
      porAccion[entry.action] = (porAccion[entry.action] || 0) + 1;
    });

    return {
      totalRegistros: all.length,
      porTipo,
      porAccion,
      registroMasReciente: all.length > 0 ? all[0] : null,
      registroMasAntiguo: all.length > 0 ? all[all.length - 1] : null,
    };
  }
}

// Singleton
const historyRepository = new HistoryRepository();
export default historyRepository;
