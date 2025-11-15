import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import type { RequestUser } from './guards/session-user.guard';

export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): RequestUser => {
    const request = ctx.switchToHttp().getRequest<{ user?: RequestUser }>();

    if (!request.user) {
      throw new Error('Current user is not set on request context');
    }

    return request.user;
  },
);
