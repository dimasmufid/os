import { Module } from '@nestjs/common';

import { HeroModule } from '../hero/hero.module';
import { TaskService } from './task.service';
import { TaskController } from './task.controller';

@Module({
  imports: [HeroModule],
  controllers: [TaskController],
  providers: [TaskService],
})
export class TaskModule {}
