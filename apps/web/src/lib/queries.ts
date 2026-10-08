import {
  keepPreviousData,
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

/**
 * Any project or task write can change lists, details, counts and dashboard totals, so every
 * mutation refreshes all three families. Writes are pessimistic: the UI changes only after the
 * server confirms, which keeps success messages honest.
 */
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

export function useProjects(query: ProjectListQuery) {
  return useQuery({
    queryKey: queryKeys.projectList(query),
    queryFn: ({ signal }) => api.projects.list(query, signal),
    // Keep showing the previous page while the next search/filter loads; responses are keyed by
    // their query, so a slow older request can never overwrite a newer result.
    placeholderData: keepPreviousData,
  });
}

export function useProject(id: string) {
  return useQuery({
    queryKey: queryKeys.project(id),
    queryFn: ({ signal }) => api.projects.get(id, signal).then((res) => res.project),
  });
}

export function useTasks(query: TaskListQuery, enabled = true) {
  return useQuery({
    queryKey: queryKeys.taskList(query),
    queryFn: ({ signal }) => api.tasks.list(query, signal),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useTask(id: string | null) {
  return useQuery({
    queryKey: queryKeys.task(id ?? ''),
    queryFn: ({ signal }) => api.tasks.get(id as string, signal).then((res) => res.task),
    enabled: Boolean(id),
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
    // Not awaited: the caller navigates away from the deleted record first, so the refetch
    // does not briefly render a "not found" state for it.
    onSuccess: () => void invalidateWorkspace(queryClient),
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
    onSuccess: () => invalidateWorkspace(queryClient),
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.tasks.remove(id),
    onSuccess: () => void invalidateWorkspace(queryClient),
  });
}
