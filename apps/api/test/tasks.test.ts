import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../src/db';
import { createProject, createTask, mobileUser, resetDatabase } from './helpers';

beforeEach(resetDatabase);
afterAll(() => prisma.$disconnect());

describe('task CRUD', () => {
  it('creates, updates status/priority, completes and deletes a task', async () => {
    const owner = await mobileUser();
    const project = await createProject(owner);
    const task = await createTask(owner, project.id, {
      name: 'Draft homepage',
      dueDate: '2026-10-31',
    });
    expect(task).toMatchObject({
      name: 'Draft homepage',
      priority: 'MEDIUM',
      status: 'PENDING',
      dueDate: '2026-10-31',
      project: { id: project.id, name: project.name },
    });

    const updated = await owner
      .put(`/api/tasks/${task.id}`, { priority: 'HIGH', status: 'IN_PROGRESS' })
      .expect(200);
    expect(updated.body.task).toMatchObject({
      priority: 'HIGH',
      status: 'IN_PROGRESS',
      name: 'Draft homepage',
    });

    const done = await owner.put(`/api/tasks/${task.id}`, { status: 'COMPLETED' }).expect(200);
    expect(done.body.task.status).toBe('COMPLETED');

    await owner.del(`/api/tasks/${task.id}`).expect(204);
    await owner.get(`/api/tasks/${task.id}`).expect(404);
  });

  it('applies defaults and validates enums and dates', async () => {
    const owner = await mobileUser();
    const project = await createProject(owner);
    const minimal = await owner
      .post('/api/tasks', { projectId: project.id, name: 'Minimal', dueDate: '2026-11-01' })
      .expect(201);
    expect(minimal.body.task).toMatchObject({
      priority: 'MEDIUM',
      status: 'PENDING',
      description: '',
    });

    const bad = await owner.post('/api/tasks', {
      projectId: project.id,
      name: '',
      priority: 'URGENT',
      status: 'DONE',
      dueDate: '2026-02-29',
    });
    expect(bad.status).toBe(400);
    expect(Object.keys(bad.body.error.fields).sort()).toEqual([
      'dueDate',
      'name',
      'priority',
      'status',
    ]);
  });

  it('keeps projectId immutable', async () => {
    const owner = await mobileUser();
    const a = await createProject(owner, { name: 'A' });
    const b = await createProject(owner, { name: 'B' });
    const task = await createTask(owner, a.id);
    const res = await owner.put(`/api/tasks/${task.id}`, { projectId: b.id });
    expect(res.status).toBe(400);
    expect(res.body.error.fields.projectId).toBeDefined();
  });
});

describe('task ownership', () => {
  it("prevents reading, changing or deleting another user's tasks", async () => {
    const alice = await mobileUser('Alice');
    const bob = await mobileUser('Bob');
    const project = await createProject(alice);
    const task = await createTask(alice, project.id);

    expect((await bob.get('/api/tasks')).body.data).toHaveLength(0);
    await bob.get(`/api/tasks/${task.id}`).expect(404);
    await bob.put(`/api/tasks/${task.id}`, { status: 'COMPLETED' }).expect(404);
    await bob.del(`/api/tasks/${task.id}`).expect(404);
    await bob.get(`/api/tasks?projectId=${project.id}`).expect(404);

    const unchanged = await alice.get(`/api/tasks/${task.id}`).expect(200);
    expect(unchanged.body.task.status).toBe('PENDING');
  });

  it("cannot create a task under another user's project", async () => {
    const alice = await mobileUser('Alice');
    const bob = await mobileUser('Bob');
    const project = await createProject(alice);
    const res = await bob.post('/api/tasks', {
      projectId: project.id,
      name: 'Sneaky',
      dueDate: '2026-10-10',
    });
    expect(res.status).toBe(404);
    expect(await prisma.task.count()).toBe(0);
  });
});

describe('task search, filters and pagination', () => {
  it('combines search, status, priority and project filters', async () => {
    const owner = await mobileUser();
    const web = await createProject(owner, { name: 'Web' });
    const app = await createProject(owner, { name: 'App' });
    await createTask(owner, web.id, { name: 'Design login', status: 'PENDING', priority: 'HIGH' });
    await createTask(owner, web.id, {
      name: 'design footer',
      status: 'COMPLETED',
      priority: 'HIGH',
    });
    await createTask(owner, web.id, { name: 'Design hero', status: 'PENDING', priority: 'LOW' });
    await createTask(owner, app.id, {
      name: 'Design login screen',
      status: 'PENDING',
      priority: 'HIGH',
    });

    const names = async (query: string) =>
      ((await owner.get(`/api/tasks?${query}`).expect(200)).body.data as { name: string }[])
        .map((t) => t.name)
        .sort();

    expect(await names('search=DESIGN')).toHaveLength(4);
    expect(await names('search=design&status=PENDING&priority=HIGH')).toEqual([
      'Design login',
      'Design login screen',
    ]);
    expect(await names(`search=design&status=PENDING&priority=HIGH&projectId=${web.id}`)).toEqual([
      'Design login',
    ]);
    expect(await names('priority=LOW')).toEqual(['Design hero']);
  });

  it('paginates with accurate metadata and stable ordering', async () => {
    const owner = await mobileUser();
    const project = await createProject(owner);
    for (let i = 0; i < 25; i += 1) {
      await createTask(owner, project.id, {
        name: `Task ${String(i).padStart(2, '0')}`,
        dueDate: '2026-10-20',
      });
    }
    const pages = await Promise.all(
      [1, 2, 3].map((page) => owner.get(`/api/tasks?limit=10&page=${page}&sort=name&order=asc`)),
    );
    expect(pages.map((p) => p.body.meta)).toEqual([
      { page: 1, limit: 10, total: 25, totalPages: 3 },
      { page: 2, limit: 10, total: 25, totalPages: 3 },
      { page: 3, limit: 10, total: 25, totalPages: 3 },
    ]);
    const ids = pages.flatMap((p) => p.body.data.map((t: { id: string }) => t.id));
    expect(new Set(ids).size).toBe(25);
    expect(pages[0]?.body.data[0].name).toBe('Task 00');
  });

  it('sorts priority from High to Low', async () => {
    const owner = await mobileUser();
    const project = await createProject(owner);
    await createTask(owner, project.id, { name: 'low', priority: 'LOW' });
    await createTask(owner, project.id, { name: 'high', priority: 'HIGH' });
    await createTask(owner, project.id, { name: 'medium', priority: 'MEDIUM' });
    const res = await owner.get('/api/tasks?sort=priority&order=desc').expect(200);
    expect(res.body.data.map((t: { name: string }) => t.name)).toEqual(['high', 'medium', 'low']);
  });
});
