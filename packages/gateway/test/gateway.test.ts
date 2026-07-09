/**
 * @oahs/gateway unit tests (Phase 6, roadmap §2.5). Deterministic: fetch is
 * MOCKED — no network, no key. The live smoke test lives in live.test.ts and
 * skips itself when OAHS_MODEL_API_KEY is unset.
 */
import { describe, expect, it, vi } from 'vitest';

import {
  GatewayError,
  InMemoryMeter,
  ModelGateway,
  OpenAICompatibleProvider,
  type FetchImpl,
  type Provider,
} from '../src/index.js';

/** Build a fetch mock that returns one JSON response with a given status. */
function jsonFetch(status: number, body: unknown): FetchImpl {
  return vi.fn(async () =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    }),
  );
}

/** A canned OpenAI-compatible chat response. */
function chatBody(content: string, usage?: Partial<Record<string, number>>): unknown {
  return {
    choices: [{ message: { role: 'assistant', content } }],
    usage: {
      prompt_tokens: usage?.['prompt_tokens'] ?? 10,
      completion_tokens: usage?.['completion_tokens'] ?? 5,
      total_tokens: usage?.['total_tokens'] ?? 15,
    },
  };
}

describe('OpenAICompatibleProvider.complete', () => {
  it('parses content and usage from an OpenAI-shaped response', async () => {
    const fetchImpl = jsonFetch(200, chatBody('rails work'));
    const provider = new OpenAICompatibleProvider({
      baseUrl: 'https://api.example/v1/',
      apiKey: 'k',
      fetchImpl,
    });
    const result = await provider.complete({
      model: 'cc/claude-haiku',
      messages: [{ role: 'user', content: 'hi' }],
      maxTokens: 20,
    });
    expect(result.content).toBe('rails work');
    expect(result.usage).toEqual({ promptTokens: 10, completionTokens: 5, totalTokens: 15 });
    expect(result.model).toBe('cc/claude-haiku');

    // URL is normalized (single slash) and stream:false + max_tokens are sent.
    const [url, init] = (fetchImpl as unknown as { mock: { calls: [string, RequestInit][] } })
      .mock.calls[0]!;
    expect(url).toBe('https://api.example/v1/chat/completions');
    const sent = JSON.parse(String(init.body)) as Record<string, unknown>;
    expect(sent['stream']).toBe(false);
    expect(sent['max_tokens']).toBe(20);
    expect((init.headers as Record<string, string>)['authorization']).toBe('Bearer k');
  });

  it('throws GatewayError with status + body on a non-ok response', async () => {
    const provider = new OpenAICompatibleProvider({
      baseUrl: 'https://api.example',
      apiKey: 'k',
      fetchImpl: vi.fn(async () => new Response('nope', { status: 429 })),
    });
    await expect(
      provider.complete({ model: 'm', messages: [{ role: 'user', content: 'hi' }] }),
    ).rejects.toMatchObject({ name: 'GatewayError', status: 429, body: 'nope' });
  });

  it('throws GatewayError when the response carries no content', async () => {
    const provider = new OpenAICompatibleProvider({
      baseUrl: 'https://api.example',
      apiKey: 'k',
      fetchImpl: jsonFetch(200, { choices: [{ message: {} }], usage: {} }),
    });
    await expect(
      provider.complete({ model: 'm', messages: [{ role: 'user', content: 'hi' }] }),
    ).rejects.toBeInstanceOf(GatewayError);
  });

  it('listModels returns the model ids from GET /models', async () => {
    const provider = new OpenAICompatibleProvider({
      baseUrl: 'https://api.example',
      apiKey: 'k',
      fetchImpl: jsonFetch(200, { data: [{ id: 'cc/claude-haiku' }, { id: 'cx/gpt-5.1' }] }),
    });
    expect(await provider.listModels()).toEqual(['cc/claude-haiku', 'cx/gpt-5.1']);
  });
});

/** A Provider stub that records requested models and returns canned usage. */
function stubProvider(): Provider & { models: string[] } {
  const models: string[] = [];
  return {
    models,
    async complete(req) {
      models.push(req.model);
      return {
        content: `answer from ${req.model}`,
        usage: { promptTokens: 3, completionTokens: 4, totalTokens: 7 },
        model: req.model,
      };
    },
    async listModels() {
      return ['a', 'b'];
    },
  };
}

describe('ModelGateway route resolution', () => {
  it("resolves the 'default' route when neither model nor route is given", async () => {
    const provider = stubProvider();
    const gw = new ModelGateway({ provider, routes: { default: 'cc/default-model' } });
    const result = await gw.complete({ messages: [{ role: 'user', content: 'hi' }] });
    expect(result.model).toBe('cc/default-model');
    expect(provider.models).toEqual(['cc/default-model']);
  });

  it('an explicit model overrides any route', async () => {
    const provider = stubProvider();
    const gw = new ModelGateway({
      provider,
      routes: { default: 'cc/default-model', reviewer: 'cx/gpt-5.1' },
    });
    const result = await gw.complete({
      route: 'reviewer',
      model: 'cc/override',
      messages: [{ role: 'user', content: 'hi' }],
    });
    expect(result.model).toBe('cc/override');
  });

  it('resolves a named route to its model', () => {
    const gw = new ModelGateway({
      provider: stubProvider(),
      routes: { default: 'd', reviewer: 'cx/gpt-5.1' },
    });
    expect(gw.resolveModel({ route: 'reviewer' })).toBe('cx/gpt-5.1');
  });

  it('throws when an unknown route has no default to fall back on', () => {
    const gw = new ModelGateway({ provider: stubProvider(), routes: {} });
    expect(() => gw.resolveModel({ route: 'ghost' })).toThrow(GatewayError);
  });

  it('passthrough listModels', async () => {
    const gw = new ModelGateway({ provider: stubProvider() });
    expect(await gw.listModels()).toEqual(['a', 'b']);
  });
});

describe('metering', () => {
  it('InMemoryMeter aggregates tokens across two gateway calls', async () => {
    const meter = new InMemoryMeter();
    const gw = new ModelGateway({
      provider: stubProvider(),
      routes: { default: 'd' },
      meter,
    });
    await gw.complete({ messages: [{ role: 'user', content: 'one' }] });
    await gw.complete({ route: 'default', messages: [{ role: 'user', content: 'two' }] });
    expect(meter.total()).toEqual({
      calls: 2,
      promptTokens: 6,
      completionTokens: 8,
      totalTokens: 14,
    });
  });
});
