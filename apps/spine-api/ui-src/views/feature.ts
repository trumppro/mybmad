/**
 * Feature IDE (roadmap §9.7) — the per-feature workspace, routed by
 * #/feature/<id>. Tabs: Spec, Design, Tasks, Handoff, Activity. Every mutation
 * (advance, gate approve/reject, cancel) goes through /rpc — the board/palette
 * never bypasses the rails (§5.2). Spec/Design render metadata today; the full
 * document body flips in once §11.3 get_spec_content exists.
 */
import type { Feature, SpineEvent, WorkItem } from '@oahs/core';

import { blockedHint } from '../core/blocked-hints.js';
import { clear, el, run, setStatus } from '../core/dom.js';
import { FEATURE_STAGE_LABEL } from '../core/feature-stages.js';
import { rpc } from '../core/rpc.js';
import { routeParam, type View } from '../core/router.js';
import { badge, button, card, cardSub, cardTitle, emptyState } from '../components/widgets.js';

type Tab = 'Spec' | 'Design' | 'Tasks' | 'Handoff' | 'Activity';
const TABS: Tab[] = ['Spec', 'Design', 'Tasks', 'Handoff', 'Activity'];

/** The non-gated advance available from a given stage (portal-parity board move). */
const NEXT_ADVANCE: Partial<Record<Feature['state'], Feature['state']>> = {
  backlog: 'spec',
  spec: 'design',
  breakdown: 'executing',
  executing: 'handoff',
};

async function reload(featureId: string): Promise<{ feature: Feature; items: WorkItem[] }> {
  const feature = await rpc<Feature>('get_feature', { featureId });
  const items = await rpc<WorkItem[]>('list_work_items', { featureId });
  return { feature, items };
}

export const featureView: View = {
  mount(container: HTMLElement): () => void {
    const featureId = routeParam();
    const view = el('div', 'view');
    container.appendChild(view);
    if (featureId === '') {
      view.appendChild(emptyState('No feature id in the route.'));
      return () => {};
    }

    let tab: Tab = 'Tasks';
    const header = el('div', 'feature-header');
    const tabbar = el('div', 'tabbar');
    const body = el('div', 'feature-body');
    view.appendChild(header);
    view.appendChild(tabbar);
    view.appendChild(body);

    const render = (feature: Feature, items: WorkItem[]): void => {
      clear(header);
      header.appendChild(el('h2', undefined, feature.name ?? feature.id));
      header.appendChild(
        cardSub(`stage: ${FEATURE_STAGE_LABEL[feature.state]} (${feature.state})${feature.dispatchHold ? ' · dispatch hold' : ''}`),
      );

      clear(tabbar);
      for (const t of TABS) {
        const b = el('button', t === tab ? 'tab active' : 'tab', t);
        b.addEventListener('click', () => {
          tab = t;
          render(feature, items);
        });
        tabbar.appendChild(b);
      }

      clear(body);
      if (tab === 'Spec' || tab === 'Design') {
        const c = card();
        c.appendChild(cardTitle(`${tab} metadata`));
        c.appendChild(cardSub(`feature ${feature.id} · stage ${FEATURE_STAGE_LABEL[feature.state]}`));
        c.appendChild(cardSub('Full document body renders once get_spec_content (§11.3) is available.'));
        body.appendChild(c);
      } else if (tab === 'Tasks') {
        if (items.length === 0) body.appendChild(emptyState('No work items in this feature yet.'));
        for (const item of items) {
          const c = card();
          const title = el('div', 'c-title');
          title.appendChild(el('span', undefined, `${item.externalKey} · ${item.title} `));
          title.appendChild(badge(item.state));
          c.appendChild(title);
          if (item.blockedReason !== null) {
            c.appendChild(cardSub(`blocked: ${item.blockedReason}`));
            const hint = blockedHint(item.blockedReason);
            if (hint !== null) c.appendChild(el('div', 'blocked-hint', `→ ${hint}`));
          }
          body.appendChild(c);
        }
      } else if (tab === 'Handoff') {
        renderHandoff(body, feature, featureId, () => refresh());
      } else {
        // Activity — the feature's event stream (read-only).
        run(async () => {
          const events = await rpc<SpineEvent[]>('query_events', { streamId: featureId });
          clear(body);
          if (events.length === 0) body.appendChild(emptyState('No events for this feature yet.'));
          for (const ev of [...events].reverse()) {
            const c = card('card event-card');
            c.appendChild(cardTitle(ev.type));
            c.appendChild(cardSub(`by ${ev.actorId} · seq ${String(ev.globalSeq)}`));
            body.appendChild(c);
          }
        });
      }
    };

    const refresh = (): void => {
      run(async () => {
        const { feature, items } = await reload(featureId);
        render(feature, items);
      });
    };
    refresh();
    return () => {};
  },
};

/** The Handoff tab: stage advance + the design/handoff gate panel + cancel. */
function renderHandoff(body: HTMLElement, feature: Feature, featureId: string, onChange: () => void): void {
  const c = card();
  c.appendChild(cardTitle('Feature gates & stage'));
  c.appendChild(cardSub(`current: ${FEATURE_STAGE_LABEL[feature.state]} (${feature.state})`));
  const actions = el('div', 'c-actions');

  const next = NEXT_ADVANCE[feature.state];
  if (next !== undefined) {
    actions.appendChild(
      button(`Advance → ${next}`, () =>
        run(async () => {
          await rpc('feature_advance', { featureId, to: next });
          setStatus(`feature advanced to ${next}`);
          onChange();
        }),
      ),
    );
  }
  if (feature.state === 'design') {
    actions.appendChild(gateBtn('Approve design', 'approve_feature_gate', 'design_approval', featureId, onChange));
    actions.appendChild(gateBtn('Reject design', 'reject_feature_gate', 'design_approval', featureId, onChange));
  }
  if (feature.state === 'handoff') {
    actions.appendChild(gateBtn('Approve handoff', 'approve_feature_gate', 'handoff_approval', featureId, onChange));
    actions.appendChild(gateBtn('Reject handoff', 'reject_feature_gate', 'handoff_approval', featureId, onChange));
  }
  if (feature.state !== 'done' && feature.state !== 'cancelled') {
    actions.appendChild(
      button('Cancel feature', () =>
        run(async () => {
          await rpc('cancel_feature', { featureId });
          setStatus('feature cancelled');
          onChange();
        }),
      ),
    );
  }
  c.appendChild(actions);
  body.appendChild(c);
}

function gateBtn(
  label: string,
  command: 'approve_feature_gate' | 'reject_feature_gate',
  gate: string,
  featureId: string,
  onChange: () => void,
): HTMLElement {
  return button(label, () =>
    run(async () => {
      await rpc(command, { featureId, gate });
      setStatus(`${command} ${gate} sent`);
      onChange();
    }),
  );
}
