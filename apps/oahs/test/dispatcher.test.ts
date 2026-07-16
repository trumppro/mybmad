/**
 * §10.2 — the container dispatcher. Docker is injected as a fake spawner (no
 * real Docker in CI, the way the supervisor test injects loops), so these tests
 * pin the ORCHESTRATION and the ISOLATION boundary:
 *
 *  - a `--once` cycle claims a ready item and spawns ONE container with `--rm`,
 *    the mounted repo, and an env carrying the §10.1 scoped token — never the
 *    static/admin token, never `OAHS_MODEL_*`;
 *  - exit 0 → the dispatcher advances nothing (the in-container run self-reported);
 *    non-zero → it records the tail as evidence, blocks `other`, releases;
 *  - the spine process never references a docker socket (only the dispatcher does).
 */
import { readFileSync, readdirSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { AddressInfo } from 'node:net';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';

import { createMemoryEngine, type Actor, type Feature, type WorkItem, type Claim, type Evidence } from '@oahs/core';
import { makeClient, type OahsClient } from '@oahs/contracts';
import { TokenStore, buildServer } from '@oahs/spine-api';

import { dispatchOnce, withForwardedModelEnv, type SpawnRequest, type SpawnResult } from '../src/dispatcher.js';

const ADMIN = 'dispatcher-admin-token';
const IMAGE = 'oahs/runner:test';
const STORIES = `
- id: "dsp-1"
  title: Dispatched story
  description: runs in a container
`;

let app: FastifyInstance;
let tokenStore: TokenStore;
let baseUrl: string;
let devToken: string;
let host: OahsClient;
let repoPath: string;
let itemId: string;

async function setupReadyItem(): Promise<void> {
  const admin = makeClient({ baseUrl, token: ADMIN });
  const dev = await admin.call<{ actor: Actor; token: string }>('create_actor', { type: 'agent', displayName: 'Dispatcher' });
  devToken = dev.token;
  for (const p of ['task.plan', 'task.claim', 'task.advance', 'task.block', 'gate.spec.approve']) {
    await admin.call('grant_permission', { actorId: dev.actor.id, permission: p });
  }
  host = makeClient({ baseUrl, token: devToken });
  const feature = await host.call<Feature>('create_feature', {});
  await host.call('import_stories', { featureId: feature.id, yaml: STORIES });
  await host.call('advance_state', { workItemId: 'dsp-1', to: 'draft' });
  await host.call('approve_gate', { workItemId: 'dsp-1', gate: 'spec_approval', pinnedVerification: ['node .oahs-verify.mjs'] });
  // import_stories mints the internal id (wi_00000N); 'dsp-1' is the externalKey.
  itemId = (await host.call<WorkItem>('get_work_item', { workItemId: 'dsp-1' })).id;
}

beforeEach(async () => {
  // Wall-clock leases: the scoped token's lease-bound expiry is comparable to Date.now().
  tokenStore = new TokenStore();
  app = await buildServer({ engine: createMemoryEngine({ wallClock: true }), tokenStore, adminToken: ADMIN });
  await app.listen({ port: 0, host: '127.0.0.1' });
  baseUrl = `http://127.0.0.1:${(app.server.address() as AddressInfo).port}`;
  repoPath = mkdtempSync(join(tmpdir(), 'oahs-dispatch-'));
  await setupReadyItem();
});

afterEach(async () => {
  await app.close();
  rmSync(repoPath, { recursive: true, force: true });
});

/** Static client that records every command it sends. */
function recordingHost(seen: string[]): OahsClient {
  return makeClient({
    baseUrl,
    token: devToken,
    fetchImpl: (input, init) => {
      seen.push(String(input).split('/rpc/')[1] ?? '?');
      return fetch(input, init);
    },
  });
}

const baseOptions = () => ({
  baseUrl,
  image: IMAGE,
  repoPath,
  specFolder: 'delivery/main',
  agentCmd: 'run-agent {SPEC_FOLDER}',
  log: () => {},
});

describe('§10.2 dispatcher — orchestration & isolation', () => {
  it('claims a ready item and spawns one container with --rm, the mounted repo, and a SCOPED-token env', async () => {
    let req: SpawnRequest | undefined;
    const spawn = (r: SpawnRequest): Promise<SpawnResult> => {
      req = r;
      return Promise.resolve({ code: 0, tail: '' });
    };
    const result = await dispatchOnce({ ...baseOptions(), client: host, spawn });

    expect(result.dispatched).toBe(true);
    expect(result.workItemId).toBe(itemId);
    expect(req).toBeDefined();

    // argv: docker run --rm, the image, the mounted repo, and the inner assigned run.
    const argv = req!.argv;
    expect(argv[0]).toBe('run');
    expect(argv).toContain('--rm');
    expect(argv).toContain(IMAGE);
    expect(argv).toContain('-v');
    expect(argv).toContain(`${repoPath}:/repo`);
    // Inner command runs the ASSIGNED single dispatch inside the container.
    const workIdx = argv.indexOf('work');
    expect(workIdx).toBeGreaterThan(argv.indexOf(IMAGE));
    expect(argv).toContain('--once');

    // Env: the container's token is the §10.1 SCOPED token — not the static/admin one.
    expect(req!.env['OAHS_TOKEN']).toBeTruthy();
    expect(req!.env['OAHS_TOKEN']).not.toBe(devToken);
    expect(req!.env['OAHS_TOKEN']).not.toBe(ADMIN);
    const resolved = tokenStore.resolve(req!.env['OAHS_TOKEN']!);
    expect(resolved?.claimId).toBe(result.claimId);
    expect(resolved?.workItemId).toBe(itemId);
    expect(resolved?.allowedCommands).toEqual([
      'heartbeat',
      'submit_evidence',
      'advance_state',
      'block_task',
      'release_claim',
    ]);
    // No static/admin token and no model keys ever cross into the container.
    const envValues = Object.values(req!.env);
    expect(envValues).not.toContain(ADMIN);
    expect(envValues).not.toContain(devToken);
    expect(Object.keys(req!.env).some((k) => k.startsWith('OAHS_MODEL'))).toBe(false);
    // The assignment carries the pre-read context so the container needs no spine read.
    const assignment = JSON.parse(req!.env['OAHS_ASSIGNMENT']!) as { claim: Claim; workItem: WorkItem };
    expect(assignment.claim.id).toBe(result.claimId);
    expect(assignment.workItem.id).toBe(itemId);
  });

  it('forwards model/agent env to the AGENT inside the container, never into the scoped-token env', async () => {
    let req: SpawnRequest | undefined;
    const spawn = (r: SpawnRequest): Promise<SpawnResult> => {
      req = r;
      return Promise.resolve({ code: 0, tail: '' });
    };
    await dispatchOnce({ ...baseOptions(), client: host, spawn, agentEnv: { OAHS_MODEL_API_KEY: 'sk-secret' } });
    // The key rides the inner `--agent-env` argv (→ the agent child), not the container env.
    expect(req!.argv).toContain('--agent-env');
    expect(req!.argv).toContain('OAHS_MODEL_API_KEY=sk-secret');
    expect(Object.keys(req!.env).some((k) => k.startsWith('OAHS_MODEL'))).toBe(false);
    expect(Object.values(req!.env)).not.toContain('sk-secret');
  });

  it('on container exit 0 the dispatcher advances/blocks nothing (the in-container run self-reported)', async () => {
    const seen: string[] = [];
    const spawn = (): Promise<SpawnResult> => Promise.resolve({ code: 0, tail: '' });
    await dispatchOnce({ ...baseOptions(), client: recordingHost(seen), spawn });
    expect(seen).not.toContain('advance_state');
    expect(seen).not.toContain('block_task');
    // The item was not advanced by the dispatcher.
    const item = await host.call<WorkItem>('get_work_item', { workItemId: itemId });
    expect(item.state).not.toBe('in_review');
    expect(item.blockedReason).toBeNull();
  });

  it('on container non-zero exit the dispatcher records the tail as evidence, blocks `other`, and releases', async () => {
    const tail = 'panic: boom in the container\nstack trace line';
    const spawn = (): Promise<SpawnResult> => Promise.resolve({ code: 137, tail });
    const result = await dispatchOnce({ ...baseOptions(), client: host, spawn });

    expect(result.outcome).toBe('blocked');
    const item = await host.call<WorkItem>('get_work_item', { workItemId: itemId });
    expect(item.blockedReason).toBe('other');
    // The captured tail is on the item as a dispatcher-sourced halt_report.
    const evidence = await host.call<Evidence[]>('list_evidence', { workItemId: itemId });
    const halt = evidence.find((e) => e.kind === 'halt_report' && e.payload['source'] === 'dispatcher');
    expect(halt).toBeDefined();
    expect(String(halt!.payload['autoRunResult'])).toContain('boom');
    expect(halt!.payload['agentExitCode']).toBe(137);
    // The lease was released (no live claim remains).
    const claims = await host.call<Claim[]>('list_claims', {});
    expect(claims.some((c) => c.id === result.claimId && !c.expired)).toBe(false);
  });

  it('returns {dispatched:false} and never spawns when nothing is ready', async () => {
    // Claim the only ready item out from under the dispatcher.
    await host.call('claim_task', { workItemId: 'dsp-1' });
    let spawned = false;
    const spawn = (): Promise<SpawnResult> => {
      spawned = true;
      return Promise.resolve({ code: 0, tail: '' });
    };
    const result = await dispatchOnce({ ...baseOptions(), client: host, spawn });
    expect(result.dispatched).toBe(false);
    expect(spawned).toBe(false);
  });
});

describe('§10.2 model-env forwarding (compose runtime profile)', () => {
  it('forwards the dispatcher’s OAHS_MODEL_* to the agent child, explicit --agent-env winning', () => {
    const source = {
      OAHS_MODEL_API_KEY: 'sk-from-env',
      OAHS_MODEL_BASE_URL: 'https://gw.example',
      OAHS_TOKEN: 'static-runner-token',
      OAHS_ADMIN_TOKEN: 'admin',
      PATH: '/usr/bin',
    } as NodeJS.ProcessEnv;
    const merged = withForwardedModelEnv({ OAHS_MODEL_API_KEY: 'sk-explicit' }, source);
    // Model keys are forwarded; explicit value wins on conflict.
    expect(merged['OAHS_MODEL_API_KEY']).toBe('sk-explicit');
    expect(merged['OAHS_MODEL_BASE_URL']).toBe('https://gw.example');
    // Non-model secrets are NOT swept in — only the agent's model creds.
    expect(merged['OAHS_TOKEN']).toBeUndefined();
    expect(merged['OAHS_ADMIN_TOKEN']).toBeUndefined();
    expect(merged['PATH']).toBeUndefined();
  });
});

describe('§10.2 isolation — the spine never holds a docker socket', () => {
  it('no file under apps/spine-api/src references a docker socket', () => {
    const root = new URL('../../spine-api/src', import.meta.url).pathname;
    const offenders: string[] = [];
    const walk = (dir: string): void => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (entry.name.endsWith('.ts')) {
          const text = readFileSync(full, 'utf8');
          if (/docker\.sock|var\/run\/docker|dockerode|\bdocker run\b/i.test(text)) offenders.push(full);
        }
      }
    };
    walk(root);
    expect(offenders).toEqual([]);
  });
});
