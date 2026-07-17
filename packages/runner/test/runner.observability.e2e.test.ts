/**
 * E2E: runner observability + resilience (Phase 7 Wave 1).
 *
 * A healthy runner used to print NOTHING, the agent's stdout/stderr was
 * captured and thrown away, and one network blip killed the whole loop.
 * Unattended operation needs all three fixed:
 *
 *  1. the agent transcript is teed to <repo>/.oahs/logs/<claimId>.log and the
 *     halt_report evidence carries agentLogPath — auditable after the fact;
 *  2. runOnce/workLoop narrate dispatches and outcomes through a log seam;
 *  3. workLoop survives a thrown cycle (logs it, backs off, keeps polling).
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import { createMemoryEngine } from '@oahs/core';
import type { Actor, Evidence, Feature, WorkItem } from '@oahs/core';
import { makeClient, type OahsClient } from '@oahs/contracts';
import { TokenStore, buildServer } from '@oahs/spine-api';

import { git, runOnce, workLoop, type RunnerOptions } from '../src/index.js';
import { jobsLoop } from '../src/jobs.js';

const ADMIN_TOKEN = 'runner-obs-e2e-admin-token';
const SPEC_FOLDER = 'delivery/obs';

const STORIES_YAML = `
- id: "o-1"
  title: Observability story
  description: transcript tee + halt_report agentLogPath
- id: "o-2"
  title: Resilience story
  description: the loop survives a failed cycle and still dispatches
`;

/**
 * §10.5: says something early, then keeps working for a while. The point is the
 * gap — a real agent can run for half an hour, and the transcript has to be
 * useful during it, not only once it ends.
 */
const SLOW_AGENT = `
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
console.log('EARLY LINE from the agent');
await new Promise((r) => setTimeout(r, 1500));
console.log('LATE LINE from the agent');
mkdirSync('src', { recursive: true });
writeFileSync('src/out.txt', 'work\\n');
execFileSync('git', ['add', '-A']);
execFileSync('git', ['-c','user.name=A','-c','user.email=a@t','commit','-m','slow work']);
writeFileSync(process.env.OAHS_SPEC_FILE, ['---','status: done','---','','## Auto Run Result','Status: done',''].join('\\n'));
`;

const FAKE_AGENT = `
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
const specFile = process.env.OAHS_SPEC_FILE;
console.log('AGENT SAYS HI on stdout');
console.error('AGENT SAYS HI on stderr');
mkdirSync('src', { recursive: true });
writeFileSync('src/out.txt', 'work\\n');
execFileSync('git', ['add', '-A']);
execFileSync('git', [
  '-c', 'user.name=Fake Agent', '-c', 'user.email=fake@test.local',
  'commit', '-m', 'story work',
]);
writeFileSync(specFile, [
  '---',
  'status: done',
  '---',
  '',
  '## Auto Run Result',
  'Status: done',
  '',
].join('\\n'));
`;

type App = Awaited<ReturnType<typeof buildServer>>;

let app: App;
let admin: OahsClient;
let po: OahsClient;
let dev: OahsClient;
let devActorId: string;
let feature: Feature;
let tmpRoot: string;
let repoDir: string;
let agentScript: string;
let slowAgentScript: string;
let slowFeatureId: string;

beforeAll(async () => {
  app = await buildServer({
    engine: createMemoryEngine(),
    tokenStore: new TokenStore(),
    adminToken: ADMIN_TOKEN,
  });
  await app.listen({ port: 0, host: '127.0.0.1' });
  const { port } = app.server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${port}`;
  admin = makeClient({ baseUrl, token: ADMIN_TOKEN });

  const createdPo = await admin.call<{ actor: Actor; token: string }>('create_actor', {
    type: 'user',
    displayName: 'PO',
  });
  const createdDev = await admin.call<{ actor: Actor; token: string }>('create_actor', {
    type: 'agent',
    displayName: 'Dev Agent',
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
  devActorId = createdDev.actor.id;

  feature = await po.call<Feature>('create_feature');
  await po.call('import_stories', { featureId: feature.id, yaml: STORIES_YAML });
  for (const key of ['o-1', 'o-2']) {
    await po.call('advance_state', { workItemId: key, to: 'draft' });
    await po.call('approve_gate', {
      workItemId: key,
      gate: 'spec_approval',
      pinnedVerification: ['node .oahs-verify.mjs'],
    });
  }

  // §10.5's case gets a backlog of its OWN: the runner takes the first ready
  // story in the whole backlog, so a case sharing a feature with others is at the
  // mercy of test order.
  const slowFeature = await po.call<Feature>('create_feature');
  slowFeatureId = slowFeature.id;
  await po.call('import_stories', {
    featureId: slowFeatureId,
    yaml: '\n- id: "o-slow"\n  title: Live transcript story\n  description: readable while the agent runs\n',
  });
  await po.call('advance_state', { workItemId: 'o-slow', to: 'draft' });
  // Left in DRAFT on purpose: other cases here run unfiltered workLoops that take
  // the first READY story in the whole backlog, so this one is only made ready
  // inside the case that owns it. A feature of its own stops it stealing THEIR
  // stories; staying un-ready stops them stealing IT.

  tmpRoot = mkdtempSync(join(tmpdir(), 'oahs-runner-obs-'));
  repoDir = join(tmpRoot, 'repo');
  mkdirSync(repoDir, { recursive: true });
  agentScript = join(tmpRoot, 'fake-agent.mjs');
  writeFileSync(agentScript, FAKE_AGENT, 'utf8');
  slowAgentScript = join(tmpRoot, 'slow-agent.mjs');
  writeFileSync(slowAgentScript, SLOW_AGENT, 'utf8');

  git(['init', '-b', 'main'], repoDir);
  writeFileSync(join(repoDir, '.oahs-verify.mjs'), 'process.exit(0);\n', 'utf8');
  mkdirSync(join(repoDir, SPEC_FOLDER, 'stories'), { recursive: true });
  writeFileSync(join(repoDir, SPEC_FOLDER, 'stories.yaml'), STORIES_YAML, 'utf8');
  for (const key of ['o-1', 'o-2']) {
    const wi = await po.call<WorkItem>('get_work_item', { workItemId: key });
    writeFileSync(
      join(repoDir, SPEC_FOLDER, wi.specPath),
      `---\nstatus: backlog\n---\n\n# Story ${key}\n`,
      'utf8',
    );
  }
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

function evidenceOfKind(result: { evidence?: Evidence[] }, kind: Evidence['kind']): Evidence[] {
  return (result.evidence ?? []).filter((e) => e.kind === kind);
}

describe('runner observability + resilience', () => {
  it('tees the agent transcript to .oahs/logs/<claimId>.log, links it in halt_report, and narrates', async () => {
    const lines: string[] = [];
    const result = await runOnce(runnerOptions({ log: (line) => lines.push(line) }));
    expect(result.outcome).toBe('in_review');
    expect(result.externalKey).toBe('o-1');

    // Transcript survives the worktree cleanup, with BOTH streams captured.
    const logPath = join(repoDir, '.oahs', 'logs', `${result.claimId!}.log`);
    expect(existsSync(logPath)).toBe(true);
    const transcript = readFileSync(logPath, 'utf8');
    expect(transcript).toContain('AGENT SAYS HI on stdout');
    expect(transcript).toContain('AGENT SAYS HI on stderr');

    // The evidence trail points at the transcript.
    const [halt] = evidenceOfKind(result, 'halt_report');
    expect(halt?.payload['agentLogPath']).toBe(logPath);

    // The run narrated dispatch + outcome through the log seam.
    expect(lines.some((l) => l.includes('o-1'))).toBe(true);
    expect(lines.some((l) => l.includes('in_review'))).toBe(true);
  });

  it('workLoop survives a thrown cycle: logs the failure, backs off, then dispatches', async () => {
    let failed = false;
    const flaky: OahsClient = new Proxy(dev, {
      get(target, prop, receiver) {
        const original = Reflect.get(target, prop, receiver) as unknown;
        if (prop !== 'call' || typeof original !== 'function') return original;
        return (...args: unknown[]) => {
          if (args[0] === 'list_work_items' && !failed) {
            failed = true;
            throw new Error('simulated network blip');
          }
          return (original as (...a: unknown[]) => unknown).apply(target, args);
        };
      },
    });

    const lines: string[] = [];
    await workLoop({
      ...runnerOptions({ client: flaky, log: (line) => lines.push(line) }),
      pollMs: 10,
      backoffMs: 10,
      stopWhen: () => lines.some((l) => l.includes('in_review')),
    });

    // The blip was survived and narrated — and work still got done.
    expect(lines.some((l) => l.includes('simulated network blip'))).toBe(true);
    expect(lines.some((l) => l.includes('o-2'))).toBe(true);
    const item = await po.call<WorkItem>('get_work_item', { workItemId: 'o-2' });
    expect(item.state).toBe('in_review');
  });

  it('jobsLoop survives a thrown cycle the same way (log + backoff + keep polling)', async () => {
    let failed = false;
    let cleanPolls = 0;
    const flaky: OahsClient = new Proxy(dev, {
      get(target, prop, receiver) {
        const original = Reflect.get(target, prop, receiver) as unknown;
        if (prop !== 'call' || typeof original !== 'function') return original;
        return (...args: unknown[]) => {
          if (args[0] === 'list_agent_jobs') {
            if (!failed) {
              failed = true;
              throw new Error('simulated jobs blip');
            }
            cleanPolls += 1;
          }
          return (original as (...a: unknown[]) => unknown).apply(target, args);
        };
      },
    });

    const lines: string[] = [];
    await jobsLoop({
      client: flaky,
      agentActorId: devActorId,
      agentCmd: 'true',
      pollMs: 10,
      backoffMs: 10,
      log: (line) => lines.push(line),
      stopWhen: () => cleanPolls >= 1,
    });

    expect(lines.some((l) => l.includes('simulated jobs blip'))).toBe(true);
    expect(cleanPolls).toBeGreaterThanOrEqual(1);
  });

  it('workLoop ANNOUNCES itself: list_runners shows the coding runner (Wave 3 visibility)', async () => {
    await workLoop({ ...runnerOptions(), once: true });
    const runners = await admin.call<
      Array<{ actorId: string; mode: string; repoPath?: string; lastSeenAt: number }>
    >('list_runners');
    const mine = runners.find((r) => r.actorId === devActorId && r.mode === 'coding');
    expect(mine).toBeDefined();
    expect(mine?.repoPath).toBe(repoDir);
  });

  it('workLoop --once still propagates a cycle error (script semantics)', async () => {
    const throwing: OahsClient = {
      ...dev,
      call: () => {
        throw new Error('dead spine');
      },
    } as OahsClient;
    await expect(
      workLoop({ ...runnerOptions({ client: throwing }), once: true }),
    ).rejects.toThrow('dead spine');
  });
});

// §10.5 runs LAST on purpose: the runner polls the whole backlog and takes the
// first ready story, so a case that does not care WHICH story it gets must not
// run before the ones that do.
describe('§10.5 live transcripts', () => {
  it('is readable WHILE the agent is still running — and a death leaves a partial log, not nothing', async () => {
    // The old design accumulated the transcript in memory and wrote it once the
    // agent exited: a runner killed at minute 29 of a 30-minute run left no file
    // at all, and nothing could be watched while it mattered.
    await po.call('approve_gate', {
      workItemId: 'o-slow',
      gate: 'spec_approval',
      pinnedVerification: ['node .oahs-verify.mjs'],
    });
    const run = runOnce(runnerOptions({ agentCmd: `node ${slowAgentScript}`, featureId: slowFeatureId }));

    // While the agent is mid-run (it says EARLY, then works for 1.5s), its early
    // output must already be ON DISK — this is exactly what a live tail reads,
    // and exactly what survives if the runner is killed right now.
    let early = '';
    const deadline = Date.now() + 8_000;
    const dir = join(repoDir, '.oahs', 'logs');
    while (Date.now() < deadline && early === '') {
      // Earlier cases left their own transcripts here, and this run's claim id is
      // not known until it finishes — so look through all of them for ours.
      for (const file of existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.log')) : []) {
        const text = readFileSync(join(dir, file), 'utf8');
        if (text.includes('EARLY LINE')) {
          early = text;
          break;
        }
      }
      if (early === '') await new Promise((r) => setTimeout(r, 25));
    }
    expect(early).toContain('EARLY LINE from the agent');
    // Partial by construction: the agent has not said its last word yet, and the
    // file already has content — an interrupted run is explained, not blank.
    expect(early).not.toContain('LATE LINE from the agent');
    expect(early).not.toContain('# exit:');

    const result = await run;
    expect(result.outcome).toBe('in_review');
    const complete = readFileSync(join(repoDir, '.oahs', 'logs', `${result.claimId!}.log`), 'utf8');
    expect(complete).toContain('EARLY LINE from the agent');
    expect(complete).toContain('LATE LINE from the agent');
    expect(complete).toContain('# exit: 0'); // the footer lands only at the end
  });
});
