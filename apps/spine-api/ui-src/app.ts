/**
 * oahs ops console — bootstrap (roadmap Phase 3 / §5, D3). This file is the
 * single esbuild entry; all feature code lives in core/, components/, views/.
 * Zero framework: plain DOM over the SAME rails as every other client — every
 * mutation is `fetch POST /rpc/<command>`, live updates ride /events/stream.
 *
 * Responsibilities kept here: register the route table, show login or the
 * app shell, and run the global SSE relay once connected.
 */
import { buildAppShell } from './components/shell.js';
import { byId } from './core/dom.js';
import { rpc } from './core/rpc.js';
import { defineRoutes, type Route, stopRouter } from './core/router.js';
import { streamEvents } from './core/sse.js';
import { LS_TOKEN, LS_URL, state, type WhoAmI } from './core/state.js';
import { actorsView } from './views/actors.js';
import { chatView } from './views/chat.js';
import { claimsView } from './views/claims.js';
import { dashboardView } from './views/dashboard.js';
import { entitlementsView } from './views/entitlements.js';
import { eventsView } from './views/events.js';
import { featuresView } from './views/features.js';
import { insightsView } from './views/insights.js';
import { itemView } from './views/item.js';
import { renderLogin } from './views/login.js';
import { projectView } from './views/project.js';
import { workView } from './views/work.js';

// The route table. The DASHBOARD is the home (Phase 7 Wave 3): one screen for
// every project, runner, and pending gate. Parameterized detail pages
// (project/<slug>, item/<id>) are routed but hidden from the nav. Admin-only
// pages are hidden from the nav for non-admin actors (the server enforces).
function routeTable(): Route[] {
  return [
    { path: 'dashboard', label: 'Dashboard', view: dashboardView },
    { path: 'chat', label: 'Chat', view: chatView },
    { path: 'work', label: 'Work items', view: workView },
    { path: 'features', label: 'Features', view: featuresView },
    { path: 'claims', label: 'Claims', view: claimsView },
    { path: 'events', label: 'Audit events', view: eventsView },
    { path: 'entitlements', label: 'Entitlements', view: entitlementsView, adminOnly: true },
    { path: 'actors', label: 'Actors', view: actorsView, adminOnly: true },
    { path: 'insights', label: 'Insights', view: insightsView },
    { path: 'project', label: 'Project', view: projectView, hidden: true },
    { path: 'item', label: 'Work item', view: itemView, hidden: true },
  ];
}

function startApp(root: HTMLElement): void {
  defineRoutes(routeTable());
  state.connected = true;
  buildAppShell(root, () => logout(root));
  void streamEvents();
}

function logout(root: HTMLElement): void {
  state.connected = false;
  stopRouter();
  state.abort?.abort();
  localStorage.removeItem(LS_TOKEN);
  renderLogin(root, () => startApp(root));
}

function boot(): void {
  const root = byId<HTMLDivElement>('app');
  const savedUrl = localStorage.getItem(LS_URL);
  const savedToken = localStorage.getItem(LS_TOKEN);
  if (savedUrl !== null && savedToken !== null && savedToken !== '') {
    state.url = savedUrl;
    state.token = savedToken;
    rpc<WhoAmI>('whoami')
      .then((who) => {
        state.actorId = who.actorId;
        state.isAdmin = who.isAdmin;
        startApp(root);
      })
      .catch(() => {
        renderLogin(root, () => startApp(root));
      });
  } else {
    renderLogin(root, () => startApp(root));
  }
}

boot();
