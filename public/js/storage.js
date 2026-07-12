/* =====================================================
   MigraApp — public/js/storage.js
   API client + caché en memoria
   (reemplaza localStorage por llamadas al backend)
   ===================================================== */

const Storage = (() => {
  /* ─── Caché en memoria ─── */
  const _cache = {
    users:       [],
    migraines:   [],
    currentUser: null
  };

  /* ─── Helper fetch con manejo de errores ─── */
  async function _api(method, endpoint, body = null) {
    const opts = {
      method,
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' }
    };
    if (body !== null) opts.body = JSON.stringify(body);

    let res;
    try {
      res = await fetch('/api' + endpoint, opts);
    } catch (err) {
      throw new Error('No se pudo conectar con el servidor');
    }

    if (!res.ok) {
      let errData;
      try { errData = await res.json(); } catch { errData = { error: res.statusText }; }
      throw new Error(errData.error || `Error ${res.status}`);
    }

    // 204 No Content
    if (res.status === 204) return null;
    return res.json();
  }

  /* ─── Bootstrap: carga todos los datos del servidor ─── */
  async function bootstrap(user) {
    _cache.currentUser = user;

    if (user.role === 'admin') {
      const [users, migraines] = await Promise.all([
        _api('GET', '/users'),
        _api('GET', '/migraines')
      ]);
      _cache.users     = users     || [];
      _cache.migraines = migraines || [];
    } else {
      // Paciente solo ve sus propias migrañas
      _cache.users     = [user];
      const migraines  = await _api('GET', '/migraines');
      _cache.migraines = migraines || [];
    }
  }

  /* ─── Recargar datos de un usuario específico (admin) ─── */
  async function reloadUserMigraines(userId) {
    const migraines = await _api('GET', `/migraines?userId=${userId}`);
    // Reemplazar en caché
    _cache.migraines = _cache.migraines.filter(m => m.userId !== userId);
    _cache.migraines.push(...(migraines || []));
    return migraines;
  }

  /* ═══════════════════════════════════════════════════
     LECTURAS SÍNCRONAS (desde caché)
  ═══════════════════════════════════════════════════ */
  function getUsers()                { return _cache.users; }
  function getUserById(id)           { return _cache.users.find(u => u.id === id) || null; }
  function getUserByUsername(name)   { return _cache.users.find(u => u.username.toLowerCase() === name.toLowerCase()) || null; }
  function getMigraines(userId = null) {
    return userId ? _cache.migraines.filter(m => m.userId === userId) : _cache.migraines;
  }
  function getSession() { return _cache.currentUser; }

  /* ═══════════════════════════════════════════════════
     ESCRITURAS ASÍNCRONAS (API + actualizar caché)
  ═══════════════════════════════════════════════════ */

  /* ─── Usuarios ─── */
  async function addUser(data) {
    const user = await _api('POST', '/users', data);
    _cache.users.push(user);
    return user;
  }

  async function updateUser(id, updates) {
    const user = await _api('PUT', `/users/${id}`, updates);
    const idx = _cache.users.findIndex(u => u.id === id);
    if (idx !== -1) _cache.users[idx] = user;
    return user;
  }

  async function deleteUser(id) {
    await _api('DELETE', `/users/${id}`);
    _cache.users     = _cache.users.filter(u => u.id !== id);
    _cache.migraines = _cache.migraines.filter(m => m.userId !== id);
  }

  /* ─── Migrañas ─── */
  async function addMigraine(data) {
    const entry = await _api('POST', '/migraines', data);
    _cache.migraines.push(entry);
    return entry;
  }

  async function updateMigraine(id, updates) {
    const entry = await _api('PUT', `/migraines/${id}`, updates);
    const idx = _cache.migraines.findIndex(m => m.id === id);
    if (idx !== -1) _cache.migraines[idx] = entry;
    return entry;
  }

  async function deleteMigraine(id) {
    await _api('DELETE', `/migraines/${id}`);
    _cache.migraines = _cache.migraines.filter(m => m.id !== id);
  }

  /* ─── Sesión (solo gestión local de caché) ─── */
  function setSession(user)  { _cache.currentUser = user; }
  function clearSession()    {
    _cache.currentUser = null;
    _cache.users       = [];
    _cache.migraines   = [];
  }

  /* ─── Tema (sigue en localStorage: es preferencia de UI, no dato) ─── */
  function getTheme()   { return localStorage.getItem('migraapp_theme') || 'dark'; }
  function setTheme(t)  {
    localStorage.setItem('migraapp_theme', t);
    document.documentElement.setAttribute('data-theme', t === 'light' ? 'light' : '');
  }

  /* ─── Export / Import ─── */
  async function exportData() {
    const res = await fetch('/api/data/export', { credentials: 'same-origin' });
    if (!res.ok) throw new Error('Error al exportar datos');
    return res.text(); // JSON como string para crear el Blob
  }

  async function importData(jsonString) {
    const data = JSON.parse(jsonString);
    const result = await _api('POST', '/data/import', data);
    // Recargar caché completa tras importar
    await bootstrap(_cache.currentUser);
    return result;
  }

  /* ─── Stubs de compatibilidad (ya no usados en cliente) ─── */
  function verifyPassword() { return false; }
  function hashPassword(p)  { return p; }

  return {
    bootstrap, reloadUserMigraines,
    /* reads */
    getUsers, getUserById, getUserByUsername, getMigraines, getSession,
    /* writes - usuarios */
    addUser, updateUser, deleteUser,
    /* writes - migrañas */
    addMigraine, updateMigraine, deleteMigraine,
    /* sesión */
    setSession, clearSession,
    /* tema */
    getTheme, setTheme,
    /* export/import */
    exportData, importData,
    /* compatibilidad */
    verifyPassword, hashPassword,
    /* init no-op (se hace en el servidor) */
    init: () => {}
  };
})();
