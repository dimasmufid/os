import { Test, TestingModule } from '@nestjs/testing';

import { DRIZZLE_CLIENT } from '../database/database.constants';
import { HeroService } from '../hero/hero.service';
import { RewardService } from '../reward/reward.service';
import { SessionService } from './session.service';

describe('SessionService', () => {
  let service: SessionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionService,
        {
          provide: HeroService,
          useValue: { getOrCreateHero: jest.fn() },
        },
        {
          provide: RewardService,
          useValue: { applySessionRewards: jest.fn() },
        },
        {
          provide: DRIZZLE_CLIENT,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<SessionService>(SessionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
