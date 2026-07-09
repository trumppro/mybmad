#!/usr/bin/env node
import { createRequire as __cr } from 'node:module';
const require = __cr(import.meta.url);
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) =>
  function __init() {
    return (fn && (res = (0, fn[__getOwnPropNames(fn)[0]])((fn = 0))), res);
  };
var __export = (target, all) => {
  for (var name in all) __defProp(target, name, { get: all[name], enumerable: true });
};

// ../../packages/core/src/types.ts
var PermissionDeniedError,
  GuardFailedError,
  ConflictError,
  InvalidTransitionError,
  StoriesValidationError,
  WORK_ITEM_STATES,
  BLOCKED_REASONS,
  PLAN_CEILINGS,
  DEFAULT_PLAN,
  AGENT_GATE_APPROVE_PERMISSIONS,
  DELIVERY_ROLES,
  REVIEW_LOOP_LIMIT;
var init_types = __esm({
  '../../packages/core/src/types.ts'() {
    'use strict';
    PermissionDeniedError = class extends Error {
      constructor(permission, actorId) {
        super(`permission denied: ${permission} for actor ${actorId}`);
        this.permission = permission;
        this.actorId = actorId;
        this.name = 'PermissionDeniedError';
      }
    };
    GuardFailedError = class extends Error {
      constructor(guard) {
        super(`guard failed: ${guard}`);
        this.guard = guard;
        this.name = 'GuardFailedError';
      }
    };
    ConflictError = class extends Error {
      constructor(reason) {
        super(`conflict: ${reason}`);
        this.reason = reason;
        this.name = 'ConflictError';
      }
    };
    InvalidTransitionError = class extends Error {
      constructor(from, to) {
        super(`invalid transition: ${from} -> ${to}`);
        this.from = from;
        this.to = to;
        this.name = 'InvalidTransitionError';
      }
    };
    StoriesValidationError = class extends Error {
      constructor(rule) {
        super(`stories.yaml invalid: ${rule}`);
        this.rule = rule;
        this.name = 'StoriesValidationError';
      }
    };
    WORK_ITEM_STATES = ['backlog', 'draft', 'ready_for_dev', 'in_progress', 'in_review', 'done'];
    BLOCKED_REASONS = [
      'unclear_intent',
      'no_stories_yaml_found',
      'ambiguous_story_file_match',
      'review_non_convergence',
      'no_subagents',
      'dirty_tree',
      'stale_worktree',
      'awaiting_human_input',
      'other',
    ];
    PLAN_CEILINGS = {
      free: { agentGateApprove: false, agentGateReject: false },
      team: { agentGateApprove: false, agentGateReject: true },
      enterprise: { agentGateApprove: true, agentGateReject: true },
    };
    DEFAULT_PLAN = 'enterprise';
    AGENT_GATE_APPROVE_PERMISSIONS = ['gate.spec.approve', 'gate.review.approve'];
    DELIVERY_ROLES = {
      product_owner: ['task.plan', 'feature.init', 'feature.advance', 'gate.spec.approve', 'dispatch.release_hold'],
      tech_lead: ['task.plan', 'gate.review.approve', 'gate.review.reject', 'state.downgrade', 'ops.force_release_claim'],
      reviewer: ['gate.review.approve', 'gate.review.reject'],
      developer: ['task.claim', 'task.advance', 'task.block'],
      qa: ['task.block'],
      contributor: [],
    };
    REVIEW_LOOP_LIMIT = 5;
  },
});

// ../../packages/core/src/stories.ts
import { parse } from 'yaml';
function parseStories(yamlText) {
  let raw;
  try {
    raw = parse(yamlText);
  } catch (error) {
    throw new StoriesValidationError(`YAML parse failure: ${String(error)}`);
  }
  if (!Array.isArray(raw)) {
    throw new StoriesValidationError('top level must be a YAML list of stories');
  }
  const entries = [];
  for (const item of raw) {
    if (typeof item !== 'object' || item === null || Array.isArray(item)) {
      throw new StoriesValidationError('every entry must be a mapping');
    }
    const entry = item;
    if ('status' in entry) {
      throw new StoriesValidationError('no status field, ever');
    }
    if (typeof entry['id'] !== 'string') {
      throw new StoriesValidationError('id must be a quoted YAML string');
    }
    const id = entry['id'];
    if (!ID_PATTERN.test(id)) {
      throw new StoriesValidationError(`id "${id}" may contain only letters, digits, and dashes`);
    }
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
  const seen = /* @__PURE__ */ new Set();
  for (const { id } of entries) {
    if (seen.has(id)) throw new StoriesValidationError(`duplicate id "${id}"`);
    seen.add(id);
  }
  for (const a of seen) {
    for (const b of seen) {
      if (a !== b && a.startsWith(`${b}-`)) {
        throw new StoriesValidationError(`ids "${b}" and "${a}" collide under the <id>- convention`);
      }
    }
  }
  return entries;
}
var ID_PATTERN;
var init_stories = __esm({
  '../../packages/core/src/stories.ts'() {
    'use strict';
    init_types();
    ID_PATTERN = /^[A-Za-z0-9-]+$/;
  },
});

// ../../packages/core/src/engine.ts
function createEngine() {
  return new EngineImpl();
}
var RANK, TRANSITIONS, LEGACY_STATUS, EngineImpl;
var init_engine = __esm({
  '../../packages/core/src/engine.ts'() {
    'use strict';
    init_types();
    init_stories();
    RANK = Object.fromEntries(WORK_ITEM_STATES.map((s, i) => [s, i]));
    TRANSITIONS = [
      { from: 'backlog', to: 'draft', permission: 'task.plan', claimRequired: false, guards: [] },
      {
        from: 'draft',
        to: 'ready_for_dev',
        permission: 'task.plan',
        claimRequired: false,
        guards: ['spec_gate_if_checkpoint'],
      },
      {
        from: 'ready_for_dev',
        to: 'in_progress',
        permission: 'task.advance',
        claimRequired: true,
        guards: ['deps_done'],
      },
      {
        from: 'in_progress',
        to: 'in_review',
        permission: 'task.advance',
        claimRequired: true,
        guards: ['nonempty_diff'],
      },
    ];
    LEGACY_STATUS = {
      backlog: 'backlog',
      draft: 'draft',
      'ready-for-dev': 'ready_for_dev',
      ready_for_dev: 'ready_for_dev',
      'in-progress': 'in_progress',
      in_progress: 'in_progress',
      'in-review': 'in_review',
      in_review: 'in_review',
      review: 'in_review',
      done: 'done',
    };
    EngineImpl = class {
      now = 0;
      seq = 0;
      globalSeq = 0;
      actors = /* @__PURE__ */ new Map();
      grants = /* @__PURE__ */ new Map();
      // actorId -> "permission" (scope ignored until Phase 2)
      features = /* @__PURE__ */ new Map();
      workItems = /* @__PURE__ */ new Map();
      externalKeyIndex = /* @__PURE__ */ new Map();
      // externalKey -> workItemId (first writer wins)
      claims = /* @__PURE__ */ new Map();
      claimsByItem = /* @__PURE__ */ new Map();
      // workItemId -> claimIds
      fencingCounter = /* @__PURE__ */ new Map();
      // workItemId -> last token
      gateDecisions = [];
      evidenceRows = [];
      eventLog = [];
      streamSeqs = /* @__PURE__ */ new Map();
      idempotencyCache = /* @__PURE__ */ new Map();
      // -- entitlements state (Phase 2, roadmap §3) --------------------------------
      governanceRoles = /* @__PURE__ */ new Map();
      roleAssignments = [];
      plan = DEFAULT_PLAN;
      planVersion = 1;
      workspacePolicy = {};
      policyVersion = 1;
      gatePolicies = /* @__PURE__ */ new Map();
      systemActorId;
      constructor() {
        this.systemActorId = this.nextId('actor-system');
        this.actors.set(this.systemActorId, {
          id: this.systemActorId,
          type: 'system',
          displayName: 'system',
        });
      }
      // -- infrastructure --------------------------------------------------------
      nextId(prefix) {
        this.seq += 1;
        return `${prefix}_${this.seq.toString(36).padStart(6, '0')}`;
      }
      append(streamType, streamId, type, actorId, payload, extra) {
        this.globalSeq += 1;
        const streamSeq = (this.streamSeqs.get(streamId) ?? 0) + 1;
        this.streamSeqs.set(streamId, streamSeq);
        const event = {
          globalSeq: this.globalSeq,
          streamType,
          streamId,
          streamSeq,
          type,
          actorId,
          payload,
          ...(extra?.causationId !== void 0 ? { causationId: extra.causationId } : {}),
        };
        this.eventLog.push(event);
        return event;
      }
      mustGetItem(workItemId2) {
        const byId = this.workItems.get(workItemId2);
        if (byId) return byId;
        const mapped = this.externalKeyIndex.get(workItemId2);
        if (mapped !== void 0) {
          const item = this.workItems.get(mapped);
          if (item) return item;
        }
        throw new GuardFailedError(`unknown work item: ${workItemId2}`);
      }
      /**
       * Entitlement resolution — a PURE function over plan × governance ×
       * delivery-role data (roadmap §3). A grant may EXIST (direct or via a
       * role) and still not RESOLVE for an agent when the plan ceiling or the
       * restrict-only workspace policy narrows it. Users are never plan-filtered.
       */
      grantSource(actorId, permission) {
        if (this.grants.get(actorId)?.has(permission)) return 'direct';
        for (const assignment of this.roleAssignments) {
          if (assignment.actorId !== actorId || assignment.revoked) continue;
          if ((DELIVERY_ROLES[assignment.roleCode] ?? []).includes(permission)) {
            return `role:${assignment.roleCode}`;
          }
        }
        return null;
      }
      agentCeilingAllows(actor, permission) {
        if (!actor || actor.type !== 'agent') return { plan: true, policy: true };
        const ceiling = PLAN_CEILINGS[this.plan];
        if (AGENT_GATE_APPROVE_PERMISSIONS.includes(permission)) {
          return { plan: ceiling.agentGateApprove, policy: this.workspacePolicy.agentGateApprovals !== false };
        }
        if (permission === 'gate.review.reject') {
          return { plan: ceiling.agentGateReject, policy: true };
        }
        if (permission === 'task.claim') {
          return { plan: true, policy: this.workspacePolicy.agentSelfDispatch !== false };
        }
        return { plan: true, policy: true };
      }
      hasPermission(actorId, permission) {
        if (this.grantSource(actorId, permission) === null) return false;
        const allows = this.agentCeilingAllows(this.actors.get(actorId), permission);
        return allows.plan && allows.policy;
      }
      requirePermission(actorId, permission) {
        if (!this.hasPermission(actorId, permission)) {
          throw new PermissionDeniedError(permission, actorId);
        }
      }
      requireGovernanceAdmin(byActorId) {
        if (byActorId === this.systemActorId) return;
        if (this.governanceRoles.get(byActorId) === 'admin') return;
        throw new PermissionDeniedError('governance.admin', byActorId);
      }
      /** Grant-time plan ceiling: refuse issuing agent gate permissions the plan forbids. */
      checkGrantCeiling(actorId, permission) {
        const actor = this.actors.get(actorId);
        if (!actor || actor.type !== 'agent') return;
        const ceiling = PLAN_CEILINGS[this.plan];
        if (AGENT_GATE_APPROVE_PERMISSIONS.includes(permission) && !ceiling.agentGateApprove) {
          throw new GuardFailedError(`plan ${this.plan} does not allow agents to hold ${permission}`);
        }
        if (permission === 'gate.review.reject' && !ceiling.agentGateReject) {
          throw new GuardFailedError(`plan ${this.plan} does not allow agents to hold ${permission}`);
        }
      }
      liveClaim(workItemId2) {
        for (const claimId of this.claimsByItem.get(workItemId2) ?? []) {
          const claim = this.claims.get(claimId);
          if (claim && !claim.released && claim.leaseExpiresAt > this.now) return claim;
        }
        return null;
      }
      /**
       * A PRESENTED token is always validated, on every command (conformance pin,
       * claims.test.ts): stale/foreign/no-live-claim → ConflictError + audit event.
       */
      validatePresentedToken(item, fencingToken2, actorId) {
        if (fencingToken2 === void 0) return;
        const live = this.liveClaim(item.id);
        if (live === null || live.fencingToken !== fencingToken2) {
          this.append('work_item', item.id, 'fencing.rejected', actorId, {
            presentedToken: fencingToken2,
            liveToken: live?.fencingToken ?? null,
          });
          throw new ConflictError(`stale or foreign fencing token for work item ${item.id}`);
        }
      }
      copyItem(item) {
        const { dependsOn: _dependsOn, ...pub } = item;
        return { ...pub, pinnedVerification: item.pinnedVerification ? [...item.pinnedVerification] : null };
      }
      copyFeature(feature) {
        return { ...feature };
      }
      copyClaim(claim) {
        const { ttlMs: _ttl, ...pub } = claim;
        return { ...pub };
      }
      // -- setup -----------------------------------------------------------------
      createActor(input) {
        const actor = { id: this.nextId('actor'), type: input.type, displayName: input.displayName };
        this.actors.set(actor.id, actor);
        this.governanceRoles.set(actor.id, input.governanceRole ?? 'member');
        return { ...actor };
      }
      grant(input) {
        this.checkGrantCeiling(input.actorId, input.permission);
        const set = this.grants.get(input.actorId) ?? /* @__PURE__ */ new Set();
        set.add(input.permission);
        this.grants.set(input.actorId, set);
        this.append('actor', input.actorId, 'grant.issued', this.systemActorId, { permission: input.permission });
      }
      revoke(input) {
        this.grants.get(input.actorId)?.delete(input.permission);
        this.append('actor', input.actorId, 'grant.revoked', this.systemActorId, { permission: input.permission });
      }
      // -- entitlements (Phase 2, roadmap §3) ----------------------------------------
      setGovernanceRole(input) {
        this.requireGovernanceAdmin(input.byActorId);
        if (!this.actors.has(input.actorId)) throw new GuardFailedError(`unknown actor: ${input.actorId}`);
        this.governanceRoles.set(input.actorId, input.role);
        this.append('actor', input.actorId, 'governance.changed', input.byActorId, { role: input.role });
      }
      getGovernanceRole(actorId) {
        return this.governanceRoles.get(actorId) ?? 'member';
      }
      assignRole(input) {
        this.requireGovernanceAdmin(input.byActorId);
        const bundle = DELIVERY_ROLES[input.roleCode];
        if (bundle === void 0) throw new GuardFailedError(`unknown delivery role: ${input.roleCode}`);
        if (!this.actors.has(input.actorId)) throw new GuardFailedError(`unknown actor: ${input.actorId}`);
        for (const permission of bundle) {
          this.checkGrantCeiling(input.actorId, permission);
        }
        const active = this.roleAssignments.some((a) => a.actorId === input.actorId && a.roleCode === input.roleCode && !a.revoked);
        if (active) return;
        this.roleAssignments.push({
          actorId: input.actorId,
          roleCode: input.roleCode,
          grantedBy: input.byActorId,
          revoked: false,
        });
        this.append('actor', input.actorId, 'role.assigned', input.byActorId, { roleCode: input.roleCode });
      }
      revokeRole(input) {
        this.requireGovernanceAdmin(input.byActorId);
        if (DELIVERY_ROLES[input.roleCode] === void 0) {
          throw new GuardFailedError(`unknown delivery role: ${input.roleCode}`);
        }
        for (const assignment of this.roleAssignments) {
          if (assignment.actorId === input.actorId && assignment.roleCode === input.roleCode && !assignment.revoked) {
            assignment.revoked = true;
          }
        }
        this.append('actor', input.actorId, 'role.revoked', input.byActorId, { roleCode: input.roleCode });
      }
      listRoleAssignments(actorId) {
        return this.roleAssignments.filter((a) => actorId === void 0 || a.actorId === actorId).map((a) => ({ ...a }));
      }
      setPlan(input) {
        this.requireGovernanceAdmin(input.byActorId);
        if (PLAN_CEILINGS[input.plan] === void 0) throw new GuardFailedError(`unknown plan: ${input.plan}`);
        this.plan = input.plan;
        this.planVersion += 1;
        this.append('workspace', 'workspace', 'plan.changed', input.byActorId, {
          plan: input.plan,
          planVersion: this.planVersion,
        });
      }
      getPlan() {
        return this.plan;
      }
      setWorkspacePolicy(input) {
        this.requireGovernanceAdmin(input.byActorId);
        this.workspacePolicy = { ...this.workspacePolicy, ...input.policy };
        this.policyVersion += 1;
        this.append('workspace', 'workspace', 'policy.changed', input.byActorId, {
          policy: { ...this.workspacePolicy },
          policyVersion: this.policyVersion,
        });
      }
      getWorkspacePolicy() {
        return { ...this.workspacePolicy };
      }
      setGatePolicy(input) {
        this.requireGovernanceAdmin(input.byActorId);
        const minApprovals = input.policy.minApprovals ?? 1;
        if (!Number.isInteger(minApprovals) || minApprovals < 1) {
          throw new GuardFailedError('minApprovals must be a positive integer');
        }
        this.gatePolicies.set(input.gate, { ...input.policy });
        this.append('workspace', 'workspace', 'gate_policy.changed', input.byActorId, {
          gate: input.gate,
          policy: { ...input.policy },
        });
      }
      getGatePolicy(gate) {
        return { ...(this.gatePolicies.get(gate) ?? {}) };
      }
      authzExplain(input) {
        const source = this.grantSource(input.actorId, input.permission);
        const allows = this.agentCeilingAllows(this.actors.get(input.actorId), input.permission);
        return {
          actorId: input.actorId,
          permission: input.permission,
          allowed: source !== null && allows.plan && allows.policy,
          source,
          governanceRole: this.getGovernanceRole(input.actorId),
          plan: this.plan,
          planAllows: allows.plan,
          policyAllows: allows.policy,
          versions: { plan: this.planVersion, policy: this.policyVersion },
        };
      }
      createFeature(input) {
        const feature = { id: this.nextId('feat'), state: 'backlog', dispatchHold: false };
        this.features.set(feature.id, feature);
        this.append('feature', feature.id, 'feature.created', input.actorId, {});
        return this.copyFeature(feature);
      }
      createWorkItem(input) {
        const slug = input.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '');
        const item = {
          id: this.nextId('wi'),
          featureId: input.featureId,
          externalKey: input.externalKey,
          title: input.title,
          state: 'backlog',
          blockedReason: null,
          reviewLoopIteration: 0,
          intentHash: null,
          pinnedVerification: null,
          specCheckpoint: input.specCheckpoint ?? false,
          doneCheckpoint: input.doneCheckpoint ?? false,
          invokeDevWith: input.invokeDevWith ?? '',
          specPath: `stories/${input.externalKey}-${slug}.md`,
          stateVersion: 0,
          dependsOn: input.dependsOn ? [...input.dependsOn] : [],
        };
        this.workItems.set(item.id, item);
        if (!this.externalKeyIndex.has(item.externalKey)) {
          this.externalKeyIndex.set(item.externalKey, item.id);
        }
        this.append('work_item', item.id, 'work_item.created', input.actorId, {
          externalKey: item.externalKey,
          featureId: item.featureId,
        });
        return this.copyItem(item);
      }
      importStories(input) {
        const entries = parseStories(input.yaml);
        if (!this.features.has(input.featureId)) {
          throw new StoriesValidationError(`unknown feature: ${input.featureId}`);
        }
        const imported = [];
        const updated = [];
        const warnings = [];
        for (const entry of entries) {
          const existing = [...this.workItems.values()].find((wi) => wi.featureId === input.featureId && wi.externalKey === entry.id);
          if (existing) {
            existing.title = entry.title;
            existing.specCheckpoint = entry.specCheckpoint;
            existing.doneCheckpoint = entry.doneCheckpoint;
            existing.invokeDevWith = entry.invokeDevWith;
            this.append('work_item', existing.id, 'work_item.reimported', input.actorId, { externalKey: entry.id });
            updated.push(entry.id);
          } else {
            this.createWorkItem({
              featureId: input.featureId,
              externalKey: entry.id,
              title: entry.title,
              specCheckpoint: entry.specCheckpoint,
              doneCheckpoint: entry.doneCheckpoint,
              invokeDevWith: entry.invokeDevWith,
              actorId: input.actorId,
            });
            imported.push(entry.id);
          }
        }
        return { imported, updated, warnings };
      }
      // -- claims (roadmap §1.3) ---------------------------------------------------
      claimTask(input) {
        const item = this.mustGetItem(input.workItemId);
        this.requirePermission(input.actorId, 'task.claim');
        if (this.liveClaim(item.id) !== null) {
          throw new ConflictError(`work item ${item.id} already has a live claim`);
        }
        const ttlMs = input.ttlMs ?? 15 * 60 * 1e3;
        const token = (this.fencingCounter.get(item.id) ?? 0) + 1;
        this.fencingCounter.set(item.id, token);
        const claim = {
          id: this.nextId('claim'),
          workItemId: item.id,
          actorId: input.actorId,
          fencingToken: token,
          leaseExpiresAt: this.now + ttlMs,
          released: false,
          ttlMs,
        };
        this.claims.set(claim.id, claim);
        this.claimsByItem.set(item.id, [...(this.claimsByItem.get(item.id) ?? []), claim.id]);
        this.append('work_item', item.id, 'work_item.claimed', input.actorId, { claimId: claim.id, fencingToken: token });
        return this.copyClaim(claim);
      }
      heartbeat(input) {
        const claim = this.claims.get(input.claimId);
        if (!claim || claim.released || claim.leaseExpiresAt <= this.now) {
          throw new ConflictError(`claim ${input.claimId} is not live`);
        }
        claim.leaseExpiresAt = this.now + claim.ttlMs;
      }
      releaseClaim(input) {
        const claim = this.claims.get(input.claimId);
        if (!claim || claim.released) return;
        claim.released = true;
        this.append('work_item', claim.workItemId, 'claim.released', claim.actorId, {
          claimId: claim.id,
          reason: input.reason ?? null,
        });
      }
      advanceClock(ms) {
        this.now += ms;
      }
      // -- lifecycle (roadmap §1.2) --------------------------------------------------
      advanceState(input) {
        const item = this.mustGetItem(input.workItemId);
        if (input.idempotencyKey !== void 0) {
          const cached = this.idempotencyCache.get(input.idempotencyKey);
          if (cached) return { ...cached };
        }
        if (input.idempotencyKey === void 0 && input.to === item.state) {
          this.validatePresentedToken(item, input.fencingToken, input.actorId);
          return this.copyItem(item);
        }
        const rule = TRANSITIONS.find((t) => t.from === item.state && t.to === input.to);
        if (!rule) {
          if (RANK[input.to] < RANK[item.state] && this.hasPermission(input.actorId, 'state.downgrade')) {
            return this.privilegedDowngrade(item, input);
          }
          throw new InvalidTransitionError(item.state, input.to);
        }
        this.validatePresentedToken(item, input.fencingToken, input.actorId);
        if (item.blockedReason !== null) {
          throw new GuardFailedError(`work item is blocked: ${item.blockedReason}`);
        }
        this.requirePermission(input.actorId, rule.permission);
        if (rule.claimRequired) {
          if (input.fencingToken === void 0) {
            throw new GuardFailedError('claim fencing token required for this transition');
          }
        }
        for (const guard of rule.guards) {
          this.checkGuard(guard, item);
        }
        return this.executeTransition(item, input.to, input.actorId, input.idempotencyKey);
      }
      checkGuard(guard, item) {
        switch (guard) {
          case 'deps_done': {
            for (const depKey of item.dependsOn) {
              const dep = [...this.workItems.values()].find((wi) => wi.featureId === item.featureId && wi.externalKey === depKey);
              if (dep && dep.state !== 'done') {
                throw new GuardFailedError(`dependency ${depKey} is not done`);
              }
            }
            return;
          }
          case 'spec_gate_if_checkpoint': {
            if (!item.specCheckpoint) return;
            const approved = this.gateDecisions.some(
              (d) => d.workItemId === item.id && d.gate === 'spec_approval' && d.decision === 'approved',
            );
            if (!approved) {
              throw new GuardFailedError('spec_checkpoint requires an approved spec_approval gate decision');
            }
            return;
          }
          case 'nonempty_diff': {
            const diffs = this.evidenceRows.filter((row) => row.workItemId === item.id && row.evidence.kind === 'git_diff');
            const latest = diffs[diffs.length - 1];
            if (latest && latest.evidence.payload['nonEmpty'] !== true) {
              throw new GuardFailedError('the latest git_diff evidence is empty \u2014 nothing to review');
            }
            return;
          }
        }
      }
      privilegedDowngrade(item, input) {
        this.validatePresentedToken(item, input.fencingToken, input.actorId);
        if (item.blockedReason !== null) {
          throw new GuardFailedError(`work item is blocked: ${item.blockedReason}`);
        }
        const from = item.state;
        item.state = input.to;
        item.stateVersion += 1;
        this.append(
          'work_item',
          item.id,
          'work_item.state_downgraded',
          input.actorId,
          { from, to: input.to, compensating: true },
          input.idempotencyKey !== void 0 ? { idempotencyKey: input.idempotencyKey } : void 0,
        );
        const result = this.copyItem(item);
        if (input.idempotencyKey !== void 0) this.idempotencyCache.set(input.idempotencyKey, { ...result });
        return result;
      }
      /** Shared by advanceState and the gate-fired transitions. */
      executeTransition(item, to, actorId, idempotencyKey, causationId) {
        const from = item.state;
        item.state = to;
        item.stateVersion += 1;
        const event = this.append(
          'work_item',
          item.id,
          'work_item.state_changed',
          actorId,
          { from, to },
          {
            ...(causationId !== void 0 ? { causationId } : {}),
            ...(idempotencyKey !== void 0 ? { idempotencyKey } : {}),
          },
        );
        if (from === 'backlog' && to !== 'backlog') {
          const feature = this.features.get(item.featureId);
          if (feature && feature.state === 'backlog') {
            feature.state = 'in_progress';
            this.append(
              'feature',
              feature.id,
              'feature.state_changed',
              this.systemActorId,
              {
                from: 'backlog',
                to: 'in_progress',
              },
              { causationId: String(event.globalSeq) },
            );
          }
        }
        if (to === 'done' && item.doneCheckpoint) {
          const feature = this.features.get(item.featureId);
          if (feature && !feature.dispatchHold) {
            feature.dispatchHold = true;
            this.append(
              'feature',
              feature.id,
              'feature.dispatch_hold_raised',
              this.systemActorId,
              {
                workItemId: item.id,
              },
              { causationId: String(event.globalSeq) },
            );
          }
        }
        const result = this.copyItem(item);
        if (idempotencyKey !== void 0) this.idempotencyCache.set(idempotencyKey, { ...result });
        return result;
      }
      blockTask(input) {
        const item = this.mustGetItem(input.workItemId);
        if (!BLOCKED_REASONS.includes(input.reason)) {
          throw new GuardFailedError(`unknown blocking condition: ${input.reason}`);
        }
        this.validatePresentedToken(item, input.fencingToken, input.actorId);
        this.requirePermission(input.actorId, 'task.block');
        item.blockedReason = input.reason;
        item.stateVersion += 1;
        this.append('work_item', item.id, 'work_item.blocked', input.actorId, { reason: input.reason });
        return this.copyItem(item);
      }
      unblockTask(input) {
        const item = this.mustGetItem(input.workItemId);
        if (item.blockedReason === 'review_non_convergence') {
          this.requirePermission(input.actorId, 'gate.review.approve');
        } else {
          this.requirePermission(input.actorId, 'task.block');
        }
        item.blockedReason = null;
        item.stateVersion += 1;
        this.append('work_item', item.id, 'work_item.unblocked', input.actorId, {});
        return this.copyItem(item);
      }
      // -- gates & evidence (roadmap §1.4) ------------------------------------------
      submitEvidence(input) {
        const item = this.mustGetItem(input.workItemId);
        this.validatePresentedToken(item, input.fencingToken, input.actorId);
        this.evidenceRows.push({ workItemId: item.id, evidence: input.evidence, seq: this.evidenceRows.length + 1 });
        this.append('work_item', item.id, 'evidence.submitted', input.actorId, {
          kind: input.evidence.kind,
        });
      }
      approveGate(input) {
        const item = this.mustGetItem(input.workItemId);
        if (input.gate === 'spec_approval') {
          this.requirePermission(input.actorId, 'gate.spec.approve');
          if (item.blockedReason !== null) {
            throw new GuardFailedError(`work item is blocked: ${item.blockedReason}`);
          }
          if (item.state !== 'draft') {
            throw new GuardFailedError(`spec_approval applies to draft items, not ${item.state}`);
          }
          if (input.pinnedVerification !== void 0) {
            item.pinnedVerification = [...input.pinnedVerification];
          }
          if (!this.quorumWouldBeMet(item, 'spec_approval', input.actorId)) {
            this.recordApproval(item, 'spec_approval', input.actorId);
            return this.copyItem(item);
          }
          this.recordApproval(item, 'spec_approval', input.actorId);
          return this.executeTransition(item, 'ready_for_dev', input.actorId);
        }
        this.requirePermission(input.actorId, 'gate.review.approve');
        if (item.blockedReason !== null) {
          throw new GuardFailedError(`work item is blocked: ${item.blockedReason}`);
        }
        if (item.state !== 'in_review') {
          throw new GuardFailedError(`review_approval applies to in_review items, not ${item.state}`);
        }
        if (!this.quorumWouldBeMet(item, 'review_approval', input.actorId)) {
          this.recordApproval(item, 'review_approval', input.actorId);
          return this.copyItem(item);
        }
        this.checkReviewEvidence(item);
        this.recordApproval(item, 'review_approval', input.actorId);
        return this.executeTransition(item, 'done', input.actorId);
      }
      /** Distinct approvers of this round (round = reviewLoopIteration at decision time). */
      roundApprovers(item, gate) {
        const ids = new Set(
          this.gateDecisions
            .filter((d) => d.workItemId === item.id && d.gate === gate && d.decision === 'approved' && d.round === item.reviewLoopIteration)
            .map((d) => d.actorId),
        );
        return [...ids].flatMap((id) => {
          const actor = this.actors.get(id);
          return actor ? [actor] : [];
        });
      }
      /** Gate policy quorum (roadmap §3): min distinct approvers + required actor types, as DATA. */
      quorumWouldBeMet(item, gate, nextApproverId) {
        const policy = this.gatePolicies.get(gate) ?? {};
        const min = policy.minApprovals ?? 1;
        const required = policy.requiredActorTypes ?? [];
        const approvers = this.roundApprovers(item, gate);
        const nextActor = this.actors.get(nextApproverId);
        if (nextActor && !approvers.some((a) => a.id === nextActor.id)) approvers.push(nextActor);
        if (approvers.length < min) return false;
        for (const type of required) {
          if (!approvers.some((a) => a.type === type)) return false;
        }
        return true;
      }
      recordApproval(item, gate, actorId) {
        this.gateDecisions.push({
          workItemId: item.id,
          gate,
          decision: 'approved',
          actorId,
          round: item.reviewLoopIteration,
        });
        this.append('work_item', item.id, 'gate.approved', actorId, {
          gate,
          round: item.reviewLoopIteration,
          ...(gate === 'spec_approval' ? { pinnedVerification: item.pinnedVerification } : {}),
        });
      }
      /**
       * Evidence condition of the done gate (§1.4, D7): every PINNED command's
       * latest test_run exited 0 (an unpinned command satisfies nothing), and the
       * final commit is reachable on the remote. review_report is never consulted.
       * With nothing pinned, the gate decision by the permitted actor IS the human
       * decision — evidence alone never completes the item either way.
       */
      checkReviewEvidence(item) {
        const rows = this.evidenceRows.filter((row) => row.workItemId === item.id);
        for (const command of item.pinnedVerification ?? []) {
          const runs = rows.filter((row) => row.evidence.kind === 'test_run' && row.evidence.payload['command'] === command);
          const latest = runs[runs.length - 1];
          if (!latest || latest.evidence.payload['exitCode'] !== 0) {
            throw new GuardFailedError(`pinned verification did not pass: ${command}`);
          }
        }
        const commitOk = rows.some((row) => row.evidence.kind === 'commit' && row.evidence.payload['reachableOnRemote'] === true);
        if (!commitOk) {
          throw new GuardFailedError('final revision must be reachable on the remote (push is part of the HALT contract)');
        }
      }
      rejectGate(input) {
        const item = this.mustGetItem(input.workItemId);
        if (input.gate !== 'review_approval') {
          throw new GuardFailedError('only review_approval rejection is defined in Phase 1');
        }
        if (!this.hasPermission(input.actorId, 'gate.review.approve') && !this.hasPermission(input.actorId, 'gate.review.reject')) {
          throw new PermissionDeniedError('gate.review.reject', input.actorId);
        }
        if (item.state !== 'in_review') {
          throw new GuardFailedError(`review rejection applies to in_review items, not ${item.state}`);
        }
        this.gateDecisions.push({
          workItemId: item.id,
          gate: 'review_approval',
          decision: 'rejected',
          actorId: input.actorId,
          round: item.reviewLoopIteration,
        });
        const decisionEvent = this.append('work_item', item.id, 'gate.rejected', input.actorId, {
          gate: 'review_approval',
        });
        if (item.reviewLoopIteration >= REVIEW_LOOP_LIMIT) {
          item.blockedReason = 'review_non_convergence';
          item.stateVersion += 1;
          this.append(
            'work_item',
            item.id,
            'work_item.blocked',
            this.systemActorId,
            { reason: 'review_non_convergence' },
            { causationId: String(decisionEvent.globalSeq) },
          );
          return this.copyItem(item);
        }
        item.reviewLoopIteration += 1;
        return this.executeTransition(item, 'in_progress', this.systemActorId, void 0, String(decisionEvent.globalSeq));
      }
      // -- dispatch (roadmap §2.3) -----------------------------------------------
      getTaskContext(input) {
        const item = this.mustGetItem(input.workItemId);
        if (item.state === 'done') {
          throw new GuardFailedError('done items are never re-dispatched; follow-up review is a new work item');
        }
        const feature = this.features.get(item.featureId);
        if (feature?.dispatchHold) {
          throw new GuardFailedError('feature is under a done_checkpoint dispatch hold');
        }
        return { workItem: this.copyItem(item), entryState: item.state };
      }
      releaseDispatchHold(input) {
        this.requirePermission(input.actorId, 'dispatch.release_hold');
        const feature = this.features.get(input.featureId);
        if (!feature) throw new GuardFailedError(`unknown feature: ${input.featureId}`);
        feature.dispatchHold = false;
        this.append('feature', feature.id, 'feature.dispatch_hold_released', input.actorId, {});
        return this.copyFeature(feature);
      }
      // -- reconciliation (roadmap §1.6, D6: detect-only, never mutates) ------------
      reconcile(input) {
        const reports = [];
        for (const file of input.files) {
          const item = this.mustGetItem(file.workItemId);
          if (this.liveClaim(item.id) !== null) continue;
          const raw = file.frontmatterStatus.trim();
          if (raw === 'blocked') {
            if (item.blockedReason !== null) continue;
            reports.push({
              workItemId: item.id,
              fileState: raw,
              dbState: item.state,
              kind: 'conflict',
            });
            continue;
          }
          const normalized = LEGACY_STATUS[raw];
          if (normalized === void 0) {
            reports.push({ workItemId: item.id, fileState: raw, dbState: item.state, kind: 'conflict' });
            continue;
          }
          if (normalized === item.state) continue;
          reports.push({
            workItemId: item.id,
            fileState: raw,
            dbState: item.state,
            kind: RANK[normalized] > RANK[item.state] ? 'file_ahead' : 'db_ahead',
          });
        }
        return reports;
      }
      // -- queries ---------------------------------------------------------------
      getWorkItem(id) {
        return this.copyItem(this.mustGetItem(id));
      }
      getFeature(id) {
        const feature = this.features.get(id);
        if (!feature) throw new GuardFailedError(`unknown feature: ${id}`);
        return this.copyFeature(feature);
      }
      listWorkItems(filter) {
        return [...this.workItems.values()]
          .filter((item) => {
            if (filter?.state !== void 0 && item.state !== filter.state) return false;
            if (filter?.featureId !== void 0 && item.featureId !== filter.featureId) return false;
            if (filter?.claimable === true && this.liveClaim(item.id) !== null) return false;
            return true;
          })
          .map((item) => this.copyItem(item));
      }
      getClaims(workItemId2) {
        const item = this.mustGetItem(workItemId2);
        return (this.claimsByItem.get(item.id) ?? []).flatMap((claimId) => {
          const claim = this.claims.get(claimId);
          return claim ? [this.copyClaim(claim)] : [];
        });
      }
      events(streamId) {
        const source = streamId === void 0 ? this.eventLog : this.eventLog.filter((e) => e.streamId === streamId);
        return source.map((event) => ({ ...event, payload: { ...event.payload } }));
      }
    };
  },
});

// ../../packages/core/src/intent-hash.ts
var init_intent_hash = __esm({
  '../../packages/core/src/intent-hash.ts'() {
    'use strict';
    init_types();
  },
});

// ../../packages/core/src/index.ts
var init_src = __esm({
  '../../packages/core/src/index.ts'() {
    'use strict';
    init_engine();
    init_types();
    init_intent_hash();
    init_stories();
  },
});

// ../../packages/db/src/schema.ts
var schema_exports = {};
__export(schema_exports, {
  actors: () => actors,
  claims: () => claims,
  events: () => events,
  evidence: () => evidence,
  features: () => features,
  gateDecisions: () => gateDecisions,
  gatePolicies: () => gatePolicies,
  grants: () => grants,
  idempotencyKeys: () => idempotencyKeys,
  roleAssignments: () => roleAssignments,
  workItems: () => workItems,
  workspaceState: () => workspaceState,
});
import { sql } from 'drizzle-orm';
import { bigint, boolean, integer, jsonb, pgTable, primaryKey, serial, text, uniqueIndex } from 'drizzle-orm/pg-core';
var actors,
  grants,
  roleAssignments,
  workspaceState,
  gatePolicies,
  features,
  workItems,
  claims,
  gateDecisions,
  evidence,
  events,
  idempotencyKeys;
var init_schema = __esm({
  '../../packages/db/src/schema.ts'() {
    'use strict';
    actors = pgTable('actors', {
      id: text('id').primaryKey(),
      type: text('type').notNull(),
      // 'user' | 'agent' | 'system'
      displayName: text('display_name').notNull(),
      /** Phase 2 (roadmap §3): 'admin' | 'member' | 'auditor' — gated-write authority */
      governanceRole: text('governance_role').notNull().default('member'),
    });
    grants = pgTable(
      'grants',
      {
        actorId: text('actor_id').notNull(),
        permission: text('permission').notNull(),
        scope: text('scope'),
      },
      (t) => [primaryKey({ columns: [t.actorId, t.permission] })],
    );
    roleAssignments = pgTable('role_assignments', {
      seq: serial('seq').primaryKey(),
      actorId: text('actor_id').notNull(),
      roleCode: text('role_code').notNull(),
      grantedBy: text('granted_by').notNull(),
      revoked: boolean('revoked').notNull().default(false),
    });
    workspaceState = pgTable('workspace_state', {
      id: text('id').primaryKey(),
      // always 'workspace'
      plan: text('plan').notNull(),
      // 'free' | 'team' | 'enterprise'
      planVersion: integer('plan_version').notNull().default(1),
      policy: jsonb('policy')
        .$type()
        .notNull()
        .default(sql`'{}'::jsonb`),
      policyVersion: integer('policy_version').notNull().default(1),
    });
    gatePolicies = pgTable('gate_policies', {
      gate: text('gate').primaryKey(),
      // 'spec_approval' | 'review_approval'
      policy: jsonb('policy').$type().notNull(),
    });
    features = pgTable('features', {
      id: text('id').primaryKey(),
      seq: serial('seq').notNull(),
      state: text('state').notNull(),
      // 'backlog' | 'in_progress' | 'done'
      dispatchHold: boolean('dispatch_hold').notNull().default(false),
    });
    workItems = pgTable('work_items', {
      id: text('id').primaryKey(),
      /** creation order — backs first-writer-wins externalKey resolution */
      seq: serial('seq').notNull(),
      featureId: text('feature_id').notNull(),
      externalKey: text('external_key').notNull(),
      title: text('title').notNull(),
      state: text('state').notNull(),
      blockedReason: text('blocked_reason'),
      // overlay, not a state (D8)
      reviewLoopIteration: integer('review_loop_iteration').notNull().default(0),
      intentHash: text('intent_hash'),
      pinnedVerification: jsonb('pinned_verification').$type(),
      // Rules-layer data (D7)
      specCheckpoint: boolean('spec_checkpoint').notNull().default(false),
      doneCheckpoint: boolean('done_checkpoint').notNull().default(false),
      invokeDevWith: text('invoke_dev_with').notNull().default(''),
      specPath: text('spec_path').notNull(),
      /** optimistic concurrency: CAS by UPDATE ... WHERE state_version = expected */
      stateVersion: integer('state_version').notNull().default(0),
      /** dependency externalKeys within the same feature */
      dependsOn: jsonb('depends_on')
        .$type()
        .notNull()
        .default(sql`'[]'::jsonb`),
      /** monotonic fencing counter per work item (roadmap §1.3) */
      lastFencingToken: integer('last_fencing_token').notNull().default(0),
    });
    claims = pgTable(
      'claims',
      {
        id: text('id').primaryKey(),
        seq: serial('seq').notNull(),
        workItemId: text('work_item_id').notNull(),
        actorId: text('actor_id').notNull(),
        fencingToken: integer('fencing_token').notNull(),
        /** engine-clock milliseconds (JS field `now`), never SQL now() */
        leaseExpiresAt: bigint('lease_expires_at', { mode: 'number' }).notNull(),
        released: boolean('released').notNull().default(false),
        ttlMs: bigint('ttl_ms', { mode: 'number' }).notNull(),
      },
      (t) => [
        // roadmap §1.3: "One live claim per work item, enforced by a partial
        // unique index — races lose by constraint, not by application logic."
        uniqueIndex('claims_one_live_per_item')
          .on(t.workItemId)
          .where(sql`released = false`),
      ],
    );
    gateDecisions = pgTable('gate_decisions', {
      seq: serial('seq').primaryKey(),
      workItemId: text('work_item_id').notNull(),
      gate: text('gate').notNull(),
      // 'spec_approval' | 'review_approval'
      decision: text('decision').notNull(),
      // 'approved' | 'rejected'
      actorId: text('actor_id').notNull(),
      /** review round the decision belongs to (= review_loop_iteration at decision time) */
      round: integer('round').notNull().default(0),
    });
    evidence = pgTable('evidence', {
      seq: serial('seq').primaryKey(),
      workItemId: text('work_item_id').notNull(),
      kind: text('kind').notNull(),
      payload: jsonb('payload').$type().notNull(),
    });
    events = pgTable(
      'events',
      {
        globalSeq: serial('global_seq').primaryKey(),
        streamType: text('stream_type').notNull(),
        // 'workspace'|'feature'|'work_item'|'actor'
        streamId: text('stream_id').notNull(),
        streamSeq: integer('stream_seq').notNull(),
        type: text('type').notNull(),
        actorId: text('actor_id').notNull(),
        payload: jsonb('payload').$type().notNull(),
        causationId: text('causation_id'),
        idempotencyKey: text('idempotency_key'),
      },
      (t) => [
        // §1.5: "UNIQUE(stream_id, stream_seq) doubles as the optimistic lock."
        uniqueIndex('events_stream_id_stream_seq').on(t.streamId, t.streamSeq),
      ],
    );
    idempotencyKeys = pgTable('idempotency_keys', {
      key: text('key').primaryKey(),
      result: jsonb('result').$type().notNull(),
    });
  },
});

// ../../packages/db/src/pg-engine.ts
import { and, asc, eq, gt, lte, sql as sql2 } from 'drizzle-orm';
function isUniqueViolation(error) {
  let current = error;
  for (let depth = 0; depth < 5 && current !== null && typeof current === 'object'; depth += 1) {
    const err = current;
    if (err.code === '23505') return true;
    if (typeof err.message === 'string' && /duplicate key value violates unique/i.test(err.message)) {
      return true;
    }
    current = err.cause;
  }
  return false;
}
var WORKSPACE_ID, RANK2, TRANSITIONS2, LEGACY_STATUS2, PgEngine;
var init_pg_engine = __esm({
  '../../packages/db/src/pg-engine.ts'() {
    'use strict';
    init_src();
    init_schema();
    WORKSPACE_ID = 'workspace';
    RANK2 = Object.fromEntries(WORK_ITEM_STATES.map((s, i) => [s, i]));
    TRANSITIONS2 = [
      { from: 'backlog', to: 'draft', permission: 'task.plan', claimRequired: false, guards: [] },
      {
        from: 'draft',
        to: 'ready_for_dev',
        permission: 'task.plan',
        claimRequired: false,
        guards: ['spec_gate_if_checkpoint'],
      },
      {
        from: 'ready_for_dev',
        to: 'in_progress',
        permission: 'task.advance',
        claimRequired: true,
        guards: ['deps_done'],
      },
      {
        from: 'in_progress',
        to: 'in_review',
        permission: 'task.advance',
        claimRequired: true,
        guards: ['nonempty_diff'],
      },
    ];
    LEGACY_STATUS2 = {
      backlog: 'backlog',
      draft: 'draft',
      'ready-for-dev': 'ready_for_dev',
      ready_for_dev: 'ready_for_dev',
      'in-progress': 'in_progress',
      in_progress: 'in_progress',
      'in-review': 'in_review',
      in_review: 'in_review',
      review: 'in_review',
      done: 'done',
    };
    PgEngine = class {
      constructor(db) {
        this.db = db;
      }
      /** Engine clock in ms — the ONLY time source for lease logic. */
      now = 0;
      seq = 0;
      systemActorId = '';
      /**
       * Post-reset setup: the per-workspace system actor (roadmap §1.2).
       *
       * Idempotent for persistent databases (story 13, `oahs serve --data`): a
       * restart over an existing PGlite data directory finds the system actor
       * already present, reuses it, and recovers the id counter from the stored
       * ids so freshly-created entities never collide with persisted ones. A
       * fresh (or truncated) database takes the original path unchanged, so the
       * conformance suite semantics are untouched.
       */
      async init() {
        await this.db
          .insert(workspaceState)
          .values({ id: WORKSPACE_ID, plan: DEFAULT_PLAN, planVersion: 1, policy: {}, policyVersion: 1 })
          .onConflictDoNothing();
        const existing = await this.db.select({ id: actors.id }).from(actors).where(eq(actors.type, 'system')).limit(1);
        const found = existing[0];
        if (found !== void 0) {
          this.systemActorId = found.id;
          this.seq = await this.recoverSeq();
          return;
        }
        this.systemActorId = this.nextId('actor-system');
        await this.db.insert(actors).values({
          id: this.systemActorId,
          type: 'system',
          displayName: 'system',
        });
      }
      /**
       * Largest nextId() suffix stored in any text-id table — restart-safe id
       * generation for persistent data directories. Ids are `${prefix}_${base36}`.
       */
      async recoverSeq() {
        const ids = [];
        ids.push(...(await this.db.select({ id: actors.id }).from(actors)).map((r) => r.id));
        ids.push(...(await this.db.select({ id: features.id }).from(features)).map((r) => r.id));
        ids.push(...(await this.db.select({ id: workItems.id }).from(workItems)).map((r) => r.id));
        ids.push(...(await this.db.select({ id: claims.id }).from(claims)).map((r) => r.id));
        let max = 0;
        for (const id of ids) {
          const sep = id.lastIndexOf('_');
          if (sep < 0) continue;
          const n = Number.parseInt(id.slice(sep + 1), 36);
          if (Number.isFinite(n) && n > max) max = n;
        }
        return max;
      }
      // -- infrastructure --------------------------------------------------------
      nextId(prefix) {
        this.seq += 1;
        return `${prefix}_${this.seq.toString(36).padStart(6, '0')}`;
      }
      async appendTx(tx, streamType, streamId, type, actorId, payload, extra) {
        const [row] = await tx
          .select({ maxSeq: sql2`coalesce(max(${events.streamSeq}), 0)` })
          .from(events)
          .where(eq(events.streamId, streamId));
        const streamSeq = Number(row?.maxSeq ?? 0) + 1;
        const inserted = await tx
          .insert(events)
          .values({
            streamType,
            streamId,
            streamSeq,
            type,
            actorId,
            payload,
            causationId: extra?.causationId ?? null,
            idempotencyKey: extra?.idempotencyKey ?? null,
          })
          .returning({ globalSeq: events.globalSeq });
        const globalSeq = inserted[0]?.globalSeq;
        if (globalSeq === void 0) throw new Error('event insert returned no global_seq');
        return {
          globalSeq,
          streamType,
          streamId,
          streamSeq,
          type,
          actorId,
          payload,
          ...(extra?.causationId !== void 0 ? { causationId: extra.causationId } : {}),
        };
      }
      async mustGetItem(workItemId2) {
        const byId = await this.db.select().from(workItems).where(eq(workItems.id, workItemId2)).limit(1);
        if (byId[0]) return byId[0];
        const byKey = await this.db
          .select()
          .from(workItems)
          .where(eq(workItems.externalKey, workItemId2))
          .orderBy(asc(workItems.seq))
          .limit(1);
        if (byKey[0]) return byKey[0];
        throw new GuardFailedError(`unknown work item: ${workItemId2}`);
      }
      async getFeatureRow(featureId, tx = this.db) {
        const rows = await tx.select().from(features).where(eq(features.id, featureId)).limit(1);
        return rows[0] ?? null;
      }
      async getActorRow(actorId) {
        const rows = await this.db.select().from(actors).where(eq(actors.id, actorId)).limit(1);
        return rows[0] ?? null;
      }
      async workspaceRow(tx = this.db) {
        const rows = await tx.select().from(workspaceState).where(eq(workspaceState.id, WORKSPACE_ID)).limit(1);
        const row = rows[0];
        if (row) return row;
        return { id: WORKSPACE_ID, plan: DEFAULT_PLAN, planVersion: 1, policy: {}, policyVersion: 1 };
      }
      /**
       * Entitlement resolution — a PURE function over plan × governance ×
       * delivery-role data (roadmap §3), mirroring the reference engine. A grant
       * may EXIST (direct or via a role) and still not RESOLVE for an agent when
       * the plan ceiling or the restrict-only workspace policy narrows it. Users
       * are never plan-filtered.
       */
      async grantSource(actorId, permission) {
        const direct = await this.db
          .select({ permission: grants.permission })
          .from(grants)
          .where(and(eq(grants.actorId, actorId), eq(grants.permission, permission)))
          .limit(1);
        if (direct.length > 0) return 'direct';
        const assignments = await this.db
          .select()
          .from(roleAssignments)
          .where(and(eq(roleAssignments.actorId, actorId), eq(roleAssignments.revoked, false)))
          .orderBy(asc(roleAssignments.seq));
        for (const assignment of assignments) {
          if ((DELIVERY_ROLES[assignment.roleCode] ?? []).includes(permission)) {
            return `role:${assignment.roleCode}`;
          }
        }
        return null;
      }
      agentCeilingAllows(actor, permission, workspace) {
        if (!actor || actor.type !== 'agent') return { plan: true, policy: true };
        const ceiling = PLAN_CEILINGS[workspace.plan];
        const policy = workspace.policy;
        if (AGENT_GATE_APPROVE_PERMISSIONS.includes(permission)) {
          return { plan: ceiling.agentGateApprove, policy: policy.agentGateApprovals !== false };
        }
        if (permission === 'gate.review.reject') {
          return { plan: ceiling.agentGateReject, policy: true };
        }
        if (permission === 'task.claim') {
          return { plan: true, policy: policy.agentSelfDispatch !== false };
        }
        return { plan: true, policy: true };
      }
      async hasPermission(actorId, permission) {
        if ((await this.grantSource(actorId, permission)) === null) return false;
        const allows = this.agentCeilingAllows(await this.getActorRow(actorId), permission, await this.workspaceRow());
        return allows.plan && allows.policy;
      }
      async requirePermission(actorId, permission) {
        if (!(await this.hasPermission(actorId, permission))) {
          throw new PermissionDeniedError(permission, actorId);
        }
      }
      async requireGovernanceAdmin(byActorId) {
        if (byActorId === this.systemActorId) return;
        const actor = await this.getActorRow(byActorId);
        if (actor?.governanceRole === 'admin') return;
        throw new PermissionDeniedError('governance.admin', byActorId);
      }
      /** Grant-time plan ceiling: refuse issuing agent gate permissions the plan forbids. */
      async checkGrantCeiling(actorId, permission) {
        const actor = await this.getActorRow(actorId);
        if (!actor || actor.type !== 'agent') return;
        const workspace = await this.workspaceRow();
        const ceiling = PLAN_CEILINGS[workspace.plan];
        if (AGENT_GATE_APPROVE_PERMISSIONS.includes(permission) && !ceiling.agentGateApprove) {
          throw new GuardFailedError(`plan ${workspace.plan} does not allow agents to hold ${permission}`);
        }
        if (permission === 'gate.review.reject' && !ceiling.agentGateReject) {
          throw new GuardFailedError(`plan ${workspace.plan} does not allow agents to hold ${permission}`);
        }
      }
      async liveClaim(workItemId2) {
        const rows = await this.db
          .select()
          .from(claims)
          .where(and(eq(claims.workItemId, workItemId2), eq(claims.released, false), gt(claims.leaseExpiresAt, this.now)))
          .orderBy(asc(claims.seq))
          .limit(1);
        return rows[0] ?? null;
      }
      /**
       * A PRESENTED token is always validated, on every command (conformance
       * pin, claims.test.ts): stale/foreign/no-live-claim → ConflictError + audit
       * event. The audit event commits in its OWN transaction — the failing
       * command's transaction (if any) must not swallow it.
       */
      async validatePresentedToken(item, fencingToken2, actorId) {
        if (fencingToken2 === void 0) return;
        const live = await this.liveClaim(item.id);
        if (live === null || live.fencingToken !== fencingToken2) {
          await this.db.transaction(async (tx) => {
            await this.appendTx(tx, 'work_item', item.id, 'fencing.rejected', actorId, {
              presentedToken: fencingToken2,
              liveToken: live?.fencingToken ?? null,
            });
          });
          throw new ConflictError(`stale or foreign fencing token for work item ${item.id}`);
        }
      }
      publicItem(row) {
        return {
          id: row.id,
          featureId: row.featureId,
          externalKey: row.externalKey,
          title: row.title,
          state: row.state,
          blockedReason: row.blockedReason ?? null,
          reviewLoopIteration: row.reviewLoopIteration,
          intentHash: row.intentHash,
          pinnedVerification: row.pinnedVerification ? [...row.pinnedVerification] : null,
          specCheckpoint: row.specCheckpoint,
          doneCheckpoint: row.doneCheckpoint,
          invokeDevWith: row.invokeDevWith,
          specPath: row.specPath,
          stateVersion: row.stateVersion,
        };
      }
      publicFeature(row) {
        return {
          id: row.id,
          state: row.state,
          dispatchHold: row.dispatchHold,
        };
      }
      publicClaim(row) {
        return {
          id: row.id,
          workItemId: row.workItemId,
          actorId: row.actorId,
          fencingToken: row.fencingToken,
          leaseExpiresAt: row.leaseExpiresAt,
          released: row.released,
        };
      }
      eventFromRow(row) {
        return {
          globalSeq: row.globalSeq,
          streamType: row.streamType,
          streamId: row.streamId,
          streamSeq: row.streamSeq,
          type: row.type,
          actorId: row.actorId,
          payload: row.payload,
          ...(row.causationId !== null ? { causationId: row.causationId } : {}),
        };
      }
      // -- setup -----------------------------------------------------------------
      async createActor(input) {
        const actor = { id: this.nextId('actor'), type: input.type, displayName: input.displayName };
        await this.db.insert(actors).values({
          id: actor.id,
          type: actor.type,
          displayName: actor.displayName,
          governanceRole: input.governanceRole ?? 'member',
        });
        return actor;
      }
      async grant(input) {
        await this.checkGrantCeiling(input.actorId, input.permission);
        await this.db.transaction(async (tx) => {
          await tx
            .insert(grants)
            .values({ actorId: input.actorId, permission: input.permission, scope: input.scope ?? null })
            .onConflictDoNothing();
          await this.appendTx(tx, 'actor', input.actorId, 'grant.issued', this.systemActorId, {
            permission: input.permission,
          });
        });
      }
      async revoke(input) {
        await this.db.transaction(async (tx) => {
          await tx.delete(grants).where(and(eq(grants.actorId, input.actorId), eq(grants.permission, input.permission)));
          await this.appendTx(tx, 'actor', input.actorId, 'grant.revoked', this.systemActorId, {
            permission: input.permission,
          });
        });
      }
      // -- entitlements (Phase 2, roadmap §3) ----------------------------------------
      async setGovernanceRole(input) {
        await this.requireGovernanceAdmin(input.byActorId);
        if ((await this.getActorRow(input.actorId)) === null) {
          throw new GuardFailedError(`unknown actor: ${input.actorId}`);
        }
        await this.db.transaction(async (tx) => {
          await tx.update(actors).set({ governanceRole: input.role }).where(eq(actors.id, input.actorId));
          await this.appendTx(tx, 'actor', input.actorId, 'governance.changed', input.byActorId, { role: input.role });
        });
      }
      async getGovernanceRole(actorId) {
        const actor = await this.getActorRow(actorId);
        return actor?.governanceRole ?? 'member';
      }
      async assignRole(input) {
        await this.requireGovernanceAdmin(input.byActorId);
        const bundle = DELIVERY_ROLES[input.roleCode];
        if (bundle === void 0) throw new GuardFailedError(`unknown delivery role: ${input.roleCode}`);
        if ((await this.getActorRow(input.actorId)) === null) {
          throw new GuardFailedError(`unknown actor: ${input.actorId}`);
        }
        for (const permission of bundle) {
          await this.checkGrantCeiling(input.actorId, permission);
        }
        const active = await this.db
          .select({ seq: roleAssignments.seq })
          .from(roleAssignments)
          .where(
            and(
              eq(roleAssignments.actorId, input.actorId),
              eq(roleAssignments.roleCode, input.roleCode),
              eq(roleAssignments.revoked, false),
            ),
          )
          .limit(1);
        if (active.length > 0) return;
        await this.db.transaction(async (tx) => {
          await tx.insert(roleAssignments).values({
            actorId: input.actorId,
            roleCode: input.roleCode,
            grantedBy: input.byActorId,
            revoked: false,
          });
          await this.appendTx(tx, 'actor', input.actorId, 'role.assigned', input.byActorId, {
            roleCode: input.roleCode,
          });
        });
      }
      async revokeRole(input) {
        await this.requireGovernanceAdmin(input.byActorId);
        if (DELIVERY_ROLES[input.roleCode] === void 0) {
          throw new GuardFailedError(`unknown delivery role: ${input.roleCode}`);
        }
        await this.db.transaction(async (tx) => {
          await tx
            .update(roleAssignments)
            .set({ revoked: true })
            .where(
              and(
                eq(roleAssignments.actorId, input.actorId),
                eq(roleAssignments.roleCode, input.roleCode),
                eq(roleAssignments.revoked, false),
              ),
            );
          await this.appendTx(tx, 'actor', input.actorId, 'role.revoked', input.byActorId, {
            roleCode: input.roleCode,
          });
        });
      }
      async listRoleAssignments(actorId) {
        const rows =
          actorId === void 0
            ? await this.db.select().from(roleAssignments).orderBy(asc(roleAssignments.seq))
            : await this.db.select().from(roleAssignments).where(eq(roleAssignments.actorId, actorId)).orderBy(asc(roleAssignments.seq));
        return rows.map((row) => ({
          actorId: row.actorId,
          roleCode: row.roleCode,
          grantedBy: row.grantedBy,
          revoked: row.revoked,
        }));
      }
      async setPlan(input) {
        await this.requireGovernanceAdmin(input.byActorId);
        if (PLAN_CEILINGS[input.plan] === void 0) throw new GuardFailedError(`unknown plan: ${input.plan}`);
        const workspace = await this.workspaceRow();
        const planVersion = workspace.planVersion + 1;
        await this.db.transaction(async (tx) => {
          await tx.update(workspaceState).set({ plan: input.plan, planVersion }).where(eq(workspaceState.id, WORKSPACE_ID));
          await this.appendTx(tx, 'workspace', WORKSPACE_ID, 'plan.changed', input.byActorId, {
            plan: input.plan,
            planVersion,
          });
        });
      }
      async getPlan() {
        return (await this.workspaceRow()).plan;
      }
      async setWorkspacePolicy(input) {
        await this.requireGovernanceAdmin(input.byActorId);
        const workspace = await this.workspaceRow();
        const merged = { ...workspace.policy, ...input.policy };
        const policyVersion = workspace.policyVersion + 1;
        await this.db.transaction(async (tx) => {
          await tx.update(workspaceState).set({ policy: merged, policyVersion }).where(eq(workspaceState.id, WORKSPACE_ID));
          await this.appendTx(tx, 'workspace', WORKSPACE_ID, 'policy.changed', input.byActorId, {
            policy: { ...merged },
            policyVersion,
          });
        });
      }
      async getWorkspacePolicy() {
        return { ...(await this.workspaceRow()).policy };
      }
      async setGatePolicy(input) {
        await this.requireGovernanceAdmin(input.byActorId);
        const minApprovals = input.policy.minApprovals ?? 1;
        if (!Number.isInteger(minApprovals) || minApprovals < 1) {
          throw new GuardFailedError('minApprovals must be a positive integer');
        }
        await this.db.transaction(async (tx) => {
          await tx
            .insert(gatePolicies)
            .values({ gate: input.gate, policy: { ...input.policy } })
            .onConflictDoUpdate({
              target: gatePolicies.gate,
              set: { policy: { ...input.policy } },
            });
          await this.appendTx(tx, 'workspace', WORKSPACE_ID, 'gate_policy.changed', input.byActorId, {
            gate: input.gate,
            policy: { ...input.policy },
          });
        });
      }
      async getGatePolicy(gate) {
        const rows = await this.db.select().from(gatePolicies).where(eq(gatePolicies.gate, gate)).limit(1);
        return { ...(rows[0]?.policy ?? {}) };
      }
      async authzExplain(input) {
        const source = await this.grantSource(input.actorId, input.permission);
        const actor = await this.getActorRow(input.actorId);
        const workspace = await this.workspaceRow();
        const allows = this.agentCeilingAllows(actor, input.permission, workspace);
        return {
          actorId: input.actorId,
          permission: input.permission,
          allowed: source !== null && allows.plan && allows.policy,
          source,
          governanceRole: actor?.governanceRole ?? 'member',
          plan: workspace.plan,
          planAllows: allows.plan,
          policyAllows: allows.policy,
          versions: { plan: workspace.planVersion, policy: workspace.policyVersion },
        };
      }
      async createFeature(input) {
        const id = this.nextId('feat');
        return this.db.transaction(async (tx) => {
          await tx.insert(features).values({ id, state: 'backlog', dispatchHold: false });
          await this.appendTx(tx, 'feature', id, 'feature.created', input.actorId, {});
          return { id, state: 'backlog', dispatchHold: false };
        });
      }
      async createWorkItemTx(tx, input) {
        const slug = input.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '');
        const row = {
          id: this.nextId('wi'),
          seq: 0,
          // assigned by the serial; placeholder for the local copy only
          featureId: input.featureId,
          externalKey: input.externalKey,
          title: input.title,
          state: 'backlog',
          blockedReason: null,
          reviewLoopIteration: 0,
          intentHash: null,
          pinnedVerification: null,
          specCheckpoint: input.specCheckpoint ?? false,
          doneCheckpoint: input.doneCheckpoint ?? false,
          invokeDevWith: input.invokeDevWith ?? '',
          specPath: `stories/${input.externalKey}-${slug}.md`,
          stateVersion: 0,
          dependsOn: input.dependsOn ? [...input.dependsOn] : [],
          lastFencingToken: 0,
        };
        await tx.insert(workItems).values({
          id: row.id,
          featureId: row.featureId,
          externalKey: row.externalKey,
          title: row.title,
          state: row.state,
          blockedReason: row.blockedReason,
          reviewLoopIteration: row.reviewLoopIteration,
          intentHash: row.intentHash,
          pinnedVerification: row.pinnedVerification,
          specCheckpoint: row.specCheckpoint,
          doneCheckpoint: row.doneCheckpoint,
          invokeDevWith: row.invokeDevWith,
          specPath: row.specPath,
          stateVersion: row.stateVersion,
          dependsOn: row.dependsOn,
          lastFencingToken: row.lastFencingToken,
        });
        await this.appendTx(tx, 'work_item', row.id, 'work_item.created', input.actorId, {
          externalKey: row.externalKey,
          featureId: row.featureId,
        });
        return this.publicItem(row);
      }
      async createWorkItem(input) {
        return this.db.transaction(async (tx) => this.createWorkItemTx(tx, input));
      }
      async importStories(input) {
        const entries = parseStories(input.yaml);
        const feature = await this.getFeatureRow(input.featureId);
        if (!feature) {
          throw new StoriesValidationError(`unknown feature: ${input.featureId}`);
        }
        return this.db.transaction(async (tx) => {
          const imported = [];
          const updated = [];
          const warnings = [];
          for (const entry of entries) {
            const existing = (
              await tx
                .select()
                .from(workItems)
                .where(and(eq(workItems.featureId, input.featureId), eq(workItems.externalKey, entry.id)))
                .orderBy(asc(workItems.seq))
                .limit(1)
            )[0];
            if (existing) {
              await tx
                .update(workItems)
                .set({
                  title: entry.title,
                  specCheckpoint: entry.specCheckpoint,
                  doneCheckpoint: entry.doneCheckpoint,
                  invokeDevWith: entry.invokeDevWith,
                })
                .where(eq(workItems.id, existing.id));
              await this.appendTx(tx, 'work_item', existing.id, 'work_item.reimported', input.actorId, {
                externalKey: entry.id,
              });
              updated.push(entry.id);
            } else {
              await this.createWorkItemTx(tx, {
                featureId: input.featureId,
                externalKey: entry.id,
                title: entry.title,
                specCheckpoint: entry.specCheckpoint,
                doneCheckpoint: entry.doneCheckpoint,
                invokeDevWith: entry.invokeDevWith,
                actorId: input.actorId,
              });
              imported.push(entry.id);
            }
          }
          return { imported, updated, warnings };
        });
      }
      // -- claims (roadmap §1.3) ---------------------------------------------------
      async claimTask(input) {
        const item = await this.mustGetItem(input.workItemId);
        await this.requirePermission(input.actorId, 'task.claim');
        const ttlMs = input.ttlMs ?? 15 * 60 * 1e3;
        const claimId = this.nextId('claim');
        try {
          return await this.db.transaction(async (tx) => {
            await tx
              .update(claims)
              .set({ released: true })
              .where(and(eq(claims.workItemId, item.id), eq(claims.released, false), lte(claims.leaseExpiresAt, this.now)));
            const counterRow = (
              await tx.select({ lastFencingToken: workItems.lastFencingToken }).from(workItems).where(eq(workItems.id, item.id)).limit(1)
            )[0];
            const token = (counterRow?.lastFencingToken ?? 0) + 1;
            await tx.update(workItems).set({ lastFencingToken: token }).where(eq(workItems.id, item.id));
            await tx.insert(claims).values({
              id: claimId,
              workItemId: item.id,
              actorId: input.actorId,
              fencingToken: token,
              leaseExpiresAt: this.now + ttlMs,
              released: false,
              ttlMs,
            });
            await this.appendTx(tx, 'work_item', item.id, 'work_item.claimed', input.actorId, {
              claimId,
              fencingToken: token,
            });
            return {
              id: claimId,
              workItemId: item.id,
              actorId: input.actorId,
              fencingToken: token,
              leaseExpiresAt: this.now + ttlMs,
              released: false,
            };
          });
        } catch (error) {
          if (isUniqueViolation(error)) {
            throw new ConflictError(`work item ${item.id} already has a live claim`);
          }
          throw error;
        }
      }
      async heartbeat(input) {
        const row = (await this.db.select().from(claims).where(eq(claims.id, input.claimId)).limit(1))[0];
        if (!row || row.released || row.leaseExpiresAt <= this.now) {
          throw new ConflictError(`claim ${input.claimId} is not live`);
        }
        await this.db
          .update(claims)
          .set({ leaseExpiresAt: this.now + row.ttlMs })
          .where(eq(claims.id, row.id));
      }
      async releaseClaim(input) {
        const row = (await this.db.select().from(claims).where(eq(claims.id, input.claimId)).limit(1))[0];
        if (!row || row.released) return;
        await this.db.transaction(async (tx) => {
          await tx.update(claims).set({ released: true }).where(eq(claims.id, row.id));
          await this.appendTx(tx, 'work_item', row.workItemId, 'claim.released', row.actorId, {
            claimId: row.id,
            reason: input.reason ?? null,
          });
        });
      }
      advanceClock(ms) {
        this.now += ms;
      }
      // -- lifecycle (roadmap §1.2) --------------------------------------------------
      async advanceState(input) {
        const item = await this.mustGetItem(input.workItemId);
        if (input.idempotencyKey !== void 0) {
          const cached = (await this.db.select().from(idempotencyKeys).where(eq(idempotencyKeys.key, input.idempotencyKey)).limit(1))[0];
          if (cached) return { ...cached.result };
        }
        if (input.idempotencyKey === void 0 && input.to === item.state) {
          await this.validatePresentedToken(item, input.fencingToken, input.actorId);
          return this.publicItem(item);
        }
        const rule = TRANSITIONS2.find((t) => t.from === item.state && t.to === input.to);
        if (!rule) {
          if (RANK2[input.to] < RANK2[item.state] && (await this.hasPermission(input.actorId, 'state.downgrade'))) {
            return this.privilegedDowngrade(item, input);
          }
          throw new InvalidTransitionError(item.state, input.to);
        }
        await this.validatePresentedToken(item, input.fencingToken, input.actorId);
        if (item.blockedReason !== null) {
          throw new GuardFailedError(`work item is blocked: ${item.blockedReason}`);
        }
        await this.requirePermission(input.actorId, rule.permission);
        if (rule.claimRequired && input.fencingToken === void 0) {
          throw new GuardFailedError('claim fencing token required for this transition');
        }
        for (const guard of rule.guards) {
          await this.checkGuard(guard, item);
        }
        return this.db.transaction(async (tx) => this.executeTransitionTx(tx, item, input.to, input.actorId, input.idempotencyKey));
      }
      async checkGuard(guard, item) {
        switch (guard) {
          case 'deps_done': {
            for (const depKey of item.dependsOn) {
              const dep = (
                await this.db
                  .select()
                  .from(workItems)
                  .where(and(eq(workItems.featureId, item.featureId), eq(workItems.externalKey, depKey)))
                  .orderBy(asc(workItems.seq))
                  .limit(1)
              )[0];
              if (dep && dep.state !== 'done') {
                throw new GuardFailedError(`dependency ${depKey} is not done`);
              }
            }
            return;
          }
          case 'spec_gate_if_checkpoint': {
            if (!item.specCheckpoint) return;
            const approved = (
              await this.db
                .select({ seq: gateDecisions.seq })
                .from(gateDecisions)
                .where(
                  and(
                    eq(gateDecisions.workItemId, item.id),
                    eq(gateDecisions.gate, 'spec_approval'),
                    eq(gateDecisions.decision, 'approved'),
                  ),
                )
                .limit(1)
            )[0];
            if (!approved) {
              throw new GuardFailedError('spec_checkpoint requires an approved spec_approval gate decision');
            }
            return;
          }
          case 'nonempty_diff': {
            const rows = await this.db
              .select()
              .from(evidence)
              .where(and(eq(evidence.workItemId, item.id), eq(evidence.kind, 'git_diff')))
              .orderBy(asc(evidence.seq));
            const latest = rows[rows.length - 1];
            if (latest && latest.payload['nonEmpty'] !== true) {
              throw new GuardFailedError('the latest git_diff evidence is empty \u2014 nothing to review');
            }
            return;
          }
        }
      }
      async privilegedDowngrade(item, input) {
        await this.validatePresentedToken(item, input.fencingToken, input.actorId);
        if (item.blockedReason !== null) {
          throw new GuardFailedError(`work item is blocked: ${item.blockedReason}`);
        }
        const from = item.state;
        return this.db.transaction(async (tx) => {
          const updated = await tx
            .update(workItems)
            .set({ state: input.to, stateVersion: item.stateVersion + 1 })
            .where(and(eq(workItems.id, item.id), eq(workItems.stateVersion, item.stateVersion)))
            .returning({ id: workItems.id });
          if (updated.length === 0) {
            throw new ConflictError(`state_version conflict on work item ${item.id}`);
          }
          await this.appendTx(
            tx,
            'work_item',
            item.id,
            'work_item.state_downgraded',
            input.actorId,
            { from, to: input.to, compensating: true },
            input.idempotencyKey !== void 0 ? { idempotencyKey: input.idempotencyKey } : void 0,
          );
          const result = this.publicItem({ ...item, state: input.to, stateVersion: item.stateVersion + 1 });
          if (input.idempotencyKey !== void 0) {
            await tx.insert(idempotencyKeys).values({ key: input.idempotencyKey, result }).onConflictDoNothing();
          }
          return result;
        });
      }
      /** Shared by advanceState and the gate-fired transitions. ONE transaction per command. */
      async executeTransitionTx(tx, item, to, actorId, idempotencyKey, causationId) {
        const from = item.state;
        const updated = await tx
          .update(workItems)
          .set({ state: to, stateVersion: item.stateVersion + 1 })
          .where(and(eq(workItems.id, item.id), eq(workItems.stateVersion, item.stateVersion)))
          .returning({ id: workItems.id });
        if (updated.length === 0) {
          throw new ConflictError(`state_version conflict on work item ${item.id}`);
        }
        const event = await this.appendTx(
          tx,
          'work_item',
          item.id,
          'work_item.state_changed',
          actorId,
          { from, to },
          {
            ...(causationId !== void 0 ? { causationId } : {}),
            ...(idempotencyKey !== void 0 ? { idempotencyKey } : {}),
          },
        );
        if (from === 'backlog' && to !== 'backlog') {
          const feature = await this.getFeatureRow(item.featureId, tx);
          if (feature && feature.state === 'backlog') {
            await tx.update(features).set({ state: 'in_progress' }).where(eq(features.id, feature.id));
            await this.appendTx(
              tx,
              'feature',
              feature.id,
              'feature.state_changed',
              this.systemActorId,
              { from: 'backlog', to: 'in_progress' },
              { causationId: String(event.globalSeq) },
            );
          }
        }
        if (to === 'done' && item.doneCheckpoint) {
          const feature = await this.getFeatureRow(item.featureId, tx);
          if (feature && !feature.dispatchHold) {
            await tx.update(features).set({ dispatchHold: true }).where(eq(features.id, feature.id));
            await this.appendTx(
              tx,
              'feature',
              feature.id,
              'feature.dispatch_hold_raised',
              this.systemActorId,
              { workItemId: item.id },
              { causationId: String(event.globalSeq) },
            );
          }
        }
        const result = this.publicItem({ ...item, state: to, stateVersion: item.stateVersion + 1 });
        if (idempotencyKey !== void 0) {
          await tx.insert(idempotencyKeys).values({ key: idempotencyKey, result }).onConflictDoNothing();
        }
        return result;
      }
      async blockTask(input) {
        const item = await this.mustGetItem(input.workItemId);
        if (!BLOCKED_REASONS.includes(input.reason)) {
          throw new GuardFailedError(`unknown blocking condition: ${input.reason}`);
        }
        await this.validatePresentedToken(item, input.fencingToken, input.actorId);
        await this.requirePermission(input.actorId, 'task.block');
        return this.db.transaction(async (tx) => {
          await tx
            .update(workItems)
            .set({ blockedReason: input.reason, stateVersion: item.stateVersion + 1 })
            .where(eq(workItems.id, item.id));
          await this.appendTx(tx, 'work_item', item.id, 'work_item.blocked', input.actorId, {
            reason: input.reason,
          });
          return this.publicItem({ ...item, blockedReason: input.reason, stateVersion: item.stateVersion + 1 });
        });
      }
      async unblockTask(input) {
        const item = await this.mustGetItem(input.workItemId);
        if (item.blockedReason === 'review_non_convergence') {
          await this.requirePermission(input.actorId, 'gate.review.approve');
        } else {
          await this.requirePermission(input.actorId, 'task.block');
        }
        return this.db.transaction(async (tx) => {
          await tx
            .update(workItems)
            .set({ blockedReason: null, stateVersion: item.stateVersion + 1 })
            .where(eq(workItems.id, item.id));
          await this.appendTx(tx, 'work_item', item.id, 'work_item.unblocked', input.actorId, {});
          return this.publicItem({ ...item, blockedReason: null, stateVersion: item.stateVersion + 1 });
        });
      }
      // -- gates & evidence (roadmap §1.4) ------------------------------------------
      async submitEvidence(input) {
        const item = await this.mustGetItem(input.workItemId);
        await this.validatePresentedToken(item, input.fencingToken, input.actorId);
        await this.db.transaction(async (tx) => {
          await tx.insert(evidence).values({
            workItemId: item.id,
            kind: input.evidence.kind,
            payload: input.evidence.payload,
          });
          await this.appendTx(tx, 'work_item', item.id, 'evidence.submitted', input.actorId, {
            kind: input.evidence.kind,
          });
        });
      }
      async approveGate(input) {
        const item = await this.mustGetItem(input.workItemId);
        if (input.gate === 'spec_approval') {
          await this.requirePermission(input.actorId, 'gate.spec.approve');
          if (item.blockedReason !== null) {
            throw new GuardFailedError(`work item is blocked: ${item.blockedReason}`);
          }
          if (item.state !== 'draft') {
            throw new GuardFailedError(`spec_approval applies to draft items, not ${item.state}`);
          }
          const quorumMet2 = await this.quorumWouldBeMet(item, 'spec_approval', input.actorId);
          return this.db.transaction(async (tx) => {
            let pinned = item.pinnedVerification;
            if (input.pinnedVerification !== void 0) {
              pinned = [...input.pinnedVerification];
              await tx.update(workItems).set({ pinnedVerification: pinned }).where(eq(workItems.id, item.id));
            }
            const pinnedItem = { ...item, pinnedVerification: pinned };
            await this.recordApprovalTx(tx, pinnedItem, 'spec_approval', input.actorId);
            if (!quorumMet2) {
              return this.publicItem(pinnedItem);
            }
            return this.executeTransitionTx(tx, pinnedItem, 'ready_for_dev', input.actorId);
          });
        }
        await this.requirePermission(input.actorId, 'gate.review.approve');
        if (item.blockedReason !== null) {
          throw new GuardFailedError(`work item is blocked: ${item.blockedReason}`);
        }
        if (item.state !== 'in_review') {
          throw new GuardFailedError(`review_approval applies to in_review items, not ${item.state}`);
        }
        const quorumMet = await this.quorumWouldBeMet(item, 'review_approval', input.actorId);
        if (quorumMet) await this.checkReviewEvidence(item);
        return this.db.transaction(async (tx) => {
          await this.recordApprovalTx(tx, item, 'review_approval', input.actorId);
          if (!quorumMet) {
            return this.publicItem(item);
          }
          return this.executeTransitionTx(tx, item, 'done', input.actorId);
        });
      }
      /** Distinct approvers of this round (round = reviewLoopIteration at decision time). */
      async roundApprovers(item, gate) {
        const rows = await this.db
          .select({ actorId: gateDecisions.actorId })
          .from(gateDecisions)
          .where(
            and(
              eq(gateDecisions.workItemId, item.id),
              eq(gateDecisions.gate, gate),
              eq(gateDecisions.decision, 'approved'),
              eq(gateDecisions.round, item.reviewLoopIteration),
            ),
          )
          .orderBy(asc(gateDecisions.seq));
        const ids = [...new Set(rows.map((row) => row.actorId))];
        const result = [];
        for (const id of ids) {
          const actor = await this.getActorRow(id);
          if (actor) result.push(actor);
        }
        return result;
      }
      /** Gate policy quorum (roadmap §3): min distinct approvers + required actor types, as DATA. */
      async quorumWouldBeMet(item, gate, nextApproverId) {
        const policy = await this.getGatePolicy(gate);
        const min = policy.minApprovals ?? 1;
        const required = policy.requiredActorTypes ?? [];
        const approvers = await this.roundApprovers(item, gate);
        const nextActor = await this.getActorRow(nextApproverId);
        if (nextActor && !approvers.some((a) => a.id === nextActor.id)) approvers.push(nextActor);
        if (approvers.length < min) return false;
        for (const type of required) {
          if (!approvers.some((a) => a.type === type)) return false;
        }
        return true;
      }
      async recordApprovalTx(tx, item, gate, actorId) {
        await tx.insert(gateDecisions).values({
          workItemId: item.id,
          gate,
          decision: 'approved',
          actorId,
          round: item.reviewLoopIteration,
        });
        await this.appendTx(tx, 'work_item', item.id, 'gate.approved', actorId, {
          gate,
          round: item.reviewLoopIteration,
          ...(gate === 'spec_approval' ? { pinnedVerification: item.pinnedVerification } : {}),
        });
      }
      /**
       * Evidence condition of the done gate (§1.4, D7): every PINNED command's
       * latest test_run exited 0, and the final commit is reachable on the
       * remote. review_report is never consulted.
       */
      async checkReviewEvidence(item) {
        const rows = await this.db.select().from(evidence).where(eq(evidence.workItemId, item.id)).orderBy(asc(evidence.seq));
        for (const command of item.pinnedVerification ?? []) {
          const runs = rows.filter((row) => row.kind === 'test_run' && row.payload['command'] === command);
          const latest = runs[runs.length - 1];
          if (!latest || latest.payload['exitCode'] !== 0) {
            throw new GuardFailedError(`pinned verification did not pass: ${command}`);
          }
        }
        const commitOk = rows.some((row) => row.kind === 'commit' && row.payload['reachableOnRemote'] === true);
        if (!commitOk) {
          throw new GuardFailedError('final revision must be reachable on the remote (push is part of the HALT contract)');
        }
      }
      async rejectGate(input) {
        const item = await this.mustGetItem(input.workItemId);
        if (input.gate !== 'review_approval') {
          throw new GuardFailedError('only review_approval rejection is defined in Phase 1');
        }
        if (
          !(await this.hasPermission(input.actorId, 'gate.review.approve')) &&
          !(await this.hasPermission(input.actorId, 'gate.review.reject'))
        ) {
          throw new PermissionDeniedError('gate.review.reject', input.actorId);
        }
        if (item.state !== 'in_review') {
          throw new GuardFailedError(`review rejection applies to in_review items, not ${item.state}`);
        }
        return this.db.transaction(async (tx) => {
          await tx.insert(gateDecisions).values({
            workItemId: item.id,
            gate: 'review_approval',
            decision: 'rejected',
            actorId: input.actorId,
            round: item.reviewLoopIteration,
          });
          const decisionEvent = await this.appendTx(tx, 'work_item', item.id, 'gate.rejected', input.actorId, {
            gate: 'review_approval',
          });
          if (item.reviewLoopIteration >= REVIEW_LOOP_LIMIT) {
            await tx
              .update(workItems)
              .set({ blockedReason: 'review_non_convergence', stateVersion: item.stateVersion + 1 })
              .where(eq(workItems.id, item.id));
            await this.appendTx(
              tx,
              'work_item',
              item.id,
              'work_item.blocked',
              this.systemActorId,
              { reason: 'review_non_convergence' },
              { causationId: String(decisionEvent.globalSeq) },
            );
            return this.publicItem({
              ...item,
              blockedReason: 'review_non_convergence',
              stateVersion: item.stateVersion + 1,
            });
          }
          await tx
            .update(workItems)
            .set({ reviewLoopIteration: item.reviewLoopIteration + 1 })
            .where(eq(workItems.id, item.id));
          const bumped = { ...item, reviewLoopIteration: item.reviewLoopIteration + 1 };
          return this.executeTransitionTx(tx, bumped, 'in_progress', this.systemActorId, void 0, String(decisionEvent.globalSeq));
        });
      }
      // -- dispatch (roadmap §2.3) -----------------------------------------------
      async getTaskContext(input) {
        const item = await this.mustGetItem(input.workItemId);
        if (item.state === 'done') {
          throw new GuardFailedError('done items are never re-dispatched; follow-up review is a new work item');
        }
        const feature = await this.getFeatureRow(item.featureId);
        if (feature?.dispatchHold) {
          throw new GuardFailedError('feature is under a done_checkpoint dispatch hold');
        }
        return { workItem: this.publicItem(item), entryState: item.state };
      }
      async releaseDispatchHold(input) {
        await this.requirePermission(input.actorId, 'dispatch.release_hold');
        const feature = await this.getFeatureRow(input.featureId);
        if (!feature) throw new GuardFailedError(`unknown feature: ${input.featureId}`);
        return this.db.transaction(async (tx) => {
          await tx.update(features).set({ dispatchHold: false }).where(eq(features.id, feature.id));
          await this.appendTx(tx, 'feature', feature.id, 'feature.dispatch_hold_released', input.actorId, {});
          return this.publicFeature({ ...feature, dispatchHold: false });
        });
      }
      // -- reconciliation (roadmap §1.6, D6: detect-only, never mutates) ------------
      async reconcile(input) {
        const reports = [];
        for (const file of input.files) {
          const item = await this.mustGetItem(file.workItemId);
          if ((await this.liveClaim(item.id)) !== null) continue;
          const raw = file.frontmatterStatus.trim();
          const dbState = item.state;
          if (raw === 'blocked') {
            if (item.blockedReason !== null) continue;
            reports.push({ workItemId: item.id, fileState: raw, dbState, kind: 'conflict' });
            continue;
          }
          const normalized = LEGACY_STATUS2[raw];
          if (normalized === void 0) {
            reports.push({ workItemId: item.id, fileState: raw, dbState, kind: 'conflict' });
            continue;
          }
          if (normalized === dbState) continue;
          reports.push({
            workItemId: item.id,
            fileState: raw,
            dbState,
            kind: RANK2[normalized] > RANK2[dbState] ? 'file_ahead' : 'db_ahead',
          });
        }
        return reports;
      }
      // -- queries ---------------------------------------------------------------
      async getWorkItem(id) {
        return this.publicItem(await this.mustGetItem(id));
      }
      async getFeature(id) {
        const feature = await this.getFeatureRow(id);
        if (!feature) throw new GuardFailedError(`unknown feature: ${id}`);
        return this.publicFeature(feature);
      }
      async listWorkItems(filter) {
        const rows = await this.db.select().from(workItems).orderBy(asc(workItems.seq));
        const result = [];
        for (const row of rows) {
          if (filter?.state !== void 0 && row.state !== filter.state) continue;
          if (filter?.featureId !== void 0 && row.featureId !== filter.featureId) continue;
          if (filter?.claimable === true && (await this.liveClaim(row.id)) !== null) continue;
          result.push(this.publicItem(row));
        }
        return result;
      }
      async getClaims(workItemId2) {
        const item = await this.mustGetItem(workItemId2);
        const rows = await this.db.select().from(claims).where(eq(claims.workItemId, item.id)).orderBy(asc(claims.seq));
        return rows.map((row) => this.publicClaim(row));
      }
      async events(streamId) {
        const rows =
          streamId === void 0
            ? await this.db.select().from(events).orderBy(asc(events.globalSeq))
            : await this.db.select().from(events).where(eq(events.streamId, streamId)).orderBy(asc(events.globalSeq));
        return rows.map((row) => this.eventFromRow(row));
      }
    };
  },
});

// ../../packages/db/src/sync-engine.ts
import { createRequire } from 'node:module';
import { dirname as dirname2, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createSyncFn } from 'synckit';
function rethrow(error) {
  const Cls = ERROR_CLASSES[error.name];
  if (Cls) {
    const instance = Object.create(Cls.prototype);
    instance.message = error.message;
    instance.name = error.name;
    throw instance;
  }
  throw new Error(`${error.name}: ${error.message}`);
}
function unwrap(result) {
  if (result.ok) return result.value;
  rethrow(result.error);
}
function createPgSyncEngine(options) {
  const created = unwrap(
    callWorker({
      op: 'new',
      ...(options?.dataDir !== void 0 ? { dataDir: options.dataDir } : {}),
    }),
  );
  const engineId = created.engineId;
  const proxy = {};
  for (const method of METHODS) {
    proxy[method] = (...args) => unwrap(callWorker({ op: 'call', engineId, method, args }));
  }
  return proxy;
}
var here, workerPath, callWorker, ERROR_CLASSES, METHODS, _require;
var init_sync_engine = __esm({
  '../../packages/db/src/sync-engine.ts'() {
    'use strict';
    init_src();
    here = dirname2(fileURLToPath(import.meta.url));
    workerPath = join(here, '..', 'dist', 'worker.mjs');
    callWorker = createSyncFn(workerPath);
    ERROR_CLASSES = {
      ConflictError,
      GuardFailedError,
      InvalidTransitionError,
      PermissionDeniedError,
      StoriesValidationError,
    };
    METHODS = [
      'createActor',
      'grant',
      'revoke',
      'createFeature',
      'createWorkItem',
      'importStories',
      'claimTask',
      'heartbeat',
      'releaseClaim',
      'advanceClock',
      'advanceState',
      'blockTask',
      'unblockTask',
      'submitEvidence',
      'approveGate',
      'rejectGate',
      'getTaskContext',
      'releaseDispatchHold',
      'reconcile',
      'setGovernanceRole',
      'getGovernanceRole',
      'assignRole',
      'revokeRole',
      'listRoleAssignments',
      'setPlan',
      'getPlan',
      'setWorkspacePolicy',
      'getWorkspacePolicy',
      'setGatePolicy',
      'getGatePolicy',
      'authzExplain',
      'getWorkItem',
      'getFeature',
      'getClaims',
      'listWorkItems',
      'events',
    ];
    _require = createRequire(import.meta.url);
  },
});

// ../../packages/db/src/schema-sql.ts
var SCHEMA_SQL;
var init_schema_sql = __esm({
  '../../packages/db/src/schema-sql.ts'() {
    'use strict';
    SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS actors (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  display_name TEXT NOT NULL,
  governance_role TEXT NOT NULL DEFAULT 'member'
);

-- Phase 2 upgrade path for durable data dirs created under Phase 1 (story 13).
ALTER TABLE actors ADD COLUMN IF NOT EXISTS governance_role TEXT NOT NULL DEFAULT 'member';

CREATE TABLE IF NOT EXISTS grants (
  actor_id TEXT NOT NULL,
  permission TEXT NOT NULL,
  scope TEXT,
  PRIMARY KEY (actor_id, permission)
);

CREATE TABLE IF NOT EXISTS role_assignments (
  seq SERIAL PRIMARY KEY,
  actor_id TEXT NOT NULL,
  role_code TEXT NOT NULL,
  granted_by TEXT NOT NULL,
  revoked BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS workspace_state (
  id TEXT PRIMARY KEY,
  plan TEXT NOT NULL,
  plan_version INTEGER NOT NULL DEFAULT 1,
  policy JSONB NOT NULL DEFAULT '{}'::jsonb,
  policy_version INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS gate_policies (
  gate TEXT PRIMARY KEY,
  policy JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS features (
  id TEXT PRIMARY KEY,
  seq SERIAL NOT NULL,
  state TEXT NOT NULL,
  dispatch_hold BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS work_items (
  id TEXT PRIMARY KEY,
  seq SERIAL NOT NULL,
  feature_id TEXT NOT NULL,
  external_key TEXT NOT NULL,
  title TEXT NOT NULL,
  state TEXT NOT NULL,
  blocked_reason TEXT,
  review_loop_iteration INTEGER NOT NULL DEFAULT 0,
  intent_hash TEXT,
  pinned_verification JSONB,
  spec_checkpoint BOOLEAN NOT NULL DEFAULT FALSE,
  done_checkpoint BOOLEAN NOT NULL DEFAULT FALSE,
  invoke_dev_with TEXT NOT NULL DEFAULT '',
  spec_path TEXT NOT NULL,
  state_version INTEGER NOT NULL DEFAULT 0,
  depends_on JSONB NOT NULL DEFAULT '[]'::jsonb,
  last_fencing_token INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS claims (
  id TEXT PRIMARY KEY,
  seq SERIAL NOT NULL,
  work_item_id TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  fencing_token INTEGER NOT NULL,
  lease_expires_at BIGINT NOT NULL,
  released BOOLEAN NOT NULL DEFAULT FALSE,
  ttl_ms BIGINT NOT NULL
);

-- roadmap \xA71.3: one live claim per work item \u2014 races lose by constraint.
CREATE UNIQUE INDEX IF NOT EXISTS claims_one_live_per_item
  ON claims (work_item_id) WHERE released = false;

CREATE TABLE IF NOT EXISTS gate_decisions (
  seq SERIAL PRIMARY KEY,
  work_item_id TEXT NOT NULL,
  gate TEXT NOT NULL,
  decision TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  round INTEGER NOT NULL DEFAULT 0
);

-- Phase 2 upgrade path for durable data dirs created under Phase 1 (story 13).
ALTER TABLE gate_decisions ADD COLUMN IF NOT EXISTS round INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS evidence (
  seq SERIAL PRIMARY KEY,
  work_item_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  payload JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS events (
  global_seq SERIAL PRIMARY KEY,
  stream_type TEXT NOT NULL,
  stream_id TEXT NOT NULL,
  stream_seq INTEGER NOT NULL,
  type TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  payload JSONB NOT NULL,
  causation_id TEXT,
  idempotency_key TEXT
);

-- \xA71.5: UNIQUE(stream_id, stream_seq) doubles as the optimistic lock.
CREATE UNIQUE INDEX IF NOT EXISTS events_stream_id_stream_seq
  ON events (stream_id, stream_seq);

CREATE TABLE IF NOT EXISTS idempotency_keys (
  key TEXT PRIMARY KEY,
  result JSONB NOT NULL
);
`;
  },
});

// ../../packages/db/src/index.ts
var src_exports = {};
__export(src_exports, {
  PgEngine: () => PgEngine,
  SCHEMA_SQL: () => SCHEMA_SQL,
  createPgSyncEngine: () => createPgSyncEngine,
  schema: () => schema_exports,
});
var init_src2 = __esm({
  '../../packages/db/src/index.ts'() {
    'use strict';
    init_pg_engine();
    init_sync_engine();
    init_schema_sql();
    init_schema();
  },
});

// ../../packages/runner/src/index.ts
var src_exports2 = {};
__export(src_exports2, {
  DEFAULT_VERIFICATION_ALLOWLIST: () => DEFAULT_VERIFICATION_ALLOWLIST,
  git: () => git,
  runOnce: () => runOnce,
  workLoop: () => workLoop,
});
import { spawnSync } from 'node:child_process';
import {
  existsSync as existsSync2,
  mkdirSync as mkdirSync3,
  readdirSync,
  readFileSync as readFileSync3,
  rmSync,
  statSync,
  writeFileSync as writeFileSync2,
} from 'node:fs';
import { join as join3, resolve as resolve2 } from 'node:path';
import { parse as parseYaml } from 'yaml';
function git(args, cwd) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8' });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`git ${args.join(' ')} failed with exit ${String(result.status)}: ${result.stderr.trim()}`);
  }
  return result.stdout.trim();
}
function ensureGitExcludes(repoPath) {
  const gitDir = join3(repoPath, '.git');
  try {
    if (!statSync(gitDir).isDirectory()) return;
  } catch {
    return;
  }
  const infoDir = join3(gitDir, 'info');
  mkdirSync3(infoDir, { recursive: true });
  const excludePath = join3(infoDir, 'exclude');
  const current = existsSync2(excludePath) ? readFileSync3(excludePath, 'utf8') : '';
  const wanted = ['.oahs/', MARKER_FILE];
  const have = new Set(current.split('\n').map((line) => line.trim()));
  const missing = wanted.filter((line) => !have.has(line));
  if (missing.length === 0) return;
  const prefix =
    current === '' || current.endsWith('\n')
      ? current
      : `${current}
`;
  writeFileSync2(
    excludePath,
    `${prefix}${missing.join('\n')}
`,
    'utf8',
  );
}
function removeWorktree(dir, repoPath) {
  try {
    git(['worktree', 'remove', '--force', dir], repoPath);
  } catch {
    try {
      rmSync(dir, { recursive: true, force: true });
      git(['worktree', 'prune'], repoPath);
    } catch {}
  }
}
function writeMarker(worktreeDir, marker) {
  writeFileSync2(
    join3(worktreeDir, MARKER_FILE),
    `${JSON.stringify(marker, null, 2)}
`,
    'utf8',
  );
}
function readMarker(worktreeDir) {
  const path = join3(worktreeDir, MARKER_FILE);
  if (!existsSync2(path)) return null;
  try {
    const raw = JSON.parse(readFileSync3(path, 'utf8'));
    if (typeof raw.workItemId !== 'string' || typeof raw.baseline !== 'string') return null;
    return {
      workItemId: raw.workItemId,
      claimId: typeof raw.claimId === 'string' ? raw.claimId : '',
      baseline: raw.baseline,
      invocations: typeof raw.invocations === 'number' ? raw.invocations : 0,
    };
  } catch {
    return null;
  }
}
function splitFrontmatter(raw) {
  if (!raw.startsWith('---')) return { data: {}, body: raw };
  const close = raw.indexOf('\n---', 3);
  if (close === -1) return { data: {}, body: raw };
  const firstNewline = raw.indexOf('\n');
  const block = raw.slice(firstNewline + 1, close);
  const bodyStart = raw.indexOf('\n', close + 1);
  const body = bodyStart === -1 ? '' : raw.slice(bodyStart + 1);
  let data = {};
  try {
    data = parseYaml(block);
  } catch {
    data = {};
  }
  const record = typeof data === 'object' && data !== null && !Array.isArray(data) ? data : {};
  return { data: record, body };
}
function extractAutoRunResult(body) {
  const lines = body.split('\n');
  const start = lines.findIndex((line) => /^##\s+auto run result\s*$/i.test(line.trim()));
  if (start === -1) return null;
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (line !== void 0 && /^##\s+/.test(line)) {
      end = i;
      break;
    }
  }
  return lines.slice(start, end).join('\n').trimEnd();
}
function readSpecReport(specAbsPath) {
  if (!existsSync2(specAbsPath)) {
    return { status: null, blockingCondition: null, autoRunResult: null };
  }
  const { data, body } = splitFrontmatter(readFileSync3(specAbsPath, 'utf8'));
  const statusRaw = data['status'];
  const status = typeof statusRaw === 'string' ? statusRaw : statusRaw != null ? String(statusRaw) : null;
  const autoRunResult = extractAutoRunResult(body);
  let blockingCondition = typeof data['blocking_condition'] === 'string' ? data['blocking_condition'] : null;
  if (blockingCondition === null && autoRunResult !== null) {
    const match = /^blocking condition:\s*(.+)$/im.exec(autoRunResult);
    blockingCondition = match?.[1]?.trim() ?? null;
  }
  return { status, blockingCondition, autoRunResult };
}
function setFrontmatterStatus(specAbsPath, status) {
  const raw = readFileSync3(specAbsPath, 'utf8');
  if (raw.startsWith('---')) {
    const close = raw.indexOf('\n---', 3);
    if (close !== -1) {
      const head = raw.slice(0, close);
      const rest = raw.slice(close);
      const replaced = /^status:.*$/m.test(head)
        ? head.replace(/^status:.*$/m, `status: ${status}`)
        : `${head}
status: ${status}`;
      writeFileSync2(specAbsPath, replaced + rest, 'utf8');
      return;
    }
  }
  writeFileSync2(
    specAbsPath,
    `---
status: ${status}
---
${raw}`,
    'utf8',
  );
}
function normalizeStatus(status) {
  if (status === null) return null;
  const flat = status.trim().toLowerCase().replaceAll('-', '_');
  return flat === 'review' ? 'in_review' : flat;
}
function mapBlockingCondition(condition) {
  if (condition === null) return 'other';
  const c = condition.toLowerCase();
  if (c.includes('review repair loop exceeded')) return 'review_non_convergence';
  if (c.includes('unclear intent')) return 'unclear_intent';
  if (c.includes('no stories.yaml')) return 'no_stories_yaml_found';
  if (c.includes('ambiguous story file match')) return 'ambiguous_story_file_match';
  if (c.includes('no subagents')) return 'no_subagents';
  return 'other';
}
function isRemoteError(error, name) {
  return typeof error === 'object' && error !== null && error.errorName === name;
}
async function finishRun(args) {
  const { client, workItem, claim } = args;
  const spec = readSpecReport(join3(args.workDir, args.specRel));
  await args.submit('halt_report', {
    status: spec.status,
    blockingCondition: spec.blockingCondition,
    autoRunResult: spec.autoRunResult,
    agentExitCode: args.agentExitCode,
  });
  for (const command of workItem.pinnedVerification ?? []) {
    const binary = command.trim().split(/\s+/)[0] ?? '';
    if (!args.allowlist.includes(binary)) {
      await args.submit('test_run', { command, exitCode: -1, refused: true });
      continue;
    }
    const run = spawnSync('bash', ['-c', command], {
      cwd: args.workDir,
      encoding: 'utf8',
      timeout: 10 * 60 * 1e3,
    });
    await args.submit('test_run', { command, exitCode: run.status ?? -1 });
  }
  const final = git(['rev-parse', 'HEAD'], args.workDir);
  const shortstat = final === args.baseline ? '' : git(['diff', '--shortstat', `${args.baseline}..${final}`], args.workDir);
  const filesChanged = Number(/(\d+) files? changed/.exec(shortstat)?.[1] ?? '0');
  await args.submit('git_diff', {
    baseline: args.baseline,
    final,
    filesChanged,
    nonEmpty: filesChanged > 0,
    branch: args.branch,
  });
  git(['push', args.remote, args.branch], args.repoPath);
  const lsRemote = git(['ls-remote', args.remote, `refs/heads/${args.branch}`], args.repoPath);
  await args.submit('commit', {
    sha: final,
    branch: args.branch,
    reachableOnRemote: lsRemote.includes(final),
  });
  const status = normalizeStatus(spec.status);
  const token = claim.fencingToken;
  if (status === 'blocked') {
    await client.call('block_task', {
      workItemId: workItem.id,
      reason: mapBlockingCondition(spec.blockingCondition),
      fencingToken: token,
    });
    await client.call('release_claim', { claimId: claim.id, reason: 'run blocked' });
    return 'blocked';
  }
  const hasCommit = final !== args.baseline;
  if (status === 'done' || status === 'in_review' || (status === 'in_progress' && hasCommit)) {
    await client.call('advance_state', {
      workItemId: workItem.id,
      to: 'in_review',
      fencingToken: token,
    });
    await client.call('release_claim', { claimId: claim.id, reason: 'run finished' });
    return 'in_review';
  }
  await client.call('block_task', { workItemId: workItem.id, reason: 'other', fencingToken: token });
  await client.call('release_claim', {
    claimId: claim.id,
    reason: 'run failed without a readable HALT',
  });
  return 'blocked';
}
function scanOldWorktrees(root, workItemId2, specRel) {
  const scan = { adoptable: null, wrecked: [] };
  if (!existsSync2(root)) return scan;
  for (const name of readdirSync(root)) {
    const dir = join3(root, name);
    const marker = readMarker(dir);
    if (marker === null || marker.workItemId !== workItemId2) continue;
    let head = null;
    try {
      head = git(['rev-parse', 'HEAD'], dir);
    } catch {
      head = null;
    }
    const status = normalizeStatus(readSpecReport(join3(dir, specRel)).status);
    const terminal = status === 'done' || status === 'in_review';
    if (scan.adoptable === null && head !== null && head !== marker.baseline && terminal) {
      scan.adoptable = { dir, head, baseline: marker.baseline };
    } else {
      scan.wrecked.push(dir);
    }
  }
  return scan;
}
async function runOnce(options) {
  const { client } = options;
  const repoPath = resolve2(options.repoPath);
  const remote = options.remote ?? 'origin';
  const allowlist = options.verificationAllowlist ?? DEFAULT_VERIFICATION_ALLOWLIST;
  const listUnblocked = async (state) =>
    (await client.call('list_work_items', { state, claimable: true })).filter((item) => item.blockedReason === null);
  let candidates = await listUnblocked('ready_for_dev');
  if (candidates.length === 0) candidates = await listUnblocked('in_progress');
  const picked = candidates[0];
  if (picked === void 0) return { dispatched: false };
  let claim;
  try {
    claim = await client.call('claim_task', { workItemId: picked.id });
  } catch (error) {
    if (isRemoteError(error, 'ConflictError')) {
      return { dispatched: false, details: `lost the claim race for ${picked.externalKey}` };
    }
    throw error;
  }
  const context = await client.call('get_task_context', { workItemId: picked.id });
  const workItem = context.workItem;
  const specRel = join3(options.specFolder, workItem.specPath);
  const branch = `claim/${claim.id}`;
  const worktreesRoot = join3(repoPath, '.oahs', 'worktrees');
  const evidence2 = [];
  const submit = async (kind, payload) => {
    const item = { kind, payload };
    evidence2.push(item);
    await client.call('submit_evidence', {
      workItemId: workItem.id,
      evidence: item,
      fencingToken: claim.fencingToken,
    });
  };
  const base = {
    dispatched: true,
    workItemId: workItem.id,
    externalKey: workItem.externalKey,
    claimId: claim.id,
    evidence: evidence2,
  };
  const finishArgs = {
    client,
    workItem,
    claim,
    specRel,
    branch,
    repoPath,
    remote,
    allowlist,
    submit,
  };
  const scan = scanOldWorktrees(worktreesRoot, workItem.id, specRel);
  if (scan.adoptable !== null) {
    const { dir, head, baseline: baseline2 } = scan.adoptable;
    git(['branch', branch, head], repoPath);
    await client.call('advance_state', {
      workItemId: workItem.id,
      to: 'in_progress',
      fencingToken: claim.fencingToken,
    });
    if (options.failpoint === 'before_report') {
      return { ...base, outcome: 'crashed', details: 'failpoint before_report (adopt path)' };
    }
    const outcome2 = await finishRun({
      ...finishArgs,
      workDir: dir,
      baseline: baseline2,
      agentExitCode: null,
    });
    removeWorktree(dir, repoPath);
    return {
      ...base,
      outcome: outcome2 === 'in_review' ? 'adopted_in_review' : outcome2,
      details: `adopted finished worktree ${dir}`,
    };
  }
  if (scan.wrecked.length > 0) {
    for (const dir of scan.wrecked) removeWorktree(dir, repoPath);
    await client.call('block_task', {
      workItemId: workItem.id,
      reason: 'stale_worktree',
      fencingToken: claim.fencingToken,
    });
    await client.call('release_claim', { claimId: claim.id, reason: 'stale worktree cleaned' });
    return { ...base, outcome: 'blocked', details: 'stale worktree cleaned; task blocked' };
  }
  const baseline = git(['rev-parse', 'HEAD'], repoPath);
  ensureGitExcludes(repoPath);
  mkdirSync3(worktreesRoot, { recursive: true });
  const worktreeDir = join3(worktreesRoot, claim.id);
  git(['worktree', 'add', '-b', branch, worktreeDir, baseline], repoPath);
  writeMarker(worktreeDir, {
    workItemId: workItem.id,
    claimId: claim.id,
    baseline,
    invocations: 0,
  });
  const specAbs = join3(worktreeDir, specRel);
  if (existsSync2(specAbs)) {
    setFrontmatterStatus(specAbs, ENTRY_STATUS[context.entryState] ?? context.entryState);
  }
  await client.call('advance_state', {
    workItemId: workItem.id,
    to: 'in_progress',
    fencingToken: claim.fencingToken,
  });
  const command = options.agentCmd
    .replaceAll('{SPEC_FOLDER}', options.specFolder)
    .replaceAll('{STORY_ID}', workItem.externalKey)
    .replaceAll('{INVOKE_WITH}', workItem.invokeDevWith)
    .replaceAll('{WORKTREE}', worktreeDir);
  writeMarker(worktreeDir, {
    workItemId: workItem.id,
    claimId: claim.id,
    baseline,
    invocations: 1,
  });
  const invoked = spawnSync('bash', ['-lc', command], {
    cwd: worktreeDir,
    encoding: 'utf8',
    timeout: options.agentTimeoutMs ?? 30 * 60 * 1e3,
    killSignal: 'SIGKILL',
    env: {
      ...process.env,
      ...options.agentEnv,
      OAHS_SPEC_FILE: specAbs,
      OAHS_STORY_ID: workItem.externalKey,
    },
  });
  const agentExitCode = invoked.status ?? -1;
  if (options.failpoint === 'before_report') {
    return {
      ...base,
      outcome: 'crashed',
      details: 'failpoint before_report: died after the agent ran, before reporting',
    };
  }
  const outcome = await finishRun({
    ...finishArgs,
    workDir: worktreeDir,
    baseline,
    agentExitCode,
  });
  removeWorktree(worktreeDir, repoPath);
  return { ...base, outcome };
}
async function workLoop(options) {
  let stopped = false;
  let wake;
  const onSigint = () => {
    stopped = true;
    wake?.();
  };
  process.once('SIGINT', onSigint);
  try {
    for (;;) {
      const result = await runOnce(options);
      if (options.once === true || stopped) return;
      if (!result.dispatched) {
        await new Promise((resolveSleep) => {
          wake = resolveSleep;
          setTimeout(resolveSleep, options.pollMs ?? 15e3);
        });
        wake = void 0;
        if (stopped) return;
      }
    }
  } finally {
    process.removeListener('SIGINT', onSigint);
  }
}
var DEFAULT_VERIFICATION_ALLOWLIST, MARKER_FILE, ENTRY_STATUS;
var init_src3 = __esm({
  '../../packages/runner/src/index.ts'() {
    'use strict';
    DEFAULT_VERIFICATION_ALLOWLIST = ['node', 'npm', 'pnpm', 'npx', 'pytest', 'python3', 'sh', 'bash', 'git'];
    MARKER_FILE = '.oahs-work-item';
    ENTRY_STATUS = {
      ready_for_dev: 'ready-for-dev',
      in_progress: 'in-progress',
      in_review: 'in-review',
    };
  },
});

// src/cli.ts
import { resolve as resolve3 } from 'node:path';
import { Command } from 'commander';

// ../../packages/contracts/src/index.ts
init_src();
import { z } from 'zod';
var workItemId = z.string().min(1).describe('Work item id (or its stories.yaml externalKey)');
var fencingToken = z.number().int().optional().describe('Fencing token of the live claim \u2014 required for execution-zone mutations');
var evidenceSchema = z
  .object({
    kind: z.enum(['test_run', 'git_diff', 'commit', 'halt_report', 'review_report', 'doc_lint']),
    payload: z.record(z.string(), z.unknown()),
  })
  .describe('Raw machine-collected evidence; the core computes verdicts, the runner never does');
function def(name, description, input, readonly = false) {
  return { name, description, input, readonly };
}
var COMMANDS = [
  // -- setup / admin ---------------------------------------------------------
  def(
    'create_actor',
    'Create a user or agent actor. Returns the actor and its API token (admin only).',
    z.object({
      type: z.enum(['user', 'agent']),
      displayName: z.string().min(1),
      governanceRole: z
        .enum(['admin', 'member', 'auditor'])
        .optional()
        .describe('Bootstrap plumbing (roadmap \xA73): initial governance role \u2014 admin context only'),
    }),
  ),
  def(
    'grant_permission',
    'Grant a permission to an actor (admin only). Grants are explicit and audited \u2014 authority never comes from actor type, tenure, or memory (thesis \xA73).',
    z.object({
      actorId: z.string().min(1),
      permission: z.string().min(1),
      scope: z.string().optional(),
    }),
  ),
  def(
    'revoke_permission',
    'Revoke a permission from an actor (admin only).',
    z.object({
      actorId: z.string().min(1),
      permission: z.string().min(1),
      scope: z.string().optional(),
    }),
  ),
  def('create_feature', 'Create a feature (maps a BMAD epic).', z.object({})),
  def(
    'import_stories',
    'Import a stories.yaml file into a feature (idempotent re-import; validity rules from stories-schema.md).',
    z.object({
      featureId: z.string().min(1),
      yaml: z.string().min(1),
    }),
  ),
  // -- claims ----------------------------------------------------------------
  def(
    'claim_task',
    'Claim a work item under a lease. Returns the claim with its fencing token.',
    z.object({
      workItemId,
      ttlMs: z.number().int().positive().optional(),
    }),
  ),
  def('heartbeat', 'Renew the lease of a live claim.', z.object({ claimId: z.string().min(1) })),
  def(
    'release_claim',
    'Release a claim (normal completion or voluntary handoff).',
    z.object({ claimId: z.string().min(1), reason: z.string().optional() }),
  ),
  // -- lifecycle ---------------------------------------------------------------
  def(
    'advance_state',
    'Advance a work item through the FSM. Deterministic: permission + guards + evidence decide, never interpretation.',
    z.object({
      workItemId,
      to: z.enum(WORK_ITEM_STATES),
      fencingToken,
      idempotencyKey: z.string().optional(),
    }),
  ),
  def(
    'block_task',
    'Set the blocked overlay with a blocking condition from the HALT taxonomy.',
    z.object({
      workItemId,
      reason: z.enum(BLOCKED_REASONS),
      fencingToken,
    }),
  ),
  def('unblock_task', 'Clear the blocked overlay (review_non_convergence needs the review gate grant).', z.object({ workItemId })),
  def(
    'submit_evidence',
    'Submit raw machine-collected evidence (exit codes, diff stats, shas). The core computes verdicts.',
    z.object({ workItemId, evidence: evidenceSchema, fencingToken }),
  ),
  def(
    'approve_gate',
    'Approve a gate as a permitted actor. spec_approval pins the verification commands (D7) and fires draft\u2192ready_for_dev; review_approval checks pinned evidence and fires in_review\u2192done.',
    z.object({
      workItemId,
      gate: z.enum(['spec_approval', 'review_approval']),
      pinnedVerification: z.array(z.string()).optional(),
    }),
  ),
  def(
    'reject_gate',
    'Reject a gate as a permitted actor. Review rejection fires the loopback as a system effect (or blocks with review_non_convergence on the 6th).',
    z.object({
      workItemId,
      gate: z.enum(['spec_approval', 'review_approval']),
    }),
  ),
  def(
    'release_dispatch_hold',
    'Release a done_checkpoint dispatch hold on a feature (permitted actors only).',
    z.object({ featureId: z.string().min(1) }),
  ),
  // -- entitlements (Phase 2, roadmap §3) ---------------------------------------
  // Authority for this group is decided by the ENGINE from the caller's
  // governance role ("entitlement = plan × governance role × delivery role,
  // resolved by a pure function over versioned config/data") — the bus never
  // pre-checks admin here.
  def(
    'assign_role',
    'Assign a delivery role (permission bundle, roadmap \xA73) to an actor. Gated write: requires governance-admin authority; audited.',
    z.object({
      actorId: z.string().min(1),
      roleCode: z.string().min(1).describe('Delivery role code, e.g. reviewer | developer | product_owner'),
    }),
  ),
  def(
    'revoke_role',
    'Revoke a delivery role assignment from an actor. Gated write: requires governance-admin authority; audited.',
    z.object({
      actorId: z.string().min(1),
      roleCode: z.string().min(1),
    }),
  ),
  def(
    'list_role_assignments',
    'List delivery-role assignments (all, or one actor\u2019s), including revoked rows for audit.',
    z.object({ actorId: z.string().min(1).optional() }),
    true,
  ),
  def(
    'set_governance_role',
    'Set an actor\u2019s governance role (admin | member | auditor). Gated write: requires governance-admin authority.',
    z.object({
      actorId: z.string().min(1),
      role: z.enum(['admin', 'member', 'auditor']),
    }),
  ),
  def(
    'set_plan',
    'Set the workspace plan. Plan is a CEILING, never a grant (roadmap \xA73): it bounds what agents may hold/exercise; users are never plan-filtered.',
    z.object({ plan: z.enum(['free', 'team', 'enterprise']) }),
  ),
  def(
    'set_workspace_policy',
    'Set restrict-only workspace policy keys (roadmap \xA73): a policy can narrow what the plan allows, never widen it.',
    z.object({
      policy: z.object({
        agentGateApprovals: z
          .boolean()
          .optional()
          .describe('false \u21D2 agents cannot exercise gate-approval permissions even if granted'),
        agentSelfDispatch: z.boolean().optional().describe('false \u21D2 agents cannot claim tasks on their own (mention-dispatch only)'),
      }),
    }),
  ),
  def(
    'set_gate_policy',
    'Set a gate definition as DATA (roadmap \xA73): min_approvals quorum and required_actor_types \u2014 human-only is a default, not a hardcode.',
    z.object({
      gate: z.enum(['spec_approval', 'review_approval']),
      policy: z.object({
        minApprovals: z.number().int().positive().optional().describe('distinct approvers required per review round'),
        requiredActorTypes: z
          .array(z.enum(['user', 'agent', 'system']))
          .optional()
          .describe('at least one approver of each listed type is required'),
      }),
    }),
  ),
  def(
    'authz_explain',
    'Replayable authz decision trace (roadmap \xA73): source grant/role, plan ceiling, policy, and the policy version tuple an auditor can replay.',
    z.object({
      actorId: z.string().min(1),
      permission: z.string().min(1),
    }),
    true,
  ),
  // -- ops (so nobody ever needs to touch the DB by hand) -----------------------
  def('force_release_claim', 'Ops: force-release the live claim of a work item (stuck runner, lost machine).', z.object({ workItemId })),
  // -- queries -----------------------------------------------------------------
  def('get_work_item', 'Fetch one work item by id or externalKey.', z.object({ workItemId }), true),
  def('get_feature', 'Fetch one feature.', z.object({ featureId: z.string().min(1) }), true),
  def(
    'get_task_context',
    'Dispatch context for a runner: entry state routing per dev-auto. Refuses done items and held features.',
    z.object({ workItemId }),
    true,
  ),
  def(
    'list_work_items',
    'List work items, optionally filtered by state / feature / claimability.',
    z.object({
      state: z.enum(WORK_ITEM_STATES).optional(),
      featureId: z.string().optional(),
      claimable: z.boolean().optional().describe('true = no live claim on the item'),
    }),
    true,
  ),
  def(
    'inbox',
    'Gate-holder inbox: items awaiting a gate decision (draft+spec_checkpoint awaiting spec approval; in_review awaiting review decision).',
    z.object({}),
    true,
  ),
  def(
    'query_events',
    'Audit query: the append-only event log, optionally scoped to one stream.',
    z.object({ streamId: z.string().optional() }),
    true,
  ),
  def('get_claims', 'All claims (live and released) of a work item.', z.object({ workItemId }), true),
  def('whoami', 'Resolve the authenticated actor.', z.object({}), true),
];
var COMMAND_MAP = new Map(COMMANDS.map((c) => [c.name, c]));
function mcpToolName(command) {
  return `oahs_${command}`;
}
function inputJsonSchema(command) {
  const defn = COMMAND_MAP.get(command);
  if (!defn) throw new Error(`unknown command: ${command}`);
  return z.toJSONSchema(defn.input);
}
var HTTP_STATUS = {
  PermissionDeniedError: 403,
  ConflictError: 409,
  GuardFailedError: 422,
  InvalidTransitionError: 422,
  StoriesValidationError: 422,
  Error: 500,
};
var OahsRemoteError = class extends Error {
  constructor(errorName2, message, status) {
    super(message);
    this.errorName = errorName2;
    this.status = status;
    this.name = errorName2;
  }
};
function makeClient(options) {
  const doFetch = options.fetchImpl ?? fetch;
  return {
    async call(command, input = {}) {
      const response = await doFetch(`${options.baseUrl}/rpc/${command}`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${options.token}`,
        },
        body: JSON.stringify(input),
      });
      const envelope = await response.json();
      if (envelope.ok) return envelope.result;
      throw new OahsRemoteError(envelope.error.name, envelope.error.message, response.status);
    },
  };
}

// src/commands/index.ts
init_src();
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// src/format.ts
function toText(cell) {
  if (cell === null || cell === void 0) return '-';
  return String(cell);
}
function renderTable(headers, rows) {
  if (rows.length === 0) return '(empty)';
  const textRows = rows.map((row) => row.map(toText));
  const widths = headers.map((header, col) => Math.max(header.length, ...textRows.map((row) => (row[col] ?? '').length)));
  const line = (cells) =>
    cells
      .map((cell, col) => cell.padEnd(widths[col] ?? cell.length))
      .join('  ')
      .trimEnd();
  const separator = widths.map((w) => '-'.repeat(w)).join('  ');
  return [line(headers), separator, ...textRows.map(line)].join('\n');
}

// src/commands/index.ts
var GATES = ['spec_approval', 'review_approval'];
function assertGate(gate) {
  if (!GATES.includes(gate)) {
    throw new Error(`invalid --gate "${gate}" (expected ${GATES.join(' | ')})`);
  }
}
var WORK_ITEM_HEADERS = ['id', 'externalKey', 'title', 'state', 'blockedReason'];
function workItemRow(item) {
  return [item.id, item.externalKey, item.title, item.state, item.blockedReason];
}
async function inboxCommand(client) {
  const { awaitingSpec, awaitingReview } = await client.call('inbox');
  return [
    'awaiting spec approval:',
    renderTable(WORK_ITEM_HEADERS, awaitingSpec.map(workItemRow)),
    '',
    'awaiting review decision:',
    renderTable(WORK_ITEM_HEADERS, awaitingReview.map(workItemRow)),
  ].join('\n');
}
async function approveCommand(client, opts) {
  assertGate(opts.gate);
  const item = await client.call('approve_gate', {
    workItemId: opts.workItemId,
    gate: opts.gate,
    ...(opts.pin !== void 0 && opts.pin.length > 0 ? { pinnedVerification: opts.pin } : {}),
  });
  const lines = [`approved ${opts.gate} on ${item.externalKey} (${item.id})`, `state: ${item.state}`];
  if (item.pinnedVerification !== null && item.pinnedVerification.length > 0) {
    lines.push(`pinned verification: ${item.pinnedVerification.join(' && ')}`);
  }
  return lines.join('\n');
}
async function advanceCommand(client, opts) {
  const item = await client.call('advance_state', {
    workItemId: opts.workItemId,
    to: opts.to,
    ...(opts.fencingToken !== void 0 ? { fencingToken: opts.fencingToken } : {}),
  });
  return `advanced ${item.externalKey} (${item.id})
state: ${item.state}`;
}
async function rejectCommand(client, opts) {
  assertGate(opts.gate);
  const item = await client.call('reject_gate', {
    workItemId: opts.workItemId,
    gate: opts.gate,
  });
  return [
    `rejected ${opts.gate} on ${item.externalKey} (${item.id})`,
    `state: ${item.state}`,
    `blockedReason: ${item.blockedReason ?? '-'}`,
    `reviewLoopIteration: ${item.reviewLoopIteration}`,
  ].join('\n');
}
async function statusCommand(client) {
  const items = await client.call('list_work_items');
  const rank = new Map(WORK_ITEM_STATES.map((s, i) => [s, i]));
  const sorted = [...items].sort(
    (a, b) => (rank.get(a.state) ?? 0) - (rank.get(b.state) ?? 0) || a.externalKey.localeCompare(b.externalKey),
  );
  const featureIds = [...new Set(items.map((item) => item.featureId))];
  const features2 = [];
  for (const featureId of featureIds) {
    features2.push(await client.call('get_feature', { featureId }));
  }
  return [
    'work items:',
    renderTable(
      ['state', 'id', 'externalKey', 'title', 'blockedReason'],
      sorted.map((item) => [item.state, item.id, item.externalKey, item.title, item.blockedReason]),
    ),
    '',
    'features:',
    renderTable(
      ['id', 'state', 'dispatchHold'],
      features2.map((feature) => [feature.id, feature.state, feature.dispatchHold]),
    ),
  ].join('\n');
}
var GOVERNANCE_ROLES = ['admin', 'member', 'auditor'];
function assertGovernanceRole(role) {
  if (!GOVERNANCE_ROLES.includes(role)) {
    throw new Error(`invalid governance role "${role}" (expected ${GOVERNANCE_ROLES.join(' | ')})`);
  }
}
async function actorCreateCommand(client, opts) {
  if (opts.type !== 'user' && opts.type !== 'agent') {
    throw new Error(`invalid --type "${opts.type}" (expected user | agent)`);
  }
  if (opts.governanceRole !== void 0) assertGovernanceRole(opts.governanceRole);
  const created = await client.call('create_actor', {
    type: opts.type,
    displayName: opts.name,
    ...(opts.governanceRole !== void 0 ? { governanceRole: opts.governanceRole } : {}),
  });
  return [
    `actorId: ${created.actor.id}`,
    `type: ${created.actor.type}`,
    `displayName: ${created.actor.displayName}`,
    `token: ${created.token}`,
  ].join('\n');
}
async function grantCommand(client, opts) {
  await client.call('grant_permission', {
    actorId: opts.actorId,
    permission: opts.permission,
    ...(opts.scope !== void 0 ? { scope: opts.scope } : {}),
  });
  return `granted ${opts.permission} to ${opts.actorId}`;
}
async function featureCreateCommand(client) {
  const feature = await client.call('create_feature');
  return [`featureId: ${feature.id}`, `state: ${feature.state}`].join('\n');
}
async function importStoriesCommand(client, opts) {
  const yaml = readFileSync(resolve(opts.path), 'utf8');
  const result = await client.call('import_stories', {
    featureId: opts.featureId,
    yaml,
  });
  const list = (values) => (values.length > 0 ? values.join(', ') : '(none)');
  return [`imported: ${list(result.imported)}`, `updated: ${list(result.updated)}`, `warnings: ${list(result.warnings)}`].join('\n');
}
async function eventsCommand(client, opts = {}) {
  const events2 = await client.call('query_events', opts.streamId !== void 0 ? { streamId: opts.streamId } : {});
  return renderTable(
    ['seq', 'type', 'stream', 'actor'],
    events2.map((event) => [event.globalSeq, event.type, `${event.streamType}/${event.streamId}#${event.streamSeq}`, event.actorId]),
  );
}
async function roleAssignCommand(client, opts) {
  await client.call('assign_role', { actorId: opts.actorId, roleCode: opts.roleCode });
  return `assigned role ${opts.roleCode} to ${opts.actorId}`;
}
async function roleRevokeCommand(client, opts) {
  await client.call('revoke_role', { actorId: opts.actorId, roleCode: opts.roleCode });
  return `revoked role ${opts.roleCode} from ${opts.actorId}`;
}
async function roleListCommand(client, opts = {}) {
  const assignments = await client.call('list_role_assignments', opts.actorId !== void 0 ? { actorId: opts.actorId } : {});
  return renderTable(
    ['actorId', 'roleCode', 'grantedBy', 'revoked'],
    assignments.map((a) => [a.actorId, a.roleCode, a.grantedBy, a.revoked]),
  );
}
var PLANS = ['free', 'team', 'enterprise'];
async function planSetCommand(client, opts) {
  if (!PLANS.includes(opts.plan)) {
    throw new Error(`invalid plan "${opts.plan}" (expected ${PLANS.join(' | ')})`);
  }
  const result = await client.call('set_plan', { plan: opts.plan });
  return `plan set: ${result.plan} (a ceiling for agent grants \u2014 never a grant itself)`;
}
function parseBoolFlag(flag, value) {
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new Error(`invalid ${flag} "${value}" (expected true | false)`);
}
async function policySetCommand(client, opts) {
  const policy = {
    ...(opts.agentGateApprovals !== void 0 ? { agentGateApprovals: parseBoolFlag('--agent-gate-approvals', opts.agentGateApprovals) } : {}),
    ...(opts.agentSelfDispatch !== void 0 ? { agentSelfDispatch: parseBoolFlag('--agent-self-dispatch', opts.agentSelfDispatch) } : {}),
  };
  if (Object.keys(policy).length === 0) {
    throw new Error('nothing to set: pass --agent-gate-approvals and/or --agent-self-dispatch');
  }
  const effective = await client.call('set_workspace_policy', { policy });
  return [
    'workspace policy (restrict-only \u2014 narrows the plan, never widens it):',
    `  agentGateApprovals: ${effective.agentGateApprovals ?? '(unset)'}`,
    `  agentSelfDispatch: ${effective.agentSelfDispatch ?? '(unset)'}`,
  ].join('\n');
}
async function gatePolicySetCommand(client, opts) {
  assertGate(opts.gate);
  const minApprovals = opts.minApprovals !== void 0 ? Number(opts.minApprovals) : void 0;
  if (minApprovals !== void 0 && (!Number.isInteger(minApprovals) || minApprovals < 1)) {
    throw new Error(`invalid --min-approvals "${opts.minApprovals}" (expected a positive integer)`);
  }
  const requireTypes = opts.requireTypes ?? [];
  for (const type of requireTypes) {
    if (type !== 'user' && type !== 'agent' && type !== 'system') {
      throw new Error(`invalid --require-type "${type}" (expected user | agent | system)`);
    }
  }
  if (minApprovals === void 0 && requireTypes.length === 0) {
    throw new Error('nothing to set: pass --min-approvals and/or --require-type');
  }
  const result = await client.call('set_gate_policy', {
    gate: opts.gate,
    policy: {
      ...(minApprovals !== void 0 ? { minApprovals } : {}),
      ...(requireTypes.length > 0 ? { requiredActorTypes: requireTypes } : {}),
    },
  });
  return [
    `gate policy set on ${result.gate} (gate definitions are data, roadmap \xA73):`,
    `  minApprovals: ${result.policy.minApprovals ?? 1}`,
    `  requiredActorTypes: ${result.policy.requiredActorTypes !== void 0 && result.policy.requiredActorTypes.length > 0 ? result.policy.requiredActorTypes.join(', ') : '(none)'}`,
  ].join('\n');
}
async function governanceSetCommand(client, opts) {
  assertGovernanceRole(opts.role);
  await client.call('set_governance_role', { actorId: opts.actorId, role: opts.role });
  return `governance role of ${opts.actorId} set to ${opts.role}`;
}
async function authzCommand(client, opts) {
  const explanation = await client.call('authz_explain', {
    actorId: opts.actorId,
    permission: opts.permission,
  });
  return [
    `authz ${explanation.permission} for ${explanation.actorId}: ${explanation.allowed ? 'ALLOWED' : 'DENIED'}`,
    `  source: ${explanation.source ?? '(no grant \u2014 direct or via role)'}`,
    `  governanceRole: ${explanation.governanceRole}`,
    `  plan: ${explanation.plan} (planAllows: ${explanation.planAllows})`,
    `  policyAllows: ${explanation.policyAllows}`,
    `  versions: plan v${explanation.versions.plan}, policy v${explanation.versions.policy}`,
  ].join('\n');
}
async function runToOutput(fn) {
  try {
    return { text: await fn(), exitCode: 0 };
  } catch (error) {
    if (error instanceof Error) {
      return { text: `${error.name}: ${error.message}`, exitCode: 1 };
    }
    return { text: String(error), exitCode: 1 };
  }
}

// src/serve.ts
init_src();
import { randomBytes as randomBytes2 } from 'node:crypto';
import { mkdirSync as mkdirSync2 } from 'node:fs';
import { join as join2 } from 'node:path';

// ../spine-api/src/index.ts
init_src();

// ../spine-api/src/auth.ts
import { createHash, randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync as readFileSync2, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
function hashToken(token) {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}
var TokenStore = class {
  byHash = /* @__PURE__ */ new Map();
  persistPath;
  adminActorId;
  constructor(options) {
    this.persistPath = options?.persistPath;
    if (this.persistPath !== void 0 && existsSync(this.persistPath)) {
      const raw = JSON.parse(readFileSync2(this.persistPath, 'utf8'));
      for (const [hash, record] of Object.entries(raw.tokens)) {
        this.byHash.set(hash, { actorId: record.actorId, isAdmin: record.isAdmin });
      }
      this.adminActorId = raw.adminActorId;
    }
  }
  /** Persisted engine-actor id the bootstrap admin token maps to (if any). */
  getAdminActorId() {
    return this.adminActorId;
  }
  /** Remember (and persist) the bootstrap admin actor mapping. */
  setAdminActorId(actorId) {
    this.adminActorId = actorId;
    this.save();
  }
  /**
   * Register the bootstrap admin token (survives restarts by re-bootstrap,
   * not persistence — the admin credential is configuration, not state).
   */
  bootstrapAdmin(token, actorId = 'admin') {
    this.byHash.set(hashToken(token), { actorId, isAdmin: true });
  }
  /** Issue a fresh token for an actor. The plaintext is returned exactly once. */
  issue(actorId) {
    const token = randomBytes(32).toString('hex');
    this.byHash.set(hashToken(token), { actorId, isAdmin: false });
    this.save();
    return token;
  }
  resolve(token) {
    const record = this.byHash.get(hashToken(token));
    return record ? { ...record } : null;
  }
  save() {
    if (this.persistPath === void 0) return;
    const shape = {
      version: 1,
      tokens: {},
      ...(this.adminActorId !== void 0 ? { adminActorId: this.adminActorId } : {}),
    };
    for (const [hash, record] of this.byHash) {
      if (record.isAdmin) continue;
      shape.tokens[hash] = { ...record };
    }
    mkdirSync(dirname(this.persistPath), { recursive: true });
    writeFileSync(this.persistPath, JSON.stringify(shape, null, 2), 'utf8');
  }
};

// ../spine-api/src/server.ts
init_src();
import Fastify from 'fastify';

// ../spine-api/src/bus.ts
init_src();
function zodMessage(error) {
  const issues = error.issues;
  if (!Array.isArray(issues)) return String(error);
  return issues
    .map((issue) => {
      const path = issue.path && issue.path.length > 0 ? issue.path.join('.') : '(root)';
      return `${path}: ${issue.message ?? 'invalid'}`;
    })
    .join('; ');
}
function requireAdmin(ctx, command) {
  if (!ctx.isAdmin) {
    throw new PermissionDeniedError(`admin:${command}`, ctx.actorId);
  }
}
function createCommandBus(engine, tokens) {
  async function execute(command, input, ctx) {
    const def2 = COMMAND_MAP.get(command);
    if (!def2) throw new GuardFailedError(`unknown command: ${command}`);
    const parsedResult = def2.input.safeParse(input ?? {});
    if (!parsedResult.success) {
      throw new GuardFailedError(`invalid input for ${command}: ${zodMessage(parsedResult.error)}`);
    }
    const parsed = parsedResult.data;
    switch (command) {
      // -- setup / admin -----------------------------------------------------
      case 'create_actor': {
        requireAdmin(ctx, command);
        const p = parsed;
        const actor = engine.createActor({
          type: p.type,
          displayName: p.displayName,
          ...(p.governanceRole !== void 0 ? { governanceRole: p.governanceRole } : {}),
        });
        const token = tokens.issue(actor.id);
        return { actor, token };
      }
      case 'grant_permission': {
        requireAdmin(ctx, command);
        const p = parsed;
        engine.grant({
          actorId: p.actorId,
          permission: p.permission,
          ...(p.scope !== void 0 ? { scope: p.scope } : {}),
        });
        return { granted: true };
      }
      case 'revoke_permission': {
        requireAdmin(ctx, command);
        const p = parsed;
        engine.revoke({
          actorId: p.actorId,
          permission: p.permission,
          ...(p.scope !== void 0 ? { scope: p.scope } : {}),
        });
        return { revoked: true };
      }
      case 'create_feature': {
        return engine.createFeature({ actorId: ctx.actorId });
      }
      // -- entitlements (Phase 2, roadmap §3) ----------------------------------
      // No requireAdmin here: authority is decided by the ENGINE from the
      // caller's governance role (byActorId = the authenticated actor).
      case 'assign_role': {
        const p = parsed;
        engine.assignRole({ actorId: p.actorId, roleCode: p.roleCode, byActorId: ctx.actorId });
        return { assigned: true };
      }
      case 'revoke_role': {
        const p = parsed;
        engine.revokeRole({ actorId: p.actorId, roleCode: p.roleCode, byActorId: ctx.actorId });
        return { revoked: true };
      }
      case 'list_role_assignments': {
        const p = parsed;
        return engine.listRoleAssignments(p.actorId);
      }
      case 'set_governance_role': {
        const p = parsed;
        engine.setGovernanceRole({ actorId: p.actorId, role: p.role, byActorId: ctx.actorId });
        return { actorId: p.actorId, role: p.role };
      }
      case 'set_plan': {
        const p = parsed;
        engine.setPlan({ plan: p.plan, byActorId: ctx.actorId });
        return { plan: engine.getPlan() };
      }
      case 'set_workspace_policy': {
        const p = parsed;
        engine.setWorkspacePolicy({
          policy: {
            ...(p.policy.agentGateApprovals !== void 0 ? { agentGateApprovals: p.policy.agentGateApprovals } : {}),
            ...(p.policy.agentSelfDispatch !== void 0 ? { agentSelfDispatch: p.policy.agentSelfDispatch } : {}),
          },
          byActorId: ctx.actorId,
        });
        return engine.getWorkspacePolicy();
      }
      case 'set_gate_policy': {
        const p = parsed;
        engine.setGatePolicy({
          gate: p.gate,
          policy: {
            ...(p.policy.minApprovals !== void 0 ? { minApprovals: p.policy.minApprovals } : {}),
            ...(p.policy.requiredActorTypes !== void 0 ? { requiredActorTypes: [...p.policy.requiredActorTypes] } : {}),
          },
          byActorId: ctx.actorId,
        });
        return { gate: p.gate, policy: engine.getGatePolicy(p.gate) };
      }
      case 'authz_explain': {
        const p = parsed;
        return engine.authzExplain({ actorId: p.actorId, permission: p.permission });
      }
      case 'import_stories': {
        const p = parsed;
        return engine.importStories({ featureId: p.featureId, yaml: p.yaml, actorId: ctx.actorId });
      }
      // -- claims --------------------------------------------------------------
      case 'claim_task': {
        const p = parsed;
        return engine.claimTask({
          workItemId: p.workItemId,
          actorId: ctx.actorId,
          ...(p.ttlMs !== void 0 ? { ttlMs: p.ttlMs } : {}),
        });
      }
      case 'heartbeat': {
        const p = parsed;
        engine.heartbeat({ claimId: p.claimId });
        return { renewed: true };
      }
      case 'release_claim': {
        const p = parsed;
        engine.releaseClaim({
          claimId: p.claimId,
          ...(p.reason !== void 0 ? { reason: p.reason } : {}),
        });
        return { released: true };
      }
      // -- lifecycle -------------------------------------------------------------
      case 'advance_state': {
        const p = parsed;
        return engine.advanceState({
          workItemId: p.workItemId,
          to: p.to,
          actorId: ctx.actorId,
          ...(p.fencingToken !== void 0 ? { fencingToken: p.fencingToken } : {}),
          ...(p.idempotencyKey !== void 0 ? { idempotencyKey: p.idempotencyKey } : {}),
        });
      }
      case 'block_task': {
        const p = parsed;
        return engine.blockTask({
          workItemId: p.workItemId,
          reason: p.reason,
          actorId: ctx.actorId,
          ...(p.fencingToken !== void 0 ? { fencingToken: p.fencingToken } : {}),
        });
      }
      case 'unblock_task': {
        const p = parsed;
        return engine.unblockTask({ workItemId: p.workItemId, actorId: ctx.actorId });
      }
      case 'submit_evidence': {
        const p = parsed;
        engine.submitEvidence({
          workItemId: p.workItemId,
          evidence: p.evidence,
          actorId: ctx.actorId,
          ...(p.fencingToken !== void 0 ? { fencingToken: p.fencingToken } : {}),
        });
        return { submitted: true };
      }
      case 'approve_gate': {
        const p = parsed;
        return engine.approveGate({
          workItemId: p.workItemId,
          gate: p.gate,
          actorId: ctx.actorId,
          ...(p.pinnedVerification !== void 0 ? { pinnedVerification: p.pinnedVerification } : {}),
        });
      }
      case 'reject_gate': {
        const p = parsed;
        return engine.rejectGate({ workItemId: p.workItemId, gate: p.gate, actorId: ctx.actorId });
      }
      case 'release_dispatch_hold': {
        const p = parsed;
        return engine.releaseDispatchHold({ featureId: p.featureId, actorId: ctx.actorId });
      }
      // -- ops ---------------------------------------------------------------------
      case 'force_release_claim': {
        const p = parsed;
        const unreleased = engine.getClaims(p.workItemId).filter((claim) => !claim.released);
        if (unreleased.length === 0) {
          throw new GuardFailedError(`no live claim on work item ${p.workItemId}`);
        }
        for (const claim of unreleased) {
          engine.releaseClaim({ claimId: claim.id, reason: 'ops force release' });
        }
        return { released: unreleased.map((claim) => claim.id) };
      }
      // -- queries -------------------------------------------------------------------
      case 'get_work_item': {
        const p = parsed;
        return engine.getWorkItem(p.workItemId);
      }
      case 'get_feature': {
        const p = parsed;
        return engine.getFeature(p.featureId);
      }
      case 'get_task_context': {
        const p = parsed;
        return engine.getTaskContext({ workItemId: p.workItemId });
      }
      case 'list_work_items': {
        const p = parsed;
        return engine.listWorkItems({
          ...(p.state !== void 0 ? { state: p.state } : {}),
          ...(p.featureId !== void 0 ? { featureId: p.featureId } : {}),
          ...(p.claimable !== void 0 ? { claimable: p.claimable } : {}),
        });
      }
      case 'inbox': {
        const awaitingSpec = engine.listWorkItems({ state: 'draft' }).filter((item) => item.specCheckpoint);
        const awaitingReview = engine.listWorkItems({ state: 'in_review' });
        return { awaitingSpec, awaitingReview };
      }
      case 'query_events': {
        const p = parsed;
        return engine.events(p.streamId);
      }
      case 'get_claims': {
        const p = parsed;
        return engine.getClaims(p.workItemId);
      }
      case 'whoami': {
        return { actorId: ctx.actorId, isAdmin: ctx.isAdmin };
      }
    }
    throw new GuardFailedError(`command not wired to the bus: ${command}`);
  }
  return { execute, engine };
}

// ../spine-api/src/mcp.ts
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
var TOOL_TO_COMMAND = new Map(COMMANDS.map((command) => [mcpToolName(command.name), command.name]));
function buildMcpServer(bus, ctx) {
  const server = new Server({ name: 'oahs-spine', version: '0.0.1' }, { capabilities: { tools: {} } });
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: COMMANDS.map((command) => ({
      name: mcpToolName(command.name),
      description: command.description,
      // Verbatim from contracts — the parity test deep-equals this.
      inputSchema: inputJsonSchema(command.name),
    })),
  }));
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const commandName = TOOL_TO_COMMAND.get(request.params.name);
    if (commandName === void 0) {
      return {
        content: [{ type: 'text', text: `unknown tool: ${request.params.name}` }],
        isError: true,
      };
    }
    try {
      const result = await bus.execute(commandName, request.params.arguments ?? {}, ctx);
      return { content: [{ type: 'text', text: JSON.stringify(result ?? null) }] };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: {
                name: errorName(error),
                message: error instanceof Error ? error.message : String(error),
              },
            }),
          },
        ],
        isError: true,
      };
    }
  });
  return server;
}
function registerMcpRoute(app, bus, authenticate) {
  app.post('/mcp', async (request, reply) => {
    const ctx = authenticate(request);
    if (ctx === null) {
      return reply.code(401).send({ jsonrpc: '2.0', error: { code: -32001, message: 'unauthorized' }, id: null });
    }
    const server = buildMcpServer(bus, ctx);
    const transport = new StreamableHTTPServerTransport({ enableJsonResponse: true });
    reply.hijack();
    try {
      await server.connect(transport);
      await transport.handleRequest(request.raw, reply.raw, request.body);
    } finally {
      void transport.close();
      void server.close();
    }
    return reply;
  });
}

// ../spine-api/src/server.ts
function errorName(error) {
  if (error instanceof PermissionDeniedError) return 'PermissionDeniedError';
  if (error instanceof ConflictError) return 'ConflictError';
  if (error instanceof GuardFailedError) return 'GuardFailedError';
  if (error instanceof InvalidTransitionError) return 'InvalidTransitionError';
  if (error instanceof StoriesValidationError) return 'StoriesValidationError';
  return 'Error';
}
function errorEnvelope(error) {
  return {
    ok: false,
    error: {
      name: errorName(error),
      message: error instanceof Error ? error.message : String(error),
    },
  };
}
function ensureBootstrapAdminActor(engine, tokenStore) {
  const persisted = tokenStore.getAdminActorId();
  if (persisted !== void 0) {
    try {
      if (engine.getGovernanceRole(persisted) === 'admin') return persisted;
    } catch {}
  }
  const actor = engine.createActor({
    type: 'user',
    displayName: 'Workspace Admin',
    governanceRole: 'admin',
  });
  tokenStore.setAdminActorId(actor.id);
  return actor.id;
}
async function buildServer(options) {
  const { engine, tokenStore, adminToken } = options;
  tokenStore.bootstrapAdmin(adminToken, ensureBootstrapAdminActor(engine, tokenStore));
  const bus = createCommandBus(engine, tokenStore);
  const app = Fastify({ logger: false });
  const authenticate = (request) => {
    const header = request.headers.authorization;
    if (typeof header !== 'string' || !header.startsWith('Bearer ')) return null;
    const resolved = tokenStore.resolve(header.slice('Bearer '.length).trim());
    return resolved === null ? null : { actorId: resolved.actorId, isAdmin: resolved.isAdmin };
  };
  app.get('/healthz', async () => ({ ok: true }));
  app.post('/rpc/:command', async (request, reply) => {
    const ctx = authenticate(request);
    if (ctx === null) {
      return reply.code(401).send({
        ok: false,
        error: { name: 'Error', message: 'unauthorized: missing or invalid bearer token' },
      });
    }
    const { command } = request.params;
    if (!COMMAND_MAP.has(command)) {
      return reply.code(404).send({
        ok: false,
        error: { name: 'Error', message: `unknown command: ${command}` },
      });
    }
    try {
      const result = await bus.execute(command, request.body ?? {}, ctx);
      return reply.code(200).send({ ok: true, result });
    } catch (error) {
      const envelope = errorEnvelope(error);
      return reply.code(HTTP_STATUS[envelope.error.name]).send(envelope);
    }
  });
  registerMcpRoute(app, bus, authenticate);
  return app;
}

// src/serve.ts
var DEFAULT_PORT = 4517;
async function startServe(options = {}) {
  const adminTokenGenerated = options.adminToken === void 0;
  const adminToken = options.adminToken ?? randomBytes2(32).toString('hex');
  let engineKind;
  let engine;
  let tokenStore;
  if (options.dataDir !== void 0) {
    mkdirSync2(options.dataDir, { recursive: true });
    const { createPgSyncEngine: createPgSyncEngine2 } = await Promise.resolve().then(() => (init_src2(), src_exports));
    engine = createPgSyncEngine2({ dataDir: join2(options.dataDir, 'pg') });
    tokenStore = new TokenStore({ persistPath: join2(options.dataDir, 'tokens.json') });
    engineKind = 'pglite';
  } else {
    engine = createEngine();
    tokenStore = new TokenStore();
    engineKind = 'memory';
  }
  const app = await buildServer({ engine, tokenStore, adminToken });
  await app.listen({ port: options.port ?? DEFAULT_PORT, host: options.host ?? '0.0.0.0' });
  const { port } = app.server.address();
  return {
    url: `http://127.0.0.1:${port}`,
    port,
    adminToken,
    adminTokenGenerated,
    engineKind,
    close: async () => {
      await app.close();
    },
  };
}

// src/cli.ts
var DEFAULT_URL = `http://localhost:${DEFAULT_PORT}`;
function clientFrom(flags) {
  const token = flags.token ?? process.env['OAHS_TOKEN'];
  if (token === void 0 || token.length === 0) {
    throw new Error('missing token: pass --token <token> or set OAHS_TOKEN');
  }
  return makeClient({ baseUrl: flags.url, token });
}
function withClientFlags(cmd) {
  return cmd.option('--url <url>', 'spine-api base URL', DEFAULT_URL).option('--token <token>', 'bearer token (default: env OAHS_TOKEN)');
}
async function emit(fn) {
  const { text: text2, exitCode } = await runToOutput(fn);
  if (exitCode === 0) {
    process.stdout.write(`${text2}
`);
  } else {
    process.stderr.write(`${text2}
`);
    process.exitCode = exitCode;
  }
}
var collect = (value, previous) => [...previous, value];
function buildProgram() {
  const program = new Command();
  program.name('oahs').description('oahs \u2014 Open Agents Harness System CLI (spine server + gate-holder commands)');
  program
    .command('serve')
    .description('start the spine-api (HTTP /rpc/* + MCP /mcp)')
    .option('--port <port>', 'TCP port', String(DEFAULT_PORT))
    .option('--admin-token <token>', 'bootstrap admin token (default: env OAHS_ADMIN_TOKEN, else generated)')
    .option('--data <dir>', 'persistence directory (durable PGlite + token store)')
    .action(async (opts) => {
      try {
        const adminToken = opts.adminToken ?? process.env['OAHS_ADMIN_TOKEN'];
        const handle = await startServe({
          port: Number(opts.port),
          ...(adminToken !== void 0 && adminToken.length > 0 ? { adminToken } : {}),
          ...(opts.data !== void 0 ? { dataDir: resolve3(opts.data) } : {}),
        });
        process.stdout.write(
          `oahs spine-api listening on :${handle.port} (HTTP /rpc/*, MCP /mcp; engine: ${handle.engineKind}${opts.data !== void 0 ? `, data: ${resolve3(opts.data)}` : ''})
`,
        );
        if (handle.adminTokenGenerated) {
          process.stdout.write(`admin token (generated): ${handle.adminToken}
`);
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        process.stderr.write(`${err.name}: ${err.message}
`);
        process.exitCode = 1;
      }
    });
  withClientFlags(program.command('inbox'))
    .description('items awaiting a gate decision (spec approval / review decision)')
    .action(async (opts) => emit(() => inboxCommand(clientFrom(opts))));
  withClientFlags(program.command('approve <workItemId>'))
    .description('approve a gate (spec_approval pins verification commands)')
    .requiredOption('--gate <gate>', 'spec_approval | review_approval')
    .option('--pin <cmd>', 'pin a verification command (repeatable, spec_approval only)', collect, [])
    .action(async (workItemId2, opts) =>
      emit(() => approveCommand(clientFrom(opts), { workItemId: workItemId2, gate: opts.gate, pin: opts.pin })),
    );
  withClientFlags(program.command('advance <workItemId>'))
    .description('advance a work item through the FSM (planning-zone moves for humans)')
    .requiredOption('--to <state>', 'target state, e.g. draft | ready_for_dev')
    .option('--fencing-token <n>', 'fencing token when acting under a claim', (v) => Number(v))
    .action(async (workItemId2, opts) =>
      emit(() =>
        advanceCommand(clientFrom(opts), {
          workItemId: workItemId2,
          to: opts.to,
          ...(opts.fencingToken !== void 0 ? { fencingToken: opts.fencingToken } : {}),
        }),
      ),
    );
  withClientFlags(program.command('reject <workItemId>'))
    .description('reject a gate (review rejection fires the deterministic loopback)')
    .requiredOption('--gate <gate>', 'spec_approval | review_approval')
    .action(async (workItemId2, opts) => emit(() => rejectCommand(clientFrom(opts), { workItemId: workItemId2, gate: opts.gate })));
  withClientFlags(program.command('status'))
    .description('all work items grouped by state, plus feature dispatch holds')
    .action(async (opts) => emit(() => statusCommand(clientFrom(opts))));
  const actor = program.command('actor').description('actor management (admin)');
  withClientFlags(actor.command('create'))
    .description('create a user or agent actor; prints actorId + token (admin only)')
    .requiredOption('--type <type>', 'user | agent')
    .requiredOption('--name <name>', 'display name')
    .option('--governance-role <role>', 'admin | member | auditor (bootstrap plumbing, admin only)')
    .action(async (opts) =>
      emit(() =>
        actorCreateCommand(clientFrom(opts), {
          type: opts.type,
          name: opts.name,
          ...(opts.governanceRole !== void 0 ? { governanceRole: opts.governanceRole } : {}),
        }),
      ),
    );
  withClientFlags(program.command('grant <actorId> <permission>'))
    .description('grant a permission to an actor (admin only)')
    .action(async (actorId, permission, opts) => emit(() => grantCommand(clientFrom(opts), { actorId, permission })));
  const role = program.command('role').description('delivery roles \u2014 permission bundles (roadmap \xA73)');
  withClientFlags(role.command('assign <actorId> <roleCode>'))
    .description('assign a delivery role to an actor (governance-admin only, engine-gated)')
    .action(async (actorId, roleCode, opts) => emit(() => roleAssignCommand(clientFrom(opts), { actorId, roleCode })));
  withClientFlags(role.command('revoke <actorId> <roleCode>'))
    .description('revoke a delivery role from an actor (governance-admin only, engine-gated)')
    .action(async (actorId, roleCode, opts) => emit(() => roleRevokeCommand(clientFrom(opts), { actorId, roleCode })));
  withClientFlags(role.command('list [actorId]'))
    .description('list delivery-role assignments (all, or one actor)')
    .action(async (actorId, opts) => emit(() => roleListCommand(clientFrom(opts), actorId !== void 0 ? { actorId } : {})));
  const plan = program.command('plan').description('workspace plan \u2014 a ceiling, never a grant (roadmap \xA73)');
  withClientFlags(plan.command('set <plan>'))
    .description('set the workspace plan: free | team | enterprise (governance-admin only)')
    .action(async (planCode, opts) => emit(() => planSetCommand(clientFrom(opts), { plan: planCode })));
  const policy = program.command('policy').description('restrict-only workspace policy (roadmap \xA73)');
  withClientFlags(policy.command('set'))
    .description('set restrict-only policy keys (governance-admin only)')
    .option('--agent-gate-approvals <bool>', 'true | false \u2014 may agents exercise gate approvals?')
    .option('--agent-self-dispatch <bool>', 'true | false \u2014 may agents claim tasks on their own?')
    .action(async (opts) =>
      emit(() =>
        policySetCommand(clientFrom(opts), {
          ...(opts.agentGateApprovals !== void 0 ? { agentGateApprovals: opts.agentGateApprovals } : {}),
          ...(opts.agentSelfDispatch !== void 0 ? { agentSelfDispatch: opts.agentSelfDispatch } : {}),
        }),
      ),
    );
  const gatePolicy = program.command('gate-policy').description('gate definitions as data (roadmap \xA73)');
  withClientFlags(gatePolicy.command('set <gate>'))
    .description('set quorum/actor-type requirements of a gate (governance-admin only)')
    .option('--min-approvals <n>', 'distinct approvers required per review round')
    .option('--require-type <type>', 'require at least one approver of this type (repeatable)', collect, [])
    .action(async (gate, opts) =>
      emit(() =>
        gatePolicySetCommand(clientFrom(opts), {
          gate,
          ...(opts.minApprovals !== void 0 ? { minApprovals: opts.minApprovals } : {}),
          ...(opts.requireType.length > 0 ? { requireTypes: opts.requireType } : {}),
        }),
      ),
    );
  const governance = program.command('governance').description('governance roles (roadmap \xA73)');
  withClientFlags(governance.command('set <actorId> <role>'))
    .description('set an actor governance role: admin | member | auditor (governance-admin only)')
    .action(async (actorId, roleCode, opts) => emit(() => governanceSetCommand(clientFrom(opts), { actorId, role: roleCode })));
  withClientFlags(program.command('authz <actorId> <permission>'))
    .description('print the replayable authz decision trace for an actor \xD7 permission (roadmap \xA73)')
    .action(async (actorId, permission, opts) => emit(() => authzCommand(clientFrom(opts), { actorId, permission })));
  const feature = program.command('feature').description('feature management');
  withClientFlags(feature.command('create'))
    .description('create a feature; prints featureId')
    .action(async (opts) => emit(() => featureCreateCommand(clientFrom(opts))));
  withClientFlags(program.command('import <featureId> <storiesYamlPath>'))
    .description('import a stories.yaml file into a feature (idempotent)')
    .action(async (featureId, storiesYamlPath, opts) =>
      emit(() => importStoriesCommand(clientFrom(opts), { featureId, path: storiesYamlPath })),
    );
  withClientFlags(program.command('events [streamId]'))
    .description('audit query over the append-only event log')
    .action(async (streamId, opts) => emit(() => eventsCommand(clientFrom(opts), streamId !== void 0 ? { streamId } : {})));
  withClientFlags(program.command('work'))
    .description('run the BYO worker loop against this spine (requires @oahs/runner)')
    .requiredOption('--repo <path>', 'target project git checkout')
    .requiredOption('--spec-folder <rel>', 'spec folder relative to the repo root')
    .requiredOption('--agent-cmd <template>', 'coding-agent command template ({SPEC_FOLDER} {STORY_ID} {INVOKE_WITH} {WORKTREE})')
    .option('--once', 'dispatch at most one work item, then exit')
    .option('--poll <ms>', 'poll interval in milliseconds')
    .action(async (opts) => {
      try {
        const client = clientFrom(opts);
        const runner = await Promise.resolve().then(() => (init_src3(), src_exports2));
        await runner.workLoop({
          client,
          repoPath: resolve3(opts.repo),
          specFolder: opts.specFolder,
          agentCmd: opts.agentCmd,
          ...(opts.poll !== void 0 ? { pollMs: Number(opts.poll) } : {}),
          ...(opts.once === true ? { once: true } : {}),
        });
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        process.stderr.write(`oahs work failed \u2014 ${err.name}: ${err.message}
`);
        process.exitCode = 1;
      }
    });
  return program;
}
async function main(argv = process.argv) {
  await buildProgram().parseAsync(argv);
}
void main();
export { buildProgram, main };
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vLi4vLi4vcGFja2FnZXMvY29yZS9zcmMvdHlwZXMudHMiLCAiLi4vLi4vLi4vcGFja2FnZXMvY29yZS9zcmMvc3Rvcmllcy50cyIsICIuLi8uLi8uLi9wYWNrYWdlcy9jb3JlL3NyYy9lbmdpbmUudHMiLCAiLi4vLi4vLi4vcGFja2FnZXMvY29yZS9zcmMvaW50ZW50LWhhc2gudHMiLCAiLi4vLi4vLi4vcGFja2FnZXMvY29yZS9zcmMvaW5kZXgudHMiLCAiLi4vLi4vLi4vcGFja2FnZXMvZGIvc3JjL3NjaGVtYS50cyIsICIuLi8uLi8uLi9wYWNrYWdlcy9kYi9zcmMvcGctZW5naW5lLnRzIiwgIi4uLy4uLy4uL3BhY2thZ2VzL2RiL3NyYy9zeW5jLWVuZ2luZS50cyIsICIuLi8uLi8uLi9wYWNrYWdlcy9kYi9zcmMvc2NoZW1hLXNxbC50cyIsICIuLi8uLi8uLi9wYWNrYWdlcy9kYi9zcmMvaW5kZXgudHMiLCAiLi4vLi4vLi4vcGFja2FnZXMvcnVubmVyL3NyYy9pbmRleC50cyIsICIuLi9zcmMvY2xpLnRzIiwgIi4uLy4uLy4uL3BhY2thZ2VzL2NvbnRyYWN0cy9zcmMvaW5kZXgudHMiLCAiLi4vc3JjL2NvbW1hbmRzL2luZGV4LnRzIiwgIi4uL3NyYy9mb3JtYXQudHMiLCAiLi4vc3JjL3NlcnZlLnRzIiwgIi4uLy4uL3NwaW5lLWFwaS9zcmMvaW5kZXgudHMiLCAiLi4vLi4vc3BpbmUtYXBpL3NyYy9hdXRoLnRzIiwgIi4uLy4uL3NwaW5lLWFwaS9zcmMvc2VydmVyLnRzIiwgIi4uLy4uL3NwaW5lLWFwaS9zcmMvYnVzLnRzIiwgIi4uLy4uL3NwaW5lLWFwaS9zcmMvbWNwLnRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyIvKipcbiAqIEBvYWhzL2NvcmUgXHUyMDE0IHR5cGVzLCBlcnJvcnMsIGFuZCB2b2NhYnVsYXJ5IG9mIHRoZSBkZXRlcm1pbmlzdGljIHNwaW5lLlxuICpcbiAqIFRoZSBjb25mb3JtYW5jZSBzdWl0ZSBpbiB0ZXN0LyB3YXMgd3JpdHRlbiBGSVJTVCwgZnJvbSB0aGUgcHJvc2UgcnVsZXMgaW5cbiAqIHRoZSBCTUFEIHNvdXJjZSAoYm1hZC1zcHJpbnQtcGxhbm5pbmcsIGJtYWQtZGV2LWF1dG8sIGJtYWQtcXVpY2stZGV2LFxuICogc3Rvcmllcy1zY2hlbWEubWQpIGFzIGFyYml0cmF0ZWQgaW4gcHJvZHVjdC1yb2FkbWFwLm1kIFx1MDBBNzEuIFRoZSBlbmdpbmUgaXNcbiAqIGltcGxlbWVudGVkIHRvIG1ha2UgdGhhdCBzdWl0ZSBwYXNzIFx1MjAxNCBuZXZlciB0aGUgb3RoZXIgd2F5IGFyb3VuZC5cbiAqXG4gKiBJbnZhcmlhbnRzIGVuZm9yY2VkIGhlcmUgZm9yZXZlciAocHJvZHVjdC1yb2FkbWFwLm1kIFx1MDBBNzAuMSk6XG4gKiAgLSBObyBMTE0gU0RLIGltcG9ydC4gRXZlci4gKENJIGxpbnQpXG4gKiAgLSBFdmVyeSBtdXRhdGlvbiBnb2VzIHRocm91Z2ggYSBjb21tYW5kOyBjb21tYW5kcyBlbWl0IGV2ZW50czsgcHJvamVjdGlvbnNcbiAqICAgIGFyZSBjb25zZXF1ZW5jZXMgb2YgZXZlbnRzLlxuICovXG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gRXJyb3JzXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuZXhwb3J0IGNsYXNzIE5vdEltcGxlbWVudGVkRXJyb3IgZXh0ZW5kcyBFcnJvciB7XG4gIGNvbnN0cnVjdG9yKHdoYXQ6IHN0cmluZykge1xuICAgIHN1cGVyKGBOb3QgaW1wbGVtZW50ZWQ6ICR7d2hhdH1gKTtcbiAgICB0aGlzLm5hbWUgPSAnTm90SW1wbGVtZW50ZWRFcnJvcic7XG4gIH1cbn1cblxuLyoqIENvbW1hbmQgcmVqZWN0ZWQ6IGFjdG9yIGxhY2tzIHRoZSByZXF1aXJlZCBncmFudC4gKi9cbmV4cG9ydCBjbGFzcyBQZXJtaXNzaW9uRGVuaWVkRXJyb3IgZXh0ZW5kcyBFcnJvciB7XG4gIGNvbnN0cnVjdG9yKFxuICAgIHB1YmxpYyByZWFkb25seSBwZXJtaXNzaW9uOiBQZXJtaXNzaW9uLFxuICAgIHB1YmxpYyByZWFkb25seSBhY3RvcklkOiBzdHJpbmcsXG4gICkge1xuICAgIHN1cGVyKGBwZXJtaXNzaW9uIGRlbmllZDogJHtwZXJtaXNzaW9ufSBmb3IgYWN0b3IgJHthY3RvcklkfWApO1xuICAgIHRoaXMubmFtZSA9ICdQZXJtaXNzaW9uRGVuaWVkRXJyb3InO1xuICB9XG59XG5cbi8qKiBDb21tYW5kIHJlamVjdGVkOiBGU00gZ3VhcmQgZmFpbGVkIChpbmNsdWRlcyB0aGUgbWFjaGluZS1yZWFkYWJsZSBndWFyZCBjb2RlKS4gKi9cbmV4cG9ydCBjbGFzcyBHdWFyZEZhaWxlZEVycm9yIGV4dGVuZHMgRXJyb3Ige1xuICBjb25zdHJ1Y3RvcihwdWJsaWMgcmVhZG9ubHkgZ3VhcmQ6IHN0cmluZykge1xuICAgIHN1cGVyKGBndWFyZCBmYWlsZWQ6ICR7Z3VhcmR9YCk7XG4gICAgdGhpcy5uYW1lID0gJ0d1YXJkRmFpbGVkRXJyb3InO1xuICB9XG59XG5cbi8qKiBDb21tYW5kIHJlamVjdGVkOiBzdGFsZSBmZW5jaW5nIHRva2VuIG9yIHN0YXRlX3ZlcnNpb24gY29uZmxpY3QgKEhUVFAgNDA5IHNlbWFudGljcykuICovXG5leHBvcnQgY2xhc3MgQ29uZmxpY3RFcnJvciBleHRlbmRzIEVycm9yIHtcbiAgY29uc3RydWN0b3IocHVibGljIHJlYWRvbmx5IHJlYXNvbjogc3RyaW5nKSB7XG4gICAgc3VwZXIoYGNvbmZsaWN0OiAke3JlYXNvbn1gKTtcbiAgICB0aGlzLm5hbWUgPSAnQ29uZmxpY3RFcnJvcic7XG4gIH1cbn1cblxuLyoqIFRyYW5zaXRpb24gbm90IGRlY2xhcmVkIGluIHRoZSB0YWJsZSAoaW5jbHVkZXMgbmV2ZXItZG93bmdyYWRlIHJlamVjdGlvbnMpLiAqL1xuZXhwb3J0IGNsYXNzIEludmFsaWRUcmFuc2l0aW9uRXJyb3IgZXh0ZW5kcyBFcnJvciB7XG4gIGNvbnN0cnVjdG9yKFxuICAgIHB1YmxpYyByZWFkb25seSBmcm9tOiBXb3JrSXRlbVN0YXRlLFxuICAgIHB1YmxpYyByZWFkb25seSB0bzogV29ya0l0ZW1TdGF0ZSxcbiAgKSB7XG4gICAgc3VwZXIoYGludmFsaWQgdHJhbnNpdGlvbjogJHtmcm9tfSAtPiAke3RvfWApO1xuICAgIHRoaXMubmFtZSA9ICdJbnZhbGlkVHJhbnNpdGlvbkVycm9yJztcbiAgfVxufVxuXG4vKiogc3Rvcmllcy55YW1sIGZhaWxlZCBhIHZhbGlkaXR5IHJ1bGUgKHN0b3JpZXMtc2NoZW1hLm1kKS4gKi9cbmV4cG9ydCBjbGFzcyBTdG9yaWVzVmFsaWRhdGlvbkVycm9yIGV4dGVuZHMgRXJyb3Ige1xuICBjb25zdHJ1Y3RvcihwdWJsaWMgcmVhZG9ubHkgcnVsZTogc3RyaW5nKSB7XG4gICAgc3VwZXIoYHN0b3JpZXMueWFtbCBpbnZhbGlkOiAke3J1bGV9YCk7XG4gICAgdGhpcy5uYW1lID0gJ1N0b3JpZXNWYWxpZGF0aW9uRXJyb3InO1xuICB9XG59XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gVm9jYWJ1bGFyeSAocHJvZHVjdC1yb2FkbWFwLm1kIFx1MDBBNzAuMiwgXHUwMEE3MS4xKVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbmV4cG9ydCB0eXBlIEFjdG9yVHlwZSA9ICd1c2VyJyB8ICdhZ2VudCcgfCAnc3lzdGVtJztcblxuZXhwb3J0IGNvbnN0IFdPUktfSVRFTV9TVEFURVMgPSBbXG4gICdiYWNrbG9nJyxcbiAgJ2RyYWZ0JyxcbiAgJ3JlYWR5X2Zvcl9kZXYnLFxuICAnaW5fcHJvZ3Jlc3MnLFxuICAnaW5fcmV2aWV3JyxcbiAgJ2RvbmUnLFxuXSBhcyBjb25zdDtcbmV4cG9ydCB0eXBlIFdvcmtJdGVtU3RhdGUgPSAodHlwZW9mIFdPUktfSVRFTV9TVEFURVMpW251bWJlcl07XG5cbi8qKiBibG9ja2VkIGlzIGFuIE9WRVJMQVksIG5vdCBhIHN0YXRlIChyb2FkbWFwIEQ4KS4gVGF4b25vbXkgZnJvbSBkZXYtYXV0byBIQUxULiAqL1xuZXhwb3J0IGNvbnN0IEJMT0NLRURfUkVBU09OUyA9IFtcbiAgJ3VuY2xlYXJfaW50ZW50JyxcbiAgJ25vX3N0b3JpZXNfeWFtbF9mb3VuZCcsXG4gICdhbWJpZ3VvdXNfc3RvcnlfZmlsZV9tYXRjaCcsXG4gICdyZXZpZXdfbm9uX2NvbnZlcmdlbmNlJyxcbiAgJ25vX3N1YmFnZW50cycsXG4gICdkaXJ0eV90cmVlJyxcbiAgJ3N0YWxlX3dvcmt0cmVlJyxcbiAgJ2F3YWl0aW5nX2h1bWFuX2lucHV0JyxcbiAgJ290aGVyJyxcbl0gYXMgY29uc3Q7XG5leHBvcnQgdHlwZSBCbG9ja2VkUmVhc29uID0gKHR5cGVvZiBCTE9DS0VEX1JFQVNPTlMpW251bWJlcl07XG5cbmV4cG9ydCB0eXBlIFBlcm1pc3Npb24gPVxuICB8ICd0YXNrLnBsYW4nXG4gIHwgJ3Rhc2suY2xhaW0nXG4gIHwgJ3Rhc2suYWR2YW5jZSdcbiAgfCAndGFzay5ibG9jaydcbiAgfCAnZ2F0ZS5zcGVjLmFwcHJvdmUnXG4gIHwgJ2dhdGUucmV2aWV3LmFwcHJvdmUnXG4gIHwgJ2dhdGUucmV2aWV3LnJlamVjdCcgLy8gUGhhc2UgMjogcmVqZWN0aW9uLWxvb3BiYWNrIFdJVEhPVVQgZG9uZS1hcHByb3ZhbCAocm9hZG1hcCBQaGFzZSAyIGV4aXQgY3JpdGVyaW9uKVxuICB8ICdmZWF0dXJlLmluaXQnXG4gIHwgJ2ZlYXR1cmUuYWR2YW5jZSdcbiAgfCAnZGlzcGF0Y2gucmVsZWFzZV9ob2xkJ1xuICB8ICdpbnRlbnQuZWRpdCdcbiAgfCAnc3RhdGUuZG93bmdyYWRlJ1xuICB8ICdvcHMuZm9yY2VfcmVsZWFzZV9jbGFpbSdcbiAgfCAnZ292ZXJuYW5jZS5hZG1pbic7IC8vIFBoYXNlIDI6IGF1dGhvcml0eSBvdmVyIGdhdGVkIGVudGl0bGVtZW50IHdyaXRlcyAoaGVsZCB2aWEgZ292ZXJuYW5jZSByb2xlLCBub3QgZ3JhbnRzKVxuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIEVudGl0bGVtZW50cyAoUGhhc2UgMiwgcm9hZG1hcCBcdTAwQTczKTogcGxhbiBcdTAwRDcgZ292ZXJuYW5jZSByb2xlIFx1MDBENyBkZWxpdmVyeSByb2xlLlxuLy8gUmVzb2x1dGlvbiBpcyBhIFBVUkUgZnVuY3Rpb24gb3ZlciB0aGlzIGRhdGEgXHUyMDE0IG5vIGludGVycHJldGF0aW9uIGFueXdoZXJlLlxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbmV4cG9ydCB0eXBlIEdvdmVybmFuY2VSb2xlID0gJ2FkbWluJyB8ICdtZW1iZXInIHwgJ2F1ZGl0b3InO1xuXG5leHBvcnQgdHlwZSBQbGFuQ29kZSA9ICdmcmVlJyB8ICd0ZWFtJyB8ICdlbnRlcnByaXNlJztcblxuLyoqXG4gKiBQbGFuIGlzIGEgQ0VJTElORywgbmV2ZXIgYSBncmFudCAocm9hZG1hcCBcdTAwQTczKS4gSXQgYm91bmRzIHdoYXQgbWF5IGJlXG4gKiBncmFudGVkIHRvIEFHRU5UIGFjdG9yczsgdXNlciBhY3RvcnMgYXJlIG5ldmVyIHBsYW4tZmlsdGVyZWQuIEVuZm9yY2VkIGluXG4gKiB0aGUgcmVzb2x2ZXIgYW5kIGF0IGdyYW50IHRpbWUgXHUyMDE0IG5vd2hlcmUgZWxzZS5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBQbGFuQ2VpbGluZyB7XG4gIC8qKiBtYXkgYWdlbnRzIGhvbGQgZ2F0ZS1BUFBST1ZBTCBwZXJtaXNzaW9ucyAoc3BlYy9yZXZpZXcgYXBwcm92ZSk/ICovXG4gIGFnZW50R2F0ZUFwcHJvdmU6IGJvb2xlYW47XG4gIC8qKiBtYXkgYWdlbnRzIGhvbGQgdGhlIHJlamVjdGlvbi1sb29wYmFjayBwZXJtaXNzaW9uPyAqL1xuICBhZ2VudEdhdGVSZWplY3Q6IGJvb2xlYW47XG59XG5cbmV4cG9ydCBjb25zdCBQTEFOX0NFSUxJTkdTOiBSZWNvcmQ8UGxhbkNvZGUsIFBsYW5DZWlsaW5nPiA9IHtcbiAgZnJlZTogeyBhZ2VudEdhdGVBcHByb3ZlOiBmYWxzZSwgYWdlbnRHYXRlUmVqZWN0OiBmYWxzZSB9LFxuICB0ZWFtOiB7IGFnZW50R2F0ZUFwcHJvdmU6IGZhbHNlLCBhZ2VudEdhdGVSZWplY3Q6IHRydWUgfSxcbiAgZW50ZXJwcmlzZTogeyBhZ2VudEdhdGVBcHByb3ZlOiB0cnVlLCBhZ2VudEdhdGVSZWplY3Q6IHRydWUgfSxcbn07XG5cbi8qKiBTZWxmLWhvc3QgZGVmYXVsdDogdGhlIGNlaWxpbmcgaXMgb3BlbjsgdGhlIG9yZyBuYXJyb3dzIChyZXN0cmljdC1vbmx5KS4gKi9cbmV4cG9ydCBjb25zdCBERUZBVUxUX1BMQU46IFBsYW5Db2RlID0gJ2VudGVycHJpc2UnO1xuXG4vKiogR2F0ZS1hcHByb3ZhbCBwZXJtaXNzaW9ucyBib3VuZGVkIGJ5IFBsYW5DZWlsaW5nLmFnZW50R2F0ZUFwcHJvdmUuICovXG5leHBvcnQgY29uc3QgQUdFTlRfR0FURV9BUFBST1ZFX1BFUk1JU1NJT05TOiByZWFkb25seSBQZXJtaXNzaW9uW10gPSBbXG4gICdnYXRlLnNwZWMuYXBwcm92ZScsXG4gICdnYXRlLnJldmlldy5hcHByb3ZlJyxcbl07XG5cbi8qKlxuICogRGVsaXZlcnkgcm9sZXMgKHJvYWRtYXAgXHUwMEE3MykgXHUyMDE0IHBlcm1pc3Npb24gYnVuZGxlcywgdmVyc2lvbmVkIGRhdGEgb2YgdGhlXG4gKiBSdWxlcyBsYXllci4gQW4gYXNzaWdubWVudCBncmFudHMgdGhlIGJ1bmRsZTsgcmV2b2NhdGlvbiByZW1vdmVzIGl0LlxuICovXG5leHBvcnQgY29uc3QgREVMSVZFUllfUk9MRVM6IFJlY29yZDxzdHJpbmcsIHJlYWRvbmx5IFBlcm1pc3Npb25bXT4gPSB7XG4gIHByb2R1Y3Rfb3duZXI6IFsndGFzay5wbGFuJywgJ2ZlYXR1cmUuaW5pdCcsICdmZWF0dXJlLmFkdmFuY2UnLCAnZ2F0ZS5zcGVjLmFwcHJvdmUnLCAnZGlzcGF0Y2gucmVsZWFzZV9ob2xkJ10sXG4gIHRlY2hfbGVhZDogWyd0YXNrLnBsYW4nLCAnZ2F0ZS5yZXZpZXcuYXBwcm92ZScsICdnYXRlLnJldmlldy5yZWplY3QnLCAnc3RhdGUuZG93bmdyYWRlJywgJ29wcy5mb3JjZV9yZWxlYXNlX2NsYWltJ10sXG4gIHJldmlld2VyOiBbJ2dhdGUucmV2aWV3LmFwcHJvdmUnLCAnZ2F0ZS5yZXZpZXcucmVqZWN0J10sXG4gIGRldmVsb3BlcjogWyd0YXNrLmNsYWltJywgJ3Rhc2suYWR2YW5jZScsICd0YXNrLmJsb2NrJ10sXG4gIHFhOiBbJ3Rhc2suYmxvY2snXSxcbiAgY29udHJpYnV0b3I6IFtdLFxufTtcblxuLyoqXG4gKiBXb3Jrc3BhY2UgcG9saWN5IFx1MjAxNCBSRVNUUklDVC1PTkxZIGtleXMgKHJvYWRtYXAgXHUwMEE3Myk6IGEgcG9saWN5IGNhbiBuYXJyb3dcbiAqIHdoYXQgdGhlIHBsYW4gYWxsb3dzLCBuZXZlciB3aWRlbiBpdC4gVW5kZWZpbmVkID0gbm8gcmVzdHJpY3Rpb24uXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgV29ya3NwYWNlUG9saWN5IHtcbiAgLyoqIGZhbHNlIFx1MjFEMiBhZ2VudHMgY2Fubm90IGV4ZXJjaXNlIGdhdGUtYXBwcm92YWwgcGVybWlzc2lvbnMgZXZlbiBpZiBncmFudGVkICovXG4gIGFnZW50R2F0ZUFwcHJvdmFscz86IGJvb2xlYW47XG4gIC8qKiBmYWxzZSBcdTIxRDIgYWdlbnRzIGNhbm5vdCBjbGFpbSB0YXNrcyBvbiB0aGVpciBvd24gKG1lbnRpb24tZGlzcGF0Y2ggb25seSwgUGhhc2UgMykgKi9cbiAgYWdlbnRTZWxmRGlzcGF0Y2g/OiBib29sZWFuO1xufVxuXG4vKiogR2F0ZSBkZWZpbml0aW9ucyBhcmUgZGF0YSAocm9hZG1hcCBcdTAwQTczKTogcXVvcnVtICsgYWN0b3ItdHlwZSByZXF1aXJlbWVudHMuICovXG5leHBvcnQgaW50ZXJmYWNlIEdhdGVQb2xpY3kge1xuICAvKiogZGlzdGluY3QgYXBwcm92ZXJzIHJlcXVpcmVkIGluIHRoZSBjdXJyZW50IHJldmlldyByb3VuZCAoZGVmYXVsdCAxKSAqL1xuICBtaW5BcHByb3ZhbHM/OiBudW1iZXI7XG4gIC8qKiBhdCBsZWFzdCBvbmUgYXBwcm92ZXIgb2YgZWFjaCBsaXN0ZWQgdHlwZSBpcyByZXF1aXJlZCAoZS5nLiBbJ3VzZXInXSkgKi9cbiAgcmVxdWlyZWRBY3RvclR5cGVzPzogQWN0b3JUeXBlW107XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUm9sZUFzc2lnbm1lbnQge1xuICBhY3RvcklkOiBzdHJpbmc7XG4gIHJvbGVDb2RlOiBzdHJpbmc7XG4gIGdyYW50ZWRCeTogc3RyaW5nO1xuICByZXZva2VkOiBib29sZWFuO1xufVxuXG4vKiogYXV0aHouZXhwbGFpbiBcdTIwMTQgdGhlIGRlY2lzaW9uIHRyYWNlIGFuIGF1ZGl0b3IgY2FuIHJlcGxheSAocm9hZG1hcCBcdTAwQTczKS4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQXV0aHpFeHBsYW5hdGlvbiB7XG4gIGFjdG9ySWQ6IHN0cmluZztcbiAgcGVybWlzc2lvbjogUGVybWlzc2lvbjtcbiAgYWxsb3dlZDogYm9vbGVhbjtcbiAgLyoqICdkaXJlY3QnIHwgJ3JvbGU6PGNvZGU+JyB3aGVuIGEgZ3JhbnQgZXhpc3RzOyBudWxsIHdoZW4gbm9uZSBkb2VzICovXG4gIHNvdXJjZTogc3RyaW5nIHwgbnVsbDtcbiAgZ292ZXJuYW5jZVJvbGU6IEdvdmVybmFuY2VSb2xlO1xuICBwbGFuOiBQbGFuQ29kZTtcbiAgLyoqIGZhbHNlIHdoZW4gdGhlIHBsYW4gY2VpbGluZyBibG9ja3MgYW4gYWdlbnQncyBnYXRlIHBlcm1pc3Npb24gKi9cbiAgcGxhbkFsbG93czogYm9vbGVhbjtcbiAgLyoqIGZhbHNlIHdoZW4gdGhlIHJlc3RyaWN0LW9ubHkgd29ya3NwYWNlIHBvbGljeSBibG9ja3MgaXQgKi9cbiAgcG9saWN5QWxsb3dzOiBib29sZWFuO1xuICB2ZXJzaW9uczogeyBwbGFuOiBudW1iZXI7IHBvbGljeTogbnVtYmVyIH07XG59XG5cbmV4cG9ydCB0eXBlIEdhdGVDb2RlID0gJ3NwZWNfYXBwcm92YWwnIHwgJ3Jldmlld19hcHByb3ZhbCc7XG5cbmV4cG9ydCB0eXBlIEV2aWRlbmNlS2luZCA9XG4gIHwgJ3Rlc3RfcnVuJyAvLyB7Y29tbWFuZCwgZXhpdENvZGV9ICBcdTIwMTQgY29tbWFuZCBNVVNUIG1hdGNoIGEgcGlubmVkIG9uZVxuICB8ICdnaXRfZGlmZicgLy8ge2Jhc2VsaW5lLCBmaW5hbCwgZmlsZXNDaGFuZ2VkLCBub25FbXB0eSwgYnJhbmNofVxuICB8ICdjb21taXQnIC8vIHtzaGEsIGJyYW5jaCwgcmVhY2hhYmxlT25SZW1vdGV9XG4gIHwgJ2hhbHRfcmVwb3J0JyAvLyB2ZXJiYXRpbSBBdXRvIFJ1biBSZXN1bHRcbiAgfCAncmV2aWV3X3JlcG9ydCcgLy8gTExNLWF1dGhvcmVkOyBORVZFUiBhIGd1YXJkLCBjb250ZXh0IG9ubHlcbiAgfCAnZG9jX2xpbnQnOyAvLyB7c2NoZW1hVmFsaWR9IGZvciBub24tY29kZSB3b3JrXG5cbmV4cG9ydCBpbnRlcmZhY2UgRXZpZGVuY2Uge1xuICBraW5kOiBFdmlkZW5jZUtpbmQ7XG4gIHBheWxvYWQ6IFJlY29yZDxzdHJpbmcsIHVua25vd24+O1xufVxuXG4vKiogUmV2aWV3IGxvb3A6IGV4YWN0bHkgdGhpcyBtYW55IGxvb3BiYWNrcyBhbGxvd2VkOyB0aGUgbmV4dCBvbmUgYmxvY2tzLiAqL1xuZXhwb3J0IGNvbnN0IFJFVklFV19MT09QX0xJTUlUID0gNTtcblxuZXhwb3J0IGNvbnN0IElOVEVOVF9IQVNIX0FMR08gPSAndjEnO1xuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIEVudGl0aWVzIChwcm9qZWN0aW9uIHNoYXBlcyByZXR1cm5lZCBieSBxdWVyaWVzKVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbmV4cG9ydCBpbnRlcmZhY2UgQWN0b3Ige1xuICBpZDogc3RyaW5nO1xuICB0eXBlOiBBY3RvclR5cGU7XG4gIGRpc3BsYXlOYW1lOiBzdHJpbmc7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgRmVhdHVyZSB7XG4gIGlkOiBzdHJpbmc7XG4gIHN0YXRlOiAnYmFja2xvZycgfCAnaW5fcHJvZ3Jlc3MnIHwgJ2RvbmUnO1xuICAvKiogdHJ1ZSB3aGlsZSBhIGRvbmVfY2hlY2twb2ludCBob2xkIGlzIGFjdGl2ZTogbm8gZnVydGhlciBkaXNwYXRjaCBpbiB0aGlzIGZlYXR1cmUgKi9cbiAgZGlzcGF0Y2hIb2xkOiBib29sZWFuO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFdvcmtJdGVtIHtcbiAgaWQ6IHN0cmluZztcbiAgZmVhdHVyZUlkOiBzdHJpbmc7XG4gIGV4dGVybmFsS2V5OiBzdHJpbmc7IC8vIGlkIGZyb20gc3Rvcmllcy55YW1sLCBlLmcuIFwiMy0yXCJcbiAgdGl0bGU6IHN0cmluZztcbiAgc3RhdGU6IFdvcmtJdGVtU3RhdGU7XG4gIGJsb2NrZWRSZWFzb246IEJsb2NrZWRSZWFzb24gfCBudWxsO1xuICByZXZpZXdMb29wSXRlcmF0aW9uOiBudW1iZXI7XG4gIGludGVudEhhc2g6IHN0cmluZyB8IG51bGw7XG4gIHBpbm5lZFZlcmlmaWNhdGlvbjogc3RyaW5nW10gfCBudWxsO1xuICBzcGVjQ2hlY2twb2ludDogYm9vbGVhbjtcbiAgZG9uZUNoZWNrcG9pbnQ6IGJvb2xlYW47XG4gIGludm9rZURldldpdGg6IHN0cmluZztcbiAgc3BlY1BhdGg6IHN0cmluZztcbiAgc3RhdGVWZXJzaW9uOiBudW1iZXI7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ2xhaW0ge1xuICBpZDogc3RyaW5nO1xuICB3b3JrSXRlbUlkOiBzdHJpbmc7XG4gIGFjdG9ySWQ6IHN0cmluZztcbiAgZmVuY2luZ1Rva2VuOiBudW1iZXI7XG4gIGxlYXNlRXhwaXJlc0F0OiBudW1iZXI7IC8vIGVuZ2luZS1jbG9jayBtc1xuICByZWxlYXNlZDogYm9vbGVhbjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBTcGluZUV2ZW50IHtcbiAgZ2xvYmFsU2VxOiBudW1iZXI7XG4gIHN0cmVhbVR5cGU6ICd3b3Jrc3BhY2UnIHwgJ2ZlYXR1cmUnIHwgJ3dvcmtfaXRlbScgfCAnYWN0b3InO1xuICBzdHJlYW1JZDogc3RyaW5nO1xuICBzdHJlYW1TZXE6IG51bWJlcjtcbiAgdHlwZTogc3RyaW5nO1xuICBhY3RvcklkOiBzdHJpbmc7XG4gIHBheWxvYWQ6IFJlY29yZDxzdHJpbmcsIHVua25vd24+O1xuICBjYXVzYXRpb25JZD86IHN0cmluZztcbn1cblxuZXhwb3J0IGludGVyZmFjZSBEaXZlcmdlbmNlUmVwb3J0IHtcbiAgd29ya0l0ZW1JZDogc3RyaW5nO1xuICBmaWxlU3RhdGU6IHN0cmluZztcbiAgZGJTdGF0ZTogV29ya0l0ZW1TdGF0ZTtcbiAga2luZDogJ2ZpbGVfYWhlYWQnIHwgJ2RiX2FoZWFkJyB8ICdjb25mbGljdCc7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgU3Rvcmllc0ltcG9ydFJlc3VsdCB7XG4gIGltcG9ydGVkOiBzdHJpbmdbXTsgLy8gZXh0ZXJuYWxLZXlzIGNyZWF0ZWRcbiAgdXBkYXRlZDogc3RyaW5nW107IC8vIGV4dGVybmFsS2V5cyBhbHJlYWR5IHByZXNlbnQsIHJlZnJlc2hlZFxuICB3YXJuaW5nczogc3RyaW5nW107IC8vIGUuZy4gc2tpcHBlZCByZXRyb3NwZWN0aXZlIGVudHJpZXNcbn1cblxuXG4vLyBUaGUgcHJvZHVjdGlvbiBzZXJ2aWNlIHdyYXBzIHRoZSBzYW1lIGNvcmUgd2l0aCBQb3N0Z3JlcyBwZXJzaXN0ZW5jZS5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5leHBvcnQgaW50ZXJmYWNlIENyZWF0ZVdvcmtJdGVtSW5wdXQge1xuICBmZWF0dXJlSWQ6IHN0cmluZztcbiAgZXh0ZXJuYWxLZXk6IHN0cmluZztcbiAgdGl0bGU6IHN0cmluZztcbiAgc3BlY0NoZWNrcG9pbnQ/OiBib29sZWFuO1xuICBkb25lQ2hlY2twb2ludD86IGJvb2xlYW47XG4gIGludm9rZURldldpdGg/OiBzdHJpbmc7XG4gIGRlcGVuZHNPbj86IHN0cmluZ1tdOyAvLyBleHRlcm5hbEtleXNcbn1cblxuZXhwb3J0IGludGVyZmFjZSBBZHZhbmNlSW5wdXQge1xuICB3b3JrSXRlbUlkOiBzdHJpbmc7XG4gIHRvOiBXb3JrSXRlbVN0YXRlO1xuICBhY3RvcklkOiBzdHJpbmc7XG4gIGZlbmNpbmdUb2tlbj86IG51bWJlcjsgLy8gcmVxdWlyZWQgZm9yIGNsYWltLWd1YXJkZWQgdHJhbnNpdGlvbnNcbiAgaWRlbXBvdGVuY3lLZXk/OiBzdHJpbmc7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgR2F0ZURlY2lzaW9uSW5wdXQge1xuICB3b3JrSXRlbUlkOiBzdHJpbmc7XG4gIGdhdGU6IEdhdGVDb2RlO1xuICBhY3RvcklkOiBzdHJpbmc7XG4gIC8qKiBzcGVjX2FwcHJvdmFsIG9ubHk6IHBpbnMgdmVyaWZpY2F0aW9uIGNvbW1hbmRzIGFzIFJ1bGVzLWxheWVyIGRhdGEgKHJvYWRtYXAgRDcpICovXG4gIHBpbm5lZFZlcmlmaWNhdGlvbj86IHN0cmluZ1tdO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFNwaW5lRW5naW5lIHtcbiAgLy8gLS0gc2V0dXAgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIGNyZWF0ZUFjdG9yKGlucHV0OiB7XG4gICAgdHlwZTogRXhjbHVkZTxBY3RvclR5cGUsICdzeXN0ZW0nPjtcbiAgICBkaXNwbGF5TmFtZTogc3RyaW5nO1xuICAgIC8qKiBib290c3RyYXAgcGx1bWJpbmcgKGxpa2UgY3JlYXRlQWN0b3IgaXRzZWxmKTsgZGVmYXVsdCAnbWVtYmVyJyAqL1xuICAgIGdvdmVybmFuY2VSb2xlPzogR292ZXJuYW5jZVJvbGU7XG4gIH0pOiBBY3RvcjtcbiAgZ3JhbnQoaW5wdXQ6IHsgYWN0b3JJZDogc3RyaW5nOyBwZXJtaXNzaW9uOiBQZXJtaXNzaW9uOyBzY29wZT86IHN0cmluZyB9KTogdm9pZDtcbiAgcmV2b2tlKGlucHV0OiB7IGFjdG9ySWQ6IHN0cmluZzsgcGVybWlzc2lvbjogUGVybWlzc2lvbjsgc2NvcGU/OiBzdHJpbmcgfSk6IHZvaWQ7XG4gIGNyZWF0ZUZlYXR1cmUoaW5wdXQ6IHsgYWN0b3JJZDogc3RyaW5nIH0pOiBGZWF0dXJlO1xuICBjcmVhdGVXb3JrSXRlbShpbnB1dDogQ3JlYXRlV29ya0l0ZW1JbnB1dCAmIHsgYWN0b3JJZDogc3RyaW5nIH0pOiBXb3JrSXRlbTtcblxuICAvKiogSW1wb3J0IHN0b3JpZXMueWFtbCBjb250ZW50IChyYXcgWUFNTCBzdHJpbmcpLiBJZGVtcG90ZW50IHJlLWltcG9ydCBwZXIgc3Rvcmllcy1zY2hlbWEgdXBkYXRlIHNlbWFudGljcy4gKi9cbiAgaW1wb3J0U3RvcmllcyhpbnB1dDogeyBmZWF0dXJlSWQ6IHN0cmluZzsgeWFtbDogc3RyaW5nOyBhY3RvcklkOiBzdHJpbmcgfSk6IFN0b3JpZXNJbXBvcnRSZXN1bHQ7XG5cbiAgLy8gLS0gY2xhaW1zIChyb2FkbWFwIFx1MDBBNzEuMykgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICBjbGFpbVRhc2soaW5wdXQ6IHsgd29ya0l0ZW1JZDogc3RyaW5nOyBhY3RvcklkOiBzdHJpbmc7IHR0bE1zPzogbnVtYmVyIH0pOiBDbGFpbTtcbiAgaGVhcnRiZWF0KGlucHV0OiB7IGNsYWltSWQ6IHN0cmluZyB9KTogdm9pZDtcbiAgcmVsZWFzZUNsYWltKGlucHV0OiB7IGNsYWltSWQ6IHN0cmluZzsgcmVhc29uPzogc3RyaW5nIH0pOiB2b2lkO1xuICAvKiogdGVzdCBjbG9jayBcdTIwMTQgbGVhc2UgZXhwaXJ5IGlzIHRpbWUtYmFzZWQgKi9cbiAgYWR2YW5jZUNsb2NrKG1zOiBudW1iZXIpOiB2b2lkO1xuXG4gIC8vIC0tIGxpZmVjeWNsZSAocm9hZG1hcCBcdTAwQTcxLjIpIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgYWR2YW5jZVN0YXRlKGlucHV0OiBBZHZhbmNlSW5wdXQpOiBXb3JrSXRlbTtcbiAgYmxvY2tUYXNrKGlucHV0OiB7IHdvcmtJdGVtSWQ6IHN0cmluZzsgcmVhc29uOiBCbG9ja2VkUmVhc29uOyBhY3RvcklkOiBzdHJpbmc7IGZlbmNpbmdUb2tlbj86IG51bWJlciB9KTogV29ya0l0ZW07XG4gIHVuYmxvY2tUYXNrKGlucHV0OiB7IHdvcmtJdGVtSWQ6IHN0cmluZzsgYWN0b3JJZDogc3RyaW5nIH0pOiBXb3JrSXRlbTtcblxuICAvLyAtLSBnYXRlcyAmIGV2aWRlbmNlIChyb2FkbWFwIFx1MDBBNzEuNCkgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICBzdWJtaXRFdmlkZW5jZShpbnB1dDogeyB3b3JrSXRlbUlkOiBzdHJpbmc7IGV2aWRlbmNlOiBFdmlkZW5jZTsgYWN0b3JJZDogc3RyaW5nOyBmZW5jaW5nVG9rZW4/OiBudW1iZXIgfSk6IHZvaWQ7XG4gIGFwcHJvdmVHYXRlKGlucHV0OiBHYXRlRGVjaXNpb25JbnB1dCk6IFdvcmtJdGVtO1xuICAvKiogUmVqZWN0aW9uIGZpcmVzIHRoZSBsb29wYmFjayBhcyBhIHN5c3RlbSBlZmZlY3QgXHUyMDE0IG5vIGNsYWltIGhvbGRlciBpbnZvbHZlbWVudCAocm9hZG1hcCBcdTAwQTcxLjIpLiAqL1xuICByZWplY3RHYXRlKGlucHV0OiBHYXRlRGVjaXNpb25JbnB1dCk6IFdvcmtJdGVtO1xuXG4gIC8vIC0tIGRpc3BhdGNoIChyb2FkbWFwIFx1MDBBNzIuMykgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAvKiogUmVmdXNlcyBzdGF0ZT1kb25lIGl0ZW1zOyByZXR1cm5zIGVudHJ5LXN0YXRlIGNvbnRleHQgZm9yIHRoZSBydW5uZXIuICovXG4gIGdldFRhc2tDb250ZXh0KGlucHV0OiB7IHdvcmtJdGVtSWQ6IHN0cmluZyB9KToge1xuICAgIHdvcmtJdGVtOiBXb3JrSXRlbTtcbiAgICBlbnRyeVN0YXRlOiBXb3JrSXRlbVN0YXRlO1xuICB9O1xuICAvKiogUmVsZWFzZXMgYSBkb25lX2NoZWNrcG9pbnQgZGlzcGF0Y2ggaG9sZCBvbiB0aGUgZmVhdHVyZS4gKi9cbiAgcmVsZWFzZURpc3BhdGNoSG9sZChpbnB1dDogeyBmZWF0dXJlSWQ6IHN0cmluZzsgYWN0b3JJZDogc3RyaW5nIH0pOiBGZWF0dXJlO1xuXG4gIC8vIC0tIHJlY29uY2lsaWF0aW9uIChyb2FkbWFwIFx1MDBBNzEuNiwgZGV0ZWN0LW9ubHkpIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgcmVjb25jaWxlKGlucHV0OiB7IGZpbGVzOiBBcnJheTx7IHdvcmtJdGVtSWQ6IHN0cmluZzsgZnJvbnRtYXR0ZXJTdGF0dXM6IHN0cmluZyB9PiB9KTogRGl2ZXJnZW5jZVJlcG9ydFtdO1xuXG4gIC8vIC0tIGVudGl0bGVtZW50cyAoUGhhc2UgMiwgcm9hZG1hcCBcdTAwQTczKSAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgLyoqIEdvdmVybmFuY2UgYXV0aG9yaXR5OiB0aGUgc3lzdGVtIGFjdG9yIGFuZCAnYWRtaW4nIGdvdmVybmFuY2Utcm9sZSBob2xkZXJzLiAqL1xuICBzZXRHb3Zlcm5hbmNlUm9sZShpbnB1dDogeyBhY3RvcklkOiBzdHJpbmc7IHJvbGU6IEdvdmVybmFuY2VSb2xlOyBieUFjdG9ySWQ6IHN0cmluZyB9KTogdm9pZDtcbiAgZ2V0R292ZXJuYW5jZVJvbGUoYWN0b3JJZDogc3RyaW5nKTogR292ZXJuYW5jZVJvbGU7XG4gIC8qKiBBc3NpZ24vcmV2b2tlIGEgZGVsaXZlcnkgcm9sZSAoYnVuZGxlIG9mIHBlcm1pc3Npb25zKS4gR2F0ZWQgd3JpdGVzOyBhdWRpdGVkLiAqL1xuICBhc3NpZ25Sb2xlKGlucHV0OiB7IGFjdG9ySWQ6IHN0cmluZzsgcm9sZUNvZGU6IHN0cmluZzsgYnlBY3RvcklkOiBzdHJpbmcgfSk6IHZvaWQ7XG4gIHJldm9rZVJvbGUoaW5wdXQ6IHsgYWN0b3JJZDogc3RyaW5nOyByb2xlQ29kZTogc3RyaW5nOyBieUFjdG9ySWQ6IHN0cmluZyB9KTogdm9pZDtcbiAgbGlzdFJvbGVBc3NpZ25tZW50cyhhY3RvcklkPzogc3RyaW5nKTogUm9sZUFzc2lnbm1lbnRbXTtcbiAgc2V0UGxhbihpbnB1dDogeyBwbGFuOiBQbGFuQ29kZTsgYnlBY3RvcklkOiBzdHJpbmcgfSk6IHZvaWQ7XG4gIGdldFBsYW4oKTogUGxhbkNvZGU7XG4gIHNldFdvcmtzcGFjZVBvbGljeShpbnB1dDogeyBwb2xpY3k6IFdvcmtzcGFjZVBvbGljeTsgYnlBY3RvcklkOiBzdHJpbmcgfSk6IHZvaWQ7XG4gIGdldFdvcmtzcGFjZVBvbGljeSgpOiBXb3Jrc3BhY2VQb2xpY3k7XG4gIHNldEdhdGVQb2xpY3koaW5wdXQ6IHsgZ2F0ZTogR2F0ZUNvZGU7IHBvbGljeTogR2F0ZVBvbGljeTsgYnlBY3RvcklkOiBzdHJpbmcgfSk6IHZvaWQ7XG4gIGdldEdhdGVQb2xpY3koZ2F0ZTogR2F0ZUNvZGUpOiBHYXRlUG9saWN5O1xuICAvKiogUHVyZSBkZWNpc2lvbiB0cmFjZSBcdTIwMTQgcmVwbGF5YWJsZSBieSBhbiBhdWRpdG9yLiBOZXZlciBtdXRhdGVzLiAqL1xuICBhdXRoekV4cGxhaW4oaW5wdXQ6IHsgYWN0b3JJZDogc3RyaW5nOyBwZXJtaXNzaW9uOiBQZXJtaXNzaW9uIH0pOiBBdXRoekV4cGxhbmF0aW9uO1xuXG4gIC8vIC0tIHF1ZXJpZXMgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICBnZXRXb3JrSXRlbShpZDogc3RyaW5nKTogV29ya0l0ZW07XG4gIGdldEZlYXR1cmUoaWQ6IHN0cmluZyk6IEZlYXR1cmU7XG4gIGdldENsYWltcyh3b3JrSXRlbUlkOiBzdHJpbmcpOiBDbGFpbVtdO1xuICAvKiogQWRkaXRpdmUgcXVlcnkgc3VyZmFjZSAocG9zdC1jb25mb3JtYW5jZSk6IGxpc3QvZmlsdGVyIHdvcmsgaXRlbXMuICovXG4gIGxpc3RXb3JrSXRlbXMoZmlsdGVyPzogeyBzdGF0ZT86IFdvcmtJdGVtU3RhdGU7IGZlYXR1cmVJZD86IHN0cmluZzsgY2xhaW1hYmxlPzogYm9vbGVhbiB9KTogV29ya0l0ZW1bXTtcbiAgZXZlbnRzKHN0cmVhbUlkPzogc3RyaW5nKTogU3BpbmVFdmVudFtdO1xufVxuIiwgIi8qKlxuICogc3Rvcmllcy55YW1sIHBhcnNpbmcgKyB2YWxpZGl0eSBydWxlcyAoc3Rvcmllcy1zY2hlbWEubWQsIHJvYWRtYXAgRDkpLlxuICpcbiAqIFRoZSBzY2hlbWEncyB2YWxpZGl0eSBydWxlcyBiZWNvbWUgdGhyb3dpbmcgY2hlY2tzIGhlcmU7IHRoZSBpbXBvcnRlciBpblxuICogdGhlIGVuZ2luZSBjb25zdW1lcyB0aGUgdmFsaWRhdGVkIGVudHJpZXMuIFwiTm8gc3RhdHVzIGZpZWxkLCBldmVyLlwiXG4gKi9cbmltcG9ydCB7IHBhcnNlIH0gZnJvbSAneWFtbCc7XG5cbmltcG9ydCB7IFN0b3JpZXNWYWxpZGF0aW9uRXJyb3IgfSBmcm9tICcuL3R5cGVzLmpzJztcblxuZXhwb3J0IGludGVyZmFjZSBTdG9yeUVudHJ5IHtcbiAgaWQ6IHN0cmluZztcbiAgdGl0bGU6IHN0cmluZztcbiAgZGVzY3JpcHRpb246IHN0cmluZztcbiAgc3BlY0NoZWNrcG9pbnQ6IGJvb2xlYW47XG4gIGRvbmVDaGVja3BvaW50OiBib29sZWFuO1xuICBpbnZva2VEZXZXaXRoOiBzdHJpbmc7XG59XG5cbmNvbnN0IElEX1BBVFRFUk4gPSAvXltBLVphLXowLTktXSskLztcblxuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlU3Rvcmllcyh5YW1sVGV4dDogc3RyaW5nKTogU3RvcnlFbnRyeVtdIHtcbiAgbGV0IHJhdzogdW5rbm93bjtcbiAgdHJ5IHtcbiAgICByYXcgPSBwYXJzZSh5YW1sVGV4dCk7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgdGhyb3cgbmV3IFN0b3JpZXNWYWxpZGF0aW9uRXJyb3IoYFlBTUwgcGFyc2UgZmFpbHVyZTogJHtTdHJpbmcoZXJyb3IpfWApO1xuICB9XG4gIGlmICghQXJyYXkuaXNBcnJheShyYXcpKSB7XG4gICAgdGhyb3cgbmV3IFN0b3JpZXNWYWxpZGF0aW9uRXJyb3IoJ3RvcCBsZXZlbCBtdXN0IGJlIGEgWUFNTCBsaXN0IG9mIHN0b3JpZXMnKTtcbiAgfVxuXG4gIGNvbnN0IGVudHJpZXM6IFN0b3J5RW50cnlbXSA9IFtdO1xuICBmb3IgKGNvbnN0IGl0ZW0gb2YgcmF3KSB7XG4gICAgaWYgKHR5cGVvZiBpdGVtICE9PSAnb2JqZWN0JyB8fCBpdGVtID09PSBudWxsIHx8IEFycmF5LmlzQXJyYXkoaXRlbSkpIHtcbiAgICAgIHRocm93IG5ldyBTdG9yaWVzVmFsaWRhdGlvbkVycm9yKCdldmVyeSBlbnRyeSBtdXN0IGJlIGEgbWFwcGluZycpO1xuICAgIH1cbiAgICBjb25zdCBlbnRyeSA9IGl0ZW0gYXMgUmVjb3JkPHN0cmluZywgdW5rbm93bj47XG5cbiAgICAvLyBSdWxlIDM6IFwiTm8gc3RhdHVzIGZpZWxkLCBldmVyLlwiXG4gICAgaWYgKCdzdGF0dXMnIGluIGVudHJ5KSB7XG4gICAgICB0aHJvdyBuZXcgU3Rvcmllc1ZhbGlkYXRpb25FcnJvcignbm8gc3RhdHVzIGZpZWxkLCBldmVyJyk7XG4gICAgfVxuICAgIC8vIFJ1bGUgNDogaWRzIGFyZSBZQU1MIHN0cmluZ3MsIGFsd2F5cyBxdW90ZWQgXHUyMDE0IGFuIHVucXVvdGVkIGBpZDogMWBcbiAgICAvLyBwYXJzZXMgYXMgYSBudW1iZXIgYW5kIGJyZWFrcyBzdHJpbmcgY29tcGFyaXNvbi5cbiAgICBpZiAodHlwZW9mIGVudHJ5WydpZCddICE9PSAnc3RyaW5nJykge1xuICAgICAgdGhyb3cgbmV3IFN0b3JpZXNWYWxpZGF0aW9uRXJyb3IoJ2lkIG11c3QgYmUgYSBxdW90ZWQgWUFNTCBzdHJpbmcnKTtcbiAgICB9XG4gICAgY29uc3QgaWQgPSBlbnRyeVsnaWQnXTtcbiAgICBpZiAoIUlEX1BBVFRFUk4udGVzdChpZCkpIHtcbiAgICAgIHRocm93IG5ldyBTdG9yaWVzVmFsaWRhdGlvbkVycm9yKGBpZCBcIiR7aWR9XCIgbWF5IGNvbnRhaW4gb25seSBsZXR0ZXJzLCBkaWdpdHMsIGFuZCBkYXNoZXNgKTtcbiAgICB9XG4gICAgLy8gUnVsZSAxOiByZXF1aXJlZCBmaWVsZHMuXG4gICAgaWYgKHR5cGVvZiBlbnRyeVsndGl0bGUnXSAhPT0gJ3N0cmluZycgfHwgZW50cnlbJ3RpdGxlJ10ubGVuZ3RoID09PSAwKSB7XG4gICAgICB0aHJvdyBuZXcgU3Rvcmllc1ZhbGlkYXRpb25FcnJvcihgZW50cnkgXCIke2lkfVwiIGlzIG1pc3NpbmcgcmVxdWlyZWQgZmllbGQ6IHRpdGxlYCk7XG4gICAgfVxuICAgIGlmICh0eXBlb2YgZW50cnlbJ2Rlc2NyaXB0aW9uJ10gIT09ICdzdHJpbmcnIHx8IGVudHJ5WydkZXNjcmlwdGlvbiddLmxlbmd0aCA9PT0gMCkge1xuICAgICAgdGhyb3cgbmV3IFN0b3JpZXNWYWxpZGF0aW9uRXJyb3IoYGVudHJ5IFwiJHtpZH1cIiBpcyBtaXNzaW5nIHJlcXVpcmVkIGZpZWxkOiBkZXNjcmlwdGlvbmApO1xuICAgIH1cblxuICAgIGVudHJpZXMucHVzaCh7XG4gICAgICBpZCxcbiAgICAgIHRpdGxlOiBlbnRyeVsndGl0bGUnXSxcbiAgICAgIGRlc2NyaXB0aW9uOiBlbnRyeVsnZGVzY3JpcHRpb24nXSxcbiAgICAgIHNwZWNDaGVja3BvaW50OiBlbnRyeVsnc3BlY19jaGVja3BvaW50J10gPT09IHRydWUsXG4gICAgICBkb25lQ2hlY2twb2ludDogZW50cnlbJ2RvbmVfY2hlY2twb2ludCddID09PSB0cnVlLFxuICAgICAgaW52b2tlRGV2V2l0aDogdHlwZW9mIGVudHJ5WydpbnZva2VfZGV2X3dpdGgnXSA9PT0gJ3N0cmluZycgPyBlbnRyeVsnaW52b2tlX2Rldl93aXRoJ10gOiAnJyxcbiAgICB9KTtcbiAgfVxuXG4gIC8vIFJ1bGUgMTogaWRzIHVuaXF1ZS5cbiAgY29uc3Qgc2VlbiA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICBmb3IgKGNvbnN0IHsgaWQgfSBvZiBlbnRyaWVzKSB7XG4gICAgaWYgKHNlZW4uaGFzKGlkKSkgdGhyb3cgbmV3IFN0b3JpZXNWYWxpZGF0aW9uRXJyb3IoYGR1cGxpY2F0ZSBpZCBcIiR7aWR9XCJgKTtcbiAgICBzZWVuLmFkZChpZCk7XG4gIH1cbiAgLy8gUnVsZSAyOiBwcmVmaXgtZnJlZSB1bmRlciB0aGUgYDxpZD4tYCBmaWxlbmFtZS1tYXRjaGluZyBjb252ZW50aW9uLlxuICBmb3IgKGNvbnN0IGEgb2Ygc2Vlbikge1xuICAgIGZvciAoY29uc3QgYiBvZiBzZWVuKSB7XG4gICAgICBpZiAoYSAhPT0gYiAmJiBhLnN0YXJ0c1dpdGgoYCR7Yn0tYCkpIHtcbiAgICAgICAgdGhyb3cgbmV3IFN0b3JpZXNWYWxpZGF0aW9uRXJyb3IoYGlkcyBcIiR7Yn1cIiBhbmQgXCIke2F9XCIgY29sbGlkZSB1bmRlciB0aGUgPGlkPi0gY29udmVudGlvbmApO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICByZXR1cm4gZW50cmllcztcbn1cbiIsICIvKipcbiAqIEluLW1lbW9yeSByZWZlcmVuY2UgaW1wbGVtZW50YXRpb24gb2YgdGhlIHNwaW5lIGVuZ2luZSwgd3JpdHRlbiB0byBtYWtlIHRoZVxuICogY29uZm9ybWFuY2Ugc3VpdGUgaW4gdGVzdC8gcGFzcy4gVGhlIHByb2R1Y3Rpb24gc2VydmljZSB3cmFwcyB0aGlzIHNhbWVcbiAqIGNvcmUgd2l0aCBQb3N0Z3JlcyBwZXJzaXN0ZW5jZSAoUGhhc2UgMSBzdG9yeSBcIjExXCIpLlxuICpcbiAqIFJ1bGUgcHJvdmVuYW5jZSBsaXZlcyBpbiB0aGUgdGVzdHMgYW5kIGluIHRlc3QvQ09ORk9STUFOQ0UubWQgXHUyMDE0IHRoaXMgZmlsZVxuICogb25seSBlbmNvZGVzIHdoYXQgdGhlIHN1aXRlIHBpbnMuIFdoZXJlIGFuIG9yZGVyaW5nIG9yIHNlbWFudGljIHdhc1xuICogYXJiaXRyYXRlZCwgdGhlIGNvbW1lbnQgbmFtZXMgdGhlIHBpbi5cbiAqL1xuaW1wb3J0IHtcbiAgQUdFTlRfR0FURV9BUFBST1ZFX1BFUk1JU1NJT05TLFxuICBCTE9DS0VEX1JFQVNPTlMsXG4gIENvbmZsaWN0RXJyb3IsXG4gIERFRkFVTFRfUExBTixcbiAgREVMSVZFUllfUk9MRVMsXG4gIEd1YXJkRmFpbGVkRXJyb3IsXG4gIEludmFsaWRUcmFuc2l0aW9uRXJyb3IsXG4gIFBlcm1pc3Npb25EZW5pZWRFcnJvcixcbiAgUExBTl9DRUlMSU5HUyxcbiAgUkVWSUVXX0xPT1BfTElNSVQsXG4gIFN0b3JpZXNWYWxpZGF0aW9uRXJyb3IsXG4gIFdPUktfSVRFTV9TVEFURVMsXG4gIHR5cGUgQWN0b3IsXG4gIHR5cGUgQWN0b3JUeXBlLFxuICB0eXBlIEFkdmFuY2VJbnB1dCxcbiAgdHlwZSBBdXRoekV4cGxhbmF0aW9uLFxuICB0eXBlIEJsb2NrZWRSZWFzb24sXG4gIHR5cGUgQ2xhaW0sXG4gIHR5cGUgQ3JlYXRlV29ya0l0ZW1JbnB1dCxcbiAgdHlwZSBEaXZlcmdlbmNlUmVwb3J0LFxuICB0eXBlIEV2aWRlbmNlLFxuICB0eXBlIEZlYXR1cmUsXG4gIHR5cGUgR2F0ZUNvZGUsXG4gIHR5cGUgR2F0ZURlY2lzaW9uSW5wdXQsXG4gIHR5cGUgR2F0ZVBvbGljeSxcbiAgdHlwZSBHb3Zlcm5hbmNlUm9sZSxcbiAgdHlwZSBQZXJtaXNzaW9uLFxuICB0eXBlIFBsYW5Db2RlLFxuICB0eXBlIFJvbGVBc3NpZ25tZW50LFxuICB0eXBlIFNwaW5lRW5naW5lLFxuICB0eXBlIFNwaW5lRXZlbnQsXG4gIHR5cGUgU3Rvcmllc0ltcG9ydFJlc3VsdCxcbiAgdHlwZSBXb3JrSXRlbSxcbiAgdHlwZSBXb3JrSXRlbVN0YXRlLFxuICB0eXBlIFdvcmtzcGFjZVBvbGljeSxcbn0gZnJvbSAnLi90eXBlcy5qcyc7XG5pbXBvcnQgeyBwYXJzZVN0b3JpZXMgfSBmcm9tICcuL3N0b3JpZXMuanMnO1xuXG5jb25zdCBSQU5LOiBSZWNvcmQ8V29ya0l0ZW1TdGF0ZSwgbnVtYmVyPiA9IE9iamVjdC5mcm9tRW50cmllcyhcbiAgV09SS19JVEVNX1NUQVRFUy5tYXAoKHMsIGkpID0+IFtzLCBpXSksXG4pIGFzIFJlY29yZDxXb3JrSXRlbVN0YXRlLCBudW1iZXI+O1xuXG4vKipcbiAqIFRoZSB2ZXJzaW9uZWQgdHJhbnNpdGlvbiB0YWJsZSAocm9hZG1hcCBcdTAwQTcxLjIpLiBDbGFpbXMgc2VyaWFsaXplIHRoZVxuICogRVhFQ1VUSU9OIHpvbmUgKGNvbmZvcm1hbmNlIHBpbiwgc2VlIHRlc3QvQ09ORk9STUFOQ0UubWQpOiBwbGFubmluZ1xuICogdHJhbnNpdGlvbnMgYXJlIHBlcm1pc3Npb24tb25seTsgcmVhZHlfZm9yX2Rldlx1MjE5MmluX3Byb2dyZXNzIG9ud2FyZCBkZW1hbmQgYVxuICogcHJlc2VudGVkLCBsaXZlIGZlbmNpbmcgdG9rZW4uIEdhdGUtZmlyZWQgdHJhbnNpdGlvbnMgKHNwZWNfYXBwcm92YWwsXG4gKiByZXZpZXdfYXBwcm92YWwpIGRvIG5vdCBhcHBlYXIgaGVyZSBcdTIwMTQgYXBwcm92ZUdhdGUvcmVqZWN0R2F0ZSBmaXJlIHRoZW0uXG4gKi9cbmludGVyZmFjZSBUcmFuc2l0aW9uUnVsZSB7XG4gIGZyb206IFdvcmtJdGVtU3RhdGU7XG4gIHRvOiBXb3JrSXRlbVN0YXRlO1xuICBwZXJtaXNzaW9uOiBQZXJtaXNzaW9uO1xuICBjbGFpbVJlcXVpcmVkOiBib29sZWFuO1xuICBndWFyZHM6IEFycmF5PCdkZXBzX2RvbmUnIHwgJ3NwZWNfZ2F0ZV9pZl9jaGVja3BvaW50JyB8ICdub25lbXB0eV9kaWZmJz47XG59XG5cbmNvbnN0IFRSQU5TSVRJT05TOiBUcmFuc2l0aW9uUnVsZVtdID0gW1xuICB7IGZyb206ICdiYWNrbG9nJywgdG86ICdkcmFmdCcsIHBlcm1pc3Npb246ICd0YXNrLnBsYW4nLCBjbGFpbVJlcXVpcmVkOiBmYWxzZSwgZ3VhcmRzOiBbXSB9LFxuICB7XG4gICAgZnJvbTogJ2RyYWZ0JyxcbiAgICB0bzogJ3JlYWR5X2Zvcl9kZXYnLFxuICAgIHBlcm1pc3Npb246ICd0YXNrLnBsYW4nLFxuICAgIGNsYWltUmVxdWlyZWQ6IGZhbHNlLFxuICAgIGd1YXJkczogWydzcGVjX2dhdGVfaWZfY2hlY2twb2ludCddLFxuICB9LFxuICB7XG4gICAgZnJvbTogJ3JlYWR5X2Zvcl9kZXYnLFxuICAgIHRvOiAnaW5fcHJvZ3Jlc3MnLFxuICAgIHBlcm1pc3Npb246ICd0YXNrLmFkdmFuY2UnLFxuICAgIGNsYWltUmVxdWlyZWQ6IHRydWUsXG4gICAgZ3VhcmRzOiBbJ2RlcHNfZG9uZSddLFxuICB9LFxuICB7XG4gICAgZnJvbTogJ2luX3Byb2dyZXNzJyxcbiAgICB0bzogJ2luX3JldmlldycsXG4gICAgcGVybWlzc2lvbjogJ3Rhc2suYWR2YW5jZScsXG4gICAgY2xhaW1SZXF1aXJlZDogdHJ1ZSxcbiAgICBndWFyZHM6IFsnbm9uZW1wdHlfZGlmZiddLFxuICB9LFxuXTtcblxuaW50ZXJmYWNlIFdvcmtJdGVtUm93IGV4dGVuZHMgV29ya0l0ZW0ge1xuICBkZXBlbmRzT246IHN0cmluZ1tdO1xufVxuXG5pbnRlcmZhY2UgQ2xhaW1Sb3cgZXh0ZW5kcyBDbGFpbSB7XG4gIHR0bE1zOiBudW1iZXI7XG59XG5cbmludGVyZmFjZSBHYXRlRGVjaXNpb25Sb3cge1xuICB3b3JrSXRlbUlkOiBzdHJpbmc7XG4gIGdhdGU6IEdhdGVDb2RlO1xuICBkZWNpc2lvbjogJ2FwcHJvdmVkJyB8ICdyZWplY3RlZCc7XG4gIGFjdG9ySWQ6IHN0cmluZztcbiAgLyoqIHJldmlldyByb3VuZCB0aGUgZGVjaXNpb24gYmVsb25ncyB0byAoPSByZXZpZXdMb29wSXRlcmF0aW9uIGF0IGRlY2lzaW9uIHRpbWUpICovXG4gIHJvdW5kOiBudW1iZXI7XG59XG5cbmludGVyZmFjZSBSb2xlQXNzaWdubWVudFJvdyBleHRlbmRzIFJvbGVBc3NpZ25tZW50IHt9XG5cbmludGVyZmFjZSBFdmlkZW5jZVJvdyB7XG4gIHdvcmtJdGVtSWQ6IHN0cmluZztcbiAgZXZpZGVuY2U6IEV2aWRlbmNlO1xuICBzZXE6IG51bWJlcjtcbn1cblxuY29uc3QgTEVHQUNZX1NUQVRVUzogUmVjb3JkPHN0cmluZywgV29ya0l0ZW1TdGF0ZT4gPSB7XG4gIGJhY2tsb2c6ICdiYWNrbG9nJyxcbiAgZHJhZnQ6ICdkcmFmdCcsXG4gICdyZWFkeS1mb3ItZGV2JzogJ3JlYWR5X2Zvcl9kZXYnLFxuICByZWFkeV9mb3JfZGV2OiAncmVhZHlfZm9yX2RldicsXG4gICdpbi1wcm9ncmVzcyc6ICdpbl9wcm9ncmVzcycsXG4gIGluX3Byb2dyZXNzOiAnaW5fcHJvZ3Jlc3MnLFxuICAnaW4tcmV2aWV3JzogJ2luX3JldmlldycsXG4gIGluX3JldmlldzogJ2luX3JldmlldycsXG4gIHJldmlldzogJ2luX3JldmlldycsXG4gIGRvbmU6ICdkb25lJyxcbn07XG5cbmNsYXNzIEVuZ2luZUltcGwgaW1wbGVtZW50cyBTcGluZUVuZ2luZSB7XG4gIHByaXZhdGUgbm93ID0gMDtcbiAgcHJpdmF0ZSBzZXEgPSAwO1xuICBwcml2YXRlIGdsb2JhbFNlcSA9IDA7XG5cbiAgcHJpdmF0ZSByZWFkb25seSBhY3RvcnMgPSBuZXcgTWFwPHN0cmluZywgQWN0b3I+KCk7XG4gIHByaXZhdGUgcmVhZG9ubHkgZ3JhbnRzID0gbmV3IE1hcDxzdHJpbmcsIFNldDxzdHJpbmc+PigpOyAvLyBhY3RvcklkIC0+IFwicGVybWlzc2lvblwiIChzY29wZSBpZ25vcmVkIHVudGlsIFBoYXNlIDIpXG4gIHByaXZhdGUgcmVhZG9ubHkgZmVhdHVyZXMgPSBuZXcgTWFwPHN0cmluZywgRmVhdHVyZT4oKTtcbiAgcHJpdmF0ZSByZWFkb25seSB3b3JrSXRlbXMgPSBuZXcgTWFwPHN0cmluZywgV29ya0l0ZW1Sb3c+KCk7XG4gIHByaXZhdGUgcmVhZG9ubHkgZXh0ZXJuYWxLZXlJbmRleCA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmc+KCk7IC8vIGV4dGVybmFsS2V5IC0+IHdvcmtJdGVtSWQgKGZpcnN0IHdyaXRlciB3aW5zKVxuICBwcml2YXRlIHJlYWRvbmx5IGNsYWltcyA9IG5ldyBNYXA8c3RyaW5nLCBDbGFpbVJvdz4oKTtcbiAgcHJpdmF0ZSByZWFkb25seSBjbGFpbXNCeUl0ZW0gPSBuZXcgTWFwPHN0cmluZywgc3RyaW5nW10+KCk7IC8vIHdvcmtJdGVtSWQgLT4gY2xhaW1JZHNcbiAgcHJpdmF0ZSByZWFkb25seSBmZW5jaW5nQ291bnRlciA9IG5ldyBNYXA8c3RyaW5nLCBudW1iZXI+KCk7IC8vIHdvcmtJdGVtSWQgLT4gbGFzdCB0b2tlblxuICBwcml2YXRlIHJlYWRvbmx5IGdhdGVEZWNpc2lvbnM6IEdhdGVEZWNpc2lvblJvd1tdID0gW107XG4gIHByaXZhdGUgcmVhZG9ubHkgZXZpZGVuY2VSb3dzOiBFdmlkZW5jZVJvd1tdID0gW107XG4gIHByaXZhdGUgcmVhZG9ubHkgZXZlbnRMb2c6IFNwaW5lRXZlbnRbXSA9IFtdO1xuICBwcml2YXRlIHJlYWRvbmx5IHN0cmVhbVNlcXMgPSBuZXcgTWFwPHN0cmluZywgbnVtYmVyPigpO1xuICBwcml2YXRlIHJlYWRvbmx5IGlkZW1wb3RlbmN5Q2FjaGUgPSBuZXcgTWFwPHN0cmluZywgV29ya0l0ZW0+KCk7XG5cbiAgLy8gLS0gZW50aXRsZW1lbnRzIHN0YXRlIChQaGFzZSAyLCByb2FkbWFwIFx1MDBBNzMpIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHByaXZhdGUgcmVhZG9ubHkgZ292ZXJuYW5jZVJvbGVzID0gbmV3IE1hcDxzdHJpbmcsIEdvdmVybmFuY2VSb2xlPigpO1xuICBwcml2YXRlIHJlYWRvbmx5IHJvbGVBc3NpZ25tZW50czogUm9sZUFzc2lnbm1lbnRSb3dbXSA9IFtdO1xuICBwcml2YXRlIHBsYW46IFBsYW5Db2RlID0gREVGQVVMVF9QTEFOO1xuICBwcml2YXRlIHBsYW5WZXJzaW9uID0gMTtcbiAgcHJpdmF0ZSB3b3Jrc3BhY2VQb2xpY3k6IFdvcmtzcGFjZVBvbGljeSA9IHt9O1xuICBwcml2YXRlIHBvbGljeVZlcnNpb24gPSAxO1xuICBwcml2YXRlIHJlYWRvbmx5IGdhdGVQb2xpY2llcyA9IG5ldyBNYXA8R2F0ZUNvZGUsIEdhdGVQb2xpY3k+KCk7XG5cbiAgcmVhZG9ubHkgc3lzdGVtQWN0b3JJZDogc3RyaW5nO1xuXG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHRoaXMuc3lzdGVtQWN0b3JJZCA9IHRoaXMubmV4dElkKCdhY3Rvci1zeXN0ZW0nKTtcbiAgICB0aGlzLmFjdG9ycy5zZXQodGhpcy5zeXN0ZW1BY3RvcklkLCB7XG4gICAgICBpZDogdGhpcy5zeXN0ZW1BY3RvcklkLFxuICAgICAgdHlwZTogJ3N5c3RlbScsXG4gICAgICBkaXNwbGF5TmFtZTogJ3N5c3RlbScsXG4gICAgfSk7XG4gIH1cblxuICAvLyAtLSBpbmZyYXN0cnVjdHVyZSAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIHByaXZhdGUgbmV4dElkKHByZWZpeDogc3RyaW5nKTogc3RyaW5nIHtcbiAgICB0aGlzLnNlcSArPSAxO1xuICAgIHJldHVybiBgJHtwcmVmaXh9XyR7dGhpcy5zZXEudG9TdHJpbmcoMzYpLnBhZFN0YXJ0KDYsICcwJyl9YDtcbiAgfVxuXG4gIHByaXZhdGUgYXBwZW5kKFxuICAgIHN0cmVhbVR5cGU6IFNwaW5lRXZlbnRbJ3N0cmVhbVR5cGUnXSxcbiAgICBzdHJlYW1JZDogc3RyaW5nLFxuICAgIHR5cGU6IHN0cmluZyxcbiAgICBhY3RvcklkOiBzdHJpbmcsXG4gICAgcGF5bG9hZDogUmVjb3JkPHN0cmluZywgdW5rbm93bj4sXG4gICAgZXh0cmE/OiB7IGNhdXNhdGlvbklkPzogc3RyaW5nOyBpZGVtcG90ZW5jeUtleT86IHN0cmluZyB9LFxuICApOiBTcGluZUV2ZW50IHtcbiAgICB0aGlzLmdsb2JhbFNlcSArPSAxO1xuICAgIGNvbnN0IHN0cmVhbVNlcSA9ICh0aGlzLnN0cmVhbVNlcXMuZ2V0KHN0cmVhbUlkKSA/PyAwKSArIDE7XG4gICAgdGhpcy5zdHJlYW1TZXFzLnNldChzdHJlYW1JZCwgc3RyZWFtU2VxKTtcbiAgICBjb25zdCBldmVudDogU3BpbmVFdmVudCA9IHtcbiAgICAgIGdsb2JhbFNlcTogdGhpcy5nbG9iYWxTZXEsXG4gICAgICBzdHJlYW1UeXBlLFxuICAgICAgc3RyZWFtSWQsXG4gICAgICBzdHJlYW1TZXEsXG4gICAgICB0eXBlLFxuICAgICAgYWN0b3JJZCxcbiAgICAgIHBheWxvYWQsXG4gICAgICAuLi4oZXh0cmE/LmNhdXNhdGlvbklkICE9PSB1bmRlZmluZWQgPyB7IGNhdXNhdGlvbklkOiBleHRyYS5jYXVzYXRpb25JZCB9IDoge30pLFxuICAgIH07XG4gICAgdGhpcy5ldmVudExvZy5wdXNoKGV2ZW50KTtcbiAgICByZXR1cm4gZXZlbnQ7XG4gIH1cblxuICBwcml2YXRlIG11c3RHZXRJdGVtKHdvcmtJdGVtSWQ6IHN0cmluZyk6IFdvcmtJdGVtUm93IHtcbiAgICBjb25zdCBieUlkID0gdGhpcy53b3JrSXRlbXMuZ2V0KHdvcmtJdGVtSWQpO1xuICAgIGlmIChieUlkKSByZXR1cm4gYnlJZDtcbiAgICAvLyBJbXBvcnRlZCBzdG9yaWVzIGFyZSBhZGRyZXNzZWQgYnkgdGhlaXIgZXh0ZXJuYWxLZXkgaGFuZGxlXG4gICAgLy8gKGNvbmZvcm1hbmNlIHBpbiBpbiBzdG9yaWVzLWltcG9ydC50ZXN0LnRzKS5cbiAgICBjb25zdCBtYXBwZWQgPSB0aGlzLmV4dGVybmFsS2V5SW5kZXguZ2V0KHdvcmtJdGVtSWQpO1xuICAgIGlmIChtYXBwZWQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgY29uc3QgaXRlbSA9IHRoaXMud29ya0l0ZW1zLmdldChtYXBwZWQpO1xuICAgICAgaWYgKGl0ZW0pIHJldHVybiBpdGVtO1xuICAgIH1cbiAgICB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcihgdW5rbm93biB3b3JrIGl0ZW06ICR7d29ya0l0ZW1JZH1gKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBFbnRpdGxlbWVudCByZXNvbHV0aW9uIFx1MjAxNCBhIFBVUkUgZnVuY3Rpb24gb3ZlciBwbGFuIFx1MDBENyBnb3Zlcm5hbmNlIFx1MDBEN1xuICAgKiBkZWxpdmVyeS1yb2xlIGRhdGEgKHJvYWRtYXAgXHUwMEE3MykuIEEgZ3JhbnQgbWF5IEVYSVNUIChkaXJlY3Qgb3IgdmlhIGFcbiAgICogcm9sZSkgYW5kIHN0aWxsIG5vdCBSRVNPTFZFIGZvciBhbiBhZ2VudCB3aGVuIHRoZSBwbGFuIGNlaWxpbmcgb3IgdGhlXG4gICAqIHJlc3RyaWN0LW9ubHkgd29ya3NwYWNlIHBvbGljeSBuYXJyb3dzIGl0LiBVc2VycyBhcmUgbmV2ZXIgcGxhbi1maWx0ZXJlZC5cbiAgICovXG4gIHByaXZhdGUgZ3JhbnRTb3VyY2UoYWN0b3JJZDogc3RyaW5nLCBwZXJtaXNzaW9uOiBQZXJtaXNzaW9uKTogc3RyaW5nIHwgbnVsbCB7XG4gICAgaWYgKHRoaXMuZ3JhbnRzLmdldChhY3RvcklkKT8uaGFzKHBlcm1pc3Npb24pKSByZXR1cm4gJ2RpcmVjdCc7XG4gICAgZm9yIChjb25zdCBhc3NpZ25tZW50IG9mIHRoaXMucm9sZUFzc2lnbm1lbnRzKSB7XG4gICAgICBpZiAoYXNzaWdubWVudC5hY3RvcklkICE9PSBhY3RvcklkIHx8IGFzc2lnbm1lbnQucmV2b2tlZCkgY29udGludWU7XG4gICAgICBpZiAoKERFTElWRVJZX1JPTEVTW2Fzc2lnbm1lbnQucm9sZUNvZGVdID8/IFtdKS5pbmNsdWRlcyhwZXJtaXNzaW9uKSkge1xuICAgICAgICByZXR1cm4gYHJvbGU6JHthc3NpZ25tZW50LnJvbGVDb2RlfWA7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgcHJpdmF0ZSBhZ2VudENlaWxpbmdBbGxvd3MoYWN0b3I6IEFjdG9yIHwgdW5kZWZpbmVkLCBwZXJtaXNzaW9uOiBQZXJtaXNzaW9uKTogeyBwbGFuOiBib29sZWFuOyBwb2xpY3k6IGJvb2xlYW4gfSB7XG4gICAgaWYgKCFhY3RvciB8fCBhY3Rvci50eXBlICE9PSAnYWdlbnQnKSByZXR1cm4geyBwbGFuOiB0cnVlLCBwb2xpY3k6IHRydWUgfTtcbiAgICBjb25zdCBjZWlsaW5nID0gUExBTl9DRUlMSU5HU1t0aGlzLnBsYW5dO1xuICAgIGlmICgoQUdFTlRfR0FURV9BUFBST1ZFX1BFUk1JU1NJT05TIGFzIHJlYWRvbmx5IHN0cmluZ1tdKS5pbmNsdWRlcyhwZXJtaXNzaW9uKSkge1xuICAgICAgcmV0dXJuIHsgcGxhbjogY2VpbGluZy5hZ2VudEdhdGVBcHByb3ZlLCBwb2xpY3k6IHRoaXMud29ya3NwYWNlUG9saWN5LmFnZW50R2F0ZUFwcHJvdmFscyAhPT0gZmFsc2UgfTtcbiAgICB9XG4gICAgaWYgKHBlcm1pc3Npb24gPT09ICdnYXRlLnJldmlldy5yZWplY3QnKSB7XG4gICAgICByZXR1cm4geyBwbGFuOiBjZWlsaW5nLmFnZW50R2F0ZVJlamVjdCwgcG9saWN5OiB0cnVlIH07XG4gICAgfVxuICAgIGlmIChwZXJtaXNzaW9uID09PSAndGFzay5jbGFpbScpIHtcbiAgICAgIHJldHVybiB7IHBsYW46IHRydWUsIHBvbGljeTogdGhpcy53b3Jrc3BhY2VQb2xpY3kuYWdlbnRTZWxmRGlzcGF0Y2ggIT09IGZhbHNlIH07XG4gICAgfVxuICAgIHJldHVybiB7IHBsYW46IHRydWUsIHBvbGljeTogdHJ1ZSB9O1xuICB9XG5cbiAgcHJpdmF0ZSBoYXNQZXJtaXNzaW9uKGFjdG9ySWQ6IHN0cmluZywgcGVybWlzc2lvbjogUGVybWlzc2lvbik6IGJvb2xlYW4ge1xuICAgIGlmICh0aGlzLmdyYW50U291cmNlKGFjdG9ySWQsIHBlcm1pc3Npb24pID09PSBudWxsKSByZXR1cm4gZmFsc2U7XG4gICAgY29uc3QgYWxsb3dzID0gdGhpcy5hZ2VudENlaWxpbmdBbGxvd3ModGhpcy5hY3RvcnMuZ2V0KGFjdG9ySWQpLCBwZXJtaXNzaW9uKTtcbiAgICByZXR1cm4gYWxsb3dzLnBsYW4gJiYgYWxsb3dzLnBvbGljeTtcbiAgfVxuXG4gIHByaXZhdGUgcmVxdWlyZVBlcm1pc3Npb24oYWN0b3JJZDogc3RyaW5nLCBwZXJtaXNzaW9uOiBQZXJtaXNzaW9uKTogdm9pZCB7XG4gICAgaWYgKCF0aGlzLmhhc1Blcm1pc3Npb24oYWN0b3JJZCwgcGVybWlzc2lvbikpIHtcbiAgICAgIHRocm93IG5ldyBQZXJtaXNzaW9uRGVuaWVkRXJyb3IocGVybWlzc2lvbiwgYWN0b3JJZCk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSByZXF1aXJlR292ZXJuYW5jZUFkbWluKGJ5QWN0b3JJZDogc3RyaW5nKTogdm9pZCB7XG4gICAgaWYgKGJ5QWN0b3JJZCA9PT0gdGhpcy5zeXN0ZW1BY3RvcklkKSByZXR1cm47XG4gICAgaWYgKHRoaXMuZ292ZXJuYW5jZVJvbGVzLmdldChieUFjdG9ySWQpID09PSAnYWRtaW4nKSByZXR1cm47XG4gICAgdGhyb3cgbmV3IFBlcm1pc3Npb25EZW5pZWRFcnJvcignZ292ZXJuYW5jZS5hZG1pbicsIGJ5QWN0b3JJZCk7XG4gIH1cblxuICAvKiogR3JhbnQtdGltZSBwbGFuIGNlaWxpbmc6IHJlZnVzZSBpc3N1aW5nIGFnZW50IGdhdGUgcGVybWlzc2lvbnMgdGhlIHBsYW4gZm9yYmlkcy4gKi9cbiAgcHJpdmF0ZSBjaGVja0dyYW50Q2VpbGluZyhhY3RvcklkOiBzdHJpbmcsIHBlcm1pc3Npb246IFBlcm1pc3Npb24pOiB2b2lkIHtcbiAgICBjb25zdCBhY3RvciA9IHRoaXMuYWN0b3JzLmdldChhY3RvcklkKTtcbiAgICBpZiAoIWFjdG9yIHx8IGFjdG9yLnR5cGUgIT09ICdhZ2VudCcpIHJldHVybjtcbiAgICBjb25zdCBjZWlsaW5nID0gUExBTl9DRUlMSU5HU1t0aGlzLnBsYW5dO1xuICAgIGlmICgoQUdFTlRfR0FURV9BUFBST1ZFX1BFUk1JU1NJT05TIGFzIHJlYWRvbmx5IHN0cmluZ1tdKS5pbmNsdWRlcyhwZXJtaXNzaW9uKSAmJiAhY2VpbGluZy5hZ2VudEdhdGVBcHByb3ZlKSB7XG4gICAgICB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcihgcGxhbiAke3RoaXMucGxhbn0gZG9lcyBub3QgYWxsb3cgYWdlbnRzIHRvIGhvbGQgJHtwZXJtaXNzaW9ufWApO1xuICAgIH1cbiAgICBpZiAocGVybWlzc2lvbiA9PT0gJ2dhdGUucmV2aWV3LnJlamVjdCcgJiYgIWNlaWxpbmcuYWdlbnRHYXRlUmVqZWN0KSB7XG4gICAgICB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcihgcGxhbiAke3RoaXMucGxhbn0gZG9lcyBub3QgYWxsb3cgYWdlbnRzIHRvIGhvbGQgJHtwZXJtaXNzaW9ufWApO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgbGl2ZUNsYWltKHdvcmtJdGVtSWQ6IHN0cmluZyk6IENsYWltUm93IHwgbnVsbCB7XG4gICAgZm9yIChjb25zdCBjbGFpbUlkIG9mIHRoaXMuY2xhaW1zQnlJdGVtLmdldCh3b3JrSXRlbUlkKSA/PyBbXSkge1xuICAgICAgY29uc3QgY2xhaW0gPSB0aGlzLmNsYWltcy5nZXQoY2xhaW1JZCk7XG4gICAgICBpZiAoY2xhaW0gJiYgIWNsYWltLnJlbGVhc2VkICYmIGNsYWltLmxlYXNlRXhwaXJlc0F0ID4gdGhpcy5ub3cpIHJldHVybiBjbGFpbTtcbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICAvKipcbiAgICogQSBQUkVTRU5URUQgdG9rZW4gaXMgYWx3YXlzIHZhbGlkYXRlZCwgb24gZXZlcnkgY29tbWFuZCAoY29uZm9ybWFuY2UgcGluLFxuICAgKiBjbGFpbXMudGVzdC50cyk6IHN0YWxlL2ZvcmVpZ24vbm8tbGl2ZS1jbGFpbSBcdTIxOTIgQ29uZmxpY3RFcnJvciArIGF1ZGl0IGV2ZW50LlxuICAgKi9cbiAgcHJpdmF0ZSB2YWxpZGF0ZVByZXNlbnRlZFRva2VuKGl0ZW06IFdvcmtJdGVtUm93LCBmZW5jaW5nVG9rZW46IG51bWJlciB8IHVuZGVmaW5lZCwgYWN0b3JJZDogc3RyaW5nKTogdm9pZCB7XG4gICAgaWYgKGZlbmNpbmdUb2tlbiA9PT0gdW5kZWZpbmVkKSByZXR1cm47XG4gICAgY29uc3QgbGl2ZSA9IHRoaXMubGl2ZUNsYWltKGl0ZW0uaWQpO1xuICAgIGlmIChsaXZlID09PSBudWxsIHx8IGxpdmUuZmVuY2luZ1Rva2VuICE9PSBmZW5jaW5nVG9rZW4pIHtcbiAgICAgIHRoaXMuYXBwZW5kKCd3b3JrX2l0ZW0nLCBpdGVtLmlkLCAnZmVuY2luZy5yZWplY3RlZCcsIGFjdG9ySWQsIHtcbiAgICAgICAgcHJlc2VudGVkVG9rZW46IGZlbmNpbmdUb2tlbixcbiAgICAgICAgbGl2ZVRva2VuOiBsaXZlPy5mZW5jaW5nVG9rZW4gPz8gbnVsbCxcbiAgICAgIH0pO1xuICAgICAgdGhyb3cgbmV3IENvbmZsaWN0RXJyb3IoYHN0YWxlIG9yIGZvcmVpZ24gZmVuY2luZyB0b2tlbiBmb3Igd29yayBpdGVtICR7aXRlbS5pZH1gKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGNvcHlJdGVtKGl0ZW06IFdvcmtJdGVtUm93KTogV29ya0l0ZW0ge1xuICAgIGNvbnN0IHsgZGVwZW5kc09uOiBfZGVwZW5kc09uLCAuLi5wdWIgfSA9IGl0ZW07XG4gICAgcmV0dXJuIHsgLi4ucHViLCBwaW5uZWRWZXJpZmljYXRpb246IGl0ZW0ucGlubmVkVmVyaWZpY2F0aW9uID8gWy4uLml0ZW0ucGlubmVkVmVyaWZpY2F0aW9uXSA6IG51bGwgfTtcbiAgfVxuXG4gIHByaXZhdGUgY29weUZlYXR1cmUoZmVhdHVyZTogRmVhdHVyZSk6IEZlYXR1cmUge1xuICAgIHJldHVybiB7IC4uLmZlYXR1cmUgfTtcbiAgfVxuXG4gIHByaXZhdGUgY29weUNsYWltKGNsYWltOiBDbGFpbVJvdyk6IENsYWltIHtcbiAgICBjb25zdCB7IHR0bE1zOiBfdHRsLCAuLi5wdWIgfSA9IGNsYWltO1xuICAgIHJldHVybiB7IC4uLnB1YiB9O1xuICB9XG5cbiAgLy8gLS0gc2V0dXAgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICBjcmVhdGVBY3RvcihpbnB1dDoge1xuICAgIHR5cGU6IEV4Y2x1ZGU8QWN0b3JUeXBlLCAnc3lzdGVtJz47XG4gICAgZGlzcGxheU5hbWU6IHN0cmluZztcbiAgICBnb3Zlcm5hbmNlUm9sZT86IEdvdmVybmFuY2VSb2xlO1xuICB9KTogQWN0b3Ige1xuICAgIGNvbnN0IGFjdG9yOiBBY3RvciA9IHsgaWQ6IHRoaXMubmV4dElkKCdhY3RvcicpLCB0eXBlOiBpbnB1dC50eXBlLCBkaXNwbGF5TmFtZTogaW5wdXQuZGlzcGxheU5hbWUgfTtcbiAgICB0aGlzLmFjdG9ycy5zZXQoYWN0b3IuaWQsIGFjdG9yKTtcbiAgICB0aGlzLmdvdmVybmFuY2VSb2xlcy5zZXQoYWN0b3IuaWQsIGlucHV0LmdvdmVybmFuY2VSb2xlID8/ICdtZW1iZXInKTtcbiAgICByZXR1cm4geyAuLi5hY3RvciB9O1xuICB9XG5cbiAgZ3JhbnQoaW5wdXQ6IHsgYWN0b3JJZDogc3RyaW5nOyBwZXJtaXNzaW9uOiBQZXJtaXNzaW9uOyBzY29wZT86IHN0cmluZyB9KTogdm9pZCB7XG4gICAgdGhpcy5jaGVja0dyYW50Q2VpbGluZyhpbnB1dC5hY3RvcklkLCBpbnB1dC5wZXJtaXNzaW9uKTtcbiAgICBjb25zdCBzZXQgPSB0aGlzLmdyYW50cy5nZXQoaW5wdXQuYWN0b3JJZCkgPz8gbmV3IFNldDxzdHJpbmc+KCk7XG4gICAgc2V0LmFkZChpbnB1dC5wZXJtaXNzaW9uKTtcbiAgICB0aGlzLmdyYW50cy5zZXQoaW5wdXQuYWN0b3JJZCwgc2V0KTtcbiAgICB0aGlzLmFwcGVuZCgnYWN0b3InLCBpbnB1dC5hY3RvcklkLCAnZ3JhbnQuaXNzdWVkJywgdGhpcy5zeXN0ZW1BY3RvcklkLCB7IHBlcm1pc3Npb246IGlucHV0LnBlcm1pc3Npb24gfSk7XG4gIH1cblxuICByZXZva2UoaW5wdXQ6IHsgYWN0b3JJZDogc3RyaW5nOyBwZXJtaXNzaW9uOiBQZXJtaXNzaW9uOyBzY29wZT86IHN0cmluZyB9KTogdm9pZCB7XG4gICAgdGhpcy5ncmFudHMuZ2V0KGlucHV0LmFjdG9ySWQpPy5kZWxldGUoaW5wdXQucGVybWlzc2lvbik7XG4gICAgdGhpcy5hcHBlbmQoJ2FjdG9yJywgaW5wdXQuYWN0b3JJZCwgJ2dyYW50LnJldm9rZWQnLCB0aGlzLnN5c3RlbUFjdG9ySWQsIHsgcGVybWlzc2lvbjogaW5wdXQucGVybWlzc2lvbiB9KTtcbiAgfVxuXG4gIC8vIC0tIGVudGl0bGVtZW50cyAoUGhhc2UgMiwgcm9hZG1hcCBcdTAwQTczKSAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgc2V0R292ZXJuYW5jZVJvbGUoaW5wdXQ6IHsgYWN0b3JJZDogc3RyaW5nOyByb2xlOiBHb3Zlcm5hbmNlUm9sZTsgYnlBY3RvcklkOiBzdHJpbmcgfSk6IHZvaWQge1xuICAgIHRoaXMucmVxdWlyZUdvdmVybmFuY2VBZG1pbihpbnB1dC5ieUFjdG9ySWQpO1xuICAgIGlmICghdGhpcy5hY3RvcnMuaGFzKGlucHV0LmFjdG9ySWQpKSB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcihgdW5rbm93biBhY3RvcjogJHtpbnB1dC5hY3RvcklkfWApO1xuICAgIHRoaXMuZ292ZXJuYW5jZVJvbGVzLnNldChpbnB1dC5hY3RvcklkLCBpbnB1dC5yb2xlKTtcbiAgICB0aGlzLmFwcGVuZCgnYWN0b3InLCBpbnB1dC5hY3RvcklkLCAnZ292ZXJuYW5jZS5jaGFuZ2VkJywgaW5wdXQuYnlBY3RvcklkLCB7IHJvbGU6IGlucHV0LnJvbGUgfSk7XG4gIH1cblxuICBnZXRHb3Zlcm5hbmNlUm9sZShhY3RvcklkOiBzdHJpbmcpOiBHb3Zlcm5hbmNlUm9sZSB7XG4gICAgcmV0dXJuIHRoaXMuZ292ZXJuYW5jZVJvbGVzLmdldChhY3RvcklkKSA/PyAnbWVtYmVyJztcbiAgfVxuXG4gIGFzc2lnblJvbGUoaW5wdXQ6IHsgYWN0b3JJZDogc3RyaW5nOyByb2xlQ29kZTogc3RyaW5nOyBieUFjdG9ySWQ6IHN0cmluZyB9KTogdm9pZCB7XG4gICAgdGhpcy5yZXF1aXJlR292ZXJuYW5jZUFkbWluKGlucHV0LmJ5QWN0b3JJZCk7XG4gICAgY29uc3QgYnVuZGxlID0gREVMSVZFUllfUk9MRVNbaW5wdXQucm9sZUNvZGVdO1xuICAgIGlmIChidW5kbGUgPT09IHVuZGVmaW5lZCkgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoYHVua25vd24gZGVsaXZlcnkgcm9sZTogJHtpbnB1dC5yb2xlQ29kZX1gKTtcbiAgICBpZiAoIXRoaXMuYWN0b3JzLmhhcyhpbnB1dC5hY3RvcklkKSkgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoYHVua25vd24gYWN0b3I6ICR7aW5wdXQuYWN0b3JJZH1gKTtcbiAgICBmb3IgKGNvbnN0IHBlcm1pc3Npb24gb2YgYnVuZGxlKSB7XG4gICAgICB0aGlzLmNoZWNrR3JhbnRDZWlsaW5nKGlucHV0LmFjdG9ySWQsIHBlcm1pc3Npb24pO1xuICAgIH1cbiAgICBjb25zdCBhY3RpdmUgPSB0aGlzLnJvbGVBc3NpZ25tZW50cy5zb21lKFxuICAgICAgKGEpID0+IGEuYWN0b3JJZCA9PT0gaW5wdXQuYWN0b3JJZCAmJiBhLnJvbGVDb2RlID09PSBpbnB1dC5yb2xlQ29kZSAmJiAhYS5yZXZva2VkLFxuICAgICk7XG4gICAgaWYgKGFjdGl2ZSkgcmV0dXJuOyAvLyBpZGVtcG90ZW50XG4gICAgdGhpcy5yb2xlQXNzaWdubWVudHMucHVzaCh7XG4gICAgICBhY3RvcklkOiBpbnB1dC5hY3RvcklkLFxuICAgICAgcm9sZUNvZGU6IGlucHV0LnJvbGVDb2RlLFxuICAgICAgZ3JhbnRlZEJ5OiBpbnB1dC5ieUFjdG9ySWQsXG4gICAgICByZXZva2VkOiBmYWxzZSxcbiAgICB9KTtcbiAgICB0aGlzLmFwcGVuZCgnYWN0b3InLCBpbnB1dC5hY3RvcklkLCAncm9sZS5hc3NpZ25lZCcsIGlucHV0LmJ5QWN0b3JJZCwgeyByb2xlQ29kZTogaW5wdXQucm9sZUNvZGUgfSk7XG4gIH1cblxuICByZXZva2VSb2xlKGlucHV0OiB7IGFjdG9ySWQ6IHN0cmluZzsgcm9sZUNvZGU6IHN0cmluZzsgYnlBY3RvcklkOiBzdHJpbmcgfSk6IHZvaWQge1xuICAgIHRoaXMucmVxdWlyZUdvdmVybmFuY2VBZG1pbihpbnB1dC5ieUFjdG9ySWQpO1xuICAgIGlmIChERUxJVkVSWV9ST0xFU1tpbnB1dC5yb2xlQ29kZV0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoYHVua25vd24gZGVsaXZlcnkgcm9sZTogJHtpbnB1dC5yb2xlQ29kZX1gKTtcbiAgICB9XG4gICAgZm9yIChjb25zdCBhc3NpZ25tZW50IG9mIHRoaXMucm9sZUFzc2lnbm1lbnRzKSB7XG4gICAgICBpZiAoYXNzaWdubWVudC5hY3RvcklkID09PSBpbnB1dC5hY3RvcklkICYmIGFzc2lnbm1lbnQucm9sZUNvZGUgPT09IGlucHV0LnJvbGVDb2RlICYmICFhc3NpZ25tZW50LnJldm9rZWQpIHtcbiAgICAgICAgYXNzaWdubWVudC5yZXZva2VkID0gdHJ1ZTtcbiAgICAgIH1cbiAgICB9XG4gICAgdGhpcy5hcHBlbmQoJ2FjdG9yJywgaW5wdXQuYWN0b3JJZCwgJ3JvbGUucmV2b2tlZCcsIGlucHV0LmJ5QWN0b3JJZCwgeyByb2xlQ29kZTogaW5wdXQucm9sZUNvZGUgfSk7XG4gIH1cblxuICBsaXN0Um9sZUFzc2lnbm1lbnRzKGFjdG9ySWQ/OiBzdHJpbmcpOiBSb2xlQXNzaWdubWVudFtdIHtcbiAgICByZXR1cm4gdGhpcy5yb2xlQXNzaWdubWVudHNcbiAgICAgIC5maWx0ZXIoKGEpID0+IGFjdG9ySWQgPT09IHVuZGVmaW5lZCB8fCBhLmFjdG9ySWQgPT09IGFjdG9ySWQpXG4gICAgICAubWFwKChhKSA9PiAoeyAuLi5hIH0pKTtcbiAgfVxuXG4gIHNldFBsYW4oaW5wdXQ6IHsgcGxhbjogUGxhbkNvZGU7IGJ5QWN0b3JJZDogc3RyaW5nIH0pOiB2b2lkIHtcbiAgICB0aGlzLnJlcXVpcmVHb3Zlcm5hbmNlQWRtaW4oaW5wdXQuYnlBY3RvcklkKTtcbiAgICBpZiAoUExBTl9DRUlMSU5HU1tpbnB1dC5wbGFuXSA9PT0gdW5kZWZpbmVkKSB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcihgdW5rbm93biBwbGFuOiAke2lucHV0LnBsYW59YCk7XG4gICAgdGhpcy5wbGFuID0gaW5wdXQucGxhbjtcbiAgICB0aGlzLnBsYW5WZXJzaW9uICs9IDE7XG4gICAgdGhpcy5hcHBlbmQoJ3dvcmtzcGFjZScsICd3b3Jrc3BhY2UnLCAncGxhbi5jaGFuZ2VkJywgaW5wdXQuYnlBY3RvcklkLCB7XG4gICAgICBwbGFuOiBpbnB1dC5wbGFuLFxuICAgICAgcGxhblZlcnNpb246IHRoaXMucGxhblZlcnNpb24sXG4gICAgfSk7XG4gIH1cblxuICBnZXRQbGFuKCk6IFBsYW5Db2RlIHtcbiAgICByZXR1cm4gdGhpcy5wbGFuO1xuICB9XG5cbiAgc2V0V29ya3NwYWNlUG9saWN5KGlucHV0OiB7IHBvbGljeTogV29ya3NwYWNlUG9saWN5OyBieUFjdG9ySWQ6IHN0cmluZyB9KTogdm9pZCB7XG4gICAgdGhpcy5yZXF1aXJlR292ZXJuYW5jZUFkbWluKGlucHV0LmJ5QWN0b3JJZCk7XG4gICAgdGhpcy53b3Jrc3BhY2VQb2xpY3kgPSB7IC4uLnRoaXMud29ya3NwYWNlUG9saWN5LCAuLi5pbnB1dC5wb2xpY3kgfTtcbiAgICB0aGlzLnBvbGljeVZlcnNpb24gKz0gMTtcbiAgICB0aGlzLmFwcGVuZCgnd29ya3NwYWNlJywgJ3dvcmtzcGFjZScsICdwb2xpY3kuY2hhbmdlZCcsIGlucHV0LmJ5QWN0b3JJZCwge1xuICAgICAgcG9saWN5OiB7IC4uLnRoaXMud29ya3NwYWNlUG9saWN5IH0sXG4gICAgICBwb2xpY3lWZXJzaW9uOiB0aGlzLnBvbGljeVZlcnNpb24sXG4gICAgfSk7XG4gIH1cblxuICBnZXRXb3Jrc3BhY2VQb2xpY3koKTogV29ya3NwYWNlUG9saWN5IHtcbiAgICByZXR1cm4geyAuLi50aGlzLndvcmtzcGFjZVBvbGljeSB9O1xuICB9XG5cbiAgc2V0R2F0ZVBvbGljeShpbnB1dDogeyBnYXRlOiBHYXRlQ29kZTsgcG9saWN5OiBHYXRlUG9saWN5OyBieUFjdG9ySWQ6IHN0cmluZyB9KTogdm9pZCB7XG4gICAgdGhpcy5yZXF1aXJlR292ZXJuYW5jZUFkbWluKGlucHV0LmJ5QWN0b3JJZCk7XG4gICAgY29uc3QgbWluQXBwcm92YWxzID0gaW5wdXQucG9saWN5Lm1pbkFwcHJvdmFscyA/PyAxO1xuICAgIGlmICghTnVtYmVyLmlzSW50ZWdlcihtaW5BcHByb3ZhbHMpIHx8IG1pbkFwcHJvdmFscyA8IDEpIHtcbiAgICAgIHRocm93IG5ldyBHdWFyZEZhaWxlZEVycm9yKCdtaW5BcHByb3ZhbHMgbXVzdCBiZSBhIHBvc2l0aXZlIGludGVnZXInKTtcbiAgICB9XG4gICAgdGhpcy5nYXRlUG9saWNpZXMuc2V0KGlucHV0LmdhdGUsIHsgLi4uaW5wdXQucG9saWN5IH0pO1xuICAgIHRoaXMuYXBwZW5kKCd3b3Jrc3BhY2UnLCAnd29ya3NwYWNlJywgJ2dhdGVfcG9saWN5LmNoYW5nZWQnLCBpbnB1dC5ieUFjdG9ySWQsIHtcbiAgICAgIGdhdGU6IGlucHV0LmdhdGUsXG4gICAgICBwb2xpY3k6IHsgLi4uaW5wdXQucG9saWN5IH0sXG4gICAgfSk7XG4gIH1cblxuICBnZXRHYXRlUG9saWN5KGdhdGU6IEdhdGVDb2RlKTogR2F0ZVBvbGljeSB7XG4gICAgcmV0dXJuIHsgLi4uKHRoaXMuZ2F0ZVBvbGljaWVzLmdldChnYXRlKSA/PyB7fSkgfTtcbiAgfVxuXG4gIGF1dGh6RXhwbGFpbihpbnB1dDogeyBhY3RvcklkOiBzdHJpbmc7IHBlcm1pc3Npb246IFBlcm1pc3Npb24gfSk6IEF1dGh6RXhwbGFuYXRpb24ge1xuICAgIGNvbnN0IHNvdXJjZSA9IHRoaXMuZ3JhbnRTb3VyY2UoaW5wdXQuYWN0b3JJZCwgaW5wdXQucGVybWlzc2lvbik7XG4gICAgY29uc3QgYWxsb3dzID0gdGhpcy5hZ2VudENlaWxpbmdBbGxvd3ModGhpcy5hY3RvcnMuZ2V0KGlucHV0LmFjdG9ySWQpLCBpbnB1dC5wZXJtaXNzaW9uKTtcbiAgICByZXR1cm4ge1xuICAgICAgYWN0b3JJZDogaW5wdXQuYWN0b3JJZCxcbiAgICAgIHBlcm1pc3Npb246IGlucHV0LnBlcm1pc3Npb24sXG4gICAgICBhbGxvd2VkOiBzb3VyY2UgIT09IG51bGwgJiYgYWxsb3dzLnBsYW4gJiYgYWxsb3dzLnBvbGljeSxcbiAgICAgIHNvdXJjZSxcbiAgICAgIGdvdmVybmFuY2VSb2xlOiB0aGlzLmdldEdvdmVybmFuY2VSb2xlKGlucHV0LmFjdG9ySWQpLFxuICAgICAgcGxhbjogdGhpcy5wbGFuLFxuICAgICAgcGxhbkFsbG93czogYWxsb3dzLnBsYW4sXG4gICAgICBwb2xpY3lBbGxvd3M6IGFsbG93cy5wb2xpY3ksXG4gICAgICB2ZXJzaW9uczogeyBwbGFuOiB0aGlzLnBsYW5WZXJzaW9uLCBwb2xpY3k6IHRoaXMucG9saWN5VmVyc2lvbiB9LFxuICAgIH07XG4gIH1cblxuICBjcmVhdGVGZWF0dXJlKGlucHV0OiB7IGFjdG9ySWQ6IHN0cmluZyB9KTogRmVhdHVyZSB7XG4gICAgY29uc3QgZmVhdHVyZTogRmVhdHVyZSA9IHsgaWQ6IHRoaXMubmV4dElkKCdmZWF0JyksIHN0YXRlOiAnYmFja2xvZycsIGRpc3BhdGNoSG9sZDogZmFsc2UgfTtcbiAgICB0aGlzLmZlYXR1cmVzLnNldChmZWF0dXJlLmlkLCBmZWF0dXJlKTtcbiAgICB0aGlzLmFwcGVuZCgnZmVhdHVyZScsIGZlYXR1cmUuaWQsICdmZWF0dXJlLmNyZWF0ZWQnLCBpbnB1dC5hY3RvcklkLCB7fSk7XG4gICAgcmV0dXJuIHRoaXMuY29weUZlYXR1cmUoZmVhdHVyZSk7XG4gIH1cblxuICBjcmVhdGVXb3JrSXRlbShpbnB1dDogQ3JlYXRlV29ya0l0ZW1JbnB1dCAmIHsgYWN0b3JJZDogc3RyaW5nIH0pOiBXb3JrSXRlbSB7XG4gICAgY29uc3Qgc2x1ZyA9IGlucHV0LnRpdGxlXG4gICAgICAudG9Mb3dlckNhc2UoKVxuICAgICAgLnJlcGxhY2UoL1teYS16MC05XSsvZywgJy0nKVxuICAgICAgLnJlcGxhY2UoLyheLXwtJCkvZywgJycpO1xuICAgIGNvbnN0IGl0ZW06IFdvcmtJdGVtUm93ID0ge1xuICAgICAgaWQ6IHRoaXMubmV4dElkKCd3aScpLFxuICAgICAgZmVhdHVyZUlkOiBpbnB1dC5mZWF0dXJlSWQsXG4gICAgICBleHRlcm5hbEtleTogaW5wdXQuZXh0ZXJuYWxLZXksXG4gICAgICB0aXRsZTogaW5wdXQudGl0bGUsXG4gICAgICBzdGF0ZTogJ2JhY2tsb2cnLFxuICAgICAgYmxvY2tlZFJlYXNvbjogbnVsbCxcbiAgICAgIHJldmlld0xvb3BJdGVyYXRpb246IDAsXG4gICAgICBpbnRlbnRIYXNoOiBudWxsLFxuICAgICAgcGlubmVkVmVyaWZpY2F0aW9uOiBudWxsLFxuICAgICAgc3BlY0NoZWNrcG9pbnQ6IGlucHV0LnNwZWNDaGVja3BvaW50ID8/IGZhbHNlLFxuICAgICAgZG9uZUNoZWNrcG9pbnQ6IGlucHV0LmRvbmVDaGVja3BvaW50ID8/IGZhbHNlLFxuICAgICAgaW52b2tlRGV2V2l0aDogaW5wdXQuaW52b2tlRGV2V2l0aCA/PyAnJyxcbiAgICAgIHNwZWNQYXRoOiBgc3Rvcmllcy8ke2lucHV0LmV4dGVybmFsS2V5fS0ke3NsdWd9Lm1kYCxcbiAgICAgIHN0YXRlVmVyc2lvbjogMCxcbiAgICAgIGRlcGVuZHNPbjogaW5wdXQuZGVwZW5kc09uID8gWy4uLmlucHV0LmRlcGVuZHNPbl0gOiBbXSxcbiAgICB9O1xuICAgIHRoaXMud29ya0l0ZW1zLnNldChpdGVtLmlkLCBpdGVtKTtcbiAgICBpZiAoIXRoaXMuZXh0ZXJuYWxLZXlJbmRleC5oYXMoaXRlbS5leHRlcm5hbEtleSkpIHtcbiAgICAgIHRoaXMuZXh0ZXJuYWxLZXlJbmRleC5zZXQoaXRlbS5leHRlcm5hbEtleSwgaXRlbS5pZCk7XG4gICAgfVxuICAgIHRoaXMuYXBwZW5kKCd3b3JrX2l0ZW0nLCBpdGVtLmlkLCAnd29ya19pdGVtLmNyZWF0ZWQnLCBpbnB1dC5hY3RvcklkLCB7XG4gICAgICBleHRlcm5hbEtleTogaXRlbS5leHRlcm5hbEtleSxcbiAgICAgIGZlYXR1cmVJZDogaXRlbS5mZWF0dXJlSWQsXG4gICAgfSk7XG4gICAgcmV0dXJuIHRoaXMuY29weUl0ZW0oaXRlbSk7XG4gIH1cblxuICBpbXBvcnRTdG9yaWVzKGlucHV0OiB7IGZlYXR1cmVJZDogc3RyaW5nOyB5YW1sOiBzdHJpbmc7IGFjdG9ySWQ6IHN0cmluZyB9KTogU3Rvcmllc0ltcG9ydFJlc3VsdCB7XG4gICAgY29uc3QgZW50cmllcyA9IHBhcnNlU3RvcmllcyhpbnB1dC55YW1sKTtcbiAgICBpZiAoIXRoaXMuZmVhdHVyZXMuaGFzKGlucHV0LmZlYXR1cmVJZCkpIHtcbiAgICAgIHRocm93IG5ldyBTdG9yaWVzVmFsaWRhdGlvbkVycm9yKGB1bmtub3duIGZlYXR1cmU6ICR7aW5wdXQuZmVhdHVyZUlkfWApO1xuICAgIH1cbiAgICBjb25zdCBpbXBvcnRlZDogc3RyaW5nW10gPSBbXTtcbiAgICBjb25zdCB1cGRhdGVkOiBzdHJpbmdbXSA9IFtdO1xuICAgIGNvbnN0IHdhcm5pbmdzOiBzdHJpbmdbXSA9IFtdO1xuXG4gICAgZm9yIChjb25zdCBlbnRyeSBvZiBlbnRyaWVzKSB7XG4gICAgICBjb25zdCBleGlzdGluZyA9IFsuLi50aGlzLndvcmtJdGVtcy52YWx1ZXMoKV0uZmluZChcbiAgICAgICAgKHdpKSA9PiB3aS5mZWF0dXJlSWQgPT09IGlucHV0LmZlYXR1cmVJZCAmJiB3aS5leHRlcm5hbEtleSA9PT0gZW50cnkuaWQsXG4gICAgICApO1xuICAgICAgaWYgKGV4aXN0aW5nKSB7XG4gICAgICAgIC8vIFJlLWltcG9ydCByZWZyZXNoZXMgZGVzY3JpcHRpdmUgZmllbGRzOyBsaWZlY3ljbGUgc3RhdGUgaXMgbmV2ZXJcbiAgICAgICAgLy8gdG91Y2hlZCAoc3Rvcmllcy55YW1sIGNhcnJpZXMgbm8gc3RhdHVzIFx1MjAxNCBEOSwgdmFsaWRpdHkgcnVsZSAzKS5cbiAgICAgICAgZXhpc3RpbmcudGl0bGUgPSBlbnRyeS50aXRsZTtcbiAgICAgICAgZXhpc3Rpbmcuc3BlY0NoZWNrcG9pbnQgPSBlbnRyeS5zcGVjQ2hlY2twb2ludDtcbiAgICAgICAgZXhpc3RpbmcuZG9uZUNoZWNrcG9pbnQgPSBlbnRyeS5kb25lQ2hlY2twb2ludDtcbiAgICAgICAgZXhpc3RpbmcuaW52b2tlRGV2V2l0aCA9IGVudHJ5Lmludm9rZURldldpdGg7XG4gICAgICAgIHRoaXMuYXBwZW5kKCd3b3JrX2l0ZW0nLCBleGlzdGluZy5pZCwgJ3dvcmtfaXRlbS5yZWltcG9ydGVkJywgaW5wdXQuYWN0b3JJZCwgeyBleHRlcm5hbEtleTogZW50cnkuaWQgfSk7XG4gICAgICAgIHVwZGF0ZWQucHVzaChlbnRyeS5pZCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmNyZWF0ZVdvcmtJdGVtKHtcbiAgICAgICAgICBmZWF0dXJlSWQ6IGlucHV0LmZlYXR1cmVJZCxcbiAgICAgICAgICBleHRlcm5hbEtleTogZW50cnkuaWQsXG4gICAgICAgICAgdGl0bGU6IGVudHJ5LnRpdGxlLFxuICAgICAgICAgIHNwZWNDaGVja3BvaW50OiBlbnRyeS5zcGVjQ2hlY2twb2ludCxcbiAgICAgICAgICBkb25lQ2hlY2twb2ludDogZW50cnkuZG9uZUNoZWNrcG9pbnQsXG4gICAgICAgICAgaW52b2tlRGV2V2l0aDogZW50cnkuaW52b2tlRGV2V2l0aCxcbiAgICAgICAgICBhY3RvcklkOiBpbnB1dC5hY3RvcklkLFxuICAgICAgICB9KTtcbiAgICAgICAgaW1wb3J0ZWQucHVzaChlbnRyeS5pZCk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB7IGltcG9ydGVkLCB1cGRhdGVkLCB3YXJuaW5ncyB9O1xuICB9XG5cbiAgLy8gLS0gY2xhaW1zIChyb2FkbWFwIFx1MDBBNzEuMykgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgY2xhaW1UYXNrKGlucHV0OiB7IHdvcmtJdGVtSWQ6IHN0cmluZzsgYWN0b3JJZDogc3RyaW5nOyB0dGxNcz86IG51bWJlciB9KTogQ2xhaW0ge1xuICAgIGNvbnN0IGl0ZW0gPSB0aGlzLm11c3RHZXRJdGVtKGlucHV0LndvcmtJdGVtSWQpO1xuICAgIHRoaXMucmVxdWlyZVBlcm1pc3Npb24oaW5wdXQuYWN0b3JJZCwgJ3Rhc2suY2xhaW0nKTtcbiAgICBpZiAodGhpcy5saXZlQ2xhaW0oaXRlbS5pZCkgIT09IG51bGwpIHtcbiAgICAgIC8vIE9uZSBsaXZlIGNsYWltIHBlciB3b3JrIGl0ZW0gXHUyMDE0IHJhY2VzIGxvc2UgYnkgY29uc3RyYWludCAoXHUwMEE3MS4zKTtcbiAgICAgIC8vIHRoZSBsb3NlciBsZWF2ZXMgbm8gcm93IGJlaGluZC5cbiAgICAgIHRocm93IG5ldyBDb25mbGljdEVycm9yKGB3b3JrIGl0ZW0gJHtpdGVtLmlkfSBhbHJlYWR5IGhhcyBhIGxpdmUgY2xhaW1gKTtcbiAgICB9XG4gICAgY29uc3QgdHRsTXMgPSBpbnB1dC50dGxNcyA/PyAxNSAqIDYwICogMTAwMDtcbiAgICBjb25zdCB0b2tlbiA9ICh0aGlzLmZlbmNpbmdDb3VudGVyLmdldChpdGVtLmlkKSA/PyAwKSArIDE7XG4gICAgdGhpcy5mZW5jaW5nQ291bnRlci5zZXQoaXRlbS5pZCwgdG9rZW4pO1xuICAgIGNvbnN0IGNsYWltOiBDbGFpbVJvdyA9IHtcbiAgICAgIGlkOiB0aGlzLm5leHRJZCgnY2xhaW0nKSxcbiAgICAgIHdvcmtJdGVtSWQ6IGl0ZW0uaWQsXG4gICAgICBhY3RvcklkOiBpbnB1dC5hY3RvcklkLFxuICAgICAgZmVuY2luZ1Rva2VuOiB0b2tlbixcbiAgICAgIGxlYXNlRXhwaXJlc0F0OiB0aGlzLm5vdyArIHR0bE1zLFxuICAgICAgcmVsZWFzZWQ6IGZhbHNlLFxuICAgICAgdHRsTXMsXG4gICAgfTtcbiAgICB0aGlzLmNsYWltcy5zZXQoY2xhaW0uaWQsIGNsYWltKTtcbiAgICB0aGlzLmNsYWltc0J5SXRlbS5zZXQoaXRlbS5pZCwgWy4uLih0aGlzLmNsYWltc0J5SXRlbS5nZXQoaXRlbS5pZCkgPz8gW10pLCBjbGFpbS5pZF0pO1xuICAgIHRoaXMuYXBwZW5kKCd3b3JrX2l0ZW0nLCBpdGVtLmlkLCAnd29ya19pdGVtLmNsYWltZWQnLCBpbnB1dC5hY3RvcklkLCB7IGNsYWltSWQ6IGNsYWltLmlkLCBmZW5jaW5nVG9rZW46IHRva2VuIH0pO1xuICAgIHJldHVybiB0aGlzLmNvcHlDbGFpbShjbGFpbSk7XG4gIH1cblxuICBoZWFydGJlYXQoaW5wdXQ6IHsgY2xhaW1JZDogc3RyaW5nIH0pOiB2b2lkIHtcbiAgICBjb25zdCBjbGFpbSA9IHRoaXMuY2xhaW1zLmdldChpbnB1dC5jbGFpbUlkKTtcbiAgICBpZiAoIWNsYWltIHx8IGNsYWltLnJlbGVhc2VkIHx8IGNsYWltLmxlYXNlRXhwaXJlc0F0IDw9IHRoaXMubm93KSB7XG4gICAgICB0aHJvdyBuZXcgQ29uZmxpY3RFcnJvcihgY2xhaW0gJHtpbnB1dC5jbGFpbUlkfSBpcyBub3QgbGl2ZWApO1xuICAgIH1cbiAgICBjbGFpbS5sZWFzZUV4cGlyZXNBdCA9IHRoaXMubm93ICsgY2xhaW0udHRsTXM7XG4gIH1cblxuICByZWxlYXNlQ2xhaW0oaW5wdXQ6IHsgY2xhaW1JZDogc3RyaW5nOyByZWFzb24/OiBzdHJpbmcgfSk6IHZvaWQge1xuICAgIGNvbnN0IGNsYWltID0gdGhpcy5jbGFpbXMuZ2V0KGlucHV0LmNsYWltSWQpO1xuICAgIGlmICghY2xhaW0gfHwgY2xhaW0ucmVsZWFzZWQpIHJldHVybjtcbiAgICBjbGFpbS5yZWxlYXNlZCA9IHRydWU7XG4gICAgdGhpcy5hcHBlbmQoJ3dvcmtfaXRlbScsIGNsYWltLndvcmtJdGVtSWQsICdjbGFpbS5yZWxlYXNlZCcsIGNsYWltLmFjdG9ySWQsIHtcbiAgICAgIGNsYWltSWQ6IGNsYWltLmlkLFxuICAgICAgcmVhc29uOiBpbnB1dC5yZWFzb24gPz8gbnVsbCxcbiAgICB9KTtcbiAgfVxuXG4gIGFkdmFuY2VDbG9jayhtczogbnVtYmVyKTogdm9pZCB7XG4gICAgdGhpcy5ub3cgKz0gbXM7XG4gIH1cblxuICAvLyAtLSBsaWZlY3ljbGUgKHJvYWRtYXAgXHUwMEE3MS4yKSAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIGFkdmFuY2VTdGF0ZShpbnB1dDogQWR2YW5jZUlucHV0KTogV29ya0l0ZW0ge1xuICAgIGNvbnN0IGl0ZW0gPSB0aGlzLm11c3RHZXRJdGVtKGlucHV0LndvcmtJdGVtSWQpO1xuXG4gICAgLy8gS2V5ZWQgcmVwbGF5OiB0aGUgc2FtZSBjb21tYW5kIHJldHVybnMgdGhlIHNhbWUgcmVzdWx0LCBhcHBlbmRzIG5vdGhpbmcuXG4gICAgaWYgKGlucHV0LmlkZW1wb3RlbmN5S2V5ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIGNvbnN0IGNhY2hlZCA9IHRoaXMuaWRlbXBvdGVuY3lDYWNoZS5nZXQoaW5wdXQuaWRlbXBvdGVuY3lLZXkpO1xuICAgICAgaWYgKGNhY2hlZCkgcmV0dXJuIHsgLi4uY2FjaGVkIH07XG4gICAgfVxuXG4gICAgLy8gUHJlc2VydmF0aW9uIG5vLW9wIChzcHJpbnQtcGxhbm5pbmcgaWRlbXBvdGVuY3kgcnVsZSk6IGFuIFVOS0VZRURcbiAgICAvLyByZS1yZXF1ZXN0IG9mIHRoZSBjdXJyZW50IHN0YXRlIHN1Y2NlZWRzIHdpdGhvdXQgYW4gZXZlbnQuIEEgTkVXIGtleWVkXG4gICAgLy8gY29tbWFuZCBpcyBhIGdlbnVpbmVseSBuZXcgY29tbWFuZCBhbmQgZmFsbHMgdGhyb3VnaCB0byB0aGUgc3RyaWN0XG4gICAgLy8gdGFibGUgY2hlY2sgKGNvbmN1cnJlbmN5LnRlc3QudHMgcGluKS5cbiAgICBpZiAoaW5wdXQuaWRlbXBvdGVuY3lLZXkgPT09IHVuZGVmaW5lZCAmJiBpbnB1dC50byA9PT0gaXRlbS5zdGF0ZSkge1xuICAgICAgdGhpcy52YWxpZGF0ZVByZXNlbnRlZFRva2VuKGl0ZW0sIGlucHV0LmZlbmNpbmdUb2tlbiwgaW5wdXQuYWN0b3JJZCk7XG4gICAgICByZXR1cm4gdGhpcy5jb3B5SXRlbShpdGVtKTtcbiAgICB9XG5cbiAgICAvLyBUcmFuc2l0aW9uLXRhYmxlIGxvb2t1cCBwcmVjZWRlcyBjbGFpbS90b2tlbi9wZXJtaXNzaW9uIGNoZWNrc1xuICAgIC8vIChmc20tdHJhbnNpdGlvbnMgcGluOiB1bmRlY2xhcmVkIGRvd25ncmFkZXMgYXJlIEludmFsaWRUcmFuc2l0aW9uRXJyb3JcbiAgICAvLyBldmVuIHdpdGggbm8gdG9rZW4gcHJlc2VudGVkKS5cbiAgICBjb25zdCBydWxlID0gVFJBTlNJVElPTlMuZmluZCgodCkgPT4gdC5mcm9tID09PSBpdGVtLnN0YXRlICYmIHQudG8gPT09IGlucHV0LnRvKTtcbiAgICBpZiAoIXJ1bGUpIHtcbiAgICAgIGlmIChSQU5LW2lucHV0LnRvXSA8IFJBTktbaXRlbS5zdGF0ZV0gJiYgdGhpcy5oYXNQZXJtaXNzaW9uKGlucHV0LmFjdG9ySWQsICdzdGF0ZS5kb3duZ3JhZGUnKSkge1xuICAgICAgICByZXR1cm4gdGhpcy5wcml2aWxlZ2VkRG93bmdyYWRlKGl0ZW0sIGlucHV0KTtcbiAgICAgIH1cbiAgICAgIHRocm93IG5ldyBJbnZhbGlkVHJhbnNpdGlvbkVycm9yKGl0ZW0uc3RhdGUsIGlucHV0LnRvKTtcbiAgICB9XG5cbiAgICB0aGlzLnZhbGlkYXRlUHJlc2VudGVkVG9rZW4oaXRlbSwgaW5wdXQuZmVuY2luZ1Rva2VuLCBpbnB1dC5hY3RvcklkKTtcblxuICAgIC8vIEJsb2NrZWQgb3ZlcmxheSBmcmVlemVzIHRyYW5zaXRpb25zIGF0IGV2ZXJ5IHN0YXRlIChEOCwgXHUwMEE3MS4xKS5cbiAgICBpZiAoaXRlbS5ibG9ja2VkUmVhc29uICE9PSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcihgd29yayBpdGVtIGlzIGJsb2NrZWQ6ICR7aXRlbS5ibG9ja2VkUmVhc29ufWApO1xuICAgIH1cblxuICAgIHRoaXMucmVxdWlyZVBlcm1pc3Npb24oaW5wdXQuYWN0b3JJZCwgcnVsZS5wZXJtaXNzaW9uKTtcblxuICAgIGlmIChydWxlLmNsYWltUmVxdWlyZWQpIHtcbiAgICAgIC8vIEV4ZWN1dGlvbi16b25lIHRyYW5zaXRpb25zIGRlbWFuZCBhIFBSRVNFTlRFRCBsaXZlIHRva2VuIFx1MjAxNCBob2xkaW5nXG4gICAgICAvLyB0aGUgY2xhaW0gd2l0aG91dCBwcmVzZW50aW5nIGl0IGlzIG5vdCBlbm91Z2ggKGNsYWltcy50ZXN0LnRzIHBpbikuXG4gICAgICBpZiAoaW5wdXQuZmVuY2luZ1Rva2VuID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoJ2NsYWltIGZlbmNpbmcgdG9rZW4gcmVxdWlyZWQgZm9yIHRoaXMgdHJhbnNpdGlvbicpO1xuICAgICAgfVxuICAgICAgLy8gKGFscmVhZHkgdmFsaWRhdGVkIGFib3ZlKVxuICAgIH1cblxuICAgIGZvciAoY29uc3QgZ3VhcmQgb2YgcnVsZS5ndWFyZHMpIHtcbiAgICAgIHRoaXMuY2hlY2tHdWFyZChndWFyZCwgaXRlbSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuZXhlY3V0ZVRyYW5zaXRpb24oaXRlbSwgaW5wdXQudG8sIGlucHV0LmFjdG9ySWQsIGlucHV0LmlkZW1wb3RlbmN5S2V5KTtcbiAgfVxuXG4gIHByaXZhdGUgY2hlY2tHdWFyZChndWFyZDogVHJhbnNpdGlvblJ1bGVbJ2d1YXJkcyddW251bWJlcl0sIGl0ZW06IFdvcmtJdGVtUm93KTogdm9pZCB7XG4gICAgc3dpdGNoIChndWFyZCkge1xuICAgICAgY2FzZSAnZGVwc19kb25lJzoge1xuICAgICAgICBmb3IgKGNvbnN0IGRlcEtleSBvZiBpdGVtLmRlcGVuZHNPbikge1xuICAgICAgICAgIGNvbnN0IGRlcCA9IFsuLi50aGlzLndvcmtJdGVtcy52YWx1ZXMoKV0uZmluZChcbiAgICAgICAgICAgICh3aSkgPT4gd2kuZmVhdHVyZUlkID09PSBpdGVtLmZlYXR1cmVJZCAmJiB3aS5leHRlcm5hbEtleSA9PT0gZGVwS2V5LFxuICAgICAgICAgICk7XG4gICAgICAgICAgaWYgKGRlcCAmJiBkZXAuc3RhdGUgIT09ICdkb25lJykge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoYGRlcGVuZGVuY3kgJHtkZXBLZXl9IGlzIG5vdCBkb25lYCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGNhc2UgJ3NwZWNfZ2F0ZV9pZl9jaGVja3BvaW50Jzoge1xuICAgICAgICBpZiAoIWl0ZW0uc3BlY0NoZWNrcG9pbnQpIHJldHVybjtcbiAgICAgICAgY29uc3QgYXBwcm92ZWQgPSB0aGlzLmdhdGVEZWNpc2lvbnMuc29tZShcbiAgICAgICAgICAoZCkgPT4gZC53b3JrSXRlbUlkID09PSBpdGVtLmlkICYmIGQuZ2F0ZSA9PT0gJ3NwZWNfYXBwcm92YWwnICYmIGQuZGVjaXNpb24gPT09ICdhcHByb3ZlZCcsXG4gICAgICAgICk7XG4gICAgICAgIGlmICghYXBwcm92ZWQpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcignc3BlY19jaGVja3BvaW50IHJlcXVpcmVzIGFuIGFwcHJvdmVkIHNwZWNfYXBwcm92YWwgZ2F0ZSBkZWNpc2lvbicpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGNhc2UgJ25vbmVtcHR5X2RpZmYnOiB7XG4gICAgICAgIC8vIEFyYml0cmF0ZWQgKENPTkZPUk1BTkNFLm1kIFwiRXZpZGVuY2VcIik6IHRoZSBMQVRFU1Qgc3VibWl0dGVkXG4gICAgICAgIC8vIGdpdF9kaWZmLCBpZiBhbnksIG11c3QgYmUgbm9uLWVtcHR5IFx1MjAxNCBhbiBlbXB0eSBkaWZmIGlzIHRoZVxuICAgICAgICAvLyBmYWtlLWRvbmUgZGVueS4gQWJzZW5jZSBpcyBub3QgY2hlY2tlZCBhdCB0aGlzIHRyYW5zaXRpb24gKHRoZVxuICAgICAgICAvLyBydW5uZXIgY29udHJhY3Qgc3VibWl0cyB0aGUgZGlmZiBiZWZvcmUgcmVxdWVzdGluZyByZXZpZXcsIGFuZCB0aGVcbiAgICAgICAgLy8gZG9uZSBnYXRlIGluZGVwZW5kZW50bHkgZGVtYW5kcyByZW1vdGUtcmVhY2hhYmxlIGNvbW1pdCBldmlkZW5jZSkuXG4gICAgICAgIGNvbnN0IGRpZmZzID0gdGhpcy5ldmlkZW5jZVJvd3MuZmlsdGVyKFxuICAgICAgICAgIChyb3cpID0+IHJvdy53b3JrSXRlbUlkID09PSBpdGVtLmlkICYmIHJvdy5ldmlkZW5jZS5raW5kID09PSAnZ2l0X2RpZmYnLFxuICAgICAgICApO1xuICAgICAgICBjb25zdCBsYXRlc3QgPSBkaWZmc1tkaWZmcy5sZW5ndGggLSAxXTtcbiAgICAgICAgaWYgKGxhdGVzdCAmJiBsYXRlc3QuZXZpZGVuY2UucGF5bG9hZFsnbm9uRW1wdHknXSAhPT0gdHJ1ZSkge1xuICAgICAgICAgIHRocm93IG5ldyBHdWFyZEZhaWxlZEVycm9yKCd0aGUgbGF0ZXN0IGdpdF9kaWZmIGV2aWRlbmNlIGlzIGVtcHR5IFx1MjAxNCBub3RoaW5nIHRvIHJldmlldycpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBwcml2YXRlIHByaXZpbGVnZWREb3duZ3JhZGUoaXRlbTogV29ya0l0ZW1Sb3csIGlucHV0OiBBZHZhbmNlSW5wdXQpOiBXb3JrSXRlbSB7XG4gICAgdGhpcy52YWxpZGF0ZVByZXNlbnRlZFRva2VuKGl0ZW0sIGlucHV0LmZlbmNpbmdUb2tlbiwgaW5wdXQuYWN0b3JJZCk7XG4gICAgaWYgKGl0ZW0uYmxvY2tlZFJlYXNvbiAhPT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoYHdvcmsgaXRlbSBpcyBibG9ja2VkOiAke2l0ZW0uYmxvY2tlZFJlYXNvbn1gKTtcbiAgICB9XG4gICAgY29uc3QgZnJvbSA9IGl0ZW0uc3RhdGU7XG4gICAgaXRlbS5zdGF0ZSA9IGlucHV0LnRvO1xuICAgIGl0ZW0uc3RhdGVWZXJzaW9uICs9IDE7XG4gICAgdGhpcy5hcHBlbmQoXG4gICAgICAnd29ya19pdGVtJyxcbiAgICAgIGl0ZW0uaWQsXG4gICAgICAnd29ya19pdGVtLnN0YXRlX2Rvd25ncmFkZWQnLFxuICAgICAgaW5wdXQuYWN0b3JJZCxcbiAgICAgIHsgZnJvbSwgdG86IGlucHV0LnRvLCBjb21wZW5zYXRpbmc6IHRydWUgfSxcbiAgICAgIGlucHV0LmlkZW1wb3RlbmN5S2V5ICE9PSB1bmRlZmluZWQgPyB7IGlkZW1wb3RlbmN5S2V5OiBpbnB1dC5pZGVtcG90ZW5jeUtleSB9IDogdW5kZWZpbmVkLFxuICAgICk7XG4gICAgY29uc3QgcmVzdWx0ID0gdGhpcy5jb3B5SXRlbShpdGVtKTtcbiAgICBpZiAoaW5wdXQuaWRlbXBvdGVuY3lLZXkgIT09IHVuZGVmaW5lZCkgdGhpcy5pZGVtcG90ZW5jeUNhY2hlLnNldChpbnB1dC5pZGVtcG90ZW5jeUtleSwgeyAuLi5yZXN1bHQgfSk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIC8qKiBTaGFyZWQgYnkgYWR2YW5jZVN0YXRlIGFuZCB0aGUgZ2F0ZS1maXJlZCB0cmFuc2l0aW9ucy4gKi9cbiAgcHJpdmF0ZSBleGVjdXRlVHJhbnNpdGlvbihcbiAgICBpdGVtOiBXb3JrSXRlbVJvdyxcbiAgICB0bzogV29ya0l0ZW1TdGF0ZSxcbiAgICBhY3RvcklkOiBzdHJpbmcsXG4gICAgaWRlbXBvdGVuY3lLZXk/OiBzdHJpbmcsXG4gICAgY2F1c2F0aW9uSWQ/OiBzdHJpbmcsXG4gICk6IFdvcmtJdGVtIHtcbiAgICBjb25zdCBmcm9tID0gaXRlbS5zdGF0ZTtcbiAgICBpdGVtLnN0YXRlID0gdG87XG4gICAgaXRlbS5zdGF0ZVZlcnNpb24gKz0gMTtcbiAgICBjb25zdCBldmVudCA9IHRoaXMuYXBwZW5kKFxuICAgICAgJ3dvcmtfaXRlbScsXG4gICAgICBpdGVtLmlkLFxuICAgICAgJ3dvcmtfaXRlbS5zdGF0ZV9jaGFuZ2VkJyxcbiAgICAgIGFjdG9ySWQsXG4gICAgICB7IGZyb20sIHRvIH0sXG4gICAgICB7XG4gICAgICAgIC4uLihjYXVzYXRpb25JZCAhPT0gdW5kZWZpbmVkID8geyBjYXVzYXRpb25JZCB9IDoge30pLFxuICAgICAgICAuLi4oaWRlbXBvdGVuY3lLZXkgIT09IHVuZGVmaW5lZCA/IHsgaWRlbXBvdGVuY3lLZXkgfSA6IHt9KSxcbiAgICAgIH0sXG4gICAgKTtcblxuICAgIC8vIEVwaWMtbGlmdCBwcm9qZWN0b3IgKHJvYWRtYXAgXHUwMEE3MS4yKTogZmlyc3QgY2hpbGQgTEVBVklORyBiYWNrbG9nIGxpZnRzXG4gICAgLy8gdGhlIGZlYXR1cmU7IGlkZW1wb3RlbnQgYnkgY2hlY2s7IGF1dGhvcmVkIGJ5IHRoZSBzeXN0ZW0gYWN0b3IuXG4gICAgaWYgKGZyb20gPT09ICdiYWNrbG9nJyAmJiB0byAhPT0gJ2JhY2tsb2cnKSB7XG4gICAgICBjb25zdCBmZWF0dXJlID0gdGhpcy5mZWF0dXJlcy5nZXQoaXRlbS5mZWF0dXJlSWQpO1xuICAgICAgaWYgKGZlYXR1cmUgJiYgZmVhdHVyZS5zdGF0ZSA9PT0gJ2JhY2tsb2cnKSB7XG4gICAgICAgIGZlYXR1cmUuc3RhdGUgPSAnaW5fcHJvZ3Jlc3MnO1xuICAgICAgICB0aGlzLmFwcGVuZCgnZmVhdHVyZScsIGZlYXR1cmUuaWQsICdmZWF0dXJlLnN0YXRlX2NoYW5nZWQnLCB0aGlzLnN5c3RlbUFjdG9ySWQsIHtcbiAgICAgICAgICBmcm9tOiAnYmFja2xvZycsXG4gICAgICAgICAgdG86ICdpbl9wcm9ncmVzcycsXG4gICAgICAgIH0sIHsgY2F1c2F0aW9uSWQ6IFN0cmluZyhldmVudC5nbG9iYWxTZXEpIH0pO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIGRvbmVfY2hlY2twb2ludCAocm9hZG1hcCBcdTAwQTcxLjEpOiB0aGUgc3RvcnkgY29tcGxldGVzIG5vcm1hbGx5OyB0aGUgaG9sZFxuICAgIC8vIG1hdGVyaWFsaXplcyBvbiB0aGUgZmVhdHVyZSBleGFjdGx5IGF0IGNvbXBsZXRpb24uXG4gICAgaWYgKHRvID09PSAnZG9uZScgJiYgaXRlbS5kb25lQ2hlY2twb2ludCkge1xuICAgICAgY29uc3QgZmVhdHVyZSA9IHRoaXMuZmVhdHVyZXMuZ2V0KGl0ZW0uZmVhdHVyZUlkKTtcbiAgICAgIGlmIChmZWF0dXJlICYmICFmZWF0dXJlLmRpc3BhdGNoSG9sZCkge1xuICAgICAgICBmZWF0dXJlLmRpc3BhdGNoSG9sZCA9IHRydWU7XG4gICAgICAgIHRoaXMuYXBwZW5kKCdmZWF0dXJlJywgZmVhdHVyZS5pZCwgJ2ZlYXR1cmUuZGlzcGF0Y2hfaG9sZF9yYWlzZWQnLCB0aGlzLnN5c3RlbUFjdG9ySWQsIHtcbiAgICAgICAgICB3b3JrSXRlbUlkOiBpdGVtLmlkLFxuICAgICAgICB9LCB7IGNhdXNhdGlvbklkOiBTdHJpbmcoZXZlbnQuZ2xvYmFsU2VxKSB9KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCByZXN1bHQgPSB0aGlzLmNvcHlJdGVtKGl0ZW0pO1xuICAgIGlmIChpZGVtcG90ZW5jeUtleSAhPT0gdW5kZWZpbmVkKSB0aGlzLmlkZW1wb3RlbmN5Q2FjaGUuc2V0KGlkZW1wb3RlbmN5S2V5LCB7IC4uLnJlc3VsdCB9KTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgYmxvY2tUYXNrKGlucHV0OiB7XG4gICAgd29ya0l0ZW1JZDogc3RyaW5nO1xuICAgIHJlYXNvbjogQmxvY2tlZFJlYXNvbjtcbiAgICBhY3RvcklkOiBzdHJpbmc7XG4gICAgZmVuY2luZ1Rva2VuPzogbnVtYmVyO1xuICB9KTogV29ya0l0ZW0ge1xuICAgIGNvbnN0IGl0ZW0gPSB0aGlzLm11c3RHZXRJdGVtKGlucHV0LndvcmtJdGVtSWQpO1xuICAgIGlmICghKEJMT0NLRURfUkVBU09OUyBhcyByZWFkb25seSBzdHJpbmdbXSkuaW5jbHVkZXMoaW5wdXQucmVhc29uKSkge1xuICAgICAgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoYHVua25vd24gYmxvY2tpbmcgY29uZGl0aW9uOiAke2lucHV0LnJlYXNvbn1gKTtcbiAgICB9XG4gICAgdGhpcy52YWxpZGF0ZVByZXNlbnRlZFRva2VuKGl0ZW0sIGlucHV0LmZlbmNpbmdUb2tlbiwgaW5wdXQuYWN0b3JJZCk7XG4gICAgdGhpcy5yZXF1aXJlUGVybWlzc2lvbihpbnB1dC5hY3RvcklkLCAndGFzay5ibG9jaycpO1xuICAgIGl0ZW0uYmxvY2tlZFJlYXNvbiA9IGlucHV0LnJlYXNvbjtcbiAgICBpdGVtLnN0YXRlVmVyc2lvbiArPSAxO1xuICAgIHRoaXMuYXBwZW5kKCd3b3JrX2l0ZW0nLCBpdGVtLmlkLCAnd29ya19pdGVtLmJsb2NrZWQnLCBpbnB1dC5hY3RvcklkLCB7IHJlYXNvbjogaW5wdXQucmVhc29uIH0pO1xuICAgIHJldHVybiB0aGlzLmNvcHlJdGVtKGl0ZW0pO1xuICB9XG5cbiAgdW5ibG9ja1Rhc2soaW5wdXQ6IHsgd29ya0l0ZW1JZDogc3RyaW5nOyBhY3RvcklkOiBzdHJpbmcgfSk6IFdvcmtJdGVtIHtcbiAgICBjb25zdCBpdGVtID0gdGhpcy5tdXN0R2V0SXRlbShpbnB1dC53b3JrSXRlbUlkKTtcbiAgICAvLyBcdTAwQTc0LjI6IHJldmlld19ub25fY29udmVyZ2VuY2UgY2FuIG9ubHkgYmUgcmVsZWFzZWQgYnkgYSByZXZpZXctZ2F0ZVxuICAgIC8vIGhvbGRlcjsgb3JkaW5hcnkgYmxvY2tzIHJlbGVhc2UgdW5kZXIgdGFzay5ibG9jay5cbiAgICBpZiAoaXRlbS5ibG9ja2VkUmVhc29uID09PSAncmV2aWV3X25vbl9jb252ZXJnZW5jZScpIHtcbiAgICAgIHRoaXMucmVxdWlyZVBlcm1pc3Npb24oaW5wdXQuYWN0b3JJZCwgJ2dhdGUucmV2aWV3LmFwcHJvdmUnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5yZXF1aXJlUGVybWlzc2lvbihpbnB1dC5hY3RvcklkLCAndGFzay5ibG9jaycpO1xuICAgIH1cbiAgICBpdGVtLmJsb2NrZWRSZWFzb24gPSBudWxsO1xuICAgIGl0ZW0uc3RhdGVWZXJzaW9uICs9IDE7XG4gICAgdGhpcy5hcHBlbmQoJ3dvcmtfaXRlbScsIGl0ZW0uaWQsICd3b3JrX2l0ZW0udW5ibG9ja2VkJywgaW5wdXQuYWN0b3JJZCwge30pO1xuICAgIHJldHVybiB0aGlzLmNvcHlJdGVtKGl0ZW0pO1xuICB9XG5cbiAgLy8gLS0gZ2F0ZXMgJiBldmlkZW5jZSAocm9hZG1hcCBcdTAwQTcxLjQpIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIHN1Ym1pdEV2aWRlbmNlKGlucHV0OiB7XG4gICAgd29ya0l0ZW1JZDogc3RyaW5nO1xuICAgIGV2aWRlbmNlOiBFdmlkZW5jZTtcbiAgICBhY3RvcklkOiBzdHJpbmc7XG4gICAgZmVuY2luZ1Rva2VuPzogbnVtYmVyO1xuICB9KTogdm9pZCB7XG4gICAgY29uc3QgaXRlbSA9IHRoaXMubXVzdEdldEl0ZW0oaW5wdXQud29ya0l0ZW1JZCk7XG4gICAgdGhpcy52YWxpZGF0ZVByZXNlbnRlZFRva2VuKGl0ZW0sIGlucHV0LmZlbmNpbmdUb2tlbiwgaW5wdXQuYWN0b3JJZCk7XG4gICAgdGhpcy5ldmlkZW5jZVJvd3MucHVzaCh7IHdvcmtJdGVtSWQ6IGl0ZW0uaWQsIGV2aWRlbmNlOiBpbnB1dC5ldmlkZW5jZSwgc2VxOiB0aGlzLmV2aWRlbmNlUm93cy5sZW5ndGggKyAxIH0pO1xuICAgIHRoaXMuYXBwZW5kKCd3b3JrX2l0ZW0nLCBpdGVtLmlkLCAnZXZpZGVuY2Uuc3VibWl0dGVkJywgaW5wdXQuYWN0b3JJZCwge1xuICAgICAga2luZDogaW5wdXQuZXZpZGVuY2Uua2luZCxcbiAgICB9KTtcbiAgfVxuXG4gIGFwcHJvdmVHYXRlKGlucHV0OiBHYXRlRGVjaXNpb25JbnB1dCk6IFdvcmtJdGVtIHtcbiAgICBjb25zdCBpdGVtID0gdGhpcy5tdXN0R2V0SXRlbShpbnB1dC53b3JrSXRlbUlkKTtcblxuICAgIGlmIChpbnB1dC5nYXRlID09PSAnc3BlY19hcHByb3ZhbCcpIHtcbiAgICAgIC8vIFBlcm1pc3Npb24gcHJlY2VkZXMgYW55IGVmZmVjdDogYSBkZW5pZWQgYXR0ZW1wdCBwaW5zIG5vdGhpbmcuXG4gICAgICB0aGlzLnJlcXVpcmVQZXJtaXNzaW9uKGlucHV0LmFjdG9ySWQsICdnYXRlLnNwZWMuYXBwcm92ZScpO1xuICAgICAgaWYgKGl0ZW0uYmxvY2tlZFJlYXNvbiAhPT0gbnVsbCkge1xuICAgICAgICB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcihgd29yayBpdGVtIGlzIGJsb2NrZWQ6ICR7aXRlbS5ibG9ja2VkUmVhc29ufWApO1xuICAgICAgfVxuICAgICAgaWYgKGl0ZW0uc3RhdGUgIT09ICdkcmFmdCcpIHtcbiAgICAgICAgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoYHNwZWNfYXBwcm92YWwgYXBwbGllcyB0byBkcmFmdCBpdGVtcywgbm90ICR7aXRlbS5zdGF0ZX1gKTtcbiAgICAgIH1cbiAgICAgIGlmIChpbnB1dC5waW5uZWRWZXJpZmljYXRpb24gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBpdGVtLnBpbm5lZFZlcmlmaWNhdGlvbiA9IFsuLi5pbnB1dC5waW5uZWRWZXJpZmljYXRpb25dO1xuICAgICAgfVxuICAgICAgaWYgKCF0aGlzLnF1b3J1bVdvdWxkQmVNZXQoaXRlbSwgJ3NwZWNfYXBwcm92YWwnLCBpbnB1dC5hY3RvcklkKSkge1xuICAgICAgICB0aGlzLnJlY29yZEFwcHJvdmFsKGl0ZW0sICdzcGVjX2FwcHJvdmFsJywgaW5wdXQuYWN0b3JJZCk7XG4gICAgICAgIHJldHVybiB0aGlzLmNvcHlJdGVtKGl0ZW0pOyAvLyBkZWNpc2lvbiByZWNvcmRlZDsgcXVvcnVtIHBlbmRpbmcgKGdhdGUgcG9saWN5IGlzIGRhdGEsIHJvYWRtYXAgXHUwMEE3MylcbiAgICAgIH1cbiAgICAgIHRoaXMucmVjb3JkQXBwcm92YWwoaXRlbSwgJ3NwZWNfYXBwcm92YWwnLCBpbnB1dC5hY3RvcklkKTtcbiAgICAgIC8vIFRoZSBhcHByb3ZhbCBmaXJlcyB0aGUgZ2F0ZWQgZm9yd2FyZCB0cmFuc2l0aW9uIChjb25mb3JtYW5jZSBwaW4pLlxuICAgICAgcmV0dXJuIHRoaXMuZXhlY3V0ZVRyYW5zaXRpb24oaXRlbSwgJ3JlYWR5X2Zvcl9kZXYnLCBpbnB1dC5hY3RvcklkKTtcbiAgICB9XG5cbiAgICAvLyByZXZpZXdfYXBwcm92YWxcbiAgICB0aGlzLnJlcXVpcmVQZXJtaXNzaW9uKGlucHV0LmFjdG9ySWQsICdnYXRlLnJldmlldy5hcHByb3ZlJyk7XG4gICAgaWYgKGl0ZW0uYmxvY2tlZFJlYXNvbiAhPT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoYHdvcmsgaXRlbSBpcyBibG9ja2VkOiAke2l0ZW0uYmxvY2tlZFJlYXNvbn1gKTtcbiAgICB9XG4gICAgaWYgKGl0ZW0uc3RhdGUgIT09ICdpbl9yZXZpZXcnKSB7XG4gICAgICB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcihgcmV2aWV3X2FwcHJvdmFsIGFwcGxpZXMgdG8gaW5fcmV2aWV3IGl0ZW1zLCBub3QgJHtpdGVtLnN0YXRlfWApO1xuICAgIH1cbiAgICBpZiAoIXRoaXMucXVvcnVtV291bGRCZU1ldChpdGVtLCAncmV2aWV3X2FwcHJvdmFsJywgaW5wdXQuYWN0b3JJZCkpIHtcbiAgICAgIHRoaXMucmVjb3JkQXBwcm92YWwoaXRlbSwgJ3Jldmlld19hcHByb3ZhbCcsIGlucHV0LmFjdG9ySWQpO1xuICAgICAgcmV0dXJuIHRoaXMuY29weUl0ZW0oaXRlbSk7IC8vIHF1b3J1bSBwZW5kaW5nIFx1MjAxNCBubyB0cmFuc2l0aW9uIHlldFxuICAgIH1cbiAgICAvLyBFdmlkZW5jZSBpcyBjaGVja2VkIGV4YWN0bHkgd2hlbiB0aGUgcXVvcnVtIHdvdWxkIGNvbXBsZXRlLCBzbyBhIGZhaWxlZFxuICAgIC8vIGFwcHJvdmFsIHJlY29yZHMgbm90aGluZyAoUGhhc2UgMSBwaW46IGRlbmllZCBhdHRlbXB0cyBtdXRhdGUgbm90aGluZykuXG4gICAgdGhpcy5jaGVja1Jldmlld0V2aWRlbmNlKGl0ZW0pO1xuICAgIHRoaXMucmVjb3JkQXBwcm92YWwoaXRlbSwgJ3Jldmlld19hcHByb3ZhbCcsIGlucHV0LmFjdG9ySWQpO1xuICAgIHJldHVybiB0aGlzLmV4ZWN1dGVUcmFuc2l0aW9uKGl0ZW0sICdkb25lJywgaW5wdXQuYWN0b3JJZCk7XG4gIH1cblxuICAvKiogRGlzdGluY3QgYXBwcm92ZXJzIG9mIHRoaXMgcm91bmQgKHJvdW5kID0gcmV2aWV3TG9vcEl0ZXJhdGlvbiBhdCBkZWNpc2lvbiB0aW1lKS4gKi9cbiAgcHJpdmF0ZSByb3VuZEFwcHJvdmVycyhpdGVtOiBXb3JrSXRlbVJvdywgZ2F0ZTogR2F0ZUNvZGUpOiBBY3RvcltdIHtcbiAgICBjb25zdCBpZHMgPSBuZXcgU2V0KFxuICAgICAgdGhpcy5nYXRlRGVjaXNpb25zXG4gICAgICAgIC5maWx0ZXIoXG4gICAgICAgICAgKGQpID0+XG4gICAgICAgICAgICBkLndvcmtJdGVtSWQgPT09IGl0ZW0uaWQgJiZcbiAgICAgICAgICAgIGQuZ2F0ZSA9PT0gZ2F0ZSAmJlxuICAgICAgICAgICAgZC5kZWNpc2lvbiA9PT0gJ2FwcHJvdmVkJyAmJlxuICAgICAgICAgICAgZC5yb3VuZCA9PT0gaXRlbS5yZXZpZXdMb29wSXRlcmF0aW9uLFxuICAgICAgICApXG4gICAgICAgIC5tYXAoKGQpID0+IGQuYWN0b3JJZCksXG4gICAgKTtcbiAgICByZXR1cm4gWy4uLmlkc10uZmxhdE1hcCgoaWQpID0+IHtcbiAgICAgIGNvbnN0IGFjdG9yID0gdGhpcy5hY3RvcnMuZ2V0KGlkKTtcbiAgICAgIHJldHVybiBhY3RvciA/IFthY3Rvcl0gOiBbXTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKiBHYXRlIHBvbGljeSBxdW9ydW0gKHJvYWRtYXAgXHUwMEE3Myk6IG1pbiBkaXN0aW5jdCBhcHByb3ZlcnMgKyByZXF1aXJlZCBhY3RvciB0eXBlcywgYXMgREFUQS4gKi9cbiAgcHJpdmF0ZSBxdW9ydW1Xb3VsZEJlTWV0KGl0ZW06IFdvcmtJdGVtUm93LCBnYXRlOiBHYXRlQ29kZSwgbmV4dEFwcHJvdmVySWQ6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgIGNvbnN0IHBvbGljeSA9IHRoaXMuZ2F0ZVBvbGljaWVzLmdldChnYXRlKSA/PyB7fTtcbiAgICBjb25zdCBtaW4gPSBwb2xpY3kubWluQXBwcm92YWxzID8/IDE7XG4gICAgY29uc3QgcmVxdWlyZWQgPSBwb2xpY3kucmVxdWlyZWRBY3RvclR5cGVzID8/IFtdO1xuICAgIGNvbnN0IGFwcHJvdmVycyA9IHRoaXMucm91bmRBcHByb3ZlcnMoaXRlbSwgZ2F0ZSk7XG4gICAgY29uc3QgbmV4dEFjdG9yID0gdGhpcy5hY3RvcnMuZ2V0KG5leHRBcHByb3ZlcklkKTtcbiAgICBpZiAobmV4dEFjdG9yICYmICFhcHByb3ZlcnMuc29tZSgoYSkgPT4gYS5pZCA9PT0gbmV4dEFjdG9yLmlkKSkgYXBwcm92ZXJzLnB1c2gobmV4dEFjdG9yKTtcbiAgICBpZiAoYXBwcm92ZXJzLmxlbmd0aCA8IG1pbikgcmV0dXJuIGZhbHNlO1xuICAgIGZvciAoY29uc3QgdHlwZSBvZiByZXF1aXJlZCkge1xuICAgICAgaWYgKCFhcHByb3ZlcnMuc29tZSgoYSkgPT4gYS50eXBlID09PSB0eXBlKSkgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIHByaXZhdGUgcmVjb3JkQXBwcm92YWwoaXRlbTogV29ya0l0ZW1Sb3csIGdhdGU6IEdhdGVDb2RlLCBhY3RvcklkOiBzdHJpbmcpOiB2b2lkIHtcbiAgICB0aGlzLmdhdGVEZWNpc2lvbnMucHVzaCh7XG4gICAgICB3b3JrSXRlbUlkOiBpdGVtLmlkLFxuICAgICAgZ2F0ZSxcbiAgICAgIGRlY2lzaW9uOiAnYXBwcm92ZWQnLFxuICAgICAgYWN0b3JJZCxcbiAgICAgIHJvdW5kOiBpdGVtLnJldmlld0xvb3BJdGVyYXRpb24sXG4gICAgfSk7XG4gICAgdGhpcy5hcHBlbmQoJ3dvcmtfaXRlbScsIGl0ZW0uaWQsICdnYXRlLmFwcHJvdmVkJywgYWN0b3JJZCwge1xuICAgICAgZ2F0ZSxcbiAgICAgIHJvdW5kOiBpdGVtLnJldmlld0xvb3BJdGVyYXRpb24sXG4gICAgICAuLi4oZ2F0ZSA9PT0gJ3NwZWNfYXBwcm92YWwnID8geyBwaW5uZWRWZXJpZmljYXRpb246IGl0ZW0ucGlubmVkVmVyaWZpY2F0aW9uIH0gOiB7fSksXG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogRXZpZGVuY2UgY29uZGl0aW9uIG9mIHRoZSBkb25lIGdhdGUgKFx1MDBBNzEuNCwgRDcpOiBldmVyeSBQSU5ORUQgY29tbWFuZCdzXG4gICAqIGxhdGVzdCB0ZXN0X3J1biBleGl0ZWQgMCAoYW4gdW5waW5uZWQgY29tbWFuZCBzYXRpc2ZpZXMgbm90aGluZyksIGFuZCB0aGVcbiAgICogZmluYWwgY29tbWl0IGlzIHJlYWNoYWJsZSBvbiB0aGUgcmVtb3RlLiByZXZpZXdfcmVwb3J0IGlzIG5ldmVyIGNvbnN1bHRlZC5cbiAgICogV2l0aCBub3RoaW5nIHBpbm5lZCwgdGhlIGdhdGUgZGVjaXNpb24gYnkgdGhlIHBlcm1pdHRlZCBhY3RvciBJUyB0aGUgaHVtYW5cbiAgICogZGVjaXNpb24gXHUyMDE0IGV2aWRlbmNlIGFsb25lIG5ldmVyIGNvbXBsZXRlcyB0aGUgaXRlbSBlaXRoZXIgd2F5LlxuICAgKi9cbiAgcHJpdmF0ZSBjaGVja1Jldmlld0V2aWRlbmNlKGl0ZW06IFdvcmtJdGVtUm93KTogdm9pZCB7XG4gICAgY29uc3Qgcm93cyA9IHRoaXMuZXZpZGVuY2VSb3dzLmZpbHRlcigocm93KSA9PiByb3cud29ya0l0ZW1JZCA9PT0gaXRlbS5pZCk7XG4gICAgZm9yIChjb25zdCBjb21tYW5kIG9mIGl0ZW0ucGlubmVkVmVyaWZpY2F0aW9uID8/IFtdKSB7XG4gICAgICBjb25zdCBydW5zID0gcm93cy5maWx0ZXIoXG4gICAgICAgIChyb3cpID0+IHJvdy5ldmlkZW5jZS5raW5kID09PSAndGVzdF9ydW4nICYmIHJvdy5ldmlkZW5jZS5wYXlsb2FkWydjb21tYW5kJ10gPT09IGNvbW1hbmQsXG4gICAgICApO1xuICAgICAgY29uc3QgbGF0ZXN0ID0gcnVuc1tydW5zLmxlbmd0aCAtIDFdO1xuICAgICAgaWYgKCFsYXRlc3QgfHwgbGF0ZXN0LmV2aWRlbmNlLnBheWxvYWRbJ2V4aXRDb2RlJ10gIT09IDApIHtcbiAgICAgICAgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoYHBpbm5lZCB2ZXJpZmljYXRpb24gZGlkIG5vdCBwYXNzOiAke2NvbW1hbmR9YCk7XG4gICAgICB9XG4gICAgfVxuICAgIGNvbnN0IGNvbW1pdE9rID0gcm93cy5zb21lKFxuICAgICAgKHJvdykgPT4gcm93LmV2aWRlbmNlLmtpbmQgPT09ICdjb21taXQnICYmIHJvdy5ldmlkZW5jZS5wYXlsb2FkWydyZWFjaGFibGVPblJlbW90ZSddID09PSB0cnVlLFxuICAgICk7XG4gICAgaWYgKCFjb21taXRPaykge1xuICAgICAgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoJ2ZpbmFsIHJldmlzaW9uIG11c3QgYmUgcmVhY2hhYmxlIG9uIHRoZSByZW1vdGUgKHB1c2ggaXMgcGFydCBvZiB0aGUgSEFMVCBjb250cmFjdCknKTtcbiAgICB9XG4gIH1cblxuICByZWplY3RHYXRlKGlucHV0OiBHYXRlRGVjaXNpb25JbnB1dCk6IFdvcmtJdGVtIHtcbiAgICBjb25zdCBpdGVtID0gdGhpcy5tdXN0R2V0SXRlbShpbnB1dC53b3JrSXRlbUlkKTtcbiAgICBpZiAoaW5wdXQuZ2F0ZSAhPT0gJ3Jldmlld19hcHByb3ZhbCcpIHtcbiAgICAgIHRocm93IG5ldyBHdWFyZEZhaWxlZEVycm9yKCdvbmx5IHJldmlld19hcHByb3ZhbCByZWplY3Rpb24gaXMgZGVmaW5lZCBpbiBQaGFzZSAxJyk7XG4gICAgfVxuICAgIC8vIFBoYXNlIDIgKGFkZGl0aXZlKTogcmVqZWN0aW9uIGF1dGhvcml0eSA9IGdhdGUucmV2aWV3LmFwcHJvdmUgT1JcbiAgICAvLyBnYXRlLnJldmlldy5yZWplY3QgXHUyMDE0IHRoZSBQaGFzZSAyIGV4aXQgY3JpdGVyaW9uJ3MgcmV2aWV3ZXItYWdlbnQgaG9sZHNcbiAgICAvLyBvbmx5IHRoZSBsYXR0ZXIuIEV2ZXJ5IFBoYXNlIDEgcGluIG9uIHJlamVjdEdhdGUga2VlcHMgaG9sZGluZy5cbiAgICBpZiAoXG4gICAgICAhdGhpcy5oYXNQZXJtaXNzaW9uKGlucHV0LmFjdG9ySWQsICdnYXRlLnJldmlldy5hcHByb3ZlJykgJiZcbiAgICAgICF0aGlzLmhhc1Blcm1pc3Npb24oaW5wdXQuYWN0b3JJZCwgJ2dhdGUucmV2aWV3LnJlamVjdCcpXG4gICAgKSB7XG4gICAgICB0aHJvdyBuZXcgUGVybWlzc2lvbkRlbmllZEVycm9yKCdnYXRlLnJldmlldy5yZWplY3QnLCBpbnB1dC5hY3RvcklkKTtcbiAgICB9XG4gICAgaWYgKGl0ZW0uc3RhdGUgIT09ICdpbl9yZXZpZXcnKSB7XG4gICAgICB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcihgcmV2aWV3IHJlamVjdGlvbiBhcHBsaWVzIHRvIGluX3JldmlldyBpdGVtcywgbm90ICR7aXRlbS5zdGF0ZX1gKTtcbiAgICB9XG4gICAgdGhpcy5nYXRlRGVjaXNpb25zLnB1c2goe1xuICAgICAgd29ya0l0ZW1JZDogaXRlbS5pZCxcbiAgICAgIGdhdGU6ICdyZXZpZXdfYXBwcm92YWwnLFxuICAgICAgZGVjaXNpb246ICdyZWplY3RlZCcsXG4gICAgICBhY3RvcklkOiBpbnB1dC5hY3RvcklkLFxuICAgICAgcm91bmQ6IGl0ZW0ucmV2aWV3TG9vcEl0ZXJhdGlvbixcbiAgICB9KTtcbiAgICBjb25zdCBkZWNpc2lvbkV2ZW50ID0gdGhpcy5hcHBlbmQoJ3dvcmtfaXRlbScsIGl0ZW0uaWQsICdnYXRlLnJlamVjdGVkJywgaW5wdXQuYWN0b3JJZCwge1xuICAgICAgZ2F0ZTogJ3Jldmlld19hcHByb3ZhbCcsXG4gICAgfSk7XG5cbiAgICBpZiAoaXRlbS5yZXZpZXdMb29wSXRlcmF0aW9uID49IFJFVklFV19MT09QX0xJTUlUKSB7XG4gICAgICAvLyBUaGUgNnRoIHJlamVjdGlvbiBwZXJmb3JtcyBubyBsb29wYmFjazogb3ZlcmxheSByZXZpZXdfbm9uX2NvbnZlcmdlbmNlLFxuICAgICAgLy8gc3RhdGUgZnJvemVuIGF0IGluX3JldmlldywgY291bnRlciB1bnRvdWNoZWQgKENPTkZPUk1BTkNFLm1kIHBpbikuXG4gICAgICBpdGVtLmJsb2NrZWRSZWFzb24gPSAncmV2aWV3X25vbl9jb252ZXJnZW5jZSc7XG4gICAgICBpdGVtLnN0YXRlVmVyc2lvbiArPSAxO1xuICAgICAgdGhpcy5hcHBlbmQoXG4gICAgICAgICd3b3JrX2l0ZW0nLFxuICAgICAgICBpdGVtLmlkLFxuICAgICAgICAnd29ya19pdGVtLmJsb2NrZWQnLFxuICAgICAgICB0aGlzLnN5c3RlbUFjdG9ySWQsXG4gICAgICAgIHsgcmVhc29uOiAncmV2aWV3X25vbl9jb252ZXJnZW5jZScgfSxcbiAgICAgICAgeyBjYXVzYXRpb25JZDogU3RyaW5nKGRlY2lzaW9uRXZlbnQuZ2xvYmFsU2VxKSB9LFxuICAgICAgKTtcbiAgICAgIHJldHVybiB0aGlzLmNvcHlJdGVtKGl0ZW0pO1xuICAgIH1cblxuICAgIC8vIFx1MDBBNzEuMjogdGhlIGxvb3BiYWNrIGlzIGEgc3lzdGVtIGVmZmVjdCBcdTIwMTQgbm8gY2xhaW0taG9sZGVyIHBhcnRpY2lwYXRpb24uXG4gICAgaXRlbS5yZXZpZXdMb29wSXRlcmF0aW9uICs9IDE7XG4gICAgcmV0dXJuIHRoaXMuZXhlY3V0ZVRyYW5zaXRpb24oaXRlbSwgJ2luX3Byb2dyZXNzJywgdGhpcy5zeXN0ZW1BY3RvcklkLCB1bmRlZmluZWQsIFN0cmluZyhkZWNpc2lvbkV2ZW50Lmdsb2JhbFNlcSkpO1xuICB9XG5cbiAgLy8gLS0gZGlzcGF0Y2ggKHJvYWRtYXAgXHUwMEE3Mi4zKSAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIGdldFRhc2tDb250ZXh0KGlucHV0OiB7IHdvcmtJdGVtSWQ6IHN0cmluZyB9KTogeyB3b3JrSXRlbTogV29ya0l0ZW07IGVudHJ5U3RhdGU6IFdvcmtJdGVtU3RhdGUgfSB7XG4gICAgY29uc3QgaXRlbSA9IHRoaXMubXVzdEdldEl0ZW0oaW5wdXQud29ya0l0ZW1JZCk7XG4gICAgaWYgKGl0ZW0uc3RhdGUgPT09ICdkb25lJykge1xuICAgICAgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoJ2RvbmUgaXRlbXMgYXJlIG5ldmVyIHJlLWRpc3BhdGNoZWQ7IGZvbGxvdy11cCByZXZpZXcgaXMgYSBuZXcgd29yayBpdGVtJyk7XG4gICAgfVxuICAgIGNvbnN0IGZlYXR1cmUgPSB0aGlzLmZlYXR1cmVzLmdldChpdGVtLmZlYXR1cmVJZCk7XG4gICAgaWYgKGZlYXR1cmU/LmRpc3BhdGNoSG9sZCkge1xuICAgICAgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoJ2ZlYXR1cmUgaXMgdW5kZXIgYSBkb25lX2NoZWNrcG9pbnQgZGlzcGF0Y2ggaG9sZCcpO1xuICAgIH1cbiAgICByZXR1cm4geyB3b3JrSXRlbTogdGhpcy5jb3B5SXRlbShpdGVtKSwgZW50cnlTdGF0ZTogaXRlbS5zdGF0ZSB9O1xuICB9XG5cbiAgcmVsZWFzZURpc3BhdGNoSG9sZChpbnB1dDogeyBmZWF0dXJlSWQ6IHN0cmluZzsgYWN0b3JJZDogc3RyaW5nIH0pOiBGZWF0dXJlIHtcbiAgICB0aGlzLnJlcXVpcmVQZXJtaXNzaW9uKGlucHV0LmFjdG9ySWQsICdkaXNwYXRjaC5yZWxlYXNlX2hvbGQnKTtcbiAgICBjb25zdCBmZWF0dXJlID0gdGhpcy5mZWF0dXJlcy5nZXQoaW5wdXQuZmVhdHVyZUlkKTtcbiAgICBpZiAoIWZlYXR1cmUpIHRocm93IG5ldyBHdWFyZEZhaWxlZEVycm9yKGB1bmtub3duIGZlYXR1cmU6ICR7aW5wdXQuZmVhdHVyZUlkfWApO1xuICAgIGZlYXR1cmUuZGlzcGF0Y2hIb2xkID0gZmFsc2U7XG4gICAgdGhpcy5hcHBlbmQoJ2ZlYXR1cmUnLCBmZWF0dXJlLmlkLCAnZmVhdHVyZS5kaXNwYXRjaF9ob2xkX3JlbGVhc2VkJywgaW5wdXQuYWN0b3JJZCwge30pO1xuICAgIHJldHVybiB0aGlzLmNvcHlGZWF0dXJlKGZlYXR1cmUpO1xuICB9XG5cbiAgLy8gLS0gcmVjb25jaWxpYXRpb24gKHJvYWRtYXAgXHUwMEE3MS42LCBENjogZGV0ZWN0LW9ubHksIG5ldmVyIG11dGF0ZXMpIC0tLS0tLS0tLS0tLVxuXG4gIHJlY29uY2lsZShpbnB1dDogeyBmaWxlczogQXJyYXk8eyB3b3JrSXRlbUlkOiBzdHJpbmc7IGZyb250bWF0dGVyU3RhdHVzOiBzdHJpbmcgfT4gfSk6IERpdmVyZ2VuY2VSZXBvcnRbXSB7XG4gICAgY29uc3QgcmVwb3J0czogRGl2ZXJnZW5jZVJlcG9ydFtdID0gW107XG4gICAgZm9yIChjb25zdCBmaWxlIG9mIGlucHV0LmZpbGVzKSB7XG4gICAgICBjb25zdCBpdGVtID0gdGhpcy5tdXN0R2V0SXRlbShmaWxlLndvcmtJdGVtSWQpO1xuICAgICAgLy8gRmlsZXMgdW5kZXIgYSBsaXZlIGNsYWltIGFyZSBleGNsdWRlZCBcdTIwMTQgcGxheWJvb2tzIGxlZ2l0aW1hdGVseSB3cml0ZVxuICAgICAgLy8gZnJvbnRtYXR0ZXIgbWlkLXJ1biAoXHUwMEE3MS42KS5cbiAgICAgIGlmICh0aGlzLmxpdmVDbGFpbShpdGVtLmlkKSAhPT0gbnVsbCkgY29udGludWU7XG5cbiAgICAgIGNvbnN0IHJhdyA9IGZpbGUuZnJvbnRtYXR0ZXJTdGF0dXMudHJpbSgpO1xuICAgICAgaWYgKHJhdyA9PT0gJ2Jsb2NrZWQnKSB7XG4gICAgICAgIC8vIEQ4OiBvdmVybGF5IGluIHRoZSBEQiBhbmQgYHN0YXR1czogYmxvY2tlZGAgaW4gdGhlIGZpbGUgYXJlIHRoZVxuICAgICAgICAvLyBzYW1lIHRydXRoLiBCbG9ja2VkLWluLWZpbGUgd2l0aCBOTyBvdmVybGF5IGlzIHJlYWwgZHJpZnQuXG4gICAgICAgIGlmIChpdGVtLmJsb2NrZWRSZWFzb24gIT09IG51bGwpIGNvbnRpbnVlO1xuICAgICAgICByZXBvcnRzLnB1c2goe1xuICAgICAgICAgIHdvcmtJdGVtSWQ6IGl0ZW0uaWQsXG4gICAgICAgICAgZmlsZVN0YXRlOiByYXcsXG4gICAgICAgICAgZGJTdGF0ZTogaXRlbS5zdGF0ZSxcbiAgICAgICAgICBraW5kOiAnY29uZmxpY3QnLFxuICAgICAgICB9KTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IG5vcm1hbGl6ZWQgPSBMRUdBQ1lfU1RBVFVTW3Jhd107XG4gICAgICBpZiAobm9ybWFsaXplZCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJlcG9ydHMucHVzaCh7IHdvcmtJdGVtSWQ6IGl0ZW0uaWQsIGZpbGVTdGF0ZTogcmF3LCBkYlN0YXRlOiBpdGVtLnN0YXRlLCBraW5kOiAnY29uZmxpY3QnIH0pO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGlmIChub3JtYWxpemVkID09PSBpdGVtLnN0YXRlKSBjb250aW51ZTtcbiAgICAgIHJlcG9ydHMucHVzaCh7XG4gICAgICAgIHdvcmtJdGVtSWQ6IGl0ZW0uaWQsXG4gICAgICAgIGZpbGVTdGF0ZTogcmF3LFxuICAgICAgICBkYlN0YXRlOiBpdGVtLnN0YXRlLFxuICAgICAgICBraW5kOiBSQU5LW25vcm1hbGl6ZWRdID4gUkFOS1tpdGVtLnN0YXRlXSA/ICdmaWxlX2FoZWFkJyA6ICdkYl9haGVhZCcsXG4gICAgICB9KTtcbiAgICB9XG4gICAgcmV0dXJuIHJlcG9ydHM7XG4gIH1cblxuICAvLyAtLSBxdWVyaWVzIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIGdldFdvcmtJdGVtKGlkOiBzdHJpbmcpOiBXb3JrSXRlbSB7XG4gICAgcmV0dXJuIHRoaXMuY29weUl0ZW0odGhpcy5tdXN0R2V0SXRlbShpZCkpO1xuICB9XG5cbiAgZ2V0RmVhdHVyZShpZDogc3RyaW5nKTogRmVhdHVyZSB7XG4gICAgY29uc3QgZmVhdHVyZSA9IHRoaXMuZmVhdHVyZXMuZ2V0KGlkKTtcbiAgICBpZiAoIWZlYXR1cmUpIHRocm93IG5ldyBHdWFyZEZhaWxlZEVycm9yKGB1bmtub3duIGZlYXR1cmU6ICR7aWR9YCk7XG4gICAgcmV0dXJuIHRoaXMuY29weUZlYXR1cmUoZmVhdHVyZSk7XG4gIH1cblxuICBsaXN0V29ya0l0ZW1zKGZpbHRlcj86IHsgc3RhdGU/OiBXb3JrSXRlbVN0YXRlOyBmZWF0dXJlSWQ/OiBzdHJpbmc7IGNsYWltYWJsZT86IGJvb2xlYW4gfSk6IFdvcmtJdGVtW10ge1xuICAgIHJldHVybiBbLi4udGhpcy53b3JrSXRlbXMudmFsdWVzKCldXG4gICAgICAuZmlsdGVyKChpdGVtKSA9PiB7XG4gICAgICAgIGlmIChmaWx0ZXI/LnN0YXRlICE9PSB1bmRlZmluZWQgJiYgaXRlbS5zdGF0ZSAhPT0gZmlsdGVyLnN0YXRlKSByZXR1cm4gZmFsc2U7XG4gICAgICAgIGlmIChmaWx0ZXI/LmZlYXR1cmVJZCAhPT0gdW5kZWZpbmVkICYmIGl0ZW0uZmVhdHVyZUlkICE9PSBmaWx0ZXIuZmVhdHVyZUlkKSByZXR1cm4gZmFsc2U7XG4gICAgICAgIGlmIChmaWx0ZXI/LmNsYWltYWJsZSA9PT0gdHJ1ZSAmJiB0aGlzLmxpdmVDbGFpbShpdGVtLmlkKSAhPT0gbnVsbCkgcmV0dXJuIGZhbHNlO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH0pXG4gICAgICAubWFwKChpdGVtKSA9PiB0aGlzLmNvcHlJdGVtKGl0ZW0pKTtcbiAgfVxuXG4gIGdldENsYWltcyh3b3JrSXRlbUlkOiBzdHJpbmcpOiBDbGFpbVtdIHtcbiAgICBjb25zdCBpdGVtID0gdGhpcy5tdXN0R2V0SXRlbSh3b3JrSXRlbUlkKTtcbiAgICByZXR1cm4gKHRoaXMuY2xhaW1zQnlJdGVtLmdldChpdGVtLmlkKSA/PyBbXSkuZmxhdE1hcCgoY2xhaW1JZCkgPT4ge1xuICAgICAgY29uc3QgY2xhaW0gPSB0aGlzLmNsYWltcy5nZXQoY2xhaW1JZCk7XG4gICAgICByZXR1cm4gY2xhaW0gPyBbdGhpcy5jb3B5Q2xhaW0oY2xhaW0pXSA6IFtdO1xuICAgIH0pO1xuICB9XG5cbiAgZXZlbnRzKHN0cmVhbUlkPzogc3RyaW5nKTogU3BpbmVFdmVudFtdIHtcbiAgICBjb25zdCBzb3VyY2UgPSBzdHJlYW1JZCA9PT0gdW5kZWZpbmVkID8gdGhpcy5ldmVudExvZyA6IHRoaXMuZXZlbnRMb2cuZmlsdGVyKChlKSA9PiBlLnN0cmVhbUlkID09PSBzdHJlYW1JZCk7XG4gICAgcmV0dXJuIHNvdXJjZS5tYXAoKGV2ZW50KSA9PiAoeyAuLi5ldmVudCwgcGF5bG9hZDogeyAuLi5ldmVudC5wYXlsb2FkIH0gfSkpO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVFbmdpbmUoKTogU3BpbmVFbmdpbmUge1xuICByZXR1cm4gbmV3IEVuZ2luZUltcGwoKTtcbn1cbiIsICIvKipcbiAqIEZyb3plbiBpbnRlbnQgcmVnaW9uIGV4dHJhY3Rpb24gKyB2ZXJzaW9uZWQgaW50ZW50IGhhc2ggKHJvYWRtYXAgXHUwMEE3MS4xKS5cbiAqXG4gKiBCb3RoIHJlYWwtd29ybGQgdGFncyBhcmUgcmVjb2duaXplZDogYDxpbnRlbnQtY29udHJhY3Q+YCAoZGV2LWF1dG9cbiAqIHNwZWMtdGVtcGxhdGUubWQpIGFuZCBgPGZyb3plbi1hZnRlci1hcHByb3ZhbCAuLi4+YCAocXVpY2stZGV2XG4gKiBzcGVjLXRlbXBsYXRlLm1kKS4gSGFzaGluZyBoYXBwZW5zIGFmdGVyIGNhbm9uaWNhbGl6YXRpb24gc28gbGluZS1lbmRpbmdcbiAqIGFuZCB0cmFpbGluZy13aGl0ZXNwYWNlIGNodXJuIChDUkxGIGVkaXRvcnMsIGF1dG8tZm9ybWF0dGVycykgbmV2ZXIgbW92ZXNcbiAqIHRoZSBoYXNoIFx1MjAxNCBvbmx5IHJlYWwgaW50ZW50IGRyaWZ0IGRvZXMgKHRlY2huaWNhbC1yaXNrIHJldmlldzogYWxhcm1cbiAqIGZhdGlndWUga2lsbHMgdGhlIG1lY2hhbmlzbSkuXG4gKi9cbmltcG9ydCB7IGNyZWF0ZUhhc2ggfSBmcm9tICdub2RlOmNyeXB0byc7XG5cbmltcG9ydCB7IElOVEVOVF9IQVNIX0FMR08gfSBmcm9tICcuL3R5cGVzLmpzJztcblxuY29uc3QgVEFHX1BBVFRFUk5TID0gW1xuICAvPGludGVudC1jb250cmFjdD4oW1xcc1xcU10qPyk8XFwvaW50ZW50LWNvbnRyYWN0Pi8sXG4gIC88ZnJvemVuLWFmdGVyLWFwcHJvdmFsXFxiW14+XSo+KFtcXHNcXFNdKj8pPFxcL2Zyb3plbi1hZnRlci1hcHByb3ZhbD4vLFxuXTtcblxuZXhwb3J0IGZ1bmN0aW9uIGV4dHJhY3RJbnRlbnRSZWdpb24obWFya2Rvd246IHN0cmluZyk6IHN0cmluZyB8IG51bGwge1xuICBmb3IgKGNvbnN0IHBhdHRlcm4gb2YgVEFHX1BBVFRFUk5TKSB7XG4gICAgY29uc3QgbWF0Y2ggPSBwYXR0ZXJuLmV4ZWMobWFya2Rvd24pO1xuICAgIGlmIChtYXRjaCAhPT0gbnVsbCkgcmV0dXJuIG1hdGNoWzFdID8/ICcnO1xuICB9XG4gIHJldHVybiBudWxsO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY2Fub25pY2FsaXplRm9ySGFzaCh0ZXh0OiBzdHJpbmcpOiBzdHJpbmcge1xuICBjb25zdCB1bml4TmV3bGluZXMgPSB0ZXh0LnJlcGxhY2UoL1xcclxcbi9nLCAnXFxuJyk7XG4gIGNvbnN0IHN0cmlwcGVkID0gdW5peE5ld2xpbmVzXG4gICAgLnNwbGl0KCdcXG4nKVxuICAgIC5tYXAoKGxpbmUpID0+IGxpbmUucmVwbGFjZSgvWyBcXHRdKyQvLCAnJykpXG4gICAgLmpvaW4oJ1xcbicpO1xuICAvLyBDb2xsYXBzZSBydW5zIG9mIDIrIGJsYW5rIGxpbmVzIHRvIGEgc2luZ2xlIGJsYW5rIGxpbmU7IGEgc2luZ2xlIGJsYW5rXG4gIC8vIGxpbmUgaXMgbWVhbmluZ2Z1bCBtYXJrZG93biBhbmQgcGFzc2VzIHRocm91Z2ggdW50b3VjaGVkLlxuICByZXR1cm4gc3RyaXBwZWQucmVwbGFjZSgvXFxuezMsfS9nLCAnXFxuXFxuJyk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjb21wdXRlSW50ZW50SGFzaChyZWdpb246IHN0cmluZyk6IHN0cmluZyB7XG4gIGNvbnN0IGRpZ2VzdCA9IGNyZWF0ZUhhc2goJ3NoYTI1NicpLnVwZGF0ZShjYW5vbmljYWxpemVGb3JIYXNoKHJlZ2lvbiksICd1dGY4JykuZGlnZXN0KCdoZXgnKTtcbiAgcmV0dXJuIGAke0lOVEVOVF9IQVNIX0FMR099OiR7ZGlnZXN0fWA7XG59XG4iLCAiLyoqXG4gKiBAb2Focy9jb3JlIFx1MjAxNCBwdWJsaWMgQVBJIG9mIHRoZSBkZXRlcm1pbmlzdGljIHNwaW5lIChSdWxlcyBsYXllciBhcyBjb2RlKS5cbiAqXG4gKiBUaGUgY29uZm9ybWFuY2Ugc3VpdGUgaW4gdGVzdC8gaXMgdGhlIHNwZWNpZmljYXRpb246IGl0IHdhcyB3cml0dGVuIGZpcnN0LFxuICogZnJvbSB0aGUgcHJvc2UgcnVsZXMgaW4gdGhlIEJNQUQgc291cmNlIGFzIGFyYml0cmF0ZWQgaW4gcHJvZHVjdC1yb2FkbWFwLm1kXG4gKiBcdTAwQTcxIGFuZCB0ZXN0L0NPTkZPUk1BTkNFLm1kLiBJbXBsZW1lbnRhdGlvbiBtb2R1bGVzOlxuICogIC0gdHlwZXMudHMgICAgICAgXHUyMDE0IHZvY2FidWxhcnksIGVudGl0aWVzLCBlcnJvcnMgKHRoZSBmaXhlZCBzdXJmYWNlKVxuICogIC0gZW5naW5lLnRzICAgICAgXHUyMDE0IGluLW1lbW9yeSByZWZlcmVuY2UgZW5naW5lIChGU00sIGNsYWltcywgZ2F0ZXMsIGV2ZW50cylcbiAqICAtIGludGVudC1oYXNoLnRzIFx1MjAxNCBmcm96ZW4tcmVnaW9uIGV4dHJhY3Rpb24gKyB2ZXJzaW9uZWQgY2Fub25pY2FsaXplZCBoYXNoXG4gKiAgLSBzdG9yaWVzLnRzICAgICBcdTIwMTQgc3Rvcmllcy55YW1sIHBhcnNpbmcgKyB2YWxpZGl0eSBydWxlc1xuICpcbiAqIEludmFyaWFudHMgKHByb2R1Y3Qtcm9hZG1hcC5tZCBcdTAwQTcwLjEsIG1hY2hpbmUtY2hlY2tlZCBpbiBDSSk6XG4gKiAgLSBObyBMTE0gU0RLIGltcG9ydCBhbnl3aGVyZSB1bmRlciBwYWNrYWdlcy9jb3JlLlxuICogIC0gTm8gY29kZSBwYXRoIG91dHNpZGUgY29tbWFuZCBoYW5kbGVycyB3cml0ZXMgcHJvamVjdGlvbnMuXG4gKi9cbmltcG9ydCB7IGNyZWF0ZUVuZ2luZSBhcyBjcmVhdGVNZW1vcnlFbmdpbmUgfSBmcm9tICcuL2VuZ2luZS5qcyc7XG5pbXBvcnQgdHlwZSB7IFNwaW5lRW5naW5lIH0gZnJvbSAnLi90eXBlcy5qcyc7XG5cbmV4cG9ydCAqIGZyb20gJy4vdHlwZXMuanMnO1xuZXhwb3J0IHsgZXh0cmFjdEludGVudFJlZ2lvbiwgY2Fub25pY2FsaXplRm9ySGFzaCwgY29tcHV0ZUludGVudEhhc2ggfSBmcm9tICcuL2ludGVudC1oYXNoLmpzJztcbmV4cG9ydCB7IHBhcnNlU3RvcmllcywgdHlwZSBTdG9yeUVudHJ5IH0gZnJvbSAnLi9zdG9yaWVzLmpzJztcblxuLyoqXG4gKiBFbmdpbmUgZmFjdG9yeSBpbmRpcmVjdGlvbjogdGhlIGNvbmZvcm1hbmNlIHN1aXRlIGFsd2F5cyBjYWxsc1xuICogY3JlYXRlRW5naW5lKCk7IGEgcGVyc2lzdGVuY2UgcGFja2FnZSAoZS5nLiBAb2Focy9kYikgcmVnaXN0ZXJzIGl0cyBvd25cbiAqIGZhY3RvcnkgaW4gYSB2aXRlc3Qgc2V0dXAgZmlsZSB0byBydW4gdGhlIElERU5USUNBTCBzdWl0ZSBhZ2FpbnN0IFBvc3RncmVzXG4gKiAoc3RvcnkgXCIxMVwiOiBcImNvbmZvcm1hbmNlIHN1aXRlIHJ1bnMgYWdhaW5zdCBib3RoIG1lbW9yeSBhbmQgUG9zdGdyZXNcbiAqIGVuZ2luZXNcIikuIERlZmF1bHQgaXMgdGhlIGluLW1lbW9yeSByZWZlcmVuY2UgZW5naW5lLlxuICovXG5sZXQgZW5naW5lRmFjdG9yeTogKCkgPT4gU3BpbmVFbmdpbmUgPSBjcmVhdGVNZW1vcnlFbmdpbmU7XG5cbmV4cG9ydCBmdW5jdGlvbiBzZXRFbmdpbmVGYWN0b3J5KGZhY3Rvcnk6ICgpID0+IFNwaW5lRW5naW5lKTogdm9pZCB7XG4gIGVuZ2luZUZhY3RvcnkgPSBmYWN0b3J5O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlRW5naW5lKCk6IFNwaW5lRW5naW5lIHtcbiAgcmV0dXJuIGVuZ2luZUZhY3RvcnkoKTtcbn1cblxuZXhwb3J0IHsgY3JlYXRlTWVtb3J5RW5naW5lIH07XG4iLCAiLyoqXG4gKiBEcml6emxlIHBnLWNvcmUgc2NoZW1hIGZvciB0aGUgb2FocyBzcGluZSAoUGhhc2UgMSBzdG9yeSAxMSkuXG4gKlxuICogRGVzaWduIChwcm9kdWN0LXJvYWRtYXAubWQgXHUwMEE3MS4zLCBcdTAwQTcxLjUgXHUyMDE0IFwicmFjZXMgbG9zZSBieSBjb25zdHJhaW50LCBub3QgYnlcbiAqIGFwcGxpY2F0aW9uIGxvZ2ljXCIpOlxuICogIC0gY2xhaW1zOiBwYXJ0aWFsIHVuaXF1ZSBpbmRleCBPTiAod29ya19pdGVtX2lkKSBXSEVSRSByZWxlYXNlZCA9IGZhbHNlIFx1MjAxNFxuICogICAgdGhlIHNlY29uZCBjb25jdXJyZW50IGNsYWltIGxvc2VzIGF0IHRoZSBjb25zdHJhaW50LCBsZWF2aW5nIG5vIHJvdy5cbiAqICAtIGV2ZW50czogVU5JUVVFIChzdHJlYW1faWQsIHN0cmVhbV9zZXEpIGRvdWJsZXMgYXMgdGhlIG9wdGltaXN0aWMgbG9jaztcbiAqICAgIGdsb2JhbF9zZXEgaXMgYSBzZXJpYWwgaWRlbnRpdHkuXG4gKiAgLSB3b3JrX2l0ZW1zOiBzdGF0ZV92ZXJzaW9uIGludCBcdTIwMTQgQ0FTIHZpYSBVUERBVEUgLi4uIFdIRVJFIHN0YXRlX3ZlcnNpb24gPSAkZXhwZWN0ZWQuXG4gKlxuICogSGFuZC1tYWludGFpbmVkIHR3aW4gRERMIGxpdmVzIGluIHNjaGVtYS1zcWwudHMgKHJ1bnMgb24gUEdsaXRlIGluIHRoZVxuICogY29uZm9ybWFuY2UgaGFybmVzcyk7IGtlZXAgdGhlIHR3byBpbiBsb2Nrc3RlcC5cbiAqL1xuaW1wb3J0IHsgc3FsIH0gZnJvbSAnZHJpenpsZS1vcm0nO1xuaW1wb3J0IHtcbiAgYmlnaW50LFxuICBib29sZWFuLFxuICBpbnRlZ2VyLFxuICBqc29uYixcbiAgcGdUYWJsZSxcbiAgcHJpbWFyeUtleSxcbiAgc2VyaWFsLFxuICB0ZXh0LFxuICB1bmlxdWVJbmRleCxcbn0gZnJvbSAnZHJpenpsZS1vcm0vcGctY29yZSc7XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gYWN0b3JzIFx1MjAxNCB1c2VycywgYWdlbnRzLCBhbmQgdGhlIHBlci13b3Jrc3BhY2Ugc3lzdGVtIGFjdG9yIChyb2FkbWFwIFx1MDBBNzEuMilcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuZXhwb3J0IGNvbnN0IGFjdG9ycyA9IHBnVGFibGUoJ2FjdG9ycycsIHtcbiAgaWQ6IHRleHQoJ2lkJykucHJpbWFyeUtleSgpLFxuICB0eXBlOiB0ZXh0KCd0eXBlJykubm90TnVsbCgpLCAvLyAndXNlcicgfCAnYWdlbnQnIHwgJ3N5c3RlbSdcbiAgZGlzcGxheU5hbWU6IHRleHQoJ2Rpc3BsYXlfbmFtZScpLm5vdE51bGwoKSxcbiAgLyoqIFBoYXNlIDIgKHJvYWRtYXAgXHUwMEE3Myk6ICdhZG1pbicgfCAnbWVtYmVyJyB8ICdhdWRpdG9yJyBcdTIwMTQgZ2F0ZWQtd3JpdGUgYXV0aG9yaXR5ICovXG4gIGdvdmVybmFuY2VSb2xlOiB0ZXh0KCdnb3Zlcm5hbmNlX3JvbGUnKS5ub3ROdWxsKCkuZGVmYXVsdCgnbWVtYmVyJyksXG59KTtcblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBncmFudHMgXHUyMDE0IGZsYXQgUGhhc2UtMSBwZXJtaXNzaW9uIHNldCAoc2NvcGUgYmVjb21lcyBtZWFuaW5nZnVsIGluIFBoYXNlIDIpXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbmV4cG9ydCBjb25zdCBncmFudHMgPSBwZ1RhYmxlKFxuICAnZ3JhbnRzJyxcbiAge1xuICAgIGFjdG9ySWQ6IHRleHQoJ2FjdG9yX2lkJykubm90TnVsbCgpLFxuICAgIHBlcm1pc3Npb246IHRleHQoJ3Blcm1pc3Npb24nKS5ub3ROdWxsKCksXG4gICAgc2NvcGU6IHRleHQoJ3Njb3BlJyksXG4gIH0sXG4gICh0KSA9PiBbcHJpbWFyeUtleSh7IGNvbHVtbnM6IFt0LmFjdG9ySWQsIHQucGVybWlzc2lvbl0gfSldLFxuKTtcblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyByb2xlX2Fzc2lnbm1lbnRzIFx1MjAxNCBkZWxpdmVyeS1yb2xlIGJ1bmRsZXMgKFBoYXNlIDIsIHJvYWRtYXAgXHUwMEE3MykuIEFzc2lnbm1lbnRcbi8vIGdyYW50cyB0aGUgYnVuZGxlOyByZXZvY2F0aW9uIGZsaXBzIGByZXZva2VkYCAoYXVkaXQgaGlzdG9yeSBpcyBrZXB0KS5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuZXhwb3J0IGNvbnN0IHJvbGVBc3NpZ25tZW50cyA9IHBnVGFibGUoJ3JvbGVfYXNzaWdubWVudHMnLCB7XG4gIHNlcTogc2VyaWFsKCdzZXEnKS5wcmltYXJ5S2V5KCksXG4gIGFjdG9ySWQ6IHRleHQoJ2FjdG9yX2lkJykubm90TnVsbCgpLFxuICByb2xlQ29kZTogdGV4dCgncm9sZV9jb2RlJykubm90TnVsbCgpLFxuICBncmFudGVkQnk6IHRleHQoJ2dyYW50ZWRfYnknKS5ub3ROdWxsKCksXG4gIHJldm9rZWQ6IGJvb2xlYW4oJ3Jldm9rZWQnKS5ub3ROdWxsKCkuZGVmYXVsdChmYWxzZSksXG59KTtcblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyB3b3Jrc3BhY2Vfc3RhdGUgXHUyMDE0IHRoZSBzaW5nbGUtcm93IHBsYW4vcG9saWN5IHByb2plY3Rpb24gKFBoYXNlIDIsIHJvYWRtYXBcbi8vIFx1MDBBNzMpLiBFeGFjdGx5IG9uZSByb3cgd2l0aCBpZCA9ICd3b3Jrc3BhY2UnOyB2ZXJzaW9ucyBiYWNrIGF1dGh6LmV4cGxhaW4uXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbmV4cG9ydCBjb25zdCB3b3Jrc3BhY2VTdGF0ZSA9IHBnVGFibGUoJ3dvcmtzcGFjZV9zdGF0ZScsIHtcbiAgaWQ6IHRleHQoJ2lkJykucHJpbWFyeUtleSgpLCAvLyBhbHdheXMgJ3dvcmtzcGFjZSdcbiAgcGxhbjogdGV4dCgncGxhbicpLm5vdE51bGwoKSwgLy8gJ2ZyZWUnIHwgJ3RlYW0nIHwgJ2VudGVycHJpc2UnXG4gIHBsYW5WZXJzaW9uOiBpbnRlZ2VyKCdwbGFuX3ZlcnNpb24nKS5ub3ROdWxsKCkuZGVmYXVsdCgxKSxcbiAgcG9saWN5OiBqc29uYigncG9saWN5JykuJHR5cGU8UmVjb3JkPHN0cmluZywgdW5rbm93bj4+KCkubm90TnVsbCgpLmRlZmF1bHQoc3FsYCd7fSc6Ompzb25iYCksXG4gIHBvbGljeVZlcnNpb246IGludGVnZXIoJ3BvbGljeV92ZXJzaW9uJykubm90TnVsbCgpLmRlZmF1bHQoMSksXG59KTtcblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBnYXRlX3BvbGljaWVzIFx1MjAxNCBnYXRlIGRlZmluaXRpb25zIGFzIERBVEEgKFBoYXNlIDIsIHJvYWRtYXAgXHUwMEE3Myk6XG4vLyBtaW5BcHByb3ZhbHMgKyByZXF1aXJlZEFjdG9yVHlwZXMsIGtleWVkIGJ5IGdhdGUgY29kZS5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuZXhwb3J0IGNvbnN0IGdhdGVQb2xpY2llcyA9IHBnVGFibGUoJ2dhdGVfcG9saWNpZXMnLCB7XG4gIGdhdGU6IHRleHQoJ2dhdGUnKS5wcmltYXJ5S2V5KCksIC8vICdzcGVjX2FwcHJvdmFsJyB8ICdyZXZpZXdfYXBwcm92YWwnXG4gIHBvbGljeToganNvbmIoJ3BvbGljeScpLiR0eXBlPFJlY29yZDxzdHJpbmcsIHVua25vd24+PigpLm5vdE51bGwoKSxcbn0pO1xuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIGZlYXR1cmVzIFx1MjAxNCBlcGljLWxldmVsIHByb2plY3Rpb24gKHN0YXRlICsgZG9uZV9jaGVja3BvaW50IGRpc3BhdGNoIGhvbGQpXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbmV4cG9ydCBjb25zdCBmZWF0dXJlcyA9IHBnVGFibGUoJ2ZlYXR1cmVzJywge1xuICBpZDogdGV4dCgnaWQnKS5wcmltYXJ5S2V5KCksXG4gIHNlcTogc2VyaWFsKCdzZXEnKS5ub3ROdWxsKCksXG4gIHN0YXRlOiB0ZXh0KCdzdGF0ZScpLm5vdE51bGwoKSwgLy8gJ2JhY2tsb2cnIHwgJ2luX3Byb2dyZXNzJyB8ICdkb25lJ1xuICBkaXNwYXRjaEhvbGQ6IGJvb2xlYW4oJ2Rpc3BhdGNoX2hvbGQnKS5ub3ROdWxsKCkuZGVmYXVsdChmYWxzZSksXG59KTtcblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyB3b3JrX2l0ZW1zIFx1MjAxNCB0aGUgdW5pZmllZCB3b3JrLWl0ZW0gbW9kZWwgKHJvYWRtYXAgXHUwMEE3MS4xKVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5leHBvcnQgY29uc3Qgd29ya0l0ZW1zID0gcGdUYWJsZSgnd29ya19pdGVtcycsIHtcbiAgaWQ6IHRleHQoJ2lkJykucHJpbWFyeUtleSgpLFxuICAvKiogY3JlYXRpb24gb3JkZXIgXHUyMDE0IGJhY2tzIGZpcnN0LXdyaXRlci13aW5zIGV4dGVybmFsS2V5IHJlc29sdXRpb24gKi9cbiAgc2VxOiBzZXJpYWwoJ3NlcScpLm5vdE51bGwoKSxcbiAgZmVhdHVyZUlkOiB0ZXh0KCdmZWF0dXJlX2lkJykubm90TnVsbCgpLFxuICBleHRlcm5hbEtleTogdGV4dCgnZXh0ZXJuYWxfa2V5Jykubm90TnVsbCgpLFxuICB0aXRsZTogdGV4dCgndGl0bGUnKS5ub3ROdWxsKCksXG4gIHN0YXRlOiB0ZXh0KCdzdGF0ZScpLm5vdE51bGwoKSxcbiAgYmxvY2tlZFJlYXNvbjogdGV4dCgnYmxvY2tlZF9yZWFzb24nKSwgLy8gb3ZlcmxheSwgbm90IGEgc3RhdGUgKEQ4KVxuICByZXZpZXdMb29wSXRlcmF0aW9uOiBpbnRlZ2VyKCdyZXZpZXdfbG9vcF9pdGVyYXRpb24nKS5ub3ROdWxsKCkuZGVmYXVsdCgwKSxcbiAgaW50ZW50SGFzaDogdGV4dCgnaW50ZW50X2hhc2gnKSxcbiAgcGlubmVkVmVyaWZpY2F0aW9uOiBqc29uYigncGlubmVkX3ZlcmlmaWNhdGlvbicpLiR0eXBlPHN0cmluZ1tdPigpLCAvLyBSdWxlcy1sYXllciBkYXRhIChENylcbiAgc3BlY0NoZWNrcG9pbnQ6IGJvb2xlYW4oJ3NwZWNfY2hlY2twb2ludCcpLm5vdE51bGwoKS5kZWZhdWx0KGZhbHNlKSxcbiAgZG9uZUNoZWNrcG9pbnQ6IGJvb2xlYW4oJ2RvbmVfY2hlY2twb2ludCcpLm5vdE51bGwoKS5kZWZhdWx0KGZhbHNlKSxcbiAgaW52b2tlRGV2V2l0aDogdGV4dCgnaW52b2tlX2Rldl93aXRoJykubm90TnVsbCgpLmRlZmF1bHQoJycpLFxuICBzcGVjUGF0aDogdGV4dCgnc3BlY19wYXRoJykubm90TnVsbCgpLFxuICAvKiogb3B0aW1pc3RpYyBjb25jdXJyZW5jeTogQ0FTIGJ5IFVQREFURSAuLi4gV0hFUkUgc3RhdGVfdmVyc2lvbiA9IGV4cGVjdGVkICovXG4gIHN0YXRlVmVyc2lvbjogaW50ZWdlcignc3RhdGVfdmVyc2lvbicpLm5vdE51bGwoKS5kZWZhdWx0KDApLFxuICAvKiogZGVwZW5kZW5jeSBleHRlcm5hbEtleXMgd2l0aGluIHRoZSBzYW1lIGZlYXR1cmUgKi9cbiAgZGVwZW5kc09uOiBqc29uYignZGVwZW5kc19vbicpLiR0eXBlPHN0cmluZ1tdPigpLm5vdE51bGwoKS5kZWZhdWx0KHNxbGAnW10nOjpqc29uYmApLFxuICAvKiogbW9ub3RvbmljIGZlbmNpbmcgY291bnRlciBwZXIgd29yayBpdGVtIChyb2FkbWFwIFx1MDBBNzEuMykgKi9cbiAgbGFzdEZlbmNpbmdUb2tlbjogaW50ZWdlcignbGFzdF9mZW5jaW5nX3Rva2VuJykubm90TnVsbCgpLmRlZmF1bHQoMCksXG59KTtcblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBjbGFpbXMgXHUyMDE0IGxlYXNlcyArIGZlbmNpbmcgdG9rZW5zOyBPTkUgbGl2ZSBjbGFpbSBwZXIgaXRlbSBCWSBDT05TVFJBSU5UXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbmV4cG9ydCBjb25zdCBjbGFpbXMgPSBwZ1RhYmxlKFxuICAnY2xhaW1zJyxcbiAge1xuICAgIGlkOiB0ZXh0KCdpZCcpLnByaW1hcnlLZXkoKSxcbiAgICBzZXE6IHNlcmlhbCgnc2VxJykubm90TnVsbCgpLFxuICAgIHdvcmtJdGVtSWQ6IHRleHQoJ3dvcmtfaXRlbV9pZCcpLm5vdE51bGwoKSxcbiAgICBhY3RvcklkOiB0ZXh0KCdhY3Rvcl9pZCcpLm5vdE51bGwoKSxcbiAgICBmZW5jaW5nVG9rZW46IGludGVnZXIoJ2ZlbmNpbmdfdG9rZW4nKS5ub3ROdWxsKCksXG4gICAgLyoqIGVuZ2luZS1jbG9jayBtaWxsaXNlY29uZHMgKEpTIGZpZWxkIGBub3dgKSwgbmV2ZXIgU1FMIG5vdygpICovXG4gICAgbGVhc2VFeHBpcmVzQXQ6IGJpZ2ludCgnbGVhc2VfZXhwaXJlc19hdCcsIHsgbW9kZTogJ251bWJlcicgfSkubm90TnVsbCgpLFxuICAgIHJlbGVhc2VkOiBib29sZWFuKCdyZWxlYXNlZCcpLm5vdE51bGwoKS5kZWZhdWx0KGZhbHNlKSxcbiAgICB0dGxNczogYmlnaW50KCd0dGxfbXMnLCB7IG1vZGU6ICdudW1iZXInIH0pLm5vdE51bGwoKSxcbiAgfSxcbiAgKHQpID0+IFtcbiAgICAvLyByb2FkbWFwIFx1MDBBNzEuMzogXCJPbmUgbGl2ZSBjbGFpbSBwZXIgd29yayBpdGVtLCBlbmZvcmNlZCBieSBhIHBhcnRpYWxcbiAgICAvLyB1bmlxdWUgaW5kZXggXHUyMDE0IHJhY2VzIGxvc2UgYnkgY29uc3RyYWludCwgbm90IGJ5IGFwcGxpY2F0aW9uIGxvZ2ljLlwiXG4gICAgdW5pcXVlSW5kZXgoJ2NsYWltc19vbmVfbGl2ZV9wZXJfaXRlbScpLm9uKHQud29ya0l0ZW1JZCkud2hlcmUoc3FsYHJlbGVhc2VkID0gZmFsc2VgKSxcbiAgXSxcbik7XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gZ2F0ZV9kZWNpc2lvbnMgXHUyMDE0IHBlcm1pc3Npb24gc25hcHNob3QgKyBkZWNpc2lvbiByZWNvcmQgKHJvYWRtYXAgXHUwMEE3MS40KVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5leHBvcnQgY29uc3QgZ2F0ZURlY2lzaW9ucyA9IHBnVGFibGUoJ2dhdGVfZGVjaXNpb25zJywge1xuICBzZXE6IHNlcmlhbCgnc2VxJykucHJpbWFyeUtleSgpLFxuICB3b3JrSXRlbUlkOiB0ZXh0KCd3b3JrX2l0ZW1faWQnKS5ub3ROdWxsKCksXG4gIGdhdGU6IHRleHQoJ2dhdGUnKS5ub3ROdWxsKCksIC8vICdzcGVjX2FwcHJvdmFsJyB8ICdyZXZpZXdfYXBwcm92YWwnXG4gIGRlY2lzaW9uOiB0ZXh0KCdkZWNpc2lvbicpLm5vdE51bGwoKSwgLy8gJ2FwcHJvdmVkJyB8ICdyZWplY3RlZCdcbiAgYWN0b3JJZDogdGV4dCgnYWN0b3JfaWQnKS5ub3ROdWxsKCksXG4gIC8qKiByZXZpZXcgcm91bmQgdGhlIGRlY2lzaW9uIGJlbG9uZ3MgdG8gKD0gcmV2aWV3X2xvb3BfaXRlcmF0aW9uIGF0IGRlY2lzaW9uIHRpbWUpICovXG4gIHJvdW5kOiBpbnRlZ2VyKCdyb3VuZCcpLm5vdE51bGwoKS5kZWZhdWx0KDApLFxufSk7XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gZXZpZGVuY2UgXHUyMDE0IG1hY2hpbmUtY29sbGVjdGVkIGZhY3RzOyBzZXEgb3JkZXJzIFwibGF0ZXN0XCIgc2VtYW50aWNzXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbmV4cG9ydCBjb25zdCBldmlkZW5jZSA9IHBnVGFibGUoJ2V2aWRlbmNlJywge1xuICBzZXE6IHNlcmlhbCgnc2VxJykucHJpbWFyeUtleSgpLFxuICB3b3JrSXRlbUlkOiB0ZXh0KCd3b3JrX2l0ZW1faWQnKS5ub3ROdWxsKCksXG4gIGtpbmQ6IHRleHQoJ2tpbmQnKS5ub3ROdWxsKCksXG4gIHBheWxvYWQ6IGpzb25iKCdwYXlsb2FkJykuJHR5cGU8UmVjb3JkPHN0cmluZywgdW5rbm93bj4+KCkubm90TnVsbCgpLFxufSk7XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gZXZlbnRzIFx1MjAxNCBhcHBlbmQtb25seSBsb2csIHNhbWUtdHJhbnNhY3Rpb24gYXMgcHJvamVjdGlvbnMgKHJvYWRtYXAgXHUwMEE3MS41KVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5leHBvcnQgY29uc3QgZXZlbnRzID0gcGdUYWJsZShcbiAgJ2V2ZW50cycsXG4gIHtcbiAgICBnbG9iYWxTZXE6IHNlcmlhbCgnZ2xvYmFsX3NlcScpLnByaW1hcnlLZXkoKSxcbiAgICBzdHJlYW1UeXBlOiB0ZXh0KCdzdHJlYW1fdHlwZScpLm5vdE51bGwoKSwgLy8gJ3dvcmtzcGFjZSd8J2ZlYXR1cmUnfCd3b3JrX2l0ZW0nfCdhY3RvcidcbiAgICBzdHJlYW1JZDogdGV4dCgnc3RyZWFtX2lkJykubm90TnVsbCgpLFxuICAgIHN0cmVhbVNlcTogaW50ZWdlcignc3RyZWFtX3NlcScpLm5vdE51bGwoKSxcbiAgICB0eXBlOiB0ZXh0KCd0eXBlJykubm90TnVsbCgpLFxuICAgIGFjdG9ySWQ6IHRleHQoJ2FjdG9yX2lkJykubm90TnVsbCgpLFxuICAgIHBheWxvYWQ6IGpzb25iKCdwYXlsb2FkJykuJHR5cGU8UmVjb3JkPHN0cmluZywgdW5rbm93bj4+KCkubm90TnVsbCgpLFxuICAgIGNhdXNhdGlvbklkOiB0ZXh0KCdjYXVzYXRpb25faWQnKSxcbiAgICBpZGVtcG90ZW5jeUtleTogdGV4dCgnaWRlbXBvdGVuY3lfa2V5JyksXG4gIH0sXG4gICh0KSA9PiBbXG4gICAgLy8gXHUwMEE3MS41OiBcIlVOSVFVRShzdHJlYW1faWQsIHN0cmVhbV9zZXEpIGRvdWJsZXMgYXMgdGhlIG9wdGltaXN0aWMgbG9jay5cIlxuICAgIHVuaXF1ZUluZGV4KCdldmVudHNfc3RyZWFtX2lkX3N0cmVhbV9zZXEnKS5vbih0LnN0cmVhbUlkLCB0LnN0cmVhbVNlcSksXG4gIF0sXG4pO1xuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIGlkZW1wb3RlbmN5X2tleXMgXHUyMDE0IGtleWVkIHJlcGxheSByZXR1cm5zIHRoZSByZWNvcmRlZCByZXN1bHQsIGFwcGVuZHMgbm90aGluZ1xuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5leHBvcnQgY29uc3QgaWRlbXBvdGVuY3lLZXlzID0gcGdUYWJsZSgnaWRlbXBvdGVuY3lfa2V5cycsIHtcbiAga2V5OiB0ZXh0KCdrZXknKS5wcmltYXJ5S2V5KCksXG4gIHJlc3VsdDoganNvbmIoJ3Jlc3VsdCcpLiR0eXBlPFJlY29yZDxzdHJpbmcsIHVua25vd24+PigpLm5vdE51bGwoKSxcbn0pO1xuIiwgIi8qKlxuICogUGdFbmdpbmUgXHUyMDE0IGFzeW5jIFBvc3RncmVzIHBvcnQgb2YgdGhlIGluLW1lbW9yeSByZWZlcmVuY2UgZW5naW5lXG4gKiAoQG9haHMvY29yZSBzcmMvZW5naW5lLnRzKS4gU2VtYW50aWNzIGFyZSBhIEZBSVRIRlVMIG1pcnJvciwgbWV0aG9kIGJ5XG4gKiBtZXRob2Q6IHNhbWUgY2hlY2sgb3JkZXJpbmcsIHNhbWUgZXJyb3IgY2xhc3Nlcywgc2FtZSBldmVudCB0eXBlcywgc2FtZVxuICogY29uZm9ybWFuY2UgcGlucyAoc2VlIHBhY2thZ2VzL2NvcmUvdGVzdC9DT05GT1JNQU5DRS5tZCkuIFdoZXJlIHRoZVxuICogcmVmZXJlbmNlIHVzZWQgaW4tcHJvY2VzcyBkYXRhIHN0cnVjdHVyZXMsIHRoaXMgZW5naW5lIHVzZXMgdGhlIERyaXp6bGVcbiAqIHNjaGVtYSBpbiBzY2hlbWEudHMgYW5kIGxldHMgY29uc3RyYWludHMgZG8gdGhlIHJhY2luZyAocm9hZG1hcCBcdTAwQTcxLjNcbiAqIFwicmFjZXMgbG9zZSBieSBjb25zdHJhaW50LCBub3QgYnkgYXBwbGljYXRpb24gbG9naWNcIikuXG4gKlxuICogVGVjaG5pY2FsIG5vdGVzOlxuICogIC0gVGhlIGVuZ2luZSBjbG9jayBpcyB0aGUgSlMgZmllbGQgYG5vd2AgKGFkdmFuY2VDbG9jayBhZGRzIHRvIGl0KTsgbGVhc2VcbiAqICAgIGNvbXBhcmlzb25zIGFsd2F5cyB1c2UgdGhpcy5ub3csIG5ldmVyIFNRTCBub3coKS5cbiAqICAtIEV2ZXJ5IGNvbW1hbmQncyB3cml0ZXMgaGFwcGVuIGluIE9ORSBkYi50cmFuc2FjdGlvbiAoZXZlbnQgYXBwZW5kICtcbiAqICAgIHByb2plY3Rpb24gdXBkYXRlIHRvZ2V0aGVyIFx1MjAxNCByb2FkbWFwIFx1MDBBNzEuNSkuIFRoZSBzaW5nbGUgZGVsaWJlcmF0ZVxuICogICAgZXhjZXB0aW9uOiB0aGUgZmVuY2luZy5yZWplY3RlZCBBVURJVCBldmVudCBjb21taXRzIGluIGl0cyBvd25cbiAqICAgIHRyYW5zYWN0aW9uLCBiZWNhdXNlIHRoZSBjb21tYW5kIGl0IGJlbG9uZ3MgdG8gZmFpbHMgd2l0aCBDb25mbGljdEVycm9yXG4gKiAgICBhbmQgbXVzdCBsZWF2ZSB0aGUgcHJvamVjdGlvbiB1bnRvdWNoZWQgd2hpbGUgdGhlIHJlZnVzYWwgaXMgcmVjb3JkZWRcbiAqICAgIChcdTAwQTcxLjMgXCJhIHN0YWxlIHRva2VuIGdldHMgNDA5IGFuZCBhbiBhdWRpdCBldmVudFwiKS5cbiAqICAtIEFsbCByZXR1cm5lZCB2YWx1ZXMgYXJlIHN0cnVjdHVyZWQtY2xvbmUtYWJsZSBwbGFpbiBvYmplY3RzIChudW1iZXJcbiAqICAgIHRpbWVzdGFtcHMsIG5vIERhdGUsIG5vIHVuZGVmaW5lZCBhcnJheSBob2xlcykgc28gdGhleSBjcm9zcyB0aGVcbiAqICAgIHN5bmNraXQgd29ya2VyIGJvdW5kYXJ5IGludGFjdC5cbiAqL1xuaW1wb3J0IHsgYW5kLCBhc2MsIGVxLCBndCwgbHRlLCBzcWwgfSBmcm9tICdkcml6emxlLW9ybSc7XG5pbXBvcnQgdHlwZSB7IFBnbGl0ZURhdGFiYXNlIH0gZnJvbSAnZHJpenpsZS1vcm0vcGdsaXRlJztcblxuaW1wb3J0IHtcbiAgQUdFTlRfR0FURV9BUFBST1ZFX1BFUk1JU1NJT05TLFxuICBCTE9DS0VEX1JFQVNPTlMsXG4gIENvbmZsaWN0RXJyb3IsXG4gIERFRkFVTFRfUExBTixcbiAgREVMSVZFUllfUk9MRVMsXG4gIEd1YXJkRmFpbGVkRXJyb3IsXG4gIEludmFsaWRUcmFuc2l0aW9uRXJyb3IsXG4gIFBlcm1pc3Npb25EZW5pZWRFcnJvcixcbiAgUExBTl9DRUlMSU5HUyxcbiAgUkVWSUVXX0xPT1BfTElNSVQsXG4gIFN0b3JpZXNWYWxpZGF0aW9uRXJyb3IsXG4gIFdPUktfSVRFTV9TVEFURVMsXG4gIHBhcnNlU3RvcmllcyxcbiAgdHlwZSBBY3RvcixcbiAgdHlwZSBBY3RvclR5cGUsXG4gIHR5cGUgQWR2YW5jZUlucHV0LFxuICB0eXBlIEF1dGh6RXhwbGFuYXRpb24sXG4gIHR5cGUgQmxvY2tlZFJlYXNvbixcbiAgdHlwZSBDbGFpbSxcbiAgdHlwZSBDcmVhdGVXb3JrSXRlbUlucHV0LFxuICB0eXBlIERpdmVyZ2VuY2VSZXBvcnQsXG4gIHR5cGUgRXZpZGVuY2UsXG4gIHR5cGUgRmVhdHVyZSxcbiAgdHlwZSBHYXRlQ29kZSxcbiAgdHlwZSBHYXRlRGVjaXNpb25JbnB1dCxcbiAgdHlwZSBHYXRlUG9saWN5LFxuICB0eXBlIEdvdmVybmFuY2VSb2xlLFxuICB0eXBlIFBlcm1pc3Npb24sXG4gIHR5cGUgUGxhbkNvZGUsXG4gIHR5cGUgUm9sZUFzc2lnbm1lbnQsXG4gIHR5cGUgU3BpbmVFdmVudCxcbiAgdHlwZSBTdG9yaWVzSW1wb3J0UmVzdWx0LFxuICB0eXBlIFdvcmtJdGVtLFxuICB0eXBlIFdvcmtJdGVtU3RhdGUsXG4gIHR5cGUgV29ya3NwYWNlUG9saWN5LFxufSBmcm9tICdAb2Focy9jb3JlJztcblxuaW1wb3J0IHtcbiAgYWN0b3JzLFxuICBjbGFpbXMsXG4gIGV2aWRlbmNlIGFzIGV2aWRlbmNlVGFibGUsXG4gIGV2ZW50cyxcbiAgZmVhdHVyZXMsXG4gIGdhdGVEZWNpc2lvbnMsXG4gIGdhdGVQb2xpY2llcyxcbiAgZ3JhbnRzLFxuICBpZGVtcG90ZW5jeUtleXMsXG4gIHJvbGVBc3NpZ25tZW50cyxcbiAgd29ya0l0ZW1zLFxuICB3b3Jrc3BhY2VTdGF0ZSxcbn0gZnJvbSAnLi9zY2hlbWEuanMnO1xuXG50eXBlIERiID0gUGdsaXRlRGF0YWJhc2U8UmVjb3JkPHN0cmluZywgdW5rbm93bj4+O1xudHlwZSBUeCA9IFBhcmFtZXRlcnM8UGFyYW1ldGVyczxEYlsndHJhbnNhY3Rpb24nXT5bMF0+WzBdO1xuLyoqIEJvdGggdGhlIHJvb3QgZGF0YWJhc2UgYW5kIGEgdHJhbnNhY3Rpb24gZXhwb3NlIHRoZSBzYW1lIHF1ZXJ5IHN1cmZhY2UuICovXG50eXBlIFF1ZXJ5YWJsZSA9IERiIHwgVHg7XG5cbnR5cGUgV29ya0l0ZW1Sb3cgPSB0eXBlb2Ygd29ya0l0ZW1zLiRpbmZlclNlbGVjdDtcbnR5cGUgQ2xhaW1Sb3cgPSB0eXBlb2YgY2xhaW1zLiRpbmZlclNlbGVjdDtcbnR5cGUgRmVhdHVyZVJvdyA9IHR5cGVvZiBmZWF0dXJlcy4kaW5mZXJTZWxlY3Q7XG50eXBlIEV2ZW50Um93ID0gdHlwZW9mIGV2ZW50cy4kaW5mZXJTZWxlY3Q7XG50eXBlIEFjdG9yUm93ID0gdHlwZW9mIGFjdG9ycy4kaW5mZXJTZWxlY3Q7XG50eXBlIFdvcmtzcGFjZVN0YXRlUm93ID0gdHlwZW9mIHdvcmtzcGFjZVN0YXRlLiRpbmZlclNlbGVjdDtcblxuLyoqIFRoZSBzaW5nbGUgd29ya3NwYWNlX3N0YXRlIHJvdyBrZXkgKGFuZCB0aGUgd29ya3NwYWNlIGV2ZW50LXN0cmVhbSBpZCkuICovXG5jb25zdCBXT1JLU1BBQ0VfSUQgPSAnd29ya3NwYWNlJztcblxuY29uc3QgUkFOSzogUmVjb3JkPFdvcmtJdGVtU3RhdGUsIG51bWJlcj4gPSBPYmplY3QuZnJvbUVudHJpZXMoXG4gIFdPUktfSVRFTV9TVEFURVMubWFwKChzLCBpKSA9PiBbcywgaV0pLFxuKSBhcyBSZWNvcmQ8V29ya0l0ZW1TdGF0ZSwgbnVtYmVyPjtcblxuLyoqIE1pcnJvciBvZiB0aGUgcmVmZXJlbmNlIHRyYW5zaXRpb24gdGFibGUgKGVuZ2luZS50cykgXHUyMDE0IGRvIG5vdCBkaXZlcmdlLiAqL1xuaW50ZXJmYWNlIFRyYW5zaXRpb25SdWxlIHtcbiAgZnJvbTogV29ya0l0ZW1TdGF0ZTtcbiAgdG86IFdvcmtJdGVtU3RhdGU7XG4gIHBlcm1pc3Npb246IFBlcm1pc3Npb247XG4gIGNsYWltUmVxdWlyZWQ6IGJvb2xlYW47XG4gIGd1YXJkczogQXJyYXk8J2RlcHNfZG9uZScgfCAnc3BlY19nYXRlX2lmX2NoZWNrcG9pbnQnIHwgJ25vbmVtcHR5X2RpZmYnPjtcbn1cblxuY29uc3QgVFJBTlNJVElPTlM6IFRyYW5zaXRpb25SdWxlW10gPSBbXG4gIHsgZnJvbTogJ2JhY2tsb2cnLCB0bzogJ2RyYWZ0JywgcGVybWlzc2lvbjogJ3Rhc2sucGxhbicsIGNsYWltUmVxdWlyZWQ6IGZhbHNlLCBndWFyZHM6IFtdIH0sXG4gIHtcbiAgICBmcm9tOiAnZHJhZnQnLFxuICAgIHRvOiAncmVhZHlfZm9yX2RldicsXG4gICAgcGVybWlzc2lvbjogJ3Rhc2sucGxhbicsXG4gICAgY2xhaW1SZXF1aXJlZDogZmFsc2UsXG4gICAgZ3VhcmRzOiBbJ3NwZWNfZ2F0ZV9pZl9jaGVja3BvaW50J10sXG4gIH0sXG4gIHtcbiAgICBmcm9tOiAncmVhZHlfZm9yX2RldicsXG4gICAgdG86ICdpbl9wcm9ncmVzcycsXG4gICAgcGVybWlzc2lvbjogJ3Rhc2suYWR2YW5jZScsXG4gICAgY2xhaW1SZXF1aXJlZDogdHJ1ZSxcbiAgICBndWFyZHM6IFsnZGVwc19kb25lJ10sXG4gIH0sXG4gIHtcbiAgICBmcm9tOiAnaW5fcHJvZ3Jlc3MnLFxuICAgIHRvOiAnaW5fcmV2aWV3JyxcbiAgICBwZXJtaXNzaW9uOiAndGFzay5hZHZhbmNlJyxcbiAgICBjbGFpbVJlcXVpcmVkOiB0cnVlLFxuICAgIGd1YXJkczogWydub25lbXB0eV9kaWZmJ10sXG4gIH0sXG5dO1xuXG5jb25zdCBMRUdBQ1lfU1RBVFVTOiBSZWNvcmQ8c3RyaW5nLCBXb3JrSXRlbVN0YXRlPiA9IHtcbiAgYmFja2xvZzogJ2JhY2tsb2cnLFxuICBkcmFmdDogJ2RyYWZ0JyxcbiAgJ3JlYWR5LWZvci1kZXYnOiAncmVhZHlfZm9yX2RldicsXG4gIHJlYWR5X2Zvcl9kZXY6ICdyZWFkeV9mb3JfZGV2JyxcbiAgJ2luLXByb2dyZXNzJzogJ2luX3Byb2dyZXNzJyxcbiAgaW5fcHJvZ3Jlc3M6ICdpbl9wcm9ncmVzcycsXG4gICdpbi1yZXZpZXcnOiAnaW5fcmV2aWV3JyxcbiAgaW5fcmV2aWV3OiAnaW5fcmV2aWV3JyxcbiAgcmV2aWV3OiAnaW5fcmV2aWV3JyxcbiAgZG9uZTogJ2RvbmUnLFxufTtcblxuLyoqIFBvc3RncmVzIHVuaXF1ZS12aW9sYXRpb24gZGV0ZWN0b3IgKHdhbGtzIGRyaXp6bGUncyB3cmFwcGVkIGNhdXNlcykuICovXG5mdW5jdGlvbiBpc1VuaXF1ZVZpb2xhdGlvbihlcnJvcjogdW5rbm93bik6IGJvb2xlYW4ge1xuICBsZXQgY3VycmVudDogdW5rbm93biA9IGVycm9yO1xuICBmb3IgKGxldCBkZXB0aCA9IDA7IGRlcHRoIDwgNSAmJiBjdXJyZW50ICE9PSBudWxsICYmIHR5cGVvZiBjdXJyZW50ID09PSAnb2JqZWN0JzsgZGVwdGggKz0gMSkge1xuICAgIGNvbnN0IGVyciA9IGN1cnJlbnQgYXMgeyBjb2RlPzogdW5rbm93bjsgbWVzc2FnZT86IHVua25vd247IGNhdXNlPzogdW5rbm93biB9O1xuICAgIGlmIChlcnIuY29kZSA9PT0gJzIzNTA1JykgcmV0dXJuIHRydWU7XG4gICAgaWYgKHR5cGVvZiBlcnIubWVzc2FnZSA9PT0gJ3N0cmluZycgJiYgL2R1cGxpY2F0ZSBrZXkgdmFsdWUgdmlvbGF0ZXMgdW5pcXVlL2kudGVzdChlcnIubWVzc2FnZSkpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICBjdXJyZW50ID0gZXJyLmNhdXNlO1xuICB9XG4gIHJldHVybiBmYWxzZTtcbn1cblxuZXhwb3J0IGNsYXNzIFBnRW5naW5lIHtcbiAgLyoqIEVuZ2luZSBjbG9jayBpbiBtcyBcdTIwMTQgdGhlIE9OTFkgdGltZSBzb3VyY2UgZm9yIGxlYXNlIGxvZ2ljLiAqL1xuICBwcml2YXRlIG5vdyA9IDA7XG4gIHByaXZhdGUgc2VxID0gMDtcbiAgcHJpdmF0ZSBzeXN0ZW1BY3RvcklkID0gJyc7XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSByZWFkb25seSBkYjogRGIpIHt9XG5cbiAgLyoqXG4gICAqIFBvc3QtcmVzZXQgc2V0dXA6IHRoZSBwZXItd29ya3NwYWNlIHN5c3RlbSBhY3RvciAocm9hZG1hcCBcdTAwQTcxLjIpLlxuICAgKlxuICAgKiBJZGVtcG90ZW50IGZvciBwZXJzaXN0ZW50IGRhdGFiYXNlcyAoc3RvcnkgMTMsIGBvYWhzIHNlcnZlIC0tZGF0YWApOiBhXG4gICAqIHJlc3RhcnQgb3ZlciBhbiBleGlzdGluZyBQR2xpdGUgZGF0YSBkaXJlY3RvcnkgZmluZHMgdGhlIHN5c3RlbSBhY3RvclxuICAgKiBhbHJlYWR5IHByZXNlbnQsIHJldXNlcyBpdCwgYW5kIHJlY292ZXJzIHRoZSBpZCBjb3VudGVyIGZyb20gdGhlIHN0b3JlZFxuICAgKiBpZHMgc28gZnJlc2hseS1jcmVhdGVkIGVudGl0aWVzIG5ldmVyIGNvbGxpZGUgd2l0aCBwZXJzaXN0ZWQgb25lcy4gQVxuICAgKiBmcmVzaCAob3IgdHJ1bmNhdGVkKSBkYXRhYmFzZSB0YWtlcyB0aGUgb3JpZ2luYWwgcGF0aCB1bmNoYW5nZWQsIHNvIHRoZVxuICAgKiBjb25mb3JtYW5jZSBzdWl0ZSBzZW1hbnRpY3MgYXJlIHVudG91Y2hlZC5cbiAgICovXG4gIGFzeW5jIGluaXQoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgLy8gU2luZ2xlLXJvdyBwbGFuL3BvbGljeSBwcm9qZWN0aW9uIChQaGFzZSAyLCByb2FkbWFwIFx1MDBBNzMpLiBvbkNvbmZsaWN0RG9Ob3RoaW5nXG4gICAgLy8ga2VlcHMgdGhpcyBpZGVtcG90ZW50IGZvciBkdXJhYmxlIHJlc3RhcnRzIFx1MjAxNCBhbiBleGlzdGluZyBwbGFuIHN1cnZpdmVzLlxuICAgIGF3YWl0IHRoaXMuZGJcbiAgICAgIC5pbnNlcnQod29ya3NwYWNlU3RhdGUpXG4gICAgICAudmFsdWVzKHsgaWQ6IFdPUktTUEFDRV9JRCwgcGxhbjogREVGQVVMVF9QTEFOLCBwbGFuVmVyc2lvbjogMSwgcG9saWN5OiB7fSwgcG9saWN5VmVyc2lvbjogMSB9KVxuICAgICAgLm9uQ29uZmxpY3REb05vdGhpbmcoKTtcbiAgICBjb25zdCBleGlzdGluZyA9IGF3YWl0IHRoaXMuZGJcbiAgICAgIC5zZWxlY3QoeyBpZDogYWN0b3JzLmlkIH0pXG4gICAgICAuZnJvbShhY3RvcnMpXG4gICAgICAud2hlcmUoZXEoYWN0b3JzLnR5cGUsICdzeXN0ZW0nKSlcbiAgICAgIC5saW1pdCgxKTtcbiAgICBjb25zdCBmb3VuZCA9IGV4aXN0aW5nWzBdO1xuICAgIGlmIChmb3VuZCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aGlzLnN5c3RlbUFjdG9ySWQgPSBmb3VuZC5pZDtcbiAgICAgIHRoaXMuc2VxID0gYXdhaXQgdGhpcy5yZWNvdmVyU2VxKCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXMuc3lzdGVtQWN0b3JJZCA9IHRoaXMubmV4dElkKCdhY3Rvci1zeXN0ZW0nKTtcbiAgICBhd2FpdCB0aGlzLmRiLmluc2VydChhY3RvcnMpLnZhbHVlcyh7XG4gICAgICBpZDogdGhpcy5zeXN0ZW1BY3RvcklkLFxuICAgICAgdHlwZTogJ3N5c3RlbScsXG4gICAgICBkaXNwbGF5TmFtZTogJ3N5c3RlbScsXG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogTGFyZ2VzdCBuZXh0SWQoKSBzdWZmaXggc3RvcmVkIGluIGFueSB0ZXh0LWlkIHRhYmxlIFx1MjAxNCByZXN0YXJ0LXNhZmUgaWRcbiAgICogZ2VuZXJhdGlvbiBmb3IgcGVyc2lzdGVudCBkYXRhIGRpcmVjdG9yaWVzLiBJZHMgYXJlIGAke3ByZWZpeH1fJHtiYXNlMzZ9YC5cbiAgICovXG4gIHByaXZhdGUgYXN5bmMgcmVjb3ZlclNlcSgpOiBQcm9taXNlPG51bWJlcj4ge1xuICAgIGNvbnN0IGlkczogc3RyaW5nW10gPSBbXTtcbiAgICBpZHMucHVzaCguLi4oYXdhaXQgdGhpcy5kYi5zZWxlY3QoeyBpZDogYWN0b3JzLmlkIH0pLmZyb20oYWN0b3JzKSkubWFwKChyKSA9PiByLmlkKSk7XG4gICAgaWRzLnB1c2goLi4uKGF3YWl0IHRoaXMuZGIuc2VsZWN0KHsgaWQ6IGZlYXR1cmVzLmlkIH0pLmZyb20oZmVhdHVyZXMpKS5tYXAoKHIpID0+IHIuaWQpKTtcbiAgICBpZHMucHVzaCguLi4oYXdhaXQgdGhpcy5kYi5zZWxlY3QoeyBpZDogd29ya0l0ZW1zLmlkIH0pLmZyb20od29ya0l0ZW1zKSkubWFwKChyKSA9PiByLmlkKSk7XG4gICAgaWRzLnB1c2goLi4uKGF3YWl0IHRoaXMuZGIuc2VsZWN0KHsgaWQ6IGNsYWltcy5pZCB9KS5mcm9tKGNsYWltcykpLm1hcCgocikgPT4gci5pZCkpO1xuICAgIGxldCBtYXggPSAwO1xuICAgIGZvciAoY29uc3QgaWQgb2YgaWRzKSB7XG4gICAgICBjb25zdCBzZXAgPSBpZC5sYXN0SW5kZXhPZignXycpO1xuICAgICAgaWYgKHNlcCA8IDApIGNvbnRpbnVlO1xuICAgICAgY29uc3QgbiA9IE51bWJlci5wYXJzZUludChpZC5zbGljZShzZXAgKyAxKSwgMzYpO1xuICAgICAgaWYgKE51bWJlci5pc0Zpbml0ZShuKSAmJiBuID4gbWF4KSBtYXggPSBuO1xuICAgIH1cbiAgICByZXR1cm4gbWF4O1xuICB9XG5cbiAgLy8gLS0gaW5mcmFzdHJ1Y3R1cmUgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICBwcml2YXRlIG5leHRJZChwcmVmaXg6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgdGhpcy5zZXEgKz0gMTtcbiAgICByZXR1cm4gYCR7cHJlZml4fV8ke3RoaXMuc2VxLnRvU3RyaW5nKDM2KS5wYWRTdGFydCg2LCAnMCcpfWA7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIGFwcGVuZFR4KFxuICAgIHR4OiBRdWVyeWFibGUsXG4gICAgc3RyZWFtVHlwZTogU3BpbmVFdmVudFsnc3RyZWFtVHlwZSddLFxuICAgIHN0cmVhbUlkOiBzdHJpbmcsXG4gICAgdHlwZTogc3RyaW5nLFxuICAgIGFjdG9ySWQ6IHN0cmluZyxcbiAgICBwYXlsb2FkOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPixcbiAgICBleHRyYT86IHsgY2F1c2F0aW9uSWQ/OiBzdHJpbmc7IGlkZW1wb3RlbmN5S2V5Pzogc3RyaW5nIH0sXG4gICk6IFByb21pc2U8U3BpbmVFdmVudD4ge1xuICAgIC8vIHN0cmVhbV9zZXEgaXMgMS1iYXNlZCBhbmQgZ2FwLWZyZWUgcGVyIHN0cmVhbSAoXHUwMEE3MS41KTsgY29tcHV0ZWQgaW4gdGhlXG4gICAgLy8gc2FtZSB0cmFuc2FjdGlvbiBhcyB0aGUgcHJvamVjdGlvbiB1cGRhdGUsIHNvIFVOSVFVRShzdHJlYW1faWQsXG4gICAgLy8gc3RyZWFtX3NlcSkgZG91YmxlcyBhcyB0aGUgb3B0aW1pc3RpYyBsb2NrLlxuICAgIGNvbnN0IFtyb3ddID0gYXdhaXQgdHhcbiAgICAgIC5zZWxlY3QoeyBtYXhTZXE6IHNxbDxudW1iZXI+YGNvYWxlc2NlKG1heCgke2V2ZW50cy5zdHJlYW1TZXF9KSwgMClgIH0pXG4gICAgICAuZnJvbShldmVudHMpXG4gICAgICAud2hlcmUoZXEoZXZlbnRzLnN0cmVhbUlkLCBzdHJlYW1JZCkpO1xuICAgIGNvbnN0IHN0cmVhbVNlcSA9IE51bWJlcihyb3c/Lm1heFNlcSA/PyAwKSArIDE7XG4gICAgY29uc3QgaW5zZXJ0ZWQgPSBhd2FpdCB0eFxuICAgICAgLmluc2VydChldmVudHMpXG4gICAgICAudmFsdWVzKHtcbiAgICAgICAgc3RyZWFtVHlwZSxcbiAgICAgICAgc3RyZWFtSWQsXG4gICAgICAgIHN0cmVhbVNlcSxcbiAgICAgICAgdHlwZSxcbiAgICAgICAgYWN0b3JJZCxcbiAgICAgICAgcGF5bG9hZCxcbiAgICAgICAgY2F1c2F0aW9uSWQ6IGV4dHJhPy5jYXVzYXRpb25JZCA/PyBudWxsLFxuICAgICAgICBpZGVtcG90ZW5jeUtleTogZXh0cmE/LmlkZW1wb3RlbmN5S2V5ID8/IG51bGwsXG4gICAgICB9KVxuICAgICAgLnJldHVybmluZyh7IGdsb2JhbFNlcTogZXZlbnRzLmdsb2JhbFNlcSB9KTtcbiAgICBjb25zdCBnbG9iYWxTZXEgPSBpbnNlcnRlZFswXT8uZ2xvYmFsU2VxO1xuICAgIGlmIChnbG9iYWxTZXEgPT09IHVuZGVmaW5lZCkgdGhyb3cgbmV3IEVycm9yKCdldmVudCBpbnNlcnQgcmV0dXJuZWQgbm8gZ2xvYmFsX3NlcScpO1xuICAgIHJldHVybiB7XG4gICAgICBnbG9iYWxTZXEsXG4gICAgICBzdHJlYW1UeXBlLFxuICAgICAgc3RyZWFtSWQsXG4gICAgICBzdHJlYW1TZXEsXG4gICAgICB0eXBlLFxuICAgICAgYWN0b3JJZCxcbiAgICAgIHBheWxvYWQsXG4gICAgICAuLi4oZXh0cmE/LmNhdXNhdGlvbklkICE9PSB1bmRlZmluZWQgPyB7IGNhdXNhdGlvbklkOiBleHRyYS5jYXVzYXRpb25JZCB9IDoge30pLFxuICAgIH07XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIG11c3RHZXRJdGVtKHdvcmtJdGVtSWQ6IHN0cmluZyk6IFByb21pc2U8V29ya0l0ZW1Sb3c+IHtcbiAgICBjb25zdCBieUlkID0gYXdhaXQgdGhpcy5kYi5zZWxlY3QoKS5mcm9tKHdvcmtJdGVtcykud2hlcmUoZXEod29ya0l0ZW1zLmlkLCB3b3JrSXRlbUlkKSkubGltaXQoMSk7XG4gICAgaWYgKGJ5SWRbMF0pIHJldHVybiBieUlkWzBdO1xuICAgIC8vIEltcG9ydGVkIHN0b3JpZXMgYXJlIGFkZHJlc3NlZCBieSB0aGVpciBleHRlcm5hbEtleSBoYW5kbGU7IGZpcnN0XG4gICAgLy8gd3JpdGVyIHdpbnMgXHUyMDE0IHRoZSBlYXJsaWVzdC1jcmVhdGVkIHJvdyByZXNvbHZlcyAoY29uZm9ybWFuY2UgcGluIGluXG4gICAgLy8gc3Rvcmllcy1pbXBvcnQudGVzdC50cywgbWlycm9yZWQgZnJvbSB0aGUgcmVmZXJlbmNlIGV4dGVybmFsS2V5SW5kZXgpLlxuICAgIGNvbnN0IGJ5S2V5ID0gYXdhaXQgdGhpcy5kYlxuICAgICAgLnNlbGVjdCgpXG4gICAgICAuZnJvbSh3b3JrSXRlbXMpXG4gICAgICAud2hlcmUoZXEod29ya0l0ZW1zLmV4dGVybmFsS2V5LCB3b3JrSXRlbUlkKSlcbiAgICAgIC5vcmRlckJ5KGFzYyh3b3JrSXRlbXMuc2VxKSlcbiAgICAgIC5saW1pdCgxKTtcbiAgICBpZiAoYnlLZXlbMF0pIHJldHVybiBieUtleVswXTtcbiAgICB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcihgdW5rbm93biB3b3JrIGl0ZW06ICR7d29ya0l0ZW1JZH1gKTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgZ2V0RmVhdHVyZVJvdyhmZWF0dXJlSWQ6IHN0cmluZywgdHg6IFF1ZXJ5YWJsZSA9IHRoaXMuZGIpOiBQcm9taXNlPEZlYXR1cmVSb3cgfCBudWxsPiB7XG4gICAgY29uc3Qgcm93cyA9IGF3YWl0IHR4LnNlbGVjdCgpLmZyb20oZmVhdHVyZXMpLndoZXJlKGVxKGZlYXR1cmVzLmlkLCBmZWF0dXJlSWQpKS5saW1pdCgxKTtcbiAgICByZXR1cm4gcm93c1swXSA/PyBudWxsO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBnZXRBY3RvclJvdyhhY3RvcklkOiBzdHJpbmcpOiBQcm9taXNlPEFjdG9yUm93IHwgbnVsbD4ge1xuICAgIGNvbnN0IHJvd3MgPSBhd2FpdCB0aGlzLmRiLnNlbGVjdCgpLmZyb20oYWN0b3JzKS53aGVyZShlcShhY3RvcnMuaWQsIGFjdG9ySWQpKS5saW1pdCgxKTtcbiAgICByZXR1cm4gcm93c1swXSA/PyBudWxsO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyB3b3Jrc3BhY2VSb3codHg6IFF1ZXJ5YWJsZSA9IHRoaXMuZGIpOiBQcm9taXNlPFdvcmtzcGFjZVN0YXRlUm93PiB7XG4gICAgY29uc3Qgcm93cyA9IGF3YWl0IHR4LnNlbGVjdCgpLmZyb20od29ya3NwYWNlU3RhdGUpLndoZXJlKGVxKHdvcmtzcGFjZVN0YXRlLmlkLCBXT1JLU1BBQ0VfSUQpKS5saW1pdCgxKTtcbiAgICBjb25zdCByb3cgPSByb3dzWzBdO1xuICAgIGlmIChyb3cpIHJldHVybiByb3c7XG4gICAgLy8gaW5pdCgpIHNlZWRzIHRoZSByb3c7IHRoaXMgZGVmYXVsdCBvbmx5IGd1YXJkcyBhIG5vdC15ZXQtaW5pdGlhbGl6ZWQgcmVhZC5cbiAgICByZXR1cm4geyBpZDogV09SS1NQQUNFX0lELCBwbGFuOiBERUZBVUxUX1BMQU4sIHBsYW5WZXJzaW9uOiAxLCBwb2xpY3k6IHt9LCBwb2xpY3lWZXJzaW9uOiAxIH07XG4gIH1cblxuICAvKipcbiAgICogRW50aXRsZW1lbnQgcmVzb2x1dGlvbiBcdTIwMTQgYSBQVVJFIGZ1bmN0aW9uIG92ZXIgcGxhbiBcdTAwRDcgZ292ZXJuYW5jZSBcdTAwRDdcbiAgICogZGVsaXZlcnktcm9sZSBkYXRhIChyb2FkbWFwIFx1MDBBNzMpLCBtaXJyb3JpbmcgdGhlIHJlZmVyZW5jZSBlbmdpbmUuIEEgZ3JhbnRcbiAgICogbWF5IEVYSVNUIChkaXJlY3Qgb3IgdmlhIGEgcm9sZSkgYW5kIHN0aWxsIG5vdCBSRVNPTFZFIGZvciBhbiBhZ2VudCB3aGVuXG4gICAqIHRoZSBwbGFuIGNlaWxpbmcgb3IgdGhlIHJlc3RyaWN0LW9ubHkgd29ya3NwYWNlIHBvbGljeSBuYXJyb3dzIGl0LiBVc2Vyc1xuICAgKiBhcmUgbmV2ZXIgcGxhbi1maWx0ZXJlZC5cbiAgICovXG4gIHByaXZhdGUgYXN5bmMgZ3JhbnRTb3VyY2UoYWN0b3JJZDogc3RyaW5nLCBwZXJtaXNzaW9uOiBQZXJtaXNzaW9uKTogUHJvbWlzZTxzdHJpbmcgfCBudWxsPiB7XG4gICAgY29uc3QgZGlyZWN0ID0gYXdhaXQgdGhpcy5kYlxuICAgICAgLnNlbGVjdCh7IHBlcm1pc3Npb246IGdyYW50cy5wZXJtaXNzaW9uIH0pXG4gICAgICAuZnJvbShncmFudHMpXG4gICAgICAud2hlcmUoYW5kKGVxKGdyYW50cy5hY3RvcklkLCBhY3RvcklkKSwgZXEoZ3JhbnRzLnBlcm1pc3Npb24sIHBlcm1pc3Npb24pKSlcbiAgICAgIC5saW1pdCgxKTtcbiAgICBpZiAoZGlyZWN0Lmxlbmd0aCA+IDApIHJldHVybiAnZGlyZWN0JztcbiAgICBjb25zdCBhc3NpZ25tZW50cyA9IGF3YWl0IHRoaXMuZGJcbiAgICAgIC5zZWxlY3QoKVxuICAgICAgLmZyb20ocm9sZUFzc2lnbm1lbnRzKVxuICAgICAgLndoZXJlKGFuZChlcShyb2xlQXNzaWdubWVudHMuYWN0b3JJZCwgYWN0b3JJZCksIGVxKHJvbGVBc3NpZ25tZW50cy5yZXZva2VkLCBmYWxzZSkpKVxuICAgICAgLm9yZGVyQnkoYXNjKHJvbGVBc3NpZ25tZW50cy5zZXEpKTtcbiAgICBmb3IgKGNvbnN0IGFzc2lnbm1lbnQgb2YgYXNzaWdubWVudHMpIHtcbiAgICAgIGlmICgoREVMSVZFUllfUk9MRVNbYXNzaWdubWVudC5yb2xlQ29kZV0gPz8gW10pLmluY2x1ZGVzKHBlcm1pc3Npb24pKSB7XG4gICAgICAgIHJldHVybiBgcm9sZToke2Fzc2lnbm1lbnQucm9sZUNvZGV9YDtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICBwcml2YXRlIGFnZW50Q2VpbGluZ0FsbG93cyhcbiAgICBhY3RvcjogQWN0b3JSb3cgfCBudWxsLFxuICAgIHBlcm1pc3Npb246IFBlcm1pc3Npb24sXG4gICAgd29ya3NwYWNlOiBXb3Jrc3BhY2VTdGF0ZVJvdyxcbiAgKTogeyBwbGFuOiBib29sZWFuOyBwb2xpY3k6IGJvb2xlYW4gfSB7XG4gICAgaWYgKCFhY3RvciB8fCBhY3Rvci50eXBlICE9PSAnYWdlbnQnKSByZXR1cm4geyBwbGFuOiB0cnVlLCBwb2xpY3k6IHRydWUgfTtcbiAgICBjb25zdCBjZWlsaW5nID0gUExBTl9DRUlMSU5HU1t3b3Jrc3BhY2UucGxhbiBhcyBQbGFuQ29kZV07XG4gICAgY29uc3QgcG9saWN5ID0gd29ya3NwYWNlLnBvbGljeSBhcyBXb3Jrc3BhY2VQb2xpY3k7XG4gICAgaWYgKChBR0VOVF9HQVRFX0FQUFJPVkVfUEVSTUlTU0lPTlMgYXMgcmVhZG9ubHkgc3RyaW5nW10pLmluY2x1ZGVzKHBlcm1pc3Npb24pKSB7XG4gICAgICByZXR1cm4geyBwbGFuOiBjZWlsaW5nLmFnZW50R2F0ZUFwcHJvdmUsIHBvbGljeTogcG9saWN5LmFnZW50R2F0ZUFwcHJvdmFscyAhPT0gZmFsc2UgfTtcbiAgICB9XG4gICAgaWYgKHBlcm1pc3Npb24gPT09ICdnYXRlLnJldmlldy5yZWplY3QnKSB7XG4gICAgICByZXR1cm4geyBwbGFuOiBjZWlsaW5nLmFnZW50R2F0ZVJlamVjdCwgcG9saWN5OiB0cnVlIH07XG4gICAgfVxuICAgIGlmIChwZXJtaXNzaW9uID09PSAndGFzay5jbGFpbScpIHtcbiAgICAgIHJldHVybiB7IHBsYW46IHRydWUsIHBvbGljeTogcG9saWN5LmFnZW50U2VsZkRpc3BhdGNoICE9PSBmYWxzZSB9O1xuICAgIH1cbiAgICByZXR1cm4geyBwbGFuOiB0cnVlLCBwb2xpY3k6IHRydWUgfTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgaGFzUGVybWlzc2lvbihhY3RvcklkOiBzdHJpbmcsIHBlcm1pc3Npb246IFBlcm1pc3Npb24pOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICBpZiAoKGF3YWl0IHRoaXMuZ3JhbnRTb3VyY2UoYWN0b3JJZCwgcGVybWlzc2lvbikpID09PSBudWxsKSByZXR1cm4gZmFsc2U7XG4gICAgY29uc3QgYWxsb3dzID0gdGhpcy5hZ2VudENlaWxpbmdBbGxvd3MoYXdhaXQgdGhpcy5nZXRBY3RvclJvdyhhY3RvcklkKSwgcGVybWlzc2lvbiwgYXdhaXQgdGhpcy53b3Jrc3BhY2VSb3coKSk7XG4gICAgcmV0dXJuIGFsbG93cy5wbGFuICYmIGFsbG93cy5wb2xpY3k7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIHJlcXVpcmVQZXJtaXNzaW9uKGFjdG9ySWQ6IHN0cmluZywgcGVybWlzc2lvbjogUGVybWlzc2lvbik6IFByb21pc2U8dm9pZD4ge1xuICAgIGlmICghKGF3YWl0IHRoaXMuaGFzUGVybWlzc2lvbihhY3RvcklkLCBwZXJtaXNzaW9uKSkpIHtcbiAgICAgIHRocm93IG5ldyBQZXJtaXNzaW9uRGVuaWVkRXJyb3IocGVybWlzc2lvbiwgYWN0b3JJZCk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyByZXF1aXJlR292ZXJuYW5jZUFkbWluKGJ5QWN0b3JJZDogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgaWYgKGJ5QWN0b3JJZCA9PT0gdGhpcy5zeXN0ZW1BY3RvcklkKSByZXR1cm47XG4gICAgY29uc3QgYWN0b3IgPSBhd2FpdCB0aGlzLmdldEFjdG9yUm93KGJ5QWN0b3JJZCk7XG4gICAgaWYgKGFjdG9yPy5nb3Zlcm5hbmNlUm9sZSA9PT0gJ2FkbWluJykgcmV0dXJuO1xuICAgIHRocm93IG5ldyBQZXJtaXNzaW9uRGVuaWVkRXJyb3IoJ2dvdmVybmFuY2UuYWRtaW4nLCBieUFjdG9ySWQpO1xuICB9XG5cbiAgLyoqIEdyYW50LXRpbWUgcGxhbiBjZWlsaW5nOiByZWZ1c2UgaXNzdWluZyBhZ2VudCBnYXRlIHBlcm1pc3Npb25zIHRoZSBwbGFuIGZvcmJpZHMuICovXG4gIHByaXZhdGUgYXN5bmMgY2hlY2tHcmFudENlaWxpbmcoYWN0b3JJZDogc3RyaW5nLCBwZXJtaXNzaW9uOiBQZXJtaXNzaW9uKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgYWN0b3IgPSBhd2FpdCB0aGlzLmdldEFjdG9yUm93KGFjdG9ySWQpO1xuICAgIGlmICghYWN0b3IgfHwgYWN0b3IudHlwZSAhPT0gJ2FnZW50JykgcmV0dXJuO1xuICAgIGNvbnN0IHdvcmtzcGFjZSA9IGF3YWl0IHRoaXMud29ya3NwYWNlUm93KCk7XG4gICAgY29uc3QgY2VpbGluZyA9IFBMQU5fQ0VJTElOR1Nbd29ya3NwYWNlLnBsYW4gYXMgUGxhbkNvZGVdO1xuICAgIGlmICgoQUdFTlRfR0FURV9BUFBST1ZFX1BFUk1JU1NJT05TIGFzIHJlYWRvbmx5IHN0cmluZ1tdKS5pbmNsdWRlcyhwZXJtaXNzaW9uKSAmJiAhY2VpbGluZy5hZ2VudEdhdGVBcHByb3ZlKSB7XG4gICAgICB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcihgcGxhbiAke3dvcmtzcGFjZS5wbGFufSBkb2VzIG5vdCBhbGxvdyBhZ2VudHMgdG8gaG9sZCAke3Blcm1pc3Npb259YCk7XG4gICAgfVxuICAgIGlmIChwZXJtaXNzaW9uID09PSAnZ2F0ZS5yZXZpZXcucmVqZWN0JyAmJiAhY2VpbGluZy5hZ2VudEdhdGVSZWplY3QpIHtcbiAgICAgIHRocm93IG5ldyBHdWFyZEZhaWxlZEVycm9yKGBwbGFuICR7d29ya3NwYWNlLnBsYW59IGRvZXMgbm90IGFsbG93IGFnZW50cyB0byBob2xkICR7cGVybWlzc2lvbn1gKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIGxpdmVDbGFpbSh3b3JrSXRlbUlkOiBzdHJpbmcpOiBQcm9taXNlPENsYWltUm93IHwgbnVsbD4ge1xuICAgIGNvbnN0IHJvd3MgPSBhd2FpdCB0aGlzLmRiXG4gICAgICAuc2VsZWN0KClcbiAgICAgIC5mcm9tKGNsYWltcylcbiAgICAgIC53aGVyZShcbiAgICAgICAgYW5kKFxuICAgICAgICAgIGVxKGNsYWltcy53b3JrSXRlbUlkLCB3b3JrSXRlbUlkKSxcbiAgICAgICAgICBlcShjbGFpbXMucmVsZWFzZWQsIGZhbHNlKSxcbiAgICAgICAgICBndChjbGFpbXMubGVhc2VFeHBpcmVzQXQsIHRoaXMubm93KSxcbiAgICAgICAgKSxcbiAgICAgIClcbiAgICAgIC5vcmRlckJ5KGFzYyhjbGFpbXMuc2VxKSlcbiAgICAgIC5saW1pdCgxKTtcbiAgICByZXR1cm4gcm93c1swXSA/PyBudWxsO1xuICB9XG5cbiAgLyoqXG4gICAqIEEgUFJFU0VOVEVEIHRva2VuIGlzIGFsd2F5cyB2YWxpZGF0ZWQsIG9uIGV2ZXJ5IGNvbW1hbmQgKGNvbmZvcm1hbmNlXG4gICAqIHBpbiwgY2xhaW1zLnRlc3QudHMpOiBzdGFsZS9mb3JlaWduL25vLWxpdmUtY2xhaW0gXHUyMTkyIENvbmZsaWN0RXJyb3IgKyBhdWRpdFxuICAgKiBldmVudC4gVGhlIGF1ZGl0IGV2ZW50IGNvbW1pdHMgaW4gaXRzIE9XTiB0cmFuc2FjdGlvbiBcdTIwMTQgdGhlIGZhaWxpbmdcbiAgICogY29tbWFuZCdzIHRyYW5zYWN0aW9uIChpZiBhbnkpIG11c3Qgbm90IHN3YWxsb3cgaXQuXG4gICAqL1xuICBwcml2YXRlIGFzeW5jIHZhbGlkYXRlUHJlc2VudGVkVG9rZW4oXG4gICAgaXRlbTogV29ya0l0ZW1Sb3csXG4gICAgZmVuY2luZ1Rva2VuOiBudW1iZXIgfCB1bmRlZmluZWQsXG4gICAgYWN0b3JJZDogc3RyaW5nLFxuICApOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBpZiAoZmVuY2luZ1Rva2VuID09PSB1bmRlZmluZWQpIHJldHVybjtcbiAgICBjb25zdCBsaXZlID0gYXdhaXQgdGhpcy5saXZlQ2xhaW0oaXRlbS5pZCk7XG4gICAgaWYgKGxpdmUgPT09IG51bGwgfHwgbGl2ZS5mZW5jaW5nVG9rZW4gIT09IGZlbmNpbmdUb2tlbikge1xuICAgICAgYXdhaXQgdGhpcy5kYi50cmFuc2FjdGlvbihhc3luYyAodHgpID0+IHtcbiAgICAgICAgYXdhaXQgdGhpcy5hcHBlbmRUeCh0eCwgJ3dvcmtfaXRlbScsIGl0ZW0uaWQsICdmZW5jaW5nLnJlamVjdGVkJywgYWN0b3JJZCwge1xuICAgICAgICAgIHByZXNlbnRlZFRva2VuOiBmZW5jaW5nVG9rZW4sXG4gICAgICAgICAgbGl2ZVRva2VuOiBsaXZlPy5mZW5jaW5nVG9rZW4gPz8gbnVsbCxcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICAgIHRocm93IG5ldyBDb25mbGljdEVycm9yKGBzdGFsZSBvciBmb3JlaWduIGZlbmNpbmcgdG9rZW4gZm9yIHdvcmsgaXRlbSAke2l0ZW0uaWR9YCk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBwdWJsaWNJdGVtKHJvdzogV29ya0l0ZW1Sb3cpOiBXb3JrSXRlbSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGlkOiByb3cuaWQsXG4gICAgICBmZWF0dXJlSWQ6IHJvdy5mZWF0dXJlSWQsXG4gICAgICBleHRlcm5hbEtleTogcm93LmV4dGVybmFsS2V5LFxuICAgICAgdGl0bGU6IHJvdy50aXRsZSxcbiAgICAgIHN0YXRlOiByb3cuc3RhdGUgYXMgV29ya0l0ZW1TdGF0ZSxcbiAgICAgIGJsb2NrZWRSZWFzb246IChyb3cuYmxvY2tlZFJlYXNvbiBhcyBCbG9ja2VkUmVhc29uIHwgbnVsbCkgPz8gbnVsbCxcbiAgICAgIHJldmlld0xvb3BJdGVyYXRpb246IHJvdy5yZXZpZXdMb29wSXRlcmF0aW9uLFxuICAgICAgaW50ZW50SGFzaDogcm93LmludGVudEhhc2gsXG4gICAgICBwaW5uZWRWZXJpZmljYXRpb246IHJvdy5waW5uZWRWZXJpZmljYXRpb24gPyBbLi4ucm93LnBpbm5lZFZlcmlmaWNhdGlvbl0gOiBudWxsLFxuICAgICAgc3BlY0NoZWNrcG9pbnQ6IHJvdy5zcGVjQ2hlY2twb2ludCxcbiAgICAgIGRvbmVDaGVja3BvaW50OiByb3cuZG9uZUNoZWNrcG9pbnQsXG4gICAgICBpbnZva2VEZXZXaXRoOiByb3cuaW52b2tlRGV2V2l0aCxcbiAgICAgIHNwZWNQYXRoOiByb3cuc3BlY1BhdGgsXG4gICAgICBzdGF0ZVZlcnNpb246IHJvdy5zdGF0ZVZlcnNpb24sXG4gICAgfTtcbiAgfVxuXG4gIHByaXZhdGUgcHVibGljRmVhdHVyZShyb3c6IEZlYXR1cmVSb3cpOiBGZWF0dXJlIHtcbiAgICByZXR1cm4ge1xuICAgICAgaWQ6IHJvdy5pZCxcbiAgICAgIHN0YXRlOiByb3cuc3RhdGUgYXMgRmVhdHVyZVsnc3RhdGUnXSxcbiAgICAgIGRpc3BhdGNoSG9sZDogcm93LmRpc3BhdGNoSG9sZCxcbiAgICB9O1xuICB9XG5cbiAgcHJpdmF0ZSBwdWJsaWNDbGFpbShyb3c6IENsYWltUm93KTogQ2xhaW0ge1xuICAgIHJldHVybiB7XG4gICAgICBpZDogcm93LmlkLFxuICAgICAgd29ya0l0ZW1JZDogcm93LndvcmtJdGVtSWQsXG4gICAgICBhY3RvcklkOiByb3cuYWN0b3JJZCxcbiAgICAgIGZlbmNpbmdUb2tlbjogcm93LmZlbmNpbmdUb2tlbixcbiAgICAgIGxlYXNlRXhwaXJlc0F0OiByb3cubGVhc2VFeHBpcmVzQXQsXG4gICAgICByZWxlYXNlZDogcm93LnJlbGVhc2VkLFxuICAgIH07XG4gIH1cblxuICBwcml2YXRlIGV2ZW50RnJvbVJvdyhyb3c6IEV2ZW50Um93KTogU3BpbmVFdmVudCB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGdsb2JhbFNlcTogcm93Lmdsb2JhbFNlcSxcbiAgICAgIHN0cmVhbVR5cGU6IHJvdy5zdHJlYW1UeXBlIGFzIFNwaW5lRXZlbnRbJ3N0cmVhbVR5cGUnXSxcbiAgICAgIHN0cmVhbUlkOiByb3cuc3RyZWFtSWQsXG4gICAgICBzdHJlYW1TZXE6IHJvdy5zdHJlYW1TZXEsXG4gICAgICB0eXBlOiByb3cudHlwZSxcbiAgICAgIGFjdG9ySWQ6IHJvdy5hY3RvcklkLFxuICAgICAgcGF5bG9hZDogcm93LnBheWxvYWQsXG4gICAgICAuLi4ocm93LmNhdXNhdGlvbklkICE9PSBudWxsID8geyBjYXVzYXRpb25JZDogcm93LmNhdXNhdGlvbklkIH0gOiB7fSksXG4gICAgfTtcbiAgfVxuXG4gIC8vIC0tIHNldHVwIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgYXN5bmMgY3JlYXRlQWN0b3IoaW5wdXQ6IHtcbiAgICB0eXBlOiBFeGNsdWRlPEFjdG9yVHlwZSwgJ3N5c3RlbSc+O1xuICAgIGRpc3BsYXlOYW1lOiBzdHJpbmc7XG4gICAgZ292ZXJuYW5jZVJvbGU/OiBHb3Zlcm5hbmNlUm9sZTtcbiAgfSk6IFByb21pc2U8QWN0b3I+IHtcbiAgICBjb25zdCBhY3RvcjogQWN0b3IgPSB7IGlkOiB0aGlzLm5leHRJZCgnYWN0b3InKSwgdHlwZTogaW5wdXQudHlwZSwgZGlzcGxheU5hbWU6IGlucHV0LmRpc3BsYXlOYW1lIH07XG4gICAgYXdhaXQgdGhpcy5kYi5pbnNlcnQoYWN0b3JzKS52YWx1ZXMoe1xuICAgICAgaWQ6IGFjdG9yLmlkLFxuICAgICAgdHlwZTogYWN0b3IudHlwZSxcbiAgICAgIGRpc3BsYXlOYW1lOiBhY3Rvci5kaXNwbGF5TmFtZSxcbiAgICAgIGdvdmVybmFuY2VSb2xlOiBpbnB1dC5nb3Zlcm5hbmNlUm9sZSA/PyAnbWVtYmVyJyxcbiAgICB9KTtcbiAgICByZXR1cm4gYWN0b3I7XG4gIH1cblxuICBhc3luYyBncmFudChpbnB1dDogeyBhY3RvcklkOiBzdHJpbmc7IHBlcm1pc3Npb246IFBlcm1pc3Npb247IHNjb3BlPzogc3RyaW5nIH0pOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAvLyBHcmFudC10aW1lIHBsYW4gY2VpbGluZyBwcmVjZWRlcyBhbnkgZWZmZWN0IChQaGFzZSAyIHBpbik6IGEgcmVmdXNlZFxuICAgIC8vIGdyYW50IGluc2VydHMgbm90aGluZyBhbmQgYXBwZW5kcyBub3RoaW5nLlxuICAgIGF3YWl0IHRoaXMuY2hlY2tHcmFudENlaWxpbmcoaW5wdXQuYWN0b3JJZCwgaW5wdXQucGVybWlzc2lvbik7XG4gICAgYXdhaXQgdGhpcy5kYi50cmFuc2FjdGlvbihhc3luYyAodHgpID0+IHtcbiAgICAgIGF3YWl0IHR4XG4gICAgICAgIC5pbnNlcnQoZ3JhbnRzKVxuICAgICAgICAudmFsdWVzKHsgYWN0b3JJZDogaW5wdXQuYWN0b3JJZCwgcGVybWlzc2lvbjogaW5wdXQucGVybWlzc2lvbiwgc2NvcGU6IGlucHV0LnNjb3BlID8/IG51bGwgfSlcbiAgICAgICAgLm9uQ29uZmxpY3REb05vdGhpbmcoKTtcbiAgICAgIGF3YWl0IHRoaXMuYXBwZW5kVHgodHgsICdhY3RvcicsIGlucHV0LmFjdG9ySWQsICdncmFudC5pc3N1ZWQnLCB0aGlzLnN5c3RlbUFjdG9ySWQsIHtcbiAgICAgICAgcGVybWlzc2lvbjogaW5wdXQucGVybWlzc2lvbixcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgYXN5bmMgcmV2b2tlKGlucHV0OiB7IGFjdG9ySWQ6IHN0cmluZzsgcGVybWlzc2lvbjogUGVybWlzc2lvbjsgc2NvcGU/OiBzdHJpbmcgfSk6IFByb21pc2U8dm9pZD4ge1xuICAgIGF3YWl0IHRoaXMuZGIudHJhbnNhY3Rpb24oYXN5bmMgKHR4KSA9PiB7XG4gICAgICBhd2FpdCB0eFxuICAgICAgICAuZGVsZXRlKGdyYW50cylcbiAgICAgICAgLndoZXJlKGFuZChlcShncmFudHMuYWN0b3JJZCwgaW5wdXQuYWN0b3JJZCksIGVxKGdyYW50cy5wZXJtaXNzaW9uLCBpbnB1dC5wZXJtaXNzaW9uKSkpO1xuICAgICAgYXdhaXQgdGhpcy5hcHBlbmRUeCh0eCwgJ2FjdG9yJywgaW5wdXQuYWN0b3JJZCwgJ2dyYW50LnJldm9rZWQnLCB0aGlzLnN5c3RlbUFjdG9ySWQsIHtcbiAgICAgICAgcGVybWlzc2lvbjogaW5wdXQucGVybWlzc2lvbixcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgLy8gLS0gZW50aXRsZW1lbnRzIChQaGFzZSAyLCByb2FkbWFwIFx1MDBBNzMpIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICBhc3luYyBzZXRHb3Zlcm5hbmNlUm9sZShpbnB1dDogeyBhY3RvcklkOiBzdHJpbmc7IHJvbGU6IEdvdmVybmFuY2VSb2xlOyBieUFjdG9ySWQ6IHN0cmluZyB9KTogUHJvbWlzZTx2b2lkPiB7XG4gICAgYXdhaXQgdGhpcy5yZXF1aXJlR292ZXJuYW5jZUFkbWluKGlucHV0LmJ5QWN0b3JJZCk7XG4gICAgaWYgKChhd2FpdCB0aGlzLmdldEFjdG9yUm93KGlucHV0LmFjdG9ySWQpKSA9PT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoYHVua25vd24gYWN0b3I6ICR7aW5wdXQuYWN0b3JJZH1gKTtcbiAgICB9XG4gICAgYXdhaXQgdGhpcy5kYi50cmFuc2FjdGlvbihhc3luYyAodHgpID0+IHtcbiAgICAgIGF3YWl0IHR4LnVwZGF0ZShhY3RvcnMpLnNldCh7IGdvdmVybmFuY2VSb2xlOiBpbnB1dC5yb2xlIH0pLndoZXJlKGVxKGFjdG9ycy5pZCwgaW5wdXQuYWN0b3JJZCkpO1xuICAgICAgYXdhaXQgdGhpcy5hcHBlbmRUeCh0eCwgJ2FjdG9yJywgaW5wdXQuYWN0b3JJZCwgJ2dvdmVybmFuY2UuY2hhbmdlZCcsIGlucHV0LmJ5QWN0b3JJZCwgeyByb2xlOiBpbnB1dC5yb2xlIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgYXN5bmMgZ2V0R292ZXJuYW5jZVJvbGUoYWN0b3JJZDogc3RyaW5nKTogUHJvbWlzZTxHb3Zlcm5hbmNlUm9sZT4ge1xuICAgIGNvbnN0IGFjdG9yID0gYXdhaXQgdGhpcy5nZXRBY3RvclJvdyhhY3RvcklkKTtcbiAgICByZXR1cm4gKGFjdG9yPy5nb3Zlcm5hbmNlUm9sZSBhcyBHb3Zlcm5hbmNlUm9sZSB8IHVuZGVmaW5lZCkgPz8gJ21lbWJlcic7XG4gIH1cblxuICBhc3luYyBhc3NpZ25Sb2xlKGlucHV0OiB7IGFjdG9ySWQ6IHN0cmluZzsgcm9sZUNvZGU6IHN0cmluZzsgYnlBY3RvcklkOiBzdHJpbmcgfSk6IFByb21pc2U8dm9pZD4ge1xuICAgIGF3YWl0IHRoaXMucmVxdWlyZUdvdmVybmFuY2VBZG1pbihpbnB1dC5ieUFjdG9ySWQpO1xuICAgIGNvbnN0IGJ1bmRsZSA9IERFTElWRVJZX1JPTEVTW2lucHV0LnJvbGVDb2RlXTtcbiAgICBpZiAoYnVuZGxlID09PSB1bmRlZmluZWQpIHRocm93IG5ldyBHdWFyZEZhaWxlZEVycm9yKGB1bmtub3duIGRlbGl2ZXJ5IHJvbGU6ICR7aW5wdXQucm9sZUNvZGV9YCk7XG4gICAgaWYgKChhd2FpdCB0aGlzLmdldEFjdG9yUm93KGlucHV0LmFjdG9ySWQpKSA9PT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoYHVua25vd24gYWN0b3I6ICR7aW5wdXQuYWN0b3JJZH1gKTtcbiAgICB9XG4gICAgZm9yIChjb25zdCBwZXJtaXNzaW9uIG9mIGJ1bmRsZSkge1xuICAgICAgYXdhaXQgdGhpcy5jaGVja0dyYW50Q2VpbGluZyhpbnB1dC5hY3RvcklkLCBwZXJtaXNzaW9uKTtcbiAgICB9XG4gICAgY29uc3QgYWN0aXZlID0gYXdhaXQgdGhpcy5kYlxuICAgICAgLnNlbGVjdCh7IHNlcTogcm9sZUFzc2lnbm1lbnRzLnNlcSB9KVxuICAgICAgLmZyb20ocm9sZUFzc2lnbm1lbnRzKVxuICAgICAgLndoZXJlKFxuICAgICAgICBhbmQoXG4gICAgICAgICAgZXEocm9sZUFzc2lnbm1lbnRzLmFjdG9ySWQsIGlucHV0LmFjdG9ySWQpLFxuICAgICAgICAgIGVxKHJvbGVBc3NpZ25tZW50cy5yb2xlQ29kZSwgaW5wdXQucm9sZUNvZGUpLFxuICAgICAgICAgIGVxKHJvbGVBc3NpZ25tZW50cy5yZXZva2VkLCBmYWxzZSksXG4gICAgICAgICksXG4gICAgICApXG4gICAgICAubGltaXQoMSk7XG4gICAgaWYgKGFjdGl2ZS5sZW5ndGggPiAwKSByZXR1cm47IC8vIGlkZW1wb3RlbnRcbiAgICBhd2FpdCB0aGlzLmRiLnRyYW5zYWN0aW9uKGFzeW5jICh0eCkgPT4ge1xuICAgICAgYXdhaXQgdHguaW5zZXJ0KHJvbGVBc3NpZ25tZW50cykudmFsdWVzKHtcbiAgICAgICAgYWN0b3JJZDogaW5wdXQuYWN0b3JJZCxcbiAgICAgICAgcm9sZUNvZGU6IGlucHV0LnJvbGVDb2RlLFxuICAgICAgICBncmFudGVkQnk6IGlucHV0LmJ5QWN0b3JJZCxcbiAgICAgICAgcmV2b2tlZDogZmFsc2UsXG4gICAgICB9KTtcbiAgICAgIGF3YWl0IHRoaXMuYXBwZW5kVHgodHgsICdhY3RvcicsIGlucHV0LmFjdG9ySWQsICdyb2xlLmFzc2lnbmVkJywgaW5wdXQuYnlBY3RvcklkLCB7XG4gICAgICAgIHJvbGVDb2RlOiBpbnB1dC5yb2xlQ29kZSxcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgYXN5bmMgcmV2b2tlUm9sZShpbnB1dDogeyBhY3RvcklkOiBzdHJpbmc7IHJvbGVDb2RlOiBzdHJpbmc7IGJ5QWN0b3JJZDogc3RyaW5nIH0pOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBhd2FpdCB0aGlzLnJlcXVpcmVHb3Zlcm5hbmNlQWRtaW4oaW5wdXQuYnlBY3RvcklkKTtcbiAgICBpZiAoREVMSVZFUllfUk9MRVNbaW5wdXQucm9sZUNvZGVdID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRocm93IG5ldyBHdWFyZEZhaWxlZEVycm9yKGB1bmtub3duIGRlbGl2ZXJ5IHJvbGU6ICR7aW5wdXQucm9sZUNvZGV9YCk7XG4gICAgfVxuICAgIGF3YWl0IHRoaXMuZGIudHJhbnNhY3Rpb24oYXN5bmMgKHR4KSA9PiB7XG4gICAgICBhd2FpdCB0eFxuICAgICAgICAudXBkYXRlKHJvbGVBc3NpZ25tZW50cylcbiAgICAgICAgLnNldCh7IHJldm9rZWQ6IHRydWUgfSlcbiAgICAgICAgLndoZXJlKFxuICAgICAgICAgIGFuZChcbiAgICAgICAgICAgIGVxKHJvbGVBc3NpZ25tZW50cy5hY3RvcklkLCBpbnB1dC5hY3RvcklkKSxcbiAgICAgICAgICAgIGVxKHJvbGVBc3NpZ25tZW50cy5yb2xlQ29kZSwgaW5wdXQucm9sZUNvZGUpLFxuICAgICAgICAgICAgZXEocm9sZUFzc2lnbm1lbnRzLnJldm9rZWQsIGZhbHNlKSxcbiAgICAgICAgICApLFxuICAgICAgICApO1xuICAgICAgYXdhaXQgdGhpcy5hcHBlbmRUeCh0eCwgJ2FjdG9yJywgaW5wdXQuYWN0b3JJZCwgJ3JvbGUucmV2b2tlZCcsIGlucHV0LmJ5QWN0b3JJZCwge1xuICAgICAgICByb2xlQ29kZTogaW5wdXQucm9sZUNvZGUsXG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuXG4gIGFzeW5jIGxpc3RSb2xlQXNzaWdubWVudHMoYWN0b3JJZD86IHN0cmluZyk6IFByb21pc2U8Um9sZUFzc2lnbm1lbnRbXT4ge1xuICAgIGNvbnN0IHJvd3MgPVxuICAgICAgYWN0b3JJZCA9PT0gdW5kZWZpbmVkXG4gICAgICAgID8gYXdhaXQgdGhpcy5kYi5zZWxlY3QoKS5mcm9tKHJvbGVBc3NpZ25tZW50cykub3JkZXJCeShhc2Mocm9sZUFzc2lnbm1lbnRzLnNlcSkpXG4gICAgICAgIDogYXdhaXQgdGhpcy5kYlxuICAgICAgICAgICAgLnNlbGVjdCgpXG4gICAgICAgICAgICAuZnJvbShyb2xlQXNzaWdubWVudHMpXG4gICAgICAgICAgICAud2hlcmUoZXEocm9sZUFzc2lnbm1lbnRzLmFjdG9ySWQsIGFjdG9ySWQpKVxuICAgICAgICAgICAgLm9yZGVyQnkoYXNjKHJvbGVBc3NpZ25tZW50cy5zZXEpKTtcbiAgICByZXR1cm4gcm93cy5tYXAoKHJvdykgPT4gKHtcbiAgICAgIGFjdG9ySWQ6IHJvdy5hY3RvcklkLFxuICAgICAgcm9sZUNvZGU6IHJvdy5yb2xlQ29kZSxcbiAgICAgIGdyYW50ZWRCeTogcm93LmdyYW50ZWRCeSxcbiAgICAgIHJldm9rZWQ6IHJvdy5yZXZva2VkLFxuICAgIH0pKTtcbiAgfVxuXG4gIGFzeW5jIHNldFBsYW4oaW5wdXQ6IHsgcGxhbjogUGxhbkNvZGU7IGJ5QWN0b3JJZDogc3RyaW5nIH0pOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBhd2FpdCB0aGlzLnJlcXVpcmVHb3Zlcm5hbmNlQWRtaW4oaW5wdXQuYnlBY3RvcklkKTtcbiAgICBpZiAoUExBTl9DRUlMSU5HU1tpbnB1dC5wbGFuXSA9PT0gdW5kZWZpbmVkKSB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcihgdW5rbm93biBwbGFuOiAke2lucHV0LnBsYW59YCk7XG4gICAgY29uc3Qgd29ya3NwYWNlID0gYXdhaXQgdGhpcy53b3Jrc3BhY2VSb3coKTtcbiAgICBjb25zdCBwbGFuVmVyc2lvbiA9IHdvcmtzcGFjZS5wbGFuVmVyc2lvbiArIDE7XG4gICAgYXdhaXQgdGhpcy5kYi50cmFuc2FjdGlvbihhc3luYyAodHgpID0+IHtcbiAgICAgIGF3YWl0IHR4XG4gICAgICAgIC51cGRhdGUod29ya3NwYWNlU3RhdGUpXG4gICAgICAgIC5zZXQoeyBwbGFuOiBpbnB1dC5wbGFuLCBwbGFuVmVyc2lvbiB9KVxuICAgICAgICAud2hlcmUoZXEod29ya3NwYWNlU3RhdGUuaWQsIFdPUktTUEFDRV9JRCkpO1xuICAgICAgYXdhaXQgdGhpcy5hcHBlbmRUeCh0eCwgJ3dvcmtzcGFjZScsIFdPUktTUEFDRV9JRCwgJ3BsYW4uY2hhbmdlZCcsIGlucHV0LmJ5QWN0b3JJZCwge1xuICAgICAgICBwbGFuOiBpbnB1dC5wbGFuLFxuICAgICAgICBwbGFuVmVyc2lvbixcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgYXN5bmMgZ2V0UGxhbigpOiBQcm9taXNlPFBsYW5Db2RlPiB7XG4gICAgcmV0dXJuIChhd2FpdCB0aGlzLndvcmtzcGFjZVJvdygpKS5wbGFuIGFzIFBsYW5Db2RlO1xuICB9XG5cbiAgYXN5bmMgc2V0V29ya3NwYWNlUG9saWN5KGlucHV0OiB7IHBvbGljeTogV29ya3NwYWNlUG9saWN5OyBieUFjdG9ySWQ6IHN0cmluZyB9KTogUHJvbWlzZTx2b2lkPiB7XG4gICAgYXdhaXQgdGhpcy5yZXF1aXJlR292ZXJuYW5jZUFkbWluKGlucHV0LmJ5QWN0b3JJZCk7XG4gICAgY29uc3Qgd29ya3NwYWNlID0gYXdhaXQgdGhpcy53b3Jrc3BhY2VSb3coKTtcbiAgICBjb25zdCBtZXJnZWQ6IFdvcmtzcGFjZVBvbGljeSA9IHsgLi4uKHdvcmtzcGFjZS5wb2xpY3kgYXMgV29ya3NwYWNlUG9saWN5KSwgLi4uaW5wdXQucG9saWN5IH07XG4gICAgY29uc3QgcG9saWN5VmVyc2lvbiA9IHdvcmtzcGFjZS5wb2xpY3lWZXJzaW9uICsgMTtcbiAgICBhd2FpdCB0aGlzLmRiLnRyYW5zYWN0aW9uKGFzeW5jICh0eCkgPT4ge1xuICAgICAgYXdhaXQgdHhcbiAgICAgICAgLnVwZGF0ZSh3b3Jrc3BhY2VTdGF0ZSlcbiAgICAgICAgLnNldCh7IHBvbGljeTogbWVyZ2VkIGFzIFJlY29yZDxzdHJpbmcsIHVua25vd24+LCBwb2xpY3lWZXJzaW9uIH0pXG4gICAgICAgIC53aGVyZShlcSh3b3Jrc3BhY2VTdGF0ZS5pZCwgV09SS1NQQUNFX0lEKSk7XG4gICAgICBhd2FpdCB0aGlzLmFwcGVuZFR4KHR4LCAnd29ya3NwYWNlJywgV09SS1NQQUNFX0lELCAncG9saWN5LmNoYW5nZWQnLCBpbnB1dC5ieUFjdG9ySWQsIHtcbiAgICAgICAgcG9saWN5OiB7IC4uLm1lcmdlZCB9LFxuICAgICAgICBwb2xpY3lWZXJzaW9uLFxuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICBhc3luYyBnZXRXb3Jrc3BhY2VQb2xpY3koKTogUHJvbWlzZTxXb3Jrc3BhY2VQb2xpY3k+IHtcbiAgICByZXR1cm4geyAuLi4oKGF3YWl0IHRoaXMud29ya3NwYWNlUm93KCkpLnBvbGljeSBhcyBXb3Jrc3BhY2VQb2xpY3kpIH07XG4gIH1cblxuICBhc3luYyBzZXRHYXRlUG9saWN5KGlucHV0OiB7IGdhdGU6IEdhdGVDb2RlOyBwb2xpY3k6IEdhdGVQb2xpY3k7IGJ5QWN0b3JJZDogc3RyaW5nIH0pOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBhd2FpdCB0aGlzLnJlcXVpcmVHb3Zlcm5hbmNlQWRtaW4oaW5wdXQuYnlBY3RvcklkKTtcbiAgICBjb25zdCBtaW5BcHByb3ZhbHMgPSBpbnB1dC5wb2xpY3kubWluQXBwcm92YWxzID8/IDE7XG4gICAgaWYgKCFOdW1iZXIuaXNJbnRlZ2VyKG1pbkFwcHJvdmFscykgfHwgbWluQXBwcm92YWxzIDwgMSkge1xuICAgICAgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoJ21pbkFwcHJvdmFscyBtdXN0IGJlIGEgcG9zaXRpdmUgaW50ZWdlcicpO1xuICAgIH1cbiAgICBhd2FpdCB0aGlzLmRiLnRyYW5zYWN0aW9uKGFzeW5jICh0eCkgPT4ge1xuICAgICAgYXdhaXQgdHhcbiAgICAgICAgLmluc2VydChnYXRlUG9saWNpZXMpXG4gICAgICAgIC52YWx1ZXMoeyBnYXRlOiBpbnB1dC5nYXRlLCBwb2xpY3k6IHsgLi4uaW5wdXQucG9saWN5IH0gYXMgUmVjb3JkPHN0cmluZywgdW5rbm93bj4gfSlcbiAgICAgICAgLm9uQ29uZmxpY3REb1VwZGF0ZSh7XG4gICAgICAgICAgdGFyZ2V0OiBnYXRlUG9saWNpZXMuZ2F0ZSxcbiAgICAgICAgICBzZXQ6IHsgcG9saWN5OiB7IC4uLmlucHV0LnBvbGljeSB9IGFzIFJlY29yZDxzdHJpbmcsIHVua25vd24+IH0sXG4gICAgICAgIH0pO1xuICAgICAgYXdhaXQgdGhpcy5hcHBlbmRUeCh0eCwgJ3dvcmtzcGFjZScsIFdPUktTUEFDRV9JRCwgJ2dhdGVfcG9saWN5LmNoYW5nZWQnLCBpbnB1dC5ieUFjdG9ySWQsIHtcbiAgICAgICAgZ2F0ZTogaW5wdXQuZ2F0ZSxcbiAgICAgICAgcG9saWN5OiB7IC4uLmlucHV0LnBvbGljeSB9LFxuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICBhc3luYyBnZXRHYXRlUG9saWN5KGdhdGU6IEdhdGVDb2RlKTogUHJvbWlzZTxHYXRlUG9saWN5PiB7XG4gICAgY29uc3Qgcm93cyA9IGF3YWl0IHRoaXMuZGIuc2VsZWN0KCkuZnJvbShnYXRlUG9saWNpZXMpLndoZXJlKGVxKGdhdGVQb2xpY2llcy5nYXRlLCBnYXRlKSkubGltaXQoMSk7XG4gICAgcmV0dXJuIHsgLi4uKChyb3dzWzBdPy5wb2xpY3kgYXMgR2F0ZVBvbGljeSB8IHVuZGVmaW5lZCkgPz8ge30pIH07XG4gIH1cblxuICBhc3luYyBhdXRoekV4cGxhaW4oaW5wdXQ6IHsgYWN0b3JJZDogc3RyaW5nOyBwZXJtaXNzaW9uOiBQZXJtaXNzaW9uIH0pOiBQcm9taXNlPEF1dGh6RXhwbGFuYXRpb24+IHtcbiAgICBjb25zdCBzb3VyY2UgPSBhd2FpdCB0aGlzLmdyYW50U291cmNlKGlucHV0LmFjdG9ySWQsIGlucHV0LnBlcm1pc3Npb24pO1xuICAgIGNvbnN0IGFjdG9yID0gYXdhaXQgdGhpcy5nZXRBY3RvclJvdyhpbnB1dC5hY3RvcklkKTtcbiAgICBjb25zdCB3b3Jrc3BhY2UgPSBhd2FpdCB0aGlzLndvcmtzcGFjZVJvdygpO1xuICAgIGNvbnN0IGFsbG93cyA9IHRoaXMuYWdlbnRDZWlsaW5nQWxsb3dzKGFjdG9yLCBpbnB1dC5wZXJtaXNzaW9uLCB3b3Jrc3BhY2UpO1xuICAgIHJldHVybiB7XG4gICAgICBhY3RvcklkOiBpbnB1dC5hY3RvcklkLFxuICAgICAgcGVybWlzc2lvbjogaW5wdXQucGVybWlzc2lvbixcbiAgICAgIGFsbG93ZWQ6IHNvdXJjZSAhPT0gbnVsbCAmJiBhbGxvd3MucGxhbiAmJiBhbGxvd3MucG9saWN5LFxuICAgICAgc291cmNlLFxuICAgICAgZ292ZXJuYW5jZVJvbGU6IChhY3Rvcj8uZ292ZXJuYW5jZVJvbGUgYXMgR292ZXJuYW5jZVJvbGUgfCB1bmRlZmluZWQpID8/ICdtZW1iZXInLFxuICAgICAgcGxhbjogd29ya3NwYWNlLnBsYW4gYXMgUGxhbkNvZGUsXG4gICAgICBwbGFuQWxsb3dzOiBhbGxvd3MucGxhbixcbiAgICAgIHBvbGljeUFsbG93czogYWxsb3dzLnBvbGljeSxcbiAgICAgIHZlcnNpb25zOiB7IHBsYW46IHdvcmtzcGFjZS5wbGFuVmVyc2lvbiwgcG9saWN5OiB3b3Jrc3BhY2UucG9saWN5VmVyc2lvbiB9LFxuICAgIH07XG4gIH1cblxuICBhc3luYyBjcmVhdGVGZWF0dXJlKGlucHV0OiB7IGFjdG9ySWQ6IHN0cmluZyB9KTogUHJvbWlzZTxGZWF0dXJlPiB7XG4gICAgY29uc3QgaWQgPSB0aGlzLm5leHRJZCgnZmVhdCcpO1xuICAgIHJldHVybiB0aGlzLmRiLnRyYW5zYWN0aW9uKGFzeW5jICh0eCkgPT4ge1xuICAgICAgYXdhaXQgdHguaW5zZXJ0KGZlYXR1cmVzKS52YWx1ZXMoeyBpZCwgc3RhdGU6ICdiYWNrbG9nJywgZGlzcGF0Y2hIb2xkOiBmYWxzZSB9KTtcbiAgICAgIGF3YWl0IHRoaXMuYXBwZW5kVHgodHgsICdmZWF0dXJlJywgaWQsICdmZWF0dXJlLmNyZWF0ZWQnLCBpbnB1dC5hY3RvcklkLCB7fSk7XG4gICAgICByZXR1cm4geyBpZCwgc3RhdGU6ICdiYWNrbG9nJyBhcyBjb25zdCwgZGlzcGF0Y2hIb2xkOiBmYWxzZSB9O1xuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBjcmVhdGVXb3JrSXRlbVR4KHR4OiBRdWVyeWFibGUsIGlucHV0OiBDcmVhdGVXb3JrSXRlbUlucHV0ICYgeyBhY3RvcklkOiBzdHJpbmcgfSk6IFByb21pc2U8V29ya0l0ZW0+IHtcbiAgICBjb25zdCBzbHVnID0gaW5wdXQudGl0bGVcbiAgICAgIC50b0xvd2VyQ2FzZSgpXG4gICAgICAucmVwbGFjZSgvW15hLXowLTldKy9nLCAnLScpXG4gICAgICAucmVwbGFjZSgvKF4tfC0kKS9nLCAnJyk7XG4gICAgY29uc3Qgcm93OiBXb3JrSXRlbVJvdyA9IHtcbiAgICAgIGlkOiB0aGlzLm5leHRJZCgnd2knKSxcbiAgICAgIHNlcTogMCwgLy8gYXNzaWduZWQgYnkgdGhlIHNlcmlhbDsgcGxhY2Vob2xkZXIgZm9yIHRoZSBsb2NhbCBjb3B5IG9ubHlcbiAgICAgIGZlYXR1cmVJZDogaW5wdXQuZmVhdHVyZUlkLFxuICAgICAgZXh0ZXJuYWxLZXk6IGlucHV0LmV4dGVybmFsS2V5LFxuICAgICAgdGl0bGU6IGlucHV0LnRpdGxlLFxuICAgICAgc3RhdGU6ICdiYWNrbG9nJyxcbiAgICAgIGJsb2NrZWRSZWFzb246IG51bGwsXG4gICAgICByZXZpZXdMb29wSXRlcmF0aW9uOiAwLFxuICAgICAgaW50ZW50SGFzaDogbnVsbCxcbiAgICAgIHBpbm5lZFZlcmlmaWNhdGlvbjogbnVsbCxcbiAgICAgIHNwZWNDaGVja3BvaW50OiBpbnB1dC5zcGVjQ2hlY2twb2ludCA/PyBmYWxzZSxcbiAgICAgIGRvbmVDaGVja3BvaW50OiBpbnB1dC5kb25lQ2hlY2twb2ludCA/PyBmYWxzZSxcbiAgICAgIGludm9rZURldldpdGg6IGlucHV0Lmludm9rZURldldpdGggPz8gJycsXG4gICAgICBzcGVjUGF0aDogYHN0b3JpZXMvJHtpbnB1dC5leHRlcm5hbEtleX0tJHtzbHVnfS5tZGAsXG4gICAgICBzdGF0ZVZlcnNpb246IDAsXG4gICAgICBkZXBlbmRzT246IGlucHV0LmRlcGVuZHNPbiA/IFsuLi5pbnB1dC5kZXBlbmRzT25dIDogW10sXG4gICAgICBsYXN0RmVuY2luZ1Rva2VuOiAwLFxuICAgIH07XG4gICAgYXdhaXQgdHguaW5zZXJ0KHdvcmtJdGVtcykudmFsdWVzKHtcbiAgICAgIGlkOiByb3cuaWQsXG4gICAgICBmZWF0dXJlSWQ6IHJvdy5mZWF0dXJlSWQsXG4gICAgICBleHRlcm5hbEtleTogcm93LmV4dGVybmFsS2V5LFxuICAgICAgdGl0bGU6IHJvdy50aXRsZSxcbiAgICAgIHN0YXRlOiByb3cuc3RhdGUsXG4gICAgICBibG9ja2VkUmVhc29uOiByb3cuYmxvY2tlZFJlYXNvbixcbiAgICAgIHJldmlld0xvb3BJdGVyYXRpb246IHJvdy5yZXZpZXdMb29wSXRlcmF0aW9uLFxuICAgICAgaW50ZW50SGFzaDogcm93LmludGVudEhhc2gsXG4gICAgICBwaW5uZWRWZXJpZmljYXRpb246IHJvdy5waW5uZWRWZXJpZmljYXRpb24sXG4gICAgICBzcGVjQ2hlY2twb2ludDogcm93LnNwZWNDaGVja3BvaW50LFxuICAgICAgZG9uZUNoZWNrcG9pbnQ6IHJvdy5kb25lQ2hlY2twb2ludCxcbiAgICAgIGludm9rZURldldpdGg6IHJvdy5pbnZva2VEZXZXaXRoLFxuICAgICAgc3BlY1BhdGg6IHJvdy5zcGVjUGF0aCxcbiAgICAgIHN0YXRlVmVyc2lvbjogcm93LnN0YXRlVmVyc2lvbixcbiAgICAgIGRlcGVuZHNPbjogcm93LmRlcGVuZHNPbixcbiAgICAgIGxhc3RGZW5jaW5nVG9rZW46IHJvdy5sYXN0RmVuY2luZ1Rva2VuLFxuICAgIH0pO1xuICAgIGF3YWl0IHRoaXMuYXBwZW5kVHgodHgsICd3b3JrX2l0ZW0nLCByb3cuaWQsICd3b3JrX2l0ZW0uY3JlYXRlZCcsIGlucHV0LmFjdG9ySWQsIHtcbiAgICAgIGV4dGVybmFsS2V5OiByb3cuZXh0ZXJuYWxLZXksXG4gICAgICBmZWF0dXJlSWQ6IHJvdy5mZWF0dXJlSWQsXG4gICAgfSk7XG4gICAgcmV0dXJuIHRoaXMucHVibGljSXRlbShyb3cpO1xuICB9XG5cbiAgYXN5bmMgY3JlYXRlV29ya0l0ZW0oaW5wdXQ6IENyZWF0ZVdvcmtJdGVtSW5wdXQgJiB7IGFjdG9ySWQ6IHN0cmluZyB9KTogUHJvbWlzZTxXb3JrSXRlbT4ge1xuICAgIHJldHVybiB0aGlzLmRiLnRyYW5zYWN0aW9uKGFzeW5jICh0eCkgPT4gdGhpcy5jcmVhdGVXb3JrSXRlbVR4KHR4LCBpbnB1dCkpO1xuICB9XG5cbiAgYXN5bmMgaW1wb3J0U3RvcmllcyhpbnB1dDogeyBmZWF0dXJlSWQ6IHN0cmluZzsgeWFtbDogc3RyaW5nOyBhY3RvcklkOiBzdHJpbmcgfSk6IFByb21pc2U8U3Rvcmllc0ltcG9ydFJlc3VsdD4ge1xuICAgIGNvbnN0IGVudHJpZXMgPSBwYXJzZVN0b3JpZXMoaW5wdXQueWFtbCk7XG4gICAgY29uc3QgZmVhdHVyZSA9IGF3YWl0IHRoaXMuZ2V0RmVhdHVyZVJvdyhpbnB1dC5mZWF0dXJlSWQpO1xuICAgIGlmICghZmVhdHVyZSkge1xuICAgICAgdGhyb3cgbmV3IFN0b3JpZXNWYWxpZGF0aW9uRXJyb3IoYHVua25vd24gZmVhdHVyZTogJHtpbnB1dC5mZWF0dXJlSWR9YCk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmRiLnRyYW5zYWN0aW9uKGFzeW5jICh0eCkgPT4ge1xuICAgICAgY29uc3QgaW1wb3J0ZWQ6IHN0cmluZ1tdID0gW107XG4gICAgICBjb25zdCB1cGRhdGVkOiBzdHJpbmdbXSA9IFtdO1xuICAgICAgY29uc3Qgd2FybmluZ3M6IHN0cmluZ1tdID0gW107XG4gICAgICBmb3IgKGNvbnN0IGVudHJ5IG9mIGVudHJpZXMpIHtcbiAgICAgICAgY29uc3QgZXhpc3RpbmcgPSAoXG4gICAgICAgICAgYXdhaXQgdHhcbiAgICAgICAgICAgIC5zZWxlY3QoKVxuICAgICAgICAgICAgLmZyb20od29ya0l0ZW1zKVxuICAgICAgICAgICAgLndoZXJlKGFuZChlcSh3b3JrSXRlbXMuZmVhdHVyZUlkLCBpbnB1dC5mZWF0dXJlSWQpLCBlcSh3b3JrSXRlbXMuZXh0ZXJuYWxLZXksIGVudHJ5LmlkKSkpXG4gICAgICAgICAgICAub3JkZXJCeShhc2Mod29ya0l0ZW1zLnNlcSkpXG4gICAgICAgICAgICAubGltaXQoMSlcbiAgICAgICAgKVswXTtcbiAgICAgICAgaWYgKGV4aXN0aW5nKSB7XG4gICAgICAgICAgLy8gUmUtaW1wb3J0IHJlZnJlc2hlcyBkZXNjcmlwdGl2ZSBmaWVsZHM7IGxpZmVjeWNsZSBzdGF0ZSBpcyBuZXZlclxuICAgICAgICAgIC8vIHRvdWNoZWQgKHN0b3JpZXMueWFtbCBjYXJyaWVzIG5vIHN0YXR1cyBcdTIwMTQgRDksIHZhbGlkaXR5IHJ1bGUgMykuXG4gICAgICAgICAgYXdhaXQgdHhcbiAgICAgICAgICAgIC51cGRhdGUod29ya0l0ZW1zKVxuICAgICAgICAgICAgLnNldCh7XG4gICAgICAgICAgICAgIHRpdGxlOiBlbnRyeS50aXRsZSxcbiAgICAgICAgICAgICAgc3BlY0NoZWNrcG9pbnQ6IGVudHJ5LnNwZWNDaGVja3BvaW50LFxuICAgICAgICAgICAgICBkb25lQ2hlY2twb2ludDogZW50cnkuZG9uZUNoZWNrcG9pbnQsXG4gICAgICAgICAgICAgIGludm9rZURldldpdGg6IGVudHJ5Lmludm9rZURldldpdGgsXG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLndoZXJlKGVxKHdvcmtJdGVtcy5pZCwgZXhpc3RpbmcuaWQpKTtcbiAgICAgICAgICBhd2FpdCB0aGlzLmFwcGVuZFR4KHR4LCAnd29ya19pdGVtJywgZXhpc3RpbmcuaWQsICd3b3JrX2l0ZW0ucmVpbXBvcnRlZCcsIGlucHV0LmFjdG9ySWQsIHtcbiAgICAgICAgICAgIGV4dGVybmFsS2V5OiBlbnRyeS5pZCxcbiAgICAgICAgICB9KTtcbiAgICAgICAgICB1cGRhdGVkLnB1c2goZW50cnkuaWQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGF3YWl0IHRoaXMuY3JlYXRlV29ya0l0ZW1UeCh0eCwge1xuICAgICAgICAgICAgZmVhdHVyZUlkOiBpbnB1dC5mZWF0dXJlSWQsXG4gICAgICAgICAgICBleHRlcm5hbEtleTogZW50cnkuaWQsXG4gICAgICAgICAgICB0aXRsZTogZW50cnkudGl0bGUsXG4gICAgICAgICAgICBzcGVjQ2hlY2twb2ludDogZW50cnkuc3BlY0NoZWNrcG9pbnQsXG4gICAgICAgICAgICBkb25lQ2hlY2twb2ludDogZW50cnkuZG9uZUNoZWNrcG9pbnQsXG4gICAgICAgICAgICBpbnZva2VEZXZXaXRoOiBlbnRyeS5pbnZva2VEZXZXaXRoLFxuICAgICAgICAgICAgYWN0b3JJZDogaW5wdXQuYWN0b3JJZCxcbiAgICAgICAgICB9KTtcbiAgICAgICAgICBpbXBvcnRlZC5wdXNoKGVudHJ5LmlkKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIHsgaW1wb3J0ZWQsIHVwZGF0ZWQsIHdhcm5pbmdzIH07XG4gICAgfSk7XG4gIH1cblxuICAvLyAtLSBjbGFpbXMgKHJvYWRtYXAgXHUwMEE3MS4zKSAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICBhc3luYyBjbGFpbVRhc2soaW5wdXQ6IHsgd29ya0l0ZW1JZDogc3RyaW5nOyBhY3RvcklkOiBzdHJpbmc7IHR0bE1zPzogbnVtYmVyIH0pOiBQcm9taXNlPENsYWltPiB7XG4gICAgY29uc3QgaXRlbSA9IGF3YWl0IHRoaXMubXVzdEdldEl0ZW0oaW5wdXQud29ya0l0ZW1JZCk7XG4gICAgYXdhaXQgdGhpcy5yZXF1aXJlUGVybWlzc2lvbihpbnB1dC5hY3RvcklkLCAndGFzay5jbGFpbScpO1xuICAgIGNvbnN0IHR0bE1zID0gaW5wdXQudHRsTXMgPz8gMTUgKiA2MCAqIDEwMDA7XG4gICAgY29uc3QgY2xhaW1JZCA9IHRoaXMubmV4dElkKCdjbGFpbScpO1xuICAgIHRyeSB7XG4gICAgICByZXR1cm4gYXdhaXQgdGhpcy5kYi50cmFuc2FjdGlvbihhc3luYyAodHgpID0+IHtcbiAgICAgICAgLy8gU3dlZXA6IGFuIEVYUElSRUQgbGVhc2UgcmV0dXJucyB0aGUgaXRlbSB0byB0aGUgcG9vbCBcdTIwMTQgZmxpcCBpdHNcbiAgICAgICAgLy8gcmVsZWFzZWQgZmxhZyBzbyB0aGUgcGFydGlhbCB1bmlxdWUgaW5kZXggb25seSBndWFyZHMgbGl2ZSBjbGFpbXMuXG4gICAgICAgIGF3YWl0IHR4XG4gICAgICAgICAgLnVwZGF0ZShjbGFpbXMpXG4gICAgICAgICAgLnNldCh7IHJlbGVhc2VkOiB0cnVlIH0pXG4gICAgICAgICAgLndoZXJlKFxuICAgICAgICAgICAgYW5kKFxuICAgICAgICAgICAgICBlcShjbGFpbXMud29ya0l0ZW1JZCwgaXRlbS5pZCksXG4gICAgICAgICAgICAgIGVxKGNsYWltcy5yZWxlYXNlZCwgZmFsc2UpLFxuICAgICAgICAgICAgICBsdGUoY2xhaW1zLmxlYXNlRXhwaXJlc0F0LCB0aGlzLm5vdyksXG4gICAgICAgICAgICApLFxuICAgICAgICAgICk7XG4gICAgICAgIC8vIE1vbm90b25pYyBmZW5jaW5nIHRva2VuIHBlciB3b3JrIGl0ZW0sIGNvbnN1bWVkIG9ubHkgb24gc3VjY2Vzc1xuICAgICAgICAvLyAodGhlIHRyYW5zYWN0aW9uIHJvbGxzIHRoZSBjb3VudGVyIGJhY2sgd2hlbiB0aGUgaW5zZXJ0IGxvc2VzKS5cbiAgICAgICAgY29uc3QgY291bnRlclJvdyA9IChcbiAgICAgICAgICBhd2FpdCB0eFxuICAgICAgICAgICAgLnNlbGVjdCh7IGxhc3RGZW5jaW5nVG9rZW46IHdvcmtJdGVtcy5sYXN0RmVuY2luZ1Rva2VuIH0pXG4gICAgICAgICAgICAuZnJvbSh3b3JrSXRlbXMpXG4gICAgICAgICAgICAud2hlcmUoZXEod29ya0l0ZW1zLmlkLCBpdGVtLmlkKSlcbiAgICAgICAgICAgIC5saW1pdCgxKVxuICAgICAgICApWzBdO1xuICAgICAgICBjb25zdCB0b2tlbiA9IChjb3VudGVyUm93Py5sYXN0RmVuY2luZ1Rva2VuID8/IDApICsgMTtcbiAgICAgICAgYXdhaXQgdHgudXBkYXRlKHdvcmtJdGVtcykuc2V0KHsgbGFzdEZlbmNpbmdUb2tlbjogdG9rZW4gfSkud2hlcmUoZXEod29ya0l0ZW1zLmlkLCBpdGVtLmlkKSk7XG4gICAgICAgIC8vIFRoZSBwYXJ0aWFsIHVuaXF1ZSBpbmRleCBjbGFpbXNfb25lX2xpdmVfcGVyX2l0ZW0gZGVjaWRlcyB0aGUgcmFjZTpcbiAgICAgICAgLy8gYSBsaXZlIGNsYWltIG1ha2VzIHRoaXMgSU5TRVJUIGZhaWwgXHUyMDE0IHRoZSBsb3NlciBsZWF2ZXMgbm8gcm93LlxuICAgICAgICBhd2FpdCB0eC5pbnNlcnQoY2xhaW1zKS52YWx1ZXMoe1xuICAgICAgICAgIGlkOiBjbGFpbUlkLFxuICAgICAgICAgIHdvcmtJdGVtSWQ6IGl0ZW0uaWQsXG4gICAgICAgICAgYWN0b3JJZDogaW5wdXQuYWN0b3JJZCxcbiAgICAgICAgICBmZW5jaW5nVG9rZW46IHRva2VuLFxuICAgICAgICAgIGxlYXNlRXhwaXJlc0F0OiB0aGlzLm5vdyArIHR0bE1zLFxuICAgICAgICAgIHJlbGVhc2VkOiBmYWxzZSxcbiAgICAgICAgICB0dGxNcyxcbiAgICAgICAgfSk7XG4gICAgICAgIGF3YWl0IHRoaXMuYXBwZW5kVHgodHgsICd3b3JrX2l0ZW0nLCBpdGVtLmlkLCAnd29ya19pdGVtLmNsYWltZWQnLCBpbnB1dC5hY3RvcklkLCB7XG4gICAgICAgICAgY2xhaW1JZCxcbiAgICAgICAgICBmZW5jaW5nVG9rZW46IHRva2VuLFxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBpZDogY2xhaW1JZCxcbiAgICAgICAgICB3b3JrSXRlbUlkOiBpdGVtLmlkLFxuICAgICAgICAgIGFjdG9ySWQ6IGlucHV0LmFjdG9ySWQsXG4gICAgICAgICAgZmVuY2luZ1Rva2VuOiB0b2tlbixcbiAgICAgICAgICBsZWFzZUV4cGlyZXNBdDogdGhpcy5ub3cgKyB0dGxNcyxcbiAgICAgICAgICByZWxlYXNlZDogZmFsc2UsXG4gICAgICAgIH07XG4gICAgICB9KTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgaWYgKGlzVW5pcXVlVmlvbGF0aW9uKGVycm9yKSkge1xuICAgICAgICB0aHJvdyBuZXcgQ29uZmxpY3RFcnJvcihgd29yayBpdGVtICR7aXRlbS5pZH0gYWxyZWFkeSBoYXMgYSBsaXZlIGNsYWltYCk7XG4gICAgICB9XG4gICAgICB0aHJvdyBlcnJvcjtcbiAgICB9XG4gIH1cblxuICBhc3luYyBoZWFydGJlYXQoaW5wdXQ6IHsgY2xhaW1JZDogc3RyaW5nIH0pOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCByb3cgPSAoYXdhaXQgdGhpcy5kYi5zZWxlY3QoKS5mcm9tKGNsYWltcykud2hlcmUoZXEoY2xhaW1zLmlkLCBpbnB1dC5jbGFpbUlkKSkubGltaXQoMSkpWzBdO1xuICAgIGlmICghcm93IHx8IHJvdy5yZWxlYXNlZCB8fCByb3cubGVhc2VFeHBpcmVzQXQgPD0gdGhpcy5ub3cpIHtcbiAgICAgIHRocm93IG5ldyBDb25mbGljdEVycm9yKGBjbGFpbSAke2lucHV0LmNsYWltSWR9IGlzIG5vdCBsaXZlYCk7XG4gICAgfVxuICAgIC8vIEhlYXJ0YmVhdCByZW5ld3MgdGhlIEZVTEwgb3JpZ2luYWwgVFRMIGZyb20gdGhlIGhlYXJ0YmVhdCBtb21lbnQuXG4gICAgYXdhaXQgdGhpcy5kYlxuICAgICAgLnVwZGF0ZShjbGFpbXMpXG4gICAgICAuc2V0KHsgbGVhc2VFeHBpcmVzQXQ6IHRoaXMubm93ICsgcm93LnR0bE1zIH0pXG4gICAgICAud2hlcmUoZXEoY2xhaW1zLmlkLCByb3cuaWQpKTtcbiAgfVxuXG4gIGFzeW5jIHJlbGVhc2VDbGFpbShpbnB1dDogeyBjbGFpbUlkOiBzdHJpbmc7IHJlYXNvbj86IHN0cmluZyB9KTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3Qgcm93ID0gKGF3YWl0IHRoaXMuZGIuc2VsZWN0KCkuZnJvbShjbGFpbXMpLndoZXJlKGVxKGNsYWltcy5pZCwgaW5wdXQuY2xhaW1JZCkpLmxpbWl0KDEpKVswXTtcbiAgICBpZiAoIXJvdyB8fCByb3cucmVsZWFzZWQpIHJldHVybjtcbiAgICBhd2FpdCB0aGlzLmRiLnRyYW5zYWN0aW9uKGFzeW5jICh0eCkgPT4ge1xuICAgICAgYXdhaXQgdHgudXBkYXRlKGNsYWltcykuc2V0KHsgcmVsZWFzZWQ6IHRydWUgfSkud2hlcmUoZXEoY2xhaW1zLmlkLCByb3cuaWQpKTtcbiAgICAgIGF3YWl0IHRoaXMuYXBwZW5kVHgodHgsICd3b3JrX2l0ZW0nLCByb3cud29ya0l0ZW1JZCwgJ2NsYWltLnJlbGVhc2VkJywgcm93LmFjdG9ySWQsIHtcbiAgICAgICAgY2xhaW1JZDogcm93LmlkLFxuICAgICAgICByZWFzb246IGlucHV0LnJlYXNvbiA/PyBudWxsLFxuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICBhZHZhbmNlQ2xvY2sobXM6IG51bWJlcik6IHZvaWQge1xuICAgIHRoaXMubm93ICs9IG1zO1xuICB9XG5cbiAgLy8gLS0gbGlmZWN5Y2xlIChyb2FkbWFwIFx1MDBBNzEuMikgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICBhc3luYyBhZHZhbmNlU3RhdGUoaW5wdXQ6IEFkdmFuY2VJbnB1dCk6IFByb21pc2U8V29ya0l0ZW0+IHtcbiAgICBjb25zdCBpdGVtID0gYXdhaXQgdGhpcy5tdXN0R2V0SXRlbShpbnB1dC53b3JrSXRlbUlkKTtcblxuICAgIC8vIEtleWVkIHJlcGxheTogdGhlIHNhbWUgY29tbWFuZCByZXR1cm5zIHRoZSBzYW1lIHJlc3VsdCwgYXBwZW5kcyBub3RoaW5nLlxuICAgIGlmIChpbnB1dC5pZGVtcG90ZW5jeUtleSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBjb25zdCBjYWNoZWQgPSAoXG4gICAgICAgIGF3YWl0IHRoaXMuZGJcbiAgICAgICAgICAuc2VsZWN0KClcbiAgICAgICAgICAuZnJvbShpZGVtcG90ZW5jeUtleXMpXG4gICAgICAgICAgLndoZXJlKGVxKGlkZW1wb3RlbmN5S2V5cy5rZXksIGlucHV0LmlkZW1wb3RlbmN5S2V5KSlcbiAgICAgICAgICAubGltaXQoMSlcbiAgICAgIClbMF07XG4gICAgICBpZiAoY2FjaGVkKSByZXR1cm4geyAuLi4oY2FjaGVkLnJlc3VsdCBhcyB1bmtub3duIGFzIFdvcmtJdGVtKSB9O1xuICAgIH1cblxuICAgIC8vIFByZXNlcnZhdGlvbiBuby1vcCAoc3ByaW50LXBsYW5uaW5nIGlkZW1wb3RlbmN5IHJ1bGUpOiBhbiBVTktFWUVEXG4gICAgLy8gcmUtcmVxdWVzdCBvZiB0aGUgY3VycmVudCBzdGF0ZSBzdWNjZWVkcyB3aXRob3V0IGFuIGV2ZW50LlxuICAgIGlmIChpbnB1dC5pZGVtcG90ZW5jeUtleSA9PT0gdW5kZWZpbmVkICYmIGlucHV0LnRvID09PSBpdGVtLnN0YXRlKSB7XG4gICAgICBhd2FpdCB0aGlzLnZhbGlkYXRlUHJlc2VudGVkVG9rZW4oaXRlbSwgaW5wdXQuZmVuY2luZ1Rva2VuLCBpbnB1dC5hY3RvcklkKTtcbiAgICAgIHJldHVybiB0aGlzLnB1YmxpY0l0ZW0oaXRlbSk7XG4gICAgfVxuXG4gICAgLy8gVHJhbnNpdGlvbi10YWJsZSBsb29rdXAgcHJlY2VkZXMgY2xhaW0vdG9rZW4vcGVybWlzc2lvbiBjaGVja3NcbiAgICAvLyAoZnNtLXRyYW5zaXRpb25zIHBpbikuXG4gICAgY29uc3QgcnVsZSA9IFRSQU5TSVRJT05TLmZpbmQoKHQpID0+IHQuZnJvbSA9PT0gaXRlbS5zdGF0ZSAmJiB0LnRvID09PSBpbnB1dC50byk7XG4gICAgaWYgKCFydWxlKSB7XG4gICAgICBpZiAoXG4gICAgICAgIFJBTktbaW5wdXQudG9dIDwgUkFOS1tpdGVtLnN0YXRlIGFzIFdvcmtJdGVtU3RhdGVdICYmXG4gICAgICAgIChhd2FpdCB0aGlzLmhhc1Blcm1pc3Npb24oaW5wdXQuYWN0b3JJZCwgJ3N0YXRlLmRvd25ncmFkZScpKVxuICAgICAgKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnByaXZpbGVnZWREb3duZ3JhZGUoaXRlbSwgaW5wdXQpO1xuICAgICAgfVxuICAgICAgdGhyb3cgbmV3IEludmFsaWRUcmFuc2l0aW9uRXJyb3IoaXRlbS5zdGF0ZSBhcyBXb3JrSXRlbVN0YXRlLCBpbnB1dC50byk7XG4gICAgfVxuXG4gICAgYXdhaXQgdGhpcy52YWxpZGF0ZVByZXNlbnRlZFRva2VuKGl0ZW0sIGlucHV0LmZlbmNpbmdUb2tlbiwgaW5wdXQuYWN0b3JJZCk7XG5cbiAgICAvLyBCbG9ja2VkIG92ZXJsYXkgZnJlZXplcyB0cmFuc2l0aW9ucyBhdCBldmVyeSBzdGF0ZSAoRDgsIFx1MDBBNzEuMSkuXG4gICAgaWYgKGl0ZW0uYmxvY2tlZFJlYXNvbiAhPT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoYHdvcmsgaXRlbSBpcyBibG9ja2VkOiAke2l0ZW0uYmxvY2tlZFJlYXNvbn1gKTtcbiAgICB9XG5cbiAgICBhd2FpdCB0aGlzLnJlcXVpcmVQZXJtaXNzaW9uKGlucHV0LmFjdG9ySWQsIHJ1bGUucGVybWlzc2lvbik7XG5cbiAgICBpZiAocnVsZS5jbGFpbVJlcXVpcmVkICYmIGlucHV0LmZlbmNpbmdUb2tlbiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAvLyBFeGVjdXRpb24tem9uZSB0cmFuc2l0aW9ucyBkZW1hbmQgYSBQUkVTRU5URUQgbGl2ZSB0b2tlbi5cbiAgICAgIHRocm93IG5ldyBHdWFyZEZhaWxlZEVycm9yKCdjbGFpbSBmZW5jaW5nIHRva2VuIHJlcXVpcmVkIGZvciB0aGlzIHRyYW5zaXRpb24nKTtcbiAgICB9XG5cbiAgICBmb3IgKGNvbnN0IGd1YXJkIG9mIHJ1bGUuZ3VhcmRzKSB7XG4gICAgICBhd2FpdCB0aGlzLmNoZWNrR3VhcmQoZ3VhcmQsIGl0ZW0pO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLmRiLnRyYW5zYWN0aW9uKGFzeW5jICh0eCkgPT5cbiAgICAgIHRoaXMuZXhlY3V0ZVRyYW5zaXRpb25UeCh0eCwgaXRlbSwgaW5wdXQudG8sIGlucHV0LmFjdG9ySWQsIGlucHV0LmlkZW1wb3RlbmN5S2V5KSxcbiAgICApO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBjaGVja0d1YXJkKGd1YXJkOiBUcmFuc2l0aW9uUnVsZVsnZ3VhcmRzJ11bbnVtYmVyXSwgaXRlbTogV29ya0l0ZW1Sb3cpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBzd2l0Y2ggKGd1YXJkKSB7XG4gICAgICBjYXNlICdkZXBzX2RvbmUnOiB7XG4gICAgICAgIGZvciAoY29uc3QgZGVwS2V5IG9mIGl0ZW0uZGVwZW5kc09uKSB7XG4gICAgICAgICAgY29uc3QgZGVwID0gKFxuICAgICAgICAgICAgYXdhaXQgdGhpcy5kYlxuICAgICAgICAgICAgICAuc2VsZWN0KClcbiAgICAgICAgICAgICAgLmZyb20od29ya0l0ZW1zKVxuICAgICAgICAgICAgICAud2hlcmUoYW5kKGVxKHdvcmtJdGVtcy5mZWF0dXJlSWQsIGl0ZW0uZmVhdHVyZUlkKSwgZXEod29ya0l0ZW1zLmV4dGVybmFsS2V5LCBkZXBLZXkpKSlcbiAgICAgICAgICAgICAgLm9yZGVyQnkoYXNjKHdvcmtJdGVtcy5zZXEpKVxuICAgICAgICAgICAgICAubGltaXQoMSlcbiAgICAgICAgICApWzBdO1xuICAgICAgICAgIGlmIChkZXAgJiYgZGVwLnN0YXRlICE9PSAnZG9uZScpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBHdWFyZEZhaWxlZEVycm9yKGBkZXBlbmRlbmN5ICR7ZGVwS2V5fSBpcyBub3QgZG9uZWApO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBjYXNlICdzcGVjX2dhdGVfaWZfY2hlY2twb2ludCc6IHtcbiAgICAgICAgaWYgKCFpdGVtLnNwZWNDaGVja3BvaW50KSByZXR1cm47XG4gICAgICAgIGNvbnN0IGFwcHJvdmVkID0gKFxuICAgICAgICAgIGF3YWl0IHRoaXMuZGJcbiAgICAgICAgICAgIC5zZWxlY3QoeyBzZXE6IGdhdGVEZWNpc2lvbnMuc2VxIH0pXG4gICAgICAgICAgICAuZnJvbShnYXRlRGVjaXNpb25zKVxuICAgICAgICAgICAgLndoZXJlKFxuICAgICAgICAgICAgICBhbmQoXG4gICAgICAgICAgICAgICAgZXEoZ2F0ZURlY2lzaW9ucy53b3JrSXRlbUlkLCBpdGVtLmlkKSxcbiAgICAgICAgICAgICAgICBlcShnYXRlRGVjaXNpb25zLmdhdGUsICdzcGVjX2FwcHJvdmFsJyksXG4gICAgICAgICAgICAgICAgZXEoZ2F0ZURlY2lzaW9ucy5kZWNpc2lvbiwgJ2FwcHJvdmVkJyksXG4gICAgICAgICAgICAgICksXG4gICAgICAgICAgICApXG4gICAgICAgICAgICAubGltaXQoMSlcbiAgICAgICAgKVswXTtcbiAgICAgICAgaWYgKCFhcHByb3ZlZCkge1xuICAgICAgICAgIHRocm93IG5ldyBHdWFyZEZhaWxlZEVycm9yKCdzcGVjX2NoZWNrcG9pbnQgcmVxdWlyZXMgYW4gYXBwcm92ZWQgc3BlY19hcHByb3ZhbCBnYXRlIGRlY2lzaW9uJyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgY2FzZSAnbm9uZW1wdHlfZGlmZic6IHtcbiAgICAgICAgLy8gVGhlIExBVEVTVCBzdWJtaXR0ZWQgZ2l0X2RpZmYsIGlmIGFueSwgbXVzdCBiZSBub24tZW1wdHkgXHUyMDE0IHRoZVxuICAgICAgICAvLyBmYWtlLWRvbmUgZGVueS4gQWJzZW5jZSBpcyBub3QgY2hlY2tlZCBoZXJlIChDT05GT1JNQU5DRS5tZCBwaW4pLlxuICAgICAgICBjb25zdCByb3dzID0gYXdhaXQgdGhpcy5kYlxuICAgICAgICAgIC5zZWxlY3QoKVxuICAgICAgICAgIC5mcm9tKGV2aWRlbmNlVGFibGUpXG4gICAgICAgICAgLndoZXJlKGFuZChlcShldmlkZW5jZVRhYmxlLndvcmtJdGVtSWQsIGl0ZW0uaWQpLCBlcShldmlkZW5jZVRhYmxlLmtpbmQsICdnaXRfZGlmZicpKSlcbiAgICAgICAgICAub3JkZXJCeShhc2MoZXZpZGVuY2VUYWJsZS5zZXEpKTtcbiAgICAgICAgY29uc3QgbGF0ZXN0ID0gcm93c1tyb3dzLmxlbmd0aCAtIDFdO1xuICAgICAgICBpZiAobGF0ZXN0ICYmIGxhdGVzdC5wYXlsb2FkWydub25FbXB0eSddICE9PSB0cnVlKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoJ3RoZSBsYXRlc3QgZ2l0X2RpZmYgZXZpZGVuY2UgaXMgZW1wdHkgXHUyMDE0IG5vdGhpbmcgdG8gcmV2aWV3Jyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgcHJpdmlsZWdlZERvd25ncmFkZShpdGVtOiBXb3JrSXRlbVJvdywgaW5wdXQ6IEFkdmFuY2VJbnB1dCk6IFByb21pc2U8V29ya0l0ZW0+IHtcbiAgICBhd2FpdCB0aGlzLnZhbGlkYXRlUHJlc2VudGVkVG9rZW4oaXRlbSwgaW5wdXQuZmVuY2luZ1Rva2VuLCBpbnB1dC5hY3RvcklkKTtcbiAgICBpZiAoaXRlbS5ibG9ja2VkUmVhc29uICE9PSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcihgd29yayBpdGVtIGlzIGJsb2NrZWQ6ICR7aXRlbS5ibG9ja2VkUmVhc29ufWApO1xuICAgIH1cbiAgICBjb25zdCBmcm9tID0gaXRlbS5zdGF0ZTtcbiAgICByZXR1cm4gdGhpcy5kYi50cmFuc2FjdGlvbihhc3luYyAodHgpID0+IHtcbiAgICAgIGNvbnN0IHVwZGF0ZWQgPSBhd2FpdCB0eFxuICAgICAgICAudXBkYXRlKHdvcmtJdGVtcylcbiAgICAgICAgLnNldCh7IHN0YXRlOiBpbnB1dC50bywgc3RhdGVWZXJzaW9uOiBpdGVtLnN0YXRlVmVyc2lvbiArIDEgfSlcbiAgICAgICAgLndoZXJlKGFuZChlcSh3b3JrSXRlbXMuaWQsIGl0ZW0uaWQpLCBlcSh3b3JrSXRlbXMuc3RhdGVWZXJzaW9uLCBpdGVtLnN0YXRlVmVyc2lvbikpKVxuICAgICAgICAucmV0dXJuaW5nKHsgaWQ6IHdvcmtJdGVtcy5pZCB9KTtcbiAgICAgIGlmICh1cGRhdGVkLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICB0aHJvdyBuZXcgQ29uZmxpY3RFcnJvcihgc3RhdGVfdmVyc2lvbiBjb25mbGljdCBvbiB3b3JrIGl0ZW0gJHtpdGVtLmlkfWApO1xuICAgICAgfVxuICAgICAgYXdhaXQgdGhpcy5hcHBlbmRUeChcbiAgICAgICAgdHgsXG4gICAgICAgICd3b3JrX2l0ZW0nLFxuICAgICAgICBpdGVtLmlkLFxuICAgICAgICAnd29ya19pdGVtLnN0YXRlX2Rvd25ncmFkZWQnLFxuICAgICAgICBpbnB1dC5hY3RvcklkLFxuICAgICAgICB7IGZyb20sIHRvOiBpbnB1dC50bywgY29tcGVuc2F0aW5nOiB0cnVlIH0sXG4gICAgICAgIGlucHV0LmlkZW1wb3RlbmN5S2V5ICE9PSB1bmRlZmluZWQgPyB7IGlkZW1wb3RlbmN5S2V5OiBpbnB1dC5pZGVtcG90ZW5jeUtleSB9IDogdW5kZWZpbmVkLFxuICAgICAgKTtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IHRoaXMucHVibGljSXRlbSh7IC4uLml0ZW0sIHN0YXRlOiBpbnB1dC50bywgc3RhdGVWZXJzaW9uOiBpdGVtLnN0YXRlVmVyc2lvbiArIDEgfSk7XG4gICAgICBpZiAoaW5wdXQuaWRlbXBvdGVuY3lLZXkgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBhd2FpdCB0eFxuICAgICAgICAgIC5pbnNlcnQoaWRlbXBvdGVuY3lLZXlzKVxuICAgICAgICAgIC52YWx1ZXMoeyBrZXk6IGlucHV0LmlkZW1wb3RlbmN5S2V5LCByZXN1bHQ6IHJlc3VsdCBhcyB1bmtub3duIGFzIFJlY29yZDxzdHJpbmcsIHVua25vd24+IH0pXG4gICAgICAgICAgLm9uQ29uZmxpY3REb05vdGhpbmcoKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSk7XG4gIH1cblxuICAvKiogU2hhcmVkIGJ5IGFkdmFuY2VTdGF0ZSBhbmQgdGhlIGdhdGUtZmlyZWQgdHJhbnNpdGlvbnMuIE9ORSB0cmFuc2FjdGlvbiBwZXIgY29tbWFuZC4gKi9cbiAgcHJpdmF0ZSBhc3luYyBleGVjdXRlVHJhbnNpdGlvblR4KFxuICAgIHR4OiBUeCxcbiAgICBpdGVtOiBXb3JrSXRlbVJvdyxcbiAgICB0bzogV29ya0l0ZW1TdGF0ZSxcbiAgICBhY3RvcklkOiBzdHJpbmcsXG4gICAgaWRlbXBvdGVuY3lLZXk/OiBzdHJpbmcsXG4gICAgY2F1c2F0aW9uSWQ/OiBzdHJpbmcsXG4gICk6IFByb21pc2U8V29ya0l0ZW0+IHtcbiAgICBjb25zdCBmcm9tID0gaXRlbS5zdGF0ZSBhcyBXb3JrSXRlbVN0YXRlO1xuICAgIC8vIENBUzogb3B0aW1pc3RpYyBjb25jdXJyZW5jeSBieSBzdGF0ZV92ZXJzaW9uIChyb2FkbWFwIFx1MDBBNzEuMSkuXG4gICAgY29uc3QgdXBkYXRlZCA9IGF3YWl0IHR4XG4gICAgICAudXBkYXRlKHdvcmtJdGVtcylcbiAgICAgIC5zZXQoeyBzdGF0ZTogdG8sIHN0YXRlVmVyc2lvbjogaXRlbS5zdGF0ZVZlcnNpb24gKyAxIH0pXG4gICAgICAud2hlcmUoYW5kKGVxKHdvcmtJdGVtcy5pZCwgaXRlbS5pZCksIGVxKHdvcmtJdGVtcy5zdGF0ZVZlcnNpb24sIGl0ZW0uc3RhdGVWZXJzaW9uKSkpXG4gICAgICAucmV0dXJuaW5nKHsgaWQ6IHdvcmtJdGVtcy5pZCB9KTtcbiAgICBpZiAodXBkYXRlZC5sZW5ndGggPT09IDApIHtcbiAgICAgIHRocm93IG5ldyBDb25mbGljdEVycm9yKGBzdGF0ZV92ZXJzaW9uIGNvbmZsaWN0IG9uIHdvcmsgaXRlbSAke2l0ZW0uaWR9YCk7XG4gICAgfVxuICAgIGNvbnN0IGV2ZW50ID0gYXdhaXQgdGhpcy5hcHBlbmRUeChcbiAgICAgIHR4LFxuICAgICAgJ3dvcmtfaXRlbScsXG4gICAgICBpdGVtLmlkLFxuICAgICAgJ3dvcmtfaXRlbS5zdGF0ZV9jaGFuZ2VkJyxcbiAgICAgIGFjdG9ySWQsXG4gICAgICB7IGZyb20sIHRvIH0sXG4gICAgICB7XG4gICAgICAgIC4uLihjYXVzYXRpb25JZCAhPT0gdW5kZWZpbmVkID8geyBjYXVzYXRpb25JZCB9IDoge30pLFxuICAgICAgICAuLi4oaWRlbXBvdGVuY3lLZXkgIT09IHVuZGVmaW5lZCA/IHsgaWRlbXBvdGVuY3lLZXkgfSA6IHt9KSxcbiAgICAgIH0sXG4gICAgKTtcblxuICAgIC8vIEVwaWMtbGlmdCBwcm9qZWN0b3IgKHJvYWRtYXAgXHUwMEE3MS4yKTogZmlyc3QgY2hpbGQgTEVBVklORyBiYWNrbG9nIGxpZnRzXG4gICAgLy8gdGhlIGZlYXR1cmU7IGlkZW1wb3RlbnQgYnkgY2hlY2s7IGF1dGhvcmVkIGJ5IHRoZSBzeXN0ZW0gYWN0b3IuXG4gICAgaWYgKGZyb20gPT09ICdiYWNrbG9nJyAmJiB0byAhPT0gJ2JhY2tsb2cnKSB7XG4gICAgICBjb25zdCBmZWF0dXJlID0gYXdhaXQgdGhpcy5nZXRGZWF0dXJlUm93KGl0ZW0uZmVhdHVyZUlkLCB0eCk7XG4gICAgICBpZiAoZmVhdHVyZSAmJiBmZWF0dXJlLnN0YXRlID09PSAnYmFja2xvZycpIHtcbiAgICAgICAgYXdhaXQgdHgudXBkYXRlKGZlYXR1cmVzKS5zZXQoeyBzdGF0ZTogJ2luX3Byb2dyZXNzJyB9KS53aGVyZShlcShmZWF0dXJlcy5pZCwgZmVhdHVyZS5pZCkpO1xuICAgICAgICBhd2FpdCB0aGlzLmFwcGVuZFR4KFxuICAgICAgICAgIHR4LFxuICAgICAgICAgICdmZWF0dXJlJyxcbiAgICAgICAgICBmZWF0dXJlLmlkLFxuICAgICAgICAgICdmZWF0dXJlLnN0YXRlX2NoYW5nZWQnLFxuICAgICAgICAgIHRoaXMuc3lzdGVtQWN0b3JJZCxcbiAgICAgICAgICB7IGZyb206ICdiYWNrbG9nJywgdG86ICdpbl9wcm9ncmVzcycgfSxcbiAgICAgICAgICB7IGNhdXNhdGlvbklkOiBTdHJpbmcoZXZlbnQuZ2xvYmFsU2VxKSB9LFxuICAgICAgICApO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIGRvbmVfY2hlY2twb2ludCAocm9hZG1hcCBcdTAwQTcxLjEpOiB0aGUgc3RvcnkgY29tcGxldGVzIG5vcm1hbGx5OyB0aGUgaG9sZFxuICAgIC8vIG1hdGVyaWFsaXplcyBvbiB0aGUgZmVhdHVyZSBleGFjdGx5IGF0IGNvbXBsZXRpb24uXG4gICAgaWYgKHRvID09PSAnZG9uZScgJiYgaXRlbS5kb25lQ2hlY2twb2ludCkge1xuICAgICAgY29uc3QgZmVhdHVyZSA9IGF3YWl0IHRoaXMuZ2V0RmVhdHVyZVJvdyhpdGVtLmZlYXR1cmVJZCwgdHgpO1xuICAgICAgaWYgKGZlYXR1cmUgJiYgIWZlYXR1cmUuZGlzcGF0Y2hIb2xkKSB7XG4gICAgICAgIGF3YWl0IHR4LnVwZGF0ZShmZWF0dXJlcykuc2V0KHsgZGlzcGF0Y2hIb2xkOiB0cnVlIH0pLndoZXJlKGVxKGZlYXR1cmVzLmlkLCBmZWF0dXJlLmlkKSk7XG4gICAgICAgIGF3YWl0IHRoaXMuYXBwZW5kVHgoXG4gICAgICAgICAgdHgsXG4gICAgICAgICAgJ2ZlYXR1cmUnLFxuICAgICAgICAgIGZlYXR1cmUuaWQsXG4gICAgICAgICAgJ2ZlYXR1cmUuZGlzcGF0Y2hfaG9sZF9yYWlzZWQnLFxuICAgICAgICAgIHRoaXMuc3lzdGVtQWN0b3JJZCxcbiAgICAgICAgICB7IHdvcmtJdGVtSWQ6IGl0ZW0uaWQgfSxcbiAgICAgICAgICB7IGNhdXNhdGlvbklkOiBTdHJpbmcoZXZlbnQuZ2xvYmFsU2VxKSB9LFxuICAgICAgICApO1xuICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IHJlc3VsdCA9IHRoaXMucHVibGljSXRlbSh7IC4uLml0ZW0sIHN0YXRlOiB0bywgc3RhdGVWZXJzaW9uOiBpdGVtLnN0YXRlVmVyc2lvbiArIDEgfSk7XG4gICAgaWYgKGlkZW1wb3RlbmN5S2V5ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIGF3YWl0IHR4XG4gICAgICAgIC5pbnNlcnQoaWRlbXBvdGVuY3lLZXlzKVxuICAgICAgICAudmFsdWVzKHsga2V5OiBpZGVtcG90ZW5jeUtleSwgcmVzdWx0OiByZXN1bHQgYXMgdW5rbm93biBhcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiB9KVxuICAgICAgICAub25Db25mbGljdERvTm90aGluZygpO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgYXN5bmMgYmxvY2tUYXNrKGlucHV0OiB7XG4gICAgd29ya0l0ZW1JZDogc3RyaW5nO1xuICAgIHJlYXNvbjogQmxvY2tlZFJlYXNvbjtcbiAgICBhY3RvcklkOiBzdHJpbmc7XG4gICAgZmVuY2luZ1Rva2VuPzogbnVtYmVyO1xuICB9KTogUHJvbWlzZTxXb3JrSXRlbT4ge1xuICAgIGNvbnN0IGl0ZW0gPSBhd2FpdCB0aGlzLm11c3RHZXRJdGVtKGlucHV0LndvcmtJdGVtSWQpO1xuICAgIGlmICghKEJMT0NLRURfUkVBU09OUyBhcyByZWFkb25seSBzdHJpbmdbXSkuaW5jbHVkZXMoaW5wdXQucmVhc29uKSkge1xuICAgICAgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoYHVua25vd24gYmxvY2tpbmcgY29uZGl0aW9uOiAke2lucHV0LnJlYXNvbn1gKTtcbiAgICB9XG4gICAgYXdhaXQgdGhpcy52YWxpZGF0ZVByZXNlbnRlZFRva2VuKGl0ZW0sIGlucHV0LmZlbmNpbmdUb2tlbiwgaW5wdXQuYWN0b3JJZCk7XG4gICAgYXdhaXQgdGhpcy5yZXF1aXJlUGVybWlzc2lvbihpbnB1dC5hY3RvcklkLCAndGFzay5ibG9jaycpO1xuICAgIHJldHVybiB0aGlzLmRiLnRyYW5zYWN0aW9uKGFzeW5jICh0eCkgPT4ge1xuICAgICAgYXdhaXQgdHhcbiAgICAgICAgLnVwZGF0ZSh3b3JrSXRlbXMpXG4gICAgICAgIC5zZXQoeyBibG9ja2VkUmVhc29uOiBpbnB1dC5yZWFzb24sIHN0YXRlVmVyc2lvbjogaXRlbS5zdGF0ZVZlcnNpb24gKyAxIH0pXG4gICAgICAgIC53aGVyZShlcSh3b3JrSXRlbXMuaWQsIGl0ZW0uaWQpKTtcbiAgICAgIGF3YWl0IHRoaXMuYXBwZW5kVHgodHgsICd3b3JrX2l0ZW0nLCBpdGVtLmlkLCAnd29ya19pdGVtLmJsb2NrZWQnLCBpbnB1dC5hY3RvcklkLCB7XG4gICAgICAgIHJlYXNvbjogaW5wdXQucmVhc29uLFxuICAgICAgfSk7XG4gICAgICByZXR1cm4gdGhpcy5wdWJsaWNJdGVtKHsgLi4uaXRlbSwgYmxvY2tlZFJlYXNvbjogaW5wdXQucmVhc29uLCBzdGF0ZVZlcnNpb246IGl0ZW0uc3RhdGVWZXJzaW9uICsgMSB9KTtcbiAgICB9KTtcbiAgfVxuXG4gIGFzeW5jIHVuYmxvY2tUYXNrKGlucHV0OiB7IHdvcmtJdGVtSWQ6IHN0cmluZzsgYWN0b3JJZDogc3RyaW5nIH0pOiBQcm9taXNlPFdvcmtJdGVtPiB7XG4gICAgY29uc3QgaXRlbSA9IGF3YWl0IHRoaXMubXVzdEdldEl0ZW0oaW5wdXQud29ya0l0ZW1JZCk7XG4gICAgLy8gXHUwMEE3NC4yOiByZXZpZXdfbm9uX2NvbnZlcmdlbmNlIGNhbiBvbmx5IGJlIHJlbGVhc2VkIGJ5IGEgcmV2aWV3LWdhdGVcbiAgICAvLyBob2xkZXI7IG9yZGluYXJ5IGJsb2NrcyByZWxlYXNlIHVuZGVyIHRhc2suYmxvY2suXG4gICAgaWYgKGl0ZW0uYmxvY2tlZFJlYXNvbiA9PT0gJ3Jldmlld19ub25fY29udmVyZ2VuY2UnKSB7XG4gICAgICBhd2FpdCB0aGlzLnJlcXVpcmVQZXJtaXNzaW9uKGlucHV0LmFjdG9ySWQsICdnYXRlLnJldmlldy5hcHByb3ZlJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGF3YWl0IHRoaXMucmVxdWlyZVBlcm1pc3Npb24oaW5wdXQuYWN0b3JJZCwgJ3Rhc2suYmxvY2snKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuZGIudHJhbnNhY3Rpb24oYXN5bmMgKHR4KSA9PiB7XG4gICAgICBhd2FpdCB0eFxuICAgICAgICAudXBkYXRlKHdvcmtJdGVtcylcbiAgICAgICAgLnNldCh7IGJsb2NrZWRSZWFzb246IG51bGwsIHN0YXRlVmVyc2lvbjogaXRlbS5zdGF0ZVZlcnNpb24gKyAxIH0pXG4gICAgICAgIC53aGVyZShlcSh3b3JrSXRlbXMuaWQsIGl0ZW0uaWQpKTtcbiAgICAgIGF3YWl0IHRoaXMuYXBwZW5kVHgodHgsICd3b3JrX2l0ZW0nLCBpdGVtLmlkLCAnd29ya19pdGVtLnVuYmxvY2tlZCcsIGlucHV0LmFjdG9ySWQsIHt9KTtcbiAgICAgIHJldHVybiB0aGlzLnB1YmxpY0l0ZW0oeyAuLi5pdGVtLCBibG9ja2VkUmVhc29uOiBudWxsLCBzdGF0ZVZlcnNpb246IGl0ZW0uc3RhdGVWZXJzaW9uICsgMSB9KTtcbiAgICB9KTtcbiAgfVxuXG4gIC8vIC0tIGdhdGVzICYgZXZpZGVuY2UgKHJvYWRtYXAgXHUwMEE3MS40KSAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICBhc3luYyBzdWJtaXRFdmlkZW5jZShpbnB1dDoge1xuICAgIHdvcmtJdGVtSWQ6IHN0cmluZztcbiAgICBldmlkZW5jZTogRXZpZGVuY2U7XG4gICAgYWN0b3JJZDogc3RyaW5nO1xuICAgIGZlbmNpbmdUb2tlbj86IG51bWJlcjtcbiAgfSk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IGl0ZW0gPSBhd2FpdCB0aGlzLm11c3RHZXRJdGVtKGlucHV0LndvcmtJdGVtSWQpO1xuICAgIGF3YWl0IHRoaXMudmFsaWRhdGVQcmVzZW50ZWRUb2tlbihpdGVtLCBpbnB1dC5mZW5jaW5nVG9rZW4sIGlucHV0LmFjdG9ySWQpO1xuICAgIGF3YWl0IHRoaXMuZGIudHJhbnNhY3Rpb24oYXN5bmMgKHR4KSA9PiB7XG4gICAgICBhd2FpdCB0eC5pbnNlcnQoZXZpZGVuY2VUYWJsZSkudmFsdWVzKHtcbiAgICAgICAgd29ya0l0ZW1JZDogaXRlbS5pZCxcbiAgICAgICAga2luZDogaW5wdXQuZXZpZGVuY2Uua2luZCxcbiAgICAgICAgcGF5bG9hZDogaW5wdXQuZXZpZGVuY2UucGF5bG9hZCxcbiAgICAgIH0pO1xuICAgICAgYXdhaXQgdGhpcy5hcHBlbmRUeCh0eCwgJ3dvcmtfaXRlbScsIGl0ZW0uaWQsICdldmlkZW5jZS5zdWJtaXR0ZWQnLCBpbnB1dC5hY3RvcklkLCB7XG4gICAgICAgIGtpbmQ6IGlucHV0LmV2aWRlbmNlLmtpbmQsXG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuXG4gIGFzeW5jIGFwcHJvdmVHYXRlKGlucHV0OiBHYXRlRGVjaXNpb25JbnB1dCk6IFByb21pc2U8V29ya0l0ZW0+IHtcbiAgICBjb25zdCBpdGVtID0gYXdhaXQgdGhpcy5tdXN0R2V0SXRlbShpbnB1dC53b3JrSXRlbUlkKTtcblxuICAgIGlmIChpbnB1dC5nYXRlID09PSAnc3BlY19hcHByb3ZhbCcpIHtcbiAgICAgIC8vIFBlcm1pc3Npb24gcHJlY2VkZXMgYW55IGVmZmVjdDogYSBkZW5pZWQgYXR0ZW1wdCBwaW5zIG5vdGhpbmcuXG4gICAgICBhd2FpdCB0aGlzLnJlcXVpcmVQZXJtaXNzaW9uKGlucHV0LmFjdG9ySWQsICdnYXRlLnNwZWMuYXBwcm92ZScpO1xuICAgICAgaWYgKGl0ZW0uYmxvY2tlZFJlYXNvbiAhPT0gbnVsbCkge1xuICAgICAgICB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcihgd29yayBpdGVtIGlzIGJsb2NrZWQ6ICR7aXRlbS5ibG9ja2VkUmVhc29ufWApO1xuICAgICAgfVxuICAgICAgaWYgKGl0ZW0uc3RhdGUgIT09ICdkcmFmdCcpIHtcbiAgICAgICAgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoYHNwZWNfYXBwcm92YWwgYXBwbGllcyB0byBkcmFmdCBpdGVtcywgbm90ICR7aXRlbS5zdGF0ZX1gKTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHF1b3J1bU1ldCA9IGF3YWl0IHRoaXMucXVvcnVtV291bGRCZU1ldChpdGVtLCAnc3BlY19hcHByb3ZhbCcsIGlucHV0LmFjdG9ySWQpO1xuICAgICAgcmV0dXJuIHRoaXMuZGIudHJhbnNhY3Rpb24oYXN5bmMgKHR4KSA9PiB7XG4gICAgICAgIGxldCBwaW5uZWQgPSBpdGVtLnBpbm5lZFZlcmlmaWNhdGlvbjtcbiAgICAgICAgaWYgKGlucHV0LnBpbm5lZFZlcmlmaWNhdGlvbiAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgcGlubmVkID0gWy4uLmlucHV0LnBpbm5lZFZlcmlmaWNhdGlvbl07XG4gICAgICAgICAgYXdhaXQgdHgudXBkYXRlKHdvcmtJdGVtcykuc2V0KHsgcGlubmVkVmVyaWZpY2F0aW9uOiBwaW5uZWQgfSkud2hlcmUoZXEod29ya0l0ZW1zLmlkLCBpdGVtLmlkKSk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgcGlubmVkSXRlbSA9IHsgLi4uaXRlbSwgcGlubmVkVmVyaWZpY2F0aW9uOiBwaW5uZWQgfTtcbiAgICAgICAgYXdhaXQgdGhpcy5yZWNvcmRBcHByb3ZhbFR4KHR4LCBwaW5uZWRJdGVtLCAnc3BlY19hcHByb3ZhbCcsIGlucHV0LmFjdG9ySWQpO1xuICAgICAgICBpZiAoIXF1b3J1bU1ldCkge1xuICAgICAgICAgIC8vIERlY2lzaW9uIHJlY29yZGVkOyBxdW9ydW0gcGVuZGluZyAoZ2F0ZSBwb2xpY3kgaXMgZGF0YSwgcm9hZG1hcCBcdTAwQTczKS5cbiAgICAgICAgICByZXR1cm4gdGhpcy5wdWJsaWNJdGVtKHBpbm5lZEl0ZW0pO1xuICAgICAgICB9XG4gICAgICAgIC8vIFRoZSBhcHByb3ZhbCBmaXJlcyB0aGUgZ2F0ZWQgZm9yd2FyZCB0cmFuc2l0aW9uIChjb25mb3JtYW5jZSBwaW4pLlxuICAgICAgICByZXR1cm4gdGhpcy5leGVjdXRlVHJhbnNpdGlvblR4KHR4LCBwaW5uZWRJdGVtLCAncmVhZHlfZm9yX2RldicsIGlucHV0LmFjdG9ySWQpO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gcmV2aWV3X2FwcHJvdmFsXG4gICAgYXdhaXQgdGhpcy5yZXF1aXJlUGVybWlzc2lvbihpbnB1dC5hY3RvcklkLCAnZ2F0ZS5yZXZpZXcuYXBwcm92ZScpO1xuICAgIGlmIChpdGVtLmJsb2NrZWRSZWFzb24gIT09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBHdWFyZEZhaWxlZEVycm9yKGB3b3JrIGl0ZW0gaXMgYmxvY2tlZDogJHtpdGVtLmJsb2NrZWRSZWFzb259YCk7XG4gICAgfVxuICAgIGlmIChpdGVtLnN0YXRlICE9PSAnaW5fcmV2aWV3Jykge1xuICAgICAgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoYHJldmlld19hcHByb3ZhbCBhcHBsaWVzIHRvIGluX3JldmlldyBpdGVtcywgbm90ICR7aXRlbS5zdGF0ZX1gKTtcbiAgICB9XG4gICAgY29uc3QgcXVvcnVtTWV0ID0gYXdhaXQgdGhpcy5xdW9ydW1Xb3VsZEJlTWV0KGl0ZW0sICdyZXZpZXdfYXBwcm92YWwnLCBpbnB1dC5hY3RvcklkKTtcbiAgICAvLyBFdmlkZW5jZSBpcyBjaGVja2VkIGV4YWN0bHkgd2hlbiB0aGUgcXVvcnVtIHdvdWxkIGNvbXBsZXRlLCBzbyBhIGZhaWxlZFxuICAgIC8vIGFwcHJvdmFsIHJlY29yZHMgbm90aGluZyAoUGhhc2UgMSBwaW46IGRlbmllZCBhdHRlbXB0cyBtdXRhdGUgbm90aGluZykuXG4gICAgaWYgKHF1b3J1bU1ldCkgYXdhaXQgdGhpcy5jaGVja1Jldmlld0V2aWRlbmNlKGl0ZW0pO1xuICAgIHJldHVybiB0aGlzLmRiLnRyYW5zYWN0aW9uKGFzeW5jICh0eCkgPT4ge1xuICAgICAgYXdhaXQgdGhpcy5yZWNvcmRBcHByb3ZhbFR4KHR4LCBpdGVtLCAncmV2aWV3X2FwcHJvdmFsJywgaW5wdXQuYWN0b3JJZCk7XG4gICAgICBpZiAoIXF1b3J1bU1ldCkge1xuICAgICAgICByZXR1cm4gdGhpcy5wdWJsaWNJdGVtKGl0ZW0pOyAvLyBxdW9ydW0gcGVuZGluZyBcdTIwMTQgbm8gdHJhbnNpdGlvbiB5ZXRcbiAgICAgIH1cbiAgICAgIHJldHVybiB0aGlzLmV4ZWN1dGVUcmFuc2l0aW9uVHgodHgsIGl0ZW0sICdkb25lJywgaW5wdXQuYWN0b3JJZCk7XG4gICAgfSk7XG4gIH1cblxuICAvKiogRGlzdGluY3QgYXBwcm92ZXJzIG9mIHRoaXMgcm91bmQgKHJvdW5kID0gcmV2aWV3TG9vcEl0ZXJhdGlvbiBhdCBkZWNpc2lvbiB0aW1lKS4gKi9cbiAgcHJpdmF0ZSBhc3luYyByb3VuZEFwcHJvdmVycyhpdGVtOiBXb3JrSXRlbVJvdywgZ2F0ZTogR2F0ZUNvZGUpOiBQcm9taXNlPEFjdG9yUm93W10+IHtcbiAgICBjb25zdCByb3dzID0gYXdhaXQgdGhpcy5kYlxuICAgICAgLnNlbGVjdCh7IGFjdG9ySWQ6IGdhdGVEZWNpc2lvbnMuYWN0b3JJZCB9KVxuICAgICAgLmZyb20oZ2F0ZURlY2lzaW9ucylcbiAgICAgIC53aGVyZShcbiAgICAgICAgYW5kKFxuICAgICAgICAgIGVxKGdhdGVEZWNpc2lvbnMud29ya0l0ZW1JZCwgaXRlbS5pZCksXG4gICAgICAgICAgZXEoZ2F0ZURlY2lzaW9ucy5nYXRlLCBnYXRlKSxcbiAgICAgICAgICBlcShnYXRlRGVjaXNpb25zLmRlY2lzaW9uLCAnYXBwcm92ZWQnKSxcbiAgICAgICAgICBlcShnYXRlRGVjaXNpb25zLnJvdW5kLCBpdGVtLnJldmlld0xvb3BJdGVyYXRpb24pLFxuICAgICAgICApLFxuICAgICAgKVxuICAgICAgLm9yZGVyQnkoYXNjKGdhdGVEZWNpc2lvbnMuc2VxKSk7XG4gICAgY29uc3QgaWRzID0gWy4uLm5ldyBTZXQocm93cy5tYXAoKHJvdykgPT4gcm93LmFjdG9ySWQpKV07XG4gICAgY29uc3QgcmVzdWx0OiBBY3RvclJvd1tdID0gW107XG4gICAgZm9yIChjb25zdCBpZCBvZiBpZHMpIHtcbiAgICAgIGNvbnN0IGFjdG9yID0gYXdhaXQgdGhpcy5nZXRBY3RvclJvdyhpZCk7XG4gICAgICBpZiAoYWN0b3IpIHJlc3VsdC5wdXNoKGFjdG9yKTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIC8qKiBHYXRlIHBvbGljeSBxdW9ydW0gKHJvYWRtYXAgXHUwMEE3Myk6IG1pbiBkaXN0aW5jdCBhcHByb3ZlcnMgKyByZXF1aXJlZCBhY3RvciB0eXBlcywgYXMgREFUQS4gKi9cbiAgcHJpdmF0ZSBhc3luYyBxdW9ydW1Xb3VsZEJlTWV0KGl0ZW06IFdvcmtJdGVtUm93LCBnYXRlOiBHYXRlQ29kZSwgbmV4dEFwcHJvdmVySWQ6IHN0cmluZyk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICAgIGNvbnN0IHBvbGljeSA9IGF3YWl0IHRoaXMuZ2V0R2F0ZVBvbGljeShnYXRlKTtcbiAgICBjb25zdCBtaW4gPSBwb2xpY3kubWluQXBwcm92YWxzID8/IDE7XG4gICAgY29uc3QgcmVxdWlyZWQgPSBwb2xpY3kucmVxdWlyZWRBY3RvclR5cGVzID8/IFtdO1xuICAgIGNvbnN0IGFwcHJvdmVycyA9IGF3YWl0IHRoaXMucm91bmRBcHByb3ZlcnMoaXRlbSwgZ2F0ZSk7XG4gICAgY29uc3QgbmV4dEFjdG9yID0gYXdhaXQgdGhpcy5nZXRBY3RvclJvdyhuZXh0QXBwcm92ZXJJZCk7XG4gICAgaWYgKG5leHRBY3RvciAmJiAhYXBwcm92ZXJzLnNvbWUoKGEpID0+IGEuaWQgPT09IG5leHRBY3Rvci5pZCkpIGFwcHJvdmVycy5wdXNoKG5leHRBY3Rvcik7XG4gICAgaWYgKGFwcHJvdmVycy5sZW5ndGggPCBtaW4pIHJldHVybiBmYWxzZTtcbiAgICBmb3IgKGNvbnN0IHR5cGUgb2YgcmVxdWlyZWQpIHtcbiAgICAgIGlmICghYXBwcm92ZXJzLnNvbWUoKGEpID0+IGEudHlwZSA9PT0gdHlwZSkpIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIHJlY29yZEFwcHJvdmFsVHgodHg6IFF1ZXJ5YWJsZSwgaXRlbTogV29ya0l0ZW1Sb3csIGdhdGU6IEdhdGVDb2RlLCBhY3RvcklkOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBhd2FpdCB0eC5pbnNlcnQoZ2F0ZURlY2lzaW9ucykudmFsdWVzKHtcbiAgICAgIHdvcmtJdGVtSWQ6IGl0ZW0uaWQsXG4gICAgICBnYXRlLFxuICAgICAgZGVjaXNpb246ICdhcHByb3ZlZCcsXG4gICAgICBhY3RvcklkLFxuICAgICAgcm91bmQ6IGl0ZW0ucmV2aWV3TG9vcEl0ZXJhdGlvbixcbiAgICB9KTtcbiAgICBhd2FpdCB0aGlzLmFwcGVuZFR4KHR4LCAnd29ya19pdGVtJywgaXRlbS5pZCwgJ2dhdGUuYXBwcm92ZWQnLCBhY3RvcklkLCB7XG4gICAgICBnYXRlLFxuICAgICAgcm91bmQ6IGl0ZW0ucmV2aWV3TG9vcEl0ZXJhdGlvbixcbiAgICAgIC4uLihnYXRlID09PSAnc3BlY19hcHByb3ZhbCcgPyB7IHBpbm5lZFZlcmlmaWNhdGlvbjogaXRlbS5waW5uZWRWZXJpZmljYXRpb24gfSA6IHt9KSxcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBFdmlkZW5jZSBjb25kaXRpb24gb2YgdGhlIGRvbmUgZ2F0ZSAoXHUwMEE3MS40LCBENyk6IGV2ZXJ5IFBJTk5FRCBjb21tYW5kJ3NcbiAgICogbGF0ZXN0IHRlc3RfcnVuIGV4aXRlZCAwLCBhbmQgdGhlIGZpbmFsIGNvbW1pdCBpcyByZWFjaGFibGUgb24gdGhlXG4gICAqIHJlbW90ZS4gcmV2aWV3X3JlcG9ydCBpcyBuZXZlciBjb25zdWx0ZWQuXG4gICAqL1xuICBwcml2YXRlIGFzeW5jIGNoZWNrUmV2aWV3RXZpZGVuY2UoaXRlbTogV29ya0l0ZW1Sb3cpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCByb3dzID0gYXdhaXQgdGhpcy5kYlxuICAgICAgLnNlbGVjdCgpXG4gICAgICAuZnJvbShldmlkZW5jZVRhYmxlKVxuICAgICAgLndoZXJlKGVxKGV2aWRlbmNlVGFibGUud29ya0l0ZW1JZCwgaXRlbS5pZCkpXG4gICAgICAub3JkZXJCeShhc2MoZXZpZGVuY2VUYWJsZS5zZXEpKTtcbiAgICBmb3IgKGNvbnN0IGNvbW1hbmQgb2YgaXRlbS5waW5uZWRWZXJpZmljYXRpb24gPz8gW10pIHtcbiAgICAgIGNvbnN0IHJ1bnMgPSByb3dzLmZpbHRlcigocm93KSA9PiByb3cua2luZCA9PT0gJ3Rlc3RfcnVuJyAmJiByb3cucGF5bG9hZFsnY29tbWFuZCddID09PSBjb21tYW5kKTtcbiAgICAgIGNvbnN0IGxhdGVzdCA9IHJ1bnNbcnVucy5sZW5ndGggLSAxXTtcbiAgICAgIGlmICghbGF0ZXN0IHx8IGxhdGVzdC5wYXlsb2FkWydleGl0Q29kZSddICE9PSAwKSB7XG4gICAgICAgIHRocm93IG5ldyBHdWFyZEZhaWxlZEVycm9yKGBwaW5uZWQgdmVyaWZpY2F0aW9uIGRpZCBub3QgcGFzczogJHtjb21tYW5kfWApO1xuICAgICAgfVxuICAgIH1cbiAgICBjb25zdCBjb21taXRPayA9IHJvd3Muc29tZSgocm93KSA9PiByb3cua2luZCA9PT0gJ2NvbW1pdCcgJiYgcm93LnBheWxvYWRbJ3JlYWNoYWJsZU9uUmVtb3RlJ10gPT09IHRydWUpO1xuICAgIGlmICghY29tbWl0T2spIHtcbiAgICAgIHRocm93IG5ldyBHdWFyZEZhaWxlZEVycm9yKFxuICAgICAgICAnZmluYWwgcmV2aXNpb24gbXVzdCBiZSByZWFjaGFibGUgb24gdGhlIHJlbW90ZSAocHVzaCBpcyBwYXJ0IG9mIHRoZSBIQUxUIGNvbnRyYWN0KScsXG4gICAgICApO1xuICAgIH1cbiAgfVxuXG4gIGFzeW5jIHJlamVjdEdhdGUoaW5wdXQ6IEdhdGVEZWNpc2lvbklucHV0KTogUHJvbWlzZTxXb3JrSXRlbT4ge1xuICAgIGNvbnN0IGl0ZW0gPSBhd2FpdCB0aGlzLm11c3RHZXRJdGVtKGlucHV0LndvcmtJdGVtSWQpO1xuICAgIGlmIChpbnB1dC5nYXRlICE9PSAncmV2aWV3X2FwcHJvdmFsJykge1xuICAgICAgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoJ29ubHkgcmV2aWV3X2FwcHJvdmFsIHJlamVjdGlvbiBpcyBkZWZpbmVkIGluIFBoYXNlIDEnKTtcbiAgICB9XG4gICAgLy8gUGhhc2UgMiAoYWRkaXRpdmUpOiByZWplY3Rpb24gYXV0aG9yaXR5ID0gZ2F0ZS5yZXZpZXcuYXBwcm92ZSBPUlxuICAgIC8vIGdhdGUucmV2aWV3LnJlamVjdCBcdTIwMTQgdGhlIFBoYXNlIDIgZXhpdCBjcml0ZXJpb24ncyByZXZpZXdlci1hZ2VudCBob2xkc1xuICAgIC8vIG9ubHkgdGhlIGxhdHRlci4gRXZlcnkgUGhhc2UgMSBwaW4gb24gcmVqZWN0R2F0ZSBrZWVwcyBob2xkaW5nLlxuICAgIGlmIChcbiAgICAgICEoYXdhaXQgdGhpcy5oYXNQZXJtaXNzaW9uKGlucHV0LmFjdG9ySWQsICdnYXRlLnJldmlldy5hcHByb3ZlJykpICYmXG4gICAgICAhKGF3YWl0IHRoaXMuaGFzUGVybWlzc2lvbihpbnB1dC5hY3RvcklkLCAnZ2F0ZS5yZXZpZXcucmVqZWN0JykpXG4gICAgKSB7XG4gICAgICB0aHJvdyBuZXcgUGVybWlzc2lvbkRlbmllZEVycm9yKCdnYXRlLnJldmlldy5yZWplY3QnLCBpbnB1dC5hY3RvcklkKTtcbiAgICB9XG4gICAgaWYgKGl0ZW0uc3RhdGUgIT09ICdpbl9yZXZpZXcnKSB7XG4gICAgICB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcihgcmV2aWV3IHJlamVjdGlvbiBhcHBsaWVzIHRvIGluX3JldmlldyBpdGVtcywgbm90ICR7aXRlbS5zdGF0ZX1gKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuZGIudHJhbnNhY3Rpb24oYXN5bmMgKHR4KSA9PiB7XG4gICAgICBhd2FpdCB0eC5pbnNlcnQoZ2F0ZURlY2lzaW9ucykudmFsdWVzKHtcbiAgICAgICAgd29ya0l0ZW1JZDogaXRlbS5pZCxcbiAgICAgICAgZ2F0ZTogJ3Jldmlld19hcHByb3ZhbCcsXG4gICAgICAgIGRlY2lzaW9uOiAncmVqZWN0ZWQnLFxuICAgICAgICBhY3RvcklkOiBpbnB1dC5hY3RvcklkLFxuICAgICAgICByb3VuZDogaXRlbS5yZXZpZXdMb29wSXRlcmF0aW9uLFxuICAgICAgfSk7XG4gICAgICBjb25zdCBkZWNpc2lvbkV2ZW50ID0gYXdhaXQgdGhpcy5hcHBlbmRUeCh0eCwgJ3dvcmtfaXRlbScsIGl0ZW0uaWQsICdnYXRlLnJlamVjdGVkJywgaW5wdXQuYWN0b3JJZCwge1xuICAgICAgICBnYXRlOiAncmV2aWV3X2FwcHJvdmFsJyxcbiAgICAgIH0pO1xuXG4gICAgICBpZiAoaXRlbS5yZXZpZXdMb29wSXRlcmF0aW9uID49IFJFVklFV19MT09QX0xJTUlUKSB7XG4gICAgICAgIC8vIFRoZSA2dGggcmVqZWN0aW9uIHBlcmZvcm1zIG5vIGxvb3BiYWNrOiBvdmVybGF5IHJldmlld19ub25fY29udmVyZ2VuY2UsXG4gICAgICAgIC8vIHN0YXRlIGZyb3plbiBhdCBpbl9yZXZpZXcsIGNvdW50ZXIgdW50b3VjaGVkIChDT05GT1JNQU5DRS5tZCBwaW4pLlxuICAgICAgICBhd2FpdCB0eFxuICAgICAgICAgIC51cGRhdGUod29ya0l0ZW1zKVxuICAgICAgICAgIC5zZXQoeyBibG9ja2VkUmVhc29uOiAncmV2aWV3X25vbl9jb252ZXJnZW5jZScsIHN0YXRlVmVyc2lvbjogaXRlbS5zdGF0ZVZlcnNpb24gKyAxIH0pXG4gICAgICAgICAgLndoZXJlKGVxKHdvcmtJdGVtcy5pZCwgaXRlbS5pZCkpO1xuICAgICAgICBhd2FpdCB0aGlzLmFwcGVuZFR4KFxuICAgICAgICAgIHR4LFxuICAgICAgICAgICd3b3JrX2l0ZW0nLFxuICAgICAgICAgIGl0ZW0uaWQsXG4gICAgICAgICAgJ3dvcmtfaXRlbS5ibG9ja2VkJyxcbiAgICAgICAgICB0aGlzLnN5c3RlbUFjdG9ySWQsXG4gICAgICAgICAgeyByZWFzb246ICdyZXZpZXdfbm9uX2NvbnZlcmdlbmNlJyB9LFxuICAgICAgICAgIHsgY2F1c2F0aW9uSWQ6IFN0cmluZyhkZWNpc2lvbkV2ZW50Lmdsb2JhbFNlcSkgfSxcbiAgICAgICAgKTtcbiAgICAgICAgcmV0dXJuIHRoaXMucHVibGljSXRlbSh7XG4gICAgICAgICAgLi4uaXRlbSxcbiAgICAgICAgICBibG9ja2VkUmVhc29uOiAncmV2aWV3X25vbl9jb252ZXJnZW5jZScsXG4gICAgICAgICAgc3RhdGVWZXJzaW9uOiBpdGVtLnN0YXRlVmVyc2lvbiArIDEsXG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICAvLyBcdTAwQTcxLjI6IHRoZSBsb29wYmFjayBpcyBhIHN5c3RlbSBlZmZlY3QgXHUyMDE0IG5vIGNsYWltLWhvbGRlciBwYXJ0aWNpcGF0aW9uLlxuICAgICAgYXdhaXQgdHhcbiAgICAgICAgLnVwZGF0ZSh3b3JrSXRlbXMpXG4gICAgICAgIC5zZXQoeyByZXZpZXdMb29wSXRlcmF0aW9uOiBpdGVtLnJldmlld0xvb3BJdGVyYXRpb24gKyAxIH0pXG4gICAgICAgIC53aGVyZShlcSh3b3JrSXRlbXMuaWQsIGl0ZW0uaWQpKTtcbiAgICAgIGNvbnN0IGJ1bXBlZCA9IHsgLi4uaXRlbSwgcmV2aWV3TG9vcEl0ZXJhdGlvbjogaXRlbS5yZXZpZXdMb29wSXRlcmF0aW9uICsgMSB9O1xuICAgICAgcmV0dXJuIHRoaXMuZXhlY3V0ZVRyYW5zaXRpb25UeChcbiAgICAgICAgdHgsXG4gICAgICAgIGJ1bXBlZCxcbiAgICAgICAgJ2luX3Byb2dyZXNzJyxcbiAgICAgICAgdGhpcy5zeXN0ZW1BY3RvcklkLFxuICAgICAgICB1bmRlZmluZWQsXG4gICAgICAgIFN0cmluZyhkZWNpc2lvbkV2ZW50Lmdsb2JhbFNlcSksXG4gICAgICApO1xuICAgIH0pO1xuICB9XG5cbiAgLy8gLS0gZGlzcGF0Y2ggKHJvYWRtYXAgXHUwMEE3Mi4zKSAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIGFzeW5jIGdldFRhc2tDb250ZXh0KGlucHV0OiB7IHdvcmtJdGVtSWQ6IHN0cmluZyB9KTogUHJvbWlzZTx7IHdvcmtJdGVtOiBXb3JrSXRlbTsgZW50cnlTdGF0ZTogV29ya0l0ZW1TdGF0ZSB9PiB7XG4gICAgY29uc3QgaXRlbSA9IGF3YWl0IHRoaXMubXVzdEdldEl0ZW0oaW5wdXQud29ya0l0ZW1JZCk7XG4gICAgaWYgKGl0ZW0uc3RhdGUgPT09ICdkb25lJykge1xuICAgICAgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoJ2RvbmUgaXRlbXMgYXJlIG5ldmVyIHJlLWRpc3BhdGNoZWQ7IGZvbGxvdy11cCByZXZpZXcgaXMgYSBuZXcgd29yayBpdGVtJyk7XG4gICAgfVxuICAgIGNvbnN0IGZlYXR1cmUgPSBhd2FpdCB0aGlzLmdldEZlYXR1cmVSb3coaXRlbS5mZWF0dXJlSWQpO1xuICAgIGlmIChmZWF0dXJlPy5kaXNwYXRjaEhvbGQpIHtcbiAgICAgIHRocm93IG5ldyBHdWFyZEZhaWxlZEVycm9yKCdmZWF0dXJlIGlzIHVuZGVyIGEgZG9uZV9jaGVja3BvaW50IGRpc3BhdGNoIGhvbGQnKTtcbiAgICB9XG4gICAgcmV0dXJuIHsgd29ya0l0ZW06IHRoaXMucHVibGljSXRlbShpdGVtKSwgZW50cnlTdGF0ZTogaXRlbS5zdGF0ZSBhcyBXb3JrSXRlbVN0YXRlIH07XG4gIH1cblxuICBhc3luYyByZWxlYXNlRGlzcGF0Y2hIb2xkKGlucHV0OiB7IGZlYXR1cmVJZDogc3RyaW5nOyBhY3RvcklkOiBzdHJpbmcgfSk6IFByb21pc2U8RmVhdHVyZT4ge1xuICAgIGF3YWl0IHRoaXMucmVxdWlyZVBlcm1pc3Npb24oaW5wdXQuYWN0b3JJZCwgJ2Rpc3BhdGNoLnJlbGVhc2VfaG9sZCcpO1xuICAgIGNvbnN0IGZlYXR1cmUgPSBhd2FpdCB0aGlzLmdldEZlYXR1cmVSb3coaW5wdXQuZmVhdHVyZUlkKTtcbiAgICBpZiAoIWZlYXR1cmUpIHRocm93IG5ldyBHdWFyZEZhaWxlZEVycm9yKGB1bmtub3duIGZlYXR1cmU6ICR7aW5wdXQuZmVhdHVyZUlkfWApO1xuICAgIHJldHVybiB0aGlzLmRiLnRyYW5zYWN0aW9uKGFzeW5jICh0eCkgPT4ge1xuICAgICAgYXdhaXQgdHgudXBkYXRlKGZlYXR1cmVzKS5zZXQoeyBkaXNwYXRjaEhvbGQ6IGZhbHNlIH0pLndoZXJlKGVxKGZlYXR1cmVzLmlkLCBmZWF0dXJlLmlkKSk7XG4gICAgICBhd2FpdCB0aGlzLmFwcGVuZFR4KHR4LCAnZmVhdHVyZScsIGZlYXR1cmUuaWQsICdmZWF0dXJlLmRpc3BhdGNoX2hvbGRfcmVsZWFzZWQnLCBpbnB1dC5hY3RvcklkLCB7fSk7XG4gICAgICByZXR1cm4gdGhpcy5wdWJsaWNGZWF0dXJlKHsgLi4uZmVhdHVyZSwgZGlzcGF0Y2hIb2xkOiBmYWxzZSB9KTtcbiAgICB9KTtcbiAgfVxuXG4gIC8vIC0tIHJlY29uY2lsaWF0aW9uIChyb2FkbWFwIFx1MDBBNzEuNiwgRDY6IGRldGVjdC1vbmx5LCBuZXZlciBtdXRhdGVzKSAtLS0tLS0tLS0tLS1cblxuICBhc3luYyByZWNvbmNpbGUoaW5wdXQ6IHtcbiAgICBmaWxlczogQXJyYXk8eyB3b3JrSXRlbUlkOiBzdHJpbmc7IGZyb250bWF0dGVyU3RhdHVzOiBzdHJpbmcgfT47XG4gIH0pOiBQcm9taXNlPERpdmVyZ2VuY2VSZXBvcnRbXT4ge1xuICAgIGNvbnN0IHJlcG9ydHM6IERpdmVyZ2VuY2VSZXBvcnRbXSA9IFtdO1xuICAgIGZvciAoY29uc3QgZmlsZSBvZiBpbnB1dC5maWxlcykge1xuICAgICAgY29uc3QgaXRlbSA9IGF3YWl0IHRoaXMubXVzdEdldEl0ZW0oZmlsZS53b3JrSXRlbUlkKTtcbiAgICAgIC8vIEZpbGVzIHVuZGVyIGEgbGl2ZSBjbGFpbSBhcmUgZXhjbHVkZWQgXHUyMDE0IHBsYXlib29rcyBsZWdpdGltYXRlbHkgd3JpdGVcbiAgICAgIC8vIGZyb250bWF0dGVyIG1pZC1ydW4gKFx1MDBBNzEuNikuXG4gICAgICBpZiAoKGF3YWl0IHRoaXMubGl2ZUNsYWltKGl0ZW0uaWQpKSAhPT0gbnVsbCkgY29udGludWU7XG5cbiAgICAgIGNvbnN0IHJhdyA9IGZpbGUuZnJvbnRtYXR0ZXJTdGF0dXMudHJpbSgpO1xuICAgICAgY29uc3QgZGJTdGF0ZSA9IGl0ZW0uc3RhdGUgYXMgV29ya0l0ZW1TdGF0ZTtcbiAgICAgIGlmIChyYXcgPT09ICdibG9ja2VkJykge1xuICAgICAgICAvLyBEODogb3ZlcmxheSBpbiB0aGUgREIgYW5kIGBzdGF0dXM6IGJsb2NrZWRgIGluIHRoZSBmaWxlIGFyZSB0aGVcbiAgICAgICAgLy8gc2FtZSB0cnV0aC4gQmxvY2tlZC1pbi1maWxlIHdpdGggTk8gb3ZlcmxheSBpcyByZWFsIGRyaWZ0LlxuICAgICAgICBpZiAoaXRlbS5ibG9ja2VkUmVhc29uICE9PSBudWxsKSBjb250aW51ZTtcbiAgICAgICAgcmVwb3J0cy5wdXNoKHsgd29ya0l0ZW1JZDogaXRlbS5pZCwgZmlsZVN0YXRlOiByYXcsIGRiU3RhdGUsIGtpbmQ6ICdjb25mbGljdCcgfSk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBub3JtYWxpemVkID0gTEVHQUNZX1NUQVRVU1tyYXddO1xuICAgICAgaWYgKG5vcm1hbGl6ZWQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXBvcnRzLnB1c2goeyB3b3JrSXRlbUlkOiBpdGVtLmlkLCBmaWxlU3RhdGU6IHJhdywgZGJTdGF0ZSwga2luZDogJ2NvbmZsaWN0JyB9KTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBpZiAobm9ybWFsaXplZCA9PT0gZGJTdGF0ZSkgY29udGludWU7XG4gICAgICByZXBvcnRzLnB1c2goe1xuICAgICAgICB3b3JrSXRlbUlkOiBpdGVtLmlkLFxuICAgICAgICBmaWxlU3RhdGU6IHJhdyxcbiAgICAgICAgZGJTdGF0ZSxcbiAgICAgICAga2luZDogUkFOS1tub3JtYWxpemVkXSA+IFJBTktbZGJTdGF0ZV0gPyAnZmlsZV9haGVhZCcgOiAnZGJfYWhlYWQnLFxuICAgICAgfSk7XG4gICAgfVxuICAgIHJldHVybiByZXBvcnRzO1xuICB9XG5cbiAgLy8gLS0gcXVlcmllcyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICBhc3luYyBnZXRXb3JrSXRlbShpZDogc3RyaW5nKTogUHJvbWlzZTxXb3JrSXRlbT4ge1xuICAgIHJldHVybiB0aGlzLnB1YmxpY0l0ZW0oYXdhaXQgdGhpcy5tdXN0R2V0SXRlbShpZCkpO1xuICB9XG5cbiAgYXN5bmMgZ2V0RmVhdHVyZShpZDogc3RyaW5nKTogUHJvbWlzZTxGZWF0dXJlPiB7XG4gICAgY29uc3QgZmVhdHVyZSA9IGF3YWl0IHRoaXMuZ2V0RmVhdHVyZVJvdyhpZCk7XG4gICAgaWYgKCFmZWF0dXJlKSB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcihgdW5rbm93biBmZWF0dXJlOiAke2lkfWApO1xuICAgIHJldHVybiB0aGlzLnB1YmxpY0ZlYXR1cmUoZmVhdHVyZSk7XG4gIH1cblxuICBhc3luYyBsaXN0V29ya0l0ZW1zKGZpbHRlcj86IHtcbiAgICBzdGF0ZT86IFdvcmtJdGVtU3RhdGU7XG4gICAgZmVhdHVyZUlkPzogc3RyaW5nO1xuICAgIGNsYWltYWJsZT86IGJvb2xlYW47XG4gIH0pOiBQcm9taXNlPFdvcmtJdGVtW10+IHtcbiAgICBjb25zdCByb3dzID0gYXdhaXQgdGhpcy5kYi5zZWxlY3QoKS5mcm9tKHdvcmtJdGVtcykub3JkZXJCeShhc2Mod29ya0l0ZW1zLnNlcSkpO1xuICAgIGNvbnN0IHJlc3VsdDogV29ya0l0ZW1bXSA9IFtdO1xuICAgIGZvciAoY29uc3Qgcm93IG9mIHJvd3MpIHtcbiAgICAgIGlmIChmaWx0ZXI/LnN0YXRlICE9PSB1bmRlZmluZWQgJiYgcm93LnN0YXRlICE9PSBmaWx0ZXIuc3RhdGUpIGNvbnRpbnVlO1xuICAgICAgaWYgKGZpbHRlcj8uZmVhdHVyZUlkICE9PSB1bmRlZmluZWQgJiYgcm93LmZlYXR1cmVJZCAhPT0gZmlsdGVyLmZlYXR1cmVJZCkgY29udGludWU7XG4gICAgICBpZiAoZmlsdGVyPy5jbGFpbWFibGUgPT09IHRydWUgJiYgKGF3YWl0IHRoaXMubGl2ZUNsYWltKHJvdy5pZCkpICE9PSBudWxsKSBjb250aW51ZTtcbiAgICAgIHJlc3VsdC5wdXNoKHRoaXMucHVibGljSXRlbShyb3cpKTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIGFzeW5jIGdldENsYWltcyh3b3JrSXRlbUlkOiBzdHJpbmcpOiBQcm9taXNlPENsYWltW10+IHtcbiAgICBjb25zdCBpdGVtID0gYXdhaXQgdGhpcy5tdXN0R2V0SXRlbSh3b3JrSXRlbUlkKTtcbiAgICBjb25zdCByb3dzID0gYXdhaXQgdGhpcy5kYlxuICAgICAgLnNlbGVjdCgpXG4gICAgICAuZnJvbShjbGFpbXMpXG4gICAgICAud2hlcmUoZXEoY2xhaW1zLndvcmtJdGVtSWQsIGl0ZW0uaWQpKVxuICAgICAgLm9yZGVyQnkoYXNjKGNsYWltcy5zZXEpKTtcbiAgICByZXR1cm4gcm93cy5tYXAoKHJvdykgPT4gdGhpcy5wdWJsaWNDbGFpbShyb3cpKTtcbiAgfVxuXG4gIGFzeW5jIGV2ZW50cyhzdHJlYW1JZD86IHN0cmluZyk6IFByb21pc2U8U3BpbmVFdmVudFtdPiB7XG4gICAgY29uc3Qgcm93cyA9XG4gICAgICBzdHJlYW1JZCA9PT0gdW5kZWZpbmVkXG4gICAgICAgID8gYXdhaXQgdGhpcy5kYi5zZWxlY3QoKS5mcm9tKGV2ZW50cykub3JkZXJCeShhc2MoZXZlbnRzLmdsb2JhbFNlcSkpXG4gICAgICAgIDogYXdhaXQgdGhpcy5kYi5zZWxlY3QoKS5mcm9tKGV2ZW50cykud2hlcmUoZXEoZXZlbnRzLnN0cmVhbUlkLCBzdHJlYW1JZCkpLm9yZGVyQnkoYXNjKGV2ZW50cy5nbG9iYWxTZXEpKTtcbiAgICByZXR1cm4gcm93cy5tYXAoKHJvdykgPT4gdGhpcy5ldmVudEZyb21Sb3cocm93KSk7XG4gIH1cbn1cbiIsICIvKipcbiAqIFN5bmNocm9ub3VzIGZhY2FkZSBvdmVyIHRoZSBhc3luYyBQZ0VuZ2luZSBydW5uaW5nIGluIGEgc3luY2tpdCB3b3JrZXIuXG4gKiBJbXBsZW1lbnRzIHRoZSBleGFjdCBAb2Focy9jb3JlIFNwaW5lRW5naW5lIGludGVyZmFjZSwgc28gdGhlIGNvbmZvcm1hbmNlXG4gKiBzdWl0ZSBkcml2ZXMgUG9zdGdyZXMgdGhyb3VnaCB0aGUgc2FtZSBjYWxscyBpdCBkcml2ZXMgdGhlIG1lbW9yeSBlbmdpbmUuXG4gKi9cbmltcG9ydCB7IGNyZWF0ZVJlcXVpcmUgfSBmcm9tICdub2RlOm1vZHVsZSc7XG5pbXBvcnQgeyBkaXJuYW1lLCBqb2luIH0gZnJvbSAnbm9kZTpwYXRoJztcbmltcG9ydCB7IGZpbGVVUkxUb1BhdGggfSBmcm9tICdub2RlOnVybCc7XG5pbXBvcnQgeyBjcmVhdGVTeW5jRm4gfSBmcm9tICdzeW5ja2l0JztcblxuaW1wb3J0IHtcbiAgQ29uZmxpY3RFcnJvcixcbiAgR3VhcmRGYWlsZWRFcnJvcixcbiAgSW52YWxpZFRyYW5zaXRpb25FcnJvcixcbiAgUGVybWlzc2lvbkRlbmllZEVycm9yLFxuICBTdG9yaWVzVmFsaWRhdGlvbkVycm9yLFxuICB0eXBlIFNwaW5lRW5naW5lLFxufSBmcm9tICdAb2Focy9jb3JlJztcblxuY29uc3QgaGVyZSA9IGRpcm5hbWUoZmlsZVVSTFRvUGF0aChpbXBvcnQubWV0YS51cmwpKTtcbmNvbnN0IHdvcmtlclBhdGggPSBqb2luKGhlcmUsICcuLicsICdkaXN0JywgJ3dvcmtlci5tanMnKTtcblxudHlwZSBXaXJlUmVzdWx0ID1cbiAgfCB7IG9rOiB0cnVlOyB2YWx1ZTogdW5rbm93biB9XG4gIHwgeyBvazogZmFsc2U7IGVycm9yOiB7IG5hbWU6IHN0cmluZzsgbWVzc2FnZTogc3RyaW5nIH0gfTtcblxuY29uc3QgY2FsbFdvcmtlciA9IGNyZWF0ZVN5bmNGbih3b3JrZXJQYXRoKSBhcyAob3A6IHVua25vd24pID0+IFdpcmVSZXN1bHQ7XG5cbmNvbnN0IEVSUk9SX0NMQVNTRVM6IFJlY29yZDxzdHJpbmcsIG5ldyAoLi4uYXJnczogbmV2ZXJbXSkgPT4gRXJyb3I+ID0ge1xuICBDb25mbGljdEVycm9yOiBDb25mbGljdEVycm9yIGFzIG5ldmVyLFxuICBHdWFyZEZhaWxlZEVycm9yOiBHdWFyZEZhaWxlZEVycm9yIGFzIG5ldmVyLFxuICBJbnZhbGlkVHJhbnNpdGlvbkVycm9yOiBJbnZhbGlkVHJhbnNpdGlvbkVycm9yIGFzIG5ldmVyLFxuICBQZXJtaXNzaW9uRGVuaWVkRXJyb3I6IFBlcm1pc3Npb25EZW5pZWRFcnJvciBhcyBuZXZlcixcbiAgU3Rvcmllc1ZhbGlkYXRpb25FcnJvcjogU3Rvcmllc1ZhbGlkYXRpb25FcnJvciBhcyBuZXZlcixcbn07XG5cbmZ1bmN0aW9uIHJldGhyb3coZXJyb3I6IHsgbmFtZTogc3RyaW5nOyBtZXNzYWdlOiBzdHJpbmcgfSk6IG5ldmVyIHtcbiAgY29uc3QgQ2xzID0gRVJST1JfQ0xBU1NFU1tlcnJvci5uYW1lXTtcbiAgaWYgKENscykge1xuICAgIC8vIFJlY29uc3RydWN0IHdpdGggdGhlIHdpcmUgbWVzc2FnZTogdGhlIGNvbmZvcm1hbmNlIHN1aXRlIG1hdGNoZXNcbiAgICAvLyBjbGFzc2VzLCBub3QgY29uc3RydWN0b3IgYXJndW1lbnRzLlxuICAgIGNvbnN0IGluc3RhbmNlID0gT2JqZWN0LmNyZWF0ZShDbHMucHJvdG90eXBlKSBhcyBFcnJvcjtcbiAgICBpbnN0YW5jZS5tZXNzYWdlID0gZXJyb3IubWVzc2FnZTtcbiAgICBpbnN0YW5jZS5uYW1lID0gZXJyb3IubmFtZTtcbiAgICB0aHJvdyBpbnN0YW5jZTtcbiAgfVxuICB0aHJvdyBuZXcgRXJyb3IoYCR7ZXJyb3IubmFtZX06ICR7ZXJyb3IubWVzc2FnZX1gKTtcbn1cblxuZnVuY3Rpb24gdW53cmFwKHJlc3VsdDogV2lyZVJlc3VsdCk6IHVua25vd24ge1xuICBpZiAocmVzdWx0Lm9rKSByZXR1cm4gcmVzdWx0LnZhbHVlO1xuICByZXRocm93KHJlc3VsdC5lcnJvcik7XG59XG5cbmNvbnN0IE1FVEhPRFM6IEFycmF5PGtleW9mIFNwaW5lRW5naW5lPiA9IFtcbiAgJ2NyZWF0ZUFjdG9yJyxcbiAgJ2dyYW50JyxcbiAgJ3Jldm9rZScsXG4gICdjcmVhdGVGZWF0dXJlJyxcbiAgJ2NyZWF0ZVdvcmtJdGVtJyxcbiAgJ2ltcG9ydFN0b3JpZXMnLFxuICAnY2xhaW1UYXNrJyxcbiAgJ2hlYXJ0YmVhdCcsXG4gICdyZWxlYXNlQ2xhaW0nLFxuICAnYWR2YW5jZUNsb2NrJyxcbiAgJ2FkdmFuY2VTdGF0ZScsXG4gICdibG9ja1Rhc2snLFxuICAndW5ibG9ja1Rhc2snLFxuICAnc3VibWl0RXZpZGVuY2UnLFxuICAnYXBwcm92ZUdhdGUnLFxuICAncmVqZWN0R2F0ZScsXG4gICdnZXRUYXNrQ29udGV4dCcsXG4gICdyZWxlYXNlRGlzcGF0Y2hIb2xkJyxcbiAgJ3JlY29uY2lsZScsXG4gICdzZXRHb3Zlcm5hbmNlUm9sZScsXG4gICdnZXRHb3Zlcm5hbmNlUm9sZScsXG4gICdhc3NpZ25Sb2xlJyxcbiAgJ3Jldm9rZVJvbGUnLFxuICAnbGlzdFJvbGVBc3NpZ25tZW50cycsXG4gICdzZXRQbGFuJyxcbiAgJ2dldFBsYW4nLFxuICAnc2V0V29ya3NwYWNlUG9saWN5JyxcbiAgJ2dldFdvcmtzcGFjZVBvbGljeScsXG4gICdzZXRHYXRlUG9saWN5JyxcbiAgJ2dldEdhdGVQb2xpY3knLFxuICAnYXV0aHpFeHBsYWluJyxcbiAgJ2dldFdvcmtJdGVtJyxcbiAgJ2dldEZlYXR1cmUnLFxuICAnZ2V0Q2xhaW1zJyxcbiAgJ2xpc3RXb3JrSXRlbXMnLFxuICAnZXZlbnRzJyxcbl07XG5cbmV4cG9ydCBpbnRlcmZhY2UgUGdTeW5jRW5naW5lT3B0aW9ucyB7XG4gIC8qKlxuICAgKiBEaXJlY3RvcnkgZm9yIGEgRFVSQUJMRSBQR2xpdGUgZGF0YWJhc2UgKHN0b3J5IDEzLCBgb2FocyBzZXJ2ZSAtLWRhdGFgKS5cbiAgICogT21pdHRlZCBcdTIxOTIgaW4tbWVtb3J5IGRhdGFiYXNlLCB0cnVuY2F0ZWQgcGVyIGVuZ2luZSAoY29uZm9ybWFuY2UgbW9kZSkuXG4gICAqL1xuICBkYXRhRGlyPzogc3RyaW5nO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlUGdTeW5jRW5naW5lKG9wdGlvbnM/OiBQZ1N5bmNFbmdpbmVPcHRpb25zKTogU3BpbmVFbmdpbmUge1xuICBjb25zdCBjcmVhdGVkID0gdW53cmFwKFxuICAgIGNhbGxXb3JrZXIoe1xuICAgICAgb3A6ICduZXcnLFxuICAgICAgLi4uKG9wdGlvbnM/LmRhdGFEaXIgIT09IHVuZGVmaW5lZCA/IHsgZGF0YURpcjogb3B0aW9ucy5kYXRhRGlyIH0gOiB7fSksXG4gICAgfSksXG4gICkgYXMgeyBlbmdpbmVJZDogbnVtYmVyIH07XG4gIGNvbnN0IGVuZ2luZUlkID0gY3JlYXRlZC5lbmdpbmVJZDtcbiAgY29uc3QgcHJveHk6IFJlY29yZDxzdHJpbmcsIHVua25vd24+ID0ge307XG4gIGZvciAoY29uc3QgbWV0aG9kIG9mIE1FVEhPRFMpIHtcbiAgICBwcm94eVttZXRob2RdID0gKC4uLmFyZ3M6IHVua25vd25bXSkgPT5cbiAgICAgIHVud3JhcChjYWxsV29ya2VyKHsgb3A6ICdjYWxsJywgZW5naW5lSWQsIG1ldGhvZCwgYXJncyB9KSk7XG4gIH1cbiAgcmV0dXJuIHByb3h5IGFzIHVua25vd24gYXMgU3BpbmVFbmdpbmU7XG59XG5cbi8vIGNyZWF0ZVJlcXVpcmUga2VwdCBmb3IgZnV0dXJlIG5hdGl2ZS1wZyBwYXRoIHJlc29sdXRpb247IGhhcm1sZXNzIGlmIHVudXNlZC5cbmV4cG9ydCBjb25zdCBfcmVxdWlyZSA9IGNyZWF0ZVJlcXVpcmUoaW1wb3J0Lm1ldGEudXJsKTtcbiIsICIvKipcbiAqIEhhbmQtbWFpbnRhaW5lZCBEREwgbWF0Y2hpbmcgc2NoZW1hLnRzIDEtMSAoZHJpenpsZS1raXQgbWlncmF0aW9uIHBpcGVsaW5lXG4gKiBpcyBsYXRlciBkZWJ0KS4gUnVucyBvbiBQR2xpdGUgaW4gdGhlIGNvbmZvcm1hbmNlIGhhcm5lc3Mgd29ya2VyLlxuICovXG5leHBvcnQgY29uc3QgU0NIRU1BX1NRTCA9IGBcbkNSRUFURSBUQUJMRSBJRiBOT1QgRVhJU1RTIGFjdG9ycyAoXG4gIGlkIFRFWFQgUFJJTUFSWSBLRVksXG4gIHR5cGUgVEVYVCBOT1QgTlVMTCxcbiAgZGlzcGxheV9uYW1lIFRFWFQgTk9UIE5VTEwsXG4gIGdvdmVybmFuY2Vfcm9sZSBURVhUIE5PVCBOVUxMIERFRkFVTFQgJ21lbWJlcidcbik7XG5cbi0tIFBoYXNlIDIgdXBncmFkZSBwYXRoIGZvciBkdXJhYmxlIGRhdGEgZGlycyBjcmVhdGVkIHVuZGVyIFBoYXNlIDEgKHN0b3J5IDEzKS5cbkFMVEVSIFRBQkxFIGFjdG9ycyBBREQgQ09MVU1OIElGIE5PVCBFWElTVFMgZ292ZXJuYW5jZV9yb2xlIFRFWFQgTk9UIE5VTEwgREVGQVVMVCAnbWVtYmVyJztcblxuQ1JFQVRFIFRBQkxFIElGIE5PVCBFWElTVFMgZ3JhbnRzIChcbiAgYWN0b3JfaWQgVEVYVCBOT1QgTlVMTCxcbiAgcGVybWlzc2lvbiBURVhUIE5PVCBOVUxMLFxuICBzY29wZSBURVhULFxuICBQUklNQVJZIEtFWSAoYWN0b3JfaWQsIHBlcm1pc3Npb24pXG4pO1xuXG5DUkVBVEUgVEFCTEUgSUYgTk9UIEVYSVNUUyByb2xlX2Fzc2lnbm1lbnRzIChcbiAgc2VxIFNFUklBTCBQUklNQVJZIEtFWSxcbiAgYWN0b3JfaWQgVEVYVCBOT1QgTlVMTCxcbiAgcm9sZV9jb2RlIFRFWFQgTk9UIE5VTEwsXG4gIGdyYW50ZWRfYnkgVEVYVCBOT1QgTlVMTCxcbiAgcmV2b2tlZCBCT09MRUFOIE5PVCBOVUxMIERFRkFVTFQgRkFMU0Vcbik7XG5cbkNSRUFURSBUQUJMRSBJRiBOT1QgRVhJU1RTIHdvcmtzcGFjZV9zdGF0ZSAoXG4gIGlkIFRFWFQgUFJJTUFSWSBLRVksXG4gIHBsYW4gVEVYVCBOT1QgTlVMTCxcbiAgcGxhbl92ZXJzaW9uIElOVEVHRVIgTk9UIE5VTEwgREVGQVVMVCAxLFxuICBwb2xpY3kgSlNPTkIgTk9UIE5VTEwgREVGQVVMVCAne30nOjpqc29uYixcbiAgcG9saWN5X3ZlcnNpb24gSU5URUdFUiBOT1QgTlVMTCBERUZBVUxUIDFcbik7XG5cbkNSRUFURSBUQUJMRSBJRiBOT1QgRVhJU1RTIGdhdGVfcG9saWNpZXMgKFxuICBnYXRlIFRFWFQgUFJJTUFSWSBLRVksXG4gIHBvbGljeSBKU09OQiBOT1QgTlVMTFxuKTtcblxuQ1JFQVRFIFRBQkxFIElGIE5PVCBFWElTVFMgZmVhdHVyZXMgKFxuICBpZCBURVhUIFBSSU1BUlkgS0VZLFxuICBzZXEgU0VSSUFMIE5PVCBOVUxMLFxuICBzdGF0ZSBURVhUIE5PVCBOVUxMLFxuICBkaXNwYXRjaF9ob2xkIEJPT0xFQU4gTk9UIE5VTEwgREVGQVVMVCBGQUxTRVxuKTtcblxuQ1JFQVRFIFRBQkxFIElGIE5PVCBFWElTVFMgd29ya19pdGVtcyAoXG4gIGlkIFRFWFQgUFJJTUFSWSBLRVksXG4gIHNlcSBTRVJJQUwgTk9UIE5VTEwsXG4gIGZlYXR1cmVfaWQgVEVYVCBOT1QgTlVMTCxcbiAgZXh0ZXJuYWxfa2V5IFRFWFQgTk9UIE5VTEwsXG4gIHRpdGxlIFRFWFQgTk9UIE5VTEwsXG4gIHN0YXRlIFRFWFQgTk9UIE5VTEwsXG4gIGJsb2NrZWRfcmVhc29uIFRFWFQsXG4gIHJldmlld19sb29wX2l0ZXJhdGlvbiBJTlRFR0VSIE5PVCBOVUxMIERFRkFVTFQgMCxcbiAgaW50ZW50X2hhc2ggVEVYVCxcbiAgcGlubmVkX3ZlcmlmaWNhdGlvbiBKU09OQixcbiAgc3BlY19jaGVja3BvaW50IEJPT0xFQU4gTk9UIE5VTEwgREVGQVVMVCBGQUxTRSxcbiAgZG9uZV9jaGVja3BvaW50IEJPT0xFQU4gTk9UIE5VTEwgREVGQVVMVCBGQUxTRSxcbiAgaW52b2tlX2Rldl93aXRoIFRFWFQgTk9UIE5VTEwgREVGQVVMVCAnJyxcbiAgc3BlY19wYXRoIFRFWFQgTk9UIE5VTEwsXG4gIHN0YXRlX3ZlcnNpb24gSU5URUdFUiBOT1QgTlVMTCBERUZBVUxUIDAsXG4gIGRlcGVuZHNfb24gSlNPTkIgTk9UIE5VTEwgREVGQVVMVCAnW10nOjpqc29uYixcbiAgbGFzdF9mZW5jaW5nX3Rva2VuIElOVEVHRVIgTk9UIE5VTEwgREVGQVVMVCAwXG4pO1xuXG5DUkVBVEUgVEFCTEUgSUYgTk9UIEVYSVNUUyBjbGFpbXMgKFxuICBpZCBURVhUIFBSSU1BUlkgS0VZLFxuICBzZXEgU0VSSUFMIE5PVCBOVUxMLFxuICB3b3JrX2l0ZW1faWQgVEVYVCBOT1QgTlVMTCxcbiAgYWN0b3JfaWQgVEVYVCBOT1QgTlVMTCxcbiAgZmVuY2luZ190b2tlbiBJTlRFR0VSIE5PVCBOVUxMLFxuICBsZWFzZV9leHBpcmVzX2F0IEJJR0lOVCBOT1QgTlVMTCxcbiAgcmVsZWFzZWQgQk9PTEVBTiBOT1QgTlVMTCBERUZBVUxUIEZBTFNFLFxuICB0dGxfbXMgQklHSU5UIE5PVCBOVUxMXG4pO1xuXG4tLSByb2FkbWFwIFx1MDBBNzEuMzogb25lIGxpdmUgY2xhaW0gcGVyIHdvcmsgaXRlbSBcdTIwMTQgcmFjZXMgbG9zZSBieSBjb25zdHJhaW50LlxuQ1JFQVRFIFVOSVFVRSBJTkRFWCBJRiBOT1QgRVhJU1RTIGNsYWltc19vbmVfbGl2ZV9wZXJfaXRlbVxuICBPTiBjbGFpbXMgKHdvcmtfaXRlbV9pZCkgV0hFUkUgcmVsZWFzZWQgPSBmYWxzZTtcblxuQ1JFQVRFIFRBQkxFIElGIE5PVCBFWElTVFMgZ2F0ZV9kZWNpc2lvbnMgKFxuICBzZXEgU0VSSUFMIFBSSU1BUlkgS0VZLFxuICB3b3JrX2l0ZW1faWQgVEVYVCBOT1QgTlVMTCxcbiAgZ2F0ZSBURVhUIE5PVCBOVUxMLFxuICBkZWNpc2lvbiBURVhUIE5PVCBOVUxMLFxuICBhY3Rvcl9pZCBURVhUIE5PVCBOVUxMLFxuICByb3VuZCBJTlRFR0VSIE5PVCBOVUxMIERFRkFVTFQgMFxuKTtcblxuLS0gUGhhc2UgMiB1cGdyYWRlIHBhdGggZm9yIGR1cmFibGUgZGF0YSBkaXJzIGNyZWF0ZWQgdW5kZXIgUGhhc2UgMSAoc3RvcnkgMTMpLlxuQUxURVIgVEFCTEUgZ2F0ZV9kZWNpc2lvbnMgQUREIENPTFVNTiBJRiBOT1QgRVhJU1RTIHJvdW5kIElOVEVHRVIgTk9UIE5VTEwgREVGQVVMVCAwO1xuXG5DUkVBVEUgVEFCTEUgSUYgTk9UIEVYSVNUUyBldmlkZW5jZSAoXG4gIHNlcSBTRVJJQUwgUFJJTUFSWSBLRVksXG4gIHdvcmtfaXRlbV9pZCBURVhUIE5PVCBOVUxMLFxuICBraW5kIFRFWFQgTk9UIE5VTEwsXG4gIHBheWxvYWQgSlNPTkIgTk9UIE5VTExcbik7XG5cbkNSRUFURSBUQUJMRSBJRiBOT1QgRVhJU1RTIGV2ZW50cyAoXG4gIGdsb2JhbF9zZXEgU0VSSUFMIFBSSU1BUlkgS0VZLFxuICBzdHJlYW1fdHlwZSBURVhUIE5PVCBOVUxMLFxuICBzdHJlYW1faWQgVEVYVCBOT1QgTlVMTCxcbiAgc3RyZWFtX3NlcSBJTlRFR0VSIE5PVCBOVUxMLFxuICB0eXBlIFRFWFQgTk9UIE5VTEwsXG4gIGFjdG9yX2lkIFRFWFQgTk9UIE5VTEwsXG4gIHBheWxvYWQgSlNPTkIgTk9UIE5VTEwsXG4gIGNhdXNhdGlvbl9pZCBURVhULFxuICBpZGVtcG90ZW5jeV9rZXkgVEVYVFxuKTtcblxuLS0gXHUwMEE3MS41OiBVTklRVUUoc3RyZWFtX2lkLCBzdHJlYW1fc2VxKSBkb3VibGVzIGFzIHRoZSBvcHRpbWlzdGljIGxvY2suXG5DUkVBVEUgVU5JUVVFIElOREVYIElGIE5PVCBFWElTVFMgZXZlbnRzX3N0cmVhbV9pZF9zdHJlYW1fc2VxXG4gIE9OIGV2ZW50cyAoc3RyZWFtX2lkLCBzdHJlYW1fc2VxKTtcblxuQ1JFQVRFIFRBQkxFIElGIE5PVCBFWElTVFMgaWRlbXBvdGVuY3lfa2V5cyAoXG4gIGtleSBURVhUIFBSSU1BUlkgS0VZLFxuICByZXN1bHQgSlNPTkIgTk9UIE5VTExcbik7XG5gO1xuIiwgImV4cG9ydCB7IFBnRW5naW5lIH0gZnJvbSAnLi9wZy1lbmdpbmUuanMnO1xuZXhwb3J0IHsgY3JlYXRlUGdTeW5jRW5naW5lLCB0eXBlIFBnU3luY0VuZ2luZU9wdGlvbnMgfSBmcm9tICcuL3N5bmMtZW5naW5lLmpzJztcbmV4cG9ydCB7IFNDSEVNQV9TUUwgfSBmcm9tICcuL3NjaGVtYS1zcWwuanMnO1xuZXhwb3J0ICogYXMgc2NoZW1hIGZyb20gJy4vc2NoZW1hLmpzJztcbiIsICIvKipcbiAqIEBvYWhzL3J1bm5lciBcdTIwMTQgdGhlIEJZTyB3b3JrZXIgbG9vcCAoUGhhc2UgMSBzdG9yeSAxNCkuXG4gKlxuICogRklYRUQgSU5URVJGQUNFIGJldHdlZW4gdGhlIG9haHMgQ0xJIChgb2FocyB3b3JrYCkgYW5kIHRoZSBydW5uZXIgbGlicmFyeS5cbiAqIFRoZSBDTEkgd2lyZXMgZmxhZ3MvZW52IGludG8gUnVubmVyT3B0aW9ucyBhbmQgY2FsbHMgd29ya0xvb3AvcnVuT25jZTsgYWxsXG4gKiBydW5uZXIgbG9naWMgbGl2ZXMgaGVyZS5cbiAqXG4gKiBDb250cmFjdCAocHJvZHVjdC1yb2FkbWFwLm1kIFx1MDBBNzIuMyk6XG4gKiAgMS4gcG9sbCBsaXN0X3dvcmtfaXRlbXMoc3RhdGU9cmVhZHlfZm9yX2RldiwgY2xhaW1hYmxlKSBcdTIxOTIgY2xhaW1fdGFza1xuICogICAgIChjcmFzaCByZS1kaXNwYXRjaDogYW4gaW5fcHJvZ3Jlc3MgaXRlbSB3aXRoIE5PIGxpdmUgY2xhaW0gaXMgYSBkZWFkXG4gKiAgICAgd29ya2VyJ3MgcnVuIFx1MjAxNCBwb2xsZWQgYXMgYSBmYWxsYmFjayBzbyByZWNvdmVyeSB1c2VzIHRoZSBzYW1lIGxvb3ApXG4gKiAgMi4gd29ya3RyZWUgbmFtZWQgYnkgY2xhaW0gaWQ7IGJyYW5jaCBgY2xhaW0vPGNsYWltSWQ+YFxuICogIDMuIG1pcnJvci1vbi1kaXNwYXRjaDogc3RhbXAgc3BlYyBmcm9udG1hdHRlciB0byB0aGUgREIgZW50cnkgc3RhdGVcbiAqICA0LiBhZHZhbmNlX3N0YXRlKHRvPWluX3Byb2dyZXNzKSBCRUZPUkUgdGhlIGFnZW50IHJ1bnMgXHUyMDE0IERCIGlzIHRoZSBlbnRyeSBzdGF0ZVxuICogIDUuIGludm9rZSB0aGUgY29kaW5nIGFnZW50ICh0ZW1wbGF0ZTsgdW5tb2RpZmllZCBibWFkLWRldi1hdXRvIGNvbnRlbnQpXG4gKiAgNi4gcGFyc2UgSEFMVCArIEF1dG8gUnVuIFJlc3VsdCBcdTIxOTIgaGFsdF9yZXBvcnQgZXZpZGVuY2UgKHZlcmJhdGltKVxuICogIDcuIHJ1biBQSU5ORUQgdmVyaWZpY2F0aW9uIGNvbW1hbmRzIG9ubHkgKGFsbG93bGlzdGVkKSBcdTIxOTIgdGVzdF9ydW4gZXZpZGVuY2VcbiAqICA4LiBwdXNoIGJyYW5jaCBcdTIxOTIgZ2l0X2RpZmYgKyBjb21taXQgZXZpZGVuY2UgKHJlbW90ZSByZWFjaGFiaWxpdHkgbWVhc3VyZWQpXG4gKiAgOS4gYWR2YW5jZV9zdGF0ZSAvIGJsb2NrX3Rhc2sgcGVyIEhBTFQgc3RhdHVzIFx1MjAxNCB0aGUgY29yZSBjb21wdXRlcyB2ZXJkaWN0c1xuICogMTAuIGNyYXNoIHJlY292ZXJ5IG9uIHJlLWNsYWltOiBhZG9wdCBhIGRlY2VudGx5LWZpbmlzaGVkIHdvcmt0cmVlICh0ZXJtaW5hbFxuICogICAgIGZyb250bWF0dGVyICsgYSByZWFsIGNvbW1pdCBwYXN0IGl0cyBiYXNlbGluZSkgd2l0aCBsYXRlIGV2aWRlbmNlXG4gKiAgICAgc3VibWlzc2lvbjsgYSB3cmVja2VkIHdvcmt0cmVlIGlzIGNsZWFuZWQgYW5kIGJsb2NrZWQgYHN0YWxlX3dvcmt0cmVlYC5cbiAqXG4gKiBBZ2VudCBpbnZvY2F0aW9uIGVudmlyb25tZW50IChwYXJ0IG9mIHRoaXMgaW50ZXJmYWNlKTogdGhlIGFnZW50IGNvbW1hbmRcbiAqIHRlbXBsYXRlIGlzIGV4cGFuZGVkICh7U1BFQ19GT0xERVJ9IHtTVE9SWV9JRH0ge0lOVk9LRV9XSVRIfSB7V09SS1RSRUV9KSxcbiAqIHJ1biB3aXRoIGN3ZCA9IHRoZSBjbGFpbSB3b3JrdHJlZSwgYW5kIHJlY2VpdmVzIHR3byBleHRyYSBlbnYgdmFyczpcbiAqICAgT0FIU19TUEVDX0ZJTEUgXHUyMDE0IGFic29sdXRlIHBhdGggb2YgdGhlIHN0b3J5IHNwZWMgZmlsZSBpbnNpZGUgdGhlIHdvcmt0cmVlXG4gKiAgIE9BSFNfU1RPUllfSUQgIFx1MjAxNCB0aGUgd29yayBpdGVtIGV4dGVybmFsS2V5IChzdG9yaWVzLnlhbWwgaWQpXG4gKi9cbmltcG9ydCB7IHNwYXduU3luYyB9IGZyb20gJ25vZGU6Y2hpbGRfcHJvY2Vzcyc7XG5pbXBvcnQge1xuICBleGlzdHNTeW5jLFxuICBta2RpclN5bmMsXG4gIHJlYWRkaXJTeW5jLFxuICByZWFkRmlsZVN5bmMsXG4gIHJtU3luYyxcbiAgc3RhdFN5bmMsXG4gIHdyaXRlRmlsZVN5bmMsXG59IGZyb20gJ25vZGU6ZnMnO1xuaW1wb3J0IHsgam9pbiwgcmVzb2x2ZSB9IGZyb20gJ25vZGU6cGF0aCc7XG5pbXBvcnQgeyBwYXJzZSBhcyBwYXJzZVlhbWwgfSBmcm9tICd5YW1sJztcbmltcG9ydCB0eXBlIHsgT2Foc0NsaWVudCB9IGZyb20gJ0BvYWhzL2NvbnRyYWN0cyc7XG5pbXBvcnQgdHlwZSB7IEJsb2NrZWRSZWFzb24sIENsYWltLCBFdmlkZW5jZSwgV29ya0l0ZW0sIFdvcmtJdGVtU3RhdGUgfSBmcm9tICdAb2Focy9jb3JlJztcblxuZXhwb3J0IGludGVyZmFjZSBSdW5uZXJPcHRpb25zIHtcbiAgY2xpZW50OiBPYWhzQ2xpZW50O1xuICAvKiogQWJzb2x1dGUgcGF0aCBvZiB0aGUgdGFyZ2V0IHByb2plY3QgZ2l0IGNoZWNrb3V0LiAqL1xuICByZXBvUGF0aDogc3RyaW5nO1xuICAvKiogU3BlYyBmb2xkZXIgKHJlbGF0aXZlIHRvIHJlcG8gcm9vdCkgaG9sZGluZyBTUEVDLm1kICsgc3Rvcmllcy55YW1sICsgc3Rvcmllcy8uICovXG4gIHNwZWNGb2xkZXI6IHN0cmluZztcbiAgLyoqXG4gICAqIENvZGluZy1hZ2VudCBjb21tYW5kIHRlbXBsYXRlLiBQbGFjZWhvbGRlcnM6IHtTUEVDX0ZPTERFUn0ge1NUT1JZX0lEfVxuICAgKiB7SU5WT0tFX1dJVEh9IHtXT1JLVFJFRX0uIEV4ZWN1dGVkIHdpdGggY3dkID0gdGhlIGNsYWltIHdvcmt0cmVlLlxuICAgKi9cbiAgYWdlbnRDbWQ6IHN0cmluZztcbiAgLyoqIFBvbGwgaW50ZXJ2YWwgZm9yIHdvcmtMb29wIChtcykuIERlZmF1bHQgMTVfMDAwLiAqL1xuICBwb2xsTXM/OiBudW1iZXI7XG4gIC8qKiBCaW5hcmllcyBwaW5uZWQgdmVyaWZpY2F0aW9uIGNvbW1hbmRzIG1heSBzdGFydCB3aXRoLiAqL1xuICB2ZXJpZmljYXRpb25BbGxvd2xpc3Q/OiBzdHJpbmdbXTtcbiAgLyoqIEdpdCByZW1vdGUgdG8gcHVzaCBjbGFpbSBicmFuY2hlcyB0by4gRGVmYXVsdCAnb3JpZ2luJy4gKi9cbiAgcmVtb3RlPzogc3RyaW5nO1xuICAvKiogVEVTVCBPTkxZOiBkaWUgYXQgYSBzcGVjaWZpYyBwb2ludCB0byBleGVyY2lzZSBjcmFzaCByZWNvdmVyeS4gKi9cbiAgZmFpbHBvaW50PzogJ2JlZm9yZV9yZXBvcnQnO1xuICAvKiogTWF4IHdhbGwgdGltZSBmb3Igb25lIGFnZW50IGludm9jYXRpb24gKG1zKS4gRGVmYXVsdCAzMCBtaW51dGVzLiAqL1xuICBhZ2VudFRpbWVvdXRNcz86IG51bWJlcjtcbiAgLyoqIEV4dHJhIGVudmlyb25tZW50IHZhcmlhYmxlcyBwYXNzZWQgdG8gdGhlIGFnZW50IGludm9jYXRpb24uICovXG4gIGFnZW50RW52PzogUmVjb3JkPHN0cmluZywgc3RyaW5nPjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBSdW5PbmNlUmVzdWx0IHtcbiAgZGlzcGF0Y2hlZDogYm9vbGVhbjtcbiAgd29ya0l0ZW1JZD86IHN0cmluZztcbiAgZXh0ZXJuYWxLZXk/OiBzdHJpbmc7XG4gIG91dGNvbWU/OiAnaW5fcmV2aWV3JyB8ICdibG9ja2VkJyB8ICdhZG9wdGVkX2luX3JldmlldycgfCAnY3Jhc2hlZCc7XG4gIGRldGFpbHM/OiBzdHJpbmc7XG4gIC8qKiBDbGFpbSB0YWtlbiBieSB0aGlzIHJ1biAoYnJhbmNoIGlzIGBjbGFpbS88Y2xhaW1JZD5gKS4gKi9cbiAgY2xhaW1JZD86IHN0cmluZztcbiAgLyoqIFJhdyBldmlkZW5jZSBzdWJtaXR0ZWQgZHVyaW5nIHRoaXMgcnVuLCBpbiBzdWJtaXNzaW9uIG9yZGVyLiAqL1xuICBldmlkZW5jZT86IEV2aWRlbmNlW107XG59XG5cbi8qKiBCaW5hcmllcyBhIHBpbm5lZCB2ZXJpZmljYXRpb24gY29tbWFuZCBtYXkgc3RhcnQgd2l0aCAoZmlyc3QgdG9rZW4pLiAqL1xuZXhwb3J0IGNvbnN0IERFRkFVTFRfVkVSSUZJQ0FUSU9OX0FMTE9XTElTVDogcmVhZG9ubHkgc3RyaW5nW10gPSBbXG4gICdub2RlJyxcbiAgJ25wbScsXG4gICdwbnBtJyxcbiAgJ25weCcsXG4gICdweXRlc3QnLFxuICAncHl0aG9uMycsXG4gICdzaCcsXG4gICdiYXNoJyxcbiAgJ2dpdCcsXG5dO1xuXG4vKiogTWFya2VyIGRyb3BwZWQgaW4gZXZlcnkgY2xhaW0gd29ya3RyZWUgc28gYSBsYXRlciBjbGFpbSBjYW4gbWFwIGl0IGJhY2suICovXG5jb25zdCBNQVJLRVJfRklMRSA9ICcub2Focy13b3JrLWl0ZW0nO1xuXG4vKiogREIgc3RhdGUgXHUyMTkyIHNwZWMtZmlsZSBmcm9udG1hdHRlciB2b2NhYnVsYXJ5IChkZXYtYXV0byBmaWxlIGRpYWxlY3QpLiAqL1xuY29uc3QgRU5UUllfU1RBVFVTOiBSZWFkb25seTxQYXJ0aWFsPFJlY29yZDxXb3JrSXRlbVN0YXRlLCBzdHJpbmc+Pj4gPSB7XG4gIHJlYWR5X2Zvcl9kZXY6ICdyZWFkeS1mb3ItZGV2JyxcbiAgaW5fcHJvZ3Jlc3M6ICdpbi1wcm9ncmVzcycsXG4gIGluX3JldmlldzogJ2luLXJldmlldycsXG59O1xuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIGdpdCBwbHVtYmluZyAoY2hpbGRfcHJvY2VzcyBvbmx5IFx1MjAxNCBubyBleHRlcm5hbCBkZXBzKVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbi8qKiBSdW4gYSBnaXQgY29tbWFuZDsgdGhyb3dzIG9uIG5vbi16ZXJvIGV4aXQ7IHJldHVybnMgdHJpbW1lZCBzdGRvdXQuICovXG5leHBvcnQgZnVuY3Rpb24gZ2l0KGFyZ3M6IHN0cmluZ1tdLCBjd2Q6IHN0cmluZyk6IHN0cmluZyB7XG4gIGNvbnN0IHJlc3VsdCA9IHNwYXduU3luYygnZ2l0JywgYXJncywgeyBjd2QsIGVuY29kaW5nOiAndXRmOCcgfSk7XG4gIGlmIChyZXN1bHQuZXJyb3IpIHRocm93IHJlc3VsdC5lcnJvcjtcbiAgaWYgKHJlc3VsdC5zdGF0dXMgIT09IDApIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICBgZ2l0ICR7YXJncy5qb2luKCcgJyl9IGZhaWxlZCB3aXRoIGV4aXQgJHtTdHJpbmcocmVzdWx0LnN0YXR1cyl9OiAke3Jlc3VsdC5zdGRlcnIudHJpbSgpfWAsXG4gICAgKTtcbiAgfVxuICByZXR1cm4gcmVzdWx0LnN0ZG91dC50cmltKCk7XG59XG5cbi8qKlxuICogS2VlcCBydW5uZXIgYm9va2tlZXBpbmcgb3V0IG9mIGFnZW50IGNvbW1pdHM6IHRoZSBtYXJrZXIgZmlsZSBhbmQgdGhlXG4gKiB3b3JrdHJlZSByb290IGFyZSBhZGRlZCB0byAkR0lUX0NPTU1PTl9ESVIvaW5mby9leGNsdWRlIChzaGFyZWQgYnkgYWxsXG4gKiB3b3JrdHJlZXMpLCBzbyBhbiBhZ2VudCdzIGBnaXQgYWRkIC1BYCBuZXZlciBwaWNrcyB0aGVtIHVwLlxuICovXG5mdW5jdGlvbiBlbnN1cmVHaXRFeGNsdWRlcyhyZXBvUGF0aDogc3RyaW5nKTogdm9pZCB7XG4gIGNvbnN0IGdpdERpciA9IGpvaW4ocmVwb1BhdGgsICcuZ2l0Jyk7XG4gIHRyeSB7XG4gICAgaWYgKCFzdGF0U3luYyhnaXREaXIpLmlzRGlyZWN0b3J5KCkpIHJldHVybjsgLy8gcmVwb1BhdGggaXMgaXRzZWxmIGEgd29ya3RyZWUgXHUyMDE0IHNraXBcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuO1xuICB9XG4gIGNvbnN0IGluZm9EaXIgPSBqb2luKGdpdERpciwgJ2luZm8nKTtcbiAgbWtkaXJTeW5jKGluZm9EaXIsIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xuICBjb25zdCBleGNsdWRlUGF0aCA9IGpvaW4oaW5mb0RpciwgJ2V4Y2x1ZGUnKTtcbiAgY29uc3QgY3VycmVudCA9IGV4aXN0c1N5bmMoZXhjbHVkZVBhdGgpID8gcmVhZEZpbGVTeW5jKGV4Y2x1ZGVQYXRoLCAndXRmOCcpIDogJyc7XG4gIGNvbnN0IHdhbnRlZCA9IFsnLm9haHMvJywgTUFSS0VSX0ZJTEVdO1xuICBjb25zdCBoYXZlID0gbmV3IFNldChjdXJyZW50LnNwbGl0KCdcXG4nKS5tYXAoKGxpbmUpID0+IGxpbmUudHJpbSgpKSk7XG4gIGNvbnN0IG1pc3NpbmcgPSB3YW50ZWQuZmlsdGVyKChsaW5lKSA9PiAhaGF2ZS5oYXMobGluZSkpO1xuICBpZiAobWlzc2luZy5sZW5ndGggPT09IDApIHJldHVybjtcbiAgY29uc3QgcHJlZml4ID0gY3VycmVudCA9PT0gJycgfHwgY3VycmVudC5lbmRzV2l0aCgnXFxuJykgPyBjdXJyZW50IDogYCR7Y3VycmVudH1cXG5gO1xuICB3cml0ZUZpbGVTeW5jKGV4Y2x1ZGVQYXRoLCBgJHtwcmVmaXh9JHttaXNzaW5nLmpvaW4oJ1xcbicpfVxcbmAsICd1dGY4Jyk7XG59XG5cbmZ1bmN0aW9uIHJlbW92ZVdvcmt0cmVlKGRpcjogc3RyaW5nLCByZXBvUGF0aDogc3RyaW5nKTogdm9pZCB7XG4gIHRyeSB7XG4gICAgZ2l0KFsnd29ya3RyZWUnLCAncmVtb3ZlJywgJy0tZm9yY2UnLCBkaXJdLCByZXBvUGF0aCk7XG4gIH0gY2F0Y2gge1xuICAgIHRyeSB7XG4gICAgICBybVN5bmMoZGlyLCB7IHJlY3Vyc2l2ZTogdHJ1ZSwgZm9yY2U6IHRydWUgfSk7XG4gICAgICBnaXQoWyd3b3JrdHJlZScsICdwcnVuZSddLCByZXBvUGF0aCk7XG4gICAgfSBjYXRjaCB7XG4gICAgICAvKiBiZXN0IGVmZm9ydCBcdTIwMTQgYSBsZWZ0b3ZlciBkaXIgaXMgcmUtZGV0ZWN0ZWQgYXMgYSBzdGFsZSB3b3JrdHJlZSAqL1xuICAgIH1cbiAgfVxufVxuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIFdvcmt0cmVlIG1hcmtlciAoY3Jhc2gtcmVjb3ZlcnkgYm9va2tlZXBpbmcpXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuaW50ZXJmYWNlIFdvcmt0cmVlTWFya2VyIHtcbiAgd29ya0l0ZW1JZDogc3RyaW5nO1xuICBjbGFpbUlkOiBzdHJpbmc7XG4gIGJhc2VsaW5lOiBzdHJpbmc7XG4gIC8qKiBIb3cgbWFueSB0aW1lcyBhbiBhZ2VudCB3YXMgaW52b2tlZCBpbnNpZGUgdGhpcyB3b3JrdHJlZS4gKi9cbiAgaW52b2NhdGlvbnM6IG51bWJlcjtcbn1cblxuZnVuY3Rpb24gd3JpdGVNYXJrZXIod29ya3RyZWVEaXI6IHN0cmluZywgbWFya2VyOiBXb3JrdHJlZU1hcmtlcik6IHZvaWQge1xuICB3cml0ZUZpbGVTeW5jKGpvaW4od29ya3RyZWVEaXIsIE1BUktFUl9GSUxFKSwgYCR7SlNPTi5zdHJpbmdpZnkobWFya2VyLCBudWxsLCAyKX1cXG5gLCAndXRmOCcpO1xufVxuXG5mdW5jdGlvbiByZWFkTWFya2VyKHdvcmt0cmVlRGlyOiBzdHJpbmcpOiBXb3JrdHJlZU1hcmtlciB8IG51bGwge1xuICBjb25zdCBwYXRoID0gam9pbih3b3JrdHJlZURpciwgTUFSS0VSX0ZJTEUpO1xuICBpZiAoIWV4aXN0c1N5bmMocGF0aCkpIHJldHVybiBudWxsO1xuICB0cnkge1xuICAgIGNvbnN0IHJhdyA9IEpTT04ucGFyc2UocmVhZEZpbGVTeW5jKHBhdGgsICd1dGY4JykpIGFzIFBhcnRpYWw8V29ya3RyZWVNYXJrZXI+O1xuICAgIGlmICh0eXBlb2YgcmF3LndvcmtJdGVtSWQgIT09ICdzdHJpbmcnIHx8IHR5cGVvZiByYXcuYmFzZWxpbmUgIT09ICdzdHJpbmcnKSByZXR1cm4gbnVsbDtcbiAgICByZXR1cm4ge1xuICAgICAgd29ya0l0ZW1JZDogcmF3LndvcmtJdGVtSWQsXG4gICAgICBjbGFpbUlkOiB0eXBlb2YgcmF3LmNsYWltSWQgPT09ICdzdHJpbmcnID8gcmF3LmNsYWltSWQgOiAnJyxcbiAgICAgIGJhc2VsaW5lOiByYXcuYmFzZWxpbmUsXG4gICAgICBpbnZvY2F0aW9uczogdHlwZW9mIHJhdy5pbnZvY2F0aW9ucyA9PT0gJ251bWJlcicgPyByYXcuaW52b2NhdGlvbnMgOiAwLFxuICAgIH07XG4gIH0gY2F0Y2gge1xuICAgIHJldHVybiBudWxsO1xuICB9XG59XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gU3BlYyBmaWxlIHJlYWRpbmcgKGZyb250bWF0dGVyICsgSEFMVCByZXBvcnQpXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuaW50ZXJmYWNlIFNwZWNSZXBvcnQge1xuICBzdGF0dXM6IHN0cmluZyB8IG51bGw7XG4gIGJsb2NraW5nQ29uZGl0aW9uOiBzdHJpbmcgfCBudWxsO1xuICBhdXRvUnVuUmVzdWx0OiBzdHJpbmcgfCBudWxsO1xufVxuXG5mdW5jdGlvbiBzcGxpdEZyb250bWF0dGVyKHJhdzogc3RyaW5nKTogeyBkYXRhOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPjsgYm9keTogc3RyaW5nIH0ge1xuICBpZiAoIXJhdy5zdGFydHNXaXRoKCctLS0nKSkgcmV0dXJuIHsgZGF0YToge30sIGJvZHk6IHJhdyB9O1xuICBjb25zdCBjbG9zZSA9IHJhdy5pbmRleE9mKCdcXG4tLS0nLCAzKTtcbiAgaWYgKGNsb3NlID09PSAtMSkgcmV0dXJuIHsgZGF0YToge30sIGJvZHk6IHJhdyB9O1xuICBjb25zdCBmaXJzdE5ld2xpbmUgPSByYXcuaW5kZXhPZignXFxuJyk7XG4gIGNvbnN0IGJsb2NrID0gcmF3LnNsaWNlKGZpcnN0TmV3bGluZSArIDEsIGNsb3NlKTtcbiAgY29uc3QgYm9keVN0YXJ0ID0gcmF3LmluZGV4T2YoJ1xcbicsIGNsb3NlICsgMSk7XG4gIGNvbnN0IGJvZHkgPSBib2R5U3RhcnQgPT09IC0xID8gJycgOiByYXcuc2xpY2UoYm9keVN0YXJ0ICsgMSk7XG4gIGxldCBkYXRhOiB1bmtub3duID0ge307XG4gIHRyeSB7XG4gICAgZGF0YSA9IHBhcnNlWWFtbChibG9jayk7XG4gIH0gY2F0Y2gge1xuICAgIGRhdGEgPSB7fTtcbiAgfVxuICBjb25zdCByZWNvcmQgPVxuICAgIHR5cGVvZiBkYXRhID09PSAnb2JqZWN0JyAmJiBkYXRhICE9PSBudWxsICYmICFBcnJheS5pc0FycmF5KGRhdGEpXG4gICAgICA/IChkYXRhIGFzIFJlY29yZDxzdHJpbmcsIHVua25vd24+KVxuICAgICAgOiB7fTtcbiAgcmV0dXJuIHsgZGF0YTogcmVjb3JkLCBib2R5IH07XG59XG5cbi8qKiBWZXJiYXRpbSAnIyMgQXV0byBSdW4gUmVzdWx0JyBzZWN0aW9uIChoZWFkaW5nIGluY2x1ZGVkKSwgdXAgdG8gdGhlIG5leHQgSDIuICovXG5mdW5jdGlvbiBleHRyYWN0QXV0b1J1blJlc3VsdChib2R5OiBzdHJpbmcpOiBzdHJpbmcgfCBudWxsIHtcbiAgY29uc3QgbGluZXMgPSBib2R5LnNwbGl0KCdcXG4nKTtcbiAgY29uc3Qgc3RhcnQgPSBsaW5lcy5maW5kSW5kZXgoKGxpbmUpID0+IC9eIyNcXHMrYXV0byBydW4gcmVzdWx0XFxzKiQvaS50ZXN0KGxpbmUudHJpbSgpKSk7XG4gIGlmIChzdGFydCA9PT0gLTEpIHJldHVybiBudWxsO1xuICBsZXQgZW5kID0gbGluZXMubGVuZ3RoO1xuICBmb3IgKGxldCBpID0gc3RhcnQgKyAxOyBpIDwgbGluZXMubGVuZ3RoOyBpICs9IDEpIHtcbiAgICBjb25zdCBsaW5lID0gbGluZXNbaV07XG4gICAgaWYgKGxpbmUgIT09IHVuZGVmaW5lZCAmJiAvXiMjXFxzKy8udGVzdChsaW5lKSkge1xuICAgICAgZW5kID0gaTtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgfVxuICByZXR1cm4gbGluZXMuc2xpY2Uoc3RhcnQsIGVuZCkuam9pbignXFxuJykudHJpbUVuZCgpO1xufVxuXG5mdW5jdGlvbiByZWFkU3BlY1JlcG9ydChzcGVjQWJzUGF0aDogc3RyaW5nKTogU3BlY1JlcG9ydCB7XG4gIGlmICghZXhpc3RzU3luYyhzcGVjQWJzUGF0aCkpIHtcbiAgICByZXR1cm4geyBzdGF0dXM6IG51bGwsIGJsb2NraW5nQ29uZGl0aW9uOiBudWxsLCBhdXRvUnVuUmVzdWx0OiBudWxsIH07XG4gIH1cbiAgY29uc3QgeyBkYXRhLCBib2R5IH0gPSBzcGxpdEZyb250bWF0dGVyKHJlYWRGaWxlU3luYyhzcGVjQWJzUGF0aCwgJ3V0ZjgnKSk7XG4gIGNvbnN0IHN0YXR1c1JhdyA9IGRhdGFbJ3N0YXR1cyddO1xuICBjb25zdCBzdGF0dXMgPVxuICAgIHR5cGVvZiBzdGF0dXNSYXcgPT09ICdzdHJpbmcnID8gc3RhdHVzUmF3IDogc3RhdHVzUmF3ICE9IG51bGwgPyBTdHJpbmcoc3RhdHVzUmF3KSA6IG51bGw7XG4gIGNvbnN0IGF1dG9SdW5SZXN1bHQgPSBleHRyYWN0QXV0b1J1blJlc3VsdChib2R5KTtcbiAgbGV0IGJsb2NraW5nQ29uZGl0aW9uID1cbiAgICB0eXBlb2YgZGF0YVsnYmxvY2tpbmdfY29uZGl0aW9uJ10gPT09ICdzdHJpbmcnID8gZGF0YVsnYmxvY2tpbmdfY29uZGl0aW9uJ10gOiBudWxsO1xuICBpZiAoYmxvY2tpbmdDb25kaXRpb24gPT09IG51bGwgJiYgYXV0b1J1blJlc3VsdCAhPT0gbnVsbCkge1xuICAgIGNvbnN0IG1hdGNoID0gL15ibG9ja2luZyBjb25kaXRpb246XFxzKiguKykkL2ltLmV4ZWMoYXV0b1J1blJlc3VsdCk7XG4gICAgYmxvY2tpbmdDb25kaXRpb24gPSBtYXRjaD8uWzFdPy50cmltKCkgPz8gbnVsbDtcbiAgfVxuICByZXR1cm4geyBzdGF0dXMsIGJsb2NraW5nQ29uZGl0aW9uLCBhdXRvUnVuUmVzdWx0IH07XG59XG5cbi8qKiBSZXdyaXRlIChvciBpbnNlcnQpIHRoZSBmcm9udG1hdHRlciBgc3RhdHVzOmAgbGluZSwgcHJlc2VydmluZyBldmVyeXRoaW5nIGVsc2UuICovXG5mdW5jdGlvbiBzZXRGcm9udG1hdHRlclN0YXR1cyhzcGVjQWJzUGF0aDogc3RyaW5nLCBzdGF0dXM6IHN0cmluZyk6IHZvaWQge1xuICBjb25zdCByYXcgPSByZWFkRmlsZVN5bmMoc3BlY0Fic1BhdGgsICd1dGY4Jyk7XG4gIGlmIChyYXcuc3RhcnRzV2l0aCgnLS0tJykpIHtcbiAgICBjb25zdCBjbG9zZSA9IHJhdy5pbmRleE9mKCdcXG4tLS0nLCAzKTtcbiAgICBpZiAoY2xvc2UgIT09IC0xKSB7XG4gICAgICBjb25zdCBoZWFkID0gcmF3LnNsaWNlKDAsIGNsb3NlKTtcbiAgICAgIGNvbnN0IHJlc3QgPSByYXcuc2xpY2UoY2xvc2UpO1xuICAgICAgY29uc3QgcmVwbGFjZWQgPSAvXnN0YXR1czouKiQvbS50ZXN0KGhlYWQpXG4gICAgICAgID8gaGVhZC5yZXBsYWNlKC9ec3RhdHVzOi4qJC9tLCBgc3RhdHVzOiAke3N0YXR1c31gKVxuICAgICAgICA6IGAke2hlYWR9XFxuc3RhdHVzOiAke3N0YXR1c31gO1xuICAgICAgd3JpdGVGaWxlU3luYyhzcGVjQWJzUGF0aCwgcmVwbGFjZWQgKyByZXN0LCAndXRmOCcpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgfVxuICB3cml0ZUZpbGVTeW5jKHNwZWNBYnNQYXRoLCBgLS0tXFxuc3RhdHVzOiAke3N0YXR1c31cXG4tLS1cXG4ke3Jhd31gLCAndXRmOCcpO1xufVxuXG5mdW5jdGlvbiBub3JtYWxpemVTdGF0dXMoc3RhdHVzOiBzdHJpbmcgfCBudWxsKTogc3RyaW5nIHwgbnVsbCB7XG4gIGlmIChzdGF0dXMgPT09IG51bGwpIHJldHVybiBudWxsO1xuICBjb25zdCBmbGF0ID0gc3RhdHVzLnRyaW0oKS50b0xvd2VyQ2FzZSgpLnJlcGxhY2VBbGwoJy0nLCAnXycpO1xuICByZXR1cm4gZmxhdCA9PT0gJ3JldmlldycgPyAnaW5fcmV2aWV3JyA6IGZsYXQ7XG59XG5cbi8qKiBkZXYtYXV0byBIQUxUIGJsb2NraW5nIGNvbmRpdGlvbiBcdTIxOTIgQkxPQ0tFRF9SRUFTT05TIHRheG9ub215IChkZWZhdWx0ICdvdGhlcicpLiAqL1xuZnVuY3Rpb24gbWFwQmxvY2tpbmdDb25kaXRpb24oY29uZGl0aW9uOiBzdHJpbmcgfCBudWxsKTogQmxvY2tlZFJlYXNvbiB7XG4gIGlmIChjb25kaXRpb24gPT09IG51bGwpIHJldHVybiAnb3RoZXInO1xuICBjb25zdCBjID0gY29uZGl0aW9uLnRvTG93ZXJDYXNlKCk7XG4gIGlmIChjLmluY2x1ZGVzKCdyZXZpZXcgcmVwYWlyIGxvb3AgZXhjZWVkZWQnKSkgcmV0dXJuICdyZXZpZXdfbm9uX2NvbnZlcmdlbmNlJztcbiAgaWYgKGMuaW5jbHVkZXMoJ3VuY2xlYXIgaW50ZW50JykpIHJldHVybiAndW5jbGVhcl9pbnRlbnQnO1xuICBpZiAoYy5pbmNsdWRlcygnbm8gc3Rvcmllcy55YW1sJykpIHJldHVybiAnbm9fc3Rvcmllc195YW1sX2ZvdW5kJztcbiAgaWYgKGMuaW5jbHVkZXMoJ2FtYmlndW91cyBzdG9yeSBmaWxlIG1hdGNoJykpIHJldHVybiAnYW1iaWd1b3VzX3N0b3J5X2ZpbGVfbWF0Y2gnO1xuICBpZiAoYy5pbmNsdWRlcygnbm8gc3ViYWdlbnRzJykpIHJldHVybiAnbm9fc3ViYWdlbnRzJztcbiAgcmV0dXJuICdvdGhlcic7XG59XG5cbmZ1bmN0aW9uIGlzUmVtb3RlRXJyb3IoZXJyb3I6IHVua25vd24sIG5hbWU6IHN0cmluZyk6IGJvb2xlYW4ge1xuICByZXR1cm4gKFxuICAgIHR5cGVvZiBlcnJvciA9PT0gJ29iamVjdCcgJiZcbiAgICBlcnJvciAhPT0gbnVsbCAmJlxuICAgIChlcnJvciBhcyB7IGVycm9yTmFtZT86IHVua25vd24gfSkuZXJyb3JOYW1lID09PSBuYW1lXG4gICk7XG59XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gU3RlcHMgNlx1MjAxMzk6IG1lYXN1cmUsIHN1Ym1pdCByYXcgZXZpZGVuY2UsIHJvdXRlIGJ5IEhBTFQgc3RhdHVzXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuaW50ZXJmYWNlIEZpbmlzaEFyZ3Mge1xuICBjbGllbnQ6IE9haHNDbGllbnQ7XG4gIHdvcmtJdGVtOiBXb3JrSXRlbTtcbiAgY2xhaW06IENsYWltO1xuICAvKiogRGlyZWN0b3J5IGhvbGRpbmcgdGhlIHJ1bidzIGZpbGVzIChmcmVzaCB3b3JrdHJlZSwgb3IgdGhlIGFkb3B0ZWQgb25lKS4gKi9cbiAgd29ya0Rpcjogc3RyaW5nO1xuICAvKiogU3BlYyBmaWxlIHBhdGggcmVsYXRpdmUgdG8gdGhlIHJlcG8gcm9vdC4gKi9cbiAgc3BlY1JlbDogc3RyaW5nO1xuICBiYXNlbGluZTogc3RyaW5nO1xuICBicmFuY2g6IHN0cmluZztcbiAgcmVwb1BhdGg6IHN0cmluZztcbiAgcmVtb3RlOiBzdHJpbmc7XG4gIGFsbG93bGlzdDogcmVhZG9ubHkgc3RyaW5nW107XG4gIC8qKiBudWxsIHdoZW4gYWRvcHRpbmcgKHRoZSBhZ2VudCB3YXMgaW52b2tlZCBieSB0aGUgY3Jhc2hlZCBydW4pLiAqL1xuICBhZ2VudEV4aXRDb2RlOiBudW1iZXIgfCBudWxsO1xuICBzdWJtaXQ6IChraW5kOiBFdmlkZW5jZVsna2luZCddLCBwYXlsb2FkOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPikgPT4gUHJvbWlzZTx2b2lkPjtcbn1cblxuYXN5bmMgZnVuY3Rpb24gZmluaXNoUnVuKGFyZ3M6IEZpbmlzaEFyZ3MpOiBQcm9taXNlPCdpbl9yZXZpZXcnIHwgJ2Jsb2NrZWQnPiB7XG4gIGNvbnN0IHsgY2xpZW50LCB3b3JrSXRlbSwgY2xhaW0gfSA9IGFyZ3M7XG5cbiAgLy8gNiBcdTIwMTQgcGFyc2UgSEFMVDogZnJvbnRtYXR0ZXIgc3RhdHVzICsgdmVyYmF0aW0gQXV0byBSdW4gUmVzdWx0LlxuICBjb25zdCBzcGVjID0gcmVhZFNwZWNSZXBvcnQoam9pbihhcmdzLndvcmtEaXIsIGFyZ3Muc3BlY1JlbCkpO1xuICBhd2FpdCBhcmdzLnN1Ym1pdCgnaGFsdF9yZXBvcnQnLCB7XG4gICAgc3RhdHVzOiBzcGVjLnN0YXR1cyxcbiAgICBibG9ja2luZ0NvbmRpdGlvbjogc3BlYy5ibG9ja2luZ0NvbmRpdGlvbixcbiAgICBhdXRvUnVuUmVzdWx0OiBzcGVjLmF1dG9SdW5SZXN1bHQsXG4gICAgYWdlbnRFeGl0Q29kZTogYXJncy5hZ2VudEV4aXRDb2RlLFxuICB9KTtcblxuICAvLyA3IFx1MjAxNCBwaW5uZWQgdmVyaWZpY2F0aW9uIG9ubHk7IHRoZSBhbGxvd2xpc3QgZ2F0ZXMgd2hhdCBldmVyIGdldHMgZXhlY3V0ZWQuXG4gIGZvciAoY29uc3QgY29tbWFuZCBvZiB3b3JrSXRlbS5waW5uZWRWZXJpZmljYXRpb24gPz8gW10pIHtcbiAgICBjb25zdCBiaW5hcnkgPSBjb21tYW5kLnRyaW0oKS5zcGxpdCgvXFxzKy8pWzBdID8/ICcnO1xuICAgIGlmICghYXJncy5hbGxvd2xpc3QuaW5jbHVkZXMoYmluYXJ5KSkge1xuICAgICAgYXdhaXQgYXJncy5zdWJtaXQoJ3Rlc3RfcnVuJywgeyBjb21tYW5kLCBleGl0Q29kZTogLTEsIHJlZnVzZWQ6IHRydWUgfSk7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG4gICAgY29uc3QgcnVuID0gc3Bhd25TeW5jKCdiYXNoJywgWyctYycsIGNvbW1hbmRdLCB7XG4gICAgICBjd2Q6IGFyZ3Mud29ya0RpcixcbiAgICAgIGVuY29kaW5nOiAndXRmOCcsXG4gICAgICB0aW1lb3V0OiAxMCAqIDYwICogMTAwMCxcbiAgICB9KTtcbiAgICBhd2FpdCBhcmdzLnN1Ym1pdCgndGVzdF9ydW4nLCB7IGNvbW1hbmQsIGV4aXRDb2RlOiBydW4uc3RhdHVzID8/IC0xIH0pO1xuICB9XG5cbiAgLy8gOCBcdTIwMTQgZGlmZiArIHB1c2ggKyBjb21taXQgZXZpZGVuY2UgKG1lYXN1cmVkLCBuZXZlciBqdWRnZWQgaGVyZSkuXG4gIGNvbnN0IGZpbmFsID0gZ2l0KFsncmV2LXBhcnNlJywgJ0hFQUQnXSwgYXJncy53b3JrRGlyKTtcbiAgY29uc3Qgc2hvcnRzdGF0ID1cbiAgICBmaW5hbCA9PT0gYXJncy5iYXNlbGluZVxuICAgICAgPyAnJ1xuICAgICAgOiBnaXQoWydkaWZmJywgJy0tc2hvcnRzdGF0JywgYCR7YXJncy5iYXNlbGluZX0uLiR7ZmluYWx9YF0sIGFyZ3Mud29ya0Rpcik7XG4gIGNvbnN0IGZpbGVzQ2hhbmdlZCA9IE51bWJlcigvKFxcZCspIGZpbGVzPyBjaGFuZ2VkLy5leGVjKHNob3J0c3RhdCk/LlsxXSA/PyAnMCcpO1xuICBhd2FpdCBhcmdzLnN1Ym1pdCgnZ2l0X2RpZmYnLCB7XG4gICAgYmFzZWxpbmU6IGFyZ3MuYmFzZWxpbmUsXG4gICAgZmluYWwsXG4gICAgZmlsZXNDaGFuZ2VkLFxuICAgIG5vbkVtcHR5OiBmaWxlc0NoYW5nZWQgPiAwLFxuICAgIGJyYW5jaDogYXJncy5icmFuY2gsXG4gIH0pO1xuXG4gIGdpdChbJ3B1c2gnLCBhcmdzLnJlbW90ZSwgYXJncy5icmFuY2hdLCBhcmdzLnJlcG9QYXRoKTtcbiAgY29uc3QgbHNSZW1vdGUgPSBnaXQoWydscy1yZW1vdGUnLCBhcmdzLnJlbW90ZSwgYHJlZnMvaGVhZHMvJHthcmdzLmJyYW5jaH1gXSwgYXJncy5yZXBvUGF0aCk7XG4gIGF3YWl0IGFyZ3Muc3VibWl0KCdjb21taXQnLCB7XG4gICAgc2hhOiBmaW5hbCxcbiAgICBicmFuY2g6IGFyZ3MuYnJhbmNoLFxuICAgIHJlYWNoYWJsZU9uUmVtb3RlOiBsc1JlbW90ZS5pbmNsdWRlcyhmaW5hbCksXG4gIH0pO1xuXG4gIC8vIDkgXHUyMDE0IHJvdXRpbmc6IHRoZSBmaWxlIHNheXMgd2hhdCB0aGUgYWdlbnQgY2xhaW1zOyB0aGUgY29yZSBkZWNpZGVzLlxuICBjb25zdCBzdGF0dXMgPSBub3JtYWxpemVTdGF0dXMoc3BlYy5zdGF0dXMpO1xuICBjb25zdCB0b2tlbiA9IGNsYWltLmZlbmNpbmdUb2tlbjtcbiAgaWYgKHN0YXR1cyA9PT0gJ2Jsb2NrZWQnKSB7XG4gICAgYXdhaXQgY2xpZW50LmNhbGwoJ2Jsb2NrX3Rhc2snLCB7XG4gICAgICB3b3JrSXRlbUlkOiB3b3JrSXRlbS5pZCxcbiAgICAgIHJlYXNvbjogbWFwQmxvY2tpbmdDb25kaXRpb24oc3BlYy5ibG9ja2luZ0NvbmRpdGlvbiksXG4gICAgICBmZW5jaW5nVG9rZW46IHRva2VuLFxuICAgIH0pO1xuICAgIGF3YWl0IGNsaWVudC5jYWxsKCdyZWxlYXNlX2NsYWltJywgeyBjbGFpbUlkOiBjbGFpbS5pZCwgcmVhc29uOiAncnVuIGJsb2NrZWQnIH0pO1xuICAgIHJldHVybiAnYmxvY2tlZCc7XG4gIH1cbiAgY29uc3QgaGFzQ29tbWl0ID0gZmluYWwgIT09IGFyZ3MuYmFzZWxpbmU7XG4gIGlmIChzdGF0dXMgPT09ICdkb25lJyB8fCBzdGF0dXMgPT09ICdpbl9yZXZpZXcnIHx8IChzdGF0dXMgPT09ICdpbl9wcm9ncmVzcycgJiYgaGFzQ29tbWl0KSkge1xuICAgIGF3YWl0IGNsaWVudC5jYWxsKCdhZHZhbmNlX3N0YXRlJywge1xuICAgICAgd29ya0l0ZW1JZDogd29ya0l0ZW0uaWQsXG4gICAgICB0bzogJ2luX3JldmlldycsXG4gICAgICBmZW5jaW5nVG9rZW46IHRva2VuLFxuICAgIH0pO1xuICAgIGF3YWl0IGNsaWVudC5jYWxsKCdyZWxlYXNlX2NsYWltJywgeyBjbGFpbUlkOiBjbGFpbS5pZCwgcmVhc29uOiAncnVuIGZpbmlzaGVkJyB9KTtcbiAgICByZXR1cm4gJ2luX3Jldmlldyc7XG4gIH1cbiAgLy8gQWdlbnQgZXhpdGVkIG5vbi16ZXJvIHdpdGggbm8gcmVhZGFibGUgSEFMVCBzdGF0dXMsIG9yIGFuIHVua25vd24gc3RhdHVzLlxuICBhd2FpdCBjbGllbnQuY2FsbCgnYmxvY2tfdGFzaycsIHsgd29ya0l0ZW1JZDogd29ya0l0ZW0uaWQsIHJlYXNvbjogJ290aGVyJywgZmVuY2luZ1Rva2VuOiB0b2tlbiB9KTtcbiAgYXdhaXQgY2xpZW50LmNhbGwoJ3JlbGVhc2VfY2xhaW0nLCB7XG4gICAgY2xhaW1JZDogY2xhaW0uaWQsXG4gICAgcmVhc29uOiAncnVuIGZhaWxlZCB3aXRob3V0IGEgcmVhZGFibGUgSEFMVCcsXG4gIH0pO1xuICByZXR1cm4gJ2Jsb2NrZWQnO1xufVxuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIENyYXNoLXJlY292ZXJ5IHNjYW4gKHN0ZXAgMTApXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuaW50ZXJmYWNlIFdvcmt0cmVlU2NhbiB7XG4gIGFkb3B0YWJsZTogeyBkaXI6IHN0cmluZzsgaGVhZDogc3RyaW5nOyBiYXNlbGluZTogc3RyaW5nIH0gfCBudWxsO1xuICB3cmVja2VkOiBzdHJpbmdbXTtcbn1cblxuZnVuY3Rpb24gc2Nhbk9sZFdvcmt0cmVlcyhyb290OiBzdHJpbmcsIHdvcmtJdGVtSWQ6IHN0cmluZywgc3BlY1JlbDogc3RyaW5nKTogV29ya3RyZWVTY2FuIHtcbiAgY29uc3Qgc2NhbjogV29ya3RyZWVTY2FuID0geyBhZG9wdGFibGU6IG51bGwsIHdyZWNrZWQ6IFtdIH07XG4gIGlmICghZXhpc3RzU3luYyhyb290KSkgcmV0dXJuIHNjYW47XG4gIGZvciAoY29uc3QgbmFtZSBvZiByZWFkZGlyU3luYyhyb290KSkge1xuICAgIGNvbnN0IGRpciA9IGpvaW4ocm9vdCwgbmFtZSk7XG4gICAgY29uc3QgbWFya2VyID0gcmVhZE1hcmtlcihkaXIpO1xuICAgIGlmIChtYXJrZXIgPT09IG51bGwgfHwgbWFya2VyLndvcmtJdGVtSWQgIT09IHdvcmtJdGVtSWQpIGNvbnRpbnVlO1xuICAgIGxldCBoZWFkOiBzdHJpbmcgfCBudWxsID0gbnVsbDtcbiAgICB0cnkge1xuICAgICAgaGVhZCA9IGdpdChbJ3Jldi1wYXJzZScsICdIRUFEJ10sIGRpcik7XG4gICAgfSBjYXRjaCB7XG4gICAgICBoZWFkID0gbnVsbDtcbiAgICB9XG4gICAgY29uc3Qgc3RhdHVzID0gbm9ybWFsaXplU3RhdHVzKHJlYWRTcGVjUmVwb3J0KGpvaW4oZGlyLCBzcGVjUmVsKSkuc3RhdHVzKTtcbiAgICBjb25zdCB0ZXJtaW5hbCA9IHN0YXR1cyA9PT0gJ2RvbmUnIHx8IHN0YXR1cyA9PT0gJ2luX3Jldmlldyc7XG4gICAgaWYgKHNjYW4uYWRvcHRhYmxlID09PSBudWxsICYmIGhlYWQgIT09IG51bGwgJiYgaGVhZCAhPT0gbWFya2VyLmJhc2VsaW5lICYmIHRlcm1pbmFsKSB7XG4gICAgICBzY2FuLmFkb3B0YWJsZSA9IHsgZGlyLCBoZWFkLCBiYXNlbGluZTogbWFya2VyLmJhc2VsaW5lIH07XG4gICAgfSBlbHNlIHtcbiAgICAgIHNjYW4ud3JlY2tlZC5wdXNoKGRpcik7XG4gICAgfVxuICB9XG4gIHJldHVybiBzY2FuO1xufVxuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIHJ1bk9uY2UgXHUyMDE0IG9uZSBmdWxsIGRpc3BhdGNoIGN5Y2xlXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJ1bk9uY2Uob3B0aW9uczogUnVubmVyT3B0aW9ucyk6IFByb21pc2U8UnVuT25jZVJlc3VsdD4ge1xuICBjb25zdCB7IGNsaWVudCB9ID0gb3B0aW9ucztcbiAgY29uc3QgcmVwb1BhdGggPSByZXNvbHZlKG9wdGlvbnMucmVwb1BhdGgpO1xuICBjb25zdCByZW1vdGUgPSBvcHRpb25zLnJlbW90ZSA/PyAnb3JpZ2luJztcbiAgY29uc3QgYWxsb3dsaXN0ID0gb3B0aW9ucy52ZXJpZmljYXRpb25BbGxvd2xpc3QgPz8gREVGQVVMVF9WRVJJRklDQVRJT05fQUxMT1dMSVNUO1xuXG4gIC8vIDEgXHUyMDE0IHBvbGwuIE9yZGVyIG9mIHRoZSBBUEkgcmVzcG9uc2UgPSBpbXBvcnQgb3JkZXI7IHRha2UgdGhlIGZpcnN0LlxuICAvLyBGYWxsYmFjazogYW4gaW5fcHJvZ3Jlc3MgaXRlbSB3aXRoIG5vIGxpdmUgY2xhaW0gaXMgYSBjcmFzaGVkIGRpc3BhdGNoLlxuICBjb25zdCBsaXN0VW5ibG9ja2VkID0gYXN5bmMgKHN0YXRlOiBXb3JrSXRlbVN0YXRlKTogUHJvbWlzZTxXb3JrSXRlbVtdPiA9PlxuICAgIChhd2FpdCBjbGllbnQuY2FsbDxXb3JrSXRlbVtdPignbGlzdF93b3JrX2l0ZW1zJywgeyBzdGF0ZSwgY2xhaW1hYmxlOiB0cnVlIH0pKS5maWx0ZXIoXG4gICAgICAoaXRlbSkgPT4gaXRlbS5ibG9ja2VkUmVhc29uID09PSBudWxsLFxuICAgICk7XG4gIGxldCBjYW5kaWRhdGVzID0gYXdhaXQgbGlzdFVuYmxvY2tlZCgncmVhZHlfZm9yX2RldicpO1xuICBpZiAoY2FuZGlkYXRlcy5sZW5ndGggPT09IDApIGNhbmRpZGF0ZXMgPSBhd2FpdCBsaXN0VW5ibG9ja2VkKCdpbl9wcm9ncmVzcycpO1xuICBjb25zdCBwaWNrZWQgPSBjYW5kaWRhdGVzWzBdO1xuICBpZiAocGlja2VkID09PSB1bmRlZmluZWQpIHJldHVybiB7IGRpc3BhdGNoZWQ6IGZhbHNlIH07XG5cbiAgbGV0IGNsYWltOiBDbGFpbTtcbiAgdHJ5IHtcbiAgICBjbGFpbSA9IGF3YWl0IGNsaWVudC5jYWxsPENsYWltPignY2xhaW1fdGFzaycsIHsgd29ya0l0ZW1JZDogcGlja2VkLmlkIH0pO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGlmIChpc1JlbW90ZUVycm9yKGVycm9yLCAnQ29uZmxpY3RFcnJvcicpKSB7XG4gICAgICByZXR1cm4geyBkaXNwYXRjaGVkOiBmYWxzZSwgZGV0YWlsczogYGxvc3QgdGhlIGNsYWltIHJhY2UgZm9yICR7cGlja2VkLmV4dGVybmFsS2V5fWAgfTtcbiAgICB9XG4gICAgdGhyb3cgZXJyb3I7XG4gIH1cblxuICBjb25zdCBjb250ZXh0ID0gYXdhaXQgY2xpZW50LmNhbGw8eyB3b3JrSXRlbTogV29ya0l0ZW07IGVudHJ5U3RhdGU6IFdvcmtJdGVtU3RhdGUgfT4oXG4gICAgJ2dldF90YXNrX2NvbnRleHQnLFxuICAgIHsgd29ya0l0ZW1JZDogcGlja2VkLmlkIH0sXG4gICk7XG4gIGNvbnN0IHdvcmtJdGVtID0gY29udGV4dC53b3JrSXRlbTtcbiAgY29uc3Qgc3BlY1JlbCA9IGpvaW4ob3B0aW9ucy5zcGVjRm9sZGVyLCB3b3JrSXRlbS5zcGVjUGF0aCk7XG4gIGNvbnN0IGJyYW5jaCA9IGBjbGFpbS8ke2NsYWltLmlkfWA7XG4gIGNvbnN0IHdvcmt0cmVlc1Jvb3QgPSBqb2luKHJlcG9QYXRoLCAnLm9haHMnLCAnd29ya3RyZWVzJyk7XG4gIGNvbnN0IGV2aWRlbmNlOiBFdmlkZW5jZVtdID0gW107XG5cbiAgY29uc3Qgc3VibWl0ID0gYXN5bmMgKGtpbmQ6IEV2aWRlbmNlWydraW5kJ10sIHBheWxvYWQ6IFJlY29yZDxzdHJpbmcsIHVua25vd24+KTogUHJvbWlzZTx2b2lkPiA9PiB7XG4gICAgY29uc3QgaXRlbTogRXZpZGVuY2UgPSB7IGtpbmQsIHBheWxvYWQgfTtcbiAgICBldmlkZW5jZS5wdXNoKGl0ZW0pO1xuICAgIGF3YWl0IGNsaWVudC5jYWxsKCdzdWJtaXRfZXZpZGVuY2UnLCB7XG4gICAgICB3b3JrSXRlbUlkOiB3b3JrSXRlbS5pZCxcbiAgICAgIGV2aWRlbmNlOiBpdGVtLFxuICAgICAgZmVuY2luZ1Rva2VuOiBjbGFpbS5mZW5jaW5nVG9rZW4sXG4gICAgfSk7XG4gIH07XG5cbiAgY29uc3QgYmFzZSA9IHtcbiAgICBkaXNwYXRjaGVkOiB0cnVlLFxuICAgIHdvcmtJdGVtSWQ6IHdvcmtJdGVtLmlkLFxuICAgIGV4dGVybmFsS2V5OiB3b3JrSXRlbS5leHRlcm5hbEtleSxcbiAgICBjbGFpbUlkOiBjbGFpbS5pZCxcbiAgICBldmlkZW5jZSxcbiAgfSBzYXRpc2ZpZXMgUnVuT25jZVJlc3VsdDtcblxuICBjb25zdCBmaW5pc2hBcmdzID0ge1xuICAgIGNsaWVudCxcbiAgICB3b3JrSXRlbSxcbiAgICBjbGFpbSxcbiAgICBzcGVjUmVsLFxuICAgIGJyYW5jaCxcbiAgICByZXBvUGF0aCxcbiAgICByZW1vdGUsXG4gICAgYWxsb3dsaXN0LFxuICAgIHN1Ym1pdCxcbiAgfTtcblxuICAvLyAxMCBcdTIwMTQgYWRvcHQgKGNyYXNoIHJlY292ZXJ5KTogaW5zcGVjdCBsZWZ0b3ZlciB3b3JrdHJlZXMgb2YgdGhpcyB3b3JrIGl0ZW0uXG4gIGNvbnN0IHNjYW4gPSBzY2FuT2xkV29ya3RyZWVzKHdvcmt0cmVlc1Jvb3QsIHdvcmtJdGVtLmlkLCBzcGVjUmVsKTtcbiAgaWYgKHNjYW4uYWRvcHRhYmxlICE9PSBudWxsKSB7XG4gICAgY29uc3QgeyBkaXIsIGhlYWQsIGJhc2VsaW5lIH0gPSBzY2FuLmFkb3B0YWJsZTtcbiAgICAvLyBUaGUgbmV3IGNsYWltJ3MgYnJhbmNoIHBvaW50cyBhdCB0aGUgY3Jhc2hlZCBydW4ncyBmaW5pc2hlZCBIRUFEOyB0aGVcbiAgICAvLyBhZ2VudCBpcyBOT1QgcmUtaW52b2tlZCBcdTIwMTQgdGhpcyBpcyBsYXRlIGV2aWRlbmNlIHN1Ym1pc3Npb24sIG5vdCByZWRvLlxuICAgIGdpdChbJ2JyYW5jaCcsIGJyYW5jaCwgaGVhZF0sIHJlcG9QYXRoKTtcbiAgICAvLyBFbnRyeS1zdGF0ZSBhbGlnbm1lbnQgKG5vLW9wIHdoZW4gdGhlIGNyYXNoZWQgcnVuIGFscmVhZHkgYWR2YW5jZWQpLlxuICAgIGF3YWl0IGNsaWVudC5jYWxsKCdhZHZhbmNlX3N0YXRlJywge1xuICAgICAgd29ya0l0ZW1JZDogd29ya0l0ZW0uaWQsXG4gICAgICB0bzogJ2luX3Byb2dyZXNzJyxcbiAgICAgIGZlbmNpbmdUb2tlbjogY2xhaW0uZmVuY2luZ1Rva2VuLFxuICAgIH0pO1xuICAgIGlmIChvcHRpb25zLmZhaWxwb2ludCA9PT0gJ2JlZm9yZV9yZXBvcnQnKSB7XG4gICAgICByZXR1cm4geyAuLi5iYXNlLCBvdXRjb21lOiAnY3Jhc2hlZCcsIGRldGFpbHM6ICdmYWlscG9pbnQgYmVmb3JlX3JlcG9ydCAoYWRvcHQgcGF0aCknIH07XG4gICAgfVxuICAgIGNvbnN0IG91dGNvbWUgPSBhd2FpdCBmaW5pc2hSdW4oe1xuICAgICAgLi4uZmluaXNoQXJncyxcbiAgICAgIHdvcmtEaXI6IGRpcixcbiAgICAgIGJhc2VsaW5lLFxuICAgICAgYWdlbnRFeGl0Q29kZTogbnVsbCxcbiAgICB9KTtcbiAgICByZW1vdmVXb3JrdHJlZShkaXIsIHJlcG9QYXRoKTtcbiAgICByZXR1cm4ge1xuICAgICAgLi4uYmFzZSxcbiAgICAgIG91dGNvbWU6IG91dGNvbWUgPT09ICdpbl9yZXZpZXcnID8gJ2Fkb3B0ZWRfaW5fcmV2aWV3JyA6IG91dGNvbWUsXG4gICAgICBkZXRhaWxzOiBgYWRvcHRlZCBmaW5pc2hlZCB3b3JrdHJlZSAke2Rpcn1gLFxuICAgIH07XG4gIH1cbiAgaWYgKHNjYW4ud3JlY2tlZC5sZW5ndGggPiAwKSB7XG4gICAgLy8gQSB3cmVja2VkIHdvcmt0cmVlIChubyBjb21taXQgcGFzdCBiYXNlbGluZSAvIG5vbi10ZXJtaW5hbCBzdGF0dXMpIGlzXG4gICAgLy8gY2xlYW5lZDsgdGhlIGl0ZW0gYmxvY2tzIHN0YWxlX3dvcmt0cmVlIGZvciBhIGh1bWFuIGxvb2suXG4gICAgZm9yIChjb25zdCBkaXIgb2Ygc2Nhbi53cmVja2VkKSByZW1vdmVXb3JrdHJlZShkaXIsIHJlcG9QYXRoKTtcbiAgICBhd2FpdCBjbGllbnQuY2FsbCgnYmxvY2tfdGFzaycsIHtcbiAgICAgIHdvcmtJdGVtSWQ6IHdvcmtJdGVtLmlkLFxuICAgICAgcmVhc29uOiAnc3RhbGVfd29ya3RyZWUnLFxuICAgICAgZmVuY2luZ1Rva2VuOiBjbGFpbS5mZW5jaW5nVG9rZW4sXG4gICAgfSk7XG4gICAgYXdhaXQgY2xpZW50LmNhbGwoJ3JlbGVhc2VfY2xhaW0nLCB7IGNsYWltSWQ6IGNsYWltLmlkLCByZWFzb246ICdzdGFsZSB3b3JrdHJlZSBjbGVhbmVkJyB9KTtcbiAgICByZXR1cm4geyAuLi5iYXNlLCBvdXRjb21lOiAnYmxvY2tlZCcsIGRldGFpbHM6ICdzdGFsZSB3b3JrdHJlZSBjbGVhbmVkOyB0YXNrIGJsb2NrZWQnIH07XG4gIH1cblxuICAvLyAyIFx1MjAxNCBnaXQgcGx1bWJpbmc6IGJhc2VsaW5lLCBjbGFpbSBicmFuY2gsIGNsYWltLW5hbWVkIHdvcmt0cmVlLlxuICBjb25zdCBiYXNlbGluZSA9IGdpdChbJ3Jldi1wYXJzZScsICdIRUFEJ10sIHJlcG9QYXRoKTtcbiAgZW5zdXJlR2l0RXhjbHVkZXMocmVwb1BhdGgpO1xuICBta2RpclN5bmMod29ya3RyZWVzUm9vdCwgeyByZWN1cnNpdmU6IHRydWUgfSk7XG4gIGNvbnN0IHdvcmt0cmVlRGlyID0gam9pbih3b3JrdHJlZXNSb290LCBjbGFpbS5pZCk7XG4gIGdpdChbJ3dvcmt0cmVlJywgJ2FkZCcsICctYicsIGJyYW5jaCwgd29ya3RyZWVEaXIsIGJhc2VsaW5lXSwgcmVwb1BhdGgpO1xuICB3cml0ZU1hcmtlcih3b3JrdHJlZURpciwge1xuICAgIHdvcmtJdGVtSWQ6IHdvcmtJdGVtLmlkLFxuICAgIGNsYWltSWQ6IGNsYWltLmlkLFxuICAgIGJhc2VsaW5lLFxuICAgIGludm9jYXRpb25zOiAwLFxuICB9KTtcblxuICAvLyAzIFx1MjAxNCBtaXJyb3Itb24tZGlzcGF0Y2g6IHN0YW1wIGZyb250bWF0dGVyIHRvIHRoZSBEQiBlbnRyeSBzdGF0ZSBzbyB0aGVcbiAgLy8gb25lIG1vbWVudCB0aGUgZmlsZSBpcyByZWFkIGFzIGFuIGVudHJ5IHN0YXRlLCBpdCBpcyBmcmVzaCAoXHUwMEE3MS42KS5cbiAgY29uc3Qgc3BlY0FicyA9IGpvaW4od29ya3RyZWVEaXIsIHNwZWNSZWwpO1xuICBpZiAoZXhpc3RzU3luYyhzcGVjQWJzKSkge1xuICAgIHNldEZyb250bWF0dGVyU3RhdHVzKHNwZWNBYnMsIEVOVFJZX1NUQVRVU1tjb250ZXh0LmVudHJ5U3RhdGVdID8/IGNvbnRleHQuZW50cnlTdGF0ZSk7XG4gIH1cblxuICAvLyA0IFx1MjAxNCBhZHZhbmNlIGludG8gZXhlY3V0aW9uIEJFRk9SRSB0aGUgYWdlbnQgcnVucyAoREIgaXMgdGhlIGVudHJ5IHN0YXRlKS5cbiAgYXdhaXQgY2xpZW50LmNhbGwoJ2FkdmFuY2Vfc3RhdGUnLCB7XG4gICAgd29ya0l0ZW1JZDogd29ya0l0ZW0uaWQsXG4gICAgdG86ICdpbl9wcm9ncmVzcycsXG4gICAgZmVuY2luZ1Rva2VuOiBjbGFpbS5mZW5jaW5nVG9rZW4sXG4gIH0pO1xuXG4gIC8vIDUgXHUyMDE0IGludm9rZSB0aGUgY29kaW5nIGFnZW50LlxuICBjb25zdCBjb21tYW5kID0gb3B0aW9ucy5hZ2VudENtZFxuICAgIC5yZXBsYWNlQWxsKCd7U1BFQ19GT0xERVJ9Jywgb3B0aW9ucy5zcGVjRm9sZGVyKVxuICAgIC5yZXBsYWNlQWxsKCd7U1RPUllfSUR9Jywgd29ya0l0ZW0uZXh0ZXJuYWxLZXkpXG4gICAgLnJlcGxhY2VBbGwoJ3tJTlZPS0VfV0lUSH0nLCB3b3JrSXRlbS5pbnZva2VEZXZXaXRoKVxuICAgIC5yZXBsYWNlQWxsKCd7V09SS1RSRUV9Jywgd29ya3RyZWVEaXIpO1xuICB3cml0ZU1hcmtlcih3b3JrdHJlZURpciwge1xuICAgIHdvcmtJdGVtSWQ6IHdvcmtJdGVtLmlkLFxuICAgIGNsYWltSWQ6IGNsYWltLmlkLFxuICAgIGJhc2VsaW5lLFxuICAgIGludm9jYXRpb25zOiAxLFxuICB9KTtcbiAgY29uc3QgaW52b2tlZCA9IHNwYXduU3luYygnYmFzaCcsIFsnLWxjJywgY29tbWFuZF0sIHtcbiAgICBjd2Q6IHdvcmt0cmVlRGlyLFxuICAgIGVuY29kaW5nOiAndXRmOCcsXG4gICAgdGltZW91dDogb3B0aW9ucy5hZ2VudFRpbWVvdXRNcyA/PyAzMCAqIDYwICogMTAwMCxcbiAgICBraWxsU2lnbmFsOiAnU0lHS0lMTCcsXG4gICAgZW52OiB7XG4gICAgICAuLi5wcm9jZXNzLmVudixcbiAgICAgIC4uLm9wdGlvbnMuYWdlbnRFbnYsXG4gICAgICBPQUhTX1NQRUNfRklMRTogc3BlY0FicyxcbiAgICAgIE9BSFNfU1RPUllfSUQ6IHdvcmtJdGVtLmV4dGVybmFsS2V5LFxuICAgIH0sXG4gIH0pO1xuICBjb25zdCBhZ2VudEV4aXRDb2RlID0gaW52b2tlZC5zdGF0dXMgPz8gLTE7XG5cbiAgLy8gVEVTVCBPTkxZOiBzaW11bGF0ZSBkeWluZyBhZnRlciB0aGUgYWdlbnQgY29tbWl0dGVkLCBiZWZvcmUgYW55IHJlcG9ydC5cbiAgLy8gTm8gZXZpZGVuY2UsIG5vIGFkdmFuY2UsIG5vIHJlbGVhc2UgXHUyMDE0IHRoZSBjbGFpbSBzdGF5cyBsaXZlLCB0aGUgd29ya3RyZWVcbiAgLy8gc3RheXMgb24gZGlzazsgYSBsYXRlciBjbGFpbSBhZG9wdHMgb3IgY2xlYW5zIGl0IChzdGVwIDEwKS5cbiAgaWYgKG9wdGlvbnMuZmFpbHBvaW50ID09PSAnYmVmb3JlX3JlcG9ydCcpIHtcbiAgICByZXR1cm4ge1xuICAgICAgLi4uYmFzZSxcbiAgICAgIG91dGNvbWU6ICdjcmFzaGVkJyxcbiAgICAgIGRldGFpbHM6ICdmYWlscG9pbnQgYmVmb3JlX3JlcG9ydDogZGllZCBhZnRlciB0aGUgYWdlbnQgcmFuLCBiZWZvcmUgcmVwb3J0aW5nJyxcbiAgICB9O1xuICB9XG5cbiAgY29uc3Qgb3V0Y29tZSA9IGF3YWl0IGZpbmlzaFJ1bih7XG4gICAgLi4uZmluaXNoQXJncyxcbiAgICB3b3JrRGlyOiB3b3JrdHJlZURpcixcbiAgICBiYXNlbGluZSxcbiAgICBhZ2VudEV4aXRDb2RlLFxuICB9KTtcbiAgcmVtb3ZlV29ya3RyZWUod29ya3RyZWVEaXIsIHJlcG9QYXRoKTtcbiAgcmV0dXJuIHsgLi4uYmFzZSwgb3V0Y29tZSB9O1xufVxuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIHdvcmtMb29wIFx1MjAxNCBwb2xsIFx1MjE5MiBydW5PbmNlIFx1MjE5MiBzbGVlcFxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbi8qKiBSdW4gdW50aWwgc3RvcHBlZDogcG9sbCBcdTIxOTIgcnVuT25jZSBcdTIxOTIgc2xlZXAocG9sbE1zKS4gU0lHSU5UIGV4aXRzIGNsZWFubHkuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gd29ya0xvb3Aob3B0aW9uczogUnVubmVyT3B0aW9ucyAmIHsgb25jZT86IGJvb2xlYW4gfSk6IFByb21pc2U8dm9pZD4ge1xuICBsZXQgc3RvcHBlZCA9IGZhbHNlO1xuICBsZXQgd2FrZTogKCgpID0+IHZvaWQpIHwgdW5kZWZpbmVkO1xuICBjb25zdCBvblNpZ2ludCA9ICgpOiB2b2lkID0+IHtcbiAgICBzdG9wcGVkID0gdHJ1ZTtcbiAgICB3YWtlPy4oKTtcbiAgfTtcbiAgcHJvY2Vzcy5vbmNlKCdTSUdJTlQnLCBvblNpZ2ludCk7XG4gIHRyeSB7XG4gICAgZm9yICg7Oykge1xuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgcnVuT25jZShvcHRpb25zKTtcbiAgICAgIGlmIChvcHRpb25zLm9uY2UgPT09IHRydWUgfHwgc3RvcHBlZCkgcmV0dXJuO1xuICAgICAgaWYgKCFyZXN1bHQuZGlzcGF0Y2hlZCkge1xuICAgICAgICBhd2FpdCBuZXcgUHJvbWlzZTx2b2lkPigocmVzb2x2ZVNsZWVwKSA9PiB7XG4gICAgICAgICAgd2FrZSA9IHJlc29sdmVTbGVlcDtcbiAgICAgICAgICBzZXRUaW1lb3V0KHJlc29sdmVTbGVlcCwgb3B0aW9ucy5wb2xsTXMgPz8gMTVfMDAwKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHdha2UgPSB1bmRlZmluZWQ7XG4gICAgICAgIGlmIChzdG9wcGVkKSByZXR1cm47XG4gICAgICB9XG4gICAgfVxuICB9IGZpbmFsbHkge1xuICAgIHByb2Nlc3MucmVtb3ZlTGlzdGVuZXIoJ1NJR0lOVCcsIG9uU2lnaW50KTtcbiAgfVxufVxuIiwgIi8qKlxuICogVGhlIGBvYWhzYCBiaW5hcnkgXHUyMDE0IGNvbW1hbmRlciB3aXJpbmcgT05MWS4gRXZlcnkgZ2F0ZS1ob2xkZXIgY29tbWFuZCBpcyBhXG4gKiBwdXJlIGZ1bmN0aW9uIGluIHNyYy9jb21tYW5kcy8gdGFraW5nIChjbGllbnQsIG9wdHMpOyBzZXJ2ZSBsaXZlcyBpblxuICogc3JjL3NlcnZlLnRzOyB0aGUgd29ya2VyIGxvb3AgbGl2ZXMgaW4gQG9haHMvcnVubmVyIGFuZCBpcyBpbXBvcnRlZCBMQVpJTFlcbiAqIHNvIHRoZSByZXN0IG9mIHRoZSBDTEkgd29ya3Mgd2hpbGUgdGhlIHJ1bm5lciBpcyBzdGlsbCBsYW5kaW5nIChzdG9yeSAxNCkuXG4gKlxuICogRW52IGlzIHJlYWQgaGVyZSBhbmQgb25seSBoZXJlOiBPQUhTX1RPS0VOIChjbGllbnQgYXV0aCkgYW5kXG4gKiBPQUhTX0FETUlOX1RPS0VOIChzZXJ2ZSBib290c3RyYXApLlxuICovXG5pbXBvcnQgeyByZXNvbHZlIH0gZnJvbSAnbm9kZTpwYXRoJztcblxuaW1wb3J0IHsgQ29tbWFuZCB9IGZyb20gJ2NvbW1hbmRlcic7XG5pbXBvcnQgeyBtYWtlQ2xpZW50LCB0eXBlIE9haHNDbGllbnQgfSBmcm9tICdAb2Focy9jb250cmFjdHMnO1xuXG5pbXBvcnQge1xuICBhY3RvckNyZWF0ZUNvbW1hbmQsXG4gIGFkdmFuY2VDb21tYW5kLFxuICBhcHByb3ZlQ29tbWFuZCxcbiAgYXV0aHpDb21tYW5kLFxuICBldmVudHNDb21tYW5kLFxuICBmZWF0dXJlQ3JlYXRlQ29tbWFuZCxcbiAgZ2F0ZVBvbGljeVNldENvbW1hbmQsXG4gIGdvdmVybmFuY2VTZXRDb21tYW5kLFxuICBncmFudENvbW1hbmQsXG4gIGltcG9ydFN0b3JpZXNDb21tYW5kLFxuICBpbmJveENvbW1hbmQsXG4gIHBsYW5TZXRDb21tYW5kLFxuICBwb2xpY3lTZXRDb21tYW5kLFxuICByZWplY3RDb21tYW5kLFxuICByb2xlQXNzaWduQ29tbWFuZCxcbiAgcm9sZUxpc3RDb21tYW5kLFxuICByb2xlUmV2b2tlQ29tbWFuZCxcbiAgcnVuVG9PdXRwdXQsXG4gIHN0YXR1c0NvbW1hbmQsXG59IGZyb20gJy4vY29tbWFuZHMvaW5kZXguanMnO1xuaW1wb3J0IHsgREVGQVVMVF9QT1JULCBzdGFydFNlcnZlIH0gZnJvbSAnLi9zZXJ2ZS5qcyc7XG5cbmNvbnN0IERFRkFVTFRfVVJMID0gYGh0dHA6Ly9sb2NhbGhvc3Q6JHtERUZBVUxUX1BPUlR9YDtcblxuaW50ZXJmYWNlIENsaWVudEZsYWdzIHtcbiAgdXJsOiBzdHJpbmc7XG4gIHRva2VuPzogc3RyaW5nO1xufVxuXG5mdW5jdGlvbiBjbGllbnRGcm9tKGZsYWdzOiBDbGllbnRGbGFncyk6IE9haHNDbGllbnQge1xuICBjb25zdCB0b2tlbiA9IGZsYWdzLnRva2VuID8/IHByb2Nlc3MuZW52WydPQUhTX1RPS0VOJ107XG4gIGlmICh0b2tlbiA9PT0gdW5kZWZpbmVkIHx8IHRva2VuLmxlbmd0aCA9PT0gMCkge1xuICAgIHRocm93IG5ldyBFcnJvcignbWlzc2luZyB0b2tlbjogcGFzcyAtLXRva2VuIDx0b2tlbj4gb3Igc2V0IE9BSFNfVE9LRU4nKTtcbiAgfVxuICByZXR1cm4gbWFrZUNsaWVudCh7IGJhc2VVcmw6IGZsYWdzLnVybCwgdG9rZW4gfSk7XG59XG5cbi8qKiBBdHRhY2ggdGhlIHNoYXJlZCBjbGllbnQgZmxhZ3MgdG8gYSBnYXRlLWhvbGRlciBjb21tYW5kLiAqL1xuZnVuY3Rpb24gd2l0aENsaWVudEZsYWdzKGNtZDogQ29tbWFuZCk6IENvbW1hbmQge1xuICByZXR1cm4gY21kXG4gICAgLm9wdGlvbignLS11cmwgPHVybD4nLCAnc3BpbmUtYXBpIGJhc2UgVVJMJywgREVGQVVMVF9VUkwpXG4gICAgLm9wdGlvbignLS10b2tlbiA8dG9rZW4+JywgJ2JlYXJlciB0b2tlbiAoZGVmYXVsdDogZW52IE9BSFNfVE9LRU4pJyk7XG59XG5cbi8qKiBSdW4gYSBjb21tYW5kIGZ1bmN0aW9uIGFuZCB0cmFuc2xhdGUgaXRzIG91dGNvbWUgdG8gc3Rkb3V0L3N0ZGVyciArIGV4aXQgY29kZS4gKi9cbmFzeW5jIGZ1bmN0aW9uIGVtaXQoZm46ICgpID0+IFByb21pc2U8c3RyaW5nPik6IFByb21pc2U8dm9pZD4ge1xuICBjb25zdCB7IHRleHQsIGV4aXRDb2RlIH0gPSBhd2FpdCBydW5Ub091dHB1dChmbik7XG4gIGlmIChleGl0Q29kZSA9PT0gMCkge1xuICAgIHByb2Nlc3Muc3Rkb3V0LndyaXRlKGAke3RleHR9XFxuYCk7XG4gIH0gZWxzZSB7XG4gICAgcHJvY2Vzcy5zdGRlcnIud3JpdGUoYCR7dGV4dH1cXG5gKTtcbiAgICBwcm9jZXNzLmV4aXRDb2RlID0gZXhpdENvZGU7XG4gIH1cbn1cblxuY29uc3QgY29sbGVjdCA9ICh2YWx1ZTogc3RyaW5nLCBwcmV2aW91czogc3RyaW5nW10pOiBzdHJpbmdbXSA9PiBbLi4ucHJldmlvdXMsIHZhbHVlXTtcblxuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkUHJvZ3JhbSgpOiBDb21tYW5kIHtcbiAgY29uc3QgcHJvZ3JhbSA9IG5ldyBDb21tYW5kKCk7XG4gIHByb2dyYW1cbiAgICAubmFtZSgnb2FocycpXG4gICAgLmRlc2NyaXB0aW9uKCdvYWhzIFx1MjAxNCBPcGVuIEFnZW50cyBIYXJuZXNzIFN5c3RlbSBDTEkgKHNwaW5lIHNlcnZlciArIGdhdGUtaG9sZGVyIGNvbW1hbmRzKScpO1xuXG4gIC8vIC0tIHNlcnZlIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICBwcm9ncmFtXG4gICAgLmNvbW1hbmQoJ3NlcnZlJylcbiAgICAuZGVzY3JpcHRpb24oJ3N0YXJ0IHRoZSBzcGluZS1hcGkgKEhUVFAgL3JwYy8qICsgTUNQIC9tY3ApJylcbiAgICAub3B0aW9uKCctLXBvcnQgPHBvcnQ+JywgJ1RDUCBwb3J0JywgU3RyaW5nKERFRkFVTFRfUE9SVCkpXG4gICAgLm9wdGlvbignLS1hZG1pbi10b2tlbiA8dG9rZW4+JywgJ2Jvb3RzdHJhcCBhZG1pbiB0b2tlbiAoZGVmYXVsdDogZW52IE9BSFNfQURNSU5fVE9LRU4sIGVsc2UgZ2VuZXJhdGVkKScpXG4gICAgLm9wdGlvbignLS1kYXRhIDxkaXI+JywgJ3BlcnNpc3RlbmNlIGRpcmVjdG9yeSAoZHVyYWJsZSBQR2xpdGUgKyB0b2tlbiBzdG9yZSknKVxuICAgIC5hY3Rpb24oYXN5bmMgKG9wdHM6IHsgcG9ydDogc3RyaW5nOyBhZG1pblRva2VuPzogc3RyaW5nOyBkYXRhPzogc3RyaW5nIH0pID0+IHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IGFkbWluVG9rZW4gPSBvcHRzLmFkbWluVG9rZW4gPz8gcHJvY2Vzcy5lbnZbJ09BSFNfQURNSU5fVE9LRU4nXTtcbiAgICAgICAgY29uc3QgaGFuZGxlID0gYXdhaXQgc3RhcnRTZXJ2ZSh7XG4gICAgICAgICAgcG9ydDogTnVtYmVyKG9wdHMucG9ydCksXG4gICAgICAgICAgLi4uKGFkbWluVG9rZW4gIT09IHVuZGVmaW5lZCAmJiBhZG1pblRva2VuLmxlbmd0aCA+IDAgPyB7IGFkbWluVG9rZW4gfSA6IHt9KSxcbiAgICAgICAgICAuLi4ob3B0cy5kYXRhICE9PSB1bmRlZmluZWQgPyB7IGRhdGFEaXI6IHJlc29sdmUob3B0cy5kYXRhKSB9IDoge30pLFxuICAgICAgICB9KTtcbiAgICAgICAgcHJvY2Vzcy5zdGRvdXQud3JpdGUoXG4gICAgICAgICAgYG9haHMgc3BpbmUtYXBpIGxpc3RlbmluZyBvbiA6JHtoYW5kbGUucG9ydH0gKEhUVFAgL3JwYy8qLCBNQ1AgL21jcDsgZW5naW5lOiAke2hhbmRsZS5lbmdpbmVLaW5kfSR7XG4gICAgICAgICAgICBvcHRzLmRhdGEgIT09IHVuZGVmaW5lZCA/IGAsIGRhdGE6ICR7cmVzb2x2ZShvcHRzLmRhdGEpfWAgOiAnJ1xuICAgICAgICAgIH0pXFxuYCxcbiAgICAgICAgKTtcbiAgICAgICAgaWYgKGhhbmRsZS5hZG1pblRva2VuR2VuZXJhdGVkKSB7XG4gICAgICAgICAgcHJvY2Vzcy5zdGRvdXQud3JpdGUoYGFkbWluIHRva2VuIChnZW5lcmF0ZWQpOiAke2hhbmRsZS5hZG1pblRva2VufVxcbmApO1xuICAgICAgICB9XG4gICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICBjb25zdCBlcnIgPSBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IgOiBuZXcgRXJyb3IoU3RyaW5nKGVycm9yKSk7XG4gICAgICAgIHByb2Nlc3Muc3RkZXJyLndyaXRlKGAke2Vyci5uYW1lfTogJHtlcnIubWVzc2FnZX1cXG5gKTtcbiAgICAgICAgcHJvY2Vzcy5leGl0Q29kZSA9IDE7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgLy8gLS0gZ2F0ZS1ob2xkZXIgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHdpdGhDbGllbnRGbGFncyhwcm9ncmFtLmNvbW1hbmQoJ2luYm94JykpXG4gICAgLmRlc2NyaXB0aW9uKCdpdGVtcyBhd2FpdGluZyBhIGdhdGUgZGVjaXNpb24gKHNwZWMgYXBwcm92YWwgLyByZXZpZXcgZGVjaXNpb24pJylcbiAgICAuYWN0aW9uKGFzeW5jIChvcHRzOiBDbGllbnRGbGFncykgPT4gZW1pdCgoKSA9PiBpbmJveENvbW1hbmQoY2xpZW50RnJvbShvcHRzKSkpKTtcblxuICB3aXRoQ2xpZW50RmxhZ3MocHJvZ3JhbS5jb21tYW5kKCdhcHByb3ZlIDx3b3JrSXRlbUlkPicpKVxuICAgIC5kZXNjcmlwdGlvbignYXBwcm92ZSBhIGdhdGUgKHNwZWNfYXBwcm92YWwgcGlucyB2ZXJpZmljYXRpb24gY29tbWFuZHMpJylcbiAgICAucmVxdWlyZWRPcHRpb24oJy0tZ2F0ZSA8Z2F0ZT4nLCAnc3BlY19hcHByb3ZhbCB8IHJldmlld19hcHByb3ZhbCcpXG4gICAgLm9wdGlvbignLS1waW4gPGNtZD4nLCAncGluIGEgdmVyaWZpY2F0aW9uIGNvbW1hbmQgKHJlcGVhdGFibGUsIHNwZWNfYXBwcm92YWwgb25seSknLCBjb2xsZWN0LCBbXSlcbiAgICAuYWN0aW9uKGFzeW5jICh3b3JrSXRlbUlkOiBzdHJpbmcsIG9wdHM6IENsaWVudEZsYWdzICYgeyBnYXRlOiBzdHJpbmc7IHBpbjogc3RyaW5nW10gfSkgPT5cbiAgICAgIGVtaXQoKCkgPT4gYXBwcm92ZUNvbW1hbmQoY2xpZW50RnJvbShvcHRzKSwgeyB3b3JrSXRlbUlkLCBnYXRlOiBvcHRzLmdhdGUsIHBpbjogb3B0cy5waW4gfSkpLFxuICAgICk7XG5cbiAgd2l0aENsaWVudEZsYWdzKHByb2dyYW0uY29tbWFuZCgnYWR2YW5jZSA8d29ya0l0ZW1JZD4nKSlcbiAgICAuZGVzY3JpcHRpb24oJ2FkdmFuY2UgYSB3b3JrIGl0ZW0gdGhyb3VnaCB0aGUgRlNNIChwbGFubmluZy16b25lIG1vdmVzIGZvciBodW1hbnMpJylcbiAgICAucmVxdWlyZWRPcHRpb24oJy0tdG8gPHN0YXRlPicsICd0YXJnZXQgc3RhdGUsIGUuZy4gZHJhZnQgfCByZWFkeV9mb3JfZGV2JylcbiAgICAub3B0aW9uKCctLWZlbmNpbmctdG9rZW4gPG4+JywgJ2ZlbmNpbmcgdG9rZW4gd2hlbiBhY3RpbmcgdW5kZXIgYSBjbGFpbScsICh2OiBzdHJpbmcpID0+IE51bWJlcih2KSlcbiAgICAuYWN0aW9uKGFzeW5jICh3b3JrSXRlbUlkOiBzdHJpbmcsIG9wdHM6IENsaWVudEZsYWdzICYgeyB0bzogc3RyaW5nOyBmZW5jaW5nVG9rZW4/OiBudW1iZXIgfSkgPT5cbiAgICAgIGVtaXQoKCkgPT5cbiAgICAgICAgYWR2YW5jZUNvbW1hbmQoY2xpZW50RnJvbShvcHRzKSwge1xuICAgICAgICAgIHdvcmtJdGVtSWQsXG4gICAgICAgICAgdG86IG9wdHMudG8sXG4gICAgICAgICAgLi4uKG9wdHMuZmVuY2luZ1Rva2VuICE9PSB1bmRlZmluZWQgPyB7IGZlbmNpbmdUb2tlbjogb3B0cy5mZW5jaW5nVG9rZW4gfSA6IHt9KSxcbiAgICAgICAgfSksXG4gICAgICApLFxuICAgICk7XG5cbiAgd2l0aENsaWVudEZsYWdzKHByb2dyYW0uY29tbWFuZCgncmVqZWN0IDx3b3JrSXRlbUlkPicpKVxuICAgIC5kZXNjcmlwdGlvbigncmVqZWN0IGEgZ2F0ZSAocmV2aWV3IHJlamVjdGlvbiBmaXJlcyB0aGUgZGV0ZXJtaW5pc3RpYyBsb29wYmFjayknKVxuICAgIC5yZXF1aXJlZE9wdGlvbignLS1nYXRlIDxnYXRlPicsICdzcGVjX2FwcHJvdmFsIHwgcmV2aWV3X2FwcHJvdmFsJylcbiAgICAuYWN0aW9uKGFzeW5jICh3b3JrSXRlbUlkOiBzdHJpbmcsIG9wdHM6IENsaWVudEZsYWdzICYgeyBnYXRlOiBzdHJpbmcgfSkgPT5cbiAgICAgIGVtaXQoKCkgPT4gcmVqZWN0Q29tbWFuZChjbGllbnRGcm9tKG9wdHMpLCB7IHdvcmtJdGVtSWQsIGdhdGU6IG9wdHMuZ2F0ZSB9KSksXG4gICAgKTtcblxuICB3aXRoQ2xpZW50RmxhZ3MocHJvZ3JhbS5jb21tYW5kKCdzdGF0dXMnKSlcbiAgICAuZGVzY3JpcHRpb24oJ2FsbCB3b3JrIGl0ZW1zIGdyb3VwZWQgYnkgc3RhdGUsIHBsdXMgZmVhdHVyZSBkaXNwYXRjaCBob2xkcycpXG4gICAgLmFjdGlvbihhc3luYyAob3B0czogQ2xpZW50RmxhZ3MpID0+IGVtaXQoKCkgPT4gc3RhdHVzQ29tbWFuZChjbGllbnRGcm9tKG9wdHMpKSkpO1xuXG4gIGNvbnN0IGFjdG9yID0gcHJvZ3JhbS5jb21tYW5kKCdhY3RvcicpLmRlc2NyaXB0aW9uKCdhY3RvciBtYW5hZ2VtZW50IChhZG1pbiknKTtcbiAgd2l0aENsaWVudEZsYWdzKGFjdG9yLmNvbW1hbmQoJ2NyZWF0ZScpKVxuICAgIC5kZXNjcmlwdGlvbignY3JlYXRlIGEgdXNlciBvciBhZ2VudCBhY3RvcjsgcHJpbnRzIGFjdG9ySWQgKyB0b2tlbiAoYWRtaW4gb25seSknKVxuICAgIC5yZXF1aXJlZE9wdGlvbignLS10eXBlIDx0eXBlPicsICd1c2VyIHwgYWdlbnQnKVxuICAgIC5yZXF1aXJlZE9wdGlvbignLS1uYW1lIDxuYW1lPicsICdkaXNwbGF5IG5hbWUnKVxuICAgIC5vcHRpb24oJy0tZ292ZXJuYW5jZS1yb2xlIDxyb2xlPicsICdhZG1pbiB8IG1lbWJlciB8IGF1ZGl0b3IgKGJvb3RzdHJhcCBwbHVtYmluZywgYWRtaW4gb25seSknKVxuICAgIC5hY3Rpb24oYXN5bmMgKG9wdHM6IENsaWVudEZsYWdzICYgeyB0eXBlOiBzdHJpbmc7IG5hbWU6IHN0cmluZzsgZ292ZXJuYW5jZVJvbGU/OiBzdHJpbmcgfSkgPT5cbiAgICAgIGVtaXQoKCkgPT5cbiAgICAgICAgYWN0b3JDcmVhdGVDb21tYW5kKGNsaWVudEZyb20ob3B0cyksIHtcbiAgICAgICAgICB0eXBlOiBvcHRzLnR5cGUsXG4gICAgICAgICAgbmFtZTogb3B0cy5uYW1lLFxuICAgICAgICAgIC4uLihvcHRzLmdvdmVybmFuY2VSb2xlICE9PSB1bmRlZmluZWQgPyB7IGdvdmVybmFuY2VSb2xlOiBvcHRzLmdvdmVybmFuY2VSb2xlIH0gOiB7fSksXG4gICAgICAgIH0pLFxuICAgICAgKSxcbiAgICApO1xuXG4gIHdpdGhDbGllbnRGbGFncyhwcm9ncmFtLmNvbW1hbmQoJ2dyYW50IDxhY3RvcklkPiA8cGVybWlzc2lvbj4nKSlcbiAgICAuZGVzY3JpcHRpb24oJ2dyYW50IGEgcGVybWlzc2lvbiB0byBhbiBhY3RvciAoYWRtaW4gb25seSknKVxuICAgIC5hY3Rpb24oYXN5bmMgKGFjdG9ySWQ6IHN0cmluZywgcGVybWlzc2lvbjogc3RyaW5nLCBvcHRzOiBDbGllbnRGbGFncykgPT5cbiAgICAgIGVtaXQoKCkgPT4gZ3JhbnRDb21tYW5kKGNsaWVudEZyb20ob3B0cyksIHsgYWN0b3JJZCwgcGVybWlzc2lvbiB9KSksXG4gICAgKTtcblxuICAvLyAtLSBlbnRpdGxlbWVudHMgKFBoYXNlIDIsIHJvYWRtYXAgXHUwMEE3MykgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIGNvbnN0IHJvbGUgPSBwcm9ncmFtLmNvbW1hbmQoJ3JvbGUnKS5kZXNjcmlwdGlvbignZGVsaXZlcnkgcm9sZXMgXHUyMDE0IHBlcm1pc3Npb24gYnVuZGxlcyAocm9hZG1hcCBcdTAwQTczKScpO1xuICB3aXRoQ2xpZW50RmxhZ3Mocm9sZS5jb21tYW5kKCdhc3NpZ24gPGFjdG9ySWQ+IDxyb2xlQ29kZT4nKSlcbiAgICAuZGVzY3JpcHRpb24oJ2Fzc2lnbiBhIGRlbGl2ZXJ5IHJvbGUgdG8gYW4gYWN0b3IgKGdvdmVybmFuY2UtYWRtaW4gb25seSwgZW5naW5lLWdhdGVkKScpXG4gICAgLmFjdGlvbihhc3luYyAoYWN0b3JJZDogc3RyaW5nLCByb2xlQ29kZTogc3RyaW5nLCBvcHRzOiBDbGllbnRGbGFncykgPT5cbiAgICAgIGVtaXQoKCkgPT4gcm9sZUFzc2lnbkNvbW1hbmQoY2xpZW50RnJvbShvcHRzKSwgeyBhY3RvcklkLCByb2xlQ29kZSB9KSksXG4gICAgKTtcbiAgd2l0aENsaWVudEZsYWdzKHJvbGUuY29tbWFuZCgncmV2b2tlIDxhY3RvcklkPiA8cm9sZUNvZGU+JykpXG4gICAgLmRlc2NyaXB0aW9uKCdyZXZva2UgYSBkZWxpdmVyeSByb2xlIGZyb20gYW4gYWN0b3IgKGdvdmVybmFuY2UtYWRtaW4gb25seSwgZW5naW5lLWdhdGVkKScpXG4gICAgLmFjdGlvbihhc3luYyAoYWN0b3JJZDogc3RyaW5nLCByb2xlQ29kZTogc3RyaW5nLCBvcHRzOiBDbGllbnRGbGFncykgPT5cbiAgICAgIGVtaXQoKCkgPT4gcm9sZVJldm9rZUNvbW1hbmQoY2xpZW50RnJvbShvcHRzKSwgeyBhY3RvcklkLCByb2xlQ29kZSB9KSksXG4gICAgKTtcbiAgd2l0aENsaWVudEZsYWdzKHJvbGUuY29tbWFuZCgnbGlzdCBbYWN0b3JJZF0nKSlcbiAgICAuZGVzY3JpcHRpb24oJ2xpc3QgZGVsaXZlcnktcm9sZSBhc3NpZ25tZW50cyAoYWxsLCBvciBvbmUgYWN0b3IpJylcbiAgICAuYWN0aW9uKGFzeW5jIChhY3RvcklkOiBzdHJpbmcgfCB1bmRlZmluZWQsIG9wdHM6IENsaWVudEZsYWdzKSA9PlxuICAgICAgZW1pdCgoKSA9PiByb2xlTGlzdENvbW1hbmQoY2xpZW50RnJvbShvcHRzKSwgYWN0b3JJZCAhPT0gdW5kZWZpbmVkID8geyBhY3RvcklkIH0gOiB7fSkpLFxuICAgICk7XG5cbiAgY29uc3QgcGxhbiA9IHByb2dyYW0uY29tbWFuZCgncGxhbicpLmRlc2NyaXB0aW9uKCd3b3Jrc3BhY2UgcGxhbiBcdTIwMTQgYSBjZWlsaW5nLCBuZXZlciBhIGdyYW50IChyb2FkbWFwIFx1MDBBNzMpJyk7XG4gIHdpdGhDbGllbnRGbGFncyhwbGFuLmNvbW1hbmQoJ3NldCA8cGxhbj4nKSlcbiAgICAuZGVzY3JpcHRpb24oJ3NldCB0aGUgd29ya3NwYWNlIHBsYW46IGZyZWUgfCB0ZWFtIHwgZW50ZXJwcmlzZSAoZ292ZXJuYW5jZS1hZG1pbiBvbmx5KScpXG4gICAgLmFjdGlvbihhc3luYyAocGxhbkNvZGU6IHN0cmluZywgb3B0czogQ2xpZW50RmxhZ3MpID0+XG4gICAgICBlbWl0KCgpID0+IHBsYW5TZXRDb21tYW5kKGNsaWVudEZyb20ob3B0cyksIHsgcGxhbjogcGxhbkNvZGUgfSkpLFxuICAgICk7XG5cbiAgY29uc3QgcG9saWN5ID0gcHJvZ3JhbS5jb21tYW5kKCdwb2xpY3knKS5kZXNjcmlwdGlvbigncmVzdHJpY3Qtb25seSB3b3Jrc3BhY2UgcG9saWN5IChyb2FkbWFwIFx1MDBBNzMpJyk7XG4gIHdpdGhDbGllbnRGbGFncyhwb2xpY3kuY29tbWFuZCgnc2V0JykpXG4gICAgLmRlc2NyaXB0aW9uKCdzZXQgcmVzdHJpY3Qtb25seSBwb2xpY3kga2V5cyAoZ292ZXJuYW5jZS1hZG1pbiBvbmx5KScpXG4gICAgLm9wdGlvbignLS1hZ2VudC1nYXRlLWFwcHJvdmFscyA8Ym9vbD4nLCAndHJ1ZSB8IGZhbHNlIFx1MjAxNCBtYXkgYWdlbnRzIGV4ZXJjaXNlIGdhdGUgYXBwcm92YWxzPycpXG4gICAgLm9wdGlvbignLS1hZ2VudC1zZWxmLWRpc3BhdGNoIDxib29sPicsICd0cnVlIHwgZmFsc2UgXHUyMDE0IG1heSBhZ2VudHMgY2xhaW0gdGFza3Mgb24gdGhlaXIgb3duPycpXG4gICAgLmFjdGlvbihhc3luYyAob3B0czogQ2xpZW50RmxhZ3MgJiB7IGFnZW50R2F0ZUFwcHJvdmFscz86IHN0cmluZzsgYWdlbnRTZWxmRGlzcGF0Y2g/OiBzdHJpbmcgfSkgPT5cbiAgICAgIGVtaXQoKCkgPT5cbiAgICAgICAgcG9saWN5U2V0Q29tbWFuZChjbGllbnRGcm9tKG9wdHMpLCB7XG4gICAgICAgICAgLi4uKG9wdHMuYWdlbnRHYXRlQXBwcm92YWxzICE9PSB1bmRlZmluZWQgPyB7IGFnZW50R2F0ZUFwcHJvdmFsczogb3B0cy5hZ2VudEdhdGVBcHByb3ZhbHMgfSA6IHt9KSxcbiAgICAgICAgICAuLi4ob3B0cy5hZ2VudFNlbGZEaXNwYXRjaCAhPT0gdW5kZWZpbmVkID8geyBhZ2VudFNlbGZEaXNwYXRjaDogb3B0cy5hZ2VudFNlbGZEaXNwYXRjaCB9IDoge30pLFxuICAgICAgICB9KSxcbiAgICAgICksXG4gICAgKTtcblxuICBjb25zdCBnYXRlUG9saWN5ID0gcHJvZ3JhbS5jb21tYW5kKCdnYXRlLXBvbGljeScpLmRlc2NyaXB0aW9uKCdnYXRlIGRlZmluaXRpb25zIGFzIGRhdGEgKHJvYWRtYXAgXHUwMEE3MyknKTtcbiAgd2l0aENsaWVudEZsYWdzKGdhdGVQb2xpY3kuY29tbWFuZCgnc2V0IDxnYXRlPicpKVxuICAgIC5kZXNjcmlwdGlvbignc2V0IHF1b3J1bS9hY3Rvci10eXBlIHJlcXVpcmVtZW50cyBvZiBhIGdhdGUgKGdvdmVybmFuY2UtYWRtaW4gb25seSknKVxuICAgIC5vcHRpb24oJy0tbWluLWFwcHJvdmFscyA8bj4nLCAnZGlzdGluY3QgYXBwcm92ZXJzIHJlcXVpcmVkIHBlciByZXZpZXcgcm91bmQnKVxuICAgIC5vcHRpb24oJy0tcmVxdWlyZS10eXBlIDx0eXBlPicsICdyZXF1aXJlIGF0IGxlYXN0IG9uZSBhcHByb3ZlciBvZiB0aGlzIHR5cGUgKHJlcGVhdGFibGUpJywgY29sbGVjdCwgW10pXG4gICAgLmFjdGlvbihhc3luYyAoZ2F0ZTogc3RyaW5nLCBvcHRzOiBDbGllbnRGbGFncyAmIHsgbWluQXBwcm92YWxzPzogc3RyaW5nOyByZXF1aXJlVHlwZTogc3RyaW5nW10gfSkgPT5cbiAgICAgIGVtaXQoKCkgPT5cbiAgICAgICAgZ2F0ZVBvbGljeVNldENvbW1hbmQoY2xpZW50RnJvbShvcHRzKSwge1xuICAgICAgICAgIGdhdGUsXG4gICAgICAgICAgLi4uKG9wdHMubWluQXBwcm92YWxzICE9PSB1bmRlZmluZWQgPyB7IG1pbkFwcHJvdmFsczogb3B0cy5taW5BcHByb3ZhbHMgfSA6IHt9KSxcbiAgICAgICAgICAuLi4ob3B0cy5yZXF1aXJlVHlwZS5sZW5ndGggPiAwID8geyByZXF1aXJlVHlwZXM6IG9wdHMucmVxdWlyZVR5cGUgfSA6IHt9KSxcbiAgICAgICAgfSksXG4gICAgICApLFxuICAgICk7XG5cbiAgY29uc3QgZ292ZXJuYW5jZSA9IHByb2dyYW0uY29tbWFuZCgnZ292ZXJuYW5jZScpLmRlc2NyaXB0aW9uKCdnb3Zlcm5hbmNlIHJvbGVzIChyb2FkbWFwIFx1MDBBNzMpJyk7XG4gIHdpdGhDbGllbnRGbGFncyhnb3Zlcm5hbmNlLmNvbW1hbmQoJ3NldCA8YWN0b3JJZD4gPHJvbGU+JykpXG4gICAgLmRlc2NyaXB0aW9uKCdzZXQgYW4gYWN0b3IgZ292ZXJuYW5jZSByb2xlOiBhZG1pbiB8IG1lbWJlciB8IGF1ZGl0b3IgKGdvdmVybmFuY2UtYWRtaW4gb25seSknKVxuICAgIC5hY3Rpb24oYXN5bmMgKGFjdG9ySWQ6IHN0cmluZywgcm9sZUNvZGU6IHN0cmluZywgb3B0czogQ2xpZW50RmxhZ3MpID0+XG4gICAgICBlbWl0KCgpID0+IGdvdmVybmFuY2VTZXRDb21tYW5kKGNsaWVudEZyb20ob3B0cyksIHsgYWN0b3JJZCwgcm9sZTogcm9sZUNvZGUgfSkpLFxuICAgICk7XG5cbiAgd2l0aENsaWVudEZsYWdzKHByb2dyYW0uY29tbWFuZCgnYXV0aHogPGFjdG9ySWQ+IDxwZXJtaXNzaW9uPicpKVxuICAgIC5kZXNjcmlwdGlvbigncHJpbnQgdGhlIHJlcGxheWFibGUgYXV0aHogZGVjaXNpb24gdHJhY2UgZm9yIGFuIGFjdG9yIFx1MDBENyBwZXJtaXNzaW9uIChyb2FkbWFwIFx1MDBBNzMpJylcbiAgICAuYWN0aW9uKGFzeW5jIChhY3RvcklkOiBzdHJpbmcsIHBlcm1pc3Npb246IHN0cmluZywgb3B0czogQ2xpZW50RmxhZ3MpID0+XG4gICAgICBlbWl0KCgpID0+IGF1dGh6Q29tbWFuZChjbGllbnRGcm9tKG9wdHMpLCB7IGFjdG9ySWQsIHBlcm1pc3Npb24gfSkpLFxuICAgICk7XG5cbiAgY29uc3QgZmVhdHVyZSA9IHByb2dyYW0uY29tbWFuZCgnZmVhdHVyZScpLmRlc2NyaXB0aW9uKCdmZWF0dXJlIG1hbmFnZW1lbnQnKTtcbiAgd2l0aENsaWVudEZsYWdzKGZlYXR1cmUuY29tbWFuZCgnY3JlYXRlJykpXG4gICAgLmRlc2NyaXB0aW9uKCdjcmVhdGUgYSBmZWF0dXJlOyBwcmludHMgZmVhdHVyZUlkJylcbiAgICAuYWN0aW9uKGFzeW5jIChvcHRzOiBDbGllbnRGbGFncykgPT4gZW1pdCgoKSA9PiBmZWF0dXJlQ3JlYXRlQ29tbWFuZChjbGllbnRGcm9tKG9wdHMpKSkpO1xuXG4gIHdpdGhDbGllbnRGbGFncyhwcm9ncmFtLmNvbW1hbmQoJ2ltcG9ydCA8ZmVhdHVyZUlkPiA8c3Rvcmllc1lhbWxQYXRoPicpKVxuICAgIC5kZXNjcmlwdGlvbignaW1wb3J0IGEgc3Rvcmllcy55YW1sIGZpbGUgaW50byBhIGZlYXR1cmUgKGlkZW1wb3RlbnQpJylcbiAgICAuYWN0aW9uKGFzeW5jIChmZWF0dXJlSWQ6IHN0cmluZywgc3Rvcmllc1lhbWxQYXRoOiBzdHJpbmcsIG9wdHM6IENsaWVudEZsYWdzKSA9PlxuICAgICAgZW1pdCgoKSA9PiBpbXBvcnRTdG9yaWVzQ29tbWFuZChjbGllbnRGcm9tKG9wdHMpLCB7IGZlYXR1cmVJZCwgcGF0aDogc3Rvcmllc1lhbWxQYXRoIH0pKSxcbiAgICApO1xuXG4gIHdpdGhDbGllbnRGbGFncyhwcm9ncmFtLmNvbW1hbmQoJ2V2ZW50cyBbc3RyZWFtSWRdJykpXG4gICAgLmRlc2NyaXB0aW9uKCdhdWRpdCBxdWVyeSBvdmVyIHRoZSBhcHBlbmQtb25seSBldmVudCBsb2cnKVxuICAgIC5hY3Rpb24oYXN5bmMgKHN0cmVhbUlkOiBzdHJpbmcgfCB1bmRlZmluZWQsIG9wdHM6IENsaWVudEZsYWdzKSA9PlxuICAgICAgZW1pdCgoKSA9PlxuICAgICAgICBldmVudHNDb21tYW5kKGNsaWVudEZyb20ob3B0cyksIHN0cmVhbUlkICE9PSB1bmRlZmluZWQgPyB7IHN0cmVhbUlkIH0gOiB7fSksXG4gICAgICApLFxuICAgICk7XG5cbiAgLy8gLS0gd29yayAocnVubmVyIGhhbmRvZmY7IEBvYWhzL3J1bm5lciBsYW5kcyB3aXRoIHN0b3J5IDE0KSAtLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHdpdGhDbGllbnRGbGFncyhwcm9ncmFtLmNvbW1hbmQoJ3dvcmsnKSlcbiAgICAuZGVzY3JpcHRpb24oJ3J1biB0aGUgQllPIHdvcmtlciBsb29wIGFnYWluc3QgdGhpcyBzcGluZSAocmVxdWlyZXMgQG9haHMvcnVubmVyKScpXG4gICAgLnJlcXVpcmVkT3B0aW9uKCctLXJlcG8gPHBhdGg+JywgJ3RhcmdldCBwcm9qZWN0IGdpdCBjaGVja291dCcpXG4gICAgLnJlcXVpcmVkT3B0aW9uKCctLXNwZWMtZm9sZGVyIDxyZWw+JywgJ3NwZWMgZm9sZGVyIHJlbGF0aXZlIHRvIHRoZSByZXBvIHJvb3QnKVxuICAgIC5yZXF1aXJlZE9wdGlvbignLS1hZ2VudC1jbWQgPHRlbXBsYXRlPicsICdjb2RpbmctYWdlbnQgY29tbWFuZCB0ZW1wbGF0ZSAoe1NQRUNfRk9MREVSfSB7U1RPUllfSUR9IHtJTlZPS0VfV0lUSH0ge1dPUktUUkVFfSknKVxuICAgIC5vcHRpb24oJy0tb25jZScsICdkaXNwYXRjaCBhdCBtb3N0IG9uZSB3b3JrIGl0ZW0sIHRoZW4gZXhpdCcpXG4gICAgLm9wdGlvbignLS1wb2xsIDxtcz4nLCAncG9sbCBpbnRlcnZhbCBpbiBtaWxsaXNlY29uZHMnKVxuICAgIC5hY3Rpb24oXG4gICAgICBhc3luYyAoXG4gICAgICAgIG9wdHM6IENsaWVudEZsYWdzICYge1xuICAgICAgICAgIHJlcG86IHN0cmluZztcbiAgICAgICAgICBzcGVjRm9sZGVyOiBzdHJpbmc7XG4gICAgICAgICAgYWdlbnRDbWQ6IHN0cmluZztcbiAgICAgICAgICBvbmNlPzogYm9vbGVhbjtcbiAgICAgICAgICBwb2xsPzogc3RyaW5nO1xuICAgICAgICB9LFxuICAgICAgKSA9PiB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgY29uc3QgY2xpZW50ID0gY2xpZW50RnJvbShvcHRzKTtcbiAgICAgICAgICAvLyBMQVpZIGltcG9ydDogdGhlIHJ1bm5lciBpcyBhIGZpeGVkIGludGVyZmFjZSB0aGF0IG1heSBzdGlsbCBiZSBhXG4gICAgICAgICAgLy8gc3R1YiBcdTIwMTQgdGhlIHJlc3Qgb2YgdGhlIENMSSBtdXN0IG5ldmVyIHBheSBmb3IgKG9yIGJyZWFrIG9uKSBpdC5cbiAgICAgICAgICBjb25zdCBydW5uZXIgPSBhd2FpdCBpbXBvcnQoJ0BvYWhzL3J1bm5lcicpO1xuICAgICAgICAgIGF3YWl0IHJ1bm5lci53b3JrTG9vcCh7XG4gICAgICAgICAgICBjbGllbnQsXG4gICAgICAgICAgICByZXBvUGF0aDogcmVzb2x2ZShvcHRzLnJlcG8pLFxuICAgICAgICAgICAgc3BlY0ZvbGRlcjogb3B0cy5zcGVjRm9sZGVyLFxuICAgICAgICAgICAgYWdlbnRDbWQ6IG9wdHMuYWdlbnRDbWQsXG4gICAgICAgICAgICAuLi4ob3B0cy5wb2xsICE9PSB1bmRlZmluZWQgPyB7IHBvbGxNczogTnVtYmVyKG9wdHMucG9sbCkgfSA6IHt9KSxcbiAgICAgICAgICAgIC4uLihvcHRzLm9uY2UgPT09IHRydWUgPyB7IG9uY2U6IHRydWUgfSA6IHt9KSxcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICBjb25zdCBlcnIgPSBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IgOiBuZXcgRXJyb3IoU3RyaW5nKGVycm9yKSk7XG4gICAgICAgICAgcHJvY2Vzcy5zdGRlcnIud3JpdGUoYG9haHMgd29yayBmYWlsZWQgXHUyMDE0ICR7ZXJyLm5hbWV9OiAke2Vyci5tZXNzYWdlfVxcbmApO1xuICAgICAgICAgIHByb2Nlc3MuZXhpdENvZGUgPSAxO1xuICAgICAgICB9XG4gICAgICB9LFxuICAgICk7XG5cbiAgcmV0dXJuIHByb2dyYW07XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBtYWluKGFyZ3Y6IHN0cmluZ1tdID0gcHJvY2Vzcy5hcmd2KTogUHJvbWlzZTx2b2lkPiB7XG4gIGF3YWl0IGJ1aWxkUHJvZ3JhbSgpLnBhcnNlQXN5bmMoYXJndik7XG59XG5cbi8vIEJ1bmRsZWQgYXMgYmluL29haHMubWpzIFx1MjAxNCB0aGUgYnVuZGxlIGVudHJ5cG9pbnQgSVMgdGhlIGV4ZWN1dGFibGUuXG52b2lkIG1haW4oKTtcbiIsICIvKipcbiAqIEBvYWhzL2NvbnRyYWN0cyBcdTIwMTQgdGhlIHNpbmdsZSBzb3VyY2Ugb2YgdHJ1dGggZm9yIGV2ZXJ5IG9haHMgY29tbWFuZC5cbiAqXG4gKiBPbmUgcmVnaXN0cnkgZW50cnkgPSBvbmUgSFRUUCBlbmRwb2ludCAoYFBPU1QgL3JwYy88bmFtZT5gKSA9IG9uZSBNQ1AgdG9vbFxuICogKGBvYWhzXzxuYW1lPmApID0gb25lIHR5cGVkIGNsaWVudCBtZXRob2QuIEJvdGggYWRhcHRlcnMgY2FsbCB0aGUgc2FtZVxuICogY29tbWFuZCBidXMgd2l0aCB0aGUgc2FtZSB6b2QtdmFsaWRhdGVkIGlucHV0LCBzbyBcIk1DUCBzZW1hbnRpY3MgXHUyMjYxIEhUVFBcbiAqIHNlbWFudGljc1wiIGlzIGEgc3RydWN0dXJhbCBjb25zZXF1ZW5jZSwgbm90IGEgcmV2aWV3IGRpc2NpcGxpbmVcbiAqIChwcm9kdWN0LXJvYWRtYXAubWQgXHUwMEE3MC4xIGludmFyaWFudCwgRDUpLlxuICpcbiAqIFRyYW5zcG9ydCBpcyBkZWxpYmVyYXRlbHkgdW5pZm9ybSBSUEMgKG5vIFJFU1QgcGF0aCBwYXJhbWV0ZXJzKTogcGFyaXR5XG4gKiBiZXR3ZWVuIHN1cmZhY2VzIHN0YXlzIG1hY2hpbmUtY2hlY2thYmxlLCBhbmQgdGhlIHBhcml0eSB0ZXN0IGluXG4gKiBhcHBzL3NwaW5lLWFwaSBhc3NlcnRzIGV2ZXJ5IHJlZ2lzdHJ5IGVudHJ5IGV4aXN0cyBvbiBib3RoIHN1cmZhY2VzLlxuICovXG5pbXBvcnQgeyB6IH0gZnJvbSAnem9kJztcbmltcG9ydCB7XG4gIEJMT0NLRURfUkVBU09OUyxcbiAgV09SS19JVEVNX1NUQVRFUyxcbiAgdHlwZSBTcGluZUVuZ2luZSxcbn0gZnJvbSAnQG9haHMvY29yZSc7XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gU2hhcmVkIGZpZWxkIHNjaGVtYXNcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5jb25zdCB3b3JrSXRlbUlkID0gei5zdHJpbmcoKS5taW4oMSkuZGVzY3JpYmUoJ1dvcmsgaXRlbSBpZCAob3IgaXRzIHN0b3JpZXMueWFtbCBleHRlcm5hbEtleSknKTtcbmNvbnN0IGZlbmNpbmdUb2tlbiA9IHpcbiAgLm51bWJlcigpXG4gIC5pbnQoKVxuICAub3B0aW9uYWwoKVxuICAuZGVzY3JpYmUoJ0ZlbmNpbmcgdG9rZW4gb2YgdGhlIGxpdmUgY2xhaW0gXHUyMDE0IHJlcXVpcmVkIGZvciBleGVjdXRpb24tem9uZSBtdXRhdGlvbnMnKTtcblxuY29uc3QgZXZpZGVuY2VTY2hlbWEgPSB6XG4gIC5vYmplY3Qoe1xuICAgIGtpbmQ6IHouZW51bShbJ3Rlc3RfcnVuJywgJ2dpdF9kaWZmJywgJ2NvbW1pdCcsICdoYWx0X3JlcG9ydCcsICdyZXZpZXdfcmVwb3J0JywgJ2RvY19saW50J10pLFxuICAgIHBheWxvYWQ6IHoucmVjb3JkKHouc3RyaW5nKCksIHoudW5rbm93bigpKSxcbiAgfSlcbiAgLmRlc2NyaWJlKCdSYXcgbWFjaGluZS1jb2xsZWN0ZWQgZXZpZGVuY2U7IHRoZSBjb3JlIGNvbXB1dGVzIHZlcmRpY3RzLCB0aGUgcnVubmVyIG5ldmVyIGRvZXMnKTtcblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBSZWdpc3RyeVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbmV4cG9ydCBpbnRlcmZhY2UgQ29tbWFuZERlZjxJbnB1dCBleHRlbmRzIHouWm9kVHlwZSA9IHouWm9kVHlwZT4ge1xuICAvKiogc25ha2VfY2FzZSBjb21tYW5kIG5hbWU7IEhUVFAgcGF0aCBpcyAvcnBjLzxuYW1lPiwgTUNQIHRvb2wgaXMgb2Foc188bmFtZT4gKi9cbiAgbmFtZTogc3RyaW5nO1xuICBkZXNjcmlwdGlvbjogc3RyaW5nO1xuICBpbnB1dDogSW5wdXQ7XG4gIC8qKiB0cnVlIHdoZW4gdGhlIGNvbW1hbmQgb25seSByZWFkcyBzdGF0ZSAodXNlZCBmb3IgZG9jczsgc2FtZSByYWlscyBlaXRoZXIgd2F5KSAqL1xuICByZWFkb25seTogYm9vbGVhbjtcbn1cblxuZnVuY3Rpb24gZGVmPEkgZXh0ZW5kcyB6LlpvZFR5cGU+KFxuICBuYW1lOiBzdHJpbmcsXG4gIGRlc2NyaXB0aW9uOiBzdHJpbmcsXG4gIGlucHV0OiBJLFxuICByZWFkb25seSA9IGZhbHNlLFxuKTogQ29tbWFuZERlZjxJPiB7XG4gIHJldHVybiB7IG5hbWUsIGRlc2NyaXB0aW9uLCBpbnB1dCwgcmVhZG9ubHkgfTtcbn1cblxuZXhwb3J0IGNvbnN0IENPTU1BTkRTID0gW1xuICAvLyAtLSBzZXR1cCAvIGFkbWluIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICBkZWYoXG4gICAgJ2NyZWF0ZV9hY3RvcicsXG4gICAgJ0NyZWF0ZSBhIHVzZXIgb3IgYWdlbnQgYWN0b3IuIFJldHVybnMgdGhlIGFjdG9yIGFuZCBpdHMgQVBJIHRva2VuIChhZG1pbiBvbmx5KS4nLFxuICAgIHoub2JqZWN0KHtcbiAgICAgIHR5cGU6IHouZW51bShbJ3VzZXInLCAnYWdlbnQnXSksXG4gICAgICBkaXNwbGF5TmFtZTogei5zdHJpbmcoKS5taW4oMSksXG4gICAgICBnb3Zlcm5hbmNlUm9sZTogelxuICAgICAgICAuZW51bShbJ2FkbWluJywgJ21lbWJlcicsICdhdWRpdG9yJ10pXG4gICAgICAgIC5vcHRpb25hbCgpXG4gICAgICAgIC5kZXNjcmliZSgnQm9vdHN0cmFwIHBsdW1iaW5nIChyb2FkbWFwIFx1MDBBNzMpOiBpbml0aWFsIGdvdmVybmFuY2Ugcm9sZSBcdTIwMTQgYWRtaW4gY29udGV4dCBvbmx5JyksXG4gICAgfSksXG4gICksXG4gIGRlZihcbiAgICAnZ3JhbnRfcGVybWlzc2lvbicsXG4gICAgJ0dyYW50IGEgcGVybWlzc2lvbiB0byBhbiBhY3RvciAoYWRtaW4gb25seSkuIEdyYW50cyBhcmUgZXhwbGljaXQgYW5kIGF1ZGl0ZWQgXHUyMDE0IGF1dGhvcml0eSBuZXZlciBjb21lcyBmcm9tIGFjdG9yIHR5cGUsIHRlbnVyZSwgb3IgbWVtb3J5ICh0aGVzaXMgXHUwMEE3MykuJyxcbiAgICB6Lm9iamVjdCh7XG4gICAgICBhY3RvcklkOiB6LnN0cmluZygpLm1pbigxKSxcbiAgICAgIHBlcm1pc3Npb246IHouc3RyaW5nKCkubWluKDEpLFxuICAgICAgc2NvcGU6IHouc3RyaW5nKCkub3B0aW9uYWwoKSxcbiAgICB9KSxcbiAgKSxcbiAgZGVmKFxuICAgICdyZXZva2VfcGVybWlzc2lvbicsXG4gICAgJ1Jldm9rZSBhIHBlcm1pc3Npb24gZnJvbSBhbiBhY3RvciAoYWRtaW4gb25seSkuJyxcbiAgICB6Lm9iamVjdCh7XG4gICAgICBhY3RvcklkOiB6LnN0cmluZygpLm1pbigxKSxcbiAgICAgIHBlcm1pc3Npb246IHouc3RyaW5nKCkubWluKDEpLFxuICAgICAgc2NvcGU6IHouc3RyaW5nKCkub3B0aW9uYWwoKSxcbiAgICB9KSxcbiAgKSxcbiAgZGVmKCdjcmVhdGVfZmVhdHVyZScsICdDcmVhdGUgYSBmZWF0dXJlIChtYXBzIGEgQk1BRCBlcGljKS4nLCB6Lm9iamVjdCh7fSkpLFxuICBkZWYoXG4gICAgJ2ltcG9ydF9zdG9yaWVzJyxcbiAgICAnSW1wb3J0IGEgc3Rvcmllcy55YW1sIGZpbGUgaW50byBhIGZlYXR1cmUgKGlkZW1wb3RlbnQgcmUtaW1wb3J0OyB2YWxpZGl0eSBydWxlcyBmcm9tIHN0b3JpZXMtc2NoZW1hLm1kKS4nLFxuICAgIHoub2JqZWN0KHtcbiAgICAgIGZlYXR1cmVJZDogei5zdHJpbmcoKS5taW4oMSksXG4gICAgICB5YW1sOiB6LnN0cmluZygpLm1pbigxKSxcbiAgICB9KSxcbiAgKSxcblxuICAvLyAtLSBjbGFpbXMgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICBkZWYoXG4gICAgJ2NsYWltX3Rhc2snLFxuICAgICdDbGFpbSBhIHdvcmsgaXRlbSB1bmRlciBhIGxlYXNlLiBSZXR1cm5zIHRoZSBjbGFpbSB3aXRoIGl0cyBmZW5jaW5nIHRva2VuLicsXG4gICAgei5vYmplY3Qoe1xuICAgICAgd29ya0l0ZW1JZCxcbiAgICAgIHR0bE1zOiB6Lm51bWJlcigpLmludCgpLnBvc2l0aXZlKCkub3B0aW9uYWwoKSxcbiAgICB9KSxcbiAgKSxcbiAgZGVmKCdoZWFydGJlYXQnLCAnUmVuZXcgdGhlIGxlYXNlIG9mIGEgbGl2ZSBjbGFpbS4nLCB6Lm9iamVjdCh7IGNsYWltSWQ6IHouc3RyaW5nKCkubWluKDEpIH0pKSxcbiAgZGVmKFxuICAgICdyZWxlYXNlX2NsYWltJyxcbiAgICAnUmVsZWFzZSBhIGNsYWltIChub3JtYWwgY29tcGxldGlvbiBvciB2b2x1bnRhcnkgaGFuZG9mZikuJyxcbiAgICB6Lm9iamVjdCh7IGNsYWltSWQ6IHouc3RyaW5nKCkubWluKDEpLCByZWFzb246IHouc3RyaW5nKCkub3B0aW9uYWwoKSB9KSxcbiAgKSxcblxuICAvLyAtLSBsaWZlY3ljbGUgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIGRlZihcbiAgICAnYWR2YW5jZV9zdGF0ZScsXG4gICAgJ0FkdmFuY2UgYSB3b3JrIGl0ZW0gdGhyb3VnaCB0aGUgRlNNLiBEZXRlcm1pbmlzdGljOiBwZXJtaXNzaW9uICsgZ3VhcmRzICsgZXZpZGVuY2UgZGVjaWRlLCBuZXZlciBpbnRlcnByZXRhdGlvbi4nLFxuICAgIHoub2JqZWN0KHtcbiAgICAgIHdvcmtJdGVtSWQsXG4gICAgICB0bzogei5lbnVtKFdPUktfSVRFTV9TVEFURVMpLFxuICAgICAgZmVuY2luZ1Rva2VuLFxuICAgICAgaWRlbXBvdGVuY3lLZXk6IHouc3RyaW5nKCkub3B0aW9uYWwoKSxcbiAgICB9KSxcbiAgKSxcbiAgZGVmKFxuICAgICdibG9ja190YXNrJyxcbiAgICAnU2V0IHRoZSBibG9ja2VkIG92ZXJsYXkgd2l0aCBhIGJsb2NraW5nIGNvbmRpdGlvbiBmcm9tIHRoZSBIQUxUIHRheG9ub215LicsXG4gICAgei5vYmplY3Qoe1xuICAgICAgd29ya0l0ZW1JZCxcbiAgICAgIHJlYXNvbjogei5lbnVtKEJMT0NLRURfUkVBU09OUyksXG4gICAgICBmZW5jaW5nVG9rZW4sXG4gICAgfSksXG4gICksXG4gIGRlZigndW5ibG9ja190YXNrJywgJ0NsZWFyIHRoZSBibG9ja2VkIG92ZXJsYXkgKHJldmlld19ub25fY29udmVyZ2VuY2UgbmVlZHMgdGhlIHJldmlldyBnYXRlIGdyYW50KS4nLCB6Lm9iamVjdCh7IHdvcmtJdGVtSWQgfSkpLFxuICBkZWYoXG4gICAgJ3N1Ym1pdF9ldmlkZW5jZScsXG4gICAgJ1N1Ym1pdCByYXcgbWFjaGluZS1jb2xsZWN0ZWQgZXZpZGVuY2UgKGV4aXQgY29kZXMsIGRpZmYgc3RhdHMsIHNoYXMpLiBUaGUgY29yZSBjb21wdXRlcyB2ZXJkaWN0cy4nLFxuICAgIHoub2JqZWN0KHsgd29ya0l0ZW1JZCwgZXZpZGVuY2U6IGV2aWRlbmNlU2NoZW1hLCBmZW5jaW5nVG9rZW4gfSksXG4gICksXG4gIGRlZihcbiAgICAnYXBwcm92ZV9nYXRlJyxcbiAgICAnQXBwcm92ZSBhIGdhdGUgYXMgYSBwZXJtaXR0ZWQgYWN0b3IuIHNwZWNfYXBwcm92YWwgcGlucyB0aGUgdmVyaWZpY2F0aW9uIGNvbW1hbmRzIChENykgYW5kIGZpcmVzIGRyYWZ0XHUyMTkycmVhZHlfZm9yX2RldjsgcmV2aWV3X2FwcHJvdmFsIGNoZWNrcyBwaW5uZWQgZXZpZGVuY2UgYW5kIGZpcmVzIGluX3Jldmlld1x1MjE5MmRvbmUuJyxcbiAgICB6Lm9iamVjdCh7XG4gICAgICB3b3JrSXRlbUlkLFxuICAgICAgZ2F0ZTogei5lbnVtKFsnc3BlY19hcHByb3ZhbCcsICdyZXZpZXdfYXBwcm92YWwnXSksXG4gICAgICBwaW5uZWRWZXJpZmljYXRpb246IHouYXJyYXkoei5zdHJpbmcoKSkub3B0aW9uYWwoKSxcbiAgICB9KSxcbiAgKSxcbiAgZGVmKFxuICAgICdyZWplY3RfZ2F0ZScsXG4gICAgJ1JlamVjdCBhIGdhdGUgYXMgYSBwZXJtaXR0ZWQgYWN0b3IuIFJldmlldyByZWplY3Rpb24gZmlyZXMgdGhlIGxvb3BiYWNrIGFzIGEgc3lzdGVtIGVmZmVjdCAob3IgYmxvY2tzIHdpdGggcmV2aWV3X25vbl9jb252ZXJnZW5jZSBvbiB0aGUgNnRoKS4nLFxuICAgIHoub2JqZWN0KHtcbiAgICAgIHdvcmtJdGVtSWQsXG4gICAgICBnYXRlOiB6LmVudW0oWydzcGVjX2FwcHJvdmFsJywgJ3Jldmlld19hcHByb3ZhbCddKSxcbiAgICB9KSxcbiAgKSxcbiAgZGVmKFxuICAgICdyZWxlYXNlX2Rpc3BhdGNoX2hvbGQnLFxuICAgICdSZWxlYXNlIGEgZG9uZV9jaGVja3BvaW50IGRpc3BhdGNoIGhvbGQgb24gYSBmZWF0dXJlIChwZXJtaXR0ZWQgYWN0b3JzIG9ubHkpLicsXG4gICAgei5vYmplY3QoeyBmZWF0dXJlSWQ6IHouc3RyaW5nKCkubWluKDEpIH0pLFxuICApLFxuXG4gIC8vIC0tIGVudGl0bGVtZW50cyAoUGhhc2UgMiwgcm9hZG1hcCBcdTAwQTczKSAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgLy8gQXV0aG9yaXR5IGZvciB0aGlzIGdyb3VwIGlzIGRlY2lkZWQgYnkgdGhlIEVOR0lORSBmcm9tIHRoZSBjYWxsZXInc1xuICAvLyBnb3Zlcm5hbmNlIHJvbGUgKFwiZW50aXRsZW1lbnQgPSBwbGFuIFx1MDBENyBnb3Zlcm5hbmNlIHJvbGUgXHUwMEQ3IGRlbGl2ZXJ5IHJvbGUsXG4gIC8vIHJlc29sdmVkIGJ5IGEgcHVyZSBmdW5jdGlvbiBvdmVyIHZlcnNpb25lZCBjb25maWcvZGF0YVwiKSBcdTIwMTQgdGhlIGJ1cyBuZXZlclxuICAvLyBwcmUtY2hlY2tzIGFkbWluIGhlcmUuXG4gIGRlZihcbiAgICAnYXNzaWduX3JvbGUnLFxuICAgICdBc3NpZ24gYSBkZWxpdmVyeSByb2xlIChwZXJtaXNzaW9uIGJ1bmRsZSwgcm9hZG1hcCBcdTAwQTczKSB0byBhbiBhY3Rvci4gR2F0ZWQgd3JpdGU6IHJlcXVpcmVzIGdvdmVybmFuY2UtYWRtaW4gYXV0aG9yaXR5OyBhdWRpdGVkLicsXG4gICAgei5vYmplY3Qoe1xuICAgICAgYWN0b3JJZDogei5zdHJpbmcoKS5taW4oMSksXG4gICAgICByb2xlQ29kZTogei5zdHJpbmcoKS5taW4oMSkuZGVzY3JpYmUoJ0RlbGl2ZXJ5IHJvbGUgY29kZSwgZS5nLiByZXZpZXdlciB8IGRldmVsb3BlciB8IHByb2R1Y3Rfb3duZXInKSxcbiAgICB9KSxcbiAgKSxcbiAgZGVmKFxuICAgICdyZXZva2Vfcm9sZScsXG4gICAgJ1Jldm9rZSBhIGRlbGl2ZXJ5IHJvbGUgYXNzaWdubWVudCBmcm9tIGFuIGFjdG9yLiBHYXRlZCB3cml0ZTogcmVxdWlyZXMgZ292ZXJuYW5jZS1hZG1pbiBhdXRob3JpdHk7IGF1ZGl0ZWQuJyxcbiAgICB6Lm9iamVjdCh7XG4gICAgICBhY3RvcklkOiB6LnN0cmluZygpLm1pbigxKSxcbiAgICAgIHJvbGVDb2RlOiB6LnN0cmluZygpLm1pbigxKSxcbiAgICB9KSxcbiAgKSxcbiAgZGVmKFxuICAgICdsaXN0X3JvbGVfYXNzaWdubWVudHMnLFxuICAgICdMaXN0IGRlbGl2ZXJ5LXJvbGUgYXNzaWdubWVudHMgKGFsbCwgb3Igb25lIGFjdG9yXHUyMDE5cyksIGluY2x1ZGluZyByZXZva2VkIHJvd3MgZm9yIGF1ZGl0LicsXG4gICAgei5vYmplY3QoeyBhY3RvcklkOiB6LnN0cmluZygpLm1pbigxKS5vcHRpb25hbCgpIH0pLFxuICAgIHRydWUsXG4gICksXG4gIGRlZihcbiAgICAnc2V0X2dvdmVybmFuY2Vfcm9sZScsXG4gICAgJ1NldCBhbiBhY3Rvclx1MjAxOXMgZ292ZXJuYW5jZSByb2xlIChhZG1pbiB8IG1lbWJlciB8IGF1ZGl0b3IpLiBHYXRlZCB3cml0ZTogcmVxdWlyZXMgZ292ZXJuYW5jZS1hZG1pbiBhdXRob3JpdHkuJyxcbiAgICB6Lm9iamVjdCh7XG4gICAgICBhY3RvcklkOiB6LnN0cmluZygpLm1pbigxKSxcbiAgICAgIHJvbGU6IHouZW51bShbJ2FkbWluJywgJ21lbWJlcicsICdhdWRpdG9yJ10pLFxuICAgIH0pLFxuICApLFxuICBkZWYoXG4gICAgJ3NldF9wbGFuJyxcbiAgICAnU2V0IHRoZSB3b3Jrc3BhY2UgcGxhbi4gUGxhbiBpcyBhIENFSUxJTkcsIG5ldmVyIGEgZ3JhbnQgKHJvYWRtYXAgXHUwMEE3Myk6IGl0IGJvdW5kcyB3aGF0IGFnZW50cyBtYXkgaG9sZC9leGVyY2lzZTsgdXNlcnMgYXJlIG5ldmVyIHBsYW4tZmlsdGVyZWQuJyxcbiAgICB6Lm9iamVjdCh7IHBsYW46IHouZW51bShbJ2ZyZWUnLCAndGVhbScsICdlbnRlcnByaXNlJ10pIH0pLFxuICApLFxuICBkZWYoXG4gICAgJ3NldF93b3Jrc3BhY2VfcG9saWN5JyxcbiAgICAnU2V0IHJlc3RyaWN0LW9ubHkgd29ya3NwYWNlIHBvbGljeSBrZXlzIChyb2FkbWFwIFx1MDBBNzMpOiBhIHBvbGljeSBjYW4gbmFycm93IHdoYXQgdGhlIHBsYW4gYWxsb3dzLCBuZXZlciB3aWRlbiBpdC4nLFxuICAgIHoub2JqZWN0KHtcbiAgICAgIHBvbGljeTogei5vYmplY3Qoe1xuICAgICAgICBhZ2VudEdhdGVBcHByb3ZhbHM6IHpcbiAgICAgICAgICAuYm9vbGVhbigpXG4gICAgICAgICAgLm9wdGlvbmFsKClcbiAgICAgICAgICAuZGVzY3JpYmUoJ2ZhbHNlIFx1MjFEMiBhZ2VudHMgY2Fubm90IGV4ZXJjaXNlIGdhdGUtYXBwcm92YWwgcGVybWlzc2lvbnMgZXZlbiBpZiBncmFudGVkJyksXG4gICAgICAgIGFnZW50U2VsZkRpc3BhdGNoOiB6XG4gICAgICAgICAgLmJvb2xlYW4oKVxuICAgICAgICAgIC5vcHRpb25hbCgpXG4gICAgICAgICAgLmRlc2NyaWJlKCdmYWxzZSBcdTIxRDIgYWdlbnRzIGNhbm5vdCBjbGFpbSB0YXNrcyBvbiB0aGVpciBvd24gKG1lbnRpb24tZGlzcGF0Y2ggb25seSknKSxcbiAgICAgIH0pLFxuICAgIH0pLFxuICApLFxuICBkZWYoXG4gICAgJ3NldF9nYXRlX3BvbGljeScsXG4gICAgJ1NldCBhIGdhdGUgZGVmaW5pdGlvbiBhcyBEQVRBIChyb2FkbWFwIFx1MDBBNzMpOiBtaW5fYXBwcm92YWxzIHF1b3J1bSBhbmQgcmVxdWlyZWRfYWN0b3JfdHlwZXMgXHUyMDE0IGh1bWFuLW9ubHkgaXMgYSBkZWZhdWx0LCBub3QgYSBoYXJkY29kZS4nLFxuICAgIHoub2JqZWN0KHtcbiAgICAgIGdhdGU6IHouZW51bShbJ3NwZWNfYXBwcm92YWwnLCAncmV2aWV3X2FwcHJvdmFsJ10pLFxuICAgICAgcG9saWN5OiB6Lm9iamVjdCh7XG4gICAgICAgIG1pbkFwcHJvdmFsczogei5udW1iZXIoKS5pbnQoKS5wb3NpdGl2ZSgpLm9wdGlvbmFsKCkuZGVzY3JpYmUoJ2Rpc3RpbmN0IGFwcHJvdmVycyByZXF1aXJlZCBwZXIgcmV2aWV3IHJvdW5kJyksXG4gICAgICAgIHJlcXVpcmVkQWN0b3JUeXBlczogelxuICAgICAgICAgIC5hcnJheSh6LmVudW0oWyd1c2VyJywgJ2FnZW50JywgJ3N5c3RlbSddKSlcbiAgICAgICAgICAub3B0aW9uYWwoKVxuICAgICAgICAgIC5kZXNjcmliZSgnYXQgbGVhc3Qgb25lIGFwcHJvdmVyIG9mIGVhY2ggbGlzdGVkIHR5cGUgaXMgcmVxdWlyZWQnKSxcbiAgICAgIH0pLFxuICAgIH0pLFxuICApLFxuICBkZWYoXG4gICAgJ2F1dGh6X2V4cGxhaW4nLFxuICAgICdSZXBsYXlhYmxlIGF1dGh6IGRlY2lzaW9uIHRyYWNlIChyb2FkbWFwIFx1MDBBNzMpOiBzb3VyY2UgZ3JhbnQvcm9sZSwgcGxhbiBjZWlsaW5nLCBwb2xpY3ksIGFuZCB0aGUgcG9saWN5IHZlcnNpb24gdHVwbGUgYW4gYXVkaXRvciBjYW4gcmVwbGF5LicsXG4gICAgei5vYmplY3Qoe1xuICAgICAgYWN0b3JJZDogei5zdHJpbmcoKS5taW4oMSksXG4gICAgICBwZXJtaXNzaW9uOiB6LnN0cmluZygpLm1pbigxKSxcbiAgICB9KSxcbiAgICB0cnVlLFxuICApLFxuXG4gIC8vIC0tIG9wcyAoc28gbm9ib2R5IGV2ZXIgbmVlZHMgdG8gdG91Y2ggdGhlIERCIGJ5IGhhbmQpIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIGRlZihcbiAgICAnZm9yY2VfcmVsZWFzZV9jbGFpbScsXG4gICAgJ09wczogZm9yY2UtcmVsZWFzZSB0aGUgbGl2ZSBjbGFpbSBvZiBhIHdvcmsgaXRlbSAoc3R1Y2sgcnVubmVyLCBsb3N0IG1hY2hpbmUpLicsXG4gICAgei5vYmplY3QoeyB3b3JrSXRlbUlkIH0pLFxuICApLFxuXG4gIC8vIC0tIHF1ZXJpZXMgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgZGVmKCdnZXRfd29ya19pdGVtJywgJ0ZldGNoIG9uZSB3b3JrIGl0ZW0gYnkgaWQgb3IgZXh0ZXJuYWxLZXkuJywgei5vYmplY3QoeyB3b3JrSXRlbUlkIH0pLCB0cnVlKSxcbiAgZGVmKCdnZXRfZmVhdHVyZScsICdGZXRjaCBvbmUgZmVhdHVyZS4nLCB6Lm9iamVjdCh7IGZlYXR1cmVJZDogei5zdHJpbmcoKS5taW4oMSkgfSksIHRydWUpLFxuICBkZWYoXG4gICAgJ2dldF90YXNrX2NvbnRleHQnLFxuICAgICdEaXNwYXRjaCBjb250ZXh0IGZvciBhIHJ1bm5lcjogZW50cnkgc3RhdGUgcm91dGluZyBwZXIgZGV2LWF1dG8uIFJlZnVzZXMgZG9uZSBpdGVtcyBhbmQgaGVsZCBmZWF0dXJlcy4nLFxuICAgIHoub2JqZWN0KHsgd29ya0l0ZW1JZCB9KSxcbiAgICB0cnVlLFxuICApLFxuICBkZWYoXG4gICAgJ2xpc3Rfd29ya19pdGVtcycsXG4gICAgJ0xpc3Qgd29yayBpdGVtcywgb3B0aW9uYWxseSBmaWx0ZXJlZCBieSBzdGF0ZSAvIGZlYXR1cmUgLyBjbGFpbWFiaWxpdHkuJyxcbiAgICB6Lm9iamVjdCh7XG4gICAgICBzdGF0ZTogei5lbnVtKFdPUktfSVRFTV9TVEFURVMpLm9wdGlvbmFsKCksXG4gICAgICBmZWF0dXJlSWQ6IHouc3RyaW5nKCkub3B0aW9uYWwoKSxcbiAgICAgIGNsYWltYWJsZTogei5ib29sZWFuKCkub3B0aW9uYWwoKS5kZXNjcmliZSgndHJ1ZSA9IG5vIGxpdmUgY2xhaW0gb24gdGhlIGl0ZW0nKSxcbiAgICB9KSxcbiAgICB0cnVlLFxuICApLFxuICBkZWYoXG4gICAgJ2luYm94JyxcbiAgICAnR2F0ZS1ob2xkZXIgaW5ib3g6IGl0ZW1zIGF3YWl0aW5nIGEgZ2F0ZSBkZWNpc2lvbiAoZHJhZnQrc3BlY19jaGVja3BvaW50IGF3YWl0aW5nIHNwZWMgYXBwcm92YWw7IGluX3JldmlldyBhd2FpdGluZyByZXZpZXcgZGVjaXNpb24pLicsXG4gICAgei5vYmplY3Qoe30pLFxuICAgIHRydWUsXG4gICksXG4gIGRlZihcbiAgICAncXVlcnlfZXZlbnRzJyxcbiAgICAnQXVkaXQgcXVlcnk6IHRoZSBhcHBlbmQtb25seSBldmVudCBsb2csIG9wdGlvbmFsbHkgc2NvcGVkIHRvIG9uZSBzdHJlYW0uJyxcbiAgICB6Lm9iamVjdCh7IHN0cmVhbUlkOiB6LnN0cmluZygpLm9wdGlvbmFsKCkgfSksXG4gICAgdHJ1ZSxcbiAgKSxcbiAgZGVmKCdnZXRfY2xhaW1zJywgJ0FsbCBjbGFpbXMgKGxpdmUgYW5kIHJlbGVhc2VkKSBvZiBhIHdvcmsgaXRlbS4nLCB6Lm9iamVjdCh7IHdvcmtJdGVtSWQgfSksIHRydWUpLFxuICBkZWYoJ3dob2FtaScsICdSZXNvbHZlIHRoZSBhdXRoZW50aWNhdGVkIGFjdG9yLicsIHoub2JqZWN0KHt9KSwgdHJ1ZSksXG5dIGFzIGNvbnN0O1xuXG5leHBvcnQgdHlwZSBDb21tYW5kTmFtZSA9ICh0eXBlb2YgQ09NTUFORFMpW251bWJlcl1bJ25hbWUnXTtcblxuZXhwb3J0IGNvbnN0IENPTU1BTkRfTUFQOiBSZWFkb25seU1hcDxzdHJpbmcsIENvbW1hbmREZWY+ID0gbmV3IE1hcChcbiAgQ09NTUFORFMubWFwKChjKSA9PiBbYy5uYW1lLCBjIGFzIENvbW1hbmREZWZdKSxcbik7XG5cbi8qKiBNQ1AgdG9vbCBuYW1lIGZvciBhIGNvbW1hbmQgKHVuaWZvcm0gcHJlZml4LCBEMTEgdm9jYWJ1bGFyeSkuICovXG5leHBvcnQgZnVuY3Rpb24gbWNwVG9vbE5hbWUoY29tbWFuZDogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIGBvYWhzXyR7Y29tbWFuZH1gO1xufVxuXG4vKiogSlNPTiBTY2hlbWEgZm9yIGEgY29tbWFuZCBpbnB1dCAoem9kIHY0IG5hdGl2ZSBlbWl0dGVyKSBcdTIwMTQgdXNlZCB2ZXJiYXRpbSBhcyB0aGUgTUNQIHRvb2wgaW5wdXRTY2hlbWEuICovXG5leHBvcnQgZnVuY3Rpb24gaW5wdXRKc29uU2NoZW1hKGNvbW1hbmQ6IHN0cmluZyk6IFJlY29yZDxzdHJpbmcsIHVua25vd24+IHtcbiAgY29uc3QgZGVmbiA9IENPTU1BTkRfTUFQLmdldChjb21tYW5kKTtcbiAgaWYgKCFkZWZuKSB0aHJvdyBuZXcgRXJyb3IoYHVua25vd24gY29tbWFuZDogJHtjb21tYW5kfWApO1xuICByZXR1cm4gei50b0pTT05TY2hlbWEoZGVmbi5pbnB1dCkgYXMgUmVjb3JkPHN0cmluZywgdW5rbm93bj47XG59XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gV2lyZSBlbnZlbG9wZVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbi8qKlxuICogRXZlcnkgcmVqZWN0aW9uIGNyb3NzZXMgdGhlIHdpcmUgYXMgYSBtYWNoaW5lLXJlYWRhYmxlIGVudmVsb3BlIGNhcnJ5aW5nXG4gKiB0aGUgY29yZSBlcnJvciBjbGFzcyBuYW1lIFx1MjAxNCBjbGllbnRzIHJldGhyb3cgdGhlIHByb3BlciBjbGFzcywgc28gZXJyb3JcbiAqIHNlbWFudGljcyBzdXJ2aXZlIHRoZSB0cmFuc3BvcnQgKDQwOSBmb3IgY29uZmxpY3RzLCA0MDMgZm9yIHBlcm1pc3Npb24sXG4gKiA0MjIgZm9yIGd1YXJkcy90cmFuc2l0aW9ucy92YWxpZGF0aW9uKS5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBFcnJvckVudmVsb3BlIHtcbiAgb2s6IGZhbHNlO1xuICBlcnJvcjoge1xuICAgIG5hbWU6XG4gICAgICB8ICdQZXJtaXNzaW9uRGVuaWVkRXJyb3InXG4gICAgICB8ICdHdWFyZEZhaWxlZEVycm9yJ1xuICAgICAgfCAnQ29uZmxpY3RFcnJvcidcbiAgICAgIHwgJ0ludmFsaWRUcmFuc2l0aW9uRXJyb3InXG4gICAgICB8ICdTdG9yaWVzVmFsaWRhdGlvbkVycm9yJ1xuICAgICAgfCAnRXJyb3InO1xuICAgIG1lc3NhZ2U6IHN0cmluZztcbiAgfTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBPa0VudmVsb3BlPFQgPSB1bmtub3duPiB7XG4gIG9rOiB0cnVlO1xuICByZXN1bHQ6IFQ7XG59XG5cbmV4cG9ydCB0eXBlIEVudmVsb3BlPFQgPSB1bmtub3duPiA9IE9rRW52ZWxvcGU8VD4gfCBFcnJvckVudmVsb3BlO1xuXG5leHBvcnQgY29uc3QgSFRUUF9TVEFUVVM6IFJlY29yZDxFcnJvckVudmVsb3BlWydlcnJvciddWyduYW1lJ10sIG51bWJlcj4gPSB7XG4gIFBlcm1pc3Npb25EZW5pZWRFcnJvcjogNDAzLFxuICBDb25mbGljdEVycm9yOiA0MDksXG4gIEd1YXJkRmFpbGVkRXJyb3I6IDQyMixcbiAgSW52YWxpZFRyYW5zaXRpb25FcnJvcjogNDIyLFxuICBTdG9yaWVzVmFsaWRhdGlvbkVycm9yOiA0MjIsXG4gIEVycm9yOiA1MDAsXG59O1xuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIENvbW1hbmQgYnVzIGNvbnRyYWN0IChpbXBsZW1lbnRlZCBpbiBhcHBzL3NwaW5lLWFwaSwgY29uc3VtZWQgYnkgYWRhcHRlcnMpXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuZXhwb3J0IGludGVyZmFjZSBBY3RvckNvbnRleHQge1xuICBhY3RvcklkOiBzdHJpbmc7XG4gIGlzQWRtaW46IGJvb2xlYW47XG59XG5cbi8qKlxuICogVGhlIG9uZSBwbGFjZSBjb21tYW5kcyBleGVjdXRlLiBIVFRQIGFuZCBNQ1AgYXJlIHRoaW4gcGFyc2VycyBpbiBmcm9udCBvZlxuICogdGhpczsgbm90aGluZyBlbHNlIHdyaXRlcyBzdGF0ZSAoXHUwMEE3MC4xIFwibm8gd3JpdGVzIG91dHNpZGUgdGhlIGNvbW1hbmQgYnVzXCIpLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIENvbW1hbmRCdXMge1xuICBleGVjdXRlKGNvbW1hbmQ6IHN0cmluZywgaW5wdXQ6IHVua25vd24sIGN0eDogQWN0b3JDb250ZXh0KTogUHJvbWlzZTx1bmtub3duPjtcbiAgcmVhZG9ubHkgZW5naW5lOiBTcGluZUVuZ2luZTtcbn1cblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBUeXBlZCBjbGllbnQgKHVzZWQgYnkgdGhlIG9haHMgQ0xJLCB0aGUgcnVubmVyLCBhbmQgdGVzdHMpXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuZXhwb3J0IGludGVyZmFjZSBDbGllbnRPcHRpb25zIHtcbiAgYmFzZVVybDogc3RyaW5nO1xuICB0b2tlbjogc3RyaW5nO1xuICBmZXRjaEltcGw/OiB0eXBlb2YgZmV0Y2g7XG59XG5cbmV4cG9ydCBjbGFzcyBPYWhzUmVtb3RlRXJyb3IgZXh0ZW5kcyBFcnJvciB7XG4gIGNvbnN0cnVjdG9yKFxuICAgIHB1YmxpYyByZWFkb25seSBlcnJvck5hbWU6IHN0cmluZyxcbiAgICBtZXNzYWdlOiBzdHJpbmcsXG4gICAgcHVibGljIHJlYWRvbmx5IHN0YXR1czogbnVtYmVyLFxuICApIHtcbiAgICBzdXBlcihtZXNzYWdlKTtcbiAgICB0aGlzLm5hbWUgPSBlcnJvck5hbWU7XG4gIH1cbn1cblxuZXhwb3J0IGludGVyZmFjZSBPYWhzQ2xpZW50IHtcbiAgY2FsbDxUID0gdW5rbm93bj4oY29tbWFuZDogQ29tbWFuZE5hbWUsIGlucHV0PzogdW5rbm93bik6IFByb21pc2U8VD47XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBtYWtlQ2xpZW50KG9wdGlvbnM6IENsaWVudE9wdGlvbnMpOiBPYWhzQ2xpZW50IHtcbiAgY29uc3QgZG9GZXRjaCA9IG9wdGlvbnMuZmV0Y2hJbXBsID8/IGZldGNoO1xuICByZXR1cm4ge1xuICAgIGFzeW5jIGNhbGw8VD4oY29tbWFuZDogQ29tbWFuZE5hbWUsIGlucHV0OiB1bmtub3duID0ge30pOiBQcm9taXNlPFQ+IHtcbiAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZG9GZXRjaChgJHtvcHRpb25zLmJhc2VVcmx9L3JwYy8ke2NvbW1hbmR9YCwge1xuICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgICdjb250ZW50LXR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXG4gICAgICAgICAgYXV0aG9yaXphdGlvbjogYEJlYXJlciAke29wdGlvbnMudG9rZW59YCxcbiAgICAgICAgfSxcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoaW5wdXQpLFxuICAgICAgfSk7XG4gICAgICBjb25zdCBlbnZlbG9wZSA9IChhd2FpdCByZXNwb25zZS5qc29uKCkpIGFzIEVudmVsb3BlPFQ+O1xuICAgICAgaWYgKGVudmVsb3BlLm9rKSByZXR1cm4gZW52ZWxvcGUucmVzdWx0O1xuICAgICAgdGhyb3cgbmV3IE9haHNSZW1vdGVFcnJvcihlbnZlbG9wZS5lcnJvci5uYW1lLCBlbnZlbG9wZS5lcnJvci5tZXNzYWdlLCByZXNwb25zZS5zdGF0dXMpO1xuICAgIH0sXG4gIH07XG59XG4iLCAiLyoqXG4gKiBHYXRlLWhvbGRlciBjb21tYW5kIGltcGxlbWVudGF0aW9ucyBcdTIwMTQgcHVyZSBmdW5jdGlvbnMgb3ZlciB0aGUgdHlwZWRcbiAqIGNvbnRyYWN0cyBjbGllbnQ6IChjbGllbnQsIG9wdHMpIFx1MjE5MiBvdXRwdXQgdGV4dC4gY2xpLnRzIG9ubHkgd2lyZXNcbiAqIGNvbW1hbmRlciBvbnRvIHRoZXNlOyB0ZXN0cyBjYWxsIHRoZW0gZGlyZWN0bHkgYWdhaW5zdCBhbiBpbi1wcm9jZXNzXG4gKiBzcGluZS1hcGkuIEV2ZXJ5IG11dGF0aW9uIGdvZXMgdGhyb3VnaCAvcnBjLzxjb21tYW5kPiwgbmV2ZXIgYXJvdW5kIGl0LlxuICovXG5pbXBvcnQgeyByZWFkRmlsZVN5bmMgfSBmcm9tICdub2RlOmZzJztcbmltcG9ydCB7IHJlc29sdmUgfSBmcm9tICdub2RlOnBhdGgnO1xuXG5pbXBvcnQgdHlwZSB7IE9haHNDbGllbnQgfSBmcm9tICdAb2Focy9jb250cmFjdHMnO1xuaW1wb3J0IHtcbiAgV09SS19JVEVNX1NUQVRFUyxcbiAgdHlwZSBBY3RvcixcbiAgdHlwZSBBdXRoekV4cGxhbmF0aW9uLFxuICB0eXBlIEZlYXR1cmUsXG4gIHR5cGUgR2F0ZUNvZGUsXG4gIHR5cGUgR292ZXJuYW5jZVJvbGUsXG4gIHR5cGUgUGxhbkNvZGUsXG4gIHR5cGUgUm9sZUFzc2lnbm1lbnQsXG4gIHR5cGUgU3BpbmVFdmVudCxcbiAgdHlwZSBTdG9yaWVzSW1wb3J0UmVzdWx0LFxuICB0eXBlIFdvcmtJdGVtLFxuICB0eXBlIFdvcmtzcGFjZVBvbGljeSxcbn0gZnJvbSAnQG9haHMvY29yZSc7XG5cbmltcG9ydCB7IHJlbmRlclRhYmxlLCB0eXBlIENlbGwgfSBmcm9tICcuLi9mb3JtYXQuanMnO1xuXG5leHBvcnQgY29uc3QgR0FURVMgPSBbJ3NwZWNfYXBwcm92YWwnLCAncmV2aWV3X2FwcHJvdmFsJ10gYXMgY29uc3Q7XG5cbmZ1bmN0aW9uIGFzc2VydEdhdGUoZ2F0ZTogc3RyaW5nKTogYXNzZXJ0cyBnYXRlIGlzIEdhdGVDb2RlIHtcbiAgaWYgKCEoR0FURVMgYXMgcmVhZG9ubHkgc3RyaW5nW10pLmluY2x1ZGVzKGdhdGUpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBpbnZhbGlkIC0tZ2F0ZSBcIiR7Z2F0ZX1cIiAoZXhwZWN0ZWQgJHtHQVRFUy5qb2luKCcgfCAnKX0pYCk7XG4gIH1cbn1cblxuY29uc3QgV09SS19JVEVNX0hFQURFUlMgPSBbJ2lkJywgJ2V4dGVybmFsS2V5JywgJ3RpdGxlJywgJ3N0YXRlJywgJ2Jsb2NrZWRSZWFzb24nXTtcblxuZnVuY3Rpb24gd29ya0l0ZW1Sb3coaXRlbTogV29ya0l0ZW0pOiBDZWxsW10ge1xuICByZXR1cm4gW2l0ZW0uaWQsIGl0ZW0uZXh0ZXJuYWxLZXksIGl0ZW0udGl0bGUsIGl0ZW0uc3RhdGUsIGl0ZW0uYmxvY2tlZFJlYXNvbl07XG59XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gaW5ib3hcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gaW5ib3hDb21tYW5kKGNsaWVudDogT2Foc0NsaWVudCk6IFByb21pc2U8c3RyaW5nPiB7XG4gIGNvbnN0IHsgYXdhaXRpbmdTcGVjLCBhd2FpdGluZ1JldmlldyB9ID0gYXdhaXQgY2xpZW50LmNhbGw8e1xuICAgIGF3YWl0aW5nU3BlYzogV29ya0l0ZW1bXTtcbiAgICBhd2FpdGluZ1JldmlldzogV29ya0l0ZW1bXTtcbiAgfT4oJ2luYm94Jyk7XG4gIHJldHVybiBbXG4gICAgJ2F3YWl0aW5nIHNwZWMgYXBwcm92YWw6JyxcbiAgICByZW5kZXJUYWJsZShXT1JLX0lURU1fSEVBREVSUywgYXdhaXRpbmdTcGVjLm1hcCh3b3JrSXRlbVJvdykpLFxuICAgICcnLFxuICAgICdhd2FpdGluZyByZXZpZXcgZGVjaXNpb246JyxcbiAgICByZW5kZXJUYWJsZShXT1JLX0lURU1fSEVBREVSUywgYXdhaXRpbmdSZXZpZXcubWFwKHdvcmtJdGVtUm93KSksXG4gIF0uam9pbignXFxuJyk7XG59XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gYXBwcm92ZSAvIHJlamVjdFxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbmV4cG9ydCBpbnRlcmZhY2UgQXBwcm92ZU9wdGlvbnMge1xuICB3b3JrSXRlbUlkOiBzdHJpbmc7XG4gIGdhdGU6IHN0cmluZztcbiAgLyoqIHNwZWNfYXBwcm92YWwgb25seTogdmVyaWZpY2F0aW9uIGNvbW1hbmRzIHRvIHBpbiAocm9hZG1hcCBENykuICovXG4gIHBpbj86IHN0cmluZ1tdO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gYXBwcm92ZUNvbW1hbmQoY2xpZW50OiBPYWhzQ2xpZW50LCBvcHRzOiBBcHByb3ZlT3B0aW9ucyk6IFByb21pc2U8c3RyaW5nPiB7XG4gIGFzc2VydEdhdGUob3B0cy5nYXRlKTtcbiAgY29uc3QgaXRlbSA9IGF3YWl0IGNsaWVudC5jYWxsPFdvcmtJdGVtPignYXBwcm92ZV9nYXRlJywge1xuICAgIHdvcmtJdGVtSWQ6IG9wdHMud29ya0l0ZW1JZCxcbiAgICBnYXRlOiBvcHRzLmdhdGUsXG4gICAgLi4uKG9wdHMucGluICE9PSB1bmRlZmluZWQgJiYgb3B0cy5waW4ubGVuZ3RoID4gMCA/IHsgcGlubmVkVmVyaWZpY2F0aW9uOiBvcHRzLnBpbiB9IDoge30pLFxuICB9KTtcbiAgY29uc3QgbGluZXMgPSBbXG4gICAgYGFwcHJvdmVkICR7b3B0cy5nYXRlfSBvbiAke2l0ZW0uZXh0ZXJuYWxLZXl9ICgke2l0ZW0uaWR9KWAsXG4gICAgYHN0YXRlOiAke2l0ZW0uc3RhdGV9YCxcbiAgXTtcbiAgaWYgKGl0ZW0ucGlubmVkVmVyaWZpY2F0aW9uICE9PSBudWxsICYmIGl0ZW0ucGlubmVkVmVyaWZpY2F0aW9uLmxlbmd0aCA+IDApIHtcbiAgICBsaW5lcy5wdXNoKGBwaW5uZWQgdmVyaWZpY2F0aW9uOiAke2l0ZW0ucGlubmVkVmVyaWZpY2F0aW9uLmpvaW4oJyAmJiAnKX1gKTtcbiAgfVxuICByZXR1cm4gbGluZXMuam9pbignXFxuJyk7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQWR2YW5jZU9wdGlvbnMge1xuICB3b3JrSXRlbUlkOiBzdHJpbmc7XG4gIHRvOiBzdHJpbmc7XG4gIGZlbmNpbmdUb2tlbj86IG51bWJlcjtcbn1cblxuLyoqXG4gKiBQbGFubmluZy16b25lIGFkdmFuY2VzIGZvciBodW1hbnMgKGJhY2tsb2dcdTIxOTJkcmFmdCB3aGVuIHRoZSBQTyBzdGFydHNcbiAqIGRyYWZ0aW5nLCBkcmFmdFx1MjE5MnJlYWR5X2Zvcl9kZXYgb24gbm9uLWNoZWNrcG9pbnQgaXRlbXMpLiBFeGVjdXRpb24tem9uZVxuICogdHJhbnNpdGlvbnMgYmVsb25nIHRvIHRoZSBydW5uZXIsIHdoaWNoIGhvbGRzIHRoZSBjbGFpbS5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGFkdmFuY2VDb21tYW5kKGNsaWVudDogT2Foc0NsaWVudCwgb3B0czogQWR2YW5jZU9wdGlvbnMpOiBQcm9taXNlPHN0cmluZz4ge1xuICBjb25zdCBpdGVtID0gYXdhaXQgY2xpZW50LmNhbGw8V29ya0l0ZW0+KCdhZHZhbmNlX3N0YXRlJywge1xuICAgIHdvcmtJdGVtSWQ6IG9wdHMud29ya0l0ZW1JZCxcbiAgICB0bzogb3B0cy50byxcbiAgICAuLi4ob3B0cy5mZW5jaW5nVG9rZW4gIT09IHVuZGVmaW5lZCA/IHsgZmVuY2luZ1Rva2VuOiBvcHRzLmZlbmNpbmdUb2tlbiB9IDoge30pLFxuICB9KTtcbiAgcmV0dXJuIGBhZHZhbmNlZCAke2l0ZW0uZXh0ZXJuYWxLZXl9ICgke2l0ZW0uaWR9KVxcbnN0YXRlOiAke2l0ZW0uc3RhdGV9YDtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBSZWplY3RPcHRpb25zIHtcbiAgd29ya0l0ZW1JZDogc3RyaW5nO1xuICBnYXRlOiBzdHJpbmc7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZWplY3RDb21tYW5kKGNsaWVudDogT2Foc0NsaWVudCwgb3B0czogUmVqZWN0T3B0aW9ucyk6IFByb21pc2U8c3RyaW5nPiB7XG4gIGFzc2VydEdhdGUob3B0cy5nYXRlKTtcbiAgY29uc3QgaXRlbSA9IGF3YWl0IGNsaWVudC5jYWxsPFdvcmtJdGVtPigncmVqZWN0X2dhdGUnLCB7XG4gICAgd29ya0l0ZW1JZDogb3B0cy53b3JrSXRlbUlkLFxuICAgIGdhdGU6IG9wdHMuZ2F0ZSxcbiAgfSk7XG4gIHJldHVybiBbXG4gICAgYHJlamVjdGVkICR7b3B0cy5nYXRlfSBvbiAke2l0ZW0uZXh0ZXJuYWxLZXl9ICgke2l0ZW0uaWR9KWAsXG4gICAgYHN0YXRlOiAke2l0ZW0uc3RhdGV9YCxcbiAgICBgYmxvY2tlZFJlYXNvbjogJHtpdGVtLmJsb2NrZWRSZWFzb24gPz8gJy0nfWAsXG4gICAgYHJldmlld0xvb3BJdGVyYXRpb246ICR7aXRlbS5yZXZpZXdMb29wSXRlcmF0aW9ufWAsXG4gIF0uam9pbignXFxuJyk7XG59XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gc3RhdHVzXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHN0YXR1c0NvbW1hbmQoY2xpZW50OiBPYWhzQ2xpZW50KTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgY29uc3QgaXRlbXMgPSBhd2FpdCBjbGllbnQuY2FsbDxXb3JrSXRlbVtdPignbGlzdF93b3JrX2l0ZW1zJyk7XG4gIGNvbnN0IHJhbmsgPSBuZXcgTWFwPHN0cmluZywgbnVtYmVyPihXT1JLX0lURU1fU1RBVEVTLm1hcCgocywgaSkgPT4gW3MsIGldKSk7XG4gIGNvbnN0IHNvcnRlZCA9IFsuLi5pdGVtc10uc29ydChcbiAgICAoYSwgYikgPT5cbiAgICAgIChyYW5rLmdldChhLnN0YXRlKSA/PyAwKSAtIChyYW5rLmdldChiLnN0YXRlKSA/PyAwKSB8fFxuICAgICAgYS5leHRlcm5hbEtleS5sb2NhbGVDb21wYXJlKGIuZXh0ZXJuYWxLZXkpLFxuICApO1xuICBjb25zdCBmZWF0dXJlSWRzID0gWy4uLm5ldyBTZXQoaXRlbXMubWFwKChpdGVtKSA9PiBpdGVtLmZlYXR1cmVJZCkpXTtcbiAgY29uc3QgZmVhdHVyZXM6IEZlYXR1cmVbXSA9IFtdO1xuICBmb3IgKGNvbnN0IGZlYXR1cmVJZCBvZiBmZWF0dXJlSWRzKSB7XG4gICAgZmVhdHVyZXMucHVzaChhd2FpdCBjbGllbnQuY2FsbDxGZWF0dXJlPignZ2V0X2ZlYXR1cmUnLCB7IGZlYXR1cmVJZCB9KSk7XG4gIH1cbiAgcmV0dXJuIFtcbiAgICAnd29yayBpdGVtczonLFxuICAgIHJlbmRlclRhYmxlKFxuICAgICAgWydzdGF0ZScsICdpZCcsICdleHRlcm5hbEtleScsICd0aXRsZScsICdibG9ja2VkUmVhc29uJ10sXG4gICAgICBzb3J0ZWQubWFwKChpdGVtKSA9PiBbaXRlbS5zdGF0ZSwgaXRlbS5pZCwgaXRlbS5leHRlcm5hbEtleSwgaXRlbS50aXRsZSwgaXRlbS5ibG9ja2VkUmVhc29uXSksXG4gICAgKSxcbiAgICAnJyxcbiAgICAnZmVhdHVyZXM6JyxcbiAgICByZW5kZXJUYWJsZShcbiAgICAgIFsnaWQnLCAnc3RhdGUnLCAnZGlzcGF0Y2hIb2xkJ10sXG4gICAgICBmZWF0dXJlcy5tYXAoKGZlYXR1cmUpID0+IFtmZWF0dXJlLmlkLCBmZWF0dXJlLnN0YXRlLCBmZWF0dXJlLmRpc3BhdGNoSG9sZF0pLFxuICAgICksXG4gIF0uam9pbignXFxuJyk7XG59XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gYWN0b3IgLyBncmFudFxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbmV4cG9ydCBpbnRlcmZhY2UgQWN0b3JDcmVhdGVPcHRpb25zIHtcbiAgdHlwZTogc3RyaW5nO1xuICBuYW1lOiBzdHJpbmc7XG4gIC8qKiBQaGFzZSAyIChyb2FkbWFwIFx1MDBBNzMpOiBpbml0aWFsIGdvdmVybmFuY2Ugcm9sZSBcdTIwMTQgYWRtaW4gY29udGV4dCBvbmx5LiAqL1xuICBnb3Zlcm5hbmNlUm9sZT86IHN0cmluZztcbn1cblxuY29uc3QgR09WRVJOQU5DRV9ST0xFUyA9IFsnYWRtaW4nLCAnbWVtYmVyJywgJ2F1ZGl0b3InXSBhcyBjb25zdDtcblxuZnVuY3Rpb24gYXNzZXJ0R292ZXJuYW5jZVJvbGUocm9sZTogc3RyaW5nKTogYXNzZXJ0cyByb2xlIGlzIEdvdmVybmFuY2VSb2xlIHtcbiAgaWYgKCEoR09WRVJOQU5DRV9ST0xFUyBhcyByZWFkb25seSBzdHJpbmdbXSkuaW5jbHVkZXMocm9sZSkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYGludmFsaWQgZ292ZXJuYW5jZSByb2xlIFwiJHtyb2xlfVwiIChleHBlY3RlZCAke0dPVkVSTkFOQ0VfUk9MRVMuam9pbignIHwgJyl9KWApO1xuICB9XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBhY3RvckNyZWF0ZUNvbW1hbmQoXG4gIGNsaWVudDogT2Foc0NsaWVudCxcbiAgb3B0czogQWN0b3JDcmVhdGVPcHRpb25zLFxuKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgaWYgKG9wdHMudHlwZSAhPT0gJ3VzZXInICYmIG9wdHMudHlwZSAhPT0gJ2FnZW50Jykge1xuICAgIHRocm93IG5ldyBFcnJvcihgaW52YWxpZCAtLXR5cGUgXCIke29wdHMudHlwZX1cIiAoZXhwZWN0ZWQgdXNlciB8IGFnZW50KWApO1xuICB9XG4gIGlmIChvcHRzLmdvdmVybmFuY2VSb2xlICE9PSB1bmRlZmluZWQpIGFzc2VydEdvdmVybmFuY2VSb2xlKG9wdHMuZ292ZXJuYW5jZVJvbGUpO1xuICBjb25zdCBjcmVhdGVkID0gYXdhaXQgY2xpZW50LmNhbGw8eyBhY3RvcjogQWN0b3I7IHRva2VuOiBzdHJpbmcgfT4oJ2NyZWF0ZV9hY3RvcicsIHtcbiAgICB0eXBlOiBvcHRzLnR5cGUsXG4gICAgZGlzcGxheU5hbWU6IG9wdHMubmFtZSxcbiAgICAuLi4ob3B0cy5nb3Zlcm5hbmNlUm9sZSAhPT0gdW5kZWZpbmVkID8geyBnb3Zlcm5hbmNlUm9sZTogb3B0cy5nb3Zlcm5hbmNlUm9sZSB9IDoge30pLFxuICB9KTtcbiAgcmV0dXJuIFtcbiAgICBgYWN0b3JJZDogJHtjcmVhdGVkLmFjdG9yLmlkfWAsXG4gICAgYHR5cGU6ICR7Y3JlYXRlZC5hY3Rvci50eXBlfWAsXG4gICAgYGRpc3BsYXlOYW1lOiAke2NyZWF0ZWQuYWN0b3IuZGlzcGxheU5hbWV9YCxcbiAgICBgdG9rZW46ICR7Y3JlYXRlZC50b2tlbn1gLFxuICBdLmpvaW4oJ1xcbicpO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEdyYW50T3B0aW9ucyB7XG4gIGFjdG9ySWQ6IHN0cmluZztcbiAgcGVybWlzc2lvbjogc3RyaW5nO1xuICBzY29wZT86IHN0cmluZztcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdyYW50Q29tbWFuZChjbGllbnQ6IE9haHNDbGllbnQsIG9wdHM6IEdyYW50T3B0aW9ucyk6IFByb21pc2U8c3RyaW5nPiB7XG4gIGF3YWl0IGNsaWVudC5jYWxsKCdncmFudF9wZXJtaXNzaW9uJywge1xuICAgIGFjdG9ySWQ6IG9wdHMuYWN0b3JJZCxcbiAgICBwZXJtaXNzaW9uOiBvcHRzLnBlcm1pc3Npb24sXG4gICAgLi4uKG9wdHMuc2NvcGUgIT09IHVuZGVmaW5lZCA/IHsgc2NvcGU6IG9wdHMuc2NvcGUgfSA6IHt9KSxcbiAgfSk7XG4gIHJldHVybiBgZ3JhbnRlZCAke29wdHMucGVybWlzc2lvbn0gdG8gJHtvcHRzLmFjdG9ySWR9YDtcbn1cblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBmZWF0dXJlIC8gaW1wb3J0XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGZlYXR1cmVDcmVhdGVDb21tYW5kKGNsaWVudDogT2Foc0NsaWVudCk6IFByb21pc2U8c3RyaW5nPiB7XG4gIGNvbnN0IGZlYXR1cmUgPSBhd2FpdCBjbGllbnQuY2FsbDxGZWF0dXJlPignY3JlYXRlX2ZlYXR1cmUnKTtcbiAgcmV0dXJuIFtgZmVhdHVyZUlkOiAke2ZlYXR1cmUuaWR9YCwgYHN0YXRlOiAke2ZlYXR1cmUuc3RhdGV9YF0uam9pbignXFxuJyk7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgSW1wb3J0U3Rvcmllc09wdGlvbnMge1xuICBmZWF0dXJlSWQ6IHN0cmluZztcbiAgcGF0aDogc3RyaW5nO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gaW1wb3J0U3Rvcmllc0NvbW1hbmQoXG4gIGNsaWVudDogT2Foc0NsaWVudCxcbiAgb3B0czogSW1wb3J0U3Rvcmllc09wdGlvbnMsXG4pOiBQcm9taXNlPHN0cmluZz4ge1xuICBjb25zdCB5YW1sID0gcmVhZEZpbGVTeW5jKHJlc29sdmUob3B0cy5wYXRoKSwgJ3V0ZjgnKTtcbiAgY29uc3QgcmVzdWx0ID0gYXdhaXQgY2xpZW50LmNhbGw8U3Rvcmllc0ltcG9ydFJlc3VsdD4oJ2ltcG9ydF9zdG9yaWVzJywge1xuICAgIGZlYXR1cmVJZDogb3B0cy5mZWF0dXJlSWQsXG4gICAgeWFtbCxcbiAgfSk7XG4gIGNvbnN0IGxpc3QgPSAodmFsdWVzOiBzdHJpbmdbXSk6IHN0cmluZyA9PiAodmFsdWVzLmxlbmd0aCA+IDAgPyB2YWx1ZXMuam9pbignLCAnKSA6ICcobm9uZSknKTtcbiAgcmV0dXJuIFtcbiAgICBgaW1wb3J0ZWQ6ICR7bGlzdChyZXN1bHQuaW1wb3J0ZWQpfWAsXG4gICAgYHVwZGF0ZWQ6ICR7bGlzdChyZXN1bHQudXBkYXRlZCl9YCxcbiAgICBgd2FybmluZ3M6ICR7bGlzdChyZXN1bHQud2FybmluZ3MpfWAsXG4gIF0uam9pbignXFxuJyk7XG59XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gZXZlbnRzXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuZXhwb3J0IGludGVyZmFjZSBFdmVudHNPcHRpb25zIHtcbiAgc3RyZWFtSWQ/OiBzdHJpbmc7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBldmVudHNDb21tYW5kKFxuICBjbGllbnQ6IE9haHNDbGllbnQsXG4gIG9wdHM6IEV2ZW50c09wdGlvbnMgPSB7fSxcbik6IFByb21pc2U8c3RyaW5nPiB7XG4gIGNvbnN0IGV2ZW50cyA9IGF3YWl0IGNsaWVudC5jYWxsPFNwaW5lRXZlbnRbXT4oXG4gICAgJ3F1ZXJ5X2V2ZW50cycsXG4gICAgb3B0cy5zdHJlYW1JZCAhPT0gdW5kZWZpbmVkID8geyBzdHJlYW1JZDogb3B0cy5zdHJlYW1JZCB9IDoge30sXG4gICk7XG4gIHJldHVybiByZW5kZXJUYWJsZShcbiAgICBbJ3NlcScsICd0eXBlJywgJ3N0cmVhbScsICdhY3RvciddLFxuICAgIGV2ZW50cy5tYXAoKGV2ZW50KSA9PiBbXG4gICAgICBldmVudC5nbG9iYWxTZXEsXG4gICAgICBldmVudC50eXBlLFxuICAgICAgYCR7ZXZlbnQuc3RyZWFtVHlwZX0vJHtldmVudC5zdHJlYW1JZH0jJHtldmVudC5zdHJlYW1TZXF9YCxcbiAgICAgIGV2ZW50LmFjdG9ySWQsXG4gICAgXSksXG4gICk7XG59XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gZW50aXRsZW1lbnRzIChQaGFzZSAyLCByb2FkbWFwIFx1MDBBNzMpIFx1MjAxNCByb2xlIC8gcGxhbiAvIHBvbGljeSAvIGdvdmVybmFuY2UgLyBhdXRoelxuLy8gQXV0aG9yaXR5IGZvciB0aGVzZSB3cml0ZXMgaXMgZGVjaWRlZCBieSB0aGUgRU5HSU5FIGZyb20gdGhlIGNhbGxlcidzXG4vLyBnb3Zlcm5hbmNlIHJvbGU7IHRoZSBDTEkgb25seSB2YWxpZGF0ZXMgc2hhcGVzIGxvY2FsbHkuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuZXhwb3J0IGludGVyZmFjZSBSb2xlT3B0aW9ucyB7XG4gIGFjdG9ySWQ6IHN0cmluZztcbiAgcm9sZUNvZGU6IHN0cmluZztcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJvbGVBc3NpZ25Db21tYW5kKGNsaWVudDogT2Foc0NsaWVudCwgb3B0czogUm9sZU9wdGlvbnMpOiBQcm9taXNlPHN0cmluZz4ge1xuICBhd2FpdCBjbGllbnQuY2FsbCgnYXNzaWduX3JvbGUnLCB7IGFjdG9ySWQ6IG9wdHMuYWN0b3JJZCwgcm9sZUNvZGU6IG9wdHMucm9sZUNvZGUgfSk7XG4gIHJldHVybiBgYXNzaWduZWQgcm9sZSAke29wdHMucm9sZUNvZGV9IHRvICR7b3B0cy5hY3RvcklkfWA7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByb2xlUmV2b2tlQ29tbWFuZChjbGllbnQ6IE9haHNDbGllbnQsIG9wdHM6IFJvbGVPcHRpb25zKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgYXdhaXQgY2xpZW50LmNhbGwoJ3Jldm9rZV9yb2xlJywgeyBhY3RvcklkOiBvcHRzLmFjdG9ySWQsIHJvbGVDb2RlOiBvcHRzLnJvbGVDb2RlIH0pO1xuICByZXR1cm4gYHJldm9rZWQgcm9sZSAke29wdHMucm9sZUNvZGV9IGZyb20gJHtvcHRzLmFjdG9ySWR9YDtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBSb2xlTGlzdE9wdGlvbnMge1xuICBhY3RvcklkPzogc3RyaW5nO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcm9sZUxpc3RDb21tYW5kKFxuICBjbGllbnQ6IE9haHNDbGllbnQsXG4gIG9wdHM6IFJvbGVMaXN0T3B0aW9ucyA9IHt9LFxuKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgY29uc3QgYXNzaWdubWVudHMgPSBhd2FpdCBjbGllbnQuY2FsbDxSb2xlQXNzaWdubWVudFtdPihcbiAgICAnbGlzdF9yb2xlX2Fzc2lnbm1lbnRzJyxcbiAgICBvcHRzLmFjdG9ySWQgIT09IHVuZGVmaW5lZCA/IHsgYWN0b3JJZDogb3B0cy5hY3RvcklkIH0gOiB7fSxcbiAgKTtcbiAgcmV0dXJuIHJlbmRlclRhYmxlKFxuICAgIFsnYWN0b3JJZCcsICdyb2xlQ29kZScsICdncmFudGVkQnknLCAncmV2b2tlZCddLFxuICAgIGFzc2lnbm1lbnRzLm1hcCgoYSkgPT4gW2EuYWN0b3JJZCwgYS5yb2xlQ29kZSwgYS5ncmFudGVkQnksIGEucmV2b2tlZF0pLFxuICApO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFBsYW5TZXRPcHRpb25zIHtcbiAgcGxhbjogc3RyaW5nO1xufVxuXG5jb25zdCBQTEFOUyA9IFsnZnJlZScsICd0ZWFtJywgJ2VudGVycHJpc2UnXSBhcyBjb25zdDtcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHBsYW5TZXRDb21tYW5kKGNsaWVudDogT2Foc0NsaWVudCwgb3B0czogUGxhblNldE9wdGlvbnMpOiBQcm9taXNlPHN0cmluZz4ge1xuICBpZiAoIShQTEFOUyBhcyByZWFkb25seSBzdHJpbmdbXSkuaW5jbHVkZXMob3B0cy5wbGFuKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihgaW52YWxpZCBwbGFuIFwiJHtvcHRzLnBsYW59XCIgKGV4cGVjdGVkICR7UExBTlMuam9pbignIHwgJyl9KWApO1xuICB9XG4gIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGNsaWVudC5jYWxsPHsgcGxhbjogUGxhbkNvZGUgfT4oJ3NldF9wbGFuJywgeyBwbGFuOiBvcHRzLnBsYW4gfSk7XG4gIHJldHVybiBgcGxhbiBzZXQ6ICR7cmVzdWx0LnBsYW59IChhIGNlaWxpbmcgZm9yIGFnZW50IGdyYW50cyBcdTIwMTQgbmV2ZXIgYSBncmFudCBpdHNlbGYpYDtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBQb2xpY3lTZXRPcHRpb25zIHtcbiAgLyoqICd0cnVlJyB8ICdmYWxzZScgXHUyMDE0IHJlc3RyaWN0LW9ubHkga2V5IChyb2FkbWFwIFx1MDBBNzMpLiAqL1xuICBhZ2VudEdhdGVBcHByb3ZhbHM/OiBzdHJpbmc7XG4gIC8qKiAndHJ1ZScgfCAnZmFsc2UnIFx1MjAxNCByZXN0cmljdC1vbmx5IGtleSAocm9hZG1hcCBcdTAwQTczKS4gKi9cbiAgYWdlbnRTZWxmRGlzcGF0Y2g/OiBzdHJpbmc7XG59XG5cbmZ1bmN0aW9uIHBhcnNlQm9vbEZsYWcoZmxhZzogc3RyaW5nLCB2YWx1ZTogc3RyaW5nKTogYm9vbGVhbiB7XG4gIGlmICh2YWx1ZSA9PT0gJ3RydWUnKSByZXR1cm4gdHJ1ZTtcbiAgaWYgKHZhbHVlID09PSAnZmFsc2UnKSByZXR1cm4gZmFsc2U7XG4gIHRocm93IG5ldyBFcnJvcihgaW52YWxpZCAke2ZsYWd9IFwiJHt2YWx1ZX1cIiAoZXhwZWN0ZWQgdHJ1ZSB8IGZhbHNlKWApO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcG9saWN5U2V0Q29tbWFuZChjbGllbnQ6IE9haHNDbGllbnQsIG9wdHM6IFBvbGljeVNldE9wdGlvbnMpOiBQcm9taXNlPHN0cmluZz4ge1xuICBjb25zdCBwb2xpY3k6IFdvcmtzcGFjZVBvbGljeSA9IHtcbiAgICAuLi4ob3B0cy5hZ2VudEdhdGVBcHByb3ZhbHMgIT09IHVuZGVmaW5lZFxuICAgICAgPyB7IGFnZW50R2F0ZUFwcHJvdmFsczogcGFyc2VCb29sRmxhZygnLS1hZ2VudC1nYXRlLWFwcHJvdmFscycsIG9wdHMuYWdlbnRHYXRlQXBwcm92YWxzKSB9XG4gICAgICA6IHt9KSxcbiAgICAuLi4ob3B0cy5hZ2VudFNlbGZEaXNwYXRjaCAhPT0gdW5kZWZpbmVkXG4gICAgICA/IHsgYWdlbnRTZWxmRGlzcGF0Y2g6IHBhcnNlQm9vbEZsYWcoJy0tYWdlbnQtc2VsZi1kaXNwYXRjaCcsIG9wdHMuYWdlbnRTZWxmRGlzcGF0Y2gpIH1cbiAgICAgIDoge30pLFxuICB9O1xuICBpZiAoT2JqZWN0LmtleXMocG9saWN5KS5sZW5ndGggPT09IDApIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ25vdGhpbmcgdG8gc2V0OiBwYXNzIC0tYWdlbnQtZ2F0ZS1hcHByb3ZhbHMgYW5kL29yIC0tYWdlbnQtc2VsZi1kaXNwYXRjaCcpO1xuICB9XG4gIGNvbnN0IGVmZmVjdGl2ZSA9IGF3YWl0IGNsaWVudC5jYWxsPFdvcmtzcGFjZVBvbGljeT4oJ3NldF93b3Jrc3BhY2VfcG9saWN5JywgeyBwb2xpY3kgfSk7XG4gIHJldHVybiBbXG4gICAgJ3dvcmtzcGFjZSBwb2xpY3kgKHJlc3RyaWN0LW9ubHkgXHUyMDE0IG5hcnJvd3MgdGhlIHBsYW4sIG5ldmVyIHdpZGVucyBpdCk6JyxcbiAgICBgICBhZ2VudEdhdGVBcHByb3ZhbHM6ICR7ZWZmZWN0aXZlLmFnZW50R2F0ZUFwcHJvdmFscyA/PyAnKHVuc2V0KSd9YCxcbiAgICBgICBhZ2VudFNlbGZEaXNwYXRjaDogJHtlZmZlY3RpdmUuYWdlbnRTZWxmRGlzcGF0Y2ggPz8gJyh1bnNldCknfWAsXG4gIF0uam9pbignXFxuJyk7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgR2F0ZVBvbGljeVNldE9wdGlvbnMge1xuICBnYXRlOiBzdHJpbmc7XG4gIG1pbkFwcHJvdmFscz86IHN0cmluZztcbiAgcmVxdWlyZVR5cGVzPzogc3RyaW5nW107XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnYXRlUG9saWN5U2V0Q29tbWFuZChcbiAgY2xpZW50OiBPYWhzQ2xpZW50LFxuICBvcHRzOiBHYXRlUG9saWN5U2V0T3B0aW9ucyxcbik6IFByb21pc2U8c3RyaW5nPiB7XG4gIGFzc2VydEdhdGUob3B0cy5nYXRlKTtcbiAgY29uc3QgbWluQXBwcm92YWxzID0gb3B0cy5taW5BcHByb3ZhbHMgIT09IHVuZGVmaW5lZCA/IE51bWJlcihvcHRzLm1pbkFwcHJvdmFscykgOiB1bmRlZmluZWQ7XG4gIGlmIChtaW5BcHByb3ZhbHMgIT09IHVuZGVmaW5lZCAmJiAoIU51bWJlci5pc0ludGVnZXIobWluQXBwcm92YWxzKSB8fCBtaW5BcHByb3ZhbHMgPCAxKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihgaW52YWxpZCAtLW1pbi1hcHByb3ZhbHMgXCIke29wdHMubWluQXBwcm92YWxzfVwiIChleHBlY3RlZCBhIHBvc2l0aXZlIGludGVnZXIpYCk7XG4gIH1cbiAgY29uc3QgcmVxdWlyZVR5cGVzID0gb3B0cy5yZXF1aXJlVHlwZXMgPz8gW107XG4gIGZvciAoY29uc3QgdHlwZSBvZiByZXF1aXJlVHlwZXMpIHtcbiAgICBpZiAodHlwZSAhPT0gJ3VzZXInICYmIHR5cGUgIT09ICdhZ2VudCcgJiYgdHlwZSAhPT0gJ3N5c3RlbScpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgaW52YWxpZCAtLXJlcXVpcmUtdHlwZSBcIiR7dHlwZX1cIiAoZXhwZWN0ZWQgdXNlciB8IGFnZW50IHwgc3lzdGVtKWApO1xuICAgIH1cbiAgfVxuICBpZiAobWluQXBwcm92YWxzID09PSB1bmRlZmluZWQgJiYgcmVxdWlyZVR5cGVzLmxlbmd0aCA9PT0gMCkge1xuICAgIHRocm93IG5ldyBFcnJvcignbm90aGluZyB0byBzZXQ6IHBhc3MgLS1taW4tYXBwcm92YWxzIGFuZC9vciAtLXJlcXVpcmUtdHlwZScpO1xuICB9XG4gIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGNsaWVudC5jYWxsPHtcbiAgICBnYXRlOiBHYXRlQ29kZTtcbiAgICBwb2xpY3k6IHsgbWluQXBwcm92YWxzPzogbnVtYmVyOyByZXF1aXJlZEFjdG9yVHlwZXM/OiBzdHJpbmdbXSB9O1xuICB9Pignc2V0X2dhdGVfcG9saWN5Jywge1xuICAgIGdhdGU6IG9wdHMuZ2F0ZSxcbiAgICBwb2xpY3k6IHtcbiAgICAgIC4uLihtaW5BcHByb3ZhbHMgIT09IHVuZGVmaW5lZCA/IHsgbWluQXBwcm92YWxzIH0gOiB7fSksXG4gICAgICAuLi4ocmVxdWlyZVR5cGVzLmxlbmd0aCA+IDAgPyB7IHJlcXVpcmVkQWN0b3JUeXBlczogcmVxdWlyZVR5cGVzIH0gOiB7fSksXG4gICAgfSxcbiAgfSk7XG4gIHJldHVybiBbXG4gICAgYGdhdGUgcG9saWN5IHNldCBvbiAke3Jlc3VsdC5nYXRlfSAoZ2F0ZSBkZWZpbml0aW9ucyBhcmUgZGF0YSwgcm9hZG1hcCBcdTAwQTczKTpgLFxuICAgIGAgIG1pbkFwcHJvdmFsczogJHtyZXN1bHQucG9saWN5Lm1pbkFwcHJvdmFscyA/PyAxfWAsXG4gICAgYCAgcmVxdWlyZWRBY3RvclR5cGVzOiAke1xuICAgICAgcmVzdWx0LnBvbGljeS5yZXF1aXJlZEFjdG9yVHlwZXMgIT09IHVuZGVmaW5lZCAmJiByZXN1bHQucG9saWN5LnJlcXVpcmVkQWN0b3JUeXBlcy5sZW5ndGggPiAwXG4gICAgICAgID8gcmVzdWx0LnBvbGljeS5yZXF1aXJlZEFjdG9yVHlwZXMuam9pbignLCAnKVxuICAgICAgICA6ICcobm9uZSknXG4gICAgfWAsXG4gIF0uam9pbignXFxuJyk7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgR292ZXJuYW5jZVNldE9wdGlvbnMge1xuICBhY3RvcklkOiBzdHJpbmc7XG4gIHJvbGU6IHN0cmluZztcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdvdmVybmFuY2VTZXRDb21tYW5kKFxuICBjbGllbnQ6IE9haHNDbGllbnQsXG4gIG9wdHM6IEdvdmVybmFuY2VTZXRPcHRpb25zLFxuKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgYXNzZXJ0R292ZXJuYW5jZVJvbGUob3B0cy5yb2xlKTtcbiAgYXdhaXQgY2xpZW50LmNhbGwoJ3NldF9nb3Zlcm5hbmNlX3JvbGUnLCB7IGFjdG9ySWQ6IG9wdHMuYWN0b3JJZCwgcm9sZTogb3B0cy5yb2xlIH0pO1xuICByZXR1cm4gYGdvdmVybmFuY2Ugcm9sZSBvZiAke29wdHMuYWN0b3JJZH0gc2V0IHRvICR7b3B0cy5yb2xlfWA7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQXV0aHpPcHRpb25zIHtcbiAgYWN0b3JJZDogc3RyaW5nO1xuICBwZXJtaXNzaW9uOiBzdHJpbmc7XG59XG5cbi8qKiBIdW1hbi1yZWFkYWJsZSByZW5kZXJpbmcgb2YgdGhlIHJlcGxheWFibGUgYXV0aHpfZXhwbGFpbiB0cmFjZSAocm9hZG1hcCBcdTAwQTczKS4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBhdXRoekNvbW1hbmQoY2xpZW50OiBPYWhzQ2xpZW50LCBvcHRzOiBBdXRoek9wdGlvbnMpOiBQcm9taXNlPHN0cmluZz4ge1xuICBjb25zdCBleHBsYW5hdGlvbiA9IGF3YWl0IGNsaWVudC5jYWxsPEF1dGh6RXhwbGFuYXRpb24+KCdhdXRoel9leHBsYWluJywge1xuICAgIGFjdG9ySWQ6IG9wdHMuYWN0b3JJZCxcbiAgICBwZXJtaXNzaW9uOiBvcHRzLnBlcm1pc3Npb24sXG4gIH0pO1xuICByZXR1cm4gW1xuICAgIGBhdXRoeiAke2V4cGxhbmF0aW9uLnBlcm1pc3Npb259IGZvciAke2V4cGxhbmF0aW9uLmFjdG9ySWR9OiAke1xuICAgICAgZXhwbGFuYXRpb24uYWxsb3dlZCA/ICdBTExPV0VEJyA6ICdERU5JRUQnXG4gICAgfWAsXG4gICAgYCAgc291cmNlOiAke2V4cGxhbmF0aW9uLnNvdXJjZSA/PyAnKG5vIGdyYW50IFx1MjAxNCBkaXJlY3Qgb3IgdmlhIHJvbGUpJ31gLFxuICAgIGAgIGdvdmVybmFuY2VSb2xlOiAke2V4cGxhbmF0aW9uLmdvdmVybmFuY2VSb2xlfWAsXG4gICAgYCAgcGxhbjogJHtleHBsYW5hdGlvbi5wbGFufSAocGxhbkFsbG93czogJHtleHBsYW5hdGlvbi5wbGFuQWxsb3dzfSlgLFxuICAgIGAgIHBvbGljeUFsbG93czogJHtleHBsYW5hdGlvbi5wb2xpY3lBbGxvd3N9YCxcbiAgICBgICB2ZXJzaW9uczogcGxhbiB2JHtleHBsYW5hdGlvbi52ZXJzaW9ucy5wbGFufSwgcG9saWN5IHYke2V4cGxhbmF0aW9uLnZlcnNpb25zLnBvbGljeX1gLFxuICBdLmpvaW4oJ1xcbicpO1xufVxuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIG91dHB1dCBoYXJuZXNzIChzaGFyZWQgYnkgY2xpLnRzIGFuZCB0aGUgdGVzdHMpXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuZXhwb3J0IGludGVyZmFjZSBDb21tYW5kT3V0cHV0IHtcbiAgdGV4dDogc3RyaW5nO1xuICBleGl0Q29kZTogbnVtYmVyO1xufVxuXG4vKipcbiAqIFJ1biBvbmUgY29tbWFuZCBmdW5jdGlvbiB0byBhIHByaW50YWJsZSBvdXRjb21lOiBzdWNjZXNzIFx1MjE5MiBpdHMgdGV4dCB3aXRoXG4gKiBleGl0IDA7IGZhaWx1cmUgXHUyMTkyIGA8ZXJyb3IubmFtZT46IDxtZXNzYWdlPmAgKE9haHNSZW1vdGVFcnJvciBjYXJyaWVzIHRoZVxuICogd2lyZSBlcnJvciBjbGFzcyBuYW1lKSB3aXRoIGV4aXQgMS5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJ1blRvT3V0cHV0KGZuOiAoKSA9PiBQcm9taXNlPHN0cmluZz4pOiBQcm9taXNlPENvbW1hbmRPdXRwdXQ+IHtcbiAgdHJ5IHtcbiAgICByZXR1cm4geyB0ZXh0OiBhd2FpdCBmbigpLCBleGl0Q29kZTogMCB9O1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGlmIChlcnJvciBpbnN0YW5jZW9mIEVycm9yKSB7XG4gICAgICByZXR1cm4geyB0ZXh0OiBgJHtlcnJvci5uYW1lfTogJHtlcnJvci5tZXNzYWdlfWAsIGV4aXRDb2RlOiAxIH07XG4gICAgfVxuICAgIHJldHVybiB7IHRleHQ6IFN0cmluZyhlcnJvciksIGV4aXRDb2RlOiAxIH07XG4gIH1cbn1cbiIsICIvKipcbiAqIFBsYWluLXRleHQgdGFibGUgcmVuZGVyaW5nIFx1MjAxNCBkZWxpYmVyYXRlbHkgZGVwZW5kZW5jeS1mcmVlIChzdG9yeSAxMzpcbiAqIFwiYlx1MUVBM25nIHRleHQgXHUwMTExXHUwMUExbiBnaVx1MUVBM24sIGtoXHUwMEY0bmcgZGVwIGJcdTFFQTNuZyBuZ29cdTAwRTBpXCIpLiBNb25vc3BhY2UgY29sdW1ucyBwYWRkZWQgdG9cbiAqIHRoZSB3aWRlc3QgY2VsbDsgYW4gZW1wdHkgcm93IHNldCByZW5kZXJzIGFzIFwiKGVtcHR5KVwiLlxuICovXG5cbmV4cG9ydCB0eXBlIENlbGwgPSBzdHJpbmcgfCBudW1iZXIgfCBib29sZWFuIHwgbnVsbCB8IHVuZGVmaW5lZDtcblxuZnVuY3Rpb24gdG9UZXh0KGNlbGw6IENlbGwpOiBzdHJpbmcge1xuICBpZiAoY2VsbCA9PT0gbnVsbCB8fCBjZWxsID09PSB1bmRlZmluZWQpIHJldHVybiAnLSc7XG4gIHJldHVybiBTdHJpbmcoY2VsbCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiByZW5kZXJUYWJsZShoZWFkZXJzOiBzdHJpbmdbXSwgcm93czogQ2VsbFtdW10pOiBzdHJpbmcge1xuICBpZiAocm93cy5sZW5ndGggPT09IDApIHJldHVybiAnKGVtcHR5KSc7XG4gIGNvbnN0IHRleHRSb3dzID0gcm93cy5tYXAoKHJvdykgPT4gcm93Lm1hcCh0b1RleHQpKTtcbiAgY29uc3Qgd2lkdGhzID0gaGVhZGVycy5tYXAoKGhlYWRlciwgY29sKSA9PlxuICAgIE1hdGgubWF4KGhlYWRlci5sZW5ndGgsIC4uLnRleHRSb3dzLm1hcCgocm93KSA9PiAocm93W2NvbF0gPz8gJycpLmxlbmd0aCkpLFxuICApO1xuICBjb25zdCBsaW5lID0gKGNlbGxzOiBzdHJpbmdbXSk6IHN0cmluZyA9PlxuICAgIGNlbGxzLm1hcCgoY2VsbCwgY29sKSA9PiBjZWxsLnBhZEVuZCh3aWR0aHNbY29sXSA/PyBjZWxsLmxlbmd0aCkpLmpvaW4oJyAgJykudHJpbUVuZCgpO1xuICBjb25zdCBzZXBhcmF0b3IgPSB3aWR0aHMubWFwKCh3KSA9PiAnLScucmVwZWF0KHcpKS5qb2luKCcgICcpO1xuICByZXR1cm4gW2xpbmUoaGVhZGVycyksIHNlcGFyYXRvciwgLi4udGV4dFJvd3MubWFwKGxpbmUpXS5qb2luKCdcXG4nKTtcbn1cbiIsICIvKipcbiAqIGBvYWhzIHNlcnZlYCBcdTIwMTQgYm9vdCB0aGUgc3BpbmUtYXBpIGluLXByb2Nlc3MuXG4gKlxuICogRW5naW5lIHNlbGVjdGlvbjpcbiAqICAtIGRlZmF1bHQ6IEBvYWhzL2NvcmUgY3JlYXRlTWVtb3J5RW5naW5lICh6ZXJvIHBlcnNpc3RlbmNlLCBpbnN0YW50KTtcbiAqICAtIC0tZGF0YSA8ZGlyPjogRFVSQUJMRSBQR2xpdGUgdmlhIEBvYWhzL2RiIGNyZWF0ZVBnU3luY0VuZ2luZSh7ZGF0YURpcn0pXG4gKiAgICBwbHVzIGEgcGVyc2lzdGVkIFRva2VuU3RvcmUsIHNvIGFjdG9ycy90b2tlbnMvc3RhdGUgc3Vydml2ZSByZXN0YXJ0cy5cbiAqXG4gKiBAb2Focy9kYiBpcyBpbXBvcnRlZCBMQVpJTFk6IGl0cyBzeW5jaHJvbm91cyBmYWNhZGUgc3Bhd25zIGEgc3luY2tpdFxuICogd29ya2VyIChQR2xpdGUgd2FzbSkgYXQgbW9kdWxlIGxvYWQsIHdoaWNoIG5vIG1lbW9yeS1lbmdpbmUgc2VydmUgXHUyMDE0IGFuZCBub1xuICogZ2F0ZS1ob2xkZXIgY29tbWFuZCBcdTIwMTQgc2hvdWxkIGV2ZXIgcGF5IGZvci5cbiAqXG4gKiBFbnYgaXMgcmVhZCBpbiBjbGkudHMgKHRoZSBlbnRyeXBvaW50KSwgbmV2ZXIgaGVyZTogdGhpcyBtb2R1bGUgdGFrZXNcbiAqIGV2ZXJ5dGhpbmcgYXMgcGFyYW1ldGVycywgbWlycm9yaW5nIHRoZSBzcGluZS1hcGkgY29udmVudGlvbi5cbiAqL1xuaW1wb3J0IHsgcmFuZG9tQnl0ZXMgfSBmcm9tICdub2RlOmNyeXB0byc7XG5pbXBvcnQgeyBta2RpclN5bmMgfSBmcm9tICdub2RlOmZzJztcbmltcG9ydCB0eXBlIHsgQWRkcmVzc0luZm8gfSBmcm9tICdub2RlOm5ldCc7XG5pbXBvcnQgeyBqb2luIH0gZnJvbSAnbm9kZTpwYXRoJztcblxuaW1wb3J0IHsgY3JlYXRlTWVtb3J5RW5naW5lIH0gZnJvbSAnQG9haHMvY29yZSc7XG5pbXBvcnQgeyBUb2tlblN0b3JlLCBidWlsZFNlcnZlciB9IGZyb20gJ0BvYWhzL3NwaW5lLWFwaSc7XG5cbmV4cG9ydCBjb25zdCBERUZBVUxUX1BPUlQgPSA0NTE3O1xuXG5leHBvcnQgaW50ZXJmYWNlIFNlcnZlT3B0aW9ucyB7XG4gIC8qKiBUQ1AgcG9ydCAoMCA9IGVwaGVtZXJhbCkuIERlZmF1bHQgNDUxNy4gKi9cbiAgcG9ydD86IG51bWJlcjtcbiAgLyoqIEJpbmQgaG9zdC4gRGVmYXVsdCAwLjAuMC4wLiAqL1xuICBob3N0Pzogc3RyaW5nO1xuICAvKiogQm9vdHN0cmFwIGFkbWluIGNyZWRlbnRpYWwuIE9taXR0ZWQgXHUyMTkyIGdlbmVyYXRlZCAoc2VlIGhhbmRsZS5hZG1pblRva2VuR2VuZXJhdGVkKS4gKi9cbiAgYWRtaW5Ub2tlbj86IHN0cmluZztcbiAgLyoqIFBlcnNpc3RlbmNlIHJvb3Q6IFBHbGl0ZSBkYXRhIHVuZGVyIDxkYXRhRGlyPi9wZywgdG9rZW5zIGluIDxkYXRhRGlyPi90b2tlbnMuanNvbi4gKi9cbiAgZGF0YURpcj86IHN0cmluZztcbn1cblxuZXhwb3J0IGludGVyZmFjZSBTZXJ2ZUhhbmRsZSB7XG4gIHVybDogc3RyaW5nO1xuICBwb3J0OiBudW1iZXI7XG4gIGFkbWluVG9rZW46IHN0cmluZztcbiAgLyoqIHRydWUgd2hlbiBubyBhZG1pbiB0b2tlbiB3YXMgcHJvdmlkZWQgYW5kIG9uZSB3YXMgZ2VuZXJhdGVkLiAqL1xuICBhZG1pblRva2VuR2VuZXJhdGVkOiBib29sZWFuO1xuICBlbmdpbmVLaW5kOiAnbWVtb3J5JyB8ICdwZ2xpdGUnO1xuICBjbG9zZSgpOiBQcm9taXNlPHZvaWQ+O1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gc3RhcnRTZXJ2ZShvcHRpb25zOiBTZXJ2ZU9wdGlvbnMgPSB7fSk6IFByb21pc2U8U2VydmVIYW5kbGU+IHtcbiAgY29uc3QgYWRtaW5Ub2tlbkdlbmVyYXRlZCA9IG9wdGlvbnMuYWRtaW5Ub2tlbiA9PT0gdW5kZWZpbmVkO1xuICBjb25zdCBhZG1pblRva2VuID0gb3B0aW9ucy5hZG1pblRva2VuID8/IHJhbmRvbUJ5dGVzKDMyKS50b1N0cmluZygnaGV4Jyk7XG5cbiAgbGV0IGVuZ2luZUtpbmQ6IFNlcnZlSGFuZGxlWydlbmdpbmVLaW5kJ107XG4gIGxldCBlbmdpbmU7XG4gIGxldCB0b2tlblN0b3JlOiBUb2tlblN0b3JlO1xuICBpZiAob3B0aW9ucy5kYXRhRGlyICE9PSB1bmRlZmluZWQpIHtcbiAgICBta2RpclN5bmMob3B0aW9ucy5kYXRhRGlyLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcbiAgICBjb25zdCB7IGNyZWF0ZVBnU3luY0VuZ2luZSB9ID0gYXdhaXQgaW1wb3J0KCdAb2Focy9kYicpO1xuICAgIGVuZ2luZSA9IGNyZWF0ZVBnU3luY0VuZ2luZSh7IGRhdGFEaXI6IGpvaW4ob3B0aW9ucy5kYXRhRGlyLCAncGcnKSB9KTtcbiAgICB0b2tlblN0b3JlID0gbmV3IFRva2VuU3RvcmUoeyBwZXJzaXN0UGF0aDogam9pbihvcHRpb25zLmRhdGFEaXIsICd0b2tlbnMuanNvbicpIH0pO1xuICAgIGVuZ2luZUtpbmQgPSAncGdsaXRlJztcbiAgfSBlbHNlIHtcbiAgICBlbmdpbmUgPSBjcmVhdGVNZW1vcnlFbmdpbmUoKTtcbiAgICB0b2tlblN0b3JlID0gbmV3IFRva2VuU3RvcmUoKTtcbiAgICBlbmdpbmVLaW5kID0gJ21lbW9yeSc7XG4gIH1cblxuICBjb25zdCBhcHAgPSBhd2FpdCBidWlsZFNlcnZlcih7IGVuZ2luZSwgdG9rZW5TdG9yZSwgYWRtaW5Ub2tlbiB9KTtcbiAgYXdhaXQgYXBwLmxpc3Rlbih7IHBvcnQ6IG9wdGlvbnMucG9ydCA/PyBERUZBVUxUX1BPUlQsIGhvc3Q6IG9wdGlvbnMuaG9zdCA/PyAnMC4wLjAuMCcgfSk7XG4gIGNvbnN0IHsgcG9ydCB9ID0gYXBwLnNlcnZlci5hZGRyZXNzKCkgYXMgQWRkcmVzc0luZm87XG5cbiAgcmV0dXJuIHtcbiAgICB1cmw6IGBodHRwOi8vMTI3LjAuMC4xOiR7cG9ydH1gLFxuICAgIHBvcnQsXG4gICAgYWRtaW5Ub2tlbixcbiAgICBhZG1pblRva2VuR2VuZXJhdGVkLFxuICAgIGVuZ2luZUtpbmQsXG4gICAgY2xvc2U6IGFzeW5jICgpID0+IHtcbiAgICAgIGF3YWl0IGFwcC5jbG9zZSgpO1xuICAgIH0sXG4gIH07XG59XG4iLCAiLyoqXG4gKiBAb2Focy9zcGluZS1hcGkgXHUyMDE0IEhUVFAgKyBNQ1Agc3VyZmFjZXMgb3ZlciB0aGUgb25lIGNvbW1hbmQgYnVzLlxuICpcbiAqIEVudiBpcyByZWFkIE9OTFkgaGVyZSAoc3RhcnQoKSwgZm9yIHRoZSBDTEkgZW50cnlwb2ludCk7IHRoZSBsaWJyYXJ5XG4gKiBtb2R1bGVzIHRha2UgZXZlcnl0aGluZyBhcyBwYXJhbWV0ZXJzLlxuICovXG5pbXBvcnQgeyBjcmVhdGVNZW1vcnlFbmdpbmUgfSBmcm9tICdAb2Focy9jb3JlJztcblxuaW1wb3J0IHsgVG9rZW5TdG9yZSB9IGZyb20gJy4vYXV0aC5qcyc7XG5pbXBvcnQgeyBidWlsZFNlcnZlciB9IGZyb20gJy4vc2VydmVyLmpzJztcblxuZXhwb3J0IHsgVG9rZW5TdG9yZSwgdHlwZSBSZXNvbHZlZFRva2VuIH0gZnJvbSAnLi9hdXRoLmpzJztcbmV4cG9ydCB7IGNyZWF0ZUNvbW1hbmRCdXMgfSBmcm9tICcuL2J1cy5qcyc7XG5leHBvcnQgeyBidWlsZFNlcnZlciwgZXJyb3JFbnZlbG9wZSwgZXJyb3JOYW1lLCB0eXBlIEJ1aWxkU2VydmVyT3B0aW9ucyB9IGZyb20gJy4vc2VydmVyLmpzJztcbmV4cG9ydCB7IGJ1aWxkTWNwU2VydmVyLCByZWdpc3Rlck1jcFJvdXRlIH0gZnJvbSAnLi9tY3AuanMnO1xuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gc3RhcnQoKTogUHJvbWlzZTx2b2lkPiB7XG4gIGNvbnN0IHBvcnQgPSBOdW1iZXIocHJvY2Vzcy5lbnZbJ1BPUlQnXSA/PyAnMzAwMCcpO1xuICBjb25zdCBhZG1pblRva2VuID0gcHJvY2Vzcy5lbnZbJ09BSFNfQURNSU5fVE9LRU4nXTtcbiAgaWYgKGFkbWluVG9rZW4gPT09IHVuZGVmaW5lZCB8fCBhZG1pblRva2VuLmxlbmd0aCA9PT0gMCkge1xuICAgIHRocm93IG5ldyBFcnJvcignT0FIU19BRE1JTl9UT0tFTiBtdXN0IGJlIHNldCAoYm9vdHN0cmFwIGFkbWluIGNyZWRlbnRpYWwpJyk7XG4gIH1cbiAgY29uc3QgcGVyc2lzdFBhdGggPSBwcm9jZXNzLmVudlsnT0FIU19UT0tFTl9TVE9SRV9QQVRIJ107XG4gIGNvbnN0IHRva2VuU3RvcmUgPSBuZXcgVG9rZW5TdG9yZShwZXJzaXN0UGF0aCAhPT0gdW5kZWZpbmVkID8geyBwZXJzaXN0UGF0aCB9IDoge30pO1xuICBjb25zdCBlbmdpbmUgPSBjcmVhdGVNZW1vcnlFbmdpbmUoKTtcbiAgY29uc3QgYXBwID0gYXdhaXQgYnVpbGRTZXJ2ZXIoeyBlbmdpbmUsIHRva2VuU3RvcmUsIGFkbWluVG9rZW4gfSk7XG4gIGF3YWl0IGFwcC5saXN0ZW4oeyBwb3J0LCBob3N0OiAnMC4wLjAuMCcgfSk7XG4gIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gIGNvbnNvbGUubG9nKGBvYWhzIHNwaW5lLWFwaSBsaXN0ZW5pbmcgb24gOiR7cG9ydH0gKEhUVFAgL3JwYy8qLCBNQ1AgL21jcClgKTtcbn1cbiIsICIvKipcbiAqIFRva2VuU3RvcmUgXHUyMDE0IGJlYXJlci10b2tlbiBhdXRoZW50aWNhdGlvbiBmb3IgYm90aCBzdXJmYWNlcyAoSFRUUCArIE1DUCkuXG4gKlxuICogVG9rZW5zIGFyZSBvcGFxdWUgMzItYnl0ZSByYW5kb20gaGV4IHN0cmluZ3M7IG9ubHkgdGhlaXIgc2hhMjU2IGhhc2ggaXNcbiAqIHN0b3JlZCAoYW5kIG9wdGlvbmFsbHkgcGVyc2lzdGVkKSwgc28gYSBsZWFrZWQgc3RvcmUgZmlsZSBuZXZlciBsZWFrcyBhXG4gKiB1c2FibGUgY3JlZGVudGlhbC4gVGhlIGJvb3RzdHJhcCBhZG1pbiB0b2tlbiBhcnJpdmVzIGFzIGEgUEFSQU1FVEVSIFx1MjAxNCB0aGlzXG4gKiBtb2R1bGUgbmV2ZXIgcmVhZHMgdGhlIGVudmlyb25tZW50IChlbnYgaGFuZGxpbmcgbGl2ZXMgaW4gaW5kZXgudHMgc3RhcnQoKSkuXG4gKi9cbmltcG9ydCB7IGNyZWF0ZUhhc2gsIHJhbmRvbUJ5dGVzIH0gZnJvbSAnbm9kZTpjcnlwdG8nO1xuaW1wb3J0IHsgZXhpc3RzU3luYywgbWtkaXJTeW5jLCByZWFkRmlsZVN5bmMsIHdyaXRlRmlsZVN5bmMgfSBmcm9tICdub2RlOmZzJztcbmltcG9ydCB7IGRpcm5hbWUgfSBmcm9tICdub2RlOnBhdGgnO1xuXG5leHBvcnQgaW50ZXJmYWNlIFJlc29sdmVkVG9rZW4ge1xuICBhY3RvcklkOiBzdHJpbmc7XG4gIGlzQWRtaW46IGJvb2xlYW47XG59XG5cbmludGVyZmFjZSBQZXJzaXN0U2hhcGUge1xuICB2ZXJzaW9uOiAxO1xuICB0b2tlbnM6IFJlY29yZDxzdHJpbmcsIFJlc29sdmVkVG9rZW4+OyAvLyBzaGEyNTYodG9rZW4pIGhleCAtPiByZWNvcmRcbiAgLyoqXG4gICAqIFBoYXNlIDIgKHJvYWRtYXAgXHUwMEE3Myk6IHRoZSBSRUFMIGVuZ2luZSBhY3RvciB0aGUgYm9vdHN0cmFwIGFkbWluIHRva2VuXG4gICAqIGFjdHMgYXMgKCdXb3Jrc3BhY2UgQWRtaW4nLCBnb3Zlcm5hbmNlIHJvbGUgJ2FkbWluJykuIFBlcnNpc3RlZCBzbyBhXG4gICAqIGAtLWRhdGFgIHJlc3RhcnQgcmV1c2VzIHRoZSBzYW1lIGFjdG9yIGluc3RlYWQgb2YgbWludGluZyBhIG5ldyBvbmUuXG4gICAqL1xuICBhZG1pbkFjdG9ySWQ/OiBzdHJpbmc7XG59XG5cbmZ1bmN0aW9uIGhhc2hUb2tlbih0b2tlbjogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIGNyZWF0ZUhhc2goJ3NoYTI1NicpLnVwZGF0ZSh0b2tlbiwgJ3V0ZjgnKS5kaWdlc3QoJ2hleCcpO1xufVxuXG5leHBvcnQgY2xhc3MgVG9rZW5TdG9yZSB7XG4gIHByaXZhdGUgcmVhZG9ubHkgYnlIYXNoID0gbmV3IE1hcDxzdHJpbmcsIFJlc29sdmVkVG9rZW4+KCk7XG4gIHByaXZhdGUgcmVhZG9ubHkgcGVyc2lzdFBhdGg6IHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgcHJpdmF0ZSBhZG1pbkFjdG9ySWQ6IHN0cmluZyB8IHVuZGVmaW5lZDtcblxuICBjb25zdHJ1Y3RvcihvcHRpb25zPzogeyBwZXJzaXN0UGF0aD86IHN0cmluZyB9KSB7XG4gICAgdGhpcy5wZXJzaXN0UGF0aCA9IG9wdGlvbnM/LnBlcnNpc3RQYXRoO1xuICAgIGlmICh0aGlzLnBlcnNpc3RQYXRoICE9PSB1bmRlZmluZWQgJiYgZXhpc3RzU3luYyh0aGlzLnBlcnNpc3RQYXRoKSkge1xuICAgICAgY29uc3QgcmF3ID0gSlNPTi5wYXJzZShyZWFkRmlsZVN5bmModGhpcy5wZXJzaXN0UGF0aCwgJ3V0ZjgnKSkgYXMgUGVyc2lzdFNoYXBlO1xuICAgICAgZm9yIChjb25zdCBbaGFzaCwgcmVjb3JkXSBvZiBPYmplY3QuZW50cmllcyhyYXcudG9rZW5zKSkge1xuICAgICAgICB0aGlzLmJ5SGFzaC5zZXQoaGFzaCwgeyBhY3RvcklkOiByZWNvcmQuYWN0b3JJZCwgaXNBZG1pbjogcmVjb3JkLmlzQWRtaW4gfSk7XG4gICAgICB9XG4gICAgICB0aGlzLmFkbWluQWN0b3JJZCA9IHJhdy5hZG1pbkFjdG9ySWQ7XG4gICAgfVxuICB9XG5cbiAgLyoqIFBlcnNpc3RlZCBlbmdpbmUtYWN0b3IgaWQgdGhlIGJvb3RzdHJhcCBhZG1pbiB0b2tlbiBtYXBzIHRvIChpZiBhbnkpLiAqL1xuICBnZXRBZG1pbkFjdG9ySWQoKTogc3RyaW5nIHwgdW5kZWZpbmVkIHtcbiAgICByZXR1cm4gdGhpcy5hZG1pbkFjdG9ySWQ7XG4gIH1cblxuICAvKiogUmVtZW1iZXIgKGFuZCBwZXJzaXN0KSB0aGUgYm9vdHN0cmFwIGFkbWluIGFjdG9yIG1hcHBpbmcuICovXG4gIHNldEFkbWluQWN0b3JJZChhY3RvcklkOiBzdHJpbmcpOiB2b2lkIHtcbiAgICB0aGlzLmFkbWluQWN0b3JJZCA9IGFjdG9ySWQ7XG4gICAgdGhpcy5zYXZlKCk7XG4gIH1cblxuICAvKipcbiAgICogUmVnaXN0ZXIgdGhlIGJvb3RzdHJhcCBhZG1pbiB0b2tlbiAoc3Vydml2ZXMgcmVzdGFydHMgYnkgcmUtYm9vdHN0cmFwLFxuICAgKiBub3QgcGVyc2lzdGVuY2UgXHUyMDE0IHRoZSBhZG1pbiBjcmVkZW50aWFsIGlzIGNvbmZpZ3VyYXRpb24sIG5vdCBzdGF0ZSkuXG4gICAqL1xuICBib290c3RyYXBBZG1pbih0b2tlbjogc3RyaW5nLCBhY3RvcklkID0gJ2FkbWluJyk6IHZvaWQge1xuICAgIHRoaXMuYnlIYXNoLnNldChoYXNoVG9rZW4odG9rZW4pLCB7IGFjdG9ySWQsIGlzQWRtaW46IHRydWUgfSk7XG4gIH1cblxuICAvKiogSXNzdWUgYSBmcmVzaCB0b2tlbiBmb3IgYW4gYWN0b3IuIFRoZSBwbGFpbnRleHQgaXMgcmV0dXJuZWQgZXhhY3RseSBvbmNlLiAqL1xuICBpc3N1ZShhY3RvcklkOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIGNvbnN0IHRva2VuID0gcmFuZG9tQnl0ZXMoMzIpLnRvU3RyaW5nKCdoZXgnKTtcbiAgICB0aGlzLmJ5SGFzaC5zZXQoaGFzaFRva2VuKHRva2VuKSwgeyBhY3RvcklkLCBpc0FkbWluOiBmYWxzZSB9KTtcbiAgICB0aGlzLnNhdmUoKTtcbiAgICByZXR1cm4gdG9rZW47XG4gIH1cblxuICByZXNvbHZlKHRva2VuOiBzdHJpbmcpOiBSZXNvbHZlZFRva2VuIHwgbnVsbCB7XG4gICAgY29uc3QgcmVjb3JkID0gdGhpcy5ieUhhc2guZ2V0KGhhc2hUb2tlbih0b2tlbikpO1xuICAgIHJldHVybiByZWNvcmQgPyB7IC4uLnJlY29yZCB9IDogbnVsbDtcbiAgfVxuXG4gIHByaXZhdGUgc2F2ZSgpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5wZXJzaXN0UGF0aCA9PT0gdW5kZWZpbmVkKSByZXR1cm47XG4gICAgY29uc3Qgc2hhcGU6IFBlcnNpc3RTaGFwZSA9IHtcbiAgICAgIHZlcnNpb246IDEsXG4gICAgICB0b2tlbnM6IHt9LFxuICAgICAgLi4uKHRoaXMuYWRtaW5BY3RvcklkICE9PSB1bmRlZmluZWQgPyB7IGFkbWluQWN0b3JJZDogdGhpcy5hZG1pbkFjdG9ySWQgfSA6IHt9KSxcbiAgICB9O1xuICAgIGZvciAoY29uc3QgW2hhc2gsIHJlY29yZF0gb2YgdGhpcy5ieUhhc2gpIHtcbiAgICAgIC8vIEFkbWluIGJvb3RzdHJhcCBlbnRyaWVzIGFyZSBjb25maWd1cmF0aW9uOyBwZXJzaXN0IG9ubHkgaXNzdWVkIHRva2Vucy5cbiAgICAgIGlmIChyZWNvcmQuaXNBZG1pbikgY29udGludWU7XG4gICAgICBzaGFwZS50b2tlbnNbaGFzaF0gPSB7IC4uLnJlY29yZCB9O1xuICAgIH1cbiAgICBta2RpclN5bmMoZGlybmFtZSh0aGlzLnBlcnNpc3RQYXRoKSwgeyByZWN1cnNpdmU6IHRydWUgfSk7XG4gICAgd3JpdGVGaWxlU3luYyh0aGlzLnBlcnNpc3RQYXRoLCBKU09OLnN0cmluZ2lmeShzaGFwZSwgbnVsbCwgMiksICd1dGY4Jyk7XG4gIH1cbn1cbiIsICIvKipcbiAqIEZhc3RpZnkgSFRUUCBhZGFwdGVyOiBQT1NUIC9ycGMvPGNvbW1hbmQ+IFx1MjAxNCBhIHRoaW4gcGFyc2VyIGluIGZyb250IG9mIHRoZVxuICogY29tbWFuZCBidXMuIEV2ZXJ5IHJlamVjdGlvbiBjcm9zc2VzIHRoZSB3aXJlIGFzIHRoZSBjb250cmFjdHMgZW52ZWxvcGUsXG4gKiBzdGF0dXMtbWFwcGVkIGJ5IEhUVFBfU1RBVFVTIHNvIGVycm9yIHNlbWFudGljcyBzdXJ2aXZlIHRoZSB0cmFuc3BvcnQuXG4gKi9cbmltcG9ydCBGYXN0aWZ5LCB7IHR5cGUgRmFzdGlmeUluc3RhbmNlLCB0eXBlIEZhc3RpZnlSZXF1ZXN0IH0gZnJvbSAnZmFzdGlmeSc7XG5pbXBvcnQge1xuICBDb25mbGljdEVycm9yLFxuICBHdWFyZEZhaWxlZEVycm9yLFxuICBJbnZhbGlkVHJhbnNpdGlvbkVycm9yLFxuICBQZXJtaXNzaW9uRGVuaWVkRXJyb3IsXG4gIFN0b3JpZXNWYWxpZGF0aW9uRXJyb3IsXG4gIHR5cGUgU3BpbmVFbmdpbmUsXG59IGZyb20gJ0BvYWhzL2NvcmUnO1xuaW1wb3J0IHtcbiAgQ09NTUFORF9NQVAsXG4gIEhUVFBfU1RBVFVTLFxuICB0eXBlIEFjdG9yQ29udGV4dCxcbiAgdHlwZSBFcnJvckVudmVsb3BlLFxufSBmcm9tICdAb2Focy9jb250cmFjdHMnO1xuXG5pbXBvcnQgdHlwZSB7IFRva2VuU3RvcmUgfSBmcm9tICcuL2F1dGguanMnO1xuaW1wb3J0IHsgY3JlYXRlQ29tbWFuZEJ1cyB9IGZyb20gJy4vYnVzLmpzJztcbmltcG9ydCB7IHJlZ2lzdGVyTWNwUm91dGUgfSBmcm9tICcuL21jcC5qcyc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgQnVpbGRTZXJ2ZXJPcHRpb25zIHtcbiAgZW5naW5lOiBTcGluZUVuZ2luZTtcbiAgdG9rZW5TdG9yZTogVG9rZW5TdG9yZTtcbiAgLyoqIEJvb3RzdHJhcCBhZG1pbiBjcmVkZW50aWFsIFx1MjAxNCBwYXNzZWQgaW4sIG5ldmVyIHJlYWQgZnJvbSBlbnYgaGVyZS4gKi9cbiAgYWRtaW5Ub2tlbjogc3RyaW5nO1xufVxuXG4vKiogTWFwIGEgdGhyb3duIGNvcmUgZXJyb3Igb250byB0aGUgd2lyZSBlcnJvciB0YXhvbm9teS4gKi9cbmV4cG9ydCBmdW5jdGlvbiBlcnJvck5hbWUoZXJyb3I6IHVua25vd24pOiBFcnJvckVudmVsb3BlWydlcnJvciddWyduYW1lJ10ge1xuICBpZiAoZXJyb3IgaW5zdGFuY2VvZiBQZXJtaXNzaW9uRGVuaWVkRXJyb3IpIHJldHVybiAnUGVybWlzc2lvbkRlbmllZEVycm9yJztcbiAgaWYgKGVycm9yIGluc3RhbmNlb2YgQ29uZmxpY3RFcnJvcikgcmV0dXJuICdDb25mbGljdEVycm9yJztcbiAgaWYgKGVycm9yIGluc3RhbmNlb2YgR3VhcmRGYWlsZWRFcnJvcikgcmV0dXJuICdHdWFyZEZhaWxlZEVycm9yJztcbiAgaWYgKGVycm9yIGluc3RhbmNlb2YgSW52YWxpZFRyYW5zaXRpb25FcnJvcikgcmV0dXJuICdJbnZhbGlkVHJhbnNpdGlvbkVycm9yJztcbiAgaWYgKGVycm9yIGluc3RhbmNlb2YgU3Rvcmllc1ZhbGlkYXRpb25FcnJvcikgcmV0dXJuICdTdG9yaWVzVmFsaWRhdGlvbkVycm9yJztcbiAgcmV0dXJuICdFcnJvcic7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBlcnJvckVudmVsb3BlKGVycm9yOiB1bmtub3duKTogRXJyb3JFbnZlbG9wZSB7XG4gIHJldHVybiB7XG4gICAgb2s6IGZhbHNlLFxuICAgIGVycm9yOiB7XG4gICAgICBuYW1lOiBlcnJvck5hbWUoZXJyb3IpLFxuICAgICAgbWVzc2FnZTogZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpLFxuICAgIH0sXG4gIH07XG59XG5cbi8qKlxuICogUGhhc2UgMiBib290c3RyYXAgKHJvYWRtYXAgXHUwMEE3Myk6IHRoZSBhZG1pbiB0b2tlbiBtdXN0IHJlc29sdmUgdG8gYSBSRUFMXG4gKiBlbmdpbmUgYWN0b3IgaG9sZGluZyBnb3Zlcm5hbmNlIHJvbGUgJ2FkbWluJyBcdTIwMTQgZ2F0ZWQgZW50aXRsZW1lbnQgd3JpdGVzXG4gKiAoYXNzaWduX3JvbGUvc2V0X3BsYW4vc2V0XypfcG9saWN5L1x1MjAyNikgYXJlIGF1dGhvcml6ZWQgYnkgdGhlIEVOR0lORSBmcm9tXG4gKiB0aGF0IHJvbGUsIG5ldmVyIGJ5IHRoZSB0cmFuc3BvcnQncyBpc0FkbWluIGZsYWcuIFRoZSBtYXBwaW5nIHBlcnNpc3RzIGluXG4gKiB0aGUgVG9rZW5TdG9yZSwgc28gYSBgLS1kYXRhYCByZXN0YXJ0IHJldXNlcyB0aGUgc2FtZSAnV29ya3NwYWNlIEFkbWluJ1xuICogYWN0b3I7IHdoZW4gdGhlIGVuZ2luZSBjYW5ub3QgY29uZmlybSB0aGUgcGVyc2lzdGVkIHJvbGUgKGZyZXNoIGVuZ2luZSwgb3JcbiAqIGEgcGVyc2lzdGVuY2UgbGF5ZXIgdGhhdCBwcmVkYXRlcyBQaGFzZSAyKSwgYSBmcmVzaCBib290c3RyYXAgYWN0b3IgaXNcbiAqIGNyZWF0ZWQgaW5zdGVhZC5cbiAqL1xuZnVuY3Rpb24gZW5zdXJlQm9vdHN0cmFwQWRtaW5BY3RvcihlbmdpbmU6IFNwaW5lRW5naW5lLCB0b2tlblN0b3JlOiBUb2tlblN0b3JlKTogc3RyaW5nIHtcbiAgY29uc3QgcGVyc2lzdGVkID0gdG9rZW5TdG9yZS5nZXRBZG1pbkFjdG9ySWQoKTtcbiAgaWYgKHBlcnNpc3RlZCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgdHJ5IHtcbiAgICAgIGlmIChlbmdpbmUuZ2V0R292ZXJuYW5jZVJvbGUocGVyc2lzdGVkKSA9PT0gJ2FkbWluJykgcmV0dXJuIHBlcnNpc3RlZDtcbiAgICB9IGNhdGNoIHtcbiAgICAgIC8vIGZhbGwgdGhyb3VnaDogdGhlIGVuZ2luZSBjYW5ub3Qgdm91Y2ggZm9yIHRoZSBwZXJzaXN0ZWQgbWFwcGluZ1xuICAgIH1cbiAgfVxuICBjb25zdCBhY3RvciA9IGVuZ2luZS5jcmVhdGVBY3Rvcih7XG4gICAgdHlwZTogJ3VzZXInLFxuICAgIGRpc3BsYXlOYW1lOiAnV29ya3NwYWNlIEFkbWluJyxcbiAgICBnb3Zlcm5hbmNlUm9sZTogJ2FkbWluJyxcbiAgfSk7XG4gIHRva2VuU3RvcmUuc2V0QWRtaW5BY3RvcklkKGFjdG9yLmlkKTtcbiAgcmV0dXJuIGFjdG9yLmlkO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gYnVpbGRTZXJ2ZXIob3B0aW9uczogQnVpbGRTZXJ2ZXJPcHRpb25zKTogUHJvbWlzZTxGYXN0aWZ5SW5zdGFuY2U+IHtcbiAgY29uc3QgeyBlbmdpbmUsIHRva2VuU3RvcmUsIGFkbWluVG9rZW4gfSA9IG9wdGlvbnM7XG4gIHRva2VuU3RvcmUuYm9vdHN0cmFwQWRtaW4oYWRtaW5Ub2tlbiwgZW5zdXJlQm9vdHN0cmFwQWRtaW5BY3RvcihlbmdpbmUsIHRva2VuU3RvcmUpKTtcbiAgY29uc3QgYnVzID0gY3JlYXRlQ29tbWFuZEJ1cyhlbmdpbmUsIHRva2VuU3RvcmUpO1xuXG4gIGNvbnN0IGFwcCA9IEZhc3RpZnkoeyBsb2dnZXI6IGZhbHNlIH0pO1xuXG4gIGNvbnN0IGF1dGhlbnRpY2F0ZSA9IChyZXF1ZXN0OiBGYXN0aWZ5UmVxdWVzdCk6IEFjdG9yQ29udGV4dCB8IG51bGwgPT4ge1xuICAgIGNvbnN0IGhlYWRlciA9IHJlcXVlc3QuaGVhZGVycy5hdXRob3JpemF0aW9uO1xuICAgIGlmICh0eXBlb2YgaGVhZGVyICE9PSAnc3RyaW5nJyB8fCAhaGVhZGVyLnN0YXJ0c1dpdGgoJ0JlYXJlciAnKSkgcmV0dXJuIG51bGw7XG4gICAgY29uc3QgcmVzb2x2ZWQgPSB0b2tlblN0b3JlLnJlc29sdmUoaGVhZGVyLnNsaWNlKCdCZWFyZXIgJy5sZW5ndGgpLnRyaW0oKSk7XG4gICAgcmV0dXJuIHJlc29sdmVkID09PSBudWxsID8gbnVsbCA6IHsgYWN0b3JJZDogcmVzb2x2ZWQuYWN0b3JJZCwgaXNBZG1pbjogcmVzb2x2ZWQuaXNBZG1pbiB9O1xuICB9O1xuXG4gIGFwcC5nZXQoJy9oZWFsdGh6JywgYXN5bmMgKCkgPT4gKHsgb2s6IHRydWUgfSkpO1xuXG4gIGFwcC5wb3N0KCcvcnBjLzpjb21tYW5kJywgYXN5bmMgKHJlcXVlc3QsIHJlcGx5KSA9PiB7XG4gICAgY29uc3QgY3R4ID0gYXV0aGVudGljYXRlKHJlcXVlc3QpO1xuICAgIGlmIChjdHggPT09IG51bGwpIHtcbiAgICAgIHJldHVybiByZXBseS5jb2RlKDQwMSkuc2VuZCh7XG4gICAgICAgIG9rOiBmYWxzZSxcbiAgICAgICAgZXJyb3I6IHsgbmFtZTogJ0Vycm9yJywgbWVzc2FnZTogJ3VuYXV0aG9yaXplZDogbWlzc2luZyBvciBpbnZhbGlkIGJlYXJlciB0b2tlbicgfSxcbiAgICAgIH0gc2F0aXNmaWVzIEVycm9yRW52ZWxvcGUpO1xuICAgIH1cbiAgICBjb25zdCB7IGNvbW1hbmQgfSA9IHJlcXVlc3QucGFyYW1zIGFzIHsgY29tbWFuZDogc3RyaW5nIH07XG4gICAgaWYgKCFDT01NQU5EX01BUC5oYXMoY29tbWFuZCkpIHtcbiAgICAgIHJldHVybiByZXBseS5jb2RlKDQwNCkuc2VuZCh7XG4gICAgICAgIG9rOiBmYWxzZSxcbiAgICAgICAgZXJyb3I6IHsgbmFtZTogJ0Vycm9yJywgbWVzc2FnZTogYHVua25vd24gY29tbWFuZDogJHtjb21tYW5kfWAgfSxcbiAgICAgIH0gc2F0aXNmaWVzIEVycm9yRW52ZWxvcGUpO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgYnVzLmV4ZWN1dGUoY29tbWFuZCwgcmVxdWVzdC5ib2R5ID8/IHt9LCBjdHgpO1xuICAgICAgcmV0dXJuIHJlcGx5LmNvZGUoMjAwKS5zZW5kKHsgb2s6IHRydWUsIHJlc3VsdCB9KTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgY29uc3QgZW52ZWxvcGUgPSBlcnJvckVudmVsb3BlKGVycm9yKTtcbiAgICAgIHJldHVybiByZXBseS5jb2RlKEhUVFBfU1RBVFVTW2VudmVsb3BlLmVycm9yLm5hbWVdKS5zZW5kKGVudmVsb3BlKTtcbiAgICB9XG4gIH0pO1xuXG4gIHJlZ2lzdGVyTWNwUm91dGUoYXBwLCBidXMsIGF1dGhlbnRpY2F0ZSk7XG5cbiAgcmV0dXJuIGFwcDtcbn1cbiIsICIvKipcbiAqIFRoZSBjb21tYW5kIGJ1cyBcdTIwMTQgdGhlIE9ORSBwbGFjZSBjb21tYW5kcyBleGVjdXRlIChyb2FkbWFwIFx1MDBBNzAuMTogbm8gd3JpdGVzXG4gKiBvdXRzaWRlIHRoZSBjb21tYW5kIGJ1cykuIEhUVFAgKC9ycGMvOmNvbW1hbmQpIGFuZCBNQ1AgKG9haHNfKiB0b29scykgYXJlXG4gKiB0aGluIHBhcnNlcnMgaW4gZnJvbnQgb2YgZXhlY3V0ZSgpOyBuZWl0aGVyIGNhcnJpZXMgaXRzIG93biBsb2dpYy5cbiAqXG4gKiBBY3RvciBpZGVudGl0eSBBTFdBWVMgY29tZXMgZnJvbSB0aGUgYXV0aGVudGljYXRlZCBjb250ZXh0LCBuZXZlciBmcm9tIHRoZVxuICogcmVxdWVzdCBib2R5IFx1MjAxNCBhIGxpZmVjeWNsZSBjb21tYW5kIGNhbiBvbmx5IGFjdCBhcyB0aGUgYWN0b3Igd2hvc2UgdG9rZW5cbiAqIHNpZ25lZCB0aGUgcmVxdWVzdC5cbiAqL1xuaW1wb3J0IHtcbiAgR3VhcmRGYWlsZWRFcnJvcixcbiAgUGVybWlzc2lvbkRlbmllZEVycm9yLFxuICB0eXBlIEFjdG9yVHlwZSxcbiAgdHlwZSBCbG9ja2VkUmVhc29uLFxuICB0eXBlIEV2aWRlbmNlLFxuICB0eXBlIEdhdGVDb2RlLFxuICB0eXBlIEdvdmVybmFuY2VSb2xlLFxuICB0eXBlIFBlcm1pc3Npb24sXG4gIHR5cGUgUGxhbkNvZGUsXG4gIHR5cGUgU3BpbmVFbmdpbmUsXG4gIHR5cGUgV29ya0l0ZW1TdGF0ZSxcbn0gZnJvbSAnQG9haHMvY29yZSc7XG5pbXBvcnQgeyBDT01NQU5EX01BUCwgdHlwZSBBY3RvckNvbnRleHQsIHR5cGUgQ29tbWFuZEJ1cywgdHlwZSBDb21tYW5kTmFtZSB9IGZyb20gJ0BvYWhzL2NvbnRyYWN0cyc7XG5cbmltcG9ydCB0eXBlIHsgVG9rZW5TdG9yZSB9IGZyb20gJy4vYXV0aC5qcyc7XG5cbi8vIFBhcnNlZC1pbnB1dCBzaGFwZXMgKG1pcnJvciB0aGUgem9kIHNjaGVtYXMgaW4gQG9haHMvY29udHJhY3RzOyB0aGUgem9kXG4vLyBwYXJzZSBpbiBleGVjdXRlKCkgaXMgdGhlIHJ1bnRpbWUgZ3VhcmFudGVlLCB0aGVzZSBhcmUgdGhlIHN0YXRpYyB2aWV3KS5cbmludGVyZmFjZSBDcmVhdGVBY3RvckluIHsgdHlwZTogJ3VzZXInIHwgJ2FnZW50JzsgZGlzcGxheU5hbWU6IHN0cmluZzsgZ292ZXJuYW5jZVJvbGU/OiBHb3Zlcm5hbmNlUm9sZSB8IHVuZGVmaW5lZCB9XG5pbnRlcmZhY2UgR3JhbnRJbiB7IGFjdG9ySWQ6IHN0cmluZzsgcGVybWlzc2lvbjogc3RyaW5nOyBzY29wZT86IHN0cmluZyB8IHVuZGVmaW5lZCB9XG5pbnRlcmZhY2UgUm9sZUluIHsgYWN0b3JJZDogc3RyaW5nOyByb2xlQ29kZTogc3RyaW5nIH1cbmludGVyZmFjZSBMaXN0Um9sZUFzc2lnbm1lbnRzSW4geyBhY3RvcklkPzogc3RyaW5nIHwgdW5kZWZpbmVkIH1cbmludGVyZmFjZSBTZXRHb3Zlcm5hbmNlUm9sZUluIHsgYWN0b3JJZDogc3RyaW5nOyByb2xlOiBHb3Zlcm5hbmNlUm9sZSB9XG5pbnRlcmZhY2UgU2V0UGxhbkluIHsgcGxhbjogUGxhbkNvZGUgfVxuaW50ZXJmYWNlIFNldFdvcmtzcGFjZVBvbGljeUluIHtcbiAgcG9saWN5OiB7IGFnZW50R2F0ZUFwcHJvdmFscz86IGJvb2xlYW4gfCB1bmRlZmluZWQ7IGFnZW50U2VsZkRpc3BhdGNoPzogYm9vbGVhbiB8IHVuZGVmaW5lZCB9O1xufVxuaW50ZXJmYWNlIFNldEdhdGVQb2xpY3lJbiB7XG4gIGdhdGU6IEdhdGVDb2RlO1xuICBwb2xpY3k6IHsgbWluQXBwcm92YWxzPzogbnVtYmVyIHwgdW5kZWZpbmVkOyByZXF1aXJlZEFjdG9yVHlwZXM/OiBBY3RvclR5cGVbXSB8IHVuZGVmaW5lZCB9O1xufVxuaW50ZXJmYWNlIEF1dGh6RXhwbGFpbkluIHsgYWN0b3JJZDogc3RyaW5nOyBwZXJtaXNzaW9uOiBzdHJpbmcgfVxuaW50ZXJmYWNlIEltcG9ydFN0b3JpZXNJbiB7IGZlYXR1cmVJZDogc3RyaW5nOyB5YW1sOiBzdHJpbmcgfVxuaW50ZXJmYWNlIENsYWltVGFza0luIHsgd29ya0l0ZW1JZDogc3RyaW5nOyB0dGxNcz86IG51bWJlciB8IHVuZGVmaW5lZCB9XG5pbnRlcmZhY2UgSGVhcnRiZWF0SW4geyBjbGFpbUlkOiBzdHJpbmcgfVxuaW50ZXJmYWNlIFJlbGVhc2VDbGFpbUluIHsgY2xhaW1JZDogc3RyaW5nOyByZWFzb24/OiBzdHJpbmcgfCB1bmRlZmluZWQgfVxuaW50ZXJmYWNlIEFkdmFuY2VJbiB7IHdvcmtJdGVtSWQ6IHN0cmluZzsgdG86IFdvcmtJdGVtU3RhdGU7IGZlbmNpbmdUb2tlbj86IG51bWJlciB8IHVuZGVmaW5lZDsgaWRlbXBvdGVuY3lLZXk/OiBzdHJpbmcgfCB1bmRlZmluZWQgfVxuaW50ZXJmYWNlIEJsb2NrSW4geyB3b3JrSXRlbUlkOiBzdHJpbmc7IHJlYXNvbjogQmxvY2tlZFJlYXNvbjsgZmVuY2luZ1Rva2VuPzogbnVtYmVyIHwgdW5kZWZpbmVkIH1cbmludGVyZmFjZSBXb3JrSXRlbUluIHsgd29ya0l0ZW1JZDogc3RyaW5nIH1cbmludGVyZmFjZSBTdWJtaXRFdmlkZW5jZUluIHsgd29ya0l0ZW1JZDogc3RyaW5nOyBldmlkZW5jZTogRXZpZGVuY2U7IGZlbmNpbmdUb2tlbj86IG51bWJlciB8IHVuZGVmaW5lZCB9XG5pbnRlcmZhY2UgQXBwcm92ZUdhdGVJbiB7IHdvcmtJdGVtSWQ6IHN0cmluZzsgZ2F0ZTogR2F0ZUNvZGU7IHBpbm5lZFZlcmlmaWNhdGlvbj86IHN0cmluZ1tdIHwgdW5kZWZpbmVkIH1cbmludGVyZmFjZSBSZWplY3RHYXRlSW4geyB3b3JrSXRlbUlkOiBzdHJpbmc7IGdhdGU6IEdhdGVDb2RlIH1cbmludGVyZmFjZSBGZWF0dXJlSW4geyBmZWF0dXJlSWQ6IHN0cmluZyB9XG5pbnRlcmZhY2UgTGlzdFdvcmtJdGVtc0luIHsgc3RhdGU/OiBXb3JrSXRlbVN0YXRlIHwgdW5kZWZpbmVkOyBmZWF0dXJlSWQ/OiBzdHJpbmcgfCB1bmRlZmluZWQ7IGNsYWltYWJsZT86IGJvb2xlYW4gfCB1bmRlZmluZWQgfVxuaW50ZXJmYWNlIFF1ZXJ5RXZlbnRzSW4geyBzdHJlYW1JZD86IHN0cmluZyB8IHVuZGVmaW5lZCB9XG5cbi8qKiBDb21wYWN0IG9uZS1saW5lIHN1bW1hcnkgb2Ygem9kIGlzc3VlcyAoZHVjay10eXBlZDogem9kIGNvcGllcyBtYXkgZGlmZmVyKS4gKi9cbmZ1bmN0aW9uIHpvZE1lc3NhZ2UoZXJyb3I6IHVua25vd24pOiBzdHJpbmcge1xuICBjb25zdCBpc3N1ZXMgPSAoZXJyb3IgYXMgeyBpc3N1ZXM/OiBBcnJheTx7IHBhdGg/OiBBcnJheTxzdHJpbmcgfCBudW1iZXI+OyBtZXNzYWdlPzogc3RyaW5nIH0+IH0pXG4gICAgLmlzc3VlcztcbiAgaWYgKCFBcnJheS5pc0FycmF5KGlzc3VlcykpIHJldHVybiBTdHJpbmcoZXJyb3IpO1xuICByZXR1cm4gaXNzdWVzXG4gICAgLm1hcCgoaXNzdWUpID0+IHtcbiAgICAgIGNvbnN0IHBhdGggPSBpc3N1ZS5wYXRoICYmIGlzc3VlLnBhdGgubGVuZ3RoID4gMCA/IGlzc3VlLnBhdGguam9pbignLicpIDogJyhyb290KSc7XG4gICAgICByZXR1cm4gYCR7cGF0aH06ICR7aXNzdWUubWVzc2FnZSA/PyAnaW52YWxpZCd9YDtcbiAgICB9KVxuICAgIC5qb2luKCc7ICcpO1xufVxuXG5mdW5jdGlvbiByZXF1aXJlQWRtaW4oY3R4OiBBY3RvckNvbnRleHQsIGNvbW1hbmQ6IHN0cmluZyk6IHZvaWQge1xuICBpZiAoIWN0eC5pc0FkbWluKSB7XG4gICAgdGhyb3cgbmV3IFBlcm1pc3Npb25EZW5pZWRFcnJvcihgYWRtaW46JHtjb21tYW5kfWAgYXMgUGVybWlzc2lvbiwgY3R4LmFjdG9ySWQpO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVDb21tYW5kQnVzKGVuZ2luZTogU3BpbmVFbmdpbmUsIHRva2VuczogVG9rZW5TdG9yZSk6IENvbW1hbmRCdXMge1xuICBhc3luYyBmdW5jdGlvbiBleGVjdXRlKGNvbW1hbmQ6IHN0cmluZywgaW5wdXQ6IHVua25vd24sIGN0eDogQWN0b3JDb250ZXh0KTogUHJvbWlzZTx1bmtub3duPiB7XG4gICAgY29uc3QgZGVmID0gQ09NTUFORF9NQVAuZ2V0KGNvbW1hbmQpO1xuICAgIGlmICghZGVmKSB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcihgdW5rbm93biBjb21tYW5kOiAke2NvbW1hbmR9YCk7XG5cbiAgICBjb25zdCBwYXJzZWRSZXN1bHQgPSBkZWYuaW5wdXQuc2FmZVBhcnNlKGlucHV0ID8/IHt9KTtcbiAgICBpZiAoIXBhcnNlZFJlc3VsdC5zdWNjZXNzKSB7XG4gICAgICB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcihgaW52YWxpZCBpbnB1dCBmb3IgJHtjb21tYW5kfTogJHt6b2RNZXNzYWdlKHBhcnNlZFJlc3VsdC5lcnJvcil9YCk7XG4gICAgfVxuICAgIGNvbnN0IHBhcnNlZDogdW5rbm93biA9IHBhcnNlZFJlc3VsdC5kYXRhO1xuXG4gICAgc3dpdGNoIChjb21tYW5kIGFzIENvbW1hbmROYW1lKSB7XG4gICAgICAvLyAtLSBzZXR1cCAvIGFkbWluIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICBjYXNlICdjcmVhdGVfYWN0b3InOiB7XG4gICAgICAgIC8vIGNyZWF0ZV9hY3RvciBzdGF5cyBhZG1pbi10b2tlbi1nYXRlZCAoYm9vdHN0cmFwIHBsdW1iaW5nKSwgd2hpY2hcbiAgICAgICAgLy8gYWxzbyBtYWtlcyBpdCB0aGUgb25seSBjdHggYWxsb3dlZCB0byBwYXNzIGdvdmVybmFuY2VSb2xlLlxuICAgICAgICByZXF1aXJlQWRtaW4oY3R4LCBjb21tYW5kKTtcbiAgICAgICAgY29uc3QgcCA9IHBhcnNlZCBhcyBDcmVhdGVBY3RvckluO1xuICAgICAgICBjb25zdCBhY3RvciA9IGVuZ2luZS5jcmVhdGVBY3Rvcih7XG4gICAgICAgICAgdHlwZTogcC50eXBlLFxuICAgICAgICAgIGRpc3BsYXlOYW1lOiBwLmRpc3BsYXlOYW1lLFxuICAgICAgICAgIC4uLihwLmdvdmVybmFuY2VSb2xlICE9PSB1bmRlZmluZWQgPyB7IGdvdmVybmFuY2VSb2xlOiBwLmdvdmVybmFuY2VSb2xlIH0gOiB7fSksXG4gICAgICAgIH0pO1xuICAgICAgICBjb25zdCB0b2tlbiA9IHRva2Vucy5pc3N1ZShhY3Rvci5pZCk7XG4gICAgICAgIHJldHVybiB7IGFjdG9yLCB0b2tlbiB9O1xuICAgICAgfVxuICAgICAgY2FzZSAnZ3JhbnRfcGVybWlzc2lvbic6IHtcbiAgICAgICAgcmVxdWlyZUFkbWluKGN0eCwgY29tbWFuZCk7XG4gICAgICAgIGNvbnN0IHAgPSBwYXJzZWQgYXMgR3JhbnRJbjtcbiAgICAgICAgZW5naW5lLmdyYW50KHtcbiAgICAgICAgICBhY3RvcklkOiBwLmFjdG9ySWQsXG4gICAgICAgICAgcGVybWlzc2lvbjogcC5wZXJtaXNzaW9uIGFzIFBlcm1pc3Npb24sXG4gICAgICAgICAgLi4uKHAuc2NvcGUgIT09IHVuZGVmaW5lZCA/IHsgc2NvcGU6IHAuc2NvcGUgfSA6IHt9KSxcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiB7IGdyYW50ZWQ6IHRydWUgfTtcbiAgICAgIH1cbiAgICAgIGNhc2UgJ3Jldm9rZV9wZXJtaXNzaW9uJzoge1xuICAgICAgICByZXF1aXJlQWRtaW4oY3R4LCBjb21tYW5kKTtcbiAgICAgICAgY29uc3QgcCA9IHBhcnNlZCBhcyBHcmFudEluO1xuICAgICAgICBlbmdpbmUucmV2b2tlKHtcbiAgICAgICAgICBhY3RvcklkOiBwLmFjdG9ySWQsXG4gICAgICAgICAgcGVybWlzc2lvbjogcC5wZXJtaXNzaW9uIGFzIFBlcm1pc3Npb24sXG4gICAgICAgICAgLi4uKHAuc2NvcGUgIT09IHVuZGVmaW5lZCA/IHsgc2NvcGU6IHAuc2NvcGUgfSA6IHt9KSxcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiB7IHJldm9rZWQ6IHRydWUgfTtcbiAgICAgIH1cbiAgICAgIGNhc2UgJ2NyZWF0ZV9mZWF0dXJlJzoge1xuICAgICAgICByZXR1cm4gZW5naW5lLmNyZWF0ZUZlYXR1cmUoeyBhY3RvcklkOiBjdHguYWN0b3JJZCB9KTtcbiAgICAgIH1cblxuICAgICAgLy8gLS0gZW50aXRsZW1lbnRzIChQaGFzZSAyLCByb2FkbWFwIFx1MDBBNzMpIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgIC8vIE5vIHJlcXVpcmVBZG1pbiBoZXJlOiBhdXRob3JpdHkgaXMgZGVjaWRlZCBieSB0aGUgRU5HSU5FIGZyb20gdGhlXG4gICAgICAvLyBjYWxsZXIncyBnb3Zlcm5hbmNlIHJvbGUgKGJ5QWN0b3JJZCA9IHRoZSBhdXRoZW50aWNhdGVkIGFjdG9yKS5cbiAgICAgIGNhc2UgJ2Fzc2lnbl9yb2xlJzoge1xuICAgICAgICBjb25zdCBwID0gcGFyc2VkIGFzIFJvbGVJbjtcbiAgICAgICAgZW5naW5lLmFzc2lnblJvbGUoeyBhY3RvcklkOiBwLmFjdG9ySWQsIHJvbGVDb2RlOiBwLnJvbGVDb2RlLCBieUFjdG9ySWQ6IGN0eC5hY3RvcklkIH0pO1xuICAgICAgICByZXR1cm4geyBhc3NpZ25lZDogdHJ1ZSB9O1xuICAgICAgfVxuICAgICAgY2FzZSAncmV2b2tlX3JvbGUnOiB7XG4gICAgICAgIGNvbnN0IHAgPSBwYXJzZWQgYXMgUm9sZUluO1xuICAgICAgICBlbmdpbmUucmV2b2tlUm9sZSh7IGFjdG9ySWQ6IHAuYWN0b3JJZCwgcm9sZUNvZGU6IHAucm9sZUNvZGUsIGJ5QWN0b3JJZDogY3R4LmFjdG9ySWQgfSk7XG4gICAgICAgIHJldHVybiB7IHJldm9rZWQ6IHRydWUgfTtcbiAgICAgIH1cbiAgICAgIGNhc2UgJ2xpc3Rfcm9sZV9hc3NpZ25tZW50cyc6IHtcbiAgICAgICAgY29uc3QgcCA9IHBhcnNlZCBhcyBMaXN0Um9sZUFzc2lnbm1lbnRzSW47XG4gICAgICAgIHJldHVybiBlbmdpbmUubGlzdFJvbGVBc3NpZ25tZW50cyhwLmFjdG9ySWQpO1xuICAgICAgfVxuICAgICAgY2FzZSAnc2V0X2dvdmVybmFuY2Vfcm9sZSc6IHtcbiAgICAgICAgY29uc3QgcCA9IHBhcnNlZCBhcyBTZXRHb3Zlcm5hbmNlUm9sZUluO1xuICAgICAgICBlbmdpbmUuc2V0R292ZXJuYW5jZVJvbGUoeyBhY3RvcklkOiBwLmFjdG9ySWQsIHJvbGU6IHAucm9sZSwgYnlBY3RvcklkOiBjdHguYWN0b3JJZCB9KTtcbiAgICAgICAgcmV0dXJuIHsgYWN0b3JJZDogcC5hY3RvcklkLCByb2xlOiBwLnJvbGUgfTtcbiAgICAgIH1cbiAgICAgIGNhc2UgJ3NldF9wbGFuJzoge1xuICAgICAgICBjb25zdCBwID0gcGFyc2VkIGFzIFNldFBsYW5JbjtcbiAgICAgICAgZW5naW5lLnNldFBsYW4oeyBwbGFuOiBwLnBsYW4sIGJ5QWN0b3JJZDogY3R4LmFjdG9ySWQgfSk7XG4gICAgICAgIHJldHVybiB7IHBsYW46IGVuZ2luZS5nZXRQbGFuKCkgfTtcbiAgICAgIH1cbiAgICAgIGNhc2UgJ3NldF93b3Jrc3BhY2VfcG9saWN5Jzoge1xuICAgICAgICBjb25zdCBwID0gcGFyc2VkIGFzIFNldFdvcmtzcGFjZVBvbGljeUluO1xuICAgICAgICBlbmdpbmUuc2V0V29ya3NwYWNlUG9saWN5KHtcbiAgICAgICAgICBwb2xpY3k6IHtcbiAgICAgICAgICAgIC4uLihwLnBvbGljeS5hZ2VudEdhdGVBcHByb3ZhbHMgIT09IHVuZGVmaW5lZFxuICAgICAgICAgICAgICA/IHsgYWdlbnRHYXRlQXBwcm92YWxzOiBwLnBvbGljeS5hZ2VudEdhdGVBcHByb3ZhbHMgfVxuICAgICAgICAgICAgICA6IHt9KSxcbiAgICAgICAgICAgIC4uLihwLnBvbGljeS5hZ2VudFNlbGZEaXNwYXRjaCAhPT0gdW5kZWZpbmVkXG4gICAgICAgICAgICAgID8geyBhZ2VudFNlbGZEaXNwYXRjaDogcC5wb2xpY3kuYWdlbnRTZWxmRGlzcGF0Y2ggfVxuICAgICAgICAgICAgICA6IHt9KSxcbiAgICAgICAgICB9LFxuICAgICAgICAgIGJ5QWN0b3JJZDogY3R4LmFjdG9ySWQsXG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gZW5naW5lLmdldFdvcmtzcGFjZVBvbGljeSgpO1xuICAgICAgfVxuICAgICAgY2FzZSAnc2V0X2dhdGVfcG9saWN5Jzoge1xuICAgICAgICBjb25zdCBwID0gcGFyc2VkIGFzIFNldEdhdGVQb2xpY3lJbjtcbiAgICAgICAgZW5naW5lLnNldEdhdGVQb2xpY3koe1xuICAgICAgICAgIGdhdGU6IHAuZ2F0ZSxcbiAgICAgICAgICBwb2xpY3k6IHtcbiAgICAgICAgICAgIC4uLihwLnBvbGljeS5taW5BcHByb3ZhbHMgIT09IHVuZGVmaW5lZCA/IHsgbWluQXBwcm92YWxzOiBwLnBvbGljeS5taW5BcHByb3ZhbHMgfSA6IHt9KSxcbiAgICAgICAgICAgIC4uLihwLnBvbGljeS5yZXF1aXJlZEFjdG9yVHlwZXMgIT09IHVuZGVmaW5lZFxuICAgICAgICAgICAgICA/IHsgcmVxdWlyZWRBY3RvclR5cGVzOiBbLi4ucC5wb2xpY3kucmVxdWlyZWRBY3RvclR5cGVzXSB9XG4gICAgICAgICAgICAgIDoge30pLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgYnlBY3RvcklkOiBjdHguYWN0b3JJZCxcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiB7IGdhdGU6IHAuZ2F0ZSwgcG9saWN5OiBlbmdpbmUuZ2V0R2F0ZVBvbGljeShwLmdhdGUpIH07XG4gICAgICB9XG4gICAgICBjYXNlICdhdXRoel9leHBsYWluJzoge1xuICAgICAgICBjb25zdCBwID0gcGFyc2VkIGFzIEF1dGh6RXhwbGFpbkluO1xuICAgICAgICByZXR1cm4gZW5naW5lLmF1dGh6RXhwbGFpbih7IGFjdG9ySWQ6IHAuYWN0b3JJZCwgcGVybWlzc2lvbjogcC5wZXJtaXNzaW9uIGFzIFBlcm1pc3Npb24gfSk7XG4gICAgICB9XG4gICAgICBjYXNlICdpbXBvcnRfc3Rvcmllcyc6IHtcbiAgICAgICAgY29uc3QgcCA9IHBhcnNlZCBhcyBJbXBvcnRTdG9yaWVzSW47XG4gICAgICAgIHJldHVybiBlbmdpbmUuaW1wb3J0U3Rvcmllcyh7IGZlYXR1cmVJZDogcC5mZWF0dXJlSWQsIHlhbWw6IHAueWFtbCwgYWN0b3JJZDogY3R4LmFjdG9ySWQgfSk7XG4gICAgICB9XG5cbiAgICAgIC8vIC0tIGNsYWltcyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICAgY2FzZSAnY2xhaW1fdGFzayc6IHtcbiAgICAgICAgY29uc3QgcCA9IHBhcnNlZCBhcyBDbGFpbVRhc2tJbjtcbiAgICAgICAgcmV0dXJuIGVuZ2luZS5jbGFpbVRhc2soe1xuICAgICAgICAgIHdvcmtJdGVtSWQ6IHAud29ya0l0ZW1JZCxcbiAgICAgICAgICBhY3RvcklkOiBjdHguYWN0b3JJZCxcbiAgICAgICAgICAuLi4ocC50dGxNcyAhPT0gdW5kZWZpbmVkID8geyB0dGxNczogcC50dGxNcyB9IDoge30pLFxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIGNhc2UgJ2hlYXJ0YmVhdCc6IHtcbiAgICAgICAgY29uc3QgcCA9IHBhcnNlZCBhcyBIZWFydGJlYXRJbjtcbiAgICAgICAgZW5naW5lLmhlYXJ0YmVhdCh7IGNsYWltSWQ6IHAuY2xhaW1JZCB9KTtcbiAgICAgICAgcmV0dXJuIHsgcmVuZXdlZDogdHJ1ZSB9O1xuICAgICAgfVxuICAgICAgY2FzZSAncmVsZWFzZV9jbGFpbSc6IHtcbiAgICAgICAgY29uc3QgcCA9IHBhcnNlZCBhcyBSZWxlYXNlQ2xhaW1JbjtcbiAgICAgICAgZW5naW5lLnJlbGVhc2VDbGFpbSh7XG4gICAgICAgICAgY2xhaW1JZDogcC5jbGFpbUlkLFxuICAgICAgICAgIC4uLihwLnJlYXNvbiAhPT0gdW5kZWZpbmVkID8geyByZWFzb246IHAucmVhc29uIH0gOiB7fSksXG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4geyByZWxlYXNlZDogdHJ1ZSB9O1xuICAgICAgfVxuXG4gICAgICAvLyAtLSBsaWZlY3ljbGUgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICAgY2FzZSAnYWR2YW5jZV9zdGF0ZSc6IHtcbiAgICAgICAgY29uc3QgcCA9IHBhcnNlZCBhcyBBZHZhbmNlSW47XG4gICAgICAgIHJldHVybiBlbmdpbmUuYWR2YW5jZVN0YXRlKHtcbiAgICAgICAgICB3b3JrSXRlbUlkOiBwLndvcmtJdGVtSWQsXG4gICAgICAgICAgdG86IHAudG8gYXMgV29ya0l0ZW1TdGF0ZSxcbiAgICAgICAgICBhY3RvcklkOiBjdHguYWN0b3JJZCxcbiAgICAgICAgICAuLi4ocC5mZW5jaW5nVG9rZW4gIT09IHVuZGVmaW5lZCA/IHsgZmVuY2luZ1Rva2VuOiBwLmZlbmNpbmdUb2tlbiB9IDoge30pLFxuICAgICAgICAgIC4uLihwLmlkZW1wb3RlbmN5S2V5ICE9PSB1bmRlZmluZWQgPyB7IGlkZW1wb3RlbmN5S2V5OiBwLmlkZW1wb3RlbmN5S2V5IH0gOiB7fSksXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgY2FzZSAnYmxvY2tfdGFzayc6IHtcbiAgICAgICAgY29uc3QgcCA9IHBhcnNlZCBhcyBCbG9ja0luO1xuICAgICAgICByZXR1cm4gZW5naW5lLmJsb2NrVGFzayh7XG4gICAgICAgICAgd29ya0l0ZW1JZDogcC53b3JrSXRlbUlkLFxuICAgICAgICAgIHJlYXNvbjogcC5yZWFzb24sXG4gICAgICAgICAgYWN0b3JJZDogY3R4LmFjdG9ySWQsXG4gICAgICAgICAgLi4uKHAuZmVuY2luZ1Rva2VuICE9PSB1bmRlZmluZWQgPyB7IGZlbmNpbmdUb2tlbjogcC5mZW5jaW5nVG9rZW4gfSA6IHt9KSxcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICBjYXNlICd1bmJsb2NrX3Rhc2snOiB7XG4gICAgICAgIGNvbnN0IHAgPSBwYXJzZWQgYXMgV29ya0l0ZW1JbjtcbiAgICAgICAgcmV0dXJuIGVuZ2luZS51bmJsb2NrVGFzayh7IHdvcmtJdGVtSWQ6IHAud29ya0l0ZW1JZCwgYWN0b3JJZDogY3R4LmFjdG9ySWQgfSk7XG4gICAgICB9XG4gICAgICBjYXNlICdzdWJtaXRfZXZpZGVuY2UnOiB7XG4gICAgICAgIGNvbnN0IHAgPSBwYXJzZWQgYXMgU3VibWl0RXZpZGVuY2VJbjtcbiAgICAgICAgZW5naW5lLnN1Ym1pdEV2aWRlbmNlKHtcbiAgICAgICAgICB3b3JrSXRlbUlkOiBwLndvcmtJdGVtSWQsXG4gICAgICAgICAgZXZpZGVuY2U6IHAuZXZpZGVuY2UgYXMgRXZpZGVuY2UsXG4gICAgICAgICAgYWN0b3JJZDogY3R4LmFjdG9ySWQsXG4gICAgICAgICAgLi4uKHAuZmVuY2luZ1Rva2VuICE9PSB1bmRlZmluZWQgPyB7IGZlbmNpbmdUb2tlbjogcC5mZW5jaW5nVG9rZW4gfSA6IHt9KSxcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiB7IHN1Ym1pdHRlZDogdHJ1ZSB9O1xuICAgICAgfVxuICAgICAgY2FzZSAnYXBwcm92ZV9nYXRlJzoge1xuICAgICAgICBjb25zdCBwID0gcGFyc2VkIGFzIEFwcHJvdmVHYXRlSW47XG4gICAgICAgIHJldHVybiBlbmdpbmUuYXBwcm92ZUdhdGUoe1xuICAgICAgICAgIHdvcmtJdGVtSWQ6IHAud29ya0l0ZW1JZCxcbiAgICAgICAgICBnYXRlOiBwLmdhdGUsXG4gICAgICAgICAgYWN0b3JJZDogY3R4LmFjdG9ySWQsXG4gICAgICAgICAgLi4uKHAucGlubmVkVmVyaWZpY2F0aW9uICE9PSB1bmRlZmluZWRcbiAgICAgICAgICAgID8geyBwaW5uZWRWZXJpZmljYXRpb246IHAucGlubmVkVmVyaWZpY2F0aW9uIH1cbiAgICAgICAgICAgIDoge30pLFxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIGNhc2UgJ3JlamVjdF9nYXRlJzoge1xuICAgICAgICBjb25zdCBwID0gcGFyc2VkIGFzIFJlamVjdEdhdGVJbjtcbiAgICAgICAgcmV0dXJuIGVuZ2luZS5yZWplY3RHYXRlKHsgd29ya0l0ZW1JZDogcC53b3JrSXRlbUlkLCBnYXRlOiBwLmdhdGUsIGFjdG9ySWQ6IGN0eC5hY3RvcklkIH0pO1xuICAgICAgfVxuICAgICAgY2FzZSAncmVsZWFzZV9kaXNwYXRjaF9ob2xkJzoge1xuICAgICAgICBjb25zdCBwID0gcGFyc2VkIGFzIEZlYXR1cmVJbjtcbiAgICAgICAgcmV0dXJuIGVuZ2luZS5yZWxlYXNlRGlzcGF0Y2hIb2xkKHsgZmVhdHVyZUlkOiBwLmZlYXR1cmVJZCwgYWN0b3JJZDogY3R4LmFjdG9ySWQgfSk7XG4gICAgICB9XG5cbiAgICAgIC8vIC0tIG9wcyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgIGNhc2UgJ2ZvcmNlX3JlbGVhc2VfY2xhaW0nOiB7XG4gICAgICAgIGNvbnN0IHAgPSBwYXJzZWQgYXMgV29ya0l0ZW1JbjtcbiAgICAgICAgY29uc3QgdW5yZWxlYXNlZCA9IGVuZ2luZS5nZXRDbGFpbXMocC53b3JrSXRlbUlkKS5maWx0ZXIoKGNsYWltKSA9PiAhY2xhaW0ucmVsZWFzZWQpO1xuICAgICAgICBpZiAodW5yZWxlYXNlZC5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcihgbm8gbGl2ZSBjbGFpbSBvbiB3b3JrIGl0ZW0gJHtwLndvcmtJdGVtSWR9YCk7XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChjb25zdCBjbGFpbSBvZiB1bnJlbGVhc2VkKSB7XG4gICAgICAgICAgZW5naW5lLnJlbGVhc2VDbGFpbSh7IGNsYWltSWQ6IGNsYWltLmlkLCByZWFzb246ICdvcHMgZm9yY2UgcmVsZWFzZScgfSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHsgcmVsZWFzZWQ6IHVucmVsZWFzZWQubWFwKChjbGFpbSkgPT4gY2xhaW0uaWQpIH07XG4gICAgICB9XG5cbiAgICAgIC8vIC0tIHF1ZXJpZXMgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICAgY2FzZSAnZ2V0X3dvcmtfaXRlbSc6IHtcbiAgICAgICAgY29uc3QgcCA9IHBhcnNlZCBhcyBXb3JrSXRlbUluO1xuICAgICAgICByZXR1cm4gZW5naW5lLmdldFdvcmtJdGVtKHAud29ya0l0ZW1JZCk7XG4gICAgICB9XG4gICAgICBjYXNlICdnZXRfZmVhdHVyZSc6IHtcbiAgICAgICAgY29uc3QgcCA9IHBhcnNlZCBhcyBGZWF0dXJlSW47XG4gICAgICAgIHJldHVybiBlbmdpbmUuZ2V0RmVhdHVyZShwLmZlYXR1cmVJZCk7XG4gICAgICB9XG4gICAgICBjYXNlICdnZXRfdGFza19jb250ZXh0Jzoge1xuICAgICAgICBjb25zdCBwID0gcGFyc2VkIGFzIFdvcmtJdGVtSW47XG4gICAgICAgIHJldHVybiBlbmdpbmUuZ2V0VGFza0NvbnRleHQoeyB3b3JrSXRlbUlkOiBwLndvcmtJdGVtSWQgfSk7XG4gICAgICB9XG4gICAgICBjYXNlICdsaXN0X3dvcmtfaXRlbXMnOiB7XG4gICAgICAgIGNvbnN0IHAgPSBwYXJzZWQgYXMgTGlzdFdvcmtJdGVtc0luO1xuICAgICAgICByZXR1cm4gZW5naW5lLmxpc3RXb3JrSXRlbXMoe1xuICAgICAgICAgIC4uLihwLnN0YXRlICE9PSB1bmRlZmluZWQgPyB7IHN0YXRlOiBwLnN0YXRlIGFzIFdvcmtJdGVtU3RhdGUgfSA6IHt9KSxcbiAgICAgICAgICAuLi4ocC5mZWF0dXJlSWQgIT09IHVuZGVmaW5lZCA/IHsgZmVhdHVyZUlkOiBwLmZlYXR1cmVJZCB9IDoge30pLFxuICAgICAgICAgIC4uLihwLmNsYWltYWJsZSAhPT0gdW5kZWZpbmVkID8geyBjbGFpbWFibGU6IHAuY2xhaW1hYmxlIH0gOiB7fSksXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgY2FzZSAnaW5ib3gnOiB7XG4gICAgICAgIGNvbnN0IGF3YWl0aW5nU3BlYyA9IGVuZ2luZVxuICAgICAgICAgIC5saXN0V29ya0l0ZW1zKHsgc3RhdGU6ICdkcmFmdCcgfSlcbiAgICAgICAgICAuZmlsdGVyKChpdGVtKSA9PiBpdGVtLnNwZWNDaGVja3BvaW50KTtcbiAgICAgICAgY29uc3QgYXdhaXRpbmdSZXZpZXcgPSBlbmdpbmUubGlzdFdvcmtJdGVtcyh7IHN0YXRlOiAnaW5fcmV2aWV3JyB9KTtcbiAgICAgICAgcmV0dXJuIHsgYXdhaXRpbmdTcGVjLCBhd2FpdGluZ1JldmlldyB9O1xuICAgICAgfVxuICAgICAgY2FzZSAncXVlcnlfZXZlbnRzJzoge1xuICAgICAgICBjb25zdCBwID0gcGFyc2VkIGFzIFF1ZXJ5RXZlbnRzSW47XG4gICAgICAgIHJldHVybiBlbmdpbmUuZXZlbnRzKHAuc3RyZWFtSWQpO1xuICAgICAgfVxuICAgICAgY2FzZSAnZ2V0X2NsYWltcyc6IHtcbiAgICAgICAgY29uc3QgcCA9IHBhcnNlZCBhcyBXb3JrSXRlbUluO1xuICAgICAgICByZXR1cm4gZW5naW5lLmdldENsYWltcyhwLndvcmtJdGVtSWQpO1xuICAgICAgfVxuICAgICAgY2FzZSAnd2hvYW1pJzoge1xuICAgICAgICByZXR1cm4geyBhY3RvcklkOiBjdHguYWN0b3JJZCwgaXNBZG1pbjogY3R4LmlzQWRtaW4gfTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBVbnJlYWNoYWJsZSB3aGlsZSB0aGUgc3dpdGNoIGNvdmVycyB0aGUgcmVnaXN0cnk7IGtlZXBzIHRoZSBjb21waWxlciBob25lc3QuXG4gICAgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoYGNvbW1hbmQgbm90IHdpcmVkIHRvIHRoZSBidXM6ICR7Y29tbWFuZH1gKTtcbiAgfVxuXG4gIHJldHVybiB7IGV4ZWN1dGUsIGVuZ2luZSB9O1xufVxuIiwgIi8qKlxuICogTUNQIGFkYXB0ZXIgXHUyMDE0IGV2ZXJ5IHJlZ2lzdHJ5IGVudHJ5IGluIENPTU1BTkRTIGJlY29tZXMgb25lIHRvb2w7IGV2ZXJ5XG4gKiB0b29sIGhhbmRsZXIgY2FsbHMgdGhlIFNBTUUgYnVzLmV4ZWN1dGUgdGhlIEhUVFAgcm91dGUgY2FsbHMuIE5vIGxvZ2ljXG4gKiBsaXZlcyBoZXJlIChyb2FkbWFwIFx1MDBBNzIuMjogc3RydWN0dXJhbGx5IGlkZW50aWNhbCBzZW1hbnRpY3MsIEQ1KS5cbiAqXG4gKiBERUNJU0lPTiAocmVjb3JkZWQpOiB3ZSB1c2UgdGhlIGxvdy1sZXZlbCBgU2VydmVyYCArXG4gKiBzZXRSZXF1ZXN0SGFuZGxlcihMaXN0VG9vbHMvQ2FsbFRvb2wpIGluc3RlYWQgb2YgYE1jcFNlcnZlci5yZWdpc3RlclRvb2xgLlxuICogU0RLIDEuMjkncyBNY3BTZXJ2ZXIgYWNjZXB0cyB6b2Qgc2NoZW1hcyBhbmQgcmUtZW1pdHMgSlNPTiBTY2hlbWEgdGhyb3VnaFxuICogaXRzIG93biBjb21wYXQgbGF5ZXIgKHpvZCB2NCBicmFuY2ggdGFyZ2V0cyBkcmFmdC03KTsgY29udHJhY3RzJ1xuICogaW5wdXRKc29uU2NoZW1hKCkgaXMgem9kIHY0J3MgbmF0aXZlIGRyYWZ0LTIwMjAtMTIgZW1pc3Npb24uIEZlZWRpbmcgdGhlXG4gKiBjb250cmFjdHMgSlNPTiBTY2hlbWEgdmVyYmF0aW0gdGhyb3VnaCB0aGUgbG93LWxldmVsIEFQSSBrZWVwc1xuICogXCJ0b29sIGlucHV0U2NoZW1hID09PSBpbnB1dEpzb25TY2hlbWEoY29tbWFuZClcIiBieXRlLWlkZW50aWNhbCBcdTIwMTQgcGFyaXR5IGlzXG4gKiBhc3NlcnRlZCBieSBkZWVwLWVxdWFsaXR5IGluIHRlc3QvcGFyaXR5LnRlc3QudHMuXG4gKi9cbmltcG9ydCB7IFNlcnZlciB9IGZyb20gJ0Btb2RlbGNvbnRleHRwcm90b2NvbC9zZGsvc2VydmVyL2luZGV4LmpzJztcbmltcG9ydCB7IFN0cmVhbWFibGVIVFRQU2VydmVyVHJhbnNwb3J0IH0gZnJvbSAnQG1vZGVsY29udGV4dHByb3RvY29sL3Nkay9zZXJ2ZXIvc3RyZWFtYWJsZUh0dHAuanMnO1xuaW1wb3J0IHtcbiAgQ2FsbFRvb2xSZXF1ZXN0U2NoZW1hLFxuICBMaXN0VG9vbHNSZXF1ZXN0U2NoZW1hLFxuICB0eXBlIENhbGxUb29sUmVzdWx0LFxufSBmcm9tICdAbW9kZWxjb250ZXh0cHJvdG9jb2wvc2RrL3R5cGVzLmpzJztcbmltcG9ydCB0eXBlIHsgRmFzdGlmeUluc3RhbmNlLCBGYXN0aWZ5UmVxdWVzdCB9IGZyb20gJ2Zhc3RpZnknO1xuaW1wb3J0IHtcbiAgQ09NTUFORFMsXG4gIGlucHV0SnNvblNjaGVtYSxcbiAgbWNwVG9vbE5hbWUsXG4gIHR5cGUgQWN0b3JDb250ZXh0LFxuICB0eXBlIENvbW1hbmRCdXMsXG59IGZyb20gJ0BvYWhzL2NvbnRyYWN0cyc7XG5cbmltcG9ydCB7IGVycm9yTmFtZSB9IGZyb20gJy4vc2VydmVyLmpzJztcblxuY29uc3QgVE9PTF9UT19DT01NQU5EOiBSZWFkb25seU1hcDxzdHJpbmcsIHN0cmluZz4gPSBuZXcgTWFwKFxuICBDT01NQU5EUy5tYXAoKGNvbW1hbmQpID0+IFttY3BUb29sTmFtZShjb21tYW5kLm5hbWUpLCBjb21tYW5kLm5hbWVdKSxcbik7XG5cbi8qKlxuICogQnVpbGQgb25lIE1DUCBzZXJ2ZXIgYm91bmQgdG8gYW4gYXV0aGVudGljYXRlZCBhY3RvciBjb250ZXh0LiBTdGF0ZWxlc3NcbiAqIEhUVFAgbW91bnRzIGNvbnN0cnVjdCBvbmUgcGVyIHJlcXVlc3Q7IHRlc3RzIHdpcmUgb25lIHRvIGFuXG4gKiBJbk1lbW9yeVRyYW5zcG9ydCBkaXJlY3RseS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkTWNwU2VydmVyKGJ1czogQ29tbWFuZEJ1cywgY3R4OiBBY3RvckNvbnRleHQpOiBTZXJ2ZXIge1xuICBjb25zdCBzZXJ2ZXIgPSBuZXcgU2VydmVyKFxuICAgIHsgbmFtZTogJ29haHMtc3BpbmUnLCB2ZXJzaW9uOiAnMC4wLjEnIH0sXG4gICAgeyBjYXBhYmlsaXRpZXM6IHsgdG9vbHM6IHt9IH0gfSxcbiAgKTtcblxuICBzZXJ2ZXIuc2V0UmVxdWVzdEhhbmRsZXIoTGlzdFRvb2xzUmVxdWVzdFNjaGVtYSwgYXN5bmMgKCkgPT4gKHtcbiAgICB0b29sczogQ09NTUFORFMubWFwKChjb21tYW5kKSA9PiAoe1xuICAgICAgbmFtZTogbWNwVG9vbE5hbWUoY29tbWFuZC5uYW1lKSxcbiAgICAgIGRlc2NyaXB0aW9uOiBjb21tYW5kLmRlc2NyaXB0aW9uLFxuICAgICAgLy8gVmVyYmF0aW0gZnJvbSBjb250cmFjdHMgXHUyMDE0IHRoZSBwYXJpdHkgdGVzdCBkZWVwLWVxdWFscyB0aGlzLlxuICAgICAgaW5wdXRTY2hlbWE6IGlucHV0SnNvblNjaGVtYShjb21tYW5kLm5hbWUpIGFzIHsgdHlwZTogJ29iamVjdCc7IFtrOiBzdHJpbmddOiB1bmtub3duIH0sXG4gICAgfSkpLFxuICB9KSk7XG5cbiAgc2VydmVyLnNldFJlcXVlc3RIYW5kbGVyKENhbGxUb29sUmVxdWVzdFNjaGVtYSwgYXN5bmMgKHJlcXVlc3QpOiBQcm9taXNlPENhbGxUb29sUmVzdWx0PiA9PiB7XG4gICAgY29uc3QgY29tbWFuZE5hbWUgPSBUT09MX1RPX0NPTU1BTkQuZ2V0KHJlcXVlc3QucGFyYW1zLm5hbWUpO1xuICAgIGlmIChjb21tYW5kTmFtZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBjb250ZW50OiBbeyB0eXBlOiAndGV4dCcsIHRleHQ6IGB1bmtub3duIHRvb2w6ICR7cmVxdWVzdC5wYXJhbXMubmFtZX1gIH1dLFxuICAgICAgICBpc0Vycm9yOiB0cnVlLFxuICAgICAgfTtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgIC8vIFRoZSBleGFjdCBzYW1lIGNhbGwgdGhlIEhUVFAgcm91dGUgbWFrZXMgXHUyMDE0IG5vIE1DUC1vbmx5IGxvZ2ljLlxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgYnVzLmV4ZWN1dGUoY29tbWFuZE5hbWUsIHJlcXVlc3QucGFyYW1zLmFyZ3VtZW50cyA/PyB7fSwgY3R4KTtcbiAgICAgIHJldHVybiB7IGNvbnRlbnQ6IFt7IHR5cGU6ICd0ZXh0JywgdGV4dDogSlNPTi5zdHJpbmdpZnkocmVzdWx0ID8/IG51bGwpIH1dIH07XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICB0eXBlOiAndGV4dCcsXG4gICAgICAgICAgICB0ZXh0OiBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgICAgIGVycm9yOiB7XG4gICAgICAgICAgICAgICAgbmFtZTogZXJyb3JOYW1lKGVycm9yKSxcbiAgICAgICAgICAgICAgICBtZXNzYWdlOiBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvciksXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9KSxcbiAgICAgICAgICB9LFxuICAgICAgICBdLFxuICAgICAgICBpc0Vycm9yOiB0cnVlLFxuICAgICAgfTtcbiAgICB9XG4gIH0pO1xuXG4gIHJldHVybiBzZXJ2ZXI7XG59XG5cbi8qKlxuICogTW91bnQgUE9TVCAvbWNwIG9uIHRoZSBGYXN0aWZ5IGFwcCBcdTIwMTQgc3RhdGVsZXNzIFN0cmVhbWFibGVIVFRQIHBhdHRlcm5cbiAqIChzZXNzaW9uSWRHZW5lcmF0b3I6IHVuZGVmaW5lZCk6IGEgZnJlc2ggc2VydmVyK3RyYW5zcG9ydCBwYWlyIHBlciByZXF1ZXN0LFxuICogZnVsbHkgaXNvbGF0ZWQsIG5vIHNlc3Npb24gc3RhdGUgdG8gbGVhayBiZXR3ZWVuIGFjdG9ycy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlZ2lzdGVyTWNwUm91dGUoXG4gIGFwcDogRmFzdGlmeUluc3RhbmNlLFxuICBidXM6IENvbW1hbmRCdXMsXG4gIGF1dGhlbnRpY2F0ZTogKHJlcXVlc3Q6IEZhc3RpZnlSZXF1ZXN0KSA9PiBBY3RvckNvbnRleHQgfCBudWxsLFxuKTogdm9pZCB7XG4gIGFwcC5wb3N0KCcvbWNwJywgYXN5bmMgKHJlcXVlc3QsIHJlcGx5KSA9PiB7XG4gICAgY29uc3QgY3R4ID0gYXV0aGVudGljYXRlKHJlcXVlc3QpO1xuICAgIGlmIChjdHggPT09IG51bGwpIHtcbiAgICAgIHJldHVybiByZXBseVxuICAgICAgICAuY29kZSg0MDEpXG4gICAgICAgIC5zZW5kKHsganNvbnJwYzogJzIuMCcsIGVycm9yOiB7IGNvZGU6IC0zMjAwMSwgbWVzc2FnZTogJ3VuYXV0aG9yaXplZCcgfSwgaWQ6IG51bGwgfSk7XG4gICAgfVxuXG4gICAgY29uc3Qgc2VydmVyID0gYnVpbGRNY3BTZXJ2ZXIoYnVzLCBjdHgpO1xuICAgIC8vIFN0YXRlbGVzcyBtb2RlOiBzZXNzaW9uSWRHZW5lcmF0b3Igb21pdHRlZCAoXHUyMjYxIHVuZGVmaW5lZCBcdTIwMTQgdGhlIFNESydzXG4gICAgLy8gZG9jdW1lbnRlZCBzdGF0ZWxlc3MgcGF0dGVybjsgdGhlIGtleSBpcyBsZWZ0IG91dCBvbmx5IGJlY2F1c2UgdGhlIFNES1xuICAgIC8vIG9wdGlvbnMgdHlwZSBpcyBub3QgZXhhY3RPcHRpb25hbFByb3BlcnR5VHlwZXMtY2xlYW4pLlxuICAgIGNvbnN0IHRyYW5zcG9ydCA9IG5ldyBTdHJlYW1hYmxlSFRUUFNlcnZlclRyYW5zcG9ydCh7IGVuYWJsZUpzb25SZXNwb25zZTogdHJ1ZSB9KTtcblxuICAgIHJlcGx5LmhpamFjaygpO1xuICAgIHRyeSB7XG4gICAgICAvLyBDYXN0OiB0aGUgU0RLJ3MgVHJhbnNwb3J0IGludGVyZmFjZSBpcyBub3QgZXhhY3RPcHRpb25hbFByb3BlcnR5VHlwZXMtY2xlYW4uXG4gICAgICBhd2FpdCBzZXJ2ZXIuY29ubmVjdCh0cmFuc3BvcnQgYXMgdW5rbm93biBhcyBQYXJhbWV0ZXJzPHR5cGVvZiBzZXJ2ZXIuY29ubmVjdD5bMF0pO1xuICAgICAgLy8gSlNPTi1yZXNwb25zZSBtb2RlOiByZXNvbHZlcyBvbmNlIHRoZSByZXNwb25zZSBoYXMgYmVlbiB3cml0dGVuLlxuICAgICAgLy8gKERvIE5PVCBjbG9zZSBvbiByZXF1ZXN0LnJhdyAnY2xvc2UnIFx1MjAxNCBOb2RlIGVtaXRzIGl0IGFzIHNvb24gYXMgdGhlXG4gICAgICAvLyBwYXJzZWQgcmVxdWVzdCBzdHJlYW0gZW5kcywgd2hpY2ggd291bGQga2lsbCB0aGUgcGVuZGluZyByZXNwb25zZS4pXG4gICAgICBhd2FpdCB0cmFuc3BvcnQuaGFuZGxlUmVxdWVzdChyZXF1ZXN0LnJhdywgcmVwbHkucmF3LCByZXF1ZXN0LmJvZHkpO1xuICAgIH0gZmluYWxseSB7XG4gICAgICB2b2lkIHRyYW5zcG9ydC5jbG9zZSgpO1xuICAgICAgdm9pZCBzZXJ2ZXIuY2xvc2UoKTtcbiAgICB9XG4gICAgcmV0dXJuIHJlcGx5O1xuICB9KTtcbn1cbiJdLAogICJtYXBwaW5ncyI6ICI7Ozs7Ozs7Ozs7Ozs7QUFBQSxJQTBCYSx1QkFXQSxrQkFRQSxlQVFBLHdCQVdBLHdCQWFBLGtCQVdBLGlCQWtEQSxlQU9BLGNBR0EsZ0NBU0EsZ0JBbUVBO0FBaE9iO0FBQUE7QUFBQTtBQTBCTyxJQUFNLHdCQUFOLGNBQW9DLE1BQU07QUFBQSxNQUMvQyxZQUNrQixZQUNBLFNBQ2hCO0FBQ0EsY0FBTSxzQkFBc0IsVUFBVSxjQUFjLE9BQU8sRUFBRTtBQUg3QztBQUNBO0FBR2hCLGFBQUssT0FBTztBQUFBLE1BQ2Q7QUFBQSxJQUNGO0FBR08sSUFBTSxtQkFBTixjQUErQixNQUFNO0FBQUEsTUFDMUMsWUFBNEIsT0FBZTtBQUN6QyxjQUFNLGlCQUFpQixLQUFLLEVBQUU7QUFESjtBQUUxQixhQUFLLE9BQU87QUFBQSxNQUNkO0FBQUEsSUFDRjtBQUdPLElBQU0sZ0JBQU4sY0FBNEIsTUFBTTtBQUFBLE1BQ3ZD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QUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7OztBQ0oxQjtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLElBQUFDLFlBQUE7QUFBQTtBQUFBO0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFBQTtBQUFBOzs7QUNIQSxJQUFBQyxlQUFBO0FBQUEsU0FBQUEsY0FBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUE2QkEsU0FBUyxpQkFBaUI7QUFDMUI7QUFBQSxFQUNFLGNBQUFDO0FBQUEsRUFDQSxhQUFBQztBQUFBLEVBQ0E7QUFBQSxFQUNBLGdCQUFBQztBQUFBLEVBQ0E7QUFBQSxFQUNBO0FBQUEsRUFDQSxpQkFBQUM7QUFBQSxPQUNLO0FBQ1AsU0FBUyxRQUFBQyxPQUFNLFdBQUFDLGdCQUFlO0FBQzlCLFNBQVMsU0FBUyxpQkFBaUI7QUFxRTVCLFNBQVMsSUFBSSxN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K0JBQStCLEVBQ3JEO0FBQUEsSUFDQyxPQUNFLFNBT0c7QUFDSCxVQUFJO0FBQ0YsY0FBTSxTQUFTLFdBQVcsSUFBSTtBQUc5QixjQUFNLFNBQVMsTUFBTTtBQUNyQixjQUFNLE9BQU8sU0FBUztBQUFBLFVBQ3BCO0FBQUEsVUFDQSxVQUFVRCxTQUFRLEtBQUssSUFBSTtBQUFBLFVBQzNCLFlBQVksS0FBSztBQUFBLFVBQ2pCLFVBQVUsS0FBSztBQUFBLFVBQ2YsR0FBSSxLQUFLLFNBQVMsU0FBWSxFQUFFLFFBQVEsT0FBTyxLQUFLLElBQUksRUFBRSxJQUFJLENBQUM7QUFBQSxVQUMvRCxHQUFJLEtBQUssU0FBUyxPQUFPLEVBQUUsTUFBTSxLQUFLLElBQUksQ0FBQztBQUFBLFFBQzdDLENBQUM7QUFBQSxNQUNILFNBQVMsT0FBTztBQUNkLGNBQU0sTUFBTSxpQkFBaUIsUUFBUSxRQUFRLElBQUksTUFBTSxPQUFPLEtBQUssQ0FBQztBQUNwRSxnQkFBUSxPQUFPLE1BQU0sMkJBQXNCLElBQUksSUFBSSxLQUFLLElBQUksT0FBTztBQUFBLENBQUk7QUFDdkUsZ0JBQVEsV0FBVztBQUFBLE1BQ3JCO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFFRixTQUFPO0FBQ1Q7QUFFQSxlQUFzQixLQUFLLE9BQWlCLFFBQVEsTUFBcUI7QUFDdkUsUUFBTSxhQUFhLEVBQUUsV0FBVyxJQUFJO0FBQ3RDO0FBR0EsS0FBSyxLQUFLOyIsCiAgIm5hbWVzIjogWyJ3b3JrSXRlbUlkIiwgImZlbmNpbmdUb2tlbiIsICJzcWwiLCAiUkFOSyIsICJUUkFOU0lUSU9OUyIsICJMRUdBQ1lfU1RBVFVTIiwgIndvcmtJdGVtSWQiLCAiZmVuY2luZ1Rva2VuIiwgInF1b3J1bU1ldCIsICJkaXJuYW1lIiwgImluaXRfc3JjIiwgInNyY19leHBvcnRzIiwgImV4aXN0c1N5bmMiLCAibWtkaXJTeW5jIiwgInJlYWRGaWxlU3luYyIsICJ3cml0ZUZpbGVTeW5jIiwgImpvaW4iLCAicmVzb2x2ZSIsICJ3b3JrSXRlbUlkIiwgImV2aWRlbmNlIiwgImJhc2VsaW5lIiwgIm91dGNvbWUiLCAiaW5pdF9zcmMiLCAicmVzb2x2ZSIsICJlcnJvck5hbWUiLCAiZmVhdHVyZXMiLCAiZXZlbnRzIiwgInJhbmRvbUJ5dGVzIiwgIm1rZGlyU3luYyIsICJqb2luIiwgInJlYWRGaWxlU3luYyIsICJkZWYiLCAicmFuZG9tQnl0ZXMiLCAibWtkaXJTeW5jIiwgImNyZWF0ZVBnU3luY0VuZ2luZSIsICJqb2luIiwgInRleHQiLCAicmVzb2x2ZSIsICJ3b3JrSXRlbUlkIl0KfQo=
