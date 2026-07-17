/**
 * `oahs serve` — boot the spine-api in-process.
 *
 * Engine selection:
 *  - default: @oahs/core createMemoryEngine (zero persistence, instant);
 *  - --data <dir>: DURABLE PGlite via @oahs/db createPgSyncEngine({dataDir})
 *    plus a persisted TokenStore, so actors/tokens/state survive restarts.
 *
 * @oahs/db is imported LAZILY: its synchronous facade spawns a synckit
 * worker (PGlite wasm) at module load, which no memory-engine serve — and no
 * gate-holder command — should ever pay for.
 *
 * Env is read in cli.ts (the entrypoint), never here: this module takes
 * everything as parameters, mirroring the spine-api convention.
 */
import { randomBytes } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import type { AddressInfo } from 'node:net';
import { join } from 'node:path';

import { createMemoryEngine } from '@oahs/core';
import { TokenStore, buildServer } from '@oahs/spine-api';

/** One port everywhere: serve.ts, Makefile, docker-compose, docs. */
export const DEFAULT_PORT = 4521;

export interface ServeOptions {
  /** TCP port (0 = ephemeral). Default 4521. */
  port?: number;
  /** Bind host. Default 0.0.0.0. */
  host?: string;
  /** Bootstrap admin credential. Omitted → generated (see handle.adminTokenGenerated). */
  adminToken?: string;
  /** Persistence root: PGlite data under <dataDir>/pg, tokens in <dataDir>/tokens.json. */
  dataDir?: string;
  /** §10.5 lease-reaper interval (ms). Default 30s; tests pass a short one. */
  reapMs?: number;
}

export interface ServeHandle {
  url: string;
  port: number;
  adminToken: string;
  /** true when no admin token was provided and one was generated. */
  adminTokenGenerated: boolean;
  engineKind: 'memory' | 'pglite';
  close(): Promise<void>;
}

export async function startServe(options: ServeOptions = {}): Promise<ServeHandle> {
  const adminTokenGenerated = options.adminToken === undefined;
  const adminToken = options.adminToken ?? randomBytes(32).toString('hex');

  let engineKind: ServeHandle['engineKind'];
  let engine;
  let tokenStore: TokenStore;
  // D-G: a SERVED spine always runs wall-clock leases — a crashed runner's
  // claim frees itself after TTL. (The logical clock stays the conformance
  // default; only serve opts in.)
  if (options.dataDir !== undefined) {
    mkdirSync(options.dataDir, { recursive: true });
    const { createPgSyncEngine } = await import('@oahs/db');
    engine = createPgSyncEngine({ dataDir: join(options.dataDir, 'pg'), wallClock: true });
    tokenStore = new TokenStore({ persistPath: join(options.dataDir, 'tokens.json') });
    engineKind = 'pglite';
  } else {
    engine = createMemoryEngine({ wallClock: true });
    tokenStore = new TokenStore();
    engineKind = 'memory';
  }

  const app = await buildServer({ engine, tokenStore, adminToken });
  await app.listen({ port: options.port ?? DEFAULT_PORT, host: options.host ?? '0.0.0.0' });
  const { port } = app.server.address() as AddressInfo;

  // §10.5: the lease reaper. A lapsed lease is already inert to every guard, so
  // this decides nothing — it publishes what the clock already made true, as a
  // `claim.expired` event plus a notification to the holder whose run died. It
  // belongs to the SERVED spine because only a served spine runs wall-clock
  // leases (D-G above); the conformance default is a logical clock nobody
  // advances. Unref'd so it never holds the process open, and failures are
  // logged rather than thrown: a reap that misses a tick costs nothing but a
  // late notice, while a crash here would take the spine down.
  const reaper = setInterval(() => {
    try {
      const { reaped } = engine.reapExpiredClaims();
      for (const claimId of reaped) process.stderr.write(`[oahs] lease expired: ${claimId}\n`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      process.stderr.write(`[oahs] lease reaper failed: ${message}\n`);
    }
  }, options.reapMs ?? 30_000);
  reaper.unref();

  return {
    url: `http://127.0.0.1:${port}`,
    port,
    adminToken,
    adminTokenGenerated,
    engineKind,
    close: async () => {
      clearInterval(reaper);
      await app.close();
    },
  };
}
