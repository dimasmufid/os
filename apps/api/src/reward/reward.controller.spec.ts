import { BadRequestException } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'

import { RewardController } from './reward.controller'
import { RewardService } from './reward.service'

describe('RewardController', () => {
  let controller: RewardController
  const calculateBaseRewards = jest.fn().mockReturnValue({ xp: 50, gold: 25 })

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RewardController],
      providers: [
        {
          provide: RewardService,
          useValue: {
            calculateBaseRewards,
          },
        },
      ],
    }).compile()

    controller = module.get<RewardController>(RewardController)
    calculateBaseRewards.mockClear()
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })

  it('returns preview values for allowed durations', () => {
    const result = controller.preview(25)

    expect(calculateBaseRewards).toHaveBeenCalledWith(25)
    expect(result).toEqual({ durationMinutes: 25, xp: 50, gold: 25 })
  })

  it('throws for unsupported durations', () => {
    expect(() => controller.preview(10)).toThrow(BadRequestException)
  })
})
