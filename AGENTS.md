# BMAD-METHOD

Open source framework for structured, agent-assisted software delivery.

## Rules

- Use Conventional Commits for every commit.
- Before pushing, run `make check` on `HEAD` in the exact checkout you are about to push.
  It is the `check` job of `.github/workflows/oahs-ci.yaml` — ONE of that workflow's
  **five**. `make check` is `typecheck` + `lint-oahs` + every `@oahs/*` suite (including
  the `packages/db` PGlite parity run of the core conformance suite). The four jobs it
  does NOT cover:
  - `spine-purity` — greps for LLM SDKs and gateway imports in the spine, and for
    TODO/FIXME/TBD markers under `delivery/` or `docs/oahs/`. (The import half is now
    also enforced type-aware by `make lint-oahs`, so `check` catches it too; the
    unfinished-work-marker grep is unique to this job.)
  - `tools` — upstream BMAD's six suites, the fork gate, and shellcheck.
  - `style` — eslint/prettier/markdownlint over the JS and Markdown outside `packages/`
    and `apps/`. Run `pnpm run lint && pnpm run format:check && pnpm run lint:md`.
  - `dispatch-e2e` — a real Docker daemon; `./scripts/e2e-dispatch.sh`.

  Green locally is not green on CI. Run what you touched.
  (This rule used to say `npm ci && npm run quality`. That was impossible here — the
  repo is a pnpm workspace with no package-lock.json, so `npm ci` cannot run at all,
  and the `quality` workflow it mirrored was red 15/15 and has been deleted.)

- Skill validation rules are in `tools/skill-validator.md`.
- Deterministic skill checks run via `npm run validate:skills` (included in `quality`).
