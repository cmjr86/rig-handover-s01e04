import { Hono } from 'hono';
import { readNight } from './read-night.js';

/** Create the JSON digest endpoint for the configured runs directory. */
export function createDigestApiRoutes(runsDir: string) {
  const app = new Hono();

  app.get('/api/digest/:night', (c) => {
    const night = c.req.param('night');

    try {
      const rows = readNight(runsDir, night);
      rows.sort((a, b) => a.job.localeCompare(b.job));
      return c.json(rows);
    } catch (error) {
      if (error instanceof RangeError) return c.json({ error: 'Invalid night' }, 400);
      if (
        error instanceof Error &&
        'code' in error &&
        error.code === 'ENOENT'
      ) {
        return c.json({ error: 'Night not found' }, 404);
      }
      throw error;
    }
  });

  return app;
}
