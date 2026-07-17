/**
 * A cross-process lock on a durable data directory.
 *
 * Why this exists: PGlite does NOT lock its directory (the worker.ts comment that
 * claimed it did was false), and two processes opening one dataDir both serve writes
 * and then destroy it — restart either and PGlite dies with `RuntimeError: Aborted()`,
 * permanently. Reproduced with two `oahs serve --data <same>`. This lock makes the
 * second opener refuse instead.
 *
 * Mechanism is proper-lockfile's `mkdir` strategy: atomic on every filesystem
 * (including network ones — `O_EXCL` is not), and staleness is judged by the lock's
 * `mtime`, which the holder refreshes on a timer. Deliberately NOT a pid file: the
 * agent/serve process is pid 1 in its container (Dockerfile ENTRYPOINT is `node`
 * directly, no init), so after a crashed container restart the fresh process is pid 1
 * again, `kill(1, 0)` succeeds, and a pid check would refuse every valid restart. An
 * mtime that stops advancing when the holder dies has no such failure mode.
 */
import { mkdirSync } from 'node:fs';

// Static import, NOT createRequire: proper-lockfile lives only in packages/db's own
// node_modules (pnpm isolates it), so a runtime `require('proper-lockfile')` from the
// bundled `oahs` binary — which resolves from apps/oahs/bin — cannot find it and the real
// serve crashes with "Cannot find module". A static import makes esbuild inline the
// package into the bundle, so the binary is self-contained. (Source-run tests found it
// either way, which is exactly why the gap only showed up against the built binary.)
import { lock as acquireLock } from 'proper-lockfile';

/**
 * A holder refreshes the lock's mtime every UPDATE_MS; a lock older than STALE_MS is
 * treated as abandoned and adopted. STALE_MS must be comfortably larger than UPDATE_MS
 * so an ordinary GC pause or a busy event loop cannot let a live lock look dead — four
 * refreshes fit inside one stale window here. proper-lockfile requires update ≤ stale/2.
 */
const STALE_MS = 20_000;
const UPDATE_MS = 5_000;

export class DataDirLockedError extends Error {
  constructor(readonly dataDir: string) {
    super(
      `data directory is already being served by another process: ${dataDir}\n` +
        `Two oahs servers on one data dir both accept writes and then destroy it — run ` +
        `one spine per data dir (use a different --data), or stop the other server first. ` +
        `If you are certain no server is running, an abandoned lock clears itself within ` +
        `${STALE_MS / 1000}s; wait that long and retry.`,
    );
    this.name = 'DataDirLockedError';
  }
}

/**
 * Acquire the lock for `dataDir`, or throw DataDirLockedError if another live process
 * holds it. Returns a release function. The lock also releases automatically on process
 * exit (proper-lockfile registers a signal-exit handler), which is the crash path: a
 * killed holder stops refreshing mtime and the lock goes stale.
 *
 * `opts` overrides the timing for tests only — production uses the module constants.
 */
export async function acquireDataDirLock(
  dataDir: string,
  opts: { staleMs?: number; updateMs?: number } = {},
): Promise<() => Promise<void>> {
  // proper-lockfile stats the target before locking, so the dir must exist. serve.ts is
  // about to open PGlite on it (which would create it), but the lock has to come first —
  // opening the dir is what corrupts it — so create it here.
  mkdirSync(dataDir, { recursive: true });
  try {
    return await acquireLock(dataDir, {
      stale: opts.staleMs ?? STALE_MS,
      update: opts.updateMs ?? UPDATE_MS,
      realpath: false,
    });
  } catch (error) {
    if ((error as { code?: string }).code === 'ELOCKED') {
      throw new DataDirLockedError(dataDir);
    }
    throw error;
  }
}
