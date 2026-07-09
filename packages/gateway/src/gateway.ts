/**
 * @oahs/gateway — the ModelGateway (Phase 6, roadmap §2.5).
 *
 * The runtime-layer bridge between agent runtimes and providers: per-persona
 * routing (a route name → a model id), token metering for billing, and a
 * single model-agnostic complete()/listModels() surface. The spine is never a
 * client of this (no LLM in the control loop, §0.1) — Hermes teammates (§6)
 * and server-side workers (§4.3) are.
 *
 * INVARIANT (§0.1): imports no spine package. Keys/URLs are never hardcoded —
 * loadGatewayFromEnv reads them from the environment; a per-tenant vault would
 * inject them the same way.
 */
import {
  GatewayError,
  OpenAICompatibleProvider,
  type ChatMessage,
  type CompletionResult,
  type FetchImpl,
  type Provider,
} from './provider.js';
import type { Meter } from './meter.js';

/** The default route: when no route/model is named, this model answers. */
export const DEFAULT_ROUTE = 'default';

export interface GatewayConfig {
  provider: Provider;
  /** Per-persona routing policy: route name → model id. Should carry 'default'. */
  routes?: Record<string, string>;
  /** Optional token sink (billing). A metering failure never blocks a reply. */
  meter?: Meter;
}

/** A completion asked of the gateway: pick a model by route or override it. */
export interface GatewayCompletionRequest {
  /** Route (persona) name to resolve to a model via the routing policy. */
  route?: string;
  /** Explicit model id — wins over any route. */
  model?: string;
  messages: ChatMessage[];
  maxTokens?: number;
  temperature?: number;
}

export class ModelGateway {
  private readonly provider: Provider;
  private readonly routes: Record<string, string>;
  private readonly meter: Meter | undefined;

  constructor(config: GatewayConfig) {
    this.provider = config.provider;
    this.routes = config.routes ?? {};
    this.meter = config.meter;
  }

  /**
   * Resolve a route/model to a concrete model id. Precedence:
   *   explicit model → routes[route] → routes['default'] → throw.
   * Resolution is pure data lookup — never interpretation (§0.1).
   */
  resolveModel(req: { route?: string; model?: string }): string {
    if (req.model !== undefined && req.model.length > 0) return req.model;
    if (req.route !== undefined) {
      const routed = this.routes[req.route];
      if (routed !== undefined && routed.length > 0) return routed;
    }
    const fallback = this.routes[DEFAULT_ROUTE];
    if (fallback !== undefined && fallback.length > 0) return fallback;
    const routeLabel = req.route !== undefined ? ` for route "${req.route}"` : '';
    throw new GatewayError(
      `no model resolved${routeLabel}: pass a model, define the route, or set a "${DEFAULT_ROUTE}" route`,
    );
  }

  async complete(req: GatewayCompletionRequest): Promise<CompletionResult> {
    const model = this.resolveModel(req);
    const result = await this.provider.complete({
      model,
      messages: req.messages,
      ...(req.maxTokens !== undefined ? { maxTokens: req.maxTokens } : {}),
      ...(req.temperature !== undefined ? { temperature: req.temperature } : {}),
    });
    // Metering is a sink, never a gate — a ledger failure must not undo a reply.
    if (this.meter !== undefined) {
      try {
        this.meter.record({
          model: result.model,
          usage: result.usage,
          ...(req.route !== undefined ? { route: req.route } : {}),
        });
      } catch {
        /* billing is additive, never load-bearing */
      }
    }
    return result;
  }

  async listModels(): Promise<string[]> {
    return this.provider.listModels();
  }
}

/**
 * Build a ModelGateway from the environment. Reads:
 *   OAHS_MODEL_BASE_URL  (required) — OpenAI-compatible base URL
 *   OAHS_MODEL_API_KEY   (required) — Bearer key
 *   OAHS_MODEL_DEFAULT   (required) — default route's model id
 * Throws a clear GatewayError naming the missing variable. A per-tenant vault
 * would build the same object without ever touching process env.
 */
export function loadGatewayFromEnv(
  env: NodeJS.ProcessEnv = process.env,
  options: { fetchImpl?: FetchImpl; meter?: Meter } = {},
): ModelGateway {
  const baseUrl = env['OAHS_MODEL_BASE_URL'];
  const apiKey = env['OAHS_MODEL_API_KEY'];
  const defaultModel = env['OAHS_MODEL_DEFAULT'];

  const missing: string[] = [];
  if (baseUrl === undefined || baseUrl.length === 0) missing.push('OAHS_MODEL_BASE_URL');
  if (apiKey === undefined || apiKey.length === 0) missing.push('OAHS_MODEL_API_KEY');
  if (defaultModel === undefined || defaultModel.length === 0) missing.push('OAHS_MODEL_DEFAULT');
  if (missing.length > 0) {
    throw new GatewayError(
      `model gateway not configured: missing env ${missing.join(', ')}`,
    );
  }

  const provider = new OpenAICompatibleProvider({
    baseUrl: baseUrl as string,
    apiKey: apiKey as string,
    ...(options.fetchImpl !== undefined ? { fetchImpl: options.fetchImpl } : {}),
  });
  return new ModelGateway({
    provider,
    routes: { [DEFAULT_ROUTE]: defaultModel as string },
    ...(options.meter !== undefined ? { meter: options.meter } : {}),
  });
}
