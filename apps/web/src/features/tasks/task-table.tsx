import { useState, type MouseEvent } from 'react';
import { AlertCircle, Check, CheckCircle2, Loader2, Pencil, RotateCcw, Trash2 } from 'lucide-react';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { describeDue, formatShortDate, localToday, type Task } from '@stride/shared';
import { PriorityBadge, TaskStatusBadge } from '../../components/ui/badges';
import { ActionMenu } from '../../components/ui/overlays';
import { useUpdateTask } from '../../lib/queries';
import { cn, errorMessage } from '../../lib/utils';
import { DeleteTaskDialog } from './task-forms';

export function isOverdue(task: Pick<Task, 'dueDate' | 'status'>, today: string) {
  return task.status !== 'COMPLETED' && task.dueDate < today;
}

/** Round checkbox that persists Completed ↔ Pending on the server before changing. */
export function CompleteToggle({ task }: { task: Task }) {
  const updateTask = useUpdateTask();
  const completed = task.status === 'COMPLETED';

  async function toggle(event: MouseEvent) {
    event.stopPropagation();
    try {
      await updateTask.mutateAsync({
        id: task.id,
        input: { status: completed ? 'PENDING' : 'COMPLETED' },
      });
      toast.success(completed ? `Reopened “${task.name}”` : `Completed “${task.name}”`);
    } catch (error) {
      toast.error(`Couldn't update the task: ${errorMessage(error)}`);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={updateTask.isPending}
      aria-label={completed ? `Reopen “${task.name}”` : `Mark “${task.name}” as completed`}
      aria-pressed={completed}
      className={cn(
        'flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-150 disabled:opacity-60',
        completed
          ? 'border-success bg-success text-white hover:bg-[#126c34]'
          : 'border-line-strong text-transparent hover:border-success hover:text-success',
      )}
    >
      {updateTask.isPending ? (
        <Loader2 className={cn('size-3.5 animate-spin', completed ? 'text-white' : 'text-ink-3')} />
      ) : (
        <Check className="size-3.5" strokeWidth={3} />
      )}
    </button>
  );
}

export function DueDate({ task, today }: { task: Task; today: string }) {
  const overdue = isOverdue(task, today);
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 tabular',
        overdue ? 'font-medium text-danger' : 'text-ink-2',
      )}
    >
      {overdue ? <AlertCircle className="size-3.5 shrink-0" aria-hidden /> : null}
      <span>{formatShortDate(task.dueDate, today)}</span>
      {overdue ? <span className="sr-only">(overdue)</span> : null}
    </span>
  );
}

function RowActions({ task, onOpen }: { task: Task; onOpen: (id: string) => void }) {
  const updateTask = useUpdateTask();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const completed = task.status === 'COMPLETED';

  async function setStatus() {
    try {
      await updateTask.mutateAsync({
        id: task.id,
        input: { status: completed ? 'PENDING' : 'COMPLETED' },
      });
      toast.success(completed ? 'Task reopened' : 'Task completed');
    } catch (error) {
      toast.error(`Couldn't update the task: ${errorMessage(error)}`);
    }
  }

  return (
    <>
      <ActionMenu
        label={`Actions for “${task.name}”`}
        actions={[
          {
            label: 'Open details',
            icon: <Pencil className="size-4" />,
            onSelect: () => onOpen(task.id),
          },
          {
            label: completed ? 'Reopen' : 'Mark completed',
            icon: completed ? (
              <RotateCcw className="size-4" />
            ) : (
              <CheckCircle2 className="size-4" />
            ),
            onSelect: setStatus,
            disabled: updateTask.isPending,
          },
          {
            label: 'Delete',
            icon: <Trash2 className="size-4" />,
            onSelect: () => setConfirmDelete(true),
            danger: true,
          },
        ]}
      />
      <DeleteTaskDialog task={task} open={confirmDelete} onOpenChange={setConfirmDelete} />
    </>
  );
}

interface TaskTableProps {
  tasks: Task[];
  onOpen: (id: string) => void;
  showProject?: boolean;
  /** Dims the table while a new filter/page is loading over the previous results. */
  stale?: boolean;
}

/**
 * Accessible task table. Rows open the details drawer on click or Enter; the checkbox and the
 * action menu are separate controls so keyboard users can reach each one.
 */
export function TaskTable({ tasks, onOpen, showProject, stale }: TaskTableProps) {
  const today = localToday();
  return (
    <div className={cn('overflow-x-auto transition-opacity duration-150', stale && 'opacity-60')}>
      <table className="w-full min-w-0 table-fixed border-collapse text-sm">
        <caption className="sr-only">Tasks</caption>
        <thead>
          <tr className="border-b border-line text-left text-xs font-medium text-ink-2">
            <th scope="col" className="w-12 py-2.5 pl-4">
              <span className="sr-only">Completed</span>
            </th>
            <th scope="col" className="py-2.5 pr-3 font-medium">
              Task
            </th>
            {showProject ? (
              <th scope="col" className="hidden w-[22%] py-2.5 pr-3 font-medium lg:table-cell">
                Project
              </th>
            ) : null}
            <th scope="col" className="hidden w-28 py-2.5 pr-3 font-medium md:table-cell">
              Priority
            </th>
            <th scope="col" className="hidden w-32 py-2.5 pr-3 font-medium sm:table-cell">
              Status
            </th>
            <th scope="col" className="w-24 py-2.5 pr-3 font-medium">
              Due
            </th>
            <th scope="col" className="w-12 py-2.5 pr-3">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => {
            const done = task.status === 'COMPLETED';
            return (
              <tr
                key={task.id}
                onClick={() => onOpen(task.id)}
                className="group cursor-pointer border-b border-line transition-colors duration-150 last:border-b-0 hover:bg-subtle/70"
              >
                <td className="py-3 pl-4 align-middle">
                  <CompleteToggle task={task} />
                </td>
                <td className="min-w-0 py-3 pr-3 align-middle">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onOpen(task.id);
                    }}
                    className={cn(
                      'block max-w-full truncate text-left font-medium hover:text-primary',
                      done && 'text-ink-2 line-through decoration-ink-3',
                    )}
                    title={task.name}
                  >
                    {task.name}
                  </button>
                  {task.description ? (
                    <p className="truncate text-xs text-ink-2" title={task.description}>
                      {task.description}
                    </p>
                  ) : null}
                  {/* Compact metadata for narrow screens where columns are hidden. */}
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 sm:hidden">
                    <TaskStatusBadge status={task.status} />
                    <PriorityBadge priority={task.priority} />
                  </div>
                  {showProject ? (
                    <Link
                      to={`/projects/${task.project.id}`}
                      onClick={(event) => event.stopPropagation()}
                      className="mt-0.5 block truncate text-xs text-ink-2 hover:text-primary lg:hidden"
                    >
                      {task.project.name}
                    </Link>
                  ) : null}
                </td>
                {showProject ? (
                  <td className="hidden min-w-0 py-3 pr-3 align-middle lg:table-cell">
                    <Link
                      to={`/projects/${task.project.id}`}
                      onClick={(event) => event.stopPropagation()}
                      className="block truncate text-ink-2 hover:text-primary"
                      title={task.project.name}
                    >
                      {task.project.name}
                    </Link>
                  </td>
                ) : null}
                <td className="hidden py-3 pr-3 align-middle md:table-cell">
                  <PriorityBadge priority={task.priority} />
                </td>
                <td className="hidden py-3 pr-3 align-middle sm:table-cell">
                  <TaskStatusBadge status={task.status} />
                </td>
                <td className="py-3 pr-3 align-middle" title={describeDue(task.dueDate, today)}>
                  <DueDate task={task} today={today} />
                </td>
                <td className="py-3 pr-3 text-right align-middle">
                  <RowActions task={task} onOpen={onOpen} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
