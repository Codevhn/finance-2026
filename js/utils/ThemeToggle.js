/**
 * Theme Toggle - Control de Tema Claro/Oscuro
 * Maneja el cambio entre temas y persistencia
 */

export class ThemeToggle {
  constructor() {
    this.currentTheme = this.loadTheme();
    this.applyTheme();
  }

  /**
   * Cargar tema guardado o usar por defecto
   */
  loadTheme() {
    const savedTheme = localStorage.getItem("theme");
    // Por defecto usar tema oscuro (el actual)
    return savedTheme || "dark";
  }

  /**
   * Alternar entre temas
   */
  toggle() {
    this.currentTheme = this.currentTheme === "light" ? "dark" : "light";
    this.applyTheme();
    this.saveTheme();
  }

  /**
   * Aplicar tema al documento
   */
  applyTheme() {
    document.documentElement.setAttribute("data-theme", this.currentTheme);
  }

  /**
   * Guardar tema en localStorage
   */
  saveTheme() {
    localStorage.setItem("theme", this.currentTheme);
  }

  /**
   * Obtener tema actual
   */
  getTheme() {
    return this.currentTheme;
  }

  /**
   * Renderizar botón de toggle
   */
  render() {
    const icon = this.currentTheme === "light" ? "🌙" : "☀️";
    const label = this.currentTheme === "light" ? "Modo Oscuro" : "Modo Claro";

    return `
      <button 
        class="theme-toggle" 
        onclick="window.themeToggle.toggle(); this.innerHTML = window.themeToggle.render();"
        title="${label}"
        aria-label="${label}"
      >
        ${icon}
      </button>
    `;
  }
}

// Instancia global
if (typeof window !== "undefined") {
  window.themeToggle = new ThemeToggle();
}
