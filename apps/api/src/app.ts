import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { Router } from 'express';
import helmet from 'helmet';
import { config } from './config';
import { prisma } from './db';
import { requireAuth } from './middleware/authenticate';
import { csrfProtection } from './middleware/csrf';
import { apiNotFound, errorHandler } from './middleware/error-handler';
import { createAuthLimiters } from './middleware/rate-limit';
import { requestLogger } from './middleware/request-logger';
import { authRouter } from './modules/auth/auth.routes';
import { dashboardRouter } from './modules/dashboard/dashboard.routes';
import { projectsRouter } from './modules/projects/projects.routes';
import { tasksRouter } from './modules/tasks/tasks.routes';
import { mountWebApp } from './web';

export interface AppOptions {
  /** Overrides AUTH_RATE_LIMIT_MAX (used by tests to exercise the limiter quickly). */
  authRateLimitMax?: number;
  serveWeb?: boolean;
}

export function createApp(options: AppOptions = {}) {
  const app = express();
  app.disable('x-powered-by');
  // Only trust X-Forwarded-* from the configured number of proxies (0 = none), so clients
  // cannot spoof their IP to dodge the rate limiter.
  app.set('trust proxy', config.TRUST_PROXY);

  app.use(requestLogger);
  app.use(
    helmet({
      contentSecurityPolicy: {
        // Plain-HTTP local runs (docker compose) must not force https subresources.
        directives: { upgradeInsecureRequests: config.cookieSecure ? [] : null },
      },
    }),
  );

  const api = Router();
  api.use(
    cors({
      // Requests without an Origin (same-origin navigation, native apps) are allowed through;
      // browsers on other origins only get CORS headers when listed in CORS_ORIGINS.
      origin: (origin, callback) => callback(null, !origin || config.CORS_ORIGINS.includes(origin)),
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Client-Platform', 'X-Request-Id'],
      exposedHeaders: ['X-Request-Id'],
      maxAge: 600,
    }),
  );
  api.use((_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });
  api.use(express.json({ limit: '50kb' }));
  api.use(cookieParser());
  api.use(csrfProtection);

  api.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });
  // Readiness: confirms the database answers (used by Docker and the hosting health check).
  api.get('/health/ready', async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ status: 'ok', database: 'ok' });
    } catch {
      res.status(503).json({ status: 'unavailable', database: 'unreachable' });
    }
  });

  const limiters = createAuthLimiters({
    max: options.authRateLimitMax ?? config.AUTH_RATE_LIMIT_MAX,
    windowMinutes: config.AUTH_RATE_LIMIT_WINDOW_MINUTES,
  });
  api.use('/auth', authRouter(limiters));
  api.use('/projects', requireAuth, projectsRouter);
  api.use('/tasks', requireAuth, tasksRouter);
  api.use('/dashboard', requireAuth, dashboardRouter);
  api.use(apiNotFound);
  api.use(errorHandler);

  app.use('/api', api);

  if (options.serveWeb ?? config.serveWeb) mountWebApp(app);
  app.use(errorHandler);

  return app;
}
