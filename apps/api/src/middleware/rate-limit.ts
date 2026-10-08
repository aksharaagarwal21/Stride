import { rateLimit } from 'express-rate-limit';

interface AuthLimitOptions {
  max: number;
  windowMinutes: number;
}

// In-memory counters per client IP. Fine for a single instance; several instances would need a
// shared store. `trust proxy` (TRUST_PROXY) decides which IP is used behind a load balancer.
function createLimiter({ max, windowMinutes }: AuthLimitOptions, skipSuccessfulRequests: boolean) {
  return rateLimit({
    windowMs: windowMinutes * 60_000,
    limit: max,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skipSuccessfulRequests,
    handler: (_req, res) => {
      res.status(429).json({
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many attempts. Please wait a few minutes and try again.',
        },
      });
    },
  });
}

export function createAuthLimiters(options: AuthLimitOptions) {
  return {
    // Failed logins count toward the limit; a successful login does not lock out its owner.
    login: createLimiter(options, true),
    register: createLimiter(options, false),
  };
}
