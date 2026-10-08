import { useEffect, useState } from 'react';
import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { isApiError } from '@stride/shared';

/** Puts server field errors beside the matching inputs; returns a message for the rest. */
export function applyServerErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  knownFields: readonly string[],
): string | null {
  if (!isApiError(error)) return 'Something went wrong. Please try again.';
  const entries = Object.entries(error.fields);
  const known = entries.filter(([field]) => knownFields.includes(field));
  for (const [field, message] of known) setError(field as Path<T>, { type: 'server', message });
  return known.length > 0 && known.length === entries.length ? null : error.message;
}

export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}
