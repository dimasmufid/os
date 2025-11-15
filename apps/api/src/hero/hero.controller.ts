import { Body, Controller, Get, Headers, Patch, Post } from '@nestjs/common'

import { CreateHeroDto } from './dto/create-hero.dto'
import { UpdateHeroEquipmentDto } from './dto/update-hero.dto'
import { HeroService } from './hero.service'

@Controller('profile')
export class HeroController {
  constructor(private readonly heroService: HeroService) {}

  @Get()
  getProfile(@Headers('x-user-id') userId: string) {
    return this.heroService.getProfile(userId)
  }

  @Post('bootstrap')
  bootstrapProfile(
    @Headers('x-user-id') userId: string,
    @Body() payload: CreateHeroDto,
  ) {
    return this.heroService.bootstrapHero(userId, payload)
  }

  @Patch('equipment')
  updateEquipment(
    @Headers('x-user-id') userId: string,
    @Body() payload: UpdateHeroEquipmentDto,
  ) {
    return this.heroService.updateEquipment(userId, payload)
  }
}
