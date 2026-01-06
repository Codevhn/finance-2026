/**
 * Router - Sistema de enrutamiento SPA
 * Hash-based routing para navegación sin recarga
 */

export class Router {
  constructor() {
    this.routes = {};
    this.currentRoute = null;
    this.mainContent = document.getElementById("main-content");
  }

  /**
   * Registrar una ruta
   * @param {string} path - Ruta (ej: '/dashboard')
   * @param {Function} handler - Función que renderiza la página
   */
  register(path, handler) {
    this.routes[path] = handler;
  }

  /**
   * Inicializar el router
   */
  init() {
    // Escuchar cambios en el hash
    window.addEventListener("hashchange", () => this.handleRoute());

    // Manejar la ruta inicial
    this.handleRoute();
  }

  /**
   * Manejar el cambio de ruta
   */
  async handleRoute() {
    // Obtener la ruta del hash (ej: #/dashboard -> /dashboard)
    let path = window.location.hash.slice(1) || "/dashboard";

    // Si la ruta no existe, redirigir a dashboard
    if (!this.routes[path]) {
      path = "/dashboard";
      window.location.hash = "#/dashboard";
    }

    this.currentRoute = path;

    // Ejecutar el handler de la ruta
    try {
      await this.routes[path]();
    } catch (error) {
      console.error(`Error al cargar la ruta ${path}:`, error);
      this.renderError(error);
    }
  }

  /**
   * Navegar a una ruta programáticamente
   * @param {string} path
   */
  navigate(path) {
    window.location.hash = `#${path}`;
  }

  /**
   * Obtener la ruta actual
   * @returns {string}
   */
  getCurrentRoute() {
    return this.currentRoute;
  }

  /**
   * Renderizar página de error
   * @param {Error} error
   */
  renderError(error) {
    this.mainContent.innerHTML = `
      <div class="page-container">
        <div class="empty-state">
          <div class="empty-state__icon">⚠️</div>
          <h2 class="empty-state__title">Error al cargar la página</h2>
          <p class="empty-state__description">${error.message}</p>
          <button class="btn btn--primary" onclick="window.location.hash = '#/dashboard'">
            Volver al Dashboard
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Renderizar página de carga
   */
  renderLoading() {
    this.mainContent.innerHTML = `
      <div class="page-container">
        <div class="empty-state">
          <div class="empty-state__icon">⏳</div>
          <h2 class="empty-state__title">Cargando...</h2>
        </div>
      </div>
    `;
  }
}
