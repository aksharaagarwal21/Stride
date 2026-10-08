import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/prisma/client';
import { config } from './config';

// Prisma 7 talks to PostgreSQL through the `pg` driver adapter. All queries below use Prisma's
// query builder (parameterised), never string-built SQL.
const adapter = new PrismaPg({ connectionString: config.DATABASE_URL });

export const prisma = new PrismaClient({ adapter });
