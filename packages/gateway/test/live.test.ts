/**
 * @oahs/gateway LIVE smoke test (Phase 6, roadmap §2.5).
 *
 * Skips itself unless OAHS_MODEL_API_KEY is set, so CI and everyday runs stay
 * green without a key. When the env IS present it calls the REAL endpoint via
 * loadGatewayFromEnv() — the one place we prove the model-agnostic promise end
 * to end (OAHS_MODEL_BASE_URL / OAHS_MODEL_API_KEY / OAHS_MODEL_DEFAULT).
 */
import { describe, expect, it } from 'vitest';

import { loadGatewayFromEnv } from '../src/index.js';

const hasKey =
  typeof process.env['OAHS_MODEL_API_KEY'] === 'string' &&
  process.env['OAHS_MODEL_API_KEY'].length > 0;

describe.skipIf(!hasKey)('live gateway (real endpoint)', () => {
  it('completes a one-line prompt with non-zero token usage', async () => {
    const gateway = loadGatewayFromEnv();
    const result = await gateway.complete({
      messages: [{ role: 'user', content: 'Reply exactly: rails work' }],
      maxTokens: 20,
    });
    expect(result.content.toLowerCase()).toContain('rails');
    expect(result.usage.totalTokens).toBeGreaterThan(0);
  }, 30_000);

  it('lists at least one model', async () => {
    const gateway = loadGatewayFromEnv();
    const models = await gateway.listModels();
    expect(models.length).toBeGreaterThan(0);
  }, 30_000);
});
