/**
 * Conformance: frozen intent region extraction + intent hash (pure functions).
 *
 * Sources:
 *  - product-roadmap.md §1.1 — intent_hash is the "hash of the frozen intent
 *    region — both <intent-contract> and <frozen-after-approval> tags are
 *    recognized, hashed after canonicalization, algorithm versioned".
 *  - src/bmm-skills/4-implementation/bmad-dev-auto/spec-template.md — the frozen
 *    region is delimited by <intent-contract> … </intent-contract>.
 *  - src/bmm-skills/4-implementation/bmad-quick-dev/spec-template.md — the frozen
 *    region is delimited by <frozen-after-approval reason="human-owned intent — do
 *    not modify unless human renegotiates"> … </frozen-after-approval>.
 *  - packages/core/src/index.ts — canonicalizeForHash: "CRLF→LF, strip trailing
 *    whitespace per line, collapse runs of blank lines"; computeIntentHash:
 *    "Returns `${INTENT_HASH_ALGO}:${sha256hex}` over the canonicalized region".
 */
import {
  extractIntentRegion,
  canonicalizeForHash,
  computeIntentHash,
  INTENT_HASH_ALGO,
} from '../src/index.js';

// ---------------------------------------------------------------------------
// Fixtures — realistic spec bodies per the two templates
// ---------------------------------------------------------------------------

const INNER_REGION = [
  '',
  '## Intent',
  '',
  '**Problem:** Public endpoints have no rate limiting.',
  '',
  '**Approach:** Token-bucket limiter in front of the public API.',
  '',
  '## Boundaries & Constraints',
  '',
  '**Always:** Return 429 with a Retry-After header on limit breach.',
  '',
  '**Never:** No in-process counters; state lives in Redis.',
  '',
].join('\n');

/** dev-auto spec-template.md shape: <intent-contract> region. */
const DEV_AUTO_SPEC = [
  '---',
  'status: ready-for-dev',
  '---',
  '',
  '# Spec: Rate limiting',
  '',
  '<intent-contract>' + INNER_REGION + '</intent-contract>',
  '',
  '## Code Map',
  '',
  '- `src/limiter.ts` -- new middleware',
].join('\n');

/** quick-dev spec-template.md shape: <frozen-after-approval reason="..."> region. */
const QUICK_DEV_SPEC = [
  '---',
  'status: approved',
  '---',
  '',
  '# Spec: Rate limiting',
  '',
  '<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">' +
    INNER_REGION +
    '</frozen-after-approval>',
  '',
  '## Code Map',
  '',
  '- `src/limiter.ts` -- new middleware',
].join('\n');

/** A spec with no frozen region at all. */
const UNTAGGED_SPEC = [
  '# Spec: Rate limiting',
  '',
  '## Intent',
  '',
  '**Problem:** Public endpoints have no rate limiting.',
].join('\n');

/** extract + fail loudly, so downstream assertions stay typed as string. */
function mustExtract(markdown: string): string {
  const region = extractIntentRegion(markdown);
  if (region === null) {
    throw new Error('expected an intent region, got null');
  }
  return region;
}

// ---------------------------------------------------------------------------

describe('extractIntentRegion (dev-auto + quick-dev spec templates; roadmap §1.1)', () => {
  // dev-auto/spec-template.md: Intent + Boundaries live inside <intent-contract>;
  // Code Map lives outside it.
  it('extracts the inner region of <intent-contract>…</intent-contract>', () => {
    const region = mustExtract(DEV_AUTO_SPEC);

    expect(region).toContain('**Problem:** Public endpoints have no rate limiting.');
    expect(region).toContain('## Boundaries & Constraints');
    // The tags delimit the region; they are not part of it.
    expect(region).not.toContain('<intent-contract>');
    expect(region).not.toContain('</intent-contract>');
    // Content outside the frozen region is excluded (Code Map is agent-owned).
    expect(region).not.toContain('## Code Map');
    expect(region).not.toContain('status: ready-for-dev');
  });

  // quick-dev/spec-template.md: same region, different tag, carries a reason attribute.
  it('extracts the inner region of <frozen-after-approval reason="…">…</frozen-after-approval>', () => {
    const region = mustExtract(QUICK_DEV_SPEC);

    expect(region).toContain('**Problem:** Public endpoints have no rate limiting.');
    expect(region).not.toContain('<frozen-after-approval');
    expect(region).not.toContain('</frozen-after-approval>');
    expect(region).not.toContain('human-owned intent'); // the attribute is tag metadata, not region
    expect(region).not.toContain('## Code Map');
  });

  // index.ts contract: "Returns null when no region exists."
  it('returns null when neither tag is present', () => {
    expect(extractIntentRegion(UNTAGGED_SPEC)).toBeNull();
  });

  // roadmap §1.1: BOTH tags mark the same concept — the frozen intent region.
  // Identical inner content must therefore yield the identical hash regardless
  // of which template produced the file.
  it('yields the same intent hash for identical content under either tag', () => {
    const fromDevAuto = mustExtract(DEV_AUTO_SPEC);
    const fromQuickDev = mustExtract(QUICK_DEV_SPEC);

    expect(computeIntentHash(fromDevAuto)).toBe(computeIntentHash(fromQuickDev));
  });
});

describe('canonicalizeForHash (index.ts: CRLF→LF, strip trailing ws, collapse blank runs)', () => {
  it('normalizes CRLF line endings to LF', () => {
    expect(canonicalizeForHash('Problem: X\r\nApproach: Y\r\nNever: Z')).toBe(
      'Problem: X\nApproach: Y\nNever: Z',
    );
  });

  it('strips trailing whitespace (spaces and tabs) from every line', () => {
    expect(canonicalizeForHash('Problem: X  \nApproach: Y\t\nNever: Z')).toBe(
      'Problem: X\nApproach: Y\nNever: Z',
    );
  });

  // "collapse runs of blank lines" — the collapsed width is an engine choice,
  // so we pin only the invariant: a 3-blank run and a 5-blank run canonicalize
  // to the same text (whitespace inflation can never change the intent hash).
  it('canonicalizes different-length runs of 3+ blank lines identically', () => {
    const threeBlanks = 'Problem: X\n\n\n\nApproach: Y';
    const fiveBlanks = 'Problem: X\n\n\n\n\n\nApproach: Y';

    expect(canonicalizeForHash(threeBlanks)).toBe(canonicalizeForHash(fiveBlanks));
  });

  // "…other content unchanged": already-canonical text passes through verbatim —
  // single blank lines and leading indentation are meaningful markdown.
  it('leaves already-canonical content untouched (single blank line, indentation)', () => {
    const canonical = '## Intent\n\n- item one\n  - nested item\n\n**Never:** Z';
    expect(canonicalizeForHash(canonical)).toBe(canonical);
  });
});

describe('computeIntentHash (roadmap §1.1: versioned algorithm over canonicalized region)', () => {
  // index.ts: "Returns `${INTENT_HASH_ALGO}:${sha256hex}`" with INTENT_HASH_ALGO = 'v1'
  it('produces a v1-prefixed sha256 hex digest', () => {
    const hash = computeIntentHash('**Problem:** Public endpoints have no rate limiting.');

    expect(hash.startsWith(`${INTENT_HASH_ALGO}:`)).toBe(true);
    expect(hash).toMatch(/^v1:[0-9a-f]{64}$/);
  });

  // §1.1: "hashed after canonicalization" — line-ending and trailing-space noise
  // (the exact churn a CRLF editor or auto-formatter introduces) never moves the hash.
  it('hashes CRLF/trailing-space variants of the same intent identically', () => {
    const unixClean = '## Intent\n\n**Problem:** X.\n**Approach:** Y.\n';
    const windowsNoisy = '## Intent\r\n\r\n**Problem:** X.  \r\n**Approach:** Y.\t\r\n';

    expect(computeIntentHash(windowsNoisy)).toBe(computeIntentHash(unixClean));
  });

  // The hash exists to detect real intent drift (guard "intent hash unchanged", §1.4).
  it('changes when the intent content actually changes', () => {
    const original = '**Problem:** X.\n**Approach:** Token bucket.';
    const drifted = '**Problem:** X.\n**Approach:** Sliding window.';

    expect(computeIntentHash(drifted)).not.toBe(computeIntentHash(original));
  });

  it('is deterministic for identical input', () => {
    const region = '## Intent\n\n**Problem:** X.';
    expect(computeIntentHash(region)).toBe(computeIntentHash(region));
  });
});
