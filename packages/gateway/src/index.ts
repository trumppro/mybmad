/**
 * @oahs/gateway — public surface (Phase 6, roadmap §2.5, the model gateway).
 *
 * RUNTIME LAYER. This package imports NO spine package (core/db/contracts/
 * spine-api) — the spine is never a client of the gateway (§0.1). Keys and
 * URLs are always injected via options/env, never hardcoded.
 */
export {
  GatewayError,
  OpenAICompatibleProvider,
  type ChatMessage,
  type CompletionRequest,
  type CompletionResult,
  type FetchImpl,
  type Provider,
  type Usage,
} from './provider.js';

export {
  InMemoryMeter,
  JsonlMeter,
  type Meter,
  type MeterEntry,
  type MeterTotals,
} from './meter.js';

export {
  DEFAULT_ROUTE,
  ModelGateway,
  loadGatewayFromEnv,
  type GatewayCompletionRequest,
  type GatewayConfig,
} from './gateway.js';
