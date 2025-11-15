# @nesra-town/db

Shared database schema and migrations using Drizzle ORM.

## Setup

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Set up environment variables:
   ```bash
   DATABASE_URL=postgresql://user:password@localhost:5432/nesra_town
   ```

## Commands

- `pnpm generate` - Generate migration files from schema changes
- `pnpm migrate` - Run migrations against the database
- `pnpm studio` - Open Drizzle Studio to browse your database

## Usage

Import the schema in your apps:

```typescript
import { users } from "@nesra-town/db";
```

