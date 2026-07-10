/**
 * CLI configuration resolution — config file + env + flags, no commander.
 * cli.ts (the binary entrypoint) wires these into flags; tests import this
 * module directly (importing cli.ts would execute main()).
 *
 * Wave 4 (D-F): the PROFILE STORE ends the token-juggling era. One JSON file
 * (`~/.oahs/config.json`, root overridable via OAHS_HOME) holds the server
 * URL and NAMED identities (po, dev, admin, …). Every client command accepts
 * `--as <name>`; nobody re-exports OAHS_TOKEN between roles again. This is
 * NOT impersonation — each identity is its own real token; authority still
 * comes only from explicit grants.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

import { DEFAULT_PORT } from './serve.js';

export interface StoredIdentity {
  token: string;
  actorId: string;
}

export interface Profile {
  version: 1;
  server?: { url: string };
  identities: Record<string, StoredIdentity>;
  defaultIdentity?: string;
  /** From a per-directory .oahs.json, when one exists where the command runs. */
  directory?: { project?: string };
}

/** Profile root: env OAHS_HOME > ~/.oahs. */
export function profileDir(env: NodeJS.ProcessEnv = process.env): string {
  const fromEnv = env['OAHS_HOME'];
  return fromEnv !== undefined && fromEnv.length > 0 ? resolve(fromEnv) : join(homedir(), '.oahs');
}

function configPath(env: NodeJS.ProcessEnv): string {
  return join(profileDir(env), 'config.json');
}

function readConfig(env: NodeJS.ProcessEnv): Profile {
  const path = configPath(env);
  if (!existsSync(path)) return { version: 1, identities: {} };
  const raw = JSON.parse(readFileSync(path, 'utf8')) as Partial<Profile>;
  return {
    version: 1,
    identities: raw.identities ?? {},
    ...(raw.server !== undefined ? { server: raw.server } : {}),
    ...(raw.defaultIdentity !== undefined ? { defaultIdentity: raw.defaultIdentity } : {}),
  };
}

function writeConfig(profile: Profile, env: NodeJS.ProcessEnv): void {
  mkdirSync(profileDir(env), { recursive: true });
  const { directory: _directory, ...persisted } = profile;
  // Tokens live here — keep the file owner-only.
  writeFileSync(configPath(env), `${JSON.stringify(persisted, null, 2)}\n`, { mode: 0o600 });
}

/** Load the profile, plus the per-directory .oahs.json context when present. */
export function loadProfile(env: NodeJS.ProcessEnv = process.env, cwd = process.cwd()): Profile {
  const profile = readConfig(env);
  const dirFile = join(cwd, '.oahs.json');
  if (existsSync(dirFile)) {
    try {
      const raw = JSON.parse(readFileSync(dirFile, 'utf8')) as { project?: string };
      profile.directory = { ...(raw.project !== undefined ? { project: raw.project } : {}) };
    } catch {
      /* a malformed .oahs.json never breaks the CLI */
    }
  }
  return profile;
}

export function saveIdentity(
  name: string,
  identity: StoredIdentity,
  env: NodeJS.ProcessEnv = process.env,
): void {
  const profile = readConfig(env);
  profile.identities[name] = identity;
  profile.defaultIdentity ??= name;
  writeConfig(profile, env);
}

export function setDefaultIdentity(name: string, env: NodeJS.ProcessEnv = process.env): void {
  const profile = readConfig(env);
  if (profile.identities[name] === undefined) {
    throw new Error(`unknown identity "${name}" — save it first with \`oahs login\``);
  }
  profile.defaultIdentity = name;
  writeConfig(profile, env);
}

export function setServerUrl(url: string, env: NodeJS.ProcessEnv = process.env): void {
  const profile = readConfig(env);
  profile.server = { url };
  writeConfig(profile, env);
}

/**
 * Token resolution: --token flag > --as <name> (profile) > env OAHS_TOKEN >
 * the profile's defaultIdentity. Explicit always beats ambient; env keeps
 * every pre-W4 script working unchanged.
 */
export function resolveIdentity(
  opts: { token?: string; as?: string },
  env: NodeJS.ProcessEnv = process.env,
): { token: string; name?: string } {
  if (opts.token !== undefined && opts.token.length > 0) return { token: opts.token };
  const profile = readConfig(env);
  if (opts.as !== undefined) {
    const identity = profile.identities[opts.as];
    if (identity === undefined) {
      throw new Error(
        `unknown identity "${opts.as}" (saved: ${Object.keys(profile.identities).join(', ') || 'none'})`,
      );
    }
    return { token: identity.token, name: opts.as };
  }
  const fromEnv = env['OAHS_TOKEN'];
  if (fromEnv !== undefined && fromEnv.length > 0) return { token: fromEnv };
  if (profile.defaultIdentity !== undefined) {
    const identity = profile.identities[profile.defaultIdentity];
    if (identity !== undefined) return { token: identity.token, name: profile.defaultIdentity };
  }
  throw new Error(
    'missing token: pass --token/--as, set OAHS_TOKEN, or `oahs login` an identity first',
  );
}

/** Client base URL: --url flag > env OAHS_URL > profile server.url > the unified default port. */
export function defaultUrl(env: NodeJS.ProcessEnv = process.env): string {
  const fromEnv = env['OAHS_URL'];
  if (fromEnv !== undefined && fromEnv.length > 0) return fromEnv;
  const stored = readConfig(env).server?.url;
  if (stored !== undefined && stored.length > 0) return stored;
  return `http://localhost:${DEFAULT_PORT}`;
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
