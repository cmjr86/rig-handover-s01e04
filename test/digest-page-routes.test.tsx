import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createDigestPageRoutes } from '../src/digest/page-routes.js';

const runsDirectories: string[] = [];

function makeRunsDirectory() {
  const runsDir = mkdtempSync(join(tmpdir(), 'rig-digest-page-'));
  runsDirectories.push(runsDir);
  return runsDir;
}

afterEach(() => {
  for (const runsDir of runsDirectories.splice(0)) {
    rmSync(runsDir, { recursive: true, force: true });
  }
});

describe('digest page routes', () => {
  it('renders rows sorted by job with failures, retry threshold, and null owners marked', async () => {
    const runsDir = makeRunsDirectory();
    writeFileSync(
      join(runsDir, '2026-10-28.jsonl'),
      [
        JSON.stringify({ at: '2026-10-28T01:00:00+01:00', job: 'zeta/job', status: 'fail', owner: 'rook', error: 'failed' }),
        JSON.stringify({ at: '2026-10-28T01:01:00+01:00', job: 'alpha/job', status: 'retry', owner: null }),
        JSON.stringify({ at: '2026-10-28T01:02:00+01:00', job: 'alpha/job', status: 'retry', owner: null }),
        JSON.stringify({ at: '2026-10-28T01:03:00+01:00', job: 'alpha/job', status: 'retry', owner: null }),
        JSON.stringify({ at: '2026-10-28T01:04:00+01:00', job: 'alpha/job', status: 'ok', owner: null }),
      ].join('\n'),
    );

    const response = await createDigestPageRoutes(runsDir).request('/digest/2026-10-28');
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(html).toContain('<title>rig · digest · 2026-10-28</title>');
    expect(html).toContain('lane-07');
    expect(html.match(/<table>/g)).toHaveLength(1);
    expect(html.indexOf('alpha/job')).toBeLessThan(html.indexOf('zeta/job'));
    expect(html).toContain('<td>—</td>');
    expect(html).toContain('<td class="warn">3</td>');
    expect(html).toContain('<td class="warn">fail</td>');
    expect(html).toContain('<td>failed</td>');
  });

  it('returns 404 when the night file is missing', async () => {
    const response = await createDigestPageRoutes(makeRunsDirectory()).request('/digest/2026-10-28');

    expect(response.status).toBe(404);
  });

  it('renders “nothing ran” for an empty night file', async () => {
    const runsDir = makeRunsDirectory();
    writeFileSync(join(runsDir, '2026-10-28.jsonl'), '');

    const response = await createDigestPageRoutes(runsDir).request('/digest/2026-10-28');

    expect(response.status).toBe(200);
    expect(await response.text()).toContain('nothing ran');
  });

  it('renders valid rows when the night contains a malformed line', async () => {
    const runsDir = makeRunsDirectory();
    writeFileSync(
      join(runsDir, '2026-10-28.jsonl'),
      [
        '{not json',
        JSON.stringify({ at: '2026-10-28T01:00:00+01:00', job: 'kept/job', status: 'ok', owner: null }),
      ].join('\n'),
    );

    const response = await createDigestPageRoutes(runsDir).request('/digest/2026-10-28');
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(html).toContain('kept/job');
  });
});
