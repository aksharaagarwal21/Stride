import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  isApiError,
  queryKeys,
  type LoginInput,
  type RegisterInput,
  type User,
} from '@stride/shared';
import { api, onUnauthorized } from '../lib/api';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'error';
export type AuthNotice = 'expired' | 'signed-out';

interface AuthContextValue {
  user: User | null;
  status: AuthStatus;
  /** Why the user is looking at the login screen (shown there once). */
  notice: AuthNotice | null;
  error: unknown;
  retry: () => void;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * The session lives in an HttpOnly cookie, so the browser cannot inspect it. On load we ask
 * `/auth/me`; until it answers, protected screens render a splash instead of flashing content.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [notice, setNotice] = useState<AuthNotice | null>(null);

  const me = useQuery({
    queryKey: queryKeys.me,
    queryFn: async ({ signal }) => {
      try {
        return (await api.auth.me(signal)).user;
      } catch (error) {
        if (isApiError(error) && error.status === 401) return null; // Simply not signed in.
        throw error;
      }
    },
    staleTime: Infinity,
    retry: (count, error) => isApiError(error) && error.isNetworkError && count < 2,
  });

  /** Drops every user-specific cached query and records the new signed-in user (or none). */
  const resetCache = useCallback(
    (user: User | null) => {
      void queryClient.cancelQueries();
      queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== 'auth' });
      queryClient.setQueryData(queryKeys.me, user);
    },
    [queryClient],
  );

  // Any 401 on an authenticated request means the session expired or was revoked elsewhere.
  // Network failures never reach here, so being offline does not sign anyone out.
  // Clearing the user makes <RequireAuth> redirect to /login, remembering the current page.
  useEffect(
    () =>
      onUnauthorized(() => {
        if (!queryClient.getQueryData(queryKeys.me)) return;
        setNotice('expired');
        resetCache(null);
      }),
    [queryClient, resetCache],
  );

  const login = useCallback(
    async (input: LoginInput) => {
      const { user } = await api.auth.login(input);
      setNotice(null);
      resetCache(user);
    },
    [resetCache],
  );

  const register = useCallback(
    async (input: RegisterInput) => {
      const { user } = await api.auth.register(input);
      setNotice(null);
      resetCache(user);
    },
    [resetCache],
  );

  const logout = useCallback(async () => {
    // If this throws (offline), the cookie is still valid, so the user stays signed in and
    // sees an error rather than a false "signed out".
    await api.auth.logout();
    setNotice('signed-out');
    resetCache(null);
  }, [resetCache]);

  const status: AuthStatus = me.isPending
    ? 'loading'
    : me.isError
      ? 'error'
      : me.data
        ? 'authenticated'
        : 'unauthenticated';

  const value = useMemo<AuthContextValue>(
    () => ({
      user: me.data ?? null,
      status,
      notice,
      error: me.error,
      retry: () => void me.refetch(),
      login,
      register,
      logout,
    }),
    [me, status, notice, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}

/** Same as useAuth, but for screens that only render while signed in. */
export function useCurrentUser(): User {
  const { user } = useAuth();
  if (!user) throw new Error('useCurrentUser called without a signed-in user');
  return user;
}
