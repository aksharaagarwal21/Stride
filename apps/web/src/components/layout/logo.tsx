import { cn } from '../../lib/utils';

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn('size-7', className)} aria-hidden>
      <rect width="32" height="32" rx="8" fill="#3659E3" />
      <path
        d="M9 20.5l5-5 3.5 3.5L23 12"
        fill="none"
        stroke="#fff"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Logo({ className, inverted }: { className?: string; inverted?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark />
      <span
        className={cn(
          'font-display text-[19px] font-bold tracking-tight',
          inverted ? 'text-white' : 'text-ink',
        )}
      >
        Stride
      </span>
    </span>
  );
}
