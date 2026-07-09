/**
 * DOM helpers — no innerHTML for user content: everything crosses via
 * textContent, so a message body or actor id can never inject markup. Moved
 * verbatim from the single-file UI; the safety property is unchanged.
 */

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className !== undefined && className !== '') node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function clear(node: HTMLElement): void {
  while (node.firstChild) node.removeChild(node.firstChild);
}

export function byId<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (node === null) throw new Error(`missing element #${id}`);
  return node as T;
}

let statusTimer: number | undefined;

/** Transient status line in the top bar — self-clears after 6s. */
export function setStatus(text: string): void {
  const node = document.getElementById('status');
  if (node === null) return;
  node.textContent = text;
  if (statusTimer !== undefined) window.clearTimeout(statusTimer);
  if (text !== '') {
    statusTimer = window.setTimeout(() => {
      node.textContent = '';
    }, 6000);
  }
}

/** Run an async action, surfacing any rejection into the status line. */
export function run(action: () => Promise<void>): void {
  action().catch((error: unknown) => {
    setStatus(error instanceof Error ? error.message : String(error));
  });
}
