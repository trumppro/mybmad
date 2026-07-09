# Phase 6 (part 1) — Model gateway

Feature spec for roadmap §2.5: a multi-provider model gateway at the **runtime layer**, between agent runtimes and providers. The deterministic spine is never a client of it (§0.1 lint invariant). This slice connects a real OpenAI-compatible router (9router) and drives a genuine end-to-end run with a real LLM brain — the operational proof the platform had been deferring.

## Scope (this slice)

- `@oahs/gateway`: OpenAI-compatible provider client (non-streaming), model routing (aliases → provider model ids), token metering (usage ledger), config from env/options — never hardcoded keys.
- `oahs models` / `oahs ping`: list and smoke-test the configured router.
- `oahs brain` + `bin/oahs-brain.mjs`: a real LLM agent-cmd for the teammate jobs runtime — reads the job context, calls the gateway, writes a reply. Pluggable brain proven with a real model.
- E2E: a real story flows through the spine driven by a real model, with the human holding the gate.

## Invariant preserved

`packages/core`, `packages/db`, `packages/contracts`, `apps/spine-api` never import `@oahs/gateway`. The gateway lives on the agent-cmd / runner side. Verified by grep in CI.

## Out of scope (deferred — genuinely heavy)

Server-side sandboxes (containers running untrusted repo code), per-tenant KMS key vault, per-plan quota enforcement, billing integration. These are the rest of Phase 6 and belong after the platform has paying-shaped usage. The gateway is built vault-ready (config injection) so they slot in without a rewrite.
