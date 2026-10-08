import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router';
import { formatDate, formatTimestamp } from '@stride/shared';
import { Page } from '../../components/layout/page';
import { ProjectStatusBadge } from '../../components/ui/badges';
import { Button } from '../../components/ui/button';
import { Card, ErrorState, Skeleton } from '../../components/ui/states';
import { useProject } from '../../lib/queries';
import { TaskBrowser } from '../tasks/task-browser';
import { TaskFormDialog } from '../tasks/task-forms';
import { TaskProgress } from './project-card';
import { DeleteProjectDialog, ProjectFormDialog } from './project-dialogs';

export function ProjectDetailPage() {
  const { projectId = '' } = useParams();
  const navigate = useNavigate();
  const project = useProject(projectId);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [creatingTask, setCreatingTask] = useState(false);

  if (project.isError) {
    return (
      <Page
        breadcrumbs={[{ label: 'Projects', to: '/projects' }, { label: 'Unavailable' }]}
        title="Project unavailable"
      >
        <Card>
          <ErrorState
            error={project.error}
            onRetry={() => void project.refetch()}
            backTo="/projects"
            backLabel="All projects"
          />
        </Card>
      </Page>
    );
  }

  const data = project.data;
  return (
    <Page
      breadcrumbs={[{ label: 'Projects', to: '/projects' }, { label: data?.name ?? 'Loading…' }]}
      title={data ? data.name : <Skeleton className="h-8 w-64" />}
      description={
        data?.description ? (
          <p className="max-w-3xl whitespace-pre-line">{data.description}</p>
        ) : null
      }
      titleActions={
        data ? (
          <>
            <Button onClick={() => setEditing(true)}>
              <Pencil className="size-4" />
              Edit
            </Button>
            <Button variant="danger-ghost" onClick={() => setDeleting(true)}>
              <Trash2 className="size-4" />
              Delete
            </Button>
          </>
        ) : null
      }
      action={
        <Button variant="primary" onClick={() => setCreatingTask(true)} disabled={!data}>
          <Plus className="size-4" />
          <span className="hidden sm:inline">New task</span>
          <span className="sr-only sm:hidden">New task</span>
        </Button>
      }
    >
      <Card className="mb-6 p-4 sm:p-5">
        {data ? (
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-[auto_auto_auto_auto_minmax(200px,1fr)]">
            <div>
              <dt className="text-xs text-ink-2">Status</dt>
              <dd className="mt-1">
                <ProjectStatusBadge status={data.status} />
              </dd>
            </div>
            <div>
              <dt className="text-xs text-ink-2">Start date</dt>
              <dd className="mt-1 text-sm font-medium tabular">{formatDate(data.startDate)}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-2">End date</dt>
              <dd className="mt-1 text-sm font-medium tabular">{formatDate(data.endDate)}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-2">Created</dt>
              <dd className="mt-1 text-sm font-medium tabular">
                {formatTimestamp(data.createdAt)}
              </dd>
            </div>
            <div className="col-span-2 md:col-span-1">
              <dt className="mb-1 text-xs text-ink-2">Progress</dt>
              <dd>
                <TaskProgress project={data} />
              </dd>
            </div>
          </dl>
        ) : (
          <Skeleton className="h-12 w-full" />
        )}
      </Card>

      <h2 className="mb-3 text-lg font-semibold">Tasks</h2>
      <TaskBrowser projectId={projectId} onCreate={() => setCreatingTask(true)} />

      {data ? (
        <>
          <ProjectFormDialog open={editing} onOpenChange={setEditing} project={data} />
          <DeleteProjectDialog
            project={data}
            open={deleting}
            onOpenChange={setDeleting}
            onDeleted={() => navigate('/projects', { replace: true })}
          />
          <TaskFormDialog open={creatingTask} onOpenChange={setCreatingTask} projectId={data.id} />
        </>
      ) : null}
    </Page>
  );
}
