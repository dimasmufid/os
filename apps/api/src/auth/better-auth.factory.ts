import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { createDb } from '@os/db';

import {
  BETTER_AUTH_BASE_PATH,
  env,
  googleRedirectUri,
  trustedOrigins,
} from '../config/env';
import { EmailService } from '../email/email.service';

export const createBetterAuthInstance = (emailService: EmailService) => {
  const db = createDb();

  return betterAuth({
    secret: env.betterAuthSecret,
    baseURL: env.betterAuthUrl,
    basePath: BETTER_AUTH_BASE_PATH,
    trustedOrigins,
    database: drizzleAdapter(db, {
      provider: 'pg',
      usePlural: true,
    }),
    emailVerification: {
      sendOnSignUp: true,
      sendOnSignIn: true,
      autoSignInAfterVerification: true,
      sendVerificationEmail: async (payload) => {
        await emailService.sendVerificationEmail(payload);
      },
    },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      sendResetPassword: async (payload) => {
        await emailService.sendResetPasswordEmail(payload);
      },
    },
    socialProviders: {
      google: {
        clientId: env.googleClientId,
        clientSecret: env.googleClientSecret,
        redirectURI: googleRedirectUri,
        scope: ['openid', 'profile', 'email'],
      },
    },
  });
};
