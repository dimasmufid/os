# Repository Guidelines

## Project Structure & Module Organization
This app is a standard NestJS service that boots from `src/main.ts`, registers dependencies in `src/app.module.ts`, and exposes transport logic through `src/app.controller.ts` and `src/app.service.ts`. Keep domain-specific modules inside `src/feature-name/` folders so controllers, services, and DTOs stay collocated next to the module definition. Unit specs such as `src/app.controller.spec.ts` live next to the code under test, while end-to-end specs are collected under `test/` with their Jest config in `test/jest-e2e.json`. Built artifacts are emitted to `dist/` via `nest build`, so avoid editing anything under that directory.

## Build, Test, and Development Commands
- `pnpm install`: install dependencies defined in `package.json`.
- `pnpm dev`: run `nest start --watch` for live-reload development.
- `pnpm build`: compile TypeScript to `dist/` using the Nest CLI.
- `pnpm start` / `pnpm start:prod`: execute the compiled server (use the prod variant when `NODE_ENV=production`).
- `pnpm lint`: run ESLint with auto-fix over `{src,apps,libs,test}/**/*.ts`.
- `pnpm format`: apply the Prettier style to `src/` and `test/`.

## Coding Style & Naming Conventions
Code in modern TypeScript targeting the defaults in `tsconfig.json`, and stick to Prettier’s 2‑space indentation and single-quote style. Classes (modules, controllers, services) use `PascalCase`, providers and variables use `camelCase`, and constants that cross modules can use `SCREAMING_SNAKE_CASE`. DTOs should end with `Dto`, and Nest providers should be exported from an `index.ts` when reused elsewhere. Run `pnpm lint` for structural issues and `pnpm format` before opening a pull request.

## Testing Guidelines
Unit tests use Jest + ts-jest with files named `*.spec.ts` alongside the implementation. End-to-end coverage lives in `test/app.e2e-spec.ts` and runs against the compiled app via `pnpm test:e2e`, configured through `test/jest-e2e.json`. Use `pnpm test` for the standard suite and `pnpm test:cov` to generate reports in `coverage/`; ensure any new controller or provider has direct unit coverage plus at least one e2e path when it touches HTTP contracts. Keep tests deterministic by mocking outbound dependencies with Nest’s testing module helpers.

## Commit & Pull Request Guidelines
Write commits in the imperative mood (“add healthcheck module”) and keep them scoped to a single concern; prefixing with a Conventional Commit type such as `feat:` or `fix:` is encouraged for clarity even though the history is currently sparse. Every pull request should include: a short description of the change, links to tracked issues, screenshots or sample responses for API changes, a checklist of the commands you ran (tests, lint), and explicit notes about breaking changes or required migrations. Request a review whenever business logic, DTOs, or dependency versions change.
