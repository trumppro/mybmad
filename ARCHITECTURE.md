# Architecture — start here

For the **second engineer** (or agent) touching this codebase. `README.md` sells it,
`OAHS.md` maps it, `product-roadmap.md` plans it; this file tells you where code goes and
which rules are not yours to change. Before this existed there was no `ARCHITECTURE.md`,
no per-package README, and the add-a-command recipe lived only inside a Vietnamese
execution plan.

## The one-paragraph version

A work item moves through a **deterministic state machine**. Transitions need a
permission, sometimes a live claim's fencing token, and sometimes machine-collected
evidence. LLMs do work *inside* a task; they never decide whether a gate may pass. The
whole product is that separation, and most of the rules below exist to keep it true when
someone is in a hurry.

## Layers, and the rate at which each may change

| Layer | Where | Changes how |
|---|---|---|
| **Rules** | `packages/core/src` | Only with a conformance test first. This is the spec. |
| **Contracts** | `packages/contracts/src` | One zod registry. HTTP routes, MCP tools and the typed client are all derived from it. |
| **Persistence** | `packages/db/src` | A second implementation of the same rules. Must stay behaviourally identical. |
| **Surfaces** | `apps/spine-api/src` (+ `ui-src`) | Transport only. No decisions. |
| **Runtime** | `packages/runner`, `apps/oahs/src/dispatcher.ts`, `packages/gateway` | Where models live. May call providers; the spine may not. |
| **CLI** | `apps/oahs/src` | Thin `(client, opts) → string` functions over the typed client. |

## The four rules that are not negotiable

1. **No LLM SDK, and no `@oahs/gateway`, inside `packages/{core,db,contracts}` or
   `apps/spine-api`.** Enforced two ways: CI greps, and `make lint-oahs`
   (`no-restricted-imports` against the compiler's module graph — this is the real one).
2. **Every write goes through the command bus.** One registry entry, one `case` in
   `apps/spine-api/src/bus.ts`. The switch ends in `const unwired: never = command`, so a
   registry entry with no case is a compile error.
3. **The conformance suite is the specification.** `packages/core/test/` was written
   before the engine. Do not edit a test to make code pass — if a rule must change, change
   it deliberately and record it in
   [`packages/core/test/CONFORMANCE.md`](packages/core/test/CONFORMANCE.md).
4. **Both engines, always.** Anything you add to `packages/core/src/engine.ts` must be
   ported to `packages/db/src/pg-engine.ts`. `pnpm -C packages/db test` re-runs the entire
   unmodified core suite against PGlite; that parity run is the only thing standing between
   you and two implementations that quietly disagree.

## Adding a command — the whole recipe

1. **Conformance test first**, in `packages/core/test/`. Red.
2. `def(...)` in `packages/contracts/src/index.ts` — input schema and description. This
   one entry produces the HTTP route, the MCP tool, and the client method.
3. Implement in `packages/core/src/engine.ts`. Green.
4. **Port to `packages/db/src/pg-engine.ts`.** Run `pnpm -C packages/db test`.
5. One `case` in `apps/spine-api/src/bus.ts` (the compiler will tell you if you forget).
6. Permission check goes in the **engine**, never the bus — the bus is transport, and the
   CLI and runner reach the engine through the same handlers.
7. Append an event for every mutation, in the same transaction, with an actor.
8. Record the pin in `CONFORMANCE.md` if you changed a rule.

## Fast loops

```bash
pnpm -C packages/core exec vitest run test/claims.test.ts   # one file
pnpm -C packages/core exec vitest                            # watch mode
make typecheck                                               # all 7 packages
make lint-oahs                                               # type-aware, enforces rule 1
make check                                                   # typecheck + lint + every suite
```

`make check` is **one of five** CI jobs — see [AGENTS.md](AGENTS.md) for the four it does
not cover. Green locally is a weaker statement than green on CI.

## Things that will surprise you

- **`serve --data` is a single writer.** Every engine call blocks the Node main thread on
  a synckit round-trip to one PGlite worker thread, so the durable spine serves one
  operation at a time and cannot be replicated (the data-dir lock refuses a second
  process). This is also why `packages/core`'s `SpineEngine` interface is fully
  synchronous — and why activating a real Postgres server is not a small change: it means
  making ~70 methods async, which changes the spec's shape.
- **A killed server's data dir is unopenable for ~20s** while its lock goes stale. Pinned
  in `apps/oahs/test/durability-kill.test.ts`.
- **Two clocks.** Leases use a logical clock by default (`advanceClock`) so tests are
  deterministic; `serve` opts into wall-clock. Never read wall-clock time in a guard.
- **Evidence is append-only and latest-wins.** Guards read the most recent row of a kind.
  That is why `submit_evidence` is permissioned and fenced — see `CONFORMANCE.md` §0.2a.
- **`src/`, `tools/`, `website/` are upstream BMAD**, carried unmodified and load-bearing
  (`src/bmm-skills/4-implementation/bmad-dev-auto` is the canonical `--agent-cmd`). The
  root `package.json` scripts are theirs too — use the `Makefile` for anything oahs.
