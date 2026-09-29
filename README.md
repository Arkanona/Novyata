# Novyata

Novyata est un SaaS de création de CV. Il permet de créer, personnaliser, enregistrer et exporter des CV professionnels, tout en conservant un espace utilisateur sécurisé.

La direction graphique de référence est disponible dans [DESIGN.md](./DESIGN.md).

## Stack

- Frontend : React, Vite, JSX et Sass.
- Backend : Node.js et Express.
- Base de données : PostgreSQL hébergée sur Supabase.
- Authentification : JWT et bcrypt.

## Prérequis

- Node.js 20 ou plus récent.
- Un projet Supabase avec une base PostgreSQL.

## Installation

Installez les dépendances de chaque application :

```bash
cd frontend
npm install

cd ../backend
npm install
```

## Variables d’environnement

Copiez les fichiers d’exemple sans commiter les fichiers `.env` créés :

```powershell
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env
```

Variables backend attendues :

| Variable | Description |
| --- | --- |
| `PORT` | Port de l’API, `3000` par défaut. |
| `DATABASE_URL` | Chaîne de connexion PostgreSQL fournie par Supabase. |
| `JWT_SECRET` | Secret JWT long, aléatoire et privé. |
| `JWT_EXPIRES_IN` | Durée de validité d’un jeton, par exemple `7d`. |
| `CORS_ORIGIN` | URL du frontend, par exemple `http://localhost:5173`. |

Variable frontend attendue :

| Variable | Description |
| --- | --- |
| `VITE_API_URL` | URL publique de l’API, par exemple `http://localhost:3000`. |

Dans le SQL Editor de Supabase, exécutez [database/schema.sql](./database/schema.sql). Le script crée les tables `users`, `resumes`, `experiences`, `educations`, `skills` et `languages`, avec leurs relations et index.

## Lancer le projet

Dans un premier terminal :

```bash
cd backend
npm run dev
```

Nodemon démarre l’API sur `http://localhost:3000`. Depuis le dossier `backend`, vous pouvez aussi utiliser :

```powershell
nodemon .\app.js
```

Dans un second terminal :

```bash
cd frontend
npm run dev
```

Vite démarre le frontend sur `http://localhost:5173`.

## Commandes de vérification

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

## Fonctionnalités disponibles

- Inscription, connexion, déconnexion et maintien de session JWT.
- Protection des routes privées.
- Profil utilisateur, changement de mot de passe et suppression de compte.
- Création, édition, consultation et suppression de CV.
- Expériences, formations, compétences et langues reliées à chaque CV.
- Aperçu A4 en direct.
- Templates Classique, Moderne et Minimal, avec couleur et taille de texte personnalisables.
- Export d’un CV au format PDF.

Le suivi des candidatures et les lettres de motivation ne font pas encore partie des fonctionnalités disponibles.
