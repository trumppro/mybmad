/**
 * Conformance: stories.yaml import.
 *
 * Sources:
 *  - src/core-skills/bmad-spec/assets/stories-schema.md — Fields, Validity rules 1-4,
 *    Update semantics ("id pinned once the story's spec file exists").
 *  - product-roadmap.md D9 — "Work items are born in git (stories.yaml …) and imported
 *    idempotently into the spine"; "One direction of truth per datum".
 *  - product-roadmap.md §1.1/§1.2 — unified states start at `backlog` ("the first child
 *    leaving backlog lifts the feature").
 *
 * NOTE ON LOOKUP: the fixed API surface exposes no query-by-externalKey, and
 * importStories returns only externalKeys (StoriesImportResult.imported/updated).
 * Those keys are therefore the caller's handles: getWorkItem must resolve them.
 * This is the one interpretive choice this file makes; see the cluster report.
 */
import {
  createEngine,
  StoriesValidationError,
  type Permission,
  type SpineEngine,
} from '../src/index.js';

// ---------------------------------------------------------------------------
// Fixtures — inline YAML per stories-schema.md (ids quoted, no status field)
// ---------------------------------------------------------------------------

/** 4 valid stories, mirroring the schema's own example shape. */
const VALID_YAML = `
- id: "1"
  title: Add rate limiting to the public API
  description: >-
    Introduce a token-bucket limiter in front of the public endpoints;
    return 429 with a Retry-After header on limit breach.
  spec_checkpoint: true
- id: "2"
  title: Expose limiter metrics to the ops dashboard
  description: Emit per-route accept/reject counters the dashboard can scrape.
  done_checkpoint: true
- id: "3"
  title: Document the limiter rollout
  description: Ops runbook entry describing limiter configuration.
  invoke_dev_with: Use the existing Redis client, not in-process memory.
- id: "4-1"
  title: Composite id story
  description: Composite ids are allowed when the epic sits inside a larger spec.
`;
const VALID_KEYS = ['1', '2', '3', '4-1'];

/** Same file, story "3" re-titled (allowed pre-spec-file per Update semantics). */
const RETITLED_YAML = VALID_YAML.replace(
  'title: Document the limiter rollout',
  'title: Document the limiter rollout and alerting',
);

// stories-schema.md validity rule 1: "ids unique"
const DUPLICATE_ID_YAML = `
- id: "7"
  title: First story
  description: First body.
- id: "7"
  title: Second story
  description: Duplicate id in the same file.
`;

// stories-schema.md validity rule 2: '"3" and "3-2" cannot coexist'
const PREFIX_COLLISION_YAML = `
- id: "3"
  title: Parent-shaped id
  description: Plain id three.
- id: "3-2"
  title: Child-shaped id
  description: Id three dash two collides under the <id>- filename convention.
`;

// stories-schema.md validity rule 3: "No status field, ever."
const STATUS_FIELD_YAML = `
- id: "1"
  title: Story smuggling state
  description: Import must reject any status field.
  status: done
`;

// stories-schema.md validity rule 4: "containing only letters, digits, and dashes"
const BAD_CHAR_ID_YAML = `
- id: "3/2"
  title: Slash in id
  description: Characters like / or * break the filename match.
`;

// stories-schema.md validity rule 4: 'An unquoted id: 1 parses as a number'
const UNQUOTED_NUMERIC_ID_YAML = `
- id: 1
  title: Unquoted id
  description: Parses as a YAML number, breaking string comparison.
`;

// stories-schema.md validity rule 1: "Every entry parses with all required fields"
const MISSING_TITLE_YAML = `
- id: "1"
  description: Title is a required field and is absent here.
`;

const RENAME_BEFORE_YAML = `
- id: "1"
  title: Original story
  description: Story that will be renumbered on re-derive.
`;
const RENAME_AFTER_YAML = `
- id: "2"
  title: Original story
  description: Story that will be renumbered on re-derive.
`;

// ---------------------------------------------------------------------------
// Setup helper
// ---------------------------------------------------------------------------

function setup(): { engine: SpineEngine; actorId: string; featureId: string } {
  const engine = createEngine();
  const actor = engine.createActor({ type: 'user', displayName: 'Planner' });
  const perms: Permission[] = ['task.plan', 'task.advance', 'feature.init'];
  for (const permission of perms) {
    engine.grant({ actorId: actor.id, permission });
  }
  const feature = engine.createFeature({ actorId: actor.id });
  return { engine, actorId: actor.id, featureId: feature.id };
}

// ---------------------------------------------------------------------------

describe('importStories — valid file (stories-schema.md Fields; roadmap D9)', () => {
  // D9: "Work items are born in git (stories.yaml) and imported idempotently"
  it('imports every story and exposes each as a work item under its externalKey', () => {
    const { engine, actorId, featureId } = setup();

    const result = engine.importStories({ featureId, yaml: VALID_YAML, actorId });

    expect([...result.imported].sort()).toEqual(VALID_KEYS);
    expect(result.updated).toEqual([]);

    const first = engine.getWorkItem('1');
    expect(first.externalKey).toBe('1');
    expect(first.featureId).toBe(featureId);
    expect(first.title).toBe('Add rate limiting to the public API');
    // §1.1 states are rank-ordered from backlog; §1.2 epic-lift fires on the
    // "first child leaving backlog" — imported items are born there.
    expect(first.state).toBe('backlog');
    expect(first.blockedReason).toBeNull();
  });

  // stories-schema.md Fields: spec_checkpoint / done_checkpoint / invoke_dev_with
  // are per-story caller-facing data and must survive the import.
  it('carries checkpoint flags and invoke_dev_with verbatim onto the work items', () => {
    const { engine, actorId, featureId } = setup();
    engine.importStories({ featureId, yaml: VALID_YAML, actorId });

    expect(engine.getWorkItem('1').specCheckpoint).toBe(true);
    expect(engine.getWorkItem('2').doneCheckpoint).toBe(true);
    // "Free text appended verbatim … nothing else interprets it"
    expect(engine.getWorkItem('3').invokeDevWith).toBe(
      'Use the existing Redis client, not in-process memory.',
    );
  });

  // stories-schema.md Fields: spec_checkpoint / done_checkpoint default false,
  // invoke_dev_with defaults to "".
  it('applies schema defaults when optional fields are absent', () => {
    const { engine, actorId, featureId } = setup();
    engine.importStories({ featureId, yaml: VALID_YAML, actorId });

    const bare = engine.getWorkItem('4-1');
    expect(bare.specCheckpoint).toBe(false);
    expect(bare.doneCheckpoint).toBe(false);
    expect(bare.invokeDevWith).toBe('');
  });
});

describe('importStories — validity rules (stories-schema.md "Validity rules")', () => {
  // Rule 1: "ids unique"
  it('rejects duplicate ids in one file', () => {
    const { engine, actorId, featureId } = setup();
    expect(() =>
      engine.importStories({ featureId, yaml: DUPLICATE_ID_YAML, actorId }),
    ).toThrow(StoriesValidationError);
  });

  // Rule 2: 'no id may equal another id plus a dash-suffix ("3" and "3-2" cannot coexist)'
  it('rejects ids that are not prefix-free under the <id>- convention', () => {
    const { engine, actorId, featureId } = setup();
    expect(() =>
      engine.importStories({ featureId, yaml: PREFIX_COLLISION_YAML, actorId }),
    ).toThrow(StoriesValidationError);
  });

  // Rule 3: "No status field, ever."
  it('rejects any entry carrying a status field', () => {
    const { engine, actorId, featureId } = setup();
    expect(() =>
      engine.importStories({ featureId, yaml: STATUS_FIELD_YAML, actorId }),
    ).toThrow(StoriesValidationError);
  });

  // Rule 4: ids contain "only letters, digits, and dashes"
  it('rejects ids containing characters outside letters/digits/dashes', () => {
    const { engine, actorId, featureId } = setup();
    expect(() =>
      engine.importStories({ featureId, yaml: BAD_CHAR_ID_YAML, actorId }),
    ).toThrow(StoriesValidationError);
  });

  // Rule 4: 'An unquoted `id: 1` parses as a number and breaks string comparison'
  it('rejects an unquoted numeric id (parses as a YAML number, not a string)', () => {
    const { engine, actorId, featureId } = setup();
    expect(() =>
      engine.importStories({ featureId, yaml: UNQUOTED_NUMERIC_ID_YAML, actorId }),
    ).toThrow(StoriesValidationError);
  });

  // Rule 1: "Every entry parses with all required fields" (title is required)
  it('rejects an entry missing a required field', () => {
    const { engine, actorId, featureId } = setup();
    expect(() =>
      engine.importStories({ featureId, yaml: MISSING_TITLE_YAML, actorId }),
    ).toThrow(StoriesValidationError);
  });
});

describe('importStories — re-import semantics (stories-schema.md "Update semantics"; roadmap D9)', () => {
  // D9: "imported idempotently into the spine"
  it('re-importing the identical file creates nothing and reports every key as updated', () => {
    const { engine, actorId, featureId } = setup();
    engine.importStories({ featureId, yaml: VALID_YAML, actorId });

    const second = engine.importStories({ featureId, yaml: VALID_YAML, actorId });

    expect(second.imported).toEqual([]);
    expect([...second.updated].sort()).toEqual(VALID_KEYS);
    // No duplicate work items: each key still resolves to a single, unchanged item.
    expect(engine.getWorkItem('1').externalKey).toBe('1');
    expect(engine.getWorkItem('1').title).toBe('Add rate limiting to the public API');
  });

  // Update semantics: stories with no spec file yet "may be renumbered, reordered,
  // or removed freely on re-derive" — an edited title must flow through.
  it('re-import updates the title of a story whose spec file does not exist yet', () => {
    const { engine, actorId, featureId } = setup();
    engine.importStories({ featureId, yaml: VALID_YAML, actorId });

    const second = engine.importStories({ featureId, yaml: RETITLED_YAML, actorId });

    expect(second.updated).toContain('3');
    expect(engine.getWorkItem('3').title).toBe('Document the limiter rollout and alerting');
  });

  // Rule 3 ("No status field, ever") + D9 ("One direction of truth per datum"):
  // stories.yaml can never carry lifecycle state, so a re-import must not reset it.
  it('re-import never touches lifecycle state of an already-advanced work item', () => {
    const { engine, actorId, featureId } = setup();
    engine.importStories({ featureId, yaml: VALID_YAML, actorId });
    const item = engine.getWorkItem('4-1');
    engine.advanceState({ workItemId: item.id, to: 'draft', actorId });

    engine.importStories({ featureId, yaml: VALID_YAML, actorId });

    expect(engine.getWorkItem('4-1').state).toBe('draft');
  });

  // Update semantics: "An id is pinned once its story spec file exists (any
  // stories/<id>-*.md in the spec folder)". The engine API models no filesystem,
  // so full pinning is untestable here — what we CAN pin is that a renumbering
  // re-import is not destructive: the previously-imported work item keeps its data.
  //
  // Full pinned-id semantics (a pinned story keeps its id through edits, removal
  // retires the id, retired ids are never reassigned) require an importer that
  // reads the spec folder's stories/<id>-*.md files. The engine API models no
  // filesystem, so those cases belong with the spec-folder-reading importer, not
  // this engine-level suite — which pins the non-destructive property below.
  it('re-import under a renumbered id does not lose the old work item', () => {
    const { engine, actorId, featureId } = setup();
    engine.importStories({ featureId, yaml: RENAME_BEFORE_YAML, actorId });

    const second = engine.importStories({ featureId, yaml: RENAME_AFTER_YAML, actorId });

    expect(second.imported).toEqual(['2']);
    // The old story's data survives (event log is append-only, §1.5; nothing in
    // the import path may destroy history).
    const old = engine.getWorkItem('1');
    expect(old.externalKey).toBe('1');
    expect(old.title).toBe('Original story');
    // And the renumbered key exists as its own work item.
    expect(engine.getWorkItem('2').externalKey).toBe('2');
  });
});
