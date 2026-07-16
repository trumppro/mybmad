# delivery/ — the platform's own backlog

Every phase folder holds the same three artifacts:

| File | What it is |
|---|---|
| `SPEC.md` | The feature spec: scope, exit criterion, out-of-scope. Mirrors a roadmap §. |
| `stories.yaml` | The importable backlog (roadmap D9) — `oahs import <featureId> <path>`. |
| `CHECKLIST.md` | The implementation checklist: per story — tests to write first, exact files to change, acceptance boxes, the verification command to pin at the spec gate. Phases 8–12 only (1–7 shipped before the checklist convention existed). |

Phases 1–7 are shipped (see git log and `OAHS.md` Status). The remaining work to complete
the product is **phases 8–12**, in that order. This README is the master checklist.

## Build order and dependencies

```
Phase 8 (hardening)     — no dependencies; do first, it fixes live authz holes
Phase 9 (feature layer) — independent of 8 except CI (8.1) should be green first
Phase 10 (isolation)    — 10.1 job tokens ← used by 10.2 dispatcher ← 10.3 push guard
Phase 11 (knowledge)    — 11.1 DATABASE_URL ← 11.2 memory search, 11.4 indexer
Phase 12 (topology)     — 12.1 auth package ← builds on 10.1 scoped tokens;
                          12.2 compose stacks ← needs 10.2 + 11.4;
                          12.3 outbox ← needs 11.1 (LISTEN/NOTIFY on real Postgres)
```

Within a phase, stories are ordered; a story never depends on a later one.

## Global definition of done (applies to every story)

- [ ] **Conformance-first.** New engine behavior starts as failing tests in
      `packages/core/test/` and a pin recorded in `packages/core/test/CONFORMANCE.md`;
      the engine is written to make them green, then ported to
      `packages/db/src/pg-engine.ts` — the db vitest config re-runs the unmodified core
      suite against PGlite, so parity is not optional.
- [ ] **One command bus.** New commands are one `def(...)` in
      `packages/contracts/src/index.ts`, one `case` in `apps/spine-api/src/bus.ts`,
      surfaced by both HTTP and MCP automatically; `apps/spine-api/test/parity.test.ts`
      must stay green (it deep-equals the two surfaces).
- [ ] **No LLM SDK and no `@oahs/gateway` import** inside `packages/{core,db,contracts}`
      or `apps/spine-api` (§0.1) — CI enforces this from story 8.1 onward.
- [ ] **Events for every mutation**, appended in the same transaction, with actor and
      causation. Reads never append events.
- [ ] **No unfinished-work markers.** Shipped code and docs must pass the doclint
      scanner's marker set (`packages/runner/src/doclint.ts`, `PLACEHOLDER_RE`) — the
      only permitted occurrences are doclint itself and its fixtures.
- [ ] `make check` green (typecheck + every suite); new behavior has tests in the suite
      that owns it (core / db / spine-api / runner / oahs).
- [ ] Docs that the story makes stale are updated in the same story
      (`OAHS.md`, `docs/oahs/01–04`, roadmap truth notes).

## Working the backlog through the spine (dogfood)

```bash
# one-time: serve + seed the two-role team
OAHS_ADMIN_TOKEN=<admin> node apps/oahs/bin/oahs.mjs serve --data ~/.oahs/data
OAHS_ADMIN_TOKEN=<admin> ./tools/team-seed.sh

# per phase: import, then gate per story with the pin from its CHECKLIST.md
oahs feature create
oahs import <featureId> delivery/phase-8-hardening/stories.yaml
oahs advance 1 --to draft
oahs approve 1 --gate spec_approval --pin "<pin command from CHECKLIST.md §8.1>"
```

The pin is the story's verification command (D7): the runner executes it, the core
requires exit 0 before the review gate can pass.

## Recorded but not scheduled

Kept on the record so nothing silently drops; none block phases 8–12:
enterprise §7 items (OIDC/SSO/SCIM, RLS `workspace_id` tenancy, audit export signing,
licensing); per-feature role scopes and enforcement of the grants `scope` column;
multi-CLI runner neutrality test (§4.1); generating `stories.yaml` from DB for
UI-created items; Slack/Lark notification bridges (12.5 ships the webhook they would
consume); model-gateway per-tenant key vault, per-plan quotas, and billing
(`delivery/phase-6-gateway/SPEC.md` deferred them as genuinely heavy); a queryable
code-graph *server* (11.5 ships the evidence-producing indexer first).
