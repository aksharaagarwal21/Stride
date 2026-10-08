import { useEffect, useState } from 'react';
import { FolderKanban, Plus, SearchX } from 'lucide-react';
import { useNavigate } from 'react-router';
import {
  PROJECT_STATUS_LABELS,
  PROJECT_STATUSES,
  type ProjectListQuery,
  type ProjectSortField,
  type SortOrder,
} from '@stride/shared';
import { Page } from '../../components/layout/page';
import { Button } from '../../components/ui/button';
import { FilterSelect, SearchInput } from '../../components/ui/field';
import { EmptyState, ErrorState, Pagination, Skeleton } from '../../components/ui/states';
import { useProjects } from '../../lib/queries';
import { pick, useDebouncedSearch, useUrlFilters } from '../../lib/url-state';
import { cn, pluralize } from '../../lib/utils';
import { ProjectCard } from './project-card';
import { ProjectFormDialog } from './project-dialogs';

const PAGE_SIZE = 12;

const SORT_OPTIONS = [
  { value: 'createdAt:desc', label: 'Newest first' },
  { value: 'name:asc', label: 'Name (A–Z)' },
  { value: 'endDate:asc', label: 'End date (soonest)' },
  { value: 'startDate:asc', label: 'Start date' },
];

const STATUS_TABS = [
  { value: '', label: 'All' },
  ...PROJECT_STATUSES.map((status) => ({ value: status, label: PROJECT_STATUS_LABELS[status] })),
];

export function ProjectsPage() {
  const navigate = useNavigate();
  const { values, update, page } = useUrlFilters(['q', 'status', 'sort', 'new'] as const);
  const [searchText, setSearchText] = useDebouncedSearch(values.q, (q) => update({ q }));
  const [creating, setCreating] = useState(false);

  // `?new=1` (from the dashboard or the task dialog) opens the create dialog directly.
  useEffect(() => {
    if (values.new) {
      setCreating(true);
      update({ new: '' });
    }
  }, [values.new, update]);

  const status = pick(values.status, PROJECT_STATUSES);
  const sortValue = SORT_OPTIONS.some((option) => option.value === values.sort)
    ? values.sort
    : 'createdAt:desc';
  const [sort, order] = sortValue.split(':') as [ProjectSortField, SortOrder];
  const query: ProjectListQuery = {
    search: values.q || undefined,
    status,
    sort,
    order,
    page,
    limit: PAGE_SIZE,
  };
  const projects = useProjects(query);
  const filtered = Boolean(values.q || status);

  function clearFilters() {
    setSearchText('');
    update({ q: '', status: '' });
  }

  const total = projects.data?.meta.total;

  return (
    <Page
      breadcrumbs={[{ label: 'Projects' }]}
      title="Projects"
      description={
        total === undefined
          ? 'Your projects and their progress.'
          : filtered
            ? `${pluralize(total, 'project')} found`
            : `${pluralize(total, 'project')}`
      }
      action={
        <Button variant="primary" onClick={() => setCreating(true)}>
          <Plus className="size-4" />
          <span className="hidden sm:inline">New project</span>
          <span className="sr-only sm:hidden">New project</span>
        </Button>
      }
    >
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center">
        <SearchInput
          label="Search projects by name"
          placeholder="Search projects"
          value={searchText}
          onChange={setSearchText}
          className="lg:w-72"
        />
        <div
          role="group"
          aria-label="Filter by status"
          className="flex gap-1 overflow-x-auto rounded-[10px] border border-line bg-surface p-1"
        >
          {STATUS_TABS.map((tab) => {
            const active = (status ?? '') === tab.value;
            return (
              <button
                key={tab.value || 'all'}
                type="button"
                aria-pressed={active}
                onClick={() => update({ status: tab.value })}
                className={cn(
                  'h-8 shrink-0 rounded-md px-3 text-[13px] font-medium whitespace-nowrap transition-colors duration-150',
                  active
                    ? 'bg-primary-soft text-primary-strong'
                    : 'text-ink-2 hover:bg-subtle hover:text-ink',
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
        <FilterSelect
          label="Sort projects"
          value={sortValue}
          onChange={(value) => update({ sort: value === 'createdAt:desc' ? '' : value })}
          options={SORT_OPTIONS}
          className="lg:ml-auto lg:w-48"
        />
      </div>

      {projects.isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-hidden>
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-48 rounded-[var(--radius-card)]" />
          ))}
        </div>
      ) : projects.isError ? (
        <ErrorState error={projects.error} onRetry={() => void projects.refetch()} />
      ) : projects.data.data.length === 0 ? (
        filtered ? (
          <EmptyState
            icon={<SearchX className="size-5" />}
            title="No projects match"
            description={
              values.q
                ? `No projects named like “${values.q}”${status ? ` with status ${PROJECT_STATUS_LABELS[status]}` : ''}.`
                : `No projects are ${status ? PROJECT_STATUS_LABELS[status] : 'in this state'}.`
            }
            action={<Button onClick={clearFilters}>Clear filters</Button>}
            className="rounded-[var(--radius-card)] border border-dashed border-line-strong"
          />
        ) : (
          <EmptyState
            icon={<FolderKanban className="size-5" />}
            title="No projects yet"
            description="Projects group related tasks and show how far along the work is."
            action={
              <Button variant="primary" onClick={() => setCreating(true)}>
                <Plus className="size-4" />
                Create your first project
              </Button>
            }
            className="rounded-[var(--radius-card)] border border-dashed border-line-strong"
          />
        )
      ) : (
        <>
          <div
            className={cn(
              'grid gap-4 transition-opacity duration-150 sm:grid-cols-2 xl:grid-cols-3',
              projects.isPlaceholderData && 'opacity-60',
            )}
          >
            {projects.data.data.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
          <div className="mt-5">
            <Pagination
              meta={projects.data.meta}
              noun="projects"
              onPageChange={(next) => update({ page: next > 1 ? String(next) : '' })}
            />
          </div>
        </>
      )}

      <ProjectFormDialog
        open={creating}
        onOpenChange={setCreating}
        onSaved={(project) => navigate(`/projects/${project.id}`)}
      />
    </Page>
  );
}
