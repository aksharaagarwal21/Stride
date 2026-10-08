import { randomUUID } from 'node:crypto';
import { pinoHttp } from 'pino-http';
import { logger } from '../logger';

const REQUEST_ID = /^[A-Za-z0-9-]{8,64}$/;

// One structured line per request with a request id (echoed as X-Request-Id). Only method, URL
// and status are logged — never headers or bodies, which carry cookies, tokens and passwords.
export const requestLogger = pinoHttp({
  logger,
  genReqId: (req, res) => {
    const incoming = req.headers['x-request-id'];
    const id = typeof incoming === 'string' && REQUEST_ID.test(incoming) ? incoming : randomUUID();
    res.setHeader('X-Request-Id', id);
    return id;
  },
  serializers: {
    req: (req: { id: string; method: string; url: string }) => ({
      id: req.id,
      method: req.method,
      url: req.url,
    }),
    res: (res: { statusCode: number }) => ({ statusCode: res.statusCode }),
  },
  customLogLevel: (_req, res, err) =>
    err || res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info',
  autoLogging: {
    ignore: (req) => req.url === '/api/health' || (req.url ?? '').startsWith('/assets/'),
  },
});
