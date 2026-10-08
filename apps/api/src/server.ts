import { createApp } from './app';
import { config } from './config';
import { prisma } from './db';
import { logger } from './logger';

const app = createApp();

// Bind to 0.0.0.0 so the server is reachable inside containers and from phones on the LAN.
const server = app.listen(config.PORT, '0.0.0.0', () => {
  logger.info(
    { port: config.PORT, env: config.NODE_ENV, serveWeb: config.serveWeb },
    'Stride API listening',
  );
});

function shutdown(signal: string) {
  logger.info({ signal }, 'Shutting down');
  server.close(() => {
    void prisma.$disconnect().finally(() => process.exit(0));
  });
  // Force exit if connections do not drain in time.
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
