/**
 * Project surface over HTTP (Phase 7 Wave 2): the cockpit's data source.
 *
 *  - project_create/get/update/archive: the unit of parallel work on the wire;
 *  - project_list returns ROLLUPS — the portfolio question ("how are all my
 *    projects doing") answered in one call: items by state, blocked count,
 *    live claims, gates awaiting a decision;
 *  - create_feature takes projectId + name; list_work_items filters by
 *    projectId; inbox rows carry their project so a gate holder can tell
 *    which project a pending decision belongs to.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { AddressInfo } from 'node:net';
import { createMemoryEngine } from '@oahs/core';
import type { Actor, Feature, Project, WorkItem } from '@oahs/core';
import { makeClient, type OahsClient } from '@oahs/contracts';

import { TokenStore } from '../src/auth.js';
import { buildServer } from '../src/server.js';

const ADMIN_TOKEN = 'project-api-admin-token';

const STORIES_ALPHA = `
- id: "1-1"
  title: Alpha story one
  description: first
  spec_checkpoint: true
- id: "1-2"
  title: Alpha story two
  description: second
`;

const STORIES_BETA = `
- id: "1-1"
  title: Beta story one
  description: same conventional key as alpha — must not collide
`;

type App = Awaited<ReturnType<typeof buildServer>>;

interface ProjectRollup {
  project: Project;
  items: Record<string, number>;
  features: Record<string, number>;
  blocked: number;
  liveClaims: number;
  awaitingGates: number;
}

let app: App;
let po: OahsClient;
let dev: OahsClient;
let alpha: Project;
let beta: Project;

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
  for (const permission of ['task.plan', 'task.advance', 'gate.spec.approve', 'feature.init', 'feature.cancel']) {
    await admin.call('grant_permission', { actorId: createdPo.actor.id, permission });
  }
  await admin.call('grant_permission', { actorId: createdDev.actor.id, permission: 'task.claim' });
  po = makeClient({ baseUrl, token: createdPo.token });
  dev = makeClient({ baseUrl, token: createdDev.token });
});

afterAll(async () => {
  await app.close();
});

describe('project commands over the wire', () => {
  it('project_create → get by slug → update → the audit trail lands on a project stream', async () => {
    alpha = await po.call<Project>('project_create', {
      name: 'Alpha App',
      kind: 'code',
      repoPath: '/work/alpha',
      defaultSpecFolder: 'delivery/alpha',
    });
    expect(alpha.slug).toBe('alpha-app');

    const bySlug = await po.call<Project>('project_get', { projectId: 'alpha-app' });
    expect(bySlug.id).toBe(alpha.id);

    const updated = await po.call<Project>('project_update', {
      projectId: alpha.id,
      repoPath: '/work/alpha-moved',
    });
    expect(updated.repoPath).toBe('/work/alpha-moved');
  });

  it('features attach to projects; two projects hold the same conventional story key', async () => {
    beta = await po.call<Project>('project_create', { name: 'Beta Docs', kind: 'doc' });

    const falpha = await po.call<Feature>('create_feature', {
      projectId: 'alpha-app',
      name: 'Alpha sprint 1',
    });
    expect(falpha.projectId).toBe(alpha.id);
    expect(falpha.name).toBe('Alpha sprint 1');
    const fbeta = await po.call<Feature>('create_feature', { projectId: beta.id });

    await po.call('import_stories', { featureId: falpha.id, yaml: STORIES_ALPHA });
    await po.call('import_stories', { featureId: fbeta.id, yaml: STORIES_BETA });

    // Qualified handles resolve; the bare duplicate is an explicit error.
    const alphaOne = await po.call<WorkItem>('get_work_item', { workItemId: 'alpha-app:1-1' });
    expect(alphaOne.title).toBe('Alpha story one');
    await expect(po.call('get_work_item', { workItemId: '1-1' })).rejects.toMatchObject({
      name: 'GuardFailedError',
      message: expect.stringContaining('ambiguous'),
    });

    // list_work_items scopes by project (id or slug).
    const inAlpha = await po.call<WorkItem[]>('list_work_items', { projectId: 'alpha-app' });
    expect(inAlpha.map((i) => i.externalKey).sort()).toEqual(['1-1', '1-2']);
    const inBeta = await po.call<WorkItem[]>('list_work_items', { projectId: beta.id });
    expect(inBeta.map((i) => i.externalKey)).toEqual(['1-1']);
  });

  it('project_list rollups answer the portfolio question in one call', async () => {
    // Move alpha's stories: 1-1 → draft (awaiting spec gate), 1-2 stays backlog;
    // dev claims beta's story.
    await po.call('advance_state', { workItemId: 'alpha-app:1-1', to: 'draft' });
    await dev.call('claim_task', { workItemId: 'beta-docs:1-1' });

    const rollups = await po.call<ProjectRollup[]>('project_list');
    const byId = new Map(rollups.map((r) => [r.project.id, r]));

    const a = byId.get(alpha.id);
    expect(a?.items).toMatchObject({ draft: 1, backlog: 1 });
    expect(a?.awaitingGates).toBe(1); // 1-1 sits at the spec gate
    expect(a?.liveClaims).toBe(0);

    const b = byId.get(beta.id);
    expect(b?.items).toMatchObject({ backlog: 1 });
    expect(b?.liveClaims).toBe(1);
    expect(b?.awaitingGates).toBe(0);
  });

  it('project_list rolls up FEATURE stages incl. handoff and cancelled (§9)', async () => {
    // alpha's feature was epic-lifted to `executing` when 1-1 left backlog.
    // Add a fresh feature and cancel it — a cancelled feature with no work
    // items must still appear in the rollup (sourced from feature_list).
    const doomed = await po.call<Feature>('create_feature', { projectId: 'alpha-app', name: 'Scrapped' });
    await po.call('cancel_feature', { featureId: doomed.id });

    const rollups = await po.call<ProjectRollup[]>('project_list');
    const a = rollups.find((r) => r.project.id === alpha.id);
    expect(a?.features).toMatchObject({ executing: 1, cancelled: 1 });

    // feature_list is the board source and is project-scoped.
    const alphaFeatures = await po.call<Feature[]>('feature_list', { projectId: 'alpha-app' });
    expect(alphaFeatures.map((f) => f.state).sort()).toEqual(['cancelled', 'executing']);
    const cancelledOne = alphaFeatures.find((f) => f.id === doomed.id);
    expect(cancelledOne?.state).toBe('cancelled');
  });

  it('inbox rows say WHICH project a pending decision belongs to', async () => {
    const inbox = await po.call<{
      awaitingSpec: Array<WorkItem & { project?: { id: string; slug: string; name: string } }>;
      awaitingReview: unknown[];
    }>('inbox');
    const row = inbox.awaitingSpec.find((i) => i.externalKey === '1-1');
    expect(row?.project?.slug).toBe('alpha-app');
    expect(row?.project?.name).toBe('Alpha App');
  });

  it('project_archive hides from the default list; includeArchived brings it back', async () => {
    const retire = await po.call<Project>('project_create', { name: 'Retire Me' });
    await po.call('project_archive', { projectId: retire.id });

    const active = await po.call<ProjectRollup[]>('project_list');
    expect(active.some((r) => r.project.id === retire.id)).toBe(false);
    const all = await po.call<ProjectRollup[]>('project_list', { includeArchived: true });
    expect(all.some((r) => r.project.id === retire.id)).toBe(true);
  });
});
