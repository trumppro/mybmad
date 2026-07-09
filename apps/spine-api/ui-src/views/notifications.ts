/**
 * Notifications rail — mentions and agent-job completions. "Mark read" calls
 * /rpc/mark_notification_read. Rendered into the chat view's right rail.
 */
import { byId, clear, el, run } from '../core/dom.js';
import { loadNotifications } from '../core/loaders.js';
import { rpc } from '../core/rpc.js';
import { state } from '../core/state.js';
import { emptyState } from '../components/widgets.js';

export function renderNotifications(): void {
  const container = byId<HTMLDivElement>('notification-list');
  clear(container);
  if (state.notifications.length === 0) {
    container.appendChild(emptyState('No notifications.'));
    return;
  }
  for (const notification of state.notifications) {
    const card = el('div', notification.read ? 'card' : 'card unread');
    card.appendChild(
      el(
        'div',
        'c-title',
        notification.source === 'mention' ? 'You were mentioned' : 'Agent job completed',
      ),
    );
    card.appendChild(el('div', 'c-sub', `ref ${notification.refId}`));
    if (!notification.read) {
      const actions = el('div', 'c-actions');
      const mark = el('button', undefined, 'Mark read');
      mark.addEventListener('click', () => {
        run(async () => {
          await rpc('mark_notification_read', { notificationId: notification.id });
          await loadNotifications();
        });
      });
      actions.appendChild(mark);
      card.appendChild(actions);
    }
    container.appendChild(card);
  }
}

export function buildNotificationSection(): HTMLElement {
  const wrapper = el('section');
  wrapper.appendChild(el('h2', undefined, 'Notifications'));
  const list = el('div');
  list.id = 'notification-list';
  wrapper.appendChild(list);
  return wrapper;
}
