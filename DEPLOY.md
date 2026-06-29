# Déploiement automatique — GrocyShare sur le Raspberry Pi

Déploiement **push-to-deploy** : chaque `push` sur `main` (ou un clic sur
*Run workflow*) déclenche la GitHub Action [`deploy-prod.yaml`](.github/workflows/deploy-prod.yaml),
qui exécute [`deploy.sh`](deploy.sh) **directement sur le Pi** via un
*self-hosted runner*. Pas de port à ouvrir sur la box : le Pi se connecte à
GitHub en sortie.

```
push main ──▶ GitHub ──▶ runner self-hosted (sur le Pi) ──▶ deploy.sh
                                                              ├─ git fetch + reset --hard origin/main
                                                              ├─ npm ci          (si package*.json a changé)
                                                              ├─ prisma db push  (si prisma/ a changé)
                                                              ├─ npm run build   (toujours)
                                                              ├─ systemctl restart grocyshare.service
                                                              └─ smoke-test GET / (rollback si KO)
```

## Le rebuild se fait « à chaque fois », et gère tous les cas

`deploy.sh` est conçu pour être **reproductible et sûr** :

| Cas | Comportement |
|-----|--------------|
| Nouvelle dépendance (`package.json`/`package-lock.json`) | `npm ci` automatique avant le build |
| `node_modules` absent (1er déploiement) | `npm ci` forcé |
| Changement de schéma (`prisma/`) | `prisma db push` avant le build |
| Historique divergent / commit local oublié sur le Pi | `git reset --hard origin/main` : la prod = exactement la branche |
| `npm ci` / `db push` / `build` échoue | **service NON redémarré** → l'ancienne version reste en ligne |
| Build OK mais l'app ne répond pas (smoke ≠ 200) | **rollback** automatique sur le commit précédent + rebuild + restart |
| Pas de nouveau commit (run manuel) | rebuild quand même (`FORCE_BUILD=1`) |

Le build (`npm run build` = `prisma generate && next build`) tourne **à chaque
déploiement**, jamais sauté tant que `FORCE_BUILD=1`.

---

## Mise en place (une seule fois)

### 1. Installer le self-hosted runner sur le Pi

Sur GitHub : **Repo → Settings → Actions → Runners → New self-hosted runner**
(architecture **Linux / ARM64**). GitHub affiche un token d'enregistrement à
usage unique. Puis, sur le Pi (en tant que `romain`) :

```bash
mkdir -p ~/actions-runner && cd ~/actions-runner
# URL donnée par GitHub (dernière version ARM64) :
curl -o actions-runner-linux-arm64.tar.gz -L \
  https://github.com/actions/runner/releases/latest/download/actions-runner-linux-arm64-<version>.tar.gz
tar xzf actions-runner-linux-arm64.tar.gz

# Enregistre le runner (TOKEN = celui affiché par GitHub) avec le label "rasp" :
./config.sh \
  --url https://github.com/RomainBouchez/Grocery-share \
  --token <TOKEN> \
  --name rasp-grocyshare \
  --labels rasp \
  --work _work \
  --unattended

# Installe-le en service systemd (démarre au boot, tourne en tant que romain) :
sudo ./svc.sh install romain
sudo ./svc.sh start
sudo ./svc.sh status
```

> Le runner doit tourner en **`romain`** : il a alors accès à node (nvm), au
> repo, et au `sudo NOPASSWD` déjà configuré pour `systemctl restart`.

Le workflow cible `runs-on: [self-hosted, rasp]` → le label **`rasp`** est
obligatoire.

### 2. Remplir l'environnement « Rasp Deploy Prod »

Sur GitHub : **Repo → Settings → Environments → New environment** →
nom exact **`Rasp Deploy Prod`**.

Ajouter ces **Environment variables** (pas des secrets — rien de sensible) via
*Add variable*. Tu peux toutes les omettre (le script a les mêmes valeurs par
défaut), mais les déclarer rend la config explicite et modifiable sans toucher au
code :

| Variable | Valeur | Rôle |
|----------|--------|------|
| `APP_DIR` | `/home/romain/apps/grocyshare` | Répertoire de l'app déployée |
| `SERVICE` | `grocyshare.service` | Service systemd à redémarrer |
| `PORT` | `3016` | Port HTTP pour le smoke-test |
| `BRANCH` | `main` | Branche déployée |
| `NODE_BIN` | `/home/romain/.nvm/versions/node/v22.22.3/bin` | Dossier des binaires node/npm |
| `FORCE_BUILD` | `1` | `1` = rebuild même sans nouveau commit |

**Aucun secret n'est nécessaire** : le runner est sur le Pi, il a déjà tout
(repo, node, sudo).

Optionnel — *Deployment branches and tags* : restreindre à **`main`** (Selected
branches) pour que seul `main` puisse déclencher un déploiement. Ne **pas** mettre
de *Required reviewers* (cela bloquerait l'auto-déploiement).

### 3. sudo

Déjà OK : `romain` a `NOPASSWD: ALL`, donc `sudo systemctl restart
grocyshare.service` passe sans mot de passe. (Si un jour ce n'est plus le cas :
`echo 'romain ALL=(root) NOPASSWD: /usr/bin/systemctl restart grocyshare.service' | sudo tee /etc/sudoers.d/grocyshare-deploy`.)

---

## Utilisation au quotidien

- **Auto** : `git push origin main` → le déploiement part tout seul. Suivi dans
  l'onglet **Actions** du repo.
- **Manuel (GitHub)** : onglet **Actions → Deploy Prod → Run workflow**.
- **Manuel (sur le Pi, sans GitHub)** :
  ```bash
  cd /home/romain/apps/grocyshare && ./deploy.sh
  ```

## Dépannage

- **Le job reste « Queued »** : le runner est arrêté ou déconnecté →
  `sudo ~/actions-runner/svc.sh status` ; vérifier qu'il apparaît *Idle* dans
  Settings → Actions → Runners.
- **`npm`/`node` introuvable dans le job** : `NODE_BIN` pointe vers un node
  qui n'existe plus (`ls /home/romain/.nvm/versions/node/`) → corriger la
  variable d'environnement.
- **Voir les logs du service** : `journalctl -u grocyshare.service -n 50 --no-pager`.
- **Smoke KO / rollback** : le script a déjà tenté de revenir au commit
  précédent ; les logs du service sont affichés en fin de job.
