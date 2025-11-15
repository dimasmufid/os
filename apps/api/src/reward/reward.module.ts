import { Module } from '@nestjs/common';
import { HeroModule } from '../hero/hero.module';
import { RewardService } from './reward.service';
import { RewardController } from './reward.controller';

@Module({
  imports: [HeroModule],
  controllers: [RewardController],
  providers: [RewardService],
  exports: [RewardService],
})
export class RewardModule {}
