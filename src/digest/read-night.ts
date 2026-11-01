import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DigestRow, DigestStatus, ReadNight } from './types.js';

export type ReadNightResult = {
  rows: DigestRow[];
  malformedLines: number;
  statusCounts: Record<DigestStatus, number>;
};

type RunRecord = {
  at: string;
  job: string;
  status: DigestStatus;
  owner: string | null;
  error?: string;
};

function isRunRecord(value: unknown): value is RunRecord {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;

  const record = value as Record<string, unknown>;
  return (
    typeof record.at === 'string' &&
    typeof record.job === 'string' &&
    (record.status === 'ok' || record.status === 'retry' || record.status === 'fail') &&
    (typeof record.owner === 'string' || record.owner === null) &&
    (record.error === undefined || typeof record.error === 'string')
  );
}

/** Read and aggregate one night's JSONL run log, counting malformed records as it goes. */
export function readNightWithDiagnostics(runsDir: string, night: string): ReadNightResult {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(night)) {
    throw new RangeError(`Invalid night: ${night}`);
  }

  const content = readFileSync(join(runsDir, `${night}.jsonl`), 'utf8');
  const lines = content.split(/\r?\n/);
  if (lines.at(-1) === '') lines.pop();

  const rows = new Map<string, DigestRow>();
  let malformedLines = 0;
  const statusCounts: Record<DigestStatus, number> = { ok: 0, retry: 0, fail: 0 };

  for (const line of lines) {
    let value: unknown;
    try {
      value = JSON.parse(line);
    } catch {
      malformedLines += 1;
      continue;
    }

    if (!isRunRecord(value)) {
      malformedLines += 1;
      continue;
    }

    statusCounts[value.status] += 1;

    const row = rows.get(value.job);
    if (row) {
      row.runs += 1;
      if (value.status === 'retry') row.retries += 1;
      row.owner = value.owner;
      row.lastStatus = value.status;
      row.lastError = value.error ?? null;
      row.lastTime = value.at;
    } else {
      rows.set(value.job, {
        job: value.job,
        owner: value.owner,
        runs: 1,
        retries: value.status === 'retry' ? 1 : 0,
        lastStatus: value.status,
        lastError: value.error ?? null,
        firstTime: value.at,
        lastTime: value.at,
      });
    }
  }

  return { rows: [...rows.values()], malformedLines, statusCounts };
}

/** Read the valid rows from one night's log; malformed records are skipped. */
export const readNight: ReadNight = (runsDir, night) =>
  readNightWithDiagnostics(runsDir, night).rows;
