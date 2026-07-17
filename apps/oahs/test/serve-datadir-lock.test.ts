/**
 * `oahs serve` refuses to open a data dir another server already holds.
 *
 * PGlite does not lock its directory: two servers on one dir both accept writes and then
 * destroy it (RuntimeError: Aborted() at the next open — reproduced by hand). The lock
 * lives in startServe's MAIN process (not the synckit worker, which is a thread killed on
 * exit without cleanup, so a lock there would outlive a clean shutdown and block restart).
 *
 * The conflict case needs two OS PROCESSES: two startServe calls in one test share the
 * synckit worker and its in-process db cache, so the second never reaches the lock. So the
 * conflict is driven through the built binary in a child process; the release-on-close and
 * failed-bind cases are observable in-process.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { startServe, type ServeHandle } from '../src/serve.js';

const bin = fileURLToPath(new URL('../bin/oahs.mjs', import.meta.url));

let dataDir: string;
beforeEach(() => {
  dataDir = mkdtempSync(join(tmpdir(), 'oahs-serve-lock-'));
});
afterEach(() => {
  rmSync(dataDir, { recursive: true, force: true });
});

/** Ports spread by vitest worker id so parallel test files do not collide. */
function port(offset: number): number {
  return 4900 + Number(process.env.VITEST_POOL_ID ?? '0') * 10 + offset;
}

describe('oahs serve — data dir lock', () => {
  it('a second serve on a held data dir refuses, and says why', async () => {
    const first: ServeHandle = await startServe({ dataDir, port: port(1), adminToken: 'x' });
    try {
      // A whole second OS process — the case the in-process db cache would otherwise hide.
      const res = spawnSync(
        process.execPath,
        [bin, 'serve', '--data', dataDir, '--port', String(port(2))],
        { encoding: 'utf8', env: { ...process.env, OAHS_ADMIN_TOKEN: 'y' }, timeout: 20_000 },
      );
      expect(res.status).not.toBe(0);
      expect(`${res.stderr}${res.stdout}`).toMatch(/already being served|one spine per data dir/);
    } finally {
      await first.close();
    }
  });

  it('releases on close, so an immediate restart is NOT blocked', async () => {
    // Why the lock is in the main process, not the worker: a clean shutdown must free the
    // dir at once, or a `systemctl restart` would fail for a full stale window (20s). No
    // sleep here — release must be synchronous with close().
    const first: ServeHandle = await startServe({ dataDir, port: port(3), adminToken: 'x' });
    await first.close();
    const second: ServeHandle = await startServe({ dataDir, port: port(3), adminToken: 'x' });
    await second.close();
  });

  it('a failed bind releases the lock instead of stranding it', async () => {
    const lockPath = `${join(dataDir, 'pg')}.lock`;
    // Hold the port so the second startServe's listen() throws AFTER it took the lock.
    const other = mkdtempSync(join(tmpdir(), 'oahs-other-'));
    const blocker: ServeHandle = await startServe({ dataDir: other, port: port(4) });
    try {
      await expect(
        startServe({ dataDir, port: port(4), adminToken: 'x' }),
      ).rejects.toBeTruthy();
      // The lock this failed attempt took must be gone, or the next serve is refused for a
      // stale window over a port typo. Assert the lock file itself, not a side effect.
      expect(existsSync(lockPath)).toBe(false);
    } finally {
      await blocker.close();
      rmSync(other, { recursive: true, force: true });
    }
  });
});
