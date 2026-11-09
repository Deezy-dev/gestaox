# ==============================================================================
# OSDEL GESTÃO X - DOCKERFILE MULTI-STAGE DE PRODUÇÃO
# ==============================================================================

# Stage 1: Builder
FROM node:22-alpine AS builder
WORKDIR /app

# Copia manifestos de dependência
COPY package*.json ./
RUN npm ci

# Copia código-fonte completo
COPY . .

# Compila o frontend com Vite e gera os bundles otimizados em /dist
ENV NODE_ENV=production
RUN npm run build

# Stage 2: Runtime
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Cria utilizador não-root para máxima segurança (OWASP)
USER node

# Copia ficheiros compilados e dependências
COPY --chown=node:node --from=builder /app/package*.json ./
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/dist ./dist
COPY --chown=node:node --from=builder /app/src/server ./src/server
COPY --chown=node:node --from=builder /app/server.ts ./server.ts
COPY --chown=node:node --from=builder /app/supabase_schema.sql ./supabase_schema.sql

# Expõe a porta oficial
EXPOSE 3000

# Healthcheck nativo para orquestradores (Docker Swarm / Kubernetes / Cloud Run)
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/v1/health || exit 1

# Comando de arranque de produção
CMD ["node", "server.ts"]
