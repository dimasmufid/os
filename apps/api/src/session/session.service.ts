import { Inject, Injectable, BadRequestException, NotFoundException } from '@nestjs/common'
import { and, dbSchema, eq } from '@os/db'
import type { Database } from '@os/db'
import type { StartSessionDto } from './dto/create-session.dto'

import { DRIZZLE_CLIENT } from '../database/database.constants'
import { HeroService } from '../hero/hero.service'
import { RewardService } from '../reward/reward.service'

const { focusSessions } = dbSchema

@Injectable()
export class SessionService {
  constructor(
    @Inject(DRIZZLE_CLIENT) private readonly db: Database,
    private readonly heroService: HeroService,
    private readonly rewardService: RewardService,
  ) {}

  async start(userId: string, payload: StartSessionDto) {
    const hero = await this.heroService.getOrCreateHero(userId)
    const now = new Date()

    const [session] = await this.db
      .insert(focusSessions)
      .values({
        heroId: hero.id,
        taskId: payload.taskId ?? null,
        durationMinutes: payload.durationMinutes,
        startedAt: now,
        status: 'running',
      })
      .returning()

    return {
      sessionId: session.id,
      startedAt: session.startedAt.toISOString(),
      durationMinutes: session.durationMinutes,
    }
  }

  async complete(userId: string, sessionId: string) {
    const hero = await this.heroService.getOrCreateHero(userId)
    const session = await this.db.query.focusSessions.findFirst({
      where: and(eq(focusSessions.id, sessionId), eq(focusSessions.heroId, hero.id)),
    })

    if (!session) {
      throw new NotFoundException('Session not found')
    }

    if (session.status !== 'running') {
      throw new BadRequestException('Session already resolved')
    }

    return this.rewardService.applySessionRewards(hero.id, session.id, session.durationMinutes)
  }

  async cancel(userId: string, sessionId: string) {
    const hero = await this.heroService.getOrCreateHero(userId)
    const session = await this.db.query.focusSessions.findFirst({
      where: and(eq(focusSessions.id, sessionId), eq(focusSessions.heroId, hero.id)),
    })

    if (!session) {
      throw new NotFoundException('Session not found')
    }

    if (session.status !== 'running') {
      return { sessionId: session.id, status: session.status }
    }

    const now = new Date()

    await this.db
      .update(focusSessions)
      .set({ status: 'cancelled', completedAt: now })
      .where(eq(focusSessions.id, session.id))

    return { sessionId: session.id, status: 'cancelled' }
  }

  async history(userId: string) {
    const hero = await this.heroService.getOrCreateHero(userId)
    const sessions = await this.db.query.focusSessions.findMany({
      where: eq(focusSessions.heroId, hero.id),
      orderBy: (session, { desc }) => [desc(session.startedAt)],
      limit: 20,
      with: {
        task: true,
        droppedCosmetic: true,
      },
    })

    return sessions.map((session) => ({
      id: session.id,
      heroId: session.heroId,
      taskId: session.taskId,
      durationMinutes: session.durationMinutes,
      startedAt: session.startedAt.toISOString(),
      completedAt: session.completedAt?.toISOString() ?? null,
      status: session.status,
      rewardXp: session.rewardXp,
      rewardGold: session.rewardGold,
      droppedCosmeticId: session.droppedCosmeticId,
      task: session.task
        ? {
            id: session.task.id,
            heroId: session.task.heroId,
            name: session.task.name,
            category: session.task.category,
            defaultDuration: session.task.defaultDuration,
            preferredRoom: session.task.preferredRoom,
          }
        : null,
      droppedCosmetic: session.droppedCosmetic
        ? {
            id: session.droppedCosmetic.id,
            slug: session.droppedCosmetic.slug,
            name: session.droppedCosmetic.name,
            description: session.droppedCosmetic.description,
            type: session.droppedCosmetic.type,
            rarity: session.droppedCosmetic.rarity,
            previewUrl: session.droppedCosmetic.previewUrl,
          }
        : null,
    }))
  }
}
