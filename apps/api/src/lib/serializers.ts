import {
  utcDateToDateOnly,
  type Project,
  type Task,
  type TaskCounts,
  type User,
} from '@stride/shared';
import type {
  Project as ProjectRow,
  Task as TaskRow,
  User as UserRow,
} from '../generated/prisma/client';

// Explicit response mappers: only whitelisted fields leave the server, so password hashes,
// session ids and owner ids can never be serialised by accident.

export function toUser(row: Pick<UserRow, 'id' | 'fullName' | 'email' | 'createdAt'>): User {
  return {
    id: row.id,
    fullName: row.fullName,
    email: row.email,
    createdAt: row.createdAt.toISOString(),
  };
}

export function toProject(
  row: ProjectRow,
  counts: TaskCounts = { total: 0, completed: 0 },
): Project {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    status: row.status,
    startDate: utcDateToDateOnly(row.startDate),
    endDate: utcDateToDateOnly(row.endDate),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    taskCounts: counts,
  };
}

export function toTask(row: TaskRow & { project: { id: string; name: string } }): Task {
  return {
    id: row.id,
    projectId: row.projectId,
    project: { id: row.project.id, name: row.project.name },
    name: row.name,
    description: row.description,
    priority: row.priority,
    status: row.status,
    dueDate: utcDateToDateOnly(row.dueDate),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function pageMeta(page: number, limit: number, total: number) {
  return { page, limit, total, totalPages: Math.ceil(total / limit) };
}
