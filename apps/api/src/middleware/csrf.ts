import type { Request, RequestHandler } from 'express';
import { config } from '../config';
import { AppError } from '../lib/errors';
import { SESSION_COOKIE } from '../modules/auth/transport';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function requestOrigin(req: Request): string | null {
  const origin = req.get('origin');
  if (origin && origin !== 'null') return origin;
  const referer = req.get('referer');
  if (!referer) return null;
  try {
    return new URL(referer).origin;
  } catch {
    return null;
  }
}

export function isTrustedOrigin(req: Request, origin: string): boolean {
  if (config.CORS_ORIGINS.includes(origin)) return true;
  // Same-origin deployment: the web app is served by this server.
  return origin === `${req.protocol}://${req.get('host')}`;
}

/**
 * CSRF protection for the cookie transport. Browsers attach Origin to cross-site writes, so:
 *  - a write from an untrusted origin is always rejected;
 *  - a cookie-authenticated write must come from a trusted origin.
 * Native clients send neither Origin nor the cookie (they use a bearer header), so they pass.
 */
export const csrfProtection: RequestHandler = (req, _res, next) => {
  if (SAFE_METHODS.has(req.method)) return next();

  const origin = requestOrigin(req);
  const usesCookie = Boolean(req.cookies?.[SESSION_COOKIE]) && !req.get('authorization');

  if (origin ? !isTrustedOrigin(req, origin) : usesCookie) {
    throw new AppError(403, 'FORBIDDEN_ORIGIN', 'This request was blocked because of its origin.');
  }
  next();
};
