/**
 * E2E: the CONTAINER execution model (roadmap §10.2). The dispatcher claims on
 * the host (static token), mints a job-scoped token, reads the task context, and
 * hands a container a complete ASSIGNMENT. The container then runs the dispatch
 * under a MUTATION-ONLY scoped token — no poll, no claim, no get_task_context.
 *
 * This test stands in for the container: it drives an assigned `runOnce` whose
 * `client` is the scoped token, and proves (a) it reaches in_review, and (b) it
 * never calls a command outside the §10.1 allowlist ∪ {heartbeat}. A single
 * forbidden read (list_work_items / claim_task / get_task_context / mint /
 * list_evidence) would 403 and the run would throw — so green here means the
 * container needs nothing but its scoped credential.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import {
  createMemoryEngine,
  type Actor,
  type Claim,
  type Feature,
  type WorkItem,
  type WorkItemState,
} from '@oahs/core';
import { makeClient, type OahsClient } from '@oahs/contracts';
import { TokenStore, buildServer } from '@oahs/spine-api';

import { git, runOnce, type RunnerOptions } from '../src/index.js';

const ADMIN = 'runner-assigned-admin';
const SPEC_FOLDER = 'delivery/as';
const STORIES = `
- id: "as-1"
  title: Assigned dispatch
  description: run inside a container under a scoped token
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

/** The §10.1 scoped allowlist, plus heartbeat (which the runner drives itself). */
const ALLOWED = new Set(['heartbeat', 'submit_evidence', 'advance_state', 'block_task', 'release_claim']);

type App = Awaited<ReturnType<typeof buildServer>>;
let app: App;
let baseUrl: string;
let tmpRoot: string;
let repoDir: string;
let agentScript: string;
let assignment: { claim: Claim; workItem: WorkItem; entryState: WorkItemState };
let scopedToken: string;
const seen: string[] = [];

beforeAll(async () => {
  app = await buildServer({ engine: createMemoryEngine({ wallClock: true }), tokenStore: new TokenStore(), adminToken: ADMIN });
  await app.listen({ port: 0, host: '127.0.0.1' });
  baseUrl = `http://127.0.0.1:${(app.server.address() as AddressInfo).port}`;
  const admin = makeClient({ baseUrl, token: ADMIN });
  const dev = await admin.call<{ actor: Actor; token: string }>('create_actor', { type: 'agent', displayName: 'Dispatcher' });
  for (const p of ['task.plan', 'task.claim', 'task.advance', 'task.block', 'gate.spec.approve']) {
    await admin.call('grant_permission', { actorId: dev.actor.id, permission: p });
  }
  // The DISPATCHER (host, static token) drives to ready_for_dev, claims, mints, reads context.
  const host = makeClient({ baseUrl, token: dev.token });
  const feature = await host.call<Feature>('create_feature', {});
  await host.call('import_stories', { featureId: feature.id, yaml: STORIES });
  await host.call('advance_state', { workItemId: 'as-1', to: 'draft' });
  await host.call('approve_gate', { workItemId: 'as-1', gate: 'spec_approval', pinnedVerification: ['node .oahs-verify.mjs'] });
  const claim = await host.call<Claim>('claim_task', { workItemId: 'as-1' });
  const minted = await host.call<{ token: string; expiresAt: number }>('mint_claim_token', { claimId: claim.id });
  scopedToken = minted.token;
  const context = await host.call<{ workItem: WorkItem; entryState: WorkItemState }>('get_task_context', { workItemId: 'as-1' });
  assignment = { claim, workItem: context.workItem, entryState: context.entryState };

  tmpRoot = mkdtempSync(join(tmpdir(), 'oahs-runner-assigned-'));
  repoDir = join(tmpRoot, 'repo');
  mkdirSync(repoDir, { recursive: true });
  agentScript = join(tmpRoot, 'agent.mjs');
  writeFileSync(agentScript, FAKE_AGENT, 'utf8');
  git(['init', '-b', 'main'], repoDir);
  writeFileSync(join(repoDir, '.oahs-verify.mjs'), 'process.exit(0);\n', 'utf8');
  mkdirSync(join(repoDir, SPEC_FOLDER, 'stories'), { recursive: true });
  writeFileSync(join(repoDir, SPEC_FOLDER, 'stories.yaml'), STORIES, 'utf8');
  writeFileSync(join(repoDir, SPEC_FOLDER, assignment.workItem.specPath), '---\nstatus: backlog\n---\n\n# as-1\n', 'utf8');
  git(['add', '-A'], repoDir);
  git(['-c', 'user.name=S', '-c', 'user.email=s@t', 'commit', '-m', 'baseline'], repoDir);
  git(['clone', '--bare', repoDir, join(tmpRoot, 'origin.git')], tmpRoot);
  git(['remote', 'add', 'origin', join(tmpRoot, 'origin.git')], repoDir);
});

afterAll(async () => {
  await app.close();
  rmSync(tmpRoot, { recursive: true, force: true });
});

/** Scoped client that records every command it sends — the container's ONLY credential. */
function containerClient(): OahsClient {
  return makeClient({
    baseUrl,
    token: scopedToken,
    fetchImpl: (input, init) => {
      seen.push(String(input).split('/rpc/')[1] ?? '?');
      return fetch(input, init);
    },
  });
}

describe('runner — assigned dispatch under a mutation-only scoped token (§10.2)', () => {
  it('runs a pre-claimed assignment to in_review using only the scoped allowlist', async () => {
    const options: RunnerOptions = {
      client: containerClient(),
      repoPath: repoDir,
      specFolder: SPEC_FOLDER,
      agentCmd: `node ${agentScript}`,
      agentTimeoutMs: 30_000,
      log: () => {},
      assignment,
    };
    const result = await runOnce(options);

    expect(result.outcome).toBe('in_review');
    expect(result.claimId).toBe(assignment.claim.id);

    // Every command the container sent is inside the §10.1 allowlist (∪ heartbeat).
    // In particular: no list_work_items, no claim_task, no get_task_context, no mint.
    expect(seen.length).toBeGreaterThan(0);
    for (const command of seen) expect(ALLOWED.has(command)).toBe(true);

    // §10.3: the container holds NO push credential, so it pushes NOTHING — the
    // claim branch stays local and the dispatcher pushes it on the host later.
    const onRemote = git(['ls-remote', join(tmpRoot, 'origin.git'), `refs/heads/claim/${assignment.claim.id}`], repoDir);
    expect(onRemote).toBe('');
    // …and it says so honestly, rather than certifying an unpushed revision.
    const commit = (result.evidence ?? []).find((e) => e.kind === 'commit');
    expect(commit?.payload['reachableOnRemote']).toBe(false);
    expect(commit?.payload['pushDeferred']).toBe('dispatcher');
  });
});
