import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { isApiError } from '@stride/shared';

/**
 * Copies server field errors onto the form so they appear beside the matching inputs.
 * Returns a message for the form-level alert when the error is not tied to known fields.
 */
export function applyServerErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  knownFields: readonly string[],
): string | null {
  if (!isApiError(error)) return 'Something went wrong. Please try again.';

  let unmatched = false;
  for (const [field, message] of Object.entries(error.fields)) {
    if (knownFields.includes(field)) {
      setError(field as Path<T>, { type: 'server', message });
    } else {
      unmatched = true;
    }
  }
  const matchedAny = Object.keys(error.fields).some((field) => knownFields.includes(field));
  return matchedAny && !unmatched ? null : error.message;
}
