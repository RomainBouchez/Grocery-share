# GrocyShare — image Docker (pensée pour Raspberry Pi, build directement sur le Pi)
# Multi-stage : on installe, on build, puis on garde une image de run légère.

FROM node:22-slim AS base
# OpenSSL est requis par le moteur de requêtes Prisma.
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# --- Dépendances ---
FROM base AS deps
COPY package.json package-lock.json ./
# Le postinstall lance `prisma generate`, qui exige prisma/schema.prisma.
COPY prisma ./prisma
RUN npm ci

# --- Build ---
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# DATABASE_URL factice : nécessaire pour `prisma generate`, pas de connexion réelle.
ENV DATABASE_URL="file:/tmp/build.db"
RUN npm run build

# --- Runner ---
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
# On conserve node_modules (inclut la CLI Prisma) pour appliquer le schéma au démarrage.
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x docker-entrypoint.sh

EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
