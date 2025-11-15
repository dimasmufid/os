import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';

import { CurrentUser } from '../auth/current-user.decorator';
import {
  SessionUserGuard,
  type RequestUser,
} from '../auth/guards/session-user.guard';
import { EquipCosmeticDto } from './dto/equip-cosmetic.dto';
import { InventoryService } from './inventory.service';

@Controller('inventory')
@UseGuards(SessionUserGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  list(@CurrentUser() user: RequestUser) {
    return this.inventoryService.list(user.id);
  }

  @Post('equip')
  equip(@CurrentUser() user: RequestUser, @Body() dto: EquipCosmeticDto) {
    return this.inventoryService.equip(user.id, dto);
  }
}
