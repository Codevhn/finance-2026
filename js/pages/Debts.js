/**
 * Debts Page - Deudas
 * CRUD completo con sistema de pagos parciales y auto-archivo
 */

import debtRepository from "../storage/DebtRepository.js";
import debtorRepository from "../storage/DebtorRepository.js";
import savingRepository from "../storage/SavingRepository.js";
import { Debt } from "../domain/Debt.js";
import { Debtor } from "../domain/Debtor.js";
import { Saving } from "../domain/Saving.js";
import {
  exportDebtPaymentsPDF,
  exportPaymentsReportPDF,
} from "../utils/pdf.js";
import {
  notifyError,
  notifyInfo,
  notifySuccess,
  confirmDialog,
} from "../ui/notifications.js";
import { formatCurrency } from "../utils/formatters.js";

const DEBT_TYPES = {
  ME_OWED: "me-deben",
  I_OWE: "yo-debo",
};

const DEFAULT_SAVINGS_NAME = "Ahorros";
const DUE_SOON_THRESHOLD_DAYS = 5;
const ALERT_ICONS = {
  success: "✅",
  info: "ℹ️",
  warning: "⚠️",
  danger: "❌",
};

let currentDebts = [];
let currentDebtors = [];
let debtAlerts = [];

export async function renderDebts() {
  const mainContent = document.getElementById("main-content");

  try {
    // Cargar datos
    await loadDebtData();

    mainContent.innerHTML = `
      <div class="page-container">
        <div class="page-header">
          <div>
            <h1 class="page-title">💳 Deudas</h1>
            <p class="page-subtitle">Gestiona tus deudas y pagos</p>
          </div>
          <div style="display: flex; gap: var(--spacing-sm);">
            <button class="btn btn--secondary" onclick="window.openDebtorModal()">
              <span>👥</span>
              <span>Contactos</span>
            </button>
            <button class="btn btn--primary" onclick="window.openDebtModal()">
              <span>➕</span>
              <span>Nueva Deuda</span>
            </button>
          </div>
        </div>

        ${renderExportToolbar()}

        <div id="debt-alerts">
          ${renderDebtAlerts()}
        </div>

        <div id="debts-content">
          ${renderDebtsContent()}
        </div>
      </div>

      <!-- Modal para crear/editar deuda -->
      <div id="debt-modal" class="modal-overlay" style="display: none;">
        <div class="modal">
          <div class="modal__header">
            <h3 class="modal__title" id="debt-modal-title">Nueva Deuda</h3>
            <button class="modal__close" onclick="window.closeDebtModal()">✕</button>
          </div>
          <div class="modal__body">
            <form id="debt-form">
              <input type="hidden" id="debt-id">
              
              <div class="form-group">
                <label class="form-label form-label--required" for="debt-name">Nombre de la Deuda</label>
                <input type="text" id="debt-name" class="form-input" placeholder="Ej: Préstamo Personal" required>
              </div>

              <div class="form-group">
                <label class="form-label form-label--required">Tipo de cuenta</label>
                <div style="display:flex; gap: var(--spacing-lg); flex-wrap: wrap;">
                  <label style="display:flex; align-items:center; gap: var(--spacing-xs); font-weight: var(--font-weight-medium); cursor:pointer;">
                    <input type="radio" name="debt-type" value="${DEBT_TYPES.ME_OWED}" checked>
                    <span>Cuenta por cobrar</span>
                  </label>
                  <label style="display:flex; align-items:center; gap: var(--spacing-xs); font-weight: var(--font-weight-medium); cursor:pointer;">
                    <input type="radio" name="debt-type" value="${DEBT_TYPES.I_OWE}">
                    <span>Cuenta por pagar</span>
                  </label>
                </div>
              </div>

              <div class="form-group">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <label class="form-label" id="debt-person-label" for="debt-person">Contraparte de la cuenta por cobrar</label>
                  <button type="button" class="btn btn--ghost btn--sm" onclick="window.openDebtorModal()">
                    <span>➕</span>
                    <span>Nueva Persona</span>
                  </button>
                </div>
                <select id="debt-person" class="form-input">
                  <option value="">Sin asignar</option>
                  ${renderDebtorOptions()}
                </select>
              </div>

              <div class="form-group" id="debt-start-date-group">
                <label class="form-label" id="debt-date-label" for="debt-start-date">Fecha en que registraste la cuenta por cobrar</label>
                <input type="date" id="debt-start-date" class="form-input">
                <small id="debt-date-helper" style="display:block; font-size: var(--font-size-xs); color: var(--color-text-tertiary);">
                  Usamos la fecha como referencia para el seguimiento del cobro.
                </small>
              </div>

              <div class="form-group">
                <label class="form-label" id="debt-due-label" for="debt-due-date">Fecha estimada para cobrar la cuenta (opcional)</label>
                <input type="date" id="debt-due-date" class="form-input">
                <small id="debt-due-helper" style="display:block; font-size: var(--font-size-xs); color: var(--color-text-tertiary);">
                  Te recordaremos cuando falte poco para cobrar.
                </small>
              </div>

              <div class="form-group">
                <label class="form-label form-label--required" for="debt-amount">Monto Total Adeudado (Lps)</label>
                <input type="number" id="debt-amount" class="form-input" placeholder="0.00" step="0.01" min="0.01" required>
              </div>
            </form>
          </div>
          <div class="modal__footer">
            <button class="btn btn--secondary" onclick="window.closeDebtModal()">Cancelar</button>
            <button class="btn btn--primary" onclick="window.saveDebt()">Guardar</button>
          </div>
        </div>
      </div>

      <!-- Modal para agregar pago -->
      <div id="payment-modal" class="modal-overlay" style="display: none;">
        <div class="modal">
          <div class="modal__header">
            <h3 class="modal__title">Agregar Pago</h3>
            <button class="modal__close" onclick="window.closePaymentModal()">✕</button>
          </div>
          <div class="modal__body">
            <form id="payment-form">
              <input type="hidden" id="payment-debt-id">
              
              <div class="form-group">
                <label class="form-label">Deuda</label>
                <div id="payment-debt-name" style="font-weight: 600; color: var(--color-text-primary);"></div>
              </div>

              <div class="form-group">
                <label class="form-label form-label--required" for="payment-amount">Monto del Pago (Lps)</label>
                <input type="number" id="payment-amount" class="form-input" placeholder="0.00" step="0.01" min="0.01" required>
              </div>

              <div class="form-group">
                <label class="form-label" for="payment-note">Nota (opcional)</label>
                <input type="text" id="payment-note" class="form-input" placeholder="Ej: Pago mensual">
              </div>

              <div class="form-group">
                <label class="form-label">Saldo Actual</label>
                <div id="payment-balance"></div>
              </div>
            </form>
          </div>
          <div class="modal__footer">
            <button class="btn btn--secondary" onclick="window.closePaymentModal()">Cancelar</button>
            <button class="btn btn--success" onclick="window.savePayment()">Agregar Pago</button>
          </div>
        </div>
      </div>

      <!-- Modal para gestionar contactos -->
      <div id="debtor-modal" class="modal-overlay" style="display: none;">
        <div class="modal modal--large">
          <div class="modal__header">
            <h3 class="modal__title">Contactos: personas y empresas</h3>
            <button class="modal__close" onclick="window.closeDebtorModal()">✕</button>
          </div>
          <div class="modal__body">
            <form id="debtor-form">
              <input type="hidden" id="debtor-id">
              <div class="form-group">
                <label class="form-label form-label--required" for="debtor-name">Nombre completo</label>
                <input type="text" id="debtor-name" class="form-input" placeholder="Ej: Juan Pérez" required>
              </div>
              <div class="form-group">
                <label class="form-label form-label--required">Tipo de contacto</label>
                <div style="display:flex; gap: var(--spacing-md); flex-wrap: wrap;">
                  <label style="display:flex; align-items:center; gap: var(--spacing-xs); font-weight: var(--font-weight-medium); cursor: pointer;">
                    <input type="radio" name="debtor-type" value="persona" checked>
                    <span>Persona</span>
                  </label>
                  <label style="display:flex; align-items:center; gap: var(--spacing-xs); font-weight: var(--font-weight-medium); cursor: pointer;">
                    <input type="radio" name="debtor-type" value="empresa">
                    <span>Empresa / Servicio</span>
                  </label>
                </div>
                <small class="form-hint">Usa <strong>Empresa</strong> para registrar suscripciones como ChatGPT, Notion, etc.</small>
              </div>
              <div id="debtor-company-fields" style="display:none;">
                <div class="form-group">
                  <label class="form-label form-label--required" for="debtor-service">Servicio o descripción</label>
                  <input type="text" id="debtor-service" class="form-input" placeholder="Ej: Suscripción ChatGPT Plus">
                </div>
                <div class="form-group">
                  <label class="form-label" for="debtor-monthly">Monto mensual estimado</label>
                  <input type="number" id="debtor-monthly" class="form-input" placeholder="0.00" step="0.01" min="0">
                  <small class="form-hint">Solo informativo: te ayuda a identificar cuánto pagas por este servicio.</small>
                </div>
              </div>
              <div class="form-grid" style="display:grid; gap: var(--spacing-md); grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));">
                <div class="form-group">
                  <label class="form-label" for="debtor-phone">Teléfono</label>
                  <input type="text" id="debtor-phone" class="form-input" placeholder="+504 9999-9999">
                </div>
                <div class="form-group">
                  <label class="form-label" for="debtor-email">Correo</label>
                  <input type="email" id="debtor-email" class="form-input" placeholder="correo@ejemplo.com">
                </div>
              </div>
              <div class="form-group">
                <label class="form-label" for="debtor-notes">Notas</label>
                <textarea id="debtor-notes" class="form-textarea" rows="2" placeholder="Información adicional"></textarea>
              </div>
            </form>
            <div id="debtor-list" style="margin-top: var(--spacing-md);">
              ${renderDebtorList()}
            </div>
          </div>
          <div class="modal__footer" style="display: flex; justify-content: space-between;">
            <button class="btn btn--secondary" onclick="window.closeDebtorModal()">Cerrar</button>
            <div style="display:flex; gap: var(--spacing-sm);">
              <button class="btn btn--ghost" onclick="window.resetDebtorForm()">Limpiar</button>
              <button class="btn btn--primary" onclick="window.saveDebtor()">Guardar contacto</button>
            </div>
          </div>
        </div>
      </div>
    `;

    attachEventListeners();
  } catch (error) {
    console.error("Error al cargar deudas:", error);
    mainContent.innerHTML = `
      <div class="page-container">
        <div class="empty-state">
          <div class="empty-state__icon">⚠️</div>
          <h2 class="empty-state__title">Error al cargar deudas</h2>
          <p class="empty-state__description">${error.message}</p>
        </div>
      </div>
    `;
  }
}

async function loadDebtData() {
  [currentDebts, currentDebtors] = await Promise.all([
    debtRepository.getAll(),
    debtorRepository.getAll(),
  ]);
}

function renderDebtAlerts() {
  const combinedAlerts = [...getDueDateAlerts(), ...debtAlerts];
  if (combinedAlerts.length === 0) {
    return "";
  }

  return `
    <div class="inline-alert-stack">
      ${combinedAlerts
        .map(
          (alert) => `
        <div class="inline-alert inline-alert--${alert.type}">
          <div class="inline-alert__icon">${ALERT_ICONS[alert.type] || "ℹ️"}</div>
          <div class="inline-alert__content">
            ${alert.title ? `<div class="inline-alert__title">${alert.title}</div>` : ""}
            <div class="inline-alert__message">${alert.message}</div>
          </div>
          ${
            alert.dismissible === false
              ? ""
              : `<button class="inline-alert__close" aria-label="Cerrar alerta" onclick="window.dismissDebtAlert('${alert.id}')">✕</button>`
          }
        </div>
      `
        )
        .join("")}
    </div>
  `;
}

function addDebtAlert({
  title = "",
  message = "",
  type = "info",
  dismissible = true,
}) {
  const alertTypes = ["success", "info", "warning", "danger"];
  const normalizedType = alertTypes.includes(type) ? type : "info";
  const newAlert = {
    id: `alert-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title,
    message,
    type: normalizedType,
    dismissible,
  };

  debtAlerts = [newAlert, ...debtAlerts].slice(0, 3);
  updateDebtAlertsContainer();
}

function dismissDebtAlert(alertId) {
  debtAlerts = debtAlerts.filter((alert) => alert.id !== alertId);
  updateDebtAlertsContainer();
}

function updateDebtAlertsContainer() {
  const container = document.getElementById("debt-alerts");
  if (container) {
    container.innerHTML = renderDebtAlerts();
  }
}

function getDueDateAlerts() {
  if (!currentDebts || currentDebts.length === 0) {
    return [];
  }

  return currentDebts
    .filter((debt) => !debt.archivada)
    .map((debt) => {
      const dueStatus = getDebtDueStatus(debt);
      if (
        !dueStatus ||
        (dueStatus.severity !== "overdue" &&
          dueStatus.severity !== "today" &&
          dueStatus.severity !== "soon")
      ) {
        return null;
      }

      const title =
        dueStatus.severity === "overdue"
          ? "Pago vencido"
          : dueStatus.severity === "today"
          ? "Pago vence hoy"
          : "Pago próximo";

      return {
        id: `due-${debt.id}`,
        title,
        message: `La deuda "${debt.nombre}" ${dueStatus.label}. Fecha límite: ${dueStatus.formattedDate}.`,
        type: dueStatus.type,
        dismissible: false,
      };
    })
    .filter(Boolean)
    .slice(0, 5);
}

function getDebtDueStatus(debt) {
  if (!debt || !debt.fechaLimite) {
    return null;
  }

  const dueDate = new Date(debt.fechaLimite);
  if (Number.isNaN(dueDate.getTime())) {
    return null;
  }

  const diasRestantes =
    typeof debt.getDiasParaVencimiento === "function"
      ? debt.getDiasParaVencimiento()
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
  } else if (diasRestantes <= DUE_SOON_THRESHOLD_DAYS) {
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

async function ensureDefaultSavingsFund() {
  const allSavings = await savingRepository.getAll();
  let defaultFund = allSavings.find(
    (saving) =>
      saving.nombre &&
      saving.nombre.trim().toLowerCase() ===
        DEFAULT_SAVINGS_NAME.toLowerCase()
  );

  if (!defaultFund) {
    const newSaving = new Saving({
      nombre: DEFAULT_SAVINGS_NAME,
      objetivoOpcional: null,
    });
    const createdId = await savingRepository.create(newSaving);
    defaultFund = await savingRepository.getById(createdId);

    addDebtAlert({
      type: "info",
      title: "Fondo creado",
      message: `Se creó el fondo "${DEFAULT_SAVINGS_NAME}" para recibir excedentes.`,
    });
  }

  return defaultFund;
}

async function transferExcedenteToSavings(excedente, debtName = "") {
  if (!excedente || excedente <= 0) {
    return null;
  }

  const savingsFund = await ensureDefaultSavingsFund();
  const note = debtName
    ? `Excedente de pago de "${debtName}"`
    : "Excedente de pago";
  await savingRepository.depositar(savingsFund.id, excedente, note);

  return savingsFund;
}

function renderDebtsContent() {
  if (currentDebts.length === 0) {
    return `
      <div class="empty-state">
        <div class="empty-state__icon">💳</div>
        <h2 class="empty-state__title">No tienes deudas registradas</h2>
        <p class="empty-state__description">Registra tus deudas para llevar un control de tus pagos</p>
        <button class="btn btn--primary" onclick="window.openDebtModal()">
          <span>➕</span>
          <span>Registrar Primera Deuda</span>
        </button>
      </div>
    `;
  }

  const groups = [
    {
      title: "Cuentas por cobrar",
      description:
        "Saldo pendiente que debes cobrar a clientes, familiares o contactos.",
      actives: currentDebts.filter(
        (d) => !d.archivada && d.tipo === DEBT_TYPES.ME_OWED
      ),
      archived: currentDebts.filter(
        (d) => d.archivada && d.tipo === DEBT_TYPES.ME_OWED
      ),
    },
    {
      title: "Cuentas por pagar",
      description:
        "Compromisos financieros donde tú eres el deudor y debes programar pagos.",
      actives: currentDebts.filter(
        (d) => !d.archivada && d.tipo === DEBT_TYPES.I_OWE
      ),
      archived: currentDebts.filter(
        (d) => d.archivada && d.tipo === DEBT_TYPES.I_OWE
      ),
    },
  ];

  return groups.map((group) => renderDebtGroup(group)).join("");
}

function renderDebtGroup({ title, description, actives, archived }) {
  const total = actives.length + archived.length;
  const shouldOpen = total > 0;
  let content = "";

  if (total === 0) {
    content = `
      <div class="empty-state" style="box-shadow:none; border:1px dashed var(--color-border);">
        <div class="empty-state__icon">📭</div>
        <p class="empty-state__description">Sin registros en esta categoría</p>
      </div>
    `;
  } else {
    content = `
      ${
        actives.length > 0
          ? `
        <div style="margin-bottom: var(--spacing-md); font-weight: var(--font-weight-semibold); color: var(--color-text-secondary);">
          Cuentas activas (${actives.length})
        </div>
        <div class="content-grid content-grid--2-cols">
          ${actives.map((debt) => renderDebtCard(debt)).join("")}
        </div>
      `
          : ""
      }
      ${
        archived.length > 0
          ? `
        <div style="margin: var(--spacing-lg) 0 var(--spacing-md); font-weight: var(--font-weight-semibold); color: var(--color-text-secondary);">
          Cuentas liquidadas (${archived.length})
        </div>
        <div class="content-grid content-grid--2-cols">
          ${archived.map((debt) => renderDebtCard(debt)).join("")}
        </div>
      `
          : ""
      }
    `;
  }

  return `
    <details class="collapsible-card" ${shouldOpen ? "open" : ""}>
      <summary>
        <div class="collapsible-card__summary">
          <div>
            <h3 class="collapsible-card__title">${title} (${total})</h3>
            <p class="collapsible-card__description">${description}</p>
          </div>
          <div class="collapsible-card__meta">
            <span>${actives.length} activas</span>
            <span>${archived.length} liquidadas</span>
          </div>
        </div>
      </summary>
      <div class="collapsible-card__content">
        ${content}
      </div>
    </details>
  `;
}

function renderDebtorOptions() {
  if (currentDebtors.length === 0) {
    return `<option value="" disabled>No hay contactos registrados aún</option>`;
  }

  return currentDebtors
    .map(
      (debtor) => `
      <option value="${debtor.id}">
        ${debtor.tipo === "empresa" ? "🏢" : "👤"} ${debtor.nombre}${
         debtor.tipo === "empresa"
           ? debtor.servicio
             ? ` · ${debtor.servicio}`
             : ""
           : debtor.telefono
           ? ` - ${debtor.telefono}`
           : ""
       }
      </option>
    `
    )
    .join("");
}

function renderDebtorList() {
  if (currentDebtors.length === 0) {
    return `
      <div class="empty-state" style="box-shadow:none; border:1px dashed var(--color-border);">
        <div class="empty-state__icon">👥</div>
        <h3 class="empty-state__title">Sin contactos registrados</h3>
        <p class="empty-state__description">Agrega una persona o empresa para vincularla a tus cuentas.</p>
      </div>
    `;
  }

  return `
    <div style="max-height: 260px; overflow-y: auto; border:1px solid var(--color-border); border-radius: var(--border-radius-md);">
      ${currentDebtors
        .map(
          (person) => `
        <div style="display:flex; justify-content:space-between; align-items:center; padding: var(--spacing-sm); border-bottom:1px solid var(--color-border);">
          <div>
            <div style="display:flex; align-items:center; gap: var(--spacing-xs); font-weight: var(--font-weight-semibold);">
              <span>${person.tipo === "empresa" ? "🏢" : "👤"}</span>
              <span>${person.nombre}</span>
              <span class="badge ${
                person.tipo === "empresa" ? "badge--warning" : "badge--info"
              }">${person.tipo === "empresa" ? "Empresa" : "Persona"}</span>
            </div>
            <div style="font-size: var(--font-size-xs); color: var(--color-text-secondary);">
              ${[person.telefono, person.email].filter(Boolean).join(" · ") || "Sin contacto"}
            </div>
            ${
              person.tipo === "empresa" && (person.servicio || person.montoMensual)
                ? `<div style="font-size: var(--font-size-xs); color: var(--color-text-secondary);">
                    Servicio: ${person.servicio || "Recurrente"}
                    ${
                      person.montoMensual
                        ? `· ${formatCurrency(person.montoMensual)} / mes`
                        : ""
                    }
                  </div>`
                : ""
            }
            ${
              person.notas
                ? `<div style="font-size: var(--font-size-xs); color: var(--color-text-tertiary);">${person.notas}</div>`
                : ""
            }
          </div>
          <div style="display:flex; gap: var(--spacing-xxs);">
            <button class="btn btn--secondary btn--sm" onclick="window.editDebtor(${person.id})">Editar</button>
            <button class="btn btn--danger btn--sm" onclick="window.deleteDebtor(${person.id})">Eliminar</button>
          </div>
        </div>
      `
        )
        .join("")}
    </div>
  `;
}

function renderExportToolbar() {
  const pagosRegistrados = currentDebts.some((debt) => debt.pagos.length > 0);
  const personaOptions = currentDebtors
    .map(
      (debtor) =>
        `<option value="${debtor.id}">${
          debtor.tipo === "empresa" ? "🏢" : "👤"
        } ${debtor.nombre}</option>`
    )
    .join("");

  return `
    <div class="card" style="margin-bottom: var(--spacing-xl);">
      <div class="card__body" style="display:flex; flex-wrap:wrap; gap: var(--spacing-md); align-items:flex-end;">
        <div>
          <div style="font-weight: var(--font-weight-semibold); font-size: var(--font-size-base);">Exportar pagos en PDF</div>
          <p style="font-size: var(--font-size-sm); color: var(--color-text-secondary); margin-top: var(--spacing-xxs);">
            Descarga un reporte con todos los pagos registrados por contacto o para todas tus deudas.
          </p>
        </div>
        <div style="min-width: 220px;">
          <label class="form-label" for="export-person-filter">Filtrar por contacto</label>
          <select id="export-person-filter" class="form-input">
            <option value="">Todos los contactos</option>
            ${personaOptions}
          </select>
        </div>
        <div style="min-width: 220px;">
          <label class="form-label" for="export-type-filter">Tipo de cuenta</label>
          <select id="export-type-filter" class="form-input">
            <option value="">Todos los tipos</option>
            <option value="${DEBT_TYPES.ME_OWED}">Cuentas por cobrar</option>
            <option value="${DEBT_TYPES.I_OWE}">Cuentas por pagar</option>
          </select>
        </div>
        <button class="btn btn--primary" onclick="window.exportPaymentsReport()" ${
          pagosRegistrados ? "" : "disabled"
        }>
          🧾 Exportar Pagos
        </button>
      </div>
    </div>
  `;
}

function renderDebtCard(debt) {
  const progress = debt.calcularProgreso();
  const totalPagado = debt.getTotalPagado();
  const saldoRestante = debt.calcularSaldo();
  const isArchived = debt.archivada;
  const tipoLabel =
    debt.tipo === DEBT_TYPES.I_OWE
      ? "Cuenta por pagar"
      : "Cuenta por cobrar";
  const dueStatus = getDebtDueStatus(debt);
  const dueDateDisplay = debt.fechaLimite
    ? new Date(debt.fechaLimite).toLocaleDateString("es-HN")
    : null;
  const diasTranscurridos =
    debt.tipo === DEBT_TYPES.ME_OWED &&
    typeof debt.getDiasTranscurridos === "function"
      ? debt.getDiasTranscurridos()
      : null;

  return `
    <div class="card">
      <div class="card__header">
        <div>
          <div style="display:flex; gap: var(--spacing-xs); align-items:center; flex-wrap:wrap;">
            <h3 class="card__title">${debt.nombre}</h3>
            <span class="badge ${
              debt.tipo === DEBT_TYPES.I_OWE ? "badge--warning" : "badge--info"
            }">${tipoLabel}</span>
            ${
              isArchived
                ? '<div class="badge badge--success">✅ Pagada</div>'
                : ""
            }
            ${
              !isArchived &&
              dueStatus &&
              dueStatus.severity !== "future"
                ? `<span class="badge ${
                    dueStatus.type === "danger"
                      ? "badge--danger"
                      : "badge--warning"
                  }">${
                    dueStatus.severity === "overdue"
                      ? "Pago vencido"
                      : dueStatus.severity === "today"
                      ? "Vence hoy"
                      : "Próximo pago"
                  }</span>`
                : ""
            }
          </div>
          ${
            debt.personaNombre
              ? `
            <div style="font-size: var(--font-size-sm); color: var(--color-text-secondary); display:flex; flex-direction:column; gap:2px;">
              <span>
                ${debt.personaTipo === "empresa" ? "🏢" : "👤"} ${debt.personaNombre}
                ${
                  debt.personaTipo === "empresa" && debt.personaServicio
                    ? `· <span style="color: var(--color-text-tertiary);">${debt.personaServicio}</span>`
                    : ""
                }
              </span>
              ${
                debt.personaContacto
                  ? `<span style="color: var(--color-text-tertiary);">${debt.personaContacto}</span>`
                  : ""
              }
              ${
                debt.personaTipo === "empresa" && debt.personaMontoMensual
                  ? `<span style="color: var(--color-text-tertiary);">${formatCurrency(
                      debt.personaMontoMensual
                    )} / mes aproximado</span>`
                  : ""
              }
            </div>`
              : `<div class="badge badge--secondary" style="margin-top: var(--spacing-xxs);">Sin contacto asignado</div>`
          }
        </div>
        <div style="display: flex; gap: var(--spacing-xs);">
          ${
            !isArchived
              ? `
            <button class="btn btn--success btn--sm" onclick="window.openPaymentModal(${debt.id})" title="Agregar pago">
              💰
            </button>
          `
              : ""
          }
          <button class="btn btn--secondary btn--sm" onclick="window.exportDebtPdf(${debt.id})" title="Exportar pagos en PDF">
            🧾
          </button>
          <button class="btn btn--secondary btn--sm" onclick="window.editDebt(${debt.id})" title="Editar">
            ✏️
          </button>
          <button class="btn btn--danger btn--sm" onclick="window.deleteDebt(${debt.id})" title="Eliminar">
            🗑️
          </button>
        </div>
      </div>

      <div class="card__body">
        <div style="margin-bottom: var(--spacing-md);">
          <div style="display: flex; justify-content: space-between; margin-bottom: var(--spacing-xs);">
            <span style="font-size: var(--font-size-sm); color: var(--color-text-secondary);">Progreso de Pago</span>
            <span style="font-size: var(--font-size-sm); font-weight: var(--font-weight-semibold);">
              ${progress.toFixed(1)}%
            </span>
          </div>
          <div class="progress">
            <div class="progress__bar ${
              progress >= 100
                ? "progress__bar--success"
                : "progress__bar--danger"
            }" 
                 style="width: ${Math.min(progress, 100)}%"></div>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-md); margin-bottom: var(--spacing-md);">
          <div>
            <div style="font-size: var(--font-size-xs); color: var(--color-text-tertiary);">Total Adeudado</div>
            <div style="font-size: var(--font-size-lg); font-weight: var(--font-weight-semibold); color: var(--color-danger);">
              ${formatCurrency(debt.totalAdeudado)}
            </div>
          </div>
          <div>
            <div style="font-size: var(--font-size-xs); color: var(--color-text-tertiary);">Pagado</div>
            <div style="font-size: var(--font-size-lg); font-weight: var(--font-weight-semibold); color: var(--color-success);">
              ${formatCurrency(totalPagado)}
            </div>
          </div>
        </div>

        ${
          !isArchived
            ? `
          <div style="padding: var(--spacing-sm); background: rgba(239, 68, 68, 0.1); border-radius: var(--border-radius-md); border-left: 3px solid var(--color-danger);">
            <div style="font-size: var(--font-size-xs); color: var(--color-text-tertiary); margin-bottom: var(--spacing-xs);">
              Saldo Restante
            </div>
            <div style="font-size: var(--font-size-base); font-weight: var(--font-weight-semibold); color: var(--color-danger);">
              ${formatCurrency(saldoRestante)}
            </div>
          </div>
          ${
            diasTranscurridos !== null
              ? `<div style="margin-top: var(--spacing-sm); font-size: var(--font-size-sm); color: var(--color-text-secondary);">
                  ⏱️ Han pasado ${diasTranscurridos} día${diasTranscurridos === 1 ? "" : "s"} desde el registro de esta deuda.
                </div>`
              : ""
          }
        `
            : `
          <div style="padding: var(--spacing-sm); background: rgba(16, 185, 129, 0.1); border-radius: var(--border-radius-md); border-left: 3px solid var(--color-success);">
            <div style="font-size: var(--font-size-sm); color: var(--color-success);">
              🎉 ¡Deuda pagada completamente el ${new Date(
                debt.fechaArchivado
              ).toLocaleDateString("es-HN")}!
            </div>
          </div>
        `
        }

        ${
          !isArchived && dueDateDisplay
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
          debt.pagos.length > 0
            ? `
          <details style="margin-top: var(--spacing-md);">
            <summary style="cursor: pointer; font-size: var(--font-size-sm); color: var(--color-text-secondary);">
              Ver pagos (${debt.pagos.length})
            </summary>
            <div style="margin-top: var(--spacing-sm); max-height: 200px; overflow-y: auto;">
              ${debt.pagos
                .map((pago, originalIndex) => ({ pago, originalIndex }))
                .reverse()
                .map(
                  ({ pago, originalIndex }) => `
                <div style="display: flex; justify-content: space-between; align-items: start; gap: var(--spacing-sm); padding: var(--spacing-xs) 0; border-bottom: 1px solid var(--color-border);">
                  <div style="flex:1;">
                    <div style="font-size: var(--font-size-xs); color: var(--color-text-tertiary);">
                      ${new Date(pago.fecha).toLocaleDateString("es-HN")}
                    </div>
                    <div style="font-size: var(--font-size-xs); margin-top: var(--spacing-xxs); color: ${
                      pago.nota
                        ? "var(--color-text-secondary)"
                        : "var(--color-text-tertiary)"
                    };">
                      ${pago.nota ? pago.nota : "Sin nota registrada"}
                    </div>
                    <button type="button" class="btn btn--ghost btn--sm" style="padding: var(--spacing-xxs) var(--spacing-xs); margin-top: var(--spacing-xxs); font-size: var(--font-size-xs);" onclick="window.editDebtPaymentNote(${
                      debt.id
                    }, ${originalIndex})">
                      📝 ${pago.nota ? "Editar nota" : "Agregar nota"}
                    </button>
                  </div>
                  <span style="font-size: var(--font-size-sm); font-weight: var(--font-weight-medium); color: var(--color-success); white-space: nowrap;">
                    -${formatCurrency(pago.monto)}
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
  window.openDebtModal = (debtId = null) => {
    const modal = document.getElementById("debt-modal");
    const form = document.getElementById("debt-form");
    const title = document.getElementById("debt-modal-title");
    const dateInput = document.getElementById("debt-start-date");
    const dueDateInput = document.getElementById("debt-due-date");
    const typeInputs = document.querySelectorAll('input[name="debt-type"]');

    form.reset();
    refreshDebtorSelect();

    let selectedType = DEBT_TYPES.ME_OWED;
    let selectedDateValue = formatDateForInput(new Date().toISOString());
    let selectedDueDateValue = "";

    if (debtId) {
      const debt = currentDebts.find((d) => d.id === debtId);
      if (debt) {
        title.textContent = "Editar Deuda";
        document.getElementById("debt-id").value = debt.id;
        document.getElementById("debt-name").value = debt.nombre;
        document.getElementById("debt-amount").value = debt.totalAdeudado;
        if (debt.personaId) {
          document.getElementById("debt-person").value = String(debt.personaId);
        }
        if (debt.tipo) {
          selectedType = debt.tipo;
        }
        if (debt.fechaInicio) {
          selectedDateValue = formatDateForInput(debt.fechaInicio);
        }
        if (debt.fechaLimite) {
          selectedDueDateValue = formatDateForInput(debt.fechaLimite);
        }
      }
    } else {
      title.textContent = "Nueva Deuda";
    }

    typeInputs.forEach((input) => {
      input.checked = input.value === selectedType;
    });
    if (dateInput) {
      dateInput.value = selectedDateValue;
    }
    if (dueDateInput) {
      dueDateInput.value = selectedDueDateValue;
    }
    updateDebtFormLabels(selectedType);

    modal.style.display = "flex";
  };

  window.closeDebtModal = () => {
    document.getElementById("debt-modal").style.display = "none";
  };

  window.saveDebt = async () => {
    const form = document.getElementById("debt-form");
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const debtId = document.getElementById("debt-id").value;
    const nombre = document.getElementById("debt-name").value;
    const personaIdValue = document.getElementById("debt-person").value;
    const personaId = personaIdValue ? parseInt(personaIdValue, 10) : null;
    const personaSeleccionada = personaId
      ? currentDebtors.find((d) => d.id === personaId)
      : null;
    const totalAdeudado = parseFloat(
      document.getElementById("debt-amount").value
    );
    const tipo =
      document.querySelector('input[name="debt-type"]:checked')?.value ||
      DEBT_TYPES.ME_OWED;
    const fechaInicioInput = document.getElementById("debt-start-date").value;
    const fechaLimiteInput = document.getElementById("debt-due-date").value;

    try {
      if (debtId) {
        // Editar
        const debt = currentDebts.find((d) => d.id === parseInt(debtId));
        debt.nombre = nombre;
        debt.totalAdeudado = totalAdeudado;
        debt.tipo = tipo;
        debt.fechaInicio = parseDateInput(fechaInicioInput, debt.fechaInicio);
        debt.fechaLimite = parseOptionalDateInput(
          fechaLimiteInput,
          debt.fechaLimite
        );
        if (personaSeleccionada) {
          debt.asignarPersona(personaSeleccionada);
        } else {
          debt.asignarPersona(null);
        }
        await debtRepository.update(debt);
      } else {
        // Crear
        const debt = new Debt({
          nombre,
          totalAdeudado,
          tipo,
          fechaInicio: parseDateInput(fechaInicioInput),
          fechaLimite: parseOptionalDateInput(fechaLimiteInput),
        });
        if (personaSeleccionada) {
          debt.asignarPersona(personaSeleccionada);
        }
        await debtRepository.create(debt);
      }

      window.closeDebtModal();
      await renderDebts();
    } catch (error) {
      notifyError("Error al guardar la deuda: " + error.message);
    }
  };

  window.editDebt = (debtId) => {
    window.openDebtModal(debtId);
  };

  window.deleteDebt = async (debtId) => {
    const debt = currentDebts.find((d) => d.id === debtId);
    const confirmed = await confirmDialog({
      title: "Eliminar deuda",
      message: `¿Deseas eliminar la deuda "${debt.nombre}"? Esta acción no se puede deshacer.`,
      confirmText: "Eliminar",
      cancelText: "Cancelar",
      type: "danger",
    });
    if (!confirmed) return;

    try {
      await debtRepository.delete(debtId);
      await renderDebts();
    } catch (error) {
      notifyError("Error al eliminar la deuda: " + error.message);
    }
  };

  window.openPaymentModal = (debtId) => {
    const debt = currentDebts.find((d) => d.id === debtId);
    if (!debt) return;

    const modal = document.getElementById("payment-modal");
    const form = document.getElementById("payment-form");

    form.reset();
    document.getElementById("payment-debt-id").value = debt.id;
    document.getElementById("payment-debt-name").textContent = debt.nombre;

    const progress = debt.calcularProgreso();
    const totalPagado = debt.getTotalPagado();
    const saldoRestante = debt.calcularSaldo();
    const dueStatus = getDebtDueStatus(debt);

    document.getElementById("payment-balance").innerHTML = `
      <div style="margin-bottom: var(--spacing-sm);">
        <div style="display: flex; justify-content: space-between; margin-bottom: var(--spacing-xs); font-size: var(--font-size-sm);">
          <span>${formatCurrency(totalPagado)}</span>
          <span>${formatCurrency(debt.totalAdeudado)}</span>
        </div>
        <div class="progress">
          <div class="progress__bar progress__bar--danger" style="width: ${Math.min(
            progress,
            100
          )}%"></div>
        </div>
      </div>
      <div style="font-size: var(--font-size-sm); color: var(--color-text-secondary);">
        Saldo restante: ${formatCurrency(saldoRestante)}
      </div>
      ${
        dueStatus
          ? `<div style="margin-top: var(--spacing-xs); font-size: var(--font-size-sm); color: ${
              dueStatus.type === "danger"
                ? "var(--color-danger)"
                : dueStatus.type === "warning"
                ? "var(--color-warning)"
                : "var(--color-text-secondary)"
            };">
              📅 Fecha límite: ${dueStatus.formattedDate}${
              dueStatus.severity !== "future" ? ` · ${dueStatus.label}` : ""
            }
            </div>`
          : ""
      }
    `;

    modal.style.display = "flex";
  };

  window.closePaymentModal = () => {
    document.getElementById("payment-modal").style.display = "none";
  };

  window.savePayment = async () => {
    const form = document.getElementById("payment-form");
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const debtId = parseInt(document.getElementById("payment-debt-id").value);
    const monto = parseFloat(document.getElementById("payment-amount").value);
    const nota = document.getElementById("payment-note").value;
    const debt = currentDebts.find((d) => d.id === debtId);

    try {
      if (!debt) {
        throw new Error("No se encontró la deuda seleccionada.");
      }

      const resultado = await debtRepository.agregarPago(debtId, monto, nota);

      if (resultado.excedente && resultado.excedente > 0) {
        try {
          const savingsFund = await transferExcedenteToSavings(
            resultado.excedente,
            debt.nombre
          );
          addDebtAlert({
            type: "success",
            title: "Excedente transferido",
            message: `${formatCurrency(
              resultado.excedente
            )} se sumaron al fondo "${savingsFund?.nombre || DEFAULT_SAVINGS_NAME}".`,
          });
        } catch (transferError) {
          addDebtAlert({
            type: "danger",
            title: "Excedente pendiente",
            message:
              transferError?.message ||
              "No se pudo transferir el excedente a ahorros.",
          });
        }
      }

      if (resultado.completada) {
        notifySuccess("🎉 ¡Felicidades! Has pagado completamente esta deuda.");
      }

      window.closePaymentModal();
      await renderDebts();
    } catch (error) {
      notifyError("Error al agregar pago: " + error.message);
    }
  };

  window.editDebtPaymentNote = async (debtId, pagoIndex) => {
    const debt = currentDebts.find((d) => d.id === debtId);
    if (!debt || pagoIndex < 0 || pagoIndex >= debt.pagos.length) {
      notifyError("No se encontró el pago seleccionado.");
      return;
    }

    const pago = debt.pagos[pagoIndex];
    const nuevaNota = window.prompt(
      "Describe este pago (opcional):",
      pago?.nota || ""
    );
    if (nuevaNota === null) {
      return;
    }

    try {
      await debtRepository.actualizarNotaPago(debtId, pagoIndex, nuevaNota);
      notifySuccess("Nota actualizada");
      await renderDebts();
    } catch (error) {
      notifyError("No se pudo actualizar la nota: " + error.message);
    }
  };

  // Cerrar modales al hacer click fuera
  document.getElementById("debt-modal")?.addEventListener("click", (e) => {
    if (e.target.id === "debt-modal") {
      window.closeDebtModal();
    }
  });

  document.getElementById("payment-modal")?.addEventListener("click", (e) => {
    if (e.target.id === "payment-modal") {
      window.closePaymentModal();
    }
  });

  window.dismissDebtAlert = (alertId) => {
    dismissDebtAlert(alertId);
  };

  window.exportDebtPdf = (debtId) => {
    const debt = currentDebts.find((d) => d.id === debtId);
    if (!debt) return;

    try {
      exportDebtPaymentsPDF(debt);
    } catch (error) {
      notifyError("No se pudo generar el PDF: " + error.message);
    }
  };

  window.openDebtorModal = () => {
    const modal = document.getElementById("debtor-modal");
    if (!modal) return;
    refreshDebtorUI();
    updateDebtorTypeUI();
    modal.style.display = "flex";
  };

  window.closeDebtorModal = () => {
    document.getElementById("debtor-modal").style.display = "none";
  };

  window.resetDebtorForm = () => {
    document.getElementById("debtor-form").reset();
    document.getElementById("debtor-id").value = "";
    const typeInputs = document.querySelectorAll('input[name="debtor-type"]');
    typeInputs.forEach((input) => {
      input.checked = input.value === "persona";
    });
    updateDebtorTypeUI("persona");
  };

  window.saveDebtor = async () => {
    const form = document.getElementById("debtor-form");
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const debtorId = document.getElementById("debtor-id").value;
    const nombre = document.getElementById("debtor-name").value;
    const telefono = document.getElementById("debtor-phone").value;
    const email = document.getElementById("debtor-email").value;
    const notas = document.getElementById("debtor-notes").value;
    const tipo =
      document.querySelector('input[name="debtor-type"]:checked')?.value ||
      "persona";
    const servicio = document.getElementById("debtor-service").value;
    const montoMensualValue = document.getElementById("debtor-monthly").value;
    const montoMensual = montoMensualValue
      ? parseFloat(montoMensualValue)
      : 0;

    try {
      const debtor = new Debtor({
        id: debtorId ? parseInt(debtorId) : null,
        nombre,
        telefono,
        email,
        notas,
        tipo,
        servicio,
        montoMensual,
      });

      let savedId = debtor.id;
      if (debtorId) {
        await debtorRepository.update(debtor);
      } else {
        savedId = await debtorRepository.create(debtor);
      }

      await reloadDebtors();
      refreshDebtorUI(savedId);
      window.resetDebtorForm();
      notifySuccess("Contacto guardado correctamente");
    } catch (error) {
      notifyError("Error al guardar contacto: " + error.message);
    }
  };

  window.editDebtor = (debtorId) => {
    const debtor = currentDebtors.find((d) => d.id === debtorId);
    if (!debtor) return;

    const modal = document.getElementById("debtor-modal");
    if (modal.style.display !== "flex") {
      window.openDebtorModal();
    }

    document.getElementById("debtor-id").value = debtor.id;
    document.getElementById("debtor-name").value = debtor.nombre;
    document.getElementById("debtor-phone").value = debtor.telefono || "";
    document.getElementById("debtor-email").value = debtor.email || "";
    document.getElementById("debtor-notes").value = debtor.notas || "";
    const typeInputs = document.querySelectorAll('input[name="debtor-type"]');
    const selectedType = debtor.tipo === "empresa" ? "empresa" : "persona";
    typeInputs.forEach((input) => {
      input.checked = input.value === selectedType;
    });
    document.getElementById("debtor-service").value = debtor.servicio || "";
    document.getElementById("debtor-monthly").value = debtor.montoMensual
      ? Number(debtor.montoMensual).toFixed(2)
      : "";
    updateDebtorTypeUI(selectedType);
  };

  window.deleteDebtor = async (debtorId) => {
    const linkedDebts = currentDebts.filter((d) => d.personaId === debtorId);
    if (linkedDebts.length > 0) {
      notifyInfo(
        "No puedes eliminar este contacto porque tiene deudas asociadas. Edita o elimina esas deudas primero."
      );
      return;
    }

    const debtor = currentDebtors.find((d) => d.id === debtorId);
    const confirmed = await confirmDialog({
      title: "Eliminar contacto",
      message: `¿Eliminar a "${debtor?.nombre || "este contacto"}" de la lista?`,
      confirmText: "Eliminar",
      cancelText: "Cancelar",
      type: "danger",
    });
    if (!confirmed) return;

    try {
      await debtorRepository.delete(debtorId);
      await reloadDebtors();
      refreshDebtorUI();
    } catch (error) {
      notifyError("Error al eliminar contacto: " + error.message);
    }
  };

  document.getElementById("debtor-modal")?.addEventListener("click", (e) => {
    if (e.target.id === "debtor-modal") {
      window.closeDebtorModal();
    }
  });

  const debtorTypeInputs = document.querySelectorAll('input[name="debtor-type"]');
  debtorTypeInputs.forEach((input) => {
    input.addEventListener("change", () => {
      updateDebtorTypeUI(input.value);
    });
  });
  updateDebtorTypeUI();

  document
    .querySelectorAll('input[name="debt-type"]')
    .forEach((input) => {
      input.addEventListener("change", (event) => {
        updateDebtFormLabels(event.target.value);
      });
    });
  const initialType =
    document.querySelector('input[name="debt-type"]:checked')?.value ||
    DEBT_TYPES.ME_OWED;
  updateDebtFormLabels(initialType);

  window.exportPaymentsReport = () => {
    const select = document.getElementById("export-person-filter");
    const personaId = select?.value ? parseInt(select.value) : null;
    const persona = personaId
      ? currentDebtors.find((d) => d.id === personaId)
      : null;
    const typeSelect = document.getElementById("export-type-filter");
    const tipo = typeSelect?.value || null;

    let targetDebts = currentDebts.slice();
    if (tipo) {
      targetDebts = targetDebts.filter((debt) => debt.tipo === tipo);
    }
    if (personaId) {
      targetDebts = targetDebts.filter((debt) => debt.personaId === personaId);
    }

    const pagos = [];
    targetDebts.forEach((debt) => {
      debt.pagos.forEach((pago) => {
        pagos.push({
          persona: debt.personaNombre || "Sin contacto",
          deuda: debt.nombre,
          fecha: pago.fecha,
          monto: pago.monto,
          nota: pago.nota,
          tipo: debt.tipo,
        });
      });
    });

    pagos.sort(
      (a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
    );

    if (pagos.length === 0) {
      notifyInfo("No hay pagos registrados para exportar.");
      return;
    }

    try {
      exportPaymentsReportPDF({
        pagos,
        personaNombre: persona?.nombre || "Todos los contactos",
        tipo,
      });
    } catch (error) {
      notifyError("No se pudo crear el PDF: " + error.message);
    }
  };
}

async function reloadDebtors() {
  currentDebtors = await debtorRepository.getAll();
}

function refreshDebtorUI(preferredValue = null) {
  const listContainer = document.getElementById("debtor-list");
  if (listContainer) {
    listContainer.innerHTML = renderDebtorList();
  }

  refreshDebtorSelect(preferredValue);
}

function refreshDebtorSelect(preferredValue = null) {
  const select = document.getElementById("debt-person");
  if (!select) return;
  const currentValue =
    preferredValue !== null && preferredValue !== undefined
      ? String(preferredValue)
      : select.value;

  select.innerHTML = `<option value="">Sin contacto asignado</option>${renderDebtorOptions()}`;
  if (currentValue) {
    select.value = currentValue;
  }
}

function updateDebtorTypeUI(forcedType = null) {
  const selectedType =
    forcedType ||
    document.querySelector('input[name="debtor-type"]:checked')?.value ||
    "persona";
  const companyFields = document.getElementById("debtor-company-fields");
  if (companyFields) {
    companyFields.style.display = selectedType === "empresa" ? "block" : "none";
  }
  const serviceInput = document.getElementById("debtor-service");
  if (serviceInput) {
    serviceInput.required = selectedType === "empresa";
    serviceInput.disabled = selectedType !== "empresa";
  }
  const monthlyInput = document.getElementById("debtor-monthly");
  if (monthlyInput) {
    monthlyInput.disabled = selectedType !== "empresa";
  }
}

function updateDebtFormLabels(tipo) {
  const personLabel = document.getElementById("debt-person-label");
  const dateLabel = document.getElementById("debt-date-label");
  const dateHelper = document.getElementById("debt-date-helper");
  const dueLabel = document.getElementById("debt-due-label");
  const dueHelper = document.getElementById("debt-due-helper");

  if (personLabel) {
    personLabel.textContent =
      tipo === DEBT_TYPES.I_OWE
        ? "Contraparte de la cuenta por pagar"
        : "Contraparte de la cuenta por cobrar";
  }
  if (dateLabel) {
    dateLabel.textContent =
      tipo === DEBT_TYPES.I_OWE
        ? "Fecha en que registraste la cuenta por pagar"
        : "Fecha en que registraste la cuenta por cobrar";
  }
  if (dateHelper) {
    dateHelper.textContent =
      tipo === DEBT_TYPES.I_OWE
        ? "Usamos la fecha como referencia para programar tus pagos."
        : "Usamos la fecha como referencia para el seguimiento del cobro.";
  }
  if (dueLabel) {
    dueLabel.textContent =
      tipo === DEBT_TYPES.I_OWE
        ? "Fecha límite para liquidar la cuenta por pagar (opcional)"
        : "Fecha estimada para cobrar la cuenta (opcional)";
  }
  if (dueHelper) {
    dueHelper.textContent =
      tipo === DEBT_TYPES.I_OWE
        ? "Te avisaremos antes de que llegue el vencimiento."
        : "Te recordaremos cuando falte poco para cobrar.";
  }
}

function formatDateForInput(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().split("T")[0];
}

function parseDateInput(value, fallback = null) {
  if (!value) {
    return fallback || new Date().toISOString();
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return fallback || new Date().toISOString();
  }
  return parsed.toISOString();
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
