import { Inject, Injectable } from '@nestjs/common';
import { type Database, worldStates } from '@os/db';
import type { WorldProgress, WorldState } from '@os/types';
import { eq } from 'drizzle-orm';

import { DATABASE_TOKEN } from '../database/database.constants';
import { HeroService } from '../hero/hero.service';

const UPGRADE_THRESHOLDS = [
  { room: 'study', level: 2, required: 5 },
  { room: 'build', level: 2, required: 15 },
  { room: 'plaza', level: 2, required: 30 },
] as const;

type UpgradeConfig = (typeof UPGRADE_THRESHOLDS)[number];

@Injectable()
export class WorldService {
  constructor(
    @Inject(DATABASE_TOKEN) private readonly db: Database,
    private readonly heroService: HeroService,
  ) {}

  async getState(
    userId: string,
  ): Promise<{ world: WorldState; progress: WorldProgress }> {
    const world = await this.heroService.ensureWorldState(userId);
    const progress = this.computeUpgradeProgress(world);

    return {
      world: this.mapWorld(world),
      progress,
    };
  }

  async recordUpgrade(userId: string, room: UpgradeConfig['room']) {
    const world = await this.heroService.ensureWorldState(userId);
    const updates: Partial<typeof worldStates.$inferInsert> = {};

    if (room === 'study') {
      updates.studyRoomLevel = Math.min(world.studyRoomLevel + 1, 3);
    } else if (room === 'build') {
      updates.buildRoomLevel = Math.min(world.buildRoomLevel + 1, 3);
    } else if (room === 'plaza') {
      updates.plazaLevel = Math.min(world.plazaLevel + 1, 3);
    }

    if (Object.keys(updates).length === 0) {
      return this.mapWorld(world);
    }

    await this.db
      .update(worldStates)
      .set(updates)
      .where(eq(worldStates.userId, userId));

    const next = await this.heroService.ensureWorldState(userId);

    return this.mapWorld(next);
  }

  private computeUpgradeProgress(
    world: typeof worldStates.$inferSelect,
  ): WorldProgress {
    const upcoming = UPGRADE_THRESHOLDS.find((threshold) => {
      const currentLevel = this.getRoomLevel(world, threshold.room);
      return currentLevel < threshold.level;
    });

    if (!upcoming) {
      return {
        nextUpgrade: null,
        completed: UPGRADE_THRESHOLDS.map((item) => ({
          room: item.room,
          required: item.required,
        })),
      };
    }

    const remaining = Math.max(0, upcoming.required - world.successfulSessions);

    return {
      nextUpgrade: {
        room: upcoming.room,
        required: upcoming.required,
        remaining,
      },
      completed: UPGRADE_THRESHOLDS.filter(
        (item) => item.required <= world.successfulSessions,
      ).map((item) => ({ room: item.room, required: item.required })),
    };
  }

  private mapWorld(world: typeof worldStates.$inferSelect): WorldState {
    return {
      id: world.id,
      userId: world.userId,
      totalSessions: world.totalSessions,
      successfulSessions: world.successfulSessions,
      studyRoomLevel: world.studyRoomLevel,
      buildRoomLevel: world.buildRoomLevel,
      trainingRoomLevel: world.trainingRoomLevel,
      plazaLevel: world.plazaLevel,
      streakCount: world.streakCount,
      longestStreak: world.longestStreak,
      lastSessionDate: world.lastSessionDate?.toISOString(),
    };
  }

  private getRoomLevel(
    world: typeof worldStates.$inferSelect,
    room: UpgradeConfig['room'],
  ) {
    if (room === 'study') {
      return world.studyRoomLevel;
    }

    if (room === 'build') {
      return world.buildRoomLevel;
    }

    return world.plazaLevel;
  }
}
