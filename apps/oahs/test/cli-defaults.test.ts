/**
 * CLI defaults (Phase 7 Wave 1): one port everywhere, durable by default.
 *
 *  - defaultUrl:    --url flag > env OAHS_URL > http://localhost:4521
 *    (4521 unified across serve.ts, Makefile, compose — the 4517/4521 split
 *    had its own apology section in the Vietnamese docs).
 *  - resolveDataDir: `oahs serve` persists by default (losing a workspace to
 *    a forgotten --data flag is not a valid failure mode); in-memory is the
 *    explicit --ephemeral opt-in.
 */
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { defaultUrl, resolveDataDir } from '../src/cli-config.js';

describe('defaultUrl — flag > env OAHS_URL > localhost:4521', () => {
  it('falls back to the unified default port 4521', () => {
    expect(defaultUrl({})).toBe('http://localhost:4521');
  });

  it('honors env OAHS_URL', () => {
    expect(defaultUrl({ OAHS_URL: 'http://spine.internal:9000' })).toBe(
      'http://spine.internal:9000',
    );
  });

  it('ignores an empty OAHS_URL', () => {
    expect(defaultUrl({ OAHS_URL: '' })).toBe('http://localhost:4521');
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
