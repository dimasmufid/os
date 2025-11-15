import { Module } from '@nestjs/common';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { EmailModule } from './email/email.module';
import { HeroModule } from './hero/hero.module';
import { SessionModule } from './session/session.module';
import { WorldModule } from './world/world.module';
import { TasksModule } from './tasks/tasks.module';
import { InventoryModule } from './inventory/inventory.module';
import { RewardModule } from './reward/reward.module';

@Module({
  imports: [EmailModule, AuthModule, HeroModule, SessionModule, WorldModule, TasksModule, InventoryModule, RewardModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
