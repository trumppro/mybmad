/**
 * MCP adapter — every registry entry in COMMANDS becomes one tool; every
 * tool handler calls the SAME bus.execute the HTTP route calls. No logic
 * lives here (roadmap §2.2: structurally identical semantics, D5).
 *
 * DECISION (recorded): we use the low-level `Server` +
 * setRequestHandler(ListTools/CallTool) instead of `McpServer.registerTool`.
 * SDK 1.29's McpServer accepts zod schemas and re-emits JSON Schema through
 * its own compat layer (zod v4 branch targets draft-7); contracts'
 * inputJsonSchema() is zod v4's native draft-2020-12 emission. Feeding the
 * contracts JSON Schema verbatim through the low-level API keeps
 * "tool inputSchema === inputJsonSchema(command)" byte-identical — parity is
 * asserted by deep-equality in test/parity.test.ts.
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type CallToolResult,
} from '@modelcontextprotocol/sdk/types.js';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import {
  COMMANDS,
  inputJsonSchema,
  mcpToolName,
  type ActorContext,
  type CommandBus,
} from '@oahs/contracts';

import { errorName } from './server.js';

const TOOL_TO_COMMAND: ReadonlyMap<string, string> = new Map(
  COMMANDS.map((command) => [mcpToolName(command.name), command.name]),
);

/**
 * Build one MCP server bound to an authenticated actor context. Stateless
 * HTTP mounts construct one per request; tests wire one to an
 * InMemoryTransport directly.
 */
export function buildMcpServer(bus: CommandBus, ctx: ActorContext): Server {
  const server = new Server(
    { name: 'oahs-spine', version: '0.0.1' },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: COMMANDS.map((command) => ({
      name: mcpToolName(command.name),
      description: command.description,
      // Verbatim from contracts — the parity test deep-equals this.
      inputSchema: inputJsonSchema(command.name) as { type: 'object'; [k: string]: unknown },
    })),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request): Promise<CallToolResult> => {
    const commandName = TOOL_TO_COMMAND.get(request.params.name);
    if (commandName === undefined) {
      return {
        content: [{ type: 'text', text: `unknown tool: ${request.params.name}` }],
        isError: true,
      };
    }
    try {
      // The exact same call the HTTP route makes — no MCP-only logic.
      const result = await bus.execute(commandName, request.params.arguments ?? {}, ctx);
      return { content: [{ type: 'text', text: JSON.stringify(result ?? null) }] };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: {
                name: errorName(error),
                message: error instanceof Error ? error.message : String(error),
              },
            }),
          },
        ],
        isError: true,
      };
    }
  });

  return server;
}

/**
 * Mount POST /mcp on the Fastify app — stateless StreamableHTTP pattern
 * (sessionIdGenerator: undefined): a fresh server+transport pair per request,
 * fully isolated, no session state to leak between actors.
 */
export function registerMcpRoute(
  app: FastifyInstance,
  bus: CommandBus,
  authenticate: (request: FastifyRequest) => ActorContext | null,
): void {
  app.post('/mcp', async (request, reply) => {
    const ctx = authenticate(request);
    if (ctx === null) {
      return reply
        .code(401)
        .send({ jsonrpc: '2.0', error: { code: -32001, message: 'unauthorized' }, id: null });
    }

    const server = buildMcpServer(bus, ctx);
    // Stateless mode: sessionIdGenerator omitted (≡ undefined — the SDK's
    // documented stateless pattern; the key is left out only because the SDK
    // options type is not exactOptionalPropertyTypes-clean).
    const transport = new StreamableHTTPServerTransport({ enableJsonResponse: true });

    reply.hijack();
    try {
      // Cast: the SDK's Transport interface is not exactOptionalPropertyTypes-clean.
      await server.connect(transport as unknown as Parameters<typeof server.connect>[0]);
      // JSON-response mode: resolves once the response has been written.
      // (Do NOT close on request.raw 'close' — Node emits it as soon as the
      // parsed request stream ends, which would kill the pending response.)
      await transport.handleRequest(request.raw, reply.raw, request.body);
    } finally {
      void transport.close();
      void server.close();
    }
    return reply;
  });
}
