/**
 * The bundled binary itself: bin/oahs.mjs (built by pretest) must run under
 * plain `node` — --help exits 0 and lists every command; a gate-holder
 * command without a token fails with exit 1 and a clear message; `oahs work`
 * surfaces runner errors clearly (lazy import of @oahs/runner).
 */
import { execFile } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const run = promisify(execFile);
const bin = fileURLToPath(new URL('../bin/oahs.mjs', import.meta.url));

// A profile root of our own. Without it the spawned binary reads the DEVELOPER's
// real ~/.oahs/config.json, so "no token" is only true on a machine that has never
// run `oahs init` — i.e. this suite passed on CI and failed for anyone dogfooding
// the product. Green must not depend on whose laptop it is.
let profileHome: string;
beforeAll(() => {
  profileHome = mkdtempSync(join(tmpdir(), 'oahs-bin-'));
});
afterAll(() => {
  rmSync(profileHome, { recursive: true, force: true });
});

interface FailedRun {
  code?: number;
  stderr?: string;
}

/** Run the binary expecting a non-zero exit; resolves with the failure shape. */
async function runExpectingFailure(
  args: string[],
  env?: NodeJS.ProcessEnv,
): Promise<FailedRun> {
  try {
    await run(process.execPath, [bin, ...args], env !== undefined ? { env } : {});
    throw new Error('expected the command to exit non-zero');
  } catch (error) {
    return error as FailedRun;
  }
}

describe('bin/oahs.mjs (esbuild bundle)', () => {
  it('--help exits 0 and lists the commands', async () => {
    // execFile rejects on a non-zero exit — resolving IS the exit-0 assertion.
    const { stdout } = await run(process.execPath, [bin, '--help']);
    for (const command of ['serve', 'inbox', 'approve', 'reject', 'status', 'actor', 'grant', 'feature', 'import', 'events', 'work', 'whoami', 'claim', 'token', 'project']) {
      expect(stdout).toContain(command);
    }
  });

  it('a gate-holder command without a token exits 1 with a clear error', async () => {
    const result = await runExpectingFailure(['inbox'], {
      ...process.env,
      OAHS_TOKEN: '',
      OAHS_HOME: profileHome,
    });
    expect(result.code).toBe(1);
    expect(result.stderr).toContain('missing token');
  });

  it('oahs work accepts the scoping + lease flags (--feature --project --claim-ttl --heartbeat)', async () => {
    // Same dead-URL shape as the failure test below — the point is that every
    // flag is a known option (no commander "unknown option" error).
    const result = await runExpectingFailure([
      'work', '--repo', '.', '--spec-folder', 'spec', '--agent-cmd', 'echo x', '--once',
      '--feature', 'feat_000001', '--project', 'alpha',
      '--claim-ttl', '5000', '--heartbeat', '1000',
      '--url', 'http://127.0.0.1:1', '--token', 'irrelevant',
    ]);
    expect(result.stderr).not.toContain('unknown option');
    expect(result.stderr).toContain('oahs work failed');
  });

  it('oahs work surfaces runner failures clearly (lazy import, exit 1)', async () => {
    // Whatever state @oahs/runner is in (stub → throws immediately; real →
    // polls and fails to reach this dead URL), the CLI must exit 1 with the
    // prefixed error, never crash or hang.
    const result = await runExpectingFailure([
      'work', '--repo', '.', '--spec-folder', 'spec', '--agent-cmd', 'echo x', '--once',
      '--url', 'http://127.0.0.1:1', '--token', 'irrelevant',
    ]);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain('oahs work failed');
  });
});
