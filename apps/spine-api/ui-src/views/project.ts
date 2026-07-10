/**
 * Project page (Phase 7 Wave 3) — one project's cockpit: a state board of
 * every work item (across all its features), the gates waiting inside THIS
 * project, and the project's own audit stream. Reached by click from the
 * dashboard; the slug rides in the hash (#/project/<slug>).
 */
import type { WorkItem } from '@oahs/core';

import { clear, el, run, setStatus } from '../core/dom.js';
import { rpc } from '../core/rpc.js';
import { navigate, routeParam, type View } from '../core/router.js';
import { badge, button, emptyState, section, table, viewShell } from '../components/widgets.js';
import { WORK_ITEM_STATES } from '../core/vocab.js';

interface ProjectRecord {
  id: string;
  name: string;
  slug: string;
  kind: string;
  repoPath: string | null;
  defaultSpecFolder: string | null;
  state: string;
}

type InboxItem = WorkItem & { project?: { id: string; slug: string; name: string } };

function itemCard(item: WorkItem): HTMLElement {
  const cardEl = el('div', 'card item-card');
  cardEl.appendChild(el('div', 'c-title', `${item.externalKey} — ${item.title}`));
  const meta = el('div', 'c-actions');
  meta.appendChild(badge(item.kind));
  if (item.blockedReason !== null) meta.appendChild(badge(`blocked: ${item.blockedReason}`));
  cardEl.appendChild(meta);
  cardEl.addEventListener('click', () => navigate(`item/${item.id}`));
  return cardEl;
}

export const projectView: View = {
  mount(container: HTMLElement): () => void {
    const handle = routeParam();
    const { view, toolbar, body } = viewShell(`Project ${handle}`);
    toolbar.appendChild(button('← Dashboard', () => navigate('dashboard')));
    toolbar.appendChild(button('Refresh', () => reload(), 'primary'));
    container.appendChild(view);

    function reload(): void {
      run(async () => {
        const [project, items, inbox] = await Promise.all([
          rpc<ProjectRecord>('project_get', { projectId: handle }),
          rpc<WorkItem[]>('list_work_items', { projectId: handle }),
          rpc<{ awaitingSpec: InboxItem[]; awaitingReview: InboxItem[] }>('inbox'),
        ]);
        clear(body);

        // -- header ------------------------------------------------------------
        const head = el('div', 'card');
        head.appendChild(el('div', 'c-title', `${project.name} (${project.slug})`));
        head.appendChild(
          el(
            'div',
            'c-sub',
            `${project.kind} · ${project.state} · repo: ${project.repoPath ?? '(unbound)'} · spec: ${project.defaultSpecFolder ?? '(unbound)'}`,
          ),
        );
        if (project.state === 'active') {
          head.appendChild(
            button(
              'Archive project',
              () => {
                run(async () => {
                  await rpc('project_archive', { projectId: project.id });
                  setStatus(`archived ${project.slug}`);
                  navigate('dashboard');
                });
              },
              'danger',
            ),
          );
        }
        body.appendChild(head);

        // -- gates inside THIS project ------------------------------------------
        const gates = section('Gates awaiting a decision');
        const pending = [
          ...inbox.awaitingSpec.map((item) => ({ item, gate: 'spec_approval' as const })),
          ...inbox.awaitingReview.map((item) => ({ item, gate: 'review_approval' as const })),
        ].filter(({ item }) => item.project?.id === project.id);
        if (pending.length === 0) {
          gates.body.appendChild(emptyState('No gates waiting in this project.'));
        } else {
          gates.body.appendChild(
            table(
              ['Story', 'Title', 'Gate', 'Pinned verification', ''],
              pending.map(({ item, gate }) => [
                item.externalKey,
                item.title,
                badge(gate),
                (item.pinnedVerification ?? []).join(' && ') || '—',
                button('Open', () => navigate(`item/${item.id}`)),
              ]),
            ),
          );
        }
        body.appendChild(gates.section);

        // -- the board ------------------------------------------------------------
        const board = section('Board');
        const columns = el('div', 'board');
        for (const stateName of WORK_ITEM_STATES) {
          const inState = items.filter((item) => item.state === stateName);
          const column = el('div', 'board-column');
          column.appendChild(el('h3', undefined, `${stateName} (${String(inState.length)})`));
          for (const item of inState) column.appendChild(itemCard(item));
          columns.appendChild(column);
        }
        board.body.appendChild(columns);
        if (items.length === 0) board.body.appendChild(emptyState('No work items yet — import a stories.yaml.'));
        body.appendChild(board.section);
      });
    }

    reload();
    return () => {};
  },
};
