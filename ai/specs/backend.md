# OS – Backend Specification

Version: 0.3 (2025-01-11)  
Owner: Platform Engineering  
Status: Draft → Ready for development  
Document Goal: Provide a single source of truth for implementing the OS backend, whether it runs as **Next.js API routes** or the standalone **FastAPI service**. Both runtime options must expose the same modules, database schema, business logic, and HTTP contracts.

---

## 1. Purpose & Scope
The backend is the **authoritative game brain**. It tracks players, sessions, inventory, and world progression. The API returns JSON only, is authenticated, and only accepts durations/tasks defined by the system. This spec covers:

- Architecture + deployment options
- Database schema and domain model
- Reward logic and world progression rules
- API contracts (requests, responses, error codes)
- Background processing, security, and observability expectations
- Testing and migration guidelines

Out of scope: multiplayer transport, push notifications, payments, or analytics pipelines.

---

## 2. Architecture Overview

### 2.1 Runtime Options
| Option | When to choose | Tech Stack | Notes |
|--------|----------------|-----------|-------|
| Next.js API Routes (recommended for rapid iteration) | Frontend + backend in one repo, share TS models | App Router API routes, Prisma (Postgres), Zod validation | Server Actions can call the same domain functions |
| FastAPI service | Need service isolation or background workers | FastAPI 0.111+, SQLAlchemy + Alembic, Pydantic v2 | Reuse existing Docker/Just scripts under `backend/` |

Both runtimes share the **same domain layer** concepts (services, repositories, schema). When using Next.js, implement domain logic under `frontend/src/server` and keep the interface parity with FastAPI routers.

### 2.2 Modules
```
domain/
  auth.py(ts)
  hero.py(ts)
  sessions.py(ts)
  inventory.py(ts)
  world.py(ts)
data/
  repositories/
    user_repo.*
    hero_repo.*
    session_repo.*
  dto/ (Pydantic / Zod schemas)
api/
  routers (FastAPI) / route handlers (Next.js)
tasks/
  cron.py / queue.ts (future background jobs)
```

### 2.3 Dependencies
- **Postgres 15** (single primary). Use UUID primary keys.
- Optional **Redis** for session locks and streak jobs (v1 can rely on DB transactions).
- Authentication source: JWT signed by backend (FastAPI) or NextAuth session tokens when running inside Next.js. Regardless of mechanism, the services receive a `user_id`.
- Time source: UTC everywhere, `timestamp with time zone`.
- Multi-tenant context: every request that touches gameplay data must resolve a tenant membership (via `current_tenant`). Clients send an `X-Tenant-Id` header when the user switches workspaces; otherwise the API falls back to the user's default membership. Tables like heroes, tasks, sessions, inventory, world state, and drop logs now include `tenant_id UUID NOT NULL REFERENCES tenant(id)` and are always queried with both `user_id` and `tenant_id` filters.

### 2.4 Non-Functional Targets
- P99 API latency < 400 ms (excluding session start timers).
- Race conditions prevented with DB transactions + `SELECT ... FOR UPDATE` where needed.
- Consistent JSON envelope; clients should not depend on DB column names.

---

## 3. Data Model & Schema

### 3.1 Entity Overview
| Entity | Purpose | Key relationships |
|--------|---------|-------------------|
| `User` | Auth record + profile metadata | 1:1 Hero, 1:N Sessions, 1:N TaskTemplates, 1:N Inventory |
| `Hero` | Progression state (level, xp, gold, equipped cosmetics) | FK to User, optional FK to Item for each slot |
| `TaskTemplate` | Saved templates tied to a room/category | FK to User (owner) |
| `Session` | Actual focus timer attempt | FK to User & TaskTemplate |
| `Item` | Cosmetic definitions | Referenced by Inventory + Hero |
| `Inventory` | Junction table describing what items a user owns | FK to User & Item |
| `WorldState` | Aggregate stats for progression/streaks | FK to User |
| `CosmeticDropLog` (optional v1) | Audit for drops to help analytics | FK to Session & Item |

### 3.2 Enumerations
```text
SessionStatus = pending | active | success | cancel | timeout
TaskCategory = study | build | training | custom
Room = study_room | build_room | training_room
ItemType = hat | outfit | accessory
ItemRarity = common | rare | epic
```

### 3.3 Table Definitions

#### `users`
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
email CITEXT UNIQUE NOT NULL,
hashed_password TEXT NOT NULL,
is_active BOOLEAN NOT NULL DEFAULT TRUE,
is_superuser BOOLEAN NOT NULL DEFAULT FALSE,
is_verified BOOLEAN NOT NULL DEFAULT FALSE,
full_name TEXT,
profile_picture TEXT,
created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
updated_at TIMESTAMPTZ
```
Indexes: `users_email_idx`, `users_active_idx`.

#### `heroes`
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
level INT NOT NULL DEFAULT 1,
exp INT NOT NULL DEFAULT 0,
gold INT NOT NULL DEFAULT 0,
equipped_hat_id UUID REFERENCES items(id),
equipped_outfit_id UUID REFERENCES items(id),
equipped_accessory_id UUID REFERENCES items(id),
updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
UNIQUE (tenant_id, user_id)
```
Business rules: equipped item must exist in user inventory or be null.

#### `task_templates`
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
name TEXT NOT NULL,
category TEXT NOT NULL,
default_duration_minutes INT NOT NULL CHECK (default_duration_minutes IN (25, 50, 90)),
room TEXT NOT NULL,
created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
```

#### `sessions`
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
task_template_id UUID REFERENCES task_templates(id),
duration_minutes INT NOT NULL CHECK (duration_minutes IN (25,50,90)),
room TEXT NOT NULL,
started_at TIMESTAMPTZ NOT NULL,
ended_at TIMESTAMPTZ,
status TEXT NOT NULL DEFAULT 'pending',
reward_exp INT NOT NULL DEFAULT 0,
reward_gold INT NOT NULL DEFAULT 0,
drop_item_id UUID REFERENCES items(id),
created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
```
Indexes: `sessions_user_status_idx` (user_id, status DESC, started_at DESC); partial index for `status='pending'` to speed up timers.

#### `items`
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
name TEXT NOT NULL,
type TEXT NOT NULL,
rarity TEXT NOT NULL,
sprite_key TEXT NOT NULL,
unlock_level INT DEFAULT 1,
created_at TIMESTAMPTZ NOT NULL DEFAULT now()
```

#### `inventory`
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
item_id UUID NOT NULL REFERENCES items(id),
obtained_at TIMESTAMPTZ NOT NULL DEFAULT now(),
UNIQUE (tenant_id, user_id, item_id)
```

#### `world_states`
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
study_room_level INT NOT NULL DEFAULT 1,
build_room_level INT NOT NULL DEFAULT 1,
training_room_level INT NOT NULL DEFAULT 1,
plaza_level INT NOT NULL DEFAULT 1,
total_sessions_success INT NOT NULL DEFAULT 0,
day_streak INT NOT NULL DEFAULT 0,
last_session_date DATE,
last_reset_at TIMESTAMPTZ,
UNIQUE (tenant_id, user_id)
```

#### `cosmetic_drop_logs` (optional)
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
item_id UUID NOT NULL REFERENCES items(id),
rolled_at TIMESTAMPTZ NOT NULL DEFAULT now()
```

### 3.4 Derived Views
- Materialized view `hero_progression_view` for leaderboards (level, exp, total sessions).
- `inventory_with_items` view to hydrate UI without multiple joins.

### 3.5 Migration Strategy
- Use `just mm <slug>` to generate Alembic migrations (FastAPI) or `npx prisma migrate dev` for Next.js runtime. Never hand write snapshot files.
- Each migration must be idempotent, include downgrade path, and update `backend/README` or `frontend/prisma/README`.

---

## 4. Domain Logic

### 4.1 Session Lifecycle
1. **Start** (`POST /api/sessions/start`):
   - Validate `task_template_id` belongs to user.
   - Validate `duration_minutes` ∈ {25, 50, 90}.
   - Create session with `status=pending`, `started_at=now()`.
2. **Activation** (optional internal step): server can mark status `active` once timer hits >0 to allow analytics.
3. **Complete** (`POST /api/sessions/:id/complete`):
   - Ensure session belongs to user and is `pending|active`.
   - Validate `now() - started_at` >= `0.8 * duration_minutes` to discourage instant completes (configurable).
   - Within DB transaction: compute rewards, update hero + world state, create inventory rows if drop occurs, mark session `success`.
4. **Cancel** (`POST /api/sessions/:id/cancel`):
   - Set status `cancel`, zero rewards.
5. **Timeout** (scheduled job):
   - Sessions older than duration + 15 min with `pending|active` become `timeout`.

### 4.2 Reward Calculation
```python
def compute_rewards(duration_minutes: int, hero_level: int) -> Reward:
    exp = duration_minutes * 2
    gold = duration_minutes * 1
    return Reward(exp=exp, gold=gold)
```
Level up loop:
```python
while hero.exp + reward.exp >= level * 100:
    hero.exp -= level * 100
    hero.level += 1
```
`level` floor is 1. Carry remaining exp after each level-up.

### 4.3 Cosmetic Drop
- Each successful session triggers RNG: `rand() < 0.10`.
- Weighted table by rarity:
  - Common: 75%
  - Rare: 20%
  - Epic: 5%
- Filter candidate items: not yet owned, unlock_level <= hero.level, matches room theme.
- If no eligible item, return `dropped_item = null`.

### 4.4 Inventory & Equipment Rules
- User cannot equip item they do not own.
- Equip endpoint updates hero slot, ensures slot type matches item type.
- When a new drop occurs and slot is empty, auto-equip unless user opted out (future flag).

### 4.5 World Progression
```
if total_sessions_success >= 30 → plaza_level = 2
if total_sessions_success >= 15 → build_room_level = 2
if total_sessions_success >= 5  → study_room_level = 2
training_room_level upgrades with level milestones (future)
```
- Always run from highest threshold down to keep idempotent.
- `WorldState` should also track `last_session_date`. When a success occurs on a new UTC day:
  - If previous success date == yesterday → increment `day_streak`.
  - Else reset streak to 1.
- Missed day (detected via cron) resets streak to 0 and updates `last_reset_at`.

### 4.6 Analytics Hooks
- Emit structured events (`session_success`, `session_cancel`, `drop_awarded`) via log or message queue for future data lake integration.

---

## 5. API Surface
All responses share envelope:
```json
{
  "success": true,
  "data": { ... },
  "error": null
}
```
On errors:
```json
{
  "success": false,
  "error": {
    "code": "SESSION_NOT_FOUND",
    "message": "Session not found"
  }
}
```
Use HTTP status codes (200, 201, 204, 400, 401, 403, 404, 409, 422, 500).

### 5.1 Authentication
- FastAPI: JWT issued after login, stored in `Authorization: Bearer`.
- Next.js API: use NextAuth `getServerSession`. When called from Phaser, prefer HTTP-only cookie session.
- Each handler extracts `user_id` and loads context (hero, world state). Deny access if user disabled.

### 5.2 Endpoint Catalogue

| Method & Path | Description |
|---------------|-------------|
| `GET /api/profile` | Returns combined `user`, `hero`, and `worldState`. |
| `GET /api/tasks` | List task templates (with pagination + room filter). |
| `POST /api/tasks` | Create new template. |
| `PUT /api/tasks/:id` | Update template. |
| `DELETE /api/tasks/:id` | Delete template. |
| `POST /api/sessions/start` | Create a pending session. |
| `POST /api/sessions/:id/complete` | Finalize a session and award rewards. |
| `POST /api/sessions/:id/cancel` | Cancel a pending session. |
| `GET /api/sessions/history` | Paginated history (limit, cursor). |
| `GET /api/inventory` | Return owned items + equipped slots. |
| `POST /api/inventory/equip` | Equip hat/outfit/accessory. |
| `GET /api/worldstate` | Returns world progression + streak info. |

Below are the detailed contracts for the core endpoints (others follow same pattern).

#### GET `/api/profile`
- Auth: required.
- Response `200 OK`:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "builder@example.com",
      "fullName": "Builder One",
      "avatar": "https://cdn/avatar.png"
    },
    "hero": {
      "level": 4,
      "exp": 80,
      "expToNext": 400,
      "gold": 120,
      "equipped": {
        "hatId": "uuid-or-null",
        "outfitId": null,
        "accessoryId": null
      }
    },
    "worldState": {
      "studyRoomLevel": 2,
      "buildRoomLevel": 1,
      "trainingRoomLevel": 1,
      "plazaLevel": 1,
      "totalSessionsSuccess": 9,
      "dayStreak": 4,
      "lastSessionDate": "2025-01-10"
    }
  }
}
```

#### GET `/api/tasks`
- Query params: `room?`, `limit=20`, `cursor`.
- Response `200` returns ordered list with pagination token.
- Validation: `room` must match enum; limit ≤ 50.

#### POST `/api/tasks`
```json
{
  "name": "Deep Work",
  "category": "build",
  "defaultDurationMinutes": 50,
  "room": "build_room"
}
```
- Response `201 Created` returns template object.

#### POST `/api/sessions/start`
Request:
```json
{
  "taskTemplateId": "uuid",
  "durationMinutes": 50
}
```
Validations:
- Template owned by user.
- No more than 2 concurrent pending sessions per user (guard with unique index or check).
Response:
```json
{
  "success": true,
  "data": {
    "sessionId": "uuid",
    "startedAt": "2025-01-11T09:20:00Z",
    "durationMinutes": 50,
    "room": "build_room",
    "status": "pending"
  }
}
```

#### POST `/api/sessions/:id/complete`
Request body optional (client can send `completedAt` for audit but backend trusts server time). Steps inside handler:
1. Load session `FOR UPDATE`.
2. Validate `status` in allowed set and `duration gate`.
3. `reward = compute_rewards(duration, hero.level)`.
4. Determine `drop_item_id`.
5. Update hero fields and world state within same transaction.
6. Return payload:
```json
{
  "success": true,
  "data": {
    "session": {
      "id": "uuid",
      "status": "success",
      "rewardExp": 100,
      "rewardGold": 50,
      "dropItem": {
        "id": "uuid",
        "name": "Study Cap",
        "type": "hat",
        "rarity": "rare",
        "spriteKey": "hat_study_cap"
      }
    },
    "hero": {
      "level": 5,
      "exp": 20,
      "gold": 170
    },
    "worldState": {
      "totalSessionsSuccess": 10,
      "dayStreak": 5,
      "studyRoomLevel": 2,
      "buildRoomLevel": 1,
      "trainingRoomLevel": 1,
      "plazaLevel": 1
    }
  }
}
```
- Errors:
  - `409 CONFLICT` when already completed.
  - `422 UNPROCESSABLE_ENTITY` for invalid duration/time gate.

#### POST `/api/sessions/:id/cancel`
- Body optional `{"reason": "user_cancelled"}` (string enum). Response 200 with updated session.

#### GET `/api/sessions/history`
- Query `limit (<=50)`, `cursor`. Returns sessions sorted desc, includes pagination metadata.

#### GET `/api/inventory`
- Response includes:
  - `items`: array of owned cosmetics.
  - `equipped`: hero slots (loose coupling to hero endpoint).
  - `availableDrops`: optional preview for store.

#### POST `/api/inventory/equip`
Request:
```json
{
  "itemId": "uuid"
}
```
Flow:
1. Validate item belongs to user.
2. Determine slot by `item.type`.
3. Update hero and return new hero state.

#### GET `/api/worldstate`
- Response: `worldState`, `milestones` (list of upcoming thresholds) to drive UI progress bars.

### 5.3 Error Codes
| Code | Meaning |
|------|---------|
| `SESSION_NOT_FOUND` | Session does not exist or belongs to another user |
| `SESSION_ALREADY_COMPLETED` | Attempt to re-complete a session |
| `DURATION_NOT_ALLOWED` | Duration not in allowed set |
| `TEMPLATE_MISMATCH` | Task template not owned by user |
| `ITEM_NOT_OWNED` | Trying to equip unowned item |
| `CONCURRENT_SESSION_LIMIT` | Too many pending sessions |

---

## 6. Background Jobs & Schedulers

| Job | Frequency | Responsibility |
|-----|-----------|----------------|
| `streak_reset` | Daily at 04:00 UTC | Resets `day_streak` if `last_session_date < current_date - 1`. |
| `session_timeout` | Every 5 minutes | Marks stale `pending|active` sessions as `timeout`. |
| `cosmetic_rotation` (future) | Daily | Swap featured cosmetics. |

Implementation notes:
- FastAPI: use Celery/Arq or simple `asyncio.Task` triggered by `lifespan`.
- Next.js: rely on Vercel Cron or external worker hitting `/api/jobs/...`.

All jobs should log to structured logger and expose metrics counters.

---

## 7. Security & Compliance
- **Auth**: JWT/NextAuth with short-lived access tokens (15 min) + refresh path. Validate tokens on every request.
- **Authorization**: All entities filtered by `user_id`. Never allow cross-user queries, even for admins, unless `is_superuser`.
- **Input validation**: Use Pydantic/Zod schemas. Reject unknown fields.
- **Rate limiting**: Basic per-user limit (e.g., 60 requests/min) using Redis token bucket. Minimum requirement: protect session endpoints to avoid automation.
- **Data protection**: Store hashed passwords using Argon2id. Items/inventory contain no PII.
- **Concurrency**: When completing sessions, lock the session row and hero row to prevent duplicate reward issuance.
- **Audit logging**: Log session completions (user_id, session_id, reward_exp, drop_item_id).

---

## 8. Observability & Operations
- **Logging**: JSON logs with trace_id, user_id, session_id. Log levels: info for lifecycle events, warn for validation anomalies, error for unexpected exceptions.
- **Metrics**:
  - `sessions_completed_total` (labels: room, duration).
  - `drops_awarded_total` (labels: rarity).
  - `session_duration_seconds` histogram (server observed).
  - `active_sessions_gauge`.
- **Tracing**: OpenTelemetry instrumentation for DB queries and HTTP endpoints.
- **Health Checks**:
  - `/health/live` – returns 200 if process running.
  - `/health/ready` – checks DB connectivity + migration status.

---

## 9. Testing Strategy
- **Unit tests**: reward calculation, level-up loops, world progression thresholds, drop RNG (use seeded RNG).
- **Integration tests**: API endpoints using httpx (FastAPI) or Next.js route testing. Mock auth.
- **Database tests**: migrations + Alembic/Prisma autogen to ensure schema matches spec.
- **Performance tests**: simulate 100 concurrent session completions to ensure locking works.
- **Contract tests**: JSON schemas stored in `ai/specs/backend.md` should be used to generate OpenAPI; frontend consumes typed client.

---

## 10. Configuration & Deployment
- Environment variables:
  - `DATABASE_URL`, `DATABASE_ASYNC_URL`
  - `JWT_SECRET`, `JWT_AUDIENCE`, `JWT_ISSUER`
  - `NEXTAUTH_SECRET` (Next.js runtime)
  - `REDIS_URL` (optional)
  - `SENTRY_DSN`
  - `ENVIRONMENT` (local|staging|prod)
- Run `docker-compose up -d` to boot Postgres + backend for local dev.
- CI pipeline:
  1. Install deps (`poetry install` or `npm install`).
  2. Run linters (`just lint` or `npm run lint`).
  3. Run tests with coverage ≥80%.
  4. Apply migrations in staging before prod deploy.

---

## 11. Future Extensions
- Multiplayer session tracking (requires WebSockets + presence service).
- Pets/companions: extend `Item` type with `pet`.
- Cosmetic shop: new tables `shop_rotations`, `purchases`.
- Leaderboards: leverage aggregated view.

---

This specification now contains all information necessary for engineers to implement and maintain the OS backend consistently across runtimes. Keep it updated whenever contracts or rules change.
