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
    const database = await getDb();
    if (op.op === 'new') {
      await resetDb();
      const engine = new PgEngine(database);
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
