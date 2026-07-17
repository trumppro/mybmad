# Product Roadmap

> Companion to [product-thesis.md](product-thesis.md). The thesis is the floor — the invariants that never move. This roadmap is the shape of the build: what the spine, surfaces, and teammates look like in practice, and in what order they come to exist. Every section number referenced by the thesis (§2.5 model gateway, §3 entitlements, §5 collaborative chat) resolves here.
>
> Status: **v1 — drafted from the thesis plus a deep audit of the BMAD-METHOD fork this repo is built on.** Decisions marked ⛔ are closed (re-opening requires new evidence, not new taste). Items marked ☐ are genuinely open.

---

## §0 Invariants, glossary, and closed decisions

### §0.1 Invariants (from the thesis, restated as review gates)

Every feature proposal must pass the thesis self-check:

1. Does it move something from the **Rules** layer into the **Agents** layer? → reject.
2. Does it create a surface that bypasses the skills/MCP rails? → reject.
3. Does it agentify something *inside* a task? → almost always accept.
4. Does it let an actor pass a gate by *interpretation* rather than *granted permission*? → reject. This includes the subtle forms: an LLM "deciding" a retry, an LLM grading a gate, a mention auto-advancing state, an LLM-authored command being trusted as evidence.
5. Does the copy say "autonomous"? → rewrite. (The thesis itself uses "autonomous, learning agents" once, in quotes, as a differentiator line — quote it, never paraphrase it into positioning.)

Two invariants are machine-checked in CI from day one:

- **No LLM SDK inside the spine.** The core packages must not import any model-provider SDK. Enforced by a grep step in the platform CI (GitHub Actions `.github/workflows/oahs-ci.yaml`, mirrored on GitLab as `.gitlab-ci.yml`; §8/D15), not a code-review convention.
- **No writes outside the command bus.** No code path other than command handlers/projectors may write projection tables. Lint rule.

### §0.2 Glossary (mandatory vocabulary)

The word "skill" is overloaded three ways in our ecosystem. To keep the thesis distinction legible:

| Term | Meaning | Never call it |
|---|---|---|
| **Tool / command** | Deterministic spine operation (`claim_task`, `approve_gate`, …). The thesis "Skills layer". Code, no prompts. | "skill" |
| **Playbook / worker content** | BMAD skill packages (SKILL.md + customize.toml) that an LLM reads and follows *inside* a task. ~47 exist today. | "spine skill" |
| **Learned skill** | Hermes procedural memory — the worker getting better at its job. Never a mutation path. | bare "skill" |
| **Actor** | A user or an agent. One table, one permission model. | — |
| **Gate** | A deterministic check: permission (grant) + data guards + machine-collected evidence. | — |
| **Claim** | A lease on a work item held by one actor, protected by a fencing token. | "lock" |

### §0.3 Closed decisions ⛔

| # | Decision | Why |
|---|---|---|
| D1 | This roadmap exists in-repo and is the referent for thesis §-references. | The thesis floor needs a resolvable ceiling. |
| D2 | Build a **new spine service**; reuse BMAD content as playbooks; learn from bmad-loop's architecture (evidence verification, worktree isolation, escalation) without porting its code. | BMAD is content + spec + distribution, zero runtime. bmad-loop is single-machine by design. |
| D3 | **Hybrid source of truth**: lifecycle, claims, gates, threads, permissions live in the platform DB; artifacts (PRDs, specs, code) live in git. Spec frontmatter becomes a mirror, never an input. | "State change never through the conversation" — and never through a file an LLM edits freely. |
| D4 | **BYO workers first**: coding CLIs (Claude Code, codex, gemini) on developer machines take dispatches from the spine. Server-side sandboxes and the model gateway come later (§2.5, §4.3). | Near-zero infra to first proof; the 40-IDE distribution pipeline already exists. |
| D5 | Stack: TypeScript + Node 22 + Fastify, PostgreSQL 16 + Drizzle, zod as the single schema source (→ OpenAPI + MCP tool defs), pnpm monorepo inside this fork. Python worker-side scripts stay Python. | One schema source makes "MCP ≡ HTTP semantics" structural. Repo is already Node. |
| D6 | Reconciliation DB↔git is **detect-and-report only**. Auto-adopting hand-edits based on git author identity is rejected permanently (author email is spoofable — it would be an unauthenticated write path into the FSM). Adopting detected drift is an explicit, authenticated command. | Self-check #2. |
| D7 | Verification commands are **pinned at the spec-approval gate** into Rules-layer data. The runner executes only pinned, allowlisted commands. A command an LLM writes into a spec body during implementation is never a guard. | The subtlest form of the trap: interpretation smuggled in through the content of the "evidence". |
| D8 | `blocked` is an **overlay** (`blocked_reason` column), not an FSM state. HALT's blocking-condition taxonomy becomes its enum. | Preserves never-downgrade; unblock restores position without a backward transition. |
| D9 | Work items are **born in git** (`stories.yaml`, per the existing stories schema) and imported idempotently into the spine. `sprint-status.yaml` becomes a report generated *from* the DB. | One direction of truth per datum; the dev-auto dispatch contract keeps working unchanged. |
| D10 | The HALT contract keeps its **two terminal statuses** (`done` \| `blocked`). "Needs input" is `blocked` with condition `awaiting_human_input`. | 47 playbooks stay untouched; routing richness lives in the condition taxonomy. |
| D11 | Product name: **oahs** — Open Agents Harness System. Package scope `@oahs/*`, CLI binary `oahs`. "Spine" remains the internal architecture term for the deterministic core (from the thesis); "oahs" is the product. Satisfies the trademark constraint (the code is MIT; "BMAD" is a trademark of BMad Code LLC — reused content stays attributed, the product carries its own name). | Decided by the product owner, 2026-07-08. |
| D12 | The knowledge layer (§11) is a **read-only surface outside the spine**. RAG/code-graph output is never a gate guard — it is evidence for a permitted actor to consider, or context for an agent. | Self-check #4: retrieval quality must never become interpretive authority. Added 2026-07 from the Actorium architecture review (`docs/ref/ai_workflow_and_architecture.pdf`). |
| D13 | **Spawn privilege and push credentials live only in the dispatcher** (§10). The spine never holds a docker socket, a git credential, or a model key; agent containers see only claim-scoped, lease-bounded credentials. | Actorium's "0 credentials touch the orchestrator", adopted as a closed rule rather than a deployment habit. Strengthens §4.3's "short-lived scoped git credentials". |
| D14 | Vector store = **pgvector inside Postgres/PGlite** — additive columns on existing tables plus knowledge-side tables. No standalone vector-DB service. | D5: one database, one schema source. PGlite ships pgvector, so the zero-infra dev path and the served path stay symmetric. |
| D15 | CI for oahs is a **net-new workflow**, separate from upstream BMAD workflows. | The repo is a BMAD fork; the existing quality gates protect BMAD content, not the platform. Extending them would couple platform CI to upstream merges. |

☐ Open: pricing, hosting, vendor posture remain open per the thesis.

---

## §1 Spine core

The Rules layer as running code. One PostgreSQL database, one command bus, every mutation an event.

### §1.1 Unified work-item model

Three work-item shapes exist in BMAD today (classic story markdown, quick-dev/dev-auto spec frontmatter, `stories.yaml`). They unify into one `work_item` with:

- **States**: `backlog → draft → ready_for_dev → in_progress → in_review → done`, rank-ordered. (`review` ≡ `in-review` from the two legacy vocabularies.)
- **Overlay**: `blocked_reason` (D8) freezes transitions without changing state.
- **Lifecycle-critical fields**: `intent_hash` (hash of the frozen intent region — both `<intent-contract>` and `<frozen-after-approval>` tags are recognized, hashed after canonicalization, algorithm versioned), `review_loop_iteration` (DB is the only counter; exactly 5 loopbacks allowed, the 6th blocks), `pinned_verification` (D7), `state_version` (optimistic concurrency), `invoke_dev_with`, `spec_path` (the single source for spec file naming), checkpoint flags.
- **Checkpoints**: `spec_checkpoint` ⇒ the spec-approval gate is mandatory. `done_checkpoint` ⇒ a **dispatch-level hold** — the story completes normally, but no further dispatch happens in the feature until a permitted actor releases the hold. (This matches the stories-schema semantics; it is not a gate on the story's own transition.)

### §1.2 Lifecycle FSM

A versioned transition table in code — each entry declares `from`, `to`, required `permission`, data `guards`, and `effects`. Translated from the rules BMAD already states in prose (never-downgrade, idempotency, epic-lift) and hardened where prose was ambiguous:

- **Never-downgrade** is an engine invariant. Privileged correction requires the `state.downgrade` permission and writes a compensating event — history is never edited.
- **Gate rejection produces the loopback deterministically**: `reject_gate` fires `in_review → in_progress` as a system effect (actor = system, causation = the gate decision, review-loop incremented). No claim-holder participation required — this closes the reject-after-claim-expiry deadlock.
- **Claims are permitted in `in_progress`/`in_review` when no live claim exists** (resume semantics, matching dev-auto's entry-state routing).
- **Epic-lift** is an idempotent projector rule: the first child leaving `backlog` lifts the feature to `in_progress`; retries no-op. Feature `done` is never automatic — the engine only *permits* it when all children are done and a permitted actor commands it.
- **Dispatching a `done` work item is refused** at `get_task_context`. Follow-up review is a new work item, never a re-dispatch (dev-auto's "done → fresh review" route would otherwise fight the FSM).
- A **system actor** exists per workspace with versioned implicit grants for exactly the projector rules (epic-lift, mirror reconcile) — no event in the log is ever authority-orphaned.

Before the engine is coded, every prose rule in sprint-planning / dev-auto / quick-dev becomes a **conformance test** (Phase 0 exit criterion). The engine is written to make that suite pass — not the other way around.

### §1.3 Claim protocol

- One live claim per work item, enforced by a partial unique index — races lose by constraint, not by application logic.
- Claims carry a **lease** (TTL + heartbeat) and a **monotonic fencing token**. Every worker mutation (`advance_state`, `submit_evidence`, `block_task`, dispatch reporting) must present the token; a stale token gets 409 and an audit event. Zombie workers — the defining failure mode of BYO machines that sleep — cannot overwrite a successor's work.
- Fencing extends into **git space**: branches and worktrees are named by claim id, not work-item id. Two claims never share a branch; diff evidence is only accepted on the branch of the live claim.
- Expired leases return the item to the pool at its current state (never downgraded).

### §1.4 Gate semantics

A gate passes when three deterministic things are simultaneously true:

1. **Permission** — the acting actor holds the grant for this gate in this scope (§3), snapshotted into the decision record.
2. **Guards** — data conditions (dependencies done, intent hash unchanged, review loop under limit, checkpoint satisfied).
3. **Evidence** — machine-collected facts exist and pass: real test exit codes from pinned commands (D7), a non-empty diff between recorded baseline and final revisions, `final_revision_reachable_on_remote` (pushing is part of the HALT contract under a claim). **The spine JUDGES that payload; it does not re-verify it.** The runner runs `git ls-remote` on the operator's machine and submits the boolean; `checkReviewEvidence` reads the LATEST `commit` evidence and requires `reachableOnRemote === true`. It cannot do otherwise and stay a spine: re-verifying means the rules engine speaks git over the network, which §0.1 forbids for exactly the reasons §0.1 exists. This is the honest-operator floor described under "Trust boundary" — platform-verified execution (§4.3) is what would raise it. (This line previously claimed the spine re-verifies. It never has.)

An LLM-written review report is *evidence for a human or permitted actor to consider* — it is never itself a guard. For non-code work: evidence is either machine-checkable (file exists, frontmatter schema-valid, document lint) or a permitted actor's gate decision. A checklist an LLM ticked is neither.

Absent a Verification section, the done gate requires a human decision — it never auto-passes.

### §1.5 Event log

Append-only `event` stream written **in the same transaction** as the projection update (the three invariants of `memlog.py` — chronological append-only, atomic, state-is-a-consequence-of-history — promoted to service level). `UNIQUE(stream_id, stream_seq)` doubles as the optimistic lock. Every event carries actor, payload, idempotency key, and causation — the audit answer to "who did this, under what authority, on what evidence" is a `SELECT`, not an interview. Hash-chaining is computed asynchronously at export time (§7), never on the hot write path. `memlog.py` remains what it is: per-run working memory on the worker side, not the platform event store.

### §1.6 Reconciliation (D6)

The reconciler compares spec frontmatter at HEAD against DB state — **excluding any file under a live claim** (playbooks legitimately write frontmatter mid-run). Divergence produces a notification and a thread comment, never a state change. The one legitimate mirror write is **mirror-on-dispatch**: the runner stamps frontmatter to the DB state inside the claim's worktree immediately before invoking the CLI, so the only moment the file is read as an entry state, it is fresh. The dual-truth transition period is time-boxed: the target state is playbooks calling `advance_state` directly via customize.toml hooks, with frontmatter as an offline-readable cache.

---

## §2 Surfaces

Everything outside the spine. All of them clients of the same command bus (thesis: one set of rails).

### §2.1 HTTP API

Fastify adapter over the command bus. Session auth (OIDC when the web surface lands) for users; token auth for agents and runners. OpenAPI generated from the zod contracts.

### §2.2 MCP server

The same contracts emitted as MCP tool definitions — same handler, same validation, structurally identical semantics (D5). Every read and write the platform supports is an MCP tool; an LLM client is a first-class citizen from Phase 1. First tool set: `list_ready_tasks`, `get_task_context`, `claim_task`/`heartbeat`/`release_claim`, `advance_state`, `block_task`/`unblock_task`, `submit_evidence`, `approve_gate`/`reject_gate`, `import_stories`, `query_events`, plus ops commands (`force_release_claim`, `requeue_dispatch`) so no incident ever justifies a raw DB write.

### §2.3 Worker dispatch

The dev-auto contract, promoted from files to API: dispatch = `{work_item, claim + fencing token, repo/branch-of-claim, playbook ref, spec_folder + story_id + invoke_dev_with}`. The runner (`oahs work`, a small CLI/daemon on the dev machine):

1. polls/claims → creates the claim-named worktree → mirror-on-dispatch,
2. invokes the coding CLI with the playbook untouched (dev-auto as-is),
3. parses HALT + Auto Run Result (submitted verbatim as `halt_report` evidence),
4. runs **pinned** verification commands, pushes the branch,
5. submits raw evidence; **the core computes the verdict** and the transition. The runner measures; it never judges.

Crash recovery is part of the contract: on re-claim, the runner inspects the previous worktree — a decently-finished run (terminal frontmatter + real final commit) is **adopted** (late evidence submission) rather than redone; a wrecked one releases and blocks with `stale_worktree`. Mutations under a dispatch use a **job-bound token** (scope: actor + job + tool whitelist, TTL = lease); the static runner token only authenticates the connection.

Trust boundary, stated honestly: BYO evidence is as strong as the honest-operator assumption. Sufficient for dogfood and team plans; enterprise done-gates additionally require server-side CI evidence (and eventually §4.3 sandboxes).

### §2.4 Dashboard & copilot

Read-only views (sprint state, event log, gate inbox) and later the chat surface (§5) — all reading through the same rails an agent reads through. The human copilot answering "how is the sprint going" is an MCP client, not a YAML reader.

### §2.5 Model gateway

Multi-provider gateway (Anthropic, Bedrock, OpenAI-compatible, self-hosted vLLM) sitting at the **runtime layer** — between agent runtimes and providers. Per-tenant key vault, per-plan quotas, token metering for billing, per-persona routing policy. The spine is never a client of the gateway (no LLM in the control loop is a lint rule, §0.1). BYO phase: the developer's CLI uses their own keys and the gateway is optional. Hermes teammates (§6) and server-side workers (§4.3) require it. This is where the thesis's model-agnostic promise is kept.

**Model policy = per-phase routing, as data (portal parity).** The Actorium operations portal (`docs/ref/`, studied 2026-07-16) configures models not per-persona but **per workflow phase**, workspace-scoped, in a UI, each phase an ordered fallback chain over a system default. Adopt that shape for oahs: routing is a versioned data policy (like gate policy, §3), keyed by the **LLM touchpoints of the workflow** — the phases where an agent, not the spine, calls a model. The starting keys mirror the portal: `pr_description`, `suggested_next_step` (feeds the blocked-task runbook, §9), `self_review` (the agent's pre-review pass, §11), `implementation`, `conflict_resolution` (§10). Every one of these runs **outside the spine** on the runner/dispatcher, so §0.1 holds unchanged — the policy is data the spine stores and the gateway reads, never a model call the spine makes. Configuration surface: a `set_model_policy` command and a Model Policies view in the cockpit (§9.7). Today the gateway routes per-persona and only the `default` route is env-configurable; this replaces that with per-phase data + UI.

---

## §3 Identity & entitlements

**Entitlement = plan × governance role × delivery role**, resolved by a pure function over versioned config/data. No interpretation anywhere in the path.

- **Actors** (§0.2): one table for users and agents. Agents are created explicitly, always with a sponsoring actor. The six BMAD personas provision as six default agent actors per workspace.
- **Plan** is a ceiling — it determines which capabilities exist at all (agent seats, whether agents may hold gate-approval grants, audit retention, SSO, self-host license). Enforced only in the resolver, never as scattered if-checks.
- **Governance roles** (who configures the system): `org_owner`, `workspace_admin`, `compliance_auditor`, `member`.
- **Delivery roles** (who does what in the lifecycle, each mapped to specific gates/permissions): `product_owner` (spec approval, feature acceptance), `tech_lead` (design gate, force-unclaim, merge gate), `reviewer` (review approval / rejection-loopback), `developer` (claim, advance to review with evidence), `qa`, `contributor` (drafts and messages, no state advancement). Scope: workspace or per-feature.
- **Grants are explicit and audited.** An agent with the `developer` grant may self-dispatch — claim a ready task through the same deterministic check a human passes. Tenure, fluency, and memory never confer authority (thesis: a freshly-spun agent *with* the grant can; a veteran without it cannot). Default posture is the thesis floor: no agent holds a gate until a permitted human grants it.
- **Gate definitions are data**: `min_approvals`, `required_actor_types` — an org that wants "at least one human on every merge gate" writes policy, not code. Human-only is a default, not a hardcode.
- **Resolution layering** (from `resolve_customization.py`, hardened): platform defaults → org policy → workspace policy → grant conditions, structural merge, with **restrict-only keys** — security-sensitive settings can only narrow downward. Every authz decision records its policy version tuple; `authz.explain` replays it for an auditor.

---

## §4 Worker runtime

### §4.1 BYO (first)

As §2.3. The existing installer (`tools/installer/`) provisions playbooks to the developer's machine — Phase 1 targets Claude Code only; other CLIs join later through the same dispatch contract as a neutrality test, not an MVP requirement.

### §4.2 Escalation

Blocking conditions route deterministically: taxonomy → notification/mention to the actor holding the relevant gate (Phase 3+: into the task's thread). `review_non_convergence` (6th loopback) can only be released by a review-gate holder.

### §4.3 Server-side sandboxes (later)

Platform-hosted containers running the same dispatch contract, behind the model gateway, with short-lived scoped git credentials. Raises the evidence trust level from honest-operator to platform-verified. Deliberately sequenced after the product has proven value on BYO.

---

## §5 Collaborative chat

The surface the thesis's vision lives on: *Linear/Slack where some assignees are learning agents* — riding the spine, never replacing it.

### §5.1 Shape

A **feature is the unit of collaboration**. It holds many threads: a PO's private spec-drafting session, an open design discussion, a per-task work thread. Humans and agents share threads; everything is scoped by `workspace_id` like everything else.

### §5.2 The sacred boundary

Chat never mutates lifecycle. No server code path parses message text into a transition — "approve" in a message body is a word, not a command. The only lifecycle-adjacent affordances are client-side: gate buttons and slash-commands in the thread call the structured command API directly (same UX comfort, zero server-side NLP). The reverse direction is open: every rails state-change posts a narrated `system_event` message into the relevant thread.

### §5.3 Schema

`thread(id, workspace_id, feature_id, work_item_id?, kind: spec|design|task|general|private, visibility)`;
`message(id, thread_id, seq, author → actor, body, reply_to)` — **`message.author` is a user or an agent**, one column, one table;
`mention(message_id, mentioned_actor, resolution)`; `notification(actor, source, ref)`.

### §5.4 @mention → dispatch (two-way, no interpretation)

A mention of an agent is a **deterministic trigger**, routed by pure code with default-deny policy:

1. Message posts through the rails (participant check).
2. The mention router checks: agent active, mentioning actor permitted to invoke, and — crucially — **any lifecycle mutation the mention causes is authorized against the actor who caused it** (creating a drafting task requires the *mentioner's* grant to create tasks; the claim is checked against the *agent's* grant, and the agent's runtime calls `claim_task` itself — claims are never pre-issued inside a dispatch payload).
3. A job materializes; the agent's runtime picks it up, works inside the task, and finishes via the HALT contract — posting results to the thread and @mentioning a human back when it needs a decision. That reverse mention is a message plus a notification, nothing more.

Agents never subscribe to the raw event bus (an agent building its own control loop over events is the trap wearing a headset). They receive only jobs the router materialized under policy. Agent-mention-agent chains require explicit policy, carry a depth counter, and are rate-limited.

### §5.5 Chat surfaces beyond the per-feature thread (portal parity)

The Actorium portal's Chat is Slack-shaped: **Channels** (persistent topic rooms, not tied to a feature), **DMs** (a private two-person thread), **Sessions** (per-feature agent chat), **Threads**, and **Saved** messages. The oahs schema already carries the general case — a `thread` with a `kind` and `visibility`, an author that is a user or an agent. Extend it, not replace it: `channel` = a `thread` with `kind='channel'` and no `feature_id`; `DM` = `kind='dm'`, `visibility='private'`, exactly two participants; `saved` = a per-actor bookmark table over `message`. The sacred boundary (§5.2) is unchanged — a channel or DM never mutates lifecycle either. This is a Phase-3 extension, sequenced late (§12) since the per-feature thread is the load-bearing surface.

---

## §6 Hermes teammates

The worker deepens (thesis): teammates on [Hermes](https://github.com/nousresearch/hermes-agent) carry a learning loop and persistent memory, joining as a second runtime behind the same dispatch contract — the spine does not change.

- **Memory** is server-side, scoped hard to `workspace_id` (row-level security; deleting a workspace deletes its memory). Recall filters by the visibility of the source context — nothing learned in a private thread surfaces in an open one.
- **Learning never becomes authority or a mutation path — enforced by architecture, not prompts**: a teammate runtime holds only an agent token for whitelisted MCP tools. No DB credential, no spine git credential, no "agent registers a tool" API. The tool registry is versioned spine code. A learned skill changes how the worker *uses* existing tools; grants alone change what it *may* do.
- Everything in Phases 1–4 works without Hermes (Claude Code / codex teammates are fully functional, minus the learning loop) — Hermes maturity is a scheduling risk, not an architectural dependency. A maturity spike happens right after Phase 3.

---

## §7 Enterprise — DEFERRED INDEFINITELY (superseded by "Cockpit")

> **2026-07 reposition:** the operator's priority is parallel projects for ONE
> person on one spine — not procurement. Phase 7 is now **Cockpit** (project
> entity above feature, wall-clock leases + heartbeat, portfolio UI, profile
> store + init wizard + runner supervisor), delivered in 4 waves; Wave 1
> (correctness + ops recovery) is in. The items below stay recorded for a
> future enterprise turn but are not sequenced.

What makes procurement say yes, none of it retrofit if §1 is built right:

- **SSO/SCIM**: OIDC first; identities are already a separate table so SCIM is an adapter. The Actorium portal (studied 2026-07-16) signs in with Google OAuth and manages provider linking automatically — confirming OIDC-first as the market-standard, not a bespoke choice. `@oahs/auth` (§12) is the extraction seam this rides on.
- **Audit export**: the event log (§1.5) exports as JSONL with async hash-chaining — tamper-evidence formalized at export, not bought with hot-path locks. Approval signatures (per-agent keys, optional step-up auth for humans) arrive here.
- **Multi-tenancy — the Organization → Workspace shape (portal parity)**: RLS would turn on here. **Truth note (2026-07): `workspace_id` does NOT yet exist on any table** — the schema is single-workspace today, and multi-project arrives as a first-class `project` entity (Cockpit Wave 2), not tenant columns. When tenancy does land, adopt the portal's two-level model observed live: **Organization** (members, governance roles, billing/usage) **→ Workspace** (repos, features, model policies). oahs's Cockpit `project` maps onto **Workspace**; the **Organization** layer is added above it, and the single hardcoded workspace constant (`pg-engine.ts` `WORKSPACE_ID`) is the one point to parameterize. Self-host = the same docker-compose-able stack with a signed license file acting as the plan layer. The BYO posture is itself a regulated-buyer feature: code and artifacts never leave the customer's infrastructure; the spine holds lifecycle metadata, messages, and evidence hashes.
- **Usage view**: the portal surfaces token usage/billing to the user as a Settings → Usage tab. oahs already has the `Meter` JSONL ledger (§2.5) as the data source; this is a read-only cockpit view over it, no new metering.
- The thesis's open business decisions (pricing, hosting, vendor posture) get closed here at the latest.

---

> **§8–§12 (added 2026-07):** the sections below come from a review against three Actorium inputs — the architecture reference (`docs/ref/ai_workflow_and_architecture.pdf`, a 4-layer design deployed as three stacks), the operations manual (`docs/ref/actorium-user-manual.pdf`, the daily PO/Tech-Lead workflow), and the live operations portal (app.actorium.ai, studied 2026-07-16). The review confirmed the spine already exceeds the reference at the orchestrator layer (fencing tokens, evidence-gated done, entitlements as data — all things to preserve, not revisit; the portal's own gate/dispatch actions are still `PLACEHOLDER` stubs) and found four real gaps: no knowledge layer anywhere in the plan-of-record, no credential-isolated execution runtime, a single-container topology, and an unclosed feature-layer handoff. It also found defects that outrank all of them, collected in §8. The portal added operational detail folded into the sections below (portal-parity notes in §2.5 per-phase model policy, §5.5 chat surfaces, §7 org→workspace + OIDC + Usage, §9 board vocabulary/In-TDD/command palette/repo registry, §10 conflict-resolution, §11 self-review). Each section respects the closed decisions above; where a section adopts an Actorium idea it says which one, and where oahs deliberately diverges it says why. A screen-by-screen comparison lives in `docs/oahs/05-actorium-portal-parity.md`.

## §8 Hardening & the trust floor

Before any new layer is built, the claims the docs already make must be true, and the wire surface must stop trusting politeness. Everything here is a defect fix or the enforcement of an existing promise — no new concepts.

- **CI for the platform, net-new (D15).** The upstream BMAD workflows in `.github/workflows/` never build, typecheck, or test `packages/*`/`apps/*`. The platform pipeline is a net-new **GitHub Actions workflow** `.github/workflows/oahs-ci.yaml` (the repo's primary origin is GitHub), with an identical **`.gitlab-ci.yml` mirror** for the GitLab mirror remote. It runs `make check` plus the two spine-purity greps (no LLM-provider SDK — §0.1; no `@oahs/gateway` import — §2.5; both over `core|db|contracts|spine-api`) and a no-unfinished-work-markers grep over `delivery/` + `docs/oahs/`. This makes the §0.1 invariants machine-checked for real.
- **Close the ungated ops surface.** `force_release_claim` is currently open to ANY authenticated actor — a zero-grant agent can kill any live dispatch and invalidate the working runner's fencing token mid-run; the cockpit UI comment claims an `ops.force_release_claim` check that nothing performs. Implement `forceReleaseClaim` in the engine, gated on `ops.force_release_claim` (already in the tech_lead bundle), appending an audit event. `heartbeat` and `release_claim` verify the caller (claim-holder actor or presented fencing token) — today any party knowing a claimId can keep a zombie lease alive or release someone else's claim. `runner_announce`/`runner_heartbeat` gain a permission check so the fleet panel humans consult cannot be fed by phantom writers.
- **Audit the credential plane.** `create_actor`'s token issuance and `list_tokens`/`reissue_token` never touch the event log — credential operations are invisible to the audit spine. Token ops append system-actor events (actor id + hash prefix, never the token).
- **Event egress respects thread visibility.** `query_events` and `/events/stream` relay the full log to any authenticated actor; private-thread `message.posted` events are metadata-only but leak existence and author. Filter or mask stream events of private threads for non-participants.
- **Agent child env hygiene.** The runner spawns agents with the full `process.env` — the child inherits `OAHS_TOKEN`, `OAHS_MODEL_*`, and the ssh-agent socket (both the coding loop and the jobs loop). Switch to a minimal constructed env (PATH/HOME/LANG + explicit `agentEnv` + the dispatch placeholders), everything else opt-in. This is the cheap half of §10's credential isolation and lands independently of it.
- Housekeeping: Dockerfile port 4517 vs compose/serve 4521 drift; retro-fill `delivery/phase-7-cockpit/` — Phase 7 shipped five commits with no delivery folder, the dogfood policy's first breach (the retro-fill itself landed together with this roadmap edit; recorded here so the breach and its repair are both on the record).

## §9 The feature-layer contract

The Actorium reference makes the department handoff a first-class pipeline: PO writes the product spec → tech lead writes the technical design → the design is broken into tasks → engineering executes, with a human approval gate on every arrow. Its companion operations manual (`docs/ref/actorium-user-manual.pdf`; adapted for this team as `docs/oahs/04-so-tay-van-hanh.md`) adds the operational tail: a **handoff** stage where the PO confirms what shipped matches what was asked, a **cancelled** terminal on the features board, reject-and-resubmit loops where "nothing is lost, it just goes back a step", and review-passed work that a human **merges**. oahs has the task layer (§1) and per-story gates, but the feature above it is three states with no gates, `Feature.state='done'` is unreachable by any code path, and `feature.advance` is granted in role bundles yet checked nowhere. This section closes the handoff, reusing the §1 gate machinery unchanged.

- **Feature FSM**: `backlog → spec → design → breakdown → executing → handoff → done`, a versioned transition table like §1.2, plus a `cancelled` terminal reachable only through a privileged `feature.cancel` command (compensating event, the `state.downgrade` mold — never-downgrade stays intact). Handoff edges are gate-fired: a feature-level spec gate (PO submits, tech lead approves — "is this buildable as written"), a new `design_approval` gate — the design artifact itself is a `design_review`-kind work item (§1.4 kinds exist since Phase 4), so evidence rules come for free — and `handoff_approval` at the end. **Gate rejections loop back one step** (spec rejected → back to spec drafting, design rejected → back to design) as system-fired transitions with causation, exactly like the task-level `rejectGate` (§1.2) — the resubmit loop of the ops manual, deterministic. `feature.advance` becomes a checked permission. Epic-lift (§1.2) maps onto `executing`; existing three-state features remain valid as the degenerate pipeline (back-compat is a conformance concern, resolved at spec time, never by editing history).
- **Handoff, then done**: §1.2 already *specifies* that feature completion is never automatic. This story encodes it: a projector *permits* `executing → handoff` once all children are done, a permitted actor commands it, and the new `handoff_approval` gate (the §3 product_owner "feature acceptance" permission, until now vocabulary) fires `handoff → done`. Rejecting handoff loops back to `executing` — the PO catching "something's off" at the last gate, on the record.
- **Board vocabulary and the In-TDD stage (portal parity).** The live Actorium board groups features as **In Design → In TDD → Ready for Impl → In Implementation → In Handoff → Done → Cancelled**. Map the FSM states onto those labels for the cockpit board (`spec/design`→In Design, a new **In TDD** stage, `breakdown`→Ready for Impl, `executing`→In Implementation, then Handoff/Done/Cancelled). **In TDD** is a real stage, not a rename: between design approval and tasks-ready, the tech lead (or a granted agent) authors the tests and the task breakdown test-first — an interval the current FSM collapses into `breakdown`. Model it as a `breakdown` sub-gate or a `tdd_review` checkpoint whose evidence is "tests exist and are pinned" (D7 — the pinned verification commands are literally the tests written here). The board label is presentation; the gate is the substance.
- **Intent hash, wired.** The pure functions (`extractIntentRegion`/`computeIntentHash`) exist and are tested; `WorkItem.intentHash` is always null and `intent.edit` is never checked. Wire it end-to-end: the measuring side (runner/CLI, which can read the spec file) submits the canonical hash as evidence at spec approval; the engine pins it; a guard re-verifies at `ready_for_dev → in_progress`; a re-baseline command gated on `intent.edit` handles legitimate renegotiation. The runner measures; the core judges (§2.3) — the hash is computed where the file is, compared where the truth is.
- **Atomic reviewer dispatch.** The reference's opening race — two reviewers dispatched onto one item — is open in oahs today: gate decisions deliberately don't require the claim, and nothing serializes review-job materialization (mentions can mint duplicates too). Close it with the same move that closed task claims: a claim of kind `review` (partial unique index per item+kind, lease, fencing) or an `assign_reviewer` command with a per-round unique constraint — races lose by constraint, not by application logic. When an item enters `in_review`, the router materializes exactly one review job through it.
- **Atomic agent-job claim.** `runJobsOnce` takes `queued[0]`, posts the reply, then completes — two jobs loops on one agent double-post before the `already done` guard fires. Add `claim_agent_job` (`queued → in_progress`, agent-owned, lease + partial unique index) — the exact analog of `claims_one_live_per_item`, and the unlock for multi-replica teammate runtimes.
- **Forge integration (GitHub PR) and the repo registry.** The ops manual's review step is "PR passes review → you look over → you merge → done"; oahs today stops at a pushed `claim/<claimId>` branch, and the merge lives outside the tool. Close it the measured-evidence way (§2.3): the runner opens a real PR from the claim branch when the item advances to `in_review` (`pr.opened` evidence), and the measuring side verifies `pr.merged_into_default` through the forge API — machine-collected facts, the core judges. Whether the done gate *requires* merged is **gate-policy data** (§3), never a hardcode; D7 unchanged (the pinned commands stay the only command guards). The **repo registry** follows the portal's Add-repository shape: a workspace tracks repos as `{repoId, gitUrl (SSH), baseBranch}`, and `baseBranch` is the PR/merge target here and the clone source for the §10 dispatcher. oahs's Cockpit `project` grows those fields alongside the existing local `repoPath` (BYO stays valid). Until forge integration lands, the interim runbook (merge by hand, then approve) is written down in `docs/oahs/04`.
- **Feature board, workspace, and command palette (portal parity).** The cockpit gains the portal's surfaces: a **features board** grouped by stage (the board vocabulary above, including `cancelled`); a per-feature **workspace** ("Feature IDE" in the portal) with tabs — Spec / Design / Tasks / Handoff / Activity (Activity is the existing event stream); and a **⌘K command palette**. The palette is nearly free in oahs: the `COMMANDS` registry (`packages/contracts`) already enumerates every command, so the palette is a view over it — NAVIGATE (the `/ui` routes) + ACTIONS (approve / reject / advance / unblock) + AGENT (dispatch) — every entry calling the same rails a human uses. (Notably, these same actions are still `PLACEHOLDER` stubs in the Actorium portal as of 2026-07-16 — oahs already has the deterministic commands behind them.) Blocked tasks show a **suggested next step** from the `blocked_reason` taxonomy (`docs/oahs/04`), and — when the model policy names a `suggested_next_step` model (§2.5) — an LLM-drafted elaboration produced runner-side, as help text, never a guard.

## §10 Execution isolation

Completes §4.3 with the Actorium runtime-layer shape (D13): across the whole deployment, exactly one process may spawn work, and the thing that decides what runs never touches the credentials that run it. BYO (§4.1) remains first-class (D4) — the dispatcher is how the same dispatch contract runs on infrastructure instead of a laptop.

- **Job-bound tokens** — §2.3's promise, unimplemented today. New command `mint_claim_token(claimId)` → a TokenStore entry `{actorId, claimId, allowedCommands: [heartbeat, submit_evidence, advance_state, block_task, release_claim], expiresAt = leaseExpiresAt}`; the runner requests it at claim time and uses it for every dispatch mutation; the static runner token authenticates only polling and claiming. Requires scope + expiry on resolved tokens and a bus-side check.
- **The dispatcher** — a new `oahs dispatch` mode: the ONLY process bound to the docker socket. It polls and claims exactly like `workLoop`, then spawns one container per claim (image = coding CLI + git + `oahs work --once`), injecting the job-bound token and a short-lived push credential scoped to `refs/heads/claim/<claimId>` — or performing the push itself post-run so agent containers never see a push credential at all. Compose gains a `dispatcher` service; the spine container stays credential-free (`env_file: .env` moves off the `oahs` service — the model keys it loads today are never read by serve).
- **Dispatch-start branch push**: push the claim branch at baseline so a second machine can fetch, compare, and adopt a dead machine's finished-but-unreported work — today adoption depends on local marker dirs and cross-machine crash recovery means a full LLM re-dispatch.
- **Server-side lease reaper**: expiry today is lazy (computed at read time); a dead fleet leaves an `in_progress` item invisible until someone polls. On observed expiry, append `claim.expired` (system actor, causation to the claim) + a notification, and surface the item as re-dispatchable on the cockpit.
- **Live transcripts**: stream agent stdout/stderr to `.oahs/logs/<claimId>.log` incrementally instead of buffering in memory for up to 30 minutes — survives runner death, enables cockpit live-tail.
- **Conflict resolution as a runner phase (portal parity).** The Actorium portal has a dedicated `conflict_resolution` model policy — when a claim branch conflicts with its base, an agent resolves it rather than blocking on a human. Add it as a runner phase before the PR/merge step: on a detected conflict against `baseBranch` (§9 repo registry), the runner invokes the agent under the `conflict_resolution` model route (§2.5), and the resolution is ordinary measured evidence (the pinned commands must still pass on the merged result — D7 holds, the conflict fix is not self-certifying). If the agent cannot resolve, the item blocks `dirty_tree`/`other` with the transcript, exactly as today.

## §11 The knowledge layer

The one Actorium layer with no counterpart anywhere in oahs — code, plan, or vocabulary. Specs, decisions, task history, and code structure should be searchable by agents and humans the way a new hire asks a teammate — instead of every task re-reading the world from scratch. Constraints first: the knowledge layer lives **outside the spine** (§0.1 — it may call the model gateway; the spine may not), it is **read-only over artifacts that live in git** (D3), its output is **never a guard** (D12), and its store is **pgvector, not a new service** (D14).

- **Activate the `DATABASE_URL` seam.** PgEngine is already written against drizzle pg-core and the compose `postgres` profile already exists, dormant; PGlite remains the zero-infra default. This is the prerequisite for every multi-service ambition in §12 and costs nothing conceptually.
- **Memory search that actually searches.** `search_agent_memory` today loads all of an agent's rows and substring-filters in JS, and recall in the jobs runtime is "newest 20". Push the predicate into SQL (ILIKE/tsvector now), add an additive pgvector `embedding` column later — same command contract, same owner-scoping and visibility pins (§6), relevance-ranked recall.
- **The spec read surface** — smallest step, do it first: a read-only `get_spec_content` (spine reads `projects.repoPath` + `work_items.spec_path`) so the item page can show a gate-holder the document they are approving. Today the UI shows a path string. The ops manual raises the stakes: teammates are expected to answer "by citing the workspace's own documents" from day one (`docs/ref/actorium-user-manual.pdf` §4) — so this story and the teammate-context wiring lead the phase, ahead of the indexer.
- **The knowledge service** (new package outside the spine + compose profile): an indexer over what the platform already holds — spec folders from each project's repo, threads/messages (respecting `sourceVisibility`: nothing private is ever indexed into an open context), event-log narration — embedded via the gateway (the provider grows an `/embeddings` call) into pgvector, exposed as read-only MCP tools (`search_knowledge`). Per-project scoping via the Cockpit `project` entity; per-workspace isolation waits for §7's tenancy, honestly.
- **Code graph as a measuring tool.** No graph *service* yet — a deterministic runner-side indexer (tree-sitter / TS compiler API) that emits a new `impact_report` evidence kind ("this change touches these symbols/files, these callers are affected") for reviewers and gate-holders to consider. Machine-collected facts in the §1.4 sense; never a gate condition. A queryable graph server is a §12+ concern once the evidence proves useful.
- **Agent self-review as evidence (portal parity).** The portal has a `self_review` model policy — the agent reviews its own diff before a human ever looks. Add it as a runner phase after the code is written and before `in_review`: the agent, under the `self_review` model route (§2.5), critiques its own change and the result is submitted as a new `self_review` evidence kind — context a reviewer reads, **never a guard** (D12, same discipline as `impact_report`). An LLM grading its own work is exactly the interpretation the spine must not trust; keeping it as evidence, not a gate, is the whole point.
- **Distillation makes `procedural` memory real.** The memory kind exists in schema and vocabulary; nothing writes it. `oahs memory distill` — a gateway-powered consolidation pass from episodic notes to procedural lessons, owner-scoped, inside the learning-never-authority pins (§6). This is where "the worker gets better at its job" stops being a stub.

## §12 Service topology

The Actorium deployment shape — three independently deployable stacks on one network — adopted as compose profiles, not microservices (the YAGNI list still bans K8s). Each stack exists for the reason the reference gives: knowledge is long-lived shared infrastructure, the runtime fleet grows and shrinks with task volume, and the product app is the one thing a human opens.

- **`@oahs/auth` extracted.** `authenticate()` is a closure inside `buildServer`; the moment a second service exists it would copy auth. Extract TokenStore + authenticate into a reusable package — the seam toward the reference's "gateway owns auth for every backend" without building a gateway service today. (Naming note: `@oahs/gateway` is the *model* gateway; the name stays with models.) Token TTL and per-token revocation land here.
- **Compose profiles as the three stacks**: `product` (spine + UI), `runtime` (dispatcher + runner images), `knowledge` (postgres + pgvector + indexer). Each starts alone; together they are the reference deployment. The spine stays the only writer to its DB.
- **Transactional outbox for events.** The SSE relay polls at 300 ms behind the `EventTail` interface that was designed for exactly this swap; required the moment two spine-api instances exist.
- **Durable runner registry.** Announce/heartbeat/exit become events on a `runner` stream instead of an in-memory Map — the cockpit's fleet panel survives a spine restart and runner history becomes auditable like everything else.
- **Notification egress.** A webhook sink consuming `/events/stream` (already resumable via Last-Event-ID) — the zero-schema-change path to the reference's notification service; Slack/Lark bridges stay out of scope until someone needs one.
- Deferred with reasons, not forgotten: OIDC and `workspace_id`/RLS tenancy remain §7 items; the single hardcoded workspace constant in the PG engine is the one point to parameterize when that turn comes.

---

## Build phases

| Phase | Delivers | Exit criterion | Effort |
|---|---|---|---|
| **0** | This roadmap; PRD/architecture/backlog for the platform written *with BMAD playbooks* (dogfood from day 0); backlog converted to `stories.yaml`; **conformance test suite written from the prose FSM before any engine code** | Roadmap merged; unified schema fixed; ≥10 real stories importable; conformance suite red | S |
| **1** | Minimal spine (~8 tables: actor, workspace, work_item, dependency, claim+fencing, event, evidence, gate_decision, flat grants), FSM engine passing conformance, MCP+HTTP tools (§2.2 list), `oahs work` runner driving **unmodified dev-auto**, `oahs inbox`/`approve`/`reject` for human gate-holders | ≥3 real platform stories end-to-end through the spine; negative tests pass (no-grant deny, race loses by constraint, zombie 409, fake-done deny, crash/adopt/suspend-resume recovery); a human approves a gate without opening YAML | L |
| **2** | Full entitlements (§3): plan × governance × delivery, restrict-only layering, grant/revoke as gated writes | A reviewer-agent granted rejection-loopback but not done-approval: system allows the first, denies the second | M |
| **3** | Chat (§5): threads, messages, mention router, notifications, WebSocket, first web UI; reconcile-diagnosis & next-task-suggester agents (read + post only) | A real feature discussed in-thread; PO mentions the dev agent; work round-trips; human approves through the gate, not the chat | L |
| **4** | Non-coding teammates (§0.2 playbooks as PM/UX/architect/reviewer actors); non-code evidence rules | A PRD change drafted by the PM agent, reviewed by a reviewer agent, approved by a human PO — three actor kinds, one rails | M |
| **5** | Hermes teammates (§6): adapter, workspace-scoped memory, learning-never-authority guardrails | Same task class measurably improves week-over-week while the audit log shows zero gates passed beyond grants | L |
| **6** | Model gateway (§2.5) + server-side sandboxes (§4.3) | A story completes entirely server-side; provider swapped by config | XL |
| **7** | Repositioned 2026-07 (see §7 note): **Cockpit** — project entity above features, wall-clock leases + heartbeats, portfolio UI, init/profile/supervisor ergonomics; shipped in four waves (`delivery/phase-7-cockpit/`, retroactive record). The enterprise items (SSO/SCIM, audit export + signatures, RLS multi-tenancy, licensing) stay recorded in §7, deferred indefinitely | One operator runs parallel projects on one spine: blank machine → two projects in 4 commands | XL |
| **8** | Hardening & the trust floor (§8): net-new CI + invariant greps (D15), gated `force_release_claim`, authenticated heartbeat/release, runner-liveness permission, audited token ops, visibility-filtered event egress, minimal agent child env, port drift, phase-7 dogfood retro-fill | CI is green and enforces both spine-purity greps (§0.1 LLM-SDK, §2.5 gateway-import); a zero-grant actor is denied `force_release_claim` in all three harnesses (memory, PGlite, HTTP) | M |
| **9** | Feature-layer contract (§9): feature FSM with design + handoff gates and privileged cancel, In-TDD stage, rejection loopbacks, intent hash wired, atomic reviewer dispatch, atomic agent-job claim, GitHub PR integration + repo registry `{gitUrl, baseBranch}`, feature board + workspace UI + ⌘K command palette | A feature walks PO-spec → TL-design → In-TDD → execution → handoff through gates and reaches done **only** via handoff approval; cancelled is reachable only through the privileged cancel path; two concurrent reviewer dispatches materialize exactly one review job (race loses by constraint); editing a frozen spec after approval trips the intent-hash guard; a task's PR is opened automatically and `pr.merged_into_default` evidence records the merge; the palette runs every registry command through the rails | XL |
| **10** | Execution isolation (§10, completes §4.3 per D13): job-bound tokens, dispatcher as sole spawn-privilege holder, claim-scoped push credentials, server-side lease reaper + `claim.expired`, dispatch-start branch push, live transcripts | A story completes end-to-end where the agent container never sees a static spine token or a push credential; kill -9 of a runner produces `claim.expired` in the event log and on the cockpit | XL |
| **11** | Knowledge layer (§11, per D12/D14): DATABASE_URL activation, SQL/pgvector memory search, spec read surface, knowledge indexer + `search_knowledge`, code-graph `impact_report` evidence, agent `self_review` evidence, per-phase model policy + Model Policies UI (§2.5), memory distillation | An agent asks "what does this feature mean / what does this change touch" over MCP and gets a cited answer; memory recall is relevance-ranked, not newest-20; a workspace configures a different model per workflow phase from the UI and the runner routes to it | XL |
| **12** | Service topology (§12): `@oahs/auth` extraction + OIDC, compose profiles as three stacks, transactional outbox, durable runner registry, webhook egress, chat channels/DMs/saved (§5.5), Usage view over the Meter | The three compose profiles deploy and scale independently; a second service consumes `@oahs/auth` without copying code; a user signs in via OIDC and reads their token usage in the cockpit | L |

**Dogfood policy**: the first story completed *through* the spine is Phase 1's done gate; from then on, no platform work happens outside the spine, and the weekly metric is % of platform work on-rails.

**Not before its phase (YAGNI)**: web UI (P3), microservices/K8s (monolith till P6 — 2026-07: P6 part 1 landed, so the split is unlocked; it arrives as §12 compose profiles, still never K8s), CQRS/hash-chain-on-write/signatures/KMS/SCIM/RLS (P7), external policy engines (never — the resolver is a pure function), porting bmad-loop's TUI, rewriting the 47 playbooks, multi-CLI runners (post-MVP neutrality test), generating `stories.yaml` from the DB (P3+, UI-created items only), two-way reconciliation sync (never), parsing chat text into commands (never).
