/**
 * Toast Notification System
 * Sistema de notificaciones estilizado para la aplicación
 */

class ToastNotification {
  constructor() {
    this.container = null;
    this.init();
  }

  init() {
    // Crear contenedor de toasts si no existe
    if (!document.getElementById("toast-container")) {
      this.container = document.createElement("div");
      this.container.id = "toast-container";
      this.container.className = "toast-container";
      document.body.appendChild(this.container);
      this.injectStyles();
    } else {
      this.container = document.getElementById("toast-container");
    }
  }

  /**
   * Mostrar notificación
   * @param {string} message - Mensaje a mostrar
   * @param {string} type - Tipo: 'success', 'error', 'warning', 'info'
   * @param {number} duration - Duración en ms (default: 3000)
   */
  show(message, type = "info", duration = 3000) {
    const toast = document.createElement("div");
    toast.className = `toast toast--${type}`;

    const icon = this.getIcon(type);

    toast.innerHTML = `
      <div class="toast__icon">${icon}</div>
      <div class="toast__message">${message}</div>
      <button class="toast__close" aria-label="Cerrar">×</button>
    `;

    this.container.appendChild(toast);

    // Animación de entrada
    setTimeout(() => toast.classList.add("toast--show"), 10);

    // Botón de cerrar
    const closeBtn = toast.querySelector(".toast__close");
    closeBtn.addEventListener("click", () => this.hide(toast));

    // Auto-cerrar
    if (duration > 0) {
      setTimeout(() => this.hide(toast), duration);
    }

    return toast;
  }

  /**
   * Ocultar notificación
   * @param {HTMLElement} toast
   */
  hide(toast) {
    toast.classList.remove("toast--show");
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }

  /**
   * Obtener icono según el tipo
   * @param {string} type
   * @returns {string}
   */
  getIcon(type) {
    const icons = {
      success: "✅",
      error: "❌",
      warning: "⚠️",
      info: "ℹ️",
    };
    return icons[type] || icons.info;
  }

  /**
   * Atajos para tipos específicos
   */
  success(message, duration = 3000) {
    return this.show(message, "success", duration);
  }

  error(message, duration = 4000) {
    return this.show(message, "error", duration);
  }

  warning(message, duration = 3500) {
    return this.show(message, "warning", duration);
  }

  info(message, duration = 3000) {
    return this.show(message, "info", duration);
  }

  /**
   * Inyectar estilos CSS
   */
  injectStyles() {
    if (document.getElementById("toast-styles")) return;

    const style = document.createElement("style");
    style.id = "toast-styles";
    style.textContent = `
      .toast-container {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        display: flex;
        flex-direction: column;
        gap: 12px;
        pointer-events: none;
      }

      .toast {
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 300px;
        max-width: 500px;
        padding: 16px 20px;
        background: var(--color-bg-secondary, #ffffff);
        border-radius: 12px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15), 
                    0 0 0 1px rgba(0, 0, 0, 0.05);
        opacity: 0;
        transform: translateX(400px);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        pointer-events: auto;
      }

      .toast--show {
        opacity: 1;
        transform: translateX(0);
      }

      .toast__icon {
        font-size: 24px;
        line-height: 1;
        flex-shrink: 0;
      }

      .toast__message {
        flex: 1;
        font-size: 14px;
        line-height: 1.5;
        color: var(--color-text-primary, #1a1a1a);
      }

      .toast__close {
        background: none;
        border: none;
        color: var(--color-text-secondary, #666);
        font-size: 24px;
        line-height: 1;
        cursor: pointer;
        padding: 0;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
        transition: all 0.2s;
        flex-shrink: 0;
      }

      .toast__close:hover {
        background: rgba(0, 0, 0, 0.05);
        color: var(--color-text-primary, #1a1a1a);
      }

      /* Tipos de toast */
      .toast--success {
        border-left: 4px solid #10b981;
      }

      .toast--error {
        border-left: 4px solid #ef4444;
      }

      .toast--warning {
        border-left: 4px solid #f59e0b;
      }

      .toast--info {
        border-left: 4px solid #3b82f6;
      }

      /* Responsive */
      @media (max-width: 768px) {
        .toast-container {
          top: 10px;
          right: 10px;
          left: 10px;
        }

        .toast {
          min-width: auto;
          max-width: none;
        }
      }

      /* Dark mode support */
      @media (prefers-color-scheme: dark) {
        .toast {
          background: #2a2a2a;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3), 
                      0 0 0 1px rgba(255, 255, 255, 0.1);
        }

        .toast__message {
          color: #e5e5e5;
        }

        .toast__close {
          color: #999;
        }

        .toast__close:hover {
          background: rgba(255, 255, 255, 0.1);
          color: #fff;
        }
      }
    `;

    document.head.appendChild(style);
  }
}

// Singleton instance
const toast = new ToastNotification();

export default toast;
