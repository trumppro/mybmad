/**
 * Dashboard — the cockpit's home (Phase 7 Wave 3). One screen answers:
 * how are ALL my projects doing (project_list rollups), which runners are
 * alive and on what (list_runners), and what is waiting on ME (inbox with
 * project labels). Click-through everywhere; no id is ever typed by hand.
 */
import type { WorkItem } from '@oahs/core';

import { clear, el, run } from '../core/dom.js';
import { rpc } from '../core/rpc.js';
import { navigate, type View } from '../core/router.js';
import {
  badge,
  button,
  emptyState,
  field,
  section,
  table,
  textInput,
  viewShell,
} from '../components/widgets.js';

interface ProjectRollup {
  project: {
    id: string;
    name: string;
    slug: string;
    kind: string;
    repoPath: string | null;
    defaultSpecFolder: string | null;
    state: string;
  };
  items: Record<string, number>;
  blocked: number;
  liveClaims: number;
  awaitingGates: number;
}

interface RunnerRow {
  runnerId: string;
  actorId: string;
  mode: string;
  projectId?: string;
  repoPath?: string;
  pid?: number;
  lastSeenAt: number;
}

type InboxItem = WorkItem & { project?: { id: string; slug: string; name: string } };

/** A runner is presumed dead after 90s of silence (announce interval is 30s). */
const STALE_MS = 90_000;

function ago(ms: number): string {
  const seconds = Math.max(0, Math.round((Date.now() - ms) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  return minutes < 60 ? `${minutes}m ago` : `${Math.round(minutes / 60)}h ago`;
}

function projectCard(rollup: ProjectRollup): HTMLElement {
  const cardEl = el('div', 'card project-card');
  cardEl.dataset['slug'] = rollup.project.slug;
  cardEl.appendChild(el('div', 'c-title', `${rollup.project.name} (${rollup.project.slug})`));
  cardEl.appendChild(
    el(
      'div',
      'c-sub',
      `${rollup.project.kind}${rollup.project.repoPath !== null ? ` · ${rollup.project.repoPath}` : ' · no repo bound'}`,
    ),
  );
  const counts = el('div', 'c-actions');
  for (const [stateName, count] of Object.entries(rollup.items)) {
    counts.appendChild(badge(`${stateName}:${String(count)}`));
  }
  if (Object.keys(rollup.items).length === 0) counts.appendChild(el('span', 'c-sub', 'empty backlog'));
  cardEl.appendChild(counts);
  const meta = el('div', 'c-actions');
  if (rollup.blocked > 0) meta.appendChild(badge(`blocked:${String(rollup.blocked)}`));
  if (rollup.liveClaims > 0) meta.appendChild(badge(`claims:${String(rollup.liveClaims)}`));
  if (rollup.awaitingGates > 0) meta.appendChild(badge(`gates:${String(rollup.awaitingGates)}`));
  cardEl.appendChild(meta);
  cardEl.addEventListener('click', () => navigate(`project/${rollup.project.slug}`));
  return cardEl;
}

export const dashboardView: View = {
  mount(container: HTMLElement): () => void {
    const { view, toolbar, body } = viewShell('Dashboard');
    const refresh = button('Refresh', () => reload(), 'primary');
    toolbar.appendChild(refresh);
    container.appendChild(view);

    function newProjectForm(parent: HTMLElement): void {
      const form = el('div', 'card');
      form.appendChild(el('div', 'c-title', 'New project'));
      const name = textInput('name, e.g. My App');
      const repo = textInput('repo path (optional)');
      const spec = textInput('spec folder, e.g. delivery/main (optional)');
      form.appendChild(field('Name', name));
      form.appendChild(field('Repo', repo));
      form.appendChild(field('Spec folder', spec));
      form.appendChild(
        button(
          'Create project',
          () => {
            run(async () => {
              if (name.value.trim() === '') throw new Error('name is required');
              await rpc('project_create', {
                name: name.value.trim(),
                ...(repo.value.trim() !== '' ? { repoPath: repo.value.trim() } : {}),
                ...(spec.value.trim() !== '' ? { defaultSpecFolder: spec.value.trim() } : {}),
              });
              reload();
            });
          },
          'primary',
        ),
      );
      parent.appendChild(form);
    }

    function reload(): void {
      run(async () => {
        const [rollups, runners, inbox] = await Promise.all([
          rpc<ProjectRollup[]>('project_list'),
          rpc<RunnerRow[]>('list_runners'),
          rpc<{ awaitingSpec: InboxItem[]; awaitingReview: InboxItem[] }>('inbox'),
        ]);
        clear(body);

        // -- projects ---------------------------------------------------------
        const projects = section('Projects');
        const grid = el('div', 'card-grid');
        for (const rollup of rollups) grid.appendChild(projectCard(rollup));
        if (rollups.length === 0) {
          grid.appendChild(emptyState('No projects yet — create the first one below.'));
        }
        projects.body.appendChild(grid);
        newProjectForm(projects.body);
        body.appendChild(projects.section);

        // -- gates waiting on a human ----------------------------------------
        const gates = section('Gates awaiting a decision');
        const pending = [
          ...inbox.awaitingSpec.map((item) => ({ item, gate: 'spec_approval' })),
          ...inbox.awaitingReview.map((item) => ({ item, gate: 'review_approval' })),
        ];
        if (pending.length === 0) {
          gates.body.appendChild(emptyState('Nothing waits on you.'));
        } else {
          gates.body.appendChild(
            table(
              ['Project', 'Story', 'Title', 'Gate', ''],
              pending.map(({ item, gate }) => [
                item.project?.slug ?? '—',
                item.externalKey,
                item.title,
                badge(gate),
                button('Open', () => navigate(`item/${item.id}`)),
              ]),
            ),
          );
        }
        body.appendChild(gates.section);

        // -- runners -----------------------------------------------------------
        const runnersSection = section('Runners');
        if (runners.length === 0) {
          runnersSection.body.appendChild(
            emptyState('No runners announced — start one with `oahs work --project <slug>`.'),
          );
        } else {
          runnersSection.body.appendChild(
            table(
              ['Status', 'Mode', 'Actor', 'Project', 'Repo', 'Last seen'],
              [...runners]
                .sort((a, b) => b.lastSeenAt - a.lastSeenAt)
                .map((runner) => [
                  Date.now() - runner.lastSeenAt > STALE_MS ? badge('stale') : badge('live'),
                  runner.mode,
                  runner.actorId,
                  runner.projectId ?? '—',
                  runner.repoPath ?? '—',
                  ago(runner.lastSeenAt),
                ]),
            ),
          );
        }
        body.appendChild(runnersSection.section);
      });
    }

    reload();
    return () => {};
  },
};
