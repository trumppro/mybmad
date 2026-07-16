# oahs — Open Agents Harness System

The deterministic spine built in this fork, per [product-thesis.md](product-thesis.md) and [product-roadmap.md](product-roadmap.md). BMAD content (`src/`) is the worker playbook layer; `packages/` + `apps/` are the platform. **AI does the work, rules run the process, permissioned actors hold the gates.**

> Hướng dẫn sử dụng & vận hành đầy đủ (tiếng Việt): [docs/oahs/](docs/oahs/README.md).

## Map

| Path | What it is |
|---|---|
| `packages/core` | The Rules layer as code: lifecycle FSM, claims (lease + fencing), gates, evidence verdicts, event log, reconciler. The conformance suite in `test/` **is the specification** — written first from the BMAD prose rules; see [CONFORMANCE.md](packages/core/test/CONFORMANCE.md). No LLM SDK may ever be imported here. |
| `packages/contracts` | One zod registry = every command. HTTP routes, MCP tools, and the typed client are all generated from it — "MCP ≡ HTTP" is structural. |
| `packages/db` | Drizzle schema + async `PgEngine` (a faithful port of the memory engine; races lose by DB constraint). A synckit+PGlite facade runs the **unmodified** core conformance suite against real Postgres semantics. |
| `apps/spine-api` | Fastify: `POST /rpc/<command>` + stateless MCP at `/mcp`, one command bus behind both. Bearer-token auth per actor. |
| `apps/oahs` | The `oahs` binary: `serve`, gate-holder commands (`inbox`, `approve`, `reject`, `advance`, `status`, `events`), admin (`actor`, `grant`, `feature`, `import`), and `work` (the runner). |
| `packages/runner` | The BYO worker loop: claim → claim-named worktree → mirror-on-dispatch → invoke coding agent → parse HALT → pinned verification (allowlisted) → push → submit raw evidence. The runner measures; the core judges. |
| `delivery/` | The platform's own backlog (feature spec folders with `stories.yaml`). |

## Quickstart (dogfood)

```bash
# 1. Serve the spine (durable PGlite in .oahs/data; use docker-compose.yml + DATABASE_URL for real Postgres later)
OAHS_ADMIN_TOKEN=change-me node apps/oahs/bin/oahs.mjs serve --data .oahs/data

# 2. Bootstrap actors (admin token) — grants are explicit; no actor holds a gate it wasn't granted
export OAHS_TOKEN=change-me
oahs actor create --type user  --name "PO"        # → id + token
oahs actor create --type agent --name "Dev agent" # → id + token
oahs grant <po> task.plan; oahs grant <po> gate.spec.approve; oahs grant <po> gate.review.approve; oahs grant <po> feature.init
oahs grant <dev> task.claim; oahs grant <dev> task.advance; oahs grant <dev> task.block

# 3. Work items are born in git (roadmap D9)
export OAHS_TOKEN=<po-token>
oahs feature create
oahs import <featureId> delivery/phase-1-spine-mvp/stories.yaml

# 4. PO lifecycle: draft → approve the spec, pinning the verification commands (D7)
oahs advance <storyId> --to draft
oahs inbox
oahs approve <storyId> --gate spec_approval --pin "pnpm -C packages/core test"

# 5. Run the worker on a dev machine (unmodified bmad-dev-auto as the playbook)
OAHS_TOKEN=<dev-agent-token> oahs work \
  --repo /path/to/target/project --spec-folder delivery/phase-1-spine-mvp \
  --agent-cmd 'claude -p "Use the bmad-dev-auto skill. spec_folder: {SPEC_FOLDER}  story_id: {STORY_ID}  {INVOKE_WITH}" --permission-mode acceptEdits'

# 6. Review gate — a human decision, from the terminal, no YAML files opened
oahs inbox
oahs approve <storyId> --gate review_approval    # passes only if pinned tests exited 0,
                                                 # the diff is non-empty, and the commit is on the remote
oahs events <workItemId>                         # audit: who, under what grant, on what evidence — a query, not an interview
```

MCP: every command is also an MCP tool (`oahs_*`) at `POST /mcp` — point Claude Code at it and ask "how's the sprint" through the same rails.

### Entitlements (Phase 2 — roadmap §3)

Entitlement = **plan × governance role × delivery role**, resolved by a pure function; `authz` shows the replayable trace:

```bash
oahs role assign <actorId> reviewer          # delivery-role bundles (product_owner, tech_lead, reviewer, developer, qa, contributor)
oahs governance set <actorId> admin          # who may perform gated entitlement writes
oahs plan set team                           # a CEILING for agent gate grants — never a grant itself
oahs policy set --agent-gate-approvals false # restrict-only: narrows the plan, never widens it
oahs gate-policy set review_approval --min-approvals 2 --require-type user
                                             # quorum + human-in-the-loop as DATA, not hardcode
oahs authz <actorId> gate.review.approve     # ALLOWED/DENIED + source + plan/policy trace + version tuple
```

The Phase 2 exit criterion is a live test in three places (memory, PGlite, HTTP): an agent granted **only** `gate.review.reject` can fire the rejection loopback but is denied done-approval — same actor, same deterministic check, different grant.

### Collaboration (Phase 3 — roadmap §5)

Threads, messages, mentions, notifications, agent jobs — with the sacred boundary machine-pinned: **chat never mutates lifecycle**; the server never parses message text (mentions are structured actor ids); the only cross-direction is rails → chat (system narration of every state change into bound task threads).

```bash
oahs thread create --kind task --work-item <id> --feature <fid>
oahs post <threadId> "please pick this up" --mention <agentActorId>
                       # deterministic mention router: default-deny who_may_invoke,
                       # policy kill-switch, agent-mention-agent depth cap — a job is
                       # reply-only context, never a claim
oahs messages <threadId>      # system narration renders inline (kind=system)
oahs jobs --status queued     # what the router materialized
oahs job done <jobId>         # only the job's agent may complete; mentioner notified
oahs notifications --unread
oahs advise next-task --thread <id>   # deterministic advisor bots: read + post only —
oahs advise reconcile --thread <id> --file <wi>=<status>  # zero gates in their audit trail
```

**Web UI** (first surface): `oahs serve` then open `http://localhost:4521/ui` — threads, live messages over SSE (`/events/stream`, cursor resume), a composer with structured mentions, and a gate inbox whose Approve/Reject buttons call `/rpc/approve_gate|reject_gate` directly ("gates pass through rails, not chat").

### Non-coding teammates (Phase 4 — roadmap §1.4)

The worker broadens: work items carry a **kind** (`code | spec_draft | design_review | qa_report | doc`) that selects which machine-evidence guards apply — never who may pass a gate. Doc kinds gate on **document lint** instead of diffs, and their done gate needs no commit — completion is machine-checkable doc evidence plus the permitted decision. *A checklist an LLM ticked is neither.*

```bash
oahs personas provision      # the six BMAD personas as agent actors — floor-state:
                             # Amelia holds developer, everyone else contributor,
                             # NOBODY holds a gate until explicitly granted
oahs actors                  # everyone, personaCode included
oahs item create --feature <fid> --key prd-change-1 --kind spec_draft \
  --title "PRD change: rate limits"
oahs doclint draft.md --require-section Intent --require-section Rollout \
  --work-item prd-change-1 --submit    # deterministic measuring tool: frontmatter,
                                       # sections, placeholder scan → doc_lint evidence
```

The Phase 4 exit criterion is a live test (memory, PGlite, HTTP): a PRD change **drafted by the PM agent** (under explicitly granted authority), **reviewed by a reviewer agent** (report as context, rejection as its granted loopback), **approved by a human PO** through the gate — three actor kinds, one rails, all three visible in the item's audit trail.

### Learning teammates (Phase 5 — roadmap §6, Hermes)

The worker **deepens**: a teammate runtime polls the router-materialized agent jobs and answers through the rails, with a workspace-scoped, visibility-filtered **memory** the platform governs. A [maturity spike](delivery/phase-5-hermes/SPIKE.md) decided the integration: **build nothing Hermes-specific into the spine** — Hermes ([Nous Research](https://github.com/NousResearch/hermes-agent), MIT) is just one `--agent-cmd` profile and one MCP client with an agent bearer token; Claude Code is another. Two memory layers, deliberately: Hermes' own internal learning loop makes the worker better at its craft; the spine's memory is the auditable store.

```bash
# The teammate runtime — pluggable brain. The agent reads a context file
# ({job, messages, recalled memories}) and writes a reply file; the runtime
# posts it through the rails, completes the job, and records an episodic memory.
OAHS_TOKEN=<agent-token> oahs work --jobs \
  --agent-cmd 'node my-teammate.mjs'          # or: hermes --print < "$OAHS_CONTEXT_FILE" > "$OAHS_REPLY_FILE"
oahs memory --query "verification"            # owner-scoped: only this token's agent
oahs stats reviews                            # review-loop iterations per kind — the "improves week-over-week" metric
```

**The guardrail is architectural, not a prompt** (thesis; §6): the memory API has no cross-actor parameter and no path to grants; a memory-rich agent is not one grant richer; memory events never carry content (private learning stays out of the shared audit log); and the MCP tool registry is versioned spine code with no "agent registers a tool" endpoint (pinned by a before/after `tools/list` equality test). *Learning makes the worker better, never more authorized.*

### Model gateway (Phase 6 §2.5)

A multi-provider gateway at the **runtime layer** — between agent runtimes and providers. `@oahs/gateway` speaks the OpenAI-compatible protocol (works with 9router, OpenRouter, or any compatible endpoint), routes friendly names to provider model ids, and meters token usage. **The deterministic spine is never a client of it** — an invariant grep keeps `@oahs/gateway` out of `core`, `db`, `contracts`, and `spine-api` (§0.1; the grep holds today but runs by hand — CI enforcement is Phase 8, roadmap §8). Config comes from env, never hardcoded:

```bash
cp .env.example .env    # OAHS_MODEL_BASE_URL, OAHS_MODEL_API_KEY, OAHS_MODEL_DEFAULT
oahs models             # list the router's models
oahs ping --message "…" # a real completion, with token usage

# The real-LLM teammate brain — a pluggable agent-cmd. It reads the job
# context ({messages, memories}), calls the gateway, writes the reply.
OAHS_TOKEN=<agent-token> oahs work --jobs \
  --agent-cmd "node $(pwd)/bin/oahs-brain.mjs"
```

**Verified end-to-end against a live router**: a teammate driven by a real model read a mention, drafted a genuine PRD rate-limiting analysis, asked the PO a clarifying question back — all through the rails — recorded an episodic memory, and (audited) touched **zero** lifecycle events, holding no gate it wasn't granted. *AI does the work; rules run the process; permissioned actors hold the gates — now with a real AI.*

## Invariants

- **No LLM SDK inside the spine** — grep-lint; the spine never interprets, it checks. *(Truth note 2026-07: the grep is a manual habit — no CI runs it or the oahs test suites yet. Phase 8 (roadmap §8) makes these machine-checked for real.)*
- **No writes outside the command bus** — HTTP, MCP, CLI, and runner all execute the same handlers.
- **Evidence is measured, verdicts are computed**: pinned commands only (an LLM-authored command is never a guard), fencing tokens on every worker mutation, empty diff = fake-done deny, push required for the done gate.
- **Reconciliation is detect-only** (D6). Chat, when it lands (Phase 3), never mutates lifecycle.

## Testing

```bash
pnpm -C packages/core test    # 115 conformance tests — THE spec (memory engine)
pnpm -C packages/db test      # the same 115 against PGlite/Postgres + ping
pnpm -C apps/spine-api test   # auth, golden flow over HTTP, MCP≡HTTP parity
pnpm -C apps/oahs test        # CLI e2e, durable-restart persistence, binary smoke
pnpm -C packages/runner test  # worker loop e2e: happy path, allowlist refusal, crash+adopt, blocked routing
```

Changing a conformance test is changing the spec: record it in [CONFORMANCE.md](packages/core/test/CONFORMANCE.md) with the same rigor as a roadmap edit.

## Trust boundary (Phase 1, BYO)

Evidence collected on a developer machine is as strong as the honest-operator assumption — sufficient for dogfood and team use. Enterprise done-gates add independent server-side CI evidence, and later server-side sandboxes (roadmap §4.3, Phase 6). Stated here so nobody mistakes the floor for the ceiling.

## Status

Phases 0–5 ✅, **Phase 6 model gateway ✅ (part 1)**, **Phase 7 "Cockpit" ✅ — all four waves**: parallel projects for one operator (1 spine, N projects). W1 correctness + ops recovery (feature-scoped runners, event timestamps, durable-by-default serve, unified port 4521, narration/backoff/transcripts, `whoami`/`claim ls`/`token reissue`); W2 the Project spine (Project entity above features, per-project externalKeys with `<slug>:<key>` handles, wall-clock leases + runner heartbeats — a kill -9'd runner's claim frees itself and the finished worktree is adopted without re-running the agent, per-project agent memory with a global craft tier); W3 the cockpit UI (`/ui` opens on a portfolio dashboard: project rollups, gates awaiting a human with project labels + pinned commands, live runner registry; project board, work-item detail with the full evidence trail, Playwright-verified); W4 ergonomics (profile store `~/.oahs/config.json` + `--as` named identities, `oahs init` one-command bootstrap, `oahs work --manifest` supervisor — blank machine → two projects running in parallel in **4 commands, 2 processes, zero token copying**). Enterprise items (SSO/SCIM, RLS multi-tenancy, licensing) stay deferred indefinitely.

**Next — Phases 8–12** (roadmap §8–§12, added 2026-07 from the Actorium architecture review, `docs/ref/ai_workflow_and_architecture.pdf`): §8 hardening & the trust floor (net-new CI, gated ops surface, env hygiene), §9 the feature-layer contract (design gate, intent hash wired, atomic reviewer dispatch), §10 execution isolation (job-bound tokens, dispatcher as sole spawn-privilege holder — D13), §11 the knowledge layer (pgvector search, spec read surface, `impact_report` evidence — D12/D14), §12 service topology (three compose stacks, `@oahs/auth`). Backlogs: [delivery/phase-8](delivery/phase-8-hardening/stories.yaml) through [phase-12](delivery/phase-12-topology/stories.yaml). Day-to-day operations for the two live roles (PO, Tech Lead) are written up in the Vietnamese ops handbook [docs/oahs/04](docs/oahs/04-so-tay-van-hanh.md), adapted from the [operations manual](docs/ref/actorium-user-manual.pdf); `tools/team-seed.sh` seeds the role setup it describes.

**Truth notes** (docs must match code): the schema today is single-workspace — there is **no `workspace_id` column** on any table (multi-project lands as a first-class `project` entity in Wave 2); the append-only event log is real, and since Wave 1 each event carries `occurred_at`. Grants store a `scope` column that is **not yet enforced**. The one remaining operational habit is dogfood discipline: keep running platform stories through the spine and enforce *no platform work outside the spine*.
