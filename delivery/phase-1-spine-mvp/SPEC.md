# Phase 1 — Spine MVP

Feature spec for the first dogfood milestone of the platform (see [product-roadmap.md](../../product-roadmap.md), Build phases → Phase 1).

## Goal

A minimal deterministic spine proving the thesis end-to-end: ≥3 real platform stories flow `backlog → … → done` where **every transition is decided by code** from grants + machine-collected evidence; the worker is Claude Code on a dev machine driving the unmodified `bmad-dev-auto` playbook; Claude Code doubles as an MCP client reading state through the rails.

## Scope

- `@oahs/core`: in-memory engine passing the conformance suite in `packages/core/test/` (written first, from the prose FSM — see roadmap §1).
- Persistence: PostgreSQL 16 + Drizzle; events + projections in one transaction.
- Surfaces: MCP + HTTP from one zod contract source; gate-holder CLI (`oahs inbox|approve|reject`).
- Runner: `oahs work` — poll, claim (fencing), claim-named worktree, mirror-on-dispatch, invoke dev-auto, parse HALT, run pinned verification, push, submit raw evidence.
- Reconciler: detect-only.

## Out of scope (YAGNI — roadmap Build phases)

Web UI, WebSocket/outbox, entitlement roles beyond flat grants, threads/chat, multi-CLI runners, model gateway, RLS/multi-tenant.

## Exit criteria

Roadmap Phase 1 row: end-to-end stories, negative tests (no-grant deny, race loses by constraint, zombie 409, fake-done deny, crash/adopt/suspend-resume), human approves a gate without opening YAML.
