/**
 * Savings Page - Ahorros
 * CRUD completo con depósitos, retiros y ahorro aleatorio
 */

import savingRepository from "../storage/SavingRepository.js";
import { Saving } from "../domain/Saving.js";
import {
  notifyError,
  notifyInfo,
  notifySuccess,
  confirmDialog,
} from "../ui/notifications.js";
import { formatCurrency } from "../utils/formatters.js";

let currentSavings = [];
let pendingRandomSaving = null;

export async function renderSavings() {
  const mainContent = document.getElementById("main-content");

  try {
    // Cargar ahorros
    await loadSavings();

    mainContent.innerHTML = `
      <div class="page-container">
        <div class="page-header">
          <div>
            <h1 class="page-title">🏦 Ahorros</h1>
            <p class="page-subtitle">Gestiona tus fondos de ahorro</p>
          </div>
          <div style="display: flex; gap: var(--spacing-sm);">
            <button class="btn btn--secondary" onclick="window.generateRandomSaving()">
              <span>🎲</span>
              <span>Ahorro Aleatorio</span>
            </button>
            <button class="btn btn--primary" onclick="window.openSavingModal()">
              <span>➕</span>
              <span>Nuevo Fondo</span>
            </button>
          </div>
        </div>

        <div id="savings-content">
          ${renderSavingsContent()}
        </div>
      </div>

      <!-- Modal para crear/editar fondo de ahorro -->
      <div id="saving-modal" class="modal-overlay" style="display: none;">
        <div class="modal">
          <div class="modal__header">
            <h3 class="modal__title" id="saving-modal-title">Nuevo Fondo de Ahorro</h3>
            <button class="modal__close" onclick="window.closeSavingModal()">✕</button>
          </div>
          <div class="modal__body">
            <form id="saving-form">
              <input type="hidden" id="saving-id">
              
              <div class="form-group">
                <label class="form-label form-label--required" for="saving-name">Nombre del Fondo</label>
                <input type="text" id="saving-name" class="form-input" placeholder="Ej: Fondo de Emergencia" required>
              </div>

              <div class="form-group">
                <label class="form-label" for="saving-goal">Objetivo (Lps) - Opcional</label>
                <input type="number" id="saving-goal" class="form-input" placeholder="0.00" step="0.01" min="0">
                <small style="color: var(--color-text-tertiary);">Deja en blanco si no tiene objetivo específico</small>
              </div>

              <div class="form-group">
                <label class="form-label" for="saving-internal-loan">Préstamo pendiente en este fondo (Lps)</label>
                <input type="number" id="saving-internal-loan" class="form-input" placeholder="0.00" step="0.01" min="0">
                <small style="color: var(--color-text-tertiary);">Registra lo que tomaste prestado de este ahorro para reponerlo luego.</small>
              </div>

              <div class="form-group">
                <label class="form-label" for="saving-locked">Restricción de retiros</label>
                <label style="display: flex; align-items: flex-start; gap: var(--spacing-sm); font-size: var(--font-size-sm); color: var(--color-text-secondary);">
                  <input type="checkbox" id="saving-locked" style="margin-top: 4px;">
                  <span>
                    Marcar como fondo protegido (intocable). Úsalo para reservas que no deben gastarse; solo permitirá depósitos.
                  </span>
                </label>
              </div>

              <div class="form-group">
                <label class="form-label" for="saving-annual">Meta anual</label>
                <label style="display: flex; align-items: flex-start; gap: var(--spacing-sm); font-size: var(--font-size-sm); color: var(--color-text-secondary);">
                  <input type="checkbox" id="saving-annual" style="margin-top: 4px;">
                  <span>
                    Marca este fondo como una meta anual para darle seguimiento hasta finalizar el año seleccionado.
                  </span>
                </label>
                <div id="saving-annual-settings" style="margin-top: var(--spacing-sm); display: none;">
                  <label class="form-label" for="saving-annual-year">Año objetivo</label>
                  <select id="saving-annual-year" class="form-input">
                    ${renderAnnualYearOptions()}
                  </select>
                  <small style="color: var(--color-text-tertiary);">
                    Al cierre del año podrás evaluar si cumpliste la meta.
                  </small>
                </div>
              </div>
            </form>
          </div>
          <div class="modal__footer">
            <button class="btn btn--secondary" onclick="window.closeSavingModal()">Cancelar</button>
            <button class="btn btn--primary" onclick="window.saveSaving()">Guardar</button>
      </div>
    </div>
  </div>

  <!-- Modal para ahorro aleatorio -->
  <div id="random-saving-modal" class="modal-overlay" style="display: none;">
    <div class="modal">
      <div class="modal__header">
        <h3 class="modal__title">Asignar ahorro aleatorio</h3>
        <button class="modal__close" onclick="window.closeRandomSavingModal()">✕</button>
      </div>
      <div class="modal__body">
        <p class="form-hint">
          Generamos un monto al azar para impulsar tu hábito de ahorro. Selecciona en qué fondo quieres guardarlo.
        </p>
        <div class="card" style="margin: var(--spacing-md) 0; text-align:center;">
          <div style="font-size: var(--font-size-sm); color: var(--color-text-secondary);">Monto sugerido</div>
          <div style="font-size: 2.5rem; font-weight: var(--font-weight-bold);" id="random-saving-amount">0.00</div>
        </div>
        <div class="form-group">
          <label class="form-label" for="random-saving-select">Fondo de ahorro</label>
          <select id="random-saving-select" class="form-input"></select>
        </div>
      </div>
      <div class="modal__footer">
        <button class="btn btn--secondary" onclick="window.closeRandomSavingModal()">Cancelar</button>
        <button class="btn btn--primary" onclick="window.confirmRandomSaving()">Agregar ahorro</button>
      </div>
    </div>
  </div>

      <!-- Modal para depositar -->
      <div id="deposit-modal" class="modal-overlay" style="display: none;">
        <div class="modal">
          <div class="modal__header">
            <h3 class="modal__title">Depositar Dinero</h3>
            <button class="modal__close" onclick="window.closeDepositModal()">✕</button>
          </div>
          <div class="modal__body">
            <form id="deposit-form">
              <input type="hidden" id="deposit-saving-id">
              
              <div class="form-group">
                <label class="form-label">Fondo</label>
                <div id="deposit-saving-name" style="font-weight: 600; color: var(--color-text-primary);"></div>
              </div>

              <div class="form-group">
                <label class="form-label form-label--required" for="deposit-amount">Monto a Depositar (Lps)</label>
                <input type="number" id="deposit-amount" class="form-input" placeholder="0.00" step="0.01" min="0.01" required>
              </div>

              <div class="form-group">
                <label class="form-label" for="deposit-note">Nota (opcional)</label>
                <input type="text" id="deposit-note" class="form-input" placeholder="Ej: Ahorro mensual">
              </div>

              <div class="form-group">
                <label class="form-label">Depósito normal</label>
                <div style="font-size: var(--font-size-xs); color: var(--color-text-tertiary);">
                  Usa este formulario solo para aumentar el saldo del fondo.
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Saldo Actual</label>
                <div id="deposit-balance"></div>
              </div>
            </form>
          </div>
          <div class="modal__footer">
            <button class="btn btn--secondary" onclick="window.closeDepositModal()">Cancelar</button>
            <button class="btn btn--success" onclick="window.saveDeposit()">Depositar</button>
          </div>
        </div>
      </div>

      <!-- Modal para retirar -->
      <div id="withdraw-modal" class="modal-overlay" style="display: none;">
        <div class="modal">
          <div class="modal__header">
            <h3 class="modal__title">Retirar Dinero</h3>
            <button class="modal__close" onclick="window.closeWithdrawModal()">✕</button>
          </div>
          <div class="modal__body">
            <form id="withdraw-form">
              <input type="hidden" id="withdraw-saving-id">
              
              <div class="form-group">
                <label class="form-label">Fondo</label>
                <div id="withdraw-saving-name" style="font-weight: 600; color: var(--color-text-primary);"></div>
              </div>

              <div class="form-group">
                <label class="form-label form-label--required" for="withdraw-amount">Monto a Retirar (Lps)</label>
                <input type="number" id="withdraw-amount" class="form-input" placeholder="0.00" step="0.01" min="0.01" required>
              </div>

              <div class="form-group">
                <label class="form-label form-label--required" for="withdraw-note">Razón del Retiro</label>
                <input type="text" id="withdraw-note" class="form-input" placeholder="Ej: Emergencia médica" required>
              </div>

              <div class="form-group">
                <label class="form-label">Tipo de retiro</label>
                <div style="display:flex; gap: var(--spacing-lg); flex-wrap: wrap;">
                  <label style="display:flex; align-items:center; gap: var(--spacing-xs); font-weight: var(--font-weight-medium); cursor:pointer;">
                    <input type="radio" name="withdraw-type" value="normal">
                    <span>Retiro normal</span>
                  </label>
                  <label style="display:flex; align-items:center; gap: var(--spacing-xs); font-weight: var(--font-weight-medium); cursor:pointer;">
                    <input type="radio" name="withdraw-type" value="prestamo" checked>
                    <span>Préstamo del ahorro</span>
                  </label>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Saldo Disponible</label>
                <div id="withdraw-balance"></div>
              </div>
            </form>
          </div>
          <div class="modal__footer">
            <button class="btn btn--secondary" onclick="window.closeWithdrawModal()">Cancelar</button>
            <button class="btn btn--danger" onclick="window.saveWithdraw()">Retirar</button>
          </div>
        </div>
      </div>

      <!-- Modal para abonar préstamo -->
      <div id="loan-repay-modal" class="modal-overlay" style="display: none;">
        <div class="modal">
          <div class="modal__header">
            <h3 class="modal__title">Abonar préstamo</h3>
            <button class="modal__close" onclick="window.closeLoanRepayModal()">✕</button>
          </div>
          <div class="modal__body">
            <form id="loan-repay-form">
              <input type="hidden" id="loan-repay-saving-id">

              <div class="form-group">
                <label class="form-label">Fondo</label>
                <div id="loan-repay-saving-name" style="font-weight: 600; color: var(--color-text-primary);"></div>
              </div>

              <div class="form-group">
                <label class="form-label form-label--required" for="loan-repay-amount">Monto a Abonar (Lps)</label>
                <input type="number" id="loan-repay-amount" class="form-input" placeholder="0.00" step="0.01" min="0.01" required>
              </div>

              <div class="form-group">
                <label class="form-label" for="loan-repay-note">Nota (opcional)</label>
                <input type="text" id="loan-repay-note" class="form-input" placeholder="Ej: Abono semanal">
              </div>

              <div class="form-group">
                <label class="form-label">Préstamo Pendiente</label>
                <div id="loan-repay-pending"></div>
              </div>
            </form>
          </div>
          <div class="modal__footer">
            <button class="btn btn--secondary" onclick="window.closeLoanRepayModal()">Cancelar</button>
            <button class="btn btn--primary" onclick="window.saveLoanRepayment()">Abonar</button>
          </div>
        </div>
      </div>
    `;

    attachEventListeners();
  } catch (error) {
    console.error("Error al cargar ahorros:", error);
    mainContent.innerHTML = `
      <div class="page-container">
        <div class="empty-state">
          <div class="empty-state__icon">⚠️</div>
          <h2 class="empty-state__title">Error al cargar ahorros</h2>
          <p class="empty-state__description">${error.message}</p>
        </div>
      </div>
    `;
  }
}

function renderAnnualYearOptions(selectedYear = null) {
  const currentYear = new Date().getFullYear();
  const baseYears = [];
  for (let offset = -1; offset <= 5; offset += 1) {
    baseYears.push(currentYear + offset);
  }

  const uniqueYears = [...new Set(baseYears)];
  if (
    selectedYear !== null &&
    typeof selectedYear === "number" &&
    !uniqueYears.includes(selectedYear)
  ) {
    uniqueYears.push(selectedYear);
  }

  uniqueYears.sort((a, b) => a - b);

  const defaultYear =
    selectedYear && uniqueYears.includes(selectedYear)
      ? selectedYear
      : currentYear;

  return uniqueYears
    .map(
      (year) =>
        `<option value="${year}" ${
          year === defaultYear ? "selected" : ""
        }>${year}</option>`
    )
    .join("");
}

function setAnnualYearSelection(year = null) {
  const select = document.getElementById("saving-annual-year");
  if (!select) return;

  if (year !== null) {
    const exists = Array.from(select.options).some(
      (option) => parseInt(option.value, 10) === year
    );
    if (!exists) {
      const option = document.createElement("option");
      option.value = `${year}`;
      option.textContent = `${year}`;
      select.appendChild(option);
    }
    select.value = `${year}`;
  } else {
    const currentYear = new Date().getFullYear();
    select.value = `${currentYear}`;
  }
}

function renderAnnualMetaNotice(year) {
  const now = new Date();
  const endOfYear = new Date(year, 11, 31, 23, 59, 59);
  const diffMs = endOfYear.getTime() - now.getTime();
  const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  let statusText;
  if (daysRemaining > 0) {
    statusText = `Quedan ${daysRemaining} día${
      daysRemaining === 1 ? "" : "s"
    } para cerrar ${year}.`;
  } else {
    statusText = `El año ${year} finalizó. Registra si cumpliste tu meta antes de comenzar la siguiente.`;
  }

  return `
    <div class="saving-card__annual">
      <strong>Meta anual ${year}</strong>
      <span class="saving-card__annual-status">${statusText}</span>
    </div>
  `;
}

async function loadSavings() {
  currentSavings = await savingRepository.getAll();
}

function renderSavingsContent() {
  if (currentSavings.length === 0) {
    return `
      <div class="empty-state">
        <div class="empty-state__icon">🏦</div>
        <h2 class="empty-state__title">No tienes fondos de ahorro</h2>
        <p class="empty-state__description">Crea tu primer fondo de ahorro para comenzar a ahorrar</p>
        <button class="btn btn--primary" onclick="window.openSavingModal()">
          <span>➕</span>
          <span>Crear Primer Fondo</span>
        </button>
      </div>
    `;
  }

  return `
    <div class="content-grid content-grid--2-cols">
      ${currentSavings.map((saving) => renderSavingCard(saving)).join("")}
    </div>
  `;
}

function renderSavingCard(saving) {
  const progress = saving.calcularProgreso();
  const restante = saving.getMontoRestante();
  const hasGoal = saving.objetivoOpcional && saving.objetivoOpcional > 0;
  const isProtected = Boolean(saving.intocable);
  const isAnnual = Boolean(saving.metaAnual);
  const prestamoPendiente = Number.isFinite(Number(saving.prestamoPendiente))
    ? Number(saving.prestamoPendiente)
    : 0;
  const saldoActual = Number.isFinite(Number(saving.montoAcumulado))
    ? Number(saving.montoAcumulado)
    : 0;
  const saldoNeto = saldoActual;
  const saldoTotal =
    prestamoPendiente > 0 ? saldoActual + prestamoPendiente : saldoActual;
  const totalRetirado =
    typeof saving.getTotalRetirado === "function"
      ? saving.getTotalRetirado()
      : (saving.depositos || []).reduce(
          (sum, mov) => sum + (mov.tipo === "retiro" ? Number(mov.monto) || 0 : 0),
          0
        );
  const annualYear =
    typeof saving.anioMeta === "number"
      ? saving.anioMeta
      : new Date().getFullYear();
  const badges = [];

  badges.push(
    hasGoal
      ? '<div class="badge badge--info">Con Objetivo</div>'
      : '<div class="badge badge--accent">Acumulativo</div>'
  );

  if (isAnnual) {
    badges.push(
      `<div class="badge badge--primary">Meta anual ${annualYear}</div>`
    );
  }

  if (isProtected) {
    badges.push(
      '<div class="badge badge--danger" title="Fondo protegido, no permite retiros">Intocable</div>'
    );
  }

  return `
    <div class="card">
      <div class="card__header saving-card__header">
        <div class="saving-card__info">
          <div class="saving-card__icon ${
            isProtected ? "saving-card__icon--protected" : ""
          }">
            ${isProtected ? "🔒" : "🏦"}
          </div>
          <div class="saving-card__info-text">
            <div class="saving-card__name-row">
              <h3 class="card__title card__title--truncate" title="${saving.nombre}">${saving.nombre}</h3>
            </div>
            <div class="card__tags saving-card__tags">
              ${badges.join("")}
            </div>
          </div>
        </div>
        <div class="card__actions">
          <button class="btn btn--success btn--sm" onclick="window.openDepositModal(${
            saving.id
          })" title="Depositar">
            ⬇️
          </button>
          ${
            prestamoPendiente > 0
              ? `<button class="btn btn--secondary btn--sm" onclick="window.openLoanRepayModal(${saving.id})" title="Abonar préstamo">
                  💳
                </button>`
              : ""
          }
          <button class="btn btn--danger btn--sm" onclick="window.openWithdrawModal(${saving.id})" title="${
            isProtected
              ? "Fondo protegido: no permite retiros"
              : "Retirar"
          }" ${isProtected ? "disabled" : ""}>
            ⬆️
          </button>
          <button class="btn btn--secondary btn--sm" onclick="window.editSaving(${
            saving.id
          })" title="Editar">
            ✏️
          </button>
          <button class="btn btn--danger btn--sm" onclick="window.deleteSaving(${
            saving.id
          })" title="Eliminar">
            🗑️
          </button>
        </div>
      </div>

      <div class="card__body">
        ${
          isAnnual
            ? renderAnnualMetaNotice(annualYear)
            : ""
        }
        ${
          isProtected
            ? `<div style="padding: var(--spacing-sm); border-radius: var(--border-radius-md); background: rgba(239, 68, 68, 0.08); color: var(--color-danger); font-size: var(--font-size-xs); margin-bottom: var(--spacing-md);">
                Fondo protegido: solo se permiten depósitos hasta que le quites la restricción.
              </div>`
            : ""
        }
        ${
          hasGoal
            ? `
          <div style="margin-bottom: var(--spacing-md);">
            <div style="display: flex; justify-content: space-between; margin-bottom: var(--spacing-xs);">
              <span style="font-size: var(--font-size-sm); color: var(--color-text-secondary);">Progreso hacia objetivo</span>
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
        `
            : ""
        }

        <div style="padding: var(--spacing-md); background: rgba(16, 185, 129, 0.1); border-radius: var(--border-radius-md); margin-bottom: var(--spacing-md);">
          <div style="font-size: var(--font-size-xs); color: var(--color-text-tertiary); margin-bottom: var(--spacing-xs);">
            Saldo actual
          </div>
          <div style="font-size: var(--font-size-2xl); font-weight: var(--font-weight-bold); color: ${
            saldoNeto < 0 ? "var(--color-danger)" : "var(--color-success)"
          };">
            ${formatCurrency(saldoNeto)}
          </div>
          ${
            prestamoPendiente > 0
              ? `<div style="font-size: var(--font-size-xs); color: var(--color-text-secondary); margin-top: var(--spacing-xxs);">
                  Saldo total: ${formatCurrency(saldoTotal)}
                </div>`
              : ""
          }
        </div>

        ${
          totalRetirado > 0
            ? `<div style="margin-bottom: var(--spacing-md); padding: var(--spacing-sm); border-radius: var(--border-radius-md); background: rgba(239, 68, 68, 0.08); border-left: 3px solid var(--color-danger);">
                <div style="font-size: var(--font-size-xs); color: var(--color-text-tertiary); margin-bottom: var(--spacing-xxs);">
                  Retirado total
                </div>
                <div style="font-size: var(--font-size-base); font-weight: var(--font-weight-semibold); color: var(--color-danger);">
                  ${formatCurrency(totalRetirado)}
                </div>
              </div>`
            : ""
        }

        ${
          hasGoal || prestamoPendiente > 0
            ? `
          <div style="display: grid; grid-template-columns: ${
            hasGoal && prestamoPendiente > 0 ? "1fr 1fr" : "1fr"
          }; gap: var(--spacing-md); margin-bottom: var(--spacing-md);">
            ${
              hasGoal
                ? `
              <div>
                <div style="font-size: var(--font-size-xs); color: var(--color-text-tertiary);">Falta para meta</div>
                <div style="font-size: var(--font-size-lg); font-weight: var(--font-weight-semibold); color: var(--color-primary);">
                  ${formatCurrency(restante)}
                </div>
              </div>
            `
                : ""
            }
            ${
              prestamoPendiente > 0
                ? `
              <div>
                <div style="font-size: var(--font-size-xs); color: var(--color-text-tertiary);">Falta por reponer</div>
                <div style="font-size: var(--font-size-lg); font-weight: var(--font-weight-semibold); color: var(--color-warning);">
                  ${formatCurrency(prestamoPendiente)}
                </div>
              </div>
            `
                : ""
            }
          </div>
        `
            : ""
        }

        ${
          saving.depositos.length > 0
            ? `
          <details style="margin-top: var(--spacing-md);">
            <summary style="cursor: pointer; font-size: var(--font-size-sm); color: var(--color-text-secondary);">
              Movimientos recientes (${saving.depositos.length})
            </summary>
            <div style="margin-top: var(--spacing-sm); max-height: 200px; overflow-y: auto;">
              ${saving
                .getHistorial(5)
                .map((mov) => ({
                  mov,
                  originalIndex: saving.depositos.indexOf(mov),
                }))
                .map(
                  ({ mov, originalIndex }) => `
                <div style="display: flex; justify-content: space-between; align-items: start; gap: var(--spacing-sm); padding: var(--spacing-xs) 0; border-bottom: 1px solid var(--color-border);">
                  <div style="flex:1;">
                    <div style="font-size: var(--font-size-xs); color: var(--color-text-tertiary);">
                      ${new Date(mov.fecha).toLocaleDateString("es-HN")} - ${
                    mov.tipo === "deposito"
                      ? mov.subtipo === "reintegro-prestamo"
                        ? "⬇️ Reintegro de préstamo"
                        : "⬇️ Depósito"
                      : mov.subtipo === "prestamo"
                      ? "⬆️ Préstamo"
                      : "⬆️ Retiro"
                  }
                    </div>
                    <div style="font-size: var(--font-size-xs); margin-top: var(--spacing-xxs); color: ${
                      mov.nota
                        ? "var(--color-text-secondary)"
                        : "var(--color-text-tertiary)"
                    };">
                      ${mov.nota ? mov.nota : "Sin nota registrada"}
                    </div>
                    <button type="button" class="btn btn--ghost btn--sm" style="padding: var(--spacing-xxs) var(--spacing-xs); margin-top: var(--spacing-xxs); font-size: var(--font-size-xs);" onclick="window.editSavingMovementNote(${
                      saving.id
                    }, ${originalIndex})">
                      📝 ${mov.nota ? "Editar nota" : "Agregar nota"}
                    </button>
                  </div>
                  <span style="font-size: var(--font-size-sm); font-weight: var(--font-weight-medium); color: ${
                    mov.tipo === "deposito"
                      ? "var(--color-success)"
                      : "var(--color-danger)"
                  };">
                    ${mov.tipo === "deposito" ? "+" : "-"}${formatCurrency(
                      mov.monto
                    )}
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
        ${
          saving.depositos.length === 0
            ? `<div style="margin-top: var(--spacing-md); font-size: var(--font-size-xs); color: var(--color-text-tertiary);">
                Sin movimientos registrados aún.
              </div>`
            : ""
        }
      </div>
    </div>
  `;
}

function attachEventListeners() {
  const annualCheckbox = document.getElementById("saving-annual");
  const annualSettings = document.getElementById("saving-annual-settings");
  const updateAnnualVisibility = () => {
    if (!annualSettings) return;
    annualSettings.style.display = annualCheckbox?.checked ? "block" : "none";
  };

  annualCheckbox?.addEventListener("change", updateAnnualVisibility);
  updateAnnualVisibility();
  setAnnualYearSelection();

  // Funciones globales para los modales
  window.openSavingModal = (savingId = null) => {
    const modal = document.getElementById("saving-modal");
    const form = document.getElementById("saving-form");
    const title = document.getElementById("saving-modal-title");

    form.reset();

    if (savingId) {
      const saving = currentSavings.find((s) => s.id === savingId);
      if (saving) {
        title.textContent = "Editar Fondo de Ahorro";
        document.getElementById("saving-id").value = saving.id;
        document.getElementById("saving-name").value = saving.nombre;
        document.getElementById("saving-goal").value =
          saving.objetivoOpcional || "";
        document.getElementById("saving-internal-loan").value =
          Number(saving.prestamoPendiente) > 0
            ? Number(saving.prestamoPendiente).toFixed(2)
            : "";
        document.getElementById("saving-locked").checked = Boolean(
          saving.intocable
        );
        const isAnnual = Boolean(saving.metaAnual);
        document.getElementById("saving-annual").checked = isAnnual;
        setAnnualYearSelection(
          isAnnual && typeof saving.anioMeta === "number"
            ? saving.anioMeta
            : new Date().getFullYear()
        );
        const annualSettings = document.getElementById("saving-annual-settings");
        if (annualSettings) {
          annualSettings.style.display = isAnnual ? "block" : "none";
        }
      }
    } else {
      title.textContent = "Nuevo Fondo de Ahorro";
      document.getElementById("saving-locked").checked = false;
      document.getElementById("saving-annual").checked = false;
      document.getElementById("saving-internal-loan").value = "";
      setAnnualYearSelection(new Date().getFullYear());
      const annualSettings = document.getElementById("saving-annual-settings");
      if (annualSettings) {
        annualSettings.style.display = "none";
      }
    }

    modal.style.display = "flex";
  };

  window.closeSavingModal = () => {
    document.getElementById("saving-modal").style.display = "none";
  };

  window.saveSaving = async () => {
    const form = document.getElementById("saving-form");
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const savingId = document.getElementById("saving-id").value;
    const nombre = document.getElementById("saving-name").value;
    const objetivoOpcional =
      parseFloat(document.getElementById("saving-goal").value) || null;
    const prestamoValue =
      document.getElementById("saving-internal-loan").value;
    const prestamoPendiente =
      prestamoValue !== "" ? parseFloat(prestamoValue) : 0;
    const esIntocable = document.getElementById("saving-locked").checked;
    const esMetaAnual = document.getElementById("saving-annual").checked;
    const anioMetaSeleccionado = esMetaAnual
      ? parseInt(document.getElementById("saving-annual-year").value, 10)
      : null;
    const currentYear = new Date().getFullYear();
    const anioMetaValido = esMetaAnual
      ? Number.isNaN(anioMetaSeleccionado)
        ? currentYear
        : anioMetaSeleccionado
      : null;

    try {
      if (savingId) {
        // Editar
        const saving = currentSavings.find((s) => s.id === parseInt(savingId));
        saving.nombre = nombre;
        saving.objetivoOpcional = objetivoOpcional;
        saving.prestamoPendiente = Number.isFinite(prestamoPendiente)
          ? prestamoPendiente
          : 0;
        saving.intocable = esIntocable;
        saving.metaAnual = esMetaAnual;
        saving.anioMeta = esMetaAnual ? anioMetaValido : null;
        await savingRepository.update(saving);
      } else {
        // Crear
        const saving = new Saving({
          nombre,
          objetivoOpcional,
          prestamoPendiente: Number.isFinite(prestamoPendiente)
            ? prestamoPendiente
            : 0,
          intocable: esIntocable,
          metaAnual: esMetaAnual,
          anioMeta: esMetaAnual ? anioMetaValido : null,
        });
        await savingRepository.create(saving);
      }

      window.closeSavingModal();
      await renderSavings();
    } catch (error) {
      notifyError("Error al guardar el fondo: " + error.message);
    }
  };

  window.editSaving = (savingId) => {
    window.openSavingModal(savingId);
  };

  window.deleteSaving = async (savingId) => {
    const numericId = Number(savingId);
    const saving = currentSavings.find((s) => s.id === numericId);
    if (!saving) {
      notifyError("No se encontró el fondo seleccionado.");
      return;
    }
    const confirmed = await confirmDialog({
      title: "Eliminar fondo",
      message: `¿Eliminar el fondo "${saving.nombre}"? Esta acción no se puede deshacer.`,
      confirmText: "Eliminar",
      cancelText: "Cancelar",
      type: "danger",
    });
    if (!confirmed) return;

    try {
      await savingRepository.delete(numericId);
      await renderSavings();
    } catch (error) {
      notifyError("Error al eliminar el fondo: " + error.message);
    }
  };

  window.openDepositModal = (savingId) => {
    const saving = currentSavings.find((s) => s.id === savingId);
    if (!saving) return;

    const modal = document.getElementById("deposit-modal");
    const form = document.getElementById("deposit-form");

    form.reset();
    document.getElementById("deposit-saving-id").value = saving.id;
    document.getElementById("deposit-saving-name").textContent = saving.nombre;

    const progress = saving.calcularProgreso();
    const hasGoal = saving.objetivoOpcional && saving.objetivoOpcional > 0;
    const prestamoPendiente = Number.isFinite(Number(saving.prestamoPendiente))
      ? Number(saving.prestamoPendiente)
      : 0;

    document.getElementById("deposit-balance").innerHTML = `
      <div style="font-size: var(--font-size-lg); font-weight: var(--font-weight-semibold); color: var(--color-success);">
        ${formatCurrency(saving.montoAcumulado)}
      </div>
      ${
        prestamoPendiente > 0
          ? `<div style="font-size: var(--font-size-xs); color: var(--color-text-secondary); margin-top: var(--spacing-xxs);">
              Préstamo pendiente: ${formatCurrency(prestamoPendiente)}
            </div>`
          : ""
      }
      ${
        hasGoal
          ? `
        <div style="margin-top: var(--spacing-sm);">
          <div style="display: flex; justify-content: space-between; margin-bottom: var(--spacing-xs); font-size: var(--font-size-sm);">
            <span>Progreso</span>
            <span>${progress.toFixed(1)}%</span>
          </div>
          <div class="progress">
            <div class="progress__bar progress__bar--primary" style="width: ${Math.min(
              progress,
              100
            )}%"></div>
          </div>
        </div>
      `
          : ""
      }
    `;

    modal.style.display = "flex";
  };

  window.closeDepositModal = () => {
    document.getElementById("deposit-modal").style.display = "none";
  };

  window.saveDeposit = async () => {
    const form = document.getElementById("deposit-form");
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const savingId = parseInt(
      document.getElementById("deposit-saving-id").value
    );
    const monto = parseFloat(document.getElementById("deposit-amount").value);
    const nota = document.getElementById("deposit-note").value;

    if (!Number.isFinite(monto) || monto <= 0) {
      notifyError("Ingresa un monto válido para el depósito.");
      return;
    }

    try {
      await savingRepository.depositar(savingId, monto, nota, {
        subtipo: "normal",
      });
      window.closeDepositModal();
      await renderSavings();
    } catch (error) {
      notifyError("Error al depositar: " + error.message);
    }
  };

  window.openWithdrawModal = (savingId) => {
    const saving = currentSavings.find((s) => s.id === savingId);
    if (!saving) return;

    if (saving.intocable) {
      notifyInfo(
        `El fondo "${saving.nombre}" está protegido y no permite retiros. Edita el fondo para desactivar la restricción si deseas usarlo.`
      );
      return;
    }

    const modal = document.getElementById("withdraw-modal");
    const form = document.getElementById("withdraw-form");

    form.reset();
    document.getElementById("withdraw-saving-id").value = saving.id;
    document.getElementById("withdraw-saving-name").textContent = saving.nombre;

    document.getElementById("withdraw-balance").innerHTML = `
      <div style="font-size: var(--font-size-lg); font-weight: var(--font-weight-semibold); color: var(--color-success);">
        ${formatCurrency(saving.montoAcumulado)}
      </div>
    `;

    modal.style.display = "flex";
  };

  window.closeWithdrawModal = () => {
    document.getElementById("withdraw-modal").style.display = "none";
  };

  window.saveWithdraw = async () => {
    const form = document.getElementById("withdraw-form");
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const savingId = parseInt(
      document.getElementById("withdraw-saving-id").value
    );
    const monto = parseFloat(document.getElementById("withdraw-amount").value);
    const nota = document.getElementById("withdraw-note").value;
    const withdrawType =
      document.querySelector('input[name="withdraw-type"]:checked')?.value ||
      "normal";
    const withdrawOptions = {
      subtipo: withdrawType === "prestamo" ? "prestamo" : "normal",
    };

    try {
      await savingRepository.retirar(
        savingId,
        monto,
        nota,
        withdrawOptions
      );
      window.closeWithdrawModal();
      await renderSavings();
    } catch (error) {
      notifyError("Error al retirar: " + error.message);
    }
  };

  window.openLoanRepayModal = (savingId) => {
    const saving = currentSavings.find((s) => s.id === savingId);
    if (!saving) return;

    const prestamoPendiente = Number.isFinite(Number(saving.prestamoPendiente))
      ? Number(saving.prestamoPendiente)
      : 0;

    if (prestamoPendiente <= 0) {
      notifyInfo("Este fondo no tiene préstamos pendientes.");
      return;
    }

    const modal = document.getElementById("loan-repay-modal");
    const form = document.getElementById("loan-repay-form");
    if (!modal || !form) return;

    form.reset();
    document.getElementById("loan-repay-saving-id").value = saving.id;
    document.getElementById("loan-repay-saving-name").textContent =
      saving.nombre;
    document.getElementById("loan-repay-pending").innerHTML = `
      <div style="font-size: var(--font-size-lg); font-weight: var(--font-weight-semibold); color: var(--color-warning);">
        ${formatCurrency(prestamoPendiente)}
      </div>
    `;

    modal.style.display = "flex";
  };

  window.closeLoanRepayModal = () => {
    const modal = document.getElementById("loan-repay-modal");
    if (modal) {
      modal.style.display = "none";
    }
  };

  window.saveLoanRepayment = async () => {
    const form = document.getElementById("loan-repay-form");
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const savingId = parseInt(
      document.getElementById("loan-repay-saving-id").value
    );
    const monto = parseFloat(
      document.getElementById("loan-repay-amount").value
    );
    const nota = document.getElementById("loan-repay-note").value;

    const saving = currentSavings.find((s) => s.id === savingId);
    const prestamoPendiente = Number.isFinite(Number(saving?.prestamoPendiente))
      ? Number(saving.prestamoPendiente)
      : 0;

    if (!Number.isFinite(monto) || monto <= 0) {
      notifyError("Ingresa un monto válido para el abono.");
      return;
    }

    if (monto > prestamoPendiente) {
      notifyError("El abono excede el préstamo pendiente.");
      return;
    }

    try {
      await savingRepository.depositar(savingId, monto, nota, {
        subtipo: "reintegro-prestamo",
      });
      window.closeLoanRepayModal();
      await renderSavings();
    } catch (error) {
      notifyError("No se pudo registrar el abono: " + error.message);
    }
  };

  window.editSavingMovementNote = async (savingId, movimientoIndex) => {
    const saving = currentSavings.find((s) => s.id === savingId);
    if (!saving || movimientoIndex < 0 || movimientoIndex >= saving.depositos.length) {
      notifyError("No se encontró el movimiento seleccionado.");
      return;
    }

    const movimiento = saving.depositos[movimientoIndex];
    const nuevaNota = window.prompt(
      "Describe este movimiento (opcional):",
      movimiento?.nota || ""
    );
    if (nuevaNota === null) {
      return;
    }

    try {
      await savingRepository.actualizarNotaMovimiento(
        savingId,
        movimientoIndex,
        nuevaNota
      );
      notifySuccess("Nota actualizada");
      await renderSavings();
    } catch (error) {
      notifyError("No se pudo actualizar la nota: " + error.message);
    }
  };

  window.generateRandomSaving = () => {
    try {
      if (currentSavings.length === 0) {
        notifyInfo("Primero debes crear un fondo de ahorro");
        return;
      }

      pendingRandomSaving = savingRepository.generarAhorroAleatorio();
      const modal = document.getElementById("random-saving-modal");
      const amountEl = document.getElementById("random-saving-amount");
      const select = document.getElementById("random-saving-select");
      if (!modal || !amountEl || !select) {
        throw new Error("No se pudo abrir el modal de ahorro aleatorio");
      }

      amountEl.textContent = formatCurrency(pendingRandomSaving);
      select.innerHTML = currentSavings
        .map(
          (saving) =>
            `<option value="${saving.id}">${saving.nombre}</option>`
        )
        .join("");
      select.value = currentSavings[0]?.id
        ? String(currentSavings[0].id)
        : "";
      select.disabled = currentSavings.length === 1;
      modal.style.display = "flex";
    } catch (error) {
      console.error("Error al preparar ahorro aleatorio:", error);
      notifyError("No se pudo preparar el ahorro aleatorio: " + error.message);
    }
  };

  window.closeRandomSavingModal = () => {
    const modal = document.getElementById("random-saving-modal");
    if (modal) {
      modal.style.display = "none";
    }
    pendingRandomSaving = null;
  };

  window.confirmRandomSaving = async () => {
    if (!pendingRandomSaving || pendingRandomSaving <= 0) {
      notifyError("Primero genera un monto aleatorio.");
      return;
    }

    const select = document.getElementById("random-saving-select");
    const savingId = select?.value ? parseInt(select.value, 10) : null;
    const selectedSaving =
      currentSavings.find((saving) => saving.id === savingId) ||
      currentSavings[0];
    if (!selectedSaving) {
      notifyError("Selecciona un fondo válido para continuar.");
      return;
    }

    try {
      await savingRepository.depositar(
        selectedSaving.id,
        pendingRandomSaving,
        "Ahorro aleatorio 🎲"
      );
      notifySuccess(
        `${formatCurrency(pendingRandomSaving)} agregados a "${selectedSaving.nombre}"`
      );
      pendingRandomSaving = null;
      window.closeRandomSavingModal();
      await renderSavings();
    } catch (error) {
      console.error("Error al guardar ahorro aleatorio:", error);
      notifyError("No se pudo guardar el ahorro aleatorio: " + error.message);
    }
  };

  // Cerrar modales al hacer click fuera
  document.getElementById("saving-modal")?.addEventListener("click", (e) => {
    if (e.target.id === "saving-modal") {
      window.closeSavingModal();
    }
  });

  document.getElementById("deposit-modal")?.addEventListener("click", (e) => {
    if (e.target.id === "deposit-modal") {
      window.closeDepositModal();
    }
  });

  document.getElementById("withdraw-modal")?.addEventListener("click", (e) => {
    if (e.target.id === "withdraw-modal") {
      window.closeWithdrawModal();
    }
  });

  document.getElementById("random-saving-modal")?.addEventListener("click", (e) => {
    if (e.target.id === "random-saving-modal") {
      window.closeRandomSavingModal();
    }
  });
}
