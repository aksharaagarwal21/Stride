import { createContext, useContext, useState } from 'react';
import { FolderKanban, LayoutDashboard, ListChecks, LogOut } from 'lucide-react';
import { NavLink, Outlet, useLocation } from 'react-router';
import { toast } from 'sonner';
import { useCurrentUser, useAuth } from '../../auth/auth-context';
import { cn, errorMessage, initials } from '../../lib/utils';
import { Button } from '../ui/button';
import { Sheet } from '../ui/overlays';
import { Logo } from './logo';

const NAV = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/projects', label: 'Projects', icon: FolderKanban, end: false },
  { to: '/tasks', label: 'My Tasks', icon: ListChecks, end: false },
] as const;

const ShellContext = createContext<{ openNav: () => void }>({ openNav: () => undefined });
export const useShell = () => useContext(ShellContext);

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const user = useCurrentUser();
  const { logout } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  async function handleLogout() {
    setSigningOut(true);
    try {
      await logout();
    } catch (error) {
      toast.error(`Couldn't sign out: ${errorMessage(error)}`);
      setSigningOut(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center px-5">
        <Logo />
      </div>
      <nav aria-label="Main" className="flex-1 px-3 py-2">
        <ul className="flex flex-col gap-0.5">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    'flex h-10 items-center gap-3 rounded-[10px] px-3 text-sm font-medium transition-colors duration-150',
                    isActive
                      ? 'bg-primary-soft text-primary-strong'
                      : 'text-ink-2 hover:bg-subtle hover:text-ink',
                  )
                }
              >
                <Icon className="size-[18px]" aria-hidden />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <div className="border-t border-line p-3">
        <div className="flex items-center gap-3 rounded-[10px] px-2 py-2">
          <span
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-[13px] font-semibold text-primary-strong"
            aria-hidden
          >
            {initials(user.fullName)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium" title={user.fullName}>
              {user.fullName}
            </p>
            <p className="truncate text-xs text-ink-2" title={user.email}>
              {user.email}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleLogout}
            loading={signingOut}
            aria-label="Log out"
            title="Log out"
          >
            {signingOut ? null : <LogOut className="size-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Fixed 232px sidebar on desktop; a slide-in drawer below the lg breakpoint. */
export function AppShell() {
  const [navOpen, setNavOpen] = useState(false);
  const location = useLocation();
  const [lastPath, setLastPath] = useState(location.pathname);
  // Close the drawer whenever the route changes.
  if (lastPath !== location.pathname) {
    setLastPath(location.pathname);
    if (navOpen) setNavOpen(false);
  }

  return (
    <ShellContext.Provider value={{ openNav: () => setNavOpen(true) }}>
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-surface px-3 py-2 focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      <div className="min-h-dvh lg:pl-[232px]">
        <aside className="fixed inset-y-0 left-0 hidden w-[232px] border-r border-line bg-surface lg:block">
          <SidebarContent />
        </aside>
        <Sheet open={navOpen} onOpenChange={setNavOpen} title="Navigation" side="left" hideHeader>
          <SidebarContent onNavigate={() => setNavOpen(false)} />
        </Sheet>
        <main id="main" className="min-w-0">
          <Outlet />
        </main>
      </div>
    </ShellContext.Provider>
  );
}
