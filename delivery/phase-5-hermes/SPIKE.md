# Spike: hermes-agent maturity assessment (Phase 5 gate)

Roadmap §6 scheduled this spike before any Hermes work. Assessed 2026-07-09 against a shallow clone of `github.com/NousResearch/hermes-agent` (main).

## Findings

| Question | Finding |
|---|---|
| Exists / maintained? | Yes — active repo, multi-language READMEs, desktop app, docs site, Discord. ~6k files. |
| License | MIT — compatible. |
| Runtime shape | Python 3.11 + uv; installs a `hermes` CLI; runs as a **long-lived gateway process** (Telegram/Discord/Slack/CLI/TUI) or one-shot CLI runs. Six terminal backends (local, Docker, SSH, Modal, Daytona…) — a genuinely persistent runtime, matching the roadmap's "teammate = long-lived process". |
| Learning loop | Real and internal: agent-curated memory with nudges, autonomous skill creation, skills self-improve, FTS5 session search, Honcho user modeling. Model-agnostic (any provider, `hermes model` switch). |
| Skills format | **agentskills.io open standard — the same format as the BMAD playbooks.** The BMAD installer has shipped a `hermes-agent` target (`~/.hermes/skills`) since v6.9. |
| MCP | Both directions: Hermes is an **MCP client** ("connect any MCP server") and ships an MCP server for its messaging surface. |

## Decision

**Integrate via the seams we already have — build no Hermes-specific code into the spine.**

1. The **teammate runtime** is oahs-generic: `oahs work --jobs` polls router-materialized agent jobs and invokes a pluggable `--agent-cmd`. Hermes is one command profile; Claude Code is another. The spine does not know which brain answered.
2. **Hermes consumes oahs through the same rails as everyone**: its MCP client points at `POST /mcp` with the agent's bearer token — whitelisted tools only, no DB credential, no git credential, no tool-registration API (registry is versioned spine code, now pinned by test).
3. **Two memory layers, deliberately**: Hermes' internal learning loop (its own local memory/skills) makes the worker better at its craft; the **spine's workspace-scoped memory** (`append/search_agent_memory`) is the auditable, visibility-filtered store the platform governs. Learning in either layer never changes a single authz outcome — pinned.
4. BMAD playbooks reach Hermes through the **existing installer** (`--tools hermes-agent`), untouched.

## Residual risks

- Hermes one-shot CLI semantics may change (young project, fast churn) — contained: it only affects the `--agent-cmd` template string, never the spine.
- Running Hermes needs its own install + model keys — the exit-criterion E2E therefore uses a fake agent command (same discipline as the Phase 1 runner tests); a live Hermes run is an operational step for the owner.
