/**
 * RPC — the ONLY write path, the same command bus as the CLI and MCP. Every
 * mutation in the UI is a `fetch POST /rpc/<command>` with the bearer token;
 * the UI never has a privileged path (§2.1). Rejections arrive as the wire
 * envelope and are rethrown as an Error carrying `name: message`.
 */
import type { Envelope } from '@oahs/contracts';

import { state } from './state.js';

export async function rpc<T>(command: string, input: unknown = {}): Promise<T> {
  const response = await fetch(`${state.url}/rpc/${command}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${state.token}`,
    },
    body: JSON.stringify(input),
  });
  const envelope = (await response.json()) as Envelope<T>;
  if (envelope.ok) return envelope.result;
  throw new Error(`${envelope.error.name}: ${envelope.error.message}`);
}
