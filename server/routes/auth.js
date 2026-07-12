/* =====================================================
   MigraApp — server/routes/auth.js
   POST /api/auth/login   — iniciar sesión
   POST /api/auth/logout  — cerrar sesión
   GET  /api/auth/me      — sesión actual
   ===================================================== */
'use strict';

const express = require('express');
const bcrypt  = require('bcryptjs');
const { getDb } = require('../db');
const router  = express.Router();

function safeUser(u) {
  return {
    id:          u.id,
    username:    u.username,
    displayName: u.display_name || u.username,
    role:        u.role
  };
}

/* POST /api/auth/login */
router.post('/login', (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ error: 'Usuario y contraseña son obligatorios' });
  }

  const db   = getDb();
  const user = db.prepare('SELECT * FROM users WHERE username = ? COLLATE NOCASE').get(username.trim());

  if (!user) {
    return res.status(401).json({ error: 'Usuario no encontrado' });
  }

  if (!bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Contraseña incorrecta' });
  }

  const sessionUser = safeUser(user);
  req.session.user = sessionUser;

  req.session.save(err => {
    if (err) {
      console.error('[Auth] Error guardando sesión:', err);
      return res.status(500).json({ error: 'Error interno de sesión' });
    }
    res.json({ success: true, user: sessionUser });
  });
});

/* POST /api/auth/logout */
router.post('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) console.error('[Auth] Error destruyendo sesión:', err);
    res.clearCookie('migraapp.sid');
    res.json({ success: true });
  });
});

/* GET /api/auth/me */
router.get('/me', (req, res) => {
  if (!req.session?.user) {
    return res.status(401).json({ error: 'No autenticado' });
  }
  res.json(req.session.user);
});

module.exports = router;
