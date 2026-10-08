import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../src/db';
import { createProject, createTask, mobileUser, resetDatabase } from './helpers';

beforeEach(resetDatabase);
afterAll(() => prisma.$disconnect());

describe('dashboard', () => {
  it('aggregates across all records, not one page, and keeps statuses distinct', async () => {
    const owner = await mobileUser();
    const inProgress = await createProject(owner, { status: 'IN_PROGRESS' });
    await createProject(owner, { status: 'NOT_STARTED' });
    await createProject(owner, { status: 'COMPLETED' });

    // More tasks than the default page size (20).
    for (let i = 0; i < 12; i += 1) await createTask(owner, inProgress.id, { status: 'PENDING' });
    for (let i = 0; i < 9; i += 1) await createTask(owner, inProgress.id, { status: 'COMPLETED' });
    for (let i = 0; i < 4; i += 1)
      await createTask(owner, inProgress.id, { status: 'IN_PROGRESS' });

    const res = await owner.get('/api/dashboard').expect(200);
    expect(res.body.metrics).toMatchObject({
      totalProjects: 3,
      totalTasks: 25,
      completedTasks: 9,
      pendingTasks: 12, // In Progress tasks are not counted as Pending.
      inProgressTasks: 4,
      projectsInProgress: 1,
    });
  });

  it('only counts the authenticated user’s data', async () => {
    const alice = await mobileUser('Alice');
    const bob = await mobileUser('Bob');
    const project = await createProject(alice);
    await createTask(alice, project.id);

    const res = await bob.get('/api/dashboard').expect(200);
    expect(res.body.metrics).toEqual({
      totalProjects: 0,
      totalTasks: 0,
      completedTasks: 0,
      pendingTasks: 0,
      inProgressTasks: 0,
      projectsInProgress: 0,
      overdueTasks: 0,
    });
    expect(res.body.activeProjects).toEqual([]);
    expect(res.body.upcomingTasks).toEqual([]);
  });

  it('uses the client calendar day for overdue and upcoming tasks', async () => {
    const owner = await mobileUser();
    const project = await createProject(owner);
    await createTask(owner, project.id, { name: 'Overdue', dueDate: '2026-10-07' });
    await createTask(owner, project.id, { name: 'Today', dueDate: '2026-10-08' });
    await createTask(owner, project.id, {
      name: 'Done late',
      dueDate: '2026-10-01',
      status: 'COMPLETED',
    });

    const res = await owner.get('/api/dashboard?today=2026-10-08').expect(200);
    expect(res.body.today).toBe('2026-10-08');
    expect(res.body.metrics.overdueTasks).toBe(1);
    expect(res.body.upcomingTasks.map((t: { name: string }) => t.name)).toEqual([
      'Overdue',
      'Today',
    ]);

    await owner.get('/api/dashboard?today=2026-02-30').expect(400);
  });
});
