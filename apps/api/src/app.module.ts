import { Module } from '@nestjs/common';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { EmailModule } from './email/email.module';
import { HeroModule } from './hero/hero.module';
import { SessionModule } from './session/session.module';
import { WorldModule } from './world/world.module';
import { InventoryModule } from './inventory/inventory.module';
import { RewardModule } from './reward/reward.module';
import { RealtimeModule } from './realtime/realtime.module';
import { StorageModule } from './storage/storage.module';
import { UserModule } from './user/user.module';
import { TaskModule } from './task/task.module';
import { ItemModule } from './item/item.module';
import { DatabaseModule } from './database/database.module';

@Module({
  imports: [
    DatabaseModule,
    EmailModule,
    AuthModule,
    HeroModule,
    SessionModule,
    WorldModule,
    InventoryModule,
    RewardModule,
    RealtimeModule,
    StorageModule,
    UserModule,
    TaskModule,
    ItemModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
