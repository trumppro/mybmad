# Phase 10 checklist — execution isolation

Global rules: see [delivery/README.md](../README.md). Completes §4.3 per D13: exactly one
process may spawn work, and the thing that decides what runs never holds the credentials
that run it. BYO (§4.1) stays first-class — the dispatcher is additive.

Order matters: **10.1 → 10.2 → 10.3** are a chain (the dispatcher injects the token from
10.1 and the credential guard from 10.3). 10.4 and 10.5 are independent and can land in
parallel.

## 10.1 Job-bound scoped tokens

Pin: `pnpm -C apps/spine-api test`

Tests first (`apps/spine-api/test/auth.test.ts` + a bus test):

- [x] `mint_claim_token(claimId)` by the claim holder returns a token that `resolve()`s
      to a record scoped `{actorId, claimId, allowedCommands, expiresAt}`.
- [x] A scoped token calling a command outside its allowlist → `PermissionDeniedError`
      (`scope`); calling an allowed command for a **different** claim → denied; after
      `expiresAt` → denied (unauthenticated-equivalent, 401).
- [x] The allowlist is exactly `[heartbeat, submit_evidence, advance_state, block_task,
      release_claim]`; `mint_claim_token` itself is not in it (no self-minting chains).
- [x] The static runner token still works for `list_work_items`/`claim_task`.

Implementation:

- [x] `apps/spine-api/src/auth.ts`: extend `ResolvedToken` (currently `{actorId,
      isAdmin}`) with optional `claimId?`, `allowedCommands?: string[]`,
      `expiresAt?: number`; `resolve()` returns `null` when `expiresAt` has passed;
      persist the new fields in `PersistShape`. Add `issueScoped(actorId, scope)`.
- [x] `apps/spine-api/src/server.ts` `authenticate()`: on a scoped token, stamp the
      scope onto `ActorContext` (`ctx.scope`).
- [x] `apps/spine-api/src/bus.ts`: before dispatching a command, if `ctx.scope` is
      present, enforce `command ∈ allowedCommands` and (for claim-bearing commands) the
      `claimId` matches the body's target claim; else 403.
- [x] Contracts `mint_claim_token` def (input `{claimId}`, output `{token, expiresAt}`);
      bus case: only the live claim holder may mint, `expiresAt = lease expiry`.
- [x] `packages/runner/src/index.ts`: after `claim_task`, call `mint_claim_token` and use
      the scoped token for all dispatch mutations; keep the static token only for the
      poll/claim client.

## 10.2 Dispatcher service with container-per-claim

Pin: `pnpm -C apps/oahs test`

Tests first (`apps/oahs/test/dispatcher.test.ts`, new — with an injectable spawner so no
real Docker in CI, the way the supervisor test injects loops):

- [x] `oahs dispatch --once` claims a ready item, calls the (fake) container spawner with
      an argv containing the image, a `--rm` flag, the mounted repo, and env carrying the
      scoped token from 10.1 but **not** the static admin/runner token nor `OAHS_MODEL_*`.
- [x] On spawner exit 0 the dispatcher does not itself advance state (the in-container
      `oahs work --once` did); on spawner non-zero it blocks the item `other` with the
      captured tail.
- [x] Exactly one docker-socket holder: the dispatcher; the spine process never
      references a socket (grep test over `apps/spine-api/src`).

Implementation:

- [x] `apps/oahs/src/dispatcher.ts`: poll+claim identical to `workLoop`
      (`packages/runner/src/index.ts`), then `spawn('docker', ['run','--rm', ...])` with
      one container per claim running `oahs work --once` inside; image = coding CLI +
      git + the oahs bin. Spawner is injectable (`{ spawn }` param) for tests.
- [x] `oahs dispatch` CLI command (mode sibling of `work`), `--once`, `--manifest`,
      `--image`, `--project`.
- [x] `apps/oahs/Dockerfile.runner` (new): the agent-runtime image (git + node + the CLI
      + a coding agent binary selected by build-arg `AGENT_CMD`, e.g. `claude`/`codex`).
- [x] `docker-compose.yaml`: `dispatcher` service under a `runtime` profile bound to
      `/var/run/docker.sock`; **remove `env_file: .env` from the `oahs` service** (the
      spine holds no model keys) and move it to the runtime profile only.

## 10.3 Claim-scoped push credentials

Pin: `pnpm -C packages/runner test`

Tests first (runner suite with a fake git remote):

- [x] The dispatch push path uses a credential that authorizes only
      `refs/heads/claim/<claimId>` — pushing any other ref is rejected by the (fake)
      askpass/remote helper in the test.
- [x] The agent child never sees the push credential (env assertion, building on 8.6):
      no `GIT_ASKPASS` value, no token, no `SSH_AUTH_SOCK` in the child; the push runs in
      the dispatcher/runner parent, not the agent.

Implementation:

- [x] `packages/runner/src/index.ts` push step (~line 487): set a per-dispatch
      `GIT_ASKPASS` script (written to the worktree-adjacent temp dir, `chmod 700`) that
      emits a short-lived credential; or, preferred, the **dispatcher pushes on behalf**
      after the container exits so the agent container never receives push creds at all —
      pick the dispatcher-push variant when running under `oahs dispatch`, the askpass
      variant for BYO `oahs work`.
- [x] Document both credential shapes in `docs/oahs/01-cai-dat-va-van-hanh.md` (BYO vs
      dispatcher).

## 10.4 Dispatch-start branch push and cross-machine adoption

Pin: `pnpm -C packages/runner test`

Tests first:

- [x] The runner PUBLISHES the claim branch as soon as §8 permits (right after the agent,
      before verification), so an agent run outlives its machine; a second machine claiming
      the same item after a crash finds that work and **adopts** it (submits late evidence)
      instead of re-invoking the agent. (Amended: the original "empty baseline commit +
      in-branch marker" was built and REJECTED in review — a marker in a commit message is
      agent-authored, i.e. adversary-controlled under §8. Identity/baseline/spent-ness now
      come from the spine and from `git merge-base`.)
- [x] Same-machine adoption (today's local-marker path, `scanOldWorktrees` in
      `packages/runner/src/index.ts` ~lines 535–557) still works unchanged.

Implementation:

- [x] Durability push in `finishRun` (guarded by the SAME §8 conditions as the
      authoritative push: anchor match + no LFS); `findAdoptableRemoteClaim` resolves
      candidates from `list_claims({includeReleased})`, rejects any branch the spine's
      `commit` evidence already certified (this is what keeps a review REJECTION from
      re-adopting the branch it just rejected), and takes the baseline from `git merge-base`;
      adoption reuses the existing late-evidence path. The adopt worktree carries a marker so
      a throw leaves something `scanOldWorktrees` can reclaim.

## 10.5 Lease reaper and live transcripts

Pin: `pnpm -C packages/core test && pnpm -C packages/runner test`

Tests first:

- [ ] Core: a background `reapExpiredClaims()` (invoked by the served spine on an
      interval, and callable directly in tests) appends `claim.expired` (system actor,
      causation = the claim) for each lease past expiry, once per claim (idempotent — a
      second reap of the same expired claim appends nothing); a `claim.expired` produces a
      `notification` to the last holder.
- [ ] Runner: agent stdout/stderr is streamed to `.oahs/logs/<claimId>.log` incrementally
      (a fake long-running agent's early lines are on disk before it exits); a killed
      runner leaves a partial log, not an empty file.

Implementation:

- [ ] `packages/core/src/engine.ts` (+ pg-engine): `reapExpiredClaims()` — find live
      claims with `leaseExpiresAt < now`, release each, append `claim.expired` +
      notification. `apps/oahs/src/serve.ts` calls it on a timer (wall-clock served spine
      already opts into real time).
- [ ] `packages/runner/src/index.ts`: replace the in-memory transcript concat (~lines
      399–417) with a write stream to the log path opened before spawn; tee to memory
      only for the `halt_report` parse.
- [ ] Dashboard: the item page live-tails the log (reuses SSE plumbing); the cockpit
      shows `claim.expired` items as re-dispatchable.
