/**
 * Fastify HTTP adapter: POST /rpc/<command> — a thin parser in front of the
 * command bus. Every rejection crosses the wire as the contracts envelope,
 * status-mapped by HTTP_STATUS so error semantics survive the transport.
 */
import { randomUUID } from 'node:crypto';
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
  COMMANDS,
  COMMAND_MAP,
  HTTP_STATUS,
  type ActorContext,
  type ErrorEnvelope,
  OAHS_VERSION,
  OAHS_SCHEMA_VERSION,
} from '@oahs/contracts';

import type { TokenStore } from './auth.js';
import { createCommandBus } from './bus.js';
import { registerMcpRoute } from './mcp.js';
import { pollingEventTail, registerEventStream, type EventStreamOptions } from './sse.js';
import { registerUiRoutes } from './ui.js';

export interface BuildServerOptions {
  engine: SpineEngine;
  tokenStore: TokenStore;
  /** Bootstrap admin credential — passed in, never read from env here. */
  adminToken: string;
  /** SSE relay knobs (poll/heartbeat intervals) — defaults are production values. */
  eventStream?: EventStreamOptions;
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

/**
 * Phase 2 bootstrap (roadmap §3): the admin token must resolve to a REAL
 * engine actor holding governance role 'admin' — gated entitlement writes
 * (assign_role/set_plan/set_*_policy/…) are authorized by the ENGINE from
 * that role, never by the transport's isAdmin flag. The mapping persists in
 * the TokenStore, so a `--data` restart reuses the same 'Workspace Admin'
 * actor; when the engine cannot confirm the persisted role (fresh engine, or
 * a persistence layer that predates Phase 2), a fresh bootstrap actor is
 * created instead.
 */
function ensureBootstrapAdminActor(engine: SpineEngine, tokenStore: TokenStore): string {
  const persisted = tokenStore.getAdminActorId();
  if (persisted !== undefined) {
    try {
      if (engine.getGovernanceRole(persisted) === 'admin') return persisted;
    } catch {
      // fall through: the engine cannot vouch for the persisted mapping
    }
  }
  const actor = engine.createActor({
    type: 'user',
    displayName: 'Workspace Admin',
    governanceRole: 'admin',
  });
  // 0.2b: the planning surface is now permissioned, and governance role is NOT a
  // delivery superuser (§3 keeps plan × governance × delivery orthogonal, and
  // requirePermission deliberately does not consult governanceRole). So seed the
  // bootstrap actor with the two delivery grants an operator needs to put work
  // into a fresh workspace. This costs no security: a governance admin can grant
  // itself any permission at will, so refusing it here would be friction, not a
  // boundary — the attack 0.2b closes is a ZERO-GRANT actor token, not this one.
  // `tools/oahs-bootstrap.sh` already performed exactly these two grants by hand;
  // this makes the intended state the default rather than a ritual to remember.
  engine.grant({ actorId: actor.id, permission: 'feature.init' });
  engine.grant({ actorId: actor.id, permission: 'task.plan' });
  tokenStore.setAdminActorId(actor.id);
  return actor.id;
}

export async function buildServer(options: BuildServerOptions): Promise<FastifyInstance> {
  const { engine, tokenStore, adminToken } = options;
  tokenStore.bootstrapAdmin(adminToken, ensureBootstrapAdminActor(engine, tokenStore));
  const bus = createCommandBus(engine, tokenStore);

  // 0.3: the spine used to run `logger: false` with 24 free-text `process.stderr.write`
  // calls as its entire diagnostic surface — no level, no timestamp, no request id, no
  // actor. An operator debugging a stuck claim at 2am had `oahs claim ls`, `oahs events`,
  // and text no aggregator can parse without a bespoke reader. JSON lines cost nothing
  // and can be shipped anywhere.
  //
  // Opt-out rather than opt-in: `OAHS_LOG=silent` restores the old behaviour for the
  // hundreds of in-process test servers, which must not each print a request log.
  const logging = (process.env['OAHS_LOG'] ?? 'info').toLowerCase();
  const app = Fastify({
    logger: logging === 'silent' ? false : { level: logging },
    // Do not trust client-supplied request ids — they end up in the log an operator
    // reads as if the server said them.
    genReqId: () => randomUUID(),
  });

  // Fastify already logs a request/response pair carrying reqId, method, url, status
  // and responseTime. What it cannot know is WHO — so `authenticate` binds the
  // resolved actorId onto this request's logger and the framework's own completion
  // line carries it. Using the framework rather than adding a third line per request
  // keeps the volume honest and needs no deprecated options.

  const authenticate = (request: FastifyRequest): ActorContext | null => {
    const header = request.headers.authorization;
    if (typeof header !== 'string' || !header.startsWith('Bearer ')) return null;
    // Wall-clock now: the served spine runs wall-clock leases (D-G), so a scoped
    // token's engine-clock expiry is comparable to Date.now().
    const resolved = tokenStore.resolve(header.slice('Bearer '.length).trim());
    if (resolved === null) {
      // A failed bearer check used to be recorded NOWHERE — not in a log (there was
      // none) and not in the event log. `oahs events` is sold as "who did what"; a
      // rejected credential is part of that answer.
      request.log.warn({ ip: request.ip }, 'auth rejected');
      return null;
    }
    // The TOKEN is never logged — only the actor it resolved to. `setBindings` is a
    // pino method that FastifyBaseLogger's interface does not surface; narrowing here
    // rather than widening the interface keeps the cast local and obvious.
    const logger = request.log as { setBindings?: (bindings: Record<string, unknown>) => void };
    logger.setBindings?.({ actorId: resolved.actorId });
    return {
      actorId: resolved.actorId,
      isAdmin: resolved.isAdmin,
      // §10.1: carry the scope so the bus can enforce the allowlist + claim/item match.
      ...(resolved.claimId !== undefined &&
      resolved.workItemId !== undefined &&
      resolved.allowedCommands !== undefined
        ? {
            scope: {
              claimId: resolved.claimId,
              workItemId: resolved.workItemId,
              allowedCommands: resolved.allowedCommands,
            },
          }
        : {}),
    };
  };

  // Liveness: the process is up and answering. Deliberately does NOT touch the engine —
  // a liveness probe that fails on a slow query gets the container killed mid-work.
  app.get('/healthz', async () => ({ ok: true }));

  // 0.3 — READINESS: can this spine actually serve? /healthz returned a hardcoded
  // `{ ok: true }` and never touched the engine, so it lied in both directions: a spine
  // whose PGlite worker had died still reported healthy, and the container HEALTHCHECK
  // (which probes only /healthz) never noticed. This does one trivial engine read, so a
  // dead or wedged worker is detectable by a probe instead of by a human.
  app.get('/readyz', async (_request, reply) => {
    try {
      engine.listActors();
      return { ok: true, engine: 'reachable' };
    } catch (error) {
      reply.code(503);
      return { ok: false, engine: 'unreachable', reason: error instanceof Error ? error.message : String(error) };
    }
  });

  // Which binary is this? Unauthenticated, like /healthz: it is build metadata,
  // not spine state. Separate from /healthz on purpose — the Docker HEALTHCHECK
  // (apps/oahs/Dockerfile) only tests that response's ok-ness, and a health probe
  // should not start failing because a version field changed shape.
  //
  // schemaVersion is DIAGNOSTIC ONLY — nothing refuses to open a data dir on a
  // mismatch yet (see packages/contracts/src/version.ts). It is here so an
  // operator staring at a cross-machine claim can ask each spine what it is
  // rather than guess.
  app.get('/version', async () => ({
    version: OAHS_VERSION,
    schemaVersion: OAHS_SCHEMA_VERSION,
  }));

  // §9.7: the command manifest for the ⌘K palette — a browser-safe view over the
  // registry (name/description/readonly ONLY, no schemas, no secrets, no
  // per-actor data). Unauthenticated on purpose: it is public shape metadata,
  // and every command still authenticates + authorizes at /rpc. The palette is a
  // VIEW over this, never a hand-maintained list.
  app.get('/commands', async () => ({
    commands: COMMANDS.map((c) => ({ name: c.name, description: c.description, readonly: c.readonly })),
  }));

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
  registerEventStream(
    app,
    pollingEventTail(engine),
    authenticate,
    (event, ctx) => engine.isEventVisibleTo(event, ctx.actorId),
    options.eventStream ?? {},
  );
  registerUiRoutes(app);

  return app;
}
