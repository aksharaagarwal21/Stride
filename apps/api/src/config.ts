import { config as loadEnv } from 'dotenv';
import { z } from 'zod';

// Load apps/api/.env in development. Real environment variables always win.
loadEnv({ quiet: true });

const booleanString = z
  .enum(['true', 'false', '1', '0'])
  .transform((value) => value === 'true' || value === '1');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65_535).default(4000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required.'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters.'),
  JWT_ISSUER: z.string().min(1).default('stride-api'),
  JWT_AUDIENCE: z.string().min(1).default('stride-clients'),
  SESSION_TTL_HOURS: z.coerce.number().positive().max(720).default(12),
  BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),
  CORS_ORIGINS: z
    .string()
    .default('')
    .transform((value) =>
      value
        .split(',')
        .map((origin) => origin.trim().replace(/\/+$/, ''))
        .filter(Boolean),
    ),
  TRUST_PROXY: z.coerce.number().int().min(0).max(10).default(0),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(10),
  AUTH_RATE_LIMIT_WINDOW_MINUTES: z.coerce.number().positive().default(15),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  SERVE_WEB: booleanString.optional(),
  WEB_DIST_DIR: z.string().optional(),
  COOKIE_SECURE: booleanString.optional(),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  // Fail fast with the variable names only; never echo values, which may be secrets.
  const problems = parsed.error.issues.map(
    (issue) => `  - ${issue.path.join('.')}: ${issue.message}`,
  );
  console.error(`Invalid environment configuration:\n${problems.join('\n')}`);
  process.exit(1);
}

const env = parsed.data;
const isProduction = env.NODE_ENV === 'production';

export const config = {
  ...env,
  isProduction,
  isTest: env.NODE_ENV === 'test',
  sessionTtlMs: env.SESSION_TTL_HOURS * 60 * 60 * 1000,
  serveWeb: env.SERVE_WEB ?? isProduction,
  cookieSecure: env.COOKIE_SECURE ?? isProduction,
};

export type AppConfig = typeof config;
