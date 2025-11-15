import { Injectable } from '@nestjs/common';
import { AuthService as BetterAuthService } from '@thallesp/nestjs-better-auth';

@Injectable()
export class AuthService {
  constructor(private readonly betterAuth: BetterAuthService) {}

  get instance() {
    return this.betterAuth.instance;
  }

  get api() {
    return this.betterAuth.api;
  }

  healthcheck() {
    return {
      status: 'ok',
    };
  }
}
