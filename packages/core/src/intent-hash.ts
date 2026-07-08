/**
 * Frozen intent region extraction + versioned intent hash (roadmap §1.1).
 *
 * Both real-world tags are recognized: `<intent-contract>` (dev-auto
 * spec-template.md) and `<frozen-after-approval ...>` (quick-dev
 * spec-template.md). Hashing happens after canonicalization so line-ending
 * and trailing-whitespace churn (CRLF editors, auto-formatters) never moves
 * the hash — only real intent drift does (technical-risk review: alarm
 * fatigue kills the mechanism).
 */
import { createHash } from 'node:crypto';

import { INTENT_HASH_ALGO } from './types.js';

const TAG_PATTERNS = [
  /<intent-contract>([\s\S]*?)<\/intent-contract>/,
  /<frozen-after-approval\b[^>]*>([\s\S]*?)<\/frozen-after-approval>/,
];

export function extractIntentRegion(markdown: string): string | null {
  for (const pattern of TAG_PATTERNS) {
    const match = pattern.exec(markdown);
    if (match !== null) return match[1] ?? '';
  }
  return null;
}

export function canonicalizeForHash(text: string): string {
  const unixNewlines = text.replace(/\r\n/g, '\n');
  const stripped = unixNewlines
    .split('\n')
    .map((line) => line.replace(/[ \t]+$/, ''))
    .join('\n');
  // Collapse runs of 2+ blank lines to a single blank line; a single blank
  // line is meaningful markdown and passes through untouched.
  return stripped.replace(/\n{3,}/g, '\n\n');
}

export function computeIntentHash(region: string): string {
  const digest = createHash('sha256').update(canonicalizeForHash(region), 'utf8').digest('hex');
  return `${INTENT_HASH_ALGO}:${digest}`;
}
