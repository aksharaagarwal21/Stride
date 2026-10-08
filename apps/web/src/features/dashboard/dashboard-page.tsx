import { useState, type ComponentType } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  CircleDashed,
  FolderKanban,
  ListChecks,
  Plus,
  Timer,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { describeDue, formatDate, type Dashboard } from '@stride/shared';
import { useCurrentUser } from '../../auth/auth-context';
import { Page } from '../../components/layout/page';
import { PriorityBadge, ProjectStatusBadge } from '../../components/ui/badges';
import { Button } from '../../components/ui/button';
import { Card, EmptyState, ErrorState, Skeleton } from '../../components/ui/states';
import { useDashboard } from '../../lib/queries';
import { cn, greeting } from '../../lib/utils';
import { DateRange, TaskProgress } from '../projects/project-card';
import { ProjectFormDialog } from '../projects/project-dialogs';
import { CompleteToggle, isOverdue } from '../tasks/task-table';

function Metric({
  label,
  value,
  detail,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  detail: string;
  icon: ComponentType<{ className?: string }>;
  tone: string;
}) {
  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[13px] font-medium text-ink-2">{label}</p>
        <span
          className={cn('flex size-8 items-center justify-center rounded-lg', tone)}
          aria-hidden
        >
          <Icon className="size-4" />
        </span>
      </div>
      <p className="font-display text-[28px] leading-8 font-bold tabular">{value}</p>
      <p className="truncate text-xs text-ink-2">{detail}</p>
    </Card>
  );
}

function Metrics({ metrics }: { metrics: Dashboard['metrics'] }) {
  const completedShare = metrics.totalTasks
    ? Math.round((metrics.completedTasks / metrics.totalTasks) * 100)
    : 0;
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
      <Metric
        label="Total Projects"
        value={metrics.totalProjects}
        detail="All projects you own"
        icon={FolderKanban}
        tone="bg-primary-soft text-primary"
      />
      <Metric
        label="Total Tasks"
        value={metrics.totalTasks}
        detail={metrics.totalTasks ? `${metrics.inProgressTasks} in progress` : 'No tasks yet'}
        icon={ListChecks}
        tone="bg-primary-soft text-primary"
      />
      <Metric
        label="Completed Tasks"
        value={metrics.completedTasks}
        detail={metrics.totalTasks ? `${completedShare}% of all tasks` : 'No tasks yet'}
        icon={CheckCircle2}
        tone="bg-success-soft text-success"
      />
      <Metric
        label="Pending Tasks"
        value={metrics.pendingTasks}
        detail="Not started yet"
        icon={CircleDashed}
        tone="bg-neutral-soft text-ink-2"
      />
      <Metric
        label="Projects In Progress"
        value={metrics.projectsInProgress}
        detail={`of ${metrics.totalProjects} ${metrics.totalProjects === 1 ? 'project' : 'projects'}`}
        icon={Timer}
        tone="bg-warning-soft text-warning"
      />
    </div>
  );
}

/** Stacked bar of task statuses from the server's aggregate counts (never from a list page). */
function TaskBreakdown({ metrics }: { metrics: Dashboard['metrics'] }) {
  const segments = [
    { label: 'Pending', value: metrics.pendingTasks, color: '#8590A2' },
    { label: 'In Progress', value: metrics.inProgressTasks, color: '#3659E3' },
    { label: 'Completed', value: metrics.completedTasks, color: '#15803D' },
  ];
  const total = metrics.totalTasks;
  return (
    <Card className="p-4">
      <h2 className="text-[15px] font-semibold">Task status</h2>
      {total === 0 ? (
        <p className="mt-2 text-sm text-ink-2">No tasks yet.</p>
      ) : (
        <>
          <div
            className="mt-3 flex h-2.5 w-full gap-0.5 overflow-hidden rounded-full"
            role="img"
            aria-label={segments.map((segment) => `${segment.label}: ${segment.value}`).join(', ')}
          >
            {segments
              .filter((segment) => segment.value > 0)
              .map((segment) => (
                <div
                  key={segment.label}
                  className="h-full first:rounded-l-full last:rounded-r-full"
                  style={{
                    width: `${(segment.value / total) * 100}%`,
                    backgroundColor: segment.color,
                  }}
                  title={`${segment.label}: ${segment.value} of ${total}`}
                />
              ))}
          </div>
          <ul className="mt-3 grid grid-cols-3 gap-2">
            {segments.map((segment) => (
              <li key={segment.label} className="min-w-0">
                <p className="flex items-center gap-1.5 truncate text-xs text-ink-2">
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: segment.color }}
                    aria-hidden
                  />
                  {segment.label}
                </p>
                <p className="mt-0.5 text-sm font-semibold tabular">{segment.value}</p>
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}

function ActiveProjects({ projects }: { projects: Dashboard['activeProjects'] }) {
  return (
    <Card>
      <div className="flex items-center justify-between border-b border-line px-4 py-3.5">
        <h2 className="text-[15px] font-semibold">Active projects</h2>
        <Link
          to="/projects"
          className="inline-flex items-center gap-1 text-[13px] font-medium text-primary hover:underline"
        >
          All projects
          <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      </div>
      {projects.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-ink-2">
          Every project is completed. Nice work.
        </p>
      ) : (
        <ul className="divide-y divide-line">
          {projects.map((project) => (
            <li key={project.id}>
              <Link
                to={`/projects/${project.id}`}
                className="grid gap-3 px-4 py-3.5 transition-colors duration-150 hover:bg-subtle/70 sm:grid-cols-[minmax(0,1fr)_180px] sm:items-center"
              >
                <div className="min-w-0">
                  <div className="flex min-w-0 items-center gap-2">
                    <p className="truncate font-medium" title={project.name}>
                      {project.name}
                    </p>
                    <ProjectStatusBadge status={project.status} />
                  </div>
                  <div className="mt-1">
                    <DateRange start={project.startDate} end={project.endDate} />
                  </div>
                </div>
                <TaskProgress project={project} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function UpcomingTasks({ dashboard }: { dashboard: Dashboard }) {
  const { upcomingTasks: tasks, today, metrics } = dashboard;
  return (
    <Card>
      <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3.5">
        <h2 className="text-[15px] font-semibold">Upcoming tasks</h2>
        {metrics.overdueTasks > 0 ? (
          <span className="rounded-full bg-danger-soft px-2 py-0.5 text-xs font-medium text-danger tabular">
            {metrics.overdueTasks} overdue
          </span>
        ) : null}
      </div>
      {tasks.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-ink-2">
          Nothing due — every task is completed.
        </p>
      ) : (
        <ul className="divide-y divide-line">
          {tasks.map((task) => {
            const overdue = isOverdue(task, today);
            return (
              <li key={task.id} className="flex items-start gap-3 px-4 py-3">
                <div className="pt-0.5">
                  <CompleteToggle task={task} />
                </div>
                <div className="min-w-0 flex-1">
                  <Link
                    to={`/projects/${task.project.id}?task=${task.id}`}
                    className="block truncate text-sm font-medium hover:text-primary"
                    title={task.name}
                  >
                    {task.name}
                  </Link>
                  <p className="truncate text-xs text-ink-2">{task.project.name}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                    <span
                      className={cn('tabular', overdue ? 'font-medium text-danger' : 'text-ink-2')}
                    >
                      {describeDue(task.dueDate, today)}
                    </span>
                    <PriorityBadge priority={task.priority} />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <div className="border-t border-line px-4 py-3">
        <Link
          to="/tasks"
          className="inline-flex items-center gap-1 text-[13px] font-medium text-primary hover:underline"
        >
          View all tasks
          <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      </div>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-hidden>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={index} className="h-[124px] rounded-[var(--radius-card)]" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Skeleton className="h-80 rounded-[var(--radius-card)]" />
        <Skeleton className="h-80 rounded-[var(--radius-card)]" />
      </div>
    </div>
  );
}

export function DashboardPage() {
  const user = useCurrentUser();
  const dashboard = useDashboard();
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const firstName = user.fullName.trim().split(/\s+/)[0] ?? user.fullName;

  return (
    <Page
      breadcrumbs={[{ label: 'Overview' }]}
      title={`${greeting()}, ${firstName}`}
      description={
        dashboard.data ? formatDate(dashboard.data.today) : 'Here is where your work stands.'
      }
      action={
        <Button variant="primary" onClick={() => setCreating(true)}>
          <Plus className="size-4" />
          <span className="hidden sm:inline">New project</span>
          <span className="sr-only sm:hidden">New project</span>
        </Button>
      }
    >
      {dashboard.isPending ? (
        <DashboardSkeleton />
      ) : dashboard.isError ? (
        <Card>
          <ErrorState error={dashboard.error} onRetry={() => void dashboard.refetch()} />
        </Card>
      ) : (
        <div className="flex flex-col gap-6">
          <Metrics metrics={dashboard.data.metrics} />
          {dashboard.data.metrics.totalProjects === 0 ? (
            <Card>
              <EmptyState
                icon={<FolderKanban className="size-5" />}
                title="Start with a project"
                description="Create a project, add its tasks, and this overview will track what is done and what is due."
                action={
                  <Button variant="primary" onClick={() => setCreating(true)}>
                    <Plus className="size-4" />
                    Create your first project
                  </Button>
                }
              />
            </Card>
          ) : (
            <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
              <ActiveProjects projects={dashboard.data.activeProjects} />
              <div className="flex flex-col gap-6">
                <TaskBreakdown metrics={dashboard.data.metrics} />
                <UpcomingTasks dashboard={dashboard.data} />
              </div>
            </div>
          )}
        </div>
      )}
      <ProjectFormDialog
        open={creating}
        onOpenChange={setCreating}
        onSaved={(project) => navigate(`/projects/${project.id}`)}
      />
    </Page>
  );
}
