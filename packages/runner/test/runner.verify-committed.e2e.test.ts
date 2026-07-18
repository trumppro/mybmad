/**
 * Soundness: pinned verification measures the COMMITTED revision, not the dirty worktree.
 *
 * finishRun runs pinned verification in the worktree but records `commit` evidence as HEAD.
 * The fix (normalizeWorktreeToHead) resets the worktree to HEAD's tracked content and removes
 * untracked-new files before verifying, leaving gitignored deps and .oahs/ scratch in place — so a test cannot pass on code the commit lacks, and legitimate scratch never causes a
 * spurious block (the flaw that sank the earlier dirty-tree attempt).
 *
 * Cases, all driven through a real runOnce host run:
 *  - EXPLOIT: agent commits a decoy but leaves the tested file uncommitted → the test now FAILS
 *    (the file is reset away for verification) → the done gate refuses to certify.
 *  - CONTROL: agent commits the tested file → verification passes on HEAD → certifies.
 *  - SCRATCH: agent commits the tested file AND leaves untracked scratch (.DS_Store, .pytest_cache)
 *    → still passes, no spurious block (the false-positive the previous fix produced).
 *  - SKIP-WORKTREE: an agent hides a tracked modification with skip-worktree → cleared + reset.
 *  - NORMALIZE-FAIL: a poisoned index makes normalization fail → the run BLOCKS, never verifies dirty.
 *  - CRASH-ADOPT: the local re-adopt of a crashed run's dirty worktree also normalizes.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import type { AddressInfo } from 'node:net';
import { createMemoryEngine, type Actor, type Feature, type WorkItem } from '@oahs/core';
import { makeClient, type OahsClient } from '@oahs/contracts';
import { TokenStore, buildServer } from '@oahs/spine-api';

import { git, runOnce, type RunnerOptions } from '../src/index.js';

const ADMIN_TOKEN = 'runner-verify-admin';
const SPEC_FOLDER = 'spec';
const STORIES_YAML = `
- id: exploit
  title: partial-commit exploit
  description: leave the tested file uncommitted
  spec_checkpoint: false
- id: control
  title: clean commit
  description: commit the tested file
  spec_checkpoint: false
- id: scratch
  title: clean commit plus untracked scratch
  description: commit the tested file, leave scratch
  spec_checkpoint: false
- id: skipworktree
  title: hide a tracked modification with skip-worktree
  description: an adversarial hide the normalization must sweep
  spec_checkpoint: false
- id: stashfail
  title: force normalization to fail
  description: a poisoned index lock must block, not verify dirty
  spec_checkpoint: false
- id: crashadopt
  title: crash then local re-adopt of a dirty leftover worktree
  description: the adopt path must normalize too
  spec_checkpoint: false
- id: nestedrepo
  title: hide the tested file inside a nested git repo
  description: git clean must use -ffd to delete a nested repo
  spec_checkpoint: false
`;

// The pinned command all three stories share: pass iff out.txt exists in the tree it runs in.
const PIN = 'node -e "process.exit(require(\'fs\').existsSync(\'out.txt\')?0:1)"';

// EXPLOIT: commit a decoy (non-empty diff clears the empty-diff guard), leave out.txt UNCOMMITTED.
const EXPLOIT_AGENT = `
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
writeFileSync('marker.txt', 'decoy\\n');
execFileSync('git', ['add', 'marker.txt']);
execFileSync('git', ['-c','user.name=A','-c','user.email=a@t','commit','-m','decoy']);
writeFileSync('out.txt', 'work\\n'); // the tested file — never committed
writeFileSync(process.env.OAHS_SPEC_FILE, ['---','status: in_review','---','','## Auto Run Result','Status: in_review',''].join('\\n'));
`;

// CONTROL: commit out.txt cleanly.
const CONTROL_AGENT = `
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
writeFileSync('out.txt', 'work\\n');
execFileSync('git', ['add', '-A']);
execFileSync('git', ['-c','user.name=A','-c','user.email=a@t','commit','-m','work']);
writeFileSync(process.env.OAHS_SPEC_FILE, ['---','status: in_review','---','','## Auto Run Result','Status: in_review',''].join('\\n'));
`;

// SCRATCH: commit out.txt, then leave untracked build/test byproducts NOT in .gitignore.
const SCRATCH_AGENT = `
import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
writeFileSync('out.txt', 'work\\n');
execFileSync('git', ['add', '-A']);
execFileSync('git', ['-c','user.name=A','-c','user.email=a@t','commit','-m','work']);
writeFileSync('.DS_Store', 'junk\\n');
mkdirSync('.pytest_cache', { recursive: true });
writeFileSync('.pytest_cache/CACHEDIR.TAG', 'x\\n');
writeFileSync(process.env.OAHS_SPEC_FILE, ['---','status: in_review','---','','## Auto Run Result','Status: in_review',''].join('\\n'));
`;

// SKIP-WORKTREE: commit payload.txt=BENIGN, then rewrite it to EXPLOIT and hide the change with
// skip-worktree so it stays uncommitted-but-invisible-to-status. Normalization must clear the bit
// so reset reverts it and verification measures the committed BENIGN.
const SKIP_WORKTREE_AGENT = `
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
writeFileSync('payload.txt', 'BENIGN\\n');
execFileSync('git', ['add', 'payload.txt']);
execFileSync('git', ['-c','user.name=A','-c','user.email=a@t','commit','-m','payload']);
writeFileSync('payload.txt', 'EXPLOIT\\n');
execFileSync('git', ['update-index', '--skip-worktree', 'payload.txt']);
writeFileSync(process.env.OAHS_SPEC_FILE, ['---','status: in_review','---','','## Auto Run Result','Status: in_review',''].join('\\n'));
`;
const SKIP_WORKTREE_PIN =
  'node -e "process.exit(require(\'fs\').readFileSync(\'payload.txt\',\'utf8\').includes(\'EXPLOIT\')?0:1)"';

// NORMALIZE-FAIL: commit a decoy, leave out.txt uncommitted, then poison the index lock so the
// reset/status normalization fails. It must return 'failed' → BLOCK, never verify the dirty tree.
const NORMALIZE_FAIL_AGENT = `
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
writeFileSync('marker.txt', 'decoy\\n');
execFileSync('git', ['add', 'marker.txt']);
execFileSync('git', ['-c','user.name=A','-c','user.email=a@t','commit','-m','decoy']);
writeFileSync('out.txt', 'work\\n');
const lock = execFileSync('git', ['rev-parse', '--git-path', 'index.lock'], { encoding: 'utf8' }).trim();
writeFileSync(lock, '');
writeFileSync(process.env.OAHS_SPEC_FILE, ['---','status: in_review','---','','## Auto Run Result','Status: in_review',''].join('\\n'));
`;

// CRASH-ADOPT: same partial-commit exploit; the runner crashes at before_report, leaving a DIRTY
// worktree that the local re-adopt path reuses. Normalization must run on that path too.
const CRASH_ADOPT_AGENT = EXPLOIT_AGENT;

// NESTED-REPO: commit a decoy, then leave the tested file uncommitted INSIDE a `git init`'d subdir.
// `git clean -fd` (single -f) refuses to delete an untracked dir that is itself a git repo; only
// `-ffd` does. Without the double -f, nested/out.txt survives normalization and the pin (which reads
// it) passes on a revision the commit lacks.
const NESTED_REPO_AGENT = `
import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
writeFileSync('marker.txt', 'decoy\\n');
execFileSync('git', ['add', 'marker.txt']);
execFileSync('git', ['-c','user.name=A','-c','user.email=a@t','commit','-m','decoy']);
mkdirSync('nested', { recursive: true });
execFileSync('git', ['init', '-q', 'nested']);        // an untracked dir that IS a git repo
writeFileSync('nested/out.txt', 'work\\n');            // the tested file — inside it, uncommitted
writeFileSync(process.env.OAHS_SPEC_FILE, ['---','status: in_review','---','','## Auto Run Result','Status: in_review',''].join('\\n'));
`;
const NESTED_REPO_PIN =
  'node -e "process.exit(require(\'fs\').existsSync(\'nested/out.txt\')?0:1)"';

type App = Awaited<ReturnType<typeof buildServer>>;
type RunResult = Awaited<ReturnType<typeof runOnce>>;

let app: App;
let po: OahsClient;
let dev: OahsClient;
let tmpRoot: string;
let repoDir: string;
const specOf = new Map<string, string>();

beforeAll(async () => {
  app = await buildServer({ engine: createMemoryEngine(), tokenStore: new TokenStore(), adminToken: ADMIN_TOKEN });
  await app.listen({ port: 0, host: '127.0.0.1' });
  const { port } = app.server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${port}`;
  const admin = makeClient({ baseUrl, token: ADMIN_TOKEN });

  const cpo = await admin.call<{ actor: Actor; token: string }>('create_actor', { type: 'user', displayName: 'PO' });
  const cdev = await admin.call<{ actor: Actor; token: string }>('create_actor', { type: 'agent', displayName: 'Dev' });
  for (const grant of [
    { actorId: cpo.actor.id, permission: 'task.plan' },
    { actorId: cpo.actor.id, permission: 'task.advance' },
    { actorId: cpo.actor.id, permission: 'gate.spec.approve' },
    { actorId: cpo.actor.id, permission: 'gate.review.approve' },
    { actorId: cpo.actor.id, permission: 'feature.init' },
    { actorId: cpo.actor.id, permission: 'ops.force_release_claim' },
    { actorId: cdev.actor.id, permission: 'task.claim' },
    { actorId: cdev.actor.id, permission: 'task.advance' },
    { actorId: cdev.actor.id, permission: 'task.block' },
  ]) {
    await admin.call('grant_permission', grant);
  }
  po = makeClient({ baseUrl, token: cpo.token });
  dev = makeClient({ baseUrl, token: cdev.token });

  const feature = await po.call<Feature>('create_feature');
  await po.call('import_stories', { featureId: feature.id, yaml: STORIES_YAML });

  tmpRoot = mkdtempSync(join(tmpdir(), 'oahs-runner-verify-'));
  repoDir = join(tmpRoot, 'repo');
  mkdirSync(join(repoDir, SPEC_FOLDER), { recursive: true });
  git(['init', '-b', 'main'], repoDir);
  writeFileSync(join(repoDir, SPEC_FOLDER, 'stories.yaml'), STORIES_YAML, 'utf8');
  for (const id of ['exploit', 'control', 'scratch', 'skipworktree', 'stashfail', 'crashadopt', 'nestedrepo']) {
    const item = await po.call<WorkItem>('get_work_item', { workItemId: id });
    specOf.set(id, item.specPath);
    mkdirSync(dirname(join(repoDir, SPEC_FOLDER, item.specPath)), { recursive: true });
    writeFileSync(join(repoDir, SPEC_FOLDER, item.specPath), '# spec\n', 'utf8');
  }
  git(['add', '-A'], repoDir);
  git(['-c', 'user.name=S', '-c', 'user.email=s@t', 'commit', '-m', 'baseline'], repoDir);
  const originDir = join(tmpRoot, 'origin.git');
  git(['clone', '--bare', repoDir, originDir], tmpRoot);
  git(['remote', 'add', 'origin', originDir], repoDir);
});

afterAll(async () => {
  await app.close();
  rmSync(tmpRoot, { recursive: true, force: true });
});

/** Approve story `id`'s spec gate, write its agent, and run it once. */
async function dispatch(
  id: string,
  agentSource: string,
  opts: { pin?: string; failpoint?: RunnerOptions['failpoint'] } = {},
): Promise<RunResult> {
  await po.call('advance_state', { workItemId: id, to: 'draft' });
  await po.call('approve_gate', {
    workItemId: id,
    gate: 'spec_approval',
    pinnedVerification: [opts.pin ?? PIN],
  });
  const script = join(tmpRoot, `${id}-agent.mjs`);
  writeFileSync(script, agentSource, 'utf8');
  return runOnce({
    client: dev,
    repoPath: repoDir,
    specFolder: SPEC_FOLDER,
    agentCmd: `node ${script}`,
    agentTimeoutMs: 30_000,
    ...(opts.failpoint !== undefined ? { failpoint: opts.failpoint } : {}),
    log: () => {},
  } as RunnerOptions);
}

/** Run the (already-approved) story again — for the adopt path after a crash + force-release. */
function reRun(): Promise<RunResult> {
  return runOnce({
    client: dev,
    repoPath: repoDir,
    specFolder: SPEC_FOLDER,
    agentCmd: 'node -e "process.exit(0)"', // never re-invoked on the adopt path
    agentTimeoutMs: 30_000,
    log: () => {},
  } as RunnerOptions);
}

function latestTestRun(result: RunResult): { exitCode?: number } | undefined {
  const runs = (result.evidence ?? []).filter((e) => e.kind === 'test_run');
  return runs[runs.length - 1]?.payload as { exitCode?: number } | undefined;
}

describe('pinned verification measures the committed revision', () => {
  it('EXPLOIT: an uncommitted tested file makes verification FAIL, so the done gate refuses', async () => {
    const result = await dispatch('exploit', EXPLOIT_AGENT);
    // The test ran against HEAD (out.txt stashed away) and failed — the whole fix.
    expect(latestTestRun(result)?.exitCode).not.toBe(0);
    // The runner still advances (it measures; the core judges) but the done gate cannot certify.
    await po.call('advance_state', { workItemId: 'exploit', to: 'in_review' }).catch(() => {});
    await expect(
      po.call('approve_gate', { workItemId: 'exploit', gate: 'review_approval' }),
    ).rejects.toThrow(/pinned verification did not pass/);
  });

  it('CONTROL: a committed tested file passes and certifies to done', async () => {
    const result = await dispatch('control', CONTROL_AGENT);
    expect(result.outcome).toBe('in_review');
    expect(latestTestRun(result)?.exitCode).toBe(0);
    const done = await po.call<WorkItem>('approve_gate', { workItemId: 'control', gate: 'review_approval' });
    expect(done.state).toBe('done');
  });

  it('SCRATCH: untracked build/test byproducts do NOT cause a spurious block', async () => {
    // The exact false-positive that sank the previous fix: .DS_Store and .pytest_cache left in
    // the worktree. Verification must still pass (they are stashed away; HEAD has the code).
    const result = await dispatch('scratch', SCRATCH_AGENT);
    expect(result.outcome).toBe('in_review');
    expect(latestTestRun(result)?.exitCode).toBe(0);
    const done = await po.call<WorkItem>('approve_gate', { workItemId: 'scratch', gate: 'review_approval' });
    expect(done.state).toBe('done');
  });

  it('SKIP-WORKTREE: a hidden tracked modification is swept, so verification measures HEAD', async () => {
    // The agent rewrites a tracked file and hides it with `git update-index --skip-worktree`.
    // Normalization must clear the bit (two separate update-index calls — a combined
    // --no-skip-worktree --no-assume-unchanged is inert) so the stash reverts it to committed.
    const result = await dispatch('skipworktree', SKIP_WORKTREE_AGENT, { pin: SKIP_WORKTREE_PIN });
    expect(latestTestRun(result)?.exitCode).not.toBe(0); // measured committed BENIGN, not hidden EXPLOIT
    await expect(
      po.call('approve_gate', { workItemId: 'skipworktree', gate: 'review_approval' }),
    ).rejects.toThrow(/pinned verification did not pass/);
  });

  it('NORMALIZE-FAIL: a poisoned index lock blocks the run rather than verifying the dirty tree', async () => {
    // An agent can force `git stash` to fail (a stray index.lock). Verifying the dirty tree then
    // would re-open the exploit, so normalization failure must BLOCK, not fall through.
    const result = await dispatch('stashfail', NORMALIZE_FAIL_AGENT);
    expect(result.outcome).toBe('blocked');
    const item = await po.call<WorkItem>('get_work_item', { workItemId: 'stashfail' });
    expect(item.blockedReason).toBe('dirty_tree');
    // No passing test_run was recorded — nothing certifies.
    expect(latestTestRun(result)?.exitCode ?? undefined).not.toBe(0);
  });

  it('CRASH-ADOPT: the local re-adopt of a dirty leftover worktree also normalizes', async () => {
    // Crash after the agent (before_report) leaves the exploit's DIRTY worktree on disk; the local
    // adopt path reuses it. Normalization must run there too — else the uncommitted file survives
    // and the test passes on a revision the commit lacks.
    const crashed = await dispatch('crashadopt', CRASH_ADOPT_AGENT, { failpoint: 'before_report' });
    expect(crashed.outcome).toBe('crashed');
    await po.call('force_release_claim', { workItemId: 'crashadopt' });

    const adopted = await reRun(); // adopts the leftover worktree WITHOUT re-invoking the agent
    expect(adopted.details ?? '').toMatch(/adopt/i);
    // The tested file was uncommitted; normalization on the adopt path swept it, so the pinned
    // verification measured HEAD (the decoy, lacking out.txt) and the done gate cannot certify.
    await expect(
      po.call('approve_gate', { workItemId: 'crashadopt', gate: 'review_approval' }),
    ).rejects.toThrow(/pinned verification did not pass/);
  });

  it('NESTED-REPO: uncommitted code inside a git-init dir is removed, so verification measures HEAD', async () => {
    // `git clean -fd` (single -f) will not delete an untracked dir that is itself a git repo; only
    // `-ffd` does. Without the double -f the nested tested file survives and the pin passes on a
    // revision the commit lacks.
    const result = await dispatch('nestedrepo', NESTED_REPO_AGENT, { pin: NESTED_REPO_PIN });
    expect(latestTestRun(result)?.exitCode).not.toBe(0); // nested/out.txt was cleaned, so the pin fails
    await expect(
      po.call('approve_gate', { workItemId: 'nestedrepo', gate: 'review_approval' }),
    ).rejects.toThrow(/pinned verification did not pass/);
  });
});
