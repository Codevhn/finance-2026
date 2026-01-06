/**
 * Main Entry Point
 * Inicialización de la aplicación
 */

import db from "./storage/db.js";
import supabaseClient from "./storage/SupabaseClient.js";
import syncManager from "./storage/SyncManager.js";
import { Sidebar } from "./ui/Sidebar.js";
import { Topbar } from "./ui/Topbar.js";
import { Router } from "./router.js";
import { renderDashboard } from "./pages/Dashboard.js";
import { renderGoals } from "./pages/Goals.js";
import { renderDebts } from "./pages/Debts.js";
import { renderSavings } from "./pages/Savings.js";
import { renderLottery } from "./pages/Lottery.js";
import { renderHistory } from "./pages/History.js";
import { renderReports } from "./pages/Reports.js";
import { renderSyncSettings } from "./pages/SyncSettings.js";
import authManager from "./auth/AuthManager.js";
import { renderLogin } from "./pages/Login.js";

let appStarted = false;

async function startApplication() {
  if (appStarted) return;
  appStarted = true;

  try {
    console.log("🚀 Iniciando aplicación...");

    const appContainer = document.querySelector(".app-container");
    if (appContainer) {
      appContainer.style.removeProperty("display");
    }

    // Inicializar base de datos
    await db.init();

    // Inicializar Supabase (opcional, no bloquea la app)
    const supabase = supabaseClient.init();
    if (supabase) {
      console.log("☁️ Supabase configurado, iniciando sincronización...");
      syncManager.startAutoSync();
    } else {
      console.log("⚠️ Supabase no configurado, trabajando en modo offline");
    }

    // Renderizar UI base
    const sidebar = new Sidebar();
    sidebar.render();

    const topbar = new Topbar();
    topbar.render("Dashboard");

    // Configurar router
    const router = new Router();
    router.register("/dashboard", async () => {
      topbar.updateTitle("Dashboard");
      sidebar.updateActive("#/dashboard");
      await renderDashboard();
    });
    router.register("/goals", async () => {
      sidebar.updateActive("#/goals");
      await renderGoals();
    });
    router.register("/debts", async () => {
      sidebar.updateActive("#/debts");
      await renderDebts();
    });
    router.register("/savings", async () => {
      sidebar.updateActive("#/savings");
      await renderSavings();
    });
    router.register("/lottery", async () => {
      sidebar.updateActive("#/lottery");
      await renderLottery();
    });
    router.register("/history", async () => {
      sidebar.updateActive("#/history");
      await renderHistory();
    });
    router.register("/reports", async () => {
      sidebar.updateActive("#/reports");
      await renderReports();
    });
    router.register("/sync-settings", async () => {
      sidebar.updateActive("#/sync-settings");
      await renderSyncSettings();
    });

    // Iniciar router
    router.init();

    console.log("✅ Aplicación inicializada correctamente");
  } catch (error) {
    console.error("❌ Error al inicializar la aplicación:", error);
    document.getElementById("main-content").innerHTML = `
      <div class="page-container">
        <div class="empty-state">
          <div class="empty-state__icon">❌</div>
          <h2 class="empty-state__title">Error Fatal</h2>
          <p class="empty-state__description">No se pudo inicializar la aplicación: ${error.message}</p>
          <button class="btn btn--primary" onclick="window.location.reload()">Recargar</button>
        </div>
      </div>
    `;
    appStarted = false;
  }
}

// Inicializar aplicación con autenticación
async function init() {
  try {
    const session = await authManager.init();

    if (session) {
      await startApplication();
    } else {
      renderLogin(async () => {
        await startApplication();
      });
    }

    authManager.onChange((event, sessionState) => {
      if (event === "INITIAL_SESSION") return;
      if (!sessionState) {
        window.location.reload();
      }
    });
  } catch (error) {
    console.error("❌ Error al iniciar autenticación:", error);
    document.getElementById("main-content").innerHTML = `
      <div class="page-container">
        <div class="empty-state">
          <div class="empty-state__icon">❌</div>
          <h2 class="empty-state__title">Error de autenticación</h2>
          <p class="empty-state__description">No se pudo iniciar el sistema: ${error.message}</p>
        </div>
      </div>
    `;
  }
}

// Ejecutar cuando el DOM esté listo
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
