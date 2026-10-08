import request from 'supertest';
import type { AuthResponse, Project, Task } from '@stride/shared';
import { createApp } from '../src/app';
import { prisma } from '../src/db';

export const WEB_ORIGIN = 'http://localhost:5173';
export const app = createApp({ serveWeb: false });

export async function resetDatabase() {
  await prisma.$executeRaw`TRUNCATE TABLE "tasks", "projects", "auth_sessions", "users" CASCADE`;
}

let counter = 0;
export function uniqueEmail(prefix = 'user') {
  counter += 1;
  return `${prefix}.${Date.now()}.${counter}@stride.test`;
}

export const PASSWORD = 'Correct-horse-9';

/** Registers through the mobile transport and returns a helper that adds the bearer token. */
export async function mobileUser(fullName = 'Test User', email = uniqueEmail()) {
  const res = await request(app)
    .post('/api/auth/register')
    .set('X-Client-Platform', 'mobile')
    .send({ fullName, email, password: PASSWORD })
    .expect(201);
  const body = res.body as AuthResponse;
  const token = body.token as string;
  return {
    user: body.user,
    token,
    email,
    get: (path: string) => request(app).get(path).set('Authorization', `Bearer ${token}`),
    post: (path: string, data?: object) =>
      request(app).post(path).set('Authorization', `Bearer ${token}`).send(data),
    put: (path: string, data?: object) =>
      request(app).put(path).set('Authorization', `Bearer ${token}`).send(data),
    del: (path: string) => request(app).delete(path).set('Authorization', `Bearer ${token}`),
  };
}

export type MobileUser = Awaited<ReturnType<typeof mobileUser>>;

export function projectInput(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Website relaunch',
    description: 'New marketing site',
    status: 'IN_PROGRESS',
    startDate: '2026-10-01',
    endDate: '2026-12-15',
    ...overrides,
  };
}

export async function createProject(owner: MobileUser, overrides: Record<string, unknown> = {}) {
  const res = await owner.post('/api/projects', projectInput(overrides)).expect(201);
  return (res.body as { project: Project }).project;
}

export async function createTask(
  owner: MobileUser,
  projectId: string,
  overrides: Record<string, unknown> = {},
) {
  const res = await owner
    .post('/api/tasks', {
      projectId,
      name: 'Write copy',
      description: '',
      priority: 'MEDIUM',
      status: 'PENDING',
      dueDate: '2026-10-20',
      ...overrides,
    })
    .expect(201);
  return (res.body as { task: Task }).task;
}
