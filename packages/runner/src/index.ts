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
 *
 * Also part of this interface: the runner's OWN git commands run with
 * client-side hooks disabled (HOOK_ISOLATION) and a git-specific env allowlist
 * (buildGitEnv), so neither a repo hook nor an agent-set config knob observes
 * the runner's credentials. Hooks still run for git the AGENT invokes itself.
 * OAHS_GIT_INHERIT_ENV=1 restores the full env for a BYO setup the allowlist
 * starves.
 */
// Phase 4 (roadmap §1.4): the deterministic document lint for non-code work.
export { lintDoc, type DocLintResult, type LintDocOptions } from './doclint.js';
// Phase 5 (roadmap §6): the teammate JOBS runtime — reply-only agent jobs
// served through the rails with memory recall/learning, zero lifecycle calls.
export { jobsLoop, runJobsOnce, type JobsOnceResult, type JobsRunnerOptions } from './jobs.js';
export { GitHubForge, ForgeError, type PullRequest, type FetchImpl } from './forge.js';

import { spawn, spawnSync } from 'node:child_process';
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
import { INTENT_HASH_ALGO, computeIntentHash, extractIntentRegion } from '@oahs/core';
import type { BlockedReason, Claim, Evidence, WorkItem, WorkItemState } from '@oahs/core';
import { GitHubForge, type FetchImpl } from './forge.js';

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
  /**
   * Only dispatch work items of this feature. Without it the runner claims
   * from EVERY backlog on the server — unsafe once a second project exists.
   */
  featureId?: string;
  /**
   * Only dispatch this PROJECT's work items (id or slug) — the Wave-2 way to
   * bind a runner: one project = one repo, every feature included.
   */
  projectId?: string;
  /** Poll interval for workLoop (ms). Default 15_000. */
  pollMs?: number;
  /**
   * Base backoff after a FAILED loop cycle (ms), doubling per consecutive
   * failure, capped at 32×. Default 5_000. A network blip must cost a pause,
   * never the process.
   */
  backoffMs?: number;
  /** Claim lease TTL passed to claim_task (ms). Default: the engine's 15 min. */
  claimTtlMs?: number;
  /**
   * Lease heartbeat interval DURING the agent run (ms). Default 60_000 —
   * comfortably inside the default TTL. D-G: a live runner never loses its
   * lease; a dead one frees it after TTL.
   */
  heartbeatMs?: number;
  /**
   * Progress sink — dispatches, outcomes, transcripts, cycle failures.
   * Default: timestamped lines on stderr. A healthy runner narrates; silence
   * meant "unattended overnight death was invisible" (Phase 7 Wave 1).
   */
  log?: (line: string) => void;
  /** Binaries pinned verification commands may start with. */
  verificationAllowlist?: string[];
  /** Git remote to push claim branches to. Default 'origin'. */
  remote?: string;
  /**
   * §10.1: build a client bound to a job-scoped token — the runner mints one
   * after claiming and routes ALL dispatch mutations through it (reads, poll,
   * claim, heartbeat, and minting stay on the static client). Absent → mutations
   * use the static client (BYO, unchanged). The CLI supplies
   * `(token) => makeClient({ baseUrl, token })`.
   */
  scopedClientFactory?: (token: string) => OahsClient;
  /**
   * §9.6: forge (GitHub) config for PR-on-dispatch. When set, the runner opens
   * (or finds) a PR from claim/<claimId> into `baseBranch` after the push and
   * submits `pr` evidence. Absent → BYO-without-forge keeps working unchanged.
   */
  forge?: {
    owner: string;
    repo: string;
    baseBranch: string;
    token: string;
    baseUrl?: string;
    fetchImpl?: FetchImpl;
  };
  /** TEST ONLY: die at a specific point to exercise crash recovery. */
  failpoint?: 'before_report';
  /** Max wall time for one agent invocation (ms). Default 30 minutes. */
  agentTimeoutMs?: number;
  /** Extra environment variables passed to the agent invocation. */
  agentEnv?: Record<string, string>;
  /**
   * Pass the runner's FULL process env to the agent child (roadmap §8). Off by
   * default: the child gets a minimal allowlist plus `agentEnv`, never the
   * runner's OAHS_TOKEN / OAHS_MODEL_* / SSH_AUTH_SOCK. Opt in for BYO setups
   * that rely on inherited configuration.
   */
  inheritEnv?: boolean;
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

/**
 * Hook isolation (roadmap §8) — prepended to EVERY runner-invoked git command.
 *
 * git is a trusted binary, but it executes CLIENT-SIDE HOOKS out of the
 * repository the agent has write access to, and a hook runs with the env of
 * whoever invoked git. So an agent that plants `.git/hooks/pre-push` (or points
 * `core.hooksPath` at its own script) reads whatever the runner's git holds the
 * next time the runner pushes. buildGitEnv keeps OAHS_TOKEN / OAHS_MODEL_* out
 * of that env, but push must still authenticate, so the ssh-agent socket is
 * there for a hook to take — which is why NOT RUNNING the hook is the half that
 * carries the weight, and stays load-bearing even after the env narrowed.
 *
 * Pointing hooksPath at a path with no hooks in it suppresses every client-side
 * hook, and a command-line `-c` outranks repo config — so this also defeats an
 * agent-set `core.hooksPath`. `core.fsmonitor` is a second hook (it names a
 * command git runs to enumerate changes) reached through repo config rather
 * than the hooks dir, so it needs its own override: the runner's own
 * `git diff --shortstat` runs inside the agent's worktree and would fire it.
 * The runner relies on no repo hook of its own.
 *
 * `protocol.ext.allow=never` belongs here for the same reason: an `ext::` remote
 * URL makes git run its argument as a command. git already blocks ext:: by
 * default, but the DEFAULT is repo-config-overridable — an agent that writes
 * `protocol.ext.allow=always` next to an `ext::` remote gets arbitrary exec, so
 * the runner pins the refusal instead of relying on the default. The runner
 * never speaks ext::.
 *
 * NOT closed by this: repo-local config holds further command knobs whose
 * execution survives (filter.<n>.smudge, core.sshCommand, credential.helper,
 * remote.<n>.uploadpack/receivepack, core.gitProxy), and `url.<x>.insteadOf`
 * can redirect the push itself. buildGitEnv below is the other half — it takes
 * the SECRETS off the table when one of them fires.
 *
 * Also not closed, and a cost of the hooks pin rather than a gap in it: hooks
 * stay off for `push` too, and git-lfs's upload path IS its pre-push hook — so
 * against an LFS repo the runner would push pointers whose objects never
 * uploaded, exit 0. Re-enabling hooks on push is not the fix: push is the one
 * call that carries the ssh-agent socket, so it would hand an agent-planted
 * pre-push hook the operator's live signing identity.
 */
const HOOK_ISOLATION = [
  '-c', 'core.hooksPath=/dev/null',
  '-c', 'core.fsmonitor=false',
  '-c', 'protocol.ext.allow=never',
];

/**
 * The env for the runner's OWN git commands (roadmap §8) — the sibling of
 * buildAgentEnv, and the other half of HOOK_ISOLATION.
 *
 * HOOK_ISOLATION stops agent-planted HOOKS from running. It cannot stop every
 * knob: repo-local `.git/config` is agent-writable (worktrees share the common
 * dir) and still names commands git will execute — a `filter.<n>.smudge` bound
 * by a committed `.gitattributes` fires on the runner's own `worktree add`;
 * `core.sshCommand` and `credential.helper` fire on push. Those run with the env
 * of whoever invoked git, so today they read the runner's OAHS_TOKEN and
 * OAHS_MODEL_* straight out of process.env. This allowlist takes that away: the
 * knob still fires, but inherits no secret from the RUNNER'S ENV.
 *
 * Be clear about what that is worth. A knob that fires is arbitrary code running
 * as the runner's uid, and it can read anything that uid can — including
 * $HOME/.oahs/config.json, which under the supervisor holds EVERY named identity
 * (po/dev/admin), and an unencrypted ~/.ssh/id_* it can sign with. Dropping HOME
 * would not fix that (the code resolves the home dir from getpwuid regardless)
 * and would break git's config discovery for nothing. So this is defence in
 * depth against the env vector, NOT a containment boundary. Real containment is
 * a sandboxed agent (roadmap §10).
 *
 * Deny-by-default, like AGENT_ENV_ALLOWLIST — but git's needs are wider than a
 * shell's, and every entry below is here because dropping it BREAKS
 * authenticated push, usually SILENTLY (git skips config it cannot find rather
 * than erroring). Do not trim this list without testing a real ssh/https push.
 */
const GIT_ENV_ALLOWLIST = [
  // Execution + config discovery. Without HOME git silently skips ~/.gitconfig,
  // taking the operator's credential.helper and url.*.insteadOf with it.
  'PATH', 'HOME', 'USER', 'LOGNAME',
  'XDG_CONFIG_HOME', 'XDG_CACHE_HOME', // $XDG_CONFIG_HOME/git/config; credential-cache socket
  'TMPDIR', 'TEMP', 'TMP', 'TZ', 'TERM',
  // Passphrase prompting for operators who use an askpass helper over an agent.
  'SSH_ASKPASS', 'SSH_ASKPASS_REQUIRE', 'DISPLAY',
  // Corporate proxies. Case matters: libcurl reads lowercase `http_proxy` ONLY
  // (a CGI-safety rule), and honours either case for the rest — so carry both.
  'http_proxy', 'https_proxy', 'all_proxy', 'no_proxy',
  'HTTP_PROXY', 'HTTPS_PROXY', 'ALL_PROXY', 'NO_PROXY',
  // Private CAs behind TLS-inspecting proxies. Apple git ignores these three in
  // favour of GIT_SSL_CAINFO (carried by the GIT_ prefix rule), but the Linux
  // libcurl build the Dockerfile ships resolves CAs differently — they are inert
  // file paths, so carrying them costs nothing and hedges the platform we cannot
  // test from here.
  'SSL_CERT_FILE', 'SSL_CERT_DIR', 'CURL_CA_BUNDLE',
  // Commit signing, for an operator with commit.gpgsign on globally.
  'GNUPGHOME', 'GPG_TTY',
] as const;

/**
 * GIT_* is passed through as a PREFIX: those vars are operator configuration
 * (GIT_SSH_COMMAND pins a key, GIT_SSL_CAINFO a private CA, GIT_CONFIG_GLOBAL
 * the config a container bakes in), and the agent has no write path into the
 * runner's environment — a child cannot mutate its parent's env, and the runner
 * loads no env files.
 *
 * These are the exception: they are per-invocation REPOSITORY POINTERS, not
 * daemon policy, and they silently retarget the very calls the runner uses to
 * attest the agent's work. A stray GIT_DIR makes `git -C <dir> rev-parse HEAD`
 * report a DIFFERENT repository's HEAD — the runner would attest the wrong tree.
 * The runner always says which repo it means via cwd.
 */
const GIT_ENV_POINTER_DENYLIST = new Set([
  'GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_OBJECT_DIRECTORY',
  'GIT_ALTERNATE_OBJECT_DIRECTORIES', 'GIT_COMMON_DIR', 'GIT_NAMESPACE',
  'GIT_CEILING_DIRECTORIES', 'GIT_DISCOVERY_ACROSS_FILESYSTEM',
  'GIT_INDEX_VERSION', 'GIT_ATTR_SOURCE', 'GIT_CONFIG',
]);

/**
 * The credentials that CANNOT be dropped — push authenticates with them. So they
 * are granted per-call instead of globally: a subcommand that reaches no remote
 * has no business holding one, which keeps them off the reproduced `worktree
 * add` smudge-filter path. Both entries here are brokers, not strings: with the
 * ssh socket a filter SIGNS as the operator, and over the D-Bus session bus it
 * reads the whole keyring — strictly worse prizes than any token.
 *
 * Listed by LOCAL subcommand rather than by remote one, so that anything
 * unrecognised — a new call site, an arg shape this misreads — keeps them and
 * pushes fine. A miss here must never break authentication; the test suite
 * pushes over file:// and would not catch it.
 */
const GIT_LOCAL_ONLY_SUBCOMMANDS = new Set(['rev-parse', 'diff', 'worktree', 'branch']);
const GIT_REMOTE_AUTH_ENV = [
  'SSH_AUTH_SOCK', 'SSH_AGENT_PID',
  // Secret-Service credential helpers (libsecret, GCM secretservice, KWallet)
  // reach the keyring over the session bus, found via $DBUS_SESSION_BUS_ADDRESS
  // or $XDG_RUNTIME_DIR/bus. Unset outside a login session, so this is a no-op
  // in a container and restores https push on a desktop-session host.
  'DBUS_SESSION_BUS_ADDRESS', 'XDG_RUNTIME_DIR',
] as const;

/** First non-option token: the subcommand. `-c`/`-C` swallow the next token. */
function gitSubcommand(args: string[]): string | undefined {
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === undefined) break;
    if (arg === '-c' || arg === '-C') {
      i += 1; // skip its value
      continue;
    }
    if (!arg.startsWith('-')) return arg;
  }
  return undefined;
}

export function buildGitEnv(args: string[]): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {};
  // Escape hatch for a BYO setup this allowlist starves (a vendor SSO helper, a
  // credential helper reading env of its own choosing). Mirrors --inherit-env's
  // intent; an env var rather than a RunnerOptions field because git() is
  // module-level plumbing with no access to the options.
  if (process.env['OAHS_GIT_INHERIT_ENV'] === '1') {
    Object.assign(env, process.env);
  } else {
    for (const key of GIT_ENV_ALLOWLIST) {
      const value = process.env[key];
      if (value !== undefined) env[key] = value;
    }
    for (const [key, value] of Object.entries(process.env)) {
      if (!key.startsWith('GIT_') || GIT_ENV_POINTER_DENYLIST.has(key)) continue;
      env[key] = value;
    }
    const subcommand = gitSubcommand(args);
    if (subcommand === undefined || !GIT_LOCAL_ONLY_SUBCOMMANDS.has(subcommand)) {
      for (const key of GIT_REMOTE_AUTH_ENV) {
        const value = process.env[key];
        if (value !== undefined) env[key] = value;
      }
    }
  }
  // Forced in BOTH paths — these are correctness, not secrecy, so the escape
  // hatch does not relax them. The runner is headless: an inherited
  // GIT_TERMINAL_PROMPT=1 lets git block forever on a credential prompt, hanging
  // the claim until its lease expires. And finishRun parses git's ENGLISH output
  // (`/(\d+) files? changed/` on --shortstat), which a localized git would break
  // — mis-measuring the agent's diff into the evidence record.
  env['GIT_TERMINAL_PROMPT'] = '0';
  env['LC_ALL'] = 'C';
  return env;
}

/** Run a git command; throws on non-zero exit; returns trimmed stdout. */
export function git(args: string[], cwd: string): string {
  const result = spawnSync('git', [...HOOK_ISOLATION, ...args], {
    cwd,
    encoding: 'utf8',
    env: buildGitEnv(args),
  });
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

/** Default progress sink: timestamped lines on stderr (stdout stays clean). */
export function defaultRunnerLog(line: string): void {
  process.stderr.write(`[oahs-runner ${new Date().toISOString()}] ${line}\n`);
}

/**
 * Announce this worker process to the spine (Wave 3 visibility) and keep a
 * liveness heartbeat going. SOFT everywhere: an older server without the
 * command, or a registry lost to a restart, must never take the loop down —
 * visibility is additive, never load-bearing. Returns a stop function.
 */
export function announceRunner(
  client: OahsClient,
  input: {
    mode: 'coding' | 'jobs';
    projectId?: string;
    repoPath?: string;
    log: (line: string) => void;
    intervalMs?: number;
  },
): { stop: () => void; ready: Promise<void> } {
  let runnerId: string | undefined;
  const announce = async (): Promise<void> => {
    const registered = await client.call<{ runnerId: string }>('runner_announce', {
      mode: input.mode,
      ...(input.projectId !== undefined ? { projectId: input.projectId } : {}),
      ...(input.repoPath !== undefined ? { repoPath: input.repoPath } : {}),
      pid: process.pid,
    });
    runnerId = registered.runnerId;
    input.log(`announced as ${registered.runnerId} (${input.mode})`);
  };
  // `ready` resolves on success OR failure — announcing is soft, but callers
  // can await it so short-lived loops (--once) are still visible.
  const ready = announce().catch(() => {
    input.log('runner announce unavailable (older server?) — continuing without visibility');
  });
  const timer = setInterval(() => {
    void (async () => {
      if (runnerId === undefined) return announce();
      try {
        await client.call('runner_heartbeat', { runnerId });
      } catch {
        // Registry lost (server restart) — re-announce next tick.
        runnerId = undefined;
      }
    })().catch(() => {
      /* visibility stays soft */
    });
  }, input.intervalMs ?? 30_000);
  return { stop: () => clearInterval(timer), ready };
}

/**
 * Async agent invocation (replaces spawnSync): the event loop stays free so
 * lease heartbeats can fire DURING the run (D-G). SIGKILL on timeout keeps
 * the old contract (status null → -1 at the call site).
 */
/**
 * The environment an agent child inherits (roadmap §8). By default it is a small
 * ALLOWLIST — enough for a shell and a coding CLI to run — plus the caller's
 * explicit `agentEnv` and the dispatch variables. Secrets the runner holds
 * (OAHS_TOKEN, OAHS_MODEL_*, SSH_AUTH_SOCK, …) are NOT passed down: a compromised
 * or curious agent gets no free credential. `inheritEnv` restores the full
 * process env for BYO setups that rely on it — opt-in, never the default.
 */
const AGENT_ENV_ALLOWLIST = [
  'PATH', 'HOME', 'SHELL', 'USER', 'LOGNAME', 'LANG', 'LC_ALL', 'LC_CTYPE', 'TZ', 'TERM', 'TMPDIR', 'TEMP',
] as const;

export function buildAgentEnv(input: {
  agentEnv?: Record<string, string> | undefined;
  extra: Record<string, string>;
  inheritEnv?: boolean | undefined;
}): NodeJS.ProcessEnv {
  const base: NodeJS.ProcessEnv = {};
  if (input.inheritEnv === true) {
    Object.assign(base, process.env);
  } else {
    for (const key of AGENT_ENV_ALLOWLIST) {
      const value = process.env[key];
      if (value !== undefined) base[key] = value;
    }
  }
  return { ...base, ...input.agentEnv, ...input.extra };
}

function runAgentCommand(
  command: string,
  opts: { cwd: string; timeoutMs: number; env: NodeJS.ProcessEnv },
): Promise<{ status: number | null; stdout: string; stderr: string }> {
  return new Promise((resolvePromise) => {
    const child = spawn('bash', ['-lc', command], { cwd: opts.cwd, env: opts.env });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString('utf8');
    });
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf8');
    });
    const killer = setTimeout(() => child.kill('SIGKILL'), opts.timeoutMs);
    child.on('error', () => {
      clearTimeout(killer);
      resolvePromise({ status: null, stdout, stderr });
    });
    child.on('close', (code) => {
      clearTimeout(killer);
      resolvePromise({ status: code, stdout, stderr });
    });
  });
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
  /** Teed agent transcript path — absent on the adopt path (no fresh run). */
  agentLogPath?: string;
  /**
   * The env for the pinned-verification children (§8). Verification commands
   * (`npm test`, `pytest`, …) execute AGENT-AUTHORED code in the worktree, so
   * they get the SAME minimal, secret-free env as the agent itself — never the
   * runner's full process.env.
   */
  verifyEnv: NodeJS.ProcessEnv;
  /** §9.6: PR-on-dispatch config (forge client + base branch + title), when a project has a forge. */
  forge?: { client: GitHubForge; baseBranch: string; title: string };
  /** §10.1: the job-scoped client for dispatch mutations (block/release/advance). */
  dispatch: Dispatch;
  submit: (kind: Evidence['kind'], payload: Record<string, unknown>) => Promise<void>;
}

async function finishRun(args: FinishArgs): Promise<'in_review' | 'blocked'> {
  const { client, dispatch, workItem, claim } = args;

  // 6 — parse HALT: frontmatter status + verbatim Auto Run Result.
  const spec = readSpecReport(join(args.workDir, args.specRel));
  await args.submit('halt_report', {
    status: spec.status,
    blockingCondition: spec.blockingCondition,
    autoRunResult: spec.autoRunResult,
    agentExitCode: args.agentExitCode,
    ...(args.agentLogPath !== undefined ? { agentLogPath: args.agentLogPath } : {}),
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
      env: args.verifyEnv,
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

  // 8.5 — §9.6: open (or find) the PR from the pushed claim branch and record it
  // as `pr` evidence. Skip-with-log on any forge error — a forge hiccup must not
  // fail an otherwise-good run, and a BYO project with no forge never gets here.
  if (args.forge !== undefined && final !== args.baseline) {
    try {
      // Dedup on the SPINE's evidence (item-keyed), not the branch: after a
      // crash + adoption the claim branch is fresh, so findPrByHead alone can't
      // see a PR a prior run already opened. If `pr opened` evidence exists, the
      // PR is already there — don't open a second one.
      const priorOpened = (
        await args.client.call<Evidence[]>('list_evidence', { workItemId: workItem.id })
      ).some((e) => e.kind === 'pr' && e.payload['action'] === 'opened');
      if (!priorOpened) {
        const existing = await args.forge.client.findPrByHead({ head: args.branch });
        const pr =
          existing ??
          (await args.forge.client.openPr({
            head: args.branch,
            base: args.forge.baseBranch,
            title: args.forge.title,
          }));
        await args.submit('pr', { action: 'opened', number: pr.number, url: pr.url });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      defaultRunnerLog(`pr open skipped for ${workItem.externalKey}: ${message}`);
    }
  }

  // 9 — routing: the file says what the agent claims; the core decides.
  const status = normalizeStatus(spec.status);
  const token = claim.fencingToken;
  if (status === 'blocked') {
    await dispatch.call('block_task', {
      workItemId: workItem.id,
      reason: mapBlockingCondition(spec.blockingCondition),
      fencingToken: token,
    });
    await dispatch.call('release_claim', { claimId: claim.id, reason: 'run blocked' });
    return 'blocked';
  }
  const hasCommit = final !== args.baseline;
  if (status === 'done' || status === 'in_review' || (status === 'in_progress' && hasCommit)) {
    await dispatch.call('advance_state', {
      workItemId: workItem.id,
      to: 'in_review',
      fencingToken: token,
    });
    await dispatch.call('release_claim', { claimId: claim.id, reason: 'run finished' });
    return 'in_review';
  }
  // Agent exited non-zero with no readable HALT status, or an unknown status.
  await dispatch.call('block_task', { workItemId: workItem.id, reason: 'other', fencingToken: token });
  await dispatch.call('release_claim', {
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

/** True when a remote error is the §9.3 intent-drift guard (not another guard). */
function isIntentChanged(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { errorName?: unknown }).errorName === 'GuardFailedError' &&
    typeof (error as { message?: unknown }).message === 'string' &&
    (error as { message: string }).message.includes('intent_changed')
  );
}

/**
 * §10.1: a client for the claim's DISPATCH MUTATIONS, backed by a job-scoped
 * token when a factory is provided (else the static client). `refresh()` mints
 * a fresh scoped token (via the static client's mint_claim_token) so a lease
 * renewed by heartbeats keeps a live credential — the runner calls it on each
 * heartbeat. A mint failure keeps the current client (non-fatal).
 */
interface Dispatch {
  call: OahsClient['call'];
  refresh(): Promise<void>;
}

function makeDispatch(
  staticClient: OahsClient,
  claimId: string,
  factory: ((token: string) => OahsClient) | undefined,
): Dispatch {
  let current: OahsClient = staticClient;
  return {
    call: ((command, input) => current.call(command, input)) as OahsClient['call'],
    refresh: async () => {
      if (factory === undefined) {
        current = staticClient;
        return;
      }
      try {
        const { token } = await staticClient.call<{ token: string; expiresAt: number }>(
          'mint_claim_token',
          { claimId },
        );
        current = factory(token);
      } catch {
        /* keep the current client — a mint hiccup must not fail the dispatch */
      }
    },
  };
}

// ---------------------------------------------------------------------------
// runOnce — one full dispatch cycle
// ---------------------------------------------------------------------------

export async function runOnce(options: RunnerOptions): Promise<RunOnceResult> {
  const { client } = options;
  const log = options.log ?? defaultRunnerLog;
  const repoPath = resolve(options.repoPath);
  const remote = options.remote ?? 'origin';
  const allowlist = options.verificationAllowlist ?? DEFAULT_VERIFICATION_ALLOWLIST;

  // 1 — poll. Order of the API response = import order; take the first.
  // Fallback: an in_progress item with no live claim is a crashed dispatch.
  const listUnblocked = async (state: WorkItemState): Promise<WorkItem[]> =>
    (
      await client.call<WorkItem[]>('list_work_items', {
        state,
        claimable: true,
        ...(options.featureId !== undefined ? { featureId: options.featureId } : {}),
        ...(options.projectId !== undefined ? { projectId: options.projectId } : {}),
      })
    ).filter((item) => item.blockedReason === null);
  let candidates = await listUnblocked('ready_for_dev');
  if (candidates.length === 0) candidates = await listUnblocked('in_progress');
  const picked = candidates[0];
  if (picked === undefined) return { dispatched: false };

  let claim: Claim;
  try {
    claim = await client.call<Claim>('claim_task', {
      workItemId: picked.id,
      ...(options.claimTtlMs !== undefined ? { ttlMs: options.claimTtlMs } : {}),
    });
  } catch (error) {
    if (isRemoteError(error, 'ConflictError')) {
      log(`lost the claim race for ${picked.externalKey}`);
      return { dispatched: false, details: `lost the claim race for ${picked.externalKey}` };
    }
    throw error;
  }
  log(`dispatch ${picked.externalKey} (claim ${claim.id})`);

  // §10.1: mint a job-scoped token for the dispatch MUTATIONS. Reads, poll,
  // claim, heartbeat and minting stay on the static client.
  const dispatch = makeDispatch(client, claim.id, options.scopedClientFactory);
  await dispatch.refresh();

  // D-G: keep the lease alive for the WHOLE dispatch (worktree plumbing,
  // agent run, evidence, push). A dead runner stops heartbeating and its
  // lease frees itself after TTL; heartbeat failures are logged, never fatal
  // — the fencing token still guards every mutation. Each heartbeat also
  // re-mints the scoped token so a renewed lease keeps a live credential (§10.1).
  const heartbeatTimer = setInterval(() => {
    void client
      .call('heartbeat', { claimId: claim.id })
      .then(() => dispatch.refresh())
      .catch((error: unknown) => {
        const err = error instanceof Error ? error : new Error(String(error));
        log(`heartbeat failed for claim ${claim.id}: ${err.message}`);
      });
  }, options.heartbeatMs ?? 60_000);

  try {
    return await runClaimed();
  } finally {
    clearInterval(heartbeatTimer);
  }

  // eslint-disable-next-line no-inner-declarations
  async function runClaimed(): Promise<RunOnceResult> {

  const context = await client.call<{ workItem: WorkItem; entryState: WorkItemState }>(
    'get_task_context',
    { workItemId: claim.workItemId },
  );
  const workItem = context.workItem;
  const specRel = join(options.specFolder, workItem.specPath);
  const branch = `claim/${claim.id}`;
  const worktreesRoot = join(repoPath, '.oahs', 'worktrees');
  const evidence: Evidence[] = [];

  const submit = async (kind: Evidence['kind'], payload: Record<string, unknown>): Promise<void> => {
    const item: Evidence = { kind, payload };
    evidence.push(item);
    await dispatch.call('submit_evidence', {
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
    dispatch,
    workItem,
    claim,
    specRel,
    branch,
    repoPath,
    remote,
    allowlist,
    // Verification runs agent-authored code — same secret-free env as the agent.
    verifyEnv: buildAgentEnv({
      agentEnv: options.agentEnv,
      inheritEnv: options.inheritEnv,
      extra: {},
    }),
    // §9.6: a forge client for PR-on-dispatch, when the project has one.
    ...(options.forge !== undefined
      ? {
          forge: {
            client: new GitHubForge({
              owner: options.forge.owner,
              repo: options.forge.repo,
              token: options.forge.token,
              ...(options.forge.baseUrl !== undefined ? { baseUrl: options.forge.baseUrl } : {}),
              ...(options.forge.fetchImpl !== undefined ? { fetchImpl: options.forge.fetchImpl } : {}),
            }),
            baseBranch: options.forge.baseBranch,
            title: `${workItem.externalKey}: ${workItem.title}`,
          },
        }
      : {}),
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
    await dispatch.call('advance_state', {
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
    log(`${workItem.externalKey} → ${outcome === 'in_review' ? 'adopted_in_review' : outcome} (adopted ${dir})`);
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
    await dispatch.call('block_task', {
      workItemId: workItem.id,
      reason: 'stale_worktree',
      fencingToken: claim.fencingToken,
    });
    await dispatch.call('release_claim', { claimId: claim.id, reason: 'stale worktree cleaned' });
    log(`${workItem.externalKey} → blocked (stale worktree cleaned)`);
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

  // 3.5 — §9.3: submit the frozen-region intent hash the measuring side sees
  // NOW, so the engine's intent_unchanged guard on the next advance can compare
  // it against the hash pinned at spec approval. No <intent-contract> region →
  // nothing submitted (the guard treats absence as no-drift). Frontmatter
  // stamping above never touches the tagged region, so read order is safe.
  if (existsSync(specAbs)) {
    const region = extractIntentRegion(readFileSync(specAbs, 'utf8'));
    if (region !== null) {
      // Through `submit` so it lands in RunOnceResult.evidence like every other
      // kind (and carries the claim's fencing token).
      await submit('intent_hash', { algo: INTENT_HASH_ALGO, hash: computeIntentHash(region) });
    }
  }

  // 4 — advance into execution BEFORE the agent runs (DB is the entry state).
  // §9.3: if the frozen intent drifted since approval the engine refuses here.
  // Clean up and block `unclear_intent` for a human to renegotiate — then
  // `oahs intent rebaseline` + unblock re-opens dispatch. Same shape as the
  // stale_worktree recovery above (block + release, never a runner crash).
  try {
    await dispatch.call('advance_state', {
      workItemId: workItem.id,
      to: 'in_progress',
      fencingToken: claim.fencingToken,
    });
  } catch (error) {
    if (isIntentChanged(error)) {
      removeWorktree(worktreeDir, repoPath);
      await dispatch.call('block_task', {
        workItemId: workItem.id,
        reason: 'unclear_intent',
        fencingToken: claim.fencingToken,
      });
      await dispatch.call('release_claim', { claimId: claim.id, reason: 'intent contract drifted since approval' });
      log(`${workItem.externalKey} → blocked (intent contract drifted since approval)`);
      return { ...base, outcome: 'blocked', details: 'intent contract drifted since approval' };
    }
    throw error;
  }

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
  const invoked = await runAgentCommand(command, {
    cwd: worktreeDir,
    timeoutMs: options.agentTimeoutMs ?? 30 * 60 * 1000,
    env: buildAgentEnv({
      agentEnv: options.agentEnv,
      inheritEnv: options.inheritEnv,
      extra: { OAHS_SPEC_FILE: specAbs, OAHS_STORY_ID: workItem.externalKey },
    }),
  });
  const agentExitCode = invoked.status ?? -1;

  // Tee the agent transcript OUTSIDE the worktree (which is removed on
  // success) so a run stays auditable after the fact. `.oahs/` is already in
  // the repo's git excludes.
  const logsDir = join(repoPath, '.oahs', 'logs');
  mkdirSync(logsDir, { recursive: true });
  const agentLogPath = join(logsDir, `${claim.id}.log`);
  writeFileSync(
    agentLogPath,
    [
      `# oahs agent transcript — story ${workItem.externalKey}, claim ${claim.id}`,
      `# command: ${command}`,
      `# exit: ${agentExitCode}`,
      '--- stdout ---',
      invoked.stdout ?? '',
      '--- stderr ---',
      invoked.stderr ?? '',
      '',
    ].join('\n'),
    'utf8',
  );
  log(`agent exited ${agentExitCode} for ${workItem.externalKey} (transcript: ${agentLogPath})`);

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
    agentLogPath,
  });
  removeWorktree(worktreeDir, repoPath);
  log(`${workItem.externalKey} → ${outcome}`);
  return { ...base, outcome };
  }
}

// ---------------------------------------------------------------------------
// workLoop — poll → runOnce → sleep
// ---------------------------------------------------------------------------

/**
 * Run until stopped: poll → runOnce → sleep(pollMs). SIGINT exits cleanly.
 * A FAILED cycle (network blip, git hiccup) is logged and backed off, never
 * fatal — an unattended runner must survive the night. `--once` keeps script
 * semantics: the error propagates.
 */
export async function workLoop(
  options: RunnerOptions & {
    once?: boolean;
    /** TEST ONLY: extra loop-exit condition, checked after every cycle. */
    stopWhen?: () => boolean;
  },
): Promise<void> {
  const log = options.log ?? defaultRunnerLog;
  const opts = { ...options, log };
  const backoffMs = options.backoffMs ?? 5_000;
  const announcer = announceRunner(options.client, {
    mode: 'coding',
    ...(options.projectId !== undefined ? { projectId: options.projectId } : {}),
    repoPath: resolve(options.repoPath),
    log,
  });
  await announcer.ready;
  let stopped = false;
  let wake: (() => void) | undefined;
  const onSigint = (): void => {
    stopped = true;
    wake?.();
  };
  const sleep = async (ms: number): Promise<void> => {
    await new Promise<void>((resolveSleep) => {
      wake = resolveSleep;
      setTimeout(resolveSleep, ms);
    });
    wake = undefined;
  };
  process.once('SIGINT', onSigint);
  let consecutiveFailures = 0;
  try {
    for (;;) {
      let result;
      try {
        result = await runOnce(opts);
        consecutiveFailures = 0;
      } catch (error) {
        if (options.once === true) throw error;
        consecutiveFailures += 1;
        const err = error instanceof Error ? error : new Error(String(error));
        const delay = Math.min(backoffMs * 2 ** (consecutiveFailures - 1), backoffMs * 32);
        log(
          `cycle failed (${consecutiveFailures} in a row): ${err.name}: ${err.message} — retrying in ${delay}ms`,
        );
        if (stopped || options.stopWhen?.() === true) return;
        await sleep(delay);
        if (stopped) return;
        continue;
      }
      if (options.once === true || stopped || options.stopWhen?.() === true) return;
      if (!result.dispatched) {
        await sleep(options.pollMs ?? 15_000);
        if (stopped) return;
      }
    }
  } finally {
    announcer.stop();
    process.removeListener('SIGINT', onSigint);
  }
}
