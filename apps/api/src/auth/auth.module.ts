import { Module } from '@nestjs/common';
import { AuthModule as BetterAuthModule } from '@thallesp/nestjs-better-auth';

import { EmailModule } from '../email/email.module';
import { AuthController } from './auth.controller';
import { EmailService } from '../email/email.service';
import { SessionUserGuard } from './guards/session-user.guard';
import { createBetterAuthInstance } from './better-auth.factory';
import { AuthService } from './auth.service';

@Module({
  imports: [
    EmailModule,
    BetterAuthModule.forRootAsync({
      imports: [EmailModule],
      inject: [EmailService],
      useFactory: (emailService: EmailService) => ({
        auth: createBetterAuthInstance(emailService),
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, SessionUserGuard],
  exports: [AuthService, SessionUserGuard],
})
export class AuthModule {}
