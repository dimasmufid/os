export type CosmeticType = 'hat' | 'outfit' | 'accessory'
export type CosmeticRarity = 'common' | 'rare' | 'epic'

export interface CosmeticItem {
  id: string
  slug: string
  name: string
  description?: string | null
  type: CosmeticType
  rarity: CosmeticRarity
  spriteKey?: string | null
  previewUrl?: string | null
}

export interface InventoryItem {
  id: string
  cosmetic: CosmeticItem
  unlockedAt: string
  equipped: boolean
  equippedSlot?: CosmeticType | null
}

export interface HeroProfile {
  id: string
  userId: string
  heroName: string
  level: number
  currentXp: number
  xpForNextLevel: number
  gold: number
  portraitUrl?: string | null
  equippedHatId?: string | null
  equippedOutfitId?: string | null
  equippedAccessoryId?: string | null
}

export type SessionStatus = 'in_progress' | 'completed' | 'cancelled'

export interface FocusSession {
  id: string
  taskId?: string | null
  durationMinutes: number
  status: SessionStatus
  startedAt: string
  completedAt?: string | null
  cancelledAt?: string | null
  rewardXp: number
  rewardGold: number
  streakCountAfter?: number | null
  cosmeticRewardId?: string | null
}

export interface SessionHistoryItem extends FocusSession {
  taskName?: string | null
  room?: RoomKey
}

export type RoomKey = 'plaza' | 'study' | 'build' | 'training'

export interface TaskTemplate {
  id: string
  name: string
  category: string
  defaultDurationMinutes: number
  room: RoomKey
  isArchived: boolean
}

export interface WorldState {
  id: string
  userId: string
  totalSessions: number
  successfulSessions: number
  studyRoomLevel: number
  buildRoomLevel: number
  trainingRoomLevel: number
  plazaLevel: number
  streakCount: number
  longestStreak: number
  lastSessionDate?: string | null
}

export interface WorldProgress {
  nextUpgrade: {
    room: RoomKey
    required: number
    remaining: number
  } | null
  completed: Array<{
    room: RoomKey
    required: number
  }>
}

export interface RewardSummary {
  sessionId: string
  xpAwarded: number
  goldAwarded: number
  leveledUp: boolean
  newLevel: number
  currentXp: number
  xpForNextLevel: number
  streakCount: number
  cosmeticReward?: CosmeticItem | null
  worldUpgrades?: Array<{
    room: RoomKey
    newLevel: number
  }>
}

export interface HeroProfileResponse {
  hero: HeroProfile
  world: WorldState
  equippedCosmetics: {
    hat?: CosmeticItem | null
    outfit?: CosmeticItem | null
    accessory?: CosmeticItem | null
  }
}
