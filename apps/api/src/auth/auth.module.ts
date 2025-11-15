import { Module } from '@nestjs/common';
import { AuthModule as BetterAuthModule } from '@thallesp/nestjs-better-auth';

import { EmailModule } from '../email/email.module';
import { AuthController } from './auth.controller';
import { createBetterAuthInstance } from './better-auth.factory';
import { AuthService } from './auth.service';
import { EmailService } from '../email/email.service';

@Module({
  imports: [
    EmailModule,
    BetterAuthModule.forRootAsync({
      imports: [EmailModule],
      inject: [EmailService],
      useFactory: async (emailService: EmailService) => ({
        auth: createBetterAuthInstance(emailService),
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
