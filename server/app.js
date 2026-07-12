/* =====================================================
   MigraApp — server/app.js
   Servidor Express principal
   ===================================================== */
'use strict';

const express    = require('express');
const session    = require('express-session');
const path       = require('path');

const { getDb }  = require('./db');

const app  = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const SESSION_SECRET = process.env.SESSION_SECRET || 'migraapp-dev-insecure-secret';

if (SESSION_SECRET === 'migraapp-dev-insecure-secret') {
  console.warn('[⚠️ ] SESSION_SECRET no configurado. Usa la variable de entorno SESSION_SECRET en producción.');
}

// ─── Inicializar base de datos ────────────────────────────────────────────────
getDb();

// ─── Middleware base ──────────────────────────────────────────────────────────
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Cabeceras de seguridad básicas
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// ─── Sesiones (almacenadas en SQLite) ────────────────────────────────────────
const SQLiteStore = require('connect-sqlite3')(session);

app.use(session({
  store: new SQLiteStore({
    db:  'sessions.db',
    dir: path.join(__dirname, '../data')
  }),
  secret:            SESSION_SECRET,
  resave:            false,
  saveUninitialized: false,
  name:              'migraapp.sid',
  cookie: {
    httpOnly: true,
    sameSite: 'strict',
    maxAge:   7 * 24 * 60 * 60 * 1000, // 7 días
    secure:   process.env.NODE_ENV === 'production' && process.env.HTTPS === 'true'
  }
}));

// ─── Rutas de la API ──────────────────────────────────────────────────────────
app.use('/api/auth',      require('./routes/auth'));
app.use('/api/users',     require('./routes/users'));
app.use('/api/migraines', require('./routes/migraines'));
app.use('/api/data',      require('./routes/data'));

// ─── Archivos estáticos del frontend ─────────────────────────────────────────
app.use(express.static(path.join(__dirname, '../public'), {
  maxAge:  process.env.NODE_ENV === 'production' ? '1h' : '0',
  etag:    true
}));

// ─── SPA Fallback: cualquier ruta no-API sirve index.html ────────────────────
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Endpoint no encontrado' });
  }
  res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

// ─── Manejador global de errores ──────────────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error('[Error]', err.message, err.stack);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// ─── Arrancar ─────────────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('  ╔══════════════════════════════════════╗');
  console.log('  ║          MigraApp — Backend          ║');
  console.log('  ╠══════════════════════════════════════╣');
  console.log(`  ║  URL:  http://localhost:${PORT}          ║`);
  console.log(`  ║  Env:  ${(process.env.NODE_ENV || 'development').padEnd(28)}║`);
  console.log('  ╚══════════════════════════════════════╝');
  console.log('');
});

// Cierre limpio
process.on('SIGTERM', () => { console.log('[MigraApp] SIGTERM recibido, cerrando...'); process.exit(0); });
process.on('SIGINT',  () => { console.log('[MigraApp] SIGINT recibido, cerrando...');  process.exit(0); });
