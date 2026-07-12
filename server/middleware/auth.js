/* =====================================================
   MigraApp — server/middleware/auth.js
   Middleware de autenticación de sesión
   ===================================================== */
'use strict';

function requireAuth(req, res, next) {
  if (!req.session?.user) {
    return res.status(401).json({ error: 'No autenticado. Por favor, inicia sesión.' });
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session?.user) {
    return res.status(401).json({ error: 'No autenticado.' });
  }
  if (req.session.user.role !== 'admin') {
    return res.status(403).json({ error: 'Acceso denegado. Se requiere rol de administrador.' });
  }
  next();
}

// Middleware para que el usuario solo acceda a sus propios recursos (o admin a todos)
function requireOwnerOrAdmin(userIdParam = 'userId') {
  return (req, res, next) => {
    if (!req.session?.user) {
      return res.status(401).json({ error: 'No autenticado.' });
    }
    const currentUser = req.session.user;
    const targetId = req.params[userIdParam] || req.query[userIdParam];
    if (currentUser.role === 'admin' || !targetId || currentUser.id === targetId) {
      return next();
    }
    return res.status(403).json({ error: 'Acceso denegado.' });
  };
}

module.exports = { requireAuth, requireAdmin, requireOwnerOrAdmin };
