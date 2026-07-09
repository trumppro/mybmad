/**
 * Drizzle pg-core schema for the oahs spine (Phase 1 story 11).
 *
 * Design (product-roadmap.md §1.3, §1.5 — "races lose by constraint, not by
 * application logic"):
 *  - claims: partial unique index ON (work_item_id) WHERE released = false —
 *    the second concurrent claim loses at the constraint, leaving no row.
 *  - events: UNIQUE (stream_id, stream_seq) doubles as the optimistic lock;
 *    global_seq is a serial identity.
 *  - work_items: state_version int — CAS via UPDATE ... WHERE state_version = $expected.
 *
 * Hand-maintained twin DDL lives in schema-sql.ts (runs on PGlite in the
 * conformance harness); keep the two in lockstep.
 */
import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  serial,
  text,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

// ---------------------------------------------------------------------------
// actors — users, agents, and the per-workspace system actor (roadmap §1.2)
// ---------------------------------------------------------------------------
export const actors = pgTable('actors', {
  id: text('id').primaryKey(),
  type: text('type').notNull(), // 'user' | 'agent' | 'system'
  displayName: text('display_name').notNull(),
  /** Phase 2 (roadmap §3): 'admin' | 'member' | 'auditor' — gated-write authority */
  governanceRole: text('governance_role').notNull().default('member'),
  /** Phase 4 (roadmap §3): BMAD playbook persona (e.g. 'bmad-agent-pm'); NULL for humans and plain agents */
  personaCode: text('persona_code'),
});

// ---------------------------------------------------------------------------
// grants — flat Phase-1 permission set (scope becomes meaningful in Phase 2)
// ---------------------------------------------------------------------------
export const grants = pgTable(
  'grants',
  {
    actorId: text('actor_id').notNull(),
    permission: text('permission').notNull(),
    scope: text('scope'),
  },
  (t) => [primaryKey({ columns: [t.actorId, t.permission] })],
);

// ---------------------------------------------------------------------------
// role_assignments — delivery-role bundles (Phase 2, roadmap §3). Assignment
// grants the bundle; revocation flips `revoked` (audit history is kept).
// ---------------------------------------------------------------------------
export const roleAssignments = pgTable('role_assignments', {
  seq: serial('seq').primaryKey(),
  actorId: text('actor_id').notNull(),
  roleCode: text('role_code').notNull(),
  grantedBy: text('granted_by').notNull(),
  revoked: boolean('revoked').notNull().default(false),
});

// ---------------------------------------------------------------------------
// workspace_state — the single-row plan/policy projection (Phase 2, roadmap
// §3). Exactly one row with id = 'workspace'; versions back authz.explain.
// ---------------------------------------------------------------------------
export const workspaceState = pgTable('workspace_state', {
  id: text('id').primaryKey(), // always 'workspace'
  plan: text('plan').notNull(), // 'free' | 'team' | 'enterprise'
  planVersion: integer('plan_version').notNull().default(1),
  policy: jsonb('policy').$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
  policyVersion: integer('policy_version').notNull().default(1),
});

// ---------------------------------------------------------------------------
// gate_policies — gate definitions as DATA (Phase 2, roadmap §3):
// minApprovals + requiredActorTypes, keyed by gate code.
// ---------------------------------------------------------------------------
export const gatePolicies = pgTable('gate_policies', {
  gate: text('gate').primaryKey(), // 'spec_approval' | 'review_approval'
  policy: jsonb('policy').$type<Record<string, unknown>>().notNull(),
});

// ---------------------------------------------------------------------------
// features — epic-level projection (state + done_checkpoint dispatch hold)
// ---------------------------------------------------------------------------
export const features = pgTable('features', {
  id: text('id').primaryKey(),
  seq: serial('seq').notNull(),
  state: text('state').notNull(), // 'backlog' | 'in_progress' | 'done'
  dispatchHold: boolean('dispatch_hold').notNull().default(false),
});

// ---------------------------------------------------------------------------
// work_items — the unified work-item model (roadmap §1.1)
// ---------------------------------------------------------------------------
export const workItems = pgTable('work_items', {
  id: text('id').primaryKey(),
  /** creation order — backs first-writer-wins externalKey resolution */
  seq: serial('seq').notNull(),
  featureId: text('feature_id').notNull(),
  externalKey: text('external_key').notNull(),
  /** Phase 4 (roadmap §1.4): selects WHICH machine-evidence guards apply — never WHO passes a gate */
  kind: text('kind').notNull().default('code'),
  title: text('title').notNull(),
  state: text('state').notNull(),
  blockedReason: text('blocked_reason'), // overlay, not a state (D8)
  reviewLoopIteration: integer('review_loop_iteration').notNull().default(0),
  intentHash: text('intent_hash'),
  pinnedVerification: jsonb('pinned_verification').$type<string[]>(), // Rules-layer data (D7)
  specCheckpoint: boolean('spec_checkpoint').notNull().default(false),
  doneCheckpoint: boolean('done_checkpoint').notNull().default(false),
  invokeDevWith: text('invoke_dev_with').notNull().default(''),
  specPath: text('spec_path').notNull(),
  /** optimistic concurrency: CAS by UPDATE ... WHERE state_version = expected */
  stateVersion: integer('state_version').notNull().default(0),
  /** dependency externalKeys within the same feature */
  dependsOn: jsonb('depends_on').$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  /** monotonic fencing counter per work item (roadmap §1.3) */
  lastFencingToken: integer('last_fencing_token').notNull().default(0),
});

// ---------------------------------------------------------------------------
// claims — leases + fencing tokens; ONE live claim per item BY CONSTRAINT
// ---------------------------------------------------------------------------
export const claims = pgTable(
  'claims',
  {
    id: text('id').primaryKey(),
    seq: serial('seq').notNull(),
    workItemId: text('work_item_id').notNull(),
    actorId: text('actor_id').notNull(),
    fencingToken: integer('fencing_token').notNull(),
    /** engine-clock milliseconds (JS field `now`), never SQL now() */
    leaseExpiresAt: bigint('lease_expires_at', { mode: 'number' }).notNull(),
    released: boolean('released').notNull().default(false),
    ttlMs: bigint('ttl_ms', { mode: 'number' }).notNull(),
  },
  (t) => [
    // roadmap §1.3: "One live claim per work item, enforced by a partial
    // unique index — races lose by constraint, not by application logic."
    uniqueIndex('claims_one_live_per_item').on(t.workItemId).where(sql`released = false`),
  ],
);

// ---------------------------------------------------------------------------
// gate_decisions — permission snapshot + decision record (roadmap §1.4)
// ---------------------------------------------------------------------------
export const gateDecisions = pgTable('gate_decisions', {
  seq: serial('seq').primaryKey(),
  workItemId: text('work_item_id').notNull(),
  gate: text('gate').notNull(), // 'spec_approval' | 'review_approval'
  decision: text('decision').notNull(), // 'approved' | 'rejected'
  actorId: text('actor_id').notNull(),
  /** review round the decision belongs to (= review_loop_iteration at decision time) */
  round: integer('round').notNull().default(0),
});

// ---------------------------------------------------------------------------
// evidence — machine-collected facts; seq orders "latest" semantics
// ---------------------------------------------------------------------------
export const evidence = pgTable('evidence', {
  seq: serial('seq').primaryKey(),
  workItemId: text('work_item_id').notNull(),
  kind: text('kind').notNull(),
  payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
});

// ---------------------------------------------------------------------------
// events — append-only log, same-transaction as projections (roadmap §1.5)
// ---------------------------------------------------------------------------
export const events = pgTable(
  'events',
  {
    globalSeq: serial('global_seq').primaryKey(),
    streamType: text('stream_type').notNull(), // 'workspace'|'feature'|'work_item'|'actor'
    streamId: text('stream_id').notNull(),
    streamSeq: integer('stream_seq').notNull(),
    type: text('type').notNull(),
    actorId: text('actor_id').notNull(),
    payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
    causationId: text('causation_id'),
    idempotencyKey: text('idempotency_key'),
  },
  (t) => [
    // §1.5: "UNIQUE(stream_id, stream_seq) doubles as the optimistic lock."
    uniqueIndex('events_stream_id_stream_seq').on(t.streamId, t.streamSeq),
  ],
);

// ---------------------------------------------------------------------------
// idempotency_keys — keyed replay returns the recorded result, appends nothing
// ---------------------------------------------------------------------------
export const idempotencyKeys = pgTable('idempotency_keys', {
  key: text('key').primaryKey(),
  result: jsonb('result').$type<Record<string, unknown>>().notNull(),
});

// ---------------------------------------------------------------------------
// threads — the chat SURFACE (Phase 3, roadmap §5.3). participants is jsonb:
// enforced for private threads, informational for open ones.
// ---------------------------------------------------------------------------
export const threads = pgTable('threads', {
  id: text('id').primaryKey(),
  seq: serial('seq').notNull(),
  featureId: text('feature_id'),
  workItemId: text('work_item_id'),
  kind: text('kind').notNull(), // 'spec' | 'design' | 'task' | 'general' | 'private'
  visibility: text('visibility').notNull(), // 'open' | 'private'
  createdBy: text('created_by').notNull(),
  participants: jsonb('participants').$type<string[]>().notNull().default(sql`'[]'::jsonb`),
});

// ---------------------------------------------------------------------------
// messages — one column, one table for user AND agent authors (§5.3);
// UNIQUE(thread_id, seq) keeps the per-thread sequence gap-free by constraint.
// ---------------------------------------------------------------------------
export const messages = pgTable(
  'messages',
  {
    id: text('id').primaryKey(),
    threadId: text('thread_id').notNull(),
    seq: integer('seq').notNull(), // per-thread, 1-based, gap-free
    authorId: text('author_id').notNull(),
    kind: text('kind').notNull(), // 'chat' | 'system'
    body: text('body').notNull(),
    replyTo: text('reply_to'),
  },
  (t) => [uniqueIndex('messages_thread_id_seq').on(t.threadId, t.seq)],
);

// ---------------------------------------------------------------------------
// mentions — STRUCTURED mention records + the router's recorded resolution
// (§5.4). The server never parses message bodies.
// ---------------------------------------------------------------------------
export const mentions = pgTable('mentions', {
  seq: serial('seq').primaryKey(),
  messageId: text('message_id').notNull(),
  mentionedActorId: text('mentioned_actor_id').notNull(),
  resolution: text('resolution').notNull(), // 'notified'|'job_created'|'denied_policy'|'denied_depth'
});

// ---------------------------------------------------------------------------
// notifications — mention/job-completion inbox rows (§5.4)
// ---------------------------------------------------------------------------
export const notifications = pgTable('notifications', {
  id: text('id').primaryKey(),
  seq: serial('seq').notNull(),
  actorId: text('actor_id').notNull(),
  source: text('source').notNull(), // 'mention' | 'job_completed'
  refId: text('ref_id').notNull(), // messageId for mentions, jobId for completions
  read: boolean('read').notNull().default(false),
});

// ---------------------------------------------------------------------------
// agent_memories — Phase 5 (roadmap §6): owner-scoped agent memory. seq is
// per-agent, 1-based, append order — UNIQUE(agent_actor_id, seq) makes the
// ordering a constraint, not a convention. Content lives ONLY here; memory
// events never carry it.
// ---------------------------------------------------------------------------
export const agentMemories = pgTable(
  'agent_memories',
  {
    id: text('id').primaryKey(),
    agentActorId: text('agent_actor_id').notNull(),
    kind: text('kind').notNull(), // 'episodic' | 'procedural' | 'entity'
    content: text('content').notNull(),
    sourceThreadId: text('source_thread_id'),
    sourceVisibility: text('source_visibility'), // 'open' | 'private' | NULL
    seq: integer('seq').notNull(),
  },
  (t) => [uniqueIndex('agent_memories_agent_actor_id_seq').on(t.agentActorId, t.seq)],
);

// ---------------------------------------------------------------------------
// agent_jobs — router-materialized, reply-only context (§5.4): NEVER a claim,
// never lifecycle authority. depth counts agent-mention-agent hops.
// ---------------------------------------------------------------------------
export const agentJobs = pgTable('agent_jobs', {
  id: text('id').primaryKey(),
  seq: serial('seq').notNull(),
  agentActorId: text('agent_actor_id').notNull(),
  threadId: text('thread_id').notNull(),
  messageId: text('message_id').notNull(),
  workItemId: text('work_item_id'),
  featureId: text('feature_id'),
  status: text('status').notNull(), // 'queued' | 'done' | 'blocked'
  depth: integer('depth').notNull().default(0),
  note: text('note'),
});
