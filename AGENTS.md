# BMAD-METHOD

Open source framework for structured, agent-assisted software delivery.

## Rules

- Use Conventional Commits for every commit.
- Before pushing, run `make check` on `HEAD` in the exact checkout you are about to push.
  It mirrors `.github/workflows/oahs-ci.yaml`, which is the only CI this repo runs.
  (This rule used to say `npm ci && npm run quality`. That was impossible here — the
  repo is a pnpm workspace with no package-lock.json, so `npm ci` cannot run at all,
  and the `quality` workflow it mirrored was red 15/15 and has been deleted.)

- Skill validation rules are in `tools/skill-validator.md`.
- Deterministic skill checks run via `npm run validate:skills` (included in `quality`).
