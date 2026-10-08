import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  ApiError,
  isApiError,
  type LoginInput,
  type RegisterInput,
  type User,
} from '@stride/shared';
import { api, setApiToken, setUnauthorizedListener } from './api';
import { clearSession, readSession, writeSession } from './session-storage';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';
export type AuthNotice = 'expired' | 'signed-out' | 'signed-out-offline';

interface AuthContextValue {
  status: AuthStatus;
  user: User | null;
  notice: AuthNotice | null;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<User | null>(null);
  const [notice, setNotice] = useState<AuthNotice | null>(null);

  const signOutLocally = useCallback(
    async (reason: AuthNotice) => {
      setApiToken(null);
      await clearSession();
      queryClient.clear(); // No user-specific data survives a sign-out.
      setUser(null);
      setNotice(reason);
      setStatus('unauthenticated');
    },
    [queryClient],
  );

  // A 401 on any authenticated request = expired or revoked session → back to login.
  // Network errors never reach this listener, so going offline keeps the user signed in.
  useEffect(() => {
    setUnauthorizedListener(() => void signOutLocally('expired'));
    return () => setUnauthorizedListener(null);
  }, [signOutLocally]);

  // Restore the session from secure storage and confirm it with the server.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stored = await readSession();
      if (cancelled) return;
      if (!stored) {
        setStatus('unauthenticated');
        return;
      }
      setApiToken(stored.token);
      try {
        const { user: fresh } = await api.auth.me();
        if (cancelled) return;
        setUser(fresh);
        setStatus('authenticated');
        writeSession(stored.token, fresh).catch(() => undefined);
      } catch (error) {
        if (cancelled || (isApiError(error) && error.isUnauthorized)) return; // Listener handled it.
        // Offline or server unreachable: keep the token and open the app with the saved
        // profile. Screens show an offline state; the next request re-validates the token.
        setUser(stored.user);
        setStatus('authenticated');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const startSession = useCallback(
    async (token: string | undefined, nextUser: User) => {
      if (!token) throw new ApiError(500, 'NO_TOKEN', 'The server did not return a session.');
      try {
        await writeSession(token, nextUser);
      } catch {
        throw new ApiError(
          0,
          'STORAGE_ERROR',
          "Couldn't save your sign-in securely on this device.",
        );
      }
      setApiToken(token);
      queryClient.clear();
      setUser(nextUser);
      setNotice(null);
      setStatus('authenticated');
    },
    [queryClient],
  );

  const login = useCallback(
    async (input: LoginInput) => {
      const result = await api.auth.login(input);
      await startSession(result.token, result.user);
    },
    [startSession],
  );

  const register = useCallback(
    async (input: RegisterInput) => {
      const result = await api.auth.register(input);
      await startSession(result.token, result.user);
    },
    [startSession],
  );

  const logout = useCallback(async () => {
    // Revoke the session on the server when reachable. Either way the token is removed from
    // this device — but we only say the session was ended everywhere if the server confirmed.
    let confirmed = true;
    try {
      await api.auth.logout();
    } catch {
      confirmed = false;
    }
    await signOutLocally(confirmed ? 'signed-out' : 'signed-out-offline');
  }, [signOutLocally]);

  const value = useMemo(
    () => ({ status, user, notice, login, register, logout }),
    [status, user, notice, login, register, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}
