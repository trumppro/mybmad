# Phase 8 — Hardening & the trust floor

Feature spec for roadmap §8: before any new layer, the claims the docs already make must be true and the wire surface must stop trusting politeness. Every story is a defect fix or the enforcement of an existing promise. Exit criterion (roadmap Build phases): CI is green and enforces both spine-purity greps (§0.1 LLM-SDK, §2.5 gateway-import); a zero-grant actor is denied `force_release_claim` in all three harnesses (memory, PGlite, HTTP).

## Scope

- Net-new CI workflow (D15): `make check` + the two spine-purity greps (no LLM-provider SDK — §0.1; no `@oahs/gateway` import — §2.5), separate from upstream BMAD workflows.
- Retro-fill of `delivery/phase-7-cockpit/` — already landed together with this documentation set; recorded in the roadmap §8 bullet, nothing left to build.
- `forceReleaseClaim` implemented in the engine, gated on `ops.force_release_claim` (tech_lead bundle), audited — today the bus command is open to any authenticated actor.
- `heartbeat`/`release_claim` verify the caller (claim-holder actor or presented fencing token).
- `runner_announce`/`runner_heartbeat` permission-checked so the cockpit fleet panel cannot be spoofed.
- Token ops (`create_actor` issuance, `list_tokens`, `reissue_token`) append system-actor audit events (id + hash prefix, never the token).
- `query_events` + `/events/stream` filter/mask private-thread events for non-participants.
- Minimal agent child env in the coding loop and the jobs loop (PATH/HOME/LANG + explicit `agentEnv` + dispatch placeholders; `OAHS_TOKEN`, `OAHS_MODEL_*`, `SSH_AUTH_SOCK` excluded unless opted in).
- Dockerfile/compose port drift (4517 → 4521).

## Out of scope (later phases)

Job-bound scoped tokens and the dispatcher (§10), token TTL/per-token revocation (§12), OIDC (§7).
