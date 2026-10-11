import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, createApiClient } from './api-client';

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
});

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

/** A fetch that never answers and rejects like the real one once its signal aborts. */
const hangingFetch: typeof fetch = (_input, init) =>
  new Promise((_resolve, reject) => {
    init?.signal?.addEventListener('abort', () =>
      reject(new DOMException('The operation was aborted.', 'AbortError')),
    );
  });

async function caught(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error('Expected the request to fail');
}

describe('createApiClient', () => {
  it('sends mobile requests with the platform header and bearer token', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { items: [] }));
    const api = createApiClient({
      baseUrl: 'https://stride.example.com/',
      platform: 'mobile',
      getToken: async () => 'token-123',
    });

    await api.projects.list({ search: 'launch', page: 2 });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://stride.example.com/api/projects?search=launch&page=2',
      expect.objectContaining({
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'X-Client-Platform': 'mobile',
          Authorization: 'Bearer token-123',
        },
      }),
    );
  });

  it('sends web requests without a token and with a JSON body', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(201, { project: { id: 'p1' } }));
    const api = createApiClient({ baseUrl: '', platform: 'web' });

    await api.projects.create({ name: 'Launch', startDate: '2026-10-01', endDate: '2026-10-31' });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/projects',
      expect.objectContaining({
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Launch', startDate: '2026-10-01', endDate: '2026-10-31' }),
        credentials: 'same-origin',
      }),
    );
  });

  it('turns an error body into an ApiError with its field messages', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(400, {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Check the form.',
          fields: { name: 'Required' },
        },
      }),
    );
    const api = createApiClient({ baseUrl: '', platform: 'web' });

    const error = await caught(api.tasks.get('t1'));

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 400,
      code: 'VALIDATION_ERROR',
      message: 'Check the form.',
      fields: { name: 'Required' },
    });
  });

  it('reports an expired session, but not a failed login, to onUnauthorized', async () => {
    const unauthorized = () =>
      jsonResponse(401, { error: { code: 'UNAUTHORIZED', message: 'Sign in again.' } });
    fetchMock.mockResolvedValueOnce(unauthorized()).mockResolvedValueOnce(unauthorized());
    const onUnauthorized = vi.fn();
    const api = createApiClient({ baseUrl: '', platform: 'web', onUnauthorized });

    const expired = await caught(api.auth.me());
    await caught(api.auth.login({ email: 'ava@example.com', password: 'wrong-password' }));

    expect(onUnauthorized).toHaveBeenCalledTimes(1);
    expect(onUnauthorized).toHaveBeenCalledWith(expired);
    expect((expired as ApiError).isUnauthorized).toBe(true);
  });

  it('resolves 204 responses to undefined', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    const api = createApiClient({ baseUrl: '', platform: 'web' });

    await expect(api.projects.remove('p1')).resolves.toBeUndefined();
  });

  it('rejects responses that are not JSON', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response('<html></html>', { status: 200 }))
      .mockResolvedValueOnce(new Response('Bad gateway', { status: 502 }));
    const api = createApiClient({ baseUrl: '', platform: 'web' });

    expect(await caught(api.dashboard.get())).toMatchObject({
      status: 200,
      code: 'UNEXPECTED_RESPONSE',
    });
    expect(await caught(api.dashboard.get())).toMatchObject({
      status: 502,
      code: 'UNEXPECTED_RESPONSE',
    });
  });

  it('reports an unreachable server as a network error with status 0', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    const api = createApiClient({ baseUrl: '', platform: 'web' });

    const error = await caught(api.auth.me());

    expect(error).toMatchObject({ status: 0, code: 'NETWORK_ERROR', isNetworkError: true });
  });

  it('gives up on a slow server with a TIMEOUT error', async () => {
    fetchMock.mockImplementationOnce(hangingFetch);
    const api = createApiClient({ baseUrl: '', platform: 'web', timeoutMs: 10 });

    const error = await caught(api.auth.me());

    expect(error).toMatchObject({ status: 0, code: 'TIMEOUT', isNetworkError: true });
  });

  it('lets a cancellation by the caller through unchanged', async () => {
    fetchMock.mockImplementationOnce(hangingFetch);
    const api = createApiClient({ baseUrl: '', platform: 'web' });
    const controller = new AbortController();

    const pending = caught(api.projects.get('p1', controller.signal));
    controller.abort();
    const error = await pending;

    expect(error).not.toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ name: 'AbortError' });
  });
});
