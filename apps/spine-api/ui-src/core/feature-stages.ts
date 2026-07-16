/**
 * The feature board vocabulary (roadmap §9.7, portal parity) — ONE module so
 * the board and the API can never drift. Board labels are a PRESENTATION map
 * over the FEATURE_STATES (§9), never new states. "In TDD" is a checkpoint (the
 * tests_pinned guard between design and breakdown), not a state, so it has no
 * column of its own.
 */
import { type FeatureState } from '@oahs/core';

/** The label shown for a single feature's stage. */
export const FEATURE_STAGE_LABEL: Record<FeatureState, string> = {
  backlog: 'Backlog',
  spec: 'In Design',
  design: 'In Design',
  breakdown: 'Ready for Impl',
  executing: 'In Implementation',
  handoff: 'In Handoff',
  done: 'Done',
  cancelled: 'Cancelled',
};

/** Board columns, left-to-right, each mapping one or more states to a label. */
export const BOARD_COLUMNS: ReadonlyArray<{ label: string; states: readonly FeatureState[] }> = [
  { label: 'Backlog', states: ['backlog'] },
  { label: 'In Design', states: ['spec', 'design'] },
  { label: 'Ready for Impl', states: ['breakdown'] },
  { label: 'In Implementation', states: ['executing'] },
  { label: 'In Handoff', states: ['handoff'] },
  { label: 'Done', states: ['done'] },
  { label: 'Cancelled', states: ['cancelled'] },
];

/** Group features into board columns (every column present, empty ones included). */
export function groupFeaturesByColumn<T extends { state: FeatureState }>(
  features: readonly T[],
): Array<{ label: string; features: T[] }> {
  return BOARD_COLUMNS.map((col) => ({
    label: col.label,
    features: features.filter((f) => col.states.includes(f.state)),
  }));
}
