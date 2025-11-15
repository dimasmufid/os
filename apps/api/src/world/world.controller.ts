import { Controller, Get, Headers } from '@nestjs/common'

import { WorldService } from './world.service'

@Controller('world')
export class WorldController {
  constructor(private readonly worldService: WorldService) {}

  @Get()
  getWorld(@Headers('x-user-id') userId: string) {
    return this.worldService.getState(userId)
  }
}
