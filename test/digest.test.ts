import { describe, expect, it } from 'vitest';
import { readNight, readNightWithDiagnostics } from '../src/digest/read-night.js';

describe('night digest reader', () => {
  it('aggregates the 2026-10-28 fixture and counts its malformed line', () => {
    const { rows, malformedLines, statusCounts } = readNightWithDiagnostics('runs', '2026-10-28');

    expect(rows).toHaveLength(5);
    expect(malformedLines).toBe(1);
    expect(statusCounts).toEqual({ ok: 10, retry: 4, fail: 1 });
    expect(rows.find((row) => row.job === 'lane/sync')).toEqual({
      job: 'lane/sync',
      owner: 'rook',
      runs: 8,
      retries: 1,
      lastStatus: 'ok',
      lastError: null,
      firstTime: '2026-10-28T23:00:06+01:00',
      lastTime: '2026-10-29T05:00:04+01:00',
    });
    expect(rows.find((row) => row.job === 'fixtures/refresh')).toMatchObject({
      runs: 4,
      retries: 3,
      lastStatus: 'ok',
      lastError: null,
      firstTime: '2026-10-29T01:30:00+01:00',
      lastTime: '2026-10-29T01:37:00+01:00',
    });
    expect(rows.find((row) => row.job === 'notes/backup')).toMatchObject({
      lastStatus: 'fail',
      lastError: 'quota exceeded',
    });
    expect(rows.find((row) => row.job === 'digest/render')?.owner).toBeNull();
  });

  it('returns rows through the shared reader contract', () => {
    expect(readNight('runs', '2026-10-28')).toHaveLength(5);
  });
});
