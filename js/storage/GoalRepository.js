/**
 * Goal Repository
 * Repositorio para gestión de Metas Mensuales
 */

import { BaseRepository } from "./BaseRepository.js";
import { Goal } from "../domain/Goal.js";
import debtRepository from "./DebtRepository.js";
import savingRepository from "./SavingRepository.js";

class GoalRepository extends BaseRepository {
  constructor() {
    super("goals");
    this._processingRestarts = false;
  }

  /**
   * Obtener todas las metas como instancias de Goal
   * @returns {Promise<Goal[]>}
   */
  async getAll() {
    await this._processScheduledRestarts();
    const data = await super.getAll();
    return data.map((item) => new Goal(item));
  }

  /**
   * Obtener una meta por ID como instancia de Goal
   * @param {number} id
   * @returns {Promise<Goal|null>}
   */
  async getById(id) {
    const data = await super.getById(id);
    return data ? new Goal(data) : null;
  }

  /**
   * Obtener metas activas (no completadas)
   * @returns {Promise<Goal[]>}
   */
  async getActivas() {
    const todas = await this.getAll();
    return todas.filter((meta) => !meta.completada);
  }

  /**
   * Obtener metas completadas
   * @returns {Promise<Goal[]>}
   */
  async getCompletadas() {
    const todas = await this.getAll();
    return todas.filter((meta) => meta.completada);
  }

  /**
   * Crear una nueva meta
   * @param {Goal} goal
   * @returns {Promise<number>}
   */
  async create(goal) {
    const validacion = goal.validar();
    if (!validacion.valido) {
      throw new Error(`Validación fallida: ${validacion.errores.join(", ")}`);
    }

    return await super.create(goal.toJSON());
  }

  /**
   * Actualizar una meta existente
   * @param {Goal} goal
   * @returns {Promise<void>}
   */
  async update(goal) {
    if (!goal.id) {
      throw new Error("La meta debe tener un ID para ser actualizada");
    }

    const validacion = goal.validar();
    if (!validacion.valido) {
      throw new Error(`Validación fallida: ${validacion.errores.join(", ")}`);
    }

    return await super.update(goal.id, goal.toJSON());
  }

  /**
   * Agregar un aporte a una meta
   * @param {number} goalId
   * @param {number} monto
   * @param {string} nota
   * @returns {Promise<Object>}
   */
  async agregarAporte(goalId, monto, nota = "") {
    const goal = await this.getById(goalId);
    if (!goal) {
      throw new Error(`Meta con ID ${goalId} no encontrada`);
    }

    const resultado = goal.agregarAporte(monto, nota);
    if (!resultado.success) {
      throw new Error(resultado.error);
    }

    const now = Date.now();
    let shouldDelayRestart = false;
    if (goal.completada) {
      const dueDate = goal.fechaLimite ? new Date(goal.fechaLimite) : null;
      if (
        dueDate &&
        !Number.isNaN(dueDate.getTime()) &&
        dueDate.getTime() > now
      ) {
        shouldDelayRestart = true;
        goal.programarReinicio(dueDate);
      } else {
        goal.programarReinicio(null);
      }
    } else if (goal.reinicioProgramadoPara) {
      goal.programarReinicio(null);
    }

    await this.update(goal);

    let transferenciaAhorro = null;

    if (goal.completada && goal.ahorroAnualId) {
      transferenciaAhorro = await this.transferirAHorroAnual(goal);
    }

    // Si se completó, crear nueva meta para el siguiente ciclo
    if (goal.completada && !shouldDelayRestart) {
      const nuevaMeta = goal.reiniciarCiclo();
      await this.create(nuevaMeta);
    }

    return {
      ...resultado,
      transferenciaAhorro,
      reinicioProgramadoPara: goal.reinicioProgramadoPara,
      reinicioInmediato: goal.completada && !shouldDelayRestart,
    };
  }

  /**
   * Registrar un préstamo tomado de una meta
   * @param {number} goalId
   * @param {number} monto
   * @param {string} nota
   * @returns {Promise<Object>}
   */
  async registrarPrestamo(goalId, monto, nota = "") {
    const goal = await this.getById(goalId);
    if (!goal) {
      throw new Error(`Meta con ID ${goalId} no encontrada`);
    }

    const resultado = goal.registrarPrestamo(monto, nota);
    if (!resultado.success) {
      throw new Error(resultado.error);
    }

    await this.update(goal);
    return resultado;
  }

  /**
   * Reintegrar un préstamo tomado de una meta
   * @param {number} goalId
   * @param {number} monto
   * @param {string} nota
   * @returns {Promise<Object>}
   */
  async reintegrarPrestamo(goalId, monto, nota = "") {
    const goal = await this.getById(goalId);
    if (!goal) {
      throw new Error(`Meta con ID ${goalId} no encontrada`);
    }

    const wasCompleted = goal.completada;
    const resultado = goal.reintegrarPrestamo(monto, nota);
    if (!resultado.success) {
      throw new Error(resultado.error);
    }

    const now = Date.now();
    let shouldDelayRestart = false;
    if (goal.completada && !wasCompleted) {
      const dueDate = goal.fechaLimite ? new Date(goal.fechaLimite) : null;
      if (
        dueDate &&
        !Number.isNaN(dueDate.getTime()) &&
        dueDate.getTime() > now
      ) {
        shouldDelayRestart = true;
        goal.programarReinicio(dueDate);
      } else {
        goal.programarReinicio(null);
      }
    }

    await this.update(goal);

    if (goal.completada && !wasCompleted && !shouldDelayRestart) {
      const nuevaMeta = goal.reiniciarCiclo();
      await this.create(nuevaMeta);
    }

    return {
      ...resultado,
      reinicioProgramadoPara: goal.reinicioProgramadoPara,
      reinicioInmediato: goal.completada && !wasCompleted && !shouldDelayRestart,
    };
  }

  /**
   * Registrar aporte con abono de préstamo en una sola operación
   * @param {number} goalId
   * @param {number} montoAporte
   * @param {number} montoAbono
   * @param {string} nota
   * @returns {Promise<Object>}
   */
  async registrarAporteConAbono(goalId, montoAporte, montoAbono, nota = "") {
    const goal = await this.getById(goalId);
    if (!goal) {
      throw new Error(`Meta con ID ${goalId} no encontrada`);
    }

    const wasCompleted = goal.completada;
    let aporteResultado = null;
    let abonoResultado = null;

    if (montoAbono > 0) {
      abonoResultado = goal.reintegrarPrestamo(
        montoAbono,
        nota.trim() ? `${nota} (abono)` : "Abono a préstamo"
      );
      if (!abonoResultado.success) {
        throw new Error(abonoResultado.error);
      }
    }

    if (montoAporte > 0) {
      aporteResultado = goal.agregarAporte(montoAporte, nota);
      if (!aporteResultado.success) {
        throw new Error(aporteResultado.error);
      }
    }

    const now = Date.now();
    let shouldDelayRestart = false;
    if (goal.completada && !wasCompleted) {
      const dueDate = goal.fechaLimite ? new Date(goal.fechaLimite) : null;
      if (
        dueDate &&
        !Number.isNaN(dueDate.getTime()) &&
        dueDate.getTime() > now
      ) {
        shouldDelayRestart = true;
        goal.programarReinicio(dueDate);
      } else {
        goal.programarReinicio(null);
      }
    }

    await this.update(goal);

    let transferenciaAhorro = null;
    if (goal.completada && goal.ahorroAnualId) {
      transferenciaAhorro = await this.transferirAHorroAnual(goal);
    }

    if (goal.completada && !wasCompleted && !shouldDelayRestart) {
      const nuevaMeta = goal.reiniciarCiclo();
      await this.create(nuevaMeta);
    }

    return {
      success: true,
      aporte: aporteResultado?.aporte || null,
      abono: abonoResultado?.movimiento || null,
      progreso: goal.calcularProgreso(),
      transferenciaAhorro,
      reinicioProgramadoPara: goal.reinicioProgramadoPara,
      reinicioInmediato: goal.completada && !wasCompleted && !shouldDelayRestart,
    };
  }

  /**
   * Aplicar el monto de una meta completada a su deuda vinculada
   * @param {number} goalId
   * @param {Object} [options]
   * @param {string} [options.nota]
   * @returns {Promise<{montoAplicado:number, debtNombre:string, saldoRestante:number}>}
   */
  async aplicarMetaADeuda(goalId, { nota = "" } = {}) {
    const goal = await this.getById(goalId);
    if (!goal) {
      throw new Error(`Meta con ID ${goalId} no encontrada`);
    }

    if (!goal.debtId) {
      throw new Error("Esta meta no está vinculada a ninguna deuda.");
    }

    if (goal.debtApplication) {
      throw new Error("El aporte de esta meta ya se aplicó a su deuda.");
    }

    const saldoMetaDisponible = goal.getSaldoDisponible();
    if (saldoMetaDisponible <= 0) {
      throw new Error("Esta meta no tiene aportes registrados.");
    }

    if (goal.calcularProgreso() < 100) {
      throw new Error("Aún no has completado la meta mensual.");
    }

    const debt = await debtRepository.getById(goal.debtId);
    if (!debt) {
      throw new Error("La deuda vinculada ya no existe.");
    }

    const saldoDeudaDisponible = debt.calcularSaldo();
    if (saldoDeudaDisponible <= 0) {
      throw new Error("La deuda vinculada ya está saldada.");
    }

    const montoAplicable = Math.min(
      saldoMetaDisponible,
      saldoDeudaDisponible
    );
    const notaAplicacion =
      nota.trim() ||
      `Aplicación de la meta "${goal.nombre}" (ciclo ${goal.cicloActual})`;

    const resultadoPago = await debtRepository.agregarPago(
      debt.id,
      montoAplicable,
      notaAplicacion
    );

    goal.debtNombre = debt.nombre;
    goal.registrarAplicacionDeuda({
      monto: montoAplicable,
      debtId: debt.id,
      debtNombre: debt.nombre,
    });

    await this.update(goal);

    return {
      montoAplicado: montoAplicable,
      debtNombre: debt.nombre,
      saldoRestante: resultadoPago.saldoRestante,
    };
  }

  /**
   * Actualizar la nota de un aporte existente
   * @param {number} goalId
   * @param {number} aporteIndex
   * @param {string} nota
   * @returns {Promise<Object>}
   */
  async actualizarNotaAporte(goalId, aporteIndex, nota = "") {
    const goal = await this.getById(goalId);
    if (!goal) {
      throw new Error(`Meta con ID ${goalId} no encontrada`);
    }

    const resultado = goal.actualizarNotaAporte(aporteIndex, nota);
    if (!resultado.success) {
      throw new Error(resultado.error);
    }

    await this.update(goal);
    return resultado;
  }

  /**
   * Obtener estadísticas generales de metas
   * @returns {Promise<Object>}
   */
  async getEstadisticas() {
    const todas = await this.getAll();
    const activas = todas.filter((m) => !m.completada);
    const completadas = todas.filter((m) => m.completada);

    const totalObjetivo = activas.reduce((sum, m) => sum + m.montoObjetivo, 0);
    const totalAportado = activas.reduce(
      (sum, m) => sum + m.getTotalAportado(),
      0
    );
    const progresoPromedio =
      activas.length > 0
        ? activas.reduce((sum, m) => sum + m.calcularProgreso(), 0) /
          activas.length
        : 0;

    return {
      totalMetas: todas.length,
      metasActivas: activas.length,
      metasCompletadas: completadas.length,
      totalObjetivo,
      totalAportado,
      totalRestante: totalObjetivo - totalAportado,
      progresoPromedio,
    };
  }

  /**
   * Transferir el total aportado al ahorro anual vinculado
   * @param {Goal} goal
   * @returns {Promise<{monto:number, ahorroNombre:string}|null>}
   */
  async transferirAHorroAnual(goal) {
    try {
      const savingId = Number(goal.ahorroAnualId);
      if (!Number.isFinite(savingId)) {
        return null;
      }

      const totalAportado = goal.getTotalAportado();
      if (totalAportado <= 0) return null;

      const saving = await savingRepository.getById(savingId);
      if (!saving) {
        console.warn(
          "No se encontró el ahorro anual vinculado para la meta:",
          goal.ahorroAnualId
        );
        return null;
      }

      const note = `Transferencia automática de "${goal.nombre}" (ciclo ${goal.cicloActual})`;
      await savingRepository.depositar(saving.id, totalAportado, note);
      goal.ahorroAnualNombre = saving.nombre;
      return { monto: totalAportado, ahorroNombre: saving.nombre };
    } catch (error) {
      console.error("No se pudo transferir al ahorro anual:", error);
      return null;
    }
  }

  async _processScheduledRestarts() {
    if (this._processingRestarts) {
      return;
    }
    this._processingRestarts = true;
    try {
      const data = await super.getAll();
      const now = Date.now();

      for (const item of data) {
        const restartDate = item.reinicioProgramadoPara
          ? new Date(item.reinicioProgramadoPara)
          : null;
        if (
          !restartDate ||
          Number.isNaN(restartDate.getTime()) ||
          restartDate.getTime() > now
        ) {
          continue;
        }

        const completedGoal = new Goal(item);
        completedGoal.programarReinicio(null);
        await super.update(completedGoal.id, completedGoal.toJSON());

        const nuevaMeta = completedGoal.reiniciarCiclo({
          fechaInicio: restartDate.toISOString(),
        });
        await this.create(nuevaMeta);
      }
    } catch (error) {
      console.error(
        "No se pudieron procesar reinicios programados de metas:",
        error
      );
    } finally {
      this._processingRestarts = false;
    }
  }
}

// Singleton
const goalRepository = new GoalRepository();
export default goalRepository;
