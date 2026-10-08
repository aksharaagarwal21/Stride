import type { Request, RequestHandler } from 'express';
import { prisma } from '../db';
import { sessionExpired, unauthenticated } from '../lib/errors';
import { verifySessionToken } from '../modules/auth/tokens';
import { readSessionToken, type TokenSource } from '../modules/auth/transport';

export interface AuthContext {
  userId: string;
  sessionId: string;
  source: TokenSource;
}

declare module 'express-serve-static-core' {
  interface Request {
    auth?: AuthContext;
  }
}

/**
 * Accepts a valid JWT only while its database session is active. This is what makes logout
 * effective: revoking the session row invalidates the token even before it expires.
 */
export const requireAuth: RequestHandler = async (req, _res, next) => {
  const found = readSessionToken(req);
  if (!found) throw unauthenticated();

  const { userId, sessionId } = verifySessionToken(found.token);
  const session = await prisma.authSession.findUnique({
    where: { id: sessionId },
    select: { userId: true, expiresAt: true, revokedAt: true },
  });
  if (
    !session ||
    session.userId !== userId ||
    session.revokedAt ||
    session.expiresAt <= new Date()
  ) {
    throw sessionExpired();
  }

  req.auth = { userId, sessionId, source: found.source };
  next();
};

/** Returns the authenticated context; only call behind `requireAuth`. */
export function getAuth(req: Request): AuthContext {
  if (!req.auth) throw unauthenticated();
  return req.auth;
}
