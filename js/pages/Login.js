/**
 * Login Page
 * Pantalla de autenticación para proteger la aplicación
 */

import authManager from "../auth/AuthManager.js";
import supabaseClient from "../storage/SupabaseClient.js";
import toast from "../utils/Toast.js";

let authScreen = null;
let user = "codevhn@gmail.com";
let password = "@Fiurer2b2%@";

export function renderLogin(onSuccess) {
  const appContainer = document.querySelector(".app-container");
  if (appContainer) {
    appContainer.style.display = "none";
  }

  if (!authScreen) {
    authScreen = document.createElement("div");
    authScreen.id = "auth-screen";
    authScreen.className = "auth-screen";
    document.body.appendChild(authScreen);
  }

  const savedUrl = localStorage.getItem("supabase_url") || "";
  const savedKey = localStorage.getItem("supabase_key") || "";
  const needsCredentials = !savedUrl || !savedKey;
  const credentialsOpen = needsCredentials;

  authScreen.innerHTML = `
    <div class="auth-card">
      <div class="auth-card__header">
        <div>
          <h1>🔐 Acceso privado</h1>
          <p>Inicia sesión con tu cuenta de Supabase</p>
        </div>
      </div>

      <form id="auth-form">
        <div class="form-group">
          <label for="auth-email">Correo</label>
          <input 
            type="email" 
            id="auth-email" 
            class="form-input" 
            placeholder="tucorreo@dominio.com"
            autocomplete="email"
            required
          >
        </div>

        <div class="form-group">
          <label for="auth-password">Contraseña</label>
          <input 
            type="password" 
            id="auth-password" 
            class="form-input" 
            placeholder="••••••••"
            autocomplete="current-password"
            required
          >
        </div>

        <details class="auth-card__credentials" ${
          credentialsOpen ? "open" : ""
        }>
          <summary>Configuración avanzada de Supabase</summary>
          <p class="form-hint">
            Estas credenciales se guardan localmente. Solo necesitas
            cambiarlas si migras a otro proyecto; normalmente se administran
            desde Configuración → Sincronización después de iniciar sesión.
          </p>

          <div class="form-group">
            <label for="auth-supabase-url">URL del Proyecto</label>
            <input 
              type="url" 
              id="auth-supabase-url" 
              class="form-input" 
              placeholder="https://xxxxx.supabase.co"
              value="${savedUrl}"
              ${needsCredentials ? "required" : ""}
            >
          </div>

          <div class="form-group">
            <label for="auth-supabase-key">Clave pública (anon key)</label>
            <input 
              type="password" 
              id="auth-supabase-key" 
              class="form-input" 
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              value="${savedKey}"
              ${needsCredentials ? "required" : ""}
            >
          </div>
        </details>

        <button type="submit" class="btn btn--primary btn--full" id="auth-submit">
          Iniciar sesión
        </button>
      </form>
    </div>
  `;

  const form = document.getElementById("auth-form");
  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const submitBtn = document.getElementById("auth-submit");
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Ingresando...";
    }

    const email = document.getElementById("auth-email").value.trim();
    const password = document.getElementById("auth-password").value.trim();
    const supabaseUrl = document
      .getElementById("auth-supabase-url")
      .value.trim();
    const supabaseKey = document
      .getElementById("auth-supabase-key")
      .value.trim();

    try {
      if (needsCredentials && (!supabaseUrl || !supabaseKey)) {
        throw new Error(
          "Configura la URL y la clave pública de Supabase para continuar."
        );
      }

      if ((supabaseUrl && !supabaseKey) || (!supabaseUrl && supabaseKey)) {
        throw new Error(
          "Para actualizar la conexión necesitas ingresar URL y clave."
        );
      }

      const shouldUpdateCredentials =
        supabaseUrl &&
        supabaseKey &&
        (supabaseUrl !== savedUrl || supabaseKey !== savedKey);

      if (shouldUpdateCredentials) {
        supabaseClient.setCredentials(supabaseUrl, supabaseKey);
      } else if (!supabaseClient.isConnected()) {
        supabaseClient.init();
      }
      await authManager.signIn(email, password);

      toast.success("Bienvenido 👋");

      if (typeof onSuccess === "function") {
        await onSuccess();
      }

      hideLogin();
    } catch (error) {
      console.error("Error al iniciar sesión:", error);
      const message =
        error?.message ||
        "No se pudo iniciar sesión. Verifica tus credenciales.";
      toast.error(message);
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Iniciar sesión";
      }
    }
  });

  injectAuthStyles();
}

export function hideLogin() {
  if (authScreen) {
    authScreen.remove();
    authScreen = null;
  }

  const appContainer = document.querySelector(".app-container");
  if (appContainer) {
    appContainer.style.removeProperty("display");
  }
}

function injectAuthStyles() {
  if (document.getElementById("auth-styles")) return;

  const style = document.createElement("style");
  style.id = "auth-styles";
  style.textContent = `
    .auth-screen {
      position: fixed;
      inset: 0;
      background: linear-gradient(
          135deg,
          rgba(15, 23, 42, 0.92),
          rgba(59, 130, 246, 0.25)
        ),
        var(--color-bg-primary);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem 1rem;
      z-index: 9999;
    }

    .auth-card {
      width: 100%;
      max-width: 420px;
      background: var(--color-surface);
      color: var(--color-text-primary);
      border-radius: 24px;
      padding: 2.25rem;
      border: 1px solid var(--color-border);
      box-shadow: var(--shadow-xl);
      position: relative;
    }

    .auth-card__header h1 {
      margin: 0;
      font-size: 1.75rem;
      font-weight: 700;
    }

    .auth-card__header p {
      margin: 0.25rem 0 1.5rem;
      color: var(--color-text-secondary);
    }

    .auth-card form {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .auth-card .btn--full {
      width: 100%;
      margin-top: 0.5rem;
      padding: 0.9rem;
      font-size: 1rem;
    }

    .auth-card__credentials {
      border: 1px solid var(--color-border);
      border-radius: 12px;
      padding: 0.75rem 1rem;
      background: rgba(59, 130, 246, 0.05);
    }

    .auth-card__credentials summary {
      cursor: pointer;
      font-weight: 600;
      margin-bottom: 0.5rem;
    }

    .auth-card__credentials[open] {
      padding-bottom: 1rem;
    }

    .auth-card .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    .auth-card label {
      font-weight: 600;
    }

    .auth-card .form-input {
      padding: 0.75rem;
      border-radius: 12px;
      border: 1px solid var(--color-border);
      font-size: 1rem;
      background: var(--color-bg-tertiary);
      color: var(--color-text-primary);
    }

    .auth-card .form-hint {
      font-size: 0.85rem;
      color: var(--color-text-tertiary);
      margin: 0 0 0.5rem;
    }

    @media (max-width: 480px) {
      .auth-card {
        padding: 1.5rem;
        border-radius: 16px;
      }
    }
  `;

  document.head.appendChild(style);
}
