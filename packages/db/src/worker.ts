/**
 * synckit worker hosting async PgEngine instances over PGlite (in-memory
 * Postgres). The parent thread's SyncPgEngine facade calls in here
 * synchronously via Atomics — which is what lets the UNMODIFIED synchronous
 * conformance suite run against real Postgres semantics.
 *
 * Protocol: { op: 'new' } → { engineId }
 *           { op: 'call', engineId, method, args } → { ok, value | error }
 * Errors cross the boundary as { name, message } and are re-thrown as the
 * proper @oahs/core error classes by the facade.
 */
import { runAsWorker } from 'synckit';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import {
  ConflictError,
  GuardFailedError,
  InvalidTransitionError,
  PermissionDeniedError,
  StoriesValidationError,
} from '@oahs/core';

import { PgEngine } from './pg-engine.js';
import { SCHEMA_SQL } from './schema-sql.js';
import { assertSchemaCompatible, stampSchema } from './schema-guard.js';

/**
 * The @oahs/core error classes do not set `this.name`, so `err.name` is
 * plain 'Error' for all of them — the wire name must come from instanceof
 * against the SAME bundled classes PgEngine throws.
 */
const ERROR_NAMES: Array<[new (...args: never[]) => Error, string]> = [
  [ConflictError, 'ConflictError'],
  [GuardFailedError, 'GuardFailedError'],
  [InvalidTransitionError, 'InvalidTransitionError'],
  [PermissionDeniedError, 'PermissionDeniedError'],
  [StoriesValidationError, 'StoriesValidationError'],
];

function wireErrorName(error: Error): string {
  for (const [cls, name] of ERROR_NAMES) {
    if (error instanceof cls) return name;
  }
  return error.name || error.constructor?.name || 'Error';
}

interface NewOp {
  op: 'new';
  /**
   * When set, the engine runs on a DURABLE PGlite instance rooted at this
   * directory (story 13, `oahs serve --data`). No truncate happens — the
   * schema is IF NOT EXISTS-idempotent and PgEngine.init() is restart-safe.
   */
  dataDir?: string;
  /** D-G: bind the LEASE clock to real time (leases expire unattended). */
  wallClock?: boolean;
}
interface CallOp {
  op: 'call';
  engineId: number;
  method: string;
  args: unknown[];
}
type Op = NewOp | CallOp;

type WireResult =
  | { ok: true; value: unknown }
  | { ok: false; error: { name: string; message: string } };

let db: ReturnType<typeof drizzle> | null = null;
let pglite: PGlite | null = null;
const engines = new Map<number, PgEngine>();
let nextEngineId = 1;

async function getDb(): Promise<ReturnType<typeof drizzle>> {
  if (db) return db;
  pglite = new PGlite();
  db = drizzle(pglite);
  await pglite.exec(SCHEMA_SQL);
  return db;
}

/**
 * Durable databases, one PGlite per data directory. Re-opening the same
 * directory within one worker lifetime reuses the live instance — which is
 * exactly the restart-in-process shape the persistence tests exercise.
 *
 * WARNING: that reuse is THIS MAP, not a lock. PGlite does NOT hold an exclusive
 * lock on its directory, whatever this comment used to claim. Two processes open
 * the same dataDir happily, both serve writes, and the directory is destroyed —
 * reproduced: two `oahs serve --data <same>`, ten writes each, all 200; restart
 * either one and PGlite dies with `RuntimeError: Aborted()`, permanently.
 *
 * The false claim here is why no cross-process lock was ever written: the codebase
 * asserted one existed. Nothing in packages/ or apps/ locks a data dir today.
 * Do not re-introduce that claim; if you add the lock, describe what it actually does.
 */
const persistentDbs = new Map<string, ReturnType<typeof drizzle>>();

async function getPersistentDb(dataDir: string): Promise<ReturnType<typeof drizzle>> {
  const existing = persistentDbs.get(dataDir);
  if (existing) return existing;
  const instance = new PGlite(dataDir);
  // BEFORE any DDL: if a prior, NEWER binary wrote this dir, refuse rather than run our
  // (older) schema over it. Reading the stamp needs it to exist, which it only does once a
  // guard-aware binary has opened the dir — a fresh dir and every pre-guard v1 dir have no
  // stamp, which reads as "≤ current" and is allowed. exec(SCHEMA_SQL) then creates the
  // table and we stamp forward.
  await assertSchemaCompatible(instance);
  const database = drizzle(instance);
  await instance.exec(SCHEMA_SQL);
  await stampSchema(instance);
  persistentDbs.set(dataDir, database);
  return database;
}

async function resetDb(): Promise<void> {
  // A fresh engine gets a clean database. Engines are created sequentially
  // within one vitest thread, and no conformance test holds two engines at
  // once, so truncate-on-new is safe and much cheaper than re-initializing
  // the wasm instance.
  if (!pglite) return;
  await pglite.exec(`
    DO $$ DECLARE r RECORD;
    BEGIN
      FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'TRUNCATE TABLE ' || quote_ident(r.tablename) || ' RESTART IDENTITY CASCADE';
      END LOOP;
    END $$;
  `);
}

runAsWorker(async (op: Op): Promise<WireResult> => {
  try {
    if (op.op === 'new') {
      let database: ReturnType<typeof drizzle>;
      if (op.dataDir !== undefined) {
        // Durable path: no truncate — existing data is the point.
        database = await getPersistentDb(op.dataDir);
      } else {
        database = await getDb();
        await resetDb();
      }
      const engine = new PgEngine(
        database,
        op.wallClock === true ? { wallClock: true } : undefined,
      );
      await engine.init();
      const engineId = nextEngineId;
      nextEngineId += 1;
      engines.set(engineId, engine);
      return { ok: true, value: { engineId } };
    }
    const engine = engines.get(op.engineId);
    if (!engine) throw new Error(`unknown engine id ${op.engineId}`);
    const method = (engine as unknown as Record<string, unknown>)[op.method];
    if (typeof method !== 'function') throw new Error(`unknown engine method ${op.method}`);
    const value = await (method as (...a: unknown[]) => Promise<unknown>).apply(engine, op.args);
    return { ok: true, value: value ?? null };
  } catch (error) {
    const err = error as Error;
    return { ok: false, error: { name: wireErrorName(err), message: err.message } };
  }
});
