/* =====================================================
   MigraApp — server/routes/data.js
   GET  /api/data/export — exportar toda la BD
   POST /api/data/import — importar desde JSON
   ===================================================== */
'use strict';

const express = require('express');
const bcrypt  = require('bcryptjs');
const { getDb } = require('../db');
const { requireAdmin } = require('../middleware/auth');
const router = express.Router();

/* GET /api/data/export */
router.get('/export', requireAdmin, (req, res) => {
  const db       = getDb();
  const users    = db.prepare('SELECT * FROM users').all();
  const migraines = db.prepare('SELECT * FROM migraines ORDER BY user_id, date').all();

  const payload = {
    version:    '2.0',
    app:        'MigraApp',
    exportedAt: new Date().toISOString(),
    users:      users.map(u => ({
      id:          u.id,
      username:    u.username,
      displayName: u.display_name,
      role:        u.role,
      createdAt:   u.created_at
      // Nota: password_hash NO se exporta por seguridad
    })),
    migraines: migraines.map(m => ({
      id:               m.id,
      userId:           m.user_id,
      date:             m.date,
      fromPrevious:     m.from_previous === 1,
      episodeStartDate: m.episode_start_date,
      duration:         m.duration,
      intensity:        m.intensity,
      neuralgia:        m.neuralgia === 1,
      photosensitivity: m.photosensitivity === 1,
      medication:       m.medication,
      notes:            m.notes,
      createdAt:        m.created_at
    }))
  };

  const filename = `MigraApp_backup_${new Date().toISOString().split('T')[0]}.json`;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(JSON.stringify(payload, null, 2));
});

/* POST /api/data/import */
router.post('/import', requireAdmin, (req, res) => {
  const data = req.body;

  if (!data || data.app !== 'MigraApp' || !Array.isArray(data.users) || !Array.isArray(data.migraines)) {
    return res.status(400).json({ error: 'Formato de archivo inválido o incompatible' });
  }

  const db = getDb();

  const importTx = db.transaction(() => {
    // Limpiar datos excepto el admin principal
    db.prepare('DELETE FROM migraines').run();
    db.prepare("DELETE FROM users WHERE id != 'admin'").run();

    // Importar usuarios
    const insertUser = db.prepare(`
      INSERT OR IGNORE INTO users (id, username, display_name, password_hash, role, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    for (const u of data.users) {
      if (u.id === 'admin') continue; // No sobrescribir el admin
      try {
        insertUser.run(
          u.id,
          u.username,
          u.displayName || u.display_name || u.username,
          bcrypt.hashSync('Temporal123!', 10), // Contraseña temporal (los hashes no se exportan)
          u.role || 'patient',
          u.createdAt || u.created_at || new Date().toISOString()
        );
      } catch (e) {
        console.warn('[Import] Saltando usuario duplicado:', u.username);
      }
    }

    // Importar migrañas
    const insertMigraine = db.prepare(`
      INSERT OR IGNORE INTO migraines
        (id, user_id, date, from_previous, episode_start_date, duration,
         intensity, neuralgia, photosensitivity, medication, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const m of data.migraines) {
      try {
        insertMigraine.run(
          m.id,
          m.userId || m.user_id,
          m.date,
          m.fromPrevious || m.from_previous ? 1 : 0,
          m.episodeStartDate || m.episode_start_date || m.date,
          m.duration || 1,
          m.intensity || 5,
          m.neuralgia ? 1 : 0,
          m.photosensitivity ? 1 : 0,
          m.medication || '',
          m.notes || '',
          m.createdAt || m.created_at || new Date().toISOString()
        );
      } catch (e) {
        console.warn('[Import] Saltando migraña duplicada:', m.id);
      }
    }
  });

  importTx();

  const stats = {
    usersImported:    db.prepare("SELECT COUNT(*) as c FROM users WHERE id != 'admin'").get().c,
    migrainesImported: db.prepare('SELECT COUNT(*) as c FROM migraines').get().c
  };

  console.log(`[Import] ✅ ${stats.usersImported} usuarios, ${stats.migrainesImported} migrañas`);

  res.json({
    success: true,
    message: `Importación completada: ${stats.usersImported} usuarios, ${stats.migrainesImported} registros`,
    ...stats,
    note: 'Las contraseñas de usuarios importados se han reseteado a "Temporal123!". Cámbialas desde el panel de administración.'
  });
});

module.exports = router;
