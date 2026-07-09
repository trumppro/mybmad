/**
 * E2E: the full BYO worker loop against an IN-PROCESS spine-api (memory
 * engine, real HTTP on port 0) and a REAL git repo + bare origin in tmp dirs.
 * The "coding agent" is a fake node script that commits work and writes the
 * dev-auto HALT shape (frontmatter status + '## Auto Run Result').
 *
 *  1. happy path      ready_for_dev → in_review with full evidence → done
 *  2. allowlist       non-allowlisted pinned command is refused, gate denies
 *  3. crash + adopt   failpoint before_report, force release, adoption
 *  4. blocked HALT    status blocked → blockedReason unclear_intent
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import { createMemoryEngine } from '@oahs/core';
import type { Actor, Claim, Evidence, Feature, WorkItem } from '@oahs/core';
import { makeClient, type OahsClient } from '@oahs/contracts';
import { TokenStore, buildServer } from '@oahs/spine-api';

import { git, runOnce, workLoop, type RunnerOptions } from '../src/index.js';

const ADMIN_TOKEN = 'runner-e2e-admin-token';
const SPEC_FOLDER = 'delivery/test-feat';

const STORIES_YAML = `
- id: "1"
  title: First story
  description: happy path through the worker loop
  spec_checkpoint: true
- id: "2"
  title: Second story
  description: allowlist refusal of a pinned command
- id: "3"
  title: Third story
  description: crash before report then adoption
- id: "4"
  title: Fourth story
  description: agent halts blocked with unclear intent
`;

const FAKE_AGENT = `
import { execFileSync } from 'node:child_process';
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';

const specFile = process.env.OAHS_SPEC_FILE;
const storyId = process.env.OAHS_STORY_ID ?? process.argv[2] ?? 'unknown';
if (process.env.OAHS_TEST_COUNTER) {
  appendFileSync(process.env.OAHS_TEST_COUNTER, 'invoke ' + storyId + '\\n');
}
mkdirSync('src', { recursive: true });
writeFileSync('src/hello.txt', 'hello from story ' + storyId + '\\n');
execFileSync('git', ['add', '-A']);
execFileSync('git', [
  '-c', 'user.name=Fake Agent', '-c', 'user.email=fake@test.local',
  'commit', '-m', 'story work',
]);
const mode = process.env.OAHS_AGENT_MODE ?? 'done';
if (mode === 'blocked') {
  writeFileSync(specFile, [
    '---',
    'status: blocked',
    'blocking_condition: unclear intent - the spec contradicts itself',
    '---',
    '',
    '## Auto Run Result',
    'Status: blocked',
    'Blocking condition: unclear intent - the spec contradicts itself',
    '',
  ].join('\\n'));
} else {
  writeFileSync(specFile, [
    '---',
    'status: done',
    '---',
    '',
    '## Auto Run Result',
    'Status: done',
    'All acceptance criteria satisfied.',
    '',
  ].join('\\n'));
}
`;

type App = Awaited<ReturnType<typeof buildServer>>;

let app: App;
let baseUrl: string;
let admin: OahsClient;
let po: OahsClient;
let dev: OahsClient;
let reviewer: OahsClient;
let feature: Feature;

let tmpRoot: string;
let repoDir: string;
let originDir: string;
let agentScript: string;
let countersDir: string;

const specPaths = new Map<string, string>(); // externalKey -> repo-relative spec path

function commitAll(message: string): void {
  git(['add', '-A'], repoDir);
  git(
    ['-c', 'user.name=Test Setup', '-c', 'user.email=setup@test.local', 'commit', '-m', message],
    repoDir,
  );
}

function runnerOptions(overrides?: Partial<RunnerOptions>): RunnerOptions {
  return {
    client: dev,
    repoPath: repoDir,
    specFolder: SPEC_FOLDER,
    agentCmd: `node ${agentScript} {STORY_ID}`,
    agentTimeoutMs: 30_000,
    ...overrides,
  };
}

function evidenceOfKind(result: { evidence?: Evidence[] }, kind: Evidence['kind']): Evidence[] {
  return (result.evidence ?? []).filter((e) => e.kind === kind);
}

beforeAll(async () => {
  // -- in-process spine-api (memory engine) ---------------------------------
  app = await buildServer({
    engine: createMemoryEngine(),
    tokenStore: new TokenStore(),
    adminToken: ADMIN_TOKEN,
  });
  await app.listen({ port: 0, host: '127.0.0.1' });
  const { port } = app.server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${port}`;
  admin = makeClient({ baseUrl, token: ADMIN_TOKEN });

  // -- actors + grants -------------------------------------------------------
  const createdPo = await admin.call<{ actor: Actor; token: string }>('create_actor', {
    type: 'user',
    displayName: 'Product Owner',
  });
  const createdDev = await admin.call<{ actor: Actor; token: string }>('create_actor', {
    type: 'agent',
    displayName: 'Dev Agent Runner',
  });
  const createdReviewer = await admin.call<{ actor: Actor; token: string }>('create_actor', {
    type: 'user',
    displayName: 'Reviewer',
  });
  for (const grant of [
    { actorId: createdPo.actor.id, permission: 'task.plan' },
    { actorId: createdPo.actor.id, permission: 'task.claim' },
    { actorId: createdPo.actor.id, permission: 'task.advance' },
    { actorId: createdPo.actor.id, permission: 'gate.spec.approve' },
    { actorId: createdPo.actor.id, permission: 'feature.init' },
    { actorId: createdPo.actor.id, permission: 'dispatch.release_hold' },
    { actorId: createdDev.actor.id, permission: 'task.claim' },
    { actorId: createdDev.actor.id, permission: 'task.advance' },
    { actorId: createdDev.actor.id, permission: 'task.block' },
    { actorId: createdReviewer.actor.id, permission: 'gate.review.approve' },
  ]) {
    await admin.call('grant_permission', grant);
  }
  po = makeClient({ baseUrl, token: createdPo.token });
  dev = makeClient({ baseUrl, token: createdDev.token });
  reviewer = makeClient({ baseUrl, token: createdReviewer.token });

  // -- fake project repo ------------------------------------------------------
  tmpRoot = mkdtempSync(join(tmpdir(), 'oahs-runner-e2e-'));
  repoDir = join(tmpRoot, 'repo');
  originDir = join(tmpRoot, 'origin.git');
  countersDir = join(tmpRoot, 'counters');
  mkdirSync(repoDir, { recursive: true });
  mkdirSync(countersDir, { recursive: true });
  agentScript = join(tmpRoot, 'fake-agent.mjs');
  writeFileSync(agentScript, FAKE_AGENT, 'utf8');

  git(['init', '-b', 'main'], repoDir);
  writeFileSync(join(repoDir, 'README.md'), '# fixture project\n', 'utf8');
  writeFileSync(join(repoDir, '.oahs-verify.mjs'), 'process.exit(0);\n', 'utf8');
  mkdirSync(join(repoDir, SPEC_FOLDER, 'stories'), { recursive: true });
  writeFileSync(join(repoDir, SPEC_FOLDER, 'stories.yaml'), STORIES_YAML, 'utf8');
  commitAll('baseline: README + verify script + stories.yaml');

  // -- feature + stories through the rails ------------------------------------
  feature = await po.call<Feature>('create_feature');
  const imported = await po.call<{ imported: string[] }>('import_stories', {
    featureId: feature.id,
    yaml: STORIES_YAML,
  });
  expect(imported.imported).toEqual(['1', '2', '3', '4']);

  // Spec files exactly where the engine's specPath points them.
  for (const key of ['1', '2', '3', '4']) {
    const wi = await po.call<WorkItem>('get_work_item', { workItemId: key });
    const rel = `${SPEC_FOLDER}/${wi.specPath}`;
    specPaths.set(key, rel);
    writeFileSync(join(repoDir, rel), `---\nstatus: backlog\n---\n\n# Story ${key}\n`, 'utf8');
  }
  commitAll('add story spec files');

  // -- bare origin -------------------------------------------------------------
  git(['clone', '--bare', repoDir, originDir], tmpRoot);
  git(['remote', 'add', 'origin', originDir], repoDir);
});

afterAll(async () => {
  await app.close();
  rmSync(tmpRoot, { recursive: true, force: true });
});

describe('runner e2e — BYO worker loop against real git + in-process spine-api', () => {
  it('test 1 — happy path: ready_for_dev → runOnce → in_review with full evidence → done', async () => {
    await po.call('advance_state', { workItemId: '1', to: 'draft' });
    const pinned = await po.call<WorkItem>('approve_gate', {
      workItemId: '1',
      gate: 'spec_approval',
      pinnedVerification: ['node .oahs-verify.mjs'],
    });
    expect(pinned.state).toBe('ready_for_dev');

    const counter = join(countersDir, 'story1.log');
    const result = await runOnce(
      runnerOptions({ agentEnv: { OAHS_TEST_COUNTER: counter, OAHS_AGENT_MODE: 'done' } }),
    );
    expect(result.dispatched).toBe(true);
    expect(result.outcome).toBe('in_review');
    expect(result.externalKey).toBe('1');
    expect(result.claimId).toBeTruthy();

    const item = await po.call<WorkItem>('get_work_item', { workItemId: '1' });
    expect(item.state).toBe('in_review');
    expect(item.blockedReason).toBeNull();

    // Evidence: halt_report verbatim, pinned test_run exit 0, non-empty diff,
    // commit reachable on the remote.
    const [halt] = evidenceOfKind(result, 'halt_report');
    expect(halt?.payload).toMatchObject({ status: 'done', agentExitCode: 0 });
    expect(String(halt?.payload['autoRunResult'])).toContain('## Auto Run Result');
    expect(String(halt?.payload['autoRunResult'])).toContain('Status: done');

    const [testRun] = evidenceOfKind(result, 'test_run');
    expect(testRun?.payload).toMatchObject({ command: 'node .oahs-verify.mjs', exitCode: 0 });

    const branch = `claim/${result.claimId}`;
    const [diff] = evidenceOfKind(result, 'git_diff');
    expect(diff?.payload).toMatchObject({ nonEmpty: true, branch });
    expect(Number(diff?.payload['filesChanged'])).toBeGreaterThanOrEqual(1);

    const [commit] = evidenceOfKind(result, 'commit');
    expect(commit?.payload).toMatchObject({ branch, reachableOnRemote: true });

    // The claim branch really exists on the bare origin, at the evidence sha.
    const lsRemote = git(['ls-remote', 'origin', `refs/heads/${branch}`], repoDir);
    expect(lsRemote).toContain(String(commit?.payload['sha']));

    // Mirror-on-dispatch is visible in the committed history of the branch:
    // the entry state was stamped into the frontmatter before the agent ran.
    const committedSpec = git(['show', `${branch}:${specPaths.get('1')!}`], repoDir);
    expect(committedSpec).toContain('status: ready-for-dev');

    // Agent invoked exactly once; the run released its claim and worktree.
    expect(readFileSync(counter, 'utf8').trim().split('\n')).toEqual(['invoke 1']);
    const claims = await po.call<Claim[]>('get_claims', { workItemId: '1' });
    expect(claims.every((c) => c.released)).toBe(true);
    expect(existsSync(join(repoDir, '.oahs', 'worktrees', result.claimId!))).toBe(false);

    // Reviewer approves against the pinned evidence → done.
    const done = await reviewer.call<WorkItem>('approve_gate', {
      workItemId: '1',
      gate: 'review_approval',
    });
    expect(done.state).toBe('done');
  });

  it('test 2 — allowlist: a non-allowlisted pinned command is refused, and the done gate denies', async () => {
    await po.call('advance_state', { workItemId: '2', to: 'draft' });
    await po.call('approve_gate', {
      workItemId: '2',
      gate: 'spec_approval',
      pinnedVerification: ['curl http://evil'],
    });

    const result = await runOnce(
      runnerOptions({
        agentEnv: { OAHS_TEST_COUNTER: join(countersDir, 'story2.log'), OAHS_AGENT_MODE: 'done' },
      }),
    );
    expect(result.outcome).toBe('in_review');
    expect(result.externalKey).toBe('2');

    // The command never ran: refused with exitCode -1.
    const [testRun] = evidenceOfKind(result, 'test_run');
    expect(testRun?.payload).toEqual({ command: 'curl http://evil', exitCode: -1, refused: true });

    // Pinned verification did not pass → review approval is a failed guard.
    await expect(
      reviewer.call('approve_gate', { workItemId: '2', gate: 'review_approval' }),
    ).rejects.toMatchObject({
      name: 'GuardFailedError',
      status: 422,
      message: expect.stringContaining('pinned verification did not pass: curl http://evil'),
    });
  });

  it('test 3 — crash before report, force release, then adoption without re-invoking the agent', async () => {
    await po.call('advance_state', { workItemId: '3', to: 'draft' });
    await po.call('approve_gate', {
      workItemId: '3',
      gate: 'spec_approval',
      pinnedVerification: ['node .oahs-verify.mjs'],
    });

    const counter = join(countersDir, 'story3.log');
    const crashed = await runOnce(
      runnerOptions({
        failpoint: 'before_report',
        agentEnv: { OAHS_TEST_COUNTER: counter, OAHS_AGENT_MODE: 'done' },
      }),
    );
    expect(crashed.outcome).toBe('crashed');
    expect(crashed.evidence).toEqual([]); // died before any report

    // The claim is still live and the item sits in_progress with no report.
    const claimsAfterCrash = await po.call<Claim[]>('get_claims', { workItemId: '3' });
    expect(claimsAfterCrash.filter((c) => !c.released)).toHaveLength(1);
    expect((await po.call<WorkItem>('get_work_item', { workItemId: '3' })).state).toBe(
      'in_progress',
    );
    expect(existsSync(join(repoDir, '.oahs', 'worktrees', crashed.claimId!))).toBe(true);

    // Ops frees the dead runner's claim; the next cycle adopts the worktree.
    await admin.call('force_release_claim', { workItemId: '3' });
    const adopted = await runOnce(
      runnerOptions({ agentEnv: { OAHS_TEST_COUNTER: counter, OAHS_AGENT_MODE: 'done' } }),
    );
    expect(adopted.outcome).toBe('adopted_in_review');
    expect(adopted.externalKey).toBe('3');
    expect(adopted.claimId).not.toBe(crashed.claimId);

    // The agent ran EXACTLY once across both cycles.
    expect(readFileSync(counter, 'utf8').trim().split('\n')).toEqual(['invoke 3']);

    // Full late evidence, and the item is reviewable → done.
    const item = await po.call<WorkItem>('get_work_item', { workItemId: '3' });
    expect(item.state).toBe('in_review');
    const [halt] = evidenceOfKind(adopted, 'halt_report');
    expect(halt?.payload).toMatchObject({ status: 'done', agentExitCode: null });
    const [testRun] = evidenceOfKind(adopted, 'test_run');
    expect(testRun?.payload).toMatchObject({ command: 'node .oahs-verify.mjs', exitCode: 0 });
    const [diff] = evidenceOfKind(adopted, 'git_diff');
    expect(diff?.payload).toMatchObject({ nonEmpty: true, branch: `claim/${adopted.claimId}` });
    const [commit] = evidenceOfKind(adopted, 'commit');
    expect(commit?.payload).toMatchObject({ reachableOnRemote: true });
    const lsRemote = git(['ls-remote', 'origin', `refs/heads/claim/${adopted.claimId}`], repoDir);
    expect(lsRemote).toContain(String(commit?.payload['sha']));

    const done = await reviewer.call<WorkItem>('approve_gate', {
      workItemId: '3',
      gate: 'review_approval',
    });
    expect(done.state).toBe('done');
  });

  it('test 4 — blocked HALT: status blocked routes to block_task(unclear_intent) and releases the claim', async () => {
    await po.call('advance_state', { workItemId: '4', to: 'draft' });
    await po.call('advance_state', { workItemId: '4', to: 'ready_for_dev' }); // no checkpoint

    const result = await runOnce(
      runnerOptions({
        agentEnv: {
          OAHS_TEST_COUNTER: join(countersDir, 'story4.log'),
          OAHS_AGENT_MODE: 'blocked',
        },
      }),
    );
    expect(result.outcome).toBe('blocked');
    expect(result.externalKey).toBe('4');

    const [halt] = evidenceOfKind(result, 'halt_report');
    expect(halt?.payload).toMatchObject({ status: 'blocked' });
    expect(String(halt?.payload['blockingCondition'])).toContain('unclear intent');

    const item = await po.call<WorkItem>('get_work_item', { workItemId: '4' });
    expect(item.blockedReason).toBe('unclear_intent');
    expect(item.state).toBe('in_progress'); // blocked is an overlay, not a state

    const claims = await po.call<Claim[]>('get_claims', { workItemId: '4' });
    expect(claims.every((c) => c.released)).toBe(true);
  });

  it('workLoop(once) with nothing dispatchable returns after a single cycle', async () => {
    // ready_for_dev is empty; the only in_progress item ("4") wears a blocked
    // overlay and is filtered out — the loop must resolve immediately.
    await workLoop({ ...runnerOptions(), once: true });
    const ready = await dev.call<WorkItem[]>('list_work_items', {
      state: 'ready_for_dev',
      claimable: true,
    });
    expect(ready).toEqual([]);
  });
});
