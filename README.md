# oahs — Open Agents Harness System

[![oahs CI](https://github.com/trumppro/mybmad/actions/workflows/oahs-ci.yaml/badge.svg)](https://github.com/trumppro/mybmad/actions/workflows/oahs-ci.yaml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D22-brightgreen)](.nvmrc)

A delivery system for a team of **humans and AI agents**. Work items move through a deterministic state machine; gates are held by actors with explicit grants; evidence is *measured* by a runner and *judged* by rules. The model does the work inside a task. It is never in the control loop.

> **AI does the work, rules run the process, permissioned actors hold the gates.**

oahs is built inside a fork of BMAD-METHOD — see [License and upstream](#license-and-upstream). This README is a router: it links rather than restates.

## What keeps the LLM out of the control loop

- **The spine has no model in it.** CI greps `packages/{core,db,contracts}/src` + `apps/spine-api/src` for provider SDKs and for `@oahs/gateway`, failing the build on a hit, on every push and PR, with no `paths:` filter. It is a lint, not a physical impossibility — it makes a model in the spine a red build, which is the enforcement this repo actually has.
- **Grants decide; the workspace may narrow, never widen.** An agent holding `gate.review.approve` approves — that is the default, and it is the point. Restricting agents by *type* is opt-in policy data (plan ceiling, `gate-policy set --require-type`), never a hardcode ([`PLAN_CEILINGS`](packages/core/src/types.ts), [`agentCeilingAllows`](packages/core/src/engine.ts)).
- **Evidence is measured; authored evidence never passes a guard.** Verification commands are pinned into Rules-layer data at the spec-approval gate — by whoever holds `gate.spec.approve`, before any agent runs — and only pinned commands run (roadmap D7). An LLM-written review report is context a permitted actor may weigh; the engine never consults it. A submitted diff that is empty is a fake-done deny.
- **Chat never mutates lifecycle.** The server never parses message text. The only direction is rails → chat.

| Claim | Receipt |
|---|---|
| No provider SDK, no gateway import, inside the spine | [`oahs-ci.yaml:34-43`](.github/workflows/oahs-ci.yaml) — two greps, green on HEAD |
| One MCP tool per registry command, name-for-name, generated from one zod registry (schema and result spot-checked, not the whole surface) | [`apps/spine-api/test/parity.test.ts`](apps/spine-api/test/parity.test.ts) |
| The rules are a specification — the suite was written before the engine, from BMAD's prose rules | [`packages/core/test/CONFORMANCE.md`](packages/core/test/CONFORMANCE.md); changing a test is changing the spec |
| The same unmodified core suite runs on the memory engine **and** PGlite | [`packages/db/vitest.config.ts`](packages/db/vitest.config.ts) includes `../core/test/**` |
| Container dispatch runs against a **real** Docker daemon, not a stub | [`oahs-ci.yaml:73-100`](.github/workflows/oahs-ci.yaml) → [`scripts/e2e-dispatch.sh`](scripts/e2e-dispatch.sh) |
| The agent image carries no Docker client | [`oahs-ci.yaml:93-98`](.github/workflows/oahs-ci.yaml) — a failing assertion, not a convention |
| Which binary is this | `oahs --version` / `GET /version`, from [`oahs-version.json`](oahs-version.json) |

[`oahs-ci.yaml`](.github/workflows/oahs-ci.yaml) is the only pipeline on every push and PR (`oahs-release.yaml` runs on `oahs-v*` tags). The GitLab mirror `.gitlab-ci.yml` carries `spine-purity` and `check` — but **not** `dispatch-e2e`.

## Status — 0.1.0

Phases 0–10 shipped: the spine and its conformance suite, entitlements, collaboration, non-coding teammates, agent memory, the model gateway (part 1 — see [OAHS.md](OAHS.md)), the cockpit, hardening, the feature-layer contract, execution isolation. Phases 11–12 (knowledge layer, service topology) have roadmap sections and backlogs committed, and **no implementation**.

**What is *not* in it** — [CHANGELOG-oahs.md](CHANGELOG-oahs.md)'s "What is NOT in it" is authoritative; read it before you believe anything else on this page:

- **No Postgres.** `serve` offers `memory` and `pglite` only. A `PgEngine` exists and passes the conformance suite, but nothing wires it to the server.
- **No migrations.** Idempotent DDL is re-applied on every open. Nothing stamps or checks a schema version; `GET /version` reports `schemaVersion` for diagnosis only. Two binaries against one data dir is possible and silent.
- **No multi-tenancy.** There is no `workspace_id` column on any table.
- **Grant scopes are stored but not enforced.**
- **No metering, billing, quotas, SSO/OIDC, SCIM, or audit signing.** Deferred indefinitely.
- **Nothing is published.** No npm package, no registry image. Every workspace package is private; images are `:local`. `npx bmad-method` fetches *upstream's* package, not this fork.

If you are evaluating the *idea*, that list is part of the pitch. The thesis is a floor that has been held across every phase so far; the product surface around it is early, and pretending otherwise would contradict the one thing this repo is actually selling.

## Quickstart

Needs **Node 22** ([`.nvmrc`](.nvmrc) — the root `package.json`'s `>=20.12` is upstream BMAD's floor, not oahs's), **pnpm** via `corepack enable && corepack prepare pnpm@11.13.0 --activate` (CI's pin; there is no `packageManager` field), and **git**. Docker is only for compose and the container dispatcher.

```bash
make install                 # pnpm install (whole workspace; the lockfile is committed)
make serve                   # build, then serve on :4521 — durable PGlite under ~/.oahs/data
```

`make serve` runs in the **foreground** and prints the port, engine, data dir, and a generated admin token. Copy the token; open a **second terminal** for everything below.

```bash
alias oahs="node $PWD/apps/oahs/bin/oahs.mjs"       # nothing is published — see Sharp edges
export OAHS_ADMIN_TOKEN=<the token serve printed>   # read only by `init`

# One command: PO + dev-agent actors and their grants, six BMAD personas, a project,
# a "Sprint 1" feature, the imported backlog, named identities in ~/.oahs/config.json.
oahs init demo --repo "$PWD" \
  --spec-folder delivery/phase-1-spine-mvp \
  --import delivery/phase-1-spine-mvp/stories.yaml

oahs advance 1 --to draft    # `1` is the story's externalKey; advance/approve resolve it,
                             # and print the internal id too: `advanced 1 (wi_00000d)`
oahs inbox                   # story 1 carries spec_checkpoint: true, so it waits on a human
oahs approve 1 --gate spec_approval --pin 'pnpm -C packages/core test'
```

That `--pin` is the point of the whole system: the verification command is frozen into Rules-layer data **at the approval gate**, before any agent runs. A command an LLM writes into a spec later is never a guard (roadmap D7).

```bash
oahs events wi_00000d        # who did what, on what evidence — a query, not an interview.
                             # `events` takes the STREAM id (wi_…) and does no handle
                             # resolution: `oahs events 1` prints nothing and exits 0.
```

Then open **http://localhost:4521/ui** and log in with a token: portfolio rollups, gate inbox, live messages over SSE, work-item detail with the evidence trail. Every **spine** command is also an MCP tool (`oahs_*`) at `POST /mcp` on the same bearer token; CLI-local commands (`init`, `work`, `dispatch`, `serve`, `identities`) are not spine commands and have no tool. `make help` lists the real targets; `make bootstrap` seeds a demo into an already-running server.

Compose, equivalently — published on loopback only, deliberately:

```bash
cp .env.example .env         # optional for this service
make up                      # docker compose up -d --build oahs
docker compose logs oahs     # the generated admin token
```

## Putting an agent on real work

Point `--repo` at **your** project — a git checkout with a spec folder and its own `stories.yaml` — and `oahs init` it the same way. The demo above deliberately targets this repo's own shipped Phase 1, which is not work you want an agent to redo.

```bash
oahs work --project demo --as dev \
  --agent-cmd 'claude -p "Use the bmad-dev-auto skill. spec_folder: {SPEC_FOLDER}  story_id: {STORY_ID}  {INVOKE_WITH}" --permission-mode acceptEdits'
```

`--as dev` is required: `init` leaves `po` as the default identity, and PO holds no `task.claim`. `bmad-dev-auto` is **upstream BMAD's** implementation playbook, carried unmodified at [`src/bmm-skills/4-implementation/bmad-dev-auto`](src/bmm-skills/4-implementation/bmad-dev-auto) — the fork's BMAD content is load-bearing, not decoration. The runner claims under a lease with a fencing token, runs your agent, measures only the pinned commands, pushes `claim/<id>`, and submits raw evidence. **The runner measures; the core judges.**

For a container per claim (§10) — the dispatcher holds the Docker socket and the model keys; the spine holds neither:

```bash
docker build -f apps/oahs/Dockerfile.runner -t oahs-runner:local .
oahs dispatch --project demo --as dev --image oahs-runner:local \
  --agent-cmd '<your agent command>' \
  --container-url http://host.docker.internal:4521   # Linux: --network host --container-url http://127.0.0.1:4521
```

The dispatcher claims on the host with its static token, mints a **job-scoped, mutation-only** token for the container, and pushes the claim branch itself afterwards. The container never holds the admin token, a push credential, or a Docker client — it *does* get the `OAHS_MODEL_*` creds its agent needs, forwarded onto the inner `oahs work --agent-env` argv (never into the container's scoped-token env, never to the spine). [`scripts/e2e-dispatch.sh`](scripts/e2e-dispatch.sh) is the path CI runs.

## Sharp edges

- **`oahs` is not on your PATH, and cannot be.** Nothing is published; the binary is `apps/oahs/bin/oahs.mjs` after `make build`. Alias it. The compose path gives you the *server* — it does not build that bin.
- **`serve` binds `0.0.0.0` and there is no `--host` flag.** The from-source path publishes an admin-token-guarded spine to your LAN. Compose publishes to `127.0.0.1` for exactly that reason.
- **The generated admin token is new on every restart** unless you set `OAHS_ADMIN_TOKEN`. Actor tokens persist; the admin token does not.
- **`OAHS_TOKEN` silently outranks your saved default identity.** Precedence: `--token` > `--as` > `$OAHS_TOKEN` > profile default. If commands act as the wrong actor, `unset OAHS_TOKEN`.
- **No coding agent is baked into the runner image by default.** `AGENT_NPM` is empty and `.env.example` ships `OAHS_AGENT_CMD=echo no-agent`, so an out-of-the-box dispatch runs `echo no-agent` and the item blocks. Bake one (`--build-arg AGENT_NPM=@anthropic-ai/claude-code`) or point `--agent-cmd` at something that exists in the image. BYO fails the same way if `claude` is not on your PATH.
- **The dispatcher image runs as root.** `oahs:local` and `oahs-runner:local` run as uid 10001; `oahs-dispatcher:local` does not, and [`Dockerfile.runner`](apps/oahs/Dockerfile.runner) says why: a process that can spawn host containers is host-root already.
- **The compose `runtime` profile needs three things no one-liner gives it**: a separately-built `oahs-runner:local` (no compose service builds it), `OAHS_RUNNER_TOKEN`, and an absolute host `OAHS_REPO_PATH`. Without them it restart-loops. `dispatch --repo` is a **host** path, resolved by the host daemon.
- **`docker compose --profile postgres` starts a Postgres the app does not use.** Reserved for a future path (roadmap §11). `serve` offers `memory` and `pglite` only. (`serve --ephemeral` loses everything on exit; the durable default is `~/.oahs/data`.)

## Trust boundary

Every security-shaped sentence here has a tense and a scope, and this is the scope: **evidence collected on a developer machine is only as strong as the honest-operator assumption behind it.** That is the floor today, and it is sufficient for dogfood and team use. Concretely: the done gate refuses unless the *latest* `commit` evidence says the revision is reachable on the remote — and the runner, on the operator's machine, is what ran `git ls-remote` and said so. The spine judges that payload; it does not re-check the remote itself. The §8 pre-agent push-target snapshot, job-scoped tokens, and the container boundary raise the cost of a dishonest agent; they do not make one impossible. Platform-hosted execution — what roadmap §4.3 says would raise this from honest-operator to platform-verified — has not shipped, nor have the enterprise done-gates' independent server-side CI evidence (roadmap §7, deferred indefinitely). Stated so nobody mistakes the floor for the ceiling; [OAHS.md](OAHS.md) "Trust boundary" is the register the rest of the docs inherit.

## Read next

| If you want | Read |
|---|---|
| Why this exists, and what must never change | [product-thesis.md](product-thesis.md) |
| The plan of record — §0.1 invariants, phases, D-numbered decisions | [product-roadmap.md](product-roadmap.md) |
| The technical map and per-phase quick reference | [OAHS.md](OAHS.md) |
| The specification, as an executable suite | [packages/core/test/CONFORMANCE.md](packages/core/test/CONFORMANCE.md) |
| What 0.1.0 is, and precisely what it is not | [CHANGELOG-oahs.md](CHANGELOG-oahs.md) |
| **Install, operate, use it — in Vietnamese** (6 docs: overview, install/ops, usage, reference, role handbook, portal parity) | [docs/oahs/](docs/oahs/README.md) |
| The platform's own backlog, run through its own spine | [delivery/](delivery/) |

## Map of the repo

| Path | What it is |
|---|---|
| `packages/core` | The Rules layer: lifecycle FSM, claims, gates, evidence verdicts, event log, reconciler. Its `test/` suite **is** the spec. No LLM SDK may be imported here. |
| `packages/contracts` | One zod registry; HTTP routes, MCP tools, and the typed client are generated from it. |
| `packages/db` | Drizzle schema + `PgEngine`, held to the same suite via PGlite. Races lose by a DB constraint here, not by application logic. Not wired to `serve` — see Status. |
| `apps/spine-api` | Fastify: `/rpc/*`, `/mcp`, `/ui`, `/events/stream`, `/healthz`, `/version` — one command bus behind all of them. |
| `apps/oahs` | The `oahs` binary: `serve`, `init`, gate-holder commands, admin, `work`, `dispatch`. |
| `packages/runner` | The worker loop: claim → worktree → agent → pinned verification → push → raw evidence. |
| `packages/gateway` | The model-agnostic gateway — a **runtime-layer** service (one provider ships: OpenAI-compatible). CI keeps it out of the spine. |
| `src/`, `tools/`, `website/` | Mostly upstream BMAD, carried unmodified and load-bearing: `src/bmm-skills/4-implementation/bmad-dev-auto` is the canonical `--agent-cmd`. (`tools/oahs-bootstrap.sh` and `tools/team-seed.sh` are net-new here.) |

**Contributing:** run `make check` (typecheck + every `@oahs/*` suite, including the PGlite parity run) on the exact checkout you are about to push; see [AGENTS.md](AGENTS.md). Changing a conformance test is changing the specification — record it in [CONFORMANCE.md](packages/core/test/CONFORMANCE.md) with the same rigor as a roadmap edit.

## License and upstream

MIT — see [LICENSE](LICENSE).

oahs is built inside a fork of [BMAD-METHOD](https://github.com/bmad-code-org/BMAD-METHOD)
(MIT, Copyright (c) 2025 BMad Code, LLC), whose licence and copyright notice this repository
retains in [LICENSE](LICENSE). The `src/` playbook content and the `tools/`, `website/` trees
are upstream's work, carried unmodified; `packages/`, `apps/`, `delivery/`, `docs/oahs/`,
`OAHS.md`, `product-thesis.md`, and `product-roadmap.md` are net-new here.

**BMad**, **BMad Method**, and **BMad Core** are trademarks of BMad Code, LLC and are
**not** covered by the MIT grant — see [TRADEMARK.md](TRADEMARK.md). This project is an
independent fork under its own name. It is not affiliated with, endorsed by, or supported
by BMad Code, LLC. Please do not send oahs issues to the upstream tracker.