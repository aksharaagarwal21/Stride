import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  localToday,
  PROJECT_STATUS_LABELS,
  PROJECT_STATUSES,
  projectFormSchema,
  type Project,
  type ProjectFormValues,
} from '@stride/shared';
import { Button } from '../../components/ui/button';
import { ConfirmDialog } from '../../components/ui/confirm-dialog';
import { Field, Input, Select, Textarea } from '../../components/ui/field';
import { Modal } from '../../components/ui/overlays';
import { InlineAlert } from '../../components/ui/states';
import { applyServerErrors } from '../../lib/form-errors';
import { useCreateProject, useDeleteProject, useUpdateProject } from '../../lib/queries';
import { pluralize } from '../../lib/utils';

const FIELDS = ['name', 'description', 'status', 'startDate', 'endDate'] as const;

function toFormValues(project?: Project): ProjectFormValues {
  return project
    ? {
        name: project.name,
        description: project.description,
        status: project.status,
        startDate: project.startDate,
        endDate: project.endDate,
      }
    : { name: '', description: '', status: 'NOT_STARTED', startDate: localToday(), endDate: '' };
}

interface ProjectFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Present when editing. */
  project?: Project;
  onSaved?: (project: Project) => void;
}

export function ProjectFormDialog({
  open,
  onOpenChange,
  project,
  onSaved,
}: ProjectFormDialogProps) {
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const [formError, setFormError] = useState<string | null>(null);
  const editing = Boolean(project);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: toFormValues(project),
  });

  // Start from the latest saved values each time the dialog opens.
  useEffect(() => {
    if (open) {
      reset(toFormValues(project));
      setFormError(null);
    }
  }, [open, project, reset]);

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const saved = project
        ? await updateProject.mutateAsync({ id: project.id, input: values })
        : await createProject.mutateAsync(values);
      toast.success(project ? 'Project updated' : 'Project created');
      onOpenChange(false);
      onSaved?.(saved);
    } catch (error) {
      // The dialog stays open with the user's input intact.
      setFormError(applyServerErrors(error, setError, FIELDS));
    }
  });

  return (
    <Modal
      open={open}
      onOpenChange={(next) => !isSubmitting && onOpenChange(next)}
      title={editing ? 'Edit project' : 'New project'}
      description={editing ? undefined : 'Give the project a name, a status and a time frame.'}
    >
      <form onSubmit={onSubmit} noValidate>
        <div className="flex flex-col gap-4 px-5 py-4">
          {formError ? <InlineAlert>{formError}</InlineAlert> : null}
          <Field label="Project name" error={errors.name?.message}>
            {(props) => (
              <Input
                {...props}
                {...register('name')}
                autoFocus
                placeholder="e.g. Website relaunch"
              />
            )}
          </Field>
          <Field label="Description" error={errors.description?.message} optional>
            {(props) => (
              <Textarea
                {...props}
                {...register('description')}
                rows={3}
                placeholder="What is this project about?"
              />
            )}
          </Field>
          <Field label="Status" error={errors.status?.message}>
            {(props) => (
              <Select {...props} {...register('status')}>
                {PROJECT_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {PROJECT_STATUS_LABELS[status]}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Start date" error={errors.startDate?.message}>
              {(props) => <Input {...props} {...register('startDate')} type="date" />}
            </Field>
            <Field label="End date" error={errors.endDate?.message}>
              {(props) => <Input {...props} {...register('endDate')} type="date" />}
            </Field>
          </div>
        </div>
        <div className="flex flex-col-reverse gap-2 border-t border-line px-5 py-4 sm:flex-row sm:justify-end">
          <Button onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={isSubmitting}>
            {editing ? 'Save changes' : 'Create project'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export function DeleteProjectDialog({
  project,
  open,
  onOpenChange,
  onDeleted,
}: {
  project: Project;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
}) {
  const deleteProject = useDeleteProject();
  const taskCount = project.taskCounts.total;
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Delete “${project.name}”?`}
      description={
        taskCount > 0
          ? `This permanently deletes the project and its ${pluralize(taskCount, 'task')}. This cannot be undone.`
          : 'This permanently deletes the project and all of its tasks (it has none right now). This cannot be undone.'
      }
      confirmLabel="Delete project"
      onConfirm={async () => {
        await deleteProject.mutateAsync(project.id);
        toast.success(`Deleted “${project.name}”`);
        onDeleted?.();
      }}
    />
  );
}
