# Phase 11 — The knowledge layer

Feature spec for roadmap §11: specs, decisions, task history, and code structure searchable by agents and humans the way a new hire asks a teammate. Constraints are the point (D12/D14): the knowledge layer lives outside the spine, reads artifacts that live in git (D3), its output is never a gate guard, and its store is pgvector inside Postgres/PGlite — no new vector service. Exit criterion (roadmap Build phases): an agent asks "what does this feature mean / what does this change touch" over MCP and gets a cited answer; memory recall is relevance-ranked, not newest-20.

## Scope

- `DATABASE_URL` activation in `packages/db` (PgEngine already targets drizzle pg-core; the compose postgres profile exists, dormant). PGlite stays the zero-infra default.
- Memory search pushed into SQL (ILIKE/tsvector) behind the unchanged `search_agent_memory` contract; additive pgvector `embedding` column on `agent_memories`; jobs-runtime recall becomes relevance-ranked.
- Spec read surface (first, smallest): read-only `get_spec_content` over `projects.repoPath` + `work_items.spec_path` so the item page shows the gate-holder the document they are approving. Sequencing: this story and the teammate-context wiring lead the phase — the ops manual (`docs/ref/actorium-user-manual.pdf` §4) expects teammates to answer "by citing the workspace's own documents", so the read surface cannot wait for the indexer.
- Knowledge service (new package outside the spine + compose profile): indexer over spec folders, threads/messages (respecting `sourceVisibility` — nothing private indexed into an open context), and event narration; embeddings via the model gateway (provider grows an `/embeddings` call); read-only MCP tool `search_knowledge` with citations; per-project scoping.
- Code graph as a measuring tool: deterministic runner-side indexer (tree-sitter / TS compiler API) emitting a new `impact_report` evidence kind — machine-collected facts for reviewers, never a gate condition.
- `oahs memory distill`: gateway-powered episodic→procedural consolidation, owner-scoped, inside the learning-never-authority pins — `procedural` memory stops being a stub.

## Out of scope (later phases)

A queryable code-graph *server* (revisit once `impact_report` proves useful), per-workspace isolation (waits for §7 tenancy), document storage as a service (never — D3), knowledge output as a guard (never — D12).
