/**
 * `oahs models` / `oahs ping` — the model-gateway CLI surface (Phase 6,
 * roadmap §2.5). Pure functions over a ModelGateway built from env, mirroring
 * the (client, opts) → text shape of the gate-holder commands.
 *
 * INVARIANT (§0.1): these commands touch NO spine client — the gateway is the
 * runtime layer, wholly independent of the rails. Keys/URLs come from env via
 * loadGatewayFromEnv, never hardcoded.
 */
import { loadGatewayFromEnv } from '@oahs/gateway';

/** `oahs models` — list the models the configured gateway can reach. */
export async function modelsCommand(): Promise<string> {
  const gateway = loadGatewayFromEnv();
  const models = await gateway.listModels();
  if (models.length === 0) return '(no models reported by the endpoint)';
  return models.join('\n');
}

export interface PingOptions {
  /** The prompt to send. Defaults to a tiny liveness check. */
  message?: string;
  /** Route (persona) name; resolves to a model via the routing policy. */
  route?: string;
  /** Explicit model id — overrides the route. */
  model?: string;
}

/**
 * `oahs ping` — send one short prompt through the gateway and print the reply
 * plus its token usage (the billing unit, §2.5). Proves the endpoint + key
 * without running a full teammate loop.
 */
export async function pingCommand(opts: PingOptions = {}): Promise<string> {
  // No meter: `ping` is one shot, and it prints result.usage directly (below). An
  // InMemoryMeter here recorded a single call nobody read — a dead sink that twice
  // made a reviewer conclude "metering is wired into the CLI" when it is not. The
  // Meter seam is real (gateway.ts); persisting/aggregating it is unbuilt (§12.7).
  const gateway = loadGatewayFromEnv(process.env);
  const message = opts.message ?? 'Reply in one short sentence that the gateway is live.';
  const result = await gateway.complete({
    ...(opts.route !== undefined ? { route: opts.route } : {}),
    ...(opts.model !== undefined ? { model: opts.model } : {}),
    messages: [{ role: 'user', content: message }],
    maxTokens: 200,
  });
  return [
    `model: ${result.model}`,
    '',
    result.content,
    '',
    `usage: prompt=${result.usage.promptTokens} completion=${result.usage.completionTokens} total=${result.usage.totalTokens}`,
  ].join('\n');
}
