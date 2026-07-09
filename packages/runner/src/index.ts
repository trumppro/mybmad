/**
 * @oahs/runner — the BYO worker loop (Phase 1 story 14).
 *
 * FIXED INTERFACE between the oahs CLI (`oahs work`) and the runner library.
 * The CLI wires flags/env into RunnerOptions and calls workLoop/runOnce; all
 * runner logic lives here.
 *
 * Contract (product-roadmap.md §2.3):
 *  1. poll list_work_items(state=ready_for_dev, claimable) → claim_task
 *     (crash re-dispatch: an in_progress item with NO live claim is a dead
 *     worker's run — polled as a fallback so recovery uses the same loop)
 *  2. worktree named by claim id; branch `claim/<claimId>`
 *  3. mirror-on-dispatch: stamp spec frontmatter to the DB entry state
 *  4. advance_state(to=in_progress) BEFORE the agent runs — DB is the entry state
 *  5. invoke the coding agent (template; unmodified bmad-dev-auto content)
 *  6. parse HALT + Auto Run Result → halt_report evidence (verbatim)
 *  7. run PINNED verification commands only (allowlisted) → test_run evidence
 *  8. push branch → git_diff + commit evidence (remote reachability measured)
 *  9. advance_state / block_task per HALT status — the core computes verdicts
 * 10. crash recovery on re-claim: adopt a decently-finished worktree (terminal
 *     frontmatter + a real commit past its baseline) with late evidence
 *     submission; a wrecked worktree is cleaned and blocked `stale_worktree`.
 *
 * Agent invocation environment (part of this interface): the agent command
 * template is expanded ({SPEC_FOLDER} {STORY_ID} {INVOKE_WITH} {WORKTREE}),
 * run with cwd = the claim worktree, and receives two extra env vars:
 *   OAHS_SPEC_FILE — absolute path of the story spec file inside the worktree
 *   OAHS_STORY_ID  — the work item externalKey (stories.yaml id)
 */
// Phase 4 (roadmap §1.4): the deterministic document lint for non-code work.
export { lintDoc, type DocLintResult, type LintDocOptions } from './doclint.js';
// Phase 5 (roadmap §6): the teammate JOBS runtime — reply-only agent jobs
// served through the rails with memory recall/learning, zero lifecycle calls.
export { jobsLoop, runJobsOnce, type JobsOnceResult, type JobsRunnerOptions } from './jobs.js';

import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { join, resolve } from 'node:path';
import { parse as parseYaml } from 'yaml';
import type { OahsClient } from '@oahs/contracts';
import type { BlockedReason, Claim, Evidence, WorkItem, WorkItemState } from '@oahs/core';

export interface RunnerOptions {
  client: OahsClient;
  /** Absolute path of the target project git checkout. */
  repoPath: string;
  /** Spec folder (relative to repo root) holding SPEC.md + stories.yaml + stories/. */
  specFolder: string;
  /**
   * Coding-agent command template. Placeholders: {SPEC_FOLDER} {STORY_ID}
   * {INVOKE_WITH} {WORKTREE}. Executed with cwd = the claim worktree.
   */
  agentCmd: string;
  /** Poll interval for workLoop (ms). Default 15_000. */
  pollMs?: number;
  /** Binaries pinned verification commands may start with. */
  verificationAllowlist?: string[];
  /** Git remote to push claim branches to. Default 'origin'. */
  remote?: string;
  /** TEST ONLY: die at a specific point to exercise crash recovery. */
  failpoint?: 'before_report';
  /** Max wall time for one agent invocation (ms). Default 30 minutes. */
  agentTimeoutMs?: number;
  /** Extra environment variables passed to the agent invocation. */
  agentEnv?: Record<string, string>;
}

export interface RunOnceResult {
  dispatched: boolean;
  workItemId?: string;
  externalKey?: string;
  outcome?: 'in_review' | 'blocked' | 'adopted_in_review' | 'crashed';
  details?: string;
  /** Claim taken by this run (branch is `claim/<claimId>`). */
  claimId?: string;
  /** Raw evidence submitted during this run, in submission order. */
  evidence?: Evidence[];
}

/** Binaries a pinned verification command may start with (first token). */
export const DEFAULT_VERIFICATION_ALLOWLIST: readonly string[] = [
  'node',
  'npm',
  'pnpm',
  'npx',
  'pytest',
  'python3',
  'sh',
  'bash',
  'git',
];

/** Marker dropped in every claim worktree so a later claim can map it back. */
const MARKER_FILE = '.oahs-work-item';

/** DB state → spec-file frontmatter vocabulary (dev-auto file dialect). */
const ENTRY_STATUS: Readonly<Partial<Record<WorkItemState, string>>> = {
  ready_for_dev: 'ready-for-dev',
  in_progress: 'in-progress',
  in_review: 'in-review',
};

// ---------------------------------------------------------------------------
// git plumbing (child_process only — no external deps)
// ---------------------------------------------------------------------------

/** Run a git command; throws on non-zero exit; returns trimmed stdout. */
export function git(args: string[], cwd: string): string {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8' });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      `git ${args.join(' ')} failed with exit ${String(result.status)}: ${result.stderr.trim()}`,
    );
  }
  return result.stdout.trim();
}

/**
 * Keep runner bookkeeping out of agent commits: the marker file and the
 * worktree root are added to $GIT_COMMON_DIR/info/exclude (shared by all
 * worktrees), so an agent's `git add -A` never picks them up.
 */
function ensureGitExcludes(repoPath: string): void {
  const gitDir = join(repoPath, '.git');
  try {
    if (!statSync(gitDir).isDirectory()) return; // repoPath is itself a worktree — skip
  } catch {
    return;
  }
  const infoDir = join(gitDir, 'info');
  mkdirSync(infoDir, { recursive: true });
  const excludePath = join(infoDir, 'exclude');
  const current = existsSync(excludePath) ? readFileSync(excludePath, 'utf8') : '';
  const wanted = ['.oahs/', MARKER_FILE];
  const have = new Set(current.split('\n').map((line) => line.trim()));
  const missing = wanted.filter((line) => !have.has(line));
  if (missing.length === 0) return;
  const prefix = current === '' || current.endsWith('\n') ? current : `${current}\n`;
  writeFileSync(excludePath, `${prefix}${missing.join('\n')}\n`, 'utf8');
}

function removeWorktree(dir: string, repoPath: string): void {
  try {
    git(['worktree', 'remove', '--force', dir], repoPath);
  } catch {
    try {
      rmSync(dir, { recursive: true, force: true });
      git(['worktree', 'prune'], repoPath);
    } catch {
      /* best effort — a leftover dir is re-detected as a stale worktree */
    }
  }
}

// ---------------------------------------------------------------------------
// Worktree marker (crash-recovery bookkeeping)
// ---------------------------------------------------------------------------

interface WorktreeMarker {
  workItemId: string;
  claimId: string;
  baseline: string;
  /** How many times an agent was invoked inside this worktree. */
  invocations: number;
}

function writeMarker(worktreeDir: string, marker: WorktreeMarker): void {
  writeFileSync(join(worktreeDir, MARKER_FILE), `${JSON.stringify(marker, null, 2)}\n`, 'utf8');
}

function readMarker(worktreeDir: string): WorktreeMarker | null {
  const path = join(worktreeDir, MARKER_FILE);
  if (!existsSync(path)) return null;
  try {
    const raw = JSON.parse(readFileSync(path, 'utf8')) as Partial<WorktreeMarker>;
    if (typeof raw.workItemId !== 'string' || typeof raw.baseline !== 'string') return null;
    return {
      workItemId: raw.workItemId,
      claimId: typeof raw.claimId === 'string' ? raw.claimId : '',
      baseline: raw.baseline,
      invocations: typeof raw.invocations === 'number' ? raw.invocations : 0,
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Spec file reading (frontmatter + HALT report)
// ---------------------------------------------------------------------------

interface SpecReport {
  status: string | null;
  blockingCondition: string | null;
  autoRunResult: string | null;
}

function splitFrontmatter(raw: string): { data: Record<string, unknown>; body: string } {
  if (!raw.startsWith('---')) return { data: {}, body: raw };
  const close = raw.indexOf('\n---', 3);
  if (close === -1) return { data: {}, body: raw };
  const firstNewline = raw.indexOf('\n');
  const block = raw.slice(firstNewline + 1, close);
  const bodyStart = raw.indexOf('\n', close + 1);
  const body = bodyStart === -1 ? '' : raw.slice(bodyStart + 1);
  let data: unknown = {};
  try {
    data = parseYaml(block);
  } catch {
    data = {};
  }
  const record =
    typeof data === 'object' && data !== null && !Array.isArray(data)
      ? (data as Record<string, unknown>)
      : {};
  return { data: record, body };
}

/** Verbatim '## Auto Run Result' section (heading included), up to the next H2. */
function extractAutoRunResult(body: string): string | null {
  const lines = body.split('\n');
  const start = lines.findIndex((line) => /^##\s+auto run result\s*$/i.test(line.trim()));
  if (start === -1) return null;
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (line !== undefined && /^##\s+/.test(line)) {
      end = i;
      break;
    }
  }
  return lines.slice(start, end).join('\n').trimEnd();
}

function readSpecReport(specAbsPath: string): SpecReport {
  if (!existsSync(specAbsPath)) {
    return { status: null, blockingCondition: null, autoRunResult: null };
  }
  const { data, body } = splitFrontmatter(readFileSync(specAbsPath, 'utf8'));
  const statusRaw = data['status'];
  const status =
    typeof statusRaw === 'string' ? statusRaw : statusRaw != null ? String(statusRaw) : null;
  const autoRunResult = extractAutoRunResult(body);
  let blockingCondition =
    typeof data['blocking_condition'] === 'string' ? data['blocking_condition'] : null;
  if (blockingCondition === null && autoRunResult !== null) {
    const match = /^blocking condition:\s*(.+)$/im.exec(autoRunResult);
    blockingCondition = match?.[1]?.trim() ?? null;
  }
  return { status, blockingCondition, autoRunResult };
}

/** Rewrite (or insert) the frontmatter `status:` line, preserving everything else. */
function setFrontmatterStatus(specAbsPath: string, status: string): void {
  const raw = readFileSync(specAbsPath, 'utf8');
  if (raw.startsWith('---')) {
    const close = raw.indexOf('\n---', 3);
    if (close !== -1) {
      const head = raw.slice(0, close);
      const rest = raw.slice(close);
      const replaced = /^status:.*$/m.test(head)
        ? head.replace(/^status:.*$/m, `status: ${status}`)
        : `${head}\nstatus: ${status}`;
      writeFileSync(specAbsPath, replaced + rest, 'utf8');
      return;
    }
  }
  writeFileSync(specAbsPath, `---\nstatus: ${status}\n---\n${raw}`, 'utf8');
}

function normalizeStatus(status: string | null): string | null {
  if (status === null) return null;
  const flat = status.trim().toLowerCase().replaceAll('-', '_');
  return flat === 'review' ? 'in_review' : flat;
}

/** dev-auto HALT blocking condition → BLOCKED_REASONS taxonomy (default 'other'). */
function mapBlockingCondition(condition: string | null): BlockedReason {
  if (condition === null) return 'other';
  const c = condition.toLowerCase();
  if (c.includes('review repair loop exceeded')) return 'review_non_convergence';
  if (c.includes('unclear intent')) return 'unclear_intent';
  if (c.includes('no stories.yaml')) return 'no_stories_yaml_found';
  if (c.includes('ambiguous story file match')) return 'ambiguous_story_file_match';
  if (c.includes('no subagents')) return 'no_subagents';
  return 'other';
}

function isRemoteError(error: unknown, name: string): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { errorName?: unknown }).errorName === name
  );
}

// ---------------------------------------------------------------------------
// Steps 6–9: measure, submit raw evidence, route by HALT status
// ---------------------------------------------------------------------------

interface FinishArgs {
  client: OahsClient;
  workItem: WorkItem;
  claim: Claim;
  /** Directory holding the run's files (fresh worktree, or the adopted one). */
  workDir: string;
  /** Spec file path relative to the repo root. */
  specRel: string;
  baseline: string;
  branch: string;
  repoPath: string;
  remote: string;
  allowlist: readonly string[];
  /** null when adopting (the agent was invoked by the crashed run). */
  agentExitCode: number | null;
  submit: (kind: Evidence['kind'], payload: Record<string, unknown>) => Promise<void>;
}

async function finishRun(args: FinishArgs): Promise<'in_review' | 'blocked'> {
  const { client, workItem, claim } = args;

  // 6 — parse HALT: frontmatter status + verbatim Auto Run Result.
  const spec = readSpecReport(join(args.workDir, args.specRel));
  await args.submit('halt_report', {
    status: spec.status,
    blockingCondition: spec.blockingCondition,
    autoRunResult: spec.autoRunResult,
    agentExitCode: args.agentExitCode,
  });

  // 7 — pinned verification only; the allowlist gates what ever gets executed.
  for (const command of workItem.pinnedVerification ?? []) {
    const binary = command.trim().split(/\s+/)[0] ?? '';
    if (!args.allowlist.includes(binary)) {
      await args.submit('test_run', { command, exitCode: -1, refused: true });
      continue;
    }
    const run = spawnSync('bash', ['-c', command], {
      cwd: args.workDir,
      encoding: 'utf8',
      timeout: 10 * 60 * 1000,
    });
    await args.submit('test_run', { command, exitCode: run.status ?? -1 });
  }

  // 8 — diff + push + commit evidence (measured, never judged here).
  const final = git(['rev-parse', 'HEAD'], args.workDir);
  const shortstat =
    final === args.baseline
      ? ''
      : git(['diff', '--shortstat', `${args.baseline}..${final}`], args.workDir);
  const filesChanged = Number(/(\d+) files? changed/.exec(shortstat)?.[1] ?? '0');
  await args.submit('git_diff', {
    baseline: args.baseline,
    final,
    filesChanged,
    nonEmpty: filesChanged > 0,
    branch: args.branch,
  });

  git(['push', args.remote, args.branch], args.repoPath);
  const lsRemote = git(['ls-remote', args.remote, `refs/heads/${args.branch}`], args.repoPath);
  await args.submit('commit', {
    sha: final,
    branch: args.branch,
    reachableOnRemote: lsRemote.includes(final),
  });

  // 9 — routing: the file says what the agent claims; the core decides.
  const status = normalizeStatus(spec.status);
  const token = claim.fencingToken;
  if (status === 'blocked') {
    await client.call('block_task', {
      workItemId: workItem.id,
      reason: mapBlockingCondition(spec.blockingCondition),
      fencingToken: token,
    });
    await client.call('release_claim', { claimId: claim.id, reason: 'run blocked' });
    return 'blocked';
  }
  const hasCommit = final !== args.baseline;
  if (status === 'done' || status === 'in_review' || (status === 'in_progress' && hasCommit)) {
    await client.call('advance_state', {
      workItemId: workItem.id,
      to: 'in_review',
      fencingToken: token,
    });
    await client.call('release_claim', { claimId: claim.id, reason: 'run finished' });
    return 'in_review';
  }
  // Agent exited non-zero with no readable HALT status, or an unknown status.
  await client.call('block_task', { workItemId: workItem.id, reason: 'other', fencingToken: token });
  await client.call('release_claim', {
    claimId: claim.id,
    reason: 'run failed without a readable HALT',
  });
  return 'blocked';
}

// ---------------------------------------------------------------------------
// Crash-recovery scan (step 10)
// ---------------------------------------------------------------------------

interface WorktreeScan {
  adoptable: { dir: string; head: string; baseline: string } | null;
  wrecked: string[];
}

function scanOldWorktrees(root: string, workItemId: string, specRel: string): WorktreeScan {
  const scan: WorktreeScan = { adoptable: null, wrecked: [] };
  if (!existsSync(root)) return scan;
  for (const name of readdirSync(root)) {
    const dir = join(root, name);
    const marker = readMarker(dir);
    if (marker === null || marker.workItemId !== workItemId) continue;
    let head: string | null = null;
    try {
      head = git(['rev-parse', 'HEAD'], dir);
    } catch {
      head = null;
    }
    const status = normalizeStatus(readSpecReport(join(dir, specRel)).status);
    const terminal = status === 'done' || status === 'in_review';
    if (scan.adoptable === null && head !== null && head !== marker.baseline && terminal) {
      scan.adoptable = { dir, head, baseline: marker.baseline };
    } else {
      scan.wrecked.push(dir);
    }
  }
  return scan;
}

// ---------------------------------------------------------------------------
// runOnce — one full dispatch cycle
// ---------------------------------------------------------------------------

export async function runOnce(options: RunnerOptions): Promise<RunOnceResult> {
  const { client } = options;
  const repoPath = resolve(options.repoPath);
  const remote = options.remote ?? 'origin';
  const allowlist = options.verificationAllowlist ?? DEFAULT_VERIFICATION_ALLOWLIST;

  // 1 — poll. Order of the API response = import order; take the first.
  // Fallback: an in_progress item with no live claim is a crashed dispatch.
  const listUnblocked = async (state: WorkItemState): Promise<WorkItem[]> =>
    (await client.call<WorkItem[]>('list_work_items', { state, claimable: true })).filter(
      (item) => item.blockedReason === null,
    );
  let candidates = await listUnblocked('ready_for_dev');
  if (candidates.length === 0) candidates = await listUnblocked('in_progress');
  const picked = candidates[0];
  if (picked === undefined) return { dispatched: false };

  let claim: Claim;
  try {
    claim = await client.call<Claim>('claim_task', { workItemId: picked.id });
  } catch (error) {
    if (isRemoteError(error, 'ConflictError')) {
      return { dispatched: false, details: `lost the claim race for ${picked.externalKey}` };
    }
    throw error;
  }

  const context = await client.call<{ workItem: WorkItem; entryState: WorkItemState }>(
    'get_task_context',
    { workItemId: picked.id },
  );
  const workItem = context.workItem;
  const specRel = join(options.specFolder, workItem.specPath);
  const branch = `claim/${claim.id}`;
  const worktreesRoot = join(repoPath, '.oahs', 'worktrees');
  const evidence: Evidence[] = [];

  const submit = async (kind: Evidence['kind'], payload: Record<string, unknown>): Promise<void> => {
    const item: Evidence = { kind, payload };
    evidence.push(item);
    await client.call('submit_evidence', {
      workItemId: workItem.id,
      evidence: item,
      fencingToken: claim.fencingToken,
    });
  };

  const base = {
    dispatched: true,
    workItemId: workItem.id,
    externalKey: workItem.externalKey,
    claimId: claim.id,
    evidence,
  } satisfies RunOnceResult;

  const finishArgs = {
    client,
    workItem,
    claim,
    specRel,
    branch,
    repoPath,
    remote,
    allowlist,
    submit,
  };

  // 10 — adopt (crash recovery): inspect leftover worktrees of this work item.
  const scan = scanOldWorktrees(worktreesRoot, workItem.id, specRel);
  if (scan.adoptable !== null) {
    const { dir, head, baseline } = scan.adoptable;
    // The new claim's branch points at the crashed run's finished HEAD; the
    // agent is NOT re-invoked — this is late evidence submission, not redo.
    git(['branch', branch, head], repoPath);
    // Entry-state alignment (no-op when the crashed run already advanced).
    await client.call('advance_state', {
      workItemId: workItem.id,
      to: 'in_progress',
      fencingToken: claim.fencingToken,
    });
    if (options.failpoint === 'before_report') {
      return { ...base, outcome: 'crashed', details: 'failpoint before_report (adopt path)' };
    }
    const outcome = await finishRun({
      ...finishArgs,
      workDir: dir,
      baseline,
      agentExitCode: null,
    });
    removeWorktree(dir, repoPath);
    return {
      ...base,
      outcome: outcome === 'in_review' ? 'adopted_in_review' : outcome,
      details: `adopted finished worktree ${dir}`,
    };
  }
  if (scan.wrecked.length > 0) {
    // A wrecked worktree (no commit past baseline / non-terminal status) is
    // cleaned; the item blocks stale_worktree for a human look.
    for (const dir of scan.wrecked) removeWorktree(dir, repoPath);
    await client.call('block_task', {
      workItemId: workItem.id,
      reason: 'stale_worktree',
      fencingToken: claim.fencingToken,
    });
    await client.call('release_claim', { claimId: claim.id, reason: 'stale worktree cleaned' });
    return { ...base, outcome: 'blocked', details: 'stale worktree cleaned; task blocked' };
  }

  // 2 — git plumbing: baseline, claim branch, claim-named worktree.
  const baseline = git(['rev-parse', 'HEAD'], repoPath);
  ensureGitExcludes(repoPath);
  mkdirSync(worktreesRoot, { recursive: true });
  const worktreeDir = join(worktreesRoot, claim.id);
  git(['worktree', 'add', '-b', branch, worktreeDir, baseline], repoPath);
  writeMarker(worktreeDir, {
    workItemId: workItem.id,
    claimId: claim.id,
    baseline,
    invocations: 0,
  });

  // 3 — mirror-on-dispatch: stamp frontmatter to the DB entry state so the
  // one moment the file is read as an entry state, it is fresh (§1.6).
  const specAbs = join(worktreeDir, specRel);
  if (existsSync(specAbs)) {
    setFrontmatterStatus(specAbs, ENTRY_STATUS[context.entryState] ?? context.entryState);
  }

  // 4 — advance into execution BEFORE the agent runs (DB is the entry state).
  await client.call('advance_state', {
    workItemId: workItem.id,
    to: 'in_progress',
    fencingToken: claim.fencingToken,
  });

  // 5 — invoke the coding agent.
  const command = options.agentCmd
    .replaceAll('{SPEC_FOLDER}', options.specFolder)
    .replaceAll('{STORY_ID}', workItem.externalKey)
    .replaceAll('{INVOKE_WITH}', workItem.invokeDevWith)
    .replaceAll('{WORKTREE}', worktreeDir);
  writeMarker(worktreeDir, {
    workItemId: workItem.id,
    claimId: claim.id,
    baseline,
    invocations: 1,
  });
  const invoked = spawnSync('bash', ['-lc', command], {
    cwd: worktreeDir,
    encoding: 'utf8',
    timeout: options.agentTimeoutMs ?? 30 * 60 * 1000,
    killSignal: 'SIGKILL',
    env: {
      ...process.env,
      ...options.agentEnv,
      OAHS_SPEC_FILE: specAbs,
      OAHS_STORY_ID: workItem.externalKey,
    },
  });
  const agentExitCode = invoked.status ?? -1;

  // TEST ONLY: simulate dying after the agent committed, before any report.
  // No evidence, no advance, no release — the claim stays live, the worktree
  // stays on disk; a later claim adopts or cleans it (step 10).
  if (options.failpoint === 'before_report') {
    return {
      ...base,
      outcome: 'crashed',
      details: 'failpoint before_report: died after the agent ran, before reporting',
    };
  }

  const outcome = await finishRun({
    ...finishArgs,
    workDir: worktreeDir,
    baseline,
    agentExitCode,
  });
  removeWorktree(worktreeDir, repoPath);
  return { ...base, outcome };
}

// ---------------------------------------------------------------------------
// workLoop — poll → runOnce → sleep
// ---------------------------------------------------------------------------

/** Run until stopped: poll → runOnce → sleep(pollMs). SIGINT exits cleanly. */
export async function workLoop(options: RunnerOptions & { once?: boolean }): Promise<void> {
  let stopped = false;
  let wake: (() => void) | undefined;
  const onSigint = (): void => {
    stopped = true;
    wake?.();
  };
  process.once('SIGINT', onSigint);
  try {
    for (;;) {
      const result = await runOnce(options);
      if (options.once === true || stopped) return;
      if (!result.dispatched) {
        await new Promise<void>((resolveSleep) => {
          wake = resolveSleep;
          setTimeout(resolveSleep, options.pollMs ?? 15_000);
        });
        wake = undefined;
        if (stopped) return;
      }
    }
  } finally {
    process.removeListener('SIGINT', onSigint);
  }
}
