import type {
  FocusSession,
  HeroProfileResponse,
  InventoryItem,
  RewardSummary,
  SessionHistoryItem,
  TaskTemplate,
  WorldProgress,
  WorldState,
} from '@os/types'

const API_BASE_URL =
  import.meta.env.PUBLIC_API_URL ?? (import.meta.env.DEV ? 'http://localhost:4000' : '')

const defaultHeaders = {
  'Content-Type': 'application/json',
  'x-user-id': 'demo-user',
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
    ...init,
    headers: {
      ...defaultHeaders,
      ...(init.headers ?? {}),
    },
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || 'Request failed')
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}

export const api = {
  hero: {
    getProfile: () => request<HeroProfileResponse>('/profile'),
    updateHero: (payload: Partial<{ heroName: string; portraitUrl: string | null }>) =>
      request<HeroProfileResponse>('/profile', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
    updateEquipment: (payload: Partial<{ hatId: string | null; outfitId: string | null; accessoryId: string | null }>) =>
      request<HeroProfileResponse>('/profile/equipment', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
  },
  tasks: {
    list: () => request<Array<TaskTemplate>>('/tasks'),
    create: (payload: { name: string; category: string; room: string; defaultDurationMinutes: number }) =>
      request<TaskTemplate>('/tasks', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
  },
  sessions: {
    start: (payload: { taskId?: string; durationMinutes: number }) =>
      request<FocusSession>('/sessions/start', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    complete: (sessionId: string) =>
      request<RewardSummary>('/sessions/complete', {
        method: 'POST',
        body: JSON.stringify({ sessionId }),
      }),
    cancel: (sessionId: string) =>
      request<FocusSession>('/sessions/cancel', {
        method: 'POST',
        body: JSON.stringify({ sessionId }),
      }),
    history: () => request<Array<SessionHistoryItem>>('/sessions/history'),
  },
  inventory: {
    list: () => request<Array<InventoryItem>>('/inventory'),
    equip: (payload: { cosmeticId: string; unequip?: boolean }) =>
      request<{ hero: HeroProfileResponse; inventory: Array<InventoryItem> }>('/inventory/equip', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
  },
  world: {
    getState: () => request<{ world: WorldState; progress: WorldProgress }>('/world'),
    upgrade: (room: 'study' | 'build' | 'plaza') =>
      request<WorldState>('/world/upgrade', {
        method: 'POST',
        body: JSON.stringify({ room }),
      }),
  },
}
