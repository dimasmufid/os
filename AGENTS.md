# Repository Guidelines

This document captures the rules needed to work consistently across the FastAPI backend and Next.js frontend.

## Project Structure & Module Organization
`backend/` hosts the FastAPI service (`src/` code, `alembic/versions` migrations, `entrypoints/` gunicorn scripts, `scripts/` helpers). `frontend/` contains the Next.js 16 app (routes in `src/app`, shared UI in `src/components`, utilities in `src/lib`, static assets in `public/`). Use the root `docker-compose.yml` to run both tiers locally and keep infra/config files beside their service.

## Build, Test & Development Commands
- `cd backend && just run` – start the FastAPI dev server.
- `just up`, `just mm <slug>`, `just migrate` – launch Postgres, autogenerate migrations, then upgrade.
- `cd backend && just lint` – apply `ruff format` and `ruff check --fix`.
- `cd frontend && pnpm run dev | pnpm run build | pnpm run start` – dev loop, production build, and preview.
- `docker-compose up -d --build` – build/run both services using the shared `.env`.

## Coding Style & Naming Conventions
Backend code targets Python 3.11+, four-space indents, explicit type hints, and snake_case packages (`src/auth`, `src/utils`). Shared schemas stay in `schemas.py`, endpoints return typed Pydantic models, and Ruff (see `backend/ruff.toml`) owns formatting + linting. Frontend modules run in TypeScript strict mode, React components use `PascalCase`, hooks/utilities use `camelCase`, and Tailwind-generated order stands; keep reusable widgets in `src/components` and colocate feature-specific files.

## Testing Guidelines
Place backend tests in `backend/tests/` mirroring the module tree and drive endpoints with `pytest` + `httpx.AsyncClient`; run suites via `poetry run pytest --maxfail=1 --disable-warnings --cov=src` and target ≥80 % coverage, including migration smoke checks (`alembic upgrade head`). Frontend work should ship React Testing Library or Playwright specs beside the component and expose them through an `pnpm run test` script so CI can consume them.

## Commit & Pull Request Guidelines
Use short, imperative commit subjects with a scope prefix (`feat: add leaderboard endpoint`, `fix: handle empty scores`). PRs should cover intent, implementation notes, validation evidence (commands, screenshots, curl output), and issue links. Explicitly mention required rollouts such as `just migrate` or env changes so deployers know the sequence.

## Security & Configuration Tips
Never commit secrets: copy `.env` locally, keep `.env.example` current, and use managed secrets in production. Backend code consumes `DATABASE_URL`, `DATABASE_ASYNC_URL`, `ENVIRONMENT`, CORS arrays, and optional `SENTRY_DSN`; document new vars in `src/config.py`. The frontend build needs `NEXT_PUBLIC_API_BASE_URL` set (env or Docker arg) before running `pnpm run dev` or `pnpm run build`.

## Rules

- for create snapshot for db migration, always init by command `just mm *migration_name*`. only after that, you can edit the snapshot file to add the changes. **DO NOT CREATE SNAPSHOT FILE MANUALLY**.
- always use `shadcn ui` for ui components.
- always use `zod` for form validation in frontend.