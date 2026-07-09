/**
 * The bundled binary itself: bin/oahs.mjs (built by pretest) must run under
 * plain `node` — --help exits 0 and lists every command; a gate-holder
 * command without a token fails with exit 1 and a clear message; `oahs work`
 * surfaces runner errors clearly (lazy import of @oahs/runner).
 */
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';

const run = promisify(execFile);
const bin = fileURLToPath(new URL('../bin/oahs.mjs', import.meta.url));

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
    for (const command of ['serve', 'inbox', 'approve', 'reject', 'status', 'actor', 'grant', 'feature', 'import', 'events', 'work']) {
      expect(stdout).toContain(command);
    }
  });

  it('a gate-holder command without a token exits 1 with a clear error', async () => {
    const result = await runExpectingFailure(['inbox'], { ...process.env, OAHS_TOKEN: '' });
    expect(result.code).toBe(1);
    expect(result.stderr).toContain('missing token');
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
