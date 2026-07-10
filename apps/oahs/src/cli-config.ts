/**
 * CLI configuration resolution — pure functions, no commander, no I/O.
 * cli.ts (the binary entrypoint) wires these into flags; tests import this
 * module directly (importing cli.ts would execute main()).
 */
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

import { DEFAULT_PORT } from './serve.js';

/** Client base URL: --url flag > env OAHS_URL > the unified default port. */
export function defaultUrl(env: NodeJS.ProcessEnv = process.env): string {
  const fromEnv = env['OAHS_URL'];
  return fromEnv !== undefined && fromEnv.length > 0
    ? fromEnv
    : `http://localhost:${DEFAULT_PORT}`;
}

/**
 * Serve persistence root: --data flag > env OAHS_DATA > ~/.oahs/data.
 * Durable is the DEFAULT — losing a workspace to a forgotten flag is not a
 * valid failure mode; the in-memory engine is the explicit --ephemeral opt-in.
 * Returns undefined only for --ephemeral (→ memory engine).
 */
export function resolveDataDir(
  opts: { data?: string; ephemeral?: boolean },
  env: NodeJS.ProcessEnv = process.env,
): string | undefined {
  if (opts.ephemeral === true) {
    if (opts.data !== undefined) {
      throw new Error('--ephemeral contradicts --data: pick one');
    }
    return undefined;
  }
  if (opts.data !== undefined) return resolve(opts.data);
  const fromEnv = env['OAHS_DATA'];
  if (fromEnv !== undefined && fromEnv.length > 0) return resolve(fromEnv);
  return join(homedir(), '.oahs', 'data');
}
