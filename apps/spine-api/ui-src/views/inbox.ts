/**
 * Gate inbox (rails, not chat). Approve/Reject call /rpc/approve_gate |
 * reject_gate DIRECTLY — a client-side affordance next to chat, never a chat
 * command (§5.2). Rendered into the chat view's right rail.
 */
import type { WorkItem } from '@oahs/core';

import { byId, clear, el, run } from '../core/dom.js';
import { loadInbox, loadMessages } from '../core/loaders.js';
import { rpc } from '../core/rpc.js';
import { state } from '../core/state.js';
import { emptyState } from '../components/widgets.js';

type Gate = 'spec_approval' | 'review_approval';
type InboxItem = WorkItem & { project?: { id: string; slug: string; name: string } };

function gateCard(item: InboxItem, gate: Gate, parent: HTMLElement): void {
  const card = el('div', 'card');
  card.appendChild(el('div', 'c-title', `${item.externalKey} — ${item.title}`));
  const pinned = (item.pinnedVerification ?? []).join(' && ');
  card.appendChild(
    el(
      'div',
      'c-sub',
      `${item.project !== undefined ? `${item.project.slug} · ` : ''}${item.state} · awaiting ${gate}${pinned !== '' ? ` · pinned: ${pinned}` : ''}`,
    ),
  );
  const actions = el('div', 'c-actions');
  const approve = el('button', 'approve', 'Approve');
  approve.addEventListener('click', () => {
    run(async () => {
      await rpc('approve_gate', { workItemId: item.id, gate });
      await Promise.all([loadInbox(), loadMessages()]);
    });
  });
  const reject = el('button', 'reject', 'Reject');
  reject.addEventListener('click', () => {
    run(async () => {
      await rpc('reject_gate', { workItemId: item.id, gate });
      await Promise.all([loadInbox(), loadMessages()]);
    });
  });
  actions.appendChild(approve);
  actions.appendChild(reject);
  card.appendChild(actions);
  parent.appendChild(card);
}

export function renderInbox(): void {
  const container = byId<HTMLDivElement>('inbox-list');
  clear(container);
  const { awaitingSpec, awaitingReview } = state.inbox;
  if (awaitingSpec.length === 0 && awaitingReview.length === 0) {
    container.appendChild(emptyState('No gates awaiting you.'));
    return;
  }
  for (const item of awaitingSpec) gateCard(item, 'spec_approval', container);
  for (const item of awaitingReview) gateCard(item, 'review_approval', container);
}

export function buildInboxSection(): HTMLElement {
  const wrapper = el('section');
  wrapper.appendChild(el('h2', undefined, 'Gate inbox'));
  const list = el('div');
  list.id = 'inbox-list';
  wrapper.appendChild(list);
  return wrapper;
}
