# Repository Guidelines

## Project Structure & Module Organization
Source lives in `src/` with a TanStack Router entry in `router.tsx` and file-based routes under `src/routes` (root shell in `__root.tsx`, leaf screens like `index.tsx`). Shared building blocks belong in `src/components`, while hooks, data mocks, and integration helpers sit in `src/hooks`, `src/data`, and `src/integrations` respectively. Put global utilities in `src/lib` and keep styling primitives in `styles.css` plus Tailwind tokens. Static assets, favicons, and SEO files reside in `public/`. Co-locate feature-specific tests and stories with their components to keep ownership obvious.

## Build, Test, and Development Commands
- `pnpm install`: install workspace dependencies (required before any other command).
- `pnpm dev`: launch TanStack Dev with HMR on the configured port.
- `pnpm build`: create an optimized production bundle via `tanstack build`.
- `pnpm start`: serve the production build locally to verify SSR/CSR parity.
- `pnpm test`: run Vitest in batch mode; add `--watch` during active development.
- `pnpm lint`, `pnpm format`, `pnpm check`: run ESLint, Prettier, or the combined fix-all pipeline.

## Coding Style & Naming Conventions
Use TypeScript, React function components, and Tailwind CSS 4 utilities. Favor 2-space indentation, named exports, and PascalCase for components (`UserBadge.tsx`), camelCase for hooks/utilities (`usePaymentIntent.ts`), and kebab-case for route filenames. Prefer composable UI from `src/components` with class names produced via `clsx`/`cva`. Always run `pnpm format` or configure your editor to apply Prettier on save; ESLint rules extend `@tanstack/eslint-config` and expect strict type safety and accessible JSX.

## Testing Guidelines
Vitest with the React Testing Library is preconfigured (see `vitest.config.*`). Create `*.test.tsx` files next to the code they cover, mock data via `src/data`, and target real DOM interactions (avoid shallow rendering). When adding a feature, include at least one stateful test and keep coverage gaps under 10% for touched files. Use `pnpm test --coverage` before merging.

## Commit & Pull Request Guidelines
Commits should be concise, present-tense summaries (e.g., `Add stats card route`). Squash noisy WIP history locally. Pull requests need: a short problem statement, bullet summary of the solution, linked issue IDs, screenshots or GIFs for UI changes, and notes on tests run. Flag breaking changes in the description and ensure CI (lint + tests) is green.

## Security & Configuration Tips
Never commit secrets—reference them via environment variables loaded by TanStack/Nitro. Use `.env.local` for developer overrides and document new keys in the PR body. Validate third-party fetches inside `src/integrations` and ensure any router loaders sanitize inputs before passing them to client components.
