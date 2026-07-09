/**
 * Work board — list_work_items with a state filter, plus planning-zone moves
 * (advance_state) and clearing a stuck overlay (unblock_task). Every action is
 * a /rpc call the server authorizes; the UI just attempts and surfaces the
 * result. No fencing token is sent — execution-zone moves the server will
 * reject, which is correct (those belong to the runner under a claim).
 */
import type { WorkItem } from '@oahs/core';

import { clear, el, run } from '../core/dom.js';
import { rpc } from '../core/rpc.js';
import type { View } from '../core/router.js';
import { WORK_ITEM_STATES } from '../core/vocab.js';
import { badge, button, emptyState, select, table } from '../components/widgets.js';

async function fetchItems(stateFilter: string): Promise<WorkItem[]> {
  const input = stateFilter === 'all' ? {} : { state: stateFilter };
  return rpc<WorkItem[]>('list_work_items', input);
}

function actionsCell(item: WorkItem, reload: () => void): HTMLElement {
  const wrap = el('div', 'c-actions');
  const to = select(WORK_ITEM_STATES, item.state);
  to.title = 'advance to state';
  wrap.appendChild(to);
  wrap.appendChild(
    button('Advance', () => {
      run(async () => {
        await rpc('advance_state', { workItemId: item.id, to: to.value });
        reload();
      });
    }),
  );
  if (item.blockedReason !== null) {
    wrap.appendChild(
      button(
        'Unblock',
        () => {
          run(async () => {
            await rpc('unblock_task', { workItemId: item.id });
            reload();
          });
        },
        'danger',
      ),
    );
  }
  return wrap;
}

export const workView: View = {
  mount(container: HTMLElement): () => void {
    const view = el('div', 'view');
    const head = el('div', 'view-head');
    head.appendChild(el('h2', undefined, 'Work items'));
    const toolbar = el('div', 'toolbar');
    const stateFilter = select(['all', ...WORK_ITEM_STATES], 'all');
    stateFilter.title = 'filter by state';
    toolbar.appendChild(stateFilter);
    const refresh = button('Refresh', () => reload());
    toolbar.appendChild(refresh);
    head.appendChild(toolbar);
    view.appendChild(head);
    const body = el('div', 'view-body');
    view.appendChild(body);
    container.appendChild(view);

    function reload(): void {
      run(async () => {
        const items = await fetchItems(stateFilter.value);
        clear(body);
        if (items.length === 0) {
          body.appendChild(emptyState('No work items for this filter.'));
          return;
        }
        const rows = items.map((item) => [
          item.externalKey,
          item.title,
          badge(item.kind),
          badge(item.state),
          item.blockedReason ?? '—',
          String(item.reviewLoopIteration),
          actionsCell(item, reload),
        ]);
        body.appendChild(
          table(['Key', 'Title', 'Kind', 'State', 'Blocked', 'Review#', 'Actions'], rows),
        );
      });
    }

    stateFilter.addEventListener('change', () => reload());
    reload();
    return () => {};
  },
};
