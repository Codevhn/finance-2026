/**
 * Login Page
 * Pantalla de autenticación para proteger la aplicación
 */

import authManager from "../auth/AuthManager.js";
import supabaseClient from "../storage/SupabaseClient.js";
import toast from "../utils/Toast.js";

let authScreen = null;

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
  const credentialsOpen = !savedUrl || !savedKey;

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

        <details class="auth-card__credentials" ${credentialsOpen ? "open" : ""}>
          <summary>Configurar credenciales de Supabase</summary>
          <p class="form-hint">Estas credenciales se guardan solo en este navegador.</p>

          <div class="form-group">
            <label for="auth-supabase-url">URL del Proyecto</label>
            <input 
              type="url" 
              id="auth-supabase-url" 
              class="form-input" 
              placeholder="https://xxxxx.supabase.co"
              value="${savedUrl}"
              required
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
              required
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
    const supabaseUrl = document.getElementById("auth-supabase-url").value.trim();
    const supabaseKey = document
      .getElementById("auth-supabase-key")
      .value.trim();

    try {
      if (!supabaseUrl || !supabaseKey) {
        throw new Error("Configura la URL y la clave pública de Supabase");
      }

      supabaseClient.setCredentials(supabaseUrl, supabaseKey);
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
      background: linear-gradient(135deg, rgba(15, 23, 42, 0.9), rgba(30, 64, 175, 0.85));
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem 1rem;
      z-index: 9999;
    }

    .auth-card {
      width: 100%;
      max-width: 420px;
      background: rgba(255, 255, 255, 0.97);
      border-radius: 24px;
      padding: 2rem;
      box-shadow: 0 25px 50px -12px rgba(15, 23, 42, 0.45);
      position: relative;
    }

    body.dark-theme .auth-card {
      background: rgba(15, 23, 42, 0.9);
      color: #f1f5f9;
    }

    .auth-card__header h1 {
      margin: 0;
      font-size: 1.75rem;
      font-weight: 700;
    }

    .auth-card__header p {
      margin: 0.25rem 0 1.5rem;
      color: #475569;
    }

    body.dark-theme .auth-card__header p {
      color: #cbd5f5;
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
      border: 1px solid rgba(148, 163, 184, 0.4);
      border-radius: 12px;
      padding: 0.75rem 1rem;
      background: rgba(148, 163, 184, 0.1);
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
      border: 1px solid rgba(148, 163, 184, 0.6);
      font-size: 1rem;
      background: white;
    }

    body.dark-theme .auth-card .form-input {
      background: rgba(15, 23, 42, 0.7);
      color: #f8fafc;
      border-color: rgba(148, 163, 184, 0.3);
    }

    .auth-card .form-hint {
      font-size: 0.85rem;
      color: #64748b;
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
