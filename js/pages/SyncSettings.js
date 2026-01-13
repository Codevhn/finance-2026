/**
 * Sync Settings Page
 * Página de configuración de sincronización con Supabase
 */

import supabaseClient from "../storage/SupabaseClient.js";
import syncManager from "../storage/SyncManager.js";
import { DataMigration } from "../utils/DataMigration.js";
import toast from "../utils/Toast.js";
import confirmDialog from "../utils/ConfirmDialog.js";
import authManager from "../auth/AuthManager.js";

export async function renderSyncSettings() {
  const container = document.getElementById("main-content");

  const status = syncManager.getStatus();
  const clientConfigured = supabaseClient.isConnected();
  const isAuthenticated = authManager.isAuthenticated();
  const userEmail = authManager.getUser()?.email || "Sin sesión";
  const canSync = clientConfigured && isAuthenticated;

  container.innerHTML = `
    <div class="page-container">
      <div class="page-header">
        <h1 class="page-title">⚙️ Configuración de Sincronización</h1>
        <p class="page-subtitle">Gestiona la sincronización con Supabase</p>
      </div>

      <!-- Estado de Conexión -->
      <div class="card">
        <div class="card-header">
          <h2 class="card-title">Estado de Conexión</h2>
        </div>
        <div class="card-body">
          <div class="sync-status">
            <div class="status-item">
              <span class="status-label">Estado:</span>
              <span class="status-badge ${
                canSync ? "status-badge--success" : "status-badge--error"
              }">
                ${
                  canSync
                    ? "✅ Conectado"
                    : clientConfigured
                    ? "🔒 Inicia sesión"
                    : "⚠️ Sin credenciales"
                }
              </span>
            </div>

            <div class="status-item">
              <span class="status-label">Sesión:</span>
              <span class="status-value">${
                isAuthenticated ? `Activa (${userEmail})` : "No autenticado"
              }</span>
            </div>
            
            ${
              canSync
                ? `
              <div class="status-item">
                <span class="status-label">Sincronización automática:</span>
                <span class="status-badge ${
                  status.autoSyncEnabled
                    ? "status-badge--success"
                    : "status-badge--warning"
                }">
                  ${status.autoSyncEnabled ? "✅ Activa" : "⏸️ Pausada"}
                </span>
              </div>
              
              <div class="status-item">
                <span class="status-label">Última sincronización:</span>
                <span class="status-value">
                  ${
                    status.lastSyncTime
                      ? new Date(status.lastSyncTime).toLocaleString("es-MX")
                      : "Nunca"
                  }
                </span>
              </div>
              
              <div class="status-item">
                <span class="status-label">Intervalo:</span>
                <span class="status-value">Cada ${
                  status.syncIntervalMinutes
                } minutos</span>
              </div>
              
              <div class="status-item">
                <span class="status-label">Sincronizando:</span>
                <span class="status-value">${
                  status.isSyncing ? "🔄 Sí" : "No"
                }</span>
              </div>
            `
                : ""
            }
          </div>

          ${
            canSync
              ? `
            <div class="button-group">
              <button class="btn btn--primary" id="btn-sync-now" ${
                status.isSyncing ? "disabled" : ""
              }>
                🔄 Sincronizar Ahora
              </button>
              
              ${
                status.autoSyncEnabled
                  ? `
                <button class="btn btn--secondary" id="btn-pause-sync">
                  ⏸️ Pausar Sincronización
                </button>
              `
                  : `
                <button class="btn btn--success" id="btn-resume-sync">
                  ▶️ Reanudar Sincronización
                </button>
              `
              }
            </div>
          `
              : ""
          }
        </div>
      </div>

      <!-- Migración de Datos -->
      ${
        canSync
          ? `
        <div class="card">
          <div class="card-header">
            <h2 class="card-title">Migración de Datos</h2>
          </div>
          <div class="card-body">
            <p class="card-description">
              Migra todos tus datos locales de IndexedDB a Supabase. 
              Esto es útil si ya tienes datos guardados localmente.
            </p>
            
            <div id="migration-progress" style="display: none;">
              <div class="progress-bar">
                <div class="progress-fill" id="migration-progress-fill" style="width: 0%"></div>
              </div>
              <p class="progress-text" id="migration-progress-text">Preparando migración...</p>
            </div>

            <div class="button-group">
              <button class="btn btn--primary" id="btn-migrate-all">
                📤 Migrar Todos los Datos
              </button>
              <button class="btn btn--secondary" id="btn-download-backup">
                💾 Descargar Backup Local
              </button>
            </div>
          </div>
        </div>
      `
          : ""
      }

      <!-- Información -->
      <div class="card">
        <div class="card-header">
          <h2 class="card-title">ℹ️ Información</h2>
        </div>
        <div class="card-body">
          <div class="info-list">
            <div class="info-item">
              <strong>Modo Offline-First:</strong>
              <p>La aplicación funciona sin conexión. Los cambios se guardan localmente y se sincronizan cuando hay conexión.</p>
            </div>
            
            <div class="info-item">
              <strong>Sincronización Automática:</strong>
              <p>Los cambios se sincronizan automáticamente cada ${
                status.syncIntervalMinutes
              } minutos y al crear/editar/eliminar registros.</p>
            </div>
            
            <div class="info-item">
              <strong>Seguridad:</strong>
              <p>Las credenciales del proyecto se gestionan internamente y no se exponen en la interfaz.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Event Listeners
  setupEventListeners();
}

function setupEventListeners() {
  // Sincronizar ahora
  const btnSyncNow = document.getElementById("btn-sync-now");
  if (btnSyncNow) {
    btnSyncNow.addEventListener("click", async () => {
      btnSyncNow.disabled = true;
      btnSyncNow.textContent = "🔄 Sincronizando...";

      try {
        const result = await syncManager.syncAll();

        if (result.success) {
          toast.success(`Sincronización completada en ${result.duration}ms`);
          renderSyncSettings(); // Recargar página
        } else {
          toast.error("Error en sincronización: " + result.error);
        }
      } catch (error) {
        toast.error("Error: " + error.message);
      } finally {
        btnSyncNow.disabled = false;
        btnSyncNow.textContent = "🔄 Sincronizar Ahora";
      }
    });
  }

  // Pausar sincronización
  const btnPauseSync = document.getElementById("btn-pause-sync");
  if (btnPauseSync) {
    btnPauseSync.addEventListener("click", () => {
      syncManager.stopAutoSync();
      renderSyncSettings();
    });
  }

  // Reanudar sincronización
  const btnResumeSync = document.getElementById("btn-resume-sync");
  if (btnResumeSync) {
    btnResumeSync.addEventListener("click", () => {
      syncManager.startAutoSync();
      renderSyncSettings();
    });
  }

  // Migrar todos los datos
  const btnMigrateAll = document.getElementById("btn-migrate-all");
  if (btnMigrateAll) {
    btnMigrateAll.addEventListener("click", async () => {
      const confirmed = await confirmDialog.show(
        "¿Estás seguro de que quieres migrar todos los datos a Supabase?",
        {
          title: "Confirmar Migración",
          confirmText: "Sí, migrar",
          cancelText: "Cancelar",
          type: "warning",
        }
      );

      if (!confirmed) {
        return;
      }

      btnMigrateAll.disabled = true;
      const progressDiv = document.getElementById("migration-progress");
      const progressFill = document.getElementById("migration-progress-fill");
      const progressText = document.getElementById("migration-progress-text");

      progressDiv.style.display = "block";

      try {
        const migration = new DataMigration();

        // Actualizar progreso cada segundo
        const progressInterval = setInterval(() => {
          const status = migration.getStatus();
          progressFill.style.width = status.progress + "%";
          progressText.textContent = status.currentTable
            ? `Migrando ${status.currentTable}... ${status.progress}%`
            : `Progreso: ${status.progress}%`;
        }, 500);

        const result = await migration.migrateAll();

        clearInterval(progressInterval);
        progressFill.style.width = "100%";

        if (result.success) {
          progressText.textContent = "✅ Migración completada";
          toast.success("Migración completada exitosamente");
        } else {
          progressText.textContent = "❌ Error en migración";
          toast.error("Error en migración: " + result.error);
        }
      } catch (error) {
        toast.error("Error: " + error.message);
      } finally {
        btnMigrateAll.disabled = false;
        setTimeout(() => {
          progressDiv.style.display = "none";
        }, 3000);
      }
    });
  }

  // Descargar backup
  const btnDownloadBackup = document.getElementById("btn-download-backup");
  if (btnDownloadBackup) {
    btnDownloadBackup.addEventListener("click", async () => {
      btnDownloadBackup.disabled = true;
      btnDownloadBackup.textContent = "⏳ Generando...";

      try {
        const migration = new DataMigration();
        await migration.downloadBackup();
        toast.success("Backup descargado");
      } catch (error) {
        toast.error("Error: " + error.message);
      } finally {
        btnDownloadBackup.disabled = false;
        btnDownloadBackup.textContent = "💾 Descargar Backup Local";
      }
    });
  }
}
