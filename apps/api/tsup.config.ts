import { defineConfig } from 'tsup';

// Bundles the API with the shared workspace package and the generated Prisma client, so the
// production image runs plain JavaScript. Third-party packages stay external (node_modules).
export default defineConfig({
  entry: ['src/server.ts'],
  format: ['esm'],
  platform: 'node',
  target: 'node22',
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  noExternal: ['@stride/shared'],
});
