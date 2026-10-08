import type { ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import { Logo } from '../components/layout/logo';
import { ErrorState } from '../components/ui/states';
import { useAuth } from './auth-context';

function Splash() {
  return (
    <div
      className="flex min-h-dvh flex-col items-center justify-center gap-4"
      role="status"
      aria-label="Loading Stride"
    >
      <Logo />
      <div className="h-1 w-24 overflow-hidden rounded-full bg-subtle">
        <div className="h-full w-1/3 animate-pulse rounded-full bg-primary" />
      </div>
    </div>
  );
}

function ConnectionError() {
  const { error, retry } = useAuth();
  return (
    <div className="flex min-h-dvh items-center justify-center p-4">
      <ErrorState error={error} onRetry={retry} />
    </div>
  );
}

/** Renders protected routes only once the session is confirmed. */
export function RequireAuth({ children }: { children?: ReactNode }) {
  const { status, notice } = useAuth();
  const location = useLocation();
  if (status === 'loading') return <Splash />;
  if (status === 'error') return <ConnectionError />;
  if (status === 'unauthenticated') {
    // Remember the page so signing back in returns to it — except after a deliberate sign-out.
    const state =
      notice === 'signed-out' ? undefined : { from: location.pathname + location.search };
    return <Navigate to="/login" replace state={state} />;
  }
  return children ?? <Outlet />;
}

/** Login/register. The single place that redirects after signing in (avoids racing redirects). */
export function GuestOnly() {
  const { status } = useAuth();
  const location = useLocation();
  if (status === 'loading') return <Splash />;
  if (status === 'authenticated') {
    const from = (location.state as { from?: string } | null)?.from;
    return <Navigate to={from?.startsWith('/') ? from : '/'} replace />;
  }
  return <Outlet />;
}
