/**
 * E2E: the runner opens a PR on dispatch and records it as `pr` evidence
 * (roadmap §9.6). fetch is injected (fake GitHub), so no network is touched.
 * The SPINE never sees the forge — only the runner does.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import { createMemoryEngine, type Actor, type Evidence, type Feature, type WorkItem } from '@oahs/core';
import { makeClient, type OahsClient } from '@oahs/contracts';
import { TokenStore, buildServer } from '@oahs/spine-api';

import { git, runOnce, type FetchImpl, type RunnerOptions } from '../src/index.js';

const ADMIN_TOKEN = 'runner-forge-admin';
const SPEC_FOLDER = 'delivery/fg';
const STORIES_YAML = `
- id: "fg-1"
  title: Login form
  description: a story dispatched with a forge configured
`;

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

/** Records forge calls; opens PR #100 on POST, returns [] on GET-by-head. */
function forgeFetch(): { fetchImpl: FetchImpl; calls: string[] } {
  const calls: string[] = [];
  const fetchImpl: FetchImpl = (input, init) => {
    const method = init?.method ?? 'GET';
    calls.push(`${method} ${input.replace(/^https?:\/\/[^/]+/, '')}`);
    let body: unknown = {};
    if (method === 'GET' && input.includes('/pulls?')) body = []; // no existing PR
    else if (method === 'POST' && input.endsWith('/pulls')) {
      body = { number: 100, html_url: 'https://gh/pr/100', base: { ref: 'main' } };
    }
    return Promise.resolve(
      new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } }),
    );
  };
  return { fetchImpl, calls };
}

beforeAll(async () => {
  app = await buildServer({ engine: createMemoryEngine(), tokenStore: new TokenStore(), adminToken: ADMIN_TOKEN });
  await app.listen({ port: 0, host: '127.0.0.1' });
  const baseUrl = `http://127.0.0.1:${(app.server.address() as AddressInfo).port}`;
  const admin = makeClient({ baseUrl, token: ADMIN_TOKEN });

  const createdPo = await admin.call<{ actor: Actor; token: string }>('create_actor', { type: 'user', displayName: 'PO' });
  const createdDev = await admin.call<{ actor: Actor; token: string }>('create_actor', { type: 'agent', displayName: 'Dev' });
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
  await po.call('advance_state', { workItemId: 'fg-1', to: 'draft' });
  await po.call('approve_gate', { workItemId: 'fg-1', gate: 'spec_approval', pinnedVerification: ['node .oahs-verify.mjs'] });

  tmpRoot = mkdtempSync(join(tmpdir(), 'oahs-runner-forge-'));
  repoDir = join(tmpRoot, 'repo');
  mkdirSync(repoDir, { recursive: true });
  agentScript = join(tmpRoot, 'agent.mjs');
  writeFileSync(agentScript, FAKE_AGENT, 'utf8');
  git(['init', '-b', 'main'], repoDir);
  writeFileSync(join(repoDir, '.oahs-verify.mjs'), 'process.exit(0);\n', 'utf8');
  mkdirSync(join(repoDir, SPEC_FOLDER, 'stories'), { recursive: true });
  writeFileSync(join(repoDir, SPEC_FOLDER, 'stories.yaml'), STORIES_YAML, 'utf8');
  const wi = await po.call<WorkItem>('get_work_item', { workItemId: 'fg-1' });
  writeFileSync(join(repoDir, SPEC_FOLDER, wi.specPath), '---\nstatus: backlog\n---\n\n# Story fg-1\n', 'utf8');
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

function runnerOptions(fetchImpl: FetchImpl): RunnerOptions {
  return {
    client: dev,
    repoPath: repoDir,
    specFolder: SPEC_FOLDER,
    agentCmd: `node ${agentScript}`,
    agentTimeoutMs: 30_000,
    log: () => {},
    forge: {
      owner: 'acme',
      repo: 'widgets',
      baseBranch: 'main',
      token: 'ght_test',
      baseUrl: 'https://api.github.test',
      fetchImpl,
    },
  };
}

describe('runner — PR on dispatch (§9.6)', () => {
  it('opens a PR from the claim branch and submits pr `opened` evidence', async () => {
    const { fetchImpl, calls } = forgeFetch();
    const result = await runOnce(runnerOptions(fetchImpl));
    expect(result.outcome).toBe('in_review');

    // The runner looked for an existing PR, then opened exactly one.
    expect(calls.some((c) => c.startsWith('GET /repos/acme/widgets/pulls?'))).toBe(true);
    expect(calls.filter((c) => c === 'POST /repos/acme/widgets/pulls')).toHaveLength(1);

    // pr `opened` evidence landed on the item.
    const pr = (result.evidence ?? []).filter((e: Evidence) => e.kind === 'pr');
    expect(pr).toHaveLength(1);
    expect(pr[0]!.payload).toMatchObject({ action: 'opened', number: 100, url: 'https://gh/pr/100' });

    // The spine really recorded it (server-side).
    const stored = await po.call<Evidence[]>('list_evidence', { workItemId: 'fg-1' });
    expect(stored.some((e) => e.kind === 'pr' && e.payload['action'] === 'opened')).toBe(true);
  });
});
