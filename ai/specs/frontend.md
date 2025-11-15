# OS – Frontend (Next.js + Phaser) Specification

Version: 0.2  
Status: Ready for implementation  
Last Updated: 2025-11-15

---

## 1. Purpose & Scope
This specification defines the **Next.js + Phaser frontend** for OS. It translates the PRD and backend contract into concrete UI/game architecture, state flows, and implementation details so engineers can ship an end-to-end playable experience with predictable upgrades.

Key responsibilities:
- Render the 2D world, avatar movement, and room progression.
- Provide productivity session flows (start/run/complete/cancel).
- Surface hero stats, rewards, cosmetics, and history.
- Integrate with backend APIs without replicating game logic.

Non-goals:
- No multiplayer, audio, or pets (future roadmap).
- No custom rendering engine; Phaser + DOM UI only.

---

## 2. Architecture Overview

### 2.1 Runtime Layers
1. **Next.js App Router UI Shell** – layouts, panels, overlays, authentication guard.
2. **Phaser GameCanvas** – handles rendering, collisions, and input.
3. **State Orchestration** – `Zustand` store + `@tanstack/react-query` for network caching.
4. **API Client Layer** – typed fetch helpers hitting backend endpoints under `/api/*`.

### 2.2 Data Flow
```
User Input → React components → (a) API calls, (b) emit commands to Phaser
Backend response → store normalization → UI + Phaser scenes updated via props/events
Phaser events (e.g., room enter) → React handlers → update UI, enable/disable buttons
```

### 2.3 Rendering Split
- **Server Components** load initial profile/world data with `fetch` (Next.js caching disabled).
- **Client Components** host Phaser (`use client`) and interactive panels.
- All shadcn/ui primitives render outside the Phaser canvas to prevent input conflicts.

### 2.4 Multi-Tenant UX
- The auth route group (`/sign-in`, `/sign-up`) renders shadcn forms that post to `/api/signin` and `/api/signup`. Successful responses hydrate `useAuthStore` and redirect back to `/`.
- A global `useAuthStore` keeps the authenticated user, memberships, and the active organization; `api/client.ts` reads it to inject `X-Tenant-Id` into every request.
- The top bar exposes an `OrganizationSwitcher` drop-down to call `/api/organizations/select` and invalidate React Query caches.
- `/settings` hosts the tenant profile editor powered by `PATCH /api/tenants/:id` so workspace admins can rename or rebrand.

---

## 3. Tech Stack & Libraries
- **Next.js 15 App Router**
- **TypeScript strict mode**
- **Phaser 3.70** (ES modules)
- **TailwindCSS** + **shadcn/ui** (Buttons, Tabs, Dialogs, Sheet, Tooltip, Progress).
- **Zod** – all forms + API payload validation.
- **@tanstack/react-query** – data fetching, optimistic updates.
- **Zustand** – cross-component/game state (hero, session, active room).
- **Framer Motion** (optional) – subtle panel animations.
- **Phosphor Icons** (React) – iconography consistent with UI spec.

---

## 4. Directory & Module Structure
```
frontend/
├─ src/
│  ├─ app/
│  │  ├─ layout.tsx                 # Root layout, fonts, global providers
│  │  ├─ page.tsx                   # Authenticated landing (world + panels)
│  │  ├─ (auth)/sign-in/page.tsx    # Sign-in form
│  │  ├─ (auth)/sign-up/page.tsx    # Sign-up form
│  │  ├─ (auth)/layout.tsx          # Shared auth layout
│  │  ├─ game/page.tsx              # Fullscreen focus mode (optional, shares components)
│  │  ├─ settings/page.tsx          # Tenant settings surface
│  │  ├─ api/                       # Next.js route handlers (SSR helpers, not core API)
│  ├─ components/
│  │  ├─ GameShell.tsx              # Layout glue between Phaser + panels
│  │  ├─ TopBar.tsx
│  │  ├─ SessionPanel/
│  │  │   ├─ SessionForm.tsx        # zod form, durations, validation
│  │  │   └─ ActiveTimer.tsx
│  │  ├─ RightPanel/
│  │  │   ├─ Tabs.tsx               # shadcn Tabs wrapper
│  │  │   ├─ TasksTab.tsx
│  │  │   ├─ InventoryTab.tsx
│  │  │   └─ HistoryTab.tsx
│  │  ├─ RewardModal.tsx
│  │  ├─ RoomBadge.tsx
│  │  └─ CosmeticCard.tsx
│  ├─ game/
│  │  ├─ phaser/
│  │  │   ├─ config.ts
│  │  │   ├─ index.tsx              # React wrapper mounting Phaser.Game
│  │  │   ├─ hooks.ts               # usePhaserGame, event bridge
│  │  │   └─ scenes/
│  │  │        ├─ BootScene.ts
│  │  │        ├─ WorldScene.ts
│  │  │        └─ UIScene.ts
│  │  └─ assets/
│  │       ├─ tilemaps/map.json
│  │       ├─ tilemaps/study_room_upgrade.json (optional)
│  │       ├─ sprites/player.png
│  │       ├─ sprites/outfits/*.png
│  │       └─ sprites/ui/*.png
│  ├─ lib/
│  │  ├─ api/
│  │  │   ├─ client.ts              # fetch wrapper w/ auth + error parsing
│  │  │   ├─ endpoints.ts           # functions per backend route
│  │  │   └─ transformers.ts        # map backend payloads to frontend models
│  │  ├─ models/
│  │  │   ├─ hero.ts
│  │  │   ├─ session.ts
│  │  │   ├─ inventory.ts
│  │  │   └─ world.ts
│  │  ├─ store/
│  │  │   ├─ useGameStore.ts        # Gameplay slices
│  │  │   └─ useAuthStore.ts        # Tenant + user state
│  │  └─ utils/
│  │      ├─ timers.ts
│  │      └─ analytics.ts
│  ├─ styles/
│  │  └─ globals.css
│  └─ tests/
│     ├─ components/
│     └─ e2e/
└─ public/
   └─ assets mirrored for Next.js static usage
```

---

## 5. Routing & Layouts
1. **`src/app/layout.tsx`**
   - Imports Tailwind globals, registers fonts, sets `<body>` theme classes.
   - Wraps children with `<Providers>` component that mounts React Query + Zustand contexts.
2. **`src/app/page.tsx`**
   - Server component performing `await getProfile()` (calls backend `/api/profile`).
   - Passes initial data into `GameShell` as serialized props.
3. **`src/app/game/page.tsx`**
   - Mirrors main page but hides left/right panels for distraction-free sessions.
4. **`src/app/(auth)/*`** – client-rendered sign-in/sign-up forms that hit `/api/signin` + `/api/signup`, hydrate `useAuthStore`, and redirect to `/`.
5. **`src/app/settings/page.tsx`** – tenant metadata form that posts to `PATCH /api/tenants/:id`.

---

## 6. Data Models (TypeScript)
Keep all models in `src/lib/models` and align names with backend schema. Example definitions:

```ts
// hero.ts
export type CosmeticSlot = 'hat' | 'outfit' | 'accessory';

export interface Hero {
  id: string;
  level: number;
  exp: number;
  gold: number;
  streak: number;
  equippedHatId?: string;
  equippedOutfitId?: string;
  equippedAccessoryId?: string;
}

// session.ts
export type SessionStatus = 'idle' | 'pending' | 'running' | 'success' | 'cancelled' | 'timeout';

export interface SessionTemplate {
  id: string;
  name: string;
  category: string;
  defaultDurationMinutes: number;
  room: 'study' | 'build' | 'training';
}

export interface ActiveSession {
  sessionId: string;
  templateId: string;
  durationMinutes: number;
  startedAt: string;
  endsAt: string;
  room: SessionTemplate['room'];
}
```

Add similar files for `InventoryItem`, `WorldState`, and `RewardPayload` so React Query responses are strongly typed.

---

## 7. API Client Layer
- **`client.ts`** – wraps `fetch` with:
  - base URL from `process.env.NEXT_PUBLIC_API_BASE_URL`.
  - automatic `credentials: 'include'`.
  - JSON parsing + error normalization.
  - Zod response schemas (e.g., `profileResponseSchema`).
  - Injects `X-Tenant-Id` derived from `useAuthStore` so multi-tenant endpoints stay scoped.
- **`endpoints.ts`** – exported helpers:
  - `getProfile() → { user, hero, worldState }`
  - `listTasks()`
  - `startSession(payload)`
  - `completeSession(sessionId)`
  - `cancelSession(sessionId)` (client-only; informs backend)
  - `listInventory()`
  - `equipItem(itemId)`
  - `signin(payload)` / `signup(payload)`
  - `switchOrganization(id)` and `updateTenant(id, payload)`
- All forms validated via zod before hitting endpoints.
- React Query keys: `['profile']`, `['tasks']`, `['inventory']`, `['worldState']`, `['session', id]`.

---

## 8. State Management

### 8.1 Zustand Store
`useGameStore` slices:
- `hero`, `worldState`, `inventory`, `tasks`.
- `activeRoom`: `'plaza' | 'study' | 'build' | 'training'`.
- `session`: holds `ActiveSession | null` plus derived countdown seconds.
- Actions:
  - `setHero`, `setWorldState`, `setInventory`
  - `setActiveRoom(room)`
  - `startSession(sessionPayload)`
  - `completeSession(rewardPayload)`
  - `cancelSession()`
  - `applyCosmeticEquip(itemId)`
- Persist to memory only; rely on backend for truth. On refocus events, call `syncProfile`.

`useAuthStore` slices:
- `user`, `organization`, setter helpers.
- Exposes `setAuth`, `updateOrganization`, `clearAuth` which also set the global tenant header via `api/client`.

### 8.2 React Query Integration
- React Query hydrates SSR data into client cache.
- Store values derived from React Query results to avoid double-fetch.
- Use background refetch (every 3 min) for hero/world.

### 8.3 Authentication & Tenant Flows
- `SignInForm` / `SignUpForm` live under `components/auth` and post to `/api/signin` + `/api/signup`. On success they call `setAuth` and redirect to `/`.
- `OrganizationSwitcher` reads memberships from `useAuthStore`, calls `switchOrganization`, and invalidates `['profile']`, `['tasks']`, and `['inventory']` query keys.
- `TenantSettings` (app/settings) binds to `updateTenant` and, after saving, calls `updateOrganization` so the UI (top bar, switcher) reflects new metadata immediately.

---

## 9. Phaser Game Architecture

### 9.1 Scenes
1. **BootScene**
   - Preloads sprites (`player`, `tiles`, `cosmetics atlases`), tilemaps, and sound effects (once introduced).
   - On complete: start `WorldScene` + `UIScene`.
2. **WorldScene**
   - Creates tilemap using `map.json`.
   - Layers: `Ground`, `Walls`, `Decorations`, `Interactables`, `Overlay`.
   - Configures collision on `Walls` and `Interactables`.
   - Adds Phaser `Zone` objects for rooms (IDs match backend enumerations).
   - Player sprite uses `arcade physics`.
   - Handles input (WASD, arrow keys). Disables when session running.
   - Emits custom events via `scene.events.emit('enterRoom', 'study')`.
   - Applies cosmetics by swapping sprite textures or overlay layers.
3. **UIScene**
   - Draws floating indicators (e.g., room name, quest markers) via Phaser UI elements.
   - Listens for store updates via event bridge to show confetti, upgrade glows.

### 9.2 React Integration
- `game/phaser/index.tsx` mounts Phaser once using `useEffect`.
- Use a lightweight event bus (`mitt`) to communicate between React↔Phaser.
- Provide hooks:
  - `usePhaserEvents()` returning `emitCommand(command, payload)` and `subscribe`.
  - Example commands:
    - `lockMovement`
    - `unlockMovement`
    - `applyCosmeticSet`
    - `updateWorldLayers`
    - `playRewardFx`
- Phaser -> React events:
  - `room:enter`
  - `room:leave`
  - `session:timer:complete` (failsafe)

---

## 10. Asset Pipeline
- Store original Aseprite/exported PNGs under `src/game/assets`.
- Tilemap created in Tiled. Use embedded tilesets referencing `/sprites/tiles.png`.
- Optimize spritesheets via `texturePacker` script before commit.
- Asset manifest in `BootScene` enumerates `key → file`.
- Document upgrade layers:
  - `study_room_l2`
  - `build_room_l2`
  - `plaza_fx`
  - Toggle by setting `setVisible(true/false)` based on `worldState`.

---

## 11. UI Layout & Components

### 11.1 GameShell
- Composition:
  - `<TopBar />` pinned at top.
  - `<main>` grid with:
    - Left column: `<SessionPanel />`.
    - Center: `<PhaserCanvas />`.
    - Right column: `<RightPanelTabs />`.
- Responsive breakpoints:
  - ≥1280px: three columns.
  - 1024–1279px: collapse right panel into `Sheet` (shadcn `Sheet`).
  - ≤768px: show CTA to open game on desktop (Phaser not mobile optimized yet).

### 11.2 Top Bar
- Uses `shadcn/ui` components: `Avatar`, `Progress`, `Badge`.
- Data fields: avatar icon, `Lv X`, XP progress (calc `current_exp / level_exp_to_next`), gold, streak.
- Include `Next session available in ...` message if `session` active.

### 11.3 Session Panel (Left)
- `SessionForm`:
  - Zod schema:
    ```ts
    const sessionSchema = z.object({
      taskTemplateId: z.string().uuid(),
      durationMinutes: z.enum(['25','50','90']).transform(Number),
    });
    ```
  - Fields: Task dropdown (grouped by category), duration segmented control, Start button.
  - If hero is not in matching room, show tooltip “Move to Study Room to start”.
- `ActiveTimer`:
  - Shows countdown, pause/cancel buttons (cancel = confirm dialog).
  - On start: disable form, send `lockMovement` to Phaser.
  - On complete: open `RewardModal`.

### 11.4 Right Panel (Tabs)
- `Tabs` (shadcn) with `tasks`, `inventory`, `history`.
- `TasksTab` – lists templates, allows CRUD (future). For v1, read-only list with filter chips.
- `InventoryTab` – grid of `CosmeticCard`s with rarity color coding, equip button, currently equipped indicator.
- `HistoryTab` – table of past sessions (status, duration, rewards). Use virtualization for >50 rows.

### 11.5 Overlays & Modals
- `RoomBadge` anchored near canvas, updates text when user enters room.
- `RewardModal` (shadcn Dialog):
  - Props: `exp`, `gold`, `droppedItem`.
  - Shows animation (confetti). On close, call `unlockMovement`.
- `ErrorToast` using `useToast` (shadcn) for network failures.

---

## 12. Session Flow (Detailed)

1. **Idle**
   - `session.status = 'idle'`.
   - Form enabled. Start button disabled unless hero in chosen room.
2. **Start Request**
   - Form submit → zod validate → call `startSession`.
   - Optimistically set `session.status = 'running'`, store `sessionId`, `endsAt`.
   - Phaser receives `lockMovement`.
3. **Running**
   - `ActiveTimer` uses `useInterval` to compute remaining seconds.
   - Page focus loss triggers banner “stay focused”.
   - Cancel:
     - Shows confirm dialog.
     - If confirmed, call backend cancel (if available) or just `cancelSession`.
     - Unlock movement, toast message, session resets to idle.
4. **Completion**
   - Timer hitting 0 automatically calls `completeSession(sessionId)`.
   - On success:
     - Update `hero`, `worldState`, `inventory` via store actions.
     - Show `RewardModal`.
     - Emit `playRewardFx` (sparkles).
   - On failure (e.g., backend rejects):
     - Show toast with reason.
     - Unlock movement, set status idle.
5. **Post-Completion Sync**
   - React Query invalidates `['profile']`, `['inventory']`, `['worldState']`.
   - Phaser toggles room upgrades if `worldState` changed.

---

## 13. Inventory & Cosmetics
- Inventory data fetched via `listInventory`.
- Items displayed as cards with:
  - Sprite preview (Phaser-sourced, but we store static images for UI).
  - Rarity pill (Common/Rare/Epic).
  - Equip CTA (shadcn Button).
- Flow:
  1. User clicks Equip.
  2. Call `equipItem(itemId)`.
  3. Update hero store `equipped*Id`.
  4. Emit `applyCosmeticSet` with new sprite keys.
- If backend indicates newly dropped item, highlight card with `New` badge until hovered.

---

## 14. Tasks & History
- **TasksTab**
  - `TaskCard` elements showing name, duration presets, recommended room.
  - Provide quick start button (prefills form, scrolls to Session Panel).
  - Future editing/resizing to follow same schema.
- **HistoryTab**
  - Data source: `/api/session/history?limit=20`.
  - Display table columns: Date, Task, Duration, Result, XP, Gold, Item drop.
  - Provide filter for `success` vs `cancel`.

---

## 15. World Progression Integration
- On profile/world fetch, compute `WorldDecorState`:
  ```ts
  interface WorldDecorState {
    studyLevel: 1 | 2;
    buildLevel: 1 | 2;
    plazaUpgrade: boolean;
  }
  ```
- Phaser receives state via `emitCommand('updateWorldLayers', state)`.
- On transitions (level 1 → 2) show particle emitter near relevant room for 3 seconds.
- Keep world state idempotent: same level should not retrigger animation.

---

## 16. Event & Messaging Contracts
| Direction | Event | Payload | Purpose |
|-----------|-------|---------|---------|
| Phaser → React | `room:enter` | `{ room: 'study' | 'build' | 'training' | 'plaza' }` | Update UI badges, enable Start button only when matching room |
| Phaser → React | `session:timer:done` | `{ sessionId }` | Failsafe if UI timer stops |
| Phaser → React | `world:interaction` | `{ objectId }` | Future: open tooltips |
| React → Phaser | `lockMovement` | `{ reason: 'session' }` | Freeze avatar |
| React → Phaser | `unlockMovement` | none | Resume movement |
| React → Phaser | `applyCosmeticSet` | `{ hatKey?, outfitKey?, accessoryKey? }` | Update sprite textures |
| React → Phaser | `updateWorldLayers` | `WorldDecorState` | Toggle upgrade layers |
| React → Phaser | `playRewardFx` | `{ type: 'sessionComplete' }` | Confetti, glow |

Implementation detail:
- Use `mitt` emitter.
- `PhaserBridgeProvider` registers listeners once and cleans up on unmount.

---

## 17. Error Handling, Loading, and Offline
- All API helpers throw `ApiError` containing `status`, `message`.
- UI guidelines:
  - Show skeleton states for profile + world.
  - Session start failure: highlight form + show toast message.
  - If websocket/events later introduced, degrade gracefully.
- Offline detection:
  - Use `navigator.onLine`; when false, disable Start button with tooltip “Reconnect to start session”.

---

## 18. Testing Strategy
- **Unit** (`vitest` or `jest`):
  - `SessionForm` validation.
  - Store actions (start/complete session).
  - API transformers.
- **Component** (React Testing Library):
  - TopBar renders hero stats.
  - InventoryTab equipping calls API stub.
  - RewardModal displays drop state.
- **Integration**:
  - Mock Phaser event bus to ensure Session flow dispatches commands.
  - Timer countdown – use fake timers.
- **E2E** (Playwright):
  - Start session, wait for timer, confirm reward modal (use fast-forward by mocking backend).
  - Equip cosmetic and verify sprite update event fired (Phaser stub).
- Provide `npm run test`, `npm run test:e2e`.

---

## 19. Accessibility & Performance
- All interactive components follow WCAG AA:
  - Buttons labeled, tooltips for icon-only controls.
  - Tabs follow aria roles using shadcn defaults.
  - Modals trap focus.
- Keyboard-only usage:
  - Session form fully navigable.
  - Provide `Skip to game` link before canvas.
- Performance targets:
  - Phaser canvas at 60 FPS on MacBook Air M1.
  - Initial page load < 2s on broadband: lazy-load Phaser chunk using `dynamic(() => import(...), { ssr: false })`.
  - Use `requestAnimationFrame` loops only inside Phaser.

---

## 20. Deployment & Observability
- Build command: `cd frontend && npm run build`.
- Env requirements:
  - `NEXT_PUBLIC_API_BASE_URL`
  - Optional `NEXT_PUBLIC_SENTRY_DSN`.
- Instrumentation:
  - Wrap `RewardModal` close handler with analytics event `session_complete`.
  - Log Phaser errors to `console.error` + Sentry capture (if available).

---

## 21. Future Hooks (v2+)
- Background music toggle component.
- Pets overlay scene.
- Multiplayer: integrate websockets with additional `Scene`.
These should not block v1 but keep placeholders (feature flags).

---

## 22. Implementation Checklist
- [ ] Layout + providers scaffolded.
- [ ] Phaser integrated with event bridge.
- [ ] Session form w/ zod validation.
- [ ] API client hitting `/api/profile`, `/api/tasks`, `/api/session/*`.
- [ ] Reward modal with confetti.
- [ ] Inventory equip -> Phaser cosmetics update.
- [ ] World upgrades toggle layers.
- [ ] Tests implemented per strategy.

This spec, combined with the backend contract and PRD, is sufficient to start implementing the OS frontend.
