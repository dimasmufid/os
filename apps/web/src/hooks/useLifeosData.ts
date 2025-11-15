import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { api } from '../lib/api/client'

export const heroKeys = {
  profile: ['hero', 'profile'] as const,
}

export const taskKeys = {
  all: ['tasks'] as const,
}

export const inventoryKeys = {
  all: ['inventory'] as const,
}

export const sessionKeys = {
  history: ['sessions', 'history'] as const,
  active: ['sessions', 'active'] as const,
}

export const worldKeys = {
  state: ['world', 'state'] as const,
}

export const useHeroProfileQuery = () =>
  useQuery({
    queryKey: heroKeys.profile,
    queryFn: api.hero.getProfile,
  })

export const useWorldStateQuery = () =>
  useQuery({
    queryKey: worldKeys.state,
    queryFn: api.world.getState,
  })

export const useTasksQuery = () =>
  useQuery({
    queryKey: taskKeys.all,
    queryFn: api.tasks.list,
  })

export const useInventoryQuery = () =>
  useQuery({
    queryKey: inventoryKeys.all,
    queryFn: api.inventory.list,
  })

export const useSessionHistoryQuery = () =>
  useQuery({
    queryKey: sessionKeys.history,
    queryFn: api.sessions.history,
  })

export const useCreateTaskMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: api.tasks.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all })
    },
  })
}

export const useEquipCosmeticMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: api.inventory.equip,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.all })
      queryClient.invalidateQueries({ queryKey: heroKeys.profile })
    },
  })
}

export const useSessionMutations = () => {
  const queryClient = useQueryClient()

  const invalidateCoreQueries = () => {
    queryClient.invalidateQueries({ queryKey: heroKeys.profile })
    queryClient.invalidateQueries({ queryKey: inventoryKeys.all })
    queryClient.invalidateQueries({ queryKey: worldKeys.state })
    queryClient.invalidateQueries({ queryKey: sessionKeys.history })
  }

  const start = useMutation({
    mutationFn: api.sessions.start,
  })

  const complete = useMutation({
    mutationFn: api.sessions.complete,
    onSuccess: () => invalidateCoreQueries(),
  })

  const cancel = useMutation({
    mutationFn: api.sessions.cancel,
    onSuccess: () => invalidateCoreQueries(),
  })

  return {
    start,
    complete,
    cancel,
  }
}
