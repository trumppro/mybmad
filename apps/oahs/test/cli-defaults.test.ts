/**
 * CLI defaults (Phase 7 Wave 1): one port everywhere, durable by default.
 *
 *  - defaultUrl:    --url flag > env OAHS_URL > the PROFILE's server.url > http://localhost:4521
 *    (4521 unified across serve.ts, Makefile, compose — the 4517/4521 split
 *    had its own apology section in the Vietnamese docs).
 *
 *    Every case here pins OAHS_HOME at a temp dir. Without that these tests read
 *    the developer's REAL ~/.oahs/config.json — profileDir() takes env only for
 *    OAHS_HOME and falls back to os.homedir() regardless of the env object passed
 *    in — so they passed on CI and on a clean machine, and failed for anyone who
 *    had ever run `oahs init`. Green must not depend on whose laptop it is.
 *  - resolveDataDir: `oahs serve` persists by default (losing a workspace to
 *    a forgotten --data flag is not a valid failure mode); in-memory is the
 *    explicit --ephemeral opt-in.
 */
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  defaultUrl,
  loadProfile,
  profileDir,
  resolveDataDir,
  resolveIdentity,
  saveIdentity,
  setDefaultIdentity,
  setServerUrl,
} from '../src/cli-config.js';

describe('defaultUrl — flag > env OAHS_URL > profile server.url > localhost:4521', () => {
  let home: string;
  let clean: NodeJS.ProcessEnv;

  beforeEach(() => {
    home = mkdtempSync(join(tmpdir(), 'oahs-defaults-'));
    clean = { OAHS_HOME: home };
  });
  afterEach(() => {
    rmSync(home, { recursive: true, force: true });
  });

  it('falls back to the unified default port 4521', () => {
    expect(defaultUrl(clean)).toBe('http://localhost:4521');
  });

  it('honors env OAHS_URL', () => {
    expect(defaultUrl({ ...clean, OAHS_URL: 'http://spine.internal:9000' })).toBe(
      'http://spine.internal:9000',
    );
  });

  it('ignores an empty OAHS_URL', () => {
    expect(defaultUrl({ ...clean, OAHS_URL: '' })).toBe('http://localhost:4521');
  });

  it('uses the profile server.url when no env says otherwise', () => {
    // The layer the old header comment omitted, and the reason the fallback cases
    // above must isolate: a saved profile legitimately wins over the default.
    setServerUrl('http://saved.example:9999', clean);
    expect(defaultUrl(clean)).toBe('http://saved.example:9999');
  });

  it('env OAHS_URL still outranks the profile', () => {
    setServerUrl('http://saved.example:9999', clean);
    expect(defaultUrl({ ...clean, OAHS_URL: 'http://env.example:1234' })).toBe(
      'http://env.example:1234',
    );
  });
});

describe('resolveDataDir — durable by default, --ephemeral the explicit opt-in', () => {
  it('defaults to ~/.oahs/data when neither flag nor env is present', () => {
    expect(resolveDataDir({}, {})).toBe(join(homedir(), '.oahs', 'data'));
  });

  it('--ephemeral returns undefined → the in-memory engine', () => {
    expect(resolveDataDir({ ephemeral: true }, {})).toBeUndefined();
  });

  it('env OAHS_DATA overrides the home default', () => {
    expect(resolveDataDir({}, { OAHS_DATA: '/tmp/oahs-x' })).toBe(resolve('/tmp/oahs-x'));
  });

  it('--data wins over env OAHS_DATA', () => {
    expect(resolveDataDir({ data: '/tmp/oahs-y' }, { OAHS_DATA: '/tmp/oahs-x' })).toBe(
      resolve('/tmp/oahs-y'),
    );
  });

  it('--data together with --ephemeral is a contradiction and throws', () => {
    expect(() => resolveDataDir({ data: '/tmp/oahs-y', ephemeral: true }, {})).toThrow(
      /--ephemeral/,
    );
  });
});

describe('profile store — named identities end the token-juggling era (W4, D-F)', () => {
  let home: string;
  let env: NodeJS.ProcessEnv;

  beforeEach(() => {
    home = mkdtempSync(join(tmpdir(), 'oahs-profile-'));
    env = { OAHS_HOME: home };
  });
  afterEach(() => {
    rmSync(home, { recursive: true, force: true });
  });

  it('OAHS_HOME overrides the profile root (isolated tests, portable setups)', () => {
    expect(profileDir(env)).toBe(home);
    expect(profileDir({})).toBe(join(homedir(), '.oahs'));
  });

  it('saveIdentity → loadProfile round-trips; tokens live in the file, never in logs', () => {
    saveIdentity('po', { token: 'tok-po', actorId: 'actor_po' }, env);
    saveIdentity('dev', { token: 'tok-dev', actorId: 'actor_dev' }, env);
    setDefaultIdentity('po', env);
    setServerUrl('http://spine.local:4521', env);

    const profile = loadProfile(env);
    expect(profile.identities['po']).toEqual({ token: 'tok-po', actorId: 'actor_po' });
    expect(profile.defaultIdentity).toBe('po');
    expect(profile.server?.url).toBe('http://spine.local:4521');
    // Written where OAHS_HOME points, as one JSON file.
    expect(JSON.parse(readFileSync(join(home, 'config.json'), 'utf8')).version).toBe(1);
  });

  it('resolveIdentity: --token > --as <name> > env OAHS_TOKEN > defaultIdentity', () => {
    saveIdentity('po', { token: 'tok-po', actorId: 'a1' }, env);
    saveIdentity('dev', { token: 'tok-dev', actorId: 'a2' }, env);
    setDefaultIdentity('po', env);

    expect(resolveIdentity({ token: 'explicit' }, env).token).toBe('explicit');
    expect(resolveIdentity({ as: 'dev' }, env).token).toBe('tok-dev');
    expect(resolveIdentity({}, { ...env, OAHS_TOKEN: 'env-tok' }).token).toBe('env-tok');
    expect(resolveIdentity({}, env).token).toBe('tok-po'); // defaultIdentity

    expect(() => resolveIdentity({ as: 'ghost' }, env)).toThrow(/ghost/);
    expect(() => resolveIdentity({}, { OAHS_HOME: mkdtempSync(join(tmpdir(), 'oahs-empty-')) })).toThrow(
      /token/,
    );
  });

  it('defaultUrl consults the profile after env: flag > OAHS_URL > profile > 4521', () => {
    expect(defaultUrl(env)).toBe('http://localhost:4521');
    setServerUrl('http://spine.local:9999', env);
    expect(defaultUrl(env)).toBe('http://spine.local:9999');
    expect(defaultUrl({ ...env, OAHS_URL: 'http://winner:1' })).toBe('http://winner:1');
  });

  it('a per-directory .oahs.json pins the project context for status/work', () => {
    const dir = mkdtempSync(join(tmpdir(), 'oahs-dir-'));
    writeFileSync(join(dir, '.oahs.json'), JSON.stringify({ project: 'alpha-app' }), 'utf8');
    const profile = loadProfile(env, dir);
    expect(profile.directory?.project).toBe('alpha-app');
    rmSync(dir, { recursive: true, force: true });
  });
});
