export type DigestStatus = 'ok' | 'retry' | 'fail';

export type DigestRow = {
  job: string;
  /** Keep null in the data model; views render it as an em dash. */
  owner: string | null;
  runs: number;
  retries: number;
  lastStatus: DigestStatus;
  lastError: string | null;
  firstTime: string;
  lastTime: string;
};

export type ReadNight = (runsDir: string, night: string) => DigestRow[];
