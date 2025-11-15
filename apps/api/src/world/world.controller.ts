import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';

import { CurrentUser } from '../auth/current-user.decorator';
import {
  SessionUserGuard,
  type RequestUser,
} from '../auth/guards/session-user.guard';
import { UpgradeWorldDto } from './dto/upgrade-world.dto';
import { WorldService } from './world.service';

@Controller('world')
@UseGuards(SessionUserGuard)
export class WorldController {
  constructor(private readonly worldService: WorldService) {}

  @Get()
  getState(@CurrentUser() user: RequestUser) {
    return this.worldService.getState(user.id);
  }

  @Post('upgrade')
  upgrade(@CurrentUser() user: RequestUser, @Body() dto: UpgradeWorldDto) {
    return this.worldService.recordUpgrade(user.id, dto.room);
  }
}
