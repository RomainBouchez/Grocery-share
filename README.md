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

## Déploiement

Pensé pour un **Raspberry Pi** dockerisé derrière Traefik. Build standalone Next.js
+ SQLite monté en volume.
