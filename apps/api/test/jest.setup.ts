process.env.BETTER_AUTH_SECRET ??= 'test-secret';
process.env.BETTER_AUTH_URL ??= 'http://localhost:3000';
process.env.RESEND_API_KEY ??= 'test-resend-key';
process.env.RESEND_FROM_EMAIL ??= 'OS <test@example.com>';
process.env.GOOGLE_CLIENT_ID ??= 'google-client';
process.env.GOOGLE_CLIENT_SECRET ??= 'google-secret';
process.env.DATABASE_URL ??=
  'postgresql://user:password@localhost:5432/os_test';

jest.mock('@thallesp/nestjs-better-auth', () => {
  const decorator = () => () => undefined;

  class MockAuthModule {
    static forRoot() {
      return MockAuthModule;
    }

    static forRootAsync() {
      return MockAuthModule;
    }
  }

  class MockAuthService {
    api = {};
    instance = { api: this.api };
  }

  return {
    AllowAnonymous: decorator,
    OptionalAuth: decorator,
    Roles: () => decorator,
    Session: decorator,
    AuthModule: MockAuthModule,
    AuthService: MockAuthService,
  };
});
