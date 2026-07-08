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
export * from './types.js';
export { extractIntentRegion, canonicalizeForHash, computeIntentHash } from './intent-hash.js';
export { parseStories, type StoryEntry } from './stories.js';
export { createEngine } from './engine.js';
