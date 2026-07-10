/**
 * Work-item detail (Phase 7 Wave 3) — everything the rails know about one
 * story on one page: lifecycle + gates (with the pinned verification shown
 * BEFORE you click Approve), the evidence trail (halt_report with its agent
 * transcript path, test runs, diff, commit), claims (fencing + lease), and
 * the item's own audit timeline. Reached by click; #/item/<id-or-key>.
 */
import type { Claim, Evidence, SpineEvent, WorkItem } from '@oahs/core';

import { clear, el, run, setStatus } from '../core/dom.js';
import { rpc } from '../core/rpc.js';
import { navigate, routeParam, type View } from '../core/router.js';
import { badge, button, emptyState, section, table, viewShell } from '../components/widgets.js';

function when(ms: number): string {
  return ms > 0 ? new Date(ms).toISOString().replace(/\.\d{3}Z$/, 'Z') : '—';
}

function payloadCell(payload: Record<string, unknown>): HTMLElement {
  const full = JSON.stringify(payload, null, 2);
  const details = el('details');
  const compact = JSON.stringify(payload);
  details.appendChild(el('summary', undefined, compact.length > 80 ? `${compact.slice(0, 79)}…` : compact));
  const pre = el('pre', 'payload');
  pre.textContent = full;
  details.appendChild(pre);
  return details;
}

export const itemView: View = {
  mount(container: HTMLElement): () => void {
    const handle = routeParam();
    const { view, toolbar, body } = viewShell(`Work item ${handle}`);
    toolbar.appendChild(button('← Back', () => window.history.back()));
    toolbar.appendChild(button('Refresh', () => reload(), 'primary'));
    container.appendChild(view);

    function gateActions(item: WorkItem, parent: HTMLElement): void {
      const gate =
        item.state === 'draft' && item.specCheckpoint
          ? ('spec_approval' as const)
          : item.state === 'in_review'
            ? ('review_approval' as const)
            : null;
      if (gate === null) return;
      const row = el('div', 'c-actions');
      row.appendChild(badge(`awaiting ${gate}`));
      row.appendChild(
        el(
          'span',
          'c-sub',
          `pinned verification: ${(item.pinnedVerification ?? []).join(' && ') || '(none)'}`,
        ),
      );
      row.appendChild(
        button(
          'Approve',
          () => {
            run(async () => {
              await rpc('approve_gate', { workItemId: item.id, gate });
              setStatus(`approved ${gate} on ${item.externalKey}`);
              reload();
            });
          },
          'approve',
        ),
      );
      row.appendChild(
        button(
          'Reject',
          () => {
            run(async () => {
              await rpc('reject_gate', { workItemId: item.id, gate });
              setStatus(`rejected ${gate} on ${item.externalKey}`);
              reload();
            });
          },
          'reject',
        ),
      );
      parent.appendChild(row);
    }

    function reload(): void {
      run(async () => {
        const item = await rpc<WorkItem>('get_work_item', { workItemId: handle });
        const [claims, evidence, events, feature] = await Promise.all([
          rpc<Claim[]>('get_claims', { workItemId: item.id }),
          rpc<Evidence[]>('list_evidence', { workItemId: item.id }),
          rpc<SpineEvent[]>('query_events', { streamId: item.id }),
          rpc<{ projectId: string }>('get_feature', { featureId: item.featureId }),
        ]);
        clear(body);

        // -- overview -------------------------------------------------------------
        const head = el('div', 'card');
        head.appendChild(el('div', 'c-title', `${item.externalKey} — ${item.title}`));
        const meta = el('div', 'c-actions');
        meta.appendChild(badge(item.state));
        meta.appendChild(badge(item.kind));
        if (item.blockedReason !== null) meta.appendChild(badge(`blocked: ${item.blockedReason}`));
        meta.appendChild(el('span', 'c-sub', `review loop #${String(item.reviewLoopIteration)}`));
        head.appendChild(meta);
        head.appendChild(el('div', 'c-sub', `spec: ${item.specPath}`));
        head.appendChild(
          button('Open project', () => {
            run(async () => {
              const project = await rpc<{ slug: string }>('project_get', {
                projectId: feature.projectId,
              });
              navigate(`project/${project.slug}`);
            });
          }),
        );
        gateActions(item, head);
        body.appendChild(head);

        // -- evidence ---------------------------------------------------------------
        const evidenceSection = section('Evidence');
        if (evidence.length === 0) {
          evidenceSection.body.appendChild(emptyState('No evidence submitted yet.'));
        } else {
          evidenceSection.body.appendChild(
            table(
              ['Kind', 'Highlights', 'Payload'],
              evidence.map((entry) => {
                const highlights: string[] = [];
                const p = entry.payload;
                if (typeof p['status'] === 'string') highlights.push(`status: ${String(p['status'])}`);
                if (typeof p['command'] === 'string') highlights.push(String(p['command']));
                if (p['exitCode'] !== undefined) highlights.push(`exit ${String(p['exitCode'])}`);
                if (p['nonEmpty'] !== undefined) highlights.push(`nonEmpty: ${String(p['nonEmpty'])}`);
                if (p['reachableOnRemote'] !== undefined)
                  highlights.push(`onRemote: ${String(p['reachableOnRemote'])}`);
                if (typeof p['agentLogPath'] === 'string')
                  highlights.push(`transcript: ${String(p['agentLogPath'])}`);
                return [badge(entry.kind), highlights.join(' · ') || '—', payloadCell(entry.payload)];
              }),
            ),
          );
        }
        body.appendChild(evidenceSection.section);

        // -- claims -----------------------------------------------------------------
        const claimsSection = section('Claims');
        if (claims.length === 0) {
          claimsSection.body.appendChild(emptyState('Never claimed.'));
        } else {
          claimsSection.body.appendChild(
            table(
              ['Claim', 'Actor', 'Fence', 'Status', ''],
              claims.map((claim) => [
                claim.id,
                claim.actorId,
                String(claim.fencingToken),
                claim.released ? badge('released') : badge('live'),
                claim.released
                  ? '—'
                  : button(
                      'Force release',
                      () => {
                        run(async () => {
                          await rpc('force_release_claim', { workItemId: item.id });
                          reload();
                        });
                      },
                      'danger',
                    ),
              ]),
            ),
          );
        }
        body.appendChild(claimsSection.section);

        // -- timeline -----------------------------------------------------------------
        const timeline = section('Timeline');
        timeline.body.appendChild(
          table(
            ['When', 'Type', 'Actor', 'Payload'],
            [...events]
              .reverse()
              .map((event) => [
                when(event.occurredAt),
                event.type,
                event.actorId,
                payloadCell(event.payload),
              ]),
          ),
        );
        body.appendChild(timeline.section);
      });
    }

    reload();
    return () => {};
  },
};
