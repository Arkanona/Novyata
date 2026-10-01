# Novyata

Novyata est un SaaS de création de documents de candidature. Il permet de créer des CV, rédiger des lettres de motivation, suivre ses candidatures et analyser une offre à partir de son propre parcours.

La direction graphique de référence est disponible dans [DESIGN.md](./DESIGN.md).

## Stack

- Frontend : React, Vite, JSX et Sass.
- Backend : Node.js et Express.
- Base de données : PostgreSQL local en développement, Supabase/PostgreSQL en production.
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
- PostgreSQL local (base `novyata_dev`) pour le développement.
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

Exécutez [database/schema.sql](./database/schema.sql) sur PostgreSQL local, puis renseignez `DATABASE_URL=postgresql://.../novyata_dev` et `DATABASE_SSL=false`. Le même script est compatible avec Supabase en production, où TLS doit être activé.

## Variables d’environnement

### Backend — `backend/.env`

| Variable | Description |
| --- | --- |
| `PORT` | Port de l’API, `3001` par défaut. |
| `DATABASE_URL` | Chaîne de connexion PostgreSQL locale ou Supabase. |
| `DATABASE_SSL` | `false` pour PostgreSQL local ; `true` pour Supabase ou un fournisseur imposant TLS. |
| `DATABASE_SSL_REJECT_UNAUTHORIZED` | Vérification du certificat TLS, à laisser à `true` en production. |
| `JWT_SECRET` | Secret JWT long, aléatoire et privé. |
| `JWT_EXPIRES_IN` | Durée de validité du jeton, par exemple `7d`. |
| `CORS_ORIGIN` | URL du frontend, par exemple `http://localhost:5173`. |
| `OPENAI_API_KEY` | Clé privée utilisée uniquement par les services IA backend. |
| `OPENAI_MODEL` | Modèle OpenAI à utiliser, par exemple `gpt-4o-mini`. |
| `OPENAI_MAX_OUTPUT_TOKENS` | Plafond de génération pour une analyse, `1650` par défaut. |
| `STRIPE_SECRET_KEY` | Clé secrète Stripe, backend uniquement. |
| `STRIPE_WEBHOOK_SECRET` | Secret de signature du webhook Stripe. |
| `STRIPE_PRICE_PRO` | Identifiant du prix mensuel Pro Stripe. |
| `RESEND_API_KEY` / `EMAIL_FROM` | Fournisseur d’e-mail transactionnel et expéditeur. |
| `FRONTEND_URL` / `APP_URL` | URL publique du frontend pour Checkout et les e-mails. |

Ne placez jamais une clé OpenAI dans le frontend ni dans le dépôt.

### Frontend — `frontend/.env`

| Variable | Description |
| --- | --- |
| `VITE_API_URL` | URL publique de l’API, par exemple `http://localhost:3001`. |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Facultatif : uniquement si une intégration Stripe client est ajoutée plus tard. |

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

- Inscription, connexion, déconnexion, maintien de session JWT, vérification d’e-mail, réinitialisation de mot de passe et gestion du profil.
- Création, édition, suppression et export PDF de CV.
- Expériences, formations, compétences, langues et aperçu A4 en direct.
- Templates Classique, Moderne et Minimal ; couleur d’accent et taille de texte personnalisables.
- Détection d’un dépassement A4 : l’enregistrement et l’export du CV sont alors bloqués.
- Lettres de motivation : CRUD, liaison facultative à un CV, aperçu A4, modèles Classique/Moderne et export PDF.
- Candidatures : CRUD, statuts, recherche, filtres et liaisons avec un CV ou une lettre.
- Analyse IA d’offre : score de correspondance, compétences déjà présentes, précisions à renforcer, compétences absentes, mots-clés et suggestions.
- Génération IA d’un brouillon de lettre depuis une analyse ; le contenu reste éditable et n’invente pas de données du CV.
- Plans Free / Pro, quotas IA mensuels suivis en base et affichés dans les paramètres.
- Checkout et Customer Portal Stripe préparés ; le webhook signé reste la source de vérité de l’abonnement.

## Sécurité et IA

Toutes les routes métier sont protégées par JWT. Les contrôleurs vérifient la propriété des CV, lettres et candidatures avant toute lecture ou écriture. Les routes d’authentification sensibles et IA sont limitées en débit ; les jetons d’e-mail et de réinitialisation sont hachés en base.

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
- Avant déploiement, exécutez `database/schema.sql` sur la base Supabase cible, configurez des origines CORS HTTPS précises, `TRUST_PROXY=true` si nécessaire et renseignez OpenAI, Stripe et l’e-mail transactionnel uniquement si ces fonctions sont activées. Créez ensuite le webhook Stripe vers `POST /api/v1/stripe/webhook` avec les événements d’abonnement et de facture décrits dans Stripe.
