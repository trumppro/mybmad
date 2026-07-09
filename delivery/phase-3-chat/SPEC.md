# Phase 3 — Collaborative chat

Feature spec for roadmap §5: threads/messages/mentions/notifications, the deterministic mention router, SSE realtime, the first web UI, and the two "agentify without touching the spine" advisor bots. Exit criterion (roadmap Build phases): a real feature discussed in-thread; PO mentions the dev agent; work round-trips; the human approves **through the gate, not the chat**.

## Scope

- Engine entities: thread (kind spec|design|task|general|private, visibility), message (author user|agent|system, per-thread gap-free seq), mention (structured, resolution taxonomy), notification, agent_job (reply-only, depth-capped).
- Sacred boundary (§5.2) machine-pinned: no server text parsing; rails→chat narration only.
- Mention router (§5.4): default-deny who_may_invoke, `mentionDispatch` kill-switch, `agentMentionAgent` + depth cap.
- SSE `/events/stream` with cursor resume; chat-first web UI at `/ui` (gate buttons = client affordances calling `/rpc`).
- Advisor bots (deterministic, read + post only): `oahs advise next-task`, `oahs advise reconcile`.
- Full parity: memory, PGlite, HTTP+MCP, CLI.

## Out of scope

WebSocket bidirectional (SSE suffices), Slack/Lark bridges, CRDT editing, list_actors directory command (UI takes actor ids; revisit in Phase 4), runner polling agent_jobs (Phase 4/5 teammate runtimes).
