# Phase 1 — Deliver the Promise (MVP)

## Goal
Build the **core emotional loop**:  
“You enter a world. You do missions. You grow. The world grows.”

This phase establishes the foundational LifeOS identity and must ship first.

---

# 1. Core Features

## 1.1 2D World
- Central Plaza
- Study Room
- Build Room
- Training Room
- Tilemap-based world
- Player collision + boundaries

## 1.2 Player Movement
- WASD controls
- Smooth movement
- Idle animation
- Direction-based sprite flipping (optional)

## 1.3 Focus Sessions ("Missions")
- Session lengths: **25m, 50m, 90m**
- Fullscreen timer overlay
- “Session Running” state disables movement
- Success → reward distribution
- Failure → no punishment

## 1.4 Rewards
### XP
```
XP = duration_minutes * 2
```

### Gold
```
Gold = duration_minutes * 1
```

## 1.5 Hero System
- Level
- EXP bar
- Level-up banner animation
- Hero portrait in HUD

## 1.6 Cosmetic System
- Cosmetic types: Hat, Outfit, Accessory
- Rarity tiers: Common, Rare, Epic
- 10% drop chance per session
- Cosmetic unlock stored in inventory

## 1.7 Inventory Panel
- List cosmetics
- Equip/unequip flows
- Equipped items update hero sprite

## 1.8 World Upgrades
```
5 sessions  → Study Room Level 2
15 sessions → Build Room Level 2
30 sessions → Plaza Upgrade
```
Unlock decorative tile layers.

## 1.9 HUD Panels
- Top bar: Level, XP, Gold, Streak
- Floating buttons: Tasks, Inventory, History

## 1.10 Streak System
- Day streak counter
- Gentle encouragement text

---

# 2. Deliverables
- World map (JSON)
- Basic hero sprite
- Phaser integration
- Next.js app skeleton
- FastAPI API (core modules)
- SQLAlchemy models
- WebSocket gateway (optional)
- Docker deployment

---

# 3. Success Criteria
- User can walk around world
- User can start/complete missions
- User sees XP/Gold rewards
- User unlocks cosmetics
- User sees the world upgrade
- Everything feels smooth, cozy, motivating

---

# End of Document
