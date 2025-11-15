import {
  Inject,
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import type { Request } from 'express';
import { type Database, users } from '@os/db';
import { eq } from 'drizzle-orm';

import { DATABASE_TOKEN } from '../../database/database.constants';

export interface RequestUser {
  id: string;
  email: string;
}

export interface LifeOsRequest extends Request {
  user?: RequestUser;
}

const normalizeEmail = (userId: string) => `${userId}@lifeos.local`;

@Injectable()
export class SessionUserGuard implements CanActivate {
  constructor(@Inject(DATABASE_TOKEN) private readonly db: Database) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<LifeOsRequest>();

    const headerUserId = request.headers['x-user-id'];
    const rawUserId = Array.isArray(headerUserId)
      ? headerUserId[0]
      : headerUserId;
    const userId = (rawUserId ?? 'demo-user').toString().trim() || 'demo-user';

    const existing = await this.db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    const email = normalizeEmail(userId);

    if (!existing) {
      await this.db
        .insert(users)
        .values({
          id: userId,
          name: 'LifeOS Explorer',
          email,
        })
        .onConflictDoNothing();
    } else if (!existing.email) {
      await this.db.update(users).set({ email }).where(eq(users.id, userId));
    }

    request.user = {
      id: userId,
      email,
    };

    return true;
  }
}
