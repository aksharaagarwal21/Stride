import type { ReactNode } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RotateCw,
  WifiOff,
} from 'lucide-react';
import { Link } from 'react-router';
import { isApiError, type PageMeta } from '@stride/shared';
import { cn, errorMessage } from '../../lib/utils';
import { Button, buttonClasses } from './button';

export function Spinner({ label = 'Loading', className }: { label?: string; className?: string }) {
  return (
    <div
      role="status"
      className={cn('flex items-center justify-center gap-2 py-10 text-sm text-ink-2', className)}
    >
      <Loader2 className="size-4 animate-spin" aria-hidden />
      {label}…
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-subtle', className)} aria-hidden />;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn('flex flex-col items-center justify-center px-6 py-12 text-center', className)}
    >
      {icon ? (
        <div className="mb-4 flex size-11 items-center justify-center rounded-xl bg-primary-soft text-primary">
          {icon}
        </div>
      ) : null}
      <h3 className="text-base font-semibold">{title}</h3>
      {description ? <p className="mt-1 max-w-sm text-sm text-ink-2">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

/** Page-level error with Retry. 404s get a safe link back instead of a pointless retry. */
export function ErrorState({
  error,
  onRetry,
  backTo,
  backLabel = 'Go back',
  className,
}: {
  error: unknown;
  onRetry?: () => void;
  backTo?: string;
  backLabel?: string;
  className?: string;
}) {
  const notFound = isApiError(error) && error.status === 404;
  const offline = isApiError(error) && error.isNetworkError;
  return (
    <div
      role="alert"
      className={cn('flex flex-col items-center px-6 py-12 text-center', className)}
    >
      <div
        className={cn(
          'mb-4 flex size-11 items-center justify-center rounded-xl',
          offline ? 'bg-warning-soft text-warning' : 'bg-danger-soft text-danger',
        )}
      >
        {offline ? <WifiOff className="size-5" /> : <AlertTriangle className="size-5" />}
      </div>
      <h3 className="text-base font-semibold">
        {notFound ? 'Not found' : offline ? 'You appear to be offline' : "We couldn't load this"}
      </h3>
      <p className="mt-1 max-w-sm text-sm text-ink-2">
        {notFound
          ? 'It may have been deleted, or it belongs to another account.'
          : errorMessage(error)}
      </p>
      <div className="mt-5 flex gap-2">
        {backTo ? (
          <Link to={backTo} className={buttonClasses('secondary')}>
            <ArrowLeft className="size-4" />
            {backLabel}
          </Link>
        ) : null}
        {onRetry && !notFound ? (
          <Button onClick={onRetry}>
            <RotateCw className="size-4" />
            Retry
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export function InlineAlert({
  children,
  tone = 'danger',
}: {
  children: ReactNode;
  tone?: 'danger' | 'info';
}) {
  return (
    <div
      role="alert"
      className={cn(
        'flex items-start gap-2 rounded-[10px] border px-3 py-2.5 text-sm',
        tone === 'danger'
          ? 'border-danger/20 bg-danger-soft text-danger'
          : 'border-primary/20 bg-primary-soft text-primary-strong',
      )}
    >
      <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div>{children}</div>
    </div>
  );
}

export function ProgressBar({
  completed,
  total,
  className,
}: {
  completed: number;
  total: number;
  className?: string;
}) {
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      aria-label={total === 0 ? 'No tasks yet' : `${completed} of ${total} tasks completed`}
      className={cn('h-1.5 w-full overflow-hidden rounded-full bg-subtle', className)}
    >
      <div
        className={cn(
          'h-full rounded-full transition-[width] duration-150',
          percent === 100 ? 'bg-success' : 'bg-primary',
        )}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

export function Pagination({
  meta,
  onPageChange,
  noun,
}: {
  meta: PageMeta;
  onPageChange: (page: number) => void;
  noun: string;
}) {
  if (meta.total === 0) return null;
  const from = (meta.page - 1) * meta.limit + 1;
  const to = Math.min(meta.page * meta.limit, meta.total);
  return (
    <nav
      aria-label={`${noun} pagination`}
      className="flex items-center justify-between gap-3 text-sm text-ink-2"
    >
      <p className="tabular">
        {from}–{to} of {meta.total} {noun}
      </p>
      {meta.totalPages > 1 ? (
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            onClick={() => onPageChange(meta.page - 1)}
            disabled={meta.page <= 1}
            aria-label="Previous page"
          >
            <ChevronLeft className="size-4" />
            <span className="hidden sm:inline">Previous</span>
          </Button>
          <span className="tabular px-2">
            {meta.page} / {meta.totalPages}
          </span>
          <Button
            size="sm"
            onClick={() => onPageChange(meta.page + 1)}
            disabled={meta.page >= meta.totalPages}
            aria-label="Next page"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="size-4" />
          </Button>
        </div>
      ) : null}
    </nav>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <section
      className={cn(
        'rounded-[var(--radius-card)] border border-line bg-surface shadow-card',
        className,
      )}
    >
      {children}
    </section>
  );
}
