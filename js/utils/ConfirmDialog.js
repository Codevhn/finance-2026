/**
 * Confirmation Dialog Component
 * Diálogo de confirmación personalizado para reemplazar window.confirm()
 */

class ConfirmDialog {
  constructor() {
    this.overlay = null;
    this.dialog = null;
    this.resolveCallback = null;
  }

  /**
   * Mostrar diálogo de confirmación
   * @param {string} message - Mensaje a mostrar
   * @param {Object} options - Opciones de configuración
   * @returns {Promise<boolean>}
   */
  show(message, options = {}) {
    const {
      title = "¿Estás seguro?",
      confirmText = "Confirmar",
      cancelText = "Cancelar",
      type = "warning", // 'warning', 'danger', 'info'
    } = options;

    return new Promise((resolve) => {
      this.resolveCallback = resolve;
      this.createDialog(message, title, confirmText, cancelText, type);
    });
  }

  /**
   * Crear elementos del diálogo
   */
  createDialog(message, title, confirmText, cancelText, type) {
    // Crear overlay
    this.overlay = document.createElement("div");
    this.overlay.className = "confirm-overlay";

    // Crear diálogo
    this.dialog = document.createElement("div");
    this.dialog.className = `confirm-dialog confirm-dialog--${type}`;

    this.dialog.innerHTML = `
      <div class="confirm-dialog__header">
        <h3 class="confirm-dialog__title">${title}</h3>
      </div>
      <div class="confirm-dialog__body">
        <p class="confirm-dialog__message">${message}</p>
      </div>
      <div class="confirm-dialog__footer">
        <button class="btn btn--secondary" data-action="cancel">${cancelText}</button>
        <button class="btn btn--primary" data-action="confirm">${confirmText}</button>
      </div>
    `;

    this.overlay.appendChild(this.dialog);
    document.body.appendChild(this.overlay);

    // Inyectar estilos si no existen
    this.injectStyles();

    // Event listeners
    this.setupEventListeners();

    // Animación de entrada
    setTimeout(() => {
      this.overlay.classList.add("confirm-overlay--show");
      this.dialog.classList.add("confirm-dialog--show");
    }, 10);

    // Focus en botón de confirmar
    const confirmBtn = this.dialog.querySelector('[data-action="confirm"]');
    confirmBtn.focus();
  }

  /**
   * Configurar event listeners
   */
  setupEventListeners() {
    const confirmBtn = this.dialog.querySelector('[data-action="confirm"]');
    const cancelBtn = this.dialog.querySelector('[data-action="cancel"]');

    confirmBtn.addEventListener("click", () => this.close(true));
    cancelBtn.addEventListener("click", () => this.close(false));

    // Cerrar con overlay
    this.overlay.addEventListener("click", (e) => {
      if (e.target === this.overlay) {
        this.close(false);
      }
    });

    // Cerrar con ESC
    const handleEscape = (e) => {
      if (e.key === "Escape") {
        this.close(false);
        document.removeEventListener("keydown", handleEscape);
      }
    };
    document.addEventListener("keydown", handleEscape);
  }

  /**
   * Cerrar diálogo
   * @param {boolean} confirmed
   */
  close(confirmed) {
    this.overlay.classList.remove("confirm-overlay--show");
    this.dialog.classList.remove("confirm-dialog--show");

    setTimeout(() => {
      if (this.overlay && this.overlay.parentNode) {
        this.overlay.parentNode.removeChild(this.overlay);
      }
      if (this.resolveCallback) {
        this.resolveCallback(confirmed);
        this.resolveCallback = null;
      }
    }, 200);
  }

  /**
   * Inyectar estilos CSS
   */
  injectStyles() {
    if (document.getElementById("confirm-dialog-styles")) return;

    const style = document.createElement("style");
    style.id = "confirm-dialog-styles";
    style.textContent = `
      .confirm-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(4px);
        z-index: 10001;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        transition: opacity 0.2s ease;
      }

      .confirm-overlay--show {
        opacity: 1;
      }

      .confirm-dialog {
        background: var(--color-bg-secondary, #ffffff);
        border-radius: 16px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        max-width: 500px;
        width: 90%;
        transform: scale(0.9);
        opacity: 0;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      }

      .confirm-dialog--show {
        transform: scale(1);
        opacity: 1;
      }

      .confirm-dialog__header {
        padding: 24px 24px 16px;
        border-bottom: 1px solid var(--color-border, #e5e5e5);
      }

      .confirm-dialog__title {
        margin: 0;
        font-size: 20px;
        font-weight: 600;
        color: var(--color-text-primary, #1a1a1a);
      }

      .confirm-dialog__body {
        padding: 24px;
      }

      .confirm-dialog__message {
        margin: 0;
        font-size: 16px;
        line-height: 1.6;
        color: var(--color-text-secondary, #666);
      }

      .confirm-dialog__footer {
        padding: 16px 24px 24px;
        display: flex;
        gap: 12px;
        justify-content: flex-end;
      }

      .confirm-dialog__footer .btn {
        min-width: 100px;
      }

      /* Tipos de diálogo */
      .confirm-dialog--warning .confirm-dialog__header {
        border-left: 4px solid #f59e0b;
      }

      .confirm-dialog--danger .confirm-dialog__header {
        border-left: 4px solid #ef4444;
      }

      .confirm-dialog--info .confirm-dialog__header {
        border-left: 4px solid #3b82f6;
      }

      /* Dark mode */
      @media (prefers-color-scheme: dark) {
        .confirm-dialog {
          background: #2a2a2a;
        }

        .confirm-dialog__header {
          border-bottom-color: #444;
        }

        .confirm-dialog__title {
          color: #e5e5e5;
        }

        .confirm-dialog__message {
          color: #999;
        }
      }

      /* Responsive */
      @media (max-width: 768px) {
        .confirm-dialog {
          width: 95%;
        }

        .confirm-dialog__footer {
          flex-direction: column-reverse;
        }

        .confirm-dialog__footer .btn {
          width: 100%;
        }
      }
    `;

    document.head.appendChild(style);
  }
}

// Singleton instance
const confirmDialog = new ConfirmDialog();

export default confirmDialog;
