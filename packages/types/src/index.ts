export type CosmeticType = 'hat' | 'outfit' | 'accessory'
export type CosmeticRarity = 'common' | 'rare' | 'epic'
export type FocusRoom = 'plaza' | 'study' | 'build' | 'training'
export type FocusSessionStatus = 'running' | 'completed' | 'cancelled'

export interface CosmeticItem {
  id: string
  slug: string
  name: string
  description?: string | null
  type: CosmeticType
  rarity: CosmeticRarity
  previewUrl?: string | null
}

export interface HeroProfile {
  id: string
  userId: string
  nickname: string
  level: number
  xp: number
  gold: number
  streakCount: number
  longestStreak: number
  lastSessionCompletedAt?: string | null
  equippedHatId?: string | null
  equippedOutfitId?: string | null
  equippedAccessoryId?: string | null
}

export interface HeroHudSummary {
  hero: HeroProfile
  world: WorldState
  equipped: EquippedCosmetics
}

export interface EquippedCosmetics {
  hat?: CosmeticItem | null
  outfit?: CosmeticItem | null
  accessory?: CosmeticItem | null
}

export interface InventoryItem {
  id: string
  heroId: string
  cosmeticId: string
  acquiredAt: string
  isEquipped: boolean
  cosmetic: CosmeticItem
}

export interface TaskTemplate {
  id: string
  heroId: string
  name: string
  category: string
  defaultDuration: number
  preferredRoom: FocusRoom
}

export interface FocusSession {
  id: string
  heroId: string
  taskId?: string | null
  durationMinutes: number
  startedAt: string
  completedAt?: string | null
  status: FocusSessionStatus
  rewardXp: number
  rewardGold: number
  droppedCosmeticId?: string | null
}

export interface SessionHistoryEntry extends FocusSession {
  task?: TaskTemplate | null
  droppedCosmetic?: CosmeticItem | null
}

export interface WorldState {
  heroId: string
  studyRoomLevel: number
  buildRoomLevel: number
  trainingRoomLevel: number
  plazaLevel: number
  totalSuccessfulSessions: number
  lastUpgradeAt?: string | null
}

export interface RewardSummary {
  sessionId: string
  xpGained: number
  goldGained: number
  newLevel: number
  leveledUp: boolean
  streakCount: number
  longestStreak: number
  cosmeticDrop?: CosmeticItem | null
  worldUpgrades: Array<WorldUpgrade>
}

export interface WorldUpgrade {
  room: 'study' | 'build' | 'plaza'
  level: number
}

export interface StartSessionPayload {
  durationMinutes: 25 | 50 | 90
  taskId?: string
}

export interface StartSessionResponse {
  sessionId: string
  startedAt: string
  durationMinutes: number
}

export interface CompleteSessionPayload {
  sessionId: string
}

export interface CancelSessionPayload {
  sessionId: string
}
