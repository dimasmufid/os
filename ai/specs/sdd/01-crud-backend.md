# LifeOS Backend SDD (v1)

Version: 1.0  
Owner: Dimas  
Scope: Backend only (FastAPI + Postgres).  
Auth: Out of scope (already implemented).

---

## 1. High-Level Overview

### 1.1 Goal

Backend for LifeOS: a Duolingo-style personal growth system with:

- Projects/areas (tracks)
- Tasks + habits + focus sessions (nodes)
- Timesheet-like time tracking
- XP, levels, streaks, badges
- Markdown docs linked to tracks/nodes

The backend exposes a clean REST API for a Next.js frontend. All operations are per-user.

---

## 2. Tech Stack

- Python 3.11+
- FastAPI
- SQLAlchemy 2.x (async)
- Alembic
- PostgreSQL
- fastapi-users (auth already implemented)
- Redis
- Dramatiq (background tasks)

---

## 3. Architecture

### 3.1 Modular Structure

Each module is self-contained with its own models, schemas, routers, and services:

- `src/` - Shared utilities (database, config, exceptions, utils. already implemented.)
- `src/auth/` - Authentication module (already implemented)
- `src/tracks/` - Track module (projects/areas)
- `src/nodes/` - Node module (tasks, habits, focus sessions, milestones; includes habit schedules)
- `src/time_tracking/` - Time tracking module
- `src/completions/` - Node completion & XP module
- `src/gamification/` - Gamification module (stats, XP, levels, streaks)
- `src/badges/` - Badge module
- `src/docs/` - Documentation module (markdown docs)

Each module structure:

- `models.py` - SQLAlchemy models
- `schemas.py` - Pydantic schemas
- `routers/` - API routes
- `services/` - Business logic
- `repositories/` (optional) - Data access layer

---

## 4. Data Model (Summary)

Tables:

- `user` (existing)
- `track`
- `node`
- `habit_schedule`
- `time_entry`
- `node_completion`
- `user_stats`
- `badge`
- `user_badge`
- `doc`

Enums:

- `node_type` = TASK, HABIT, FOCUS_SESSION, MILESTONE
- `habit_frequency` = DAILY, WEEKLY, MONTHLY

---

## 5. Domain Modules & Responsibilities

### 5.1 Track Module

- CRUD tracks
- Reorder tracks
- List tracks with aggregates
- Scoped by `user_id`

### 5.2 Node Module

- CRUD nodes inside a track
- Types: task, habit, focus session, milestone
- Reorder nodes
- Lock/unlock nodes
- Habit requires schedule

### 5.3 Habit Schedule Module

- CRUD schedule for habit nodes
- Frequency: daily, weekly, monthly
- Weekly: `days_of_week`
- Monthly: `days_of_month`

### 5.4 Time Tracking Module

- Start time entry (one active limit)
- Stop time entry
- Manual entries
- Aggregates: per task per day, per task total

### 5.5 Node Completion & XP Module

- Represents completed task/habit/focus
- Updates XP, level, streak
- Drives badge evaluation

### 5.6 Gamification Module

- Track user stats
- Return summary data
- XP curve: xp_to_next = level \* 100

### 5.7 Badge Module

- Static badges
- Award badges on conditions (streak milestones, time logged)
- Read-only for UI

### 5.8 Docs Module

- CRUD markdown docs
- Linked to track or node
- Search optional later

---

## 6. API Design

Base prefix: `/api/v1`

### 6.1 Tracks

- `GET /tracks`
- `POST /tracks`
- `GET /tracks/{id}`
- `PATCH /tracks/{id}`
- `DELETE /tracks/{id}`
- `POST /tracks/reorder`

### 6.2 Nodes

- `GET /tracks/{id}/nodes`
- `POST /tracks/{id}/nodes`
- `GET /nodes/{id}`
- `PATCH /nodes/{id}`
- `DELETE /nodes/{id}`
- `POST /nodes/reorder`
- `POST /nodes/{id}/lock`
- `POST /nodes/{id}/unlock`

### 6.3 Habit Schedules

- `PUT /nodes/{id}/habit-schedule`
- `GET /nodes/{id}/habit-schedule`
- `DELETE /nodes/{id}/habit-schedule`

### 6.4 Time Entries

- `POST /time-entries/start`
- `POST /time-entries/{id}/stop`
- `POST /time-entries`
- `GET /time-entries`
- `GET /time-entries/summary`

### 6.5 Completions

- `POST /nodes/{id}/complete`
- `GET /completions`

### 6.6 Stats & Gamification

- `GET /me/stats`
- `GET /me/progress/summary`
- `GET /badges`
- `GET /me/badges`

### 6.7 Docs

- `POST /docs`
- `GET /docs`
- `GET /docs/{id}`
- `PATCH /docs/{id}`
- `DELETE /docs/{id}`

---

## 7. Cross-Cutting Concerns

### 7.1 Auth & Ownership

- All endpoints require authenticated user.
- Ownership validated through `user_id`.

### 7.2 Error Handling

- 400 invalid input
- 403 access denied
- 404 not found
- 409 timer already running

### 7.3 Transactions

- Wrap multi-step updates (XP, streak, completion) in one transaction.

### 7.4 Time & Timezones

- All stored in UTC (`timestamptz`)
- Streak calculation uses date in user timezone (v1: UCT)

---

## 8. Non-Functional Requirements

- Single-instance friendly
- Basic logging
- Test business logic (streak, XP, badges)
- 100 ms average API response target

---

## 9. Implementation Plan

1. Create models & migrations
2. Create repositories
3. Implement services (tracks, nodes, habits, time, completion, stats, badges, docs)
4. Implement routers
5. Seed badges
6. Write tests
7. Integration with frontend

---

# End of Document
