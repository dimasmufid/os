import { existsSync, readFileSync } from 'node:fs';
import * as path from 'node:path';
import { parse } from 'dotenv';

const loadEnvFiles = () => {
  const envFiles = ['.env', '.env.local'];
  const searchRoots = Array.from(
    new Set([
      path.resolve(__dirname, '../../../..'),
      path.resolve(__dirname, '../..'),
      process.cwd(),
    ]),
  );

  const mergedEnv: Record<string, string> = {};

  for (const root of searchRoots) {
    for (const file of envFiles) {
      const filePath = path.resolve(root, file);
      if (!existsSync(filePath)) {
        continue;
      }

      Object.assign(mergedEnv, parse(readFileSync(filePath)));
    }
  }

  for (const [key, value] of Object.entries(mergedEnv)) {
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
};

loadEnvFiles();

const requireEnv = (key: string) => {
  const value = process.env[key];

  if (!value) {
    throw new Error(
      `[better-auth] Missing environment variable: ${key}. Update your .env file.`,
    );
  }

  return value;
};

const normalizeBaseUrl = (value: string) => {
  const url = new URL(value);

  url.hash = '';
  url.search = '';

  const pathname =
    url.pathname === '/' ? '' : url.pathname.replace(/\/$/, '');

  return `${url.origin}${pathname}`;
};

export const BETTER_AUTH_BASE_PATH = '/api/auth';

const betterAuthUrl = normalizeBaseUrl(requireEnv('BETTER_AUTH_URL'));

export const env = {
  betterAuthSecret: requireEnv('BETTER_AUTH_SECRET'),
  betterAuthUrl,
  resendApiKey: requireEnv('RESEND_API_KEY'),
  resendFromEmail: requireEnv('RESEND_FROM_EMAIL'),
  googleClientId: requireEnv('GOOGLE_CLIENT_ID'),
  googleClientSecret: requireEnv('GOOGLE_CLIENT_SECRET'),
};

export const trustedOrigins = [new URL(betterAuthUrl).origin];

export const googleRedirectUri = new URL(
  `${BETTER_AUTH_BASE_PATH}/callback/google`,
  betterAuthUrl,
).toString();
