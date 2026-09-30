# Novyata

Novyata est un SaaS de création de documents de candidature. Il permet de créer des CV, rédiger des lettres de motivation, suivre ses candidatures et analyser une offre à partir de son propre parcours.

La direction graphique de référence est disponible dans [DESIGN.md](./DESIGN.md).

## Stack

- Frontend : React, Vite, JSX et Sass.
- Backend : Node.js et Express.
- Base de données : PostgreSQL hébergée sur Supabase.
- Authentification : JWT et bcrypt.
- IA : API OpenAI appelée uniquement depuis le backend.

## Structure

```text
frontend/   Application React/Vite, styles Sass et tests frontend
backend/    API Express, contrôleurs, services et tests backend
database/   Schéma PostgreSQL à exécuter dans Supabase
```

## Prérequis

- Node.js 20 ou plus récent.
- Un projet Supabase avec une base PostgreSQL.
- Une clé OpenAI uniquement si l’analyse d’offre et la génération de lettre sont utilisées.

## Installation

```bash
git clone <url-du-depot>
cd Novyata

cd frontend
npm install

cd ../backend
npm install
```

Copiez ensuite les fichiers d’environnement, sans jamais commiter les fichiers `.env` créés :

```powershell
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env
```

Dans le SQL Editor de Supabase, exécutez [database/schema.sql](./database/schema.sql). Le script crée les utilisateurs, CV, sections de CV, lettres de motivation et candidatures avec leurs relations, index et déclencheurs `updated_at`.

## Variables d’environnement

### Backend — `backend/.env`

| Variable | Description |
| --- | --- |
| `PORT` | Port de l’API, `3001` par défaut. |
| `DATABASE_URL` | Chaîne de connexion PostgreSQL fournie par Supabase. |
| `DATABASE_SSL` | `false` pour PostgreSQL local ; `true` pour Supabase ou un fournisseur imposant TLS. |
| `DATABASE_SSL_REJECT_UNAUTHORIZED` | Vérification du certificat TLS, à laisser à `true` en production. |
| `JWT_SECRET` | Secret JWT long, aléatoire et privé. |
| `JWT_EXPIRES_IN` | Durée de validité du jeton, par exemple `7d`. |
| `CORS_ORIGIN` | URL du frontend, par exemple `http://localhost:5173`. |
| `OPENAI_API_KEY` | Clé privée utilisée uniquement par les services IA backend. |
| `OPENAI_MODEL` | Modèle OpenAI à utiliser, par exemple `gpt-4o-mini`. |

Ne placez jamais une clé OpenAI dans le frontend ni dans le dépôt.

### Frontend — `frontend/.env`

| Variable | Description |
| --- | --- |
| `VITE_API_URL` | URL publique de l’API, par exemple `http://localhost:3001`. |

## Lancer le projet

Dans un premier terminal :

```bash
cd backend
npm run dev
```

Dans un second terminal :

```bash
cd frontend
npm run dev
```

L’API est servie sur `http://localhost:3001` et Vite sur `http://localhost:5173`.

## Fonctionnalités disponibles

- Inscription, connexion, déconnexion, maintien de session JWT et gestion du profil.
- Création, édition, suppression et export PDF de CV.
- Expériences, formations, compétences, langues et aperçu A4 en direct.
- Templates Classique, Moderne et Minimal ; couleur d’accent et taille de texte personnalisables.
- Détection d’un dépassement A4 : l’enregistrement et l’export du CV sont alors bloqués.
- Lettres de motivation : CRUD, liaison facultative à un CV, aperçu A4, modèles Classique/Moderne et export PDF.
- Candidatures : CRUD, statuts, recherche, filtres et liaisons avec un CV ou une lettre.
- Analyse IA d’offre : score de correspondance, compétences déjà présentes, précisions à renforcer, compétences absentes, mots-clés et suggestions.
- Génération IA d’un brouillon de lettre depuis une analyse ; le contenu reste éditable et n’invente pas de données du CV.

## Sécurité et IA

Toutes les routes métier sont protégées par JWT. Les contrôleurs vérifient la propriété des CV, lettres et candidatures avant toute lecture ou écriture.

L’API OpenAI n’est appelée que depuis le backend. Les réponses d’analyse et de génération sont demandées au format JSON structuré puis validées avant d’être retournées au frontend. L’IA ne modifie jamais un CV automatiquement.

## Tests et build

```bash
# Tests backend
cd backend
npm test

# Couverture backend
npm run test:coverage

# Tests frontend
cd ../frontend
npm test

# Build de production frontend
npm run build
```

## Préparation production

- Utilisez des fichiers d’environnement distincts : `backend/.env` pour le développement, `backend/.env.test.example` comme référence pour un environnement de test isolé et `backend/.env.production.example` comme référence de production.
- En production, renseignez une URL Supabase/PostgreSQL dédiée, un `JWT_SECRET` long et unique, une origine CORS HTTPS exacte et, si l’hébergeur utilise un proxy, `TRUST_PROXY=true`.
- Construisez le frontend avec `cd frontend && npm run build`, puis servez le dossier `frontend/dist` avec une règle de réécriture SPA vers `index.html`.
- Lancez l’API avec `cd backend && npm start` après avoir défini `NODE_ENV=production`.
- Exécutez les tests unitaires avec `npm test` dans chaque application et les parcours Playwright isolés avec `cd backend && npm run test:e2e`.
- Les tests E2E interceptent toutes les API métier : ils n’utilisent ni Supabase réel ni clé OpenAI et ne créent aucune donnée persistante.
- Avant déploiement, exécutez `database/schema.sql` sur la base Supabase cible et configurez `OPENAI_API_KEY` uniquement si les fonctions IA doivent être activées.
