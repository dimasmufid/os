import { Module } from '@nestjs/common';

import { HeroModule } from '../hero/hero.module';
import { WorldService } from './world.service';
import { WorldController } from './world.controller';

@Module({
  imports: [HeroModule],
  controllers: [WorldController],
  providers: [WorldService],
})
export class WorldModule {}
