/**
 * E2E: heartbeat keeps a LIVE runner's lease alive under wall-clock time
 * (Phase 7 Wave 2, D-G).
 *
 * The serve'd spine runs wall-clock leases; an agent run can easily outlive
 * the claim TTL. The runner must heartbeat DURING the agent invocation —
 * which also forces the async-spawn change (spawnSync blocked the whole
 * process, so nothing could heartbeat).
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

const ADMIN_TOKEN = 'runner-heartbeat-admin';
const SPEC_FOLDER = 'delivery/hb';

const STORIES_YAML = `
- id: "hb-1"
  title: Slow story
  description: the agent takes longer than the claim TTL
`;

// Sleeps ~900ms before finishing — longer than the 500ms claim TTL below.
const SLOW_AGENT = `
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
await new Promise((r) => setTimeout(r, 900));
const specFile = process.env.OAHS_SPEC_FILE;
mkdirSync('src', { recursive: true });
writeFileSync('src/out.txt', 'slow work\\n');
execFileSync('git', ['add', '-A']);
execFileSync('git', [
  '-c', 'user.name=Fake Agent', '-c', 'user.email=fake@test.local',
  'commit', '-m', 'slow story work',
]);
writeFileSync(specFile, ['---','status: done','---','','## Auto Run Result','Status: done',''].join('\\n'));
`;

type App = Awaited<ReturnType<typeof buildServer>>;

let app: App;
let po: OahsClient;
let dev: OahsClient;
let tmpRoot: string;
let repoDir: string;
let agentScript: string;

beforeAll(async () => {
  // Wall-clock leases — exactly what `oahs serve` runs (D-G).
  app = await buildServer({
    engine: createMemoryEngine({ wallClock: true }),
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
    displayName: 'Slow Dev',
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

  const feature = await po.call<Feature>('create_feature');
  await po.call('import_stories', { featureId: feature.id, yaml: STORIES_YAML });
  await po.call('advance_state', { workItemId: 'hb-1', to: 'draft' });
  await po.call('approve_gate', {
    workItemId: 'hb-1',
    gate: 'spec_approval',
    pinnedVerification: ['node .oahs-verify.mjs'],
  });

  tmpRoot = mkdtempSync(join(tmpdir(), 'oahs-runner-hb-'));
  repoDir = join(tmpRoot, 'repo');
  mkdirSync(repoDir, { recursive: true });
  agentScript = join(tmpRoot, 'slow-agent.mjs');
  writeFileSync(agentScript, SLOW_AGENT, 'utf8');

  git(['init', '-b', 'main'], repoDir);
  writeFileSync(join(repoDir, '.oahs-verify.mjs'), 'process.exit(0);\n', 'utf8');
  mkdirSync(join(repoDir, SPEC_FOLDER, 'stories'), { recursive: true });
  writeFileSync(join(repoDir, SPEC_FOLDER, 'stories.yaml'), STORIES_YAML, 'utf8');
  const wi = await po.call<WorkItem>('get_work_item', { workItemId: 'hb-1' });
  writeFileSync(
    join(repoDir, SPEC_FOLDER, wi.specPath),
    '---\nstatus: backlog\n---\n\n# Story hb-1\n',
    'utf8',
  );
  git(['add', '-A'], repoDir);
  git(
    ['-c', 'user.name=Setup', '-c', 'user.email=setup@test.local', 'commit', '-m', 'baseline'],
    repoDir,
  );
  const originDir = join(tmpRoot, 'origin.git');
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
    specFolder: SPEC_FOLDER,
    agentCmd: `node ${agentScript}`,
    agentTimeoutMs: 30_000,
    ...overrides,
  };
}

describe('runner heartbeat under wall-clock leases', () => {
  it('an agent run LONGER than the claim TTL still finishes: heartbeats keep the lease', async () => {
    const lines: string[] = [];
    const result = await runOnce(
      runnerOptions({
        // Agent sleeps 900ms — without heartbeats this lease dies mid-run. The TTL
        // must also outlast finishRun's tail of synchronous git calls (diff, the
        // §8 push-guard fingerprint, push, ls-remote), which block the heartbeat
        // timer; 500ms keeps that margin under parallel-CI load while staying well
        // under the agent's 900ms.
        claimTtlMs: 500,
        heartbeatMs: 100,
        log: (line) => lines.push(line),
      }),
    );
    expect(result.outcome).toBe('in_review');
    expect(result.externalKey).toBe('hb-1');

    const item = await po.call<WorkItem>('get_work_item', { workItemId: 'hb-1' });
    expect(item.state).toBe('in_review');

    // The lease was released cleanly — nothing left for claim ls to catch.
    const live = await po.call<Claim[]>('list_claims');
    expect(live).toEqual([]);
  });
});
