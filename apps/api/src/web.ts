import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express, { type Express } from 'express';
import { config } from './config';
import { logger } from './logger';

// Both src/web.ts (dev) and dist/server.js (prod) sit two levels below apps/, so this resolves
// to apps/web/dist in either case. WEB_DIST_DIR overrides it (e.g. in the Docker image).
const here = path.dirname(fileURLToPath(import.meta.url));
const defaultDist = path.resolve(here, '../../web/dist');

/**
 * Serves the built React app from the API's origin, so the browser calls `/api` same-origin and
 * the session cookie never needs to cross sites. Unknown non-API paths return index.html so deep
 * links such as /projects/:id survive a reload.
 */
export function mountWebApp(app: Express) {
  const distDir = path.resolve(config.WEB_DIST_DIR ?? defaultDist);
  const indexHtml = path.join(distDir, 'index.html');
  if (!existsSync(indexHtml)) {
    logger.warn({ distDir }, 'Web build not found; skipping static web serving');
    return;
  }

  app.use(
    express.static(distDir, {
      index: false,
      setHeaders: (res, filePath) => {
        // Vite fingerprints everything in /assets, so those files can be cached forever.
        if (filePath.includes(`${path.sep}assets${path.sep}`)) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
      },
    }),
  );

  app.get('/{*path}', (_req, res) => {
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(indexHtml);
  });
}
