# Phase 10 — Execution isolation

Feature spec for roadmap §10 (completes §4.3 per D13): exactly one process may spawn work, and the thing that decides what runs never touches the credentials that run it. BYO (§4.1) stays first-class — the dispatcher runs the same dispatch contract on infrastructure instead of a laptop. Exit criterion (roadmap Build phases): a story completes end-to-end where the agent container never sees a static spine token or a push credential; kill -9 of a runner produces `claim.expired` in the event log and on the cockpit.

## Scope

- Job-bound tokens (delivers roadmap §2.3's promise): `mint_claim_token(claimId)` → TokenStore entry `{actorId, claimId, allowedCommands, expiresAt = leaseExpiresAt}`; scope + expiry on resolved tokens; bus-side allowlist check; the static runner token authenticates only polling and claiming.
- Dispatcher: `oahs dispatch` — the ONLY process bound to the docker socket; polls/claims like `workLoop`, spawns one container per claim (coding CLI + git + `oahs work --once`), injects the job-bound token and a push credential scoped to `refs/heads/claim/<claimId>` — or pushes itself post-run so containers never see push credentials. Compose gains a `dispatcher` service; `env_file: .env` moves off the spine service.
- Dispatch-start branch push (baseline) so cross-machine adoption of a dead machine's finished work works without an LLM re-dispatch.
- Server-side lease reaper: observed expiry appends `claim.expired` (system actor, causation to the claim) + notification; cockpit surfaces the item as re-dispatchable.
- Live transcripts: agent stdout/stderr streamed incrementally to `.oahs/logs/<claimId>.log`; survives runner death; cockpit live-tail.

## Out of scope (later phases)

Knowledge stack containers (§11), compose 3-stack split (§12), verification-allowlist tightening beyond first-token (revisit once containers raise the floor), K8s (never per YAGNI).
