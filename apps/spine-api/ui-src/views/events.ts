/**
 * Audit events — query_events over the append-only log, optionally scoped to
 * one stream (a work item, feature, thread, actor, …). Read-only: this is the
 * "who did what, under which grant, on what evidence" record, shown newest
 * first. The payload cell carries the raw event JSON for an auditor to read.
 */
import type { SpineEvent } from '@oahs/core';

import { clear, el, run } from '../core/dom.js';
import { rpc } from '../core/rpc.js';
import type { View } from '../core/router.js';
import { button, emptyState, field, table, textInput } from '../components/widgets.js';

export const eventsView: View = {
  mount(container: HTMLElement): () => void {
    const view = el('div', 'view');
    const head = el('div', 'view-head');
    head.appendChild(el('h2', undefined, 'Audit events'));
    view.appendChild(head);

    const toolbar = el('div', 'toolbar');
    const streamId = textInput('streamId (optional — blank = all)');
    toolbar.appendChild(field('Stream', streamId));
    toolbar.appendChild(button('Query', () => reload(), 'primary'));
    view.appendChild(toolbar);

    const body = el('div', 'view-body');
    view.appendChild(body);
    container.appendChild(view);

    function reload(): void {
      run(async () => {
        const id = streamId.value.trim();
        const input = id === '' ? {} : { streamId: id };
        const events = await rpc<SpineEvent[]>('query_events', input);
        clear(body);
        if (events.length === 0) {
          body.appendChild(emptyState('No events.'));
          return;
        }
        const rows = [...events].reverse().map((event) => {
          const full = JSON.stringify(event.payload);
          const payload = el('span', undefined, full.length > 100 ? `${full.slice(0, 100)}…` : full);
          payload.title = full; // full JSON on hover
          return [
            String(event.globalSeq),
            `${event.streamType} ${event.streamId}`,
            event.type,
            event.actorId,
            payload,
          ];
        });
        body.appendChild(table(['Seq', 'Stream', 'Type', 'Actor', 'Payload'], rows));
      });
    }

    reload();
    return () => {};
  },
};
