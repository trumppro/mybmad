/**
 * The persistent app shell: a top bar (brand, actor, transient status, log
 * out) and a left sidebar that routes the content area. The shell is built
 * once per session; the router swaps only the content pane, so the SSE relay
 * and login state outlive page navigation.
 */
import { clear, el } from '../core/dom.js';
import { getRoutes, navigate, startRouter } from '../core/router.js';
import { state } from '../core/state.js';

export function buildAppShell(root: HTMLElement, onLogout: () => void): void {
  clear(root);
  const shell = el('div');
  shell.id = 'shell';

  // -- top bar
  const topbar = el('div');
  topbar.id = 'topbar';
  topbar.appendChild(el('span', 'brand', 'oahs'));
  topbar.appendChild(el('span', 'who', `actor ${state.actorId}`));
  topbar.appendChild(el('span', 'spacer'));
  const status = el('span');
  status.id = 'status';
  topbar.appendChild(status);
  const logout = el('button', undefined, 'Log out');
  logout.addEventListener('click', onLogout);
  topbar.appendChild(logout);
  shell.appendChild(topbar);

  // -- sidebar nav (admin-only routes hidden for non-admins; server enforces)
  const sidebar = el('nav');
  sidebar.id = 'sidebar';
  for (const route of getRoutes()) {
    if (route.hidden === true) continue;
    if (route.adminOnly === true && !state.isAdmin) continue;
    const item = el('button', 'nav-item', route.label);
    item.dataset['path'] = route.path;
    item.addEventListener('click', () => navigate(route.path));
    sidebar.appendChild(item);
  }
  shell.appendChild(sidebar);

  // -- content pane (router mounts views here)
  const content = el('div');
  content.id = 'content';
  shell.appendChild(content);
  root.appendChild(shell);

  startRouter(content, (path) => {
    for (const child of Array.from(sidebar.children)) {
      const item = child as HTMLElement;
      const target = item.dataset['path'];
      item.classList.toggle(
        'active',
        target === path || (target !== undefined && path.startsWith(`${target}/`)),
      );
    }
  });
}
