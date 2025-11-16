# LifeOS — FastAPI Router Structure Rules
Version: 1.0  
Owner: Dimas  
Purpose: Internal engineering guideline  
Status: Finalized

---

# 1. Folder Naming Rules

## 1.1 Folder names are **lowercase**, **snake_case**, and represent the domain
Examples:
```
auth
hero
task
session
world
inventory
item
storage
realtime
config
```

### ❌ Avoid:
```
AuthRouter/
HeroRouter/
Shared/
Core/
Common/
```

### ✅ Correct:
```
/src/auth
/src/world
/src/session
```

---

# 2. File Naming Rules

Each router folder uses the following structure:

```
/src/{name}/
  __init__.py
  router.py              # FastAPI router
  service.py              # business logic
  repository.py           # SQLAlchemy queries (optional but recommended)
  schemas.py              # Pydantic models for request/response
  models.py               # SQLAlchemy models (if domain-specific)
```

Example for `hero`:

```
/src/hero/
  __init__.py
  router.py
  service.py
  repository.py
  schemas.py
```

---

# 3. Class Naming Rules

Class names **must be PascalCase**:

### 3.1 Router classes
```
HeroRouter
SessionRouter
WorldRouter
InventoryRouter
```

### 3.2 Service classes
```
HeroService
SessionService
InventoryService
```

### 3.3 Repository classes
```
HeroRepository
SessionRepository
```

### 3.4 Schema classes (Pydantic)
```
HeroCreate
HeroUpdate
HeroResponse
StartSessionRequest
CompleteSessionResponse
```

---

# 4. FastAPI Router Structure

## 4.1 For domain routers (CRUD / mission logic)

Create router files following this pattern:

```python
# src/hero/router.py
from fastapi import APIRouter, Depends
from fastapi_users import FastAPIUsers

router = APIRouter(prefix="/hero", tags=["hero"])

@router.get("/me")
async def get_hero(
    current_user: User = Depends(get_current_user)
):
    # Call service
    pass
```

**Why?**  
REST is used for commands/queries.  
WebSockets are for broadcasting events (handled separately).

---

## 4.2 For WebSockets

Create separate WebSocket router:

```python
# src/realtime/router.py
from fastapi import WebSocket

router = APIRouter()

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    # Handle WebSocket connections
    pass
```

---

# 5. Transport Layer Architecture

## 5.1 REST Responsibilities
REST is used for:
- Start session
- Complete session
- Equip cosmetic
- CRUD tasks
- Fetch hero state
- Fetch world state
- Fetch inventory

Examples:
```
POST /sessions/start
POST /sessions/complete
POST /inventory/equip
GET  /hero/me
GET  /worldstate/me
```

---

## 5.2 WebSocket Responsibilities
WebSockets are **event emitters**, not the main transport.

Emit events:
- `heroUpdated`
- `worldUpdated`
- `sessionStarted`
- `sessionCompleted`
- `levelUp`

Frontend subscribes and updates UI reactively.

---

# 6. Router Responsibilities (Summary Table)

| Router      | Type  | Responsibilities |
|-------------|-------|------------------|
| Auth        | REST  | Login, tokens, guards (FastAPI-Users) |
| User        | REST  | Basic user profile |
| Hero        | REST  | Hero level, XP, stats |
| Task        | REST  | Task templates |
| Session     | REST  | Mission start/complete, reward distribution |
| Item        | REST  | Cosmetic catalog |
| Inventory   | REST  | Owned cosmetics, equip |
| World       | REST  | World state, room levels, streaks |
| Storage     | REST  | File upload/download (MinIO) |
| Realtime    | WS    | Event gateway (broadcast updates) |
| Config      | Module | Env configuration |

---

# 7. File Boundary Rules

### 7.1 Routers **must not contain logic**
They only:
- Define route handlers
- Validate input (via Pydantic schemas)
- Call service methods
- Return responses

### 7.2 Services handle business logic
Services:
- Contain core computation
- Call repositories
- Emit events
- Update world progression

### 7.3 Repositories encapsulate all database queries
This prevents DB logic from leaking later.

### 7.4 Schemas define I/O contract
Pydantic models keep API consistent for frontend.

---

# 8. Event Architecture

Use FastAPI dependencies or direct service → WebSocket pattern.

Example flow:
```python
SessionService.complete_session()
  → updates XP, gold
  → calls WorldService.update()
  → emits heroUpdated event
  → RealtimeRouter.broadcast('heroUpdated')
```

Events must be:
- Clear
- Typed (via Pydantic)
- Documented

---

# 9. Coding Conventions

- Use **PascalCase** for classes
- Use **snake_case** for functions and variables
- Use **UPPER_SNAKE_CASE** for environment variables
- Use **async/await** everywhere (no callbacks)
- Use **Pydantic schemas** for all incoming/outgoing bodies
- Use **FastAPI-Users dependencies** for authentication
- Use **dependency injection** for services
- Avoid circular dependencies

---

# 10. When Adding a New Router
Follow this checklist:

1. Create folder: `src/{name}/`
2. Create `router.py` with APIRouter
3. Create `service.py` for business logic
4. Create `repository.py` if needed
5. Create `schemas.py` with Pydantic models
6. Add tests (optional for now)
7. Register router in `main.py` with `app.include_router()`
8. Integrate with required routers (Hero, World, Session, etc.)

---

# 11. Examples of Good Naming

### Hero Feature
```python
# router.py
class HeroRouter:
    router = APIRouter(prefix="/hero", tags=["hero"])

# service.py
class HeroService:
    async def get_hero(self, user_id: int) -> Hero:
        pass

# schemas.py
class HeroResponse(BaseModel):
    level: int
    exp: int
    gold: int

class HeroUpdate(BaseModel):
    exp: Optional[int] = None
    gold: Optional[int] = None
```

### Session Feature
```python
# router.py
class SessionRouter:
    router = APIRouter(prefix="/sessions", tags=["sessions"])

# service.py
class SessionService:
    async def start_session(self, request: StartSessionRequest) -> SessionResponse:
        pass

# schemas.py
class StartSessionRequest(BaseModel):
    task_template_id: int
    duration_minutes: int
    room: str

class CompleteSessionResponse(BaseModel):
    exp_reward: int
    gold_reward: int
    dropped_item: Optional[Item] = None
```

### World Feature
```python
# router.py
class WorldRouter:
    router = APIRouter(prefix="/world", tags=["world"])

# service.py
class WorldService:
    async def get_world_state(self, user_id: int) -> WorldState:
        pass

# schemas.py
class WorldStateResponse(BaseModel):
    study_room_level: int
    build_room_level: int
    training_room_level: int
    total_sessions_success: int
    day_streak: int
```

---

# 12. Version Control Structure

Recommended:
```
feature/router-name-description
```

Examples:
```
feature/hero-level-up
feature/session-start-endpoints
fix/world-progress-bug
refactor/inventory-repository
```

---

# 13. FastAPI-Users Integration

Authentication is handled via FastAPI-Users:

```python
from fastapi_users import FastAPIUsers

fastapi_users = FastAPIUsers[User, int](
    get_user_manager,
    [auth_backend],
)

# Protect routes
@router.get("/protected")
async def protected_route(
    current_user: User = Depends(fastapi_users.current_user())
):
    pass
```

---

# 14. Final Principle

> **"Routers represent domains.  
> Services represent responsibilities.  
> Folders represent boundaries."**

Never violate this structure.

---

# End of Document
