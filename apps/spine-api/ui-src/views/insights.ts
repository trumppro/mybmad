/**
 * Insights — the ctx actor's OWN agent memories (search_agent_memory is
 * owner-scoped BY CONSTRUCTION: no cross-actor parameter exists, so a user
 * token sees only its own — usually none), and the detect-only reconciler
 * (file frontmatter vs DB state; never mutates). Learning is visible here but
 * never becomes authority (§6).
 */
import type { AgentMemory } from '@oahs/core';

import { clear, el, run } from '../core/dom.js';
import { rpc } from '../core/rpc.js';
import type { View } from '../core/router.js';
import { MEMORY_KINDS } from '../core/vocab.js';
import {
  badge,
  button,
  emptyState,
  field,
  section,
  select,
  table,
  textInput,
} from '../components/widgets.js';

interface DivergenceReport {
  workItemId: string;
  fileState: string;
  dbState: string;
  kind: string;
}

export const insightsView: View = {
  mount(container: HTMLElement): () => void {
    const view = el('div', 'view');
    view.appendChild(el('h2', undefined, 'Insights'));

    // -- own agent memories
    const memory = section('My agent memories (owner-scoped)');
    memory.body.appendChild(
      el('div', 'hint', 'Owner-scoped by construction — you see only your own token’s memories.'),
    );
    const kindSel = select(['all', ...MEMORY_KINDS], 'all');
    const queryInput = textInput('substring filter (optional)');
    const memOut = el('div', 'section-body');
    const memRow = el('div', 'toolbar');
    memRow.appendChild(field('Kind', kindSel));
    memRow.appendChild(field('Query', queryInput));
    memRow.appendChild(
      button(
        'Search',
        () => {
          run(async () => {
            const input: Record<string, unknown> = {};
            if (kindSel.value !== 'all') input.kind = kindSel.value;
            const query = queryInput.value.trim();
            if (query !== '') input.query = query;
            const memories = await rpc<AgentMemory[]>('search_agent_memory', input);
            clear(memOut);
            if (memories.length === 0) {
              memOut.appendChild(emptyState('No memories.'));
              return;
            }
            const rows = memories.map((mem) => [
              String(mem.seq),
              badge(mem.kind),
              mem.content,
              mem.sourceThreadId ?? '—',
            ]);
            memOut.appendChild(table(['#', 'Kind', 'Content', 'Source thread'], rows));
          });
        },
        'primary',
      ),
    );
    memory.body.appendChild(memRow);
    memory.body.appendChild(memOut);
    view.appendChild(memory.section);

    // -- reconcile (detect-only)
    const reconcile = section('Reconcile (detect-only)');
    reconcile.body.appendChild(
      el('div', 'hint', 'Reports file↔DB divergence for one work item — never mutates.'),
    );
    const wiInput = textInput('workItemId');
    const fmInput = textInput('frontmatter status (e.g. done)');
    const recOut = el('div', 'section-body');
    const recRow = el('div', 'toolbar');
    recRow.appendChild(field('Work item', wiInput));
    recRow.appendChild(field('Frontmatter', fmInput));
    recRow.appendChild(
      button('Check', () => {
        run(async () => {
          const workItemId = wiInput.value.trim();
          const frontmatterStatus = fmInput.value.trim();
          if (workItemId === '' || frontmatterStatus === '') {
            throw new Error('workItemId and frontmatter status are required');
          }
          const reports = await rpc<DivergenceReport[]>('reconcile', {
            files: [{ workItemId, frontmatterStatus }],
          });
          clear(recOut);
          if (reports.length === 0) {
            recOut.appendChild(emptyState('No divergence — file and DB agree.'));
            return;
          }
          const rows = reports.map((report) => [
            report.workItemId,
            report.fileState,
            report.dbState,
            badge(report.kind),
          ]);
          recOut.appendChild(table(['Work item', 'File', 'DB', 'Divergence'], rows));
        });
      }),
    );
    reconcile.body.appendChild(recRow);
    reconcile.body.appendChild(recOut);
    view.appendChild(reconcile.section);

    container.appendChild(view);
    return () => {};
  },
};
