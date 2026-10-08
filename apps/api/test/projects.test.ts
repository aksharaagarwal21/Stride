import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../src/db';
import { createProject, createTask, mobileUser, projectInput, resetDatabase } from './helpers';

beforeEach(resetDatabase);
afterAll(() => prisma.$disconnect());

describe('project CRUD', () => {
  it('creates, reads, updates and deletes with every required field', async () => {
    const owner = await mobileUser();
    const created = await createProject(owner);
    expect(created).toMatchObject({
      name: 'Website relaunch',
      description: 'New marketing site',
      status: 'IN_PROGRESS',
      startDate: '2026-10-01',
      endDate: '2026-12-15',
      taskCounts: { total: 0, completed: 0 },
    });
    expect(new Date(created.createdAt).toISOString()).toBe(created.createdAt);

    const fetched = await owner.get(`/api/projects/${created.id}`).expect(200);
    expect(fetched.body.project).toEqual(created);

    const updated = await owner
      .put(`/api/projects/${created.id}`, { status: 'COMPLETED', name: '  Relaunch v2  ' })
      .expect(200);
    expect(updated.body.project).toMatchObject({
      status: 'COMPLETED',
      name: 'Relaunch v2',
      startDate: '2026-10-01',
    });

    await owner.del(`/api/projects/${created.id}`).expect(204);
    await owner.get(`/api/projects/${created.id}`).expect(404);
  });

  it('rejects invalid values with field-level errors', async () => {
    const owner = await mobileUser();
    const cases: [Record<string, unknown>, string][] = [
      [{ name: '   ' }, 'name'],
      [{ status: 'DONE' }, 'status'],
      [{ startDate: '2026-02-30' }, 'startDate'],
      [{ endDate: '2026-13-01' }, 'endDate'],
      [{ startDate: '2026-12-01', endDate: '2026-11-01' }, 'endDate'],
      [{ ownerId: '6c1f4f8a-3c1e-4b8e-9a4e-0f8a1c2b3d4e' }, 'ownerId'],
      [{ name: 'x'.repeat(121) }, 'name'],
    ];
    for (const [overrides, field] of cases) {
      const res = await owner.post('/api/projects', projectInput(overrides));
      expect(res.status, JSON.stringify(overrides)).toBe(400);
      expect(res.body.error.fields[field], JSON.stringify(overrides)).toBeDefined();
    }
    expect(await prisma.project.count()).toBe(0);
  });

  it('checks partial date updates against the stored dates', async () => {
    const owner = await mobileUser();
    const project = await createProject(owner, { startDate: '2026-10-10', endDate: '2026-10-20' });
    const res = await owner.put(`/api/projects/${project.id}`, { endDate: '2026-10-01' });
    expect(res.status).toBe(400);
    expect(res.body.error.fields.endDate).toBeDefined();
    await owner.put(`/api/projects/${project.id}`, {}).expect(400);
  });

  it('returns 400 for malformed ids', async () => {
    const owner = await mobileUser();
    const res = await owner.get('/api/projects/not-a-uuid');
    expect(res.status).toBe(400);
    expect(res.body.error.fields.id).toBeDefined();
  });
});

describe('project ownership', () => {
  it("hides other users' projects from list, read, update and delete", async () => {
    const alice = await mobileUser('Alice');
    const bob = await mobileUser('Bob');
    const project = await createProject(alice);

    const list = await bob.get('/api/projects').expect(200);
    expect(list.body.data).toHaveLength(0);
    expect(list.body.meta.total).toBe(0);

    await bob.get(`/api/projects/${project.id}`).expect(404);
    await bob.put(`/api/projects/${project.id}`, { name: 'Hijacked' }).expect(404);
    await bob.del(`/api/projects/${project.id}`).expect(404);

    const intact = await alice.get(`/api/projects/${project.id}`).expect(200);
    expect(intact.body.project.name).toBe('Website relaunch');
  });
});

describe('project search, filters, sorting and pagination', () => {
  it('combines case-insensitive search with a status filter', async () => {
    const owner = await mobileUser();
    await createProject(owner, { name: 'Alpha Launch', status: 'IN_PROGRESS' });
    await createProject(owner, { name: 'alpha research', status: 'NOT_STARTED' });
    await createProject(owner, { name: 'Beta Launch', status: 'IN_PROGRESS' });

    const search = await owner.get('/api/projects?search=ALPHA').expect(200);
    expect(search.body.data.map((p: { name: string }) => p.name).sort()).toEqual([
      'Alpha Launch',
      'alpha research',
    ]);

    const combined = await owner.get('/api/projects?search=launch&status=IN_PROGRESS').expect(200);
    expect(combined.body.data.map((p: { name: string }) => p.name).sort()).toEqual([
      'Alpha Launch',
      'Beta Launch',
    ]);

    const sorted = await owner.get('/api/projects?sort=name&order=asc').expect(200);
    expect(sorted.body.data.map((p: { name: string }) => p.name)).toEqual([
      'Alpha Launch',
      'alpha research',
      'Beta Launch',
    ]);
  });

  it('treats search text as data, not SQL', async () => {
    const owner = await mobileUser();
    await createProject(owner, { name: "O'Brien's plan" });
    const res = await owner
      .get(`/api/projects?search=${encodeURIComponent("' OR 1=1 --")}`)
      .expect(200);
    expect(res.body.data).toHaveLength(0);
    const quoted = await owner
      .get(`/api/projects?search=${encodeURIComponent("O'Brien")}`)
      .expect(200);
    expect(quoted.body.data).toHaveLength(1);
  });

  it('rejects unknown sort fields, bad enums and out-of-range pagination', async () => {
    const owner = await mobileUser();
    for (const query of [
      'sort=passwordHash',
      'order=sideways',
      'status=DONE',
      'limit=500',
      'page=0',
      'evil=1',
    ]) {
      expect((await owner.get(`/api/projects?${query}`)).status, query).toBe(400);
    }
  });

  it('returns correct pagination metadata', async () => {
    const owner = await mobileUser();
    for (let i = 1; i <= 7; i += 1) await createProject(owner, { name: `Project ${i}` });
    const page = await owner.get('/api/projects?limit=3&page=3').expect(200);
    expect(page.body.meta).toEqual({ page: 3, limit: 3, total: 7, totalPages: 3 });
    expect(page.body.data).toHaveLength(1);
  });

  it('reports task counts per project', async () => {
    const owner = await mobileUser();
    const project = await createProject(owner);
    await createTask(owner, project.id, { status: 'COMPLETED' });
    await createTask(owner, project.id, { status: 'IN_PROGRESS' });
    await createTask(owner, project.id);
    const res = await owner.get(`/api/projects/${project.id}`).expect(200);
    expect(res.body.project.taskCounts).toEqual({ total: 3, completed: 1 });
  });
});

describe('project deletion', () => {
  it('removes its tasks and updates dashboard totals', async () => {
    const owner = await mobileUser();
    const keep = await createProject(owner, { name: 'Keep' });
    const drop = await createProject(owner, { name: 'Drop' });
    await createTask(owner, keep.id);
    const doomed = await createTask(owner, drop.id);
    await createTask(owner, drop.id, { status: 'COMPLETED' });

    const before = await owner.get('/api/dashboard').expect(200);
    expect(before.body.metrics).toMatchObject({ totalProjects: 2, totalTasks: 3 });

    await owner.del(`/api/projects/${drop.id}`).expect(204);
    await owner.get(`/api/tasks/${doomed.id}`).expect(404);
    expect(await prisma.task.count({ where: { projectId: drop.id } })).toBe(0);

    const after = await owner.get('/api/dashboard').expect(200);
    expect(after.body.metrics).toMatchObject({
      totalProjects: 1,
      totalTasks: 1,
      completedTasks: 0,
    });
  });
});
