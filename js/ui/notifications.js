const TOAST_TYPES = {
  info: { icon: "ℹ️" },
  success: { icon: "✅" },
  warning: { icon: "⚠️" },
  danger: { icon: "❌" },
};

let toastContainer = null;

function ensureToastContainer() {
  if (!toastContainer) {
    toastContainer = document.createElement("div");
    toastContainer.className = "toast-container";
    document.body.appendChild(toastContainer);
  }
  return toastContainer;
}

export function showToast({
  title = "",
  message = "",
  type = "info",
  duration = 4000,
} = {}) {
  const container = ensureToastContainer();
  const toast = document.createElement("div");
  const toastType = TOAST_TYPES[type] ? type : "info";
  toast.className = `toast toast--${toastType}`;

  toast.innerHTML = `
    <div class="toast__icon">${TOAST_TYPES[toastType].icon}</div>
    <div class="toast__content">
      ${title ? `<div class="toast__title">${title}</div>` : ""}
      <div class="toast__message">${message}</div>
    </div>
    <button class="toast__close" aria-label="Cerrar notificación">✕</button>
  `;

  const removeToast = () => {
    toast.classList.add("toast--hide");
    setTimeout(() => toast.remove(), 200);
  };

  toast.querySelector(".toast__close").addEventListener("click", removeToast);

  container.appendChild(toast);

  setTimeout(removeToast, duration);
}

export function notifySuccess(message, options = {}) {
  showToast({ title: "Éxito", message, type: "success", ...options });
}

export function notifyError(message, options = {}) {
  showToast({ title: "Error", message, type: "danger", ...options });
}

export function notifyInfo(message, options = {}) {
  showToast({ title: "Información", message, type: "info", ...options });
}

export function notifyWarning(message, options = {}) {
  showToast({ title: "Atención", message, type: "warning", ...options });
}

function createOverlay(content) {
  const overlay = document.createElement("div");
  overlay.className = "confirm-overlay";
  overlay.innerHTML = content;
  document.body.appendChild(overlay);
  return overlay;
}

export function confirmDialog({
  title = "¿Estás seguro?",
  message = "Confirma esta acción.",
  confirmText = "Aceptar",
  cancelText = "Cancelar",
  type = "warning",
} = {}) {
  return new Promise((resolve) => {
    const overlay = createOverlay(`
      <div class="confirm-modal">
        <div class="confirm-modal__header">
          <span class="confirm-modal__icon confirm-modal__icon--${type}">
            ${TOAST_TYPES[type]?.icon || TOAST_TYPES.warning.icon}
          </span>
          <h3 class="confirm-modal__title">${title}</h3>
        </div>
        <div class="confirm-modal__body">
          <p>${message}</p>
        </div>
        <div class="confirm-modal__footer">
          <button class="btn btn--secondary" data-action="cancel">${cancelText}</button>
          <button class="btn btn--${type === "danger" ? "danger" : "primary"}" data-action="confirm">${confirmText}</button>
        </div>
      </div>
    `);

    const cleanup = () => {
      overlay.classList.add("confirm-overlay--hide");
      setTimeout(() => overlay.remove(), 200);
    };

    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) {
        cleanup();
        resolve(false);
      }
    });

    overlay
      .querySelector('[data-action="cancel"]')
      .addEventListener("click", () => {
        cleanup();
        resolve(false);
      });

    overlay
      .querySelector('[data-action="confirm"]')
      .addEventListener("click", () => {
        cleanup();
        resolve(true);
      });

    document.body.appendChild(overlay);
  });
}

export function selectOptionDialog({
  title = "Selecciona una opción",
  message = "",
  options = [],
  confirmText = "Seleccionar",
  cancelText = "Cancelar",
} = {}) {
  return new Promise((resolve) => {
    if (!options.length) {
      resolve(null);
      return;
    }

    const optionsMarkup = options
      .map(
        (option, index) => `
        <label class="confirm-option">
          <input type="radio" name="confirm-option" value="${option.value}" ${
          index === 0 ? "checked" : ""
        }>
          <span>${option.label}</span>
        </label>
      `
      )
      .join("");

    const overlay = createOverlay(`
      <div class="confirm-modal">
        <div class="confirm-modal__header">
          <span class="confirm-modal__icon">${TOAST_TYPES.info.icon}</span>
          <h3 class="confirm-modal__title">${title}</h3>
        </div>
        <div class="confirm-modal__body">
          ${message ? `<p>${message}</p>` : ""}
          <div class="confirm-modal__options">
            ${optionsMarkup}
          </div>
        </div>
        <div class="confirm-modal__footer">
          <button class="btn btn--secondary" data-action="cancel">${cancelText}</button>
          <button class="btn btn--primary" data-action="confirm">${confirmText}</button>
        </div>
      </div>
    `);

    const cleanup = () => {
      overlay.classList.add("confirm-overlay--hide");
      setTimeout(() => overlay.remove(), 200);
    };

    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) {
        cleanup();
        resolve(null);
      }
    });

    overlay
      .querySelector('[data-action="cancel"]')
      .addEventListener("click", () => {
        cleanup();
        resolve(null);
      });

    overlay
      .querySelector('[data-action="confirm"]')
      .addEventListener("click", () => {
        const selected = overlay.querySelector(
          'input[name="confirm-option"]:checked'
        );
        cleanup();
        resolve(selected ? selected.value : null);
      });
  });
}
