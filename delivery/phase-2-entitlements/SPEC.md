# Phase 2 — Entitlements

Feature spec for roadmap §3: **entitlement = plan × governance role × delivery role**, resolved by a pure function over versioned data. Exit criterion (roadmap Build phases): a reviewer-agent granted rejection-loopback but not done-approval — the system allows the first, denies the second.

## Scope

- New permission `gate.review.reject`; rejection authority = approve OR reject (additive).
- Delivery-role catalog (product_owner, tech_lead, reviewer, developer, qa, contributor) with assign/revoke as gated, audited writes.
- Governance roles (admin/member/auditor) guarding all entitlement writes.
- Plan ceilings (free/team/enterprise) binding agent gate grants at grant AND resolve time.
- Restrict-only workspace policy (`agentGateApprovals`, `agentSelfDispatch`).
- Gate definitions as data: `minApprovals` (distinct approvers per review round), `requiredActorTypes`.
- `authz.explain` — replayable decision trace with plan/policy version tuple.
- Full parity: memory engine, PgEngine, HTTP+MCP commands, CLI.

## Out of scope (later phases)

Org layer above workspace (P7), per-feature role scopes, SSO/SCIM, policy simulator UI, mention-router consumption of `agentSelfDispatch` (P3).
