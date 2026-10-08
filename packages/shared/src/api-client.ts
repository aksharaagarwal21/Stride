import type {
  LoginInput,
  ProjectCreateInput,
  ProjectListQuery,
  ProjectUpdateInput,
  RegisterInput,
  TaskCreateInput,
  TaskListQuery,
  TaskUpdateInput,
} from './schemas';
import type {
  ApiErrorBody,
  AuthResponse,
  Dashboard,
  Paginated,
  Project,
  Task,
  User,
} from './types';

/** Selects how the session travels: an HttpOnly cookie (web) or a bearer token (mobile). */
export type ClientPlatform = 'web' | 'mobile';

export const CLIENT_PLATFORM_HEADER = 'X-Client-Platform';

export interface ApiClientOptions {
  /** '' for same-origin web requests, or an absolute origin such as https://stride.example.com */
  baseUrl: string;
  platform: ClientPlatform;
  /** Mobile only: reads the bearer token from secure storage. */
  getToken?: () => Promise<string | null> | string | null;
  /** Called when an authenticated request returns 401 (expired or revoked session). */
  onUnauthorized?: (error: ApiError) => void;
  timeoutMs?: number;
  credentials?: 'omit' | 'same-origin' | 'include';
}

/**
 * Every failure surfaces as an ApiError. `status` is 0 for transport failures, so callers can
 * tell "offline" (NETWORK_ERROR / TIMEOUT) apart from "signed out" (401).
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fields: Record<string, string>;

  constructor(status: number, code: string, message: string, fields: Record<string, string> = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fields = fields;
  }

  get isNetworkError(): boolean {
    return this.code === 'NETWORK_ERROR' || this.code === 'TIMEOUT';
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

type QueryValue = string | number | boolean | undefined | null;
type QueryParams = { [key: string]: QueryValue };

/** Builds a query string by hand; React Native's URLSearchParams is incomplete. */
export function toQueryString(query: QueryParams = {}): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue;
    parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
  }
  return parts.length ? `?${parts.join('&')}` : '';
}

interface RequestOptions {
  body?: unknown;
  query?: object;
  signal?: AbortSignal;
  /** Login/register return 401 for bad credentials, which is not an expired session. */
  skipUnauthorizedHandler?: boolean;
}

export function createApiClient(options: ApiClientOptions) {
  const timeoutMs = options.timeoutMs ?? 15_000;
  const baseUrl = options.baseUrl.replace(/\/+$/, '');

  async function request<T>(method: string, path: string, init: RequestOptions = {}): Promise<T> {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (init.body !== undefined) headers['Content-Type'] = 'application/json';
    if (options.platform === 'mobile') {
      headers[CLIENT_PLATFORM_HEADER] = 'mobile';
      const token = options.getToken ? await options.getToken() : null;
      if (token) headers.Authorization = `Bearer ${token}`;
    }

    // Combine the caller's signal (e.g. TanStack Query cancellation) with a timeout.
    // AbortSignal.any is not available on every React Native runtime, so wire it manually.
    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);
    const onCallerAbort = () => controller.abort();
    init.signal?.addEventListener('abort', onCallerAbort);

    let response: Response;
    try {
      response = await fetch(
        `${baseUrl}/api${path}${toQueryString(init.query as QueryParams | undefined)}`,
        {
          method,
          headers,
          body: init.body === undefined ? undefined : JSON.stringify(init.body),
          credentials: options.credentials ?? 'same-origin',
          signal: controller.signal,
        },
      );
    } catch (error) {
      if (timedOut) {
        throw new ApiError(0, 'TIMEOUT', 'The server took too long to respond. Try again.');
      }
      if (init.signal?.aborted) throw error; // Cancelled by the caller; let it propagate.
      throw new ApiError(
        0,
        'NETWORK_ERROR',
        "Can't reach Stride. Check your connection and try again.",
      );
    } finally {
      clearTimeout(timer);
      init.signal?.removeEventListener('abort', onCallerAbort);
    }

    if (response.status === 204) return undefined as T;

    const isJson = (response.headers.get('content-type') ?? '').includes('application/json');
    const payload: unknown = isJson ? await response.json().catch(() => null) : null;

    if (!response.ok) {
      const body = payload as Partial<ApiErrorBody> | null;
      const error = body?.error
        ? new ApiError(response.status, body.error.code, body.error.message, body.error.fields)
        : new ApiError(
            response.status,
            'UNEXPECTED_RESPONSE',
            `The server responded with status ${response.status}.`,
          );
      if (error.status === 401 && !init.skipUnauthorizedHandler) options.onUnauthorized?.(error);
      throw error;
    }

    if (!isJson) {
      throw new ApiError(
        response.status,
        'UNEXPECTED_RESPONSE',
        'The server returned an unexpected response.',
      );
    }
    return payload as T;
  }

  return {
    request,
    auth: {
      register: (input: RegisterInput) =>
        request<AuthResponse>('POST', '/auth/register', {
          body: input,
          skipUnauthorizedHandler: true,
        }),
      login: (input: LoginInput) =>
        request<AuthResponse>('POST', '/auth/login', {
          body: input,
          skipUnauthorizedHandler: true,
        }),
      logout: () => request<void>('POST', '/auth/logout', { skipUnauthorizedHandler: true }),
      me: (signal?: AbortSignal) => request<{ user: User }>('GET', '/auth/me', { signal }),
    },
    projects: {
      list: (query: ProjectListQuery = {}, signal?: AbortSignal) =>
        request<Paginated<Project>>('GET', '/projects', { query, signal }),
      get: (id: string, signal?: AbortSignal) =>
        request<{ project: Project }>('GET', `/projects/${encodeURIComponent(id)}`, { signal }),
      create: (input: ProjectCreateInput) =>
        request<{ project: Project }>('POST', '/projects', { body: input }),
      update: (id: string, input: ProjectUpdateInput) =>
        request<{ project: Project }>('PUT', `/projects/${encodeURIComponent(id)}`, {
          body: input,
        }),
      remove: (id: string) => request<void>('DELETE', `/projects/${encodeURIComponent(id)}`),
    },
    tasks: {
      list: (query: TaskListQuery = {}, signal?: AbortSignal) =>
        request<Paginated<Task>>('GET', '/tasks', { query, signal }),
      get: (id: string, signal?: AbortSignal) =>
        request<{ task: Task }>('GET', `/tasks/${encodeURIComponent(id)}`, { signal }),
      create: (input: TaskCreateInput) =>
        request<{ task: Task }>('POST', '/tasks', { body: input }),
      update: (id: string, input: TaskUpdateInput) =>
        request<{ task: Task }>('PUT', `/tasks/${encodeURIComponent(id)}`, { body: input }),
      remove: (id: string) => request<void>('DELETE', `/tasks/${encodeURIComponent(id)}`),
    },
    dashboard: {
      get: (today?: string, signal?: AbortSignal) =>
        request<Dashboard>('GET', '/dashboard', { query: { today }, signal }),
    },
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
