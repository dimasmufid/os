import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

import { users } from './better-auth-schema'

export * from './better-auth-schema'

export const cosmeticTypeEnum = pgEnum('cosmetic_type', [
  'hat',
  'outfit',
  'accessory',
])

export const cosmeticRarityEnum = pgEnum('cosmetic_rarity', [
  'common',
  'rare',
  'epic',
])

export const sessionStatusEnum = pgEnum('session_status', [
  'in_progress',
  'completed',
  'cancelled',
])

export const roomKeyEnum = pgEnum('room_key', [
  'plaza',
  'study',
  'build',
  'training',
])

export const cosmeticItems = pgTable(
  'cosmetic_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    description: text('description'),
    type: cosmeticTypeEnum('type').notNull(),
    rarity: cosmeticRarityEnum('rarity').default('common').notNull(),
    spriteKey: text('sprite_key'),
    previewUrl: text('preview_url'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (cosmeticItems) => ({
    slugUnique: uniqueIndex('cosmetic_items_slug_unique').on(cosmeticItems.slug),
  }),
)

export const heroProfiles = pgTable(
  'hero_profiles',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    heroName: text('hero_name').default('Adventurer').notNull(),
    level: integer('level').default(1).notNull(),
    currentXp: integer('current_xp').default(0).notNull(),
    xpForNextLevel: integer('xp_for_next_level').default(100).notNull(),
    gold: integer('gold').default(0).notNull(),
    portraitUrl: text('portrait_url'),
    equippedHatId: uuid('equipped_hat_id').references(() => cosmeticItems.id, {
      onDelete: 'set null',
    }),
    equippedOutfitId: uuid('equipped_outfit_id').references(
      () => cosmeticItems.id,
      {
        onDelete: 'set null',
      },
    ),
    equippedAccessoryId: uuid('equipped_accessory_id').references(
      () => cosmeticItems.id,
      {
        onDelete: 'set null',
      },
    ),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (heroProfiles) => ({
    userUnique: uniqueIndex('hero_profiles_user_unique').on(heroProfiles.userId),
  }),
)

export const inventoryItems = pgTable(
  'inventory_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    cosmeticItemId: uuid('cosmetic_item_id')
      .notNull()
      .references(() => cosmeticItems.id, { onDelete: 'cascade' }),
    unlockedAt: timestamp('unlocked_at').defaultNow().notNull(),
  },
  (inventoryItems) => ({
    userCosmeticUnique: uniqueIndex('inventory_items_user_cosmetic_unique').on(
      inventoryItems.userId,
      inventoryItems.cosmeticItemId,
    ),
  }),
)

export const taskTemplates = pgTable(
  'task_templates',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    category: text('category').notNull(),
    defaultDurationMinutes: integer('default_duration_minutes').notNull(),
    room: roomKeyEnum('room').default('study').notNull(),
    isArchived: boolean('is_archived').default(false).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (taskTemplates) => ({
    userNameRoomUnique: uniqueIndex('task_templates_user_name_room_unique').on(
      taskTemplates.userId,
      taskTemplates.name,
      taskTemplates.room,
    ),
  }),
)

export const focusSessions = pgTable('focus_sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  taskId: uuid('task_id').references(() => taskTemplates.id, {
    onDelete: 'set null',
  }),
  durationMinutes: integer('duration_minutes').notNull(),
  status: sessionStatusEnum('status').default('in_progress').notNull(),
  startedAt: timestamp('started_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
  cancelledAt: timestamp('cancelled_at'),
  rewardXp: integer('reward_xp').default(0).notNull(),
  rewardGold: integer('reward_gold').default(0).notNull(),
  streakCountAfter: integer('streak_count_after'),
  cosmeticRewardId: uuid('cosmetic_reward_id').references(
    () => cosmeticItems.id,
    { onDelete: 'set null' },
  ),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const worldStates = pgTable(
  'world_states',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    totalSessions: integer('total_sessions').default(0).notNull(),
    successfulSessions: integer('successful_sessions').default(0).notNull(),
    studyRoomLevel: integer('study_room_level').default(1).notNull(),
    buildRoomLevel: integer('build_room_level').default(1).notNull(),
    trainingRoomLevel: integer('training_room_level').default(1).notNull(),
    plazaLevel: integer('plaza_level').default(1).notNull(),
    streakCount: integer('streak_count').default(0).notNull(),
    longestStreak: integer('longest_streak').default(0).notNull(),
    lastSessionDate: timestamp('last_session_date'),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (worldStates) => ({
    userWorldUnique: uniqueIndex('world_states_user_unique').on(
      worldStates.userId,
    ),
  }),
)
