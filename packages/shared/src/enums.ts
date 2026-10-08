// Enum values match the PostgreSQL enums; labels match the wording in the assignment.

export const PROJECT_STATUSES = ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const TASK_STATUSES = ['PENDING', 'IN_PROGRESS', 'COMPLETED'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  NOT_STARTED: 'Not Started',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  PENDING: 'Pending',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
};

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
};

// Whitelisted sort fields. The API maps these to ORM order clauses; they never reach SQL as text.
export const PROJECT_SORT_FIELDS = ['createdAt', 'name', 'startDate', 'endDate', 'status'] as const;
export type ProjectSortField = (typeof PROJECT_SORT_FIELDS)[number];

export const TASK_SORT_FIELDS = ['createdAt', 'dueDate', 'name', 'priority', 'status'] as const;
export type TaskSortField = (typeof TASK_SORT_FIELDS)[number];

export const SORT_ORDERS = ['asc', 'desc'] as const;
export type SortOrder = (typeof SORT_ORDERS)[number];

export const PROJECT_SORT_LABELS: Record<ProjectSortField, string> = {
  createdAt: 'Created date',
  name: 'Name',
  startDate: 'Start date',
  endDate: 'End date',
  status: 'Status',
};

export const TASK_SORT_LABELS: Record<TaskSortField, string> = {
  createdAt: 'Created date',
  dueDate: 'Due date',
  name: 'Name',
  priority: 'Priority',
  status: 'Status',
};
