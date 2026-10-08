import { dateOnlyToUtcDate, utcDateToDateOnly, type Dashboard } from '@stride/shared';
import { prisma } from '../../db';
import { toProject, toTask } from '../../lib/serializers';
import { withTaskCounts } from '../projects/projects.service';

const ACTIVE_PROJECTS_LIMIT = 5;
const UPCOMING_TASKS_LIMIT = 6;

/**
 * Dashboard totals are database aggregates over all of the user's records — never derived from
 * a paginated page. `today` is the client's calendar day so "overdue" matches what the user sees.
 */
export async function getDashboard(ownerId: string, today?: string): Promise<Dashboard> {
  const day = today ?? utcDateToDateOnly(new Date());
  const ownedTasks = { project: { ownerId } };

  const [totalProjects, projectsInProgress, statusGroups, overdueTasks, activeRows, upcomingRows] =
    await Promise.all([
      prisma.project.count({ where: { ownerId } }),
      prisma.project.count({ where: { ownerId, status: 'IN_PROGRESS' } }),
      prisma.task.groupBy({ by: ['status'], where: ownedTasks, _count: { _all: true } }),
      prisma.task.count({
        where: {
          ...ownedTasks,
          status: { not: 'COMPLETED' },
          dueDate: { lt: dateOnlyToUtcDate(day) },
        },
      }),
      prisma.project.findMany({
        where: { ownerId, status: { not: 'COMPLETED' } },
        // Enum order is NOT_STARTED < IN_PROGRESS, so "desc" lists in-progress work first.
        orderBy: [{ status: 'desc' }, { endDate: 'asc' }, { id: 'asc' }],
        take: ACTIVE_PROJECTS_LIMIT,
      }),
      prisma.task.findMany({
        where: { ...ownedTasks, status: { not: 'COMPLETED' } },
        include: { project: { select: { id: true, name: true } } },
        orderBy: [{ dueDate: 'asc' }, { priority: 'desc' }, { id: 'asc' }],
        take: UPCOMING_TASKS_LIMIT,
      }),
    ]);

  const byStatus = Object.fromEntries(
    statusGroups.map((group) => [group.status, group._count._all]),
  );
  const countsOf = await withTaskCounts(activeRows);

  return {
    today: day,
    metrics: {
      totalProjects,
      totalTasks: statusGroups.reduce((sum, group) => sum + group._count._all, 0),
      completedTasks: byStatus.COMPLETED ?? 0,
      pendingTasks: byStatus.PENDING ?? 0,
      inProgressTasks: byStatus.IN_PROGRESS ?? 0,
      projectsInProgress,
      overdueTasks,
    },
    activeProjects: activeRows.map((row) => toProject(row, countsOf(row))),
    upcomingTasks: upcomingRows.map(toTask),
  };
}
