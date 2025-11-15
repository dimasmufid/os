import { Body, Controller, Get, Headers, Post } from '@nestjs/common'

import { EquipInventoryDto } from './dto/create-inventory.dto'
import { InventoryService } from './inventory.service'

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  list(@Headers('x-user-id') userId: string) {
    return this.inventoryService.list(userId)
  }

  @Post('equip')
  equip(@Headers('x-user-id') userId: string, @Body() payload: EquipInventoryDto) {
    return this.inventoryService.equip(userId, payload)
  }
}
