# @os/db

Shared database schema and migrations using Drizzle ORM.

## Setup

1. Copy the root `.env.example` to `.env.local` so Drizzle commands can read `DATABASE_URL`:
   ```bash
   cp .env.example .env.local # run from the repo root
   ```
2. Populate `.env.postgres` from your `DATABASE_URL` (rerun whenever the URL changes):
   ```bash
   pnpm db:env
   ```
3. Start PostgreSQL via Docker Compose:
   ```bash
   docker compose up -d postgres
   ```
4. Generate & apply migrations after editing `src/schema.ts`:
   ```bash
   pnpm --filter @os/db generate
   pnpm --filter @os/db migrate
   ```

Docker Compose reads `.env.postgres`, so remember to rerun `pnpm db:env` whenever `DATABASE_URL` changes.

## Commands

- `pnpm generate` - Generate migration files from schema changes
- `pnpm migrate` - Run migrations against the database
- `pnpm studio` - Open Drizzle Studio to browse your database

## Usage

Import the schema in your apps:

```typescript
import { users } from "@os/db";
```

The package also ships a lazy Postgres client helper you can reuse in services:

```typescript
import { getDb } from "@os/db";

const db = getDb(); // reads DATABASE_URL from process.env
```

Call `closeDb()` inside test teardown hooks when you need to gracefully shut down the underlying `postgres` connection.
