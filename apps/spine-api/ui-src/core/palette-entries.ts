/**
 * The ⌘K palette's PURE logic (roadmap §9.7) — DOM-free so it is unit-testable.
 * The palette is a VIEW over the command registry, never a hand-maintained list.
 */
export type PaletteGroup = 'navigate' | 'action' | 'agent';

export interface PaletteEntry {
  /** command name, or route path for a navigate entry. */
  id: string;
  label: string;
  group: PaletteGroup;
  kind: 'route' | 'command';
  description?: string;
}

export interface CommandDefLike {
  name: string;
  description: string;
  readonly: boolean;
}

export interface RouteLike {
  path: string;
  label: string;
  adminOnly?: boolean;
  hidden?: boolean;
}

/** Build the palette entries from the registry + route table. */
export function buildPaletteEntries(input: {
  commands: ReadonlyArray<CommandDefLike>;
  routes: ReadonlyArray<RouteLike>;
  isAdmin: boolean;
}): PaletteEntry[] {
  const entries: PaletteEntry[] = [];
  // NAVIGATE — the visible routes (respect adminOnly; the server still enforces).
  for (const r of input.routes) {
    if (r.hidden === true) continue;
    if (r.adminOnly === true && !input.isAdmin) continue;
    entries.push({ id: r.path, label: `Go to ${r.label}`, group: 'navigate', kind: 'route' });
  }
  // ACTIONS / AGENT — the mutating (non-readonly) commands, straight from the
  // registry so nothing is hand-maintained.
  for (const c of input.commands) {
    if (c.readonly) continue;
    const group: PaletteGroup = c.name.includes('agent_job') ? 'agent' : 'action';
    entries.push({ id: c.name, label: c.name, group, kind: 'command', description: c.description });
  }
  return entries;
}

/** Case-insensitive subsequence match. Empty query matches all. */
export function filterEntries(entries: readonly PaletteEntry[], query: string): PaletteEntry[] {
  const q = query.trim().toLowerCase();
  if (q === '') return [...entries];
  return entries.filter((e) => {
    const hay = `${e.label} ${e.group} ${e.description ?? ''}`.toLowerCase();
    let i = 0;
    for (const ch of hay) {
      if (ch === q[i]) i += 1;
      if (i === q.length) return true;
    }
    return false;
  });
}
