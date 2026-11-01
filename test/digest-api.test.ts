import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createDigestApiRoutes } from '../src/digest/api-routes.js';

const directories: string[] = [];

function createRunsDir() {
  const root = mkdtempSync(join(tmpdir(), 'rig-digest-api-'));
  const runsDir = join(root, 'runs');
  mkdirSync(runsDir);
  directories.push(root);
  return runsDir;
}

afterEach(() => {
  for (const directory of directories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe('digest JSON API', () => {
  it('returns digest rows in ascending job order', async () => {
    const runsDir = createRunsDir();
    writeFileSync(
      join(runsDir, '2026-10-28.jsonl'),
      [
        { at: '2026-10-28T23:00:00+01:00', job: 'zeta/run', status: 'ok', owner: 'rook' },
        { at: '2026-10-28T23:01:00+01:00', job: 'alpha/run', status: 'retry', owner: 'rook' },
        { at: '2026-10-28T23:02:00+01:00', job: 'beta/run', status: 'fail', owner: null },
      ]
        .map((record) => JSON.stringify(record))
        .join('\n'),
    );

    const response = await createDigestApiRoutes(runsDir).request('/api/digest/2026-10-28');

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject([
      { job: 'alpha/run' },
      { job: 'beta/run' },
      { job: 'zeta/run' },
    ]);
  });

  it('returns 404 when the night file is missing', async () => {
    const app = createDigestApiRoutes(createRunsDir());

    const response = await app.request('/api/digest/2026-10-28');

    expect(response.status).toBe(404);
  });

  it('returns an empty rows array for an empty night file', async () => {
    const runsDir = createRunsDir();
    writeFileSync(join(runsDir, '2026-10-28.jsonl'), '');

    const response = await createDigestApiRoutes(runsDir).request('/api/digest/2026-10-28');

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([]);
  });
});
