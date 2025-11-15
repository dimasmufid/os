import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';

import { CurrentUser } from '../auth/current-user.decorator';
import {
  SessionUserGuard,
  type RequestUser,
} from '../auth/guards/session-user.guard';
import { UpdateHeroDto } from './dto/update-hero.dto';
import { UpdateHeroEquipmentDto } from './dto/update-hero-equipment.dto';
import { HeroService } from './hero.service';

@Controller('profile')
@UseGuards(SessionUserGuard)
export class HeroController {
  constructor(private readonly heroService: HeroService) {}

  @Get()
  getProfile(@CurrentUser() user: RequestUser) {
    return this.heroService.getProfile(user.id);
  }

  @Patch()
  updateHero(@CurrentUser() user: RequestUser, @Body() dto: UpdateHeroDto) {
    return this.heroService.updateHero(user.id, dto);
  }

  @Patch('equipment')
  updateEquipment(
    @CurrentUser() user: RequestUser,
    @Body() dto: UpdateHeroEquipmentDto,
  ) {
    return this.heroService.updateEquipment(user.id, dto);
  }
}
