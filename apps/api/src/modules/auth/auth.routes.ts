import { Router, type Request, type RequestHandler, type Response } from 'express';
import { loginSchema, registerSchema, type AuthResponse } from '@stride/shared';
import { getAuth, requireAuth } from '../../middleware/authenticate';
import { parseInput } from '../../lib/validate';
import * as auth from './auth.service';
import { verifySessionToken } from './tokens';
import {
  clearSessionCookie,
  isMobileClient,
  readSessionToken,
  setSessionCookie,
} from './transport';

interface AuthLimiters {
  login: RequestHandler;
  register: RequestHandler;
}

/** Sends the session the way the client asked for it: cookie for web, token body for mobile. */
function sendSession(req: Request, res: Response, status: number, session: auth.SessionResult) {
  const body: AuthResponse = { user: session.user, expiresAt: session.expiresAt.toISOString() };
  if (isMobileClient(req)) {
    body.token = session.token;
  } else {
    setSessionCookie(res, session.token, session.expiresAt);
  }
  res.status(status).json(body);
}

export function authRouter(limiters: AuthLimiters) {
  const router = Router();

  router.post('/register', limiters.register, async (req, res) => {
    const input = parseInput(registerSchema, req.body, 'body');
    sendSession(req, res, 201, await auth.register(input));
  });

  router.post('/login', limiters.login, async (req, res) => {
    const input = parseInput(loginSchema, req.body, 'body');
    sendSession(req, res, 200, await auth.login(input));
  });

  // Logout always succeeds for the client: it revokes the session when the token is still
  // valid and clears the cookie either way, so an expired session can still "log out".
  router.post('/logout', async (req, res) => {
    const found = readSessionToken(req);
    if (found) {
      try {
        const { sessionId } = verifySessionToken(found.token);
        await auth.revokeSession(sessionId);
      } catch {
        // Expired or malformed token: nothing to revoke.
      }
    }
    clearSessionCookie(res);
    res.status(204).end();
  });

  router.get('/me', requireAuth, async (req, res) => {
    res.json({ user: await auth.getCurrentUser(getAuth(req).userId) });
  });

  return router;
}
