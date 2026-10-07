/* =====================================================
   MigraApp — dashboard.js
   Estadísticas, gráfico mensual
   ===================================================== */

const Dashboard = (() => {

  let chartInstance = null;

  function render(userId) {
    const container = document.getElementById('view-content');
    if (!container) return;

    const user  = Storage.getUserById(userId) || Auth.getCurrentUser();
    const now   = new Date();
    const { startDate: s3m } = Migraine.getDateRangeLastMonths(3);
    const { startDate: s1m } = Migraine.getDateRangeLastMonths(1);
    const { startDate: s12m } = Migraine.getDateRangeLastMonths(12);

    const stats3m  = Migraine.getStats(userId, s3m);
    const stats1m  = Migraine.getStats(userId, s1m);
    const stats12m = Migraine.getStats(userId, s12m);

    const recent = Migraine.getEntries(userId).reverse().slice(0, 5);

    const greetHour = now.getHours();
    const greet = greetHour < 12 ? 'Buenos días' : greetHour < 20 ? 'Buenas tardes' : 'Buenas noches';

    container.innerHTML = `
      <div class="page-header animate-fadeIn">
        <div>
          <div class="text-xs text-muted">${greet}</div>
          <h1 class="gradient-text">${user?.displayName || user?.username || 'Usuario'}</h1>
        </div>
        <div class="header-actions">
          <button class="theme-toggle" id="theme-toggle-btn" title="Cambiar tema">
            ${Storage.getTheme() === 'light' ? '🌙' : '☀️'}
          </button>
        </div>
      </div>

      <div class="section animate-fadeIn" style="animation-delay:0.05s">
        <div class="section-title">Último mes</div>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon">📅</div>
            <div class="stat-value gradient-text">${stats1m.totalDays}</div>
            <div class="stat-label">Días con migraña</div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">🔢</div>
            <div class="stat-value gradient-text">${stats1m.totalEpisodes}</div>
            <div class="stat-label">Episodios</div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">🌡️</div>
            <div class="stat-value gradient-text">${stats1m.avgIntensity || '—'}</div>
            <div class="stat-label">Intensidad media</div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">⏱</div>
            <div class="stat-value gradient-text">${stats1m.longestEpisode || '—'}</div>
            <div class="stat-label">Mayor episodio (días)</div>
          </div>
        </div>
      </div>

      <div class="section animate-fadeIn" style="animation-delay:0.1s">
        <div class="section-title">Últimos 3 meses</div>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon">⚡</div>
            <div class="stat-value" style="color: var(--danger)">${stats3m.neuralgiaPercent}%</div>
            <div class="stat-label">Con neuralgia</div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">☀️</div>
            <div class="stat-value" style="color: var(--warning)">${stats3m.photoPercent}%</div>
            <div class="stat-label">Fotosensibilidad</div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">📊</div>
            <div class="stat-value gradient-text">${stats3m.totalDays}</div>
            <div class="stat-label">Días totales (3m)</div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">🗓️</div>
            <div class="stat-value gradient-text">${stats12m.totalDays}</div>
            <div class="stat-label">Días totales (año)</div>
          </div>
        </div>
      </div>

      <div class="section animate-fadeIn" style="animation-delay:0.15s">
        <div class="section-title">Evolución mensual (12 meses)</div>
        <div class="chart-container">
          <canvas id="monthly-chart"></canvas>
        </div>
      </div>

      <div class="section animate-fadeIn" style="animation-delay:0.2s">
        <div class="section-title flex justify-between items-center" style="display:flex; justify-content: space-between">
          <span>Registros recientes</span>
          ${recent.length > 0 ? `<button class="btn btn-ghost btn-sm" id="dash-see-all">Ver todos →</button>` : ''}
        </div>
        ${recent.length === 0
          ? `<div class="empty-state">
               <div class="empty-state-icon">🧠</div>
               <div class="empty-state-title">Sin registros aún</div>
               <div class="empty-state-desc">Pulsa el botón + para registrar tu primera migraña</div>
             </div>`
          : `<div class="entry-list" id="recent-list"></div>`
        }
      </div>
    `;

    // Render chart
    setTimeout(() => renderChart(userId, stats12m.monthly), 50);

    // Render recent entries
    if (recent.length > 0) {
      renderEntryList(recent, document.getElementById('recent-list'), false);
    }

    // Listeners
    document.getElementById('theme-toggle-btn')?.addEventListener('click', () => {
      const next = UI.toggleTheme();
      document.getElementById('theme-toggle-btn').textContent = next === 'light' ? '🌙' : '☀️';
    });

    document.getElementById('dash-see-all')?.addEventListener('click', () => {
      App.navigate('history');
    });
  }

  function renderChart(userId, monthly) {
    const canvas = document.getElementById('monthly-chart');
    if (!canvas || typeof Chart === 'undefined') return;

    if (chartInstance) { chartInstance.destroy(); chartInstance = null; }

    // Últimos 12 meses
    const labels = [];
    const data   = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toLocaleDateString('sv-SE').substring(0, 7);
      labels.push(d.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' }));
      data.push(monthly[key] || 0);
    }

    const theme = Storage.getTheme();
    const gridColor = theme === 'light' ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)';
    const textColor = theme === 'light' ? '#64748b' : '#64748b';

    chartInstance = new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Días con migraña',
          data,
          backgroundColor: 'rgba(168, 85, 247, 0.5)',
          borderColor:     'rgba(168, 85, 247, 0.9)',
          borderWidth: 2,
          borderRadius: 6,
          borderSkipped: false,
          hoverBackgroundColor: 'rgba(168, 85, 247, 0.75)'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(13, 13, 26, 0.92)',
            titleColor: '#f1f5f9',
            bodyColor: '#94a3b8',
            callbacks: {
              label: ctx => ` ${ctx.raw} día${ctx.raw !== 1 ? 's' : ''}`
            }
          }
        },
        scales: {
          x: {
            grid:  { color: gridColor },
            ticks: { color: textColor, font: { size: 10 } }
          },
          y: {
            beginAtZero: true,
            grid:  { color: gridColor },
            ticks: { color: textColor, font: { size: 10 }, stepSize: 1 }
          }
        }
      }
    });
  }

  function renderEntryList(entries, container, allowExpand = true) {
    if (!container) return;
    container.innerHTML = '';

    entries.forEach(entry => {
      const el = document.createElement('div');
      el.className = 'entry-item animate-fadeIn';
      el.dataset.id = entry.id;

      el.innerHTML = `
        <div class="entry-item-header">
          <div class="entry-date">${UI.formatDateShort(entry.date)}</div>
          <div class="entry-badges">${UI.symptomBadges(entry)}</div>
        </div>
        ${entry.notes ? `<div class="entry-notes">${entry.notes}</div>` : ''}
        ${allowExpand ? `<div class="entry-expand hidden" id="expand-${entry.id}">
          <div class="entry-detail-row">
            <span class="entry-detail-label">Intensidad:</span>
            <span style="color:${UI.intensityColor(entry.intensity)};font-weight:600">${entry.intensity}/10 — ${UI.intensityLabel(entry.intensity)}</span>
          </div>
          ${entry.fromPrevious ? `<div class="entry-detail-row">
            <span class="entry-detail-label">Episodio:</span>
            <span>Día ${entry.duration} del episodio (desde ${UI.formatDateShort(entry.episodeStartDate)})</span>
          </div>` : ''}
          ${entry.trigger ? `<div class="entry-detail-row">
            <span class="entry-detail-label">Desencadenante:</span>
            <span>🎯 ${entry.trigger}</span>
          </div>` : ''}
          ${entry.medication ? `<div class="entry-detail-row">
            <span class="entry-detail-label">Medicación:</span>
            <span>${entry.medication}</span>
          </div>` : ''}
          ${entry.notes ? `<div class="entry-detail-row">
            <span class="entry-detail-label">Notas:</span>
            <span>${entry.notes}</span>
          </div>` : ''}
          <div class="entry-actions">
            <button class="btn btn-ghost btn-sm" onclick="App.navigate('register', '${entry.date}', '${entry.id}')">✏️ Editar</button>
            <button class="btn btn-danger btn-sm" onclick="App.deleteEntry('${entry.id}')">🗑 Eliminar</button>
          </div>
        </div>` : ''}
      `;

      if (allowExpand) {
        el.addEventListener('click', (e) => {
          if (e.target.tagName === 'BUTTON') return;
          const expandEl = document.getElementById(`expand-${entry.id}`);
          if (expandEl) expandEl.classList.toggle('hidden');
        });
      }

      container.appendChild(el);
    });
  }

  return { render, renderEntryList, renderChart };
})();
