/**
 * History Page - Historial Global
 * Vista unificada de todas las transacciones del sistema
 */

import goalRepository from "../storage/GoalRepository.js";
import debtRepository from "../storage/DebtRepository.js";
import savingRepository from "../storage/SavingRepository.js";
import lotteryRepository from "../storage/LotteryRepository.js";
import { formatCurrency } from "../utils/formatters.js";

let allTransactions = [];
let filteredTransactions = [];

export async function renderHistory() {
  const mainContent = document.getElementById("main-content");

  try {
    // Cargar todas las transacciones
    await loadAllTransactions();
    filteredTransactions = [...allTransactions];

    mainContent.innerHTML = `
      <div class="page-container">
        <div class="page-header">
          <div>
            <h1 class="page-title">📜 Historial Global</h1>
            <p class="page-subtitle">Todas tus transacciones en un solo lugar</p>
          </div>
        </div>

        <!-- Filtros -->
        <div class="history-filters card" style="margin-bottom: var(--spacing-lg);">
          <div class="card__body">
            <div style="display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: var(--spacing-md);">
              <div class="form-group" style="margin: 0;">
                <label class="form-label" for="search-input">🔍 Buscar</label>
                <input 
                  type="text" 
                  id="search-input" 
                  class="form-input" 
                  placeholder="Buscar por descripción..."
                  onkeyup="window.filterTransactions()"
                >
              </div>

              <div class="form-group" style="margin: 0;">
                <label class="form-label" for="type-filter">Tipo</label>
                <select id="type-filter" class="form-input" onchange="window.filterTransactions()">
                  <option value="all">Todos</option>
                  <option value="goals">🎯 Metas</option>
                  <option value="debts">💳 Deudas</option>
                  <option value="savings">🏦 Ahorros</option>
                  <option value="lottery">🎰 Lotería</option>
                </select>
              </div>

              <div class="form-group" style="margin: 0;">
                <label class="form-label" for="date-from">Desde</label>
                <input 
                  type="date" 
                  id="date-from" 
                  class="form-input"
                  onchange="window.filterTransactions()"
                >
              </div>

              <div class="form-group" style="margin: 0;">
                <label class="form-label" for="date-to">Hasta</label>
                <input 
                  type="date" 
                  id="date-to" 
                  class="form-input"
                  onchange="window.filterTransactions()"
                >
              </div>
            </div>

            <div style="margin-top: var(--spacing-md); display: flex; justify-content: space-between; align-items: center;">
              <div style="font-size: var(--font-size-sm); color: var(--color-text-secondary);">
                <span id="transaction-count">${
                  allTransactions.length
                }</span> transacciones encontradas
              </div>
              <button class="btn btn--secondary btn--sm" onclick="window.clearFilters()">
                Limpiar Filtros
              </button>
            </div>
          </div>
        </div>

        <!-- Timeline de Transacciones -->
        <div id="transactions-timeline">
          ${renderTimeline()}
        </div>
      </div>
    `;

    attachEventListeners();
  } catch (error) {
    console.error("Error al cargar historial:", error);
    mainContent.innerHTML = `
      <div class="page-container">
        <div class="empty-state">
          <div class="empty-state__icon">⚠️</div>
          <h2 class="empty-state__title">Error al cargar historial</h2>
          <p class="empty-state__description">${error.message}</p>
        </div>
      </div>
    `;
  }
}

async function loadAllTransactions() {
  allTransactions = [];

  // Cargar metas
  const goals = await goalRepository.getAll();
  goals.forEach((goal) => {
    goal.aportes.forEach((aporte) => {
      allTransactions.push({
        type: "goal",
        subtype: "aporte",
        date: aporte.fecha,
        amount: aporte.monto,
        description: `Aporte a "${goal.nombre}"${
          aporte.nota ? ` - ${aporte.nota}` : ""
        }`,
        category: "Metas",
        icon: "🎯",
        color: "var(--color-goal)",
        relatedName: goal.nombre,
      });
    });
  });

  // Cargar deudas
  const debts = await debtRepository.getAll();
  debts.forEach((debt) => {
    debt.pagos.forEach((pago) => {
      allTransactions.push({
        type: "debt",
        subtype: "pago",
        date: pago.fecha,
        amount: pago.monto,
        description: `Pago de "${debt.nombre}"${
          pago.nota ? ` - ${pago.nota}` : ""
        }`,
        category: "Deudas",
        icon: "💳",
        color: "var(--color-debt)",
        relatedName: debt.nombre,
      });
    });
  });

  // Cargar ahorros
  const savings = await savingRepository.getAll();
  savings.forEach((saving) => {
    saving.depositos.forEach((deposito) => {
      const isDeposit = deposito.tipo === "deposito";
      allTransactions.push({
        type: "saving",
        subtype: deposito.tipo,
        date: deposito.fecha,
        amount: deposito.monto,
        description: `${isDeposit ? "Depósito en" : "Retiro de"} "${
          saving.nombre
        }"${deposito.nota ? ` - ${deposito.nota}` : ""}`,
        category: "Ahorros",
        icon: isDeposit ? "⬇️" : "⬆️",
        color: "var(--color-saving)",
        relatedName: saving.nombre,
      });
    });
  });

  // Cargar lotería
  const lottery = await lotteryRepository.getInstance();
  const lotteryHistory = lottery.getHistorial();
  lotteryHistory.forEach((item) => {
    const isPrize = item.tipo === "premio";
    allTransactions.push({
      type: "lottery",
      subtype: item.tipo,
      date: item.fecha,
      amount: item.monto,
      description: `${isPrize ? "Premio" : "Apuesta"} de lotería${
        item.descripcion ? ` - ${item.descripcion}` : ""
      }`,
      category: "Lotería",
      icon: isPrize ? "🏆" : "🎲",
      color: "var(--color-lottery)",
      relatedName: "Lotería",
    });
  });

  // Ordenar por fecha (más reciente primero)
  allTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));
}

function renderTimeline() {
  if (filteredTransactions.length === 0) {
    return `
      <div class="empty-state">
        <div class="empty-state__icon">📜</div>
        <h2 class="empty-state__title">No hay transacciones</h2>
        <p class="empty-state__description">
          ${
            allTransactions.length > 0
              ? "Prueba ajustando los filtros"
              : "Comienza registrando metas, deudas o ahorros"
          }
        </p>
      </div>
    `;
  }

  // Agrupar por fecha
  const grouped = groupByDate(filteredTransactions);

  return Object.entries(grouped)
    .map(
      ([date, transactions]) => `
    <div class="timeline-group" style="margin-bottom: var(--spacing-xl);">
      <div class="timeline-date">
        <span class="timeline-date__text">${formatDate(date)}</span>
        <div class="timeline-date__line"></div>
      </div>
      <div class="timeline-items">
        ${transactions.map((t) => renderTransaction(t)).join("")}
      </div>
    </div>
  `
    )
    .join("");
}

function renderTransaction(transaction) {
  const isIncome =
    transaction.subtype === "premio" || transaction.subtype === "deposito";
  const amountClass = isIncome
    ? "transaction__amount--positive"
    : "transaction__amount--negative";
  const amountSign = isIncome ? "+" : "-";

  return `
    <div class="transaction-item">
      <div class="transaction__icon" style="background: ${
        transaction.color
      }20; color: ${transaction.color};">
        ${transaction.icon}
      </div>
      <div class="transaction__content">
        <div class="transaction__header">
          <span class="transaction__description">${
            transaction.description
          }</span>
          <span class="transaction__amount ${amountClass}">${amountSign}${formatCurrency(
    transaction.amount
  )}</span>
        </div>
        <div class="transaction__meta">
          <span class="transaction__category">${transaction.category}</span>
          <span class="transaction__time">${formatTime(transaction.date)}</span>
        </div>
      </div>
    </div>
  `;
}

function groupByDate(transactions) {
  const grouped = {};

  transactions.forEach((t) => {
    const date = new Date(t.date).toISOString().split("T")[0];
    if (!grouped[date]) {
      grouped[date] = [];
    }
    grouped[date].push(t);
  });

  return grouped;
}

function formatDate(dateString) {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const dateOnly = date.toISOString().split("T")[0];
  const todayOnly = today.toISOString().split("T")[0];
  const yesterdayOnly = yesterday.toISOString().split("T")[0];

  if (dateOnly === todayOnly) return "Hoy";
  if (dateOnly === yesterdayOnly) return "Ayer";

  return date.toLocaleDateString("es-HN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatTime(dateString) {
  const date = new Date(dateString);
  return date.toLocaleTimeString("es-HN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function attachEventListeners() {
  // Funciones globales para filtros
  window.filterTransactions = () => {
    const searchTerm = document
      .getElementById("search-input")
      .value.toLowerCase();
    const typeFilter = document.getElementById("type-filter").value;
    const dateFrom = document.getElementById("date-from").value;
    const dateTo = document.getElementById("date-to").value;

    filteredTransactions = allTransactions.filter((t) => {
      // Filtro de búsqueda
      if (searchTerm && !t.description.toLowerCase().includes(searchTerm)) {
        return false;
      }

      // Filtro de tipo
      if (typeFilter !== "all") {
        if (typeFilter === "goals" && t.type !== "goal") return false;
        if (typeFilter === "debts" && t.type !== "debt") return false;
        if (typeFilter === "savings" && t.type !== "saving") return false;
        if (typeFilter === "lottery" && t.type !== "lottery") return false;
      }

      // Filtro de fecha desde
      if (dateFrom) {
        const transactionDate = new Date(t.date).toISOString().split("T")[0];
        if (transactionDate < dateFrom) return false;
      }

      // Filtro de fecha hasta
      if (dateTo) {
        const transactionDate = new Date(t.date).toISOString().split("T")[0];
        if (transactionDate > dateTo) return false;
      }

      return true;
    });

    // Actualizar vista
    document.getElementById("transactions-timeline").innerHTML =
      renderTimeline();
    document.getElementById("transaction-count").textContent =
      filteredTransactions.length;
  };

  window.clearFilters = () => {
    document.getElementById("search-input").value = "";
    document.getElementById("type-filter").value = "all";
    document.getElementById("date-from").value = "";
    document.getElementById("date-to").value = "";
    window.filterTransactions();
  };
}

// Inyectar estilos
const style = document.createElement("style");
style.textContent = `
  .history-filters {
    position: sticky;
    top: var(--spacing-md);
    z-index: 10;
  }

  .timeline-group {
    position: relative;
  }

  .timeline-date {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    margin-bottom: var(--spacing-md);
  }

  .timeline-date__text {
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-secondary);
    text-transform: capitalize;
    white-space: nowrap;
  }

  .timeline-date__line {
    flex: 1;
    height: 1px;
    background: var(--color-border);
  }

  .timeline-items {
    display: grid;
    gap: var(--spacing-sm);
  }

  .transaction-item {
    display: flex;
    align-items: start;
    gap: var(--spacing-md);
    padding: var(--spacing-md);
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--border-radius-md);
    transition: all var(--transition-fast);
  }

  .transaction-item:hover {
    border-color: var(--color-primary);
    transform: translateX(4px);
  }

  .transaction__icon {
    width: 40px;
    height: 40px;
    border-radius: var(--border-radius-md);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: var(--font-size-lg);
    flex-shrink: 0;
  }

  .transaction__content {
    flex: 1;
    min-width: 0;
  }

  .transaction__header {
    display: flex;
    justify-content: space-between;
    align-items: start;
    gap: var(--spacing-md);
    margin-bottom: var(--spacing-xs);
  }

  .transaction__description {
    font-size: var(--font-size-base);
    font-weight: var(--font-weight-medium);
    color: var(--color-text-primary);
    flex: 1;
  }

  .transaction__amount {
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-semibold);
    white-space: nowrap;
  }

  .transaction__amount--positive {
    color: var(--color-success);
  }

  .transaction__amount--negative {
    color: var(--color-danger);
  }

  .transaction__meta {
    display: flex;
    gap: var(--spacing-md);
    font-size: var(--font-size-xs);
    color: var(--color-text-tertiary);
  }

  .transaction__category {
    padding: 2px 8px;
    background: var(--color-bg-tertiary);
    border-radius: var(--border-radius-sm);
  }
`;

if (!document.getElementById("history-styles")) {
  style.id = "history-styles";
  document.head.appendChild(style);
}
