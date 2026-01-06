/**
 * Reports Page - Reportes y Análisis
 * Gráficas y análisis financiero con Chart.js
 */

import goalRepository from "../storage/GoalRepository.js";
import debtRepository from "../storage/DebtRepository.js";
import savingRepository from "../storage/SavingRepository.js";
import lotteryRepository from "../storage/LotteryRepository.js";
import debtorRepository from "../storage/DebtorRepository.js";
import { exportFinancialSummaryPDF } from "../utils/pdf.js";
import { notifyError, notifyInfo } from "../ui/notifications.js";
import { formatCurrency } from "../utils/formatters.js";

let charts = {};
let latestReportData = null;

export async function renderReports() {
  const mainContent = document.getElementById("main-content");

  try {
    // Cargar datos
    const goals = await goalRepository.getAll();
    const debts = await debtRepository.getAll();
    const savings = await savingRepository.getAll();
    const lottery = await lotteryRepository.getInstance();
    const lotteryStats = lottery.getEstadisticas();
    const debtors = await debtorRepository.getAll();

    // Calcular estadísticas
    const activeGoals = goals.filter((g) => !g.completada);
    const completedGoals = goals.filter((g) => g.completada);
    const activeDebts = debts.filter((d) => !d.archivada);
    const paidDebts = debts.filter((d) => d.archivada);
    const activeMeOwed = activeDebts.filter((d) => d.tipo === "me-deben");
    const activeIOwe = activeDebts.filter((d) => d.tipo === "yo-debo");
    const totalSaved = savings.reduce((sum, s) => sum + s.montoAcumulado, 0);
    const personaResumen = debtors
      .map((persona) => {
        const deudasPersona = activeMeOwed.filter(
          (debt) => debt.personaId === persona.id
        );
        return {
          nombre: persona.nombre,
          deudas: deudasPersona.length,
          saldo: deudasPersona.reduce((sum, debt) => sum + debt.calcularSaldo(), 0),
        };
      })
      .filter((persona) => persona.deudas > 0);

    latestReportData = {
      goals: {
        active: activeGoals.length,
        completed: completedGoals.length,
      },
      debts: {
        active: activeDebts.length,
        paid: paidDebts.length,
        total: activeDebts.reduce((sum, debt) => sum + debt.totalAdeudado, 0),
        meOwed: activeMeOwed.length,
        iOwe: activeIOwe.length,
      },
      savings: {
        total: totalSaved,
        count: savings.length,
      },
      lottery: {
        net: lotteryStats.neto,
        roi: lotteryStats.roi,
      },
      personas: personaResumen,
    };

    mainContent.innerHTML = `
      <div class="page-container">
        <div class="page-header">
          <div>
            <h1 class="page-title">📈 Reportes y Análisis</h1>
            <p class="page-subtitle">Visualización de tu estado financiero</p>
          </div>
          <button class="btn btn--primary" onclick="window.exportReportsPDF()">
            🧾 Exportar PDF
          </button>
        </div>

        <!-- Cards de Resumen -->
        <div class="content-grid content-grid--4-cols" style="margin-bottom: var(--spacing-xl);">
          <div class="stat-card stat-card--primary">
            <div class="stat-card__label">Metas</div>
            <div class="stat-card__value">${goals.length}</div>
            <div class="stat-card__footer">
              ${activeGoals.length} activas, ${
      completedGoals.length
    } completadas
            </div>
          </div>

          <div class="stat-card ${
            activeDebts.length > 0 ? "stat-card--danger" : "stat-card--success"
          }">
            <div class="stat-card__label">Deudas</div>
            <div class="stat-card__value">${debts.length}</div>
            <div class="stat-card__footer">
              ${activeDebts.length} activas, ${paidDebts.length} pagadas
            </div>
          </div>

          <div class="stat-card stat-card--success">
            <div class="stat-card__label">Total Ahorrado</div>
            <div class="stat-card__value">${formatCurrency(totalSaved)}</div>
            <div class="stat-card__footer">
              ${savings.length} fondo${savings.length !== 1 ? "s" : ""}
            </div>
          </div>

          <div class="stat-card ${
            lotteryStats.neto >= 0 ? "stat-card--success" : "stat-card--danger"
          }">
            <div class="stat-card__label">Balance Lotería</div>
            <div class="stat-card__value">${
              lotteryStats.neto >= 0 ? "+" : "-"
            }${formatCurrency(Math.abs(lotteryStats.neto))}</div>
            <div class="stat-card__footer">
              ROI: ${
                lotteryStats.roi !== null ? lotteryStats.roi.toFixed(1) : "0.0"
              }%
            </div>
          </div>
        </div>

        <!-- Gráficas -->
        <div class="content-grid content-grid--2-cols">
          <!-- Progreso de Metas -->
          <div class="card">
            <div class="card__header">
              <h3 class="card__title">📊 Progreso de Metas</h3>
            </div>
            <div class="card__body">
              <div style="height: 300px; position: relative;">
                <canvas id="goals-chart"></canvas>
              </div>
            </div>
          </div>

          <!-- Estado de Deudas -->
          <div class="card">
            <div class="card__header">
              <h3 class="card__title">💳 Estado de Deudas</h3>
            </div>
            <div class="card__body">
              <div style="height: 300px; position: relative;">
                <canvas id="debts-chart"></canvas>
              </div>
            </div>
          </div>

          <!-- Distribución de Ahorros -->
          <div class="card">
            <div class="card__header">
              <h3 class="card__title">🏦 Distribución de Ahorros</h3>
            </div>
            <div class="card__body">
              <div style="height: 300px; position: relative;">
                <canvas id="savings-chart"></canvas>
              </div>
            </div>
          </div>

          <!-- Análisis de Lotería -->
          <div class="card">
            <div class="card__header">
              <h3 class="card__title">🎰 Análisis de Lotería</h3>
            </div>
            <div class="card__body">
              <div style="height: 300px; position: relative;">
                <canvas id="lottery-chart"></canvas>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Destruir gráficas anteriores si existen
    Object.values(charts).forEach((chart) => chart?.destroy());
    charts = {};

    // Crear gráficas
    createGoalsChart(goals);
    createDebtsChart(debts);
    createSavingsChart(savings);
    createLotteryChart(lottery);
  } catch (error) {
    console.error("Error al cargar reportes:", error);
    mainContent.innerHTML = `
      <div class="page-container">
        <div class="empty-state">
          <div class="empty-state__icon">⚠️</div>
          <h2 class="empty-state__title">Error al cargar reportes</h2>
          <p class="empty-state__description">${error.message}</p>
        </div>
      </div>
    `;
  }
}

function createGoalsChart(goals) {
  const ctx = document.getElementById("goals-chart");
  if (!ctx) return;

  if (goals.length === 0) {
    ctx.parentElement.innerHTML =
      '<div class="empty-state"><div class="empty-state__icon">📊</div><p class="empty-state__description">No hay metas registradas</p></div>';
    return;
  }

  const activeGoals = goals.filter((g) => !g.completada).slice(0, 10); // Máximo 10 metas

  charts.goals = new Chart(ctx, {
    type: "bar",
    data: {
      labels: activeGoals.map((g) => g.nombre),
      datasets: [
        {
          label: "Progreso (%)",
          data: activeGoals.map((g) => g.calcularProgreso()),
          backgroundColor: activeGoals.map((g) =>
            g.calcularProgreso() >= 100
              ? "rgba(16, 185, 129, 0.8)"
              : "rgba(59, 130, 246, 0.8)"
          ),
          borderColor: activeGoals.map((g) =>
            g.calcularProgreso() >= 100
              ? "rgb(16, 185, 129)"
              : "rgb(59, 130, 246)"
          ),
          borderWidth: 2,
        },
      ],
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          beginAtZero: true,
          max: 100,
          ticks: {
            callback: function (value) {
              return value + "%";
            },
          },
        },
      },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              return "Progreso: " + context.parsed.x.toFixed(1) + "%";
            },
          },
        },
      },
    },
  });
}

function createDebtsChart(debts) {
  const ctx = document.getElementById("debts-chart");
  if (!ctx) return;

  if (debts.length === 0) {
    ctx.parentElement.innerHTML =
      '<div class="empty-state"><div class="empty-state__icon">💳</div><p class="empty-state__description">No hay deudas registradas</p></div>';
    return;
  }

  const totalAdeudado = debts.reduce((sum, d) => sum + d.totalAdeudado, 0);
  const totalPagado = debts.reduce((sum, d) => sum + d.getTotalPagado(), 0);
  const saldoRestante = totalAdeudado - totalPagado;

  charts.debts = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["Pagado", "Saldo Restante"],
      datasets: [
        {
          data: [totalPagado, saldoRestante],
          backgroundColor: [
            "rgba(16, 185, 129, 0.8)",
            "rgba(239, 68, 68, 0.8)",
          ],
          borderColor: ["rgb(16, 185, 129)", "rgb(239, 68, 68)"],
          borderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              const label = context.label || "";
              const value = context.parsed || 0;
              const percentage = ((value / totalAdeudado) * 100).toFixed(1);
              return (
                label +
                ": " +
                formatCurrency(value) +
                " (" +
                percentage +
                "%)"
              );
            },
          },
        },
      },
    },
  });
}

function createSavingsChart(savings) {
  const ctx = document.getElementById("savings-chart");
  if (!ctx) return;

  if (savings.length === 0) {
    ctx.parentElement.innerHTML =
      '<div class="empty-state"><div class="empty-state__icon">🏦</div><p class="empty-state__description">No hay fondos de ahorro</p></div>';
    return;
  }

  const colors = [
    "rgba(59, 130, 246, 0.8)",
    "rgba(16, 185, 129, 0.8)",
    "rgba(245, 158, 11, 0.8)",
    "rgba(139, 92, 246, 0.8)",
    "rgba(236, 72, 153, 0.8)",
    "rgba(6, 182, 212, 0.8)",
  ];

  charts.savings = new Chart(ctx, {
    type: "pie",
    data: {
      labels: savings.map((s) => s.nombre),
      datasets: [
        {
          data: savings.map((s) => s.montoAcumulado),
          backgroundColor: savings.map((_, i) => colors[i % colors.length]),
          borderColor: savings.map((_, i) =>
            colors[i % colors.length].replace("0.8", "1")
          ),
          borderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              const label = context.label || "";
              const value = context.parsed || 0;
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = ((value / total) * 100).toFixed(1);
              return (
                label +
                ": " +
                formatCurrency(value) +
                " (" +
                percentage +
                "%)"
              );
            },
          },
        },
      },
    },
  });
}

function createLotteryChart(lottery) {
  const ctx = document.getElementById("lottery-chart");
  if (!ctx) return;

  const historial = lottery.getHistorial();

  if (historial.length === 0) {
    ctx.parentElement.innerHTML =
      '<div class="empty-state"><div class="empty-state__icon">🎰</div><p class="empty-state__description">No hay movimientos de lotería</p></div>';
    return;
  }

  // Calcular acumulados
  let apuestasAcum = 0;
  let premiosAcum = 0;
  const labels = [];
  const apuestasData = [];
  const premiosData = [];
  const netoData = [];

  historial.reverse().forEach((item, index) => {
    if (item.tipo === "apuesta") {
      apuestasAcum += item.monto;
    } else {
      premiosAcum += item.monto;
    }

    // Mostrar solo cada 5 movimientos para no saturar
    if (
      index % Math.max(1, Math.floor(historial.length / 20)) === 0 ||
      index === historial.length - 1
    ) {
      labels.push(
        new Date(item.fecha).toLocaleDateString("es-HN", {
          month: "short",
          day: "numeric",
        })
      );
      apuestasData.push(apuestasAcum);
      premiosData.push(premiosAcum);
      netoData.push(premiosAcum - apuestasAcum);
    }
  });

  charts.lottery = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Apuestas Acumuladas",
          data: apuestasData,
          borderColor: "rgb(239, 68, 68)",
          backgroundColor: "rgba(239, 68, 68, 0.1)",
          tension: 0.4,
          fill: false,
        },
        {
          label: "Premios Acumulados",
          data: premiosData,
          borderColor: "rgb(16, 185, 129)",
          backgroundColor: "rgba(16, 185, 129, 0.1)",
          tension: 0.4,
          fill: false,
        },
        {
          label: "Neto",
          data: netoData,
          borderColor: "rgb(59, 130, 246)",
          backgroundColor: "rgba(59, 130, 246, 0.1)",
          tension: 0.4,
          fill: true,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: "index",
        intersect: false,
      },
      plugins: {
        legend: {
          position: "bottom",
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              return (
                context.dataset.label + ": " + formatCurrency(context.parsed.y)
              );
            },
          },
        },
      },
      scales: {
        y: {
          ticks: {
            callback: function (value) {
              return formatCurrency(value);
            },
          },
        },
      },
    },
  });
}

window.exportReportsPDF = () => {
  if (!latestReportData) {
    notifyInfo("Aún no hay datos para exportar. Recarga la vista de reportes.");
    return;
  }

  try {
    exportFinancialSummaryPDF(latestReportData);
  } catch (error) {
    notifyError("Ocurrió un error al generar el PDF: " + error.message);
  }
};
