# Conformance suite

This suite is the **specification** of the spine engine. It was written *before* any engine code, translated from the prose rules in the BMAD source (`bmad-sprint-planning`, `bmad-dev-auto`, `bmad-quick-dev`, `stories-schema.md`) as arbitrated in [product-roadmap.md](../../../product-roadmap.md) §1. The engine (`src/`) is implemented to make this suite pass — never the other way around. **Do not edit tests to fit an implementation**; a test change is a spec change and needs the same review as a roadmap edit.

Run: `pnpm test` (in `packages/core`). History: the suite was born **113 red / 2 green** against `NotImplementedError` stubs; the in-memory reference engine (story "1"–"10" domain, `src/engine.ts`) turned it **115/115 green**. Two inter-cluster contradictions surfaced during implementation and were arbitrated below (marked ⚖); each required editing exactly one pin, recorded here.

Files: `fsm-transitions` (14) · `blocked-overlay` (9) · `epic-lift` (4) · `claims` (17) · `concurrency` (7) · `gates-evidence` (12) · `review-loop` (6) · `stories-import` (13) · `intent-hash` (12) · `checkpoints-dispatch` (12) · `reconcile` (9).

## Interpretation pins

Where the prose was ambiguous or sources conflicted, the suite **pins one reading**. Changing a pin = changing the spec. The load-bearing ones:

### Arbitrated conflicts (roadmap wins over playbook prose)
- **Epic-lift trigger**: sprint-planning says "when first story is *created*"; roadmap §1.2 says "first child *leaving backlog*". Suite follows the roadmap: `createWorkItem` does not lift; `backlog→draft` does.
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

### Event log
- `streamSeq` is 1-based and gap-free per stream; which setup commands emit work-item events is unpinned (tests count deltas, not absolutes).
- System-actor authorship (epic-lift, loopback) is asserted structurally: event `actorId` differs from every fixture-created actor and carries a `causationId`.
- `stateVersion` is pinned strictly monotonic, not +1-per-mutation.
