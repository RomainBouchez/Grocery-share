#!/usr/bin/env bash
#
# deploy.sh — déploie GrocyShare : pull de main, build de prod, redémarrage systemd.
#
# Usage :  ./deploy.sh
#
# Pré-requis : être propriétaire du repo, et droit sudo sur `systemctl restart grocyshare.service`.

set -euo pipefail

APP_DIR="/home/romain/apps/grocyshare"
SERVICE="grocyshare.service"
PORT=3016
NODE_BIN="/home/romain/.nvm/versions/node/v22.22.3/bin"

export PATH="$NODE_BIN:$PATH"

cd "$APP_DIR"

echo "▶ Branche : $(git branch --show-current)"

# Refuse de déployer s'il y a des modifs locales non commitées (évite les conflits de pull).
if ! git diff-index --quiet HEAD --; then
  echo "✖ Modifs locales non commitées dans $APP_DIR — commit/stash avant de déployer." >&2
  git status --short >&2
  exit 1
fi

echo "▶ Pull de main…"
git pull --ff-only origin main

echo "▶ Build de prod (prisma generate && next build)…"
npm run build

echo "▶ Redémarrage du service $SERVICE…"
sudo systemctl restart "$SERVICE"

# Laisse Next.js démarrer puis vérifie qu'il répond.
sleep 4
echo "▶ Vérification HTTP (port $PORT)…"
code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT/" || echo 000)
if [ "$code" = "200" ]; then
  echo "✓ Déploiement OK — GET / → $code"
  systemctl --no-pager --property=MainPID,ActiveState show "$SERVICE"
else
  echo "✖ L'app ne répond pas correctement (GET / → $code). Logs :" >&2
  journalctl -u "$SERVICE" -n 20 --no-pager >&2
  exit 1
fi
