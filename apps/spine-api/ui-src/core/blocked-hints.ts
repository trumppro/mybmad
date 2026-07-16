/**
 * Blocked-reason → suggested next step (roadmap §9.7). Transcribed from the
 * runbook table in docs/oahs/04-so-tay-van-hanh.md so a blocked task shows the
 * operator what to do IN PLACE. Single source: the doc cites this module, so
 * they cannot drift silently. Keyed by the D8 BLOCKED_REASONS taxonomy.
 */
import { type BlockedReason } from '@oahs/core';

export const BLOCKED_HINT: Record<BlockedReason, string> = {
  unclear_intent:
    'The frozen intent contract changed or is ambiguous. Renegotiate the spec, then `oahs intent rebaseline` + unblock to re-open dispatch.',
  no_stories_yaml_found:
    'The runner found no stories.yaml in the spec folder. Add/commit it (or fix --spec-folder), then unblock.',
  ambiguous_story_file_match:
    'More than one spec file matched the story. Disambiguate the file name, then unblock.',
  review_non_convergence:
    'The review loop hit its limit (5 rejections). A review-gate holder must resolve the disagreement and unblock.',
  no_subagents:
    'The agent command produced no sub-agents / no work. Check the agent-cmd template and its environment, then unblock.',
  dirty_tree:
    'The worktree had uncommitted or conflicting changes. Clean/resolve the branch (conflict resolution is a §10 runner phase), then unblock.',
  stale_worktree:
    'A leftover worktree with no commit past baseline was cleaned. Re-dispatch the item (it returns to the pool on unblock).',
  awaiting_human_input:
    'The agent explicitly needs a human decision. Provide the answer in the task thread, then unblock.',
  other: 'See the HALT report / transcript for the blocking condition, resolve it, then unblock.',
};

/** The hint for a blocked reason (falls back to the generic `other` text). */
export function blockedHint(reason: BlockedReason | null | undefined): string | null {
  if (reason === null || reason === undefined) return null;
  return BLOCKED_HINT[reason] ?? BLOCKED_HINT.other;
}

/** Every hint is present and non-empty (guards the doc↔module contract). */
export function allReasonsCovered(): boolean {
  return Object.values(BLOCKED_HINT).every((v) => typeof v === 'string' && v !== '');
}
