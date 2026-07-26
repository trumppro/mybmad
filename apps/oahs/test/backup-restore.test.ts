/**
 * `oahs backup` / `oahs restore` (0.3).
 *
 * The load-bearing assertion here is the REFUSAL, not the happy path. Backup's entire
 * safety claim is that it cannot produce a torn archive, and that claim rests on it
 * taking the same cross-process lock `serve` takes. The first implementation locked
 * `<dataDir>` while `serve` locks `<dataDir>/pg` — two different locks, excluding
 * nothing — so `oahs backup` archived a directory a live server was writing to and
 * reported success. The bug was invisible to a happy-path test and obvious the moment
 * anyone asserted the refusal, which is why that case is pinned first.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { acquireDataDirLock } from '@oahs/db';

import { backupCommand, restoreCommand, servedLockPath } from '../src/backup.js';

let root: string;
let dataDir: string;

/** A data dir shaped like a durable one: pg/ plus the credential store beside it. */
function seedDataDir(): void {
  mkdirSync(join(dataDir, 'pg'), { recursive: true });
  writeFileSync(join(dataDir, 'pg', 'PG_VERSION'), '16\n', 'utf8');
  writeFileSync(join(dataDir, 'tokens.json'), JSON.stringify({ version: 1, tokens: {} }), 'utf8');
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'oahs-backup-'));
  dataDir = join(root, 'data');
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe('oahs backup', () => {
  it('REFUSES while the dir is locked, and locks the SAME path serve locks', async () => {
    seedDataDir();
    // Exactly what `serve` does (apps/oahs/src/serve.ts): lock <dataDir>/pg.
    const release = await acquireDataDirLock(servedLockPath(dataDir));
    try {
      await expect(
        backupCommand({ dataDir, out: join(root, 'snap.tar.gz'), oahsVersion: 'test' }),
      ).rejects.toThrow(/being served right now/);
      // And it left nothing half-written behind.
      expect(existsSync(join(root, 'snap.tar.gz'))).toBe(false);
    } finally {
      await release();
    }
  });

  it('succeeds once the lock is released, and carries BOTH stores plus the schema version', async () => {
    seedDataDir();
    const out = join(root, 'snap.tar.gz');
    const output = await backupCommand({ dataDir, out, oahsVersion: '0.1.1' });
    expect(existsSync(out)).toBe(true);
    // Both stores in one artifact: a pg/ copy restored beside a mismatched tokens.json
    // yields a database whose actors have no resolvable tokens.
    expect(output).toContain('pg');
    expect(output).toContain('tokens.json');
    expect(output).toContain('schemaVersion');
  });

  it('refuses to overwrite an existing archive', async () => {
    seedDataDir();
    const out = join(root, 'snap.tar.gz');
    await backupCommand({ dataDir, out, oahsVersion: 'test' });
    await expect(backupCommand({ dataDir, out, oahsVersion: 'test' })).rejects.toThrow(/refusing to overwrite/);
  });

  it('refuses a dir that is not a durable data dir (an --ephemeral serve persists nothing)', async () => {
    mkdirSync(dataDir, { recursive: true });
    await expect(
      backupCommand({ dataDir, out: join(root, 'snap.tar.gz'), oahsVersion: 'test' }),
    ).rejects.toThrow(/no pg\/ subdirectory/);
  });
});

describe('oahs restore', () => {
  it('round-trips: a restored dir has the same contents', async () => {
    seedDataDir();
    const out = join(root, 'snap.tar.gz');
    await backupCommand({ dataDir, out, oahsVersion: 'test' });

    const target = join(root, 'restored');
    const output = await restoreCommand({ archive: out, dataDir: target });
    expect(output).toContain('restored');
    expect(readdirSync(target).sort()).toEqual(['pg', 'tokens.json']);
    expect(existsSync(join(target, 'pg', 'PG_VERSION'))).toBe(true);
    // The manifest is an implementation detail of the archive, not restored state.
    expect(existsSync(join(target, 'oahs-backup.json'))).toBe(false);
  });

  it('refuses a NON-EMPTY target — restore never merges into live state', async () => {
    seedDataDir();
    const out = join(root, 'snap.tar.gz');
    await backupCommand({ dataDir, out, oahsVersion: 'test' });
    // Restoring over a live dir would leave a directory that is neither the backup
    // nor the original.
    await expect(restoreCommand({ archive: out, dataDir })).rejects.toThrow(/is not empty/);
  });

  it('refuses an archive that carries no manifest (unknown schema version)', async () => {
    seedDataDir();
    const bogus = join(root, 'hand-rolled.tar.gz');
    // Someone's own `tar -czf` of a data dir: plausible-looking, no provenance.
    const { spawnSync } = await import('node:child_process');
    spawnSync('tar', ['-czf', bogus, 'pg', 'tokens.json'], { cwd: dataDir, shell: false });
    await expect(restoreCommand({ archive: bogus, dataDir: join(root, 'r2') })).rejects.toThrow(
      /carries no oahs-backup\.json/,
    );
  });
});
