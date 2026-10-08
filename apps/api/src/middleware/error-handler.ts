import type { ErrorRequestHandler, RequestHandler } from 'express';
import { Prisma } from '../generated/prisma/client';
import { AppError } from '../lib/errors';

/** JSON 404 for unknown API routes, so they never fall through to the web app's HTML. */
export const apiNotFound: RequestHandler = (req, res) => {
  res.status(404).json({
    error: { code: 'NOT_FOUND', message: `No API route for ${req.method} ${req.path}.` },
  });
};

interface BodyParserError extends Error {
  type?: string;
  status?: number;
}

/** Converts every error into the shared `{ error: { code, message, fields? } }` body. */
export const errorHandler: ErrorRequestHandler = (err: unknown, req, res, _next) => {
  if (res.headersSent) return;

  let appError: AppError;
  if (err instanceof AppError) {
    appError = err;
  } else if ((err as BodyParserError)?.type === 'entity.parse.failed') {
    appError = new AppError(400, 'INVALID_JSON', 'The request body is not valid JSON.');
  } else if ((err as BodyParserError)?.type === 'entity.too.large') {
    appError = new AppError(413, 'PAYLOAD_TOO_LARGE', 'The request body is too large.');
  } else if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
    // A record vanished between the ownership check and the write (e.g. a concurrent delete).
    appError = new AppError(404, 'NOT_FOUND', 'The record no longer exists.');
  } else {
    // Unexpected: log everything server-side, return nothing internal to the client.
    req.log?.error({ err }, 'Unhandled error');
    appError = new AppError(
      500,
      'INTERNAL_ERROR',
      'Something went wrong on our side. Please try again.',
    );
  }

  if (appError.status >= 500) res.setHeader('Cache-Control', 'no-store');
  res.status(appError.status).json({
    error: {
      code: appError.code,
      message: appError.message,
      ...(appError.fields ? { fields: appError.fields } : {}),
    },
  });
};
