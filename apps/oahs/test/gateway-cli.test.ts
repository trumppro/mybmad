/**
 * Phase 6 (roadmap §2.5) CLI tests — the teammate BRAIN.
 *
 * runBrain is the jobs-runtime agent-cmd: read OAHS_CONTEXT_FILE, ask the model
 * gateway, write OAHS_REPLY_FILE. loadGatewayFromEnv reads env, so we inject a
 * ModelGateway backed by a mock Provider (the documented test seam) — no
 * network, no key. buildBrainMessages is exercised directly for the author→role
 * mapping and the memories line.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { ModelGateway, type Provider } from '@oahs/gateway';

import { buildBrainMessages, runBrain } from '../src/agent-brain.js';

/** A Provider stub that records the last request and returns a canned reply. */
function stubGateway(reply: string): {
  gateway: ModelGateway;
  lastMessages: () => { role: string; content: string }[] | undefined;
} {
  let seen: { role: string; content: string }[] | undefined;
  const provider: Provider = {
    async complete(req) {
      seen = req.messages;
      return {
        content: reply,
        usage: { promptTokens: 12, completionTokens: 8, totalTokens: 20 },
        model: req.model,
      };
    },
    async listModels() {
      return [];
    },
  };
  return {
    gateway: new ModelGateway({ provider, routes: { default: 'cc/test-model' } }),
    lastMessages: () => seen,
  };
}

const dirs: string[] = [];
function tmp(): string {
  const dir = mkdtempSync(join(tmpdir(), 'oahs-brain-test-'));
  dirs.push(dir);
  return dir;
}
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe('buildBrainMessages (author→role mapping)', () => {
  it('maps this agent to assistant, others to user, tags system messages, and appends memories', () => {
    const messages = buildBrainMessages({
      job: { agentActorId: 'agent-1', threadId: 't1' },
      messages: [
        { authorId: 'human-1', kind: 'chat', body: 'Bạn nghĩ sao về task này?' },
        { authorId: 'system', kind: 'system', body: 'work item advanced to in_review' },
        { authorId: 'agent-1', kind: 'chat', body: 'Tôi đã phân tích trước đó.' },
      ],
      memories: [{ content: 'thread trước: ưu tiên test coverage' }],
    });

    expect(messages[0]).toEqual({ role: 'system', content: expect.stringContaining('teammate AI') });
    expect(messages[1]).toEqual({ role: 'user', content: 'Bạn nghĩ sao về task này?' });
    expect(messages[2]).toEqual({ role: 'user', content: '[system] work item advanced to in_review' });
    expect(messages[3]).toEqual({ role: 'assistant', content: 'Tôi đã phân tích trước đó.' });
    // trailing memories line
    expect(messages[4]?.role).toBe('user');
    expect(messages[4]?.content).toContain('ưu tiên test coverage');
  });

  it('omits the memories line when there are none', () => {
    const messages = buildBrainMessages({
      job: { agentActorId: 'a', threadId: 't' },
      messages: [{ authorId: 'h', kind: 'chat', body: 'hi' }],
    });
    expect(messages).toHaveLength(2); // system + the one message
  });
});

describe('runBrain (inject gateway; tmp context/reply files)', () => {
  it('reads context, calls the gateway, writes the reply, and prints usage to stderr', async () => {
    const dir = tmp();
    const contextFile = join(dir, 'context.json');
    const replyFile = join(dir, 'reply.txt');
    writeFileSync(
      contextFile,
      JSON.stringify({
        job: { agentActorId: 'agent-1', threadId: 't1' },
        messages: [{ authorId: 'human-1', kind: 'chat', body: 'Xem giúp story này' }],
        memories: [],
      }),
      'utf8',
    );

    const { gateway, lastMessages } = stubGateway('phân tích xong: story rõ ràng, đề xuất thêm test.');
    const stderrLines: string[] = [];
    const stderr = {
      write: (chunk: string) => {
        stderrLines.push(chunk);
        return true;
      },
    } as unknown as NodeJS.WritableStream;

    const reply = await runBrain({ gateway, contextFile, replyFile, stderr });

    expect(reply).toContain('phân tích xong');
    expect(readFileSync(replyFile, 'utf8')).toBe(`${reply}\n`);
    // the human's message became a user turn
    expect(lastMessages()?.some((m) => m.content.includes('Xem giúp story này'))).toBe(true);
    // usage was printed to stderr (billing, §2.5)
    expect(stderrLines.join('')).toContain('total=20');
  });

  it('throws a clear error when no context file is configured', async () => {
    const { gateway } = stubGateway('x');
    await expect(runBrain({ gateway, contextFile: '', replyFile: '' })).rejects.toThrow(
      /OAHS_CONTEXT_FILE/,
    );
  });
});
