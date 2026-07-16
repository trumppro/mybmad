/**
 * E2E: the runner mints a JOB-SCOPED token after claiming and routes every
 * dispatch MUTATION through it (roadmap §10.1); reads/poll/claim/heartbeat stay
 * on the static token. Proven end-to-end: the dispatch completes to in_review,
 * which can only happen if the scoped token's submit_evidence + advance_state
 * were authorized — and a recording fetch confirms the mutations carried the
 * scoped token, not the static one.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import { createMemoryEngine, type Actor, type Feature, type WorkItem } from '@oahs/core';
import { makeClient, type OahsClient } from '@oahs/contracts';
import { TokenStore, buildServer } from '@oahs/spine-api';

import { git, runOnce, type RunnerOptions } from '../src/index.js';

const ADMIN = 'runner-scoped-admin';
const SPEC_FOLDER = 'delivery/sc';
const STORIES = `
- id: "sc-1"
  title: Scoped dispatch
  description: dispatched under a job-scoped token
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
let baseUrl: string;
let po: OahsClient;
let devToken: string;
let tmpRoot: string;
let repoDir: string;
let agentScript: string;

/** (command, bearer-token-tail) pairs seen by the scoped clients. */
const seen: Array<{ command: string; token: string }> = [];

beforeAll(async () => {
  // Wall-clock leases (like `oahs serve`): the scoped token's lease-bound expiry
  // is comparable to Date.now(), so it is not born-expired.
  app = await buildServer({ engine: createMemoryEngine({ wallClock: true }), tokenStore: new TokenStore(), adminToken: ADMIN });
  await app.listen({ port: 0, host: '127.0.0.1' });
  baseUrl = `http://127.0.0.1:${(app.server.address() as AddressInfo).port}`;
  const admin = makeClient({ baseUrl, token: ADMIN });
  const dev = await admin.call<{ actor: Actor; token: string }>('create_actor', { type: 'agent', displayName: 'Dev' });
  devToken = dev.token;
  for (const permission of ['task.plan', 'task.claim', 'task.advance', 'task.block', 'gate.spec.approve']) {
    await admin.call('grant_permission', { actorId: dev.actor.id, permission });
  }
  po = makeClient({ baseUrl, token: dev.token });
  const feature = await po.call<Feature>('create_feature', {});
  await po.call('import_stories', { featureId: feature.id, yaml: STORIES });
  await po.call('advance_state', { workItemId: 'sc-1', to: 'draft' });
  await po.call('approve_gate', { workItemId: 'sc-1', gate: 'spec_approval', pinnedVerification: ['node .oahs-verify.mjs'] });

  tmpRoot = mkdtempSync(join(tmpdir(), 'oahs-runner-scoped-'));
  repoDir = join(tmpRoot, 'repo');
  mkdirSync(repoDir, { recursive: true });
  agentScript = join(tmpRoot, 'agent.mjs');
  writeFileSync(agentScript, FAKE_AGENT, 'utf8');
  git(['init', '-b', 'main'], repoDir);
  writeFileSync(join(repoDir, '.oahs-verify.mjs'), 'process.exit(0);\n', 'utf8');
  mkdirSync(join(repoDir, SPEC_FOLDER, 'stories'), { recursive: true });
  writeFileSync(join(repoDir, SPEC_FOLDER, 'stories.yaml'), STORIES, 'utf8');
  const wi = await po.call<WorkItem>('get_work_item', { workItemId: 'sc-1' });
  writeFileSync(join(repoDir, SPEC_FOLDER, wi.specPath), '---\nstatus: backlog\n---\n\n# Story sc-1\n', 'utf8');
  git(['add', '-A'], repoDir);
  git(['-c', 'user.name=S', '-c', 'user.email=s@t', 'commit', '-m', 'baseline'], repoDir);
  git(['clone', '--bare', repoDir, join(tmpRoot, 'origin.git')], tmpRoot);
  git(['remote', 'add', 'origin', join(tmpRoot, 'origin.git')], repoDir);
});

afterAll(async () => {
  await app.close();
  rmSync(tmpRoot, { recursive: true, force: true });
});

/** A client whose fetch records the (command, token-tail) it sends. */
function recordingClient(token: string): OahsClient {
  return makeClient({
    baseUrl,
    token,
    fetchImpl: (input, init) => {
      const command = String(input).split('/rpc/')[1] ?? '?';
      const auth = ((init?.headers ?? {}) as Record<string, string>)['authorization'] ?? '';
      seen.push({ command, token: auth.replace('Bearer ', '').slice(-8) });
      return fetch(input, init);
    },
  });
}

describe('runner — dispatch mutations under a job-scoped token (§10.1)', () => {
  it('mints a scoped token and uses it for mutations; the static token only polls/claims', async () => {
    const scopedTokens: string[] = [];
    const options: RunnerOptions = {
      client: makeClient({ baseUrl, token: devToken }), // static: poll/claim/heartbeat/mint
      repoPath: repoDir,
      specFolder: SPEC_FOLDER,
      agentCmd: `node ${agentScript}`,
      agentTimeoutMs: 30_000,
      log: () => {},
      scopedClientFactory: (token) => {
        scopedTokens.push(token);
        return recordingClient(token);
      },
    };
    const result = await runOnce(options);
    expect(result.outcome).toBe('in_review'); // the scoped mutations were authorized

    // A scoped token was minted (the factory was invoked).
    expect(scopedTokens.length).toBeGreaterThanOrEqual(1);
    const scopedTail = scopedTokens[0]!.slice(-8);
    const staticTail = devToken.slice(-8);
    expect(scopedTail).not.toBe(staticTail);

    // The dispatch mutations went out on the SCOPED token, never the static one.
    const mutations = seen.filter((s) => s.command === 'submit_evidence' || s.command === 'advance_state');
    expect(mutations.length).toBeGreaterThan(0);
    for (const m of mutations) expect(m.token).toBe(scopedTail);
  });
});
