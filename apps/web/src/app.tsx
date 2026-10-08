import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createBrowserRouter, Link, Outlet, RouterProvider } from 'react-router';
import { Toaster } from 'sonner';
import { isApiError } from '@stride/shared';
import { AuthProvider } from './auth/auth-context';
import { GuestOnly, RequireAuth } from './auth/guards';
import { AppShell } from './components/layout/app-shell';
import { Logo } from './components/layout/logo';
import { buttonClasses } from './components/ui/button';
import { LoginPage } from './features/auth/login-page';
import { RegisterPage } from './features/auth/register-page';
import { DashboardPage } from './features/dashboard/dashboard-page';
import { ProjectDetailPage } from './features/projects/project-detail-page';
import { ProjectsPage } from './features/projects/projects-page';
import { MyTasksPage } from './features/tasks/my-tasks-page';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // Reads retry only on transport failures; 4xx responses are final.
      retry: (failureCount, error) => isApiError(error) && error.isNetworkError && failureCount < 2,
      refetchOnWindowFocus: true,
    },
    // Writes are never retried automatically, so a create cannot be duplicated.
    mutations: { retry: false },
  },
});

function NotFoundPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
      <Logo />
      <h1 className="mt-4 text-2xl font-bold">Page not found</h1>
      <p className="text-sm text-ink-2">The page you are looking for does not exist.</p>
      <Link to="/" className={buttonClasses('primary')}>
        Back to Overview
      </Link>
    </div>
  );
}

function Root() {
  return (
    <AuthProvider>
      <Outlet />
      <Toaster
        position="bottom-right"
        toastOptions={{
          className: 'font-sans',
          style: {
            borderRadius: 12,
            border: '1px solid var(--color-line)',
            color: 'var(--color-ink)',
          },
        }}
      />
    </AuthProvider>
  );
}

const router = createBrowserRouter([
  {
    element: <Root />,
    children: [
      {
        element: <GuestOnly />,
        children: [
          { path: '/login', element: <LoginPage /> },
          { path: '/register', element: <RegisterPage /> },
        ],
      },
      {
        element: (
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        ),
        children: [
          { index: true, element: <DashboardPage /> },
          { path: '/projects', element: <ProjectsPage /> },
          { path: '/projects/:projectId', element: <ProjectDetailPage /> },
          { path: '/tasks', element: <MyTasksPage /> },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
