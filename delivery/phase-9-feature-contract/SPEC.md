# Phase 9 — The feature-layer contract

Feature spec for roadmap §9: the department handoff (PO spec → tech-lead design → breakdown → execution → **handoff**) as gate-fired feature states, plus the three concurrency/integrity holes the Actorium review confirmed at the task layer, plus the operational tail the ops manual specifies (`docs/ref/actorium-user-manual.pdf`; team handbook `docs/oahs/04-so-tay-van-hanh.md`): cancelled, reject-and-resubmit loops, and PR-based merge. Exit criterion (roadmap Build phases): a feature walks PO-spec → TL-design → breakdown → execution → handoff through gates and reaches done only via handoff approval; cancelled only through the privileged cancel path; two concurrent reviewer dispatches materialize exactly one review job; editing a frozen spec after approval trips the intent-hash guard; a task's PR is opened automatically and `pr.merged_into_default` evidence records the merge.

## Scope

- Feature FSM `backlog → spec → design → breakdown → executing → handoff → done` as a versioned transition table; `cancelled` terminal via privileged `feature.cancel` (compensating event, `state.downgrade` mold); new `design_approval` and `handoff_approval` gate codes; gate rejections loop back one step (system-fired + causation, the `rejectGate` pattern — "nothing lost, goes back a step"); `feature.advance` becomes a checked permission; epic-lift maps onto `executing`; three-state features stay valid as the degenerate pipeline (back-compat pinned in conformance tests, never by editing history).
- Handoff, then done: projector *permits* `executing → handoff` when all children are done; a permitted actor commands it; `handoff_approval` (the §3 product_owner "feature acceptance") fires `handoff → done`; handoff rejection loops back to `executing`.
- Intent hash wired end-to-end: measuring side submits the canonical hash as evidence at spec approval; engine pins it; guard re-verifies at `ready_for_dev → in_progress`; `intent.edit`-gated re-baseline command. Pure functions in `packages/core/src/intent-hash.ts` already exist and are tested.
- Atomic reviewer dispatch: claim kind `review` (partial unique per item+kind, lease, fencing) or `assign_reviewer` with a per-round unique constraint; the router materializes exactly one review job when an item enters `in_review`. Races lose by constraint.
- Atomic `claim_agent_job` (`queued → in_progress`, agent-owned, lease + partial unique index) — closes the jobs double-reply race and unlocks multi-replica teammate runtimes.
- GitHub PR integration: runner opens a PR from `claim/<claimId>` on advance to `in_review` (`pr.opened` evidence); measuring side verifies `pr.merged_into_default` via the forge API; whether done *requires* merged is gate-policy data (§3), never hardcode; D7 unchanged.
- Feature board & workspace UI: cockpit features board grouped by stage (including cancelled); per-feature workspace tabs Spec / Design / Tasks / Handoff / Activity; blocked tasks show a suggested next step from the `blocked_reason` taxonomy (runbook table in `docs/oahs/04`).

## Out of scope (later phases)

Dispatcher/containers (§10), knowledge surfaces (§11), non-GitHub forges (the evidence kinds are forge-neutral; only the first adapter is GitHub), `dispatch_task` fusion (optional §9 item — take it only if the reviewer-dispatch work makes it free).
