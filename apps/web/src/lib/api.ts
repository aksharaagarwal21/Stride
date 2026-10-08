import { createApiClient, type ApiError } from '@stride/shared';

type UnauthorizedListener = (error: ApiError) => void;
const listeners = new Set<UnauthorizedListener>();

/** Lets the auth provider react when any authenticated request comes back 401. */
export function onUnauthorized(listener: UnauthorizedListener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const baseUrl = import.meta.env.VITE_API_URL ?? '';

// Web transport: the HttpOnly session cookie is sent automatically; no token touches JS.
export const api = createApiClient({
  baseUrl,
  platform: 'web',
  // A separately hosted web app needs cross-site credentials; same-origin is the default.
  credentials: baseUrl ? 'include' : 'same-origin',
  onUnauthorized: (error) => listeners.forEach((listener) => listener(error)),
});
