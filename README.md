# IronLog

IronLog is a single-user, mobile-first web app for logging resistance-training workouts. It runs as a Docker Compose stack (React frontend served by Nginx, Node/Express API, PostgreSQL) and is intended for local-network use without authentication.

**Key features**
- Simple, fast workout logging (weight, reps, RPE)
- Rest countdown + stopwatch and rest-duration recording
- Program-based weekly workout structure and seeds
- PostgreSQL persistence with migrations and seed data

## Tech stack
- Frontend: React (Vite) + Tailwind
- Backend: Node.js + Express
- Database: PostgreSQL
- Deployment: Docker Compose (recommended)

## Prerequisites
- Docker & Docker Compose (recommended)
- Or: Node.js (v18+ / v20 recommended) and PostgreSQL

## Quick start (Docker Compose - recommended)
1. Copy the example environment file and set a strong DB password:

   cp .env.example .env
   # Edit .env and set POSTGRES_PASSWORD

2. Build and start all services:

```bash
docker-compose up --build
```

3. After startup:
- Frontend: http://localhost:3000
- API: http://localhost:3001

Notes: the Postgres service is bound to 127.0.0.1:5432 by default; change `docker-compose.yml` if you need a different binding.

Migrations are applied automatically when the API starts (see `server/src/db/migrate.js`). The initial seed data is applied by the SQL migration `002_seed_data.sql`.

## Local development (without Docker)
1. Prepare environment variables (copy `.env.example` to `.env` and set `POSTGRES_*` values). Ensure a running Postgres instance is available.

2. API (server)

```bash
cd server
npm ci
# start in watch/dev mode
npm run dev
# or in production mode
npm start
```

The server will run migrations on startup.

3. Frontend (client)

```bash
cd client
npm ci
# start dev server (Vite)
npm run dev
# or build for production
npm run build
```

If serving a production build locally without Docker, the built files appear in `client/dist` and can be served by a static server or Nginx.

## Running migrations manually
Migrations run automatically when the API starts. To apply migrations, start the server (`npm start`) and watch the logs; the migration runner is `server/src/db/migrate.js`.

## Project structure (abridged)
- `client/` — React app (Vite)
- `server/` — Node/Express API
- `db/init/` — SQL init scripts mounted into Postgres container
- `docker-compose.yml` — Compose stack for db, api, client

## Backup & Restore

The PostgreSQL data lives in the `pgdata` Docker volume. To create a backup:

```bash
docker-compose exec db pg_dump -U ironlog ironlog > backup_$(date +%Y%m%d).sql
```

To restore from a backup:

```bash
docker-compose exec -T db psql -U ironlog ironlog < backup_20260210.sql
```

Data persists across `docker-compose down` and `docker-compose up` because the `pgdata` volume is not removed. To fully reset the database (destroys all data):

```bash
docker-compose down -v
docker-compose up --build
```

## Notes
- Single-user app for local network use; no authentication enabled.
- Seed data and initial program are included in migrations.

---

For development questions or to add contributor notes, update this README or open an issue in the repo.
