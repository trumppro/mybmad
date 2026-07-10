/**
 * A ~50-line hash router — zero dependency (D3). Routes map `#/<path>` to a
 * View that mounts into the content area and returns a cleanup (unsubscribe).
 * On navigation the previous view is cleaned up before the next mounts, so a
 * view's SSE subscriptions never leak across pages.
 */
import { clear } from './dom.js';
import { state } from './state.js';

/** A page: build DOM into `container`, return a cleanup run on navigate-away. */
export interface View {
  mount(container: HTMLElement): () => void;
}

export interface Route {
  path: string;
  label: string;
  view: View;
  /** Hidden from the nav for non-admin actors (server still enforces). */
  adminOnly?: boolean;
  /** Never shown in the nav (parameterized detail pages). */
  hidden?: boolean;
}

let routes: Route[] = [];
let contentEl: HTMLElement | null = null;
let currentCleanup: (() => void) | null = null;
let onNavigate: ((path: string) => void) | null = null;

export function defineRoutes(next: Route[]): void {
  routes = next;
}

export function getRoutes(): Route[] {
  return routes;
}

export function currentPath(): string {
  const hash = window.location.hash.replace(/^#\/?/, '');
  return hash === '' ? (routes[0]?.path ?? '') : hash;
}

/** The suffix after a parameterized route's first '/', e.g. 'alpha' in #/project/alpha. */
export function routeParam(): string {
  const path = currentPath();
  const slash = path.indexOf('/');
  return slash > 0 ? decodeURIComponent(path.slice(slash + 1)) : '';
}

function renderCurrent(): void {
  if (contentEl === null) return;
  const path = currentPath();
  const route =
    routes.find((candidate) => candidate.path === path) ??
    // Parameterized pages: 'project/alpha' mounts the 'project' route.
    routes.find((candidate) => path.startsWith(`${candidate.path}/`)) ??
    routes[0];
  if (route === undefined) return;
  if (currentCleanup !== null) {
    currentCleanup();
    currentCleanup = null;
  }
  clear(contentEl);
  currentCleanup = route.view.mount(contentEl);
  onNavigate?.(route.path);
}

export function navigate(path: string): void {
  const target = `#/${path}`;
  if (window.location.hash === target) {
    renderCurrent(); // same hash → no hashchange event, render explicitly
    return;
  }
  window.location.hash = target; // fires hashchange → renderCurrent
}

export function startRouter(content: HTMLElement, navCallback: (path: string) => void): void {
  contentEl = content;
  onNavigate = navCallback;
  window.addEventListener('hashchange', renderCurrent);
  renderCurrent();
}

export function stopRouter(): void {
  window.removeEventListener('hashchange', renderCurrent);
  if (currentCleanup !== null) {
    currentCleanup();
    currentCleanup = null;
  }
  contentEl = null;
  onNavigate = null;
  state.abort?.abort();
}
