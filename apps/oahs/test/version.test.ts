/**
 * The version chain: /oahs-version.json -> esbuild `define` -> the bundle -> the
 * surfaces that report it (`oahs --version`, GET /version).
 *
 * These assert the CHAIN, never a literal version string — a test that hardcodes
 * "0.1.0" fails on the next release and teaches everyone to edit tests to make
 * them pass. What must never break is that the file and the binary AGREE.
 */
import { execFile } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';
import { OAHS_VERSION, OAHS_SCHEMA_VERSION } from '@oahs/contracts';

const run = promisify(execFile);
const bin = fileURLToPath(new URL('../bin/oahs.mjs', import.meta.url));
const versionFile = fileURLToPath(new URL('../../../oahs-version.json', import.meta.url));

const declared = JSON.parse(readFileSync(versionFile, 'utf8')) as {
  version: string;
  schemaVersion: number;
};

describe('the version source of truth', () => {
  it('declares a semver version and an integer schemaVersion', () => {
    expect(declared.version).toMatch(/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/);
    expect(Number.isInteger(declared.schemaVersion)).toBe(true);
  });

  it('reaches the bundled binary — `oahs --version` equals the file', async () => {
    // The whole point of the `define`. pretest rebuilds bin/oahs.mjs, so a stale
    // bundle cannot pass this by accident.
    const { stdout } = await run(process.execPath, [bin, '--version']);
    expect(stdout.trim()).toBe(declared.version);
  });

  it('falls back to a dev sentinel when NOT bundled, instead of throwing', () => {
    // This test runs unbundled: vitest has no `define`, so __OAHS_VERSION__ does
    // not exist. The typeof guard in packages/contracts/src/version.ts is what
    // keeps that a sentinel rather than a ReferenceError that would take down
    // every suite importing anything from @oahs/contracts.
    expect(OAHS_VERSION).toBe('0.0.0-dev');
    expect(OAHS_SCHEMA_VERSION).toBe(0);
  });
});

describe('$OAHS_PORT is a real knob, not decoration', () => {
  // The runtime image sets ENV OAHS_PORT and HEALTHCHECKs that port, but serve
  // used to read only --port: `docker run -e OAHS_PORT=8080` bound 4521 while the
  // probe polled 8080 => unhealthy forever.
  it('is reported as the default in --help', async () => {
    const { stdout } = await run(process.execPath, [bin, 'serve', '--help']);
    expect(stdout).toContain('$OAHS_PORT');
  });

  it('refuses a malformed value instead of quietly binding 4521', async () => {
    await expect(
      run(process.execPath, [bin, 'serve', '--ephemeral'], {
        env: { ...process.env, OAHS_PORT: 'not-a-port' },
      }),
    ).rejects.toMatchObject({ stderr: expect.stringContaining('$OAHS_PORT') });
  });

  it('refuses a malformed --port too — the same guard covers both doors', async () => {
    await expect(
      run(process.execPath, [bin, 'serve', '--ephemeral', '--port', 'abc']),
    ).rejects.toMatchObject({ stderr: expect.stringContaining('--port') });
  });

  it('does NOT break unrelated commands when $OAHS_PORT is malformed', async () => {
    // The reason parsePort lives at the point of use and not in buildProgram:
    // a typo in a port env must not take down the gate-holder commands.
    const { stdout } = await run(process.execPath, [bin, '--version'], {
      env: { ...process.env, OAHS_PORT: 'not-a-port' },
    });
    expect(stdout.trim()).toBe(declared.version);
  });
});
