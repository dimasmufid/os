# Nesra LifeOS — NestJS Module Structure Rules
Version: 1.0  
Owner: Dimas  
Purpose: Internal engineering guideline  
Status: Finalized

---

# 1. Folder Naming Rules

## 1.1 Folder names are **lowercase**, **kebab-case**, and represent the domain
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
AuthModule/
HeroModule/
Shared/
Core/
Common/
```

### ✅ Correct:
```
/src/modules/auth
/src/modules/world
/src/modules/session
```

---

# 2. File Naming Rules

Each module folder uses the following structure:

```
/src/modules/{name}/
  {name}.module.ts
  {name}.controller.ts         # REST API
  {name}.service.ts            # business logic
  {name}.repository.ts         # Drizzle queries (optional but recommended)
  dto/
    create-{name}.dto.ts
    update-{name}.dto.ts
  entities/
    {name}.entity.ts           # TS type or interface (optional)
```

Example for `hero`:

```
/src/modules/hero/
  hero.module.ts
  hero.controller.ts
  hero.service.ts
  hero.repository.ts
  dto/
    update-hero.dto.ts
  entities/
    hero.entity.ts
```

---

# 3. Class Naming Rules

Class names **must be PascalCase** and **must end with a suffix**:

### 3.1 Module classes
```
AuthModule
HeroModule
TaskModule
SessionModule
WorldModule
InventoryModule
ItemModule
StorageModule
RealtimeModule
ConfigModule
```

### 3.2 Controller classes
```
HeroController
SessionController
WorldController
```

### 3.3 Service classes
```
HeroService
SessionService
InventoryService
```

### 3.4 Repository classes
```
HeroRepository
SessionRepository
```

---

# 4. Nest CLI Usage Rules

## 4.1 For domain modules (CRUD / mission logic)
Use:

```bash
nest g resource {module_name}
```

When prompted:
```
? What transport layer do you use?
> REST API
```

**Why?**  
REST is used for commands/queries.  
WebSockets are for broadcasting events.

---

## 4.2 For WebSockets
Use:

```bash
nest g gateway realtime
```

This creates:
```
realtime.gateway.ts → @WebSocketGateway
```

Do NOT use resource generator for WebSocket-only modules.

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

# 6. Module Responsibilities (Summary Table)

| Module        | Type  | Responsibilities |
|---------------|-------|------------------|
| Auth          | REST  | Login, tokens, guards |
| User          | REST  | Basic user profile |
| Hero          | REST  | Hero level, XP, stats |
| Task          | REST  | Task templates |
| Session       | REST  | Mission start/complete, reward distribution |
| Item          | REST  | Cosmetic catalog |
| Inventory     | REST  | Owned cosmetics, equip |
| World         | REST  | World state, room levels, streaks |
| Storage       | REST  | File upload/download (MinIO) |
| Realtime      | WS    | Event gateway (broadcast updates) |
| Config        | Provider | Env configuration |

---

# 8. File Boundary Rules

### 8.1 Controllers **must not contain logic**
They only:
- Validate input
- Call service methods
- Return DTOs

### 8.2 Services handle business logic
Services:
- Contain core computation
- Call repositories
- Emit events
- Update world progression

### 8.3 Repositories encapsulate all database queries
This prevents DB logic from leaking later.

### 8.4 Entities / DTOs define I/O contract
Keeps API consistent for frontend.

---

# 9. Event Architecture

Use Nest EventEmitter OR direct service → gateway pattern.

Example flow:
```
SessionService.completeSession()
  → updates XP, gold
  → calls WorldService.update()
  → emits heroUpdated event
  → RealtimeGateway.broadcast('heroUpdated')
```

Events must be:
- Clear
- Typed
- Documented

---

# 10. Coding Conventions

- Use **PascalCase** for classes
- Use **camelCase** for methods and variables
- Use **UPPER_SNAKE_CASE** for environment variables
- Use **Async/Await** everywhere (no callbacks)
- Use **DTOs** for all incoming/outgoing bodies
- Use **guards** for authentication
- Use **interceptors** for logging/transforming
- Avoid circular dependencies

---

# 11. When Adding a New Module
Follow this checklist:

1. Create folder: `src/modules/{name}`
2. Generate resource with CLI (REST)
3. Add `repository.ts`
4. Add `dto/` + needed DTOs
5. Add `entities/` if needed
6. Add tests (optional for now)
7. Register module in root `AppModule`
8. Integrate with required modules (Hero, World, Session, etc.)

---

# 12. Examples of Good Naming

### Hero Feature
```
HeroModule
HeroService
HeroController
HeroRepository
HeroEntity
UpdateHeroDto
```

### Session Feature
```
SessionModule
SessionService
SessionController
SessionRepository
StartSessionDto
CompleteSessionDto
```

### World Feature
```
WorldModule
WorldService
WorldController
WorldRepository
WorldStateEntity
```

---

# 13. Version Control Structure

Recommended:
```
feature/module-name-description
```

Examples:
```
feature/hero-level-up
feature/session-start-endpoints
fix/world-progress-bug
refactor/inventory-repository
```

---

# 14. Final Principle

> **“Modules represent domains.  
Classes represent responsibilities.  
Folders represent boundaries.”**

Never violate this structure.

---

# End of Document
