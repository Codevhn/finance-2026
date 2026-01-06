/**
 * Sidebar Component
 * Navegación lateral con links a todas las páginas
 */

export class Sidebar {
  constructor() {
    this.container = document.getElementById("sidebar");
    this.currentRoute = window.location.hash || "#/dashboard";
  }

  render() {
    this.container.innerHTML = `
      <div class="sidebar__overlay" id="sidebar-overlay"></div>
      <div class="sidebar__content">
        <div class="sidebar__logo">
          <h1 class="sidebar__title">💰 Finanzas 2026</h1>
          <button class="sidebar__close-btn" id="sidebar-close-btn">×</button>
        </div>

        <nav class="sidebar__nav">
          <a href="#/dashboard" class="sidebar__link ${this.isActive(
            "#/dashboard"
          )}" data-route="dashboard">
            <span class="sidebar__icon">📊</span>
            <span class="sidebar__text">Dashboard</span>
          </a>

          <a href="#/goals" class="sidebar__link ${this.isActive(
            "#/goals"
          )}" data-route="goals">
            <span class="sidebar__icon">🎯</span>
            <span class="sidebar__text">Metas Mensuales</span>
          </a>

          <a href="#/debts" class="sidebar__link ${this.isActive(
            "#/debts"
          )}" data-route="debts">
            <span class="sidebar__icon">💳</span>
            <span class="sidebar__text">Deudas</span>
          </a>

          <a href="#/savings" class="sidebar__link ${this.isActive(
            "#/savings"
          )}" data-route="savings">
            <span class="sidebar__icon">🏦</span>
            <span class="sidebar__text">Ahorros</span>
          </a>

          <a href="#/lottery" class="sidebar__link ${this.isActive(
            "#/lottery"
          )}" data-route="lottery">
            <span class="sidebar__icon">🎰</span>
            <span class="sidebar__text">Lotería</span>
          </a>

          <a href="#/history" class="sidebar__link ${this.isActive(
            "#/history"
          )}" data-route="history">
            <span class="sidebar__icon">📜</span>
            <span class="sidebar__text">Historial</span>
          </a>

          <a href="#/reports" class="sidebar__link ${this.isActive(
            "#/reports"
          )}" data-route="reports">
            <span class="sidebar__icon">📈</span>
            <span class="sidebar__text">Reportes</span>
          </a>

          <a href="#/sync-settings" class="sidebar__link ${this.isActive(
            "#/sync-settings"
          )}" data-route="sync-settings">
            <span class="sidebar__icon">☁️</span>
            <span class="sidebar__text">Sincronización</span>
          </a>
        </nav>

        <div class="sidebar__footer">
          <div class="sidebar__version">v1.0.0</div>
        </div>
      </div>
    `;

    this.attachEventListeners();
    this.injectStyles();
  }

  isActive(route) {
    return this.currentRoute === route ? "sidebar__link--active" : "";
  }

  attachEventListeners() {
    // Close button
    const closeBtn = this.container.querySelector("#sidebar-close-btn");
    if (closeBtn) {
      closeBtn.addEventListener("click", () => {
        this.container.classList.remove("is-open");
      });
    }

    // Overlay click
    const overlay = this.container.querySelector("#sidebar-overlay");
    if (overlay) {
      overlay.addEventListener("click", () => {
        this.container.classList.remove("is-open");
      });
    }

    const links = this.container.querySelectorAll(".sidebar__link");
    links.forEach((link) => {
      link.addEventListener("click", (e) => {
        // Cerrar sidebar en móvil al hacer click en un link
        if (window.innerWidth <= 768) {
          this.container.classList.remove("is-open");
        }
        // Remover clase activa de todos
        links.forEach((l) => l.classList.remove("sidebar__link--active"));
        // Agregar clase activa al clickeado
        e.currentTarget.classList.add("sidebar__link--active");
      });
    });
  }

  injectStyles() {
    if (document.getElementById("sidebar-styles")) return;

    const style = document.createElement("style");
    style.id = "sidebar-styles";
    style.textContent = `
      .sidebar__content {
        display: flex;
        flex-direction: column;
        height: 100%;
      }

      .sidebar__logo {
        padding: var(--spacing-lg);
        border-bottom: 1px solid var(--color-border);
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      .sidebar__close-btn {
        display: none;
        background: none;
        border: none;
        color: var(--color-text-secondary);
        font-size: 2rem;
        cursor: pointer;
        line-height: 1;
        padding: var(--spacing-xs);
      }

      .sidebar__close-btn:hover {
        color: var(--color-text-primary);
      }

      .sidebar__overlay {
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(2px);
        z-index: -1;
      }

      @media (max-width: 768px) {
        .sidebar__close-btn {
          display: block;
        }

        .sidebar.is-open .sidebar__overlay {
          display: block;
        }
      }

      .sidebar__title {
        font-size: var(--font-size-xl);
        font-weight: var(--font-weight-bold);
        color: var(--color-text-primary);
      }

      .sidebar__nav {
        flex: 1;
        padding: var(--spacing-md) 0;
        overflow-y: auto;
      }

      .sidebar__link {
        display: flex;
        align-items: center;
        gap: var(--spacing-md);
        padding: var(--spacing-md) var(--spacing-lg);
        color: var(--color-text-secondary);
        text-decoration: none;
        transition: all var(--transition-fast);
        border-left: 3px solid transparent;
      }

      .sidebar__link:hover {
        background-color: var(--color-bg-hover);
        color: var(--color-text-primary);
      }

      .sidebar__link--active {
        background-color: var(--color-bg-hover);
        color: var(--color-primary);
        border-left-color: var(--color-primary);
      }

      .sidebar__icon {
        font-size: var(--font-size-xl);
        line-height: 1;
      }

      .sidebar__text {
        font-size: var(--font-size-sm);
        font-weight: var(--font-weight-medium);
      }

      .sidebar__footer {
        padding: var(--spacing-md) var(--spacing-lg);
        border-top: 1px solid var(--color-border);
      }

      .sidebar__version {
        font-size: var(--font-size-xs);
        color: var(--color-text-muted);
        text-align: center;
      }
    `;

    document.head.appendChild(style);
  }

  updateActive(route) {
    this.currentRoute = route;
    const links = this.container.querySelectorAll(".sidebar__link");
    links.forEach((link) => {
      const href = link.getAttribute("href");
      if (href === route) {
        link.classList.add("sidebar__link--active");
      } else {
        link.classList.remove("sidebar__link--active");
      }
    });
  }
}
