/* =====================================================
   MigraApp — ui.js
   Helpers de UI: toast, modal, formato, navegación
   ===================================================== */

const UI = (() => {

  /* ─── Toast ─── */
  const toastContainer = (() => {
    const c = document.createElement('div');
    c.className = 'toast-container';
    c.id = 'toast-container';
    document.body.appendChild(c);
    return c;
  })();

  function toast(message, type = 'info', duration = 3200) {
    const icons = { success: '✅', error: '❌', warning: '⚠️', info: '💜' };
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.innerHTML = `<span>${icons[type] || '💜'}</span><span>${message}</span>`;
    toastContainer.appendChild(el);

    const hide = () => {
      el.classList.add('hiding');
      setTimeout(() => el.remove(), 300);
    };
    const timer = setTimeout(hide, duration);
    el.addEventListener('click', () => { clearTimeout(timer); hide(); });
  }

  /* ─── Modal ─── */
  function showModal({ title, content, actions = [], centered = false, onClose }) {
    // Cerrar modal existente si hay
    closeModal();

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay' + (centered ? ' center' : '');
    overlay.id = 'modal-overlay';

    const modal = document.createElement('div');
    modal.className = 'modal animate-scaleIn';

    const handle = centered ? '' : '<div class="modal-handle"></div>';

    const actionsHTML = actions.length
      ? `<div class="modal-actions">${actions.map(a =>
          `<button class="btn ${a.class || 'btn-secondary'}" id="modal-btn-${a.id}">${a.label}</button>`
        ).join('')}</div>`
      : '';

    modal.innerHTML = `
      ${handle}
      ${title ? `<div class="modal-title">${title}</div>` : ''}
      <div class="modal-content">${content}</div>
      ${actionsHTML}
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Bind action callbacks
    actions.forEach(a => {
      const btn = document.getElementById(`modal-btn-${a.id}`);
      if (btn && a.onClick) btn.addEventListener('click', a.onClick);
    });

    // Cerrar al tocar el overlay (fuera del modal)
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) { closeModal(); if (onClose) onClose(); }
    });

    // Enfocar primer input del modal
    setTimeout(() => {
      const firstInput = modal.querySelector('input, textarea, select');
      if (firstInput) firstInput.focus();
    }, 100);

    return { close: closeModal };
  }

  function closeModal() {
    const overlay = document.getElementById('modal-overlay');
    if (overlay) overlay.remove();
  }

  /* ─── Confirm dialog ─── */
  function confirm(message, onConfirm, danger = true) {
    showModal({
      title: '¿Estás seguro?',
      content: `<p class="text-secondary text-sm">${message}</p>`,
      centered: true,
      actions: [
        {
          id: 'cancel', label: 'Cancelar', class: 'btn-secondary',
          onClick: closeModal
        },
        {
          id: 'confirm', label: 'Confirmar',
          class: danger ? 'btn-danger' : 'btn-primary',
          onClick: () => { closeModal(); onConfirm(); }
        }
      ]
    });
  }

  /* ─── Formateo de fechas en español ─── */
  function formatDate(dateStr, options = {}) {
    if (!dateStr) return '—';
    const d = new Date(dateStr + 'T12:00:00');
    const defaults = { day: 'numeric', month: 'long', year: 'numeric' };
    return d.toLocaleDateString('es-ES', { ...defaults, ...options });
  }

  function formatDateShort(dateStr) {
    return formatDate(dateStr, { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function formatDateMini(dateStr) {
    return formatDate(dateStr, { day: 'numeric', month: 'short' });
  }

  function todayStr() {
    return Migraine.toDateStr(new Date());
  }

  /* ─── Color de intensidad ─── */
  function intensityColor(val) {
    const colors = {
      1:'#22c55e', 2:'#4ade80', 3:'#84cc16', 4:'#a3e635',
      5:'#eab308', 6:'#f59e0b', 7:'#f97316', 8:'#ef4444',
      9:'#dc2626', 10:'#991b1b'
    };
    return colors[val] || '#94a3b8';
  }

  function intensityLabel(val) {
    if (!val) return '—';
    if (val <= 2) return 'Leve';
    if (val <= 4) return 'Moderada';
    if (val <= 6) return 'Alta';
    if (val <= 8) return 'Muy alta';
    return 'Extrema';
  }

  /* ─── Render del intensity picker ─── */
  function renderIntensityPicker(containerId, currentVal = 5, onChange) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
      <div class="intensity-picker" id="int-picker-btns">
        ${Array.from({length: 10}, (_, i) => i + 1).map(n => `
          <button type="button" class="int-btn ${currentVal === n ? 'active' : ''}" 
                  data-val="${n}" aria-label="Intensidad ${n}">${n}</button>
        `).join('')}
      </div>
      <div class="intensity-label">
        <span>Leve</span>
        <span id="int-selected-label" style="color: ${intensityColor(currentVal)}; font-weight: 600;">
          ${currentVal} — ${intensityLabel(currentVal)}
        </span>
        <span>Extrema</span>
      </div>
    `;

    let selected = currentVal;
    container.querySelectorAll('.int-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        selected = parseInt(btn.dataset.val);
        container.querySelectorAll('.int-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const lbl = document.getElementById('int-selected-label');
        if (lbl) {
          lbl.textContent = `${selected} — ${intensityLabel(selected)}`;
          lbl.style.color = intensityColor(selected);
        }
        if (onChange) onChange(selected);
      });
    });

    return { getValue: () => selected };
  }

  /* ─── Render de badges de síntomas ─── */
  function symptomBadges(entry) {
    const badges = [];
    const color = intensityColor(entry.intensity);
    badges.push(`<span class="badge badge-intensity" style="background:${color};">${entry.intensity || '?'}</span>`);
    if (entry.duration > 1) badges.push(`<span class="badge badge-duration">⏱ ${entry.duration}d</span>`);
    if (entry.neuralgia) badges.push(`<span class="badge badge-neuralgia">⚡ Neuralgia</span>`);
    if (entry.photosensitivity) badges.push(`<span class="badge badge-photo">☀️ Foto</span>`);
    if (entry.trigger) badges.push(`<span class="badge" style="background: rgba(168, 85, 247, 0.2); color: #c084fc;">🎯 ${entry.trigger}</span>`);
    return badges.join('');
  }

  /* ─── Tema ─── */
  function initTheme() {
    const theme = Storage.getTheme();
    document.documentElement.setAttribute('data-theme', theme === 'light' ? 'light' : '');
  }

  function toggleTheme() {
    const current = Storage.getTheme();
    const next = current === 'light' ? 'dark' : 'light';
    Storage.setTheme(next);
    return next;
  }

  /* ─── Scroll to top ─── */
  function scrollTop() {
    const wrapper = document.getElementById('view-wrapper');
    if (wrapper) wrapper.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ─── Loading overlay ─── */
  function setLoading(btn, loading) {
    if (!btn) return;
    if (loading) {
      btn._origText = btn.innerHTML;
      btn.innerHTML = '<span class="spinner"></span>';
      btn.disabled = true;
    } else {
      btn.innerHTML = btn._origText || btn.innerHTML;
      btn.disabled = false;
    }
  }

  /* ─── Render de avatar ─── */
  function avatarInitial(name) {
    return (name || '?').charAt(0).toUpperCase();
  }

  return {
    toast, showModal, closeModal, confirm,
    formatDate, formatDateShort, formatDateMini, todayStr,
    intensityColor, intensityLabel, renderIntensityPicker, symptomBadges,
    initTheme, toggleTheme, scrollTop, setLoading, avatarInitial
  };
})();
