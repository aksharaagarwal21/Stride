import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { useDebouncedValue } from './utils';

/**
 * List filters live in the URL so reloads, deep links and the back button keep them.
 * Changing any filter resets pagination to page 1.
 */
export function useUrlFilters<K extends string>(keys: readonly K[]) {
  const [params, setParams] = useSearchParams();

  const values = useMemo(
    () =>
      Object.fromEntries(keys.map((key) => [key, params.get(key) ?? ''])) as Record<
        K | 'page',
        string
      >,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [params],
  );

  const update = useCallback(
    (patch: Partial<Record<K | 'page', string>>) => {
      setParams(
        (previous) => {
          const next = new URLSearchParams(previous);
          for (const [key, value] of Object.entries(patch) as [string, string | undefined][]) {
            if (value) next.set(key, value);
            else next.delete(key);
          }
          if (!('page' in patch)) next.delete('page');
          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  const page = Math.max(1, Number.parseInt(params.get('page') ?? '1', 10) || 1);
  return { values, update, page, params, setParams };
}

/** A search box whose text updates instantly but only reaches the URL after a short pause. */
export function useDebouncedSearch(urlValue: string, onCommit: (value: string) => void) {
  const [text, setText] = useState(urlValue);
  const debounced = useDebouncedValue(text.trim(), 300);

  useEffect(() => {
    if (debounced !== urlValue) onCommit(debounced);
    // Only react to the user's typing, not to URL changes made elsewhere.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  return [text, setText] as const;
}

/** Returns `value` if it is one of `allowed`, otherwise undefined (guards hand-edited URLs). */
export function pick<T extends string>(value: string, allowed: readonly T[]): T | undefined {
  return (allowed as readonly string[]).includes(value) ? (value as T) : undefined;
}
