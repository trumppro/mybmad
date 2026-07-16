/**
 * buildGitEnv — the runner's OWN git gets a git-specific ALLOWLIST (§8).
 *
 * The sibling of agent-env.test.ts. HOOK_ISOLATION stops agent-planted hooks
 * from RUNNING; this boundary is what makes the knobs it cannot stop
 * (filter.<n>.smudge on `worktree add`, core.sshCommand / credential.helper on
 * push) worthless: they still fire, but inherit no secret.
 *
 * The allowlist is the whole security story, so it is pinned here directly
 * rather than through the heavy spawn path. git-hooks.test.ts proves the same
 * boundary end-to-end against a real repo and a real filter.
 */
import { afterEach, describe, expect, it } from 'vitest';

import { buildGitEnv } from '../src/index.js';

const SECRETS = ['OAHS_TOKEN', 'OAHS_MODEL_API_KEY', 'OAHS_MODEL_ENDPOINT'];

const saved: Record<string, string | undefined> = {};
function setEnv(vars: Record<string, string>): void {
  for (const [key, value] of Object.entries(vars)) {
    if (!(key in saved)) saved[key] = process.env[key];
    process.env[key] = value;
  }
}
function unsetEnv(...keys: string[]): void {
  for (const key of keys) {
    if (!(key in saved)) saved[key] = process.env[key];
    delete process.env[key];
  }
}
afterEach(() => {
  for (const [key, value] of Object.entries(saved)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
    delete saved[key];
  }
});

describe('buildGitEnv — the runner git credential boundary (§8)', () => {
  it('excludes the runner secrets a fired config knob would otherwise read', () => {
    setEnv({
      OAHS_TOKEN: 'super-secret',
      OAHS_MODEL_API_KEY: 'sk-live-abc',
      OAHS_MODEL_ENDPOINT: 'https://models.internal',
      PATH: '/usr/bin:/bin',
    });

    const env = buildGitEnv(['push', 'origin', 'claim/x']);

    for (const key of SECRETS) expect(env[key]).toBeUndefined();
  });

  it('carries what authenticated push needs — config discovery, proxies, CAs, askpass', () => {
    setEnv({
      PATH: '/usr/bin:/bin',
      HOME: '/home/runner',
      XDG_CONFIG_HOME: '/cfg',
      https_proxy: 'http://corp:3128',
      NO_PROXY: 'internal.example',
      http_proxy: 'http://corp:3128',
      SSL_CERT_FILE: '/ca/bundle.pem',
      SSH_ASKPASS: '/usr/bin/askpass',
      GNUPGHOME: '/gnupg',
    });

    const env = buildGitEnv(['push', 'origin', 'claim/x']);

    expect(env.PATH).toBe('/usr/bin:/bin');
    expect(env.HOME).toBe('/home/runner'); // without it git silently skips ~/.gitconfig
    expect(env.XDG_CONFIG_HOME).toBe('/cfg');
    expect(env.https_proxy).toBe('http://corp:3128');
    expect(env.http_proxy).toBe('http://corp:3128'); // libcurl reads THIS case only
    expect(env.NO_PROXY).toBe('internal.example');
    expect(env.SSL_CERT_FILE).toBe('/ca/bundle.pem');
    expect(env.SSH_ASKPASS).toBe('/usr/bin/askpass');
    expect(env.GNUPGHOME).toBe('/gnupg');
  });

  it('passes operator GIT_* through — it is config the agent cannot write', () => {
    setEnv({
      GIT_SSH_COMMAND: 'ssh -i /keys/runner_ed25519',
      GIT_SSL_CAINFO: '/ca/corp.pem',
      GIT_CONFIG_GLOBAL: '/etc/gitconfig.baked', // the Docker shape
    });

    const env = buildGitEnv(['push', 'origin', 'claim/x']);

    expect(env.GIT_SSH_COMMAND).toBe('ssh -i /keys/runner_ed25519');
    expect(env.GIT_SSL_CAINFO).toBe('/ca/corp.pem');
    expect(env.GIT_CONFIG_GLOBAL).toBe('/etc/gitconfig.baked');
  });

  // Named literally rather than imported from the source: a test that reads the
  // same array it checks would pass no matter what the array said.
  const POINTERS = [
    'GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_OBJECT_DIRECTORY',
    'GIT_ALTERNATE_OBJECT_DIRECTORIES', 'GIT_COMMON_DIR', 'GIT_NAMESPACE',
    'GIT_CEILING_DIRECTORIES', 'GIT_DISCOVERY_ACROSS_FILESYSTEM',
    'GIT_INDEX_VERSION', 'GIT_ATTR_SOURCE', 'GIT_CONFIG',
  ];

  it.each(POINTERS)('drops the GIT_* repository pointer %s despite the GIT_ prefix rule', (key) => {
    // A stray GIT_DIR makes `git -C <dir> rev-parse HEAD` answer for a DIFFERENT
    // repo, so the runner would attest a tree the agent never wrote.
    setEnv({ [key]: '/somewhere/else' });

    expect(buildGitEnv(['rev-parse', 'HEAD'])[key]).toBeUndefined();
    expect(buildGitEnv(['push', 'origin', 'x'])[key]).toBeUndefined();
  });

  // Each of these is load-bearing for authenticated push, and dropping one fails
  // SILENTLY (git skips config it cannot find). Enumerated so a trim goes red.
  const MUST_CARRY = [
    'PATH', 'HOME', 'USER', 'LOGNAME',
    'XDG_CONFIG_HOME', 'XDG_CACHE_HOME',
    'TMPDIR', 'TEMP', 'TMP', 'TZ', 'TERM',
    'SSH_ASKPASS', 'SSH_ASKPASS_REQUIRE', 'DISPLAY',
    'http_proxy', 'https_proxy', 'all_proxy', 'no_proxy',
    'HTTP_PROXY', 'HTTPS_PROXY', 'ALL_PROXY', 'NO_PROXY',
    'SSL_CERT_FILE', 'SSL_CERT_DIR', 'CURL_CA_BUNDLE',
    'GNUPGHOME', 'GPG_TTY',
  ];

  it.each(MUST_CARRY)('carries %s through to git', (key) => {
    setEnv({ [key]: `value-of-${key}` });

    expect(buildGitEnv(['push', 'origin', 'claim/x'])[key]).toBe(`value-of-${key}`);
  });

  it('grants the credential brokers to push, and withholds them from local subcommands', () => {
    // Both are brokers, not strings: the socket SIGNS as the operator, and the
    // session bus reads the keyring. Neither belongs on a local subcommand.
    const BROKERS = ['SSH_AUTH_SOCK', 'SSH_AGENT_PID', 'DBUS_SESSION_BUS_ADDRESS', 'XDG_RUNTIME_DIR'];
    setEnv({
      SSH_AUTH_SOCK: '/tmp/ssh-agent.sock',
      SSH_AGENT_PID: '4242',
      DBUS_SESSION_BUS_ADDRESS: 'unix:path=/run/user/1000/bus',
      XDG_RUNTIME_DIR: '/run/user/1000',
    });

    // Remote: these are what push authenticates with.
    for (const args of [['push', 'origin', 'claim/x'], ['ls-remote', 'origin', 'refs/heads/x']]) {
      for (const key of BROKERS) expect(buildGitEnv(args)[key], `${args[0]} ${key}`).toBeDefined();
    }

    // Local: no remote is reached, so a knob firing here gets neither.
    for (const args of [
      ['worktree', 'add', '-b', 'claim/x', '/w', 'HEAD'], // the reproduced smudge path
      ['rev-parse', 'HEAD'],
      ['diff', '--shortstat', 'a..b'],
      ['branch', 'claim/x', 'HEAD'],
    ]) {
      for (const key of BROKERS) expect(buildGitEnv(args)[key], `${args[0]} ${key}`).toBeUndefined();
    }
  });

  it('keeps the socket for anything unrecognised — a miss must never break push', () => {
    setEnv({ SSH_AUTH_SOCK: '/tmp/ssh-agent.sock' });

    // Unknown subcommand, and no subcommand at all: fail SAFE for authentication.
    expect(buildGitEnv(['fetch', 'origin']).SSH_AUTH_SOCK).toBe('/tmp/ssh-agent.sock');
    expect(buildGitEnv(['clone', '--bare', 'a', 'b']).SSH_AUTH_SOCK).toBe('/tmp/ssh-agent.sock');
    expect(buildGitEnv([]).SSH_AUTH_SOCK).toBe('/tmp/ssh-agent.sock');
    expect(buildGitEnv(['--version']).SSH_AUTH_SOCK).toBe('/tmp/ssh-agent.sock');
  });

  it('finds the subcommand past leading -c/-C options', () => {
    setEnv({ SSH_AUTH_SOCK: '/tmp/ssh-agent.sock' });

    // The runner prepends HOOK_ISOLATION, and callers pass their own -c pairs;
    // a `-c` VALUE must never be mistaken for the subcommand.
    const args = ['-c', 'core.hooksPath=/dev/null', '-C', '/repo', '-c', 'user.name=T', 'rev-parse', 'HEAD'];
    expect(buildGitEnv(args).SSH_AUTH_SOCK).toBeUndefined();

    // ...and the same shape around a REMOTE subcommand still authenticates.
    expect(buildGitEnv(['-c', 'core.fsmonitor=false', 'push', 'origin', 'x']).SSH_AUTH_SOCK).toBe(
      '/tmp/ssh-agent.sock',
    );
  });

  it('forces GIT_TERMINAL_PROMPT=0 and LC_ALL=C over whatever is inherited', () => {
    // Headless: a prompt would hang the claim until its lease expires. And
    // finishRun parses git's English --shortstat output into the evidence.
    setEnv({ GIT_TERMINAL_PROMPT: '1', LC_ALL: 'fr_FR.UTF-8', LANG: 'fr_FR.UTF-8' });

    const env = buildGitEnv(['diff', '--shortstat', 'a..b']);

    expect(env.GIT_TERMINAL_PROMPT).toBe('0');
    expect(env.LC_ALL).toBe('C');
    // LANG is deliberately NOT carried: LC_ALL=C outranks it anyway, and letting
    // it through only invites the localized output the forcing exists to prevent.
    expect(env.LANG).toBeUndefined();
  });

  it('OAHS_GIT_INHERIT_ENV=1 restores the full env (opt-in escape hatch)', () => {
    setEnv({ OAHS_GIT_INHERIT_ENV: '1', OAHS_TOKEN: 'super-secret', VENDOR_SSO_TICKET: 'abc' });

    const env = buildGitEnv(['push', 'origin', 'claim/x']);

    expect(env.OAHS_TOKEN).toBe('super-secret');
    expect(env.VENDOR_SSO_TICKET).toBe('abc');
    // Correctness, not secrecy — still forced under the hatch.
    expect(env.GIT_TERMINAL_PROMPT).toBe('0');
    expect(env.LC_ALL).toBe('C');
  });

  it('is off unless the hatch is exactly "1"', () => {
    setEnv({ OAHS_GIT_INHERIT_ENV: 'true', OAHS_TOKEN: 'super-secret' });

    expect(buildGitEnv(['push', 'origin', 'x']).OAHS_TOKEN).toBeUndefined();
  });

  it('omits an unset variable rather than defining it empty', () => {
    // git reading an EMPTY http_proxy or HOME is not the same as git not seeing
    // it at all — an empty proxy is still a proxy setting to libcurl.
    unsetEnv('http_proxy', 'GNUPGHOME', 'XDG_CONFIG_HOME');

    const env = buildGitEnv(['push', 'origin', 'x']);

    expect('http_proxy' in env).toBe(false);
    expect('GNUPGHOME' in env).toBe(false);
    expect('XDG_CONFIG_HOME' in env).toBe(false);
  });
});
