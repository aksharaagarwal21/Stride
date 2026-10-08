import {
  dateOnlyToUtcDate,
  type ParsedTaskListQuery,
  type SortOrder,
  type TaskCreateData,
  type TaskSortField,
  type TaskUpdateData,
} from '@stride/shared';
import { prisma } from '../../db';
import type { Prisma } from '../../generated/prisma/client';
import { notFound } from '../../lib/errors';
import { pageMeta, toTask } from '../../lib/serializers';
import { findOwnedProject } from '../projects/projects.service';

// Tasks have no owner column: ownership is always checked through `project.ownerId`.
const ownedBy = (ownerId: string): Prisma.TaskWhereInput => ({ project: { ownerId } });
const withProject = { project: { select: { id: true, name: true } } } as const;

const ORDER_BY: Record<TaskSortField, (order: SortOrder) => Prisma.TaskOrderByWithRelationInput> = {
  createdAt: (order) => ({ createdAt: order }),
  dueDate: (order) => ({ dueDate: order }),
  name: (order) => ({ name: order }),
  priority: (order) => ({ priority: order }),
  status: (order) => ({ status: order }),
};

export async function listTasks(ownerId: string, query: ParsedTaskListQuery) {
  // Filtering by another user's project is a 404, not an empty list.
  if (query.projectId) await findOwnedProject(ownerId, query.projectId);

  const where: Prisma.TaskWhereInput = {
    ...ownedBy(ownerId),
    ...(query.projectId ? { projectId: query.projectId } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.priority ? { priority: query.priority } : {}),
    ...(query.search ? { name: { contains: query.search, mode: 'insensitive' } } : {}),
  };
  const sort = query.sort ?? 'dueDate';
  const order = query.order ?? (sort === 'createdAt' || sort === 'priority' ? 'desc' : 'asc');

  const [total, rows] = await Promise.all([
    prisma.task.count({ where }),
    prisma.task.findMany({
      where,
      include: withProject,
      orderBy: [ORDER_BY[sort](order), { createdAt: 'desc' }, { id: 'asc' }],
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
  ]);
  return { data: rows.map(toTask), meta: pageMeta(query.page, query.limit, total) };
}

async function findOwnedTask(ownerId: string, id: string) {
  const task = await prisma.task.findFirst({
    where: { id, ...ownedBy(ownerId) },
    include: withProject,
  });
  if (!task) throw notFound('Task');
  return task;
}

export async function getTask(ownerId: string, id: string) {
  return toTask(await findOwnedTask(ownerId, id));
}

export async function createTask(ownerId: string, input: TaskCreateData) {
  // The target project must belong to the caller; otherwise respond as if it does not exist.
  const project = await findOwnedProject(ownerId, input.projectId);
  const task = await prisma.task.create({
    data: {
      projectId: project.id,
      name: input.name,
      description: input.description,
      priority: input.priority,
      status: input.status,
      dueDate: dateOnlyToUtcDate(input.dueDate),
    },
    include: withProject,
  });
  return toTask(task);
}

export async function updateTask(ownerId: string, id: string, input: TaskUpdateData) {
  const existing = await findOwnedTask(ownerId, id);
  const task = await prisma.task.update({
    where: { id: existing.id },
    data: {
      name: input.name,
      description: input.description,
      priority: input.priority,
      status: input.status,
      dueDate: input.dueDate ? dateOnlyToUtcDate(input.dueDate) : undefined,
    },
    include: withProject,
  });
  return toTask(task);
}

export async function deleteTask(ownerId: string, id: string) {
  const { count } = await prisma.task.deleteMany({ where: { id, ...ownedBy(ownerId) } });
  if (count === 0) throw notFound('Task');
}
