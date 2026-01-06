/**
 * Topbar Component
 * Barra superior con título y acciones globales
 */

import { ThemeToggle } from "../utils/ThemeToggle.js";
import {
  notifyError,
  notifyInfo,
  notifySuccess,
  confirmDialog,
} from "./notifications.js";

export class Topbar {
  constructor() {
    this.container = document.getElementById("topbar");
    this.currentTitle = "Dashboard";
    this.themeToggle = new ThemeToggle();
  }

  render(title = "Dashboard") {
    this.currentTitle = title;

    this.container.innerHTML = `
      <div class="topbar__left">
        <button class="topbar__menu-btn" id="mobile-menu-btn">
          <span class="topbar__menu-icon">☰</span>
        </button>
        <h2 class="topbar__title">${title}</h2>
      </div>

      <div class="topbar__right">
        <button class="theme-toggle-btn" id="theme-toggle-btn" title="Cambiar tema">
          ${this.themeToggle.getTheme() === "light" ? "🌙" : "☀️"}
        </button>
        <button class="btn btn--secondary btn--sm" id="export-btn">
          <span>📥</span>
          <span>Exportar</span>
        </button>
        <button class="btn btn--secondary btn--sm" id="import-btn">
          <span>📤</span>
          <span>Importar</span>
        </button>
      </div>
    `;

    this.attachEventListeners();
    this.injectStyles();
  }

  attachEventListeners() {
    // Mobile menu toggle
    const menuBtn = this.container.querySelector("#mobile-menu-btn");
    if (menuBtn) {
      menuBtn.addEventListener("click", () => {
        const sidebar = document.getElementById("sidebar");
        sidebar.classList.toggle("is-open");
      });
    }

    // Theme toggle
    const themeBtn = this.container.querySelector("#theme-toggle-btn");
    if (themeBtn) {
      themeBtn.addEventListener("click", () => {
        this.themeToggle.toggle();
        themeBtn.textContent =
          this.themeToggle.getTheme() === "light" ? "🌙" : "☀️";
      });
    }

    // Export button
    const exportBtn = this.container.querySelector("#export-btn");
    if (exportBtn) {
      exportBtn.addEventListener("click", () => {
        this.handleExport();
      });
    }

    // Import button
    const importBtn = this.container.querySelector("#import-btn");
    if (importBtn) {
      importBtn.addEventListener("click", () => {
        this.handleImport();
      });
    }
  }

  async handleExport() {
    try {
      // Importar dinámicamente los repositorios
      const { default: db } = await import("../storage/db.js");
      const { default: goalRepository } = await import(
        "../storage/GoalRepository.js"
      );
      const { default: debtRepository } = await import(
        "../storage/DebtRepository.js"
      );
      const { default: savingRepository } = await import(
        "../storage/SavingRepository.js"
      );
      const { default: lotteryRepository } = await import(
        "../storage/LotteryRepository.js"
      );

      const data = {
        version: "1.0.0",
        exportDate: new Date().toISOString(),
        goals: await goalRepository.getAll(),
        debts: await debtRepository.getAll(),
        savings: await savingRepository.getAll(),
        lottery: await lotteryRepository.getInstance(),
      };

      const dataStr = JSON.stringify(data, null, 2);
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `finanzas-backup-${
        new Date().toISOString().split("T")[0]
      }.json`;
      a.click();

      URL.revokeObjectURL(url);

      notifySuccess("Datos exportados correctamente");
    } catch (error) {
      console.error("Error al exportar:", error);
      notifyError("Error al exportar los datos");
    }
  }

  handleImport() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";

    input.addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        const text = await file.text();
        const data = JSON.parse(text);

        const confirmed = await confirmDialog({
          title: "¿Importar datos?",
          message:
            "⚠️ Importar datos reemplazará toda la información actual. Esta acción no se puede deshacer.",
          confirmText: "Sí, reemplazar",
          cancelText: "Cancelar",
          type: "danger",
        });
        if (!confirmed) return;

        // Importar dinámicamente los repositorios
        const { default: goalRepository } = await import(
          "../storage/GoalRepository.js"
        );
        const { default: debtRepository } = await import(
          "../storage/DebtRepository.js"
        );
        const { default: savingRepository } = await import(
          "../storage/SavingRepository.js"
        );
        const { default: lotteryRepository } = await import(
          "../storage/LotteryRepository.js"
        );

        // Aquí se implementaría la lógica de importación
        // Por ahora solo mostramos confirmación
        console.log("Datos a importar:", data);
        notifyInfo("Datos importados correctamente (en desarrollo)");

        // Recargar la página para reflejar cambios
        window.location.reload();
      } catch (error) {
        console.error("Error al importar:", error);
        notifyError("Error al importar los datos. Verifica el archivo.");
      }
    });

    input.click();
  }

  updateTitle(title) {
    this.currentTitle = title;
    const titleElement = this.container.querySelector(".topbar__title");
    if (titleElement) {
      titleElement.textContent = title;
    }
  }

  injectStyles() {
    if (document.getElementById("topbar-styles")) return;

    const style = document.createElement("style");
    style.id = "topbar-styles";
    style.textContent = `
      .topbar__left {
        display: flex;
        align-items: center;
        gap: var(--spacing-md);
      }

      .topbar__menu-btn {
        display: none;
        background: none;
        border: none;
        color: var(--color-text-primary);
        cursor: pointer;
        padding: var(--spacing-sm);
        font-size: var(--font-size-xl);
        line-height: 1;
      }

      .topbar__menu-btn:hover {
        color: var(--color-primary);
      }

      .topbar__title {
        font-size: var(--font-size-xl);
        font-weight: var(--font-weight-semibold);
        color: var(--color-text-primary);
      }

      .topbar__right {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm);
        margin-left: auto;
      }

      .theme-toggle-btn {
        background: var(--color-bg-tertiary);
        border: 1px solid var(--color-border);
        border-radius: var(--border-radius-md);
        padding: var(--spacing-sm) var(--spacing-md);
        font-size: var(--font-size-xl);
        cursor: pointer;
        transition: all var(--transition-fast);
        display: flex;
        align-items: center;
        justify-content: center;
        min-width: 44px;
        height: 38px;
      }

      .theme-toggle-btn:hover {
        background: var(--color-bg-hover);
        border-color: var(--color-primary);
        transform: scale(1.05);
      }

      .theme-toggle-btn:active {
        transform: scale(0.95);
      }

      @media (max-width: 768px) {
        .topbar__menu-btn {
          display: block;
        }

        .topbar__title {
          font-size: var(--font-size-lg);
        }

        .topbar__right .btn span:last-child {
          display: none;
        }
      }
    `;

    document.head.appendChild(style);
  }
}
