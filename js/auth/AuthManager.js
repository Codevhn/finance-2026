/**
 * Auth Manager
 * Maneja la sesión del usuario con Supabase Auth
 */

import supabaseClient from "../storage/SupabaseClient.js";

class AuthManager {
  constructor() {
    this.session = null;
    this.initialized = false;
    this.onChangeCallbacks = new Set();
    this.unsubscribe = null;
  }

  async init() {
    try {
      const session = await supabaseClient.getSession();
      this.session = session;
      this.initialized = true;
      this.registerListener();
      return this.session;
    } catch (error) {
      console.error("❌ Error inicializando autenticación:", error);
      return null;
    }
  }

  registerListener() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }

    this.unsubscribe = supabaseClient.onAuthStateChange((event, session) => {
      this.session = session;
      this.onChangeCallbacks.forEach((callback) => {
        try {
          callback(event, session);
        } catch (error) {
          console.error("Error en callback de auth:", error);
        }
      });
    });
  }

  onChange(callback) {
    if (typeof callback !== "function") return () => {};
    this.onChangeCallbacks.add(callback);

    // Enviar estado actual inmediatamente
    callback("INITIAL_SESSION", this.session);

    return () => {
      this.onChangeCallbacks.delete(callback);
    };
  }

  isAuthenticated() {
    return !!this.session;
  }

  getSession() {
    return this.session;
  }

  getUser() {
    return this.session?.user || null;
  }

  async signIn(email, password) {
    const data = await supabaseClient.signIn(email, password);
    this.session = data.session;
    this.registerListener();
    return this.session;
  }

  async signOut() {
    await supabaseClient.signOut();
    this.session = null;

    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }
}

const authManager = new AuthManager();

export default authManager;
