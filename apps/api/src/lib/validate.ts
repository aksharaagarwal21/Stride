import type { z } from 'zod';
import { AppError } from './errors';

type Source = 'body' | 'query' | 'params';

/** Parses untrusted input with a shared schema, or throws a 400 with per-field messages. */
export function parseInput<T extends z.ZodType>(
  schema: T,
  data: unknown,
  source: Source,
): z.output<T> {
  const result = schema.safeParse(data);
  if (result.success) return result.data;

  const fields: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const path = issue.path.map(String);
    if (issue.code === 'unrecognized_keys') {
      for (const key of issue.keys)
        fields[[...path, key].join('.')] ??= 'This field is not allowed.';
      continue;
    }
    if (path.length === 0 && issue.code === 'invalid_type' && source === 'body') {
      fields._root ??= 'Request body must be a JSON object.';
      continue;
    }
    fields[path.length ? path.join('.') : '_root'] ??= issue.message;
  }
  throw new AppError(400, 'VALIDATION_ERROR', 'Check the highlighted fields.', fields);
}
