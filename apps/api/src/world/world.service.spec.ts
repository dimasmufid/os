import { Test, TestingModule } from '@nestjs/testing';

import { DRIZZLE_CLIENT } from '../database/database.constants';
import { HeroService } from '../hero/hero.service';
import { WorldService } from './world.service';

describe('WorldService', () => {
  let service: WorldService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorldService,
        {
          provide: HeroService,
          useValue: { getOrCreateHero: jest.fn() },
        },
        {
          provide: DRIZZLE_CLIENT,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<WorldService>(WorldService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
