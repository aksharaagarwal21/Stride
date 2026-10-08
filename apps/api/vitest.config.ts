import { config as loadEnv } from 'dotenv';
import { defineConfig } from 'vitest/config';

loadEnv({ quiet: true });

const testDatabaseUrl =
  process.env.TEST_DATABASE_URL ?? 'postgresql://stride:stride@localhost:5432/stride_test';

export default defineConfig({
  test: {
    environment: 'node',
    globalSetup: ['./test/global-setup.ts'],
    // Test files share one database, so they run one after another.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: testDatabaseUrl,
      TEST_DATABASE_URL: testDatabaseUrl,
      JWT_SECRET: 'integration-test-secret-that-is-long-enough-0123456789',
      JWT_ISSUER: 'stride-api',
      JWT_AUDIENCE: 'stride-clients',
      BCRYPT_ROUNDS: '10',
      AUTH_RATE_LIMIT_MAX: '1000',
      CORS_ORIGINS: 'http://localhost:5173',
      SERVE_WEB: 'false',
    },
  },
});
