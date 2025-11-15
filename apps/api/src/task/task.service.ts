import { Inject, Injectable, NotFoundException } from '@nestjs/common'
import { and, dbSchema, eq } from '@os/db'
import type { Database } from '@os/db'

import { DRIZZLE_CLIENT } from '../database/database.constants'
import { HeroService } from '../hero/hero.service'
import { CreateTaskDto, UpdateTaskDto } from './dto/create-task.dto'

const { taskTemplates } = dbSchema

@Injectable()
export class TaskService {
  constructor(
    @Inject(DRIZZLE_CLIENT) private readonly db: Database,
    private readonly heroService: HeroService,
  ) {}

  async list(userId: string) {
    const hero = await this.heroService.getOrCreateHero(userId)
    const tasks = await this.db.query.taskTemplates.findMany({
      where: eq(taskTemplates.heroId, hero.id),
      orderBy: (task, { asc }) => [asc(task.createdAt)],
    })

    return tasks.map((task) => this.mapTask(task))
  }

  async create(userId: string, payload: CreateTaskDto) {
    const hero = await this.heroService.getOrCreateHero(userId)
    const [created] = await this.db
      .insert(taskTemplates)
      .values({
        heroId: hero.id,
        name: payload.name,
        category: payload.category,
        defaultDuration: payload.defaultDuration,
        preferredRoom: payload.preferredRoom,
      })
      .returning()

    return this.mapTask(created)
  }

  async update(userId: string, taskId: string, payload: UpdateTaskDto) {
    const hero = await this.heroService.getOrCreateHero(userId)
    const [updated] = await this.db
      .update(taskTemplates)
      .set({
        name: payload.name,
        category: payload.category,
        defaultDuration: payload.defaultDuration,
        preferredRoom: payload.preferredRoom,
      })
      .where(and(eq(taskTemplates.heroId, hero.id), eq(taskTemplates.id, taskId)))
      .returning()

    if (!updated) {
      throw new NotFoundException('Task not found')
    }

    return this.mapTask(updated)
  }

  async remove(userId: string, taskId: string) {
    const hero = await this.heroService.getOrCreateHero(userId)
    const deleted = await this.db
      .delete(taskTemplates)
      .where(and(eq(taskTemplates.heroId, hero.id), eq(taskTemplates.id, taskId)))
      .returning({ id: taskTemplates.id })

    if (deleted.length === 0) {
      throw new NotFoundException('Task not found')
    }

    return { id: deleted[0].id }
  }

  private mapTask(task: typeof taskTemplates.$inferSelect) {
    return {
      id: task.id,
      heroId: task.heroId,
      name: task.name,
      category: task.category,
      defaultDuration: task.defaultDuration,
      preferredRoom: task.preferredRoom,
    }
  }
}
