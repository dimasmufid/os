import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  type Database,
  focusSessions,
  taskTemplates,
  worldStates,
} from '@os/db';
import type {
  FocusSession,
  RewardSummary,
  SessionHistoryItem,
} from '@os/types';
import { desc, eq } from 'drizzle-orm';

import { DATABASE_TOKEN } from '../database/database.constants';
import { HeroService } from '../hero/hero.service';
import { RewardService } from '../reward/reward.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';

const ACTIVE_STATUS: FocusSession['status'] = 'in_progress';

@Injectable()
export class SessionService {
  constructor(
    @Inject(DATABASE_TOKEN) private readonly db: Database,
    private readonly heroService: HeroService,
    private readonly rewardService: RewardService,
  ) {}

  async start(userId: string, dto: CreateSessionDto): Promise<FocusSession> {
    await this.ensureNoActiveSession(userId);
    await this.heroService.ensureHeroProfile(userId);
    await this.heroService.ensureWorldState(userId);

    if (dto.taskId) {
      await this.ensureTaskOwnership(userId, dto.taskId);
    }

    const [session] = await this.db
      .insert(focusSessions)
      .values({
        userId,
        taskId: dto.taskId ?? null,
        durationMinutes: dto.durationMinutes,
        status: ACTIVE_STATUS,
      })
      .returning();

    return this.mapSession(session);
  }

  async complete(
    userId: string,
    dto: UpdateSessionDto,
  ): Promise<RewardSummary> {
    const session = await this.getOwnedSession(userId, dto.sessionId);

    if (session.status !== ACTIVE_STATUS) {
      throw new BadRequestException('Session is not in progress');
    }

    return this.rewardService.applySessionCompletion(userId, session);
  }

  async cancel(userId: string, dto: UpdateSessionDto) {
    const session = await this.getOwnedSession(userId, dto.sessionId);

    if (session.status !== ACTIVE_STATUS) {
      throw new BadRequestException('Only active sessions can be cancelled');
    }

    const now = new Date();

    await this.db
      .update(focusSessions)
      .set({
        status: 'cancelled',
        cancelledAt: now,
      })
      .where(eq(focusSessions.id, session.id));

    const world = await this.heroService.ensureWorldState(userId);

    await this.db
      .update(worldStates)
      .set({
        totalSessions: world.totalSessions + 1,
        updatedAt: now,
      })
      .where(eq(worldStates.userId, userId));

    return this.mapSession({
      ...session,
      status: 'cancelled',
      cancelledAt: now,
    });
  }

  async history(userId: string): Promise<SessionHistoryItem[]> {
    const rows = await this.db
      .select({
        session: focusSessions,
        taskName: taskTemplates.name,
        room: taskTemplates.room,
      })
      .from(focusSessions)
      .leftJoin(taskTemplates, eq(focusSessions.taskId, taskTemplates.id))
      .where(eq(focusSessions.userId, userId))
      .orderBy(desc(focusSessions.startedAt))
      .limit(50);

    return rows.map((row) => ({
      ...this.mapSession(row.session),
      taskName: row.taskName ?? null,
      room: row.room ?? undefined,
    }));
  }

  private async ensureNoActiveSession(userId: string) {
    const [active] = await this.db
      .select()
      .from(focusSessions)
      .where(eq(focusSessions.userId, userId))
      .orderBy(desc(focusSessions.startedAt))
      .limit(1);

    if (active && active.status === ACTIVE_STATUS) {
      throw new BadRequestException(
        'You already have an active focus session in progress.',
      );
    }
  }

  private async ensureTaskOwnership(userId: string, taskId: string) {
    const task = await this.db.query.taskTemplates.findFirst({
      where: eq(taskTemplates.id, taskId),
    });

    if (!task || task.userId !== userId) {
      throw new BadRequestException('Task does not belong to the current user');
    }
  }

  private async getOwnedSession(userId: string, id: string) {
    const session = await this.db.query.focusSessions.findFirst({
      where: eq(focusSessions.id, id),
    });

    if (!session || session.userId !== userId) {
      throw new NotFoundException('Session not found');
    }

    return session;
  }

  private mapSession(session: typeof focusSessions.$inferSelect): FocusSession {
    return {
      id: session.id,
      taskId: session.taskId ?? undefined,
      durationMinutes: session.durationMinutes,
      status: session.status,
      startedAt: session.startedAt?.toISOString() ?? new Date().toISOString(),
      completedAt: session.completedAt?.toISOString(),
      cancelledAt: session.cancelledAt?.toISOString(),
      rewardXp: session.rewardXp,
      rewardGold: session.rewardGold,
      streakCountAfter: session.streakCountAfter ?? undefined,
      cosmeticRewardId: session.cosmeticRewardId ?? undefined,
    };
  }
}
