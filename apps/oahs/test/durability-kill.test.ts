/**
 * The durability claim, tested (0.3) — and the restart window it exposes.
 *
 * `serve --data` is the DEFAULT and what compose runs, and the whole product rests
 * on the event log being durable. But the only persistence test restarted the server
 * through a graceful `handle.close()` — nothing anywhere killed a process mid-life
 * and reopened the directory. So "durable" meant "survives a polite shutdown", which
 * is not what an operator needs it to mean: every `docker stop` that overruns its
 * grace period, every OOM-kill, every power loss is the ungraceful path.
 *
 * This spawns the real built binary, writes committed state through the rails,
 * SIGKILLs it (no handlers run — not even the SIGTERM drain added in 0.3), and
 * reopens the same data dir with a second process to assert the state is there.
 *
 * Two things this establishes rather than assumes:
 *
 *  1. **PGlite's per-write durability is sufficient on this path.** The committed
 *     command is there after kill -9, so the absence of an explicit `pglite.close()`
 *     is not the data-loss risk it looks like. Worth knowing before adding ceremony
 *     that merely feels safer.
 *
 *  2. **A killed server holds its data-dir lock for up to the stale window (~20s),
 *     so an immediate restart is REFUSED.** This is the cost of the 0.1.1 fix and it
 *     is the right trade — the alternative is the data-loss bug it replaced — but it
 *     is a real operational property, not a detail: under compose's
 *     `restart: unless-stopped`, a killed container will crash-loop for that window
 *     before coming up. It self-heals, and the error message says so. It is pinned
 *     here so it is a known property with a test rather than a surprise at 2am.
 *     (proper-lockfile is configured mtime-stale rather than PID-based on purpose:
 *     `serve` is PID 1 in its container, so a PID check would refuse every valid
 *     restart. See packages/db/src/data-lock.ts.)
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const BIN = resolve(__dirname, '..', 'bin', 'oahs.mjs');
const ADMIN = 'durability-admin-token';

let dataDir: string;
let tmpRoot: string;

/** Wait for the server to print its listening line, or fail loudly. */
async function waitForListening(child: ChildProcess): Promise<number> {
  return new Promise((resolvePort, reject) => {
    const timer = setTimeout(() => reject(new Error('server did not report listening within 60s')), 60_000);
    let buffered = '';
    let errors = '';
    child.stdout?.on('data', (chunk: Buffer) => {
      buffered += chunk.toString();
      const match = /listening on :(\d+)/.exec(buffered);
      if (match?.[1] !== undefined) {
        clearTimeout(timer);
        resolvePort(Number(match[1]));
      }
    });
    // stderr is where the CLI reports why it refused to start. Omitting it from the
    // rejection makes every startup failure look identical.
    child.stderr?.on('data', (chunk: Buffer) => {
      errors += chunk.toString();
    });
    child.on('exit', (code) => {
      clearTimeout(timer);
      reject(new Error(`server exited early (code ${String(code)})\nstdout: ${buffered}\nstderr: ${errors}`));
    });
  });
}

function rpc(port: number, command: string, body: unknown, token = ADMIN): unknown {
  // curl rather than fetch: this test's subject is a SEPARATE OS process, and shelling
  // out keeps the assertion free of any in-process state that could mask a lost write.
  const result = spawnSync(
    'curl',
    [
      '-sS',
      '-X',
      'POST',
      `http://127.0.0.1:${String(port)}/rpc/${command}`,
      '-H',
      'content-type: application/json',
      '-H',
      `authorization: Bearer ${token}`,
      '-d',
      JSON.stringify(body),
    ],
    { encoding: 'utf8', shell: false },
  );
  if (result.status !== 0) throw new Error(`curl failed: ${result.stderr}`);
  return JSON.parse(result.stdout) as unknown;
}

/**
 * Retry until the abandoned lock goes stale. Bounded, and it reports how long it
 * waited so a regression in the stale window shows up as a number rather than a hang.
 */
async function startServerWhenUnlocked(): Promise<{ child: ChildProcess; port: number }> {
  const startedAt = Date.now();
  for (;;) {
    try {
      return await startServer();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const elapsed = Date.now() - startedAt;
      if (!message.includes('already being served') || elapsed > 60_000) {
        throw new Error(`still could not start after ${String(elapsed)}ms: ${message}`);
      }
      await new Promise((r) => setTimeout(r, 1_000));
    }
  }
}

function startServer(): Promise<{ child: ChildProcess; port: number }> {
  const child = spawn(process.execPath, [BIN, 'serve', '--data', dataDir, '--port', '0'], {
    env: { ...process.env, OAHS_ADMIN_TOKEN: ADMIN, OAHS_HOST: '127.0.0.1' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return waitForListening(child).then((port) => ({ child, port }));
}

beforeAll(() => {
  tmpRoot = mkdtempSync(join(tmpdir(), 'oahs-durability-'));
  dataDir = join(tmpRoot, 'data');
});

afterAll(() => {
  rmSync(tmpRoot, { recursive: true, force: true });
});

describe('durability across an UNGRACEFUL death (SIGKILL)', () => {
  it('committed state survives kill -9 and is readable by a second process', async () => {
    expect(existsSync(BIN)).toBe(true); // `make build` is a precondition, not an excuse

    const first = await startServer();
    // Write through the rails, not the filesystem: the claim under test is that a
    // committed COMMAND survives, which is what an operator loses sleep over.
    const feature = rpc(first.port, 'create_feature', {}) as { ok: boolean; result?: { id: string } };
    expect(feature.ok).toBe(true);
    const featureId = feature.result?.id;
    expect(featureId).toBeTypeOf('string');

    const created = rpc(first.port, 'create_work_item', {
      featureId,
      externalKey: 'survives-1',
      title: 'written before the kill',
    }) as { ok: boolean };
    expect(created.ok).toBe(true);

    // SIGKILL: no signal handler, no drain, no lock release, no PGlite close. The
    // harshest thing an operator's environment can do to this process.
    first.child.kill('SIGKILL');
    await new Promise<void>((done) => first.child.on('exit', () => done()));

    // An IMMEDIATE restart is refused: the killed process never released the lock and
    // its mtime is still fresh. Asserted, because this is the window an operator's
    // supervisor will crash-loop through.
    await expect(startServer()).rejects.toThrow(/already being served by another process/);

    // Once the lock goes stale it clears itself — no human, no force flag.
    const second = await startServerWhenUnlocked();
    try {
      const read = rpc(second.port, 'get_work_item', { workItemId: 'survives-1' }) as {
        ok: boolean;
        result?: { externalKey: string; title: string };
      };
      expect(read.ok).toBe(true);
      expect(read.result?.externalKey).toBe('survives-1');
      expect(read.result?.title).toBe('written before the kill');

      // The event log — the audit substrate — survived too, not just the projection.
      const events = rpc(second.port, 'query_events', {}) as { ok: boolean; result?: unknown[] };
      expect(events.ok).toBe(true);
      expect((events.result ?? []).length).toBeGreaterThan(0);
    } finally {
      second.child.kill('SIGKILL');
      await new Promise<void>((done) => second.child.on('exit', () => done()));
    }
  }, 180_000);
});
