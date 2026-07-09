/**
 * The `oahs-brain` binary — a standalone entrypoint that runs runBrain() once.
 *
 * This is the command @oahs/runner's jobs runtime invokes as its agent-cmd:
 *   node <bundle-dir>/oahs-brain.mjs
 * It reads OAHS_CONTEXT_FILE, calls the model gateway, and writes
 * OAHS_REPLY_FILE. A single runnable file is what an agent-cmd needs — the
 * `oahs brain` subcommand runs the same runBrain() for humans/tests.
 *
 * Bundled as bin/oahs-brain.mjs (build-cli.mjs) — the bundle IS the executable.
 */
import { runBrain } from './agent-brain.js';

runBrain().catch((error: unknown) => {
  const err = error instanceof Error ? error : new Error(String(error));
  process.stderr.write(`oahs-brain failed — ${err.name}: ${err.message}\n`);
  process.exitCode = 1;
});
