import type { CookieOptions, Request, Response } from 'express';
import { CLIENT_PLATFORM_HEADER } from '@stride/shared';
import { config } from '../../config';

// Web: the JWT lives in an HttpOnly cookie that page scripts cannot read.
// Mobile: the JWT is returned in the body and kept in the device keystore (Expo SecureStore).
// The transport only changes where the token travels; both paths run the same verification.

export const SESSION_COOKIE = 'stride_session';

function cookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: 'lax',
    path: '/api',
  };
}

export function isMobileClient(req: Request): boolean {
  return req.get(CLIENT_PLATFORM_HEADER)?.toLowerCase() === 'mobile';
}

export function setSessionCookie(res: Response, token: string, expiresAt: Date) {
  res.cookie(SESSION_COOKIE, token, { ...cookieOptions(), expires: expiresAt });
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(SESSION_COOKIE, cookieOptions());
}

export type TokenSource = 'bearer' | 'cookie';

/** Reads the session token, preferring an explicit Authorization header over the cookie. */
export function readSessionToken(req: Request): { token: string; source: TokenSource } | null {
  const header = req.get('authorization');
  if (header) {
    const match = /^Bearer\s+(\S+)$/i.exec(header);
    return match?.[1] ? { token: match[1], source: 'bearer' } : null;
  }
  const cookie: unknown = req.cookies?.[SESSION_COOKIE];
  return typeof cookie === 'string' && cookie ? { token: cookie, source: 'cookie' } : null;
}
