import {
  PROJECT_STATUS_LABELS,
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
  type ProjectStatus,
  type TaskPriority,
  type TaskStatus,
} from '@stride/shared';
import { cn } from '../../lib/utils';

// Every badge pairs colour with a text label, so status never relies on colour alone.
const tone = {
  neutral: 'bg-neutral-soft text-ink-2',
  blue: 'bg-primary-soft text-primary-strong',
  green: 'bg-success-soft text-success',
  amber: 'bg-warning-soft text-warning',
  red: 'bg-danger-soft text-danger',
} as const;

const text = {
  neutral: 'text-ink-2',
  blue: 'text-primary-strong',
  green: 'text-success',
  amber: 'text-warning',
  red: 'text-danger',
} as const;

const dot = {
  neutral: 'bg-ink-3',
  blue: 'bg-primary',
  green: 'bg-success',
  amber: 'bg-warning',
  red: 'bg-danger',
} as const;

type Tone = keyof typeof tone;

/** Pill badge; `plain` drops the tinted background for dense rows (text colour is kept). */
function Badge({ toneName, label, plain }: { toneName: Tone; label: string; plain?: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full text-xs font-medium whitespace-nowrap',
        plain ? 'px-0' : 'px-2.5',
        plain ? text[toneName] : tone[toneName],
      )}
    >
      <span className={cn('size-1.5 rounded-full', dot[toneName])} aria-hidden />
      {label}
    </span>
  );
}

const projectTone: Record<ProjectStatus, Tone> = {
  NOT_STARTED: 'neutral',
  IN_PROGRESS: 'blue',
  COMPLETED: 'green',
};

const taskTone: Record<TaskStatus, Tone> = {
  PENDING: 'neutral',
  IN_PROGRESS: 'blue',
  COMPLETED: 'green',
};

const priorityTone: Record<TaskPriority, Tone> = {
  LOW: 'neutral',
  MEDIUM: 'amber',
  HIGH: 'red',
};

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  return <Badge toneName={projectTone[status]} label={PROJECT_STATUS_LABELS[status]} />;
}

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  return <Badge toneName={taskTone[status]} label={TASK_STATUS_LABELS[status]} />;
}

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  return <Badge toneName={priorityTone[priority]} label={TASK_PRIORITY_LABELS[priority]} plain />;
}
