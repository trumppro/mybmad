/**
 * UI-facing vocabulary — small enums mirrored from @oahs/core so the ops views
 * can populate dropdowns WITHOUT importing values from the engine (a value
 * import would bundle all of @oahs/core into the browser). Type shapes still
 * come from `import type '@oahs/core'`, which esbuild erases. These lists are
 * stable Rules-layer vocabulary; the server remains the source of truth and
 * rejects anything stale.
 */
export const WORK_ITEM_STATES = [
  'backlog',
  'draft',
  'ready_for_dev',
  'in_progress',
  'in_review',
  'done',
] as const;

export const WORK_ITEM_KINDS = ['code', 'spec_draft', 'design_review', 'qa_report', 'doc'] as const;

export const BLOCKED_REASONS = [
  'unclear_intent',
  'no_stories_yaml_found',
  'ambiguous_story_file_match',
  'review_non_convergence',
  'no_subagents',
  'dirty_tree',
  'stale_worktree',
  'awaiting_human_input',
  'other',
] as const;

export const DELIVERY_ROLE_CODES = [
  'product_owner',
  'tech_lead',
  'reviewer',
  'developer',
  'qa',
  'contributor',
] as const;

export const PLANS = ['free', 'team', 'enterprise'] as const;

export const GOVERNANCE_ROLES = ['admin', 'member', 'auditor'] as const;

export const GATES = ['spec_approval', 'review_approval'] as const;

export const ACTOR_TYPES = ['user', 'agent'] as const;

export const MEMORY_KINDS = ['episodic', 'procedural', 'entity'] as const;

/** The permission vocabulary an authz trace can be requested for. */
export const PERMISSIONS = [
  'task.plan',
  'task.claim',
  'task.advance',
  'task.block',
  'gate.spec.approve',
  'gate.review.approve',
  'gate.review.reject',
  'feature.init',
  'feature.advance',
  'dispatch.release_hold',
  'intent.edit',
  'state.downgrade',
  'ops.force_release_claim',
  'governance.admin',
  'thread.post',
  'thread.read',
  'thread.invite',
  'agent_job.complete',
] as const;
