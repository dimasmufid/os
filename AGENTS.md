# Repository Guidelines

## Project Structure & Module Organization
PNPM and Turbo manage this monorepo. `apps/web` hosts the TanStack Start frontend; routes live in `src/routes` and shared UI in `src/components`. `apps/api` houses the NestJS backend with domain modules under `src` and request specs in `test`. Shared packages include `ui` (design system), `types` (cross-app DTOs), and `db` (Drizzle schema + migrations). Keep `ai/specs` and `ai/docs` synchronized whenever gameplay flows or API behavior changes.

## Build, Test, and Development Commands
- `pnpm install` – install workspace dependencies  
- `pnpm dev` – turbo-powered watch mode for web + api  
- `pnpm build` – production build for apps and packages  
- `pnpm lint` – run repo-wide ESLint targets  
- `pnpm test` – orchestrate Vitest and Jest suites  
- `pnpm --filter web dev` – start the frontend dev server  
- `pnpm --filter api start:dev` – run the NestJS dev server  
- `pnpm --filter @os/db migrate` – execute Drizzle migrations  

## Coding Style & Naming Conventions
All code is TypeScript-first and strict ESM. Prettier (single quotes, trailing commas) plus ESLint define formatting—enable format-on-save. Use two-space indentation, PascalCase React components, camelCase helpers/hooks, and kebab-case route folders. Group Nest controllers/services/modules inside domain folders (`sessions/sessions.service.ts`). Export shared interfaces from `packages/types`, colocate reusable UI in `packages/ui/src/components/<Component>/`, and manage schema or SQL changes exclusively through `packages/db`.

## Testing Guidelines
Vitest + Testing Library power the frontend suite (`pnpm --filter web test`); Nest’s Jest harness covers the API (`pnpm --filter api test`). Place specs next to their subjects (`*.test.tsx`, `*.spec.ts`), describe observable behavior, and include a failure-path assertion for every feature. Database or repository changes demand an integration spec that touches the Drizzle layer. Run `pnpm test` and `pnpm --filter api test:cov` before opening a pull request.

## Commit & Pull Request Guidelines
Follow Conventional Commits with scope prefixes (`feat(web): quest timer`). Keep commits atomic and include any required schema or documentation updates. Pull requests must summarize the change, link the tracking issue, attach UI proof when relevant, and state lint/test status. Request review from the owning module team before merging.

## Security & Configuration Tips
Never commit secrets. Copy env files from `apps/*/.env.example`, store real values in `.env.local`, and point `DATABASE_URL` at the Dockerized Postgres instance used by Drizzle. Validate inputs with Zod on the web tier and Nest pipes on the API tier, and refresh `ai/specs` whenever responses or reward logic change so dependent agents stay accurate.
