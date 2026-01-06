/**
 * Supabase Client Singleton
 * Gestiona la conexión con Supabase
 * Usa la librería cargada desde CDN (window.supabase)
 */

class SupabaseClient {
  constructor() {
    this.client = null;
    this.isInitialized = false;
  }

  /**
   * Inicializar cliente de Supabase
   * @returns {Object} Cliente de Supabase
   */
  init() {
    if (this.isInitialized) {
      return this.client;
    }

    // Verificar que Supabase esté cargado desde el CDN
    if (!window.supabase || !window.supabase.createClient) {
      console.warn(
        "⚠️ Librería de Supabase no cargada. Asegúrate de incluir el script CDN en index.html"
      );
      return null;
    }

    // Obtener credenciales del localStorage
    const supabaseUrl = localStorage.getItem("supabase_url");
    const supabaseKey = localStorage.getItem("supabase_key");

    if (!supabaseUrl || !supabaseKey) {
      console.warn("⚠️ Credenciales de Supabase no configuradas");
      return null;
    }

    try {
      this.client = window.supabase.createClient(supabaseUrl, supabaseKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
        realtime: {
          params: {
            eventsPerSecond: 10,
          },
        },
      });

      this.isInitialized = true;
      console.log("✅ Cliente de Supabase inicializado");
      return this.client;
    } catch (error) {
      console.error("❌ Error al inicializar Supabase:", error);
      return null;
    }
  }

  /**
   * Obtener cliente de Supabase
   * @returns {Object|null}
   */
  getClient() {
    if (!this.isInitialized) {
      return this.init();
    }
    return this.client;
  }

  /**
   * Verificar si está conectado
   * @returns {boolean}
   */
  isConnected() {
    return this.isInitialized && this.client !== null;
  }

  /**
   * Configurar credenciales manualmente
   * @param {string} url
   * @param {string} key
   */
  setCredentials(url, key) {
    localStorage.setItem("supabase_url", url);
    localStorage.setItem("supabase_key", key);
    this.isInitialized = false;
    this.client = null;
    return this.init();
  }

  /**
   * Probar conexión
   * @returns {Promise<boolean>}
   */
  async testConnection() {
    try {
      const client = this.getClient();
      if (!client) return false;

      // No necesitamos datos, solo confirmar que la tabla es accesible
      const { error } = await client
        .from("goals")
        .select("id", { head: true, count: "exact" });

      if (error) {
        console.error("❌ Error al probar conexión:", error);
        return false;
      }

      console.log("✅ Conexión a Supabase exitosa");
      return true;
    } catch (error) {
      console.error("❌ Error al probar conexión:", error);
      return false;
    }
  }
}

// Singleton instance
const supabaseClient = new SupabaseClient();

export default supabaseClient;
