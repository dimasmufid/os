# Turborepo Setup Guide

This project uses [Turborepo](https://turbo.build/) as a monorepo build system.

## Project Structure

```
/os
  /apps
    /web        # TanStack Start (Phaser frontend)
    /api        # NestJS backend
  /packages
    /db         # Drizzle schema + migrations
    /ui         # shared UI components (optional)
    /types      # shared TS types (Hero, Session, WorldState, etc.)
  package.json
  turbo.json
  pnpm-workspace.yaml
```

## Getting Started

1. **Install dependencies** (from root):
   ```bash
   pnpm install
   ```

2. **Run development servers**:
   ```bash
   # Run web app
   pnpm turbo dev --filter=web
   
   # Run API
   pnpm turbo dev --filter=api
   
   # Run both
   pnpm turbo dev
   ```

3. **Build all packages**:
   ```bash
   pnpm turbo build
   ```

## Available Commands

### Root Level
- `pnpm dev` - Run dev for all apps
- `pnpm build` - Build all packages
- `pnpm lint` - Lint all packages
- `pnpm test` - Test all packages

### Filtered Commands
- `pnpm turbo dev --filter=web` - Run only web app
- `pnpm turbo dev --filter=api` - Run only API
- `pnpm turbo build --filter=@os/db` - Build only db package

## Using Shared Packages

### In apps/web or apps/api

Add the package as a dependency:

```json
{
  "dependencies": {
    "@os/db": "workspace:*",
    "@os/types": "workspace:*",
    "@os/ui": "workspace:*"
  }
}
```

Then import:

```typescript
// Types
import { Hero, Session } from "@os/types";

// Database schema
import { users } from "@os/db";

// UI components
import { Button } from "@os/ui";
```

## Deployment

Turborepo doesn't "deploy" anything; it just organizes builds.

### Option 1: Containerize Each App Separately

Create Dockerfiles:
- `apps/web/Dockerfile`
- `apps/api/Dockerfile`

Build command inside Docker:
```dockerfile
RUN pnpm install
RUN pnpm turbo build --filter=web
# or
RUN pnpm turbo build --filter=api
```

### Option 2: Single Repo, Multiple Deployments

Same repo, two Dokploy apps or two services in your compose. Each points to the same Git repo with different build/start commands.

## Workspace Configuration

The `pnpm-workspace.yaml` defines which directories are workspaces:

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

This allows packages to reference each other using `workspace:*` protocol.

## Pipeline Configuration

See `turbo.json` for pipeline definitions. The current setup includes:
- `dev` - Development mode (no cache, depends on dependencies)
- `build` - Production build (cached, depends on dependencies)
- `lint` - Linting
- `test` - Testing

