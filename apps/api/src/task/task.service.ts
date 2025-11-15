import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { type Database, taskTemplates } from '@os/db';
import type { TaskTemplate } from '@os/types';
import { eq } from 'drizzle-orm';

import { DATABASE_TOKEN } from '../database/database.constants';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@Injectable()
export class TaskService {
  constructor(@Inject(DATABASE_TOKEN) private readonly db: Database) {}

  async create(userId: string, dto: CreateTaskDto): Promise<TaskTemplate> {
    const [created] = await this.db
      .insert(taskTemplates)
      .values({
        userId,
        name: dto.name.trim(),
        category: dto.category.trim(),
        room: dto.room,
        defaultDurationMinutes: dto.defaultDurationMinutes,
      })
      .returning();

    return this.mapTask(created);
  }

  async findAll(userId: string): Promise<TaskTemplate[]> {
    const rows = await this.db
      .select()
      .from(taskTemplates)
      .where(eq(taskTemplates.userId, userId));

    return rows.map((row) => this.mapTask(row));
  }

  async findOne(userId: string, id: string): Promise<TaskTemplate> {
    const task = await this.db.query.taskTemplates.findFirst({
      where: eq(taskTemplates.id, id),
    });

    if (!task || task.userId !== userId) {
      throw new NotFoundException('Task not found');
    }

    return this.mapTask(task);
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateTaskDto,
  ): Promise<TaskTemplate> {
    await this.ensureOwnership(userId, id);

    const updates: Partial<typeof taskTemplates.$inferInsert> = {};

    if (dto.name !== undefined) {
      updates.name = dto.name.trim();
    }

    if (dto.category !== undefined) {
      updates.category = dto.category.trim();
    }

    if (dto.room !== undefined) {
      updates.room = dto.room;
    }

    if (dto.defaultDurationMinutes !== undefined) {
      updates.defaultDurationMinutes = dto.defaultDurationMinutes;
    }

    if (Object.keys(updates).length > 0) {
      await this.db
        .update(taskTemplates)
        .set(updates)
        .where(eq(taskTemplates.id, id));
    }

    return this.findOne(userId, id);
  }

  async remove(userId: string, id: string) {
    await this.ensureOwnership(userId, id);

    await this.db.delete(taskTemplates).where(eq(taskTemplates.id, id));

    return { id };
  }

  private async ensureOwnership(userId: string, id: string) {
    const task = await this.db.query.taskTemplates.findFirst({
      where: eq(taskTemplates.id, id),
    });

    if (!task || task.userId !== userId) {
      throw new NotFoundException('Task not found');
    }
  }

  private mapTask(row: typeof taskTemplates.$inferSelect): TaskTemplate {
    return {
      id: row.id,
      name: row.name,
      category: row.category,
      room: row.room,
      defaultDurationMinutes: row.defaultDurationMinutes,
      isArchived: row.isArchived,
    };
  }
}
