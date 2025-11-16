export type RoomName = "study" | "build" | "training";
export type CosmeticSlot = "hat" | "outfit" | "accessory";
export type CosmeticRarity = "common" | "rare" | "epic";
export type SessionStatus = "pending" | "success" | "cancelled";

export interface CosmeticItem {
  id: string;
  name: string;
  slot: CosmeticSlot;
  rarity: CosmeticRarity;
  sprite_key: string;
  description?: string | null;
}

export interface HeroProfile {
  id: string;
  level: number;
  exp: number;
  gold: number;
  exp_to_next: number;
  equipped_hat?: CosmeticItem | null;
  equipped_outfit?: CosmeticItem | null;
  equipped_accessory?: CosmeticItem | null;
}

export interface WorldState {
  id: string;
  study_room_level: number;
  build_room_level: number;
  training_room_level: number;
  plaza_level: number;
  total_sessions_success: number;
  day_streak: number;
  longest_streak: number;
  last_session_date?: string | null;
}

export interface ProfileResponse {
  hero: HeroProfile;
  world: WorldState;
}

export interface TaskTemplate {
  id: string;
  name: string;
  category?: string | null;
  default_duration: number;
  room: RoomName;
}

export interface TaskTemplatePayload {
  name: string;
  category?: string | null;
  default_duration: number;
  room: RoomName;
}

export interface SessionStartPayload {
  task_template_id?: string | null;
  duration_minutes: 25 | 50 | 90;
  room: RoomName;
}

export interface SessionStartResponse {
  session_id: string;
  expected_end_time: string;
  status: SessionStatus;
}

export interface SessionCompleteRequest {
  session_id: string;
}

export interface FocusSession {
  id: string;
  task_template_id?: string | null;
  room: RoomName;
  duration_minutes: number;
  status: SessionStatus;
  expected_end_time?: string | null;
  completed_at?: string | null;
  cancelled_at?: string | null;
  reward_exp?: number | null;
  reward_gold?: number | null;
  created_at: string;
}

export interface RewardSummary {
  exp_reward: number;
  gold_reward: number;
  level_ups: number;
  unlocked_layers: string[];
  dropped_item?: CosmeticItem | null;
}

export interface SessionCompleteResponse {
  reward: RewardSummary;
  hero: HeroProfile;
  world: WorldState;
  session: FocusSession;
}

export interface SessionHistoryResponse {
  sessions: FocusSession[];
}

export interface InventoryItem {
  id: string;
  item: CosmeticItem;
  equipped: boolean;
  created_at: string;
}

export interface InventoryResponse {
  items: InventoryItem[];
}

export interface EquipPayload {
  item_id: string;
}

export interface WorldStateResponse {
  world: WorldState;
}

export interface WorldUpgradePayload {
  target: "study" | "build" | "training" | "plaza";
  level: number;
}
