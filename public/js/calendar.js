/* =====================================================
   MigraApp — calendar.js
   Componente de calendario mensual
   ===================================================== */

const Calendar = (() => {

  let state = {
    year:   new Date().getFullYear(),
    month:  new Date().getMonth() + 1, // 1-12
    userId: null,
    onDayClick: null
  };

  const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
  const MONTHS_ES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  function init(userId, onDayClick) {
    state.userId = userId;
    state.onDayClick = onDayClick;
    const now = new Date();
    state.year  = now.getFullYear();
    state.month = now.getMonth() + 1;
  }

  function navigate(direction) {
    state.month += direction;
    if (state.month > 12) { state.month = 1;  state.year++; }
    if (state.month < 1)  { state.month = 12; state.year--; }
    render();
  }

  function render(containerId = 'calendar-root') {
    const container = document.getElementById(containerId);
    if (!container) return;

    const { year, month, userId } = state;
    const entries = Migraine.getEntriesForMonth(userId, year, month);

    // Mapa date -> entry
    const entryMap = {};
    entries.forEach(e => { entryMap[e.date] = e; });

    // Primer y último día del mes
    const firstDay = new Date(year, month - 1, 1);
    const lastDay  = new Date(year, month, 0);

    // Día de semana del primer día (0=dom → ajustar a Lunes=0)
    let startDow = firstDay.getDay(); // 0=dom
    startDow = (startDow + 6) % 7;   // Lunes=0, Domingo=6

    const todayStr = Migraine.toDateStr(new Date());

    // Días del mes anterior para rellenar
    const prevMonthDays = startDow;
    const totalCells = Math.ceil((prevMonthDays + lastDay.getDate()) / 7) * 7;

    let daysHTML = '';
    for (let i = 0; i < totalCells; i++) {
      const dayNum   = i - prevMonthDays + 1;
      const isCurrentMonth = dayNum >= 1 && dayNum <= lastDay.getDate();

      const paddedDay = String(Math.abs(isCurrentMonth ? dayNum : 0)).padStart(2, '0');
      const dateStr   = isCurrentMonth
        ? `${year}-${String(month).padStart(2,'0')}-${String(dayNum).padStart(2,'0')}`
        : '';

      const entry   = dateStr ? entryMap[dateStr] : null;
      const isToday = dateStr === todayStr;

      let classes = 'calendar-day';
      if (!isCurrentMonth) classes += ' other-month';
      if (isToday) classes += ' today';
      if (entry)   classes += ' has-migraine';

      const dotColor = entry ? UI.intensityColor(entry.intensity) : '';
      const dot = entry ? `<div class="calendar-dots"><div class="calendar-dot" style="background:${dotColor}"></div>${entry.duration > 1 ? `<div class="calendar-dot" style="background:${dotColor}; opacity:0.5"></div>` : ''}</div>` : '';

      const dayNumDisplay = isCurrentMonth ? dayNum : (i < prevMonthDays
        ? new Date(year, month - 2, 0).getDate() - (prevMonthDays - i - 1)
        : dayNum - lastDay.getDate());

      daysHTML += `
        <div class="${classes}" data-date="${dateStr}" ${isCurrentMonth ? `title="${dateStr}"` : ''}>
          <span class="day-num">${Math.abs(dayNumDisplay) || ''}</span>
          ${dot}
        </div>
      `;
    }

    container.innerHTML = `
      <div class="calendar-wrapper">
        <div class="calendar-header">
          <button class="calendar-nav-btn" id="cal-prev" aria-label="Mes anterior">‹</button>
          <span class="calendar-title">${MONTHS_ES[month - 1]} ${year}</span>
          <button class="calendar-nav-btn" id="cal-next" aria-label="Mes siguiente">›</button>
        </div>
        <div class="calendar-weekdays">
          ${WEEKDAYS.map(d => `<div class="calendar-weekday">${d}</div>`).join('')}
        </div>
        <div class="calendar-days">
          ${daysHTML}
        </div>
        <div class="calendar-legend flex items-center gap-3 mt-3 px-2 text-xs text-muted">
          <span>Intensidad:</span>
          <span style="color:#22c55e">● Baja</span>
          <span style="color:#f59e0b">● Media</span>
          <span style="color:#ef4444">● Alta</span>
        </div>
      </div>
    `;

    // Event listeners
    document.getElementById('cal-prev')?.addEventListener('click', () => navigate(-1));
    document.getElementById('cal-next')?.addEventListener('click', () => navigate(1));

    container.querySelectorAll('.calendar-day.has-migraine').forEach(el => {
      el.addEventListener('click', () => {
        const date = el.dataset.date;
        if (date && state.onDayClick) state.onDayClick(date, entryMap[date]);
      });
    });

    // Permitir también clic en días sin migraña (para registrar)
    container.querySelectorAll('.calendar-day.current-month:not(.has-migraine), .calendar-day:not(.other-month):not(.has-migraine)').forEach(el => {
      el.addEventListener('click', () => {
        const date = el.dataset.date;
        if (date && state.onDayClick) state.onDayClick(date, null);
      });
    });
  }

  function setMonth(year, month) {
    state.year  = year;
    state.month = month;
  }

  return { init, render, navigate, setMonth };
})();
