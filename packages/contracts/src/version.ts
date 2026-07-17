/**
 * The oahs version, stamped into the bundle at build time.
 *
 * Source of truth: `/oahs-version.json` at the repo root. It is NOT the root
 * package.json (that manifest is upstream's `bmad-method@6.10.0` — a different
 * artifact with its own version line), and NOT the `@oahs/*` manifests: all seven
 * are pinned at 0.0.1, `private: true`, and read by nothing at runtime. They are
 * non-authoritative on purpose; do not bump them expecting an effect.
 *
 * apps/oahs/scripts/build-cli.mjs reads the JSON once and injects these through
 * esbuild `define`, so every bundle it emits carries the same literal.
 *
 * The `typeof` guards are load-bearing, not defensive style. The vitest configs
 * have no `define`, so a bare reference would throw ReferenceError the moment any
 * test imports a module that touches this one. Unbundled callers — tests, `tsx`,
 * the db worker bundle — legitimately have no version and get the dev sentinel.
 */
declare const __OAHS_VERSION__: string;
declare const __OAHS_SCHEMA_VERSION__: number;

/** Semver of the oahs platform, or `0.0.0-dev` when running unbundled. */
export const OAHS_VERSION: string =
  typeof __OAHS_VERSION__ === 'undefined' ? '0.0.0-dev' : __OAHS_VERSION__;

/**
 * Version of the durable schema this binary writes.
 *
 * This mirrors packages/db's SCHEMA_VERSION for reporting; a test pins the two equal.
 * The ENFORCEMENT lives in packages/db (schema-guard.ts): `oahs serve` refuses to open a
 * data dir stamped by a NEWER binary than itself (an old binary cannot know what a newer
 * schema changed). The other direction is allowed — the DDL is additive. So this number is
 * reported for diagnosis AND backs a real guard now; keep them in step by bumping
 * SCHEMA_VERSION and oahs-version.json together (the test enforces it).
 */
export const OAHS_SCHEMA_VERSION: number =
  typeof __OAHS_SCHEMA_VERSION__ === 'undefined' ? 0 : __OAHS_SCHEMA_VERSION__;
