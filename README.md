# TREE — Arbres généalogiques de famille

[![CI/CD](https://github.com/pauldjeuda/tree/actions/workflows/ci.yml/badge.svg)](https://github.com/pauldjeuda/tree/actions/workflows/ci.yml)

Créez l'arbre de votre famille, téléchargez-le en PNG ou en PDF et partagez-le par un lien en lecture seule. Pas de compte : le propriétaire garde un **lien d'édition secret**.

Le projet tient en **deux dossiers autonomes**, chacun avec son `package.json`, ses tests et son Dockerfile :

```text
tree/
├── backend/             API Node.js, Express, Sequelize (MySQL), sharp
├── frontend/            Site React 18, Vite, Tailwind CSS (+ nginx pour la production)
├── scripts/             dev.mjs, smoke.mjs (vérifier un déploiement), check-shared.mjs
├── docker-compose.yml       production : MySQL + backend + site
├── docker-compose.dev.yml   développement : MySQL seul
└── .env.example             variables pour docker-compose.yml
```

## Développement

Prérequis : Node.js 20 ou plus.

```bash
npm run setup        # installe backend/ et frontend/
npm run db:seed      # (facultatif) crée la « Famille Mballa » d'exemple et affiche son lien d'édition
npm run dev          # backend sur :4000, site sur http://localhost:5173
```

Par défaut le backend utilise **SQLite** (`backend/data/tree.sqlite`) et applique ses migrations au démarrage : rien d'autre à installer. Le site appelle `/api`, que Vite redirige vers le backend : aucune variable à régler.

Pour développer avec MySQL : `docker compose -f docker-compose.dev.yml up -d`, puis dans `backend/.env` (copie de `.env.example`) décommentez les lignes `DB_DIALECT=mysql` et `DB_*`.

Chaque dossier fonctionne aussi seul : `cd backend && npm install && npm run dev`, `cd frontend && npm install && npm run dev`.

## Mise en production

### Option A — Docker sur un serveur (le plus simple : une seule adresse)

```bash
cp .env.example .env          # renseigner PUBLIC_APP_URL, DB_PASSWORD, DB_ROOT_PASSWORD
docker compose up -d --build
node scripts/smoke.mjs https://tree.exemple.com      # vérifie que tout est branché
```

Le conteneur `frontend` (nginx) sert le site et relaie `/api` vers le `backend` : site et API ont **la même adresse**, donc ni CORS ni `VITE_API_URL` à régler. Le backend applique ses migrations à chaque démarrage. Les photos sont dans le volume `uploads` et la base dans `db_data` : sauvegardez-les.

Pour le HTTPS, placez un proxy (Caddy, Traefik, Cloudflare, load balancer de l'hébergeur) devant le port 80 et mettez `TRUST_PROXY=2` dans `.env` (un proxy de plus devant le nginx du conteneur).

### Option B — Site et API sur deux hébergeurs (Vercel/Netlify + Render/Railway…)

**Backend** (dossier `backend/`) : commande de build `npm ci && npm run build`, commande de démarrage `npm run db:migrate:prod && npm start`. Variables :

| Variable | Valeur |
|---|---|
| `NODE_ENV` | `production` |
| `DB_DIALECT` | `mysql` (+ `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`) |
| `PUBLIC_APP_URL` | adresse du site, ex. `https://tree.exemple.com` |
| `CORS_ORIGIN` | la même adresse du site |
| `PUBLIC_API_URL` | adresse de l'API **sans** `/api/v1`, ex. `https://api.exemple.com` |
| `TRUST_PROXY` | `1` |
| `UPLOAD_DIR` | un dossier sur un **disque persistant** (sinon les photos disparaissent à chaque déploiement) |

**Frontend** (dossier `frontend/`) : build `npm run build`, dossier de sortie `dist`, variable `VITE_API_URL=https://api.exemple.com/api/v1` **définie avant le build**. Les fichiers `vercel.json` et `public/_redirects` assurent la réécriture des routes vers `index.html`.

Puis : `node scripts/smoke.mjs https://tree.exemple.com --api https://api.exemple.com/api/v1`

### Option C — Vercel pour le site et l'API

Vercel peut déployer le frontend Vite et l'API Express du même dépôt comme deux projets, avec `frontend/` puis `backend/` comme dossiers racines. L'API fonctionne comme une fonction Node.js : elle ne doit pas écrire ses données sur le disque local. Les fonctions Vercel limitent le corps d'une requête à 4,5 Mo ; l'application limite donc les photos à 4 Mo pour garder une marge pour le multipart.

1. Créez une base MySQL accessible depuis Vercel. Le backend prend déjà en charge MySQL ; utilisez une connexion TLS si le fournisseur l'exige.
2. Dans le projet Vercel `backend`, créez un stockage Blob **public** et associez-le à ce projet. Les images sont ensuite accessibles par leur URL Blob.
3. Créez les projets Vercel en choisissant les dossiers racines `frontend` et `backend`. L'API est exposée par `src/index.ts`.
4. Dans les variables de production du frontend, définissez `VITE_API_URL=https://<api>/api/v1`.
5. Dans les variables de production du backend, définissez `NODE_ENV=production`, `DB_DIALECT=mysql`, `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_SSL=true`, `DB_POOL_MAX=3`, `BLOB_READ_WRITE_TOKEN`, `CORS_ORIGIN=<url-du-site>`, `PUBLIC_APP_URL=<url-du-site>`, `PUBLIC_API_URL=<url-de-l-api>`, `TRUST_PROXY=1` et `AUTO_MIGRATE=false`.
6. Ajoutez les secrets GitHub `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_FRONTEND_PROJECT_ID`, `VERCEL_BACKEND_PROJECT_ID`, `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER` et `DB_PASSWORD`. Ajoutez les variables `VERCEL_DEPLOY_ENABLED=true`, `PUBLIC_APP_URL` et `PUBLIC_API_URL`. Le job de déploiement reste ignoré tant que `VERCEL_DEPLOY_ENABLED` n'est pas activé.
7. La migration MySQL et le déploiement de production s'exécutent après les tests, CodeQL, le build et le smoke test de la CI. Désactivez les déploiements de production Git automatiques dans Vercel pour que la CI reste le passage obligatoire.

Les URL du Blob public sont accessibles à toute personne qui les connaît. Les liens partagés de l'application peuvent afficher les photos comme aujourd'hui. Les bases SQLite et dossiers `backend/data/` / `backend/uploads/` locaux ne sont pas transférés automatiquement : migrez-les séparément si vous voulez conserver des arbres existants.

### Vérifier un déploiement

`scripts/smoke.mjs` contrôle, avec un message précis à chaque échec : le site et ses routes, la présence de la bonne `VITE_API_URL` dans le site construit, l'API et la base, CORS, la création d'une famille, l'authentification, l'envoi et l'affichage d'une photo, le lien de partage et sa désactivation. Il crée une famille « Smoke test » (sans donnée sensible).

### Erreurs de branchement fréquentes

| Symptôme | Cause | Correction |
|---|---|---|
| Le backend s'arrête au démarrage avec « Configuration de production incomplète » | `PUBLIC_APP_URL`, `CORS_ORIGIN` ou `DB_PASSWORD` absents | Les renseigner (le message dit lesquels) |
| Le site charge mais « Impossible de joindre le serveur » | `VITE_API_URL` absente ou erronée au moment du build | La corriger puis **reconstruire** le site |
| Erreur CORS dans la console du navigateur | `CORS_ORIGIN` ne contient pas l'adresse exacte du site (schéma et domaine, sans `/` final) | Corriger `CORS_ORIGIN` |
| Les photos ne s'affichent pas (site et API sur deux domaines) | `PUBLIC_API_URL` absent : l'URL de la photo est relative au site | Définir `PUBLIC_API_URL` |
| Les photos disparaissent après un redéploiement | `UPLOAD_DIR` n'est pas sur un volume persistant | Monter un volume |
| « Trop de requêtes » pour tout le monde au bout de quelques minutes | `TRUST_PROXY` non réglé : tous les visiteurs partagent l'IP du proxy | `TRUST_PROXY=1` (ou `2`) |
| Un rafraîchissement sur `/f/...` ou `/e/...` donne une erreur 404 | L'hébergeur ne renvoie pas `index.html` pour les routes React | Utiliser `vercel.json`, `_redirects` ou le nginx fourni |
| Les liens de partage pointent vers `localhost` | `PUBLIC_APP_URL` non défini | Le définir |

## CI/CD GitHub Actions

À chaque push et pull request vers main ou master, la pipeline vérifie la cohérence du code partagé, les types TypeScript et les dépendances runtime, exécute CodeQL, lance les tests unitaires et d’intégration API avec rapports de couverture, puis construit le backend et le frontend.

Un smoke test démarre le site et l’API avec une base SQLite temporaire et vérifie le parcours complet : création de famille, authentification, relations, envoi de photo et partage révocable. Sur un push vers main, les builds de production sont publiés comme artefact GitHub Actions. Après configuration des variables et secrets décrits dans l'option Vercel, un job déploie l'API et le site seulement après le succès des contrôles CI.
## Variables d'environnement

**Backend** (`backend/.env`, modèle dans `backend/.env.example`) : `NODE_ENV`, `PORT`, `DB_DIALECT` (`sqlite` ou `mysql`), `DB_*`, `DB_SSL`, `DB_POOL_MAX`, `CORS_ORIGIN` (origines autorisées, séparées par des virgules), `PUBLIC_APP_URL`, `PUBLIC_API_URL`, `UPLOAD_DIR`, `BLOB_READ_WRITE_TOKEN`, `TRUST_PROXY`, `AUTO_MIGRATE` (vrai par défaut hors production).

**Frontend** (`frontend/.env`) : `VITE_API_URL` (par défaut `/api/v1`), `VITE_DEV_API_TARGET` (développement seulement).

## Fonctionnement

- **Création** : `POST /families` renvoie le jeton d'édition une seule fois. Le site le garde dans le navigateur ; le lien `/e/{id}#{jeton}` permet de reprendre l'arbre ailleurs (le jeton est dans le fragment : il n'est jamais envoyé au serveur dans l'URL). Seule son empreinte SHA-256 est stockée.
- **Relations** : enfant de, parent de, conjoint(e) de, frère/sœur de. Une personne peut avoir plusieurs unions et une union plusieurs enfants. Ajouter un conjoint à quelqu'un qui n'a que des enfants enregistrés rattache ces enfants au couple. Avec plusieurs unions, l'API demande l'autre parent (`AMBIGUOUS_UNION`).
- **Disposition** (`frontend/src/lib/layout.ts`) : conjoints côte à côte, enfants regroupés et centrés sous leurs parents, fratrie classée par date de naissance. Limite : au-delà de deux unions pour une même personne, les traits de couple passent derrière les cartes voisines.
- **Export** : PNG et PDF aux proportions exactes de l'affiche, polices incluses.
- **Partage** : lien aléatoire de 12 caractères, activable et désactivable (réponse `410` quand il est coupé).

## Code partagé entre les deux dossiers

Les types et schémas de validation (`src/shared/types.ts` et `schemas.ts`) existent en **deux copies identiques**, une par dossier, pour que chacun se déploie seul. La copie de référence est celle du backend. Après une modification : `npm run sync:shared`. `npm test` vérifie que les copies sont identiques.

## API REST (`/api/v1`)

Les routes d'édition exigent `Authorization: Bearer {jeton}`. Erreurs : `{ "error": { "code", "message", "details"? } }`.

| Méthode et route | Rôle |
|---|---|
| `POST /families` | crée la famille → `{ snapshot, editToken }` |
| `GET` / `PATCH /families/:id` | lit ou renomme |
| `POST /families/:id/persons` | ajoute une personne (+ `relation`) → snapshot |
| `PATCH` / `DELETE /families/:id/persons/:personId` | modifie / supprime (les enfants restent) |
| `POST` / `DELETE /families/:id/persons/:personId/photo` | photo JPG, PNG ou WebP, 4 Mo max |
| `POST` / `PATCH /families/:id/share` | crée le lien s'il n'existe pas, puis renvoie son état ; `PATCH` l'active ou le désactive → `{ shareId, url, active }` |
| `GET /public/f/:shareId` | lecture seule (404 inconnu, 410 désactivé) |
| `GET /uploads/:fichier` | photos (cache long) |
| `GET /health` | disponibilité, base de données comprise |

## Sécurité

Jetons de 32 octets hachés en SHA-256 et comparés en temps constant ; même 401 pour « jeton faux » et « famille inconnue » ; CORS en liste blanche sans cookies ; `helmet` ; corps JSON limité à 100 Ko ; validation Zod ; aucune URL de photo acceptée du client ; photos recompressées en WebP 512 × 512 sans EXIF ; limitation de débit par IP réelle ; pages publiques en `no-store` et `noindex`. En production le backend refuse de démarrer avec une configuration incomplète.

## Tests

```bash
npm test         # backend (SQLite en mémoire), frontend et cohérence du code partagé
npm run typecheck
```

Les tests n'utilisent jamais la base de développement.

## Photos de la page d'accueil

Les 13 cadres de l'accueil affichent les photos de `frontend/public/portraits/` (`p01.webp` à `p13.webp`), recadrées sur les visages aux proportions exactes de chaque cadre (143 × 176 px, et 140 × 236 px pour la carte mise en avant ; fichiers en double résolution pour les écrans nets). Pour changer une photo, remplacez le fichier en gardant son nom et ses proportions. **Vérifiez que vous avez le droit de publier chacune de ces photos** (licence ou autorisation de la personne photographiée) avant la mise en ligne. Le jeu d'essai (`npm run db:seed`) utilise, lui, des avatars illustrés générés.

Le bouton « Voir l'exemple » ouvre `/exemple` : un arbre de démonstration affiché sans appel à l'API.

## Ce qui a été vérifié

Sur une installation propre : typecheck, tests et build des deux dossiers ; migrations, seed et API compilée en `NODE_ENV=production` sur un serveur compatible MySQL (MariaDB) ; configuration nginx du dossier `frontend` devant l'API ; `scripts/smoke.mjs` au complet en même domaine et en deux domaines (bon réglage et réglages erronés). **Non vérifiés** : la construction des images Docker (pas de Docker dans l'environnement de test), les plateformes Vercel, Netlify, Render et Railway, et le rendu visuel dans un navigateur.
