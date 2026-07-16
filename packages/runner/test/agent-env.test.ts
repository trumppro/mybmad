/**
 * buildAgentEnv — the agent child gets a MINIMAL env, not the runner's (§8).
 *
 * This is the credential boundary: the runner holds OAHS_TOKEN, model keys and
 * an SSH agent socket; a spawned agent (arbitrary `agentCmd`) must not inherit
 * any of them by default. The allowlist is the whole security story, so it is
 * pinned here directly rather than through the heavy serve+spawn e2e path.
 */
import { afterEach, describe, expect, it } from 'vitest';

import { buildAgentEnv } from '../src/index.js';

const SECRETS = ['OAHS_TOKEN', 'OAHS_MODEL_API_KEY', 'OAHS_MODEL_ENDPOINT', 'SSH_AUTH_SOCK'];

/** Set env vars for one test, remembering originals so afterEach restores them. */
const saved: Record<string, string | undefined> = {};
function setEnv(vars: Record<string, string>): void {
  for (const [key, value] of Object.entries(vars)) {
    if (!(key in saved)) saved[key] = process.env[key];
    process.env[key] = value;
  }
}
afterEach(() => {
  for (const [key, value] of Object.entries(saved)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
    delete saved[key];
  }
});

describe('buildAgentEnv — minimal child env by default (§8)', () => {
  it('excludes runner secrets from the child env', () => {
    setEnv({
      OAHS_TOKEN: 'super-secret',
      OAHS_MODEL_API_KEY: 'sk-live-abc',
      OAHS_MODEL_ENDPOINT: 'https://models.internal',
      SSH_AUTH_SOCK: '/tmp/ssh-agent.sock',
      PATH: '/usr/bin:/bin',
    });

    const env = buildAgentEnv({ extra: { OAHS_SPEC_FILE: '/w/spec.md' } });

    for (const key of SECRETS) expect(env[key]).toBeUndefined();
  });

  it('passes the allowlist through (PATH/HOME/LANG …) and the dispatch extras', () => {
    setEnv({ PATH: '/usr/bin:/bin', HOME: '/home/agent', LANG: 'en_US.UTF-8' });

    const env = buildAgentEnv({ extra: { OAHS_SPEC_FILE: '/w/spec.md', OAHS_STORY_ID: 's-1' } });

    expect(env.PATH).toBe('/usr/bin:/bin');
    expect(env.HOME).toBe('/home/agent');
    expect(env.LANG).toBe('en_US.UTF-8');
    expect(env.OAHS_SPEC_FILE).toBe('/w/spec.md');
    expect(env.OAHS_STORY_ID).toBe('s-1');
  });

  it('merges explicit agentEnv — the sanctioned channel for model keys', () => {
    setEnv({ PATH: '/usr/bin', OAHS_TOKEN: 'super-secret' });

    const env = buildAgentEnv({
      agentEnv: { ANTHROPIC_API_KEY: 'sk-agent', MY_FLAG: '1' },
      extra: { OAHS_SPEC_FILE: '/w/spec.md' },
    });

    expect(env.ANTHROPIC_API_KEY).toBe('sk-agent');
    expect(env.MY_FLAG).toBe('1');
    expect(env.OAHS_TOKEN).toBeUndefined(); // still no runner token
  });

  it('lets the dispatch extras win over a colliding agentEnv key', () => {
    const env = buildAgentEnv({
      agentEnv: { OAHS_SPEC_FILE: '/attacker/spec.md' },
      extra: { OAHS_SPEC_FILE: '/real/spec.md' },
    });

    expect(env.OAHS_SPEC_FILE).toBe('/real/spec.md');
  });

  it('inheritEnv:true restores the FULL process env (opt-in escape hatch)', () => {
    setEnv({ OAHS_TOKEN: 'super-secret', OAHS_MODEL_API_KEY: 'sk-live-abc' });

    const env = buildAgentEnv({ inheritEnv: true, extra: { OAHS_SPEC_FILE: '/w/spec.md' } });

    expect(env.OAHS_TOKEN).toBe('super-secret');
    expect(env.OAHS_MODEL_API_KEY).toBe('sk-live-abc');
    expect(env.OAHS_SPEC_FILE).toBe('/w/spec.md');
  });
});
