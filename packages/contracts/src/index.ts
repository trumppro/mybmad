/**
 * @oahs/contracts — the single source of truth for every oahs command.
 *
 * One registry entry = one HTTP endpoint (`POST /rpc/<name>`) = one MCP tool
 * (`oahs_<name>`) = one typed client method. Both adapters call the same
 * command bus with the same zod-validated input, so "MCP semantics ≡ HTTP
 * semantics" is a structural consequence, not a review discipline
 * (product-roadmap.md §0.1 invariant, D5).
 *
 * Transport is deliberately uniform RPC (no REST path parameters): parity
 * between surfaces stays machine-checkable, and the parity test in
 * apps/spine-api asserts every registry entry exists on both surfaces.
 */
import { z } from 'zod';
import {
  BLOCKED_REASONS,
  WORK_ITEM_STATES,
  type SpineEngine,
} from '@oahs/core';

// ---------------------------------------------------------------------------
// Shared field schemas
// ---------------------------------------------------------------------------

const workItemId = z.string().min(1).describe('Work item id (or its stories.yaml externalKey)');
const fencingToken = z
  .number()
  .int()
  .optional()
  .describe('Fencing token of the live claim — required for execution-zone mutations');

const evidenceSchema = z
  .object({
    kind: z.enum(['test_run', 'git_diff', 'commit', 'halt_report', 'review_report', 'doc_lint']),
    payload: z.record(z.string(), z.unknown()),
  })
  .describe('Raw machine-collected evidence; the core computes verdicts, the runner never does');

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

export interface CommandDef<Input extends z.ZodType = z.ZodType> {
  /** snake_case command name; HTTP path is /rpc/<name>, MCP tool is oahs_<name> */
  name: string;
  description: string;
  input: Input;
  /** true when the command only reads state (used for docs; same rails either way) */
  readonly: boolean;
}

function def<I extends z.ZodType>(
  name: string,
  description: string,
  input: I,
  readonly = false,
): CommandDef<I> {
  return { name, description, input, readonly };
}

export const COMMANDS = [
  // -- setup / admin ---------------------------------------------------------
  def(
    'create_actor',
    'Create a user or agent actor. Returns the actor and its API token (admin only).',
    z.object({
      type: z.enum(['user', 'agent']),
      displayName: z.string().min(1),
    }),
  ),
  def(
    'grant_permission',
    'Grant a permission to an actor (admin only). Grants are explicit and audited — authority never comes from actor type, tenure, or memory (thesis §3).',
    z.object({
      actorId: z.string().min(1),
      permission: z.string().min(1),
      scope: z.string().optional(),
    }),
  ),
  def(
    'revoke_permission',
    'Revoke a permission from an actor (admin only).',
    z.object({
      actorId: z.string().min(1),
      permission: z.string().min(1),
      scope: z.string().optional(),
    }),
  ),
  def('create_feature', 'Create a feature (maps a BMAD epic).', z.object({})),
  def(
    'import_stories',
    'Import a stories.yaml file into a feature (idempotent re-import; validity rules from stories-schema.md).',
    z.object({
      featureId: z.string().min(1),
      yaml: z.string().min(1),
    }),
  ),

  // -- claims ----------------------------------------------------------------
  def(
    'claim_task',
    'Claim a work item under a lease. Returns the claim with its fencing token.',
    z.object({
      workItemId,
      ttlMs: z.number().int().positive().optional(),
    }),
  ),
  def('heartbeat', 'Renew the lease of a live claim.', z.object({ claimId: z.string().min(1) })),
  def(
    'release_claim',
    'Release a claim (normal completion or voluntary handoff).',
    z.object({ claimId: z.string().min(1), reason: z.string().optional() }),
  ),

  // -- lifecycle ---------------------------------------------------------------
  def(
    'advance_state',
    'Advance a work item through the FSM. Deterministic: permission + guards + evidence decide, never interpretation.',
    z.object({
      workItemId,
      to: z.enum(WORK_ITEM_STATES),
      fencingToken,
      idempotencyKey: z.string().optional(),
    }),
  ),
  def(
    'block_task',
    'Set the blocked overlay with a blocking condition from the HALT taxonomy.',
    z.object({
      workItemId,
      reason: z.enum(BLOCKED_REASONS),
      fencingToken,
    }),
  ),
  def('unblock_task', 'Clear the blocked overlay (review_non_convergence needs the review gate grant).', z.object({ workItemId })),
  def(
    'submit_evidence',
    'Submit raw machine-collected evidence (exit codes, diff stats, shas). The core computes verdicts.',
    z.object({ workItemId, evidence: evidenceSchema, fencingToken }),
  ),
  def(
    'approve_gate',
    'Approve a gate as a permitted actor. spec_approval pins the verification commands (D7) and fires draft→ready_for_dev; review_approval checks pinned evidence and fires in_review→done.',
    z.object({
      workItemId,
      gate: z.enum(['spec_approval', 'review_approval']),
      pinnedVerification: z.array(z.string()).optional(),
    }),
  ),
  def(
    'reject_gate',
    'Reject a gate as a permitted actor. Review rejection fires the loopback as a system effect (or blocks with review_non_convergence on the 6th).',
    z.object({
      workItemId,
      gate: z.enum(['spec_approval', 'review_approval']),
    }),
  ),
  def(
    'release_dispatch_hold',
    'Release a done_checkpoint dispatch hold on a feature (permitted actors only).',
    z.object({ featureId: z.string().min(1) }),
  ),

  // -- ops (so nobody ever needs to touch the DB by hand) -----------------------
  def(
    'force_release_claim',
    'Ops: force-release the live claim of a work item (stuck runner, lost machine).',
    z.object({ workItemId }),
  ),

  // -- queries -----------------------------------------------------------------
  def('get_work_item', 'Fetch one work item by id or externalKey.', z.object({ workItemId }), true),
  def('get_feature', 'Fetch one feature.', z.object({ featureId: z.string().min(1) }), true),
  def(
    'get_task_context',
    'Dispatch context for a runner: entry state routing per dev-auto. Refuses done items and held features.',
    z.object({ workItemId }),
    true,
  ),
  def(
    'list_work_items',
    'List work items, optionally filtered by state / feature / claimability.',
    z.object({
      state: z.enum(WORK_ITEM_STATES).optional(),
      featureId: z.string().optional(),
      claimable: z.boolean().optional().describe('true = no live claim on the item'),
    }),
    true,
  ),
  def(
    'inbox',
    'Gate-holder inbox: items awaiting a gate decision (draft+spec_checkpoint awaiting spec approval; in_review awaiting review decision).',
    z.object({}),
    true,
  ),
  def(
    'query_events',
    'Audit query: the append-only event log, optionally scoped to one stream.',
    z.object({ streamId: z.string().optional() }),
    true,
  ),
  def('get_claims', 'All claims (live and released) of a work item.', z.object({ workItemId }), true),
  def('whoami', 'Resolve the authenticated actor.', z.object({}), true),
] as const;

export type CommandName = (typeof COMMANDS)[number]['name'];

export const COMMAND_MAP: ReadonlyMap<string, CommandDef> = new Map(
  COMMANDS.map((c) => [c.name, c as CommandDef]),
);

/** MCP tool name for a command (uniform prefix, D11 vocabulary). */
export function mcpToolName(command: string): string {
  return `oahs_${command}`;
}

/** JSON Schema for a command input (zod v4 native emitter) — used verbatim as the MCP tool inputSchema. */
export function inputJsonSchema(command: string): Record<string, unknown> {
  const defn = COMMAND_MAP.get(command);
  if (!defn) throw new Error(`unknown command: ${command}`);
  return z.toJSONSchema(defn.input) as Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Wire envelope
// ---------------------------------------------------------------------------

/**
 * Every rejection crosses the wire as a machine-readable envelope carrying
 * the core error class name — clients rethrow the proper class, so error
 * semantics survive the transport (409 for conflicts, 403 for permission,
 * 422 for guards/transitions/validation).
 */
export interface ErrorEnvelope {
  ok: false;
  error: {
    name:
      | 'PermissionDeniedError'
      | 'GuardFailedError'
      | 'ConflictError'
      | 'InvalidTransitionError'
      | 'StoriesValidationError'
      | 'Error';
    message: string;
  };
}

export interface OkEnvelope<T = unknown> {
  ok: true;
  result: T;
}

export type Envelope<T = unknown> = OkEnvelope<T> | ErrorEnvelope;

export const HTTP_STATUS: Record<ErrorEnvelope['error']['name'], number> = {
  PermissionDeniedError: 403,
  ConflictError: 409,
  GuardFailedError: 422,
  InvalidTransitionError: 422,
  StoriesValidationError: 422,
  Error: 500,
};

// ---------------------------------------------------------------------------
// Command bus contract (implemented in apps/spine-api, consumed by adapters)
// ---------------------------------------------------------------------------

export interface ActorContext {
  actorId: string;
  isAdmin: boolean;
}

/**
 * The one place commands execute. HTTP and MCP are thin parsers in front of
 * this; nothing else writes state (§0.1 "no writes outside the command bus").
 */
export interface CommandBus {
  execute(command: string, input: unknown, ctx: ActorContext): Promise<unknown>;
  readonly engine: SpineEngine;
}

// ---------------------------------------------------------------------------
// Typed client (used by the oahs CLI, the runner, and tests)
// ---------------------------------------------------------------------------

export interface ClientOptions {
  baseUrl: string;
  token: string;
  fetchImpl?: typeof fetch;
}

export class OahsRemoteError extends Error {
  constructor(
    public readonly errorName: string,
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = errorName;
  }
}

export interface OahsClient {
  call<T = unknown>(command: CommandName, input?: unknown): Promise<T>;
}

export function makeClient(options: ClientOptions): OahsClient {
  const doFetch = options.fetchImpl ?? fetch;
  return {
    async call<T>(command: CommandName, input: unknown = {}): Promise<T> {
      const response = await doFetch(`${options.baseUrl}/rpc/${command}`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${options.token}`,
        },
        body: JSON.stringify(input),
      });
      const envelope = (await response.json()) as Envelope<T>;
      if (envelope.ok) return envelope.result;
      throw new OahsRemoteError(envelope.error.name, envelope.error.message, response.status);
    },
  };
}
