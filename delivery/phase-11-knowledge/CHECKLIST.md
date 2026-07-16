# Phase 11 checklist — the knowledge layer

Global rules: see [delivery/README.md](../README.md). Constraints are the point (D12/D14):
the knowledge layer lives **outside** `packages/{core,db,contracts}` and `apps/spine-api`
(§0.1), reads artifacts that live in git (D3), its output is **never a gate guard** (D12),
and its store is **pgvector inside Postgres/PGlite** (D14) — no standalone vector service.

Order: **11.3 and the teammate-context wiring lead** (the ops manual expects
document-citing teammates from day one); **11.1 precedes 11.2 and 11.4** (they need real
Postgres for pgvector).

## 11.1 DATABASE_URL activation

Pin: `pnpm -C packages/db test`

Tests first (`packages/db/test/database-url.test.ts`, new; gated on a reachable Postgres
via `DATABASE_URL`, skipped-with-log otherwise so CI without a DB stays green):

- [ ] The same unmodified core conformance suite that runs against PGlite passes against a
      real Postgres 16 when `DATABASE_URL` is set (reuse the `setup-pg.ts` factory swap the
      db suite already uses).
- [ ] Durable restart: a second engine instance over the same `DATABASE_URL` recovers
      `globalSeq` and state (mirror the PGlite `recoverSeq` test).

Implementation:

- [ ] `packages/db/src/pg-driver.ts` (new): when `DATABASE_URL` is set, back the engine
      with the `postgres` client (already a dependency, `packages/db/package.json`) instead
      of the PGlite synckit worker; expose it behind the existing `createPgSyncEngine`
      factory (`packages/db/src/sync-engine.ts`) so `apps/oahs/src/serve.ts` chooses by
      env with no call-site change. PGlite stays the default when `DATABASE_URL` is unset.
- [ ] Schema init runs the same idempotent `schema-sql.ts` DDL against Postgres; add a
      `pgvector` guard: `CREATE EXTENSION IF NOT EXISTS vector` runs only on the Postgres
      path (PGlite loads the extension differently — see 11.2).
- [ ] `docs/oahs/01-cai-dat-va-van-hanh.md`: document `DATABASE_URL`, and
      `docker compose --profile postgres up` as the real-DB path.

## 11.2 SQL and vector memory search

Pin: `pnpm -C packages/db test`

Tests first:

- [ ] `searchAgentMemory` returns owner-scoped rows filtered by an SQL predicate (ILIKE
      on content) — no full-table scan into JS (today `pg-engine.ts` ~line 2169 loads all
      of the agent's rows and substring-filters in memory); the owner-scoping and
      `sourceVisibility` pins from Phase 5 stay green.
- [ ] With an `embedding` present, `searchAgentMemory({query, byVector:true})` orders by
      cosine distance; without one it falls back to ILIKE. Recall in the jobs runtime uses
      the ranked path (replaces `slice(-20)` at `packages/runner/src/jobs.ts` ~line 144).

Implementation:

- [ ] `agent_memories` gains `embedding vector(N)` NULL (idempotent ALTER; N = the
      configured model's dimension, a constant in one place). PGlite: load the pgvector
      extension in `packages/db/src/worker.ts` at init; Postgres: the extension from 11.1.
- [ ] `pg-engine.searchAgentMemory`: SQL predicate + optional `ORDER BY embedding <=>
      $query` when a query vector is supplied; contract unchanged (add optional
      `byVector`/`queryEmbedding` inputs).
- [ ] Embeddings are computed **outside the spine** — the indexer (11.4) or the runtime,
      via the gateway (11.4 adds the provider call). The spine only stores and compares
      vectors; it never calls a model (§0.1 grep from 8.1 stays green — assert no
      `@oahs/gateway` import creeps into `packages/db`).

## 11.3 Spec read surface

Pin: `pnpm -C apps/spine-api test`

Tests first:

- [ ] `get_spec_content({workItemId})` returns `{path, content}` reading
      `projects.repoPath` + `work_items.spec_path`; missing file → `GuardFailedError`
      (`spec_not_found`), never a throw; path traversal outside the repo → denied.
- [ ] It is `readonly` in the contracts registry (so the MCP `readOnlyHint` and the
      8.5 event-egress rules treat it correctly); it appends no event.

Implementation:

- [ ] Contracts `get_spec_content` def (readonly); bus case reads the file with a
      realpath-under-repoRoot check; engine exposes `repoPath`/`specPath` it already
      stores. This is the one place the spine reads a working-tree file for a human — it
      is a read, not a write path, and it is not a guard (D3/D12 both hold).
- [ ] UI item page (`apps/spine-api/ui-src/views/item.ts` ~line 104, today shows the path
      string) renders the body; the 9.7 feature-workspace Spec/Design tabs light up.

## 11.4 Knowledge indexer and search_knowledge

Pin: `pnpm -C packages/knowledge test`

New package **outside the spine** (`packages/knowledge`, may import `@oahs/gateway` and
`@oahs/contracts` client; must not be imported by core/db/contracts/spine-api — the 8.1
grep list gains `packages/knowledge` as a forbidden import target for the spine).

Tests first:

- [ ] The indexer reads sources through the rails and git — spec folders (via
      `get_spec_content`), open threads/messages (via `list_messages`) — and **never**
      indexes a `private` thread into an open scope (assert a private message is absent
      from open-scope results); embeds via an injectable gateway client; upserts into
      `knowledge_chunks` (source ref, scope, `embedding`).
- [ ] `search_knowledge({query, scope})` returns ranked chunks with citations (source
      kind + id/path); results are read-only and carry no authority.

Implementation:

- [ ] `packages/knowledge/src/indexer.ts` (incremental: last-indexed cursor per source),
      `search.ts`, a small CLI `oahs-knowledge index|search`, and a compose `indexer`
      service under the `knowledge` profile.
- [ ] `packages/gateway/src/provider.ts`: add `embed(texts): number[][]` to `Provider`
      and `OpenAICompatibleProvider` (`POST {base}/embeddings`), injectable fetch like
      `complete`.
- [ ] `search_knowledge` reaches agents/humans as a **read-only MCP tool** exposed by the
      knowledge service's own thin MCP surface (not the spine's) — keeping the spine free
      of the knowledge dependency; the teammate brain (`apps/oahs/src/agent-brain.ts`) may
      call it to answer "by citing the workspace's own documents".

## 11.5 Code-graph impact evidence

Pin: `pnpm -C packages/runner test`

Tests first:

- [ ] A deterministic indexer over the diff of a claim produces an `impact_report`
      evidence `{symbols:[...], files:[...], affectedCallers:[...]}` for a fixture repo;
      identical input → identical output (no model, no network — pure static analysis).
- [ ] It is evidence only: `checkReviewEvidence` never reads it (assert the done gate is
      unaffected by its presence/absence — D12).

Implementation:

- [ ] `packages/runner/src/impact.ts`: TS-first via the TypeScript compiler API (already
      transitively available), language-agnostic fallback via file/symbol heuristics;
      emit `impact_report` evidence after the `git_diff` step in `runOnce`.
- [ ] Evidence kind `impact_report` in contracts; the item page and 9.7 Tasks tab render
      it for reviewers.

## 11.6 Memory distillation

Pin: `pnpm -C apps/oahs test`

Tests first:

- [ ] `oahs memory distill` (agent-scoped, via the gateway) reads an agent's episodic
      memories and writes `procedural` ones (the kind exists in schema/vocab since
      Phase 5 and nothing writes it today); owner-scoping and the no-content-in-event-log
      pin hold; distillation adds no grant and no lifecycle call (learning-never-authority,
      §6).
- [ ] Running it twice is idempotent-ish: it does not re-summarize already-distilled
      spans (a cursor in the memory rows).

Implementation:

- [ ] `apps/oahs/src/commands/memory-distill.ts`: pull episodic via
      `search_agent_memory`, summarize through the gateway, `append_agent_memory` with
      `kind:'procedural'`; the LLM call is in the CLI/runtime, never the spine.
- [ ] `oahs memory distill` command; `docs/oahs/02-huong-dan-su-dung.md` documents it in
      the learning-teammate section.

## 11.7 Agent self-review evidence

Pin: `pnpm -C packages/runner test`

Tests first:

- [ ] A runner phase after `git_diff` and before advancing to `in_review`: the agent is
      invoked (fake agent-cmd in the test) under the `self_review` route and its critique
      is submitted as `self_review` evidence `{summary, concerns:[...]}`.
- [ ] Evidence only: `checkReviewEvidence` never reads `self_review` (assert the done gate
      is unaffected by its presence/absence — D12); an LLM grading its own work is never a
      guard.

Implementation:

- [ ] Evidence kind `self_review` in contracts; `packages/runner/src/index.ts` adds the
      phase after the diff step, routing the model via the `self_review` policy (11.8);
      skipped-with-log when no self-review model is configured.
- [ ] The item page and the 9.7 Tasks tab render it alongside `impact_report`.

## 11.8 Per-phase model policy and Model Policies UI

Pin: `pnpm -C packages/gateway test && pnpm -C apps/spine-api test`

Tests first:

- [ ] `set_model_policy({scope, phase, models:[...]})` stores a versioned policy keyed by
      phase (`pr_description`, `suggested_next_step`, `self_review`, `implementation`,
      `conflict_resolution`), scoped per workspace/project; `get_model_policy` reads it;
      an unknown phase is rejected by the zod enum.
- [ ] The gateway resolves a phase to its ordered model list, falling back to the next
      model on provider error and to the system default when the list is empty (extend the
      gateway route test).
- [ ] `§0.1` grep still green — the policy lives in `packages/gateway` + a contracts
      command; the spine (`core|db|contracts|spine-api`) still never imports `@oahs/gateway`
      and never calls a model (the runner/dispatcher reads the resolved model and calls it).

Implementation:

- [ ] `packages/gateway/src/gateway.ts`: replace the per-persona route map with a
      per-phase policy resolver + fallback chain; `loadGatewayFromEnv` keeps the system
      default, the per-phase policy comes from the store.
- [ ] `set_model_policy`/`get_model_policy` contracts + bus; storage is a small
      `model_policies` table (scope, phase, ordered model list) — data, like `gate_policies`.
- [ ] `apps/spine-api/ui-src/views/model-policies.ts`: the cockpit Model Policies view
      (one card per phase, an ordered model list with add/remove), mutating via the rails.
