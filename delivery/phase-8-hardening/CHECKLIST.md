# Phase 8 checklist — hardening & the trust floor

Global rules: see [delivery/README.md](../README.md). Anchors below were verified against
the tree at the time of writing; if a line has drifted, search the named symbol.

## 8.1 Net-new CI workflow with invariant greps

Pin: `make check`

Tests/spec first:

- [ ] Decide the two grep patterns and write them into the workflow as separate named
      steps so a failure names the invariant, not "grep":
      LLM-SDK grep: `@anthropic-ai/|openai|@google/generative|mistralai|cohere|ollama`
      over `packages/core/src packages/db/src packages/contracts/src apps/spine-api/src`;
      gateway grep: `@oahs/gateway` over the same four trees. Both must currently exit 1
      (no match) — run them locally before wiring.

Implementation:

- [ ] `.github/workflows/oahs-ci.yaml` (new; the primary origin is GitHub — do not touch
      the upstream BMAD workflows in the same dir) **and** an identical `.gitlab-ci.yml`
      mirror (the GitLab mirror remote). Both: two jobs — a fast `spine-purity` job (the
      three greps, no install) and a `check` job; trigger on pushes/PRs touching
      `packages/** apps/** Makefile .nvmrc pnpm-lock.yaml delivery/** docs/oahs/**` and the
      CI files.
- [ ] `check` job: `setup-node` (`node-version-file: .nvmrc`) → `corepack enable` +
      `corepack prepare pnpm@<version> --activate` → **generate the workspace file** (it is
      gitignored by design): `printf 'packages:\n  - packages/*\n  - apps/*\nallowBuilds:\n
      esbuild: true\n  sharp: true\n  unrs-resolver: true\n' > pnpm-workspace.yaml` (inside
      a YAML block/`run: |` — the `esbuild: true` colon-space breaks a plain scalar) →
      `pnpm install --frozen-lockfile` → `make check`.
- [ ] Add a third grep step gating unfinished-work markers in the platform's own docs:
      the doclint marker set over `delivery/ docs/oahs/` (exclude nothing; these trees
      must stay clean).
- [ ] Resolve the one live in-code marker at `packages/core/test/stories-import.test.ts:274`
      (deferred importer/pinned-id note): either implement the assertion it defers or
      move it to this backlog as an explicit story line in `stories.yaml` — the comment
      itself must go.

Acceptance:

- [ ] Workflow green on this branch; a scratch commit adding `import '@oahs/gateway'`
      to `packages/core/src/index.ts` makes exactly the gateway step fail (then revert).
- [ ] Truth notes removed: roadmap §0.1 blockquote, `OAHS.md` Invariants note, and the
      §2.5 "runs by hand" parenthetical — each replaced by the plain original claim.

## 8.2 Gate force_release_claim

Pin: `pnpm -C packages/core test && pnpm -C packages/db test`

Tests first (`packages/core/test/ops.test.ts`, new file; record pins in CONFORMANCE.md):

- [ ] Zero-grant actor calling force-release → `PermissionDeniedError`.
- [ ] Actor with role `tech_lead` (bundle already carries `ops.force_release_claim`,
      `packages/core/src/types.ts` DELIVERY_ROLES) → succeeds, claim released.
- [ ] Event `claim.force_released` appended with `{claimId, workItemId, holderActorId}`,
      authored by the acting actor.
- [ ] The evicted holder's fencing token now gets `ConflictError` + a `fencing.rejected`
      audit event on its next mutation (reuse the zombie harness in
      `packages/core/test/claims.test.ts`, `setupZombie`).

Implementation:

- [ ] `SpineEngine.forceReleaseClaim({workItemId, actorId})` in
      `packages/core/src/engine.ts`: `requirePermission(actor, 'ops.force_release_claim')`,
      resolve the live claim, release it, append the event. Port to
      `packages/db/src/pg-engine.ts`.
- [ ] `apps/spine-api/src/bus.ts` `force_release_claim` case: replace the
      `getClaims`+`releaseClaim` composition (currently ~line 531) with the engine call —
      the bus stops re-implementing ops.
- [ ] HTTP test in `apps/spine-api/test/flow.test.ts`: 403 envelope for a zero-grant
      token; success for a tech_lead token.
- [ ] The comment in `apps/spine-api/ui-src/views/claims.ts` (lines 3–5) becomes true —
      verify the UI surfaces the 403 error envelope as-is (no UI code change expected).

## 8.3 Authenticate heartbeat, release_claim, and runner liveness

Pin: `pnpm -C packages/core test && pnpm -C packages/runner test`

Tests first (extend `packages/core/test/claims.test.ts`):

- [ ] `heartbeat` by a non-holder actor without the live fencing token →
      `ConflictError` + `fencing.rejected` event; by the holder → renews; by anyone
      presenting the live token → renews (dispatcher-mode seam for 10.2).
- [ ] `release_claim` same matrix; idempotent release by the holder stays idempotent.
- [ ] Runner liveness: `runner_announce`/`runner_heartbeat` by an actor without
      `task.claim` → `PermissionDeniedError`; with role `developer` → ok.

Implementation:

- [ ] Extend contracts inputs (`packages/contracts/src/index.ts`): `heartbeat` and
      `release_claim` gain optional `fencingToken`; actor always from ctx.
- [ ] `packages/core/src/engine.ts` `heartbeat`/`releaseClaim` (~lines 785–801): accept
      `{claimId, actorId, fencingToken?}`; rule = holder actor OR valid presented token;
      reuse `validatePresentedToken`. Port to pg-engine.
- [ ] `apps/spine-api/src/bus.ts` (~lines 352–364): pass `ctx.actorId` through; runner
      liveness cases (~lines 606–630) call a new engine permission check
      (`requirePermission(actor, 'task.claim')`) before touching the registry — the
      registry itself stays in-memory (durability is 12.4).
- [ ] `packages/runner/src/index.ts`: heartbeat loop (~lines 605–610) and release calls
      send the fencing token it already holds.

Acceptance:

- [ ] Runner e2e suite green unchanged in behavior; a hand `curl` heartbeat with a
      stolen claimId and no token gets 409.

## 8.4 Audit the credential plane

Pin: `pnpm -C apps/spine-api test`

Tests first (`apps/spine-api/test/auth.test.ts` — this is bus/TokenStore behavior, so
the spine-api suite owns it):

- [ ] `create_actor` appends `token.issued` on stream `actor/<id>` with payload
      `{tokenHashPrefix}` (8 hex chars), system-actor authored, causation = the
      create_actor event; the raw token appears nowhere in any event payload.
- [ ] `reissue_token` appends `token.reissued` with the new hash prefix.
- [ ] `list_tokens` appends nothing (reads never append).

Implementation:

- [ ] Engine API `noteTokenEvent({actorId, kind: 'issued'|'reissued', tokenHashPrefix})`
      in both engines (the engine owns the log; TokenStore stays log-blind).
- [ ] `apps/spine-api/src/bus.ts`: call it after `tokens.issue(...)` in `create_actor`
      (~line 147) and in `reissue_token` (~lines 638–646). Hash prefix comes from the
      sha256 the TokenStore already computes (`apps/spine-api/src/auth.ts`).

## 8.5 Visibility-filtered event egress

Pin: `pnpm -C packages/core test && pnpm -C apps/spine-api test`

Tests first (core: `packages/core/test/collab.test.ts` additions; spine-api: SSE test):

- [ ] Non-participant querying events sees no events whose stream is a `private`
      thread; a participant sees them; a `governance role = auditor` actor sees them
      (that role exists for exactly this).
- [ ] SSE: two concurrent authenticated streams (participant / non-participant) receive
      different event sets for the same posted message; `Last-Event-ID` resume still
      works for the filtered stream (ids are the global seq — gaps are expected and
      documented in the test).

Implementation:

- [ ] Engine: `eventsVisibleTo(actorId, streamId?)` in both engines — same as
      `events()` minus events on `thread/<id>` streams where the thread is
      `visibility='private'` and the actor is neither participant nor auditor/admin.
- [ ] `apps/spine-api/src/bus.ts` `query_events` (~line 583) switches to it.
- [ ] `apps/spine-api/src/sse.ts`: the relay applies the same predicate per connection
      (ctx is already authenticated there); the `EventTail` interface is unchanged.

## 8.6 Minimal agent child env and port drift

Pin: `pnpm -C packages/runner test`

Tests first (runner e2e — use an agent-cmd of `env > "$WORKTREE/env.txt"` style):

- [ ] Child env contains `PATH HOME OAHS_SPEC_FILE OAHS_STORY_ID` and everything from
      `--agent-env`; contains none of `OAHS_TOKEN OAHS_ADMIN_TOKEN OAHS_MODEL_API_KEY
      SSH_AUTH_SOCK`.
- [ ] Jobs loop child same, with `OAHS_CONTEXT_FILE OAHS_REPLY_FILE` instead of the
      dispatch pair.
- [ ] With `--inherit-env`, the old full-environment behavior returns (BYO opt-in).

Implementation:

- [ ] `packages/runner/src/index.ts` (~line 747) and `packages/runner/src/jobs.ts`
      (~line 166): replace the `{...process.env, ...}` spread with a built allowlist
      env `{PATH, HOME, LANG, LC_ALL, TMPDIR, SHELL}` (only keys that are set) +
      `agentEnv` + the dispatch/job variables; add `inheritEnv?: boolean` to the
      options both loops already take, threaded from `oahs work --inherit-env`.
- [ ] The runner process itself keeps its full environment (it does the git push —
      `SSH_AUTH_SOCK` stays available to the parent, not the child).
- [ ] Port drift: `apps/oahs/Dockerfile` lines 50/59 `4517` → `4521`;
      `make docker-build && docker run --rm oahs:local --help` still exits 0; compose
      healthcheck already targets 4521.
- [ ] Document in `docs/oahs/01-cai-dat-va-van-hanh.md`: model keys for BYO agents go
      through `--agent-env` or the agent CLI's own config, never inherited.
