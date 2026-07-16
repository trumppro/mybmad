/**
 * E2E: the intent contract is enforced at dispatch (roadmap §9.3).
 *
 * A story's `<intent-contract>` region is frozen at spec approval (the measuring
 * side submits its canonical hash). If the region drifts before the runner
 * dispatches, the engine's `intent_unchanged` guard refuses the advance; the
 * runner cleans up and blocks `unclear_intent`. After a legitimate renegotiation
 * (`rebaseline_intent`) and an unblock, dispatch proceeds.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import {
  computeIntentHash,
  createMemoryEngine,
  extractIntentRegion,
  type Actor,
  type Feature,
  type WorkItem,
} from '@oahs/core';
import { makeClient, type OahsClient } from '@oahs/contracts';
import { TokenStore, buildServer } from '@oahs/spine-api';

import { git, runOnce, type RunnerOptions } from '../src/index.js';

const ADMIN_TOKEN = 'runner-intent-admin';
const SPEC_FOLDER = 'delivery/ic';
const STORIES_YAML = `
- id: "ic-1"
  title: Login form
  description: a story whose intent contract is frozen at approval
`;

const REGION_V1 = 'Build the login form.';
const REGION_V2 = 'Build the login form AND signup.';
const specBody = (region: string): string =>
  `---\nstatus: backlog\n---\n\n# Story ic-1\n\n<intent-contract>\n${region}\n</intent-contract>\n`;
const HASH_V1 = computeIntentHash(extractIntentRegion(specBody(REGION_V1))!);
const HASH_V2 = computeIntentHash(extractIntentRegion(specBody(REGION_V2))!);

const FAKE_AGENT = `
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
const specFile = process.env.OAHS_SPEC_FILE;
mkdirSync('src', { recursive: true });
writeFileSync('src/out.txt', 'work\\n');
execFileSync('git', ['add', '-A']);
execFileSync('git', ['-c','user.name=A','-c','user.email=a@t','commit','-m','work']);
writeFileSync(specFile, ['---','status: done','---','','## Auto Run Result','Status: done',''].join('\\n'));
`;

type App = Awaited<ReturnType<typeof buildServer>>;

let app: App;
let po: OahsClient;
let dev: OahsClient;
let tmpRoot: string;
let repoDir: string;
let agentScript: string;
let specPath: string;

/** Rewrite the repo's story spec with the given intent region and commit. */
function writeSpecRegion(region: string): void {
  writeFileSync(join(repoDir, SPEC_FOLDER, specPath), specBody(region), 'utf8');
  git(['add', '-A'], repoDir);
  git(['-c', 'user.name=Setup', '-c', 'user.email=setup@test.local', 'commit', '-m', `spec ${region}`], repoDir);
}

beforeAll(async () => {
  app = await buildServer({
    engine: createMemoryEngine(),
    tokenStore: new TokenStore(),
    adminToken: ADMIN_TOKEN,
  });
  await app.listen({ port: 0, host: '127.0.0.1' });
  const { port } = app.server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${port}`;
  const admin = makeClient({ baseUrl, token: ADMIN_TOKEN });

  const createdPo = await admin.call<{ actor: Actor; token: string }>('create_actor', {
    type: 'user',
    displayName: 'PO',
  });
  const createdDev = await admin.call<{ actor: Actor; token: string }>('create_actor', {
    type: 'agent',
    displayName: 'Dev',
  });
  for (const grant of [
    { actorId: createdPo.actor.id, permission: 'task.plan' },
    { actorId: createdPo.actor.id, permission: 'task.advance' },
    { actorId: createdPo.actor.id, permission: 'gate.spec.approve' },
    { actorId: createdPo.actor.id, permission: 'gate.review.approve' },
    { actorId: createdPo.actor.id, permission: 'feature.init' },
    { actorId: createdPo.actor.id, permission: 'intent.edit' },
    { actorId: createdPo.actor.id, permission: 'task.block' },
    { actorId: createdDev.actor.id, permission: 'task.claim' },
    { actorId: createdDev.actor.id, permission: 'task.advance' },
    { actorId: createdDev.actor.id, permission: 'task.block' },
  ]) {
    await admin.call('grant_permission', grant);
  }
  po = makeClient({ baseUrl, token: createdPo.token });
  dev = makeClient({ baseUrl, token: createdDev.token });

  const feature = await po.call<Feature>('create_feature');
  await po.call('import_stories', { featureId: feature.id, yaml: STORIES_YAML });
  const item = await po.call<WorkItem>('get_work_item', { workItemId: 'ic-1' });
  specPath = item.specPath;

  // Approve the spec WITH the frozen-region hash pinned (the CLI approve
  // --spec-file flow): submit intent_hash, then approve.
  await po.call('advance_state', { workItemId: 'ic-1', to: 'draft' });
  await po.call('submit_evidence', {
    workItemId: 'ic-1',
    evidence: { kind: 'intent_hash', payload: { algo: 'v1', hash: HASH_V1 } },
  });
  await po.call('approve_gate', {
    workItemId: 'ic-1',
    gate: 'spec_approval',
    pinnedVerification: ['node .oahs-verify.mjs'],
  });

  tmpRoot = mkdtempSync(join(tmpdir(), 'oahs-runner-intent-'));
  repoDir = join(tmpRoot, 'repo');
  mkdirSync(repoDir, { recursive: true });
  agentScript = join(tmpRoot, 'agent.mjs');
  writeFileSync(agentScript, FAKE_AGENT, 'utf8');

  git(['init', '-b', 'main'], repoDir);
  writeFileSync(join(repoDir, '.oahs-verify.mjs'), 'process.exit(0);\n', 'utf8');
  mkdirSync(join(repoDir, SPEC_FOLDER, 'stories'), { recursive: true });
  writeFileSync(join(repoDir, SPEC_FOLDER, 'stories.yaml'), STORIES_YAML, 'utf8');
  writeFileSync(join(repoDir, SPEC_FOLDER, specPath), specBody(REGION_V1), 'utf8');
  git(['add', '-A'], repoDir);
  git(['-c', 'user.name=Setup', '-c', 'user.email=setup@test.local', 'commit', '-m', 'baseline'], repoDir);
  const originDir = join(tmpRoot, 'origin.git');
  git(['clone', '--bare', repoDir, originDir], tmpRoot);
  git(['remote', 'add', 'origin', originDir], repoDir);
});

afterAll(async () => {
  await app.close();
  rmSync(tmpRoot, { recursive: true, force: true });
});

function runnerOptions(): RunnerOptions {
  return {
    client: dev,
    repoPath: repoDir,
    specFolder: SPEC_FOLDER,
    agentCmd: `node ${agentScript}`,
    agentTimeoutMs: 30_000,
    log: () => {},
  };
}

describe('runner — intent contract enforced at dispatch (§9.3)', () => {
  it('drifted intent blocks the dispatch; rebaseline + unblock re-opens it', async () => {
    // Drift the frozen region AFTER approval (approval pinned HASH_V1).
    writeSpecRegion(REGION_V2);

    // Dispatch refuses: the runner submits the drifted hash, the guard fails,
    // and the runner blocks unclear_intent (no crash, claim released).
    const blocked = await runOnce(runnerOptions());
    expect(blocked.outcome).toBe('blocked');
    const afterDrift = await po.call<WorkItem>('get_work_item', { workItemId: 'ic-1' });
    expect(afterDrift.state).toBe('ready_for_dev');
    expect(afterDrift.blockedReason).toBe('unclear_intent');
    expect(await po.call('list_claims')).toEqual([]); // claim released on block

    // Renegotiate: re-pin to the new region, then clear the overlay.
    const rebased = await po.call<WorkItem>('rebaseline_intent', { workItemId: 'ic-1', hash: HASH_V2 });
    expect(rebased.intentHash).toBe(HASH_V2);
    await po.call('unblock_task', { workItemId: 'ic-1' });

    // Dispatch now proceeds against the renegotiated baseline.
    const ok = await runOnce(runnerOptions());
    expect(ok.outcome).toBe('in_review');
    // The intent_hash the runner submitted lands in the run's evidence list.
    expect((ok.evidence ?? []).some((e) => e.kind === 'intent_hash')).toBe(true);
    const done = await po.call<WorkItem>('get_work_item', { workItemId: 'ic-1' });
    expect(done.state).toBe('in_review');
    expect(done.blockedReason).toBeNull();
  });
});
