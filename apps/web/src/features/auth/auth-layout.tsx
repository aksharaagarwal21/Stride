import type { ReactNode } from 'react';
import { Logo } from '../../components/layout/logo';

/** Decorative preview of a task list. Purely illustrative: no numbers, no claims. */
function TaskPreview() {
  const rows = [
    { name: 'Outline launch plan', state: 'done' },
    { name: 'Review onboarding copy', state: 'active' },
    { name: 'Share milestone update', state: 'todo' },
  ] as const;
  return (
    <div
      className="w-full max-w-sm rounded-[14px] border border-white/10 bg-white/[0.06] p-4"
      aria-hidden
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="h-2.5 w-28 rounded-full bg-white/30" />
        <span className="h-2.5 w-10 rounded-full bg-white/15" />
      </div>
      <ul className="flex flex-col gap-2">
        {rows.map((row) => (
          <li
            key={row.name}
            className="flex items-center gap-3 rounded-[10px] bg-white/[0.07] px-3 py-2.5"
          >
            <span
              className={
                row.state === 'done'
                  ? 'flex size-4 items-center justify-center rounded-full bg-[#5B7BF0]'
                  : row.state === 'active'
                    ? 'size-4 rounded-full border-2 border-[#8EA5F5]'
                    : 'size-4 rounded-full border-2 border-white/30'
              }
            >
              {row.state === 'done' ? (
                <svg viewBox="0 0 12 12" className="size-2.5">
                  <path
                    d="M2.5 6.2l2.2 2.2 4.8-4.8"
                    fill="none"
                    stroke="#fff"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              ) : null}
            </span>
            <span
              className={
                row.state === 'done'
                  ? 'text-sm text-white/55 line-through'
                  : 'text-sm text-white/85'
              }
            >
              {row.name}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-ink p-10 lg:flex">
        <Logo inverted />
        <div className="flex flex-col gap-8">
          <div>
            <p className="font-display text-[32px] leading-10 font-bold text-white">
              Make room for your next milestone.
            </p>
            <p className="mt-3 max-w-sm text-[15px] text-white/65">
              Plan projects, track every task and pick up where you left off — on the web or on
              Android.
            </p>
          </div>
          <TaskPreview />
        </div>
        <p className="text-xs text-white/45">
          One account. Web and Android, always in sync after a refresh.
        </p>
      </aside>
      <main className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-[400px]">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="mt-1.5 text-sm text-ink-2">{subtitle}</p>
          <div className="mt-7">{children}</div>
        </div>
      </main>
    </div>
  );
}
