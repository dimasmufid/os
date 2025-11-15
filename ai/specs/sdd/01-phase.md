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

Working checklist mapped to the sections below. Update entries to `[x]` once delivered.

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

### Section 5 — Drizzle Schema
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
- [x] NestJS wiring for Drizzle/Postgres, DTO validation, and auth guards

### Section 7 — Frontend Experience
- [x] `/world` TanStack route with HUD shell + Phaser canvas host
- [x] Phaser BootScene + WorldScene with hero movement, collisions, and room enter/leave events
- [x] React bridge for Phaser events plus TanStack Query hooks (profile, tasks, inventory, history)
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

**Deliverables**
- World map (JSON)
- Basic hero sprite
- Phaser integration
- TanStack Start app skeleton
- NestJS API (core modules)
- Drizzle schema
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
               │      TanStack Start     │
               │  React + Phaser Client  │
               └─────────────▲───────────┘
                             │ HTTP (REST)
                       WebSocket (later)
                             │
               ┌─────────────┴───────────┐
               │         NestJS API       │
               │  (REST + Future WS)      │
               └─────────────▲───────────┘
                             │
         ┌──────────┬────────┴───────────┬──────────┐
         │          │                    │           │
   Postgres      Redis (opt)           MinIO      Shared Types
   (Remote DB)   caching              storage      (Workspace)
```

Frontend:  
- TanStack Start, React, Phaser  
Backend:  
- NestJS, Drizzle ORM  
Stateful services:  
- Remote Postgres, optional Redis, MinIO  

---

# 4. Monorepo Structure

```
/apps
  /web        # TanStack Start + Phaser
  /api        # NestJS backend

/packages
  /db         # Drizzle schema + migrations + db client
  /types      # Shared TS types (Hero, WorldState, Rewards)
  /utils      # Shared helpers

/docker
  compose files, Dockerfile templates

infra/
  # future k8s, terraform, scripts
```

---

# 5. Drizzle Database Schema (Phase 1)

Located in: `/packages/db/schema.ts`

```ts
import { pgTable, varchar, integer, timestamp, serial, boolean } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email").notNull(),
  createdAt: timestamp("created_at").defaultNow()
});

export const heroes = pgTable("heroes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  level: integer("level").default(1),
  exp: integer("exp").default(0),
  gold: integer("gold").default(0),

  equippedHatId: integer("equipped_hat_id"),
  equippedOutfitId: integer("equipped_outfit_id"),
  equippedAccessoryId: integer("equipped_accessory_id")
});

export const taskTemplates = pgTable("task_templates", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  name: varchar("name"),
  category: varchar("category"),
  defaultDuration: integer("default_duration"),
  room: varchar("room") // "study" | "build" | "training"
});

export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  taskTemplateId: integer("task_template_id").references(() => taskTemplates.id),

  room: varchar("room"),
  durationMinutes: integer("duration_minutes"),
  startedAt: timestamp("started_at").defaultNow(),
  endedAt: timestamp("ended_at"),
  status: varchar("status"), // "pending" | "success" | "cancel"

  rewardExp: integer("reward_exp"),
  rewardGold: integer("reward_gold")
});

export const items = pgTable("items", {
  id: serial("id").primaryKey(),
  name: varchar("name"),
  type: varchar("type"), // "hat" | "outfit" | "accessory"
  rarity: varchar("rarity"), // "common" | "rare" | "epic"
  spriteKey: varchar("sprite_key")
});

export const inventory = pgTable("inventory", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  itemId: integer("item_id").references(() => items.id),
  obtainedAt: timestamp("obtained_at").defaultNow()
});

export const worldStates = pgTable("world_states", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),

  studyRoomLevel: integer("study_room_level").default(1),
  buildRoomLevel: integer("build_room_level").default(1),
  trainingRoomLevel: integer("training_room_level").default(1),

  totalSessionsSuccess: integer("total_sessions_success").default(0),
  dayStreak: integer("day_streak").default(0),
  lastSessionDate: timestamp("last_session_date")
});
```

---

# 6. Backend (NestJS) Technical Design

Located in `/apps/api`

---

## 6.1 NestJS Modules (Phase 1)

```
src/
 ├─ hero/
 ├─ session/
 ├─ world/
 ├─ tasks/
 ├─ inventory/
 ├─ reward/
 ├─ common/
 └─ main.ts
```

**Required modules:**

### `HeroModule`  
- Get hero  
- Update hero (exp, level, gold, equip)

### `SessionModule`  
- startSession  
- completeSession  
- cancelSession  
- getHistory

### `TaskModule`  
- list user tasks  
- create / edit / delete tasks

### `WorldStateModule`  
- read world state  
- apply upgrades

### `RewardModule`  
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

Located in: `/apps/api/src/reward/reward.service.ts`

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

# 7. Frontend (TanStack Start + Phaser) Technical Design

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
- Drizzle schema + migrations  
- NestJS modules + endpoints  
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
- Integrations (TanStack Query)  
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

# End of Document**
