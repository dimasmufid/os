# LifeOS — Product Requirements Document (PRD)
Version: 2.0  
Owner: Dimas  
Status: Living Document  
Last Updated: 2025-11-15

---

# 1. Core Identity

## 1.1 What This Product *Is*
**LifeOS** is an **open‑source personal mastery environment**, designed as a gamified 2D world where your real-life actions create visible progression. It is not a productivity “app,” but a **Life Operating System** that externalizes your goals, habits, and work into an interactive **RPG-like world**.

It transforms:
- Focus sessions → Missions  
- Daily habit loops → Quests  
- Progress → Room upgrades  
- Improvement → Hero leveling  
- Discipline → Visual expansion of your personal world  

This is a **motivating, emotionally engaging environment** for ambitious builders, students, and creatives.

---

## 1.2 What This Product *Is Not*
- Not a project management tool  
- Not a task/to-do app  
- Not a combat game  
- Not designed for corporate teams  
- Not competing with Linear/Notion  

This is a **personal world**, not a PM system.

---

## 1.3 Positioning Statement
**LifeOS is an open-source gamified world for focus, habits, and personal growth.  
A customizable 2D environment where your real work expands your virtual world.”**

Core branding pillars:
- World-first  
- Identity-first  
- Growth-first  
- Dopamine-friendly  
- Open source + customizable  

---

# 2. Vision & Philosophy

## 2.1 Long-Term Vision
To design the most **emotionally powerful and motivating environment** for deep work.  
A place people enjoy returning to every day — like a digital sanctuary.

## 2.2 Principles
1. **World-first** — the environment is the experience.  
2. **Identity-centered** — users grow a digital self.  
3. **Healthy gamification** — progress without addiction.  
4. **Customization** — mod-friendly, theme-friendly, open source.  
5. **Simplicity over complexity** — no combat, no MMO systems.  
6. **Philosophy over productivity** — this tool shapes mindset.

---

# 3. Target Users

## 3.1 Primary Users
- Developers  
- Students  
- Indie hackers  
- Builders  
- Creators  
- Self-improvement enthusiasts  

Users who want:
- Motivation  
- Focus  
- A world they enjoy visiting  
- Identity linked to habits and growth  

## 3.2 Core Pain Points Solved
- Boredom with traditional productivity apps  
- Lack of emotional engagement from tasks  
- No visual feedback to life progression  
- Difficulty staying consistent  
- Lack of identity in work tools  

---

# 4. Branding Guide

## 4.1 Tone
- Cozy  
- Personal  
- Inspiring  
- Playful  
- Clean  
- Not corporate  

## 4.2 Visual Style
- Soft gradients  
- RPG-like UI (HUD bars, floating panels)  
- Pixel-art or clean 2D world  
- Smooth animations  
- World feels alive  

## 4.3 Tagline Options
- “Grow your world by growing yourself.”  
- “A LifeOS for ambitious people.”  
- “Your personal focus world.”  

---

# 5. Product Scope — v1

## 5.1 Core Features
### 1. **2D World Map**
- Central Plaza  
- Study Room  
- Build Room  
- Training Room  
- WASD movement  
- World upgrades tied to progress  

### 2. **Focus Sessions**
- 25m, 50m, 90m  
- Timer overlay  
- Successful session → rewards  
- Failure has no punishment  

### 3. **Hero Progression**
- EXP gaining  
- Level-ups  
- Celebration effects  

### 4. **Cosmetics**
- Hats, outfits, accessories  
- Rarity system  
- Inventory + equip flow  

### 5. **Room Upgrades**
- Based on successful sessions count  
- Decorative layer unlocks  
- World becomes richer  

### 6. **HUD Panels**
- Top: XP, Gold, Streak  
- Bottom/side: Inventory, Tasks, History (slide-in panels)

---

# 6. User Journey

## 6.1 First-Time Flow
1. User enters a cozy central plaza  
2. Quick onboarding (movement, missions, rewards)  
3. Completes first 25m session  
4. Receives XP + cosmetic  
5. Sees world upgrade  
6. Returns the next day  

## 6.2 Daily Loop
1. Log in → see hero in the plaza  
2. Walk into a room  
3. Start mission  
4. Timer overlay  
5. Completion → rewards  
6. Increment world upgrades  
7. Daily streak grows  

---

# 7. Gamification Logic

## 7.1 Rewards
```
XP = duration_minutes * 2
Gold = duration_minutes * 1
```

## 7.2 Leveling Curve
```
EXP to next level = level * 100
```

## 7.3 Cosmetic Drops
- 10% chance  
- Rarity tiers: Common, Rare, Epic  

## 7.4 World Upgrades
```
5 sessions  → Study Room L2  
15 sessions → Build Room L2  
30 sessions → Plaza enhancements  
```

---

# 8. Architecture

## 8.1 Frontend
- Next.js  
- React + TypeScript  
- Phaser 3  
- WebSocket client  
- Shared types from API  

## 8.2 Backend
- FastAPI  
- SQLAlchemy ORM  
- WebSocket gateway  
- Remote Postgres  
- Redis cache  
- MinIO for asset storage  

## 8.3 Monorepo Structure
```
/apps
  /web
  /api
/packages
  /db
  /types
  /utils
```

---

# 9. Open-Source Strategy

## 9.1 License
**Apache 2.0**

## 9.2 Free Forever (Core)
- World  
- Hero system  
- Sessions  
- Inventory  
- World progression  
- Self-hosting  

## 9.3 Paid Add-ons (Later)
- Cloud-hosted version  
- Multiplayer plaza  
- AI coach  
- Premium rooms/cosmetics  
- Device sync  
- Mobile apps  
- Community marketplaces  

## 9.4 Community Model
- Public GitHub repo  
- Clean docs  
- Good-first-issue labels  
- Roadmap transparency  

---

# 10. Roadmap

## v1 — Personal World
- Core systems  
- Rooms  
- Progression  
- Basic cosmetics  
- MVP UI  

## v2 — Deep Identity
- World themes  
- Avatar customization  
- NPCs  
- More rooms  

## v3 — Social Layer
- Multiplayer plaza  
- Presence system  
- Chat bubbles  
- “Guild rooms”  

## v4 — AI Layer
- AI quest generator  
- Habit insights  
- Personalized guidance  

---

# 11. Guiding Principle (Read When Lost)

**“This is not a PM tool.  
This is not a todo list.  
This is a world.  
A LifeOS for ambitious builders — a place where growth feels real, visual, and emotionally rewarding.”**

Keep direction anchored:
- World-first  
- Identity-first  
- Gamified growth  
- Healthy dopamine  
- Open source + customizable  

---

# End of Document
