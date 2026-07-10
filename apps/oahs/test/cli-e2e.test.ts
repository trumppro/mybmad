/**
 * Story 13 e2e: the gate-holder command functions drive a REAL in-process
 * spine-api (buildServer on port 0) through the typed contracts client —
 * actor bootstrap, stories import, the spec-approval gate with pinning, the
 * review reject-loopback, and the approve-to-done path. Direct client calls
 * fill the non-CLI steps (advance/claim/evidence), exactly as the runner
 * will.
 */
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';

import { createMemoryEngine, type Claim, type WorkItem } from '@oahs/core';
import { makeClient, type OahsClient } from '@oahs/contracts';
import { TokenStore, buildServer } from '@oahs/spine-api';

import {
  actorCreateCommand,
  approveCommand,
  claimLsCommand,
  claimReleaseCommand,
  eventsCommand,
  featureCreateCommand,
  grantCommand,
  importStoriesCommand,
  inboxCommand,
  rejectCommand,
  runToOutput,
  statusCommand,
  tokenListCommand,
  tokenReissueCommand,
  whoamiCommand,
} from '../src/commands/index.js';

const ADMIN_TOKEN = 'cli-e2e-admin-token';

const STORIES_YAML = `
- id: "s1"
  title: Spec-gated story
  description: Story for the CLI gate-holder flow
  spec_checkpoint: true
- id: "s2"
  title: Plain story
  description: Second story
`;

function extract(text: string, key: string): string {
  const match = new RegExp(`^${key}: (.+)$`, 'm').exec(text);
  if (!match || match[1] === undefined) throw new Error(`no "${key}:" line in:\n${text}`);
  return match[1];
}

let app: FastifyInstance;
let tmp: string;
let admin: OahsClient;
let po: OahsClient;
let dev: OahsClient;
let reviewer: OahsClient;
let baseUrl: string;
let poId: string;
let devId: string;
let reviewerId: string;
let featureId: string;
let claimS1: Claim;

beforeAll(async () => {
  tmp = mkdtempSync(join(tmpdir(), 'oahs-cli-e2e-'));
  app = await buildServer({
    engine: createMemoryEngine(),
    tokenStore: new TokenStore(),
    adminToken: ADMIN_TOKEN,
  });
  await app.listen({ port: 0, host: '127.0.0.1' });
  const { port } = app.server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${port}`;
  admin = makeClient({ baseUrl, token: ADMIN_TOKEN });
});

afterAll(async () => {
  await app.close();
  rmSync(tmp, { recursive: true, force: true });
});

describe('oahs CLI command functions against a live spine-api', () => {
  it('actor create + grant bootstrap PO, dev, and reviewer', async () => {
    const poOut = await actorCreateCommand(admin, { type: 'user', name: 'Product Owner' });
    const devOut = await actorCreateCommand(admin, { type: 'agent', name: 'Dev Agent' });
    const reviewerOut = await actorCreateCommand(admin, { type: 'user', name: 'Reviewer' });
    poId = extract(poOut, 'actorId');
    devId = extract(devOut, 'actorId');
    reviewerId = extract(reviewerOut, 'actorId');
    expect(extract(devOut, 'type')).toBe('agent');
    expect(extract(poOut, 'token')).toMatch(/^[0-9a-f]{64}$/);

    po = makeClient({ baseUrl, token: extract(poOut, 'token') });
    dev = makeClient({ baseUrl, token: extract(devOut, 'token') });
    reviewer = makeClient({ baseUrl, token: extract(reviewerOut, 'token') });

    for (const [actorId, permission] of [
      [poId, 'task.plan'],
      [poId, 'gate.spec.approve'],
      [devId, 'task.claim'],
      [devId, 'task.advance'],
      [reviewerId, 'gate.review.approve'],
    ] as const) {
      expect(await grantCommand(admin, { actorId, permission })).toBe(
        `granted ${permission} to ${actorId}`,
      );
    }
  });

  it('grant by a non-admin fails with the wire error name and exit 1', async () => {
    const out = await runToOutput(() =>
      grantCommand(po, { actorId: devId, permission: 'gate.review.approve' }),
    );
    expect(out.exitCode).toBe(1);
    expect(out.text).toMatch(/^PermissionDeniedError: /);
  });

  it('feature create + import stories.yaml', async () => {
    const featureOut = await featureCreateCommand(po);
    featureId = extract(featureOut, 'featureId');
    expect(extract(featureOut, 'state')).toBe('backlog');

    const storiesPath = join(tmp, 'stories.yaml');
    writeFileSync(storiesPath, STORIES_YAML, 'utf8');
    const importOut = await importStoriesCommand(po, { featureId, path: storiesPath });
    expect(importOut).toContain('imported: s1, s2');
    expect(importOut).toContain('updated: (none)');
  });

  it('inbox is empty before any draft exists', async () => {
    const out = await inboxCommand(po);
    expect(out).toContain('awaiting spec approval:\n(empty)');
    expect(out).toContain('awaiting review decision:\n(empty)');
  });

  it('after advancing s1 to draft, the inbox shows it awaiting spec approval', async () => {
    await po.call('advance_state', { workItemId: 's1', to: 'draft' });
    const out = await inboxCommand(po);
    expect(out).toMatch(/awaiting spec approval:[\s\S]*s1 {2,}Spec-gated story {2,}draft/);
    expect(out).toContain('awaiting review decision:\n(empty)');
  });

  it('approve spec_approval by a non-holder → PermissionDeniedError, exit 1', async () => {
    const out = await runToOutput(() =>
      approveCommand(dev, { workItemId: 's1', gate: 'spec_approval' }),
    );
    expect(out.exitCode).toBe(1);
    expect(out.text).toMatch(/^PermissionDeniedError: /);
  });

  it('an invalid --gate is rejected locally', async () => {
    const out = await runToOutput(() =>
      approveCommand(po, { workItemId: 's1', gate: 'merge_gate' }),
    );
    expect(out.exitCode).toBe(1);
    expect(out.text).toContain('invalid --gate "merge_gate"');
  });

  it('approve --gate spec_approval --pin pins verification and lands ready_for_dev', async () => {
    const out = await approveCommand(po, {
      workItemId: 's1',
      gate: 'spec_approval',
      pin: ['pnpm test', 'pnpm typecheck'],
    });
    expect(out).toContain('state: ready_for_dev');
    expect(out).toContain('pinned verification: pnpm test && pnpm typecheck');
    const item = await po.call<WorkItem>('get_work_item', { workItemId: 's1' });
    expect(item.state).toBe('ready_for_dev');
    expect(item.pinnedVerification).toEqual(['pnpm test', 'pnpm typecheck']);
  });

  it('dev drives s1 to in_review through the client (claim, advance, evidence)', async () => {
    claimS1 = await dev.call<Claim>('claim_task', { workItemId: 's1' });
    await dev.call('advance_state', {
      workItemId: 's1',
      to: 'in_progress',
      fencingToken: claimS1.fencingToken,
    });
    await dev.call('submit_evidence', {
      workItemId: 's1',
      fencingToken: claimS1.fencingToken,
      evidence: {
        kind: 'git_diff',
        payload: {
          baseline: 'abc',
          final: 'def',
          filesChanged: 2,
          nonEmpty: true,
          branch: `claim-${claimS1.id}`,
        },
      },
    });
    await dev.call('advance_state', {
      workItemId: 's1',
      to: 'in_review',
      fencingToken: claimS1.fencingToken,
    });
    const out = await inboxCommand(reviewer);
    expect(out).toMatch(/awaiting review decision:[\s\S]*s1/);
  });

  it('reject --gate review_approval fires the deterministic loopback', async () => {
    const out = await rejectCommand(reviewer, { workItemId: 's1', gate: 'review_approval' });
    expect(out).toContain('state: in_progress');
    expect(out).toContain('reviewLoopIteration: 1');
    expect(out).toContain('blockedReason: -');
  });

  it('after rework, review approval on pinned evidence lands done', async () => {
    await dev.call('advance_state', {
      workItemId: 's1',
      to: 'in_review',
      fencingToken: claimS1.fencingToken,
    });
    // Approval before the pinned test_run evidence exists → guard, exit 1.
    const early = await runToOutput(() =>
      approveCommand(reviewer, { workItemId: 's1', gate: 'review_approval' }),
    );
    expect(early.exitCode).toBe(1);
    expect(early.text).toMatch(/^GuardFailedError: /);

    for (const command of ['pnpm test', 'pnpm typecheck']) {
      await dev.call('submit_evidence', {
        workItemId: 's1',
        fencingToken: claimS1.fencingToken,
        evidence: { kind: 'test_run', payload: { command, exitCode: 0 } },
      });
    }
    await dev.call('submit_evidence', {
      workItemId: 's1',
      fencingToken: claimS1.fencingToken,
      evidence: {
        kind: 'commit',
        payload: { sha: 'def', branch: `claim-${claimS1.id}`, reachableOnRemote: true },
      },
    });
    const out = await approveCommand(reviewer, { workItemId: 's1', gate: 'review_approval' });
    expect(out).toContain('state: done');
  });

  it('status shows the state table and the feature dispatchHold', async () => {
    const out = await statusCommand(po);
    expect(out).toMatch(/done {2,}[^\n]*s1/);
    expect(out).toMatch(/backlog {2,}[^\n]*s2/);
    expect(out).toMatch(new RegExp(`${featureId} {2,}in_progress {2,}false`));
  });

  it('events prints the audit trail; [streamId] scopes it', async () => {
    const all = await eventsCommand(admin);
    expect(all).toContain('gate.approved');
    expect(all).toContain('gate.rejected');
    expect(all).toContain('work_item.claimed');
    // Event streams are keyed by the INTERNAL work item id, not the externalKey.
    const item = await admin.call<WorkItem>('get_work_item', { workItemId: 's1' });
    const scoped = await eventsCommand(admin, { streamId: item.id });
    expect(scoped).toContain('gate.approved');
    expect(scoped).not.toContain('feature.created');
  });

  it('events answers WHEN (ISO timestamp) and WHAT (payload), not just who/what-type', async () => {
    const item = await admin.call<WorkItem>('get_work_item', { workItemId: 's1' });
    const scoped = await eventsCommand(admin, { streamId: item.id });
    // occurredAt rendered as an ISO-8601 UTC timestamp column.
    expect(scoped).toContain('when');
    expect(scoped).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z/);
    // Payloads are visible in place — the audit is a query, not an interview.
    expect(scoped).toContain('"gate":"spec_approval"');
  });

  it('whoami answers "which actor is this token" from the CLI', async () => {
    const out = await whoamiCommand(admin);
    expect(out).toContain('isAdmin: true');
    const devOut = await whoamiCommand(dev);
    expect(devOut).toContain(`actorId: ${devId}`);
    expect(devOut).toContain('isAdmin: false');
  });

  it('claim ls shows live claims workspace-wide; claim release --force frees a stuck one', async () => {
    // A "runner died" simulation: dev claims s2 and never comes back.
    const claim = await dev.call<Claim>('claim_task', { workItemId: 's2' });
    const live = await claimLsCommand(admin);
    expect(live).toContain(claim.id);
    expect(live).toContain('s2');
    // The workspace-wide view also exposes the fixture's leftover: s1 was
    // driven to done WITHOUT releasing its claim — exactly the stuck-lease
    // shape this view exists to surface.
    expect(live).toContain('s1');

    const released = await claimReleaseCommand(admin, { workItemId: 's2' });
    expect(released).toContain(claim.id);
    const after = await claimLsCommand(admin);
    expect(after).not.toContain(claim.id);

    // History view still shows the released claim.
    expect(await claimLsCommand(admin, { released: true })).toContain(claim.id);
  });

  it('token list (inventory, no secrets) + token reissue (old dies, new works)', async () => {
    const created = await actorCreateCommand(admin, { type: 'agent', name: 'Reissue Target' });
    const targetId = extract(created, 'actorId');
    const oldToken = extract(created, 'token');

    const inventory = await tokenListCommand(admin);
    expect(inventory).toContain(targetId);
    expect(inventory).not.toContain(oldToken);

    const reissued = await tokenReissueCommand(admin, { actorId: targetId });
    const newToken = extract(reissued, 'token');
    expect(newToken).not.toBe(oldToken);

    const stale = makeClient({ baseUrl, token: oldToken });
    await expect(stale.call('whoami')).rejects.toMatchObject({ status: 401 });
    const fresh = makeClient({ baseUrl, token: newToken });
    expect(await fresh.call('whoami')).toEqual({ actorId: targetId, isAdmin: false });

    // Non-admin is denied both.
    await expect(tokenListCommand(dev)).rejects.toMatchObject({
      name: 'PermissionDeniedError',
    });
  });
});
