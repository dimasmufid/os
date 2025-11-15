export * from "./better-auth-schema";

import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

import { users } from "./better-auth-schema";

export const cosmeticTypeEnum = pgEnum("cosmetic_type", [
  "hat",
  "outfit",
  "accessory",
]);

export const cosmeticRarityEnum = pgEnum("cosmetic_rarity", [
  "common",
  "rare",
  "epic",
]);

export const focusRoomEnum = pgEnum("focus_room", [
  "plaza",
  "study",
  "build",
  "training",
]);

export const focusSessionStatusEnum = pgEnum("focus_session_status", [
  "running",
  "completed",
  "cancelled",
]);

export const heroProfiles = pgTable("hero_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  nickname: text("nickname").notNull().default("Adventurer"),
  level: integer("level").notNull().default(1),
  xp: integer("xp").notNull().default(0),
  gold: integer("gold").notNull().default(0),
  streakCount: integer("streak_count").notNull().default(0),
  longestStreak: integer("longest_streak").notNull().default(0),
  lastSessionCompletedAt: timestamp("last_session_completed_at"),
  equippedHatId: uuid("equipped_hat_id"),
  equippedOutfitId: uuid("equipped_outfit_id"),
  equippedAccessoryId: uuid("equipped_accessory_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const heroProfilesRelations = relations(heroProfiles, ({ one, many }) => ({
  user: one(users, {
    fields: [heroProfiles.userId],
    references: [users.id],
  }),
  worldState: one(worldStates, {
    fields: [heroProfiles.id],
    references: [worldStates.heroId],
  }),
  inventory: many(inventoryItems),
  sessions: many(focusSessions),
}));

export const cosmeticItems = pgTable("cosmetic_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  type: cosmeticTypeEnum("type").notNull(),
  rarity: cosmeticRarityEnum("rarity").notNull(),
  previewUrl: text("preview_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const cosmeticItemsRelations = relations(cosmeticItems, ({ many }) => ({
  inventoryItems: many(inventoryItems),
}));

export const inventoryItems = pgTable("inventory_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  heroId: uuid("hero_id")
    .notNull()
    .references(() => heroProfiles.id, { onDelete: "cascade" }),
  cosmeticId: uuid("cosmetic_id")
    .notNull()
    .references(() => cosmeticItems.id, { onDelete: "cascade" }),
  acquiredAt: timestamp("acquired_at").defaultNow().notNull(),
  isEquipped: boolean("is_equipped").notNull().default(false),
});

export const inventoryItemsRelations = relations(inventoryItems, ({ one }) => ({
  hero: one(heroProfiles, {
    fields: [inventoryItems.heroId],
    references: [heroProfiles.id],
  }),
  cosmetic: one(cosmeticItems, {
    fields: [inventoryItems.cosmeticId],
    references: [cosmeticItems.id],
  }),
}));

export const taskTemplates = pgTable("task_templates", {
  id: uuid("id").defaultRandom().primaryKey(),
  heroId: uuid("hero_id")
    .notNull()
    .references(() => heroProfiles.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  category: text("category").notNull().default("focus"),
  defaultDuration: integer("default_duration").notNull().default(25),
  preferredRoom: focusRoomEnum("preferred_room").notNull().default("study"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const taskTemplatesRelations = relations(taskTemplates, ({ one }) => ({
  hero: one(heroProfiles, {
    fields: [taskTemplates.heroId],
    references: [heroProfiles.id],
  }),
}));

export const focusSessions = pgTable("focus_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  heroId: uuid("hero_id")
    .notNull()
    .references(() => heroProfiles.id, { onDelete: "cascade" }),
  taskId: uuid("task_id").references(() => taskTemplates.id, {
    onDelete: "set null",
  }),
  durationMinutes: integer("duration_minutes").notNull(),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  status: focusSessionStatusEnum("status").notNull().default("running"),
  rewardXp: integer("reward_xp").notNull().default(0),
  rewardGold: integer("reward_gold").notNull().default(0),
  droppedCosmeticId: uuid("dropped_cosmetic_id").references(
    () => cosmeticItems.id,
    { onDelete: "set null" },
  ),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const focusSessionsRelations = relations(focusSessions, ({ one }) => ({
  hero: one(heroProfiles, {
    fields: [focusSessions.heroId],
    references: [heroProfiles.id],
  }),
  task: one(taskTemplates, {
    fields: [focusSessions.taskId],
    references: [taskTemplates.id],
  }),
  droppedCosmetic: one(cosmeticItems, {
    fields: [focusSessions.droppedCosmeticId],
    references: [cosmeticItems.id],
  }),
}));

export const worldStates = pgTable("world_states", {
  heroId: uuid("hero_id")
    .primaryKey()
    .references(() => heroProfiles.id, { onDelete: "cascade" }),
  studyRoomLevel: integer("study_room_level").notNull().default(1),
  buildRoomLevel: integer("build_room_level").notNull().default(1),
  trainingRoomLevel: integer("training_room_level").notNull().default(1),
  plazaLevel: integer("plaza_level").notNull().default(1),
  totalSuccessfulSessions: integer("total_successful_sessions").notNull().default(0),
  lastUpgradeAt: timestamp("last_upgrade_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const worldStatesRelations = relations(worldStates, ({ one }) => ({
  hero: one(heroProfiles, {
    fields: [worldStates.heroId],
    references: [heroProfiles.id],
  }),
}));
