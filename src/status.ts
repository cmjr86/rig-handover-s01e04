import { readdirSync } from 'node:fs';
import type { RigConfig } from './config.js';
import { readNightWithDiagnostics } from './digest/read-night.js';
import type { DigestStatus } from './digest/types.js';
import { lastBeat, type Beat } from './heartbeat.js';

export type NightStatusCounts = Record<DigestStatus, number>;

export type NightOnDisk = {
  date: string;
  statusCounts: NightStatusCounts | null;
};

export type Status = {
  adapter: string;
  installed: string;
  lastBeat: Beat | null;
  nights: NightOnDisk[];
};

// Nights on disk = runs/<YYYY-MM-DD>.jsonl, newest first.
export function nightsOnDisk(runsDir: string): string[] {
  try {
    return readdirSync(runsDir)
      .filter((f) => /^\d{4}-\d{2}-\d{2}\.jsonl$/.test(f))
      .map((f) => f.slice(0, 10))
      .sort()
      .reverse();
  } catch {
    return [];
  }
}

export function readStatus(config: RigConfig): Status {
  const nights = nightsOnDisk(config.runsDir).map((date): NightOnDisk => {
    try {
      const { statusCounts } = readNightWithDiagnostics(config.runsDir, date);
      return { date, statusCounts };
    } catch {
      return { date, statusCounts: null };
    }
  });

  return {
    adapter: config.adapter,
    installed: config.installed,
    lastBeat: lastBeat(),
    nights,
  };
}
