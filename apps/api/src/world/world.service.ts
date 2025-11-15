import { Inject, Injectable } from '@nestjs/common'
import { dbSchema, eq } from '@os/db'
import type { Database } from '@os/db'

import { DRIZZLE_CLIENT } from '../database/database.constants'
import { HeroService } from '../hero/hero.service'

const { worldStates } = dbSchema

@Injectable()
export class WorldService {
  constructor(
    @Inject(DRIZZLE_CLIENT) private readonly db: Database,
    private readonly heroService: HeroService,
  ) {}

  async getState(userId: string) {
    const hero = await this.heroService.getOrCreateHero(userId)
    const world = await this.db.query.worldStates.findFirst({
      where: eq(worldStates.heroId, hero.id),
    })

    if (!world) {
      return {
        heroId: hero.id,
        studyRoomLevel: 1,
        buildRoomLevel: 1,
        trainingRoomLevel: 1,
        plazaLevel: 1,
        totalSuccessfulSessions: 0,
        lastUpgradeAt: null,
        layers: this.deriveLayers({
          studyRoomLevel: 1,
          buildRoomLevel: 1,
          trainingRoomLevel: 1,
          plazaLevel: 1,
        }),
      }
    }

    return {
      heroId: world.heroId,
      studyRoomLevel: world.studyRoomLevel,
      buildRoomLevel: world.buildRoomLevel,
      trainingRoomLevel: world.trainingRoomLevel,
      plazaLevel: world.plazaLevel,
      totalSuccessfulSessions: world.totalSuccessfulSessions,
      lastUpgradeAt: world.lastUpgradeAt?.toISOString() ?? null,
      layers: this.deriveLayers(world),
    }
  }

  private deriveLayers(world: Pick<typeof worldStates.$inferSelect, 'studyRoomLevel' | 'buildRoomLevel' | 'trainingRoomLevel' | 'plazaLevel'>) {
    return {
      study: {
        level: world.studyRoomLevel,
        decorativeLayer: world.studyRoomLevel > 1,
      },
      build: {
        level: world.buildRoomLevel,
        decorativeLayer: world.buildRoomLevel > 1,
      },
      training: {
        level: world.trainingRoomLevel,
        decorativeLayer: world.trainingRoomLevel > 1,
      },
      plaza: {
        level: world.plazaLevel,
        decorativeLayer: world.plazaLevel > 1,
      },
    }
  }
}
