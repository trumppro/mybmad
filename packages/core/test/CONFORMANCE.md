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
- Grants decide, actor type never does: an *agent* with `gate.review.approve` approves. `required_actor_types` is Phase-2 gate-definition data, not an engine check.
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
- `createProject` carries no engine-side permission check — deliberately symmetric with `createFeature` (whose `feature.init` convention is enforced at the ops layer, not pinned in the engine).

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
