/**
 * MCP ≡ HTTP parity — structural, machine-checked (roadmap D5, §2.2):
 *  (a) every registry entry is an MCP tool, named by mcpToolName();
 *  (b) the tool inputSchema is byte-identical to contracts' inputJsonSchema();
 *  (c) the same query through the MCP client (InMemoryTransport) and through
 *      HTTP on the same engine state returns identical results.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import type { FastifyInstance } from 'fastify';
import type { AddressInfo } from 'node:net';
import { createMemoryEngine, type SpineEngine, type WorkItem } from '@oahs/core';
import {
  COMMANDS,
  inputJsonSchema,
  makeClient,
  mcpToolName,
  type ActorContext,
  type OahsClient,
} from '@oahs/contracts';

import { TokenStore } from '../src/auth.js';
import { createCommandBus } from '../src/bus.js';
import { buildMcpServer } from '../src/mcp.js';
import { buildServer } from '../src/server.js';

const ADMIN_TOKEN = 'parity-admin-token';
const ADMIN_CTX: ActorContext = { actorId: 'admin', isAdmin: true };

let engine: SpineEngine;
let app: FastifyInstance;
let httpClient: OahsClient;
let mcpClient: Client;
let workItemId: string;
let mcpUrl: string;

beforeAll(async () => {
  engine = createMemoryEngine();
  const tokenStore = new TokenStore();

  // Seed shared state: one feature, one work item.
  const feature = engine.createFeature({ actorId: 'admin' });
  const item = engine.createWorkItem({
    featureId: feature.id,
    externalKey: 'p1',
    title: 'Parity fixture story',
    actorId: 'admin',
  });
  workItemId = item.id;

  // HTTP surface over the engine.
  app = await buildServer({ engine, tokenStore, adminToken: ADMIN_TOKEN });
  await app.listen({ port: 0, host: '127.0.0.1' });
  const { port } = app.server.address() as AddressInfo;
  httpClient = makeClient({ baseUrl: `http://127.0.0.1:${port}`, token: ADMIN_TOKEN });
  mcpUrl = `http://127.0.0.1:${port}/mcp`;

  // MCP surface over the SAME engine (same bus semantics), in-process.
  const bus = createCommandBus(engine, tokenStore);
  const mcpServer = buildMcpServer(bus, ADMIN_CTX);
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await mcpServer.connect(serverTransport);
  mcpClient = new Client({ name: 'parity-test', version: '0.0.1' });
  await mcpClient.connect(clientTransport);
});

afterAll(async () => {
  await mcpClient.close();
  await app.close();
});

describe('MCP ≡ HTTP parity', () => {
  it('(a) exposes exactly one MCP tool per registry command, named by mcpToolName', async () => {
    const { tools } = await mcpClient.listTools();
    expect(tools).toHaveLength(COMMANDS.length);
    expect(new Set(tools.map((t) => t.name))).toEqual(
      new Set(COMMANDS.map((c) => mcpToolName(c.name))),
    );
  });

  it('(b) advance_state tool inputSchema deep-equals inputJsonSchema("advance_state")', async () => {
    const { tools } = await mcpClient.listTools();
    const tool = tools.find((t) => t.name === mcpToolName('advance_state'));
    expect(tool).toBeDefined();
    expect(tool!.inputSchema).toEqual(inputJsonSchema('advance_state'));
    expect(tool!.description).toBe(
      COMMANDS.find((c) => c.name === 'advance_state')!.description,
    );
  });

  it('(c) get_work_item returns identical results through MCP and HTTP', async () => {
    const viaHttp = await httpClient.call<WorkItem>('get_work_item', { workItemId });

    const mcpResult = await mcpClient.callTool({
      name: mcpToolName('get_work_item'),
      arguments: { workItemId },
    });
    expect(mcpResult.isError ?? false).toBe(false);
    const content = mcpResult.content as Array<{ type: string; text: string }>;
    expect(content[0]!.type).toBe('text');
    const viaMcp = JSON.parse(content[0]!.text) as WorkItem;

    expect(viaMcp).toEqual(viaHttp);
    expect(viaMcp.externalKey).toBe('p1');
  });

  it('(c-negative) errors carry the same taxonomy on both surfaces', async () => {
    // Unknown work item → GuardFailedError on HTTP (422) and isError on MCP.
    await expect(
      httpClient.call('get_work_item', { workItemId: 'nope' }),
    ).rejects.toMatchObject({ name: 'GuardFailedError', status: 422 });

    const mcpResult = await mcpClient.callTool({
      name: mcpToolName('get_work_item'),
      arguments: { workItemId: 'nope' },
    });
    expect(mcpResult.isError).toBe(true);
    const content = mcpResult.content as Array<{ type: string; text: string }>;
    const parsed = JSON.parse(content[0]!.text) as { error: { name: string } };
    expect(parsed.error.name).toBe('GuardFailedError');
  });

  it('POST /mcp works over real HTTP (stateless StreamableHTTP) with bearer authn', async () => {
    const rpc = async (body: unknown, token?: string) =>
      fetch(mcpUrl, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          accept: 'application/json, text/event-stream',
          ...(token !== undefined ? { authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      });

    // no token → 401
    const unauth = await rpc({ jsonrpc: '2.0', id: 0, method: 'tools/list', params: {} });
    expect(unauth.status).toBe(401);

    // stateless: every request is self-contained, no session id required
    const init = await rpc(
      {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2025-03-26',
          capabilities: {},
          clientInfo: { name: 'smoke', version: '0' },
        },
      },
      ADMIN_TOKEN,
    );
    expect(init.status).toBe(200);

    const listRes = await rpc({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} }, ADMIN_TOKEN);
    expect(listRes.status).toBe(200);
    const listBody = (await listRes.json()) as { result: { tools: Array<{ name: string }> } };
    expect(listBody.result.tools).toHaveLength(COMMANDS.length);

    const callRes = await rpc(
      {
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: { name: mcpToolName('whoami'), arguments: {} },
      },
      ADMIN_TOKEN,
    );
    expect(callRes.status).toBe(200);
    const callBody = (await callRes.json()) as {
      result: { content: Array<{ type: string; text: string }> };
    };
    // Parity in the strictest sense: the MCP surface resolves the admin token
    // to the SAME context as HTTP (Phase 2: a real bootstrap admin actor).
    const viaHttp = await httpClient.call<{ actorId: string; isAdmin: boolean }>('whoami');
    expect(viaHttp.isAdmin).toBe(true);
    expect(JSON.parse(callBody.result.content[0]!.text)).toEqual(viaHttp);
  });
});
