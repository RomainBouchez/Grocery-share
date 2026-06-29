#!/usr/bin/env bash
#
# deploy.sh — déploiement robuste de GrocyShare sur le Raspberry Pi (prod).
#
# Synchronise le code sur origin/<BRANCH>, installe les dépendances si besoin,
# synchronise le schéma Prisma vers la DB, rebuild Next.js, redémarre le service
# systemd, puis smoke-test. En cas d'échec du smoke-test, tente un rollback sur
# le commit précédent. Aucune étape AVANT le restart ne laisse le service KO :
# si une étape rate (install, db push, build), l'ancienne version reste en ligne.
#
# Appelé par : .github/workflows/deploy-prod.yaml (self-hosted runner sur le Pi)
#   ou à la main :  ./deploy.sh
#
# Variables d'environnement (overridables ; valeurs par défaut = prod) :
#   APP_DIR      répertoire de l'app déployée       (def: /home/romain/apps/grocyshare)
#   SERVICE      nom du service systemd             (def: grocyshare.service)
#   PORT         port HTTP pour le smoke-test       (def: 3016)
#   BRANCH       branche à déployer                 (def: main)
#   NODE_BIN     dossier des binaires node/npm      (def: nvm v22.22.3)
#   FORCE_BUILD  1 = rebuild même sans nouveau commit (def: 1)

set -euo pipefail

APP_DIR="${APP_DIR:-/home/romain/apps/grocyshare}"
SERVICE="${SERVICE:-grocyshare.service}"
PORT="${PORT:-3016}"
BRANCH="${BRANCH:-main}"
NODE_BIN="${NODE_BIN:-/home/romain/.nvm/versions/node/v22.22.3/bin}"
FORCE_BUILD="${FORCE_BUILD:-1}"

export PATH="${NODE_BIN}:${PATH}"

log() { echo "▶ $*"; }
die() { echo "✖ $*" >&2; exit 1; }

cd "${APP_DIR}" || die "APP_DIR introuvable : ${APP_DIR}"
command -v node >/dev/null || die "node introuvable dans le PATH (NODE_BIN=${NODE_BIN})"
command -v npm  >/dev/null || die "npm introuvable dans le PATH (NODE_BIN=${NODE_BIN})"

log "Déploiement de ${SERVICE} — ${APP_DIR} — branche ${BRANCH}"
log "node $(node -v) / npm $(npm -v)"

# 1. Récupère l'état distant (sans toucher au working tree).
git fetch origin "${BRANCH}" --quiet || die "git fetch a échoué"

LOCAL="$(git rev-parse HEAD)"
REMOTE="$(git rev-parse "origin/${BRANCH}")"
ROLLBACK_SHA="${LOCAL}"
log "local ${LOCAL:0:7} | remote ${REMOTE:0:7}"

# 2. Détecte ce qui a changé AVANT de bouger le HEAD :
#    - package.json / package-lock.json  -> réinstaller les deps
#    - prisma/                           -> synchroniser le schéma vers la DB
NEEDS_INSTALL=0
NEEDS_DBPUSH=0
if [[ "${LOCAL}" != "${REMOTE}" ]]; then
  CHANGED="$(git diff --name-only "${LOCAL}" "${REMOTE}")"
  echo "${CHANGED}" | grep -qE '^(package\.json|package-lock\.json)$' && NEEDS_INSTALL=1
  echo "${CHANGED}" | grep -qE '^prisma/'                              && NEEDS_DBPUSH=1
else
  log "déjà à jour (${LOCAL:0:7})"
fi

# 3. Synchronise le code DUR sur origin/<BRANCH>.
#    `reset --hard` garantit que la prod = exactement la branche, quoi qu'il
#    arrive (historique divergent, commit local oublié, fichier modifié à la
#    main…). C'est ce qui rend le déploiement reproductible "à chaque fois".
git reset --hard "origin/${BRANCH}" --quiet || die "git reset --hard a échoué"
log "code synchronisé sur $(git rev-parse HEAD | cut -c1-7)"

# Premier déploiement / node_modules effacé -> install obligatoire.
if [[ ! -d node_modules ]]; then
  NEEDS_INSTALL=1
  log "node_modules absent -> installation forcée"
fi

# 4. Dépendances. `npm ci` = installation reproductible depuis package-lock.json.
if [[ "${NEEDS_INSTALL}" == "1" ]]; then
  if [[ -f package-lock.json ]]; then
    log "Installation des dépendances (npm ci)…"
    npm ci || die "npm ci a échoué — service NON redémarré, ancienne version toujours en ligne"
  else
    log "Installation des dépendances (npm install)…"
    npm install || die "npm install a échoué — service NON redémarré"
  fi
else
  log "dépendances inchangées — skip install"
fi

# 5. Schéma Prisma -> DB si prisma/ a changé.
if [[ "${NEEDS_DBPUSH}" == "1" ]]; then
  log "Synchro du schéma Prisma vers la DB (prisma db push)…"
  npx prisma db push || die "prisma db push a échoué — service NON redémarré"
else
  log "schéma Prisma inchangé — skip db push"
fi

# 6. Build (prisma generate && next build). Toujours, sauf no-op explicite.
if [[ "${FORCE_BUILD}" == "1" || "${LOCAL}" != "${REMOTE}" ]]; then
  log "Build de prod (npm run build)…"
  npm run build || die "build échoué — service NON redémarré, ancienne version toujours en ligne"
else
  log "FORCE_BUILD=0 et aucun changement — skip build"
fi

# 7. Redémarrage du service.
log "Redémarrage de ${SERVICE}…"
sudo systemctl restart "${SERVICE}" || die "systemctl restart a échoué"

# 8. Smoke-test (laisse Next.js démarrer puis vérifie qu'il répond).
sleep 4
log "Smoke-test HTTP (port ${PORT})…"
code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 "http://localhost:${PORT}/" || echo 000)"
if [[ "${code}" == "200" ]]; then
  log "✓ Déploiement OK — GET / → ${code} — $(git rev-parse HEAD | cut -c1-7)"
  systemctl --no-pager --property=MainPID,ActiveState show "${SERVICE}" || true
  exit 0
fi

# 9. Smoke KO -> rollback best-effort sur le commit précédent.
echo "✖ Smoke-test échoué (GET / → ${code}). Tentative de rollback vers ${ROLLBACK_SHA:0:7}…" >&2
if [[ "${ROLLBACK_SHA}" != "$(git rev-parse HEAD)" ]]; then
  git reset --hard "${ROLLBACK_SHA}" --quiet || true
  npm run build >/dev/null 2>&1 || true
  sudo systemctl restart "${SERVICE}" || true
  sleep 4
  rb="$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 "http://localhost:${PORT}/" || echo 000)"
  echo "  rollback -> GET / → ${rb} (commit ${ROLLBACK_SHA:0:7})" >&2
fi
echo "Derniers logs du service :" >&2
journalctl -u "${SERVICE}" -n 30 --no-pager >&2 || true
die "Déploiement échoué (smoke ${code}). Rollback tenté vers ${ROLLBACK_SHA:0:7}."
