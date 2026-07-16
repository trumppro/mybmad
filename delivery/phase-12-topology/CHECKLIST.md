# Phase 12 checklist — service topology

Global rules: see [delivery/README.md](../README.md). The Actorium three-stack deployment
as compose profiles, not microservices (K8s stays banned by the YAGNI list). The spine
stays the only writer to its DB.

Depends on: 10.1 (scoped tokens, extended by 12.1), 10.2 + 11.4 (the runtime and knowledge
services 12.2 composes), 11.1 (real Postgres for 12.3's LISTEN/NOTIFY).

## 12.1 Extract oahs auth package

Pin: `pnpm -C apps/spine-api test`

Tests first:

- [ ] Move the existing `auth.test.ts` assertions to `packages/auth/test/` and keep them
      green (behavior-preserving extraction — TokenStore hashing, persistence, bootstrap
      admin, and the 10.1 scoped-token rules all move intact).
- [ ] Per-token TTL: an issued token with a TTL resolves before expiry, returns `null`
      after (distinct from the claim-scoped expiry of 10.1 — this is a plain-token TTL).
- [ ] Per-token revocation: revoking one token of an actor leaves the actor's other
      tokens valid (today `reissue` nukes all — `apps/spine-api/src/auth.ts` ~line 92).

Implementation:

- [ ] `packages/auth` (new): `TokenStore`, `ResolvedToken`, `hashToken`, and an
      exported `authenticate(store)` factory (today a closure inside
      `apps/spine-api/src/server.ts` ~line 92). `apps/spine-api` imports it; no behavior
      change. Naming note in the package README: `@oahs/auth` is authentication;
      `@oahs/gateway` is the model gateway — different concerns, similar names.
- [ ] Add `expiresAt?` (plain TTL) and per-token `revoke(tokenHash)`; `PersistShape`
      versioned bump with a forward migration.
- [ ] CLI: `oahs token issue --ttl`, `oahs token revoke <tokenHash>`.
- [ ] OIDC user sign-in: an `/auth/oidc` login route (authorization-code flow, provider
      configured by env — Google/OIDC) that resolves or creates the user actor and issues
      a session token; provider linking is automatic on sign-in (the portal shape). Agents
      and runners keep bearer tokens; full SSO/SCIM stays §7. A test drives the flow with a
      stub OIDC provider (injectable, no live IdP in CI).

## 12.2 Compose profiles as three stacks

Pin: `pnpm -C apps/oahs test`

Tests first (a compose-config lint test in `apps/oahs/test/`, parsing the YAML — no live
containers in CI):

- [ ] `docker compose --profile product config` yields exactly the spine + UI service;
      `--profile runtime` yields dispatcher + runner image; `--profile knowledge` yields
      postgres + pgvector + indexer; no profile pulls another's services.
- [ ] The `oahs` (product) service declares no `env_file: .env` (model keys are a runtime
      concern — assert the key does not appear on the product service).

Implementation:

- [ ] `docker-compose.yaml`: assign `profiles` to every service — `product` (oahs, from
      the existing image), `runtime` (dispatcher from 10.2, runner image), `knowledge`
      (postgres, indexer from 11.4). Keep the durable-PGlite single-container path working
      with **no profile** (the zero-infra default must not regress).
- [ ] `docs/oahs/01-cai-dat-va-van-hanh.md`: the one-container path and the three-stack
      path, side by side, with when-to-use.

## 12.3 Transactional outbox for the event stream

Pin: `pnpm -C apps/spine-api test`

Tests first:

- [ ] With two `EventStreamOptions` consumers over the same engine, an outbox tail
      delivers each event once, in order, with `Last-Event-ID` resume — identical
      externally to today's `pollingEventTail` (`apps/spine-api/src/sse.ts` ~line 25) but
      without the 300 ms poll (assert via a fake clock that no polling interval is armed).
- [ ] Correct across two spine-api instances against one Postgres (gated on
      `DATABASE_URL` from 11.1; skipped-with-log otherwise).

Implementation:

- [ ] `apps/spine-api/src/outbox-tail.ts`: an `EventTail` implementation using Postgres
      `LISTEN`/`NOTIFY` (the engine already appends events in-transaction — add a
      `NOTIFY oahs_events` in the same tx on the Postgres path). Swap it in behind the
      unchanged `EventTail` interface in `sse.ts`; `pollingEventTail` stays the fallback
      for the PGlite single-node path.

## 12.4 Durable runner registry

Pin: `pnpm -C packages/core test && pnpm -C apps/spine-api test`

Tests first:

- [ ] `runner_announce`/`runner_heartbeat`/exit append events on a `runner/<id>` stream
      (they are permissioned since 8.3); the fleet view is rebuilt from those events and
      survives a spine restart (today `RunnerRegistry` is an in-memory Map,
      `apps/spine-api/src/runners.ts` ~line 26, blanked on restart); a runner silent past
      its TTL reads as stale from the event history, not from process memory.

Implementation:

- [ ] Move runner liveness into the engine as events (`runner.announced`,
      `runner.heartbeat`, `runner.exited`); `list_runners` becomes a projection over the
      `runner` streams with a computed `stale` flag. Remove the in-memory Map; the cockpit
      panel reads the projection.

## 12.5 Webhook notification egress

Pin: `pnpm -C apps/oahs test`

Tests first (injectable fetch):

- [ ] A webhook sink consuming `/events/stream` (resumable via `Last-Event-ID`) POSTs
      notification-worthy events to a configured URL with an HMAC signature header and
      retry-with-backoff; it persists its cursor so a restart resumes without dupes past
      the last-acked id; delivery failure does not affect spine state (egress only).

Implementation:

- [ ] `apps/oahs/src/webhook.ts` + `oahs webhook --url <u> --secret <s>` (a long-running
      consumer, sibling of the jobs loop); it authenticates as an actor with read access,
      applies the 8.5 visibility filter, signs with the secret, and retries. No schema
      change — it is a pure SSE consumer.
- [ ] `docs/oahs/01-cai-dat-va-van-hanh.md`: webhook setup; note that Slack/Lark bridges
      are just a receiver of this webhook and stay out of scope.

## 12.6 Chat channels, DMs, and saved messages

Pin: `pnpm -C packages/core test && pnpm -C packages/db test`

Tests first (extend `packages/core/test/collab.test.ts`):

- [ ] A `channel` thread (`kind='channel'`, `feature_id` null) accepts messages from any
      workspace participant; a `dm` thread (`kind='dm'`, `visibility='private'`) enforces
      exactly two participants; `saved` bookmarks are per-actor and private to the actor.
- [ ] The sacred boundary holds: posting in a channel or DM appends no lifecycle event and
      the mention router behaves identically (default-deny, depth cap) — §5.2/§5.4 pins
      stay green.

Implementation:

- [ ] Extend the `thread.kind` enum with `channel` and `dm` (idempotent) and add a
      `saved_messages(actor_id, message_id)` table; `create_thread` accepts the new kinds;
      a `save_message`/`unsave_message` command pair.
- [ ] `apps/spine-api/ui-src/views/chat.ts`: Channels + DMs + Saved sections in the chat
      sidebar (the portal's shape), all over the existing thread/message rails.

## 12.7 Usage view over the Meter

Pin: `pnpm -C apps/spine-api test`

Tests first:

- [ ] A read-only `get_usage({scope, since?})` aggregates the `Meter` JSONL ledger
      (`packages/gateway/src/meter.ts`) into per-model / per-route token totals; it is
      `readonly` in the registry and appends no event.

Implementation:

- [ ] `get_usage` contracts + bus reading the ledger; `apps/spine-api/ui-src/views/usage.ts`
      renders totals under a Settings → Usage tab (the portal shape). No new metering — the
      `Meter` sink is unchanged.
