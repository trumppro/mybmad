/**
 * Supervisor e2e (Phase 7 Wave 4): ONE process runs N runner loops from a
 * runners.yaml manifest — the answer to "3 projects × 2 teammates ≈ 8
 * terminals". Tokens come from the PROFILE STORE by identity name (or
 * token/tokenEnv per entry); each loop's narration is prefixed with its
 * manifest name; a crashed loop restarts instead of killing its siblings.
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';

import { createMemoryEngine, type Actor, type Feature, type WorkItem } from '@oahs/core';
import { makeClient, type OahsClient } from '@oahs/contracts';
import { TokenStore, buildServer } from '@oahs/spine-api';
import { git } from '@oahs/runner';

import { saveIdentity } from '../src/cli-config.js';
import { runSupervisor } from '../src/supervisor.js';

const ADMIN_TOKEN = 'supervisor-admin-token';

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

let app: FastifyInstance;
let baseUrl: string;
let po: OahsClient;
let tmpRoot: string;
let home: string;
let manifestPath: string;

async function makeProjectRepo(
  admin: OahsClient,
  name: string,
  storyKey: string,
): Promise<{ slug: string }> {
  const dir = join(tmpRoot, name);
  mkdirSync(join(dir, 'delivery/main/stories'), { recursive: true });
  writeFileSync(join(dir, '.oahs-verify.mjs'), 'process.exit(0);\n', 'utf8');
  writeFileSync(
    join(dir, 'delivery/main/stories.yaml'),
    `- id: "${storyKey}"\n  title: ${name} story\n  description: x\n`,
    'utf8',
  );
  git(['init', '-b', 'main'], dir);
  git(['add', '-A'], dir);
  git(['-c', 'user.name=S', '-c', 'user.email=s@t', 'commit', '-m', 'baseline'], dir);

  const project = await po.call<{ id: string; slug: string }>('project_create', {
    name,
    repoPath: dir,
    defaultSpecFolder: 'delivery/main',
  });
  const feature = await po.call<Feature>('create_feature', { projectId: project.id });
  await po.call('import_stories', {
    featureId: feature.id,
    yaml: `- id: "${storyKey}"\n  title: ${name} story\n  description: x\n`,
  });
  await po.call('advance_state', { workItemId: storyKey, to: 'draft' });
  await po.call('advance_state', { workItemId: storyKey, to: 'ready_for_dev' });
  const item = await po.call<WorkItem>('get_work_item', { workItemId: storyKey });
  writeFileSync(join(dir, 'delivery/main', item.specPath), '---\nstatus: backlog\n---\n', 'utf8');
  git(['add', '-A'], dir);
  git(['-c', 'user.name=S', '-c', 'user.email=s@t', 'commit', '-m', 'spec'], dir);
  git(['clone', '--bare', dir, `${dir}-origin.git`], tmpRoot);
  git(['remote', 'add', 'origin', `${dir}-origin.git`], dir);
  return { slug: project.slug };
}

beforeAll(async () => {
  tmpRoot = mkdtempSync(join(tmpdir(), 'oahs-supervisor-'));
  home = join(tmpRoot, 'home');
  app = await buildServer({
    engine: createMemoryEngine(),
    tokenStore: new TokenStore(),
    adminToken: ADMIN_TOKEN,
  });
  await app.listen({ port: 0, host: '127.0.0.1' });
  baseUrl = `http://127.0.0.1:${(app.server.address() as AddressInfo).port}`;
  const admin = makeClient({ baseUrl, token: ADMIN_TOKEN });

  const createdPo = await admin.call<{ actor: Actor; token: string }>('create_actor', {
    type: 'user',
    displayName: 'PO',
  });
  const createdDev = await admin.call<{ actor: Actor; token: string }>('create_actor', {
    type: 'agent',
    displayName: 'Dev',
  });
  for (const p of ['task.plan', 'task.advance', 'gate.spec.approve', 'feature.init']) {
    await admin.call('grant_permission', { actorId: createdPo.actor.id, permission: p });
  }
  for (const p of ['task.claim', 'task.advance', 'task.block']) {
    await admin.call('grant_permission', { actorId: createdDev.actor.id, permission: p });
  }
  po = makeClient({ baseUrl, token: createdPo.token });
  // The DEV identity rides the profile store — the manifest names it.
  saveIdentity('dev', { token: createdDev.token, actorId: createdDev.actor.id }, { OAHS_HOME: home });

  const alpha = await makeProjectRepo(admin, 'Sup Alpha', 'sa-1');
  const beta = await makeProjectRepo(admin, 'Sup Beta', 'sb-1');

  const agentScript = join(tmpRoot, 'agent.mjs');
  writeFileSync(agentScript, FAKE_AGENT, 'utf8');
  manifestPath = join(tmpRoot, 'runners.yaml');
  writeFileSync(
    manifestPath,
    [
      'runners:',
      `  - name: alpha-dev`,
      `    identity: dev`,
      `    project: ${alpha.slug}`,
      `    agentCmd: node ${agentScript}`,
      `  - name: beta-dev`,
      `    identity: dev`,
      `    project: ${beta.slug}`,
      `    agentCmd: node ${agentScript}`,
      '',
    ].join('\n'),
    'utf8',
  );
});

afterAll(async () => {
  await app.close();
  rmSync(tmpRoot, { recursive: true, force: true });
});

describe('oahs work --manifest — one process, N runner loops', () => {
  it('drains BOTH projects concurrently, narrating with per-runner prefixes', async () => {
    const lines: string[] = [];
    await runSupervisor({
      manifestPath,
      url: baseUrl,
      once: true,
      env: { OAHS_HOME: home },
      log: (line) => lines.push(line),
    });

    const sa = await po.call<WorkItem>('get_work_item', { workItemId: 'sa-1' });
    const sb = await po.call<WorkItem>('get_work_item', { workItemId: 'sb-1' });
    expect(sa.state).toBe('in_review');
    expect(sb.state).toBe('in_review');

    expect(lines.some((l) => l.startsWith('[alpha-dev]'))).toBe(true);
    expect(lines.some((l) => l.startsWith('[beta-dev]'))).toBe(true);
  });

  it('an unknown identity in the manifest is a CLEAR error, not a silent skip', async () => {
    const badPath = join(tmpRoot, 'bad.yaml');
    writeFileSync(
      badPath,
      'runners:\n  - name: ghost\n    identity: nobody\n    project: sup-alpha\n    agentCmd: echo x\n',
      'utf8',
    );
    await expect(
      runSupervisor({ manifestPath: badPath, url: baseUrl, once: true, env: { OAHS_HOME: home } }),
    ).rejects.toThrow(/nobody/);
  });

  it('a blank agentEnv value (YAML null) is a CLEAR error, not a corrupt "null" secret', async () => {
    const badPath = join(tmpRoot, 'bad-env.yaml');
    // `MODEL_KEY:` with no value parses to null — would coerce to KEY=null in
    // the child env; the supervisor must reject it up front (§8).
    writeFileSync(
      badPath,
      [
        'runners:',
        '  - name: badenv',
        '    identity: dev',
        '    project: sup-alpha',
        '    agentCmd: echo x',
        '    agentEnv:',
        '      MODEL_KEY:',
        '',
      ].join('\n'),
      'utf8',
    );
    await expect(
      runSupervisor({ manifestPath: badPath, url: baseUrl, once: true, env: { OAHS_HOME: home } }),
    ).rejects.toThrow(/MODEL_KEY/);
  });
});
