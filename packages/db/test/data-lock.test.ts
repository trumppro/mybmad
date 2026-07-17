/**
 * The data-directory lock module (packages/db/src/data-lock.ts) — acquire, refuse a live
 * second holder, keep a held lock fresh past its stale window (the heartbeat), adopt a
 * stale one, release. Fast and deterministic, with compressed timings.
 *
 * The end-to-end path — two real `oahs serve` on one dir, where the lock actually lives —
 * is tested in apps/oahs/test/serve-datadir-lock.test.ts against the built binary.
 *
 * Why any of this exists: PGlite does not lock its directory. Two `oahs serve --data <same>`
 * both accept writes and then destroy it (RuntimeError: Aborted() at the next open). Reproduced.
 */
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { acquireDataDirLock, DataDirLockedError } from '../src/data-lock.js';

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'oahs-lock-'));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('the lock module', () => {
  it('lets the first caller acquire and refuses a live second caller', async () => {
    const release = await acquireDataDirLock(dir, { staleMs: 2000, updateMs: 500 });
    await expect(acquireDataDirLock(dir, { staleMs: 2000, updateMs: 500 })).rejects.toBeInstanceOf(
      DataDirLockedError,
    );
    await release();
  });

  it('keeps a held lock fresh past the stale window — the heartbeat is real', async () => {
    // Hold well past staleMs while idle. If the mtime refresh did not fire, the lock would
    // self-expire and the second caller would wrongly succeed — the failure mode that makes
    // a lock worse than none. Proving it is why the timings are compressed but real.
    const release = await acquireDataDirLock(dir, { staleMs: 1000, updateMs: 250 });
    await new Promise((r) => setTimeout(r, 1600));
    await expect(acquireDataDirLock(dir, { staleMs: 1000, updateMs: 250 })).rejects.toBeInstanceOf(
      DataDirLockedError,
    );
    await release();
  });

  it('adopts a stale lock and releases cleanly', async () => {
    const release = await acquireDataDirLock(dir, { staleMs: 500, updateMs: 250 });
    await release();
    // Released → immediately re-acquirable, no wait for staleness.
    const again = await acquireDataDirLock(dir, { staleMs: 500, updateMs: 250 });
    await again();
  });

  it('names the directory and the remedy in the error', async () => {
    const release = await acquireDataDirLock(dir, { staleMs: 2000, updateMs: 500 });
    const err = await acquireDataDirLock(dir, { staleMs: 2000, updateMs: 500 }).catch((e) => e);
    expect(err).toBeInstanceOf(DataDirLockedError);
    expect((err as Error).message).toContain(dir);
    expect((err as Error).message).toMatch(/one spine per data dir|different --data/);
    await release();
  });
});
