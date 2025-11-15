# Nesra Town — Product Requirements Document (PRD)
Version: 1.0  
Owner: Dimas  
Status: Draft  
Last Updated: 2025-11-15

---

# 1. Overview

## 1.1 Product Summary
Nesra Town is a **gameified productivity world** designed to help users focus, execute deep work, and build consistent habits. Instead of traditional todo apps, users enter a **2D virtual town** (similar to GatherTown and cozy RPG environments). Their **real-life productivity sessions** directly upgrade their avatar, unlock cosmetics, and expand the world.

This document provides a clear overview for engineering, design, and product teams.

## 1.2 Product Vision
Create the **most fun, immersive, and rewarding productivity system** by combining:
- A small 2D world where the user moves around
- Productivity sessions (25m, 50m, 90m)
- RPG-style progression (levels, XP, gold)
- Cosmetic rewards and room upgrades
- Clear feedback loops that encourage consistency

The goal is to replace dopamine-draining activities with a dopamine-positive ecosystem connected to meaningful work.

## 1.3 Target Users
- Builders, learners, programmers, and students who enjoy games.
- Users who dislike Habitica/task apps and want **movement, visuals, and world feeling**.
- People who want structure, focus, and reward systems without toxic pressure.

---

# 2. Goals & Non-Goals

## 2.1 Goals
- Provide a **world** that reacts to player productivity.
- Include **immersive gamification** without complex gaming mechanics.
- Keep the system light, fast, and easy to maintain.
- Allow extensibility for future expansions: multiplayer, pets, leaderboards.

## 2.2 Non-Goals
- Not a real fighting game (no combat, no hitboxes).
- No complex MMO networking.
- Not a todo app replacement.
- Not a 3D world (2D only for simplicity).

---

# 3. Core Features (v1)

## 3.1 World & Movement
- User controls an avatar in a small 2D tilemap.
- Movement via WASD.
- Rooms: Study Room, Build Room, Training Room.
- Rooms unlock visual upgrades as user progresses.

## 3.2 Productivity Sessions (MVP Core)
- Session durations: 25m, 50m, 90m.
- User selects a task template (Math Study, Coding, Reading, etc.).
- Upon Start:
  - Timer overlay appears.
  - Movement disabled.
- Upon Completion:
  - XP and Gold are awarded.
  - Chance for cosmetic drop.
  - World progression updates.
- Upon Cancel:
  - No rewards.

## 3.3 Avatar Progression
- Hero has levels (Lv1+).
- Gaining EXP levels up the hero.
- Level-up animation.

## 3.4 Cosmetics & Inventory
- Hats, outfits, accessories.
- Rarity: Common, Rare, Epic.
- Inventory UI with filters.
- Equip/unequip flows.

## 3.5 World Progression System
- Total successful sessions upgrade rooms:
  - 5 → Study Room L2
  - 15 → Build Room L2
  - 30 → Plaza enhancement
- These upgrades change tilemap decorations.

## 3.6 UI Panels
- Top bar: XP, Level, Gold, Streak.
- Left panel: Task selector + Start Session.
- Right panel: Tabs (Inventory / Tasks / History).
- Victory modal after each successful session.

---

# 4. User Journey

## 4.1 First-Time User
1. Arrives at main town view.
2. Completes onboarding explaining:
   - Move with WASD
   - Rooms and their meaning
   - How to start a session
3. Starts first session.
4. Completes it → receives first cosmetic.
5. Encouraged to maintain streaks.

## 4.2 Returning User
1. Logs in → sees avatar in plaza.
2. Chooses room based on today’s priority (Study, Build, Train).
3. Starts a session.
4. Receives rewards → upgrades world.

---

# 5. Functional Requirements

## 5.1 Frontend Requirements
- Render Phaser game inside React component.
- Detect avatar entering specific zones.
- Timer overlay displayed reliably.
- Render victory modal + reward animation.
- Inventory UI functional with equip states.

## 5.2 Backend Requirements
- CRUD for task templates.
- Start session: create pending session record.
- Complete session:
  - Validate duration.
  - Compute rewards.
  - Roll cosmetic drop.
  - Update hero/rooms/streak.
- Return updated hero, inventory, and worldstate.

---

# 6. Reward System

## 6.1 XP & Gold Formula
```
XP = duration_minutes * 2  
Gold = duration_minutes * 1
```

## 6.2 Leveling Curve
```
EXP to next level = current_level * 100
```

## 6.3 Cosmetic Drop
```
10% chance per session
```

---

# 7. Data Schema Overview

## Entities
- User
- Hero
- TaskTemplate
- Session
- Item (cosmetics)
- Inventory
- WorldState

(See backend.md for full schema.)

---

# 8. Non-Functional Requirements

## 8.1 Performance
- Game must load in <2 seconds on desktop.
- Smooth movement at 60 FPS on modern browsers.

## 8.2 Reliability
- Session result must never be lost.
- Prevent duplicate reward issues.

## 8.3 Security
- Auth required for all APIs.
- Backend validates all reward logic.

## 8.4 Scalability (v2+)
- Allow expansions:
  - Multiplayer spaces
  - Gacha shop
  - Seasonal events
  - Achievements

---

# 9. Future Roadmap

## v1 (Launch)
- Single-player world
- Productivity sessions
- Cosmetics
- Room upgrades
- Timer overlay
- Task templates

## v2
- Background music
- Pets system
- Day streak quests
- NPCs

## v3
- Multiplayer plaza
- Chat bubbles
- Shared guild rooms

---

# 10. Appendices

## 10.1 Visual Style Guide (High-Level)
- Cozy RPG aesthetic
- Clean UI (modern, Tailwind)
- Light animations: confetti, glow, level-up burst

## 10.2 Risks
- Overbuilding game mechanics → delays.
- Too many customization systems early.
- Need to maintain dopamine balance (reward system tuning).

---

# End of Document
