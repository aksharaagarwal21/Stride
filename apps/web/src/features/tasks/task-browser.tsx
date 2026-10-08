import { useEffect } from 'react';
import { ListChecks, Plus, SearchX } from 'lucide-react';
import {
  TASK_PRIORITIES,
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
  TASK_STATUSES,
  type SortOrder,
  type TaskListQuery,
  type TaskSortField,
} from '@stride/shared';
import { Button } from '../../components/ui/button';
import { FilterSelect, SearchInput } from '../../components/ui/field';
import { Card, EmptyState, ErrorState, Pagination, Skeleton } from '../../components/ui/states';
import { useTasks } from '../../lib/queries';
import { pick, useDebouncedSearch, useUrlFilters } from '../../lib/url-state';
import { TaskDrawer } from './task-forms';
import { TaskTable } from './task-table';

const PAGE_SIZE = 15;

const SORT_OPTIONS = [
  { value: 'dueDate:asc', label: 'Due date (soonest)' },
  { value: 'dueDate:desc', label: 'Due date (latest)' },
  { value: 'priority:desc', label: 'Priority (high first)' },
  { value: 'name:asc', label: 'Name (A–Z)' },
  { value: 'createdAt:desc', label: 'Newest first' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  ...TASK_STATUSES.map((status) => ({ value: status, label: TASK_STATUS_LABELS[status] })),
];
const PRIORITY_OPTIONS = [
  { value: '', label: 'All priorities' },
  ...TASK_PRIORITIES.map((priority) => ({
    value: priority,
    label: TASK_PRIORITY_LABELS[priority],
  })),
];

function TableSkeleton() {
  return (
    <div className="flex flex-col divide-y divide-line" aria-hidden>
      {Array.from({ length: 5 }, (_, index) => (
        <div key={index} className="flex items-center gap-4 px-4 py-3.5">
          <Skeleton className="size-6 rounded-full" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="hidden h-4 w-20 sm:block" />
          <Skeleton className="h-4 w-14" />
        </div>
      ))}
    </div>
  );
}

interface TaskBrowserProps {
  /** Limits the list to one project (project details page). */
  projectId?: string;
  showProject?: boolean;
  onCreate: () => void;
}

/** Search, filters, sorting, pagination and the details drawer for a list of tasks. */
export function TaskBrowser({ projectId, showProject, onCreate }: TaskBrowserProps) {
  const { values, update, page } = useUrlFilters([
    'q',
    'status',
    'priority',
    'sort',
    'task',
  ] as const);
  const [searchText, setSearchText] = useDebouncedSearch(values.q, (q) => update({ q }));

  const status = pick(values.status, TASK_STATUSES);
  const priority = pick(values.priority, TASK_PRIORITIES);
  const sortValue = SORT_OPTIONS.some((option) => option.value === values.sort)
    ? values.sort
    : 'dueDate:asc';
  const [sort, order] = sortValue.split(':') as [TaskSortField, SortOrder];

  const query: TaskListQuery = {
    projectId,
    search: values.q || undefined,
    status,
    priority,
    sort,
    order,
    page,
    limit: PAGE_SIZE,
  };
  const tasks = useTasks(query);
  const filtered = Boolean(values.q || status || priority);
  const keepPage = page > 1 ? String(page) : '';

  // Deleting the last task on the last page would leave an empty page; step back instead.
  const totalPages = tasks.data?.meta.totalPages ?? 0;
  useEffect(() => {
    if (tasks.data && !tasks.isPlaceholderData && page > 1 && page > totalPages) {
      update({ page: totalPages > 1 ? String(totalPages) : '' });
    }
  }, [tasks.data, tasks.isPlaceholderData, page, totalPages, update]);

  function clearFilters() {
    setSearchText('');
    update({ q: '', status: '', priority: '' });
  }

  return (
    <>
      <Card>
        <div className="flex flex-col gap-3 border-b border-line p-3 sm:p-4 lg:flex-row lg:items-center">
          <SearchInput
            label="Search tasks by name"
            placeholder="Search tasks"
            value={searchText}
            onChange={setSearchText}
            className="lg:w-72"
          />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:flex lg:flex-1">
            <FilterSelect
              label="Filter by status"
              value={status ?? ''}
              onChange={(value) => update({ status: value })}
              options={STATUS_OPTIONS}
              className="lg:w-40"
            />
            <FilterSelect
              label="Filter by priority"
              value={priority ?? ''}
              onChange={(value) => update({ priority: value })}
              options={PRIORITY_OPTIONS}
              className="lg:w-40"
            />
            <FilterSelect
              label="Sort tasks"
              value={sortValue}
              onChange={(value) => update({ sort: value === 'dueDate:asc' ? '' : value })}
              options={SORT_OPTIONS}
              className="col-span-2 sm:col-span-1 lg:ml-auto lg:w-48"
            />
          </div>
          {filtered ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="self-start lg:self-auto"
            >
              Clear filters
            </Button>
          ) : null}
        </div>

        {tasks.isPending ? (
          <TableSkeleton />
        ) : tasks.isError ? (
          <ErrorState error={tasks.error} onRetry={() => void tasks.refetch()} />
        ) : tasks.data.data.length === 0 ? (
          filtered ? (
            <EmptyState
              icon={<SearchX className="size-5" />}
              title="No tasks match these filters"
              description={
                values.q
                  ? `Nothing named like “${values.q}” with the selected filters.`
                  : 'Try a different status or priority.'
              }
              action={<Button onClick={clearFilters}>Clear filters</Button>}
            />
          ) : (
            <EmptyState
              icon={<ListChecks className="size-5" />}
              title={projectId ? 'No tasks in this project yet' : 'No tasks yet'}
              description={
                projectId
                  ? 'Break the project into tasks to track progress.'
                  : 'Tasks you add to your projects show up here.'
              }
              action={
                <Button variant="primary" onClick={onCreate}>
                  <Plus className="size-4" />
                  New task
                </Button>
              }
            />
          )
        ) : (
          <TaskTable
            tasks={tasks.data.data}
            showProject={showProject}
            stale={tasks.isPlaceholderData}
            onOpen={(id) => update({ task: id, page: keepPage })}
          />
        )}

        {tasks.data && tasks.data.meta.total > 0 ? (
          <div className="border-t border-line px-4 py-3">
            <Pagination
              meta={tasks.data.meta}
              noun="tasks"
              onPageChange={(next) => update({ page: next > 1 ? String(next) : '' })}
            />
          </div>
        ) : null}
      </Card>
      <TaskDrawer
        taskId={values.task || null}
        onClose={() => update({ task: '', page: keepPage })}
      />
    </>
  );
}
