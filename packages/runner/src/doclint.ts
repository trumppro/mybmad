/**
 * doclint — the MEASURING tool for non-code work (Phase 4, roadmap §1.4).
 *
 * "For non-code work: evidence is either machine-checkable (file exists,
 * frontmatter schema-valid, document lint) or a permitted actor's gate
 * decision. A checklist an LLM ticked is neither."
 *
 * lintDoc is deterministic and LLM-free: it MEASURES a document and returns
 * raw findings. The verdict (whether a failing lint blocks in_progress →
 * in_review) is computed by the core from the submitted doc_lint evidence —
 * never here.
 *
 * Checks:
 *  1. non-empty content;
 *  2. if the document opens with a '---' frontmatter fence, the block must
 *     parse as YAML (and close);
 *  3. every requested required section must exist as an H2 heading
 *     (`## <name>`, case-insensitive);
 *  4. placeholder markers (TBD / TODO / FIXME / LOREM IPSUM) are findings —
 *     a placeholder-ridden document is not schema-valid.
 */
import { parse as parseYaml } from 'yaml';

export interface LintDocOptions {
  /** H2 headings the document must contain (matched as `## <name>`). */
  requiredSections?: string[];
}

export interface DocLintResult {
  /** true when every check passed — the payload the core guards on. */
  schemaValid: boolean;
  /** Human-readable findings, empty when schemaValid. */
  findings: string[];
}

const PLACEHOLDER_RE = /\b(TBD|TODO|FIXME|LOREM IPSUM)\b/i;

/** Escape a string for literal use inside a RegExp. */
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Split off a leading '---' frontmatter block. Returns the raw block (null
 * when there is none), whether the fence closed, and the remaining body.
 */
function splitFrontmatter(content: string): {
  block: string | null;
  closed: boolean;
  body: string;
} {
  if (!content.startsWith('---')) return { block: null, closed: true, body: content };
  const close = content.indexOf('\n---', 3);
  if (close === -1) return { block: null, closed: false, body: content };
  const firstNewline = content.indexOf('\n');
  const block = content.slice(firstNewline + 1, close);
  const bodyStart = content.indexOf('\n', close + 1);
  const body = bodyStart === -1 ? '' : content.slice(bodyStart + 1);
  return { block, closed: true, body };
}

/** Deterministically lint a document. Pure measurement — no LLM, no verdicts. */
export function lintDoc(content: string, opts: LintDocOptions = {}): DocLintResult {
  const findings: string[] = [];

  if (content.trim().length === 0) {
    findings.push('document is empty');
    return { schemaValid: false, findings };
  }

  const { block, closed } = splitFrontmatter(content);
  if (!closed) {
    findings.push("frontmatter fence '---' never closes");
  } else if (block !== null) {
    try {
      parseYaml(block);
    } catch (error) {
      const message = error instanceof Error ? error.message.split('\n')[0] : String(error);
      findings.push(`frontmatter is not valid YAML: ${message ?? 'parse error'}`);
    }
  }

  for (const section of opts.requiredSections ?? []) {
    const headingRe = new RegExp(`^##\\s+${escapeRegExp(section)}\\s*$`, 'im');
    if (!headingRe.test(content)) {
      findings.push(`missing required section: ## ${section}`);
    }
  }

  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (line !== undefined) {
      const match = PLACEHOLDER_RE.exec(line);
      if (match !== null) {
        findings.push(`placeholder "${match[1] ?? match[0]}" at line ${i + 1}`);
      }
    }
  }

  return { schemaValid: findings.length === 0, findings };
}
