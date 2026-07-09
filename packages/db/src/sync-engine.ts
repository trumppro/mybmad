/**
 * Synchronous facade over the async PgEngine running in a synckit worker.
 * Implements the exact @oahs/core SpineEngine interface, so the conformance
 * suite drives Postgres through the same calls it drives the memory engine.
 */
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createSyncFn } from 'synckit';

import {
  ConflictError,
  GuardFailedError,
  InvalidTransitionError,
  PermissionDeniedError,
  StoriesValidationError,
  type SpineEngine,
} from '@oahs/core';

const here = dirname(fileURLToPath(import.meta.url));
const workerPath = join(here, '..', 'dist', 'worker.mjs');

type WireResult =
  | { ok: true; value: unknown }
  | { ok: false; error: { name: string; message: string } };

const callWorker = createSyncFn(workerPath) as (op: unknown) => WireResult;

const ERROR_CLASSES: Record<string, new (...args: never[]) => Error> = {
  ConflictError: ConflictError as never,
  GuardFailedError: GuardFailedError as never,
  InvalidTransitionError: InvalidTransitionError as never,
  PermissionDeniedError: PermissionDeniedError as never,
  StoriesValidationError: StoriesValidationError as never,
};

function rethrow(error: { name: string; message: string }): never {
  const Cls = ERROR_CLASSES[error.name];
  if (Cls) {
    // Reconstruct with the wire message: the conformance suite matches
    // classes, not constructor arguments.
    const instance = Object.create(Cls.prototype) as Error;
    instance.message = error.message;
    instance.name = error.name;
    throw instance;
  }
  throw new Error(`${error.name}: ${error.message}`);
}

function unwrap(result: WireResult): unknown {
  if (result.ok) return result.value;
  rethrow(result.error);
}

const METHODS: Array<keyof SpineEngine> = [
  'createActor',
  'grant',
  'revoke',
  'createFeature',
  'createWorkItem',
  'importStories',
  'claimTask',
  'heartbeat',
  'releaseClaim',
  'advanceClock',
  'advanceState',
  'blockTask',
  'unblockTask',
  'submitEvidence',
  'approveGate',
  'rejectGate',
  'getTaskContext',
  'releaseDispatchHold',
  'reconcile',
  'setGovernanceRole',
  'getGovernanceRole',
  'assignRole',
  'revokeRole',
  'listRoleAssignments',
  'setPlan',
  'getPlan',
  'setWorkspacePolicy',
  'getWorkspacePolicy',
  'setGatePolicy',
  'getGatePolicy',
  'authzExplain',
  'getWorkItem',
  'getFeature',
  'getClaims',
  'listWorkItems',
  'events',
];

export interface PgSyncEngineOptions {
  /**
   * Directory for a DURABLE PGlite database (story 13, `oahs serve --data`).
   * Omitted → in-memory database, truncated per engine (conformance mode).
   */
  dataDir?: string;
}

export function createPgSyncEngine(options?: PgSyncEngineOptions): SpineEngine {
  const created = unwrap(
    callWorker({
      op: 'new',
      ...(options?.dataDir !== undefined ? { dataDir: options.dataDir } : {}),
    }),
  ) as { engineId: number };
  const engineId = created.engineId;
  const proxy: Record<string, unknown> = {};
  for (const method of METHODS) {
    proxy[method] = (...args: unknown[]) =>
      unwrap(callWorker({ op: 'call', engineId, method, args }));
  }
  return proxy as unknown as SpineEngine;
}

// createRequire kept for future native-pg path resolution; harmless if unused.
export const _require = createRequire(import.meta.url);
