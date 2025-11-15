# Nesra Town

A **gamified productivity world** that helps users focus, execute deep work, and build consistent habits through an immersive 2D virtual town experience.

## 🎮 Overview

Nesra Town transforms productivity into an engaging game experience. Instead of traditional todo apps, users enter a **2D virtual town** (similar to GatherTown and cozy RPG environments) where their **real-life productivity sessions** directly upgrade their avatar, unlock cosmetics, and expand the world.

### Product Vision

Create the **most fun, immersive, and rewarding productivity system** by combining:
- A small 2D world where the user moves around
- Productivity sessions (25m, 50m, 90m)
- RPG-style progression (levels, XP, gold)
- Cosmetic rewards and room upgrades
- Clear feedback loops that encourage consistency

The goal is to replace dopamine-draining activities with a dopamine-positive ecosystem connected to meaningful work.

## 🏗️ Tech Stack

- **Backend**: FastAPI (Python 3.11+) with SQLAlchemy, Alembic migrations
- **Frontend**: Next.js 15 with TypeScript, React, Tailwind CSS, Phaser.js
- **Database**: PostgreSQL
- **Package Managers**: Poetry (backend), Bun (frontend)
- **Development**: Docker Compose, Justfile recipes

## 📁 Project Structure

```
.
├── backend/          # FastAPI backend service
│   ├── src/         # Source code
│   ├── tests/       # Test suites
│   └── alembic/     # Database migrations
├── frontend/         # Next.js frontend application
│   ├── src/app/     # Next.js routes
│   ├── src/components/  # React components
│   └── src/lib/     # Utilities and helpers
├── ai/              # AI agent specifications and docs
│   ├── specs/       # Specification documents
│   └── docs/        # Documentation for AI agents
└── docker-compose.yml  # Local development orchestration
```

## 🚀 Getting Started

### Prerequisites

- **Just**: Command runner ([Installation guide](https://github.com/casey/just))
- **Poetry**: Python dependency management ([Installation guide](https://python-poetry.org/docs/#installation))
- **Bun**: JavaScript runtime and package manager
- **Docker & Docker Compose**: For local database and services

### Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd game
   ```

2. **Set up environment variables**
   ```bash
   # Backend
   cd backend
   cp .env.example .env
   # Edit .env with your configuration
   
   # Frontend
   cd ../frontend
   cp .env.example .env
   # Set NEXT_PUBLIC_API_BASE_URL
   ```

3. **Start the database**
   ```bash
   just up  # Starts PostgreSQL in Docker
   ```

4. **Set up backend**
   ```bash
   cd backend
   poetry install
   just migrate  # Run database migrations
   just run      # Start FastAPI dev server
   ```

5. **Set up frontend**
   ```bash
   cd frontend
   bun install
   bun dev  # Start Next.js dev server
   ```

6. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Docs: http://localhost:8000/docs

## 🛠️ Development

### Backend Commands

```bash
cd backend

# Run development server
just run

# Run linters
just lint

# Create migration
just mm <migration_name>

# Run migrations
just migrate

# Downgrade migrations
just downgrade -1
```

### Frontend Commands

```bash
cd frontend

# Development server
bun dev

# Production build
bun run build

# Start production server
bun run start
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
   pnpm --filter @nesra-town/db generate
   pnpm --filter @nesra-town/db migrate
   ```
5. Inspect the database with Drizzle Studio whenever you need to debug data:
   ```bash
   pnpm --filter @nesra-town/db studio
   ```

Run `pnpm db:env` whenever the `DATABASE_URL` changes so `.env.postgres` stays in sync. Both files are gitignored to keep secrets local.

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
- **[Backend README](./backend/README.md)**: Backend-specific setup and development guide
- **[Frontend README](./frontend/README.md)**: Frontend-specific setup and development guide

## 🧪 Testing

### Backend Tests
```bash
cd backend
poetry run pytest --maxfail=1 --disable-warnings --cov=src
```

### Frontend Tests
```bash
cd frontend
bun run test
```

## 🔒 Security

- Authentication required for all API endpoints
- Backend validates all reward logic
- Never commit secrets - use `.env` files locally
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
