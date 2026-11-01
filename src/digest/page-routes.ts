import { Hono } from 'hono';
import { jsx } from 'hono/jsx';
import { lane } from '../lane.js';
import { Layout } from '../views/layout.js';
import { DigestPage } from '../views/digest.js';
import { readNight } from './read-night.js';
import type { ReadNight } from './types.js';

function isMissingFile(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'ENOENT'
  );
}

/** Create the server-rendered digest page route for one runs directory. */
export function createDigestPageRoutes(runsDir: string, read: ReadNight = readNight) {
  const routes = new Hono();

  routes.get('/digest/:night', async (c) => {
    const night = c.req.param('night');
    let rows;
    try {
      rows = read(runsDir, night);
    } catch (error) {
      if (isMissingFile(error) || error instanceof RangeError) return c.notFound();
      throw error;
    }

    rows.sort((a, b) => a.job.localeCompare(b.job));
    const html = await jsx(Layout, {
      title: `digest · ${night}`,
      lane: lane(),
      children: jsx(DigestPage, { night, rows }),
    }).toString();
    return c.html(html);
  });

  return routes;
}
