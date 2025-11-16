# Repository Guidelines

## Project Structure & Module Organization

Services live under `apps/`. `apps/api/` is the FastAPI backend with code in `src/`, auth helpers in `src/auth/`, and migrations tracked in `alembic/`. `apps/frontend/` is the Next.js client: routes in `app/`, shared UI in `components/`, hooks in `hooks/`, utilities in `lib/`, and static assets in `public/`. Root Dockerfiles and `docker-compose.prod.yml` define how the stack runs locally and in production.

## Build, Test, and Development Commands

- Backend: `cd apps/api && poetry install`; `just run` (Uvicorn dev server); `just migrate` (Alembic upgrade); `just lint` (Ruff format+lint); `just up` (docker-compose services).
- Frontend: `cd apps/frontend && bun install`; `bun dev` (Next dev server); `bun run build` (production bundle); `bun run lint` (ESLint core-web-vitals).

## Coding Style & Naming Conventions

Python targets 3.12 with Ruff enforcing `E`, `W`, `F`, and `I001`. Use 4-space indentation, type-hinted signatures, snake_case modules, and expose typed `APIRouter` instances per route file. TypeScript relies on the Next.js Core Web Vitals ESLint stack—keep components PascalCase, hooks camelCase, and colocate Tailwind utility styling with the component that owns it.

## Testing Guidelines

Ship automated checks with every change. Backend suites belong in `apps/api/tests/` and should run via `poetry run pytest` (add dependencies such as `pytest` and HTTPX to the dev group when needed). Frontend tests belong under `apps/frontend/__tests__/` or colocated `*.test.tsx` files, driven by React Testing Library with `bun test` once configured. Prioritize auth flows, API contracts, and form validation; document any gaps you cannot close.

## Commit & Pull Request Guidelines

Favor short, imperative commits with Conventional Commit prefixes (e.g., `feat: add inbound ticket router`). PRs must link issues, summarize the change, list commands run, and flag migrations or config edits. Attach screenshots for UI updates and confirm `just lint` and `bun run lint` before requesting review. Keep scope tight and call out skipped checks explicitly.

## Environment & Configuration

Copy `.env.example` to `.env` in `apps/api/` and supply Postgres plus Fief secrets before running `just run`. The frontend consumes `NEXT_PUBLIC_*` variables—record defaults and usage in PRs. After touching Dockerfiles or `docker-compose.prod.yml`, verify with `docker compose -f docker-compose.prod.yml up --build` to keep parity.

## Directory Tree & Usage

_IMPORTANT: You are responsible for all the entire codebase. For every request you receive, please assest which part of the codebase is affected and make the changes accordingly. Whether it is related with backend, frontend, or orchestration._

```
.
├── apps
│   ├── api
│   │   ├── src
│   │   └── tests
│   ├── web
│   │   ├── src/app
│   │   ├── src/components
│   │   └── src/lib
├── ai
│   └── specs
│   └── docs
```

- `apps/api`: FastAPI backend with business logic in `src/` and pytest suites in `tests/`; includes Alembic migrations, Just recipes, and Docker scaffolding.
- `apps/api/ai/docs/openapi.json`: OpenAPI schema for the FastAPI backend.
- `apps/web`: Next.js 16 frontend where routes live in `src/app/`, shared UI in `src/components/`, and client utilities in `src/lib/`.
- `ai/specs`: Specification documents that guide AI agent behaviors and integrations.
- `ai/docs`: Documentation for all important information for the ai agents.

## Rules

- for create snapshot for db migration, always init by command `just mm *migration_name*`. only after that, you can edit the snapshot file to add the changes. **DO NOT CREATE SNAPSHOT FILE MANUALLY**.
- always use `shadcn ui` for ui components.
- always use `zod` for form validation in frontend.
