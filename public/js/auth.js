/* =====================================================
   MigraApp — public/js/auth.js
   Autenticación via API REST (sesiones en servidor)
   ===================================================== */

const Auth = (() => {

  /* Login: llama a la API y hace bootstrap de la caché */
  async function login(username, password) {
    let res, data;
    try {
      res  = await fetch('/api/auth/login', {
        method:      'POST',
        credentials: 'same-origin',
        headers:     { 'Content-Type': 'application/json' },
        body:        JSON.stringify({ username, password })
      });
      data = await res.json();
    } catch {
      return { success: false, error: 'No se pudo conectar con el servidor' };
    }

    if (!res.ok) return { success: false, error: data.error || 'Error de autenticación' };

    Storage.setSession(data.user);
    await Storage.bootstrap(data.user);
    return { success: true, user: data.user };
  }

  /* Logout: destruye sesión en el servidor y limpia caché local */
  async function logout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
    } catch { /* ignorar errores de red en logout */ }
    Storage.clearSession();
  }

  /* Verificar si existe sesión activa al cargar la página */
  async function checkSession() {
    let res;
    try {
      res = await fetch('/api/auth/me', { credentials: 'same-origin' });
    } catch {
      return null;
    }
    if (!res.ok) return null;

    const user = await res.json();
    Storage.setSession(user);
    await Storage.bootstrap(user);
    return user;
  }

  /* Lecturas síncronas de caché (sin cambios respecto a v1) */
  function getCurrentUser() { return Storage.getSession(); }
  function isLoggedIn()     { return Storage.getSession() !== null; }
  function isAdmin()        { return Storage.getSession()?.role === 'admin'; }

  return { login, logout, checkSession, getCurrentUser, isLoggedIn, isAdmin };
})();
