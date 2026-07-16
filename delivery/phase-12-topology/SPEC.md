# Phase 12 — Service topology

Feature spec for roadmap §12: the Actorium three-stack deployment shape adopted as compose profiles, not microservices (K8s stays banned per YAGNI). Knowledge is long-lived shared infrastructure, the runtime fleet scales with task volume, the product app is the one thing a human opens. Exit criterion (roadmap Build phases): the three compose profiles deploy and scale independently; a second service consumes `@oahs/auth` without copying code.

## Scope

- `@oahs/auth` extracted + OIDC: TokenStore + `authenticate()` (today a closure inside `buildServer`) become a reusable package — the seam toward central auth without building a gateway service today. Token TTL and per-token revocation land here. A user OIDC sign-in path (Google/OIDC, automatic provider linking — the portal-standard shape); agents and runners keep bearer tokens.
- Chat channels, DMs, saved (portal parity, §5.5): `channel` = a `thread` with `kind='channel'` and no `feature_id`; `DM` = `kind='dm'`, private, two participants; `saved` = a per-actor bookmark over `message`. Sacred boundary unchanged — never mutates lifecycle.
- Usage view over the `Meter` JSONL ledger — a read-only cockpit surface the portal exposes under Settings; no new metering.
- Compose profiles as the three stacks: `product` (spine + UI), `runtime` (dispatcher + runner images), `knowledge` (postgres + pgvector + indexer). Each starts alone; the spine stays the only writer to its DB.
- Transactional outbox behind the existing `EventTail` interface, replacing the 300 ms SSE poll — required the moment two spine-api instances exist.
- Durable runner registry: announce/heartbeat/exit become events on a `runner` stream instead of an in-memory Map; the fleet panel survives restarts; runner history is auditable.
- Notification egress: a webhook sink consuming `/events/stream` (resumable via Last-Event-ID) — zero schema change.

## Out of scope (deferred with reasons, not forgotten)

`workspace_id`/RLS tenancy and the Organization layer above Workspace (§7 — the hardcoded workspace constant in the PG engine is the one point to parameterize when that turn comes; OIDC user sign-in lands here in story 1, full SSO/SCIM stays §7), Slack/Lark bridges (until someone needs one), K8s (never).
