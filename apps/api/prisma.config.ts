import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

// Prisma 7 reads connection settings here rather than from schema.prisma.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    // Migrations need a direct connection. Hosted Postgres often gives the app a pooled
    // (PgBouncer) URL, so DIRECT_DATABASE_URL, when set, is used for the Prisma CLI only.
    url: process.env.DIRECT_DATABASE_URL ?? env('DATABASE_URL'),
  },
});
