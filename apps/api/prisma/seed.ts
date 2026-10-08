// Development-only seed: two synthetic demo users with varied projects and tasks.
// Dates are relative to today so "overdue" and "upcoming" always have something to show.
// It only replaces the two demo accounts below and never runs automatically.
import { config as loadEnv } from 'dotenv';
import bcrypt from 'bcryptjs';
import { PrismaPg } from '@prisma/adapter-pg';
import { addDays, dateOnlyToUtcDate, localToday } from '@stride/shared';
import { PrismaClient } from '../src/generated/prisma/client';
import type { ProjectStatus, TaskPriority, TaskStatus } from '../src/generated/prisma/client';

loadEnv({ quiet: true });

if (process.env.NODE_ENV === 'production' && process.env.ALLOW_SEED !== 'true') {
  console.error('Refusing to seed a production database. Set ALLOW_SEED=true to override.');
  process.exit(1);
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const DEMO_PASSWORD = 'StrideDemo123!';
const today = localToday();
const day = (offset: number) => dateOnlyToUtcDate(addDays(today, offset));

type TaskSeed = [name: string, status: TaskStatus, priority: TaskPriority, dueOffset: number];
type ProjectSeed = {
  name: string;
  description: string;
  status: ProjectStatus;
  start: number;
  end: number;
  tasks: TaskSeed[];
};

const demoUsers: { fullName: string; email: string; projects: ProjectSeed[] }[] = [
  {
    fullName: 'Ava Demo',
    email: 'ava.demo@stride.test',
    projects: [
      {
        name: 'Mobile banking redesign',
        description: 'Refresh onboarding and the payments flow for the Android app.',
        status: 'IN_PROGRESS',
        start: -21,
        end: 24,
        tasks: [
          ['Audit current onboarding screens', 'COMPLETED', 'MEDIUM', -14],
          ['Draft payment confirmation states', 'IN_PROGRESS', 'HIGH', 2],
          ['Usability test with five participants', 'PENDING', 'HIGH', 6],
          ['Update accessibility checklist', 'PENDING', 'LOW', -2],
          ['Hand off final specs to engineering', 'PENDING', 'MEDIUM', 18],
        ],
      },
      {
        name: 'Q4 analytics dashboard',
        description: 'Internal reporting for weekly active users and retention.',
        status: 'IN_PROGRESS',
        start: -10,
        end: 35,
        tasks: [
          ['Define retention metric', 'COMPLETED', 'HIGH', -6],
          ['Build cohort query', 'IN_PROGRESS', 'MEDIUM', 1],
          ['Review chart colours with design', 'PENDING', 'LOW', 9],
        ],
      },
      {
        name: 'Website content migration',
        description: 'Move legacy help articles to the new documentation site.',
        status: 'NOT_STARTED',
        start: 7,
        end: 45,
        tasks: [['Inventory existing articles', 'PENDING', 'MEDIUM', 10]],
      },
      {
        name: 'Office move logistics',
        description: 'Coordinate movers, desks and network setup.',
        status: 'COMPLETED',
        start: -60,
        end: -20,
        tasks: [
          ['Book movers', 'COMPLETED', 'HIGH', -45],
          ['Label equipment', 'COMPLETED', 'LOW', -30],
        ],
      },
    ],
  },
  {
    fullName: 'Leo Demo',
    email: 'leo.demo@stride.test',
    projects: [
      {
        name: 'Conference talk preparation',
        description: 'Slides and rehearsal plan for the spring developer conference.',
        status: 'IN_PROGRESS',
        start: -5,
        end: 30,
        tasks: [
          ['Outline the talk', 'COMPLETED', 'HIGH', -1],
          ['Record a practice run', 'PENDING', 'MEDIUM', 12],
        ],
      },
    ],
  },
];

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  for (const demo of demoUsers) {
    // Recreate only this demo account; cascades remove its sessions, projects and tasks.
    await prisma.user.deleteMany({ where: { email: demo.email } });
    const user = await prisma.user.create({
      data: { fullName: demo.fullName, email: demo.email, passwordHash },
    });

    for (const project of demo.projects) {
      await prisma.project.create({
        data: {
          ownerId: user.id,
          name: project.name,
          description: project.description,
          status: project.status,
          startDate: day(project.start),
          endDate: day(project.end),
          tasks: {
            create: project.tasks.map(([name, status, priority, due]) => ({
              name,
              status,
              priority,
              dueDate: day(due),
              description: '',
            })),
          },
        },
      });
    }
    console.log(`Seeded ${demo.email} (${demo.projects.length} projects)`);
  }
  console.log(`Demo password for both accounts: ${DEMO_PASSWORD}`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
