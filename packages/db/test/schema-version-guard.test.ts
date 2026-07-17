/**
 * The data-dir schema-version guard (schema-guard.ts) and its stamp.
 *
 * An OLDER binary opening a dir a NEWER binary wrote is the one unsafe direction: it cannot
 * know what the newer schema changed, and PGlite offers no protection. The guard refuses it.
 * The other direction (newer binary, older dir) is allowed — the DDL is additive.
 *
 * The guard is tested against a RAW PGlite, not through the worker: getPersistentDb caches
 * one instance per dataDir, so a reopen in the same process never re-runs the guard. One
 * integration case drives it through createPgSyncEngine to prove it is actually wired in.
 */
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { SCHEMA_SQL, SCHEMA_VERSION } from '../src/schema-sql.js';
import { assertSchemaCompatible, stampSchema } from '../src/schema-guard.js';
import { SchemaVersionError } from '../src/schema-version-error.js';
import { createPgSyncEngine } from '../src/sync-engine.js';

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'oahs-schemaver-'));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('the guard (raw PGlite)', () => {
  it('allows a fresh dir and stamps it at the current version', async () => {
    const db = new PGlite(join(dir, 'pg'));
    await assertSchemaCompatible(db); // no schema_meta yet → allowed
    await db.exec(SCHEMA_SQL);
    await stampSchema(db);
    const { rows } = await db.query<{ version: number }>(`SELECT version FROM schema_meta`);
    expect(rows[0]?.version).toBe(SCHEMA_VERSION);
    await db.close();
  });

  it('refuses a dir stamped NEWER than the binary, before touching it', async () => {
    const db = new PGlite(join(dir, 'pg'));
    await db.exec(SCHEMA_SQL);
    await db.query(
      `INSERT INTO schema_meta (id, version) VALUES ('singleton', $1)
         ON CONFLICT (id) DO UPDATE SET version = EXCLUDED.version`,
      [SCHEMA_VERSION + 5],
    );
    await expect(assertSchemaCompatible(db)).rejects.toBeInstanceOf(SchemaVersionError);
    await db.close();
  });

  it('allows a dir stamped OLDER — additive DDL upgrades it', async () => {
    const db = new PGlite(join(dir, 'pg'));
    await db.exec(SCHEMA_SQL);
    // Simulate a pre-existing older stamp. SCHEMA_VERSION is 1 today, so use 0 to represent
    // "older" without depending on the current number.
    await db.query(`UPDATE schema_meta SET version = 0 WHERE id = 'singleton'`);
    await expect(assertSchemaCompatible(db)).resolves.toBeUndefined();
    await stampSchema(db);
    const { rows } = await db.query<{ version: number }>(`SELECT version FROM schema_meta`);
    expect(rows[0]?.version).toBe(SCHEMA_VERSION);
    await db.close();
  });

  it('allows a pre-guard dir — tables but no schema_meta', async () => {
    const db = new PGlite(join(dir, 'pg'));
    await db.exec(SCHEMA_SQL);
    await db.exec(`DROP TABLE schema_meta`); // as a dir written before the guard existed
    await expect(assertSchemaCompatible(db)).resolves.toBeUndefined();
    await db.close();
  });
});

describe('the guard is wired into the durable engine', () => {
  it('createPgSyncEngine refuses a newer-stamped dir with SchemaVersionError', async () => {
    // Set up a "newer" dir with a raw PGlite, then close it so the worker can open it alone.
    const pgDir = join(dir, 'pg');
    const raw = new PGlite(pgDir);
    await raw.exec(SCHEMA_SQL);
    await raw.query(
      `INSERT INTO schema_meta (id, version) VALUES ('singleton', $1)
         ON CONFLICT (id) DO UPDATE SET version = EXCLUDED.version`,
      [SCHEMA_VERSION + 1],
    );
    await raw.close();

    // First open of this dataDir in this worker → the guard runs (no cache to short-circuit).
    expect(() => createPgSyncEngine({ dataDir: pgDir })).toThrow(SchemaVersionError);
  });
});

describe('the reported schema version cannot drift from the schema', () => {
  it('oahs-version.json.schemaVersion equals packages/db SCHEMA_VERSION', () => {
    // GET /version reports oahs-version.json.schemaVersion; the guard uses this constant.
    // If they disagree, an operator diagnosing a cross-version data dir is told a lie. This
    // test is the bump discipline: change the schema constant and the reported one must follow.
    const versionFile = fileURLToPath(new URL('../../../oahs-version.json', import.meta.url));
    const reported = JSON.parse(readFileSync(versionFile, 'utf8')) as { schemaVersion: number };
    expect(reported.schemaVersion).toBe(SCHEMA_VERSION);
  });
});
