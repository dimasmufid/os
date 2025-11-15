import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';

import { CurrentUser } from '../auth/current-user.decorator';
import {
  SessionUserGuard,
  type RequestUser,
} from '../auth/guards/session-user.guard';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';
import { SessionService } from './session.service';

@Controller('sessions')
@UseGuards(SessionUserGuard)
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  @Post('start')
  start(@CurrentUser() user: RequestUser, @Body() dto: CreateSessionDto) {
    return this.sessionService.start(user.id, dto);
  }

  @Post('complete')
  complete(@CurrentUser() user: RequestUser, @Body() dto: UpdateSessionDto) {
    return this.sessionService.complete(user.id, dto);
  }

  @Post('cancel')
  cancel(@CurrentUser() user: RequestUser, @Body() dto: UpdateSessionDto) {
    return this.sessionService.cancel(user.id, dto);
  }

  @Get('history')
  history(@CurrentUser() user: RequestUser) {
    return this.sessionService.history(user.id);
  }
}
