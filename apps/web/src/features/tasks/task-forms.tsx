import { useEffect, useState } from 'react';
import { useForm, type FieldErrors, type UseFormRegister } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, FolderKanban, RotateCcw, Trash2 } from 'lucide-react';
import { Link } from 'react-router';
import { toast } from 'sonner';
import {
  formatTimestamp,
  TASK_PRIORITIES,
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
  TASK_STATUSES,
  taskFormSchema,
  type Task,
  type TaskFormValues,
} from '@stride/shared';
import { Button, buttonClasses } from '../../components/ui/button';
import { ConfirmDialog } from '../../components/ui/confirm-dialog';
import { Field, Input, Select, Textarea } from '../../components/ui/field';
import { Modal, Sheet } from '../../components/ui/overlays';
import { ErrorState, InlineAlert, Spinner } from '../../components/ui/states';
import { applyServerErrors } from '../../lib/form-errors';
import {
  useCreateTask,
  useDeleteTask,
  useProjects,
  useTask,
  useUpdateTask,
} from '../../lib/queries';

const editSchema = taskFormSchema.omit({ projectId: true });
type TaskEditValues = Omit<TaskFormValues, 'projectId'>;
const EDIT_FIELDS = ['name', 'description', 'status', 'priority', 'dueDate'] as const;

/** Fields shared by the create dialog and the edit drawer. */
function TaskFields({
  register,
  errors,
  autoFocus,
}: {
  register: UseFormRegister<TaskEditValues>;
  errors: FieldErrors<TaskEditValues>;
  autoFocus?: boolean;
}) {
  return (
    <>
      <Field label="Task name" error={errors.name?.message}>
        {(props) => (
          <Input
            {...props}
            {...register('name')}
            autoFocus={autoFocus}
            placeholder="e.g. Draft the launch email"
          />
        )}
      </Field>
      <Field label="Description" error={errors.description?.message} optional>
        {(props) => (
          <Textarea
            {...props}
            {...register('description')}
            rows={4}
            placeholder="Add details, links or notes"
          />
        )}
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Status" error={errors.status?.message}>
          {(props) => (
            <Select {...props} {...register('status')}>
              {TASK_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {TASK_STATUS_LABELS[status]}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Priority" error={errors.priority?.message}>
          {(props) => (
            <Select {...props} {...register('priority')}>
              {TASK_PRIORITIES.map((priority) => (
                <option key={priority} value={priority}>
                  {TASK_PRIORITY_LABELS[priority]}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>
      <Field label="Due date" error={errors.dueDate?.message}>
        {(props) => <Input {...props} {...register('dueDate')} type="date" />}
      </Field>
    </>
  );
}

const emptyTask = (projectId = ''): TaskFormValues => ({
  projectId,
  name: '',
  description: '',
  status: 'PENDING',
  priority: 'MEDIUM',
  dueDate: '',
});

interface TaskFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Fixes the project (project page). Without it the user picks one (My Tasks). */
  projectId?: string;
}

export function TaskFormDialog({ open, onOpenChange, projectId }: TaskFormDialogProps) {
  const createTask = useCreateTask();
  const [formError, setFormError] = useState<string | null>(null);
  const projects = useProjects({ limit: 100, sort: 'name', order: 'asc' });
  const needsProject = !projectId;

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: emptyTask(projectId),
  });

  useEffect(() => {
    if (open) {
      reset(emptyTask(projectId));
      setFormError(null);
    }
  }, [open, projectId, reset]);

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await createTask.mutateAsync(values);
      toast.success('Task created');
      onOpenChange(false);
    } catch (error) {
      setFormError(applyServerErrors(error, setError, ['projectId', ...EDIT_FIELDS]));
    }
  });

  const noProjects = needsProject && projects.data?.meta.total === 0;

  return (
    <Modal
      open={open}
      onOpenChange={(next) => !isSubmitting && onOpenChange(next)}
      title="New task"
    >
      {noProjects ? (
        <div className="flex flex-col items-start gap-3 px-5 py-5 text-sm text-ink-2">
          <p>Tasks belong to a project. Create a project first, then add tasks to it.</p>
          <Link
            to="/projects?new=1"
            className={buttonClasses('primary')}
            onClick={() => onOpenChange(false)}
          >
            Create a project
          </Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} noValidate>
          <div className="flex flex-col gap-4 px-5 py-4">
            {formError ? <InlineAlert>{formError}</InlineAlert> : null}
            {needsProject ? (
              <Field label="Project" error={errors.projectId?.message}>
                {(props) => (
                  <Select {...props} {...register('projectId')} disabled={projects.isPending}>
                    <option value="">
                      {projects.isPending ? 'Loading projects…' : 'Choose a project'}
                    </option>
                    {projects.data?.data.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
            ) : null}
            <TaskFields
              register={register as unknown as UseFormRegister<TaskEditValues>}
              errors={errors}
              autoFocus={!needsProject}
            />
          </div>
          <div className="flex flex-col-reverse gap-2 border-t border-line px-5 py-4 sm:flex-row sm:justify-end">
            <Button onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={isSubmitting}>
              Create task
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

export function DeleteTaskDialog({
  task,
  open,
  onOpenChange,
  onDeleted,
}: {
  task: Pick<Task, 'id' | 'name'>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
}) {
  const deleteTask = useDeleteTask();
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Delete “${task.name}”?`}
      description="This permanently deletes the task. This cannot be undone."
      confirmLabel="Delete task"
      onConfirm={async () => {
        await deleteTask.mutateAsync(task.id);
        toast.success('Task deleted');
        onDeleted?.();
      }}
    />
  );
}

function TaskEditor({ task, onClose }: { task: Task; onClose: () => void }) {
  const updateTask = useUpdateTask();
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const values = (t: Task): TaskEditValues => ({
    name: t.name,
    description: t.description,
    status: t.status,
    priority: t.priority,
    dueDate: t.dueDate,
  });

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<TaskEditValues>({ resolver: zodResolver(editSchema), defaultValues: values(task) });

  // When fresh server data arrives (e.g. after a refresh), show it unless the user is editing.
  useEffect(() => {
    if (!isDirty) reset(values(task));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task]);

  const save = handleSubmit(async (input) => {
    setFormError(null);
    try {
      const saved = await updateTask.mutateAsync({ id: task.id, input });
      reset(values(saved));
      toast.success('Task saved');
    } catch (error) {
      setFormError(applyServerErrors(error, setError, EDIT_FIELDS));
    }
  });

  const completed = task.status === 'COMPLETED';
  async function toggleComplete() {
    try {
      const saved = await updateTask.mutateAsync({
        id: task.id,
        input: { status: completed ? 'PENDING' : 'COMPLETED' },
      });
      reset(values(saved));
      toast.success(completed ? 'Task reopened' : 'Task completed');
    } catch (error) {
      toast.error(applyServerErrors(error, setError, EDIT_FIELDS) ?? 'Could not update the task.');
    }
  }

  return (
    <>
      <form onSubmit={save} noValidate className="flex min-h-0 flex-1 flex-col">
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Link
              to={`/projects/${task.project.id}`}
              className="inline-flex max-w-full items-center gap-1.5 truncate rounded-md bg-subtle px-2 py-1 text-xs font-medium text-ink-2 hover:text-ink"
            >
              <FolderKanban className="size-3.5 shrink-0" aria-hidden />
              <span className="truncate">{task.project.name}</span>
            </Link>
            <Button
              size="sm"
              onClick={toggleComplete}
              disabled={updateTask.isPending}
              className="ml-auto"
            >
              {completed ? <RotateCcw className="size-4" /> : <CheckCircle2 className="size-4" />}
              {completed ? 'Reopen' : 'Mark completed'}
            </Button>
          </div>
          <div className="flex flex-col gap-4">
            {formError ? <InlineAlert>{formError}</InlineAlert> : null}
            <TaskFields register={register} errors={errors} />
          </div>
          <dl className="mt-6 grid grid-cols-2 gap-3 border-t border-line pt-4 text-xs text-ink-2">
            <div>
              <dt>Created</dt>
              <dd className="mt-0.5 text-ink">{formatTimestamp(task.createdAt)}</dd>
            </div>
            <div>
              <dt>Last updated</dt>
              <dd className="mt-0.5 text-ink">{formatTimestamp(task.updatedAt)}</dd>
            </div>
          </dl>
        </div>
        <div className="flex items-center gap-2 border-t border-line px-5 py-3.5">
          <Button variant="danger-ghost" onClick={() => setConfirmDelete(true)}>
            <Trash2 className="size-4" />
            Delete
          </Button>
          <div className="ml-auto flex gap-2">
            <Button onClick={onClose}>Close</Button>
            <Button type="submit" variant="primary" loading={isSubmitting} disabled={!isDirty}>
              Save changes
            </Button>
          </div>
        </div>
      </form>
      <DeleteTaskDialog
        task={task}
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        onDeleted={onClose}
      />
    </>
  );
}

/** Right-hand drawer with the task's details and an inline edit form. */
export function TaskDrawer({ taskId, onClose }: { taskId: string | null; onClose: () => void }) {
  const task = useTask(taskId);
  return (
    <Sheet open={Boolean(taskId)} onOpenChange={(open) => !open && onClose()} title="Task details">
      {task.isPending ? (
        <Spinner label="Loading task" />
      ) : task.isError ? (
        <ErrorState error={task.error} onRetry={() => void task.refetch()} />
      ) : (
        <TaskEditor key={task.data.id} task={task.data} onClose={onClose} />
      )}
    </Sheet>
  );
}
