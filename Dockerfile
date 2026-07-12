# ─── Fase 1: build de dependencias nativas ───────────────────────────────
FROM node:20-slim AS deps

# Herramientas para compilar better-sqlite3 (requiere compilación nativa)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm install --production

# ─── Fase 2: imagen final ─────────────────────────────────────────────────
FROM node:20-slim

WORKDIR /app

# Copiar node_modules compilados
COPY --from=deps /app/node_modules ./node_modules

# Copiar código de la aplicación
COPY server/ ./server/
COPY public/ ./public/

# Directorio de datos (se monta como volumen Docker)
RUN mkdir -p /app/data && chown -R node:node /app

USER node

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/auth/me', r => process.exit(r.statusCode === 401 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "server/app.js"]
