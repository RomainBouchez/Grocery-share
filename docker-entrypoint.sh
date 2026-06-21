#!/bin/sh
set -e

# Crée/synchronise les tables SQLite avant de démarrer (idempotent).
echo "→ Synchronisation du schéma de base de données…"
npx prisma db push --skip-generate --accept-data-loss

echo "→ Démarrage de GrocyShare sur le port ${PORT:-3000}…"
exec npm run start
