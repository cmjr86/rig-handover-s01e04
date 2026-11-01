import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

const runsDirectories: string[] = [];

function makeRunsDirectory() {
  const runsDir = mkdtempSync(join(tmpdir(), 'rig-digest-app-'));
  runsDirectories.push(runsDir);
  return runsDir;
}

function makeApp(runsDir: string) {
  return createApp({
    adapter: 'shim',
    installed: '2026-10-29T14:06:00+01:00',
    beatEverySeconds: 60,
    runsDir,
  });
}

afterEach(() => {
  for (const runsDir of runsDirectories.splice(0)) {
    rmSync(runsDir, { recursive: true, force: true });
  }
});

describe('digest routes mounted in the app', () => {
  it('returns 404 from both routes when the night file is missing', async () => {
    const app = makeApp(makeRunsDirectory());

    const pageResponse = await app.request('/digest/2026-10-28');
    const apiResponse = await app.request('/api/digest/2026-10-28');

    expect(pageResponse.status).toBe(404);
    expect(apiResponse.status).toBe(404);
  });

  it('returns 200 with an empty digest from both routes for an empty file', async () => {
    const runsDir = makeRunsDirectory();
    writeFileSync(join(runsDir, '2026-10-28.jsonl'), '');
    const app = makeApp(runsDir);

    const pageResponse = await app.request('/digest/2026-10-28');
    const page = await pageResponse.text();
    const apiResponse = await app.request('/api/digest/2026-10-28');

    expect(pageResponse.status).toBe(200);
    expect(page).toContain('nothing ran');
    expect(apiResponse.status).toBe(200);
    expect(await apiResponse.json()).toEqual([]);
  });

  it('ignores a malformed line and returns the valid record from both routes', async () => {
    const runsDir = makeRunsDirectory();
    writeFileSync(
      join(runsDir, '2026-10-28.jsonl'),
      [
        '{not json',
        JSON.stringify({
          at: '2026-10-28T01:00:00+01:00',
          job: 'kept/job',
          status: 'ok',
          owner: null,
        }),
      ].join('\n'),
    );
    const app = makeApp(runsDir);

    const pageResponse = await app.request('/digest/2026-10-28');
    const page = await pageResponse.text();
    const apiResponse = await app.request('/api/digest/2026-10-28');

    expect(pageResponse.status).toBe(200);
    expect(page).toContain('kept/job');
    expect(apiResponse.status).toBe(200);
    expect(await apiResponse.json()).toMatchObject([{ job: 'kept/job', lastStatus: 'ok' }]);
  });
});
