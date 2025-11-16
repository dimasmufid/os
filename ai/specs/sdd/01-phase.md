# LifeOS — Technical System Design Document (Phase 1)

Version: 1.0  
Status: Finalized for Engineering  
Owner: Dimas  
Last Updated: 2025-11-15

---

# 1. Overview

This document defines the **technical system architecture**, **APIs**, **schemas**, and **client implementation details** required **to** build **Phase 1** of LifeOS — a personal, gamified 2D world where real-life focus sessions fuel in‑game progression.

This SDD is implementation-ready and can be assigned directly to engineers.

---

## Implementation Checklist

Working checklist mapped to the sections below. Update entries to `[ ]` once delivered.

### Section 2 — Core Emotional Loop

- [x] Tilemap-based Central Plaza with Study, Build, and Training rooms plus collision boundaries
- [x] WASD controls with smooth movement, idle animation, and directional sprite flipping
- [x] Focus Session flow (25m/50m/90m durations, fullscreen overlay, movement lock)
- [x] Reward distribution that applies XP/Gold formulas on successful sessions only
- [x] Hero HUD: portrait, level, XP bar, gold, streak indicator, and level-up banner animation
- [x] Cosmetic drop system (hat/outfit/accessory, rarity tiers, 10% drop rate, stored inventory unlock)
- [x] Inventory panel listing cosmetics with equip/unequip that updates hero sprite
- [x] World upgrade unlock logic (5/15/30 sessions) toggling decorative tile layers
- [x] HUD panels with floating buttons for Tasks, Inventory, History
- [x] Streak tracking with day counter and encouragement text

### Section 5 — SQLAlchemy Schema

- [x] `hero_profiles` table storing hero stats/equipment bound to auth users
- [x] `task_templates` table with per-user task definitions (name, category, default duration, room)
- [x] `focus_sessions` table (task linkage, duration, timestamps, status, reward columns)
- [x] `cosmetic_items` definitions plus `inventory_items` linking unlocked cosmetics to users
- [x] `world_states` table capturing room levels, total successes, streak metadata

### Section 6 — Backend Modules & APIs

- [x] Hero/Profile module providing `GET /profile` and hero mutation helpers
- [x] Task module with CRUD plus `GET /tasks`
- [x] Session module: `/sessions/start`, `/sessions/complete`, `/sessions/cancel`, `/sessions/history`
- [x] Inventory module: `GET /inventory` list + `/inventory/equip`
- [x] World module exposing world state read/upgrade operations
- [x] Reward service encapsulating XP/Gold formulas, streak progression, cosmetic drops, world upgrades
- [x] FastAPI wiring for SQLAlchemy/Postgres, Pydantic validation, and FastAPI-Users auth guards

### Section 7 — Frontend Experience

- [x] `/world` Next.js route with HUD shell + Phaser canvas host
- [x] Phaser BootScene + WorldScene with hero movement, collisions, and room enter/leave events
- [x] React bridge for Phaser events plus React Query hooks (profile, tasks, inventory, history)
- [x] `TopHUD`, `FloatingButtons`, `TasksPanel`, `InventoryPanel`, `HistoryPanel` components
- [x] `SessionOverlay` + `VictoryModal` surfaces with reward + cosmetic drop summaries
- [x] Session state lock (movement disabled) and resync after completion/cancel
- [x] Automatic refresh of profile, inventory, and world state after missions

### Section 9 — Non-Functional Targets

- [x] Canvas boot < 2s and hero movement at 60fps
- [x] Secure reward validation (auth + backend-only formulas)
- [x] Guards against duplicate session completion submissions

---

# 2. Goal

Build the **core emotional loop**:  
“You enter a world. You do missions. You grow. The world grows.”

This phase establishes the foundational LifeOS identity and must ship first.

## 2.1 2D World

- Central Plaza
- Study Room
- Build Room
- Training Room
- Tilemap-based world
- Player collision + boundaries

## 2.2 Player Movement

- WASD controls
- Smooth movement
- Idle animation
- Direction-based sprite flipping (optional)

## 2.3 Focus Sessions ("Missions")

- Session lengths: **25m, 50m, 90m**
- Fullscreen timer overlay
- “Session Running” state disables movement
- Success → reward distribution
- Failure → no punishment

## 2.4 Rewards

### XP

```
XP = duration_minutes * 2
```

### Gold

```
Gold = duration_minutes * 1
```

## 2.5 Hero System

- Level
- EXP bar
- Level-up banner animation
- Hero portrait in HUD

## 2.6 Cosmetic System

- Cosmetic types: Hat, Outfit, Accessory
- Rarity tiers: Common, Rare, Epic
- 10% drop chance per session
- Cosmetic unlock stored in inventory

## 2.7 Inventory Panel

- List cosmetics
- Equip/unequip flows
- Equipped items update hero sprite

## 2.8 World Upgrades

```
5 sessions  → Study Room Level 2
15 sessions → Build Room Level 2
30 sessions → Plaza Upgrade
```

Unlock decorative tile layers.

## 2.9 HUD Panels

- Top bar: Level, XP, Gold, Streak
- Floating buttons: Tasks, Inventory, History

## 2.10 Streak System

- Day streak counter
- Gentle encouragement text

## 2.11 Authentication Gate

- `/world` access requires an authenticated user session from FastAPI-Users
- Unauthenticated visitors are redirected to `/login` to sign in or create an account
- Login route provides email/password + Google flows and returns users to their original destination

**Deliverables**

- World map (JSON)
- Basic hero sprite
- Phaser integration
- Next.js app skeleton
- FastAPI API (core modules)
- SQLAlchemy models
- WebSocket gateway (optional)
- Docker deployment

**Success Criteria**

- User can walk around world
- User can start/complete missions
- User sees XP/Gold rewards
- User unlocks cosmetics
- User sees the world upgrade
- Everything feels smooth, cozy, motivating

---

# 3. High-Level Architecture (Phase 1)

```
               ┌────────────────────────┐
               │        Next.js          │
               │  React + Phaser Client  │
               └─────────────▲───────────┘
                             │ HTTP (REST)
                       WebSocket (later)
                             │
               ┌─────────────┴───────────┐
               │        FastAPI API        │
               │  (REST + Future WS)       │
               └─────────────▲───────────┘
                             │
         ┌──────────┬────────┴───────────┬──────────┐
         │          │                    │           │
   Postgres      Redis (opt)           MinIO      Shared Types
   (Remote DB)   caching              storage      (Workspace)
```

Frontend:

- Next.js, React, Phaser  
  Backend:
- FastAPI, SQLAlchemy ORM  
  Stateful services:
- Remote Postgres, optional Redis, MinIO

---

# 4. Monorepo Structure

```
/apps
  /web        # Next.js + Phaser
  /api        # FastAPI backend

/packages
  /db         # SQLAlchemy models + migrations + db client
  /types      # Shared TS types (Hero, WorldState, Rewards)
  /utils      # Shared helpers

/docker
  compose files, Dockerfile templates

infra/
  # future k8s, terraform, scripts
```

---

# 5. SQLAlchemy Database Schema (Phase 1)

Located in: `/apps/api/src/models.py`

```python
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    email = Column(String, nullable=False)
    created_at = Column(DateTime, server_default=func.now())

class Hero(Base):
    __tablename__ = "heroes"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    level = Column(Integer, default=1)
    exp = Column(Integer, default=0)
    gold = Column(Integer, default=0)

    equipped_hat_id = Column(Integer, nullable=True)
    equipped_outfit_id = Column(Integer, nullable=True)
    equipped_accessory_id = Column(Integer, nullable=True)

class TaskTemplate(Base):
    __tablename__ = "task_templates"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    name = Column(String)
    category = Column(String)
    default_duration = Column(Integer)
    room = Column(String)  # "study" | "build" | "training"

class Session(Base):
    __tablename__ = "sessions"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    task_template_id = Column(Integer, ForeignKey("task_templates.id"))

    room = Column(String)
    duration_minutes = Column(Integer)
    started_at = Column(DateTime, server_default=func.now())
    ended_at = Column(DateTime, nullable=True)
    status = Column(String)  # "pending" | "success" | "cancel"

    reward_exp = Column(Integer, nullable=True)
    reward_gold = Column(Integer, nullable=True)

class Item(Base):
    __tablename__ = "items"

    id = Column(Integer, primary_key=True)
    name = Column(String)
    type = Column(String)  # "hat" | "outfit" | "accessory"
    rarity = Column(String)  # "common" | "rare" | "epic"
    sprite_key = Column(String)

class Inventory(Base):
    __tablename__ = "inventory"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    item_id = Column(Integer, ForeignKey("items.id"))
    obtained_at = Column(DateTime, server_default=func.now())

class WorldState(Base):
    __tablename__ = "world_states"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))

    study_room_level = Column(Integer, default=1)
    build_room_level = Column(Integer, default=1)
    training_room_level = Column(Integer, default=1)

    total_sessions_success = Column(Integer, default=0)
    day_streak = Column(Integer, default=0)
    last_session_date = Column(DateTime, nullable=True)
```

---

# 6. Backend (FastAPI) Technical Design

Located in `/apps/api`

---

## 6.1 FastAPI Routers (Phase 1)

```
src/
 ├─ hero/
 ├─ session/
 ├─ world/
 ├─ tasks/
 ├─ inventory/
 ├─ reward/
 ├─ common/
 └─ main.py
```

**Required routers:**

### `HeroRouter`

- Get hero
- Update hero (exp, level, gold, equip)

### `SessionRouter`

- startSession
- completeSession
- cancelSession
- getHistory

### `TaskRouter`

- list user tasks
- create / edit / delete tasks

### `WorldStateRouter`

- read world state
- apply upgrades

### `RewardService`

Core gamification logic:

- calculateRewards
- applyLevelUp
- rollCosmeticDrop
- updateWorldProgression

---

## 6.2 REST API Contracts (Phase 1)

### `GET /profile`

Returns:

```json
{
  "hero": { ... },
  "worldState": { ... }
}
```

### `GET /tasks`

Returns user task templates.

### `POST /sessions/start`

Input:

```json
{
  "taskTemplateId": 12,
  "durationMinutes": 25,
  "room": "study"
}
```

Output:

```json
{
  "sessionId": 87,
  "expectedEndTime": "2025-11-15T11:45:00Z"
}
```

### `POST /sessions/complete`

Input:

```
{ "sessionId": 87 }
```

Output:

```json
{
  "expReward": 50,
  "goldReward": 25,
  "droppedItem": { "id": 1, "name": "Blue Headphones" } | null,
  "hero": { ... },
  "worldState": { ... }
}
```

### `POST /sessions/cancel`

```
{ "sessionId": 87 }
```

### `GET /inventory`

Returns:

- all owned items
- equipped items

### `POST /inventory/equip`

```
{ "itemId": 15 }
```

### `GET /sessions/history`

Paginated history.

---

## 6.3 Reward Engine Logic

Located in: `/apps/api/src/reward/reward.py`

### Formulas

```
exp = durationMinutes * 2
gold = durationMinutes * 1
```

**Leveling**

```
expNeeded = hero.level * 100
```

**Cosmetic Drop**  
10% chance.

**Room Upgrade Thresholds**

```
5 successes  → study_room_level++
15 successes → build_room_level++
30 successes → plaza upgrade
```

**Streak**

- If last session day = today → streak stays
- If last session day = yesterday → streak++
- Else → streak = 1

---

# 7. Frontend (Next.js + Phaser) Technical Design

Located in: `/apps/web`

---

## 7.1 Routes

```
/world      # main world screen
```

## 7.2 Frontend State

**Server state:**

- profile (hero + worldState)
- tasks
- inventory
- history

**Local state:**

- currentRoom: "study" | "build" | "training" | null
- activePanel: "none" | "tasks" | "inventory" | "history"
- ongoingSession: { sessionId, expectedEnd, duration }
- showVictoryModal

---

## 7.3 Phaser Design

**Scenes:**

### `BootScene`

- Load tiles, sprites, JSON maps

### `WorldScene`

- Render Central Plaza tilemap
- Add rooms & collision
- Add hero sprite + movement
- Detect overlaps:
  - dispatch events to React:
    - `onEnterRoom(roomName)`
    - `onLeaveRoom(roomName)`
- Listen for hero equipment changes

**Canvas integration**  
GameCanvas is a <div> with ref passed to Phaser.

---

## 7.4 UI Layout System

### `TopHUD`

- XP bar
- Gold
- Level
- Hero portrait
- Streak indicator

### `FloatingButtons`

- Tasks
- Inventory
- History

### `TasksPanel`

- Choose task
- Choose duration
- [Start Mission]

### `InventoryPanel`

- List items
- Equip items

### `HistoryPanel`

- List of past sessions

### `SessionOverlay`

- Fullscreen
- Timer
- Motivational message
- Cancel button

### `VictoryModal`

- Rewards
- Cosmetic drop summary

---

# 8. Session Flow Diagram

```
[User selects task] → POST /sessions/start
        ↓
   SessionOverlay (timer)
        ↓ (on timer end)
   POST /sessions/complete
        ↓
   Reward Engine
        ↓
  hero updated + world updated + inventory updated
        ↓
   Victory Modal
        ↓
  Refresh profile + inventory + worldState
```

---

# 9. Non-Functional Requirements

### Performance

- Game canvas loads < 2 seconds
- Movement 60fps

### Security

- JWT or session auth
- Backend validates reward logic

### Reliability

- Session completion never lost
- Avoid double-complete

### Scalability (Later)

- Redis Pub/Sub for WS
- Multiple world themes
- Multiplayer

---

# 10. Deliverables for Engineering Team

### Backend Team

- SQLAlchemy models + migrations
- FastAPI routers + endpoints
- Reward engine
- World upgrade logic
- History queries
- Inventory equip flow

### Frontend Team

- Phaser world
- Movement
- Rooms
- HUD
- Floating panels
- Session overlay
- Victory modal
- Integrations (React Query / SWR)
- Responsive layout

---

# 11. Out of Scope (Phase 1)

- AI quests
- Multiplayer
- Chat
- Room editor
- Mobile app
- Long-term storage for markdown docs
- Advanced world themes
- NPCs

---

# End of Document\*\*
