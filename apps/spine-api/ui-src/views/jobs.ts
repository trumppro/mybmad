/**
 * Agent jobs rail — router-materialized, reply-only jobs (§5.4). Read-only
 * here: the UI shows status; only a job's own agent may complete it. Rendered
 * into the chat view's right rail.
 */
import { byId, clear, el } from '../core/dom.js';
import { state } from '../core/state.js';
import { badge, emptyState } from '../components/widgets.js';

export function renderJobs(): void {
  const container = byId<HTMLDivElement>('job-list');
  clear(container);
  if (state.jobs.length === 0) {
    container.appendChild(emptyState('No agent jobs.'));
    return;
  }
  for (const job of state.jobs) {
    const card = el('div', 'card');
    const title = el('div', 'c-title', `agent ${job.agentActorId}`);
    title.appendChild(document.createTextNode(' '));
    title.appendChild(badge(job.status));
    card.appendChild(title);
    card.appendChild(
      el(
        'div',
        'c-sub',
        `job ${job.id}${job.workItemId !== null ? ` · task ${job.workItemId}` : ''}`,
      ),
    );
    if (job.note !== null) card.appendChild(el('div', 'c-sub', `note: ${job.note}`));
    container.appendChild(card);
  }
}

export function buildJobSection(): HTMLElement {
  const wrapper = el('section');
  wrapper.appendChild(el('h2', undefined, 'Agent jobs'));
  const list = el('div');
  list.id = 'job-list';
  wrapper.appendChild(list);
  return wrapper;
}
