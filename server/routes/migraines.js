/* =====================================================
   MigraApp — server/routes/migraines.js
   CRUD de registros de migraña
   ===================================================== */
'use strict';

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

function mapMigraine(m) {
  return {
    id:                m.id,
    userId:            m.user_id,
    date:              m.date,
    fromPrevious:      m.from_previous === 1,
    episodeStartDate:  m.episode_start_date || m.date,
    duration:          m.duration,
    intensity:         m.intensity,
    neuralgia:         m.neuralgia === 1,
    photosensitivity:  m.photosensitivity === 1,
    trigger:           m.trigger || '',
    medication:        m.medication || '',
    notes:             m.notes || '',
    createdAt:         m.created_at,
    updatedAt:         m.updated_at || null
  };
}

/* GET /api/migraines
   - Admin sin ?userId  → todas las migrañas
   - Admin con ?userId  → migrañas de ese usuario
   - Paciente           → solo las suyas
*/
router.get('/', requireAuth, (req, res) => {
  const db          = getDb();
  const currentUser = req.session.user;

  if (currentUser.role === 'admin' && !req.query.userId) {
    const all = db.prepare('SELECT * FROM migraines ORDER BY user_id, date').all();
    return res.json(all.map(mapMigraine));
  }

  const userId = currentUser.role === 'admin'
    ? req.query.userId
    : currentUser.id;

  const rows = db.prepare('SELECT * FROM migraines WHERE user_id = ? ORDER BY date').all(userId);
  res.json(rows.map(mapMigraine));
});

/* POST /api/migraines — registrar nueva entrada */
router.post('/', requireAuth, (req, res) => {
  const db          = getDb();
  const userId      = req.session.user.id;
  const {
    date, fromPrevious, episodeStartDate, duration,
    intensity, neuralgia, photosensitivity, trigger, medication, notes
  } = req.body || {};

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: 'Fecha inválida (formato YYYY-MM-DD)' });
  }

  // Verificar duplicado
  const existing = db.prepare('SELECT id FROM migraines WHERE user_id = ? AND date = ?').get(userId, date);
  if (existing) {
    return res.status(409).json({ error: 'Ya existe un registro para esta fecha' });
  }

  const id = 'mg_' + uuidv4().replace(/-/g, '').slice(0, 16);

  db.prepare(`
    INSERT INTO migraines
      (id, user_id, date, from_previous, episode_start_date, duration,
       intensity, neuralgia, photosensitivity, trigger, medication, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, userId, date,
    fromPrevious ? 1 : 0,
    episodeStartDate || date,
    duration    != null ? Number(duration)    : 1,
    intensity   != null ? Number(intensity)   : 5,
    neuralgia           ? 1 : 0,
    photosensitivity    ? 1 : 0,
    trigger     || '',
    medication  || '',
    notes       || ''
  );

  const created = db.prepare('SELECT * FROM migraines WHERE id = ?').get(id);
  res.status(201).json(mapMigraine(created));
});

/* PUT /api/migraines/:id — actualizar entrada */
router.put('/:id', requireAuth, (req, res) => {
  const db          = getDb();
  const { id }      = req.params;
  const currentUser = req.session.user;

  const migraine = db.prepare('SELECT * FROM migraines WHERE id = ?').get(id);
  if (!migraine) return res.status(404).json({ error: 'Registro no encontrado' });

  // Solo el propietario o admin puede editar
  if (migraine.user_id !== currentUser.id && currentUser.role !== 'admin') {
    return res.status(403).json({ error: 'Acceso denegado' });
  }

  const {
    fromPrevious, episodeStartDate, duration,
    intensity, neuralgia, photosensitivity, trigger, medication, notes
  } = req.body || {};

  db.prepare(`
    UPDATE migraines SET
      from_previous      = ?,
      episode_start_date = ?,
      duration           = ?,
      intensity          = ?,
      neuralgia          = ?,
      photosensitivity   = ?,
      trigger            = ?,
      medication         = ?,
      notes              = ?,
      updated_at         = datetime('now')
    WHERE id = ?
  `).run(
    fromPrevious      != null ? (fromPrevious ? 1 : 0)          : migraine.from_previous,
    episodeStartDate  != null ? episodeStartDate                 : migraine.episode_start_date,
    duration          != null ? Number(duration)                 : migraine.duration,
    intensity         != null ? Number(intensity)                : migraine.intensity,
    neuralgia         != null ? (neuralgia ? 1 : 0)             : migraine.neuralgia,
    photosensitivity  != null ? (photosensitivity ? 1 : 0)      : migraine.photosensitivity,
    trigger           != null ? trigger                          : (migraine.trigger || ''),
    medication        != null ? medication                       : migraine.medication,
    notes             != null ? notes                            : migraine.notes,
    id
  );

  const updated = db.prepare('SELECT * FROM migraines WHERE id = ?').get(id);
  res.json(mapMigraine(updated));
});

/* DELETE /api/migraines/:id — eliminar entrada */
router.delete('/:id', requireAuth, (req, res) => {
  const db          = getDb();
  const { id }      = req.params;
  const currentUser = req.session.user;

  const migraine = db.prepare('SELECT * FROM migraines WHERE id = ?').get(id);
  if (!migraine) return res.status(404).json({ error: 'Registro no encontrado' });

  if (migraine.user_id !== currentUser.id && currentUser.role !== 'admin') {
    return res.status(403).json({ error: 'Acceso denegado' });
  }

  db.prepare('DELETE FROM migraines WHERE id = ?').run(id);
  res.json({ success: true });
});

module.exports = router;
