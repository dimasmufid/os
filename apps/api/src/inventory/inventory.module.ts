import { Module } from '@nestjs/common';

import { HeroModule } from '../hero/hero.module';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';

@Module({
  imports: [HeroModule],
  controllers: [InventoryController],
  providers: [InventoryService],
})
export class InventoryModule {}
