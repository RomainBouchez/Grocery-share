# 🛒 GrocyShare

> Liste de courses collaborative avec parts façon **Tricount**, suggestions intelligentes et scan de ticket OCR.

Application web responsive (PWA) de gestion de courses en groupe :

- **Listes collaboratives multi-groupes** (famille, coloc, amis…)
- **Système de parts** façon Tricount sur chaque article
- *(à venir)* Tricount automatique au retour de courses
- *(à venir)* Scan de ticket via Claude Vision + fuzzy matching
- *(à venir)* Suggestions basées sur l'historique et les rythmes d'achat

## Stack

- **Next.js 15** (App Router, React 19) — web responsive, PWA installable
- **Prisma + SQLite** — léger, parfait pour un Raspberry Pi
- **Tailwind CSS v4** — UI mobile-first (utilisée au supermarché)
- Auth simple par session cookie (email) — magic link / code PIN à brancher ensuite

## Démarrage

```bash
# 1. Dépendances
npm install

# 2. Variables d'environnement
cp .env.example .env

# 3. Base de données (crée le SQLite + tables)
npm run db:push

# 4. (optionnel) Données de démo
npm run db:seed

# 5. Lancer en dev
npm run dev
```

L'app tourne sur http://localhost:3000.

À la première connexion, saisis simplement un **prénom** + un **email** : le compte
est créé automatiquement. Crée ensuite un groupe, partage son **code d'invitation**,
et ajoute des articles — tu es automatiquement positionné sur **1 part** sur chacun.

## Scripts

| Script             | Description                                  |
| ------------------ | -------------------------------------------- |
| `npm run dev`      | Serveur de développement                     |
| `npm run build`    | Build de production (génère le client Prisma) |
| `npm start`        | Serveur de production                        |
| `npm run db:push`  | Synchronise le schéma Prisma avec SQLite     |
| `npm run db:seed`  | Insère des données de démo                   |
| `npm run db:studio`| Ouvre Prisma Studio                          |

## Modèle de données

Le schéma complet (`prisma/schema.prisma`) couvre déjà toutes les phases du projet :
`User`, `Group`, `GroupMember`, `ShoppingList`, `ListItem`, `ItemParticipant`,
`Receipt`, `ReceiptItem`, `Balance`, `UserProduct`.

## Feuille de route

1. **MVP** ✅ — Auth + Groupes + Liste collaborative + Système de parts
2. **V2** — Retour de courses manuel + Tricount (soldes & remboursements)
3. **V3** — OCR ticket (Claude Vision `claude-sonnet-4-6`) + fuzzy matching
4. **V4** — Suggestions intelligentes + rythmes d'achat

## Déploiement sur Raspberry Pi 🍓

Pensé pour un **Raspberry Pi** dockerisé. Le plus simple est de **builder l'image
directement sur le Pi** (l'architecture ARM est ainsi gérée automatiquement, sans
configuration de cross-build).

Pré-requis sur le Pi : Docker + le plugin Docker Compose, et un Pi en **64 bits**
(`uname -m` → `aarch64`) recommandé.

```bash
# 1. Récupérer le code sur le Pi
git clone <url-du-repo> grocyshare && cd grocyshare

# 2. Générer un secret de session et le mettre dans .env
echo "SESSION_SECRET=$(openssl rand -hex 32)" > .env

# 3. Builder l'image et lancer (en tâche de fond)
docker compose up -d --build

# 4. Suivre les logs (synchro de la base puis démarrage)
docker compose logs -f
```

L'app est alors accessible sur **http://<ip-du-pi>:3000**.

- La base **SQLite est persistée** dans le volume Docker `grocyshare-data`
  (`/data/grocyshare.db`) : elle survit aux `docker compose up --build`.
- **Mettre à jour** : `git pull && docker compose up -d --build`.
- **Arrêter** : `docker compose down` (les données restent dans le volume).

### Derrière Traefik (optionnel)

Si tu utilises déjà Traefik comme reverse proxy (comme tes autres apps), décommente
le bloc `labels` + `networks` dans `docker-compose.yml`, ajuste le `Host(...)` vers
ton domaine (ex. `grocyshare.romainbouchez.fr`), commente le bloc `ports`, puis
relance `docker compose up -d --build`.

### Sans Docker (alternative)

Si tu préfères tourner directement avec Node 22 sur le Pi :

```bash
npm ci
cp .env.example .env   # puis édite SESSION_SECRET
npm run build
npm run db:push
npm run start          # http://localhost:3000
```

> Astuce : un `npm run start` peut être supervisé par `pm2` ou un service systemd
> pour redémarrer automatiquement au boot.
