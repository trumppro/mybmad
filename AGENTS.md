# BMAD-METHOD

Open source framework for structured, agent-assisted software delivery.

## Rules

- Use Conventional Commits for every commit.
- Before pushing, run `make check` on `HEAD` in the exact checkout you are about to push.
  It is the `check` job of `.github/workflows/oahs-ci.yaml` — ONE of that workflow's three.
  It does NOT run `spine-purity` (greps for LLM SDKs in the spine, gateway imports in the
  spine, and TODO/FIXME/TBD markers under `delivery/` or `docs/oahs/`) and it does NOT run
  `dispatch-e2e` (a real Docker daemon; `./scripts/e2e-dispatch.sh`). Green locally is not
  green on CI. Run those two yourself if you touched what they cover.
  (This rule used to say `npm ci && npm run quality`. That was impossible here — the
  repo is a pnpm workspace with no package-lock.json, so `npm ci` cannot run at all,
  and the `quality` workflow it mirrored was red 15/15 and has been deleted.)

- Skill validation rules are in `tools/skill-validator.md`.
- Deterministic skill checks run via `npm run validate:skills` (included in `quality`).
