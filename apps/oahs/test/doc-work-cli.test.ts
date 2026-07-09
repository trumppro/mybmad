/**
 * Phase 4 CLI: non-coding teammates over the same rails, driven through the
 * command functions against a REAL in-process spine-api (memory engine, HTTP
 * on port 0) — same pattern as collab-cli.test.ts.
 *
 *  - `oahs actors`               list_actors: humans + agents + personas + system
 *  - `oahs personas provision`   idempotent, engine-governance-gated
 *  - `oahs item create`          create_work_item with a non-code kind
 *  - `oahs doclint`              deterministic lint; --submit sends doc_lint
 *                                evidence via the rails and the CORE gates on it
 */
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';

import { createMemoryEngine } from '@oahs/core';
import { makeClient, type OahsClient } from '@oahs/contracts';
import { TokenStore, buildServer } from '@oahs/spine-api';

import {
  actorCreateCommand,
  actorsCommand,
  advanceCommand,
  doclintCommand,
  featureCreateCommand,
  itemCreateCommand,
  personasProvisionCommand,
  roleAssignCommand,
  runToOutput,
} from '../src/commands/index.js';

const ADMIN_TOKEN = 'doc-work-cli-admin-token';

function extract(text: string, key: string): string {
  const match = new RegExp(`^${key}: (.+)$`, 'm').exec(text);
  if (!match || match[1] === undefined) throw new Error(`no "${key}:" line in:\n${text}`);
  return match[1];
}

let app: FastifyInstance;
let baseUrl: string;
let admin: OahsClient;
let po: OahsClient;
let writer: OahsClient;
let poId: string;
let writerId: string;
let featureId: string;
let docsDir: string;

beforeAll(async () => {
  app = await buildServer({
    engine: createMemoryEngine(),
    tokenStore: new TokenStore(),
    adminToken: ADMIN_TOKEN,
  });
  await app.listen({ port: 0, host: '127.0.0.1' });
  const { port } = app.server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${port}`;
  admin = makeClient({ baseUrl, token: ADMIN_TOKEN });

  const poOut = await actorCreateCommand(admin, { type: 'user', name: 'PO (human)' });
  poId = extract(poOut, 'actorId');
  po = makeClient({ baseUrl, token: extract(poOut, 'token') });
  await roleAssignCommand(admin, { actorId: poId, roleCode: 'product_owner' });

  const writerOut = await actorCreateCommand(admin, { type: 'agent', name: 'Writer agent' });
  writerId = extract(writerOut, 'actorId');
  writer = makeClient({ baseUrl, token: extract(writerOut, 'token') });
  await roleAssignCommand(admin, { actorId: writerId, roleCode: 'developer' });

  featureId = extract(await featureCreateCommand(po), 'featureId');
  docsDir = mkdtempSync(join(tmpdir(), 'oahs-doclint-'));
});

afterAll(async () => {
  await app.close();
  rmSync(docsDir, { recursive: true, force: true });
});

describe('oahs personas provision + actors', () => {
  it('provisions the six personas idempotently (admin only) and actors lists everyone', async () => {
    const first = await personasProvisionCommand(admin);
    expect(first).toContain('provisioned 6 personas');
    expect(first).toContain('bmad-agent-dev');
    expect(first).toContain('Amelia (Dev)');

    // Idempotent: the same six actors, no duplicates.
    const second = await personasProvisionCommand(admin);
    expect(second).toContain('provisioned 6 personas');

    const table = await actorsCommand(admin);
    // Humans, agents, personas, and the system actor are all visible.
    expect(table).toContain(poId);
    expect(table).toContain('PO (human)');
    expect(table).toContain('system');
    for (const code of [
      'bmad-agent-analyst',
      'bmad-agent-tech-writer',
      'bmad-agent-pm',
      'bmad-agent-ux-designer',
      'bmad-agent-architect',
      'bmad-agent-dev',
    ]) {
      expect(table).toContain(code);
    }
    // Exactly six persona rows even after re-provisioning.
    expect(table.match(/bmad-agent-/g)).toHaveLength(6);
  });

  it('is engine-gated: a plain member gets PermissionDeniedError (exit 1)', async () => {
    const out = await runToOutput(() => personasProvisionCommand(po));
    expect(out.exitCode).toBe(1);
    expect(out.text).toContain('PermissionDeniedError');
  });
});

describe('oahs item create', () => {
  it('creates a non-code work item with the requested kind and checkpoint', async () => {
    const out = await itemCreateCommand(po, {
      featureId,
      externalKey: 'prd-1',
      title: 'PRD change: rate limits',
      kind: 'spec_draft',
      specCheckpoint: true,
    });
    expect(out).toContain('created prd-1');
    expect(extract(out, 'kind')).toBe('spec_draft');
    expect(extract(out, 'state')).toBe('backlog');
    expect(extract(out, 'specCheckpoint')).toBe('true');
  });

  it('rejects an unknown --kind locally, before any RPC', async () => {
    await expect(
      itemCreateCommand(po, { featureId, externalKey: 'x', title: 'x', kind: 'novel' }),
    ).rejects.toThrow('invalid --kind');
  });
});

describe('oahs doclint', () => {
  it('lints locally without a client: findings printed, exit 1 when not schema-valid', async () => {
    const bad = join(docsDir, 'bad.md');
    writeFileSync(bad, '---\ntitle: PRD\n---\n# PRD\n\nTBD\n', 'utf8');
    const failing = await doclintCommand(null, { path: bad, requireSections: ['Intent'] });
    expect(failing.exitCode).toBe(1);
    expect(failing.text).toContain('NOT schema-valid');
    expect(failing.text).toContain('missing required section: ## Intent');
    expect(failing.text).toContain('placeholder "TBD"');

    const good = join(docsDir, 'good.md');
    writeFileSync(good, '---\ntitle: PRD\n---\n# PRD\n\n## Intent\nRate limits.\n', 'utf8');
    const passing = await doclintCommand(null, { path: good, requireSections: ['Intent'] });
    expect(passing.exitCode).toBe(0);
    expect(passing.text).toContain('schema-valid');
  });

  it('--submit puts doc_lint evidence on the rails and the CORE gates the transition', async () => {
    // A doc item claimed by the writer agent, advanced into in_progress.
    const created = await itemCreateCommand(po, {
      featureId,
      externalKey: 'doc-1',
      title: 'Doc lint fixture',
      kind: 'doc',
    });
    const workItemId = /created doc-1 \((.+)\)/.exec(created)?.[1] ?? '';
    expect(workItemId).not.toBe('');
    await advanceCommand(po, { workItemId, to: 'draft' });
    await advanceCommand(po, { workItemId, to: 'ready_for_dev' });
    const claim = await writer.call<{ id: string; fencingToken: number }>('claim_task', {
      workItemId,
      ttlMs: 3_600_000,
    });
    await advanceCommand(writer, { workItemId, to: 'in_progress', fencingToken: claim.fencingToken });

    // 1. Failing lint submitted through the in-process server → advance blocked.
    const bad = join(docsDir, 'submit-bad.md');
    writeFileSync(bad, '# Doc\n\nTODO: write it\n', 'utf8');
    const failing = await doclintCommand(writer, {
      path: bad,
      workItemId,
      submit: true,
      fencingToken: claim.fencingToken,
    });
    expect(failing.exitCode).toBe(1);
    expect(failing.text).toContain(`submitted doc_lint evidence on ${workItemId}`);
    const blocked = await runToOutput(() =>
      advanceCommand(writer, { workItemId, to: 'in_review', fencingToken: claim.fencingToken }),
    );
    expect(blocked.exitCode).toBe(1);
    expect(blocked.text).toContain('GuardFailedError');

    // 2. Passing lint submitted → the same advance clears.
    const good = join(docsDir, 'submit-good.md');
    writeFileSync(good, '# Doc\n\n## Intent\nAll written.\n', 'utf8');
    const passing = await doclintCommand(writer, {
      path: good,
      workItemId,
      submit: true,
      fencingToken: claim.fencingToken,
    });
    expect(passing.exitCode).toBe(0);
    const advanced = await advanceCommand(writer, {
      workItemId,
      to: 'in_review',
      fencingToken: claim.fencingToken,
    });
    expect(advanced).toContain('state: in_review');
  });

  it('--submit without --work-item fails fast', async () => {
    const good = join(docsDir, 'lonely.md');
    writeFileSync(good, '# Doc\n', 'utf8');
    await expect(doclintCommand(writer, { path: good, submit: true })).rejects.toThrow(
      '--submit requires --work-item',
    );
  });
});
