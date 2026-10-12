# Historique des corrections

## Page d'accueil (dernière modification)
- Les dessins générés sont remplacés par 13 photos de `public/`, recadrées automatiquement sur les visages à la taille exacte de chaque cadre (poids total 164 Ko).
- Le voile blanc derrière le texte couvrait toute la largeur et aurait délavé les photos des rangées basses : il est limité à la zone du texte.
- Le bouton « Voir l'exemple » pointait vers une route de démo supprimée de l'API : il ouvre désormais `/exemple` (arbre de démonstration local).

## Structure
- Deux dossiers autonomes `backend/` et `frontend/` (plus de monorepo ni de package partagé à compiler) ; code partagé en deux copies contrôlées (`npm run check:shared`).
- Dockerfiles, nginx, `docker-compose.yml` de production, `vercel.json` et `_redirects`.
- Le backend refuse de démarrer en production avec une configuration incomplète ; `/health` vérifie la base.
- `scripts/smoke.mjs` : vérifie un déploiement de bout en bout.
- Bug trouvé en testant sur MySQL (invisible sur SQLite) : les dates de création étaient tronquées à la seconde, ce qui rendait aléatoire l'ordre des membres (donc de la fratrie et des conjoints sur l'affiche) et faisait échouer le seed. Colonnes `DATETIME(3)` et identification de la nouvelle personne par son identifiant, plus par sa position.

## Version précédente
- Disposition de l'arbre refaite : conjoints sur la rangée de leur partenaire, enfants regroupés sous leurs parents, unions multiples, espacements de la maquette.
- Migration versionnée avec clés étrangères (au lieu de `sync({ alter: true })`), seul le nom du fichier photo en base, tests sur SQLite en mémoire.
- CORS en liste blanche, `photoUrl` refusé du client, `TRUST_PROXY`, erreurs JSON uniformes, 401 identique pour jeton faux et famille inconnue.
- Export PDF aux proportions de l'affiche, polices hébergées localement, `VITE_API_URL` pris en compte, date de l'affiche réelle.
- Fichiers retirés : `dist/`, bases SQLite, uploads, `.jfif` (photos de personnes réelles sans licence connue).
