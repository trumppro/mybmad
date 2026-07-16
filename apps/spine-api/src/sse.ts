/**
 * GET /events/stream — Server-Sent Events relay of the append-only event log.
 *
 * Read-only surface (never a write path): each SSE frame is one SpineEvent as
 * JSON with `id: <globalSeq>`, so standard EventSource reconnection
 * (Last-Event-ID) resumes exactly where the client left off; `?since=<seq>`
 * does the same for a first connect.
 *
 * Today the relay POLLS engine.events() (300ms) behind the EventTail
 * interface; a real transactional outbox can replace pollingEventTail without
 * touching the route. Heartbeat comments every 15s keep proxies from timing
 * out the idle stream; every timer is cleared on client disconnect and on
 * server close.
 */
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { SpineEngine, SpineEvent } from '@oahs/core';
import type { ActorContext, ErrorEnvelope } from '@oahs/contracts';

/** Abstract ordered event source: everything strictly after a global seq. */
export interface EventTail {
  after(globalSeq: number): SpineEvent[];
}

/** Polling implementation over engine.events() — swapped for an outbox later. */
export function pollingEventTail(engine: SpineEngine): EventTail {
  return {
    after(globalSeq: number): SpineEvent[] {
      return engine.events().filter((event) => event.globalSeq > globalSeq);
    },
  };
}

export interface EventStreamOptions {
  /** Poll interval for new events (ms). Default 300. */
  pollMs?: number;
  /** Heartbeat comment interval (ms). Default 15000. */
  heartbeatMs?: number;
}

function parseCursor(request: FastifyRequest): number {
  // SSE reconnection wins: the browser EventSource resends the last seen id.
  const lastEventId = request.headers['last-event-id'];
  const raw =
    typeof lastEventId === 'string' && lastEventId.trim() !== ''
      ? lastEventId
      : (request.query as { since?: string }).since;
  if (raw === undefined) return 0;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : 0;
}

export function registerEventStream(
  app: FastifyInstance,
  tail: EventTail,
  authenticate: (request: FastifyRequest) => ActorContext | null,
  /**
   * Per-connection visibility filter (roadmap §8): return false to withhold an
   * event from this actor (e.g. a private thread they don't participate in). The
   * cursor still advances past withheld events, so ids have gaps — Last-Event-ID
   * resume is unaffected. Defaults to fully open for callers that don't filter.
   */
  isVisible: (event: SpineEvent, ctx: ActorContext) => boolean = () => true,
  options: EventStreamOptions = {},
): void {
  const pollMs = options.pollMs ?? 300;
  const heartbeatMs = options.heartbeatMs ?? 15_000;
  const cleanups = new Set<() => void>();

  // A hijacked SSE response outlives Fastify's request lifecycle — close all
  // live streams when the server closes so tests (and shutdowns) never hang.
  app.addHook('onClose', (_instance, done) => {
    for (const cleanup of [...cleanups]) cleanup();
    done();
  });

  app.get('/events/stream', (request, reply) => {
    const ctx = authenticate(request);
    if (ctx === null) {
      void reply.code(401).send({
        ok: false,
        error: { name: 'Error', message: 'unauthorized: missing or invalid bearer token' },
      } satisfies ErrorEnvelope);
      return;
    }

    let cursor = parseCursor(request);

    reply.hijack();
    const res = reply.raw;
    res.writeHead(200, {
      'content-type': 'text/event-stream',
      'cache-control': 'no-cache, no-transform',
      connection: 'keep-alive',
      'x-accel-buffering': 'no',
    });
    res.write(': connected\n\n');

    const flush = (): void => {
      for (const event of tail.after(cursor)) {
        cursor = event.globalSeq;
        if (!isVisible(event, ctx)) continue; // withheld: cursor advances, id gaps
        res.write(`id: ${event.globalSeq}\ndata: ${JSON.stringify(event)}\n\n`);
      }
    };
    flush();

    const poll = setInterval(flush, pollMs);
    const heartbeat = setInterval(() => {
      res.write(': heartbeat\n\n');
    }, heartbeatMs);

    const cleanup = (): void => {
      clearInterval(poll);
      clearInterval(heartbeat);
      cleanups.delete(cleanup);
      if (!res.writableEnded) res.end();
    };
    cleanups.add(cleanup);
    // Response 'close' fires when the underlying socket goes away — client
    // disconnects included. (request.raw 'close' fires as soon as the parsed
    // request stream ends, which is immediately for a GET.)
    res.on('close', cleanup);
  });
}
