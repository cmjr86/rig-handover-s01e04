import { Hono } from 'hono';
import { loadConfig, type RigConfig } from './config.js';
import { createDigestApiRoutes } from './digest/api-routes.js';
import { createDigestPageRoutes } from './digest/page-routes.js';
import { lane } from './lane.js';
import { readStatus } from './status.js';
import { Layout } from './views/layout.js';
import { StatusBoard } from './views/status.js';

export function createApp(config: RigConfig = loadConfig()) {
  const app = new Hono();

  app.get('/health', (c) => c.json({ ok: true, lane: lane().id }));

  app.get('/', (c) =>
    c.html(
      <Layout title="status" lane={lane()}>
        <StatusBoard status={readStatus(config)} />
      </Layout>,
    ),
  );

  app.route('/', createDigestPageRoutes(config.runsDir));
  app.route('/', createDigestApiRoutes(config.runsDir));

  return app;
}
