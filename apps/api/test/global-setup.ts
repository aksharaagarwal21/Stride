import { execSync } from 'node:child_process';

/** Applies migrations to the disposable test database before any test file runs. */
export default function setup() {
  const url =
    process.env.TEST_DATABASE_URL ?? 'postgresql://stride:stride@localhost:5432/stride_test';
  const databaseName = new URL(url).pathname.replace(/^\//, '');

  // Tests truncate every table, so refuse anything that is not clearly a test database.
  if (!databaseName.endsWith('_test')) {
    throw new Error(
      `Refusing to run tests against "${databaseName}": the name must end in "_test".`,
    );
  }

  execSync('pnpm exec prisma migrate deploy', {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: url },
  });
}
