# Changelog — oahs

The oahs platform only. The root `CHANGELOG.md` belongs to upstream BMAD-METHOD,
whose tree this fork carries; it is not ours to write in.

Versions are sourced from [`oahs-version.json`](oahs-version.json) and tagged
`oahs-v*` — never `v*`, which is upstream's tag namespace.

## 0.1.0 — 2026-07-17

First tagged version. It marks the point where the container execution path was
proven against a real Docker daemon in CI rather than a stub, which is the thing
that makes the rest worth versioning.

### What is in it

- **Deterministic spine.** Lifecycle, gates, claims, and evidence live behind a
  command bus; `packages/core/test/CONFORMANCE.md` is the specification, and the
  same suite runs against the in-memory engine and PGlite so the two cannot drift.
- **No model in the control loop.** CI greps `packages/{core,db,contracts}` and
  `apps/spine-api` for LLM SDKs and gateway imports on every push.
- **MCP and HTTP are the same surface**, structurally — `apps/spine-api/test/parity.test.ts`
  deep-equals them rather than trusting that they match.
- **Container-isolated execution (§10).** `oahs dispatch` claims work on the host
  with a static token, mints a job-scoped mutation-only token, and runs one
  container per claim. The agent container never receives the admin token, a push
  credential, or a Docker client — the last one is a failing CI assertion, not a
  convention. It DOES receive the model credentials its agent needs, on the inner
  `oahs work --agent-env` argv rather than in its environment, so they are not
  inherited by everything the agent shells out to. They never reach the spine.
- **Claim-scoped push credentials, a durability push, and spine-driven adoption**
  of a claim branch across machines.
- **A lease reaper** that records expiries without deciding anything.
- **A version surface**: `oahs --version`, `GET /version`, and OCI labels on both
  images, all sourced from one file.

### What is NOT in it

Stated plainly, because the absence of a feature is easier to mistake for its
presence than the reverse:

- **No Postgres.** `serve` offers `memory` and `pglite` only. A `PgEngine` exists
  and is tested for parity, but nothing wires it to the server.
- **No migrations.** Idempotent DDL is re-applied on every open. Nothing stamps or
  checks a schema version — `GET /version` reports `schemaVersion` for diagnosis
  only. Two binaries against one data dir is possible and silent.
- **No multi-tenancy.** There is no `workspace_id` column on any table.
- **Grant scopes are stored but not enforced.**
- **No metering, billing, SSO, or audit signing.**
- **No published image or package.** Images are built locally; nothing is on npm
  or a registry.

### Security posture

Evidence collected on a developer machine is only as strong as the honest-operator
assumption behind it. The §8 push guard, scoped tokens, and the container boundary
raise the cost of a dishonest agent; they do not make one impossible.
