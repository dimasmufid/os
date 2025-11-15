# OS

A **gamified productivity world** that helps users focus, execute deep work, and build consistent habits through an immersive 2D virtual town experience.

## 🎮 Overview

OS transforms productivity into an engaging game experience. Instead of traditional todo apps, users enter a **2D virtual town** (similar to GatherTown and cozy RPG environments) where their **real-life productivity sessions** directly upgrade their avatar, unlock cosmetics, and expand the world.

### Product Vision

Create the **most fun, immersive, and rewarding productivity system** by combining:
- A small 2D world where the user moves around
- Productivity sessions (25m, 50m, 90m)
- RPG-style progression (levels, XP, gold)
- Cosmetic rewards and room upgrades
- Clear feedback loops that encourage consistency

The goal is to replace dopamine-draining activities with a dopamine-positive ecosystem connected to meaningful work.

## 🏗️ Tech Stack

- **Backend**: NestJS with TypeScript
- **Frontend**: TanStack Start (React) with TypeScript, Tailwind CSS
- **Database**: PostgreSQL with Drizzle ORM
- **Package Manager**: pnpm
- **Monorepo**: Turborepo
- **Development**: Docker Compose

## 📁 Project Structure

```
.
├── apps/
│   ├── api/         # NestJS backend service
│   │   ├── src/     # Source code
│   │   └── test/    # Test suites
│   └── web/         # TanStack Start frontend application
│       ├── src/routes/     # File-based routes
│       ├── src/components/  # React components
│       └── src/lib/     # Utilities and helpers
├── packages/
│   ├── db/          # Drizzle schema and migrations
│   ├── ui/          # Shared UI components
│   └── types/       # Shared TypeScript types
├── ai/              # AI agent specifications and docs
│   ├── specs/       # Specification documents
│   └── docs/        # Documentation for AI agents
└── docker-compose.yml  # Local development orchestration
```

## 🚀 Getting Started

### Prerequisites

- **Node.js**: >=18.0.0 ([Installation guide](https://nodejs.org/))
- **pnpm**: >=8.0.0 ([Installation guide](https://pnpm.io/installation))
- **Docker & Docker Compose**: For local database and services

### Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd os
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   ```bash
   # Copy example env file and update with your configuration
   cp .env.example .env.local
   # Edit .env.local with your DATABASE_URL and other settings
   
   # Generate .env.postgres for Docker Compose
   pnpm db:env
   ```

4. **Start the database**
   ```bash
   docker compose up -d postgres
   ```

5. **Run database migrations**
   ```bash
   pnpm --filter @os/db generate
   pnpm --filter @os/db migrate
   ```

6. **Start development servers**
   ```bash
   pnpm dev  # Starts both API and web in watch mode
   ```

7. **Access the application**
   - Frontend: <http://localhost:3000>
   - Backend API: <http://localhost:3000> (configure via `PORT` env variable in `.env.local` if needed)

## 🛠️ Development

### Workspace Commands

```bash
# Run all apps in development mode
pnpm dev

# Build all apps and packages
pnpm build

# Run linters across workspace
pnpm lint

# Run tests across workspace
pnpm test
```

### Backend Commands (NestJS)

```bash
# Run development server
pnpm --filter api dev

# Build for production
pnpm --filter api build

# Run tests
pnpm --filter api test

# Run tests with coverage
pnpm --filter api test:cov
```

### Frontend Commands (TanStack Start)

```bash
# Run development server
pnpm --filter web dev

# Build for production
pnpm --filter web build

# Start production server
pnpm --filter web start

# Run tests
pnpm --filter web test
```

### Database Commands

```bash
# Generate migrations from schema changes
pnpm --filter @os/db generate

# Run migrations
pnpm --filter @os/db migrate

# Open Drizzle Studio (database GUI)
pnpm --filter @os/db studio

# Sync .env.postgres from DATABASE_URL
pnpm db:env
```

### Running with Docker Compose

```bash
# Build and start all services
docker-compose up -d --build

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## 🗄️ Database Setup (Drizzle + PostgreSQL)

1. Copy the sample environment file and tweak the `DATABASE_URL` if needed:
   ```bash
   cp .env.example .env.local
   ```
2. Generate `.env.postgres` so Docker Compose can extract individual credentials from your `DATABASE_URL`:
   ```bash
   pnpm db:env
   ```
3. Boot PostgreSQL through Docker Compose (data persists in the `postgres_data` volume):
   ```bash
   docker compose up -d postgres
   ```
4. Generate SQL snapshots from the Drizzle schema and push them to the database:
   ```bash
   pnpm --filter @os/db generate
   pnpm --filter @os/db migrate
   ```
5. Inspect the database with Drizzle Studio whenever you need to debug data:
   ```bash
   pnpm --filter @os/db studio
   ```

Run `pnpm db:env` whenever the `DATABASE_URL` changes so `.env.postgres` stays in sync. Both files are gitignored to keep secrets local.

## 🔐 Authentication

The Nest API now hosts [Better Auth](https://better-auth.com/) under `/api/auth/*`, backed by the shared Drizzle/PostgreSQL database, Resend for transactional emails, and Google OAuth.

1. Add the following variables to `.env.local` (see `.env.example` for placeholders):
   - `BETTER_AUTH_SECRET` – random 32+ character string used to sign tokens.
   - `BETTER_AUTH_URL` – the public base URL for the API (e.g. `http://localhost:3000` in local dev).
   - `RESEND_API_KEY` and `RESEND_FROM_EMAIL` – credentials + from address for transactional emails.
   - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` – OAuth credentials with the redirect URL `http://localhost:3000/api/auth/callback/google` (replace host/port if your API runs elsewhere).
2. Configure your Resend domain/sender so the from address matches `RESEND_FROM_EMAIL`.
3. When you tweak `apps/api/src/auth/better-auth.factory.ts` (adding providers, plugins, etc.) regenerate the Better Auth schema and re-run migrations (the CLI entry point lives at `apps/api/src/auth/auth.config.ts`):
   ```bash
   BETTER_AUTH_SECRET=dev BETTER_AUTH_URL=http://localhost:3000 \
   RESEND_API_KEY=dev RESEND_FROM_EMAIL=dev@example.com \
   GOOGLE_CLIENT_ID=dev GOOGLE_CLIENT_SECRET=dev \
   DATABASE_URL=postgresql://app:app@localhost:5432/app \
     npx @better-auth/cli@latest generate --config apps/api/src/auth/auth.config.ts --output packages/db/src/better-auth-schema.ts --yes

   pnpm --filter @os/db generate
   pnpm --filter @os/db migrate
   ```
4. Start the API (`pnpm --filter api dev`) and the Better Auth module will automatically serve every handler + guard Nest controllers by default.

## 🎯 Core Features (v1)

- **World & Movement**: 2D tilemap with WASD controls, multiple rooms (Study, Build, Training)
- **Productivity Sessions**: Timer-based sessions (25m, 50m, 90m) with task templates
- **Avatar Progression**: Level system with XP and Gold rewards
- **Cosmetics & Inventory**: Collectible items (hats, outfits, accessories) with rarity system
- **World Progression**: Room upgrades unlock as users complete more sessions
- **UI Panels**: XP/Level/Gold/Streak display, task selector, inventory management

## 📊 Reward System

- **XP Formula**: `duration_minutes * 2`
- **Gold Formula**: `duration_minutes * 1`
- **Leveling**: `EXP to next level = current_level * 100`
- **Cosmetic Drops**: 10% chance per completed session

## 📚 Documentation

- **[Product Requirements Document (PRD)](./ai/specs/prd.md)**: Complete product specifications
- **[Backend Specifications](./ai/specs/backend.md)**: Backend architecture and API details
- **[Frontend Specifications](./ai/specs/frontend.md)**: Frontend architecture and component structure
- **[Backend README](./apps/api/README.md)**: Backend-specific setup and development guide
- **[Frontend README](./apps/web/README.md)**: Frontend-specific setup and development guide

## 🧪 Testing

### Backend Tests (Jest)
```bash
pnpm --filter api test
pnpm --filter api test:cov  # With coverage
```

### Frontend Tests (Vitest)
```bash
pnpm --filter web test
```

### Run All Tests
```bash
pnpm test
```

## 🔒 Security

- Authentication required for all API endpoints
- Backend validates all reward logic
- Never commit secrets - use `.env.local` files locally
- Keep `.env.example` files updated

## 🗺️ Roadmap

### v1 (Launch)
- Single-player world
- Productivity sessions
- Cosmetics system
- Room upgrades
- Timer overlay
- Task templates

### v2 (Future)
- Background music
- Pets system
- Day streak quests
- NPCs

### v3 (Future)
- Multiplayer plaza
- Chat bubbles
- Shared guild rooms

## 🤝 Contributing

1. Follow the coding style guidelines in `AGENTS.md`
2. Use conventional commit messages with scope prefixes
3. Ensure tests pass before submitting PRs
4. Update documentation as needed

## 📝 License

See individual LICENSE files in backend/ and frontend/ directories.

---

**Status**: Active Development  
**Version**: 1.0 (Draft)  
**Last Updated**: 2025-11-15
