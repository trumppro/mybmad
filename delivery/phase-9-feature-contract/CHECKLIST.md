# Phase 9 checklist — the feature-layer contract

Global rules: see [delivery/README.md](../README.md). Operational source:
`docs/ref/actorium-user-manual.pdf`; team handbook `docs/oahs/04-so-tay-van-hanh.md`.

## 9.1 Feature FSM with design and handoff gates

Pin: `pnpm -C packages/core test && pnpm -C packages/db test`

Vocabulary decisions (make them in `packages/core/src/types.ts`, record in CONFORMANCE.md):

- [ ] `FEATURE_STATES = ['backlog','spec','design','breakdown','executing','handoff','done','cancelled']`.
      The existing `in_progress` feature state is **renamed to `executing`** — add an
      idempotent data migration in `packages/db/src/schema-sql.ts` (`UPDATE features SET
      state='executing' WHERE state='in_progress'`, guarded to run once via the existing
      ALTER-IF-NOT-EXISTS upgrade pattern) and update the conformance pins that name it.
- [ ] `GateCode` gains `design_approval` and `handoff_approval` (today it is
      `'spec_approval' | 'review_approval'` only).
- [ ] Permissions gain `gate.design.approve`, `gate.handoff.approve`, `feature.cancel`.
      Bundles: `tech_lead` += `gate.design.approve`; `product_owner` +=
      `gate.handoff.approve` (the §3 "feature acceptance") and `feature.cancel`
      (cancelling is a product decision).

Tests first (`packages/core/test/feature-fsm.test.ts`, new; ~20 cases):

- [ ] Full happy walk `backlog→spec→design→breakdown→executing→handoff→done` where every
      arrow is either a permitted `feature_advance` or a gate firing.
- [ ] Denials: `feature_advance` without `feature.advance` grant; each gate approval
      without its grant; `feature.cancel` without the grant.
- [ ] Rejection loopbacks: rejecting the spec gate returns `design→spec`... precisely:
      reject at `design_approval` fires `design → spec`; reject at `handoff_approval`
      fires `handoff → executing`; both system-actor authored with `causationId` = the
      gate decision (mirror `rejectGate`, `packages/core/src/engine.ts` ~line 1166).
- [ ] Cancel: reachable from every non-terminal state, only via `feature.cancel`,
      appends a compensating `feature.cancelled` event; `done` and `cancelled` are
      terminal (no edges out).
- [ ] Degenerate back-compat: a feature that never advances past `backlog` still
      epic-lifts to `executing` when its first child leaves backlog (the projector edge
      skips the gated stages — pin this explicitly); feature gates never block task-level
      work that is already flowing.
- [ ] Gate policies apply: `set_gate_policy` rows keyed by the new gate codes govern
      quorum/actor-type exactly as for `spec_approval` (the `gate_policies` table is
      already keyed by gate code — extend the zod enum in contracts).

Implementation:

- [ ] `packages/core/src/engine.ts`: `FEATURE_TRANSITIONS` table (from/to/permission/
      guards) next to the work-item `TRANSITIONS`; commands `featureAdvance`,
      `approveFeatureGate`, `rejectFeatureGate`, `cancelFeature`. Feature gate decisions
      persist in `gate_decisions` — add nullable `feature_id` column (idempotent ALTER in
      `packages/db/src/schema-sql.ts` + drizzle `packages/db/src/schema.ts`) with a CHECK
      that exactly one of `work_item_id`/`feature_id` is set.
- [ ] Epic-lift (`engine.ts` ~lines 963–972) targets `executing`; port everything to
      `packages/db/src/pg-engine.ts`.
- [ ] Contracts: `feature_advance`, `approve_feature_gate`, `reject_feature_gate`,
      `cancel_feature` defs; bus cases; CLI: `oahs feature advance <fid> --to <state>`,
      `oahs feature approve <fid> --gate <code>`, `oahs feature reject <fid> --gate
      <code>`, `oahs feature cancel <fid>`.
- [ ] Events: `feature.state_changed`, `gate.approved`/`gate.rejected` carrying
      `featureId`, `feature.cancelled`.

Acceptance:

- [ ] Exit-criterion walk passes in all three harnesses (memory, PGlite, HTTP), driven
      by the seeded PO/TL tokens from `tools/team-seed.sh`.

## 9.2 Handoff then done

Pin: `pnpm -C packages/core test && pnpm -C packages/db test`

Tests first (extend `feature-fsm.test.ts`):

- [ ] `feature_advance --to handoff` with a not-done child → `GuardFailedError`
      (`children_done` guard); with all children done → succeeds.
- [ ] `approve_feature_gate handoff_approval` fires `handoff → done`; `Feature.state
      'done'` is reachable **only** through this path (attempted direct
      `feature_advance --to done` is not a defined transition).
- [ ] Handoff rejection loops back to `executing` and increments a per-gate round so
      quorum counts reset (reuse the `round` column semantics of `gate_decisions`).

Implementation:

- [ ] Guard `children_done` in the feature transition table (count work items of the
      feature not in `done`); the projector that *permits* is exactly this guard — no
      state is written automatically.
- [ ] `oahs status` and the dashboard rollup (`apps/spine-api/src/bus.ts` project_list
      read-side) show `handoff` and `cancelled` buckets.

## 9.3 Intent hash wired

Pin: `pnpm -C packages/core test && pnpm -C packages/runner test`

Tests first:

- [ ] Core: approving `spec_approval` with a submitted `intent_hash` evidence pins
      `WorkItem.intentHash` (today it is written once as `null`, `engine.ts` ~line 698);
      the claim-edge guard (`ready_for_dev → in_progress`) passes when the presented
      hash matches and fails `GuardFailedError('intent_changed')` when it differs;
      re-baseline requires `intent.edit` (permission exists, never checked today) and
      appends `intent.rebaselined`.
- [ ] Runner e2e: edit the spec's `<intent-contract>` region after approval → dispatch
      refuses at advance; re-baseline → dispatch proceeds.

Implementation:

- [ ] Evidence kind `intent_hash` (`{algo: 'v1', hash}`) in contracts' evidence enum.
- [ ] Measuring sides: `oahs approve --gate spec_approval --spec-file <path>` computes
      the hash with the existing pure functions (`packages/core/src/intent-hash.ts` —
      `extractIntentRegion`/`canonicalizeForHash`/`computeIntentHash`, already tested)
      and submits it before approving; the runner computes it during mirror-on-dispatch
      (`packages/runner/src/index.ts` ~lines 718–723, where it already reads the spec
      file) and submits it with the `advance_state(in_progress)` call.
- [ ] Engine: store at approval; guard compares stored vs latest submitted; command
      `rebaseline_intent({workItemId, hash})` gated on `intent.edit`.
- [ ] CLI: `oahs intent rebaseline <id> --spec-file <path>`.

## 9.4 Atomic reviewer dispatch

Pin: `pnpm -C packages/core test && pnpm -C packages/db test`

Tests first (`packages/core/test/review-dispatch.test.ts`, new):

- [ ] Two concurrent `claim_review` calls on one `in_review` item: one wins, the loser
      gets `ConflictError`, exactly one live review claim exists (constraint, not
      application logic).
- [ ] A review claim and the work claim coexist (different kinds); fencing tokens are
      per-claim; review-claim mutations present the review token.
- [ ] `claim_review` requires `gate.review.approve` OR `gate.review.reject`.
- [ ] When an item enters `in_review` and the gate policy names an
      `autoDispatchReviewer` actor, exactly one review `agent_job` materializes per
      review round — a second transition into `in_review` in the same round creates
      nothing (uniqueness on `(work_item_id, round, kind='review')`).

Implementation:

- [ ] `claims` gains `kind TEXT NOT NULL DEFAULT 'work'` (idempotent ALTER + drizzle);
      the partial unique index becomes per `(work_item_id, kind)` where not released —
      mirror `claims_one_live_per_item` (`packages/db/src/schema-sql.ts` ~line 111,
      `packages/db/src/schema.ts` ~line 166).
- [ ] Engine `claimReview({workItemId, actorId})` reusing the `claimTask` internals with
      the kind; `agent_jobs` gains nullable `work_item_id` + `review_round` and the
      partial unique index above (table at `schema-sql.ts` ~line 223).
- [ ] `GatePolicy` gains optional `autoDispatchReviewer: actorId`; the `in_review`
      transition effect materializes the job under that policy (engine-side, system
      actor, causation = the state change).
- [ ] Contracts + bus + CLI (`oahs claim review <workItemId>`); `oahs inbox` marks items
      that already have a live review claim.

## 9.5 Atomic agent-job claim

Pin: `pnpm -C packages/core test && pnpm -C packages/runner test`

Tests first:

- [ ] Core: `claim_agent_job` moves `queued → in_progress` with `claimedBy = ctx agent`
      and a lease (`claimExpiresAt = now + 10min`); a second claim on the same job →
      `ConflictError`; `complete_agent_job` requires the claimer; an expired job claim
      frees the job back to `queued` (lazy, on read — the reaper generalizes in 10.4).
- [ ] Runner: two `jobsLoop` instances against one queue produce exactly one reply per
      job (extend `packages/runner/test/` jobs e2e).

Implementation:

- [ ] `agent_jobs` gains `claimed_by`, `claim_expires_at`, `state_version` (idempotent
      ALTERs); status transition is a CAS (`UPDATE ... WHERE status='queued'` — races
      lose by row count, same discipline as work-item claims).
- [ ] Engine `claimAgentJob({jobId, actorId})` in both engines; `runJobsOnce`
      (`packages/runner/src/jobs.ts` — today it takes `queued[0]` at ~line 93 and
      completes after posting) claims first, then reads/replies/completes.
- [ ] Contracts + bus; no CLI needed (runner-internal), but `oahs jobs` shows claim
      state.

## 9.6 GitHub PR integration

Pin: `pnpm -C packages/runner test`

Design constraints: the spine never talks to GitHub; the runner and the gate-holder's
CLI measure, the core judges (§2.3). Forge credentials live only in runner/CLI env
(`OAHS_GITHUB_TOKEN`), never in the spine or its DB.

Tests first (runner suite, with an injectable `fetch` like the gateway's
`OpenAICompatibleProvider`):

- [ ] After the push step, the runner POSTs `/repos/{owner}/{repo}/pulls` with head
      `claim/<claimId>` and base = default branch, and submits `pr` evidence
      `{action:'opened', number, url}`; a re-dispatch on the same claim finds the
      existing open PR (GET by head) and does not duplicate.
- [ ] `oahs approve --gate review_approval --check-merge` GETs the PR, and submits `pr`
      evidence `{action:'merged_into_default', number, mergedSha}` only when GitHub
      reports `merged=true` and base = default branch.
- [ ] Core: with gate policy `requireMergedPr: true` on `review_approval`, the done
      gate fails `checkReviewEvidence` unless the latest `pr` evidence is a merge;
      with the policy off, behavior is exactly today's.

Implementation:

- [ ] `projects` gains nullable `forge_owner`, `forge_repo` (idempotent ALTER +
      `oahs project create --forge owner/repo` and `project update`); the runner reads
      them from the dispatch context.
- [ ] `packages/runner/src/forge.ts` (new): minimal GitHub client (fetch-injectable):
      `openPr`, `findPrByHead`, `getPrMergeState`. Wire into `runOnce` after the push
      step (`packages/runner/src/index.ts` ~line 487) — skip silently-with-log when the
      project has no forge fields (BYO without GitHub keeps working).
- [ ] Evidence kind `pr` in contracts; `GatePolicy.requireMergedPr?: boolean`;
      `checkReviewEvidence` (`packages/core/src/engine.ts` ~line 1142) honors it.
- [ ] CLI: `--check-merge` on `approve`; handbook walkthrough 3 in
      `docs/oahs/04-so-tay-van-hanh.md` updated to the automated flow (drop the
      merge-by-hand caveat, keep it as the no-forge fallback).

## 9.7 Feature board and workspace UI

Pin: `pnpm -C apps/spine-api test && pnpm -C apps/oahs test`

Tests first (follow the existing ui harness used by the Phase 7 cockpit views):

- [ ] Board route renders one column per feature state incl. `cancelled`, cards from
      `project_list`/`get_feature` reads only.
- [ ] Workspace tabs: Tasks (work items of the feature), Handoff (gate panel wired to
      `approve_feature_gate`/`reject_feature_gate`), Activity (existing event stream
      filtered to the feature), Spec and Design (metadata + doclint evidence + spec
      path; the full document body renders once 11.3 `get_spec_content` exists — the
      tab states that dependency as a label, and flips automatically when the command
      is present in the contracts registry).
- [ ] A blocked task shows the suggested next step for its `blockedReason`.

Implementation:

- [ ] `apps/spine-api/ui-src/views/features.ts` (board) + `feature.ts` (workspace) on
      the hash router (`ui-src/core/router.ts`, route table in `ui-src/app.ts`).
- [ ] `ui-src/core/blocked-hints.ts`: the nine-reason → next-step map, transcribed from
      the runbook table in `docs/oahs/04-so-tay-van-hanh.md` (single source: the doc
      cites the module so they cannot drift silently).
- [ ] Gate buttons call `/rpc/approve_feature_gate` etc. — mutations stay on the rails,
      chat/board never bypasses (§5.2 discipline).
