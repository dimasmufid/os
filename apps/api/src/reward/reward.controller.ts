import { BadRequestException, Controller, Get, Param, ParseIntPipe } from '@nestjs/common'

import { RewardService } from './reward.service'

const ALLOWED_DURATIONS: Array<25 | 50 | 90> = [25, 50, 90]

@Controller('reward')
export class RewardController {
  constructor(private readonly rewardService: RewardService) {}

  @Get('preview/:duration')
  preview(@Param('duration', ParseIntPipe) duration: number) {
    if (!ALLOWED_DURATIONS.includes(duration as 25 | 50 | 90)) {
      throw new BadRequestException('Duration must be one of 25, 50, or 90 minutes')
    }

    const reward = this.rewardService.calculateBaseRewards(duration)

    return {
      durationMinutes: duration,
      xp: reward.xp,
      gold: reward.gold,
    }
  }
}
