import { useId, useState, type ComponentProps, type ReactNode } from 'react';
import { ChevronDown, Eye, EyeOff, Search, X } from 'lucide-react';
import { cn } from '../../lib/utils';

const control =
  'w-full rounded-[var(--radius-control)] border border-line bg-surface text-ink placeholder:text-ink-3 transition-colors duration-150 hover:border-line-strong focus-visible:border-primary focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary/15 disabled:bg-subtle disabled:text-ink-3 aria-[invalid=true]:border-danger aria-[invalid=true]:focus-visible:ring-danger/15';

interface FieldProps {
  label: string;
  error?: string;
  hint?: string;
  optional?: boolean;
  className?: string;
  children: (props: {
    id: string;
    'aria-invalid': boolean;
    'aria-describedby'?: string;
  }) => ReactNode;
}

/** Label + control + hint/error, wired together with ids for screen readers. */
export function Field({ label, error, hint, optional, className, children }: FieldProps) {
  const id = useId();
  const messageId = `${id}-message`;
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-[13px] font-medium text-ink">
        {label}
        {optional ? <span className="ml-1 font-normal text-ink-3">(optional)</span> : null}
      </label>
      {children({
        id,
        'aria-invalid': Boolean(error),
        'aria-describedby': error || hint ? messageId : undefined,
      })}
      {error ? (
        <p id={messageId} className="text-[13px] text-danger" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={messageId} className="text-[13px] text-ink-2">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return <input className={cn(control, 'h-10 px-3 text-sm', className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return (
    <textarea
      className={cn(control, 'min-h-24 resize-y px-3 py-2 text-sm', className)}
      {...props}
    />
  );
}

export function Select({ className, children, ...props }: ComponentProps<'select'>) {
  return (
    <div className="relative w-full min-w-0">
      <select
        className={cn(control, 'h-10 cursor-pointer appearance-none pr-9 pl-3 text-sm', className)}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-ink-3"
        aria-hidden
      />
    </div>
  );
}

export function PasswordInput(props: ComponentProps<'input'>) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input {...props} type={visible ? 'text' : 'password'} className="pr-11" />
      <button
        type="button"
        onClick={() => setVisible((value) => !value)}
        className="absolute top-1/2 right-1.5 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-ink-3 hover:bg-subtle hover:text-ink"
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

interface SearchInputProps extends Omit<ComponentProps<'input'>, 'onChange' | 'value'> {
  value: string;
  onChange: (value: string) => void;
  label: string;
}

export function SearchInput({ value, onChange, label, className, ...props }: SearchInputProps) {
  return (
    <div className={cn('relative', className)}>
      <Search
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-3"
        aria-hidden
      />
      <input
        type="search"
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={cn(control, 'h-10 pr-9 pl-9 text-sm [&::-webkit-search-cancel-button]:hidden')}
        {...props}
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute top-1/2 right-1.5 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-ink-3 hover:bg-subtle hover:text-ink"
          aria-label="Clear search"
        >
          <X className="size-4" />
        </button>
      ) : null}
    </div>
  );
}

/** A compact labelled select used in filter toolbars. */
export function FilterSelect({
  label,
  value,
  onChange,
  options,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}) {
  return (
    <label className={cn('flex min-w-0 items-center', className)}>
      <span className="sr-only">{label}</span>
      <Select value={value} onChange={(event) => onChange(event.target.value)} className="w-full">
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
    </label>
  );
}
