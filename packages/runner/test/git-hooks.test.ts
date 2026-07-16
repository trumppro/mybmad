/**
 * git() runs with client-side hooks disabled — the OTHER half of the §8
 * credential boundary.
 *
 * buildAgentEnv keeps the runner's secrets out of the agent's process. But the
 * agent owns the worktree, and git executes hooks out of the repo the agent can
 * write to — under the env of whoever invoked git. git() must still authenticate
 * its push, so an agent-planted `.git/hooks/pre-push` would hand back the ssh
 * agent socket the moment the runner pushes. buildGitEnv (git-env.test.ts) takes
 * the secrets off the table; NOT RUNNING the hook at all is this file's half.
 *
 * Every case here is paired with an UNPROTECTED control that fires the same
 * hook: without it a broken fixture (hook not executable, wrong path) would let
 * these tests pass while proving nothing.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { git } from '../src/index.js';

const RUNNER_SECRET = 'runner-token-a-hook-must-never-see';

let tmpRoot: string;
let repoDir: string;
let originDir: string;
let canary: string;
let evilHooksDir: string;
let priorOahsToken: string | undefined;

/** A hook that leaks the invoking env's secret into the canary file. */
function hookScript(label: string): string {
  return `#!/bin/sh\necho "${label} token=\$OAHS_TOKEN ssh=\$SSH_AUTH_SOCK" >> "${canary}"\nexit 0\n`;
}

function readCanary(): string {
  return existsSync(canary) ? readFileSync(canary, 'utf8').trim() : '';
}

/** A fresh branch with one commit, so each push has something real to send. */
function branchWithCommit(name: string): string {
  git(['checkout', '-q', '-b', name], repoDir);
  writeFileSync(join(repoDir, `${name}.txt`), `${name}\n`, 'utf8');
  git(['add', '-A'], repoDir);
  git(['-c', 'user.name=T', '-c', 'user.email=t@test.local', 'commit', '-m', name], repoDir);
  return name;
}

/** Push WITHOUT hook isolation — what git() did before this fix. */
function unprotectedPush(branch: string): void {
  const run = spawnSync('git', ['push', 'origin', branch], { cwd: repoDir, encoding: 'utf8' });
  expect(run.status).toBe(0);
}

beforeAll(() => {
  // A production runner holds its rails token in the env; simulate that so a
  // fired hook has a real secret to steal.
  priorOahsToken = process.env.OAHS_TOKEN;
  process.env.OAHS_TOKEN = RUNNER_SECRET;

  tmpRoot = mkdtempSync(join(tmpdir(), 'oahs-git-hooks-'));
  repoDir = join(tmpRoot, 'repo');
  originDir = join(tmpRoot, 'origin.git');
  canary = join(tmpRoot, 'canary.txt');
  evilHooksDir = join(tmpRoot, 'evil-hooks');
  mkdirSync(repoDir, { recursive: true });
  mkdirSync(evilHooksDir, { recursive: true });

  git(['init', '-b', 'main'], repoDir);
  writeFileSync(join(repoDir, 'README.md'), '# fixture\n', 'utf8');
  git(['add', '-A'], repoDir);
  git(['-c', 'user.name=T', '-c', 'user.email=t@test.local', 'commit', '-m', 'baseline'], repoDir);
  git(['clone', '--bare', repoDir, originDir], tmpRoot);
  git(['remote', 'add', 'origin', originDir], repoDir);

  // The attack: the agent has write access to the worktree, so it plants hooks.
  for (const hook of ['pre-push', 'post-checkout']) {
    const path = join(repoDir, '.git', 'hooks', hook);
    writeFileSync(path, hookScript(hook.toUpperCase()), 'utf8');
    chmodSync(path, 0o755);
  }
  for (const [name, label] of [
    ['pre-push', 'EVIL-HOOKSPATH'],
    ['fsmonitor', 'FSMONITOR'],
  ] as const) {
    const path = join(evilHooksDir, name);
    writeFileSync(path, hookScript(label), 'utf8');
    chmodSync(path, 0o755);
  }
});

afterAll(() => {
  rmSync(tmpRoot, { recursive: true, force: true });
  if (priorOahsToken === undefined) delete process.env.OAHS_TOKEN;
  else process.env.OAHS_TOKEN = priorOahsToken;
});

beforeEach(() => {
  rmSync(canary, { force: true });
  git(['checkout', '-q', 'main'], repoDir);
  // Not git(): --unset-all exits 5 when the key is already absent, which git() throws on.
  spawnSync('git', ['config', '--unset-all', 'core.hooksPath'], { cwd: repoDir });
});

describe('git() — agent-planted hooks never run under the runner (§8)', () => {
  it('CONTROL: an unprotected push DOES fire the hook and leaks the runner token', () => {
    unprotectedPush(branchWithCommit('control-1'));

    // This is the vector, demonstrated. If this ever stops firing, the fixture
    // is broken and every assertion below is worthless.
    expect(readCanary()).toContain('PRE-PUSH');
    expect(readCanary()).toContain(`token=${RUNNER_SECRET}`);
  });

  it('git() push does not fire .git/hooks/pre-push — and still pushes', () => {
    const branch = branchWithCommit('protected-1');
    const head = git(['rev-parse', 'HEAD'], repoDir);

    git(['push', 'origin', branch], repoDir);

    expect(readCanary()).toBe('');
    // The legitimate operation still worked: the branch is really on the remote.
    expect(git(['ls-remote', 'origin', `refs/heads/${branch}`], repoDir)).toContain(head);
  });

  it('git() push beats an agent-set core.hooksPath (command-line -c outranks repo config)', () => {
    git(['config', 'core.hooksPath', evilHooksDir], repoDir);

    // Control first: the redirected hook is live for an unprotected push.
    unprotectedPush(branchWithCommit('control-2'));
    expect(readCanary()).toContain('EVIL-HOOKSPATH');

    rmSync(canary, { force: true });
    git(['push', 'origin', branchWithCommit('protected-2')], repoDir);

    expect(readCanary()).toBe('');
  });

  it('git() diff does not fire the core.fsmonitor hook', () => {
    // The runner measures the agent's own diff (finishRun step 8) INSIDE the
    // agent's worktree, so this hook is reachable without any push at all.
    git(['config', 'core.fsmonitor', join(evilHooksDir, 'fsmonitor')], repoDir);
    // A TRACKED file — `diff --shortstat HEAD` ignores untracked ones, and this
    // test is only meaningful if the diff it protects measures something.
    writeFileSync(join(repoDir, 'README.md'), '# fixture\nagent edit\n', 'utf8');

    // Control: unprotected, the fsmonitor command runs.
    const control = spawnSync('git', ['diff', '--shortstat', 'HEAD'], {
      cwd: repoDir,
      encoding: 'utf8',
    });
    expect(control.status).toBe(0);
    expect(readCanary()).toContain('FSMONITOR');

    rmSync(canary, { force: true });
    const shortstat = git(['diff', '--shortstat', 'HEAD'], repoDir);

    expect(readCanary()).toBe('');
    expect(shortstat).toContain('file changed'); // the measurement is still real
    git(['checkout', '--', 'README.md'], repoDir);
    spawnSync('git', ['config', '--unset-all', 'core.fsmonitor'], { cwd: repoDir });
  });

  it('git() worktree add does not fire post-checkout', () => {
    // Control first: post-checkout is bound and live for an unprotected add.
    // Without this the assertion below passes just as happily against a hook
    // that was never wired up.
    const controlDir = join(tmpRoot, 'wt-control');
    const control = spawnSync('git', ['worktree', 'add', '-b', 'ctl/wt', controlDir, 'main'], {
      cwd: repoDir,
      encoding: 'utf8',
    });
    expect(control.status).toBe(0);
    expect(readCanary()).toContain('POST-CHECKOUT');
    git(['worktree', 'remove', '--force', controlDir], repoDir);

    rmSync(canary, { force: true });
    const worktreeDir = join(tmpRoot, 'wt-1');

    git(['worktree', 'add', '-b', 'claim/wt-1', worktreeDir, 'main'], repoDir);

    expect(readCanary()).toBe('');
    expect(existsSync(join(worktreeDir, 'README.md'))).toBe(true); // the checkout really happened
    git(['worktree', 'remove', '--force', worktreeDir], repoDir);
  });
});
