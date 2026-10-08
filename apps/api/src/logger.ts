import { pino } from 'pino';
import { config } from './config';

// Structured JSON logs. Anything that could carry a credential is redacted at the logger level,
// so a careless `logger.info({ body })` cannot leak a password or token.
export const logger = pino({
  level: config.isTest ? 'silent' : config.LOG_LEVEL,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'res.headers["set-cookie"]',
      '*.password',
      '*.passwordHash',
      '*.token',
      '*.jwt',
      '*.DATABASE_URL',
      '*.JWT_SECRET',
    ],
    censor: '[redacted]',
  },
  transport:
    config.NODE_ENV === 'development'
      ? { target: 'pino-pretty', options: { translateTime: 'HH:MM:ss', ignore: 'pid,hostname' } }
      : undefined,
});
