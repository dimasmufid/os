import { Inject, Injectable } from '@nestjs/common';
import {
  type Database,
  cosmeticItems,
  focusSessions,
  heroProfiles,
  inventoryItems,
  worldStates,
} from '@os/db';
import type {
  CosmeticItem as CosmeticItemType,
  RewardSummary,
} from '@os/types';
import { eq } from 'drizzle-orm';

import { DATABASE_TOKEN } from '../database/database.constants';
import { HeroService } from '../hero/hero.service';

const COSMETIC_SEED: Array<typeof cosmeticItems.$inferInsert> = [
  {
    slug: 'starter-cap',
    name: 'Starter Cap',
    description:
      'A well-loved cap passed down through countless focus missions.',
    type: 'hat',
    rarity: 'common',
    spriteKey: 'starter-cap',
  },
  {
    slug: 'ember-hood',
    name: 'Ember Hood',
    description:
      'Warm and bright, woven from the embers of completed sessions.',
    type: 'hat',
    rarity: 'rare',
    spriteKey: 'ember-hood',
  },
  {
    slug: 'focus-coat',
    name: 'Focus Coat',
    description: 'A cozy coat with stitched reminders to keep going.',
    type: 'outfit',
    rarity: 'common',
    spriteKey: 'focus-coat',
  },
  {
    slug: 'artisan-tunic',
    name: 'Artisan Tunic',
    description: 'Handcrafted outfit that glows when creativity flows.',
    type: 'outfit',
    rarity: 'rare',
    spriteKey: 'artisan-tunic',
  },
  {
    slug: 'glimmer-bracelet',
    name: 'Glimmer Bracelet',
    description:
      'A bracelet that sparkles brighter with every streak milestone.',
    type: 'accessory',
    rarity: 'common',
    spriteKey: 'glimmer-bracelet',
  },
  {
    slug: 'starlit-compass',
    name: 'Starlit Compass',
    description: 'Always points toward your next mission.',
    type: 'accessory',
    rarity: 'epic',
    spriteKey: 'starlit-compass',
  },
];

@Injectable()
export class RewardService {
  private seedPromise: Promise<void> | null = null;

  constructor(
    @Inject(DATABASE_TOKEN) private readonly db: Database,
    private readonly heroService: HeroService,
  ) {}

  calculateRewards(durationMinutes: number) {
    const xpAwarded = durationMinutes * 2;
    const goldAwarded = durationMinutes;

    return { xpAwarded, goldAwarded };
  }

  async applySessionCompletion(
    userId: string,
    session: typeof focusSessions.$inferSelect,
  ): Promise<RewardSummary> {
    await this.ensureSeededCosmetics();

    const now = new Date();
    const { xpAwarded, goldAwarded } = this.calculateRewards(
      session.durationMinutes,
    );

    const hero = await this.heroService.ensureHeroProfile(userId);
    const world = await this.heroService.ensureWorldState(userId);

    let level = hero.level;
    let currentXp = hero.currentXp + xpAwarded;
    let xpForNextLevel = hero.xpForNextLevel;
    let leveledUp = false;

    while (currentXp >= xpForNextLevel) {
      currentXp -= xpForNextLevel;
      level += 1;
      xpForNextLevel = this.nextXpThreshold(level);
      leveledUp = true;
    }

    const newGold = hero.gold + goldAwarded;

    await this.db
      .update(heroProfiles)
      .set({
        level,
        currentXp,
        xpForNextLevel,
        gold: newGold,
        updatedAt: now,
      })
      .where(eq(heroProfiles.userId, userId));

    const streakResult = this.calculateStreak(world, now);
    const worldProgress = this.calculateWorldUpgrades(
      world,
      streakResult.successfulSessions,
    );

    await this.db
      .update(worldStates)
      .set({
        totalSessions: world.totalSessions + 1,
        successfulSessions: streakResult.successfulSessions,
        studyRoomLevel: worldProgress.studyRoomLevel,
        buildRoomLevel: worldProgress.buildRoomLevel,
        trainingRoomLevel: world.trainingRoomLevel,
        plazaLevel: worldProgress.plazaLevel,
        streakCount: streakResult.streakCount,
        longestStreak: streakResult.longestStreak,
        lastSessionDate: now,
        updatedAt: now,
      })
      .where(eq(worldStates.userId, userId));

    const cosmeticReward = await this.rollCosmeticReward(userId);

    await this.db
      .update(focusSessions)
      .set({
        status: 'completed',
        completedAt: now,
        rewardXp: xpAwarded,
        rewardGold: goldAwarded,
        streakCountAfter: streakResult.streakCount,
        cosmeticRewardId: cosmeticReward?.id ?? null,
      })
      .where(eq(focusSessions.id, session.id));

    return {
      sessionId: session.id,
      xpAwarded,
      goldAwarded,
      leveledUp,
      newLevel: level,
      currentXp,
      xpForNextLevel,
      streakCount: streakResult.streakCount,
      cosmeticReward: cosmeticReward ? this.mapCosmetic(cosmeticReward) : null,
      worldUpgrades: worldProgress.upgrades,
    };
  }

  private async ensureSeededCosmetics() {
    if (!this.seedPromise) {
      this.seedPromise = this.seedCosmetics();
    }

    await this.seedPromise;
  }

  private async seedCosmetics() {
    for (const item of COSMETIC_SEED) {
      await this.db
        .insert(cosmeticItems)
        .values(item)
        .onConflictDoNothing({ target: cosmeticItems.slug });
    }
  }

  private nextXpThreshold(level: number) {
    return Math.max(100, level * 100);
  }

  private calculateStreak(world: typeof worldStates.$inferSelect, now: Date) {
    const previous = world.lastSessionDate
      ? new Date(world.lastSessionDate)
      : null;

    const normalizedNow = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );

    const streakBase = previous
      ? this.daysBetween(previous, normalizedNow)
      : null;

    let streakCount = 1;

    if (streakBase === 0) {
      streakCount = world.streakCount || 1;
    } else if (streakBase === 1) {
      streakCount = (world.streakCount || 0) + 1;
    } else {
      streakCount = 1;
    }

    const longestStreak = Math.max(world.longestStreak ?? 0, streakCount);

    return {
      streakCount,
      longestStreak,
      successfulSessions: world.successfulSessions + 1,
    };
  }

  private daysBetween(previous: Date, now: Date) {
    const normalizedPrevious = new Date(
      previous.getFullYear(),
      previous.getMonth(),
      previous.getDate(),
    );

    const diff =
      (now.getTime() - normalizedPrevious.getTime()) / (1000 * 60 * 60 * 24);

    return Math.floor(diff);
  }

  private calculateWorldUpgrades(
    world: typeof worldStates.$inferSelect,
    successfulSessions: number,
  ) {
    let studyRoomLevel = world.studyRoomLevel;
    let buildRoomLevel = world.buildRoomLevel;
    let plazaLevel = world.plazaLevel;
    const upgrades: RewardSummary['worldUpgrades'] = [];

    if (successfulSessions >= 5 && studyRoomLevel < 2) {
      studyRoomLevel = 2;
      upgrades.push({ room: 'study', newLevel: studyRoomLevel });
    }

    if (successfulSessions >= 15 && buildRoomLevel < 2) {
      buildRoomLevel = 2;
      upgrades.push({ room: 'build', newLevel: buildRoomLevel });
    }

    if (successfulSessions >= 30 && plazaLevel < 2) {
      plazaLevel = 2;
      upgrades.push({ room: 'plaza', newLevel: plazaLevel });
    }

    return {
      studyRoomLevel,
      buildRoomLevel,
      plazaLevel,
      upgrades,
    };
  }

  private async rollCosmeticReward(userId: string) {
    const dropRoll = Math.random();

    if (dropRoll > 0.1) {
      return null;
    }

    const allCosmetics = await this.db.select().from(cosmeticItems);

    if (allCosmetics.length === 0) {
      return null;
    }

    const owned = await this.db
      .select({ cosmeticItemId: inventoryItems.cosmeticItemId })
      .from(inventoryItems)
      .where(eq(inventoryItems.userId, userId));

    const ownedIds = new Set(owned.map((item) => item.cosmeticItemId));

    const available = allCosmetics.filter((item) => !ownedIds.has(item.id));

    if (available.length === 0) {
      return null;
    }

    const rewardItem = this.pickRandomCosmetic(available);

    await this.db
      .insert(inventoryItems)
      .values({
        userId,
        cosmeticItemId: rewardItem.id,
      })
      .onConflictDoNothing({
        target: [inventoryItems.userId, inventoryItems.cosmeticItemId],
      });

    return rewardItem;
  }

  private pickRandomCosmetic(
    cosmetics: Array<typeof cosmeticItems.$inferSelect>,
  ) {
    const weights = cosmetics.map((item) => this.rarityWeight(item.rarity));
    const total = weights.reduce((sum, weight) => sum + weight, 0);
    const roll = Math.random() * total;
    let cumulative = 0;

    for (let index = 0; index < cosmetics.length; index += 1) {
      cumulative += weights[index];
      if (roll <= cumulative) {
        return cosmetics[index];
      }
    }

    return cosmetics[cosmetics.length - 1];
  }

  private rarityWeight(rarity: (typeof cosmeticItems.$inferSelect)['rarity']) {
    switch (rarity) {
      case 'epic':
        return 1;
      case 'rare':
        return 2;
      default:
        return 4;
    }
  }

  private mapCosmetic(
    cosmetic: typeof cosmeticItems.$inferSelect,
  ): CosmeticItemType {
    return {
      id: cosmetic.id,
      slug: cosmetic.slug,
      name: cosmetic.name,
      description: cosmetic.description,
      type: cosmetic.type,
      rarity: cosmetic.rarity,
      spriteKey: cosmetic.spriteKey,
      previewUrl: cosmetic.previewUrl,
    };
  }
}
