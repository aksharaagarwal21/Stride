import { clsx, type ClassValue } from 'clsx';
import { useEffect, useState } from 'react';
import { isApiError } from '@stride/shared';

export function cn(...classes: ClassValue[]) {
  return clsx(classes);
}

/** Returns `value` after it has stopped changing for `delay` ms (used for search boxes). */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

/** A readable message for any thrown value. */
export function errorMessage(error: unknown, fallback = 'Something went wrong. Please try again.') {
  if (isApiError(error)) return error.message;
  return fallback;
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase() || '?';
}

export function greeting(now = new Date()) {
  const hour = now.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}
