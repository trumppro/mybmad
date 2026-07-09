#!/usr/bin/env node
import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// ../../packages/core/src/types.ts
var PermissionDeniedError, GuardFailedError, ConflictError, InvalidTransitionError, StoriesValidationError, WORK_ITEM_STATES, BLOCKED_REASONS, PLAN_CEILINGS, DEFAULT_PLAN, AGENT_GATE_APPROVE_PERMISSIONS, DELIVERY_ROLES, REVIEW_LOOP_LIMIT, WORK_ITEM_KINDS, PERSONAS, AGENT_JOB_MAX_DEPTH;
var init_types = __esm({
  "../../packages/core/src/types.ts"() {
    "use strict";
    PermissionDeniedError = class extends Error {
      constructor(permission, actorId) {
        super(`permission denied: ${permission} for actor ${actorId}`);
        this.permission = permission;
        this.actorId = actorId;
        this.name = "PermissionDeniedError";
      }
    };
    GuardFailedError = class extends Error {
      constructor(guard) {
        super(`guard failed: ${guard}`);
        this.guard = guard;
        this.name = "GuardFailedError";
      }
    };
    ConflictError = class extends Error {
      constructor(reason) {
        super(`conflict: ${reason}`);
        this.reason = reason;
        this.name = "ConflictError";
      }
    };
    InvalidTransitionError = class extends Error {
      constructor(from, to) {
        super(`invalid transition: ${from} -> ${to}`);
        this.from = from;
        this.to = to;
        this.name = "InvalidTransitionError";
      }
    };
    StoriesValidationError = class extends Error {
      constructor(rule) {
        super(`stories.yaml invalid: ${rule}`);
        this.rule = rule;
        this.name = "StoriesValidationError";
      }
    };
    WORK_ITEM_STATES = [
      "backlog",
      "draft",
      "ready_for_dev",
      "in_progress",
      "in_review",
      "done"
    ];
    BLOCKED_REASONS = [
      "unclear_intent",
      "no_stories_yaml_found",
      "ambiguous_story_file_match",
      "review_non_convergence",
      "no_subagents",
      "dirty_tree",
      "stale_worktree",
      "awaiting_human_input",
      "other"
    ];
    PLAN_CEILINGS = {
      free: { agentGateApprove: false, agentGateReject: false },
      team: { agentGateApprove: false, agentGateReject: true },
      enterprise: { agentGateApprove: true, agentGateReject: true }
    };
    DEFAULT_PLAN = "enterprise";
    AGENT_GATE_APPROVE_PERMISSIONS = [
      "gate.spec.approve",
      "gate.review.approve"
    ];
    DELIVERY_ROLES = {
      product_owner: ["task.plan", "feature.init", "feature.advance", "gate.spec.approve", "dispatch.release_hold"],
      tech_lead: ["task.plan", "gate.review.approve", "gate.review.reject", "state.downgrade", "ops.force_release_claim"],
      reviewer: ["gate.review.approve", "gate.review.reject"],
      developer: ["task.claim", "task.advance", "task.block"],
      qa: ["task.block"],
      contributor: []
    };
    REVIEW_LOOP_LIMIT = 5;
    WORK_ITEM_KINDS = ["code", "spec_draft", "design_review", "qa_report", "doc"];
    PERSONAS = [
      { personaCode: "bmad-agent-analyst", displayName: "Mary (Analyst)", defaultRole: "contributor" },
      { personaCode: "bmad-agent-tech-writer", displayName: "Paige (Tech Writer)", defaultRole: "contributor" },
      { personaCode: "bmad-agent-pm", displayName: "John (PM)", defaultRole: "contributor" },
      { personaCode: "bmad-agent-ux-designer", displayName: "Sally (UX)", defaultRole: "contributor" },
      { personaCode: "bmad-agent-architect", displayName: "Winston (Architect)", defaultRole: "contributor" },
      { personaCode: "bmad-agent-dev", displayName: "Amelia (Dev)", defaultRole: "developer" }
    ];
    AGENT_JOB_MAX_DEPTH = 2;
  }
});

// ../../packages/core/src/stories.ts
import { parse } from "yaml";
function parseStories(yamlText) {
  let raw;
  try {
    raw = parse(yamlText);
  } catch (error) {
    throw new StoriesValidationError(`YAML parse failure: ${String(error)}`);
  }
  if (!Array.isArray(raw)) {
    throw new StoriesValidationError("top level must be a YAML list of stories");
  }
  const entries = [];
  for (const item of raw) {
    if (typeof item !== "object" || item === null || Array.isArray(item)) {
      throw new StoriesValidationError("every entry must be a mapping");
    }
    const entry = item;
    if ("status" in entry) {
      throw new StoriesValidationError("no status field, ever");
    }
    if (typeof entry["id"] !== "string") {
      throw new StoriesValidationError("id must be a quoted YAML string");
    }
    const id = entry["id"];
    if (!ID_PATTERN.test(id)) {
      throw new StoriesValidationError(`id "${id}" may contain only letters, digits, and dashes`);
    }
    if (typeof entry["title"] !== "string" || entry["title"].length === 0) {
      throw new StoriesValidationError(`entry "${id}" is missing required field: title`);
    }
    if (typeof entry["description"] !== "string" || entry["description"].length === 0) {
      throw new StoriesValidationError(`entry "${id}" is missing required field: description`);
    }
    entries.push({
      id,
      title: entry["title"],
      description: entry["description"],
      specCheckpoint: entry["spec_checkpoint"] === true,
      doneCheckpoint: entry["done_checkpoint"] === true,
      invokeDevWith: typeof entry["invoke_dev_with"] === "string" ? entry["invoke_dev_with"] : ""
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
  "../../packages/core/src/stories.ts"() {
    "use strict";
    init_types();
    ID_PATTERN = /^[A-Za-z0-9-]+$/;
  }
});

// ../../packages/core/src/engine.ts
function createEngine() {
  return new EngineImpl();
}
var RANK, TRANSITIONS, LEGACY_STATUS, EngineImpl;
var init_engine = __esm({
  "../../packages/core/src/engine.ts"() {
    "use strict";
    init_types();
    init_stories();
    RANK = Object.fromEntries(
      WORK_ITEM_STATES.map((s, i) => [s, i])
    );
    TRANSITIONS = [
      { from: "backlog", to: "draft", permission: "task.plan", claimRequired: false, guards: [] },
      {
        from: "draft",
        to: "ready_for_dev",
        permission: "task.plan",
        claimRequired: false,
        guards: ["spec_gate_if_checkpoint"]
      },
      {
        from: "ready_for_dev",
        to: "in_progress",
        permission: "task.advance",
        claimRequired: true,
        guards: ["deps_done"]
      },
      {
        from: "in_progress",
        to: "in_review",
        permission: "task.advance",
        claimRequired: true,
        guards: ["nonempty_diff"]
      }
    ];
    LEGACY_STATUS = {
      backlog: "backlog",
      draft: "draft",
      "ready-for-dev": "ready_for_dev",
      ready_for_dev: "ready_for_dev",
      "in-progress": "in_progress",
      in_progress: "in_progress",
      "in-review": "in_review",
      in_review: "in_review",
      review: "in_review",
      done: "done"
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
      // -- collaboration state (Phase 3, roadmap §5) --------------------------------
      threads = /* @__PURE__ */ new Map();
      messages = [];
      mentions = [];
      notifications = [];
      agentJobs = /* @__PURE__ */ new Map();
      // -- agent memory state (Phase 5, roadmap §6) ----------------------------------
      agentMemories = [];
      systemActorId;
      constructor() {
        this.systemActorId = this.nextId("actor-system");
        this.actors.set(this.systemActorId, {
          id: this.systemActorId,
          type: "system",
          displayName: "system",
          personaCode: null
        });
      }
      // -- infrastructure --------------------------------------------------------
      nextId(prefix) {
        this.seq += 1;
        return `${prefix}_${this.seq.toString(36).padStart(6, "0")}`;
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
          ...extra?.causationId !== void 0 ? { causationId: extra.causationId } : {}
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
        if (this.grants.get(actorId)?.has(permission)) return "direct";
        for (const assignment of this.roleAssignments) {
          if (assignment.actorId !== actorId || assignment.revoked) continue;
          if ((DELIVERY_ROLES[assignment.roleCode] ?? []).includes(permission)) {
            return `role:${assignment.roleCode}`;
          }
        }
        return null;
      }
      agentCeilingAllows(actor, permission) {
        if (!actor || actor.type !== "agent") return { plan: true, policy: true };
        const ceiling = PLAN_CEILINGS[this.plan];
        if (AGENT_GATE_APPROVE_PERMISSIONS.includes(permission)) {
          return { plan: ceiling.agentGateApprove, policy: this.workspacePolicy.agentGateApprovals !== false };
        }
        if (permission === "gate.review.reject") {
          return { plan: ceiling.agentGateReject, policy: true };
        }
        if (permission === "task.claim") {
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
        if (this.governanceRoles.get(byActorId) === "admin") return;
        throw new PermissionDeniedError("governance.admin", byActorId);
      }
      /** Grant-time plan ceiling: refuse issuing agent gate permissions the plan forbids. */
      checkGrantCeiling(actorId, permission) {
        const actor = this.actors.get(actorId);
        if (!actor || actor.type !== "agent") return;
        const ceiling = PLAN_CEILINGS[this.plan];
        if (AGENT_GATE_APPROVE_PERMISSIONS.includes(permission) && !ceiling.agentGateApprove) {
          throw new GuardFailedError(`plan ${this.plan} does not allow agents to hold ${permission}`);
        }
        if (permission === "gate.review.reject" && !ceiling.agentGateReject) {
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
          this.append("work_item", item.id, "fencing.rejected", actorId, {
            presentedToken: fencingToken2,
            liveToken: live?.fencingToken ?? null
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
        const actor = {
          id: this.nextId("actor"),
          type: input.type,
          displayName: input.displayName,
          personaCode: input.personaCode ?? null
        };
        this.actors.set(actor.id, actor);
        this.governanceRoles.set(actor.id, input.governanceRole ?? "member");
        return { ...actor };
      }
      grant(input) {
        this.checkGrantCeiling(input.actorId, input.permission);
        const set = this.grants.get(input.actorId) ?? /* @__PURE__ */ new Set();
        set.add(input.permission);
        this.grants.set(input.actorId, set);
        this.append("actor", input.actorId, "grant.issued", this.systemActorId, { permission: input.permission });
      }
      revoke(input) {
        this.grants.get(input.actorId)?.delete(input.permission);
        this.append("actor", input.actorId, "grant.revoked", this.systemActorId, { permission: input.permission });
      }
      // -- entitlements (Phase 2, roadmap §3) ----------------------------------------
      setGovernanceRole(input) {
        this.requireGovernanceAdmin(input.byActorId);
        if (!this.actors.has(input.actorId)) throw new GuardFailedError(`unknown actor: ${input.actorId}`);
        this.governanceRoles.set(input.actorId, input.role);
        this.append("actor", input.actorId, "governance.changed", input.byActorId, { role: input.role });
      }
      getGovernanceRole(actorId) {
        return this.governanceRoles.get(actorId) ?? "member";
      }
      assignRole(input) {
        this.requireGovernanceAdmin(input.byActorId);
        const bundle = DELIVERY_ROLES[input.roleCode];
        if (bundle === void 0) throw new GuardFailedError(`unknown delivery role: ${input.roleCode}`);
        if (!this.actors.has(input.actorId)) throw new GuardFailedError(`unknown actor: ${input.actorId}`);
        for (const permission of bundle) {
          this.checkGrantCeiling(input.actorId, permission);
        }
        const active = this.roleAssignments.some(
          (a) => a.actorId === input.actorId && a.roleCode === input.roleCode && !a.revoked
        );
        if (active) return;
        this.roleAssignments.push({
          actorId: input.actorId,
          roleCode: input.roleCode,
          grantedBy: input.byActorId,
          revoked: false
        });
        this.append("actor", input.actorId, "role.assigned", input.byActorId, { roleCode: input.roleCode });
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
        this.append("actor", input.actorId, "role.revoked", input.byActorId, { roleCode: input.roleCode });
      }
      listRoleAssignments(actorId) {
        return this.roleAssignments.filter((a) => actorId === void 0 || a.actorId === actorId).map((a) => ({ ...a }));
      }
      setPlan(input) {
        this.requireGovernanceAdmin(input.byActorId);
        if (PLAN_CEILINGS[input.plan] === void 0) throw new GuardFailedError(`unknown plan: ${input.plan}`);
        this.plan = input.plan;
        this.planVersion += 1;
        this.append("workspace", "workspace", "plan.changed", input.byActorId, {
          plan: input.plan,
          planVersion: this.planVersion
        });
      }
      getPlan() {
        return this.plan;
      }
      setWorkspacePolicy(input) {
        this.requireGovernanceAdmin(input.byActorId);
        this.workspacePolicy = { ...this.workspacePolicy, ...input.policy };
        this.policyVersion += 1;
        this.append("workspace", "workspace", "policy.changed", input.byActorId, {
          policy: { ...this.workspacePolicy },
          policyVersion: this.policyVersion
        });
      }
      getWorkspacePolicy() {
        return { ...this.workspacePolicy };
      }
      setGatePolicy(input) {
        this.requireGovernanceAdmin(input.byActorId);
        const minApprovals = input.policy.minApprovals ?? 1;
        if (!Number.isInteger(minApprovals) || minApprovals < 1) {
          throw new GuardFailedError("minApprovals must be a positive integer");
        }
        this.gatePolicies.set(input.gate, { ...input.policy });
        this.append("workspace", "workspace", "gate_policy.changed", input.byActorId, {
          gate: input.gate,
          policy: { ...input.policy }
        });
      }
      getGatePolicy(gate) {
        return { ...this.gatePolicies.get(gate) ?? {} };
      }
      listActors() {
        return [...this.actors.values()].map((a) => ({ ...a }));
      }
      provisionPersonas(input) {
        this.requireGovernanceAdmin(input.byActorId);
        const provisioned = [];
        for (const persona of PERSONAS) {
          let actor = [...this.actors.values()].find((a) => a.personaCode === persona.personaCode);
          if (!actor) {
            actor = this.createActor({
              type: "agent",
              displayName: persona.displayName,
              personaCode: persona.personaCode
            });
            this.append("actor", actor.id, "actor.provisioned", input.byActorId, {
              personaCode: persona.personaCode
            });
          }
          this.assignRole({ actorId: actor.id, roleCode: persona.defaultRole, byActorId: input.byActorId });
          provisioned.push({ ...actor });
        }
        return provisioned;
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
          versions: { plan: this.planVersion, policy: this.policyVersion }
        };
      }
      createFeature(input) {
        const feature = { id: this.nextId("feat"), state: "backlog", dispatchHold: false };
        this.features.set(feature.id, feature);
        this.append("feature", feature.id, "feature.created", input.actorId, {});
        return this.copyFeature(feature);
      }
      createWorkItem(input) {
        const slug = input.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
        const item = {
          id: this.nextId("wi"),
          featureId: input.featureId,
          externalKey: input.externalKey,
          kind: input.kind ?? "code",
          title: input.title,
          state: "backlog",
          blockedReason: null,
          reviewLoopIteration: 0,
          intentHash: null,
          pinnedVerification: null,
          specCheckpoint: input.specCheckpoint ?? false,
          doneCheckpoint: input.doneCheckpoint ?? false,
          invokeDevWith: input.invokeDevWith ?? "",
          specPath: `stories/${input.externalKey}-${slug}.md`,
          stateVersion: 0,
          dependsOn: input.dependsOn ? [...input.dependsOn] : []
        };
        this.workItems.set(item.id, item);
        if (!this.externalKeyIndex.has(item.externalKey)) {
          this.externalKeyIndex.set(item.externalKey, item.id);
        }
        this.append("work_item", item.id, "work_item.created", input.actorId, {
          externalKey: item.externalKey,
          featureId: item.featureId
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
          const existing = [...this.workItems.values()].find(
            (wi) => wi.featureId === input.featureId && wi.externalKey === entry.id
          );
          if (existing) {
            existing.title = entry.title;
            existing.specCheckpoint = entry.specCheckpoint;
            existing.doneCheckpoint = entry.doneCheckpoint;
            existing.invokeDevWith = entry.invokeDevWith;
            this.append("work_item", existing.id, "work_item.reimported", input.actorId, { externalKey: entry.id });
            updated.push(entry.id);
          } else {
            this.createWorkItem({
              featureId: input.featureId,
              externalKey: entry.id,
              title: entry.title,
              specCheckpoint: entry.specCheckpoint,
              doneCheckpoint: entry.doneCheckpoint,
              invokeDevWith: entry.invokeDevWith,
              actorId: input.actorId
            });
            imported.push(entry.id);
          }
        }
        return { imported, updated, warnings };
      }
      // -- claims (roadmap §1.3) ---------------------------------------------------
      claimTask(input) {
        const item = this.mustGetItem(input.workItemId);
        this.requirePermission(input.actorId, "task.claim");
        if (this.liveClaim(item.id) !== null) {
          throw new ConflictError(`work item ${item.id} already has a live claim`);
        }
        const ttlMs = input.ttlMs ?? 15 * 60 * 1e3;
        const token = (this.fencingCounter.get(item.id) ?? 0) + 1;
        this.fencingCounter.set(item.id, token);
        const claim = {
          id: this.nextId("claim"),
          workItemId: item.id,
          actorId: input.actorId,
          fencingToken: token,
          leaseExpiresAt: this.now + ttlMs,
          released: false,
          ttlMs
        };
        this.claims.set(claim.id, claim);
        this.claimsByItem.set(item.id, [...this.claimsByItem.get(item.id) ?? [], claim.id]);
        this.append("work_item", item.id, "work_item.claimed", input.actorId, { claimId: claim.id, fencingToken: token });
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
        this.append("work_item", claim.workItemId, "claim.released", claim.actorId, {
          claimId: claim.id,
          reason: input.reason ?? null
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
          if (RANK[input.to] < RANK[item.state] && this.hasPermission(input.actorId, "state.downgrade")) {
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
            throw new GuardFailedError("claim fencing token required for this transition");
          }
        }
        for (const guard of rule.guards) {
          this.checkGuard(guard, item);
        }
        return this.executeTransition(item, input.to, input.actorId, input.idempotencyKey);
      }
      checkGuard(guard, item) {
        switch (guard) {
          case "deps_done": {
            for (const depKey of item.dependsOn) {
              const dep = [...this.workItems.values()].find(
                (wi) => wi.featureId === item.featureId && wi.externalKey === depKey
              );
              if (dep && dep.state !== "done") {
                throw new GuardFailedError(`dependency ${depKey} is not done`);
              }
            }
            return;
          }
          case "spec_gate_if_checkpoint": {
            if (!item.specCheckpoint) return;
            const approved = this.gateDecisions.some(
              (d) => d.workItemId === item.id && d.gate === "spec_approval" && d.decision === "approved"
            );
            if (!approved) {
              throw new GuardFailedError("spec_checkpoint requires an approved spec_approval gate decision");
            }
            return;
          }
          case "nonempty_diff": {
            if (item.kind !== "code") {
              const lints = this.evidenceRows.filter(
                (row) => row.workItemId === item.id && row.evidence.kind === "doc_lint"
              );
              const latestLint = lints[lints.length - 1];
              if (latestLint && latestLint.evidence.payload["schemaValid"] !== true) {
                throw new GuardFailedError("the latest doc_lint evidence failed \u2014 document is not schema-valid");
              }
              return;
            }
            const diffs = this.evidenceRows.filter(
              (row) => row.workItemId === item.id && row.evidence.kind === "git_diff"
            );
            const latest = diffs[diffs.length - 1];
            if (latest && latest.evidence.payload["nonEmpty"] !== true) {
              throw new GuardFailedError("the latest git_diff evidence is empty \u2014 nothing to review");
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
          "work_item",
          item.id,
          "work_item.state_downgraded",
          input.actorId,
          { from, to: input.to, compensating: true },
          input.idempotencyKey !== void 0 ? { idempotencyKey: input.idempotencyKey } : void 0
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
          "work_item",
          item.id,
          "work_item.state_changed",
          actorId,
          { from, to },
          {
            ...causationId !== void 0 ? { causationId } : {},
            ...idempotencyKey !== void 0 ? { idempotencyKey } : {}
          }
        );
        if (from === "backlog" && to !== "backlog") {
          const feature = this.features.get(item.featureId);
          if (feature && feature.state === "backlog") {
            feature.state = "in_progress";
            this.append("feature", feature.id, "feature.state_changed", this.systemActorId, {
              from: "backlog",
              to: "in_progress"
            }, { causationId: String(event.globalSeq) });
          }
        }
        if (to === "done" && item.doneCheckpoint) {
          const feature = this.features.get(item.featureId);
          if (feature && !feature.dispatchHold) {
            feature.dispatchHold = true;
            this.append("feature", feature.id, "feature.dispatch_hold_raised", this.systemActorId, {
              workItemId: item.id
            }, { causationId: String(event.globalSeq) });
          }
        }
        this.narrateWorkItem(item, `state: ${from} \u2192 ${to}`);
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
        this.requirePermission(input.actorId, "task.block");
        item.blockedReason = input.reason;
        item.stateVersion += 1;
        this.append("work_item", item.id, "work_item.blocked", input.actorId, { reason: input.reason });
        return this.copyItem(item);
      }
      unblockTask(input) {
        const item = this.mustGetItem(input.workItemId);
        if (item.blockedReason === "review_non_convergence") {
          this.requirePermission(input.actorId, "gate.review.approve");
        } else {
          this.requirePermission(input.actorId, "task.block");
        }
        item.blockedReason = null;
        item.stateVersion += 1;
        this.append("work_item", item.id, "work_item.unblocked", input.actorId, {});
        return this.copyItem(item);
      }
      // -- gates & evidence (roadmap §1.4) ------------------------------------------
      submitEvidence(input) {
        const item = this.mustGetItem(input.workItemId);
        this.validatePresentedToken(item, input.fencingToken, input.actorId);
        this.evidenceRows.push({ workItemId: item.id, evidence: input.evidence, seq: this.evidenceRows.length + 1 });
        this.append("work_item", item.id, "evidence.submitted", input.actorId, {
          kind: input.evidence.kind
        });
      }
      approveGate(input) {
        const item = this.mustGetItem(input.workItemId);
        if (input.gate === "spec_approval") {
          this.requirePermission(input.actorId, "gate.spec.approve");
          if (item.blockedReason !== null) {
            throw new GuardFailedError(`work item is blocked: ${item.blockedReason}`);
          }
          if (item.state !== "draft") {
            throw new GuardFailedError(`spec_approval applies to draft items, not ${item.state}`);
          }
          if (input.pinnedVerification !== void 0) {
            item.pinnedVerification = [...input.pinnedVerification];
          }
          if (!this.quorumWouldBeMet(item, "spec_approval", input.actorId)) {
            this.recordApproval(item, "spec_approval", input.actorId);
            return this.copyItem(item);
          }
          this.recordApproval(item, "spec_approval", input.actorId);
          return this.executeTransition(item, "ready_for_dev", input.actorId);
        }
        this.requirePermission(input.actorId, "gate.review.approve");
        if (item.blockedReason !== null) {
          throw new GuardFailedError(`work item is blocked: ${item.blockedReason}`);
        }
        if (item.state !== "in_review") {
          throw new GuardFailedError(`review_approval applies to in_review items, not ${item.state}`);
        }
        if (!this.quorumWouldBeMet(item, "review_approval", input.actorId)) {
          this.recordApproval(item, "review_approval", input.actorId);
          return this.copyItem(item);
        }
        this.checkReviewEvidence(item);
        this.recordApproval(item, "review_approval", input.actorId);
        return this.executeTransition(item, "done", input.actorId);
      }
      /** Distinct approvers of this round (round = reviewLoopIteration at decision time). */
      roundApprovers(item, gate) {
        const ids = new Set(
          this.gateDecisions.filter(
            (d) => d.workItemId === item.id && d.gate === gate && d.decision === "approved" && d.round === item.reviewLoopIteration
          ).map((d) => d.actorId)
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
          decision: "approved",
          actorId,
          round: item.reviewLoopIteration
        });
        this.append("work_item", item.id, "gate.approved", actorId, {
          gate,
          round: item.reviewLoopIteration,
          ...gate === "spec_approval" ? { pinnedVerification: item.pinnedVerification } : {}
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
          const runs = rows.filter(
            (row) => row.evidence.kind === "test_run" && row.evidence.payload["command"] === command
          );
          const latest = runs[runs.length - 1];
          if (!latest || latest.evidence.payload["exitCode"] !== 0) {
            throw new GuardFailedError(`pinned verification did not pass: ${command}`);
          }
        }
        if (item.kind === "code") {
          const commitOk = rows.some(
            (row) => row.evidence.kind === "commit" && row.evidence.payload["reachableOnRemote"] === true
          );
          if (!commitOk) {
            throw new GuardFailedError("final revision must be reachable on the remote (push is part of the HALT contract)");
          }
        }
      }
      rejectGate(input) {
        const item = this.mustGetItem(input.workItemId);
        if (input.gate !== "review_approval") {
          throw new GuardFailedError("only review_approval rejection is defined in Phase 1");
        }
        if (!this.hasPermission(input.actorId, "gate.review.approve") && !this.hasPermission(input.actorId, "gate.review.reject")) {
          throw new PermissionDeniedError("gate.review.reject", input.actorId);
        }
        if (item.state !== "in_review") {
          throw new GuardFailedError(`review rejection applies to in_review items, not ${item.state}`);
        }
        this.gateDecisions.push({
          workItemId: item.id,
          gate: "review_approval",
          decision: "rejected",
          actorId: input.actorId,
          round: item.reviewLoopIteration
        });
        const decisionEvent = this.append("work_item", item.id, "gate.rejected", input.actorId, {
          gate: "review_approval"
        });
        if (item.reviewLoopIteration >= REVIEW_LOOP_LIMIT) {
          item.blockedReason = "review_non_convergence";
          item.stateVersion += 1;
          this.append(
            "work_item",
            item.id,
            "work_item.blocked",
            this.systemActorId,
            { reason: "review_non_convergence" },
            { causationId: String(decisionEvent.globalSeq) }
          );
          return this.copyItem(item);
        }
        item.reviewLoopIteration += 1;
        return this.executeTransition(item, "in_progress", this.systemActorId, void 0, String(decisionEvent.globalSeq));
      }
      // -- collaboration (Phase 3, roadmap §5) ---------------------------------------
      mustGetThread(threadId) {
        const thread = this.threads.get(threadId);
        if (!thread) throw new GuardFailedError(`unknown thread: ${threadId}`);
        return thread;
      }
      isParticipant(thread, actorId) {
        return thread.createdBy === actorId || thread.participants.includes(actorId);
      }
      createThread(input) {
        if (input.featureId !== void 0 && !this.features.has(input.featureId)) {
          throw new GuardFailedError(`unknown feature: ${input.featureId}`);
        }
        let workItemId2 = null;
        if (input.workItemId !== void 0) {
          workItemId2 = this.mustGetItem(input.workItemId).id;
        }
        const thread = {
          id: this.nextId("th"),
          featureId: input.featureId ?? null,
          workItemId: workItemId2,
          kind: input.kind,
          visibility: input.visibility ?? (input.kind === "private" ? "private" : "open"),
          createdBy: input.actorId,
          participants: [input.actorId]
        };
        this.threads.set(thread.id, thread);
        this.append("thread", thread.id, "thread.created", input.actorId, {
          kind: thread.kind,
          featureId: thread.featureId,
          workItemId: thread.workItemId,
          visibility: thread.visibility
        });
        return { ...thread, participants: [...thread.participants] };
      }
      addThreadParticipant(input) {
        const thread = this.mustGetThread(input.threadId);
        if (!this.isParticipant(thread, input.byActorId)) {
          throw new PermissionDeniedError("thread.invite", input.byActorId);
        }
        if (!this.actors.has(input.actorId)) throw new GuardFailedError(`unknown actor: ${input.actorId}`);
        if (!thread.participants.includes(input.actorId)) {
          thread.participants.push(input.actorId);
          this.append("thread", thread.id, "thread.participant_added", input.byActorId, {
            actorId: input.actorId
          });
        }
        return { ...thread, participants: [...thread.participants] };
      }
      /** Internal append that never runs the router — used for chat, narration alike. */
      appendMessage(thread, authorId, kind, body, replyTo) {
        const seq = this.messages.filter((m) => m.threadId === thread.id).length + 1;
        const message = {
          id: this.nextId("msg"),
          threadId: thread.id,
          seq,
          authorId,
          kind,
          body,
          replyTo
        };
        this.messages.push(message);
        this.append("thread", thread.id, "message.posted", authorId, { messageId: message.id, kind });
        return { ...message };
      }
      /**
       * §5.2: the server NEVER parses body text — `mentions` is structured actor
       * ids. §5.4: the router is pure code, default-deny, policy-gated,
       * depth-capped; a job is reply-only context, never a claim.
       */
      postMessage(input) {
        const thread = this.mustGetThread(input.threadId);
        if (thread.visibility === "private" && !this.isParticipant(thread, input.actorId)) {
          throw new PermissionDeniedError("thread.post", input.actorId);
        }
        const message = this.appendMessage(thread, input.actorId, "chat", input.body, input.replyTo ?? null);
        for (const mentionedId of [...new Set(input.mentions ?? [])]) {
          const mentioned = this.actors.get(mentionedId);
          if (!mentioned) throw new GuardFailedError(`unknown mentioned actor: ${mentionedId}`);
          const resolution = this.routeMention(thread, message, input.actorId, mentioned);
          this.mentions.push({ messageId: message.id, mentionedActorId: mentionedId, resolution });
          this.append("thread", thread.id, "mention.recorded", input.actorId, {
            messageId: message.id,
            mentionedActorId: mentionedId,
            resolution
          });
        }
        return message;
      }
      /** The deterministic mention router (§5.4). Returns the recorded resolution. */
      routeMention(thread, message, mentionerId, mentioned) {
        if (mentioned.type !== "agent") {
          this.pushNotification(mentioned.id, "mention", message.id);
          return "notified";
        }
        if (this.workspacePolicy.mentionDispatch === false) return "denied_policy";
        const mentioner = this.actors.get(mentionerId);
        let depth = 0;
        if (mentioner?.type === "agent") {
          if (this.workspacePolicy.agentMentionAgent !== true) return "denied_policy";
          const mentionerJobs = [...this.agentJobs.values()].filter((j) => j.agentActorId === mentionerId);
          depth = Math.max(0, ...mentionerJobs.map((j) => j.depth)) + 1;
          if (depth > AGENT_JOB_MAX_DEPTH) return "denied_depth";
        } else {
          const hasRole = this.roleAssignments.some((a) => a.actorId === mentionerId && !a.revoked);
          const isAdmin = this.governanceRoles.get(mentionerId) === "admin" || mentionerId === this.systemActorId;
          if (!hasRole && !isAdmin) return "denied_policy";
        }
        const job = {
          id: this.nextId("job"),
          agentActorId: mentioned.id,
          threadId: thread.id,
          messageId: message.id,
          workItemId: thread.workItemId,
          featureId: thread.featureId,
          status: "queued",
          depth,
          note: null
        };
        this.agentJobs.set(job.id, job);
        this.append("agent_job", job.id, "agent_job.created", mentionerId, {
          agentActorId: mentioned.id,
          threadId: thread.id,
          messageId: message.id,
          depth
        });
        this.pushNotification(mentioned.id, "mention", message.id);
        return "job_created";
      }
      pushNotification(actorId, source, refId) {
        this.notifications.push({ id: this.nextId("ntf"), actorId, source, refId, read: false });
      }
      listThreads(filter) {
        return [...this.threads.values()].filter((t) => {
          if (filter?.featureId !== void 0 && t.featureId !== filter.featureId) return false;
          if (filter?.workItemId !== void 0) {
            const resolved = this.mustGetItem(filter.workItemId).id;
            if (t.workItemId !== resolved) return false;
          }
          if (filter?.actorId !== void 0 && t.visibility === "private" && !this.isParticipant(t, filter.actorId)) {
            return false;
          }
          return true;
        }).map((t) => ({ ...t, participants: [...t.participants] }));
      }
      listMessages(input) {
        const thread = this.mustGetThread(input.threadId);
        if (thread.visibility === "private" && !this.isParticipant(thread, input.actorId)) {
          throw new PermissionDeniedError("thread.read", input.actorId);
        }
        return this.messages.filter((m) => m.threadId === thread.id && (input.sinceSeq === void 0 || m.seq > input.sinceSeq)).map((m) => ({ ...m }));
      }
      listMentions(messageId) {
        return this.mentions.filter((m) => m.messageId === messageId).map((m) => ({ ...m }));
      }
      listNotifications(input) {
        return this.notifications.filter((n) => n.actorId === input.actorId && (input.unreadOnly !== true || !n.read)).map((n) => ({ ...n }));
      }
      markNotificationRead(input) {
        const notification = this.notifications.find((n) => n.id === input.notificationId);
        if (!notification) throw new GuardFailedError(`unknown notification: ${input.notificationId}`);
        if (notification.actorId !== input.actorId) {
          throw new PermissionDeniedError("thread.read", input.actorId);
        }
        notification.read = true;
      }
      listAgentJobs(filter) {
        return [...this.agentJobs.values()].filter(
          (j) => (filter?.agentActorId === void 0 || j.agentActorId === filter.agentActorId) && (filter?.status === void 0 || j.status === filter.status)
        ).map((j) => ({ ...j }));
      }
      completeAgentJob(input) {
        const job = this.agentJobs.get(input.jobId);
        if (!job) throw new GuardFailedError(`unknown agent job: ${input.jobId}`);
        if (job.agentActorId !== input.actorId) {
          throw new PermissionDeniedError("agent_job.complete", input.actorId);
        }
        if (job.status !== "queued") throw new GuardFailedError(`agent job ${job.id} is already ${job.status}`);
        job.status = input.status;
        job.note = input.note ?? null;
        this.append("agent_job", job.id, "agent_job.completed", input.actorId, {
          status: input.status,
          note: job.note
        });
        const trigger = this.messages.find((m) => m.id === job.messageId);
        if (trigger) this.pushNotification(trigger.authorId, "job_completed", job.id);
        return { ...job };
      }
      // -- agent memory (Phase 5, roadmap §6) ----------------------------------------
      appendAgentMemory(input) {
        const actor = this.actors.get(input.actorId);
        if (!actor) throw new GuardFailedError(`unknown actor: ${input.actorId}`);
        if (actor.type !== "agent") {
          throw new GuardFailedError("memory belongs to agent actors (roadmap \xA76)");
        }
        let sourceThreadId = null;
        let sourceVisibility = null;
        if (input.sourceThreadId !== void 0) {
          const thread = this.mustGetThread(input.sourceThreadId);
          if (thread.visibility === "private" && !this.isParticipant(thread, input.actorId)) {
            throw new PermissionDeniedError("thread.read", input.actorId);
          }
          sourceThreadId = thread.id;
          sourceVisibility = thread.visibility;
        }
        const seq = this.agentMemories.filter((m) => m.agentActorId === input.actorId).length + 1;
        const memory = {
          id: this.nextId("mem"),
          agentActorId: input.actorId,
          kind: input.kind,
          content: input.content,
          sourceThreadId,
          sourceVisibility,
          seq
        };
        this.agentMemories.push(memory);
        this.append("actor", input.actorId, "memory.appended", input.actorId, {
          memoryId: memory.id,
          kind: memory.kind,
          sourceThreadId
        });
        return { ...memory };
      }
      searchAgentMemory(input) {
        return this.agentMemories.filter((m) => {
          if (m.agentActorId !== input.actorId) return false;
          if (input.kind !== void 0 && m.kind !== input.kind) return false;
          if (input.query !== void 0 && !m.content.toLowerCase().includes(input.query.toLowerCase())) return false;
          if (m.sourceVisibility === "private" && m.sourceThreadId !== input.contextThreadId) return false;
          return true;
        }).map((m) => ({ ...m }));
      }
      /** Rails → chat narration (§5.2): state changes narrate into bound task threads. */
      narrateWorkItem(item, body) {
        for (const thread of this.threads.values()) {
          if (thread.workItemId === item.id) {
            this.appendMessage(thread, this.systemActorId, "system", body, null);
          }
        }
      }
      // -- dispatch (roadmap §2.3) -----------------------------------------------
      getTaskContext(input) {
        const item = this.mustGetItem(input.workItemId);
        if (item.state === "done") {
          throw new GuardFailedError("done items are never re-dispatched; follow-up review is a new work item");
        }
        const feature = this.features.get(item.featureId);
        if (feature?.dispatchHold) {
          throw new GuardFailedError("feature is under a done_checkpoint dispatch hold");
        }
        return { workItem: this.copyItem(item), entryState: item.state };
      }
      releaseDispatchHold(input) {
        this.requirePermission(input.actorId, "dispatch.release_hold");
        const feature = this.features.get(input.featureId);
        if (!feature) throw new GuardFailedError(`unknown feature: ${input.featureId}`);
        feature.dispatchHold = false;
        this.append("feature", feature.id, "feature.dispatch_hold_released", input.actorId, {});
        return this.copyFeature(feature);
      }
      // -- reconciliation (roadmap §1.6, D6: detect-only, never mutates) ------------
      reconcile(input) {
        const reports = [];
        for (const file of input.files) {
          const item = this.mustGetItem(file.workItemId);
          if (this.liveClaim(item.id) !== null) continue;
          const raw = file.frontmatterStatus.trim();
          if (raw === "blocked") {
            if (item.blockedReason !== null) continue;
            reports.push({
              workItemId: item.id,
              fileState: raw,
              dbState: item.state,
              kind: "conflict"
            });
            continue;
          }
          const normalized = LEGACY_STATUS[raw];
          if (normalized === void 0) {
            reports.push({ workItemId: item.id, fileState: raw, dbState: item.state, kind: "conflict" });
            continue;
          }
          if (normalized === item.state) continue;
          reports.push({
            workItemId: item.id,
            fileState: raw,
            dbState: item.state,
            kind: RANK[normalized] > RANK[item.state] ? "file_ahead" : "db_ahead"
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
        return [...this.workItems.values()].filter((item) => {
          if (filter?.state !== void 0 && item.state !== filter.state) return false;
          if (filter?.featureId !== void 0 && item.featureId !== filter.featureId) return false;
          if (filter?.claimable === true && this.liveClaim(item.id) !== null) return false;
          return true;
        }).map((item) => this.copyItem(item));
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
  }
});

// ../../packages/core/src/intent-hash.ts
var init_intent_hash = __esm({
  "../../packages/core/src/intent-hash.ts"() {
    "use strict";
    init_types();
  }
});

// ../../packages/core/src/index.ts
var init_src = __esm({
  "../../packages/core/src/index.ts"() {
    "use strict";
    init_engine();
    init_types();
    init_intent_hash();
    init_stories();
  }
});

// ../../packages/runner/src/doclint.ts
import { parse as parseYaml } from "yaml";
function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function splitFrontmatter(content) {
  if (!content.startsWith("---")) return { block: null, closed: true, body: content };
  const close = content.indexOf("\n---", 3);
  if (close === -1) return { block: null, closed: false, body: content };
  const firstNewline = content.indexOf("\n");
  const block = content.slice(firstNewline + 1, close);
  const bodyStart = content.indexOf("\n", close + 1);
  const body = bodyStart === -1 ? "" : content.slice(bodyStart + 1);
  return { block, closed: true, body };
}
function lintDoc(content, opts = {}) {
  const findings = [];
  if (content.trim().length === 0) {
    findings.push("document is empty");
    return { schemaValid: false, findings };
  }
  const { block, closed } = splitFrontmatter(content);
  if (!closed) {
    findings.push("frontmatter fence '---' never closes");
  } else if (block !== null) {
    try {
      parseYaml(block);
    } catch (error) {
      const message = error instanceof Error ? error.message.split("\n")[0] : String(error);
      findings.push(`frontmatter is not valid YAML: ${message ?? "parse error"}`);
    }
  }
  for (const section of opts.requiredSections ?? []) {
    const headingRe = new RegExp(`^##\\s+${escapeRegExp(section)}\\s*$`, "im");
    if (!headingRe.test(content)) {
      findings.push(`missing required section: ## ${section}`);
    }
  }
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (line !== void 0) {
      const match = PLACEHOLDER_RE.exec(line);
      if (match !== null) {
        findings.push(`placeholder "${match[1] ?? match[0]}" at line ${i + 1}`);
      }
    }
  }
  return { schemaValid: findings.length === 0, findings };
}
var PLACEHOLDER_RE;
var init_doclint = __esm({
  "../../packages/runner/src/doclint.ts"() {
    "use strict";
    PLACEHOLDER_RE = /\b(TBD|TODO|FIXME|LOREM IPSUM)\b/i;
  }
});

// ../../packages/runner/src/jobs.ts
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
function isRemoteError(error, name) {
  return typeof error === "object" && error !== null && error.errorName === name;
}
async function runJobsOnce(options) {
  const { client, agentActorId } = options;
  const queued = await client.call("list_agent_jobs", {
    agentActorId,
    status: "queued"
  });
  const job = queued[0];
  if (job === void 0) return { handled: false };
  let messages2;
  try {
    messages2 = await client.call("list_messages", { threadId: job.threadId });
  } catch (error) {
    if (isRemoteError(error, "PermissionDeniedError")) {
      await client.call("complete_agent_job", {
        jobId: job.id,
        status: "blocked",
        note: "no thread access"
      });
      return { handled: true, jobId: job.id, outcome: "blocked", details: "no thread access" };
    }
    throw error;
  }
  let memories = [];
  try {
    const recalled = await client.call("search_agent_memory", {
      contextThreadId: job.threadId
    });
    memories = recalled.slice(-RECALL_LIMIT);
  } catch {
  }
  const dir = mkdtempSync(join(tmpdir(), "oahs-job-"));
  try {
    const contextFile = join(dir, "context.json");
    const replyFile = join(dir, "reply.txt");
    writeFileSync(contextFile, `${JSON.stringify({ job, messages: messages2, memories }, null, 2)}
`, "utf8");
    const command = options.agentCmd.replaceAll("{CONTEXT_FILE}", contextFile).replaceAll("{REPLY_FILE}", replyFile).replaceAll("{THREAD_ID}", job.threadId).replaceAll("{JOB_ID}", job.id);
    const invoked = spawnSync("bash", ["-lc", command], {
      cwd: dir,
      encoding: "utf8",
      timeout: options.agentTimeoutMs ?? 10 * 60 * 1e3,
      killSignal: "SIGKILL",
      env: {
        ...process.env,
        ...options.agentEnv,
        OAHS_CONTEXT_FILE: contextFile,
        OAHS_REPLY_FILE: replyFile
      }
    });
    const reply = existsSync(replyFile) ? readFileSync(replyFile, "utf8").trim() : "";
    if (reply === "") {
      const note = `agent wrote no reply (exit ${String(invoked.status ?? -1)})`;
      await client.call("complete_agent_job", { jobId: job.id, status: "blocked", note });
      return { handled: true, jobId: job.id, outcome: "blocked", details: note };
    }
    const trigger = messages2.find((m) => m.id === job.messageId);
    await client.call("post_message", {
      threadId: job.threadId,
      body: reply,
      ...trigger !== void 0 ? { mentions: [trigger.authorId] } : {}
    });
    await client.call("complete_agent_job", { jobId: job.id, status: "done" });
    try {
      await client.call("append_agent_memory", {
        kind: "episodic",
        content: `job ${job.id} in thread ${job.threadId}: ${reply.slice(0, MEMORY_REPLY_HEAD)}`,
        sourceThreadId: job.threadId
      });
    } catch {
    }
    return { handled: true, jobId: job.id, outcome: "done" };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
async function jobsLoop(options) {
  let stopped = false;
  let wake;
  const onSigint = () => {
    stopped = true;
    wake?.();
  };
  process.once("SIGINT", onSigint);
  try {
    for (; ; ) {
      const result = await runJobsOnce(options);
      if (options.once === true || stopped) return;
      if (!result.handled) {
        await new Promise((resolveSleep) => {
          wake = resolveSleep;
          setTimeout(resolveSleep, options.pollMs ?? 15e3);
        });
        wake = void 0;
        if (stopped) return;
      }
    }
  } finally {
    process.removeListener("SIGINT", onSigint);
  }
}
var RECALL_LIMIT, MEMORY_REPLY_HEAD;
var init_jobs = __esm({
  "../../packages/runner/src/jobs.ts"() {
    "use strict";
    RECALL_LIMIT = 20;
    MEMORY_REPLY_HEAD = 200;
  }
});

// ../../packages/runner/src/index.ts
var src_exports = {};
__export(src_exports, {
  DEFAULT_VERIFICATION_ALLOWLIST: () => DEFAULT_VERIFICATION_ALLOWLIST,
  git: () => git,
  jobsLoop: () => jobsLoop,
  lintDoc: () => lintDoc,
  runJobsOnce: () => runJobsOnce,
  runOnce: () => runOnce,
  workLoop: () => workLoop
});
import { spawnSync as spawnSync2 } from "node:child_process";
import {
  existsSync as existsSync2,
  mkdirSync,
  readdirSync,
  readFileSync as readFileSync2,
  rmSync as rmSync2,
  statSync,
  writeFileSync as writeFileSync2
} from "node:fs";
import { join as join2, resolve } from "node:path";
import { parse as parseYaml2 } from "yaml";
function git(args, cwd) {
  const result = spawnSync2("git", args, { cwd, encoding: "utf8" });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      `git ${args.join(" ")} failed with exit ${String(result.status)}: ${result.stderr.trim()}`
    );
  }
  return result.stdout.trim();
}
function ensureGitExcludes(repoPath) {
  const gitDir = join2(repoPath, ".git");
  try {
    if (!statSync(gitDir).isDirectory()) return;
  } catch {
    return;
  }
  const infoDir = join2(gitDir, "info");
  mkdirSync(infoDir, { recursive: true });
  const excludePath = join2(infoDir, "exclude");
  const current = existsSync2(excludePath) ? readFileSync2(excludePath, "utf8") : "";
  const wanted = [".oahs/", MARKER_FILE];
  const have = new Set(current.split("\n").map((line) => line.trim()));
  const missing = wanted.filter((line) => !have.has(line));
  if (missing.length === 0) return;
  const prefix = current === "" || current.endsWith("\n") ? current : `${current}
`;
  writeFileSync2(excludePath, `${prefix}${missing.join("\n")}
`, "utf8");
}
function removeWorktree(dir, repoPath) {
  try {
    git(["worktree", "remove", "--force", dir], repoPath);
  } catch {
    try {
      rmSync2(dir, { recursive: true, force: true });
      git(["worktree", "prune"], repoPath);
    } catch {
    }
  }
}
function writeMarker(worktreeDir, marker) {
  writeFileSync2(join2(worktreeDir, MARKER_FILE), `${JSON.stringify(marker, null, 2)}
`, "utf8");
}
function readMarker(worktreeDir) {
  const path = join2(worktreeDir, MARKER_FILE);
  if (!existsSync2(path)) return null;
  try {
    const raw = JSON.parse(readFileSync2(path, "utf8"));
    if (typeof raw.workItemId !== "string" || typeof raw.baseline !== "string") return null;
    return {
      workItemId: raw.workItemId,
      claimId: typeof raw.claimId === "string" ? raw.claimId : "",
      baseline: raw.baseline,
      invocations: typeof raw.invocations === "number" ? raw.invocations : 0
    };
  } catch {
    return null;
  }
}
function splitFrontmatter2(raw) {
  if (!raw.startsWith("---")) return { data: {}, body: raw };
  const close = raw.indexOf("\n---", 3);
  if (close === -1) return { data: {}, body: raw };
  const firstNewline = raw.indexOf("\n");
  const block = raw.slice(firstNewline + 1, close);
  const bodyStart = raw.indexOf("\n", close + 1);
  const body = bodyStart === -1 ? "" : raw.slice(bodyStart + 1);
  let data = {};
  try {
    data = parseYaml2(block);
  } catch {
    data = {};
  }
  const record = typeof data === "object" && data !== null && !Array.isArray(data) ? data : {};
  return { data: record, body };
}
function extractAutoRunResult(body) {
  const lines = body.split("\n");
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
  return lines.slice(start, end).join("\n").trimEnd();
}
function readSpecReport(specAbsPath) {
  if (!existsSync2(specAbsPath)) {
    return { status: null, blockingCondition: null, autoRunResult: null };
  }
  const { data, body } = splitFrontmatter2(readFileSync2(specAbsPath, "utf8"));
  const statusRaw = data["status"];
  const status = typeof statusRaw === "string" ? statusRaw : statusRaw != null ? String(statusRaw) : null;
  const autoRunResult = extractAutoRunResult(body);
  let blockingCondition = typeof data["blocking_condition"] === "string" ? data["blocking_condition"] : null;
  if (blockingCondition === null && autoRunResult !== null) {
    const match = /^blocking condition:\s*(.+)$/im.exec(autoRunResult);
    blockingCondition = match?.[1]?.trim() ?? null;
  }
  return { status, blockingCondition, autoRunResult };
}
function setFrontmatterStatus(specAbsPath, status) {
  const raw = readFileSync2(specAbsPath, "utf8");
  if (raw.startsWith("---")) {
    const close = raw.indexOf("\n---", 3);
    if (close !== -1) {
      const head = raw.slice(0, close);
      const rest = raw.slice(close);
      const replaced = /^status:.*$/m.test(head) ? head.replace(/^status:.*$/m, `status: ${status}`) : `${head}
status: ${status}`;
      writeFileSync2(specAbsPath, replaced + rest, "utf8");
      return;
    }
  }
  writeFileSync2(specAbsPath, `---
status: ${status}
---
${raw}`, "utf8");
}
function normalizeStatus(status) {
  if (status === null) return null;
  const flat = status.trim().toLowerCase().replaceAll("-", "_");
  return flat === "review" ? "in_review" : flat;
}
function mapBlockingCondition(condition) {
  if (condition === null) return "other";
  const c = condition.toLowerCase();
  if (c.includes("review repair loop exceeded")) return "review_non_convergence";
  if (c.includes("unclear intent")) return "unclear_intent";
  if (c.includes("no stories.yaml")) return "no_stories_yaml_found";
  if (c.includes("ambiguous story file match")) return "ambiguous_story_file_match";
  if (c.includes("no subagents")) return "no_subagents";
  return "other";
}
function isRemoteError2(error, name) {
  return typeof error === "object" && error !== null && error.errorName === name;
}
async function finishRun(args) {
  const { client, workItem, claim } = args;
  const spec = readSpecReport(join2(args.workDir, args.specRel));
  await args.submit("halt_report", {
    status: spec.status,
    blockingCondition: spec.blockingCondition,
    autoRunResult: spec.autoRunResult,
    agentExitCode: args.agentExitCode
  });
  for (const command of workItem.pinnedVerification ?? []) {
    const binary = command.trim().split(/\s+/)[0] ?? "";
    if (!args.allowlist.includes(binary)) {
      await args.submit("test_run", { command, exitCode: -1, refused: true });
      continue;
    }
    const run = spawnSync2("bash", ["-c", command], {
      cwd: args.workDir,
      encoding: "utf8",
      timeout: 10 * 60 * 1e3
    });
    await args.submit("test_run", { command, exitCode: run.status ?? -1 });
  }
  const final = git(["rev-parse", "HEAD"], args.workDir);
  const shortstat = final === args.baseline ? "" : git(["diff", "--shortstat", `${args.baseline}..${final}`], args.workDir);
  const filesChanged = Number(/(\d+) files? changed/.exec(shortstat)?.[1] ?? "0");
  await args.submit("git_diff", {
    baseline: args.baseline,
    final,
    filesChanged,
    nonEmpty: filesChanged > 0,
    branch: args.branch
  });
  git(["push", args.remote, args.branch], args.repoPath);
  const lsRemote = git(["ls-remote", args.remote, `refs/heads/${args.branch}`], args.repoPath);
  await args.submit("commit", {
    sha: final,
    branch: args.branch,
    reachableOnRemote: lsRemote.includes(final)
  });
  const status = normalizeStatus(spec.status);
  const token = claim.fencingToken;
  if (status === "blocked") {
    await client.call("block_task", {
      workItemId: workItem.id,
      reason: mapBlockingCondition(spec.blockingCondition),
      fencingToken: token
    });
    await client.call("release_claim", { claimId: claim.id, reason: "run blocked" });
    return "blocked";
  }
  const hasCommit = final !== args.baseline;
  if (status === "done" || status === "in_review" || status === "in_progress" && hasCommit) {
    await client.call("advance_state", {
      workItemId: workItem.id,
      to: "in_review",
      fencingToken: token
    });
    await client.call("release_claim", { claimId: claim.id, reason: "run finished" });
    return "in_review";
  }
  await client.call("block_task", { workItemId: workItem.id, reason: "other", fencingToken: token });
  await client.call("release_claim", {
    claimId: claim.id,
    reason: "run failed without a readable HALT"
  });
  return "blocked";
}
function scanOldWorktrees(root, workItemId2, specRel) {
  const scan = { adoptable: null, wrecked: [] };
  if (!existsSync2(root)) return scan;
  for (const name of readdirSync(root)) {
    const dir = join2(root, name);
    const marker = readMarker(dir);
    if (marker === null || marker.workItemId !== workItemId2) continue;
    let head = null;
    try {
      head = git(["rev-parse", "HEAD"], dir);
    } catch {
      head = null;
    }
    const status = normalizeStatus(readSpecReport(join2(dir, specRel)).status);
    const terminal = status === "done" || status === "in_review";
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
  const repoPath = resolve(options.repoPath);
  const remote = options.remote ?? "origin";
  const allowlist = options.verificationAllowlist ?? DEFAULT_VERIFICATION_ALLOWLIST;
  const listUnblocked = async (state) => (await client.call("list_work_items", { state, claimable: true })).filter(
    (item) => item.blockedReason === null
  );
  let candidates = await listUnblocked("ready_for_dev");
  if (candidates.length === 0) candidates = await listUnblocked("in_progress");
  const picked = candidates[0];
  if (picked === void 0) return { dispatched: false };
  let claim;
  try {
    claim = await client.call("claim_task", { workItemId: picked.id });
  } catch (error) {
    if (isRemoteError2(error, "ConflictError")) {
      return { dispatched: false, details: `lost the claim race for ${picked.externalKey}` };
    }
    throw error;
  }
  const context = await client.call(
    "get_task_context",
    { workItemId: picked.id }
  );
  const workItem = context.workItem;
  const specRel = join2(options.specFolder, workItem.specPath);
  const branch = `claim/${claim.id}`;
  const worktreesRoot = join2(repoPath, ".oahs", "worktrees");
  const evidence2 = [];
  const submit = async (kind, payload) => {
    const item = { kind, payload };
    evidence2.push(item);
    await client.call("submit_evidence", {
      workItemId: workItem.id,
      evidence: item,
      fencingToken: claim.fencingToken
    });
  };
  const base = {
    dispatched: true,
    workItemId: workItem.id,
    externalKey: workItem.externalKey,
    claimId: claim.id,
    evidence: evidence2
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
    submit
  };
  const scan = scanOldWorktrees(worktreesRoot, workItem.id, specRel);
  if (scan.adoptable !== null) {
    const { dir, head, baseline: baseline2 } = scan.adoptable;
    git(["branch", branch, head], repoPath);
    await client.call("advance_state", {
      workItemId: workItem.id,
      to: "in_progress",
      fencingToken: claim.fencingToken
    });
    if (options.failpoint === "before_report") {
      return { ...base, outcome: "crashed", details: "failpoint before_report (adopt path)" };
    }
    const outcome2 = await finishRun({
      ...finishArgs,
      workDir: dir,
      baseline: baseline2,
      agentExitCode: null
    });
    removeWorktree(dir, repoPath);
    return {
      ...base,
      outcome: outcome2 === "in_review" ? "adopted_in_review" : outcome2,
      details: `adopted finished worktree ${dir}`
    };
  }
  if (scan.wrecked.length > 0) {
    for (const dir of scan.wrecked) removeWorktree(dir, repoPath);
    await client.call("block_task", {
      workItemId: workItem.id,
      reason: "stale_worktree",
      fencingToken: claim.fencingToken
    });
    await client.call("release_claim", { claimId: claim.id, reason: "stale worktree cleaned" });
    return { ...base, outcome: "blocked", details: "stale worktree cleaned; task blocked" };
  }
  const baseline = git(["rev-parse", "HEAD"], repoPath);
  ensureGitExcludes(repoPath);
  mkdirSync(worktreesRoot, { recursive: true });
  const worktreeDir = join2(worktreesRoot, claim.id);
  git(["worktree", "add", "-b", branch, worktreeDir, baseline], repoPath);
  writeMarker(worktreeDir, {
    workItemId: workItem.id,
    claimId: claim.id,
    baseline,
    invocations: 0
  });
  const specAbs = join2(worktreeDir, specRel);
  if (existsSync2(specAbs)) {
    setFrontmatterStatus(specAbs, ENTRY_STATUS[context.entryState] ?? context.entryState);
  }
  await client.call("advance_state", {
    workItemId: workItem.id,
    to: "in_progress",
    fencingToken: claim.fencingToken
  });
  const command = options.agentCmd.replaceAll("{SPEC_FOLDER}", options.specFolder).replaceAll("{STORY_ID}", workItem.externalKey).replaceAll("{INVOKE_WITH}", workItem.invokeDevWith).replaceAll("{WORKTREE}", worktreeDir);
  writeMarker(worktreeDir, {
    workItemId: workItem.id,
    claimId: claim.id,
    baseline,
    invocations: 1
  });
  const invoked = spawnSync2("bash", ["-lc", command], {
    cwd: worktreeDir,
    encoding: "utf8",
    timeout: options.agentTimeoutMs ?? 30 * 60 * 1e3,
    killSignal: "SIGKILL",
    env: {
      ...process.env,
      ...options.agentEnv,
      OAHS_SPEC_FILE: specAbs,
      OAHS_STORY_ID: workItem.externalKey
    }
  });
  const agentExitCode = invoked.status ?? -1;
  if (options.failpoint === "before_report") {
    return {
      ...base,
      outcome: "crashed",
      details: "failpoint before_report: died after the agent ran, before reporting"
    };
  }
  const outcome = await finishRun({
    ...finishArgs,
    workDir: worktreeDir,
    baseline,
    agentExitCode
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
  process.once("SIGINT", onSigint);
  try {
    for (; ; ) {
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
    process.removeListener("SIGINT", onSigint);
  }
}
var DEFAULT_VERIFICATION_ALLOWLIST, MARKER_FILE, ENTRY_STATUS;
var init_src2 = __esm({
  "../../packages/runner/src/index.ts"() {
    "use strict";
    init_doclint();
    init_jobs();
    DEFAULT_VERIFICATION_ALLOWLIST = [
      "node",
      "npm",
      "pnpm",
      "npx",
      "pytest",
      "python3",
      "sh",
      "bash",
      "git"
    ];
    MARKER_FILE = ".oahs-work-item";
    ENTRY_STATUS = {
      ready_for_dev: "ready-for-dev",
      in_progress: "in-progress",
      in_review: "in-review"
    };
  }
});

// ../../packages/db/src/schema.ts
var schema_exports = {};
__export(schema_exports, {
  actors: () => actors,
  agentJobs: () => agentJobs,
  agentMemories: () => agentMemories,
  claims: () => claims,
  events: () => events,
  evidence: () => evidence,
  features: () => features,
  gateDecisions: () => gateDecisions,
  gatePolicies: () => gatePolicies,
  grants: () => grants,
  idempotencyKeys: () => idempotencyKeys,
  mentions: () => mentions,
  messages: () => messages,
  notifications: () => notifications,
  roleAssignments: () => roleAssignments,
  threads: () => threads,
  workItems: () => workItems,
  workspaceState: () => workspaceState
});
import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  serial,
  text,
  uniqueIndex
} from "drizzle-orm/pg-core";
var actors, grants, roleAssignments, workspaceState, gatePolicies, features, workItems, claims, gateDecisions, evidence, events, idempotencyKeys, threads, messages, mentions, notifications, agentMemories, agentJobs;
var init_schema = __esm({
  "../../packages/db/src/schema.ts"() {
    "use strict";
    actors = pgTable("actors", {
      id: text("id").primaryKey(),
      type: text("type").notNull(),
      // 'user' | 'agent' | 'system'
      displayName: text("display_name").notNull(),
      /** Phase 2 (roadmap §3): 'admin' | 'member' | 'auditor' — gated-write authority */
      governanceRole: text("governance_role").notNull().default("member"),
      /** Phase 4 (roadmap §3): BMAD playbook persona (e.g. 'bmad-agent-pm'); NULL for humans and plain agents */
      personaCode: text("persona_code")
    });
    grants = pgTable(
      "grants",
      {
        actorId: text("actor_id").notNull(),
        permission: text("permission").notNull(),
        scope: text("scope")
      },
      (t) => [primaryKey({ columns: [t.actorId, t.permission] })]
    );
    roleAssignments = pgTable("role_assignments", {
      seq: serial("seq").primaryKey(),
      actorId: text("actor_id").notNull(),
      roleCode: text("role_code").notNull(),
      grantedBy: text("granted_by").notNull(),
      revoked: boolean("revoked").notNull().default(false)
    });
    workspaceState = pgTable("workspace_state", {
      id: text("id").primaryKey(),
      // always 'workspace'
      plan: text("plan").notNull(),
      // 'free' | 'team' | 'enterprise'
      planVersion: integer("plan_version").notNull().default(1),
      policy: jsonb("policy").$type().notNull().default(sql`'{}'::jsonb`),
      policyVersion: integer("policy_version").notNull().default(1)
    });
    gatePolicies = pgTable("gate_policies", {
      gate: text("gate").primaryKey(),
      // 'spec_approval' | 'review_approval'
      policy: jsonb("policy").$type().notNull()
    });
    features = pgTable("features", {
      id: text("id").primaryKey(),
      seq: serial("seq").notNull(),
      state: text("state").notNull(),
      // 'backlog' | 'in_progress' | 'done'
      dispatchHold: boolean("dispatch_hold").notNull().default(false)
    });
    workItems = pgTable("work_items", {
      id: text("id").primaryKey(),
      /** creation order — backs first-writer-wins externalKey resolution */
      seq: serial("seq").notNull(),
      featureId: text("feature_id").notNull(),
      externalKey: text("external_key").notNull(),
      /** Phase 4 (roadmap §1.4): selects WHICH machine-evidence guards apply — never WHO passes a gate */
      kind: text("kind").notNull().default("code"),
      title: text("title").notNull(),
      state: text("state").notNull(),
      blockedReason: text("blocked_reason"),
      // overlay, not a state (D8)
      reviewLoopIteration: integer("review_loop_iteration").notNull().default(0),
      intentHash: text("intent_hash"),
      pinnedVerification: jsonb("pinned_verification").$type(),
      // Rules-layer data (D7)
      specCheckpoint: boolean("spec_checkpoint").notNull().default(false),
      doneCheckpoint: boolean("done_checkpoint").notNull().default(false),
      invokeDevWith: text("invoke_dev_with").notNull().default(""),
      specPath: text("spec_path").notNull(),
      /** optimistic concurrency: CAS by UPDATE ... WHERE state_version = expected */
      stateVersion: integer("state_version").notNull().default(0),
      /** dependency externalKeys within the same feature */
      dependsOn: jsonb("depends_on").$type().notNull().default(sql`'[]'::jsonb`),
      /** monotonic fencing counter per work item (roadmap §1.3) */
      lastFencingToken: integer("last_fencing_token").notNull().default(0)
    });
    claims = pgTable(
      "claims",
      {
        id: text("id").primaryKey(),
        seq: serial("seq").notNull(),
        workItemId: text("work_item_id").notNull(),
        actorId: text("actor_id").notNull(),
        fencingToken: integer("fencing_token").notNull(),
        /** engine-clock milliseconds (JS field `now`), never SQL now() */
        leaseExpiresAt: bigint("lease_expires_at", { mode: "number" }).notNull(),
        released: boolean("released").notNull().default(false),
        ttlMs: bigint("ttl_ms", { mode: "number" }).notNull()
      },
      (t) => [
        // roadmap §1.3: "One live claim per work item, enforced by a partial
        // unique index — races lose by constraint, not by application logic."
        uniqueIndex("claims_one_live_per_item").on(t.workItemId).where(sql`released = false`)
      ]
    );
    gateDecisions = pgTable("gate_decisions", {
      seq: serial("seq").primaryKey(),
      workItemId: text("work_item_id").notNull(),
      gate: text("gate").notNull(),
      // 'spec_approval' | 'review_approval'
      decision: text("decision").notNull(),
      // 'approved' | 'rejected'
      actorId: text("actor_id").notNull(),
      /** review round the decision belongs to (= review_loop_iteration at decision time) */
      round: integer("round").notNull().default(0)
    });
    evidence = pgTable("evidence", {
      seq: serial("seq").primaryKey(),
      workItemId: text("work_item_id").notNull(),
      kind: text("kind").notNull(),
      payload: jsonb("payload").$type().notNull()
    });
    events = pgTable(
      "events",
      {
        globalSeq: serial("global_seq").primaryKey(),
        streamType: text("stream_type").notNull(),
        // 'workspace'|'feature'|'work_item'|'actor'
        streamId: text("stream_id").notNull(),
        streamSeq: integer("stream_seq").notNull(),
        type: text("type").notNull(),
        actorId: text("actor_id").notNull(),
        payload: jsonb("payload").$type().notNull(),
        causationId: text("causation_id"),
        idempotencyKey: text("idempotency_key")
      },
      (t) => [
        // §1.5: "UNIQUE(stream_id, stream_seq) doubles as the optimistic lock."
        uniqueIndex("events_stream_id_stream_seq").on(t.streamId, t.streamSeq)
      ]
    );
    idempotencyKeys = pgTable("idempotency_keys", {
      key: text("key").primaryKey(),
      result: jsonb("result").$type().notNull()
    });
    threads = pgTable("threads", {
      id: text("id").primaryKey(),
      seq: serial("seq").notNull(),
      featureId: text("feature_id"),
      workItemId: text("work_item_id"),
      kind: text("kind").notNull(),
      // 'spec' | 'design' | 'task' | 'general' | 'private'
      visibility: text("visibility").notNull(),
      // 'open' | 'private'
      createdBy: text("created_by").notNull(),
      participants: jsonb("participants").$type().notNull().default(sql`'[]'::jsonb`)
    });
    messages = pgTable(
      "messages",
      {
        id: text("id").primaryKey(),
        threadId: text("thread_id").notNull(),
        seq: integer("seq").notNull(),
        // per-thread, 1-based, gap-free
        authorId: text("author_id").notNull(),
        kind: text("kind").notNull(),
        // 'chat' | 'system'
        body: text("body").notNull(),
        replyTo: text("reply_to")
      },
      (t) => [uniqueIndex("messages_thread_id_seq").on(t.threadId, t.seq)]
    );
    mentions = pgTable("mentions", {
      seq: serial("seq").primaryKey(),
      messageId: text("message_id").notNull(),
      mentionedActorId: text("mentioned_actor_id").notNull(),
      resolution: text("resolution").notNull()
      // 'notified'|'job_created'|'denied_policy'|'denied_depth'
    });
    notifications = pgTable("notifications", {
      id: text("id").primaryKey(),
      seq: serial("seq").notNull(),
      actorId: text("actor_id").notNull(),
      source: text("source").notNull(),
      // 'mention' | 'job_completed'
      refId: text("ref_id").notNull(),
      // messageId for mentions, jobId for completions
      read: boolean("read").notNull().default(false)
    });
    agentMemories = pgTable(
      "agent_memories",
      {
        id: text("id").primaryKey(),
        agentActorId: text("agent_actor_id").notNull(),
        kind: text("kind").notNull(),
        // 'episodic' | 'procedural' | 'entity'
        content: text("content").notNull(),
        sourceThreadId: text("source_thread_id"),
        sourceVisibility: text("source_visibility"),
        // 'open' | 'private' | NULL
        seq: integer("seq").notNull()
      },
      (t) => [uniqueIndex("agent_memories_agent_actor_id_seq").on(t.agentActorId, t.seq)]
    );
    agentJobs = pgTable("agent_jobs", {
      id: text("id").primaryKey(),
      seq: serial("seq").notNull(),
      agentActorId: text("agent_actor_id").notNull(),
      threadId: text("thread_id").notNull(),
      messageId: text("message_id").notNull(),
      workItemId: text("work_item_id"),
      featureId: text("feature_id"),
      status: text("status").notNull(),
      // 'queued' | 'done' | 'blocked'
      depth: integer("depth").notNull().default(0),
      note: text("note")
    });
  }
});

// ../../packages/db/src/pg-engine.ts
import { and, asc, eq, gt, lte, sql as sql2 } from "drizzle-orm";
function isUniqueViolation(error) {
  let current = error;
  for (let depth = 0; depth < 5 && current !== null && typeof current === "object"; depth += 1) {
    const err = current;
    if (err.code === "23505") return true;
    if (typeof err.message === "string" && /duplicate key value violates unique/i.test(err.message)) {
      return true;
    }
    current = err.cause;
  }
  return false;
}
var WORKSPACE_ID, RANK2, TRANSITIONS2, LEGACY_STATUS2, PgEngine;
var init_pg_engine = __esm({
  "../../packages/db/src/pg-engine.ts"() {
    "use strict";
    init_src();
    init_schema();
    WORKSPACE_ID = "workspace";
    RANK2 = Object.fromEntries(
      WORK_ITEM_STATES.map((s, i) => [s, i])
    );
    TRANSITIONS2 = [
      { from: "backlog", to: "draft", permission: "task.plan", claimRequired: false, guards: [] },
      {
        from: "draft",
        to: "ready_for_dev",
        permission: "task.plan",
        claimRequired: false,
        guards: ["spec_gate_if_checkpoint"]
      },
      {
        from: "ready_for_dev",
        to: "in_progress",
        permission: "task.advance",
        claimRequired: true,
        guards: ["deps_done"]
      },
      {
        from: "in_progress",
        to: "in_review",
        permission: "task.advance",
        claimRequired: true,
        guards: ["nonempty_diff"]
      }
    ];
    LEGACY_STATUS2 = {
      backlog: "backlog",
      draft: "draft",
      "ready-for-dev": "ready_for_dev",
      ready_for_dev: "ready_for_dev",
      "in-progress": "in_progress",
      in_progress: "in_progress",
      "in-review": "in_review",
      in_review: "in_review",
      review: "in_review",
      done: "done"
    };
    PgEngine = class {
      constructor(db) {
        this.db = db;
      }
      /** Engine clock in ms — the ONLY time source for lease logic. */
      now = 0;
      seq = 0;
      systemActorId = "";
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
        await this.db.insert(workspaceState).values({ id: WORKSPACE_ID, plan: DEFAULT_PLAN, planVersion: 1, policy: {}, policyVersion: 1 }).onConflictDoNothing();
        const existing = await this.db.select({ id: actors.id }).from(actors).where(eq(actors.type, "system")).limit(1);
        const found = existing[0];
        if (found !== void 0) {
          this.systemActorId = found.id;
          this.seq = await this.recoverSeq();
          return;
        }
        this.systemActorId = this.nextId("actor-system");
        await this.db.insert(actors).values({
          id: this.systemActorId,
          type: "system",
          displayName: "system"
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
        ids.push(...(await this.db.select({ id: threads.id }).from(threads)).map((r) => r.id));
        ids.push(...(await this.db.select({ id: messages.id }).from(messages)).map((r) => r.id));
        ids.push(...(await this.db.select({ id: agentJobs.id }).from(agentJobs)).map((r) => r.id));
        ids.push(...(await this.db.select({ id: notifications.id }).from(notifications)).map((r) => r.id));
        ids.push(...(await this.db.select({ id: agentMemories.id }).from(agentMemories)).map((r) => r.id));
        let max = 0;
        for (const id of ids) {
          const sep = id.lastIndexOf("_");
          if (sep < 0) continue;
          const n = Number.parseInt(id.slice(sep + 1), 36);
          if (Number.isFinite(n) && n > max) max = n;
        }
        return max;
      }
      // -- infrastructure --------------------------------------------------------
      nextId(prefix) {
        this.seq += 1;
        return `${prefix}_${this.seq.toString(36).padStart(6, "0")}`;
      }
      async appendTx(tx, streamType, streamId, type, actorId, payload, extra) {
        const [row] = await tx.select({ maxSeq: sql2`coalesce(max(${events.streamSeq}), 0)` }).from(events).where(eq(events.streamId, streamId));
        const streamSeq = Number(row?.maxSeq ?? 0) + 1;
        const inserted = await tx.insert(events).values({
          streamType,
          streamId,
          streamSeq,
          type,
          actorId,
          payload,
          causationId: extra?.causationId ?? null,
          idempotencyKey: extra?.idempotencyKey ?? null
        }).returning({ globalSeq: events.globalSeq });
        const globalSeq = inserted[0]?.globalSeq;
        if (globalSeq === void 0) throw new Error("event insert returned no global_seq");
        return {
          globalSeq,
          streamType,
          streamId,
          streamSeq,
          type,
          actorId,
          payload,
          ...extra?.causationId !== void 0 ? { causationId: extra.causationId } : {}
        };
      }
      async mustGetItem(workItemId2) {
        const byId = await this.db.select().from(workItems).where(eq(workItems.id, workItemId2)).limit(1);
        if (byId[0]) return byId[0];
        const byKey = await this.db.select().from(workItems).where(eq(workItems.externalKey, workItemId2)).orderBy(asc(workItems.seq)).limit(1);
        if (byKey[0]) return byKey[0];
        throw new GuardFailedError(`unknown work item: ${workItemId2}`);
      }
      async getFeatureRow(featureId, tx = this.db) {
        const rows = await tx.select().from(features).where(eq(features.id, featureId)).limit(1);
        return rows[0] ?? null;
      }
      async getActorRow(actorId, tx = this.db) {
        const rows = await tx.select().from(actors).where(eq(actors.id, actorId)).limit(1);
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
        const direct = await this.db.select({ permission: grants.permission }).from(grants).where(and(eq(grants.actorId, actorId), eq(grants.permission, permission))).limit(1);
        if (direct.length > 0) return "direct";
        const assignments = await this.db.select().from(roleAssignments).where(and(eq(roleAssignments.actorId, actorId), eq(roleAssignments.revoked, false))).orderBy(asc(roleAssignments.seq));
        for (const assignment of assignments) {
          if ((DELIVERY_ROLES[assignment.roleCode] ?? []).includes(permission)) {
            return `role:${assignment.roleCode}`;
          }
        }
        return null;
      }
      agentCeilingAllows(actor, permission, workspace) {
        if (!actor || actor.type !== "agent") return { plan: true, policy: true };
        const ceiling = PLAN_CEILINGS[workspace.plan];
        const policy = workspace.policy;
        if (AGENT_GATE_APPROVE_PERMISSIONS.includes(permission)) {
          return { plan: ceiling.agentGateApprove, policy: policy.agentGateApprovals !== false };
        }
        if (permission === "gate.review.reject") {
          return { plan: ceiling.agentGateReject, policy: true };
        }
        if (permission === "task.claim") {
          return { plan: true, policy: policy.agentSelfDispatch !== false };
        }
        return { plan: true, policy: true };
      }
      async hasPermission(actorId, permission) {
        if (await this.grantSource(actorId, permission) === null) return false;
        const allows = this.agentCeilingAllows(await this.getActorRow(actorId), permission, await this.workspaceRow());
        return allows.plan && allows.policy;
      }
      async requirePermission(actorId, permission) {
        if (!await this.hasPermission(actorId, permission)) {
          throw new PermissionDeniedError(permission, actorId);
        }
      }
      async requireGovernanceAdmin(byActorId) {
        if (byActorId === this.systemActorId) return;
        const actor = await this.getActorRow(byActorId);
        if (actor?.governanceRole === "admin") return;
        throw new PermissionDeniedError("governance.admin", byActorId);
      }
      /** Grant-time plan ceiling: refuse issuing agent gate permissions the plan forbids. */
      async checkGrantCeiling(actorId, permission) {
        const actor = await this.getActorRow(actorId);
        if (!actor || actor.type !== "agent") return;
        const workspace = await this.workspaceRow();
        const ceiling = PLAN_CEILINGS[workspace.plan];
        if (AGENT_GATE_APPROVE_PERMISSIONS.includes(permission) && !ceiling.agentGateApprove) {
          throw new GuardFailedError(`plan ${workspace.plan} does not allow agents to hold ${permission}`);
        }
        if (permission === "gate.review.reject" && !ceiling.agentGateReject) {
          throw new GuardFailedError(`plan ${workspace.plan} does not allow agents to hold ${permission}`);
        }
      }
      async liveClaim(workItemId2) {
        const rows = await this.db.select().from(claims).where(
          and(
            eq(claims.workItemId, workItemId2),
            eq(claims.released, false),
            gt(claims.leaseExpiresAt, this.now)
          )
        ).orderBy(asc(claims.seq)).limit(1);
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
            await this.appendTx(tx, "work_item", item.id, "fencing.rejected", actorId, {
              presentedToken: fencingToken2,
              liveToken: live?.fencingToken ?? null
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
          kind: row.kind,
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
          stateVersion: row.stateVersion
        };
      }
      publicFeature(row) {
        return {
          id: row.id,
          state: row.state,
          dispatchHold: row.dispatchHold
        };
      }
      publicClaim(row) {
        return {
          id: row.id,
          workItemId: row.workItemId,
          actorId: row.actorId,
          fencingToken: row.fencingToken,
          leaseExpiresAt: row.leaseExpiresAt,
          released: row.released
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
          ...row.causationId !== null ? { causationId: row.causationId } : {}
        };
      }
      // -- setup -----------------------------------------------------------------
      async createActor(input) {
        const actor = {
          id: this.nextId("actor"),
          type: input.type,
          displayName: input.displayName,
          personaCode: input.personaCode ?? null
        };
        await this.db.insert(actors).values({
          id: actor.id,
          type: actor.type,
          displayName: actor.displayName,
          governanceRole: input.governanceRole ?? "member",
          personaCode: actor.personaCode
        });
        return actor;
      }
      publicActor(row) {
        return {
          id: row.id,
          type: row.type,
          displayName: row.displayName,
          personaCode: row.personaCode ?? null
        };
      }
      /** All actors, personas and system included (transparency for pickers/audit). */
      async listActors() {
        const rows = await this.db.select().from(actors).orderBy(asc(actors.id));
        return rows.map((row) => this.publicActor(row));
      }
      /**
       * Idempotently create the six BMAD persona agent actors with floor-state
       * roles (Phase 4, roadmap §3). Gated write. Idempotency is DURABLE: the
       * lookup keys on the persisted persona_code column, so a restart over an
       * existing data directory re-provisions nothing.
       */
      async provisionPersonas(input) {
        await this.requireGovernanceAdmin(input.byActorId);
        const provisioned = [];
        for (const persona of PERSONAS) {
          const existing = await this.db.select().from(actors).where(eq(actors.personaCode, persona.personaCode)).orderBy(asc(actors.id)).limit(1);
          let actor;
          if (existing[0]) {
            actor = this.publicActor(existing[0]);
          } else {
            actor = await this.createActor({
              type: "agent",
              displayName: persona.displayName,
              personaCode: persona.personaCode
            });
            await this.db.transaction(async (tx) => {
              await this.appendTx(tx, "actor", actor.id, "actor.provisioned", input.byActorId, {
                personaCode: persona.personaCode
              });
            });
          }
          await this.assignRole({ actorId: actor.id, roleCode: persona.defaultRole, byActorId: input.byActorId });
          provisioned.push({ ...actor });
        }
        return provisioned;
      }
      async grant(input) {
        await this.checkGrantCeiling(input.actorId, input.permission);
        await this.db.transaction(async (tx) => {
          await tx.insert(grants).values({ actorId: input.actorId, permission: input.permission, scope: input.scope ?? null }).onConflictDoNothing();
          await this.appendTx(tx, "actor", input.actorId, "grant.issued", this.systemActorId, {
            permission: input.permission
          });
        });
      }
      async revoke(input) {
        await this.db.transaction(async (tx) => {
          await tx.delete(grants).where(and(eq(grants.actorId, input.actorId), eq(grants.permission, input.permission)));
          await this.appendTx(tx, "actor", input.actorId, "grant.revoked", this.systemActorId, {
            permission: input.permission
          });
        });
      }
      // -- entitlements (Phase 2, roadmap §3) ----------------------------------------
      async setGovernanceRole(input) {
        await this.requireGovernanceAdmin(input.byActorId);
        if (await this.getActorRow(input.actorId) === null) {
          throw new GuardFailedError(`unknown actor: ${input.actorId}`);
        }
        await this.db.transaction(async (tx) => {
          await tx.update(actors).set({ governanceRole: input.role }).where(eq(actors.id, input.actorId));
          await this.appendTx(tx, "actor", input.actorId, "governance.changed", input.byActorId, { role: input.role });
        });
      }
      async getGovernanceRole(actorId) {
        const actor = await this.getActorRow(actorId);
        return actor?.governanceRole ?? "member";
      }
      async assignRole(input) {
        await this.requireGovernanceAdmin(input.byActorId);
        const bundle = DELIVERY_ROLES[input.roleCode];
        if (bundle === void 0) throw new GuardFailedError(`unknown delivery role: ${input.roleCode}`);
        if (await this.getActorRow(input.actorId) === null) {
          throw new GuardFailedError(`unknown actor: ${input.actorId}`);
        }
        for (const permission of bundle) {
          await this.checkGrantCeiling(input.actorId, permission);
        }
        const active = await this.db.select({ seq: roleAssignments.seq }).from(roleAssignments).where(
          and(
            eq(roleAssignments.actorId, input.actorId),
            eq(roleAssignments.roleCode, input.roleCode),
            eq(roleAssignments.revoked, false)
          )
        ).limit(1);
        if (active.length > 0) return;
        await this.db.transaction(async (tx) => {
          await tx.insert(roleAssignments).values({
            actorId: input.actorId,
            roleCode: input.roleCode,
            grantedBy: input.byActorId,
            revoked: false
          });
          await this.appendTx(tx, "actor", input.actorId, "role.assigned", input.byActorId, {
            roleCode: input.roleCode
          });
        });
      }
      async revokeRole(input) {
        await this.requireGovernanceAdmin(input.byActorId);
        if (DELIVERY_ROLES[input.roleCode] === void 0) {
          throw new GuardFailedError(`unknown delivery role: ${input.roleCode}`);
        }
        await this.db.transaction(async (tx) => {
          await tx.update(roleAssignments).set({ revoked: true }).where(
            and(
              eq(roleAssignments.actorId, input.actorId),
              eq(roleAssignments.roleCode, input.roleCode),
              eq(roleAssignments.revoked, false)
            )
          );
          await this.appendTx(tx, "actor", input.actorId, "role.revoked", input.byActorId, {
            roleCode: input.roleCode
          });
        });
      }
      async listRoleAssignments(actorId) {
        const rows = actorId === void 0 ? await this.db.select().from(roleAssignments).orderBy(asc(roleAssignments.seq)) : await this.db.select().from(roleAssignments).where(eq(roleAssignments.actorId, actorId)).orderBy(asc(roleAssignments.seq));
        return rows.map((row) => ({
          actorId: row.actorId,
          roleCode: row.roleCode,
          grantedBy: row.grantedBy,
          revoked: row.revoked
        }));
      }
      async setPlan(input) {
        await this.requireGovernanceAdmin(input.byActorId);
        if (PLAN_CEILINGS[input.plan] === void 0) throw new GuardFailedError(`unknown plan: ${input.plan}`);
        const workspace = await this.workspaceRow();
        const planVersion = workspace.planVersion + 1;
        await this.db.transaction(async (tx) => {
          await tx.update(workspaceState).set({ plan: input.plan, planVersion }).where(eq(workspaceState.id, WORKSPACE_ID));
          await this.appendTx(tx, "workspace", WORKSPACE_ID, "plan.changed", input.byActorId, {
            plan: input.plan,
            planVersion
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
          await this.appendTx(tx, "workspace", WORKSPACE_ID, "policy.changed", input.byActorId, {
            policy: { ...merged },
            policyVersion
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
          throw new GuardFailedError("minApprovals must be a positive integer");
        }
        await this.db.transaction(async (tx) => {
          await tx.insert(gatePolicies).values({ gate: input.gate, policy: { ...input.policy } }).onConflictDoUpdate({
            target: gatePolicies.gate,
            set: { policy: { ...input.policy } }
          });
          await this.appendTx(tx, "workspace", WORKSPACE_ID, "gate_policy.changed", input.byActorId, {
            gate: input.gate,
            policy: { ...input.policy }
          });
        });
      }
      async getGatePolicy(gate) {
        const rows = await this.db.select().from(gatePolicies).where(eq(gatePolicies.gate, gate)).limit(1);
        return { ...rows[0]?.policy ?? {} };
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
          governanceRole: actor?.governanceRole ?? "member",
          plan: workspace.plan,
          planAllows: allows.plan,
          policyAllows: allows.policy,
          versions: { plan: workspace.planVersion, policy: workspace.policyVersion }
        };
      }
      async createFeature(input) {
        const id = this.nextId("feat");
        return this.db.transaction(async (tx) => {
          await tx.insert(features).values({ id, state: "backlog", dispatchHold: false });
          await this.appendTx(tx, "feature", id, "feature.created", input.actorId, {});
          return { id, state: "backlog", dispatchHold: false };
        });
      }
      async createWorkItemTx(tx, input) {
        const slug = input.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
        const row = {
          id: this.nextId("wi"),
          seq: 0,
          // assigned by the serial; placeholder for the local copy only
          featureId: input.featureId,
          externalKey: input.externalKey,
          kind: input.kind ?? "code",
          title: input.title,
          state: "backlog",
          blockedReason: null,
          reviewLoopIteration: 0,
          intentHash: null,
          pinnedVerification: null,
          specCheckpoint: input.specCheckpoint ?? false,
          doneCheckpoint: input.doneCheckpoint ?? false,
          invokeDevWith: input.invokeDevWith ?? "",
          specPath: `stories/${input.externalKey}-${slug}.md`,
          stateVersion: 0,
          dependsOn: input.dependsOn ? [...input.dependsOn] : [],
          lastFencingToken: 0
        };
        await tx.insert(workItems).values({
          id: row.id,
          featureId: row.featureId,
          externalKey: row.externalKey,
          kind: row.kind,
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
          lastFencingToken: row.lastFencingToken
        });
        await this.appendTx(tx, "work_item", row.id, "work_item.created", input.actorId, {
          externalKey: row.externalKey,
          featureId: row.featureId
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
            const existing = (await tx.select().from(workItems).where(and(eq(workItems.featureId, input.featureId), eq(workItems.externalKey, entry.id))).orderBy(asc(workItems.seq)).limit(1))[0];
            if (existing) {
              await tx.update(workItems).set({
                title: entry.title,
                specCheckpoint: entry.specCheckpoint,
                doneCheckpoint: entry.doneCheckpoint,
                invokeDevWith: entry.invokeDevWith
              }).where(eq(workItems.id, existing.id));
              await this.appendTx(tx, "work_item", existing.id, "work_item.reimported", input.actorId, {
                externalKey: entry.id
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
                actorId: input.actorId
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
        await this.requirePermission(input.actorId, "task.claim");
        const ttlMs = input.ttlMs ?? 15 * 60 * 1e3;
        const claimId = this.nextId("claim");
        try {
          return await this.db.transaction(async (tx) => {
            await tx.update(claims).set({ released: true }).where(
              and(
                eq(claims.workItemId, item.id),
                eq(claims.released, false),
                lte(claims.leaseExpiresAt, this.now)
              )
            );
            const counterRow = (await tx.select({ lastFencingToken: workItems.lastFencingToken }).from(workItems).where(eq(workItems.id, item.id)).limit(1))[0];
            const token = (counterRow?.lastFencingToken ?? 0) + 1;
            await tx.update(workItems).set({ lastFencingToken: token }).where(eq(workItems.id, item.id));
            await tx.insert(claims).values({
              id: claimId,
              workItemId: item.id,
              actorId: input.actorId,
              fencingToken: token,
              leaseExpiresAt: this.now + ttlMs,
              released: false,
              ttlMs
            });
            await this.appendTx(tx, "work_item", item.id, "work_item.claimed", input.actorId, {
              claimId,
              fencingToken: token
            });
            return {
              id: claimId,
              workItemId: item.id,
              actorId: input.actorId,
              fencingToken: token,
              leaseExpiresAt: this.now + ttlMs,
              released: false
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
        await this.db.update(claims).set({ leaseExpiresAt: this.now + row.ttlMs }).where(eq(claims.id, row.id));
      }
      async releaseClaim(input) {
        const row = (await this.db.select().from(claims).where(eq(claims.id, input.claimId)).limit(1))[0];
        if (!row || row.released) return;
        await this.db.transaction(async (tx) => {
          await tx.update(claims).set({ released: true }).where(eq(claims.id, row.id));
          await this.appendTx(tx, "work_item", row.workItemId, "claim.released", row.actorId, {
            claimId: row.id,
            reason: input.reason ?? null
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
          if (RANK2[input.to] < RANK2[item.state] && await this.hasPermission(input.actorId, "state.downgrade")) {
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
          throw new GuardFailedError("claim fencing token required for this transition");
        }
        for (const guard of rule.guards) {
          await this.checkGuard(guard, item);
        }
        return this.db.transaction(
          async (tx) => this.executeTransitionTx(tx, item, input.to, input.actorId, input.idempotencyKey)
        );
      }
      async checkGuard(guard, item) {
        switch (guard) {
          case "deps_done": {
            for (const depKey of item.dependsOn) {
              const dep = (await this.db.select().from(workItems).where(and(eq(workItems.featureId, item.featureId), eq(workItems.externalKey, depKey))).orderBy(asc(workItems.seq)).limit(1))[0];
              if (dep && dep.state !== "done") {
                throw new GuardFailedError(`dependency ${depKey} is not done`);
              }
            }
            return;
          }
          case "spec_gate_if_checkpoint": {
            if (!item.specCheckpoint) return;
            const approved = (await this.db.select({ seq: gateDecisions.seq }).from(gateDecisions).where(
              and(
                eq(gateDecisions.workItemId, item.id),
                eq(gateDecisions.gate, "spec_approval"),
                eq(gateDecisions.decision, "approved")
              )
            ).limit(1))[0];
            if (!approved) {
              throw new GuardFailedError("spec_checkpoint requires an approved spec_approval gate decision");
            }
            return;
          }
          case "nonempty_diff": {
            if (item.kind !== "code") {
              const lints = await this.db.select().from(evidence).where(and(eq(evidence.workItemId, item.id), eq(evidence.kind, "doc_lint"))).orderBy(asc(evidence.seq));
              const latestLint = lints[lints.length - 1];
              if (latestLint && latestLint.payload["schemaValid"] !== true) {
                throw new GuardFailedError("the latest doc_lint evidence failed \u2014 document is not schema-valid");
              }
              return;
            }
            const rows = await this.db.select().from(evidence).where(and(eq(evidence.workItemId, item.id), eq(evidence.kind, "git_diff"))).orderBy(asc(evidence.seq));
            const latest = rows[rows.length - 1];
            if (latest && latest.payload["nonEmpty"] !== true) {
              throw new GuardFailedError("the latest git_diff evidence is empty \u2014 nothing to review");
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
          const updated = await tx.update(workItems).set({ state: input.to, stateVersion: item.stateVersion + 1 }).where(and(eq(workItems.id, item.id), eq(workItems.stateVersion, item.stateVersion))).returning({ id: workItems.id });
          if (updated.length === 0) {
            throw new ConflictError(`state_version conflict on work item ${item.id}`);
          }
          await this.appendTx(
            tx,
            "work_item",
            item.id,
            "work_item.state_downgraded",
            input.actorId,
            { from, to: input.to, compensating: true },
            input.idempotencyKey !== void 0 ? { idempotencyKey: input.idempotencyKey } : void 0
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
        const updated = await tx.update(workItems).set({ state: to, stateVersion: item.stateVersion + 1 }).where(and(eq(workItems.id, item.id), eq(workItems.stateVersion, item.stateVersion))).returning({ id: workItems.id });
        if (updated.length === 0) {
          throw new ConflictError(`state_version conflict on work item ${item.id}`);
        }
        const event = await this.appendTx(
          tx,
          "work_item",
          item.id,
          "work_item.state_changed",
          actorId,
          { from, to },
          {
            ...causationId !== void 0 ? { causationId } : {},
            ...idempotencyKey !== void 0 ? { idempotencyKey } : {}
          }
        );
        if (from === "backlog" && to !== "backlog") {
          const feature = await this.getFeatureRow(item.featureId, tx);
          if (feature && feature.state === "backlog") {
            await tx.update(features).set({ state: "in_progress" }).where(eq(features.id, feature.id));
            await this.appendTx(
              tx,
              "feature",
              feature.id,
              "feature.state_changed",
              this.systemActorId,
              { from: "backlog", to: "in_progress" },
              { causationId: String(event.globalSeq) }
            );
          }
        }
        if (to === "done" && item.doneCheckpoint) {
          const feature = await this.getFeatureRow(item.featureId, tx);
          if (feature && !feature.dispatchHold) {
            await tx.update(features).set({ dispatchHold: true }).where(eq(features.id, feature.id));
            await this.appendTx(
              tx,
              "feature",
              feature.id,
              "feature.dispatch_hold_raised",
              this.systemActorId,
              { workItemId: item.id },
              { causationId: String(event.globalSeq) }
            );
          }
        }
        await this.narrateWorkItemTx(tx, item.id, `state: ${from} \u2192 ${to}`);
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
        await this.requirePermission(input.actorId, "task.block");
        return this.db.transaction(async (tx) => {
          await tx.update(workItems).set({ blockedReason: input.reason, stateVersion: item.stateVersion + 1 }).where(eq(workItems.id, item.id));
          await this.appendTx(tx, "work_item", item.id, "work_item.blocked", input.actorId, {
            reason: input.reason
          });
          return this.publicItem({ ...item, blockedReason: input.reason, stateVersion: item.stateVersion + 1 });
        });
      }
      async unblockTask(input) {
        const item = await this.mustGetItem(input.workItemId);
        if (item.blockedReason === "review_non_convergence") {
          await this.requirePermission(input.actorId, "gate.review.approve");
        } else {
          await this.requirePermission(input.actorId, "task.block");
        }
        return this.db.transaction(async (tx) => {
          await tx.update(workItems).set({ blockedReason: null, stateVersion: item.stateVersion + 1 }).where(eq(workItems.id, item.id));
          await this.appendTx(tx, "work_item", item.id, "work_item.unblocked", input.actorId, {});
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
            payload: input.evidence.payload
          });
          await this.appendTx(tx, "work_item", item.id, "evidence.submitted", input.actorId, {
            kind: input.evidence.kind
          });
        });
      }
      async approveGate(input) {
        const item = await this.mustGetItem(input.workItemId);
        if (input.gate === "spec_approval") {
          await this.requirePermission(input.actorId, "gate.spec.approve");
          if (item.blockedReason !== null) {
            throw new GuardFailedError(`work item is blocked: ${item.blockedReason}`);
          }
          if (item.state !== "draft") {
            throw new GuardFailedError(`spec_approval applies to draft items, not ${item.state}`);
          }
          const quorumMet2 = await this.quorumWouldBeMet(item, "spec_approval", input.actorId);
          return this.db.transaction(async (tx) => {
            let pinned = item.pinnedVerification;
            if (input.pinnedVerification !== void 0) {
              pinned = [...input.pinnedVerification];
              await tx.update(workItems).set({ pinnedVerification: pinned }).where(eq(workItems.id, item.id));
            }
            const pinnedItem = { ...item, pinnedVerification: pinned };
            await this.recordApprovalTx(tx, pinnedItem, "spec_approval", input.actorId);
            if (!quorumMet2) {
              return this.publicItem(pinnedItem);
            }
            return this.executeTransitionTx(tx, pinnedItem, "ready_for_dev", input.actorId);
          });
        }
        await this.requirePermission(input.actorId, "gate.review.approve");
        if (item.blockedReason !== null) {
          throw new GuardFailedError(`work item is blocked: ${item.blockedReason}`);
        }
        if (item.state !== "in_review") {
          throw new GuardFailedError(`review_approval applies to in_review items, not ${item.state}`);
        }
        const quorumMet = await this.quorumWouldBeMet(item, "review_approval", input.actorId);
        if (quorumMet) await this.checkReviewEvidence(item);
        return this.db.transaction(async (tx) => {
          await this.recordApprovalTx(tx, item, "review_approval", input.actorId);
          if (!quorumMet) {
            return this.publicItem(item);
          }
          return this.executeTransitionTx(tx, item, "done", input.actorId);
        });
      }
      /** Distinct approvers of this round (round = reviewLoopIteration at decision time). */
      async roundApprovers(item, gate) {
        const rows = await this.db.select({ actorId: gateDecisions.actorId }).from(gateDecisions).where(
          and(
            eq(gateDecisions.workItemId, item.id),
            eq(gateDecisions.gate, gate),
            eq(gateDecisions.decision, "approved"),
            eq(gateDecisions.round, item.reviewLoopIteration)
          )
        ).orderBy(asc(gateDecisions.seq));
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
          decision: "approved",
          actorId,
          round: item.reviewLoopIteration
        });
        await this.appendTx(tx, "work_item", item.id, "gate.approved", actorId, {
          gate,
          round: item.reviewLoopIteration,
          ...gate === "spec_approval" ? { pinnedVerification: item.pinnedVerification } : {}
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
          const runs = rows.filter((row) => row.kind === "test_run" && row.payload["command"] === command);
          const latest = runs[runs.length - 1];
          if (!latest || latest.payload["exitCode"] !== 0) {
            throw new GuardFailedError(`pinned verification did not pass: ${command}`);
          }
        }
        if (item.kind === "code") {
          const commitOk = rows.some((row) => row.kind === "commit" && row.payload["reachableOnRemote"] === true);
          if (!commitOk) {
            throw new GuardFailedError(
              "final revision must be reachable on the remote (push is part of the HALT contract)"
            );
          }
        }
      }
      async rejectGate(input) {
        const item = await this.mustGetItem(input.workItemId);
        if (input.gate !== "review_approval") {
          throw new GuardFailedError("only review_approval rejection is defined in Phase 1");
        }
        if (!await this.hasPermission(input.actorId, "gate.review.approve") && !await this.hasPermission(input.actorId, "gate.review.reject")) {
          throw new PermissionDeniedError("gate.review.reject", input.actorId);
        }
        if (item.state !== "in_review") {
          throw new GuardFailedError(`review rejection applies to in_review items, not ${item.state}`);
        }
        return this.db.transaction(async (tx) => {
          await tx.insert(gateDecisions).values({
            workItemId: item.id,
            gate: "review_approval",
            decision: "rejected",
            actorId: input.actorId,
            round: item.reviewLoopIteration
          });
          const decisionEvent = await this.appendTx(tx, "work_item", item.id, "gate.rejected", input.actorId, {
            gate: "review_approval"
          });
          if (item.reviewLoopIteration >= REVIEW_LOOP_LIMIT) {
            await tx.update(workItems).set({ blockedReason: "review_non_convergence", stateVersion: item.stateVersion + 1 }).where(eq(workItems.id, item.id));
            await this.appendTx(
              tx,
              "work_item",
              item.id,
              "work_item.blocked",
              this.systemActorId,
              { reason: "review_non_convergence" },
              { causationId: String(decisionEvent.globalSeq) }
            );
            return this.publicItem({
              ...item,
              blockedReason: "review_non_convergence",
              stateVersion: item.stateVersion + 1
            });
          }
          await tx.update(workItems).set({ reviewLoopIteration: item.reviewLoopIteration + 1 }).where(eq(workItems.id, item.id));
          const bumped = { ...item, reviewLoopIteration: item.reviewLoopIteration + 1 };
          return this.executeTransitionTx(
            tx,
            bumped,
            "in_progress",
            this.systemActorId,
            void 0,
            String(decisionEvent.globalSeq)
          );
        });
      }
      // -- collaboration (Phase 3, roadmap §5) ---------------------------------------
      async mustGetThread(threadId, tx = this.db) {
        const rows = await tx.select().from(threads).where(eq(threads.id, threadId)).limit(1);
        const row = rows[0];
        if (!row) throw new GuardFailedError(`unknown thread: ${threadId}`);
        return row;
      }
      isParticipant(thread, actorId) {
        return thread.createdBy === actorId || thread.participants.includes(actorId);
      }
      publicThread(row) {
        return {
          id: row.id,
          featureId: row.featureId,
          workItemId: row.workItemId,
          kind: row.kind,
          visibility: row.visibility,
          createdBy: row.createdBy,
          participants: [...row.participants]
        };
      }
      publicMessage(row) {
        return {
          id: row.id,
          threadId: row.threadId,
          seq: row.seq,
          authorId: row.authorId,
          kind: row.kind,
          body: row.body,
          replyTo: row.replyTo
        };
      }
      publicJob(row) {
        return {
          id: row.id,
          agentActorId: row.agentActorId,
          threadId: row.threadId,
          messageId: row.messageId,
          workItemId: row.workItemId,
          featureId: row.featureId,
          status: row.status,
          depth: row.depth,
          note: row.note
        };
      }
      async createThread(input) {
        if (input.featureId !== void 0 && await this.getFeatureRow(input.featureId) === null) {
          throw new GuardFailedError(`unknown feature: ${input.featureId}`);
        }
        let workItemId2 = null;
        if (input.workItemId !== void 0) {
          workItemId2 = (await this.mustGetItem(input.workItemId)).id;
        }
        const thread = {
          id: this.nextId("th"),
          featureId: input.featureId ?? null,
          workItemId: workItemId2,
          kind: input.kind,
          visibility: input.visibility ?? (input.kind === "private" ? "private" : "open"),
          createdBy: input.actorId,
          participants: [input.actorId]
        };
        return this.db.transaction(async (tx) => {
          await tx.insert(threads).values(thread);
          await this.appendTx(tx, "thread", thread.id, "thread.created", input.actorId, {
            kind: thread.kind,
            featureId: thread.featureId,
            workItemId: thread.workItemId,
            visibility: thread.visibility
          });
          return this.publicThread(thread);
        });
      }
      async addThreadParticipant(input) {
        const thread = await this.mustGetThread(input.threadId);
        if (!this.isParticipant(thread, input.byActorId)) {
          throw new PermissionDeniedError("thread.invite", input.byActorId);
        }
        if (await this.getActorRow(input.actorId) === null) {
          throw new GuardFailedError(`unknown actor: ${input.actorId}`);
        }
        if (thread.participants.includes(input.actorId)) return this.publicThread(thread);
        const participants = [...thread.participants, input.actorId];
        return this.db.transaction(async (tx) => {
          await tx.update(threads).set({ participants }).where(eq(threads.id, thread.id));
          await this.appendTx(tx, "thread", thread.id, "thread.participant_added", input.byActorId, {
            actorId: input.actorId
          });
          return this.publicThread({ ...thread, participants });
        });
      }
      /** Internal append that never runs the router — used for chat, narration alike. */
      async appendMessageTx(tx, thread, authorId, kind, body, replyTo) {
        const [row] = await tx.select({ maxSeq: sql2`coalesce(max(${messages.seq}), 0)` }).from(messages).where(eq(messages.threadId, thread.id));
        const seq = Number(row?.maxSeq ?? 0) + 1;
        const message = {
          id: this.nextId("msg"),
          threadId: thread.id,
          seq,
          authorId,
          kind,
          body,
          replyTo
        };
        await tx.insert(messages).values(message);
        await this.appendTx(tx, "thread", thread.id, "message.posted", authorId, {
          messageId: message.id,
          kind
        });
        return { ...message };
      }
      /**
       * §5.2: the server NEVER parses body text — `mentions` is structured actor
       * ids. §5.4: the router is pure code, default-deny, policy-gated,
       * depth-capped; a job is reply-only context, never a claim.
       */
      async postMessage(input) {
        const thread = await this.mustGetThread(input.threadId);
        if (thread.visibility === "private" && !this.isParticipant(thread, input.actorId)) {
          throw new PermissionDeniedError("thread.post", input.actorId);
        }
        const mentionIds = [...new Set(input.mentions ?? [])];
        return this.db.transaction(async (tx) => {
          const message = await this.appendMessageTx(tx, thread, input.actorId, "chat", input.body, input.replyTo ?? null);
          for (const mentionedId of mentionIds) {
            const mentioned = await this.getActorRow(mentionedId, tx);
            if (!mentioned) throw new GuardFailedError(`unknown mentioned actor: ${mentionedId}`);
            const resolution = await this.routeMentionTx(tx, thread, message, input.actorId, mentioned);
            await tx.insert(mentions).values({
              messageId: message.id,
              mentionedActorId: mentionedId,
              resolution
            });
            await this.appendTx(tx, "thread", thread.id, "mention.recorded", input.actorId, {
              messageId: message.id,
              mentionedActorId: mentionedId,
              resolution
            });
          }
          return message;
        });
      }
      /** The deterministic mention router (§5.4). Returns the recorded resolution. */
      async routeMentionTx(tx, thread, message, mentionerId, mentioned) {
        if (mentioned.type !== "agent") {
          await this.pushNotificationTx(tx, mentioned.id, "mention", message.id);
          return "notified";
        }
        const policy = (await this.workspaceRow(tx)).policy;
        if (policy.mentionDispatch === false) return "denied_policy";
        const mentioner = await this.getActorRow(mentionerId, tx);
        let depth = 0;
        if (mentioner?.type === "agent") {
          if (policy.agentMentionAgent !== true) return "denied_policy";
          const mentionerJobs = await tx.select({ depth: agentJobs.depth }).from(agentJobs).where(eq(agentJobs.agentActorId, mentionerId));
          depth = Math.max(0, ...mentionerJobs.map((j) => j.depth)) + 1;
          if (depth > AGENT_JOB_MAX_DEPTH) return "denied_depth";
        } else {
          const hasRole = (await tx.select({ seq: roleAssignments.seq }).from(roleAssignments).where(and(eq(roleAssignments.actorId, mentionerId), eq(roleAssignments.revoked, false))).limit(1)).length > 0;
          const isAdmin = mentioner?.governanceRole === "admin" || mentionerId === this.systemActorId;
          if (!hasRole && !isAdmin) return "denied_policy";
        }
        const job = {
          id: this.nextId("job"),
          agentActorId: mentioned.id,
          threadId: thread.id,
          messageId: message.id,
          workItemId: thread.workItemId,
          featureId: thread.featureId,
          status: "queued",
          depth,
          note: null
        };
        await tx.insert(agentJobs).values(job);
        await this.appendTx(tx, "agent_job", job.id, "agent_job.created", mentionerId, {
          agentActorId: mentioned.id,
          threadId: thread.id,
          messageId: message.id,
          depth
        });
        await this.pushNotificationTx(tx, mentioned.id, "mention", message.id);
        return "job_created";
      }
      async pushNotificationTx(tx, actorId, source, refId) {
        await tx.insert(notifications).values({
          id: this.nextId("ntf"),
          actorId,
          source,
          refId,
          read: false
        });
      }
      async listThreads(filter) {
        const rows = await this.db.select().from(threads).orderBy(asc(threads.seq));
        let resolvedWorkItemId;
        if (filter?.workItemId !== void 0 && rows.length > 0) {
          resolvedWorkItemId = (await this.mustGetItem(filter.workItemId)).id;
        }
        const result = [];
        for (const row of rows) {
          if (filter?.featureId !== void 0 && row.featureId !== filter.featureId) continue;
          if (resolvedWorkItemId !== void 0 && row.workItemId !== resolvedWorkItemId) continue;
          if (filter?.actorId !== void 0 && row.visibility === "private" && !this.isParticipant(row, filter.actorId)) {
            continue;
          }
          result.push(this.publicThread(row));
        }
        return result;
      }
      async listMessages(input) {
        const thread = await this.mustGetThread(input.threadId);
        if (thread.visibility === "private" && !this.isParticipant(thread, input.actorId)) {
          throw new PermissionDeniedError("thread.read", input.actorId);
        }
        const rows = await this.db.select().from(messages).where(eq(messages.threadId, thread.id)).orderBy(asc(messages.seq));
        return rows.filter((m) => input.sinceSeq === void 0 || m.seq > input.sinceSeq).map((m) => this.publicMessage(m));
      }
      async listMentions(messageId) {
        const rows = await this.db.select().from(mentions).where(eq(mentions.messageId, messageId)).orderBy(asc(mentions.seq));
        return rows.map((row) => ({
          messageId: row.messageId,
          mentionedActorId: row.mentionedActorId,
          resolution: row.resolution
        }));
      }
      async listNotifications(input) {
        const rows = await this.db.select().from(notifications).where(eq(notifications.actorId, input.actorId)).orderBy(asc(notifications.seq));
        return rows.filter((n) => input.unreadOnly !== true || !n.read).map((n) => ({ id: n.id, actorId: n.actorId, source: n.source, refId: n.refId, read: n.read }));
      }
      async markNotificationRead(input) {
        const rows = await this.db.select().from(notifications).where(eq(notifications.id, input.notificationId)).limit(1);
        const notification = rows[0];
        if (!notification) throw new GuardFailedError(`unknown notification: ${input.notificationId}`);
        if (notification.actorId !== input.actorId) {
          throw new PermissionDeniedError("thread.read", input.actorId);
        }
        await this.db.update(notifications).set({ read: true }).where(eq(notifications.id, notification.id));
      }
      async listAgentJobs(filter) {
        const rows = await this.db.select().from(agentJobs).orderBy(asc(agentJobs.seq));
        return rows.filter(
          (j) => (filter?.agentActorId === void 0 || j.agentActorId === filter.agentActorId) && (filter?.status === void 0 || j.status === filter.status)
        ).map((j) => this.publicJob(j));
      }
      async completeAgentJob(input) {
        const rows = await this.db.select().from(agentJobs).where(eq(agentJobs.id, input.jobId)).limit(1);
        const job = rows[0];
        if (!job) throw new GuardFailedError(`unknown agent job: ${input.jobId}`);
        if (job.agentActorId !== input.actorId) {
          throw new PermissionDeniedError("agent_job.complete", input.actorId);
        }
        if (job.status !== "queued") throw new GuardFailedError(`agent job ${job.id} is already ${job.status}`);
        const note = input.note ?? null;
        return this.db.transaction(async (tx) => {
          await tx.update(agentJobs).set({ status: input.status, note }).where(eq(agentJobs.id, job.id));
          await this.appendTx(tx, "agent_job", job.id, "agent_job.completed", input.actorId, {
            status: input.status,
            note
          });
          const trigger = (await tx.select({ authorId: messages.authorId }).from(messages).where(eq(messages.id, job.messageId)).limit(1))[0];
          if (trigger) await this.pushNotificationTx(tx, trigger.authorId, "job_completed", job.id);
          return this.publicJob({ ...job, status: input.status, note });
        });
      }
      // -- agent memory (Phase 5, roadmap §6) ----------------------------------------
      async appendAgentMemory(input) {
        const actor = await this.getActorRow(input.actorId);
        if (!actor) throw new GuardFailedError(`unknown actor: ${input.actorId}`);
        if (actor.type !== "agent") {
          throw new GuardFailedError("memory belongs to agent actors (roadmap \xA76)");
        }
        let sourceThreadId = null;
        let sourceVisibility = null;
        if (input.sourceThreadId !== void 0) {
          const thread = await this.mustGetThread(input.sourceThreadId);
          if (thread.visibility === "private" && !this.isParticipant(thread, input.actorId)) {
            throw new PermissionDeniedError("thread.read", input.actorId);
          }
          sourceThreadId = thread.id;
          sourceVisibility = thread.visibility;
        }
        const id = this.nextId("mem");
        return this.db.transaction(async (tx) => {
          const [row] = await tx.select({ maxSeq: sql2`coalesce(max(${agentMemories.seq}), 0)` }).from(agentMemories).where(eq(agentMemories.agentActorId, input.actorId));
          const seq = Number(row?.maxSeq ?? 0) + 1;
          await tx.insert(agentMemories).values({
            id,
            agentActorId: input.actorId,
            kind: input.kind,
            content: input.content,
            sourceThreadId,
            sourceVisibility,
            seq
          });
          await this.appendTx(tx, "actor", input.actorId, "memory.appended", input.actorId, {
            memoryId: id,
            kind: input.kind,
            sourceThreadId
          });
          return {
            id,
            agentActorId: input.actorId,
            kind: input.kind,
            content: input.content,
            sourceThreadId,
            sourceVisibility,
            seq
          };
        });
      }
      async searchAgentMemory(input) {
        const rows = await this.db.select().from(agentMemories).where(eq(agentMemories.agentActorId, input.actorId)).orderBy(asc(agentMemories.seq));
        return rows.filter((m) => {
          if (input.kind !== void 0 && m.kind !== input.kind) return false;
          if (input.query !== void 0 && !m.content.toLowerCase().includes(input.query.toLowerCase())) return false;
          if (m.sourceVisibility === "private" && m.sourceThreadId !== input.contextThreadId) return false;
          return true;
        }).map((m) => this.publicMemory(m));
      }
      publicMemory(row) {
        return {
          id: row.id,
          agentActorId: row.agentActorId,
          kind: row.kind,
          content: row.content,
          sourceThreadId: row.sourceThreadId,
          sourceVisibility: row.sourceVisibility,
          seq: row.seq
        };
      }
      /** Rails → chat narration (§5.2): state changes narrate into bound task threads. */
      async narrateWorkItemTx(tx, workItemId2, body) {
        const bound = await tx.select().from(threads).where(eq(threads.workItemId, workItemId2)).orderBy(asc(threads.seq));
        for (const thread of bound) {
          await this.appendMessageTx(tx, thread, this.systemActorId, "system", body, null);
        }
      }
      // -- dispatch (roadmap §2.3) -----------------------------------------------
      async getTaskContext(input) {
        const item = await this.mustGetItem(input.workItemId);
        if (item.state === "done") {
          throw new GuardFailedError("done items are never re-dispatched; follow-up review is a new work item");
        }
        const feature = await this.getFeatureRow(item.featureId);
        if (feature?.dispatchHold) {
          throw new GuardFailedError("feature is under a done_checkpoint dispatch hold");
        }
        return { workItem: this.publicItem(item), entryState: item.state };
      }
      async releaseDispatchHold(input) {
        await this.requirePermission(input.actorId, "dispatch.release_hold");
        const feature = await this.getFeatureRow(input.featureId);
        if (!feature) throw new GuardFailedError(`unknown feature: ${input.featureId}`);
        return this.db.transaction(async (tx) => {
          await tx.update(features).set({ dispatchHold: false }).where(eq(features.id, feature.id));
          await this.appendTx(tx, "feature", feature.id, "feature.dispatch_hold_released", input.actorId, {});
          return this.publicFeature({ ...feature, dispatchHold: false });
        });
      }
      // -- reconciliation (roadmap §1.6, D6: detect-only, never mutates) ------------
      async reconcile(input) {
        const reports = [];
        for (const file of input.files) {
          const item = await this.mustGetItem(file.workItemId);
          if (await this.liveClaim(item.id) !== null) continue;
          const raw = file.frontmatterStatus.trim();
          const dbState = item.state;
          if (raw === "blocked") {
            if (item.blockedReason !== null) continue;
            reports.push({ workItemId: item.id, fileState: raw, dbState, kind: "conflict" });
            continue;
          }
          const normalized = LEGACY_STATUS2[raw];
          if (normalized === void 0) {
            reports.push({ workItemId: item.id, fileState: raw, dbState, kind: "conflict" });
            continue;
          }
          if (normalized === dbState) continue;
          reports.push({
            workItemId: item.id,
            fileState: raw,
            dbState,
            kind: RANK2[normalized] > RANK2[dbState] ? "file_ahead" : "db_ahead"
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
          if (filter?.claimable === true && await this.liveClaim(row.id) !== null) continue;
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
        const rows = streamId === void 0 ? await this.db.select().from(events).orderBy(asc(events.globalSeq)) : await this.db.select().from(events).where(eq(events.streamId, streamId)).orderBy(asc(events.globalSeq));
        return rows.map((row) => this.eventFromRow(row));
      }
    };
  }
});

// ../../packages/db/src/sync-engine.ts
import { createRequire } from "node:module";
import { dirname as dirname3, join as join4 } from "node:path";
import { fileURLToPath as fileURLToPath2 } from "node:url";
import { createSyncFn } from "synckit";
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
      op: "new",
      ...options?.dataDir !== void 0 ? { dataDir: options.dataDir } : {}
    })
  );
  const engineId = created.engineId;
  const proxy = {};
  for (const method of METHODS) {
    proxy[method] = (...args) => unwrap(callWorker({ op: "call", engineId, method, args }));
  }
  return proxy;
}
var here, workerPath, callWorker, ERROR_CLASSES, METHODS, _require;
var init_sync_engine = __esm({
  "../../packages/db/src/sync-engine.ts"() {
    "use strict";
    init_src();
    here = dirname3(fileURLToPath2(import.meta.url));
    workerPath = join4(here, "..", "dist", "worker.mjs");
    callWorker = createSyncFn(workerPath);
    ERROR_CLASSES = {
      ConflictError,
      GuardFailedError,
      InvalidTransitionError,
      PermissionDeniedError,
      StoriesValidationError
    };
    METHODS = [
      "createActor",
      "listActors",
      "provisionPersonas",
      "grant",
      "revoke",
      "createFeature",
      "createWorkItem",
      "importStories",
      "claimTask",
      "heartbeat",
      "releaseClaim",
      "advanceClock",
      "advanceState",
      "blockTask",
      "unblockTask",
      "submitEvidence",
      "approveGate",
      "rejectGate",
      "getTaskContext",
      "releaseDispatchHold",
      "reconcile",
      "setGovernanceRole",
      "getGovernanceRole",
      "assignRole",
      "revokeRole",
      "listRoleAssignments",
      "setPlan",
      "getPlan",
      "setWorkspacePolicy",
      "getWorkspacePolicy",
      "setGatePolicy",
      "getGatePolicy",
      "authzExplain",
      "createThread",
      "addThreadParticipant",
      "postMessage",
      "listThreads",
      "listMessages",
      "listMentions",
      "listNotifications",
      "markNotificationRead",
      "listAgentJobs",
      "completeAgentJob",
      "appendAgentMemory",
      "searchAgentMemory",
      "getWorkItem",
      "getFeature",
      "getClaims",
      "listWorkItems",
      "events"
    ];
    _require = createRequire(import.meta.url);
  }
});

// ../../packages/db/src/schema-sql.ts
var SCHEMA_SQL;
var init_schema_sql = __esm({
  "../../packages/db/src/schema-sql.ts"() {
    "use strict";
    SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS actors (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  display_name TEXT NOT NULL,
  governance_role TEXT NOT NULL DEFAULT 'member',
  persona_code TEXT
);

-- Phase 2 upgrade path for durable data dirs created under Phase 1 (story 13).
ALTER TABLE actors ADD COLUMN IF NOT EXISTS governance_role TEXT NOT NULL DEFAULT 'member';
-- Phase 4 upgrade path (roadmap \xA73): persona actors on durable Phase 1-3 dirs.
ALTER TABLE actors ADD COLUMN IF NOT EXISTS persona_code TEXT;

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
  kind TEXT NOT NULL DEFAULT 'code',
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

-- Phase 4 upgrade path (roadmap \xA71.4): kind on durable Phase 1-3 dirs stays 'code'.
ALTER TABLE work_items ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'code';

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

-- Phase 3 collaboration (roadmap \xA75). IF NOT EXISTS keeps durable Phase-1/2
-- data directories upgrading in place (story 13).

CREATE TABLE IF NOT EXISTS threads (
  id TEXT PRIMARY KEY,
  seq SERIAL NOT NULL,
  feature_id TEXT,
  work_item_id TEXT,
  kind TEXT NOT NULL,
  visibility TEXT NOT NULL,
  created_by TEXT NOT NULL,
  participants JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL,
  seq INTEGER NOT NULL,
  author_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  body TEXT NOT NULL,
  reply_to TEXT
);

-- \xA75.3: the per-thread message sequence is gap-free BY CONSTRAINT.
CREATE UNIQUE INDEX IF NOT EXISTS messages_thread_id_seq
  ON messages (thread_id, seq);

CREATE TABLE IF NOT EXISTS mentions (
  seq SERIAL PRIMARY KEY,
  message_id TEXT NOT NULL,
  mentioned_actor_id TEXT NOT NULL,
  resolution TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  seq SERIAL NOT NULL,
  actor_id TEXT NOT NULL,
  source TEXT NOT NULL,
  ref_id TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT FALSE
);

-- Phase 5 agent memory (roadmap \xA76). New table \u2014 IF NOT EXISTS upgrades
-- durable Phase 1-4 data directories in place; no ALTER needed.
CREATE TABLE IF NOT EXISTS agent_memories (
  id TEXT PRIMARY KEY,
  agent_actor_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  content TEXT NOT NULL,
  source_thread_id TEXT,
  source_visibility TEXT,
  seq INTEGER NOT NULL
);

-- \xA76: per-agent memory order is a CONSTRAINT (1-based append order).
CREATE UNIQUE INDEX IF NOT EXISTS agent_memories_agent_actor_id_seq
  ON agent_memories (agent_actor_id, seq);

CREATE TABLE IF NOT EXISTS agent_jobs (
  id TEXT PRIMARY KEY,
  seq SERIAL NOT NULL,
  agent_actor_id TEXT NOT NULL,
  thread_id TEXT NOT NULL,
  message_id TEXT NOT NULL,
  work_item_id TEXT,
  feature_id TEXT,
  status TEXT NOT NULL,
  depth INTEGER NOT NULL DEFAULT 0,
  note TEXT
);
`;
  }
});

// ../../packages/db/src/index.ts
var src_exports2 = {};
__export(src_exports2, {
  PgEngine: () => PgEngine,
  SCHEMA_SQL: () => SCHEMA_SQL,
  createPgSyncEngine: () => createPgSyncEngine,
  schema: () => schema_exports
});
var init_src3 = __esm({
  "../../packages/db/src/index.ts"() {
    "use strict";
    init_pg_engine();
    init_sync_engine();
    init_schema_sql();
    init_schema();
  }
});

// src/cli.ts
import { resolve as resolve3 } from "node:path";
import { Command } from "commander";

// ../../packages/contracts/src/index.ts
init_src();
import { z } from "zod";
var workItemId = z.string().min(1).describe("Work item id (or its stories.yaml externalKey)");
var fencingToken = z.number().int().optional().describe("Fencing token of the live claim \u2014 required for execution-zone mutations");
var evidenceSchema = z.object({
  kind: z.enum(["test_run", "git_diff", "commit", "halt_report", "review_report", "doc_lint"]),
  payload: z.record(z.string(), z.unknown())
}).describe("Raw machine-collected evidence; the core computes verdicts, the runner never does");
function def(name, description, input, readonly = false) {
  return { name, description, input, readonly };
}
var COMMANDS = [
  // -- setup / admin ---------------------------------------------------------
  def(
    "create_actor",
    "Create a user or agent actor. Returns the actor and its API token (admin only).",
    z.object({
      type: z.enum(["user", "agent"]),
      displayName: z.string().min(1),
      governanceRole: z.enum(["admin", "member", "auditor"]).optional().describe("Bootstrap plumbing (roadmap \xA73): initial governance role \u2014 admin context only")
    })
  ),
  def(
    "grant_permission",
    "Grant a permission to an actor (admin only). Grants are explicit and audited \u2014 authority never comes from actor type, tenure, or memory (thesis \xA73).",
    z.object({
      actorId: z.string().min(1),
      permission: z.string().min(1),
      scope: z.string().optional()
    })
  ),
  def(
    "revoke_permission",
    "Revoke a permission from an actor (admin only).",
    z.object({
      actorId: z.string().min(1),
      permission: z.string().min(1),
      scope: z.string().optional()
    })
  ),
  def("create_feature", "Create a feature (maps a BMAD epic).", z.object({})),
  def(
    "create_work_item",
    "Create a single work item. kind selects WHICH machine-evidence guards apply (Phase 4) \u2014 never WHO may pass a gate.",
    z.object({
      featureId: z.string().min(1),
      externalKey: z.string().min(1),
      title: z.string().min(1),
      kind: z.enum(WORK_ITEM_KINDS).optional().describe("Work-item kind; default 'code'"),
      specCheckpoint: z.boolean().optional(),
      doneCheckpoint: z.boolean().optional(),
      invokeDevWith: z.string().optional(),
      dependsOn: z.array(z.string().min(1)).optional().describe("externalKeys this item depends on")
    })
  ),
  def(
    "list_actors",
    "List ALL actors \u2014 humans, agents, personas, and the system actor (transparency for pickers/audit).",
    z.object({}),
    true
  ),
  def(
    "provision_personas",
    "Idempotently provision the six BMAD personas as agent actors with floor-state roles (gated by engine governance; zero gate authority).",
    z.object({})
  ),
  def(
    "import_stories",
    "Import a stories.yaml file into a feature (idempotent re-import; validity rules from stories-schema.md).",
    z.object({
      featureId: z.string().min(1),
      yaml: z.string().min(1)
    })
  ),
  // -- claims ----------------------------------------------------------------
  def(
    "claim_task",
    "Claim a work item under a lease. Returns the claim with its fencing token.",
    z.object({
      workItemId,
      ttlMs: z.number().int().positive().optional()
    })
  ),
  def("heartbeat", "Renew the lease of a live claim.", z.object({ claimId: z.string().min(1) })),
  def(
    "release_claim",
    "Release a claim (normal completion or voluntary handoff).",
    z.object({ claimId: z.string().min(1), reason: z.string().optional() })
  ),
  // -- lifecycle ---------------------------------------------------------------
  def(
    "advance_state",
    "Advance a work item through the FSM. Deterministic: permission + guards + evidence decide, never interpretation.",
    z.object({
      workItemId,
      to: z.enum(WORK_ITEM_STATES),
      fencingToken,
      idempotencyKey: z.string().optional()
    })
  ),
  def(
    "block_task",
    "Set the blocked overlay with a blocking condition from the HALT taxonomy.",
    z.object({
      workItemId,
      reason: z.enum(BLOCKED_REASONS),
      fencingToken
    })
  ),
  def("unblock_task", "Clear the blocked overlay (review_non_convergence needs the review gate grant).", z.object({ workItemId })),
  def(
    "submit_evidence",
    "Submit raw machine-collected evidence (exit codes, diff stats, shas). The core computes verdicts.",
    z.object({ workItemId, evidence: evidenceSchema, fencingToken })
  ),
  def(
    "approve_gate",
    "Approve a gate as a permitted actor. spec_approval pins the verification commands (D7) and fires draft\u2192ready_for_dev; review_approval checks pinned evidence and fires in_review\u2192done.",
    z.object({
      workItemId,
      gate: z.enum(["spec_approval", "review_approval"]),
      pinnedVerification: z.array(z.string()).optional()
    })
  ),
  def(
    "reject_gate",
    "Reject a gate as a permitted actor. Review rejection fires the loopback as a system effect (or blocks with review_non_convergence on the 6th).",
    z.object({
      workItemId,
      gate: z.enum(["spec_approval", "review_approval"])
    })
  ),
  def(
    "release_dispatch_hold",
    "Release a done_checkpoint dispatch hold on a feature (permitted actors only).",
    z.object({ featureId: z.string().min(1) })
  ),
  // -- entitlements (Phase 2, roadmap §3) ---------------------------------------
  // Authority for this group is decided by the ENGINE from the caller's
  // governance role ("entitlement = plan × governance role × delivery role,
  // resolved by a pure function over versioned config/data") — the bus never
  // pre-checks admin here.
  def(
    "assign_role",
    "Assign a delivery role (permission bundle, roadmap \xA73) to an actor. Gated write: requires governance-admin authority; audited.",
    z.object({
      actorId: z.string().min(1),
      roleCode: z.string().min(1).describe("Delivery role code, e.g. reviewer | developer | product_owner")
    })
  ),
  def(
    "revoke_role",
    "Revoke a delivery role assignment from an actor. Gated write: requires governance-admin authority; audited.",
    z.object({
      actorId: z.string().min(1),
      roleCode: z.string().min(1)
    })
  ),
  def(
    "list_role_assignments",
    "List delivery-role assignments (all, or one actor\u2019s), including revoked rows for audit.",
    z.object({ actorId: z.string().min(1).optional() }),
    true
  ),
  def(
    "set_governance_role",
    "Set an actor\u2019s governance role (admin | member | auditor). Gated write: requires governance-admin authority.",
    z.object({
      actorId: z.string().min(1),
      role: z.enum(["admin", "member", "auditor"])
    })
  ),
  def(
    "set_plan",
    "Set the workspace plan. Plan is a CEILING, never a grant (roadmap \xA73): it bounds what agents may hold/exercise; users are never plan-filtered.",
    z.object({ plan: z.enum(["free", "team", "enterprise"]) })
  ),
  def(
    "set_workspace_policy",
    "Set restrict-only workspace policy keys (roadmap \xA73): a policy can narrow what the plan allows, never widen it.",
    z.object({
      policy: z.object({
        agentGateApprovals: z.boolean().optional().describe("false \u21D2 agents cannot exercise gate-approval permissions even if granted"),
        agentSelfDispatch: z.boolean().optional().describe("false \u21D2 agents cannot claim tasks on their own (mention-dispatch only)")
      })
    })
  ),
  def(
    "set_gate_policy",
    "Set a gate definition as DATA (roadmap \xA73): min_approvals quorum and required_actor_types \u2014 human-only is a default, not a hardcode.",
    z.object({
      gate: z.enum(["spec_approval", "review_approval"]),
      policy: z.object({
        minApprovals: z.number().int().positive().optional().describe("distinct approvers required per review round"),
        requiredActorTypes: z.array(z.enum(["user", "agent", "system"])).optional().describe("at least one approver of each listed type is required")
      })
    })
  ),
  def(
    "authz_explain",
    "Replayable authz decision trace (roadmap \xA73): source grant/role, plan ceiling, policy, and the policy version tuple an auditor can replay.",
    z.object({
      actorId: z.string().min(1),
      permission: z.string().min(1)
    }),
    true
  ),
  // -- collaboration (Phase 3, roadmap §5) ---------------------------------------
  // The chat SURFACE over the same rails. Sacred boundary (§5.2): a message
  // NEVER mutates lifecycle; mentions are STRUCTURED actor ids — no server
  // code path ever parses message body text. Actor identity for every command
  // here comes from ctx (the authenticated token), never from the input.
  def(
    "create_thread",
    "Create a conversation thread, optionally bound to a feature/work item. kind=private defaults visibility to private.",
    z.object({
      kind: z.enum(["spec", "design", "task", "general", "private"]),
      featureId: z.string().min(1).optional(),
      workItemId: workItemId.optional(),
      visibility: z.enum(["open", "private"]).optional()
    })
  ),
  def(
    "add_thread_participant",
    "Invite an actor into a thread (private threads: only existing participants may invite).",
    z.object({
      threadId: z.string().min(1),
      actorId: z.string().min(1)
    })
  ),
  def(
    "post_message",
    "Post a chat message. `mentions` is structured actor ids (\xA75.2 \u2014 body text is never parsed); mentioning an agent runs the deterministic default-deny router (\xA75.4).",
    z.object({
      threadId: z.string().min(1),
      body: z.string().min(1),
      replyTo: z.string().min(1).optional(),
      mentions: z.array(z.string().min(1)).optional()
    })
  ),
  def(
    "list_threads",
    "List threads, optionally filtered by feature / work item. Private threads are visible only to their participants (ctx actor).",
    z.object({
      featureId: z.string().min(1).optional(),
      workItemId: workItemId.optional()
    }),
    true
  ),
  def(
    "list_messages",
    "List messages of a thread (optionally after a seq). Private threads require participation \u2014 the reader is ALWAYS the ctx actor.",
    z.object({
      threadId: z.string().min(1),
      sinceSeq: z.number().int().nonnegative().optional()
    }),
    true
  ),
  def(
    "list_mentions",
    "List the recorded mentions of a message with their router resolutions (notified | job_created | denied_policy | denied_depth).",
    z.object({ messageId: z.string().min(1) }),
    true
  ),
  def(
    "list_notifications",
    "List the ctx actor\u2019s OWN notifications (mentions + job completions).",
    z.object({ unreadOnly: z.boolean().optional() }),
    true
  ),
  def(
    "mark_notification_read",
    "Mark one of the ctx actor\u2019s own notifications as read.",
    z.object({ notificationId: z.string().min(1) })
  ),
  def(
    "list_agent_jobs",
    "List router-materialized agent jobs (reply-only context \u2014 a job never carries a claim or lifecycle authority, \xA75.4).",
    z.object({
      agentActorId: z.string().min(1).optional(),
      status: z.enum(["queued", "done", "blocked"]).optional()
    }),
    true
  ),
  def(
    "complete_agent_job",
    "Complete an agent job (only the job\u2019s agent may). Completion notifies the mentioner \u2014 nothing else moves.",
    z.object({
      jobId: z.string().min(1),
      status: z.enum(["done", "blocked"]),
      note: z.string().optional()
    })
  ),
  // -- agent memory (Phase 5, roadmap §6) -----------------------------------------
  // Owner-scoped BY CONSTRUCTION: neither command takes an actor parameter —
  // the memory owner is ALWAYS the authenticated ctx actor. Learning never
  // becomes authority: these commands touch the memory store only, never a
  // grant, gate, or transition.
  def(
    "append_agent_memory",
    "Append a memory for the ctx agent actor (agents only). Learning from a private thread requires participation; memory events never carry content (\xA76).",
    z.object({
      kind: z.enum(["episodic", "procedural", "entity"]),
      content: z.string().min(1),
      sourceThreadId: z.string().min(1).optional().describe("Thread the memory was learned in \u2014 its visibility gates recall (\xA76)")
    })
  ),
  def(
    "search_agent_memory",
    "Recall the ctx actor\u2019s OWN memories. Private-sourced memories surface only when contextThreadId is their source thread (\xA76).",
    z.object({
      contextThreadId: z.string().min(1).optional().describe("Thread the recall happens in \u2014 gates private-sourced memories"),
      kind: z.enum(["episodic", "procedural", "entity"]).optional(),
      query: z.string().min(1).optional().describe("Case-insensitive substring filter")
    }),
    true
  ),
  // -- reconciliation (roadmap §1.6, D6: detect-only) -----------------------------
  def(
    "reconcile",
    "Detect-only divergence report between file frontmatter statuses and DB states (never mutates; live-claimed items are excluded).",
    z.object({
      files: z.array(
        z.object({
          workItemId,
          frontmatterStatus: z.string().min(1)
        })
      )
    }),
    true
  ),
  // -- ops (so nobody ever needs to touch the DB by hand) -----------------------
  def(
    "force_release_claim",
    "Ops: force-release the live claim of a work item (stuck runner, lost machine).",
    z.object({ workItemId })
  ),
  // -- queries -----------------------------------------------------------------
  def("get_work_item", "Fetch one work item by id or externalKey.", z.object({ workItemId }), true),
  def("get_feature", "Fetch one feature.", z.object({ featureId: z.string().min(1) }), true),
  def(
    "get_task_context",
    "Dispatch context for a runner: entry state routing per dev-auto. Refuses done items and held features.",
    z.object({ workItemId }),
    true
  ),
  def(
    "list_work_items",
    "List work items, optionally filtered by state / feature / claimability.",
    z.object({
      state: z.enum(WORK_ITEM_STATES).optional(),
      featureId: z.string().optional(),
      claimable: z.boolean().optional().describe("true = no live claim on the item")
    }),
    true
  ),
  def(
    "inbox",
    "Gate-holder inbox: items awaiting a gate decision (draft+spec_checkpoint awaiting spec approval; in_review awaiting review decision).",
    z.object({}),
    true
  ),
  def(
    "query_events",
    "Audit query: the append-only event log, optionally scoped to one stream.",
    z.object({ streamId: z.string().optional() }),
    true
  ),
  def("get_claims", "All claims (live and released) of a work item.", z.object({ workItemId }), true),
  def("whoami", "Resolve the authenticated actor.", z.object({}), true)
];
var COMMAND_MAP = new Map(
  COMMANDS.map((c) => [c.name, c])
);
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
  Error: 500
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
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${options.token}`
        },
        body: JSON.stringify(input)
      });
      const envelope = await response.json();
      if (envelope.ok) return envelope.result;
      throw new OahsRemoteError(envelope.error.name, envelope.error.message, response.status);
    }
  };
}

// src/commands/index.ts
init_src2();
init_src();
import { readFileSync as readFileSync3 } from "node:fs";
import { resolve as resolve2 } from "node:path";

// src/format.ts
function toText(cell) {
  if (cell === null || cell === void 0) return "-";
  return String(cell);
}
function renderTable(headers, rows) {
  if (rows.length === 0) return "(empty)";
  const textRows = rows.map((row) => row.map(toText));
  const widths = headers.map(
    (header, col) => Math.max(header.length, ...textRows.map((row) => (row[col] ?? "").length))
  );
  const line = (cells) => cells.map((cell, col) => cell.padEnd(widths[col] ?? cell.length)).join("  ").trimEnd();
  const separator = widths.map((w) => "-".repeat(w)).join("  ");
  return [line(headers), separator, ...textRows.map(line)].join("\n");
}

// src/commands/collab.ts
var THREAD_KINDS = ["spec", "design", "task", "general", "private"];
var VISIBILITIES = ["open", "private"];
var JOB_STATUSES = ["queued", "done", "blocked"];
function assertThreadKind(kind) {
  if (!THREAD_KINDS.includes(kind)) {
    throw new Error(`invalid --kind "${kind}" (expected ${THREAD_KINDS.join(" | ")})`);
  }
}
function assertVisibility(visibility) {
  if (!VISIBILITIES.includes(visibility)) {
    throw new Error(`invalid --visibility "${visibility}" (expected ${VISIBILITIES.join(" | ")})`);
  }
}
async function threadCreateCommand(client, opts) {
  assertThreadKind(opts.kind);
  if (opts.visibility !== void 0) assertVisibility(opts.visibility);
  const thread = await client.call("create_thread", {
    kind: opts.kind,
    ...opts.featureId !== void 0 ? { featureId: opts.featureId } : {},
    ...opts.workItemId !== void 0 ? { workItemId: opts.workItemId } : {},
    ...opts.visibility !== void 0 ? { visibility: opts.visibility } : {}
  });
  return [
    `threadId: ${thread.id}`,
    `kind: ${thread.kind}`,
    `visibility: ${thread.visibility}`,
    `featureId: ${thread.featureId ?? "-"}`,
    `workItemId: ${thread.workItemId ?? "-"}`
  ].join("\n");
}
async function threadListCommand(client, opts = {}) {
  const threads2 = await client.call("list_threads", {
    ...opts.featureId !== void 0 ? { featureId: opts.featureId } : {},
    ...opts.workItemId !== void 0 ? { workItemId: opts.workItemId } : {}
  });
  return renderTable(
    ["id", "kind", "visibility", "featureId", "workItemId", "createdBy"],
    threads2.map((t) => [t.id, t.kind, t.visibility, t.featureId, t.workItemId, t.createdBy])
  );
}
async function postCommand(client, opts) {
  const message = await client.call("post_message", {
    threadId: opts.threadId,
    body: opts.body,
    ...opts.replyTo !== void 0 ? { replyTo: opts.replyTo } : {},
    ...opts.mentions !== void 0 && opts.mentions.length > 0 ? { mentions: opts.mentions } : {}
  });
  const lines = [`posted #${message.seq} (${message.id}) to ${message.threadId}`];
  if (opts.mentions !== void 0 && opts.mentions.length > 0) {
    const mentions2 = await client.call("list_mentions", { messageId: message.id });
    for (const mention of mentions2) {
      lines.push(`mention ${mention.mentionedActorId}: ${mention.resolution}`);
    }
  }
  return lines.join("\n");
}
async function messagesCommand(client, opts) {
  const messages2 = await client.call("list_messages", {
    threadId: opts.threadId,
    ...opts.sinceSeq !== void 0 ? { sinceSeq: opts.sinceSeq } : {}
  });
  return renderTable(
    ["seq", "kind", "authorId", "body"],
    messages2.map((m) => [m.seq, m.kind, m.authorId, m.body])
  );
}
async function notificationsCommand(client, opts = {}) {
  const notifications2 = await client.call("list_notifications", {
    ...opts.unreadOnly === true ? { unreadOnly: true } : {}
  });
  return renderTable(
    ["id", "source", "refId", "read"],
    notifications2.map((n) => [n.id, n.source, n.refId, n.read])
  );
}
async function jobsCommand(client, opts = {}) {
  if (opts.status !== void 0 && !JOB_STATUSES.includes(opts.status)) {
    throw new Error(`invalid --status "${opts.status}" (expected ${JOB_STATUSES.join(" | ")})`);
  }
  const jobs = await client.call("list_agent_jobs", {
    ...opts.agentActorId !== void 0 ? { agentActorId: opts.agentActorId } : {},
    ...opts.status !== void 0 ? { status: opts.status } : {}
  });
  return renderTable(
    ["id", "agentActorId", "status", "threadId", "workItemId", "depth", "note"],
    jobs.map((j) => [j.id, j.agentActorId, j.status, j.threadId, j.workItemId, j.depth, j.note])
  );
}
async function jobCompleteCommand(client, opts) {
  const job = await client.call("complete_agent_job", {
    jobId: opts.jobId,
    status: opts.status,
    ...opts.note !== void 0 ? { note: opts.note } : {}
  });
  return [`job ${job.id}: ${job.status}`, `note: ${job.note ?? "-"}`].join("\n");
}
async function adviseNextTaskCommand(client, opts) {
  const items = await client.call("list_work_items", {
    state: "ready_for_dev",
    claimable: true
  });
  const ordered = [...items].sort((a, b) => a.externalKey.localeCompare(b.externalKey));
  const body = ordered.length === 0 ? "advisor(next-task): no claimable ready_for_dev items right now." : [
    "advisor(next-task): suggested claim order (claimable ready_for_dev):",
    ...ordered.map((item, i) => `${i + 1}. ${item.externalKey} \u2014 ${item.title} (${item.id})`)
  ].join("\n");
  const message = await client.call("post_message", {
    threadId: opts.threadId,
    body
  });
  return [`advised in #${message.seq} (${message.id})`, body].join("\n");
}
async function adviseReconcileCommand(client, opts) {
  if (opts.files.length === 0) {
    throw new Error("nothing to reconcile: pass at least one --file <workItemId>=<status>");
  }
  const files = opts.files.map((pair) => {
    const eq2 = pair.indexOf("=");
    if (eq2 <= 0 || eq2 === pair.length - 1) {
      throw new Error(`invalid --file "${pair}" (expected <workItemId>=<status>)`);
    }
    return { workItemId: pair.slice(0, eq2), frontmatterStatus: pair.slice(eq2 + 1) };
  });
  const reports = await client.call("reconcile", { files });
  const body = reports.length === 0 ? `advisor(reconcile): no divergence across ${files.length} file(s). (detect-only)` : [
    `advisor(reconcile): ${reports.length} divergence(s) detected (detect-only, nothing was changed):`,
    ...reports.map(
      (r) => `- ${r.workItemId}: file=${r.fileState} db=${r.dbState} \u2192 ${r.kind}`
    )
  ].join("\n");
  const message = await client.call("post_message", {
    threadId: opts.threadId,
    body
  });
  return [`advised in #${message.seq} (${message.id})`, body].join("\n");
}

// src/commands/phase5.ts
var MEMORY_KINDS = ["episodic", "procedural", "entity"];
function assertMemoryKind(kind) {
  if (!MEMORY_KINDS.includes(kind)) {
    throw new Error(`invalid --kind "${kind}" (expected ${MEMORY_KINDS.join(" | ")})`);
  }
}
async function memoryCommand(client, opts = {}) {
  if (opts.kind !== void 0) assertMemoryKind(opts.kind);
  const memories = await client.call("search_agent_memory", {
    ...opts.kind !== void 0 ? { kind: opts.kind } : {},
    ...opts.query !== void 0 ? { query: opts.query } : {},
    ...opts.contextThreadId !== void 0 ? { contextThreadId: opts.contextThreadId } : {}
  });
  return [
    "your memories (owner-scoped \u2014 this token\u2019s agent only):",
    renderTable(
      ["seq", "kind", "sourceThreadId", "sourceVisibility", "content"],
      memories.map((m) => [m.seq, m.kind, m.sourceThreadId, m.sourceVisibility, m.content])
    )
  ].join("\n");
}
async function statsReviewsCommand(client) {
  const items = await client.call("list_work_items");
  const byKind = /* @__PURE__ */ new Map();
  for (const item of items) {
    if (item.state !== "done") continue;
    const stats = byKind.get(item.kind) ?? { kind: item.kind, done: 0, totalLoops: 0, maxLoops: 0 };
    stats.done += 1;
    stats.totalLoops += item.reviewLoopIteration;
    stats.maxLoops = Math.max(stats.maxLoops, item.reviewLoopIteration);
    byKind.set(item.kind, stats);
  }
  const kinds = [...byKind.values()].sort((a, b) => a.kind.localeCompare(b.kind));
  const sorted = [...items].sort((a, b) => a.externalKey.localeCompare(b.externalKey));
  return [
    "review convergence by kind (done items \u2014 lower loops = better):",
    renderTable(
      ["kind", "done", "avgLoops", "maxLoops"],
      kinds.map((s) => [s.kind, s.done, (s.totalLoops / s.done).toFixed(2), s.maxLoops])
    ),
    "",
    "items:",
    renderTable(
      ["externalKey", "kind", "state", "loops"],
      sorted.map((item) => [item.externalKey, item.kind, item.state, item.reviewLoopIteration])
    )
  ].join("\n");
}

// ../../packages/gateway/src/provider.ts
var GatewayError = class extends Error {
  name = "GatewayError";
  status;
  body;
  constructor(message, options = {}) {
    super(message);
    this.status = options.status;
    this.body = options.body;
  }
};
var ERROR_BODY_HEAD = 2e3;
function toInt(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}
var OpenAICompatibleProvider = class {
  baseUrl;
  apiKey;
  fetchImpl;
  constructor(config) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, "");
    this.apiKey = config.apiKey;
    this.fetchImpl = config.fetchImpl ?? ((input, init) => fetch(input, init));
  }
  headers() {
    return {
      "content-type": "application/json",
      authorization: `Bearer ${this.apiKey}`
    };
  }
  async complete(req) {
    const url = `${this.baseUrl}/chat/completions`;
    const payload = {
      model: req.model,
      messages: req.messages,
      stream: false
    };
    if (req.maxTokens !== void 0) payload["max_tokens"] = req.maxTokens;
    if (req.temperature !== void 0) payload["temperature"] = req.temperature;
    let response;
    try {
      response = await this.fetchImpl(url, {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify(payload)
      });
    } catch (error) {
      throw new GatewayError(
        `chat/completions request failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
    if (!response.ok) {
      const body = await this.readBody(response);
      throw new GatewayError(`chat/completions returned HTTP ${response.status}`, {
        status: response.status,
        body
      });
    }
    let json;
    try {
      json = await response.json();
    } catch (error) {
      throw new GatewayError(
        `chat/completions returned unparseable JSON: ${error instanceof Error ? error.message : String(error)}`,
        { status: response.status }
      );
    }
    const content = json.choices?.[0]?.message?.content;
    if (typeof content !== "string" || content.length === 0) {
      throw new GatewayError("chat/completions response carried no message content", {
        status: response.status,
        body: JSON.stringify(json).slice(0, ERROR_BODY_HEAD)
      });
    }
    const usage = {
      promptTokens: toInt(json.usage?.prompt_tokens),
      completionTokens: toInt(json.usage?.completion_tokens),
      totalTokens: toInt(json.usage?.total_tokens)
    };
    return { content, usage, model: req.model };
  }
  async listModels() {
    const url = `${this.baseUrl}/models`;
    let response;
    try {
      response = await this.fetchImpl(url, { method: "GET", headers: this.headers() });
    } catch (error) {
      throw new GatewayError(
        `models request failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
    if (!response.ok) {
      const body = await this.readBody(response);
      throw new GatewayError(`models returned HTTP ${response.status}`, {
        status: response.status,
        body
      });
    }
    let json;
    try {
      json = await response.json();
    } catch (error) {
      throw new GatewayError(
        `models returned unparseable JSON: ${error instanceof Error ? error.message : String(error)}`,
        { status: response.status }
      );
    }
    return (json.data ?? []).map((entry) => entry.id).filter((id) => typeof id === "string");
  }
  async readBody(response) {
    try {
      return (await response.text()).slice(0, ERROR_BODY_HEAD);
    } catch {
      return "";
    }
  }
};

// ../../packages/gateway/src/meter.ts
var InMemoryMeter = class {
  calls = 0;
  promptTokens = 0;
  completionTokens = 0;
  totalTokens = 0;
  record(entry) {
    this.calls += 1;
    this.promptTokens += entry.usage.promptTokens;
    this.completionTokens += entry.usage.completionTokens;
    this.totalTokens += entry.usage.totalTokens;
  }
  total() {
    return {
      calls: this.calls,
      promptTokens: this.promptTokens,
      completionTokens: this.completionTokens,
      totalTokens: this.totalTokens
    };
  }
};

// ../../packages/gateway/src/gateway.ts
var DEFAULT_ROUTE = "default";
var ModelGateway = class {
  provider;
  routes;
  meter;
  constructor(config) {
    this.provider = config.provider;
    this.routes = config.routes ?? {};
    this.meter = config.meter;
  }
  /**
   * Resolve a route/model to a concrete model id. Precedence:
   *   explicit model → routes[route] → routes['default'] → throw.
   * Resolution is pure data lookup — never interpretation (§0.1).
   */
  resolveModel(req) {
    if (req.model !== void 0 && req.model.length > 0) return req.model;
    if (req.route !== void 0) {
      const routed = this.routes[req.route];
      if (routed !== void 0 && routed.length > 0) return routed;
    }
    const fallback = this.routes[DEFAULT_ROUTE];
    if (fallback !== void 0 && fallback.length > 0) return fallback;
    const routeLabel = req.route !== void 0 ? ` for route "${req.route}"` : "";
    throw new GatewayError(
      `no model resolved${routeLabel}: pass a model, define the route, or set a "${DEFAULT_ROUTE}" route`
    );
  }
  async complete(req) {
    const model = this.resolveModel(req);
    const result = await this.provider.complete({
      model,
      messages: req.messages,
      ...req.maxTokens !== void 0 ? { maxTokens: req.maxTokens } : {},
      ...req.temperature !== void 0 ? { temperature: req.temperature } : {}
    });
    if (this.meter !== void 0) {
      try {
        this.meter.record({
          model: result.model,
          usage: result.usage,
          ...req.route !== void 0 ? { route: req.route } : {}
        });
      } catch {
      }
    }
    return result;
  }
  async listModels() {
    return this.provider.listModels();
  }
};
function loadGatewayFromEnv(env = process.env, options = {}) {
  const baseUrl = env["OAHS_MODEL_BASE_URL"];
  const apiKey = env["OAHS_MODEL_API_KEY"];
  const defaultModel = env["OAHS_MODEL_DEFAULT"];
  const missing = [];
  if (baseUrl === void 0 || baseUrl.length === 0) missing.push("OAHS_MODEL_BASE_URL");
  if (apiKey === void 0 || apiKey.length === 0) missing.push("OAHS_MODEL_API_KEY");
  if (defaultModel === void 0 || defaultModel.length === 0) missing.push("OAHS_MODEL_DEFAULT");
  if (missing.length > 0) {
    throw new GatewayError(
      `model gateway not configured: missing env ${missing.join(", ")}`
    );
  }
  const provider = new OpenAICompatibleProvider({
    baseUrl,
    apiKey,
    ...options.fetchImpl !== void 0 ? { fetchImpl: options.fetchImpl } : {}
  });
  return new ModelGateway({
    provider,
    routes: { [DEFAULT_ROUTE]: defaultModel },
    ...options.meter !== void 0 ? { meter: options.meter } : {}
  });
}

// src/commands/gateway.ts
async function modelsCommand() {
  const gateway = loadGatewayFromEnv();
  const models = await gateway.listModels();
  if (models.length === 0) return "(no models reported by the endpoint)";
  return models.join("\n");
}
async function pingCommand(opts = {}) {
  const meter = new InMemoryMeter();
  const gateway = loadGatewayFromEnv(process.env, { meter });
  const message = opts.message ?? "Reply in one short sentence that the gateway is live.";
  const result = await gateway.complete({
    ...opts.route !== void 0 ? { route: opts.route } : {},
    ...opts.model !== void 0 ? { model: opts.model } : {},
    messages: [{ role: "user", content: message }],
    maxTokens: 200
  });
  return [
    `model: ${result.model}`,
    "",
    result.content,
    "",
    `usage: prompt=${result.usage.promptTokens} completion=${result.usage.completionTokens} total=${result.usage.totalTokens}`
  ].join("\n");
}

// src/commands/index.ts
var GATES = ["spec_approval", "review_approval"];
function assertGate(gate) {
  if (!GATES.includes(gate)) {
    throw new Error(`invalid --gate "${gate}" (expected ${GATES.join(" | ")})`);
  }
}
var WORK_ITEM_HEADERS = ["id", "externalKey", "title", "state", "blockedReason"];
function workItemRow(item) {
  return [item.id, item.externalKey, item.title, item.state, item.blockedReason];
}
async function inboxCommand(client) {
  const { awaitingSpec, awaitingReview } = await client.call("inbox");
  return [
    "awaiting spec approval:",
    renderTable(WORK_ITEM_HEADERS, awaitingSpec.map(workItemRow)),
    "",
    "awaiting review decision:",
    renderTable(WORK_ITEM_HEADERS, awaitingReview.map(workItemRow))
  ].join("\n");
}
async function approveCommand(client, opts) {
  assertGate(opts.gate);
  const item = await client.call("approve_gate", {
    workItemId: opts.workItemId,
    gate: opts.gate,
    ...opts.pin !== void 0 && opts.pin.length > 0 ? { pinnedVerification: opts.pin } : {}
  });
  const lines = [
    `approved ${opts.gate} on ${item.externalKey} (${item.id})`,
    `state: ${item.state}`
  ];
  if (item.pinnedVerification !== null && item.pinnedVerification.length > 0) {
    lines.push(`pinned verification: ${item.pinnedVerification.join(" && ")}`);
  }
  return lines.join("\n");
}
async function advanceCommand(client, opts) {
  const item = await client.call("advance_state", {
    workItemId: opts.workItemId,
    to: opts.to,
    ...opts.fencingToken !== void 0 ? { fencingToken: opts.fencingToken } : {}
  });
  return `advanced ${item.externalKey} (${item.id})
state: ${item.state}`;
}
async function rejectCommand(client, opts) {
  assertGate(opts.gate);
  const item = await client.call("reject_gate", {
    workItemId: opts.workItemId,
    gate: opts.gate
  });
  return [
    `rejected ${opts.gate} on ${item.externalKey} (${item.id})`,
    `state: ${item.state}`,
    `blockedReason: ${item.blockedReason ?? "-"}`,
    `reviewLoopIteration: ${item.reviewLoopIteration}`
  ].join("\n");
}
async function statusCommand(client) {
  const items = await client.call("list_work_items");
  const rank = new Map(WORK_ITEM_STATES.map((s, i) => [s, i]));
  const sorted = [...items].sort(
    (a, b) => (rank.get(a.state) ?? 0) - (rank.get(b.state) ?? 0) || a.externalKey.localeCompare(b.externalKey)
  );
  const featureIds = [...new Set(items.map((item) => item.featureId))];
  const features2 = [];
  for (const featureId of featureIds) {
    features2.push(await client.call("get_feature", { featureId }));
  }
  return [
    "work items:",
    renderTable(
      ["state", "id", "externalKey", "title", "blockedReason"],
      sorted.map((item) => [item.state, item.id, item.externalKey, item.title, item.blockedReason])
    ),
    "",
    "features:",
    renderTable(
      ["id", "state", "dispatchHold"],
      features2.map((feature) => [feature.id, feature.state, feature.dispatchHold])
    )
  ].join("\n");
}
var GOVERNANCE_ROLES = ["admin", "member", "auditor"];
function assertGovernanceRole(role) {
  if (!GOVERNANCE_ROLES.includes(role)) {
    throw new Error(`invalid governance role "${role}" (expected ${GOVERNANCE_ROLES.join(" | ")})`);
  }
}
async function actorCreateCommand(client, opts) {
  if (opts.type !== "user" && opts.type !== "agent") {
    throw new Error(`invalid --type "${opts.type}" (expected user | agent)`);
  }
  if (opts.governanceRole !== void 0) assertGovernanceRole(opts.governanceRole);
  const created = await client.call("create_actor", {
    type: opts.type,
    displayName: opts.name,
    ...opts.governanceRole !== void 0 ? { governanceRole: opts.governanceRole } : {}
  });
  return [
    `actorId: ${created.actor.id}`,
    `type: ${created.actor.type}`,
    `displayName: ${created.actor.displayName}`,
    `token: ${created.token}`
  ].join("\n");
}
async function grantCommand(client, opts) {
  await client.call("grant_permission", {
    actorId: opts.actorId,
    permission: opts.permission,
    ...opts.scope !== void 0 ? { scope: opts.scope } : {}
  });
  return `granted ${opts.permission} to ${opts.actorId}`;
}
async function featureCreateCommand(client) {
  const feature = await client.call("create_feature");
  return [`featureId: ${feature.id}`, `state: ${feature.state}`].join("\n");
}
async function importStoriesCommand(client, opts) {
  const yaml = readFileSync3(resolve2(opts.path), "utf8");
  const result = await client.call("import_stories", {
    featureId: opts.featureId,
    yaml
  });
  const list = (values) => values.length > 0 ? values.join(", ") : "(none)";
  return [
    `imported: ${list(result.imported)}`,
    `updated: ${list(result.updated)}`,
    `warnings: ${list(result.warnings)}`
  ].join("\n");
}
async function eventsCommand(client, opts = {}) {
  const events2 = await client.call(
    "query_events",
    opts.streamId !== void 0 ? { streamId: opts.streamId } : {}
  );
  return renderTable(
    ["seq", "type", "stream", "actor"],
    events2.map((event) => [
      event.globalSeq,
      event.type,
      `${event.streamType}/${event.streamId}#${event.streamSeq}`,
      event.actorId
    ])
  );
}
async function roleAssignCommand(client, opts) {
  await client.call("assign_role", { actorId: opts.actorId, roleCode: opts.roleCode });
  return `assigned role ${opts.roleCode} to ${opts.actorId}`;
}
async function roleRevokeCommand(client, opts) {
  await client.call("revoke_role", { actorId: opts.actorId, roleCode: opts.roleCode });
  return `revoked role ${opts.roleCode} from ${opts.actorId}`;
}
async function roleListCommand(client, opts = {}) {
  const assignments = await client.call(
    "list_role_assignments",
    opts.actorId !== void 0 ? { actorId: opts.actorId } : {}
  );
  return renderTable(
    ["actorId", "roleCode", "grantedBy", "revoked"],
    assignments.map((a) => [a.actorId, a.roleCode, a.grantedBy, a.revoked])
  );
}
var PLANS = ["free", "team", "enterprise"];
async function planSetCommand(client, opts) {
  if (!PLANS.includes(opts.plan)) {
    throw new Error(`invalid plan "${opts.plan}" (expected ${PLANS.join(" | ")})`);
  }
  const result = await client.call("set_plan", { plan: opts.plan });
  return `plan set: ${result.plan} (a ceiling for agent grants \u2014 never a grant itself)`;
}
function parseBoolFlag(flag, value) {
  if (value === "true") return true;
  if (value === "false") return false;
  throw new Error(`invalid ${flag} "${value}" (expected true | false)`);
}
async function policySetCommand(client, opts) {
  const policy = {
    ...opts.agentGateApprovals !== void 0 ? { agentGateApprovals: parseBoolFlag("--agent-gate-approvals", opts.agentGateApprovals) } : {},
    ...opts.agentSelfDispatch !== void 0 ? { agentSelfDispatch: parseBoolFlag("--agent-self-dispatch", opts.agentSelfDispatch) } : {}
  };
  if (Object.keys(policy).length === 0) {
    throw new Error("nothing to set: pass --agent-gate-approvals and/or --agent-self-dispatch");
  }
  const effective = await client.call("set_workspace_policy", { policy });
  return [
    "workspace policy (restrict-only \u2014 narrows the plan, never widens it):",
    `  agentGateApprovals: ${effective.agentGateApprovals ?? "(unset)"}`,
    `  agentSelfDispatch: ${effective.agentSelfDispatch ?? "(unset)"}`
  ].join("\n");
}
async function gatePolicySetCommand(client, opts) {
  assertGate(opts.gate);
  const minApprovals = opts.minApprovals !== void 0 ? Number(opts.minApprovals) : void 0;
  if (minApprovals !== void 0 && (!Number.isInteger(minApprovals) || minApprovals < 1)) {
    throw new Error(`invalid --min-approvals "${opts.minApprovals}" (expected a positive integer)`);
  }
  const requireTypes = opts.requireTypes ?? [];
  for (const type of requireTypes) {
    if (type !== "user" && type !== "agent" && type !== "system") {
      throw new Error(`invalid --require-type "${type}" (expected user | agent | system)`);
    }
  }
  if (minApprovals === void 0 && requireTypes.length === 0) {
    throw new Error("nothing to set: pass --min-approvals and/or --require-type");
  }
  const result = await client.call("set_gate_policy", {
    gate: opts.gate,
    policy: {
      ...minApprovals !== void 0 ? { minApprovals } : {},
      ...requireTypes.length > 0 ? { requiredActorTypes: requireTypes } : {}
    }
  });
  return [
    `gate policy set on ${result.gate} (gate definitions are data, roadmap \xA73):`,
    `  minApprovals: ${result.policy.minApprovals ?? 1}`,
    `  requiredActorTypes: ${result.policy.requiredActorTypes !== void 0 && result.policy.requiredActorTypes.length > 0 ? result.policy.requiredActorTypes.join(", ") : "(none)"}`
  ].join("\n");
}
async function governanceSetCommand(client, opts) {
  assertGovernanceRole(opts.role);
  await client.call("set_governance_role", { actorId: opts.actorId, role: opts.role });
  return `governance role of ${opts.actorId} set to ${opts.role}`;
}
async function authzCommand(client, opts) {
  const explanation = await client.call("authz_explain", {
    actorId: opts.actorId,
    permission: opts.permission
  });
  return [
    `authz ${explanation.permission} for ${explanation.actorId}: ${explanation.allowed ? "ALLOWED" : "DENIED"}`,
    `  source: ${explanation.source ?? "(no grant \u2014 direct or via role)"}`,
    `  governanceRole: ${explanation.governanceRole}`,
    `  plan: ${explanation.plan} (planAllows: ${explanation.planAllows})`,
    `  policyAllows: ${explanation.policyAllows}`,
    `  versions: plan v${explanation.versions.plan}, policy v${explanation.versions.policy}`
  ].join("\n");
}
async function actorsCommand(client) {
  const actors2 = await client.call("list_actors");
  return renderTable(
    ["id", "type", "displayName", "personaCode"],
    actors2.map((actor) => [actor.id, actor.type, actor.displayName, actor.personaCode])
  );
}
async function personasProvisionCommand(client) {
  const personas = await client.call("provision_personas");
  return [
    `provisioned ${personas.length} personas (idempotent; floor-state roles, zero gate authority):`,
    renderTable(
      ["id", "displayName", "personaCode"],
      personas.map((actor) => [actor.id, actor.displayName, actor.personaCode])
    )
  ].join("\n");
}
async function itemCreateCommand(client, opts) {
  if (opts.kind !== void 0 && !WORK_ITEM_KINDS.includes(opts.kind)) {
    throw new Error(`invalid --kind "${opts.kind}" (expected ${WORK_ITEM_KINDS.join(" | ")})`);
  }
  const item = await client.call("create_work_item", {
    featureId: opts.featureId,
    externalKey: opts.externalKey,
    title: opts.title,
    ...opts.kind !== void 0 ? { kind: opts.kind } : {},
    ...opts.specCheckpoint !== void 0 ? { specCheckpoint: opts.specCheckpoint } : {},
    ...opts.doneCheckpoint !== void 0 ? { doneCheckpoint: opts.doneCheckpoint } : {},
    ...opts.invokeDevWith !== void 0 ? { invokeDevWith: opts.invokeDevWith } : {},
    ...opts.dependsOn !== void 0 && opts.dependsOn.length > 0 ? { dependsOn: opts.dependsOn } : {}
  });
  return [
    `created ${item.externalKey} (${item.id})`,
    `kind: ${item.kind}`,
    `state: ${item.state}`,
    `specCheckpoint: ${item.specCheckpoint}`
  ].join("\n");
}
async function doclintCommand(client, opts) {
  const content = readFileSync3(resolve2(opts.path), "utf8");
  const result = lintDoc(content, {
    ...opts.requireSections !== void 0 ? { requiredSections: opts.requireSections } : {}
  });
  const lines = [
    `doclint ${opts.path}: ${result.schemaValid ? "schema-valid" : "NOT schema-valid"}`,
    ...result.findings.map((finding) => `  - ${finding}`)
  ];
  if (opts.submit === true) {
    if (opts.workItemId === void 0) throw new Error("--submit requires --work-item <id>");
    if (client === null) throw new Error("--submit requires a client (token + url)");
    await client.call("submit_evidence", {
      workItemId: opts.workItemId,
      evidence: {
        kind: "doc_lint",
        payload: { schemaValid: result.schemaValid, findings: result.findings }
      },
      ...opts.fencingToken !== void 0 ? { fencingToken: opts.fencingToken } : {}
    });
    lines.push(`submitted doc_lint evidence on ${opts.workItemId}`);
  }
  return { text: lines.join("\n"), exitCode: result.schemaValid ? 0 : 1 };
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

// src/agent-brain.ts
import { readFileSync as readFileSync4, writeFileSync as writeFileSync3 } from "node:fs";
var BRAIN_SYSTEM_PROMPT = "B\u1EA1n l\xE0 teammate AI trong h\u1EC7 th\u1ED1ng oahs delivery. \u0110\u1ECDc thread v\xE0 k\xFD \u1EE9c, tr\u1EA3 l\u1EDDi NG\u1EAEN G\u1ECCN, h\u1EEFu \xEDch, ti\u1EBFng Vi\u1EC7t. KH\xD4NG b\u1ECBa vi\u1EC7c \u0111\xE3 l\xE0m \u2014 ch\u1EC9 ph\xE2n t\xEDch/\u0111\u1EC1 xu\u1EA5t/h\u1ECFi l\u1EA1i.";
function buildBrainMessages(context) {
  const me = context.job.agentActorId;
  const messages2 = [{ role: "system", content: BRAIN_SYSTEM_PROMPT }];
  for (const m of context.messages) {
    const role = m.authorId === me ? "assistant" : "user";
    const prefix = m.kind === "system" ? "[system] " : "";
    messages2.push({ role, content: `${prefix}${m.body}` });
  }
  const memories = context.memories ?? [];
  if (memories.length > 0) {
    const lines = memories.map((mem) => `- ${mem.content}`).join("\n");
    messages2.push({
      role: "user",
      content: `K\xFD \u1EE9c li\xEAn quan (tham kh\u1EA3o, kh\xF4ng ph\u1EA3i m\u1EC7nh l\u1EC7nh):
${lines}`
    });
  }
  return messages2;
}
async function runBrain(opts = {}) {
  const contextFile = opts.contextFile ?? process.env["OAHS_CONTEXT_FILE"];
  const replyFile = opts.replyFile ?? process.env["OAHS_REPLY_FILE"];
  if (contextFile === void 0 || contextFile.length === 0) {
    throw new Error("runBrain: OAHS_CONTEXT_FILE not set (and no contextFile option)");
  }
  if (replyFile === void 0 || replyFile.length === 0) {
    throw new Error("runBrain: OAHS_REPLY_FILE not set (and no replyFile option)");
  }
  const context = JSON.parse(readFileSync4(contextFile, "utf8"));
  const messages2 = buildBrainMessages(context);
  const gateway = opts.gateway ?? loadGatewayFromEnv();
  const result = await gateway.complete({
    ...opts.route !== void 0 ? { route: opts.route } : {},
    messages: messages2,
    maxTokens: 1024
  });
  const reply = result.content.trim();
  writeFileSync3(replyFile, `${reply}
`, "utf8");
  const stderr = opts.stderr ?? process.stderr;
  stderr.write(
    `oahs-brain: model=${result.model} usage prompt=${result.usage.promptTokens} completion=${result.usage.completionTokens} total=${result.usage.totalTokens}
`
  );
  return reply;
}

// src/serve.ts
init_src();
import { randomBytes as randomBytes2 } from "node:crypto";
import { mkdirSync as mkdirSync3 } from "node:fs";
import { join as join5 } from "node:path";

// ../spine-api/src/index.ts
init_src();

// ../spine-api/src/auth.ts
import { createHash, randomBytes } from "node:crypto";
import { existsSync as existsSync3, mkdirSync as mkdirSync2, readFileSync as readFileSync5, writeFileSync as writeFileSync4 } from "node:fs";
import { dirname } from "node:path";
function hashToken(token) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}
var TokenStore = class {
  byHash = /* @__PURE__ */ new Map();
  persistPath;
  adminActorId;
  constructor(options) {
    this.persistPath = options?.persistPath;
    if (this.persistPath !== void 0 && existsSync3(this.persistPath)) {
      const raw = JSON.parse(readFileSync5(this.persistPath, "utf8"));
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
  bootstrapAdmin(token, actorId = "admin") {
    this.byHash.set(hashToken(token), { actorId, isAdmin: true });
  }
  /** Issue a fresh token for an actor. The plaintext is returned exactly once. */
  issue(actorId) {
    const token = randomBytes(32).toString("hex");
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
      ...this.adminActorId !== void 0 ? { adminActorId: this.adminActorId } : {}
    };
    for (const [hash, record] of this.byHash) {
      if (record.isAdmin) continue;
      shape.tokens[hash] = { ...record };
    }
    mkdirSync2(dirname(this.persistPath), { recursive: true });
    writeFileSync4(this.persistPath, JSON.stringify(shape, null, 2), "utf8");
  }
};

// ../spine-api/src/server.ts
init_src();
import Fastify from "fastify";

// ../spine-api/src/bus.ts
init_src();
function zodMessage(error) {
  const issues = error.issues;
  if (!Array.isArray(issues)) return String(error);
  return issues.map((issue) => {
    const path = issue.path && issue.path.length > 0 ? issue.path.join(".") : "(root)";
    return `${path}: ${issue.message ?? "invalid"}`;
  }).join("; ");
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
      case "create_actor": {
        requireAdmin(ctx, command);
        const p = parsed;
        const actor = engine.createActor({
          type: p.type,
          displayName: p.displayName,
          ...p.governanceRole !== void 0 ? { governanceRole: p.governanceRole } : {}
        });
        const token = tokens.issue(actor.id);
        return { actor, token };
      }
      case "grant_permission": {
        requireAdmin(ctx, command);
        const p = parsed;
        engine.grant({
          actorId: p.actorId,
          permission: p.permission,
          ...p.scope !== void 0 ? { scope: p.scope } : {}
        });
        return { granted: true };
      }
      case "revoke_permission": {
        requireAdmin(ctx, command);
        const p = parsed;
        engine.revoke({
          actorId: p.actorId,
          permission: p.permission,
          ...p.scope !== void 0 ? { scope: p.scope } : {}
        });
        return { revoked: true };
      }
      case "create_feature": {
        return engine.createFeature({ actorId: ctx.actorId });
      }
      case "create_work_item": {
        const p = parsed;
        return engine.createWorkItem({
          featureId: p.featureId,
          externalKey: p.externalKey,
          title: p.title,
          actorId: ctx.actorId,
          ...p.kind !== void 0 ? { kind: p.kind } : {},
          ...p.specCheckpoint !== void 0 ? { specCheckpoint: p.specCheckpoint } : {},
          ...p.doneCheckpoint !== void 0 ? { doneCheckpoint: p.doneCheckpoint } : {},
          ...p.invokeDevWith !== void 0 ? { invokeDevWith: p.invokeDevWith } : {},
          ...p.dependsOn !== void 0 ? { dependsOn: p.dependsOn } : {}
        });
      }
      case "list_actors": {
        return engine.listActors();
      }
      case "provision_personas": {
        return engine.provisionPersonas({ byActorId: ctx.actorId });
      }
      // -- entitlements (Phase 2, roadmap §3) ----------------------------------
      // No requireAdmin here: authority is decided by the ENGINE from the
      // caller's governance role (byActorId = the authenticated actor).
      case "assign_role": {
        const p = parsed;
        engine.assignRole({ actorId: p.actorId, roleCode: p.roleCode, byActorId: ctx.actorId });
        return { assigned: true };
      }
      case "revoke_role": {
        const p = parsed;
        engine.revokeRole({ actorId: p.actorId, roleCode: p.roleCode, byActorId: ctx.actorId });
        return { revoked: true };
      }
      case "list_role_assignments": {
        const p = parsed;
        return engine.listRoleAssignments(p.actorId);
      }
      case "set_governance_role": {
        const p = parsed;
        engine.setGovernanceRole({ actorId: p.actorId, role: p.role, byActorId: ctx.actorId });
        return { actorId: p.actorId, role: p.role };
      }
      case "set_plan": {
        const p = parsed;
        engine.setPlan({ plan: p.plan, byActorId: ctx.actorId });
        return { plan: engine.getPlan() };
      }
      case "set_workspace_policy": {
        const p = parsed;
        engine.setWorkspacePolicy({
          policy: {
            ...p.policy.agentGateApprovals !== void 0 ? { agentGateApprovals: p.policy.agentGateApprovals } : {},
            ...p.policy.agentSelfDispatch !== void 0 ? { agentSelfDispatch: p.policy.agentSelfDispatch } : {}
          },
          byActorId: ctx.actorId
        });
        return engine.getWorkspacePolicy();
      }
      case "set_gate_policy": {
        const p = parsed;
        engine.setGatePolicy({
          gate: p.gate,
          policy: {
            ...p.policy.minApprovals !== void 0 ? { minApprovals: p.policy.minApprovals } : {},
            ...p.policy.requiredActorTypes !== void 0 ? { requiredActorTypes: [...p.policy.requiredActorTypes] } : {}
          },
          byActorId: ctx.actorId
        });
        return { gate: p.gate, policy: engine.getGatePolicy(p.gate) };
      }
      case "authz_explain": {
        const p = parsed;
        return engine.authzExplain({ actorId: p.actorId, permission: p.permission });
      }
      case "import_stories": {
        const p = parsed;
        return engine.importStories({ featureId: p.featureId, yaml: p.yaml, actorId: ctx.actorId });
      }
      // -- claims --------------------------------------------------------------
      case "claim_task": {
        const p = parsed;
        return engine.claimTask({
          workItemId: p.workItemId,
          actorId: ctx.actorId,
          ...p.ttlMs !== void 0 ? { ttlMs: p.ttlMs } : {}
        });
      }
      case "heartbeat": {
        const p = parsed;
        engine.heartbeat({ claimId: p.claimId });
        return { renewed: true };
      }
      case "release_claim": {
        const p = parsed;
        engine.releaseClaim({
          claimId: p.claimId,
          ...p.reason !== void 0 ? { reason: p.reason } : {}
        });
        return { released: true };
      }
      // -- lifecycle -------------------------------------------------------------
      case "advance_state": {
        const p = parsed;
        return engine.advanceState({
          workItemId: p.workItemId,
          to: p.to,
          actorId: ctx.actorId,
          ...p.fencingToken !== void 0 ? { fencingToken: p.fencingToken } : {},
          ...p.idempotencyKey !== void 0 ? { idempotencyKey: p.idempotencyKey } : {}
        });
      }
      case "block_task": {
        const p = parsed;
        return engine.blockTask({
          workItemId: p.workItemId,
          reason: p.reason,
          actorId: ctx.actorId,
          ...p.fencingToken !== void 0 ? { fencingToken: p.fencingToken } : {}
        });
      }
      case "unblock_task": {
        const p = parsed;
        return engine.unblockTask({ workItemId: p.workItemId, actorId: ctx.actorId });
      }
      case "submit_evidence": {
        const p = parsed;
        engine.submitEvidence({
          workItemId: p.workItemId,
          evidence: p.evidence,
          actorId: ctx.actorId,
          ...p.fencingToken !== void 0 ? { fencingToken: p.fencingToken } : {}
        });
        return { submitted: true };
      }
      case "approve_gate": {
        const p = parsed;
        return engine.approveGate({
          workItemId: p.workItemId,
          gate: p.gate,
          actorId: ctx.actorId,
          ...p.pinnedVerification !== void 0 ? { pinnedVerification: p.pinnedVerification } : {}
        });
      }
      case "reject_gate": {
        const p = parsed;
        return engine.rejectGate({ workItemId: p.workItemId, gate: p.gate, actorId: ctx.actorId });
      }
      case "release_dispatch_hold": {
        const p = parsed;
        return engine.releaseDispatchHold({ featureId: p.featureId, actorId: ctx.actorId });
      }
      // -- collaboration (Phase 3, roadmap §5) ----------------------------------
      // Actor identity ALWAYS from ctx: the poster, reader, notification owner
      // and job completer are the authenticated actor — never a body field.
      case "create_thread": {
        const p = parsed;
        return engine.createThread({
          actorId: ctx.actorId,
          kind: p.kind,
          ...p.featureId !== void 0 ? { featureId: p.featureId } : {},
          ...p.workItemId !== void 0 ? { workItemId: p.workItemId } : {},
          ...p.visibility !== void 0 ? { visibility: p.visibility } : {}
        });
      }
      case "add_thread_participant": {
        const p = parsed;
        return engine.addThreadParticipant({
          threadId: p.threadId,
          actorId: p.actorId,
          byActorId: ctx.actorId
        });
      }
      case "post_message": {
        const p = parsed;
        return engine.postMessage({
          threadId: p.threadId,
          actorId: ctx.actorId,
          body: p.body,
          ...p.replyTo !== void 0 ? { replyTo: p.replyTo } : {},
          ...p.mentions !== void 0 ? { mentions: p.mentions } : {}
        });
      }
      case "list_threads": {
        const p = parsed;
        return engine.listThreads({
          actorId: ctx.actorId,
          // private threads stay invisible to non-participants
          ...p.featureId !== void 0 ? { featureId: p.featureId } : {},
          ...p.workItemId !== void 0 ? { workItemId: p.workItemId } : {}
        });
      }
      case "list_messages": {
        const p = parsed;
        return engine.listMessages({
          threadId: p.threadId,
          actorId: ctx.actorId,
          ...p.sinceSeq !== void 0 ? { sinceSeq: p.sinceSeq } : {}
        });
      }
      case "list_mentions": {
        const p = parsed;
        return engine.listMentions(p.messageId);
      }
      case "list_notifications": {
        const p = parsed;
        return engine.listNotifications({
          actorId: ctx.actorId,
          ...p.unreadOnly !== void 0 ? { unreadOnly: p.unreadOnly } : {}
        });
      }
      case "mark_notification_read": {
        const p = parsed;
        engine.markNotificationRead({ notificationId: p.notificationId, actorId: ctx.actorId });
        return { read: true };
      }
      case "list_agent_jobs": {
        const p = parsed;
        return engine.listAgentJobs({
          ...p.agentActorId !== void 0 ? { agentActorId: p.agentActorId } : {},
          ...p.status !== void 0 ? { status: p.status } : {}
        });
      }
      case "complete_agent_job": {
        const p = parsed;
        return engine.completeAgentJob({
          jobId: p.jobId,
          actorId: ctx.actorId,
          status: p.status,
          ...p.note !== void 0 ? { note: p.note } : {}
        });
      }
      // -- agent memory (Phase 5, roadmap §6) ------------------------------------
      // The memory owner is ALWAYS the ctx actor — no cross-actor parameter
      // exists on the wire, so owner-scoping is structural, not disciplined.
      case "append_agent_memory": {
        const p = parsed;
        return engine.appendAgentMemory({
          actorId: ctx.actorId,
          kind: p.kind,
          content: p.content,
          ...p.sourceThreadId !== void 0 ? { sourceThreadId: p.sourceThreadId } : {}
        });
      }
      case "search_agent_memory": {
        const p = parsed;
        return engine.searchAgentMemory({
          actorId: ctx.actorId,
          ...p.contextThreadId !== void 0 ? { contextThreadId: p.contextThreadId } : {},
          ...p.kind !== void 0 ? { kind: p.kind } : {},
          ...p.query !== void 0 ? { query: p.query } : {}
        });
      }
      // -- reconciliation (roadmap §1.6, detect-only) ----------------------------
      case "reconcile": {
        const p = parsed;
        return engine.reconcile({ files: p.files });
      }
      // -- ops ---------------------------------------------------------------------
      case "force_release_claim": {
        const p = parsed;
        const unreleased = engine.getClaims(p.workItemId).filter((claim) => !claim.released);
        if (unreleased.length === 0) {
          throw new GuardFailedError(`no live claim on work item ${p.workItemId}`);
        }
        for (const claim of unreleased) {
          engine.releaseClaim({ claimId: claim.id, reason: "ops force release" });
        }
        return { released: unreleased.map((claim) => claim.id) };
      }
      // -- queries -------------------------------------------------------------------
      case "get_work_item": {
        const p = parsed;
        return engine.getWorkItem(p.workItemId);
      }
      case "get_feature": {
        const p = parsed;
        return engine.getFeature(p.featureId);
      }
      case "get_task_context": {
        const p = parsed;
        return engine.getTaskContext({ workItemId: p.workItemId });
      }
      case "list_work_items": {
        const p = parsed;
        return engine.listWorkItems({
          ...p.state !== void 0 ? { state: p.state } : {},
          ...p.featureId !== void 0 ? { featureId: p.featureId } : {},
          ...p.claimable !== void 0 ? { claimable: p.claimable } : {}
        });
      }
      case "inbox": {
        const awaitingSpec = engine.listWorkItems({ state: "draft" }).filter((item) => item.specCheckpoint);
        const awaitingReview = engine.listWorkItems({ state: "in_review" });
        return { awaitingSpec, awaitingReview };
      }
      case "query_events": {
        const p = parsed;
        return engine.events(p.streamId);
      }
      case "get_claims": {
        const p = parsed;
        return engine.getClaims(p.workItemId);
      }
      case "whoami": {
        return { actorId: ctx.actorId, isAdmin: ctx.isAdmin };
      }
    }
    throw new GuardFailedError(`command not wired to the bus: ${command}`);
  }
  return { execute, engine };
}

// ../spine-api/src/mcp.ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from "@modelcontextprotocol/sdk/types.js";
var TOOL_TO_COMMAND = new Map(
  COMMANDS.map((command) => [mcpToolName(command.name), command.name])
);
function buildMcpServer(bus, ctx) {
  const server = new Server(
    { name: "oahs-spine", version: "0.0.1" },
    { capabilities: { tools: {} } }
  );
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: COMMANDS.map((command) => ({
      name: mcpToolName(command.name),
      description: command.description,
      // Verbatim from contracts — the parity test deep-equals this.
      inputSchema: inputJsonSchema(command.name)
    }))
  }));
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const commandName = TOOL_TO_COMMAND.get(request.params.name);
    if (commandName === void 0) {
      return {
        content: [{ type: "text", text: `unknown tool: ${request.params.name}` }],
        isError: true
      };
    }
    try {
      const result = await bus.execute(commandName, request.params.arguments ?? {}, ctx);
      return { content: [{ type: "text", text: JSON.stringify(result ?? null) }] };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              error: {
                name: errorName(error),
                message: error instanceof Error ? error.message : String(error)
              }
            })
          }
        ],
        isError: true
      };
    }
  });
  return server;
}
function registerMcpRoute(app, bus, authenticate) {
  app.post("/mcp", async (request, reply) => {
    const ctx = authenticate(request);
    if (ctx === null) {
      return reply.code(401).send({ jsonrpc: "2.0", error: { code: -32001, message: "unauthorized" }, id: null });
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

// ../spine-api/src/sse.ts
function pollingEventTail(engine) {
  return {
    after(globalSeq) {
      return engine.events().filter((event) => event.globalSeq > globalSeq);
    }
  };
}
function parseCursor(request) {
  const lastEventId = request.headers["last-event-id"];
  const raw = typeof lastEventId === "string" && lastEventId.trim() !== "" ? lastEventId : request.query.since;
  if (raw === void 0) return 0;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : 0;
}
function registerEventStream(app, tail, authenticate, options = {}) {
  const pollMs = options.pollMs ?? 300;
  const heartbeatMs = options.heartbeatMs ?? 15e3;
  const cleanups = /* @__PURE__ */ new Set();
  app.addHook("onClose", (_instance, done) => {
    for (const cleanup of [...cleanups]) cleanup();
    done();
  });
  app.get("/events/stream", (request, reply) => {
    const ctx = authenticate(request);
    if (ctx === null) {
      void reply.code(401).send({
        ok: false,
        error: { name: "Error", message: "unauthorized: missing or invalid bearer token" }
      });
      return;
    }
    let cursor = parseCursor(request);
    reply.hijack();
    const res = reply.raw;
    res.writeHead(200, {
      "content-type": "text/event-stream",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no"
    });
    res.write(": connected\n\n");
    const flush = () => {
      for (const event of tail.after(cursor)) {
        cursor = event.globalSeq;
        res.write(`id: ${event.globalSeq}
data: ${JSON.stringify(event)}

`);
      }
    };
    flush();
    const poll = setInterval(flush, pollMs);
    const heartbeat = setInterval(() => {
      res.write(": heartbeat\n\n");
    }, heartbeatMs);
    const cleanup = () => {
      clearInterval(poll);
      clearInterval(heartbeat);
      cleanups.delete(cleanup);
      if (!res.writableEnded) res.end();
    };
    cleanups.add(cleanup);
    res.on("close", cleanup);
  });
}

// ../spine-api/src/ui.ts
import { readFileSync as readFileSync6 } from "node:fs";
import { dirname as dirname2, join as join3 } from "node:path";
import { fileURLToPath } from "node:url";
var publicDir = join3(dirname2(fileURLToPath(import.meta.url)), "..", "public");
var CONTENT_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8"
};
function registerUiRoutes(app) {
  const serve = (routePath, fileName, ext) => {
    app.get(routePath, (_request, reply) => {
      try {
        const content = readFileSync6(join3(publicDir, fileName));
        void reply.type(CONTENT_TYPES[ext] ?? "application/octet-stream").send(content);
      } catch {
        void reply.code(404).send({
          ok: false,
          error: { name: "Error", message: `ui asset not built: ${fileName} (run pnpm build:ui)` }
        });
      }
    });
  };
  serve("/ui", "index.html", ".html");
  serve("/ui/app.js", "app.js", ".js");
  serve("/ui/app.css", "app.css", ".css");
}

// ../spine-api/src/server.ts
function errorName(error) {
  if (error instanceof PermissionDeniedError) return "PermissionDeniedError";
  if (error instanceof ConflictError) return "ConflictError";
  if (error instanceof GuardFailedError) return "GuardFailedError";
  if (error instanceof InvalidTransitionError) return "InvalidTransitionError";
  if (error instanceof StoriesValidationError) return "StoriesValidationError";
  return "Error";
}
function errorEnvelope(error) {
  return {
    ok: false,
    error: {
      name: errorName(error),
      message: error instanceof Error ? error.message : String(error)
    }
  };
}
function ensureBootstrapAdminActor(engine, tokenStore) {
  const persisted = tokenStore.getAdminActorId();
  if (persisted !== void 0) {
    try {
      if (engine.getGovernanceRole(persisted) === "admin") return persisted;
    } catch {
    }
  }
  const actor = engine.createActor({
    type: "user",
    displayName: "Workspace Admin",
    governanceRole: "admin"
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
    if (typeof header !== "string" || !header.startsWith("Bearer ")) return null;
    const resolved = tokenStore.resolve(header.slice("Bearer ".length).trim());
    return resolved === null ? null : { actorId: resolved.actorId, isAdmin: resolved.isAdmin };
  };
  app.get("/healthz", async () => ({ ok: true }));
  app.post("/rpc/:command", async (request, reply) => {
    const ctx = authenticate(request);
    if (ctx === null) {
      return reply.code(401).send({
        ok: false,
        error: { name: "Error", message: "unauthorized: missing or invalid bearer token" }
      });
    }
    const { command } = request.params;
    if (!COMMAND_MAP.has(command)) {
      return reply.code(404).send({
        ok: false,
        error: { name: "Error", message: `unknown command: ${command}` }
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
  registerEventStream(app, pollingEventTail(engine), authenticate, options.eventStream ?? {});
  registerUiRoutes(app);
  return app;
}

// src/serve.ts
var DEFAULT_PORT = 4517;
async function startServe(options = {}) {
  const adminTokenGenerated = options.adminToken === void 0;
  const adminToken = options.adminToken ?? randomBytes2(32).toString("hex");
  let engineKind;
  let engine;
  let tokenStore;
  if (options.dataDir !== void 0) {
    mkdirSync3(options.dataDir, { recursive: true });
    const { createPgSyncEngine: createPgSyncEngine2 } = await Promise.resolve().then(() => (init_src3(), src_exports2));
    engine = createPgSyncEngine2({ dataDir: join5(options.dataDir, "pg") });
    tokenStore = new TokenStore({ persistPath: join5(options.dataDir, "tokens.json") });
    engineKind = "pglite";
  } else {
    engine = createEngine();
    tokenStore = new TokenStore();
    engineKind = "memory";
  }
  const app = await buildServer({ engine, tokenStore, adminToken });
  await app.listen({ port: options.port ?? DEFAULT_PORT, host: options.host ?? "0.0.0.0" });
  const { port } = app.server.address();
  return {
    url: `http://127.0.0.1:${port}`,
    port,
    adminToken,
    adminTokenGenerated,
    engineKind,
    close: async () => {
      await app.close();
    }
  };
}

// src/cli.ts
var DEFAULT_URL = `http://localhost:${DEFAULT_PORT}`;
function clientFrom(flags) {
  const token = flags.token ?? process.env["OAHS_TOKEN"];
  if (token === void 0 || token.length === 0) {
    throw new Error("missing token: pass --token <token> or set OAHS_TOKEN");
  }
  return makeClient({ baseUrl: flags.url, token });
}
function withClientFlags(cmd) {
  return cmd.option("--url <url>", "spine-api base URL", DEFAULT_URL).option("--token <token>", "bearer token (default: env OAHS_TOKEN)");
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
  program.name("oahs").description("oahs \u2014 Open Agents Harness System CLI (spine server + gate-holder commands)");
  program.command("serve").description("start the spine-api (HTTP /rpc/* + MCP /mcp)").option("--port <port>", "TCP port", String(DEFAULT_PORT)).option("--admin-token <token>", "bootstrap admin token (default: env OAHS_ADMIN_TOKEN, else generated)").option("--data <dir>", "persistence directory (durable PGlite + token store)").action(async (opts) => {
    try {
      const adminToken = opts.adminToken ?? process.env["OAHS_ADMIN_TOKEN"];
      const handle = await startServe({
        port: Number(opts.port),
        ...adminToken !== void 0 && adminToken.length > 0 ? { adminToken } : {},
        ...opts.data !== void 0 ? { dataDir: resolve3(opts.data) } : {}
      });
      process.stdout.write(
        `oahs spine-api listening on :${handle.port} (HTTP /rpc/*, MCP /mcp; engine: ${handle.engineKind}${opts.data !== void 0 ? `, data: ${resolve3(opts.data)}` : ""})
`
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
  withClientFlags(program.command("inbox")).description("items awaiting a gate decision (spec approval / review decision)").action(async (opts) => emit(() => inboxCommand(clientFrom(opts))));
  withClientFlags(program.command("approve <workItemId>")).description("approve a gate (spec_approval pins verification commands)").requiredOption("--gate <gate>", "spec_approval | review_approval").option("--pin <cmd>", "pin a verification command (repeatable, spec_approval only)", collect, []).action(
    async (workItemId2, opts) => emit(() => approveCommand(clientFrom(opts), { workItemId: workItemId2, gate: opts.gate, pin: opts.pin }))
  );
  withClientFlags(program.command("advance <workItemId>")).description("advance a work item through the FSM (planning-zone moves for humans)").requiredOption("--to <state>", "target state, e.g. draft | ready_for_dev").option("--fencing-token <n>", "fencing token when acting under a claim", (v) => Number(v)).action(
    async (workItemId2, opts) => emit(
      () => advanceCommand(clientFrom(opts), {
        workItemId: workItemId2,
        to: opts.to,
        ...opts.fencingToken !== void 0 ? { fencingToken: opts.fencingToken } : {}
      })
    )
  );
  withClientFlags(program.command("reject <workItemId>")).description("reject a gate (review rejection fires the deterministic loopback)").requiredOption("--gate <gate>", "spec_approval | review_approval").action(
    async (workItemId2, opts) => emit(() => rejectCommand(clientFrom(opts), { workItemId: workItemId2, gate: opts.gate }))
  );
  withClientFlags(program.command("status")).description("all work items grouped by state, plus feature dispatch holds").action(async (opts) => emit(() => statusCommand(clientFrom(opts))));
  const actor = program.command("actor").description("actor management (admin)");
  withClientFlags(actor.command("create")).description("create a user or agent actor; prints actorId + token (admin only)").requiredOption("--type <type>", "user | agent").requiredOption("--name <name>", "display name").option("--governance-role <role>", "admin | member | auditor (bootstrap plumbing, admin only)").action(
    async (opts) => emit(
      () => actorCreateCommand(clientFrom(opts), {
        type: opts.type,
        name: opts.name,
        ...opts.governanceRole !== void 0 ? { governanceRole: opts.governanceRole } : {}
      })
    )
  );
  withClientFlags(program.command("actors")).description("list ALL actors \u2014 humans, agents, personas, and the system actor").action(async (opts) => emit(() => actorsCommand(clientFrom(opts))));
  const personas = program.command("personas").description("BMAD persona agent actors (roadmap \xA73)");
  withClientFlags(personas.command("provision")).description("idempotently provision the six BMAD personas (governance-admin only, engine-gated)").action(async (opts) => emit(() => personasProvisionCommand(clientFrom(opts))));
  const item = program.command("item").description("single work items (Phase 4: non-code kinds)");
  withClientFlags(item.command("create")).description("create one work item; --kind selects evidence guards, never gate authority").requiredOption("--feature <featureId>", "feature to create the item in").requiredOption("--key <externalKey>", "external key (stories.yaml id vocabulary)").requiredOption("--title <title>", "work item title").option("--kind <kind>", "code | spec_draft | design_review | qa_report | doc (default code)").option("--spec-checkpoint", "require spec_approval before ready_for_dev").option("--done-checkpoint", "hold feature dispatch after this item is done").option("--invoke-dev-with <text>", "agent invocation hint").option("--depends-on <externalKey>", "dependency external key (repeatable)", collect, []).action(
    async (opts) => emit(
      () => itemCreateCommand(clientFrom(opts), {
        featureId: opts.feature,
        externalKey: opts.key,
        title: opts.title,
        ...opts.kind !== void 0 ? { kind: opts.kind } : {},
        ...opts.specCheckpoint === true ? { specCheckpoint: true } : {},
        ...opts.doneCheckpoint === true ? { doneCheckpoint: true } : {},
        ...opts.invokeDevWith !== void 0 ? { invokeDevWith: opts.invokeDevWith } : {},
        ...opts.dependsOn.length > 0 ? { dependsOn: opts.dependsOn } : {}
      })
    )
  );
  withClientFlags(program.command("doclint <file>")).description("deterministic document lint (no LLM); --submit sends doc_lint evidence; exit 1 when not schema-valid").option("--require-section <name>", "required ## section (repeatable)", collect, []).option("--work-item <workItemId>", "work item to submit doc_lint evidence on").option("--submit", "submit {schemaValid, findings} as doc_lint evidence via the rails").option("--fencing-token <n>", "fencing token when acting under a claim", (v) => Number(v)).action(
    async (file, opts) => {
      try {
        const client = opts.submit === true ? clientFrom(opts) : null;
        const { text: text2, exitCode } = await doclintCommand(client, {
          path: file,
          ...opts.requireSection.length > 0 ? { requireSections: opts.requireSection } : {},
          ...opts.workItem !== void 0 ? { workItemId: opts.workItem } : {},
          ...opts.submit === true ? { submit: true } : {},
          ...opts.fencingToken !== void 0 ? { fencingToken: opts.fencingToken } : {}
        });
        process.stdout.write(`${text2}
`);
        process.exitCode = exitCode;
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        process.stderr.write(`${err.name}: ${err.message}
`);
        process.exitCode = 1;
      }
    }
  );
  withClientFlags(program.command("grant <actorId> <permission>")).description("grant a permission to an actor (admin only)").action(
    async (actorId, permission, opts) => emit(() => grantCommand(clientFrom(opts), { actorId, permission }))
  );
  const role = program.command("role").description("delivery roles \u2014 permission bundles (roadmap \xA73)");
  withClientFlags(role.command("assign <actorId> <roleCode>")).description("assign a delivery role to an actor (governance-admin only, engine-gated)").action(
    async (actorId, roleCode, opts) => emit(() => roleAssignCommand(clientFrom(opts), { actorId, roleCode }))
  );
  withClientFlags(role.command("revoke <actorId> <roleCode>")).description("revoke a delivery role from an actor (governance-admin only, engine-gated)").action(
    async (actorId, roleCode, opts) => emit(() => roleRevokeCommand(clientFrom(opts), { actorId, roleCode }))
  );
  withClientFlags(role.command("list [actorId]")).description("list delivery-role assignments (all, or one actor)").action(
    async (actorId, opts) => emit(() => roleListCommand(clientFrom(opts), actorId !== void 0 ? { actorId } : {}))
  );
  const plan = program.command("plan").description("workspace plan \u2014 a ceiling, never a grant (roadmap \xA73)");
  withClientFlags(plan.command("set <plan>")).description("set the workspace plan: free | team | enterprise (governance-admin only)").action(
    async (planCode, opts) => emit(() => planSetCommand(clientFrom(opts), { plan: planCode }))
  );
  const policy = program.command("policy").description("restrict-only workspace policy (roadmap \xA73)");
  withClientFlags(policy.command("set")).description("set restrict-only policy keys (governance-admin only)").option("--agent-gate-approvals <bool>", "true | false \u2014 may agents exercise gate approvals?").option("--agent-self-dispatch <bool>", "true | false \u2014 may agents claim tasks on their own?").action(
    async (opts) => emit(
      () => policySetCommand(clientFrom(opts), {
        ...opts.agentGateApprovals !== void 0 ? { agentGateApprovals: opts.agentGateApprovals } : {},
        ...opts.agentSelfDispatch !== void 0 ? { agentSelfDispatch: opts.agentSelfDispatch } : {}
      })
    )
  );
  const gatePolicy = program.command("gate-policy").description("gate definitions as data (roadmap \xA73)");
  withClientFlags(gatePolicy.command("set <gate>")).description("set quorum/actor-type requirements of a gate (governance-admin only)").option("--min-approvals <n>", "distinct approvers required per review round").option("--require-type <type>", "require at least one approver of this type (repeatable)", collect, []).action(
    async (gate, opts) => emit(
      () => gatePolicySetCommand(clientFrom(opts), {
        gate,
        ...opts.minApprovals !== void 0 ? { minApprovals: opts.minApprovals } : {},
        ...opts.requireType.length > 0 ? { requireTypes: opts.requireType } : {}
      })
    )
  );
  const governance = program.command("governance").description("governance roles (roadmap \xA73)");
  withClientFlags(governance.command("set <actorId> <role>")).description("set an actor governance role: admin | member | auditor (governance-admin only)").action(
    async (actorId, roleCode, opts) => emit(() => governanceSetCommand(clientFrom(opts), { actorId, role: roleCode }))
  );
  withClientFlags(program.command("authz <actorId> <permission>")).description("print the replayable authz decision trace for an actor \xD7 permission (roadmap \xA73)").action(
    async (actorId, permission, opts) => emit(() => authzCommand(clientFrom(opts), { actorId, permission }))
  );
  const feature = program.command("feature").description("feature management");
  withClientFlags(feature.command("create")).description("create a feature; prints featureId").action(async (opts) => emit(() => featureCreateCommand(clientFrom(opts))));
  withClientFlags(program.command("import <featureId> <storiesYamlPath>")).description("import a stories.yaml file into a feature (idempotent)").action(
    async (featureId, storiesYamlPath, opts) => emit(() => importStoriesCommand(clientFrom(opts), { featureId, path: storiesYamlPath }))
  );
  const thread = program.command("thread").description("conversation threads (Phase 3, roadmap \xA75)");
  withClientFlags(thread.command("create")).description("create a thread, optionally bound to a feature/work item").requiredOption("--kind <kind>", "spec | design | task | general | private").option("--feature <featureId>", "bind to a feature").option("--work-item <workItemId>", "bind to a work item (id or externalKey)").option("--visibility <visibility>", "open | private").action(
    async (opts) => emit(
      () => threadCreateCommand(clientFrom(opts), {
        kind: opts.kind,
        ...opts.feature !== void 0 ? { featureId: opts.feature } : {},
        ...opts.workItem !== void 0 ? { workItemId: opts.workItem } : {},
        ...opts.visibility !== void 0 ? { visibility: opts.visibility } : {}
      })
    )
  );
  withClientFlags(thread.command("list")).description("list threads (private ones only when you participate)").option("--feature <featureId>", "filter by feature").option("--work-item <workItemId>", "filter by work item").action(
    async (opts) => emit(
      () => threadListCommand(clientFrom(opts), {
        ...opts.feature !== void 0 ? { featureId: opts.feature } : {},
        ...opts.workItem !== void 0 ? { workItemId: opts.workItem } : {}
      })
    )
  );
  withClientFlags(program.command("post <threadId> <body>")).description("post a message; --mention takes STRUCTURED actor ids (body text is never parsed)").option("--mention <actorId>", "mention an actor by id (repeatable)", collect, []).option("--reply-to <messageId>", "reply to a message").action(
    async (threadId, body, opts) => emit(
      () => postCommand(clientFrom(opts), {
        threadId,
        body,
        ...opts.mention.length > 0 ? { mentions: opts.mention } : {},
        ...opts.replyTo !== void 0 ? { replyTo: opts.replyTo } : {}
      })
    )
  );
  withClientFlags(program.command("messages <threadId>")).description("list messages of a thread (raw authorId; system narration included)").option("--since <seq>", "only messages with seq greater than this", (v) => Number(v)).action(
    async (threadId, opts) => emit(
      () => messagesCommand(clientFrom(opts), {
        threadId,
        ...opts.since !== void 0 ? { sinceSeq: opts.since } : {}
      })
    )
  );
  withClientFlags(program.command("notifications")).description("your own notifications (mentions + agent-job completions)").option("--unread", "only unread notifications").action(
    async (opts) => emit(
      () => notificationsCommand(clientFrom(opts), opts.unread === true ? { unreadOnly: true } : {})
    )
  );
  const job = program.command("job").description("router-materialized agent jobs (reply-only, \xA75.4)");
  withClientFlags(program.command("jobs")).description("list agent jobs").option("--agent <actorId>", "filter by agent actor").option("--status <status>", "queued | done | blocked").action(
    async (opts) => emit(
      () => jobsCommand(clientFrom(opts), {
        ...opts.agent !== void 0 ? { agentActorId: opts.agent } : {},
        ...opts.status !== void 0 ? { status: opts.status } : {}
      })
    )
  );
  withClientFlags(job.command("done <jobId>")).description("complete a job as its agent (notifies the mentioner \u2014 nothing else moves)").option("--note <note>", "completion note").action(
    async (jobId, opts) => emit(
      () => jobCompleteCommand(clientFrom(opts), {
        jobId,
        status: "done",
        ...opts.note !== void 0 ? { note: opts.note } : {}
      })
    )
  );
  const advise = program.command("advise").description("deterministic advisor bots \u2014 read + post only, never a lifecycle mutation");
  withClientFlags(advise.command("next-task")).description("post the suggested claim order (claimable ready_for_dev) into a thread").requiredOption("--thread <threadId>", "thread to post the advice into").action(
    async (opts) => emit(() => adviseNextTaskCommand(clientFrom(opts), { threadId: opts.thread }))
  );
  withClientFlags(advise.command("reconcile")).description("post the detect-only file\u2194DB divergence report into a thread").requiredOption("--thread <threadId>", "thread to post the advice into").requiredOption("--file <pair>", "one <workItemId>=<frontmatterStatus> pair (repeatable)", collect, []).action(
    async (opts) => emit(
      () => adviseReconcileCommand(clientFrom(opts), { threadId: opts.thread, files: opts.file })
    )
  );
  withClientFlags(program.command("memory")).description("your OWN agent memories (owner-scoped by construction \u2014 no cross-actor parameter exists)").option("--kind <kind>", "episodic | procedural | entity").option("--query <text>", "case-insensitive substring filter").option("--context <threadId>", "recall context thread (gates private-sourced memories, \xA76)").action(
    async (opts) => emit(
      () => memoryCommand(clientFrom(opts), {
        ...opts.kind !== void 0 ? { kind: opts.kind } : {},
        ...opts.query !== void 0 ? { query: opts.query } : {},
        ...opts.context !== void 0 ? { contextThreadId: opts.context } : {}
      })
    )
  );
  const stats = program.command("stats").description("deterministic delivery metrics (roadmap \xA76)");
  withClientFlags(stats.command("reviews")).description("review-loop convergence per kind + per item \u2014 the improve-week-over-week measuring stick").action(async (opts) => emit(() => statsReviewsCommand(clientFrom(opts))));
  withClientFlags(program.command("events [streamId]")).description("audit query over the append-only event log").action(
    async (streamId, opts) => emit(
      () => eventsCommand(clientFrom(opts), streamId !== void 0 ? { streamId } : {})
    )
  );
  withClientFlags(program.command("work")).description("run the BYO worker loop (coding) or --jobs: the teammate jobs loop (reply-only, roadmap \xA76)").option("--jobs", "serve reply-only agent jobs for THIS token\u2019s agent (mention-dispatch, zero lifecycle authority)").option("--repo <path>", "target project git checkout (coding mode)").option("--spec-folder <rel>", "spec folder relative to the repo root (coding mode)").requiredOption(
    "--agent-cmd <template>",
    "agent command template (coding: {SPEC_FOLDER} {STORY_ID} {INVOKE_WITH} {WORKTREE}; jobs: {CONTEXT_FILE} {REPLY_FILE} {THREAD_ID} {JOB_ID})"
  ).option("--once", "run at most one dispatch/job cycle, then exit").option("--poll <ms>", "poll interval in milliseconds").action(
    async (opts) => {
      try {
        const client = clientFrom(opts);
        const runner = await Promise.resolve().then(() => (init_src2(), src_exports));
        if (opts.jobs === true) {
          const me = await client.call("whoami");
          await runner.jobsLoop({
            client,
            agentActorId: me.actorId,
            agentCmd: opts.agentCmd,
            ...opts.poll !== void 0 ? { pollMs: Number(opts.poll) } : {},
            ...opts.once === true ? { once: true } : {}
          });
          return;
        }
        if (opts.repo === void 0 || opts.specFolder === void 0) {
          throw new Error("coding mode requires --repo and --spec-folder (or pass --jobs)");
        }
        await runner.workLoop({
          client,
          repoPath: resolve3(opts.repo),
          specFolder: opts.specFolder,
          agentCmd: opts.agentCmd,
          ...opts.poll !== void 0 ? { pollMs: Number(opts.poll) } : {},
          ...opts.once === true ? { once: true } : {}
        });
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        process.stderr.write(`oahs work failed \u2014 ${err.name}: ${err.message}
`);
        process.exitCode = 1;
      }
    }
  );
  program.command("models").description("list the models the configured model gateway can reach (roadmap \xA72.5)").action(async () => emit(() => modelsCommand()));
  program.command("ping").description("send one short prompt through the gateway; print reply + token usage").option("--message <text>", "the prompt to send").option("--route <route>", "persona route to resolve to a model").option("--model <model>", "explicit model id (overrides the route)").action(
    async (opts) => emit(
      () => pingCommand({
        ...opts.message !== void 0 ? { message: opts.message } : {},
        ...opts.route !== void 0 ? { route: opts.route } : {},
        ...opts.model !== void 0 ? { model: opts.model } : {}
      })
    )
  );
  program.command("brain").description(
    "teammate BRAIN: read OAHS_CONTEXT_FILE (job/messages/memories), ask the gateway, write OAHS_REPLY_FILE (the jobs-runtime agent-cmd; roadmap \xA72.5/\xA76)"
  ).option("--context-file <path>", "context JSON (default: env OAHS_CONTEXT_FILE)").option("--reply-file <path>", "reply text out (default: env OAHS_REPLY_FILE)").option("--route <route>", "persona route to resolve to a model").action(async (opts) => {
    try {
      await runBrain({
        ...opts.contextFile !== void 0 ? { contextFile: opts.contextFile } : {},
        ...opts.replyFile !== void 0 ? { replyFile: opts.replyFile } : {},
        ...opts.route !== void 0 ? { route: opts.route } : {}
      });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      process.stderr.write(`oahs brain failed \u2014 ${err.name}: ${err.message}
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
export {
  buildProgram,
  main
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vLi4vLi4vcGFja2FnZXMvY29yZS9zcmMvdHlwZXMudHMiLCAiLi4vLi4vLi4vcGFja2FnZXMvY29yZS9zcmMvc3Rvcmllcy50cyIsICIuLi8uLi8uLi9wYWNrYWdlcy9jb3JlL3NyYy9lbmdpbmUudHMiLCAiLi4vLi4vLi4vcGFja2FnZXMvY29yZS9zcmMvaW50ZW50LWhhc2gudHMiLCAiLi4vLi4vLi4vcGFja2FnZXMvY29yZS9zcmMvaW5kZXgudHMiLCAiLi4vLi4vLi4vcGFja2FnZXMvcnVubmVyL3NyYy9kb2NsaW50LnRzIiwgIi4uLy4uLy4uL3BhY2thZ2VzL3J1bm5lci9zcmMvam9icy50cyIsICIuLi8uLi8uLi9wYWNrYWdlcy9ydW5uZXIvc3JjL2luZGV4LnRzIiwgIi4uLy4uLy4uL3BhY2thZ2VzL2RiL3NyYy9zY2hlbWEudHMiLCAiLi4vLi4vLi4vcGFja2FnZXMvZGIvc3JjL3BnLWVuZ2luZS50cyIsICIuLi8uLi8uLi9wYWNrYWdlcy9kYi9zcmMvc3luYy1lbmdpbmUudHMiLCAiLi4vLi4vLi4vcGFja2FnZXMvZGIvc3JjL3NjaGVtYS1zcWwudHMiLCAiLi4vLi4vLi4vcGFja2FnZXMvZGIvc3JjL2luZGV4LnRzIiwgIi4uL3NyYy9jbGkudHMiLCAiLi4vLi4vLi4vcGFja2FnZXMvY29udHJhY3RzL3NyYy9pbmRleC50cyIsICIuLi9zcmMvY29tbWFuZHMvaW5kZXgudHMiLCAiLi4vc3JjL2Zvcm1hdC50cyIsICIuLi9zcmMvY29tbWFuZHMvY29sbGFiLnRzIiwgIi4uL3NyYy9jb21tYW5kcy9waGFzZTUudHMiLCAiLi4vLi4vLi4vcGFja2FnZXMvZ2F0ZXdheS9zcmMvcHJvdmlkZXIudHMiLCAiLi4vLi4vLi4vcGFja2FnZXMvZ2F0ZXdheS9zcmMvbWV0ZXIudHMiLCAiLi4vLi4vLi4vcGFja2FnZXMvZ2F0ZXdheS9zcmMvZ2F0ZXdheS50cyIsICIuLi9zcmMvY29tbWFuZHMvZ2F0ZXdheS50cyIsICIuLi9zcmMvYWdlbnQtYnJhaW4udHMiLCAiLi4vc3JjL3NlcnZlLnRzIiwgIi4uLy4uL3NwaW5lLWFwaS9zcmMvaW5kZXgudHMiLCAiLi4vLi4vc3BpbmUtYXBpL3NyYy9hdXRoLnRzIiwgIi4uLy4uL3NwaW5lLWFwaS9zcmMvc2VydmVyLnRzIiwgIi4uLy4uL3NwaW5lLWFwaS9zcmMvYnVzLnRzIiwgIi4uLy4uL3NwaW5lLWFwaS9zcmMvbWNwLnRzIiwgIi4uLy4uL3NwaW5lLWFwaS9zcmMvc3NlLnRzIiwgIi4uLy4uL3NwaW5lLWFwaS9zcmMvdWkudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbIi8qKlxuICogQG9haHMvY29yZSBcdTIwMTQgdHlwZXMsIGVycm9ycywgYW5kIHZvY2FidWxhcnkgb2YgdGhlIGRldGVybWluaXN0aWMgc3BpbmUuXG4gKlxuICogVGhlIGNvbmZvcm1hbmNlIHN1aXRlIGluIHRlc3QvIHdhcyB3cml0dGVuIEZJUlNULCBmcm9tIHRoZSBwcm9zZSBydWxlcyBpblxuICogdGhlIEJNQUQgc291cmNlIChibWFkLXNwcmludC1wbGFubmluZywgYm1hZC1kZXYtYXV0bywgYm1hZC1xdWljay1kZXYsXG4gKiBzdG9yaWVzLXNjaGVtYS5tZCkgYXMgYXJiaXRyYXRlZCBpbiBwcm9kdWN0LXJvYWRtYXAubWQgXHUwMEE3MS4gVGhlIGVuZ2luZSBpc1xuICogaW1wbGVtZW50ZWQgdG8gbWFrZSB0aGF0IHN1aXRlIHBhc3MgXHUyMDE0IG5ldmVyIHRoZSBvdGhlciB3YXkgYXJvdW5kLlxuICpcbiAqIEludmFyaWFudHMgZW5mb3JjZWQgaGVyZSBmb3JldmVyIChwcm9kdWN0LXJvYWRtYXAubWQgXHUwMEE3MC4xKTpcbiAqICAtIE5vIExMTSBTREsgaW1wb3J0LiBFdmVyLiAoQ0kgbGludClcbiAqICAtIEV2ZXJ5IG11dGF0aW9uIGdvZXMgdGhyb3VnaCBhIGNvbW1hbmQ7IGNvbW1hbmRzIGVtaXQgZXZlbnRzOyBwcm9qZWN0aW9uc1xuICogICAgYXJlIGNvbnNlcXVlbmNlcyBvZiBldmVudHMuXG4gKi9cblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBFcnJvcnNcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5leHBvcnQgY2xhc3MgTm90SW1wbGVtZW50ZWRFcnJvciBleHRlbmRzIEVycm9yIHtcbiAgY29uc3RydWN0b3Iod2hhdDogc3RyaW5nKSB7XG4gICAgc3VwZXIoYE5vdCBpbXBsZW1lbnRlZDogJHt3aGF0fWApO1xuICAgIHRoaXMubmFtZSA9ICdOb3RJbXBsZW1lbnRlZEVycm9yJztcbiAgfVxufVxuXG4vKiogQ29tbWFuZCByZWplY3RlZDogYWN0b3IgbGFja3MgdGhlIHJlcXVpcmVkIGdyYW50LiAqL1xuZXhwb3J0IGNsYXNzIFBlcm1pc3Npb25EZW5pZWRFcnJvciBleHRlbmRzIEVycm9yIHtcbiAgY29uc3RydWN0b3IoXG4gICAgcHVibGljIHJlYWRvbmx5IHBlcm1pc3Npb246IFBlcm1pc3Npb24sXG4gICAgcHVibGljIHJlYWRvbmx5IGFjdG9ySWQ6IHN0cmluZyxcbiAgKSB7XG4gICAgc3VwZXIoYHBlcm1pc3Npb24gZGVuaWVkOiAke3Blcm1pc3Npb259IGZvciBhY3RvciAke2FjdG9ySWR9YCk7XG4gICAgdGhpcy5uYW1lID0gJ1Blcm1pc3Npb25EZW5pZWRFcnJvcic7XG4gIH1cbn1cblxuLyoqIENvbW1hbmQgcmVqZWN0ZWQ6IEZTTSBndWFyZCBmYWlsZWQgKGluY2x1ZGVzIHRoZSBtYWNoaW5lLXJlYWRhYmxlIGd1YXJkIGNvZGUpLiAqL1xuZXhwb3J0IGNsYXNzIEd1YXJkRmFpbGVkRXJyb3IgZXh0ZW5kcyBFcnJvciB7XG4gIGNvbnN0cnVjdG9yKHB1YmxpYyByZWFkb25seSBndWFyZDogc3RyaW5nKSB7XG4gICAgc3VwZXIoYGd1YXJkIGZhaWxlZDogJHtndWFyZH1gKTtcbiAgICB0aGlzLm5hbWUgPSAnR3VhcmRGYWlsZWRFcnJvcic7XG4gIH1cbn1cblxuLyoqIENvbW1hbmQgcmVqZWN0ZWQ6IHN0YWxlIGZlbmNpbmcgdG9rZW4gb3Igc3RhdGVfdmVyc2lvbiBjb25mbGljdCAoSFRUUCA0MDkgc2VtYW50aWNzKS4gKi9cbmV4cG9ydCBjbGFzcyBDb25mbGljdEVycm9yIGV4dGVuZHMgRXJyb3Ige1xuICBjb25zdHJ1Y3RvcihwdWJsaWMgcmVhZG9ubHkgcmVhc29uOiBzdHJpbmcpIHtcbiAgICBzdXBlcihgY29uZmxpY3Q6ICR7cmVhc29ufWApO1xuICAgIHRoaXMubmFtZSA9ICdDb25mbGljdEVycm9yJztcbiAgfVxufVxuXG4vKiogVHJhbnNpdGlvbiBub3QgZGVjbGFyZWQgaW4gdGhlIHRhYmxlIChpbmNsdWRlcyBuZXZlci1kb3duZ3JhZGUgcmVqZWN0aW9ucykuICovXG5leHBvcnQgY2xhc3MgSW52YWxpZFRyYW5zaXRpb25FcnJvciBleHRlbmRzIEVycm9yIHtcbiAgY29uc3RydWN0b3IoXG4gICAgcHVibGljIHJlYWRvbmx5IGZyb206IFdvcmtJdGVtU3RhdGUsXG4gICAgcHVibGljIHJlYWRvbmx5IHRvOiBXb3JrSXRlbVN0YXRlLFxuICApIHtcbiAgICBzdXBlcihgaW52YWxpZCB0cmFuc2l0aW9uOiAke2Zyb219IC0+ICR7dG99YCk7XG4gICAgdGhpcy5uYW1lID0gJ0ludmFsaWRUcmFuc2l0aW9uRXJyb3InO1xuICB9XG59XG5cbi8qKiBzdG9yaWVzLnlhbWwgZmFpbGVkIGEgdmFsaWRpdHkgcnVsZSAoc3Rvcmllcy1zY2hlbWEubWQpLiAqL1xuZXhwb3J0IGNsYXNzIFN0b3JpZXNWYWxpZGF0aW9uRXJyb3IgZXh0ZW5kcyBFcnJvciB7XG4gIGNvbnN0cnVjdG9yKHB1YmxpYyByZWFkb25seSBydWxlOiBzdHJpbmcpIHtcbiAgICBzdXBlcihgc3Rvcmllcy55YW1sIGludmFsaWQ6ICR7cnVsZX1gKTtcbiAgICB0aGlzLm5hbWUgPSAnU3Rvcmllc1ZhbGlkYXRpb25FcnJvcic7XG4gIH1cbn1cblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBWb2NhYnVsYXJ5IChwcm9kdWN0LXJvYWRtYXAubWQgXHUwMEE3MC4yLCBcdTAwQTcxLjEpXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuZXhwb3J0IHR5cGUgQWN0b3JUeXBlID0gJ3VzZXInIHwgJ2FnZW50JyB8ICdzeXN0ZW0nO1xuXG5leHBvcnQgY29uc3QgV09SS19JVEVNX1NUQVRFUyA9IFtcbiAgJ2JhY2tsb2cnLFxuICAnZHJhZnQnLFxuICAncmVhZHlfZm9yX2RldicsXG4gICdpbl9wcm9ncmVzcycsXG4gICdpbl9yZXZpZXcnLFxuICAnZG9uZScsXG5dIGFzIGNvbnN0O1xuZXhwb3J0IHR5cGUgV29ya0l0ZW1TdGF0ZSA9ICh0eXBlb2YgV09SS19JVEVNX1NUQVRFUylbbnVtYmVyXTtcblxuLyoqIGJsb2NrZWQgaXMgYW4gT1ZFUkxBWSwgbm90IGEgc3RhdGUgKHJvYWRtYXAgRDgpLiBUYXhvbm9teSBmcm9tIGRldi1hdXRvIEhBTFQuICovXG5leHBvcnQgY29uc3QgQkxPQ0tFRF9SRUFTT05TID0gW1xuICAndW5jbGVhcl9pbnRlbnQnLFxuICAnbm9fc3Rvcmllc195YW1sX2ZvdW5kJyxcbiAgJ2FtYmlndW91c19zdG9yeV9maWxlX21hdGNoJyxcbiAgJ3Jldmlld19ub25fY29udmVyZ2VuY2UnLFxuICAnbm9fc3ViYWdlbnRzJyxcbiAgJ2RpcnR5X3RyZWUnLFxuICAnc3RhbGVfd29ya3RyZWUnLFxuICAnYXdhaXRpbmdfaHVtYW5faW5wdXQnLFxuICAnb3RoZXInLFxuXSBhcyBjb25zdDtcbmV4cG9ydCB0eXBlIEJsb2NrZWRSZWFzb24gPSAodHlwZW9mIEJMT0NLRURfUkVBU09OUylbbnVtYmVyXTtcblxuZXhwb3J0IHR5cGUgUGVybWlzc2lvbiA9XG4gIHwgJ3Rhc2sucGxhbidcbiAgfCAndGFzay5jbGFpbSdcbiAgfCAndGFzay5hZHZhbmNlJ1xuICB8ICd0YXNrLmJsb2NrJ1xuICB8ICdnYXRlLnNwZWMuYXBwcm92ZSdcbiAgfCAnZ2F0ZS5yZXZpZXcuYXBwcm92ZSdcbiAgfCAnZ2F0ZS5yZXZpZXcucmVqZWN0JyAvLyBQaGFzZSAyOiByZWplY3Rpb24tbG9vcGJhY2sgV0lUSE9VVCBkb25lLWFwcHJvdmFsIChyb2FkbWFwIFBoYXNlIDIgZXhpdCBjcml0ZXJpb24pXG4gIHwgJ2ZlYXR1cmUuaW5pdCdcbiAgfCAnZmVhdHVyZS5hZHZhbmNlJ1xuICB8ICdkaXNwYXRjaC5yZWxlYXNlX2hvbGQnXG4gIHwgJ2ludGVudC5lZGl0J1xuICB8ICdzdGF0ZS5kb3duZ3JhZGUnXG4gIHwgJ29wcy5mb3JjZV9yZWxlYXNlX2NsYWltJ1xuICB8ICdnb3Zlcm5hbmNlLmFkbWluJyAvLyBQaGFzZSAyOiBhdXRob3JpdHkgb3ZlciBnYXRlZCBlbnRpdGxlbWVudCB3cml0ZXMgKGhlbGQgdmlhIGdvdmVybmFuY2Ugcm9sZSwgbm90IGdyYW50cylcbiAgLy8gUGhhc2UgMyBpZGVudGl0eS92aXNpYmlsaXR5IGF1dGhvcml0aWVzIChjaGVja2VkIHN0cnVjdHVyYWxseSwgbm90IHZpYSBncmFudHMpOlxuICB8ICd0aHJlYWQucG9zdCdcbiAgfCAndGhyZWFkLnJlYWQnXG4gIHwgJ3RocmVhZC5pbnZpdGUnXG4gIHwgJ2FnZW50X2pvYi5jb21wbGV0ZSc7XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gRW50aXRsZW1lbnRzIChQaGFzZSAyLCByb2FkbWFwIFx1MDBBNzMpOiBwbGFuIFx1MDBENyBnb3Zlcm5hbmNlIHJvbGUgXHUwMEQ3IGRlbGl2ZXJ5IHJvbGUuXG4vLyBSZXNvbHV0aW9uIGlzIGEgUFVSRSBmdW5jdGlvbiBvdmVyIHRoaXMgZGF0YSBcdTIwMTQgbm8gaW50ZXJwcmV0YXRpb24gYW55d2hlcmUuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuZXhwb3J0IHR5cGUgR292ZXJuYW5jZVJvbGUgPSAnYWRtaW4nIHwgJ21lbWJlcicgfCAnYXVkaXRvcic7XG5cbmV4cG9ydCB0eXBlIFBsYW5Db2RlID0gJ2ZyZWUnIHwgJ3RlYW0nIHwgJ2VudGVycHJpc2UnO1xuXG4vKipcbiAqIFBsYW4gaXMgYSBDRUlMSU5HLCBuZXZlciBhIGdyYW50IChyb2FkbWFwIFx1MDBBNzMpLiBJdCBib3VuZHMgd2hhdCBtYXkgYmVcbiAqIGdyYW50ZWQgdG8gQUdFTlQgYWN0b3JzOyB1c2VyIGFjdG9ycyBhcmUgbmV2ZXIgcGxhbi1maWx0ZXJlZC4gRW5mb3JjZWQgaW5cbiAqIHRoZSByZXNvbHZlciBhbmQgYXQgZ3JhbnQgdGltZSBcdTIwMTQgbm93aGVyZSBlbHNlLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIFBsYW5DZWlsaW5nIHtcbiAgLyoqIG1heSBhZ2VudHMgaG9sZCBnYXRlLUFQUFJPVkFMIHBlcm1pc3Npb25zIChzcGVjL3JldmlldyBhcHByb3ZlKT8gKi9cbiAgYWdlbnRHYXRlQXBwcm92ZTogYm9vbGVhbjtcbiAgLyoqIG1heSBhZ2VudHMgaG9sZCB0aGUgcmVqZWN0aW9uLWxvb3BiYWNrIHBlcm1pc3Npb24/ICovXG4gIGFnZW50R2F0ZVJlamVjdDogYm9vbGVhbjtcbn1cblxuZXhwb3J0IGNvbnN0IFBMQU5fQ0VJTElOR1M6IFJlY29yZDxQbGFuQ29kZSwgUGxhbkNlaWxpbmc+ID0ge1xuICBmcmVlOiB7IGFnZW50R2F0ZUFwcHJvdmU6IGZhbHNlLCBhZ2VudEdhdGVSZWplY3Q6IGZhbHNlIH0sXG4gIHRlYW06IHsgYWdlbnRHYXRlQXBwcm92ZTogZmFsc2UsIGFnZW50R2F0ZVJlamVjdDogdHJ1ZSB9LFxuICBlbnRlcnByaXNlOiB7IGFnZW50R2F0ZUFwcHJvdmU6IHRydWUsIGFnZW50R2F0ZVJlamVjdDogdHJ1ZSB9LFxufTtcblxuLyoqIFNlbGYtaG9zdCBkZWZhdWx0OiB0aGUgY2VpbGluZyBpcyBvcGVuOyB0aGUgb3JnIG5hcnJvd3MgKHJlc3RyaWN0LW9ubHkpLiAqL1xuZXhwb3J0IGNvbnN0IERFRkFVTFRfUExBTjogUGxhbkNvZGUgPSAnZW50ZXJwcmlzZSc7XG5cbi8qKiBHYXRlLWFwcHJvdmFsIHBlcm1pc3Npb25zIGJvdW5kZWQgYnkgUGxhbkNlaWxpbmcuYWdlbnRHYXRlQXBwcm92ZS4gKi9cbmV4cG9ydCBjb25zdCBBR0VOVF9HQVRFX0FQUFJPVkVfUEVSTUlTU0lPTlM6IHJlYWRvbmx5IFBlcm1pc3Npb25bXSA9IFtcbiAgJ2dhdGUuc3BlYy5hcHByb3ZlJyxcbiAgJ2dhdGUucmV2aWV3LmFwcHJvdmUnLFxuXTtcblxuLyoqXG4gKiBEZWxpdmVyeSByb2xlcyAocm9hZG1hcCBcdTAwQTczKSBcdTIwMTQgcGVybWlzc2lvbiBidW5kbGVzLCB2ZXJzaW9uZWQgZGF0YSBvZiB0aGVcbiAqIFJ1bGVzIGxheWVyLiBBbiBhc3NpZ25tZW50IGdyYW50cyB0aGUgYnVuZGxlOyByZXZvY2F0aW9uIHJlbW92ZXMgaXQuXG4gKi9cbmV4cG9ydCBjb25zdCBERUxJVkVSWV9ST0xFUzogUmVjb3JkPHN0cmluZywgcmVhZG9ubHkgUGVybWlzc2lvbltdPiA9IHtcbiAgcHJvZHVjdF9vd25lcjogWyd0YXNrLnBsYW4nLCAnZmVhdHVyZS5pbml0JywgJ2ZlYXR1cmUuYWR2YW5jZScsICdnYXRlLnNwZWMuYXBwcm92ZScsICdkaXNwYXRjaC5yZWxlYXNlX2hvbGQnXSxcbiAgdGVjaF9sZWFkOiBbJ3Rhc2sucGxhbicsICdnYXRlLnJldmlldy5hcHByb3ZlJywgJ2dhdGUucmV2aWV3LnJlamVjdCcsICdzdGF0ZS5kb3duZ3JhZGUnLCAnb3BzLmZvcmNlX3JlbGVhc2VfY2xhaW0nXSxcbiAgcmV2aWV3ZXI6IFsnZ2F0ZS5yZXZpZXcuYXBwcm92ZScsICdnYXRlLnJldmlldy5yZWplY3QnXSxcbiAgZGV2ZWxvcGVyOiBbJ3Rhc2suY2xhaW0nLCAndGFzay5hZHZhbmNlJywgJ3Rhc2suYmxvY2snXSxcbiAgcWE6IFsndGFzay5ibG9jayddLFxuICBjb250cmlidXRvcjogW10sXG59O1xuXG4vKipcbiAqIFdvcmtzcGFjZSBwb2xpY3kgXHUyMDE0IFJFU1RSSUNULU9OTFkga2V5cyAocm9hZG1hcCBcdTAwQTczKTogYSBwb2xpY3kgY2FuIG5hcnJvd1xuICogd2hhdCB0aGUgcGxhbiBhbGxvd3MsIG5ldmVyIHdpZGVuIGl0LiBVbmRlZmluZWQgPSBubyByZXN0cmljdGlvbi5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBXb3Jrc3BhY2VQb2xpY3kge1xuICAvKiogZmFsc2UgXHUyMUQyIGFnZW50cyBjYW5ub3QgZXhlcmNpc2UgZ2F0ZS1hcHByb3ZhbCBwZXJtaXNzaW9ucyBldmVuIGlmIGdyYW50ZWQgKi9cbiAgYWdlbnRHYXRlQXBwcm92YWxzPzogYm9vbGVhbjtcbiAgLyoqIGZhbHNlIFx1MjFEMiBhZ2VudHMgY2Fubm90IGNsYWltIHRhc2tzIG9uIHRoZWlyIG93biAobWVudGlvbi1kaXNwYXRjaCBvbmx5LCBQaGFzZSAzKSAqL1xuICBhZ2VudFNlbGZEaXNwYXRjaD86IGJvb2xlYW47XG4gIC8qKiBmYWxzZSBcdTIxRDIgbWVudGlvbnMgb2YgYWdlbnRzIG5ldmVyIG1hdGVyaWFsaXplIGpvYnMgKFBoYXNlIDMgcm91dGVyIGtpbGwtc3dpdGNoKSAqL1xuICBtZW50aW9uRGlzcGF0Y2g/OiBib29sZWFuO1xuICAvKiogdHJ1ZSBcdTIxRDIgYW4gYWdlbnQncyBtZW50aW9uIG9mIGFub3RoZXIgYWdlbnQgbWF5IG1hdGVyaWFsaXplIGEgam9iIChkZXB0aC1jYXBwZWQpOyBkZWZhdWx0IE9GRiAoXHUwMEE3NS40KSAqL1xuICBhZ2VudE1lbnRpb25BZ2VudD86IGJvb2xlYW47XG59XG5cbi8qKiBHYXRlIGRlZmluaXRpb25zIGFyZSBkYXRhIChyb2FkbWFwIFx1MDBBNzMpOiBxdW9ydW0gKyBhY3Rvci10eXBlIHJlcXVpcmVtZW50cy4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgR2F0ZVBvbGljeSB7XG4gIC8qKiBkaXN0aW5jdCBhcHByb3ZlcnMgcmVxdWlyZWQgaW4gdGhlIGN1cnJlbnQgcmV2aWV3IHJvdW5kIChkZWZhdWx0IDEpICovXG4gIG1pbkFwcHJvdmFscz86IG51bWJlcjtcbiAgLyoqIGF0IGxlYXN0IG9uZSBhcHByb3ZlciBvZiBlYWNoIGxpc3RlZCB0eXBlIGlzIHJlcXVpcmVkIChlLmcuIFsndXNlciddKSAqL1xuICByZXF1aXJlZEFjdG9yVHlwZXM/OiBBY3RvclR5cGVbXTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBSb2xlQXNzaWdubWVudCB7XG4gIGFjdG9ySWQ6IHN0cmluZztcbiAgcm9sZUNvZGU6IHN0cmluZztcbiAgZ3JhbnRlZEJ5OiBzdHJpbmc7XG4gIHJldm9rZWQ6IGJvb2xlYW47XG59XG5cbi8qKiBhdXRoei5leHBsYWluIFx1MjAxNCB0aGUgZGVjaXNpb24gdHJhY2UgYW4gYXVkaXRvciBjYW4gcmVwbGF5IChyb2FkbWFwIFx1MDBBNzMpLiAqL1xuZXhwb3J0IGludGVyZmFjZSBBdXRoekV4cGxhbmF0aW9uIHtcbiAgYWN0b3JJZDogc3RyaW5nO1xuICBwZXJtaXNzaW9uOiBQZXJtaXNzaW9uO1xuICBhbGxvd2VkOiBib29sZWFuO1xuICAvKiogJ2RpcmVjdCcgfCAncm9sZTo8Y29kZT4nIHdoZW4gYSBncmFudCBleGlzdHM7IG51bGwgd2hlbiBub25lIGRvZXMgKi9cbiAgc291cmNlOiBzdHJpbmcgfCBudWxsO1xuICBnb3Zlcm5hbmNlUm9sZTogR292ZXJuYW5jZVJvbGU7XG4gIHBsYW46IFBsYW5Db2RlO1xuICAvKiogZmFsc2Ugd2hlbiB0aGUgcGxhbiBjZWlsaW5nIGJsb2NrcyBhbiBhZ2VudCdzIGdhdGUgcGVybWlzc2lvbiAqL1xuICBwbGFuQWxsb3dzOiBib29sZWFuO1xuICAvKiogZmFsc2Ugd2hlbiB0aGUgcmVzdHJpY3Qtb25seSB3b3Jrc3BhY2UgcG9saWN5IGJsb2NrcyBpdCAqL1xuICBwb2xpY3lBbGxvd3M6IGJvb2xlYW47XG4gIHZlcnNpb25zOiB7IHBsYW46IG51bWJlcjsgcG9saWN5OiBudW1iZXIgfTtcbn1cblxuZXhwb3J0IHR5cGUgR2F0ZUNvZGUgPSAnc3BlY19hcHByb3ZhbCcgfCAncmV2aWV3X2FwcHJvdmFsJztcblxuZXhwb3J0IHR5cGUgRXZpZGVuY2VLaW5kID1cbiAgfCAndGVzdF9ydW4nIC8vIHtjb21tYW5kLCBleGl0Q29kZX0gIFx1MjAxNCBjb21tYW5kIE1VU1QgbWF0Y2ggYSBwaW5uZWQgb25lXG4gIHwgJ2dpdF9kaWZmJyAvLyB7YmFzZWxpbmUsIGZpbmFsLCBmaWxlc0NoYW5nZWQsIG5vbkVtcHR5LCBicmFuY2h9XG4gIHwgJ2NvbW1pdCcgLy8ge3NoYSwgYnJhbmNoLCByZWFjaGFibGVPblJlbW90ZX1cbiAgfCAnaGFsdF9yZXBvcnQnIC8vIHZlcmJhdGltIEF1dG8gUnVuIFJlc3VsdFxuICB8ICdyZXZpZXdfcmVwb3J0JyAvLyBMTE0tYXV0aG9yZWQ7IE5FVkVSIGEgZ3VhcmQsIGNvbnRleHQgb25seVxuICB8ICdkb2NfbGludCc7IC8vIHtzY2hlbWFWYWxpZH0gZm9yIG5vbi1jb2RlIHdvcmtcblxuZXhwb3J0IGludGVyZmFjZSBFdmlkZW5jZSB7XG4gIGtpbmQ6IEV2aWRlbmNlS2luZDtcbiAgcGF5bG9hZDogUmVjb3JkPHN0cmluZywgdW5rbm93bj47XG59XG5cbi8qKiBSZXZpZXcgbG9vcDogZXhhY3RseSB0aGlzIG1hbnkgbG9vcGJhY2tzIGFsbG93ZWQ7IHRoZSBuZXh0IG9uZSBibG9ja3MuICovXG5leHBvcnQgY29uc3QgUkVWSUVXX0xPT1BfTElNSVQgPSA1O1xuXG5leHBvcnQgY29uc3QgSU5URU5UX0hBU0hfQUxHTyA9ICd2MSc7XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gRW50aXRpZXMgKHByb2plY3Rpb24gc2hhcGVzIHJldHVybmVkIGJ5IHF1ZXJpZXMpXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuZXhwb3J0IGludGVyZmFjZSBBY3RvciB7XG4gIGlkOiBzdHJpbmc7XG4gIHR5cGU6IEFjdG9yVHlwZTtcbiAgZGlzcGxheU5hbWU6IHN0cmluZztcbiAgLyoqIFBsYXlib29rIHBlcnNvbmEgdGhpcyBhZ2VudCBlbWJvZGllcyAoZS5nLiAnYm1hZC1hZ2VudC1wbScpOyBudWxsIGZvciBodW1hbnMgYW5kIHBsYWluIGFnZW50cy4gKi9cbiAgcGVyc29uYUNvZGU6IHN0cmluZyB8IG51bGw7XG59XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gV29yay1pdGVtIGtpbmRzIChQaGFzZSA0LCByb2FkbWFwIEJ1aWxkIHBoYXNlcyk6IHRoZSB3b3JrZXIgYnJvYWRlbnMuXG4vLyBLaW5kIHNlbGVjdHMgV0hJQ0ggbWFjaGluZS1ldmlkZW5jZSBndWFyZHMgYXBwbHkgXHUyMDE0IG5ldmVyIFdITyBtYXkgcGFzcyBhXG4vLyBnYXRlICh0aGF0IHN0YXlzIGdyYW50cyArIGdhdGUgcG9saWN5KS5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5leHBvcnQgY29uc3QgV09SS19JVEVNX0tJTkRTID0gWydjb2RlJywgJ3NwZWNfZHJhZnQnLCAnZGVzaWduX3JldmlldycsICdxYV9yZXBvcnQnLCAnZG9jJ10gYXMgY29uc3Q7XG5leHBvcnQgdHlwZSBXb3JrSXRlbUtpbmQgPSAodHlwZW9mIFdPUktfSVRFTV9LSU5EUylbbnVtYmVyXTtcblxuLyoqXG4gKiBUaGUgc2l4IEJNQUQgcGVyc29uYXMgcHJvdmlzaW9uIGFzIGRlZmF1bHQgYWdlbnQgYWN0b3JzIHBlciB3b3Jrc3BhY2VcbiAqIChyb2FkbWFwIFx1MDBBNzMpLiBGbG9vci1zdGF0ZSBkZWZhdWx0cyAodGhlc2lzKTogQW1lbGlhIGhvbGRzIGBkZXZlbG9wZXJgO1xuICogZXZlcnlvbmUgZWxzZSBgY29udHJpYnV0b3JgOyBOTyBwZXJzb25hIGhvbGRzIGEgZ2F0ZSB1bnRpbCBhIHBlcm1pdHRlZFxuICogYWN0b3IgZ3JhbnRzIG9uZS5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBQZXJzb25hRGVmIHtcbiAgcGVyc29uYUNvZGU6IHN0cmluZzsgLy8gQk1BRCBwbGF5Ym9vayBza2lsbFxuICBkaXNwbGF5TmFtZTogc3RyaW5nO1xuICBkZWZhdWx0Um9sZToga2V5b2YgdHlwZW9mIERFTElWRVJZX1JPTEVTO1xufVxuXG5leHBvcnQgY29uc3QgUEVSU09OQVM6IHJlYWRvbmx5IFBlcnNvbmFEZWZbXSA9IFtcbiAgeyBwZXJzb25hQ29kZTogJ2JtYWQtYWdlbnQtYW5hbHlzdCcsIGRpc3BsYXlOYW1lOiAnTWFyeSAoQW5hbHlzdCknLCBkZWZhdWx0Um9sZTogJ2NvbnRyaWJ1dG9yJyB9LFxuICB7IHBlcnNvbmFDb2RlOiAnYm1hZC1hZ2VudC10ZWNoLXdyaXRlcicsIGRpc3BsYXlOYW1lOiAnUGFpZ2UgKFRlY2ggV3JpdGVyKScsIGRlZmF1bHRSb2xlOiAnY29udHJpYnV0b3InIH0sXG4gIHsgcGVyc29uYUNvZGU6ICdibWFkLWFnZW50LXBtJywgZGlzcGxheU5hbWU6ICdKb2huIChQTSknLCBkZWZhdWx0Um9sZTogJ2NvbnRyaWJ1dG9yJyB9LFxuICB7IHBlcnNvbmFDb2RlOiAnYm1hZC1hZ2VudC11eC1kZXNpZ25lcicsIGRpc3BsYXlOYW1lOiAnU2FsbHkgKFVYKScsIGRlZmF1bHRSb2xlOiAnY29udHJpYnV0b3InIH0sXG4gIHsgcGVyc29uYUNvZGU6ICdibWFkLWFnZW50LWFyY2hpdGVjdCcsIGRpc3BsYXlOYW1lOiAnV2luc3RvbiAoQXJjaGl0ZWN0KScsIGRlZmF1bHRSb2xlOiAnY29udHJpYnV0b3InIH0sXG4gIHsgcGVyc29uYUNvZGU6ICdibWFkLWFnZW50LWRldicsIGRpc3BsYXlOYW1lOiAnQW1lbGlhIChEZXYpJywgZGVmYXVsdFJvbGU6ICdkZXZlbG9wZXInIH0sXG5dO1xuXG5leHBvcnQgaW50ZXJmYWNlIEZlYXR1cmUge1xuICBpZDogc3RyaW5nO1xuICBzdGF0ZTogJ2JhY2tsb2cnIHwgJ2luX3Byb2dyZXNzJyB8ICdkb25lJztcbiAgLyoqIHRydWUgd2hpbGUgYSBkb25lX2NoZWNrcG9pbnQgaG9sZCBpcyBhY3RpdmU6IG5vIGZ1cnRoZXIgZGlzcGF0Y2ggaW4gdGhpcyBmZWF0dXJlICovXG4gIGRpc3BhdGNoSG9sZDogYm9vbGVhbjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBXb3JrSXRlbSB7XG4gIGlkOiBzdHJpbmc7XG4gIGZlYXR1cmVJZDogc3RyaW5nO1xuICBleHRlcm5hbEtleTogc3RyaW5nOyAvLyBpZCBmcm9tIHN0b3JpZXMueWFtbCwgZS5nLiBcIjMtMlwiXG4gIGtpbmQ6IFdvcmtJdGVtS2luZDsgLy8gJ2NvZGUnIHVubGVzcyBjcmVhdGVkIG90aGVyd2lzZSBcdTIwMTQgc2VsZWN0cyBldmlkZW5jZSBndWFyZHMgKFBoYXNlIDQpXG4gIHRpdGxlOiBzdHJpbmc7XG4gIHN0YXRlOiBXb3JrSXRlbVN0YXRlO1xuICBibG9ja2VkUmVhc29uOiBCbG9ja2VkUmVhc29uIHwgbnVsbDtcbiAgcmV2aWV3TG9vcEl0ZXJhdGlvbjogbnVtYmVyO1xuICBpbnRlbnRIYXNoOiBzdHJpbmcgfCBudWxsO1xuICBwaW5uZWRWZXJpZmljYXRpb246IHN0cmluZ1tdIHwgbnVsbDtcbiAgc3BlY0NoZWNrcG9pbnQ6IGJvb2xlYW47XG4gIGRvbmVDaGVja3BvaW50OiBib29sZWFuO1xuICBpbnZva2VEZXZXaXRoOiBzdHJpbmc7XG4gIHNwZWNQYXRoOiBzdHJpbmc7XG4gIHN0YXRlVmVyc2lvbjogbnVtYmVyO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIENsYWltIHtcbiAgaWQ6IHN0cmluZztcbiAgd29ya0l0ZW1JZDogc3RyaW5nO1xuICBhY3RvcklkOiBzdHJpbmc7XG4gIGZlbmNpbmdUb2tlbjogbnVtYmVyO1xuICBsZWFzZUV4cGlyZXNBdDogbnVtYmVyOyAvLyBlbmdpbmUtY2xvY2sgbXNcbiAgcmVsZWFzZWQ6IGJvb2xlYW47XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgU3BpbmVFdmVudCB7XG4gIGdsb2JhbFNlcTogbnVtYmVyO1xuICBzdHJlYW1UeXBlOiAnd29ya3NwYWNlJyB8ICdmZWF0dXJlJyB8ICd3b3JrX2l0ZW0nIHwgJ2FjdG9yJyB8ICd0aHJlYWQnIHwgJ2FnZW50X2pvYic7XG4gIHN0cmVhbUlkOiBzdHJpbmc7XG4gIHN0cmVhbVNlcTogbnVtYmVyO1xuICB0eXBlOiBzdHJpbmc7XG4gIGFjdG9ySWQ6IHN0cmluZztcbiAgcGF5bG9hZDogUmVjb3JkPHN0cmluZywgdW5rbm93bj47XG4gIGNhdXNhdGlvbklkPzogc3RyaW5nO1xufVxuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIENvbGxhYm9yYXRpb24gKFBoYXNlIDMsIHJvYWRtYXAgXHUwMEE3NSk6IHRoZSBjaGF0IFNVUkZBQ0UuIFNhY3JlZCBib3VuZGFyeVxuLy8gKFx1MDBBNzUuMik6IGEgbWVzc2FnZSBORVZFUiBtdXRhdGVzIGxpZmVjeWNsZTsgdGhlIG9ubHkgY3Jvc3MtZGlyZWN0aW9uIGlzXG4vLyByYWlscyBcdTIxOTIgY2hhdCAoc3lzdGVtIG5hcnJhdGlvbikuIE1lbnRpb25zIGFyZSBTVFJVQ1RVUkVEIGRhdGEgXHUyMDE0IHRoZSBzZXJ2ZXJcbi8vIG5ldmVyIHBhcnNlcyBtZXNzYWdlIHRleHQuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuZXhwb3J0IHR5cGUgVGhyZWFkS2luZCA9ICdzcGVjJyB8ICdkZXNpZ24nIHwgJ3Rhc2snIHwgJ2dlbmVyYWwnIHwgJ3ByaXZhdGUnO1xuZXhwb3J0IHR5cGUgVGhyZWFkVmlzaWJpbGl0eSA9ICdvcGVuJyB8ICdwcml2YXRlJztcblxuZXhwb3J0IGludGVyZmFjZSBUaHJlYWQge1xuICBpZDogc3RyaW5nO1xuICBmZWF0dXJlSWQ6IHN0cmluZyB8IG51bGw7XG4gIHdvcmtJdGVtSWQ6IHN0cmluZyB8IG51bGw7XG4gIGtpbmQ6IFRocmVhZEtpbmQ7XG4gIHZpc2liaWxpdHk6IFRocmVhZFZpc2liaWxpdHk7XG4gIGNyZWF0ZWRCeTogc3RyaW5nO1xuICBwYXJ0aWNpcGFudHM6IHN0cmluZ1tdOyAvLyBlbmZvcmNlZCBmb3IgcHJpdmF0ZSB0aHJlYWRzOyBpbmZvcm1hdGlvbmFsIGZvciBvcGVuIG9uZXNcbn1cblxuZXhwb3J0IGludGVyZmFjZSBNZXNzYWdlIHtcbiAgaWQ6IHN0cmluZztcbiAgdGhyZWFkSWQ6IHN0cmluZztcbiAgc2VxOiBudW1iZXI7IC8vIHBlci10aHJlYWQsIDEtYmFzZWQsIGdhcC1mcmVlXG4gIGF1dGhvcklkOiBzdHJpbmc7IC8vIGEgdXNlciBPUiBhbiBhZ2VudCAodGhlc2lzIFx1MDBBNzUuMykgXHUyMDE0IG9yIHRoZSBzeXN0ZW0gYWN0b3IgZm9yIG5hcnJhdGlvblxuICBraW5kOiAnY2hhdCcgfCAnc3lzdGVtJztcbiAgYm9keTogc3RyaW5nO1xuICByZXBseVRvOiBzdHJpbmcgfCBudWxsO1xufVxuXG4vKiogV2h5IGEgbWVudGlvbiBkaWQgb3IgZGlkIG5vdCBtYXRlcmlhbGl6ZSBhbiBhZ2VudCBqb2IgKFx1MDBBNzUuNCByb3V0ZXIgXHUyMDE0IHB1cmUgY29kZSkuICovXG5leHBvcnQgdHlwZSBNZW50aW9uUmVzb2x1dGlvbiA9XG4gIHwgJ25vdGlmaWVkJyAvLyBodW1hbiBtZW50aW9uZWQgXHUyMTkyIG5vdGlmaWNhdGlvbiBvbmx5XG4gIHwgJ2pvYl9jcmVhdGVkJyAvLyBhZ2VudCBtZW50aW9uZWQsIHJvdXRlciBwb2xpY3kgYWxsb3dzIFx1MjE5MiBhZ2VudF9qb2IgcXVldWVkXG4gIHwgJ2RlbmllZF9wb2xpY3knIC8vIGRlZmF1bHQtZGVueTogbWVudGlvbmVyIGxhY2tzIGludm9rZSBhdXRob3JpdHksIG9yIHBvbGljeSBvZmZcbiAgfCAnZGVuaWVkX2RlcHRoJzsgLy8gYWdlbnQtbWVudGlvbi1hZ2VudCBjaGFpbiBleGNlZWRlZCB0aGUgZGVwdGggY2FwXG5cbmV4cG9ydCBpbnRlcmZhY2UgTWVudGlvbiB7XG4gIG1lc3NhZ2VJZDogc3RyaW5nO1xuICBtZW50aW9uZWRBY3RvcklkOiBzdHJpbmc7XG4gIHJlc29sdXRpb246IE1lbnRpb25SZXNvbHV0aW9uO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIE5vdGlmaWNhdGlvbiB7XG4gIGlkOiBzdHJpbmc7XG4gIGFjdG9ySWQ6IHN0cmluZztcbiAgc291cmNlOiAnbWVudGlvbicgfCAnam9iX2NvbXBsZXRlZCc7XG4gIHJlZklkOiBzdHJpbmc7IC8vIG1lc3NhZ2VJZCBmb3IgbWVudGlvbnMsIGpvYklkIGZvciBjb21wbGV0aW9uc1xuICByZWFkOiBib29sZWFuO1xufVxuXG4vKipcbiAqIFJvdXRlci1tYXRlcmlhbGl6ZWQgd29yayBmb3IgYW4gYWdlbnQgKFx1MDBBNzUuNCkuIFJlcGx5LW9ubHkgY29udGV4dDogdGhlIGpvYlxuICogTkVWRVIgY2FycmllcyBhIGNsYWltIG9yIHByZS1hdXRob3JpemVkIGxpZmVjeWNsZSBhdXRob3JpdHkgXHUyMDE0IHRoZSBhZ2VudFxuICogbXV0YXRlcyBzdGF0ZSBvbmx5IHRocm91Z2ggaXRzIG93biBncmFudHMsIG9yIG5vdCBhdCBhbGwuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQWdlbnRKb2Ige1xuICBpZDogc3RyaW5nO1xuICBhZ2VudEFjdG9ySWQ6IHN0cmluZztcbiAgdGhyZWFkSWQ6IHN0cmluZztcbiAgbWVzc2FnZUlkOiBzdHJpbmc7IC8vIHRoZSB0cmlnZ2VyaW5nIG1lbnRpb25cbiAgd29ya0l0ZW1JZDogc3RyaW5nIHwgbnVsbDsgLy8gY29udGV4dCB3aGVuIHRoZSB0aHJlYWQgaXMgdGFzay1ib3VuZFxuICBmZWF0dXJlSWQ6IHN0cmluZyB8IG51bGw7XG4gIHN0YXR1czogJ3F1ZXVlZCcgfCAnZG9uZScgfCAnYmxvY2tlZCc7XG4gIGRlcHRoOiBudW1iZXI7IC8vIDAgPSBodW1hbi10cmlnZ2VyZWQ7ICsxIHBlciBhZ2VudC1tZW50aW9uLWFnZW50IGhvcFxuICBub3RlOiBzdHJpbmcgfCBudWxsO1xufVxuXG4vKiogRGVwdGggY2FwIGZvciBhZ2VudC1tZW50aW9uLWFnZW50IGNoYWlucyAoXHUwMEE3NS40OiBcImRlcHRoIGNvdW50ZXJcIikuICovXG5leHBvcnQgY29uc3QgQUdFTlRfSk9CX01BWF9ERVBUSCA9IDI7XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gQWdlbnQgbWVtb3J5IChQaGFzZSA1LCByb2FkbWFwIFx1MDBBNzYpOiB0aGUgd29ya2VyIERFRVBFTlMuIE1lbW9yeSBtYWtlcyB0aGVcbi8vIHdvcmtlciBiZXR0ZXIsIG5ldmVyIG1vcmUgYXV0aG9yaXplZCBcdTIwMTQgYXV0aG9yaXR5IGNvbWVzIG9ubHkgZnJvbSBncmFudHMsXG4vLyBhbmQgdGhlIG1lbW9yeSBBUEkgaGFzIG5vIHBhdGggdG8gdGhlbS4gRW5mb3JjZWQgYnkgYXJjaGl0ZWN0dXJlOiBvd25lci1cbi8vIHNjb3BlZCByZWFkcywgbm8gY3Jvc3MtYWN0b3IgcGFyYW1ldGVyLCBjb250ZW50IG5ldmVyIGVudGVycyB0aGUgc2hhcmVkXG4vLyBldmVudCBsb2cuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuZXhwb3J0IHR5cGUgTWVtb3J5S2luZCA9ICdlcGlzb2RpYycgfCAncHJvY2VkdXJhbCcgfCAnZW50aXR5JztcblxuZXhwb3J0IGludGVyZmFjZSBBZ2VudE1lbW9yeSB7XG4gIGlkOiBzdHJpbmc7XG4gIGFnZW50QWN0b3JJZDogc3RyaW5nO1xuICBraW5kOiBNZW1vcnlLaW5kO1xuICBjb250ZW50OiBzdHJpbmc7XG4gIC8qKiBUaHJlYWQgdGhlIG1lbW9yeSB3YXMgbGVhcm5lZCBpbiwgd2hlbiBhcHBsaWNhYmxlLiAqL1xuICBzb3VyY2VUaHJlYWRJZDogc3RyaW5nIHwgbnVsbDtcbiAgLyoqIFZpc2liaWxpdHkgb2YgdGhlIHNvdXJjZSBjb250ZXh0IGF0IGxlYXJuIHRpbWUgXHUyMDE0IHJlY2FsbCBmaWx0ZXJzIG9uIGl0IChcdTAwQTc2KS4gKi9cbiAgc291cmNlVmlzaWJpbGl0eTogVGhyZWFkVmlzaWJpbGl0eSB8IG51bGw7XG4gIC8qKiBQZXItYWdlbnQsIDEtYmFzZWQsIGFwcGVuZCBvcmRlci4gKi9cbiAgc2VxOiBudW1iZXI7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgRGl2ZXJnZW5jZVJlcG9ydCB7XG4gIHdvcmtJdGVtSWQ6IHN0cmluZztcbiAgZmlsZVN0YXRlOiBzdHJpbmc7XG4gIGRiU3RhdGU6IFdvcmtJdGVtU3RhdGU7XG4gIGtpbmQ6ICdmaWxlX2FoZWFkJyB8ICdkYl9haGVhZCcgfCAnY29uZmxpY3QnO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFN0b3JpZXNJbXBvcnRSZXN1bHQge1xuICBpbXBvcnRlZDogc3RyaW5nW107IC8vIGV4dGVybmFsS2V5cyBjcmVhdGVkXG4gIHVwZGF0ZWQ6IHN0cmluZ1tdOyAvLyBleHRlcm5hbEtleXMgYWxyZWFkeSBwcmVzZW50LCByZWZyZXNoZWRcbiAgd2FybmluZ3M6IHN0cmluZ1tdOyAvLyBlLmcuIHNraXBwZWQgcmV0cm9zcGVjdGl2ZSBlbnRyaWVzXG59XG5cblxuLy8gVGhlIHByb2R1Y3Rpb24gc2VydmljZSB3cmFwcyB0aGUgc2FtZSBjb3JlIHdpdGggUG9zdGdyZXMgcGVyc2lzdGVuY2UuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuZXhwb3J0IGludGVyZmFjZSBDcmVhdGVXb3JrSXRlbUlucHV0IHtcbiAgZmVhdHVyZUlkOiBzdHJpbmc7XG4gIGV4dGVybmFsS2V5OiBzdHJpbmc7XG4gIHRpdGxlOiBzdHJpbmc7XG4gIGtpbmQ/OiBXb3JrSXRlbUtpbmQ7IC8vIGRlZmF1bHQgJ2NvZGUnXG4gIHNwZWNDaGVja3BvaW50PzogYm9vbGVhbjtcbiAgZG9uZUNoZWNrcG9pbnQ/OiBib29sZWFuO1xuICBpbnZva2VEZXZXaXRoPzogc3RyaW5nO1xuICBkZXBlbmRzT24/OiBzdHJpbmdbXTsgLy8gZXh0ZXJuYWxLZXlzXG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQWR2YW5jZUlucHV0IHtcbiAgd29ya0l0ZW1JZDogc3RyaW5nO1xuICB0bzogV29ya0l0ZW1TdGF0ZTtcbiAgYWN0b3JJZDogc3RyaW5nO1xuICBmZW5jaW5nVG9rZW4/OiBudW1iZXI7IC8vIHJlcXVpcmVkIGZvciBjbGFpbS1ndWFyZGVkIHRyYW5zaXRpb25zXG4gIGlkZW1wb3RlbmN5S2V5Pzogc3RyaW5nO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEdhdGVEZWNpc2lvbklucHV0IHtcbiAgd29ya0l0ZW1JZDogc3RyaW5nO1xuICBnYXRlOiBHYXRlQ29kZTtcbiAgYWN0b3JJZDogc3RyaW5nO1xuICAvKiogc3BlY19hcHByb3ZhbCBvbmx5OiBwaW5zIHZlcmlmaWNhdGlvbiBjb21tYW5kcyBhcyBSdWxlcy1sYXllciBkYXRhIChyb2FkbWFwIEQ3KSAqL1xuICBwaW5uZWRWZXJpZmljYXRpb24/OiBzdHJpbmdbXTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBTcGluZUVuZ2luZSB7XG4gIC8vIC0tIHNldHVwIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICBjcmVhdGVBY3RvcihpbnB1dDoge1xuICAgIHR5cGU6IEV4Y2x1ZGU8QWN0b3JUeXBlLCAnc3lzdGVtJz47XG4gICAgZGlzcGxheU5hbWU6IHN0cmluZztcbiAgICAvKiogYm9vdHN0cmFwIHBsdW1iaW5nIChsaWtlIGNyZWF0ZUFjdG9yIGl0c2VsZik7IGRlZmF1bHQgJ21lbWJlcicgKi9cbiAgICBnb3Zlcm5hbmNlUm9sZT86IEdvdmVybmFuY2VSb2xlO1xuICAgIHBlcnNvbmFDb2RlPzogc3RyaW5nO1xuICB9KTogQWN0b3I7XG4gIC8qKiBBbGwgYWN0b3JzLCBwZXJzb25hcyBhbmQgc3lzdGVtIGluY2x1ZGVkICh0cmFuc3BhcmVuY3kgZm9yIHBpY2tlcnMvYXVkaXQpLiAqL1xuICBsaXN0QWN0b3JzKCk6IEFjdG9yW107XG4gIC8qKiBJZGVtcG90ZW50bHkgY3JlYXRlIHRoZSBzaXggQk1BRCBwZXJzb25hIGFnZW50IGFjdG9ycyB3aXRoIGZsb29yLXN0YXRlIHJvbGVzIChnYXRlZCB3cml0ZSkuICovXG4gIHByb3Zpc2lvblBlcnNvbmFzKGlucHV0OiB7IGJ5QWN0b3JJZDogc3RyaW5nIH0pOiBBY3RvcltdO1xuICBncmFudChpbnB1dDogeyBhY3RvcklkOiBzdHJpbmc7IHBlcm1pc3Npb246IFBlcm1pc3Npb247IHNjb3BlPzogc3RyaW5nIH0pOiB2b2lkO1xuICByZXZva2UoaW5wdXQ6IHsgYWN0b3JJZDogc3RyaW5nOyBwZXJtaXNzaW9uOiBQZXJtaXNzaW9uOyBzY29wZT86IHN0cmluZyB9KTogdm9pZDtcbiAgY3JlYXRlRmVhdHVyZShpbnB1dDogeyBhY3RvcklkOiBzdHJpbmcgfSk6IEZlYXR1cmU7XG4gIGNyZWF0ZVdvcmtJdGVtKGlucHV0OiBDcmVhdGVXb3JrSXRlbUlucHV0ICYgeyBhY3RvcklkOiBzdHJpbmcgfSk6IFdvcmtJdGVtO1xuXG4gIC8qKiBJbXBvcnQgc3Rvcmllcy55YW1sIGNvbnRlbnQgKHJhdyBZQU1MIHN0cmluZykuIElkZW1wb3RlbnQgcmUtaW1wb3J0IHBlciBzdG9yaWVzLXNjaGVtYSB1cGRhdGUgc2VtYW50aWNzLiAqL1xuICBpbXBvcnRTdG9yaWVzKGlucHV0OiB7IGZlYXR1cmVJZDogc3RyaW5nOyB5YW1sOiBzdHJpbmc7IGFjdG9ySWQ6IHN0cmluZyB9KTogU3Rvcmllc0ltcG9ydFJlc3VsdDtcblxuICAvLyAtLSBjbGFpbXMgKHJvYWRtYXAgXHUwMEE3MS4zKSAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIGNsYWltVGFzayhpbnB1dDogeyB3b3JrSXRlbUlkOiBzdHJpbmc7IGFjdG9ySWQ6IHN0cmluZzsgdHRsTXM/OiBudW1iZXIgfSk6IENsYWltO1xuICBoZWFydGJlYXQoaW5wdXQ6IHsgY2xhaW1JZDogc3RyaW5nIH0pOiB2b2lkO1xuICByZWxlYXNlQ2xhaW0oaW5wdXQ6IHsgY2xhaW1JZDogc3RyaW5nOyByZWFzb24/OiBzdHJpbmcgfSk6IHZvaWQ7XG4gIC8qKiB0ZXN0IGNsb2NrIFx1MjAxNCBsZWFzZSBleHBpcnkgaXMgdGltZS1iYXNlZCAqL1xuICBhZHZhbmNlQ2xvY2sobXM6IG51bWJlcik6IHZvaWQ7XG5cbiAgLy8gLS0gbGlmZWN5Y2xlIChyb2FkbWFwIFx1MDBBNzEuMikgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICBhZHZhbmNlU3RhdGUoaW5wdXQ6IEFkdmFuY2VJbnB1dCk6IFdvcmtJdGVtO1xuICBibG9ja1Rhc2soaW5wdXQ6IHsgd29ya0l0ZW1JZDogc3RyaW5nOyByZWFzb246IEJsb2NrZWRSZWFzb247IGFjdG9ySWQ6IHN0cmluZzsgZmVuY2luZ1Rva2VuPzogbnVtYmVyIH0pOiBXb3JrSXRlbTtcbiAgdW5ibG9ja1Rhc2soaW5wdXQ6IHsgd29ya0l0ZW1JZDogc3RyaW5nOyBhY3RvcklkOiBzdHJpbmcgfSk6IFdvcmtJdGVtO1xuXG4gIC8vIC0tIGdhdGVzICYgZXZpZGVuY2UgKHJvYWRtYXAgXHUwMEE3MS40KSAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHN1Ym1pdEV2aWRlbmNlKGlucHV0OiB7IHdvcmtJdGVtSWQ6IHN0cmluZzsgZXZpZGVuY2U6IEV2aWRlbmNlOyBhY3RvcklkOiBzdHJpbmc7IGZlbmNpbmdUb2tlbj86IG51bWJlciB9KTogdm9pZDtcbiAgYXBwcm92ZUdhdGUoaW5wdXQ6IEdhdGVEZWNpc2lvbklucHV0KTogV29ya0l0ZW07XG4gIC8qKiBSZWplY3Rpb24gZmlyZXMgdGhlIGxvb3BiYWNrIGFzIGEgc3lzdGVtIGVmZmVjdCBcdTIwMTQgbm8gY2xhaW0gaG9sZGVyIGludm9sdmVtZW50IChyb2FkbWFwIFx1MDBBNzEuMikuICovXG4gIHJlamVjdEdhdGUoaW5wdXQ6IEdhdGVEZWNpc2lvbklucHV0KTogV29ya0l0ZW07XG5cbiAgLy8gLS0gZGlzcGF0Y2ggKHJvYWRtYXAgXHUwMEE3Mi4zKSAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIC8qKiBSZWZ1c2VzIHN0YXRlPWRvbmUgaXRlbXM7IHJldHVybnMgZW50cnktc3RhdGUgY29udGV4dCBmb3IgdGhlIHJ1bm5lci4gKi9cbiAgZ2V0VGFza0NvbnRleHQoaW5wdXQ6IHsgd29ya0l0ZW1JZDogc3RyaW5nIH0pOiB7XG4gICAgd29ya0l0ZW06IFdvcmtJdGVtO1xuICAgIGVudHJ5U3RhdGU6IFdvcmtJdGVtU3RhdGU7XG4gIH07XG4gIC8qKiBSZWxlYXNlcyBhIGRvbmVfY2hlY2twb2ludCBkaXNwYXRjaCBob2xkIG9uIHRoZSBmZWF0dXJlLiAqL1xuICByZWxlYXNlRGlzcGF0Y2hIb2xkKGlucHV0OiB7IGZlYXR1cmVJZDogc3RyaW5nOyBhY3RvcklkOiBzdHJpbmcgfSk6IEZlYXR1cmU7XG5cbiAgLy8gLS0gcmVjb25jaWxpYXRpb24gKHJvYWRtYXAgXHUwMEE3MS42LCBkZXRlY3Qtb25seSkgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICByZWNvbmNpbGUoaW5wdXQ6IHsgZmlsZXM6IEFycmF5PHsgd29ya0l0ZW1JZDogc3RyaW5nOyBmcm9udG1hdHRlclN0YXR1czogc3RyaW5nIH0+IH0pOiBEaXZlcmdlbmNlUmVwb3J0W107XG5cbiAgLy8gLS0gZW50aXRsZW1lbnRzIChQaGFzZSAyLCByb2FkbWFwIFx1MDBBNzMpIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAvKiogR292ZXJuYW5jZSBhdXRob3JpdHk6IHRoZSBzeXN0ZW0gYWN0b3IgYW5kICdhZG1pbicgZ292ZXJuYW5jZS1yb2xlIGhvbGRlcnMuICovXG4gIHNldEdvdmVybmFuY2VSb2xlKGlucHV0OiB7IGFjdG9ySWQ6IHN0cmluZzsgcm9sZTogR292ZXJuYW5jZVJvbGU7IGJ5QWN0b3JJZDogc3RyaW5nIH0pOiB2b2lkO1xuICBnZXRHb3Zlcm5hbmNlUm9sZShhY3RvcklkOiBzdHJpbmcpOiBHb3Zlcm5hbmNlUm9sZTtcbiAgLyoqIEFzc2lnbi9yZXZva2UgYSBkZWxpdmVyeSByb2xlIChidW5kbGUgb2YgcGVybWlzc2lvbnMpLiBHYXRlZCB3cml0ZXM7IGF1ZGl0ZWQuICovXG4gIGFzc2lnblJvbGUoaW5wdXQ6IHsgYWN0b3JJZDogc3RyaW5nOyByb2xlQ29kZTogc3RyaW5nOyBieUFjdG9ySWQ6IHN0cmluZyB9KTogdm9pZDtcbiAgcmV2b2tlUm9sZShpbnB1dDogeyBhY3RvcklkOiBzdHJpbmc7IHJvbGVDb2RlOiBzdHJpbmc7IGJ5QWN0b3JJZDogc3RyaW5nIH0pOiB2b2lkO1xuICBsaXN0Um9sZUFzc2lnbm1lbnRzKGFjdG9ySWQ/OiBzdHJpbmcpOiBSb2xlQXNzaWdubWVudFtdO1xuICBzZXRQbGFuKGlucHV0OiB7IHBsYW46IFBsYW5Db2RlOyBieUFjdG9ySWQ6IHN0cmluZyB9KTogdm9pZDtcbiAgZ2V0UGxhbigpOiBQbGFuQ29kZTtcbiAgc2V0V29ya3NwYWNlUG9saWN5KGlucHV0OiB7IHBvbGljeTogV29ya3NwYWNlUG9saWN5OyBieUFjdG9ySWQ6IHN0cmluZyB9KTogdm9pZDtcbiAgZ2V0V29ya3NwYWNlUG9saWN5KCk6IFdvcmtzcGFjZVBvbGljeTtcbiAgc2V0R2F0ZVBvbGljeShpbnB1dDogeyBnYXRlOiBHYXRlQ29kZTsgcG9saWN5OiBHYXRlUG9saWN5OyBieUFjdG9ySWQ6IHN0cmluZyB9KTogdm9pZDtcbiAgZ2V0R2F0ZVBvbGljeShnYXRlOiBHYXRlQ29kZSk6IEdhdGVQb2xpY3k7XG4gIC8qKiBQdXJlIGRlY2lzaW9uIHRyYWNlIFx1MjAxNCByZXBsYXlhYmxlIGJ5IGFuIGF1ZGl0b3IuIE5ldmVyIG11dGF0ZXMuICovXG4gIGF1dGh6RXhwbGFpbihpbnB1dDogeyBhY3RvcklkOiBzdHJpbmc7IHBlcm1pc3Npb246IFBlcm1pc3Npb24gfSk6IEF1dGh6RXhwbGFuYXRpb247XG5cbiAgLy8gLS0gY29sbGFib3JhdGlvbiAoUGhhc2UgMywgcm9hZG1hcCBcdTAwQTc1KSAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIGNyZWF0ZVRocmVhZChpbnB1dDoge1xuICAgIGFjdG9ySWQ6IHN0cmluZztcbiAgICBraW5kOiBUaHJlYWRLaW5kO1xuICAgIGZlYXR1cmVJZD86IHN0cmluZztcbiAgICB3b3JrSXRlbUlkPzogc3RyaW5nO1xuICAgIHZpc2liaWxpdHk/OiBUaHJlYWRWaXNpYmlsaXR5O1xuICB9KTogVGhyZWFkO1xuICBhZGRUaHJlYWRQYXJ0aWNpcGFudChpbnB1dDogeyB0aHJlYWRJZDogc3RyaW5nOyBhY3RvcklkOiBzdHJpbmc7IGJ5QWN0b3JJZDogc3RyaW5nIH0pOiBUaHJlYWQ7XG4gIC8qKlxuICAgKiBQb3N0IGEgbWVzc2FnZS4gYG1lbnRpb25zYCBpcyBTVFJVQ1RVUkVEIChhY3RvciBpZHMpIFx1MjAxNCB0aGUgc2VydmVyIG5ldmVyXG4gICAqIHBhcnNlcyBib2R5IHRleHQgKFx1MDBBNzUuMikuIE1lbnRpb25pbmcgYW4gYWdlbnQgcnVucyB0aGUgZGV0ZXJtaW5pc3RpY1xuICAgKiByb3V0ZXIgKFx1MDBBNzUuNCk6IGRlZmF1bHQtZGVueSwgcG9saWN5LWdhdGVkLCBkZXB0aC1jYXBwZWQuXG4gICAqL1xuICBwb3N0TWVzc2FnZShpbnB1dDoge1xuICAgIHRocmVhZElkOiBzdHJpbmc7XG4gICAgYWN0b3JJZDogc3RyaW5nO1xuICAgIGJvZHk6IHN0cmluZztcbiAgICByZXBseVRvPzogc3RyaW5nO1xuICAgIG1lbnRpb25zPzogc3RyaW5nW107XG4gIH0pOiBNZXNzYWdlO1xuICBsaXN0VGhyZWFkcyhmaWx0ZXI/OiB7IGZlYXR1cmVJZD86IHN0cmluZzsgd29ya0l0ZW1JZD86IHN0cmluZzsgYWN0b3JJZD86IHN0cmluZyB9KTogVGhyZWFkW107XG4gIGxpc3RNZXNzYWdlcyhpbnB1dDogeyB0aHJlYWRJZDogc3RyaW5nOyBhY3RvcklkOiBzdHJpbmc7IHNpbmNlU2VxPzogbnVtYmVyIH0pOiBNZXNzYWdlW107XG4gIGxpc3RNZW50aW9ucyhtZXNzYWdlSWQ6IHN0cmluZyk6IE1lbnRpb25bXTtcbiAgbGlzdE5vdGlmaWNhdGlvbnMoaW5wdXQ6IHsgYWN0b3JJZDogc3RyaW5nOyB1bnJlYWRPbmx5PzogYm9vbGVhbiB9KTogTm90aWZpY2F0aW9uW107XG4gIG1hcmtOb3RpZmljYXRpb25SZWFkKGlucHV0OiB7IG5vdGlmaWNhdGlvbklkOiBzdHJpbmc7IGFjdG9ySWQ6IHN0cmluZyB9KTogdm9pZDtcbiAgbGlzdEFnZW50Sm9icyhmaWx0ZXI/OiB7IGFnZW50QWN0b3JJZD86IHN0cmluZzsgc3RhdHVzPzogQWdlbnRKb2JbJ3N0YXR1cyddIH0pOiBBZ2VudEpvYltdO1xuICAvKiogT25seSB0aGUgam9iJ3MgYWdlbnQgbWF5IGNvbXBsZXRlIGl0OyBjb21wbGV0aW9uIG5vdGlmaWVzIHRoZSBtZW50aW9uZXIuICovXG4gIGNvbXBsZXRlQWdlbnRKb2IoaW5wdXQ6IHsgam9iSWQ6IHN0cmluZzsgYWN0b3JJZDogc3RyaW5nOyBzdGF0dXM6ICdkb25lJyB8ICdibG9ja2VkJzsgbm90ZT86IHN0cmluZyB9KTogQWdlbnRKb2I7XG5cbiAgLy8gLS0gYWdlbnQgbWVtb3J5IChQaGFzZSA1LCByb2FkbWFwIFx1MDBBNzYpIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgLyoqIEFnZW50cyBvbmx5OyBsZWFybmluZyBmcm9tIGEgcHJpdmF0ZSB0aHJlYWQgcmVxdWlyZXMgaGF2aW5nIGJlZW4gaW4gaXQuICovXG4gIGFwcGVuZEFnZW50TWVtb3J5KGlucHV0OiB7XG4gICAgYWN0b3JJZDogc3RyaW5nO1xuICAgIGtpbmQ6IE1lbW9yeUtpbmQ7XG4gICAgY29udGVudDogc3RyaW5nO1xuICAgIHNvdXJjZVRocmVhZElkPzogc3RyaW5nO1xuICB9KTogQWdlbnRNZW1vcnk7XG4gIC8qKlxuICAgKiBPd25lci1zY29wZWQgcmVjYWxsOiBhbHdheXMgYW5kIG9ubHkgdGhlIGNhbGxlcidzIG1lbW9yaWVzLiBQcml2YXRlLVxuICAgKiBzb3VyY2VkIG1lbW9yaWVzIHN1cmZhY2UgT05MWSB3aGVuIHJlY2FsbGVkIGluc2lkZSB0aGVpciBzb3VyY2UgdGhyZWFkIFx1MjAxNFxuICAgKiBub3RoaW5nIGxlYXJuZWQgaW4gYSBwcml2YXRlIHRocmVhZCBzdXJmYWNlcyBpbiBhbiBvcGVuIGNvbnRleHQgKFx1MDBBNzYpLlxuICAgKi9cbiAgc2VhcmNoQWdlbnRNZW1vcnkoaW5wdXQ6IHtcbiAgICBhY3RvcklkOiBzdHJpbmc7XG4gICAgY29udGV4dFRocmVhZElkPzogc3RyaW5nO1xuICAgIGtpbmQ/OiBNZW1vcnlLaW5kO1xuICAgIHF1ZXJ5Pzogc3RyaW5nO1xuICB9KTogQWdlbnRNZW1vcnlbXTtcblxuICAvLyAtLSBxdWVyaWVzIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgZ2V0V29ya0l0ZW0oaWQ6IHN0cmluZyk6IFdvcmtJdGVtO1xuICBnZXRGZWF0dXJlKGlkOiBzdHJpbmcpOiBGZWF0dXJlO1xuICBnZXRDbGFpbXMod29ya0l0ZW1JZDogc3RyaW5nKTogQ2xhaW1bXTtcbiAgLyoqIEFkZGl0aXZlIHF1ZXJ5IHN1cmZhY2UgKHBvc3QtY29uZm9ybWFuY2UpOiBsaXN0L2ZpbHRlciB3b3JrIGl0ZW1zLiAqL1xuICBsaXN0V29ya0l0ZW1zKGZpbHRlcj86IHsgc3RhdGU/OiBXb3JrSXRlbVN0YXRlOyBmZWF0dXJlSWQ/OiBzdHJpbmc7IGNsYWltYWJsZT86IGJvb2xlYW4gfSk6IFdvcmtJdGVtW107XG4gIGV2ZW50cyhzdHJlYW1JZD86IHN0cmluZyk6IFNwaW5lRXZlbnRbXTtcbn1cbiIsICIvKipcbiAqIHN0b3JpZXMueWFtbCBwYXJzaW5nICsgdmFsaWRpdHkgcnVsZXMgKHN0b3JpZXMtc2NoZW1hLm1kLCByb2FkbWFwIEQ5KS5cbiAqXG4gKiBUaGUgc2NoZW1hJ3MgdmFsaWRpdHkgcnVsZXMgYmVjb21lIHRocm93aW5nIGNoZWNrcyBoZXJlOyB0aGUgaW1wb3J0ZXIgaW5cbiAqIHRoZSBlbmdpbmUgY29uc3VtZXMgdGhlIHZhbGlkYXRlZCBlbnRyaWVzLiBcIk5vIHN0YXR1cyBmaWVsZCwgZXZlci5cIlxuICovXG5pbXBvcnQgeyBwYXJzZSB9IGZyb20gJ3lhbWwnO1xuXG5pbXBvcnQgeyBTdG9yaWVzVmFsaWRhdGlvbkVycm9yIH0gZnJvbSAnLi90eXBlcy5qcyc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgU3RvcnlFbnRyeSB7XG4gIGlkOiBzdHJpbmc7XG4gIHRpdGxlOiBzdHJpbmc7XG4gIGRlc2NyaXB0aW9uOiBzdHJpbmc7XG4gIHNwZWNDaGVja3BvaW50OiBib29sZWFuO1xuICBkb25lQ2hlY2twb2ludDogYm9vbGVhbjtcbiAgaW52b2tlRGV2V2l0aDogc3RyaW5nO1xufVxuXG5jb25zdCBJRF9QQVRURVJOID0gL15bQS1aYS16MC05LV0rJC87XG5cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZVN0b3JpZXMoeWFtbFRleHQ6IHN0cmluZyk6IFN0b3J5RW50cnlbXSB7XG4gIGxldCByYXc6IHVua25vd247XG4gIHRyeSB7XG4gICAgcmF3ID0gcGFyc2UoeWFtbFRleHQpO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIHRocm93IG5ldyBTdG9yaWVzVmFsaWRhdGlvbkVycm9yKGBZQU1MIHBhcnNlIGZhaWx1cmU6ICR7U3RyaW5nKGVycm9yKX1gKTtcbiAgfVxuICBpZiAoIUFycmF5LmlzQXJyYXkocmF3KSkge1xuICAgIHRocm93IG5ldyBTdG9yaWVzVmFsaWRhdGlvbkVycm9yKCd0b3AgbGV2ZWwgbXVzdCBiZSBhIFlBTUwgbGlzdCBvZiBzdG9yaWVzJyk7XG4gIH1cblxuICBjb25zdCBlbnRyaWVzOiBTdG9yeUVudHJ5W10gPSBbXTtcbiAgZm9yIChjb25zdCBpdGVtIG9mIHJhdykge1xuICAgIGlmICh0eXBlb2YgaXRlbSAhPT0gJ29iamVjdCcgfHwgaXRlbSA9PT0gbnVsbCB8fCBBcnJheS5pc0FycmF5KGl0ZW0pKSB7XG4gICAgICB0aHJvdyBuZXcgU3Rvcmllc1ZhbGlkYXRpb25FcnJvcignZXZlcnkgZW50cnkgbXVzdCBiZSBhIG1hcHBpbmcnKTtcbiAgICB9XG4gICAgY29uc3QgZW50cnkgPSBpdGVtIGFzIFJlY29yZDxzdHJpbmcsIHVua25vd24+O1xuXG4gICAgLy8gUnVsZSAzOiBcIk5vIHN0YXR1cyBmaWVsZCwgZXZlci5cIlxuICAgIGlmICgnc3RhdHVzJyBpbiBlbnRyeSkge1xuICAgICAgdGhyb3cgbmV3IFN0b3JpZXNWYWxpZGF0aW9uRXJyb3IoJ25vIHN0YXR1cyBmaWVsZCwgZXZlcicpO1xuICAgIH1cbiAgICAvLyBSdWxlIDQ6IGlkcyBhcmUgWUFNTCBzdHJpbmdzLCBhbHdheXMgcXVvdGVkIFx1MjAxNCBhbiB1bnF1b3RlZCBgaWQ6IDFgXG4gICAgLy8gcGFyc2VzIGFzIGEgbnVtYmVyIGFuZCBicmVha3Mgc3RyaW5nIGNvbXBhcmlzb24uXG4gICAgaWYgKHR5cGVvZiBlbnRyeVsnaWQnXSAhPT0gJ3N0cmluZycpIHtcbiAgICAgIHRocm93IG5ldyBTdG9yaWVzVmFsaWRhdGlvbkVycm9yKCdpZCBtdXN0IGJlIGEgcXVvdGVkIFlBTUwgc3RyaW5nJyk7XG4gICAgfVxuICAgIGNvbnN0IGlkID0gZW50cnlbJ2lkJ107XG4gICAgaWYgKCFJRF9QQVRURVJOLnRlc3QoaWQpKSB7XG4gICAgICB0aHJvdyBuZXcgU3Rvcmllc1ZhbGlkYXRpb25FcnJvcihgaWQgXCIke2lkfVwiIG1heSBjb250YWluIG9ubHkgbGV0dGVycywgZGlnaXRzLCBhbmQgZGFzaGVzYCk7XG4gICAgfVxuICAgIC8vIFJ1bGUgMTogcmVxdWlyZWQgZmllbGRzLlxuICAgIGlmICh0eXBlb2YgZW50cnlbJ3RpdGxlJ10gIT09ICdzdHJpbmcnIHx8IGVudHJ5Wyd0aXRsZSddLmxlbmd0aCA9PT0gMCkge1xuICAgICAgdGhyb3cgbmV3IFN0b3JpZXNWYWxpZGF0aW9uRXJyb3IoYGVudHJ5IFwiJHtpZH1cIiBpcyBtaXNzaW5nIHJlcXVpcmVkIGZpZWxkOiB0aXRsZWApO1xuICAgIH1cbiAgICBpZiAodHlwZW9mIGVudHJ5WydkZXNjcmlwdGlvbiddICE9PSAnc3RyaW5nJyB8fCBlbnRyeVsnZGVzY3JpcHRpb24nXS5sZW5ndGggPT09IDApIHtcbiAgICAgIHRocm93IG5ldyBTdG9yaWVzVmFsaWRhdGlvbkVycm9yKGBlbnRyeSBcIiR7aWR9XCIgaXMgbWlzc2luZyByZXF1aXJlZCBmaWVsZDogZGVzY3JpcHRpb25gKTtcbiAgICB9XG5cbiAgICBlbnRyaWVzLnB1c2goe1xuICAgICAgaWQsXG4gICAgICB0aXRsZTogZW50cnlbJ3RpdGxlJ10sXG4gICAgICBkZXNjcmlwdGlvbjogZW50cnlbJ2Rlc2NyaXB0aW9uJ10sXG4gICAgICBzcGVjQ2hlY2twb2ludDogZW50cnlbJ3NwZWNfY2hlY2twb2ludCddID09PSB0cnVlLFxuICAgICAgZG9uZUNoZWNrcG9pbnQ6IGVudHJ5Wydkb25lX2NoZWNrcG9pbnQnXSA9PT0gdHJ1ZSxcbiAgICAgIGludm9rZURldldpdGg6IHR5cGVvZiBlbnRyeVsnaW52b2tlX2Rldl93aXRoJ10gPT09ICdzdHJpbmcnID8gZW50cnlbJ2ludm9rZV9kZXZfd2l0aCddIDogJycsXG4gICAgfSk7XG4gIH1cblxuICAvLyBSdWxlIDE6IGlkcyB1bmlxdWUuXG4gIGNvbnN0IHNlZW4gPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgZm9yIChjb25zdCB7IGlkIH0gb2YgZW50cmllcykge1xuICAgIGlmIChzZWVuLmhhcyhpZCkpIHRocm93IG5ldyBTdG9yaWVzVmFsaWRhdGlvbkVycm9yKGBkdXBsaWNhdGUgaWQgXCIke2lkfVwiYCk7XG4gICAgc2Vlbi5hZGQoaWQpO1xuICB9XG4gIC8vIFJ1bGUgMjogcHJlZml4LWZyZWUgdW5kZXIgdGhlIGA8aWQ+LWAgZmlsZW5hbWUtbWF0Y2hpbmcgY29udmVudGlvbi5cbiAgZm9yIChjb25zdCBhIG9mIHNlZW4pIHtcbiAgICBmb3IgKGNvbnN0IGIgb2Ygc2Vlbikge1xuICAgICAgaWYgKGEgIT09IGIgJiYgYS5zdGFydHNXaXRoKGAke2J9LWApKSB7XG4gICAgICAgIHRocm93IG5ldyBTdG9yaWVzVmFsaWRhdGlvbkVycm9yKGBpZHMgXCIke2J9XCIgYW5kIFwiJHthfVwiIGNvbGxpZGUgdW5kZXIgdGhlIDxpZD4tIGNvbnZlbnRpb25gKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgcmV0dXJuIGVudHJpZXM7XG59XG4iLCAiLyoqXG4gKiBJbi1tZW1vcnkgcmVmZXJlbmNlIGltcGxlbWVudGF0aW9uIG9mIHRoZSBzcGluZSBlbmdpbmUsIHdyaXR0ZW4gdG8gbWFrZSB0aGVcbiAqIGNvbmZvcm1hbmNlIHN1aXRlIGluIHRlc3QvIHBhc3MuIFRoZSBwcm9kdWN0aW9uIHNlcnZpY2Ugd3JhcHMgdGhpcyBzYW1lXG4gKiBjb3JlIHdpdGggUG9zdGdyZXMgcGVyc2lzdGVuY2UgKFBoYXNlIDEgc3RvcnkgXCIxMVwiKS5cbiAqXG4gKiBSdWxlIHByb3ZlbmFuY2UgbGl2ZXMgaW4gdGhlIHRlc3RzIGFuZCBpbiB0ZXN0L0NPTkZPUk1BTkNFLm1kIFx1MjAxNCB0aGlzIGZpbGVcbiAqIG9ubHkgZW5jb2RlcyB3aGF0IHRoZSBzdWl0ZSBwaW5zLiBXaGVyZSBhbiBvcmRlcmluZyBvciBzZW1hbnRpYyB3YXNcbiAqIGFyYml0cmF0ZWQsIHRoZSBjb21tZW50IG5hbWVzIHRoZSBwaW4uXG4gKi9cbmltcG9ydCB7XG4gIEFHRU5UX0dBVEVfQVBQUk9WRV9QRVJNSVNTSU9OUyxcbiAgQUdFTlRfSk9CX01BWF9ERVBUSCxcbiAgQkxPQ0tFRF9SRUFTT05TLFxuICBDb25mbGljdEVycm9yLFxuICBERUZBVUxUX1BMQU4sXG4gIERFTElWRVJZX1JPTEVTLFxuICBHdWFyZEZhaWxlZEVycm9yLFxuICBJbnZhbGlkVHJhbnNpdGlvbkVycm9yLFxuICBQZXJtaXNzaW9uRGVuaWVkRXJyb3IsXG4gIFBFUlNPTkFTLFxuICBQTEFOX0NFSUxJTkdTLFxuICBSRVZJRVdfTE9PUF9MSU1JVCxcbiAgU3Rvcmllc1ZhbGlkYXRpb25FcnJvcixcbiAgV09SS19JVEVNX1NUQVRFUyxcbiAgdHlwZSBBY3RvcixcbiAgdHlwZSBBY3RvclR5cGUsXG4gIHR5cGUgQWR2YW5jZUlucHV0LFxuICB0eXBlIEFnZW50Sm9iLFxuICB0eXBlIEF1dGh6RXhwbGFuYXRpb24sXG4gIHR5cGUgQmxvY2tlZFJlYXNvbixcbiAgdHlwZSBBZ2VudE1lbW9yeSxcbiAgdHlwZSBNZW1vcnlLaW5kLFxuICB0eXBlIE1lbnRpb24sXG4gIHR5cGUgTWVzc2FnZSxcbiAgdHlwZSBOb3RpZmljYXRpb24sXG4gIHR5cGUgVGhyZWFkLFxuICB0eXBlIFRocmVhZEtpbmQsXG4gIHR5cGUgVGhyZWFkVmlzaWJpbGl0eSxcbiAgdHlwZSBDbGFpbSxcbiAgdHlwZSBDcmVhdGVXb3JrSXRlbUlucHV0LFxuICB0eXBlIERpdmVyZ2VuY2VSZXBvcnQsXG4gIHR5cGUgRXZpZGVuY2UsXG4gIHR5cGUgRmVhdHVyZSxcbiAgdHlwZSBHYXRlQ29kZSxcbiAgdHlwZSBHYXRlRGVjaXNpb25JbnB1dCxcbiAgdHlwZSBHYXRlUG9saWN5LFxuICB0eXBlIEdvdmVybmFuY2VSb2xlLFxuICB0eXBlIFBlcm1pc3Npb24sXG4gIHR5cGUgUGxhbkNvZGUsXG4gIHR5cGUgUm9sZUFzc2lnbm1lbnQsXG4gIHR5cGUgU3BpbmVFbmdpbmUsXG4gIHR5cGUgU3BpbmVFdmVudCxcbiAgdHlwZSBTdG9yaWVzSW1wb3J0UmVzdWx0LFxuICB0eXBlIFdvcmtJdGVtLFxuICB0eXBlIFdvcmtJdGVtS2luZCxcbiAgdHlwZSBXb3JrSXRlbVN0YXRlLFxuICB0eXBlIFdvcmtzcGFjZVBvbGljeSxcbn0gZnJvbSAnLi90eXBlcy5qcyc7XG5pbXBvcnQgeyBwYXJzZVN0b3JpZXMgfSBmcm9tICcuL3N0b3JpZXMuanMnO1xuXG5jb25zdCBSQU5LOiBSZWNvcmQ8V29ya0l0ZW1TdGF0ZSwgbnVtYmVyPiA9IE9iamVjdC5mcm9tRW50cmllcyhcbiAgV09SS19JVEVNX1NUQVRFUy5tYXAoKHMsIGkpID0+IFtzLCBpXSksXG4pIGFzIFJlY29yZDxXb3JrSXRlbVN0YXRlLCBudW1iZXI+O1xuXG4vKipcbiAqIFRoZSB2ZXJzaW9uZWQgdHJhbnNpdGlvbiB0YWJsZSAocm9hZG1hcCBcdTAwQTcxLjIpLiBDbGFpbXMgc2VyaWFsaXplIHRoZVxuICogRVhFQ1VUSU9OIHpvbmUgKGNvbmZvcm1hbmNlIHBpbiwgc2VlIHRlc3QvQ09ORk9STUFOQ0UubWQpOiBwbGFubmluZ1xuICogdHJhbnNpdGlvbnMgYXJlIHBlcm1pc3Npb24tb25seTsgcmVhZHlfZm9yX2Rldlx1MjE5MmluX3Byb2dyZXNzIG9ud2FyZCBkZW1hbmQgYVxuICogcHJlc2VudGVkLCBsaXZlIGZlbmNpbmcgdG9rZW4uIEdhdGUtZmlyZWQgdHJhbnNpdGlvbnMgKHNwZWNfYXBwcm92YWwsXG4gKiByZXZpZXdfYXBwcm92YWwpIGRvIG5vdCBhcHBlYXIgaGVyZSBcdTIwMTQgYXBwcm92ZUdhdGUvcmVqZWN0R2F0ZSBmaXJlIHRoZW0uXG4gKi9cbmludGVyZmFjZSBUcmFuc2l0aW9uUnVsZSB7XG4gIGZyb206IFdvcmtJdGVtU3RhdGU7XG4gIHRvOiBXb3JrSXRlbVN0YXRlO1xuICBwZXJtaXNzaW9uOiBQZXJtaXNzaW9uO1xuICBjbGFpbVJlcXVpcmVkOiBib29sZWFuO1xuICBndWFyZHM6IEFycmF5PCdkZXBzX2RvbmUnIHwgJ3NwZWNfZ2F0ZV9pZl9jaGVja3BvaW50JyB8ICdub25lbXB0eV9kaWZmJz47XG59XG5cbmNvbnN0IFRSQU5TSVRJT05TOiBUcmFuc2l0aW9uUnVsZVtdID0gW1xuICB7IGZyb206ICdiYWNrbG9nJywgdG86ICdkcmFmdCcsIHBlcm1pc3Npb246ICd0YXNrLnBsYW4nLCBjbGFpbVJlcXVpcmVkOiBmYWxzZSwgZ3VhcmRzOiBbXSB9LFxuICB7XG4gICAgZnJvbTogJ2RyYWZ0JyxcbiAgICB0bzogJ3JlYWR5X2Zvcl9kZXYnLFxuICAgIHBlcm1pc3Npb246ICd0YXNrLnBsYW4nLFxuICAgIGNsYWltUmVxdWlyZWQ6IGZhbHNlLFxuICAgIGd1YXJkczogWydzcGVjX2dhdGVfaWZfY2hlY2twb2ludCddLFxuICB9LFxuICB7XG4gICAgZnJvbTogJ3JlYWR5X2Zvcl9kZXYnLFxuICAgIHRvOiAnaW5fcHJvZ3Jlc3MnLFxuICAgIHBlcm1pc3Npb246ICd0YXNrLmFkdmFuY2UnLFxuICAgIGNsYWltUmVxdWlyZWQ6IHRydWUsXG4gICAgZ3VhcmRzOiBbJ2RlcHNfZG9uZSddLFxuICB9LFxuICB7XG4gICAgZnJvbTogJ2luX3Byb2dyZXNzJyxcbiAgICB0bzogJ2luX3JldmlldycsXG4gICAgcGVybWlzc2lvbjogJ3Rhc2suYWR2YW5jZScsXG4gICAgY2xhaW1SZXF1aXJlZDogdHJ1ZSxcbiAgICBndWFyZHM6IFsnbm9uZW1wdHlfZGlmZiddLFxuICB9LFxuXTtcblxuaW50ZXJmYWNlIFdvcmtJdGVtUm93IGV4dGVuZHMgV29ya0l0ZW0ge1xuICBkZXBlbmRzT246IHN0cmluZ1tdO1xufVxuXG5pbnRlcmZhY2UgQ2xhaW1Sb3cgZXh0ZW5kcyBDbGFpbSB7XG4gIHR0bE1zOiBudW1iZXI7XG59XG5cbmludGVyZmFjZSBHYXRlRGVjaXNpb25Sb3cge1xuICB3b3JrSXRlbUlkOiBzdHJpbmc7XG4gIGdhdGU6IEdhdGVDb2RlO1xuICBkZWNpc2lvbjogJ2FwcHJvdmVkJyB8ICdyZWplY3RlZCc7XG4gIGFjdG9ySWQ6IHN0cmluZztcbiAgLyoqIHJldmlldyByb3VuZCB0aGUgZGVjaXNpb24gYmVsb25ncyB0byAoPSByZXZpZXdMb29wSXRlcmF0aW9uIGF0IGRlY2lzaW9uIHRpbWUpICovXG4gIHJvdW5kOiBudW1iZXI7XG59XG5cbmludGVyZmFjZSBSb2xlQXNzaWdubWVudFJvdyBleHRlbmRzIFJvbGVBc3NpZ25tZW50IHt9XG5cbmludGVyZmFjZSBFdmlkZW5jZVJvdyB7XG4gIHdvcmtJdGVtSWQ6IHN0cmluZztcbiAgZXZpZGVuY2U6IEV2aWRlbmNlO1xuICBzZXE6IG51bWJlcjtcbn1cblxuY29uc3QgTEVHQUNZX1NUQVRVUzogUmVjb3JkPHN0cmluZywgV29ya0l0ZW1TdGF0ZT4gPSB7XG4gIGJhY2tsb2c6ICdiYWNrbG9nJyxcbiAgZHJhZnQ6ICdkcmFmdCcsXG4gICdyZWFkeS1mb3ItZGV2JzogJ3JlYWR5X2Zvcl9kZXYnLFxuICByZWFkeV9mb3JfZGV2OiAncmVhZHlfZm9yX2RldicsXG4gICdpbi1wcm9ncmVzcyc6ICdpbl9wcm9ncmVzcycsXG4gIGluX3Byb2dyZXNzOiAnaW5fcHJvZ3Jlc3MnLFxuICAnaW4tcmV2aWV3JzogJ2luX3JldmlldycsXG4gIGluX3JldmlldzogJ2luX3JldmlldycsXG4gIHJldmlldzogJ2luX3JldmlldycsXG4gIGRvbmU6ICdkb25lJyxcbn07XG5cbmNsYXNzIEVuZ2luZUltcGwgaW1wbGVtZW50cyBTcGluZUVuZ2luZSB7XG4gIHByaXZhdGUgbm93ID0gMDtcbiAgcHJpdmF0ZSBzZXEgPSAwO1xuICBwcml2YXRlIGdsb2JhbFNlcSA9IDA7XG5cbiAgcHJpdmF0ZSByZWFkb25seSBhY3RvcnMgPSBuZXcgTWFwPHN0cmluZywgQWN0b3I+KCk7XG4gIHByaXZhdGUgcmVhZG9ubHkgZ3JhbnRzID0gbmV3IE1hcDxzdHJpbmcsIFNldDxzdHJpbmc+PigpOyAvLyBhY3RvcklkIC0+IFwicGVybWlzc2lvblwiIChzY29wZSBpZ25vcmVkIHVudGlsIFBoYXNlIDIpXG4gIHByaXZhdGUgcmVhZG9ubHkgZmVhdHVyZXMgPSBuZXcgTWFwPHN0cmluZywgRmVhdHVyZT4oKTtcbiAgcHJpdmF0ZSByZWFkb25seSB3b3JrSXRlbXMgPSBuZXcgTWFwPHN0cmluZywgV29ya0l0ZW1Sb3c+KCk7XG4gIHByaXZhdGUgcmVhZG9ubHkgZXh0ZXJuYWxLZXlJbmRleCA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmc+KCk7IC8vIGV4dGVybmFsS2V5IC0+IHdvcmtJdGVtSWQgKGZpcnN0IHdyaXRlciB3aW5zKVxuICBwcml2YXRlIHJlYWRvbmx5IGNsYWltcyA9IG5ldyBNYXA8c3RyaW5nLCBDbGFpbVJvdz4oKTtcbiAgcHJpdmF0ZSByZWFkb25seSBjbGFpbXNCeUl0ZW0gPSBuZXcgTWFwPHN0cmluZywgc3RyaW5nW10+KCk7IC8vIHdvcmtJdGVtSWQgLT4gY2xhaW1JZHNcbiAgcHJpdmF0ZSByZWFkb25seSBmZW5jaW5nQ291bnRlciA9IG5ldyBNYXA8c3RyaW5nLCBudW1iZXI+KCk7IC8vIHdvcmtJdGVtSWQgLT4gbGFzdCB0b2tlblxuICBwcml2YXRlIHJlYWRvbmx5IGdhdGVEZWNpc2lvbnM6IEdhdGVEZWNpc2lvblJvd1tdID0gW107XG4gIHByaXZhdGUgcmVhZG9ubHkgZXZpZGVuY2VSb3dzOiBFdmlkZW5jZVJvd1tdID0gW107XG4gIHByaXZhdGUgcmVhZG9ubHkgZXZlbnRMb2c6IFNwaW5lRXZlbnRbXSA9IFtdO1xuICBwcml2YXRlIHJlYWRvbmx5IHN0cmVhbVNlcXMgPSBuZXcgTWFwPHN0cmluZywgbnVtYmVyPigpO1xuICBwcml2YXRlIHJlYWRvbmx5IGlkZW1wb3RlbmN5Q2FjaGUgPSBuZXcgTWFwPHN0cmluZywgV29ya0l0ZW0+KCk7XG5cbiAgLy8gLS0gZW50aXRsZW1lbnRzIHN0YXRlIChQaGFzZSAyLCByb2FkbWFwIFx1MDBBNzMpIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHByaXZhdGUgcmVhZG9ubHkgZ292ZXJuYW5jZVJvbGVzID0gbmV3IE1hcDxzdHJpbmcsIEdvdmVybmFuY2VSb2xlPigpO1xuICBwcml2YXRlIHJlYWRvbmx5IHJvbGVBc3NpZ25tZW50czogUm9sZUFzc2lnbm1lbnRSb3dbXSA9IFtdO1xuICBwcml2YXRlIHBsYW46IFBsYW5Db2RlID0gREVGQVVMVF9QTEFOO1xuICBwcml2YXRlIHBsYW5WZXJzaW9uID0gMTtcbiAgcHJpdmF0ZSB3b3Jrc3BhY2VQb2xpY3k6IFdvcmtzcGFjZVBvbGljeSA9IHt9O1xuICBwcml2YXRlIHBvbGljeVZlcnNpb24gPSAxO1xuICBwcml2YXRlIHJlYWRvbmx5IGdhdGVQb2xpY2llcyA9IG5ldyBNYXA8R2F0ZUNvZGUsIEdhdGVQb2xpY3k+KCk7XG5cbiAgLy8gLS0gY29sbGFib3JhdGlvbiBzdGF0ZSAoUGhhc2UgMywgcm9hZG1hcCBcdTAwQTc1KSAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICBwcml2YXRlIHJlYWRvbmx5IHRocmVhZHMgPSBuZXcgTWFwPHN0cmluZywgVGhyZWFkPigpO1xuICBwcml2YXRlIHJlYWRvbmx5IG1lc3NhZ2VzOiBNZXNzYWdlW10gPSBbXTtcbiAgcHJpdmF0ZSByZWFkb25seSBtZW50aW9uczogTWVudGlvbltdID0gW107XG4gIHByaXZhdGUgcmVhZG9ubHkgbm90aWZpY2F0aW9uczogTm90aWZpY2F0aW9uW10gPSBbXTtcbiAgcHJpdmF0ZSByZWFkb25seSBhZ2VudEpvYnMgPSBuZXcgTWFwPHN0cmluZywgQWdlbnRKb2I+KCk7XG5cbiAgLy8gLS0gYWdlbnQgbWVtb3J5IHN0YXRlIChQaGFzZSA1LCByb2FkbWFwIFx1MDBBNzYpIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgcHJpdmF0ZSByZWFkb25seSBhZ2VudE1lbW9yaWVzOiBBZ2VudE1lbW9yeVtdID0gW107XG5cbiAgcmVhZG9ubHkgc3lzdGVtQWN0b3JJZDogc3RyaW5nO1xuXG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHRoaXMuc3lzdGVtQWN0b3JJZCA9IHRoaXMubmV4dElkKCdhY3Rvci1zeXN0ZW0nKTtcbiAgICB0aGlzLmFjdG9ycy5zZXQodGhpcy5zeXN0ZW1BY3RvcklkLCB7XG4gICAgICBpZDogdGhpcy5zeXN0ZW1BY3RvcklkLFxuICAgICAgdHlwZTogJ3N5c3RlbScsXG4gICAgICBkaXNwbGF5TmFtZTogJ3N5c3RlbScsXG4gICAgICBwZXJzb25hQ29kZTogbnVsbCxcbiAgICB9KTtcbiAgfVxuXG4gIC8vIC0tIGluZnJhc3RydWN0dXJlIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgcHJpdmF0ZSBuZXh0SWQocHJlZml4OiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIHRoaXMuc2VxICs9IDE7XG4gICAgcmV0dXJuIGAke3ByZWZpeH1fJHt0aGlzLnNlcS50b1N0cmluZygzNikucGFkU3RhcnQoNiwgJzAnKX1gO1xuICB9XG5cbiAgcHJpdmF0ZSBhcHBlbmQoXG4gICAgc3RyZWFtVHlwZTogU3BpbmVFdmVudFsnc3RyZWFtVHlwZSddLFxuICAgIHN0cmVhbUlkOiBzdHJpbmcsXG4gICAgdHlwZTogc3RyaW5nLFxuICAgIGFjdG9ySWQ6IHN0cmluZyxcbiAgICBwYXlsb2FkOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPixcbiAgICBleHRyYT86IHsgY2F1c2F0aW9uSWQ/OiBzdHJpbmc7IGlkZW1wb3RlbmN5S2V5Pzogc3RyaW5nIH0sXG4gICk6IFNwaW5lRXZlbnQge1xuICAgIHRoaXMuZ2xvYmFsU2VxICs9IDE7XG4gICAgY29uc3Qgc3RyZWFtU2VxID0gKHRoaXMuc3RyZWFtU2Vxcy5nZXQoc3RyZWFtSWQpID8/IDApICsgMTtcbiAgICB0aGlzLnN0cmVhbVNlcXMuc2V0KHN0cmVhbUlkLCBzdHJlYW1TZXEpO1xuICAgIGNvbnN0IGV2ZW50OiBTcGluZUV2ZW50ID0ge1xuICAgICAgZ2xvYmFsU2VxOiB0aGlzLmdsb2JhbFNlcSxcbiAgICAgIHN0cmVhbVR5cGUsXG4gICAgICBzdHJlYW1JZCxcbiAgICAgIHN0cmVhbVNlcSxcbiAgICAgIHR5cGUsXG4gICAgICBhY3RvcklkLFxuICAgICAgcGF5bG9hZCxcbiAgICAgIC4uLihleHRyYT8uY2F1c2F0aW9uSWQgIT09IHVuZGVmaW5lZCA/IHsgY2F1c2F0aW9uSWQ6IGV4dHJhLmNhdXNhdGlvbklkIH0gOiB7fSksXG4gICAgfTtcbiAgICB0aGlzLmV2ZW50TG9nLnB1c2goZXZlbnQpO1xuICAgIHJldHVybiBldmVudDtcbiAgfVxuXG4gIHByaXZhdGUgbXVzdEdldEl0ZW0od29ya0l0ZW1JZDogc3RyaW5nKTogV29ya0l0ZW1Sb3cge1xuICAgIGNvbnN0IGJ5SWQgPSB0aGlzLndvcmtJdGVtcy5nZXQod29ya0l0ZW1JZCk7XG4gICAgaWYgKGJ5SWQpIHJldHVybiBieUlkO1xuICAgIC8vIEltcG9ydGVkIHN0b3JpZXMgYXJlIGFkZHJlc3NlZCBieSB0aGVpciBleHRlcm5hbEtleSBoYW5kbGVcbiAgICAvLyAoY29uZm9ybWFuY2UgcGluIGluIHN0b3JpZXMtaW1wb3J0LnRlc3QudHMpLlxuICAgIGNvbnN0IG1hcHBlZCA9IHRoaXMuZXh0ZXJuYWxLZXlJbmRleC5nZXQod29ya0l0ZW1JZCk7XG4gICAgaWYgKG1hcHBlZCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBjb25zdCBpdGVtID0gdGhpcy53b3JrSXRlbXMuZ2V0KG1hcHBlZCk7XG4gICAgICBpZiAoaXRlbSkgcmV0dXJuIGl0ZW07XG4gICAgfVxuICAgIHRocm93IG5ldyBHdWFyZEZhaWxlZEVycm9yKGB1bmtub3duIHdvcmsgaXRlbTogJHt3b3JrSXRlbUlkfWApO1xuICB9XG5cbiAgLyoqXG4gICAqIEVudGl0bGVtZW50IHJlc29sdXRpb24gXHUyMDE0IGEgUFVSRSBmdW5jdGlvbiBvdmVyIHBsYW4gXHUwMEQ3IGdvdmVybmFuY2UgXHUwMEQ3XG4gICAqIGRlbGl2ZXJ5LXJvbGUgZGF0YSAocm9hZG1hcCBcdTAwQTczKS4gQSBncmFudCBtYXkgRVhJU1QgKGRpcmVjdCBvciB2aWEgYVxuICAgKiByb2xlKSBhbmQgc3RpbGwgbm90IFJFU09MVkUgZm9yIGFuIGFnZW50IHdoZW4gdGhlIHBsYW4gY2VpbGluZyBvciB0aGVcbiAgICogcmVzdHJpY3Qtb25seSB3b3Jrc3BhY2UgcG9saWN5IG5hcnJvd3MgaXQuIFVzZXJzIGFyZSBuZXZlciBwbGFuLWZpbHRlcmVkLlxuICAgKi9cbiAgcHJpdmF0ZSBncmFudFNvdXJjZShhY3RvcklkOiBzdHJpbmcsIHBlcm1pc3Npb246IFBlcm1pc3Npb24pOiBzdHJpbmcgfCBudWxsIHtcbiAgICBpZiAodGhpcy5ncmFudHMuZ2V0KGFjdG9ySWQpPy5oYXMocGVybWlzc2lvbikpIHJldHVybiAnZGlyZWN0JztcbiAgICBmb3IgKGNvbnN0IGFzc2lnbm1lbnQgb2YgdGhpcy5yb2xlQXNzaWdubWVudHMpIHtcbiAgICAgIGlmIChhc3NpZ25tZW50LmFjdG9ySWQgIT09IGFjdG9ySWQgfHwgYXNzaWdubWVudC5yZXZva2VkKSBjb250aW51ZTtcbiAgICAgIGlmICgoREVMSVZFUllfUk9MRVNbYXNzaWdubWVudC5yb2xlQ29kZV0gPz8gW10pLmluY2x1ZGVzKHBlcm1pc3Npb24pKSB7XG4gICAgICAgIHJldHVybiBgcm9sZToke2Fzc2lnbm1lbnQucm9sZUNvZGV9YDtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICBwcml2YXRlIGFnZW50Q2VpbGluZ0FsbG93cyhhY3RvcjogQWN0b3IgfCB1bmRlZmluZWQsIHBlcm1pc3Npb246IFBlcm1pc3Npb24pOiB7IHBsYW46IGJvb2xlYW47IHBvbGljeTogYm9vbGVhbiB9IHtcbiAgICBpZiAoIWFjdG9yIHx8IGFjdG9yLnR5cGUgIT09ICdhZ2VudCcpIHJldHVybiB7IHBsYW46IHRydWUsIHBvbGljeTogdHJ1ZSB9O1xuICAgIGNvbnN0IGNlaWxpbmcgPSBQTEFOX0NFSUxJTkdTW3RoaXMucGxhbl07XG4gICAgaWYgKChBR0VOVF9HQVRFX0FQUFJPVkVfUEVSTUlTU0lPTlMgYXMgcmVhZG9ubHkgc3RyaW5nW10pLmluY2x1ZGVzKHBlcm1pc3Npb24pKSB7XG4gICAgICByZXR1cm4geyBwbGFuOiBjZWlsaW5nLmFnZW50R2F0ZUFwcHJvdmUsIHBvbGljeTogdGhpcy53b3Jrc3BhY2VQb2xpY3kuYWdlbnRHYXRlQXBwcm92YWxzICE9PSBmYWxzZSB9O1xuICAgIH1cbiAgICBpZiAocGVybWlzc2lvbiA9PT0gJ2dhdGUucmV2aWV3LnJlamVjdCcpIHtcbiAgICAgIHJldHVybiB7IHBsYW46IGNlaWxpbmcuYWdlbnRHYXRlUmVqZWN0LCBwb2xpY3k6IHRydWUgfTtcbiAgICB9XG4gICAgaWYgKHBlcm1pc3Npb24gPT09ICd0YXNrLmNsYWltJykge1xuICAgICAgcmV0dXJuIHsgcGxhbjogdHJ1ZSwgcG9saWN5OiB0aGlzLndvcmtzcGFjZVBvbGljeS5hZ2VudFNlbGZEaXNwYXRjaCAhPT0gZmFsc2UgfTtcbiAgICB9XG4gICAgcmV0dXJuIHsgcGxhbjogdHJ1ZSwgcG9saWN5OiB0cnVlIH07XG4gIH1cblxuICBwcml2YXRlIGhhc1Blcm1pc3Npb24oYWN0b3JJZDogc3RyaW5nLCBwZXJtaXNzaW9uOiBQZXJtaXNzaW9uKTogYm9vbGVhbiB7XG4gICAgaWYgKHRoaXMuZ3JhbnRTb3VyY2UoYWN0b3JJZCwgcGVybWlzc2lvbikgPT09IG51bGwpIHJldHVybiBmYWxzZTtcbiAgICBjb25zdCBhbGxvd3MgPSB0aGlzLmFnZW50Q2VpbGluZ0FsbG93cyh0aGlzLmFjdG9ycy5nZXQoYWN0b3JJZCksIHBlcm1pc3Npb24pO1xuICAgIHJldHVybiBhbGxvd3MucGxhbiAmJiBhbGxvd3MucG9saWN5O1xuICB9XG5cbiAgcHJpdmF0ZSByZXF1aXJlUGVybWlzc2lvbihhY3RvcklkOiBzdHJpbmcsIHBlcm1pc3Npb246IFBlcm1pc3Npb24pOiB2b2lkIHtcbiAgICBpZiAoIXRoaXMuaGFzUGVybWlzc2lvbihhY3RvcklkLCBwZXJtaXNzaW9uKSkge1xuICAgICAgdGhyb3cgbmV3IFBlcm1pc3Npb25EZW5pZWRFcnJvcihwZXJtaXNzaW9uLCBhY3RvcklkKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIHJlcXVpcmVHb3Zlcm5hbmNlQWRtaW4oYnlBY3RvcklkOiBzdHJpbmcpOiB2b2lkIHtcbiAgICBpZiAoYnlBY3RvcklkID09PSB0aGlzLnN5c3RlbUFjdG9ySWQpIHJldHVybjtcbiAgICBpZiAodGhpcy5nb3Zlcm5hbmNlUm9sZXMuZ2V0KGJ5QWN0b3JJZCkgPT09ICdhZG1pbicpIHJldHVybjtcbiAgICB0aHJvdyBuZXcgUGVybWlzc2lvbkRlbmllZEVycm9yKCdnb3Zlcm5hbmNlLmFkbWluJywgYnlBY3RvcklkKTtcbiAgfVxuXG4gIC8qKiBHcmFudC10aW1lIHBsYW4gY2VpbGluZzogcmVmdXNlIGlzc3VpbmcgYWdlbnQgZ2F0ZSBwZXJtaXNzaW9ucyB0aGUgcGxhbiBmb3JiaWRzLiAqL1xuICBwcml2YXRlIGNoZWNrR3JhbnRDZWlsaW5nKGFjdG9ySWQ6IHN0cmluZywgcGVybWlzc2lvbjogUGVybWlzc2lvbik6IHZvaWQge1xuICAgIGNvbnN0IGFjdG9yID0gdGhpcy5hY3RvcnMuZ2V0KGFjdG9ySWQpO1xuICAgIGlmICghYWN0b3IgfHwgYWN0b3IudHlwZSAhPT0gJ2FnZW50JykgcmV0dXJuO1xuICAgIGNvbnN0IGNlaWxpbmcgPSBQTEFOX0NFSUxJTkdTW3RoaXMucGxhbl07XG4gICAgaWYgKChBR0VOVF9HQVRFX0FQUFJPVkVfUEVSTUlTU0lPTlMgYXMgcmVhZG9ubHkgc3RyaW5nW10pLmluY2x1ZGVzKHBlcm1pc3Npb24pICYmICFjZWlsaW5nLmFnZW50R2F0ZUFwcHJvdmUpIHtcbiAgICAgIHRocm93IG5ldyBHdWFyZEZhaWxlZEVycm9yKGBwbGFuICR7dGhpcy5wbGFufSBkb2VzIG5vdCBhbGxvdyBhZ2VudHMgdG8gaG9sZCAke3Blcm1pc3Npb259YCk7XG4gICAgfVxuICAgIGlmIChwZXJtaXNzaW9uID09PSAnZ2F0ZS5yZXZpZXcucmVqZWN0JyAmJiAhY2VpbGluZy5hZ2VudEdhdGVSZWplY3QpIHtcbiAgICAgIHRocm93IG5ldyBHdWFyZEZhaWxlZEVycm9yKGBwbGFuICR7dGhpcy5wbGFufSBkb2VzIG5vdCBhbGxvdyBhZ2VudHMgdG8gaG9sZCAke3Blcm1pc3Npb259YCk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBsaXZlQ2xhaW0od29ya0l0ZW1JZDogc3RyaW5nKTogQ2xhaW1Sb3cgfCBudWxsIHtcbiAgICBmb3IgKGNvbnN0IGNsYWltSWQgb2YgdGhpcy5jbGFpbXNCeUl0ZW0uZ2V0KHdvcmtJdGVtSWQpID8/IFtdKSB7XG4gICAgICBjb25zdCBjbGFpbSA9IHRoaXMuY2xhaW1zLmdldChjbGFpbUlkKTtcbiAgICAgIGlmIChjbGFpbSAmJiAhY2xhaW0ucmVsZWFzZWQgJiYgY2xhaW0ubGVhc2VFeHBpcmVzQXQgPiB0aGlzLm5vdykgcmV0dXJuIGNsYWltO1xuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIC8qKlxuICAgKiBBIFBSRVNFTlRFRCB0b2tlbiBpcyBhbHdheXMgdmFsaWRhdGVkLCBvbiBldmVyeSBjb21tYW5kIChjb25mb3JtYW5jZSBwaW4sXG4gICAqIGNsYWltcy50ZXN0LnRzKTogc3RhbGUvZm9yZWlnbi9uby1saXZlLWNsYWltIFx1MjE5MiBDb25mbGljdEVycm9yICsgYXVkaXQgZXZlbnQuXG4gICAqL1xuICBwcml2YXRlIHZhbGlkYXRlUHJlc2VudGVkVG9rZW4oaXRlbTogV29ya0l0ZW1Sb3csIGZlbmNpbmdUb2tlbjogbnVtYmVyIHwgdW5kZWZpbmVkLCBhY3RvcklkOiBzdHJpbmcpOiB2b2lkIHtcbiAgICBpZiAoZmVuY2luZ1Rva2VuID09PSB1bmRlZmluZWQpIHJldHVybjtcbiAgICBjb25zdCBsaXZlID0gdGhpcy5saXZlQ2xhaW0oaXRlbS5pZCk7XG4gICAgaWYgKGxpdmUgPT09IG51bGwgfHwgbGl2ZS5mZW5jaW5nVG9rZW4gIT09IGZlbmNpbmdUb2tlbikge1xuICAgICAgdGhpcy5hcHBlbmQoJ3dvcmtfaXRlbScsIGl0ZW0uaWQsICdmZW5jaW5nLnJlamVjdGVkJywgYWN0b3JJZCwge1xuICAgICAgICBwcmVzZW50ZWRUb2tlbjogZmVuY2luZ1Rva2VuLFxuICAgICAgICBsaXZlVG9rZW46IGxpdmU/LmZlbmNpbmdUb2tlbiA/PyBudWxsLFxuICAgICAgfSk7XG4gICAgICB0aHJvdyBuZXcgQ29uZmxpY3RFcnJvcihgc3RhbGUgb3IgZm9yZWlnbiBmZW5jaW5nIHRva2VuIGZvciB3b3JrIGl0ZW0gJHtpdGVtLmlkfWApO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgY29weUl0ZW0oaXRlbTogV29ya0l0ZW1Sb3cpOiBXb3JrSXRlbSB7XG4gICAgY29uc3QgeyBkZXBlbmRzT246IF9kZXBlbmRzT24sIC4uLnB1YiB9ID0gaXRlbTtcbiAgICByZXR1cm4geyAuLi5wdWIsIHBpbm5lZFZlcmlmaWNhdGlvbjogaXRlbS5waW5uZWRWZXJpZmljYXRpb24gPyBbLi4uaXRlbS5waW5uZWRWZXJpZmljYXRpb25dIDogbnVsbCB9O1xuICB9XG5cbiAgcHJpdmF0ZSBjb3B5RmVhdHVyZShmZWF0dXJlOiBGZWF0dXJlKTogRmVhdHVyZSB7XG4gICAgcmV0dXJuIHsgLi4uZmVhdHVyZSB9O1xuICB9XG5cbiAgcHJpdmF0ZSBjb3B5Q2xhaW0oY2xhaW06IENsYWltUm93KTogQ2xhaW0ge1xuICAgIGNvbnN0IHsgdHRsTXM6IF90dGwsIC4uLnB1YiB9ID0gY2xhaW07XG4gICAgcmV0dXJuIHsgLi4ucHViIH07XG4gIH1cblxuICAvLyAtLSBzZXR1cCAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIGNyZWF0ZUFjdG9yKGlucHV0OiB7XG4gICAgdHlwZTogRXhjbHVkZTxBY3RvclR5cGUsICdzeXN0ZW0nPjtcbiAgICBkaXNwbGF5TmFtZTogc3RyaW5nO1xuICAgIGdvdmVybmFuY2VSb2xlPzogR292ZXJuYW5jZVJvbGU7XG4gICAgcGVyc29uYUNvZGU/OiBzdHJpbmc7XG4gIH0pOiBBY3RvciB7XG4gICAgY29uc3QgYWN0b3I6IEFjdG9yID0ge1xuICAgICAgaWQ6IHRoaXMubmV4dElkKCdhY3RvcicpLFxuICAgICAgdHlwZTogaW5wdXQudHlwZSxcbiAgICAgIGRpc3BsYXlOYW1lOiBpbnB1dC5kaXNwbGF5TmFtZSxcbiAgICAgIHBlcnNvbmFDb2RlOiBpbnB1dC5wZXJzb25hQ29kZSA/PyBudWxsLFxuICAgIH07XG4gICAgdGhpcy5hY3RvcnMuc2V0KGFjdG9yLmlkLCBhY3Rvcik7XG4gICAgdGhpcy5nb3Zlcm5hbmNlUm9sZXMuc2V0KGFjdG9yLmlkLCBpbnB1dC5nb3Zlcm5hbmNlUm9sZSA/PyAnbWVtYmVyJyk7XG4gICAgcmV0dXJuIHsgLi4uYWN0b3IgfTtcbiAgfVxuXG4gIGdyYW50KGlucHV0OiB7IGFjdG9ySWQ6IHN0cmluZzsgcGVybWlzc2lvbjogUGVybWlzc2lvbjsgc2NvcGU/OiBzdHJpbmcgfSk6IHZvaWQge1xuICAgIHRoaXMuY2hlY2tHcmFudENlaWxpbmcoaW5wdXQuYWN0b3JJZCwgaW5wdXQucGVybWlzc2lvbik7XG4gICAgY29uc3Qgc2V0ID0gdGhpcy5ncmFudHMuZ2V0KGlucHV0LmFjdG9ySWQpID8/IG5ldyBTZXQ8c3RyaW5nPigpO1xuICAgIHNldC5hZGQoaW5wdXQucGVybWlzc2lvbik7XG4gICAgdGhpcy5ncmFudHMuc2V0KGlucHV0LmFjdG9ySWQsIHNldCk7XG4gICAgdGhpcy5hcHBlbmQoJ2FjdG9yJywgaW5wdXQuYWN0b3JJZCwgJ2dyYW50Lmlzc3VlZCcsIHRoaXMuc3lzdGVtQWN0b3JJZCwgeyBwZXJtaXNzaW9uOiBpbnB1dC5wZXJtaXNzaW9uIH0pO1xuICB9XG5cbiAgcmV2b2tlKGlucHV0OiB7IGFjdG9ySWQ6IHN0cmluZzsgcGVybWlzc2lvbjogUGVybWlzc2lvbjsgc2NvcGU/OiBzdHJpbmcgfSk6IHZvaWQge1xuICAgIHRoaXMuZ3JhbnRzLmdldChpbnB1dC5hY3RvcklkKT8uZGVsZXRlKGlucHV0LnBlcm1pc3Npb24pO1xuICAgIHRoaXMuYXBwZW5kKCdhY3RvcicsIGlucHV0LmFjdG9ySWQsICdncmFudC5yZXZva2VkJywgdGhpcy5zeXN0ZW1BY3RvcklkLCB7IHBlcm1pc3Npb246IGlucHV0LnBlcm1pc3Npb24gfSk7XG4gIH1cblxuICAvLyAtLSBlbnRpdGxlbWVudHMgKFBoYXNlIDIsIHJvYWRtYXAgXHUwMEE3MykgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIHNldEdvdmVybmFuY2VSb2xlKGlucHV0OiB7IGFjdG9ySWQ6IHN0cmluZzsgcm9sZTogR292ZXJuYW5jZVJvbGU7IGJ5QWN0b3JJZDogc3RyaW5nIH0pOiB2b2lkIHtcbiAgICB0aGlzLnJlcXVpcmVHb3Zlcm5hbmNlQWRtaW4oaW5wdXQuYnlBY3RvcklkKTtcbiAgICBpZiAoIXRoaXMuYWN0b3JzLmhhcyhpbnB1dC5hY3RvcklkKSkgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoYHVua25vd24gYWN0b3I6ICR7aW5wdXQuYWN0b3JJZH1gKTtcbiAgICB0aGlzLmdvdmVybmFuY2VSb2xlcy5zZXQoaW5wdXQuYWN0b3JJZCwgaW5wdXQucm9sZSk7XG4gICAgdGhpcy5hcHBlbmQoJ2FjdG9yJywgaW5wdXQuYWN0b3JJZCwgJ2dvdmVybmFuY2UuY2hhbmdlZCcsIGlucHV0LmJ5QWN0b3JJZCwgeyByb2xlOiBpbnB1dC5yb2xlIH0pO1xuICB9XG5cbiAgZ2V0R292ZXJuYW5jZVJvbGUoYWN0b3JJZDogc3RyaW5nKTogR292ZXJuYW5jZVJvbGUge1xuICAgIHJldHVybiB0aGlzLmdvdmVybmFuY2VSb2xlcy5nZXQoYWN0b3JJZCkgPz8gJ21lbWJlcic7XG4gIH1cblxuICBhc3NpZ25Sb2xlKGlucHV0OiB7IGFjdG9ySWQ6IHN0cmluZzsgcm9sZUNvZGU6IHN0cmluZzsgYnlBY3RvcklkOiBzdHJpbmcgfSk6IHZvaWQge1xuICAgIHRoaXMucmVxdWlyZUdvdmVybmFuY2VBZG1pbihpbnB1dC5ieUFjdG9ySWQpO1xuICAgIGNvbnN0IGJ1bmRsZSA9IERFTElWRVJZX1JPTEVTW2lucHV0LnJvbGVDb2RlXTtcbiAgICBpZiAoYnVuZGxlID09PSB1bmRlZmluZWQpIHRocm93IG5ldyBHdWFyZEZhaWxlZEVycm9yKGB1bmtub3duIGRlbGl2ZXJ5IHJvbGU6ICR7aW5wdXQucm9sZUNvZGV9YCk7XG4gICAgaWYgKCF0aGlzLmFjdG9ycy5oYXMoaW5wdXQuYWN0b3JJZCkpIHRocm93IG5ldyBHdWFyZEZhaWxlZEVycm9yKGB1bmtub3duIGFjdG9yOiAke2lucHV0LmFjdG9ySWR9YCk7XG4gICAgZm9yIChjb25zdCBwZXJtaXNzaW9uIG9mIGJ1bmRsZSkge1xuICAgICAgdGhpcy5jaGVja0dyYW50Q2VpbGluZyhpbnB1dC5hY3RvcklkLCBwZXJtaXNzaW9uKTtcbiAgICB9XG4gICAgY29uc3QgYWN0aXZlID0gdGhpcy5yb2xlQXNzaWdubWVudHMuc29tZShcbiAgICAgIChhKSA9PiBhLmFjdG9ySWQgPT09IGlucHV0LmFjdG9ySWQgJiYgYS5yb2xlQ29kZSA9PT0gaW5wdXQucm9sZUNvZGUgJiYgIWEucmV2b2tlZCxcbiAgICApO1xuICAgIGlmIChhY3RpdmUpIHJldHVybjsgLy8gaWRlbXBvdGVudFxuICAgIHRoaXMucm9sZUFzc2lnbm1lbnRzLnB1c2goe1xuICAgICAgYWN0b3JJZDogaW5wdXQuYWN0b3JJZCxcbiAgICAgIHJvbGVDb2RlOiBpbnB1dC5yb2xlQ29kZSxcbiAgICAgIGdyYW50ZWRCeTogaW5wdXQuYnlBY3RvcklkLFxuICAgICAgcmV2b2tlZDogZmFsc2UsXG4gICAgfSk7XG4gICAgdGhpcy5hcHBlbmQoJ2FjdG9yJywgaW5wdXQuYWN0b3JJZCwgJ3JvbGUuYXNzaWduZWQnLCBpbnB1dC5ieUFjdG9ySWQsIHsgcm9sZUNvZGU6IGlucHV0LnJvbGVDb2RlIH0pO1xuICB9XG5cbiAgcmV2b2tlUm9sZShpbnB1dDogeyBhY3RvcklkOiBzdHJpbmc7IHJvbGVDb2RlOiBzdHJpbmc7IGJ5QWN0b3JJZDogc3RyaW5nIH0pOiB2b2lkIHtcbiAgICB0aGlzLnJlcXVpcmVHb3Zlcm5hbmNlQWRtaW4oaW5wdXQuYnlBY3RvcklkKTtcbiAgICBpZiAoREVMSVZFUllfUk9MRVNbaW5wdXQucm9sZUNvZGVdID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRocm93IG5ldyBHdWFyZEZhaWxlZEVycm9yKGB1bmtub3duIGRlbGl2ZXJ5IHJvbGU6ICR7aW5wdXQucm9sZUNvZGV9YCk7XG4gICAgfVxuICAgIGZvciAoY29uc3QgYXNzaWdubWVudCBvZiB0aGlzLnJvbGVBc3NpZ25tZW50cykge1xuICAgICAgaWYgKGFzc2lnbm1lbnQuYWN0b3JJZCA9PT0gaW5wdXQuYWN0b3JJZCAmJiBhc3NpZ25tZW50LnJvbGVDb2RlID09PSBpbnB1dC5yb2xlQ29kZSAmJiAhYXNzaWdubWVudC5yZXZva2VkKSB7XG4gICAgICAgIGFzc2lnbm1lbnQucmV2b2tlZCA9IHRydWU7XG4gICAgICB9XG4gICAgfVxuICAgIHRoaXMuYXBwZW5kKCdhY3RvcicsIGlucHV0LmFjdG9ySWQsICdyb2xlLnJldm9rZWQnLCBpbnB1dC5ieUFjdG9ySWQsIHsgcm9sZUNvZGU6IGlucHV0LnJvbGVDb2RlIH0pO1xuICB9XG5cbiAgbGlzdFJvbGVBc3NpZ25tZW50cyhhY3RvcklkPzogc3RyaW5nKTogUm9sZUFzc2lnbm1lbnRbXSB7XG4gICAgcmV0dXJuIHRoaXMucm9sZUFzc2lnbm1lbnRzXG4gICAgICAuZmlsdGVyKChhKSA9PiBhY3RvcklkID09PSB1bmRlZmluZWQgfHwgYS5hY3RvcklkID09PSBhY3RvcklkKVxuICAgICAgLm1hcCgoYSkgPT4gKHsgLi4uYSB9KSk7XG4gIH1cblxuICBzZXRQbGFuKGlucHV0OiB7IHBsYW46IFBsYW5Db2RlOyBieUFjdG9ySWQ6IHN0cmluZyB9KTogdm9pZCB7XG4gICAgdGhpcy5yZXF1aXJlR292ZXJuYW5jZUFkbWluKGlucHV0LmJ5QWN0b3JJZCk7XG4gICAgaWYgKFBMQU5fQ0VJTElOR1NbaW5wdXQucGxhbl0gPT09IHVuZGVmaW5lZCkgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoYHVua25vd24gcGxhbjogJHtpbnB1dC5wbGFufWApO1xuICAgIHRoaXMucGxhbiA9IGlucHV0LnBsYW47XG4gICAgdGhpcy5wbGFuVmVyc2lvbiArPSAxO1xuICAgIHRoaXMuYXBwZW5kKCd3b3Jrc3BhY2UnLCAnd29ya3NwYWNlJywgJ3BsYW4uY2hhbmdlZCcsIGlucHV0LmJ5QWN0b3JJZCwge1xuICAgICAgcGxhbjogaW5wdXQucGxhbixcbiAgICAgIHBsYW5WZXJzaW9uOiB0aGlzLnBsYW5WZXJzaW9uLFxuICAgIH0pO1xuICB9XG5cbiAgZ2V0UGxhbigpOiBQbGFuQ29kZSB7XG4gICAgcmV0dXJuIHRoaXMucGxhbjtcbiAgfVxuXG4gIHNldFdvcmtzcGFjZVBvbGljeShpbnB1dDogeyBwb2xpY3k6IFdvcmtzcGFjZVBvbGljeTsgYnlBY3RvcklkOiBzdHJpbmcgfSk6IHZvaWQge1xuICAgIHRoaXMucmVxdWlyZUdvdmVybmFuY2VBZG1pbihpbnB1dC5ieUFjdG9ySWQpO1xuICAgIHRoaXMud29ya3NwYWNlUG9saWN5ID0geyAuLi50aGlzLndvcmtzcGFjZVBvbGljeSwgLi4uaW5wdXQucG9saWN5IH07XG4gICAgdGhpcy5wb2xpY3lWZXJzaW9uICs9IDE7XG4gICAgdGhpcy5hcHBlbmQoJ3dvcmtzcGFjZScsICd3b3Jrc3BhY2UnLCAncG9saWN5LmNoYW5nZWQnLCBpbnB1dC5ieUFjdG9ySWQsIHtcbiAgICAgIHBvbGljeTogeyAuLi50aGlzLndvcmtzcGFjZVBvbGljeSB9LFxuICAgICAgcG9saWN5VmVyc2lvbjogdGhpcy5wb2xpY3lWZXJzaW9uLFxuICAgIH0pO1xuICB9XG5cbiAgZ2V0V29ya3NwYWNlUG9saWN5KCk6IFdvcmtzcGFjZVBvbGljeSB7XG4gICAgcmV0dXJuIHsgLi4udGhpcy53b3Jrc3BhY2VQb2xpY3kgfTtcbiAgfVxuXG4gIHNldEdhdGVQb2xpY3koaW5wdXQ6IHsgZ2F0ZTogR2F0ZUNvZGU7IHBvbGljeTogR2F0ZVBvbGljeTsgYnlBY3RvcklkOiBzdHJpbmcgfSk6IHZvaWQge1xuICAgIHRoaXMucmVxdWlyZUdvdmVybmFuY2VBZG1pbihpbnB1dC5ieUFjdG9ySWQpO1xuICAgIGNvbnN0IG1pbkFwcHJvdmFscyA9IGlucHV0LnBvbGljeS5taW5BcHByb3ZhbHMgPz8gMTtcbiAgICBpZiAoIU51bWJlci5pc0ludGVnZXIobWluQXBwcm92YWxzKSB8fCBtaW5BcHByb3ZhbHMgPCAxKSB7XG4gICAgICB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcignbWluQXBwcm92YWxzIG11c3QgYmUgYSBwb3NpdGl2ZSBpbnRlZ2VyJyk7XG4gICAgfVxuICAgIHRoaXMuZ2F0ZVBvbGljaWVzLnNldChpbnB1dC5nYXRlLCB7IC4uLmlucHV0LnBvbGljeSB9KTtcbiAgICB0aGlzLmFwcGVuZCgnd29ya3NwYWNlJywgJ3dvcmtzcGFjZScsICdnYXRlX3BvbGljeS5jaGFuZ2VkJywgaW5wdXQuYnlBY3RvcklkLCB7XG4gICAgICBnYXRlOiBpbnB1dC5nYXRlLFxuICAgICAgcG9saWN5OiB7IC4uLmlucHV0LnBvbGljeSB9LFxuICAgIH0pO1xuICB9XG5cbiAgZ2V0R2F0ZVBvbGljeShnYXRlOiBHYXRlQ29kZSk6IEdhdGVQb2xpY3kge1xuICAgIHJldHVybiB7IC4uLih0aGlzLmdhdGVQb2xpY2llcy5nZXQoZ2F0ZSkgPz8ge30pIH07XG4gIH1cblxuICBsaXN0QWN0b3JzKCk6IEFjdG9yW10ge1xuICAgIHJldHVybiBbLi4udGhpcy5hY3RvcnMudmFsdWVzKCldLm1hcCgoYSkgPT4gKHsgLi4uYSB9KSk7XG4gIH1cblxuICBwcm92aXNpb25QZXJzb25hcyhpbnB1dDogeyBieUFjdG9ySWQ6IHN0cmluZyB9KTogQWN0b3JbXSB7XG4gICAgdGhpcy5yZXF1aXJlR292ZXJuYW5jZUFkbWluKGlucHV0LmJ5QWN0b3JJZCk7XG4gICAgY29uc3QgcHJvdmlzaW9uZWQ6IEFjdG9yW10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IHBlcnNvbmEgb2YgUEVSU09OQVMpIHtcbiAgICAgIGxldCBhY3RvciA9IFsuLi50aGlzLmFjdG9ycy52YWx1ZXMoKV0uZmluZCgoYSkgPT4gYS5wZXJzb25hQ29kZSA9PT0gcGVyc29uYS5wZXJzb25hQ29kZSk7XG4gICAgICBpZiAoIWFjdG9yKSB7XG4gICAgICAgIGFjdG9yID0gdGhpcy5jcmVhdGVBY3Rvcih7XG4gICAgICAgICAgdHlwZTogJ2FnZW50JyxcbiAgICAgICAgICBkaXNwbGF5TmFtZTogcGVyc29uYS5kaXNwbGF5TmFtZSxcbiAgICAgICAgICBwZXJzb25hQ29kZTogcGVyc29uYS5wZXJzb25hQ29kZSxcbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMuYXBwZW5kKCdhY3RvcicsIGFjdG9yLmlkLCAnYWN0b3IucHJvdmlzaW9uZWQnLCBpbnB1dC5ieUFjdG9ySWQsIHtcbiAgICAgICAgICBwZXJzb25hQ29kZTogcGVyc29uYS5wZXJzb25hQ29kZSxcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICAvLyBGbG9vci1zdGF0ZSByb2xlICh0aGVzaXMpOiBhc3NpZ25Sb2xlIGlzIGlkZW1wb3RlbnQuXG4gICAgICB0aGlzLmFzc2lnblJvbGUoeyBhY3RvcklkOiBhY3Rvci5pZCwgcm9sZUNvZGU6IHBlcnNvbmEuZGVmYXVsdFJvbGUsIGJ5QWN0b3JJZDogaW5wdXQuYnlBY3RvcklkIH0pO1xuICAgICAgcHJvdmlzaW9uZWQucHVzaCh7IC4uLmFjdG9yIH0pO1xuICAgIH1cbiAgICByZXR1cm4gcHJvdmlzaW9uZWQ7XG4gIH1cblxuICBhdXRoekV4cGxhaW4oaW5wdXQ6IHsgYWN0b3JJZDogc3RyaW5nOyBwZXJtaXNzaW9uOiBQZXJtaXNzaW9uIH0pOiBBdXRoekV4cGxhbmF0aW9uIHtcbiAgICBjb25zdCBzb3VyY2UgPSB0aGlzLmdyYW50U291cmNlKGlucHV0LmFjdG9ySWQsIGlucHV0LnBlcm1pc3Npb24pO1xuICAgIGNvbnN0IGFsbG93cyA9IHRoaXMuYWdlbnRDZWlsaW5nQWxsb3dzKHRoaXMuYWN0b3JzLmdldChpbnB1dC5hY3RvcklkKSwgaW5wdXQucGVybWlzc2lvbik7XG4gICAgcmV0dXJuIHtcbiAgICAgIGFjdG9ySWQ6IGlucHV0LmFjdG9ySWQsXG4gICAgICBwZXJtaXNzaW9uOiBpbnB1dC5wZXJtaXNzaW9uLFxuICAgICAgYWxsb3dlZDogc291cmNlICE9PSBudWxsICYmIGFsbG93cy5wbGFuICYmIGFsbG93cy5wb2xpY3ksXG4gICAgICBzb3VyY2UsXG4gICAgICBnb3Zlcm5hbmNlUm9sZTogdGhpcy5nZXRHb3Zlcm5hbmNlUm9sZShpbnB1dC5hY3RvcklkKSxcbiAgICAgIHBsYW46IHRoaXMucGxhbixcbiAgICAgIHBsYW5BbGxvd3M6IGFsbG93cy5wbGFuLFxuICAgICAgcG9saWN5QWxsb3dzOiBhbGxvd3MucG9saWN5LFxuICAgICAgdmVyc2lvbnM6IHsgcGxhbjogdGhpcy5wbGFuVmVyc2lvbiwgcG9saWN5OiB0aGlzLnBvbGljeVZlcnNpb24gfSxcbiAgICB9O1xuICB9XG5cbiAgY3JlYXRlRmVhdHVyZShpbnB1dDogeyBhY3RvcklkOiBzdHJpbmcgfSk6IEZlYXR1cmUge1xuICAgIGNvbnN0IGZlYXR1cmU6IEZlYXR1cmUgPSB7IGlkOiB0aGlzLm5leHRJZCgnZmVhdCcpLCBzdGF0ZTogJ2JhY2tsb2cnLCBkaXNwYXRjaEhvbGQ6IGZhbHNlIH07XG4gICAgdGhpcy5mZWF0dXJlcy5zZXQoZmVhdHVyZS5pZCwgZmVhdHVyZSk7XG4gICAgdGhpcy5hcHBlbmQoJ2ZlYXR1cmUnLCBmZWF0dXJlLmlkLCAnZmVhdHVyZS5jcmVhdGVkJywgaW5wdXQuYWN0b3JJZCwge30pO1xuICAgIHJldHVybiB0aGlzLmNvcHlGZWF0dXJlKGZlYXR1cmUpO1xuICB9XG5cbiAgY3JlYXRlV29ya0l0ZW0oaW5wdXQ6IENyZWF0ZVdvcmtJdGVtSW5wdXQgJiB7IGFjdG9ySWQ6IHN0cmluZyB9KTogV29ya0l0ZW0ge1xuICAgIGNvbnN0IHNsdWcgPSBpbnB1dC50aXRsZVxuICAgICAgLnRvTG93ZXJDYXNlKClcbiAgICAgIC5yZXBsYWNlKC9bXmEtejAtOV0rL2csICctJylcbiAgICAgIC5yZXBsYWNlKC8oXi18LSQpL2csICcnKTtcbiAgICBjb25zdCBpdGVtOiBXb3JrSXRlbVJvdyA9IHtcbiAgICAgIGlkOiB0aGlzLm5leHRJZCgnd2knKSxcbiAgICAgIGZlYXR1cmVJZDogaW5wdXQuZmVhdHVyZUlkLFxuICAgICAgZXh0ZXJuYWxLZXk6IGlucHV0LmV4dGVybmFsS2V5LFxuICAgICAga2luZDogaW5wdXQua2luZCA/PyAnY29kZScsXG4gICAgICB0aXRsZTogaW5wdXQudGl0bGUsXG4gICAgICBzdGF0ZTogJ2JhY2tsb2cnLFxuICAgICAgYmxvY2tlZFJlYXNvbjogbnVsbCxcbiAgICAgIHJldmlld0xvb3BJdGVyYXRpb246IDAsXG4gICAgICBpbnRlbnRIYXNoOiBudWxsLFxuICAgICAgcGlubmVkVmVyaWZpY2F0aW9uOiBudWxsLFxuICAgICAgc3BlY0NoZWNrcG9pbnQ6IGlucHV0LnNwZWNDaGVja3BvaW50ID8/IGZhbHNlLFxuICAgICAgZG9uZUNoZWNrcG9pbnQ6IGlucHV0LmRvbmVDaGVja3BvaW50ID8/IGZhbHNlLFxuICAgICAgaW52b2tlRGV2V2l0aDogaW5wdXQuaW52b2tlRGV2V2l0aCA/PyAnJyxcbiAgICAgIHNwZWNQYXRoOiBgc3Rvcmllcy8ke2lucHV0LmV4dGVybmFsS2V5fS0ke3NsdWd9Lm1kYCxcbiAgICAgIHN0YXRlVmVyc2lvbjogMCxcbiAgICAgIGRlcGVuZHNPbjogaW5wdXQuZGVwZW5kc09uID8gWy4uLmlucHV0LmRlcGVuZHNPbl0gOiBbXSxcbiAgICB9O1xuICAgIHRoaXMud29ya0l0ZW1zLnNldChpdGVtLmlkLCBpdGVtKTtcbiAgICBpZiAoIXRoaXMuZXh0ZXJuYWxLZXlJbmRleC5oYXMoaXRlbS5leHRlcm5hbEtleSkpIHtcbiAgICAgIHRoaXMuZXh0ZXJuYWxLZXlJbmRleC5zZXQoaXRlbS5leHRlcm5hbEtleSwgaXRlbS5pZCk7XG4gICAgfVxuICAgIHRoaXMuYXBwZW5kKCd3b3JrX2l0ZW0nLCBpdGVtLmlkLCAnd29ya19pdGVtLmNyZWF0ZWQnLCBpbnB1dC5hY3RvcklkLCB7XG4gICAgICBleHRlcm5hbEtleTogaXRlbS5leHRlcm5hbEtleSxcbiAgICAgIGZlYXR1cmVJZDogaXRlbS5mZWF0dXJlSWQsXG4gICAgfSk7XG4gICAgcmV0dXJuIHRoaXMuY29weUl0ZW0oaXRlbSk7XG4gIH1cblxuICBpbXBvcnRTdG9yaWVzKGlucHV0OiB7IGZlYXR1cmVJZDogc3RyaW5nOyB5YW1sOiBzdHJpbmc7IGFjdG9ySWQ6IHN0cmluZyB9KTogU3Rvcmllc0ltcG9ydFJlc3VsdCB7XG4gICAgY29uc3QgZW50cmllcyA9IHBhcnNlU3RvcmllcyhpbnB1dC55YW1sKTtcbiAgICBpZiAoIXRoaXMuZmVhdHVyZXMuaGFzKGlucHV0LmZlYXR1cmVJZCkpIHtcbiAgICAgIHRocm93IG5ldyBTdG9yaWVzVmFsaWRhdGlvbkVycm9yKGB1bmtub3duIGZlYXR1cmU6ICR7aW5wdXQuZmVhdHVyZUlkfWApO1xuICAgIH1cbiAgICBjb25zdCBpbXBvcnRlZDogc3RyaW5nW10gPSBbXTtcbiAgICBjb25zdCB1cGRhdGVkOiBzdHJpbmdbXSA9IFtdO1xuICAgIGNvbnN0IHdhcm5pbmdzOiBzdHJpbmdbXSA9IFtdO1xuXG4gICAgZm9yIChjb25zdCBlbnRyeSBvZiBlbnRyaWVzKSB7XG4gICAgICBjb25zdCBleGlzdGluZyA9IFsuLi50aGlzLndvcmtJdGVtcy52YWx1ZXMoKV0uZmluZChcbiAgICAgICAgKHdpKSA9PiB3aS5mZWF0dXJlSWQgPT09IGlucHV0LmZlYXR1cmVJZCAmJiB3aS5leHRlcm5hbEtleSA9PT0gZW50cnkuaWQsXG4gICAgICApO1xuICAgICAgaWYgKGV4aXN0aW5nKSB7XG4gICAgICAgIC8vIFJlLWltcG9ydCByZWZyZXNoZXMgZGVzY3JpcHRpdmUgZmllbGRzOyBsaWZlY3ljbGUgc3RhdGUgaXMgbmV2ZXJcbiAgICAgICAgLy8gdG91Y2hlZCAoc3Rvcmllcy55YW1sIGNhcnJpZXMgbm8gc3RhdHVzIFx1MjAxNCBEOSwgdmFsaWRpdHkgcnVsZSAzKS5cbiAgICAgICAgZXhpc3RpbmcudGl0bGUgPSBlbnRyeS50aXRsZTtcbiAgICAgICAgZXhpc3Rpbmcuc3BlY0NoZWNrcG9pbnQgPSBlbnRyeS5zcGVjQ2hlY2twb2ludDtcbiAgICAgICAgZXhpc3RpbmcuZG9uZUNoZWNrcG9pbnQgPSBlbnRyeS5kb25lQ2hlY2twb2ludDtcbiAgICAgICAgZXhpc3RpbmcuaW52b2tlRGV2V2l0aCA9IGVudHJ5Lmludm9rZURldldpdGg7XG4gICAgICAgIHRoaXMuYXBwZW5kKCd3b3JrX2l0ZW0nLCBleGlzdGluZy5pZCwgJ3dvcmtfaXRlbS5yZWltcG9ydGVkJywgaW5wdXQuYWN0b3JJZCwgeyBleHRlcm5hbEtleTogZW50cnkuaWQgfSk7XG4gICAgICAgIHVwZGF0ZWQucHVzaChlbnRyeS5pZCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmNyZWF0ZVdvcmtJdGVtKHtcbiAgICAgICAgICBmZWF0dXJlSWQ6IGlucHV0LmZlYXR1cmVJZCxcbiAgICAgICAgICBleHRlcm5hbEtleTogZW50cnkuaWQsXG4gICAgICAgICAgdGl0bGU6IGVudHJ5LnRpdGxlLFxuICAgICAgICAgIHNwZWNDaGVja3BvaW50OiBlbnRyeS5zcGVjQ2hlY2twb2ludCxcbiAgICAgICAgICBkb25lQ2hlY2twb2ludDogZW50cnkuZG9uZUNoZWNrcG9pbnQsXG4gICAgICAgICAgaW52b2tlRGV2V2l0aDogZW50cnkuaW52b2tlRGV2V2l0aCxcbiAgICAgICAgICBhY3RvcklkOiBpbnB1dC5hY3RvcklkLFxuICAgICAgICB9KTtcbiAgICAgICAgaW1wb3J0ZWQucHVzaChlbnRyeS5pZCk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB7IGltcG9ydGVkLCB1cGRhdGVkLCB3YXJuaW5ncyB9O1xuICB9XG5cbiAgLy8gLS0gY2xhaW1zIChyb2FkbWFwIFx1MDBBNzEuMykgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgY2xhaW1UYXNrKGlucHV0OiB7IHdvcmtJdGVtSWQ6IHN0cmluZzsgYWN0b3JJZDogc3RyaW5nOyB0dGxNcz86IG51bWJlciB9KTogQ2xhaW0ge1xuICAgIGNvbnN0IGl0ZW0gPSB0aGlzLm11c3RHZXRJdGVtKGlucHV0LndvcmtJdGVtSWQpO1xuICAgIHRoaXMucmVxdWlyZVBlcm1pc3Npb24oaW5wdXQuYWN0b3JJZCwgJ3Rhc2suY2xhaW0nKTtcbiAgICBpZiAodGhpcy5saXZlQ2xhaW0oaXRlbS5pZCkgIT09IG51bGwpIHtcbiAgICAgIC8vIE9uZSBsaXZlIGNsYWltIHBlciB3b3JrIGl0ZW0gXHUyMDE0IHJhY2VzIGxvc2UgYnkgY29uc3RyYWludCAoXHUwMEE3MS4zKTtcbiAgICAgIC8vIHRoZSBsb3NlciBsZWF2ZXMgbm8gcm93IGJlaGluZC5cbiAgICAgIHRocm93IG5ldyBDb25mbGljdEVycm9yKGB3b3JrIGl0ZW0gJHtpdGVtLmlkfSBhbHJlYWR5IGhhcyBhIGxpdmUgY2xhaW1gKTtcbiAgICB9XG4gICAgY29uc3QgdHRsTXMgPSBpbnB1dC50dGxNcyA/PyAxNSAqIDYwICogMTAwMDtcbiAgICBjb25zdCB0b2tlbiA9ICh0aGlzLmZlbmNpbmdDb3VudGVyLmdldChpdGVtLmlkKSA/PyAwKSArIDE7XG4gICAgdGhpcy5mZW5jaW5nQ291bnRlci5zZXQoaXRlbS5pZCwgdG9rZW4pO1xuICAgIGNvbnN0IGNsYWltOiBDbGFpbVJvdyA9IHtcbiAgICAgIGlkOiB0aGlzLm5leHRJZCgnY2xhaW0nKSxcbiAgICAgIHdvcmtJdGVtSWQ6IGl0ZW0uaWQsXG4gICAgICBhY3RvcklkOiBpbnB1dC5hY3RvcklkLFxuICAgICAgZmVuY2luZ1Rva2VuOiB0b2tlbixcbiAgICAgIGxlYXNlRXhwaXJlc0F0OiB0aGlzLm5vdyArIHR0bE1zLFxuICAgICAgcmVsZWFzZWQ6IGZhbHNlLFxuICAgICAgdHRsTXMsXG4gICAgfTtcbiAgICB0aGlzLmNsYWltcy5zZXQoY2xhaW0uaWQsIGNsYWltKTtcbiAgICB0aGlzLmNsYWltc0J5SXRlbS5zZXQoaXRlbS5pZCwgWy4uLih0aGlzLmNsYWltc0J5SXRlbS5nZXQoaXRlbS5pZCkgPz8gW10pLCBjbGFpbS5pZF0pO1xuICAgIHRoaXMuYXBwZW5kKCd3b3JrX2l0ZW0nLCBpdGVtLmlkLCAnd29ya19pdGVtLmNsYWltZWQnLCBpbnB1dC5hY3RvcklkLCB7IGNsYWltSWQ6IGNsYWltLmlkLCBmZW5jaW5nVG9rZW46IHRva2VuIH0pO1xuICAgIHJldHVybiB0aGlzLmNvcHlDbGFpbShjbGFpbSk7XG4gIH1cblxuICBoZWFydGJlYXQoaW5wdXQ6IHsgY2xhaW1JZDogc3RyaW5nIH0pOiB2b2lkIHtcbiAgICBjb25zdCBjbGFpbSA9IHRoaXMuY2xhaW1zLmdldChpbnB1dC5jbGFpbUlkKTtcbiAgICBpZiAoIWNsYWltIHx8IGNsYWltLnJlbGVhc2VkIHx8IGNsYWltLmxlYXNlRXhwaXJlc0F0IDw9IHRoaXMubm93KSB7XG4gICAgICB0aHJvdyBuZXcgQ29uZmxpY3RFcnJvcihgY2xhaW0gJHtpbnB1dC5jbGFpbUlkfSBpcyBub3QgbGl2ZWApO1xuICAgIH1cbiAgICBjbGFpbS5sZWFzZUV4cGlyZXNBdCA9IHRoaXMubm93ICsgY2xhaW0udHRsTXM7XG4gIH1cblxuICByZWxlYXNlQ2xhaW0oaW5wdXQ6IHsgY2xhaW1JZDogc3RyaW5nOyByZWFzb24/OiBzdHJpbmcgfSk6IHZvaWQge1xuICAgIGNvbnN0IGNsYWltID0gdGhpcy5jbGFpbXMuZ2V0KGlucHV0LmNsYWltSWQpO1xuICAgIGlmICghY2xhaW0gfHwgY2xhaW0ucmVsZWFzZWQpIHJldHVybjtcbiAgICBjbGFpbS5yZWxlYXNlZCA9IHRydWU7XG4gICAgdGhpcy5hcHBlbmQoJ3dvcmtfaXRlbScsIGNsYWltLndvcmtJdGVtSWQsICdjbGFpbS5yZWxlYXNlZCcsIGNsYWltLmFjdG9ySWQsIHtcbiAgICAgIGNsYWltSWQ6IGNsYWltLmlkLFxuICAgICAgcmVhc29uOiBpbnB1dC5yZWFzb24gPz8gbnVsbCxcbiAgICB9KTtcbiAgfVxuXG4gIGFkdmFuY2VDbG9jayhtczogbnVtYmVyKTogdm9pZCB7XG4gICAgdGhpcy5ub3cgKz0gbXM7XG4gIH1cblxuICAvLyAtLSBsaWZlY3ljbGUgKHJvYWRtYXAgXHUwMEE3MS4yKSAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIGFkdmFuY2VTdGF0ZShpbnB1dDogQWR2YW5jZUlucHV0KTogV29ya0l0ZW0ge1xuICAgIGNvbnN0IGl0ZW0gPSB0aGlzLm11c3RHZXRJdGVtKGlucHV0LndvcmtJdGVtSWQpO1xuXG4gICAgLy8gS2V5ZWQgcmVwbGF5OiB0aGUgc2FtZSBjb21tYW5kIHJldHVybnMgdGhlIHNhbWUgcmVzdWx0LCBhcHBlbmRzIG5vdGhpbmcuXG4gICAgaWYgKGlucHV0LmlkZW1wb3RlbmN5S2V5ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIGNvbnN0IGNhY2hlZCA9IHRoaXMuaWRlbXBvdGVuY3lDYWNoZS5nZXQoaW5wdXQuaWRlbXBvdGVuY3lLZXkpO1xuICAgICAgaWYgKGNhY2hlZCkgcmV0dXJuIHsgLi4uY2FjaGVkIH07XG4gICAgfVxuXG4gICAgLy8gUHJlc2VydmF0aW9uIG5vLW9wIChzcHJpbnQtcGxhbm5pbmcgaWRlbXBvdGVuY3kgcnVsZSk6IGFuIFVOS0VZRURcbiAgICAvLyByZS1yZXF1ZXN0IG9mIHRoZSBjdXJyZW50IHN0YXRlIHN1Y2NlZWRzIHdpdGhvdXQgYW4gZXZlbnQuIEEgTkVXIGtleWVkXG4gICAgLy8gY29tbWFuZCBpcyBhIGdlbnVpbmVseSBuZXcgY29tbWFuZCBhbmQgZmFsbHMgdGhyb3VnaCB0byB0aGUgc3RyaWN0XG4gICAgLy8gdGFibGUgY2hlY2sgKGNvbmN1cnJlbmN5LnRlc3QudHMgcGluKS5cbiAgICBpZiAoaW5wdXQuaWRlbXBvdGVuY3lLZXkgPT09IHVuZGVmaW5lZCAmJiBpbnB1dC50byA9PT0gaXRlbS5zdGF0ZSkge1xuICAgICAgdGhpcy52YWxpZGF0ZVByZXNlbnRlZFRva2VuKGl0ZW0sIGlucHV0LmZlbmNpbmdUb2tlbiwgaW5wdXQuYWN0b3JJZCk7XG4gICAgICByZXR1cm4gdGhpcy5jb3B5SXRlbShpdGVtKTtcbiAgICB9XG5cbiAgICAvLyBUcmFuc2l0aW9uLXRhYmxlIGxvb2t1cCBwcmVjZWRlcyBjbGFpbS90b2tlbi9wZXJtaXNzaW9uIGNoZWNrc1xuICAgIC8vIChmc20tdHJhbnNpdGlvbnMgcGluOiB1bmRlY2xhcmVkIGRvd25ncmFkZXMgYXJlIEludmFsaWRUcmFuc2l0aW9uRXJyb3JcbiAgICAvLyBldmVuIHdpdGggbm8gdG9rZW4gcHJlc2VudGVkKS5cbiAgICBjb25zdCBydWxlID0gVFJBTlNJVElPTlMuZmluZCgodCkgPT4gdC5mcm9tID09PSBpdGVtLnN0YXRlICYmIHQudG8gPT09IGlucHV0LnRvKTtcbiAgICBpZiAoIXJ1bGUpIHtcbiAgICAgIGlmIChSQU5LW2lucHV0LnRvXSA8IFJBTktbaXRlbS5zdGF0ZV0gJiYgdGhpcy5oYXNQZXJtaXNzaW9uKGlucHV0LmFjdG9ySWQsICdzdGF0ZS5kb3duZ3JhZGUnKSkge1xuICAgICAgICByZXR1cm4gdGhpcy5wcml2aWxlZ2VkRG93bmdyYWRlKGl0ZW0sIGlucHV0KTtcbiAgICAgIH1cbiAgICAgIHRocm93IG5ldyBJbnZhbGlkVHJhbnNpdGlvbkVycm9yKGl0ZW0uc3RhdGUsIGlucHV0LnRvKTtcbiAgICB9XG5cbiAgICB0aGlzLnZhbGlkYXRlUHJlc2VudGVkVG9rZW4oaXRlbSwgaW5wdXQuZmVuY2luZ1Rva2VuLCBpbnB1dC5hY3RvcklkKTtcblxuICAgIC8vIEJsb2NrZWQgb3ZlcmxheSBmcmVlemVzIHRyYW5zaXRpb25zIGF0IGV2ZXJ5IHN0YXRlIChEOCwgXHUwMEE3MS4xKS5cbiAgICBpZiAoaXRlbS5ibG9ja2VkUmVhc29uICE9PSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcihgd29yayBpdGVtIGlzIGJsb2NrZWQ6ICR7aXRlbS5ibG9ja2VkUmVhc29ufWApO1xuICAgIH1cblxuICAgIHRoaXMucmVxdWlyZVBlcm1pc3Npb24oaW5wdXQuYWN0b3JJZCwgcnVsZS5wZXJtaXNzaW9uKTtcblxuICAgIGlmIChydWxlLmNsYWltUmVxdWlyZWQpIHtcbiAgICAgIC8vIEV4ZWN1dGlvbi16b25lIHRyYW5zaXRpb25zIGRlbWFuZCBhIFBSRVNFTlRFRCBsaXZlIHRva2VuIFx1MjAxNCBob2xkaW5nXG4gICAgICAvLyB0aGUgY2xhaW0gd2l0aG91dCBwcmVzZW50aW5nIGl0IGlzIG5vdCBlbm91Z2ggKGNsYWltcy50ZXN0LnRzIHBpbikuXG4gICAgICBpZiAoaW5wdXQuZmVuY2luZ1Rva2VuID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoJ2NsYWltIGZlbmNpbmcgdG9rZW4gcmVxdWlyZWQgZm9yIHRoaXMgdHJhbnNpdGlvbicpO1xuICAgICAgfVxuICAgICAgLy8gKGFscmVhZHkgdmFsaWRhdGVkIGFib3ZlKVxuICAgIH1cblxuICAgIGZvciAoY29uc3QgZ3VhcmQgb2YgcnVsZS5ndWFyZHMpIHtcbiAgICAgIHRoaXMuY2hlY2tHdWFyZChndWFyZCwgaXRlbSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuZXhlY3V0ZVRyYW5zaXRpb24oaXRlbSwgaW5wdXQudG8sIGlucHV0LmFjdG9ySWQsIGlucHV0LmlkZW1wb3RlbmN5S2V5KTtcbiAgfVxuXG4gIHByaXZhdGUgY2hlY2tHdWFyZChndWFyZDogVHJhbnNpdGlvblJ1bGVbJ2d1YXJkcyddW251bWJlcl0sIGl0ZW06IFdvcmtJdGVtUm93KTogdm9pZCB7XG4gICAgc3dpdGNoIChndWFyZCkge1xuICAgICAgY2FzZSAnZGVwc19kb25lJzoge1xuICAgICAgICBmb3IgKGNvbnN0IGRlcEtleSBvZiBpdGVtLmRlcGVuZHNPbikge1xuICAgICAgICAgIGNvbnN0IGRlcCA9IFsuLi50aGlzLndvcmtJdGVtcy52YWx1ZXMoKV0uZmluZChcbiAgICAgICAgICAgICh3aSkgPT4gd2kuZmVhdHVyZUlkID09PSBpdGVtLmZlYXR1cmVJZCAmJiB3aS5leHRlcm5hbEtleSA9PT0gZGVwS2V5LFxuICAgICAgICAgICk7XG4gICAgICAgICAgaWYgKGRlcCAmJiBkZXAuc3RhdGUgIT09ICdkb25lJykge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoYGRlcGVuZGVuY3kgJHtkZXBLZXl9IGlzIG5vdCBkb25lYCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGNhc2UgJ3NwZWNfZ2F0ZV9pZl9jaGVja3BvaW50Jzoge1xuICAgICAgICBpZiAoIWl0ZW0uc3BlY0NoZWNrcG9pbnQpIHJldHVybjtcbiAgICAgICAgY29uc3QgYXBwcm92ZWQgPSB0aGlzLmdhdGVEZWNpc2lvbnMuc29tZShcbiAgICAgICAgICAoZCkgPT4gZC53b3JrSXRlbUlkID09PSBpdGVtLmlkICYmIGQuZ2F0ZSA9PT0gJ3NwZWNfYXBwcm92YWwnICYmIGQuZGVjaXNpb24gPT09ICdhcHByb3ZlZCcsXG4gICAgICAgICk7XG4gICAgICAgIGlmICghYXBwcm92ZWQpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcignc3BlY19jaGVja3BvaW50IHJlcXVpcmVzIGFuIGFwcHJvdmVkIHNwZWNfYXBwcm92YWwgZ2F0ZSBkZWNpc2lvbicpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGNhc2UgJ25vbmVtcHR5X2RpZmYnOiB7XG4gICAgICAgIC8vIFBoYXNlIDQgKHJvYWRtYXAgXHUwMEE3MS40KToga2luZCBzZWxlY3RzIFdISUNIIG1hY2hpbmUgZXZpZGVuY2UgYXBwbGllcy5cbiAgICAgICAgaWYgKGl0ZW0ua2luZCAhPT0gJ2NvZGUnKSB7XG4gICAgICAgICAgLy8gRG9jIGtpbmRzOiB0aGUgbGF0ZXN0IGRvY19saW50IChpZiBhbnkpIG11c3QgYmUgc2NoZW1hLXZhbGlkO1xuICAgICAgICAgIC8vIGdpdF9kaWZmIGlzIG5ldmVyIGNvbnN1bHRlZCBmb3Igbm9uLWNvZGUgZGVsaXZlcmFibGVzLlxuICAgICAgICAgIGNvbnN0IGxpbnRzID0gdGhpcy5ldmlkZW5jZVJvd3MuZmlsdGVyKFxuICAgICAgICAgICAgKHJvdykgPT4gcm93LndvcmtJdGVtSWQgPT09IGl0ZW0uaWQgJiYgcm93LmV2aWRlbmNlLmtpbmQgPT09ICdkb2NfbGludCcsXG4gICAgICAgICAgKTtcbiAgICAgICAgICBjb25zdCBsYXRlc3RMaW50ID0gbGludHNbbGludHMubGVuZ3RoIC0gMV07XG4gICAgICAgICAgaWYgKGxhdGVzdExpbnQgJiYgbGF0ZXN0TGludC5ldmlkZW5jZS5wYXlsb2FkWydzY2hlbWFWYWxpZCddICE9PSB0cnVlKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcigndGhlIGxhdGVzdCBkb2NfbGludCBldmlkZW5jZSBmYWlsZWQgXHUyMDE0IGRvY3VtZW50IGlzIG5vdCBzY2hlbWEtdmFsaWQnKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIC8vIEFyYml0cmF0ZWQgKENPTkZPUk1BTkNFLm1kIFwiRXZpZGVuY2VcIik6IHRoZSBMQVRFU1Qgc3VibWl0dGVkXG4gICAgICAgIC8vIGdpdF9kaWZmLCBpZiBhbnksIG11c3QgYmUgbm9uLWVtcHR5IFx1MjAxNCBhbiBlbXB0eSBkaWZmIGlzIHRoZVxuICAgICAgICAvLyBmYWtlLWRvbmUgZGVueS4gQWJzZW5jZSBpcyBub3QgY2hlY2tlZCBhdCB0aGlzIHRyYW5zaXRpb24gKHRoZVxuICAgICAgICAvLyBydW5uZXIgY29udHJhY3Qgc3VibWl0cyB0aGUgZGlmZiBiZWZvcmUgcmVxdWVzdGluZyByZXZpZXcsIGFuZCB0aGVcbiAgICAgICAgLy8gZG9uZSBnYXRlIGluZGVwZW5kZW50bHkgZGVtYW5kcyByZW1vdGUtcmVhY2hhYmxlIGNvbW1pdCBldmlkZW5jZSkuXG4gICAgICAgIGNvbnN0IGRpZmZzID0gdGhpcy5ldmlkZW5jZVJvd3MuZmlsdGVyKFxuICAgICAgICAgIChyb3cpID0+IHJvdy53b3JrSXRlbUlkID09PSBpdGVtLmlkICYmIHJvdy5ldmlkZW5jZS5raW5kID09PSAnZ2l0X2RpZmYnLFxuICAgICAgICApO1xuICAgICAgICBjb25zdCBsYXRlc3QgPSBkaWZmc1tkaWZmcy5sZW5ndGggLSAxXTtcbiAgICAgICAgaWYgKGxhdGVzdCAmJiBsYXRlc3QuZXZpZGVuY2UucGF5bG9hZFsnbm9uRW1wdHknXSAhPT0gdHJ1ZSkge1xuICAgICAgICAgIHRocm93IG5ldyBHdWFyZEZhaWxlZEVycm9yKCd0aGUgbGF0ZXN0IGdpdF9kaWZmIGV2aWRlbmNlIGlzIGVtcHR5IFx1MjAxNCBub3RoaW5nIHRvIHJldmlldycpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBwcml2YXRlIHByaXZpbGVnZWREb3duZ3JhZGUoaXRlbTogV29ya0l0ZW1Sb3csIGlucHV0OiBBZHZhbmNlSW5wdXQpOiBXb3JrSXRlbSB7XG4gICAgdGhpcy52YWxpZGF0ZVByZXNlbnRlZFRva2VuKGl0ZW0sIGlucHV0LmZlbmNpbmdUb2tlbiwgaW5wdXQuYWN0b3JJZCk7XG4gICAgaWYgKGl0ZW0uYmxvY2tlZFJlYXNvbiAhPT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoYHdvcmsgaXRlbSBpcyBibG9ja2VkOiAke2l0ZW0uYmxvY2tlZFJlYXNvbn1gKTtcbiAgICB9XG4gICAgY29uc3QgZnJvbSA9IGl0ZW0uc3RhdGU7XG4gICAgaXRlbS5zdGF0ZSA9IGlucHV0LnRvO1xuICAgIGl0ZW0uc3RhdGVWZXJzaW9uICs9IDE7XG4gICAgdGhpcy5hcHBlbmQoXG4gICAgICAnd29ya19pdGVtJyxcbiAgICAgIGl0ZW0uaWQsXG4gICAgICAnd29ya19pdGVtLnN0YXRlX2Rvd25ncmFkZWQnLFxuICAgICAgaW5wdXQuYWN0b3JJZCxcbiAgICAgIHsgZnJvbSwgdG86IGlucHV0LnRvLCBjb21wZW5zYXRpbmc6IHRydWUgfSxcbiAgICAgIGlucHV0LmlkZW1wb3RlbmN5S2V5ICE9PSB1bmRlZmluZWQgPyB7IGlkZW1wb3RlbmN5S2V5OiBpbnB1dC5pZGVtcG90ZW5jeUtleSB9IDogdW5kZWZpbmVkLFxuICAgICk7XG4gICAgY29uc3QgcmVzdWx0ID0gdGhpcy5jb3B5SXRlbShpdGVtKTtcbiAgICBpZiAoaW5wdXQuaWRlbXBvdGVuY3lLZXkgIT09IHVuZGVmaW5lZCkgdGhpcy5pZGVtcG90ZW5jeUNhY2hlLnNldChpbnB1dC5pZGVtcG90ZW5jeUtleSwgeyAuLi5yZXN1bHQgfSk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIC8qKiBTaGFyZWQgYnkgYWR2YW5jZVN0YXRlIGFuZCB0aGUgZ2F0ZS1maXJlZCB0cmFuc2l0aW9ucy4gKi9cbiAgcHJpdmF0ZSBleGVjdXRlVHJhbnNpdGlvbihcbiAgICBpdGVtOiBXb3JrSXRlbVJvdyxcbiAgICB0bzogV29ya0l0ZW1TdGF0ZSxcbiAgICBhY3RvcklkOiBzdHJpbmcsXG4gICAgaWRlbXBvdGVuY3lLZXk/OiBzdHJpbmcsXG4gICAgY2F1c2F0aW9uSWQ/OiBzdHJpbmcsXG4gICk6IFdvcmtJdGVtIHtcbiAgICBjb25zdCBmcm9tID0gaXRlbS5zdGF0ZTtcbiAgICBpdGVtLnN0YXRlID0gdG87XG4gICAgaXRlbS5zdGF0ZVZlcnNpb24gKz0gMTtcbiAgICBjb25zdCBldmVudCA9IHRoaXMuYXBwZW5kKFxuICAgICAgJ3dvcmtfaXRlbScsXG4gICAgICBpdGVtLmlkLFxuICAgICAgJ3dvcmtfaXRlbS5zdGF0ZV9jaGFuZ2VkJyxcbiAgICAgIGFjdG9ySWQsXG4gICAgICB7IGZyb20sIHRvIH0sXG4gICAgICB7XG4gICAgICAgIC4uLihjYXVzYXRpb25JZCAhPT0gdW5kZWZpbmVkID8geyBjYXVzYXRpb25JZCB9IDoge30pLFxuICAgICAgICAuLi4oaWRlbXBvdGVuY3lLZXkgIT09IHVuZGVmaW5lZCA/IHsgaWRlbXBvdGVuY3lLZXkgfSA6IHt9KSxcbiAgICAgIH0sXG4gICAgKTtcblxuICAgIC8vIEVwaWMtbGlmdCBwcm9qZWN0b3IgKHJvYWRtYXAgXHUwMEE3MS4yKTogZmlyc3QgY2hpbGQgTEVBVklORyBiYWNrbG9nIGxpZnRzXG4gICAgLy8gdGhlIGZlYXR1cmU7IGlkZW1wb3RlbnQgYnkgY2hlY2s7IGF1dGhvcmVkIGJ5IHRoZSBzeXN0ZW0gYWN0b3IuXG4gICAgaWYgKGZyb20gPT09ICdiYWNrbG9nJyAmJiB0byAhPT0gJ2JhY2tsb2cnKSB7XG4gICAgICBjb25zdCBmZWF0dXJlID0gdGhpcy5mZWF0dXJlcy5nZXQoaXRlbS5mZWF0dXJlSWQpO1xuICAgICAgaWYgKGZlYXR1cmUgJiYgZmVhdHVyZS5zdGF0ZSA9PT0gJ2JhY2tsb2cnKSB7XG4gICAgICAgIGZlYXR1cmUuc3RhdGUgPSAnaW5fcHJvZ3Jlc3MnO1xuICAgICAgICB0aGlzLmFwcGVuZCgnZmVhdHVyZScsIGZlYXR1cmUuaWQsICdmZWF0dXJlLnN0YXRlX2NoYW5nZWQnLCB0aGlzLnN5c3RlbUFjdG9ySWQsIHtcbiAgICAgICAgICBmcm9tOiAnYmFja2xvZycsXG4gICAgICAgICAgdG86ICdpbl9wcm9ncmVzcycsXG4gICAgICAgIH0sIHsgY2F1c2F0aW9uSWQ6IFN0cmluZyhldmVudC5nbG9iYWxTZXEpIH0pO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIGRvbmVfY2hlY2twb2ludCAocm9hZG1hcCBcdTAwQTcxLjEpOiB0aGUgc3RvcnkgY29tcGxldGVzIG5vcm1hbGx5OyB0aGUgaG9sZFxuICAgIC8vIG1hdGVyaWFsaXplcyBvbiB0aGUgZmVhdHVyZSBleGFjdGx5IGF0IGNvbXBsZXRpb24uXG4gICAgaWYgKHRvID09PSAnZG9uZScgJiYgaXRlbS5kb25lQ2hlY2twb2ludCkge1xuICAgICAgY29uc3QgZmVhdHVyZSA9IHRoaXMuZmVhdHVyZXMuZ2V0KGl0ZW0uZmVhdHVyZUlkKTtcbiAgICAgIGlmIChmZWF0dXJlICYmICFmZWF0dXJlLmRpc3BhdGNoSG9sZCkge1xuICAgICAgICBmZWF0dXJlLmRpc3BhdGNoSG9sZCA9IHRydWU7XG4gICAgICAgIHRoaXMuYXBwZW5kKCdmZWF0dXJlJywgZmVhdHVyZS5pZCwgJ2ZlYXR1cmUuZGlzcGF0Y2hfaG9sZF9yYWlzZWQnLCB0aGlzLnN5c3RlbUFjdG9ySWQsIHtcbiAgICAgICAgICB3b3JrSXRlbUlkOiBpdGVtLmlkLFxuICAgICAgICB9LCB7IGNhdXNhdGlvbklkOiBTdHJpbmcoZXZlbnQuZ2xvYmFsU2VxKSB9KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBSYWlscyBcdTIxOTIgY2hhdDogbmFycmF0ZSB0aGUgdHJhbnNpdGlvbiBpbnRvIGJvdW5kIHRhc2sgdGhyZWFkcyAoXHUwMEE3NS4yKS5cbiAgICB0aGlzLm5hcnJhdGVXb3JrSXRlbShpdGVtLCBgc3RhdGU6ICR7ZnJvbX0gXHUyMTkyICR7dG99YCk7XG5cbiAgICBjb25zdCByZXN1bHQgPSB0aGlzLmNvcHlJdGVtKGl0ZW0pO1xuICAgIGlmIChpZGVtcG90ZW5jeUtleSAhPT0gdW5kZWZpbmVkKSB0aGlzLmlkZW1wb3RlbmN5Q2FjaGUuc2V0KGlkZW1wb3RlbmN5S2V5LCB7IC4uLnJlc3VsdCB9KTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgYmxvY2tUYXNrKGlucHV0OiB7XG4gICAgd29ya0l0ZW1JZDogc3RyaW5nO1xuICAgIHJlYXNvbjogQmxvY2tlZFJlYXNvbjtcbiAgICBhY3RvcklkOiBzdHJpbmc7XG4gICAgZmVuY2luZ1Rva2VuPzogbnVtYmVyO1xuICB9KTogV29ya0l0ZW0ge1xuICAgIGNvbnN0IGl0ZW0gPSB0aGlzLm11c3RHZXRJdGVtKGlucHV0LndvcmtJdGVtSWQpO1xuICAgIGlmICghKEJMT0NLRURfUkVBU09OUyBhcyByZWFkb25seSBzdHJpbmdbXSkuaW5jbHVkZXMoaW5wdXQucmVhc29uKSkge1xuICAgICAgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoYHVua25vd24gYmxvY2tpbmcgY29uZGl0aW9uOiAke2lucHV0LnJlYXNvbn1gKTtcbiAgICB9XG4gICAgdGhpcy52YWxpZGF0ZVByZXNlbnRlZFRva2VuKGl0ZW0sIGlucHV0LmZlbmNpbmdUb2tlbiwgaW5wdXQuYWN0b3JJZCk7XG4gICAgdGhpcy5yZXF1aXJlUGVybWlzc2lvbihpbnB1dC5hY3RvcklkLCAndGFzay5ibG9jaycpO1xuICAgIGl0ZW0uYmxvY2tlZFJlYXNvbiA9IGlucHV0LnJlYXNvbjtcbiAgICBpdGVtLnN0YXRlVmVyc2lvbiArPSAxO1xuICAgIHRoaXMuYXBwZW5kKCd3b3JrX2l0ZW0nLCBpdGVtLmlkLCAnd29ya19pdGVtLmJsb2NrZWQnLCBpbnB1dC5hY3RvcklkLCB7IHJlYXNvbjogaW5wdXQucmVhc29uIH0pO1xuICAgIHJldHVybiB0aGlzLmNvcHlJdGVtKGl0ZW0pO1xuICB9XG5cbiAgdW5ibG9ja1Rhc2soaW5wdXQ6IHsgd29ya0l0ZW1JZDogc3RyaW5nOyBhY3RvcklkOiBzdHJpbmcgfSk6IFdvcmtJdGVtIHtcbiAgICBjb25zdCBpdGVtID0gdGhpcy5tdXN0R2V0SXRlbShpbnB1dC53b3JrSXRlbUlkKTtcbiAgICAvLyBcdTAwQTc0LjI6IHJldmlld19ub25fY29udmVyZ2VuY2UgY2FuIG9ubHkgYmUgcmVsZWFzZWQgYnkgYSByZXZpZXctZ2F0ZVxuICAgIC8vIGhvbGRlcjsgb3JkaW5hcnkgYmxvY2tzIHJlbGVhc2UgdW5kZXIgdGFzay5ibG9jay5cbiAgICBpZiAoaXRlbS5ibG9ja2VkUmVhc29uID09PSAncmV2aWV3X25vbl9jb252ZXJnZW5jZScpIHtcbiAgICAgIHRoaXMucmVxdWlyZVBlcm1pc3Npb24oaW5wdXQuYWN0b3JJZCwgJ2dhdGUucmV2aWV3LmFwcHJvdmUnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5yZXF1aXJlUGVybWlzc2lvbihpbnB1dC5hY3RvcklkLCAndGFzay5ibG9jaycpO1xuICAgIH1cbiAgICBpdGVtLmJsb2NrZWRSZWFzb24gPSBudWxsO1xuICAgIGl0ZW0uc3RhdGVWZXJzaW9uICs9IDE7XG4gICAgdGhpcy5hcHBlbmQoJ3dvcmtfaXRlbScsIGl0ZW0uaWQsICd3b3JrX2l0ZW0udW5ibG9ja2VkJywgaW5wdXQuYWN0b3JJZCwge30pO1xuICAgIHJldHVybiB0aGlzLmNvcHlJdGVtKGl0ZW0pO1xuICB9XG5cbiAgLy8gLS0gZ2F0ZXMgJiBldmlkZW5jZSAocm9hZG1hcCBcdTAwQTcxLjQpIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIHN1Ym1pdEV2aWRlbmNlKGlucHV0OiB7XG4gICAgd29ya0l0ZW1JZDogc3RyaW5nO1xuICAgIGV2aWRlbmNlOiBFdmlkZW5jZTtcbiAgICBhY3RvcklkOiBzdHJpbmc7XG4gICAgZmVuY2luZ1Rva2VuPzogbnVtYmVyO1xuICB9KTogdm9pZCB7XG4gICAgY29uc3QgaXRlbSA9IHRoaXMubXVzdEdldEl0ZW0oaW5wdXQud29ya0l0ZW1JZCk7XG4gICAgdGhpcy52YWxpZGF0ZVByZXNlbnRlZFRva2VuKGl0ZW0sIGlucHV0LmZlbmNpbmdUb2tlbiwgaW5wdXQuYWN0b3JJZCk7XG4gICAgdGhpcy5ldmlkZW5jZVJvd3MucHVzaCh7IHdvcmtJdGVtSWQ6IGl0ZW0uaWQsIGV2aWRlbmNlOiBpbnB1dC5ldmlkZW5jZSwgc2VxOiB0aGlzLmV2aWRlbmNlUm93cy5sZW5ndGggKyAxIH0pO1xuICAgIHRoaXMuYXBwZW5kKCd3b3JrX2l0ZW0nLCBpdGVtLmlkLCAnZXZpZGVuY2Uuc3VibWl0dGVkJywgaW5wdXQuYWN0b3JJZCwge1xuICAgICAga2luZDogaW5wdXQuZXZpZGVuY2Uua2luZCxcbiAgICB9KTtcbiAgfVxuXG4gIGFwcHJvdmVHYXRlKGlucHV0OiBHYXRlRGVjaXNpb25JbnB1dCk6IFdvcmtJdGVtIHtcbiAgICBjb25zdCBpdGVtID0gdGhpcy5tdXN0R2V0SXRlbShpbnB1dC53b3JrSXRlbUlkKTtcblxuICAgIGlmIChpbnB1dC5nYXRlID09PSAnc3BlY19hcHByb3ZhbCcpIHtcbiAgICAgIC8vIFBlcm1pc3Npb24gcHJlY2VkZXMgYW55IGVmZmVjdDogYSBkZW5pZWQgYXR0ZW1wdCBwaW5zIG5vdGhpbmcuXG4gICAgICB0aGlzLnJlcXVpcmVQZXJtaXNzaW9uKGlucHV0LmFjdG9ySWQsICdnYXRlLnNwZWMuYXBwcm92ZScpO1xuICAgICAgaWYgKGl0ZW0uYmxvY2tlZFJlYXNvbiAhPT0gbnVsbCkge1xuICAgICAgICB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcihgd29yayBpdGVtIGlzIGJsb2NrZWQ6ICR7aXRlbS5ibG9ja2VkUmVhc29ufWApO1xuICAgICAgfVxuICAgICAgaWYgKGl0ZW0uc3RhdGUgIT09ICdkcmFmdCcpIHtcbiAgICAgICAgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoYHNwZWNfYXBwcm92YWwgYXBwbGllcyB0byBkcmFmdCBpdGVtcywgbm90ICR7aXRlbS5zdGF0ZX1gKTtcbiAgICAgIH1cbiAgICAgIGlmIChpbnB1dC5waW5uZWRWZXJpZmljYXRpb24gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBpdGVtLnBpbm5lZFZlcmlmaWNhdGlvbiA9IFsuLi5pbnB1dC5waW5uZWRWZXJpZmljYXRpb25dO1xuICAgICAgfVxuICAgICAgaWYgKCF0aGlzLnF1b3J1bVdvdWxkQmVNZXQoaXRlbSwgJ3NwZWNfYXBwcm92YWwnLCBpbnB1dC5hY3RvcklkKSkge1xuICAgICAgICB0aGlzLnJlY29yZEFwcHJvdmFsKGl0ZW0sICdzcGVjX2FwcHJvdmFsJywgaW5wdXQuYWN0b3JJZCk7XG4gICAgICAgIHJldHVybiB0aGlzLmNvcHlJdGVtKGl0ZW0pOyAvLyBkZWNpc2lvbiByZWNvcmRlZDsgcXVvcnVtIHBlbmRpbmcgKGdhdGUgcG9saWN5IGlzIGRhdGEsIHJvYWRtYXAgXHUwMEE3MylcbiAgICAgIH1cbiAgICAgIHRoaXMucmVjb3JkQXBwcm92YWwoaXRlbSwgJ3NwZWNfYXBwcm92YWwnLCBpbnB1dC5hY3RvcklkKTtcbiAgICAgIC8vIFRoZSBhcHByb3ZhbCBmaXJlcyB0aGUgZ2F0ZWQgZm9yd2FyZCB0cmFuc2l0aW9uIChjb25mb3JtYW5jZSBwaW4pLlxuICAgICAgcmV0dXJuIHRoaXMuZXhlY3V0ZVRyYW5zaXRpb24oaXRlbSwgJ3JlYWR5X2Zvcl9kZXYnLCBpbnB1dC5hY3RvcklkKTtcbiAgICB9XG5cbiAgICAvLyByZXZpZXdfYXBwcm92YWxcbiAgICB0aGlzLnJlcXVpcmVQZXJtaXNzaW9uKGlucHV0LmFjdG9ySWQsICdnYXRlLnJldmlldy5hcHByb3ZlJyk7XG4gICAgaWYgKGl0ZW0uYmxvY2tlZFJlYXNvbiAhPT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoYHdvcmsgaXRlbSBpcyBibG9ja2VkOiAke2l0ZW0uYmxvY2tlZFJlYXNvbn1gKTtcbiAgICB9XG4gICAgaWYgKGl0ZW0uc3RhdGUgIT09ICdpbl9yZXZpZXcnKSB7XG4gICAgICB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcihgcmV2aWV3X2FwcHJvdmFsIGFwcGxpZXMgdG8gaW5fcmV2aWV3IGl0ZW1zLCBub3QgJHtpdGVtLnN0YXRlfWApO1xuICAgIH1cbiAgICBpZiAoIXRoaXMucXVvcnVtV291bGRCZU1ldChpdGVtLCAncmV2aWV3X2FwcHJvdmFsJywgaW5wdXQuYWN0b3JJZCkpIHtcbiAgICAgIHRoaXMucmVjb3JkQXBwcm92YWwoaXRlbSwgJ3Jldmlld19hcHByb3ZhbCcsIGlucHV0LmFjdG9ySWQpO1xuICAgICAgcmV0dXJuIHRoaXMuY29weUl0ZW0oaXRlbSk7IC8vIHF1b3J1bSBwZW5kaW5nIFx1MjAxNCBubyB0cmFuc2l0aW9uIHlldFxuICAgIH1cbiAgICAvLyBFdmlkZW5jZSBpcyBjaGVja2VkIGV4YWN0bHkgd2hlbiB0aGUgcXVvcnVtIHdvdWxkIGNvbXBsZXRlLCBzbyBhIGZhaWxlZFxuICAgIC8vIGFwcHJvdmFsIHJlY29yZHMgbm90aGluZyAoUGhhc2UgMSBwaW46IGRlbmllZCBhdHRlbXB0cyBtdXRhdGUgbm90aGluZykuXG4gICAgdGhpcy5jaGVja1Jldmlld0V2aWRlbmNlKGl0ZW0pO1xuICAgIHRoaXMucmVjb3JkQXBwcm92YWwoaXRlbSwgJ3Jldmlld19hcHByb3ZhbCcsIGlucHV0LmFjdG9ySWQpO1xuICAgIHJldHVybiB0aGlzLmV4ZWN1dGVUcmFuc2l0aW9uKGl0ZW0sICdkb25lJywgaW5wdXQuYWN0b3JJZCk7XG4gIH1cblxuICAvKiogRGlzdGluY3QgYXBwcm92ZXJzIG9mIHRoaXMgcm91bmQgKHJvdW5kID0gcmV2aWV3TG9vcEl0ZXJhdGlvbiBhdCBkZWNpc2lvbiB0aW1lKS4gKi9cbiAgcHJpdmF0ZSByb3VuZEFwcHJvdmVycyhpdGVtOiBXb3JrSXRlbVJvdywgZ2F0ZTogR2F0ZUNvZGUpOiBBY3RvcltdIHtcbiAgICBjb25zdCBpZHMgPSBuZXcgU2V0KFxuICAgICAgdGhpcy5nYXRlRGVjaXNpb25zXG4gICAgICAgIC5maWx0ZXIoXG4gICAgICAgICAgKGQpID0+XG4gICAgICAgICAgICBkLndvcmtJdGVtSWQgPT09IGl0ZW0uaWQgJiZcbiAgICAgICAgICAgIGQuZ2F0ZSA9PT0gZ2F0ZSAmJlxuICAgICAgICAgICAgZC5kZWNpc2lvbiA9PT0gJ2FwcHJvdmVkJyAmJlxuICAgICAgICAgICAgZC5yb3VuZCA9PT0gaXRlbS5yZXZpZXdMb29wSXRlcmF0aW9uLFxuICAgICAgICApXG4gICAgICAgIC5tYXAoKGQpID0+IGQuYWN0b3JJZCksXG4gICAgKTtcbiAgICByZXR1cm4gWy4uLmlkc10uZmxhdE1hcCgoaWQpID0+IHtcbiAgICAgIGNvbnN0IGFjdG9yID0gdGhpcy5hY3RvcnMuZ2V0KGlkKTtcbiAgICAgIHJldHVybiBhY3RvciA/IFthY3Rvcl0gOiBbXTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKiBHYXRlIHBvbGljeSBxdW9ydW0gKHJvYWRtYXAgXHUwMEE3Myk6IG1pbiBkaXN0aW5jdCBhcHByb3ZlcnMgKyByZXF1aXJlZCBhY3RvciB0eXBlcywgYXMgREFUQS4gKi9cbiAgcHJpdmF0ZSBxdW9ydW1Xb3VsZEJlTWV0KGl0ZW06IFdvcmtJdGVtUm93LCBnYXRlOiBHYXRlQ29kZSwgbmV4dEFwcHJvdmVySWQ6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgIGNvbnN0IHBvbGljeSA9IHRoaXMuZ2F0ZVBvbGljaWVzLmdldChnYXRlKSA/PyB7fTtcbiAgICBjb25zdCBtaW4gPSBwb2xpY3kubWluQXBwcm92YWxzID8/IDE7XG4gICAgY29uc3QgcmVxdWlyZWQgPSBwb2xpY3kucmVxdWlyZWRBY3RvclR5cGVzID8/IFtdO1xuICAgIGNvbnN0IGFwcHJvdmVycyA9IHRoaXMucm91bmRBcHByb3ZlcnMoaXRlbSwgZ2F0ZSk7XG4gICAgY29uc3QgbmV4dEFjdG9yID0gdGhpcy5hY3RvcnMuZ2V0KG5leHRBcHByb3ZlcklkKTtcbiAgICBpZiAobmV4dEFjdG9yICYmICFhcHByb3ZlcnMuc29tZSgoYSkgPT4gYS5pZCA9PT0gbmV4dEFjdG9yLmlkKSkgYXBwcm92ZXJzLnB1c2gobmV4dEFjdG9yKTtcbiAgICBpZiAoYXBwcm92ZXJzLmxlbmd0aCA8IG1pbikgcmV0dXJuIGZhbHNlO1xuICAgIGZvciAoY29uc3QgdHlwZSBvZiByZXF1aXJlZCkge1xuICAgICAgaWYgKCFhcHByb3ZlcnMuc29tZSgoYSkgPT4gYS50eXBlID09PSB0eXBlKSkgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIHByaXZhdGUgcmVjb3JkQXBwcm92YWwoaXRlbTogV29ya0l0ZW1Sb3csIGdhdGU6IEdhdGVDb2RlLCBhY3RvcklkOiBzdHJpbmcpOiB2b2lkIHtcbiAgICB0aGlzLmdhdGVEZWNpc2lvbnMucHVzaCh7XG4gICAgICB3b3JrSXRlbUlkOiBpdGVtLmlkLFxuICAgICAgZ2F0ZSxcbiAgICAgIGRlY2lzaW9uOiAnYXBwcm92ZWQnLFxuICAgICAgYWN0b3JJZCxcbiAgICAgIHJvdW5kOiBpdGVtLnJldmlld0xvb3BJdGVyYXRpb24sXG4gICAgfSk7XG4gICAgdGhpcy5hcHBlbmQoJ3dvcmtfaXRlbScsIGl0ZW0uaWQsICdnYXRlLmFwcHJvdmVkJywgYWN0b3JJZCwge1xuICAgICAgZ2F0ZSxcbiAgICAgIHJvdW5kOiBpdGVtLnJldmlld0xvb3BJdGVyYXRpb24sXG4gICAgICAuLi4oZ2F0ZSA9PT0gJ3NwZWNfYXBwcm92YWwnID8geyBwaW5uZWRWZXJpZmljYXRpb246IGl0ZW0ucGlubmVkVmVyaWZpY2F0aW9uIH0gOiB7fSksXG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogRXZpZGVuY2UgY29uZGl0aW9uIG9mIHRoZSBkb25lIGdhdGUgKFx1MDBBNzEuNCwgRDcpOiBldmVyeSBQSU5ORUQgY29tbWFuZCdzXG4gICAqIGxhdGVzdCB0ZXN0X3J1biBleGl0ZWQgMCAoYW4gdW5waW5uZWQgY29tbWFuZCBzYXRpc2ZpZXMgbm90aGluZyksIGFuZCB0aGVcbiAgICogZmluYWwgY29tbWl0IGlzIHJlYWNoYWJsZSBvbiB0aGUgcmVtb3RlLiByZXZpZXdfcmVwb3J0IGlzIG5ldmVyIGNvbnN1bHRlZC5cbiAgICogV2l0aCBub3RoaW5nIHBpbm5lZCwgdGhlIGdhdGUgZGVjaXNpb24gYnkgdGhlIHBlcm1pdHRlZCBhY3RvciBJUyB0aGUgaHVtYW5cbiAgICogZGVjaXNpb24gXHUyMDE0IGV2aWRlbmNlIGFsb25lIG5ldmVyIGNvbXBsZXRlcyB0aGUgaXRlbSBlaXRoZXIgd2F5LlxuICAgKi9cbiAgcHJpdmF0ZSBjaGVja1Jldmlld0V2aWRlbmNlKGl0ZW06IFdvcmtJdGVtUm93KTogdm9pZCB7XG4gICAgY29uc3Qgcm93cyA9IHRoaXMuZXZpZGVuY2VSb3dzLmZpbHRlcigocm93KSA9PiByb3cud29ya0l0ZW1JZCA9PT0gaXRlbS5pZCk7XG4gICAgZm9yIChjb25zdCBjb21tYW5kIG9mIGl0ZW0ucGlubmVkVmVyaWZpY2F0aW9uID8/IFtdKSB7XG4gICAgICBjb25zdCBydW5zID0gcm93cy5maWx0ZXIoXG4gICAgICAgIChyb3cpID0+IHJvdy5ldmlkZW5jZS5raW5kID09PSAndGVzdF9ydW4nICYmIHJvdy5ldmlkZW5jZS5wYXlsb2FkWydjb21tYW5kJ10gPT09IGNvbW1hbmQsXG4gICAgICApO1xuICAgICAgY29uc3QgbGF0ZXN0ID0gcnVuc1tydW5zLmxlbmd0aCAtIDFdO1xuICAgICAgaWYgKCFsYXRlc3QgfHwgbGF0ZXN0LmV2aWRlbmNlLnBheWxvYWRbJ2V4aXRDb2RlJ10gIT09IDApIHtcbiAgICAgICAgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoYHBpbm5lZCB2ZXJpZmljYXRpb24gZGlkIG5vdCBwYXNzOiAke2NvbW1hbmR9YCk7XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChpdGVtLmtpbmQgPT09ICdjb2RlJykge1xuICAgICAgLy8gTm9uLWNvZGUgZGVsaXZlcmFibGVzIGNhcnJ5IG5vIGNvbW1pdCByZXF1aXJlbWVudCAocm9hZG1hcCBcdTAwQTcxLjQpOlxuICAgICAgLy8gdGhlaXIgY29tcGxldGlvbiByZXN0cyBvbiBtYWNoaW5lLWNoZWNrYWJsZSBkb2MgZXZpZGVuY2UgcGx1cyB0aGVcbiAgICAgIC8vIHBlcm1pdHRlZCBhY3RvcidzIGRlY2lzaW9uLlxuICAgICAgY29uc3QgY29tbWl0T2sgPSByb3dzLnNvbWUoXG4gICAgICAgIChyb3cpID0+IHJvdy5ldmlkZW5jZS5raW5kID09PSAnY29tbWl0JyAmJiByb3cuZXZpZGVuY2UucGF5bG9hZFsncmVhY2hhYmxlT25SZW1vdGUnXSA9PT0gdHJ1ZSxcbiAgICAgICk7XG4gICAgICBpZiAoIWNvbW1pdE9rKSB7XG4gICAgICAgIHRocm93IG5ldyBHdWFyZEZhaWxlZEVycm9yKCdmaW5hbCByZXZpc2lvbiBtdXN0IGJlIHJlYWNoYWJsZSBvbiB0aGUgcmVtb3RlIChwdXNoIGlzIHBhcnQgb2YgdGhlIEhBTFQgY29udHJhY3QpJyk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmVqZWN0R2F0ZShpbnB1dDogR2F0ZURlY2lzaW9uSW5wdXQpOiBXb3JrSXRlbSB7XG4gICAgY29uc3QgaXRlbSA9IHRoaXMubXVzdEdldEl0ZW0oaW5wdXQud29ya0l0ZW1JZCk7XG4gICAgaWYgKGlucHV0LmdhdGUgIT09ICdyZXZpZXdfYXBwcm92YWwnKSB7XG4gICAgICB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcignb25seSByZXZpZXdfYXBwcm92YWwgcmVqZWN0aW9uIGlzIGRlZmluZWQgaW4gUGhhc2UgMScpO1xuICAgIH1cbiAgICAvLyBQaGFzZSAyIChhZGRpdGl2ZSk6IHJlamVjdGlvbiBhdXRob3JpdHkgPSBnYXRlLnJldmlldy5hcHByb3ZlIE9SXG4gICAgLy8gZ2F0ZS5yZXZpZXcucmVqZWN0IFx1MjAxNCB0aGUgUGhhc2UgMiBleGl0IGNyaXRlcmlvbidzIHJldmlld2VyLWFnZW50IGhvbGRzXG4gICAgLy8gb25seSB0aGUgbGF0dGVyLiBFdmVyeSBQaGFzZSAxIHBpbiBvbiByZWplY3RHYXRlIGtlZXBzIGhvbGRpbmcuXG4gICAgaWYgKFxuICAgICAgIXRoaXMuaGFzUGVybWlzc2lvbihpbnB1dC5hY3RvcklkLCAnZ2F0ZS5yZXZpZXcuYXBwcm92ZScpICYmXG4gICAgICAhdGhpcy5oYXNQZXJtaXNzaW9uKGlucHV0LmFjdG9ySWQsICdnYXRlLnJldmlldy5yZWplY3QnKVxuICAgICkge1xuICAgICAgdGhyb3cgbmV3IFBlcm1pc3Npb25EZW5pZWRFcnJvcignZ2F0ZS5yZXZpZXcucmVqZWN0JywgaW5wdXQuYWN0b3JJZCk7XG4gICAgfVxuICAgIGlmIChpdGVtLnN0YXRlICE9PSAnaW5fcmV2aWV3Jykge1xuICAgICAgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoYHJldmlldyByZWplY3Rpb24gYXBwbGllcyB0byBpbl9yZXZpZXcgaXRlbXMsIG5vdCAke2l0ZW0uc3RhdGV9YCk7XG4gICAgfVxuICAgIHRoaXMuZ2F0ZURlY2lzaW9ucy5wdXNoKHtcbiAgICAgIHdvcmtJdGVtSWQ6IGl0ZW0uaWQsXG4gICAgICBnYXRlOiAncmV2aWV3X2FwcHJvdmFsJyxcbiAgICAgIGRlY2lzaW9uOiAncmVqZWN0ZWQnLFxuICAgICAgYWN0b3JJZDogaW5wdXQuYWN0b3JJZCxcbiAgICAgIHJvdW5kOiBpdGVtLnJldmlld0xvb3BJdGVyYXRpb24sXG4gICAgfSk7XG4gICAgY29uc3QgZGVjaXNpb25FdmVudCA9IHRoaXMuYXBwZW5kKCd3b3JrX2l0ZW0nLCBpdGVtLmlkLCAnZ2F0ZS5yZWplY3RlZCcsIGlucHV0LmFjdG9ySWQsIHtcbiAgICAgIGdhdGU6ICdyZXZpZXdfYXBwcm92YWwnLFxuICAgIH0pO1xuXG4gICAgaWYgKGl0ZW0ucmV2aWV3TG9vcEl0ZXJhdGlvbiA+PSBSRVZJRVdfTE9PUF9MSU1JVCkge1xuICAgICAgLy8gVGhlIDZ0aCByZWplY3Rpb24gcGVyZm9ybXMgbm8gbG9vcGJhY2s6IG92ZXJsYXkgcmV2aWV3X25vbl9jb252ZXJnZW5jZSxcbiAgICAgIC8vIHN0YXRlIGZyb3plbiBhdCBpbl9yZXZpZXcsIGNvdW50ZXIgdW50b3VjaGVkIChDT05GT1JNQU5DRS5tZCBwaW4pLlxuICAgICAgaXRlbS5ibG9ja2VkUmVhc29uID0gJ3Jldmlld19ub25fY29udmVyZ2VuY2UnO1xuICAgICAgaXRlbS5zdGF0ZVZlcnNpb24gKz0gMTtcbiAgICAgIHRoaXMuYXBwZW5kKFxuICAgICAgICAnd29ya19pdGVtJyxcbiAgICAgICAgaXRlbS5pZCxcbiAgICAgICAgJ3dvcmtfaXRlbS5ibG9ja2VkJyxcbiAgICAgICAgdGhpcy5zeXN0ZW1BY3RvcklkLFxuICAgICAgICB7IHJlYXNvbjogJ3Jldmlld19ub25fY29udmVyZ2VuY2UnIH0sXG4gICAgICAgIHsgY2F1c2F0aW9uSWQ6IFN0cmluZyhkZWNpc2lvbkV2ZW50Lmdsb2JhbFNlcSkgfSxcbiAgICAgICk7XG4gICAgICByZXR1cm4gdGhpcy5jb3B5SXRlbShpdGVtKTtcbiAgICB9XG5cbiAgICAvLyBcdTAwQTcxLjI6IHRoZSBsb29wYmFjayBpcyBhIHN5c3RlbSBlZmZlY3QgXHUyMDE0IG5vIGNsYWltLWhvbGRlciBwYXJ0aWNpcGF0aW9uLlxuICAgIGl0ZW0ucmV2aWV3TG9vcEl0ZXJhdGlvbiArPSAxO1xuICAgIHJldHVybiB0aGlzLmV4ZWN1dGVUcmFuc2l0aW9uKGl0ZW0sICdpbl9wcm9ncmVzcycsIHRoaXMuc3lzdGVtQWN0b3JJZCwgdW5kZWZpbmVkLCBTdHJpbmcoZGVjaXNpb25FdmVudC5nbG9iYWxTZXEpKTtcbiAgfVxuXG4gIC8vIC0tIGNvbGxhYm9yYXRpb24gKFBoYXNlIDMsIHJvYWRtYXAgXHUwMEE3NSkgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgcHJpdmF0ZSBtdXN0R2V0VGhyZWFkKHRocmVhZElkOiBzdHJpbmcpOiBUaHJlYWQge1xuICAgIGNvbnN0IHRocmVhZCA9IHRoaXMudGhyZWFkcy5nZXQodGhyZWFkSWQpO1xuICAgIGlmICghdGhyZWFkKSB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcihgdW5rbm93biB0aHJlYWQ6ICR7dGhyZWFkSWR9YCk7XG4gICAgcmV0dXJuIHRocmVhZDtcbiAgfVxuXG4gIHByaXZhdGUgaXNQYXJ0aWNpcGFudCh0aHJlYWQ6IFRocmVhZCwgYWN0b3JJZDogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRocmVhZC5jcmVhdGVkQnkgPT09IGFjdG9ySWQgfHwgdGhyZWFkLnBhcnRpY2lwYW50cy5pbmNsdWRlcyhhY3RvcklkKTtcbiAgfVxuXG4gIGNyZWF0ZVRocmVhZChpbnB1dDoge1xuICAgIGFjdG9ySWQ6IHN0cmluZztcbiAgICBraW5kOiBUaHJlYWRLaW5kO1xuICAgIGZlYXR1cmVJZD86IHN0cmluZztcbiAgICB3b3JrSXRlbUlkPzogc3RyaW5nO1xuICAgIHZpc2liaWxpdHk/OiBUaHJlYWRWaXNpYmlsaXR5O1xuICB9KTogVGhyZWFkIHtcbiAgICBpZiAoaW5wdXQuZmVhdHVyZUlkICE9PSB1bmRlZmluZWQgJiYgIXRoaXMuZmVhdHVyZXMuaGFzKGlucHV0LmZlYXR1cmVJZCkpIHtcbiAgICAgIHRocm93IG5ldyBHdWFyZEZhaWxlZEVycm9yKGB1bmtub3duIGZlYXR1cmU6ICR7aW5wdXQuZmVhdHVyZUlkfWApO1xuICAgIH1cbiAgICBsZXQgd29ya0l0ZW1JZDogc3RyaW5nIHwgbnVsbCA9IG51bGw7XG4gICAgaWYgKGlucHV0LndvcmtJdGVtSWQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgd29ya0l0ZW1JZCA9IHRoaXMubXVzdEdldEl0ZW0oaW5wdXQud29ya0l0ZW1JZCkuaWQ7XG4gICAgfVxuICAgIGNvbnN0IHRocmVhZDogVGhyZWFkID0ge1xuICAgICAgaWQ6IHRoaXMubmV4dElkKCd0aCcpLFxuICAgICAgZmVhdHVyZUlkOiBpbnB1dC5mZWF0dXJlSWQgPz8gbnVsbCxcbiAgICAgIHdvcmtJdGVtSWQsXG4gICAgICBraW5kOiBpbnB1dC5raW5kLFxuICAgICAgdmlzaWJpbGl0eTogaW5wdXQudmlzaWJpbGl0eSA/PyAoaW5wdXQua2luZCA9PT0gJ3ByaXZhdGUnID8gJ3ByaXZhdGUnIDogJ29wZW4nKSxcbiAgICAgIGNyZWF0ZWRCeTogaW5wdXQuYWN0b3JJZCxcbiAgICAgIHBhcnRpY2lwYW50czogW2lucHV0LmFjdG9ySWRdLFxuICAgIH07XG4gICAgdGhpcy50aHJlYWRzLnNldCh0aHJlYWQuaWQsIHRocmVhZCk7XG4gICAgdGhpcy5hcHBlbmQoJ3RocmVhZCcsIHRocmVhZC5pZCwgJ3RocmVhZC5jcmVhdGVkJywgaW5wdXQuYWN0b3JJZCwge1xuICAgICAga2luZDogdGhyZWFkLmtpbmQsXG4gICAgICBmZWF0dXJlSWQ6IHRocmVhZC5mZWF0dXJlSWQsXG4gICAgICB3b3JrSXRlbUlkOiB0aHJlYWQud29ya0l0ZW1JZCxcbiAgICAgIHZpc2liaWxpdHk6IHRocmVhZC52aXNpYmlsaXR5LFxuICAgIH0pO1xuICAgIHJldHVybiB7IC4uLnRocmVhZCwgcGFydGljaXBhbnRzOiBbLi4udGhyZWFkLnBhcnRpY2lwYW50c10gfTtcbiAgfVxuXG4gIGFkZFRocmVhZFBhcnRpY2lwYW50KGlucHV0OiB7IHRocmVhZElkOiBzdHJpbmc7IGFjdG9ySWQ6IHN0cmluZzsgYnlBY3RvcklkOiBzdHJpbmcgfSk6IFRocmVhZCB7XG4gICAgY29uc3QgdGhyZWFkID0gdGhpcy5tdXN0R2V0VGhyZWFkKGlucHV0LnRocmVhZElkKTtcbiAgICBpZiAoIXRoaXMuaXNQYXJ0aWNpcGFudCh0aHJlYWQsIGlucHV0LmJ5QWN0b3JJZCkpIHtcbiAgICAgIHRocm93IG5ldyBQZXJtaXNzaW9uRGVuaWVkRXJyb3IoJ3RocmVhZC5pbnZpdGUnLCBpbnB1dC5ieUFjdG9ySWQpO1xuICAgIH1cbiAgICBpZiAoIXRoaXMuYWN0b3JzLmhhcyhpbnB1dC5hY3RvcklkKSkgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoYHVua25vd24gYWN0b3I6ICR7aW5wdXQuYWN0b3JJZH1gKTtcbiAgICBpZiAoIXRocmVhZC5wYXJ0aWNpcGFudHMuaW5jbHVkZXMoaW5wdXQuYWN0b3JJZCkpIHtcbiAgICAgIHRocmVhZC5wYXJ0aWNpcGFudHMucHVzaChpbnB1dC5hY3RvcklkKTtcbiAgICAgIHRoaXMuYXBwZW5kKCd0aHJlYWQnLCB0aHJlYWQuaWQsICd0aHJlYWQucGFydGljaXBhbnRfYWRkZWQnLCBpbnB1dC5ieUFjdG9ySWQsIHtcbiAgICAgICAgYWN0b3JJZDogaW5wdXQuYWN0b3JJZCxcbiAgICAgIH0pO1xuICAgIH1cbiAgICByZXR1cm4geyAuLi50aHJlYWQsIHBhcnRpY2lwYW50czogWy4uLnRocmVhZC5wYXJ0aWNpcGFudHNdIH07XG4gIH1cblxuICAvKiogSW50ZXJuYWwgYXBwZW5kIHRoYXQgbmV2ZXIgcnVucyB0aGUgcm91dGVyIFx1MjAxNCB1c2VkIGZvciBjaGF0LCBuYXJyYXRpb24gYWxpa2UuICovXG4gIHByaXZhdGUgYXBwZW5kTWVzc2FnZShcbiAgICB0aHJlYWQ6IFRocmVhZCxcbiAgICBhdXRob3JJZDogc3RyaW5nLFxuICAgIGtpbmQ6IE1lc3NhZ2VbJ2tpbmQnXSxcbiAgICBib2R5OiBzdHJpbmcsXG4gICAgcmVwbHlUbzogc3RyaW5nIHwgbnVsbCxcbiAgKTogTWVzc2FnZSB7XG4gICAgY29uc3Qgc2VxID0gdGhpcy5tZXNzYWdlcy5maWx0ZXIoKG0pID0+IG0udGhyZWFkSWQgPT09IHRocmVhZC5pZCkubGVuZ3RoICsgMTtcbiAgICBjb25zdCBtZXNzYWdlOiBNZXNzYWdlID0ge1xuICAgICAgaWQ6IHRoaXMubmV4dElkKCdtc2cnKSxcbiAgICAgIHRocmVhZElkOiB0aHJlYWQuaWQsXG4gICAgICBzZXEsXG4gICAgICBhdXRob3JJZCxcbiAgICAgIGtpbmQsXG4gICAgICBib2R5LFxuICAgICAgcmVwbHlUbyxcbiAgICB9O1xuICAgIHRoaXMubWVzc2FnZXMucHVzaChtZXNzYWdlKTtcbiAgICB0aGlzLmFwcGVuZCgndGhyZWFkJywgdGhyZWFkLmlkLCAnbWVzc2FnZS5wb3N0ZWQnLCBhdXRob3JJZCwgeyBtZXNzYWdlSWQ6IG1lc3NhZ2UuaWQsIGtpbmQgfSk7XG4gICAgcmV0dXJuIHsgLi4ubWVzc2FnZSB9O1xuICB9XG5cbiAgLyoqXG4gICAqIFx1MDBBNzUuMjogdGhlIHNlcnZlciBORVZFUiBwYXJzZXMgYm9keSB0ZXh0IFx1MjAxNCBgbWVudGlvbnNgIGlzIHN0cnVjdHVyZWQgYWN0b3JcbiAgICogaWRzLiBcdTAwQTc1LjQ6IHRoZSByb3V0ZXIgaXMgcHVyZSBjb2RlLCBkZWZhdWx0LWRlbnksIHBvbGljeS1nYXRlZCxcbiAgICogZGVwdGgtY2FwcGVkOyBhIGpvYiBpcyByZXBseS1vbmx5IGNvbnRleHQsIG5ldmVyIGEgY2xhaW0uXG4gICAqL1xuICBwb3N0TWVzc2FnZShpbnB1dDoge1xuICAgIHRocmVhZElkOiBzdHJpbmc7XG4gICAgYWN0b3JJZDogc3RyaW5nO1xuICAgIGJvZHk6IHN0cmluZztcbiAgICByZXBseVRvPzogc3RyaW5nO1xuICAgIG1lbnRpb25zPzogc3RyaW5nW107XG4gIH0pOiBNZXNzYWdlIHtcbiAgICBjb25zdCB0aHJlYWQgPSB0aGlzLm11c3RHZXRUaHJlYWQoaW5wdXQudGhyZWFkSWQpO1xuICAgIGlmICh0aHJlYWQudmlzaWJpbGl0eSA9PT0gJ3ByaXZhdGUnICYmICF0aGlzLmlzUGFydGljaXBhbnQodGhyZWFkLCBpbnB1dC5hY3RvcklkKSkge1xuICAgICAgdGhyb3cgbmV3IFBlcm1pc3Npb25EZW5pZWRFcnJvcigndGhyZWFkLnBvc3QnLCBpbnB1dC5hY3RvcklkKTtcbiAgICB9XG4gICAgY29uc3QgbWVzc2FnZSA9IHRoaXMuYXBwZW5kTWVzc2FnZSh0aHJlYWQsIGlucHV0LmFjdG9ySWQsICdjaGF0JywgaW5wdXQuYm9keSwgaW5wdXQucmVwbHlUbyA/PyBudWxsKTtcblxuICAgIGZvciAoY29uc3QgbWVudGlvbmVkSWQgb2YgWy4uLm5ldyBTZXQoaW5wdXQubWVudGlvbnMgPz8gW10pXSkge1xuICAgICAgY29uc3QgbWVudGlvbmVkID0gdGhpcy5hY3RvcnMuZ2V0KG1lbnRpb25lZElkKTtcbiAgICAgIGlmICghbWVudGlvbmVkKSB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcihgdW5rbm93biBtZW50aW9uZWQgYWN0b3I6ICR7bWVudGlvbmVkSWR9YCk7XG4gICAgICBjb25zdCByZXNvbHV0aW9uID0gdGhpcy5yb3V0ZU1lbnRpb24odGhyZWFkLCBtZXNzYWdlLCBpbnB1dC5hY3RvcklkLCBtZW50aW9uZWQpO1xuICAgICAgdGhpcy5tZW50aW9ucy5wdXNoKHsgbWVzc2FnZUlkOiBtZXNzYWdlLmlkLCBtZW50aW9uZWRBY3RvcklkOiBtZW50aW9uZWRJZCwgcmVzb2x1dGlvbiB9KTtcbiAgICAgIHRoaXMuYXBwZW5kKCd0aHJlYWQnLCB0aHJlYWQuaWQsICdtZW50aW9uLnJlY29yZGVkJywgaW5wdXQuYWN0b3JJZCwge1xuICAgICAgICBtZXNzYWdlSWQ6IG1lc3NhZ2UuaWQsXG4gICAgICAgIG1lbnRpb25lZEFjdG9ySWQ6IG1lbnRpb25lZElkLFxuICAgICAgICByZXNvbHV0aW9uLFxuICAgICAgfSk7XG4gICAgfVxuICAgIHJldHVybiBtZXNzYWdlO1xuICB9XG5cbiAgLyoqIFRoZSBkZXRlcm1pbmlzdGljIG1lbnRpb24gcm91dGVyIChcdTAwQTc1LjQpLiBSZXR1cm5zIHRoZSByZWNvcmRlZCByZXNvbHV0aW9uLiAqL1xuICBwcml2YXRlIHJvdXRlTWVudGlvbihcbiAgICB0aHJlYWQ6IFRocmVhZCxcbiAgICBtZXNzYWdlOiBNZXNzYWdlLFxuICAgIG1lbnRpb25lcklkOiBzdHJpbmcsXG4gICAgbWVudGlvbmVkOiBBY3RvcixcbiAgKTogTWVudGlvblsncmVzb2x1dGlvbiddIHtcbiAgICBpZiAobWVudGlvbmVkLnR5cGUgIT09ICdhZ2VudCcpIHtcbiAgICAgIHRoaXMucHVzaE5vdGlmaWNhdGlvbihtZW50aW9uZWQuaWQsICdtZW50aW9uJywgbWVzc2FnZS5pZCk7XG4gICAgICByZXR1cm4gJ25vdGlmaWVkJztcbiAgICB9XG4gICAgLy8ga2lsbC1zd2l0Y2ggYXBwbGllcyB0byBldmVyeSBqb2ItbWF0ZXJpYWxpemluZyBwYXRoXG4gICAgaWYgKHRoaXMud29ya3NwYWNlUG9saWN5Lm1lbnRpb25EaXNwYXRjaCA9PT0gZmFsc2UpIHJldHVybiAnZGVuaWVkX3BvbGljeSc7XG5cbiAgICBjb25zdCBtZW50aW9uZXIgPSB0aGlzLmFjdG9ycy5nZXQobWVudGlvbmVySWQpO1xuICAgIGxldCBkZXB0aCA9IDA7XG4gICAgaWYgKG1lbnRpb25lcj8udHlwZSA9PT0gJ2FnZW50Jykge1xuICAgICAgLy8gYWdlbnQtbWVudGlvbi1hZ2VudDogZXhwbGljaXQgcG9saWN5ICsgZGVwdGggY2FwIChcdTAwQTc1LjQpXG4gICAgICBpZiAodGhpcy53b3Jrc3BhY2VQb2xpY3kuYWdlbnRNZW50aW9uQWdlbnQgIT09IHRydWUpIHJldHVybiAnZGVuaWVkX3BvbGljeSc7XG4gICAgICBjb25zdCBtZW50aW9uZXJKb2JzID0gWy4uLnRoaXMuYWdlbnRKb2JzLnZhbHVlcygpXS5maWx0ZXIoKGopID0+IGouYWdlbnRBY3RvcklkID09PSBtZW50aW9uZXJJZCk7XG4gICAgICBkZXB0aCA9IE1hdGgubWF4KDAsIC4uLm1lbnRpb25lckpvYnMubWFwKChqKSA9PiBqLmRlcHRoKSkgKyAxO1xuICAgICAgaWYgKGRlcHRoID4gQUdFTlRfSk9CX01BWF9ERVBUSCkgcmV0dXJuICdkZW5pZWRfZGVwdGgnO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBkZWZhdWx0LWRlbnk6IHRoZSBodW1hbiBtZW50aW9uZXIgbXVzdCBob2xkIGludm9rZSBhdXRob3JpdHkgXHUyMDE0XG4gICAgICAvLyBhdCBsZWFzdCBvbmUgYWN0aXZlIGRlbGl2ZXJ5IHJvbGUsIG9yIGdvdmVybmFuY2UgYWRtaW4uXG4gICAgICBjb25zdCBoYXNSb2xlID0gdGhpcy5yb2xlQXNzaWdubWVudHMuc29tZSgoYSkgPT4gYS5hY3RvcklkID09PSBtZW50aW9uZXJJZCAmJiAhYS5yZXZva2VkKTtcbiAgICAgIGNvbnN0IGlzQWRtaW4gPSB0aGlzLmdvdmVybmFuY2VSb2xlcy5nZXQobWVudGlvbmVySWQpID09PSAnYWRtaW4nIHx8IG1lbnRpb25lcklkID09PSB0aGlzLnN5c3RlbUFjdG9ySWQ7XG4gICAgICBpZiAoIWhhc1JvbGUgJiYgIWlzQWRtaW4pIHJldHVybiAnZGVuaWVkX3BvbGljeSc7XG4gICAgfVxuXG4gICAgY29uc3Qgam9iOiBBZ2VudEpvYiA9IHtcbiAgICAgIGlkOiB0aGlzLm5leHRJZCgnam9iJyksXG4gICAgICBhZ2VudEFjdG9ySWQ6IG1lbnRpb25lZC5pZCxcbiAgICAgIHRocmVhZElkOiB0aHJlYWQuaWQsXG4gICAgICBtZXNzYWdlSWQ6IG1lc3NhZ2UuaWQsXG4gICAgICB3b3JrSXRlbUlkOiB0aHJlYWQud29ya0l0ZW1JZCxcbiAgICAgIGZlYXR1cmVJZDogdGhyZWFkLmZlYXR1cmVJZCxcbiAgICAgIHN0YXR1czogJ3F1ZXVlZCcsXG4gICAgICBkZXB0aCxcbiAgICAgIG5vdGU6IG51bGwsXG4gICAgfTtcbiAgICB0aGlzLmFnZW50Sm9icy5zZXQoam9iLmlkLCBqb2IpO1xuICAgIHRoaXMuYXBwZW5kKCdhZ2VudF9qb2InLCBqb2IuaWQsICdhZ2VudF9qb2IuY3JlYXRlZCcsIG1lbnRpb25lcklkLCB7XG4gICAgICBhZ2VudEFjdG9ySWQ6IG1lbnRpb25lZC5pZCxcbiAgICAgIHRocmVhZElkOiB0aHJlYWQuaWQsXG4gICAgICBtZXNzYWdlSWQ6IG1lc3NhZ2UuaWQsXG4gICAgICBkZXB0aCxcbiAgICB9KTtcbiAgICB0aGlzLnB1c2hOb3RpZmljYXRpb24obWVudGlvbmVkLmlkLCAnbWVudGlvbicsIG1lc3NhZ2UuaWQpO1xuICAgIHJldHVybiAnam9iX2NyZWF0ZWQnO1xuICB9XG5cbiAgcHJpdmF0ZSBwdXNoTm90aWZpY2F0aW9uKGFjdG9ySWQ6IHN0cmluZywgc291cmNlOiBOb3RpZmljYXRpb25bJ3NvdXJjZSddLCByZWZJZDogc3RyaW5nKTogdm9pZCB7XG4gICAgdGhpcy5ub3RpZmljYXRpb25zLnB1c2goeyBpZDogdGhpcy5uZXh0SWQoJ250ZicpLCBhY3RvcklkLCBzb3VyY2UsIHJlZklkLCByZWFkOiBmYWxzZSB9KTtcbiAgfVxuXG4gIGxpc3RUaHJlYWRzKGZpbHRlcj86IHsgZmVhdHVyZUlkPzogc3RyaW5nOyB3b3JrSXRlbUlkPzogc3RyaW5nOyBhY3RvcklkPzogc3RyaW5nIH0pOiBUaHJlYWRbXSB7XG4gICAgcmV0dXJuIFsuLi50aGlzLnRocmVhZHMudmFsdWVzKCldXG4gICAgICAuZmlsdGVyKCh0KSA9PiB7XG4gICAgICAgIGlmIChmaWx0ZXI/LmZlYXR1cmVJZCAhPT0gdW5kZWZpbmVkICYmIHQuZmVhdHVyZUlkICE9PSBmaWx0ZXIuZmVhdHVyZUlkKSByZXR1cm4gZmFsc2U7XG4gICAgICAgIGlmIChmaWx0ZXI/LndvcmtJdGVtSWQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIGNvbnN0IHJlc29sdmVkID0gdGhpcy5tdXN0R2V0SXRlbShmaWx0ZXIud29ya0l0ZW1JZCkuaWQ7XG4gICAgICAgICAgaWYgKHQud29ya0l0ZW1JZCAhPT0gcmVzb2x2ZWQpIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZmlsdGVyPy5hY3RvcklkICE9PSB1bmRlZmluZWQgJiYgdC52aXNpYmlsaXR5ID09PSAncHJpdmF0ZScgJiYgIXRoaXMuaXNQYXJ0aWNpcGFudCh0LCBmaWx0ZXIuYWN0b3JJZCkpIHtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9KVxuICAgICAgLm1hcCgodCkgPT4gKHsgLi4udCwgcGFydGljaXBhbnRzOiBbLi4udC5wYXJ0aWNpcGFudHNdIH0pKTtcbiAgfVxuXG4gIGxpc3RNZXNzYWdlcyhpbnB1dDogeyB0aHJlYWRJZDogc3RyaW5nOyBhY3RvcklkOiBzdHJpbmc7IHNpbmNlU2VxPzogbnVtYmVyIH0pOiBNZXNzYWdlW10ge1xuICAgIGNvbnN0IHRocmVhZCA9IHRoaXMubXVzdEdldFRocmVhZChpbnB1dC50aHJlYWRJZCk7XG4gICAgaWYgKHRocmVhZC52aXNpYmlsaXR5ID09PSAncHJpdmF0ZScgJiYgIXRoaXMuaXNQYXJ0aWNpcGFudCh0aHJlYWQsIGlucHV0LmFjdG9ySWQpKSB7XG4gICAgICB0aHJvdyBuZXcgUGVybWlzc2lvbkRlbmllZEVycm9yKCd0aHJlYWQucmVhZCcsIGlucHV0LmFjdG9ySWQpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5tZXNzYWdlc1xuICAgICAgLmZpbHRlcigobSkgPT4gbS50aHJlYWRJZCA9PT0gdGhyZWFkLmlkICYmIChpbnB1dC5zaW5jZVNlcSA9PT0gdW5kZWZpbmVkIHx8IG0uc2VxID4gaW5wdXQuc2luY2VTZXEpKVxuICAgICAgLm1hcCgobSkgPT4gKHsgLi4ubSB9KSk7XG4gIH1cblxuICBsaXN0TWVudGlvbnMobWVzc2FnZUlkOiBzdHJpbmcpOiBNZW50aW9uW10ge1xuICAgIHJldHVybiB0aGlzLm1lbnRpb25zLmZpbHRlcigobSkgPT4gbS5tZXNzYWdlSWQgPT09IG1lc3NhZ2VJZCkubWFwKChtKSA9PiAoeyAuLi5tIH0pKTtcbiAgfVxuXG4gIGxpc3ROb3RpZmljYXRpb25zKGlucHV0OiB7IGFjdG9ySWQ6IHN0cmluZzsgdW5yZWFkT25seT86IGJvb2xlYW4gfSk6IE5vdGlmaWNhdGlvbltdIHtcbiAgICByZXR1cm4gdGhpcy5ub3RpZmljYXRpb25zXG4gICAgICAuZmlsdGVyKChuKSA9PiBuLmFjdG9ySWQgPT09IGlucHV0LmFjdG9ySWQgJiYgKGlucHV0LnVucmVhZE9ubHkgIT09IHRydWUgfHwgIW4ucmVhZCkpXG4gICAgICAubWFwKChuKSA9PiAoeyAuLi5uIH0pKTtcbiAgfVxuXG4gIG1hcmtOb3RpZmljYXRpb25SZWFkKGlucHV0OiB7IG5vdGlmaWNhdGlvbklkOiBzdHJpbmc7IGFjdG9ySWQ6IHN0cmluZyB9KTogdm9pZCB7XG4gICAgY29uc3Qgbm90aWZpY2F0aW9uID0gdGhpcy5ub3RpZmljYXRpb25zLmZpbmQoKG4pID0+IG4uaWQgPT09IGlucHV0Lm5vdGlmaWNhdGlvbklkKTtcbiAgICBpZiAoIW5vdGlmaWNhdGlvbikgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoYHVua25vd24gbm90aWZpY2F0aW9uOiAke2lucHV0Lm5vdGlmaWNhdGlvbklkfWApO1xuICAgIGlmIChub3RpZmljYXRpb24uYWN0b3JJZCAhPT0gaW5wdXQuYWN0b3JJZCkge1xuICAgICAgdGhyb3cgbmV3IFBlcm1pc3Npb25EZW5pZWRFcnJvcigndGhyZWFkLnJlYWQnLCBpbnB1dC5hY3RvcklkKTtcbiAgICB9XG4gICAgbm90aWZpY2F0aW9uLnJlYWQgPSB0cnVlO1xuICB9XG5cbiAgbGlzdEFnZW50Sm9icyhmaWx0ZXI/OiB7IGFnZW50QWN0b3JJZD86IHN0cmluZzsgc3RhdHVzPzogQWdlbnRKb2JbJ3N0YXR1cyddIH0pOiBBZ2VudEpvYltdIHtcbiAgICByZXR1cm4gWy4uLnRoaXMuYWdlbnRKb2JzLnZhbHVlcygpXVxuICAgICAgLmZpbHRlcihcbiAgICAgICAgKGopID0+XG4gICAgICAgICAgKGZpbHRlcj8uYWdlbnRBY3RvcklkID09PSB1bmRlZmluZWQgfHwgai5hZ2VudEFjdG9ySWQgPT09IGZpbHRlci5hZ2VudEFjdG9ySWQpICYmXG4gICAgICAgICAgKGZpbHRlcj8uc3RhdHVzID09PSB1bmRlZmluZWQgfHwgai5zdGF0dXMgPT09IGZpbHRlci5zdGF0dXMpLFxuICAgICAgKVxuICAgICAgLm1hcCgoaikgPT4gKHsgLi4uaiB9KSk7XG4gIH1cblxuICBjb21wbGV0ZUFnZW50Sm9iKGlucHV0OiB7IGpvYklkOiBzdHJpbmc7IGFjdG9ySWQ6IHN0cmluZzsgc3RhdHVzOiAnZG9uZScgfCAnYmxvY2tlZCc7IG5vdGU/OiBzdHJpbmcgfSk6IEFnZW50Sm9iIHtcbiAgICBjb25zdCBqb2IgPSB0aGlzLmFnZW50Sm9icy5nZXQoaW5wdXQuam9iSWQpO1xuICAgIGlmICgham9iKSB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcihgdW5rbm93biBhZ2VudCBqb2I6ICR7aW5wdXQuam9iSWR9YCk7XG4gICAgaWYgKGpvYi5hZ2VudEFjdG9ySWQgIT09IGlucHV0LmFjdG9ySWQpIHtcbiAgICAgIHRocm93IG5ldyBQZXJtaXNzaW9uRGVuaWVkRXJyb3IoJ2FnZW50X2pvYi5jb21wbGV0ZScsIGlucHV0LmFjdG9ySWQpO1xuICAgIH1cbiAgICBpZiAoam9iLnN0YXR1cyAhPT0gJ3F1ZXVlZCcpIHRocm93IG5ldyBHdWFyZEZhaWxlZEVycm9yKGBhZ2VudCBqb2IgJHtqb2IuaWR9IGlzIGFscmVhZHkgJHtqb2Iuc3RhdHVzfWApO1xuICAgIGpvYi5zdGF0dXMgPSBpbnB1dC5zdGF0dXM7XG4gICAgam9iLm5vdGUgPSBpbnB1dC5ub3RlID8/IG51bGw7XG4gICAgdGhpcy5hcHBlbmQoJ2FnZW50X2pvYicsIGpvYi5pZCwgJ2FnZW50X2pvYi5jb21wbGV0ZWQnLCBpbnB1dC5hY3RvcklkLCB7XG4gICAgICBzdGF0dXM6IGlucHV0LnN0YXR1cyxcbiAgICAgIG5vdGU6IGpvYi5ub3RlLFxuICAgIH0pO1xuICAgIC8vIG5vdGlmeSB0aGUgbWVudGlvbmVyIFx1MjAxNCB0aGUgcmV2ZXJzZSBkaXJlY3Rpb24gaXMgYSBtZXNzYWdlICsgbm90aWZpY2F0aW9uLCBub3RoaW5nIG1vcmUgKFx1MDBBNzUuNClcbiAgICBjb25zdCB0cmlnZ2VyID0gdGhpcy5tZXNzYWdlcy5maW5kKChtKSA9PiBtLmlkID09PSBqb2IubWVzc2FnZUlkKTtcbiAgICBpZiAodHJpZ2dlcikgdGhpcy5wdXNoTm90aWZpY2F0aW9uKHRyaWdnZXIuYXV0aG9ySWQsICdqb2JfY29tcGxldGVkJywgam9iLmlkKTtcbiAgICByZXR1cm4geyAuLi5qb2IgfTtcbiAgfVxuXG4gIC8vIC0tIGFnZW50IG1lbW9yeSAoUGhhc2UgNSwgcm9hZG1hcCBcdTAwQTc2KSAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgYXBwZW5kQWdlbnRNZW1vcnkoaW5wdXQ6IHtcbiAgICBhY3RvcklkOiBzdHJpbmc7XG4gICAga2luZDogTWVtb3J5S2luZDtcbiAgICBjb250ZW50OiBzdHJpbmc7XG4gICAgc291cmNlVGhyZWFkSWQ/OiBzdHJpbmc7XG4gIH0pOiBBZ2VudE1lbW9yeSB7XG4gICAgY29uc3QgYWN0b3IgPSB0aGlzLmFjdG9ycy5nZXQoaW5wdXQuYWN0b3JJZCk7XG4gICAgaWYgKCFhY3RvcikgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoYHVua25vd24gYWN0b3I6ICR7aW5wdXQuYWN0b3JJZH1gKTtcbiAgICBpZiAoYWN0b3IudHlwZSAhPT0gJ2FnZW50Jykge1xuICAgICAgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoJ21lbW9yeSBiZWxvbmdzIHRvIGFnZW50IGFjdG9ycyAocm9hZG1hcCBcdTAwQTc2KScpO1xuICAgIH1cbiAgICBsZXQgc291cmNlVGhyZWFkSWQ6IHN0cmluZyB8IG51bGwgPSBudWxsO1xuICAgIGxldCBzb3VyY2VWaXNpYmlsaXR5OiBBZ2VudE1lbW9yeVsnc291cmNlVmlzaWJpbGl0eSddID0gbnVsbDtcbiAgICBpZiAoaW5wdXQuc291cmNlVGhyZWFkSWQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgY29uc3QgdGhyZWFkID0gdGhpcy5tdXN0R2V0VGhyZWFkKGlucHV0LnNvdXJjZVRocmVhZElkKTtcbiAgICAgIC8vIExlYXJuaW5nIGZyb20gYSBwcml2YXRlIGNvbnRleHQgcmVxdWlyZXMgaGF2aW5nIGJlZW4gaW4gaXQuXG4gICAgICBpZiAodGhyZWFkLnZpc2liaWxpdHkgPT09ICdwcml2YXRlJyAmJiAhdGhpcy5pc1BhcnRpY2lwYW50KHRocmVhZCwgaW5wdXQuYWN0b3JJZCkpIHtcbiAgICAgICAgdGhyb3cgbmV3IFBlcm1pc3Npb25EZW5pZWRFcnJvcigndGhyZWFkLnJlYWQnLCBpbnB1dC5hY3RvcklkKTtcbiAgICAgIH1cbiAgICAgIHNvdXJjZVRocmVhZElkID0gdGhyZWFkLmlkO1xuICAgICAgc291cmNlVmlzaWJpbGl0eSA9IHRocmVhZC52aXNpYmlsaXR5O1xuICAgIH1cbiAgICBjb25zdCBzZXEgPSB0aGlzLmFnZW50TWVtb3JpZXMuZmlsdGVyKChtKSA9PiBtLmFnZW50QWN0b3JJZCA9PT0gaW5wdXQuYWN0b3JJZCkubGVuZ3RoICsgMTtcbiAgICBjb25zdCBtZW1vcnk6IEFnZW50TWVtb3J5ID0ge1xuICAgICAgaWQ6IHRoaXMubmV4dElkKCdtZW0nKSxcbiAgICAgIGFnZW50QWN0b3JJZDogaW5wdXQuYWN0b3JJZCxcbiAgICAgIGtpbmQ6IGlucHV0LmtpbmQsXG4gICAgICBjb250ZW50OiBpbnB1dC5jb250ZW50LFxuICAgICAgc291cmNlVGhyZWFkSWQsXG4gICAgICBzb3VyY2VWaXNpYmlsaXR5LFxuICAgICAgc2VxLFxuICAgIH07XG4gICAgdGhpcy5hZ2VudE1lbW9yaWVzLnB1c2gobWVtb3J5KTtcbiAgICAvLyBDb250ZW50IE5FVkVSIGVudGVycyB0aGUgc2hhcmVkIGV2ZW50IGxvZyBcdTIwMTQgcHJpdmF0ZSBsZWFybmluZyBtdXN0IG5vdFxuICAgIC8vIGxlYWsgaW50byB0aGUgYXVkaXQgc3RyZWFtIChyb2FkbWFwIFx1MDBBNzYgcGluKS5cbiAgICB0aGlzLmFwcGVuZCgnYWN0b3InLCBpbnB1dC5hY3RvcklkLCAnbWVtb3J5LmFwcGVuZGVkJywgaW5wdXQuYWN0b3JJZCwge1xuICAgICAgbWVtb3J5SWQ6IG1lbW9yeS5pZCxcbiAgICAgIGtpbmQ6IG1lbW9yeS5raW5kLFxuICAgICAgc291cmNlVGhyZWFkSWQsXG4gICAgfSk7XG4gICAgcmV0dXJuIHsgLi4ubWVtb3J5IH07XG4gIH1cblxuICBzZWFyY2hBZ2VudE1lbW9yeShpbnB1dDoge1xuICAgIGFjdG9ySWQ6IHN0cmluZztcbiAgICBjb250ZXh0VGhyZWFkSWQ/OiBzdHJpbmc7XG4gICAga2luZD86IE1lbW9yeUtpbmQ7XG4gICAgcXVlcnk/OiBzdHJpbmc7XG4gIH0pOiBBZ2VudE1lbW9yeVtdIHtcbiAgICAvLyBPd25lci1zY29wZWQgYnkgY29uc3RydWN0aW9uOiB0aGVyZSBpcyBubyBjcm9zcy1hY3RvciBwYXJhbWV0ZXIuXG4gICAgcmV0dXJuIHRoaXMuYWdlbnRNZW1vcmllc1xuICAgICAgLmZpbHRlcigobSkgPT4ge1xuICAgICAgICBpZiAobS5hZ2VudEFjdG9ySWQgIT09IGlucHV0LmFjdG9ySWQpIHJldHVybiBmYWxzZTtcbiAgICAgICAgaWYgKGlucHV0LmtpbmQgIT09IHVuZGVmaW5lZCAmJiBtLmtpbmQgIT09IGlucHV0LmtpbmQpIHJldHVybiBmYWxzZTtcbiAgICAgICAgaWYgKGlucHV0LnF1ZXJ5ICE9PSB1bmRlZmluZWQgJiYgIW0uY29udGVudC50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKGlucHV0LnF1ZXJ5LnRvTG93ZXJDYXNlKCkpKSByZXR1cm4gZmFsc2U7XG4gICAgICAgIC8vIFx1MDBBNzY6IG5vdGhpbmcgbGVhcm5lZCBpbiBhIHByaXZhdGUgdGhyZWFkIHN1cmZhY2VzIG91dHNpZGUgaXRzXG4gICAgICAgIC8vIHNvdXJjZSB0aHJlYWQuXG4gICAgICAgIGlmIChtLnNvdXJjZVZpc2liaWxpdHkgPT09ICdwcml2YXRlJyAmJiBtLnNvdXJjZVRocmVhZElkICE9PSBpbnB1dC5jb250ZXh0VGhyZWFkSWQpIHJldHVybiBmYWxzZTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9KVxuICAgICAgLm1hcCgobSkgPT4gKHsgLi4ubSB9KSk7XG4gIH1cblxuICAvKiogUmFpbHMgXHUyMTkyIGNoYXQgbmFycmF0aW9uIChcdTAwQTc1LjIpOiBzdGF0ZSBjaGFuZ2VzIG5hcnJhdGUgaW50byBib3VuZCB0YXNrIHRocmVhZHMuICovXG4gIHByaXZhdGUgbmFycmF0ZVdvcmtJdGVtKGl0ZW06IFdvcmtJdGVtUm93LCBib2R5OiBzdHJpbmcpOiB2b2lkIHtcbiAgICBmb3IgKGNvbnN0IHRocmVhZCBvZiB0aGlzLnRocmVhZHMudmFsdWVzKCkpIHtcbiAgICAgIGlmICh0aHJlYWQud29ya0l0ZW1JZCA9PT0gaXRlbS5pZCkge1xuICAgICAgICB0aGlzLmFwcGVuZE1lc3NhZ2UodGhyZWFkLCB0aGlzLnN5c3RlbUFjdG9ySWQsICdzeXN0ZW0nLCBib2R5LCBudWxsKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvLyAtLSBkaXNwYXRjaCAocm9hZG1hcCBcdTAwQTcyLjMpIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgZ2V0VGFza0NvbnRleHQoaW5wdXQ6IHsgd29ya0l0ZW1JZDogc3RyaW5nIH0pOiB7IHdvcmtJdGVtOiBXb3JrSXRlbTsgZW50cnlTdGF0ZTogV29ya0l0ZW1TdGF0ZSB9IHtcbiAgICBjb25zdCBpdGVtID0gdGhpcy5tdXN0R2V0SXRlbShpbnB1dC53b3JrSXRlbUlkKTtcbiAgICBpZiAoaXRlbS5zdGF0ZSA9PT0gJ2RvbmUnKSB7XG4gICAgICB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcignZG9uZSBpdGVtcyBhcmUgbmV2ZXIgcmUtZGlzcGF0Y2hlZDsgZm9sbG93LXVwIHJldmlldyBpcyBhIG5ldyB3b3JrIGl0ZW0nKTtcbiAgICB9XG4gICAgY29uc3QgZmVhdHVyZSA9IHRoaXMuZmVhdHVyZXMuZ2V0KGl0ZW0uZmVhdHVyZUlkKTtcbiAgICBpZiAoZmVhdHVyZT8uZGlzcGF0Y2hIb2xkKSB7XG4gICAgICB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcignZmVhdHVyZSBpcyB1bmRlciBhIGRvbmVfY2hlY2twb2ludCBkaXNwYXRjaCBob2xkJyk7XG4gICAgfVxuICAgIHJldHVybiB7IHdvcmtJdGVtOiB0aGlzLmNvcHlJdGVtKGl0ZW0pLCBlbnRyeVN0YXRlOiBpdGVtLnN0YXRlIH07XG4gIH1cblxuICByZWxlYXNlRGlzcGF0Y2hIb2xkKGlucHV0OiB7IGZlYXR1cmVJZDogc3RyaW5nOyBhY3RvcklkOiBzdHJpbmcgfSk6IEZlYXR1cmUge1xuICAgIHRoaXMucmVxdWlyZVBlcm1pc3Npb24oaW5wdXQuYWN0b3JJZCwgJ2Rpc3BhdGNoLnJlbGVhc2VfaG9sZCcpO1xuICAgIGNvbnN0IGZlYXR1cmUgPSB0aGlzLmZlYXR1cmVzLmdldChpbnB1dC5mZWF0dXJlSWQpO1xuICAgIGlmICghZmVhdHVyZSkgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoYHVua25vd24gZmVhdHVyZTogJHtpbnB1dC5mZWF0dXJlSWR9YCk7XG4gICAgZmVhdHVyZS5kaXNwYXRjaEhvbGQgPSBmYWxzZTtcbiAgICB0aGlzLmFwcGVuZCgnZmVhdHVyZScsIGZlYXR1cmUuaWQsICdmZWF0dXJlLmRpc3BhdGNoX2hvbGRfcmVsZWFzZWQnLCBpbnB1dC5hY3RvcklkLCB7fSk7XG4gICAgcmV0dXJuIHRoaXMuY29weUZlYXR1cmUoZmVhdHVyZSk7XG4gIH1cblxuICAvLyAtLSByZWNvbmNpbGlhdGlvbiAocm9hZG1hcCBcdTAwQTcxLjYsIEQ2OiBkZXRlY3Qtb25seSwgbmV2ZXIgbXV0YXRlcykgLS0tLS0tLS0tLS0tXG5cbiAgcmVjb25jaWxlKGlucHV0OiB7IGZpbGVzOiBBcnJheTx7IHdvcmtJdGVtSWQ6IHN0cmluZzsgZnJvbnRtYXR0ZXJTdGF0dXM6IHN0cmluZyB9PiB9KTogRGl2ZXJnZW5jZVJlcG9ydFtdIHtcbiAgICBjb25zdCByZXBvcnRzOiBEaXZlcmdlbmNlUmVwb3J0W10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IGZpbGUgb2YgaW5wdXQuZmlsZXMpIHtcbiAgICAgIGNvbnN0IGl0ZW0gPSB0aGlzLm11c3RHZXRJdGVtKGZpbGUud29ya0l0ZW1JZCk7XG4gICAgICAvLyBGaWxlcyB1bmRlciBhIGxpdmUgY2xhaW0gYXJlIGV4Y2x1ZGVkIFx1MjAxNCBwbGF5Ym9va3MgbGVnaXRpbWF0ZWx5IHdyaXRlXG4gICAgICAvLyBmcm9udG1hdHRlciBtaWQtcnVuIChcdTAwQTcxLjYpLlxuICAgICAgaWYgKHRoaXMubGl2ZUNsYWltKGl0ZW0uaWQpICE9PSBudWxsKSBjb250aW51ZTtcblxuICAgICAgY29uc3QgcmF3ID0gZmlsZS5mcm9udG1hdHRlclN0YXR1cy50cmltKCk7XG4gICAgICBpZiAocmF3ID09PSAnYmxvY2tlZCcpIHtcbiAgICAgICAgLy8gRDg6IG92ZXJsYXkgaW4gdGhlIERCIGFuZCBgc3RhdHVzOiBibG9ja2VkYCBpbiB0aGUgZmlsZSBhcmUgdGhlXG4gICAgICAgIC8vIHNhbWUgdHJ1dGguIEJsb2NrZWQtaW4tZmlsZSB3aXRoIE5PIG92ZXJsYXkgaXMgcmVhbCBkcmlmdC5cbiAgICAgICAgaWYgKGl0ZW0uYmxvY2tlZFJlYXNvbiAhPT0gbnVsbCkgY29udGludWU7XG4gICAgICAgIHJlcG9ydHMucHVzaCh7XG4gICAgICAgICAgd29ya0l0ZW1JZDogaXRlbS5pZCxcbiAgICAgICAgICBmaWxlU3RhdGU6IHJhdyxcbiAgICAgICAgICBkYlN0YXRlOiBpdGVtLnN0YXRlLFxuICAgICAgICAgIGtpbmQ6ICdjb25mbGljdCcsXG4gICAgICAgIH0pO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgY29uc3Qgbm9ybWFsaXplZCA9IExFR0FDWV9TVEFUVVNbcmF3XTtcbiAgICAgIGlmIChub3JtYWxpemVkID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmVwb3J0cy5wdXNoKHsgd29ya0l0ZW1JZDogaXRlbS5pZCwgZmlsZVN0YXRlOiByYXcsIGRiU3RhdGU6IGl0ZW0uc3RhdGUsIGtpbmQ6ICdjb25mbGljdCcgfSk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgaWYgKG5vcm1hbGl6ZWQgPT09IGl0ZW0uc3RhdGUpIGNvbnRpbnVlO1xuICAgICAgcmVwb3J0cy5wdXNoKHtcbiAgICAgICAgd29ya0l0ZW1JZDogaXRlbS5pZCxcbiAgICAgICAgZmlsZVN0YXRlOiByYXcsXG4gICAgICAgIGRiU3RhdGU6IGl0ZW0uc3RhdGUsXG4gICAgICAgIGtpbmQ6IFJBTktbbm9ybWFsaXplZF0gPiBSQU5LW2l0ZW0uc3RhdGVdID8gJ2ZpbGVfYWhlYWQnIDogJ2RiX2FoZWFkJyxcbiAgICAgIH0pO1xuICAgIH1cbiAgICByZXR1cm4gcmVwb3J0cztcbiAgfVxuXG4gIC8vIC0tIHF1ZXJpZXMgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgZ2V0V29ya0l0ZW0oaWQ6IHN0cmluZyk6IFdvcmtJdGVtIHtcbiAgICByZXR1cm4gdGhpcy5jb3B5SXRlbSh0aGlzLm11c3RHZXRJdGVtKGlkKSk7XG4gIH1cblxuICBnZXRGZWF0dXJlKGlkOiBzdHJpbmcpOiBGZWF0dXJlIHtcbiAgICBjb25zdCBmZWF0dXJlID0gdGhpcy5mZWF0dXJlcy5nZXQoaWQpO1xuICAgIGlmICghZmVhdHVyZSkgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoYHVua25vd24gZmVhdHVyZTogJHtpZH1gKTtcbiAgICByZXR1cm4gdGhpcy5jb3B5RmVhdHVyZShmZWF0dXJlKTtcbiAgfVxuXG4gIGxpc3RXb3JrSXRlbXMoZmlsdGVyPzogeyBzdGF0ZT86IFdvcmtJdGVtU3RhdGU7IGZlYXR1cmVJZD86IHN0cmluZzsgY2xhaW1hYmxlPzogYm9vbGVhbiB9KTogV29ya0l0ZW1bXSB7XG4gICAgcmV0dXJuIFsuLi50aGlzLndvcmtJdGVtcy52YWx1ZXMoKV1cbiAgICAgIC5maWx0ZXIoKGl0ZW0pID0+IHtcbiAgICAgICAgaWYgKGZpbHRlcj8uc3RhdGUgIT09IHVuZGVmaW5lZCAmJiBpdGVtLnN0YXRlICE9PSBmaWx0ZXIuc3RhdGUpIHJldHVybiBmYWxzZTtcbiAgICAgICAgaWYgKGZpbHRlcj8uZmVhdHVyZUlkICE9PSB1bmRlZmluZWQgJiYgaXRlbS5mZWF0dXJlSWQgIT09IGZpbHRlci5mZWF0dXJlSWQpIHJldHVybiBmYWxzZTtcbiAgICAgICAgaWYgKGZpbHRlcj8uY2xhaW1hYmxlID09PSB0cnVlICYmIHRoaXMubGl2ZUNsYWltKGl0ZW0uaWQpICE9PSBudWxsKSByZXR1cm4gZmFsc2U7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfSlcbiAgICAgIC5tYXAoKGl0ZW0pID0+IHRoaXMuY29weUl0ZW0oaXRlbSkpO1xuICB9XG5cbiAgZ2V0Q2xhaW1zKHdvcmtJdGVtSWQ6IHN0cmluZyk6IENsYWltW10ge1xuICAgIGNvbnN0IGl0ZW0gPSB0aGlzLm11c3RHZXRJdGVtKHdvcmtJdGVtSWQpO1xuICAgIHJldHVybiAodGhpcy5jbGFpbXNCeUl0ZW0uZ2V0KGl0ZW0uaWQpID8/IFtdKS5mbGF0TWFwKChjbGFpbUlkKSA9PiB7XG4gICAgICBjb25zdCBjbGFpbSA9IHRoaXMuY2xhaW1zLmdldChjbGFpbUlkKTtcbiAgICAgIHJldHVybiBjbGFpbSA/IFt0aGlzLmNvcHlDbGFpbShjbGFpbSldIDogW107XG4gICAgfSk7XG4gIH1cblxuICBldmVudHMoc3RyZWFtSWQ/OiBzdHJpbmcpOiBTcGluZUV2ZW50W10ge1xuICAgIGNvbnN0IHNvdXJjZSA9IHN0cmVhbUlkID09PSB1bmRlZmluZWQgPyB0aGlzLmV2ZW50TG9nIDogdGhpcy5ldmVudExvZy5maWx0ZXIoKGUpID0+IGUuc3RyZWFtSWQgPT09IHN0cmVhbUlkKTtcbiAgICByZXR1cm4gc291cmNlLm1hcCgoZXZlbnQpID0+ICh7IC4uLmV2ZW50LCBwYXlsb2FkOiB7IC4uLmV2ZW50LnBheWxvYWQgfSB9KSk7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUVuZ2luZSgpOiBTcGluZUVuZ2luZSB7XG4gIHJldHVybiBuZXcgRW5naW5lSW1wbCgpO1xufVxuIiwgIi8qKlxuICogRnJvemVuIGludGVudCByZWdpb24gZXh0cmFjdGlvbiArIHZlcnNpb25lZCBpbnRlbnQgaGFzaCAocm9hZG1hcCBcdTAwQTcxLjEpLlxuICpcbiAqIEJvdGggcmVhbC13b3JsZCB0YWdzIGFyZSByZWNvZ25pemVkOiBgPGludGVudC1jb250cmFjdD5gIChkZXYtYXV0b1xuICogc3BlYy10ZW1wbGF0ZS5tZCkgYW5kIGA8ZnJvemVuLWFmdGVyLWFwcHJvdmFsIC4uLj5gIChxdWljay1kZXZcbiAqIHNwZWMtdGVtcGxhdGUubWQpLiBIYXNoaW5nIGhhcHBlbnMgYWZ0ZXIgY2Fub25pY2FsaXphdGlvbiBzbyBsaW5lLWVuZGluZ1xuICogYW5kIHRyYWlsaW5nLXdoaXRlc3BhY2UgY2h1cm4gKENSTEYgZWRpdG9ycywgYXV0by1mb3JtYXR0ZXJzKSBuZXZlciBtb3Zlc1xuICogdGhlIGhhc2ggXHUyMDE0IG9ubHkgcmVhbCBpbnRlbnQgZHJpZnQgZG9lcyAodGVjaG5pY2FsLXJpc2sgcmV2aWV3OiBhbGFybVxuICogZmF0aWd1ZSBraWxscyB0aGUgbWVjaGFuaXNtKS5cbiAqL1xuaW1wb3J0IHsgY3JlYXRlSGFzaCB9IGZyb20gJ25vZGU6Y3J5cHRvJztcblxuaW1wb3J0IHsgSU5URU5UX0hBU0hfQUxHTyB9IGZyb20gJy4vdHlwZXMuanMnO1xuXG5jb25zdCBUQUdfUEFUVEVSTlMgPSBbXG4gIC88aW50ZW50LWNvbnRyYWN0PihbXFxzXFxTXSo/KTxcXC9pbnRlbnQtY29udHJhY3Q+LyxcbiAgLzxmcm96ZW4tYWZ0ZXItYXBwcm92YWxcXGJbXj5dKj4oW1xcc1xcU10qPyk8XFwvZnJvemVuLWFmdGVyLWFwcHJvdmFsPi8sXG5dO1xuXG5leHBvcnQgZnVuY3Rpb24gZXh0cmFjdEludGVudFJlZ2lvbihtYXJrZG93bjogc3RyaW5nKTogc3RyaW5nIHwgbnVsbCB7XG4gIGZvciAoY29uc3QgcGF0dGVybiBvZiBUQUdfUEFUVEVSTlMpIHtcbiAgICBjb25zdCBtYXRjaCA9IHBhdHRlcm4uZXhlYyhtYXJrZG93bik7XG4gICAgaWYgKG1hdGNoICE9PSBudWxsKSByZXR1cm4gbWF0Y2hbMV0gPz8gJyc7XG4gIH1cbiAgcmV0dXJuIG51bGw7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjYW5vbmljYWxpemVGb3JIYXNoKHRleHQ6IHN0cmluZyk6IHN0cmluZyB7XG4gIGNvbnN0IHVuaXhOZXdsaW5lcyA9IHRleHQucmVwbGFjZSgvXFxyXFxuL2csICdcXG4nKTtcbiAgY29uc3Qgc3RyaXBwZWQgPSB1bml4TmV3bGluZXNcbiAgICAuc3BsaXQoJ1xcbicpXG4gICAgLm1hcCgobGluZSkgPT4gbGluZS5yZXBsYWNlKC9bIFxcdF0rJC8sICcnKSlcbiAgICAuam9pbignXFxuJyk7XG4gIC8vIENvbGxhcHNlIHJ1bnMgb2YgMisgYmxhbmsgbGluZXMgdG8gYSBzaW5nbGUgYmxhbmsgbGluZTsgYSBzaW5nbGUgYmxhbmtcbiAgLy8gbGluZSBpcyBtZWFuaW5nZnVsIG1hcmtkb3duIGFuZCBwYXNzZXMgdGhyb3VnaCB1bnRvdWNoZWQuXG4gIHJldHVybiBzdHJpcHBlZC5yZXBsYWNlKC9cXG57Myx9L2csICdcXG5cXG4nKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNvbXB1dGVJbnRlbnRIYXNoKHJlZ2lvbjogc3RyaW5nKTogc3RyaW5nIHtcbiAgY29uc3QgZGlnZXN0ID0gY3JlYXRlSGFzaCgnc2hhMjU2JykudXBkYXRlKGNhbm9uaWNhbGl6ZUZvckhhc2gocmVnaW9uKSwgJ3V0ZjgnKS5kaWdlc3QoJ2hleCcpO1xuICByZXR1cm4gYCR7SU5URU5UX0hBU0hfQUxHT306JHtkaWdlc3R9YDtcbn1cbiIsICIvKipcbiAqIEBvYWhzL2NvcmUgXHUyMDE0IHB1YmxpYyBBUEkgb2YgdGhlIGRldGVybWluaXN0aWMgc3BpbmUgKFJ1bGVzIGxheWVyIGFzIGNvZGUpLlxuICpcbiAqIFRoZSBjb25mb3JtYW5jZSBzdWl0ZSBpbiB0ZXN0LyBpcyB0aGUgc3BlY2lmaWNhdGlvbjogaXQgd2FzIHdyaXR0ZW4gZmlyc3QsXG4gKiBmcm9tIHRoZSBwcm9zZSBydWxlcyBpbiB0aGUgQk1BRCBzb3VyY2UgYXMgYXJiaXRyYXRlZCBpbiBwcm9kdWN0LXJvYWRtYXAubWRcbiAqIFx1MDBBNzEgYW5kIHRlc3QvQ09ORk9STUFOQ0UubWQuIEltcGxlbWVudGF0aW9uIG1vZHVsZXM6XG4gKiAgLSB0eXBlcy50cyAgICAgICBcdTIwMTQgdm9jYWJ1bGFyeSwgZW50aXRpZXMsIGVycm9ycyAodGhlIGZpeGVkIHN1cmZhY2UpXG4gKiAgLSBlbmdpbmUudHMgICAgICBcdTIwMTQgaW4tbWVtb3J5IHJlZmVyZW5jZSBlbmdpbmUgKEZTTSwgY2xhaW1zLCBnYXRlcywgZXZlbnRzKVxuICogIC0gaW50ZW50LWhhc2gudHMgXHUyMDE0IGZyb3plbi1yZWdpb24gZXh0cmFjdGlvbiArIHZlcnNpb25lZCBjYW5vbmljYWxpemVkIGhhc2hcbiAqICAtIHN0b3JpZXMudHMgICAgIFx1MjAxNCBzdG9yaWVzLnlhbWwgcGFyc2luZyArIHZhbGlkaXR5IHJ1bGVzXG4gKlxuICogSW52YXJpYW50cyAocHJvZHVjdC1yb2FkbWFwLm1kIFx1MDBBNzAuMSwgbWFjaGluZS1jaGVja2VkIGluIENJKTpcbiAqICAtIE5vIExMTSBTREsgaW1wb3J0IGFueXdoZXJlIHVuZGVyIHBhY2thZ2VzL2NvcmUuXG4gKiAgLSBObyBjb2RlIHBhdGggb3V0c2lkZSBjb21tYW5kIGhhbmRsZXJzIHdyaXRlcyBwcm9qZWN0aW9ucy5cbiAqL1xuaW1wb3J0IHsgY3JlYXRlRW5naW5lIGFzIGNyZWF0ZU1lbW9yeUVuZ2luZSB9IGZyb20gJy4vZW5naW5lLmpzJztcbmltcG9ydCB0eXBlIHsgU3BpbmVFbmdpbmUgfSBmcm9tICcuL3R5cGVzLmpzJztcblxuZXhwb3J0ICogZnJvbSAnLi90eXBlcy5qcyc7XG5leHBvcnQgeyBleHRyYWN0SW50ZW50UmVnaW9uLCBjYW5vbmljYWxpemVGb3JIYXNoLCBjb21wdXRlSW50ZW50SGFzaCB9IGZyb20gJy4vaW50ZW50LWhhc2guanMnO1xuZXhwb3J0IHsgcGFyc2VTdG9yaWVzLCB0eXBlIFN0b3J5RW50cnkgfSBmcm9tICcuL3N0b3JpZXMuanMnO1xuXG4vKipcbiAqIEVuZ2luZSBmYWN0b3J5IGluZGlyZWN0aW9uOiB0aGUgY29uZm9ybWFuY2Ugc3VpdGUgYWx3YXlzIGNhbGxzXG4gKiBjcmVhdGVFbmdpbmUoKTsgYSBwZXJzaXN0ZW5jZSBwYWNrYWdlIChlLmcuIEBvYWhzL2RiKSByZWdpc3RlcnMgaXRzIG93blxuICogZmFjdG9yeSBpbiBhIHZpdGVzdCBzZXR1cCBmaWxlIHRvIHJ1biB0aGUgSURFTlRJQ0FMIHN1aXRlIGFnYWluc3QgUG9zdGdyZXNcbiAqIChzdG9yeSBcIjExXCI6IFwiY29uZm9ybWFuY2Ugc3VpdGUgcnVucyBhZ2FpbnN0IGJvdGggbWVtb3J5IGFuZCBQb3N0Z3Jlc1xuICogZW5naW5lc1wiKS4gRGVmYXVsdCBpcyB0aGUgaW4tbWVtb3J5IHJlZmVyZW5jZSBlbmdpbmUuXG4gKi9cbmxldCBlbmdpbmVGYWN0b3J5OiAoKSA9PiBTcGluZUVuZ2luZSA9IGNyZWF0ZU1lbW9yeUVuZ2luZTtcblxuZXhwb3J0IGZ1bmN0aW9uIHNldEVuZ2luZUZhY3RvcnkoZmFjdG9yeTogKCkgPT4gU3BpbmVFbmdpbmUpOiB2b2lkIHtcbiAgZW5naW5lRmFjdG9yeSA9IGZhY3Rvcnk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVFbmdpbmUoKTogU3BpbmVFbmdpbmUge1xuICByZXR1cm4gZW5naW5lRmFjdG9yeSgpO1xufVxuXG5leHBvcnQgeyBjcmVhdGVNZW1vcnlFbmdpbmUgfTtcbiIsICIvKipcbiAqIGRvY2xpbnQgXHUyMDE0IHRoZSBNRUFTVVJJTkcgdG9vbCBmb3Igbm9uLWNvZGUgd29yayAoUGhhc2UgNCwgcm9hZG1hcCBcdTAwQTcxLjQpLlxuICpcbiAqIFwiRm9yIG5vbi1jb2RlIHdvcms6IGV2aWRlbmNlIGlzIGVpdGhlciBtYWNoaW5lLWNoZWNrYWJsZSAoZmlsZSBleGlzdHMsXG4gKiBmcm9udG1hdHRlciBzY2hlbWEtdmFsaWQsIGRvY3VtZW50IGxpbnQpIG9yIGEgcGVybWl0dGVkIGFjdG9yJ3MgZ2F0ZVxuICogZGVjaXNpb24uIEEgY2hlY2tsaXN0IGFuIExMTSB0aWNrZWQgaXMgbmVpdGhlci5cIlxuICpcbiAqIGxpbnREb2MgaXMgZGV0ZXJtaW5pc3RpYyBhbmQgTExNLWZyZWU6IGl0IE1FQVNVUkVTIGEgZG9jdW1lbnQgYW5kIHJldHVybnNcbiAqIHJhdyBmaW5kaW5ncy4gVGhlIHZlcmRpY3QgKHdoZXRoZXIgYSBmYWlsaW5nIGxpbnQgYmxvY2tzIGluX3Byb2dyZXNzIFx1MjE5MlxuICogaW5fcmV2aWV3KSBpcyBjb21wdXRlZCBieSB0aGUgY29yZSBmcm9tIHRoZSBzdWJtaXR0ZWQgZG9jX2xpbnQgZXZpZGVuY2UgXHUyMDE0XG4gKiBuZXZlciBoZXJlLlxuICpcbiAqIENoZWNrczpcbiAqICAxLiBub24tZW1wdHkgY29udGVudDtcbiAqICAyLiBpZiB0aGUgZG9jdW1lbnQgb3BlbnMgd2l0aCBhICctLS0nIGZyb250bWF0dGVyIGZlbmNlLCB0aGUgYmxvY2sgbXVzdFxuICogICAgIHBhcnNlIGFzIFlBTUwgKGFuZCBjbG9zZSk7XG4gKiAgMy4gZXZlcnkgcmVxdWVzdGVkIHJlcXVpcmVkIHNlY3Rpb24gbXVzdCBleGlzdCBhcyBhbiBIMiBoZWFkaW5nXG4gKiAgICAgKGAjIyA8bmFtZT5gLCBjYXNlLWluc2Vuc2l0aXZlKTtcbiAqICA0LiBwbGFjZWhvbGRlciBtYXJrZXJzIChUQkQgLyBUT0RPIC8gRklYTUUgLyBMT1JFTSBJUFNVTSkgYXJlIGZpbmRpbmdzIFx1MjAxNFxuICogICAgIGEgcGxhY2Vob2xkZXItcmlkZGVuIGRvY3VtZW50IGlzIG5vdCBzY2hlbWEtdmFsaWQuXG4gKi9cbmltcG9ydCB7IHBhcnNlIGFzIHBhcnNlWWFtbCB9IGZyb20gJ3lhbWwnO1xuXG5leHBvcnQgaW50ZXJmYWNlIExpbnREb2NPcHRpb25zIHtcbiAgLyoqIEgyIGhlYWRpbmdzIHRoZSBkb2N1bWVudCBtdXN0IGNvbnRhaW4gKG1hdGNoZWQgYXMgYCMjIDxuYW1lPmApLiAqL1xuICByZXF1aXJlZFNlY3Rpb25zPzogc3RyaW5nW107XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgRG9jTGludFJlc3VsdCB7XG4gIC8qKiB0cnVlIHdoZW4gZXZlcnkgY2hlY2sgcGFzc2VkIFx1MjAxNCB0aGUgcGF5bG9hZCB0aGUgY29yZSBndWFyZHMgb24uICovXG4gIHNjaGVtYVZhbGlkOiBib29sZWFuO1xuICAvKiogSHVtYW4tcmVhZGFibGUgZmluZGluZ3MsIGVtcHR5IHdoZW4gc2NoZW1hVmFsaWQuICovXG4gIGZpbmRpbmdzOiBzdHJpbmdbXTtcbn1cblxuY29uc3QgUExBQ0VIT0xERVJfUkUgPSAvXFxiKFRCRHxUT0RPfEZJWE1FfExPUkVNIElQU1VNKVxcYi9pO1xuXG4vKiogRXNjYXBlIGEgc3RyaW5nIGZvciBsaXRlcmFsIHVzZSBpbnNpZGUgYSBSZWdFeHAuICovXG5mdW5jdGlvbiBlc2NhcGVSZWdFeHAodmFsdWU6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiB2YWx1ZS5yZXBsYWNlKC9bLiorP14ke30oKXxbXFxdXFxcXF0vZywgJ1xcXFwkJicpO1xufVxuXG4vKipcbiAqIFNwbGl0IG9mZiBhIGxlYWRpbmcgJy0tLScgZnJvbnRtYXR0ZXIgYmxvY2suIFJldHVybnMgdGhlIHJhdyBibG9jayAobnVsbFxuICogd2hlbiB0aGVyZSBpcyBub25lKSwgd2hldGhlciB0aGUgZmVuY2UgY2xvc2VkLCBhbmQgdGhlIHJlbWFpbmluZyBib2R5LlxuICovXG5mdW5jdGlvbiBzcGxpdEZyb250bWF0dGVyKGNvbnRlbnQ6IHN0cmluZyk6IHtcbiAgYmxvY2s6IHN0cmluZyB8IG51bGw7XG4gIGNsb3NlZDogYm9vbGVhbjtcbiAgYm9keTogc3RyaW5nO1xufSB7XG4gIGlmICghY29udGVudC5zdGFydHNXaXRoKCctLS0nKSkgcmV0dXJuIHsgYmxvY2s6IG51bGwsIGNsb3NlZDogdHJ1ZSwgYm9keTogY29udGVudCB9O1xuICBjb25zdCBjbG9zZSA9IGNvbnRlbnQuaW5kZXhPZignXFxuLS0tJywgMyk7XG4gIGlmIChjbG9zZSA9PT0gLTEpIHJldHVybiB7IGJsb2NrOiBudWxsLCBjbG9zZWQ6IGZhbHNlLCBib2R5OiBjb250ZW50IH07XG4gIGNvbnN0IGZpcnN0TmV3bGluZSA9IGNvbnRlbnQuaW5kZXhPZignXFxuJyk7XG4gIGNvbnN0IGJsb2NrID0gY29udGVudC5zbGljZShmaXJzdE5ld2xpbmUgKyAxLCBjbG9zZSk7XG4gIGNvbnN0IGJvZHlTdGFydCA9IGNvbnRlbnQuaW5kZXhPZignXFxuJywgY2xvc2UgKyAxKTtcbiAgY29uc3QgYm9keSA9IGJvZHlTdGFydCA9PT0gLTEgPyAnJyA6IGNvbnRlbnQuc2xpY2UoYm9keVN0YXJ0ICsgMSk7XG4gIHJldHVybiB7IGJsb2NrLCBjbG9zZWQ6IHRydWUsIGJvZHkgfTtcbn1cblxuLyoqIERldGVybWluaXN0aWNhbGx5IGxpbnQgYSBkb2N1bWVudC4gUHVyZSBtZWFzdXJlbWVudCBcdTIwMTQgbm8gTExNLCBubyB2ZXJkaWN0cy4gKi9cbmV4cG9ydCBmdW5jdGlvbiBsaW50RG9jKGNvbnRlbnQ6IHN0cmluZywgb3B0czogTGludERvY09wdGlvbnMgPSB7fSk6IERvY0xpbnRSZXN1bHQge1xuICBjb25zdCBmaW5kaW5nczogc3RyaW5nW10gPSBbXTtcblxuICBpZiAoY29udGVudC50cmltKCkubGVuZ3RoID09PSAwKSB7XG4gICAgZmluZGluZ3MucHVzaCgnZG9jdW1lbnQgaXMgZW1wdHknKTtcbiAgICByZXR1cm4geyBzY2hlbWFWYWxpZDogZmFsc2UsIGZpbmRpbmdzIH07XG4gIH1cblxuICBjb25zdCB7IGJsb2NrLCBjbG9zZWQgfSA9IHNwbGl0RnJvbnRtYXR0ZXIoY29udGVudCk7XG4gIGlmICghY2xvc2VkKSB7XG4gICAgZmluZGluZ3MucHVzaChcImZyb250bWF0dGVyIGZlbmNlICctLS0nIG5ldmVyIGNsb3Nlc1wiKTtcbiAgfSBlbHNlIGlmIChibG9jayAhPT0gbnVsbCkge1xuICAgIHRyeSB7XG4gICAgICBwYXJzZVlhbWwoYmxvY2spO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBjb25zdCBtZXNzYWdlID0gZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2Uuc3BsaXQoJ1xcbicpWzBdIDogU3RyaW5nKGVycm9yKTtcbiAgICAgIGZpbmRpbmdzLnB1c2goYGZyb250bWF0dGVyIGlzIG5vdCB2YWxpZCBZQU1MOiAke21lc3NhZ2UgPz8gJ3BhcnNlIGVycm9yJ31gKTtcbiAgICB9XG4gIH1cblxuICBmb3IgKGNvbnN0IHNlY3Rpb24gb2Ygb3B0cy5yZXF1aXJlZFNlY3Rpb25zID8/IFtdKSB7XG4gICAgY29uc3QgaGVhZGluZ1JlID0gbmV3IFJlZ0V4cChgXiMjXFxcXHMrJHtlc2NhcGVSZWdFeHAoc2VjdGlvbil9XFxcXHMqJGAsICdpbScpO1xuICAgIGlmICghaGVhZGluZ1JlLnRlc3QoY29udGVudCkpIHtcbiAgICAgIGZpbmRpbmdzLnB1c2goYG1pc3NpbmcgcmVxdWlyZWQgc2VjdGlvbjogIyMgJHtzZWN0aW9ufWApO1xuICAgIH1cbiAgfVxuXG4gIGNvbnN0IGxpbmVzID0gY29udGVudC5zcGxpdCgnXFxuJyk7XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgbGluZXMubGVuZ3RoOyBpICs9IDEpIHtcbiAgICBjb25zdCBsaW5lID0gbGluZXNbaV07XG4gICAgaWYgKGxpbmUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgY29uc3QgbWF0Y2ggPSBQTEFDRUhPTERFUl9SRS5leGVjKGxpbmUpO1xuICAgICAgaWYgKG1hdGNoICE9PSBudWxsKSB7XG4gICAgICAgIGZpbmRpbmdzLnB1c2goYHBsYWNlaG9sZGVyIFwiJHttYXRjaFsxXSA/PyBtYXRjaFswXX1cIiBhdCBsaW5lICR7aSArIDF9YCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHsgc2NoZW1hVmFsaWQ6IGZpbmRpbmdzLmxlbmd0aCA9PT0gMCwgZmluZGluZ3MgfTtcbn1cbiIsICIvKipcbiAqIEBvYWhzL3J1bm5lciBcdTIwMTQgdGVhbW1hdGUgSk9CUyBydW50aW1lIChQaGFzZSA1LCByb2FkbWFwIFx1MDBBNzYpLlxuICpcbiAqIFRoZSBnZW5lcmljIGxlYXJuaW5nLXRlYW1tYXRlIGxvb3A6IGEgbWVudGlvbiBtYXRlcmlhbGl6ZXMgYSByZXBseS1vbmx5XG4gKiBhZ2VudCBqb2IgKFx1MDBBNzUuNCk7IHRoaXMgcnVudGltZSBsZXRzIEFOWSBhZ2VudC1jbWQgKGNsYXVkZSwgaGVybWVzLCBcdTIwMjYpIHNlcnZlXG4gKiB0aG9zZSBqb2JzIFRIUk9VR0ggVEhFIFJBSUxTIFx1MjAxNCByZWFkIGNvbnRleHQgdmlhIGxpc3RfbWVzc2FnZXMsIHJlY2FsbCB2aWFcbiAqIHNlYXJjaF9hZ2VudF9tZW1vcnksIHJlcGx5IHZpYSBwb3N0X21lc3NhZ2UsIGxlYXJuIHZpYSBhcHBlbmRfYWdlbnRfbWVtb3J5LlxuICpcbiAqIEd1YXJkcmFpbCBieSBjb25zdHJ1Y3Rpb24gKFx1MDBBNzYgXCJsZWFybmluZyBuZXZlciBiZWNvbWVzIGF1dGhvcml0eVwiKTogdGhpc1xuICogbW9kdWxlIGNhbGxzIE5PIGxpZmVjeWNsZSBjb21tYW5kIFx1MjAxNCBubyBjbGFpbSwgbm8gYWR2YW5jZSwgbm8gZ2F0ZS4gVGhlXG4gKiBhdWRpdCB0cmFpbCBvZiBhIGpvYnMtbW9kZSBhZ2VudCBzaG93cyBtZXNzYWdlcywgam9iIGNvbXBsZXRpb25zLCBhbmRcbiAqIGNvbnRlbnQtZnJlZSBtZW1vcnkgZXZlbnRzLCBub3RoaW5nIGVsc2UuIFRoZXJlIGlzIG5vIExMTSBTREsgaGVyZTsgdGhlXG4gKiBhZ2VudCBiaW5hcnkgaXMgYW4gZXh0ZXJuYWwgY29tbWFuZCwgZXhhY3RseSBsaWtlIHRoZSB3b3JrZXIgbG9vcCdzLlxuICpcbiAqIE9uZSBjeWNsZSAocnVuSm9ic09uY2UpOlxuICogIDEuIHBvbGwgbGlzdF9hZ2VudF9qb2JzKGFnZW50QWN0b3JJZCwgc3RhdHVzPXF1ZXVlZCkgXHUyMTkyIGZpcnN0IGpvYlxuICogIDIuIHJlYWQgdGhlIHRocmVhZCB2aWEgdGhlIHJhaWxzLiBBIHByaXZhdGUgdGhyZWFkIHRoZSBhZ2VudCB3YXMgbmV2ZXJcbiAqICAgICBpbnZpdGVkIGludG8gYW5zd2VycyA0MDMgXHUyMDE0IHRoZSBqb2IgY29tcGxldGVzIGBibG9ja2VkYCB3aXRoIG5vdGVcbiAqICAgICAnbm8gdGhyZWFkIGFjY2VzcycgKHRoZSByYWlscyBkZWNpZGUgdmlzaWJpbGl0eSwgbmV2ZXIgdGhlIHJ1bnRpbWUpLlxuICogIDMuIHJlY2FsbDogc2VhcmNoX2FnZW50X21lbW9yeShjb250ZXh0VGhyZWFkSWQgPSBqb2IudGhyZWFkSWQpLCBuZXdlc3QgMjBcbiAqICAgICAocmVjYWxsIGZhaWx1cmVzIGFyZSBzb2Z0IFx1MjAxNCBtZW1vcnkgbWFrZXMgcmVwbGllcyBiZXR0ZXIsIG5ldmVyIGdhdGVzIHRoZW0pXG4gKiAgNC4gd3JpdGUge2pvYiwgbWVzc2FnZXMsIG1lbW9yaWVzfSBKU09OIHRvIGEgdGVtcCBDT05URVhUX0ZJTEVcbiAqICA1LiBpbnZva2UgdGhlIGFnZW50IGNvbW1hbmQgdGVtcGxhdGUgKHtDT05URVhUX0ZJTEV9IHtSRVBMWV9GSUxFfVxuICogICAgIHtUSFJFQURfSUR9IHtKT0JfSUR9OyBlbnYgT0FIU19DT05URVhUX0ZJTEUgLyBPQUhTX1JFUExZX0ZJTEUpO1xuICogICAgIHRoZSBhZ2VudCB3cml0ZXMgaXRzIHJlcGx5IHRleHQgdG8gUkVQTFlfRklMRVxuICogIDYuIHBvc3RfbWVzc2FnZSh0aHJlYWRJZCwgcmVwbHksIG1lbnRpb25zPVt0cmlnZ2VyIGF1dGhvcl0pIFx1MjE5MiB0aGUgcmV2ZXJzZVxuICogICAgIG1lbnRpb24gbm90aWZpZXMgdGhlIGh1bWFuIHdobyBhc2tlZCAoXHUwMEE3NS40KVxuICogIDcuIGNvbXBsZXRlX2FnZW50X2pvYihkb25lKVxuICogIDguIGFwcGVuZF9hZ2VudF9tZW1vcnkoZXBpc29kaWMsICdqb2IgPGlkPiBpbiB0aHJlYWQgPGlkPjogPHJlcGx5IGhlYWQ+JyxcbiAqICAgICBzb3VyY2VUaHJlYWRJZCA9IGpvYi50aHJlYWRJZCkgXHUyMDE0IHNvZnQ6IGEgbGVhcm5pbmcgZmFpbHVyZSBuZXZlciB1bmRvZXNcbiAqICAgICB0aGUgZGVsaXZlcmVkIHJlcGx5LlxuICovXG5pbXBvcnQgeyBzcGF3blN5bmMgfSBmcm9tICdub2RlOmNoaWxkX3Byb2Nlc3MnO1xuaW1wb3J0IHsgZXhpc3RzU3luYywgbWtkdGVtcFN5bmMsIHJlYWRGaWxlU3luYywgcm1TeW5jLCB3cml0ZUZpbGVTeW5jIH0gZnJvbSAnbm9kZTpmcyc7XG5pbXBvcnQgeyB0bXBkaXIgfSBmcm9tICdub2RlOm9zJztcbmltcG9ydCB7IGpvaW4gfSBmcm9tICdub2RlOnBhdGgnO1xuaW1wb3J0IHR5cGUgeyBPYWhzQ2xpZW50IH0gZnJvbSAnQG9haHMvY29udHJhY3RzJztcbmltcG9ydCB0eXBlIHsgQWdlbnRKb2IsIEFnZW50TWVtb3J5LCBNZXNzYWdlIH0gZnJvbSAnQG9haHMvY29yZSc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgSm9ic1J1bm5lck9wdGlvbnMge1xuICBjbGllbnQ6IE9haHNDbGllbnQ7XG4gIC8qKiBUaGUgYWdlbnQgYWN0b3IgdGhpcyBydW50aW1lIHNlcnZlcyBcdTIwMTQgaXRzIE9XTiBqb2JzLCBub2JvZHkgZWxzZSdzLiAqL1xuICBhZ2VudEFjdG9ySWQ6IHN0cmluZztcbiAgLyoqXG4gICAqIEFnZW50IGNvbW1hbmQgdGVtcGxhdGUuIFBsYWNlaG9sZGVyczoge0NPTlRFWFRfRklMRX0ge1JFUExZX0ZJTEV9XG4gICAqIHtUSFJFQURfSUR9IHtKT0JfSUR9LiBBbHNvIHJlY2VpdmVzIGVudiBPQUhTX0NPTlRFWFRfRklMRSAvIE9BSFNfUkVQTFlfRklMRS5cbiAgICovXG4gIGFnZW50Q21kOiBzdHJpbmc7XG4gIC8qKiBNYXggd2FsbCB0aW1lIGZvciBvbmUgYWdlbnQgaW52b2NhdGlvbiAobXMpLiBEZWZhdWx0IDEwIG1pbnV0ZXMuICovXG4gIGFnZW50VGltZW91dE1zPzogbnVtYmVyO1xuICAvKiogRXh0cmEgZW52aXJvbm1lbnQgdmFyaWFibGVzIHBhc3NlZCB0byB0aGUgYWdlbnQgaW52b2NhdGlvbi4gKi9cbiAgYWdlbnRFbnY/OiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+O1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEpvYnNPbmNlUmVzdWx0IHtcbiAgLyoqIHRydWUgd2hlbiBhIHF1ZXVlZCBqb2IgZXhpc3RlZCBhbmQgd2FzIGRyaXZlbiB0byBkb25lL2Jsb2NrZWQuICovXG4gIGhhbmRsZWQ6IGJvb2xlYW47XG4gIGpvYklkPzogc3RyaW5nO1xuICBvdXRjb21lPzogJ2RvbmUnIHwgJ2Jsb2NrZWQnO1xuICBkZXRhaWxzPzogc3RyaW5nO1xufVxuXG4vKiogTmV3ZXN0IG1lbW9yaWVzIHRoZSBjb250ZXh0IGZpbGUgY2FycmllcyAobW9zdCByZWNlbnQgbGFzdCwgYXBwZW5kIG9yZGVyKS4gKi9cbmNvbnN0IFJFQ0FMTF9MSU1JVCA9IDIwO1xuXG4vKiogRXBpc29kaWMgbGVhcm5pbmcgbm90ZSBrZWVwcyBvbmx5IHRoZSBoZWFkIG9mIHRoZSByZXBseS4gKi9cbmNvbnN0IE1FTU9SWV9SRVBMWV9IRUFEID0gMjAwO1xuXG5mdW5jdGlvbiBpc1JlbW90ZUVycm9yKGVycm9yOiB1bmtub3duLCBuYW1lOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgcmV0dXJuIChcbiAgICB0eXBlb2YgZXJyb3IgPT09ICdvYmplY3QnICYmXG4gICAgZXJyb3IgIT09IG51bGwgJiZcbiAgICAoZXJyb3IgYXMgeyBlcnJvck5hbWU/OiB1bmtub3duIH0pLmVycm9yTmFtZSA9PT0gbmFtZVxuICApO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcnVuSm9ic09uY2Uob3B0aW9uczogSm9ic1J1bm5lck9wdGlvbnMpOiBQcm9taXNlPEpvYnNPbmNlUmVzdWx0PiB7XG4gIGNvbnN0IHsgY2xpZW50LCBhZ2VudEFjdG9ySWQgfSA9IG9wdGlvbnM7XG5cbiAgLy8gMSBcdTIwMTQgcG9sbDogdGhpcyBhZ2VudCdzIHF1ZXVlZCBqb2JzIG9ubHk7IHRha2UgdGhlIGZpcnN0LlxuICBjb25zdCBxdWV1ZWQgPSBhd2FpdCBjbGllbnQuY2FsbDxBZ2VudEpvYltdPignbGlzdF9hZ2VudF9qb2JzJywge1xuICAgIGFnZW50QWN0b3JJZCxcbiAgICBzdGF0dXM6ICdxdWV1ZWQnLFxuICB9KTtcbiAgY29uc3Qgam9iID0gcXVldWVkWzBdO1xuICBpZiAoam9iID09PSB1bmRlZmluZWQpIHJldHVybiB7IGhhbmRsZWQ6IGZhbHNlIH07XG5cbiAgLy8gMiBcdTIwMTQgcmVhZCB0aGUgdGhyZWFkIFRIUk9VR0ggdGhlIHJhaWxzLiA0MDMgPSB0aGUgYWdlbnQgbWF5IG5vdCBzZWUgdGhpc1xuICAvLyBjb250ZXh0IChwcml2YXRlIHRocmVhZCwgbmV2ZXIgaW52aXRlZCkgXHUyMTkyIGJsb2NrZWQsIG5vdGUgb25seS4gTm8gcmV0cnksXG4gIC8vIG5vIHByaXZpbGVnZTogdmlzaWJpbGl0eSBpcyB0aGUgZW5naW5lJ3MgY2FsbC5cbiAgbGV0IG1lc3NhZ2VzOiBNZXNzYWdlW107XG4gIHRyeSB7XG4gICAgbWVzc2FnZXMgPSBhd2FpdCBjbGllbnQuY2FsbDxNZXNzYWdlW10+KCdsaXN0X21lc3NhZ2VzJywgeyB0aHJlYWRJZDogam9iLnRocmVhZElkIH0pO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGlmIChpc1JlbW90ZUVycm9yKGVycm9yLCAnUGVybWlzc2lvbkRlbmllZEVycm9yJykpIHtcbiAgICAgIGF3YWl0IGNsaWVudC5jYWxsKCdjb21wbGV0ZV9hZ2VudF9qb2InLCB7XG4gICAgICAgIGpvYklkOiBqb2IuaWQsXG4gICAgICAgIHN0YXR1czogJ2Jsb2NrZWQnLFxuICAgICAgICBub3RlOiAnbm8gdGhyZWFkIGFjY2VzcycsXG4gICAgICB9KTtcbiAgICAgIHJldHVybiB7IGhhbmRsZWQ6IHRydWUsIGpvYklkOiBqb2IuaWQsIG91dGNvbWU6ICdibG9ja2VkJywgZGV0YWlsczogJ25vIHRocmVhZCBhY2Nlc3MnIH07XG4gICAgfVxuICAgIHRocm93IGVycm9yO1xuICB9XG5cbiAgLy8gMyBcdTIwMTQgcmVjYWxsIChzb2Z0KTogb3duZXItc2NvcGVkIGJ5IGNvbnN0cnVjdGlvbjsgdGhlIGVuZ2luZSBhbHJlYWR5XG4gIC8vIGZpbHRlcnMgcHJpdmF0ZS1zb3VyY2VkIG1lbW9yaWVzIHRvIHRoZWlyIHNvdXJjZSB0aHJlYWQgKFx1MDBBNzYpLlxuICBsZXQgbWVtb3JpZXM6IEFnZW50TWVtb3J5W10gPSBbXTtcbiAgdHJ5IHtcbiAgICBjb25zdCByZWNhbGxlZCA9IGF3YWl0IGNsaWVudC5jYWxsPEFnZW50TWVtb3J5W10+KCdzZWFyY2hfYWdlbnRfbWVtb3J5Jywge1xuICAgICAgY29udGV4dFRocmVhZElkOiBqb2IudGhyZWFkSWQsXG4gICAgfSk7XG4gICAgbWVtb3JpZXMgPSByZWNhbGxlZC5zbGljZSgtUkVDQUxMX0xJTUlUKTtcbiAgfSBjYXRjaCB7XG4gICAgLyogcmVjYWxsIG5ldmVyIGdhdGVzIGEgcmVwbHkgKi9cbiAgfVxuXG4gIC8vIDQvNSBcdTIwMTQgY29udGV4dCBmaWxlIGluLCByZXBseSBmaWxlIG91dC5cbiAgY29uc3QgZGlyID0gbWtkdGVtcFN5bmMoam9pbih0bXBkaXIoKSwgJ29haHMtam9iLScpKTtcbiAgdHJ5IHtcbiAgICBjb25zdCBjb250ZXh0RmlsZSA9IGpvaW4oZGlyLCAnY29udGV4dC5qc29uJyk7XG4gICAgY29uc3QgcmVwbHlGaWxlID0gam9pbihkaXIsICdyZXBseS50eHQnKTtcbiAgICB3cml0ZUZpbGVTeW5jKGNvbnRleHRGaWxlLCBgJHtKU09OLnN0cmluZ2lmeSh7IGpvYiwgbWVzc2FnZXMsIG1lbW9yaWVzIH0sIG51bGwsIDIpfVxcbmAsICd1dGY4Jyk7XG5cbiAgICBjb25zdCBjb21tYW5kID0gb3B0aW9ucy5hZ2VudENtZFxuICAgICAgLnJlcGxhY2VBbGwoJ3tDT05URVhUX0ZJTEV9JywgY29udGV4dEZpbGUpXG4gICAgICAucmVwbGFjZUFsbCgne1JFUExZX0ZJTEV9JywgcmVwbHlGaWxlKVxuICAgICAgLnJlcGxhY2VBbGwoJ3tUSFJFQURfSUR9Jywgam9iLnRocmVhZElkKVxuICAgICAgLnJlcGxhY2VBbGwoJ3tKT0JfSUR9Jywgam9iLmlkKTtcbiAgICBjb25zdCBpbnZva2VkID0gc3Bhd25TeW5jKCdiYXNoJywgWyctbGMnLCBjb21tYW5kXSwge1xuICAgICAgY3dkOiBkaXIsXG4gICAgICBlbmNvZGluZzogJ3V0ZjgnLFxuICAgICAgdGltZW91dDogb3B0aW9ucy5hZ2VudFRpbWVvdXRNcyA/PyAxMCAqIDYwICogMTAwMCxcbiAgICAgIGtpbGxTaWduYWw6ICdTSUdLSUxMJyxcbiAgICAgIGVudjoge1xuICAgICAgICAuLi5wcm9jZXNzLmVudixcbiAgICAgICAgLi4ub3B0aW9ucy5hZ2VudEVudixcbiAgICAgICAgT0FIU19DT05URVhUX0ZJTEU6IGNvbnRleHRGaWxlLFxuICAgICAgICBPQUhTX1JFUExZX0ZJTEU6IHJlcGx5RmlsZSxcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICBjb25zdCByZXBseSA9IGV4aXN0c1N5bmMocmVwbHlGaWxlKSA/IHJlYWRGaWxlU3luYyhyZXBseUZpbGUsICd1dGY4JykudHJpbSgpIDogJyc7XG4gICAgaWYgKHJlcGx5ID09PSAnJykge1xuICAgICAgY29uc3Qgbm90ZSA9IGBhZ2VudCB3cm90ZSBubyByZXBseSAoZXhpdCAke1N0cmluZyhpbnZva2VkLnN0YXR1cyA/PyAtMSl9KWA7XG4gICAgICBhd2FpdCBjbGllbnQuY2FsbCgnY29tcGxldGVfYWdlbnRfam9iJywgeyBqb2JJZDogam9iLmlkLCBzdGF0dXM6ICdibG9ja2VkJywgbm90ZSB9KTtcbiAgICAgIHJldHVybiB7IGhhbmRsZWQ6IHRydWUsIGpvYklkOiBqb2IuaWQsIG91dGNvbWU6ICdibG9ja2VkJywgZGV0YWlsczogbm90ZSB9O1xuICAgIH1cblxuICAgIC8vIDYgXHUyMDE0IHJlcGx5IHdpdGggdGhlIHJldmVyc2UgbWVudGlvbiB0byB3aG9ldmVyIHRyaWdnZXJlZCB0aGUgam9iLlxuICAgIGNvbnN0IHRyaWdnZXIgPSBtZXNzYWdlcy5maW5kKChtKSA9PiBtLmlkID09PSBqb2IubWVzc2FnZUlkKTtcbiAgICBhd2FpdCBjbGllbnQuY2FsbDxNZXNzYWdlPigncG9zdF9tZXNzYWdlJywge1xuICAgICAgdGhyZWFkSWQ6IGpvYi50aHJlYWRJZCxcbiAgICAgIGJvZHk6IHJlcGx5LFxuICAgICAgLi4uKHRyaWdnZXIgIT09IHVuZGVmaW5lZCA/IHsgbWVudGlvbnM6IFt0cmlnZ2VyLmF1dGhvcklkXSB9IDoge30pLFxuICAgIH0pO1xuXG4gICAgLy8gNyBcdTIwMTQgY29tcGxldGU6IG5vdGlmaWVzIHRoZSBtZW50aW9uZXI7IG5vdGhpbmcgZWxzZSBtb3ZlcyAoXHUwMEE3NS40KS5cbiAgICBhd2FpdCBjbGllbnQuY2FsbCgnY29tcGxldGVfYWdlbnRfam9iJywgeyBqb2JJZDogam9iLmlkLCBzdGF0dXM6ICdkb25lJyB9KTtcblxuICAgIC8vIDggXHUyMDE0IGxlYXJuIChzb2Z0KTogZXBpc29kaWMgbm90ZSwgc291cmNlLXNjb3BlZCB0byB0aGUgam9iJ3MgdGhyZWFkLlxuICAgIC8vIFRoZSBhZ2VudCByZWFkIHRoZSB0aHJlYWQgYWJvdmUsIHNvIHBhcnRpY2lwYXRpb24gYWxyZWFkeSBob2xkcyBmb3IgYVxuICAgIC8vIHByaXZhdGUgdGhyZWFkIFx1MjAxNCBidXQgYSBsZWFybmluZyBmYWlsdXJlIG11c3QgbmV2ZXIgdW5kbyB0aGUgcmVwbHkuXG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IGNsaWVudC5jYWxsKCdhcHBlbmRfYWdlbnRfbWVtb3J5Jywge1xuICAgICAgICBraW5kOiAnZXBpc29kaWMnLFxuICAgICAgICBjb250ZW50OiBgam9iICR7am9iLmlkfSBpbiB0aHJlYWQgJHtqb2IudGhyZWFkSWR9OiAke3JlcGx5LnNsaWNlKDAsIE1FTU9SWV9SRVBMWV9IRUFEKX1gLFxuICAgICAgICBzb3VyY2VUaHJlYWRJZDogam9iLnRocmVhZElkLFxuICAgICAgfSk7XG4gICAgfSBjYXRjaCB7XG4gICAgICAvKiBsZWFybmluZyBpcyBhZGRpdGl2ZSwgbmV2ZXIgbG9hZC1iZWFyaW5nICovXG4gICAgfVxuXG4gICAgcmV0dXJuIHsgaGFuZGxlZDogdHJ1ZSwgam9iSWQ6IGpvYi5pZCwgb3V0Y29tZTogJ2RvbmUnIH07XG4gIH0gZmluYWxseSB7XG4gICAgcm1TeW5jKGRpciwgeyByZWN1cnNpdmU6IHRydWUsIGZvcmNlOiB0cnVlIH0pO1xuICB9XG59XG5cbi8qKiBSdW4gdW50aWwgc3RvcHBlZDogcG9sbCBcdTIxOTIgcnVuSm9ic09uY2UgXHUyMTkyIHNsZWVwKHBvbGxNcykuIFNJR0lOVCBleGl0cyBjbGVhbmx5LiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGpvYnNMb29wKFxuICBvcHRpb25zOiBKb2JzUnVubmVyT3B0aW9ucyAmIHsgcG9sbE1zPzogbnVtYmVyOyBvbmNlPzogYm9vbGVhbiB9LFxuKTogUHJvbWlzZTx2b2lkPiB7XG4gIGxldCBzdG9wcGVkID0gZmFsc2U7XG4gIGxldCB3YWtlOiAoKCkgPT4gdm9pZCkgfCB1bmRlZmluZWQ7XG4gIGNvbnN0IG9uU2lnaW50ID0gKCk6IHZvaWQgPT4ge1xuICAgIHN0b3BwZWQgPSB0cnVlO1xuICAgIHdha2U/LigpO1xuICB9O1xuICBwcm9jZXNzLm9uY2UoJ1NJR0lOVCcsIG9uU2lnaW50KTtcbiAgdHJ5IHtcbiAgICBmb3IgKDs7KSB7XG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBydW5Kb2JzT25jZShvcHRpb25zKTtcbiAgICAgIGlmIChvcHRpb25zLm9uY2UgPT09IHRydWUgfHwgc3RvcHBlZCkgcmV0dXJuO1xuICAgICAgaWYgKCFyZXN1bHQuaGFuZGxlZCkge1xuICAgICAgICBhd2FpdCBuZXcgUHJvbWlzZTx2b2lkPigocmVzb2x2ZVNsZWVwKSA9PiB7XG4gICAgICAgICAgd2FrZSA9IHJlc29sdmVTbGVlcDtcbiAgICAgICAgICBzZXRUaW1lb3V0KHJlc29sdmVTbGVlcCwgb3B0aW9ucy5wb2xsTXMgPz8gMTVfMDAwKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHdha2UgPSB1bmRlZmluZWQ7XG4gICAgICAgIGlmIChzdG9wcGVkKSByZXR1cm47XG4gICAgICB9XG4gICAgfVxuICB9IGZpbmFsbHkge1xuICAgIHByb2Nlc3MucmVtb3ZlTGlzdGVuZXIoJ1NJR0lOVCcsIG9uU2lnaW50KTtcbiAgfVxufVxuIiwgIi8qKlxuICogQG9haHMvcnVubmVyIFx1MjAxNCB0aGUgQllPIHdvcmtlciBsb29wIChQaGFzZSAxIHN0b3J5IDE0KS5cbiAqXG4gKiBGSVhFRCBJTlRFUkZBQ0UgYmV0d2VlbiB0aGUgb2FocyBDTEkgKGBvYWhzIHdvcmtgKSBhbmQgdGhlIHJ1bm5lciBsaWJyYXJ5LlxuICogVGhlIENMSSB3aXJlcyBmbGFncy9lbnYgaW50byBSdW5uZXJPcHRpb25zIGFuZCBjYWxscyB3b3JrTG9vcC9ydW5PbmNlOyBhbGxcbiAqIHJ1bm5lciBsb2dpYyBsaXZlcyBoZXJlLlxuICpcbiAqIENvbnRyYWN0IChwcm9kdWN0LXJvYWRtYXAubWQgXHUwMEE3Mi4zKTpcbiAqICAxLiBwb2xsIGxpc3Rfd29ya19pdGVtcyhzdGF0ZT1yZWFkeV9mb3JfZGV2LCBjbGFpbWFibGUpIFx1MjE5MiBjbGFpbV90YXNrXG4gKiAgICAgKGNyYXNoIHJlLWRpc3BhdGNoOiBhbiBpbl9wcm9ncmVzcyBpdGVtIHdpdGggTk8gbGl2ZSBjbGFpbSBpcyBhIGRlYWRcbiAqICAgICB3b3JrZXIncyBydW4gXHUyMDE0IHBvbGxlZCBhcyBhIGZhbGxiYWNrIHNvIHJlY292ZXJ5IHVzZXMgdGhlIHNhbWUgbG9vcClcbiAqICAyLiB3b3JrdHJlZSBuYW1lZCBieSBjbGFpbSBpZDsgYnJhbmNoIGBjbGFpbS88Y2xhaW1JZD5gXG4gKiAgMy4gbWlycm9yLW9uLWRpc3BhdGNoOiBzdGFtcCBzcGVjIGZyb250bWF0dGVyIHRvIHRoZSBEQiBlbnRyeSBzdGF0ZVxuICogIDQuIGFkdmFuY2Vfc3RhdGUodG89aW5fcHJvZ3Jlc3MpIEJFRk9SRSB0aGUgYWdlbnQgcnVucyBcdTIwMTQgREIgaXMgdGhlIGVudHJ5IHN0YXRlXG4gKiAgNS4gaW52b2tlIHRoZSBjb2RpbmcgYWdlbnQgKHRlbXBsYXRlOyB1bm1vZGlmaWVkIGJtYWQtZGV2LWF1dG8gY29udGVudClcbiAqICA2LiBwYXJzZSBIQUxUICsgQXV0byBSdW4gUmVzdWx0IFx1MjE5MiBoYWx0X3JlcG9ydCBldmlkZW5jZSAodmVyYmF0aW0pXG4gKiAgNy4gcnVuIFBJTk5FRCB2ZXJpZmljYXRpb24gY29tbWFuZHMgb25seSAoYWxsb3dsaXN0ZWQpIFx1MjE5MiB0ZXN0X3J1biBldmlkZW5jZVxuICogIDguIHB1c2ggYnJhbmNoIFx1MjE5MiBnaXRfZGlmZiArIGNvbW1pdCBldmlkZW5jZSAocmVtb3RlIHJlYWNoYWJpbGl0eSBtZWFzdXJlZClcbiAqICA5LiBhZHZhbmNlX3N0YXRlIC8gYmxvY2tfdGFzayBwZXIgSEFMVCBzdGF0dXMgXHUyMDE0IHRoZSBjb3JlIGNvbXB1dGVzIHZlcmRpY3RzXG4gKiAxMC4gY3Jhc2ggcmVjb3Zlcnkgb24gcmUtY2xhaW06IGFkb3B0IGEgZGVjZW50bHktZmluaXNoZWQgd29ya3RyZWUgKHRlcm1pbmFsXG4gKiAgICAgZnJvbnRtYXR0ZXIgKyBhIHJlYWwgY29tbWl0IHBhc3QgaXRzIGJhc2VsaW5lKSB3aXRoIGxhdGUgZXZpZGVuY2VcbiAqICAgICBzdWJtaXNzaW9uOyBhIHdyZWNrZWQgd29ya3RyZWUgaXMgY2xlYW5lZCBhbmQgYmxvY2tlZCBgc3RhbGVfd29ya3RyZWVgLlxuICpcbiAqIEFnZW50IGludm9jYXRpb24gZW52aXJvbm1lbnQgKHBhcnQgb2YgdGhpcyBpbnRlcmZhY2UpOiB0aGUgYWdlbnQgY29tbWFuZFxuICogdGVtcGxhdGUgaXMgZXhwYW5kZWQgKHtTUEVDX0ZPTERFUn0ge1NUT1JZX0lEfSB7SU5WT0tFX1dJVEh9IHtXT1JLVFJFRX0pLFxuICogcnVuIHdpdGggY3dkID0gdGhlIGNsYWltIHdvcmt0cmVlLCBhbmQgcmVjZWl2ZXMgdHdvIGV4dHJhIGVudiB2YXJzOlxuICogICBPQUhTX1NQRUNfRklMRSBcdTIwMTQgYWJzb2x1dGUgcGF0aCBvZiB0aGUgc3Rvcnkgc3BlYyBmaWxlIGluc2lkZSB0aGUgd29ya3RyZWVcbiAqICAgT0FIU19TVE9SWV9JRCAgXHUyMDE0IHRoZSB3b3JrIGl0ZW0gZXh0ZXJuYWxLZXkgKHN0b3JpZXMueWFtbCBpZClcbiAqL1xuLy8gUGhhc2UgNCAocm9hZG1hcCBcdTAwQTcxLjQpOiB0aGUgZGV0ZXJtaW5pc3RpYyBkb2N1bWVudCBsaW50IGZvciBub24tY29kZSB3b3JrLlxuZXhwb3J0IHsgbGludERvYywgdHlwZSBEb2NMaW50UmVzdWx0LCB0eXBlIExpbnREb2NPcHRpb25zIH0gZnJvbSAnLi9kb2NsaW50LmpzJztcbi8vIFBoYXNlIDUgKHJvYWRtYXAgXHUwMEE3Nik6IHRoZSB0ZWFtbWF0ZSBKT0JTIHJ1bnRpbWUgXHUyMDE0IHJlcGx5LW9ubHkgYWdlbnQgam9ic1xuLy8gc2VydmVkIHRocm91Z2ggdGhlIHJhaWxzIHdpdGggbWVtb3J5IHJlY2FsbC9sZWFybmluZywgemVybyBsaWZlY3ljbGUgY2FsbHMuXG5leHBvcnQgeyBqb2JzTG9vcCwgcnVuSm9ic09uY2UsIHR5cGUgSm9ic09uY2VSZXN1bHQsIHR5cGUgSm9ic1J1bm5lck9wdGlvbnMgfSBmcm9tICcuL2pvYnMuanMnO1xuXG5pbXBvcnQgeyBzcGF3blN5bmMgfSBmcm9tICdub2RlOmNoaWxkX3Byb2Nlc3MnO1xuaW1wb3J0IHtcbiAgZXhpc3RzU3luYyxcbiAgbWtkaXJTeW5jLFxuICByZWFkZGlyU3luYyxcbiAgcmVhZEZpbGVTeW5jLFxuICBybVN5bmMsXG4gIHN0YXRTeW5jLFxuICB3cml0ZUZpbGVTeW5jLFxufSBmcm9tICdub2RlOmZzJztcbmltcG9ydCB7IGpvaW4sIHJlc29sdmUgfSBmcm9tICdub2RlOnBhdGgnO1xuaW1wb3J0IHsgcGFyc2UgYXMgcGFyc2VZYW1sIH0gZnJvbSAneWFtbCc7XG5pbXBvcnQgdHlwZSB7IE9haHNDbGllbnQgfSBmcm9tICdAb2Focy9jb250cmFjdHMnO1xuaW1wb3J0IHR5cGUgeyBCbG9ja2VkUmVhc29uLCBDbGFpbSwgRXZpZGVuY2UsIFdvcmtJdGVtLCBXb3JrSXRlbVN0YXRlIH0gZnJvbSAnQG9haHMvY29yZSc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgUnVubmVyT3B0aW9ucyB7XG4gIGNsaWVudDogT2Foc0NsaWVudDtcbiAgLyoqIEFic29sdXRlIHBhdGggb2YgdGhlIHRhcmdldCBwcm9qZWN0IGdpdCBjaGVja291dC4gKi9cbiAgcmVwb1BhdGg6IHN0cmluZztcbiAgLyoqIFNwZWMgZm9sZGVyIChyZWxhdGl2ZSB0byByZXBvIHJvb3QpIGhvbGRpbmcgU1BFQy5tZCArIHN0b3JpZXMueWFtbCArIHN0b3JpZXMvLiAqL1xuICBzcGVjRm9sZGVyOiBzdHJpbmc7XG4gIC8qKlxuICAgKiBDb2RpbmctYWdlbnQgY29tbWFuZCB0ZW1wbGF0ZS4gUGxhY2Vob2xkZXJzOiB7U1BFQ19GT0xERVJ9IHtTVE9SWV9JRH1cbiAgICoge0lOVk9LRV9XSVRIfSB7V09SS1RSRUV9LiBFeGVjdXRlZCB3aXRoIGN3ZCA9IHRoZSBjbGFpbSB3b3JrdHJlZS5cbiAgICovXG4gIGFnZW50Q21kOiBzdHJpbmc7XG4gIC8qKiBQb2xsIGludGVydmFsIGZvciB3b3JrTG9vcCAobXMpLiBEZWZhdWx0IDE1XzAwMC4gKi9cbiAgcG9sbE1zPzogbnVtYmVyO1xuICAvKiogQmluYXJpZXMgcGlubmVkIHZlcmlmaWNhdGlvbiBjb21tYW5kcyBtYXkgc3RhcnQgd2l0aC4gKi9cbiAgdmVyaWZpY2F0aW9uQWxsb3dsaXN0Pzogc3RyaW5nW107XG4gIC8qKiBHaXQgcmVtb3RlIHRvIHB1c2ggY2xhaW0gYnJhbmNoZXMgdG8uIERlZmF1bHQgJ29yaWdpbicuICovXG4gIHJlbW90ZT86IHN0cmluZztcbiAgLyoqIFRFU1QgT05MWTogZGllIGF0IGEgc3BlY2lmaWMgcG9pbnQgdG8gZXhlcmNpc2UgY3Jhc2ggcmVjb3ZlcnkuICovXG4gIGZhaWxwb2ludD86ICdiZWZvcmVfcmVwb3J0JztcbiAgLyoqIE1heCB3YWxsIHRpbWUgZm9yIG9uZSBhZ2VudCBpbnZvY2F0aW9uIChtcykuIERlZmF1bHQgMzAgbWludXRlcy4gKi9cbiAgYWdlbnRUaW1lb3V0TXM/OiBudW1iZXI7XG4gIC8qKiBFeHRyYSBlbnZpcm9ubWVudCB2YXJpYWJsZXMgcGFzc2VkIHRvIHRoZSBhZ2VudCBpbnZvY2F0aW9uLiAqL1xuICBhZ2VudEVudj86IFJlY29yZDxzdHJpbmcsIHN0cmluZz47XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUnVuT25jZVJlc3VsdCB7XG4gIGRpc3BhdGNoZWQ6IGJvb2xlYW47XG4gIHdvcmtJdGVtSWQ/OiBzdHJpbmc7XG4gIGV4dGVybmFsS2V5Pzogc3RyaW5nO1xuICBvdXRjb21lPzogJ2luX3JldmlldycgfCAnYmxvY2tlZCcgfCAnYWRvcHRlZF9pbl9yZXZpZXcnIHwgJ2NyYXNoZWQnO1xuICBkZXRhaWxzPzogc3RyaW5nO1xuICAvKiogQ2xhaW0gdGFrZW4gYnkgdGhpcyBydW4gKGJyYW5jaCBpcyBgY2xhaW0vPGNsYWltSWQ+YCkuICovXG4gIGNsYWltSWQ/OiBzdHJpbmc7XG4gIC8qKiBSYXcgZXZpZGVuY2Ugc3VibWl0dGVkIGR1cmluZyB0aGlzIHJ1biwgaW4gc3VibWlzc2lvbiBvcmRlci4gKi9cbiAgZXZpZGVuY2U/OiBFdmlkZW5jZVtdO1xufVxuXG4vKiogQmluYXJpZXMgYSBwaW5uZWQgdmVyaWZpY2F0aW9uIGNvbW1hbmQgbWF5IHN0YXJ0IHdpdGggKGZpcnN0IHRva2VuKS4gKi9cbmV4cG9ydCBjb25zdCBERUZBVUxUX1ZFUklGSUNBVElPTl9BTExPV0xJU1Q6IHJlYWRvbmx5IHN0cmluZ1tdID0gW1xuICAnbm9kZScsXG4gICducG0nLFxuICAncG5wbScsXG4gICducHgnLFxuICAncHl0ZXN0JyxcbiAgJ3B5dGhvbjMnLFxuICAnc2gnLFxuICAnYmFzaCcsXG4gICdnaXQnLFxuXTtcblxuLyoqIE1hcmtlciBkcm9wcGVkIGluIGV2ZXJ5IGNsYWltIHdvcmt0cmVlIHNvIGEgbGF0ZXIgY2xhaW0gY2FuIG1hcCBpdCBiYWNrLiAqL1xuY29uc3QgTUFSS0VSX0ZJTEUgPSAnLm9haHMtd29yay1pdGVtJztcblxuLyoqIERCIHN0YXRlIFx1MjE5MiBzcGVjLWZpbGUgZnJvbnRtYXR0ZXIgdm9jYWJ1bGFyeSAoZGV2LWF1dG8gZmlsZSBkaWFsZWN0KS4gKi9cbmNvbnN0IEVOVFJZX1NUQVRVUzogUmVhZG9ubHk8UGFydGlhbDxSZWNvcmQ8V29ya0l0ZW1TdGF0ZSwgc3RyaW5nPj4+ID0ge1xuICByZWFkeV9mb3JfZGV2OiAncmVhZHktZm9yLWRldicsXG4gIGluX3Byb2dyZXNzOiAnaW4tcHJvZ3Jlc3MnLFxuICBpbl9yZXZpZXc6ICdpbi1yZXZpZXcnLFxufTtcblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBnaXQgcGx1bWJpbmcgKGNoaWxkX3Byb2Nlc3Mgb25seSBcdTIwMTQgbm8gZXh0ZXJuYWwgZGVwcylcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4vKiogUnVuIGEgZ2l0IGNvbW1hbmQ7IHRocm93cyBvbiBub24temVybyBleGl0OyByZXR1cm5zIHRyaW1tZWQgc3Rkb3V0LiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdpdChhcmdzOiBzdHJpbmdbXSwgY3dkOiBzdHJpbmcpOiBzdHJpbmcge1xuICBjb25zdCByZXN1bHQgPSBzcGF3blN5bmMoJ2dpdCcsIGFyZ3MsIHsgY3dkLCBlbmNvZGluZzogJ3V0ZjgnIH0pO1xuICBpZiAocmVzdWx0LmVycm9yKSB0aHJvdyByZXN1bHQuZXJyb3I7XG4gIGlmIChyZXN1bHQuc3RhdHVzICE9PSAwKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgYGdpdCAke2FyZ3Muam9pbignICcpfSBmYWlsZWQgd2l0aCBleGl0ICR7U3RyaW5nKHJlc3VsdC5zdGF0dXMpfTogJHtyZXN1bHQuc3RkZXJyLnRyaW0oKX1gLFxuICAgICk7XG4gIH1cbiAgcmV0dXJuIHJlc3VsdC5zdGRvdXQudHJpbSgpO1xufVxuXG4vKipcbiAqIEtlZXAgcnVubmVyIGJvb2trZWVwaW5nIG91dCBvZiBhZ2VudCBjb21taXRzOiB0aGUgbWFya2VyIGZpbGUgYW5kIHRoZVxuICogd29ya3RyZWUgcm9vdCBhcmUgYWRkZWQgdG8gJEdJVF9DT01NT05fRElSL2luZm8vZXhjbHVkZSAoc2hhcmVkIGJ5IGFsbFxuICogd29ya3RyZWVzKSwgc28gYW4gYWdlbnQncyBgZ2l0IGFkZCAtQWAgbmV2ZXIgcGlja3MgdGhlbSB1cC5cbiAqL1xuZnVuY3Rpb24gZW5zdXJlR2l0RXhjbHVkZXMocmVwb1BhdGg6IHN0cmluZyk6IHZvaWQge1xuICBjb25zdCBnaXREaXIgPSBqb2luKHJlcG9QYXRoLCAnLmdpdCcpO1xuICB0cnkge1xuICAgIGlmICghc3RhdFN5bmMoZ2l0RGlyKS5pc0RpcmVjdG9yeSgpKSByZXR1cm47IC8vIHJlcG9QYXRoIGlzIGl0c2VsZiBhIHdvcmt0cmVlIFx1MjAxNCBza2lwXG4gIH0gY2F0Y2gge1xuICAgIHJldHVybjtcbiAgfVxuICBjb25zdCBpbmZvRGlyID0gam9pbihnaXREaXIsICdpbmZvJyk7XG4gIG1rZGlyU3luYyhpbmZvRGlyLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcbiAgY29uc3QgZXhjbHVkZVBhdGggPSBqb2luKGluZm9EaXIsICdleGNsdWRlJyk7XG4gIGNvbnN0IGN1cnJlbnQgPSBleGlzdHNTeW5jKGV4Y2x1ZGVQYXRoKSA/IHJlYWRGaWxlU3luYyhleGNsdWRlUGF0aCwgJ3V0ZjgnKSA6ICcnO1xuICBjb25zdCB3YW50ZWQgPSBbJy5vYWhzLycsIE1BUktFUl9GSUxFXTtcbiAgY29uc3QgaGF2ZSA9IG5ldyBTZXQoY3VycmVudC5zcGxpdCgnXFxuJykubWFwKChsaW5lKSA9PiBsaW5lLnRyaW0oKSkpO1xuICBjb25zdCBtaXNzaW5nID0gd2FudGVkLmZpbHRlcigobGluZSkgPT4gIWhhdmUuaGFzKGxpbmUpKTtcbiAgaWYgKG1pc3NpbmcubGVuZ3RoID09PSAwKSByZXR1cm47XG4gIGNvbnN0IHByZWZpeCA9IGN1cnJlbnQgPT09ICcnIHx8IGN1cnJlbnQuZW5kc1dpdGgoJ1xcbicpID8gY3VycmVudCA6IGAke2N1cnJlbnR9XFxuYDtcbiAgd3JpdGVGaWxlU3luYyhleGNsdWRlUGF0aCwgYCR7cHJlZml4fSR7bWlzc2luZy5qb2luKCdcXG4nKX1cXG5gLCAndXRmOCcpO1xufVxuXG5mdW5jdGlvbiByZW1vdmVXb3JrdHJlZShkaXI6IHN0cmluZywgcmVwb1BhdGg6IHN0cmluZyk6IHZvaWQge1xuICB0cnkge1xuICAgIGdpdChbJ3dvcmt0cmVlJywgJ3JlbW92ZScsICctLWZvcmNlJywgZGlyXSwgcmVwb1BhdGgpO1xuICB9IGNhdGNoIHtcbiAgICB0cnkge1xuICAgICAgcm1TeW5jKGRpciwgeyByZWN1cnNpdmU6IHRydWUsIGZvcmNlOiB0cnVlIH0pO1xuICAgICAgZ2l0KFsnd29ya3RyZWUnLCAncHJ1bmUnXSwgcmVwb1BhdGgpO1xuICAgIH0gY2F0Y2gge1xuICAgICAgLyogYmVzdCBlZmZvcnQgXHUyMDE0IGEgbGVmdG92ZXIgZGlyIGlzIHJlLWRldGVjdGVkIGFzIGEgc3RhbGUgd29ya3RyZWUgKi9cbiAgICB9XG4gIH1cbn1cblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBXb3JrdHJlZSBtYXJrZXIgKGNyYXNoLXJlY292ZXJ5IGJvb2trZWVwaW5nKVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbmludGVyZmFjZSBXb3JrdHJlZU1hcmtlciB7XG4gIHdvcmtJdGVtSWQ6IHN0cmluZztcbiAgY2xhaW1JZDogc3RyaW5nO1xuICBiYXNlbGluZTogc3RyaW5nO1xuICAvKiogSG93IG1hbnkgdGltZXMgYW4gYWdlbnQgd2FzIGludm9rZWQgaW5zaWRlIHRoaXMgd29ya3RyZWUuICovXG4gIGludm9jYXRpb25zOiBudW1iZXI7XG59XG5cbmZ1bmN0aW9uIHdyaXRlTWFya2VyKHdvcmt0cmVlRGlyOiBzdHJpbmcsIG1hcmtlcjogV29ya3RyZWVNYXJrZXIpOiB2b2lkIHtcbiAgd3JpdGVGaWxlU3luYyhqb2luKHdvcmt0cmVlRGlyLCBNQVJLRVJfRklMRSksIGAke0pTT04uc3RyaW5naWZ5KG1hcmtlciwgbnVsbCwgMil9XFxuYCwgJ3V0ZjgnKTtcbn1cblxuZnVuY3Rpb24gcmVhZE1hcmtlcih3b3JrdHJlZURpcjogc3RyaW5nKTogV29ya3RyZWVNYXJrZXIgfCBudWxsIHtcbiAgY29uc3QgcGF0aCA9IGpvaW4od29ya3RyZWVEaXIsIE1BUktFUl9GSUxFKTtcbiAgaWYgKCFleGlzdHNTeW5jKHBhdGgpKSByZXR1cm4gbnVsbDtcbiAgdHJ5IHtcbiAgICBjb25zdCByYXcgPSBKU09OLnBhcnNlKHJlYWRGaWxlU3luYyhwYXRoLCAndXRmOCcpKSBhcyBQYXJ0aWFsPFdvcmt0cmVlTWFya2VyPjtcbiAgICBpZiAodHlwZW9mIHJhdy53b3JrSXRlbUlkICE9PSAnc3RyaW5nJyB8fCB0eXBlb2YgcmF3LmJhc2VsaW5lICE9PSAnc3RyaW5nJykgcmV0dXJuIG51bGw7XG4gICAgcmV0dXJuIHtcbiAgICAgIHdvcmtJdGVtSWQ6IHJhdy53b3JrSXRlbUlkLFxuICAgICAgY2xhaW1JZDogdHlwZW9mIHJhdy5jbGFpbUlkID09PSAnc3RyaW5nJyA/IHJhdy5jbGFpbUlkIDogJycsXG4gICAgICBiYXNlbGluZTogcmF3LmJhc2VsaW5lLFxuICAgICAgaW52b2NhdGlvbnM6IHR5cGVvZiByYXcuaW52b2NhdGlvbnMgPT09ICdudW1iZXInID8gcmF3Lmludm9jYXRpb25zIDogMCxcbiAgICB9O1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufVxuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIFNwZWMgZmlsZSByZWFkaW5nIChmcm9udG1hdHRlciArIEhBTFQgcmVwb3J0KVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbmludGVyZmFjZSBTcGVjUmVwb3J0IHtcbiAgc3RhdHVzOiBzdHJpbmcgfCBudWxsO1xuICBibG9ja2luZ0NvbmRpdGlvbjogc3RyaW5nIHwgbnVsbDtcbiAgYXV0b1J1blJlc3VsdDogc3RyaW5nIHwgbnVsbDtcbn1cblxuZnVuY3Rpb24gc3BsaXRGcm9udG1hdHRlcihyYXc6IHN0cmluZyk6IHsgZGF0YTogUmVjb3JkPHN0cmluZywgdW5rbm93bj47IGJvZHk6IHN0cmluZyB9IHtcbiAgaWYgKCFyYXcuc3RhcnRzV2l0aCgnLS0tJykpIHJldHVybiB7IGRhdGE6IHt9LCBib2R5OiByYXcgfTtcbiAgY29uc3QgY2xvc2UgPSByYXcuaW5kZXhPZignXFxuLS0tJywgMyk7XG4gIGlmIChjbG9zZSA9PT0gLTEpIHJldHVybiB7IGRhdGE6IHt9LCBib2R5OiByYXcgfTtcbiAgY29uc3QgZmlyc3ROZXdsaW5lID0gcmF3LmluZGV4T2YoJ1xcbicpO1xuICBjb25zdCBibG9jayA9IHJhdy5zbGljZShmaXJzdE5ld2xpbmUgKyAxLCBjbG9zZSk7XG4gIGNvbnN0IGJvZHlTdGFydCA9IHJhdy5pbmRleE9mKCdcXG4nLCBjbG9zZSArIDEpO1xuICBjb25zdCBib2R5ID0gYm9keVN0YXJ0ID09PSAtMSA/ICcnIDogcmF3LnNsaWNlKGJvZHlTdGFydCArIDEpO1xuICBsZXQgZGF0YTogdW5rbm93biA9IHt9O1xuICB0cnkge1xuICAgIGRhdGEgPSBwYXJzZVlhbWwoYmxvY2spO1xuICB9IGNhdGNoIHtcbiAgICBkYXRhID0ge307XG4gIH1cbiAgY29uc3QgcmVjb3JkID1cbiAgICB0eXBlb2YgZGF0YSA9PT0gJ29iamVjdCcgJiYgZGF0YSAhPT0gbnVsbCAmJiAhQXJyYXkuaXNBcnJheShkYXRhKVxuICAgICAgPyAoZGF0YSBhcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPilcbiAgICAgIDoge307XG4gIHJldHVybiB7IGRhdGE6IHJlY29yZCwgYm9keSB9O1xufVxuXG4vKiogVmVyYmF0aW0gJyMjIEF1dG8gUnVuIFJlc3VsdCcgc2VjdGlvbiAoaGVhZGluZyBpbmNsdWRlZCksIHVwIHRvIHRoZSBuZXh0IEgyLiAqL1xuZnVuY3Rpb24gZXh0cmFjdEF1dG9SdW5SZXN1bHQoYm9keTogc3RyaW5nKTogc3RyaW5nIHwgbnVsbCB7XG4gIGNvbnN0IGxpbmVzID0gYm9keS5zcGxpdCgnXFxuJyk7XG4gIGNvbnN0IHN0YXJ0ID0gbGluZXMuZmluZEluZGV4KChsaW5lKSA9PiAvXiMjXFxzK2F1dG8gcnVuIHJlc3VsdFxccyokL2kudGVzdChsaW5lLnRyaW0oKSkpO1xuICBpZiAoc3RhcnQgPT09IC0xKSByZXR1cm4gbnVsbDtcbiAgbGV0IGVuZCA9IGxpbmVzLmxlbmd0aDtcbiAgZm9yIChsZXQgaSA9IHN0YXJ0ICsgMTsgaSA8IGxpbmVzLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgY29uc3QgbGluZSA9IGxpbmVzW2ldO1xuICAgIGlmIChsaW5lICE9PSB1bmRlZmluZWQgJiYgL14jI1xccysvLnRlc3QobGluZSkpIHtcbiAgICAgIGVuZCA9IGk7XG4gICAgICBicmVhaztcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGxpbmVzLnNsaWNlKHN0YXJ0LCBlbmQpLmpvaW4oJ1xcbicpLnRyaW1FbmQoKTtcbn1cblxuZnVuY3Rpb24gcmVhZFNwZWNSZXBvcnQoc3BlY0Fic1BhdGg6IHN0cmluZyk6IFNwZWNSZXBvcnQge1xuICBpZiAoIWV4aXN0c1N5bmMoc3BlY0Fic1BhdGgpKSB7XG4gICAgcmV0dXJuIHsgc3RhdHVzOiBudWxsLCBibG9ja2luZ0NvbmRpdGlvbjogbnVsbCwgYXV0b1J1blJlc3VsdDogbnVsbCB9O1xuICB9XG4gIGNvbnN0IHsgZGF0YSwgYm9keSB9ID0gc3BsaXRGcm9udG1hdHRlcihyZWFkRmlsZVN5bmMoc3BlY0Fic1BhdGgsICd1dGY4JykpO1xuICBjb25zdCBzdGF0dXNSYXcgPSBkYXRhWydzdGF0dXMnXTtcbiAgY29uc3Qgc3RhdHVzID1cbiAgICB0eXBlb2Ygc3RhdHVzUmF3ID09PSAnc3RyaW5nJyA/IHN0YXR1c1JhdyA6IHN0YXR1c1JhdyAhPSBudWxsID8gU3RyaW5nKHN0YXR1c1JhdykgOiBudWxsO1xuICBjb25zdCBhdXRvUnVuUmVzdWx0ID0gZXh0cmFjdEF1dG9SdW5SZXN1bHQoYm9keSk7XG4gIGxldCBibG9ja2luZ0NvbmRpdGlvbiA9XG4gICAgdHlwZW9mIGRhdGFbJ2Jsb2NraW5nX2NvbmRpdGlvbiddID09PSAnc3RyaW5nJyA/IGRhdGFbJ2Jsb2NraW5nX2NvbmRpdGlvbiddIDogbnVsbDtcbiAgaWYgKGJsb2NraW5nQ29uZGl0aW9uID09PSBudWxsICYmIGF1dG9SdW5SZXN1bHQgIT09IG51bGwpIHtcbiAgICBjb25zdCBtYXRjaCA9IC9eYmxvY2tpbmcgY29uZGl0aW9uOlxccyooLispJC9pbS5leGVjKGF1dG9SdW5SZXN1bHQpO1xuICAgIGJsb2NraW5nQ29uZGl0aW9uID0gbWF0Y2g/LlsxXT8udHJpbSgpID8/IG51bGw7XG4gIH1cbiAgcmV0dXJuIHsgc3RhdHVzLCBibG9ja2luZ0NvbmRpdGlvbiwgYXV0b1J1blJlc3VsdCB9O1xufVxuXG4vKiogUmV3cml0ZSAob3IgaW5zZXJ0KSB0aGUgZnJvbnRtYXR0ZXIgYHN0YXR1czpgIGxpbmUsIHByZXNlcnZpbmcgZXZlcnl0aGluZyBlbHNlLiAqL1xuZnVuY3Rpb24gc2V0RnJvbnRtYXR0ZXJTdGF0dXMoc3BlY0Fic1BhdGg6IHN0cmluZywgc3RhdHVzOiBzdHJpbmcpOiB2b2lkIHtcbiAgY29uc3QgcmF3ID0gcmVhZEZpbGVTeW5jKHNwZWNBYnNQYXRoLCAndXRmOCcpO1xuICBpZiAocmF3LnN0YXJ0c1dpdGgoJy0tLScpKSB7XG4gICAgY29uc3QgY2xvc2UgPSByYXcuaW5kZXhPZignXFxuLS0tJywgMyk7XG4gICAgaWYgKGNsb3NlICE9PSAtMSkge1xuICAgICAgY29uc3QgaGVhZCA9IHJhdy5zbGljZSgwLCBjbG9zZSk7XG4gICAgICBjb25zdCByZXN0ID0gcmF3LnNsaWNlKGNsb3NlKTtcbiAgICAgIGNvbnN0IHJlcGxhY2VkID0gL15zdGF0dXM6LiokL20udGVzdChoZWFkKVxuICAgICAgICA/IGhlYWQucmVwbGFjZSgvXnN0YXR1czouKiQvbSwgYHN0YXR1czogJHtzdGF0dXN9YClcbiAgICAgICAgOiBgJHtoZWFkfVxcbnN0YXR1czogJHtzdGF0dXN9YDtcbiAgICAgIHdyaXRlRmlsZVN5bmMoc3BlY0Fic1BhdGgsIHJlcGxhY2VkICsgcmVzdCwgJ3V0ZjgnKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gIH1cbiAgd3JpdGVGaWxlU3luYyhzcGVjQWJzUGF0aCwgYC0tLVxcbnN0YXR1czogJHtzdGF0dXN9XFxuLS0tXFxuJHtyYXd9YCwgJ3V0ZjgnKTtcbn1cblxuZnVuY3Rpb24gbm9ybWFsaXplU3RhdHVzKHN0YXR1czogc3RyaW5nIHwgbnVsbCk6IHN0cmluZyB8IG51bGwge1xuICBpZiAoc3RhdHVzID09PSBudWxsKSByZXR1cm4gbnVsbDtcbiAgY29uc3QgZmxhdCA9IHN0YXR1cy50cmltKCkudG9Mb3dlckNhc2UoKS5yZXBsYWNlQWxsKCctJywgJ18nKTtcbiAgcmV0dXJuIGZsYXQgPT09ICdyZXZpZXcnID8gJ2luX3JldmlldycgOiBmbGF0O1xufVxuXG4vKiogZGV2LWF1dG8gSEFMVCBibG9ja2luZyBjb25kaXRpb24gXHUyMTkyIEJMT0NLRURfUkVBU09OUyB0YXhvbm9teSAoZGVmYXVsdCAnb3RoZXInKS4gKi9cbmZ1bmN0aW9uIG1hcEJsb2NraW5nQ29uZGl0aW9uKGNvbmRpdGlvbjogc3RyaW5nIHwgbnVsbCk6IEJsb2NrZWRSZWFzb24ge1xuICBpZiAoY29uZGl0aW9uID09PSBudWxsKSByZXR1cm4gJ290aGVyJztcbiAgY29uc3QgYyA9IGNvbmRpdGlvbi50b0xvd2VyQ2FzZSgpO1xuICBpZiAoYy5pbmNsdWRlcygncmV2aWV3IHJlcGFpciBsb29wIGV4Y2VlZGVkJykpIHJldHVybiAncmV2aWV3X25vbl9jb252ZXJnZW5jZSc7XG4gIGlmIChjLmluY2x1ZGVzKCd1bmNsZWFyIGludGVudCcpKSByZXR1cm4gJ3VuY2xlYXJfaW50ZW50JztcbiAgaWYgKGMuaW5jbHVkZXMoJ25vIHN0b3JpZXMueWFtbCcpKSByZXR1cm4gJ25vX3N0b3JpZXNfeWFtbF9mb3VuZCc7XG4gIGlmIChjLmluY2x1ZGVzKCdhbWJpZ3VvdXMgc3RvcnkgZmlsZSBtYXRjaCcpKSByZXR1cm4gJ2FtYmlndW91c19zdG9yeV9maWxlX21hdGNoJztcbiAgaWYgKGMuaW5jbHVkZXMoJ25vIHN1YmFnZW50cycpKSByZXR1cm4gJ25vX3N1YmFnZW50cyc7XG4gIHJldHVybiAnb3RoZXInO1xufVxuXG5mdW5jdGlvbiBpc1JlbW90ZUVycm9yKGVycm9yOiB1bmtub3duLCBuYW1lOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgcmV0dXJuIChcbiAgICB0eXBlb2YgZXJyb3IgPT09ICdvYmplY3QnICYmXG4gICAgZXJyb3IgIT09IG51bGwgJiZcbiAgICAoZXJyb3IgYXMgeyBlcnJvck5hbWU/OiB1bmtub3duIH0pLmVycm9yTmFtZSA9PT0gbmFtZVxuICApO1xufVxuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIFN0ZXBzIDZcdTIwMTM5OiBtZWFzdXJlLCBzdWJtaXQgcmF3IGV2aWRlbmNlLCByb3V0ZSBieSBIQUxUIHN0YXR1c1xuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbmludGVyZmFjZSBGaW5pc2hBcmdzIHtcbiAgY2xpZW50OiBPYWhzQ2xpZW50O1xuICB3b3JrSXRlbTogV29ya0l0ZW07XG4gIGNsYWltOiBDbGFpbTtcbiAgLyoqIERpcmVjdG9yeSBob2xkaW5nIHRoZSBydW4ncyBmaWxlcyAoZnJlc2ggd29ya3RyZWUsIG9yIHRoZSBhZG9wdGVkIG9uZSkuICovXG4gIHdvcmtEaXI6IHN0cmluZztcbiAgLyoqIFNwZWMgZmlsZSBwYXRoIHJlbGF0aXZlIHRvIHRoZSByZXBvIHJvb3QuICovXG4gIHNwZWNSZWw6IHN0cmluZztcbiAgYmFzZWxpbmU6IHN0cmluZztcbiAgYnJhbmNoOiBzdHJpbmc7XG4gIHJlcG9QYXRoOiBzdHJpbmc7XG4gIHJlbW90ZTogc3RyaW5nO1xuICBhbGxvd2xpc3Q6IHJlYWRvbmx5IHN0cmluZ1tdO1xuICAvKiogbnVsbCB3aGVuIGFkb3B0aW5nICh0aGUgYWdlbnQgd2FzIGludm9rZWQgYnkgdGhlIGNyYXNoZWQgcnVuKS4gKi9cbiAgYWdlbnRFeGl0Q29kZTogbnVtYmVyIHwgbnVsbDtcbiAgc3VibWl0OiAoa2luZDogRXZpZGVuY2VbJ2tpbmQnXSwgcGF5bG9hZDogUmVjb3JkPHN0cmluZywgdW5rbm93bj4pID0+IFByb21pc2U8dm9pZD47XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGZpbmlzaFJ1bihhcmdzOiBGaW5pc2hBcmdzKTogUHJvbWlzZTwnaW5fcmV2aWV3JyB8ICdibG9ja2VkJz4ge1xuICBjb25zdCB7IGNsaWVudCwgd29ya0l0ZW0sIGNsYWltIH0gPSBhcmdzO1xuXG4gIC8vIDYgXHUyMDE0IHBhcnNlIEhBTFQ6IGZyb250bWF0dGVyIHN0YXR1cyArIHZlcmJhdGltIEF1dG8gUnVuIFJlc3VsdC5cbiAgY29uc3Qgc3BlYyA9IHJlYWRTcGVjUmVwb3J0KGpvaW4oYXJncy53b3JrRGlyLCBhcmdzLnNwZWNSZWwpKTtcbiAgYXdhaXQgYXJncy5zdWJtaXQoJ2hhbHRfcmVwb3J0Jywge1xuICAgIHN0YXR1czogc3BlYy5zdGF0dXMsXG4gICAgYmxvY2tpbmdDb25kaXRpb246IHNwZWMuYmxvY2tpbmdDb25kaXRpb24sXG4gICAgYXV0b1J1blJlc3VsdDogc3BlYy5hdXRvUnVuUmVzdWx0LFxuICAgIGFnZW50RXhpdENvZGU6IGFyZ3MuYWdlbnRFeGl0Q29kZSxcbiAgfSk7XG5cbiAgLy8gNyBcdTIwMTQgcGlubmVkIHZlcmlmaWNhdGlvbiBvbmx5OyB0aGUgYWxsb3dsaXN0IGdhdGVzIHdoYXQgZXZlciBnZXRzIGV4ZWN1dGVkLlxuICBmb3IgKGNvbnN0IGNvbW1hbmQgb2Ygd29ya0l0ZW0ucGlubmVkVmVyaWZpY2F0aW9uID8/IFtdKSB7XG4gICAgY29uc3QgYmluYXJ5ID0gY29tbWFuZC50cmltKCkuc3BsaXQoL1xccysvKVswXSA/PyAnJztcbiAgICBpZiAoIWFyZ3MuYWxsb3dsaXN0LmluY2x1ZGVzKGJpbmFyeSkpIHtcbiAgICAgIGF3YWl0IGFyZ3Muc3VibWl0KCd0ZXN0X3J1bicsIHsgY29tbWFuZCwgZXhpdENvZGU6IC0xLCByZWZ1c2VkOiB0cnVlIH0pO1xuICAgICAgY29udGludWU7XG4gICAgfVxuICAgIGNvbnN0IHJ1biA9IHNwYXduU3luYygnYmFzaCcsIFsnLWMnLCBjb21tYW5kXSwge1xuICAgICAgY3dkOiBhcmdzLndvcmtEaXIsXG4gICAgICBlbmNvZGluZzogJ3V0ZjgnLFxuICAgICAgdGltZW91dDogMTAgKiA2MCAqIDEwMDAsXG4gICAgfSk7XG4gICAgYXdhaXQgYXJncy5zdWJtaXQoJ3Rlc3RfcnVuJywgeyBjb21tYW5kLCBleGl0Q29kZTogcnVuLnN0YXR1cyA/PyAtMSB9KTtcbiAgfVxuXG4gIC8vIDggXHUyMDE0IGRpZmYgKyBwdXNoICsgY29tbWl0IGV2aWRlbmNlIChtZWFzdXJlZCwgbmV2ZXIganVkZ2VkIGhlcmUpLlxuICBjb25zdCBmaW5hbCA9IGdpdChbJ3Jldi1wYXJzZScsICdIRUFEJ10sIGFyZ3Mud29ya0Rpcik7XG4gIGNvbnN0IHNob3J0c3RhdCA9XG4gICAgZmluYWwgPT09IGFyZ3MuYmFzZWxpbmVcbiAgICAgID8gJydcbiAgICAgIDogZ2l0KFsnZGlmZicsICctLXNob3J0c3RhdCcsIGAke2FyZ3MuYmFzZWxpbmV9Li4ke2ZpbmFsfWBdLCBhcmdzLndvcmtEaXIpO1xuICBjb25zdCBmaWxlc0NoYW5nZWQgPSBOdW1iZXIoLyhcXGQrKSBmaWxlcz8gY2hhbmdlZC8uZXhlYyhzaG9ydHN0YXQpPy5bMV0gPz8gJzAnKTtcbiAgYXdhaXQgYXJncy5zdWJtaXQoJ2dpdF9kaWZmJywge1xuICAgIGJhc2VsaW5lOiBhcmdzLmJhc2VsaW5lLFxuICAgIGZpbmFsLFxuICAgIGZpbGVzQ2hhbmdlZCxcbiAgICBub25FbXB0eTogZmlsZXNDaGFuZ2VkID4gMCxcbiAgICBicmFuY2g6IGFyZ3MuYnJhbmNoLFxuICB9KTtcblxuICBnaXQoWydwdXNoJywgYXJncy5yZW1vdGUsIGFyZ3MuYnJhbmNoXSwgYXJncy5yZXBvUGF0aCk7XG4gIGNvbnN0IGxzUmVtb3RlID0gZ2l0KFsnbHMtcmVtb3RlJywgYXJncy5yZW1vdGUsIGByZWZzL2hlYWRzLyR7YXJncy5icmFuY2h9YF0sIGFyZ3MucmVwb1BhdGgpO1xuICBhd2FpdCBhcmdzLnN1Ym1pdCgnY29tbWl0Jywge1xuICAgIHNoYTogZmluYWwsXG4gICAgYnJhbmNoOiBhcmdzLmJyYW5jaCxcbiAgICByZWFjaGFibGVPblJlbW90ZTogbHNSZW1vdGUuaW5jbHVkZXMoZmluYWwpLFxuICB9KTtcblxuICAvLyA5IFx1MjAxNCByb3V0aW5nOiB0aGUgZmlsZSBzYXlzIHdoYXQgdGhlIGFnZW50IGNsYWltczsgdGhlIGNvcmUgZGVjaWRlcy5cbiAgY29uc3Qgc3RhdHVzID0gbm9ybWFsaXplU3RhdHVzKHNwZWMuc3RhdHVzKTtcbiAgY29uc3QgdG9rZW4gPSBjbGFpbS5mZW5jaW5nVG9rZW47XG4gIGlmIChzdGF0dXMgPT09ICdibG9ja2VkJykge1xuICAgIGF3YWl0IGNsaWVudC5jYWxsKCdibG9ja190YXNrJywge1xuICAgICAgd29ya0l0ZW1JZDogd29ya0l0ZW0uaWQsXG4gICAgICByZWFzb246IG1hcEJsb2NraW5nQ29uZGl0aW9uKHNwZWMuYmxvY2tpbmdDb25kaXRpb24pLFxuICAgICAgZmVuY2luZ1Rva2VuOiB0b2tlbixcbiAgICB9KTtcbiAgICBhd2FpdCBjbGllbnQuY2FsbCgncmVsZWFzZV9jbGFpbScsIHsgY2xhaW1JZDogY2xhaW0uaWQsIHJlYXNvbjogJ3J1biBibG9ja2VkJyB9KTtcbiAgICByZXR1cm4gJ2Jsb2NrZWQnO1xuICB9XG4gIGNvbnN0IGhhc0NvbW1pdCA9IGZpbmFsICE9PSBhcmdzLmJhc2VsaW5lO1xuICBpZiAoc3RhdHVzID09PSAnZG9uZScgfHwgc3RhdHVzID09PSAnaW5fcmV2aWV3JyB8fCAoc3RhdHVzID09PSAnaW5fcHJvZ3Jlc3MnICYmIGhhc0NvbW1pdCkpIHtcbiAgICBhd2FpdCBjbGllbnQuY2FsbCgnYWR2YW5jZV9zdGF0ZScsIHtcbiAgICAgIHdvcmtJdGVtSWQ6IHdvcmtJdGVtLmlkLFxuICAgICAgdG86ICdpbl9yZXZpZXcnLFxuICAgICAgZmVuY2luZ1Rva2VuOiB0b2tlbixcbiAgICB9KTtcbiAgICBhd2FpdCBjbGllbnQuY2FsbCgncmVsZWFzZV9jbGFpbScsIHsgY2xhaW1JZDogY2xhaW0uaWQsIHJlYXNvbjogJ3J1biBmaW5pc2hlZCcgfSk7XG4gICAgcmV0dXJuICdpbl9yZXZpZXcnO1xuICB9XG4gIC8vIEFnZW50IGV4aXRlZCBub24temVybyB3aXRoIG5vIHJlYWRhYmxlIEhBTFQgc3RhdHVzLCBvciBhbiB1bmtub3duIHN0YXR1cy5cbiAgYXdhaXQgY2xpZW50LmNhbGwoJ2Jsb2NrX3Rhc2snLCB7IHdvcmtJdGVtSWQ6IHdvcmtJdGVtLmlkLCByZWFzb246ICdvdGhlcicsIGZlbmNpbmdUb2tlbjogdG9rZW4gfSk7XG4gIGF3YWl0IGNsaWVudC5jYWxsKCdyZWxlYXNlX2NsYWltJywge1xuICAgIGNsYWltSWQ6IGNsYWltLmlkLFxuICAgIHJlYXNvbjogJ3J1biBmYWlsZWQgd2l0aG91dCBhIHJlYWRhYmxlIEhBTFQnLFxuICB9KTtcbiAgcmV0dXJuICdibG9ja2VkJztcbn1cblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBDcmFzaC1yZWNvdmVyeSBzY2FuIChzdGVwIDEwKVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbmludGVyZmFjZSBXb3JrdHJlZVNjYW4ge1xuICBhZG9wdGFibGU6IHsgZGlyOiBzdHJpbmc7IGhlYWQ6IHN0cmluZzsgYmFzZWxpbmU6IHN0cmluZyB9IHwgbnVsbDtcbiAgd3JlY2tlZDogc3RyaW5nW107XG59XG5cbmZ1bmN0aW9uIHNjYW5PbGRXb3JrdHJlZXMocm9vdDogc3RyaW5nLCB3b3JrSXRlbUlkOiBzdHJpbmcsIHNwZWNSZWw6IHN0cmluZyk6IFdvcmt0cmVlU2NhbiB7XG4gIGNvbnN0IHNjYW46IFdvcmt0cmVlU2NhbiA9IHsgYWRvcHRhYmxlOiBudWxsLCB3cmVja2VkOiBbXSB9O1xuICBpZiAoIWV4aXN0c1N5bmMocm9vdCkpIHJldHVybiBzY2FuO1xuICBmb3IgKGNvbnN0IG5hbWUgb2YgcmVhZGRpclN5bmMocm9vdCkpIHtcbiAgICBjb25zdCBkaXIgPSBqb2luKHJvb3QsIG5hbWUpO1xuICAgIGNvbnN0IG1hcmtlciA9IHJlYWRNYXJrZXIoZGlyKTtcbiAgICBpZiAobWFya2VyID09PSBudWxsIHx8IG1hcmtlci53b3JrSXRlbUlkICE9PSB3b3JrSXRlbUlkKSBjb250aW51ZTtcbiAgICBsZXQgaGVhZDogc3RyaW5nIHwgbnVsbCA9IG51bGw7XG4gICAgdHJ5IHtcbiAgICAgIGhlYWQgPSBnaXQoWydyZXYtcGFyc2UnLCAnSEVBRCddLCBkaXIpO1xuICAgIH0gY2F0Y2gge1xuICAgICAgaGVhZCA9IG51bGw7XG4gICAgfVxuICAgIGNvbnN0IHN0YXR1cyA9IG5vcm1hbGl6ZVN0YXR1cyhyZWFkU3BlY1JlcG9ydChqb2luKGRpciwgc3BlY1JlbCkpLnN0YXR1cyk7XG4gICAgY29uc3QgdGVybWluYWwgPSBzdGF0dXMgPT09ICdkb25lJyB8fCBzdGF0dXMgPT09ICdpbl9yZXZpZXcnO1xuICAgIGlmIChzY2FuLmFkb3B0YWJsZSA9PT0gbnVsbCAmJiBoZWFkICE9PSBudWxsICYmIGhlYWQgIT09IG1hcmtlci5iYXNlbGluZSAmJiB0ZXJtaW5hbCkge1xuICAgICAgc2Nhbi5hZG9wdGFibGUgPSB7IGRpciwgaGVhZCwgYmFzZWxpbmU6IG1hcmtlci5iYXNlbGluZSB9O1xuICAgIH0gZWxzZSB7XG4gICAgICBzY2FuLndyZWNrZWQucHVzaChkaXIpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gc2Nhbjtcbn1cblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBydW5PbmNlIFx1MjAxNCBvbmUgZnVsbCBkaXNwYXRjaCBjeWNsZVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBydW5PbmNlKG9wdGlvbnM6IFJ1bm5lck9wdGlvbnMpOiBQcm9taXNlPFJ1bk9uY2VSZXN1bHQ+IHtcbiAgY29uc3QgeyBjbGllbnQgfSA9IG9wdGlvbnM7XG4gIGNvbnN0IHJlcG9QYXRoID0gcmVzb2x2ZShvcHRpb25zLnJlcG9QYXRoKTtcbiAgY29uc3QgcmVtb3RlID0gb3B0aW9ucy5yZW1vdGUgPz8gJ29yaWdpbic7XG4gIGNvbnN0IGFsbG93bGlzdCA9IG9wdGlvbnMudmVyaWZpY2F0aW9uQWxsb3dsaXN0ID8/IERFRkFVTFRfVkVSSUZJQ0FUSU9OX0FMTE9XTElTVDtcblxuICAvLyAxIFx1MjAxNCBwb2xsLiBPcmRlciBvZiB0aGUgQVBJIHJlc3BvbnNlID0gaW1wb3J0IG9yZGVyOyB0YWtlIHRoZSBmaXJzdC5cbiAgLy8gRmFsbGJhY2s6IGFuIGluX3Byb2dyZXNzIGl0ZW0gd2l0aCBubyBsaXZlIGNsYWltIGlzIGEgY3Jhc2hlZCBkaXNwYXRjaC5cbiAgY29uc3QgbGlzdFVuYmxvY2tlZCA9IGFzeW5jIChzdGF0ZTogV29ya0l0ZW1TdGF0ZSk6IFByb21pc2U8V29ya0l0ZW1bXT4gPT5cbiAgICAoYXdhaXQgY2xpZW50LmNhbGw8V29ya0l0ZW1bXT4oJ2xpc3Rfd29ya19pdGVtcycsIHsgc3RhdGUsIGNsYWltYWJsZTogdHJ1ZSB9KSkuZmlsdGVyKFxuICAgICAgKGl0ZW0pID0+IGl0ZW0uYmxvY2tlZFJlYXNvbiA9PT0gbnVsbCxcbiAgICApO1xuICBsZXQgY2FuZGlkYXRlcyA9IGF3YWl0IGxpc3RVbmJsb2NrZWQoJ3JlYWR5X2Zvcl9kZXYnKTtcbiAgaWYgKGNhbmRpZGF0ZXMubGVuZ3RoID09PSAwKSBjYW5kaWRhdGVzID0gYXdhaXQgbGlzdFVuYmxvY2tlZCgnaW5fcHJvZ3Jlc3MnKTtcbiAgY29uc3QgcGlja2VkID0gY2FuZGlkYXRlc1swXTtcbiAgaWYgKHBpY2tlZCA9PT0gdW5kZWZpbmVkKSByZXR1cm4geyBkaXNwYXRjaGVkOiBmYWxzZSB9O1xuXG4gIGxldCBjbGFpbTogQ2xhaW07XG4gIHRyeSB7XG4gICAgY2xhaW0gPSBhd2FpdCBjbGllbnQuY2FsbDxDbGFpbT4oJ2NsYWltX3Rhc2snLCB7IHdvcmtJdGVtSWQ6IHBpY2tlZC5pZCB9KTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBpZiAoaXNSZW1vdGVFcnJvcihlcnJvciwgJ0NvbmZsaWN0RXJyb3InKSkge1xuICAgICAgcmV0dXJuIHsgZGlzcGF0Y2hlZDogZmFsc2UsIGRldGFpbHM6IGBsb3N0IHRoZSBjbGFpbSByYWNlIGZvciAke3BpY2tlZC5leHRlcm5hbEtleX1gIH07XG4gICAgfVxuICAgIHRocm93IGVycm9yO1xuICB9XG5cbiAgY29uc3QgY29udGV4dCA9IGF3YWl0IGNsaWVudC5jYWxsPHsgd29ya0l0ZW06IFdvcmtJdGVtOyBlbnRyeVN0YXRlOiBXb3JrSXRlbVN0YXRlIH0+KFxuICAgICdnZXRfdGFza19jb250ZXh0JyxcbiAgICB7IHdvcmtJdGVtSWQ6IHBpY2tlZC5pZCB9LFxuICApO1xuICBjb25zdCB3b3JrSXRlbSA9IGNvbnRleHQud29ya0l0ZW07XG4gIGNvbnN0IHNwZWNSZWwgPSBqb2luKG9wdGlvbnMuc3BlY0ZvbGRlciwgd29ya0l0ZW0uc3BlY1BhdGgpO1xuICBjb25zdCBicmFuY2ggPSBgY2xhaW0vJHtjbGFpbS5pZH1gO1xuICBjb25zdCB3b3JrdHJlZXNSb290ID0gam9pbihyZXBvUGF0aCwgJy5vYWhzJywgJ3dvcmt0cmVlcycpO1xuICBjb25zdCBldmlkZW5jZTogRXZpZGVuY2VbXSA9IFtdO1xuXG4gIGNvbnN0IHN1Ym1pdCA9IGFzeW5jIChraW5kOiBFdmlkZW5jZVsna2luZCddLCBwYXlsb2FkOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPik6IFByb21pc2U8dm9pZD4gPT4ge1xuICAgIGNvbnN0IGl0ZW06IEV2aWRlbmNlID0geyBraW5kLCBwYXlsb2FkIH07XG4gICAgZXZpZGVuY2UucHVzaChpdGVtKTtcbiAgICBhd2FpdCBjbGllbnQuY2FsbCgnc3VibWl0X2V2aWRlbmNlJywge1xuICAgICAgd29ya0l0ZW1JZDogd29ya0l0ZW0uaWQsXG4gICAgICBldmlkZW5jZTogaXRlbSxcbiAgICAgIGZlbmNpbmdUb2tlbjogY2xhaW0uZmVuY2luZ1Rva2VuLFxuICAgIH0pO1xuICB9O1xuXG4gIGNvbnN0IGJhc2UgPSB7XG4gICAgZGlzcGF0Y2hlZDogdHJ1ZSxcbiAgICB3b3JrSXRlbUlkOiB3b3JrSXRlbS5pZCxcbiAgICBleHRlcm5hbEtleTogd29ya0l0ZW0uZXh0ZXJuYWxLZXksXG4gICAgY2xhaW1JZDogY2xhaW0uaWQsXG4gICAgZXZpZGVuY2UsXG4gIH0gc2F0aXNmaWVzIFJ1bk9uY2VSZXN1bHQ7XG5cbiAgY29uc3QgZmluaXNoQXJncyA9IHtcbiAgICBjbGllbnQsXG4gICAgd29ya0l0ZW0sXG4gICAgY2xhaW0sXG4gICAgc3BlY1JlbCxcbiAgICBicmFuY2gsXG4gICAgcmVwb1BhdGgsXG4gICAgcmVtb3RlLFxuICAgIGFsbG93bGlzdCxcbiAgICBzdWJtaXQsXG4gIH07XG5cbiAgLy8gMTAgXHUyMDE0IGFkb3B0IChjcmFzaCByZWNvdmVyeSk6IGluc3BlY3QgbGVmdG92ZXIgd29ya3RyZWVzIG9mIHRoaXMgd29yayBpdGVtLlxuICBjb25zdCBzY2FuID0gc2Nhbk9sZFdvcmt0cmVlcyh3b3JrdHJlZXNSb290LCB3b3JrSXRlbS5pZCwgc3BlY1JlbCk7XG4gIGlmIChzY2FuLmFkb3B0YWJsZSAhPT0gbnVsbCkge1xuICAgIGNvbnN0IHsgZGlyLCBoZWFkLCBiYXNlbGluZSB9ID0gc2Nhbi5hZG9wdGFibGU7XG4gICAgLy8gVGhlIG5ldyBjbGFpbSdzIGJyYW5jaCBwb2ludHMgYXQgdGhlIGNyYXNoZWQgcnVuJ3MgZmluaXNoZWQgSEVBRDsgdGhlXG4gICAgLy8gYWdlbnQgaXMgTk9UIHJlLWludm9rZWQgXHUyMDE0IHRoaXMgaXMgbGF0ZSBldmlkZW5jZSBzdWJtaXNzaW9uLCBub3QgcmVkby5cbiAgICBnaXQoWydicmFuY2gnLCBicmFuY2gsIGhlYWRdLCByZXBvUGF0aCk7XG4gICAgLy8gRW50cnktc3RhdGUgYWxpZ25tZW50IChuby1vcCB3aGVuIHRoZSBjcmFzaGVkIHJ1biBhbHJlYWR5IGFkdmFuY2VkKS5cbiAgICBhd2FpdCBjbGllbnQuY2FsbCgnYWR2YW5jZV9zdGF0ZScsIHtcbiAgICAgIHdvcmtJdGVtSWQ6IHdvcmtJdGVtLmlkLFxuICAgICAgdG86ICdpbl9wcm9ncmVzcycsXG4gICAgICBmZW5jaW5nVG9rZW46IGNsYWltLmZlbmNpbmdUb2tlbixcbiAgICB9KTtcbiAgICBpZiAob3B0aW9ucy5mYWlscG9pbnQgPT09ICdiZWZvcmVfcmVwb3J0Jykge1xuICAgICAgcmV0dXJuIHsgLi4uYmFzZSwgb3V0Y29tZTogJ2NyYXNoZWQnLCBkZXRhaWxzOiAnZmFpbHBvaW50IGJlZm9yZV9yZXBvcnQgKGFkb3B0IHBhdGgpJyB9O1xuICAgIH1cbiAgICBjb25zdCBvdXRjb21lID0gYXdhaXQgZmluaXNoUnVuKHtcbiAgICAgIC4uLmZpbmlzaEFyZ3MsXG4gICAgICB3b3JrRGlyOiBkaXIsXG4gICAgICBiYXNlbGluZSxcbiAgICAgIGFnZW50RXhpdENvZGU6IG51bGwsXG4gICAgfSk7XG4gICAgcmVtb3ZlV29ya3RyZWUoZGlyLCByZXBvUGF0aCk7XG4gICAgcmV0dXJuIHtcbiAgICAgIC4uLmJhc2UsXG4gICAgICBvdXRjb21lOiBvdXRjb21lID09PSAnaW5fcmV2aWV3JyA/ICdhZG9wdGVkX2luX3JldmlldycgOiBvdXRjb21lLFxuICAgICAgZGV0YWlsczogYGFkb3B0ZWQgZmluaXNoZWQgd29ya3RyZWUgJHtkaXJ9YCxcbiAgICB9O1xuICB9XG4gIGlmIChzY2FuLndyZWNrZWQubGVuZ3RoID4gMCkge1xuICAgIC8vIEEgd3JlY2tlZCB3b3JrdHJlZSAobm8gY29tbWl0IHBhc3QgYmFzZWxpbmUgLyBub24tdGVybWluYWwgc3RhdHVzKSBpc1xuICAgIC8vIGNsZWFuZWQ7IHRoZSBpdGVtIGJsb2NrcyBzdGFsZV93b3JrdHJlZSBmb3IgYSBodW1hbiBsb29rLlxuICAgIGZvciAoY29uc3QgZGlyIG9mIHNjYW4ud3JlY2tlZCkgcmVtb3ZlV29ya3RyZWUoZGlyLCByZXBvUGF0aCk7XG4gICAgYXdhaXQgY2xpZW50LmNhbGwoJ2Jsb2NrX3Rhc2snLCB7XG4gICAgICB3b3JrSXRlbUlkOiB3b3JrSXRlbS5pZCxcbiAgICAgIHJlYXNvbjogJ3N0YWxlX3dvcmt0cmVlJyxcbiAgICAgIGZlbmNpbmdUb2tlbjogY2xhaW0uZmVuY2luZ1Rva2VuLFxuICAgIH0pO1xuICAgIGF3YWl0IGNsaWVudC5jYWxsKCdyZWxlYXNlX2NsYWltJywgeyBjbGFpbUlkOiBjbGFpbS5pZCwgcmVhc29uOiAnc3RhbGUgd29ya3RyZWUgY2xlYW5lZCcgfSk7XG4gICAgcmV0dXJuIHsgLi4uYmFzZSwgb3V0Y29tZTogJ2Jsb2NrZWQnLCBkZXRhaWxzOiAnc3RhbGUgd29ya3RyZWUgY2xlYW5lZDsgdGFzayBibG9ja2VkJyB9O1xuICB9XG5cbiAgLy8gMiBcdTIwMTQgZ2l0IHBsdW1iaW5nOiBiYXNlbGluZSwgY2xhaW0gYnJhbmNoLCBjbGFpbS1uYW1lZCB3b3JrdHJlZS5cbiAgY29uc3QgYmFzZWxpbmUgPSBnaXQoWydyZXYtcGFyc2UnLCAnSEVBRCddLCByZXBvUGF0aCk7XG4gIGVuc3VyZUdpdEV4Y2x1ZGVzKHJlcG9QYXRoKTtcbiAgbWtkaXJTeW5jKHdvcmt0cmVlc1Jvb3QsIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xuICBjb25zdCB3b3JrdHJlZURpciA9IGpvaW4od29ya3RyZWVzUm9vdCwgY2xhaW0uaWQpO1xuICBnaXQoWyd3b3JrdHJlZScsICdhZGQnLCAnLWInLCBicmFuY2gsIHdvcmt0cmVlRGlyLCBiYXNlbGluZV0sIHJlcG9QYXRoKTtcbiAgd3JpdGVNYXJrZXIod29ya3RyZWVEaXIsIHtcbiAgICB3b3JrSXRlbUlkOiB3b3JrSXRlbS5pZCxcbiAgICBjbGFpbUlkOiBjbGFpbS5pZCxcbiAgICBiYXNlbGluZSxcbiAgICBpbnZvY2F0aW9uczogMCxcbiAgfSk7XG5cbiAgLy8gMyBcdTIwMTQgbWlycm9yLW9uLWRpc3BhdGNoOiBzdGFtcCBmcm9udG1hdHRlciB0byB0aGUgREIgZW50cnkgc3RhdGUgc28gdGhlXG4gIC8vIG9uZSBtb21lbnQgdGhlIGZpbGUgaXMgcmVhZCBhcyBhbiBlbnRyeSBzdGF0ZSwgaXQgaXMgZnJlc2ggKFx1MDBBNzEuNikuXG4gIGNvbnN0IHNwZWNBYnMgPSBqb2luKHdvcmt0cmVlRGlyLCBzcGVjUmVsKTtcbiAgaWYgKGV4aXN0c1N5bmMoc3BlY0FicykpIHtcbiAgICBzZXRGcm9udG1hdHRlclN0YXR1cyhzcGVjQWJzLCBFTlRSWV9TVEFUVVNbY29udGV4dC5lbnRyeVN0YXRlXSA/PyBjb250ZXh0LmVudHJ5U3RhdGUpO1xuICB9XG5cbiAgLy8gNCBcdTIwMTQgYWR2YW5jZSBpbnRvIGV4ZWN1dGlvbiBCRUZPUkUgdGhlIGFnZW50IHJ1bnMgKERCIGlzIHRoZSBlbnRyeSBzdGF0ZSkuXG4gIGF3YWl0IGNsaWVudC5jYWxsKCdhZHZhbmNlX3N0YXRlJywge1xuICAgIHdvcmtJdGVtSWQ6IHdvcmtJdGVtLmlkLFxuICAgIHRvOiAnaW5fcHJvZ3Jlc3MnLFxuICAgIGZlbmNpbmdUb2tlbjogY2xhaW0uZmVuY2luZ1Rva2VuLFxuICB9KTtcblxuICAvLyA1IFx1MjAxNCBpbnZva2UgdGhlIGNvZGluZyBhZ2VudC5cbiAgY29uc3QgY29tbWFuZCA9IG9wdGlvbnMuYWdlbnRDbWRcbiAgICAucmVwbGFjZUFsbCgne1NQRUNfRk9MREVSfScsIG9wdGlvbnMuc3BlY0ZvbGRlcilcbiAgICAucmVwbGFjZUFsbCgne1NUT1JZX0lEfScsIHdvcmtJdGVtLmV4dGVybmFsS2V5KVxuICAgIC5yZXBsYWNlQWxsKCd7SU5WT0tFX1dJVEh9Jywgd29ya0l0ZW0uaW52b2tlRGV2V2l0aClcbiAgICAucmVwbGFjZUFsbCgne1dPUktUUkVFfScsIHdvcmt0cmVlRGlyKTtcbiAgd3JpdGVNYXJrZXIod29ya3RyZWVEaXIsIHtcbiAgICB3b3JrSXRlbUlkOiB3b3JrSXRlbS5pZCxcbiAgICBjbGFpbUlkOiBjbGFpbS5pZCxcbiAgICBiYXNlbGluZSxcbiAgICBpbnZvY2F0aW9uczogMSxcbiAgfSk7XG4gIGNvbnN0IGludm9rZWQgPSBzcGF3blN5bmMoJ2Jhc2gnLCBbJy1sYycsIGNvbW1hbmRdLCB7XG4gICAgY3dkOiB3b3JrdHJlZURpcixcbiAgICBlbmNvZGluZzogJ3V0ZjgnLFxuICAgIHRpbWVvdXQ6IG9wdGlvbnMuYWdlbnRUaW1lb3V0TXMgPz8gMzAgKiA2MCAqIDEwMDAsXG4gICAga2lsbFNpZ25hbDogJ1NJR0tJTEwnLFxuICAgIGVudjoge1xuICAgICAgLi4ucHJvY2Vzcy5lbnYsXG4gICAgICAuLi5vcHRpb25zLmFnZW50RW52LFxuICAgICAgT0FIU19TUEVDX0ZJTEU6IHNwZWNBYnMsXG4gICAgICBPQUhTX1NUT1JZX0lEOiB3b3JrSXRlbS5leHRlcm5hbEtleSxcbiAgICB9LFxuICB9KTtcbiAgY29uc3QgYWdlbnRFeGl0Q29kZSA9IGludm9rZWQuc3RhdHVzID8/IC0xO1xuXG4gIC8vIFRFU1QgT05MWTogc2ltdWxhdGUgZHlpbmcgYWZ0ZXIgdGhlIGFnZW50IGNvbW1pdHRlZCwgYmVmb3JlIGFueSByZXBvcnQuXG4gIC8vIE5vIGV2aWRlbmNlLCBubyBhZHZhbmNlLCBubyByZWxlYXNlIFx1MjAxNCB0aGUgY2xhaW0gc3RheXMgbGl2ZSwgdGhlIHdvcmt0cmVlXG4gIC8vIHN0YXlzIG9uIGRpc2s7IGEgbGF0ZXIgY2xhaW0gYWRvcHRzIG9yIGNsZWFucyBpdCAoc3RlcCAxMCkuXG4gIGlmIChvcHRpb25zLmZhaWxwb2ludCA9PT0gJ2JlZm9yZV9yZXBvcnQnKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIC4uLmJhc2UsXG4gICAgICBvdXRjb21lOiAnY3Jhc2hlZCcsXG4gICAgICBkZXRhaWxzOiAnZmFpbHBvaW50IGJlZm9yZV9yZXBvcnQ6IGRpZWQgYWZ0ZXIgdGhlIGFnZW50IHJhbiwgYmVmb3JlIHJlcG9ydGluZycsXG4gICAgfTtcbiAgfVxuXG4gIGNvbnN0IG91dGNvbWUgPSBhd2FpdCBmaW5pc2hSdW4oe1xuICAgIC4uLmZpbmlzaEFyZ3MsXG4gICAgd29ya0Rpcjogd29ya3RyZWVEaXIsXG4gICAgYmFzZWxpbmUsXG4gICAgYWdlbnRFeGl0Q29kZSxcbiAgfSk7XG4gIHJlbW92ZVdvcmt0cmVlKHdvcmt0cmVlRGlyLCByZXBvUGF0aCk7XG4gIHJldHVybiB7IC4uLmJhc2UsIG91dGNvbWUgfTtcbn1cblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyB3b3JrTG9vcCBcdTIwMTQgcG9sbCBcdTIxOTIgcnVuT25jZSBcdTIxOTIgc2xlZXBcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4vKiogUnVuIHVudGlsIHN0b3BwZWQ6IHBvbGwgXHUyMTkyIHJ1bk9uY2UgXHUyMTkyIHNsZWVwKHBvbGxNcykuIFNJR0lOVCBleGl0cyBjbGVhbmx5LiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHdvcmtMb29wKG9wdGlvbnM6IFJ1bm5lck9wdGlvbnMgJiB7IG9uY2U/OiBib29sZWFuIH0pOiBQcm9taXNlPHZvaWQ+IHtcbiAgbGV0IHN0b3BwZWQgPSBmYWxzZTtcbiAgbGV0IHdha2U6ICgoKSA9PiB2b2lkKSB8IHVuZGVmaW5lZDtcbiAgY29uc3Qgb25TaWdpbnQgPSAoKTogdm9pZCA9PiB7XG4gICAgc3RvcHBlZCA9IHRydWU7XG4gICAgd2FrZT8uKCk7XG4gIH07XG4gIHByb2Nlc3Mub25jZSgnU0lHSU5UJywgb25TaWdpbnQpO1xuICB0cnkge1xuICAgIGZvciAoOzspIHtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHJ1bk9uY2Uob3B0aW9ucyk7XG4gICAgICBpZiAob3B0aW9ucy5vbmNlID09PSB0cnVlIHx8IHN0b3BwZWQpIHJldHVybjtcbiAgICAgIGlmICghcmVzdWx0LmRpc3BhdGNoZWQpIHtcbiAgICAgICAgYXdhaXQgbmV3IFByb21pc2U8dm9pZD4oKHJlc29sdmVTbGVlcCkgPT4ge1xuICAgICAgICAgIHdha2UgPSByZXNvbHZlU2xlZXA7XG4gICAgICAgICAgc2V0VGltZW91dChyZXNvbHZlU2xlZXAsIG9wdGlvbnMucG9sbE1zID8/IDE1XzAwMCk7XG4gICAgICAgIH0pO1xuICAgICAgICB3YWtlID0gdW5kZWZpbmVkO1xuICAgICAgICBpZiAoc3RvcHBlZCkgcmV0dXJuO1xuICAgICAgfVxuICAgIH1cbiAgfSBmaW5hbGx5IHtcbiAgICBwcm9jZXNzLnJlbW92ZUxpc3RlbmVyKCdTSUdJTlQnLCBvblNpZ2ludCk7XG4gIH1cbn1cbiIsICIvKipcbiAqIERyaXp6bGUgcGctY29yZSBzY2hlbWEgZm9yIHRoZSBvYWhzIHNwaW5lIChQaGFzZSAxIHN0b3J5IDExKS5cbiAqXG4gKiBEZXNpZ24gKHByb2R1Y3Qtcm9hZG1hcC5tZCBcdTAwQTcxLjMsIFx1MDBBNzEuNSBcdTIwMTQgXCJyYWNlcyBsb3NlIGJ5IGNvbnN0cmFpbnQsIG5vdCBieVxuICogYXBwbGljYXRpb24gbG9naWNcIik6XG4gKiAgLSBjbGFpbXM6IHBhcnRpYWwgdW5pcXVlIGluZGV4IE9OICh3b3JrX2l0ZW1faWQpIFdIRVJFIHJlbGVhc2VkID0gZmFsc2UgXHUyMDE0XG4gKiAgICB0aGUgc2Vjb25kIGNvbmN1cnJlbnQgY2xhaW0gbG9zZXMgYXQgdGhlIGNvbnN0cmFpbnQsIGxlYXZpbmcgbm8gcm93LlxuICogIC0gZXZlbnRzOiBVTklRVUUgKHN0cmVhbV9pZCwgc3RyZWFtX3NlcSkgZG91YmxlcyBhcyB0aGUgb3B0aW1pc3RpYyBsb2NrO1xuICogICAgZ2xvYmFsX3NlcSBpcyBhIHNlcmlhbCBpZGVudGl0eS5cbiAqICAtIHdvcmtfaXRlbXM6IHN0YXRlX3ZlcnNpb24gaW50IFx1MjAxNCBDQVMgdmlhIFVQREFURSAuLi4gV0hFUkUgc3RhdGVfdmVyc2lvbiA9ICRleHBlY3RlZC5cbiAqXG4gKiBIYW5kLW1haW50YWluZWQgdHdpbiBEREwgbGl2ZXMgaW4gc2NoZW1hLXNxbC50cyAocnVucyBvbiBQR2xpdGUgaW4gdGhlXG4gKiBjb25mb3JtYW5jZSBoYXJuZXNzKTsga2VlcCB0aGUgdHdvIGluIGxvY2tzdGVwLlxuICovXG5pbXBvcnQgeyBzcWwgfSBmcm9tICdkcml6emxlLW9ybSc7XG5pbXBvcnQge1xuICBiaWdpbnQsXG4gIGJvb2xlYW4sXG4gIGludGVnZXIsXG4gIGpzb25iLFxuICBwZ1RhYmxlLFxuICBwcmltYXJ5S2V5LFxuICBzZXJpYWwsXG4gIHRleHQsXG4gIHVuaXF1ZUluZGV4LFxufSBmcm9tICdkcml6emxlLW9ybS9wZy1jb3JlJztcblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBhY3RvcnMgXHUyMDE0IHVzZXJzLCBhZ2VudHMsIGFuZCB0aGUgcGVyLXdvcmtzcGFjZSBzeXN0ZW0gYWN0b3IgKHJvYWRtYXAgXHUwMEE3MS4yKVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5leHBvcnQgY29uc3QgYWN0b3JzID0gcGdUYWJsZSgnYWN0b3JzJywge1xuICBpZDogdGV4dCgnaWQnKS5wcmltYXJ5S2V5KCksXG4gIHR5cGU6IHRleHQoJ3R5cGUnKS5ub3ROdWxsKCksIC8vICd1c2VyJyB8ICdhZ2VudCcgfCAnc3lzdGVtJ1xuICBkaXNwbGF5TmFtZTogdGV4dCgnZGlzcGxheV9uYW1lJykubm90TnVsbCgpLFxuICAvKiogUGhhc2UgMiAocm9hZG1hcCBcdTAwQTczKTogJ2FkbWluJyB8ICdtZW1iZXInIHwgJ2F1ZGl0b3InIFx1MjAxNCBnYXRlZC13cml0ZSBhdXRob3JpdHkgKi9cbiAgZ292ZXJuYW5jZVJvbGU6IHRleHQoJ2dvdmVybmFuY2Vfcm9sZScpLm5vdE51bGwoKS5kZWZhdWx0KCdtZW1iZXInKSxcbiAgLyoqIFBoYXNlIDQgKHJvYWRtYXAgXHUwMEE3Myk6IEJNQUQgcGxheWJvb2sgcGVyc29uYSAoZS5nLiAnYm1hZC1hZ2VudC1wbScpOyBOVUxMIGZvciBodW1hbnMgYW5kIHBsYWluIGFnZW50cyAqL1xuICBwZXJzb25hQ29kZTogdGV4dCgncGVyc29uYV9jb2RlJyksXG59KTtcblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBncmFudHMgXHUyMDE0IGZsYXQgUGhhc2UtMSBwZXJtaXNzaW9uIHNldCAoc2NvcGUgYmVjb21lcyBtZWFuaW5nZnVsIGluIFBoYXNlIDIpXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbmV4cG9ydCBjb25zdCBncmFudHMgPSBwZ1RhYmxlKFxuICAnZ3JhbnRzJyxcbiAge1xuICAgIGFjdG9ySWQ6IHRleHQoJ2FjdG9yX2lkJykubm90TnVsbCgpLFxuICAgIHBlcm1pc3Npb246IHRleHQoJ3Blcm1pc3Npb24nKS5ub3ROdWxsKCksXG4gICAgc2NvcGU6IHRleHQoJ3Njb3BlJyksXG4gIH0sXG4gICh0KSA9PiBbcHJpbWFyeUtleSh7IGNvbHVtbnM6IFt0LmFjdG9ySWQsIHQucGVybWlzc2lvbl0gfSldLFxuKTtcblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyByb2xlX2Fzc2lnbm1lbnRzIFx1MjAxNCBkZWxpdmVyeS1yb2xlIGJ1bmRsZXMgKFBoYXNlIDIsIHJvYWRtYXAgXHUwMEE3MykuIEFzc2lnbm1lbnRcbi8vIGdyYW50cyB0aGUgYnVuZGxlOyByZXZvY2F0aW9uIGZsaXBzIGByZXZva2VkYCAoYXVkaXQgaGlzdG9yeSBpcyBrZXB0KS5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuZXhwb3J0IGNvbnN0IHJvbGVBc3NpZ25tZW50cyA9IHBnVGFibGUoJ3JvbGVfYXNzaWdubWVudHMnLCB7XG4gIHNlcTogc2VyaWFsKCdzZXEnKS5wcmltYXJ5S2V5KCksXG4gIGFjdG9ySWQ6IHRleHQoJ2FjdG9yX2lkJykubm90TnVsbCgpLFxuICByb2xlQ29kZTogdGV4dCgncm9sZV9jb2RlJykubm90TnVsbCgpLFxuICBncmFudGVkQnk6IHRleHQoJ2dyYW50ZWRfYnknKS5ub3ROdWxsKCksXG4gIHJldm9rZWQ6IGJvb2xlYW4oJ3Jldm9rZWQnKS5ub3ROdWxsKCkuZGVmYXVsdChmYWxzZSksXG59KTtcblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyB3b3Jrc3BhY2Vfc3RhdGUgXHUyMDE0IHRoZSBzaW5nbGUtcm93IHBsYW4vcG9saWN5IHByb2plY3Rpb24gKFBoYXNlIDIsIHJvYWRtYXBcbi8vIFx1MDBBNzMpLiBFeGFjdGx5IG9uZSByb3cgd2l0aCBpZCA9ICd3b3Jrc3BhY2UnOyB2ZXJzaW9ucyBiYWNrIGF1dGh6LmV4cGxhaW4uXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbmV4cG9ydCBjb25zdCB3b3Jrc3BhY2VTdGF0ZSA9IHBnVGFibGUoJ3dvcmtzcGFjZV9zdGF0ZScsIHtcbiAgaWQ6IHRleHQoJ2lkJykucHJpbWFyeUtleSgpLCAvLyBhbHdheXMgJ3dvcmtzcGFjZSdcbiAgcGxhbjogdGV4dCgncGxhbicpLm5vdE51bGwoKSwgLy8gJ2ZyZWUnIHwgJ3RlYW0nIHwgJ2VudGVycHJpc2UnXG4gIHBsYW5WZXJzaW9uOiBpbnRlZ2VyKCdwbGFuX3ZlcnNpb24nKS5ub3ROdWxsKCkuZGVmYXVsdCgxKSxcbiAgcG9saWN5OiBqc29uYigncG9saWN5JykuJHR5cGU8UmVjb3JkPHN0cmluZywgdW5rbm93bj4+KCkubm90TnVsbCgpLmRlZmF1bHQoc3FsYCd7fSc6Ompzb25iYCksXG4gIHBvbGljeVZlcnNpb246IGludGVnZXIoJ3BvbGljeV92ZXJzaW9uJykubm90TnVsbCgpLmRlZmF1bHQoMSksXG59KTtcblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBnYXRlX3BvbGljaWVzIFx1MjAxNCBnYXRlIGRlZmluaXRpb25zIGFzIERBVEEgKFBoYXNlIDIsIHJvYWRtYXAgXHUwMEE3Myk6XG4vLyBtaW5BcHByb3ZhbHMgKyByZXF1aXJlZEFjdG9yVHlwZXMsIGtleWVkIGJ5IGdhdGUgY29kZS5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuZXhwb3J0IGNvbnN0IGdhdGVQb2xpY2llcyA9IHBnVGFibGUoJ2dhdGVfcG9saWNpZXMnLCB7XG4gIGdhdGU6IHRleHQoJ2dhdGUnKS5wcmltYXJ5S2V5KCksIC8vICdzcGVjX2FwcHJvdmFsJyB8ICdyZXZpZXdfYXBwcm92YWwnXG4gIHBvbGljeToganNvbmIoJ3BvbGljeScpLiR0eXBlPFJlY29yZDxzdHJpbmcsIHVua25vd24+PigpLm5vdE51bGwoKSxcbn0pO1xuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIGZlYXR1cmVzIFx1MjAxNCBlcGljLWxldmVsIHByb2plY3Rpb24gKHN0YXRlICsgZG9uZV9jaGVja3BvaW50IGRpc3BhdGNoIGhvbGQpXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbmV4cG9ydCBjb25zdCBmZWF0dXJlcyA9IHBnVGFibGUoJ2ZlYXR1cmVzJywge1xuICBpZDogdGV4dCgnaWQnKS5wcmltYXJ5S2V5KCksXG4gIHNlcTogc2VyaWFsKCdzZXEnKS5ub3ROdWxsKCksXG4gIHN0YXRlOiB0ZXh0KCdzdGF0ZScpLm5vdE51bGwoKSwgLy8gJ2JhY2tsb2cnIHwgJ2luX3Byb2dyZXNzJyB8ICdkb25lJ1xuICBkaXNwYXRjaEhvbGQ6IGJvb2xlYW4oJ2Rpc3BhdGNoX2hvbGQnKS5ub3ROdWxsKCkuZGVmYXVsdChmYWxzZSksXG59KTtcblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyB3b3JrX2l0ZW1zIFx1MjAxNCB0aGUgdW5pZmllZCB3b3JrLWl0ZW0gbW9kZWwgKHJvYWRtYXAgXHUwMEE3MS4xKVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5leHBvcnQgY29uc3Qgd29ya0l0ZW1zID0gcGdUYWJsZSgnd29ya19pdGVtcycsIHtcbiAgaWQ6IHRleHQoJ2lkJykucHJpbWFyeUtleSgpLFxuICAvKiogY3JlYXRpb24gb3JkZXIgXHUyMDE0IGJhY2tzIGZpcnN0LXdyaXRlci13aW5zIGV4dGVybmFsS2V5IHJlc29sdXRpb24gKi9cbiAgc2VxOiBzZXJpYWwoJ3NlcScpLm5vdE51bGwoKSxcbiAgZmVhdHVyZUlkOiB0ZXh0KCdmZWF0dXJlX2lkJykubm90TnVsbCgpLFxuICBleHRlcm5hbEtleTogdGV4dCgnZXh0ZXJuYWxfa2V5Jykubm90TnVsbCgpLFxuICAvKiogUGhhc2UgNCAocm9hZG1hcCBcdTAwQTcxLjQpOiBzZWxlY3RzIFdISUNIIG1hY2hpbmUtZXZpZGVuY2UgZ3VhcmRzIGFwcGx5IFx1MjAxNCBuZXZlciBXSE8gcGFzc2VzIGEgZ2F0ZSAqL1xuICBraW5kOiB0ZXh0KCdraW5kJykubm90TnVsbCgpLmRlZmF1bHQoJ2NvZGUnKSxcbiAgdGl0bGU6IHRleHQoJ3RpdGxlJykubm90TnVsbCgpLFxuICBzdGF0ZTogdGV4dCgnc3RhdGUnKS5ub3ROdWxsKCksXG4gIGJsb2NrZWRSZWFzb246IHRleHQoJ2Jsb2NrZWRfcmVhc29uJyksIC8vIG92ZXJsYXksIG5vdCBhIHN0YXRlIChEOClcbiAgcmV2aWV3TG9vcEl0ZXJhdGlvbjogaW50ZWdlcigncmV2aWV3X2xvb3BfaXRlcmF0aW9uJykubm90TnVsbCgpLmRlZmF1bHQoMCksXG4gIGludGVudEhhc2g6IHRleHQoJ2ludGVudF9oYXNoJyksXG4gIHBpbm5lZFZlcmlmaWNhdGlvbjoganNvbmIoJ3Bpbm5lZF92ZXJpZmljYXRpb24nKS4kdHlwZTxzdHJpbmdbXT4oKSwgLy8gUnVsZXMtbGF5ZXIgZGF0YSAoRDcpXG4gIHNwZWNDaGVja3BvaW50OiBib29sZWFuKCdzcGVjX2NoZWNrcG9pbnQnKS5ub3ROdWxsKCkuZGVmYXVsdChmYWxzZSksXG4gIGRvbmVDaGVja3BvaW50OiBib29sZWFuKCdkb25lX2NoZWNrcG9pbnQnKS5ub3ROdWxsKCkuZGVmYXVsdChmYWxzZSksXG4gIGludm9rZURldldpdGg6IHRleHQoJ2ludm9rZV9kZXZfd2l0aCcpLm5vdE51bGwoKS5kZWZhdWx0KCcnKSxcbiAgc3BlY1BhdGg6IHRleHQoJ3NwZWNfcGF0aCcpLm5vdE51bGwoKSxcbiAgLyoqIG9wdGltaXN0aWMgY29uY3VycmVuY3k6IENBUyBieSBVUERBVEUgLi4uIFdIRVJFIHN0YXRlX3ZlcnNpb24gPSBleHBlY3RlZCAqL1xuICBzdGF0ZVZlcnNpb246IGludGVnZXIoJ3N0YXRlX3ZlcnNpb24nKS5ub3ROdWxsKCkuZGVmYXVsdCgwKSxcbiAgLyoqIGRlcGVuZGVuY3kgZXh0ZXJuYWxLZXlzIHdpdGhpbiB0aGUgc2FtZSBmZWF0dXJlICovXG4gIGRlcGVuZHNPbjoganNvbmIoJ2RlcGVuZHNfb24nKS4kdHlwZTxzdHJpbmdbXT4oKS5ub3ROdWxsKCkuZGVmYXVsdChzcWxgJ1tdJzo6anNvbmJgKSxcbiAgLyoqIG1vbm90b25pYyBmZW5jaW5nIGNvdW50ZXIgcGVyIHdvcmsgaXRlbSAocm9hZG1hcCBcdTAwQTcxLjMpICovXG4gIGxhc3RGZW5jaW5nVG9rZW46IGludGVnZXIoJ2xhc3RfZmVuY2luZ190b2tlbicpLm5vdE51bGwoKS5kZWZhdWx0KDApLFxufSk7XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gY2xhaW1zIFx1MjAxNCBsZWFzZXMgKyBmZW5jaW5nIHRva2VuczsgT05FIGxpdmUgY2xhaW0gcGVyIGl0ZW0gQlkgQ09OU1RSQUlOVFxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5leHBvcnQgY29uc3QgY2xhaW1zID0gcGdUYWJsZShcbiAgJ2NsYWltcycsXG4gIHtcbiAgICBpZDogdGV4dCgnaWQnKS5wcmltYXJ5S2V5KCksXG4gICAgc2VxOiBzZXJpYWwoJ3NlcScpLm5vdE51bGwoKSxcbiAgICB3b3JrSXRlbUlkOiB0ZXh0KCd3b3JrX2l0ZW1faWQnKS5ub3ROdWxsKCksXG4gICAgYWN0b3JJZDogdGV4dCgnYWN0b3JfaWQnKS5ub3ROdWxsKCksXG4gICAgZmVuY2luZ1Rva2VuOiBpbnRlZ2VyKCdmZW5jaW5nX3Rva2VuJykubm90TnVsbCgpLFxuICAgIC8qKiBlbmdpbmUtY2xvY2sgbWlsbGlzZWNvbmRzIChKUyBmaWVsZCBgbm93YCksIG5ldmVyIFNRTCBub3coKSAqL1xuICAgIGxlYXNlRXhwaXJlc0F0OiBiaWdpbnQoJ2xlYXNlX2V4cGlyZXNfYXQnLCB7IG1vZGU6ICdudW1iZXInIH0pLm5vdE51bGwoKSxcbiAgICByZWxlYXNlZDogYm9vbGVhbigncmVsZWFzZWQnKS5ub3ROdWxsKCkuZGVmYXVsdChmYWxzZSksXG4gICAgdHRsTXM6IGJpZ2ludCgndHRsX21zJywgeyBtb2RlOiAnbnVtYmVyJyB9KS5ub3ROdWxsKCksXG4gIH0sXG4gICh0KSA9PiBbXG4gICAgLy8gcm9hZG1hcCBcdTAwQTcxLjM6IFwiT25lIGxpdmUgY2xhaW0gcGVyIHdvcmsgaXRlbSwgZW5mb3JjZWQgYnkgYSBwYXJ0aWFsXG4gICAgLy8gdW5pcXVlIGluZGV4IFx1MjAxNCByYWNlcyBsb3NlIGJ5IGNvbnN0cmFpbnQsIG5vdCBieSBhcHBsaWNhdGlvbiBsb2dpYy5cIlxuICAgIHVuaXF1ZUluZGV4KCdjbGFpbXNfb25lX2xpdmVfcGVyX2l0ZW0nKS5vbih0LndvcmtJdGVtSWQpLndoZXJlKHNxbGByZWxlYXNlZCA9IGZhbHNlYCksXG4gIF0sXG4pO1xuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIGdhdGVfZGVjaXNpb25zIFx1MjAxNCBwZXJtaXNzaW9uIHNuYXBzaG90ICsgZGVjaXNpb24gcmVjb3JkIChyb2FkbWFwIFx1MDBBNzEuNClcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuZXhwb3J0IGNvbnN0IGdhdGVEZWNpc2lvbnMgPSBwZ1RhYmxlKCdnYXRlX2RlY2lzaW9ucycsIHtcbiAgc2VxOiBzZXJpYWwoJ3NlcScpLnByaW1hcnlLZXkoKSxcbiAgd29ya0l0ZW1JZDogdGV4dCgnd29ya19pdGVtX2lkJykubm90TnVsbCgpLFxuICBnYXRlOiB0ZXh0KCdnYXRlJykubm90TnVsbCgpLCAvLyAnc3BlY19hcHByb3ZhbCcgfCAncmV2aWV3X2FwcHJvdmFsJ1xuICBkZWNpc2lvbjogdGV4dCgnZGVjaXNpb24nKS5ub3ROdWxsKCksIC8vICdhcHByb3ZlZCcgfCAncmVqZWN0ZWQnXG4gIGFjdG9ySWQ6IHRleHQoJ2FjdG9yX2lkJykubm90TnVsbCgpLFxuICAvKiogcmV2aWV3IHJvdW5kIHRoZSBkZWNpc2lvbiBiZWxvbmdzIHRvICg9IHJldmlld19sb29wX2l0ZXJhdGlvbiBhdCBkZWNpc2lvbiB0aW1lKSAqL1xuICByb3VuZDogaW50ZWdlcigncm91bmQnKS5ub3ROdWxsKCkuZGVmYXVsdCgwKSxcbn0pO1xuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIGV2aWRlbmNlIFx1MjAxNCBtYWNoaW5lLWNvbGxlY3RlZCBmYWN0czsgc2VxIG9yZGVycyBcImxhdGVzdFwiIHNlbWFudGljc1xuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5leHBvcnQgY29uc3QgZXZpZGVuY2UgPSBwZ1RhYmxlKCdldmlkZW5jZScsIHtcbiAgc2VxOiBzZXJpYWwoJ3NlcScpLnByaW1hcnlLZXkoKSxcbiAgd29ya0l0ZW1JZDogdGV4dCgnd29ya19pdGVtX2lkJykubm90TnVsbCgpLFxuICBraW5kOiB0ZXh0KCdraW5kJykubm90TnVsbCgpLFxuICBwYXlsb2FkOiBqc29uYigncGF5bG9hZCcpLiR0eXBlPFJlY29yZDxzdHJpbmcsIHVua25vd24+PigpLm5vdE51bGwoKSxcbn0pO1xuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIGV2ZW50cyBcdTIwMTQgYXBwZW5kLW9ubHkgbG9nLCBzYW1lLXRyYW5zYWN0aW9uIGFzIHByb2plY3Rpb25zIChyb2FkbWFwIFx1MDBBNzEuNSlcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuZXhwb3J0IGNvbnN0IGV2ZW50cyA9IHBnVGFibGUoXG4gICdldmVudHMnLFxuICB7XG4gICAgZ2xvYmFsU2VxOiBzZXJpYWwoJ2dsb2JhbF9zZXEnKS5wcmltYXJ5S2V5KCksXG4gICAgc3RyZWFtVHlwZTogdGV4dCgnc3RyZWFtX3R5cGUnKS5ub3ROdWxsKCksIC8vICd3b3Jrc3BhY2UnfCdmZWF0dXJlJ3wnd29ya19pdGVtJ3wnYWN0b3InXG4gICAgc3RyZWFtSWQ6IHRleHQoJ3N0cmVhbV9pZCcpLm5vdE51bGwoKSxcbiAgICBzdHJlYW1TZXE6IGludGVnZXIoJ3N0cmVhbV9zZXEnKS5ub3ROdWxsKCksXG4gICAgdHlwZTogdGV4dCgndHlwZScpLm5vdE51bGwoKSxcbiAgICBhY3RvcklkOiB0ZXh0KCdhY3Rvcl9pZCcpLm5vdE51bGwoKSxcbiAgICBwYXlsb2FkOiBqc29uYigncGF5bG9hZCcpLiR0eXBlPFJlY29yZDxzdHJpbmcsIHVua25vd24+PigpLm5vdE51bGwoKSxcbiAgICBjYXVzYXRpb25JZDogdGV4dCgnY2F1c2F0aW9uX2lkJyksXG4gICAgaWRlbXBvdGVuY3lLZXk6IHRleHQoJ2lkZW1wb3RlbmN5X2tleScpLFxuICB9LFxuICAodCkgPT4gW1xuICAgIC8vIFx1MDBBNzEuNTogXCJVTklRVUUoc3RyZWFtX2lkLCBzdHJlYW1fc2VxKSBkb3VibGVzIGFzIHRoZSBvcHRpbWlzdGljIGxvY2suXCJcbiAgICB1bmlxdWVJbmRleCgnZXZlbnRzX3N0cmVhbV9pZF9zdHJlYW1fc2VxJykub24odC5zdHJlYW1JZCwgdC5zdHJlYW1TZXEpLFxuICBdLFxuKTtcblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBpZGVtcG90ZW5jeV9rZXlzIFx1MjAxNCBrZXllZCByZXBsYXkgcmV0dXJucyB0aGUgcmVjb3JkZWQgcmVzdWx0LCBhcHBlbmRzIG5vdGhpbmdcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuZXhwb3J0IGNvbnN0IGlkZW1wb3RlbmN5S2V5cyA9IHBnVGFibGUoJ2lkZW1wb3RlbmN5X2tleXMnLCB7XG4gIGtleTogdGV4dCgna2V5JykucHJpbWFyeUtleSgpLFxuICByZXN1bHQ6IGpzb25iKCdyZXN1bHQnKS4kdHlwZTxSZWNvcmQ8c3RyaW5nLCB1bmtub3duPj4oKS5ub3ROdWxsKCksXG59KTtcblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyB0aHJlYWRzIFx1MjAxNCB0aGUgY2hhdCBTVVJGQUNFIChQaGFzZSAzLCByb2FkbWFwIFx1MDBBNzUuMykuIHBhcnRpY2lwYW50cyBpcyBqc29uYjpcbi8vIGVuZm9yY2VkIGZvciBwcml2YXRlIHRocmVhZHMsIGluZm9ybWF0aW9uYWwgZm9yIG9wZW4gb25lcy5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuZXhwb3J0IGNvbnN0IHRocmVhZHMgPSBwZ1RhYmxlKCd0aHJlYWRzJywge1xuICBpZDogdGV4dCgnaWQnKS5wcmltYXJ5S2V5KCksXG4gIHNlcTogc2VyaWFsKCdzZXEnKS5ub3ROdWxsKCksXG4gIGZlYXR1cmVJZDogdGV4dCgnZmVhdHVyZV9pZCcpLFxuICB3b3JrSXRlbUlkOiB0ZXh0KCd3b3JrX2l0ZW1faWQnKSxcbiAga2luZDogdGV4dCgna2luZCcpLm5vdE51bGwoKSwgLy8gJ3NwZWMnIHwgJ2Rlc2lnbicgfCAndGFzaycgfCAnZ2VuZXJhbCcgfCAncHJpdmF0ZSdcbiAgdmlzaWJpbGl0eTogdGV4dCgndmlzaWJpbGl0eScpLm5vdE51bGwoKSwgLy8gJ29wZW4nIHwgJ3ByaXZhdGUnXG4gIGNyZWF0ZWRCeTogdGV4dCgnY3JlYXRlZF9ieScpLm5vdE51bGwoKSxcbiAgcGFydGljaXBhbnRzOiBqc29uYigncGFydGljaXBhbnRzJykuJHR5cGU8c3RyaW5nW10+KCkubm90TnVsbCgpLmRlZmF1bHQoc3FsYCdbXSc6Ompzb25iYCksXG59KTtcblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBtZXNzYWdlcyBcdTIwMTQgb25lIGNvbHVtbiwgb25lIHRhYmxlIGZvciB1c2VyIEFORCBhZ2VudCBhdXRob3JzIChcdTAwQTc1LjMpO1xuLy8gVU5JUVVFKHRocmVhZF9pZCwgc2VxKSBrZWVwcyB0aGUgcGVyLXRocmVhZCBzZXF1ZW5jZSBnYXAtZnJlZSBieSBjb25zdHJhaW50LlxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5leHBvcnQgY29uc3QgbWVzc2FnZXMgPSBwZ1RhYmxlKFxuICAnbWVzc2FnZXMnLFxuICB7XG4gICAgaWQ6IHRleHQoJ2lkJykucHJpbWFyeUtleSgpLFxuICAgIHRocmVhZElkOiB0ZXh0KCd0aHJlYWRfaWQnKS5ub3ROdWxsKCksXG4gICAgc2VxOiBpbnRlZ2VyKCdzZXEnKS5ub3ROdWxsKCksIC8vIHBlci10aHJlYWQsIDEtYmFzZWQsIGdhcC1mcmVlXG4gICAgYXV0aG9ySWQ6IHRleHQoJ2F1dGhvcl9pZCcpLm5vdE51bGwoKSxcbiAgICBraW5kOiB0ZXh0KCdraW5kJykubm90TnVsbCgpLCAvLyAnY2hhdCcgfCAnc3lzdGVtJ1xuICAgIGJvZHk6IHRleHQoJ2JvZHknKS5ub3ROdWxsKCksXG4gICAgcmVwbHlUbzogdGV4dCgncmVwbHlfdG8nKSxcbiAgfSxcbiAgKHQpID0+IFt1bmlxdWVJbmRleCgnbWVzc2FnZXNfdGhyZWFkX2lkX3NlcScpLm9uKHQudGhyZWFkSWQsIHQuc2VxKV0sXG4pO1xuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIG1lbnRpb25zIFx1MjAxNCBTVFJVQ1RVUkVEIG1lbnRpb24gcmVjb3JkcyArIHRoZSByb3V0ZXIncyByZWNvcmRlZCByZXNvbHV0aW9uXG4vLyAoXHUwMEE3NS40KS4gVGhlIHNlcnZlciBuZXZlciBwYXJzZXMgbWVzc2FnZSBib2RpZXMuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbmV4cG9ydCBjb25zdCBtZW50aW9ucyA9IHBnVGFibGUoJ21lbnRpb25zJywge1xuICBzZXE6IHNlcmlhbCgnc2VxJykucHJpbWFyeUtleSgpLFxuICBtZXNzYWdlSWQ6IHRleHQoJ21lc3NhZ2VfaWQnKS5ub3ROdWxsKCksXG4gIG1lbnRpb25lZEFjdG9ySWQ6IHRleHQoJ21lbnRpb25lZF9hY3Rvcl9pZCcpLm5vdE51bGwoKSxcbiAgcmVzb2x1dGlvbjogdGV4dCgncmVzb2x1dGlvbicpLm5vdE51bGwoKSwgLy8gJ25vdGlmaWVkJ3wnam9iX2NyZWF0ZWQnfCdkZW5pZWRfcG9saWN5J3wnZGVuaWVkX2RlcHRoJ1xufSk7XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gbm90aWZpY2F0aW9ucyBcdTIwMTQgbWVudGlvbi9qb2ItY29tcGxldGlvbiBpbmJveCByb3dzIChcdTAwQTc1LjQpXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbmV4cG9ydCBjb25zdCBub3RpZmljYXRpb25zID0gcGdUYWJsZSgnbm90aWZpY2F0aW9ucycsIHtcbiAgaWQ6IHRleHQoJ2lkJykucHJpbWFyeUtleSgpLFxuICBzZXE6IHNlcmlhbCgnc2VxJykubm90TnVsbCgpLFxuICBhY3RvcklkOiB0ZXh0KCdhY3Rvcl9pZCcpLm5vdE51bGwoKSxcbiAgc291cmNlOiB0ZXh0KCdzb3VyY2UnKS5ub3ROdWxsKCksIC8vICdtZW50aW9uJyB8ICdqb2JfY29tcGxldGVkJ1xuICByZWZJZDogdGV4dCgncmVmX2lkJykubm90TnVsbCgpLCAvLyBtZXNzYWdlSWQgZm9yIG1lbnRpb25zLCBqb2JJZCBmb3IgY29tcGxldGlvbnNcbiAgcmVhZDogYm9vbGVhbigncmVhZCcpLm5vdE51bGwoKS5kZWZhdWx0KGZhbHNlKSxcbn0pO1xuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIGFnZW50X21lbW9yaWVzIFx1MjAxNCBQaGFzZSA1IChyb2FkbWFwIFx1MDBBNzYpOiBvd25lci1zY29wZWQgYWdlbnQgbWVtb3J5LiBzZXEgaXNcbi8vIHBlci1hZ2VudCwgMS1iYXNlZCwgYXBwZW5kIG9yZGVyIFx1MjAxNCBVTklRVUUoYWdlbnRfYWN0b3JfaWQsIHNlcSkgbWFrZXMgdGhlXG4vLyBvcmRlcmluZyBhIGNvbnN0cmFpbnQsIG5vdCBhIGNvbnZlbnRpb24uIENvbnRlbnQgbGl2ZXMgT05MWSBoZXJlOyBtZW1vcnlcbi8vIGV2ZW50cyBuZXZlciBjYXJyeSBpdC5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuZXhwb3J0IGNvbnN0IGFnZW50TWVtb3JpZXMgPSBwZ1RhYmxlKFxuICAnYWdlbnRfbWVtb3JpZXMnLFxuICB7XG4gICAgaWQ6IHRleHQoJ2lkJykucHJpbWFyeUtleSgpLFxuICAgIGFnZW50QWN0b3JJZDogdGV4dCgnYWdlbnRfYWN0b3JfaWQnKS5ub3ROdWxsKCksXG4gICAga2luZDogdGV4dCgna2luZCcpLm5vdE51bGwoKSwgLy8gJ2VwaXNvZGljJyB8ICdwcm9jZWR1cmFsJyB8ICdlbnRpdHknXG4gICAgY29udGVudDogdGV4dCgnY29udGVudCcpLm5vdE51bGwoKSxcbiAgICBzb3VyY2VUaHJlYWRJZDogdGV4dCgnc291cmNlX3RocmVhZF9pZCcpLFxuICAgIHNvdXJjZVZpc2liaWxpdHk6IHRleHQoJ3NvdXJjZV92aXNpYmlsaXR5JyksIC8vICdvcGVuJyB8ICdwcml2YXRlJyB8IE5VTExcbiAgICBzZXE6IGludGVnZXIoJ3NlcScpLm5vdE51bGwoKSxcbiAgfSxcbiAgKHQpID0+IFt1bmlxdWVJbmRleCgnYWdlbnRfbWVtb3JpZXNfYWdlbnRfYWN0b3JfaWRfc2VxJykub24odC5hZ2VudEFjdG9ySWQsIHQuc2VxKV0sXG4pO1xuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIGFnZW50X2pvYnMgXHUyMDE0IHJvdXRlci1tYXRlcmlhbGl6ZWQsIHJlcGx5LW9ubHkgY29udGV4dCAoXHUwMEE3NS40KTogTkVWRVIgYSBjbGFpbSxcbi8vIG5ldmVyIGxpZmVjeWNsZSBhdXRob3JpdHkuIGRlcHRoIGNvdW50cyBhZ2VudC1tZW50aW9uLWFnZW50IGhvcHMuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbmV4cG9ydCBjb25zdCBhZ2VudEpvYnMgPSBwZ1RhYmxlKCdhZ2VudF9qb2JzJywge1xuICBpZDogdGV4dCgnaWQnKS5wcmltYXJ5S2V5KCksXG4gIHNlcTogc2VyaWFsKCdzZXEnKS5ub3ROdWxsKCksXG4gIGFnZW50QWN0b3JJZDogdGV4dCgnYWdlbnRfYWN0b3JfaWQnKS5ub3ROdWxsKCksXG4gIHRocmVhZElkOiB0ZXh0KCd0aHJlYWRfaWQnKS5ub3ROdWxsKCksXG4gIG1lc3NhZ2VJZDogdGV4dCgnbWVzc2FnZV9pZCcpLm5vdE51bGwoKSxcbiAgd29ya0l0ZW1JZDogdGV4dCgnd29ya19pdGVtX2lkJyksXG4gIGZlYXR1cmVJZDogdGV4dCgnZmVhdHVyZV9pZCcpLFxuICBzdGF0dXM6IHRleHQoJ3N0YXR1cycpLm5vdE51bGwoKSwgLy8gJ3F1ZXVlZCcgfCAnZG9uZScgfCAnYmxvY2tlZCdcbiAgZGVwdGg6IGludGVnZXIoJ2RlcHRoJykubm90TnVsbCgpLmRlZmF1bHQoMCksXG4gIG5vdGU6IHRleHQoJ25vdGUnKSxcbn0pO1xuIiwgIi8qKlxuICogUGdFbmdpbmUgXHUyMDE0IGFzeW5jIFBvc3RncmVzIHBvcnQgb2YgdGhlIGluLW1lbW9yeSByZWZlcmVuY2UgZW5naW5lXG4gKiAoQG9haHMvY29yZSBzcmMvZW5naW5lLnRzKS4gU2VtYW50aWNzIGFyZSBhIEZBSVRIRlVMIG1pcnJvciwgbWV0aG9kIGJ5XG4gKiBtZXRob2Q6IHNhbWUgY2hlY2sgb3JkZXJpbmcsIHNhbWUgZXJyb3IgY2xhc3Nlcywgc2FtZSBldmVudCB0eXBlcywgc2FtZVxuICogY29uZm9ybWFuY2UgcGlucyAoc2VlIHBhY2thZ2VzL2NvcmUvdGVzdC9DT05GT1JNQU5DRS5tZCkuIFdoZXJlIHRoZVxuICogcmVmZXJlbmNlIHVzZWQgaW4tcHJvY2VzcyBkYXRhIHN0cnVjdHVyZXMsIHRoaXMgZW5naW5lIHVzZXMgdGhlIERyaXp6bGVcbiAqIHNjaGVtYSBpbiBzY2hlbWEudHMgYW5kIGxldHMgY29uc3RyYWludHMgZG8gdGhlIHJhY2luZyAocm9hZG1hcCBcdTAwQTcxLjNcbiAqIFwicmFjZXMgbG9zZSBieSBjb25zdHJhaW50LCBub3QgYnkgYXBwbGljYXRpb24gbG9naWNcIikuXG4gKlxuICogVGVjaG5pY2FsIG5vdGVzOlxuICogIC0gVGhlIGVuZ2luZSBjbG9jayBpcyB0aGUgSlMgZmllbGQgYG5vd2AgKGFkdmFuY2VDbG9jayBhZGRzIHRvIGl0KTsgbGVhc2VcbiAqICAgIGNvbXBhcmlzb25zIGFsd2F5cyB1c2UgdGhpcy5ub3csIG5ldmVyIFNRTCBub3coKS5cbiAqICAtIEV2ZXJ5IGNvbW1hbmQncyB3cml0ZXMgaGFwcGVuIGluIE9ORSBkYi50cmFuc2FjdGlvbiAoZXZlbnQgYXBwZW5kICtcbiAqICAgIHByb2plY3Rpb24gdXBkYXRlIHRvZ2V0aGVyIFx1MjAxNCByb2FkbWFwIFx1MDBBNzEuNSkuIFRoZSBzaW5nbGUgZGVsaWJlcmF0ZVxuICogICAgZXhjZXB0aW9uOiB0aGUgZmVuY2luZy5yZWplY3RlZCBBVURJVCBldmVudCBjb21taXRzIGluIGl0cyBvd25cbiAqICAgIHRyYW5zYWN0aW9uLCBiZWNhdXNlIHRoZSBjb21tYW5kIGl0IGJlbG9uZ3MgdG8gZmFpbHMgd2l0aCBDb25mbGljdEVycm9yXG4gKiAgICBhbmQgbXVzdCBsZWF2ZSB0aGUgcHJvamVjdGlvbiB1bnRvdWNoZWQgd2hpbGUgdGhlIHJlZnVzYWwgaXMgcmVjb3JkZWRcbiAqICAgIChcdTAwQTcxLjMgXCJhIHN0YWxlIHRva2VuIGdldHMgNDA5IGFuZCBhbiBhdWRpdCBldmVudFwiKS5cbiAqICAtIEFsbCByZXR1cm5lZCB2YWx1ZXMgYXJlIHN0cnVjdHVyZWQtY2xvbmUtYWJsZSBwbGFpbiBvYmplY3RzIChudW1iZXJcbiAqICAgIHRpbWVzdGFtcHMsIG5vIERhdGUsIG5vIHVuZGVmaW5lZCBhcnJheSBob2xlcykgc28gdGhleSBjcm9zcyB0aGVcbiAqICAgIHN5bmNraXQgd29ya2VyIGJvdW5kYXJ5IGludGFjdC5cbiAqL1xuaW1wb3J0IHsgYW5kLCBhc2MsIGVxLCBndCwgbHRlLCBzcWwgfSBmcm9tICdkcml6emxlLW9ybSc7XG5pbXBvcnQgdHlwZSB7IFBnbGl0ZURhdGFiYXNlIH0gZnJvbSAnZHJpenpsZS1vcm0vcGdsaXRlJztcblxuaW1wb3J0IHtcbiAgQUdFTlRfR0FURV9BUFBST1ZFX1BFUk1JU1NJT05TLFxuICBBR0VOVF9KT0JfTUFYX0RFUFRILFxuICBCTE9DS0VEX1JFQVNPTlMsXG4gIENvbmZsaWN0RXJyb3IsXG4gIERFRkFVTFRfUExBTixcbiAgREVMSVZFUllfUk9MRVMsXG4gIEd1YXJkRmFpbGVkRXJyb3IsXG4gIEludmFsaWRUcmFuc2l0aW9uRXJyb3IsXG4gIFBlcm1pc3Npb25EZW5pZWRFcnJvcixcbiAgUEVSU09OQVMsXG4gIFBMQU5fQ0VJTElOR1MsXG4gIFJFVklFV19MT09QX0xJTUlULFxuICBTdG9yaWVzVmFsaWRhdGlvbkVycm9yLFxuICBXT1JLX0lURU1fU1RBVEVTLFxuICBwYXJzZVN0b3JpZXMsXG4gIHR5cGUgQWN0b3IsXG4gIHR5cGUgQWN0b3JUeXBlLFxuICB0eXBlIEFkdmFuY2VJbnB1dCxcbiAgdHlwZSBBZ2VudEpvYixcbiAgdHlwZSBBZ2VudE1lbW9yeSxcbiAgdHlwZSBBdXRoekV4cGxhbmF0aW9uLFxuICB0eXBlIEJsb2NrZWRSZWFzb24sXG4gIHR5cGUgQ2xhaW0sXG4gIHR5cGUgQ3JlYXRlV29ya0l0ZW1JbnB1dCxcbiAgdHlwZSBEaXZlcmdlbmNlUmVwb3J0LFxuICB0eXBlIEV2aWRlbmNlLFxuICB0eXBlIEZlYXR1cmUsXG4gIHR5cGUgR2F0ZUNvZGUsXG4gIHR5cGUgR2F0ZURlY2lzaW9uSW5wdXQsXG4gIHR5cGUgR2F0ZVBvbGljeSxcbiAgdHlwZSBHb3Zlcm5hbmNlUm9sZSxcbiAgdHlwZSBNZW1vcnlLaW5kLFxuICB0eXBlIE1lbnRpb24sXG4gIHR5cGUgTWVudGlvblJlc29sdXRpb24sXG4gIHR5cGUgTWVzc2FnZSxcbiAgdHlwZSBOb3RpZmljYXRpb24sXG4gIHR5cGUgUGVybWlzc2lvbixcbiAgdHlwZSBQbGFuQ29kZSxcbiAgdHlwZSBSb2xlQXNzaWdubWVudCxcbiAgdHlwZSBTcGluZUV2ZW50LFxuICB0eXBlIFN0b3JpZXNJbXBvcnRSZXN1bHQsXG4gIHR5cGUgVGhyZWFkLFxuICB0eXBlIFRocmVhZEtpbmQsXG4gIHR5cGUgVGhyZWFkVmlzaWJpbGl0eSxcbiAgdHlwZSBXb3JrSXRlbSxcbiAgdHlwZSBXb3JrSXRlbUtpbmQsXG4gIHR5cGUgV29ya0l0ZW1TdGF0ZSxcbiAgdHlwZSBXb3Jrc3BhY2VQb2xpY3ksXG59IGZyb20gJ0BvYWhzL2NvcmUnO1xuXG5pbXBvcnQge1xuICBhY3RvcnMsXG4gIGFnZW50Sm9icyxcbiAgYWdlbnRNZW1vcmllcyxcbiAgY2xhaW1zLFxuICBldmlkZW5jZSBhcyBldmlkZW5jZVRhYmxlLFxuICBldmVudHMsXG4gIGZlYXR1cmVzLFxuICBnYXRlRGVjaXNpb25zLFxuICBnYXRlUG9saWNpZXMsXG4gIGdyYW50cyxcbiAgaWRlbXBvdGVuY3lLZXlzLFxuICBtZW50aW9ucyxcbiAgbWVzc2FnZXMsXG4gIG5vdGlmaWNhdGlvbnMsXG4gIHJvbGVBc3NpZ25tZW50cyxcbiAgdGhyZWFkcyxcbiAgd29ya0l0ZW1zLFxuICB3b3Jrc3BhY2VTdGF0ZSxcbn0gZnJvbSAnLi9zY2hlbWEuanMnO1xuXG50eXBlIERiID0gUGdsaXRlRGF0YWJhc2U8UmVjb3JkPHN0cmluZywgdW5rbm93bj4+O1xudHlwZSBUeCA9IFBhcmFtZXRlcnM8UGFyYW1ldGVyczxEYlsndHJhbnNhY3Rpb24nXT5bMF0+WzBdO1xuLyoqIEJvdGggdGhlIHJvb3QgZGF0YWJhc2UgYW5kIGEgdHJhbnNhY3Rpb24gZXhwb3NlIHRoZSBzYW1lIHF1ZXJ5IHN1cmZhY2UuICovXG50eXBlIFF1ZXJ5YWJsZSA9IERiIHwgVHg7XG5cbnR5cGUgV29ya0l0ZW1Sb3cgPSB0eXBlb2Ygd29ya0l0ZW1zLiRpbmZlclNlbGVjdDtcbnR5cGUgQ2xhaW1Sb3cgPSB0eXBlb2YgY2xhaW1zLiRpbmZlclNlbGVjdDtcbnR5cGUgRmVhdHVyZVJvdyA9IHR5cGVvZiBmZWF0dXJlcy4kaW5mZXJTZWxlY3Q7XG50eXBlIEV2ZW50Um93ID0gdHlwZW9mIGV2ZW50cy4kaW5mZXJTZWxlY3Q7XG50eXBlIEFjdG9yUm93ID0gdHlwZW9mIGFjdG9ycy4kaW5mZXJTZWxlY3Q7XG50eXBlIFdvcmtzcGFjZVN0YXRlUm93ID0gdHlwZW9mIHdvcmtzcGFjZVN0YXRlLiRpbmZlclNlbGVjdDtcbnR5cGUgVGhyZWFkUm93ID0gdHlwZW9mIHRocmVhZHMuJGluZmVyU2VsZWN0O1xudHlwZSBNZXNzYWdlUm93ID0gdHlwZW9mIG1lc3NhZ2VzLiRpbmZlclNlbGVjdDtcbnR5cGUgQWdlbnRKb2JSb3cgPSB0eXBlb2YgYWdlbnRKb2JzLiRpbmZlclNlbGVjdDtcbnR5cGUgQWdlbnRNZW1vcnlSb3cgPSB0eXBlb2YgYWdlbnRNZW1vcmllcy4kaW5mZXJTZWxlY3Q7XG5cbi8qKiBUaGUgc2luZ2xlIHdvcmtzcGFjZV9zdGF0ZSByb3cga2V5IChhbmQgdGhlIHdvcmtzcGFjZSBldmVudC1zdHJlYW0gaWQpLiAqL1xuY29uc3QgV09SS1NQQUNFX0lEID0gJ3dvcmtzcGFjZSc7XG5cbmNvbnN0IFJBTks6IFJlY29yZDxXb3JrSXRlbVN0YXRlLCBudW1iZXI+ID0gT2JqZWN0LmZyb21FbnRyaWVzKFxuICBXT1JLX0lURU1fU1RBVEVTLm1hcCgocywgaSkgPT4gW3MsIGldKSxcbikgYXMgUmVjb3JkPFdvcmtJdGVtU3RhdGUsIG51bWJlcj47XG5cbi8qKiBNaXJyb3Igb2YgdGhlIHJlZmVyZW5jZSB0cmFuc2l0aW9uIHRhYmxlIChlbmdpbmUudHMpIFx1MjAxNCBkbyBub3QgZGl2ZXJnZS4gKi9cbmludGVyZmFjZSBUcmFuc2l0aW9uUnVsZSB7XG4gIGZyb206IFdvcmtJdGVtU3RhdGU7XG4gIHRvOiBXb3JrSXRlbVN0YXRlO1xuICBwZXJtaXNzaW9uOiBQZXJtaXNzaW9uO1xuICBjbGFpbVJlcXVpcmVkOiBib29sZWFuO1xuICBndWFyZHM6IEFycmF5PCdkZXBzX2RvbmUnIHwgJ3NwZWNfZ2F0ZV9pZl9jaGVja3BvaW50JyB8ICdub25lbXB0eV9kaWZmJz47XG59XG5cbmNvbnN0IFRSQU5TSVRJT05TOiBUcmFuc2l0aW9uUnVsZVtdID0gW1xuICB7IGZyb206ICdiYWNrbG9nJywgdG86ICdkcmFmdCcsIHBlcm1pc3Npb246ICd0YXNrLnBsYW4nLCBjbGFpbVJlcXVpcmVkOiBmYWxzZSwgZ3VhcmRzOiBbXSB9LFxuICB7XG4gICAgZnJvbTogJ2RyYWZ0JyxcbiAgICB0bzogJ3JlYWR5X2Zvcl9kZXYnLFxuICAgIHBlcm1pc3Npb246ICd0YXNrLnBsYW4nLFxuICAgIGNsYWltUmVxdWlyZWQ6IGZhbHNlLFxuICAgIGd1YXJkczogWydzcGVjX2dhdGVfaWZfY2hlY2twb2ludCddLFxuICB9LFxuICB7XG4gICAgZnJvbTogJ3JlYWR5X2Zvcl9kZXYnLFxuICAgIHRvOiAnaW5fcHJvZ3Jlc3MnLFxuICAgIHBlcm1pc3Npb246ICd0YXNrLmFkdmFuY2UnLFxuICAgIGNsYWltUmVxdWlyZWQ6IHRydWUsXG4gICAgZ3VhcmRzOiBbJ2RlcHNfZG9uZSddLFxuICB9LFxuICB7XG4gICAgZnJvbTogJ2luX3Byb2dyZXNzJyxcbiAgICB0bzogJ2luX3JldmlldycsXG4gICAgcGVybWlzc2lvbjogJ3Rhc2suYWR2YW5jZScsXG4gICAgY2xhaW1SZXF1aXJlZDogdHJ1ZSxcbiAgICBndWFyZHM6IFsnbm9uZW1wdHlfZGlmZiddLFxuICB9LFxuXTtcblxuY29uc3QgTEVHQUNZX1NUQVRVUzogUmVjb3JkPHN0cmluZywgV29ya0l0ZW1TdGF0ZT4gPSB7XG4gIGJhY2tsb2c6ICdiYWNrbG9nJyxcbiAgZHJhZnQ6ICdkcmFmdCcsXG4gICdyZWFkeS1mb3ItZGV2JzogJ3JlYWR5X2Zvcl9kZXYnLFxuICByZWFkeV9mb3JfZGV2OiAncmVhZHlfZm9yX2RldicsXG4gICdpbi1wcm9ncmVzcyc6ICdpbl9wcm9ncmVzcycsXG4gIGluX3Byb2dyZXNzOiAnaW5fcHJvZ3Jlc3MnLFxuICAnaW4tcmV2aWV3JzogJ2luX3JldmlldycsXG4gIGluX3JldmlldzogJ2luX3JldmlldycsXG4gIHJldmlldzogJ2luX3JldmlldycsXG4gIGRvbmU6ICdkb25lJyxcbn07XG5cbi8qKiBQb3N0Z3JlcyB1bmlxdWUtdmlvbGF0aW9uIGRldGVjdG9yICh3YWxrcyBkcml6emxlJ3Mgd3JhcHBlZCBjYXVzZXMpLiAqL1xuZnVuY3Rpb24gaXNVbmlxdWVWaW9sYXRpb24oZXJyb3I6IHVua25vd24pOiBib29sZWFuIHtcbiAgbGV0IGN1cnJlbnQ6IHVua25vd24gPSBlcnJvcjtcbiAgZm9yIChsZXQgZGVwdGggPSAwOyBkZXB0aCA8IDUgJiYgY3VycmVudCAhPT0gbnVsbCAmJiB0eXBlb2YgY3VycmVudCA9PT0gJ29iamVjdCc7IGRlcHRoICs9IDEpIHtcbiAgICBjb25zdCBlcnIgPSBjdXJyZW50IGFzIHsgY29kZT86IHVua25vd247IG1lc3NhZ2U/OiB1bmtub3duOyBjYXVzZT86IHVua25vd24gfTtcbiAgICBpZiAoZXJyLmNvZGUgPT09ICcyMzUwNScpIHJldHVybiB0cnVlO1xuICAgIGlmICh0eXBlb2YgZXJyLm1lc3NhZ2UgPT09ICdzdHJpbmcnICYmIC9kdXBsaWNhdGUga2V5IHZhbHVlIHZpb2xhdGVzIHVuaXF1ZS9pLnRlc3QoZXJyLm1lc3NhZ2UpKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgY3VycmVudCA9IGVyci5jYXVzZTtcbiAgfVxuICByZXR1cm4gZmFsc2U7XG59XG5cbmV4cG9ydCBjbGFzcyBQZ0VuZ2luZSB7XG4gIC8qKiBFbmdpbmUgY2xvY2sgaW4gbXMgXHUyMDE0IHRoZSBPTkxZIHRpbWUgc291cmNlIGZvciBsZWFzZSBsb2dpYy4gKi9cbiAgcHJpdmF0ZSBub3cgPSAwO1xuICBwcml2YXRlIHNlcSA9IDA7XG4gIHByaXZhdGUgc3lzdGVtQWN0b3JJZCA9ICcnO1xuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgcmVhZG9ubHkgZGI6IERiKSB7fVxuXG4gIC8qKlxuICAgKiBQb3N0LXJlc2V0IHNldHVwOiB0aGUgcGVyLXdvcmtzcGFjZSBzeXN0ZW0gYWN0b3IgKHJvYWRtYXAgXHUwMEE3MS4yKS5cbiAgICpcbiAgICogSWRlbXBvdGVudCBmb3IgcGVyc2lzdGVudCBkYXRhYmFzZXMgKHN0b3J5IDEzLCBgb2FocyBzZXJ2ZSAtLWRhdGFgKTogYVxuICAgKiByZXN0YXJ0IG92ZXIgYW4gZXhpc3RpbmcgUEdsaXRlIGRhdGEgZGlyZWN0b3J5IGZpbmRzIHRoZSBzeXN0ZW0gYWN0b3JcbiAgICogYWxyZWFkeSBwcmVzZW50LCByZXVzZXMgaXQsIGFuZCByZWNvdmVycyB0aGUgaWQgY291bnRlciBmcm9tIHRoZSBzdG9yZWRcbiAgICogaWRzIHNvIGZyZXNobHktY3JlYXRlZCBlbnRpdGllcyBuZXZlciBjb2xsaWRlIHdpdGggcGVyc2lzdGVkIG9uZXMuIEFcbiAgICogZnJlc2ggKG9yIHRydW5jYXRlZCkgZGF0YWJhc2UgdGFrZXMgdGhlIG9yaWdpbmFsIHBhdGggdW5jaGFuZ2VkLCBzbyB0aGVcbiAgICogY29uZm9ybWFuY2Ugc3VpdGUgc2VtYW50aWNzIGFyZSB1bnRvdWNoZWQuXG4gICAqL1xuICBhc3luYyBpbml0KCk6IFByb21pc2U8dm9pZD4ge1xuICAgIC8vIFNpbmdsZS1yb3cgcGxhbi9wb2xpY3kgcHJvamVjdGlvbiAoUGhhc2UgMiwgcm9hZG1hcCBcdTAwQTczKS4gb25Db25mbGljdERvTm90aGluZ1xuICAgIC8vIGtlZXBzIHRoaXMgaWRlbXBvdGVudCBmb3IgZHVyYWJsZSByZXN0YXJ0cyBcdTIwMTQgYW4gZXhpc3RpbmcgcGxhbiBzdXJ2aXZlcy5cbiAgICBhd2FpdCB0aGlzLmRiXG4gICAgICAuaW5zZXJ0KHdvcmtzcGFjZVN0YXRlKVxuICAgICAgLnZhbHVlcyh7IGlkOiBXT1JLU1BBQ0VfSUQsIHBsYW46IERFRkFVTFRfUExBTiwgcGxhblZlcnNpb246IDEsIHBvbGljeToge30sIHBvbGljeVZlcnNpb246IDEgfSlcbiAgICAgIC5vbkNvbmZsaWN0RG9Ob3RoaW5nKCk7XG4gICAgY29uc3QgZXhpc3RpbmcgPSBhd2FpdCB0aGlzLmRiXG4gICAgICAuc2VsZWN0KHsgaWQ6IGFjdG9ycy5pZCB9KVxuICAgICAgLmZyb20oYWN0b3JzKVxuICAgICAgLndoZXJlKGVxKGFjdG9ycy50eXBlLCAnc3lzdGVtJykpXG4gICAgICAubGltaXQoMSk7XG4gICAgY29uc3QgZm91bmQgPSBleGlzdGluZ1swXTtcbiAgICBpZiAoZm91bmQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhpcy5zeXN0ZW1BY3RvcklkID0gZm91bmQuaWQ7XG4gICAgICB0aGlzLnNlcSA9IGF3YWl0IHRoaXMucmVjb3ZlclNlcSgpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLnN5c3RlbUFjdG9ySWQgPSB0aGlzLm5leHRJZCgnYWN0b3Itc3lzdGVtJyk7XG4gICAgYXdhaXQgdGhpcy5kYi5pbnNlcnQoYWN0b3JzKS52YWx1ZXMoe1xuICAgICAgaWQ6IHRoaXMuc3lzdGVtQWN0b3JJZCxcbiAgICAgIHR5cGU6ICdzeXN0ZW0nLFxuICAgICAgZGlzcGxheU5hbWU6ICdzeXN0ZW0nLFxuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIExhcmdlc3QgbmV4dElkKCkgc3VmZml4IHN0b3JlZCBpbiBhbnkgdGV4dC1pZCB0YWJsZSBcdTIwMTQgcmVzdGFydC1zYWZlIGlkXG4gICAqIGdlbmVyYXRpb24gZm9yIHBlcnNpc3RlbnQgZGF0YSBkaXJlY3Rvcmllcy4gSWRzIGFyZSBgJHtwcmVmaXh9XyR7YmFzZTM2fWAuXG4gICAqL1xuICBwcml2YXRlIGFzeW5jIHJlY292ZXJTZXEoKTogUHJvbWlzZTxudW1iZXI+IHtcbiAgICBjb25zdCBpZHM6IHN0cmluZ1tdID0gW107XG4gICAgaWRzLnB1c2goLi4uKGF3YWl0IHRoaXMuZGIuc2VsZWN0KHsgaWQ6IGFjdG9ycy5pZCB9KS5mcm9tKGFjdG9ycykpLm1hcCgocikgPT4gci5pZCkpO1xuICAgIGlkcy5wdXNoKC4uLihhd2FpdCB0aGlzLmRiLnNlbGVjdCh7IGlkOiBmZWF0dXJlcy5pZCB9KS5mcm9tKGZlYXR1cmVzKSkubWFwKChyKSA9PiByLmlkKSk7XG4gICAgaWRzLnB1c2goLi4uKGF3YWl0IHRoaXMuZGIuc2VsZWN0KHsgaWQ6IHdvcmtJdGVtcy5pZCB9KS5mcm9tKHdvcmtJdGVtcykpLm1hcCgocikgPT4gci5pZCkpO1xuICAgIGlkcy5wdXNoKC4uLihhd2FpdCB0aGlzLmRiLnNlbGVjdCh7IGlkOiBjbGFpbXMuaWQgfSkuZnJvbShjbGFpbXMpKS5tYXAoKHIpID0+IHIuaWQpKTtcbiAgICAvLyBQaGFzZSAzIChyb2FkbWFwIFx1MDBBNzUpOiB0aHJlYWRzL21lc3NhZ2VzL2pvYnMvbm90aWZpY2F0aW9ucyBhcmUgZHVyYWJsZSB0b28uXG4gICAgaWRzLnB1c2goLi4uKGF3YWl0IHRoaXMuZGIuc2VsZWN0KHsgaWQ6IHRocmVhZHMuaWQgfSkuZnJvbSh0aHJlYWRzKSkubWFwKChyKSA9PiByLmlkKSk7XG4gICAgaWRzLnB1c2goLi4uKGF3YWl0IHRoaXMuZGIuc2VsZWN0KHsgaWQ6IG1lc3NhZ2VzLmlkIH0pLmZyb20obWVzc2FnZXMpKS5tYXAoKHIpID0+IHIuaWQpKTtcbiAgICBpZHMucHVzaCguLi4oYXdhaXQgdGhpcy5kYi5zZWxlY3QoeyBpZDogYWdlbnRKb2JzLmlkIH0pLmZyb20oYWdlbnRKb2JzKSkubWFwKChyKSA9PiByLmlkKSk7XG4gICAgaWRzLnB1c2goLi4uKGF3YWl0IHRoaXMuZGIuc2VsZWN0KHsgaWQ6IG5vdGlmaWNhdGlvbnMuaWQgfSkuZnJvbShub3RpZmljYXRpb25zKSkubWFwKChyKSA9PiByLmlkKSk7XG4gICAgLy8gUGhhc2UgNSAocm9hZG1hcCBcdTAwQTc2KTogbWVtb3J5IGlkcyAobWVtXyopIGFyZSBkdXJhYmxlIHRvby5cbiAgICBpZHMucHVzaCguLi4oYXdhaXQgdGhpcy5kYi5zZWxlY3QoeyBpZDogYWdlbnRNZW1vcmllcy5pZCB9KS5mcm9tKGFnZW50TWVtb3JpZXMpKS5tYXAoKHIpID0+IHIuaWQpKTtcbiAgICBsZXQgbWF4ID0gMDtcbiAgICBmb3IgKGNvbnN0IGlkIG9mIGlkcykge1xuICAgICAgY29uc3Qgc2VwID0gaWQubGFzdEluZGV4T2YoJ18nKTtcbiAgICAgIGlmIChzZXAgPCAwKSBjb250aW51ZTtcbiAgICAgIGNvbnN0IG4gPSBOdW1iZXIucGFyc2VJbnQoaWQuc2xpY2Uoc2VwICsgMSksIDM2KTtcbiAgICAgIGlmIChOdW1iZXIuaXNGaW5pdGUobikgJiYgbiA+IG1heCkgbWF4ID0gbjtcbiAgICB9XG4gICAgcmV0dXJuIG1heDtcbiAgfVxuXG4gIC8vIC0tIGluZnJhc3RydWN0dXJlIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgcHJpdmF0ZSBuZXh0SWQocHJlZml4OiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIHRoaXMuc2VxICs9IDE7XG4gICAgcmV0dXJuIGAke3ByZWZpeH1fJHt0aGlzLnNlcS50b1N0cmluZygzNikucGFkU3RhcnQoNiwgJzAnKX1gO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBhcHBlbmRUeChcbiAgICB0eDogUXVlcnlhYmxlLFxuICAgIHN0cmVhbVR5cGU6IFNwaW5lRXZlbnRbJ3N0cmVhbVR5cGUnXSxcbiAgICBzdHJlYW1JZDogc3RyaW5nLFxuICAgIHR5cGU6IHN0cmluZyxcbiAgICBhY3RvcklkOiBzdHJpbmcsXG4gICAgcGF5bG9hZDogUmVjb3JkPHN0cmluZywgdW5rbm93bj4sXG4gICAgZXh0cmE/OiB7IGNhdXNhdGlvbklkPzogc3RyaW5nOyBpZGVtcG90ZW5jeUtleT86IHN0cmluZyB9LFxuICApOiBQcm9taXNlPFNwaW5lRXZlbnQ+IHtcbiAgICAvLyBzdHJlYW1fc2VxIGlzIDEtYmFzZWQgYW5kIGdhcC1mcmVlIHBlciBzdHJlYW0gKFx1MDBBNzEuNSk7IGNvbXB1dGVkIGluIHRoZVxuICAgIC8vIHNhbWUgdHJhbnNhY3Rpb24gYXMgdGhlIHByb2plY3Rpb24gdXBkYXRlLCBzbyBVTklRVUUoc3RyZWFtX2lkLFxuICAgIC8vIHN0cmVhbV9zZXEpIGRvdWJsZXMgYXMgdGhlIG9wdGltaXN0aWMgbG9jay5cbiAgICBjb25zdCBbcm93XSA9IGF3YWl0IHR4XG4gICAgICAuc2VsZWN0KHsgbWF4U2VxOiBzcWw8bnVtYmVyPmBjb2FsZXNjZShtYXgoJHtldmVudHMuc3RyZWFtU2VxfSksIDApYCB9KVxuICAgICAgLmZyb20oZXZlbnRzKVxuICAgICAgLndoZXJlKGVxKGV2ZW50cy5zdHJlYW1JZCwgc3RyZWFtSWQpKTtcbiAgICBjb25zdCBzdHJlYW1TZXEgPSBOdW1iZXIocm93Py5tYXhTZXEgPz8gMCkgKyAxO1xuICAgIGNvbnN0IGluc2VydGVkID0gYXdhaXQgdHhcbiAgICAgIC5pbnNlcnQoZXZlbnRzKVxuICAgICAgLnZhbHVlcyh7XG4gICAgICAgIHN0cmVhbVR5cGUsXG4gICAgICAgIHN0cmVhbUlkLFxuICAgICAgICBzdHJlYW1TZXEsXG4gICAgICAgIHR5cGUsXG4gICAgICAgIGFjdG9ySWQsXG4gICAgICAgIHBheWxvYWQsXG4gICAgICAgIGNhdXNhdGlvbklkOiBleHRyYT8uY2F1c2F0aW9uSWQgPz8gbnVsbCxcbiAgICAgICAgaWRlbXBvdGVuY3lLZXk6IGV4dHJhPy5pZGVtcG90ZW5jeUtleSA/PyBudWxsLFxuICAgICAgfSlcbiAgICAgIC5yZXR1cm5pbmcoeyBnbG9iYWxTZXE6IGV2ZW50cy5nbG9iYWxTZXEgfSk7XG4gICAgY29uc3QgZ2xvYmFsU2VxID0gaW5zZXJ0ZWRbMF0/Lmdsb2JhbFNlcTtcbiAgICBpZiAoZ2xvYmFsU2VxID09PSB1bmRlZmluZWQpIHRocm93IG5ldyBFcnJvcignZXZlbnQgaW5zZXJ0IHJldHVybmVkIG5vIGdsb2JhbF9zZXEnKTtcbiAgICByZXR1cm4ge1xuICAgICAgZ2xvYmFsU2VxLFxuICAgICAgc3RyZWFtVHlwZSxcbiAgICAgIHN0cmVhbUlkLFxuICAgICAgc3RyZWFtU2VxLFxuICAgICAgdHlwZSxcbiAgICAgIGFjdG9ySWQsXG4gICAgICBwYXlsb2FkLFxuICAgICAgLi4uKGV4dHJhPy5jYXVzYXRpb25JZCAhPT0gdW5kZWZpbmVkID8geyBjYXVzYXRpb25JZDogZXh0cmEuY2F1c2F0aW9uSWQgfSA6IHt9KSxcbiAgICB9O1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBtdXN0R2V0SXRlbSh3b3JrSXRlbUlkOiBzdHJpbmcpOiBQcm9taXNlPFdvcmtJdGVtUm93PiB7XG4gICAgY29uc3QgYnlJZCA9IGF3YWl0IHRoaXMuZGIuc2VsZWN0KCkuZnJvbSh3b3JrSXRlbXMpLndoZXJlKGVxKHdvcmtJdGVtcy5pZCwgd29ya0l0ZW1JZCkpLmxpbWl0KDEpO1xuICAgIGlmIChieUlkWzBdKSByZXR1cm4gYnlJZFswXTtcbiAgICAvLyBJbXBvcnRlZCBzdG9yaWVzIGFyZSBhZGRyZXNzZWQgYnkgdGhlaXIgZXh0ZXJuYWxLZXkgaGFuZGxlOyBmaXJzdFxuICAgIC8vIHdyaXRlciB3aW5zIFx1MjAxNCB0aGUgZWFybGllc3QtY3JlYXRlZCByb3cgcmVzb2x2ZXMgKGNvbmZvcm1hbmNlIHBpbiBpblxuICAgIC8vIHN0b3JpZXMtaW1wb3J0LnRlc3QudHMsIG1pcnJvcmVkIGZyb20gdGhlIHJlZmVyZW5jZSBleHRlcm5hbEtleUluZGV4KS5cbiAgICBjb25zdCBieUtleSA9IGF3YWl0IHRoaXMuZGJcbiAgICAgIC5zZWxlY3QoKVxuICAgICAgLmZyb20od29ya0l0ZW1zKVxuICAgICAgLndoZXJlKGVxKHdvcmtJdGVtcy5leHRlcm5hbEtleSwgd29ya0l0ZW1JZCkpXG4gICAgICAub3JkZXJCeShhc2Mod29ya0l0ZW1zLnNlcSkpXG4gICAgICAubGltaXQoMSk7XG4gICAgaWYgKGJ5S2V5WzBdKSByZXR1cm4gYnlLZXlbMF07XG4gICAgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoYHVua25vd24gd29yayBpdGVtOiAke3dvcmtJdGVtSWR9YCk7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIGdldEZlYXR1cmVSb3coZmVhdHVyZUlkOiBzdHJpbmcsIHR4OiBRdWVyeWFibGUgPSB0aGlzLmRiKTogUHJvbWlzZTxGZWF0dXJlUm93IHwgbnVsbD4ge1xuICAgIGNvbnN0IHJvd3MgPSBhd2FpdCB0eC5zZWxlY3QoKS5mcm9tKGZlYXR1cmVzKS53aGVyZShlcShmZWF0dXJlcy5pZCwgZmVhdHVyZUlkKSkubGltaXQoMSk7XG4gICAgcmV0dXJuIHJvd3NbMF0gPz8gbnVsbDtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgZ2V0QWN0b3JSb3coYWN0b3JJZDogc3RyaW5nLCB0eDogUXVlcnlhYmxlID0gdGhpcy5kYik6IFByb21pc2U8QWN0b3JSb3cgfCBudWxsPiB7XG4gICAgY29uc3Qgcm93cyA9IGF3YWl0IHR4LnNlbGVjdCgpLmZyb20oYWN0b3JzKS53aGVyZShlcShhY3RvcnMuaWQsIGFjdG9ySWQpKS5saW1pdCgxKTtcbiAgICByZXR1cm4gcm93c1swXSA/PyBudWxsO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyB3b3Jrc3BhY2VSb3codHg6IFF1ZXJ5YWJsZSA9IHRoaXMuZGIpOiBQcm9taXNlPFdvcmtzcGFjZVN0YXRlUm93PiB7XG4gICAgY29uc3Qgcm93cyA9IGF3YWl0IHR4LnNlbGVjdCgpLmZyb20od29ya3NwYWNlU3RhdGUpLndoZXJlKGVxKHdvcmtzcGFjZVN0YXRlLmlkLCBXT1JLU1BBQ0VfSUQpKS5saW1pdCgxKTtcbiAgICBjb25zdCByb3cgPSByb3dzWzBdO1xuICAgIGlmIChyb3cpIHJldHVybiByb3c7XG4gICAgLy8gaW5pdCgpIHNlZWRzIHRoZSByb3c7IHRoaXMgZGVmYXVsdCBvbmx5IGd1YXJkcyBhIG5vdC15ZXQtaW5pdGlhbGl6ZWQgcmVhZC5cbiAgICByZXR1cm4geyBpZDogV09SS1NQQUNFX0lELCBwbGFuOiBERUZBVUxUX1BMQU4sIHBsYW5WZXJzaW9uOiAxLCBwb2xpY3k6IHt9LCBwb2xpY3lWZXJzaW9uOiAxIH07XG4gIH1cblxuICAvKipcbiAgICogRW50aXRsZW1lbnQgcmVzb2x1dGlvbiBcdTIwMTQgYSBQVVJFIGZ1bmN0aW9uIG92ZXIgcGxhbiBcdTAwRDcgZ292ZXJuYW5jZSBcdTAwRDdcbiAgICogZGVsaXZlcnktcm9sZSBkYXRhIChyb2FkbWFwIFx1MDBBNzMpLCBtaXJyb3JpbmcgdGhlIHJlZmVyZW5jZSBlbmdpbmUuIEEgZ3JhbnRcbiAgICogbWF5IEVYSVNUIChkaXJlY3Qgb3IgdmlhIGEgcm9sZSkgYW5kIHN0aWxsIG5vdCBSRVNPTFZFIGZvciBhbiBhZ2VudCB3aGVuXG4gICAqIHRoZSBwbGFuIGNlaWxpbmcgb3IgdGhlIHJlc3RyaWN0LW9ubHkgd29ya3NwYWNlIHBvbGljeSBuYXJyb3dzIGl0LiBVc2Vyc1xuICAgKiBhcmUgbmV2ZXIgcGxhbi1maWx0ZXJlZC5cbiAgICovXG4gIHByaXZhdGUgYXN5bmMgZ3JhbnRTb3VyY2UoYWN0b3JJZDogc3RyaW5nLCBwZXJtaXNzaW9uOiBQZXJtaXNzaW9uKTogUHJvbWlzZTxzdHJpbmcgfCBudWxsPiB7XG4gICAgY29uc3QgZGlyZWN0ID0gYXdhaXQgdGhpcy5kYlxuICAgICAgLnNlbGVjdCh7IHBlcm1pc3Npb246IGdyYW50cy5wZXJtaXNzaW9uIH0pXG4gICAgICAuZnJvbShncmFudHMpXG4gICAgICAud2hlcmUoYW5kKGVxKGdyYW50cy5hY3RvcklkLCBhY3RvcklkKSwgZXEoZ3JhbnRzLnBlcm1pc3Npb24sIHBlcm1pc3Npb24pKSlcbiAgICAgIC5saW1pdCgxKTtcbiAgICBpZiAoZGlyZWN0Lmxlbmd0aCA+IDApIHJldHVybiAnZGlyZWN0JztcbiAgICBjb25zdCBhc3NpZ25tZW50cyA9IGF3YWl0IHRoaXMuZGJcbiAgICAgIC5zZWxlY3QoKVxuICAgICAgLmZyb20ocm9sZUFzc2lnbm1lbnRzKVxuICAgICAgLndoZXJlKGFuZChlcShyb2xlQXNzaWdubWVudHMuYWN0b3JJZCwgYWN0b3JJZCksIGVxKHJvbGVBc3NpZ25tZW50cy5yZXZva2VkLCBmYWxzZSkpKVxuICAgICAgLm9yZGVyQnkoYXNjKHJvbGVBc3NpZ25tZW50cy5zZXEpKTtcbiAgICBmb3IgKGNvbnN0IGFzc2lnbm1lbnQgb2YgYXNzaWdubWVudHMpIHtcbiAgICAgIGlmICgoREVMSVZFUllfUk9MRVNbYXNzaWdubWVudC5yb2xlQ29kZV0gPz8gW10pLmluY2x1ZGVzKHBlcm1pc3Npb24pKSB7XG4gICAgICAgIHJldHVybiBgcm9sZToke2Fzc2lnbm1lbnQucm9sZUNvZGV9YDtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICBwcml2YXRlIGFnZW50Q2VpbGluZ0FsbG93cyhcbiAgICBhY3RvcjogQWN0b3JSb3cgfCBudWxsLFxuICAgIHBlcm1pc3Npb246IFBlcm1pc3Npb24sXG4gICAgd29ya3NwYWNlOiBXb3Jrc3BhY2VTdGF0ZVJvdyxcbiAgKTogeyBwbGFuOiBib29sZWFuOyBwb2xpY3k6IGJvb2xlYW4gfSB7XG4gICAgaWYgKCFhY3RvciB8fCBhY3Rvci50eXBlICE9PSAnYWdlbnQnKSByZXR1cm4geyBwbGFuOiB0cnVlLCBwb2xpY3k6IHRydWUgfTtcbiAgICBjb25zdCBjZWlsaW5nID0gUExBTl9DRUlMSU5HU1t3b3Jrc3BhY2UucGxhbiBhcyBQbGFuQ29kZV07XG4gICAgY29uc3QgcG9saWN5ID0gd29ya3NwYWNlLnBvbGljeSBhcyBXb3Jrc3BhY2VQb2xpY3k7XG4gICAgaWYgKChBR0VOVF9HQVRFX0FQUFJPVkVfUEVSTUlTU0lPTlMgYXMgcmVhZG9ubHkgc3RyaW5nW10pLmluY2x1ZGVzKHBlcm1pc3Npb24pKSB7XG4gICAgICByZXR1cm4geyBwbGFuOiBjZWlsaW5nLmFnZW50R2F0ZUFwcHJvdmUsIHBvbGljeTogcG9saWN5LmFnZW50R2F0ZUFwcHJvdmFscyAhPT0gZmFsc2UgfTtcbiAgICB9XG4gICAgaWYgKHBlcm1pc3Npb24gPT09ICdnYXRlLnJldmlldy5yZWplY3QnKSB7XG4gICAgICByZXR1cm4geyBwbGFuOiBjZWlsaW5nLmFnZW50R2F0ZVJlamVjdCwgcG9saWN5OiB0cnVlIH07XG4gICAgfVxuICAgIGlmIChwZXJtaXNzaW9uID09PSAndGFzay5jbGFpbScpIHtcbiAgICAgIHJldHVybiB7IHBsYW46IHRydWUsIHBvbGljeTogcG9saWN5LmFnZW50U2VsZkRpc3BhdGNoICE9PSBmYWxzZSB9O1xuICAgIH1cbiAgICByZXR1cm4geyBwbGFuOiB0cnVlLCBwb2xpY3k6IHRydWUgfTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgaGFzUGVybWlzc2lvbihhY3RvcklkOiBzdHJpbmcsIHBlcm1pc3Npb246IFBlcm1pc3Npb24pOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICBpZiAoKGF3YWl0IHRoaXMuZ3JhbnRTb3VyY2UoYWN0b3JJZCwgcGVybWlzc2lvbikpID09PSBudWxsKSByZXR1cm4gZmFsc2U7XG4gICAgY29uc3QgYWxsb3dzID0gdGhpcy5hZ2VudENlaWxpbmdBbGxvd3MoYXdhaXQgdGhpcy5nZXRBY3RvclJvdyhhY3RvcklkKSwgcGVybWlzc2lvbiwgYXdhaXQgdGhpcy53b3Jrc3BhY2VSb3coKSk7XG4gICAgcmV0dXJuIGFsbG93cy5wbGFuICYmIGFsbG93cy5wb2xpY3k7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIHJlcXVpcmVQZXJtaXNzaW9uKGFjdG9ySWQ6IHN0cmluZywgcGVybWlzc2lvbjogUGVybWlzc2lvbik6IFByb21pc2U8dm9pZD4ge1xuICAgIGlmICghKGF3YWl0IHRoaXMuaGFzUGVybWlzc2lvbihhY3RvcklkLCBwZXJtaXNzaW9uKSkpIHtcbiAgICAgIHRocm93IG5ldyBQZXJtaXNzaW9uRGVuaWVkRXJyb3IocGVybWlzc2lvbiwgYWN0b3JJZCk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyByZXF1aXJlR292ZXJuYW5jZUFkbWluKGJ5QWN0b3JJZDogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgaWYgKGJ5QWN0b3JJZCA9PT0gdGhpcy5zeXN0ZW1BY3RvcklkKSByZXR1cm47XG4gICAgY29uc3QgYWN0b3IgPSBhd2FpdCB0aGlzLmdldEFjdG9yUm93KGJ5QWN0b3JJZCk7XG4gICAgaWYgKGFjdG9yPy5nb3Zlcm5hbmNlUm9sZSA9PT0gJ2FkbWluJykgcmV0dXJuO1xuICAgIHRocm93IG5ldyBQZXJtaXNzaW9uRGVuaWVkRXJyb3IoJ2dvdmVybmFuY2UuYWRtaW4nLCBieUFjdG9ySWQpO1xuICB9XG5cbiAgLyoqIEdyYW50LXRpbWUgcGxhbiBjZWlsaW5nOiByZWZ1c2UgaXNzdWluZyBhZ2VudCBnYXRlIHBlcm1pc3Npb25zIHRoZSBwbGFuIGZvcmJpZHMuICovXG4gIHByaXZhdGUgYXN5bmMgY2hlY2tHcmFudENlaWxpbmcoYWN0b3JJZDogc3RyaW5nLCBwZXJtaXNzaW9uOiBQZXJtaXNzaW9uKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgYWN0b3IgPSBhd2FpdCB0aGlzLmdldEFjdG9yUm93KGFjdG9ySWQpO1xuICAgIGlmICghYWN0b3IgfHwgYWN0b3IudHlwZSAhPT0gJ2FnZW50JykgcmV0dXJuO1xuICAgIGNvbnN0IHdvcmtzcGFjZSA9IGF3YWl0IHRoaXMud29ya3NwYWNlUm93KCk7XG4gICAgY29uc3QgY2VpbGluZyA9IFBMQU5fQ0VJTElOR1Nbd29ya3NwYWNlLnBsYW4gYXMgUGxhbkNvZGVdO1xuICAgIGlmICgoQUdFTlRfR0FURV9BUFBST1ZFX1BFUk1JU1NJT05TIGFzIHJlYWRvbmx5IHN0cmluZ1tdKS5pbmNsdWRlcyhwZXJtaXNzaW9uKSAmJiAhY2VpbGluZy5hZ2VudEdhdGVBcHByb3ZlKSB7XG4gICAgICB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcihgcGxhbiAke3dvcmtzcGFjZS5wbGFufSBkb2VzIG5vdCBhbGxvdyBhZ2VudHMgdG8gaG9sZCAke3Blcm1pc3Npb259YCk7XG4gICAgfVxuICAgIGlmIChwZXJtaXNzaW9uID09PSAnZ2F0ZS5yZXZpZXcucmVqZWN0JyAmJiAhY2VpbGluZy5hZ2VudEdhdGVSZWplY3QpIHtcbiAgICAgIHRocm93IG5ldyBHdWFyZEZhaWxlZEVycm9yKGBwbGFuICR7d29ya3NwYWNlLnBsYW59IGRvZXMgbm90IGFsbG93IGFnZW50cyB0byBob2xkICR7cGVybWlzc2lvbn1gKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIGxpdmVDbGFpbSh3b3JrSXRlbUlkOiBzdHJpbmcpOiBQcm9taXNlPENsYWltUm93IHwgbnVsbD4ge1xuICAgIGNvbnN0IHJvd3MgPSBhd2FpdCB0aGlzLmRiXG4gICAgICAuc2VsZWN0KClcbiAgICAgIC5mcm9tKGNsYWltcylcbiAgICAgIC53aGVyZShcbiAgICAgICAgYW5kKFxuICAgICAgICAgIGVxKGNsYWltcy53b3JrSXRlbUlkLCB3b3JrSXRlbUlkKSxcbiAgICAgICAgICBlcShjbGFpbXMucmVsZWFzZWQsIGZhbHNlKSxcbiAgICAgICAgICBndChjbGFpbXMubGVhc2VFeHBpcmVzQXQsIHRoaXMubm93KSxcbiAgICAgICAgKSxcbiAgICAgIClcbiAgICAgIC5vcmRlckJ5KGFzYyhjbGFpbXMuc2VxKSlcbiAgICAgIC5saW1pdCgxKTtcbiAgICByZXR1cm4gcm93c1swXSA/PyBudWxsO1xuICB9XG5cbiAgLyoqXG4gICAqIEEgUFJFU0VOVEVEIHRva2VuIGlzIGFsd2F5cyB2YWxpZGF0ZWQsIG9uIGV2ZXJ5IGNvbW1hbmQgKGNvbmZvcm1hbmNlXG4gICAqIHBpbiwgY2xhaW1zLnRlc3QudHMpOiBzdGFsZS9mb3JlaWduL25vLWxpdmUtY2xhaW0gXHUyMTkyIENvbmZsaWN0RXJyb3IgKyBhdWRpdFxuICAgKiBldmVudC4gVGhlIGF1ZGl0IGV2ZW50IGNvbW1pdHMgaW4gaXRzIE9XTiB0cmFuc2FjdGlvbiBcdTIwMTQgdGhlIGZhaWxpbmdcbiAgICogY29tbWFuZCdzIHRyYW5zYWN0aW9uIChpZiBhbnkpIG11c3Qgbm90IHN3YWxsb3cgaXQuXG4gICAqL1xuICBwcml2YXRlIGFzeW5jIHZhbGlkYXRlUHJlc2VudGVkVG9rZW4oXG4gICAgaXRlbTogV29ya0l0ZW1Sb3csXG4gICAgZmVuY2luZ1Rva2VuOiBudW1iZXIgfCB1bmRlZmluZWQsXG4gICAgYWN0b3JJZDogc3RyaW5nLFxuICApOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBpZiAoZmVuY2luZ1Rva2VuID09PSB1bmRlZmluZWQpIHJldHVybjtcbiAgICBjb25zdCBsaXZlID0gYXdhaXQgdGhpcy5saXZlQ2xhaW0oaXRlbS5pZCk7XG4gICAgaWYgKGxpdmUgPT09IG51bGwgfHwgbGl2ZS5mZW5jaW5nVG9rZW4gIT09IGZlbmNpbmdUb2tlbikge1xuICAgICAgYXdhaXQgdGhpcy5kYi50cmFuc2FjdGlvbihhc3luYyAodHgpID0+IHtcbiAgICAgICAgYXdhaXQgdGhpcy5hcHBlbmRUeCh0eCwgJ3dvcmtfaXRlbScsIGl0ZW0uaWQsICdmZW5jaW5nLnJlamVjdGVkJywgYWN0b3JJZCwge1xuICAgICAgICAgIHByZXNlbnRlZFRva2VuOiBmZW5jaW5nVG9rZW4sXG4gICAgICAgICAgbGl2ZVRva2VuOiBsaXZlPy5mZW5jaW5nVG9rZW4gPz8gbnVsbCxcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICAgIHRocm93IG5ldyBDb25mbGljdEVycm9yKGBzdGFsZSBvciBmb3JlaWduIGZlbmNpbmcgdG9rZW4gZm9yIHdvcmsgaXRlbSAke2l0ZW0uaWR9YCk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBwdWJsaWNJdGVtKHJvdzogV29ya0l0ZW1Sb3cpOiBXb3JrSXRlbSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGlkOiByb3cuaWQsXG4gICAgICBmZWF0dXJlSWQ6IHJvdy5mZWF0dXJlSWQsXG4gICAgICBleHRlcm5hbEtleTogcm93LmV4dGVybmFsS2V5LFxuICAgICAga2luZDogcm93LmtpbmQgYXMgV29ya0l0ZW1LaW5kLFxuICAgICAgdGl0bGU6IHJvdy50aXRsZSxcbiAgICAgIHN0YXRlOiByb3cuc3RhdGUgYXMgV29ya0l0ZW1TdGF0ZSxcbiAgICAgIGJsb2NrZWRSZWFzb246IChyb3cuYmxvY2tlZFJlYXNvbiBhcyBCbG9ja2VkUmVhc29uIHwgbnVsbCkgPz8gbnVsbCxcbiAgICAgIHJldmlld0xvb3BJdGVyYXRpb246IHJvdy5yZXZpZXdMb29wSXRlcmF0aW9uLFxuICAgICAgaW50ZW50SGFzaDogcm93LmludGVudEhhc2gsXG4gICAgICBwaW5uZWRWZXJpZmljYXRpb246IHJvdy5waW5uZWRWZXJpZmljYXRpb24gPyBbLi4ucm93LnBpbm5lZFZlcmlmaWNhdGlvbl0gOiBudWxsLFxuICAgICAgc3BlY0NoZWNrcG9pbnQ6IHJvdy5zcGVjQ2hlY2twb2ludCxcbiAgICAgIGRvbmVDaGVja3BvaW50OiByb3cuZG9uZUNoZWNrcG9pbnQsXG4gICAgICBpbnZva2VEZXZXaXRoOiByb3cuaW52b2tlRGV2V2l0aCxcbiAgICAgIHNwZWNQYXRoOiByb3cuc3BlY1BhdGgsXG4gICAgICBzdGF0ZVZlcnNpb246IHJvdy5zdGF0ZVZlcnNpb24sXG4gICAgfTtcbiAgfVxuXG4gIHByaXZhdGUgcHVibGljRmVhdHVyZShyb3c6IEZlYXR1cmVSb3cpOiBGZWF0dXJlIHtcbiAgICByZXR1cm4ge1xuICAgICAgaWQ6IHJvdy5pZCxcbiAgICAgIHN0YXRlOiByb3cuc3RhdGUgYXMgRmVhdHVyZVsnc3RhdGUnXSxcbiAgICAgIGRpc3BhdGNoSG9sZDogcm93LmRpc3BhdGNoSG9sZCxcbiAgICB9O1xuICB9XG5cbiAgcHJpdmF0ZSBwdWJsaWNDbGFpbShyb3c6IENsYWltUm93KTogQ2xhaW0ge1xuICAgIHJldHVybiB7XG4gICAgICBpZDogcm93LmlkLFxuICAgICAgd29ya0l0ZW1JZDogcm93LndvcmtJdGVtSWQsXG4gICAgICBhY3RvcklkOiByb3cuYWN0b3JJZCxcbiAgICAgIGZlbmNpbmdUb2tlbjogcm93LmZlbmNpbmdUb2tlbixcbiAgICAgIGxlYXNlRXhwaXJlc0F0OiByb3cubGVhc2VFeHBpcmVzQXQsXG4gICAgICByZWxlYXNlZDogcm93LnJlbGVhc2VkLFxuICAgIH07XG4gIH1cblxuICBwcml2YXRlIGV2ZW50RnJvbVJvdyhyb3c6IEV2ZW50Um93KTogU3BpbmVFdmVudCB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGdsb2JhbFNlcTogcm93Lmdsb2JhbFNlcSxcbiAgICAgIHN0cmVhbVR5cGU6IHJvdy5zdHJlYW1UeXBlIGFzIFNwaW5lRXZlbnRbJ3N0cmVhbVR5cGUnXSxcbiAgICAgIHN0cmVhbUlkOiByb3cuc3RyZWFtSWQsXG4gICAgICBzdHJlYW1TZXE6IHJvdy5zdHJlYW1TZXEsXG4gICAgICB0eXBlOiByb3cudHlwZSxcbiAgICAgIGFjdG9ySWQ6IHJvdy5hY3RvcklkLFxuICAgICAgcGF5bG9hZDogcm93LnBheWxvYWQsXG4gICAgICAuLi4ocm93LmNhdXNhdGlvbklkICE9PSBudWxsID8geyBjYXVzYXRpb25JZDogcm93LmNhdXNhdGlvbklkIH0gOiB7fSksXG4gICAgfTtcbiAgfVxuXG4gIC8vIC0tIHNldHVwIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgYXN5bmMgY3JlYXRlQWN0b3IoaW5wdXQ6IHtcbiAgICB0eXBlOiBFeGNsdWRlPEFjdG9yVHlwZSwgJ3N5c3RlbSc+O1xuICAgIGRpc3BsYXlOYW1lOiBzdHJpbmc7XG4gICAgZ292ZXJuYW5jZVJvbGU/OiBHb3Zlcm5hbmNlUm9sZTtcbiAgICBwZXJzb25hQ29kZT86IHN0cmluZztcbiAgfSk6IFByb21pc2U8QWN0b3I+IHtcbiAgICBjb25zdCBhY3RvcjogQWN0b3IgPSB7XG4gICAgICBpZDogdGhpcy5uZXh0SWQoJ2FjdG9yJyksXG4gICAgICB0eXBlOiBpbnB1dC50eXBlLFxuICAgICAgZGlzcGxheU5hbWU6IGlucHV0LmRpc3BsYXlOYW1lLFxuICAgICAgcGVyc29uYUNvZGU6IGlucHV0LnBlcnNvbmFDb2RlID8/IG51bGwsXG4gICAgfTtcbiAgICBhd2FpdCB0aGlzLmRiLmluc2VydChhY3RvcnMpLnZhbHVlcyh7XG4gICAgICBpZDogYWN0b3IuaWQsXG4gICAgICB0eXBlOiBhY3Rvci50eXBlLFxuICAgICAgZGlzcGxheU5hbWU6IGFjdG9yLmRpc3BsYXlOYW1lLFxuICAgICAgZ292ZXJuYW5jZVJvbGU6IGlucHV0LmdvdmVybmFuY2VSb2xlID8/ICdtZW1iZXInLFxuICAgICAgcGVyc29uYUNvZGU6IGFjdG9yLnBlcnNvbmFDb2RlLFxuICAgIH0pO1xuICAgIHJldHVybiBhY3RvcjtcbiAgfVxuXG4gIHByaXZhdGUgcHVibGljQWN0b3Iocm93OiBBY3RvclJvdyk6IEFjdG9yIHtcbiAgICByZXR1cm4ge1xuICAgICAgaWQ6IHJvdy5pZCxcbiAgICAgIHR5cGU6IHJvdy50eXBlIGFzIEFjdG9yVHlwZSxcbiAgICAgIGRpc3BsYXlOYW1lOiByb3cuZGlzcGxheU5hbWUsXG4gICAgICBwZXJzb25hQ29kZTogcm93LnBlcnNvbmFDb2RlID8/IG51bGwsXG4gICAgfTtcbiAgfVxuXG4gIC8qKiBBbGwgYWN0b3JzLCBwZXJzb25hcyBhbmQgc3lzdGVtIGluY2x1ZGVkICh0cmFuc3BhcmVuY3kgZm9yIHBpY2tlcnMvYXVkaXQpLiAqL1xuICBhc3luYyBsaXN0QWN0b3JzKCk6IFByb21pc2U8QWN0b3JbXT4ge1xuICAgIGNvbnN0IHJvd3MgPSBhd2FpdCB0aGlzLmRiLnNlbGVjdCgpLmZyb20oYWN0b3JzKS5vcmRlckJ5KGFzYyhhY3RvcnMuaWQpKTtcbiAgICByZXR1cm4gcm93cy5tYXAoKHJvdykgPT4gdGhpcy5wdWJsaWNBY3Rvcihyb3cpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBJZGVtcG90ZW50bHkgY3JlYXRlIHRoZSBzaXggQk1BRCBwZXJzb25hIGFnZW50IGFjdG9ycyB3aXRoIGZsb29yLXN0YXRlXG4gICAqIHJvbGVzIChQaGFzZSA0LCByb2FkbWFwIFx1MDBBNzMpLiBHYXRlZCB3cml0ZS4gSWRlbXBvdGVuY3kgaXMgRFVSQUJMRTogdGhlXG4gICAqIGxvb2t1cCBrZXlzIG9uIHRoZSBwZXJzaXN0ZWQgcGVyc29uYV9jb2RlIGNvbHVtbiwgc28gYSByZXN0YXJ0IG92ZXIgYW5cbiAgICogZXhpc3RpbmcgZGF0YSBkaXJlY3RvcnkgcmUtcHJvdmlzaW9ucyBub3RoaW5nLlxuICAgKi9cbiAgYXN5bmMgcHJvdmlzaW9uUGVyc29uYXMoaW5wdXQ6IHsgYnlBY3RvcklkOiBzdHJpbmcgfSk6IFByb21pc2U8QWN0b3JbXT4ge1xuICAgIGF3YWl0IHRoaXMucmVxdWlyZUdvdmVybmFuY2VBZG1pbihpbnB1dC5ieUFjdG9ySWQpO1xuICAgIGNvbnN0IHByb3Zpc2lvbmVkOiBBY3RvcltdID0gW107XG4gICAgZm9yIChjb25zdCBwZXJzb25hIG9mIFBFUlNPTkFTKSB7XG4gICAgICBjb25zdCBleGlzdGluZyA9IGF3YWl0IHRoaXMuZGJcbiAgICAgICAgLnNlbGVjdCgpXG4gICAgICAgIC5mcm9tKGFjdG9ycylcbiAgICAgICAgLndoZXJlKGVxKGFjdG9ycy5wZXJzb25hQ29kZSwgcGVyc29uYS5wZXJzb25hQ29kZSkpXG4gICAgICAgIC5vcmRlckJ5KGFzYyhhY3RvcnMuaWQpKVxuICAgICAgICAubGltaXQoMSk7XG4gICAgICBsZXQgYWN0b3I6IEFjdG9yO1xuICAgICAgaWYgKGV4aXN0aW5nWzBdKSB7XG4gICAgICAgIGFjdG9yID0gdGhpcy5wdWJsaWNBY3RvcihleGlzdGluZ1swXSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBhY3RvciA9IGF3YWl0IHRoaXMuY3JlYXRlQWN0b3Ioe1xuICAgICAgICAgIHR5cGU6ICdhZ2VudCcsXG4gICAgICAgICAgZGlzcGxheU5hbWU6IHBlcnNvbmEuZGlzcGxheU5hbWUsXG4gICAgICAgICAgcGVyc29uYUNvZGU6IHBlcnNvbmEucGVyc29uYUNvZGUsXG4gICAgICAgIH0pO1xuICAgICAgICBhd2FpdCB0aGlzLmRiLnRyYW5zYWN0aW9uKGFzeW5jICh0eCkgPT4ge1xuICAgICAgICAgIGF3YWl0IHRoaXMuYXBwZW5kVHgodHgsICdhY3RvcicsIGFjdG9yLmlkLCAnYWN0b3IucHJvdmlzaW9uZWQnLCBpbnB1dC5ieUFjdG9ySWQsIHtcbiAgICAgICAgICAgIHBlcnNvbmFDb2RlOiBwZXJzb25hLnBlcnNvbmFDb2RlLFxuICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIC8vIEZsb29yLXN0YXRlIHJvbGUgKHRoZXNpcyk6IGFzc2lnblJvbGUgaXMgaWRlbXBvdGVudC5cbiAgICAgIGF3YWl0IHRoaXMuYXNzaWduUm9sZSh7IGFjdG9ySWQ6IGFjdG9yLmlkLCByb2xlQ29kZTogcGVyc29uYS5kZWZhdWx0Um9sZSwgYnlBY3RvcklkOiBpbnB1dC5ieUFjdG9ySWQgfSk7XG4gICAgICBwcm92aXNpb25lZC5wdXNoKHsgLi4uYWN0b3IgfSk7XG4gICAgfVxuICAgIHJldHVybiBwcm92aXNpb25lZDtcbiAgfVxuXG4gIGFzeW5jIGdyYW50KGlucHV0OiB7IGFjdG9ySWQ6IHN0cmluZzsgcGVybWlzc2lvbjogUGVybWlzc2lvbjsgc2NvcGU/OiBzdHJpbmcgfSk6IFByb21pc2U8dm9pZD4ge1xuICAgIC8vIEdyYW50LXRpbWUgcGxhbiBjZWlsaW5nIHByZWNlZGVzIGFueSBlZmZlY3QgKFBoYXNlIDIgcGluKTogYSByZWZ1c2VkXG4gICAgLy8gZ3JhbnQgaW5zZXJ0cyBub3RoaW5nIGFuZCBhcHBlbmRzIG5vdGhpbmcuXG4gICAgYXdhaXQgdGhpcy5jaGVja0dyYW50Q2VpbGluZyhpbnB1dC5hY3RvcklkLCBpbnB1dC5wZXJtaXNzaW9uKTtcbiAgICBhd2FpdCB0aGlzLmRiLnRyYW5zYWN0aW9uKGFzeW5jICh0eCkgPT4ge1xuICAgICAgYXdhaXQgdHhcbiAgICAgICAgLmluc2VydChncmFudHMpXG4gICAgICAgIC52YWx1ZXMoeyBhY3RvcklkOiBpbnB1dC5hY3RvcklkLCBwZXJtaXNzaW9uOiBpbnB1dC5wZXJtaXNzaW9uLCBzY29wZTogaW5wdXQuc2NvcGUgPz8gbnVsbCB9KVxuICAgICAgICAub25Db25mbGljdERvTm90aGluZygpO1xuICAgICAgYXdhaXQgdGhpcy5hcHBlbmRUeCh0eCwgJ2FjdG9yJywgaW5wdXQuYWN0b3JJZCwgJ2dyYW50Lmlzc3VlZCcsIHRoaXMuc3lzdGVtQWN0b3JJZCwge1xuICAgICAgICBwZXJtaXNzaW9uOiBpbnB1dC5wZXJtaXNzaW9uLFxuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICBhc3luYyByZXZva2UoaW5wdXQ6IHsgYWN0b3JJZDogc3RyaW5nOyBwZXJtaXNzaW9uOiBQZXJtaXNzaW9uOyBzY29wZT86IHN0cmluZyB9KTogUHJvbWlzZTx2b2lkPiB7XG4gICAgYXdhaXQgdGhpcy5kYi50cmFuc2FjdGlvbihhc3luYyAodHgpID0+IHtcbiAgICAgIGF3YWl0IHR4XG4gICAgICAgIC5kZWxldGUoZ3JhbnRzKVxuICAgICAgICAud2hlcmUoYW5kKGVxKGdyYW50cy5hY3RvcklkLCBpbnB1dC5hY3RvcklkKSwgZXEoZ3JhbnRzLnBlcm1pc3Npb24sIGlucHV0LnBlcm1pc3Npb24pKSk7XG4gICAgICBhd2FpdCB0aGlzLmFwcGVuZFR4KHR4LCAnYWN0b3InLCBpbnB1dC5hY3RvcklkLCAnZ3JhbnQucmV2b2tlZCcsIHRoaXMuc3lzdGVtQWN0b3JJZCwge1xuICAgICAgICBwZXJtaXNzaW9uOiBpbnB1dC5wZXJtaXNzaW9uLFxuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICAvLyAtLSBlbnRpdGxlbWVudHMgKFBoYXNlIDIsIHJvYWRtYXAgXHUwMEE3MykgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIGFzeW5jIHNldEdvdmVybmFuY2VSb2xlKGlucHV0OiB7IGFjdG9ySWQ6IHN0cmluZzsgcm9sZTogR292ZXJuYW5jZVJvbGU7IGJ5QWN0b3JJZDogc3RyaW5nIH0pOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBhd2FpdCB0aGlzLnJlcXVpcmVHb3Zlcm5hbmNlQWRtaW4oaW5wdXQuYnlBY3RvcklkKTtcbiAgICBpZiAoKGF3YWl0IHRoaXMuZ2V0QWN0b3JSb3coaW5wdXQuYWN0b3JJZCkpID09PSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcihgdW5rbm93biBhY3RvcjogJHtpbnB1dC5hY3RvcklkfWApO1xuICAgIH1cbiAgICBhd2FpdCB0aGlzLmRiLnRyYW5zYWN0aW9uKGFzeW5jICh0eCkgPT4ge1xuICAgICAgYXdhaXQgdHgudXBkYXRlKGFjdG9ycykuc2V0KHsgZ292ZXJuYW5jZVJvbGU6IGlucHV0LnJvbGUgfSkud2hlcmUoZXEoYWN0b3JzLmlkLCBpbnB1dC5hY3RvcklkKSk7XG4gICAgICBhd2FpdCB0aGlzLmFwcGVuZFR4KHR4LCAnYWN0b3InLCBpbnB1dC5hY3RvcklkLCAnZ292ZXJuYW5jZS5jaGFuZ2VkJywgaW5wdXQuYnlBY3RvcklkLCB7IHJvbGU6IGlucHV0LnJvbGUgfSk7XG4gICAgfSk7XG4gIH1cblxuICBhc3luYyBnZXRHb3Zlcm5hbmNlUm9sZShhY3RvcklkOiBzdHJpbmcpOiBQcm9taXNlPEdvdmVybmFuY2VSb2xlPiB7XG4gICAgY29uc3QgYWN0b3IgPSBhd2FpdCB0aGlzLmdldEFjdG9yUm93KGFjdG9ySWQpO1xuICAgIHJldHVybiAoYWN0b3I/LmdvdmVybmFuY2VSb2xlIGFzIEdvdmVybmFuY2VSb2xlIHwgdW5kZWZpbmVkKSA/PyAnbWVtYmVyJztcbiAgfVxuXG4gIGFzeW5jIGFzc2lnblJvbGUoaW5wdXQ6IHsgYWN0b3JJZDogc3RyaW5nOyByb2xlQ29kZTogc3RyaW5nOyBieUFjdG9ySWQ6IHN0cmluZyB9KTogUHJvbWlzZTx2b2lkPiB7XG4gICAgYXdhaXQgdGhpcy5yZXF1aXJlR292ZXJuYW5jZUFkbWluKGlucHV0LmJ5QWN0b3JJZCk7XG4gICAgY29uc3QgYnVuZGxlID0gREVMSVZFUllfUk9MRVNbaW5wdXQucm9sZUNvZGVdO1xuICAgIGlmIChidW5kbGUgPT09IHVuZGVmaW5lZCkgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoYHVua25vd24gZGVsaXZlcnkgcm9sZTogJHtpbnB1dC5yb2xlQ29kZX1gKTtcbiAgICBpZiAoKGF3YWl0IHRoaXMuZ2V0QWN0b3JSb3coaW5wdXQuYWN0b3JJZCkpID09PSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcihgdW5rbm93biBhY3RvcjogJHtpbnB1dC5hY3RvcklkfWApO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IHBlcm1pc3Npb24gb2YgYnVuZGxlKSB7XG4gICAgICBhd2FpdCB0aGlzLmNoZWNrR3JhbnRDZWlsaW5nKGlucHV0LmFjdG9ySWQsIHBlcm1pc3Npb24pO1xuICAgIH1cbiAgICBjb25zdCBhY3RpdmUgPSBhd2FpdCB0aGlzLmRiXG4gICAgICAuc2VsZWN0KHsgc2VxOiByb2xlQXNzaWdubWVudHMuc2VxIH0pXG4gICAgICAuZnJvbShyb2xlQXNzaWdubWVudHMpXG4gICAgICAud2hlcmUoXG4gICAgICAgIGFuZChcbiAgICAgICAgICBlcShyb2xlQXNzaWdubWVudHMuYWN0b3JJZCwgaW5wdXQuYWN0b3JJZCksXG4gICAgICAgICAgZXEocm9sZUFzc2lnbm1lbnRzLnJvbGVDb2RlLCBpbnB1dC5yb2xlQ29kZSksXG4gICAgICAgICAgZXEocm9sZUFzc2lnbm1lbnRzLnJldm9rZWQsIGZhbHNlKSxcbiAgICAgICAgKSxcbiAgICAgIClcbiAgICAgIC5saW1pdCgxKTtcbiAgICBpZiAoYWN0aXZlLmxlbmd0aCA+IDApIHJldHVybjsgLy8gaWRlbXBvdGVudFxuICAgIGF3YWl0IHRoaXMuZGIudHJhbnNhY3Rpb24oYXN5bmMgKHR4KSA9PiB7XG4gICAgICBhd2FpdCB0eC5pbnNlcnQocm9sZUFzc2lnbm1lbnRzKS52YWx1ZXMoe1xuICAgICAgICBhY3RvcklkOiBpbnB1dC5hY3RvcklkLFxuICAgICAgICByb2xlQ29kZTogaW5wdXQucm9sZUNvZGUsXG4gICAgICAgIGdyYW50ZWRCeTogaW5wdXQuYnlBY3RvcklkLFxuICAgICAgICByZXZva2VkOiBmYWxzZSxcbiAgICAgIH0pO1xuICAgICAgYXdhaXQgdGhpcy5hcHBlbmRUeCh0eCwgJ2FjdG9yJywgaW5wdXQuYWN0b3JJZCwgJ3JvbGUuYXNzaWduZWQnLCBpbnB1dC5ieUFjdG9ySWQsIHtcbiAgICAgICAgcm9sZUNvZGU6IGlucHV0LnJvbGVDb2RlLFxuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICBhc3luYyByZXZva2VSb2xlKGlucHV0OiB7IGFjdG9ySWQ6IHN0cmluZzsgcm9sZUNvZGU6IHN0cmluZzsgYnlBY3RvcklkOiBzdHJpbmcgfSk6IFByb21pc2U8dm9pZD4ge1xuICAgIGF3YWl0IHRoaXMucmVxdWlyZUdvdmVybmFuY2VBZG1pbihpbnB1dC5ieUFjdG9ySWQpO1xuICAgIGlmIChERUxJVkVSWV9ST0xFU1tpbnB1dC5yb2xlQ29kZV0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoYHVua25vd24gZGVsaXZlcnkgcm9sZTogJHtpbnB1dC5yb2xlQ29kZX1gKTtcbiAgICB9XG4gICAgYXdhaXQgdGhpcy5kYi50cmFuc2FjdGlvbihhc3luYyAodHgpID0+IHtcbiAgICAgIGF3YWl0IHR4XG4gICAgICAgIC51cGRhdGUocm9sZUFzc2lnbm1lbnRzKVxuICAgICAgICAuc2V0KHsgcmV2b2tlZDogdHJ1ZSB9KVxuICAgICAgICAud2hlcmUoXG4gICAgICAgICAgYW5kKFxuICAgICAgICAgICAgZXEocm9sZUFzc2lnbm1lbnRzLmFjdG9ySWQsIGlucHV0LmFjdG9ySWQpLFxuICAgICAgICAgICAgZXEocm9sZUFzc2lnbm1lbnRzLnJvbGVDb2RlLCBpbnB1dC5yb2xlQ29kZSksXG4gICAgICAgICAgICBlcShyb2xlQXNzaWdubWVudHMucmV2b2tlZCwgZmFsc2UpLFxuICAgICAgICAgICksXG4gICAgICAgICk7XG4gICAgICBhd2FpdCB0aGlzLmFwcGVuZFR4KHR4LCAnYWN0b3InLCBpbnB1dC5hY3RvcklkLCAncm9sZS5yZXZva2VkJywgaW5wdXQuYnlBY3RvcklkLCB7XG4gICAgICAgIHJvbGVDb2RlOiBpbnB1dC5yb2xlQ29kZSxcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgYXN5bmMgbGlzdFJvbGVBc3NpZ25tZW50cyhhY3RvcklkPzogc3RyaW5nKTogUHJvbWlzZTxSb2xlQXNzaWdubWVudFtdPiB7XG4gICAgY29uc3Qgcm93cyA9XG4gICAgICBhY3RvcklkID09PSB1bmRlZmluZWRcbiAgICAgICAgPyBhd2FpdCB0aGlzLmRiLnNlbGVjdCgpLmZyb20ocm9sZUFzc2lnbm1lbnRzKS5vcmRlckJ5KGFzYyhyb2xlQXNzaWdubWVudHMuc2VxKSlcbiAgICAgICAgOiBhd2FpdCB0aGlzLmRiXG4gICAgICAgICAgICAuc2VsZWN0KClcbiAgICAgICAgICAgIC5mcm9tKHJvbGVBc3NpZ25tZW50cylcbiAgICAgICAgICAgIC53aGVyZShlcShyb2xlQXNzaWdubWVudHMuYWN0b3JJZCwgYWN0b3JJZCkpXG4gICAgICAgICAgICAub3JkZXJCeShhc2Mocm9sZUFzc2lnbm1lbnRzLnNlcSkpO1xuICAgIHJldHVybiByb3dzLm1hcCgocm93KSA9PiAoe1xuICAgICAgYWN0b3JJZDogcm93LmFjdG9ySWQsXG4gICAgICByb2xlQ29kZTogcm93LnJvbGVDb2RlLFxuICAgICAgZ3JhbnRlZEJ5OiByb3cuZ3JhbnRlZEJ5LFxuICAgICAgcmV2b2tlZDogcm93LnJldm9rZWQsXG4gICAgfSkpO1xuICB9XG5cbiAgYXN5bmMgc2V0UGxhbihpbnB1dDogeyBwbGFuOiBQbGFuQ29kZTsgYnlBY3RvcklkOiBzdHJpbmcgfSk6IFByb21pc2U8dm9pZD4ge1xuICAgIGF3YWl0IHRoaXMucmVxdWlyZUdvdmVybmFuY2VBZG1pbihpbnB1dC5ieUFjdG9ySWQpO1xuICAgIGlmIChQTEFOX0NFSUxJTkdTW2lucHV0LnBsYW5dID09PSB1bmRlZmluZWQpIHRocm93IG5ldyBHdWFyZEZhaWxlZEVycm9yKGB1bmtub3duIHBsYW46ICR7aW5wdXQucGxhbn1gKTtcbiAgICBjb25zdCB3b3Jrc3BhY2UgPSBhd2FpdCB0aGlzLndvcmtzcGFjZVJvdygpO1xuICAgIGNvbnN0IHBsYW5WZXJzaW9uID0gd29ya3NwYWNlLnBsYW5WZXJzaW9uICsgMTtcbiAgICBhd2FpdCB0aGlzLmRiLnRyYW5zYWN0aW9uKGFzeW5jICh0eCkgPT4ge1xuICAgICAgYXdhaXQgdHhcbiAgICAgICAgLnVwZGF0ZSh3b3Jrc3BhY2VTdGF0ZSlcbiAgICAgICAgLnNldCh7IHBsYW46IGlucHV0LnBsYW4sIHBsYW5WZXJzaW9uIH0pXG4gICAgICAgIC53aGVyZShlcSh3b3Jrc3BhY2VTdGF0ZS5pZCwgV09SS1NQQUNFX0lEKSk7XG4gICAgICBhd2FpdCB0aGlzLmFwcGVuZFR4KHR4LCAnd29ya3NwYWNlJywgV09SS1NQQUNFX0lELCAncGxhbi5jaGFuZ2VkJywgaW5wdXQuYnlBY3RvcklkLCB7XG4gICAgICAgIHBsYW46IGlucHV0LnBsYW4sXG4gICAgICAgIHBsYW5WZXJzaW9uLFxuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICBhc3luYyBnZXRQbGFuKCk6IFByb21pc2U8UGxhbkNvZGU+IHtcbiAgICByZXR1cm4gKGF3YWl0IHRoaXMud29ya3NwYWNlUm93KCkpLnBsYW4gYXMgUGxhbkNvZGU7XG4gIH1cblxuICBhc3luYyBzZXRXb3Jrc3BhY2VQb2xpY3koaW5wdXQ6IHsgcG9saWN5OiBXb3Jrc3BhY2VQb2xpY3k7IGJ5QWN0b3JJZDogc3RyaW5nIH0pOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBhd2FpdCB0aGlzLnJlcXVpcmVHb3Zlcm5hbmNlQWRtaW4oaW5wdXQuYnlBY3RvcklkKTtcbiAgICBjb25zdCB3b3Jrc3BhY2UgPSBhd2FpdCB0aGlzLndvcmtzcGFjZVJvdygpO1xuICAgIGNvbnN0IG1lcmdlZDogV29ya3NwYWNlUG9saWN5ID0geyAuLi4od29ya3NwYWNlLnBvbGljeSBhcyBXb3Jrc3BhY2VQb2xpY3kpLCAuLi5pbnB1dC5wb2xpY3kgfTtcbiAgICBjb25zdCBwb2xpY3lWZXJzaW9uID0gd29ya3NwYWNlLnBvbGljeVZlcnNpb24gKyAxO1xuICAgIGF3YWl0IHRoaXMuZGIudHJhbnNhY3Rpb24oYXN5bmMgKHR4KSA9PiB7XG4gICAgICBhd2FpdCB0eFxuICAgICAgICAudXBkYXRlKHdvcmtzcGFjZVN0YXRlKVxuICAgICAgICAuc2V0KHsgcG9saWN5OiBtZXJnZWQgYXMgUmVjb3JkPHN0cmluZywgdW5rbm93bj4sIHBvbGljeVZlcnNpb24gfSlcbiAgICAgICAgLndoZXJlKGVxKHdvcmtzcGFjZVN0YXRlLmlkLCBXT1JLU1BBQ0VfSUQpKTtcbiAgICAgIGF3YWl0IHRoaXMuYXBwZW5kVHgodHgsICd3b3Jrc3BhY2UnLCBXT1JLU1BBQ0VfSUQsICdwb2xpY3kuY2hhbmdlZCcsIGlucHV0LmJ5QWN0b3JJZCwge1xuICAgICAgICBwb2xpY3k6IHsgLi4ubWVyZ2VkIH0sXG4gICAgICAgIHBvbGljeVZlcnNpb24sXG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuXG4gIGFzeW5jIGdldFdvcmtzcGFjZVBvbGljeSgpOiBQcm9taXNlPFdvcmtzcGFjZVBvbGljeT4ge1xuICAgIHJldHVybiB7IC4uLigoYXdhaXQgdGhpcy53b3Jrc3BhY2VSb3coKSkucG9saWN5IGFzIFdvcmtzcGFjZVBvbGljeSkgfTtcbiAgfVxuXG4gIGFzeW5jIHNldEdhdGVQb2xpY3koaW5wdXQ6IHsgZ2F0ZTogR2F0ZUNvZGU7IHBvbGljeTogR2F0ZVBvbGljeTsgYnlBY3RvcklkOiBzdHJpbmcgfSk6IFByb21pc2U8dm9pZD4ge1xuICAgIGF3YWl0IHRoaXMucmVxdWlyZUdvdmVybmFuY2VBZG1pbihpbnB1dC5ieUFjdG9ySWQpO1xuICAgIGNvbnN0IG1pbkFwcHJvdmFscyA9IGlucHV0LnBvbGljeS5taW5BcHByb3ZhbHMgPz8gMTtcbiAgICBpZiAoIU51bWJlci5pc0ludGVnZXIobWluQXBwcm92YWxzKSB8fCBtaW5BcHByb3ZhbHMgPCAxKSB7XG4gICAgICB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcignbWluQXBwcm92YWxzIG11c3QgYmUgYSBwb3NpdGl2ZSBpbnRlZ2VyJyk7XG4gICAgfVxuICAgIGF3YWl0IHRoaXMuZGIudHJhbnNhY3Rpb24oYXN5bmMgKHR4KSA9PiB7XG4gICAgICBhd2FpdCB0eFxuICAgICAgICAuaW5zZXJ0KGdhdGVQb2xpY2llcylcbiAgICAgICAgLnZhbHVlcyh7IGdhdGU6IGlucHV0LmdhdGUsIHBvbGljeTogeyAuLi5pbnB1dC5wb2xpY3kgfSBhcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiB9KVxuICAgICAgICAub25Db25mbGljdERvVXBkYXRlKHtcbiAgICAgICAgICB0YXJnZXQ6IGdhdGVQb2xpY2llcy5nYXRlLFxuICAgICAgICAgIHNldDogeyBwb2xpY3k6IHsgLi4uaW5wdXQucG9saWN5IH0gYXMgUmVjb3JkPHN0cmluZywgdW5rbm93bj4gfSxcbiAgICAgICAgfSk7XG4gICAgICBhd2FpdCB0aGlzLmFwcGVuZFR4KHR4LCAnd29ya3NwYWNlJywgV09SS1NQQUNFX0lELCAnZ2F0ZV9wb2xpY3kuY2hhbmdlZCcsIGlucHV0LmJ5QWN0b3JJZCwge1xuICAgICAgICBnYXRlOiBpbnB1dC5nYXRlLFxuICAgICAgICBwb2xpY3k6IHsgLi4uaW5wdXQucG9saWN5IH0sXG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuXG4gIGFzeW5jIGdldEdhdGVQb2xpY3koZ2F0ZTogR2F0ZUNvZGUpOiBQcm9taXNlPEdhdGVQb2xpY3k+IHtcbiAgICBjb25zdCByb3dzID0gYXdhaXQgdGhpcy5kYi5zZWxlY3QoKS5mcm9tKGdhdGVQb2xpY2llcykud2hlcmUoZXEoZ2F0ZVBvbGljaWVzLmdhdGUsIGdhdGUpKS5saW1pdCgxKTtcbiAgICByZXR1cm4geyAuLi4oKHJvd3NbMF0/LnBvbGljeSBhcyBHYXRlUG9saWN5IHwgdW5kZWZpbmVkKSA/PyB7fSkgfTtcbiAgfVxuXG4gIGFzeW5jIGF1dGh6RXhwbGFpbihpbnB1dDogeyBhY3RvcklkOiBzdHJpbmc7IHBlcm1pc3Npb246IFBlcm1pc3Npb24gfSk6IFByb21pc2U8QXV0aHpFeHBsYW5hdGlvbj4ge1xuICAgIGNvbnN0IHNvdXJjZSA9IGF3YWl0IHRoaXMuZ3JhbnRTb3VyY2UoaW5wdXQuYWN0b3JJZCwgaW5wdXQucGVybWlzc2lvbik7XG4gICAgY29uc3QgYWN0b3IgPSBhd2FpdCB0aGlzLmdldEFjdG9yUm93KGlucHV0LmFjdG9ySWQpO1xuICAgIGNvbnN0IHdvcmtzcGFjZSA9IGF3YWl0IHRoaXMud29ya3NwYWNlUm93KCk7XG4gICAgY29uc3QgYWxsb3dzID0gdGhpcy5hZ2VudENlaWxpbmdBbGxvd3MoYWN0b3IsIGlucHV0LnBlcm1pc3Npb24sIHdvcmtzcGFjZSk7XG4gICAgcmV0dXJuIHtcbiAgICAgIGFjdG9ySWQ6IGlucHV0LmFjdG9ySWQsXG4gICAgICBwZXJtaXNzaW9uOiBpbnB1dC5wZXJtaXNzaW9uLFxuICAgICAgYWxsb3dlZDogc291cmNlICE9PSBudWxsICYmIGFsbG93cy5wbGFuICYmIGFsbG93cy5wb2xpY3ksXG4gICAgICBzb3VyY2UsXG4gICAgICBnb3Zlcm5hbmNlUm9sZTogKGFjdG9yPy5nb3Zlcm5hbmNlUm9sZSBhcyBHb3Zlcm5hbmNlUm9sZSB8IHVuZGVmaW5lZCkgPz8gJ21lbWJlcicsXG4gICAgICBwbGFuOiB3b3Jrc3BhY2UucGxhbiBhcyBQbGFuQ29kZSxcbiAgICAgIHBsYW5BbGxvd3M6IGFsbG93cy5wbGFuLFxuICAgICAgcG9saWN5QWxsb3dzOiBhbGxvd3MucG9saWN5LFxuICAgICAgdmVyc2lvbnM6IHsgcGxhbjogd29ya3NwYWNlLnBsYW5WZXJzaW9uLCBwb2xpY3k6IHdvcmtzcGFjZS5wb2xpY3lWZXJzaW9uIH0sXG4gICAgfTtcbiAgfVxuXG4gIGFzeW5jIGNyZWF0ZUZlYXR1cmUoaW5wdXQ6IHsgYWN0b3JJZDogc3RyaW5nIH0pOiBQcm9taXNlPEZlYXR1cmU+IHtcbiAgICBjb25zdCBpZCA9IHRoaXMubmV4dElkKCdmZWF0Jyk7XG4gICAgcmV0dXJuIHRoaXMuZGIudHJhbnNhY3Rpb24oYXN5bmMgKHR4KSA9PiB7XG4gICAgICBhd2FpdCB0eC5pbnNlcnQoZmVhdHVyZXMpLnZhbHVlcyh7IGlkLCBzdGF0ZTogJ2JhY2tsb2cnLCBkaXNwYXRjaEhvbGQ6IGZhbHNlIH0pO1xuICAgICAgYXdhaXQgdGhpcy5hcHBlbmRUeCh0eCwgJ2ZlYXR1cmUnLCBpZCwgJ2ZlYXR1cmUuY3JlYXRlZCcsIGlucHV0LmFjdG9ySWQsIHt9KTtcbiAgICAgIHJldHVybiB7IGlkLCBzdGF0ZTogJ2JhY2tsb2cnIGFzIGNvbnN0LCBkaXNwYXRjaEhvbGQ6IGZhbHNlIH07XG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIGNyZWF0ZVdvcmtJdGVtVHgodHg6IFF1ZXJ5YWJsZSwgaW5wdXQ6IENyZWF0ZVdvcmtJdGVtSW5wdXQgJiB7IGFjdG9ySWQ6IHN0cmluZyB9KTogUHJvbWlzZTxXb3JrSXRlbT4ge1xuICAgIGNvbnN0IHNsdWcgPSBpbnB1dC50aXRsZVxuICAgICAgLnRvTG93ZXJDYXNlKClcbiAgICAgIC5yZXBsYWNlKC9bXmEtejAtOV0rL2csICctJylcbiAgICAgIC5yZXBsYWNlKC8oXi18LSQpL2csICcnKTtcbiAgICBjb25zdCByb3c6IFdvcmtJdGVtUm93ID0ge1xuICAgICAgaWQ6IHRoaXMubmV4dElkKCd3aScpLFxuICAgICAgc2VxOiAwLCAvLyBhc3NpZ25lZCBieSB0aGUgc2VyaWFsOyBwbGFjZWhvbGRlciBmb3IgdGhlIGxvY2FsIGNvcHkgb25seVxuICAgICAgZmVhdHVyZUlkOiBpbnB1dC5mZWF0dXJlSWQsXG4gICAgICBleHRlcm5hbEtleTogaW5wdXQuZXh0ZXJuYWxLZXksXG4gICAgICBraW5kOiBpbnB1dC5raW5kID8/ICdjb2RlJyxcbiAgICAgIHRpdGxlOiBpbnB1dC50aXRsZSxcbiAgICAgIHN0YXRlOiAnYmFja2xvZycsXG4gICAgICBibG9ja2VkUmVhc29uOiBudWxsLFxuICAgICAgcmV2aWV3TG9vcEl0ZXJhdGlvbjogMCxcbiAgICAgIGludGVudEhhc2g6IG51bGwsXG4gICAgICBwaW5uZWRWZXJpZmljYXRpb246IG51bGwsXG4gICAgICBzcGVjQ2hlY2twb2ludDogaW5wdXQuc3BlY0NoZWNrcG9pbnQgPz8gZmFsc2UsXG4gICAgICBkb25lQ2hlY2twb2ludDogaW5wdXQuZG9uZUNoZWNrcG9pbnQgPz8gZmFsc2UsXG4gICAgICBpbnZva2VEZXZXaXRoOiBpbnB1dC5pbnZva2VEZXZXaXRoID8/ICcnLFxuICAgICAgc3BlY1BhdGg6IGBzdG9yaWVzLyR7aW5wdXQuZXh0ZXJuYWxLZXl9LSR7c2x1Z30ubWRgLFxuICAgICAgc3RhdGVWZXJzaW9uOiAwLFxuICAgICAgZGVwZW5kc09uOiBpbnB1dC5kZXBlbmRzT24gPyBbLi4uaW5wdXQuZGVwZW5kc09uXSA6IFtdLFxuICAgICAgbGFzdEZlbmNpbmdUb2tlbjogMCxcbiAgICB9O1xuICAgIGF3YWl0IHR4Lmluc2VydCh3b3JrSXRlbXMpLnZhbHVlcyh7XG4gICAgICBpZDogcm93LmlkLFxuICAgICAgZmVhdHVyZUlkOiByb3cuZmVhdHVyZUlkLFxuICAgICAgZXh0ZXJuYWxLZXk6IHJvdy5leHRlcm5hbEtleSxcbiAgICAgIGtpbmQ6IHJvdy5raW5kLFxuICAgICAgdGl0bGU6IHJvdy50aXRsZSxcbiAgICAgIHN0YXRlOiByb3cuc3RhdGUsXG4gICAgICBibG9ja2VkUmVhc29uOiByb3cuYmxvY2tlZFJlYXNvbixcbiAgICAgIHJldmlld0xvb3BJdGVyYXRpb246IHJvdy5yZXZpZXdMb29wSXRlcmF0aW9uLFxuICAgICAgaW50ZW50SGFzaDogcm93LmludGVudEhhc2gsXG4gICAgICBwaW5uZWRWZXJpZmljYXRpb246IHJvdy5waW5uZWRWZXJpZmljYXRpb24sXG4gICAgICBzcGVjQ2hlY2twb2ludDogcm93LnNwZWNDaGVja3BvaW50LFxuICAgICAgZG9uZUNoZWNrcG9pbnQ6IHJvdy5kb25lQ2hlY2twb2ludCxcbiAgICAgIGludm9rZURldldpdGg6IHJvdy5pbnZva2VEZXZXaXRoLFxuICAgICAgc3BlY1BhdGg6IHJvdy5zcGVjUGF0aCxcbiAgICAgIHN0YXRlVmVyc2lvbjogcm93LnN0YXRlVmVyc2lvbixcbiAgICAgIGRlcGVuZHNPbjogcm93LmRlcGVuZHNPbixcbiAgICAgIGxhc3RGZW5jaW5nVG9rZW46IHJvdy5sYXN0RmVuY2luZ1Rva2VuLFxuICAgIH0pO1xuICAgIGF3YWl0IHRoaXMuYXBwZW5kVHgodHgsICd3b3JrX2l0ZW0nLCByb3cuaWQsICd3b3JrX2l0ZW0uY3JlYXRlZCcsIGlucHV0LmFjdG9ySWQsIHtcbiAgICAgIGV4dGVybmFsS2V5OiByb3cuZXh0ZXJuYWxLZXksXG4gICAgICBmZWF0dXJlSWQ6IHJvdy5mZWF0dXJlSWQsXG4gICAgfSk7XG4gICAgcmV0dXJuIHRoaXMucHVibGljSXRlbShyb3cpO1xuICB9XG5cbiAgYXN5bmMgY3JlYXRlV29ya0l0ZW0oaW5wdXQ6IENyZWF0ZVdvcmtJdGVtSW5wdXQgJiB7IGFjdG9ySWQ6IHN0cmluZyB9KTogUHJvbWlzZTxXb3JrSXRlbT4ge1xuICAgIHJldHVybiB0aGlzLmRiLnRyYW5zYWN0aW9uKGFzeW5jICh0eCkgPT4gdGhpcy5jcmVhdGVXb3JrSXRlbVR4KHR4LCBpbnB1dCkpO1xuICB9XG5cbiAgYXN5bmMgaW1wb3J0U3RvcmllcyhpbnB1dDogeyBmZWF0dXJlSWQ6IHN0cmluZzsgeWFtbDogc3RyaW5nOyBhY3RvcklkOiBzdHJpbmcgfSk6IFByb21pc2U8U3Rvcmllc0ltcG9ydFJlc3VsdD4ge1xuICAgIGNvbnN0IGVudHJpZXMgPSBwYXJzZVN0b3JpZXMoaW5wdXQueWFtbCk7XG4gICAgY29uc3QgZmVhdHVyZSA9IGF3YWl0IHRoaXMuZ2V0RmVhdHVyZVJvdyhpbnB1dC5mZWF0dXJlSWQpO1xuICAgIGlmICghZmVhdHVyZSkge1xuICAgICAgdGhyb3cgbmV3IFN0b3JpZXNWYWxpZGF0aW9uRXJyb3IoYHVua25vd24gZmVhdHVyZTogJHtpbnB1dC5mZWF0dXJlSWR9YCk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmRiLnRyYW5zYWN0aW9uKGFzeW5jICh0eCkgPT4ge1xuICAgICAgY29uc3QgaW1wb3J0ZWQ6IHN0cmluZ1tdID0gW107XG4gICAgICBjb25zdCB1cGRhdGVkOiBzdHJpbmdbXSA9IFtdO1xuICAgICAgY29uc3Qgd2FybmluZ3M6IHN0cmluZ1tdID0gW107XG4gICAgICBmb3IgKGNvbnN0IGVudHJ5IG9mIGVudHJpZXMpIHtcbiAgICAgICAgY29uc3QgZXhpc3RpbmcgPSAoXG4gICAgICAgICAgYXdhaXQgdHhcbiAgICAgICAgICAgIC5zZWxlY3QoKVxuICAgICAgICAgICAgLmZyb20od29ya0l0ZW1zKVxuICAgICAgICAgICAgLndoZXJlKGFuZChlcSh3b3JrSXRlbXMuZmVhdHVyZUlkLCBpbnB1dC5mZWF0dXJlSWQpLCBlcSh3b3JrSXRlbXMuZXh0ZXJuYWxLZXksIGVudHJ5LmlkKSkpXG4gICAgICAgICAgICAub3JkZXJCeShhc2Mod29ya0l0ZW1zLnNlcSkpXG4gICAgICAgICAgICAubGltaXQoMSlcbiAgICAgICAgKVswXTtcbiAgICAgICAgaWYgKGV4aXN0aW5nKSB7XG4gICAgICAgICAgLy8gUmUtaW1wb3J0IHJlZnJlc2hlcyBkZXNjcmlwdGl2ZSBmaWVsZHM7IGxpZmVjeWNsZSBzdGF0ZSBpcyBuZXZlclxuICAgICAgICAgIC8vIHRvdWNoZWQgKHN0b3JpZXMueWFtbCBjYXJyaWVzIG5vIHN0YXR1cyBcdTIwMTQgRDksIHZhbGlkaXR5IHJ1bGUgMykuXG4gICAgICAgICAgYXdhaXQgdHhcbiAgICAgICAgICAgIC51cGRhdGUod29ya0l0ZW1zKVxuICAgICAgICAgICAgLnNldCh7XG4gICAgICAgICAgICAgIHRpdGxlOiBlbnRyeS50aXRsZSxcbiAgICAgICAgICAgICAgc3BlY0NoZWNrcG9pbnQ6IGVudHJ5LnNwZWNDaGVja3BvaW50LFxuICAgICAgICAgICAgICBkb25lQ2hlY2twb2ludDogZW50cnkuZG9uZUNoZWNrcG9pbnQsXG4gICAgICAgICAgICAgIGludm9rZURldldpdGg6IGVudHJ5Lmludm9rZURldldpdGgsXG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLndoZXJlKGVxKHdvcmtJdGVtcy5pZCwgZXhpc3RpbmcuaWQpKTtcbiAgICAgICAgICBhd2FpdCB0aGlzLmFwcGVuZFR4KHR4LCAnd29ya19pdGVtJywgZXhpc3RpbmcuaWQsICd3b3JrX2l0ZW0ucmVpbXBvcnRlZCcsIGlucHV0LmFjdG9ySWQsIHtcbiAgICAgICAgICAgIGV4dGVybmFsS2V5OiBlbnRyeS5pZCxcbiAgICAgICAgICB9KTtcbiAgICAgICAgICB1cGRhdGVkLnB1c2goZW50cnkuaWQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGF3YWl0IHRoaXMuY3JlYXRlV29ya0l0ZW1UeCh0eCwge1xuICAgICAgICAgICAgZmVhdHVyZUlkOiBpbnB1dC5mZWF0dXJlSWQsXG4gICAgICAgICAgICBleHRlcm5hbEtleTogZW50cnkuaWQsXG4gICAgICAgICAgICB0aXRsZTogZW50cnkudGl0bGUsXG4gICAgICAgICAgICBzcGVjQ2hlY2twb2ludDogZW50cnkuc3BlY0NoZWNrcG9pbnQsXG4gICAgICAgICAgICBkb25lQ2hlY2twb2ludDogZW50cnkuZG9uZUNoZWNrcG9pbnQsXG4gICAgICAgICAgICBpbnZva2VEZXZXaXRoOiBlbnRyeS5pbnZva2VEZXZXaXRoLFxuICAgICAgICAgICAgYWN0b3JJZDogaW5wdXQuYWN0b3JJZCxcbiAgICAgICAgICB9KTtcbiAgICAgICAgICBpbXBvcnRlZC5wdXNoKGVudHJ5LmlkKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIHsgaW1wb3J0ZWQsIHVwZGF0ZWQsIHdhcm5pbmdzIH07XG4gICAgfSk7XG4gIH1cblxuICAvLyAtLSBjbGFpbXMgKHJvYWRtYXAgXHUwMEE3MS4zKSAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICBhc3luYyBjbGFpbVRhc2soaW5wdXQ6IHsgd29ya0l0ZW1JZDogc3RyaW5nOyBhY3RvcklkOiBzdHJpbmc7IHR0bE1zPzogbnVtYmVyIH0pOiBQcm9taXNlPENsYWltPiB7XG4gICAgY29uc3QgaXRlbSA9IGF3YWl0IHRoaXMubXVzdEdldEl0ZW0oaW5wdXQud29ya0l0ZW1JZCk7XG4gICAgYXdhaXQgdGhpcy5yZXF1aXJlUGVybWlzc2lvbihpbnB1dC5hY3RvcklkLCAndGFzay5jbGFpbScpO1xuICAgIGNvbnN0IHR0bE1zID0gaW5wdXQudHRsTXMgPz8gMTUgKiA2MCAqIDEwMDA7XG4gICAgY29uc3QgY2xhaW1JZCA9IHRoaXMubmV4dElkKCdjbGFpbScpO1xuICAgIHRyeSB7XG4gICAgICByZXR1cm4gYXdhaXQgdGhpcy5kYi50cmFuc2FjdGlvbihhc3luYyAodHgpID0+IHtcbiAgICAgICAgLy8gU3dlZXA6IGFuIEVYUElSRUQgbGVhc2UgcmV0dXJucyB0aGUgaXRlbSB0byB0aGUgcG9vbCBcdTIwMTQgZmxpcCBpdHNcbiAgICAgICAgLy8gcmVsZWFzZWQgZmxhZyBzbyB0aGUgcGFydGlhbCB1bmlxdWUgaW5kZXggb25seSBndWFyZHMgbGl2ZSBjbGFpbXMuXG4gICAgICAgIGF3YWl0IHR4XG4gICAgICAgICAgLnVwZGF0ZShjbGFpbXMpXG4gICAgICAgICAgLnNldCh7IHJlbGVhc2VkOiB0cnVlIH0pXG4gICAgICAgICAgLndoZXJlKFxuICAgICAgICAgICAgYW5kKFxuICAgICAgICAgICAgICBlcShjbGFpbXMud29ya0l0ZW1JZCwgaXRlbS5pZCksXG4gICAgICAgICAgICAgIGVxKGNsYWltcy5yZWxlYXNlZCwgZmFsc2UpLFxuICAgICAgICAgICAgICBsdGUoY2xhaW1zLmxlYXNlRXhwaXJlc0F0LCB0aGlzLm5vdyksXG4gICAgICAgICAgICApLFxuICAgICAgICAgICk7XG4gICAgICAgIC8vIE1vbm90b25pYyBmZW5jaW5nIHRva2VuIHBlciB3b3JrIGl0ZW0sIGNvbnN1bWVkIG9ubHkgb24gc3VjY2Vzc1xuICAgICAgICAvLyAodGhlIHRyYW5zYWN0aW9uIHJvbGxzIHRoZSBjb3VudGVyIGJhY2sgd2hlbiB0aGUgaW5zZXJ0IGxvc2VzKS5cbiAgICAgICAgY29uc3QgY291bnRlclJvdyA9IChcbiAgICAgICAgICBhd2FpdCB0eFxuICAgICAgICAgICAgLnNlbGVjdCh7IGxhc3RGZW5jaW5nVG9rZW46IHdvcmtJdGVtcy5sYXN0RmVuY2luZ1Rva2VuIH0pXG4gICAgICAgICAgICAuZnJvbSh3b3JrSXRlbXMpXG4gICAgICAgICAgICAud2hlcmUoZXEod29ya0l0ZW1zLmlkLCBpdGVtLmlkKSlcbiAgICAgICAgICAgIC5saW1pdCgxKVxuICAgICAgICApWzBdO1xuICAgICAgICBjb25zdCB0b2tlbiA9IChjb3VudGVyUm93Py5sYXN0RmVuY2luZ1Rva2VuID8/IDApICsgMTtcbiAgICAgICAgYXdhaXQgdHgudXBkYXRlKHdvcmtJdGVtcykuc2V0KHsgbGFzdEZlbmNpbmdUb2tlbjogdG9rZW4gfSkud2hlcmUoZXEod29ya0l0ZW1zLmlkLCBpdGVtLmlkKSk7XG4gICAgICAgIC8vIFRoZSBwYXJ0aWFsIHVuaXF1ZSBpbmRleCBjbGFpbXNfb25lX2xpdmVfcGVyX2l0ZW0gZGVjaWRlcyB0aGUgcmFjZTpcbiAgICAgICAgLy8gYSBsaXZlIGNsYWltIG1ha2VzIHRoaXMgSU5TRVJUIGZhaWwgXHUyMDE0IHRoZSBsb3NlciBsZWF2ZXMgbm8gcm93LlxuICAgICAgICBhd2FpdCB0eC5pbnNlcnQoY2xhaW1zKS52YWx1ZXMoe1xuICAgICAgICAgIGlkOiBjbGFpbUlkLFxuICAgICAgICAgIHdvcmtJdGVtSWQ6IGl0ZW0uaWQsXG4gICAgICAgICAgYWN0b3JJZDogaW5wdXQuYWN0b3JJZCxcbiAgICAgICAgICBmZW5jaW5nVG9rZW46IHRva2VuLFxuICAgICAgICAgIGxlYXNlRXhwaXJlc0F0OiB0aGlzLm5vdyArIHR0bE1zLFxuICAgICAgICAgIHJlbGVhc2VkOiBmYWxzZSxcbiAgICAgICAgICB0dGxNcyxcbiAgICAgICAgfSk7XG4gICAgICAgIGF3YWl0IHRoaXMuYXBwZW5kVHgodHgsICd3b3JrX2l0ZW0nLCBpdGVtLmlkLCAnd29ya19pdGVtLmNsYWltZWQnLCBpbnB1dC5hY3RvcklkLCB7XG4gICAgICAgICAgY2xhaW1JZCxcbiAgICAgICAgICBmZW5jaW5nVG9rZW46IHRva2VuLFxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBpZDogY2xhaW1JZCxcbiAgICAgICAgICB3b3JrSXRlbUlkOiBpdGVtLmlkLFxuICAgICAgICAgIGFjdG9ySWQ6IGlucHV0LmFjdG9ySWQsXG4gICAgICAgICAgZmVuY2luZ1Rva2VuOiB0b2tlbixcbiAgICAgICAgICBsZWFzZUV4cGlyZXNBdDogdGhpcy5ub3cgKyB0dGxNcyxcbiAgICAgICAgICByZWxlYXNlZDogZmFsc2UsXG4gICAgICAgIH07XG4gICAgICB9KTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgaWYgKGlzVW5pcXVlVmlvbGF0aW9uKGVycm9yKSkge1xuICAgICAgICB0aHJvdyBuZXcgQ29uZmxpY3RFcnJvcihgd29yayBpdGVtICR7aXRlbS5pZH0gYWxyZWFkeSBoYXMgYSBsaXZlIGNsYWltYCk7XG4gICAgICB9XG4gICAgICB0aHJvdyBlcnJvcjtcbiAgICB9XG4gIH1cblxuICBhc3luYyBoZWFydGJlYXQoaW5wdXQ6IHsgY2xhaW1JZDogc3RyaW5nIH0pOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCByb3cgPSAoYXdhaXQgdGhpcy5kYi5zZWxlY3QoKS5mcm9tKGNsYWltcykud2hlcmUoZXEoY2xhaW1zLmlkLCBpbnB1dC5jbGFpbUlkKSkubGltaXQoMSkpWzBdO1xuICAgIGlmICghcm93IHx8IHJvdy5yZWxlYXNlZCB8fCByb3cubGVhc2VFeHBpcmVzQXQgPD0gdGhpcy5ub3cpIHtcbiAgICAgIHRocm93IG5ldyBDb25mbGljdEVycm9yKGBjbGFpbSAke2lucHV0LmNsYWltSWR9IGlzIG5vdCBsaXZlYCk7XG4gICAgfVxuICAgIC8vIEhlYXJ0YmVhdCByZW5ld3MgdGhlIEZVTEwgb3JpZ2luYWwgVFRMIGZyb20gdGhlIGhlYXJ0YmVhdCBtb21lbnQuXG4gICAgYXdhaXQgdGhpcy5kYlxuICAgICAgLnVwZGF0ZShjbGFpbXMpXG4gICAgICAuc2V0KHsgbGVhc2VFeHBpcmVzQXQ6IHRoaXMubm93ICsgcm93LnR0bE1zIH0pXG4gICAgICAud2hlcmUoZXEoY2xhaW1zLmlkLCByb3cuaWQpKTtcbiAgfVxuXG4gIGFzeW5jIHJlbGVhc2VDbGFpbShpbnB1dDogeyBjbGFpbUlkOiBzdHJpbmc7IHJlYXNvbj86IHN0cmluZyB9KTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3Qgcm93ID0gKGF3YWl0IHRoaXMuZGIuc2VsZWN0KCkuZnJvbShjbGFpbXMpLndoZXJlKGVxKGNsYWltcy5pZCwgaW5wdXQuY2xhaW1JZCkpLmxpbWl0KDEpKVswXTtcbiAgICBpZiAoIXJvdyB8fCByb3cucmVsZWFzZWQpIHJldHVybjtcbiAgICBhd2FpdCB0aGlzLmRiLnRyYW5zYWN0aW9uKGFzeW5jICh0eCkgPT4ge1xuICAgICAgYXdhaXQgdHgudXBkYXRlKGNsYWltcykuc2V0KHsgcmVsZWFzZWQ6IHRydWUgfSkud2hlcmUoZXEoY2xhaW1zLmlkLCByb3cuaWQpKTtcbiAgICAgIGF3YWl0IHRoaXMuYXBwZW5kVHgodHgsICd3b3JrX2l0ZW0nLCByb3cud29ya0l0ZW1JZCwgJ2NsYWltLnJlbGVhc2VkJywgcm93LmFjdG9ySWQsIHtcbiAgICAgICAgY2xhaW1JZDogcm93LmlkLFxuICAgICAgICByZWFzb246IGlucHV0LnJlYXNvbiA/PyBudWxsLFxuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICBhZHZhbmNlQ2xvY2sobXM6IG51bWJlcik6IHZvaWQge1xuICAgIHRoaXMubm93ICs9IG1zO1xuICB9XG5cbiAgLy8gLS0gbGlmZWN5Y2xlIChyb2FkbWFwIFx1MDBBNzEuMikgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICBhc3luYyBhZHZhbmNlU3RhdGUoaW5wdXQ6IEFkdmFuY2VJbnB1dCk6IFByb21pc2U8V29ya0l0ZW0+IHtcbiAgICBjb25zdCBpdGVtID0gYXdhaXQgdGhpcy5tdXN0R2V0SXRlbShpbnB1dC53b3JrSXRlbUlkKTtcblxuICAgIC8vIEtleWVkIHJlcGxheTogdGhlIHNhbWUgY29tbWFuZCByZXR1cm5zIHRoZSBzYW1lIHJlc3VsdCwgYXBwZW5kcyBub3RoaW5nLlxuICAgIGlmIChpbnB1dC5pZGVtcG90ZW5jeUtleSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBjb25zdCBjYWNoZWQgPSAoXG4gICAgICAgIGF3YWl0IHRoaXMuZGJcbiAgICAgICAgICAuc2VsZWN0KClcbiAgICAgICAgICAuZnJvbShpZGVtcG90ZW5jeUtleXMpXG4gICAgICAgICAgLndoZXJlKGVxKGlkZW1wb3RlbmN5S2V5cy5rZXksIGlucHV0LmlkZW1wb3RlbmN5S2V5KSlcbiAgICAgICAgICAubGltaXQoMSlcbiAgICAgIClbMF07XG4gICAgICBpZiAoY2FjaGVkKSByZXR1cm4geyAuLi4oY2FjaGVkLnJlc3VsdCBhcyB1bmtub3duIGFzIFdvcmtJdGVtKSB9O1xuICAgIH1cblxuICAgIC8vIFByZXNlcnZhdGlvbiBuby1vcCAoc3ByaW50LXBsYW5uaW5nIGlkZW1wb3RlbmN5IHJ1bGUpOiBhbiBVTktFWUVEXG4gICAgLy8gcmUtcmVxdWVzdCBvZiB0aGUgY3VycmVudCBzdGF0ZSBzdWNjZWVkcyB3aXRob3V0IGFuIGV2ZW50LlxuICAgIGlmIChpbnB1dC5pZGVtcG90ZW5jeUtleSA9PT0gdW5kZWZpbmVkICYmIGlucHV0LnRvID09PSBpdGVtLnN0YXRlKSB7XG4gICAgICBhd2FpdCB0aGlzLnZhbGlkYXRlUHJlc2VudGVkVG9rZW4oaXRlbSwgaW5wdXQuZmVuY2luZ1Rva2VuLCBpbnB1dC5hY3RvcklkKTtcbiAgICAgIHJldHVybiB0aGlzLnB1YmxpY0l0ZW0oaXRlbSk7XG4gICAgfVxuXG4gICAgLy8gVHJhbnNpdGlvbi10YWJsZSBsb29rdXAgcHJlY2VkZXMgY2xhaW0vdG9rZW4vcGVybWlzc2lvbiBjaGVja3NcbiAgICAvLyAoZnNtLXRyYW5zaXRpb25zIHBpbikuXG4gICAgY29uc3QgcnVsZSA9IFRSQU5TSVRJT05TLmZpbmQoKHQpID0+IHQuZnJvbSA9PT0gaXRlbS5zdGF0ZSAmJiB0LnRvID09PSBpbnB1dC50byk7XG4gICAgaWYgKCFydWxlKSB7XG4gICAgICBpZiAoXG4gICAgICAgIFJBTktbaW5wdXQudG9dIDwgUkFOS1tpdGVtLnN0YXRlIGFzIFdvcmtJdGVtU3RhdGVdICYmXG4gICAgICAgIChhd2FpdCB0aGlzLmhhc1Blcm1pc3Npb24oaW5wdXQuYWN0b3JJZCwgJ3N0YXRlLmRvd25ncmFkZScpKVxuICAgICAgKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnByaXZpbGVnZWREb3duZ3JhZGUoaXRlbSwgaW5wdXQpO1xuICAgICAgfVxuICAgICAgdGhyb3cgbmV3IEludmFsaWRUcmFuc2l0aW9uRXJyb3IoaXRlbS5zdGF0ZSBhcyBXb3JrSXRlbVN0YXRlLCBpbnB1dC50byk7XG4gICAgfVxuXG4gICAgYXdhaXQgdGhpcy52YWxpZGF0ZVByZXNlbnRlZFRva2VuKGl0ZW0sIGlucHV0LmZlbmNpbmdUb2tlbiwgaW5wdXQuYWN0b3JJZCk7XG5cbiAgICAvLyBCbG9ja2VkIG92ZXJsYXkgZnJlZXplcyB0cmFuc2l0aW9ucyBhdCBldmVyeSBzdGF0ZSAoRDgsIFx1MDBBNzEuMSkuXG4gICAgaWYgKGl0ZW0uYmxvY2tlZFJlYXNvbiAhPT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoYHdvcmsgaXRlbSBpcyBibG9ja2VkOiAke2l0ZW0uYmxvY2tlZFJlYXNvbn1gKTtcbiAgICB9XG5cbiAgICBhd2FpdCB0aGlzLnJlcXVpcmVQZXJtaXNzaW9uKGlucHV0LmFjdG9ySWQsIHJ1bGUucGVybWlzc2lvbik7XG5cbiAgICBpZiAocnVsZS5jbGFpbVJlcXVpcmVkICYmIGlucHV0LmZlbmNpbmdUb2tlbiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAvLyBFeGVjdXRpb24tem9uZSB0cmFuc2l0aW9ucyBkZW1hbmQgYSBQUkVTRU5URUQgbGl2ZSB0b2tlbi5cbiAgICAgIHRocm93IG5ldyBHdWFyZEZhaWxlZEVycm9yKCdjbGFpbSBmZW5jaW5nIHRva2VuIHJlcXVpcmVkIGZvciB0aGlzIHRyYW5zaXRpb24nKTtcbiAgICB9XG5cbiAgICBmb3IgKGNvbnN0IGd1YXJkIG9mIHJ1bGUuZ3VhcmRzKSB7XG4gICAgICBhd2FpdCB0aGlzLmNoZWNrR3VhcmQoZ3VhcmQsIGl0ZW0pO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLmRiLnRyYW5zYWN0aW9uKGFzeW5jICh0eCkgPT5cbiAgICAgIHRoaXMuZXhlY3V0ZVRyYW5zaXRpb25UeCh0eCwgaXRlbSwgaW5wdXQudG8sIGlucHV0LmFjdG9ySWQsIGlucHV0LmlkZW1wb3RlbmN5S2V5KSxcbiAgICApO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBjaGVja0d1YXJkKGd1YXJkOiBUcmFuc2l0aW9uUnVsZVsnZ3VhcmRzJ11bbnVtYmVyXSwgaXRlbTogV29ya0l0ZW1Sb3cpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBzd2l0Y2ggKGd1YXJkKSB7XG4gICAgICBjYXNlICdkZXBzX2RvbmUnOiB7XG4gICAgICAgIGZvciAoY29uc3QgZGVwS2V5IG9mIGl0ZW0uZGVwZW5kc09uKSB7XG4gICAgICAgICAgY29uc3QgZGVwID0gKFxuICAgICAgICAgICAgYXdhaXQgdGhpcy5kYlxuICAgICAgICAgICAgICAuc2VsZWN0KClcbiAgICAgICAgICAgICAgLmZyb20od29ya0l0ZW1zKVxuICAgICAgICAgICAgICAud2hlcmUoYW5kKGVxKHdvcmtJdGVtcy5mZWF0dXJlSWQsIGl0ZW0uZmVhdHVyZUlkKSwgZXEod29ya0l0ZW1zLmV4dGVybmFsS2V5LCBkZXBLZXkpKSlcbiAgICAgICAgICAgICAgLm9yZGVyQnkoYXNjKHdvcmtJdGVtcy5zZXEpKVxuICAgICAgICAgICAgICAubGltaXQoMSlcbiAgICAgICAgICApWzBdO1xuICAgICAgICAgIGlmIChkZXAgJiYgZGVwLnN0YXRlICE9PSAnZG9uZScpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBHdWFyZEZhaWxlZEVycm9yKGBkZXBlbmRlbmN5ICR7ZGVwS2V5fSBpcyBub3QgZG9uZWApO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBjYXNlICdzcGVjX2dhdGVfaWZfY2hlY2twb2ludCc6IHtcbiAgICAgICAgaWYgKCFpdGVtLnNwZWNDaGVja3BvaW50KSByZXR1cm47XG4gICAgICAgIGNvbnN0IGFwcHJvdmVkID0gKFxuICAgICAgICAgIGF3YWl0IHRoaXMuZGJcbiAgICAgICAgICAgIC5zZWxlY3QoeyBzZXE6IGdhdGVEZWNpc2lvbnMuc2VxIH0pXG4gICAgICAgICAgICAuZnJvbShnYXRlRGVjaXNpb25zKVxuICAgICAgICAgICAgLndoZXJlKFxuICAgICAgICAgICAgICBhbmQoXG4gICAgICAgICAgICAgICAgZXEoZ2F0ZURlY2lzaW9ucy53b3JrSXRlbUlkLCBpdGVtLmlkKSxcbiAgICAgICAgICAgICAgICBlcShnYXRlRGVjaXNpb25zLmdhdGUsICdzcGVjX2FwcHJvdmFsJyksXG4gICAgICAgICAgICAgICAgZXEoZ2F0ZURlY2lzaW9ucy5kZWNpc2lvbiwgJ2FwcHJvdmVkJyksXG4gICAgICAgICAgICAgICksXG4gICAgICAgICAgICApXG4gICAgICAgICAgICAubGltaXQoMSlcbiAgICAgICAgKVswXTtcbiAgICAgICAgaWYgKCFhcHByb3ZlZCkge1xuICAgICAgICAgIHRocm93IG5ldyBHdWFyZEZhaWxlZEVycm9yKCdzcGVjX2NoZWNrcG9pbnQgcmVxdWlyZXMgYW4gYXBwcm92ZWQgc3BlY19hcHByb3ZhbCBnYXRlIGRlY2lzaW9uJyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgY2FzZSAnbm9uZW1wdHlfZGlmZic6IHtcbiAgICAgICAgLy8gUGhhc2UgNCAocm9hZG1hcCBcdTAwQTcxLjQpOiBraW5kIHNlbGVjdHMgV0hJQ0ggbWFjaGluZSBldmlkZW5jZSBhcHBsaWVzLlxuICAgICAgICBpZiAoaXRlbS5raW5kICE9PSAnY29kZScpIHtcbiAgICAgICAgICAvLyBEb2Mga2luZHM6IHRoZSBsYXRlc3QgZG9jX2xpbnQgKGlmIGFueSkgbXVzdCBiZSBzY2hlbWEtdmFsaWQ7XG4gICAgICAgICAgLy8gZ2l0X2RpZmYgaXMgbmV2ZXIgY29uc3VsdGVkIGZvciBub24tY29kZSBkZWxpdmVyYWJsZXMuXG4gICAgICAgICAgY29uc3QgbGludHMgPSBhd2FpdCB0aGlzLmRiXG4gICAgICAgICAgICAuc2VsZWN0KClcbiAgICAgICAgICAgIC5mcm9tKGV2aWRlbmNlVGFibGUpXG4gICAgICAgICAgICAud2hlcmUoYW5kKGVxKGV2aWRlbmNlVGFibGUud29ya0l0ZW1JZCwgaXRlbS5pZCksIGVxKGV2aWRlbmNlVGFibGUua2luZCwgJ2RvY19saW50JykpKVxuICAgICAgICAgICAgLm9yZGVyQnkoYXNjKGV2aWRlbmNlVGFibGUuc2VxKSk7XG4gICAgICAgICAgY29uc3QgbGF0ZXN0TGludCA9IGxpbnRzW2xpbnRzLmxlbmd0aCAtIDFdO1xuICAgICAgICAgIGlmIChsYXRlc3RMaW50ICYmIGxhdGVzdExpbnQucGF5bG9hZFsnc2NoZW1hVmFsaWQnXSAhPT0gdHJ1ZSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoJ3RoZSBsYXRlc3QgZG9jX2xpbnQgZXZpZGVuY2UgZmFpbGVkIFx1MjAxNCBkb2N1bWVudCBpcyBub3Qgc2NoZW1hLXZhbGlkJyk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICAvLyBUaGUgTEFURVNUIHN1Ym1pdHRlZCBnaXRfZGlmZiwgaWYgYW55LCBtdXN0IGJlIG5vbi1lbXB0eSBcdTIwMTQgdGhlXG4gICAgICAgIC8vIGZha2UtZG9uZSBkZW55LiBBYnNlbmNlIGlzIG5vdCBjaGVja2VkIGhlcmUgKENPTkZPUk1BTkNFLm1kIHBpbikuXG4gICAgICAgIGNvbnN0IHJvd3MgPSBhd2FpdCB0aGlzLmRiXG4gICAgICAgICAgLnNlbGVjdCgpXG4gICAgICAgICAgLmZyb20oZXZpZGVuY2VUYWJsZSlcbiAgICAgICAgICAud2hlcmUoYW5kKGVxKGV2aWRlbmNlVGFibGUud29ya0l0ZW1JZCwgaXRlbS5pZCksIGVxKGV2aWRlbmNlVGFibGUua2luZCwgJ2dpdF9kaWZmJykpKVxuICAgICAgICAgIC5vcmRlckJ5KGFzYyhldmlkZW5jZVRhYmxlLnNlcSkpO1xuICAgICAgICBjb25zdCBsYXRlc3QgPSByb3dzW3Jvd3MubGVuZ3RoIC0gMV07XG4gICAgICAgIGlmIChsYXRlc3QgJiYgbGF0ZXN0LnBheWxvYWRbJ25vbkVtcHR5J10gIT09IHRydWUpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcigndGhlIGxhdGVzdCBnaXRfZGlmZiBldmlkZW5jZSBpcyBlbXB0eSBcdTIwMTQgbm90aGluZyB0byByZXZpZXcnKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBwcml2aWxlZ2VkRG93bmdyYWRlKGl0ZW06IFdvcmtJdGVtUm93LCBpbnB1dDogQWR2YW5jZUlucHV0KTogUHJvbWlzZTxXb3JrSXRlbT4ge1xuICAgIGF3YWl0IHRoaXMudmFsaWRhdGVQcmVzZW50ZWRUb2tlbihpdGVtLCBpbnB1dC5mZW5jaW5nVG9rZW4sIGlucHV0LmFjdG9ySWQpO1xuICAgIGlmIChpdGVtLmJsb2NrZWRSZWFzb24gIT09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBHdWFyZEZhaWxlZEVycm9yKGB3b3JrIGl0ZW0gaXMgYmxvY2tlZDogJHtpdGVtLmJsb2NrZWRSZWFzb259YCk7XG4gICAgfVxuICAgIGNvbnN0IGZyb20gPSBpdGVtLnN0YXRlO1xuICAgIHJldHVybiB0aGlzLmRiLnRyYW5zYWN0aW9uKGFzeW5jICh0eCkgPT4ge1xuICAgICAgY29uc3QgdXBkYXRlZCA9IGF3YWl0IHR4XG4gICAgICAgIC51cGRhdGUod29ya0l0ZW1zKVxuICAgICAgICAuc2V0KHsgc3RhdGU6IGlucHV0LnRvLCBzdGF0ZVZlcnNpb246IGl0ZW0uc3RhdGVWZXJzaW9uICsgMSB9KVxuICAgICAgICAud2hlcmUoYW5kKGVxKHdvcmtJdGVtcy5pZCwgaXRlbS5pZCksIGVxKHdvcmtJdGVtcy5zdGF0ZVZlcnNpb24sIGl0ZW0uc3RhdGVWZXJzaW9uKSkpXG4gICAgICAgIC5yZXR1cm5pbmcoeyBpZDogd29ya0l0ZW1zLmlkIH0pO1xuICAgICAgaWYgKHVwZGF0ZWQubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHRocm93IG5ldyBDb25mbGljdEVycm9yKGBzdGF0ZV92ZXJzaW9uIGNvbmZsaWN0IG9uIHdvcmsgaXRlbSAke2l0ZW0uaWR9YCk7XG4gICAgICB9XG4gICAgICBhd2FpdCB0aGlzLmFwcGVuZFR4KFxuICAgICAgICB0eCxcbiAgICAgICAgJ3dvcmtfaXRlbScsXG4gICAgICAgIGl0ZW0uaWQsXG4gICAgICAgICd3b3JrX2l0ZW0uc3RhdGVfZG93bmdyYWRlZCcsXG4gICAgICAgIGlucHV0LmFjdG9ySWQsXG4gICAgICAgIHsgZnJvbSwgdG86IGlucHV0LnRvLCBjb21wZW5zYXRpbmc6IHRydWUgfSxcbiAgICAgICAgaW5wdXQuaWRlbXBvdGVuY3lLZXkgIT09IHVuZGVmaW5lZCA/IHsgaWRlbXBvdGVuY3lLZXk6IGlucHV0LmlkZW1wb3RlbmN5S2V5IH0gOiB1bmRlZmluZWQsXG4gICAgICApO1xuICAgICAgY29uc3QgcmVzdWx0ID0gdGhpcy5wdWJsaWNJdGVtKHsgLi4uaXRlbSwgc3RhdGU6IGlucHV0LnRvLCBzdGF0ZVZlcnNpb246IGl0ZW0uc3RhdGVWZXJzaW9uICsgMSB9KTtcbiAgICAgIGlmIChpbnB1dC5pZGVtcG90ZW5jeUtleSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGF3YWl0IHR4XG4gICAgICAgICAgLmluc2VydChpZGVtcG90ZW5jeUtleXMpXG4gICAgICAgICAgLnZhbHVlcyh7IGtleTogaW5wdXQuaWRlbXBvdGVuY3lLZXksIHJlc3VsdDogcmVzdWx0IGFzIHVua25vd24gYXMgUmVjb3JkPHN0cmluZywgdW5rbm93bj4gfSlcbiAgICAgICAgICAub25Db25mbGljdERvTm90aGluZygpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKiBTaGFyZWQgYnkgYWR2YW5jZVN0YXRlIGFuZCB0aGUgZ2F0ZS1maXJlZCB0cmFuc2l0aW9ucy4gT05FIHRyYW5zYWN0aW9uIHBlciBjb21tYW5kLiAqL1xuICBwcml2YXRlIGFzeW5jIGV4ZWN1dGVUcmFuc2l0aW9uVHgoXG4gICAgdHg6IFR4LFxuICAgIGl0ZW06IFdvcmtJdGVtUm93LFxuICAgIHRvOiBXb3JrSXRlbVN0YXRlLFxuICAgIGFjdG9ySWQ6IHN0cmluZyxcbiAgICBpZGVtcG90ZW5jeUtleT86IHN0cmluZyxcbiAgICBjYXVzYXRpb25JZD86IHN0cmluZyxcbiAgKTogUHJvbWlzZTxXb3JrSXRlbT4ge1xuICAgIGNvbnN0IGZyb20gPSBpdGVtLnN0YXRlIGFzIFdvcmtJdGVtU3RhdGU7XG4gICAgLy8gQ0FTOiBvcHRpbWlzdGljIGNvbmN1cnJlbmN5IGJ5IHN0YXRlX3ZlcnNpb24gKHJvYWRtYXAgXHUwMEE3MS4xKS5cbiAgICBjb25zdCB1cGRhdGVkID0gYXdhaXQgdHhcbiAgICAgIC51cGRhdGUod29ya0l0ZW1zKVxuICAgICAgLnNldCh7IHN0YXRlOiB0bywgc3RhdGVWZXJzaW9uOiBpdGVtLnN0YXRlVmVyc2lvbiArIDEgfSlcbiAgICAgIC53aGVyZShhbmQoZXEod29ya0l0ZW1zLmlkLCBpdGVtLmlkKSwgZXEod29ya0l0ZW1zLnN0YXRlVmVyc2lvbiwgaXRlbS5zdGF0ZVZlcnNpb24pKSlcbiAgICAgIC5yZXR1cm5pbmcoeyBpZDogd29ya0l0ZW1zLmlkIH0pO1xuICAgIGlmICh1cGRhdGVkLmxlbmd0aCA9PT0gMCkge1xuICAgICAgdGhyb3cgbmV3IENvbmZsaWN0RXJyb3IoYHN0YXRlX3ZlcnNpb24gY29uZmxpY3Qgb24gd29yayBpdGVtICR7aXRlbS5pZH1gKTtcbiAgICB9XG4gICAgY29uc3QgZXZlbnQgPSBhd2FpdCB0aGlzLmFwcGVuZFR4KFxuICAgICAgdHgsXG4gICAgICAnd29ya19pdGVtJyxcbiAgICAgIGl0ZW0uaWQsXG4gICAgICAnd29ya19pdGVtLnN0YXRlX2NoYW5nZWQnLFxuICAgICAgYWN0b3JJZCxcbiAgICAgIHsgZnJvbSwgdG8gfSxcbiAgICAgIHtcbiAgICAgICAgLi4uKGNhdXNhdGlvbklkICE9PSB1bmRlZmluZWQgPyB7IGNhdXNhdGlvbklkIH0gOiB7fSksXG4gICAgICAgIC4uLihpZGVtcG90ZW5jeUtleSAhPT0gdW5kZWZpbmVkID8geyBpZGVtcG90ZW5jeUtleSB9IDoge30pLFxuICAgICAgfSxcbiAgICApO1xuXG4gICAgLy8gRXBpYy1saWZ0IHByb2plY3RvciAocm9hZG1hcCBcdTAwQTcxLjIpOiBmaXJzdCBjaGlsZCBMRUFWSU5HIGJhY2tsb2cgbGlmdHNcbiAgICAvLyB0aGUgZmVhdHVyZTsgaWRlbXBvdGVudCBieSBjaGVjazsgYXV0aG9yZWQgYnkgdGhlIHN5c3RlbSBhY3Rvci5cbiAgICBpZiAoZnJvbSA9PT0gJ2JhY2tsb2cnICYmIHRvICE9PSAnYmFja2xvZycpIHtcbiAgICAgIGNvbnN0IGZlYXR1cmUgPSBhd2FpdCB0aGlzLmdldEZlYXR1cmVSb3coaXRlbS5mZWF0dXJlSWQsIHR4KTtcbiAgICAgIGlmIChmZWF0dXJlICYmIGZlYXR1cmUuc3RhdGUgPT09ICdiYWNrbG9nJykge1xuICAgICAgICBhd2FpdCB0eC51cGRhdGUoZmVhdHVyZXMpLnNldCh7IHN0YXRlOiAnaW5fcHJvZ3Jlc3MnIH0pLndoZXJlKGVxKGZlYXR1cmVzLmlkLCBmZWF0dXJlLmlkKSk7XG4gICAgICAgIGF3YWl0IHRoaXMuYXBwZW5kVHgoXG4gICAgICAgICAgdHgsXG4gICAgICAgICAgJ2ZlYXR1cmUnLFxuICAgICAgICAgIGZlYXR1cmUuaWQsXG4gICAgICAgICAgJ2ZlYXR1cmUuc3RhdGVfY2hhbmdlZCcsXG4gICAgICAgICAgdGhpcy5zeXN0ZW1BY3RvcklkLFxuICAgICAgICAgIHsgZnJvbTogJ2JhY2tsb2cnLCB0bzogJ2luX3Byb2dyZXNzJyB9LFxuICAgICAgICAgIHsgY2F1c2F0aW9uSWQ6IFN0cmluZyhldmVudC5nbG9iYWxTZXEpIH0sXG4gICAgICAgICk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gZG9uZV9jaGVja3BvaW50IChyb2FkbWFwIFx1MDBBNzEuMSk6IHRoZSBzdG9yeSBjb21wbGV0ZXMgbm9ybWFsbHk7IHRoZSBob2xkXG4gICAgLy8gbWF0ZXJpYWxpemVzIG9uIHRoZSBmZWF0dXJlIGV4YWN0bHkgYXQgY29tcGxldGlvbi5cbiAgICBpZiAodG8gPT09ICdkb25lJyAmJiBpdGVtLmRvbmVDaGVja3BvaW50KSB7XG4gICAgICBjb25zdCBmZWF0dXJlID0gYXdhaXQgdGhpcy5nZXRGZWF0dXJlUm93KGl0ZW0uZmVhdHVyZUlkLCB0eCk7XG4gICAgICBpZiAoZmVhdHVyZSAmJiAhZmVhdHVyZS5kaXNwYXRjaEhvbGQpIHtcbiAgICAgICAgYXdhaXQgdHgudXBkYXRlKGZlYXR1cmVzKS5zZXQoeyBkaXNwYXRjaEhvbGQ6IHRydWUgfSkud2hlcmUoZXEoZmVhdHVyZXMuaWQsIGZlYXR1cmUuaWQpKTtcbiAgICAgICAgYXdhaXQgdGhpcy5hcHBlbmRUeChcbiAgICAgICAgICB0eCxcbiAgICAgICAgICAnZmVhdHVyZScsXG4gICAgICAgICAgZmVhdHVyZS5pZCxcbiAgICAgICAgICAnZmVhdHVyZS5kaXNwYXRjaF9ob2xkX3JhaXNlZCcsXG4gICAgICAgICAgdGhpcy5zeXN0ZW1BY3RvcklkLFxuICAgICAgICAgIHsgd29ya0l0ZW1JZDogaXRlbS5pZCB9LFxuICAgICAgICAgIHsgY2F1c2F0aW9uSWQ6IFN0cmluZyhldmVudC5nbG9iYWxTZXEpIH0sXG4gICAgICAgICk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gUmFpbHMgXHUyMTkyIGNoYXQ6IG5hcnJhdGUgdGhlIHRyYW5zaXRpb24gaW50byBib3VuZCB0YXNrIHRocmVhZHMgKFx1MDBBNzUuMikuXG4gICAgLy8gTWlycm9yIG9mIHRoZSByZWZlcmVuY2U6IEVWRVJZIGV4ZWN1dGVUcmFuc2l0aW9uIG5hcnJhdGVzIChnYXRlLWZpcmVkLFxuICAgIC8vIGxvb3BiYWNrIGluY2x1ZGVkKTsgcHJpdmlsZWdlZERvd25ncmFkZSBkb2VzIE5PVCBnbyB0aHJvdWdoIGhlcmUgYW5kXG4gICAgLy8gdGhlcmVmb3JlIGRvZXMgbm90IG5hcnJhdGUgXHUyMDE0IGV4YWN0bHkgbGlrZSB0aGUgcmVmZXJlbmNlIGVuZ2luZS5cbiAgICBhd2FpdCB0aGlzLm5hcnJhdGVXb3JrSXRlbVR4KHR4LCBpdGVtLmlkLCBgc3RhdGU6ICR7ZnJvbX0gXHUyMTkyICR7dG99YCk7XG5cbiAgICBjb25zdCByZXN1bHQgPSB0aGlzLnB1YmxpY0l0ZW0oeyAuLi5pdGVtLCBzdGF0ZTogdG8sIHN0YXRlVmVyc2lvbjogaXRlbS5zdGF0ZVZlcnNpb24gKyAxIH0pO1xuICAgIGlmIChpZGVtcG90ZW5jeUtleSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBhd2FpdCB0eFxuICAgICAgICAuaW5zZXJ0KGlkZW1wb3RlbmN5S2V5cylcbiAgICAgICAgLnZhbHVlcyh7IGtleTogaWRlbXBvdGVuY3lLZXksIHJlc3VsdDogcmVzdWx0IGFzIHVua25vd24gYXMgUmVjb3JkPHN0cmluZywgdW5rbm93bj4gfSlcbiAgICAgICAgLm9uQ29uZmxpY3REb05vdGhpbmcoKTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIGFzeW5jIGJsb2NrVGFzayhpbnB1dDoge1xuICAgIHdvcmtJdGVtSWQ6IHN0cmluZztcbiAgICByZWFzb246IEJsb2NrZWRSZWFzb247XG4gICAgYWN0b3JJZDogc3RyaW5nO1xuICAgIGZlbmNpbmdUb2tlbj86IG51bWJlcjtcbiAgfSk6IFByb21pc2U8V29ya0l0ZW0+IHtcbiAgICBjb25zdCBpdGVtID0gYXdhaXQgdGhpcy5tdXN0R2V0SXRlbShpbnB1dC53b3JrSXRlbUlkKTtcbiAgICBpZiAoIShCTE9DS0VEX1JFQVNPTlMgYXMgcmVhZG9ubHkgc3RyaW5nW10pLmluY2x1ZGVzKGlucHV0LnJlYXNvbikpIHtcbiAgICAgIHRocm93IG5ldyBHdWFyZEZhaWxlZEVycm9yKGB1bmtub3duIGJsb2NraW5nIGNvbmRpdGlvbjogJHtpbnB1dC5yZWFzb259YCk7XG4gICAgfVxuICAgIGF3YWl0IHRoaXMudmFsaWRhdGVQcmVzZW50ZWRUb2tlbihpdGVtLCBpbnB1dC5mZW5jaW5nVG9rZW4sIGlucHV0LmFjdG9ySWQpO1xuICAgIGF3YWl0IHRoaXMucmVxdWlyZVBlcm1pc3Npb24oaW5wdXQuYWN0b3JJZCwgJ3Rhc2suYmxvY2snKTtcbiAgICByZXR1cm4gdGhpcy5kYi50cmFuc2FjdGlvbihhc3luYyAodHgpID0+IHtcbiAgICAgIGF3YWl0IHR4XG4gICAgICAgIC51cGRhdGUod29ya0l0ZW1zKVxuICAgICAgICAuc2V0KHsgYmxvY2tlZFJlYXNvbjogaW5wdXQucmVhc29uLCBzdGF0ZVZlcnNpb246IGl0ZW0uc3RhdGVWZXJzaW9uICsgMSB9KVxuICAgICAgICAud2hlcmUoZXEod29ya0l0ZW1zLmlkLCBpdGVtLmlkKSk7XG4gICAgICBhd2FpdCB0aGlzLmFwcGVuZFR4KHR4LCAnd29ya19pdGVtJywgaXRlbS5pZCwgJ3dvcmtfaXRlbS5ibG9ja2VkJywgaW5wdXQuYWN0b3JJZCwge1xuICAgICAgICByZWFzb246IGlucHV0LnJlYXNvbixcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIHRoaXMucHVibGljSXRlbSh7IC4uLml0ZW0sIGJsb2NrZWRSZWFzb246IGlucHV0LnJlYXNvbiwgc3RhdGVWZXJzaW9uOiBpdGVtLnN0YXRlVmVyc2lvbiArIDEgfSk7XG4gICAgfSk7XG4gIH1cblxuICBhc3luYyB1bmJsb2NrVGFzayhpbnB1dDogeyB3b3JrSXRlbUlkOiBzdHJpbmc7IGFjdG9ySWQ6IHN0cmluZyB9KTogUHJvbWlzZTxXb3JrSXRlbT4ge1xuICAgIGNvbnN0IGl0ZW0gPSBhd2FpdCB0aGlzLm11c3RHZXRJdGVtKGlucHV0LndvcmtJdGVtSWQpO1xuICAgIC8vIFx1MDBBNzQuMjogcmV2aWV3X25vbl9jb252ZXJnZW5jZSBjYW4gb25seSBiZSByZWxlYXNlZCBieSBhIHJldmlldy1nYXRlXG4gICAgLy8gaG9sZGVyOyBvcmRpbmFyeSBibG9ja3MgcmVsZWFzZSB1bmRlciB0YXNrLmJsb2NrLlxuICAgIGlmIChpdGVtLmJsb2NrZWRSZWFzb24gPT09ICdyZXZpZXdfbm9uX2NvbnZlcmdlbmNlJykge1xuICAgICAgYXdhaXQgdGhpcy5yZXF1aXJlUGVybWlzc2lvbihpbnB1dC5hY3RvcklkLCAnZ2F0ZS5yZXZpZXcuYXBwcm92ZScpO1xuICAgIH0gZWxzZSB7XG4gICAgICBhd2FpdCB0aGlzLnJlcXVpcmVQZXJtaXNzaW9uKGlucHV0LmFjdG9ySWQsICd0YXNrLmJsb2NrJyk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmRiLnRyYW5zYWN0aW9uKGFzeW5jICh0eCkgPT4ge1xuICAgICAgYXdhaXQgdHhcbiAgICAgICAgLnVwZGF0ZSh3b3JrSXRlbXMpXG4gICAgICAgIC5zZXQoeyBibG9ja2VkUmVhc29uOiBudWxsLCBzdGF0ZVZlcnNpb246IGl0ZW0uc3RhdGVWZXJzaW9uICsgMSB9KVxuICAgICAgICAud2hlcmUoZXEod29ya0l0ZW1zLmlkLCBpdGVtLmlkKSk7XG4gICAgICBhd2FpdCB0aGlzLmFwcGVuZFR4KHR4LCAnd29ya19pdGVtJywgaXRlbS5pZCwgJ3dvcmtfaXRlbS51bmJsb2NrZWQnLCBpbnB1dC5hY3RvcklkLCB7fSk7XG4gICAgICByZXR1cm4gdGhpcy5wdWJsaWNJdGVtKHsgLi4uaXRlbSwgYmxvY2tlZFJlYXNvbjogbnVsbCwgc3RhdGVWZXJzaW9uOiBpdGVtLnN0YXRlVmVyc2lvbiArIDEgfSk7XG4gICAgfSk7XG4gIH1cblxuICAvLyAtLSBnYXRlcyAmIGV2aWRlbmNlIChyb2FkbWFwIFx1MDBBNzEuNCkgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgYXN5bmMgc3VibWl0RXZpZGVuY2UoaW5wdXQ6IHtcbiAgICB3b3JrSXRlbUlkOiBzdHJpbmc7XG4gICAgZXZpZGVuY2U6IEV2aWRlbmNlO1xuICAgIGFjdG9ySWQ6IHN0cmluZztcbiAgICBmZW5jaW5nVG9rZW4/OiBudW1iZXI7XG4gIH0pOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCBpdGVtID0gYXdhaXQgdGhpcy5tdXN0R2V0SXRlbShpbnB1dC53b3JrSXRlbUlkKTtcbiAgICBhd2FpdCB0aGlzLnZhbGlkYXRlUHJlc2VudGVkVG9rZW4oaXRlbSwgaW5wdXQuZmVuY2luZ1Rva2VuLCBpbnB1dC5hY3RvcklkKTtcbiAgICBhd2FpdCB0aGlzLmRiLnRyYW5zYWN0aW9uKGFzeW5jICh0eCkgPT4ge1xuICAgICAgYXdhaXQgdHguaW5zZXJ0KGV2aWRlbmNlVGFibGUpLnZhbHVlcyh7XG4gICAgICAgIHdvcmtJdGVtSWQ6IGl0ZW0uaWQsXG4gICAgICAgIGtpbmQ6IGlucHV0LmV2aWRlbmNlLmtpbmQsXG4gICAgICAgIHBheWxvYWQ6IGlucHV0LmV2aWRlbmNlLnBheWxvYWQsXG4gICAgICB9KTtcbiAgICAgIGF3YWl0IHRoaXMuYXBwZW5kVHgodHgsICd3b3JrX2l0ZW0nLCBpdGVtLmlkLCAnZXZpZGVuY2Uuc3VibWl0dGVkJywgaW5wdXQuYWN0b3JJZCwge1xuICAgICAgICBraW5kOiBpbnB1dC5ldmlkZW5jZS5raW5kLFxuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICBhc3luYyBhcHByb3ZlR2F0ZShpbnB1dDogR2F0ZURlY2lzaW9uSW5wdXQpOiBQcm9taXNlPFdvcmtJdGVtPiB7XG4gICAgY29uc3QgaXRlbSA9IGF3YWl0IHRoaXMubXVzdEdldEl0ZW0oaW5wdXQud29ya0l0ZW1JZCk7XG5cbiAgICBpZiAoaW5wdXQuZ2F0ZSA9PT0gJ3NwZWNfYXBwcm92YWwnKSB7XG4gICAgICAvLyBQZXJtaXNzaW9uIHByZWNlZGVzIGFueSBlZmZlY3Q6IGEgZGVuaWVkIGF0dGVtcHQgcGlucyBub3RoaW5nLlxuICAgICAgYXdhaXQgdGhpcy5yZXF1aXJlUGVybWlzc2lvbihpbnB1dC5hY3RvcklkLCAnZ2F0ZS5zcGVjLmFwcHJvdmUnKTtcbiAgICAgIGlmIChpdGVtLmJsb2NrZWRSZWFzb24gIT09IG51bGwpIHtcbiAgICAgICAgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoYHdvcmsgaXRlbSBpcyBibG9ja2VkOiAke2l0ZW0uYmxvY2tlZFJlYXNvbn1gKTtcbiAgICAgIH1cbiAgICAgIGlmIChpdGVtLnN0YXRlICE9PSAnZHJhZnQnKSB7XG4gICAgICAgIHRocm93IG5ldyBHdWFyZEZhaWxlZEVycm9yKGBzcGVjX2FwcHJvdmFsIGFwcGxpZXMgdG8gZHJhZnQgaXRlbXMsIG5vdCAke2l0ZW0uc3RhdGV9YCk7XG4gICAgICB9XG4gICAgICBjb25zdCBxdW9ydW1NZXQgPSBhd2FpdCB0aGlzLnF1b3J1bVdvdWxkQmVNZXQoaXRlbSwgJ3NwZWNfYXBwcm92YWwnLCBpbnB1dC5hY3RvcklkKTtcbiAgICAgIHJldHVybiB0aGlzLmRiLnRyYW5zYWN0aW9uKGFzeW5jICh0eCkgPT4ge1xuICAgICAgICBsZXQgcGlubmVkID0gaXRlbS5waW5uZWRWZXJpZmljYXRpb247XG4gICAgICAgIGlmIChpbnB1dC5waW5uZWRWZXJpZmljYXRpb24gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIHBpbm5lZCA9IFsuLi5pbnB1dC5waW5uZWRWZXJpZmljYXRpb25dO1xuICAgICAgICAgIGF3YWl0IHR4LnVwZGF0ZSh3b3JrSXRlbXMpLnNldCh7IHBpbm5lZFZlcmlmaWNhdGlvbjogcGlubmVkIH0pLndoZXJlKGVxKHdvcmtJdGVtcy5pZCwgaXRlbS5pZCkpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHBpbm5lZEl0ZW0gPSB7IC4uLml0ZW0sIHBpbm5lZFZlcmlmaWNhdGlvbjogcGlubmVkIH07XG4gICAgICAgIGF3YWl0IHRoaXMucmVjb3JkQXBwcm92YWxUeCh0eCwgcGlubmVkSXRlbSwgJ3NwZWNfYXBwcm92YWwnLCBpbnB1dC5hY3RvcklkKTtcbiAgICAgICAgaWYgKCFxdW9ydW1NZXQpIHtcbiAgICAgICAgICAvLyBEZWNpc2lvbiByZWNvcmRlZDsgcXVvcnVtIHBlbmRpbmcgKGdhdGUgcG9saWN5IGlzIGRhdGEsIHJvYWRtYXAgXHUwMEE3MykuXG4gICAgICAgICAgcmV0dXJuIHRoaXMucHVibGljSXRlbShwaW5uZWRJdGVtKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBUaGUgYXBwcm92YWwgZmlyZXMgdGhlIGdhdGVkIGZvcndhcmQgdHJhbnNpdGlvbiAoY29uZm9ybWFuY2UgcGluKS5cbiAgICAgICAgcmV0dXJuIHRoaXMuZXhlY3V0ZVRyYW5zaXRpb25UeCh0eCwgcGlubmVkSXRlbSwgJ3JlYWR5X2Zvcl9kZXYnLCBpbnB1dC5hY3RvcklkKTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIHJldmlld19hcHByb3ZhbFxuICAgIGF3YWl0IHRoaXMucmVxdWlyZVBlcm1pc3Npb24oaW5wdXQuYWN0b3JJZCwgJ2dhdGUucmV2aWV3LmFwcHJvdmUnKTtcbiAgICBpZiAoaXRlbS5ibG9ja2VkUmVhc29uICE9PSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcihgd29yayBpdGVtIGlzIGJsb2NrZWQ6ICR7aXRlbS5ibG9ja2VkUmVhc29ufWApO1xuICAgIH1cbiAgICBpZiAoaXRlbS5zdGF0ZSAhPT0gJ2luX3JldmlldycpIHtcbiAgICAgIHRocm93IG5ldyBHdWFyZEZhaWxlZEVycm9yKGByZXZpZXdfYXBwcm92YWwgYXBwbGllcyB0byBpbl9yZXZpZXcgaXRlbXMsIG5vdCAke2l0ZW0uc3RhdGV9YCk7XG4gICAgfVxuICAgIGNvbnN0IHF1b3J1bU1ldCA9IGF3YWl0IHRoaXMucXVvcnVtV291bGRCZU1ldChpdGVtLCAncmV2aWV3X2FwcHJvdmFsJywgaW5wdXQuYWN0b3JJZCk7XG4gICAgLy8gRXZpZGVuY2UgaXMgY2hlY2tlZCBleGFjdGx5IHdoZW4gdGhlIHF1b3J1bSB3b3VsZCBjb21wbGV0ZSwgc28gYSBmYWlsZWRcbiAgICAvLyBhcHByb3ZhbCByZWNvcmRzIG5vdGhpbmcgKFBoYXNlIDEgcGluOiBkZW5pZWQgYXR0ZW1wdHMgbXV0YXRlIG5vdGhpbmcpLlxuICAgIGlmIChxdW9ydW1NZXQpIGF3YWl0IHRoaXMuY2hlY2tSZXZpZXdFdmlkZW5jZShpdGVtKTtcbiAgICByZXR1cm4gdGhpcy5kYi50cmFuc2FjdGlvbihhc3luYyAodHgpID0+IHtcbiAgICAgIGF3YWl0IHRoaXMucmVjb3JkQXBwcm92YWxUeCh0eCwgaXRlbSwgJ3Jldmlld19hcHByb3ZhbCcsIGlucHV0LmFjdG9ySWQpO1xuICAgICAgaWYgKCFxdW9ydW1NZXQpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMucHVibGljSXRlbShpdGVtKTsgLy8gcXVvcnVtIHBlbmRpbmcgXHUyMDE0IG5vIHRyYW5zaXRpb24geWV0XG4gICAgICB9XG4gICAgICByZXR1cm4gdGhpcy5leGVjdXRlVHJhbnNpdGlvblR4KHR4LCBpdGVtLCAnZG9uZScsIGlucHV0LmFjdG9ySWQpO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqIERpc3RpbmN0IGFwcHJvdmVycyBvZiB0aGlzIHJvdW5kIChyb3VuZCA9IHJldmlld0xvb3BJdGVyYXRpb24gYXQgZGVjaXNpb24gdGltZSkuICovXG4gIHByaXZhdGUgYXN5bmMgcm91bmRBcHByb3ZlcnMoaXRlbTogV29ya0l0ZW1Sb3csIGdhdGU6IEdhdGVDb2RlKTogUHJvbWlzZTxBY3RvclJvd1tdPiB7XG4gICAgY29uc3Qgcm93cyA9IGF3YWl0IHRoaXMuZGJcbiAgICAgIC5zZWxlY3QoeyBhY3RvcklkOiBnYXRlRGVjaXNpb25zLmFjdG9ySWQgfSlcbiAgICAgIC5mcm9tKGdhdGVEZWNpc2lvbnMpXG4gICAgICAud2hlcmUoXG4gICAgICAgIGFuZChcbiAgICAgICAgICBlcShnYXRlRGVjaXNpb25zLndvcmtJdGVtSWQsIGl0ZW0uaWQpLFxuICAgICAgICAgIGVxKGdhdGVEZWNpc2lvbnMuZ2F0ZSwgZ2F0ZSksXG4gICAgICAgICAgZXEoZ2F0ZURlY2lzaW9ucy5kZWNpc2lvbiwgJ2FwcHJvdmVkJyksXG4gICAgICAgICAgZXEoZ2F0ZURlY2lzaW9ucy5yb3VuZCwgaXRlbS5yZXZpZXdMb29wSXRlcmF0aW9uKSxcbiAgICAgICAgKSxcbiAgICAgIClcbiAgICAgIC5vcmRlckJ5KGFzYyhnYXRlRGVjaXNpb25zLnNlcSkpO1xuICAgIGNvbnN0IGlkcyA9IFsuLi5uZXcgU2V0KHJvd3MubWFwKChyb3cpID0+IHJvdy5hY3RvcklkKSldO1xuICAgIGNvbnN0IHJlc3VsdDogQWN0b3JSb3dbXSA9IFtdO1xuICAgIGZvciAoY29uc3QgaWQgb2YgaWRzKSB7XG4gICAgICBjb25zdCBhY3RvciA9IGF3YWl0IHRoaXMuZ2V0QWN0b3JSb3coaWQpO1xuICAgICAgaWYgKGFjdG9yKSByZXN1bHQucHVzaChhY3Rvcik7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICAvKiogR2F0ZSBwb2xpY3kgcXVvcnVtIChyb2FkbWFwIFx1MDBBNzMpOiBtaW4gZGlzdGluY3QgYXBwcm92ZXJzICsgcmVxdWlyZWQgYWN0b3IgdHlwZXMsIGFzIERBVEEuICovXG4gIHByaXZhdGUgYXN5bmMgcXVvcnVtV291bGRCZU1ldChpdGVtOiBXb3JrSXRlbVJvdywgZ2F0ZTogR2F0ZUNvZGUsIG5leHRBcHByb3ZlcklkOiBzdHJpbmcpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICBjb25zdCBwb2xpY3kgPSBhd2FpdCB0aGlzLmdldEdhdGVQb2xpY3koZ2F0ZSk7XG4gICAgY29uc3QgbWluID0gcG9saWN5Lm1pbkFwcHJvdmFscyA/PyAxO1xuICAgIGNvbnN0IHJlcXVpcmVkID0gcG9saWN5LnJlcXVpcmVkQWN0b3JUeXBlcyA/PyBbXTtcbiAgICBjb25zdCBhcHByb3ZlcnMgPSBhd2FpdCB0aGlzLnJvdW5kQXBwcm92ZXJzKGl0ZW0sIGdhdGUpO1xuICAgIGNvbnN0IG5leHRBY3RvciA9IGF3YWl0IHRoaXMuZ2V0QWN0b3JSb3cobmV4dEFwcHJvdmVySWQpO1xuICAgIGlmIChuZXh0QWN0b3IgJiYgIWFwcHJvdmVycy5zb21lKChhKSA9PiBhLmlkID09PSBuZXh0QWN0b3IuaWQpKSBhcHByb3ZlcnMucHVzaChuZXh0QWN0b3IpO1xuICAgIGlmIChhcHByb3ZlcnMubGVuZ3RoIDwgbWluKSByZXR1cm4gZmFsc2U7XG4gICAgZm9yIChjb25zdCB0eXBlIG9mIHJlcXVpcmVkKSB7XG4gICAgICBpZiAoIWFwcHJvdmVycy5zb21lKChhKSA9PiBhLnR5cGUgPT09IHR5cGUpKSByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyByZWNvcmRBcHByb3ZhbFR4KHR4OiBRdWVyeWFibGUsIGl0ZW06IFdvcmtJdGVtUm93LCBnYXRlOiBHYXRlQ29kZSwgYWN0b3JJZDogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgYXdhaXQgdHguaW5zZXJ0KGdhdGVEZWNpc2lvbnMpLnZhbHVlcyh7XG4gICAgICB3b3JrSXRlbUlkOiBpdGVtLmlkLFxuICAgICAgZ2F0ZSxcbiAgICAgIGRlY2lzaW9uOiAnYXBwcm92ZWQnLFxuICAgICAgYWN0b3JJZCxcbiAgICAgIHJvdW5kOiBpdGVtLnJldmlld0xvb3BJdGVyYXRpb24sXG4gICAgfSk7XG4gICAgYXdhaXQgdGhpcy5hcHBlbmRUeCh0eCwgJ3dvcmtfaXRlbScsIGl0ZW0uaWQsICdnYXRlLmFwcHJvdmVkJywgYWN0b3JJZCwge1xuICAgICAgZ2F0ZSxcbiAgICAgIHJvdW5kOiBpdGVtLnJldmlld0xvb3BJdGVyYXRpb24sXG4gICAgICAuLi4oZ2F0ZSA9PT0gJ3NwZWNfYXBwcm92YWwnID8geyBwaW5uZWRWZXJpZmljYXRpb246IGl0ZW0ucGlubmVkVmVyaWZpY2F0aW9uIH0gOiB7fSksXG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogRXZpZGVuY2UgY29uZGl0aW9uIG9mIHRoZSBkb25lIGdhdGUgKFx1MDBBNzEuNCwgRDcpOiBldmVyeSBQSU5ORUQgY29tbWFuZCdzXG4gICAqIGxhdGVzdCB0ZXN0X3J1biBleGl0ZWQgMCwgYW5kIHRoZSBmaW5hbCBjb21taXQgaXMgcmVhY2hhYmxlIG9uIHRoZVxuICAgKiByZW1vdGUuIHJldmlld19yZXBvcnQgaXMgbmV2ZXIgY29uc3VsdGVkLlxuICAgKi9cbiAgcHJpdmF0ZSBhc3luYyBjaGVja1Jldmlld0V2aWRlbmNlKGl0ZW06IFdvcmtJdGVtUm93KTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3Qgcm93cyA9IGF3YWl0IHRoaXMuZGJcbiAgICAgIC5zZWxlY3QoKVxuICAgICAgLmZyb20oZXZpZGVuY2VUYWJsZSlcbiAgICAgIC53aGVyZShlcShldmlkZW5jZVRhYmxlLndvcmtJdGVtSWQsIGl0ZW0uaWQpKVxuICAgICAgLm9yZGVyQnkoYXNjKGV2aWRlbmNlVGFibGUuc2VxKSk7XG4gICAgZm9yIChjb25zdCBjb21tYW5kIG9mIGl0ZW0ucGlubmVkVmVyaWZpY2F0aW9uID8/IFtdKSB7XG4gICAgICBjb25zdCBydW5zID0gcm93cy5maWx0ZXIoKHJvdykgPT4gcm93LmtpbmQgPT09ICd0ZXN0X3J1bicgJiYgcm93LnBheWxvYWRbJ2NvbW1hbmQnXSA9PT0gY29tbWFuZCk7XG4gICAgICBjb25zdCBsYXRlc3QgPSBydW5zW3J1bnMubGVuZ3RoIC0gMV07XG4gICAgICBpZiAoIWxhdGVzdCB8fCBsYXRlc3QucGF5bG9hZFsnZXhpdENvZGUnXSAhPT0gMCkge1xuICAgICAgICB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcihgcGlubmVkIHZlcmlmaWNhdGlvbiBkaWQgbm90IHBhc3M6ICR7Y29tbWFuZH1gKTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKGl0ZW0ua2luZCA9PT0gJ2NvZGUnKSB7XG4gICAgICAvLyBOb24tY29kZSBkZWxpdmVyYWJsZXMgY2Fycnkgbm8gY29tbWl0IHJlcXVpcmVtZW50IChyb2FkbWFwIFx1MDBBNzEuNCk6XG4gICAgICAvLyB0aGVpciBjb21wbGV0aW9uIHJlc3RzIG9uIG1hY2hpbmUtY2hlY2thYmxlIGRvYyBldmlkZW5jZSBwbHVzIHRoZVxuICAgICAgLy8gcGVybWl0dGVkIGFjdG9yJ3MgZGVjaXNpb24uXG4gICAgICBjb25zdCBjb21taXRPayA9IHJvd3Muc29tZSgocm93KSA9PiByb3cua2luZCA9PT0gJ2NvbW1pdCcgJiYgcm93LnBheWxvYWRbJ3JlYWNoYWJsZU9uUmVtb3RlJ10gPT09IHRydWUpO1xuICAgICAgaWYgKCFjb21taXRPaykge1xuICAgICAgICB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcihcbiAgICAgICAgICAnZmluYWwgcmV2aXNpb24gbXVzdCBiZSByZWFjaGFibGUgb24gdGhlIHJlbW90ZSAocHVzaCBpcyBwYXJ0IG9mIHRoZSBIQUxUIGNvbnRyYWN0KScsXG4gICAgICAgICk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgcmVqZWN0R2F0ZShpbnB1dDogR2F0ZURlY2lzaW9uSW5wdXQpOiBQcm9taXNlPFdvcmtJdGVtPiB7XG4gICAgY29uc3QgaXRlbSA9IGF3YWl0IHRoaXMubXVzdEdldEl0ZW0oaW5wdXQud29ya0l0ZW1JZCk7XG4gICAgaWYgKGlucHV0LmdhdGUgIT09ICdyZXZpZXdfYXBwcm92YWwnKSB7XG4gICAgICB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcignb25seSByZXZpZXdfYXBwcm92YWwgcmVqZWN0aW9uIGlzIGRlZmluZWQgaW4gUGhhc2UgMScpO1xuICAgIH1cbiAgICAvLyBQaGFzZSAyIChhZGRpdGl2ZSk6IHJlamVjdGlvbiBhdXRob3JpdHkgPSBnYXRlLnJldmlldy5hcHByb3ZlIE9SXG4gICAgLy8gZ2F0ZS5yZXZpZXcucmVqZWN0IFx1MjAxNCB0aGUgUGhhc2UgMiBleGl0IGNyaXRlcmlvbidzIHJldmlld2VyLWFnZW50IGhvbGRzXG4gICAgLy8gb25seSB0aGUgbGF0dGVyLiBFdmVyeSBQaGFzZSAxIHBpbiBvbiByZWplY3RHYXRlIGtlZXBzIGhvbGRpbmcuXG4gICAgaWYgKFxuICAgICAgIShhd2FpdCB0aGlzLmhhc1Blcm1pc3Npb24oaW5wdXQuYWN0b3JJZCwgJ2dhdGUucmV2aWV3LmFwcHJvdmUnKSkgJiZcbiAgICAgICEoYXdhaXQgdGhpcy5oYXNQZXJtaXNzaW9uKGlucHV0LmFjdG9ySWQsICdnYXRlLnJldmlldy5yZWplY3QnKSlcbiAgICApIHtcbiAgICAgIHRocm93IG5ldyBQZXJtaXNzaW9uRGVuaWVkRXJyb3IoJ2dhdGUucmV2aWV3LnJlamVjdCcsIGlucHV0LmFjdG9ySWQpO1xuICAgIH1cbiAgICBpZiAoaXRlbS5zdGF0ZSAhPT0gJ2luX3JldmlldycpIHtcbiAgICAgIHRocm93IG5ldyBHdWFyZEZhaWxlZEVycm9yKGByZXZpZXcgcmVqZWN0aW9uIGFwcGxpZXMgdG8gaW5fcmV2aWV3IGl0ZW1zLCBub3QgJHtpdGVtLnN0YXRlfWApO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5kYi50cmFuc2FjdGlvbihhc3luYyAodHgpID0+IHtcbiAgICAgIGF3YWl0IHR4Lmluc2VydChnYXRlRGVjaXNpb25zKS52YWx1ZXMoe1xuICAgICAgICB3b3JrSXRlbUlkOiBpdGVtLmlkLFxuICAgICAgICBnYXRlOiAncmV2aWV3X2FwcHJvdmFsJyxcbiAgICAgICAgZGVjaXNpb246ICdyZWplY3RlZCcsXG4gICAgICAgIGFjdG9ySWQ6IGlucHV0LmFjdG9ySWQsXG4gICAgICAgIHJvdW5kOiBpdGVtLnJldmlld0xvb3BJdGVyYXRpb24sXG4gICAgICB9KTtcbiAgICAgIGNvbnN0IGRlY2lzaW9uRXZlbnQgPSBhd2FpdCB0aGlzLmFwcGVuZFR4KHR4LCAnd29ya19pdGVtJywgaXRlbS5pZCwgJ2dhdGUucmVqZWN0ZWQnLCBpbnB1dC5hY3RvcklkLCB7XG4gICAgICAgIGdhdGU6ICdyZXZpZXdfYXBwcm92YWwnLFxuICAgICAgfSk7XG5cbiAgICAgIGlmIChpdGVtLnJldmlld0xvb3BJdGVyYXRpb24gPj0gUkVWSUVXX0xPT1BfTElNSVQpIHtcbiAgICAgICAgLy8gVGhlIDZ0aCByZWplY3Rpb24gcGVyZm9ybXMgbm8gbG9vcGJhY2s6IG92ZXJsYXkgcmV2aWV3X25vbl9jb252ZXJnZW5jZSxcbiAgICAgICAgLy8gc3RhdGUgZnJvemVuIGF0IGluX3JldmlldywgY291bnRlciB1bnRvdWNoZWQgKENPTkZPUk1BTkNFLm1kIHBpbikuXG4gICAgICAgIGF3YWl0IHR4XG4gICAgICAgICAgLnVwZGF0ZSh3b3JrSXRlbXMpXG4gICAgICAgICAgLnNldCh7IGJsb2NrZWRSZWFzb246ICdyZXZpZXdfbm9uX2NvbnZlcmdlbmNlJywgc3RhdGVWZXJzaW9uOiBpdGVtLnN0YXRlVmVyc2lvbiArIDEgfSlcbiAgICAgICAgICAud2hlcmUoZXEod29ya0l0ZW1zLmlkLCBpdGVtLmlkKSk7XG4gICAgICAgIGF3YWl0IHRoaXMuYXBwZW5kVHgoXG4gICAgICAgICAgdHgsXG4gICAgICAgICAgJ3dvcmtfaXRlbScsXG4gICAgICAgICAgaXRlbS5pZCxcbiAgICAgICAgICAnd29ya19pdGVtLmJsb2NrZWQnLFxuICAgICAgICAgIHRoaXMuc3lzdGVtQWN0b3JJZCxcbiAgICAgICAgICB7IHJlYXNvbjogJ3Jldmlld19ub25fY29udmVyZ2VuY2UnIH0sXG4gICAgICAgICAgeyBjYXVzYXRpb25JZDogU3RyaW5nKGRlY2lzaW9uRXZlbnQuZ2xvYmFsU2VxKSB9LFxuICAgICAgICApO1xuICAgICAgICByZXR1cm4gdGhpcy5wdWJsaWNJdGVtKHtcbiAgICAgICAgICAuLi5pdGVtLFxuICAgICAgICAgIGJsb2NrZWRSZWFzb246ICdyZXZpZXdfbm9uX2NvbnZlcmdlbmNlJyxcbiAgICAgICAgICBzdGF0ZVZlcnNpb246IGl0ZW0uc3RhdGVWZXJzaW9uICsgMSxcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIC8vIFx1MDBBNzEuMjogdGhlIGxvb3BiYWNrIGlzIGEgc3lzdGVtIGVmZmVjdCBcdTIwMTQgbm8gY2xhaW0taG9sZGVyIHBhcnRpY2lwYXRpb24uXG4gICAgICBhd2FpdCB0eFxuICAgICAgICAudXBkYXRlKHdvcmtJdGVtcylcbiAgICAgICAgLnNldCh7IHJldmlld0xvb3BJdGVyYXRpb246IGl0ZW0ucmV2aWV3TG9vcEl0ZXJhdGlvbiArIDEgfSlcbiAgICAgICAgLndoZXJlKGVxKHdvcmtJdGVtcy5pZCwgaXRlbS5pZCkpO1xuICAgICAgY29uc3QgYnVtcGVkID0geyAuLi5pdGVtLCByZXZpZXdMb29wSXRlcmF0aW9uOiBpdGVtLnJldmlld0xvb3BJdGVyYXRpb24gKyAxIH07XG4gICAgICByZXR1cm4gdGhpcy5leGVjdXRlVHJhbnNpdGlvblR4KFxuICAgICAgICB0eCxcbiAgICAgICAgYnVtcGVkLFxuICAgICAgICAnaW5fcHJvZ3Jlc3MnLFxuICAgICAgICB0aGlzLnN5c3RlbUFjdG9ySWQsXG4gICAgICAgIHVuZGVmaW5lZCxcbiAgICAgICAgU3RyaW5nKGRlY2lzaW9uRXZlbnQuZ2xvYmFsU2VxKSxcbiAgICAgICk7XG4gICAgfSk7XG4gIH1cblxuICAvLyAtLSBjb2xsYWJvcmF0aW9uIChQaGFzZSAzLCByb2FkbWFwIFx1MDBBNzUpIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIHByaXZhdGUgYXN5bmMgbXVzdEdldFRocmVhZCh0aHJlYWRJZDogc3RyaW5nLCB0eDogUXVlcnlhYmxlID0gdGhpcy5kYik6IFByb21pc2U8VGhyZWFkUm93PiB7XG4gICAgY29uc3Qgcm93cyA9IGF3YWl0IHR4LnNlbGVjdCgpLmZyb20odGhyZWFkcykud2hlcmUoZXEodGhyZWFkcy5pZCwgdGhyZWFkSWQpKS5saW1pdCgxKTtcbiAgICBjb25zdCByb3cgPSByb3dzWzBdO1xuICAgIGlmICghcm93KSB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcihgdW5rbm93biB0aHJlYWQ6ICR7dGhyZWFkSWR9YCk7XG4gICAgcmV0dXJuIHJvdztcbiAgfVxuXG4gIHByaXZhdGUgaXNQYXJ0aWNpcGFudCh0aHJlYWQ6IFRocmVhZFJvdywgYWN0b3JJZDogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRocmVhZC5jcmVhdGVkQnkgPT09IGFjdG9ySWQgfHwgdGhyZWFkLnBhcnRpY2lwYW50cy5pbmNsdWRlcyhhY3RvcklkKTtcbiAgfVxuXG4gIHByaXZhdGUgcHVibGljVGhyZWFkKHJvdzogT21pdDxUaHJlYWRSb3csICdzZXEnPik6IFRocmVhZCB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGlkOiByb3cuaWQsXG4gICAgICBmZWF0dXJlSWQ6IHJvdy5mZWF0dXJlSWQsXG4gICAgICB3b3JrSXRlbUlkOiByb3cud29ya0l0ZW1JZCxcbiAgICAgIGtpbmQ6IHJvdy5raW5kIGFzIFRocmVhZEtpbmQsXG4gICAgICB2aXNpYmlsaXR5OiByb3cudmlzaWJpbGl0eSBhcyBUaHJlYWRWaXNpYmlsaXR5LFxuICAgICAgY3JlYXRlZEJ5OiByb3cuY3JlYXRlZEJ5LFxuICAgICAgcGFydGljaXBhbnRzOiBbLi4ucm93LnBhcnRpY2lwYW50c10sXG4gICAgfTtcbiAgfVxuXG4gIHByaXZhdGUgcHVibGljTWVzc2FnZShyb3c6IE1lc3NhZ2VSb3cpOiBNZXNzYWdlIHtcbiAgICByZXR1cm4ge1xuICAgICAgaWQ6IHJvdy5pZCxcbiAgICAgIHRocmVhZElkOiByb3cudGhyZWFkSWQsXG4gICAgICBzZXE6IHJvdy5zZXEsXG4gICAgICBhdXRob3JJZDogcm93LmF1dGhvcklkLFxuICAgICAga2luZDogcm93LmtpbmQgYXMgTWVzc2FnZVsna2luZCddLFxuICAgICAgYm9keTogcm93LmJvZHksXG4gICAgICByZXBseVRvOiByb3cucmVwbHlUbyxcbiAgICB9O1xuICB9XG5cbiAgcHJpdmF0ZSBwdWJsaWNKb2Iocm93OiBPbWl0PEFnZW50Sm9iUm93LCAnc2VxJz4pOiBBZ2VudEpvYiB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGlkOiByb3cuaWQsXG4gICAgICBhZ2VudEFjdG9ySWQ6IHJvdy5hZ2VudEFjdG9ySWQsXG4gICAgICB0aHJlYWRJZDogcm93LnRocmVhZElkLFxuICAgICAgbWVzc2FnZUlkOiByb3cubWVzc2FnZUlkLFxuICAgICAgd29ya0l0ZW1JZDogcm93LndvcmtJdGVtSWQsXG4gICAgICBmZWF0dXJlSWQ6IHJvdy5mZWF0dXJlSWQsXG4gICAgICBzdGF0dXM6IHJvdy5zdGF0dXMgYXMgQWdlbnRKb2JbJ3N0YXR1cyddLFxuICAgICAgZGVwdGg6IHJvdy5kZXB0aCxcbiAgICAgIG5vdGU6IHJvdy5ub3RlLFxuICAgIH07XG4gIH1cblxuICBhc3luYyBjcmVhdGVUaHJlYWQoaW5wdXQ6IHtcbiAgICBhY3RvcklkOiBzdHJpbmc7XG4gICAga2luZDogVGhyZWFkS2luZDtcbiAgICBmZWF0dXJlSWQ/OiBzdHJpbmc7XG4gICAgd29ya0l0ZW1JZD86IHN0cmluZztcbiAgICB2aXNpYmlsaXR5PzogVGhyZWFkVmlzaWJpbGl0eTtcbiAgfSk6IFByb21pc2U8VGhyZWFkPiB7XG4gICAgaWYgKGlucHV0LmZlYXR1cmVJZCAhPT0gdW5kZWZpbmVkICYmIChhd2FpdCB0aGlzLmdldEZlYXR1cmVSb3coaW5wdXQuZmVhdHVyZUlkKSkgPT09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBHdWFyZEZhaWxlZEVycm9yKGB1bmtub3duIGZlYXR1cmU6ICR7aW5wdXQuZmVhdHVyZUlkfWApO1xuICAgIH1cbiAgICBsZXQgd29ya0l0ZW1JZDogc3RyaW5nIHwgbnVsbCA9IG51bGw7XG4gICAgaWYgKGlucHV0LndvcmtJdGVtSWQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgd29ya0l0ZW1JZCA9IChhd2FpdCB0aGlzLm11c3RHZXRJdGVtKGlucHV0LndvcmtJdGVtSWQpKS5pZDtcbiAgICB9XG4gICAgY29uc3QgdGhyZWFkID0ge1xuICAgICAgaWQ6IHRoaXMubmV4dElkKCd0aCcpLFxuICAgICAgZmVhdHVyZUlkOiBpbnB1dC5mZWF0dXJlSWQgPz8gbnVsbCxcbiAgICAgIHdvcmtJdGVtSWQsXG4gICAgICBraW5kOiBpbnB1dC5raW5kLFxuICAgICAgdmlzaWJpbGl0eTogaW5wdXQudmlzaWJpbGl0eSA/PyAoaW5wdXQua2luZCA9PT0gJ3ByaXZhdGUnID8gJ3ByaXZhdGUnIDogJ29wZW4nKSxcbiAgICAgIGNyZWF0ZWRCeTogaW5wdXQuYWN0b3JJZCxcbiAgICAgIHBhcnRpY2lwYW50czogW2lucHV0LmFjdG9ySWRdLFxuICAgIH07XG4gICAgcmV0dXJuIHRoaXMuZGIudHJhbnNhY3Rpb24oYXN5bmMgKHR4KSA9PiB7XG4gICAgICBhd2FpdCB0eC5pbnNlcnQodGhyZWFkcykudmFsdWVzKHRocmVhZCk7XG4gICAgICBhd2FpdCB0aGlzLmFwcGVuZFR4KHR4LCAndGhyZWFkJywgdGhyZWFkLmlkLCAndGhyZWFkLmNyZWF0ZWQnLCBpbnB1dC5hY3RvcklkLCB7XG4gICAgICAgIGtpbmQ6IHRocmVhZC5raW5kLFxuICAgICAgICBmZWF0dXJlSWQ6IHRocmVhZC5mZWF0dXJlSWQsXG4gICAgICAgIHdvcmtJdGVtSWQ6IHRocmVhZC53b3JrSXRlbUlkLFxuICAgICAgICB2aXNpYmlsaXR5OiB0aHJlYWQudmlzaWJpbGl0eSxcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIHRoaXMucHVibGljVGhyZWFkKHRocmVhZCk7XG4gICAgfSk7XG4gIH1cblxuICBhc3luYyBhZGRUaHJlYWRQYXJ0aWNpcGFudChpbnB1dDogeyB0aHJlYWRJZDogc3RyaW5nOyBhY3RvcklkOiBzdHJpbmc7IGJ5QWN0b3JJZDogc3RyaW5nIH0pOiBQcm9taXNlPFRocmVhZD4ge1xuICAgIGNvbnN0IHRocmVhZCA9IGF3YWl0IHRoaXMubXVzdEdldFRocmVhZChpbnB1dC50aHJlYWRJZCk7XG4gICAgaWYgKCF0aGlzLmlzUGFydGljaXBhbnQodGhyZWFkLCBpbnB1dC5ieUFjdG9ySWQpKSB7XG4gICAgICB0aHJvdyBuZXcgUGVybWlzc2lvbkRlbmllZEVycm9yKCd0aHJlYWQuaW52aXRlJywgaW5wdXQuYnlBY3RvcklkKTtcbiAgICB9XG4gICAgaWYgKChhd2FpdCB0aGlzLmdldEFjdG9yUm93KGlucHV0LmFjdG9ySWQpKSA9PT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoYHVua25vd24gYWN0b3I6ICR7aW5wdXQuYWN0b3JJZH1gKTtcbiAgICB9XG4gICAgaWYgKHRocmVhZC5wYXJ0aWNpcGFudHMuaW5jbHVkZXMoaW5wdXQuYWN0b3JJZCkpIHJldHVybiB0aGlzLnB1YmxpY1RocmVhZCh0aHJlYWQpO1xuICAgIGNvbnN0IHBhcnRpY2lwYW50cyA9IFsuLi50aHJlYWQucGFydGljaXBhbnRzLCBpbnB1dC5hY3RvcklkXTtcbiAgICByZXR1cm4gdGhpcy5kYi50cmFuc2FjdGlvbihhc3luYyAodHgpID0+IHtcbiAgICAgIGF3YWl0IHR4LnVwZGF0ZSh0aHJlYWRzKS5zZXQoeyBwYXJ0aWNpcGFudHMgfSkud2hlcmUoZXEodGhyZWFkcy5pZCwgdGhyZWFkLmlkKSk7XG4gICAgICBhd2FpdCB0aGlzLmFwcGVuZFR4KHR4LCAndGhyZWFkJywgdGhyZWFkLmlkLCAndGhyZWFkLnBhcnRpY2lwYW50X2FkZGVkJywgaW5wdXQuYnlBY3RvcklkLCB7XG4gICAgICAgIGFjdG9ySWQ6IGlucHV0LmFjdG9ySWQsXG4gICAgICB9KTtcbiAgICAgIHJldHVybiB0aGlzLnB1YmxpY1RocmVhZCh7IC4uLnRocmVhZCwgcGFydGljaXBhbnRzIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqIEludGVybmFsIGFwcGVuZCB0aGF0IG5ldmVyIHJ1bnMgdGhlIHJvdXRlciBcdTIwMTQgdXNlZCBmb3IgY2hhdCwgbmFycmF0aW9uIGFsaWtlLiAqL1xuICBwcml2YXRlIGFzeW5jIGFwcGVuZE1lc3NhZ2VUeChcbiAgICB0eDogUXVlcnlhYmxlLFxuICAgIHRocmVhZDogVGhyZWFkUm93IHwgT21pdDxUaHJlYWRSb3csICdzZXEnPixcbiAgICBhdXRob3JJZDogc3RyaW5nLFxuICAgIGtpbmQ6IE1lc3NhZ2VbJ2tpbmQnXSxcbiAgICBib2R5OiBzdHJpbmcsXG4gICAgcmVwbHlUbzogc3RyaW5nIHwgbnVsbCxcbiAgKTogUHJvbWlzZTxNZXNzYWdlPiB7XG4gICAgLy8gUGVyLXRocmVhZCwgMS1iYXNlZCwgZ2FwLWZyZWUgXHUyMDE0IFVOSVFVRSh0aHJlYWRfaWQsIHNlcSkgZW5mb3JjZXMgaXQsIHRoZVxuICAgIC8vIHNhbWUtdHJhbnNhY3Rpb24gbWF4KCkgY29tcHV0ZXMgaXQgKG1pcnJvcnMgdGhlIHJlZmVyZW5jZSBjb3VudCsxKS5cbiAgICBjb25zdCBbcm93XSA9IGF3YWl0IHR4XG4gICAgICAuc2VsZWN0KHsgbWF4U2VxOiBzcWw8bnVtYmVyPmBjb2FsZXNjZShtYXgoJHttZXNzYWdlcy5zZXF9KSwgMClgIH0pXG4gICAgICAuZnJvbShtZXNzYWdlcylcbiAgICAgIC53aGVyZShlcShtZXNzYWdlcy50aHJlYWRJZCwgdGhyZWFkLmlkKSk7XG4gICAgY29uc3Qgc2VxID0gTnVtYmVyKHJvdz8ubWF4U2VxID8/IDApICsgMTtcbiAgICBjb25zdCBtZXNzYWdlOiBNZXNzYWdlID0ge1xuICAgICAgaWQ6IHRoaXMubmV4dElkKCdtc2cnKSxcbiAgICAgIHRocmVhZElkOiB0aHJlYWQuaWQsXG4gICAgICBzZXEsXG4gICAgICBhdXRob3JJZCxcbiAgICAgIGtpbmQsXG4gICAgICBib2R5LFxuICAgICAgcmVwbHlUbyxcbiAgICB9O1xuICAgIGF3YWl0IHR4Lmluc2VydChtZXNzYWdlcykudmFsdWVzKG1lc3NhZ2UpO1xuICAgIGF3YWl0IHRoaXMuYXBwZW5kVHgodHgsICd0aHJlYWQnLCB0aHJlYWQuaWQsICdtZXNzYWdlLnBvc3RlZCcsIGF1dGhvcklkLCB7XG4gICAgICBtZXNzYWdlSWQ6IG1lc3NhZ2UuaWQsXG4gICAgICBraW5kLFxuICAgIH0pO1xuICAgIHJldHVybiB7IC4uLm1lc3NhZ2UgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBcdTAwQTc1LjI6IHRoZSBzZXJ2ZXIgTkVWRVIgcGFyc2VzIGJvZHkgdGV4dCBcdTIwMTQgYG1lbnRpb25zYCBpcyBzdHJ1Y3R1cmVkIGFjdG9yXG4gICAqIGlkcy4gXHUwMEE3NS40OiB0aGUgcm91dGVyIGlzIHB1cmUgY29kZSwgZGVmYXVsdC1kZW55LCBwb2xpY3ktZ2F0ZWQsXG4gICAqIGRlcHRoLWNhcHBlZDsgYSBqb2IgaXMgcmVwbHktb25seSBjb250ZXh0LCBuZXZlciBhIGNsYWltLlxuICAgKi9cbiAgYXN5bmMgcG9zdE1lc3NhZ2UoaW5wdXQ6IHtcbiAgICB0aHJlYWRJZDogc3RyaW5nO1xuICAgIGFjdG9ySWQ6IHN0cmluZztcbiAgICBib2R5OiBzdHJpbmc7XG4gICAgcmVwbHlUbz86IHN0cmluZztcbiAgICBtZW50aW9ucz86IHN0cmluZ1tdO1xuICB9KTogUHJvbWlzZTxNZXNzYWdlPiB7XG4gICAgY29uc3QgdGhyZWFkID0gYXdhaXQgdGhpcy5tdXN0R2V0VGhyZWFkKGlucHV0LnRocmVhZElkKTtcbiAgICBpZiAodGhyZWFkLnZpc2liaWxpdHkgPT09ICdwcml2YXRlJyAmJiAhdGhpcy5pc1BhcnRpY2lwYW50KHRocmVhZCwgaW5wdXQuYWN0b3JJZCkpIHtcbiAgICAgIHRocm93IG5ldyBQZXJtaXNzaW9uRGVuaWVkRXJyb3IoJ3RocmVhZC5wb3N0JywgaW5wdXQuYWN0b3JJZCk7XG4gICAgfVxuICAgIGNvbnN0IG1lbnRpb25JZHMgPSBbLi4ubmV3IFNldChpbnB1dC5tZW50aW9ucyA/PyBbXSldO1xuICAgIHJldHVybiB0aGlzLmRiLnRyYW5zYWN0aW9uKGFzeW5jICh0eCkgPT4ge1xuICAgICAgY29uc3QgbWVzc2FnZSA9IGF3YWl0IHRoaXMuYXBwZW5kTWVzc2FnZVR4KHR4LCB0aHJlYWQsIGlucHV0LmFjdG9ySWQsICdjaGF0JywgaW5wdXQuYm9keSwgaW5wdXQucmVwbHlUbyA/PyBudWxsKTtcbiAgICAgIGZvciAoY29uc3QgbWVudGlvbmVkSWQgb2YgbWVudGlvbklkcykge1xuICAgICAgICBjb25zdCBtZW50aW9uZWQgPSBhd2FpdCB0aGlzLmdldEFjdG9yUm93KG1lbnRpb25lZElkLCB0eCk7XG4gICAgICAgIGlmICghbWVudGlvbmVkKSB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcihgdW5rbm93biBtZW50aW9uZWQgYWN0b3I6ICR7bWVudGlvbmVkSWR9YCk7XG4gICAgICAgIGNvbnN0IHJlc29sdXRpb24gPSBhd2FpdCB0aGlzLnJvdXRlTWVudGlvblR4KHR4LCB0aHJlYWQsIG1lc3NhZ2UsIGlucHV0LmFjdG9ySWQsIG1lbnRpb25lZCk7XG4gICAgICAgIGF3YWl0IHR4Lmluc2VydChtZW50aW9ucykudmFsdWVzKHtcbiAgICAgICAgICBtZXNzYWdlSWQ6IG1lc3NhZ2UuaWQsXG4gICAgICAgICAgbWVudGlvbmVkQWN0b3JJZDogbWVudGlvbmVkSWQsXG4gICAgICAgICAgcmVzb2x1dGlvbixcbiAgICAgICAgfSk7XG4gICAgICAgIGF3YWl0IHRoaXMuYXBwZW5kVHgodHgsICd0aHJlYWQnLCB0aHJlYWQuaWQsICdtZW50aW9uLnJlY29yZGVkJywgaW5wdXQuYWN0b3JJZCwge1xuICAgICAgICAgIG1lc3NhZ2VJZDogbWVzc2FnZS5pZCxcbiAgICAgICAgICBtZW50aW9uZWRBY3RvcklkOiBtZW50aW9uZWRJZCxcbiAgICAgICAgICByZXNvbHV0aW9uLFxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBtZXNzYWdlO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqIFRoZSBkZXRlcm1pbmlzdGljIG1lbnRpb24gcm91dGVyIChcdTAwQTc1LjQpLiBSZXR1cm5zIHRoZSByZWNvcmRlZCByZXNvbHV0aW9uLiAqL1xuICBwcml2YXRlIGFzeW5jIHJvdXRlTWVudGlvblR4KFxuICAgIHR4OiBUeCxcbiAgICB0aHJlYWQ6IFRocmVhZFJvdyxcbiAgICBtZXNzYWdlOiBNZXNzYWdlLFxuICAgIG1lbnRpb25lcklkOiBzdHJpbmcsXG4gICAgbWVudGlvbmVkOiBBY3RvclJvdyxcbiAgKTogUHJvbWlzZTxNZW50aW9uUmVzb2x1dGlvbj4ge1xuICAgIGlmIChtZW50aW9uZWQudHlwZSAhPT0gJ2FnZW50Jykge1xuICAgICAgYXdhaXQgdGhpcy5wdXNoTm90aWZpY2F0aW9uVHgodHgsIG1lbnRpb25lZC5pZCwgJ21lbnRpb24nLCBtZXNzYWdlLmlkKTtcbiAgICAgIHJldHVybiAnbm90aWZpZWQnO1xuICAgIH1cbiAgICBjb25zdCBwb2xpY3kgPSAoYXdhaXQgdGhpcy53b3Jrc3BhY2VSb3codHgpKS5wb2xpY3kgYXMgV29ya3NwYWNlUG9saWN5O1xuICAgIC8vIGtpbGwtc3dpdGNoIGFwcGxpZXMgdG8gZXZlcnkgam9iLW1hdGVyaWFsaXppbmcgcGF0aFxuICAgIGlmIChwb2xpY3kubWVudGlvbkRpc3BhdGNoID09PSBmYWxzZSkgcmV0dXJuICdkZW5pZWRfcG9saWN5JztcblxuICAgIGNvbnN0IG1lbnRpb25lciA9IGF3YWl0IHRoaXMuZ2V0QWN0b3JSb3cobWVudGlvbmVySWQsIHR4KTtcbiAgICBsZXQgZGVwdGggPSAwO1xuICAgIGlmIChtZW50aW9uZXI/LnR5cGUgPT09ICdhZ2VudCcpIHtcbiAgICAgIC8vIGFnZW50LW1lbnRpb24tYWdlbnQ6IGV4cGxpY2l0IHBvbGljeSArIGRlcHRoIGNhcCAoXHUwMEE3NS40KVxuICAgICAgaWYgKHBvbGljeS5hZ2VudE1lbnRpb25BZ2VudCAhPT0gdHJ1ZSkgcmV0dXJuICdkZW5pZWRfcG9saWN5JztcbiAgICAgIGNvbnN0IG1lbnRpb25lckpvYnMgPSBhd2FpdCB0eFxuICAgICAgICAuc2VsZWN0KHsgZGVwdGg6IGFnZW50Sm9icy5kZXB0aCB9KVxuICAgICAgICAuZnJvbShhZ2VudEpvYnMpXG4gICAgICAgIC53aGVyZShlcShhZ2VudEpvYnMuYWdlbnRBY3RvcklkLCBtZW50aW9uZXJJZCkpO1xuICAgICAgZGVwdGggPSBNYXRoLm1heCgwLCAuLi5tZW50aW9uZXJKb2JzLm1hcCgoaikgPT4gai5kZXB0aCkpICsgMTtcbiAgICAgIGlmIChkZXB0aCA+IEFHRU5UX0pPQl9NQVhfREVQVEgpIHJldHVybiAnZGVuaWVkX2RlcHRoJztcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gZGVmYXVsdC1kZW55OiB0aGUgaHVtYW4gbWVudGlvbmVyIG11c3QgaG9sZCBpbnZva2UgYXV0aG9yaXR5IFx1MjAxNFxuICAgICAgLy8gYXQgbGVhc3Qgb25lIGFjdGl2ZSBkZWxpdmVyeSByb2xlLCBvciBnb3Zlcm5hbmNlIGFkbWluLlxuICAgICAgY29uc3QgaGFzUm9sZSA9XG4gICAgICAgIChcbiAgICAgICAgICBhd2FpdCB0eFxuICAgICAgICAgICAgLnNlbGVjdCh7IHNlcTogcm9sZUFzc2lnbm1lbnRzLnNlcSB9KVxuICAgICAgICAgICAgLmZyb20ocm9sZUFzc2lnbm1lbnRzKVxuICAgICAgICAgICAgLndoZXJlKGFuZChlcShyb2xlQXNzaWdubWVudHMuYWN0b3JJZCwgbWVudGlvbmVySWQpLCBlcShyb2xlQXNzaWdubWVudHMucmV2b2tlZCwgZmFsc2UpKSlcbiAgICAgICAgICAgIC5saW1pdCgxKVxuICAgICAgICApLmxlbmd0aCA+IDA7XG4gICAgICBjb25zdCBpc0FkbWluID0gbWVudGlvbmVyPy5nb3Zlcm5hbmNlUm9sZSA9PT0gJ2FkbWluJyB8fCBtZW50aW9uZXJJZCA9PT0gdGhpcy5zeXN0ZW1BY3RvcklkO1xuICAgICAgaWYgKCFoYXNSb2xlICYmICFpc0FkbWluKSByZXR1cm4gJ2RlbmllZF9wb2xpY3knO1xuICAgIH1cblxuICAgIGNvbnN0IGpvYiA9IHtcbiAgICAgIGlkOiB0aGlzLm5leHRJZCgnam9iJyksXG4gICAgICBhZ2VudEFjdG9ySWQ6IG1lbnRpb25lZC5pZCxcbiAgICAgIHRocmVhZElkOiB0aHJlYWQuaWQsXG4gICAgICBtZXNzYWdlSWQ6IG1lc3NhZ2UuaWQsXG4gICAgICB3b3JrSXRlbUlkOiB0aHJlYWQud29ya0l0ZW1JZCxcbiAgICAgIGZlYXR1cmVJZDogdGhyZWFkLmZlYXR1cmVJZCxcbiAgICAgIHN0YXR1czogJ3F1ZXVlZCcgYXMgY29uc3QsXG4gICAgICBkZXB0aCxcbiAgICAgIG5vdGU6IG51bGwsXG4gICAgfTtcbiAgICBhd2FpdCB0eC5pbnNlcnQoYWdlbnRKb2JzKS52YWx1ZXMoam9iKTtcbiAgICBhd2FpdCB0aGlzLmFwcGVuZFR4KHR4LCAnYWdlbnRfam9iJywgam9iLmlkLCAnYWdlbnRfam9iLmNyZWF0ZWQnLCBtZW50aW9uZXJJZCwge1xuICAgICAgYWdlbnRBY3RvcklkOiBtZW50aW9uZWQuaWQsXG4gICAgICB0aHJlYWRJZDogdGhyZWFkLmlkLFxuICAgICAgbWVzc2FnZUlkOiBtZXNzYWdlLmlkLFxuICAgICAgZGVwdGgsXG4gICAgfSk7XG4gICAgYXdhaXQgdGhpcy5wdXNoTm90aWZpY2F0aW9uVHgodHgsIG1lbnRpb25lZC5pZCwgJ21lbnRpb24nLCBtZXNzYWdlLmlkKTtcbiAgICByZXR1cm4gJ2pvYl9jcmVhdGVkJztcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgcHVzaE5vdGlmaWNhdGlvblR4KFxuICAgIHR4OiBRdWVyeWFibGUsXG4gICAgYWN0b3JJZDogc3RyaW5nLFxuICAgIHNvdXJjZTogTm90aWZpY2F0aW9uWydzb3VyY2UnXSxcbiAgICByZWZJZDogc3RyaW5nLFxuICApOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBhd2FpdCB0eC5pbnNlcnQobm90aWZpY2F0aW9ucykudmFsdWVzKHtcbiAgICAgIGlkOiB0aGlzLm5leHRJZCgnbnRmJyksXG4gICAgICBhY3RvcklkLFxuICAgICAgc291cmNlLFxuICAgICAgcmVmSWQsXG4gICAgICByZWFkOiBmYWxzZSxcbiAgICB9KTtcbiAgfVxuXG4gIGFzeW5jIGxpc3RUaHJlYWRzKGZpbHRlcj86IHsgZmVhdHVyZUlkPzogc3RyaW5nOyB3b3JrSXRlbUlkPzogc3RyaW5nOyBhY3RvcklkPzogc3RyaW5nIH0pOiBQcm9taXNlPFRocmVhZFtdPiB7XG4gICAgY29uc3Qgcm93cyA9IGF3YWl0IHRoaXMuZGIuc2VsZWN0KCkuZnJvbSh0aHJlYWRzKS5vcmRlckJ5KGFzYyh0aHJlYWRzLnNlcSkpO1xuICAgIC8vIExhemlseSByZXNvbHZlZCBsaWtlIHRoZSByZWZlcmVuY2U6IGFuIHVua25vd24gd29ya0l0ZW1JZCBvbmx5IHRocm93c1xuICAgIC8vIHdoZW4gYXQgbGVhc3Qgb25lIHRocmVhZCBpcyBleGFtaW5lZCAobXVzdEdldEl0ZW0gaW5zaWRlIHRoZSBmaWx0ZXIpLlxuICAgIGxldCByZXNvbHZlZFdvcmtJdGVtSWQ6IHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgICBpZiAoZmlsdGVyPy53b3JrSXRlbUlkICE9PSB1bmRlZmluZWQgJiYgcm93cy5sZW5ndGggPiAwKSB7XG4gICAgICByZXNvbHZlZFdvcmtJdGVtSWQgPSAoYXdhaXQgdGhpcy5tdXN0R2V0SXRlbShmaWx0ZXIud29ya0l0ZW1JZCkpLmlkO1xuICAgIH1cbiAgICBjb25zdCByZXN1bHQ6IFRocmVhZFtdID0gW107XG4gICAgZm9yIChjb25zdCByb3cgb2Ygcm93cykge1xuICAgICAgaWYgKGZpbHRlcj8uZmVhdHVyZUlkICE9PSB1bmRlZmluZWQgJiYgcm93LmZlYXR1cmVJZCAhPT0gZmlsdGVyLmZlYXR1cmVJZCkgY29udGludWU7XG4gICAgICBpZiAocmVzb2x2ZWRXb3JrSXRlbUlkICE9PSB1bmRlZmluZWQgJiYgcm93LndvcmtJdGVtSWQgIT09IHJlc29sdmVkV29ya0l0ZW1JZCkgY29udGludWU7XG4gICAgICBpZiAoXG4gICAgICAgIGZpbHRlcj8uYWN0b3JJZCAhPT0gdW5kZWZpbmVkICYmXG4gICAgICAgIHJvdy52aXNpYmlsaXR5ID09PSAncHJpdmF0ZScgJiZcbiAgICAgICAgIXRoaXMuaXNQYXJ0aWNpcGFudChyb3csIGZpbHRlci5hY3RvcklkKVxuICAgICAgKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgcmVzdWx0LnB1c2godGhpcy5wdWJsaWNUaHJlYWQocm93KSk7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICBhc3luYyBsaXN0TWVzc2FnZXMoaW5wdXQ6IHsgdGhyZWFkSWQ6IHN0cmluZzsgYWN0b3JJZDogc3RyaW5nOyBzaW5jZVNlcT86IG51bWJlciB9KTogUHJvbWlzZTxNZXNzYWdlW10+IHtcbiAgICBjb25zdCB0aHJlYWQgPSBhd2FpdCB0aGlzLm11c3RHZXRUaHJlYWQoaW5wdXQudGhyZWFkSWQpO1xuICAgIGlmICh0aHJlYWQudmlzaWJpbGl0eSA9PT0gJ3ByaXZhdGUnICYmICF0aGlzLmlzUGFydGljaXBhbnQodGhyZWFkLCBpbnB1dC5hY3RvcklkKSkge1xuICAgICAgdGhyb3cgbmV3IFBlcm1pc3Npb25EZW5pZWRFcnJvcigndGhyZWFkLnJlYWQnLCBpbnB1dC5hY3RvcklkKTtcbiAgICB9XG4gICAgY29uc3Qgcm93cyA9IGF3YWl0IHRoaXMuZGJcbiAgICAgIC5zZWxlY3QoKVxuICAgICAgLmZyb20obWVzc2FnZXMpXG4gICAgICAud2hlcmUoZXEobWVzc2FnZXMudGhyZWFkSWQsIHRocmVhZC5pZCkpXG4gICAgICAub3JkZXJCeShhc2MobWVzc2FnZXMuc2VxKSk7XG4gICAgcmV0dXJuIHJvd3NcbiAgICAgIC5maWx0ZXIoKG0pID0+IGlucHV0LnNpbmNlU2VxID09PSB1bmRlZmluZWQgfHwgbS5zZXEgPiBpbnB1dC5zaW5jZVNlcSlcbiAgICAgIC5tYXAoKG0pID0+IHRoaXMucHVibGljTWVzc2FnZShtKSk7XG4gIH1cblxuICBhc3luYyBsaXN0TWVudGlvbnMobWVzc2FnZUlkOiBzdHJpbmcpOiBQcm9taXNlPE1lbnRpb25bXT4ge1xuICAgIGNvbnN0IHJvd3MgPSBhd2FpdCB0aGlzLmRiXG4gICAgICAuc2VsZWN0KClcbiAgICAgIC5mcm9tKG1lbnRpb25zKVxuICAgICAgLndoZXJlKGVxKG1lbnRpb25zLm1lc3NhZ2VJZCwgbWVzc2FnZUlkKSlcbiAgICAgIC5vcmRlckJ5KGFzYyhtZW50aW9ucy5zZXEpKTtcbiAgICByZXR1cm4gcm93cy5tYXAoKHJvdykgPT4gKHtcbiAgICAgIG1lc3NhZ2VJZDogcm93Lm1lc3NhZ2VJZCxcbiAgICAgIG1lbnRpb25lZEFjdG9ySWQ6IHJvdy5tZW50aW9uZWRBY3RvcklkLFxuICAgICAgcmVzb2x1dGlvbjogcm93LnJlc29sdXRpb24gYXMgTWVudGlvblJlc29sdXRpb24sXG4gICAgfSkpO1xuICB9XG5cbiAgYXN5bmMgbGlzdE5vdGlmaWNhdGlvbnMoaW5wdXQ6IHsgYWN0b3JJZDogc3RyaW5nOyB1bnJlYWRPbmx5PzogYm9vbGVhbiB9KTogUHJvbWlzZTxOb3RpZmljYXRpb25bXT4ge1xuICAgIGNvbnN0IHJvd3MgPSBhd2FpdCB0aGlzLmRiXG4gICAgICAuc2VsZWN0KClcbiAgICAgIC5mcm9tKG5vdGlmaWNhdGlvbnMpXG4gICAgICAud2hlcmUoZXEobm90aWZpY2F0aW9ucy5hY3RvcklkLCBpbnB1dC5hY3RvcklkKSlcbiAgICAgIC5vcmRlckJ5KGFzYyhub3RpZmljYXRpb25zLnNlcSkpO1xuICAgIHJldHVybiByb3dzXG4gICAgICAuZmlsdGVyKChuKSA9PiBpbnB1dC51bnJlYWRPbmx5ICE9PSB0cnVlIHx8ICFuLnJlYWQpXG4gICAgICAubWFwKChuKSA9PiAoeyBpZDogbi5pZCwgYWN0b3JJZDogbi5hY3RvcklkLCBzb3VyY2U6IG4uc291cmNlIGFzIE5vdGlmaWNhdGlvblsnc291cmNlJ10sIHJlZklkOiBuLnJlZklkLCByZWFkOiBuLnJlYWQgfSkpO1xuICB9XG5cbiAgYXN5bmMgbWFya05vdGlmaWNhdGlvblJlYWQoaW5wdXQ6IHsgbm90aWZpY2F0aW9uSWQ6IHN0cmluZzsgYWN0b3JJZDogc3RyaW5nIH0pOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCByb3dzID0gYXdhaXQgdGhpcy5kYlxuICAgICAgLnNlbGVjdCgpXG4gICAgICAuZnJvbShub3RpZmljYXRpb25zKVxuICAgICAgLndoZXJlKGVxKG5vdGlmaWNhdGlvbnMuaWQsIGlucHV0Lm5vdGlmaWNhdGlvbklkKSlcbiAgICAgIC5saW1pdCgxKTtcbiAgICBjb25zdCBub3RpZmljYXRpb24gPSByb3dzWzBdO1xuICAgIGlmICghbm90aWZpY2F0aW9uKSB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcihgdW5rbm93biBub3RpZmljYXRpb246ICR7aW5wdXQubm90aWZpY2F0aW9uSWR9YCk7XG4gICAgaWYgKG5vdGlmaWNhdGlvbi5hY3RvcklkICE9PSBpbnB1dC5hY3RvcklkKSB7XG4gICAgICB0aHJvdyBuZXcgUGVybWlzc2lvbkRlbmllZEVycm9yKCd0aHJlYWQucmVhZCcsIGlucHV0LmFjdG9ySWQpO1xuICAgIH1cbiAgICBhd2FpdCB0aGlzLmRiLnVwZGF0ZShub3RpZmljYXRpb25zKS5zZXQoeyByZWFkOiB0cnVlIH0pLndoZXJlKGVxKG5vdGlmaWNhdGlvbnMuaWQsIG5vdGlmaWNhdGlvbi5pZCkpO1xuICB9XG5cbiAgYXN5bmMgbGlzdEFnZW50Sm9icyhmaWx0ZXI/OiB7IGFnZW50QWN0b3JJZD86IHN0cmluZzsgc3RhdHVzPzogQWdlbnRKb2JbJ3N0YXR1cyddIH0pOiBQcm9taXNlPEFnZW50Sm9iW10+IHtcbiAgICBjb25zdCByb3dzID0gYXdhaXQgdGhpcy5kYi5zZWxlY3QoKS5mcm9tKGFnZW50Sm9icykub3JkZXJCeShhc2MoYWdlbnRKb2JzLnNlcSkpO1xuICAgIHJldHVybiByb3dzXG4gICAgICAuZmlsdGVyKFxuICAgICAgICAoaikgPT5cbiAgICAgICAgICAoZmlsdGVyPy5hZ2VudEFjdG9ySWQgPT09IHVuZGVmaW5lZCB8fCBqLmFnZW50QWN0b3JJZCA9PT0gZmlsdGVyLmFnZW50QWN0b3JJZCkgJiZcbiAgICAgICAgICAoZmlsdGVyPy5zdGF0dXMgPT09IHVuZGVmaW5lZCB8fCBqLnN0YXR1cyA9PT0gZmlsdGVyLnN0YXR1cyksXG4gICAgICApXG4gICAgICAubWFwKChqKSA9PiB0aGlzLnB1YmxpY0pvYihqKSk7XG4gIH1cblxuICBhc3luYyBjb21wbGV0ZUFnZW50Sm9iKGlucHV0OiB7XG4gICAgam9iSWQ6IHN0cmluZztcbiAgICBhY3RvcklkOiBzdHJpbmc7XG4gICAgc3RhdHVzOiAnZG9uZScgfCAnYmxvY2tlZCc7XG4gICAgbm90ZT86IHN0cmluZztcbiAgfSk6IFByb21pc2U8QWdlbnRKb2I+IHtcbiAgICBjb25zdCByb3dzID0gYXdhaXQgdGhpcy5kYi5zZWxlY3QoKS5mcm9tKGFnZW50Sm9icykud2hlcmUoZXEoYWdlbnRKb2JzLmlkLCBpbnB1dC5qb2JJZCkpLmxpbWl0KDEpO1xuICAgIGNvbnN0IGpvYiA9IHJvd3NbMF07XG4gICAgaWYgKCFqb2IpIHRocm93IG5ldyBHdWFyZEZhaWxlZEVycm9yKGB1bmtub3duIGFnZW50IGpvYjogJHtpbnB1dC5qb2JJZH1gKTtcbiAgICBpZiAoam9iLmFnZW50QWN0b3JJZCAhPT0gaW5wdXQuYWN0b3JJZCkge1xuICAgICAgdGhyb3cgbmV3IFBlcm1pc3Npb25EZW5pZWRFcnJvcignYWdlbnRfam9iLmNvbXBsZXRlJywgaW5wdXQuYWN0b3JJZCk7XG4gICAgfVxuICAgIGlmIChqb2Iuc3RhdHVzICE9PSAncXVldWVkJykgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoYGFnZW50IGpvYiAke2pvYi5pZH0gaXMgYWxyZWFkeSAke2pvYi5zdGF0dXN9YCk7XG4gICAgY29uc3Qgbm90ZSA9IGlucHV0Lm5vdGUgPz8gbnVsbDtcbiAgICByZXR1cm4gdGhpcy5kYi50cmFuc2FjdGlvbihhc3luYyAodHgpID0+IHtcbiAgICAgIGF3YWl0IHR4LnVwZGF0ZShhZ2VudEpvYnMpLnNldCh7IHN0YXR1czogaW5wdXQuc3RhdHVzLCBub3RlIH0pLndoZXJlKGVxKGFnZW50Sm9icy5pZCwgam9iLmlkKSk7XG4gICAgICBhd2FpdCB0aGlzLmFwcGVuZFR4KHR4LCAnYWdlbnRfam9iJywgam9iLmlkLCAnYWdlbnRfam9iLmNvbXBsZXRlZCcsIGlucHV0LmFjdG9ySWQsIHtcbiAgICAgICAgc3RhdHVzOiBpbnB1dC5zdGF0dXMsXG4gICAgICAgIG5vdGUsXG4gICAgICB9KTtcbiAgICAgIC8vIG5vdGlmeSB0aGUgbWVudGlvbmVyIFx1MjAxNCB0aGUgcmV2ZXJzZSBkaXJlY3Rpb24gaXMgYSBtZXNzYWdlICsgbm90aWZpY2F0aW9uLCBub3RoaW5nIG1vcmUgKFx1MDBBNzUuNClcbiAgICAgIGNvbnN0IHRyaWdnZXIgPSAoXG4gICAgICAgIGF3YWl0IHR4XG4gICAgICAgICAgLnNlbGVjdCh7IGF1dGhvcklkOiBtZXNzYWdlcy5hdXRob3JJZCB9KVxuICAgICAgICAgIC5mcm9tKG1lc3NhZ2VzKVxuICAgICAgICAgIC53aGVyZShlcShtZXNzYWdlcy5pZCwgam9iLm1lc3NhZ2VJZCkpXG4gICAgICAgICAgLmxpbWl0KDEpXG4gICAgICApWzBdO1xuICAgICAgaWYgKHRyaWdnZXIpIGF3YWl0IHRoaXMucHVzaE5vdGlmaWNhdGlvblR4KHR4LCB0cmlnZ2VyLmF1dGhvcklkLCAnam9iX2NvbXBsZXRlZCcsIGpvYi5pZCk7XG4gICAgICByZXR1cm4gdGhpcy5wdWJsaWNKb2IoeyAuLi5qb2IsIHN0YXR1czogaW5wdXQuc3RhdHVzLCBub3RlIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgLy8gLS0gYWdlbnQgbWVtb3J5IChQaGFzZSA1LCByb2FkbWFwIFx1MDBBNzYpIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICBhc3luYyBhcHBlbmRBZ2VudE1lbW9yeShpbnB1dDoge1xuICAgIGFjdG9ySWQ6IHN0cmluZztcbiAgICBraW5kOiBNZW1vcnlLaW5kO1xuICAgIGNvbnRlbnQ6IHN0cmluZztcbiAgICBzb3VyY2VUaHJlYWRJZD86IHN0cmluZztcbiAgfSk6IFByb21pc2U8QWdlbnRNZW1vcnk+IHtcbiAgICBjb25zdCBhY3RvciA9IGF3YWl0IHRoaXMuZ2V0QWN0b3JSb3coaW5wdXQuYWN0b3JJZCk7XG4gICAgaWYgKCFhY3RvcikgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoYHVua25vd24gYWN0b3I6ICR7aW5wdXQuYWN0b3JJZH1gKTtcbiAgICBpZiAoYWN0b3IudHlwZSAhPT0gJ2FnZW50Jykge1xuICAgICAgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoJ21lbW9yeSBiZWxvbmdzIHRvIGFnZW50IGFjdG9ycyAocm9hZG1hcCBcdTAwQTc2KScpO1xuICAgIH1cbiAgICBsZXQgc291cmNlVGhyZWFkSWQ6IHN0cmluZyB8IG51bGwgPSBudWxsO1xuICAgIGxldCBzb3VyY2VWaXNpYmlsaXR5OiBBZ2VudE1lbW9yeVsnc291cmNlVmlzaWJpbGl0eSddID0gbnVsbDtcbiAgICBpZiAoaW5wdXQuc291cmNlVGhyZWFkSWQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgY29uc3QgdGhyZWFkID0gYXdhaXQgdGhpcy5tdXN0R2V0VGhyZWFkKGlucHV0LnNvdXJjZVRocmVhZElkKTtcbiAgICAgIC8vIExlYXJuaW5nIGZyb20gYSBwcml2YXRlIGNvbnRleHQgcmVxdWlyZXMgaGF2aW5nIGJlZW4gaW4gaXQuXG4gICAgICBpZiAodGhyZWFkLnZpc2liaWxpdHkgPT09ICdwcml2YXRlJyAmJiAhdGhpcy5pc1BhcnRpY2lwYW50KHRocmVhZCwgaW5wdXQuYWN0b3JJZCkpIHtcbiAgICAgICAgdGhyb3cgbmV3IFBlcm1pc3Npb25EZW5pZWRFcnJvcigndGhyZWFkLnJlYWQnLCBpbnB1dC5hY3RvcklkKTtcbiAgICAgIH1cbiAgICAgIHNvdXJjZVRocmVhZElkID0gdGhyZWFkLmlkO1xuICAgICAgc291cmNlVmlzaWJpbGl0eSA9IHRocmVhZC52aXNpYmlsaXR5IGFzIEFnZW50TWVtb3J5Wydzb3VyY2VWaXNpYmlsaXR5J107XG4gICAgfVxuICAgIGNvbnN0IGlkID0gdGhpcy5uZXh0SWQoJ21lbScpO1xuICAgIHJldHVybiB0aGlzLmRiLnRyYW5zYWN0aW9uKGFzeW5jICh0eCkgPT4ge1xuICAgICAgLy8gUGVyLWFnZW50IHNlcSBjb21wdXRlZCBJTiB0aGUgdHJhbnNhY3Rpb247IFVOSVFVRShhZ2VudF9hY3Rvcl9pZCwgc2VxKVxuICAgICAgLy8gbWFrZXMgYSBjb25jdXJyZW50IGR1cGxpY2F0ZSBsb3NlIGJ5IGNvbnN0cmFpbnQuXG4gICAgICBjb25zdCBbcm93XSA9IGF3YWl0IHR4XG4gICAgICAgIC5zZWxlY3QoeyBtYXhTZXE6IHNxbDxudW1iZXI+YGNvYWxlc2NlKG1heCgke2FnZW50TWVtb3JpZXMuc2VxfSksIDApYCB9KVxuICAgICAgICAuZnJvbShhZ2VudE1lbW9yaWVzKVxuICAgICAgICAud2hlcmUoZXEoYWdlbnRNZW1vcmllcy5hZ2VudEFjdG9ySWQsIGlucHV0LmFjdG9ySWQpKTtcbiAgICAgIGNvbnN0IHNlcSA9IE51bWJlcihyb3c/Lm1heFNlcSA/PyAwKSArIDE7XG4gICAgICBhd2FpdCB0eC5pbnNlcnQoYWdlbnRNZW1vcmllcykudmFsdWVzKHtcbiAgICAgICAgaWQsXG4gICAgICAgIGFnZW50QWN0b3JJZDogaW5wdXQuYWN0b3JJZCxcbiAgICAgICAga2luZDogaW5wdXQua2luZCxcbiAgICAgICAgY29udGVudDogaW5wdXQuY29udGVudCxcbiAgICAgICAgc291cmNlVGhyZWFkSWQsXG4gICAgICAgIHNvdXJjZVZpc2liaWxpdHksXG4gICAgICAgIHNlcSxcbiAgICAgIH0pO1xuICAgICAgLy8gQ29udGVudCBORVZFUiBlbnRlcnMgdGhlIHNoYXJlZCBldmVudCBsb2cgXHUyMDE0IHByaXZhdGUgbGVhcm5pbmcgbXVzdCBub3RcbiAgICAgIC8vIGxlYWsgaW50byB0aGUgYXVkaXQgc3RyZWFtIChyb2FkbWFwIFx1MDBBNzYgcGluKS5cbiAgICAgIGF3YWl0IHRoaXMuYXBwZW5kVHgodHgsICdhY3RvcicsIGlucHV0LmFjdG9ySWQsICdtZW1vcnkuYXBwZW5kZWQnLCBpbnB1dC5hY3RvcklkLCB7XG4gICAgICAgIG1lbW9yeUlkOiBpZCxcbiAgICAgICAga2luZDogaW5wdXQua2luZCxcbiAgICAgICAgc291cmNlVGhyZWFkSWQsXG4gICAgICB9KTtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGlkLFxuICAgICAgICBhZ2VudEFjdG9ySWQ6IGlucHV0LmFjdG9ySWQsXG4gICAgICAgIGtpbmQ6IGlucHV0LmtpbmQsXG4gICAgICAgIGNvbnRlbnQ6IGlucHV0LmNvbnRlbnQsXG4gICAgICAgIHNvdXJjZVRocmVhZElkLFxuICAgICAgICBzb3VyY2VWaXNpYmlsaXR5LFxuICAgICAgICBzZXEsXG4gICAgICB9O1xuICAgIH0pO1xuICB9XG5cbiAgYXN5bmMgc2VhcmNoQWdlbnRNZW1vcnkoaW5wdXQ6IHtcbiAgICBhY3RvcklkOiBzdHJpbmc7XG4gICAgY29udGV4dFRocmVhZElkPzogc3RyaW5nO1xuICAgIGtpbmQ/OiBNZW1vcnlLaW5kO1xuICAgIHF1ZXJ5Pzogc3RyaW5nO1xuICB9KTogUHJvbWlzZTxBZ2VudE1lbW9yeVtdPiB7XG4gICAgLy8gT3duZXItc2NvcGVkIGJ5IGNvbnN0cnVjdGlvbjogdGhlcmUgaXMgbm8gY3Jvc3MtYWN0b3IgcGFyYW1ldGVyLlxuICAgIGNvbnN0IHJvd3MgPSBhd2FpdCB0aGlzLmRiXG4gICAgICAuc2VsZWN0KClcbiAgICAgIC5mcm9tKGFnZW50TWVtb3JpZXMpXG4gICAgICAud2hlcmUoZXEoYWdlbnRNZW1vcmllcy5hZ2VudEFjdG9ySWQsIGlucHV0LmFjdG9ySWQpKVxuICAgICAgLm9yZGVyQnkoYXNjKGFnZW50TWVtb3JpZXMuc2VxKSk7XG4gICAgcmV0dXJuIHJvd3NcbiAgICAgIC5maWx0ZXIoKG0pID0+IHtcbiAgICAgICAgaWYgKGlucHV0LmtpbmQgIT09IHVuZGVmaW5lZCAmJiBtLmtpbmQgIT09IGlucHV0LmtpbmQpIHJldHVybiBmYWxzZTtcbiAgICAgICAgaWYgKGlucHV0LnF1ZXJ5ICE9PSB1bmRlZmluZWQgJiYgIW0uY29udGVudC50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKGlucHV0LnF1ZXJ5LnRvTG93ZXJDYXNlKCkpKSByZXR1cm4gZmFsc2U7XG4gICAgICAgIC8vIFx1MDBBNzY6IG5vdGhpbmcgbGVhcm5lZCBpbiBhIHByaXZhdGUgdGhyZWFkIHN1cmZhY2VzIG91dHNpZGUgaXRzXG4gICAgICAgIC8vIHNvdXJjZSB0aHJlYWQuXG4gICAgICAgIGlmIChtLnNvdXJjZVZpc2liaWxpdHkgPT09ICdwcml2YXRlJyAmJiBtLnNvdXJjZVRocmVhZElkICE9PSBpbnB1dC5jb250ZXh0VGhyZWFkSWQpIHJldHVybiBmYWxzZTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9KVxuICAgICAgLm1hcCgobSkgPT4gdGhpcy5wdWJsaWNNZW1vcnkobSkpO1xuICB9XG5cbiAgcHJpdmF0ZSBwdWJsaWNNZW1vcnkocm93OiBBZ2VudE1lbW9yeVJvdyk6IEFnZW50TWVtb3J5IHtcbiAgICByZXR1cm4ge1xuICAgICAgaWQ6IHJvdy5pZCxcbiAgICAgIGFnZW50QWN0b3JJZDogcm93LmFnZW50QWN0b3JJZCxcbiAgICAgIGtpbmQ6IHJvdy5raW5kIGFzIE1lbW9yeUtpbmQsXG4gICAgICBjb250ZW50OiByb3cuY29udGVudCxcbiAgICAgIHNvdXJjZVRocmVhZElkOiByb3cuc291cmNlVGhyZWFkSWQsXG4gICAgICBzb3VyY2VWaXNpYmlsaXR5OiByb3cuc291cmNlVmlzaWJpbGl0eSBhcyBBZ2VudE1lbW9yeVsnc291cmNlVmlzaWJpbGl0eSddLFxuICAgICAgc2VxOiByb3cuc2VxLFxuICAgIH07XG4gIH1cblxuICAvKiogUmFpbHMgXHUyMTkyIGNoYXQgbmFycmF0aW9uIChcdTAwQTc1LjIpOiBzdGF0ZSBjaGFuZ2VzIG5hcnJhdGUgaW50byBib3VuZCB0YXNrIHRocmVhZHMuICovXG4gIHByaXZhdGUgYXN5bmMgbmFycmF0ZVdvcmtJdGVtVHgodHg6IFR4LCB3b3JrSXRlbUlkOiBzdHJpbmcsIGJvZHk6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IGJvdW5kID0gYXdhaXQgdHhcbiAgICAgIC5zZWxlY3QoKVxuICAgICAgLmZyb20odGhyZWFkcylcbiAgICAgIC53aGVyZShlcSh0aHJlYWRzLndvcmtJdGVtSWQsIHdvcmtJdGVtSWQpKVxuICAgICAgLm9yZGVyQnkoYXNjKHRocmVhZHMuc2VxKSk7XG4gICAgZm9yIChjb25zdCB0aHJlYWQgb2YgYm91bmQpIHtcbiAgICAgIGF3YWl0IHRoaXMuYXBwZW5kTWVzc2FnZVR4KHR4LCB0aHJlYWQsIHRoaXMuc3lzdGVtQWN0b3JJZCwgJ3N5c3RlbScsIGJvZHksIG51bGwpO1xuICAgIH1cbiAgfVxuXG4gIC8vIC0tIGRpc3BhdGNoIChyb2FkbWFwIFx1MDBBNzIuMykgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICBhc3luYyBnZXRUYXNrQ29udGV4dChpbnB1dDogeyB3b3JrSXRlbUlkOiBzdHJpbmcgfSk6IFByb21pc2U8eyB3b3JrSXRlbTogV29ya0l0ZW07IGVudHJ5U3RhdGU6IFdvcmtJdGVtU3RhdGUgfT4ge1xuICAgIGNvbnN0IGl0ZW0gPSBhd2FpdCB0aGlzLm11c3RHZXRJdGVtKGlucHV0LndvcmtJdGVtSWQpO1xuICAgIGlmIChpdGVtLnN0YXRlID09PSAnZG9uZScpIHtcbiAgICAgIHRocm93IG5ldyBHdWFyZEZhaWxlZEVycm9yKCdkb25lIGl0ZW1zIGFyZSBuZXZlciByZS1kaXNwYXRjaGVkOyBmb2xsb3ctdXAgcmV2aWV3IGlzIGEgbmV3IHdvcmsgaXRlbScpO1xuICAgIH1cbiAgICBjb25zdCBmZWF0dXJlID0gYXdhaXQgdGhpcy5nZXRGZWF0dXJlUm93KGl0ZW0uZmVhdHVyZUlkKTtcbiAgICBpZiAoZmVhdHVyZT8uZGlzcGF0Y2hIb2xkKSB7XG4gICAgICB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcignZmVhdHVyZSBpcyB1bmRlciBhIGRvbmVfY2hlY2twb2ludCBkaXNwYXRjaCBob2xkJyk7XG4gICAgfVxuICAgIHJldHVybiB7IHdvcmtJdGVtOiB0aGlzLnB1YmxpY0l0ZW0oaXRlbSksIGVudHJ5U3RhdGU6IGl0ZW0uc3RhdGUgYXMgV29ya0l0ZW1TdGF0ZSB9O1xuICB9XG5cbiAgYXN5bmMgcmVsZWFzZURpc3BhdGNoSG9sZChpbnB1dDogeyBmZWF0dXJlSWQ6IHN0cmluZzsgYWN0b3JJZDogc3RyaW5nIH0pOiBQcm9taXNlPEZlYXR1cmU+IHtcbiAgICBhd2FpdCB0aGlzLnJlcXVpcmVQZXJtaXNzaW9uKGlucHV0LmFjdG9ySWQsICdkaXNwYXRjaC5yZWxlYXNlX2hvbGQnKTtcbiAgICBjb25zdCBmZWF0dXJlID0gYXdhaXQgdGhpcy5nZXRGZWF0dXJlUm93KGlucHV0LmZlYXR1cmVJZCk7XG4gICAgaWYgKCFmZWF0dXJlKSB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcihgdW5rbm93biBmZWF0dXJlOiAke2lucHV0LmZlYXR1cmVJZH1gKTtcbiAgICByZXR1cm4gdGhpcy5kYi50cmFuc2FjdGlvbihhc3luYyAodHgpID0+IHtcbiAgICAgIGF3YWl0IHR4LnVwZGF0ZShmZWF0dXJlcykuc2V0KHsgZGlzcGF0Y2hIb2xkOiBmYWxzZSB9KS53aGVyZShlcShmZWF0dXJlcy5pZCwgZmVhdHVyZS5pZCkpO1xuICAgICAgYXdhaXQgdGhpcy5hcHBlbmRUeCh0eCwgJ2ZlYXR1cmUnLCBmZWF0dXJlLmlkLCAnZmVhdHVyZS5kaXNwYXRjaF9ob2xkX3JlbGVhc2VkJywgaW5wdXQuYWN0b3JJZCwge30pO1xuICAgICAgcmV0dXJuIHRoaXMucHVibGljRmVhdHVyZSh7IC4uLmZlYXR1cmUsIGRpc3BhdGNoSG9sZDogZmFsc2UgfSk7XG4gICAgfSk7XG4gIH1cblxuICAvLyAtLSByZWNvbmNpbGlhdGlvbiAocm9hZG1hcCBcdTAwQTcxLjYsIEQ2OiBkZXRlY3Qtb25seSwgbmV2ZXIgbXV0YXRlcykgLS0tLS0tLS0tLS0tXG5cbiAgYXN5bmMgcmVjb25jaWxlKGlucHV0OiB7XG4gICAgZmlsZXM6IEFycmF5PHsgd29ya0l0ZW1JZDogc3RyaW5nOyBmcm9udG1hdHRlclN0YXR1czogc3RyaW5nIH0+O1xuICB9KTogUHJvbWlzZTxEaXZlcmdlbmNlUmVwb3J0W10+IHtcbiAgICBjb25zdCByZXBvcnRzOiBEaXZlcmdlbmNlUmVwb3J0W10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IGZpbGUgb2YgaW5wdXQuZmlsZXMpIHtcbiAgICAgIGNvbnN0IGl0ZW0gPSBhd2FpdCB0aGlzLm11c3RHZXRJdGVtKGZpbGUud29ya0l0ZW1JZCk7XG4gICAgICAvLyBGaWxlcyB1bmRlciBhIGxpdmUgY2xhaW0gYXJlIGV4Y2x1ZGVkIFx1MjAxNCBwbGF5Ym9va3MgbGVnaXRpbWF0ZWx5IHdyaXRlXG4gICAgICAvLyBmcm9udG1hdHRlciBtaWQtcnVuIChcdTAwQTcxLjYpLlxuICAgICAgaWYgKChhd2FpdCB0aGlzLmxpdmVDbGFpbShpdGVtLmlkKSkgIT09IG51bGwpIGNvbnRpbnVlO1xuXG4gICAgICBjb25zdCByYXcgPSBmaWxlLmZyb250bWF0dGVyU3RhdHVzLnRyaW0oKTtcbiAgICAgIGNvbnN0IGRiU3RhdGUgPSBpdGVtLnN0YXRlIGFzIFdvcmtJdGVtU3RhdGU7XG4gICAgICBpZiAocmF3ID09PSAnYmxvY2tlZCcpIHtcbiAgICAgICAgLy8gRDg6IG92ZXJsYXkgaW4gdGhlIERCIGFuZCBgc3RhdHVzOiBibG9ja2VkYCBpbiB0aGUgZmlsZSBhcmUgdGhlXG4gICAgICAgIC8vIHNhbWUgdHJ1dGguIEJsb2NrZWQtaW4tZmlsZSB3aXRoIE5PIG92ZXJsYXkgaXMgcmVhbCBkcmlmdC5cbiAgICAgICAgaWYgKGl0ZW0uYmxvY2tlZFJlYXNvbiAhPT0gbnVsbCkgY29udGludWU7XG4gICAgICAgIHJlcG9ydHMucHVzaCh7IHdvcmtJdGVtSWQ6IGl0ZW0uaWQsIGZpbGVTdGF0ZTogcmF3LCBkYlN0YXRlLCBraW5kOiAnY29uZmxpY3QnIH0pO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgY29uc3Qgbm9ybWFsaXplZCA9IExFR0FDWV9TVEFUVVNbcmF3XTtcbiAgICAgIGlmIChub3JtYWxpemVkID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmVwb3J0cy5wdXNoKHsgd29ya0l0ZW1JZDogaXRlbS5pZCwgZmlsZVN0YXRlOiByYXcsIGRiU3RhdGUsIGtpbmQ6ICdjb25mbGljdCcgfSk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgaWYgKG5vcm1hbGl6ZWQgPT09IGRiU3RhdGUpIGNvbnRpbnVlO1xuICAgICAgcmVwb3J0cy5wdXNoKHtcbiAgICAgICAgd29ya0l0ZW1JZDogaXRlbS5pZCxcbiAgICAgICAgZmlsZVN0YXRlOiByYXcsXG4gICAgICAgIGRiU3RhdGUsXG4gICAgICAgIGtpbmQ6IFJBTktbbm9ybWFsaXplZF0gPiBSQU5LW2RiU3RhdGVdID8gJ2ZpbGVfYWhlYWQnIDogJ2RiX2FoZWFkJyxcbiAgICAgIH0pO1xuICAgIH1cbiAgICByZXR1cm4gcmVwb3J0cztcbiAgfVxuXG4gIC8vIC0tIHF1ZXJpZXMgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgYXN5bmMgZ2V0V29ya0l0ZW0oaWQ6IHN0cmluZyk6IFByb21pc2U8V29ya0l0ZW0+IHtcbiAgICByZXR1cm4gdGhpcy5wdWJsaWNJdGVtKGF3YWl0IHRoaXMubXVzdEdldEl0ZW0oaWQpKTtcbiAgfVxuXG4gIGFzeW5jIGdldEZlYXR1cmUoaWQ6IHN0cmluZyk6IFByb21pc2U8RmVhdHVyZT4ge1xuICAgIGNvbnN0IGZlYXR1cmUgPSBhd2FpdCB0aGlzLmdldEZlYXR1cmVSb3coaWQpO1xuICAgIGlmICghZmVhdHVyZSkgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoYHVua25vd24gZmVhdHVyZTogJHtpZH1gKTtcbiAgICByZXR1cm4gdGhpcy5wdWJsaWNGZWF0dXJlKGZlYXR1cmUpO1xuICB9XG5cbiAgYXN5bmMgbGlzdFdvcmtJdGVtcyhmaWx0ZXI/OiB7XG4gICAgc3RhdGU/OiBXb3JrSXRlbVN0YXRlO1xuICAgIGZlYXR1cmVJZD86IHN0cmluZztcbiAgICBjbGFpbWFibGU/OiBib29sZWFuO1xuICB9KTogUHJvbWlzZTxXb3JrSXRlbVtdPiB7XG4gICAgY29uc3Qgcm93cyA9IGF3YWl0IHRoaXMuZGIuc2VsZWN0KCkuZnJvbSh3b3JrSXRlbXMpLm9yZGVyQnkoYXNjKHdvcmtJdGVtcy5zZXEpKTtcbiAgICBjb25zdCByZXN1bHQ6IFdvcmtJdGVtW10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IHJvdyBvZiByb3dzKSB7XG4gICAgICBpZiAoZmlsdGVyPy5zdGF0ZSAhPT0gdW5kZWZpbmVkICYmIHJvdy5zdGF0ZSAhPT0gZmlsdGVyLnN0YXRlKSBjb250aW51ZTtcbiAgICAgIGlmIChmaWx0ZXI/LmZlYXR1cmVJZCAhPT0gdW5kZWZpbmVkICYmIHJvdy5mZWF0dXJlSWQgIT09IGZpbHRlci5mZWF0dXJlSWQpIGNvbnRpbnVlO1xuICAgICAgaWYgKGZpbHRlcj8uY2xhaW1hYmxlID09PSB0cnVlICYmIChhd2FpdCB0aGlzLmxpdmVDbGFpbShyb3cuaWQpKSAhPT0gbnVsbCkgY29udGludWU7XG4gICAgICByZXN1bHQucHVzaCh0aGlzLnB1YmxpY0l0ZW0ocm93KSk7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICBhc3luYyBnZXRDbGFpbXMod29ya0l0ZW1JZDogc3RyaW5nKTogUHJvbWlzZTxDbGFpbVtdPiB7XG4gICAgY29uc3QgaXRlbSA9IGF3YWl0IHRoaXMubXVzdEdldEl0ZW0od29ya0l0ZW1JZCk7XG4gICAgY29uc3Qgcm93cyA9IGF3YWl0IHRoaXMuZGJcbiAgICAgIC5zZWxlY3QoKVxuICAgICAgLmZyb20oY2xhaW1zKVxuICAgICAgLndoZXJlKGVxKGNsYWltcy53b3JrSXRlbUlkLCBpdGVtLmlkKSlcbiAgICAgIC5vcmRlckJ5KGFzYyhjbGFpbXMuc2VxKSk7XG4gICAgcmV0dXJuIHJvd3MubWFwKChyb3cpID0+IHRoaXMucHVibGljQ2xhaW0ocm93KSk7XG4gIH1cblxuICBhc3luYyBldmVudHMoc3RyZWFtSWQ/OiBzdHJpbmcpOiBQcm9taXNlPFNwaW5lRXZlbnRbXT4ge1xuICAgIGNvbnN0IHJvd3MgPVxuICAgICAgc3RyZWFtSWQgPT09IHVuZGVmaW5lZFxuICAgICAgICA/IGF3YWl0IHRoaXMuZGIuc2VsZWN0KCkuZnJvbShldmVudHMpLm9yZGVyQnkoYXNjKGV2ZW50cy5nbG9iYWxTZXEpKVxuICAgICAgICA6IGF3YWl0IHRoaXMuZGIuc2VsZWN0KCkuZnJvbShldmVudHMpLndoZXJlKGVxKGV2ZW50cy5zdHJlYW1JZCwgc3RyZWFtSWQpKS5vcmRlckJ5KGFzYyhldmVudHMuZ2xvYmFsU2VxKSk7XG4gICAgcmV0dXJuIHJvd3MubWFwKChyb3cpID0+IHRoaXMuZXZlbnRGcm9tUm93KHJvdykpO1xuICB9XG59XG4iLCAiLyoqXG4gKiBTeW5jaHJvbm91cyBmYWNhZGUgb3ZlciB0aGUgYXN5bmMgUGdFbmdpbmUgcnVubmluZyBpbiBhIHN5bmNraXQgd29ya2VyLlxuICogSW1wbGVtZW50cyB0aGUgZXhhY3QgQG9haHMvY29yZSBTcGluZUVuZ2luZSBpbnRlcmZhY2UsIHNvIHRoZSBjb25mb3JtYW5jZVxuICogc3VpdGUgZHJpdmVzIFBvc3RncmVzIHRocm91Z2ggdGhlIHNhbWUgY2FsbHMgaXQgZHJpdmVzIHRoZSBtZW1vcnkgZW5naW5lLlxuICovXG5pbXBvcnQgeyBjcmVhdGVSZXF1aXJlIH0gZnJvbSAnbm9kZTptb2R1bGUnO1xuaW1wb3J0IHsgZGlybmFtZSwgam9pbiB9IGZyb20gJ25vZGU6cGF0aCc7XG5pbXBvcnQgeyBmaWxlVVJMVG9QYXRoIH0gZnJvbSAnbm9kZTp1cmwnO1xuaW1wb3J0IHsgY3JlYXRlU3luY0ZuIH0gZnJvbSAnc3luY2tpdCc7XG5cbmltcG9ydCB7XG4gIENvbmZsaWN0RXJyb3IsXG4gIEd1YXJkRmFpbGVkRXJyb3IsXG4gIEludmFsaWRUcmFuc2l0aW9uRXJyb3IsXG4gIFBlcm1pc3Npb25EZW5pZWRFcnJvcixcbiAgU3Rvcmllc1ZhbGlkYXRpb25FcnJvcixcbiAgdHlwZSBTcGluZUVuZ2luZSxcbn0gZnJvbSAnQG9haHMvY29yZSc7XG5cbmNvbnN0IGhlcmUgPSBkaXJuYW1lKGZpbGVVUkxUb1BhdGgoaW1wb3J0Lm1ldGEudXJsKSk7XG5jb25zdCB3b3JrZXJQYXRoID0gam9pbihoZXJlLCAnLi4nLCAnZGlzdCcsICd3b3JrZXIubWpzJyk7XG5cbnR5cGUgV2lyZVJlc3VsdCA9XG4gIHwgeyBvazogdHJ1ZTsgdmFsdWU6IHVua25vd24gfVxuICB8IHsgb2s6IGZhbHNlOyBlcnJvcjogeyBuYW1lOiBzdHJpbmc7IG1lc3NhZ2U6IHN0cmluZyB9IH07XG5cbmNvbnN0IGNhbGxXb3JrZXIgPSBjcmVhdGVTeW5jRm4od29ya2VyUGF0aCkgYXMgKG9wOiB1bmtub3duKSA9PiBXaXJlUmVzdWx0O1xuXG5jb25zdCBFUlJPUl9DTEFTU0VTOiBSZWNvcmQ8c3RyaW5nLCBuZXcgKC4uLmFyZ3M6IG5ldmVyW10pID0+IEVycm9yPiA9IHtcbiAgQ29uZmxpY3RFcnJvcjogQ29uZmxpY3RFcnJvciBhcyBuZXZlcixcbiAgR3VhcmRGYWlsZWRFcnJvcjogR3VhcmRGYWlsZWRFcnJvciBhcyBuZXZlcixcbiAgSW52YWxpZFRyYW5zaXRpb25FcnJvcjogSW52YWxpZFRyYW5zaXRpb25FcnJvciBhcyBuZXZlcixcbiAgUGVybWlzc2lvbkRlbmllZEVycm9yOiBQZXJtaXNzaW9uRGVuaWVkRXJyb3IgYXMgbmV2ZXIsXG4gIFN0b3JpZXNWYWxpZGF0aW9uRXJyb3I6IFN0b3JpZXNWYWxpZGF0aW9uRXJyb3IgYXMgbmV2ZXIsXG59O1xuXG5mdW5jdGlvbiByZXRocm93KGVycm9yOiB7IG5hbWU6IHN0cmluZzsgbWVzc2FnZTogc3RyaW5nIH0pOiBuZXZlciB7XG4gIGNvbnN0IENscyA9IEVSUk9SX0NMQVNTRVNbZXJyb3IubmFtZV07XG4gIGlmIChDbHMpIHtcbiAgICAvLyBSZWNvbnN0cnVjdCB3aXRoIHRoZSB3aXJlIG1lc3NhZ2U6IHRoZSBjb25mb3JtYW5jZSBzdWl0ZSBtYXRjaGVzXG4gICAgLy8gY2xhc3Nlcywgbm90IGNvbnN0cnVjdG9yIGFyZ3VtZW50cy5cbiAgICBjb25zdCBpbnN0YW5jZSA9IE9iamVjdC5jcmVhdGUoQ2xzLnByb3RvdHlwZSkgYXMgRXJyb3I7XG4gICAgaW5zdGFuY2UubWVzc2FnZSA9IGVycm9yLm1lc3NhZ2U7XG4gICAgaW5zdGFuY2UubmFtZSA9IGVycm9yLm5hbWU7XG4gICAgdGhyb3cgaW5zdGFuY2U7XG4gIH1cbiAgdGhyb3cgbmV3IEVycm9yKGAke2Vycm9yLm5hbWV9OiAke2Vycm9yLm1lc3NhZ2V9YCk7XG59XG5cbmZ1bmN0aW9uIHVud3JhcChyZXN1bHQ6IFdpcmVSZXN1bHQpOiB1bmtub3duIHtcbiAgaWYgKHJlc3VsdC5vaykgcmV0dXJuIHJlc3VsdC52YWx1ZTtcbiAgcmV0aHJvdyhyZXN1bHQuZXJyb3IpO1xufVxuXG5jb25zdCBNRVRIT0RTOiBBcnJheTxrZXlvZiBTcGluZUVuZ2luZT4gPSBbXG4gICdjcmVhdGVBY3RvcicsXG4gICdsaXN0QWN0b3JzJyxcbiAgJ3Byb3Zpc2lvblBlcnNvbmFzJyxcbiAgJ2dyYW50JyxcbiAgJ3Jldm9rZScsXG4gICdjcmVhdGVGZWF0dXJlJyxcbiAgJ2NyZWF0ZVdvcmtJdGVtJyxcbiAgJ2ltcG9ydFN0b3JpZXMnLFxuICAnY2xhaW1UYXNrJyxcbiAgJ2hlYXJ0YmVhdCcsXG4gICdyZWxlYXNlQ2xhaW0nLFxuICAnYWR2YW5jZUNsb2NrJyxcbiAgJ2FkdmFuY2VTdGF0ZScsXG4gICdibG9ja1Rhc2snLFxuICAndW5ibG9ja1Rhc2snLFxuICAnc3VibWl0RXZpZGVuY2UnLFxuICAnYXBwcm92ZUdhdGUnLFxuICAncmVqZWN0R2F0ZScsXG4gICdnZXRUYXNrQ29udGV4dCcsXG4gICdyZWxlYXNlRGlzcGF0Y2hIb2xkJyxcbiAgJ3JlY29uY2lsZScsXG4gICdzZXRHb3Zlcm5hbmNlUm9sZScsXG4gICdnZXRHb3Zlcm5hbmNlUm9sZScsXG4gICdhc3NpZ25Sb2xlJyxcbiAgJ3Jldm9rZVJvbGUnLFxuICAnbGlzdFJvbGVBc3NpZ25tZW50cycsXG4gICdzZXRQbGFuJyxcbiAgJ2dldFBsYW4nLFxuICAnc2V0V29ya3NwYWNlUG9saWN5JyxcbiAgJ2dldFdvcmtzcGFjZVBvbGljeScsXG4gICdzZXRHYXRlUG9saWN5JyxcbiAgJ2dldEdhdGVQb2xpY3knLFxuICAnYXV0aHpFeHBsYWluJyxcbiAgJ2NyZWF0ZVRocmVhZCcsXG4gICdhZGRUaHJlYWRQYXJ0aWNpcGFudCcsXG4gICdwb3N0TWVzc2FnZScsXG4gICdsaXN0VGhyZWFkcycsXG4gICdsaXN0TWVzc2FnZXMnLFxuICAnbGlzdE1lbnRpb25zJyxcbiAgJ2xpc3ROb3RpZmljYXRpb25zJyxcbiAgJ21hcmtOb3RpZmljYXRpb25SZWFkJyxcbiAgJ2xpc3RBZ2VudEpvYnMnLFxuICAnY29tcGxldGVBZ2VudEpvYicsXG4gICdhcHBlbmRBZ2VudE1lbW9yeScsXG4gICdzZWFyY2hBZ2VudE1lbW9yeScsXG4gICdnZXRXb3JrSXRlbScsXG4gICdnZXRGZWF0dXJlJyxcbiAgJ2dldENsYWltcycsXG4gICdsaXN0V29ya0l0ZW1zJyxcbiAgJ2V2ZW50cycsXG5dO1xuXG5leHBvcnQgaW50ZXJmYWNlIFBnU3luY0VuZ2luZU9wdGlvbnMge1xuICAvKipcbiAgICogRGlyZWN0b3J5IGZvciBhIERVUkFCTEUgUEdsaXRlIGRhdGFiYXNlIChzdG9yeSAxMywgYG9haHMgc2VydmUgLS1kYXRhYCkuXG4gICAqIE9taXR0ZWQgXHUyMTkyIGluLW1lbW9yeSBkYXRhYmFzZSwgdHJ1bmNhdGVkIHBlciBlbmdpbmUgKGNvbmZvcm1hbmNlIG1vZGUpLlxuICAgKi9cbiAgZGF0YURpcj86IHN0cmluZztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVBnU3luY0VuZ2luZShvcHRpb25zPzogUGdTeW5jRW5naW5lT3B0aW9ucyk6IFNwaW5lRW5naW5lIHtcbiAgY29uc3QgY3JlYXRlZCA9IHVud3JhcChcbiAgICBjYWxsV29ya2VyKHtcbiAgICAgIG9wOiAnbmV3JyxcbiAgICAgIC4uLihvcHRpb25zPy5kYXRhRGlyICE9PSB1bmRlZmluZWQgPyB7IGRhdGFEaXI6IG9wdGlvbnMuZGF0YURpciB9IDoge30pLFxuICAgIH0pLFxuICApIGFzIHsgZW5naW5lSWQ6IG51bWJlciB9O1xuICBjb25zdCBlbmdpbmVJZCA9IGNyZWF0ZWQuZW5naW5lSWQ7XG4gIGNvbnN0IHByb3h5OiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiA9IHt9O1xuICBmb3IgKGNvbnN0IG1ldGhvZCBvZiBNRVRIT0RTKSB7XG4gICAgcHJveHlbbWV0aG9kXSA9ICguLi5hcmdzOiB1bmtub3duW10pID0+XG4gICAgICB1bndyYXAoY2FsbFdvcmtlcih7IG9wOiAnY2FsbCcsIGVuZ2luZUlkLCBtZXRob2QsIGFyZ3MgfSkpO1xuICB9XG4gIHJldHVybiBwcm94eSBhcyB1bmtub3duIGFzIFNwaW5lRW5naW5lO1xufVxuXG4vLyBjcmVhdGVSZXF1aXJlIGtlcHQgZm9yIGZ1dHVyZSBuYXRpdmUtcGcgcGF0aCByZXNvbHV0aW9uOyBoYXJtbGVzcyBpZiB1bnVzZWQuXG5leHBvcnQgY29uc3QgX3JlcXVpcmUgPSBjcmVhdGVSZXF1aXJlKGltcG9ydC5tZXRhLnVybCk7XG4iLCAiLyoqXG4gKiBIYW5kLW1haW50YWluZWQgRERMIG1hdGNoaW5nIHNjaGVtYS50cyAxLTEgKGRyaXp6bGUta2l0IG1pZ3JhdGlvbiBwaXBlbGluZVxuICogaXMgbGF0ZXIgZGVidCkuIFJ1bnMgb24gUEdsaXRlIGluIHRoZSBjb25mb3JtYW5jZSBoYXJuZXNzIHdvcmtlci5cbiAqL1xuZXhwb3J0IGNvbnN0IFNDSEVNQV9TUUwgPSBgXG5DUkVBVEUgVEFCTEUgSUYgTk9UIEVYSVNUUyBhY3RvcnMgKFxuICBpZCBURVhUIFBSSU1BUlkgS0VZLFxuICB0eXBlIFRFWFQgTk9UIE5VTEwsXG4gIGRpc3BsYXlfbmFtZSBURVhUIE5PVCBOVUxMLFxuICBnb3Zlcm5hbmNlX3JvbGUgVEVYVCBOT1QgTlVMTCBERUZBVUxUICdtZW1iZXInLFxuICBwZXJzb25hX2NvZGUgVEVYVFxuKTtcblxuLS0gUGhhc2UgMiB1cGdyYWRlIHBhdGggZm9yIGR1cmFibGUgZGF0YSBkaXJzIGNyZWF0ZWQgdW5kZXIgUGhhc2UgMSAoc3RvcnkgMTMpLlxuQUxURVIgVEFCTEUgYWN0b3JzIEFERCBDT0xVTU4gSUYgTk9UIEVYSVNUUyBnb3Zlcm5hbmNlX3JvbGUgVEVYVCBOT1QgTlVMTCBERUZBVUxUICdtZW1iZXInO1xuLS0gUGhhc2UgNCB1cGdyYWRlIHBhdGggKHJvYWRtYXAgXHUwMEE3Myk6IHBlcnNvbmEgYWN0b3JzIG9uIGR1cmFibGUgUGhhc2UgMS0zIGRpcnMuXG5BTFRFUiBUQUJMRSBhY3RvcnMgQUREIENPTFVNTiBJRiBOT1QgRVhJU1RTIHBlcnNvbmFfY29kZSBURVhUO1xuXG5DUkVBVEUgVEFCTEUgSUYgTk9UIEVYSVNUUyBncmFudHMgKFxuICBhY3Rvcl9pZCBURVhUIE5PVCBOVUxMLFxuICBwZXJtaXNzaW9uIFRFWFQgTk9UIE5VTEwsXG4gIHNjb3BlIFRFWFQsXG4gIFBSSU1BUlkgS0VZIChhY3Rvcl9pZCwgcGVybWlzc2lvbilcbik7XG5cbkNSRUFURSBUQUJMRSBJRiBOT1QgRVhJU1RTIHJvbGVfYXNzaWdubWVudHMgKFxuICBzZXEgU0VSSUFMIFBSSU1BUlkgS0VZLFxuICBhY3Rvcl9pZCBURVhUIE5PVCBOVUxMLFxuICByb2xlX2NvZGUgVEVYVCBOT1QgTlVMTCxcbiAgZ3JhbnRlZF9ieSBURVhUIE5PVCBOVUxMLFxuICByZXZva2VkIEJPT0xFQU4gTk9UIE5VTEwgREVGQVVMVCBGQUxTRVxuKTtcblxuQ1JFQVRFIFRBQkxFIElGIE5PVCBFWElTVFMgd29ya3NwYWNlX3N0YXRlIChcbiAgaWQgVEVYVCBQUklNQVJZIEtFWSxcbiAgcGxhbiBURVhUIE5PVCBOVUxMLFxuICBwbGFuX3ZlcnNpb24gSU5URUdFUiBOT1QgTlVMTCBERUZBVUxUIDEsXG4gIHBvbGljeSBKU09OQiBOT1QgTlVMTCBERUZBVUxUICd7fSc6Ompzb25iLFxuICBwb2xpY3lfdmVyc2lvbiBJTlRFR0VSIE5PVCBOVUxMIERFRkFVTFQgMVxuKTtcblxuQ1JFQVRFIFRBQkxFIElGIE5PVCBFWElTVFMgZ2F0ZV9wb2xpY2llcyAoXG4gIGdhdGUgVEVYVCBQUklNQVJZIEtFWSxcbiAgcG9saWN5IEpTT05CIE5PVCBOVUxMXG4pO1xuXG5DUkVBVEUgVEFCTEUgSUYgTk9UIEVYSVNUUyBmZWF0dXJlcyAoXG4gIGlkIFRFWFQgUFJJTUFSWSBLRVksXG4gIHNlcSBTRVJJQUwgTk9UIE5VTEwsXG4gIHN0YXRlIFRFWFQgTk9UIE5VTEwsXG4gIGRpc3BhdGNoX2hvbGQgQk9PTEVBTiBOT1QgTlVMTCBERUZBVUxUIEZBTFNFXG4pO1xuXG5DUkVBVEUgVEFCTEUgSUYgTk9UIEVYSVNUUyB3b3JrX2l0ZW1zIChcbiAgaWQgVEVYVCBQUklNQVJZIEtFWSxcbiAgc2VxIFNFUklBTCBOT1QgTlVMTCxcbiAgZmVhdHVyZV9pZCBURVhUIE5PVCBOVUxMLFxuICBleHRlcm5hbF9rZXkgVEVYVCBOT1QgTlVMTCxcbiAga2luZCBURVhUIE5PVCBOVUxMIERFRkFVTFQgJ2NvZGUnLFxuICB0aXRsZSBURVhUIE5PVCBOVUxMLFxuICBzdGF0ZSBURVhUIE5PVCBOVUxMLFxuICBibG9ja2VkX3JlYXNvbiBURVhULFxuICByZXZpZXdfbG9vcF9pdGVyYXRpb24gSU5URUdFUiBOT1QgTlVMTCBERUZBVUxUIDAsXG4gIGludGVudF9oYXNoIFRFWFQsXG4gIHBpbm5lZF92ZXJpZmljYXRpb24gSlNPTkIsXG4gIHNwZWNfY2hlY2twb2ludCBCT09MRUFOIE5PVCBOVUxMIERFRkFVTFQgRkFMU0UsXG4gIGRvbmVfY2hlY2twb2ludCBCT09MRUFOIE5PVCBOVUxMIERFRkFVTFQgRkFMU0UsXG4gIGludm9rZV9kZXZfd2l0aCBURVhUIE5PVCBOVUxMIERFRkFVTFQgJycsXG4gIHNwZWNfcGF0aCBURVhUIE5PVCBOVUxMLFxuICBzdGF0ZV92ZXJzaW9uIElOVEVHRVIgTk9UIE5VTEwgREVGQVVMVCAwLFxuICBkZXBlbmRzX29uIEpTT05CIE5PVCBOVUxMIERFRkFVTFQgJ1tdJzo6anNvbmIsXG4gIGxhc3RfZmVuY2luZ190b2tlbiBJTlRFR0VSIE5PVCBOVUxMIERFRkFVTFQgMFxuKTtcblxuLS0gUGhhc2UgNCB1cGdyYWRlIHBhdGggKHJvYWRtYXAgXHUwMEE3MS40KToga2luZCBvbiBkdXJhYmxlIFBoYXNlIDEtMyBkaXJzIHN0YXlzICdjb2RlJy5cbkFMVEVSIFRBQkxFIHdvcmtfaXRlbXMgQUREIENPTFVNTiBJRiBOT1QgRVhJU1RTIGtpbmQgVEVYVCBOT1QgTlVMTCBERUZBVUxUICdjb2RlJztcblxuQ1JFQVRFIFRBQkxFIElGIE5PVCBFWElTVFMgY2xhaW1zIChcbiAgaWQgVEVYVCBQUklNQVJZIEtFWSxcbiAgc2VxIFNFUklBTCBOT1QgTlVMTCxcbiAgd29ya19pdGVtX2lkIFRFWFQgTk9UIE5VTEwsXG4gIGFjdG9yX2lkIFRFWFQgTk9UIE5VTEwsXG4gIGZlbmNpbmdfdG9rZW4gSU5URUdFUiBOT1QgTlVMTCxcbiAgbGVhc2VfZXhwaXJlc19hdCBCSUdJTlQgTk9UIE5VTEwsXG4gIHJlbGVhc2VkIEJPT0xFQU4gTk9UIE5VTEwgREVGQVVMVCBGQUxTRSxcbiAgdHRsX21zIEJJR0lOVCBOT1QgTlVMTFxuKTtcblxuLS0gcm9hZG1hcCBcdTAwQTcxLjM6IG9uZSBsaXZlIGNsYWltIHBlciB3b3JrIGl0ZW0gXHUyMDE0IHJhY2VzIGxvc2UgYnkgY29uc3RyYWludC5cbkNSRUFURSBVTklRVUUgSU5ERVggSUYgTk9UIEVYSVNUUyBjbGFpbXNfb25lX2xpdmVfcGVyX2l0ZW1cbiAgT04gY2xhaW1zICh3b3JrX2l0ZW1faWQpIFdIRVJFIHJlbGVhc2VkID0gZmFsc2U7XG5cbkNSRUFURSBUQUJMRSBJRiBOT1QgRVhJU1RTIGdhdGVfZGVjaXNpb25zIChcbiAgc2VxIFNFUklBTCBQUklNQVJZIEtFWSxcbiAgd29ya19pdGVtX2lkIFRFWFQgTk9UIE5VTEwsXG4gIGdhdGUgVEVYVCBOT1QgTlVMTCxcbiAgZGVjaXNpb24gVEVYVCBOT1QgTlVMTCxcbiAgYWN0b3JfaWQgVEVYVCBOT1QgTlVMTCxcbiAgcm91bmQgSU5URUdFUiBOT1QgTlVMTCBERUZBVUxUIDBcbik7XG5cbi0tIFBoYXNlIDIgdXBncmFkZSBwYXRoIGZvciBkdXJhYmxlIGRhdGEgZGlycyBjcmVhdGVkIHVuZGVyIFBoYXNlIDEgKHN0b3J5IDEzKS5cbkFMVEVSIFRBQkxFIGdhdGVfZGVjaXNpb25zIEFERCBDT0xVTU4gSUYgTk9UIEVYSVNUUyByb3VuZCBJTlRFR0VSIE5PVCBOVUxMIERFRkFVTFQgMDtcblxuQ1JFQVRFIFRBQkxFIElGIE5PVCBFWElTVFMgZXZpZGVuY2UgKFxuICBzZXEgU0VSSUFMIFBSSU1BUlkgS0VZLFxuICB3b3JrX2l0ZW1faWQgVEVYVCBOT1QgTlVMTCxcbiAga2luZCBURVhUIE5PVCBOVUxMLFxuICBwYXlsb2FkIEpTT05CIE5PVCBOVUxMXG4pO1xuXG5DUkVBVEUgVEFCTEUgSUYgTk9UIEVYSVNUUyBldmVudHMgKFxuICBnbG9iYWxfc2VxIFNFUklBTCBQUklNQVJZIEtFWSxcbiAgc3RyZWFtX3R5cGUgVEVYVCBOT1QgTlVMTCxcbiAgc3RyZWFtX2lkIFRFWFQgTk9UIE5VTEwsXG4gIHN0cmVhbV9zZXEgSU5URUdFUiBOT1QgTlVMTCxcbiAgdHlwZSBURVhUIE5PVCBOVUxMLFxuICBhY3Rvcl9pZCBURVhUIE5PVCBOVUxMLFxuICBwYXlsb2FkIEpTT05CIE5PVCBOVUxMLFxuICBjYXVzYXRpb25faWQgVEVYVCxcbiAgaWRlbXBvdGVuY3lfa2V5IFRFWFRcbik7XG5cbi0tIFx1MDBBNzEuNTogVU5JUVVFKHN0cmVhbV9pZCwgc3RyZWFtX3NlcSkgZG91YmxlcyBhcyB0aGUgb3B0aW1pc3RpYyBsb2NrLlxuQ1JFQVRFIFVOSVFVRSBJTkRFWCBJRiBOT1QgRVhJU1RTIGV2ZW50c19zdHJlYW1faWRfc3RyZWFtX3NlcVxuICBPTiBldmVudHMgKHN0cmVhbV9pZCwgc3RyZWFtX3NlcSk7XG5cbkNSRUFURSBUQUJMRSBJRiBOT1QgRVhJU1RTIGlkZW1wb3RlbmN5X2tleXMgKFxuICBrZXkgVEVYVCBQUklNQVJZIEtFWSxcbiAgcmVzdWx0IEpTT05CIE5PVCBOVUxMXG4pO1xuXG4tLSBQaGFzZSAzIGNvbGxhYm9yYXRpb24gKHJvYWRtYXAgXHUwMEE3NSkuIElGIE5PVCBFWElTVFMga2VlcHMgZHVyYWJsZSBQaGFzZS0xLzJcbi0tIGRhdGEgZGlyZWN0b3JpZXMgdXBncmFkaW5nIGluIHBsYWNlIChzdG9yeSAxMykuXG5cbkNSRUFURSBUQUJMRSBJRiBOT1QgRVhJU1RTIHRocmVhZHMgKFxuICBpZCBURVhUIFBSSU1BUlkgS0VZLFxuICBzZXEgU0VSSUFMIE5PVCBOVUxMLFxuICBmZWF0dXJlX2lkIFRFWFQsXG4gIHdvcmtfaXRlbV9pZCBURVhULFxuICBraW5kIFRFWFQgTk9UIE5VTEwsXG4gIHZpc2liaWxpdHkgVEVYVCBOT1QgTlVMTCxcbiAgY3JlYXRlZF9ieSBURVhUIE5PVCBOVUxMLFxuICBwYXJ0aWNpcGFudHMgSlNPTkIgTk9UIE5VTEwgREVGQVVMVCAnW10nOjpqc29uYlxuKTtcblxuQ1JFQVRFIFRBQkxFIElGIE5PVCBFWElTVFMgbWVzc2FnZXMgKFxuICBpZCBURVhUIFBSSU1BUlkgS0VZLFxuICB0aHJlYWRfaWQgVEVYVCBOT1QgTlVMTCxcbiAgc2VxIElOVEVHRVIgTk9UIE5VTEwsXG4gIGF1dGhvcl9pZCBURVhUIE5PVCBOVUxMLFxuICBraW5kIFRFWFQgTk9UIE5VTEwsXG4gIGJvZHkgVEVYVCBOT1QgTlVMTCxcbiAgcmVwbHlfdG8gVEVYVFxuKTtcblxuLS0gXHUwMEE3NS4zOiB0aGUgcGVyLXRocmVhZCBtZXNzYWdlIHNlcXVlbmNlIGlzIGdhcC1mcmVlIEJZIENPTlNUUkFJTlQuXG5DUkVBVEUgVU5JUVVFIElOREVYIElGIE5PVCBFWElTVFMgbWVzc2FnZXNfdGhyZWFkX2lkX3NlcVxuICBPTiBtZXNzYWdlcyAodGhyZWFkX2lkLCBzZXEpO1xuXG5DUkVBVEUgVEFCTEUgSUYgTk9UIEVYSVNUUyBtZW50aW9ucyAoXG4gIHNlcSBTRVJJQUwgUFJJTUFSWSBLRVksXG4gIG1lc3NhZ2VfaWQgVEVYVCBOT1QgTlVMTCxcbiAgbWVudGlvbmVkX2FjdG9yX2lkIFRFWFQgTk9UIE5VTEwsXG4gIHJlc29sdXRpb24gVEVYVCBOT1QgTlVMTFxuKTtcblxuQ1JFQVRFIFRBQkxFIElGIE5PVCBFWElTVFMgbm90aWZpY2F0aW9ucyAoXG4gIGlkIFRFWFQgUFJJTUFSWSBLRVksXG4gIHNlcSBTRVJJQUwgTk9UIE5VTEwsXG4gIGFjdG9yX2lkIFRFWFQgTk9UIE5VTEwsXG4gIHNvdXJjZSBURVhUIE5PVCBOVUxMLFxuICByZWZfaWQgVEVYVCBOT1QgTlVMTCxcbiAgcmVhZCBCT09MRUFOIE5PVCBOVUxMIERFRkFVTFQgRkFMU0Vcbik7XG5cbi0tIFBoYXNlIDUgYWdlbnQgbWVtb3J5IChyb2FkbWFwIFx1MDBBNzYpLiBOZXcgdGFibGUgXHUyMDE0IElGIE5PVCBFWElTVFMgdXBncmFkZXNcbi0tIGR1cmFibGUgUGhhc2UgMS00IGRhdGEgZGlyZWN0b3JpZXMgaW4gcGxhY2U7IG5vIEFMVEVSIG5lZWRlZC5cbkNSRUFURSBUQUJMRSBJRiBOT1QgRVhJU1RTIGFnZW50X21lbW9yaWVzIChcbiAgaWQgVEVYVCBQUklNQVJZIEtFWSxcbiAgYWdlbnRfYWN0b3JfaWQgVEVYVCBOT1QgTlVMTCxcbiAga2luZCBURVhUIE5PVCBOVUxMLFxuICBjb250ZW50IFRFWFQgTk9UIE5VTEwsXG4gIHNvdXJjZV90aHJlYWRfaWQgVEVYVCxcbiAgc291cmNlX3Zpc2liaWxpdHkgVEVYVCxcbiAgc2VxIElOVEVHRVIgTk9UIE5VTExcbik7XG5cbi0tIFx1MDBBNzY6IHBlci1hZ2VudCBtZW1vcnkgb3JkZXIgaXMgYSBDT05TVFJBSU5UICgxLWJhc2VkIGFwcGVuZCBvcmRlcikuXG5DUkVBVEUgVU5JUVVFIElOREVYIElGIE5PVCBFWElTVFMgYWdlbnRfbWVtb3JpZXNfYWdlbnRfYWN0b3JfaWRfc2VxXG4gIE9OIGFnZW50X21lbW9yaWVzIChhZ2VudF9hY3Rvcl9pZCwgc2VxKTtcblxuQ1JFQVRFIFRBQkxFIElGIE5PVCBFWElTVFMgYWdlbnRfam9icyAoXG4gIGlkIFRFWFQgUFJJTUFSWSBLRVksXG4gIHNlcSBTRVJJQUwgTk9UIE5VTEwsXG4gIGFnZW50X2FjdG9yX2lkIFRFWFQgTk9UIE5VTEwsXG4gIHRocmVhZF9pZCBURVhUIE5PVCBOVUxMLFxuICBtZXNzYWdlX2lkIFRFWFQgTk9UIE5VTEwsXG4gIHdvcmtfaXRlbV9pZCBURVhULFxuICBmZWF0dXJlX2lkIFRFWFQsXG4gIHN0YXR1cyBURVhUIE5PVCBOVUxMLFxuICBkZXB0aCBJTlRFR0VSIE5PVCBOVUxMIERFRkFVTFQgMCxcbiAgbm90ZSBURVhUXG4pO1xuYDtcbiIsICJleHBvcnQgeyBQZ0VuZ2luZSB9IGZyb20gJy4vcGctZW5naW5lLmpzJztcbmV4cG9ydCB7IGNyZWF0ZVBnU3luY0VuZ2luZSwgdHlwZSBQZ1N5bmNFbmdpbmVPcHRpb25zIH0gZnJvbSAnLi9zeW5jLWVuZ2luZS5qcyc7XG5leHBvcnQgeyBTQ0hFTUFfU1FMIH0gZnJvbSAnLi9zY2hlbWEtc3FsLmpzJztcbmV4cG9ydCAqIGFzIHNjaGVtYSBmcm9tICcuL3NjaGVtYS5qcyc7XG4iLCAiLyoqXG4gKiBUaGUgYG9haHNgIGJpbmFyeSBcdTIwMTQgY29tbWFuZGVyIHdpcmluZyBPTkxZLiBFdmVyeSBnYXRlLWhvbGRlciBjb21tYW5kIGlzIGFcbiAqIHB1cmUgZnVuY3Rpb24gaW4gc3JjL2NvbW1hbmRzLyB0YWtpbmcgKGNsaWVudCwgb3B0cyk7IHNlcnZlIGxpdmVzIGluXG4gKiBzcmMvc2VydmUudHM7IHRoZSB3b3JrZXIgbG9vcCBsaXZlcyBpbiBAb2Focy9ydW5uZXIgYW5kIGlzIGltcG9ydGVkIExBWklMWVxuICogc28gdGhlIHJlc3Qgb2YgdGhlIENMSSB3b3JrcyB3aGlsZSB0aGUgcnVubmVyIGlzIHN0aWxsIGxhbmRpbmcgKHN0b3J5IDE0KS5cbiAqXG4gKiBFbnYgaXMgcmVhZCBoZXJlIGFuZCBvbmx5IGhlcmU6IE9BSFNfVE9LRU4gKGNsaWVudCBhdXRoKSBhbmRcbiAqIE9BSFNfQURNSU5fVE9LRU4gKHNlcnZlIGJvb3RzdHJhcCkuXG4gKi9cbmltcG9ydCB7IHJlc29sdmUgfSBmcm9tICdub2RlOnBhdGgnO1xuXG5pbXBvcnQgeyBDb21tYW5kIH0gZnJvbSAnY29tbWFuZGVyJztcbmltcG9ydCB7IG1ha2VDbGllbnQsIHR5cGUgT2Foc0NsaWVudCB9IGZyb20gJ0BvYWhzL2NvbnRyYWN0cyc7XG5cbmltcG9ydCB7XG4gIGFjdG9yQ3JlYXRlQ29tbWFuZCxcbiAgYWN0b3JzQ29tbWFuZCxcbiAgYWR2YW5jZUNvbW1hbmQsXG4gIGFkdmlzZU5leHRUYXNrQ29tbWFuZCxcbiAgYWR2aXNlUmVjb25jaWxlQ29tbWFuZCxcbiAgYXBwcm92ZUNvbW1hbmQsXG4gIGF1dGh6Q29tbWFuZCxcbiAgZG9jbGludENvbW1hbmQsXG4gIGV2ZW50c0NvbW1hbmQsXG4gIGZlYXR1cmVDcmVhdGVDb21tYW5kLFxuICBnYXRlUG9saWN5U2V0Q29tbWFuZCxcbiAgZ292ZXJuYW5jZVNldENvbW1hbmQsXG4gIGdyYW50Q29tbWFuZCxcbiAgaW1wb3J0U3Rvcmllc0NvbW1hbmQsXG4gIGluYm94Q29tbWFuZCxcbiAgaXRlbUNyZWF0ZUNvbW1hbmQsXG4gIGpvYkNvbXBsZXRlQ29tbWFuZCxcbiAgam9ic0NvbW1hbmQsXG4gIG1lbW9yeUNvbW1hbmQsXG4gIG1lc3NhZ2VzQ29tbWFuZCxcbiAgbW9kZWxzQ29tbWFuZCxcbiAgbm90aWZpY2F0aW9uc0NvbW1hbmQsXG4gIHBpbmdDb21tYW5kLFxuICBwZXJzb25hc1Byb3Zpc2lvbkNvbW1hbmQsXG4gIHBsYW5TZXRDb21tYW5kLFxuICBwb2xpY3lTZXRDb21tYW5kLFxuICBwb3N0Q29tbWFuZCxcbiAgcmVqZWN0Q29tbWFuZCxcbiAgcm9sZUFzc2lnbkNvbW1hbmQsXG4gIHJvbGVMaXN0Q29tbWFuZCxcbiAgcm9sZVJldm9rZUNvbW1hbmQsXG4gIHJ1blRvT3V0cHV0LFxuICBzdGF0c1Jldmlld3NDb21tYW5kLFxuICBzdGF0dXNDb21tYW5kLFxuICB0aHJlYWRDcmVhdGVDb21tYW5kLFxuICB0aHJlYWRMaXN0Q29tbWFuZCxcbn0gZnJvbSAnLi9jb21tYW5kcy9pbmRleC5qcyc7XG5pbXBvcnQgeyBydW5CcmFpbiB9IGZyb20gJy4vYWdlbnQtYnJhaW4uanMnO1xuaW1wb3J0IHsgREVGQVVMVF9QT1JULCBzdGFydFNlcnZlIH0gZnJvbSAnLi9zZXJ2ZS5qcyc7XG5cbmNvbnN0IERFRkFVTFRfVVJMID0gYGh0dHA6Ly9sb2NhbGhvc3Q6JHtERUZBVUxUX1BPUlR9YDtcblxuaW50ZXJmYWNlIENsaWVudEZsYWdzIHtcbiAgdXJsOiBzdHJpbmc7XG4gIHRva2VuPzogc3RyaW5nO1xufVxuXG5mdW5jdGlvbiBjbGllbnRGcm9tKGZsYWdzOiBDbGllbnRGbGFncyk6IE9haHNDbGllbnQge1xuICBjb25zdCB0b2tlbiA9IGZsYWdzLnRva2VuID8/IHByb2Nlc3MuZW52WydPQUhTX1RPS0VOJ107XG4gIGlmICh0b2tlbiA9PT0gdW5kZWZpbmVkIHx8IHRva2VuLmxlbmd0aCA9PT0gMCkge1xuICAgIHRocm93IG5ldyBFcnJvcignbWlzc2luZyB0b2tlbjogcGFzcyAtLXRva2VuIDx0b2tlbj4gb3Igc2V0IE9BSFNfVE9LRU4nKTtcbiAgfVxuICByZXR1cm4gbWFrZUNsaWVudCh7IGJhc2VVcmw6IGZsYWdzLnVybCwgdG9rZW4gfSk7XG59XG5cbi8qKiBBdHRhY2ggdGhlIHNoYXJlZCBjbGllbnQgZmxhZ3MgdG8gYSBnYXRlLWhvbGRlciBjb21tYW5kLiAqL1xuZnVuY3Rpb24gd2l0aENsaWVudEZsYWdzKGNtZDogQ29tbWFuZCk6IENvbW1hbmQge1xuICByZXR1cm4gY21kXG4gICAgLm9wdGlvbignLS11cmwgPHVybD4nLCAnc3BpbmUtYXBpIGJhc2UgVVJMJywgREVGQVVMVF9VUkwpXG4gICAgLm9wdGlvbignLS10b2tlbiA8dG9rZW4+JywgJ2JlYXJlciB0b2tlbiAoZGVmYXVsdDogZW52IE9BSFNfVE9LRU4pJyk7XG59XG5cbi8qKiBSdW4gYSBjb21tYW5kIGZ1bmN0aW9uIGFuZCB0cmFuc2xhdGUgaXRzIG91dGNvbWUgdG8gc3Rkb3V0L3N0ZGVyciArIGV4aXQgY29kZS4gKi9cbmFzeW5jIGZ1bmN0aW9uIGVtaXQoZm46ICgpID0+IFByb21pc2U8c3RyaW5nPik6IFByb21pc2U8dm9pZD4ge1xuICBjb25zdCB7IHRleHQsIGV4aXRDb2RlIH0gPSBhd2FpdCBydW5Ub091dHB1dChmbik7XG4gIGlmIChleGl0Q29kZSA9PT0gMCkge1xuICAgIHByb2Nlc3Muc3Rkb3V0LndyaXRlKGAke3RleHR9XFxuYCk7XG4gIH0gZWxzZSB7XG4gICAgcHJvY2Vzcy5zdGRlcnIud3JpdGUoYCR7dGV4dH1cXG5gKTtcbiAgICBwcm9jZXNzLmV4aXRDb2RlID0gZXhpdENvZGU7XG4gIH1cbn1cblxuY29uc3QgY29sbGVjdCA9ICh2YWx1ZTogc3RyaW5nLCBwcmV2aW91czogc3RyaW5nW10pOiBzdHJpbmdbXSA9PiBbLi4ucHJldmlvdXMsIHZhbHVlXTtcblxuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkUHJvZ3JhbSgpOiBDb21tYW5kIHtcbiAgY29uc3QgcHJvZ3JhbSA9IG5ldyBDb21tYW5kKCk7XG4gIHByb2dyYW1cbiAgICAubmFtZSgnb2FocycpXG4gICAgLmRlc2NyaXB0aW9uKCdvYWhzIFx1MjAxNCBPcGVuIEFnZW50cyBIYXJuZXNzIFN5c3RlbSBDTEkgKHNwaW5lIHNlcnZlciArIGdhdGUtaG9sZGVyIGNvbW1hbmRzKScpO1xuXG4gIC8vIC0tIHNlcnZlIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICBwcm9ncmFtXG4gICAgLmNvbW1hbmQoJ3NlcnZlJylcbiAgICAuZGVzY3JpcHRpb24oJ3N0YXJ0IHRoZSBzcGluZS1hcGkgKEhUVFAgL3JwYy8qICsgTUNQIC9tY3ApJylcbiAgICAub3B0aW9uKCctLXBvcnQgPHBvcnQ+JywgJ1RDUCBwb3J0JywgU3RyaW5nKERFRkFVTFRfUE9SVCkpXG4gICAgLm9wdGlvbignLS1hZG1pbi10b2tlbiA8dG9rZW4+JywgJ2Jvb3RzdHJhcCBhZG1pbiB0b2tlbiAoZGVmYXVsdDogZW52IE9BSFNfQURNSU5fVE9LRU4sIGVsc2UgZ2VuZXJhdGVkKScpXG4gICAgLm9wdGlvbignLS1kYXRhIDxkaXI+JywgJ3BlcnNpc3RlbmNlIGRpcmVjdG9yeSAoZHVyYWJsZSBQR2xpdGUgKyB0b2tlbiBzdG9yZSknKVxuICAgIC5hY3Rpb24oYXN5bmMgKG9wdHM6IHsgcG9ydDogc3RyaW5nOyBhZG1pblRva2VuPzogc3RyaW5nOyBkYXRhPzogc3RyaW5nIH0pID0+IHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IGFkbWluVG9rZW4gPSBvcHRzLmFkbWluVG9rZW4gPz8gcHJvY2Vzcy5lbnZbJ09BSFNfQURNSU5fVE9LRU4nXTtcbiAgICAgICAgY29uc3QgaGFuZGxlID0gYXdhaXQgc3RhcnRTZXJ2ZSh7XG4gICAgICAgICAgcG9ydDogTnVtYmVyKG9wdHMucG9ydCksXG4gICAgICAgICAgLi4uKGFkbWluVG9rZW4gIT09IHVuZGVmaW5lZCAmJiBhZG1pblRva2VuLmxlbmd0aCA+IDAgPyB7IGFkbWluVG9rZW4gfSA6IHt9KSxcbiAgICAgICAgICAuLi4ob3B0cy5kYXRhICE9PSB1bmRlZmluZWQgPyB7IGRhdGFEaXI6IHJlc29sdmUob3B0cy5kYXRhKSB9IDoge30pLFxuICAgICAgICB9KTtcbiAgICAgICAgcHJvY2Vzcy5zdGRvdXQud3JpdGUoXG4gICAgICAgICAgYG9haHMgc3BpbmUtYXBpIGxpc3RlbmluZyBvbiA6JHtoYW5kbGUucG9ydH0gKEhUVFAgL3JwYy8qLCBNQ1AgL21jcDsgZW5naW5lOiAke2hhbmRsZS5lbmdpbmVLaW5kfSR7XG4gICAgICAgICAgICBvcHRzLmRhdGEgIT09IHVuZGVmaW5lZCA/IGAsIGRhdGE6ICR7cmVzb2x2ZShvcHRzLmRhdGEpfWAgOiAnJ1xuICAgICAgICAgIH0pXFxuYCxcbiAgICAgICAgKTtcbiAgICAgICAgaWYgKGhhbmRsZS5hZG1pblRva2VuR2VuZXJhdGVkKSB7XG4gICAgICAgICAgcHJvY2Vzcy5zdGRvdXQud3JpdGUoYGFkbWluIHRva2VuIChnZW5lcmF0ZWQpOiAke2hhbmRsZS5hZG1pblRva2VufVxcbmApO1xuICAgICAgICB9XG4gICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICBjb25zdCBlcnIgPSBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IgOiBuZXcgRXJyb3IoU3RyaW5nKGVycm9yKSk7XG4gICAgICAgIHByb2Nlc3Muc3RkZXJyLndyaXRlKGAke2Vyci5uYW1lfTogJHtlcnIubWVzc2FnZX1cXG5gKTtcbiAgICAgICAgcHJvY2Vzcy5leGl0Q29kZSA9IDE7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgLy8gLS0gZ2F0ZS1ob2xkZXIgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHdpdGhDbGllbnRGbGFncyhwcm9ncmFtLmNvbW1hbmQoJ2luYm94JykpXG4gICAgLmRlc2NyaXB0aW9uKCdpdGVtcyBhd2FpdGluZyBhIGdhdGUgZGVjaXNpb24gKHNwZWMgYXBwcm92YWwgLyByZXZpZXcgZGVjaXNpb24pJylcbiAgICAuYWN0aW9uKGFzeW5jIChvcHRzOiBDbGllbnRGbGFncykgPT4gZW1pdCgoKSA9PiBpbmJveENvbW1hbmQoY2xpZW50RnJvbShvcHRzKSkpKTtcblxuICB3aXRoQ2xpZW50RmxhZ3MocHJvZ3JhbS5jb21tYW5kKCdhcHByb3ZlIDx3b3JrSXRlbUlkPicpKVxuICAgIC5kZXNjcmlwdGlvbignYXBwcm92ZSBhIGdhdGUgKHNwZWNfYXBwcm92YWwgcGlucyB2ZXJpZmljYXRpb24gY29tbWFuZHMpJylcbiAgICAucmVxdWlyZWRPcHRpb24oJy0tZ2F0ZSA8Z2F0ZT4nLCAnc3BlY19hcHByb3ZhbCB8IHJldmlld19hcHByb3ZhbCcpXG4gICAgLm9wdGlvbignLS1waW4gPGNtZD4nLCAncGluIGEgdmVyaWZpY2F0aW9uIGNvbW1hbmQgKHJlcGVhdGFibGUsIHNwZWNfYXBwcm92YWwgb25seSknLCBjb2xsZWN0LCBbXSlcbiAgICAuYWN0aW9uKGFzeW5jICh3b3JrSXRlbUlkOiBzdHJpbmcsIG9wdHM6IENsaWVudEZsYWdzICYgeyBnYXRlOiBzdHJpbmc7IHBpbjogc3RyaW5nW10gfSkgPT5cbiAgICAgIGVtaXQoKCkgPT4gYXBwcm92ZUNvbW1hbmQoY2xpZW50RnJvbShvcHRzKSwgeyB3b3JrSXRlbUlkLCBnYXRlOiBvcHRzLmdhdGUsIHBpbjogb3B0cy5waW4gfSkpLFxuICAgICk7XG5cbiAgd2l0aENsaWVudEZsYWdzKHByb2dyYW0uY29tbWFuZCgnYWR2YW5jZSA8d29ya0l0ZW1JZD4nKSlcbiAgICAuZGVzY3JpcHRpb24oJ2FkdmFuY2UgYSB3b3JrIGl0ZW0gdGhyb3VnaCB0aGUgRlNNIChwbGFubmluZy16b25lIG1vdmVzIGZvciBodW1hbnMpJylcbiAgICAucmVxdWlyZWRPcHRpb24oJy0tdG8gPHN0YXRlPicsICd0YXJnZXQgc3RhdGUsIGUuZy4gZHJhZnQgfCByZWFkeV9mb3JfZGV2JylcbiAgICAub3B0aW9uKCctLWZlbmNpbmctdG9rZW4gPG4+JywgJ2ZlbmNpbmcgdG9rZW4gd2hlbiBhY3RpbmcgdW5kZXIgYSBjbGFpbScsICh2OiBzdHJpbmcpID0+IE51bWJlcih2KSlcbiAgICAuYWN0aW9uKGFzeW5jICh3b3JrSXRlbUlkOiBzdHJpbmcsIG9wdHM6IENsaWVudEZsYWdzICYgeyB0bzogc3RyaW5nOyBmZW5jaW5nVG9rZW4/OiBudW1iZXIgfSkgPT5cbiAgICAgIGVtaXQoKCkgPT5cbiAgICAgICAgYWR2YW5jZUNvbW1hbmQoY2xpZW50RnJvbShvcHRzKSwge1xuICAgICAgICAgIHdvcmtJdGVtSWQsXG4gICAgICAgICAgdG86IG9wdHMudG8sXG4gICAgICAgICAgLi4uKG9wdHMuZmVuY2luZ1Rva2VuICE9PSB1bmRlZmluZWQgPyB7IGZlbmNpbmdUb2tlbjogb3B0cy5mZW5jaW5nVG9rZW4gfSA6IHt9KSxcbiAgICAgICAgfSksXG4gICAgICApLFxuICAgICk7XG5cbiAgd2l0aENsaWVudEZsYWdzKHByb2dyYW0uY29tbWFuZCgncmVqZWN0IDx3b3JrSXRlbUlkPicpKVxuICAgIC5kZXNjcmlwdGlvbigncmVqZWN0IGEgZ2F0ZSAocmV2aWV3IHJlamVjdGlvbiBmaXJlcyB0aGUgZGV0ZXJtaW5pc3RpYyBsb29wYmFjayknKVxuICAgIC5yZXF1aXJlZE9wdGlvbignLS1nYXRlIDxnYXRlPicsICdzcGVjX2FwcHJvdmFsIHwgcmV2aWV3X2FwcHJvdmFsJylcbiAgICAuYWN0aW9uKGFzeW5jICh3b3JrSXRlbUlkOiBzdHJpbmcsIG9wdHM6IENsaWVudEZsYWdzICYgeyBnYXRlOiBzdHJpbmcgfSkgPT5cbiAgICAgIGVtaXQoKCkgPT4gcmVqZWN0Q29tbWFuZChjbGllbnRGcm9tKG9wdHMpLCB7IHdvcmtJdGVtSWQsIGdhdGU6IG9wdHMuZ2F0ZSB9KSksXG4gICAgKTtcblxuICB3aXRoQ2xpZW50RmxhZ3MocHJvZ3JhbS5jb21tYW5kKCdzdGF0dXMnKSlcbiAgICAuZGVzY3JpcHRpb24oJ2FsbCB3b3JrIGl0ZW1zIGdyb3VwZWQgYnkgc3RhdGUsIHBsdXMgZmVhdHVyZSBkaXNwYXRjaCBob2xkcycpXG4gICAgLmFjdGlvbihhc3luYyAob3B0czogQ2xpZW50RmxhZ3MpID0+IGVtaXQoKCkgPT4gc3RhdHVzQ29tbWFuZChjbGllbnRGcm9tKG9wdHMpKSkpO1xuXG4gIGNvbnN0IGFjdG9yID0gcHJvZ3JhbS5jb21tYW5kKCdhY3RvcicpLmRlc2NyaXB0aW9uKCdhY3RvciBtYW5hZ2VtZW50IChhZG1pbiknKTtcbiAgd2l0aENsaWVudEZsYWdzKGFjdG9yLmNvbW1hbmQoJ2NyZWF0ZScpKVxuICAgIC5kZXNjcmlwdGlvbignY3JlYXRlIGEgdXNlciBvciBhZ2VudCBhY3RvcjsgcHJpbnRzIGFjdG9ySWQgKyB0b2tlbiAoYWRtaW4gb25seSknKVxuICAgIC5yZXF1aXJlZE9wdGlvbignLS10eXBlIDx0eXBlPicsICd1c2VyIHwgYWdlbnQnKVxuICAgIC5yZXF1aXJlZE9wdGlvbignLS1uYW1lIDxuYW1lPicsICdkaXNwbGF5IG5hbWUnKVxuICAgIC5vcHRpb24oJy0tZ292ZXJuYW5jZS1yb2xlIDxyb2xlPicsICdhZG1pbiB8IG1lbWJlciB8IGF1ZGl0b3IgKGJvb3RzdHJhcCBwbHVtYmluZywgYWRtaW4gb25seSknKVxuICAgIC5hY3Rpb24oYXN5bmMgKG9wdHM6IENsaWVudEZsYWdzICYgeyB0eXBlOiBzdHJpbmc7IG5hbWU6IHN0cmluZzsgZ292ZXJuYW5jZVJvbGU/OiBzdHJpbmcgfSkgPT5cbiAgICAgIGVtaXQoKCkgPT5cbiAgICAgICAgYWN0b3JDcmVhdGVDb21tYW5kKGNsaWVudEZyb20ob3B0cyksIHtcbiAgICAgICAgICB0eXBlOiBvcHRzLnR5cGUsXG4gICAgICAgICAgbmFtZTogb3B0cy5uYW1lLFxuICAgICAgICAgIC4uLihvcHRzLmdvdmVybmFuY2VSb2xlICE9PSB1bmRlZmluZWQgPyB7IGdvdmVybmFuY2VSb2xlOiBvcHRzLmdvdmVybmFuY2VSb2xlIH0gOiB7fSksXG4gICAgICAgIH0pLFxuICAgICAgKSxcbiAgICApO1xuXG4gIC8vIC0tIFBoYXNlIDQ6IG5vbi1jb2RpbmcgdGVhbW1hdGVzIG9uIHRoZSBzYW1lIHJhaWxzIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICB3aXRoQ2xpZW50RmxhZ3MocHJvZ3JhbS5jb21tYW5kKCdhY3RvcnMnKSlcbiAgICAuZGVzY3JpcHRpb24oJ2xpc3QgQUxMIGFjdG9ycyBcdTIwMTQgaHVtYW5zLCBhZ2VudHMsIHBlcnNvbmFzLCBhbmQgdGhlIHN5c3RlbSBhY3RvcicpXG4gICAgLmFjdGlvbihhc3luYyAob3B0czogQ2xpZW50RmxhZ3MpID0+IGVtaXQoKCkgPT4gYWN0b3JzQ29tbWFuZChjbGllbnRGcm9tKG9wdHMpKSkpO1xuXG4gIGNvbnN0IHBlcnNvbmFzID0gcHJvZ3JhbS5jb21tYW5kKCdwZXJzb25hcycpLmRlc2NyaXB0aW9uKCdCTUFEIHBlcnNvbmEgYWdlbnQgYWN0b3JzIChyb2FkbWFwIFx1MDBBNzMpJyk7XG4gIHdpdGhDbGllbnRGbGFncyhwZXJzb25hcy5jb21tYW5kKCdwcm92aXNpb24nKSlcbiAgICAuZGVzY3JpcHRpb24oJ2lkZW1wb3RlbnRseSBwcm92aXNpb24gdGhlIHNpeCBCTUFEIHBlcnNvbmFzIChnb3Zlcm5hbmNlLWFkbWluIG9ubHksIGVuZ2luZS1nYXRlZCknKVxuICAgIC5hY3Rpb24oYXN5bmMgKG9wdHM6IENsaWVudEZsYWdzKSA9PiBlbWl0KCgpID0+IHBlcnNvbmFzUHJvdmlzaW9uQ29tbWFuZChjbGllbnRGcm9tKG9wdHMpKSkpO1xuXG4gIGNvbnN0IGl0ZW0gPSBwcm9ncmFtLmNvbW1hbmQoJ2l0ZW0nKS5kZXNjcmlwdGlvbignc2luZ2xlIHdvcmsgaXRlbXMgKFBoYXNlIDQ6IG5vbi1jb2RlIGtpbmRzKScpO1xuICB3aXRoQ2xpZW50RmxhZ3MoaXRlbS5jb21tYW5kKCdjcmVhdGUnKSlcbiAgICAuZGVzY3JpcHRpb24oJ2NyZWF0ZSBvbmUgd29yayBpdGVtOyAtLWtpbmQgc2VsZWN0cyBldmlkZW5jZSBndWFyZHMsIG5ldmVyIGdhdGUgYXV0aG9yaXR5JylcbiAgICAucmVxdWlyZWRPcHRpb24oJy0tZmVhdHVyZSA8ZmVhdHVyZUlkPicsICdmZWF0dXJlIHRvIGNyZWF0ZSB0aGUgaXRlbSBpbicpXG4gICAgLnJlcXVpcmVkT3B0aW9uKCctLWtleSA8ZXh0ZXJuYWxLZXk+JywgJ2V4dGVybmFsIGtleSAoc3Rvcmllcy55YW1sIGlkIHZvY2FidWxhcnkpJylcbiAgICAucmVxdWlyZWRPcHRpb24oJy0tdGl0bGUgPHRpdGxlPicsICd3b3JrIGl0ZW0gdGl0bGUnKVxuICAgIC5vcHRpb24oJy0ta2luZCA8a2luZD4nLCAnY29kZSB8IHNwZWNfZHJhZnQgfCBkZXNpZ25fcmV2aWV3IHwgcWFfcmVwb3J0IHwgZG9jIChkZWZhdWx0IGNvZGUpJylcbiAgICAub3B0aW9uKCctLXNwZWMtY2hlY2twb2ludCcsICdyZXF1aXJlIHNwZWNfYXBwcm92YWwgYmVmb3JlIHJlYWR5X2Zvcl9kZXYnKVxuICAgIC5vcHRpb24oJy0tZG9uZS1jaGVja3BvaW50JywgJ2hvbGQgZmVhdHVyZSBkaXNwYXRjaCBhZnRlciB0aGlzIGl0ZW0gaXMgZG9uZScpXG4gICAgLm9wdGlvbignLS1pbnZva2UtZGV2LXdpdGggPHRleHQ+JywgJ2FnZW50IGludm9jYXRpb24gaGludCcpXG4gICAgLm9wdGlvbignLS1kZXBlbmRzLW9uIDxleHRlcm5hbEtleT4nLCAnZGVwZW5kZW5jeSBleHRlcm5hbCBrZXkgKHJlcGVhdGFibGUpJywgY29sbGVjdCwgW10pXG4gICAgLmFjdGlvbihcbiAgICAgIGFzeW5jIChcbiAgICAgICAgb3B0czogQ2xpZW50RmxhZ3MgJiB7XG4gICAgICAgICAgZmVhdHVyZTogc3RyaW5nO1xuICAgICAgICAgIGtleTogc3RyaW5nO1xuICAgICAgICAgIHRpdGxlOiBzdHJpbmc7XG4gICAgICAgICAga2luZD86IHN0cmluZztcbiAgICAgICAgICBzcGVjQ2hlY2twb2ludD86IGJvb2xlYW47XG4gICAgICAgICAgZG9uZUNoZWNrcG9pbnQ/OiBib29sZWFuO1xuICAgICAgICAgIGludm9rZURldldpdGg/OiBzdHJpbmc7XG4gICAgICAgICAgZGVwZW5kc09uOiBzdHJpbmdbXTtcbiAgICAgICAgfSxcbiAgICAgICkgPT5cbiAgICAgICAgZW1pdCgoKSA9PlxuICAgICAgICAgIGl0ZW1DcmVhdGVDb21tYW5kKGNsaWVudEZyb20ob3B0cyksIHtcbiAgICAgICAgICAgIGZlYXR1cmVJZDogb3B0cy5mZWF0dXJlLFxuICAgICAgICAgICAgZXh0ZXJuYWxLZXk6IG9wdHMua2V5LFxuICAgICAgICAgICAgdGl0bGU6IG9wdHMudGl0bGUsXG4gICAgICAgICAgICAuLi4ob3B0cy5raW5kICE9PSB1bmRlZmluZWQgPyB7IGtpbmQ6IG9wdHMua2luZCB9IDoge30pLFxuICAgICAgICAgICAgLi4uKG9wdHMuc3BlY0NoZWNrcG9pbnQgPT09IHRydWUgPyB7IHNwZWNDaGVja3BvaW50OiB0cnVlIH0gOiB7fSksXG4gICAgICAgICAgICAuLi4ob3B0cy5kb25lQ2hlY2twb2ludCA9PT0gdHJ1ZSA/IHsgZG9uZUNoZWNrcG9pbnQ6IHRydWUgfSA6IHt9KSxcbiAgICAgICAgICAgIC4uLihvcHRzLmludm9rZURldldpdGggIT09IHVuZGVmaW5lZCA/IHsgaW52b2tlRGV2V2l0aDogb3B0cy5pbnZva2VEZXZXaXRoIH0gOiB7fSksXG4gICAgICAgICAgICAuLi4ob3B0cy5kZXBlbmRzT24ubGVuZ3RoID4gMCA/IHsgZGVwZW5kc09uOiBvcHRzLmRlcGVuZHNPbiB9IDoge30pLFxuICAgICAgICAgIH0pLFxuICAgICAgICApLFxuICAgICk7XG5cbiAgd2l0aENsaWVudEZsYWdzKHByb2dyYW0uY29tbWFuZCgnZG9jbGludCA8ZmlsZT4nKSlcbiAgICAuZGVzY3JpcHRpb24oJ2RldGVybWluaXN0aWMgZG9jdW1lbnQgbGludCAobm8gTExNKTsgLS1zdWJtaXQgc2VuZHMgZG9jX2xpbnQgZXZpZGVuY2U7IGV4aXQgMSB3aGVuIG5vdCBzY2hlbWEtdmFsaWQnKVxuICAgIC5vcHRpb24oJy0tcmVxdWlyZS1zZWN0aW9uIDxuYW1lPicsICdyZXF1aXJlZCAjIyBzZWN0aW9uIChyZXBlYXRhYmxlKScsIGNvbGxlY3QsIFtdKVxuICAgIC5vcHRpb24oJy0td29yay1pdGVtIDx3b3JrSXRlbUlkPicsICd3b3JrIGl0ZW0gdG8gc3VibWl0IGRvY19saW50IGV2aWRlbmNlIG9uJylcbiAgICAub3B0aW9uKCctLXN1Ym1pdCcsICdzdWJtaXQge3NjaGVtYVZhbGlkLCBmaW5kaW5nc30gYXMgZG9jX2xpbnQgZXZpZGVuY2UgdmlhIHRoZSByYWlscycpXG4gICAgLm9wdGlvbignLS1mZW5jaW5nLXRva2VuIDxuPicsICdmZW5jaW5nIHRva2VuIHdoZW4gYWN0aW5nIHVuZGVyIGEgY2xhaW0nLCAodjogc3RyaW5nKSA9PiBOdW1iZXIodikpXG4gICAgLmFjdGlvbihcbiAgICAgIGFzeW5jIChcbiAgICAgICAgZmlsZTogc3RyaW5nLFxuICAgICAgICBvcHRzOiBDbGllbnRGbGFncyAmIHtcbiAgICAgICAgICByZXF1aXJlU2VjdGlvbjogc3RyaW5nW107XG4gICAgICAgICAgd29ya0l0ZW0/OiBzdHJpbmc7XG4gICAgICAgICAgc3VibWl0PzogYm9vbGVhbjtcbiAgICAgICAgICBmZW5jaW5nVG9rZW4/OiBudW1iZXI7XG4gICAgICAgIH0sXG4gICAgICApID0+IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAvLyBUaGUgbGludCBpdHNlbGYgbmVlZHMgbm8gc2VydmVyOyBhIGNsaWVudCBleGlzdHMgb25seSBmb3IgLS1zdWJtaXQuXG4gICAgICAgICAgY29uc3QgY2xpZW50ID0gb3B0cy5zdWJtaXQgPT09IHRydWUgPyBjbGllbnRGcm9tKG9wdHMpIDogbnVsbDtcbiAgICAgICAgICBjb25zdCB7IHRleHQsIGV4aXRDb2RlIH0gPSBhd2FpdCBkb2NsaW50Q29tbWFuZChjbGllbnQsIHtcbiAgICAgICAgICAgIHBhdGg6IGZpbGUsXG4gICAgICAgICAgICAuLi4ob3B0cy5yZXF1aXJlU2VjdGlvbi5sZW5ndGggPiAwID8geyByZXF1aXJlU2VjdGlvbnM6IG9wdHMucmVxdWlyZVNlY3Rpb24gfSA6IHt9KSxcbiAgICAgICAgICAgIC4uLihvcHRzLndvcmtJdGVtICE9PSB1bmRlZmluZWQgPyB7IHdvcmtJdGVtSWQ6IG9wdHMud29ya0l0ZW0gfSA6IHt9KSxcbiAgICAgICAgICAgIC4uLihvcHRzLnN1Ym1pdCA9PT0gdHJ1ZSA/IHsgc3VibWl0OiB0cnVlIH0gOiB7fSksXG4gICAgICAgICAgICAuLi4ob3B0cy5mZW5jaW5nVG9rZW4gIT09IHVuZGVmaW5lZCA/IHsgZmVuY2luZ1Rva2VuOiBvcHRzLmZlbmNpbmdUb2tlbiB9IDoge30pLFxuICAgICAgICAgIH0pO1xuICAgICAgICAgIHByb2Nlc3Muc3Rkb3V0LndyaXRlKGAke3RleHR9XFxuYCk7XG4gICAgICAgICAgcHJvY2Vzcy5leGl0Q29kZSA9IGV4aXRDb2RlO1xuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgIGNvbnN0IGVyciA9IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvciA6IG5ldyBFcnJvcihTdHJpbmcoZXJyb3IpKTtcbiAgICAgICAgICBwcm9jZXNzLnN0ZGVyci53cml0ZShgJHtlcnIubmFtZX06ICR7ZXJyLm1lc3NhZ2V9XFxuYCk7XG4gICAgICAgICAgcHJvY2Vzcy5leGl0Q29kZSA9IDE7XG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgKTtcblxuICB3aXRoQ2xpZW50RmxhZ3MocHJvZ3JhbS5jb21tYW5kKCdncmFudCA8YWN0b3JJZD4gPHBlcm1pc3Npb24+JykpXG4gICAgLmRlc2NyaXB0aW9uKCdncmFudCBhIHBlcm1pc3Npb24gdG8gYW4gYWN0b3IgKGFkbWluIG9ubHkpJylcbiAgICAuYWN0aW9uKGFzeW5jIChhY3RvcklkOiBzdHJpbmcsIHBlcm1pc3Npb246IHN0cmluZywgb3B0czogQ2xpZW50RmxhZ3MpID0+XG4gICAgICBlbWl0KCgpID0+IGdyYW50Q29tbWFuZChjbGllbnRGcm9tKG9wdHMpLCB7IGFjdG9ySWQsIHBlcm1pc3Npb24gfSkpLFxuICAgICk7XG5cbiAgLy8gLS0gZW50aXRsZW1lbnRzIChQaGFzZSAyLCByb2FkbWFwIFx1MDBBNzMpIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICBjb25zdCByb2xlID0gcHJvZ3JhbS5jb21tYW5kKCdyb2xlJykuZGVzY3JpcHRpb24oJ2RlbGl2ZXJ5IHJvbGVzIFx1MjAxNCBwZXJtaXNzaW9uIGJ1bmRsZXMgKHJvYWRtYXAgXHUwMEE3MyknKTtcbiAgd2l0aENsaWVudEZsYWdzKHJvbGUuY29tbWFuZCgnYXNzaWduIDxhY3RvcklkPiA8cm9sZUNvZGU+JykpXG4gICAgLmRlc2NyaXB0aW9uKCdhc3NpZ24gYSBkZWxpdmVyeSByb2xlIHRvIGFuIGFjdG9yIChnb3Zlcm5hbmNlLWFkbWluIG9ubHksIGVuZ2luZS1nYXRlZCknKVxuICAgIC5hY3Rpb24oYXN5bmMgKGFjdG9ySWQ6IHN0cmluZywgcm9sZUNvZGU6IHN0cmluZywgb3B0czogQ2xpZW50RmxhZ3MpID0+XG4gICAgICBlbWl0KCgpID0+IHJvbGVBc3NpZ25Db21tYW5kKGNsaWVudEZyb20ob3B0cyksIHsgYWN0b3JJZCwgcm9sZUNvZGUgfSkpLFxuICAgICk7XG4gIHdpdGhDbGllbnRGbGFncyhyb2xlLmNvbW1hbmQoJ3Jldm9rZSA8YWN0b3JJZD4gPHJvbGVDb2RlPicpKVxuICAgIC5kZXNjcmlwdGlvbigncmV2b2tlIGEgZGVsaXZlcnkgcm9sZSBmcm9tIGFuIGFjdG9yIChnb3Zlcm5hbmNlLWFkbWluIG9ubHksIGVuZ2luZS1nYXRlZCknKVxuICAgIC5hY3Rpb24oYXN5bmMgKGFjdG9ySWQ6IHN0cmluZywgcm9sZUNvZGU6IHN0cmluZywgb3B0czogQ2xpZW50RmxhZ3MpID0+XG4gICAgICBlbWl0KCgpID0+IHJvbGVSZXZva2VDb21tYW5kKGNsaWVudEZyb20ob3B0cyksIHsgYWN0b3JJZCwgcm9sZUNvZGUgfSkpLFxuICAgICk7XG4gIHdpdGhDbGllbnRGbGFncyhyb2xlLmNvbW1hbmQoJ2xpc3QgW2FjdG9ySWRdJykpXG4gICAgLmRlc2NyaXB0aW9uKCdsaXN0IGRlbGl2ZXJ5LXJvbGUgYXNzaWdubWVudHMgKGFsbCwgb3Igb25lIGFjdG9yKScpXG4gICAgLmFjdGlvbihhc3luYyAoYWN0b3JJZDogc3RyaW5nIHwgdW5kZWZpbmVkLCBvcHRzOiBDbGllbnRGbGFncykgPT5cbiAgICAgIGVtaXQoKCkgPT4gcm9sZUxpc3RDb21tYW5kKGNsaWVudEZyb20ob3B0cyksIGFjdG9ySWQgIT09IHVuZGVmaW5lZCA/IHsgYWN0b3JJZCB9IDoge30pKSxcbiAgICApO1xuXG4gIGNvbnN0IHBsYW4gPSBwcm9ncmFtLmNvbW1hbmQoJ3BsYW4nKS5kZXNjcmlwdGlvbignd29ya3NwYWNlIHBsYW4gXHUyMDE0IGEgY2VpbGluZywgbmV2ZXIgYSBncmFudCAocm9hZG1hcCBcdTAwQTczKScpO1xuICB3aXRoQ2xpZW50RmxhZ3MocGxhbi5jb21tYW5kKCdzZXQgPHBsYW4+JykpXG4gICAgLmRlc2NyaXB0aW9uKCdzZXQgdGhlIHdvcmtzcGFjZSBwbGFuOiBmcmVlIHwgdGVhbSB8IGVudGVycHJpc2UgKGdvdmVybmFuY2UtYWRtaW4gb25seSknKVxuICAgIC5hY3Rpb24oYXN5bmMgKHBsYW5Db2RlOiBzdHJpbmcsIG9wdHM6IENsaWVudEZsYWdzKSA9PlxuICAgICAgZW1pdCgoKSA9PiBwbGFuU2V0Q29tbWFuZChjbGllbnRGcm9tKG9wdHMpLCB7IHBsYW46IHBsYW5Db2RlIH0pKSxcbiAgICApO1xuXG4gIGNvbnN0IHBvbGljeSA9IHByb2dyYW0uY29tbWFuZCgncG9saWN5JykuZGVzY3JpcHRpb24oJ3Jlc3RyaWN0LW9ubHkgd29ya3NwYWNlIHBvbGljeSAocm9hZG1hcCBcdTAwQTczKScpO1xuICB3aXRoQ2xpZW50RmxhZ3MocG9saWN5LmNvbW1hbmQoJ3NldCcpKVxuICAgIC5kZXNjcmlwdGlvbignc2V0IHJlc3RyaWN0LW9ubHkgcG9saWN5IGtleXMgKGdvdmVybmFuY2UtYWRtaW4gb25seSknKVxuICAgIC5vcHRpb24oJy0tYWdlbnQtZ2F0ZS1hcHByb3ZhbHMgPGJvb2w+JywgJ3RydWUgfCBmYWxzZSBcdTIwMTQgbWF5IGFnZW50cyBleGVyY2lzZSBnYXRlIGFwcHJvdmFscz8nKVxuICAgIC5vcHRpb24oJy0tYWdlbnQtc2VsZi1kaXNwYXRjaCA8Ym9vbD4nLCAndHJ1ZSB8IGZhbHNlIFx1MjAxNCBtYXkgYWdlbnRzIGNsYWltIHRhc2tzIG9uIHRoZWlyIG93bj8nKVxuICAgIC5hY3Rpb24oYXN5bmMgKG9wdHM6IENsaWVudEZsYWdzICYgeyBhZ2VudEdhdGVBcHByb3ZhbHM/OiBzdHJpbmc7IGFnZW50U2VsZkRpc3BhdGNoPzogc3RyaW5nIH0pID0+XG4gICAgICBlbWl0KCgpID0+XG4gICAgICAgIHBvbGljeVNldENvbW1hbmQoY2xpZW50RnJvbShvcHRzKSwge1xuICAgICAgICAgIC4uLihvcHRzLmFnZW50R2F0ZUFwcHJvdmFscyAhPT0gdW5kZWZpbmVkID8geyBhZ2VudEdhdGVBcHByb3ZhbHM6IG9wdHMuYWdlbnRHYXRlQXBwcm92YWxzIH0gOiB7fSksXG4gICAgICAgICAgLi4uKG9wdHMuYWdlbnRTZWxmRGlzcGF0Y2ggIT09IHVuZGVmaW5lZCA/IHsgYWdlbnRTZWxmRGlzcGF0Y2g6IG9wdHMuYWdlbnRTZWxmRGlzcGF0Y2ggfSA6IHt9KSxcbiAgICAgICAgfSksXG4gICAgICApLFxuICAgICk7XG5cbiAgY29uc3QgZ2F0ZVBvbGljeSA9IHByb2dyYW0uY29tbWFuZCgnZ2F0ZS1wb2xpY3knKS5kZXNjcmlwdGlvbignZ2F0ZSBkZWZpbml0aW9ucyBhcyBkYXRhIChyb2FkbWFwIFx1MDBBNzMpJyk7XG4gIHdpdGhDbGllbnRGbGFncyhnYXRlUG9saWN5LmNvbW1hbmQoJ3NldCA8Z2F0ZT4nKSlcbiAgICAuZGVzY3JpcHRpb24oJ3NldCBxdW9ydW0vYWN0b3ItdHlwZSByZXF1aXJlbWVudHMgb2YgYSBnYXRlIChnb3Zlcm5hbmNlLWFkbWluIG9ubHkpJylcbiAgICAub3B0aW9uKCctLW1pbi1hcHByb3ZhbHMgPG4+JywgJ2Rpc3RpbmN0IGFwcHJvdmVycyByZXF1aXJlZCBwZXIgcmV2aWV3IHJvdW5kJylcbiAgICAub3B0aW9uKCctLXJlcXVpcmUtdHlwZSA8dHlwZT4nLCAncmVxdWlyZSBhdCBsZWFzdCBvbmUgYXBwcm92ZXIgb2YgdGhpcyB0eXBlIChyZXBlYXRhYmxlKScsIGNvbGxlY3QsIFtdKVxuICAgIC5hY3Rpb24oYXN5bmMgKGdhdGU6IHN0cmluZywgb3B0czogQ2xpZW50RmxhZ3MgJiB7IG1pbkFwcHJvdmFscz86IHN0cmluZzsgcmVxdWlyZVR5cGU6IHN0cmluZ1tdIH0pID0+XG4gICAgICBlbWl0KCgpID0+XG4gICAgICAgIGdhdGVQb2xpY3lTZXRDb21tYW5kKGNsaWVudEZyb20ob3B0cyksIHtcbiAgICAgICAgICBnYXRlLFxuICAgICAgICAgIC4uLihvcHRzLm1pbkFwcHJvdmFscyAhPT0gdW5kZWZpbmVkID8geyBtaW5BcHByb3ZhbHM6IG9wdHMubWluQXBwcm92YWxzIH0gOiB7fSksXG4gICAgICAgICAgLi4uKG9wdHMucmVxdWlyZVR5cGUubGVuZ3RoID4gMCA/IHsgcmVxdWlyZVR5cGVzOiBvcHRzLnJlcXVpcmVUeXBlIH0gOiB7fSksXG4gICAgICAgIH0pLFxuICAgICAgKSxcbiAgICApO1xuXG4gIGNvbnN0IGdvdmVybmFuY2UgPSBwcm9ncmFtLmNvbW1hbmQoJ2dvdmVybmFuY2UnKS5kZXNjcmlwdGlvbignZ292ZXJuYW5jZSByb2xlcyAocm9hZG1hcCBcdTAwQTczKScpO1xuICB3aXRoQ2xpZW50RmxhZ3MoZ292ZXJuYW5jZS5jb21tYW5kKCdzZXQgPGFjdG9ySWQ+IDxyb2xlPicpKVxuICAgIC5kZXNjcmlwdGlvbignc2V0IGFuIGFjdG9yIGdvdmVybmFuY2Ugcm9sZTogYWRtaW4gfCBtZW1iZXIgfCBhdWRpdG9yIChnb3Zlcm5hbmNlLWFkbWluIG9ubHkpJylcbiAgICAuYWN0aW9uKGFzeW5jIChhY3RvcklkOiBzdHJpbmcsIHJvbGVDb2RlOiBzdHJpbmcsIG9wdHM6IENsaWVudEZsYWdzKSA9PlxuICAgICAgZW1pdCgoKSA9PiBnb3Zlcm5hbmNlU2V0Q29tbWFuZChjbGllbnRGcm9tKG9wdHMpLCB7IGFjdG9ySWQsIHJvbGU6IHJvbGVDb2RlIH0pKSxcbiAgICApO1xuXG4gIHdpdGhDbGllbnRGbGFncyhwcm9ncmFtLmNvbW1hbmQoJ2F1dGh6IDxhY3RvcklkPiA8cGVybWlzc2lvbj4nKSlcbiAgICAuZGVzY3JpcHRpb24oJ3ByaW50IHRoZSByZXBsYXlhYmxlIGF1dGh6IGRlY2lzaW9uIHRyYWNlIGZvciBhbiBhY3RvciBcdTAwRDcgcGVybWlzc2lvbiAocm9hZG1hcCBcdTAwQTczKScpXG4gICAgLmFjdGlvbihhc3luYyAoYWN0b3JJZDogc3RyaW5nLCBwZXJtaXNzaW9uOiBzdHJpbmcsIG9wdHM6IENsaWVudEZsYWdzKSA9PlxuICAgICAgZW1pdCgoKSA9PiBhdXRoekNvbW1hbmQoY2xpZW50RnJvbShvcHRzKSwgeyBhY3RvcklkLCBwZXJtaXNzaW9uIH0pKSxcbiAgICApO1xuXG4gIGNvbnN0IGZlYXR1cmUgPSBwcm9ncmFtLmNvbW1hbmQoJ2ZlYXR1cmUnKS5kZXNjcmlwdGlvbignZmVhdHVyZSBtYW5hZ2VtZW50Jyk7XG4gIHdpdGhDbGllbnRGbGFncyhmZWF0dXJlLmNvbW1hbmQoJ2NyZWF0ZScpKVxuICAgIC5kZXNjcmlwdGlvbignY3JlYXRlIGEgZmVhdHVyZTsgcHJpbnRzIGZlYXR1cmVJZCcpXG4gICAgLmFjdGlvbihhc3luYyAob3B0czogQ2xpZW50RmxhZ3MpID0+IGVtaXQoKCkgPT4gZmVhdHVyZUNyZWF0ZUNvbW1hbmQoY2xpZW50RnJvbShvcHRzKSkpKTtcblxuICB3aXRoQ2xpZW50RmxhZ3MocHJvZ3JhbS5jb21tYW5kKCdpbXBvcnQgPGZlYXR1cmVJZD4gPHN0b3JpZXNZYW1sUGF0aD4nKSlcbiAgICAuZGVzY3JpcHRpb24oJ2ltcG9ydCBhIHN0b3JpZXMueWFtbCBmaWxlIGludG8gYSBmZWF0dXJlIChpZGVtcG90ZW50KScpXG4gICAgLmFjdGlvbihhc3luYyAoZmVhdHVyZUlkOiBzdHJpbmcsIHN0b3JpZXNZYW1sUGF0aDogc3RyaW5nLCBvcHRzOiBDbGllbnRGbGFncykgPT5cbiAgICAgIGVtaXQoKCkgPT4gaW1wb3J0U3Rvcmllc0NvbW1hbmQoY2xpZW50RnJvbShvcHRzKSwgeyBmZWF0dXJlSWQsIHBhdGg6IHN0b3JpZXNZYW1sUGF0aCB9KSksXG4gICAgKTtcblxuICAvLyAtLSBjb2xsYWJvcmF0aW9uIChQaGFzZSAzLCByb2FkbWFwIFx1MDBBNzUpIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICBjb25zdCB0aHJlYWQgPSBwcm9ncmFtLmNvbW1hbmQoJ3RocmVhZCcpLmRlc2NyaXB0aW9uKCdjb252ZXJzYXRpb24gdGhyZWFkcyAoUGhhc2UgMywgcm9hZG1hcCBcdTAwQTc1KScpO1xuICB3aXRoQ2xpZW50RmxhZ3ModGhyZWFkLmNvbW1hbmQoJ2NyZWF0ZScpKVxuICAgIC5kZXNjcmlwdGlvbignY3JlYXRlIGEgdGhyZWFkLCBvcHRpb25hbGx5IGJvdW5kIHRvIGEgZmVhdHVyZS93b3JrIGl0ZW0nKVxuICAgIC5yZXF1aXJlZE9wdGlvbignLS1raW5kIDxraW5kPicsICdzcGVjIHwgZGVzaWduIHwgdGFzayB8IGdlbmVyYWwgfCBwcml2YXRlJylcbiAgICAub3B0aW9uKCctLWZlYXR1cmUgPGZlYXR1cmVJZD4nLCAnYmluZCB0byBhIGZlYXR1cmUnKVxuICAgIC5vcHRpb24oJy0td29yay1pdGVtIDx3b3JrSXRlbUlkPicsICdiaW5kIHRvIGEgd29yayBpdGVtIChpZCBvciBleHRlcm5hbEtleSknKVxuICAgIC5vcHRpb24oJy0tdmlzaWJpbGl0eSA8dmlzaWJpbGl0eT4nLCAnb3BlbiB8IHByaXZhdGUnKVxuICAgIC5hY3Rpb24oXG4gICAgICBhc3luYyAoXG4gICAgICAgIG9wdHM6IENsaWVudEZsYWdzICYgeyBraW5kOiBzdHJpbmc7IGZlYXR1cmU/OiBzdHJpbmc7IHdvcmtJdGVtPzogc3RyaW5nOyB2aXNpYmlsaXR5Pzogc3RyaW5nIH0sXG4gICAgICApID0+XG4gICAgICAgIGVtaXQoKCkgPT5cbiAgICAgICAgICB0aHJlYWRDcmVhdGVDb21tYW5kKGNsaWVudEZyb20ob3B0cyksIHtcbiAgICAgICAgICAgIGtpbmQ6IG9wdHMua2luZCxcbiAgICAgICAgICAgIC4uLihvcHRzLmZlYXR1cmUgIT09IHVuZGVmaW5lZCA/IHsgZmVhdHVyZUlkOiBvcHRzLmZlYXR1cmUgfSA6IHt9KSxcbiAgICAgICAgICAgIC4uLihvcHRzLndvcmtJdGVtICE9PSB1bmRlZmluZWQgPyB7IHdvcmtJdGVtSWQ6IG9wdHMud29ya0l0ZW0gfSA6IHt9KSxcbiAgICAgICAgICAgIC4uLihvcHRzLnZpc2liaWxpdHkgIT09IHVuZGVmaW5lZCA/IHsgdmlzaWJpbGl0eTogb3B0cy52aXNpYmlsaXR5IH0gOiB7fSksXG4gICAgICAgICAgfSksXG4gICAgICAgICksXG4gICAgKTtcbiAgd2l0aENsaWVudEZsYWdzKHRocmVhZC5jb21tYW5kKCdsaXN0JykpXG4gICAgLmRlc2NyaXB0aW9uKCdsaXN0IHRocmVhZHMgKHByaXZhdGUgb25lcyBvbmx5IHdoZW4geW91IHBhcnRpY2lwYXRlKScpXG4gICAgLm9wdGlvbignLS1mZWF0dXJlIDxmZWF0dXJlSWQ+JywgJ2ZpbHRlciBieSBmZWF0dXJlJylcbiAgICAub3B0aW9uKCctLXdvcmstaXRlbSA8d29ya0l0ZW1JZD4nLCAnZmlsdGVyIGJ5IHdvcmsgaXRlbScpXG4gICAgLmFjdGlvbihhc3luYyAob3B0czogQ2xpZW50RmxhZ3MgJiB7IGZlYXR1cmU/OiBzdHJpbmc7IHdvcmtJdGVtPzogc3RyaW5nIH0pID0+XG4gICAgICBlbWl0KCgpID0+XG4gICAgICAgIHRocmVhZExpc3RDb21tYW5kKGNsaWVudEZyb20ob3B0cyksIHtcbiAgICAgICAgICAuLi4ob3B0cy5mZWF0dXJlICE9PSB1bmRlZmluZWQgPyB7IGZlYXR1cmVJZDogb3B0cy5mZWF0dXJlIH0gOiB7fSksXG4gICAgICAgICAgLi4uKG9wdHMud29ya0l0ZW0gIT09IHVuZGVmaW5lZCA/IHsgd29ya0l0ZW1JZDogb3B0cy53b3JrSXRlbSB9IDoge30pLFxuICAgICAgICB9KSxcbiAgICAgICksXG4gICAgKTtcblxuICB3aXRoQ2xpZW50RmxhZ3MocHJvZ3JhbS5jb21tYW5kKCdwb3N0IDx0aHJlYWRJZD4gPGJvZHk+JykpXG4gICAgLmRlc2NyaXB0aW9uKCdwb3N0IGEgbWVzc2FnZTsgLS1tZW50aW9uIHRha2VzIFNUUlVDVFVSRUQgYWN0b3IgaWRzIChib2R5IHRleHQgaXMgbmV2ZXIgcGFyc2VkKScpXG4gICAgLm9wdGlvbignLS1tZW50aW9uIDxhY3RvcklkPicsICdtZW50aW9uIGFuIGFjdG9yIGJ5IGlkIChyZXBlYXRhYmxlKScsIGNvbGxlY3QsIFtdKVxuICAgIC5vcHRpb24oJy0tcmVwbHktdG8gPG1lc3NhZ2VJZD4nLCAncmVwbHkgdG8gYSBtZXNzYWdlJylcbiAgICAuYWN0aW9uKFxuICAgICAgYXN5bmMgKHRocmVhZElkOiBzdHJpbmcsIGJvZHk6IHN0cmluZywgb3B0czogQ2xpZW50RmxhZ3MgJiB7IG1lbnRpb246IHN0cmluZ1tdOyByZXBseVRvPzogc3RyaW5nIH0pID0+XG4gICAgICAgIGVtaXQoKCkgPT5cbiAgICAgICAgICBwb3N0Q29tbWFuZChjbGllbnRGcm9tKG9wdHMpLCB7XG4gICAgICAgICAgICB0aHJlYWRJZCxcbiAgICAgICAgICAgIGJvZHksXG4gICAgICAgICAgICAuLi4ob3B0cy5tZW50aW9uLmxlbmd0aCA+IDAgPyB7IG1lbnRpb25zOiBvcHRzLm1lbnRpb24gfSA6IHt9KSxcbiAgICAgICAgICAgIC4uLihvcHRzLnJlcGx5VG8gIT09IHVuZGVmaW5lZCA/IHsgcmVwbHlUbzogb3B0cy5yZXBseVRvIH0gOiB7fSksXG4gICAgICAgICAgfSksXG4gICAgICAgICksXG4gICAgKTtcblxuICB3aXRoQ2xpZW50RmxhZ3MocHJvZ3JhbS5jb21tYW5kKCdtZXNzYWdlcyA8dGhyZWFkSWQ+JykpXG4gICAgLmRlc2NyaXB0aW9uKCdsaXN0IG1lc3NhZ2VzIG9mIGEgdGhyZWFkIChyYXcgYXV0aG9ySWQ7IHN5c3RlbSBuYXJyYXRpb24gaW5jbHVkZWQpJylcbiAgICAub3B0aW9uKCctLXNpbmNlIDxzZXE+JywgJ29ubHkgbWVzc2FnZXMgd2l0aCBzZXEgZ3JlYXRlciB0aGFuIHRoaXMnLCAodjogc3RyaW5nKSA9PiBOdW1iZXIodikpXG4gICAgLmFjdGlvbihhc3luYyAodGhyZWFkSWQ6IHN0cmluZywgb3B0czogQ2xpZW50RmxhZ3MgJiB7IHNpbmNlPzogbnVtYmVyIH0pID0+XG4gICAgICBlbWl0KCgpID0+XG4gICAgICAgIG1lc3NhZ2VzQ29tbWFuZChjbGllbnRGcm9tKG9wdHMpLCB7XG4gICAgICAgICAgdGhyZWFkSWQsXG4gICAgICAgICAgLi4uKG9wdHMuc2luY2UgIT09IHVuZGVmaW5lZCA/IHsgc2luY2VTZXE6IG9wdHMuc2luY2UgfSA6IHt9KSxcbiAgICAgICAgfSksXG4gICAgICApLFxuICAgICk7XG5cbiAgd2l0aENsaWVudEZsYWdzKHByb2dyYW0uY29tbWFuZCgnbm90aWZpY2F0aW9ucycpKVxuICAgIC5kZXNjcmlwdGlvbigneW91ciBvd24gbm90aWZpY2F0aW9ucyAobWVudGlvbnMgKyBhZ2VudC1qb2IgY29tcGxldGlvbnMpJylcbiAgICAub3B0aW9uKCctLXVucmVhZCcsICdvbmx5IHVucmVhZCBub3RpZmljYXRpb25zJylcbiAgICAuYWN0aW9uKGFzeW5jIChvcHRzOiBDbGllbnRGbGFncyAmIHsgdW5yZWFkPzogYm9vbGVhbiB9KSA9PlxuICAgICAgZW1pdCgoKSA9PlxuICAgICAgICBub3RpZmljYXRpb25zQ29tbWFuZChjbGllbnRGcm9tKG9wdHMpLCBvcHRzLnVucmVhZCA9PT0gdHJ1ZSA/IHsgdW5yZWFkT25seTogdHJ1ZSB9IDoge30pLFxuICAgICAgKSxcbiAgICApO1xuXG4gIGNvbnN0IGpvYiA9IHByb2dyYW0uY29tbWFuZCgnam9iJykuZGVzY3JpcHRpb24oJ3JvdXRlci1tYXRlcmlhbGl6ZWQgYWdlbnQgam9icyAocmVwbHktb25seSwgXHUwMEE3NS40KScpO1xuICB3aXRoQ2xpZW50RmxhZ3MocHJvZ3JhbS5jb21tYW5kKCdqb2JzJykpXG4gICAgLmRlc2NyaXB0aW9uKCdsaXN0IGFnZW50IGpvYnMnKVxuICAgIC5vcHRpb24oJy0tYWdlbnQgPGFjdG9ySWQ+JywgJ2ZpbHRlciBieSBhZ2VudCBhY3RvcicpXG4gICAgLm9wdGlvbignLS1zdGF0dXMgPHN0YXR1cz4nLCAncXVldWVkIHwgZG9uZSB8IGJsb2NrZWQnKVxuICAgIC5hY3Rpb24oYXN5bmMgKG9wdHM6IENsaWVudEZsYWdzICYgeyBhZ2VudD86IHN0cmluZzsgc3RhdHVzPzogc3RyaW5nIH0pID0+XG4gICAgICBlbWl0KCgpID0+XG4gICAgICAgIGpvYnNDb21tYW5kKGNsaWVudEZyb20ob3B0cyksIHtcbiAgICAgICAgICAuLi4ob3B0cy5hZ2VudCAhPT0gdW5kZWZpbmVkID8geyBhZ2VudEFjdG9ySWQ6IG9wdHMuYWdlbnQgfSA6IHt9KSxcbiAgICAgICAgICAuLi4ob3B0cy5zdGF0dXMgIT09IHVuZGVmaW5lZCA/IHsgc3RhdHVzOiBvcHRzLnN0YXR1cyB9IDoge30pLFxuICAgICAgICB9KSxcbiAgICAgICksXG4gICAgKTtcbiAgd2l0aENsaWVudEZsYWdzKGpvYi5jb21tYW5kKCdkb25lIDxqb2JJZD4nKSlcbiAgICAuZGVzY3JpcHRpb24oJ2NvbXBsZXRlIGEgam9iIGFzIGl0cyBhZ2VudCAobm90aWZpZXMgdGhlIG1lbnRpb25lciBcdTIwMTQgbm90aGluZyBlbHNlIG1vdmVzKScpXG4gICAgLm9wdGlvbignLS1ub3RlIDxub3RlPicsICdjb21wbGV0aW9uIG5vdGUnKVxuICAgIC5hY3Rpb24oYXN5bmMgKGpvYklkOiBzdHJpbmcsIG9wdHM6IENsaWVudEZsYWdzICYgeyBub3RlPzogc3RyaW5nIH0pID0+XG4gICAgICBlbWl0KCgpID0+XG4gICAgICAgIGpvYkNvbXBsZXRlQ29tbWFuZChjbGllbnRGcm9tKG9wdHMpLCB7XG4gICAgICAgICAgam9iSWQsXG4gICAgICAgICAgc3RhdHVzOiAnZG9uZScsXG4gICAgICAgICAgLi4uKG9wdHMubm90ZSAhPT0gdW5kZWZpbmVkID8geyBub3RlOiBvcHRzLm5vdGUgfSA6IHt9KSxcbiAgICAgICAgfSksXG4gICAgICApLFxuICAgICk7XG5cbiAgLy8gLS0gYWR2aXNvciBib3RzIChyZWFkICsgcG9zdCBvbmx5LCBkZXRlcm1pbmlzdGljLCBubyBMTE0pIC0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIGNvbnN0IGFkdmlzZSA9IHByb2dyYW1cbiAgICAuY29tbWFuZCgnYWR2aXNlJylcbiAgICAuZGVzY3JpcHRpb24oJ2RldGVybWluaXN0aWMgYWR2aXNvciBib3RzIFx1MjAxNCByZWFkICsgcG9zdCBvbmx5LCBuZXZlciBhIGxpZmVjeWNsZSBtdXRhdGlvbicpO1xuICB3aXRoQ2xpZW50RmxhZ3MoYWR2aXNlLmNvbW1hbmQoJ25leHQtdGFzaycpKVxuICAgIC5kZXNjcmlwdGlvbigncG9zdCB0aGUgc3VnZ2VzdGVkIGNsYWltIG9yZGVyIChjbGFpbWFibGUgcmVhZHlfZm9yX2RldikgaW50byBhIHRocmVhZCcpXG4gICAgLnJlcXVpcmVkT3B0aW9uKCctLXRocmVhZCA8dGhyZWFkSWQ+JywgJ3RocmVhZCB0byBwb3N0IHRoZSBhZHZpY2UgaW50bycpXG4gICAgLmFjdGlvbihhc3luYyAob3B0czogQ2xpZW50RmxhZ3MgJiB7IHRocmVhZDogc3RyaW5nIH0pID0+XG4gICAgICBlbWl0KCgpID0+IGFkdmlzZU5leHRUYXNrQ29tbWFuZChjbGllbnRGcm9tKG9wdHMpLCB7IHRocmVhZElkOiBvcHRzLnRocmVhZCB9KSksXG4gICAgKTtcbiAgd2l0aENsaWVudEZsYWdzKGFkdmlzZS5jb21tYW5kKCdyZWNvbmNpbGUnKSlcbiAgICAuZGVzY3JpcHRpb24oJ3Bvc3QgdGhlIGRldGVjdC1vbmx5IGZpbGVcdTIxOTREQiBkaXZlcmdlbmNlIHJlcG9ydCBpbnRvIGEgdGhyZWFkJylcbiAgICAucmVxdWlyZWRPcHRpb24oJy0tdGhyZWFkIDx0aHJlYWRJZD4nLCAndGhyZWFkIHRvIHBvc3QgdGhlIGFkdmljZSBpbnRvJylcbiAgICAucmVxdWlyZWRPcHRpb24oJy0tZmlsZSA8cGFpcj4nLCAnb25lIDx3b3JrSXRlbUlkPj08ZnJvbnRtYXR0ZXJTdGF0dXM+IHBhaXIgKHJlcGVhdGFibGUpJywgY29sbGVjdCwgW10pXG4gICAgLmFjdGlvbihhc3luYyAob3B0czogQ2xpZW50RmxhZ3MgJiB7IHRocmVhZDogc3RyaW5nOyBmaWxlOiBzdHJpbmdbXSB9KSA9PlxuICAgICAgZW1pdCgoKSA9PlxuICAgICAgICBhZHZpc2VSZWNvbmNpbGVDb21tYW5kKGNsaWVudEZyb20ob3B0cyksIHsgdGhyZWFkSWQ6IG9wdHMudGhyZWFkLCBmaWxlczogb3B0cy5maWxlIH0pLFxuICAgICAgKSxcbiAgICApO1xuXG4gIC8vIC0tIFBoYXNlIDUgKHJvYWRtYXAgXHUwMEE3Nik6IGxlYXJuaW5nIHRlYW1tYXRlcyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICB3aXRoQ2xpZW50RmxhZ3MocHJvZ3JhbS5jb21tYW5kKCdtZW1vcnknKSlcbiAgICAuZGVzY3JpcHRpb24oJ3lvdXIgT1dOIGFnZW50IG1lbW9yaWVzIChvd25lci1zY29wZWQgYnkgY29uc3RydWN0aW9uIFx1MjAxNCBubyBjcm9zcy1hY3RvciBwYXJhbWV0ZXIgZXhpc3RzKScpXG4gICAgLm9wdGlvbignLS1raW5kIDxraW5kPicsICdlcGlzb2RpYyB8IHByb2NlZHVyYWwgfCBlbnRpdHknKVxuICAgIC5vcHRpb24oJy0tcXVlcnkgPHRleHQ+JywgJ2Nhc2UtaW5zZW5zaXRpdmUgc3Vic3RyaW5nIGZpbHRlcicpXG4gICAgLm9wdGlvbignLS1jb250ZXh0IDx0aHJlYWRJZD4nLCAncmVjYWxsIGNvbnRleHQgdGhyZWFkIChnYXRlcyBwcml2YXRlLXNvdXJjZWQgbWVtb3JpZXMsIFx1MDBBNzYpJylcbiAgICAuYWN0aW9uKGFzeW5jIChvcHRzOiBDbGllbnRGbGFncyAmIHsga2luZD86IHN0cmluZzsgcXVlcnk/OiBzdHJpbmc7IGNvbnRleHQ/OiBzdHJpbmcgfSkgPT5cbiAgICAgIGVtaXQoKCkgPT5cbiAgICAgICAgbWVtb3J5Q29tbWFuZChjbGllbnRGcm9tKG9wdHMpLCB7XG4gICAgICAgICAgLi4uKG9wdHMua2luZCAhPT0gdW5kZWZpbmVkID8geyBraW5kOiBvcHRzLmtpbmQgfSA6IHt9KSxcbiAgICAgICAgICAuLi4ob3B0cy5xdWVyeSAhPT0gdW5kZWZpbmVkID8geyBxdWVyeTogb3B0cy5xdWVyeSB9IDoge30pLFxuICAgICAgICAgIC4uLihvcHRzLmNvbnRleHQgIT09IHVuZGVmaW5lZCA/IHsgY29udGV4dFRocmVhZElkOiBvcHRzLmNvbnRleHQgfSA6IHt9KSxcbiAgICAgICAgfSksXG4gICAgICApLFxuICAgICk7XG5cbiAgY29uc3Qgc3RhdHMgPSBwcm9ncmFtLmNvbW1hbmQoJ3N0YXRzJykuZGVzY3JpcHRpb24oJ2RldGVybWluaXN0aWMgZGVsaXZlcnkgbWV0cmljcyAocm9hZG1hcCBcdTAwQTc2KScpO1xuICB3aXRoQ2xpZW50RmxhZ3Moc3RhdHMuY29tbWFuZCgncmV2aWV3cycpKVxuICAgIC5kZXNjcmlwdGlvbigncmV2aWV3LWxvb3AgY29udmVyZ2VuY2UgcGVyIGtpbmQgKyBwZXIgaXRlbSBcdTIwMTQgdGhlIGltcHJvdmUtd2Vlay1vdmVyLXdlZWsgbWVhc3VyaW5nIHN0aWNrJylcbiAgICAuYWN0aW9uKGFzeW5jIChvcHRzOiBDbGllbnRGbGFncykgPT4gZW1pdCgoKSA9PiBzdGF0c1Jldmlld3NDb21tYW5kKGNsaWVudEZyb20ob3B0cykpKSk7XG5cbiAgd2l0aENsaWVudEZsYWdzKHByb2dyYW0uY29tbWFuZCgnZXZlbnRzIFtzdHJlYW1JZF0nKSlcbiAgICAuZGVzY3JpcHRpb24oJ2F1ZGl0IHF1ZXJ5IG92ZXIgdGhlIGFwcGVuZC1vbmx5IGV2ZW50IGxvZycpXG4gICAgLmFjdGlvbihhc3luYyAoc3RyZWFtSWQ6IHN0cmluZyB8IHVuZGVmaW5lZCwgb3B0czogQ2xpZW50RmxhZ3MpID0+XG4gICAgICBlbWl0KCgpID0+XG4gICAgICAgIGV2ZW50c0NvbW1hbmQoY2xpZW50RnJvbShvcHRzKSwgc3RyZWFtSWQgIT09IHVuZGVmaW5lZCA/IHsgc3RyZWFtSWQgfSA6IHt9KSxcbiAgICAgICksXG4gICAgKTtcblxuICAvLyAtLSB3b3JrIChydW5uZXIgaGFuZG9mZjsgQG9haHMvcnVubmVyIGxhbmRzIHdpdGggc3RvcnkgMTQpIC0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgd2l0aENsaWVudEZsYWdzKHByb2dyYW0uY29tbWFuZCgnd29yaycpKVxuICAgIC5kZXNjcmlwdGlvbigncnVuIHRoZSBCWU8gd29ya2VyIGxvb3AgKGNvZGluZykgb3IgLS1qb2JzOiB0aGUgdGVhbW1hdGUgam9icyBsb29wIChyZXBseS1vbmx5LCByb2FkbWFwIFx1MDBBNzYpJylcbiAgICAub3B0aW9uKCctLWpvYnMnLCAnc2VydmUgcmVwbHktb25seSBhZ2VudCBqb2JzIGZvciBUSElTIHRva2VuXHUyMDE5cyBhZ2VudCAobWVudGlvbi1kaXNwYXRjaCwgemVybyBsaWZlY3ljbGUgYXV0aG9yaXR5KScpXG4gICAgLm9wdGlvbignLS1yZXBvIDxwYXRoPicsICd0YXJnZXQgcHJvamVjdCBnaXQgY2hlY2tvdXQgKGNvZGluZyBtb2RlKScpXG4gICAgLm9wdGlvbignLS1zcGVjLWZvbGRlciA8cmVsPicsICdzcGVjIGZvbGRlciByZWxhdGl2ZSB0byB0aGUgcmVwbyByb290IChjb2RpbmcgbW9kZSknKVxuICAgIC5yZXF1aXJlZE9wdGlvbihcbiAgICAgICctLWFnZW50LWNtZCA8dGVtcGxhdGU+JyxcbiAgICAgICdhZ2VudCBjb21tYW5kIHRlbXBsYXRlIChjb2Rpbmc6IHtTUEVDX0ZPTERFUn0ge1NUT1JZX0lEfSB7SU5WT0tFX1dJVEh9IHtXT1JLVFJFRX07IGpvYnM6IHtDT05URVhUX0ZJTEV9IHtSRVBMWV9GSUxFfSB7VEhSRUFEX0lEfSB7Sk9CX0lEfSknLFxuICAgIClcbiAgICAub3B0aW9uKCctLW9uY2UnLCAncnVuIGF0IG1vc3Qgb25lIGRpc3BhdGNoL2pvYiBjeWNsZSwgdGhlbiBleGl0JylcbiAgICAub3B0aW9uKCctLXBvbGwgPG1zPicsICdwb2xsIGludGVydmFsIGluIG1pbGxpc2Vjb25kcycpXG4gICAgLmFjdGlvbihcbiAgICAgIGFzeW5jIChcbiAgICAgICAgb3B0czogQ2xpZW50RmxhZ3MgJiB7XG4gICAgICAgICAgam9icz86IGJvb2xlYW47XG4gICAgICAgICAgcmVwbz86IHN0cmluZztcbiAgICAgICAgICBzcGVjRm9sZGVyPzogc3RyaW5nO1xuICAgICAgICAgIGFnZW50Q21kOiBzdHJpbmc7XG4gICAgICAgICAgb25jZT86IGJvb2xlYW47XG4gICAgICAgICAgcG9sbD86IHN0cmluZztcbiAgICAgICAgfSxcbiAgICAgICkgPT4ge1xuICAgICAgICB0cnkge1xuICAgICAgICAgIGNvbnN0IGNsaWVudCA9IGNsaWVudEZyb20ob3B0cyk7XG4gICAgICAgICAgLy8gTEFaWSBpbXBvcnQ6IHRoZSBydW5uZXIgaXMgYSBmaXhlZCBpbnRlcmZhY2UgdGhhdCBtYXkgc3RpbGwgYmUgYVxuICAgICAgICAgIC8vIHN0dWIgXHUyMDE0IHRoZSByZXN0IG9mIHRoZSBDTEkgbXVzdCBuZXZlciBwYXkgZm9yIChvciBicmVhayBvbikgaXQuXG4gICAgICAgICAgY29uc3QgcnVubmVyID0gYXdhaXQgaW1wb3J0KCdAb2Focy9ydW5uZXInKTtcbiAgICAgICAgICBpZiAob3B0cy5qb2JzID09PSB0cnVlKSB7XG4gICAgICAgICAgICAvLyBUaGUgc2VydmVkIGFnZW50IGlzIEFMV0FZUyB0aGUgYXV0aGVudGljYXRlZCB0b2tlbidzIGFjdG9yIFx1MjAxNFxuICAgICAgICAgICAgLy8gd2hvYW1pLCBuZXZlciBhIGZsYWcgKG93bmVyLXNjb3BpbmcgbWlycm9ycyB0aGUgbWVtb3J5IHJhaWxzKS5cbiAgICAgICAgICAgIGNvbnN0IG1lID0gYXdhaXQgY2xpZW50LmNhbGw8eyBhY3RvcklkOiBzdHJpbmcgfT4oJ3dob2FtaScpO1xuICAgICAgICAgICAgYXdhaXQgcnVubmVyLmpvYnNMb29wKHtcbiAgICAgICAgICAgICAgY2xpZW50LFxuICAgICAgICAgICAgICBhZ2VudEFjdG9ySWQ6IG1lLmFjdG9ySWQsXG4gICAgICAgICAgICAgIGFnZW50Q21kOiBvcHRzLmFnZW50Q21kLFxuICAgICAgICAgICAgICAuLi4ob3B0cy5wb2xsICE9PSB1bmRlZmluZWQgPyB7IHBvbGxNczogTnVtYmVyKG9wdHMucG9sbCkgfSA6IHt9KSxcbiAgICAgICAgICAgICAgLi4uKG9wdHMub25jZSA9PT0gdHJ1ZSA/IHsgb25jZTogdHJ1ZSB9IDoge30pLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChvcHRzLnJlcG8gPT09IHVuZGVmaW5lZCB8fCBvcHRzLnNwZWNGb2xkZXIgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdjb2RpbmcgbW9kZSByZXF1aXJlcyAtLXJlcG8gYW5kIC0tc3BlYy1mb2xkZXIgKG9yIHBhc3MgLS1qb2JzKScpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBhd2FpdCBydW5uZXIud29ya0xvb3Aoe1xuICAgICAgICAgICAgY2xpZW50LFxuICAgICAgICAgICAgcmVwb1BhdGg6IHJlc29sdmUob3B0cy5yZXBvKSxcbiAgICAgICAgICAgIHNwZWNGb2xkZXI6IG9wdHMuc3BlY0ZvbGRlcixcbiAgICAgICAgICAgIGFnZW50Q21kOiBvcHRzLmFnZW50Q21kLFxuICAgICAgICAgICAgLi4uKG9wdHMucG9sbCAhPT0gdW5kZWZpbmVkID8geyBwb2xsTXM6IE51bWJlcihvcHRzLnBvbGwpIH0gOiB7fSksXG4gICAgICAgICAgICAuLi4ob3B0cy5vbmNlID09PSB0cnVlID8geyBvbmNlOiB0cnVlIH0gOiB7fSksXG4gICAgICAgICAgfSk7XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgY29uc3QgZXJyID0gZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yIDogbmV3IEVycm9yKFN0cmluZyhlcnJvcikpO1xuICAgICAgICAgIHByb2Nlc3Muc3RkZXJyLndyaXRlKGBvYWhzIHdvcmsgZmFpbGVkIFx1MjAxNCAke2Vyci5uYW1lfTogJHtlcnIubWVzc2FnZX1cXG5gKTtcbiAgICAgICAgICBwcm9jZXNzLmV4aXRDb2RlID0gMTtcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICApO1xuXG4gIC8vIC0tIFBoYXNlIDYgKHJvYWRtYXAgXHUwMEE3Mi41KTogbW9kZWwgZ2F0ZXdheSAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgLy8gVGhlc2UgY29tbWFuZHMgYXJlIGdhdGV3YXkgY2xpZW50cywgTk9UIHNwaW5lIGNsaWVudHMgKFx1MDBBNzAuMSkuIENvbmZpZyBjb21lc1xuICAvLyBmcm9tIGVudiAoT0FIU19NT0RFTF9CQVNFX1VSTCAvIE9BSFNfTU9ERUxfQVBJX0tFWSAvIE9BSFNfTU9ERUxfREVGQVVMVCkuXG4gIHByb2dyYW1cbiAgICAuY29tbWFuZCgnbW9kZWxzJylcbiAgICAuZGVzY3JpcHRpb24oJ2xpc3QgdGhlIG1vZGVscyB0aGUgY29uZmlndXJlZCBtb2RlbCBnYXRld2F5IGNhbiByZWFjaCAocm9hZG1hcCBcdTAwQTcyLjUpJylcbiAgICAuYWN0aW9uKGFzeW5jICgpID0+IGVtaXQoKCkgPT4gbW9kZWxzQ29tbWFuZCgpKSk7XG5cbiAgcHJvZ3JhbVxuICAgIC5jb21tYW5kKCdwaW5nJylcbiAgICAuZGVzY3JpcHRpb24oJ3NlbmQgb25lIHNob3J0IHByb21wdCB0aHJvdWdoIHRoZSBnYXRld2F5OyBwcmludCByZXBseSArIHRva2VuIHVzYWdlJylcbiAgICAub3B0aW9uKCctLW1lc3NhZ2UgPHRleHQ+JywgJ3RoZSBwcm9tcHQgdG8gc2VuZCcpXG4gICAgLm9wdGlvbignLS1yb3V0ZSA8cm91dGU+JywgJ3BlcnNvbmEgcm91dGUgdG8gcmVzb2x2ZSB0byBhIG1vZGVsJylcbiAgICAub3B0aW9uKCctLW1vZGVsIDxtb2RlbD4nLCAnZXhwbGljaXQgbW9kZWwgaWQgKG92ZXJyaWRlcyB0aGUgcm91dGUpJylcbiAgICAuYWN0aW9uKGFzeW5jIChvcHRzOiB7IG1lc3NhZ2U/OiBzdHJpbmc7IHJvdXRlPzogc3RyaW5nOyBtb2RlbD86IHN0cmluZyB9KSA9PlxuICAgICAgZW1pdCgoKSA9PlxuICAgICAgICBwaW5nQ29tbWFuZCh7XG4gICAgICAgICAgLi4uKG9wdHMubWVzc2FnZSAhPT0gdW5kZWZpbmVkID8geyBtZXNzYWdlOiBvcHRzLm1lc3NhZ2UgfSA6IHt9KSxcbiAgICAgICAgICAuLi4ob3B0cy5yb3V0ZSAhPT0gdW5kZWZpbmVkID8geyByb3V0ZTogb3B0cy5yb3V0ZSB9IDoge30pLFxuICAgICAgICAgIC4uLihvcHRzLm1vZGVsICE9PSB1bmRlZmluZWQgPyB7IG1vZGVsOiBvcHRzLm1vZGVsIH0gOiB7fSksXG4gICAgICAgIH0pLFxuICAgICAgKSxcbiAgICApO1xuXG4gIHByb2dyYW1cbiAgICAuY29tbWFuZCgnYnJhaW4nKVxuICAgIC5kZXNjcmlwdGlvbihcbiAgICAgICd0ZWFtbWF0ZSBCUkFJTjogcmVhZCBPQUhTX0NPTlRFWFRfRklMRSAoam9iL21lc3NhZ2VzL21lbW9yaWVzKSwgYXNrIHRoZSBnYXRld2F5LCB3cml0ZSBPQUhTX1JFUExZX0ZJTEUgKHRoZSBqb2JzLXJ1bnRpbWUgYWdlbnQtY21kOyByb2FkbWFwIFx1MDBBNzIuNS9cdTAwQTc2KScsXG4gICAgKVxuICAgIC5vcHRpb24oJy0tY29udGV4dC1maWxlIDxwYXRoPicsICdjb250ZXh0IEpTT04gKGRlZmF1bHQ6IGVudiBPQUhTX0NPTlRFWFRfRklMRSknKVxuICAgIC5vcHRpb24oJy0tcmVwbHktZmlsZSA8cGF0aD4nLCAncmVwbHkgdGV4dCBvdXQgKGRlZmF1bHQ6IGVudiBPQUhTX1JFUExZX0ZJTEUpJylcbiAgICAub3B0aW9uKCctLXJvdXRlIDxyb3V0ZT4nLCAncGVyc29uYSByb3V0ZSB0byByZXNvbHZlIHRvIGEgbW9kZWwnKVxuICAgIC5hY3Rpb24oYXN5bmMgKG9wdHM6IHsgY29udGV4dEZpbGU/OiBzdHJpbmc7IHJlcGx5RmlsZT86IHN0cmluZzsgcm91dGU/OiBzdHJpbmcgfSkgPT4ge1xuICAgICAgdHJ5IHtcbiAgICAgICAgYXdhaXQgcnVuQnJhaW4oe1xuICAgICAgICAgIC4uLihvcHRzLmNvbnRleHRGaWxlICE9PSB1bmRlZmluZWQgPyB7IGNvbnRleHRGaWxlOiBvcHRzLmNvbnRleHRGaWxlIH0gOiB7fSksXG4gICAgICAgICAgLi4uKG9wdHMucmVwbHlGaWxlICE9PSB1bmRlZmluZWQgPyB7IHJlcGx5RmlsZTogb3B0cy5yZXBseUZpbGUgfSA6IHt9KSxcbiAgICAgICAgICAuLi4ob3B0cy5yb3V0ZSAhPT0gdW5kZWZpbmVkID8geyByb3V0ZTogb3B0cy5yb3V0ZSB9IDoge30pLFxuICAgICAgICB9KTtcbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIGNvbnN0IGVyciA9IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvciA6IG5ldyBFcnJvcihTdHJpbmcoZXJyb3IpKTtcbiAgICAgICAgcHJvY2Vzcy5zdGRlcnIud3JpdGUoYG9haHMgYnJhaW4gZmFpbGVkIFx1MjAxNCAke2Vyci5uYW1lfTogJHtlcnIubWVzc2FnZX1cXG5gKTtcbiAgICAgICAgcHJvY2Vzcy5leGl0Q29kZSA9IDE7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgcmV0dXJuIHByb2dyYW07XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBtYWluKGFyZ3Y6IHN0cmluZ1tdID0gcHJvY2Vzcy5hcmd2KTogUHJvbWlzZTx2b2lkPiB7XG4gIGF3YWl0IGJ1aWxkUHJvZ3JhbSgpLnBhcnNlQXN5bmMoYXJndik7XG59XG5cbi8vIEJ1bmRsZWQgYXMgYmluL29haHMubWpzIFx1MjAxNCB0aGUgYnVuZGxlIGVudHJ5cG9pbnQgSVMgdGhlIGV4ZWN1dGFibGUuXG52b2lkIG1haW4oKTtcbiIsICIvKipcbiAqIEBvYWhzL2NvbnRyYWN0cyBcdTIwMTQgdGhlIHNpbmdsZSBzb3VyY2Ugb2YgdHJ1dGggZm9yIGV2ZXJ5IG9haHMgY29tbWFuZC5cbiAqXG4gKiBPbmUgcmVnaXN0cnkgZW50cnkgPSBvbmUgSFRUUCBlbmRwb2ludCAoYFBPU1QgL3JwYy88bmFtZT5gKSA9IG9uZSBNQ1AgdG9vbFxuICogKGBvYWhzXzxuYW1lPmApID0gb25lIHR5cGVkIGNsaWVudCBtZXRob2QuIEJvdGggYWRhcHRlcnMgY2FsbCB0aGUgc2FtZVxuICogY29tbWFuZCBidXMgd2l0aCB0aGUgc2FtZSB6b2QtdmFsaWRhdGVkIGlucHV0LCBzbyBcIk1DUCBzZW1hbnRpY3MgXHUyMjYxIEhUVFBcbiAqIHNlbWFudGljc1wiIGlzIGEgc3RydWN0dXJhbCBjb25zZXF1ZW5jZSwgbm90IGEgcmV2aWV3IGRpc2NpcGxpbmVcbiAqIChwcm9kdWN0LXJvYWRtYXAubWQgXHUwMEE3MC4xIGludmFyaWFudCwgRDUpLlxuICpcbiAqIFRyYW5zcG9ydCBpcyBkZWxpYmVyYXRlbHkgdW5pZm9ybSBSUEMgKG5vIFJFU1QgcGF0aCBwYXJhbWV0ZXJzKTogcGFyaXR5XG4gKiBiZXR3ZWVuIHN1cmZhY2VzIHN0YXlzIG1hY2hpbmUtY2hlY2thYmxlLCBhbmQgdGhlIHBhcml0eSB0ZXN0IGluXG4gKiBhcHBzL3NwaW5lLWFwaSBhc3NlcnRzIGV2ZXJ5IHJlZ2lzdHJ5IGVudHJ5IGV4aXN0cyBvbiBib3RoIHN1cmZhY2VzLlxuICovXG5pbXBvcnQgeyB6IH0gZnJvbSAnem9kJztcbmltcG9ydCB7XG4gIEJMT0NLRURfUkVBU09OUyxcbiAgV09SS19JVEVNX0tJTkRTLFxuICBXT1JLX0lURU1fU1RBVEVTLFxuICB0eXBlIFNwaW5lRW5naW5lLFxufSBmcm9tICdAb2Focy9jb3JlJztcblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBTaGFyZWQgZmllbGQgc2NoZW1hc1xuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbmNvbnN0IHdvcmtJdGVtSWQgPSB6LnN0cmluZygpLm1pbigxKS5kZXNjcmliZSgnV29yayBpdGVtIGlkIChvciBpdHMgc3Rvcmllcy55YW1sIGV4dGVybmFsS2V5KScpO1xuY29uc3QgZmVuY2luZ1Rva2VuID0gelxuICAubnVtYmVyKClcbiAgLmludCgpXG4gIC5vcHRpb25hbCgpXG4gIC5kZXNjcmliZSgnRmVuY2luZyB0b2tlbiBvZiB0aGUgbGl2ZSBjbGFpbSBcdTIwMTQgcmVxdWlyZWQgZm9yIGV4ZWN1dGlvbi16b25lIG11dGF0aW9ucycpO1xuXG5jb25zdCBldmlkZW5jZVNjaGVtYSA9IHpcbiAgLm9iamVjdCh7XG4gICAga2luZDogei5lbnVtKFsndGVzdF9ydW4nLCAnZ2l0X2RpZmYnLCAnY29tbWl0JywgJ2hhbHRfcmVwb3J0JywgJ3Jldmlld19yZXBvcnQnLCAnZG9jX2xpbnQnXSksXG4gICAgcGF5bG9hZDogei5yZWNvcmQoei5zdHJpbmcoKSwgei51bmtub3duKCkpLFxuICB9KVxuICAuZGVzY3JpYmUoJ1JhdyBtYWNoaW5lLWNvbGxlY3RlZCBldmlkZW5jZTsgdGhlIGNvcmUgY29tcHV0ZXMgdmVyZGljdHMsIHRoZSBydW5uZXIgbmV2ZXIgZG9lcycpO1xuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIFJlZ2lzdHJ5XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuZXhwb3J0IGludGVyZmFjZSBDb21tYW5kRGVmPElucHV0IGV4dGVuZHMgei5ab2RUeXBlID0gei5ab2RUeXBlPiB7XG4gIC8qKiBzbmFrZV9jYXNlIGNvbW1hbmQgbmFtZTsgSFRUUCBwYXRoIGlzIC9ycGMvPG5hbWU+LCBNQ1AgdG9vbCBpcyBvYWhzXzxuYW1lPiAqL1xuICBuYW1lOiBzdHJpbmc7XG4gIGRlc2NyaXB0aW9uOiBzdHJpbmc7XG4gIGlucHV0OiBJbnB1dDtcbiAgLyoqIHRydWUgd2hlbiB0aGUgY29tbWFuZCBvbmx5IHJlYWRzIHN0YXRlICh1c2VkIGZvciBkb2NzOyBzYW1lIHJhaWxzIGVpdGhlciB3YXkpICovXG4gIHJlYWRvbmx5OiBib29sZWFuO1xufVxuXG5mdW5jdGlvbiBkZWY8SSBleHRlbmRzIHouWm9kVHlwZT4oXG4gIG5hbWU6IHN0cmluZyxcbiAgZGVzY3JpcHRpb246IHN0cmluZyxcbiAgaW5wdXQ6IEksXG4gIHJlYWRvbmx5ID0gZmFsc2UsXG4pOiBDb21tYW5kRGVmPEk+IHtcbiAgcmV0dXJuIHsgbmFtZSwgZGVzY3JpcHRpb24sIGlucHV0LCByZWFkb25seSB9O1xufVxuXG5leHBvcnQgY29uc3QgQ09NTUFORFMgPSBbXG4gIC8vIC0tIHNldHVwIC8gYWRtaW4gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIGRlZihcbiAgICAnY3JlYXRlX2FjdG9yJyxcbiAgICAnQ3JlYXRlIGEgdXNlciBvciBhZ2VudCBhY3Rvci4gUmV0dXJucyB0aGUgYWN0b3IgYW5kIGl0cyBBUEkgdG9rZW4gKGFkbWluIG9ubHkpLicsXG4gICAgei5vYmplY3Qoe1xuICAgICAgdHlwZTogei5lbnVtKFsndXNlcicsICdhZ2VudCddKSxcbiAgICAgIGRpc3BsYXlOYW1lOiB6LnN0cmluZygpLm1pbigxKSxcbiAgICAgIGdvdmVybmFuY2VSb2xlOiB6XG4gICAgICAgIC5lbnVtKFsnYWRtaW4nLCAnbWVtYmVyJywgJ2F1ZGl0b3InXSlcbiAgICAgICAgLm9wdGlvbmFsKClcbiAgICAgICAgLmRlc2NyaWJlKCdCb290c3RyYXAgcGx1bWJpbmcgKHJvYWRtYXAgXHUwMEE3Myk6IGluaXRpYWwgZ292ZXJuYW5jZSByb2xlIFx1MjAxNCBhZG1pbiBjb250ZXh0IG9ubHknKSxcbiAgICB9KSxcbiAgKSxcbiAgZGVmKFxuICAgICdncmFudF9wZXJtaXNzaW9uJyxcbiAgICAnR3JhbnQgYSBwZXJtaXNzaW9uIHRvIGFuIGFjdG9yIChhZG1pbiBvbmx5KS4gR3JhbnRzIGFyZSBleHBsaWNpdCBhbmQgYXVkaXRlZCBcdTIwMTQgYXV0aG9yaXR5IG5ldmVyIGNvbWVzIGZyb20gYWN0b3IgdHlwZSwgdGVudXJlLCBvciBtZW1vcnkgKHRoZXNpcyBcdTAwQTczKS4nLFxuICAgIHoub2JqZWN0KHtcbiAgICAgIGFjdG9ySWQ6IHouc3RyaW5nKCkubWluKDEpLFxuICAgICAgcGVybWlzc2lvbjogei5zdHJpbmcoKS5taW4oMSksXG4gICAgICBzY29wZTogei5zdHJpbmcoKS5vcHRpb25hbCgpLFxuICAgIH0pLFxuICApLFxuICBkZWYoXG4gICAgJ3Jldm9rZV9wZXJtaXNzaW9uJyxcbiAgICAnUmV2b2tlIGEgcGVybWlzc2lvbiBmcm9tIGFuIGFjdG9yIChhZG1pbiBvbmx5KS4nLFxuICAgIHoub2JqZWN0KHtcbiAgICAgIGFjdG9ySWQ6IHouc3RyaW5nKCkubWluKDEpLFxuICAgICAgcGVybWlzc2lvbjogei5zdHJpbmcoKS5taW4oMSksXG4gICAgICBzY29wZTogei5zdHJpbmcoKS5vcHRpb25hbCgpLFxuICAgIH0pLFxuICApLFxuICBkZWYoJ2NyZWF0ZV9mZWF0dXJlJywgJ0NyZWF0ZSBhIGZlYXR1cmUgKG1hcHMgYSBCTUFEIGVwaWMpLicsIHoub2JqZWN0KHt9KSksXG4gIGRlZihcbiAgICAnY3JlYXRlX3dvcmtfaXRlbScsXG4gICAgJ0NyZWF0ZSBhIHNpbmdsZSB3b3JrIGl0ZW0uIGtpbmQgc2VsZWN0cyBXSElDSCBtYWNoaW5lLWV2aWRlbmNlIGd1YXJkcyBhcHBseSAoUGhhc2UgNCkgXHUyMDE0IG5ldmVyIFdITyBtYXkgcGFzcyBhIGdhdGUuJyxcbiAgICB6Lm9iamVjdCh7XG4gICAgICBmZWF0dXJlSWQ6IHouc3RyaW5nKCkubWluKDEpLFxuICAgICAgZXh0ZXJuYWxLZXk6IHouc3RyaW5nKCkubWluKDEpLFxuICAgICAgdGl0bGU6IHouc3RyaW5nKCkubWluKDEpLFxuICAgICAga2luZDogei5lbnVtKFdPUktfSVRFTV9LSU5EUykub3B0aW9uYWwoKS5kZXNjcmliZShcIldvcmstaXRlbSBraW5kOyBkZWZhdWx0ICdjb2RlJ1wiKSxcbiAgICAgIHNwZWNDaGVja3BvaW50OiB6LmJvb2xlYW4oKS5vcHRpb25hbCgpLFxuICAgICAgZG9uZUNoZWNrcG9pbnQ6IHouYm9vbGVhbigpLm9wdGlvbmFsKCksXG4gICAgICBpbnZva2VEZXZXaXRoOiB6LnN0cmluZygpLm9wdGlvbmFsKCksXG4gICAgICBkZXBlbmRzT246IHouYXJyYXkoei5zdHJpbmcoKS5taW4oMSkpLm9wdGlvbmFsKCkuZGVzY3JpYmUoJ2V4dGVybmFsS2V5cyB0aGlzIGl0ZW0gZGVwZW5kcyBvbicpLFxuICAgIH0pLFxuICApLFxuICBkZWYoXG4gICAgJ2xpc3RfYWN0b3JzJyxcbiAgICAnTGlzdCBBTEwgYWN0b3JzIFx1MjAxNCBodW1hbnMsIGFnZW50cywgcGVyc29uYXMsIGFuZCB0aGUgc3lzdGVtIGFjdG9yICh0cmFuc3BhcmVuY3kgZm9yIHBpY2tlcnMvYXVkaXQpLicsXG4gICAgei5vYmplY3Qoe30pLFxuICAgIHRydWUsXG4gICksXG4gIGRlZihcbiAgICAncHJvdmlzaW9uX3BlcnNvbmFzJyxcbiAgICAnSWRlbXBvdGVudGx5IHByb3Zpc2lvbiB0aGUgc2l4IEJNQUQgcGVyc29uYXMgYXMgYWdlbnQgYWN0b3JzIHdpdGggZmxvb3Itc3RhdGUgcm9sZXMgKGdhdGVkIGJ5IGVuZ2luZSBnb3Zlcm5hbmNlOyB6ZXJvIGdhdGUgYXV0aG9yaXR5KS4nLFxuICAgIHoub2JqZWN0KHt9KSxcbiAgKSxcbiAgZGVmKFxuICAgICdpbXBvcnRfc3RvcmllcycsXG4gICAgJ0ltcG9ydCBhIHN0b3JpZXMueWFtbCBmaWxlIGludG8gYSBmZWF0dXJlIChpZGVtcG90ZW50IHJlLWltcG9ydDsgdmFsaWRpdHkgcnVsZXMgZnJvbSBzdG9yaWVzLXNjaGVtYS5tZCkuJyxcbiAgICB6Lm9iamVjdCh7XG4gICAgICBmZWF0dXJlSWQ6IHouc3RyaW5nKCkubWluKDEpLFxuICAgICAgeWFtbDogei5zdHJpbmcoKS5taW4oMSksXG4gICAgfSksXG4gICksXG5cbiAgLy8gLS0gY2xhaW1zIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgZGVmKFxuICAgICdjbGFpbV90YXNrJyxcbiAgICAnQ2xhaW0gYSB3b3JrIGl0ZW0gdW5kZXIgYSBsZWFzZS4gUmV0dXJucyB0aGUgY2xhaW0gd2l0aCBpdHMgZmVuY2luZyB0b2tlbi4nLFxuICAgIHoub2JqZWN0KHtcbiAgICAgIHdvcmtJdGVtSWQsXG4gICAgICB0dGxNczogei5udW1iZXIoKS5pbnQoKS5wb3NpdGl2ZSgpLm9wdGlvbmFsKCksXG4gICAgfSksXG4gICksXG4gIGRlZignaGVhcnRiZWF0JywgJ1JlbmV3IHRoZSBsZWFzZSBvZiBhIGxpdmUgY2xhaW0uJywgei5vYmplY3QoeyBjbGFpbUlkOiB6LnN0cmluZygpLm1pbigxKSB9KSksXG4gIGRlZihcbiAgICAncmVsZWFzZV9jbGFpbScsXG4gICAgJ1JlbGVhc2UgYSBjbGFpbSAobm9ybWFsIGNvbXBsZXRpb24gb3Igdm9sdW50YXJ5IGhhbmRvZmYpLicsXG4gICAgei5vYmplY3QoeyBjbGFpbUlkOiB6LnN0cmluZygpLm1pbigxKSwgcmVhc29uOiB6LnN0cmluZygpLm9wdGlvbmFsKCkgfSksXG4gICksXG5cbiAgLy8gLS0gbGlmZWN5Y2xlIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICBkZWYoXG4gICAgJ2FkdmFuY2Vfc3RhdGUnLFxuICAgICdBZHZhbmNlIGEgd29yayBpdGVtIHRocm91Z2ggdGhlIEZTTS4gRGV0ZXJtaW5pc3RpYzogcGVybWlzc2lvbiArIGd1YXJkcyArIGV2aWRlbmNlIGRlY2lkZSwgbmV2ZXIgaW50ZXJwcmV0YXRpb24uJyxcbiAgICB6Lm9iamVjdCh7XG4gICAgICB3b3JrSXRlbUlkLFxuICAgICAgdG86IHouZW51bShXT1JLX0lURU1fU1RBVEVTKSxcbiAgICAgIGZlbmNpbmdUb2tlbixcbiAgICAgIGlkZW1wb3RlbmN5S2V5OiB6LnN0cmluZygpLm9wdGlvbmFsKCksXG4gICAgfSksXG4gICksXG4gIGRlZihcbiAgICAnYmxvY2tfdGFzaycsXG4gICAgJ1NldCB0aGUgYmxvY2tlZCBvdmVybGF5IHdpdGggYSBibG9ja2luZyBjb25kaXRpb24gZnJvbSB0aGUgSEFMVCB0YXhvbm9teS4nLFxuICAgIHoub2JqZWN0KHtcbiAgICAgIHdvcmtJdGVtSWQsXG4gICAgICByZWFzb246IHouZW51bShCTE9DS0VEX1JFQVNPTlMpLFxuICAgICAgZmVuY2luZ1Rva2VuLFxuICAgIH0pLFxuICApLFxuICBkZWYoJ3VuYmxvY2tfdGFzaycsICdDbGVhciB0aGUgYmxvY2tlZCBvdmVybGF5IChyZXZpZXdfbm9uX2NvbnZlcmdlbmNlIG5lZWRzIHRoZSByZXZpZXcgZ2F0ZSBncmFudCkuJywgei5vYmplY3QoeyB3b3JrSXRlbUlkIH0pKSxcbiAgZGVmKFxuICAgICdzdWJtaXRfZXZpZGVuY2UnLFxuICAgICdTdWJtaXQgcmF3IG1hY2hpbmUtY29sbGVjdGVkIGV2aWRlbmNlIChleGl0IGNvZGVzLCBkaWZmIHN0YXRzLCBzaGFzKS4gVGhlIGNvcmUgY29tcHV0ZXMgdmVyZGljdHMuJyxcbiAgICB6Lm9iamVjdCh7IHdvcmtJdGVtSWQsIGV2aWRlbmNlOiBldmlkZW5jZVNjaGVtYSwgZmVuY2luZ1Rva2VuIH0pLFxuICApLFxuICBkZWYoXG4gICAgJ2FwcHJvdmVfZ2F0ZScsXG4gICAgJ0FwcHJvdmUgYSBnYXRlIGFzIGEgcGVybWl0dGVkIGFjdG9yLiBzcGVjX2FwcHJvdmFsIHBpbnMgdGhlIHZlcmlmaWNhdGlvbiBjb21tYW5kcyAoRDcpIGFuZCBmaXJlcyBkcmFmdFx1MjE5MnJlYWR5X2Zvcl9kZXY7IHJldmlld19hcHByb3ZhbCBjaGVja3MgcGlubmVkIGV2aWRlbmNlIGFuZCBmaXJlcyBpbl9yZXZpZXdcdTIxOTJkb25lLicsXG4gICAgei5vYmplY3Qoe1xuICAgICAgd29ya0l0ZW1JZCxcbiAgICAgIGdhdGU6IHouZW51bShbJ3NwZWNfYXBwcm92YWwnLCAncmV2aWV3X2FwcHJvdmFsJ10pLFxuICAgICAgcGlubmVkVmVyaWZpY2F0aW9uOiB6LmFycmF5KHouc3RyaW5nKCkpLm9wdGlvbmFsKCksXG4gICAgfSksXG4gICksXG4gIGRlZihcbiAgICAncmVqZWN0X2dhdGUnLFxuICAgICdSZWplY3QgYSBnYXRlIGFzIGEgcGVybWl0dGVkIGFjdG9yLiBSZXZpZXcgcmVqZWN0aW9uIGZpcmVzIHRoZSBsb29wYmFjayBhcyBhIHN5c3RlbSBlZmZlY3QgKG9yIGJsb2NrcyB3aXRoIHJldmlld19ub25fY29udmVyZ2VuY2Ugb24gdGhlIDZ0aCkuJyxcbiAgICB6Lm9iamVjdCh7XG4gICAgICB3b3JrSXRlbUlkLFxuICAgICAgZ2F0ZTogei5lbnVtKFsnc3BlY19hcHByb3ZhbCcsICdyZXZpZXdfYXBwcm92YWwnXSksXG4gICAgfSksXG4gICksXG4gIGRlZihcbiAgICAncmVsZWFzZV9kaXNwYXRjaF9ob2xkJyxcbiAgICAnUmVsZWFzZSBhIGRvbmVfY2hlY2twb2ludCBkaXNwYXRjaCBob2xkIG9uIGEgZmVhdHVyZSAocGVybWl0dGVkIGFjdG9ycyBvbmx5KS4nLFxuICAgIHoub2JqZWN0KHsgZmVhdHVyZUlkOiB6LnN0cmluZygpLm1pbigxKSB9KSxcbiAgKSxcblxuICAvLyAtLSBlbnRpdGxlbWVudHMgKFBoYXNlIDIsIHJvYWRtYXAgXHUwMEE3MykgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIC8vIEF1dGhvcml0eSBmb3IgdGhpcyBncm91cCBpcyBkZWNpZGVkIGJ5IHRoZSBFTkdJTkUgZnJvbSB0aGUgY2FsbGVyJ3NcbiAgLy8gZ292ZXJuYW5jZSByb2xlIChcImVudGl0bGVtZW50ID0gcGxhbiBcdTAwRDcgZ292ZXJuYW5jZSByb2xlIFx1MDBENyBkZWxpdmVyeSByb2xlLFxuICAvLyByZXNvbHZlZCBieSBhIHB1cmUgZnVuY3Rpb24gb3ZlciB2ZXJzaW9uZWQgY29uZmlnL2RhdGFcIikgXHUyMDE0IHRoZSBidXMgbmV2ZXJcbiAgLy8gcHJlLWNoZWNrcyBhZG1pbiBoZXJlLlxuICBkZWYoXG4gICAgJ2Fzc2lnbl9yb2xlJyxcbiAgICAnQXNzaWduIGEgZGVsaXZlcnkgcm9sZSAocGVybWlzc2lvbiBidW5kbGUsIHJvYWRtYXAgXHUwMEE3MykgdG8gYW4gYWN0b3IuIEdhdGVkIHdyaXRlOiByZXF1aXJlcyBnb3Zlcm5hbmNlLWFkbWluIGF1dGhvcml0eTsgYXVkaXRlZC4nLFxuICAgIHoub2JqZWN0KHtcbiAgICAgIGFjdG9ySWQ6IHouc3RyaW5nKCkubWluKDEpLFxuICAgICAgcm9sZUNvZGU6IHouc3RyaW5nKCkubWluKDEpLmRlc2NyaWJlKCdEZWxpdmVyeSByb2xlIGNvZGUsIGUuZy4gcmV2aWV3ZXIgfCBkZXZlbG9wZXIgfCBwcm9kdWN0X293bmVyJyksXG4gICAgfSksXG4gICksXG4gIGRlZihcbiAgICAncmV2b2tlX3JvbGUnLFxuICAgICdSZXZva2UgYSBkZWxpdmVyeSByb2xlIGFzc2lnbm1lbnQgZnJvbSBhbiBhY3Rvci4gR2F0ZWQgd3JpdGU6IHJlcXVpcmVzIGdvdmVybmFuY2UtYWRtaW4gYXV0aG9yaXR5OyBhdWRpdGVkLicsXG4gICAgei5vYmplY3Qoe1xuICAgICAgYWN0b3JJZDogei5zdHJpbmcoKS5taW4oMSksXG4gICAgICByb2xlQ29kZTogei5zdHJpbmcoKS5taW4oMSksXG4gICAgfSksXG4gICksXG4gIGRlZihcbiAgICAnbGlzdF9yb2xlX2Fzc2lnbm1lbnRzJyxcbiAgICAnTGlzdCBkZWxpdmVyeS1yb2xlIGFzc2lnbm1lbnRzIChhbGwsIG9yIG9uZSBhY3Rvclx1MjAxOXMpLCBpbmNsdWRpbmcgcmV2b2tlZCByb3dzIGZvciBhdWRpdC4nLFxuICAgIHoub2JqZWN0KHsgYWN0b3JJZDogei5zdHJpbmcoKS5taW4oMSkub3B0aW9uYWwoKSB9KSxcbiAgICB0cnVlLFxuICApLFxuICBkZWYoXG4gICAgJ3NldF9nb3Zlcm5hbmNlX3JvbGUnLFxuICAgICdTZXQgYW4gYWN0b3JcdTIwMTlzIGdvdmVybmFuY2Ugcm9sZSAoYWRtaW4gfCBtZW1iZXIgfCBhdWRpdG9yKS4gR2F0ZWQgd3JpdGU6IHJlcXVpcmVzIGdvdmVybmFuY2UtYWRtaW4gYXV0aG9yaXR5LicsXG4gICAgei5vYmplY3Qoe1xuICAgICAgYWN0b3JJZDogei5zdHJpbmcoKS5taW4oMSksXG4gICAgICByb2xlOiB6LmVudW0oWydhZG1pbicsICdtZW1iZXInLCAnYXVkaXRvciddKSxcbiAgICB9KSxcbiAgKSxcbiAgZGVmKFxuICAgICdzZXRfcGxhbicsXG4gICAgJ1NldCB0aGUgd29ya3NwYWNlIHBsYW4uIFBsYW4gaXMgYSBDRUlMSU5HLCBuZXZlciBhIGdyYW50IChyb2FkbWFwIFx1MDBBNzMpOiBpdCBib3VuZHMgd2hhdCBhZ2VudHMgbWF5IGhvbGQvZXhlcmNpc2U7IHVzZXJzIGFyZSBuZXZlciBwbGFuLWZpbHRlcmVkLicsXG4gICAgei5vYmplY3QoeyBwbGFuOiB6LmVudW0oWydmcmVlJywgJ3RlYW0nLCAnZW50ZXJwcmlzZSddKSB9KSxcbiAgKSxcbiAgZGVmKFxuICAgICdzZXRfd29ya3NwYWNlX3BvbGljeScsXG4gICAgJ1NldCByZXN0cmljdC1vbmx5IHdvcmtzcGFjZSBwb2xpY3kga2V5cyAocm9hZG1hcCBcdTAwQTczKTogYSBwb2xpY3kgY2FuIG5hcnJvdyB3aGF0IHRoZSBwbGFuIGFsbG93cywgbmV2ZXIgd2lkZW4gaXQuJyxcbiAgICB6Lm9iamVjdCh7XG4gICAgICBwb2xpY3k6IHoub2JqZWN0KHtcbiAgICAgICAgYWdlbnRHYXRlQXBwcm92YWxzOiB6XG4gICAgICAgICAgLmJvb2xlYW4oKVxuICAgICAgICAgIC5vcHRpb25hbCgpXG4gICAgICAgICAgLmRlc2NyaWJlKCdmYWxzZSBcdTIxRDIgYWdlbnRzIGNhbm5vdCBleGVyY2lzZSBnYXRlLWFwcHJvdmFsIHBlcm1pc3Npb25zIGV2ZW4gaWYgZ3JhbnRlZCcpLFxuICAgICAgICBhZ2VudFNlbGZEaXNwYXRjaDogelxuICAgICAgICAgIC5ib29sZWFuKClcbiAgICAgICAgICAub3B0aW9uYWwoKVxuICAgICAgICAgIC5kZXNjcmliZSgnZmFsc2UgXHUyMUQyIGFnZW50cyBjYW5ub3QgY2xhaW0gdGFza3Mgb24gdGhlaXIgb3duIChtZW50aW9uLWRpc3BhdGNoIG9ubHkpJyksXG4gICAgICB9KSxcbiAgICB9KSxcbiAgKSxcbiAgZGVmKFxuICAgICdzZXRfZ2F0ZV9wb2xpY3knLFxuICAgICdTZXQgYSBnYXRlIGRlZmluaXRpb24gYXMgREFUQSAocm9hZG1hcCBcdTAwQTczKTogbWluX2FwcHJvdmFscyBxdW9ydW0gYW5kIHJlcXVpcmVkX2FjdG9yX3R5cGVzIFx1MjAxNCBodW1hbi1vbmx5IGlzIGEgZGVmYXVsdCwgbm90IGEgaGFyZGNvZGUuJyxcbiAgICB6Lm9iamVjdCh7XG4gICAgICBnYXRlOiB6LmVudW0oWydzcGVjX2FwcHJvdmFsJywgJ3Jldmlld19hcHByb3ZhbCddKSxcbiAgICAgIHBvbGljeTogei5vYmplY3Qoe1xuICAgICAgICBtaW5BcHByb3ZhbHM6IHoubnVtYmVyKCkuaW50KCkucG9zaXRpdmUoKS5vcHRpb25hbCgpLmRlc2NyaWJlKCdkaXN0aW5jdCBhcHByb3ZlcnMgcmVxdWlyZWQgcGVyIHJldmlldyByb3VuZCcpLFxuICAgICAgICByZXF1aXJlZEFjdG9yVHlwZXM6IHpcbiAgICAgICAgICAuYXJyYXkoei5lbnVtKFsndXNlcicsICdhZ2VudCcsICdzeXN0ZW0nXSkpXG4gICAgICAgICAgLm9wdGlvbmFsKClcbiAgICAgICAgICAuZGVzY3JpYmUoJ2F0IGxlYXN0IG9uZSBhcHByb3ZlciBvZiBlYWNoIGxpc3RlZCB0eXBlIGlzIHJlcXVpcmVkJyksXG4gICAgICB9KSxcbiAgICB9KSxcbiAgKSxcbiAgZGVmKFxuICAgICdhdXRoel9leHBsYWluJyxcbiAgICAnUmVwbGF5YWJsZSBhdXRoeiBkZWNpc2lvbiB0cmFjZSAocm9hZG1hcCBcdTAwQTczKTogc291cmNlIGdyYW50L3JvbGUsIHBsYW4gY2VpbGluZywgcG9saWN5LCBhbmQgdGhlIHBvbGljeSB2ZXJzaW9uIHR1cGxlIGFuIGF1ZGl0b3IgY2FuIHJlcGxheS4nLFxuICAgIHoub2JqZWN0KHtcbiAgICAgIGFjdG9ySWQ6IHouc3RyaW5nKCkubWluKDEpLFxuICAgICAgcGVybWlzc2lvbjogei5zdHJpbmcoKS5taW4oMSksXG4gICAgfSksXG4gICAgdHJ1ZSxcbiAgKSxcblxuICAvLyAtLSBjb2xsYWJvcmF0aW9uIChQaGFzZSAzLCByb2FkbWFwIFx1MDBBNzUpIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAvLyBUaGUgY2hhdCBTVVJGQUNFIG92ZXIgdGhlIHNhbWUgcmFpbHMuIFNhY3JlZCBib3VuZGFyeSAoXHUwMEE3NS4yKTogYSBtZXNzYWdlXG4gIC8vIE5FVkVSIG11dGF0ZXMgbGlmZWN5Y2xlOyBtZW50aW9ucyBhcmUgU1RSVUNUVVJFRCBhY3RvciBpZHMgXHUyMDE0IG5vIHNlcnZlclxuICAvLyBjb2RlIHBhdGggZXZlciBwYXJzZXMgbWVzc2FnZSBib2R5IHRleHQuIEFjdG9yIGlkZW50aXR5IGZvciBldmVyeSBjb21tYW5kXG4gIC8vIGhlcmUgY29tZXMgZnJvbSBjdHggKHRoZSBhdXRoZW50aWNhdGVkIHRva2VuKSwgbmV2ZXIgZnJvbSB0aGUgaW5wdXQuXG4gIGRlZihcbiAgICAnY3JlYXRlX3RocmVhZCcsXG4gICAgJ0NyZWF0ZSBhIGNvbnZlcnNhdGlvbiB0aHJlYWQsIG9wdGlvbmFsbHkgYm91bmQgdG8gYSBmZWF0dXJlL3dvcmsgaXRlbS4ga2luZD1wcml2YXRlIGRlZmF1bHRzIHZpc2liaWxpdHkgdG8gcHJpdmF0ZS4nLFxuICAgIHoub2JqZWN0KHtcbiAgICAgIGtpbmQ6IHouZW51bShbJ3NwZWMnLCAnZGVzaWduJywgJ3Rhc2snLCAnZ2VuZXJhbCcsICdwcml2YXRlJ10pLFxuICAgICAgZmVhdHVyZUlkOiB6LnN0cmluZygpLm1pbigxKS5vcHRpb25hbCgpLFxuICAgICAgd29ya0l0ZW1JZDogd29ya0l0ZW1JZC5vcHRpb25hbCgpLFxuICAgICAgdmlzaWJpbGl0eTogei5lbnVtKFsnb3BlbicsICdwcml2YXRlJ10pLm9wdGlvbmFsKCksXG4gICAgfSksXG4gICksXG4gIGRlZihcbiAgICAnYWRkX3RocmVhZF9wYXJ0aWNpcGFudCcsXG4gICAgJ0ludml0ZSBhbiBhY3RvciBpbnRvIGEgdGhyZWFkIChwcml2YXRlIHRocmVhZHM6IG9ubHkgZXhpc3RpbmcgcGFydGljaXBhbnRzIG1heSBpbnZpdGUpLicsXG4gICAgei5vYmplY3Qoe1xuICAgICAgdGhyZWFkSWQ6IHouc3RyaW5nKCkubWluKDEpLFxuICAgICAgYWN0b3JJZDogei5zdHJpbmcoKS5taW4oMSksXG4gICAgfSksXG4gICksXG4gIGRlZihcbiAgICAncG9zdF9tZXNzYWdlJyxcbiAgICAnUG9zdCBhIGNoYXQgbWVzc2FnZS4gYG1lbnRpb25zYCBpcyBzdHJ1Y3R1cmVkIGFjdG9yIGlkcyAoXHUwMEE3NS4yIFx1MjAxNCBib2R5IHRleHQgaXMgbmV2ZXIgcGFyc2VkKTsgbWVudGlvbmluZyBhbiBhZ2VudCBydW5zIHRoZSBkZXRlcm1pbmlzdGljIGRlZmF1bHQtZGVueSByb3V0ZXIgKFx1MDBBNzUuNCkuJyxcbiAgICB6Lm9iamVjdCh7XG4gICAgICB0aHJlYWRJZDogei5zdHJpbmcoKS5taW4oMSksXG4gICAgICBib2R5OiB6LnN0cmluZygpLm1pbigxKSxcbiAgICAgIHJlcGx5VG86IHouc3RyaW5nKCkubWluKDEpLm9wdGlvbmFsKCksXG4gICAgICBtZW50aW9uczogei5hcnJheSh6LnN0cmluZygpLm1pbigxKSkub3B0aW9uYWwoKSxcbiAgICB9KSxcbiAgKSxcbiAgZGVmKFxuICAgICdsaXN0X3RocmVhZHMnLFxuICAgICdMaXN0IHRocmVhZHMsIG9wdGlvbmFsbHkgZmlsdGVyZWQgYnkgZmVhdHVyZSAvIHdvcmsgaXRlbS4gUHJpdmF0ZSB0aHJlYWRzIGFyZSB2aXNpYmxlIG9ubHkgdG8gdGhlaXIgcGFydGljaXBhbnRzIChjdHggYWN0b3IpLicsXG4gICAgei5vYmplY3Qoe1xuICAgICAgZmVhdHVyZUlkOiB6LnN0cmluZygpLm1pbigxKS5vcHRpb25hbCgpLFxuICAgICAgd29ya0l0ZW1JZDogd29ya0l0ZW1JZC5vcHRpb25hbCgpLFxuICAgIH0pLFxuICAgIHRydWUsXG4gICksXG4gIGRlZihcbiAgICAnbGlzdF9tZXNzYWdlcycsXG4gICAgJ0xpc3QgbWVzc2FnZXMgb2YgYSB0aHJlYWQgKG9wdGlvbmFsbHkgYWZ0ZXIgYSBzZXEpLiBQcml2YXRlIHRocmVhZHMgcmVxdWlyZSBwYXJ0aWNpcGF0aW9uIFx1MjAxNCB0aGUgcmVhZGVyIGlzIEFMV0FZUyB0aGUgY3R4IGFjdG9yLicsXG4gICAgei5vYmplY3Qoe1xuICAgICAgdGhyZWFkSWQ6IHouc3RyaW5nKCkubWluKDEpLFxuICAgICAgc2luY2VTZXE6IHoubnVtYmVyKCkuaW50KCkubm9ubmVnYXRpdmUoKS5vcHRpb25hbCgpLFxuICAgIH0pLFxuICAgIHRydWUsXG4gICksXG4gIGRlZihcbiAgICAnbGlzdF9tZW50aW9ucycsXG4gICAgJ0xpc3QgdGhlIHJlY29yZGVkIG1lbnRpb25zIG9mIGEgbWVzc2FnZSB3aXRoIHRoZWlyIHJvdXRlciByZXNvbHV0aW9ucyAobm90aWZpZWQgfCBqb2JfY3JlYXRlZCB8IGRlbmllZF9wb2xpY3kgfCBkZW5pZWRfZGVwdGgpLicsXG4gICAgei5vYmplY3QoeyBtZXNzYWdlSWQ6IHouc3RyaW5nKCkubWluKDEpIH0pLFxuICAgIHRydWUsXG4gICksXG4gIGRlZihcbiAgICAnbGlzdF9ub3RpZmljYXRpb25zJyxcbiAgICAnTGlzdCB0aGUgY3R4IGFjdG9yXHUyMDE5cyBPV04gbm90aWZpY2F0aW9ucyAobWVudGlvbnMgKyBqb2IgY29tcGxldGlvbnMpLicsXG4gICAgei5vYmplY3QoeyB1bnJlYWRPbmx5OiB6LmJvb2xlYW4oKS5vcHRpb25hbCgpIH0pLFxuICAgIHRydWUsXG4gICksXG4gIGRlZihcbiAgICAnbWFya19ub3RpZmljYXRpb25fcmVhZCcsXG4gICAgJ01hcmsgb25lIG9mIHRoZSBjdHggYWN0b3JcdTIwMTlzIG93biBub3RpZmljYXRpb25zIGFzIHJlYWQuJyxcbiAgICB6Lm9iamVjdCh7IG5vdGlmaWNhdGlvbklkOiB6LnN0cmluZygpLm1pbigxKSB9KSxcbiAgKSxcbiAgZGVmKFxuICAgICdsaXN0X2FnZW50X2pvYnMnLFxuICAgICdMaXN0IHJvdXRlci1tYXRlcmlhbGl6ZWQgYWdlbnQgam9icyAocmVwbHktb25seSBjb250ZXh0IFx1MjAxNCBhIGpvYiBuZXZlciBjYXJyaWVzIGEgY2xhaW0gb3IgbGlmZWN5Y2xlIGF1dGhvcml0eSwgXHUwMEE3NS40KS4nLFxuICAgIHoub2JqZWN0KHtcbiAgICAgIGFnZW50QWN0b3JJZDogei5zdHJpbmcoKS5taW4oMSkub3B0aW9uYWwoKSxcbiAgICAgIHN0YXR1czogei5lbnVtKFsncXVldWVkJywgJ2RvbmUnLCAnYmxvY2tlZCddKS5vcHRpb25hbCgpLFxuICAgIH0pLFxuICAgIHRydWUsXG4gICksXG4gIGRlZihcbiAgICAnY29tcGxldGVfYWdlbnRfam9iJyxcbiAgICAnQ29tcGxldGUgYW4gYWdlbnQgam9iIChvbmx5IHRoZSBqb2JcdTIwMTlzIGFnZW50IG1heSkuIENvbXBsZXRpb24gbm90aWZpZXMgdGhlIG1lbnRpb25lciBcdTIwMTQgbm90aGluZyBlbHNlIG1vdmVzLicsXG4gICAgei5vYmplY3Qoe1xuICAgICAgam9iSWQ6IHouc3RyaW5nKCkubWluKDEpLFxuICAgICAgc3RhdHVzOiB6LmVudW0oWydkb25lJywgJ2Jsb2NrZWQnXSksXG4gICAgICBub3RlOiB6LnN0cmluZygpLm9wdGlvbmFsKCksXG4gICAgfSksXG4gICksXG5cbiAgLy8gLS0gYWdlbnQgbWVtb3J5IChQaGFzZSA1LCByb2FkbWFwIFx1MDBBNzYpIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIC8vIE93bmVyLXNjb3BlZCBCWSBDT05TVFJVQ1RJT046IG5laXRoZXIgY29tbWFuZCB0YWtlcyBhbiBhY3RvciBwYXJhbWV0ZXIgXHUyMDE0XG4gIC8vIHRoZSBtZW1vcnkgb3duZXIgaXMgQUxXQVlTIHRoZSBhdXRoZW50aWNhdGVkIGN0eCBhY3Rvci4gTGVhcm5pbmcgbmV2ZXJcbiAgLy8gYmVjb21lcyBhdXRob3JpdHk6IHRoZXNlIGNvbW1hbmRzIHRvdWNoIHRoZSBtZW1vcnkgc3RvcmUgb25seSwgbmV2ZXIgYVxuICAvLyBncmFudCwgZ2F0ZSwgb3IgdHJhbnNpdGlvbi5cbiAgZGVmKFxuICAgICdhcHBlbmRfYWdlbnRfbWVtb3J5JyxcbiAgICAnQXBwZW5kIGEgbWVtb3J5IGZvciB0aGUgY3R4IGFnZW50IGFjdG9yIChhZ2VudHMgb25seSkuIExlYXJuaW5nIGZyb20gYSBwcml2YXRlIHRocmVhZCByZXF1aXJlcyBwYXJ0aWNpcGF0aW9uOyBtZW1vcnkgZXZlbnRzIG5ldmVyIGNhcnJ5IGNvbnRlbnQgKFx1MDBBNzYpLicsXG4gICAgei5vYmplY3Qoe1xuICAgICAga2luZDogei5lbnVtKFsnZXBpc29kaWMnLCAncHJvY2VkdXJhbCcsICdlbnRpdHknXSksXG4gICAgICBjb250ZW50OiB6LnN0cmluZygpLm1pbigxKSxcbiAgICAgIHNvdXJjZVRocmVhZElkOiB6XG4gICAgICAgIC5zdHJpbmcoKVxuICAgICAgICAubWluKDEpXG4gICAgICAgIC5vcHRpb25hbCgpXG4gICAgICAgIC5kZXNjcmliZSgnVGhyZWFkIHRoZSBtZW1vcnkgd2FzIGxlYXJuZWQgaW4gXHUyMDE0IGl0cyB2aXNpYmlsaXR5IGdhdGVzIHJlY2FsbCAoXHUwMEE3NiknKSxcbiAgICB9KSxcbiAgKSxcbiAgZGVmKFxuICAgICdzZWFyY2hfYWdlbnRfbWVtb3J5JyxcbiAgICAnUmVjYWxsIHRoZSBjdHggYWN0b3JcdTIwMTlzIE9XTiBtZW1vcmllcy4gUHJpdmF0ZS1zb3VyY2VkIG1lbW9yaWVzIHN1cmZhY2Ugb25seSB3aGVuIGNvbnRleHRUaHJlYWRJZCBpcyB0aGVpciBzb3VyY2UgdGhyZWFkIChcdTAwQTc2KS4nLFxuICAgIHoub2JqZWN0KHtcbiAgICAgIGNvbnRleHRUaHJlYWRJZDogelxuICAgICAgICAuc3RyaW5nKClcbiAgICAgICAgLm1pbigxKVxuICAgICAgICAub3B0aW9uYWwoKVxuICAgICAgICAuZGVzY3JpYmUoJ1RocmVhZCB0aGUgcmVjYWxsIGhhcHBlbnMgaW4gXHUyMDE0IGdhdGVzIHByaXZhdGUtc291cmNlZCBtZW1vcmllcycpLFxuICAgICAga2luZDogei5lbnVtKFsnZXBpc29kaWMnLCAncHJvY2VkdXJhbCcsICdlbnRpdHknXSkub3B0aW9uYWwoKSxcbiAgICAgIHF1ZXJ5OiB6LnN0cmluZygpLm1pbigxKS5vcHRpb25hbCgpLmRlc2NyaWJlKCdDYXNlLWluc2Vuc2l0aXZlIHN1YnN0cmluZyBmaWx0ZXInKSxcbiAgICB9KSxcbiAgICB0cnVlLFxuICApLFxuXG4gIC8vIC0tIHJlY29uY2lsaWF0aW9uIChyb2FkbWFwIFx1MDBBNzEuNiwgRDY6IGRldGVjdC1vbmx5KSAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICBkZWYoXG4gICAgJ3JlY29uY2lsZScsXG4gICAgJ0RldGVjdC1vbmx5IGRpdmVyZ2VuY2UgcmVwb3J0IGJldHdlZW4gZmlsZSBmcm9udG1hdHRlciBzdGF0dXNlcyBhbmQgREIgc3RhdGVzIChuZXZlciBtdXRhdGVzOyBsaXZlLWNsYWltZWQgaXRlbXMgYXJlIGV4Y2x1ZGVkKS4nLFxuICAgIHoub2JqZWN0KHtcbiAgICAgIGZpbGVzOiB6LmFycmF5KFxuICAgICAgICB6Lm9iamVjdCh7XG4gICAgICAgICAgd29ya0l0ZW1JZCxcbiAgICAgICAgICBmcm9udG1hdHRlclN0YXR1czogei5zdHJpbmcoKS5taW4oMSksXG4gICAgICAgIH0pLFxuICAgICAgKSxcbiAgICB9KSxcbiAgICB0cnVlLFxuICApLFxuXG4gIC8vIC0tIG9wcyAoc28gbm9ib2R5IGV2ZXIgbmVlZHMgdG8gdG91Y2ggdGhlIERCIGJ5IGhhbmQpIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIGRlZihcbiAgICAnZm9yY2VfcmVsZWFzZV9jbGFpbScsXG4gICAgJ09wczogZm9yY2UtcmVsZWFzZSB0aGUgbGl2ZSBjbGFpbSBvZiBhIHdvcmsgaXRlbSAoc3R1Y2sgcnVubmVyLCBsb3N0IG1hY2hpbmUpLicsXG4gICAgei5vYmplY3QoeyB3b3JrSXRlbUlkIH0pLFxuICApLFxuXG4gIC8vIC0tIHF1ZXJpZXMgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgZGVmKCdnZXRfd29ya19pdGVtJywgJ0ZldGNoIG9uZSB3b3JrIGl0ZW0gYnkgaWQgb3IgZXh0ZXJuYWxLZXkuJywgei5vYmplY3QoeyB3b3JrSXRlbUlkIH0pLCB0cnVlKSxcbiAgZGVmKCdnZXRfZmVhdHVyZScsICdGZXRjaCBvbmUgZmVhdHVyZS4nLCB6Lm9iamVjdCh7IGZlYXR1cmVJZDogei5zdHJpbmcoKS5taW4oMSkgfSksIHRydWUpLFxuICBkZWYoXG4gICAgJ2dldF90YXNrX2NvbnRleHQnLFxuICAgICdEaXNwYXRjaCBjb250ZXh0IGZvciBhIHJ1bm5lcjogZW50cnkgc3RhdGUgcm91dGluZyBwZXIgZGV2LWF1dG8uIFJlZnVzZXMgZG9uZSBpdGVtcyBhbmQgaGVsZCBmZWF0dXJlcy4nLFxuICAgIHoub2JqZWN0KHsgd29ya0l0ZW1JZCB9KSxcbiAgICB0cnVlLFxuICApLFxuICBkZWYoXG4gICAgJ2xpc3Rfd29ya19pdGVtcycsXG4gICAgJ0xpc3Qgd29yayBpdGVtcywgb3B0aW9uYWxseSBmaWx0ZXJlZCBieSBzdGF0ZSAvIGZlYXR1cmUgLyBjbGFpbWFiaWxpdHkuJyxcbiAgICB6Lm9iamVjdCh7XG4gICAgICBzdGF0ZTogei5lbnVtKFdPUktfSVRFTV9TVEFURVMpLm9wdGlvbmFsKCksXG4gICAgICBmZWF0dXJlSWQ6IHouc3RyaW5nKCkub3B0aW9uYWwoKSxcbiAgICAgIGNsYWltYWJsZTogei5ib29sZWFuKCkub3B0aW9uYWwoKS5kZXNjcmliZSgndHJ1ZSA9IG5vIGxpdmUgY2xhaW0gb24gdGhlIGl0ZW0nKSxcbiAgICB9KSxcbiAgICB0cnVlLFxuICApLFxuICBkZWYoXG4gICAgJ2luYm94JyxcbiAgICAnR2F0ZS1ob2xkZXIgaW5ib3g6IGl0ZW1zIGF3YWl0aW5nIGEgZ2F0ZSBkZWNpc2lvbiAoZHJhZnQrc3BlY19jaGVja3BvaW50IGF3YWl0aW5nIHNwZWMgYXBwcm92YWw7IGluX3JldmlldyBhd2FpdGluZyByZXZpZXcgZGVjaXNpb24pLicsXG4gICAgei5vYmplY3Qoe30pLFxuICAgIHRydWUsXG4gICksXG4gIGRlZihcbiAgICAncXVlcnlfZXZlbnRzJyxcbiAgICAnQXVkaXQgcXVlcnk6IHRoZSBhcHBlbmQtb25seSBldmVudCBsb2csIG9wdGlvbmFsbHkgc2NvcGVkIHRvIG9uZSBzdHJlYW0uJyxcbiAgICB6Lm9iamVjdCh7IHN0cmVhbUlkOiB6LnN0cmluZygpLm9wdGlvbmFsKCkgfSksXG4gICAgdHJ1ZSxcbiAgKSxcbiAgZGVmKCdnZXRfY2xhaW1zJywgJ0FsbCBjbGFpbXMgKGxpdmUgYW5kIHJlbGVhc2VkKSBvZiBhIHdvcmsgaXRlbS4nLCB6Lm9iamVjdCh7IHdvcmtJdGVtSWQgfSksIHRydWUpLFxuICBkZWYoJ3dob2FtaScsICdSZXNvbHZlIHRoZSBhdXRoZW50aWNhdGVkIGFjdG9yLicsIHoub2JqZWN0KHt9KSwgdHJ1ZSksXG5dIGFzIGNvbnN0O1xuXG5leHBvcnQgdHlwZSBDb21tYW5kTmFtZSA9ICh0eXBlb2YgQ09NTUFORFMpW251bWJlcl1bJ25hbWUnXTtcblxuZXhwb3J0IGNvbnN0IENPTU1BTkRfTUFQOiBSZWFkb25seU1hcDxzdHJpbmcsIENvbW1hbmREZWY+ID0gbmV3IE1hcChcbiAgQ09NTUFORFMubWFwKChjKSA9PiBbYy5uYW1lLCBjIGFzIENvbW1hbmREZWZdKSxcbik7XG5cbi8qKiBNQ1AgdG9vbCBuYW1lIGZvciBhIGNvbW1hbmQgKHVuaWZvcm0gcHJlZml4LCBEMTEgdm9jYWJ1bGFyeSkuICovXG5leHBvcnQgZnVuY3Rpb24gbWNwVG9vbE5hbWUoY29tbWFuZDogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIGBvYWhzXyR7Y29tbWFuZH1gO1xufVxuXG4vKiogSlNPTiBTY2hlbWEgZm9yIGEgY29tbWFuZCBpbnB1dCAoem9kIHY0IG5hdGl2ZSBlbWl0dGVyKSBcdTIwMTQgdXNlZCB2ZXJiYXRpbSBhcyB0aGUgTUNQIHRvb2wgaW5wdXRTY2hlbWEuICovXG5leHBvcnQgZnVuY3Rpb24gaW5wdXRKc29uU2NoZW1hKGNvbW1hbmQ6IHN0cmluZyk6IFJlY29yZDxzdHJpbmcsIHVua25vd24+IHtcbiAgY29uc3QgZGVmbiA9IENPTU1BTkRfTUFQLmdldChjb21tYW5kKTtcbiAgaWYgKCFkZWZuKSB0aHJvdyBuZXcgRXJyb3IoYHVua25vd24gY29tbWFuZDogJHtjb21tYW5kfWApO1xuICByZXR1cm4gei50b0pTT05TY2hlbWEoZGVmbi5pbnB1dCkgYXMgUmVjb3JkPHN0cmluZywgdW5rbm93bj47XG59XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gV2lyZSBlbnZlbG9wZVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbi8qKlxuICogRXZlcnkgcmVqZWN0aW9uIGNyb3NzZXMgdGhlIHdpcmUgYXMgYSBtYWNoaW5lLXJlYWRhYmxlIGVudmVsb3BlIGNhcnJ5aW5nXG4gKiB0aGUgY29yZSBlcnJvciBjbGFzcyBuYW1lIFx1MjAxNCBjbGllbnRzIHJldGhyb3cgdGhlIHByb3BlciBjbGFzcywgc28gZXJyb3JcbiAqIHNlbWFudGljcyBzdXJ2aXZlIHRoZSB0cmFuc3BvcnQgKDQwOSBmb3IgY29uZmxpY3RzLCA0MDMgZm9yIHBlcm1pc3Npb24sXG4gKiA0MjIgZm9yIGd1YXJkcy90cmFuc2l0aW9ucy92YWxpZGF0aW9uKS5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBFcnJvckVudmVsb3BlIHtcbiAgb2s6IGZhbHNlO1xuICBlcnJvcjoge1xuICAgIG5hbWU6XG4gICAgICB8ICdQZXJtaXNzaW9uRGVuaWVkRXJyb3InXG4gICAgICB8ICdHdWFyZEZhaWxlZEVycm9yJ1xuICAgICAgfCAnQ29uZmxpY3RFcnJvcidcbiAgICAgIHwgJ0ludmFsaWRUcmFuc2l0aW9uRXJyb3InXG4gICAgICB8ICdTdG9yaWVzVmFsaWRhdGlvbkVycm9yJ1xuICAgICAgfCAnRXJyb3InO1xuICAgIG1lc3NhZ2U6IHN0cmluZztcbiAgfTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBPa0VudmVsb3BlPFQgPSB1bmtub3duPiB7XG4gIG9rOiB0cnVlO1xuICByZXN1bHQ6IFQ7XG59XG5cbmV4cG9ydCB0eXBlIEVudmVsb3BlPFQgPSB1bmtub3duPiA9IE9rRW52ZWxvcGU8VD4gfCBFcnJvckVudmVsb3BlO1xuXG5leHBvcnQgY29uc3QgSFRUUF9TVEFUVVM6IFJlY29yZDxFcnJvckVudmVsb3BlWydlcnJvciddWyduYW1lJ10sIG51bWJlcj4gPSB7XG4gIFBlcm1pc3Npb25EZW5pZWRFcnJvcjogNDAzLFxuICBDb25mbGljdEVycm9yOiA0MDksXG4gIEd1YXJkRmFpbGVkRXJyb3I6IDQyMixcbiAgSW52YWxpZFRyYW5zaXRpb25FcnJvcjogNDIyLFxuICBTdG9yaWVzVmFsaWRhdGlvbkVycm9yOiA0MjIsXG4gIEVycm9yOiA1MDAsXG59O1xuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIENvbW1hbmQgYnVzIGNvbnRyYWN0IChpbXBsZW1lbnRlZCBpbiBhcHBzL3NwaW5lLWFwaSwgY29uc3VtZWQgYnkgYWRhcHRlcnMpXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuZXhwb3J0IGludGVyZmFjZSBBY3RvckNvbnRleHQge1xuICBhY3RvcklkOiBzdHJpbmc7XG4gIGlzQWRtaW46IGJvb2xlYW47XG59XG5cbi8qKlxuICogVGhlIG9uZSBwbGFjZSBjb21tYW5kcyBleGVjdXRlLiBIVFRQIGFuZCBNQ1AgYXJlIHRoaW4gcGFyc2VycyBpbiBmcm9udCBvZlxuICogdGhpczsgbm90aGluZyBlbHNlIHdyaXRlcyBzdGF0ZSAoXHUwMEE3MC4xIFwibm8gd3JpdGVzIG91dHNpZGUgdGhlIGNvbW1hbmQgYnVzXCIpLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIENvbW1hbmRCdXMge1xuICBleGVjdXRlKGNvbW1hbmQ6IHN0cmluZywgaW5wdXQ6IHVua25vd24sIGN0eDogQWN0b3JDb250ZXh0KTogUHJvbWlzZTx1bmtub3duPjtcbiAgcmVhZG9ubHkgZW5naW5lOiBTcGluZUVuZ2luZTtcbn1cblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBUeXBlZCBjbGllbnQgKHVzZWQgYnkgdGhlIG9haHMgQ0xJLCB0aGUgcnVubmVyLCBhbmQgdGVzdHMpXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuZXhwb3J0IGludGVyZmFjZSBDbGllbnRPcHRpb25zIHtcbiAgYmFzZVVybDogc3RyaW5nO1xuICB0b2tlbjogc3RyaW5nO1xuICBmZXRjaEltcGw/OiB0eXBlb2YgZmV0Y2g7XG59XG5cbmV4cG9ydCBjbGFzcyBPYWhzUmVtb3RlRXJyb3IgZXh0ZW5kcyBFcnJvciB7XG4gIGNvbnN0cnVjdG9yKFxuICAgIHB1YmxpYyByZWFkb25seSBlcnJvck5hbWU6IHN0cmluZyxcbiAgICBtZXNzYWdlOiBzdHJpbmcsXG4gICAgcHVibGljIHJlYWRvbmx5IHN0YXR1czogbnVtYmVyLFxuICApIHtcbiAgICBzdXBlcihtZXNzYWdlKTtcbiAgICB0aGlzLm5hbWUgPSBlcnJvck5hbWU7XG4gIH1cbn1cblxuZXhwb3J0IGludGVyZmFjZSBPYWhzQ2xpZW50IHtcbiAgY2FsbDxUID0gdW5rbm93bj4oY29tbWFuZDogQ29tbWFuZE5hbWUsIGlucHV0PzogdW5rbm93bik6IFByb21pc2U8VD47XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBtYWtlQ2xpZW50KG9wdGlvbnM6IENsaWVudE9wdGlvbnMpOiBPYWhzQ2xpZW50IHtcbiAgY29uc3QgZG9GZXRjaCA9IG9wdGlvbnMuZmV0Y2hJbXBsID8/IGZldGNoO1xuICByZXR1cm4ge1xuICAgIGFzeW5jIGNhbGw8VD4oY29tbWFuZDogQ29tbWFuZE5hbWUsIGlucHV0OiB1bmtub3duID0ge30pOiBQcm9taXNlPFQ+IHtcbiAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZG9GZXRjaChgJHtvcHRpb25zLmJhc2VVcmx9L3JwYy8ke2NvbW1hbmR9YCwge1xuICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgICdjb250ZW50LXR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXG4gICAgICAgICAgYXV0aG9yaXphdGlvbjogYEJlYXJlciAke29wdGlvbnMudG9rZW59YCxcbiAgICAgICAgfSxcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoaW5wdXQpLFxuICAgICAgfSk7XG4gICAgICBjb25zdCBlbnZlbG9wZSA9IChhd2FpdCByZXNwb25zZS5qc29uKCkpIGFzIEVudmVsb3BlPFQ+O1xuICAgICAgaWYgKGVudmVsb3BlLm9rKSByZXR1cm4gZW52ZWxvcGUucmVzdWx0O1xuICAgICAgdGhyb3cgbmV3IE9haHNSZW1vdGVFcnJvcihlbnZlbG9wZS5lcnJvci5uYW1lLCBlbnZlbG9wZS5lcnJvci5tZXNzYWdlLCByZXNwb25zZS5zdGF0dXMpO1xuICAgIH0sXG4gIH07XG59XG4iLCAiLyoqXG4gKiBHYXRlLWhvbGRlciBjb21tYW5kIGltcGxlbWVudGF0aW9ucyBcdTIwMTQgcHVyZSBmdW5jdGlvbnMgb3ZlciB0aGUgdHlwZWRcbiAqIGNvbnRyYWN0cyBjbGllbnQ6IChjbGllbnQsIG9wdHMpIFx1MjE5MiBvdXRwdXQgdGV4dC4gY2xpLnRzIG9ubHkgd2lyZXNcbiAqIGNvbW1hbmRlciBvbnRvIHRoZXNlOyB0ZXN0cyBjYWxsIHRoZW0gZGlyZWN0bHkgYWdhaW5zdCBhbiBpbi1wcm9jZXNzXG4gKiBzcGluZS1hcGkuIEV2ZXJ5IG11dGF0aW9uIGdvZXMgdGhyb3VnaCAvcnBjLzxjb21tYW5kPiwgbmV2ZXIgYXJvdW5kIGl0LlxuICovXG5pbXBvcnQgeyByZWFkRmlsZVN5bmMgfSBmcm9tICdub2RlOmZzJztcbmltcG9ydCB7IHJlc29sdmUgfSBmcm9tICdub2RlOnBhdGgnO1xuXG5pbXBvcnQgdHlwZSB7IE9haHNDbGllbnQgfSBmcm9tICdAb2Focy9jb250cmFjdHMnO1xuaW1wb3J0IHsgbGludERvYyB9IGZyb20gJ0BvYWhzL3J1bm5lcic7XG5pbXBvcnQge1xuICBXT1JLX0lURU1fS0lORFMsXG4gIFdPUktfSVRFTV9TVEFURVMsXG4gIHR5cGUgQWN0b3IsXG4gIHR5cGUgQXV0aHpFeHBsYW5hdGlvbixcbiAgdHlwZSBGZWF0dXJlLFxuICB0eXBlIEdhdGVDb2RlLFxuICB0eXBlIEdvdmVybmFuY2VSb2xlLFxuICB0eXBlIFBsYW5Db2RlLFxuICB0eXBlIFJvbGVBc3NpZ25tZW50LFxuICB0eXBlIFNwaW5lRXZlbnQsXG4gIHR5cGUgU3Rvcmllc0ltcG9ydFJlc3VsdCxcbiAgdHlwZSBXb3JrSXRlbSxcbiAgdHlwZSBXb3Jrc3BhY2VQb2xpY3ksXG59IGZyb20gJ0BvYWhzL2NvcmUnO1xuXG5pbXBvcnQgeyByZW5kZXJUYWJsZSwgdHlwZSBDZWxsIH0gZnJvbSAnLi4vZm9ybWF0LmpzJztcblxuLy8gUGhhc2UgMyBjb2xsYWJvcmF0aW9uICsgYWR2aXNvciBib3RzIChyb2FkbWFwIFx1MDBBNzUpIGxpdmUgaW4gY29sbGFiLnRzLlxuZXhwb3J0ICogZnJvbSAnLi9jb2xsYWIuanMnO1xuLy8gUGhhc2UgNSBtZW1vcnkgKyByZXZpZXctY29udmVyZ2VuY2Ugc3RhdHMgKHJvYWRtYXAgXHUwMEE3NikgbGl2ZSBpbiBwaGFzZTUudHMuXG5leHBvcnQgKiBmcm9tICcuL3BoYXNlNS5qcyc7XG4vLyBQaGFzZSA2IG1vZGVsIGdhdGV3YXkgKHJvYWRtYXAgXHUwMEE3Mi41KSBcdTIwMTQgYG9haHMgbW9kZWxzYCAvIGBvYWhzIHBpbmdgLlxuZXhwb3J0ICogZnJvbSAnLi9nYXRld2F5LmpzJztcblxuZXhwb3J0IGNvbnN0IEdBVEVTID0gWydzcGVjX2FwcHJvdmFsJywgJ3Jldmlld19hcHByb3ZhbCddIGFzIGNvbnN0O1xuXG5mdW5jdGlvbiBhc3NlcnRHYXRlKGdhdGU6IHN0cmluZyk6IGFzc2VydHMgZ2F0ZSBpcyBHYXRlQ29kZSB7XG4gIGlmICghKEdBVEVTIGFzIHJlYWRvbmx5IHN0cmluZ1tdKS5pbmNsdWRlcyhnYXRlKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihgaW52YWxpZCAtLWdhdGUgXCIke2dhdGV9XCIgKGV4cGVjdGVkICR7R0FURVMuam9pbignIHwgJyl9KWApO1xuICB9XG59XG5cbmNvbnN0IFdPUktfSVRFTV9IRUFERVJTID0gWydpZCcsICdleHRlcm5hbEtleScsICd0aXRsZScsICdzdGF0ZScsICdibG9ja2VkUmVhc29uJ107XG5cbmZ1bmN0aW9uIHdvcmtJdGVtUm93KGl0ZW06IFdvcmtJdGVtKTogQ2VsbFtdIHtcbiAgcmV0dXJuIFtpdGVtLmlkLCBpdGVtLmV4dGVybmFsS2V5LCBpdGVtLnRpdGxlLCBpdGVtLnN0YXRlLCBpdGVtLmJsb2NrZWRSZWFzb25dO1xufVxuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIGluYm94XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGluYm94Q29tbWFuZChjbGllbnQ6IE9haHNDbGllbnQpOiBQcm9taXNlPHN0cmluZz4ge1xuICBjb25zdCB7IGF3YWl0aW5nU3BlYywgYXdhaXRpbmdSZXZpZXcgfSA9IGF3YWl0IGNsaWVudC5jYWxsPHtcbiAgICBhd2FpdGluZ1NwZWM6IFdvcmtJdGVtW107XG4gICAgYXdhaXRpbmdSZXZpZXc6IFdvcmtJdGVtW107XG4gIH0+KCdpbmJveCcpO1xuICByZXR1cm4gW1xuICAgICdhd2FpdGluZyBzcGVjIGFwcHJvdmFsOicsXG4gICAgcmVuZGVyVGFibGUoV09SS19JVEVNX0hFQURFUlMsIGF3YWl0aW5nU3BlYy5tYXAod29ya0l0ZW1Sb3cpKSxcbiAgICAnJyxcbiAgICAnYXdhaXRpbmcgcmV2aWV3IGRlY2lzaW9uOicsXG4gICAgcmVuZGVyVGFibGUoV09SS19JVEVNX0hFQURFUlMsIGF3YWl0aW5nUmV2aWV3Lm1hcCh3b3JrSXRlbVJvdykpLFxuICBdLmpvaW4oJ1xcbicpO1xufVxuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIGFwcHJvdmUgLyByZWplY3Rcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5leHBvcnQgaW50ZXJmYWNlIEFwcHJvdmVPcHRpb25zIHtcbiAgd29ya0l0ZW1JZDogc3RyaW5nO1xuICBnYXRlOiBzdHJpbmc7XG4gIC8qKiBzcGVjX2FwcHJvdmFsIG9ubHk6IHZlcmlmaWNhdGlvbiBjb21tYW5kcyB0byBwaW4gKHJvYWRtYXAgRDcpLiAqL1xuICBwaW4/OiBzdHJpbmdbXTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGFwcHJvdmVDb21tYW5kKGNsaWVudDogT2Foc0NsaWVudCwgb3B0czogQXBwcm92ZU9wdGlvbnMpOiBQcm9taXNlPHN0cmluZz4ge1xuICBhc3NlcnRHYXRlKG9wdHMuZ2F0ZSk7XG4gIGNvbnN0IGl0ZW0gPSBhd2FpdCBjbGllbnQuY2FsbDxXb3JrSXRlbT4oJ2FwcHJvdmVfZ2F0ZScsIHtcbiAgICB3b3JrSXRlbUlkOiBvcHRzLndvcmtJdGVtSWQsXG4gICAgZ2F0ZTogb3B0cy5nYXRlLFxuICAgIC4uLihvcHRzLnBpbiAhPT0gdW5kZWZpbmVkICYmIG9wdHMucGluLmxlbmd0aCA+IDAgPyB7IHBpbm5lZFZlcmlmaWNhdGlvbjogb3B0cy5waW4gfSA6IHt9KSxcbiAgfSk7XG4gIGNvbnN0IGxpbmVzID0gW1xuICAgIGBhcHByb3ZlZCAke29wdHMuZ2F0ZX0gb24gJHtpdGVtLmV4dGVybmFsS2V5fSAoJHtpdGVtLmlkfSlgLFxuICAgIGBzdGF0ZTogJHtpdGVtLnN0YXRlfWAsXG4gIF07XG4gIGlmIChpdGVtLnBpbm5lZFZlcmlmaWNhdGlvbiAhPT0gbnVsbCAmJiBpdGVtLnBpbm5lZFZlcmlmaWNhdGlvbi5sZW5ndGggPiAwKSB7XG4gICAgbGluZXMucHVzaChgcGlubmVkIHZlcmlmaWNhdGlvbjogJHtpdGVtLnBpbm5lZFZlcmlmaWNhdGlvbi5qb2luKCcgJiYgJyl9YCk7XG4gIH1cbiAgcmV0dXJuIGxpbmVzLmpvaW4oJ1xcbicpO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEFkdmFuY2VPcHRpb25zIHtcbiAgd29ya0l0ZW1JZDogc3RyaW5nO1xuICB0bzogc3RyaW5nO1xuICBmZW5jaW5nVG9rZW4/OiBudW1iZXI7XG59XG5cbi8qKlxuICogUGxhbm5pbmctem9uZSBhZHZhbmNlcyBmb3IgaHVtYW5zIChiYWNrbG9nXHUyMTkyZHJhZnQgd2hlbiB0aGUgUE8gc3RhcnRzXG4gKiBkcmFmdGluZywgZHJhZnRcdTIxOTJyZWFkeV9mb3JfZGV2IG9uIG5vbi1jaGVja3BvaW50IGl0ZW1zKS4gRXhlY3V0aW9uLXpvbmVcbiAqIHRyYW5zaXRpb25zIGJlbG9uZyB0byB0aGUgcnVubmVyLCB3aGljaCBob2xkcyB0aGUgY2xhaW0uXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBhZHZhbmNlQ29tbWFuZChjbGllbnQ6IE9haHNDbGllbnQsIG9wdHM6IEFkdmFuY2VPcHRpb25zKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgY29uc3QgaXRlbSA9IGF3YWl0IGNsaWVudC5jYWxsPFdvcmtJdGVtPignYWR2YW5jZV9zdGF0ZScsIHtcbiAgICB3b3JrSXRlbUlkOiBvcHRzLndvcmtJdGVtSWQsXG4gICAgdG86IG9wdHMudG8sXG4gICAgLi4uKG9wdHMuZmVuY2luZ1Rva2VuICE9PSB1bmRlZmluZWQgPyB7IGZlbmNpbmdUb2tlbjogb3B0cy5mZW5jaW5nVG9rZW4gfSA6IHt9KSxcbiAgfSk7XG4gIHJldHVybiBgYWR2YW5jZWQgJHtpdGVtLmV4dGVybmFsS2V5fSAoJHtpdGVtLmlkfSlcXG5zdGF0ZTogJHtpdGVtLnN0YXRlfWA7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUmVqZWN0T3B0aW9ucyB7XG4gIHdvcmtJdGVtSWQ6IHN0cmluZztcbiAgZ2F0ZTogc3RyaW5nO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVqZWN0Q29tbWFuZChjbGllbnQ6IE9haHNDbGllbnQsIG9wdHM6IFJlamVjdE9wdGlvbnMpOiBQcm9taXNlPHN0cmluZz4ge1xuICBhc3NlcnRHYXRlKG9wdHMuZ2F0ZSk7XG4gIGNvbnN0IGl0ZW0gPSBhd2FpdCBjbGllbnQuY2FsbDxXb3JrSXRlbT4oJ3JlamVjdF9nYXRlJywge1xuICAgIHdvcmtJdGVtSWQ6IG9wdHMud29ya0l0ZW1JZCxcbiAgICBnYXRlOiBvcHRzLmdhdGUsXG4gIH0pO1xuICByZXR1cm4gW1xuICAgIGByZWplY3RlZCAke29wdHMuZ2F0ZX0gb24gJHtpdGVtLmV4dGVybmFsS2V5fSAoJHtpdGVtLmlkfSlgLFxuICAgIGBzdGF0ZTogJHtpdGVtLnN0YXRlfWAsXG4gICAgYGJsb2NrZWRSZWFzb246ICR7aXRlbS5ibG9ja2VkUmVhc29uID8/ICctJ31gLFxuICAgIGByZXZpZXdMb29wSXRlcmF0aW9uOiAke2l0ZW0ucmV2aWV3TG9vcEl0ZXJhdGlvbn1gLFxuICBdLmpvaW4oJ1xcbicpO1xufVxuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIHN0YXR1c1xuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBzdGF0dXNDb21tYW5kKGNsaWVudDogT2Foc0NsaWVudCk6IFByb21pc2U8c3RyaW5nPiB7XG4gIGNvbnN0IGl0ZW1zID0gYXdhaXQgY2xpZW50LmNhbGw8V29ya0l0ZW1bXT4oJ2xpc3Rfd29ya19pdGVtcycpO1xuICBjb25zdCByYW5rID0gbmV3IE1hcDxzdHJpbmcsIG51bWJlcj4oV09SS19JVEVNX1NUQVRFUy5tYXAoKHMsIGkpID0+IFtzLCBpXSkpO1xuICBjb25zdCBzb3J0ZWQgPSBbLi4uaXRlbXNdLnNvcnQoXG4gICAgKGEsIGIpID0+XG4gICAgICAocmFuay5nZXQoYS5zdGF0ZSkgPz8gMCkgLSAocmFuay5nZXQoYi5zdGF0ZSkgPz8gMCkgfHxcbiAgICAgIGEuZXh0ZXJuYWxLZXkubG9jYWxlQ29tcGFyZShiLmV4dGVybmFsS2V5KSxcbiAgKTtcbiAgY29uc3QgZmVhdHVyZUlkcyA9IFsuLi5uZXcgU2V0KGl0ZW1zLm1hcCgoaXRlbSkgPT4gaXRlbS5mZWF0dXJlSWQpKV07XG4gIGNvbnN0IGZlYXR1cmVzOiBGZWF0dXJlW10gPSBbXTtcbiAgZm9yIChjb25zdCBmZWF0dXJlSWQgb2YgZmVhdHVyZUlkcykge1xuICAgIGZlYXR1cmVzLnB1c2goYXdhaXQgY2xpZW50LmNhbGw8RmVhdHVyZT4oJ2dldF9mZWF0dXJlJywgeyBmZWF0dXJlSWQgfSkpO1xuICB9XG4gIHJldHVybiBbXG4gICAgJ3dvcmsgaXRlbXM6JyxcbiAgICByZW5kZXJUYWJsZShcbiAgICAgIFsnc3RhdGUnLCAnaWQnLCAnZXh0ZXJuYWxLZXknLCAndGl0bGUnLCAnYmxvY2tlZFJlYXNvbiddLFxuICAgICAgc29ydGVkLm1hcCgoaXRlbSkgPT4gW2l0ZW0uc3RhdGUsIGl0ZW0uaWQsIGl0ZW0uZXh0ZXJuYWxLZXksIGl0ZW0udGl0bGUsIGl0ZW0uYmxvY2tlZFJlYXNvbl0pLFxuICAgICksXG4gICAgJycsXG4gICAgJ2ZlYXR1cmVzOicsXG4gICAgcmVuZGVyVGFibGUoXG4gICAgICBbJ2lkJywgJ3N0YXRlJywgJ2Rpc3BhdGNoSG9sZCddLFxuICAgICAgZmVhdHVyZXMubWFwKChmZWF0dXJlKSA9PiBbZmVhdHVyZS5pZCwgZmVhdHVyZS5zdGF0ZSwgZmVhdHVyZS5kaXNwYXRjaEhvbGRdKSxcbiAgICApLFxuICBdLmpvaW4oJ1xcbicpO1xufVxuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIGFjdG9yIC8gZ3JhbnRcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5leHBvcnQgaW50ZXJmYWNlIEFjdG9yQ3JlYXRlT3B0aW9ucyB7XG4gIHR5cGU6IHN0cmluZztcbiAgbmFtZTogc3RyaW5nO1xuICAvKiogUGhhc2UgMiAocm9hZG1hcCBcdTAwQTczKTogaW5pdGlhbCBnb3Zlcm5hbmNlIHJvbGUgXHUyMDE0IGFkbWluIGNvbnRleHQgb25seS4gKi9cbiAgZ292ZXJuYW5jZVJvbGU/OiBzdHJpbmc7XG59XG5cbmNvbnN0IEdPVkVSTkFOQ0VfUk9MRVMgPSBbJ2FkbWluJywgJ21lbWJlcicsICdhdWRpdG9yJ10gYXMgY29uc3Q7XG5cbmZ1bmN0aW9uIGFzc2VydEdvdmVybmFuY2VSb2xlKHJvbGU6IHN0cmluZyk6IGFzc2VydHMgcm9sZSBpcyBHb3Zlcm5hbmNlUm9sZSB7XG4gIGlmICghKEdPVkVSTkFOQ0VfUk9MRVMgYXMgcmVhZG9ubHkgc3RyaW5nW10pLmluY2x1ZGVzKHJvbGUpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBpbnZhbGlkIGdvdmVybmFuY2Ugcm9sZSBcIiR7cm9sZX1cIiAoZXhwZWN0ZWQgJHtHT1ZFUk5BTkNFX1JPTEVTLmpvaW4oJyB8ICcpfSlgKTtcbiAgfVxufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gYWN0b3JDcmVhdGVDb21tYW5kKFxuICBjbGllbnQ6IE9haHNDbGllbnQsXG4gIG9wdHM6IEFjdG9yQ3JlYXRlT3B0aW9ucyxcbik6IFByb21pc2U8c3RyaW5nPiB7XG4gIGlmIChvcHRzLnR5cGUgIT09ICd1c2VyJyAmJiBvcHRzLnR5cGUgIT09ICdhZ2VudCcpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYGludmFsaWQgLS10eXBlIFwiJHtvcHRzLnR5cGV9XCIgKGV4cGVjdGVkIHVzZXIgfCBhZ2VudClgKTtcbiAgfVxuICBpZiAob3B0cy5nb3Zlcm5hbmNlUm9sZSAhPT0gdW5kZWZpbmVkKSBhc3NlcnRHb3Zlcm5hbmNlUm9sZShvcHRzLmdvdmVybmFuY2VSb2xlKTtcbiAgY29uc3QgY3JlYXRlZCA9IGF3YWl0IGNsaWVudC5jYWxsPHsgYWN0b3I6IEFjdG9yOyB0b2tlbjogc3RyaW5nIH0+KCdjcmVhdGVfYWN0b3InLCB7XG4gICAgdHlwZTogb3B0cy50eXBlLFxuICAgIGRpc3BsYXlOYW1lOiBvcHRzLm5hbWUsXG4gICAgLi4uKG9wdHMuZ292ZXJuYW5jZVJvbGUgIT09IHVuZGVmaW5lZCA/IHsgZ292ZXJuYW5jZVJvbGU6IG9wdHMuZ292ZXJuYW5jZVJvbGUgfSA6IHt9KSxcbiAgfSk7XG4gIHJldHVybiBbXG4gICAgYGFjdG9ySWQ6ICR7Y3JlYXRlZC5hY3Rvci5pZH1gLFxuICAgIGB0eXBlOiAke2NyZWF0ZWQuYWN0b3IudHlwZX1gLFxuICAgIGBkaXNwbGF5TmFtZTogJHtjcmVhdGVkLmFjdG9yLmRpc3BsYXlOYW1lfWAsXG4gICAgYHRva2VuOiAke2NyZWF0ZWQudG9rZW59YCxcbiAgXS5qb2luKCdcXG4nKTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBHcmFudE9wdGlvbnMge1xuICBhY3RvcklkOiBzdHJpbmc7XG4gIHBlcm1pc3Npb246IHN0cmluZztcbiAgc2NvcGU/OiBzdHJpbmc7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBncmFudENvbW1hbmQoY2xpZW50OiBPYWhzQ2xpZW50LCBvcHRzOiBHcmFudE9wdGlvbnMpOiBQcm9taXNlPHN0cmluZz4ge1xuICBhd2FpdCBjbGllbnQuY2FsbCgnZ3JhbnRfcGVybWlzc2lvbicsIHtcbiAgICBhY3RvcklkOiBvcHRzLmFjdG9ySWQsXG4gICAgcGVybWlzc2lvbjogb3B0cy5wZXJtaXNzaW9uLFxuICAgIC4uLihvcHRzLnNjb3BlICE9PSB1bmRlZmluZWQgPyB7IHNjb3BlOiBvcHRzLnNjb3BlIH0gOiB7fSksXG4gIH0pO1xuICByZXR1cm4gYGdyYW50ZWQgJHtvcHRzLnBlcm1pc3Npb259IHRvICR7b3B0cy5hY3RvcklkfWA7XG59XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gZmVhdHVyZSAvIGltcG9ydFxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBmZWF0dXJlQ3JlYXRlQ29tbWFuZChjbGllbnQ6IE9haHNDbGllbnQpOiBQcm9taXNlPHN0cmluZz4ge1xuICBjb25zdCBmZWF0dXJlID0gYXdhaXQgY2xpZW50LmNhbGw8RmVhdHVyZT4oJ2NyZWF0ZV9mZWF0dXJlJyk7XG4gIHJldHVybiBbYGZlYXR1cmVJZDogJHtmZWF0dXJlLmlkfWAsIGBzdGF0ZTogJHtmZWF0dXJlLnN0YXRlfWBdLmpvaW4oJ1xcbicpO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEltcG9ydFN0b3JpZXNPcHRpb25zIHtcbiAgZmVhdHVyZUlkOiBzdHJpbmc7XG4gIHBhdGg6IHN0cmluZztcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGltcG9ydFN0b3JpZXNDb21tYW5kKFxuICBjbGllbnQ6IE9haHNDbGllbnQsXG4gIG9wdHM6IEltcG9ydFN0b3JpZXNPcHRpb25zLFxuKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgY29uc3QgeWFtbCA9IHJlYWRGaWxlU3luYyhyZXNvbHZlKG9wdHMucGF0aCksICd1dGY4Jyk7XG4gIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGNsaWVudC5jYWxsPFN0b3JpZXNJbXBvcnRSZXN1bHQ+KCdpbXBvcnRfc3RvcmllcycsIHtcbiAgICBmZWF0dXJlSWQ6IG9wdHMuZmVhdHVyZUlkLFxuICAgIHlhbWwsXG4gIH0pO1xuICBjb25zdCBsaXN0ID0gKHZhbHVlczogc3RyaW5nW10pOiBzdHJpbmcgPT4gKHZhbHVlcy5sZW5ndGggPiAwID8gdmFsdWVzLmpvaW4oJywgJykgOiAnKG5vbmUpJyk7XG4gIHJldHVybiBbXG4gICAgYGltcG9ydGVkOiAke2xpc3QocmVzdWx0LmltcG9ydGVkKX1gLFxuICAgIGB1cGRhdGVkOiAke2xpc3QocmVzdWx0LnVwZGF0ZWQpfWAsXG4gICAgYHdhcm5pbmdzOiAke2xpc3QocmVzdWx0Lndhcm5pbmdzKX1gLFxuICBdLmpvaW4oJ1xcbicpO1xufVxuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIGV2ZW50c1xuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbmV4cG9ydCBpbnRlcmZhY2UgRXZlbnRzT3B0aW9ucyB7XG4gIHN0cmVhbUlkPzogc3RyaW5nO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZXZlbnRzQ29tbWFuZChcbiAgY2xpZW50OiBPYWhzQ2xpZW50LFxuICBvcHRzOiBFdmVudHNPcHRpb25zID0ge30sXG4pOiBQcm9taXNlPHN0cmluZz4ge1xuICBjb25zdCBldmVudHMgPSBhd2FpdCBjbGllbnQuY2FsbDxTcGluZUV2ZW50W10+KFxuICAgICdxdWVyeV9ldmVudHMnLFxuICAgIG9wdHMuc3RyZWFtSWQgIT09IHVuZGVmaW5lZCA/IHsgc3RyZWFtSWQ6IG9wdHMuc3RyZWFtSWQgfSA6IHt9LFxuICApO1xuICByZXR1cm4gcmVuZGVyVGFibGUoXG4gICAgWydzZXEnLCAndHlwZScsICdzdHJlYW0nLCAnYWN0b3InXSxcbiAgICBldmVudHMubWFwKChldmVudCkgPT4gW1xuICAgICAgZXZlbnQuZ2xvYmFsU2VxLFxuICAgICAgZXZlbnQudHlwZSxcbiAgICAgIGAke2V2ZW50LnN0cmVhbVR5cGV9LyR7ZXZlbnQuc3RyZWFtSWR9IyR7ZXZlbnQuc3RyZWFtU2VxfWAsXG4gICAgICBldmVudC5hY3RvcklkLFxuICAgIF0pLFxuICApO1xufVxuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIGVudGl0bGVtZW50cyAoUGhhc2UgMiwgcm9hZG1hcCBcdTAwQTczKSBcdTIwMTQgcm9sZSAvIHBsYW4gLyBwb2xpY3kgLyBnb3Zlcm5hbmNlIC8gYXV0aHpcbi8vIEF1dGhvcml0eSBmb3IgdGhlc2Ugd3JpdGVzIGlzIGRlY2lkZWQgYnkgdGhlIEVOR0lORSBmcm9tIHRoZSBjYWxsZXInc1xuLy8gZ292ZXJuYW5jZSByb2xlOyB0aGUgQ0xJIG9ubHkgdmFsaWRhdGVzIHNoYXBlcyBsb2NhbGx5LlxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbmV4cG9ydCBpbnRlcmZhY2UgUm9sZU9wdGlvbnMge1xuICBhY3RvcklkOiBzdHJpbmc7XG4gIHJvbGVDb2RlOiBzdHJpbmc7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByb2xlQXNzaWduQ29tbWFuZChjbGllbnQ6IE9haHNDbGllbnQsIG9wdHM6IFJvbGVPcHRpb25zKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgYXdhaXQgY2xpZW50LmNhbGwoJ2Fzc2lnbl9yb2xlJywgeyBhY3RvcklkOiBvcHRzLmFjdG9ySWQsIHJvbGVDb2RlOiBvcHRzLnJvbGVDb2RlIH0pO1xuICByZXR1cm4gYGFzc2lnbmVkIHJvbGUgJHtvcHRzLnJvbGVDb2RlfSB0byAke29wdHMuYWN0b3JJZH1gO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcm9sZVJldm9rZUNvbW1hbmQoY2xpZW50OiBPYWhzQ2xpZW50LCBvcHRzOiBSb2xlT3B0aW9ucyk6IFByb21pc2U8c3RyaW5nPiB7XG4gIGF3YWl0IGNsaWVudC5jYWxsKCdyZXZva2Vfcm9sZScsIHsgYWN0b3JJZDogb3B0cy5hY3RvcklkLCByb2xlQ29kZTogb3B0cy5yb2xlQ29kZSB9KTtcbiAgcmV0dXJuIGByZXZva2VkIHJvbGUgJHtvcHRzLnJvbGVDb2RlfSBmcm9tICR7b3B0cy5hY3RvcklkfWA7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUm9sZUxpc3RPcHRpb25zIHtcbiAgYWN0b3JJZD86IHN0cmluZztcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJvbGVMaXN0Q29tbWFuZChcbiAgY2xpZW50OiBPYWhzQ2xpZW50LFxuICBvcHRzOiBSb2xlTGlzdE9wdGlvbnMgPSB7fSxcbik6IFByb21pc2U8c3RyaW5nPiB7XG4gIGNvbnN0IGFzc2lnbm1lbnRzID0gYXdhaXQgY2xpZW50LmNhbGw8Um9sZUFzc2lnbm1lbnRbXT4oXG4gICAgJ2xpc3Rfcm9sZV9hc3NpZ25tZW50cycsXG4gICAgb3B0cy5hY3RvcklkICE9PSB1bmRlZmluZWQgPyB7IGFjdG9ySWQ6IG9wdHMuYWN0b3JJZCB9IDoge30sXG4gICk7XG4gIHJldHVybiByZW5kZXJUYWJsZShcbiAgICBbJ2FjdG9ySWQnLCAncm9sZUNvZGUnLCAnZ3JhbnRlZEJ5JywgJ3Jldm9rZWQnXSxcbiAgICBhc3NpZ25tZW50cy5tYXAoKGEpID0+IFthLmFjdG9ySWQsIGEucm9sZUNvZGUsIGEuZ3JhbnRlZEJ5LCBhLnJldm9rZWRdKSxcbiAgKTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBQbGFuU2V0T3B0aW9ucyB7XG4gIHBsYW46IHN0cmluZztcbn1cblxuY29uc3QgUExBTlMgPSBbJ2ZyZWUnLCAndGVhbScsICdlbnRlcnByaXNlJ10gYXMgY29uc3Q7XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBwbGFuU2V0Q29tbWFuZChjbGllbnQ6IE9haHNDbGllbnQsIG9wdHM6IFBsYW5TZXRPcHRpb25zKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgaWYgKCEoUExBTlMgYXMgcmVhZG9ubHkgc3RyaW5nW10pLmluY2x1ZGVzKG9wdHMucGxhbikpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYGludmFsaWQgcGxhbiBcIiR7b3B0cy5wbGFufVwiIChleHBlY3RlZCAke1BMQU5TLmpvaW4oJyB8ICcpfSlgKTtcbiAgfVxuICBjb25zdCByZXN1bHQgPSBhd2FpdCBjbGllbnQuY2FsbDx7IHBsYW46IFBsYW5Db2RlIH0+KCdzZXRfcGxhbicsIHsgcGxhbjogb3B0cy5wbGFuIH0pO1xuICByZXR1cm4gYHBsYW4gc2V0OiAke3Jlc3VsdC5wbGFufSAoYSBjZWlsaW5nIGZvciBhZ2VudCBncmFudHMgXHUyMDE0IG5ldmVyIGEgZ3JhbnQgaXRzZWxmKWA7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUG9saWN5U2V0T3B0aW9ucyB7XG4gIC8qKiAndHJ1ZScgfCAnZmFsc2UnIFx1MjAxNCByZXN0cmljdC1vbmx5IGtleSAocm9hZG1hcCBcdTAwQTczKS4gKi9cbiAgYWdlbnRHYXRlQXBwcm92YWxzPzogc3RyaW5nO1xuICAvKiogJ3RydWUnIHwgJ2ZhbHNlJyBcdTIwMTQgcmVzdHJpY3Qtb25seSBrZXkgKHJvYWRtYXAgXHUwMEE3MykuICovXG4gIGFnZW50U2VsZkRpc3BhdGNoPzogc3RyaW5nO1xufVxuXG5mdW5jdGlvbiBwYXJzZUJvb2xGbGFnKGZsYWc6IHN0cmluZywgdmFsdWU6IHN0cmluZyk6IGJvb2xlYW4ge1xuICBpZiAodmFsdWUgPT09ICd0cnVlJykgcmV0dXJuIHRydWU7XG4gIGlmICh2YWx1ZSA9PT0gJ2ZhbHNlJykgcmV0dXJuIGZhbHNlO1xuICB0aHJvdyBuZXcgRXJyb3IoYGludmFsaWQgJHtmbGFnfSBcIiR7dmFsdWV9XCIgKGV4cGVjdGVkIHRydWUgfCBmYWxzZSlgKTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHBvbGljeVNldENvbW1hbmQoY2xpZW50OiBPYWhzQ2xpZW50LCBvcHRzOiBQb2xpY3lTZXRPcHRpb25zKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgY29uc3QgcG9saWN5OiBXb3Jrc3BhY2VQb2xpY3kgPSB7XG4gICAgLi4uKG9wdHMuYWdlbnRHYXRlQXBwcm92YWxzICE9PSB1bmRlZmluZWRcbiAgICAgID8geyBhZ2VudEdhdGVBcHByb3ZhbHM6IHBhcnNlQm9vbEZsYWcoJy0tYWdlbnQtZ2F0ZS1hcHByb3ZhbHMnLCBvcHRzLmFnZW50R2F0ZUFwcHJvdmFscykgfVxuICAgICAgOiB7fSksXG4gICAgLi4uKG9wdHMuYWdlbnRTZWxmRGlzcGF0Y2ggIT09IHVuZGVmaW5lZFxuICAgICAgPyB7IGFnZW50U2VsZkRpc3BhdGNoOiBwYXJzZUJvb2xGbGFnKCctLWFnZW50LXNlbGYtZGlzcGF0Y2gnLCBvcHRzLmFnZW50U2VsZkRpc3BhdGNoKSB9XG4gICAgICA6IHt9KSxcbiAgfTtcbiAgaWYgKE9iamVjdC5rZXlzKHBvbGljeSkubGVuZ3RoID09PSAwKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdub3RoaW5nIHRvIHNldDogcGFzcyAtLWFnZW50LWdhdGUtYXBwcm92YWxzIGFuZC9vciAtLWFnZW50LXNlbGYtZGlzcGF0Y2gnKTtcbiAgfVxuICBjb25zdCBlZmZlY3RpdmUgPSBhd2FpdCBjbGllbnQuY2FsbDxXb3Jrc3BhY2VQb2xpY3k+KCdzZXRfd29ya3NwYWNlX3BvbGljeScsIHsgcG9saWN5IH0pO1xuICByZXR1cm4gW1xuICAgICd3b3Jrc3BhY2UgcG9saWN5IChyZXN0cmljdC1vbmx5IFx1MjAxNCBuYXJyb3dzIHRoZSBwbGFuLCBuZXZlciB3aWRlbnMgaXQpOicsXG4gICAgYCAgYWdlbnRHYXRlQXBwcm92YWxzOiAke2VmZmVjdGl2ZS5hZ2VudEdhdGVBcHByb3ZhbHMgPz8gJyh1bnNldCknfWAsXG4gICAgYCAgYWdlbnRTZWxmRGlzcGF0Y2g6ICR7ZWZmZWN0aXZlLmFnZW50U2VsZkRpc3BhdGNoID8/ICcodW5zZXQpJ31gLFxuICBdLmpvaW4oJ1xcbicpO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEdhdGVQb2xpY3lTZXRPcHRpb25zIHtcbiAgZ2F0ZTogc3RyaW5nO1xuICBtaW5BcHByb3ZhbHM/OiBzdHJpbmc7XG4gIHJlcXVpcmVUeXBlcz86IHN0cmluZ1tdO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZ2F0ZVBvbGljeVNldENvbW1hbmQoXG4gIGNsaWVudDogT2Foc0NsaWVudCxcbiAgb3B0czogR2F0ZVBvbGljeVNldE9wdGlvbnMsXG4pOiBQcm9taXNlPHN0cmluZz4ge1xuICBhc3NlcnRHYXRlKG9wdHMuZ2F0ZSk7XG4gIGNvbnN0IG1pbkFwcHJvdmFscyA9IG9wdHMubWluQXBwcm92YWxzICE9PSB1bmRlZmluZWQgPyBOdW1iZXIob3B0cy5taW5BcHByb3ZhbHMpIDogdW5kZWZpbmVkO1xuICBpZiAobWluQXBwcm92YWxzICE9PSB1bmRlZmluZWQgJiYgKCFOdW1iZXIuaXNJbnRlZ2VyKG1pbkFwcHJvdmFscykgfHwgbWluQXBwcm92YWxzIDwgMSkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYGludmFsaWQgLS1taW4tYXBwcm92YWxzIFwiJHtvcHRzLm1pbkFwcHJvdmFsc31cIiAoZXhwZWN0ZWQgYSBwb3NpdGl2ZSBpbnRlZ2VyKWApO1xuICB9XG4gIGNvbnN0IHJlcXVpcmVUeXBlcyA9IG9wdHMucmVxdWlyZVR5cGVzID8/IFtdO1xuICBmb3IgKGNvbnN0IHR5cGUgb2YgcmVxdWlyZVR5cGVzKSB7XG4gICAgaWYgKHR5cGUgIT09ICd1c2VyJyAmJiB0eXBlICE9PSAnYWdlbnQnICYmIHR5cGUgIT09ICdzeXN0ZW0nKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYGludmFsaWQgLS1yZXF1aXJlLXR5cGUgXCIke3R5cGV9XCIgKGV4cGVjdGVkIHVzZXIgfCBhZ2VudCB8IHN5c3RlbSlgKTtcbiAgICB9XG4gIH1cbiAgaWYgKG1pbkFwcHJvdmFscyA9PT0gdW5kZWZpbmVkICYmIHJlcXVpcmVUeXBlcy5sZW5ndGggPT09IDApIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ25vdGhpbmcgdG8gc2V0OiBwYXNzIC0tbWluLWFwcHJvdmFscyBhbmQvb3IgLS1yZXF1aXJlLXR5cGUnKTtcbiAgfVxuICBjb25zdCByZXN1bHQgPSBhd2FpdCBjbGllbnQuY2FsbDx7XG4gICAgZ2F0ZTogR2F0ZUNvZGU7XG4gICAgcG9saWN5OiB7IG1pbkFwcHJvdmFscz86IG51bWJlcjsgcmVxdWlyZWRBY3RvclR5cGVzPzogc3RyaW5nW10gfTtcbiAgfT4oJ3NldF9nYXRlX3BvbGljeScsIHtcbiAgICBnYXRlOiBvcHRzLmdhdGUsXG4gICAgcG9saWN5OiB7XG4gICAgICAuLi4obWluQXBwcm92YWxzICE9PSB1bmRlZmluZWQgPyB7IG1pbkFwcHJvdmFscyB9IDoge30pLFxuICAgICAgLi4uKHJlcXVpcmVUeXBlcy5sZW5ndGggPiAwID8geyByZXF1aXJlZEFjdG9yVHlwZXM6IHJlcXVpcmVUeXBlcyB9IDoge30pLFxuICAgIH0sXG4gIH0pO1xuICByZXR1cm4gW1xuICAgIGBnYXRlIHBvbGljeSBzZXQgb24gJHtyZXN1bHQuZ2F0ZX0gKGdhdGUgZGVmaW5pdGlvbnMgYXJlIGRhdGEsIHJvYWRtYXAgXHUwMEE3Myk6YCxcbiAgICBgICBtaW5BcHByb3ZhbHM6ICR7cmVzdWx0LnBvbGljeS5taW5BcHByb3ZhbHMgPz8gMX1gLFxuICAgIGAgIHJlcXVpcmVkQWN0b3JUeXBlczogJHtcbiAgICAgIHJlc3VsdC5wb2xpY3kucmVxdWlyZWRBY3RvclR5cGVzICE9PSB1bmRlZmluZWQgJiYgcmVzdWx0LnBvbGljeS5yZXF1aXJlZEFjdG9yVHlwZXMubGVuZ3RoID4gMFxuICAgICAgICA/IHJlc3VsdC5wb2xpY3kucmVxdWlyZWRBY3RvclR5cGVzLmpvaW4oJywgJylcbiAgICAgICAgOiAnKG5vbmUpJ1xuICAgIH1gLFxuICBdLmpvaW4oJ1xcbicpO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEdvdmVybmFuY2VTZXRPcHRpb25zIHtcbiAgYWN0b3JJZDogc3RyaW5nO1xuICByb2xlOiBzdHJpbmc7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnb3Zlcm5hbmNlU2V0Q29tbWFuZChcbiAgY2xpZW50OiBPYWhzQ2xpZW50LFxuICBvcHRzOiBHb3Zlcm5hbmNlU2V0T3B0aW9ucyxcbik6IFByb21pc2U8c3RyaW5nPiB7XG4gIGFzc2VydEdvdmVybmFuY2VSb2xlKG9wdHMucm9sZSk7XG4gIGF3YWl0IGNsaWVudC5jYWxsKCdzZXRfZ292ZXJuYW5jZV9yb2xlJywgeyBhY3RvcklkOiBvcHRzLmFjdG9ySWQsIHJvbGU6IG9wdHMucm9sZSB9KTtcbiAgcmV0dXJuIGBnb3Zlcm5hbmNlIHJvbGUgb2YgJHtvcHRzLmFjdG9ySWR9IHNldCB0byAke29wdHMucm9sZX1gO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEF1dGh6T3B0aW9ucyB7XG4gIGFjdG9ySWQ6IHN0cmluZztcbiAgcGVybWlzc2lvbjogc3RyaW5nO1xufVxuXG4vKiogSHVtYW4tcmVhZGFibGUgcmVuZGVyaW5nIG9mIHRoZSByZXBsYXlhYmxlIGF1dGh6X2V4cGxhaW4gdHJhY2UgKHJvYWRtYXAgXHUwMEE3MykuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gYXV0aHpDb21tYW5kKGNsaWVudDogT2Foc0NsaWVudCwgb3B0czogQXV0aHpPcHRpb25zKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgY29uc3QgZXhwbGFuYXRpb24gPSBhd2FpdCBjbGllbnQuY2FsbDxBdXRoekV4cGxhbmF0aW9uPignYXV0aHpfZXhwbGFpbicsIHtcbiAgICBhY3RvcklkOiBvcHRzLmFjdG9ySWQsXG4gICAgcGVybWlzc2lvbjogb3B0cy5wZXJtaXNzaW9uLFxuICB9KTtcbiAgcmV0dXJuIFtcbiAgICBgYXV0aHogJHtleHBsYW5hdGlvbi5wZXJtaXNzaW9ufSBmb3IgJHtleHBsYW5hdGlvbi5hY3RvcklkfTogJHtcbiAgICAgIGV4cGxhbmF0aW9uLmFsbG93ZWQgPyAnQUxMT1dFRCcgOiAnREVOSUVEJ1xuICAgIH1gLFxuICAgIGAgIHNvdXJjZTogJHtleHBsYW5hdGlvbi5zb3VyY2UgPz8gJyhubyBncmFudCBcdTIwMTQgZGlyZWN0IG9yIHZpYSByb2xlKSd9YCxcbiAgICBgICBnb3Zlcm5hbmNlUm9sZTogJHtleHBsYW5hdGlvbi5nb3Zlcm5hbmNlUm9sZX1gLFxuICAgIGAgIHBsYW46ICR7ZXhwbGFuYXRpb24ucGxhbn0gKHBsYW5BbGxvd3M6ICR7ZXhwbGFuYXRpb24ucGxhbkFsbG93c30pYCxcbiAgICBgICBwb2xpY3lBbGxvd3M6ICR7ZXhwbGFuYXRpb24ucG9saWN5QWxsb3dzfWAsXG4gICAgYCAgdmVyc2lvbnM6IHBsYW4gdiR7ZXhwbGFuYXRpb24udmVyc2lvbnMucGxhbn0sIHBvbGljeSB2JHtleHBsYW5hdGlvbi52ZXJzaW9ucy5wb2xpY3l9YCxcbiAgXS5qb2luKCdcXG4nKTtcbn1cblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBQaGFzZSA0IChyb2FkbWFwIEJ1aWxkIHBoYXNlcyArIFx1MDBBNzEuNCk6IG5vbi1jb2RpbmcgdGVhbW1hdGVzIG9uIHRoZSBzYW1lXG4vLyByYWlscyBcdTIwMTQgYWN0b3JzIHBpY2tlciBkYXRhLCBwZXJzb25hIHByb3Zpc2lvbmluZywgZGlyZWN0IHdvcmstaXRlbVxuLy8gY3JlYXRpb24gd2l0aCBhIGtpbmQsIGFuZCB0aGUgZGV0ZXJtaW5pc3RpYyBkb2N1bWVudCBsaW50LlxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbi8qKiBgb2FocyBhY3RvcnNgIFx1MjAxNCBldmVyeW9uZSBvbiB0aGUgcmFpbHM6IGh1bWFucywgYWdlbnRzLCBwZXJzb25hcywgc3lzdGVtLiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGFjdG9yc0NvbW1hbmQoY2xpZW50OiBPYWhzQ2xpZW50KTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgY29uc3QgYWN0b3JzID0gYXdhaXQgY2xpZW50LmNhbGw8QWN0b3JbXT4oJ2xpc3RfYWN0b3JzJyk7XG4gIHJldHVybiByZW5kZXJUYWJsZShcbiAgICBbJ2lkJywgJ3R5cGUnLCAnZGlzcGxheU5hbWUnLCAncGVyc29uYUNvZGUnXSxcbiAgICBhY3RvcnMubWFwKChhY3RvcikgPT4gW2FjdG9yLmlkLCBhY3Rvci50eXBlLCBhY3Rvci5kaXNwbGF5TmFtZSwgYWN0b3IucGVyc29uYUNvZGVdKSxcbiAgKTtcbn1cblxuLyoqIGBvYWhzIHBlcnNvbmFzIHByb3Zpc2lvbmAgXHUyMDE0IGlkZW1wb3RlbnQsIGVuZ2luZS1nb3Zlcm5hbmNlLWdhdGVkLiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHBlcnNvbmFzUHJvdmlzaW9uQ29tbWFuZChjbGllbnQ6IE9haHNDbGllbnQpOiBQcm9taXNlPHN0cmluZz4ge1xuICBjb25zdCBwZXJzb25hcyA9IGF3YWl0IGNsaWVudC5jYWxsPEFjdG9yW10+KCdwcm92aXNpb25fcGVyc29uYXMnKTtcbiAgcmV0dXJuIFtcbiAgICBgcHJvdmlzaW9uZWQgJHtwZXJzb25hcy5sZW5ndGh9IHBlcnNvbmFzIChpZGVtcG90ZW50OyBmbG9vci1zdGF0ZSByb2xlcywgemVybyBnYXRlIGF1dGhvcml0eSk6YCxcbiAgICByZW5kZXJUYWJsZShcbiAgICAgIFsnaWQnLCAnZGlzcGxheU5hbWUnLCAncGVyc29uYUNvZGUnXSxcbiAgICAgIHBlcnNvbmFzLm1hcCgoYWN0b3IpID0+IFthY3Rvci5pZCwgYWN0b3IuZGlzcGxheU5hbWUsIGFjdG9yLnBlcnNvbmFDb2RlXSksXG4gICAgKSxcbiAgXS5qb2luKCdcXG4nKTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBJdGVtQ3JlYXRlT3B0aW9ucyB7XG4gIGZlYXR1cmVJZDogc3RyaW5nO1xuICBleHRlcm5hbEtleTogc3RyaW5nO1xuICB0aXRsZTogc3RyaW5nO1xuICAvKiogV29yay1pdGVtIGtpbmQ7IGRlZmF1bHQgJ2NvZGUnLiBTZWxlY3RzIGV2aWRlbmNlIGd1YXJkcywgbmV2ZXIgZ2F0ZSBhdXRob3JpdHkuICovXG4gIGtpbmQ/OiBzdHJpbmc7XG4gIHNwZWNDaGVja3BvaW50PzogYm9vbGVhbjtcbiAgZG9uZUNoZWNrcG9pbnQ/OiBib29sZWFuO1xuICBpbnZva2VEZXZXaXRoPzogc3RyaW5nO1xuICBkZXBlbmRzT24/OiBzdHJpbmdbXTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGl0ZW1DcmVhdGVDb21tYW5kKFxuICBjbGllbnQ6IE9haHNDbGllbnQsXG4gIG9wdHM6IEl0ZW1DcmVhdGVPcHRpb25zLFxuKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgaWYgKG9wdHMua2luZCAhPT0gdW5kZWZpbmVkICYmICEoV09SS19JVEVNX0tJTkRTIGFzIHJlYWRvbmx5IHN0cmluZ1tdKS5pbmNsdWRlcyhvcHRzLmtpbmQpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBpbnZhbGlkIC0ta2luZCBcIiR7b3B0cy5raW5kfVwiIChleHBlY3RlZCAke1dPUktfSVRFTV9LSU5EUy5qb2luKCcgfCAnKX0pYCk7XG4gIH1cbiAgY29uc3QgaXRlbSA9IGF3YWl0IGNsaWVudC5jYWxsPFdvcmtJdGVtPignY3JlYXRlX3dvcmtfaXRlbScsIHtcbiAgICBmZWF0dXJlSWQ6IG9wdHMuZmVhdHVyZUlkLFxuICAgIGV4dGVybmFsS2V5OiBvcHRzLmV4dGVybmFsS2V5LFxuICAgIHRpdGxlOiBvcHRzLnRpdGxlLFxuICAgIC4uLihvcHRzLmtpbmQgIT09IHVuZGVmaW5lZCA/IHsga2luZDogb3B0cy5raW5kIH0gOiB7fSksXG4gICAgLi4uKG9wdHMuc3BlY0NoZWNrcG9pbnQgIT09IHVuZGVmaW5lZCA/IHsgc3BlY0NoZWNrcG9pbnQ6IG9wdHMuc3BlY0NoZWNrcG9pbnQgfSA6IHt9KSxcbiAgICAuLi4ob3B0cy5kb25lQ2hlY2twb2ludCAhPT0gdW5kZWZpbmVkID8geyBkb25lQ2hlY2twb2ludDogb3B0cy5kb25lQ2hlY2twb2ludCB9IDoge30pLFxuICAgIC4uLihvcHRzLmludm9rZURldldpdGggIT09IHVuZGVmaW5lZCA/IHsgaW52b2tlRGV2V2l0aDogb3B0cy5pbnZva2VEZXZXaXRoIH0gOiB7fSksXG4gICAgLi4uKG9wdHMuZGVwZW5kc09uICE9PSB1bmRlZmluZWQgJiYgb3B0cy5kZXBlbmRzT24ubGVuZ3RoID4gMFxuICAgICAgPyB7IGRlcGVuZHNPbjogb3B0cy5kZXBlbmRzT24gfVxuICAgICAgOiB7fSksXG4gIH0pO1xuICByZXR1cm4gW1xuICAgIGBjcmVhdGVkICR7aXRlbS5leHRlcm5hbEtleX0gKCR7aXRlbS5pZH0pYCxcbiAgICBga2luZDogJHtpdGVtLmtpbmR9YCxcbiAgICBgc3RhdGU6ICR7aXRlbS5zdGF0ZX1gLFxuICAgIGBzcGVjQ2hlY2twb2ludDogJHtpdGVtLnNwZWNDaGVja3BvaW50fWAsXG4gIF0uam9pbignXFxuJyk7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgRG9jbGludE9wdGlvbnMge1xuICAvKiogUGF0aCBvZiB0aGUgZG9jdW1lbnQgdG8gbGludC4gKi9cbiAgcGF0aDogc3RyaW5nO1xuICAvKiogUmVxdWlyZWQgYCMjIDxuYW1lPmAgc2VjdGlvbnMgKHJlcGVhdGFibGUgZmxhZykuICovXG4gIHJlcXVpcmVTZWN0aW9ucz86IHN0cmluZ1tdO1xuICAvKiogU3VibWl0IHRoZSByZXN1bHQgYXMgZG9jX2xpbnQgZXZpZGVuY2Ugb24gdGhpcyB3b3JrIGl0ZW0uICovXG4gIHdvcmtJdGVtSWQ/OiBzdHJpbmc7XG4gIHN1Ym1pdD86IGJvb2xlYW47XG4gIGZlbmNpbmdUb2tlbj86IG51bWJlcjtcbn1cblxuLyoqXG4gKiBgb2FocyBkb2NsaW50IDxmaWxlPmAgXHUyMDE0IHJ1biB0aGUgZGV0ZXJtaW5pc3RpYyBsaW50IChhIE1FQVNVUklORyB0b29sLCBub1xuICogTExNKTsgd2l0aCAtLXN1Ym1pdCB0aGUgcmF3IHtzY2hlbWFWYWxpZCwgZmluZGluZ3N9IGdvZXMgb250byB0aGUgcmFpbHMgYXNcbiAqIGRvY19saW50IGV2aWRlbmNlIGFuZCB0aGUgQ09SRSBkZWNpZGVzIHdoYXQgaXQgZ2F0ZXMuIEV4aXQgMSBvbiBhIGZhaWxpbmdcbiAqIGxpbnQgc28gc2NyaXB0cyBjYW4gY2hhaW4gb24gaXQuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBkb2NsaW50Q29tbWFuZChcbiAgY2xpZW50OiBPYWhzQ2xpZW50IHwgbnVsbCxcbiAgb3B0czogRG9jbGludE9wdGlvbnMsXG4pOiBQcm9taXNlPENvbW1hbmRPdXRwdXQ+IHtcbiAgY29uc3QgY29udGVudCA9IHJlYWRGaWxlU3luYyhyZXNvbHZlKG9wdHMucGF0aCksICd1dGY4Jyk7XG4gIGNvbnN0IHJlc3VsdCA9IGxpbnREb2MoY29udGVudCwge1xuICAgIC4uLihvcHRzLnJlcXVpcmVTZWN0aW9ucyAhPT0gdW5kZWZpbmVkID8geyByZXF1aXJlZFNlY3Rpb25zOiBvcHRzLnJlcXVpcmVTZWN0aW9ucyB9IDoge30pLFxuICB9KTtcbiAgY29uc3QgbGluZXMgPSBbXG4gICAgYGRvY2xpbnQgJHtvcHRzLnBhdGh9OiAke3Jlc3VsdC5zY2hlbWFWYWxpZCA/ICdzY2hlbWEtdmFsaWQnIDogJ05PVCBzY2hlbWEtdmFsaWQnfWAsXG4gICAgLi4ucmVzdWx0LmZpbmRpbmdzLm1hcCgoZmluZGluZykgPT4gYCAgLSAke2ZpbmRpbmd9YCksXG4gIF07XG4gIGlmIChvcHRzLnN1Ym1pdCA9PT0gdHJ1ZSkge1xuICAgIGlmIChvcHRzLndvcmtJdGVtSWQgPT09IHVuZGVmaW5lZCkgdGhyb3cgbmV3IEVycm9yKCctLXN1Ym1pdCByZXF1aXJlcyAtLXdvcmstaXRlbSA8aWQ+Jyk7XG4gICAgaWYgKGNsaWVudCA9PT0gbnVsbCkgdGhyb3cgbmV3IEVycm9yKCctLXN1Ym1pdCByZXF1aXJlcyBhIGNsaWVudCAodG9rZW4gKyB1cmwpJyk7XG4gICAgYXdhaXQgY2xpZW50LmNhbGwoJ3N1Ym1pdF9ldmlkZW5jZScsIHtcbiAgICAgIHdvcmtJdGVtSWQ6IG9wdHMud29ya0l0ZW1JZCxcbiAgICAgIGV2aWRlbmNlOiB7XG4gICAgICAgIGtpbmQ6ICdkb2NfbGludCcsXG4gICAgICAgIHBheWxvYWQ6IHsgc2NoZW1hVmFsaWQ6IHJlc3VsdC5zY2hlbWFWYWxpZCwgZmluZGluZ3M6IHJlc3VsdC5maW5kaW5ncyB9LFxuICAgICAgfSxcbiAgICAgIC4uLihvcHRzLmZlbmNpbmdUb2tlbiAhPT0gdW5kZWZpbmVkID8geyBmZW5jaW5nVG9rZW46IG9wdHMuZmVuY2luZ1Rva2VuIH0gOiB7fSksXG4gICAgfSk7XG4gICAgbGluZXMucHVzaChgc3VibWl0dGVkIGRvY19saW50IGV2aWRlbmNlIG9uICR7b3B0cy53b3JrSXRlbUlkfWApO1xuICB9XG4gIHJldHVybiB7IHRleHQ6IGxpbmVzLmpvaW4oJ1xcbicpLCBleGl0Q29kZTogcmVzdWx0LnNjaGVtYVZhbGlkID8gMCA6IDEgfTtcbn1cblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBvdXRwdXQgaGFybmVzcyAoc2hhcmVkIGJ5IGNsaS50cyBhbmQgdGhlIHRlc3RzKVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbmV4cG9ydCBpbnRlcmZhY2UgQ29tbWFuZE91dHB1dCB7XG4gIHRleHQ6IHN0cmluZztcbiAgZXhpdENvZGU6IG51bWJlcjtcbn1cblxuLyoqXG4gKiBSdW4gb25lIGNvbW1hbmQgZnVuY3Rpb24gdG8gYSBwcmludGFibGUgb3V0Y29tZTogc3VjY2VzcyBcdTIxOTIgaXRzIHRleHQgd2l0aFxuICogZXhpdCAwOyBmYWlsdXJlIFx1MjE5MiBgPGVycm9yLm5hbWU+OiA8bWVzc2FnZT5gIChPYWhzUmVtb3RlRXJyb3IgY2FycmllcyB0aGVcbiAqIHdpcmUgZXJyb3IgY2xhc3MgbmFtZSkgd2l0aCBleGl0IDEuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBydW5Ub091dHB1dChmbjogKCkgPT4gUHJvbWlzZTxzdHJpbmc+KTogUHJvbWlzZTxDb21tYW5kT3V0cHV0PiB7XG4gIHRyeSB7XG4gICAgcmV0dXJuIHsgdGV4dDogYXdhaXQgZm4oKSwgZXhpdENvZGU6IDAgfTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBpZiAoZXJyb3IgaW5zdGFuY2VvZiBFcnJvcikge1xuICAgICAgcmV0dXJuIHsgdGV4dDogYCR7ZXJyb3IubmFtZX06ICR7ZXJyb3IubWVzc2FnZX1gLCBleGl0Q29kZTogMSB9O1xuICAgIH1cbiAgICByZXR1cm4geyB0ZXh0OiBTdHJpbmcoZXJyb3IpLCBleGl0Q29kZTogMSB9O1xuICB9XG59XG4iLCAiLyoqXG4gKiBQbGFpbi10ZXh0IHRhYmxlIHJlbmRlcmluZyBcdTIwMTQgZGVsaWJlcmF0ZWx5IGRlcGVuZGVuY3ktZnJlZSAoc3RvcnkgMTM6XG4gKiBcImJcdTFFQTNuZyB0ZXh0IFx1MDExMVx1MDFBMW4gZ2lcdTFFQTNuLCBraFx1MDBGNG5nIGRlcCBiXHUxRUEzbmcgbmdvXHUwMEUwaVwiKS4gTW9ub3NwYWNlIGNvbHVtbnMgcGFkZGVkIHRvXG4gKiB0aGUgd2lkZXN0IGNlbGw7IGFuIGVtcHR5IHJvdyBzZXQgcmVuZGVycyBhcyBcIihlbXB0eSlcIi5cbiAqL1xuXG5leHBvcnQgdHlwZSBDZWxsID0gc3RyaW5nIHwgbnVtYmVyIHwgYm9vbGVhbiB8IG51bGwgfCB1bmRlZmluZWQ7XG5cbmZ1bmN0aW9uIHRvVGV4dChjZWxsOiBDZWxsKTogc3RyaW5nIHtcbiAgaWYgKGNlbGwgPT09IG51bGwgfHwgY2VsbCA9PT0gdW5kZWZpbmVkKSByZXR1cm4gJy0nO1xuICByZXR1cm4gU3RyaW5nKGNlbGwpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVuZGVyVGFibGUoaGVhZGVyczogc3RyaW5nW10sIHJvd3M6IENlbGxbXVtdKTogc3RyaW5nIHtcbiAgaWYgKHJvd3MubGVuZ3RoID09PSAwKSByZXR1cm4gJyhlbXB0eSknO1xuICBjb25zdCB0ZXh0Um93cyA9IHJvd3MubWFwKChyb3cpID0+IHJvdy5tYXAodG9UZXh0KSk7XG4gIGNvbnN0IHdpZHRocyA9IGhlYWRlcnMubWFwKChoZWFkZXIsIGNvbCkgPT5cbiAgICBNYXRoLm1heChoZWFkZXIubGVuZ3RoLCAuLi50ZXh0Um93cy5tYXAoKHJvdykgPT4gKHJvd1tjb2xdID8/ICcnKS5sZW5ndGgpKSxcbiAgKTtcbiAgY29uc3QgbGluZSA9IChjZWxsczogc3RyaW5nW10pOiBzdHJpbmcgPT5cbiAgICBjZWxscy5tYXAoKGNlbGwsIGNvbCkgPT4gY2VsbC5wYWRFbmQod2lkdGhzW2NvbF0gPz8gY2VsbC5sZW5ndGgpKS5qb2luKCcgICcpLnRyaW1FbmQoKTtcbiAgY29uc3Qgc2VwYXJhdG9yID0gd2lkdGhzLm1hcCgodykgPT4gJy0nLnJlcGVhdCh3KSkuam9pbignICAnKTtcbiAgcmV0dXJuIFtsaW5lKGhlYWRlcnMpLCBzZXBhcmF0b3IsIC4uLnRleHRSb3dzLm1hcChsaW5lKV0uam9pbignXFxuJyk7XG59XG4iLCAiLyoqXG4gKiBQaGFzZSAzIGNvbGxhYm9yYXRpb24gY29tbWFuZHMgKHJvYWRtYXAgXHUwMEE3NSkgKyB0aGUgYWR2aXNvciBib3RzIFx1MjAxNCBwdXJlXG4gKiBmdW5jdGlvbnMgb3ZlciB0aGUgdHlwZWQgY29udHJhY3RzIGNsaWVudCwgc2FtZSBzaGFwZSBhcyBjb21tYW5kcy9pbmRleC50cy5cbiAqXG4gKiBUaGUgYWR2aXNvciBib3RzIGFyZSB0aGUgXCJhZ2VudGlmeSBXSVRIT1VUIHRvdWNoaW5nIHRoZSBzcGluZVwiIHBhdHRlcm5cbiAqICh0aGVzaXMgXHUwMEE3NSk6IGRldGVybWluaXN0aWMgcmVhZCArIHBvc3QsIE5PIExMTSwgTk8gbGlmZWN5Y2xlIG11dGF0aW9uLlxuICogVGhleSBydW4gdW5kZXIgd2hhdGV2ZXIgdG9rZW4gdGhlIGNhbGxlciBob2xkcyBhbmQgb25seSBuZWVkIHRoZSByaWdodCB0b1xuICogcG9zdCBpbnRvIGFuIG9wZW4gdGhyZWFkIFx1MjAxNCB0aGUgYXVkaXQgdHJhaWwgc2hvd3MgemVybyBnYXRlcywgemVyb1xuICogdHJhbnNpdGlvbnMgZnJvbSB0aGVtLlxuICovXG5pbXBvcnQgdHlwZSB7IE9haHNDbGllbnQgfSBmcm9tICdAb2Focy9jb250cmFjdHMnO1xuaW1wb3J0IHR5cGUge1xuICBBZ2VudEpvYixcbiAgRGl2ZXJnZW5jZVJlcG9ydCxcbiAgTWVzc2FnZSxcbiAgTWVudGlvbixcbiAgTm90aWZpY2F0aW9uLFxuICBUaHJlYWQsXG4gIFRocmVhZEtpbmQsXG4gIFRocmVhZFZpc2liaWxpdHksXG4gIFdvcmtJdGVtLFxufSBmcm9tICdAb2Focy9jb3JlJztcblxuaW1wb3J0IHsgcmVuZGVyVGFibGUgfSBmcm9tICcuLi9mb3JtYXQuanMnO1xuXG5jb25zdCBUSFJFQURfS0lORFMgPSBbJ3NwZWMnLCAnZGVzaWduJywgJ3Rhc2snLCAnZ2VuZXJhbCcsICdwcml2YXRlJ10gYXMgY29uc3Q7XG5jb25zdCBWSVNJQklMSVRJRVMgPSBbJ29wZW4nLCAncHJpdmF0ZSddIGFzIGNvbnN0O1xuY29uc3QgSk9CX1NUQVRVU0VTID0gWydxdWV1ZWQnLCAnZG9uZScsICdibG9ja2VkJ10gYXMgY29uc3Q7XG5cbmZ1bmN0aW9uIGFzc2VydFRocmVhZEtpbmQoa2luZDogc3RyaW5nKTogYXNzZXJ0cyBraW5kIGlzIFRocmVhZEtpbmQge1xuICBpZiAoIShUSFJFQURfS0lORFMgYXMgcmVhZG9ubHkgc3RyaW5nW10pLmluY2x1ZGVzKGtpbmQpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBpbnZhbGlkIC0ta2luZCBcIiR7a2luZH1cIiAoZXhwZWN0ZWQgJHtUSFJFQURfS0lORFMuam9pbignIHwgJyl9KWApO1xuICB9XG59XG5cbmZ1bmN0aW9uIGFzc2VydFZpc2liaWxpdHkodmlzaWJpbGl0eTogc3RyaW5nKTogYXNzZXJ0cyB2aXNpYmlsaXR5IGlzIFRocmVhZFZpc2liaWxpdHkge1xuICBpZiAoIShWSVNJQklMSVRJRVMgYXMgcmVhZG9ubHkgc3RyaW5nW10pLmluY2x1ZGVzKHZpc2liaWxpdHkpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBpbnZhbGlkIC0tdmlzaWJpbGl0eSBcIiR7dmlzaWJpbGl0eX1cIiAoZXhwZWN0ZWQgJHtWSVNJQklMSVRJRVMuam9pbignIHwgJyl9KWApO1xuICB9XG59XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gdGhyZWFkIGNyZWF0ZSAvIGxpc3Rcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5leHBvcnQgaW50ZXJmYWNlIFRocmVhZENyZWF0ZU9wdGlvbnMge1xuICBraW5kOiBzdHJpbmc7XG4gIGZlYXR1cmVJZD86IHN0cmluZztcbiAgd29ya0l0ZW1JZD86IHN0cmluZztcbiAgdmlzaWJpbGl0eT86IHN0cmluZztcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHRocmVhZENyZWF0ZUNvbW1hbmQoXG4gIGNsaWVudDogT2Foc0NsaWVudCxcbiAgb3B0czogVGhyZWFkQ3JlYXRlT3B0aW9ucyxcbik6IFByb21pc2U8c3RyaW5nPiB7XG4gIGFzc2VydFRocmVhZEtpbmQob3B0cy5raW5kKTtcbiAgaWYgKG9wdHMudmlzaWJpbGl0eSAhPT0gdW5kZWZpbmVkKSBhc3NlcnRWaXNpYmlsaXR5KG9wdHMudmlzaWJpbGl0eSk7XG4gIGNvbnN0IHRocmVhZCA9IGF3YWl0IGNsaWVudC5jYWxsPFRocmVhZD4oJ2NyZWF0ZV90aHJlYWQnLCB7XG4gICAga2luZDogb3B0cy5raW5kLFxuICAgIC4uLihvcHRzLmZlYXR1cmVJZCAhPT0gdW5kZWZpbmVkID8geyBmZWF0dXJlSWQ6IG9wdHMuZmVhdHVyZUlkIH0gOiB7fSksXG4gICAgLi4uKG9wdHMud29ya0l0ZW1JZCAhPT0gdW5kZWZpbmVkID8geyB3b3JrSXRlbUlkOiBvcHRzLndvcmtJdGVtSWQgfSA6IHt9KSxcbiAgICAuLi4ob3B0cy52aXNpYmlsaXR5ICE9PSB1bmRlZmluZWQgPyB7IHZpc2liaWxpdHk6IG9wdHMudmlzaWJpbGl0eSB9IDoge30pLFxuICB9KTtcbiAgcmV0dXJuIFtcbiAgICBgdGhyZWFkSWQ6ICR7dGhyZWFkLmlkfWAsXG4gICAgYGtpbmQ6ICR7dGhyZWFkLmtpbmR9YCxcbiAgICBgdmlzaWJpbGl0eTogJHt0aHJlYWQudmlzaWJpbGl0eX1gLFxuICAgIGBmZWF0dXJlSWQ6ICR7dGhyZWFkLmZlYXR1cmVJZCA/PyAnLSd9YCxcbiAgICBgd29ya0l0ZW1JZDogJHt0aHJlYWQud29ya0l0ZW1JZCA/PyAnLSd9YCxcbiAgXS5qb2luKCdcXG4nKTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBUaHJlYWRMaXN0T3B0aW9ucyB7XG4gIGZlYXR1cmVJZD86IHN0cmluZztcbiAgd29ya0l0ZW1JZD86IHN0cmluZztcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHRocmVhZExpc3RDb21tYW5kKFxuICBjbGllbnQ6IE9haHNDbGllbnQsXG4gIG9wdHM6IFRocmVhZExpc3RPcHRpb25zID0ge30sXG4pOiBQcm9taXNlPHN0cmluZz4ge1xuICBjb25zdCB0aHJlYWRzID0gYXdhaXQgY2xpZW50LmNhbGw8VGhyZWFkW10+KCdsaXN0X3RocmVhZHMnLCB7XG4gICAgLi4uKG9wdHMuZmVhdHVyZUlkICE9PSB1bmRlZmluZWQgPyB7IGZlYXR1cmVJZDogb3B0cy5mZWF0dXJlSWQgfSA6IHt9KSxcbiAgICAuLi4ob3B0cy53b3JrSXRlbUlkICE9PSB1bmRlZmluZWQgPyB7IHdvcmtJdGVtSWQ6IG9wdHMud29ya0l0ZW1JZCB9IDoge30pLFxuICB9KTtcbiAgcmV0dXJuIHJlbmRlclRhYmxlKFxuICAgIFsnaWQnLCAna2luZCcsICd2aXNpYmlsaXR5JywgJ2ZlYXR1cmVJZCcsICd3b3JrSXRlbUlkJywgJ2NyZWF0ZWRCeSddLFxuICAgIHRocmVhZHMubWFwKCh0KSA9PiBbdC5pZCwgdC5raW5kLCB0LnZpc2liaWxpdHksIHQuZmVhdHVyZUlkLCB0LndvcmtJdGVtSWQsIHQuY3JlYXRlZEJ5XSksXG4gICk7XG59XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gcG9zdCAvIG1lc3NhZ2VzXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuZXhwb3J0IGludGVyZmFjZSBQb3N0T3B0aW9ucyB7XG4gIHRocmVhZElkOiBzdHJpbmc7XG4gIGJvZHk6IHN0cmluZztcbiAgLyoqIFNUUlVDVFVSRUQgbWVudGlvbnMgXHUyMDE0IGFjdG9yIGlkcywgbmV2ZXIgcGFyc2VkIGZyb20gdGhlIGJvZHkgKFx1MDBBNzUuMikuICovXG4gIG1lbnRpb25zPzogc3RyaW5nW107XG4gIHJlcGx5VG8/OiBzdHJpbmc7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBwb3N0Q29tbWFuZChjbGllbnQ6IE9haHNDbGllbnQsIG9wdHM6IFBvc3RPcHRpb25zKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgY29uc3QgbWVzc2FnZSA9IGF3YWl0IGNsaWVudC5jYWxsPE1lc3NhZ2U+KCdwb3N0X21lc3NhZ2UnLCB7XG4gICAgdGhyZWFkSWQ6IG9wdHMudGhyZWFkSWQsXG4gICAgYm9keTogb3B0cy5ib2R5LFxuICAgIC4uLihvcHRzLnJlcGx5VG8gIT09IHVuZGVmaW5lZCA/IHsgcmVwbHlUbzogb3B0cy5yZXBseVRvIH0gOiB7fSksXG4gICAgLi4uKG9wdHMubWVudGlvbnMgIT09IHVuZGVmaW5lZCAmJiBvcHRzLm1lbnRpb25zLmxlbmd0aCA+IDAgPyB7IG1lbnRpb25zOiBvcHRzLm1lbnRpb25zIH0gOiB7fSksXG4gIH0pO1xuICBjb25zdCBsaW5lcyA9IFtgcG9zdGVkICMke21lc3NhZ2Uuc2VxfSAoJHttZXNzYWdlLmlkfSkgdG8gJHttZXNzYWdlLnRocmVhZElkfWBdO1xuICBpZiAob3B0cy5tZW50aW9ucyAhPT0gdW5kZWZpbmVkICYmIG9wdHMubWVudGlvbnMubGVuZ3RoID4gMCkge1xuICAgIGNvbnN0IG1lbnRpb25zID0gYXdhaXQgY2xpZW50LmNhbGw8TWVudGlvbltdPignbGlzdF9tZW50aW9ucycsIHsgbWVzc2FnZUlkOiBtZXNzYWdlLmlkIH0pO1xuICAgIGZvciAoY29uc3QgbWVudGlvbiBvZiBtZW50aW9ucykge1xuICAgICAgbGluZXMucHVzaChgbWVudGlvbiAke21lbnRpb24ubWVudGlvbmVkQWN0b3JJZH06ICR7bWVudGlvbi5yZXNvbHV0aW9ufWApO1xuICAgIH1cbiAgfVxuICByZXR1cm4gbGluZXMuam9pbignXFxuJyk7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgTWVzc2FnZXNPcHRpb25zIHtcbiAgdGhyZWFkSWQ6IHN0cmluZztcbiAgc2luY2VTZXE/OiBudW1iZXI7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBtZXNzYWdlc0NvbW1hbmQoY2xpZW50OiBPYWhzQ2xpZW50LCBvcHRzOiBNZXNzYWdlc09wdGlvbnMpOiBQcm9taXNlPHN0cmluZz4ge1xuICBjb25zdCBtZXNzYWdlcyA9IGF3YWl0IGNsaWVudC5jYWxsPE1lc3NhZ2VbXT4oJ2xpc3RfbWVzc2FnZXMnLCB7XG4gICAgdGhyZWFkSWQ6IG9wdHMudGhyZWFkSWQsXG4gICAgLi4uKG9wdHMuc2luY2VTZXEgIT09IHVuZGVmaW5lZCA/IHsgc2luY2VTZXE6IG9wdHMuc2luY2VTZXEgfSA6IHt9KSxcbiAgfSk7XG4gIC8vIGF1dGhvcklkIGlzIHJlbmRlcmVkIFJBVyBcdTIwMTQgdGhlIENMSSBoYXMgbm8gYWN0b3IgZGlyZWN0b3J5IGFuZCBuZWVkcyBub25lLlxuICByZXR1cm4gcmVuZGVyVGFibGUoXG4gICAgWydzZXEnLCAna2luZCcsICdhdXRob3JJZCcsICdib2R5J10sXG4gICAgbWVzc2FnZXMubWFwKChtKSA9PiBbbS5zZXEsIG0ua2luZCwgbS5hdXRob3JJZCwgbS5ib2R5XSksXG4gICk7XG59XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gbm90aWZpY2F0aW9uc1xuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbmV4cG9ydCBpbnRlcmZhY2UgTm90aWZpY2F0aW9uc09wdGlvbnMge1xuICB1bnJlYWRPbmx5PzogYm9vbGVhbjtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIG5vdGlmaWNhdGlvbnNDb21tYW5kKFxuICBjbGllbnQ6IE9haHNDbGllbnQsXG4gIG9wdHM6IE5vdGlmaWNhdGlvbnNPcHRpb25zID0ge30sXG4pOiBQcm9taXNlPHN0cmluZz4ge1xuICBjb25zdCBub3RpZmljYXRpb25zID0gYXdhaXQgY2xpZW50LmNhbGw8Tm90aWZpY2F0aW9uW10+KCdsaXN0X25vdGlmaWNhdGlvbnMnLCB7XG4gICAgLi4uKG9wdHMudW5yZWFkT25seSA9PT0gdHJ1ZSA/IHsgdW5yZWFkT25seTogdHJ1ZSB9IDoge30pLFxuICB9KTtcbiAgcmV0dXJuIHJlbmRlclRhYmxlKFxuICAgIFsnaWQnLCAnc291cmNlJywgJ3JlZklkJywgJ3JlYWQnXSxcbiAgICBub3RpZmljYXRpb25zLm1hcCgobikgPT4gW24uaWQsIG4uc291cmNlLCBuLnJlZklkLCBuLnJlYWRdKSxcbiAgKTtcbn1cblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBhZ2VudCBqb2JzXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuZXhwb3J0IGludGVyZmFjZSBKb2JzT3B0aW9ucyB7XG4gIGFnZW50QWN0b3JJZD86IHN0cmluZztcbiAgc3RhdHVzPzogc3RyaW5nO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gam9ic0NvbW1hbmQoY2xpZW50OiBPYWhzQ2xpZW50LCBvcHRzOiBKb2JzT3B0aW9ucyA9IHt9KTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgaWYgKG9wdHMuc3RhdHVzICE9PSB1bmRlZmluZWQgJiYgIShKT0JfU1RBVFVTRVMgYXMgcmVhZG9ubHkgc3RyaW5nW10pLmluY2x1ZGVzKG9wdHMuc3RhdHVzKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihgaW52YWxpZCAtLXN0YXR1cyBcIiR7b3B0cy5zdGF0dXN9XCIgKGV4cGVjdGVkICR7Sk9CX1NUQVRVU0VTLmpvaW4oJyB8ICcpfSlgKTtcbiAgfVxuICBjb25zdCBqb2JzID0gYXdhaXQgY2xpZW50LmNhbGw8QWdlbnRKb2JbXT4oJ2xpc3RfYWdlbnRfam9icycsIHtcbiAgICAuLi4ob3B0cy5hZ2VudEFjdG9ySWQgIT09IHVuZGVmaW5lZCA/IHsgYWdlbnRBY3RvcklkOiBvcHRzLmFnZW50QWN0b3JJZCB9IDoge30pLFxuICAgIC4uLihvcHRzLnN0YXR1cyAhPT0gdW5kZWZpbmVkID8geyBzdGF0dXM6IG9wdHMuc3RhdHVzIH0gOiB7fSksXG4gIH0pO1xuICByZXR1cm4gcmVuZGVyVGFibGUoXG4gICAgWydpZCcsICdhZ2VudEFjdG9ySWQnLCAnc3RhdHVzJywgJ3RocmVhZElkJywgJ3dvcmtJdGVtSWQnLCAnZGVwdGgnLCAnbm90ZSddLFxuICAgIGpvYnMubWFwKChqKSA9PiBbai5pZCwgai5hZ2VudEFjdG9ySWQsIGouc3RhdHVzLCBqLnRocmVhZElkLCBqLndvcmtJdGVtSWQsIGouZGVwdGgsIGoubm90ZV0pLFxuICApO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEpvYkNvbXBsZXRlT3B0aW9ucyB7XG4gIGpvYklkOiBzdHJpbmc7XG4gIHN0YXR1czogJ2RvbmUnIHwgJ2Jsb2NrZWQnO1xuICBub3RlPzogc3RyaW5nO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gam9iQ29tcGxldGVDb21tYW5kKFxuICBjbGllbnQ6IE9haHNDbGllbnQsXG4gIG9wdHM6IEpvYkNvbXBsZXRlT3B0aW9ucyxcbik6IFByb21pc2U8c3RyaW5nPiB7XG4gIGNvbnN0IGpvYiA9IGF3YWl0IGNsaWVudC5jYWxsPEFnZW50Sm9iPignY29tcGxldGVfYWdlbnRfam9iJywge1xuICAgIGpvYklkOiBvcHRzLmpvYklkLFxuICAgIHN0YXR1czogb3B0cy5zdGF0dXMsXG4gICAgLi4uKG9wdHMubm90ZSAhPT0gdW5kZWZpbmVkID8geyBub3RlOiBvcHRzLm5vdGUgfSA6IHt9KSxcbiAgfSk7XG4gIHJldHVybiBbYGpvYiAke2pvYi5pZH06ICR7am9iLnN0YXR1c31gLCBgbm90ZTogJHtqb2Iubm90ZSA/PyAnLSd9YF0uam9pbignXFxuJyk7XG59XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gYWR2aXNvciBib3RzIFx1MjAxNCBkZXRlcm1pbmlzdGljIHJlYWQgKyBwb3N0LCBOTyBMTE0sIE5PIGxpZmVjeWNsZSBhdXRob3JpdHlcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5leHBvcnQgaW50ZXJmYWNlIEFkdmlzZU5leHRUYXNrT3B0aW9ucyB7XG4gIHRocmVhZElkOiBzdHJpbmc7XG59XG5cbi8qKlxuICogYG9haHMgYWR2aXNlIG5leHQtdGFza2A6IHJlYWRzIHRoZSBjbGFpbWFibGUgcmVhZHlfZm9yX2RldiBxdWV1ZSAocmFpbHNcbiAqIGVuZm9yY2UgZGVwZW5kZW5jeSBvcmRlciBcdTIwMTQgYW4gaXRlbSBvbmx5IGV2ZXIgUkVBQ0hFUyByZWFkeV9mb3JfZGV2IHdoZW4gaXRzXG4gKiBwcmVkZWNlc3NvcnMgYWxsb3cgaXQpIGFuZCBwb3N0cyBhIGRldGVybWluaXN0aWMgc3VnZ2VzdGlvbiBpbnRvIHRoZVxuICogdGhyZWFkLiBSZWFkICsgcG9zdCBvbmx5LlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gYWR2aXNlTmV4dFRhc2tDb21tYW5kKFxuICBjbGllbnQ6IE9haHNDbGllbnQsXG4gIG9wdHM6IEFkdmlzZU5leHRUYXNrT3B0aW9ucyxcbik6IFByb21pc2U8c3RyaW5nPiB7XG4gIGNvbnN0IGl0ZW1zID0gYXdhaXQgY2xpZW50LmNhbGw8V29ya0l0ZW1bXT4oJ2xpc3Rfd29ya19pdGVtcycsIHtcbiAgICBzdGF0ZTogJ3JlYWR5X2Zvcl9kZXYnLFxuICAgIGNsYWltYWJsZTogdHJ1ZSxcbiAgfSk7XG4gIGNvbnN0IG9yZGVyZWQgPSBbLi4uaXRlbXNdLnNvcnQoKGEsIGIpID0+IGEuZXh0ZXJuYWxLZXkubG9jYWxlQ29tcGFyZShiLmV4dGVybmFsS2V5KSk7XG4gIGNvbnN0IGJvZHkgPVxuICAgIG9yZGVyZWQubGVuZ3RoID09PSAwXG4gICAgICA/ICdhZHZpc29yKG5leHQtdGFzayk6IG5vIGNsYWltYWJsZSByZWFkeV9mb3JfZGV2IGl0ZW1zIHJpZ2h0IG5vdy4nXG4gICAgICA6IFtcbiAgICAgICAgICAnYWR2aXNvcihuZXh0LXRhc2spOiBzdWdnZXN0ZWQgY2xhaW0gb3JkZXIgKGNsYWltYWJsZSByZWFkeV9mb3JfZGV2KTonLFxuICAgICAgICAgIC4uLm9yZGVyZWQubWFwKChpdGVtLCBpKSA9PiBgJHtpICsgMX0uICR7aXRlbS5leHRlcm5hbEtleX0gXHUyMDE0ICR7aXRlbS50aXRsZX0gKCR7aXRlbS5pZH0pYCksXG4gICAgICAgIF0uam9pbignXFxuJyk7XG4gIGNvbnN0IG1lc3NhZ2UgPSBhd2FpdCBjbGllbnQuY2FsbDxNZXNzYWdlPigncG9zdF9tZXNzYWdlJywge1xuICAgIHRocmVhZElkOiBvcHRzLnRocmVhZElkLFxuICAgIGJvZHksXG4gIH0pO1xuICByZXR1cm4gW2BhZHZpc2VkIGluICMke21lc3NhZ2Uuc2VxfSAoJHttZXNzYWdlLmlkfSlgLCBib2R5XS5qb2luKCdcXG4nKTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBBZHZpc2VSZWNvbmNpbGVPcHRpb25zIHtcbiAgdGhyZWFkSWQ6IHN0cmluZztcbiAgLyoqIFJlcGVhdGVkIGAtLWZpbGUgPHdvcmtJdGVtSWQ+PTxmcm9udG1hdHRlclN0YXR1cz5gIHBhaXJzLiAqL1xuICBmaWxlczogc3RyaW5nW107XG59XG5cbi8qKlxuICogYG9haHMgYWR2aXNlIHJlY29uY2lsZWA6IHJ1bnMgdGhlIERFVEVDVC1PTkxZIHJlY29uY2lsZSBxdWVyeSBvdmVyIHRoZVxuICogZ2l2ZW4gZnJvbnRtYXR0ZXIgc3RhdHVzZXMgYW5kIHBvc3RzIHRoZSBkaXZlcmdlbmNlIHJlcG9ydCBpbnRvIHRoZVxuICogdGhyZWFkLiBOZXZlciBtdXRhdGVzIGFueXRoaW5nIChyb2FkbWFwIFx1MDBBNzEuNiAvIEQ2KS5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGFkdmlzZVJlY29uY2lsZUNvbW1hbmQoXG4gIGNsaWVudDogT2Foc0NsaWVudCxcbiAgb3B0czogQWR2aXNlUmVjb25jaWxlT3B0aW9ucyxcbik6IFByb21pc2U8c3RyaW5nPiB7XG4gIGlmIChvcHRzLmZpbGVzLmxlbmd0aCA9PT0gMCkge1xuICAgIHRocm93IG5ldyBFcnJvcignbm90aGluZyB0byByZWNvbmNpbGU6IHBhc3MgYXQgbGVhc3Qgb25lIC0tZmlsZSA8d29ya0l0ZW1JZD49PHN0YXR1cz4nKTtcbiAgfVxuICBjb25zdCBmaWxlcyA9IG9wdHMuZmlsZXMubWFwKChwYWlyKSA9PiB7XG4gICAgY29uc3QgZXEgPSBwYWlyLmluZGV4T2YoJz0nKTtcbiAgICBpZiAoZXEgPD0gMCB8fCBlcSA9PT0gcGFpci5sZW5ndGggLSAxKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYGludmFsaWQgLS1maWxlIFwiJHtwYWlyfVwiIChleHBlY3RlZCA8d29ya0l0ZW1JZD49PHN0YXR1cz4pYCk7XG4gICAgfVxuICAgIHJldHVybiB7IHdvcmtJdGVtSWQ6IHBhaXIuc2xpY2UoMCwgZXEpLCBmcm9udG1hdHRlclN0YXR1czogcGFpci5zbGljZShlcSArIDEpIH07XG4gIH0pO1xuICBjb25zdCByZXBvcnRzID0gYXdhaXQgY2xpZW50LmNhbGw8RGl2ZXJnZW5jZVJlcG9ydFtdPigncmVjb25jaWxlJywgeyBmaWxlcyB9KTtcbiAgY29uc3QgYm9keSA9XG4gICAgcmVwb3J0cy5sZW5ndGggPT09IDBcbiAgICAgID8gYGFkdmlzb3IocmVjb25jaWxlKTogbm8gZGl2ZXJnZW5jZSBhY3Jvc3MgJHtmaWxlcy5sZW5ndGh9IGZpbGUocykuIChkZXRlY3Qtb25seSlgXG4gICAgICA6IFtcbiAgICAgICAgICBgYWR2aXNvcihyZWNvbmNpbGUpOiAke3JlcG9ydHMubGVuZ3RofSBkaXZlcmdlbmNlKHMpIGRldGVjdGVkIChkZXRlY3Qtb25seSwgbm90aGluZyB3YXMgY2hhbmdlZCk6YCxcbiAgICAgICAgICAuLi5yZXBvcnRzLm1hcChcbiAgICAgICAgICAgIChyKSA9PiBgLSAke3Iud29ya0l0ZW1JZH06IGZpbGU9JHtyLmZpbGVTdGF0ZX0gZGI9JHtyLmRiU3RhdGV9IFx1MjE5MiAke3Iua2luZH1gLFxuICAgICAgICAgICksXG4gICAgICAgIF0uam9pbignXFxuJyk7XG4gIGNvbnN0IG1lc3NhZ2UgPSBhd2FpdCBjbGllbnQuY2FsbDxNZXNzYWdlPigncG9zdF9tZXNzYWdlJywge1xuICAgIHRocmVhZElkOiBvcHRzLnRocmVhZElkLFxuICAgIGJvZHksXG4gIH0pO1xuICByZXR1cm4gW2BhZHZpc2VkIGluICMke21lc3NhZ2Uuc2VxfSAoJHttZXNzYWdlLmlkfSlgLCBib2R5XS5qb2luKCdcXG4nKTtcbn1cbiIsICIvKipcbiAqIFBoYXNlIDUgY29tbWFuZHMgKHJvYWRtYXAgXHUwMEE3Nik6IHRoZSBsZWFybmluZyB0ZWFtbWF0ZSdzIE9XTiBtZW1vcnkgYW5kIHRoZVxuICogcmV2aWV3LWNvbnZlcmdlbmNlIG1lYXN1cmluZyBzdGljayBcdTIwMTQgcHVyZSBmdW5jdGlvbnMgb3ZlciB0aGUgdHlwZWRcbiAqIGNvbnRyYWN0cyBjbGllbnQsIHNhbWUgc2hhcGUgYXMgY29tbWFuZHMvaW5kZXgudHMuXG4gKlxuICogYG9haHMgbWVtb3J5YCByZWFkcyBvbmx5IHRoZSBjYWxsZXItdG9rZW4ncyBtZW1vcmllczogdGhlIHdpcmUgY29tbWFuZHNcbiAqIGNhcnJ5IE5PIGFjdG9yIHBhcmFtZXRlciAob3duZXItc2NvcGVkIGJ5IGNvbnN0cnVjdGlvbiksIHNvIHRoZSBDTEkgY2Fubm90XG4gKiBldmVuIGV4cHJlc3MgXCJzaG93IG1lIGFub3RoZXIgYWdlbnQncyBtZW1vcnlcIi5cbiAqXG4gKiBgb2FocyBzdGF0cyByZXZpZXdzYCByZW5kZXJzIHJldmlld0xvb3BJdGVyYXRpb24gcGVyIHdvcmsgaXRlbSBhbmQgcGVyXG4gKiBraW5kIFx1MjAxNCB0aGUgZGV0ZXJtaW5pc3RpYyBudW1iZXIgYmVoaW5kIHRoZSBcdTAwQTc2IGV4aXQgY3JpdGVyaW9uIFwicmV2aWV3XG4gKiBpdGVyYXRpb25zIGltcHJvdmUgd2Vlay1vdmVyLXdlZWtcIi5cbiAqL1xuaW1wb3J0IHR5cGUgeyBPYWhzQ2xpZW50IH0gZnJvbSAnQG9haHMvY29udHJhY3RzJztcbmltcG9ydCB0eXBlIHsgQWdlbnRNZW1vcnksIE1lbW9yeUtpbmQsIFdvcmtJdGVtIH0gZnJvbSAnQG9haHMvY29yZSc7XG5cbmltcG9ydCB7IHJlbmRlclRhYmxlIH0gZnJvbSAnLi4vZm9ybWF0LmpzJztcblxuY29uc3QgTUVNT1JZX0tJTkRTID0gWydlcGlzb2RpYycsICdwcm9jZWR1cmFsJywgJ2VudGl0eSddIGFzIGNvbnN0O1xuXG5mdW5jdGlvbiBhc3NlcnRNZW1vcnlLaW5kKGtpbmQ6IHN0cmluZyk6IGFzc2VydHMga2luZCBpcyBNZW1vcnlLaW5kIHtcbiAgaWYgKCEoTUVNT1JZX0tJTkRTIGFzIHJlYWRvbmx5IHN0cmluZ1tdKS5pbmNsdWRlcyhraW5kKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihgaW52YWxpZCAtLWtpbmQgXCIke2tpbmR9XCIgKGV4cGVjdGVkICR7TUVNT1JZX0tJTkRTLmpvaW4oJyB8ICcpfSlgKTtcbiAgfVxufVxuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIG1lbW9yeVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbmV4cG9ydCBpbnRlcmZhY2UgTWVtb3J5T3B0aW9ucyB7XG4gIGtpbmQ/OiBzdHJpbmc7XG4gIHF1ZXJ5Pzogc3RyaW5nO1xuICAvKiogUmVjYWxsIGNvbnRleHQ6IHByaXZhdGUtc291cmNlZCBtZW1vcmllcyBzdXJmYWNlIG9ubHkgaW4gdGhlaXIgc291cmNlIHRocmVhZCAoXHUwMEE3NikuICovXG4gIGNvbnRleHRUaHJlYWRJZD86IHN0cmluZztcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIG1lbW9yeUNvbW1hbmQoY2xpZW50OiBPYWhzQ2xpZW50LCBvcHRzOiBNZW1vcnlPcHRpb25zID0ge30pOiBQcm9taXNlPHN0cmluZz4ge1xuICBpZiAob3B0cy5raW5kICE9PSB1bmRlZmluZWQpIGFzc2VydE1lbW9yeUtpbmQob3B0cy5raW5kKTtcbiAgY29uc3QgbWVtb3JpZXMgPSBhd2FpdCBjbGllbnQuY2FsbDxBZ2VudE1lbW9yeVtdPignc2VhcmNoX2FnZW50X21lbW9yeScsIHtcbiAgICAuLi4ob3B0cy5raW5kICE9PSB1bmRlZmluZWQgPyB7IGtpbmQ6IG9wdHMua2luZCB9IDoge30pLFxuICAgIC4uLihvcHRzLnF1ZXJ5ICE9PSB1bmRlZmluZWQgPyB7IHF1ZXJ5OiBvcHRzLnF1ZXJ5IH0gOiB7fSksXG4gICAgLi4uKG9wdHMuY29udGV4dFRocmVhZElkICE9PSB1bmRlZmluZWQgPyB7IGNvbnRleHRUaHJlYWRJZDogb3B0cy5jb250ZXh0VGhyZWFkSWQgfSA6IHt9KSxcbiAgfSk7XG4gIHJldHVybiBbXG4gICAgJ3lvdXIgbWVtb3JpZXMgKG93bmVyLXNjb3BlZCBcdTIwMTQgdGhpcyB0b2tlblx1MjAxOXMgYWdlbnQgb25seSk6JyxcbiAgICByZW5kZXJUYWJsZShcbiAgICAgIFsnc2VxJywgJ2tpbmQnLCAnc291cmNlVGhyZWFkSWQnLCAnc291cmNlVmlzaWJpbGl0eScsICdjb250ZW50J10sXG4gICAgICBtZW1vcmllcy5tYXAoKG0pID0+IFttLnNlcSwgbS5raW5kLCBtLnNvdXJjZVRocmVhZElkLCBtLnNvdXJjZVZpc2liaWxpdHksIG0uY29udGVudF0pLFxuICAgICksXG4gIF0uam9pbignXFxuJyk7XG59XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gc3RhdHMgcmV2aWV3c1xuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbmludGVyZmFjZSBLaW5kU3RhdHMge1xuICBraW5kOiBzdHJpbmc7XG4gIGRvbmU6IG51bWJlcjtcbiAgdG90YWxMb29wczogbnVtYmVyO1xuICBtYXhMb29wczogbnVtYmVyO1xufVxuXG4vKipcbiAqIGBvYWhzIHN0YXRzIHJldmlld3NgOiByZXZpZXctbG9vcCBjb252ZXJnZW5jZSBwZXIga2luZCBvdmVyIGRvbmUgaXRlbXMsXG4gKiBwbHVzIGV2ZXJ5IGl0ZW0ncyBvd24gbG9vcCBjb3VudCBcdTIwMTQgY29tcGFyYWJsZSBydW4gb3ZlciBydW4sIHdoaWNoIGlzIHRoZVxuICogd2hvbGUgcG9pbnQgb2YgdGhlIG1ldHJpYy5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHN0YXRzUmV2aWV3c0NvbW1hbmQoY2xpZW50OiBPYWhzQ2xpZW50KTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgY29uc3QgaXRlbXMgPSBhd2FpdCBjbGllbnQuY2FsbDxXb3JrSXRlbVtdPignbGlzdF93b3JrX2l0ZW1zJyk7XG4gIGNvbnN0IGJ5S2luZCA9IG5ldyBNYXA8c3RyaW5nLCBLaW5kU3RhdHM+KCk7XG4gIGZvciAoY29uc3QgaXRlbSBvZiBpdGVtcykge1xuICAgIGlmIChpdGVtLnN0YXRlICE9PSAnZG9uZScpIGNvbnRpbnVlO1xuICAgIGNvbnN0IHN0YXRzID0gYnlLaW5kLmdldChpdGVtLmtpbmQpID8/IHsga2luZDogaXRlbS5raW5kLCBkb25lOiAwLCB0b3RhbExvb3BzOiAwLCBtYXhMb29wczogMCB9O1xuICAgIHN0YXRzLmRvbmUgKz0gMTtcbiAgICBzdGF0cy50b3RhbExvb3BzICs9IGl0ZW0ucmV2aWV3TG9vcEl0ZXJhdGlvbjtcbiAgICBzdGF0cy5tYXhMb29wcyA9IE1hdGgubWF4KHN0YXRzLm1heExvb3BzLCBpdGVtLnJldmlld0xvb3BJdGVyYXRpb24pO1xuICAgIGJ5S2luZC5zZXQoaXRlbS5raW5kLCBzdGF0cyk7XG4gIH1cbiAgY29uc3Qga2luZHMgPSBbLi4uYnlLaW5kLnZhbHVlcygpXS5zb3J0KChhLCBiKSA9PiBhLmtpbmQubG9jYWxlQ29tcGFyZShiLmtpbmQpKTtcbiAgY29uc3Qgc29ydGVkID0gWy4uLml0ZW1zXS5zb3J0KChhLCBiKSA9PiBhLmV4dGVybmFsS2V5LmxvY2FsZUNvbXBhcmUoYi5leHRlcm5hbEtleSkpO1xuICByZXR1cm4gW1xuICAgICdyZXZpZXcgY29udmVyZ2VuY2UgYnkga2luZCAoZG9uZSBpdGVtcyBcdTIwMTQgbG93ZXIgbG9vcHMgPSBiZXR0ZXIpOicsXG4gICAgcmVuZGVyVGFibGUoXG4gICAgICBbJ2tpbmQnLCAnZG9uZScsICdhdmdMb29wcycsICdtYXhMb29wcyddLFxuICAgICAga2luZHMubWFwKChzKSA9PiBbcy5raW5kLCBzLmRvbmUsIChzLnRvdGFsTG9vcHMgLyBzLmRvbmUpLnRvRml4ZWQoMiksIHMubWF4TG9vcHNdKSxcbiAgICApLFxuICAgICcnLFxuICAgICdpdGVtczonLFxuICAgIHJlbmRlclRhYmxlKFxuICAgICAgWydleHRlcm5hbEtleScsICdraW5kJywgJ3N0YXRlJywgJ2xvb3BzJ10sXG4gICAgICBzb3J0ZWQubWFwKChpdGVtKSA9PiBbaXRlbS5leHRlcm5hbEtleSwgaXRlbS5raW5kLCBpdGVtLnN0YXRlLCBpdGVtLnJldmlld0xvb3BJdGVyYXRpb25dKSxcbiAgICApLFxuICBdLmpvaW4oJ1xcbicpO1xufVxuIiwgIi8qKlxuICogQG9haHMvZ2F0ZXdheSBcdTIwMTQgcHJvdmlkZXIgYWJzdHJhY3Rpb24gKFBoYXNlIDYsIHJvYWRtYXAgXHUwMEE3Mi41KS5cbiAqXG4gKiBBIFByb3ZpZGVyIGlzIHRoZSBtb2RlbC1hZ25vc3RpYyBzZWFtOiBpdCB0dXJucyBhIG5vcm1hbGl6ZWQgY29tcGxldGlvblxuICogcmVxdWVzdCBpbnRvIGEgbm9ybWFsaXplZCB7Y29udGVudCwgdXNhZ2V9IHJlc3VsdCwgaGlkaW5nIHRoZSB3aXJlIGRpYWxlY3RcbiAqIG9mIHdoYXRldmVyIGVuZHBvaW50IHNpdHMgYmVoaW5kIGl0LiBUaGUgZmlyc3QgY29uY3JldGUgcHJvdmlkZXIgc3BlYWtzIHRoZVxuICogT3BlbkFJLWNvbXBhdGlibGUgL2NoYXQvY29tcGxldGlvbnMgZGlhbGVjdCAoOXJvdXRlciwgdkxMTSwgQmVkcm9jayBwcm94aWVzLFxuICogQW50aHJvcGljLXZpYS1jb21wYXQsIFx1MjAyNikuIE5ldyBwcm92aWRlcnMgYXJlIG5ldyBjbGFzc2VzLCBuZXZlciBlZGl0cyBoZXJlLlxuICpcbiAqIElOVkFSSUFOVCAoXHUwMEE3MC4xKTogdGhpcyBmaWxlIFx1MjAxNCBhbmQgdGhpcyB3aG9sZSBwYWNrYWdlIFx1MjAxNCBpbXBvcnRzIG5vIHNwaW5lXG4gKiBwYWNrYWdlIChjb3JlL2RiL2NvbnRyYWN0cy9zcGluZS1hcGkpLiBUaGUgZ2F0ZXdheSBpcyB0aGUgcnVudGltZSBsYXllcjsgdGhlXG4gKiBzcGluZSBpcyBuZXZlciBpdHMgY2xpZW50LiBLZXlzIGFuZCBVUkxzIGFyZSBhbHdheXMgaW5qZWN0ZWQsIG5ldmVyXG4gKiBoYXJkY29kZWQgKHBlci10ZW5hbnQga2V5IHZhdWx0IGxpdmVzIGFib3ZlIHRoaXMgc2VhbSkuXG4gKi9cblxuLyoqIE9uZSB0dXJuIG9mIGEgY2hhdDogYSByb2xlIGFuZCBpdHMgdGV4dCBjb250ZW50LiAqL1xuZXhwb3J0IGludGVyZmFjZSBDaGF0TWVzc2FnZSB7XG4gIHJvbGU6ICdzeXN0ZW0nIHwgJ3VzZXInIHwgJ2Fzc2lzdGFudCc7XG4gIGNvbnRlbnQ6IHN0cmluZztcbn1cblxuLyoqIFRva2VuIGFjY291bnRpbmcgZm9yIG9uZSBjb21wbGV0aW9uIFx1MjAxNCB0aGUgYmlsbGluZyB1bml0IChcdTAwQTcyLjUgbWV0ZXJpbmcpLiAqL1xuZXhwb3J0IGludGVyZmFjZSBVc2FnZSB7XG4gIHByb21wdFRva2VuczogbnVtYmVyO1xuICBjb21wbGV0aW9uVG9rZW5zOiBudW1iZXI7XG4gIHRvdGFsVG9rZW5zOiBudW1iZXI7XG59XG5cbi8qKiBOb3JtYWxpemVkIGNvbXBsZXRpb24gcmVxdWVzdCBoYW5kZWQgdG8gYSBQcm92aWRlci4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQ29tcGxldGlvblJlcXVlc3Qge1xuICBtb2RlbDogc3RyaW5nO1xuICBtZXNzYWdlczogQ2hhdE1lc3NhZ2VbXTtcbiAgbWF4VG9rZW5zPzogbnVtYmVyO1xuICB0ZW1wZXJhdHVyZT86IG51bWJlcjtcbn1cblxuLyoqIE5vcm1hbGl6ZWQgY29tcGxldGlvbiByZXN1bHQgXHUyMDE0IGNvbnRlbnQgcGx1cyB0aGUgdG9rZW4gbGVkZ2VyIGVudHJ5LiAqL1xuZXhwb3J0IGludGVyZmFjZSBDb21wbGV0aW9uUmVzdWx0IHtcbiAgY29udGVudDogc3RyaW5nO1xuICB1c2FnZTogVXNhZ2U7XG4gIG1vZGVsOiBzdHJpbmc7XG59XG5cbi8qKiBNb2RlbC1hZ25vc3RpYyBwcm92aWRlciBzZWFtLiAqL1xuZXhwb3J0IGludGVyZmFjZSBQcm92aWRlciB7XG4gIGNvbXBsZXRlKHJlcTogQ29tcGxldGlvblJlcXVlc3QpOiBQcm9taXNlPENvbXBsZXRpb25SZXN1bHQ+O1xuICBsaXN0TW9kZWxzKCk6IFByb21pc2U8c3RyaW5nW10+O1xufVxuXG4vKiogVGhlIGZldGNoIHNoYXBlIHRoZSBwcm92aWRlciBkZXBlbmRzIG9uIFx1MjAxNCBpbmplY3RhYmxlIHNvIHRlc3RzIG5ldmVyIHRvdWNoIHRoZSBuZXR3b3JrLiAqL1xuZXhwb3J0IHR5cGUgRmV0Y2hJbXBsID0gKGlucHV0OiBzdHJpbmcsIGluaXQ/OiBSZXF1ZXN0SW5pdCkgPT4gUHJvbWlzZTxSZXNwb25zZT47XG5cbi8qKlxuICogQSBnYXRld2F5L3Byb3ZpZGVyIGZhaWx1cmUgdGhhdCBjYXJyaWVzIHRoZSB3aXJlIGNvbnRleHQgKEhUVFAgc3RhdHVzICtcbiAqIHJlc3BvbnNlIGJvZHkgaGVhZCkgc28gYSBjYWxsZXIgY2FuIGxvZy9yb3V0ZSBvbiBpdCB3aXRob3V0IHJlLXBhcnNpbmcuXG4gKi9cbmV4cG9ydCBjbGFzcyBHYXRld2F5RXJyb3IgZXh0ZW5kcyBFcnJvciB7XG4gIG92ZXJyaWRlIHJlYWRvbmx5IG5hbWUgPSAnR2F0ZXdheUVycm9yJztcbiAgcmVhZG9ubHkgc3RhdHVzOiBudW1iZXIgfCB1bmRlZmluZWQ7XG4gIHJlYWRvbmx5IGJvZHk6IHN0cmluZyB8IHVuZGVmaW5lZDtcblxuICBjb25zdHJ1Y3RvcihtZXNzYWdlOiBzdHJpbmcsIG9wdGlvbnM6IHsgc3RhdHVzPzogbnVtYmVyOyBib2R5Pzogc3RyaW5nIH0gPSB7fSkge1xuICAgIHN1cGVyKG1lc3NhZ2UpO1xuICAgIHRoaXMuc3RhdHVzID0gb3B0aW9ucy5zdGF0dXM7XG4gICAgdGhpcy5ib2R5ID0gb3B0aW9ucy5ib2R5O1xuICB9XG59XG5cbi8qKiBSZXNwb25zZSBib2RpZXMgb3ZlciB0aGlzIGxlbmd0aCBhcmUgdHJ1bmNhdGVkIGluIEdhdGV3YXlFcnJvci5ib2R5LiAqL1xuY29uc3QgRVJST1JfQk9EWV9IRUFEID0gMjAwMDtcblxuaW50ZXJmYWNlIE9wZW5BSUNoYXRSZXNwb25zZSB7XG4gIGNob2ljZXM/OiBBcnJheTx7IG1lc3NhZ2U/OiB7IGNvbnRlbnQ/OiB1bmtub3duIH0gfT47XG4gIHVzYWdlPzoge1xuICAgIHByb21wdF90b2tlbnM/OiB1bmtub3duO1xuICAgIGNvbXBsZXRpb25fdG9rZW5zPzogdW5rbm93bjtcbiAgICB0b3RhbF90b2tlbnM/OiB1bmtub3duO1xuICB9O1xufVxuXG5pbnRlcmZhY2UgT3BlbkFJTW9kZWxzUmVzcG9uc2Uge1xuICBkYXRhPzogQXJyYXk8eyBpZD86IHVua25vd24gfT47XG59XG5cbmZ1bmN0aW9uIHRvSW50KHZhbHVlOiB1bmtub3duKTogbnVtYmVyIHtcbiAgcmV0dXJuIHR5cGVvZiB2YWx1ZSA9PT0gJ251bWJlcicgJiYgTnVtYmVyLmlzRmluaXRlKHZhbHVlKSA/IHZhbHVlIDogMDtcbn1cblxuLyoqXG4gKiBPcGVuQUktY29tcGF0aWJsZSBwcm92aWRlcjogUE9TVCB7YmFzZVVybH0vY2hhdC9jb21wbGV0aW9ucyAoc3RyZWFtOmZhbHNlKVxuICogYW5kIEdFVCB7YmFzZVVybH0vbW9kZWxzLiBBdXRoIGlzIGEgQmVhcmVyIGtleS4gQm90aCBrZXkgYW5kIGJhc2UgVVJMIGFyZVxuICogY29uc3RydWN0b3ItaW5qZWN0ZWQgXHUyMDE0IHRoZSBjYWxsZXIgKGxvYWRHYXRld2F5RnJvbUVudiwgb3IgYSBwZXItdGVuYW50IHZhdWx0KVxuICogZGVjaWRlcyB3aGVyZSB0aGV5IGNvbWUgZnJvbS5cbiAqL1xuZXhwb3J0IGNsYXNzIE9wZW5BSUNvbXBhdGlibGVQcm92aWRlciBpbXBsZW1lbnRzIFByb3ZpZGVyIHtcbiAgcHJpdmF0ZSByZWFkb25seSBiYXNlVXJsOiBzdHJpbmc7XG4gIHByaXZhdGUgcmVhZG9ubHkgYXBpS2V5OiBzdHJpbmc7XG4gIHByaXZhdGUgcmVhZG9ubHkgZmV0Y2hJbXBsOiBGZXRjaEltcGw7XG5cbiAgY29uc3RydWN0b3IoY29uZmlnOiB7IGJhc2VVcmw6IHN0cmluZzsgYXBpS2V5OiBzdHJpbmc7IGZldGNoSW1wbD86IEZldGNoSW1wbCB9KSB7XG4gICAgLy8gTm9ybWFsaXplIGEgc2luZ2xlIHRyYWlsaW5nIHNsYXNoIHNvIGAke2Jhc2V9L2NoYXQvY29tcGxldGlvbnNgIG5ldmVyIGRvdWJsZXMuXG4gICAgdGhpcy5iYXNlVXJsID0gY29uZmlnLmJhc2VVcmwucmVwbGFjZSgvXFwvKyQvLCAnJyk7XG4gICAgdGhpcy5hcGlLZXkgPSBjb25maWcuYXBpS2V5O1xuICAgIHRoaXMuZmV0Y2hJbXBsID0gY29uZmlnLmZldGNoSW1wbCA/PyAoKGlucHV0LCBpbml0KSA9PiBmZXRjaChpbnB1dCwgaW5pdCkpO1xuICB9XG5cbiAgcHJpdmF0ZSBoZWFkZXJzKCk6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4ge1xuICAgIHJldHVybiB7XG4gICAgICAnY29udGVudC10eXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxuICAgICAgYXV0aG9yaXphdGlvbjogYEJlYXJlciAke3RoaXMuYXBpS2V5fWAsXG4gICAgfTtcbiAgfVxuXG4gIGFzeW5jIGNvbXBsZXRlKHJlcTogQ29tcGxldGlvblJlcXVlc3QpOiBQcm9taXNlPENvbXBsZXRpb25SZXN1bHQ+IHtcbiAgICBjb25zdCB1cmwgPSBgJHt0aGlzLmJhc2VVcmx9L2NoYXQvY29tcGxldGlvbnNgO1xuICAgIGNvbnN0IHBheWxvYWQ6IFJlY29yZDxzdHJpbmcsIHVua25vd24+ID0ge1xuICAgICAgbW9kZWw6IHJlcS5tb2RlbCxcbiAgICAgIG1lc3NhZ2VzOiByZXEubWVzc2FnZXMsXG4gICAgICBzdHJlYW06IGZhbHNlLFxuICAgIH07XG4gICAgaWYgKHJlcS5tYXhUb2tlbnMgIT09IHVuZGVmaW5lZCkgcGF5bG9hZFsnbWF4X3Rva2VucyddID0gcmVxLm1heFRva2VucztcbiAgICBpZiAocmVxLnRlbXBlcmF0dXJlICE9PSB1bmRlZmluZWQpIHBheWxvYWRbJ3RlbXBlcmF0dXJlJ10gPSByZXEudGVtcGVyYXR1cmU7XG5cbiAgICBsZXQgcmVzcG9uc2U6IFJlc3BvbnNlO1xuICAgIHRyeSB7XG4gICAgICByZXNwb25zZSA9IGF3YWl0IHRoaXMuZmV0Y2hJbXBsKHVybCwge1xuICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgaGVhZGVyczogdGhpcy5oZWFkZXJzKCksXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHBheWxvYWQpLFxuICAgICAgfSk7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIHRocm93IG5ldyBHYXRld2F5RXJyb3IoXG4gICAgICAgIGBjaGF0L2NvbXBsZXRpb25zIHJlcXVlc3QgZmFpbGVkOiAke2Vycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKX1gLFxuICAgICAgKTtcbiAgICB9XG5cbiAgICBpZiAoIXJlc3BvbnNlLm9rKSB7XG4gICAgICBjb25zdCBib2R5ID0gYXdhaXQgdGhpcy5yZWFkQm9keShyZXNwb25zZSk7XG4gICAgICB0aHJvdyBuZXcgR2F0ZXdheUVycm9yKGBjaGF0L2NvbXBsZXRpb25zIHJldHVybmVkIEhUVFAgJHtyZXNwb25zZS5zdGF0dXN9YCwge1xuICAgICAgICBzdGF0dXM6IHJlc3BvbnNlLnN0YXR1cyxcbiAgICAgICAgYm9keSxcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGxldCBqc29uOiBPcGVuQUlDaGF0UmVzcG9uc2U7XG4gICAgdHJ5IHtcbiAgICAgIGpzb24gPSAoYXdhaXQgcmVzcG9uc2UuanNvbigpKSBhcyBPcGVuQUlDaGF0UmVzcG9uc2U7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIHRocm93IG5ldyBHYXRld2F5RXJyb3IoXG4gICAgICAgIGBjaGF0L2NvbXBsZXRpb25zIHJldHVybmVkIHVucGFyc2VhYmxlIEpTT046ICR7XG4gICAgICAgICAgZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpXG4gICAgICAgIH1gLFxuICAgICAgICB7IHN0YXR1czogcmVzcG9uc2Uuc3RhdHVzIH0sXG4gICAgICApO1xuICAgIH1cblxuICAgIGNvbnN0IGNvbnRlbnQgPSBqc29uLmNob2ljZXM/LlswXT8ubWVzc2FnZT8uY29udGVudDtcbiAgICBpZiAodHlwZW9mIGNvbnRlbnQgIT09ICdzdHJpbmcnIHx8IGNvbnRlbnQubGVuZ3RoID09PSAwKSB7XG4gICAgICB0aHJvdyBuZXcgR2F0ZXdheUVycm9yKCdjaGF0L2NvbXBsZXRpb25zIHJlc3BvbnNlIGNhcnJpZWQgbm8gbWVzc2FnZSBjb250ZW50Jywge1xuICAgICAgICBzdGF0dXM6IHJlc3BvbnNlLnN0YXR1cyxcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoanNvbikuc2xpY2UoMCwgRVJST1JfQk9EWV9IRUFEKSxcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGNvbnN0IHVzYWdlOiBVc2FnZSA9IHtcbiAgICAgIHByb21wdFRva2VuczogdG9JbnQoanNvbi51c2FnZT8ucHJvbXB0X3Rva2VucyksXG4gICAgICBjb21wbGV0aW9uVG9rZW5zOiB0b0ludChqc29uLnVzYWdlPy5jb21wbGV0aW9uX3Rva2VucyksXG4gICAgICB0b3RhbFRva2VuczogdG9JbnQoanNvbi51c2FnZT8udG90YWxfdG9rZW5zKSxcbiAgICB9O1xuXG4gICAgcmV0dXJuIHsgY29udGVudCwgdXNhZ2UsIG1vZGVsOiByZXEubW9kZWwgfTtcbiAgfVxuXG4gIGFzeW5jIGxpc3RNb2RlbHMoKTogUHJvbWlzZTxzdHJpbmdbXT4ge1xuICAgIGNvbnN0IHVybCA9IGAke3RoaXMuYmFzZVVybH0vbW9kZWxzYDtcbiAgICBsZXQgcmVzcG9uc2U6IFJlc3BvbnNlO1xuICAgIHRyeSB7XG4gICAgICByZXNwb25zZSA9IGF3YWl0IHRoaXMuZmV0Y2hJbXBsKHVybCwgeyBtZXRob2Q6ICdHRVQnLCBoZWFkZXJzOiB0aGlzLmhlYWRlcnMoKSB9KTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgdGhyb3cgbmV3IEdhdGV3YXlFcnJvcihcbiAgICAgICAgYG1vZGVscyByZXF1ZXN0IGZhaWxlZDogJHtlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcil9YCxcbiAgICAgICk7XG4gICAgfVxuICAgIGlmICghcmVzcG9uc2Uub2spIHtcbiAgICAgIGNvbnN0IGJvZHkgPSBhd2FpdCB0aGlzLnJlYWRCb2R5KHJlc3BvbnNlKTtcbiAgICAgIHRocm93IG5ldyBHYXRld2F5RXJyb3IoYG1vZGVscyByZXR1cm5lZCBIVFRQICR7cmVzcG9uc2Uuc3RhdHVzfWAsIHtcbiAgICAgICAgc3RhdHVzOiByZXNwb25zZS5zdGF0dXMsXG4gICAgICAgIGJvZHksXG4gICAgICB9KTtcbiAgICB9XG4gICAgbGV0IGpzb246IE9wZW5BSU1vZGVsc1Jlc3BvbnNlO1xuICAgIHRyeSB7XG4gICAgICBqc29uID0gKGF3YWl0IHJlc3BvbnNlLmpzb24oKSkgYXMgT3BlbkFJTW9kZWxzUmVzcG9uc2U7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIHRocm93IG5ldyBHYXRld2F5RXJyb3IoXG4gICAgICAgIGBtb2RlbHMgcmV0dXJuZWQgdW5wYXJzZWFibGUgSlNPTjogJHtcbiAgICAgICAgICBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcilcbiAgICAgICAgfWAsXG4gICAgICAgIHsgc3RhdHVzOiByZXNwb25zZS5zdGF0dXMgfSxcbiAgICAgICk7XG4gICAgfVxuICAgIHJldHVybiAoanNvbi5kYXRhID8/IFtdKVxuICAgICAgLm1hcCgoZW50cnkpID0+IGVudHJ5LmlkKVxuICAgICAgLmZpbHRlcigoaWQpOiBpZCBpcyBzdHJpbmcgPT4gdHlwZW9mIGlkID09PSAnc3RyaW5nJyk7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIHJlYWRCb2R5KHJlc3BvbnNlOiBSZXNwb25zZSk6IFByb21pc2U8c3RyaW5nPiB7XG4gICAgdHJ5IHtcbiAgICAgIHJldHVybiAoYXdhaXQgcmVzcG9uc2UudGV4dCgpKS5zbGljZSgwLCBFUlJPUl9CT0RZX0hFQUQpO1xuICAgIH0gY2F0Y2gge1xuICAgICAgcmV0dXJuICcnO1xuICAgIH1cbiAgfVxufVxuIiwgIi8qKlxuICogQG9haHMvZ2F0ZXdheSBcdTIwMTQgdG9rZW4gbWV0ZXJpbmcgKFBoYXNlIDYsIHJvYWRtYXAgXHUwMEE3Mi41KS5cbiAqXG4gKiBNZXRlcmluZyBpcyB0aGUgYmlsbGluZyBzZWFtOiBldmVyeSBjb21wbGV0aW9uIHJlY29yZHMgaXRzIHRva2VuIHVzYWdlIHNvIGFcbiAqIHBlci1wbGFuIHF1b3RhIC8gcGVyLXRlbmFudCBpbnZvaWNlIGNhbiBiZSBjb21wdXRlZCBkb3duc3RyZWFtLiBBIE1ldGVyIGlzIGFcbiAqIHNpbmssIG5ldmVyIGEgZ2F0ZSBcdTIwMTQgYSBtZXRlcmluZyBmYWlsdXJlIG11c3QgbmV2ZXIgYmxvY2sgYSByZXBseSAodGhlIGNhbGxlclxuICogZGVjaWRlcyBob3cgc3RyaWN0IHRvIGJlOyB0aGUgaW4tbWVtb3J5IGFuZCBqc29ubCBtZXRlcnMgaGVyZSBuZXZlciB0aHJvdyBvblxuICogYSB3ZWxsLWZvcm1lZCBlbnRyeSkuXG4gKlxuICogTk9URSBvbiBEYXRlOiB3b3JrZmxvdyAqc2NyaXB0cyogZm9yYmlkIERhdGUsIGJ1dCB0aGlzIGlzIG9yZGluYXJ5IHJ1bnRpbWVcbiAqIGNvZGUgKGEgdXNhZ2UgbGVkZ2VyIGZvciBiaWxsaW5nKSBcdTIwMTQgRGF0ZS5ub3coKSBmb3IgdGhlIGxlZGdlciB0aW1lc3RhbXAgaXNcbiAqIGNvcnJlY3QgYW5kIGV4cGVjdGVkIGhlcmUuXG4gKi9cbmltcG9ydCB7IGFwcGVuZEZpbGVTeW5jIH0gZnJvbSAnbm9kZTpmcyc7XG5cbmltcG9ydCB0eXBlIHsgVXNhZ2UgfSBmcm9tICcuL3Byb3ZpZGVyLmpzJztcblxuLyoqIE9uZSB1c2FnZS1sZWRnZXIgZW50cnk6IHdoaWNoIG1vZGVsL3JvdXRlIGNvbnN1bWVkIGhvdyBtYW55IHRva2Vucy4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgTWV0ZXJFbnRyeSB7XG4gIG1vZGVsOiBzdHJpbmc7XG4gIHVzYWdlOiBVc2FnZTtcbiAgLyoqIFRoZSBwZXJzb25hL3JvdXRlIHRoYXQgcmVzb2x2ZWQgdG8gdGhpcyBtb2RlbCwgd2hlbiByb3V0ZWQuICovXG4gIHJvdXRlPzogc3RyaW5nO1xufVxuXG4vKiogQWdncmVnYXRlIHRva2VuIHRvdGFscyBhY3Jvc3MgZXZlcnl0aGluZyBhIG1ldGVyIGhhcyByZWNvcmRlZC4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgTWV0ZXJUb3RhbHMge1xuICBjYWxsczogbnVtYmVyO1xuICBwcm9tcHRUb2tlbnM6IG51bWJlcjtcbiAgY29tcGxldGlvblRva2VuczogbnVtYmVyO1xuICB0b3RhbFRva2VuczogbnVtYmVyO1xufVxuXG4vKiogQSB0b2tlbiBzaW5rLiByZWNvcmQoKSBpcyBiZXN0LWVmZm9ydDsgdG90YWwoKSBhZ2dyZWdhdGVzLiAqL1xuZXhwb3J0IGludGVyZmFjZSBNZXRlciB7XG4gIHJlY29yZChlbnRyeTogTWV0ZXJFbnRyeSk6IHZvaWQ7XG4gIHRvdGFsKCk6IE1ldGVyVG90YWxzO1xufVxuXG4vKiogSW4tbWVtb3J5IG1ldGVyIFx1MjAxNCBrZWVwcyBhIHJ1bm5pbmcgYWdncmVnYXRlLiBIYW5keSBmb3IgdGVzdHMgYW5kIHNpbmdsZSBydW5zLiAqL1xuZXhwb3J0IGNsYXNzIEluTWVtb3J5TWV0ZXIgaW1wbGVtZW50cyBNZXRlciB7XG4gIHByaXZhdGUgY2FsbHMgPSAwO1xuICBwcml2YXRlIHByb21wdFRva2VucyA9IDA7XG4gIHByaXZhdGUgY29tcGxldGlvblRva2VucyA9IDA7XG4gIHByaXZhdGUgdG90YWxUb2tlbnMgPSAwO1xuXG4gIHJlY29yZChlbnRyeTogTWV0ZXJFbnRyeSk6IHZvaWQge1xuICAgIHRoaXMuY2FsbHMgKz0gMTtcbiAgICB0aGlzLnByb21wdFRva2VucyArPSBlbnRyeS51c2FnZS5wcm9tcHRUb2tlbnM7XG4gICAgdGhpcy5jb21wbGV0aW9uVG9rZW5zICs9IGVudHJ5LnVzYWdlLmNvbXBsZXRpb25Ub2tlbnM7XG4gICAgdGhpcy50b3RhbFRva2VucyArPSBlbnRyeS51c2FnZS50b3RhbFRva2VucztcbiAgfVxuXG4gIHRvdGFsKCk6IE1ldGVyVG90YWxzIHtcbiAgICByZXR1cm4ge1xuICAgICAgY2FsbHM6IHRoaXMuY2FsbHMsXG4gICAgICBwcm9tcHRUb2tlbnM6IHRoaXMucHJvbXB0VG9rZW5zLFxuICAgICAgY29tcGxldGlvblRva2VuczogdGhpcy5jb21wbGV0aW9uVG9rZW5zLFxuICAgICAgdG90YWxUb2tlbnM6IHRoaXMudG90YWxUb2tlbnMsXG4gICAgfTtcbiAgfVxufVxuXG4vKiogT25lIGxpbmUgb2YgdGhlIEpTT05MIHVzYWdlIGxlZGdlci4gKi9cbmludGVyZmFjZSBKc29ubFJlY29yZCB7XG4gIHRzOiBudW1iZXI7XG4gIG1vZGVsOiBzdHJpbmc7XG4gIHJvdXRlOiBzdHJpbmcgfCBudWxsO1xuICBwcm9tcHRUb2tlbnM6IG51bWJlcjtcbiAgY29tcGxldGlvblRva2VuczogbnVtYmVyO1xuICB0b3RhbFRva2VuczogbnVtYmVyO1xufVxuXG4vKipcbiAqIEFwcGVuZC1vbmx5IEpTT05MIHVzYWdlIGxlZGdlci4gRWFjaCByZWNvcmQoKSBhcHBlbmRzIG9uZSBsaW5lXG4gKiB7dHMsIG1vZGVsLCByb3V0ZSwgcHJvbXB0VG9rZW5zLCBjb21wbGV0aW9uVG9rZW5zLCB0b3RhbFRva2Vuc30gXHUyMDE0IGFuXG4gKiBhdWRpdGFibGUsIHJlcGxheWFibGUgYmlsbGluZyB0cmFpbC4gdG90YWwoKSByZS1hZ2dyZWdhdGVzIGluIG1lbW9yeSBhcyBhXG4gKiBjb252ZW5pZW5jZTsgdGhlIGZpbGUgaXMgdGhlIHNvdXJjZSBvZiB0cnV0aC5cbiAqL1xuZXhwb3J0IGNsYXNzIEpzb25sTWV0ZXIgaW1wbGVtZW50cyBNZXRlciB7XG4gIHByaXZhdGUgcmVhZG9ubHkgcGF0aDogc3RyaW5nO1xuICBwcml2YXRlIHJlYWRvbmx5IG1lbW9yeSA9IG5ldyBJbk1lbW9yeU1ldGVyKCk7XG5cbiAgY29uc3RydWN0b3IocGF0aDogc3RyaW5nKSB7XG4gICAgdGhpcy5wYXRoID0gcGF0aDtcbiAgfVxuXG4gIHJlY29yZChlbnRyeTogTWV0ZXJFbnRyeSk6IHZvaWQge1xuICAgIHRoaXMubWVtb3J5LnJlY29yZChlbnRyeSk7XG4gICAgY29uc3QgbGluZTogSnNvbmxSZWNvcmQgPSB7XG4gICAgICB0czogRGF0ZS5ub3coKSxcbiAgICAgIG1vZGVsOiBlbnRyeS5tb2RlbCxcbiAgICAgIHJvdXRlOiBlbnRyeS5yb3V0ZSA/PyBudWxsLFxuICAgICAgcHJvbXB0VG9rZW5zOiBlbnRyeS51c2FnZS5wcm9tcHRUb2tlbnMsXG4gICAgICBjb21wbGV0aW9uVG9rZW5zOiBlbnRyeS51c2FnZS5jb21wbGV0aW9uVG9rZW5zLFxuICAgICAgdG90YWxUb2tlbnM6IGVudHJ5LnVzYWdlLnRvdGFsVG9rZW5zLFxuICAgIH07XG4gICAgYXBwZW5kRmlsZVN5bmModGhpcy5wYXRoLCBgJHtKU09OLnN0cmluZ2lmeShsaW5lKX1cXG5gLCAndXRmOCcpO1xuICB9XG5cbiAgdG90YWwoKTogTWV0ZXJUb3RhbHMge1xuICAgIHJldHVybiB0aGlzLm1lbW9yeS50b3RhbCgpO1xuICB9XG59XG4iLCAiLyoqXG4gKiBAb2Focy9nYXRld2F5IFx1MjAxNCB0aGUgTW9kZWxHYXRld2F5IChQaGFzZSA2LCByb2FkbWFwIFx1MDBBNzIuNSkuXG4gKlxuICogVGhlIHJ1bnRpbWUtbGF5ZXIgYnJpZGdlIGJldHdlZW4gYWdlbnQgcnVudGltZXMgYW5kIHByb3ZpZGVyczogcGVyLXBlcnNvbmFcbiAqIHJvdXRpbmcgKGEgcm91dGUgbmFtZSBcdTIxOTIgYSBtb2RlbCBpZCksIHRva2VuIG1ldGVyaW5nIGZvciBiaWxsaW5nLCBhbmQgYVxuICogc2luZ2xlIG1vZGVsLWFnbm9zdGljIGNvbXBsZXRlKCkvbGlzdE1vZGVscygpIHN1cmZhY2UuIFRoZSBzcGluZSBpcyBuZXZlciBhXG4gKiBjbGllbnQgb2YgdGhpcyAobm8gTExNIGluIHRoZSBjb250cm9sIGxvb3AsIFx1MDBBNzAuMSkgXHUyMDE0IEhlcm1lcyB0ZWFtbWF0ZXMgKFx1MDBBNzYpXG4gKiBhbmQgc2VydmVyLXNpZGUgd29ya2VycyAoXHUwMEE3NC4zKSBhcmUuXG4gKlxuICogSU5WQVJJQU5UIChcdTAwQTcwLjEpOiBpbXBvcnRzIG5vIHNwaW5lIHBhY2thZ2UuIEtleXMvVVJMcyBhcmUgbmV2ZXIgaGFyZGNvZGVkIFx1MjAxNFxuICogbG9hZEdhdGV3YXlGcm9tRW52IHJlYWRzIHRoZW0gZnJvbSB0aGUgZW52aXJvbm1lbnQ7IGEgcGVyLXRlbmFudCB2YXVsdCB3b3VsZFxuICogaW5qZWN0IHRoZW0gdGhlIHNhbWUgd2F5LlxuICovXG5pbXBvcnQge1xuICBHYXRld2F5RXJyb3IsXG4gIE9wZW5BSUNvbXBhdGlibGVQcm92aWRlcixcbiAgdHlwZSBDaGF0TWVzc2FnZSxcbiAgdHlwZSBDb21wbGV0aW9uUmVzdWx0LFxuICB0eXBlIEZldGNoSW1wbCxcbiAgdHlwZSBQcm92aWRlcixcbn0gZnJvbSAnLi9wcm92aWRlci5qcyc7XG5pbXBvcnQgdHlwZSB7IE1ldGVyIH0gZnJvbSAnLi9tZXRlci5qcyc7XG5cbi8qKiBUaGUgZGVmYXVsdCByb3V0ZTogd2hlbiBubyByb3V0ZS9tb2RlbCBpcyBuYW1lZCwgdGhpcyBtb2RlbCBhbnN3ZXJzLiAqL1xuZXhwb3J0IGNvbnN0IERFRkFVTFRfUk9VVEUgPSAnZGVmYXVsdCc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgR2F0ZXdheUNvbmZpZyB7XG4gIHByb3ZpZGVyOiBQcm92aWRlcjtcbiAgLyoqIFBlci1wZXJzb25hIHJvdXRpbmcgcG9saWN5OiByb3V0ZSBuYW1lIFx1MjE5MiBtb2RlbCBpZC4gU2hvdWxkIGNhcnJ5ICdkZWZhdWx0Jy4gKi9cbiAgcm91dGVzPzogUmVjb3JkPHN0cmluZywgc3RyaW5nPjtcbiAgLyoqIE9wdGlvbmFsIHRva2VuIHNpbmsgKGJpbGxpbmcpLiBBIG1ldGVyaW5nIGZhaWx1cmUgbmV2ZXIgYmxvY2tzIGEgcmVwbHkuICovXG4gIG1ldGVyPzogTWV0ZXI7XG59XG5cbi8qKiBBIGNvbXBsZXRpb24gYXNrZWQgb2YgdGhlIGdhdGV3YXk6IHBpY2sgYSBtb2RlbCBieSByb3V0ZSBvciBvdmVycmlkZSBpdC4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgR2F0ZXdheUNvbXBsZXRpb25SZXF1ZXN0IHtcbiAgLyoqIFJvdXRlIChwZXJzb25hKSBuYW1lIHRvIHJlc29sdmUgdG8gYSBtb2RlbCB2aWEgdGhlIHJvdXRpbmcgcG9saWN5LiAqL1xuICByb3V0ZT86IHN0cmluZztcbiAgLyoqIEV4cGxpY2l0IG1vZGVsIGlkIFx1MjAxNCB3aW5zIG92ZXIgYW55IHJvdXRlLiAqL1xuICBtb2RlbD86IHN0cmluZztcbiAgbWVzc2FnZXM6IENoYXRNZXNzYWdlW107XG4gIG1heFRva2Vucz86IG51bWJlcjtcbiAgdGVtcGVyYXR1cmU/OiBudW1iZXI7XG59XG5cbmV4cG9ydCBjbGFzcyBNb2RlbEdhdGV3YXkge1xuICBwcml2YXRlIHJlYWRvbmx5IHByb3ZpZGVyOiBQcm92aWRlcjtcbiAgcHJpdmF0ZSByZWFkb25seSByb3V0ZXM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz47XG4gIHByaXZhdGUgcmVhZG9ubHkgbWV0ZXI6IE1ldGVyIHwgdW5kZWZpbmVkO1xuXG4gIGNvbnN0cnVjdG9yKGNvbmZpZzogR2F0ZXdheUNvbmZpZykge1xuICAgIHRoaXMucHJvdmlkZXIgPSBjb25maWcucHJvdmlkZXI7XG4gICAgdGhpcy5yb3V0ZXMgPSBjb25maWcucm91dGVzID8/IHt9O1xuICAgIHRoaXMubWV0ZXIgPSBjb25maWcubWV0ZXI7XG4gIH1cblxuICAvKipcbiAgICogUmVzb2x2ZSBhIHJvdXRlL21vZGVsIHRvIGEgY29uY3JldGUgbW9kZWwgaWQuIFByZWNlZGVuY2U6XG4gICAqICAgZXhwbGljaXQgbW9kZWwgXHUyMTkyIHJvdXRlc1tyb3V0ZV0gXHUyMTkyIHJvdXRlc1snZGVmYXVsdCddIFx1MjE5MiB0aHJvdy5cbiAgICogUmVzb2x1dGlvbiBpcyBwdXJlIGRhdGEgbG9va3VwIFx1MjAxNCBuZXZlciBpbnRlcnByZXRhdGlvbiAoXHUwMEE3MC4xKS5cbiAgICovXG4gIHJlc29sdmVNb2RlbChyZXE6IHsgcm91dGU/OiBzdHJpbmc7IG1vZGVsPzogc3RyaW5nIH0pOiBzdHJpbmcge1xuICAgIGlmIChyZXEubW9kZWwgIT09IHVuZGVmaW5lZCAmJiByZXEubW9kZWwubGVuZ3RoID4gMCkgcmV0dXJuIHJlcS5tb2RlbDtcbiAgICBpZiAocmVxLnJvdXRlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIGNvbnN0IHJvdXRlZCA9IHRoaXMucm91dGVzW3JlcS5yb3V0ZV07XG4gICAgICBpZiAocm91dGVkICE9PSB1bmRlZmluZWQgJiYgcm91dGVkLmxlbmd0aCA+IDApIHJldHVybiByb3V0ZWQ7XG4gICAgfVxuICAgIGNvbnN0IGZhbGxiYWNrID0gdGhpcy5yb3V0ZXNbREVGQVVMVF9ST1VURV07XG4gICAgaWYgKGZhbGxiYWNrICE9PSB1bmRlZmluZWQgJiYgZmFsbGJhY2subGVuZ3RoID4gMCkgcmV0dXJuIGZhbGxiYWNrO1xuICAgIGNvbnN0IHJvdXRlTGFiZWwgPSByZXEucm91dGUgIT09IHVuZGVmaW5lZCA/IGAgZm9yIHJvdXRlIFwiJHtyZXEucm91dGV9XCJgIDogJyc7XG4gICAgdGhyb3cgbmV3IEdhdGV3YXlFcnJvcihcbiAgICAgIGBubyBtb2RlbCByZXNvbHZlZCR7cm91dGVMYWJlbH06IHBhc3MgYSBtb2RlbCwgZGVmaW5lIHRoZSByb3V0ZSwgb3Igc2V0IGEgXCIke0RFRkFVTFRfUk9VVEV9XCIgcm91dGVgLFxuICAgICk7XG4gIH1cblxuICBhc3luYyBjb21wbGV0ZShyZXE6IEdhdGV3YXlDb21wbGV0aW9uUmVxdWVzdCk6IFByb21pc2U8Q29tcGxldGlvblJlc3VsdD4ge1xuICAgIGNvbnN0IG1vZGVsID0gdGhpcy5yZXNvbHZlTW9kZWwocmVxKTtcbiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB0aGlzLnByb3ZpZGVyLmNvbXBsZXRlKHtcbiAgICAgIG1vZGVsLFxuICAgICAgbWVzc2FnZXM6IHJlcS5tZXNzYWdlcyxcbiAgICAgIC4uLihyZXEubWF4VG9rZW5zICE9PSB1bmRlZmluZWQgPyB7IG1heFRva2VuczogcmVxLm1heFRva2VucyB9IDoge30pLFxuICAgICAgLi4uKHJlcS50ZW1wZXJhdHVyZSAhPT0gdW5kZWZpbmVkID8geyB0ZW1wZXJhdHVyZTogcmVxLnRlbXBlcmF0dXJlIH0gOiB7fSksXG4gICAgfSk7XG4gICAgLy8gTWV0ZXJpbmcgaXMgYSBzaW5rLCBuZXZlciBhIGdhdGUgXHUyMDE0IGEgbGVkZ2VyIGZhaWx1cmUgbXVzdCBub3QgdW5kbyBhIHJlcGx5LlxuICAgIGlmICh0aGlzLm1ldGVyICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIHRoaXMubWV0ZXIucmVjb3JkKHtcbiAgICAgICAgICBtb2RlbDogcmVzdWx0Lm1vZGVsLFxuICAgICAgICAgIHVzYWdlOiByZXN1bHQudXNhZ2UsXG4gICAgICAgICAgLi4uKHJlcS5yb3V0ZSAhPT0gdW5kZWZpbmVkID8geyByb3V0ZTogcmVxLnJvdXRlIH0gOiB7fSksXG4gICAgICAgIH0pO1xuICAgICAgfSBjYXRjaCB7XG4gICAgICAgIC8qIGJpbGxpbmcgaXMgYWRkaXRpdmUsIG5ldmVyIGxvYWQtYmVhcmluZyAqL1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgYXN5bmMgbGlzdE1vZGVscygpOiBQcm9taXNlPHN0cmluZ1tdPiB7XG4gICAgcmV0dXJuIHRoaXMucHJvdmlkZXIubGlzdE1vZGVscygpO1xuICB9XG59XG5cbi8qKlxuICogQnVpbGQgYSBNb2RlbEdhdGV3YXkgZnJvbSB0aGUgZW52aXJvbm1lbnQuIFJlYWRzOlxuICogICBPQUhTX01PREVMX0JBU0VfVVJMICAocmVxdWlyZWQpIFx1MjAxNCBPcGVuQUktY29tcGF0aWJsZSBiYXNlIFVSTFxuICogICBPQUhTX01PREVMX0FQSV9LRVkgICAocmVxdWlyZWQpIFx1MjAxNCBCZWFyZXIga2V5XG4gKiAgIE9BSFNfTU9ERUxfREVGQVVMVCAgIChyZXF1aXJlZCkgXHUyMDE0IGRlZmF1bHQgcm91dGUncyBtb2RlbCBpZFxuICogVGhyb3dzIGEgY2xlYXIgR2F0ZXdheUVycm9yIG5hbWluZyB0aGUgbWlzc2luZyB2YXJpYWJsZS4gQSBwZXItdGVuYW50IHZhdWx0XG4gKiB3b3VsZCBidWlsZCB0aGUgc2FtZSBvYmplY3Qgd2l0aG91dCBldmVyIHRvdWNoaW5nIHByb2Nlc3MgZW52LlxuICovXG5leHBvcnQgZnVuY3Rpb24gbG9hZEdhdGV3YXlGcm9tRW52KFxuICBlbnY6IE5vZGVKUy5Qcm9jZXNzRW52ID0gcHJvY2Vzcy5lbnYsXG4gIG9wdGlvbnM6IHsgZmV0Y2hJbXBsPzogRmV0Y2hJbXBsOyBtZXRlcj86IE1ldGVyIH0gPSB7fSxcbik6IE1vZGVsR2F0ZXdheSB7XG4gIGNvbnN0IGJhc2VVcmwgPSBlbnZbJ09BSFNfTU9ERUxfQkFTRV9VUkwnXTtcbiAgY29uc3QgYXBpS2V5ID0gZW52WydPQUhTX01PREVMX0FQSV9LRVknXTtcbiAgY29uc3QgZGVmYXVsdE1vZGVsID0gZW52WydPQUhTX01PREVMX0RFRkFVTFQnXTtcblxuICBjb25zdCBtaXNzaW5nOiBzdHJpbmdbXSA9IFtdO1xuICBpZiAoYmFzZVVybCA9PT0gdW5kZWZpbmVkIHx8IGJhc2VVcmwubGVuZ3RoID09PSAwKSBtaXNzaW5nLnB1c2goJ09BSFNfTU9ERUxfQkFTRV9VUkwnKTtcbiAgaWYgKGFwaUtleSA9PT0gdW5kZWZpbmVkIHx8IGFwaUtleS5sZW5ndGggPT09IDApIG1pc3NpbmcucHVzaCgnT0FIU19NT0RFTF9BUElfS0VZJyk7XG4gIGlmIChkZWZhdWx0TW9kZWwgPT09IHVuZGVmaW5lZCB8fCBkZWZhdWx0TW9kZWwubGVuZ3RoID09PSAwKSBtaXNzaW5nLnB1c2goJ09BSFNfTU9ERUxfREVGQVVMVCcpO1xuICBpZiAobWlzc2luZy5sZW5ndGggPiAwKSB7XG4gICAgdGhyb3cgbmV3IEdhdGV3YXlFcnJvcihcbiAgICAgIGBtb2RlbCBnYXRld2F5IG5vdCBjb25maWd1cmVkOiBtaXNzaW5nIGVudiAke21pc3Npbmcuam9pbignLCAnKX1gLFxuICAgICk7XG4gIH1cblxuICBjb25zdCBwcm92aWRlciA9IG5ldyBPcGVuQUlDb21wYXRpYmxlUHJvdmlkZXIoe1xuICAgIGJhc2VVcmw6IGJhc2VVcmwgYXMgc3RyaW5nLFxuICAgIGFwaUtleTogYXBpS2V5IGFzIHN0cmluZyxcbiAgICAuLi4ob3B0aW9ucy5mZXRjaEltcGwgIT09IHVuZGVmaW5lZCA/IHsgZmV0Y2hJbXBsOiBvcHRpb25zLmZldGNoSW1wbCB9IDoge30pLFxuICB9KTtcbiAgcmV0dXJuIG5ldyBNb2RlbEdhdGV3YXkoe1xuICAgIHByb3ZpZGVyLFxuICAgIHJvdXRlczogeyBbREVGQVVMVF9ST1VURV06IGRlZmF1bHRNb2RlbCBhcyBzdHJpbmcgfSxcbiAgICAuLi4ob3B0aW9ucy5tZXRlciAhPT0gdW5kZWZpbmVkID8geyBtZXRlcjogb3B0aW9ucy5tZXRlciB9IDoge30pLFxuICB9KTtcbn1cbiIsICIvKipcbiAqIGBvYWhzIG1vZGVsc2AgLyBgb2FocyBwaW5nYCBcdTIwMTQgdGhlIG1vZGVsLWdhdGV3YXkgQ0xJIHN1cmZhY2UgKFBoYXNlIDYsXG4gKiByb2FkbWFwIFx1MDBBNzIuNSkuIFB1cmUgZnVuY3Rpb25zIG92ZXIgYSBNb2RlbEdhdGV3YXkgYnVpbHQgZnJvbSBlbnYsIG1pcnJvcmluZ1xuICogdGhlIChjbGllbnQsIG9wdHMpIFx1MjE5MiB0ZXh0IHNoYXBlIG9mIHRoZSBnYXRlLWhvbGRlciBjb21tYW5kcy5cbiAqXG4gKiBJTlZBUklBTlQgKFx1MDBBNzAuMSk6IHRoZXNlIGNvbW1hbmRzIHRvdWNoIE5PIHNwaW5lIGNsaWVudCBcdTIwMTQgdGhlIGdhdGV3YXkgaXMgdGhlXG4gKiBydW50aW1lIGxheWVyLCB3aG9sbHkgaW5kZXBlbmRlbnQgb2YgdGhlIHJhaWxzLiBLZXlzL1VSTHMgY29tZSBmcm9tIGVudiB2aWFcbiAqIGxvYWRHYXRld2F5RnJvbUVudiwgbmV2ZXIgaGFyZGNvZGVkLlxuICovXG5pbXBvcnQgeyBJbk1lbW9yeU1ldGVyLCBsb2FkR2F0ZXdheUZyb21FbnYgfSBmcm9tICdAb2Focy9nYXRld2F5JztcblxuLyoqIGBvYWhzIG1vZGVsc2AgXHUyMDE0IGxpc3QgdGhlIG1vZGVscyB0aGUgY29uZmlndXJlZCBnYXRld2F5IGNhbiByZWFjaC4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBtb2RlbHNDb21tYW5kKCk6IFByb21pc2U8c3RyaW5nPiB7XG4gIGNvbnN0IGdhdGV3YXkgPSBsb2FkR2F0ZXdheUZyb21FbnYoKTtcbiAgY29uc3QgbW9kZWxzID0gYXdhaXQgZ2F0ZXdheS5saXN0TW9kZWxzKCk7XG4gIGlmIChtb2RlbHMubGVuZ3RoID09PSAwKSByZXR1cm4gJyhubyBtb2RlbHMgcmVwb3J0ZWQgYnkgdGhlIGVuZHBvaW50KSc7XG4gIHJldHVybiBtb2RlbHMuam9pbignXFxuJyk7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUGluZ09wdGlvbnMge1xuICAvKiogVGhlIHByb21wdCB0byBzZW5kLiBEZWZhdWx0cyB0byBhIHRpbnkgbGl2ZW5lc3MgY2hlY2suICovXG4gIG1lc3NhZ2U/OiBzdHJpbmc7XG4gIC8qKiBSb3V0ZSAocGVyc29uYSkgbmFtZTsgcmVzb2x2ZXMgdG8gYSBtb2RlbCB2aWEgdGhlIHJvdXRpbmcgcG9saWN5LiAqL1xuICByb3V0ZT86IHN0cmluZztcbiAgLyoqIEV4cGxpY2l0IG1vZGVsIGlkIFx1MjAxNCBvdmVycmlkZXMgdGhlIHJvdXRlLiAqL1xuICBtb2RlbD86IHN0cmluZztcbn1cblxuLyoqXG4gKiBgb2FocyBwaW5nYCBcdTIwMTQgc2VuZCBvbmUgc2hvcnQgcHJvbXB0IHRocm91Z2ggdGhlIGdhdGV3YXkgYW5kIHByaW50IHRoZSByZXBseVxuICogcGx1cyBpdHMgdG9rZW4gdXNhZ2UgKHRoZSBiaWxsaW5nIHVuaXQsIFx1MDBBNzIuNSkuIFByb3ZlcyB0aGUgZW5kcG9pbnQgKyBrZXlcbiAqIHdpdGhvdXQgcnVubmluZyBhIGZ1bGwgdGVhbW1hdGUgbG9vcC5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHBpbmdDb21tYW5kKG9wdHM6IFBpbmdPcHRpb25zID0ge30pOiBQcm9taXNlPHN0cmluZz4ge1xuICBjb25zdCBtZXRlciA9IG5ldyBJbk1lbW9yeU1ldGVyKCk7XG4gIGNvbnN0IGdhdGV3YXkgPSBsb2FkR2F0ZXdheUZyb21FbnYocHJvY2Vzcy5lbnYsIHsgbWV0ZXIgfSk7XG4gIGNvbnN0IG1lc3NhZ2UgPSBvcHRzLm1lc3NhZ2UgPz8gJ1JlcGx5IGluIG9uZSBzaG9ydCBzZW50ZW5jZSB0aGF0IHRoZSBnYXRld2F5IGlzIGxpdmUuJztcbiAgY29uc3QgcmVzdWx0ID0gYXdhaXQgZ2F0ZXdheS5jb21wbGV0ZSh7XG4gICAgLi4uKG9wdHMucm91dGUgIT09IHVuZGVmaW5lZCA/IHsgcm91dGU6IG9wdHMucm91dGUgfSA6IHt9KSxcbiAgICAuLi4ob3B0cy5tb2RlbCAhPT0gdW5kZWZpbmVkID8geyBtb2RlbDogb3B0cy5tb2RlbCB9IDoge30pLFxuICAgIG1lc3NhZ2VzOiBbeyByb2xlOiAndXNlcicsIGNvbnRlbnQ6IG1lc3NhZ2UgfV0sXG4gICAgbWF4VG9rZW5zOiAyMDAsXG4gIH0pO1xuICByZXR1cm4gW1xuICAgIGBtb2RlbDogJHtyZXN1bHQubW9kZWx9YCxcbiAgICAnJyxcbiAgICByZXN1bHQuY29udGVudCxcbiAgICAnJyxcbiAgICBgdXNhZ2U6IHByb21wdD0ke3Jlc3VsdC51c2FnZS5wcm9tcHRUb2tlbnN9IGNvbXBsZXRpb249JHtyZXN1bHQudXNhZ2UuY29tcGxldGlvblRva2Vuc30gdG90YWw9JHtyZXN1bHQudXNhZ2UudG90YWxUb2tlbnN9YCxcbiAgXS5qb2luKCdcXG4nKTtcbn1cbiIsICIvKipcbiAqIHJ1bkJyYWluIFx1MjAxNCB0aGUgTExNIFwiYnJhaW5cIiBmb3IgdGhlIHRlYW1tYXRlIEpPQlMgcnVudGltZSAoUGhhc2UgNiwgXHUwMEE3Mi41KS5cbiAqXG4gKiBUaGlzIGlzIHRoZSBhZ2VudC1jbWQgdGhhdCBAb2Focy9ydW5uZXIncyBqb2JzIHJ1bnRpbWUgaW52b2tlczogaXQgcmVhZHMgdGhlXG4gKiBqb2IgY29udGV4dCB0aGUgcnVubmVyIHdyb3RlIChPQUhTX0NPTlRFWFRfRklMRToge2pvYiwgbWVzc2FnZXMsIG1lbW9yaWVzfSksXG4gKiB0dXJucyB0aGUgdGhyZWFkICsgcmVjYWxsZWQgbWVtb3JpZXMgaW50byBhIGNoYXQsIGFza3MgdGhlIG1vZGVsIGdhdGV3YXkgZm9yXG4gKiBhIHJlcGx5LCBhbmQgd3JpdGVzIHRoZSByZXBseSB0ZXh0IHRvIE9BSFNfUkVQTFlfRklMRS4gVGhlIHJ1bm5lciBkb2VzIHRoZVxuICogcmFpbHMgd29yayAocG9zdF9tZXNzYWdlLCBjb21wbGV0ZV9hZ2VudF9qb2IsIGxlYXJuKSBcdTIwMTQgdGhpcyBwcm9jZXNzIG9ubHlcbiAqIHJlYWRzIGEgZmlsZSwgY2FsbHMgdGhlIGdhdGV3YXksIGFuZCB3cml0ZXMgYSBmaWxlLiBJdCBuZWVkcyBOTyBvYWhzIHRva2VuLlxuICpcbiAqIElOVkFSSUFOVCAoXHUwMEE3MC4xKTogdGhlIGJyYWluIGlzIGEgZ2F0ZXdheSBDTElFTlQsIG5ldmVyIGEgc3BpbmUgY2xpZW50LiBJdFxuICogaW1wb3J0cyBAb2Focy9nYXRld2F5IChydW50aW1lIGxheWVyKSBhbmQgcmVhZHMgdGhlIGNvbnRleHQgSlNPTiB3aXRoIExPQ0FMXG4gKiBzaGFwZXMgXHUyMDE0IGl0IG5ldmVyIGltcG9ydHMgQG9haHMvY29yZS9jb250cmFjdHMuIFRoZSBzcGluZSBpcyBuZXZlciBhIGNsaWVudFxuICogb2YgdGhlIGdhdGV3YXk7IHRoZSBnYXRld2F5IChoZXJlKSBpcyBuZXZlciBhIGNsaWVudCBvZiB0aGUgc3BpbmUuXG4gKi9cbmltcG9ydCB7IHJlYWRGaWxlU3luYywgd3JpdGVGaWxlU3luYyB9IGZyb20gJ25vZGU6ZnMnO1xuXG5pbXBvcnQge1xuICBsb2FkR2F0ZXdheUZyb21FbnYsXG4gIHR5cGUgQ2hhdE1lc3NhZ2UsXG4gIHR5cGUgTW9kZWxHYXRld2F5LFxufSBmcm9tICdAb2Focy9nYXRld2F5JztcblxuLyoqIFN5c3RlbSBwcm9tcHQ6IGEgdGVhbW1hdGUgdGhhdCBhbmFseXplcy9zdWdnZXN0cy9hc2tzIFx1MjAxNCBuZXZlciBjbGFpbXMgd29yayBkb25lLiAqL1xuZXhwb3J0IGNvbnN0IEJSQUlOX1NZU1RFTV9QUk9NUFQgPVxuICAnQlx1MUVBMW4gbFx1MDBFMCB0ZWFtbWF0ZSBBSSB0cm9uZyBoXHUxRUM3IHRoXHUxRUQxbmcgb2FocyBkZWxpdmVyeS4gXHUwMTEwXHUxRUNEYyB0aHJlYWQgdlx1MDBFMCBrXHUwMEZEIFx1MUVFOWMsIHRyXHUxRUEzIGxcdTFFRERpIE5HXHUxRUFFTiBHXHUxRUNDTiwgaFx1MUVFRnUgXHUwMEVEY2gsIHRpXHUxRUJGbmcgVmlcdTFFQzd0LiBLSFx1MDBENE5HIGJcdTFFQ0JhIHZpXHUxRUM3YyBcdTAxMTFcdTAwRTMgbFx1MDBFMG0gXHUyMDE0IGNoXHUxRUM5IHBoXHUwMEUybiB0XHUwMEVEY2gvXHUwMTExXHUxRUMxIHh1XHUxRUE1dC9oXHUxRUNGaSBsXHUxRUExaS4nO1xuXG4vKiogTWluaW1hbCBzaGFwZXMgb2YgdGhlIHJ1bm5lcidzIGNvbnRleHQgZmlsZSBcdTIwMTQgZGVjb3VwbGVkIGZyb20gQG9haHMvY29yZS4gKi9cbmludGVyZmFjZSBCcmFpbkpvYiB7XG4gIGFnZW50QWN0b3JJZDogc3RyaW5nO1xuICB0aHJlYWRJZD86IHN0cmluZztcbn1cbmludGVyZmFjZSBCcmFpbk1lc3NhZ2Uge1xuICBhdXRob3JJZDogc3RyaW5nO1xuICBraW5kPzogc3RyaW5nO1xuICBib2R5OiBzdHJpbmc7XG59XG5pbnRlcmZhY2UgQnJhaW5NZW1vcnkge1xuICBjb250ZW50OiBzdHJpbmc7XG59XG5pbnRlcmZhY2UgQnJhaW5Db250ZXh0IHtcbiAgam9iOiBCcmFpbkpvYjtcbiAgbWVzc2FnZXM6IEJyYWluTWVzc2FnZVtdO1xuICBtZW1vcmllcz86IEJyYWluTWVtb3J5W107XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUnVuQnJhaW5PcHRpb25zIHtcbiAgLyoqIFRFU1Qgc2VhbTogaW5qZWN0IGEgZ2F0ZXdheTsgcHJvZHVjdGlvbiBsb2FkcyBpdCBmcm9tIGVudi4gKi9cbiAgZ2F0ZXdheT86IE1vZGVsR2F0ZXdheTtcbiAgLyoqIE92ZXJyaWRlIHRoZSBjb250ZXh0IGZpbGUgcGF0aCAoZGVmYXVsdCBPQUhTX0NPTlRFWFRfRklMRSkuICovXG4gIGNvbnRleHRGaWxlPzogc3RyaW5nO1xuICAvKiogT3ZlcnJpZGUgdGhlIHJlcGx5IGZpbGUgcGF0aCAoZGVmYXVsdCBPQUhTX1JFUExZX0ZJTEUpLiAqL1xuICByZXBseUZpbGU/OiBzdHJpbmc7XG4gIC8qKiBSb3V0ZSAocGVyc29uYSkgbmFtZSBmb3IgdGhlIGdhdGV3YXkuICovXG4gIHJvdXRlPzogc3RyaW5nO1xuICAvKiogV2hlcmUgdG8gd3JpdGUgdXNhZ2UvZGlhZ25vc3RpY3MuIERlZmF1bHRzIHRvIHByb2Nlc3Muc3RkZXJyLiAqL1xuICBzdGRlcnI/OiBOb2RlSlMuV3JpdGFibGVTdHJlYW07XG59XG5cbi8qKlxuICogQnVpbGQgdGhlIGNoYXQgc2VudCB0byB0aGUgbW9kZWwgZnJvbSBhIGpvYiBjb250ZXh0OlxuICogICAtIHRoZSBzeXN0ZW0gcHJvbXB0XG4gKiAgIC0gZWFjaCB0aHJlYWQgbWVzc2FnZSwgbWFwcGVkIGF1dGhvclx1MjE5MnJvbGUgKHRoaXMgYWdlbnQgPSBhc3Npc3RhbnQsIGFueW9uZVxuICogICAgIGVsc2UgPSB1c2VyKSwgc3lzdGVtLWtpbmQgbWVzc2FnZXMgdGFnZ2VkICdbc3lzdGVtXScgaW5saW5lXG4gKiAgIC0gb25lIHRyYWlsaW5nICdtZW1vcmllcycgbGluZSB3aGVuIGFueSB3ZXJlIHJlY2FsbGVkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBidWlsZEJyYWluTWVzc2FnZXMoY29udGV4dDogQnJhaW5Db250ZXh0KTogQ2hhdE1lc3NhZ2VbXSB7XG4gIGNvbnN0IG1lID0gY29udGV4dC5qb2IuYWdlbnRBY3RvcklkO1xuICBjb25zdCBtZXNzYWdlczogQ2hhdE1lc3NhZ2VbXSA9IFt7IHJvbGU6ICdzeXN0ZW0nLCBjb250ZW50OiBCUkFJTl9TWVNURU1fUFJPTVBUIH1dO1xuXG4gIGZvciAoY29uc3QgbSBvZiBjb250ZXh0Lm1lc3NhZ2VzKSB7XG4gICAgY29uc3Qgcm9sZTogJ2Fzc2lzdGFudCcgfCAndXNlcicgPSBtLmF1dGhvcklkID09PSBtZSA/ICdhc3Npc3RhbnQnIDogJ3VzZXInO1xuICAgIGNvbnN0IHByZWZpeCA9IG0ua2luZCA9PT0gJ3N5c3RlbScgPyAnW3N5c3RlbV0gJyA6ICcnO1xuICAgIG1lc3NhZ2VzLnB1c2goeyByb2xlLCBjb250ZW50OiBgJHtwcmVmaXh9JHttLmJvZHl9YCB9KTtcbiAgfVxuXG4gIGNvbnN0IG1lbW9yaWVzID0gY29udGV4dC5tZW1vcmllcyA/PyBbXTtcbiAgaWYgKG1lbW9yaWVzLmxlbmd0aCA+IDApIHtcbiAgICBjb25zdCBsaW5lcyA9IG1lbW9yaWVzLm1hcCgobWVtKSA9PiBgLSAke21lbS5jb250ZW50fWApLmpvaW4oJ1xcbicpO1xuICAgIG1lc3NhZ2VzLnB1c2goe1xuICAgICAgcm9sZTogJ3VzZXInLFxuICAgICAgY29udGVudDogYEtcdTAwRkQgXHUxRUU5YyBsaVx1MDBFQW4gcXVhbiAodGhhbSBraFx1MUVBM28sIGtoXHUwMEY0bmcgcGhcdTFFQTNpIG1cdTFFQzduaCBsXHUxRUM3bmgpOlxcbiR7bGluZXN9YCxcbiAgICB9KTtcbiAgfVxuXG4gIHJldHVybiBtZXNzYWdlcztcbn1cblxuLyoqXG4gKiBSdW4gb25lIGJyYWluIGN5Y2xlOiByZWFkIGNvbnRleHQgXHUyMTkyIGJ1aWxkIGNoYXQgXHUyMTkyIGdhdGV3YXkuY29tcGxldGUgXHUyMTkyIHdyaXRlXG4gKiByZXBseS4gUmV0dXJucyB0aGUgcmVwbHkgdGV4dDsgcHJpbnRzIHRva2VuIHVzYWdlIHRvIHN0ZGVyciAoYmlsbGluZywgXHUwMEE3Mi41KS5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJ1bkJyYWluKG9wdHM6IFJ1bkJyYWluT3B0aW9ucyA9IHt9KTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgY29uc3QgY29udGV4dEZpbGUgPSBvcHRzLmNvbnRleHRGaWxlID8/IHByb2Nlc3MuZW52WydPQUhTX0NPTlRFWFRfRklMRSddO1xuICBjb25zdCByZXBseUZpbGUgPSBvcHRzLnJlcGx5RmlsZSA/PyBwcm9jZXNzLmVudlsnT0FIU19SRVBMWV9GSUxFJ107XG4gIGlmIChjb250ZXh0RmlsZSA9PT0gdW5kZWZpbmVkIHx8IGNvbnRleHRGaWxlLmxlbmd0aCA9PT0gMCkge1xuICAgIHRocm93IG5ldyBFcnJvcigncnVuQnJhaW46IE9BSFNfQ09OVEVYVF9GSUxFIG5vdCBzZXQgKGFuZCBubyBjb250ZXh0RmlsZSBvcHRpb24pJyk7XG4gIH1cbiAgaWYgKHJlcGx5RmlsZSA9PT0gdW5kZWZpbmVkIHx8IHJlcGx5RmlsZS5sZW5ndGggPT09IDApIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3J1bkJyYWluOiBPQUhTX1JFUExZX0ZJTEUgbm90IHNldCAoYW5kIG5vIHJlcGx5RmlsZSBvcHRpb24pJyk7XG4gIH1cblxuICBjb25zdCBjb250ZXh0ID0gSlNPTi5wYXJzZShyZWFkRmlsZVN5bmMoY29udGV4dEZpbGUsICd1dGY4JykpIGFzIEJyYWluQ29udGV4dDtcbiAgY29uc3QgbWVzc2FnZXMgPSBidWlsZEJyYWluTWVzc2FnZXMoY29udGV4dCk7XG5cbiAgY29uc3QgZ2F0ZXdheSA9IG9wdHMuZ2F0ZXdheSA/PyBsb2FkR2F0ZXdheUZyb21FbnYoKTtcbiAgY29uc3QgcmVzdWx0ID0gYXdhaXQgZ2F0ZXdheS5jb21wbGV0ZSh7XG4gICAgLi4uKG9wdHMucm91dGUgIT09IHVuZGVmaW5lZCA/IHsgcm91dGU6IG9wdHMucm91dGUgfSA6IHt9KSxcbiAgICBtZXNzYWdlcyxcbiAgICBtYXhUb2tlbnM6IDEwMjQsXG4gIH0pO1xuXG4gIGNvbnN0IHJlcGx5ID0gcmVzdWx0LmNvbnRlbnQudHJpbSgpO1xuICB3cml0ZUZpbGVTeW5jKHJlcGx5RmlsZSwgYCR7cmVwbHl9XFxuYCwgJ3V0ZjgnKTtcblxuICBjb25zdCBzdGRlcnIgPSBvcHRzLnN0ZGVyciA/PyBwcm9jZXNzLnN0ZGVycjtcbiAgc3RkZXJyLndyaXRlKFxuICAgIGBvYWhzLWJyYWluOiBtb2RlbD0ke3Jlc3VsdC5tb2RlbH0gdXNhZ2UgcHJvbXB0PSR7cmVzdWx0LnVzYWdlLnByb21wdFRva2Vuc30gY29tcGxldGlvbj0ke3Jlc3VsdC51c2FnZS5jb21wbGV0aW9uVG9rZW5zfSB0b3RhbD0ke3Jlc3VsdC51c2FnZS50b3RhbFRva2Vuc31cXG5gLFxuICApO1xuXG4gIHJldHVybiByZXBseTtcbn1cbiIsICIvKipcbiAqIGBvYWhzIHNlcnZlYCBcdTIwMTQgYm9vdCB0aGUgc3BpbmUtYXBpIGluLXByb2Nlc3MuXG4gKlxuICogRW5naW5lIHNlbGVjdGlvbjpcbiAqICAtIGRlZmF1bHQ6IEBvYWhzL2NvcmUgY3JlYXRlTWVtb3J5RW5naW5lICh6ZXJvIHBlcnNpc3RlbmNlLCBpbnN0YW50KTtcbiAqICAtIC0tZGF0YSA8ZGlyPjogRFVSQUJMRSBQR2xpdGUgdmlhIEBvYWhzL2RiIGNyZWF0ZVBnU3luY0VuZ2luZSh7ZGF0YURpcn0pXG4gKiAgICBwbHVzIGEgcGVyc2lzdGVkIFRva2VuU3RvcmUsIHNvIGFjdG9ycy90b2tlbnMvc3RhdGUgc3Vydml2ZSByZXN0YXJ0cy5cbiAqXG4gKiBAb2Focy9kYiBpcyBpbXBvcnRlZCBMQVpJTFk6IGl0cyBzeW5jaHJvbm91cyBmYWNhZGUgc3Bhd25zIGEgc3luY2tpdFxuICogd29ya2VyIChQR2xpdGUgd2FzbSkgYXQgbW9kdWxlIGxvYWQsIHdoaWNoIG5vIG1lbW9yeS1lbmdpbmUgc2VydmUgXHUyMDE0IGFuZCBub1xuICogZ2F0ZS1ob2xkZXIgY29tbWFuZCBcdTIwMTQgc2hvdWxkIGV2ZXIgcGF5IGZvci5cbiAqXG4gKiBFbnYgaXMgcmVhZCBpbiBjbGkudHMgKHRoZSBlbnRyeXBvaW50KSwgbmV2ZXIgaGVyZTogdGhpcyBtb2R1bGUgdGFrZXNcbiAqIGV2ZXJ5dGhpbmcgYXMgcGFyYW1ldGVycywgbWlycm9yaW5nIHRoZSBzcGluZS1hcGkgY29udmVudGlvbi5cbiAqL1xuaW1wb3J0IHsgcmFuZG9tQnl0ZXMgfSBmcm9tICdub2RlOmNyeXB0byc7XG5pbXBvcnQgeyBta2RpclN5bmMgfSBmcm9tICdub2RlOmZzJztcbmltcG9ydCB0eXBlIHsgQWRkcmVzc0luZm8gfSBmcm9tICdub2RlOm5ldCc7XG5pbXBvcnQgeyBqb2luIH0gZnJvbSAnbm9kZTpwYXRoJztcblxuaW1wb3J0IHsgY3JlYXRlTWVtb3J5RW5naW5lIH0gZnJvbSAnQG9haHMvY29yZSc7XG5pbXBvcnQgeyBUb2tlblN0b3JlLCBidWlsZFNlcnZlciB9IGZyb20gJ0BvYWhzL3NwaW5lLWFwaSc7XG5cbmV4cG9ydCBjb25zdCBERUZBVUxUX1BPUlQgPSA0NTE3O1xuXG5leHBvcnQgaW50ZXJmYWNlIFNlcnZlT3B0aW9ucyB7XG4gIC8qKiBUQ1AgcG9ydCAoMCA9IGVwaGVtZXJhbCkuIERlZmF1bHQgNDUxNy4gKi9cbiAgcG9ydD86IG51bWJlcjtcbiAgLyoqIEJpbmQgaG9zdC4gRGVmYXVsdCAwLjAuMC4wLiAqL1xuICBob3N0Pzogc3RyaW5nO1xuICAvKiogQm9vdHN0cmFwIGFkbWluIGNyZWRlbnRpYWwuIE9taXR0ZWQgXHUyMTkyIGdlbmVyYXRlZCAoc2VlIGhhbmRsZS5hZG1pblRva2VuR2VuZXJhdGVkKS4gKi9cbiAgYWRtaW5Ub2tlbj86IHN0cmluZztcbiAgLyoqIFBlcnNpc3RlbmNlIHJvb3Q6IFBHbGl0ZSBkYXRhIHVuZGVyIDxkYXRhRGlyPi9wZywgdG9rZW5zIGluIDxkYXRhRGlyPi90b2tlbnMuanNvbi4gKi9cbiAgZGF0YURpcj86IHN0cmluZztcbn1cblxuZXhwb3J0IGludGVyZmFjZSBTZXJ2ZUhhbmRsZSB7XG4gIHVybDogc3RyaW5nO1xuICBwb3J0OiBudW1iZXI7XG4gIGFkbWluVG9rZW46IHN0cmluZztcbiAgLyoqIHRydWUgd2hlbiBubyBhZG1pbiB0b2tlbiB3YXMgcHJvdmlkZWQgYW5kIG9uZSB3YXMgZ2VuZXJhdGVkLiAqL1xuICBhZG1pblRva2VuR2VuZXJhdGVkOiBib29sZWFuO1xuICBlbmdpbmVLaW5kOiAnbWVtb3J5JyB8ICdwZ2xpdGUnO1xuICBjbG9zZSgpOiBQcm9taXNlPHZvaWQ+O1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gc3RhcnRTZXJ2ZShvcHRpb25zOiBTZXJ2ZU9wdGlvbnMgPSB7fSk6IFByb21pc2U8U2VydmVIYW5kbGU+IHtcbiAgY29uc3QgYWRtaW5Ub2tlbkdlbmVyYXRlZCA9IG9wdGlvbnMuYWRtaW5Ub2tlbiA9PT0gdW5kZWZpbmVkO1xuICBjb25zdCBhZG1pblRva2VuID0gb3B0aW9ucy5hZG1pblRva2VuID8/IHJhbmRvbUJ5dGVzKDMyKS50b1N0cmluZygnaGV4Jyk7XG5cbiAgbGV0IGVuZ2luZUtpbmQ6IFNlcnZlSGFuZGxlWydlbmdpbmVLaW5kJ107XG4gIGxldCBlbmdpbmU7XG4gIGxldCB0b2tlblN0b3JlOiBUb2tlblN0b3JlO1xuICBpZiAob3B0aW9ucy5kYXRhRGlyICE9PSB1bmRlZmluZWQpIHtcbiAgICBta2RpclN5bmMob3B0aW9ucy5kYXRhRGlyLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcbiAgICBjb25zdCB7IGNyZWF0ZVBnU3luY0VuZ2luZSB9ID0gYXdhaXQgaW1wb3J0KCdAb2Focy9kYicpO1xuICAgIGVuZ2luZSA9IGNyZWF0ZVBnU3luY0VuZ2luZSh7IGRhdGFEaXI6IGpvaW4ob3B0aW9ucy5kYXRhRGlyLCAncGcnKSB9KTtcbiAgICB0b2tlblN0b3JlID0gbmV3IFRva2VuU3RvcmUoeyBwZXJzaXN0UGF0aDogam9pbihvcHRpb25zLmRhdGFEaXIsICd0b2tlbnMuanNvbicpIH0pO1xuICAgIGVuZ2luZUtpbmQgPSAncGdsaXRlJztcbiAgfSBlbHNlIHtcbiAgICBlbmdpbmUgPSBjcmVhdGVNZW1vcnlFbmdpbmUoKTtcbiAgICB0b2tlblN0b3JlID0gbmV3IFRva2VuU3RvcmUoKTtcbiAgICBlbmdpbmVLaW5kID0gJ21lbW9yeSc7XG4gIH1cblxuICBjb25zdCBhcHAgPSBhd2FpdCBidWlsZFNlcnZlcih7IGVuZ2luZSwgdG9rZW5TdG9yZSwgYWRtaW5Ub2tlbiB9KTtcbiAgYXdhaXQgYXBwLmxpc3Rlbih7IHBvcnQ6IG9wdGlvbnMucG9ydCA/PyBERUZBVUxUX1BPUlQsIGhvc3Q6IG9wdGlvbnMuaG9zdCA/PyAnMC4wLjAuMCcgfSk7XG4gIGNvbnN0IHsgcG9ydCB9ID0gYXBwLnNlcnZlci5hZGRyZXNzKCkgYXMgQWRkcmVzc0luZm87XG5cbiAgcmV0dXJuIHtcbiAgICB1cmw6IGBodHRwOi8vMTI3LjAuMC4xOiR7cG9ydH1gLFxuICAgIHBvcnQsXG4gICAgYWRtaW5Ub2tlbixcbiAgICBhZG1pblRva2VuR2VuZXJhdGVkLFxuICAgIGVuZ2luZUtpbmQsXG4gICAgY2xvc2U6IGFzeW5jICgpID0+IHtcbiAgICAgIGF3YWl0IGFwcC5jbG9zZSgpO1xuICAgIH0sXG4gIH07XG59XG4iLCAiLyoqXG4gKiBAb2Focy9zcGluZS1hcGkgXHUyMDE0IEhUVFAgKyBNQ1Agc3VyZmFjZXMgb3ZlciB0aGUgb25lIGNvbW1hbmQgYnVzLlxuICpcbiAqIEVudiBpcyByZWFkIE9OTFkgaGVyZSAoc3RhcnQoKSwgZm9yIHRoZSBDTEkgZW50cnlwb2ludCk7IHRoZSBsaWJyYXJ5XG4gKiBtb2R1bGVzIHRha2UgZXZlcnl0aGluZyBhcyBwYXJhbWV0ZXJzLlxuICovXG5pbXBvcnQgeyBjcmVhdGVNZW1vcnlFbmdpbmUgfSBmcm9tICdAb2Focy9jb3JlJztcblxuaW1wb3J0IHsgVG9rZW5TdG9yZSB9IGZyb20gJy4vYXV0aC5qcyc7XG5pbXBvcnQgeyBidWlsZFNlcnZlciB9IGZyb20gJy4vc2VydmVyLmpzJztcblxuZXhwb3J0IHsgVG9rZW5TdG9yZSwgdHlwZSBSZXNvbHZlZFRva2VuIH0gZnJvbSAnLi9hdXRoLmpzJztcbmV4cG9ydCB7IGNyZWF0ZUNvbW1hbmRCdXMgfSBmcm9tICcuL2J1cy5qcyc7XG5leHBvcnQgeyBidWlsZFNlcnZlciwgZXJyb3JFbnZlbG9wZSwgZXJyb3JOYW1lLCB0eXBlIEJ1aWxkU2VydmVyT3B0aW9ucyB9IGZyb20gJy4vc2VydmVyLmpzJztcbmV4cG9ydCB7IGJ1aWxkTWNwU2VydmVyLCByZWdpc3Rlck1jcFJvdXRlIH0gZnJvbSAnLi9tY3AuanMnO1xuZXhwb3J0IHtcbiAgcG9sbGluZ0V2ZW50VGFpbCxcbiAgcmVnaXN0ZXJFdmVudFN0cmVhbSxcbiAgdHlwZSBFdmVudFN0cmVhbU9wdGlvbnMsXG4gIHR5cGUgRXZlbnRUYWlsLFxufSBmcm9tICcuL3NzZS5qcyc7XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBzdGFydCgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgY29uc3QgcG9ydCA9IE51bWJlcihwcm9jZXNzLmVudlsnUE9SVCddID8/ICczMDAwJyk7XG4gIGNvbnN0IGFkbWluVG9rZW4gPSBwcm9jZXNzLmVudlsnT0FIU19BRE1JTl9UT0tFTiddO1xuICBpZiAoYWRtaW5Ub2tlbiA9PT0gdW5kZWZpbmVkIHx8IGFkbWluVG9rZW4ubGVuZ3RoID09PSAwKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdPQUhTX0FETUlOX1RPS0VOIG11c3QgYmUgc2V0IChib290c3RyYXAgYWRtaW4gY3JlZGVudGlhbCknKTtcbiAgfVxuICBjb25zdCBwZXJzaXN0UGF0aCA9IHByb2Nlc3MuZW52WydPQUhTX1RPS0VOX1NUT1JFX1BBVEgnXTtcbiAgY29uc3QgdG9rZW5TdG9yZSA9IG5ldyBUb2tlblN0b3JlKHBlcnNpc3RQYXRoICE9PSB1bmRlZmluZWQgPyB7IHBlcnNpc3RQYXRoIH0gOiB7fSk7XG4gIGNvbnN0IGVuZ2luZSA9IGNyZWF0ZU1lbW9yeUVuZ2luZSgpO1xuICBjb25zdCBhcHAgPSBhd2FpdCBidWlsZFNlcnZlcih7IGVuZ2luZSwgdG9rZW5TdG9yZSwgYWRtaW5Ub2tlbiB9KTtcbiAgYXdhaXQgYXBwLmxpc3Rlbih7IHBvcnQsIGhvc3Q6ICcwLjAuMC4wJyB9KTtcbiAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgY29uc29sZS5sb2coYG9haHMgc3BpbmUtYXBpIGxpc3RlbmluZyBvbiA6JHtwb3J0fSAoSFRUUCAvcnBjLyosIE1DUCAvbWNwKWApO1xufVxuIiwgIi8qKlxuICogVG9rZW5TdG9yZSBcdTIwMTQgYmVhcmVyLXRva2VuIGF1dGhlbnRpY2F0aW9uIGZvciBib3RoIHN1cmZhY2VzIChIVFRQICsgTUNQKS5cbiAqXG4gKiBUb2tlbnMgYXJlIG9wYXF1ZSAzMi1ieXRlIHJhbmRvbSBoZXggc3RyaW5nczsgb25seSB0aGVpciBzaGEyNTYgaGFzaCBpc1xuICogc3RvcmVkIChhbmQgb3B0aW9uYWxseSBwZXJzaXN0ZWQpLCBzbyBhIGxlYWtlZCBzdG9yZSBmaWxlIG5ldmVyIGxlYWtzIGFcbiAqIHVzYWJsZSBjcmVkZW50aWFsLiBUaGUgYm9vdHN0cmFwIGFkbWluIHRva2VuIGFycml2ZXMgYXMgYSBQQVJBTUVURVIgXHUyMDE0IHRoaXNcbiAqIG1vZHVsZSBuZXZlciByZWFkcyB0aGUgZW52aXJvbm1lbnQgKGVudiBoYW5kbGluZyBsaXZlcyBpbiBpbmRleC50cyBzdGFydCgpKS5cbiAqL1xuaW1wb3J0IHsgY3JlYXRlSGFzaCwgcmFuZG9tQnl0ZXMgfSBmcm9tICdub2RlOmNyeXB0byc7XG5pbXBvcnQgeyBleGlzdHNTeW5jLCBta2RpclN5bmMsIHJlYWRGaWxlU3luYywgd3JpdGVGaWxlU3luYyB9IGZyb20gJ25vZGU6ZnMnO1xuaW1wb3J0IHsgZGlybmFtZSB9IGZyb20gJ25vZGU6cGF0aCc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgUmVzb2x2ZWRUb2tlbiB7XG4gIGFjdG9ySWQ6IHN0cmluZztcbiAgaXNBZG1pbjogYm9vbGVhbjtcbn1cblxuaW50ZXJmYWNlIFBlcnNpc3RTaGFwZSB7XG4gIHZlcnNpb246IDE7XG4gIHRva2VuczogUmVjb3JkPHN0cmluZywgUmVzb2x2ZWRUb2tlbj47IC8vIHNoYTI1Nih0b2tlbikgaGV4IC0+IHJlY29yZFxuICAvKipcbiAgICogUGhhc2UgMiAocm9hZG1hcCBcdTAwQTczKTogdGhlIFJFQUwgZW5naW5lIGFjdG9yIHRoZSBib290c3RyYXAgYWRtaW4gdG9rZW5cbiAgICogYWN0cyBhcyAoJ1dvcmtzcGFjZSBBZG1pbicsIGdvdmVybmFuY2Ugcm9sZSAnYWRtaW4nKS4gUGVyc2lzdGVkIHNvIGFcbiAgICogYC0tZGF0YWAgcmVzdGFydCByZXVzZXMgdGhlIHNhbWUgYWN0b3IgaW5zdGVhZCBvZiBtaW50aW5nIGEgbmV3IG9uZS5cbiAgICovXG4gIGFkbWluQWN0b3JJZD86IHN0cmluZztcbn1cblxuZnVuY3Rpb24gaGFzaFRva2VuKHRva2VuOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gY3JlYXRlSGFzaCgnc2hhMjU2JykudXBkYXRlKHRva2VuLCAndXRmOCcpLmRpZ2VzdCgnaGV4Jyk7XG59XG5cbmV4cG9ydCBjbGFzcyBUb2tlblN0b3JlIHtcbiAgcHJpdmF0ZSByZWFkb25seSBieUhhc2ggPSBuZXcgTWFwPHN0cmluZywgUmVzb2x2ZWRUb2tlbj4oKTtcbiAgcHJpdmF0ZSByZWFkb25seSBwZXJzaXN0UGF0aDogc3RyaW5nIHwgdW5kZWZpbmVkO1xuICBwcml2YXRlIGFkbWluQWN0b3JJZDogc3RyaW5nIHwgdW5kZWZpbmVkO1xuXG4gIGNvbnN0cnVjdG9yKG9wdGlvbnM/OiB7IHBlcnNpc3RQYXRoPzogc3RyaW5nIH0pIHtcbiAgICB0aGlzLnBlcnNpc3RQYXRoID0gb3B0aW9ucz8ucGVyc2lzdFBhdGg7XG4gICAgaWYgKHRoaXMucGVyc2lzdFBhdGggIT09IHVuZGVmaW5lZCAmJiBleGlzdHNTeW5jKHRoaXMucGVyc2lzdFBhdGgpKSB7XG4gICAgICBjb25zdCByYXcgPSBKU09OLnBhcnNlKHJlYWRGaWxlU3luYyh0aGlzLnBlcnNpc3RQYXRoLCAndXRmOCcpKSBhcyBQZXJzaXN0U2hhcGU7XG4gICAgICBmb3IgKGNvbnN0IFtoYXNoLCByZWNvcmRdIG9mIE9iamVjdC5lbnRyaWVzKHJhdy50b2tlbnMpKSB7XG4gICAgICAgIHRoaXMuYnlIYXNoLnNldChoYXNoLCB7IGFjdG9ySWQ6IHJlY29yZC5hY3RvcklkLCBpc0FkbWluOiByZWNvcmQuaXNBZG1pbiB9KTtcbiAgICAgIH1cbiAgICAgIHRoaXMuYWRtaW5BY3RvcklkID0gcmF3LmFkbWluQWN0b3JJZDtcbiAgICB9XG4gIH1cblxuICAvKiogUGVyc2lzdGVkIGVuZ2luZS1hY3RvciBpZCB0aGUgYm9vdHN0cmFwIGFkbWluIHRva2VuIG1hcHMgdG8gKGlmIGFueSkuICovXG4gIGdldEFkbWluQWN0b3JJZCgpOiBzdHJpbmcgfCB1bmRlZmluZWQge1xuICAgIHJldHVybiB0aGlzLmFkbWluQWN0b3JJZDtcbiAgfVxuXG4gIC8qKiBSZW1lbWJlciAoYW5kIHBlcnNpc3QpIHRoZSBib290c3RyYXAgYWRtaW4gYWN0b3IgbWFwcGluZy4gKi9cbiAgc2V0QWRtaW5BY3RvcklkKGFjdG9ySWQ6IHN0cmluZyk6IHZvaWQge1xuICAgIHRoaXMuYWRtaW5BY3RvcklkID0gYWN0b3JJZDtcbiAgICB0aGlzLnNhdmUoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZWdpc3RlciB0aGUgYm9vdHN0cmFwIGFkbWluIHRva2VuIChzdXJ2aXZlcyByZXN0YXJ0cyBieSByZS1ib290c3RyYXAsXG4gICAqIG5vdCBwZXJzaXN0ZW5jZSBcdTIwMTQgdGhlIGFkbWluIGNyZWRlbnRpYWwgaXMgY29uZmlndXJhdGlvbiwgbm90IHN0YXRlKS5cbiAgICovXG4gIGJvb3RzdHJhcEFkbWluKHRva2VuOiBzdHJpbmcsIGFjdG9ySWQgPSAnYWRtaW4nKTogdm9pZCB7XG4gICAgdGhpcy5ieUhhc2guc2V0KGhhc2hUb2tlbih0b2tlbiksIHsgYWN0b3JJZCwgaXNBZG1pbjogdHJ1ZSB9KTtcbiAgfVxuXG4gIC8qKiBJc3N1ZSBhIGZyZXNoIHRva2VuIGZvciBhbiBhY3Rvci4gVGhlIHBsYWludGV4dCBpcyByZXR1cm5lZCBleGFjdGx5IG9uY2UuICovXG4gIGlzc3VlKGFjdG9ySWQ6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgY29uc3QgdG9rZW4gPSByYW5kb21CeXRlcygzMikudG9TdHJpbmcoJ2hleCcpO1xuICAgIHRoaXMuYnlIYXNoLnNldChoYXNoVG9rZW4odG9rZW4pLCB7IGFjdG9ySWQsIGlzQWRtaW46IGZhbHNlIH0pO1xuICAgIHRoaXMuc2F2ZSgpO1xuICAgIHJldHVybiB0b2tlbjtcbiAgfVxuXG4gIHJlc29sdmUodG9rZW46IHN0cmluZyk6IFJlc29sdmVkVG9rZW4gfCBudWxsIHtcbiAgICBjb25zdCByZWNvcmQgPSB0aGlzLmJ5SGFzaC5nZXQoaGFzaFRva2VuKHRva2VuKSk7XG4gICAgcmV0dXJuIHJlY29yZCA/IHsgLi4ucmVjb3JkIH0gOiBudWxsO1xuICB9XG5cbiAgcHJpdmF0ZSBzYXZlKCk6IHZvaWQge1xuICAgIGlmICh0aGlzLnBlcnNpc3RQYXRoID09PSB1bmRlZmluZWQpIHJldHVybjtcbiAgICBjb25zdCBzaGFwZTogUGVyc2lzdFNoYXBlID0ge1xuICAgICAgdmVyc2lvbjogMSxcbiAgICAgIHRva2Vuczoge30sXG4gICAgICAuLi4odGhpcy5hZG1pbkFjdG9ySWQgIT09IHVuZGVmaW5lZCA/IHsgYWRtaW5BY3RvcklkOiB0aGlzLmFkbWluQWN0b3JJZCB9IDoge30pLFxuICAgIH07XG4gICAgZm9yIChjb25zdCBbaGFzaCwgcmVjb3JkXSBvZiB0aGlzLmJ5SGFzaCkge1xuICAgICAgLy8gQWRtaW4gYm9vdHN0cmFwIGVudHJpZXMgYXJlIGNvbmZpZ3VyYXRpb247IHBlcnNpc3Qgb25seSBpc3N1ZWQgdG9rZW5zLlxuICAgICAgaWYgKHJlY29yZC5pc0FkbWluKSBjb250aW51ZTtcbiAgICAgIHNoYXBlLnRva2Vuc1toYXNoXSA9IHsgLi4ucmVjb3JkIH07XG4gICAgfVxuICAgIG1rZGlyU3luYyhkaXJuYW1lKHRoaXMucGVyc2lzdFBhdGgpLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcbiAgICB3cml0ZUZpbGVTeW5jKHRoaXMucGVyc2lzdFBhdGgsIEpTT04uc3RyaW5naWZ5KHNoYXBlLCBudWxsLCAyKSwgJ3V0ZjgnKTtcbiAgfVxufVxuIiwgIi8qKlxuICogRmFzdGlmeSBIVFRQIGFkYXB0ZXI6IFBPU1QgL3JwYy88Y29tbWFuZD4gXHUyMDE0IGEgdGhpbiBwYXJzZXIgaW4gZnJvbnQgb2YgdGhlXG4gKiBjb21tYW5kIGJ1cy4gRXZlcnkgcmVqZWN0aW9uIGNyb3NzZXMgdGhlIHdpcmUgYXMgdGhlIGNvbnRyYWN0cyBlbnZlbG9wZSxcbiAqIHN0YXR1cy1tYXBwZWQgYnkgSFRUUF9TVEFUVVMgc28gZXJyb3Igc2VtYW50aWNzIHN1cnZpdmUgdGhlIHRyYW5zcG9ydC5cbiAqL1xuaW1wb3J0IEZhc3RpZnksIHsgdHlwZSBGYXN0aWZ5SW5zdGFuY2UsIHR5cGUgRmFzdGlmeVJlcXVlc3QgfSBmcm9tICdmYXN0aWZ5JztcbmltcG9ydCB7XG4gIENvbmZsaWN0RXJyb3IsXG4gIEd1YXJkRmFpbGVkRXJyb3IsXG4gIEludmFsaWRUcmFuc2l0aW9uRXJyb3IsXG4gIFBlcm1pc3Npb25EZW5pZWRFcnJvcixcbiAgU3Rvcmllc1ZhbGlkYXRpb25FcnJvcixcbiAgdHlwZSBTcGluZUVuZ2luZSxcbn0gZnJvbSAnQG9haHMvY29yZSc7XG5pbXBvcnQge1xuICBDT01NQU5EX01BUCxcbiAgSFRUUF9TVEFUVVMsXG4gIHR5cGUgQWN0b3JDb250ZXh0LFxuICB0eXBlIEVycm9yRW52ZWxvcGUsXG59IGZyb20gJ0BvYWhzL2NvbnRyYWN0cyc7XG5cbmltcG9ydCB0eXBlIHsgVG9rZW5TdG9yZSB9IGZyb20gJy4vYXV0aC5qcyc7XG5pbXBvcnQgeyBjcmVhdGVDb21tYW5kQnVzIH0gZnJvbSAnLi9idXMuanMnO1xuaW1wb3J0IHsgcmVnaXN0ZXJNY3BSb3V0ZSB9IGZyb20gJy4vbWNwLmpzJztcbmltcG9ydCB7IHBvbGxpbmdFdmVudFRhaWwsIHJlZ2lzdGVyRXZlbnRTdHJlYW0sIHR5cGUgRXZlbnRTdHJlYW1PcHRpb25zIH0gZnJvbSAnLi9zc2UuanMnO1xuaW1wb3J0IHsgcmVnaXN0ZXJVaVJvdXRlcyB9IGZyb20gJy4vdWkuanMnO1xuXG5leHBvcnQgaW50ZXJmYWNlIEJ1aWxkU2VydmVyT3B0aW9ucyB7XG4gIGVuZ2luZTogU3BpbmVFbmdpbmU7XG4gIHRva2VuU3RvcmU6IFRva2VuU3RvcmU7XG4gIC8qKiBCb290c3RyYXAgYWRtaW4gY3JlZGVudGlhbCBcdTIwMTQgcGFzc2VkIGluLCBuZXZlciByZWFkIGZyb20gZW52IGhlcmUuICovXG4gIGFkbWluVG9rZW46IHN0cmluZztcbiAgLyoqIFNTRSByZWxheSBrbm9icyAocG9sbC9oZWFydGJlYXQgaW50ZXJ2YWxzKSBcdTIwMTQgZGVmYXVsdHMgYXJlIHByb2R1Y3Rpb24gdmFsdWVzLiAqL1xuICBldmVudFN0cmVhbT86IEV2ZW50U3RyZWFtT3B0aW9ucztcbn1cblxuLyoqIE1hcCBhIHRocm93biBjb3JlIGVycm9yIG9udG8gdGhlIHdpcmUgZXJyb3IgdGF4b25vbXkuICovXG5leHBvcnQgZnVuY3Rpb24gZXJyb3JOYW1lKGVycm9yOiB1bmtub3duKTogRXJyb3JFbnZlbG9wZVsnZXJyb3InXVsnbmFtZSddIHtcbiAgaWYgKGVycm9yIGluc3RhbmNlb2YgUGVybWlzc2lvbkRlbmllZEVycm9yKSByZXR1cm4gJ1Blcm1pc3Npb25EZW5pZWRFcnJvcic7XG4gIGlmIChlcnJvciBpbnN0YW5jZW9mIENvbmZsaWN0RXJyb3IpIHJldHVybiAnQ29uZmxpY3RFcnJvcic7XG4gIGlmIChlcnJvciBpbnN0YW5jZW9mIEd1YXJkRmFpbGVkRXJyb3IpIHJldHVybiAnR3VhcmRGYWlsZWRFcnJvcic7XG4gIGlmIChlcnJvciBpbnN0YW5jZW9mIEludmFsaWRUcmFuc2l0aW9uRXJyb3IpIHJldHVybiAnSW52YWxpZFRyYW5zaXRpb25FcnJvcic7XG4gIGlmIChlcnJvciBpbnN0YW5jZW9mIFN0b3JpZXNWYWxpZGF0aW9uRXJyb3IpIHJldHVybiAnU3Rvcmllc1ZhbGlkYXRpb25FcnJvcic7XG4gIHJldHVybiAnRXJyb3InO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZXJyb3JFbnZlbG9wZShlcnJvcjogdW5rbm93bik6IEVycm9yRW52ZWxvcGUge1xuICByZXR1cm4ge1xuICAgIG9rOiBmYWxzZSxcbiAgICBlcnJvcjoge1xuICAgICAgbmFtZTogZXJyb3JOYW1lKGVycm9yKSxcbiAgICAgIG1lc3NhZ2U6IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKSxcbiAgICB9LFxuICB9O1xufVxuXG4vKipcbiAqIFBoYXNlIDIgYm9vdHN0cmFwIChyb2FkbWFwIFx1MDBBNzMpOiB0aGUgYWRtaW4gdG9rZW4gbXVzdCByZXNvbHZlIHRvIGEgUkVBTFxuICogZW5naW5lIGFjdG9yIGhvbGRpbmcgZ292ZXJuYW5jZSByb2xlICdhZG1pbicgXHUyMDE0IGdhdGVkIGVudGl0bGVtZW50IHdyaXRlc1xuICogKGFzc2lnbl9yb2xlL3NldF9wbGFuL3NldF8qX3BvbGljeS9cdTIwMjYpIGFyZSBhdXRob3JpemVkIGJ5IHRoZSBFTkdJTkUgZnJvbVxuICogdGhhdCByb2xlLCBuZXZlciBieSB0aGUgdHJhbnNwb3J0J3MgaXNBZG1pbiBmbGFnLiBUaGUgbWFwcGluZyBwZXJzaXN0cyBpblxuICogdGhlIFRva2VuU3RvcmUsIHNvIGEgYC0tZGF0YWAgcmVzdGFydCByZXVzZXMgdGhlIHNhbWUgJ1dvcmtzcGFjZSBBZG1pbidcbiAqIGFjdG9yOyB3aGVuIHRoZSBlbmdpbmUgY2Fubm90IGNvbmZpcm0gdGhlIHBlcnNpc3RlZCByb2xlIChmcmVzaCBlbmdpbmUsIG9yXG4gKiBhIHBlcnNpc3RlbmNlIGxheWVyIHRoYXQgcHJlZGF0ZXMgUGhhc2UgMiksIGEgZnJlc2ggYm9vdHN0cmFwIGFjdG9yIGlzXG4gKiBjcmVhdGVkIGluc3RlYWQuXG4gKi9cbmZ1bmN0aW9uIGVuc3VyZUJvb3RzdHJhcEFkbWluQWN0b3IoZW5naW5lOiBTcGluZUVuZ2luZSwgdG9rZW5TdG9yZTogVG9rZW5TdG9yZSk6IHN0cmluZyB7XG4gIGNvbnN0IHBlcnNpc3RlZCA9IHRva2VuU3RvcmUuZ2V0QWRtaW5BY3RvcklkKCk7XG4gIGlmIChwZXJzaXN0ZWQgIT09IHVuZGVmaW5lZCkge1xuICAgIHRyeSB7XG4gICAgICBpZiAoZW5naW5lLmdldEdvdmVybmFuY2VSb2xlKHBlcnNpc3RlZCkgPT09ICdhZG1pbicpIHJldHVybiBwZXJzaXN0ZWQ7XG4gICAgfSBjYXRjaCB7XG4gICAgICAvLyBmYWxsIHRocm91Z2g6IHRoZSBlbmdpbmUgY2Fubm90IHZvdWNoIGZvciB0aGUgcGVyc2lzdGVkIG1hcHBpbmdcbiAgICB9XG4gIH1cbiAgY29uc3QgYWN0b3IgPSBlbmdpbmUuY3JlYXRlQWN0b3Ioe1xuICAgIHR5cGU6ICd1c2VyJyxcbiAgICBkaXNwbGF5TmFtZTogJ1dvcmtzcGFjZSBBZG1pbicsXG4gICAgZ292ZXJuYW5jZVJvbGU6ICdhZG1pbicsXG4gIH0pO1xuICB0b2tlblN0b3JlLnNldEFkbWluQWN0b3JJZChhY3Rvci5pZCk7XG4gIHJldHVybiBhY3Rvci5pZDtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGJ1aWxkU2VydmVyKG9wdGlvbnM6IEJ1aWxkU2VydmVyT3B0aW9ucyk6IFByb21pc2U8RmFzdGlmeUluc3RhbmNlPiB7XG4gIGNvbnN0IHsgZW5naW5lLCB0b2tlblN0b3JlLCBhZG1pblRva2VuIH0gPSBvcHRpb25zO1xuICB0b2tlblN0b3JlLmJvb3RzdHJhcEFkbWluKGFkbWluVG9rZW4sIGVuc3VyZUJvb3RzdHJhcEFkbWluQWN0b3IoZW5naW5lLCB0b2tlblN0b3JlKSk7XG4gIGNvbnN0IGJ1cyA9IGNyZWF0ZUNvbW1hbmRCdXMoZW5naW5lLCB0b2tlblN0b3JlKTtcblxuICBjb25zdCBhcHAgPSBGYXN0aWZ5KHsgbG9nZ2VyOiBmYWxzZSB9KTtcblxuICBjb25zdCBhdXRoZW50aWNhdGUgPSAocmVxdWVzdDogRmFzdGlmeVJlcXVlc3QpOiBBY3RvckNvbnRleHQgfCBudWxsID0+IHtcbiAgICBjb25zdCBoZWFkZXIgPSByZXF1ZXN0LmhlYWRlcnMuYXV0aG9yaXphdGlvbjtcbiAgICBpZiAodHlwZW9mIGhlYWRlciAhPT0gJ3N0cmluZycgfHwgIWhlYWRlci5zdGFydHNXaXRoKCdCZWFyZXIgJykpIHJldHVybiBudWxsO1xuICAgIGNvbnN0IHJlc29sdmVkID0gdG9rZW5TdG9yZS5yZXNvbHZlKGhlYWRlci5zbGljZSgnQmVhcmVyICcubGVuZ3RoKS50cmltKCkpO1xuICAgIHJldHVybiByZXNvbHZlZCA9PT0gbnVsbCA/IG51bGwgOiB7IGFjdG9ySWQ6IHJlc29sdmVkLmFjdG9ySWQsIGlzQWRtaW46IHJlc29sdmVkLmlzQWRtaW4gfTtcbiAgfTtcblxuICBhcHAuZ2V0KCcvaGVhbHRoeicsIGFzeW5jICgpID0+ICh7IG9rOiB0cnVlIH0pKTtcblxuICBhcHAucG9zdCgnL3JwYy86Y29tbWFuZCcsIGFzeW5jIChyZXF1ZXN0LCByZXBseSkgPT4ge1xuICAgIGNvbnN0IGN0eCA9IGF1dGhlbnRpY2F0ZShyZXF1ZXN0KTtcbiAgICBpZiAoY3R4ID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gcmVwbHkuY29kZSg0MDEpLnNlbmQoe1xuICAgICAgICBvazogZmFsc2UsXG4gICAgICAgIGVycm9yOiB7IG5hbWU6ICdFcnJvcicsIG1lc3NhZ2U6ICd1bmF1dGhvcml6ZWQ6IG1pc3Npbmcgb3IgaW52YWxpZCBiZWFyZXIgdG9rZW4nIH0sXG4gICAgICB9IHNhdGlzZmllcyBFcnJvckVudmVsb3BlKTtcbiAgICB9XG4gICAgY29uc3QgeyBjb21tYW5kIH0gPSByZXF1ZXN0LnBhcmFtcyBhcyB7IGNvbW1hbmQ6IHN0cmluZyB9O1xuICAgIGlmICghQ09NTUFORF9NQVAuaGFzKGNvbW1hbmQpKSB7XG4gICAgICByZXR1cm4gcmVwbHkuY29kZSg0MDQpLnNlbmQoe1xuICAgICAgICBvazogZmFsc2UsXG4gICAgICAgIGVycm9yOiB7IG5hbWU6ICdFcnJvcicsIG1lc3NhZ2U6IGB1bmtub3duIGNvbW1hbmQ6ICR7Y29tbWFuZH1gIH0sXG4gICAgICB9IHNhdGlzZmllcyBFcnJvckVudmVsb3BlKTtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGJ1cy5leGVjdXRlKGNvbW1hbmQsIHJlcXVlc3QuYm9keSA/PyB7fSwgY3R4KTtcbiAgICAgIHJldHVybiByZXBseS5jb2RlKDIwMCkuc2VuZCh7IG9rOiB0cnVlLCByZXN1bHQgfSk7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGNvbnN0IGVudmVsb3BlID0gZXJyb3JFbnZlbG9wZShlcnJvcik7XG4gICAgICByZXR1cm4gcmVwbHkuY29kZShIVFRQX1NUQVRVU1tlbnZlbG9wZS5lcnJvci5uYW1lXSkuc2VuZChlbnZlbG9wZSk7XG4gICAgfVxuICB9KTtcblxuICByZWdpc3Rlck1jcFJvdXRlKGFwcCwgYnVzLCBhdXRoZW50aWNhdGUpO1xuICByZWdpc3RlckV2ZW50U3RyZWFtKGFwcCwgcG9sbGluZ0V2ZW50VGFpbChlbmdpbmUpLCBhdXRoZW50aWNhdGUsIG9wdGlvbnMuZXZlbnRTdHJlYW0gPz8ge30pO1xuICByZWdpc3RlclVpUm91dGVzKGFwcCk7XG5cbiAgcmV0dXJuIGFwcDtcbn1cbiIsICIvKipcbiAqIFRoZSBjb21tYW5kIGJ1cyBcdTIwMTQgdGhlIE9ORSBwbGFjZSBjb21tYW5kcyBleGVjdXRlIChyb2FkbWFwIFx1MDBBNzAuMTogbm8gd3JpdGVzXG4gKiBvdXRzaWRlIHRoZSBjb21tYW5kIGJ1cykuIEhUVFAgKC9ycGMvOmNvbW1hbmQpIGFuZCBNQ1AgKG9haHNfKiB0b29scykgYXJlXG4gKiB0aGluIHBhcnNlcnMgaW4gZnJvbnQgb2YgZXhlY3V0ZSgpOyBuZWl0aGVyIGNhcnJpZXMgaXRzIG93biBsb2dpYy5cbiAqXG4gKiBBY3RvciBpZGVudGl0eSBBTFdBWVMgY29tZXMgZnJvbSB0aGUgYXV0aGVudGljYXRlZCBjb250ZXh0LCBuZXZlciBmcm9tIHRoZVxuICogcmVxdWVzdCBib2R5IFx1MjAxNCBhIGxpZmVjeWNsZSBjb21tYW5kIGNhbiBvbmx5IGFjdCBhcyB0aGUgYWN0b3Igd2hvc2UgdG9rZW5cbiAqIHNpZ25lZCB0aGUgcmVxdWVzdC5cbiAqL1xuaW1wb3J0IHtcbiAgR3VhcmRGYWlsZWRFcnJvcixcbiAgUGVybWlzc2lvbkRlbmllZEVycm9yLFxuICB0eXBlIEFjdG9yVHlwZSxcbiAgdHlwZSBBZ2VudEpvYixcbiAgdHlwZSBCbG9ja2VkUmVhc29uLFxuICB0eXBlIEV2aWRlbmNlLFxuICB0eXBlIEdhdGVDb2RlLFxuICB0eXBlIEdvdmVybmFuY2VSb2xlLFxuICB0eXBlIE1lbW9yeUtpbmQsXG4gIHR5cGUgUGVybWlzc2lvbixcbiAgdHlwZSBQbGFuQ29kZSxcbiAgdHlwZSBTcGluZUVuZ2luZSxcbiAgdHlwZSBUaHJlYWRLaW5kLFxuICB0eXBlIFRocmVhZFZpc2liaWxpdHksXG4gIHR5cGUgV29ya0l0ZW1LaW5kLFxuICB0eXBlIFdvcmtJdGVtU3RhdGUsXG59IGZyb20gJ0BvYWhzL2NvcmUnO1xuaW1wb3J0IHsgQ09NTUFORF9NQVAsIHR5cGUgQWN0b3JDb250ZXh0LCB0eXBlIENvbW1hbmRCdXMsIHR5cGUgQ29tbWFuZE5hbWUgfSBmcm9tICdAb2Focy9jb250cmFjdHMnO1xuXG5pbXBvcnQgdHlwZSB7IFRva2VuU3RvcmUgfSBmcm9tICcuL2F1dGguanMnO1xuXG4vLyBQYXJzZWQtaW5wdXQgc2hhcGVzIChtaXJyb3IgdGhlIHpvZCBzY2hlbWFzIGluIEBvYWhzL2NvbnRyYWN0czsgdGhlIHpvZFxuLy8gcGFyc2UgaW4gZXhlY3V0ZSgpIGlzIHRoZSBydW50aW1lIGd1YXJhbnRlZSwgdGhlc2UgYXJlIHRoZSBzdGF0aWMgdmlldykuXG5pbnRlcmZhY2UgQ3JlYXRlQWN0b3JJbiB7IHR5cGU6ICd1c2VyJyB8ICdhZ2VudCc7IGRpc3BsYXlOYW1lOiBzdHJpbmc7IGdvdmVybmFuY2VSb2xlPzogR292ZXJuYW5jZVJvbGUgfCB1bmRlZmluZWQgfVxuaW50ZXJmYWNlIEdyYW50SW4geyBhY3RvcklkOiBzdHJpbmc7IHBlcm1pc3Npb246IHN0cmluZzsgc2NvcGU/OiBzdHJpbmcgfCB1bmRlZmluZWQgfVxuaW50ZXJmYWNlIFJvbGVJbiB7IGFjdG9ySWQ6IHN0cmluZzsgcm9sZUNvZGU6IHN0cmluZyB9XG5pbnRlcmZhY2UgTGlzdFJvbGVBc3NpZ25tZW50c0luIHsgYWN0b3JJZD86IHN0cmluZyB8IHVuZGVmaW5lZCB9XG5pbnRlcmZhY2UgU2V0R292ZXJuYW5jZVJvbGVJbiB7IGFjdG9ySWQ6IHN0cmluZzsgcm9sZTogR292ZXJuYW5jZVJvbGUgfVxuaW50ZXJmYWNlIFNldFBsYW5JbiB7IHBsYW46IFBsYW5Db2RlIH1cbmludGVyZmFjZSBTZXRXb3Jrc3BhY2VQb2xpY3lJbiB7XG4gIHBvbGljeTogeyBhZ2VudEdhdGVBcHByb3ZhbHM/OiBib29sZWFuIHwgdW5kZWZpbmVkOyBhZ2VudFNlbGZEaXNwYXRjaD86IGJvb2xlYW4gfCB1bmRlZmluZWQgfTtcbn1cbmludGVyZmFjZSBTZXRHYXRlUG9saWN5SW4ge1xuICBnYXRlOiBHYXRlQ29kZTtcbiAgcG9saWN5OiB7IG1pbkFwcHJvdmFscz86IG51bWJlciB8IHVuZGVmaW5lZDsgcmVxdWlyZWRBY3RvclR5cGVzPzogQWN0b3JUeXBlW10gfCB1bmRlZmluZWQgfTtcbn1cbmludGVyZmFjZSBBdXRoekV4cGxhaW5JbiB7IGFjdG9ySWQ6IHN0cmluZzsgcGVybWlzc2lvbjogc3RyaW5nIH1cbmludGVyZmFjZSBJbXBvcnRTdG9yaWVzSW4geyBmZWF0dXJlSWQ6IHN0cmluZzsgeWFtbDogc3RyaW5nIH1cbmludGVyZmFjZSBDcmVhdGVXb3JrSXRlbUluIHtcbiAgZmVhdHVyZUlkOiBzdHJpbmc7XG4gIGV4dGVybmFsS2V5OiBzdHJpbmc7XG4gIHRpdGxlOiBzdHJpbmc7XG4gIGtpbmQ/OiBXb3JrSXRlbUtpbmQgfCB1bmRlZmluZWQ7XG4gIHNwZWNDaGVja3BvaW50PzogYm9vbGVhbiB8IHVuZGVmaW5lZDtcbiAgZG9uZUNoZWNrcG9pbnQ/OiBib29sZWFuIHwgdW5kZWZpbmVkO1xuICBpbnZva2VEZXZXaXRoPzogc3RyaW5nIHwgdW5kZWZpbmVkO1xuICBkZXBlbmRzT24/OiBzdHJpbmdbXSB8IHVuZGVmaW5lZDtcbn1cbmludGVyZmFjZSBDbGFpbVRhc2tJbiB7IHdvcmtJdGVtSWQ6IHN0cmluZzsgdHRsTXM/OiBudW1iZXIgfCB1bmRlZmluZWQgfVxuaW50ZXJmYWNlIEhlYXJ0YmVhdEluIHsgY2xhaW1JZDogc3RyaW5nIH1cbmludGVyZmFjZSBSZWxlYXNlQ2xhaW1JbiB7IGNsYWltSWQ6IHN0cmluZzsgcmVhc29uPzogc3RyaW5nIHwgdW5kZWZpbmVkIH1cbmludGVyZmFjZSBBZHZhbmNlSW4geyB3b3JrSXRlbUlkOiBzdHJpbmc7IHRvOiBXb3JrSXRlbVN0YXRlOyBmZW5jaW5nVG9rZW4/OiBudW1iZXIgfCB1bmRlZmluZWQ7IGlkZW1wb3RlbmN5S2V5Pzogc3RyaW5nIHwgdW5kZWZpbmVkIH1cbmludGVyZmFjZSBCbG9ja0luIHsgd29ya0l0ZW1JZDogc3RyaW5nOyByZWFzb246IEJsb2NrZWRSZWFzb247IGZlbmNpbmdUb2tlbj86IG51bWJlciB8IHVuZGVmaW5lZCB9XG5pbnRlcmZhY2UgV29ya0l0ZW1JbiB7IHdvcmtJdGVtSWQ6IHN0cmluZyB9XG5pbnRlcmZhY2UgU3VibWl0RXZpZGVuY2VJbiB7IHdvcmtJdGVtSWQ6IHN0cmluZzsgZXZpZGVuY2U6IEV2aWRlbmNlOyBmZW5jaW5nVG9rZW4/OiBudW1iZXIgfCB1bmRlZmluZWQgfVxuaW50ZXJmYWNlIEFwcHJvdmVHYXRlSW4geyB3b3JrSXRlbUlkOiBzdHJpbmc7IGdhdGU6IEdhdGVDb2RlOyBwaW5uZWRWZXJpZmljYXRpb24/OiBzdHJpbmdbXSB8IHVuZGVmaW5lZCB9XG5pbnRlcmZhY2UgUmVqZWN0R2F0ZUluIHsgd29ya0l0ZW1JZDogc3RyaW5nOyBnYXRlOiBHYXRlQ29kZSB9XG5pbnRlcmZhY2UgRmVhdHVyZUluIHsgZmVhdHVyZUlkOiBzdHJpbmcgfVxuaW50ZXJmYWNlIExpc3RXb3JrSXRlbXNJbiB7IHN0YXRlPzogV29ya0l0ZW1TdGF0ZSB8IHVuZGVmaW5lZDsgZmVhdHVyZUlkPzogc3RyaW5nIHwgdW5kZWZpbmVkOyBjbGFpbWFibGU/OiBib29sZWFuIHwgdW5kZWZpbmVkIH1cbmludGVyZmFjZSBRdWVyeUV2ZW50c0luIHsgc3RyZWFtSWQ/OiBzdHJpbmcgfCB1bmRlZmluZWQgfVxuaW50ZXJmYWNlIENyZWF0ZVRocmVhZEluIHtcbiAga2luZDogVGhyZWFkS2luZDtcbiAgZmVhdHVyZUlkPzogc3RyaW5nIHwgdW5kZWZpbmVkO1xuICB3b3JrSXRlbUlkPzogc3RyaW5nIHwgdW5kZWZpbmVkO1xuICB2aXNpYmlsaXR5PzogVGhyZWFkVmlzaWJpbGl0eSB8IHVuZGVmaW5lZDtcbn1cbmludGVyZmFjZSBBZGRUaHJlYWRQYXJ0aWNpcGFudEluIHsgdGhyZWFkSWQ6IHN0cmluZzsgYWN0b3JJZDogc3RyaW5nIH1cbmludGVyZmFjZSBQb3N0TWVzc2FnZUluIHtcbiAgdGhyZWFkSWQ6IHN0cmluZztcbiAgYm9keTogc3RyaW5nO1xuICByZXBseVRvPzogc3RyaW5nIHwgdW5kZWZpbmVkO1xuICBtZW50aW9ucz86IHN0cmluZ1tdIHwgdW5kZWZpbmVkO1xufVxuaW50ZXJmYWNlIExpc3RUaHJlYWRzSW4geyBmZWF0dXJlSWQ/OiBzdHJpbmcgfCB1bmRlZmluZWQ7IHdvcmtJdGVtSWQ/OiBzdHJpbmcgfCB1bmRlZmluZWQgfVxuaW50ZXJmYWNlIExpc3RNZXNzYWdlc0luIHsgdGhyZWFkSWQ6IHN0cmluZzsgc2luY2VTZXE/OiBudW1iZXIgfCB1bmRlZmluZWQgfVxuaW50ZXJmYWNlIExpc3RNZW50aW9uc0luIHsgbWVzc2FnZUlkOiBzdHJpbmcgfVxuaW50ZXJmYWNlIExpc3ROb3RpZmljYXRpb25zSW4geyB1bnJlYWRPbmx5PzogYm9vbGVhbiB8IHVuZGVmaW5lZCB9XG5pbnRlcmZhY2UgTWFya05vdGlmaWNhdGlvblJlYWRJbiB7IG5vdGlmaWNhdGlvbklkOiBzdHJpbmcgfVxuaW50ZXJmYWNlIExpc3RBZ2VudEpvYnNJbiB7IGFnZW50QWN0b3JJZD86IHN0cmluZyB8IHVuZGVmaW5lZDsgc3RhdHVzPzogQWdlbnRKb2JbJ3N0YXR1cyddIHwgdW5kZWZpbmVkIH1cbmludGVyZmFjZSBDb21wbGV0ZUFnZW50Sm9iSW4geyBqb2JJZDogc3RyaW5nOyBzdGF0dXM6ICdkb25lJyB8ICdibG9ja2VkJzsgbm90ZT86IHN0cmluZyB8IHVuZGVmaW5lZCB9XG5pbnRlcmZhY2UgUmVjb25jaWxlSW4geyBmaWxlczogQXJyYXk8eyB3b3JrSXRlbUlkOiBzdHJpbmc7IGZyb250bWF0dGVyU3RhdHVzOiBzdHJpbmcgfT4gfVxuaW50ZXJmYWNlIEFwcGVuZEFnZW50TWVtb3J5SW4geyBraW5kOiBNZW1vcnlLaW5kOyBjb250ZW50OiBzdHJpbmc7IHNvdXJjZVRocmVhZElkPzogc3RyaW5nIHwgdW5kZWZpbmVkIH1cbmludGVyZmFjZSBTZWFyY2hBZ2VudE1lbW9yeUluIHtcbiAgY29udGV4dFRocmVhZElkPzogc3RyaW5nIHwgdW5kZWZpbmVkO1xuICBraW5kPzogTWVtb3J5S2luZCB8IHVuZGVmaW5lZDtcbiAgcXVlcnk/OiBzdHJpbmcgfCB1bmRlZmluZWQ7XG59XG5cbi8qKiBDb21wYWN0IG9uZS1saW5lIHN1bW1hcnkgb2Ygem9kIGlzc3VlcyAoZHVjay10eXBlZDogem9kIGNvcGllcyBtYXkgZGlmZmVyKS4gKi9cbmZ1bmN0aW9uIHpvZE1lc3NhZ2UoZXJyb3I6IHVua25vd24pOiBzdHJpbmcge1xuICBjb25zdCBpc3N1ZXMgPSAoZXJyb3IgYXMgeyBpc3N1ZXM/OiBBcnJheTx7IHBhdGg/OiBBcnJheTxzdHJpbmcgfCBudW1iZXI+OyBtZXNzYWdlPzogc3RyaW5nIH0+IH0pXG4gICAgLmlzc3VlcztcbiAgaWYgKCFBcnJheS5pc0FycmF5KGlzc3VlcykpIHJldHVybiBTdHJpbmcoZXJyb3IpO1xuICByZXR1cm4gaXNzdWVzXG4gICAgLm1hcCgoaXNzdWUpID0+IHtcbiAgICAgIGNvbnN0IHBhdGggPSBpc3N1ZS5wYXRoICYmIGlzc3VlLnBhdGgubGVuZ3RoID4gMCA/IGlzc3VlLnBhdGguam9pbignLicpIDogJyhyb290KSc7XG4gICAgICByZXR1cm4gYCR7cGF0aH06ICR7aXNzdWUubWVzc2FnZSA/PyAnaW52YWxpZCd9YDtcbiAgICB9KVxuICAgIC5qb2luKCc7ICcpO1xufVxuXG5mdW5jdGlvbiByZXF1aXJlQWRtaW4oY3R4OiBBY3RvckNvbnRleHQsIGNvbW1hbmQ6IHN0cmluZyk6IHZvaWQge1xuICBpZiAoIWN0eC5pc0FkbWluKSB7XG4gICAgdGhyb3cgbmV3IFBlcm1pc3Npb25EZW5pZWRFcnJvcihgYWRtaW46JHtjb21tYW5kfWAgYXMgUGVybWlzc2lvbiwgY3R4LmFjdG9ySWQpO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVDb21tYW5kQnVzKGVuZ2luZTogU3BpbmVFbmdpbmUsIHRva2VuczogVG9rZW5TdG9yZSk6IENvbW1hbmRCdXMge1xuICBhc3luYyBmdW5jdGlvbiBleGVjdXRlKGNvbW1hbmQ6IHN0cmluZywgaW5wdXQ6IHVua25vd24sIGN0eDogQWN0b3JDb250ZXh0KTogUHJvbWlzZTx1bmtub3duPiB7XG4gICAgY29uc3QgZGVmID0gQ09NTUFORF9NQVAuZ2V0KGNvbW1hbmQpO1xuICAgIGlmICghZGVmKSB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcihgdW5rbm93biBjb21tYW5kOiAke2NvbW1hbmR9YCk7XG5cbiAgICBjb25zdCBwYXJzZWRSZXN1bHQgPSBkZWYuaW5wdXQuc2FmZVBhcnNlKGlucHV0ID8/IHt9KTtcbiAgICBpZiAoIXBhcnNlZFJlc3VsdC5zdWNjZXNzKSB7XG4gICAgICB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcihgaW52YWxpZCBpbnB1dCBmb3IgJHtjb21tYW5kfTogJHt6b2RNZXNzYWdlKHBhcnNlZFJlc3VsdC5lcnJvcil9YCk7XG4gICAgfVxuICAgIGNvbnN0IHBhcnNlZDogdW5rbm93biA9IHBhcnNlZFJlc3VsdC5kYXRhO1xuXG4gICAgc3dpdGNoIChjb21tYW5kIGFzIENvbW1hbmROYW1lKSB7XG4gICAgICAvLyAtLSBzZXR1cCAvIGFkbWluIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICBjYXNlICdjcmVhdGVfYWN0b3InOiB7XG4gICAgICAgIC8vIGNyZWF0ZV9hY3RvciBzdGF5cyBhZG1pbi10b2tlbi1nYXRlZCAoYm9vdHN0cmFwIHBsdW1iaW5nKSwgd2hpY2hcbiAgICAgICAgLy8gYWxzbyBtYWtlcyBpdCB0aGUgb25seSBjdHggYWxsb3dlZCB0byBwYXNzIGdvdmVybmFuY2VSb2xlLlxuICAgICAgICByZXF1aXJlQWRtaW4oY3R4LCBjb21tYW5kKTtcbiAgICAgICAgY29uc3QgcCA9IHBhcnNlZCBhcyBDcmVhdGVBY3RvckluO1xuICAgICAgICBjb25zdCBhY3RvciA9IGVuZ2luZS5jcmVhdGVBY3Rvcih7XG4gICAgICAgICAgdHlwZTogcC50eXBlLFxuICAgICAgICAgIGRpc3BsYXlOYW1lOiBwLmRpc3BsYXlOYW1lLFxuICAgICAgICAgIC4uLihwLmdvdmVybmFuY2VSb2xlICE9PSB1bmRlZmluZWQgPyB7IGdvdmVybmFuY2VSb2xlOiBwLmdvdmVybmFuY2VSb2xlIH0gOiB7fSksXG4gICAgICAgIH0pO1xuICAgICAgICBjb25zdCB0b2tlbiA9IHRva2Vucy5pc3N1ZShhY3Rvci5pZCk7XG4gICAgICAgIHJldHVybiB7IGFjdG9yLCB0b2tlbiB9O1xuICAgICAgfVxuICAgICAgY2FzZSAnZ3JhbnRfcGVybWlzc2lvbic6IHtcbiAgICAgICAgcmVxdWlyZUFkbWluKGN0eCwgY29tbWFuZCk7XG4gICAgICAgIGNvbnN0IHAgPSBwYXJzZWQgYXMgR3JhbnRJbjtcbiAgICAgICAgZW5naW5lLmdyYW50KHtcbiAgICAgICAgICBhY3RvcklkOiBwLmFjdG9ySWQsXG4gICAgICAgICAgcGVybWlzc2lvbjogcC5wZXJtaXNzaW9uIGFzIFBlcm1pc3Npb24sXG4gICAgICAgICAgLi4uKHAuc2NvcGUgIT09IHVuZGVmaW5lZCA/IHsgc2NvcGU6IHAuc2NvcGUgfSA6IHt9KSxcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiB7IGdyYW50ZWQ6IHRydWUgfTtcbiAgICAgIH1cbiAgICAgIGNhc2UgJ3Jldm9rZV9wZXJtaXNzaW9uJzoge1xuICAgICAgICByZXF1aXJlQWRtaW4oY3R4LCBjb21tYW5kKTtcbiAgICAgICAgY29uc3QgcCA9IHBhcnNlZCBhcyBHcmFudEluO1xuICAgICAgICBlbmdpbmUucmV2b2tlKHtcbiAgICAgICAgICBhY3RvcklkOiBwLmFjdG9ySWQsXG4gICAgICAgICAgcGVybWlzc2lvbjogcC5wZXJtaXNzaW9uIGFzIFBlcm1pc3Npb24sXG4gICAgICAgICAgLi4uKHAuc2NvcGUgIT09IHVuZGVmaW5lZCA/IHsgc2NvcGU6IHAuc2NvcGUgfSA6IHt9KSxcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiB7IHJldm9rZWQ6IHRydWUgfTtcbiAgICAgIH1cbiAgICAgIGNhc2UgJ2NyZWF0ZV9mZWF0dXJlJzoge1xuICAgICAgICByZXR1cm4gZW5naW5lLmNyZWF0ZUZlYXR1cmUoeyBhY3RvcklkOiBjdHguYWN0b3JJZCB9KTtcbiAgICAgIH1cbiAgICAgIGNhc2UgJ2NyZWF0ZV93b3JrX2l0ZW0nOiB7XG4gICAgICAgIC8vIENyZWF0b3IgaWRlbnRpdHkgZnJvbSBjdHg7IGtpbmQgZGVmYXVsdHMgdG8gJ2NvZGUnIGluIHRoZSBlbmdpbmUuXG4gICAgICAgIGNvbnN0IHAgPSBwYXJzZWQgYXMgQ3JlYXRlV29ya0l0ZW1JbjtcbiAgICAgICAgcmV0dXJuIGVuZ2luZS5jcmVhdGVXb3JrSXRlbSh7XG4gICAgICAgICAgZmVhdHVyZUlkOiBwLmZlYXR1cmVJZCxcbiAgICAgICAgICBleHRlcm5hbEtleTogcC5leHRlcm5hbEtleSxcbiAgICAgICAgICB0aXRsZTogcC50aXRsZSxcbiAgICAgICAgICBhY3RvcklkOiBjdHguYWN0b3JJZCxcbiAgICAgICAgICAuLi4ocC5raW5kICE9PSB1bmRlZmluZWQgPyB7IGtpbmQ6IHAua2luZCB9IDoge30pLFxuICAgICAgICAgIC4uLihwLnNwZWNDaGVja3BvaW50ICE9PSB1bmRlZmluZWQgPyB7IHNwZWNDaGVja3BvaW50OiBwLnNwZWNDaGVja3BvaW50IH0gOiB7fSksXG4gICAgICAgICAgLi4uKHAuZG9uZUNoZWNrcG9pbnQgIT09IHVuZGVmaW5lZCA/IHsgZG9uZUNoZWNrcG9pbnQ6IHAuZG9uZUNoZWNrcG9pbnQgfSA6IHt9KSxcbiAgICAgICAgICAuLi4ocC5pbnZva2VEZXZXaXRoICE9PSB1bmRlZmluZWQgPyB7IGludm9rZURldldpdGg6IHAuaW52b2tlRGV2V2l0aCB9IDoge30pLFxuICAgICAgICAgIC4uLihwLmRlcGVuZHNPbiAhPT0gdW5kZWZpbmVkID8geyBkZXBlbmRzT246IHAuZGVwZW5kc09uIH0gOiB7fSksXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgY2FzZSAnbGlzdF9hY3RvcnMnOiB7XG4gICAgICAgIHJldHVybiBlbmdpbmUubGlzdEFjdG9ycygpO1xuICAgICAgfVxuICAgICAgY2FzZSAncHJvdmlzaW9uX3BlcnNvbmFzJzoge1xuICAgICAgICAvLyBHYXRlZCBieSBFTkdJTkUgZ292ZXJuYW5jZSAocmVxdWlyZUdvdmVybmFuY2VBZG1pbiBvbiBieUFjdG9ySWQpIFx1MjAxNFxuICAgICAgICAvLyB0aGUgYnVzIG5ldmVyIHByZS1jaGVja3MgYWRtaW4gaGVyZSwgbWlycm9yaW5nIHRoZSBcdTAwQTczIGdyb3VwLlxuICAgICAgICByZXR1cm4gZW5naW5lLnByb3Zpc2lvblBlcnNvbmFzKHsgYnlBY3RvcklkOiBjdHguYWN0b3JJZCB9KTtcbiAgICAgIH1cblxuICAgICAgLy8gLS0gZW50aXRsZW1lbnRzIChQaGFzZSAyLCByb2FkbWFwIFx1MDBBNzMpIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgIC8vIE5vIHJlcXVpcmVBZG1pbiBoZXJlOiBhdXRob3JpdHkgaXMgZGVjaWRlZCBieSB0aGUgRU5HSU5FIGZyb20gdGhlXG4gICAgICAvLyBjYWxsZXIncyBnb3Zlcm5hbmNlIHJvbGUgKGJ5QWN0b3JJZCA9IHRoZSBhdXRoZW50aWNhdGVkIGFjdG9yKS5cbiAgICAgIGNhc2UgJ2Fzc2lnbl9yb2xlJzoge1xuICAgICAgICBjb25zdCBwID0gcGFyc2VkIGFzIFJvbGVJbjtcbiAgICAgICAgZW5naW5lLmFzc2lnblJvbGUoeyBhY3RvcklkOiBwLmFjdG9ySWQsIHJvbGVDb2RlOiBwLnJvbGVDb2RlLCBieUFjdG9ySWQ6IGN0eC5hY3RvcklkIH0pO1xuICAgICAgICByZXR1cm4geyBhc3NpZ25lZDogdHJ1ZSB9O1xuICAgICAgfVxuICAgICAgY2FzZSAncmV2b2tlX3JvbGUnOiB7XG4gICAgICAgIGNvbnN0IHAgPSBwYXJzZWQgYXMgUm9sZUluO1xuICAgICAgICBlbmdpbmUucmV2b2tlUm9sZSh7IGFjdG9ySWQ6IHAuYWN0b3JJZCwgcm9sZUNvZGU6IHAucm9sZUNvZGUsIGJ5QWN0b3JJZDogY3R4LmFjdG9ySWQgfSk7XG4gICAgICAgIHJldHVybiB7IHJldm9rZWQ6IHRydWUgfTtcbiAgICAgIH1cbiAgICAgIGNhc2UgJ2xpc3Rfcm9sZV9hc3NpZ25tZW50cyc6IHtcbiAgICAgICAgY29uc3QgcCA9IHBhcnNlZCBhcyBMaXN0Um9sZUFzc2lnbm1lbnRzSW47XG4gICAgICAgIHJldHVybiBlbmdpbmUubGlzdFJvbGVBc3NpZ25tZW50cyhwLmFjdG9ySWQpO1xuICAgICAgfVxuICAgICAgY2FzZSAnc2V0X2dvdmVybmFuY2Vfcm9sZSc6IHtcbiAgICAgICAgY29uc3QgcCA9IHBhcnNlZCBhcyBTZXRHb3Zlcm5hbmNlUm9sZUluO1xuICAgICAgICBlbmdpbmUuc2V0R292ZXJuYW5jZVJvbGUoeyBhY3RvcklkOiBwLmFjdG9ySWQsIHJvbGU6IHAucm9sZSwgYnlBY3RvcklkOiBjdHguYWN0b3JJZCB9KTtcbiAgICAgICAgcmV0dXJuIHsgYWN0b3JJZDogcC5hY3RvcklkLCByb2xlOiBwLnJvbGUgfTtcbiAgICAgIH1cbiAgICAgIGNhc2UgJ3NldF9wbGFuJzoge1xuICAgICAgICBjb25zdCBwID0gcGFyc2VkIGFzIFNldFBsYW5JbjtcbiAgICAgICAgZW5naW5lLnNldFBsYW4oeyBwbGFuOiBwLnBsYW4sIGJ5QWN0b3JJZDogY3R4LmFjdG9ySWQgfSk7XG4gICAgICAgIHJldHVybiB7IHBsYW46IGVuZ2luZS5nZXRQbGFuKCkgfTtcbiAgICAgIH1cbiAgICAgIGNhc2UgJ3NldF93b3Jrc3BhY2VfcG9saWN5Jzoge1xuICAgICAgICBjb25zdCBwID0gcGFyc2VkIGFzIFNldFdvcmtzcGFjZVBvbGljeUluO1xuICAgICAgICBlbmdpbmUuc2V0V29ya3NwYWNlUG9saWN5KHtcbiAgICAgICAgICBwb2xpY3k6IHtcbiAgICAgICAgICAgIC4uLihwLnBvbGljeS5hZ2VudEdhdGVBcHByb3ZhbHMgIT09IHVuZGVmaW5lZFxuICAgICAgICAgICAgICA/IHsgYWdlbnRHYXRlQXBwcm92YWxzOiBwLnBvbGljeS5hZ2VudEdhdGVBcHByb3ZhbHMgfVxuICAgICAgICAgICAgICA6IHt9KSxcbiAgICAgICAgICAgIC4uLihwLnBvbGljeS5hZ2VudFNlbGZEaXNwYXRjaCAhPT0gdW5kZWZpbmVkXG4gICAgICAgICAgICAgID8geyBhZ2VudFNlbGZEaXNwYXRjaDogcC5wb2xpY3kuYWdlbnRTZWxmRGlzcGF0Y2ggfVxuICAgICAgICAgICAgICA6IHt9KSxcbiAgICAgICAgICB9LFxuICAgICAgICAgIGJ5QWN0b3JJZDogY3R4LmFjdG9ySWQsXG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gZW5naW5lLmdldFdvcmtzcGFjZVBvbGljeSgpO1xuICAgICAgfVxuICAgICAgY2FzZSAnc2V0X2dhdGVfcG9saWN5Jzoge1xuICAgICAgICBjb25zdCBwID0gcGFyc2VkIGFzIFNldEdhdGVQb2xpY3lJbjtcbiAgICAgICAgZW5naW5lLnNldEdhdGVQb2xpY3koe1xuICAgICAgICAgIGdhdGU6IHAuZ2F0ZSxcbiAgICAgICAgICBwb2xpY3k6IHtcbiAgICAgICAgICAgIC4uLihwLnBvbGljeS5taW5BcHByb3ZhbHMgIT09IHVuZGVmaW5lZCA/IHsgbWluQXBwcm92YWxzOiBwLnBvbGljeS5taW5BcHByb3ZhbHMgfSA6IHt9KSxcbiAgICAgICAgICAgIC4uLihwLnBvbGljeS5yZXF1aXJlZEFjdG9yVHlwZXMgIT09IHVuZGVmaW5lZFxuICAgICAgICAgICAgICA/IHsgcmVxdWlyZWRBY3RvclR5cGVzOiBbLi4ucC5wb2xpY3kucmVxdWlyZWRBY3RvclR5cGVzXSB9XG4gICAgICAgICAgICAgIDoge30pLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgYnlBY3RvcklkOiBjdHguYWN0b3JJZCxcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiB7IGdhdGU6IHAuZ2F0ZSwgcG9saWN5OiBlbmdpbmUuZ2V0R2F0ZVBvbGljeShwLmdhdGUpIH07XG4gICAgICB9XG4gICAgICBjYXNlICdhdXRoel9leHBsYWluJzoge1xuICAgICAgICBjb25zdCBwID0gcGFyc2VkIGFzIEF1dGh6RXhwbGFpbkluO1xuICAgICAgICByZXR1cm4gZW5naW5lLmF1dGh6RXhwbGFpbih7IGFjdG9ySWQ6IHAuYWN0b3JJZCwgcGVybWlzc2lvbjogcC5wZXJtaXNzaW9uIGFzIFBlcm1pc3Npb24gfSk7XG4gICAgICB9XG4gICAgICBjYXNlICdpbXBvcnRfc3Rvcmllcyc6IHtcbiAgICAgICAgY29uc3QgcCA9IHBhcnNlZCBhcyBJbXBvcnRTdG9yaWVzSW47XG4gICAgICAgIHJldHVybiBlbmdpbmUuaW1wb3J0U3Rvcmllcyh7IGZlYXR1cmVJZDogcC5mZWF0dXJlSWQsIHlhbWw6IHAueWFtbCwgYWN0b3JJZDogY3R4LmFjdG9ySWQgfSk7XG4gICAgICB9XG5cbiAgICAgIC8vIC0tIGNsYWltcyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICAgY2FzZSAnY2xhaW1fdGFzayc6IHtcbiAgICAgICAgY29uc3QgcCA9IHBhcnNlZCBhcyBDbGFpbVRhc2tJbjtcbiAgICAgICAgcmV0dXJuIGVuZ2luZS5jbGFpbVRhc2soe1xuICAgICAgICAgIHdvcmtJdGVtSWQ6IHAud29ya0l0ZW1JZCxcbiAgICAgICAgICBhY3RvcklkOiBjdHguYWN0b3JJZCxcbiAgICAgICAgICAuLi4ocC50dGxNcyAhPT0gdW5kZWZpbmVkID8geyB0dGxNczogcC50dGxNcyB9IDoge30pLFxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIGNhc2UgJ2hlYXJ0YmVhdCc6IHtcbiAgICAgICAgY29uc3QgcCA9IHBhcnNlZCBhcyBIZWFydGJlYXRJbjtcbiAgICAgICAgZW5naW5lLmhlYXJ0YmVhdCh7IGNsYWltSWQ6IHAuY2xhaW1JZCB9KTtcbiAgICAgICAgcmV0dXJuIHsgcmVuZXdlZDogdHJ1ZSB9O1xuICAgICAgfVxuICAgICAgY2FzZSAncmVsZWFzZV9jbGFpbSc6IHtcbiAgICAgICAgY29uc3QgcCA9IHBhcnNlZCBhcyBSZWxlYXNlQ2xhaW1JbjtcbiAgICAgICAgZW5naW5lLnJlbGVhc2VDbGFpbSh7XG4gICAgICAgICAgY2xhaW1JZDogcC5jbGFpbUlkLFxuICAgICAgICAgIC4uLihwLnJlYXNvbiAhPT0gdW5kZWZpbmVkID8geyByZWFzb246IHAucmVhc29uIH0gOiB7fSksXG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4geyByZWxlYXNlZDogdHJ1ZSB9O1xuICAgICAgfVxuXG4gICAgICAvLyAtLSBsaWZlY3ljbGUgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICAgY2FzZSAnYWR2YW5jZV9zdGF0ZSc6IHtcbiAgICAgICAgY29uc3QgcCA9IHBhcnNlZCBhcyBBZHZhbmNlSW47XG4gICAgICAgIHJldHVybiBlbmdpbmUuYWR2YW5jZVN0YXRlKHtcbiAgICAgICAgICB3b3JrSXRlbUlkOiBwLndvcmtJdGVtSWQsXG4gICAgICAgICAgdG86IHAudG8gYXMgV29ya0l0ZW1TdGF0ZSxcbiAgICAgICAgICBhY3RvcklkOiBjdHguYWN0b3JJZCxcbiAgICAgICAgICAuLi4ocC5mZW5jaW5nVG9rZW4gIT09IHVuZGVmaW5lZCA/IHsgZmVuY2luZ1Rva2VuOiBwLmZlbmNpbmdUb2tlbiB9IDoge30pLFxuICAgICAgICAgIC4uLihwLmlkZW1wb3RlbmN5S2V5ICE9PSB1bmRlZmluZWQgPyB7IGlkZW1wb3RlbmN5S2V5OiBwLmlkZW1wb3RlbmN5S2V5IH0gOiB7fSksXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgY2FzZSAnYmxvY2tfdGFzayc6IHtcbiAgICAgICAgY29uc3QgcCA9IHBhcnNlZCBhcyBCbG9ja0luO1xuICAgICAgICByZXR1cm4gZW5naW5lLmJsb2NrVGFzayh7XG4gICAgICAgICAgd29ya0l0ZW1JZDogcC53b3JrSXRlbUlkLFxuICAgICAgICAgIHJlYXNvbjogcC5yZWFzb24sXG4gICAgICAgICAgYWN0b3JJZDogY3R4LmFjdG9ySWQsXG4gICAgICAgICAgLi4uKHAuZmVuY2luZ1Rva2VuICE9PSB1bmRlZmluZWQgPyB7IGZlbmNpbmdUb2tlbjogcC5mZW5jaW5nVG9rZW4gfSA6IHt9KSxcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICBjYXNlICd1bmJsb2NrX3Rhc2snOiB7XG4gICAgICAgIGNvbnN0IHAgPSBwYXJzZWQgYXMgV29ya0l0ZW1JbjtcbiAgICAgICAgcmV0dXJuIGVuZ2luZS51bmJsb2NrVGFzayh7IHdvcmtJdGVtSWQ6IHAud29ya0l0ZW1JZCwgYWN0b3JJZDogY3R4LmFjdG9ySWQgfSk7XG4gICAgICB9XG4gICAgICBjYXNlICdzdWJtaXRfZXZpZGVuY2UnOiB7XG4gICAgICAgIGNvbnN0IHAgPSBwYXJzZWQgYXMgU3VibWl0RXZpZGVuY2VJbjtcbiAgICAgICAgZW5naW5lLnN1Ym1pdEV2aWRlbmNlKHtcbiAgICAgICAgICB3b3JrSXRlbUlkOiBwLndvcmtJdGVtSWQsXG4gICAgICAgICAgZXZpZGVuY2U6IHAuZXZpZGVuY2UgYXMgRXZpZGVuY2UsXG4gICAgICAgICAgYWN0b3JJZDogY3R4LmFjdG9ySWQsXG4gICAgICAgICAgLi4uKHAuZmVuY2luZ1Rva2VuICE9PSB1bmRlZmluZWQgPyB7IGZlbmNpbmdUb2tlbjogcC5mZW5jaW5nVG9rZW4gfSA6IHt9KSxcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiB7IHN1Ym1pdHRlZDogdHJ1ZSB9O1xuICAgICAgfVxuICAgICAgY2FzZSAnYXBwcm92ZV9nYXRlJzoge1xuICAgICAgICBjb25zdCBwID0gcGFyc2VkIGFzIEFwcHJvdmVHYXRlSW47XG4gICAgICAgIHJldHVybiBlbmdpbmUuYXBwcm92ZUdhdGUoe1xuICAgICAgICAgIHdvcmtJdGVtSWQ6IHAud29ya0l0ZW1JZCxcbiAgICAgICAgICBnYXRlOiBwLmdhdGUsXG4gICAgICAgICAgYWN0b3JJZDogY3R4LmFjdG9ySWQsXG4gICAgICAgICAgLi4uKHAucGlubmVkVmVyaWZpY2F0aW9uICE9PSB1bmRlZmluZWRcbiAgICAgICAgICAgID8geyBwaW5uZWRWZXJpZmljYXRpb246IHAucGlubmVkVmVyaWZpY2F0aW9uIH1cbiAgICAgICAgICAgIDoge30pLFxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIGNhc2UgJ3JlamVjdF9nYXRlJzoge1xuICAgICAgICBjb25zdCBwID0gcGFyc2VkIGFzIFJlamVjdEdhdGVJbjtcbiAgICAgICAgcmV0dXJuIGVuZ2luZS5yZWplY3RHYXRlKHsgd29ya0l0ZW1JZDogcC53b3JrSXRlbUlkLCBnYXRlOiBwLmdhdGUsIGFjdG9ySWQ6IGN0eC5hY3RvcklkIH0pO1xuICAgICAgfVxuICAgICAgY2FzZSAncmVsZWFzZV9kaXNwYXRjaF9ob2xkJzoge1xuICAgICAgICBjb25zdCBwID0gcGFyc2VkIGFzIEZlYXR1cmVJbjtcbiAgICAgICAgcmV0dXJuIGVuZ2luZS5yZWxlYXNlRGlzcGF0Y2hIb2xkKHsgZmVhdHVyZUlkOiBwLmZlYXR1cmVJZCwgYWN0b3JJZDogY3R4LmFjdG9ySWQgfSk7XG4gICAgICB9XG5cbiAgICAgIC8vIC0tIGNvbGxhYm9yYXRpb24gKFBoYXNlIDMsIHJvYWRtYXAgXHUwMEE3NSkgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICAgLy8gQWN0b3IgaWRlbnRpdHkgQUxXQVlTIGZyb20gY3R4OiB0aGUgcG9zdGVyLCByZWFkZXIsIG5vdGlmaWNhdGlvbiBvd25lclxuICAgICAgLy8gYW5kIGpvYiBjb21wbGV0ZXIgYXJlIHRoZSBhdXRoZW50aWNhdGVkIGFjdG9yIFx1MjAxNCBuZXZlciBhIGJvZHkgZmllbGQuXG4gICAgICBjYXNlICdjcmVhdGVfdGhyZWFkJzoge1xuICAgICAgICBjb25zdCBwID0gcGFyc2VkIGFzIENyZWF0ZVRocmVhZEluO1xuICAgICAgICByZXR1cm4gZW5naW5lLmNyZWF0ZVRocmVhZCh7XG4gICAgICAgICAgYWN0b3JJZDogY3R4LmFjdG9ySWQsXG4gICAgICAgICAga2luZDogcC5raW5kLFxuICAgICAgICAgIC4uLihwLmZlYXR1cmVJZCAhPT0gdW5kZWZpbmVkID8geyBmZWF0dXJlSWQ6IHAuZmVhdHVyZUlkIH0gOiB7fSksXG4gICAgICAgICAgLi4uKHAud29ya0l0ZW1JZCAhPT0gdW5kZWZpbmVkID8geyB3b3JrSXRlbUlkOiBwLndvcmtJdGVtSWQgfSA6IHt9KSxcbiAgICAgICAgICAuLi4ocC52aXNpYmlsaXR5ICE9PSB1bmRlZmluZWQgPyB7IHZpc2liaWxpdHk6IHAudmlzaWJpbGl0eSB9IDoge30pLFxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIGNhc2UgJ2FkZF90aHJlYWRfcGFydGljaXBhbnQnOiB7XG4gICAgICAgIGNvbnN0IHAgPSBwYXJzZWQgYXMgQWRkVGhyZWFkUGFydGljaXBhbnRJbjtcbiAgICAgICAgcmV0dXJuIGVuZ2luZS5hZGRUaHJlYWRQYXJ0aWNpcGFudCh7XG4gICAgICAgICAgdGhyZWFkSWQ6IHAudGhyZWFkSWQsXG4gICAgICAgICAgYWN0b3JJZDogcC5hY3RvcklkLFxuICAgICAgICAgIGJ5QWN0b3JJZDogY3R4LmFjdG9ySWQsXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgY2FzZSAncG9zdF9tZXNzYWdlJzoge1xuICAgICAgICBjb25zdCBwID0gcGFyc2VkIGFzIFBvc3RNZXNzYWdlSW47XG4gICAgICAgIHJldHVybiBlbmdpbmUucG9zdE1lc3NhZ2Uoe1xuICAgICAgICAgIHRocmVhZElkOiBwLnRocmVhZElkLFxuICAgICAgICAgIGFjdG9ySWQ6IGN0eC5hY3RvcklkLFxuICAgICAgICAgIGJvZHk6IHAuYm9keSxcbiAgICAgICAgICAuLi4ocC5yZXBseVRvICE9PSB1bmRlZmluZWQgPyB7IHJlcGx5VG86IHAucmVwbHlUbyB9IDoge30pLFxuICAgICAgICAgIC4uLihwLm1lbnRpb25zICE9PSB1bmRlZmluZWQgPyB7IG1lbnRpb25zOiBwLm1lbnRpb25zIH0gOiB7fSksXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgY2FzZSAnbGlzdF90aHJlYWRzJzoge1xuICAgICAgICBjb25zdCBwID0gcGFyc2VkIGFzIExpc3RUaHJlYWRzSW47XG4gICAgICAgIHJldHVybiBlbmdpbmUubGlzdFRocmVhZHMoe1xuICAgICAgICAgIGFjdG9ySWQ6IGN0eC5hY3RvcklkLCAvLyBwcml2YXRlIHRocmVhZHMgc3RheSBpbnZpc2libGUgdG8gbm9uLXBhcnRpY2lwYW50c1xuICAgICAgICAgIC4uLihwLmZlYXR1cmVJZCAhPT0gdW5kZWZpbmVkID8geyBmZWF0dXJlSWQ6IHAuZmVhdHVyZUlkIH0gOiB7fSksXG4gICAgICAgICAgLi4uKHAud29ya0l0ZW1JZCAhPT0gdW5kZWZpbmVkID8geyB3b3JrSXRlbUlkOiBwLndvcmtJdGVtSWQgfSA6IHt9KSxcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICBjYXNlICdsaXN0X21lc3NhZ2VzJzoge1xuICAgICAgICBjb25zdCBwID0gcGFyc2VkIGFzIExpc3RNZXNzYWdlc0luO1xuICAgICAgICByZXR1cm4gZW5naW5lLmxpc3RNZXNzYWdlcyh7XG4gICAgICAgICAgdGhyZWFkSWQ6IHAudGhyZWFkSWQsXG4gICAgICAgICAgYWN0b3JJZDogY3R4LmFjdG9ySWQsXG4gICAgICAgICAgLi4uKHAuc2luY2VTZXEgIT09IHVuZGVmaW5lZCA/IHsgc2luY2VTZXE6IHAuc2luY2VTZXEgfSA6IHt9KSxcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICBjYXNlICdsaXN0X21lbnRpb25zJzoge1xuICAgICAgICBjb25zdCBwID0gcGFyc2VkIGFzIExpc3RNZW50aW9uc0luO1xuICAgICAgICByZXR1cm4gZW5naW5lLmxpc3RNZW50aW9ucyhwLm1lc3NhZ2VJZCk7XG4gICAgICB9XG4gICAgICBjYXNlICdsaXN0X25vdGlmaWNhdGlvbnMnOiB7XG4gICAgICAgIGNvbnN0IHAgPSBwYXJzZWQgYXMgTGlzdE5vdGlmaWNhdGlvbnNJbjtcbiAgICAgICAgcmV0dXJuIGVuZ2luZS5saXN0Tm90aWZpY2F0aW9ucyh7XG4gICAgICAgICAgYWN0b3JJZDogY3R4LmFjdG9ySWQsXG4gICAgICAgICAgLi4uKHAudW5yZWFkT25seSAhPT0gdW5kZWZpbmVkID8geyB1bnJlYWRPbmx5OiBwLnVucmVhZE9ubHkgfSA6IHt9KSxcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICBjYXNlICdtYXJrX25vdGlmaWNhdGlvbl9yZWFkJzoge1xuICAgICAgICBjb25zdCBwID0gcGFyc2VkIGFzIE1hcmtOb3RpZmljYXRpb25SZWFkSW47XG4gICAgICAgIGVuZ2luZS5tYXJrTm90aWZpY2F0aW9uUmVhZCh7IG5vdGlmaWNhdGlvbklkOiBwLm5vdGlmaWNhdGlvbklkLCBhY3RvcklkOiBjdHguYWN0b3JJZCB9KTtcbiAgICAgICAgcmV0dXJuIHsgcmVhZDogdHJ1ZSB9O1xuICAgICAgfVxuICAgICAgY2FzZSAnbGlzdF9hZ2VudF9qb2JzJzoge1xuICAgICAgICBjb25zdCBwID0gcGFyc2VkIGFzIExpc3RBZ2VudEpvYnNJbjtcbiAgICAgICAgcmV0dXJuIGVuZ2luZS5saXN0QWdlbnRKb2JzKHtcbiAgICAgICAgICAuLi4ocC5hZ2VudEFjdG9ySWQgIT09IHVuZGVmaW5lZCA/IHsgYWdlbnRBY3RvcklkOiBwLmFnZW50QWN0b3JJZCB9IDoge30pLFxuICAgICAgICAgIC4uLihwLnN0YXR1cyAhPT0gdW5kZWZpbmVkID8geyBzdGF0dXM6IHAuc3RhdHVzIH0gOiB7fSksXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgY2FzZSAnY29tcGxldGVfYWdlbnRfam9iJzoge1xuICAgICAgICBjb25zdCBwID0gcGFyc2VkIGFzIENvbXBsZXRlQWdlbnRKb2JJbjtcbiAgICAgICAgcmV0dXJuIGVuZ2luZS5jb21wbGV0ZUFnZW50Sm9iKHtcbiAgICAgICAgICBqb2JJZDogcC5qb2JJZCxcbiAgICAgICAgICBhY3RvcklkOiBjdHguYWN0b3JJZCxcbiAgICAgICAgICBzdGF0dXM6IHAuc3RhdHVzLFxuICAgICAgICAgIC4uLihwLm5vdGUgIT09IHVuZGVmaW5lZCA/IHsgbm90ZTogcC5ub3RlIH0gOiB7fSksXG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICAvLyAtLSBhZ2VudCBtZW1vcnkgKFBoYXNlIDUsIHJvYWRtYXAgXHUwMEE3NikgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICAvLyBUaGUgbWVtb3J5IG93bmVyIGlzIEFMV0FZUyB0aGUgY3R4IGFjdG9yIFx1MjAxNCBubyBjcm9zcy1hY3RvciBwYXJhbWV0ZXJcbiAgICAgIC8vIGV4aXN0cyBvbiB0aGUgd2lyZSwgc28gb3duZXItc2NvcGluZyBpcyBzdHJ1Y3R1cmFsLCBub3QgZGlzY2lwbGluZWQuXG4gICAgICBjYXNlICdhcHBlbmRfYWdlbnRfbWVtb3J5Jzoge1xuICAgICAgICBjb25zdCBwID0gcGFyc2VkIGFzIEFwcGVuZEFnZW50TWVtb3J5SW47XG4gICAgICAgIHJldHVybiBlbmdpbmUuYXBwZW5kQWdlbnRNZW1vcnkoe1xuICAgICAgICAgIGFjdG9ySWQ6IGN0eC5hY3RvcklkLFxuICAgICAgICAgIGtpbmQ6IHAua2luZCxcbiAgICAgICAgICBjb250ZW50OiBwLmNvbnRlbnQsXG4gICAgICAgICAgLi4uKHAuc291cmNlVGhyZWFkSWQgIT09IHVuZGVmaW5lZCA/IHsgc291cmNlVGhyZWFkSWQ6IHAuc291cmNlVGhyZWFkSWQgfSA6IHt9KSxcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICBjYXNlICdzZWFyY2hfYWdlbnRfbWVtb3J5Jzoge1xuICAgICAgICBjb25zdCBwID0gcGFyc2VkIGFzIFNlYXJjaEFnZW50TWVtb3J5SW47XG4gICAgICAgIHJldHVybiBlbmdpbmUuc2VhcmNoQWdlbnRNZW1vcnkoe1xuICAgICAgICAgIGFjdG9ySWQ6IGN0eC5hY3RvcklkLFxuICAgICAgICAgIC4uLihwLmNvbnRleHRUaHJlYWRJZCAhPT0gdW5kZWZpbmVkID8geyBjb250ZXh0VGhyZWFkSWQ6IHAuY29udGV4dFRocmVhZElkIH0gOiB7fSksXG4gICAgICAgICAgLi4uKHAua2luZCAhPT0gdW5kZWZpbmVkID8geyBraW5kOiBwLmtpbmQgfSA6IHt9KSxcbiAgICAgICAgICAuLi4ocC5xdWVyeSAhPT0gdW5kZWZpbmVkID8geyBxdWVyeTogcC5xdWVyeSB9IDoge30pLFxuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgLy8gLS0gcmVjb25jaWxpYXRpb24gKHJvYWRtYXAgXHUwMEE3MS42LCBkZXRlY3Qtb25seSkgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICAgY2FzZSAncmVjb25jaWxlJzoge1xuICAgICAgICBjb25zdCBwID0gcGFyc2VkIGFzIFJlY29uY2lsZUluO1xuICAgICAgICByZXR1cm4gZW5naW5lLnJlY29uY2lsZSh7IGZpbGVzOiBwLmZpbGVzIH0pO1xuICAgICAgfVxuXG4gICAgICAvLyAtLSBvcHMgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICBjYXNlICdmb3JjZV9yZWxlYXNlX2NsYWltJzoge1xuICAgICAgICBjb25zdCBwID0gcGFyc2VkIGFzIFdvcmtJdGVtSW47XG4gICAgICAgIGNvbnN0IHVucmVsZWFzZWQgPSBlbmdpbmUuZ2V0Q2xhaW1zKHAud29ya0l0ZW1JZCkuZmlsdGVyKChjbGFpbSkgPT4gIWNsYWltLnJlbGVhc2VkKTtcbiAgICAgICAgaWYgKHVucmVsZWFzZWQubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoYG5vIGxpdmUgY2xhaW0gb24gd29yayBpdGVtICR7cC53b3JrSXRlbUlkfWApO1xuICAgICAgICB9XG4gICAgICAgIGZvciAoY29uc3QgY2xhaW0gb2YgdW5yZWxlYXNlZCkge1xuICAgICAgICAgIGVuZ2luZS5yZWxlYXNlQ2xhaW0oeyBjbGFpbUlkOiBjbGFpbS5pZCwgcmVhc29uOiAnb3BzIGZvcmNlIHJlbGVhc2UnIH0pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB7IHJlbGVhc2VkOiB1bnJlbGVhc2VkLm1hcCgoY2xhaW0pID0+IGNsYWltLmlkKSB9O1xuICAgICAgfVxuXG4gICAgICAvLyAtLSBxdWVyaWVzIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgIGNhc2UgJ2dldF93b3JrX2l0ZW0nOiB7XG4gICAgICAgIGNvbnN0IHAgPSBwYXJzZWQgYXMgV29ya0l0ZW1JbjtcbiAgICAgICAgcmV0dXJuIGVuZ2luZS5nZXRXb3JrSXRlbShwLndvcmtJdGVtSWQpO1xuICAgICAgfVxuICAgICAgY2FzZSAnZ2V0X2ZlYXR1cmUnOiB7XG4gICAgICAgIGNvbnN0IHAgPSBwYXJzZWQgYXMgRmVhdHVyZUluO1xuICAgICAgICByZXR1cm4gZW5naW5lLmdldEZlYXR1cmUocC5mZWF0dXJlSWQpO1xuICAgICAgfVxuICAgICAgY2FzZSAnZ2V0X3Rhc2tfY29udGV4dCc6IHtcbiAgICAgICAgY29uc3QgcCA9IHBhcnNlZCBhcyBXb3JrSXRlbUluO1xuICAgICAgICByZXR1cm4gZW5naW5lLmdldFRhc2tDb250ZXh0KHsgd29ya0l0ZW1JZDogcC53b3JrSXRlbUlkIH0pO1xuICAgICAgfVxuICAgICAgY2FzZSAnbGlzdF93b3JrX2l0ZW1zJzoge1xuICAgICAgICBjb25zdCBwID0gcGFyc2VkIGFzIExpc3RXb3JrSXRlbXNJbjtcbiAgICAgICAgcmV0dXJuIGVuZ2luZS5saXN0V29ya0l0ZW1zKHtcbiAgICAgICAgICAuLi4ocC5zdGF0ZSAhPT0gdW5kZWZpbmVkID8geyBzdGF0ZTogcC5zdGF0ZSBhcyBXb3JrSXRlbVN0YXRlIH0gOiB7fSksXG4gICAgICAgICAgLi4uKHAuZmVhdHVyZUlkICE9PSB1bmRlZmluZWQgPyB7IGZlYXR1cmVJZDogcC5mZWF0dXJlSWQgfSA6IHt9KSxcbiAgICAgICAgICAuLi4ocC5jbGFpbWFibGUgIT09IHVuZGVmaW5lZCA/IHsgY2xhaW1hYmxlOiBwLmNsYWltYWJsZSB9IDoge30pLFxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIGNhc2UgJ2luYm94Jzoge1xuICAgICAgICBjb25zdCBhd2FpdGluZ1NwZWMgPSBlbmdpbmVcbiAgICAgICAgICAubGlzdFdvcmtJdGVtcyh7IHN0YXRlOiAnZHJhZnQnIH0pXG4gICAgICAgICAgLmZpbHRlcigoaXRlbSkgPT4gaXRlbS5zcGVjQ2hlY2twb2ludCk7XG4gICAgICAgIGNvbnN0IGF3YWl0aW5nUmV2aWV3ID0gZW5naW5lLmxpc3RXb3JrSXRlbXMoeyBzdGF0ZTogJ2luX3JldmlldycgfSk7XG4gICAgICAgIHJldHVybiB7IGF3YWl0aW5nU3BlYywgYXdhaXRpbmdSZXZpZXcgfTtcbiAgICAgIH1cbiAgICAgIGNhc2UgJ3F1ZXJ5X2V2ZW50cyc6IHtcbiAgICAgICAgY29uc3QgcCA9IHBhcnNlZCBhcyBRdWVyeUV2ZW50c0luO1xuICAgICAgICByZXR1cm4gZW5naW5lLmV2ZW50cyhwLnN0cmVhbUlkKTtcbiAgICAgIH1cbiAgICAgIGNhc2UgJ2dldF9jbGFpbXMnOiB7XG4gICAgICAgIGNvbnN0IHAgPSBwYXJzZWQgYXMgV29ya0l0ZW1JbjtcbiAgICAgICAgcmV0dXJuIGVuZ2luZS5nZXRDbGFpbXMocC53b3JrSXRlbUlkKTtcbiAgICAgIH1cbiAgICAgIGNhc2UgJ3dob2FtaSc6IHtcbiAgICAgICAgcmV0dXJuIHsgYWN0b3JJZDogY3R4LmFjdG9ySWQsIGlzQWRtaW46IGN0eC5pc0FkbWluIH07XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gVW5yZWFjaGFibGUgd2hpbGUgdGhlIHN3aXRjaCBjb3ZlcnMgdGhlIHJlZ2lzdHJ5OyBrZWVwcyB0aGUgY29tcGlsZXIgaG9uZXN0LlxuICAgIHRocm93IG5ldyBHdWFyZEZhaWxlZEVycm9yKGBjb21tYW5kIG5vdCB3aXJlZCB0byB0aGUgYnVzOiAke2NvbW1hbmR9YCk7XG4gIH1cblxuICByZXR1cm4geyBleGVjdXRlLCBlbmdpbmUgfTtcbn1cbiIsICIvKipcbiAqIE1DUCBhZGFwdGVyIFx1MjAxNCBldmVyeSByZWdpc3RyeSBlbnRyeSBpbiBDT01NQU5EUyBiZWNvbWVzIG9uZSB0b29sOyBldmVyeVxuICogdG9vbCBoYW5kbGVyIGNhbGxzIHRoZSBTQU1FIGJ1cy5leGVjdXRlIHRoZSBIVFRQIHJvdXRlIGNhbGxzLiBObyBsb2dpY1xuICogbGl2ZXMgaGVyZSAocm9hZG1hcCBcdTAwQTcyLjI6IHN0cnVjdHVyYWxseSBpZGVudGljYWwgc2VtYW50aWNzLCBENSkuXG4gKlxuICogREVDSVNJT04gKHJlY29yZGVkKTogd2UgdXNlIHRoZSBsb3ctbGV2ZWwgYFNlcnZlcmAgK1xuICogc2V0UmVxdWVzdEhhbmRsZXIoTGlzdFRvb2xzL0NhbGxUb29sKSBpbnN0ZWFkIG9mIGBNY3BTZXJ2ZXIucmVnaXN0ZXJUb29sYC5cbiAqIFNESyAxLjI5J3MgTWNwU2VydmVyIGFjY2VwdHMgem9kIHNjaGVtYXMgYW5kIHJlLWVtaXRzIEpTT04gU2NoZW1hIHRocm91Z2hcbiAqIGl0cyBvd24gY29tcGF0IGxheWVyICh6b2QgdjQgYnJhbmNoIHRhcmdldHMgZHJhZnQtNyk7IGNvbnRyYWN0cydcbiAqIGlucHV0SnNvblNjaGVtYSgpIGlzIHpvZCB2NCdzIG5hdGl2ZSBkcmFmdC0yMDIwLTEyIGVtaXNzaW9uLiBGZWVkaW5nIHRoZVxuICogY29udHJhY3RzIEpTT04gU2NoZW1hIHZlcmJhdGltIHRocm91Z2ggdGhlIGxvdy1sZXZlbCBBUEkga2VlcHNcbiAqIFwidG9vbCBpbnB1dFNjaGVtYSA9PT0gaW5wdXRKc29uU2NoZW1hKGNvbW1hbmQpXCIgYnl0ZS1pZGVudGljYWwgXHUyMDE0IHBhcml0eSBpc1xuICogYXNzZXJ0ZWQgYnkgZGVlcC1lcXVhbGl0eSBpbiB0ZXN0L3Bhcml0eS50ZXN0LnRzLlxuICovXG5pbXBvcnQgeyBTZXJ2ZXIgfSBmcm9tICdAbW9kZWxjb250ZXh0cHJvdG9jb2wvc2RrL3NlcnZlci9pbmRleC5qcyc7XG5pbXBvcnQgeyBTdHJlYW1hYmxlSFRUUFNlcnZlclRyYW5zcG9ydCB9IGZyb20gJ0Btb2RlbGNvbnRleHRwcm90b2NvbC9zZGsvc2VydmVyL3N0cmVhbWFibGVIdHRwLmpzJztcbmltcG9ydCB7XG4gIENhbGxUb29sUmVxdWVzdFNjaGVtYSxcbiAgTGlzdFRvb2xzUmVxdWVzdFNjaGVtYSxcbiAgdHlwZSBDYWxsVG9vbFJlc3VsdCxcbn0gZnJvbSAnQG1vZGVsY29udGV4dHByb3RvY29sL3Nkay90eXBlcy5qcyc7XG5pbXBvcnQgdHlwZSB7IEZhc3RpZnlJbnN0YW5jZSwgRmFzdGlmeVJlcXVlc3QgfSBmcm9tICdmYXN0aWZ5JztcbmltcG9ydCB7XG4gIENPTU1BTkRTLFxuICBpbnB1dEpzb25TY2hlbWEsXG4gIG1jcFRvb2xOYW1lLFxuICB0eXBlIEFjdG9yQ29udGV4dCxcbiAgdHlwZSBDb21tYW5kQnVzLFxufSBmcm9tICdAb2Focy9jb250cmFjdHMnO1xuXG5pbXBvcnQgeyBlcnJvck5hbWUgfSBmcm9tICcuL3NlcnZlci5qcyc7XG5cbmNvbnN0IFRPT0xfVE9fQ09NTUFORDogUmVhZG9ubHlNYXA8c3RyaW5nLCBzdHJpbmc+ID0gbmV3IE1hcChcbiAgQ09NTUFORFMubWFwKChjb21tYW5kKSA9PiBbbWNwVG9vbE5hbWUoY29tbWFuZC5uYW1lKSwgY29tbWFuZC5uYW1lXSksXG4pO1xuXG4vKipcbiAqIEJ1aWxkIG9uZSBNQ1Agc2VydmVyIGJvdW5kIHRvIGFuIGF1dGhlbnRpY2F0ZWQgYWN0b3IgY29udGV4dC4gU3RhdGVsZXNzXG4gKiBIVFRQIG1vdW50cyBjb25zdHJ1Y3Qgb25lIHBlciByZXF1ZXN0OyB0ZXN0cyB3aXJlIG9uZSB0byBhblxuICogSW5NZW1vcnlUcmFuc3BvcnQgZGlyZWN0bHkuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBidWlsZE1jcFNlcnZlcihidXM6IENvbW1hbmRCdXMsIGN0eDogQWN0b3JDb250ZXh0KTogU2VydmVyIHtcbiAgY29uc3Qgc2VydmVyID0gbmV3IFNlcnZlcihcbiAgICB7IG5hbWU6ICdvYWhzLXNwaW5lJywgdmVyc2lvbjogJzAuMC4xJyB9LFxuICAgIHsgY2FwYWJpbGl0aWVzOiB7IHRvb2xzOiB7fSB9IH0sXG4gICk7XG5cbiAgc2VydmVyLnNldFJlcXVlc3RIYW5kbGVyKExpc3RUb29sc1JlcXVlc3RTY2hlbWEsIGFzeW5jICgpID0+ICh7XG4gICAgdG9vbHM6IENPTU1BTkRTLm1hcCgoY29tbWFuZCkgPT4gKHtcbiAgICAgIG5hbWU6IG1jcFRvb2xOYW1lKGNvbW1hbmQubmFtZSksXG4gICAgICBkZXNjcmlwdGlvbjogY29tbWFuZC5kZXNjcmlwdGlvbixcbiAgICAgIC8vIFZlcmJhdGltIGZyb20gY29udHJhY3RzIFx1MjAxNCB0aGUgcGFyaXR5IHRlc3QgZGVlcC1lcXVhbHMgdGhpcy5cbiAgICAgIGlucHV0U2NoZW1hOiBpbnB1dEpzb25TY2hlbWEoY29tbWFuZC5uYW1lKSBhcyB7IHR5cGU6ICdvYmplY3QnOyBbazogc3RyaW5nXTogdW5rbm93biB9LFxuICAgIH0pKSxcbiAgfSkpO1xuXG4gIHNlcnZlci5zZXRSZXF1ZXN0SGFuZGxlcihDYWxsVG9vbFJlcXVlc3RTY2hlbWEsIGFzeW5jIChyZXF1ZXN0KTogUHJvbWlzZTxDYWxsVG9vbFJlc3VsdD4gPT4ge1xuICAgIGNvbnN0IGNvbW1hbmROYW1lID0gVE9PTF9UT19DT01NQU5ELmdldChyZXF1ZXN0LnBhcmFtcy5uYW1lKTtcbiAgICBpZiAoY29tbWFuZE5hbWUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgY29udGVudDogW3sgdHlwZTogJ3RleHQnLCB0ZXh0OiBgdW5rbm93biB0b29sOiAke3JlcXVlc3QucGFyYW1zLm5hbWV9YCB9XSxcbiAgICAgICAgaXNFcnJvcjogdHJ1ZSxcbiAgICAgIH07XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAvLyBUaGUgZXhhY3Qgc2FtZSBjYWxsIHRoZSBIVFRQIHJvdXRlIG1ha2VzIFx1MjAxNCBubyBNQ1Atb25seSBsb2dpYy5cbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGJ1cy5leGVjdXRlKGNvbW1hbmROYW1lLCByZXF1ZXN0LnBhcmFtcy5hcmd1bWVudHMgPz8ge30sIGN0eCk7XG4gICAgICByZXR1cm4geyBjb250ZW50OiBbeyB0eXBlOiAndGV4dCcsIHRleHQ6IEpTT04uc3RyaW5naWZ5KHJlc3VsdCA/PyBudWxsKSB9XSB9O1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgdHlwZTogJ3RleHQnLFxuICAgICAgICAgICAgdGV4dDogSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICAgICAgICBlcnJvcjoge1xuICAgICAgICAgICAgICAgIG5hbWU6IGVycm9yTmFtZShlcnJvciksXG4gICAgICAgICAgICAgICAgbWVzc2FnZTogZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpLFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSksXG4gICAgICAgICAgfSxcbiAgICAgICAgXSxcbiAgICAgICAgaXNFcnJvcjogdHJ1ZSxcbiAgICAgIH07XG4gICAgfVxuICB9KTtcblxuICByZXR1cm4gc2VydmVyO1xufVxuXG4vKipcbiAqIE1vdW50IFBPU1QgL21jcCBvbiB0aGUgRmFzdGlmeSBhcHAgXHUyMDE0IHN0YXRlbGVzcyBTdHJlYW1hYmxlSFRUUCBwYXR0ZXJuXG4gKiAoc2Vzc2lvbklkR2VuZXJhdG9yOiB1bmRlZmluZWQpOiBhIGZyZXNoIHNlcnZlcit0cmFuc3BvcnQgcGFpciBwZXIgcmVxdWVzdCxcbiAqIGZ1bGx5IGlzb2xhdGVkLCBubyBzZXNzaW9uIHN0YXRlIHRvIGxlYWsgYmV0d2VlbiBhY3RvcnMuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZWdpc3Rlck1jcFJvdXRlKFxuICBhcHA6IEZhc3RpZnlJbnN0YW5jZSxcbiAgYnVzOiBDb21tYW5kQnVzLFxuICBhdXRoZW50aWNhdGU6IChyZXF1ZXN0OiBGYXN0aWZ5UmVxdWVzdCkgPT4gQWN0b3JDb250ZXh0IHwgbnVsbCxcbik6IHZvaWQge1xuICBhcHAucG9zdCgnL21jcCcsIGFzeW5jIChyZXF1ZXN0LCByZXBseSkgPT4ge1xuICAgIGNvbnN0IGN0eCA9IGF1dGhlbnRpY2F0ZShyZXF1ZXN0KTtcbiAgICBpZiAoY3R4ID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gcmVwbHlcbiAgICAgICAgLmNvZGUoNDAxKVxuICAgICAgICAuc2VuZCh7IGpzb25ycGM6ICcyLjAnLCBlcnJvcjogeyBjb2RlOiAtMzIwMDEsIG1lc3NhZ2U6ICd1bmF1dGhvcml6ZWQnIH0sIGlkOiBudWxsIH0pO1xuICAgIH1cblxuICAgIGNvbnN0IHNlcnZlciA9IGJ1aWxkTWNwU2VydmVyKGJ1cywgY3R4KTtcbiAgICAvLyBTdGF0ZWxlc3MgbW9kZTogc2Vzc2lvbklkR2VuZXJhdG9yIG9taXR0ZWQgKFx1MjI2MSB1bmRlZmluZWQgXHUyMDE0IHRoZSBTREsnc1xuICAgIC8vIGRvY3VtZW50ZWQgc3RhdGVsZXNzIHBhdHRlcm47IHRoZSBrZXkgaXMgbGVmdCBvdXQgb25seSBiZWNhdXNlIHRoZSBTREtcbiAgICAvLyBvcHRpb25zIHR5cGUgaXMgbm90IGV4YWN0T3B0aW9uYWxQcm9wZXJ0eVR5cGVzLWNsZWFuKS5cbiAgICBjb25zdCB0cmFuc3BvcnQgPSBuZXcgU3RyZWFtYWJsZUhUVFBTZXJ2ZXJUcmFuc3BvcnQoeyBlbmFibGVKc29uUmVzcG9uc2U6IHRydWUgfSk7XG5cbiAgICByZXBseS5oaWphY2soKTtcbiAgICB0cnkge1xuICAgICAgLy8gQ2FzdDogdGhlIFNESydzIFRyYW5zcG9ydCBpbnRlcmZhY2UgaXMgbm90IGV4YWN0T3B0aW9uYWxQcm9wZXJ0eVR5cGVzLWNsZWFuLlxuICAgICAgYXdhaXQgc2VydmVyLmNvbm5lY3QodHJhbnNwb3J0IGFzIHVua25vd24gYXMgUGFyYW1ldGVyczx0eXBlb2Ygc2VydmVyLmNvbm5lY3Q+WzBdKTtcbiAgICAgIC8vIEpTT04tcmVzcG9uc2UgbW9kZTogcmVzb2x2ZXMgb25jZSB0aGUgcmVzcG9uc2UgaGFzIGJlZW4gd3JpdHRlbi5cbiAgICAgIC8vIChEbyBOT1QgY2xvc2Ugb24gcmVxdWVzdC5yYXcgJ2Nsb3NlJyBcdTIwMTQgTm9kZSBlbWl0cyBpdCBhcyBzb29uIGFzIHRoZVxuICAgICAgLy8gcGFyc2VkIHJlcXVlc3Qgc3RyZWFtIGVuZHMsIHdoaWNoIHdvdWxkIGtpbGwgdGhlIHBlbmRpbmcgcmVzcG9uc2UuKVxuICAgICAgYXdhaXQgdHJhbnNwb3J0LmhhbmRsZVJlcXVlc3QocmVxdWVzdC5yYXcsIHJlcGx5LnJhdywgcmVxdWVzdC5ib2R5KTtcbiAgICB9IGZpbmFsbHkge1xuICAgICAgdm9pZCB0cmFuc3BvcnQuY2xvc2UoKTtcbiAgICAgIHZvaWQgc2VydmVyLmNsb3NlKCk7XG4gICAgfVxuICAgIHJldHVybiByZXBseTtcbiAgfSk7XG59XG4iLCAiLyoqXG4gKiBHRVQgL2V2ZW50cy9zdHJlYW0gXHUyMDE0IFNlcnZlci1TZW50IEV2ZW50cyByZWxheSBvZiB0aGUgYXBwZW5kLW9ubHkgZXZlbnQgbG9nLlxuICpcbiAqIFJlYWQtb25seSBzdXJmYWNlIChuZXZlciBhIHdyaXRlIHBhdGgpOiBlYWNoIFNTRSBmcmFtZSBpcyBvbmUgU3BpbmVFdmVudCBhc1xuICogSlNPTiB3aXRoIGBpZDogPGdsb2JhbFNlcT5gLCBzbyBzdGFuZGFyZCBFdmVudFNvdXJjZSByZWNvbm5lY3Rpb25cbiAqIChMYXN0LUV2ZW50LUlEKSByZXN1bWVzIGV4YWN0bHkgd2hlcmUgdGhlIGNsaWVudCBsZWZ0IG9mZjsgYD9zaW5jZT08c2VxPmBcbiAqIGRvZXMgdGhlIHNhbWUgZm9yIGEgZmlyc3QgY29ubmVjdC5cbiAqXG4gKiBUb2RheSB0aGUgcmVsYXkgUE9MTFMgZW5naW5lLmV2ZW50cygpICgzMDBtcykgYmVoaW5kIHRoZSBFdmVudFRhaWxcbiAqIGludGVyZmFjZTsgYSByZWFsIHRyYW5zYWN0aW9uYWwgb3V0Ym94IGNhbiByZXBsYWNlIHBvbGxpbmdFdmVudFRhaWwgd2l0aG91dFxuICogdG91Y2hpbmcgdGhlIHJvdXRlLiBIZWFydGJlYXQgY29tbWVudHMgZXZlcnkgMTVzIGtlZXAgcHJveGllcyBmcm9tIHRpbWluZ1xuICogb3V0IHRoZSBpZGxlIHN0cmVhbTsgZXZlcnkgdGltZXIgaXMgY2xlYXJlZCBvbiBjbGllbnQgZGlzY29ubmVjdCBhbmQgb25cbiAqIHNlcnZlciBjbG9zZS5cbiAqL1xuaW1wb3J0IHR5cGUgeyBGYXN0aWZ5SW5zdGFuY2UsIEZhc3RpZnlSZXF1ZXN0IH0gZnJvbSAnZmFzdGlmeSc7XG5pbXBvcnQgdHlwZSB7IFNwaW5lRW5naW5lLCBTcGluZUV2ZW50IH0gZnJvbSAnQG9haHMvY29yZSc7XG5pbXBvcnQgdHlwZSB7IEFjdG9yQ29udGV4dCwgRXJyb3JFbnZlbG9wZSB9IGZyb20gJ0BvYWhzL2NvbnRyYWN0cyc7XG5cbi8qKiBBYnN0cmFjdCBvcmRlcmVkIGV2ZW50IHNvdXJjZTogZXZlcnl0aGluZyBzdHJpY3RseSBhZnRlciBhIGdsb2JhbCBzZXEuICovXG5leHBvcnQgaW50ZXJmYWNlIEV2ZW50VGFpbCB7XG4gIGFmdGVyKGdsb2JhbFNlcTogbnVtYmVyKTogU3BpbmVFdmVudFtdO1xufVxuXG4vKiogUG9sbGluZyBpbXBsZW1lbnRhdGlvbiBvdmVyIGVuZ2luZS5ldmVudHMoKSBcdTIwMTQgc3dhcHBlZCBmb3IgYW4gb3V0Ym94IGxhdGVyLiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBvbGxpbmdFdmVudFRhaWwoZW5naW5lOiBTcGluZUVuZ2luZSk6IEV2ZW50VGFpbCB7XG4gIHJldHVybiB7XG4gICAgYWZ0ZXIoZ2xvYmFsU2VxOiBudW1iZXIpOiBTcGluZUV2ZW50W10ge1xuICAgICAgcmV0dXJuIGVuZ2luZS5ldmVudHMoKS5maWx0ZXIoKGV2ZW50KSA9PiBldmVudC5nbG9iYWxTZXEgPiBnbG9iYWxTZXEpO1xuICAgIH0sXG4gIH07XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgRXZlbnRTdHJlYW1PcHRpb25zIHtcbiAgLyoqIFBvbGwgaW50ZXJ2YWwgZm9yIG5ldyBldmVudHMgKG1zKS4gRGVmYXVsdCAzMDAuICovXG4gIHBvbGxNcz86IG51bWJlcjtcbiAgLyoqIEhlYXJ0YmVhdCBjb21tZW50IGludGVydmFsIChtcykuIERlZmF1bHQgMTUwMDAuICovXG4gIGhlYXJ0YmVhdE1zPzogbnVtYmVyO1xufVxuXG5mdW5jdGlvbiBwYXJzZUN1cnNvcihyZXF1ZXN0OiBGYXN0aWZ5UmVxdWVzdCk6IG51bWJlciB7XG4gIC8vIFNTRSByZWNvbm5lY3Rpb24gd2luczogdGhlIGJyb3dzZXIgRXZlbnRTb3VyY2UgcmVzZW5kcyB0aGUgbGFzdCBzZWVuIGlkLlxuICBjb25zdCBsYXN0RXZlbnRJZCA9IHJlcXVlc3QuaGVhZGVyc1snbGFzdC1ldmVudC1pZCddO1xuICBjb25zdCByYXcgPVxuICAgIHR5cGVvZiBsYXN0RXZlbnRJZCA9PT0gJ3N0cmluZycgJiYgbGFzdEV2ZW50SWQudHJpbSgpICE9PSAnJ1xuICAgICAgPyBsYXN0RXZlbnRJZFxuICAgICAgOiAocmVxdWVzdC5xdWVyeSBhcyB7IHNpbmNlPzogc3RyaW5nIH0pLnNpbmNlO1xuICBpZiAocmF3ID09PSB1bmRlZmluZWQpIHJldHVybiAwO1xuICBjb25zdCBwYXJzZWQgPSBOdW1iZXIocmF3KTtcbiAgcmV0dXJuIE51bWJlci5pc0Zpbml0ZShwYXJzZWQpICYmIHBhcnNlZCA+PSAwID8gTWF0aC5mbG9vcihwYXJzZWQpIDogMDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJlZ2lzdGVyRXZlbnRTdHJlYW0oXG4gIGFwcDogRmFzdGlmeUluc3RhbmNlLFxuICB0YWlsOiBFdmVudFRhaWwsXG4gIGF1dGhlbnRpY2F0ZTogKHJlcXVlc3Q6IEZhc3RpZnlSZXF1ZXN0KSA9PiBBY3RvckNvbnRleHQgfCBudWxsLFxuICBvcHRpb25zOiBFdmVudFN0cmVhbU9wdGlvbnMgPSB7fSxcbik6IHZvaWQge1xuICBjb25zdCBwb2xsTXMgPSBvcHRpb25zLnBvbGxNcyA/PyAzMDA7XG4gIGNvbnN0IGhlYXJ0YmVhdE1zID0gb3B0aW9ucy5oZWFydGJlYXRNcyA/PyAxNV8wMDA7XG4gIGNvbnN0IGNsZWFudXBzID0gbmV3IFNldDwoKSA9PiB2b2lkPigpO1xuXG4gIC8vIEEgaGlqYWNrZWQgU1NFIHJlc3BvbnNlIG91dGxpdmVzIEZhc3RpZnkncyByZXF1ZXN0IGxpZmVjeWNsZSBcdTIwMTQgY2xvc2UgYWxsXG4gIC8vIGxpdmUgc3RyZWFtcyB3aGVuIHRoZSBzZXJ2ZXIgY2xvc2VzIHNvIHRlc3RzIChhbmQgc2h1dGRvd25zKSBuZXZlciBoYW5nLlxuICBhcHAuYWRkSG9vaygnb25DbG9zZScsIChfaW5zdGFuY2UsIGRvbmUpID0+IHtcbiAgICBmb3IgKGNvbnN0IGNsZWFudXAgb2YgWy4uLmNsZWFudXBzXSkgY2xlYW51cCgpO1xuICAgIGRvbmUoKTtcbiAgfSk7XG5cbiAgYXBwLmdldCgnL2V2ZW50cy9zdHJlYW0nLCAocmVxdWVzdCwgcmVwbHkpID0+IHtcbiAgICBjb25zdCBjdHggPSBhdXRoZW50aWNhdGUocmVxdWVzdCk7XG4gICAgaWYgKGN0eCA9PT0gbnVsbCkge1xuICAgICAgdm9pZCByZXBseS5jb2RlKDQwMSkuc2VuZCh7XG4gICAgICAgIG9rOiBmYWxzZSxcbiAgICAgICAgZXJyb3I6IHsgbmFtZTogJ0Vycm9yJywgbWVzc2FnZTogJ3VuYXV0aG9yaXplZDogbWlzc2luZyBvciBpbnZhbGlkIGJlYXJlciB0b2tlbicgfSxcbiAgICAgIH0gc2F0aXNmaWVzIEVycm9yRW52ZWxvcGUpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGxldCBjdXJzb3IgPSBwYXJzZUN1cnNvcihyZXF1ZXN0KTtcblxuICAgIHJlcGx5LmhpamFjaygpO1xuICAgIGNvbnN0IHJlcyA9IHJlcGx5LnJhdztcbiAgICByZXMud3JpdGVIZWFkKDIwMCwge1xuICAgICAgJ2NvbnRlbnQtdHlwZSc6ICd0ZXh0L2V2ZW50LXN0cmVhbScsXG4gICAgICAnY2FjaGUtY29udHJvbCc6ICduby1jYWNoZSwgbm8tdHJhbnNmb3JtJyxcbiAgICAgIGNvbm5lY3Rpb246ICdrZWVwLWFsaXZlJyxcbiAgICAgICd4LWFjY2VsLWJ1ZmZlcmluZyc6ICdubycsXG4gICAgfSk7XG4gICAgcmVzLndyaXRlKCc6IGNvbm5lY3RlZFxcblxcbicpO1xuXG4gICAgY29uc3QgZmx1c2ggPSAoKTogdm9pZCA9PiB7XG4gICAgICBmb3IgKGNvbnN0IGV2ZW50IG9mIHRhaWwuYWZ0ZXIoY3Vyc29yKSkge1xuICAgICAgICBjdXJzb3IgPSBldmVudC5nbG9iYWxTZXE7XG4gICAgICAgIHJlcy53cml0ZShgaWQ6ICR7ZXZlbnQuZ2xvYmFsU2VxfVxcbmRhdGE6ICR7SlNPTi5zdHJpbmdpZnkoZXZlbnQpfVxcblxcbmApO1xuICAgICAgfVxuICAgIH07XG4gICAgZmx1c2goKTtcblxuICAgIGNvbnN0IHBvbGwgPSBzZXRJbnRlcnZhbChmbHVzaCwgcG9sbE1zKTtcbiAgICBjb25zdCBoZWFydGJlYXQgPSBzZXRJbnRlcnZhbCgoKSA9PiB7XG4gICAgICByZXMud3JpdGUoJzogaGVhcnRiZWF0XFxuXFxuJyk7XG4gICAgfSwgaGVhcnRiZWF0TXMpO1xuXG4gICAgY29uc3QgY2xlYW51cCA9ICgpOiB2b2lkID0+IHtcbiAgICAgIGNsZWFySW50ZXJ2YWwocG9sbCk7XG4gICAgICBjbGVhckludGVydmFsKGhlYXJ0YmVhdCk7XG4gICAgICBjbGVhbnVwcy5kZWxldGUoY2xlYW51cCk7XG4gICAgICBpZiAoIXJlcy53cml0YWJsZUVuZGVkKSByZXMuZW5kKCk7XG4gICAgfTtcbiAgICBjbGVhbnVwcy5hZGQoY2xlYW51cCk7XG4gICAgLy8gUmVzcG9uc2UgJ2Nsb3NlJyBmaXJlcyB3aGVuIHRoZSB1bmRlcmx5aW5nIHNvY2tldCBnb2VzIGF3YXkgXHUyMDE0IGNsaWVudFxuICAgIC8vIGRpc2Nvbm5lY3RzIGluY2x1ZGVkLiAocmVxdWVzdC5yYXcgJ2Nsb3NlJyBmaXJlcyBhcyBzb29uIGFzIHRoZSBwYXJzZWRcbiAgICAvLyByZXF1ZXN0IHN0cmVhbSBlbmRzLCB3aGljaCBpcyBpbW1lZGlhdGVseSBmb3IgYSBHRVQuKVxuICAgIHJlcy5vbignY2xvc2UnLCBjbGVhbnVwKTtcbiAgfSk7XG59XG4iLCAiLyoqXG4gKiBHRVQgL3VpIFx1MjAxNCB0aGUgc3RhdGljIGNoYXQgVUkgKEQzKS4gVGhyZWUgZmlsZXMgb3V0IG9mIHB1YmxpYy8gKGJ1aWx0IGJ5XG4gKiBzY3JpcHRzL2J1aWxkLXVpLm1qcyksIHNlcnZlZCB3aXRoIHBsYWluIHJlYWRGaWxlU3luYyBcdTIwMTQgbm8gQGZhc3RpZnkvc3RhdGljXG4gKiBkZXBlbmRlbmN5IGZvciB0aHJlZSBmaWxlcywgYW5kIE5PIG5ldyBzZXJ2ZXIgbG9naWM6IHRoZSBVSSB0YWxrcyB0byB0aGVcbiAqIHNhbWUgL3JwYy8qICsgL2V2ZW50cy9zdHJlYW0gc3VyZmFjZXMgYXMgZXZlcnkgb3RoZXIgY2xpZW50LCBhdXRoZW50aWNhdGVkXG4gKiBieSB0aGUgYmVhcmVyIHRva2VuIHRoZSB1c2VyIHBhc3RlcyBpbi4gVGhlIHN0YXRpYyByb3V0ZXMgdGhlbXNlbHZlcyBhcmVcbiAqIHVuYXV0aGVudGljYXRlZCBvbiBwdXJwb3NlIChsb2dpbiBoYXBwZW5zIGluLWFwcCkuXG4gKi9cbmltcG9ydCB7IHJlYWRGaWxlU3luYyB9IGZyb20gJ25vZGU6ZnMnO1xuaW1wb3J0IHsgZGlybmFtZSwgam9pbiB9IGZyb20gJ25vZGU6cGF0aCc7XG5pbXBvcnQgeyBmaWxlVVJMVG9QYXRoIH0gZnJvbSAnbm9kZTp1cmwnO1xuaW1wb3J0IHR5cGUgeyBGYXN0aWZ5SW5zdGFuY2UgfSBmcm9tICdmYXN0aWZ5JztcblxuY29uc3QgcHVibGljRGlyID0gam9pbihkaXJuYW1lKGZpbGVVUkxUb1BhdGgoaW1wb3J0Lm1ldGEudXJsKSksICcuLicsICdwdWJsaWMnKTtcblxuY29uc3QgQ09OVEVOVF9UWVBFUzogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHtcbiAgJy5odG1sJzogJ3RleHQvaHRtbDsgY2hhcnNldD11dGYtOCcsXG4gICcuanMnOiAndGV4dC9qYXZhc2NyaXB0OyBjaGFyc2V0PXV0Zi04JyxcbiAgJy5jc3MnOiAndGV4dC9jc3M7IGNoYXJzZXQ9dXRmLTgnLFxufTtcblxuZXhwb3J0IGZ1bmN0aW9uIHJlZ2lzdGVyVWlSb3V0ZXMoYXBwOiBGYXN0aWZ5SW5zdGFuY2UpOiB2b2lkIHtcbiAgY29uc3Qgc2VydmUgPSAocm91dGVQYXRoOiBzdHJpbmcsIGZpbGVOYW1lOiBzdHJpbmcsIGV4dDogc3RyaW5nKTogdm9pZCA9PiB7XG4gICAgYXBwLmdldChyb3V0ZVBhdGgsIChfcmVxdWVzdCwgcmVwbHkpID0+IHtcbiAgICAgIHRyeSB7XG4gICAgICAgIC8vIFJlYWQgcGVyIHJlcXVlc3Q6IHRocmVlIHNtYWxsIGZpbGVzLCBhbmQgYSByZWJ1aWx0IGJ1bmRsZSBpcyBwaWNrZWRcbiAgICAgICAgLy8gdXAgd2l0aG91dCBhIHNlcnZlciByZXN0YXJ0LlxuICAgICAgICBjb25zdCBjb250ZW50ID0gcmVhZEZpbGVTeW5jKGpvaW4ocHVibGljRGlyLCBmaWxlTmFtZSkpO1xuICAgICAgICB2b2lkIHJlcGx5LnR5cGUoQ09OVEVOVF9UWVBFU1tleHRdID8/ICdhcHBsaWNhdGlvbi9vY3RldC1zdHJlYW0nKS5zZW5kKGNvbnRlbnQpO1xuICAgICAgfSBjYXRjaCB7XG4gICAgICAgIHZvaWQgcmVwbHkuY29kZSg0MDQpLnNlbmQoe1xuICAgICAgICAgIG9rOiBmYWxzZSxcbiAgICAgICAgICBlcnJvcjogeyBuYW1lOiAnRXJyb3InLCBtZXNzYWdlOiBgdWkgYXNzZXQgbm90IGJ1aWx0OiAke2ZpbGVOYW1lfSAocnVuIHBucG0gYnVpbGQ6dWkpYCB9LFxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfTtcblxuICBzZXJ2ZSgnL3VpJywgJ2luZGV4Lmh0bWwnLCAnLmh0bWwnKTtcbiAgc2VydmUoJy91aS9hcHAuanMnLCAnYXBwLmpzJywgJy5qcycpO1xuICBzZXJ2ZSgnL3VpL2FwcC5jc3MnLCAnYXBwLmNzcycsICcuY3NzJyk7XG59XG4iXSwKICAibWFwcGluZ3MiOiAiOzs7Ozs7Ozs7Ozs7O0FBQUEsSUEwQmEsdUJBV0Esa0JBUUEsZUFRQSx3QkFXQSx3QkFhQSxrQkFXQSxpQkF1REEsZUFPQSxjQUdBLGdDQVNBLGdCQXVFQSxtQkFzQkEsaUJBZUEsVUEySEE7QUF6WWI7QUFBQTtBQUFBO0FBMEJPLElBQU0sd0JBQU4sY0FBb0MsTUFBTTtBQUFBLE1BQy9DLFlBQ2tCLFlBQ0EsU0FDaEI7QUFDQSxjQUFNLHNCQUFzQixVQUFVLGNBQWMsT0FBTyxFQUFFO0FBSDdDO0FBQ0E7QUFHaEIsYUFBSyxPQUFPO0FBQUEsTUFDZDtBQUFBLElBQ0Y7QUFHTyxJQUFNLG1CQUFOLGNBQStCLE1BQU07QUFBQSxNQUMxQyxZQUE0QixPQUFlO0FBQ3pDLGNBQU0saUJBQWlC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QUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLElBQ0Y7QUEyQk8sSUFBTSxXQUFXLGNBQWMsWUFBWSxHQUFHO0FBQUE7QUFBQTs7O0FDcElyRCxJQUlhO0FBSmI7QUFBQTtBQUFBO0FBSU8sSUFBTSxhQUFhO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtB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QU8sTUFBTSw0QkFBdUIsSUFBSSxJQUFJLEtBQUssSUFBSSxPQUFPO0FBQUEsQ0FBSTtBQUN4RSxjQUFRLFdBQVc7QUFBQSxJQUNyQjtBQUFBLEVBQ0YsQ0FBQztBQUVILFNBQU87QUFDVDtBQUVBLGVBQXNCLEtBQUssT0FBaUIsUUFBUSxNQUFxQjtBQUN2RSxRQUFNLGFBQWEsRUFBRSxXQUFXLElBQUk7QUFDdEM7QUFHQSxLQUFLLEtBQUs7IiwKICAibmFtZXMiOiBbIndvcmtJdGVtSWQiLCAiZmVuY2luZ1Rva2VuIiwgIm1lc3NhZ2VzIiwgInNwYXduU3luYyIsICJleGlzdHNTeW5jIiwgInJlYWRGaWxlU3luYyIsICJybVN5bmMiLCAid3JpdGVGaWxlU3luYyIsICJqb2luIiwgInBhcnNlWWFtbCIsICJzcGxpdEZyb250bWF0dGVyIiwgImlzUmVtb3RlRXJyb3IiLCAid29ya0l0ZW1JZCIsICJldmlkZW5jZSIsICJiYXNlbGluZSIsICJvdXRjb21lIiwgImluaXRfc3JjIiwgInNxbCIsICJSQU5LIiwgIlRSQU5TSVRJT05TIiwgIkxFR0FDWV9TVEFUVVMiLCAid29ya0l0ZW1JZCIsICJmZW5jaW5nVG9rZW4iLCAicXVvcnVtTWV0IiwgImRpcm5hbWUiLCAiam9pbiIsICJmaWxlVVJMVG9QYXRoIiwgInNyY19leHBvcnRzIiwgImluaXRfc3JjIiwgInJlc29sdmUiLCAiZXJyb3JOYW1lIiwgImluaXRfc3JjIiwgInJlYWRGaWxlU3luYyIsICJyZXNvbHZlIiwgInRocmVhZHMiLCAibWVudGlvbnMiLCAibWVzc2FnZXMiLCAibm90aWZpY2F0aW9ucyIsICJlcSIsICJmZWF0dXJlcyIsICJyZWFkRmlsZVN5bmMiLCAicmVzb2x2ZSIsICJldmVudHMiLCAiYWN0b3JzIiwgInJlYWRGaWxlU3luYyIsICJ3cml0ZUZpbGVTeW5jIiwgIm1lc3NhZ2VzIiwgInJlYWRGaWxlU3luYyIsICJ3cml0ZUZpbGVTeW5jIiwgInJhbmRvbUJ5dGVzIiwgIm1rZGlyU3luYyIsICJqb2luIiwgImV4aXN0c1N5bmMiLCAibWtkaXJTeW5jIiwgInJlYWRGaWxlU3luYyIsICJ3cml0ZUZpbGVTeW5jIiwgImRlZiIsICJyZWFkRmlsZVN5bmMiLCAiZGlybmFtZSIsICJqb2luIiwgInJhbmRvbUJ5dGVzIiwgIm1rZGlyU3luYyIsICJjcmVhdGVQZ1N5bmNFbmdpbmUiLCAiam9pbiIsICJ0ZXh0IiwgInJlc29sdmUiLCAid29ya0l0ZW1JZCJdCn0K
