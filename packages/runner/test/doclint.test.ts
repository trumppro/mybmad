/**
 * doclint unit tests (Phase 4, roadmap §1.4 non-code evidence).
 *
 * lintDoc is a MEASURING tool: deterministic, LLM-free. It returns raw
 * findings; whether a failing lint blocks a transition is the core's call.
 */
import { describe, expect, it } from 'vitest';

import { lintDoc } from '../src/index.js';

describe('lintDoc (deterministic document lint — no LLM)', () => {
  it('a well-formed document with frontmatter and required sections is schemaValid', () => {
    const doc = [
      '---',
      'title: PRD change',
      'status: draft',
      '---',
      '# PRD',
      '',
      '## Intent',
      'Rate limits for the public API.',
      '',
      '## Rollout',
      'Gradual, per tenant.',
    ].join('\n');
    const result = lintDoc(doc, { requiredSections: ['Intent', 'Rollout'] });
    expect(result).toEqual({ schemaValid: true, findings: [] });
  });

  it('empty (or whitespace-only) content fails with a single finding', () => {
    expect(lintDoc('')).toEqual({ schemaValid: false, findings: ['document is empty'] });
    expect(lintDoc('  \n\t\n').schemaValid).toBe(false);
  });

  it('a document without frontmatter is fine — the fence is optional', () => {
    expect(lintDoc('# Just a heading\n\nplain body\n')).toEqual({
      schemaValid: true,
      findings: [],
    });
  });

  it('broken frontmatter YAML is a finding; an unclosed fence too', () => {
    const broken = lintDoc('---\ntitle: [unclosed\n---\nbody\n');
    expect(broken.schemaValid).toBe(false);
    expect(broken.findings.some((f) => f.includes('frontmatter is not valid YAML'))).toBe(true);

    const unclosed = lintDoc('---\ntitle: never closes\nbody\n');
    expect(unclosed.schemaValid).toBe(false);
    expect(unclosed.findings).toContain("frontmatter fence '---' never closes");
  });

  it('each missing required section is its own finding (## heading, case-insensitive)', () => {
    const doc = '# Doc\n\n## intent\ncovered lowercase\n';
    const result = lintDoc(doc, { requiredSections: ['Intent', 'Rollout'] });
    // 'Intent' matches '## intent' case-insensitively; 'Rollout' is missing.
    expect(result.schemaValid).toBe(false);
    expect(result.findings).toEqual(['missing required section: ## Rollout']);
  });

  it('a deeper heading (###) does not satisfy a required H2 section', () => {
    const result = lintDoc('# Doc\n\n### Intent\nnested only\n', { requiredSections: ['Intent'] });
    expect(result.schemaValid).toBe(false);
    expect(result.findings).toEqual(['missing required section: ## Intent']);
  });

  it('placeholders (TBD/TODO/FIXME/LOREM IPSUM) are findings with line numbers and fail the lint', () => {
    const doc = ['# Doc', '', '## Intent', 'TBD', 'we will fixme later', 'Lorem Ipsum dolor'].join(
      '\n',
    );
    const result = lintDoc(doc, { requiredSections: ['Intent'] });
    expect(result.schemaValid).toBe(false);
    expect(result.findings).toEqual([
      'placeholder "TBD" at line 4',
      'placeholder "fixme" at line 5',
      'placeholder "Lorem Ipsum" at line 6',
    ]);
  });

  it('placeholder matching is word-bounded: TODOS or mastodon never fire', () => {
    const result = lintDoc('# Doc\n\nTODOS are tracked elsewhere; a mastodon roams.\n');
    expect(result).toEqual({ schemaValid: true, findings: [] });
  });
});
