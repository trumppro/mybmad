/**
 * Login screen — paste the server URL and a bearer token. `whoami` resolves
 * the actor (and whether it is admin, which gates admin-only nav). Credentials
 * persist in localStorage so a reload reconnects. The static /ui shell is
 * unauthenticated on purpose; login happens in-app.
 */
import { clear, el, run } from '../core/dom.js';
import { rpc } from '../core/rpc.js';
import { LS_TOKEN, LS_URL, state, type WhoAmI } from '../core/state.js';

export function renderLogin(root: HTMLElement, onConnected: () => void): void {
  clear(root);
  const box = el('div');
  box.id = 'login';
  box.appendChild(el('h1', undefined, 'oahs'));
  box.appendChild(
    el(
      'p',
      undefined,
      'Operations console over the rails. Paste the server URL and your API token.',
    ),
  );

  const urlInput = el('input');
  urlInput.placeholder = 'Server URL';
  urlInput.value = localStorage.getItem(LS_URL) ?? window.location.origin;
  const tokenInput = el('input');
  tokenInput.placeholder = 'API token';
  tokenInput.type = 'password';
  tokenInput.value = localStorage.getItem(LS_TOKEN) ?? '';

  const connect = el('button', 'primary', 'Connect');
  connect.addEventListener('click', () => {
    run(async () => {
      state.url = urlInput.value.trim().replace(/\/+$/, '');
      state.token = tokenInput.value.trim();
      if (state.url === '' || state.token === '') throw new Error('URL and token are required');
      const who = await rpc<WhoAmI>('whoami');
      state.actorId = who.actorId;
      state.isAdmin = who.isAdmin;
      localStorage.setItem(LS_URL, state.url);
      localStorage.setItem(LS_TOKEN, state.token);
      onConnected();
    });
  });

  const error = el('div', 'hint');
  error.id = 'status';

  box.appendChild(urlInput);
  box.appendChild(tokenInput);
  box.appendChild(connect);
  box.appendChild(error);
  root.appendChild(box);
}
