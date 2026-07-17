/**
 * §10.3 — claim-scoped push credentials.
 *
 * Two properties are pinned here:
 *  1. the push presents a credential that authorizes ONLY
 *     `refs/heads/claim/<claimId>` — the fake remote (a bare repo whose
 *     pre-receive hook stands in for the forge's per-ref ACL) rejects any other
 *     ref pushed with it;
 *  2. the broker that carries the credential is per-dispatch, 0700, keeps the
 *     secret OFF disk (env-only), and is removed when the push is done.
 *
 * The complementary half — that the AGENT CHILD never sees any of this — is
 * pinned in agent-env.test.ts, where GIT_ASKPASS and the push vars are asserted
 * absent from buildAgentEnv's output.
 *
 * Note on fidelity: a local/file:// push does not authenticate, so git never
 * invokes the askpass broker here; the broker is therefore exercised directly
 * (as git would) rather than through a fake HTTP git server. The ref-scope half
 * IS end-to-end: the hook runs on the receiving side and really does reject.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { CREDENTIAL_HELPER_RESET, git, pushRef, redactSecrets, writePushAskpass } from '../src/index.js';

const CLAIM_ID = 'clm_scoped_1';
const CLAIM_BRANCH = `claim/${CLAIM_ID}`;
const SECRET = 'ghs_super_secret_push_token';

let tmpRoot: string;
let repoPath: string;
let originPath: string;

/** A remote that only authorizes the claim branch — the forge ACL, in a hook. */
function makeRefScopedRemote(): void {
  tmpRoot = mkdtempSync(join(tmpdir(), 'oahs-pushcred-'));
  repoPath = join(tmpRoot, 'repo');
  originPath = join(tmpRoot, 'origin.git');
  mkdirSync(repoPath, { recursive: true });
  git(['init', '-b', 'main'], repoPath);
  writeFileSync(join(repoPath, 'a.txt'), 'base\n', 'utf8');
  git(['add', '-A'], repoPath);
  git(['-c', 'user.name=S', '-c', 'user.email=s@t', 'commit', '-m', 'base'], repoPath);
  git(['clone', '--bare', repoPath, originPath], tmpRoot);
  git(['remote', 'add', 'origin', originPath], repoPath);

  const hook = join(originPath, 'hooks', 'pre-receive');
  writeFileSync(
    hook,
    [
      '#!/bin/sh',
      '# Stands in for the forge ACL a CLAIM-SCOPED credential carries: this',
      '# credential may write exactly one ref.',
      'while read -r old new ref; do',
      `  if [ "$ref" != "refs/heads/${CLAIM_BRANCH}" ]; then`,
      '    echo "credential not authorized for $ref" >&2',
      '    exit 1',
      '  fi',
      'done',
      'exit 0',
      '',
    ].join('\n'),
    { encoding: 'utf8', mode: 0o755 },
  );
}

beforeAll(() => {
  makeRefScopedRemote();
});
afterAll(() => {
  rmSync(tmpRoot, { recursive: true, force: true });
});

describe('writePushAskpass — the per-dispatch credential broker (§10.3)', () => {
  it('is 0700, answers git’s username/password prompts, and keeps the secret OFF disk', () => {
    const dir = join(tmpRoot, 'brokers');
    const broker = writePushAskpass(dir, { username: 'x-access-token', password: SECRET });
    const scriptPath = broker.env['GIT_ASKPASS']!;

    // 0700: only the runner may read or run the broker.
    expect(statSync(scriptPath).mode & 0o777).toBe(0o700);
    // The secret lives in the env of the git process, never in a file.
    expect(readFileSync(scriptPath, 'utf8')).not.toContain(SECRET);
    expect(broker.env['OAHS_PUSH_PASS']).toBe(SECRET);

    // Answer git's two prompts exactly as git would ask them.
    const ask = (prompt: string): string =>
      execFileSync(scriptPath, [prompt], { env: broker.env, encoding: 'utf8' }).trim();
    expect(ask("Username for 'https://github.com': ")).toBe('x-access-token');
    expect(ask("Password for 'https://x-access-token@github.com': ")).toBe(SECRET);

    // The broker dies with the push.
    broker.cleanup();
    expect(existsSync(scriptPath)).toBe(false);
  });
});

describe('the broker outranks any ambient credential helper (§10.3)', () => {
  // A local/file:// push never authenticates, so this drives git's REAL credential
  // machinery directly (`credential fill`) with the exact args + env pushRef uses.
  // Without the reset a configured helper answers FIRST and the broker is dead
  // code — the claim-scoped token would silently never be used, and `credential
  // approve` would hand it to that helper to persist.
  function fill(extraArgs: readonly string[], env: NodeJS.ProcessEnv): { out: string; helperRan: boolean } {
    const marker = join(tmpRoot, `helper-ran-${Math.random().toString(16).slice(2)}`);
    const helper = join(tmpRoot, 'ambient-helper.sh');
    writeFileSync(
      helper,
      ['#!/bin/sh', `echo ran >> "${marker}"`, '[ "$1" = get ] && printf \'username=ambient\\npassword=AMBIENT_REPO_WIDE\\n\'', 'exit 0', ''].join('\n'),
      { encoding: 'utf8', mode: 0o755 },
    );
    const out = execFileSync(
      'git',
      ['-c', `credential.helper=${helper}`, ...extraArgs, 'credential', 'fill'],
      { cwd: repoPath, input: 'protocol=https\nhost=oahs.test\n\n', encoding: 'utf8', env },
    );
    return { out, helperRan: existsSync(marker) };
  }

  it('with the reset the broker answers and the ambient helper is never consulted', () => {
    const broker = writePushAskpass(join(tmpRoot, 'brokers2'), { username: 'x-access-token', password: SECRET });
    try {
      const env = { ...process.env, ...broker.env, GIT_TERMINAL_PROMPT: '0' };
      const withReset = fill(CREDENTIAL_HELPER_RESET, env);
      expect(withReset.out).toContain(`password=${SECRET}`); // the CLAIM-SCOPED token
      expect(withReset.out).not.toContain('AMBIENT_REPO_WIDE');
      expect(withReset.helperRan).toBe(false); // nothing to persist it, either

      // Without the reset the helper wins — the defect this guards against.
      const without = fill([], env);
      expect(without.out).toContain('AMBIENT_REPO_WIDE');
      expect(without.out).not.toContain(SECRET);
      expect(without.helperRan).toBe(true);
    } finally {
      broker.cleanup();
    }
  });
});

describe('redactSecrets — a failed push must not publish the credential (§10.3)', () => {
  it('scrubs URL-embedded credentials and the secret itself', () => {
    const msg = `fatal: Authentication failed for 'https://x-access-token:${SECRET}@github.com/o/r.git' (${SECRET})`;
    const safe = redactSecrets(msg, SECRET);
    expect(safe).not.toContain(SECRET);
    expect(safe).toContain('<redacted>');
    expect(safe).toContain('github.com/o/r.git'); // still explains itself
  });
});

describe('claim-scoped push credential — authorizes ONE ref (§10.3)', () => {
  it('pushes refs/heads/claim/<claimId> and is refused for any other ref', () => {
    const credential = { username: 'x-access-token', password: SECRET };

    // The claim branch — what the credential is scoped to — goes through.
    git(['checkout', '-b', CLAIM_BRANCH], repoPath);
    writeFileSync(join(repoPath, 'work.txt'), 'agent work\n', 'utf8');
    git(['add', '-A'], repoPath);
    git(['-c', 'user.name=A', '-c', 'user.email=a@t', 'commit', '-m', 'work'], repoPath);
    const sha = git(['rev-parse', 'HEAD'], repoPath);

    const lsRemote = pushRef({ repoPath, remote: 'origin', branch: CLAIM_BRANCH, credential });
    expect(lsRemote).toContain(sha);

    // ANY other ref with the same credential is rejected by the remote.
    git(['checkout', 'main'], repoPath);
    writeFileSync(join(repoPath, 'sneak.txt'), 'not my branch\n', 'utf8');
    git(['add', '-A'], repoPath);
    git(['-c', 'user.name=A', '-c', 'user.email=a@t', 'commit', '-m', 'sneak'], repoPath);
    expect(() => pushRef({ repoPath, remote: 'origin', branch: 'main', credential })).toThrow(
      /not authorized|pre-receive hook declined/,
    );
  });

  it('leaves no broker behind — not even when the push is refused', () => {
    try {
      pushRef({ repoPath, remote: 'origin', branch: 'main', credential: { password: SECRET } });
    } catch {
      /* expected: the remote refuses this ref */
    }
    // pushRef cleans up in a `finally`, so a throw still takes the broker with it.
    const brokerDir = join(repoPath, '.oahs', 'tmp');
    const leftovers = existsSync(brokerDir) ? readdirSync(brokerDir) : [];
    expect(leftovers.filter((f) => f.startsWith('askpass-'))).toEqual([]);
  });
});
