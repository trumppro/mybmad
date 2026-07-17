/**
 * The data-dir schema-version guard, as two pure steps over anything with a PGlite-shaped
 * `query`. Extracted from the worker so it can be unit-tested against a raw PGlite: driving
 * it through the worker would hit the per-dataDir instance cache on reopen and never re-run.
 */
import { SCHEMA_VERSION } from './schema-sql.js';
import { SchemaVersionError } from './schema-version-error.js';

interface Queryable {
  query<T>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>;
}

/**
 * Throw SchemaVersionError if this dir's stamp is NEWER than the binary — the one direction
 * that is unsafe (an old binary cannot know what a newer schema changed). Call BEFORE any DDL:
 * running our schema over a newer dir is the damage. A fresh dir and every pre-guard dir have
 * no `schema_meta` table, which reads as "≤ current" and is allowed; the stamp is written after.
 */
export async function assertSchemaCompatible(db: Queryable): Promise<void> {
  const meta = await db.query<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = 'schema_meta'
     ) AS exists`,
  );
  if (meta.rows[0]?.exists !== true) return;
  const row = await db.query<{ version: number }>(
    `SELECT version FROM schema_meta WHERE id = 'singleton'`,
  );
  const stored = row.rows[0]?.version;
  if (typeof stored === 'number' && stored > SCHEMA_VERSION) {
    throw new SchemaVersionError(stored, SCHEMA_VERSION);
  }
}

/** Record that this dir is now at the binary's schema version. Only ever advances: it runs
 *  after assertSchemaCompatible, which guarantees stored ≤ SCHEMA_VERSION. */
export async function stampSchema(db: Queryable): Promise<void> {
  await db.query(
    `INSERT INTO schema_meta (id, version) VALUES ('singleton', $1)
       ON CONFLICT (id) DO UPDATE SET version = EXCLUDED.version`,
    [SCHEMA_VERSION],
  );
}
