/**
 * E2E: multi-project safety of the worker loop — a runner scoped to one
 * feature must NEVER claim another feature's work items, even when the other
 * feature's item is first in global list order.
 *
 * This is the Wave-1 fix for the cross-claim hazard: two backlogs on one
 * server used to mean a runner bound to repo B could claim repo A's story,
 * run the agent in the wrong checkout, and block the item.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import { createMemoryEngine } from '@oahs/core';
import type { Actor, Claim, Feature, WorkItem } from '@oahs/core';
import { makeClient, type OahsClient } from '@oahs/contracts';
import { TokenStore, buildServer } from '@oahs/spine-api';

import { git, runOnce, type RunnerOptions } from '../src/index.js';

const ADMIN_TOKEN = 'runner-filter-e2e-admin-token';
const SPEC_FOLDER_B = 'delivery/feat-b';

const STORIES_A = `
- id: "a-1"
  title: Feature A story
  description: belongs to another project's repo — must not be claimed by B's runner
`;

const STORIES_B = `
- id: "b-1"
  title: Feature B story
  description: the story B's runner is allowed to work on
`;

const FAKE_AGENT = `
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
const specFile = process.env.OAHS_SPEC_FILE;
mkdirSync('src', { recursive: true });
writeFileSync('src/out.txt', 'work\\n');
execFileSync('git', ['add', '-A']);
execFileSync('git', [
  '-c', 'user.name=Fake Agent', '-c', 'user.email=fake@test.local',
  'commit', '-m', 'story work',
]);
writeFileSync(specFile, [
  '---',
  'status: done',
  '---',
  '',
  '## Auto Run Result',
  'Status: done',
  '',
].join('\\n'));
`;

type App = Awaited<ReturnType<typeof buildServer>>;

let app: App;
let po: OahsClient;
let dev: OahsClient;
let featureA: Feature;
let featureB: Feature;

let tmpRoot: string;
let repoDir: string; // feature B's repo — has ONLY feature B's specs
let agentScript: string;

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
    displayName: 'Dev Agent B',
  });
  for (const grant of [
    { actorId: createdPo.actor.id, permission: 'task.plan' },
    { actorId: createdPo.actor.id, permission: 'task.advance' },
    { actorId: createdPo.actor.id, permission: 'gate.spec.approve' },
    { actorId: createdPo.actor.id, permission: 'feature.init' },
    { actorId: createdDev.actor.id, permission: 'task.claim' },
    { actorId: createdDev.actor.id, permission: 'task.advance' },
    { actorId: createdDev.actor.id, permission: 'task.block' },
  ]) {
    await admin.call('grant_permission', grant);
  }
  po = makeClient({ baseUrl, token: createdPo.token });
  dev = makeClient({ baseUrl, token: createdDev.token });

  // Two features on ONE server: A imported first so its story is first in
  // global list order — the trap the filter must not fall into.
  featureA = await po.call<Feature>('create_feature');
  featureB = await po.call<Feature>('create_feature');
  await po.call('import_stories', { featureId: featureA.id, yaml: STORIES_A });
  await po.call('import_stories', { featureId: featureB.id, yaml: STORIES_B });

  // Both stories reach ready_for_dev with a pinned verification.
  for (const key of ['a-1', 'b-1']) {
    await po.call('advance_state', { workItemId: key, to: 'draft' });
    await po.call('approve_gate', {
      workItemId: key,
      gate: 'spec_approval',
      pinnedVerification: ['node .oahs-verify.mjs'],
    });
  }

  // Feature B's repo: specs for B only (A lives in a different repo).
  tmpRoot = mkdtempSync(join(tmpdir(), 'oahs-runner-filter-'));
  repoDir = join(tmpRoot, 'repo-b');
  mkdirSync(repoDir, { recursive: true });
  agentScript = join(tmpRoot, 'fake-agent.mjs');
  writeFileSync(agentScript, FAKE_AGENT, 'utf8');

  git(['init', '-b', 'main'], repoDir);
  writeFileSync(join(repoDir, '.oahs-verify.mjs'), 'process.exit(0);\n', 'utf8');
  mkdirSync(join(repoDir, SPEC_FOLDER_B, 'stories'), { recursive: true });
  writeFileSync(join(repoDir, SPEC_FOLDER_B, 'stories.yaml'), STORIES_B, 'utf8');
  const wiB = await po.call<WorkItem>('get_work_item', { workItemId: 'b-1' });
  writeFileSync(
    join(repoDir, SPEC_FOLDER_B, wiB.specPath),
    '---\nstatus: backlog\n---\n\n# Story b-1\n',
    'utf8',
  );
  git(['add', '-A'], repoDir);
  git(
    ['-c', 'user.name=Setup', '-c', 'user.email=setup@test.local', 'commit', '-m', 'baseline'],
    repoDir,
  );
  const originDir = join(tmpRoot, 'origin-b.git');
  git(['clone', '--bare', repoDir, originDir], tmpRoot);
  git(['remote', 'add', 'origin', originDir], repoDir);
});

afterAll(async () => {
  await app.close();
  rmSync(tmpRoot, { recursive: true, force: true });
});

function runnerOptions(overrides?: Partial<RunnerOptions>): RunnerOptions {
  return {
    client: dev,
    repoPath: repoDir,
    specFolder: SPEC_FOLDER_B,
    agentCmd: `node ${agentScript}`,
    agentTimeoutMs: 30_000,
    ...overrides,
  };
}

describe('runner featureId scoping — two backlogs on one server', () => {
  it('a runner scoped to feature B claims b-1, never a-1, even though a-1 is first globally', async () => {
    // Precondition: a-1 IS first in the unfiltered claimable list.
    const unfiltered = await dev.call<WorkItem[]>('list_work_items', {
      state: 'ready_for_dev',
      claimable: true,
    });
    expect(unfiltered.map((w) => w.externalKey)).toEqual(['a-1', 'b-1']);

    const result = await runOnce(runnerOptions({ featureId: featureB.id }));
    expect(result.dispatched).toBe(true);
    expect(result.externalKey).toBe('b-1');
    expect(result.outcome).toBe('in_review');

    // Feature A's story is untouched: still ready_for_dev, never claimed.
    const itemA = await po.call<WorkItem>('get_work_item', { workItemId: 'a-1' });
    expect(itemA.state).toBe('ready_for_dev');
    const claimsA = await po.call<Claim[]>('get_claims', { workItemId: 'a-1' });
    expect(claimsA).toEqual([]);
  });

  it('a scoped runner with nothing to do in its feature does not dispatch (a-1 still open)', async () => {
    // b-1 is now in_review — feature B has no claimable work left, while a-1
    // is still sitting ready_for_dev. The scoped runner must idle, not stray.
    const result = await runOnce(runnerOptions({ featureId: featureB.id }));
    expect(result.dispatched).toBe(false);

    const claimsA = await po.call<Claim[]>('get_claims', { workItemId: 'a-1' });
    expect(claimsA).toEqual([]);
  });
});
