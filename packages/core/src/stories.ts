/**
 * stories.yaml parsing + validity rules (stories-schema.md, roadmap D9).
 *
 * The schema's validity rules become throwing checks here; the importer in
 * the engine consumes the validated entries. "No status field, ever."
 */
import { parse } from 'yaml';

import { StoriesValidationError } from './types.js';

export interface StoryEntry {
  id: string;
  title: string;
  description: string;
  specCheckpoint: boolean;
  doneCheckpoint: boolean;
  invokeDevWith: string;
}

const ID_PATTERN = /^[A-Za-z0-9-]+$/;

export function parseStories(yamlText: string): StoryEntry[] {
  let raw: unknown;
  try {
    raw = parse(yamlText);
  } catch (error) {
    throw new StoriesValidationError(`YAML parse failure: ${String(error)}`);
  }
  if (!Array.isArray(raw)) {
    throw new StoriesValidationError('top level must be a YAML list of stories');
  }

  const entries: StoryEntry[] = [];
  for (const item of raw) {
    if (typeof item !== 'object' || item === null || Array.isArray(item)) {
      throw new StoriesValidationError('every entry must be a mapping');
    }
    const entry = item as Record<string, unknown>;

    // Rule 3: "No status field, ever."
    if ('status' in entry) {
      throw new StoriesValidationError('no status field, ever');
    }
    // Rule 4: ids are YAML strings, always quoted — an unquoted `id: 1`
    // parses as a number and breaks string comparison.
    if (typeof entry['id'] !== 'string') {
      throw new StoriesValidationError('id must be a quoted YAML string');
    }
    const id = entry['id'];
    if (!ID_PATTERN.test(id)) {
      throw new StoriesValidationError(`id "${id}" may contain only letters, digits, and dashes`);
    }
    // Rule 1: required fields.
    if (typeof entry['title'] !== 'string' || entry['title'].length === 0) {
      throw new StoriesValidationError(`entry "${id}" is missing required field: title`);
    }
    if (typeof entry['description'] !== 'string' || entry['description'].length === 0) {
      throw new StoriesValidationError(`entry "${id}" is missing required field: description`);
    }

    entries.push({
      id,
      title: entry['title'],
      description: entry['description'],
      specCheckpoint: entry['spec_checkpoint'] === true,
      doneCheckpoint: entry['done_checkpoint'] === true,
      invokeDevWith: typeof entry['invoke_dev_with'] === 'string' ? entry['invoke_dev_with'] : '',
    });
  }

  // Rule 1: ids unique.
  const seen = new Set<string>();
  for (const { id } of entries) {
    if (seen.has(id)) throw new StoriesValidationError(`duplicate id "${id}"`);
    seen.add(id);
  }
  // Rule 2: prefix-free under the `<id>-` filename-matching convention.
  for (const a of seen) {
    for (const b of seen) {
      if (a !== b && a.startsWith(`${b}-`)) {
        throw new StoriesValidationError(`ids "${b}" and "${a}" collide under the <id>- convention`);
      }
    }
  }
  return entries;
}
