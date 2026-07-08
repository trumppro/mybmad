/**
 * Fastify HTTP adapter: POST /rpc/<command> — a thin parser in front of the
 * command bus. Every rejection crosses the wire as the contracts envelope,
 * status-mapped by HTTP_STATUS so error semantics survive the transport.
 */
import Fastify, { type FastifyInstance, type FastifyRequest } from 'fastify';
import {
  ConflictError,
  GuardFailedError,
  InvalidTransitionError,
  PermissionDeniedError,
  StoriesValidationError,
  type SpineEngine,
} from '@oahs/core';
import {
  COMMAND_MAP,
  HTTP_STATUS,
  type ActorContext,
  type ErrorEnvelope,
} from '@oahs/contracts';

import type { TokenStore } from './auth.js';
import { createCommandBus } from './bus.js';
import { registerMcpRoute } from './mcp.js';

export interface BuildServerOptions {
  engine: SpineEngine;
  tokenStore: TokenStore;
  /** Bootstrap admin credential — passed in, never read from env here. */
  adminToken: string;
}

/** Map a thrown core error onto the wire error taxonomy. */
export function errorName(error: unknown): ErrorEnvelope['error']['name'] {
  if (error instanceof PermissionDeniedError) return 'PermissionDeniedError';
  if (error instanceof ConflictError) return 'ConflictError';
  if (error instanceof GuardFailedError) return 'GuardFailedError';
  if (error instanceof InvalidTransitionError) return 'InvalidTransitionError';
  if (error instanceof StoriesValidationError) return 'StoriesValidationError';
  return 'Error';
}

export function errorEnvelope(error: unknown): ErrorEnvelope {
  return {
    ok: false,
    error: {
      name: errorName(error),
      message: error instanceof Error ? error.message : String(error),
    },
  };
}

export async function buildServer(options: BuildServerOptions): Promise<FastifyInstance> {
  const { engine, tokenStore, adminToken } = options;
  tokenStore.bootstrapAdmin(adminToken);
  const bus = createCommandBus(engine, tokenStore);

  const app = Fastify({ logger: false });

  const authenticate = (request: FastifyRequest): ActorContext | null => {
    const header = request.headers.authorization;
    if (typeof header !== 'string' || !header.startsWith('Bearer ')) return null;
    const resolved = tokenStore.resolve(header.slice('Bearer '.length).trim());
    return resolved === null ? null : { actorId: resolved.actorId, isAdmin: resolved.isAdmin };
  };

  app.get('/healthz', async () => ({ ok: true }));

  app.post('/rpc/:command', async (request, reply) => {
    const ctx = authenticate(request);
    if (ctx === null) {
      return reply.code(401).send({
        ok: false,
        error: { name: 'Error', message: 'unauthorized: missing or invalid bearer token' },
      } satisfies ErrorEnvelope);
    }
    const { command } = request.params as { command: string };
    if (!COMMAND_MAP.has(command)) {
      return reply.code(404).send({
        ok: false,
        error: { name: 'Error', message: `unknown command: ${command}` },
      } satisfies ErrorEnvelope);
    }
    try {
      const result = await bus.execute(command, request.body ?? {}, ctx);
      return reply.code(200).send({ ok: true, result });
    } catch (error) {
      const envelope = errorEnvelope(error);
      return reply.code(HTTP_STATUS[envelope.error.name]).send(envelope);
    }
  });

  registerMcpRoute(app, bus, authenticate);

  return app;
}
