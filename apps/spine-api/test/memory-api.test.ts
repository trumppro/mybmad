/**
 * Phase 5 over the WIRE (roadmap §6): agent memory rails + the
 * tool-registry-is-code guardrail.
 *
 *  - Owner-scope is STRUCTURAL on the HTTP surface: neither memory command
 *    takes an actor parameter, so token B can never read token A's memories —
 *    the request that would do it cannot be expressed.
 *  - Only agents hold memory: a user-token append is a 422 GuardFailed.
 *  - Learning from a private thread requires participation: 403 over HTTP.
 *  - tool-registry-is-code (§6 "no agent-registers-tool API"): the MCP tool
 *    list is a pure function of the code — running commands changes state,
 *    NEVER the tool registry, and no tool name even resembles registration.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import type { FastifyInstance } from 'fastify';
import type { AddressInfo } from 'node:net';
import { createMemoryEngine, type SpineEngine } from '@oahs/core';
import type { Actor, AgentMemory, Thread } from '@oahs/core';
import { makeClient, type ActorContext, type OahsClient } from '@oahs/contracts';

import { TokenStore } from '../src/auth.js';
import { createCommandBus } from '../src/bus.js';
import { buildMcpServer } from '../src/mcp.js';
import { buildServer } from '../src/server.js';

const ADMIN_TOKEN = 'memory-api-admin-token';
const ADMIN_CTX: ActorContext = { actorId: 'admin', isAdmin: true };

let engine: SpineEngine;
let tokenStore: TokenStore;
let app: FastifyInstance;
let baseUrl: string;
let admin: OahsClient;
let agentA: OahsClient;
let agentB: OahsClient;
let user: OahsClient;
let agentAActor: Actor;
let userActor: Actor;
let mcpClient: Client;

async function createActor(type: 'user' | 'agent', displayName: string): Promise<{ actor: Actor; client: OahsClient }> {
  const created = await admin.call<{ actor: Actor; token: string }>('create_actor', {
    type,
    displayName,
  });
  return { actor: created.actor, client: makeClient({ baseUrl, token: created.token }) };
}

beforeAll(async () => {
  engine = createMemoryEngine();
  tokenStore = new TokenStore();
  app = await buildServer({ engine, tokenStore, adminToken: ADMIN_TOKEN });
  await app.listen({ port: 0, host: '127.0.0.1' });
  const { port } = app.server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${port}`;
  admin = makeClient({ baseUrl, token: ADMIN_TOKEN });

  ({ actor: agentAActor, client: agentA } = await createActor('agent', 'Agent A'));
  ({ client: agentB } = await createActor('agent', 'Agent B'));
  ({ actor: userActor, client: user } = await createActor('user', 'Human'));

  // MCP surface over the SAME bus, in-process (parity-test pattern).
  const bus = createCommandBus(engine, tokenStore);
  const mcpServer = buildMcpServer(bus, ADMIN_CTX);
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await mcpServer.connect(serverTransport);
  mcpClient = new Client({ name: 'memory-api-test', version: '0.0.1' });
  await mcpClient.connect(clientTransport);
});

afterAll(async () => {
  await mcpClient.close();
  await app.close();
});

describe('agent memory over HTTP (roadmap §6)', () => {
  it('owner-scope is structural: token B sees NONE of token A’s memories', async () => {
    const appended = await agentA.call<AgentMemory>('append_agent_memory', {
      kind: 'entity',
      content: 'the PO prefers small PRs',
    });
    expect(appended.agentActorId).toBe(agentAActor.id);
    expect(appended.seq).toBe(1);

    expect(await agentA.call<AgentMemory[]>('search_agent_memory', {})).toHaveLength(1);
    // B's identical request answers from B's OWN (empty) store — there is no
    // parameter that could name A.
    expect(await agentB.call<AgentMemory[]>('search_agent_memory', {})).toEqual([]);
  });

  it('a user token cannot hold memory: append → 422 GuardFailed', async () => {
    await expect(
      user.call('append_agent_memory', { kind: 'episodic', content: 'humans have notebooks' }),
    ).rejects.toMatchObject({ name: 'GuardFailedError', status: 422 });
  });

  it('learning from a private thread the agent never joined → 403 over the wire', async () => {
    const priv = await user.call<Thread>('create_thread', { kind: 'private', visibility: 'private' });
    await expect(
      agentA.call('append_agent_memory', {
        kind: 'episodic',
        content: 'overheard something',
        sourceThreadId: priv.id,
      }),
    ).rejects.toMatchObject({ name: 'PermissionDeniedError', status: 403 });
  });

  it('a private-sourced memory surfaces ONLY inside its source thread', async () => {
    const priv = await user.call<Thread>('create_thread', { kind: 'private', visibility: 'private' });
    await user.call('add_thread_participant', { threadId: priv.id, actorId: agentAActor.id });
    await agentA.call('append_agent_memory', {
      kind: 'entity',
      content: 'the secret launch date is May 5',
      sourceThreadId: priv.id,
    });

    const open = (await agentA.call<AgentMemory[]>('search_agent_memory', {})).map((m) => m.content);
    expect(open).not.toContain('the secret launch date is May 5');
    const inSource = await agentA.call<AgentMemory[]>('search_agent_memory', {
      contextThreadId: priv.id,
    });
    expect(inSource.map((m) => m.content)).toContain('the secret launch date is May 5');
  });
});

describe('tool-registry-is-code (§6: no agent-registers-tool API)', () => {
  it('tools/list is IDENTICAL before and after 10 arbitrary commands, and no tool smells like registration', async () => {
    const before = await mcpClient.listTools();

    // 10 arbitrary commands — writes and reads, admin and agent — that mutate
    // plenty of STATE. None may mutate the tool REGISTRY.
    const feature = await admin.call<{ id: string }>('create_feature');
    await admin.call('create_work_item', {
      featureId: feature.id,
      externalKey: 'reg-1',
      title: 'Registry guardrail fixture',
    });
    const created = await admin.call<{ actor: Actor; token: string }>('create_actor', {
      type: 'agent',
      displayName: 'Registry probe agent',
    });
    await admin.call('grant_permission', { actorId: created.actor.id, permission: 'task.claim' });
    const thread = await admin.call<Thread>('create_thread', { kind: 'general' });
    await admin.call('post_message', { threadId: thread.id, body: 'state moves, tools do not' });
    await agentA.call('append_agent_memory', { kind: 'procedural', content: 'tools are code' });
    await agentA.call('search_agent_memory', {});
    await admin.call('list_work_items', {});
    await admin.call('whoami');

    const after = await mcpClient.listTools();
    expect(after.tools).toEqual(before.tools); // deep-equal: names, descriptions, schemas

    const registration = /register|add_tool|create_tool/i;
    for (const tool of after.tools) {
      expect(tool.name).not.toMatch(registration);
    }
  });
});
