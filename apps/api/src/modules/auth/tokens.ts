import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { config } from '../../config';
import { AppError, sessionExpired } from '../../lib/errors';

const ALGORITHM = 'HS256';

// Minimal claims: who (sub), which login session (sid), plus iss/aud/exp/iat.
const claimsSchema = z.object({ sub: z.uuid(), sid: z.uuid() });

const invalidToken = () =>
  new AppError(401, 'INVALID_TOKEN', 'Your sign-in is no longer valid. Please sign in again.');

export function signSessionToken(userId: string, sessionId: string, expiresAt: Date): string {
  return jwt.sign(
    { sid: sessionId, exp: Math.floor(expiresAt.getTime() / 1000) },
    config.JWT_SECRET,
    {
      algorithm: ALGORITHM,
      subject: userId,
      issuer: config.JWT_ISSUER,
      audience: config.JWT_AUDIENCE,
    },
  );
}

/** Verifies signature, algorithm, issuer, audience and expiry. Session state is checked by the caller. */
export function verifySessionToken(token: string): { userId: string; sessionId: string } {
  let payload: unknown;
  try {
    payload = jwt.verify(token, config.JWT_SECRET, {
      algorithms: [ALGORITHM],
      issuer: config.JWT_ISSUER,
      audience: config.JWT_AUDIENCE,
    });
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) throw sessionExpired();
    throw invalidToken();
  }
  const claims = claimsSchema.safeParse(payload);
  if (!claims.success) throw invalidToken();
  return { userId: claims.data.sub, sessionId: claims.data.sid };
}
