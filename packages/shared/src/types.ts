import type { ProjectStatus, TaskPriority, TaskStatus } from './enums';

// Response shapes returned by the API. Dates are "YYYY-MM-DD"; timestamps are ISO-8601 UTC.

export interface User {
  id: string;
  fullName: string;
  email: string;
  createdAt: string;
}

export interface AuthResponse {
  user: User;
  /** When the session (cookie or bearer token) stops being accepted. */
  expiresAt: string;
  /** Only present for native clients that sent `X-Client-Platform: mobile`. */
  token?: string;
}

export interface TaskCounts {
  total: number;
  completed: number;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  startDate: string;
  endDate: string;
  createdAt: string;
  updatedAt: string;
  taskCounts: TaskCounts;
}

export interface ProjectRef {
  id: string;
  name: string;
}

export interface Task {
  id: string;
  projectId: string;
  project: ProjectRef;
  name: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Paginated<T> {
  data: T[];
  meta: PageMeta;
}

export interface DashboardMetrics {
  totalProjects: number;
  totalTasks: number;
  completedTasks: number;
  /** Tasks whose status is exactly PENDING (In Progress tasks are counted separately). */
  pendingTasks: number;
  inProgressTasks: number;
  projectsInProgress: number;
  /** Incomplete tasks due before `today`. */
  overdueTasks: number;
}

export interface Dashboard {
  today: string;
  metrics: DashboardMetrics;
  /** Up to 5 projects that are not completed, soonest end date first. */
  activeProjects: Project[];
  /** Up to 6 incomplete tasks ordered by due date; overdue ones come first. */
  upcomingTasks: Task[];
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    fields?: Record<string, string>;
  };
}
