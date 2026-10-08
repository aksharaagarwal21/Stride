import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import {
  localToday,
  queryKeys,
  type ProjectCreateInput,
  type ProjectListQuery,
  type ProjectUpdateInput,
  type TaskCreateInput,
  type TaskListQuery,
  type TaskUpdateInput,
} from '@stride/shared';
import { api } from './api';

const PAGE_SIZE = 20;

/** Every write refreshes lists, details and dashboard totals (same rule as the web app). */
export function invalidateWorkspace(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.projects }),
    queryClient.invalidateQueries({ queryKey: queryKeys.tasks }),
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboardAll }),
  ]);
}

export function useDashboard() {
  const today = localToday();
  return useQuery({
    queryKey: queryKeys.dashboard(today),
    queryFn: ({ signal }) => api.dashboard.get(today, signal),
  });
}

// Lists load page by page as the user scrolls (FlatList onEndReached).
export function useProjectList(query: Omit<ProjectListQuery, 'page' | 'limit'>) {
  return useInfiniteQuery({
    queryKey: ['projects', 'infinite', query],
    queryFn: ({ pageParam, signal }) =>
      api.projects.list({ ...query, page: pageParam, limit: PAGE_SIZE }, signal),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.meta.page < last.meta.totalPages ? last.meta.page + 1 : undefined,
  });
}

export function useTaskList(query: Omit<TaskListQuery, 'page' | 'limit'>) {
  return useInfiniteQuery({
    queryKey: ['tasks', 'infinite', query],
    queryFn: ({ pageParam, signal }) =>
      api.tasks.list({ ...query, page: pageParam, limit: PAGE_SIZE }, signal),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.meta.page < last.meta.totalPages ? last.meta.page + 1 : undefined,
  });
}

export function useProject(id: string) {
  return useQuery({
    queryKey: queryKeys.project(id),
    queryFn: ({ signal }) => api.projects.get(id, signal).then((res) => res.project),
    enabled: Boolean(id),
  });
}

export function useTask(id: string) {
  return useQuery({
    queryKey: queryKeys.task(id),
    queryFn: ({ signal }) => api.tasks.get(id, signal).then((res) => res.task),
    enabled: Boolean(id),
  });
}

/** Projects for the task form's project picker (alphabetical, up to 100). */
export function useProjectOptions() {
  return useQuery({
    queryKey: queryKeys.projectList({ limit: 100, sort: 'name', order: 'asc' }),
    queryFn: ({ signal }) => api.projects.list({ limit: 100, sort: 'name', order: 'asc' }, signal),
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: TaskCreateInput) => api.tasks.create(input).then((res) => res.task),
    onSuccess: () => invalidateWorkspace(queryClient),
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: TaskUpdateInput }) =>
      api.tasks.update(id, input).then((res) => res.task),
    onSuccess: (task) => {
      queryClient.setQueryData(queryKeys.task(task.id), task);
      return invalidateWorkspace(queryClient);
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.tasks.remove(id),
    onSuccess: () => void invalidateWorkspace(queryClient),
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ProjectCreateInput) =>
      api.projects.create(input).then((res) => res.project),
    onSuccess: () => invalidateWorkspace(queryClient),
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ProjectUpdateInput }) =>
      api.projects.update(id, input).then((res) => res.project),
    onSuccess: () => invalidateWorkspace(queryClient),
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.projects.remove(id),
    onSuccess: () => void invalidateWorkspace(queryClient),
  });
}
