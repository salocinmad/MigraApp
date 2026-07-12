/* =====================================================
   MigraApp — public/js/app.js
   Router SPA, vistas, navegación principal
   v2: init async con checkSession, escrituras awaited
   ===================================================== */

const App = (() => {

  let currentView   = null;
  let currentUserId = null;
  let formState     = {};

  /* ═══════════════════════════════════════════════════
     INICIALIZACIÓN (async — verifica sesión en servidor)
  ═══════════════════════════════════════════════════ */
  async function init() {
    UI.initTheme();
    const splash = document.getElementById('app-loading');

    try {
      const user = await Auth.checkSession();
      if (user) {
        showApp();
        navigate('dashboard');
      } else {
        showLogin();
      }
    } catch (err) {
      console.error('[App] Error al verificar sesión:', err);
      showLogin();
    } finally {
      if (splash) {
        splash.classList.add('fade-out');
        setTimeout(() => splash.remove(), 400);
      }
    }
  }

  /* ═══════════════════════════════════════════════════
     LAYOUT
  ═══════════════════════════════════════════════════ */
  function showLogin() {
    const app = document.getElementById('app');
    app.innerHTML = `
      <div class="login-screen animate-fadeIn">
        <div class="login-logo">🧠</div>
        <div class="text-center mb-6">
          <h1 class="text-3xl font-extrabold gradient-text">MigraApp</h1>
          <p class="text-secondary text-sm mt-1">Registro y seguimiento de migrañas</p>
        </div>
        <div class="login-card">
          <div class="form-group">
            <label class="form-label" for="login-user">Usuario</label>
            <input class="form-input" type="text" id="login-user"
                   placeholder="Tu nombre de usuario" autocomplete="username" />
          </div>
          <div class="form-group">
            <label class="form-label" for="login-pass">Contraseña</label>
            <input class="form-input" type="password" id="login-pass"
                   placeholder="••••••••" autocomplete="current-password" />
            <div id="login-error" class="form-error hidden"></div>
          </div>
          <button class="btn btn-primary btn-lg mt-2" id="login-btn">Entrar</button>
        </div>
        <p class="text-muted text-xs mt-6 text-center">MigraApp v2.0 — SQLite + Docker</p>
      </div>
    `;

    const loginBtn  = document.getElementById('login-btn');
    const userInput = document.getElementById('login-user');
    const passInput = document.getElementById('login-pass');
    const errorEl   = document.getElementById('login-error');

    const doLogin = async () => {
      const username = userInput.value.trim();
      const password = passInput.value;
      if (!username || !password) {
        errorEl.textContent = 'Completa usuario y contraseña';
        errorEl.classList.remove('hidden');
        return;
      }
      UI.setLoading(loginBtn, true);
      const result = await Auth.login(username, password);
      UI.setLoading(loginBtn, false);

      if (result.success) {
        showApp();
        navigate('dashboard');
      } else {
        errorEl.textContent = result.error;
        errorEl.classList.remove('hidden');
        passInput.value = '';
        passInput.focus();
      }
    };

    loginBtn.addEventListener('click', doLogin);
    passInput.addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
    userInput.addEventListener('keydown', e => { if (e.key === 'Enter') passInput.focus(); });
    userInput.focus();
  }

  function showApp() {
    const user = Auth.getCurrentUser();
    currentUserId = user?.id;

    document.getElementById('app').innerHTML = `
      <div id="view-wrapper" class="view-wrapper">
        <div id="view-content" class="animate-fadeIn"></div>
      </div>
      <nav class="bottom-nav" id="bottom-nav">${buildNav()}</nav>
    `;

    bindNav();
  }

  function buildNav() {
    const isAdmin = Auth.isAdmin();
    return `
      <button class="nav-item" data-view="dashboard" aria-label="Inicio">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
        <span>Inicio</span>
      </button>
      <button class="nav-item" data-view="history" aria-label="Historial">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8"  y1="2" x2="8"  y2="6"/>
          <line x1="3"  y1="10" x2="21" y2="10"/>
        </svg>
        <span>Historial</span>
      </button>
      <button class="nav-fab" data-view="register" aria-label="Registrar migraña">
        <div class="nav-fab-circle">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5"  y1="12" x2="19" y2="12"/>
          </svg>
        </div>
        <span>Registrar</span>
      </button>
      <button class="nav-item" data-view="report" aria-label="Informe PDF">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
        </svg>
        <span>Informe</span>
      </button>
      ${isAdmin ? `
      <button class="nav-item" data-view="admin" aria-label="Administración">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 00-3-3.87"/>
          <path d="M16 3.13a4 4 0 010 7.75"/>
        </svg>
        <span>Admin</span>
      </button>` : `
      <button class="nav-item" id="logout-nav-btn" aria-label="Cerrar sesión">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
          <polyline points="16 17 21 12 16 7"/>
          <line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
        <span>Salir</span>
      </button>`}
    `;
  }

  function bindNav() {
    document.querySelectorAll('[data-view]').forEach(btn => {
      btn.addEventListener('click', () => navigate(btn.dataset.view));
    });
    document.getElementById('logout-nav-btn')?.addEventListener('click', logout);
  }

  function setActiveNav(view) {
    document.querySelectorAll('.nav-item, .nav-fab').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === view);
    });
  }

  /* ═══════════════════════════════════════════════════
     ROUTER
  ═══════════════════════════════════════════════════ */
  function navigate(view, param1 = null, param2 = null) {
    if (!Auth.isLoggedIn()) { showLogin(); return; }
    currentView = view;
    setActiveNav(view);
    UI.scrollTop();
    const content = document.getElementById('view-content');
    if (content) content.className = 'animate-fadeIn';

    switch (view) {
      case 'dashboard': Dashboard.render(currentUserId); break;
      case 'history':   renderHistory();                 break;
      case 'register':  renderRegister(param1, param2);  break;
      case 'report':    renderReport();                  break;
      case 'admin':     Auth.isAdmin() ? renderAdmin() : navigate('dashboard'); break;
      default:          Dashboard.render(currentUserId);
    }
  }

  /* ═══════════════════════════════════════════════════
     VISTA: HISTORIAL
  ═══════════════════════════════════════════════════ */
  function renderHistory() {
    const content = document.getElementById('view-content');
    const entries = Migraine.getEntries(currentUserId).reverse();

    content.innerHTML = `
      <div class="page-header">
        <h1>Historial</h1>
        <div class="header-actions">
          <button class="theme-toggle" id="hist-theme-btn">
            ${Storage.getTheme() === 'light' ? '🌙' : '☀️'}
          </button>
        </div>
      </div>
      <div id="calendar-root" class="mb-4"></div>
      <div class="section">
        <div class="section-title">Todos los registros (${entries.length})</div>
        ${entries.length === 0
          ? `<div class="empty-state">
               <div class="empty-state-icon">📅</div>
               <div class="empty-state-title">Sin registros</div>
               <div class="empty-state-desc">Registra tu primera migraña con el botón +</div>
             </div>`
          : `<div class="entry-list" id="history-list"></div>`}
      </div>
    `;

    Calendar.init(currentUserId, (date, entry) => {
      if (entry) {
        setTimeout(() => {
          const el = document.querySelector(`[data-id="${entry.id}"]`);
          if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.click(); }
        }, 100);
      } else {
        navigate('register', date);
      }
    });
    Calendar.render('calendar-root');

    if (entries.length > 0) {
      Dashboard.renderEntryList(entries, document.getElementById('history-list'), true);
    }

    document.getElementById('hist-theme-btn')?.addEventListener('click', () => {
      const next = UI.toggleTheme();
      document.getElementById('hist-theme-btn').textContent = next === 'light' ? '🌙' : '☀️';
    });
  }

  /* ═══════════════════════════════════════════════════
     VISTA: REGISTRO DE MIGRAÑA
  ═══════════════════════════════════════════════════ */
  function renderRegister(prefillDate = null, editId = null) {
    const content  = document.getElementById('view-content');
    const today    = UI.todayStr();
    const isEdit   = !!editId;
    const existing = editId ? Storage.getMigraines(currentUserId).find(m => m.id === editId) : null;

    formState = {
      date:             existing?.date             || prefillDate || today,
      fromPrevious:     existing?.fromPrevious     ?? false,
      intensity:        existing?.intensity        ?? 5,
      neuralgia:        existing?.neuralgia        ?? false,
      photosensitivity: existing?.photosensitivity ?? false,
      medication:       existing?.medication       || '',
      notes:            existing?.notes            || ''
    };

    content.innerHTML = `
      <div class="page-header">
        <div>
          <div class="text-xs text-muted">${isEdit ? 'Editando registro' : 'Nuevo registro'}</div>
          <h1>${isEdit ? 'Editar migraña' : 'Registrar migraña'}</h1>
        </div>
        <button class="btn btn-ghost btn-icon" id="reg-close-btn" aria-label="Cancelar">✕</button>
      </div>

      <div class="section">
        <div class="form-group">
          <label class="form-label">📅 Fecha</label>
          <div class="input-with-btn">
            <input type="date" class="form-input" id="reg-date"
                   value="${formState.date}" max="${today}" />
            <button type="button" class="btn btn-secondary" id="reg-today-btn">Hoy</button>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">🔗 ¿Viene de la migraña anterior?</label>
          <div class="from-prev-group">
            <button type="button" class="from-prev-btn yes ${formState.fromPrevious ? 'active' : ''}" id="fprev-yes">
              <span>Sí</span>
              <span class="from-prev-label">Continúa del episodio anterior</span>
            </button>
            <button type="button" class="from-prev-btn no ${!formState.fromPrevious ? 'active' : ''}" id="fprev-no">
              <span>No</span>
              <span class="from-prev-label">Nuevo episodio</span>
            </button>
          </div>
          <div id="episode-info"></div>
        </div>

        <div class="form-group">
          <label class="form-label">🌡️ Intensidad del dolor</label>
          <div id="intensity-picker-container"></div>
        </div>

        <div class="form-group">
          <label class="form-label">🩺 Síntomas acompañantes</label>
          <div class="toggle-group">
            <button type="button" class="toggle-btn ${formState.neuralgia ? 'active' : ''}" id="toggle-neuralgia">
              <span class="toggle-icon">⚡</span>
              <span>Neuralgia</span>
            </button>
            <button type="button" class="toggle-btn ${formState.photosensitivity ? 'active' : ''}" id="toggle-photo">
              <span class="toggle-icon">☀️</span>
              <span>Fotosensibilidad</span>
            </button>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">💊 Medicación tomada
            <span class="text-muted font-normal">(opcional)</span>
          </label>
          <input type="text" class="form-input" id="reg-medication"
                 placeholder="p.ej. Ibuprofeno, Triptán..." value="${formState.medication}" />
        </div>

        <div class="form-group">
          <label class="form-label">📝 Notas
            <span class="text-muted font-normal">(opcional)</span>
          </label>
          <textarea class="form-input" id="reg-notes"
                    placeholder="Anotaciones adicionales, posibles desencadenantes...">${formState.notes}</textarea>
        </div>

        <div id="reg-error" class="form-error hidden mb-3"></div>
        <button class="btn btn-primary btn-lg" id="reg-submit-btn">
          ${isEdit ? '💾 Guardar cambios' : '✅ Registrar migraña'}
        </button>
        ${isEdit ? `<button class="btn btn-danger btn-lg mt-2" id="reg-delete-btn">🗑 Eliminar este registro</button>` : ''}
        <div style="height:8px"></div>
      </div>
    `;

    UI.renderIntensityPicker('intensity-picker-container', formState.intensity, val => {
      formState.intensity = val;
    });

    updateEpisodeInfo();

    document.getElementById('reg-close-btn').addEventListener('click', () => navigate('history'));
    document.getElementById('reg-today-btn').addEventListener('click', () => {
      document.getElementById('reg-date').value = today;
      formState.date = today;
      updateEpisodeInfo();
    });
    document.getElementById('reg-date').addEventListener('change', e => {
      formState.date = e.target.value;
      updateEpisodeInfo();
    });
    document.getElementById('fprev-yes').addEventListener('click', () => setFromPrev(true));
    document.getElementById('fprev-no').addEventListener('click',  () => setFromPrev(false));
    document.getElementById('toggle-neuralgia').addEventListener('click', e => {
      formState.neuralgia = !formState.neuralgia;
      e.currentTarget.classList.toggle('active', formState.neuralgia);
    });
    document.getElementById('toggle-photo').addEventListener('click', e => {
      formState.photosensitivity = !formState.photosensitivity;
      e.currentTarget.classList.toggle('active', formState.photosensitivity);
    });

    document.getElementById('reg-submit-btn').addEventListener('click', () => submitRegister(isEdit, editId));
    document.getElementById('reg-delete-btn')?.addEventListener('click', () => {
      UI.confirm('¿Eliminar este registro de migraña? Esta acción no se puede deshacer.', () => {
        deleteEntry(editId);
      });
    });
  }

  function setFromPrev(value) {
    formState.fromPrevious = value;
    document.getElementById('fprev-yes').classList.toggle('active', value);
    document.getElementById('fprev-no').classList.toggle('active', !value);
    updateEpisodeInfo();
  }

  function updateEpisodeInfo() {
    const infoEl = document.getElementById('episode-info');
    if (!infoEl || !formState.date) return;

    const { duration, episodeStartDate, prevEntry } = Migraine.previewDuration(
      currentUserId, formState.date, formState.fromPrevious
    );

    if (formState.fromPrevious && prevEntry) {
      infoEl.innerHTML = `
        <div class="episode-info-card">
          <div class="episode-days">${duration}</div>
          <div class="episode-text">
            <strong>días de episodio</strong><br>
            Desde el <strong>${UI.formatDateShort(episodeStartDate)}</strong>
            ${duration > 1 ? `(incluye ${duration - 1} día${duration > 2 ? 's' : ''} anterior${duration > 2 ? 'es' : ''})` : ''}
          </div>
        </div>`;
    } else if (formState.fromPrevious && !prevEntry) {
      infoEl.innerHTML = `
        <div class="episode-info-card" style="background:var(--danger-bg);border-color:rgba(239,68,68,.3)">
          <span>⚠️</span>
          <div class="episode-text" style="color:var(--danger)">
            No se encontró episodio anterior. Se registrará como nuevo episodio.
          </div>
        </div>`;
    } else {
      infoEl.innerHTML = `
        <div class="episode-info-card" style="background:var(--success-bg);border-color:rgba(16,185,129,.3)">
          <span style="color:var(--success)">🆕</span>
          <div class="episode-text" style="color:var(--success)">Nuevo episodio de migraña</div>
        </div>`;
    }
  }

  async function submitRegister(isEdit, editId) {
    const btn     = document.getElementById('reg-submit-btn');
    const errorEl = document.getElementById('reg-error');
    errorEl.classList.add('hidden');

    formState.date       = document.getElementById('reg-date').value;
    formState.medication = document.getElementById('reg-medication').value;
    formState.notes      = document.getElementById('reg-notes').value;

    if (!formState.date) {
      errorEl.textContent = 'Selecciona una fecha';
      errorEl.classList.remove('hidden');
      return;
    }

    UI.setLoading(btn, true);
    try {
      if (isEdit) {
        await Migraine.updateEntry(editId, formState);
        UI.toast('Registro actualizado correctamente', 'success');
      } else {
        await Migraine.addEntry(currentUserId, formState);
        UI.toast('Migraña registrada correctamente', 'success');
      }
      navigate('history');
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.classList.remove('hidden');
      UI.setLoading(btn, false);
    }
  }

  /* ═══════════════════════════════════════════════════
     VISTA: INFORME PDF
  ═══════════════════════════════════════════════════ */
  function renderReport() {
    const content = document.getElementById('view-content');
    const { startDate: s3m, endDate } = Migraine.getDateRangeLastMonths(3);
    const today = UI.todayStr();

    content.innerHTML = `
      <div class="page-header">
        <h1>Informe PDF</h1>
        <div class="header-actions">
          <button class="theme-toggle" id="rep-theme-btn">
            ${Storage.getTheme() === 'light' ? '🌙' : '☀️'}
          </button>
        </div>
      </div>
      <div class="section">
        ${Auth.isAdmin() ? `
        <div class="form-group">
          <label class="form-label">👤 Paciente</label>
          <select class="form-input" id="rep-user-select">
            ${Storage.getUsers().map(u => `
              <option value="${u.id}" ${u.id === currentUserId ? 'selected' : ''}>
                ${u.displayName || u.username}${u.role === 'admin' ? ' (Admin)' : ''}
              </option>`).join('')}
          </select>
        </div>` : ''}

        <div class="form-group">
          <label class="form-label">📅 Rango de fechas</label>
          <button class="btn btn-secondary w-full mb-3" id="rep-3m-btn">
            📆 Últimos 3 meses
          </button>
          <div class="date-range-grid">
            <div>
              <label class="form-label">Desde</label>
              <input type="date" class="form-input" id="rep-start" value="${s3m}" max="${today}" />
            </div>
            <div>
              <label class="form-label">Hasta</label>
              <input type="date" class="form-input" id="rep-end" value="${today}" max="${today}" />
            </div>
          </div>
        </div>

        <div id="report-preview" class="report-summary-card mb-4 hidden"></div>
        <button class="btn btn-primary btn-lg" id="rep-preview-btn">👁 Ver resumen</button>
        <button class="btn btn-secondary btn-lg mt-2 hidden" id="rep-generate-btn">📄 Generar PDF</button>
        <div style="height:8px"></div>
      </div>
    `;

    const getStart = () => document.getElementById('rep-start').value;
    const getEnd   = () => document.getElementById('rep-end').value;
    const getUser  = () => document.getElementById('rep-user-select')?.value || currentUserId;

    document.getElementById('rep-3m-btn').addEventListener('click', () => {
      const { startDate, endDate } = Migraine.getDateRangeLastMonths(3);
      document.getElementById('rep-start').value = startDate;
      document.getElementById('rep-end').value   = endDate;
    });

    document.getElementById('rep-preview-btn').addEventListener('click', () => {
      const start = getStart(), end = getEnd(), uid = getUser();
      if (!start || !end || start > end) {
        UI.toast('Selecciona un rango de fechas válido', 'warning');
        return;
      }
      const stats = Migraine.getStats(uid, start, end);
      const previewEl = document.getElementById('report-preview');
      const genBtn    = document.getElementById('rep-generate-btn');
      previewEl.innerHTML = `
        <div class="text-sm font-semibold mb-3 text-accent">Resumen del período</div>
        <div class="report-summary-row"><span>Días con migraña</span><span class="report-summary-value">${stats.totalDays}</span></div>
        <div class="report-summary-row"><span>Episodios totales</span><span class="report-summary-value">${stats.totalEpisodes}</span></div>
        <div class="report-summary-row"><span>Intensidad media</span><span class="report-summary-value">${stats.avgIntensity || '—'}/10</span></div>
        <div class="report-summary-row"><span>Episodio más largo</span><span class="report-summary-value">${stats.longestEpisode} días</span></div>
        <div class="report-summary-row"><span>Con neuralgia</span><span class="report-summary-value">${stats.neuralgiaPercent}%</span></div>
        <div class="report-summary-row"><span>Con fotosensibilidad</span><span class="report-summary-value">${stats.photoPercent}%</span></div>
      `;
      previewEl.classList.remove('hidden');
      genBtn.classList.remove('hidden');
    });

    document.getElementById('rep-generate-btn').addEventListener('click', () => {
      PDFReport.generate(getUser(), getStart(), getEnd());
    });

    document.getElementById('rep-theme-btn')?.addEventListener('click', () => {
      const next = UI.toggleTheme();
      document.getElementById('rep-theme-btn').textContent = next === 'light' ? '🌙' : '☀️';
    });
  }

  /* ═══════════════════════════════════════════════════
     VISTA: ADMIN
  ═══════════════════════════════════════════════════ */
  function renderAdmin() {
    const content = document.getElementById('view-content');
    const users   = Storage.getUsers();

    content.innerHTML = `
      <div class="page-header">
        <h1>Administración</h1>
        <div class="header-actions">
          <button class="btn btn-primary btn-sm" id="admin-add-btn">+ Usuario</button>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Usuarios (${users.length})</div>
        <div class="user-list" id="user-list"></div>
      </div>

      <div class="section">
        <div class="section-title">Datos de la aplicación</div>
        <div class="card">
          <p class="text-sm text-secondary mb-4">
            Exporta todos los datos como JSON o importa un respaldo previo.
          </p>
          <div class="flex gap-3">
            <button class="btn btn-secondary flex-1" id="export-btn">📤 Exportar</button>
            <button class="btn btn-secondary flex-1" id="import-btn">📥 Importar</button>
          </div>
          <input type="file" id="import-file-input" accept=".json" class="hidden" />
          <div id="import-note" class="form-hint hidden mt-3"></div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Ver datos de paciente</div>
        <div class="card">
          <label class="form-label">Seleccionar paciente</label>
          <select class="form-input mb-3" id="admin-view-user">
            ${users.map(u =>
              `<option value="${u.id}" ${u.id === currentUserId ? 'selected' : ''}>
                ${u.displayName || u.username}
              </option>`
            ).join('')}
          </select>
          <button class="btn btn-primary w-full" id="admin-view-btn">Ver datos</button>
        </div>
      </div>

      <div class="section">
        <button class="btn btn-danger w-full" id="logout-btn">🚪 Cerrar sesión</button>
        <div style="height:8px"></div>
      </div>
    `;

    renderUserList(users);

    document.getElementById('admin-add-btn').addEventListener('click', showAddUserModal);
    document.getElementById('logout-btn').addEventListener('click', logout);

    // Exportar
    document.getElementById('export-btn').addEventListener('click', async () => {
      try {
        const data = await Storage.exportData();
        const blob = new Blob([data], { type: 'application/json' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = `MigraApp_backup_${UI.todayStr()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        UI.toast('Datos exportados correctamente', 'success');
      } catch (err) {
        UI.toast('Error al exportar: ' + err.message, 'error');
      }
    });

    // Importar
    document.getElementById('import-btn').addEventListener('click', () => {
      document.getElementById('import-file-input').click();
    });
    document.getElementById('import-file-input').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      UI.confirm(`¿Importar "${file.name}"? Esto sobreescribirá TODOS los datos actuales.`, async () => {
        try {
          const text   = await file.text();
          const result = await Storage.importData(text);
          const noteEl = document.getElementById('import-note');
          if (noteEl && result.note) {
            noteEl.textContent = '⚠️ ' + result.note;
            noteEl.classList.remove('hidden');
          }
          UI.toast(result.message || 'Datos importados correctamente', 'success');
          setTimeout(() => renderAdmin(), 500);
        } catch (err) {
          UI.toast('Error al importar: ' + err.message, 'error');
        }
      });
    });

    // Ver datos de paciente
    document.getElementById('admin-view-btn').addEventListener('click', async () => {
      const uid  = document.getElementById('admin-view-user').value;
      currentUserId = uid;
      // Si las migrañas de ese usuario no están en caché, cargarlas
      const cached = Storage.getMigraines(uid);
      if (cached.length === 0) {
        await Storage.reloadUserMigraines(uid);
      }
      navigate('dashboard');
      UI.toast(`Viendo datos de: ${Storage.getUserById(uid)?.displayName || uid}`, 'info');
    });
  }

  function renderUserList(users) {
    const list = document.getElementById('user-list');
    if (!list) return;
    list.innerHTML = users.map(u => `
      <div class="user-item" id="user-row-${u.id}">
        <div class="user-avatar">${UI.avatarInitial(u.displayName || u.username)}</div>
        <div class="user-info">
          <div class="user-name">${u.displayName || u.username}</div>
          <span class="user-role">${u.role === 'admin' ? '⭐ Admin' : '👤 Paciente'}</span>
        </div>
        <div class="user-actions">
          <button class="btn btn-ghost btn-icon btn-sm" onclick="App.showEditUserModal('${u.id}')" title="Editar">✏️</button>
          ${u.id !== 'admin' ? `<button class="btn btn-danger btn-icon btn-sm" onclick="App.confirmDeleteUser('${u.id}')" title="Eliminar">🗑</button>` : ''}
        </div>
      </div>
    `).join('');
  }

  function showAddUserModal() {
    UI.showModal({
      title: 'Nuevo usuario',
      content: `
        <div class="form-group">
          <label class="form-label">Nombre de usuario</label>
          <input type="text" class="form-input" id="modal-username" placeholder="ej. María" />
        </div>
        <div class="form-group">
          <label class="form-label">Nombre para mostrar</label>
          <input type="text" class="form-input" id="modal-displayname" placeholder="ej. María García" />
        </div>
        <div class="form-group">
          <label class="form-label">Contraseña (mín. 6 caracteres)</label>
          <input type="password" class="form-input" id="modal-password" placeholder="••••••••" />
        </div>
        <div class="form-group">
          <label class="form-label">Rol</label>
          <select class="form-input" id="modal-role">
            <option value="patient">Paciente</option>
            <option value="admin">Administrador</option>
          </select>
        </div>
        <div id="modal-error" class="form-error hidden"></div>`,
      actions: [
        { id: 'cancel', label: 'Cancelar', class: 'btn-secondary', onClick: UI.closeModal },
        {
          id: 'save', label: 'Crear usuario', class: 'btn-primary',
          onClick: async () => {
            const username    = document.getElementById('modal-username').value.trim();
            const displayName = document.getElementById('modal-displayname').value.trim();
            const password    = document.getElementById('modal-password').value;
            const role        = document.getElementById('modal-role').value;
            const errEl       = document.getElementById('modal-error');

            if (!username || !password) {
              errEl.textContent = 'Usuario y contraseña son obligatorios';
              errEl.classList.remove('hidden'); return;
            }
            if (password.length < 6) {
              errEl.textContent = 'La contraseña debe tener al menos 6 caracteres';
              errEl.classList.remove('hidden'); return;
            }
            try {
              await Storage.addUser({ username, displayName: displayName || username, password, role });
              UI.closeModal();
              UI.toast(`Usuario "${username}" creado correctamente`, 'success');
              renderAdmin();
            } catch (err) {
              errEl.textContent = err.message;
              errEl.classList.remove('hidden');
            }
          }
        }
      ]
    });
  }

  function showEditUserModal(userId) {
    const user = Storage.getUserById(userId);
    if (!user) return;
    UI.showModal({
      title: `Editar: ${user.displayName || user.username}`,
      content: `
        <div class="form-group">
          <label class="form-label">Nombre para mostrar</label>
          <input type="text" class="form-input" id="modal-displayname" value="${user.displayName || user.username}" />
        </div>
        <div class="form-group">
          <label class="form-label">Nueva contraseña
            <span class="text-muted font-normal">(dejar en blanco para no cambiar)</span>
          </label>
          <input type="password" class="form-input" id="modal-new-password" placeholder="Nueva contraseña..." />
        </div>
        <div id="modal-error" class="form-error hidden"></div>`,
      actions: [
        { id: 'cancel', label: 'Cancelar', class: 'btn-secondary', onClick: UI.closeModal },
        {
          id: 'save', label: 'Guardar', class: 'btn-primary',
          onClick: async () => {
            const displayName = document.getElementById('modal-displayname').value.trim();
            const newPw       = document.getElementById('modal-new-password').value;
            const errEl       = document.getElementById('modal-error');
            if (newPw && newPw.length < 6) {
              errEl.textContent = 'La contraseña debe tener al menos 6 caracteres';
              errEl.classList.remove('hidden'); return;
            }
            try {
              const updates = { displayName };
              if (newPw) updates.password = newPw;
              await Storage.updateUser(userId, updates);
              UI.closeModal();
              UI.toast('Usuario actualizado', 'success');
              renderAdmin();
            } catch (err) {
              errEl.textContent = err.message;
              errEl.classList.remove('hidden');
            }
          }
        }
      ]
    });
  }

  function confirmDeleteUser(userId) {
    const user = Storage.getUserById(userId);
    UI.confirm(
      `¿Eliminar al usuario "${user?.displayName || user?.username}"? Se eliminarán también TODOS sus registros.`,
      async () => {
        try {
          await Storage.deleteUser(userId);
          if (currentUserId === userId) currentUserId = Auth.getCurrentUser()?.id;
          UI.toast('Usuario eliminado', 'success');
          renderAdmin();
        } catch (err) {
          UI.toast(err.message, 'error');
        }
      },
      true
    );
  }

  /* ═══════════════════════════════════════════════════
     ACCIONES GLOBALES
  ═══════════════════════════════════════════════════ */
  async function deleteEntry(id) {
    try {
      await Migraine.deleteEntry(id);
      UI.toast('Registro eliminado', 'success');
      navigate('history');
    } catch (err) {
      UI.toast('Error al eliminar: ' + err.message, 'error');
    }
  }

  async function logout() {
    await Auth.logout();
    currentUserId = null;
    currentView   = null;
    document.getElementById('app').innerHTML = '';
    showLogin();
    UI.toast('Sesión cerrada', 'info');
  }

  return {
    init, navigate,
    deleteEntry,
    showEditUserModal, confirmDeleteUser,
    logout
  };
})();

/* Arranque async */
document.addEventListener('DOMContentLoaded', () => App.init());
