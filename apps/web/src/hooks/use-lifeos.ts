"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { lifeosService } from "@/services/lifeos.service";
import {
  EquipPayload,
  ProfileResponse,
  SessionCompleteRequest,
  SessionCompleteResponse,
  SessionHistoryResponse,
  SessionStartPayload,
  SessionStartResponse,
  TaskTemplate,
  TaskTemplatePayload,
  WorldStateResponse,
  WorldUpgradePayload,
} from "@/types/lifeos";

const lifeosKeys = {
  profile: ["lifeos", "profile"] as const,
  tasks: ["lifeos", "tasks"] as const,
  inventory: ["lifeos", "inventory"] as const,
  history: (limit: number) => ["lifeos", "sessions", "history", limit] as const,
  world: ["lifeos", "world"] as const,
};

export function useLifeOSProfile() {
  return useQuery<ProfileResponse>({
    queryKey: lifeosKeys.profile,
    queryFn: () => lifeosService.getProfile(),
  });
}

export function useLifeOSTasks() {
  return useQuery<TaskTemplate[]>({
    queryKey: lifeosKeys.tasks,
    queryFn: () => lifeosService.getTasks(),
  });
}

export function useInventory() {
  return useQuery({
    queryKey: lifeosKeys.inventory,
    queryFn: () => lifeosService.getInventory(),
  });
}

export function useSessionHistory(limit = 20) {
  return useQuery<SessionHistoryResponse>({
    queryKey: lifeosKeys.history(limit),
    queryFn: () => lifeosService.getSessionHistory(limit),
  });
}

export function useWorldState() {
  return useQuery<WorldStateResponse>({
    queryKey: lifeosKeys.world,
    queryFn: () => lifeosService.getWorldState(),
  });
}

export function useStartSessionMutation() {
  const queryClient = useQueryClient();
  return useMutation<
    SessionStartResponse,
    Error,
    SessionStartPayload
  >({
    mutationFn: (payload) => lifeosService.startSession(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["lifeos", "sessions", "history"],
      });
    },
  });
}

export function useCompleteSessionMutation() {
  const queryClient = useQueryClient();
  return useMutation<
    SessionCompleteResponse,
    Error,
    SessionCompleteRequest
  >({
    mutationFn: (payload) => lifeosService.completeSession(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: lifeosKeys.profile });
      queryClient.invalidateQueries({ queryKey: lifeosKeys.inventory });
      queryClient.invalidateQueries({ queryKey: lifeosKeys.world });
      queryClient.invalidateQueries({
        queryKey: ["lifeos", "sessions", "history"],
      });
    },
  });
}

export function useCancelSessionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: SessionCompleteRequest) =>
      lifeosService.cancelSession(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["lifeos", "sessions", "history"],
      });
    },
  });
}

export function useEquipItemMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: EquipPayload) => lifeosService.equipItem(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: lifeosKeys.inventory });
      queryClient.invalidateQueries({ queryKey: lifeosKeys.profile });
    },
  });
}

export function useCreateTaskMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: TaskTemplatePayload) =>
      lifeosService.createTask(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: lifeosKeys.tasks });
    },
  });
}

export function useUpdateTaskMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (variables: {
      id: string;
      payload: Partial<TaskTemplatePayload>;
    }) => lifeosService.updateTask(variables.id, variables.payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: lifeosKeys.tasks });
    },
  });
}

export function useDeleteTaskMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) => lifeosService.deleteTask(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: lifeosKeys.tasks });
    },
  });
}

export function useWorldUpgradeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: WorldUpgradePayload) =>
      lifeosService.upgradeWorld(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: lifeosKeys.world });
      queryClient.invalidateQueries({ queryKey: lifeosKeys.profile });
    },
  });
}
