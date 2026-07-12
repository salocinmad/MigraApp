/* =====================================================
   MigraApp — public/js/migraine.js
   Lógica de negocio: episodios, duración, estadísticas
   Escrituras ahora son async (delegan en Storage API)
   ===================================================== */

const Migraine = (() => {

  /* ─── Helpers de fechas ─── */
  function toDateStr(date) {
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleDateString('sv-SE');
  }

  function daysBetween(a, b) {
    return Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 86400000);
  }

  function addDays(dateStr, n) {
    const d = new Date(dateStr + 'T00:00:00');
    d.setDate(d.getDate() + n);
    return toDateStr(d);
  }

  /* ─── Obtener la entrada más reciente ANTES de una fecha ─── */
  function getPreviousEntry(userId, beforeDate) {
    return Storage.getMigraines(userId)
      .filter(e => e.date < beforeDate)
      .sort((a, b) => b.date.localeCompare(a.date))[0] || null;
  }

  /* ─── Trazar cadena hacia atrás para obtener el inicio del episodio ─── */
  function traceChainStart(userId, entry) {
    let current = entry;
    while (current && current.fromPrevious) {
      const prev = Storage.getMigraines(userId)
        .filter(e => e.date < current.date)
        .sort((a, b) => b.date.localeCompare(a.date))[0];
      if (!prev) break;
      current = prev;
    }
    return current ? current.date : entry.date;
  }

  function calcDuration(startDate, endDate) {
    return daysBetween(startDate, endDate) + 1;
  }

  /* ─── Vista previa de duración (antes de guardar) ─── */
  function previewDuration(userId, selectedDate, fromPrevious) {
    if (!fromPrevious) {
      return { duration: 1, episodeStartDate: selectedDate, prevEntry: null };
    }
    const prev = getPreviousEntry(userId, addDays(selectedDate, 1));
    const actualPrev = getPreviousEntry(userId, selectedDate);

    if (!actualPrev) {
      return { duration: 1, episodeStartDate: selectedDate, prevEntry: null };
    }

    const chainStart = actualPrev.fromPrevious
      ? traceChainStart(userId, actualPrev)
      : actualPrev.date;

    const duration = calcDuration(chainStart, selectedDate);
    return { duration, episodeStartDate: chainStart, prevEntry: actualPrev };
  }

  /* ─── Recalcular duración de entradas encadenadas ─── */
  async function recalculateChainDurations(userId, fromDate) {
    const all = Storage.getMigraines(userId).sort((a, b) => a.date.localeCompare(b.date));
    const toUpdate = all.filter(e => e.date >= fromDate && e.fromPrevious);

    for (const entry of toUpdate) {
      const chainStart = traceChainStart(userId, entry);
      const duration   = calcDuration(chainStart, entry.date);
      if (entry.episodeStartDate !== chainStart || entry.duration !== duration) {
        await Storage.updateMigraine(entry.id, { episodeStartDate: chainStart, duration });
      }
    }
  }

  /* ─── Añadir entrada ─── */
  async function addEntry(userId, data) {
    const existing = Storage.getMigraines(userId).find(m => m.date === data.date);
    if (existing) throw new Error('Ya existe un registro para esta fecha');

    const { duration, episodeStartDate } = previewDuration(userId, data.date, data.fromPrevious);

    const entry = await Storage.addMigraine({
      userId,
      date:             data.date,
      fromPrevious:     data.fromPrevious || false,
      episodeStartDate,
      duration,
      intensity:        data.intensity || 5,
      neuralgia:        data.neuralgia || false,
      photosensitivity: data.photosensitivity || false,
      medication:       (data.medication || '').trim(),
      notes:            (data.notes || '').trim()
    });

    await recalculateChainDurations(userId, addDays(data.date, 1));
    return entry;
  }

  /* ─── Actualizar entrada ─── */
  async function updateEntry(id, data) {
    const existing = Storage.getMigraines().find(m => m.id === id);
    if (!existing) throw new Error('Entrada no encontrada');

    const userId = existing.userId;
    const fromPrev = data.fromPrevious ?? existing.fromPrevious;
    const { duration, episodeStartDate } = previewDuration(userId, existing.date, fromPrev);

    const updated = await Storage.updateMigraine(id, {
      ...data,
      duration,
      episodeStartDate
    });

    await recalculateChainDurations(userId, addDays(existing.date, 1));
    return updated;
  }

  /* ─── Eliminar entrada ─── */
  async function deleteEntry(id) {
    const entry = Storage.getMigraines().find(m => m.id === id);
    if (!entry) return;
    await Storage.deleteMigraine(id);
    await recalculateChainDurations(entry.userId, entry.date);
  }

  /* ─── Obtener entradas ordenadas ─── */
  function getEntries(userId, startDate = null, endDate = null) {
    let entries = Storage.getMigraines(userId);
    if (startDate) entries = entries.filter(e => e.date >= startDate);
    if (endDate)   entries = entries.filter(e => e.date <= endDate);
    return entries.sort((a, b) => a.date.localeCompare(b.date));
  }

  /* ─── Entradas de un mes concreto ─── */
  function getEntriesForMonth(userId, year, month) {
    const start = `${year}-${String(month).padStart(2, '0')}-01`;
    const end   = `${year}-${String(month).padStart(2, '0')}-31`;
    return getEntries(userId, start, end);
  }

  /* ─── Agrupar en episodios para informes ─── */
  function groupIntoEpisodes(entries) {
    const episodes = [];
    let current = null;

    for (const e of entries) {
      if (!e.fromPrevious || !current) {
        current = {
          id:                  e.id,
          startDate:           e.episodeStartDate || e.date,
          endDate:             e.date,
          duration:            e.duration || 1,
          maxIntensity:        e.intensity || 0,
          minIntensity:        e.intensity || 0,
          intensities:         [e.intensity || 0],
          hasNeuralgia:        e.neuralgia,
          hasPhotosensitivity: e.photosensitivity,
          medications:         e.medication ? [e.medication] : [],
          notes:               e.notes ? [e.notes] : [],
          entries:             [e]
        };
        episodes.push(current);
      } else {
        current.endDate      = e.date;
        current.duration     = e.duration || current.duration;
        current.maxIntensity = Math.max(current.maxIntensity, e.intensity || 0);
        current.minIntensity = Math.min(current.minIntensity, e.intensity || 0);
        current.intensities.push(e.intensity || 0);
        current.hasNeuralgia       = current.hasNeuralgia || e.neuralgia;
        current.hasPhotosensitivity = current.hasPhotosensitivity || e.photosensitivity;
        if (e.medication) current.medications.push(e.medication);
        if (e.notes)      current.notes.push(e.notes);
        current.entries.push(e);
      }
    }

    return episodes.map(ep => {
      const sum = ep.intensities.reduce((a, b) => a + b, 0);
      return {
        ...ep,
        avgIntensity: ep.intensities.length ? +(sum / ep.intensities.length).toFixed(1) : 0,
        medications:  [...new Set(ep.medications)].join(', '),
        notes:        ep.notes.join(' / ')
      };
    });
  }

  /* ─── Estadísticas ─── */
  function getStats(userId, startDate = null, endDate = null) {
    const entries  = getEntries(userId, startDate, endDate);
    const episodes = groupIntoEpisodes(entries);

    const totalDays      = episodes.reduce((sum, ep) => sum + ep.duration, 0);
    const totalEpisodes  = episodes.length;
    const neuralgiaCount = entries.filter(e => e.neuralgia).length;
    const photoCount     = entries.filter(e => e.photosensitivity).length;
    const avgIntensity   = entries.length > 0
      ? +(entries.reduce((s, e) => s + (e.intensity || 0), 0) / entries.length).toFixed(1)
      : 0;
    const longestEpisode = episodes.reduce((max, ep) => Math.max(max, ep.duration), 0);

    const monthly = {};
    for (const ep of episodes) {
      const key = ep.startDate.substring(0, 7);
      monthly[key] = (monthly[key] || 0) + ep.duration;
    }

    return {
      totalDays, totalEpisodes, avgIntensity,
      neuralgiaCount,
      neuralgiaPercent: entries.length ? Math.round(neuralgiaCount / entries.length * 100) : 0,
      photoCount,
      photoPercent: entries.length ? Math.round(photoCount / entries.length * 100) : 0,
      longestEpisode, monthly
    };
  }

  /* ─── Rango últimos N meses ─── */
  function getDateRangeLastMonths(n) {
    const now   = new Date();
    const end   = toDateStr(now);
    const start = new Date(now);
    start.setMonth(start.getMonth() - n);
    return { startDate: toDateStr(start), endDate: end };
  }

  return {
    addEntry, updateEntry, deleteEntry,
    getEntries, getEntriesForMonth, groupIntoEpisodes,
    getStats, previewDuration, getDateRangeLastMonths,
    toDateStr, daysBetween, calcDuration
  };
})();
