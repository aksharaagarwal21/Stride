import type { ReactNode } from 'react';
import { useIsFetching, useQueryClient } from '@tanstack/react-query';
import { ChevronRight, Menu, RefreshCw } from 'lucide-react';
import { Link } from 'react-router';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import { useShell } from './app-shell';

export interface Crumb {
  label: string;
  to?: string;
}

interface PageProps {
  breadcrumbs: Crumb[];
  title: ReactNode;
  description?: ReactNode;
  /** The page's primary action (e.g. New project), shown in the top bar. */
  action?: ReactNode;
  /** Secondary actions shown beside the title. */
  titleActions?: ReactNode;
  children: ReactNode;
}

function RefreshButton() {
  const queryClient = useQueryClient();
  const fetching = useIsFetching({ predicate: (query) => query.queryKey[0] !== 'auth' }) > 0;
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() =>
        void queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] !== 'auth' })
      }
      aria-label="Refresh data"
      title="Refresh data"
    >
      <RefreshCw className={cn('size-4', fetching && 'animate-spin')} aria-hidden />
    </Button>
  );
}

export function Page({
  breadcrumbs,
  title,
  description,
  action,
  titleActions,
  children,
}: PageProps) {
  const { openNav } = useShell();
  return (
    <>
      <header className="sticky top-0 z-30 border-b border-line bg-canvas/90 backdrop-blur supports-[backdrop-filter]:bg-canvas/80">
        <div className="mx-auto flex h-16 max-w-[1240px] items-center gap-2 px-4 sm:px-6 lg:px-8">
          <Button
            variant="ghost"
            size="icon"
            className="-ml-2 lg:hidden"
            onClick={openNav}
            aria-label="Open navigation"
          >
            <Menu className="size-5" />
          </Button>
          <nav aria-label="Breadcrumb" className="min-w-0 flex-1">
            <ol className="flex min-w-0 items-center gap-1 text-sm">
              {breadcrumbs.map((crumb, index) => {
                const last = index === breadcrumbs.length - 1;
                return (
                  <li
                    key={`${crumb.label}-${index}`}
                    className={cn('flex min-w-0 items-center gap-1', !last && 'hidden sm:flex')}
                  >
                    {crumb.to && !last ? (
                      <Link to={crumb.to} className="truncate text-ink-2 hover:text-ink">
                        {crumb.label}
                      </Link>
                    ) : (
                      <span
                        className="truncate font-medium text-ink"
                        aria-current={last ? 'page' : undefined}
                      >
                        {crumb.label}
                      </span>
                    )}
                    {!last ? (
                      <ChevronRight className="size-3.5 shrink-0 text-ink-3" aria-hidden />
                    ) : null}
                  </li>
                );
              })}
            </ol>
          </nav>
          <RefreshButton />
          {action}
        </div>
      </header>
      <div className="mx-auto max-w-[1240px] px-4 pt-6 pb-12 sm:px-6 lg:px-8 lg:pt-8">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold break-words lg:text-[28px] lg:leading-9">{title}</h1>
            {description ? <div className="mt-1 text-sm text-ink-2">{description}</div> : null}
          </div>
          {titleActions ? <div className="flex shrink-0 gap-2">{titleActions}</div> : null}
        </div>
        {children}
      </div>
    </>
  );
}
