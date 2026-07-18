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
 *  8. verify the push config matches the pre-agent snapshot, then push branch →
 *     git_diff + commit evidence (remote reachability measured); a redirected
 *     target, an added command knob, or a git-lfs repo is refused, not pushed (§8)
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
import { randomBytes } from 'node:crypto';
import {
  chmodSync,
  createWriteStream,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
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
  failpoint?: 'before_report' | 'after_durability_push';
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
  /**
   * §10.2 — ASSIGNED dispatch: run this exact, pre-claimed item instead of
   * polling and claiming. The dispatcher (which holds the static token) claims
   * on the host, mints a scoped token, reads the task context, and hands the
   * container a complete assignment; the container then runs `oahs work --once`
   * under a MUTATION-ONLY scoped token (`client` here IS that token). No poll,
   * no `claim_task`, no `get_task_context` — every spine read is pre-supplied,
   * so the run needs nothing outside the §10.1 dispatch allowlist. The forge PR
   * path (which reads `list_evidence`) is left to the dispatcher and stays off
   * here.
   */
  assignment?: {
    claim: Claim;
    workItem: WorkItem;
    entryState: WorkItemState;
  };
  /**
   * §10.3 — a CLAIM-SCOPED push credential for BYO `oahs work`: presented via a
   * per-dispatch GIT_ASKPASS broker for the claim-branch push only, and never
   * handed to the agent child. Absent → the operator's ambient credential
   * helper, unchanged. Under `oahs dispatch` this stays unset: the container is
   * given NO push credential and the dispatcher pushes on the host instead.
   */
  pushCredential?: PushCredential;
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

/**
 * Run a git command; throws on non-zero exit; returns trimmed stdout.
 *
 * `envExtra` (§10.3) is merged OVER the built env, for values that are
 * per-CALL rather than operator configuration — the claim-scoped push askpass
 * and its credential. It is deliberately not sourced from process.env: the
 * credential exists only for the one push that presents it.
 */
export function git(args: string[], cwd: string, envExtra?: NodeJS.ProcessEnv): string {
  const result = spawnSync('git', [...HOOK_ISOLATION, ...args], {
    cwd,
    encoding: 'utf8',
    env: { ...buildGitEnv(args), ...envExtra },
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      `git ${args.join(' ')} failed with exit ${String(result.status)}: ${result.stderr.trim()}`,
    );
  }
  return result.stdout.trim();
}

/** `git config --get-regexp <re>`, tolerant of exit 1 (no match); one
 *  `key value` line per hit, across every scope (repo/worktree/include/global). */
function gitConfigMatches(regex: string, cwd: string): string[] {
  const args = [...HOOK_ISOLATION, 'config', '--get-regexp', regex];
  const result = spawnSync('git', args, { cwd, encoding: 'utf8', env: buildGitEnv(args) });
  if (result.status !== 0) return [];
  return result.stdout
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

/**
 * Repo-config keys that decide WHERE or HOW `git push`/`git ls-remote` behave
 * beyond the URL — each agent-writable and each invisible to the URL set. Read
 * as effective values (`--get-regexp`, all scopes), so an include.path'd or
 * worktree-scoped value is seen too. Verified: each closes with detection.
 *
 *  - Transport redirect (diverts the bytes, URL unchanged): `http.*` (proxy and
 *    its per-url form; sslVerify, whose disabling enables a MITM proxy),
 *    `remote.<n>.proxy`, `core.gitProxy`.
 *  - Command execution at push/ls-remote time (RCE holding the ssh-agent socket
 *    the agent's own env is denied): `core.sshCommand`, `core.askPass` (runs on
 *    an https 401, even under GIT_TERMINAL_PROMPT=0), `credential.*` (helper),
 *    `remote.<n>.uploadpack` / `receivepack`.
 *
 * A denylist, so best-effort by nature: it names the knobs known to fire on the
 * runner's push/ls-remote (`core.gitProxy` also covers the git:// proxy RCE). A
 * knob outside it is the §10 sandbox's job. Reading the fingerprint itself never
 * fires any of them — get-url and config are local, no network.
 */
// One alternation, so the fingerprint costs a SINGLE `git config` subprocess
// rather than one per key. That matters: git() is spawnSync (blocks the event
// loop), and finishRun already runs several before the push while the lease
// heartbeat needs the loop free — fewer blocking calls, less heartbeat jitter.
const PUSH_CONFIG_KEY_REGEX = (remoteRe: string): string =>
  `^(http\\.|remote\\.${remoteRe}\\.(proxy|uploadpack|receivepack)|core\\.(gitproxy|sshcommand|askpass)|credential\\.)`;

/**
 * A fingerprint of everything that decides WHERE and HOW `git push <remote>`
 * lands — captured before the agent runs and re-captured before the push, so
 * any agent-written divergence is refused. Sorted, compared as a set.
 *
 * The push URL SET comes from `get-url --push --all` (every insteadOf /
 * pushInsteadOf rewrite applied, every scope, every pushurl — `get-url --push`
 * alone shows only the first pushurl, and a bare `config --get` shows the
 * un-rewritten url). The rest are the redirect/RCE config keys above.
 *
 * This DETECTS divergence rather than pinning a value, which is why it closes
 * the command knobs without the operator-config tension a `-c` override carries:
 * a LEGITIMATE operator value — a global insteadOf, a corporate `http.proxy`, a
 * custom `core.sshCommand`, a repo-local `uploadpack` for an off-PATH server
 * binary — sits in BOTH captures and never false-blocks. Only a value that
 * APPEARS during the run diverges. (A value that PREDATES the pre-agent snapshot
 * is trusted — a prior agent poisoning shared/global config is §10 sandbox
 * territory, like reading ~/.ssh.)
 */
function pushGuardFingerprint(remote: string, cwd: string): string[] {
  const remoteRe = remote.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const urls = git(['remote', 'get-url', '--push', '--all', remote], cwd)
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((url) => `push-url ${url}`);
  const config = gitConfigMatches(PUSH_CONFIG_KEY_REGEX(remoteRe), cwd).map((line) => `cfg ${line}`);
  return [...urls, ...config].sort();
}

/** Two fingerprints equal? Both are pre-sorted by pushGuardFingerprint. */
function samePushGuard(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((line, i) => line === b[i]);
}

/**
 * §8, asked as a question instead of a verdict: may this revision be published
 * at all? EVERY reason the authoritative push refuses must be honoured here too —
 * a divergent push config (redirect or command knob), a missing anchor, and an
 * LFS repo whose objects the disabled pre-push hook never uploads. The §10.4
 * durability push uses this and must be SILENT when the answer is no: the
 * authoritative push reports the refusal, blocks, and records it exactly once.
 */
function mayPublish(args: {
  remote: string;
  repoPath: string;
  workDir: string;
  baseline: string;
  trustedPushGuard: readonly string[];
}): boolean {
  if (args.trustedPushGuard.length === 0) return false;
  if (!samePushGuard(pushGuardFingerprint(args.remote, args.repoPath), args.trustedPushGuard)) return false;
  const final = git(['rev-parse', 'HEAD'], args.workDir);
  if (final !== args.baseline && commitUsesLfs(final, args.workDir)) return false;
  return true;
}

/**
 * §10.3 — a claim-scoped push credential. The forge issues it authorizing ONLY
 * `refs/heads/claim/<claimId>` and only for the life of the lease: a leaked one
 * can rewrite the claim's own branch and nothing else, which is the whole point
 * of scoping it per claim rather than handing out a repo-wide token.
 */
export interface PushCredential {
  /** Username git should present (forges usually accept any placeholder with a token). */
  username?: string;
  /** The secret. Never written to disk, never logged, never in an event payload. */
  password: string;
}

/**
 * §10.3 — build a PER-DISPATCH GIT_ASKPASS broker for one push.
 *
 * git asks for the username and password on stdout of $GIT_ASKPASS, one prompt
 * per invocation. The script is written 0700 into a caller-chosen dir and reads
 * the answers from ITS OWN env rather than embedding them, so the secret never
 * lands on disk — only in the env of the git process that presents it. Returns
 * the env the push must run with plus a `cleanup()` that removes the script;
 * callers MUST cleanup in a finally, so the broker dies with the push.
 *
 * The agent child never receives any of this: it gets buildAgentEnv's allowlist,
 * which carries neither GIT_ASKPASS nor the credential vars (pinned in
 * agent-env.test.ts).
 */
export function writePushAskpass(
  dir: string,
  credential: PushCredential,
): { env: NodeJS.ProcessEnv; cleanup: () => void } {
  mkdirSync(dir, { recursive: true });
  const scriptPath = join(dir, `askpass-${randomBytes(8).toString('hex')}.sh`);
  // $1 is git's prompt ("Username for 'https://…': " / "Password for …").
  const script = [
    '#!/bin/sh',
    'case "$1" in',
    "  Username*) printf '%s\\n' \"$OAHS_PUSH_USER\" ;;",
    "  *) printf '%s\\n' \"$OAHS_PUSH_PASS\" ;;",
    'esac',
    '',
  ].join('\n');
  writeFileSync(scriptPath, script, { encoding: 'utf8', mode: 0o700 });
  chmodSync(scriptPath, 0o700); // explicit: writeFileSync mode is umask-masked
  return {
    env: {
      GIT_ASKPASS: scriptPath,
      OAHS_PUSH_USER: credential.username ?? 'x-access-token',
      OAHS_PUSH_PASS: credential.password,
      // Never let git fall back to an interactive prompt or the operator's
      // ambient helper if the broker fails — fail loudly instead.
      GIT_TERMINAL_PROMPT: '0',
    },
    cleanup: () => {
      try {
        rmSync(scriptPath, { force: true });
      } catch {
        /* best effort — a leftover broker is inert without its env */
      }
    },
  };
}

/**
 * §10.3 — scrub secrets out of a git failure before it becomes EVIDENCE.
 *
 * git names the remote in its errors, and an operator's remote URL may embed a
 * credential (`https://user:token@host/…`); the claim-scoped secret itself can
 * also surface. Evidence is a permanent, widely-readable record — a push that
 * fails must explain itself without publishing the credential that failed.
 */
export function redactSecrets(message: string, secret?: string): string {
  let out = message.replace(/(\w+:\/\/)[^@\s/]*@/g, '$1<redacted>@');
  if (secret !== undefined && secret !== '') out = out.split(secret).join('<redacted>');
  return out;
}

/**
 * §10.3 — clear the credential-helper list for a broker-authenticated call.
 *
 * A credential HELPER outranks GIT_ASKPASS: git asks every configured helper
 * first and only falls back to askpass if none answers. On any host with an
 * ambient helper (osxkeychain, libsecret, GCM, `store` — Apple git ships one by
 * DEFAULT in the system gitconfig) that would mean:
 *   (a) the push silently authenticates with the operator's REPO-WIDE
 *       credential and the claim scoping is a no-op, with no error; and
 *   (b) after a successful push git runs `credential approve`, handing the
 *       claim-scoped secret to that helper, which PERSISTS it — outliving the
 *       lease it was scoped to, and contradicting "never written to disk".
 * An empty `credential.helper` value resets the list, and `-c` is applied last,
 * so this clears system+global+local: the broker becomes the ONLY source and
 * nothing is stored. Exported so the test pins the exact shape the push uses.
 */
export const CREDENTIAL_HELPER_RESET: readonly string[] = ['-c', 'credential.helper='];

/**
 * §9.6 — open (or find) the PR for a pushed claim branch and record it as `pr`
 * evidence. Returns the PR number when one was opened/found, else null.
 *
 * Dedup is on the SPINE's evidence, item-keyed, NOT on the branch: after a crash
 * and adoption the claim branch is fresh, so `findPrByHead` alone cannot see a PR
 * a prior run already opened, and the item would collect a second one.
 *
 * Skip-with-log on any forge error: a forge hiccup must not fail an otherwise-good
 * run — the work is pushed and the evidence stands whether or not a PR exists.
 *
 * Shared because BOTH pushers need it: BYO `oahs work` opens the PR inline, and
 * the §10.2 dispatcher opens it on the host after the container exits (the
 * container holds no forge token, and §10.3 leaves it unable to push at all).
 */
export async function openPrForBranch(input: {
  client: OahsClient;
  workItemId: string;
  branch: string;
  forge: { client: GitHubForge; baseBranch: string; title: string };
  submit: (kind: Evidence['kind'], payload: Record<string, unknown>) => Promise<void>;
  log?: (line: string) => void;
}): Promise<number | null> {
  try {
    const priorOpened = (
      await input.client.call<Evidence[]>('list_evidence', { workItemId: input.workItemId })
    ).some((e) => e.kind === 'pr' && e.payload['action'] === 'opened');
    if (priorOpened) return null;
    const existing = await input.forge.client.findPrByHead({ head: input.branch });
    const pr =
      existing ??
      (await input.forge.client.openPr({
        head: input.branch,
        base: input.forge.baseBranch,
        title: input.forge.title,
      }));
    await input.submit('pr', { action: 'opened', number: pr.number, url: pr.url });
    return pr.number;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    (input.log ?? defaultRunnerLog)(`pr open skipped for ${input.workItemId}: ${message}`);
    return null;
  }
}

/**
 * §10.3 — push ONE ref and return the remote's view of it (`git ls-remote`
 * output), presenting a claim-scoped credential through a per-dispatch
 * GIT_ASKPASS broker when one is given; without a credential this is the
 * operator's ambient helper, exactly as before.
 *
 * Only the single claim branch is ever pushed: a claim-scoped credential
 * authorizes exactly `refs/heads/claim/<claimId>`, so anything else is both
 * unnecessary here and rejected at the forge. The broker is removed in a
 * `finally` — the credential outlives neither the push nor a throw.
 *
 * Shared by BYO `oahs work` (pushes its own claim branch) and the §10.2
 * dispatcher (pushes on the container's behalf, on the host).
 */
export function pushRef(input: {
  repoPath: string;
  remote: string;
  branch: string;
  credential?: PushCredential;
  /** Where the broker is written. Default `<repoPath>/.oahs/tmp` (git-excluded). */
  askpassDir?: string;
}): string {
  const broker =
    input.credential !== undefined
      ? writePushAskpass(input.askpassDir ?? join(input.repoPath, '.oahs', 'tmp'), input.credential)
      : undefined;
  const brokerArgs = broker !== undefined ? [...CREDENTIAL_HELPER_RESET] : [];
  try {
    git([...brokerArgs, 'push', input.remote, input.branch], input.repoPath, broker?.env);
    return git(
      [...brokerArgs, 'ls-remote', input.remote, `refs/heads/${input.branch}`],
      input.repoPath,
      broker?.env,
    );
  } finally {
    broker?.cleanup();
  }
}

/**
 * §10.4 — a previous claim of this item whose pushed work is worth adopting.
 *
 * Every fact here comes from the SPINE or from git's own structure — never from
 * repo CONTENT. That is the whole design: a claim branch's commits (and their
 * messages) are written by the agent, which §8/§10.3 model as the adversary, so
 * nothing an agent can author may decide which branch belongs to which work item
 * or where its baseline is. Instead:
 *  - WHICH branches are this item's: the spine knows every claim ever taken on it,
 *    and `claim/<claimId>` is the runner's own naming convention, not the agent's;
 *  - WHERE the work starts: `git merge-base` against the checkout's own base —
 *    structural, unforgeable;
 *  - WHETHER it is already spent: the spine's `commit` evidence names the branch
 *    it certified. This is what stops a rework dispatch (a review rejection loops
 *    the item back with no local worktree) from re-adopting the very branch that
 *    was just rejected instead of re-invoking the agent.
 *
 * Only a DEAD claim qualifies: the spine permits one live claim per item, and the
 * caller holds it. Remote-touching, so never called from an assigned container
 * (§10.3 gives it no credential).
 */
export async function findAdoptableRemoteClaim(input: {
  client: OahsClient;
  repoPath: string;
  remote: string;
  workItemId: string;
  /** This dispatch's own claim — never a candidate. */
  currentClaimId: string;
  credential?: PushCredential;
}): Promise<{ branch: string; head: string; baseline: string; claimId: string } | null> {
  const [claims, evidence] = await Promise.all([
    input.client.call<Claim[]>('list_claims', { includeReleased: true }),
    input.client.call<Evidence[]>('list_evidence', { workItemId: input.workItemId }),
  ]);
  // Work the spine already certified is SPENT: re-adopting it would resubmit work
  // that was already judged — and a review REJECTION is exactly the state where a
  // re-dispatch finds no local worktree and comes looking here.
  //
  // Spent-ness is keyed on the REVISION, not the branch name. A `commit` record
  // names the branch of the run that made it, and an ADOPTING run certifies the
  // adopted revision under its OWN new branch — so branch names alone would leave
  // the source branch looking forever fresh and re-adoptable. The sha is what was
  // actually judged, and it is the same sha wherever it is pointed from.
  const consumed = new Set<string>();
  for (const e of evidence) {
    if (e.kind !== 'commit') continue;
    for (const key of ['sha', 'branch']) {
      const value = e.payload[key];
      if (typeof value === 'string') consumed.add(value);
    }
  }
  const candidates = claims
    // kind 'work' only: a REVIEW claim (§9.4) dispatches a reviewer, never an
    // agent, so it has no branch and nothing to adopt.
    .filter((c) => c.workItemId === input.workItemId && c.kind === 'work' && c.id !== input.currentClaimId)
    .map((c) => `claim/${c.id}`)
    .filter((branch) => !consumed.has(branch));
  if (candidates.length === 0) return null;

  const broker =
    input.credential !== undefined
      ? writePushAskpass(join(input.repoPath, '.oahs', 'tmp'), input.credential)
      : undefined;
  const brokerArgs = broker !== undefined ? [...CREDENTIAL_HELPER_RESET] : [];
  try {
    // Newest claim first: the last machine to get anywhere did the most work.
    for (const branch of candidates.reverse()) {
      let head: string;
      try {
        git([...brokerArgs, 'fetch', input.remote, `+refs/heads/${branch}:refs/remotes/oahs-adopt/${branch}`], input.repoPath, broker?.env);
        head = git(['rev-parse', `refs/remotes/oahs-adopt/${branch}`], input.repoPath);
      } catch {
        continue; // never pushed (the machine died before publishing), or gone
      }
      // The decisive spent-ness check: this REVISION was already certified, under
      // whatever branch name. Catches the adopt-of-an-adopt case that a branch-name
      // check misses (an adopting run records the source's sha under its own branch).
      if (consumed.has(head)) continue;
      // Structural baseline: where this branch forked from what we have.
      let baseline: string;
      try {
        baseline = git(['merge-base', head, 'HEAD'], input.repoPath);
      } catch {
        continue;
      }
      if (head === baseline) continue; // published, but the agent committed nothing
      return { branch, head, baseline, claimId: branch.slice('claim/'.length) };
    }
  } finally {
    broker?.cleanup();
  }
  return null;
}

/**
 * §10.3 (host, pre-spawn) — resolve the §8 trusted push anchor for a dispatch.
 *
 * Under `oahs dispatch` the DISPATCHER owns this: it is the process that will
 * push, so the anchor must live in the environment that pushes (the host). A
 * fingerprint taken inside the container would mix in the container's own global
 * git config and false-block the host's push.
 *
 * The anchor is the EARLIEST `push_target` on the rails, not a fresh reading of
 * the working config. That matters because the dispatcher's checkout is SHARED
 * and PERSISTENT across dispatches: a redirect a previous container's agent left
 * in `<repo>/.git/config` is already present when the next dispatch starts, so
 * re-fingerprinting live config would quietly baptise the tampering as the new
 * baseline. Anchoring on the first recorded target keeps the pre-tamper truth —
 * the same reason the BYO crash-adopt path reads it (readTrustedPushGuard).
 * Only when no anchor exists yet (this item's first dispatch) do we take the
 * reading and record it.
 */
export async function resolvePushAnchor(input: {
  client: OahsClient;
  workItemId: string;
  repoPath: string;
  remote: string;
}): Promise<string[]> {
  const recorded = await readTrustedPushGuard(input.client, input.workItemId, input.remote);
  if (recorded.length > 0) return recorded;
  const guard = pushGuardFingerprint(input.remote, input.repoPath);
  await input.client.call('submit_evidence', {
    workItemId: input.workItemId,
    evidence: { kind: 'push_target', payload: { remote: input.remote, guard } },
  });
  return guard;
}

export interface PushOnBehalfResult {
  pushed: boolean;
  /** Present when the push was refused or impossible; suitable for a block detail. */
  reason?: string;
  sha?: string;
}

/**
 * §10.3 (host, post-exit) — push a finished claim branch ON BEHALF of a container
 * that was deliberately given no push credential, then record the reachable
 * `commit` the done-gate reads.
 *
 * The §8 guarantees travel WITH the push, because this is now the pushing
 * process: the effective push config is re-fingerprinted and compared to the
 * pre-agent anchor (an agent that rewrote remote.url/insteadOf inside the
 * bind-mounted repo is refused, not followed), and an LFS repo is refused rather
 * than certified with objects the disabled pre-push hook never uploaded.
 *
 * Evidence is append-only, so this ADDS `commit{reachableOnRemote:true}` next to
 * the container's honest `commit{reachableOnRemote:false}` — `checkReviewEvidence`
 * accepts ANY commit evidence that is reachable. No fencing token is presented:
 * the container released the claim on its way out, and a stale token would be
 * rejected, whereas evidence needs none.
 */
export async function pushClaimBranch(input: {
  client: OahsClient;
  workItemId: string;
  repoPath: string;
  remote: string;
  branch: string;
  trustedPushGuard: readonly string[];
  credential?: PushCredential;
}): Promise<PushOnBehalfResult> {
  // Nothing to push: the container blocked before committing, or never branched.
  let sha: string;
  try {
    sha = git(['rev-parse', '--verify', `refs/heads/${input.branch}`], input.repoPath);
  } catch {
    return { pushed: false, reason: `no ${input.branch} branch to push` };
  }

  const refuse = async (reason: string, extra: Record<string, unknown>): Promise<PushOnBehalfResult> => {
    await input.client.call('submit_evidence', {
      workItemId: input.workItemId,
      evidence: {
        kind: 'commit',
        payload: { sha, branch: input.branch, reachableOnRemote: false, pushRefused: reason, ...extra },
      },
    });
    return { pushed: false, reason, sha };
  };

  const observed = pushGuardFingerprint(input.remote, input.repoPath);
  if (input.trustedPushGuard.length === 0) {
    return refuse('no recorded push target for this item — refusing to trust repo config', {
      observedPushGuard: observed,
    });
  }
  if (!samePushGuard(observed, input.trustedPushGuard)) {
    return refuse('push configuration changed since dispatch (redirect or command knob)', {
      trustedPushGuard: [...input.trustedPushGuard],
      observedPushGuard: observed,
    });
  }
  if (commitUsesLfs(sha, input.repoPath)) {
    return refuse(
      'repository uses git-lfs, which uploads objects from the pre-push hook the runner disables — the pushed ref would be unusable',
      {},
    );
  }

  // A push can FAIL rather than be refused: bad credential, network, a remote
  // that rejects the ref. Before §10.3 that throw exited the container non-zero
  // and the dispatcher's crash path blocked the item; now the push runs here, so
  // an uncaught throw would strand the item at in_review with no reachable
  // commit, no evidence and no block — invisible to every later poll. Record it
  // and let the caller block, exactly like a refusal.
  let lsRemote: string;
  try {
    lsRemote = pushRef({
      repoPath: input.repoPath,
      remote: input.remote,
      branch: input.branch,
      ...(input.credential !== undefined ? { credential: input.credential } : {}),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return refuse(`push failed: ${redactSecrets(message, input.credential?.password)}`, {});
  }
  await input.client.call('submit_evidence', {
    workItemId: input.workItemId,
    evidence: {
      kind: 'commit',
      payload: { sha, branch: input.branch, reachableOnRemote: lsRemote.includes(sha), pushedBy: 'dispatcher' },
    },
  });
  return { pushed: lsRemote.includes(sha), sha };
}

/**
 * Does the commit `<tree>` track files through git-lfs? True iff a committed
 * `.gitattributes` (at any depth) has a line that BINDS a filter=lfs driver.
 * Reads only the pushed tree and needs no git-lfs binary — the authoritative
 * in-tree signal, since git-lfs tracking is always a committed filter=lfs.
 *
 * `-a` (not `-I`): the file being scanned is agent-controlled, and `-I` skips
 * files git deems binary — an agent that adds `*.gitattributes binary` or a NUL
 * byte would hide the marker from `-I` while lfs stays live for the reviewer.
 * `^[^#]*` anchors past a comment so a stale `# …filter=lfs…` note is not a
 * false positive. `git grep` exits 1 on no-match, which git() throws on, so this
 * runs raw with the same HOOK_ISOLATION + env.
 */
function commitUsesLfs(tree: string, cwd: string): boolean {
  const args = [...HOOK_ISOLATION, 'grep', '-a', '-l', '-e', '^[^#]*filter=lfs', tree, '--', '*.gitattributes'];
  const result = spawnSync('git', args, { cwd, encoding: 'utf8', env: buildGitEnv(args) });
  return result.status === 0 && result.stdout.trim().length > 0;
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

/**
 * Run the agent, streaming its transcript to `logPath` AS IT HAPPENS (§10.5).
 *
 * The transcript used to be accumulated in memory and written once the agent
 * exited, which made it useless exactly when it mattered: an agent can run for
 * half an hour, and a runner killed at minute 29 left no file at all — the whole
 * run unobservable while it ran and unexplained afterwards. Streaming means the
 * cockpit can tail a live run, and a death leaves a PARTIAL transcript instead
 * of nothing.
 *
 * Both streams go to one file in arrival order: a reader wants to see what the
 * agent did, in the order it did it, not stdout and stderr as separate stories.
 * Nothing is kept in memory — the HALT report is parsed from the spec FILE, so
 * the output has no other reader, and a long agent no longer holds its entire
 * transcript in RAM.
 */
function runAgentCommand(
  command: string,
  opts: {
    cwd: string;
    timeoutMs: number;
    env: NodeJS.ProcessEnv;
    logPath: string;
    header: readonly string[];
  },
): Promise<{ status: number | null }> {
  return new Promise((resolvePromise) => {
    mkdirSync(dirname(opts.logPath), { recursive: true });
    const sink = createWriteStream(opts.logPath, { flags: 'w' });
    let settled = false;
    // A WriteStream's 'error' is fatal to the PROCESS if nobody listens, and a
    // broken sink never fires end()'s callback — so an unhandled full disk would
    // either kill the runner or hang the dispatch forever. Losing the transcript
    // is the one acceptable outcome here: the agent's work is what matters.
    let sinkBroken = false;
    const settle = (status: number | null): void => {
      if (settled) return;
      settled = true;
      clearTimeout(killer);
      resolvePromise({ status });
    };
    sink.on('error', (error: Error) => {
      if (!sinkBroken) {
        sinkBroken = true;
        defaultRunnerLog(`agent transcript unavailable (${opts.logPath}): ${error.message}`);
      }
      if (childClosed) settle(lastStatus);
    });
    sink.write(`${opts.header.join('\n')}\n`);
    const child = spawn('bash', ['-lc', command], { cwd: opts.cwd, env: opts.env });
    const keep = (chunk: Buffer): void => {
      if (!sinkBroken) sink.write(chunk);
    };
    child.stdout.on('data', keep);
    child.stderr.on('data', keep);
    const killer = setTimeout(() => child.kill('SIGKILL'), opts.timeoutMs);
    let childClosed = false;
    let lastStatus: number | null = null;
    const finish = (status: number | null): void => {
      // A child can emit BOTH 'error' and 'close'; ending an already-ended stream
      // throws ERR_STREAM_WRITE_AFTER_END, so the guard belongs here, not only
      // around the resolve.
      if (childClosed) return;
      childClosed = true;
      lastStatus = status;
      if (sinkBroken) {
        settle(status);
        return;
      }
      // Resolve only once the footer is flushed, so a caller that reads the file
      // immediately (the halt_report evidence points at it) sees a complete one.
      // 'close' (not 'exit') means every stdout chunk has already been delivered.
      sink.end(`\n# exit: ${status === null ? 'error' : status}\n`, () => settle(status));
    };
    child.on('error', () => finish(null));
    child.on('close', (code) => finish(code));
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
  /**
   * §8: the push-guard fingerprint (URL set + transport config) captured from a
   * TRUSTED moment before the agent ran — the fresh run's own pre-agent
   * snapshot, or (on the adopt path) the `push_target` evidence the crashed run
   * recorded on the rails. finishRun refuses to push if the effective
   * fingerprint has since diverged. Empty means no trusted anchor exists (a
   * legacy item adopted from before this feature) — the push is refused rather
   * than trusted.
   */
  trustedPushGuard: readonly string[];
  /**
   * §10.3 — ASSIGNED (container) run: this process must NOT push. It holds no
   * push credential by design (the dispatcher never injects one), so the claim
   * branch is left local in the bind-mounted repo and the DISPATCHER pushes it
   * on the host after the container exits, under the §8 guard and a claim-scoped
   * credential. The `commit` evidence recorded here is therefore honestly
   * `reachableOnRemote: false`; the dispatcher appends the reachable one.
   */
  assigned: boolean;
  /**
   * §10.3 — BYO push credential: when set, the push presents it through a
   * per-dispatch GIT_ASKPASS broker instead of the operator's ambient helper.
   * Absent → ambient credentials, unchanged.
   */
  pushCredential?: PushCredential;
  /** TEST ONLY: die at a specific point to exercise crash recovery. */
  failpoint?: RunnerOptions['failpoint'];
  submit: (kind: Evidence['kind'], payload: Record<string, unknown>) => Promise<void>;
}

type NormalizeResult = 'normalized' | 'failed';

/**
 * Normalize a claim worktree to its committed HEAD so pinned verification measures exactly the
 * revision `commit` will certify.
 *
 * WHY: finishRun runs pinned verification in the worktree (step 7) but records `commit` evidence
 * as HEAD (step 8). Without this, an agent that leaves code UNCOMMITTED gets a passing test that
 * certifies a revision the commit does not contain. We ELIMINATE the divergence rather than
 * DETECT it — a dirty-tree heuristic both false-positives on scratch (`.DS_Store`, `.pytest_cache`)
 * and misses cases.
 *
 * `git reset --hard HEAD` reverts tracked content to the committed revision; `git clean -ffd`
 * removes untracked-new files AND untracked-new directories, including nested git repos — the
 * DOUBLE `-f` is load-bearing: single `-f` refuses to delete an untracked dir that is itself a git
 * repo (a `git init`'d or `git clone`'d subdir). Neither reset nor clean (no `-x`) touches
 * gitignored files, so installed deps (node_modules — even when it contains a nested `.git`) and
 * runner scratch (`.oahs/`, git-excluded) survive — verification runs against the committed code
 * with its real dependencies. There is NO false-positive path: we do not block on scratch, we
 * reset/clean it away and run.
 *
 * We do NOT restore the agent's uncommitted work afterward: finishRun's caller force-removes the
 * worktree the moment it returns (removeWorktree), and uncommitted work is never certified or
 * pushed. Discarding it here is therefore free, and it avoids the shared-`refs/stash` hazard a
 * stash-based approach has under concurrent same-repo runners.
 *
 * Returns `'failed'` when HEAD cannot be isolated (a git error — a stray index.lock, an unmerged
 * index). The caller must NOT verify a tree it could not isolate; it blocks.
 *
 * THREAT MODEL — honest-operator (OAHS.md "Trust boundary"). This closes the HONEST partial-commit
 * mistake: an agent that forgets to commit a file (untracked-new, or a modified tracked file — the
 * skip-worktree / assume-unchanged clear above also un-hides a tracked mod). It does NOT make the
 * gate sound against a MALICIOUS agent that actively engineers a working-tree ≠ commit divergence,
 * because an agent with arbitrary git control has many ways to do so and no local normalization
 * can catch them all — for example:
 *   - hiding the tested file behind an ignore rule (a committed OR an agent-written untracked
 *     `.gitignore`, or `.git/info/exclude`): an ignored path is indistinguishable from a legitimate
 *     gitignored dependency, so we cannot delete it without deleting deps;
 *   - a committed `.gitattributes` binding a smudge filter the agent sets in repo-local
 *     `.git/config`, so `reset --hard` re-materialises tracked files through a transform a
 *     downstream checkout (without that config) will not reproduce;
 *   - a populated submodule the agent `git submodule update`s itself (a fresh `git worktree add`
 *     does not populate submodules, and `--recurse-submodules` is NOT used — it ERRORS on the
 *     common unpopulated submodule and would block every submodule-repo run).
 * Defending those is the honest→platform-verified step (roadmap §4.3), not this. Stated plainly so
 * the guarantee is not mistaken for more than it is — the previous attempt's sin was overclaiming.
 */
function normalizeWorktreeToHead(workDir: string): NormalizeResult {
  try {
    // Clear skip-worktree / assume-unchanged FIRST — reset --hard will not touch a file whose
    // skip-worktree bit is set. `git ls-files -v` tags skip-worktree 'S' and assume-unchanged a
    // lowercase letter; core.quotePath=false emits non-ASCII paths raw so slice(2) is the real path.
    const flagged = git(['-c', 'core.quotePath=false', 'ls-files', '-v'], workDir)
      .split('\n')
      .filter((line) => line.startsWith('S') || /^[a-z]/.test(line))
      .map((line) => line.slice(2))
      .filter((path) => path.length > 0);
    if (flagged.length > 0) {
      // TWO separate calls, NOT one combined `--no-skip-worktree --no-assume-unchanged`: git
      // processes the assume-unchanged mode first per path and silently drops the skip-worktree
      // mode when both are requested together, leaving the skip-worktree bit SET (verified on git
      // 2.50). A combined call is an inert defense.
      git(['update-index', '--no-skip-worktree', '--', ...flagged], workDir);
      git(['update-index', '--no-assume-unchanged', '--', ...flagged], workDir);
    }
    git(['reset', '--hard', 'HEAD'], workDir);
    git(['clean', '-ffd'], workDir);
    return 'normalized';
  } catch (error) {
    defaultRunnerLog(
      `could not isolate the committed revision for verification: ${error instanceof Error ? error.message : String(error)}`,
    );
    return 'failed';
  }
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

  // 6.5 — §10.4 DURABILITY push. The agent has finished and its work exists only
  // on this machine's disk; pinned verification below can then run for many
  // minutes. A machine lost in that window takes an entire agent run with it, and
  // no second machine can recover what it never saw. So publish the claim branch
  // NOW, the moment the work is trustworthy — and only then: this is the same §8
  // check the authoritative push makes below, so an agent that redirected the push
  // config still lands nothing anywhere (the refusal is reported down there, once).
  //
  // Best-effort and evidence-free: the push below remains the authoritative one
  // that measures reachability and records `commit`. This only buys durability.
  if (!args.assigned && mayPublish(args)) {
    try {
      pushRef({
        repoPath: args.repoPath,
        remote: args.remote,
        branch: args.branch,
        ...(args.pushCredential !== undefined ? { credential: args.pushCredential } : {}),
      });
      if (args.failpoint === 'after_durability_push') {
        throw new Error('failpoint after_durability_push: machine died during verification');
      }
    } catch (error) {
      if (args.failpoint === 'after_durability_push') throw error;
      const message = error instanceof Error ? error.message : String(error);
      defaultRunnerLog(`durability push skipped for ${args.branch}: ${redactSecrets(message, args.pushCredential?.password)}`);
    }
  }

  // 6.7 — bind verification to the COMMITTED revision on EVERY path that verifies a worktree, not
  // just the fresh run: the LOCAL re-adopt reuses a crashed run's leftover worktree, which is DIRTY
  // (uncommitted work still on disk), so it needs normalizing too. The cross-machine adopt does a
  // fresh `git worktree add` of a committed branch, so this is a no-op there.
  if (normalizeWorktreeToHead(args.workDir) === 'failed') {
    // Could not isolate HEAD (a git error, or a residual dirty path reset/clean could not reach —
    // an uninitialised submodule). Verifying the dirty tree would let a test pass on code the
    // commit lacks, and an agent could force this, so refuse to certify: block for a look / retry.
    await dispatch.call('block_task', {
      workItemId: workItem.id,
      reason: 'dirty_tree',
      fencingToken: claim.fencingToken,
    });
    await dispatch.call('release_claim', {
      claimId: claim.id,
      reason: 'could not isolate the committed revision for pinned verification',
    });
    return 'blocked';
  }

  // 7 — pinned verification only; the allowlist gates what ever gets executed. It now runs against
  // HEAD's tracked content (normalized above), so a passing test_run measures the certified commit.
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

  // 8a0 — §10.3 ASSIGNED (container): this process pushes NOTHING. It was handed
  // no push credential (that is the isolation: an agent container never receives
  // one), so it records the revision honestly as not-yet-reachable and leaves the
  // claim branch local in the bind-mounted repo. The dispatcher pushes it on the
  // host afterwards — under the SAME §8 guard, against the rails' pre-agent
  // anchor — and appends the reachable `commit`, which is what the done-gate
  // reads (it accepts ANY commit evidence with reachableOnRemote true).
  if (args.assigned) {
    await args.submit('commit', {
      sha: final,
      branch: args.branch,
      reachableOnRemote: false,
      pushDeferred: 'dispatcher',
    });
    return routeByHalt();
  }

  // 8a — §8 push-config trust. Refuse (block, don't push) if the push-guard
  // fingerprint has diverged from the trusted pre-agent snapshot, or if there is
  // no trusted snapshot. Divergence means the agent wrote a redirect (remote.url
  // / insteadOf / pushInsteadOf / pushurl / a transport proxy) — which
  // exfiltrates the branch and forges reachableOnRemote, consumed by the
  // done-gate — or a command knob (core.sshCommand / credential.helper /
  // uploadpack / receivepack) that would run as the runner holding the ssh-agent
  // socket. A loud block beats a dishonest record or an RCE. NOTE: this catches
  // tampering during THIS run; config that predates the trusted snapshot (a
  // prior agent poisoning shared/global config) is out of reach of any config
  // reader and belongs to the §10 sandbox, like reading ~/.ssh.
  const refusePush = async (reason: string, extra: Record<string, unknown>): Promise<'blocked'> => {
    await args.submit('commit', {
      sha: final,
      branch: args.branch,
      reachableOnRemote: false,
      pushRefused: reason,
      ...extra,
    });
    await dispatch.call('block_task', {
      workItemId: workItem.id,
      reason: 'other',
      fencingToken: claim.fencingToken,
    });
    await dispatch.call('release_claim', { claimId: claim.id, reason });
    return 'blocked';
  };

  const observedGuard = pushGuardFingerprint(args.remote, args.repoPath);
  if (args.trustedPushGuard.length === 0) {
    return refusePush('no recorded push target for this item — refusing to trust repo config', {
      observedPushGuard: observedGuard,
    });
  }
  if (!samePushGuard(observedGuard, args.trustedPushGuard)) {
    return refusePush('push configuration changed since dispatch (redirect or command knob)', {
      trustedPushGuard: [...args.trustedPushGuard],
      observedPushGuard: observedGuard,
    });
  }
  // 8b — §8 git-lfs. Client hooks are off (HOOK_ISOLATION), and git-lfs uploads
  // its objects FROM the pre-push hook, so pushing an LFS repo lands a ref whose
  // objects never uploaded — reachableOnRemote would be truthfully true while the
  // branch is unusable. Refuse rather than certify a broken ref. (Re-enabling
  // hooks on push is not the fix: it hands an agent-planted pre-push hook the
  // ssh-agent socket this call carries.)
  if (final !== args.baseline && commitUsesLfs(final, args.workDir)) {
    return refusePush('repository uses git-lfs, which uploads objects from the pre-push hook the runner disables — the pushed ref would be unusable', {});
  }

  // NOTE (§10.2): git is synchronous (spawnSync), so a push that runs longer
  // than the lease TTL blocks the heartbeat timer and lapses BOTH the lease and
  // the scoped token together — a container run whose single push exceeds the
  // TTL (default 15 min, renewed right above at the git_diff submit) is blocked
  // `other`. Pathological only (a >15-min single push); the lever is a larger
  // `--claim-ttl`, and §10.5's reaper reclaims the lease either way.
  // §10.3: present a claim-scoped credential through a per-dispatch GIT_ASKPASS
  // broker when one is configured; otherwise the operator's ambient helper, as
  // before. The broker lives in the runner parent for the length of the push and
  // is removed in the finally — the agent already finished, and its child env
  // never carried any of this.
  const pushed = pushRef({
    repoPath: args.repoPath,
    remote: args.remote,
    branch: args.branch,
    ...(args.pushCredential !== undefined ? { credential: args.pushCredential } : {}),
  });
  await args.submit('commit', {
    sha: final,
    branch: args.branch,
    reachableOnRemote: pushed.includes(final),
  });

  // 8.5 — §9.6: open (or find) the PR from the pushed claim branch and record it
  // as `pr` evidence. Skip-with-log on any forge error — a forge hiccup must not
  // fail an otherwise-good run, and a BYO project with no forge never gets here.
  if (args.forge !== undefined && final !== args.baseline) {
    await openPrForBranch({
      client: args.client,
      workItemId: workItem.id,
      branch: args.branch,
      forge: args.forge,
      submit: args.submit,
    });
  }

  // 9 — routing: the file says what the agent claims; the core decides.
  return routeByHalt();

  // Hoisted so the §10.3 assigned path (which returns before the push) routes
  // through the SAME verdict logic — one HALT contract, one place.
  // eslint-disable-next-line no-inner-declarations
  async function routeByHalt(): Promise<'in_review' | 'blocked'> {
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
}

// ---------------------------------------------------------------------------
// Crash-recovery scan (step 10)
// ---------------------------------------------------------------------------

/**
 * §8: the trusted push-guard fingerprint the ORIGINAL dispatch recorded on the
 * rails, for the adopt path (which has no pre-agent moment of its own). Takes
 * the EARLIEST push_target for the remote — evidence is append-only and the
 * agent cannot submit (no rails credential), but earliest-wins closes even a
 * hypothetical late forgery.
 *
 * A `list_evidence` error is NOT swallowed: it propagates so workLoop backs off
 * and retries with the worktree intact, exactly like every other rails call in
 * the dispatch. Swallowing it to `[]` would turn a transient blip into a
 * terminal block AND a deleted adoptable worktree. Only a SUCCESSFUL read that
 * genuinely lacks the row (a pre-feature legacy item) returns `[]` ⇒ refuse.
 */
async function readTrustedPushGuard(
  client: OahsClient,
  workItemId: string,
  remote: string,
): Promise<string[]> {
  const rows = await client.call<Evidence[]>('list_evidence', { workItemId });
  const target = rows.find((e) => e.kind === 'push_target' && e.payload['remote'] === remote);
  const guard = target?.payload['guard'];
  if (!Array.isArray(guard)) return [];
  return guard.filter((line): line is string => typeof line === 'string').sort();
}

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

  // 1 — obtain a claim. §10.2 ASSIGNED mode: the dispatcher already claimed on
  // the host, so skip poll + claim_task entirely (the scoped `client` cannot do
  // either) and run the handed-down claim. Otherwise poll and claim as usual:
  // response order = import order, take the first; an in_progress item with no
  // live claim is a crashed dispatch to adopt.
  let claim: Claim;
  if (options.assignment !== undefined) {
    claim = options.assignment.claim;
    log(`dispatch ${options.assignment.workItem.externalKey} (assigned claim ${claim.id})`);
  } else {
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
  }

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

  // §10.2: in ASSIGNED mode the context is pre-supplied by the dispatcher (the
  // scoped client cannot call get_task_context); otherwise read it live.
  const context =
    options.assignment !== undefined
      ? { workItem: options.assignment.workItem, entryState: options.assignment.entryState }
      : await client.call<{ workItem: WorkItem; entryState: WorkItemState }>('get_task_context', {
          workItemId: claim.workItemId,
        });
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
    // §10.3: an assigned (container) run holds no push credential and pushes
    // nothing — the dispatcher pushes on the host afterwards.
    assigned: options.assignment !== undefined,
    ...(options.failpoint !== undefined ? { failpoint: options.failpoint } : {}),
    ...(options.pushCredential !== undefined ? { pushCredential: options.pushCredential } : {}),
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
    // §9.6: a forge client for PR-on-dispatch, when the project has one. §10.2:
    // never in ASSIGNED mode — PR-on-dispatch reads `list_evidence`, outside the
    // scoped allowlist, and the container holds no forge token. The DISPATCHER
    // opens the PR on the host instead, after it pushes (see apps/oahs/src/
    // dispatcher.ts). BYO `oahs work` (no assignment) opens it inline, unchanged.
    ...(options.forge !== undefined && options.assignment === undefined
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
    // §8: no agent runs on adopt, so there is no pre-agent moment THIS process —
    // the trusted push guard comes from the `push_target` the crashed run
    // recorded on the rails. Absent (a legacy item) → empty → finishRun refuses
    // rather than trust the (possibly tampered) repo config.
    // §10.3: an ASSIGNED (container) run pushes nothing, so it needs no anchor —
    // and must not ask for one: `readTrustedPushGuard` reads `list_evidence`,
    // outside the §10.1 scoped allowlist, which would 403 the whole adopt. The
    // dispatcher reads the anchor on the host when it pushes.
    const outcome = await finishRun({
      ...finishArgs,
      workDir: dir,
      baseline,
      agentExitCode: null,
      trustedPushGuard:
        options.assignment !== undefined ? [] : await readTrustedPushGuard(client, workItem.id, remote),
    });
    removeWorktree(dir, repoPath);
    log(`${workItem.externalKey} → ${outcome === 'in_review' ? 'adopted_in_review' : outcome} (adopted ${dir})`);
    return {
      ...base,
      outcome: outcome === 'in_review' ? 'adopted_in_review' : outcome,
      details: `adopted finished worktree ${dir}`,
    };
  }
  // 10b — §10.4 CROSS-MACHINE adopt. No local worktree survived, but a previous
  // machine may have PUBLISHED this item's work before dying (§10.4 pushes the
  // claim branch as soon as the §8 guard passes, so an agent run outlives the
  // machine that produced it). Adopt it as late evidence rather than paying for
  // the agent again. Everything trusted here comes from the spine or from git's
  // structure — see findAdoptableRemoteClaim.
  //
  // Never from an assigned container: it holds no credential to fetch with (§10.3).
  if (scan.adoptable === null && scan.wrecked.length === 0 && options.assignment === undefined) {
    const candidate = await findAdoptableRemoteClaim({
      client,
      repoPath,
      remote,
      workItemId: workItem.id,
      currentClaimId: claim.id,
      ...(options.pushCredential !== undefined ? { credential: options.pushCredential } : {}),
    });
    if (candidate !== null) {
      mkdirSync(worktreesRoot, { recursive: true });
      const dir = join(worktreesRoot, claim.id);
      git(['worktree', 'add', '--detach', dir, candidate.head], repoPath);
      // The marker goes down FIRST: any throw from here on must leave a worktree
      // the normal sweep can recognise and reclaim (as adoptable or wrecked).
      // Without it a leftover directory is invisible to scanOldWorktrees, and its
      // stable name makes every later dispatch die on `worktree add` — the item
      // would become permanently un-dispatchable, silently.
      writeMarker(dir, {
        workItemId: workItem.id,
        claimId: claim.id,
        baseline: candidate.baseline,
        invocations: 1, // an agent DID run for this work — just not on this machine
      });
      // Only finished work is adoptable: the HALT report must be readable from the
      // branch itself. A run whose agent never committed its report is
      // indistinguishable from a half-write to a machine that has only the branch.
      const status = normalizeStatus(readSpecReport(join(dir, specRel)).status);
      if (status === 'done' || status === 'in_review') {
        git(['branch', branch, candidate.head], repoPath);
        await dispatch.call('advance_state', {
          workItemId: workItem.id,
          to: 'in_progress',
          fencingToken: claim.fencingToken,
        });
        const outcome = await finishRun({
          ...finishArgs,
          workDir: dir,
          baseline: candidate.baseline,
          agentExitCode: null,
          // §8 anchors must be taken WHERE THE PUSH HAPPENS — the same rule that
          // keeps §10.3 from fingerprinting inside the container. The rails anchor
          // belongs to the machine that crashed, and a fingerprint spans global and
          // system git config, so importing it here would read THIS machine's own
          // legitimate setup (its credential helper, its clone URL scheme) as agent
          // tampering and block work that a plain dispatch on this very machine
          // would push happily. No agent ran here, so this reading IS our pre-agent
          // moment — exactly what the fresh path below records for itself.
          trustedPushGuard: pushGuardFingerprint(remote, repoPath),
        });
        removeWorktree(dir, repoPath);
        log(`${workItem.externalKey} → ${outcome === 'in_review' ? 'adopted_in_review' : outcome} (adopted ${candidate.branch} from the remote)`);
        return {
          ...base,
          outcome: outcome === 'in_review' ? 'adopted_in_review' : outcome,
          details: `adopted remote claim branch ${candidate.branch}`,
        };
      }
      removeWorktree(dir, repoPath);
    }
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
  // §8: snapshot the trusted push-guard fingerprint NOW, before the agent can
  // touch repo config, and record it on the rails. finishRun refuses to push if
  // the fingerprint later diverges; the rails copy lets a crash-adopt (which
  // never re-invokes the agent) verify against this same pre-tamper anchor.
  //
  // §10.3: NOT in an assigned (container) run. This process pushes nothing, so
  // it needs no anchor — and must not record one: a fingerprint taken here
  // reflects the CONTAINER's effective git config, while the dispatcher pushes
  // from the HOST, whose global config differs. That anchor would false-block a
  // later push. The dispatcher snapshots and records its own, pre-spawn.
  const trustedPushGuard = options.assignment !== undefined ? [] : pushGuardFingerprint(remote, repoPath);
  if (options.assignment === undefined) {
    await submit('push_target', { remote, guard: trustedPushGuard });
  }
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
  // §10.5: the transcript lives OUTSIDE the worktree (which is removed on
  // success) so a run stays auditable after the fact — and it is opened BEFORE
  // the agent starts, so it can be tailed WHILE the run happens and a runner that
  // dies mid-agent still leaves what the agent had said by then. `.oahs/` is
  // already in the repo's git excludes.
  const agentLogPath = join(repoPath, '.oahs', 'logs', `${claim.id}.log`);
  const invoked = await runAgentCommand(command, {
    cwd: worktreeDir,
    timeoutMs: options.agentTimeoutMs ?? 30 * 60 * 1000,
    env: buildAgentEnv({
      agentEnv: options.agentEnv,
      inheritEnv: options.inheritEnv,
      extra: { OAHS_SPEC_FILE: specAbs, OAHS_STORY_ID: workItem.externalKey },
    }),
    logPath: agentLogPath,
    header: [
      `# oahs agent transcript — story ${workItem.externalKey}, claim ${claim.id}`,
      `# command: ${command}`,
      '# stdout + stderr, in arrival order; live — the run may still be going',
      '---',
    ],
  });
  const agentExitCode = invoked.status ?? -1;
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
    trustedPushGuard,
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
