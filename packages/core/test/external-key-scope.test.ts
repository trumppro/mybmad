/**
 * Conformance suite — externalKey scoping per project (Phase 7 Wave 2).
 *
 * Two parallel projects naturally BOTH have a story "1-1": conventional ids
 * must not collide across projects. Pins:
 *  - a bare handle resolves when it is unique across the workspace;
 *  - a bare handle duplicated across projects is an EXPLICIT ambiguity error
 *    (never a silent first-writer resolution across project lines);
 *  - the qualified form `<project-slug>:<key>` always resolves;
 *  - WITHIN one project, the Phase-1 first-writer-wins pin keeps its meaning
 *    (every pre-Wave-2 flow lives in the single default project).
 */
import { describe, expect, it } from 'vitest';
import {
  createEngine,
  GuardFailedError,
  type Actor,
  type Feature,
  type Project,
  type SpineEngine,
} from '../src/index.js';

const STORY = (key: string, title: string): string => `
- id: "${key}"
  title: ${title}
  description: scoped story
`;

interface Rig {
  engine: SpineEngine;
  planner: Actor;
  alpha: Project;
  beta: Project;
  falpha: Feature;
  fbeta: Feature;
}

function makeRig(): Rig {
  const engine = createEngine();
  const planner = engine.createActor({ type: 'user', displayName: 'Planner' });
  engine.grant({ actorId: planner.id, permission: 'feature.init' });
  engine.grant({ actorId: planner.id, permission: 'task.plan' });
  engine.grant({ actorId: planner.id, permission: 'task.advance' });
  const alpha = engine.createProject({ actorId: planner.id, name: 'Alpha' });
  const beta = engine.createProject({ actorId: planner.id, name: 'Beta' });
  const falpha = engine.createFeature({ actorId: planner.id, projectId: alpha.id });
  const fbeta = engine.createFeature({ actorId: planner.id, projectId: beta.id });
  return { engine, planner, alpha, beta, falpha, fbeta };
}

describe('externalKey — per-project scoping', () => {
  it('the same key in two projects: both exist, bare handle errs as AMBIGUOUS, qualified resolves', () => {
    const rig = makeRig();
    rig.engine.importStories({
      featureId: rig.falpha.id,
      yaml: STORY('1-1', 'Alpha first story'),
      actorId: rig.planner.id,
    });
    rig.engine.importStories({
      featureId: rig.fbeta.id,
      yaml: STORY('1-1', 'Beta first story'),
      actorId: rig.planner.id,
    });

    // Both items exist under their features.
    expect(rig.engine.listWorkItems({ projectId: rig.alpha.id })).toHaveLength(1);
    expect(rig.engine.listWorkItems({ projectId: rig.beta.id })).toHaveLength(1);

    // Bare handle is ambiguous — an explicit error, never silent shadowing.
    expect(() => rig.engine.getWorkItem('1-1')).toThrow(GuardFailedError);
    expect(() => rig.engine.getWorkItem('1-1')).toThrow(/ambiguous/i);

    // Qualified handles land on the right project's story.
    expect(rig.engine.getWorkItem('alpha:1-1').title).toBe('Alpha first story');
    expect(rig.engine.getWorkItem('beta:1-1').title).toBe('Beta first story');
  });

  it('a bare handle still resolves while it is unique across the workspace', () => {
    const rig = makeRig();
    rig.engine.importStories({
      featureId: rig.falpha.id,
      yaml: STORY('a-only', 'Only in alpha'),
      actorId: rig.planner.id,
    });
    expect(rig.engine.getWorkItem('a-only').title).toBe('Only in alpha');
  });

  it('lifecycle commands accept qualified handles too (one resolver everywhere)', () => {
    const rig = makeRig();
    rig.engine.importStories({
      featureId: rig.falpha.id,
      yaml: STORY('1-1', 'Alpha story'),
      actorId: rig.planner.id,
    });
    rig.engine.importStories({
      featureId: rig.fbeta.id,
      yaml: STORY('1-1', 'Beta story'),
      actorId: rig.planner.id,
    });
    const advanced = rig.engine.advanceState({
      workItemId: 'beta:1-1',
      to: 'draft',
      actorId: rig.planner.id,
    });
    expect(advanced.title).toBe('Beta story');
    expect(rig.engine.getWorkItem('alpha:1-1').state).toBe('backlog');
  });

  it('WITHIN one project, first-writer-wins keeps its Phase-1 meaning', () => {
    const rig = makeRig();
    const second = rig.engine.createFeature({ actorId: rig.planner.id, projectId: rig.alpha.id });
    rig.engine.createWorkItem({
      featureId: rig.falpha.id,
      actorId: rig.planner.id,
      externalKey: 'dup',
      title: 'first writer',
    });
    rig.engine.createWorkItem({
      featureId: second.id,
      actorId: rig.planner.id,
      externalKey: 'dup',
      title: 'second writer',
    });
    expect(rig.engine.getWorkItem('dup').title).toBe('first writer');
    expect(rig.engine.getWorkItem('alpha:dup').title).toBe('first writer');
  });
});
