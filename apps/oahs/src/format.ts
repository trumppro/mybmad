/**
 * Plain-text table rendering — deliberately dependency-free (story 13:
 * "bảng text đơn giản, không dep bảng ngoài"). Monospace columns padded to
 * the widest cell; an empty row set renders as "(empty)".
 */

export type Cell = string | number | boolean | null | undefined;

function toText(cell: Cell): string {
  if (cell === null || cell === undefined) return '-';
  return String(cell);
}

export function renderTable(headers: string[], rows: Cell[][]): string {
  if (rows.length === 0) return '(empty)';
  const textRows = rows.map((row) => row.map(toText));
  const widths = headers.map((header, col) =>
    Math.max(header.length, ...textRows.map((row) => (row[col] ?? '').length)),
  );
  const line = (cells: string[]): string =>
    cells.map((cell, col) => cell.padEnd(widths[col] ?? cell.length)).join('  ').trimEnd();
  const separator = widths.map((w) => '-'.repeat(w)).join('  ');
  return [line(headers), separator, ...textRows.map(line)].join('\n');
}
