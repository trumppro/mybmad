/**
 * @oahs/core — public API of the deterministic spine (Rules layer as code).
 *
 * The conformance suite in test/ is the specification: it was written first,
 * from the prose rules in the BMAD source as arbitrated in product-roadmap.md
 * §1 and test/CONFORMANCE.md. Implementation modules:
 *  - types.ts       — vocabulary, entities, errors (the fixed surface)
 *  - engine.ts      — in-memory reference engine (FSM, claims, gates, events)
 *  - intent-hash.ts — frozen-region extraction + versioned canonicalized hash
 *  - stories.ts     — stories.yaml parsing + validity rules
 *
 * Invariants (product-roadmap.md §0.1, machine-checked in CI):
 *  - No LLM SDK import anywhere under packages/core.
 *  - No code path outside command handlers writes projections.
 */
import { createEngine as createMemoryEngine } from './engine.js';
import type { SpineEngine } from './types.js';

export * from './types.js';
export { extractIntentRegion, canonicalizeForHash, computeIntentHash } from './intent-hash.js';
export { parseStories, type StoryEntry } from './stories.js';

/**
 * Engine factory indirection: the conformance suite always calls
 * createEngine(); a persistence package (e.g. @oahs/db) registers its own
 * factory in a vitest setup file to run the IDENTICAL suite against Postgres
 * (story "11": "conformance suite runs against both memory and Postgres
 * engines"). Default is the in-memory reference engine.
 *
 * Options must stay JSON-serializable — the db facade forwards them across a
 * worker-thread boundary (wallClock, D-G).
 */
export interface EngineFactoryOptions {
  wallClock?: boolean;
}

let engineFactory: (options?: EngineFactoryOptions) => SpineEngine = createMemoryEngine;

export function setEngineFactory(factory: (options?: EngineFactoryOptions) => SpineEngine): void {
  engineFactory = factory;
}

export function createEngine(options?: EngineFactoryOptions): SpineEngine {
  return engineFactory(options);
}

export { createMemoryEngine };
