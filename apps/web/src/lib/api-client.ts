import type {
  CancelSessionPayload,
  CompleteSessionPayload,
  HeroHudSummary,
  InventoryItem,
  RewardSummary,
  SessionHistoryEntry,
  StartSessionPayload,
  StartSessionResponse,
  TaskTemplate,
  WorldState,
} from '@os/types'

const API_BASE = '/api'

type FetchOptions = RequestInit & { skipAuth?: boolean }

const getDefaultHeaders = () => ({
  'Content-Type': 'application/json',
})

const resolveUserHeaders = () => {
  if (typeof window === 'undefined') {
    return {}
  }

  const storedUserId = window.localStorage.getItem('lifeos:userId')
  if (!storedUserId) {
    return {}
  }

  return {
    'x-user-id': storedUserId,
  }
}

async function request<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const headers = {
    ...getDefaultHeaders(),
    ...(!options.skipAuth ? resolveUserHeaders() : {}),
    ...(options.headers ?? {}),
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(errorBody || response.statusText)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}

export const apiClient = {
  getProfile: () => request<HeroHudSummary>('/profile'),
  bootstrapProfile: (nickname?: string) =>
    request<HeroHudSummary>('/profile/bootstrap', {
      method: 'POST',
      body: JSON.stringify({ nickname }),
    }),
  updateEquipment: (payload: {
    hatId?: string | null
    outfitId?: string | null
    accessoryId?: string | null
  }) =>
    request<HeroHudSummary>('/profile/equipment', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  getWorld: () => request<WorldState & { layers: Record<string, { level: number; decorativeLayer: boolean }> }>('/world'),
  getTasks: () => request<TaskTemplate[]>('/tasks'),
  createTask: (payload: Pick<TaskTemplate, 'name' | 'category' | 'defaultDuration' | 'preferredRoom'>) =>
    request<TaskTemplate>('/tasks', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateTask: (taskId: string, payload: Partial<TaskTemplate>) =>
    request<TaskTemplate>(`/tasks/${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  deleteTask: (taskId: string) =>
    request<{ id: string }>(`/tasks/${taskId}`, { method: 'DELETE' }),
  getInventory: () => request<InventoryItem[]>('/inventory'),
  equipItem: (slot: 'hat' | 'outfit' | 'accessory', inventoryId?: string | null) =>
    request<HeroHudSummary>('/inventory/equip', {
      method: 'POST',
      body: JSON.stringify({ slot, inventoryId }),
    }),
  getSessionHistory: () => request<SessionHistoryEntry[]>('/sessions/history'),
  startSession: (payload: StartSessionPayload) =>
    request<StartSessionResponse>('/sessions/start', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  completeSession: (payload: CompleteSessionPayload) =>
    request<RewardSummary>('/sessions/complete', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  cancelSession: (payload: CancelSessionPayload) =>
    request<{ sessionId: string; status: string }>('/sessions/cancel', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
}
