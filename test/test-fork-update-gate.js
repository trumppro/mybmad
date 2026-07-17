/**
 * Fork guard: the carried BMAD installer must not phone upstream's registry.
 *
 * tools/installer/bmad-cli.js hardcodes `packageName = 'bmad-method'` — UPSTREAM's
 * package, independent of package.json — and fires checkForUpdate() at module load.
 * Left ungated it does two things this fork does not want: it blocks startup on a
 * network call (execSync precedes the first await, so the "runs asynchronously"
 * comment there is false), and once upstream ships anything above 6.10.0 it tells
 * whoever ran it to `npx bmad-method@latest install` — i.e. to replace this fork
 * with upstream.
 *
 * The gate is `packageJson.private !== true`. Both halves are tested, because both
 * can rot independently: someone can delete the guard, or someone can delete
 * `private` from the manifest and re-arm the check from the other side — which
 * would also remove the only unconditional guard against `npm publish`.
 *
 * Usage: node test/test-fork-update-gate.js
 */

const path = require('node:path');
const { spawnSync } = require('node:child_process');

// ANSI colors
const colors = {
  reset: '[0m',
  green: '[32m',
  red: '[31m',
  cyan: '[36m',
  dim: '[2m',
};

let passed = 0;
let failed = 0;

function assert(condition, testName, errorMessage = '') {
  if (condition) {
    console.log(`${colors.green}✓${colors.reset} ${testName}`);
    passed++;
  } else {
    console.log(`${colors.red}✗${colors.reset} ${testName}`);
    if (errorMessage) {
      console.log(`  ${colors.dim}${errorMessage}${colors.reset}`);
    }
    failed++;
  }
}

const root = path.join(__dirname, '..');
const cli = path.join(root, 'tools', 'installer', 'bmad-cli.js');
const pkg = require('../package.json');

// ─── The manifest half of the gate ──────────────────────────────────────────

console.log(`\n${colors.cyan}The manifest half of the gate${colors.reset}\n`);

assert(
  pkg.private === true,
  'package.json declares private: true',
  'Removing it re-arms the update nag AND removes the only unconditional guard against `npm publish`.',
);

// ─── The behavioural half ───────────────────────────────────────────────────

console.log(`\n${colors.cyan}The behavioural half${colors.reset}\n`);

// Point npm at an unroutable address. If the check runs, execSync blocks until its
// own 5s timeout (measured: 5.09s before the gate, 0.045s after). The two outcomes
// are ~100x apart, so this is a threshold test, not a race.
const started = Date.now();
const result = spawnSync(process.execPath, [cli, '--help'], {
  encoding: 'utf8',
  env: { ...process.env, npm_config_registry: 'http://10.255.255.1:4873' },
  timeout: 30_000,
});
const elapsed = Date.now() - started;

assert(result.status === 0, '`bmad-cli --help` still works', `exit=${result.status}`);
assert(
  /Usage: bmad-cli/.test(result.stdout ?? ''),
  'the installer itself is untouched — it still prints its usage',
);
assert(
  elapsed < 2500,
  `no registry call blocks startup (took ${elapsed}ms; ungated is ~5000ms)`,
  'The update check appears to be running: it reaches the network before commander parses argv.',
);

console.log(
  `\n${passed + failed} checks — ${colors.green}${passed} passed${colors.reset}, ` +
    `${failed > 0 ? colors.red : ''}${failed} failed${colors.reset}\n`,
);

process.exit(failed > 0 ? 1 : 0);
