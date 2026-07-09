/**
 * `oahs serve --data <dir>` persistence: boot the server on a durable PGlite
 * data directory, create real state (actor + grant + feature + stories),
 * STOP the server, boot a second server on the SAME directory — everything
 * is still there, the persisted token still authenticates, and new entities
 * get non-colliding ids (PgEngine recovers its id counter on restart).
 */
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { Feature, WorkItem } from '@oahs/core';
import { makeClient } from '@oahs/contracts';

import { actorCreateCommand, featureCreateCommand, grantCommand, inboxCommand } from '../src/commands/index.js';
import { startServe, type ServeHandle } from '../src/serve.js';

const ADMIN_TOKEN = 'persistence-admin-token';

const STORIES_YAML = `
- id: "p1"
  title: Persistent story
  description: Survives a restart
`;

let dataDir: string;
let handle: ServeHandle;
let poId: string;
let poToken: string;
let featureId: string;

function extract(text: string, key: string): string {
  const match = new RegExp(`^${key}: (.+)$`, 'm').exec(text);
  if (!match || match[1] === undefined) throw new Error(`no "${key}:" line in:\n${text}`);
  return match[1];
}

beforeAll(() => {
  dataDir = mkdtempSync(join(tmpdir(), 'oahs-persist-'));
});

afterAll(async () => {
  await handle.close();
  rmSync(dataDir, { recursive: true, force: true });
});

describe('oahs serve --data: durable engine + token store', () => {
  it('first boot: creates actor, grant, feature, and stories on the durable engine', async () => {
    handle = await startServe({ port: 0, host: '127.0.0.1', adminToken: ADMIN_TOKEN, dataDir });
    expect(handle.engineKind).toBe('pglite');
    expect(handle.adminTokenGenerated).toBe(false);

    const admin = makeClient({ baseUrl: handle.url, token: ADMIN_TOKEN });
    const poOut = await actorCreateCommand(admin, { type: 'user', name: 'Persistent PO' });
    poId = extract(poOut, 'actorId');
    poToken = extract(poOut, 'token');
    await grantCommand(admin, { actorId: poId, permission: 'task.plan' });

    const po = makeClient({ baseUrl: handle.url, token: poToken });
    featureId = extract(await featureCreateCommand(po), 'featureId');
    await po.call('import_stories', { featureId, yaml: STORIES_YAML });
    const item = await po.call<WorkItem>('get_work_item', { workItemId: 'p1' });
    expect(item.state).toBe('backlog');
  });

  it('restart on the same --data dir: state, token, and grants all survive', async () => {
    await handle.close();
    handle = await startServe({ port: 0, host: '127.0.0.1', adminToken: ADMIN_TOKEN, dataDir });

    const po = makeClient({ baseUrl: handle.url, token: poToken });
    // The persisted TokenStore still resolves the pre-restart token.
    expect(await po.call('whoami')).toEqual({ actorId: poId, isAdmin: false });
    // Projections survived: feature, work item, and the imported story.
    const feature = await po.call<Feature>('get_feature', { featureId });
    expect(feature.state).toBe('backlog');
    const item = await po.call<WorkItem>('get_work_item', { workItemId: 'p1' });
    expect(item.title).toBe('Persistent story');
    // The persisted GRANT still authorizes a mutation through the rails.
    const advanced = await po.call<WorkItem>('advance_state', { workItemId: 'p1', to: 'draft' });
    expect(advanced.state).toBe('draft');
  });

  it('new entities after the restart get non-colliding ids', async () => {
    const admin = makeClient({ baseUrl: handle.url, token: ADMIN_TOKEN });
    const out = await actorCreateCommand(admin, { type: 'agent', name: 'Post-restart Agent' });
    const newActorId = extract(out, 'actorId');
    expect(newActorId).not.toBe(poId);
    // The fresh actor is immediately usable (its token authenticates).
    const agent = makeClient({ baseUrl: handle.url, token: extract(out, 'token') });
    expect(await agent.call('whoami')).toEqual({ actorId: newActorId, isAdmin: false });
    // And the durable engine keeps serving reads for a gate-holder command.
    expect(await inboxCommand(agent)).toContain('awaiting spec approval:');
  });
});
