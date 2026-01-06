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
          detectSessionInUrl: true,
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

    // Si ya había sesión previa, cerrarla para evitar inconsistencias
    if (this.client && this.client.auth) {
      this.client.auth.signOut().catch(() => {});
    }

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
      // Verificar sesión activa antes de consultar tablas protegidas
      const {
        data: { session },
        error: sessionError,
      } = await client.auth.getSession();

      if (sessionError) throw sessionError;

      if (!session) {
        console.warn(
          "⚠️ No hay sesión activa. Inicia sesión para verificar la conexión."
        );
        return false;
      }

      const { error } = await client
        .from("goals")
        .select("id", { head: true, count: "exact" })
        .limit(1);

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

  /**
   * Iniciar sesión
   * @param {string} email
   * @param {string} password
   */
  async signIn(email, password) {
    const client = this.getClient();
    if (!client) {
      throw new Error("Supabase no está configurado");
    }

    const { data, error } = await client.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw error;
    }

    return data;
  }

  /**
   * Cerrar sesión
   */
  async signOut() {
    const client = this.getClient();
    if (!client) return;
    const { error } = await client.auth.signOut();
    if (error) throw error;
  }

  /**
   * Obtener sesión actual
   * @returns {Promise<Object|null>}
   */
  async getSession() {
    const client = this.getClient();
    if (!client) return null;
    const {
      data: { session },
      error,
    } = await client.auth.getSession();
    if (error) throw error;
    return session;
  }

  /**
   * Escuchar cambios de autenticación
   * @param {Function} callback
   */
  onAuthStateChange(callback) {
    const client = this.getClient();
    if (!client || !client.auth) {
      console.warn("Supabase no inicializado, no se puede observar auth");
      return () => {};
    }

    const { data } = client.auth.onAuthStateChange((event, session) => {
      if (typeof callback === "function") {
        callback(event, session);
      }
    });

    return () => {
      data?.subscription?.unsubscribe();
    };
  }
}

// Singleton instance
const supabaseClient = new SupabaseClient();

export default supabaseClient;
