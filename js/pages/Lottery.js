/**
 * Lottery Page - Lotería
 * Registro y análisis de apuestas con ROI y costo de oportunidad
 */

import lotteryRepository from "../storage/LotteryRepository.js";
import { notifyError } from "../ui/notifications.js";
import { formatCurrency } from "../utils/formatters.js";

let lotteryInstance = null;

export async function renderLottery() {
  const mainContent = document.getElementById("main-content");

  try {
    // Cargar instancia de lotería
    lotteryInstance = await lotteryRepository.getInstance();
    const stats = lotteryInstance.getEstadisticas();

    mainContent.innerHTML = `
      <div class="page-container">
        <div class="page-header">
          <div>
            <h1 class="page-title">🎰 Lotería</h1>
            <p class="page-subtitle">Registro y análisis de apuestas</p>
          </div>
          <div style="display: flex; gap: var(--spacing-sm);">
            <button class="btn btn--success" onclick="window.openPrizeModal()">
              <span>🏆</span>
              <span>Registrar Premio</span>
            </button>
            <button class="btn btn--danger" onclick="window.openBetModal()">
              <span>🎲</span>
              <span>Registrar Apuesta</span>
            </button>
          </div>
        </div>

        <!-- Estadísticas principales -->
        <div class="content-grid content-grid--4-cols" style="margin-bottom: var(--spacing-xl);">
          <div class="stat-card ${
            stats.neto >= 0 ? "stat-card--success" : "stat-card--danger"
          }">
            <div class="stat-card__label">Neto (Ganado - Apostado)</div>
            <div class="stat-card__value">${
              stats.neto >= 0 ? "+" : "-"
            }${formatCurrency(Math.abs(stats.neto))}</div>
            <div class="stat-card__footer">
              ${stats.neto >= 0 ? "📈 Ganancia" : "📉 Pérdida"}
            </div>
          </div>

          <div class="stat-card ${
            stats.roi !== null && stats.roi >= 0
              ? "stat-card--success"
              : "stat-card--danger"
          }">
            <div class="stat-card__label">ROI (Retorno de Inversión)</div>
            <div class="stat-card__value">${
              stats.roi !== null ? stats.roi.toFixed(1) : "0.0"
            }%</div>
            <div class="stat-card__footer">
              ${
                stats.roi !== null && stats.roi >= 0
                  ? "✅ Positivo"
                  : "❌ Negativo"
              }
            </div>
          </div>

          <div class="stat-card stat-card--danger">
            <div class="stat-card__label">Total Apostado</div>
            <div class="stat-card__value">${formatCurrency(
              stats.totalApostado
            )}</div>
            <div class="stat-card__footer">
              ${stats.numeroApuestas} apuesta${
      stats.numeroApuestas !== 1 ? "s" : ""
    }
            </div>
          </div>

          <div class="stat-card stat-card--success">
            <div class="stat-card__label">Total Ganado</div>
            <div class="stat-card__value">${formatCurrency(
              stats.totalGanado
            )}</div>
            <div class="stat-card__footer">
              ${stats.numeroPremios} premio${
      stats.numeroPremios !== 1 ? "s" : ""
    }
            </div>
          </div>
        </div>

        <!-- Análisis financiero -->
        <div class="content-grid content-grid--2-cols" style="margin-bottom: var(--spacing-xl);">
          <div class="card">
            <div class="card__header">
              <h3 class="card__title">💸 Costo de Oportunidad</h3>
            </div>
            <div class="card__body">
              <p style="font-size: var(--font-size-sm); color: var(--color-text-secondary); margin-bottom: var(--spacing-md);">
                Si hubieras invertido el dinero apostado con un retorno del 5% anual:
              </p>
              <div style="padding: var(--spacing-md); background: rgba(239, 68, 68, 0.1); border-radius: var(--border-radius-md); border-left: 3px solid var(--color-danger);">
                <div style="font-size: var(--font-size-xs); color: var(--color-text-tertiary); margin-bottom: var(--spacing-xs);">
                  Valor potencial perdido
                </div>
                <div style="font-size: var(--font-size-2xl); font-weight: var(--font-weight-bold); color: var(--color-danger);">
                  ${formatCurrency(stats.costoOportunidad)}
                </div>
              </div>
            </div>
          </div>

          <div class="card">
            <div class="card__header">
              <h3 class="card__title">📊 Promedios</h3>
            </div>
            <div class="card__body">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-md);">
                <div>
                  <div style="font-size: var(--font-size-xs); color: var(--color-text-tertiary);">Apuesta Promedio</div>
                  <div style="font-size: var(--font-size-lg); font-weight: var(--font-weight-semibold); color: var(--color-danger);">
                    ${formatCurrency(stats.promedioApuesta)}
                  </div>
                </div>
                <div>
                  <div style="font-size: var(--font-size-xs); color: var(--color-text-tertiary);">Premio Promedio</div>
                  <div style="font-size: var(--font-size-lg); font-weight: var(--font-weight-semibold); color: var(--color-success);">
                    ${formatCurrency(stats.promedioPremio)}
                  </div>
                </div>
              </div>
              ${
                stats.perdidasAcumuladas > 0
                  ? `
                <div style="margin-top: var(--spacing-md); padding: var(--spacing-sm); background: rgba(239, 68, 68, 0.1); border-radius: var(--border-radius-md);">
                  <div style="font-size: var(--font-size-xs); color: var(--color-text-tertiary);">Pérdidas Acumuladas</div>
                  <div style="font-size: var(--font-size-base); font-weight: var(--font-weight-semibold); color: var(--color-danger);">
                    ${formatCurrency(stats.perdidasAcumuladas)}
                  </div>
                </div>
              `
                  : ""
              }
            </div>
          </div>
        </div>

        <!-- Historial -->
        <div class="card">
          <div class="card__header">
            <h3 class="card__title">📜 Historial de Movimientos</h3>
          </div>
          <div class="card__body">
            ${renderHistorial()}
          </div>
        </div>
      </div>

      <!-- Modal para registrar apuesta -->
      <div id="bet-modal" class="modal-overlay" style="display: none;">
        <div class="modal">
          <div class="modal__header">
            <h3 class="modal__title">Registrar Apuesta</h3>
            <button class="modal__close" onclick="window.closeBetModal()">✕</button>
          </div>
          <div class="modal__body">
            <form id="bet-form">
              <div class="form-group">
                <label class="form-label form-label--required" for="bet-amount">Monto Apostado (Lps)</label>
                <input type="number" id="bet-amount" class="form-input" placeholder="0.00" step="0.01" min="0.01" required>
              </div>

              <div class="form-group">
                <label class="form-label" for="bet-description">Descripción (opcional)</label>
                <input type="text" id="bet-description" class="form-input" placeholder="Ej: Lotería Nacional">
              </div>
            </form>
          </div>
          <div class="modal__footer">
            <button class="btn btn--secondary" onclick="window.closeBetModal()">Cancelar</button>
            <button class="btn btn--danger" onclick="window.saveBet()">Registrar Apuesta</button>
          </div>
        </div>
      </div>

      <!-- Modal para registrar premio -->
      <div id="prize-modal" class="modal-overlay" style="display: none;">
        <div class="modal">
          <div class="modal__header">
            <h3 class="modal__title">Registrar Premio</h3>
            <button class="modal__close" onclick="window.closePrizeModal()">✕</button>
          </div>
          <div class="modal__body">
            <form id="prize-form">
              <div class="form-group">
                <label class="form-label form-label--required" for="prize-amount">Monto del Premio (Lps)</label>
                <input type="number" id="prize-amount" class="form-input" placeholder="0.00" step="0.01" min="0.01" required>
              </div>

              <div class="form-group">
                <label class="form-label" for="prize-description">Descripción (opcional)</label>
                <input type="text" id="prize-description" class="form-input" placeholder="Ej: Premio menor">
              </div>
            </form>
          </div>
          <div class="modal__footer">
            <button class="btn btn--secondary" onclick="window.closePrizeModal()">Cancelar</button>
            <button class="btn btn--success" onclick="window.savePrize()">Registrar Premio</button>
          </div>
        </div>
      </div>
    `;

    attachEventListeners();
  } catch (error) {
    console.error("Error al cargar lotería:", error);
    mainContent.innerHTML = `
      <div class="page-container">
        <div class="empty-state">
          <div class="empty-state__icon">⚠️</div>
          <h2 class="empty-state__title">Error al cargar lotería</h2>
          <p class="empty-state__description">${error.message}</p>
        </div>
      </div>
    `;
  }
}

function renderHistorial() {
  const historial = lotteryInstance.getHistorial(20);

  if (historial.length === 0) {
    return `
      <div class="empty-state">
        <div class="empty-state__icon">📜</div>
        <h3 class="empty-state__title">Sin movimientos</h3>
        <p class="empty-state__description">Registra tu primera apuesta o premio</p>
      </div>
    `;
  }

  return `
    <div style="max-height: 400px; overflow-y: auto;">
      <table class="table">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Tipo</th>
            <th>Descripción</th>
            <th style="text-align: right;">Monto</th>
          </tr>
        </thead>
        <tbody>
          ${historial
            .map(
              (item) => `
            <tr>
              <td>${new Date(item.fecha).toLocaleDateString("es-HN")}</td>
              <td>
                <span class="badge ${
                  item.tipo === "premio" ? "badge--success" : "badge--danger"
                }">
                  ${item.tipo === "premio" ? "🏆 Premio" : "🎲 Apuesta"}
                </span>
              </td>
              <td>${item.descripcion || "-"}</td>
              <td style="text-align: right; font-weight: var(--font-weight-semibold); color: ${
                item.tipo === "premio"
                  ? "var(--color-success)"
                  : "var(--color-danger)"
              };">
                ${item.tipo === "premio" ? "+" : "-"}${formatCurrency(
                item.monto
              )}
              </td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

function attachEventListeners() {
  // Funciones globales para los modales
  window.openBetModal = () => {
    const modal = document.getElementById("bet-modal");
    const form = document.getElementById("bet-form");
    form.reset();
    modal.style.display = "flex";
  };

  window.closeBetModal = () => {
    document.getElementById("bet-modal").style.display = "none";
  };

  window.saveBet = async () => {
    const form = document.getElementById("bet-form");
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const monto = parseFloat(document.getElementById("bet-amount").value);
    const descripcion = document.getElementById("bet-description").value;

    try {
      await lotteryRepository.registrarApuesta(monto, descripcion);
      window.closeBetModal();
      await renderLottery();
    } catch (error) {
      notifyError("Error al registrar apuesta: " + error.message);
    }
  };

  window.openPrizeModal = () => {
    const modal = document.getElementById("prize-modal");
    const form = document.getElementById("prize-form");
    form.reset();
    modal.style.display = "flex";
  };

  window.closePrizeModal = () => {
    document.getElementById("prize-modal").style.display = "none";
  };

  window.savePrize = async () => {
    const form = document.getElementById("prize-form");
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const monto = parseFloat(document.getElementById("prize-amount").value);
    const descripcion = document.getElementById("prize-description").value;

    try {
      await lotteryRepository.registrarPremio(monto, descripcion);
      window.closePrizeModal();
      await renderLottery();
    } catch (error) {
      notifyError("Error al registrar premio: " + error.message);
    }
  };

  // Cerrar modales al hacer click fuera
  document.getElementById("bet-modal")?.addEventListener("click", (e) => {
    if (e.target.id === "bet-modal") {
      window.closeBetModal();
    }
  });

  document.getElementById("prize-modal")?.addEventListener("click", (e) => {
    if (e.target.id === "prize-modal") {
      window.closePrizeModal();
    }
  });
}
