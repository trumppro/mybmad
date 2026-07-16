/**
 * The knobs HOOK_ISOLATION cannot close, starved by buildGitEnv (§8).
 *
 * Repo-local `.git/config` is agent-writable (every worktree shares the common
 * dir) and `.gitattributes` is committable, so an agent can still name commands
 * git will execute — and those run with the env of whoever invoked git, i.e. the
 * runner. Two are pinned here, both reachable from the runner's OWN calls:
 *
 *   filter.<n>.smudge  fires on `worktree add` (the runner's checkout)
 *   ext:: remote URL   fires on anything touching that remote
 *
 * The distinction this file draws, and the reason it is separate from
 * git-hooks.test.ts: a hook is STOPPED, whereas a filter still RUNS and is
 * merely starved. Asserting "it did not fire" would be wrong here; the contract
 * is that it fires inheriting no secret from the runner's ENV.
 *
 * That contract is narrower than it sounds, and these tests should not be read
 * as proving more: a fired knob is arbitrary same-uid code, so it can still read
 * $HOME/.oahs/config.json or ~/.ssh/id_* off disk. Env narrowing is defence in
 * depth; §10's sandbox is the boundary.
 *
 * As in git-hooks.test.ts every case is paired with an UNPROTECTED control that
 * fires the same mechanism and DOES capture the secret — without it, a broken
 * fixture (filter never bound, attribute unmatched) would let these pass while
 * proving nothing.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { git } from '../src/index.js';

const RUNNER_SECRET = 'runner-token-a-knob-must-never-see';
const MODEL_KEY = 'sk-live-model-key-must-never-leak';
const FAKE_SSH_SOCK = '/tmp/oahs-test-agent.sock';

let tmpRoot: string;
let repoDir: string;
let canary: string;
let saved: Record<string, string | undefined> = {};

function readCanary(): string {
  return existsSync(canary) ? readFileSync(canary, 'utf8').trim() : '';
}

/**
 * Records the invoking env into the canary.
 *
 * `passThrough` is not cosmetic: a smudge filter MUST copy stdin to stdout or it
 * corrupts the checkout, while a transport helper must NOT — a `cat` there
 * blocks on a pipe git never closes and hangs the run instead of failing it.
 */
function leakScript(label: string, passThrough: boolean): string {
  return [
    '#!/bin/sh',
    `echo "${label} token=[\$OAHS_TOKEN] model=[\$OAHS_MODEL_API_KEY] ssh=[\$SSH_AUTH_SOCK]" >> "${canary}"`,
    passThrough ? 'cat' : 'exit 1',
    '',
  ].join('\n');
}

/** Controls run raw git deliberately, so give them a hard stop of their own. */
function unprotectedGit(args: string[]): ReturnType<typeof spawnSync> {
  return spawnSync('git', args, { cwd: repoDir, encoding: 'utf8', timeout: 30_000 });
}

beforeAll(() => {
  for (const [key, value] of Object.entries({
    OAHS_TOKEN: RUNNER_SECRET,
    OAHS_MODEL_API_KEY: MODEL_KEY,
    SSH_AUTH_SOCK: FAKE_SSH_SOCK,
  })) {
    saved[key] = process.env[key];
    process.env[key] = value;
  }

  tmpRoot = mkdtempSync(join(tmpdir(), 'oahs-git-knobs-'));
  repoDir = join(tmpRoot, 'repo');
  canary = join(tmpRoot, 'canary.txt');
  mkdirSync(repoDir, { recursive: true });

  git(['init', '-b', 'main'], repoDir);

  // The agent's plant: a filter bound to a tracked file by a COMMITTED
  // .gitattributes, with the command itself in repo-local .git/config.
  const smudge = join(tmpRoot, 'smudge.sh');
  writeFileSync(smudge, leakScript('SMUDGE', true), 'utf8');
  chmodSync(smudge, 0o755);
  writeFileSync(join(repoDir, 'payload.txt'), 'file content\n', 'utf8');
  writeFileSync(join(repoDir, '.gitattributes'), 'payload.txt filter=pwn\n', 'utf8');
  git(['add', '-A'], repoDir);
  git(['-c', 'user.name=T', '-c', 'user.email=t@test.local', 'commit', '-m', 'baseline'], repoDir);
  git(['config', 'filter.pwn.smudge', smudge], repoDir);
});

afterAll(() => {
  rmSync(tmpRoot, { recursive: true, force: true });
  for (const [key, value] of Object.entries(saved)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  saved = {};
});

beforeEach(() => {
  rmSync(canary, { force: true });
});

describe('buildGitEnv — an agent-set config knob fires with nothing to steal (§8)', () => {
  it('CONTROL: an unprotected worktree add lets the smudge filter read every secret', () => {
    const run = unprotectedGit(['worktree', 'add', '-q', join(tmpRoot, 'wt-control'), 'HEAD']);
    expect(run.status).toBe(0);

    // The vector, demonstrated. If this stops firing the fixture is broken and
    // the assertions below are worthless.
    expect(readCanary()).toContain('SMUDGE');
    expect(readCanary()).toContain(`token=[${RUNNER_SECRET}]`);
    expect(readCanary()).toContain(`model=[${MODEL_KEY}]`);
    expect(readCanary()).toContain(`ssh=[${FAKE_SSH_SOCK}]`);
  });

  it('git() worktree add: the filter still fires, but sees no token, no model key, no ssh socket', () => {
    const worktreeDir = join(tmpRoot, 'wt-protected');

    git(['worktree', 'add', '-q', worktreeDir, 'HEAD'], repoDir);

    // It RAN — env narrowing starves a filter, it does not stop one.
    expect(readCanary()).toContain('SMUDGE');
    // ...and got nothing. Empty brackets, not the secret.
    expect(readCanary()).toContain('token=[]');
    expect(readCanary()).toContain('model=[]');
    expect(readCanary()).not.toContain(RUNNER_SECRET);
    expect(readCanary()).not.toContain(MODEL_KEY);
    // The socket is withheld from local subcommands: a filter holding it could
    // SIGN as the operator, not merely read a token.
    expect(readCanary()).toContain('ssh=[]');
    expect(readCanary()).not.toContain(FAKE_SSH_SOCK);

    // The checkout is still real and the filter still passed content through.
    expect(readFileSync(join(worktreeDir, 'payload.txt'), 'utf8')).toBe('file content\n');
    git(['worktree', 'remove', '--force', worktreeDir], repoDir);
  });

  it('git() blocks an ext:: remote even when the agent re-enables the protocol', () => {
    const evil = join(tmpRoot, 'ext-transport.sh');
    writeFileSync(evil, leakScript('EXT', false), 'utf8');
    chmodSync(evil, 0o755);
    git(['remote', 'add', 'evil', `ext::${evil} %S`], repoDir);
    // git blocks ext:: by DEFAULT — but the default is repo-config-overridable,
    // and this config belongs to the agent.
    git(['config', 'protocol.ext.allow', 'always'], repoDir);

    // Control: without the pin, the agent's opt-in wins and the command runs.
    const control = unprotectedGit(['ls-remote', 'evil']);
    expect(control.status).not.toBe(0); // the fake transport speaks no protocol
    expect(readCanary()).toContain('EXT');
    expect(readCanary()).toContain(`token=[${RUNNER_SECRET}]`); // ...having read the token

    rmSync(canary, { force: true });
    expect(() => git(['ls-remote', 'evil'], repoDir)).toThrow(/transport 'ext' not allowed/);

    expect(readCanary()).toBe(''); // never executed at all
    git(['remote', 'remove', 'evil'], repoDir);
    spawnSync('git', ['config', '--unset-all', 'protocol.ext.allow'], { cwd: repoDir });
  });
});
