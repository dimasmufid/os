import { Test, TestingModule } from '@nestjs/testing';

import { DRIZZLE_CLIENT } from '../database/database.constants';
import { HeroService } from '../hero/hero.service';
import { TaskService } from './task.service';

describe('TaskService', () => {
  let service: TaskService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskService,
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

    service = module.get<TaskService>(TaskService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
