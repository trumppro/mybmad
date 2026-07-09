/**
 * Claims — get_claims for a work item, release_claim (voluntary), and the ops
 * escape hatch force_release_claim (stuck runner / lost machine) so nobody ever
 * touches the DB by hand. Force-release needs the ops.force_release_claim
 * permission; the server enforces it and the UI surfaces any denial.
 */
import type { Claim } from '@oahs/core';

import { clear, el, run, setStatus } from '../core/dom.js';
import { rpc } from '../core/rpc.js';
import type { View } from '../core/router.js';
import { badge, button, emptyState, field, table, textInput } from '../components/widgets.js';

export const claimsView: View = {
  mount(container: HTMLElement): () => void {
    const view = el('div', 'view');
    const head = el('div', 'view-head');
    head.appendChild(el('h2', undefined, 'Claims'));
    view.appendChild(head);

    const toolbar = el('div', 'toolbar');
    const workItemId = textInput('workItemId or externalKey');
    toolbar.appendChild(field('Work item', workItemId));
    toolbar.appendChild(button('Load claims', () => reload(), 'primary'));
    toolbar.appendChild(
      button(
        'Force-release live claim',
        () => {
          run(async () => {
            const id = workItemId.value.trim();
            if (id === '') throw new Error('workItemId is required');
            await rpc('force_release_claim', { workItemId: id });
            setStatus(`forced release on ${id}`);
            reload();
          });
        },
        'danger',
      ),
    );
    view.appendChild(toolbar);

    const body = el('div', 'view-body');
    view.appendChild(body);
    container.appendChild(view);

    function reload(): void {
      run(async () => {
        const id = workItemId.value.trim();
        if (id === '') throw new Error('workItemId is required');
        const claims = await rpc<Claim[]>('get_claims', { workItemId: id });
        clear(body);
        if (claims.length === 0) {
          body.appendChild(emptyState('No claims on this work item.'));
          return;
        }
        const rows = claims.map((claim) => [
          claim.id,
          claim.actorId,
          String(claim.fencingToken),
          claim.released ? badge('released') : badge('live'),
          claim.released
            ? '—'
            : button('Release', () => {
                run(async () => {
                  await rpc('release_claim', { claimId: claim.id });
                  reload();
                });
              }),
        ]);
        body.appendChild(table(['Claim', 'Actor', 'Fence', 'Status', 'Action'], rows));
      });
    }

    return () => {};
  },
};
