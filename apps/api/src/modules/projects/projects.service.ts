import {
  dateOnlyToUtcDate,
  type ParsedProjectListQuery,
  type ProjectCreateData,
  type ProjectSortField,
  type ProjectUpdateData,
  type SortOrder,
  type TaskCounts,
} from '@stride/shared';
import { prisma } from '../../db';
import type { Prisma } from '../../generated/prisma/client';
import { notFound, validationFailed } from '../../lib/errors';
import { pageMeta, toProject } from '../../lib/serializers';

// Whitelisted sort fields → ORM order clauses. An id tiebreaker keeps pagination stable.
const ORDER_BY: Record<
  ProjectSortField,
  (order: SortOrder) => Prisma.ProjectOrderByWithRelationInput
> = {
  createdAt: (order) => ({ createdAt: order }),
  name: (order) => ({ name: order }),
  startDate: (order) => ({ startDate: order }),
  endDate: (order) => ({ endDate: order }),
  status: (order) => ({ status: order }),
};

/** Total and completed task counts for each project, computed in one grouped query. */
async function taskCountsFor(projectIds: string[]): Promise<Map<string, TaskCounts>> {
  const counts = new Map<string, TaskCounts>(
    projectIds.map((id) => [id, { total: 0, completed: 0 }]),
  );
  if (projectIds.length === 0) return counts;

  const groups = await prisma.task.groupBy({
    by: ['projectId', 'status'],
    where: { projectId: { in: projectIds } },
    _count: { _all: true },
  });
  for (const group of groups) {
    const entry = counts.get(group.projectId);
    if (!entry) continue;
    entry.total += group._count._all;
    if (group.status === 'COMPLETED') entry.completed += group._count._all;
  }
  return counts;
}

export async function withTaskCounts<T extends { id: string }>(rows: T[]) {
  const counts = await taskCountsFor(rows.map((row) => row.id));
  return (row: T) => counts.get(row.id);
}

export async function listProjects(ownerId: string, query: ParsedProjectListQuery) {
  const where: Prisma.ProjectWhereInput = {
    ownerId,
    ...(query.status ? { status: query.status } : {}),
    ...(query.search ? { name: { contains: query.search, mode: 'insensitive' } } : {}),
  };
  const sort = query.sort ?? 'createdAt';
  const order = query.order ?? (sort === 'createdAt' ? 'desc' : 'asc');

  const [total, rows] = await Promise.all([
    prisma.project.count({ where }),
    prisma.project.findMany({
      where,
      orderBy: [ORDER_BY[sort](order), { id: 'asc' }],
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
  ]);
  const countsOf = await withTaskCounts(rows);
  return {
    data: rows.map((row) => toProject(row, countsOf(row))),
    meta: pageMeta(query.page, query.limit, total),
  };
}

/** Loads a project only if the user owns it; anything else is a 404. */
export async function findOwnedProject(ownerId: string, id: string) {
  const project = await prisma.project.findFirst({ where: { id, ownerId } });
  if (!project) throw notFound('Project');
  return project;
}

export async function getProject(ownerId: string, id: string) {
  const project = await findOwnedProject(ownerId, id);
  const countsOf = await withTaskCounts([project]);
  return toProject(project, countsOf(project));
}

export async function createProject(ownerId: string, input: ProjectCreateData) {
  const project = await prisma.project.create({
    data: {
      ownerId,
      name: input.name,
      description: input.description,
      status: input.status,
      startDate: dateOnlyToUtcDate(input.startDate),
      endDate: dateOnlyToUtcDate(input.endDate),
    },
  });
  return toProject(project);
}

export async function updateProject(ownerId: string, id: string, input: ProjectUpdateData) {
  const existing = await findOwnedProject(ownerId, id);

  // Partial updates are checked against the stored dates, not just the submitted ones.
  const startDate = input.startDate ? dateOnlyToUtcDate(input.startDate) : existing.startDate;
  const endDate = input.endDate ? dateOnlyToUtcDate(input.endDate) : existing.endDate;
  if (endDate < startDate) {
    throw validationFailed({ endDate: 'End date cannot be before the start date.' });
  }

  const project = await prisma.project.update({
    where: { id: existing.id },
    data: {
      name: input.name,
      description: input.description,
      status: input.status,
      startDate,
      endDate,
    },
  });
  const countsOf = await withTaskCounts([project]);
  return toProject(project, countsOf(project));
}

/** Deletes an owned project; its tasks go with it (ON DELETE CASCADE). */
export async function deleteProject(ownerId: string, id: string) {
  const { count } = await prisma.project.deleteMany({ where: { id, ownerId } });
  if (count === 0) throw notFound('Project');
}
