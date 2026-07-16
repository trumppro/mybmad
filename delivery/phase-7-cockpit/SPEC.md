# Phase 7 — Cockpit (retroactive record)

> **Retro-fill (2026-07).** Phase 7 shipped in five commits (7126f1e, f5fe63f, 55bbb40, ca17b7c, c10e9cd) without a delivery folder — the dogfood policy's first breach (roadmap line "no platform work happens outside the spine"). This folder records what was built so the backlog is complete; it documents history, it does not replay it. From Phase 8 on, the delivery folder exists *before* the work.

Feature spec for the roadmap's 2026-07 reposition of §7: parallel projects for ONE person on one spine — a project entity above features, wall-clock leases + heartbeats, a portfolio UI, and blank-machine ergonomics.

## Scope (as shipped)

- Ops console + self-host tooling: modular `/ui`, docker compose, Makefile.
- Wave 1 — correctness + ops recovery: feature-scoped runners, event timestamps, durable-by-default serve, unified port 4521, narration/backoff/transcripts, `whoami`/`claim ls`/`token reissue`.
- Wave 2 — the Project spine: `project` entity above features, `<slug>:<key>` external handles, wall-clock leases + runner heartbeats (kill -9'd runner's claim self-frees; finished worktree adopted without re-running the agent), per-project agent memory with a global craft tier.
- Wave 3 — the cockpit UI: portfolio dashboard (project rollups, gate inbox with project labels + pinned commands, live runner registry), project board, work-item detail with the full evidence trail.
- Wave 4 — ergonomics: profile store `~/.oahs/config.json` + `--as` identities, `oahs init` one-command bootstrap, `oahs work --manifest` supervisor — blank machine → two parallel projects in 4 commands.

## Out of scope (recorded then, still deferred)

Enterprise §7 items (SSO/SCIM, RLS multi-tenancy, licensing); everything now sequenced as Phases 8–12 (roadmap §8–§12).
