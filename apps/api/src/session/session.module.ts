import { Module } from '@nestjs/common';

import { HeroModule } from '../hero/hero.module';
import { RewardModule } from '../reward/reward.module';
import { SessionService } from './session.service';
import { SessionController } from './session.controller';

@Module({
  imports: [HeroModule, RewardModule],
  controllers: [SessionController],
  providers: [SessionService],
})
export class SessionModule {}
