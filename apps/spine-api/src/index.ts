/**
 * @oahs/spine-api — HTTP + MCP surfaces over the one command bus.
 *
 * Env is read ONLY here (start(), for the CLI entrypoint); the library
 * modules take everything as parameters.
 */
import { createMemoryEngine } from '@oahs/core';

import { TokenStore } from './auth.js';
import { buildServer } from './server.js';

export { TokenStore, type ResolvedToken } from './auth.js';
export { createCommandBus } from './bus.js';
export { buildServer, errorEnvelope, errorName, type BuildServerOptions } from './server.js';
export { buildMcpServer, registerMcpRoute } from './mcp.js';

export async function start(): Promise<void> {
  const port = Number(process.env['PORT'] ?? '3000');
  const adminToken = process.env['OAHS_ADMIN_TOKEN'];
  if (adminToken === undefined || adminToken.length === 0) {
    throw new Error('OAHS_ADMIN_TOKEN must be set (bootstrap admin credential)');
  }
  const persistPath = process.env['OAHS_TOKEN_STORE_PATH'];
  const tokenStore = new TokenStore(persistPath !== undefined ? { persistPath } : {});
  const engine = createMemoryEngine();
  const app = await buildServer({ engine, tokenStore, adminToken });
  await app.listen({ port, host: '0.0.0.0' });
  // eslint-disable-next-line no-console
  console.log(`oahs spine-api listening on :${port} (HTTP /rpc/*, MCP /mcp)`);
}
