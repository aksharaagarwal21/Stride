import type { ProjectListQuery, TaskListQuery } from './schemas';

// Query keys shared by the web and mobile TanStack Query caches. Plain arrays, no React import.
// Mutations invalidate by prefix: e.g. ['projects'] refreshes every project list and detail.
export const queryKeys = {
  me: ['auth', 'me'] as const,
  dashboard: (today: string) => ['dashboard', today] as const,
  dashboardAll: ['dashboard'] as const,
  projects: ['projects'] as const,
  projectList: (query: ProjectListQuery) => ['projects', 'list', query] as const,
  project: (id: string) => ['projects', 'detail', id] as const,
  tasks: ['tasks'] as const,
  taskList: (query: TaskListQuery) => ['tasks', 'list', query] as const,
  task: (id: string) => ['tasks', 'detail', id] as const,
};
