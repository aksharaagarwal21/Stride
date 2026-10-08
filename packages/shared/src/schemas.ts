import { z } from 'zod';
import { isValidDateOnly } from './dates';
import {
  PROJECT_SORT_FIELDS,
  PROJECT_STATUSES,
  SORT_ORDERS,
  TASK_PRIORITIES,
  TASK_SORT_FIELDS,
  TASK_STATUSES,
  type ProjectSortField,
  type ProjectStatus,
  type SortOrder,
  type TaskPriority,
  type TaskSortField,
  type TaskStatus,
} from './enums';

// These schemas run in three places: the API (authoritative), the web forms and the mobile forms.
// Object schemas are strict, so unexpected keys such as `ownerId` or `userId` are rejected.

export const LIMITS = {
  fullName: 100,
  email: 254,
  passwordMin: 8,
  passwordMaxBytes: 72, // bcrypt ignores everything after 72 bytes; reject instead of truncating.
  projectName: 120,
  taskName: 160,
  description: 2000,
  search: 100,
  pageSize: 100,
} as const;

/** UTF-8 byte length without TextEncoder, which older Hermes builds lack. */
export function utf8ByteLength(value: string): number {
  let bytes = 0;
  for (const char of value) {
    const code = char.codePointAt(0) ?? 0;
    bytes += code <= 0x7f ? 1 : code <= 0x7ff ? 2 : code <= 0xffff ? 3 : 4;
  }
  return bytes;
}

const requiredText = (label: string, max: number) =>
  z
    .string({ error: `${label} is required.` })
    .trim()
    .min(1, `${label} is required.`)
    .max(max, `${label} must be ${max} characters or fewer.`);

const descriptionSchema = z
  .string({ error: 'Description must be text.' })
  .trim()
  .max(LIMITS.description, `Description must be ${LIMITS.description} characters or fewer.`);

const dateOnly = (label: string) =>
  z
    .string({ error: `${label} is required.` })
    .trim()
    .min(1, `${label} is required.`)
    .refine(isValidDateOnly, `${label} must be a real date (YYYY-MM-DD).`);

export const idSchema = z.uuid({ error: 'Invalid id.' });
export const idParamSchema = z.strictObject({ id: idSchema });

// ---------- Auth ----------

export const emailSchema = z
  .string({ error: 'Email is required.' })
  .trim()
  .min(1, 'Email is required.')
  .max(LIMITS.email, 'Email is too long.')
  .toLowerCase()
  .pipe(z.email({ error: 'Enter a valid email address.' }));

export const newPasswordSchema = z
  .string({ error: 'Password is required.' })
  .min(LIMITS.passwordMin, `Password must be at least ${LIMITS.passwordMin} characters.`)
  .refine((value) => value.trim().length > 0, 'Password cannot be only spaces.')
  .refine(
    (value) => utf8ByteLength(value) <= LIMITS.passwordMaxBytes,
    'Password is too long (72 bytes maximum).',
  );

export const registerSchema = z.strictObject({
  fullName: requiredText('Full name', LIMITS.fullName),
  email: emailSchema,
  password: newPasswordSchema,
});

export const loginSchema = z.strictObject({
  email: emailSchema,
  // Login only checks presence: existing accounts are judged by the hash comparison.
  password: z
    .string({ error: 'Password is required.' })
    .min(1, 'Password is required.')
    .max(1024, 'Password is too long.'),
});

// ---------- Projects ----------

const projectStatus = z.enum(PROJECT_STATUSES, {
  error: 'Status must be Not Started, In Progress or Completed.',
});

const projectFields = {
  name: requiredText('Project name', LIMITS.projectName),
  description: descriptionSchema,
  status: projectStatus,
  startDate: dateOnly('Start date'),
  endDate: dateOnly('End date'),
};

type DateRange = { startDate?: string; endDate?: string };

/** Adds an `endDate` issue when both dates are present and the end precedes the start. */
function checkDateOrder(value: DateRange, ctx: z.RefinementCtx) {
  // Valid "YYYY-MM-DD" strings compare correctly as text.
  if (value.startDate && value.endDate && value.endDate < value.startDate) {
    ctx.addIssue({
      code: 'custom',
      path: ['endDate'],
      message: 'End date cannot be before the start date.',
    });
  }
}

export const projectCreateSchema = z
  .strictObject({
    ...projectFields,
    description: descriptionSchema.default(''),
    status: projectStatus.default('NOT_STARTED'),
  })
  .superRefine(checkDateOrder);

export const projectUpdateSchema = z
  .strictObject(projectFields)
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'Provide at least one field to update.')
  .superRefine(checkDateOrder);

/** Form schema: every field required, as the create/edit form always submits all of them. */
export const projectFormSchema = z.strictObject(projectFields).superRefine(checkDateOrder);

// ---------- Tasks ----------

const taskStatus = z.enum(TASK_STATUSES, {
  error: 'Status must be Pending, In Progress or Completed.',
});
const taskPriority = z.enum(TASK_PRIORITIES, { error: 'Priority must be Low, Medium or High.' });

const taskFields = {
  name: requiredText('Task name', LIMITS.taskName),
  description: descriptionSchema,
  priority: taskPriority,
  status: taskStatus,
  dueDate: dateOnly('Due date'),
};

export const taskCreateSchema = z.strictObject({
  projectId: z.uuid({ error: 'Choose a project.' }),
  ...taskFields,
  description: descriptionSchema.default(''),
  priority: taskPriority.default('MEDIUM'),
  status: taskStatus.default('PENDING'),
});

// projectId is deliberately absent: a task cannot be moved to another project.
export const taskUpdateSchema = z
  .strictObject(taskFields)
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'Provide at least one field to update.');

export const taskFormSchema = z.strictObject({
  projectId: z.uuid({ error: 'Choose a project.' }),
  ...taskFields,
});

// ---------- Query strings ----------

// Clients may send `?status=` for "any"; treat empty strings as absent.
const blankToUndefined = (value: unknown) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;
const optionalQuery = <T extends z.ZodType>(schema: T) =>
  z.preprocess(blankToUndefined, schema.optional());

const pageQuery = z.coerce
  .number({ error: 'Page must be a number.' })
  .int('Page must be a whole number.')
  .min(1, 'Page must be 1 or greater.')
  .max(100_000, 'Page is too large.')
  .default(1);

const limitQuery = z.coerce
  .number({ error: 'Limit must be a number.' })
  .int('Limit must be a whole number.')
  .min(1, 'Limit must be at least 1.')
  .max(LIMITS.pageSize, `Limit must be ${LIMITS.pageSize} or fewer.`)
  .default(20);

const searchQuery = optionalQuery(
  z.string().trim().max(LIMITS.search, `Search must be ${LIMITS.search} characters or fewer.`),
);

export const projectListQuerySchema = z.strictObject({
  search: searchQuery,
  status: optionalQuery(projectStatus),
  page: pageQuery,
  limit: limitQuery,
  sort: optionalQuery(z.enum(PROJECT_SORT_FIELDS, { error: 'Unsupported sort field.' })),
  order: optionalQuery(z.enum(SORT_ORDERS, { error: 'Order must be asc or desc.' })),
});

export const taskListQuerySchema = z.strictObject({
  search: searchQuery,
  projectId: optionalQuery(idSchema),
  status: optionalQuery(taskStatus),
  priority: optionalQuery(taskPriority),
  page: pageQuery,
  limit: limitQuery,
  sort: optionalQuery(z.enum(TASK_SORT_FIELDS, { error: 'Unsupported sort field.' })),
  order: optionalQuery(z.enum(SORT_ORDERS, { error: 'Order must be asc or desc.' })),
});

export const dashboardQuerySchema = z.strictObject({
  // The client's local calendar day, so "overdue" and "upcoming" match what the user sees.
  today: optionalQuery(dateOnly('Today')),
});

// ---------- Inferred types ----------

export type RegisterInput = z.input<typeof registerSchema>;
export type LoginInput = z.input<typeof loginSchema>;
export type ProjectCreateInput = z.input<typeof projectCreateSchema>;
export type ProjectUpdateInput = z.input<typeof projectUpdateSchema>;
export type ProjectFormValues = z.input<typeof projectFormSchema>;
export type TaskCreateInput = z.input<typeof taskCreateSchema>;
export type TaskUpdateInput = z.input<typeof taskUpdateSchema>;
export type TaskFormValues = z.input<typeof taskFormSchema>;
// Query inputs are declared explicitly: z.preprocess makes the inferred input type `unknown`.
export interface ProjectListQuery {
  search?: string;
  status?: ProjectStatus;
  page?: number;
  limit?: number;
  sort?: ProjectSortField;
  order?: SortOrder;
}
export interface TaskListQuery {
  search?: string;
  projectId?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  page?: number;
  limit?: number;
  sort?: TaskSortField;
  order?: SortOrder;
}
export type ParsedProjectListQuery = z.output<typeof projectListQuerySchema>;
export type ParsedTaskListQuery = z.output<typeof taskListQuerySchema>;
// Parsed (post-default, post-trim) shapes the API works with.
export type RegisterData = z.output<typeof registerSchema>;
export type ProjectCreateData = z.output<typeof projectCreateSchema>;
export type ProjectUpdateData = z.output<typeof projectUpdateSchema>;
export type TaskCreateData = z.output<typeof taskCreateSchema>;
export type TaskUpdateData = z.output<typeof taskUpdateSchema>;
