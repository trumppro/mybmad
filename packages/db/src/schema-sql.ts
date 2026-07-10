/**
 * Hand-maintained DDL matching schema.ts 1-1 (drizzle-kit migration pipeline
 * is later debt). Runs on PGlite in the conformance harness worker.
 */
export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS actors (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  display_name TEXT NOT NULL,
  governance_role TEXT NOT NULL DEFAULT 'member',
  persona_code TEXT
);

-- Phase 2 upgrade path for durable data dirs created under Phase 1 (story 13).
ALTER TABLE actors ADD COLUMN IF NOT EXISTS governance_role TEXT NOT NULL DEFAULT 'member';
-- Phase 4 upgrade path (roadmap §3): persona actors on durable Phase 1-3 dirs.
ALTER TABLE actors ADD COLUMN IF NOT EXISTS persona_code TEXT;

CREATE TABLE IF NOT EXISTS grants (
  actor_id TEXT NOT NULL,
  permission TEXT NOT NULL,
  scope TEXT,
  PRIMARY KEY (actor_id, permission)
);

CREATE TABLE IF NOT EXISTS role_assignments (
  seq SERIAL PRIMARY KEY,
  actor_id TEXT NOT NULL,
  role_code TEXT NOT NULL,
  granted_by TEXT NOT NULL,
  revoked BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS workspace_state (
  id TEXT PRIMARY KEY,
  plan TEXT NOT NULL,
  plan_version INTEGER NOT NULL DEFAULT 1,
  policy JSONB NOT NULL DEFAULT '{}'::jsonb,
  policy_version INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS gate_policies (
  gate TEXT PRIMARY KEY,
  policy JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS features (
  id TEXT PRIMARY KEY,
  seq SERIAL NOT NULL,
  state TEXT NOT NULL,
  dispatch_hold BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS work_items (
  id TEXT PRIMARY KEY,
  seq SERIAL NOT NULL,
  feature_id TEXT NOT NULL,
  external_key TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'code',
  title TEXT NOT NULL,
  state TEXT NOT NULL,
  blocked_reason TEXT,
  review_loop_iteration INTEGER NOT NULL DEFAULT 0,
  intent_hash TEXT,
  pinned_verification JSONB,
  spec_checkpoint BOOLEAN NOT NULL DEFAULT FALSE,
  done_checkpoint BOOLEAN NOT NULL DEFAULT FALSE,
  invoke_dev_with TEXT NOT NULL DEFAULT '',
  spec_path TEXT NOT NULL,
  state_version INTEGER NOT NULL DEFAULT 0,
  depends_on JSONB NOT NULL DEFAULT '[]'::jsonb,
  last_fencing_token INTEGER NOT NULL DEFAULT 0
);

-- Phase 4 upgrade path (roadmap §1.4): kind on durable Phase 1-3 dirs stays 'code'.
ALTER TABLE work_items ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'code';

CREATE TABLE IF NOT EXISTS claims (
  id TEXT PRIMARY KEY,
  seq SERIAL NOT NULL,
  work_item_id TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  fencing_token INTEGER NOT NULL,
  lease_expires_at BIGINT NOT NULL,
  released BOOLEAN NOT NULL DEFAULT FALSE,
  ttl_ms BIGINT NOT NULL
);

-- roadmap §1.3: one live claim per work item — races lose by constraint.
CREATE UNIQUE INDEX IF NOT EXISTS claims_one_live_per_item
  ON claims (work_item_id) WHERE released = false;

CREATE TABLE IF NOT EXISTS gate_decisions (
  seq SERIAL PRIMARY KEY,
  work_item_id TEXT NOT NULL,
  gate TEXT NOT NULL,
  decision TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  round INTEGER NOT NULL DEFAULT 0
);

-- Phase 2 upgrade path for durable data dirs created under Phase 1 (story 13).
ALTER TABLE gate_decisions ADD COLUMN IF NOT EXISTS round INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS evidence (
  seq SERIAL PRIMARY KEY,
  work_item_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  payload JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS events (
  global_seq SERIAL PRIMARY KEY,
  stream_type TEXT NOT NULL,
  stream_id TEXT NOT NULL,
  stream_seq INTEGER NOT NULL,
  type TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  payload JSONB NOT NULL,
  occurred_at BIGINT NOT NULL DEFAULT 0,
  causation_id TEXT,
  idempotency_key TEXT
);

-- Phase 7 Wave 1 upgrade path for durable data dirs created earlier:
-- occurred_at is observational audit metadata; pre-existing rows keep 0.
ALTER TABLE events ADD COLUMN IF NOT EXISTS occurred_at BIGINT NOT NULL DEFAULT 0;

-- §1.5: UNIQUE(stream_id, stream_seq) doubles as the optimistic lock.
CREATE UNIQUE INDEX IF NOT EXISTS events_stream_id_stream_seq
  ON events (stream_id, stream_seq);

CREATE TABLE IF NOT EXISTS idempotency_keys (
  key TEXT PRIMARY KEY,
  result JSONB NOT NULL
);

-- Phase 3 collaboration (roadmap §5). IF NOT EXISTS keeps durable Phase-1/2
-- data directories upgrading in place (story 13).

CREATE TABLE IF NOT EXISTS threads (
  id TEXT PRIMARY KEY,
  seq SERIAL NOT NULL,
  feature_id TEXT,
  work_item_id TEXT,
  kind TEXT NOT NULL,
  visibility TEXT NOT NULL,
  created_by TEXT NOT NULL,
  participants JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL,
  seq INTEGER NOT NULL,
  author_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  body TEXT NOT NULL,
  reply_to TEXT
);

-- §5.3: the per-thread message sequence is gap-free BY CONSTRAINT.
CREATE UNIQUE INDEX IF NOT EXISTS messages_thread_id_seq
  ON messages (thread_id, seq);

CREATE TABLE IF NOT EXISTS mentions (
  seq SERIAL PRIMARY KEY,
  message_id TEXT NOT NULL,
  mentioned_actor_id TEXT NOT NULL,
  resolution TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  seq SERIAL NOT NULL,
  actor_id TEXT NOT NULL,
  source TEXT NOT NULL,
  ref_id TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT FALSE
);

-- Phase 5 agent memory (roadmap §6). New table — IF NOT EXISTS upgrades
-- durable Phase 1-4 data directories in place; no ALTER needed.
CREATE TABLE IF NOT EXISTS agent_memories (
  id TEXT PRIMARY KEY,
  agent_actor_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  content TEXT NOT NULL,
  source_thread_id TEXT,
  source_visibility TEXT,
  seq INTEGER NOT NULL
);

-- §6: per-agent memory order is a CONSTRAINT (1-based append order).
CREATE UNIQUE INDEX IF NOT EXISTS agent_memories_agent_actor_id_seq
  ON agent_memories (agent_actor_id, seq);

CREATE TABLE IF NOT EXISTS agent_jobs (
  id TEXT PRIMARY KEY,
  seq SERIAL NOT NULL,
  agent_actor_id TEXT NOT NULL,
  thread_id TEXT NOT NULL,
  message_id TEXT NOT NULL,
  work_item_id TEXT,
  feature_id TEXT,
  status TEXT NOT NULL,
  depth INTEGER NOT NULL DEFAULT 0,
  note TEXT
);
`;
