/** An expected failure that maps directly to an HTTP response with the shared error body. */
export class AppError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fields?: Record<string, string>;

  constructor(status: number, code: string, message: string, fields?: Record<string, string>) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

// 404 is used both for "does not exist" and "belongs to someone else", so responses never
// reveal whether another user's record exists.
export const notFound = (resource: string) =>
  new AppError(404, 'NOT_FOUND', `${resource} not found.`);

export const unauthenticated = () =>
  new AppError(401, 'UNAUTHENTICATED', 'Please sign in to continue.');

export const sessionExpired = () =>
  new AppError(401, 'SESSION_EXPIRED', 'Your session expired. Please sign in again.');

export const validationFailed = (fields: Record<string, string>) =>
  new AppError(400, 'VALIDATION_ERROR', 'Check the highlighted fields.', fields);
