/**
 * Debtor Repository
 * CRUD de personas que adeudan dinero
 */

import { BaseRepository } from "./BaseRepository.js";
import { Debtor } from "../domain/Debtor.js";

class DebtorRepository extends BaseRepository {
  constructor() {
    super("debtors");
  }

  /**
   * Obtener todas las personas como instancias de Debtor
   * @returns {Promise<Debtor[]>}
   */
  async getAll() {
    const data = await super.getAll();
    return data.map((item) => new Debtor(item));
  }

  /**
   * Obtener persona por ID
   * @param {number} id
   * @returns {Promise<Debtor|null>}
   */
  async getById(id) {
    const data = await super.getById(id);
    return data ? new Debtor(data) : null;
  }

  /**
   * Crear nueva persona
   * @param {Debtor} debtor
   * @returns {Promise<number>}
   */
  async create(debtor) {
    const validacion = debtor.validar();
    if (!validacion.valido) {
      throw new Error(validacion.errores.join(", "));
    }

    return await super.create(debtor.toJSON());
  }

  /**
   * Actualizar persona existente
   * @param {Debtor} debtor
   * @returns {Promise<void>}
   */
  async update(debtor) {
    if (!debtor.id) {
      throw new Error("La persona debe tener un ID para actualizarse");
    }

    const validacion = debtor.validar();
    if (!validacion.valido) {
      throw new Error(validacion.errores.join(", "));
    }

    return await super.update(debtor.id, debtor.toJSON());
  }
}

const debtorRepository = new DebtorRepository();
export default debtorRepository;
