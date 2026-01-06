/**
 * Dashboard Page
 * Página principal con resumen general y motor reflexivo
 */

import goalRepository from "../storage/GoalRepository.js";
import debtRepository from "../storage/DebtRepository.js";
import savingRepository from "../storage/SavingRepository.js";
import lotteryRepository from "../storage/LotteryRepository.js";
import { FinancialAnalyzer } from "../engine/FinancialAnalyzer.js";
import { formatCurrency } from "../utils/formatters.js";

export async function renderDashboard() {
  const mainContent = document.getElementById("main-content");

  try {
    // Obtener estadísticas
    const goalsStats = await goalRepository.getEstadisticas();
    const debtsStats = await debtRepository.getEstadisticas();
    const savingsStats = await savingRepository.getEstadisticas();
    const lotteryStats = await lotteryRepository.getEstadisticas();

    // Obtener datos para el motor reflexivo
    const goals = await goalRepository.getAll();
    const debts = await debtRepository.getAll();
    const savings = await savingRepository.getAll();
    const lottery = await lotteryRepository.getInstance();

    // Generar insights
    const analyzer = new FinancialAnalyzer(goals, debts, savings, lottery);
    const insights = analyzer.generateInsights();

    mainContent.innerHTML = `
      <div class="page-container">
        <div class="page-header">
          <h1 class="page-title">Dashboard</h1>
          <p class="page-subtitle">Resumen general de tus finanzas</p>
        </div>

        <!-- Stats Grid -->
        <div class="content-grid content-grid--4-cols">
          <!-- Metas -->
          <div class="stat-card">
            <div class="stat-card__label">Metas Activas</div>
            <div class="stat-card__value">${goalsStats.metasActivas}</div>
            <div class="stat-card__change">
              Progreso: ${goalsStats.progresoPromedio.toFixed(1)}%
            </div>
          </div>

          <!-- Deudas -->
          <div class="stat-card">
            <div class="stat-card__label">Deuda Total</div>
            <div class="stat-card__value">${formatCurrency(
              debtsStats.saldoTotal
            )}</div>
            <div class="stat-card__change ${
              debtsStats.saldoTotal > 0
                ? "stat-card__change--negative"
                : "stat-card__change--positive"
            }">
              ${debtsStats.deudasActivas} deudas activas
            </div>
          </div>

          <!-- Ahorros -->
          <div class="stat-card">
            <div class="stat-card__label">Ahorros Totales</div>
            <div class="stat-card__value">${formatCurrency(
              savingsStats.totalAcumulado
            )}</div>
            <div class="stat-card__change stat-card__change--positive">
              ${savingsStats.totalAhorros} fondos
            </div>
          </div>

          <!-- Lotería -->
          <div class="stat-card">
            <div class="stat-card__label">Lotería (Neto)</div>
            <div class="stat-card__value">${formatCurrency(
              lotteryStats.neto
            )}</div>
            <div class="stat-card__change ${
              lotteryStats.neto >= 0
                ? "stat-card__change--positive"
                : "stat-card__change--negative"
            }">
              ROI: ${
                lotteryStats.roi !== null
                  ? lotteryStats.roi.toFixed(1) + "%"
                  : "N/A"
              }
            </div>
          </div>
        </div>

        ${
          insights.length > 0
            ? `
          <!-- Motor Reflexivo - Insights -->
          <div class="card insights-section">
            <div class="card__header">
              <h3 class="card__title">💡 Insights Financieros</h3>
              <p class="card__subtitle">
                Análisis inteligente de tus patrones financieros
              </p>
            </div>
            <div class="card__body">
              <div style="display: grid; gap: var(--spacing-md);">
                ${insights
                  .slice(0, 5)
                  .map((insight) => renderInsight(insight))
                  .join("")}
              </div>
            </div>
          </div>
        `
            : ""
        }

        <!-- Resumen de Metas -->
        <div class="content-grid content-grid--2-cols" style="margin-top: var(--spacing-xl);">
          <div class="card">
            <div class="card__header">
              <h3 class="card__title">🎯 Metas Mensuales</h3>
            </div>
            <div class="card__body">
              <div style="margin-bottom: var(--spacing-md);">
                <div style="display: flex; justify-content: space-between; margin-bottom: var(--spacing-xs);">
                  <span style="font-size: var(--font-size-sm); color: var(--color-text-secondary);">Progreso Total</span>
                  <span style="font-size: var(--font-size-sm); font-weight: var(--font-weight-semibold);">
                    ${formatCurrency(goalsStats.totalAportado)} / ${formatCurrency(
                      goalsStats.totalObjetivo
                    )}
                  </span>
                </div>
                <div class="progress">
                  <div class="progress__bar progress__bar--success" style="width: ${Math.min(
                    (goalsStats.totalAportado / goalsStats.totalObjetivo) * 100,
                    100
                  )}%"></div>
                </div>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: var(--font-size-sm); color: var(--color-text-tertiary);">
                <span>${goalsStats.metasActivas} activas</span>
                <span>${goalsStats.metasCompletadas} completadas</span>
              </div>
            </div>
            <div class="card__footer">
              <button class="btn btn--primary btn--sm" onclick="window.location.hash = '#/goals'">Ver Metas</button>
            </div>
          </div>

          <div class="card">
            <div class="card__header">
              <h3 class="card__title">💳 Deudas</h3>
            </div>
            <div class="card__body">
              <div style="margin-bottom: var(--spacing-md);">
                <div style="display: flex; justify-content: space-between; margin-bottom: var(--spacing-xs);">
                  <span style="font-size: var(--font-size-sm); color: var(--color-text-secondary);">Progreso de Pago</span>
                  <span style="font-size: var(--font-size-sm); font-weight: var(--font-weight-semibold);">
                    ${formatCurrency(debtsStats.totalPagado)} / ${formatCurrency(
                      debtsStats.totalAdeudado
                    )}
                  </span>
                </div>
                <div class="progress">
                  <div class="progress__bar progress__bar--warning" style="width: ${
                    debtsStats.totalAdeudado > 0
                      ? Math.min(
                          (debtsStats.totalPagado / debtsStats.totalAdeudado) *
                            100,
                          100
                        )
                      : 0
                  }%"></div>
                </div>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: var(--font-size-sm); color: var(--color-text-tertiary);">
                <span>Saldo: ${formatCurrency(debtsStats.saldoTotal)}</span>
                <span>${debtsStats.deudasActivas} activas</span>
              </div>
            </div>
            <div class="card__footer">
              <button class="btn btn--primary btn--sm" onclick="window.location.hash = '#/debts'">Ver Deudas</button>
            </div>
          </div>
        </div>
      </div>
    `;
  } catch (error) {
    console.error("Error al cargar dashboard:", error);
    mainContent.innerHTML = `
      <div class="page-container">
        <div class="empty-state">
          <div class="empty-state__icon">⚠️</div>
          <h2 class="empty-state__title">Error al cargar el dashboard</h2>
          <p class="empty-state__description">${error.message}</p>
        </div>
      </div>
    `;
  }
}

function renderInsight(insight) {
  const typeColors = {
    warning: { bg: "rgba(245, 158, 11, 0.1)", border: "var(--color-warning)" },
    success: { bg: "rgba(16, 185, 129, 0.1)", border: "var(--color-success)" },
    info: { bg: "rgba(59, 130, 246, 0.1)", border: "var(--color-primary)" },
  };

  const colors = typeColors[insight.type] || typeColors.info;

  return `
    <div class="insight-card" style="--insight-bg: ${
      colors.bg
    }; --insight-border: ${colors.border};">
      <div class="insight-card__icon">${insight.icon}</div>
      <div class="insight-card__content">
        <h4 class="insight-card__title">${insight.title}</h4>
        <p class="insight-card__message">${insight.message}</p>
        ${
          insight.details
            ? `<p class="insight-card__details">${insight.details}</p>`
            : ""
        }
        ${
          insight.comparisons && insight.comparisons.length > 0
            ? `
          <div class="insight-card__comparison">
            <div style="font-size: var(--font-size-xs); font-weight: var(--font-weight-medium); color: var(--color-text-secondary); margin-bottom: var(--spacing-xs);">
              Con ese dinero podrías:
            </div>
            <ul style="margin: 0; padding-left: var(--spacing-md); font-size: var(--font-size-xs); color: var(--color-text-secondary);">
              ${insight.comparisons.map((c) => `<li>${c}</li>`).join("")}
            </ul>
          </div>
        `
            : ""
        }
        ${
          insight.action
            ? `<div class="insight-card__action">💡 ${insight.action}</div>`
            : ""
        }
      </div>
    </div>
  `;
}
