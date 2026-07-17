/**
 * §10.4 — durability push + SPINE-DRIVEN cross-machine adoption.
 *
 * Two checkouts, one bare origin: two machines sharing nothing but the remote.
 *
 * The property: an agent run must outlive the machine that produced it. The
 * runner publishes the claim branch the moment §8 says it may (right after the
 * agent, before the long verification phase), so a machine lost afterwards leaves
 * work a second machine can finish instead of paying for the agent twice.
 *
 * What makes it SAFE is where the trust comes from. A claim branch's commits —
 * and their messages — are written by the agent, which §8/§10.3 model as the
 * adversary, so nothing in repo content may decide which branch belongs to which
 * item, where its baseline is, or whether it is spent. Those answers come from
 * the spine (its claim history and its `commit` evidence) and from git's own
 * structure (`merge-base`). The two tests here pin both halves: adoption works,
 * and it never fires for work the spine has already judged.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import { createMemoryEngine, type Actor, type Feature, type WorkItem } from '@oahs/core';
import { makeClient, type OahsClient } from '@oahs/contracts';
import { TokenStore, buildServer } from '@oahs/spine-api';

import { git, runOnce, type RunnerOptions } from '../src/index.js';

const ADMIN = 'cross-machine-admin';
const SPEC_FOLDER = 'delivery/cm';
const STORIES = `
- id: "cm-1"
  title: Crash after publishing
  description: machine A publishes then dies; machine B adopts
- id: "cm-2"
  title: Rework after rejection
  description: a rejected branch must never be re-adopted
- id: "cm-3"
  title: Rework after an ADOPTED run
  description: the adopted source branch must be spent too
`;

/**
 * Commits its work AND its HALT report — the report is part of the deliverable,
 * and it is the only way a machine holding nothing but the branch can tell
 * finished work from a half-write. Records each invocation so a test can prove
 * the agent was (or was not) run again.
 */
const FAKE_AGENT = `
import { execFileSync } from 'node:child_process';
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
appendFileSync(process.env.OAHS_INVOCATIONS, process.env.OAHS_STORY_ID + '\\n');
mkdirSync('src', { recursive: true });
writeFileSync('src/out.txt', 'work ' + Date.now() + '\\n');
writeFileSync(process.env.OAHS_SPEC_FILE, ['---','status: done','---','','## Auto Run Result','Status: done',''].join('\\n'));
execFileSync('git', ['add', '-A']);
execFileSync('git', ['-c','user.name=A','-c','user.email=a@t','commit','-m','work']);
`;

let app: Awaited<ReturnType<typeof buildServer>>;
let po: OahsClient;
let tmpRoot: string;
let originPath: string;
let agentScript: string;
let invocations: string;
const featureOf = new Map<string, string>();

function invocationCount(storyId: string): number {
  if (!existsSync(invocations)) return 0;
  return readFileSync(invocations, 'utf8').split('\n').filter((l) => l.trim() === storyId).length;
}

/** A checkout of the shared origin — one "machine". */
function makeMachine(name: string): string {
  const dir = join(tmpRoot, name);
  git(['clone', originPath, dir], tmpRoot);
  return dir;
}

/**
 * Scoped to ONE feature. The runner polls the whole backlog and prefers
 * ready_for_dev, so an unscoped runOnce would happily claim the OTHER test's
 * story instead of the one under test — these cases turn on which item a machine
 * picks up, so each gets a backlog of its own.
 */
function options(repoPath: string, featureId: string): RunnerOptions {
  return {
    client: po,
    repoPath,
    specFolder: SPEC_FOLDER,
    agentCmd: `node ${agentScript}`,
    agentEnv: { OAHS_INVOCATIONS: invocations },
    agentTimeoutMs: 30_000,
    featureId,
    log: () => {},
  };
}

async function itemId(externalKey: string): Promise<string> {
  return (await po.call<WorkItem>('get_work_item', { workItemId: externalKey })).id;
}

beforeAll(async () => {
  app = await buildServer({ engine: createMemoryEngine({ wallClock: true }), tokenStore: new TokenStore(), adminToken: ADMIN });
  await app.listen({ port: 0, host: '127.0.0.1' });
  const baseUrl = `http://127.0.0.1:${(app.server.address() as AddressInfo).port}`;
  const admin = makeClient({ baseUrl, token: ADMIN });
  const actor = await admin.call<{ actor: Actor; token: string }>('create_actor', { type: 'agent', displayName: 'Runner' });
  for (const p of [
    'task.plan', 'task.claim', 'task.advance', 'task.block', 'gate.spec.approve',
    'gate.review.approve', 'gate.review.reject', 'ops.force_release_claim',
  ]) {
    await admin.call('grant_permission', { actorId: actor.actor.id, permission: p });
  }
  po = makeClient({ baseUrl, token: actor.token });

  tmpRoot = mkdtempSync(join(tmpdir(), 'oahs-cross-'));
  agentScript = join(tmpRoot, 'agent.mjs');
  invocations = join(tmpRoot, 'invocations.log');
  writeFileSync(agentScript, FAKE_AGENT, 'utf8');

  const seed = join(tmpRoot, 'seed');
  mkdirSync(join(seed, SPEC_FOLDER, 'stories'), { recursive: true });
  git(['init', '-b', 'main'], seed);
  writeFileSync(join(seed, '.oahs-verify.mjs'), 'process.exit(0);\n', 'utf8');
  writeFileSync(join(seed, SPEC_FOLDER, 'stories.yaml'), STORIES, 'utf8');

  // One feature per story: each test needs a backlog only its own machines poll.
  for (const key of ['cm-1', 'cm-2', 'cm-3']) {
    const feature = await po.call<Feature>('create_feature', {});
    featureOf.set(key, feature.id);
    await po.call('import_stories', {
      featureId: feature.id,
      yaml: STORIES.split('\n- id:')
        .filter((chunk) => chunk.includes(`"${key}"`))
        .map((chunk) => `- id:${chunk}`)
        .join(''),
    });
    await po.call('advance_state', { workItemId: key, to: 'draft' });
    await po.call('approve_gate', { workItemId: key, gate: 'spec_approval', pinnedVerification: ['node .oahs-verify.mjs'] });
    const wi = await po.call<WorkItem>('get_work_item', { workItemId: key });
    writeFileSync(join(seed, SPEC_FOLDER, wi.specPath), `---\nstatus: backlog\n---\n\n# ${key}\n`, 'utf8');
  }
  git(['add', '-A'], seed);
  git(['-c', 'user.name=S', '-c', 'user.email=s@t', 'commit', '-m', 'baseline'], seed);
  originPath = join(tmpRoot, 'origin.git');
  git(['clone', '--bare', seed, originPath], tmpRoot);
});

afterAll(async () => {
  await app.close();
  rmSync(tmpRoot, { recursive: true, force: true });
});

describe('§10.4 cross-machine adoption (spine-driven)', () => {
  it('machine B finishes the run machine A published before dying — without re-invoking the agent', async () => {
    const machineA = makeMachine('a-1');
    const machineB = makeMachine('b-1');
    const id = await itemId('cm-1');

    // Machine A: agent runs, §8 passes, the claim branch is PUBLISHED — then the
    // machine dies during the long verification phase that follows.
    await expect(
      runOnce({ ...options(machineA, featureOf.get('cm-1')!), failpoint: 'after_durability_push' }),
    ).rejects.toThrow(/after_durability_push/);
    expect(invocationCount('cm-1')).toBe(1);

    // The agent's work outlived the run: it is on the remote, with no `commit`
    // evidence yet (A never got that far).
    const claims = await po.call<Array<{ id: string; workItemId: string }>>('list_claims', { includeReleased: true });
    const aClaim = claims.find((c) => c.workItemId === id)!;
    expect(git(['ls-remote', originPath, `refs/heads/claim/${aClaim.id}`], tmpRoot)).not.toBe('');

    // Machine A is gone — B shares nothing with it but the remote.
    rmSync(machineA, { recursive: true, force: true });
    await po.call('force_release_claim', { workItemId: id });

    const adopted = await runOnce(options(machineB, featureOf.get('cm-1')!));

    expect(adopted.outcome).toBe('adopted_in_review');
    expect(adopted.details).toContain('adopted remote claim branch');
    // The whole point: the agent was NOT paid for twice.
    expect(invocationCount('cm-1')).toBe(1);
    expect((await po.call<WorkItem>('get_work_item', { workItemId: id })).state).toBe('in_review');
    // Late evidence measures a real diff, from the STRUCTURAL baseline.
    const diff = (adopted.evidence ?? []).find((e) => e.kind === 'git_diff');
    expect(diff?.payload['nonEmpty']).toBe(true);
    const halt = (adopted.evidence ?? []).find((e) => e.kind === 'halt_report');
    expect(halt?.payload['agentExitCode']).toBeNull(); // null ⇒ adopted, never re-run
  });

  it('a REJECTED branch is never re-adopted — rework re-invokes the agent', async () => {
    const machine = makeMachine('a-2');
    const id = await itemId('cm-2');

    // A normal, successful run: the branch is published and the spine certifies it
    // with `commit` evidence. The worktree is removed, so a re-dispatch finds no
    // local trace — exactly the state in which a remote branch could be re-adopted.
    const first = await runOnce(options(machine, featureOf.get('cm-2')!));
    expect(first.outcome).toBe('in_review');
    expect(invocationCount('cm-2')).toBe(1);

    // The reviewer sends it back for rework.
    await po.call('reject_gate', { workItemId: id, gate: 'review_approval', reason: 'please address the comments' });
    expect((await po.call<WorkItem>('get_work_item', { workItemId: id })).state).toBe('in_progress');

    // Rework MUST re-invoke the agent. Adopting the branch the reviewer just
    // rejected would resubmit byte-identical work and burn review rounds until
    // the item froze at review_non_convergence — with the agent run once, ever.
    const second = await runOnce(options(machine, featureOf.get('cm-2')!));
    expect(second.outcome).toBe('in_review');
    expect(second.details ?? '').not.toContain('adopted');
    expect(invocationCount('cm-2')).toBe(2); // the agent ran AGAIN
  });

  it('rework after an ADOPTED run also re-invokes the agent — the SOURCE branch is spent too', async () => {
    // The subtle one. An adopting run certifies the adopted revision under its OWN
    // new branch, so a spent-ness check keyed on branch NAMES would leave the
    // source branch looking forever fresh — and every later rework would re-adopt
    // the very work the reviewer rejected, exactly as the branch-keyed design did.
    // Spent-ness is keyed on the REVISION, which is the same wherever it is pointed
    // from. This test only differs from the one above by having an ADOPTION in the
    // item's lineage, which is precisely what makes it catch that.
    const machineA = makeMachine('a-3');
    const machineB = makeMachine('b-3');
    const feature = featureOf.get('cm-3')!;
    const id = await itemId('cm-3');

    // A publishes and dies; B adopts (agent invoked once, on A).
    await expect(
      runOnce({ ...options(machineA, feature), failpoint: 'after_durability_push' }),
    ).rejects.toThrow(/after_durability_push/);
    rmSync(machineA, { recursive: true, force: true });
    await po.call('force_release_claim', { workItemId: id });
    const adopted = await runOnce(options(machineB, feature));
    expect(adopted.outcome).toBe('adopted_in_review');
    expect(invocationCount('cm-3')).toBe(1);

    // The reviewer rejects the adopted work.
    await po.call('reject_gate', { workItemId: id, gate: 'review_approval', reason: 'needs changes' });
    expect((await po.call<WorkItem>('get_work_item', { workItemId: id })).state).toBe('in_progress');

    // Rework must run the agent — NOT re-adopt A's branch under a new claim.
    const rework = await runOnce(options(machineB, feature));
    expect(rework.details ?? '').not.toContain('adopted');
    expect(rework.outcome).toBe('in_review');
    expect(invocationCount('cm-3')).toBe(2);
  });
});
