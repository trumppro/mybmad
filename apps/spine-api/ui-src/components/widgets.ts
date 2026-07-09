/**
 * Reusable render helpers — plain functions returning DOM nodes (D3: no
 * framework, no JSX). Shared by the chat rails and every ops view so cards,
 * badges, tables, and forms look and behave the same everywhere.
 */
import { el } from '../core/dom.js';

export function badge(status: string): HTMLSpanElement {
  return el('span', `badge ${status}`, status);
}

export function emptyState(text: string): HTMLDivElement {
  return el('div', 'empty', text);
}

export function card(className = 'card'): HTMLDivElement {
  return el('div', className);
}

export function cardTitle(text: string): HTMLDivElement {
  return el('div', 'c-title', text);
}

export function cardSub(text: string): HTMLDivElement {
  return el('div', 'c-sub', text);
}

export function actionRow(...buttons: HTMLElement[]): HTMLDivElement {
  const row = el('div', 'c-actions');
  for (const button of buttons) row.appendChild(button);
  return row;
}

export function button(
  label: string,
  onClick: () => void,
  className?: string,
): HTMLButtonElement {
  const node = el('button', className, label);
  node.addEventListener('click', onClick);
  return node;
}

/**
 * An ops-view scaffold: a `.view` wrapper with a header (title + a toolbar slot
 * for filters/actions) and a body to render results into. The standard frame
 * for every routed page under the shell.
 */
export function viewShell(title: string): {
  view: HTMLElement;
  toolbar: HTMLElement;
  body: HTMLElement;
} {
  const view = el('div', 'view');
  const head = el('div', 'view-head');
  head.appendChild(el('h2', undefined, title));
  const toolbar = el('div', 'toolbar');
  head.appendChild(toolbar);
  view.appendChild(head);
  const body = el('div', 'view-body');
  view.appendChild(body);
  return { view, toolbar, body };
}

/** A titled section: returns the wrapper plus its body to append rows into. */
export function section(title: string): { section: HTMLElement; body: HTMLElement } {
  const wrapper = el('section');
  wrapper.appendChild(el('h2', undefined, title));
  const body = el('div', 'section-body');
  wrapper.appendChild(body);
  return { section: wrapper, body };
}

/** A labeled form field wrapping any control. */
export function field(labelText: string, control: HTMLElement): HTMLLabelElement {
  const label = el('label', 'field');
  label.appendChild(el('span', 'field-label', labelText));
  label.appendChild(control);
  return label;
}

export function textInput(placeholder: string, value = ''): HTMLInputElement {
  const input = el('input');
  input.placeholder = placeholder;
  input.value = value;
  return input;
}

export function select(options: readonly string[], selected?: string): HTMLSelectElement {
  const node = el('select');
  for (const value of options) {
    const option = el('option', undefined, value);
    option.value = value;
    if (value === selected) option.selected = true;
    node.appendChild(option);
  }
  return node;
}

/**
 * A scrollable data table. `columns` are headers; `rows` are cells already
 * rendered as strings (callers pre-format). The whole table scrolls inside its
 * own container so a wide table never widens the page (responsive rule).
 */
export function table(
  columns: readonly string[],
  rows: readonly (readonly (string | HTMLElement)[])[],
  emptyText = 'Nothing here.',
): HTMLElement {
  const scroller = el('div', 'table-scroll');
  if (rows.length === 0) {
    scroller.appendChild(emptyState(emptyText));
    return scroller;
  }
  const tableEl = el('table', 'data-table');
  const thead = el('thead');
  const headRow = el('tr');
  for (const column of columns) headRow.appendChild(el('th', undefined, column));
  thead.appendChild(headRow);
  tableEl.appendChild(thead);
  const tbody = el('tbody');
  for (const row of rows) {
    const tr = el('tr');
    for (const cell of row) {
      const td = el('td');
      if (typeof cell === 'string') td.textContent = cell;
      else td.appendChild(cell);
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
  tableEl.appendChild(tbody);
  scroller.appendChild(tableEl);
  return scroller;
}
