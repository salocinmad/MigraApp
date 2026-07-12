/* =====================================================
   MigraApp — server/routes/users.js
   CRUD de usuarios (solo admin)
   ===================================================== */
'use strict';

const express = require('express');
const bcrypt  = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db');
const { requireAdmin } = require('../middleware/auth');
const router = express.Router();

function mapUser(u) {
  return {
    id:          u.id,
    username:    u.username,
    displayName: u.display_name || u.username,
    role:        u.role,
    createdAt:   u.created_at
  };
}

/* GET /api/users — lista todos los usuarios */
router.get('/', requireAdmin, (req, res) => {
  const db    = getDb();
  const users = db.prepare('SELECT * FROM users ORDER BY created_at').all();
  res.json(users.map(mapUser));
});

/* POST /api/users — crear usuario */
router.post('/', requireAdmin, (req, res) => {
  const { username, displayName, password, role } = req.body || {};

  if (!username?.trim() || !password) {
    return res.status(400).json({ error: 'Usuario y contraseña son obligatorios' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
  }
  if (role && !['admin', 'patient'].includes(role)) {
    return res.status(400).json({ error: 'Rol inválido' });
  }

  const db       = getDb();
  const existing = db.prepare('SELECT id FROM users WHERE username = ? COLLATE NOCASE').get(username.trim());
  if (existing) {
    return res.status(409).json({ error: 'El nombre de usuario ya está en uso' });
  }

  const id   = 'u_' + uuidv4().replace(/-/g, '').slice(0, 12);
  const hash = bcrypt.hashSync(password, 10);

  db.prepare(`
    INSERT INTO users (id, username, display_name, password_hash, role)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, username.trim(), (displayName || username).trim(), hash, role || 'patient');

  const created = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  res.status(201).json(mapUser(created));
});

/* PUT /api/users/:id — editar usuario */
router.put('/:id', requireAdmin, (req, res) => {
  const { id }          = req.params;
  const { displayName, password } = req.body || {};

  const db   = getDb();
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

  if (password !== undefined && password !== '' && password.length < 6) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
  }

  const updates = [];
  const params  = [];

  if (displayName !== undefined) {
    updates.push('display_name = ?');
    params.push(displayName.trim());
  }
  if (password) {
    updates.push('password_hash = ?');
    params.push(bcrypt.hashSync(password, 10));
  }

  if (updates.length > 0) {
    updates.push("updated_at = datetime('now')");
    params.push(id);
    db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  }

  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  res.json(mapUser(updated));
});

/* DELETE /api/users/:id — eliminar usuario */
router.delete('/:id', requireAdmin, (req, res) => {
  const { id } = req.params;

  if (id === 'admin') {
    return res.status(403).json({ error: 'No se puede eliminar el administrador principal' });
  }

  const db   = getDb();
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

  // La FK ON DELETE CASCADE elimina sus migrañas automáticamente
  db.prepare('DELETE FROM users WHERE id = ?').run(id);
  res.json({ success: true });
});

module.exports = router;
