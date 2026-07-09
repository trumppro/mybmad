/**
 * Actors & personas — list_actors, create_actor (prints the one-time token to
 * copy), provision_personas (the six BMAD personas at floor-state), and
 * grant/revoke of a single permission. All the writes are admin-gated on the
 * server; the UI surfaces denials rather than pre-checking.
 */
import type { Actor } from '@oahs/core';

import { clear, el, run, setStatus } from '../core/dom.js';
import { rpc } from '../core/rpc.js';
import type { View } from '../core/router.js';
import { ACTOR_TYPES, GOVERNANCE_ROLES, PERMISSIONS } from '../core/vocab.js';
import {
  badge,
  button,
  card,
  cardSub,
  cardTitle,
  emptyState,
  field,
  section,
  select,
  table,
  textInput,
} from '../components/widgets.js';

interface CreatedActor {
  actor: Actor;
  token: string;
}

export const actorsView: View = {
  mount(container: HTMLElement): () => void {
    const view = el('div', 'view');
    const head = el('div', 'view-head');
    head.appendChild(el('h2', undefined, 'Actors & personas'));
    const toolbar = el('div', 'toolbar');
    toolbar.appendChild(
      button('Provision BMAD personas', () => {
        run(async () => {
          await rpc('provision_personas', {});
          setStatus('personas provisioned');
          reload();
        });
      }),
    );
    toolbar.appendChild(button('Refresh', () => reload()));
    head.appendChild(toolbar);
    view.appendChild(head);

    // -- create actor
    const create = section('Create actor');
    const typeSel = select(ACTOR_TYPES, 'user');
    const nameInput = textInput('display name');
    const govSel = select(['(none)', ...GOVERNANCE_ROLES], '(none)');
    const createdOut = el('div', 'section-body');
    const row = el('div', 'toolbar');
    row.appendChild(field('Type', typeSel));
    row.appendChild(field('Name', nameInput));
    row.appendChild(field('Governance', govSel));
    row.appendChild(
      button(
        'Create',
        () => {
          run(async () => {
            const displayName = nameInput.value.trim();
            if (displayName === '') throw new Error('display name is required');
            const input: Record<string, unknown> = { type: typeSel.value, displayName };
            if (govSel.value !== '(none)') input.governanceRole = govSel.value;
            const created = await rpc<CreatedActor>('create_actor', input);
            nameInput.value = '';
            const line = card();
            line.appendChild(cardTitle(`${created.actor.displayName} — ${created.actor.id}`));
            line.appendChild(cardSub(`token (copy now): ${created.token}`));
            createdOut.prepend(line);
            reload();
          });
        },
        'primary',
      ),
    );
    create.body.appendChild(row);
    create.body.appendChild(createdOut);
    view.appendChild(create.section);

    // -- grant / revoke
    const perm = section('Grant / revoke permission');
    const grantActor = textInput('actorId');
    const permSel = select(PERMISSIONS, 'task.claim');
    const permRow = el('div', 'toolbar');
    permRow.appendChild(field('Actor', grantActor));
    permRow.appendChild(field('Permission', permSel));
    permRow.appendChild(
      button('Grant', () => {
        run(async () => {
          const actorId = grantActor.value.trim();
          if (actorId === '') throw new Error('actorId is required');
          await rpc('grant_permission', { actorId, permission: permSel.value });
          setStatus(`granted ${permSel.value} to ${actorId}`);
        });
      }),
    );
    permRow.appendChild(
      button(
        'Revoke',
        () => {
          run(async () => {
            const actorId = grantActor.value.trim();
            if (actorId === '') throw new Error('actorId is required');
            await rpc('revoke_permission', { actorId, permission: permSel.value });
            setStatus(`revoked ${permSel.value} from ${actorId}`);
          });
        },
        'danger',
      ),
    );
    perm.body.appendChild(permRow);
    view.appendChild(perm.section);

    // -- actors table
    const listSection = section('All actors');
    const body = el('div', 'view-body');
    listSection.body.appendChild(body);
    view.appendChild(listSection.section);

    container.appendChild(view);

    function reload(): void {
      run(async () => {
        const actors = await rpc<Actor[]>('list_actors');
        clear(body);
        if (actors.length === 0) {
          body.appendChild(emptyState('No actors.'));
          return;
        }
        const rows = actors.map((actor) => [
          actor.id,
          badge(actor.type),
          actor.displayName,
          actor.personaCode ?? '—',
        ]);
        body.appendChild(table(['Id', 'Type', 'Name', 'Persona'], rows));
      });
    }

    reload();
    return () => {};
  },
};
