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

- **No LLM SDK inside the spine.** The core packages must not import any model-provider SDK. Lint rule, not a code-review convention.
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

☐ Open: product name (the code is MIT; "BMAD" is a trademark of BMad Code LLC — the commercial platform needs its own name). Pricing, hosting, vendor posture remain open per the thesis.

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
3. **Evidence** — machine-collected facts exist and pass: real test exit codes from pinned commands (D7), a non-empty diff between recorded baseline and final revisions, `final_revision_reachable_on_remote` (pushing is part of the HALT contract under a claim; the spine re-verifies from the remote rather than trusting the runner's payload).

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

The dev-auto contract, promoted from files to API: dispatch = `{work_item, claim + fencing token, repo/branch-of-claim, playbook ref, spec_folder + story_id + invoke_dev_with}`. The runner (`spine work`, a small CLI/daemon on the dev machine):

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

---

## §6 Hermes teammates

The worker deepens (thesis): teammates on [Hermes](https://github.com/nousresearch/hermes-agent) carry a learning loop and persistent memory, joining as a second runtime behind the same dispatch contract — the spine does not change.

- **Memory** is server-side, scoped hard to `workspace_id` (row-level security; deleting a workspace deletes its memory). Recall filters by the visibility of the source context — nothing learned in a private thread surfaces in an open one.
- **Learning never becomes authority or a mutation path — enforced by architecture, not prompts**: a teammate runtime holds only an agent token for whitelisted MCP tools. No DB credential, no spine git credential, no "agent registers a tool" API. The tool registry is versioned spine code. A learned skill changes how the worker *uses* existing tools; grants alone change what it *may* do.
- Everything in Phases 1–4 works without Hermes (Claude Code / codex teammates are fully functional, minus the learning loop) — Hermes maturity is a scheduling risk, not an architectural dependency. A maturity spike happens right after Phase 3.

---

## §7 Enterprise

What makes procurement say yes, sequenced last because none of it is retrofit if §1 is built right:

- **SSO/SCIM**: OIDC first; identities are already a separate table so SCIM is an adapter.
- **Audit export**: the event log (§1.5) exports as JSONL with async hash-chaining — tamper-evidence formalized at export, not bought with hot-path locks. Approval signatures (per-agent keys, optional step-up auth for humans) arrive here.
- **Multi-tenancy**: `workspace_id` has been on every table since the first migration; RLS turns on here. Self-host = the same docker-compose-able stack with a signed license file acting as the plan layer. The BYO posture is itself a regulated-buyer feature: code and artifacts never leave the customer's infrastructure; the spine holds lifecycle metadata, messages, and evidence hashes.
- The thesis's open business decisions (pricing, hosting, vendor posture) get closed here at the latest.

---

## Build phases

| Phase | Delivers | Exit criterion | Effort |
|---|---|---|---|
| **0** | This roadmap; PRD/architecture/backlog for the platform written *with BMAD playbooks* (dogfood from day 0); backlog converted to `stories.yaml`; **conformance test suite written from the prose FSM before any engine code** | Roadmap merged; unified schema fixed; ≥10 real stories importable; conformance suite red | S |
| **1** | Minimal spine (~8 tables: actor, workspace, work_item, dependency, claim+fencing, event, evidence, gate_decision, flat grants), FSM engine passing conformance, MCP+HTTP tools (§2.2 list), `spine work` runner driving **unmodified dev-auto**, `spine inbox`/`approve`/`reject` for human gate-holders | ≥3 real platform stories end-to-end through the spine; negative tests pass (no-grant deny, race loses by constraint, zombie 409, fake-done deny, crash/adopt/suspend-resume recovery); a human approves a gate without opening YAML | L |
| **2** | Full entitlements (§3): plan × governance × delivery, restrict-only layering, grant/revoke as gated writes | A reviewer-agent granted rejection-loopback but not done-approval: system allows the first, denies the second | M |
| **3** | Chat (§5): threads, messages, mention router, notifications, WebSocket, first web UI; reconcile-diagnosis & next-task-suggester agents (read + post only) | A real feature discussed in-thread; PO mentions the dev agent; work round-trips; human approves through the gate, not the chat | L |
| **4** | Non-coding teammates (§0.2 playbooks as PM/UX/architect/reviewer actors); non-code evidence rules | A PRD change drafted by the PM agent, reviewed by a reviewer agent, approved by a human PO — three actor kinds, one rails | M |
| **5** | Hermes teammates (§6): adapter, workspace-scoped memory, learning-never-authority guardrails | Same task class measurably improves week-over-week while the audit log shows zero gates passed beyond grants | L |
| **6** | Model gateway (§2.5) + server-side sandboxes (§4.3) | A story completes entirely server-side; provider swapped by config | XL |
| **7** | Enterprise (§7): SSO/SCIM, audit export + signatures, RLS multi-tenancy, self-host licensing | First external customer ships a feature end-to-end | XL |

**Dogfood policy**: the first story completed *through* the spine is Phase 1's done gate; from then on, no platform work happens outside the spine, and the weekly metric is % of platform work on-rails.

**Not before its phase (YAGNI)**: web UI (P3), microservices/K8s (monolith till P6), CQRS/hash-chain-on-write/signatures/KMS/SCIM/RLS (P7), external policy engines (never — the resolver is a pure function), porting bmad-loop's TUI, rewriting the 47 playbooks, multi-CLI runners (post-MVP neutrality test), generating `stories.yaml` from the DB (P3+, UI-created items only), two-way reconciliation sync (never), parsing chat text into commands (never).
