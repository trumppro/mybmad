/**
 * §9.7 — unit tests for the cockpit's PURE (DOM-free) logic: the feature-board
 * stage map, the blocked-reason hints, and the ⌘K palette entry derivation. The
 * DOM views themselves are verified by eye (see ui.test.ts) + by the bundle
 * building; this pins the logic that must stay correct as the registry grows.
 */
import { describe, expect, it } from 'vitest';

import { BLOCKED_HINT, allReasonsCovered, blockedHint } from '../ui-src/core/blocked-hints.js';
import { BOARD_COLUMNS, FEATURE_STAGE_LABEL, groupFeaturesByColumn } from '../ui-src/core/feature-stages.js';
import { buildPaletteEntries, filterEntries } from '../ui-src/core/palette-entries.js';

describe('feature board stage map (§9.7)', () => {
  it('labels every feature state and covers all 8 states in the columns', () => {
    const states = ['backlog', 'spec', 'design', 'breakdown', 'executing', 'handoff', 'done', 'cancelled'] as const;
    for (const s of states) expect(typeof FEATURE_STAGE_LABEL[s]).toBe('string');
    const columned = new Set(BOARD_COLUMNS.flatMap((c) => c.states));
    expect([...columned].sort()).toEqual([...states].sort());
  });

  it('groups features into the right columns, incl. a cancelled feature', () => {
    const features = [
      { state: 'backlog' as const },
      { state: 'spec' as const },
      { state: 'design' as const },
      { state: 'executing' as const },
      { state: 'cancelled' as const },
    ];
    const cols = groupFeaturesByColumn(features);
    const by = new Map(cols.map((c) => [c.label, c.features.length]));
    expect(by.get('Backlog')).toBe(1);
    expect(by.get('In Design')).toBe(2); // spec + design collapse to one column
    expect(by.get('In Implementation')).toBe(1);
    expect(by.get('Cancelled')).toBe(1);
    expect(by.get('Ready for Impl')).toBe(0); // present but empty
  });
});

describe('blocked-reason hints (§9.7)', () => {
  it('every taxonomy reason has a non-empty hint, and blockedHint(null) is null', () => {
    expect(allReasonsCovered()).toBe(true);
    expect(blockedHint(null)).toBeNull();
    expect(blockedHint('unclear_intent')).toContain('rebaseline');
    expect(Object.keys(BLOCKED_HINT)).toContain('review_non_convergence');
  });
});

describe('⌘K palette entries — a view over the registry (§9.7)', () => {
  const commands = [
    { name: 'approve_gate', description: 'approve a gate', readonly: false },
    { name: 'get_feature', description: 'read a feature', readonly: true },
    { name: 'claim_agent_job', description: 'claim a job', readonly: false },
    { name: 'unblock_task', description: 'clear blocked', readonly: false },
  ];
  const routes = [
    { path: 'dashboard', label: 'Dashboard' },
    { path: 'actors', label: 'Actors', adminOnly: true },
    { path: 'item', label: 'Work item', hidden: true },
  ];

  it('NAVIGATE from visible routes (adminOnly/hidden respected), ACTIONS/AGENT from non-readonly commands', () => {
    const asMember = buildPaletteEntries({ commands, routes, isAdmin: false });
    // navigate: dashboard shown, actors hidden (not admin), item hidden always.
    const nav = asMember.filter((e) => e.group === 'navigate').map((e) => e.id);
    expect(nav).toEqual(['dashboard']);
    // commands: readonly get_feature excluded; agent_job → 'agent'; others 'action'.
    const cmd = asMember.filter((e) => e.kind === 'command');
    expect(cmd.map((e) => e.id).sort()).toEqual(['approve_gate', 'claim_agent_job', 'unblock_task']);
    expect(cmd.find((e) => e.id === 'claim_agent_job')?.group).toBe('agent');
    expect(cmd.find((e) => e.id === 'approve_gate')?.group).toBe('action');

    // an admin also sees the adminOnly route.
    const asAdmin = buildPaletteEntries({ commands, routes, isAdmin: true });
    expect(asAdmin.filter((e) => e.group === 'navigate').map((e) => e.id)).toEqual(['dashboard', 'actors']);
  });

  it('filterEntries does a case-insensitive subsequence match; empty matches all', () => {
    const entries = buildPaletteEntries({ commands, routes, isAdmin: true });
    expect(filterEntries(entries, '')).toHaveLength(entries.length);
    const approve = filterEntries(entries, 'aprv'); // subsequence of "approve_gate"
    expect(approve.some((e) => e.id === 'approve_gate')).toBe(true);
    expect(filterEntries(entries, 'zzzznomatch')).toHaveLength(0);
  });
});
