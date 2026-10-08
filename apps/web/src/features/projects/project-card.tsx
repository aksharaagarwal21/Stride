import { useState } from 'react';
import { CalendarDays, Pencil, Trash2 } from 'lucide-react';
import { Link } from 'react-router';
import { formatShortDate, localToday, type Project } from '@stride/shared';
import { ProjectStatusBadge } from '../../components/ui/badges';
import { ActionMenu } from '../../components/ui/overlays';
import { ProgressBar } from '../../components/ui/states';
import { DeleteProjectDialog, ProjectFormDialog } from './project-dialogs';

export function DateRange({ start, end }: { start: string; end: string }) {
  const today = localToday();
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-ink-2 tabular">
      <CalendarDays className="size-3.5 shrink-0" aria-hidden />
      <span>
        {formatShortDate(start, today)} – {formatShortDate(end, today)}
      </span>
    </span>
  );
}

export function TaskProgress({ project }: { project: Project }) {
  const { total, completed } = project.taskCounts;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-xs text-ink-2">
        <span className="tabular">
          {total === 0 ? 'No tasks yet' : `${completed} of ${total} tasks done`}
        </span>
        {total > 0 ? (
          <span className="tabular font-medium text-ink">
            {Math.round((completed / total) * 100)}%
          </span>
        ) : null}
      </div>
      <ProgressBar completed={completed} total={total} />
    </div>
  );
}

export function ProjectCard({ project }: { project: Project }) {
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  return (
    <article className="group relative flex flex-col gap-3 rounded-[var(--radius-card)] border border-line bg-surface p-4 shadow-card transition-colors duration-150 hover:border-line-strong">
      <div className="flex items-start justify-between gap-2">
        <h3 className="min-w-0 text-[15px] leading-6 font-semibold">
          {/* Stretched link: the whole card is clickable, the menu stays separately focusable. */}
          <Link
            to={`/projects/${project.id}`}
            className="line-clamp-2 break-words after:absolute after:inset-0 after:rounded-[var(--radius-card)] focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-primary"
          >
            {project.name}
          </Link>
        </h3>
        <div className="relative z-10 -mt-1 -mr-1">
          <ActionMenu
            label={`Actions for “${project.name}”`}
            actions={[
              {
                label: 'Edit project',
                icon: <Pencil className="size-4" />,
                onSelect: () => setEditing(true),
              },
              {
                label: 'Delete project',
                icon: <Trash2 className="size-4" />,
                onSelect: () => setDeleting(true),
                danger: true,
              },
            ]}
          />
        </div>
      </div>
      <p className="line-clamp-2 min-h-10 text-sm text-ink-2">
        {project.description || 'No description.'}
      </p>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <ProjectStatusBadge status={project.status} />
        <DateRange start={project.startDate} end={project.endDate} />
      </div>
      <div className="mt-auto pt-1">
        <TaskProgress project={project} />
      </div>
      <ProjectFormDialog open={editing} onOpenChange={setEditing} project={project} />
      <DeleteProjectDialog project={project} open={deleting} onOpenChange={setDeleting} />
    </article>
  );
}
