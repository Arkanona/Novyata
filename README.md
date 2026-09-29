# Novyata

Base de projet pour un SaaS de création de CV et de suivi de candidatures.

## Architecture actuelle

- `frontend/` : interface React (JSX uniquement), Vite, Sass et routes de navigation.
- `backend/` : API Express, point d’entrée applicatif et configuration PostgreSQL/Supabase.
- `database/schema.sql` : schéma relationnel initial du MVP (`users`, `resumes` et les sections d’un CV).

Les routes front préparées sont : `/`, `/connexion`, `/inscription`, `/dashboard`, `/cv`, `/cv/nouveau`, `/cv/:id` et la page 404. L’authentification et la protection des routes seront ajoutées dans les étapes suivantes.

## Démarrer

```bash
cd frontend
npm install
npm run dev
```

Dans un second terminal :

```bash
cd backend
npm install
npm run dev
```

`npm run dev` démarre l’API depuis `backend/src/server.js` avec Nodemon et la redémarre automatiquement à chaque modification dans `backend/src`.

Vous pouvez aussi lancer directement, depuis le dossier `backend` :

```powershell
nodemon .\src\server.js
```

Copiez `backend/.env.example` vers `backend/.env` et renseignez la chaîne de connexion Supabase lorsque la persistance sera mise en place.

## Authentification

Créez `backend/.env` à partir de `backend/.env.example`, renseignez DATABASE_URL, JWT_SECRET, JWT_EXPIRES_IN et CORS_ORIGIN, puis exécutez `database/schema.sql` dans le SQL Editor de Supabase.

L’API expose POST /api/v1/auth/register, POST /api/v1/auth/login et GET /api/v1/auth/me.

La direction visuelle de référence est documentée dans `DESIGN.md`.
