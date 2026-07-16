/**
 * ⌘K command palette (roadmap §9.7, portal parity). It is a VIEW over the
 * COMMANDS registry (@oahs/contracts), not a hand-maintained list — a new
 * command appears automatically. Three groups: NAVIGATE (the /ui routes),
 * ACTIONS (the non-readonly commands), AGENT (the agent-job commands). Selecting
 * a NAVIGATE entry routes; selecting a command runs it through /rpc (the SAME
 * rails), so a command the actor lacks the grant for returns the normal 403
 * envelope — never a client-side allow (§2.1/§5.2).
 */
import { clear, el, run, setStatus } from './dom.js';
import {
  buildPaletteEntries,
  filterEntries,
  type CommandDefLike,
  type PaletteEntry,
  type PaletteGroup,
} from './palette-entries.js';
import { getRoutes, navigate } from './router.js';
import { rpc } from './rpc.js';
import { state } from './state.js';

/**
 * The command manifest, fetched once from the public GET /commands endpoint —
 * a runtime VIEW over the registry, so the browser bundle never imports the
 * (node-only) contracts/core runtime. Empty until loaded (palette still shows
 * NAVIGATE entries).
 */
let commandCache: CommandDefLike[] = [];

export async function loadCommands(): Promise<void> {
  try {
    const res = await fetch(`${state.url}/commands`);
    const body = (await res.json()) as { commands?: CommandDefLike[] };
    commandCache = body.commands ?? [];
  } catch {
    commandCache = []; // the palette degrades to NAVIGATE-only, never throws
  }
}

const GROUP_LABEL: Record<PaletteGroup, string> = {
  navigate: 'Navigate',
  action: 'Actions',
  agent: 'Agent',
};

let overlay: HTMLElement | null = null;

function closePalette(): void {
  if (overlay !== null) {
    overlay.remove();
    overlay = null;
  }
}

/** Open the palette modal (⌘K). Idempotent — a second open is a no-op. */
export function openPalette(): void {
  if (overlay !== null) return;
  const allEntries = buildPaletteEntries({
    commands: commandCache,
    routes: getRoutes(),
    isAdmin: state.isAdmin,
  });

  overlay = el('div', 'palette-overlay');
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) closePalette();
  });
  const box = el('div', 'palette');
  const input = el('input', 'palette-input');
  input.type = 'text';
  input.placeholder = 'Type to filter · Enter to run · Esc to close';
  const list = el('div', 'palette-list');
  box.appendChild(input);
  box.appendChild(list);
  overlay.appendChild(box);
  document.body.appendChild(overlay);

  const runEntry = (entry: PaletteEntry): void => {
    if (entry.kind === 'route') {
      closePalette();
      navigate(entry.id);
      return;
    }
    // A command: run it through /rpc. Params (if any) come from a JSON payload
    // box — the rails validate + authorize, so a missing grant 403s here.
    clear(list);
    const form = el('div', 'palette-run');
    form.appendChild(el('div', 'palette-run-title', entry.id));
    if (entry.description !== undefined) form.appendChild(el('div', 'palette-run-desc', entry.description));
    const payload = el('textarea', 'palette-payload');
    payload.rows = 4;
    payload.placeholder = '{ }  — JSON input for this command';
    payload.value = '{}';
    const runBtn = el('button', 'btn primary', 'Run via /rpc');
    runBtn.addEventListener('click', () => {
      run(async () => {
        let body: unknown = {};
        try {
          body = JSON.parse(payload.value === '' ? '{}' : payload.value);
        } catch {
          throw new Error('payload must be valid JSON');
        }
        const result = await rpc<unknown>(entry.id, body);
        setStatus(`${entry.id}: ${JSON.stringify(result).slice(0, 200)}`);
        closePalette();
      });
    });
    form.appendChild(payload);
    form.appendChild(runBtn);
    list.appendChild(form);
    payload.focus();
  };

  let filtered: PaletteEntry[] = [];
  let active = 0;
  const renderList = (): void => {
    filtered = filterEntries(allEntries, input.value);
    active = 0;
    clear(list);
    let group: PaletteGroup | null = null;
    filtered.forEach((entry, index) => {
      if (entry.group !== group) {
        group = entry.group;
        list.appendChild(el('div', 'palette-group', GROUP_LABEL[group]));
      }
      const row = el('div', index === active ? 'palette-item active' : 'palette-item');
      row.appendChild(el('span', 'palette-item-label', entry.label));
      row.appendChild(el('span', `palette-tag ${entry.group}`, entry.group));
      row.addEventListener('click', () => runEntry(entry));
      list.appendChild(row);
    });
  };
  const highlight = (): void => {
    [...list.querySelectorAll('.palette-item')].forEach((node, index) => {
      node.classList.toggle('active', index === active);
    });
  };

  input.addEventListener('input', renderList);
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closePalette();
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      active = Math.min(active + 1, filtered.length - 1);
      highlight();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      active = Math.max(active - 1, 0);
      highlight();
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const entry = filtered[active];
      if (entry !== undefined) runEntry(entry);
    }
  });

  renderList();
  input.focus();
}

/** Bind ⌘K / Ctrl-K globally + prefetch the command manifest. Returns an unbind fn. */
export function registerPalette(): () => void {
  void loadCommands(); // prime the cache so the first ⌘K already lists actions
  const onKey = (event: KeyboardEvent): void => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      if (overlay === null) openPalette();
      else closePalette();
    }
  };
  window.addEventListener('keydown', onKey);
  return () => {
    window.removeEventListener('keydown', onKey);
    closePalette();
  };
}
