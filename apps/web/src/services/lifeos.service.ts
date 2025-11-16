import { apiClient } from "@/lib/api-client";
import {
  EquipPayload,
  FocusSession,
  InventoryResponse,
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

class LifeOSService {
  async getProfile(): Promise<ProfileResponse> {
    return apiClient.get<ProfileResponse>("/api/v1/profile");
  }

  async getTasks(): Promise<TaskTemplate[]> {
    return apiClient.get<TaskTemplate[]>("/api/v1/tasks");
  }

  async createTask(payload: TaskTemplatePayload): Promise<TaskTemplate> {
    return apiClient.post<TaskTemplate>("/api/v1/tasks", payload);
  }

  async updateTask(
    taskId: string,
    payload: Partial<TaskTemplatePayload>
  ): Promise<TaskTemplate> {
    return apiClient.put<TaskTemplate>(`/api/v1/tasks/${taskId}`, payload);
  }

  async deleteTask(taskId: string): Promise<void> {
    await apiClient.delete<void>(`/api/v1/tasks/${taskId}`);
  }

  async startSession(
    payload: SessionStartPayload
  ): Promise<SessionStartResponse> {
    return apiClient.post<SessionStartResponse>(
      "/api/v1/sessions/start",
      payload
    );
  }

  async completeSession(
    payload: SessionCompleteRequest
  ): Promise<SessionCompleteResponse> {
    return apiClient.post<SessionCompleteResponse>(
      "/api/v1/sessions/complete",
      payload
    );
  }

  async cancelSession(
    payload: SessionCompleteRequest
  ): Promise<FocusSession> {
    return apiClient.post<FocusSession>("/api/v1/sessions/cancel", payload);
  }

  async getSessionHistory(
    limit = 20
  ): Promise<SessionHistoryResponse> {
    return apiClient.get<SessionHistoryResponse>(
      `/api/v1/sessions/history?limit=${limit}`
    );
  }

  async getInventory(): Promise<InventoryResponse> {
    return apiClient.get<InventoryResponse>("/api/v1/inventory");
  }

  async equipItem(payload: EquipPayload): Promise<ProfileResponse["hero"]> {
    return apiClient.post<ProfileResponse["hero"]>(
      "/api/v1/inventory/equip",
      payload
    );
  }

  async getWorldState(): Promise<WorldStateResponse> {
    return apiClient.get<WorldStateResponse>("/api/v1/world");
  }

  async upgradeWorld(payload: WorldUpgradePayload): Promise<WorldStateResponse> {
    return apiClient.post<WorldStateResponse>("/api/v1/world/upgrade", payload);
  }
}

export const lifeosService = new LifeOSService();
