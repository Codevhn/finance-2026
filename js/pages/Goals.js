/**
 * Goals Page - Metas Mensuales
 * CRUD completo con sistema de aportes y auto-reinicio
 */

import goalRepository from "../storage/GoalRepository.js";
import debtRepository from "../storage/DebtRepository.js";
import savingRepository from "../storage/SavingRepository.js";
import { Goal } from "../domain/Goal.js";
import {
  notifyError,
  notifySuccess,
  confirmDialog,
} from "../ui/notifications.js";
import { formatCurrency } from "../utils/formatters.js";

let currentGoals = [];
let cachedDebts = [];
const GOAL_DUE_SOON_THRESHOLD_DAYS = 5;
let cachedSavings = [];
let cachedAnnualSavings = [];
let overflowAllocationState = null;

export async function renderGoals() {
  const mainContent = document.getElementById("main-content");

  try {
    // Cargar metas
    await loadGoals();

    mainContent.innerHTML = `
      <div class="page-container">
        <div class="page-header">
          <div>
            <h1 class="page-title">🎯 Metas Mensuales</h1>
            <p class="page-subtitle">Gestiona tus metas financieras mensuales</p>
          </div>
          <button class="btn btn--primary" onclick="window.openGoalModal()">
            <span>➕</span>
            <span>Nueva Meta</span>
          </button>
        </div>

        <div id="goals-content">
          ${renderGoalsContent()}
        </div>
      </div>

      <!-- Modal para crear/editar meta -->
      <div id="goal-modal" class="modal-overlay" style="display: none;">
        <div class="modal">
          <div class="modal__header">
            <h3 class="modal__title" id="modal-title">Nueva Meta</h3>
            <button class="modal__close" onclick="window.closeGoalModal()">✕</button>
          </div>
          <div class="modal__body">
            <form id="goal-form">
              <input type="hidden" id="goal-id">
              
              <div class="form-group">
                <label class="form-label form-label--required" for="goal-name">Nombre de la Meta</label>
                <input type="text" id="goal-name" class="form-input" placeholder="Ej: Fondo de Emergencia" required>
              </div>

              <div class="form-group">
                <label class="form-label form-label--required" for="goal-amount">Monto Objetivo (Lps)</label>
                <input type="number" id="goal-amount" class="form-input" placeholder="0.00" step="0.01" min="0.01" required>
              </div>

              <div class="form-group">
                <label class="form-label" for="goal-debt">Aplicar aportes a una deuda (opcional)</label>
                <select id="goal-debt" class="form-input">
                  ${renderDebtSelectOptions()}
                </select>
                <small style="display:block; font-size: var(--font-size-xs); color: var(--color-text-tertiary);">
                  Vincula esta meta a una deuda global para restar el aporte mensual cuando la completes.
                </small>
              </div>

              <div class="form-group">
                <label class="form-label" for="goal-savings">Transferir a un ahorro anual (opcional)</label>
                <select id="goal-savings" class="form-input">
                  ${renderAnnualSavingsOptions()}
                </select>
                <small style="display:block; font-size: var(--font-size-xs); color: var(--color-text-tertiary);">
                  Al completar la meta, enviaremos automáticamente el monto de este ciclo al ahorro anual que elijas.
                </small>
              </div>

              <div class="form-group">
                <label class="form-label" for="goal-due-date">Fecha límite para completar (opcional)</label>
                <input type="date" id="goal-due-date" class="form-input">
                <small style="display:block; font-size: var(--font-size-xs); color: var(--color-text-tertiary);">
                  Define hasta cuándo quieres tener lista esta meta y te mostraremos recordatorios.
                </small>
              </div>

              <div class="form-group">
                <label class="form-label" for="goal-suggested">Aporte diario sugerido (Lps) - opcional</label>
                <input type="number" id="goal-suggested" class="form-input" placeholder="0.00" step="0.01" min="0">
                <small style="display:block; font-size: var(--font-size-xs); color: var(--color-text-tertiary);">
                  Úsalo como recordatorio de cuánto debes apartar cada día para llegar a tiempo.
                </small>
              </div>
            </form>
          </div>
          <div class="modal__footer">
            <button type="button" class="btn btn--secondary" onclick="window.closeGoalModal()">Cancelar</button>
            <button type="button" class="btn btn--primary" onclick="window.saveGoal()">Guardar</button>
          </div>
        </div>
      </div>

      <!-- Modal para agregar aporte -->
      <div id="contribution-modal" class="modal-overlay" style="display: none;">
        <div class="modal">
          <div class="modal__header">
            <h3 class="modal__title">Agregar Aporte</h3>
            <button class="modal__close" onclick="window.closeContributionModal()">✕</button>
          </div>
          <div class="modal__body">
            <form id="contribution-form">
              <input type="hidden" id="contribution-goal-id">
              
              <div class="form-group">
                <label class="form-label">Meta</label>
                <div id="contribution-goal-name" style="font-weight: 600; color: var(--color-text-primary);"></div>
              </div>

              <div class="form-group">
                <label class="form-label form-label--required" for="contribution-amount">Monto del Aporte (Lps)</label>
                <input type="number" id="contribution-amount" class="form-input" placeholder="0.00" step="0.01" min="0.01" required>
              </div>

              <div class="form-group">
                <label class="form-label" for="contribution-note">Nota (opcional)</label>
                <input type="text" id="contribution-note" class="form-input" placeholder="Ej: Venta extra del fin de semana">
              </div>

              <div class="form-group">
                <label class="form-label">Progreso Actual</label>
                <div id="contribution-progress"></div>
              </div>
            </form>
          </div>
          <div class="modal__footer">
            <button type="button" class="btn btn--secondary" onclick="window.closeContributionModal()">Cancelar</button>
            <button type="button" class="btn btn--success" onclick="window.saveContribution()">Agregar Aporte</button>
          </div>
        </div>
      </div>

      <!-- Modal para gestionar sobrante -->
      <div id="overflow-modal" class="modal-overlay" style="display: none;">
        <div class="modal">
          <div class="modal__header">
            <h3 class="modal__title">Sobrante disponible</h3>
            <button class="modal__close" onclick="window.closeOverflowModal()">✕</button>
          </div>
          <div class="modal__body">
            <div style="margin-bottom: var(--spacing-md);">
              <p style="margin: 0; color: var(--color-text-secondary);">Tienes un sobrante al completar la meta:</p>
              <div style="font-size: var(--font-size-xl); font-weight: var(--font-weight-semibold);" id="overflow-amount-display">L 0.00</div>
              <div style="font-size: var(--font-size-sm); color: var(--color-text-tertiary);" id="overflow-goal-name">Meta</div>
            </div>

            <div class="form-group">
              <label class="form-label">¿Qué deseas hacer con este sobrante?</label>
              <div style="display:flex; flex-direction:column; gap: var(--spacing-xs);">
                <label style="display:flex; align-items:center; gap: var(--spacing-xs);">
                  <input type="radio" name="overflow-action" value="skip" checked>
                  <span>Guardar para otra ocasión (no moverlo)</span>
                </label>
                <label style="display:flex; align-items:center; gap: var(--spacing-xs);">
                  <input type="radio" name="overflow-action" value="debt">
                  <span>Aplicarlo a una deuda pendiente</span>
                </label>
                <label style="display:flex; align-items:center; gap: var(--spacing-xs);">
                  <input type="radio" name="overflow-action" value="saving">
                  <span>Depositarlo en un ahorro</span>
                </label>
              </div>
            </div>

            <div class="form-group" id="overflow-debt-group" style="display: none;">
              <label class="form-label" for="overflow-debt">Selecciona la deuda</label>
              <select id="overflow-debt" class="form-input"></select>
              <small class="form-hint">Se registrará como un pago a la deuda seleccionada.</small>
            </div>

            <div class="form-group" id="overflow-saving-group" style="display: none;">
              <label class="form-label" for="overflow-saving">Selecciona el ahorro</label>
              <select id="overflow-saving" class="form-input"></select>
              <small class="form-hint">El sobrante se depositará en ese ahorro.</small>
            </div>

            <div class="form-group">
              <label class="form-label" for="overflow-note">Nota (opcional)</label>
              <input type="text" id="overflow-note" class="form-input" placeholder="Ej: Sobrante de la meta de enero">
            </div>
          </div>
          <div class="modal__footer">
            <button type="button" class="btn btn--secondary" onclick="window.closeOverflowModal()">Cerrar</button>
            <button type="button" class="btn btn--primary" onclick="window.confirmOverflowAllocation()">Aplicar sobrante</button>
          </div>
        </div>
      </div>
    `;

    attachEventListeners();
  } catch (error) {
    console.error("Error al cargar metas:", error);
    mainContent.innerHTML = `
      <div class="page-container">
        <div class="empty-state">
          <div class="empty-state__icon">⚠️</div>
          <h2 class="empty-state__title">Error al cargar metas</h2>
          <p class="empty-state__description">${error.message}</p>
        </div>
      </div>
    `;
  }
}

async function loadGoals() {
  const [goals, debts, savings] = await Promise.all([
    goalRepository.getAll(),
    debtRepository.getAll(),
    savingRepository.getAll(),
  ]);
  currentGoals = goals;
  cachedDebts = debts;
  cachedSavings = savings;
  cachedAnnualSavings = savings
    .filter((saving) => saving.metaAnual)
    .sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""));
}

function renderGoalsContent() {
  const activeGoals = currentGoals.filter((g) => !g.completada);
  const completedGoals = currentGoals.filter((g) => g.completada);

  if (currentGoals.length === 0) {
    return `
      <div class="empty-state">
        <div class="empty-state__icon">🎯</div>
        <h2 class="empty-state__title">No tienes metas aún</h2>
        <p class="empty-state__description">Crea tu primera meta mensual para comenzar a ahorrar</p>
        <button class="btn btn--primary" onclick="window.openGoalModal()">
          <span>➕</span>
          <span>Crear Primera Meta</span>
        </button>
      </div>
    `;
  }

  return `
    ${
      activeGoals.length > 0
        ? `
      <div style="margin-bottom: var(--spacing-xl);">
        <h3 style="font-size: var(--font-size-lg); font-weight: var(--font-weight-semibold); margin-bottom: var(--spacing-md); color: var(--color-text-primary);">
          Metas Activas (${activeGoals.length})
        </h3>
        <div class="content-grid content-grid--2-cols">
          ${activeGoals.map((goal) => renderGoalCard(goal)).join("")}
        </div>
      </div>
    `
        : ""
    }

    ${
      completedGoals.length > 0
        ? `
      <div>
        <h3 style="font-size: var(--font-size-lg); font-weight: var(--font-weight-semibold); margin-bottom: var(--spacing-md); color: var(--color-text-primary);">
          Metas Completadas (${completedGoals.length})
        </h3>
        <div class="content-grid content-grid--2-cols">
          ${completedGoals.map((goal) => renderGoalCard(goal)).join("")}
        </div>
      </div>
    `
        : ""
    }
  `;
}

function renderGoalCard(goal) {
  const progress = goal.calcularProgreso();
  const totalAportado = goal.getTotalAportado();
  const restante = goal.getMontoRestante();
  const isCompleted = goal.completada;
  const dueStatus = getGoalDueStatus(goal);
  const dueDateDisplay = goal.fechaLimite
    ? new Date(goal.fechaLimite).toLocaleDateString("es-HN")
    : null;
  const linkedDebt = getGoalLinkedDebt(goal);
  const linkedDebtName = linkedDebt?.nombre || goal.debtNombre || "";
  const linkedDebtSaldo =
    linkedDebt && typeof linkedDebt.calcularSaldo === "function"
      ? linkedDebt.calcularSaldo()
      : null;
  const canApplyToDebt =
    Boolean(
      goal.debtId &&
        isCompleted &&
        !goal.debtApplication &&
        linkedDebt &&
        linkedDebtSaldo !== null &&
        linkedDebtSaldo > 0
    );
  const debtApplicationDate = goal.debtApplication?.fecha
    ? new Date(goal.debtApplication.fecha).toLocaleDateString("es-HN")
    : null;
  const restartDateDisplay = goal.reinicioProgramadoPara
    ? new Date(goal.reinicioProgramadoPara).toLocaleDateString("es-HN")
    : null;

  return `
    <div class="card">
      <div class="card__header">
        <div>
          <h3 class="card__title">${goal.nombre}</h3>
          ${
            goal.cicloActual > 1
              ? `<div class="badge badge--info">Ciclo ${goal.cicloActual}</div>`
              : ""
          }
          ${
            !isCompleted && dueStatus && dueStatus.severity !== "future"
              ? `<div class="badge ${
                  dueStatus.type === "danger"
                    ? "badge--danger"
                    : "badge--warning"
                }" style="margin-top: var(--spacing-xxs);">
                  ${
                    dueStatus.severity === "overdue"
                      ? "Meta vencida"
                      : dueStatus.severity === "today"
                      ? "Vence hoy"
                      : "Próxima a vencer"
                  }
                </div>`
              : ""
          }
        </div>
        <div style="display: flex; gap: var(--spacing-xs);">
          ${
            !isCompleted
              ? `
            <button class="btn btn--success btn--sm" onclick="window.openContributionModal(${goal.id})" title="Agregar aporte">
              💰
            </button>
          `
              : ""
          }
          <button class="btn btn--secondary btn--sm" onclick="window.editGoal(${
            goal.id
          })" title="Editar">
            ✏️
          </button>
          <button class="btn btn--danger btn--sm" onclick="window.deleteGoal(${
            goal.id
          })" title="Eliminar">
            🗑️
          </button>
        </div>
      </div>

      <div class="card__body">
        ${
          isCompleted
            ? `
          <div class="badge badge--success" style="margin-bottom: var(--spacing-md);">✅ Completada</div>
          ${
            restartDateDisplay
              ? `<div style="margin-bottom: var(--spacing-md); font-size: var(--font-size-sm); color: var(--color-text-secondary);">
                  ⏳ Nuevo ciclo programado para ${restartDateDisplay}
                </div>`
              : ""
          }
        `
            : ""
        }

        ${
          goal.ahorroAnualId
            ? `
          <div style="margin-top: var(--spacing-md); padding: var(--spacing-sm); background: var(--color-bg-secondary); border-radius: var(--border-radius-md); border: 1px dashed var(--color-border);">
            <div style="font-size: var(--font-size-xs); color: var(--color-text-tertiary);">Ahorro anual vinculado</div>
            <div style="font-size: var(--font-size-sm); font-weight: var(--font-weight-semibold); color: var(--color-text-primary);">
              ${goal.ahorroAnualNombre || "Ahorro anual"}
            </div>
            <div style="font-size: var(--font-size-xs); color: var(--color-text-secondary); margin-top: var(--spacing-xxs);">
              ${
                isCompleted
                  ? "El monto de este ciclo ya se transfirió automáticamente al ahorro."
                  : "Al completar la meta, el monto se transferirá automáticamente a este ahorro."
              }
            </div>
          </div>
        `
            : ""
        }

        <div style="margin-bottom: var(--spacing-md);">
          <div style="display: flex; justify-content: space-between; margin-bottom: var(--spacing-xs);">
            <span style="font-size: var(--font-size-sm); color: var(--color-text-secondary);">Progreso</span>
            <span style="font-size: var(--font-size-sm); font-weight: var(--font-weight-semibold);">
              ${progress.toFixed(1)}%
            </span>
          </div>
          <div class="progress">
            <div class="progress__bar ${
              progress >= 100
                ? "progress__bar--success"
                : "progress__bar--primary"
            }" 
                 style="width: ${Math.min(progress, 100)}%"></div>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-md); margin-bottom: var(--spacing-md);">
          <div>
            <div style="font-size: var(--font-size-xs); color: var(--color-text-tertiary);">Objetivo</div>
            <div style="font-size: var(--font-size-lg); font-weight: var(--font-weight-semibold); color: var(--color-text-primary);">
              ${formatCurrency(goal.montoObjetivo)}
            </div>
          </div>
          <div>
            <div style="font-size: var(--font-size-xs); color: var(--color-text-tertiary);">Aportado</div>
            <div style="font-size: var(--font-size-lg); font-weight: var(--font-weight-semibold); color: var(--color-success);">
              ${formatCurrency(totalAportado)}
            </div>
          </div>
        </div>

        ${
          !isCompleted
            ? `
          <div style="padding: var(--spacing-sm); background: rgba(59, 130, 246, 0.1); border-radius: var(--border-radius-md); border-left: 3px solid var(--color-primary);">
            <div style="font-size: var(--font-size-xs); color: var(--color-text-tertiary); margin-bottom: var(--spacing-xs);">
              Falta para completar
            </div>
            <div style="font-size: var(--font-size-base); font-weight: var(--font-weight-semibold); color: var(--color-primary);">
              ${formatCurrency(restante)}
            </div>
          </div>
        `
            : `
          <div style="padding: var(--spacing-sm); background: rgba(16, 185, 129, 0.1); border-radius: var(--border-radius-md); border-left: 3px solid var(--color-success);">
            <div style="font-size: var(--font-size-sm); color: var(--color-success);">
              🎉 ¡Meta completada el ${new Date(
                goal.fechaCompletado
              ).toLocaleDateString("es-HN")}!
            </div>
          </div>
        `
        }

        ${
          goal.debtId
            ? `
          <div style="margin-top: var(--spacing-md); padding: var(--spacing-sm); background: var(--color-bg-tertiary); border-radius: var(--border-radius-md); border: 1px dashed var(--color-border);">
            <div style="display:flex; justify-content:space-between; gap: var(--spacing-sm); align-items:flex-start; flex-wrap: wrap;">
              <div style="flex:1;">
                <div style="font-size: var(--font-size-xs); color: var(--color-text-tertiary);">Vinculada a</div>
                <div style="font-size: var(--font-size-sm); font-weight: var(--font-weight-semibold); color: var(--color-text-primary);">
                  ${linkedDebtName || "Deuda no disponible"}
                </div>
                ${
                  linkedDebtSaldo !== null
                    ? `<div style="font-size: var(--font-size-xs); color: var(--color-text-secondary); margin-top: var(--spacing-xxs);">
                        Saldo actual: ${formatCurrency(linkedDebtSaldo)}
                      </div>`
                    : `<div style="font-size: var(--font-size-xs); color: var(--color-warning); margin-top: var(--spacing-xxs);">
                        La deuda vinculada no está disponible actualmente.
                      </div>`
                }
                ${
                  !goal.debtApplication && linkedDebtSaldo === 0
                    ? `<div style="font-size: var(--font-size-xs); color: var(--color-warning); margin-top: var(--spacing-xxs);">
                        Esta deuda ya está saldada, no hay nada que restar.
                      </div>`
                    : ""
                }
                ${
                  goal.debtApplication
                    ? `<div style="font-size: var(--font-size-sm); color: var(--color-success); margin-top: var(--spacing-xxs);">
                        ✅ Se aplicó ${formatCurrency(goal.debtApplication.monto)} el ${debtApplicationDate || "—"}
                      </div>`
                    : `<div style="font-size: var(--font-size-xs); color: var(--color-text-secondary); margin-top: var(--spacing-xxs);">
                        ${
                          isCompleted
                            ? "Aplica este ahorro para restarlo automáticamente de la deuda."
                            : "Cuando completes la meta podrás usar el monto para abonar esta deuda."
                        }
                      </div>`
                }
              </div>
              ${
                canApplyToDebt
                  ? `<button class="btn btn--primary btn--sm" onclick="window.applyGoalToDebt(${goal.id})">
                      Aplicar a deuda
                    </button>`
                  : ""
              }
            </div>
          </div>
        `
            : ""
        }

        ${
          !isCompleted && dueDateDisplay
            ? `
          <div style="margin-top: var(--spacing-md); padding: var(--spacing-sm); background: var(--color-bg-tertiary); border-radius: var(--border-radius-md); border-left: 3px solid ${
              dueStatus && dueStatus.severity !== "future"
                ? dueStatus.type === "danger"
                  ? "var(--color-danger)"
                  : "var(--color-warning)"
                : "var(--color-border)"
            };">
            <div style="font-size: var(--font-size-xs); color: var(--color-text-tertiary);">Fecha límite</div>
            <div style="font-size: var(--font-size-base); font-weight: var(--font-weight-semibold); color: var(--color-text-primary);">
              ${dueDateDisplay}
            </div>
            ${
              dueStatus
                ? `<div style="font-size: var(--font-size-sm); margin-top: var(--spacing-xxs); color: ${
                    dueStatus.type === "danger"
                      ? "var(--color-danger)"
                      : dueStatus.type === "warning"
                      ? "var(--color-warning)"
                      : "var(--color-text-secondary)"
                  };">
                    ${dueStatus.icon || "📅"} ${dueStatus.label}
                  </div>`
                : ""
            }
          </div>
        `
            : ""
        }

        ${
          goal.aporteSugeridoDiario !== null
            ? `
          <div style="margin-top: var(--spacing-md); padding: var(--spacing-sm); border-radius: var(--border-radius-md); background: rgba(250, 204, 21, 0.12); border-left: 3px solid var(--color-warning);">
            <div style="font-size: var(--font-size-xs); color: var(--color-warning);">Aporte sugerido</div>
            <div style="font-size: var(--font-size-base); font-weight: var(--font-weight-semibold); color: var(--color-text-primary);">
              ${formatCurrency(goal.aporteSugeridoDiario)} diarios para alcanzar la meta.
            </div>
          </div>
        `
            : ""
        }

        ${
          goal.aportes.length > 0
            ? `
          <details style="margin-top: var(--spacing-md);">
            <summary style="cursor: pointer; font-size: var(--font-size-sm); color: var(--color-text-secondary);">
              Ver aportes (${goal.aportes.length})
            </summary>
            <div style="margin-top: var(--spacing-sm); max-height: 200px; overflow-y: auto;">
              ${goal.aportes
                .map((aporte, originalIndex) => ({
                  aporte,
                  originalIndex,
                }))
                .reverse()
                .map(
                  ({ aporte, originalIndex }) => `
                <div style="display: flex; justify-content: space-between; gap: var(--spacing-sm); padding: var(--spacing-xs) 0; border-bottom: 1px solid var(--color-border);">
                  <div style="flex:1;">
                    <div style="font-size: var(--font-size-xs); color: var(--color-text-tertiary);">
                      ${new Date(aporte.fecha).toLocaleDateString("es-HN")}
                    </div>
                    <div style="font-size: var(--font-size-base); font-weight: var(--font-weight-semibold); color: var(--color-text-primary);">
                      ${formatCurrency(aporte.monto)}
                    </div>
                    <div style="font-size: var(--font-size-xs); margin-top: var(--spacing-xxs); color: ${
                      aporte.nota
                        ? "var(--color-text-secondary)"
                        : "var(--color-text-tertiary)"
                    };">
                      ${aporte.nota ? aporte.nota : "Sin nota registrada"}
                    </div>
                    <div style="display:flex; gap: var(--spacing-xxs); flex-wrap: wrap; margin-top: var(--spacing-xxs);">
                      <button type="button" class="btn btn--ghost btn--sm" style="padding: var(--spacing-xxs) var(--spacing-xs); font-size: var(--font-size-xs);" onclick="window.editGoalContributionAmount(${
                        goal.id
                      }, ${originalIndex})">
                        ✏️ Editar monto
                      </button>
                      <button type="button" class="btn btn--ghost btn--sm" style="padding: var(--spacing-xxs) var(--spacing-xs); font-size: var(--font-size-xs);" onclick="window.editGoalContributionNote(${
                        goal.id
                      }, ${originalIndex})">
                        📝 ${aporte.nota ? "Editar nota" : "Agregar nota"}
                      </button>
                    </div>
                  </div>
                  <span style="font-size: var(--font-size-sm); font-weight: var(--font-weight-medium); color: var(--color-success); white-space: nowrap;">
                    +${formatCurrency(aporte.monto)}
                  </span>
                </div>
              `
                )
                .join("")}
            </div>
          </details>
        `
            : ""
        }
      </div>
    </div>
  `;
}

function attachEventListeners() {
  // Funciones globales para los modales
  window.openGoalModal = (goalId = null) => {
    const modal = document.getElementById("goal-modal");
    const form = document.getElementById("goal-form");
    const title = document.getElementById("modal-title");
    const numericId =
      goalId !== null && goalId !== undefined ? Number(goalId) : null;
    const goal =
      numericId !== null
        ? currentGoals.find((g) => g.id === numericId)
        : null;

    form.reset();

    const debtSelect = document.getElementById("goal-debt");
    if (debtSelect) {
      debtSelect.innerHTML = renderDebtSelectOptions(goal?.debtId ?? null);
    }
    const savingsSelect = document.getElementById("goal-savings");
    if (savingsSelect) {
      savingsSelect.innerHTML = renderAnnualSavingsOptions(
        goal?.ahorroAnualId ?? null
      );
    }

    if (goalId && !goal) {
      notifyError("No se encontró la meta seleccionada.");
      return;
    }

    if (goal) {
      title.textContent = "Editar Meta";
      document.getElementById("goal-id").value = goal.id;
      document.getElementById("goal-name").value = goal.nombre;
      document.getElementById("goal-amount").value = goal.montoObjetivo;
      document.getElementById("goal-due-date").value = formatDateForInput(
        goal.fechaLimite
      );
      document.getElementById("goal-suggested").value =
        goal.aporteSugeridoDiario !== null && !Number.isNaN(goal.aporteSugeridoDiario)
          ? Number(goal.aporteSugeridoDiario).toFixed(2)
          : "";
    } else {
      title.textContent = "Nueva Meta";
      document.getElementById("goal-id").value = "";
      document.getElementById("goal-suggested").value = "";
    }

    modal.style.display = "flex";
  };

  window.closeGoalModal = () => {
    document.getElementById("goal-modal").style.display = "none";
  };

  window.saveGoal = async () => {
    const form = document.getElementById("goal-form");
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const goalId = document.getElementById("goal-id").value;
    const nombre = document.getElementById("goal-name").value;
    const montoObjetivo = parseFloat(
      document.getElementById("goal-amount").value
    );
    const fechaLimiteInput = document.getElementById("goal-due-date").value;
    const aporteSugeridoValue =
      document.getElementById("goal-suggested").value;
    const aporteSugeridoDiario =
      aporteSugeridoValue !== ""
        ? parseFloat(aporteSugeridoValue)
        : null;
    const debtValue = document.getElementById("goal-debt").value;
    const parsedDebtId =
      debtValue && debtValue !== "" ? parseInt(debtValue, 10) : null;
    const normalizedDebtId =
      parsedDebtId !== null && !Number.isNaN(parsedDebtId)
        ? parsedDebtId
        : null;
    const selectedDebt =
      normalizedDebtId !== null
        ? cachedDebts.find((debt) => debt.id === normalizedDebtId)
        : null;
    const savingsSelectEl = document.getElementById("goal-savings");
    const savingsValue = savingsSelectEl ? savingsSelectEl.value : "";
    const parsedSavingsId =
      savingsValue && savingsValue !== "" ? parseInt(savingsValue, 10) : null;
    const selectedSaving =
      parsedSavingsId !== null && !Number.isNaN(parsedSavingsId)
        ? cachedAnnualSavings.find((saving) => saving.id === parsedSavingsId)
        : null;

    try {
      if (goalId) {
        // Editar
        const goal = currentGoals.find(
          (g) => g.id === Number.parseInt(goalId, 10)
        );
        if (!goal) {
          throw new Error("No se encontró la meta que quieres editar.");
        }
        goal.nombre = nombre;
        goal.montoObjetivo = montoObjetivo;
        goal.fechaLimite = parseOptionalDateInput(
          fechaLimiteInput,
          goal.fechaLimite
        );
        goal.aporteSugeridoDiario =
          aporteSugeridoDiario !== null && !Number.isNaN(aporteSugeridoDiario)
            ? aporteSugeridoDiario
            : null;
        if (selectedSaving) {
          goal.ahorroAnualId = selectedSaving.id;
          goal.ahorroAnualNombre = selectedSaving.nombre;
        } else if (parsedSavingsId === null || Number.isNaN(parsedSavingsId)) {
          goal.ahorroAnualId = null;
          goal.ahorroAnualNombre = "";
        } else {
          goal.ahorroAnualId = parsedSavingsId;
          goal.ahorroAnualNombre = goal.ahorroAnualNombre || "";
        }
        const previousDebtId = goal.debtId;
        const nextDebtId = selectedDebt
          ? selectedDebt.id
          : normalizedDebtId;

        if (goal.debtApplication && nextDebtId !== previousDebtId) {
          notifyError(
            "No puedes cambiar la deuda vinculada porque este ciclo ya se aplicó como pago."
          );
          return;
        }

        goal.debtId = nextDebtId;
        if (selectedDebt) {
          goal.debtNombre = selectedDebt.nombre;
        } else if (!goal.debtId) {
          goal.debtNombre = "";
        }

        if (previousDebtId !== goal.debtId && !goal.debtApplication) {
          goal.limpiarAplicacionDeuda();
        }

        await goalRepository.update(goal);
      } else {
        // Crear
        const goal = new Goal({
          nombre,
          montoObjetivo,
          aporteSugeridoDiario:
            aporteSugeridoDiario !== null &&
            !Number.isNaN(aporteSugeridoDiario)
              ? aporteSugeridoDiario
              : null,
          ahorroAnualId: selectedSaving
            ? selectedSaving.id
            : parsedSavingsId || null,
          ahorroAnualNombre: selectedSaving?.nombre || "",
          debtId: selectedDebt ? selectedDebt.id : null,
          debtNombre: selectedDebt ? selectedDebt.nombre : "",
          fechaLimite: parseOptionalDateInput(fechaLimiteInput),
        });
        await goalRepository.create(goal);
      }

      window.closeGoalModal();
      await renderGoals();
    } catch (error) {
      notifyError("Error al guardar la meta: " + error.message);
    }
  };

  window.editGoal = (goalId) => {
    window.openGoalModal(goalId);
  };

  window.deleteGoal = async (goalId) => {
    const numericId = Number(goalId);
    const goal = currentGoals.find((g) => g.id === numericId);
    if (!goal) {
      notifyError("No se encontró la meta seleccionada.");
      return;
    }
    const confirmed = await confirmDialog({
      title: "Eliminar meta",
      message: `¿Eliminar la meta "${goal.nombre}"? Esta acción es irreversible.`,
      confirmText: "Eliminar",
      cancelText: "Cancelar",
      type: "danger",
    });
    if (!confirmed) return;

    try {
      await goalRepository.delete(numericId);
      await renderGoals();
    } catch (error) {
      notifyError("Error al eliminar la meta: " + error.message);
    }
  };

  window.openContributionModal = (goalId) => {
    const goal = currentGoals.find((g) => g.id === goalId);
    if (!goal) return;

    const modal = document.getElementById("contribution-modal");
    const form = document.getElementById("contribution-form");

    form.reset();
    document.getElementById("contribution-goal-id").value = goal.id;
    document.getElementById("contribution-goal-name").textContent = goal.nombre;

    const progress = goal.calcularProgreso();
    const totalAportado = goal.getTotalAportado();
    const restante = goal.getMontoRestante();

    document.getElementById("contribution-progress").innerHTML = `
      <div style="margin-bottom: var(--spacing-sm);">
        <div style="display: flex; justify-content: space-between; margin-bottom: var(--spacing-xs); font-size: var(--font-size-sm);">
          <span>${formatCurrency(totalAportado)}</span>
          <span>${formatCurrency(goal.montoObjetivo)}</span>
        </div>
        <div class="progress">
          <div class="progress__bar progress__bar--primary" style="width: ${Math.min(
            progress,
            100
          )}%"></div>
        </div>
      </div>
      <div style="font-size: var(--font-size-sm); color: var(--color-text-secondary);">
        Falta: ${formatCurrency(restante)}
      </div>
    `;

    modal.style.display = "flex";
  };

  window.closeContributionModal = () => {
    document.getElementById("contribution-modal").style.display = "none";
  };

  window.saveContribution = async () => {
    const form = document.getElementById("contribution-form");
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const goalId = parseInt(
      document.getElementById("contribution-goal-id").value,
      10
    );
    const monto = parseFloat(
      document.getElementById("contribution-amount").value
    );
    const nota = document.getElementById("contribution-note").value;

    const goal = currentGoals.find((g) => g.id === goalId);
    if (!goal) {
      notifyError("No se encontró la meta seleccionada.");
      return;
    }

    if (!Number.isFinite(monto) || monto <= 0) {
      notifyError("Ingresa un monto válido para el aporte.");
      return;
    }

    let restante = goal.getMontoRestante();
    if (goal.completada || restante <= 0) {
      notifyError(
        "Esta meta ya está completada. Espera al siguiente ciclo para seguir aportando."
      );
      return;
    }

    let montoAplicable = monto;
    let excedente = 0;
    if (monto > restante) {
      excedente = monto - restante;
      montoAplicable = restante;
    }

    try {
      const resultado = await goalRepository.agregarAporte(
        goalId,
        montoAplicable,
        nota
      );

      if (resultado.progreso >= 100) {
        const completionMessage = resultado.reinicioProgramadoPara
          ? `🎉 ¡Felicidades! Has completado tu meta. El siguiente ciclo iniciará automáticamente el ${new Date(
              resultado.reinicioProgramadoPara
            ).toLocaleDateString("es-HN")}.`
          : "🎉 ¡Felicidades! Has completado tu meta. Se creó una nueva meta para el siguiente ciclo.";
        notifySuccess(completionMessage);
      }

      if (resultado.transferenciaAhorro) {
        notifySuccess(
          `Se transfirieron ${formatCurrency(
            resultado.transferenciaAhorro.monto
          )} al ahorro anual "${resultado.transferenciaAhorro.ahorroNombre}".`
        );
      }

      let overflowPayload = null;
      if (excedente > 0) {
        notifySuccess(
          `Tu meta se completó y sobraron ${formatCurrency(
            excedente
          )}. Decide cómo usar ese monto.`
        );
        overflowPayload = {
          goalId,
          goalName: goal.nombre,
          amount: excedente,
        };
      }

      window.closeContributionModal();
      await renderGoals();
      if (overflowPayload) {
        openOverflowModal(overflowPayload);
      }
    } catch (error) {
      notifyError("Error al agregar aporte: " + error.message);
    }
  };

  window.applyGoalToDebt = async (goalId) => {
    const goal = currentGoals.find((g) => g.id === goalId);
    if (!goal) {
      notifyError("No se encontró la meta seleccionada.");
      return;
    }

    if (!goal.debtId) {
      notifyError("Esta meta no está vinculada a ninguna deuda.");
      return;
    }

    if (!goal.completada) {
      notifyError("Completa la meta antes de aplicar el monto a la deuda.");
      return;
    }

    if (goal.debtApplication) {
      notifyError("Este ciclo ya fue aplicado a la deuda.");
      return;
    }

    const linkedDebt = getGoalLinkedDebt(goal);
    if (!linkedDebt) {
      notifyError("La deuda vinculada ya no está disponible.");
      return;
    }

    const saldo = typeof linkedDebt.calcularSaldo === "function"
      ? linkedDebt.calcularSaldo()
      : 0;
    if (saldo <= 0) {
      notifyError("La deuda vinculada ya no tiene saldo pendiente.");
      return;
    }

    const montoDisponible = goal.getTotalAportado();
    if (montoDisponible <= 0) {
      notifyError("No hay aportes disponibles para aplicar.");
      return;
    }

    const montoAAplicar = Math.min(montoDisponible, saldo);
    const confirmed = await confirmDialog({
      title: "Aplicar meta a deuda",
      message: `¿Deseas restar ${formatCurrency(
        montoAAplicar
      )} de la deuda "${linkedDebt.nombre}"? Se registrará como pago.`,
      confirmText: "Aplicar ahora",
      cancelText: "Cancelar",
      type: "primary",
    });
    if (!confirmed) return;

    try {
      const resultado = await goalRepository.aplicarMetaADeuda(goalId);
      notifySuccess(
        `Se aplicaron ${formatCurrency(
          resultado.montoAplicado
        )} a "${resultado.debtNombre}". Saldo restante: ${formatCurrency(
          resultado.saldoRestante
        )}.`
      );
      await renderGoals();
    } catch (error) {
      notifyError("No se pudo aplicar la meta: " + error.message);
    }
  };

  window.editGoalContributionNote = async (goalId, aporteIndex) => {
    const goal = currentGoals.find((g) => g.id === goalId);
    if (!goal || aporteIndex < 0 || aporteIndex >= goal.aportes.length) {
      notifyError("No se encontró el aporte seleccionado.");
      return;
    }

    const aporte = goal.aportes[aporteIndex];
    const nuevaNota = window.prompt(
      "Describe este aporte (opcional):",
      aporte?.nota || ""
    );
    if (nuevaNota === null) {
      return;
    }

    try {
      await goalRepository.actualizarNotaAporte(
        goalId,
        aporteIndex,
        nuevaNota
      );
      notifySuccess("Nota actualizada");
      await renderGoals();
    } catch (error) {
      notifyError("No se pudo actualizar la nota: " + error.message);
    }
  };

  window.editGoalContributionAmount = async (goalId, aporteIndex) => {
    const goal = currentGoals.find((g) => g.id === goalId);
    if (!goal || aporteIndex < 0 || aporteIndex >= goal.aportes.length) {
      notifyError("No se encontró el aporte seleccionado.");
      return;
    }

    const aporte = goal.aportes[aporteIndex];
    const nuevoMontoStr = window.prompt(
      "Ingresa el nuevo monto para este aporte:",
      aporte?.monto != null ? aporte.monto : ""
    );
    if (nuevoMontoStr === null) {
      return;
    }

    const nuevoMonto = parseFloat(nuevoMontoStr);
    if (!Number.isFinite(nuevoMonto) || nuevoMonto <= 0) {
      notifyError("El monto debe ser un número mayor a 0.");
      return;
    }

    try {
      const resultado = goal.actualizarMontoAporte(aporteIndex, nuevoMonto);
      if (!resultado.success) {
        notifyError(resultado.error || "No se pudo actualizar el aporte.");
        return;
      }
      await goalRepository.update(goal);
      notifySuccess("Aporte actualizado correctamente");
      await renderGoals();
    } catch (error) {
      notifyError("Error al actualizar el aporte: " + error.message);
    }
  };

  // Cerrar modales al hacer click fuera
  document.getElementById("goal-modal")?.addEventListener("click", (e) => {
    if (e.target.id === "goal-modal") {
      window.closeGoalModal();
    }
  });

  document
    .getElementById("contribution-modal")
    ?.addEventListener("click", (e) => {
      if (e.target.id === "contribution-modal") {
        window.closeContributionModal();
      }
    });

  document.getElementById("overflow-modal")?.addEventListener("click", (e) => {
    if (e.target.id === "overflow-modal") {
      window.closeOverflowModal();
    }
  });

  document
    .querySelectorAll('input[name="overflow-action"]')
    .forEach((input) => {
      input.addEventListener("change", handleOverflowActionChange);
    });

  handleOverflowActionChange();
}

function openOverflowModal({ goalId, goalName, amount }) {
  const modal = document.getElementById("overflow-modal");
  if (!modal) return;
  overflowAllocationState = {
    goalId,
    goalName,
    amount,
  };
  const amountDisplay = document.getElementById("overflow-amount-display");
  const goalNameDisplay = document.getElementById("overflow-goal-name");
  if (amountDisplay) {
    amountDisplay.textContent = formatCurrency(amount);
  }
  if (goalNameDisplay) {
    goalNameDisplay.textContent = goalName || "Meta mensual";
  }
  const noteInput = document.getElementById("overflow-note");
  if (noteInput) {
    noteInput.value = "";
  }

  const defaultOption = document.querySelector(
    'input[name="overflow-action"][value="skip"]'
  );
  if (defaultOption) {
    defaultOption.checked = true;
  }

  const debtSelect = document.getElementById("overflow-debt");
  if (debtSelect) {
    debtSelect.innerHTML = renderOverflowDebtOptions();
  }
  const savingSelect = document.getElementById("overflow-saving");
  if (savingSelect) {
    savingSelect.innerHTML = renderOverflowSavingOptions();
  }

  handleOverflowActionChange();
  modal.style.display = "flex";
}

window.closeOverflowModal = () => {
  const modal = document.getElementById("overflow-modal");
  if (modal) {
    modal.style.display = "none";
  }
  overflowAllocationState = null;
  const noteInput = document.getElementById("overflow-note");
  if (noteInput) {
    noteInput.value = "";
  }
};

function getSelectedOverflowAction() {
  return document.querySelector('input[name="overflow-action"]:checked')
    ?.value;
}

function handleOverflowActionChange() {
  const action = getSelectedOverflowAction();
  const debtGroup = document.getElementById("overflow-debt-group");
  const savingGroup = document.getElementById("overflow-saving-group");
  if (debtGroup) {
    debtGroup.style.display = action === "debt" ? "block" : "none";
  }
  if (savingGroup) {
    savingGroup.style.display = action === "saving" ? "block" : "none";
  }
}

function renderOverflowDebtOptions() {
  const activeDebts = cachedDebts.filter((debt) => !debt.archivada);
  if (!activeDebts.length) {
    return `<option value="" disabled>No tienes deudas activas</option>`;
  }

  const options = [
    `<option value="">Selecciona una deuda</option>`,
    ...activeDebts.map((debt) => {
      const saldo =
        typeof debt.calcularSaldo === "function"
          ? debt.calcularSaldo()
          : 0;
      return `<option value="${debt.id}">${debt.nombre} · Saldo ${formatCurrency(
        saldo
      )}</option>`;
    }),
  ];

  return options.join("");
}

function renderOverflowSavingOptions() {
  if (!cachedSavings.length) {
    return `<option value="" disabled>No tienes ahorros disponibles</option>`;
  }

  const options = [
    `<option value="">Selecciona un ahorro</option>`,
    ...cachedSavings.map(
      (saving) =>
        `<option value="${saving.id}">${saving.nombre || "Ahorro sin nombre"}</option>`
    ),
  ];

  return options.join("");
}

window.confirmOverflowAllocation = async () => {
  if (!overflowAllocationState) {
    window.closeOverflowModal();
    return;
  }

  const action = getSelectedOverflowAction();
  const note = document.getElementById("overflow-note")?.value || "";
  const { amount, goalName } = overflowAllocationState;

  if (!action || action === "skip") {
    notifySuccess(
      "El sobrante quedó disponible para usarlo cuando decidas."
    );
    window.closeOverflowModal();
    return;
  }

  try {
    if (action === "debt") {
      const select = document.getElementById("overflow-debt");
      const debtId = select ? parseInt(select.value, 10) : null;
      if (!debtId) {
        notifyError("Selecciona la deuda a la que quieres aplicar el sobrante.");
        return;
      }
      const debtName = getDebtNameById(debtId) || "Deuda";
      const resultado = await debtRepository.agregarPago(
        debtId,
        amount,
        note.trim() || `Sobrante de la meta "${goalName}"`
      );
      notifySuccess(
        `Se aplicaron ${formatCurrency(
          amount
        )} a "${debtName}". Saldo restante: ${formatCurrency(
          resultado.saldoRestante
        )}.`
      );
    } else if (action === "saving") {
      const select = document.getElementById("overflow-saving");
      const savingId = select ? parseInt(select.value, 10) : null;
      if (!savingId) {
        notifyError("Selecciona el ahorro donde quieres depositar el sobrante.");
        return;
      }
      const saving =
        cachedSavings.find((item) => item.id === savingId) || null;
      await savingRepository.depositar(
        savingId,
        amount,
        note.trim() || `Sobrante de la meta "${goalName}"`
      );
      notifySuccess(
        `Depositaste ${formatCurrency(amount)} en "${
          saving?.nombre || "Ahorro"
        }".`
      );
    }

    window.closeOverflowModal();
    await renderGoals();
  } catch (error) {
    notifyError("No se pudo aplicar el sobrante: " + error.message);
  }
};

function renderDebtSelectOptions(selectedId = null) {
  const normalizedSelectedId =
    selectedId === null || selectedId === undefined
      ? null
      : Number(selectedId);
  const effectiveSelectedId = Number.isNaN(normalizedSelectedId)
    ? null
    : normalizedSelectedId;

  const options = [
    `<option value="" ${effectiveSelectedId === null ? "selected" : ""}>Sin vincular</option>`,
  ];

  const activeDebts = cachedDebts.filter((debt) => !debt.archivada);

  if (activeDebts.length === 0) {
    options.push(
      `<option value="" disabled>No tienes deudas activas disponibles</option>`
    );
  } else {
    options.push(
      ...activeDebts.map((debt) => {
        const saldo = typeof debt.calcularSaldo === "function"
          ? debt.calcularSaldo()
          : 0;
        return `<option value="${debt.id}" ${
          effectiveSelectedId === debt.id ? "selected" : ""
        }>${debt.nombre} · Saldo ${formatCurrency(saldo)}</option>`;
      })
    );
  }

  if (
    effectiveSelectedId !== null &&
    !activeDebts.some((debt) => debt.id === effectiveSelectedId)
  ) {
    const fallbackName =
      getDebtNameById(effectiveSelectedId) || "Deuda no disponible";
    options.push(
      `<option value="${effectiveSelectedId}" selected>${fallbackName} (no disponible)</option>`
    );
  }

  return options.join("");
}

function renderAnnualSavingsOptions(selectedId = null) {
  const normalizedSelectedId =
    selectedId === null || selectedId === undefined
      ? null
      : Number(selectedId);
  const effectiveSelectedId = Number.isNaN(normalizedSelectedId)
    ? null
    : normalizedSelectedId;

  if (!cachedAnnualSavings.length) {
    return `<option value="">Sin ahorro anual disponible</option>`;
  }

  const options = [
    `<option value="" ${effectiveSelectedId === null ? "selected" : ""}>Sin ahorro anual</option>`,
  ];

  options.push(
    ...cachedAnnualSavings.map((saving) => {
      const labelYear = saving.anioMeta ? ` (${saving.anioMeta})` : "";
      return `<option value="${saving.id}" ${
        effectiveSelectedId === saving.id ? "selected" : ""
      }>${saving.nombre}${labelYear}</option>`;
    })
  );

  if (
    effectiveSelectedId !== null &&
    !cachedAnnualSavings.some((saving) => saving.id === effectiveSelectedId)
  ) {
    options.push(
      `<option value="${effectiveSelectedId}" selected>Ahorro ya no disponible</option>`
    );
  }

  return options.join("");
}

function getGoalLinkedDebt(goal) {
  if (!goal || !goal.debtId) return null;
  return cachedDebts.find((debt) => debt.id === goal.debtId) || null;
}

function getDebtNameById(debtId) {
  if (debtId === null || debtId === undefined) return "";
  const debt = cachedDebts.find((d) => d.id === debtId);
  return debt ? debt.nombre : "";
}

function formatDateForInput(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().split("T")[0];
}

function parseOptionalDateInput(value, fallback = null) {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return fallback || null;
  }
  return parsed.toISOString();
}

function getGoalDueStatus(goal) {
  if (!goal || !goal.fechaLimite) {
    return null;
  }

  const dueDate = new Date(goal.fechaLimite);
  if (Number.isNaN(dueDate.getTime())) {
    return null;
  }

  const diasRestantes =
    typeof goal.getDiasParaVencimiento === "function"
      ? goal.getDiasParaVencimiento()
      : Math.ceil((dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  if (diasRestantes === null || Number.isNaN(diasRestantes)) {
    return null;
  }

  const formattedDate = dueDate.toLocaleDateString("es-HN");
  let severity = "future";
  let type = "info";
  let label = `Vence en ${diasRestantes} día${
    Math.abs(diasRestantes) === 1 ? "" : "s"
  }`;
  let icon = "📅";

  if (diasRestantes < 0) {
    const overdueDays = Math.abs(diasRestantes);
    severity = "overdue";
    type = "danger";
    icon = "⏰";
    label =
      overdueDays === 0
        ? "Venció hoy"
        : `Venció hace ${overdueDays} día${overdueDays === 1 ? "" : "s"}`;
  } else if (diasRestantes === 0) {
    severity = "today";
    type = "danger";
    icon = "⏰";
    label = "Vence hoy";
  } else if (diasRestantes <= GOAL_DUE_SOON_THRESHOLD_DAYS) {
    severity = "soon";
    type = "warning";
    icon = "⚠️";
    label = `Vence en ${diasRestantes} día${
      diasRestantes === 1 ? "" : "s"
    }`;
  }

  return {
    diasRestantes,
    severity,
    type,
    label,
    icon,
    formattedDate,
  };
}
