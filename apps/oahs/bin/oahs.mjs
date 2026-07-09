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

// src/serve.ts
init_src();
import { randomBytes as randomBytes2 } from "node:crypto";
import { mkdirSync as mkdirSync3 } from "node:fs";
import { join as join5 } from "node:path";

// ../spine-api/src/index.ts
init_src();

// ../spine-api/src/auth.ts
import { createHash, randomBytes } from "node:crypto";
import { existsSync as existsSync3, mkdirSync as mkdirSync2, readFileSync as readFileSync4, writeFileSync as writeFileSync3 } from "node:fs";
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
      const raw = JSON.parse(readFileSync4(this.persistPath, "utf8"));
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
    writeFileSync3(this.persistPath, JSON.stringify(shape, null, 2), "utf8");
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
import { readFileSync as readFileSync5 } from "node:fs";
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
        const content = readFileSync5(join3(publicDir, fileName));
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vLi4vLi4vcGFja2FnZXMvY29yZS9zcmMvdHlwZXMudHMiLCAiLi4vLi4vLi4vcGFja2FnZXMvY29yZS9zcmMvc3Rvcmllcy50cyIsICIuLi8uLi8uLi9wYWNrYWdlcy9jb3JlL3NyYy9lbmdpbmUudHMiLCAiLi4vLi4vLi4vcGFja2FnZXMvY29yZS9zcmMvaW50ZW50LWhhc2gudHMiLCAiLi4vLi4vLi4vcGFja2FnZXMvY29yZS9zcmMvaW5kZXgudHMiLCAiLi4vLi4vLi4vcGFja2FnZXMvcnVubmVyL3NyYy9kb2NsaW50LnRzIiwgIi4uLy4uLy4uL3BhY2thZ2VzL3J1bm5lci9zcmMvam9icy50cyIsICIuLi8uLi8uLi9wYWNrYWdlcy9ydW5uZXIvc3JjL2luZGV4LnRzIiwgIi4uLy4uLy4uL3BhY2thZ2VzL2RiL3NyYy9zY2hlbWEudHMiLCAiLi4vLi4vLi4vcGFja2FnZXMvZGIvc3JjL3BnLWVuZ2luZS50cyIsICIuLi8uLi8uLi9wYWNrYWdlcy9kYi9zcmMvc3luYy1lbmdpbmUudHMiLCAiLi4vLi4vLi4vcGFja2FnZXMvZGIvc3JjL3NjaGVtYS1zcWwudHMiLCAiLi4vLi4vLi4vcGFja2FnZXMvZGIvc3JjL2luZGV4LnRzIiwgIi4uL3NyYy9jbGkudHMiLCAiLi4vLi4vLi4vcGFja2FnZXMvY29udHJhY3RzL3NyYy9pbmRleC50cyIsICIuLi9zcmMvY29tbWFuZHMvaW5kZXgudHMiLCAiLi4vc3JjL2Zvcm1hdC50cyIsICIuLi9zcmMvY29tbWFuZHMvY29sbGFiLnRzIiwgIi4uL3NyYy9jb21tYW5kcy9waGFzZTUudHMiLCAiLi4vc3JjL3NlcnZlLnRzIiwgIi4uLy4uL3NwaW5lLWFwaS9zcmMvaW5kZXgudHMiLCAiLi4vLi4vc3BpbmUtYXBpL3NyYy9hdXRoLnRzIiwgIi4uLy4uL3NwaW5lLWFwaS9zcmMvc2VydmVyLnRzIiwgIi4uLy4uL3NwaW5lLWFwaS9zcmMvYnVzLnRzIiwgIi4uLy4uL3NwaW5lLWFwaS9zcmMvbWNwLnRzIiwgIi4uLy4uL3NwaW5lLWFwaS9zcmMvc3NlLnRzIiwgIi4uLy4uL3NwaW5lLWFwaS9zcmMvdWkudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbIi8qKlxuICogQG9haHMvY29yZSBcdTIwMTQgdHlwZXMsIGVycm9ycywgYW5kIHZvY2FidWxhcnkgb2YgdGhlIGRldGVybWluaXN0aWMgc3BpbmUuXG4gKlxuICogVGhlIGNvbmZvcm1hbmNlIHN1aXRlIGluIHRlc3QvIHdhcyB3cml0dGVuIEZJUlNULCBmcm9tIHRoZSBwcm9zZSBydWxlcyBpblxuICogdGhlIEJNQUQgc291cmNlIChibWFkLXNwcmludC1wbGFubmluZywgYm1hZC1kZXYtYXV0bywgYm1hZC1xdWljay1kZXYsXG4gKiBzdG9yaWVzLXNjaGVtYS5tZCkgYXMgYXJiaXRyYXRlZCBpbiBwcm9kdWN0LXJvYWRtYXAubWQgXHUwMEE3MS4gVGhlIGVuZ2luZSBpc1xuICogaW1wbGVtZW50ZWQgdG8gbWFrZSB0aGF0IHN1aXRlIHBhc3MgXHUyMDE0IG5ldmVyIHRoZSBvdGhlciB3YXkgYXJvdW5kLlxuICpcbiAqIEludmFyaWFudHMgZW5mb3JjZWQgaGVyZSBmb3JldmVyIChwcm9kdWN0LXJvYWRtYXAubWQgXHUwMEE3MC4xKTpcbiAqICAtIE5vIExMTSBTREsgaW1wb3J0LiBFdmVyLiAoQ0kgbGludClcbiAqICAtIEV2ZXJ5IG11dGF0aW9uIGdvZXMgdGhyb3VnaCBhIGNvbW1hbmQ7IGNvbW1hbmRzIGVtaXQgZXZlbnRzOyBwcm9qZWN0aW9uc1xuICogICAgYXJlIGNvbnNlcXVlbmNlcyBvZiBldmVudHMuXG4gKi9cblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBFcnJvcnNcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5leHBvcnQgY2xhc3MgTm90SW1wbGVtZW50ZWRFcnJvciBleHRlbmRzIEVycm9yIHtcbiAgY29uc3RydWN0b3Iod2hhdDogc3RyaW5nKSB7XG4gICAgc3VwZXIoYE5vdCBpbXBsZW1lbnRlZDogJHt3aGF0fWApO1xuICAgIHRoaXMubmFtZSA9ICdOb3RJbXBsZW1lbnRlZEVycm9yJztcbiAgfVxufVxuXG4vKiogQ29tbWFuZCByZWplY3RlZDogYWN0b3IgbGFja3MgdGhlIHJlcXVpcmVkIGdyYW50LiAqL1xuZXhwb3J0IGNsYXNzIFBlcm1pc3Npb25EZW5pZWRFcnJvciBleHRlbmRzIEVycm9yIHtcbiAgY29uc3RydWN0b3IoXG4gICAgcHVibGljIHJlYWRvbmx5IHBlcm1pc3Npb246IFBlcm1pc3Npb24sXG4gICAgcHVibGljIHJlYWRvbmx5IGFjdG9ySWQ6IHN0cmluZyxcbiAgKSB7XG4gICAgc3VwZXIoYHBlcm1pc3Npb24gZGVuaWVkOiAke3Blcm1pc3Npb259IGZvciBhY3RvciAke2FjdG9ySWR9YCk7XG4gICAgdGhpcy5uYW1lID0gJ1Blcm1pc3Npb25EZW5pZWRFcnJvcic7XG4gIH1cbn1cblxuLyoqIENvbW1hbmQgcmVqZWN0ZWQ6IEZTTSBndWFyZCBmYWlsZWQgKGluY2x1ZGVzIHRoZSBtYWNoaW5lLXJlYWRhYmxlIGd1YXJkIGNvZGUpLiAqL1xuZXhwb3J0IGNsYXNzIEd1YXJkRmFpbGVkRXJyb3IgZXh0ZW5kcyBFcnJvciB7XG4gIGNvbnN0cnVjdG9yKHB1YmxpYyByZWFkb25seSBndWFyZDogc3RyaW5nKSB7XG4gICAgc3VwZXIoYGd1YXJkIGZhaWxlZDogJHtndWFyZH1gKTtcbiAgICB0aGlzLm5hbWUgPSAnR3VhcmRGYWlsZWRFcnJvcic7XG4gIH1cbn1cblxuLyoqIENvbW1hbmQgcmVqZWN0ZWQ6IHN0YWxlIGZlbmNpbmcgdG9rZW4gb3Igc3RhdGVfdmVyc2lvbiBjb25mbGljdCAoSFRUUCA0MDkgc2VtYW50aWNzKS4gKi9cbmV4cG9ydCBjbGFzcyBDb25mbGljdEVycm9yIGV4dGVuZHMgRXJyb3Ige1xuICBjb25zdHJ1Y3RvcihwdWJsaWMgcmVhZG9ubHkgcmVhc29uOiBzdHJpbmcpIHtcbiAgICBzdXBlcihgY29uZmxpY3Q6ICR7cmVhc29ufWApO1xuICAgIHRoaXMubmFtZSA9ICdDb25mbGljdEVycm9yJztcbiAgfVxufVxuXG4vKiogVHJhbnNpdGlvbiBub3QgZGVjbGFyZWQgaW4gdGhlIHRhYmxlIChpbmNsdWRlcyBuZXZlci1kb3duZ3JhZGUgcmVqZWN0aW9ucykuICovXG5leHBvcnQgY2xhc3MgSW52YWxpZFRyYW5zaXRpb25FcnJvciBleHRlbmRzIEVycm9yIHtcbiAgY29uc3RydWN0b3IoXG4gICAgcHVibGljIHJlYWRvbmx5IGZyb206IFdvcmtJdGVtU3RhdGUsXG4gICAgcHVibGljIHJlYWRvbmx5IHRvOiBXb3JrSXRlbVN0YXRlLFxuICApIHtcbiAgICBzdXBlcihgaW52YWxpZCB0cmFuc2l0aW9uOiAke2Zyb219IC0+ICR7dG99YCk7XG4gICAgdGhpcy5uYW1lID0gJ0ludmFsaWRUcmFuc2l0aW9uRXJyb3InO1xuICB9XG59XG5cbi8qKiBzdG9yaWVzLnlhbWwgZmFpbGVkIGEgdmFsaWRpdHkgcnVsZSAoc3Rvcmllcy1zY2hlbWEubWQpLiAqL1xuZXhwb3J0IGNsYXNzIFN0b3JpZXNWYWxpZGF0aW9uRXJyb3IgZXh0ZW5kcyBFcnJvciB7XG4gIGNvbnN0cnVjdG9yKHB1YmxpYyByZWFkb25seSBydWxlOiBzdHJpbmcpIHtcbiAgICBzdXBlcihgc3Rvcmllcy55YW1sIGludmFsaWQ6ICR7cnVsZX1gKTtcbiAgICB0aGlzLm5hbWUgPSAnU3Rvcmllc1ZhbGlkYXRpb25FcnJvcic7XG4gIH1cbn1cblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBWb2NhYnVsYXJ5IChwcm9kdWN0LXJvYWRtYXAubWQgXHUwMEE3MC4yLCBcdTAwQTcxLjEpXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuZXhwb3J0IHR5cGUgQWN0b3JUeXBlID0gJ3VzZXInIHwgJ2FnZW50JyB8ICdzeXN0ZW0nO1xuXG5leHBvcnQgY29uc3QgV09SS19JVEVNX1NUQVRFUyA9IFtcbiAgJ2JhY2tsb2cnLFxuICAnZHJhZnQnLFxuICAncmVhZHlfZm9yX2RldicsXG4gICdpbl9wcm9ncmVzcycsXG4gICdpbl9yZXZpZXcnLFxuICAnZG9uZScsXG5dIGFzIGNvbnN0O1xuZXhwb3J0IHR5cGUgV29ya0l0ZW1TdGF0ZSA9ICh0eXBlb2YgV09SS19JVEVNX1NUQVRFUylbbnVtYmVyXTtcblxuLyoqIGJsb2NrZWQgaXMgYW4gT1ZFUkxBWSwgbm90IGEgc3RhdGUgKHJvYWRtYXAgRDgpLiBUYXhvbm9teSBmcm9tIGRldi1hdXRvIEhBTFQuICovXG5leHBvcnQgY29uc3QgQkxPQ0tFRF9SRUFTT05TID0gW1xuICAndW5jbGVhcl9pbnRlbnQnLFxuICAnbm9fc3Rvcmllc195YW1sX2ZvdW5kJyxcbiAgJ2FtYmlndW91c19zdG9yeV9maWxlX21hdGNoJyxcbiAgJ3Jldmlld19ub25fY29udmVyZ2VuY2UnLFxuICAnbm9fc3ViYWdlbnRzJyxcbiAgJ2RpcnR5X3RyZWUnLFxuICAnc3RhbGVfd29ya3RyZWUnLFxuICAnYXdhaXRpbmdfaHVtYW5faW5wdXQnLFxuICAnb3RoZXInLFxuXSBhcyBjb25zdDtcbmV4cG9ydCB0eXBlIEJsb2NrZWRSZWFzb24gPSAodHlwZW9mIEJMT0NLRURfUkVBU09OUylbbnVtYmVyXTtcblxuZXhwb3J0IHR5cGUgUGVybWlzc2lvbiA9XG4gIHwgJ3Rhc2sucGxhbidcbiAgfCAndGFzay5jbGFpbSdcbiAgfCAndGFzay5hZHZhbmNlJ1xuICB8ICd0YXNrLmJsb2NrJ1xuICB8ICdnYXRlLnNwZWMuYXBwcm92ZSdcbiAgfCAnZ2F0ZS5yZXZpZXcuYXBwcm92ZSdcbiAgfCAnZ2F0ZS5yZXZpZXcucmVqZWN0JyAvLyBQaGFzZSAyOiByZWplY3Rpb24tbG9vcGJhY2sgV0lUSE9VVCBkb25lLWFwcHJvdmFsIChyb2FkbWFwIFBoYXNlIDIgZXhpdCBjcml0ZXJpb24pXG4gIHwgJ2ZlYXR1cmUuaW5pdCdcbiAgfCAnZmVhdHVyZS5hZHZhbmNlJ1xuICB8ICdkaXNwYXRjaC5yZWxlYXNlX2hvbGQnXG4gIHwgJ2ludGVudC5lZGl0J1xuICB8ICdzdGF0ZS5kb3duZ3JhZGUnXG4gIHwgJ29wcy5mb3JjZV9yZWxlYXNlX2NsYWltJ1xuICB8ICdnb3Zlcm5hbmNlLmFkbWluJyAvLyBQaGFzZSAyOiBhdXRob3JpdHkgb3ZlciBnYXRlZCBlbnRpdGxlbWVudCB3cml0ZXMgKGhlbGQgdmlhIGdvdmVybmFuY2Ugcm9sZSwgbm90IGdyYW50cylcbiAgLy8gUGhhc2UgMyBpZGVudGl0eS92aXNpYmlsaXR5IGF1dGhvcml0aWVzIChjaGVja2VkIHN0cnVjdHVyYWxseSwgbm90IHZpYSBncmFudHMpOlxuICB8ICd0aHJlYWQucG9zdCdcbiAgfCAndGhyZWFkLnJlYWQnXG4gIHwgJ3RocmVhZC5pbnZpdGUnXG4gIHwgJ2FnZW50X2pvYi5jb21wbGV0ZSc7XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gRW50aXRsZW1lbnRzIChQaGFzZSAyLCByb2FkbWFwIFx1MDBBNzMpOiBwbGFuIFx1MDBENyBnb3Zlcm5hbmNlIHJvbGUgXHUwMEQ3IGRlbGl2ZXJ5IHJvbGUuXG4vLyBSZXNvbHV0aW9uIGlzIGEgUFVSRSBmdW5jdGlvbiBvdmVyIHRoaXMgZGF0YSBcdTIwMTQgbm8gaW50ZXJwcmV0YXRpb24gYW55d2hlcmUuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuZXhwb3J0IHR5cGUgR292ZXJuYW5jZVJvbGUgPSAnYWRtaW4nIHwgJ21lbWJlcicgfCAnYXVkaXRvcic7XG5cbmV4cG9ydCB0eXBlIFBsYW5Db2RlID0gJ2ZyZWUnIHwgJ3RlYW0nIHwgJ2VudGVycHJpc2UnO1xuXG4vKipcbiAqIFBsYW4gaXMgYSBDRUlMSU5HLCBuZXZlciBhIGdyYW50IChyb2FkbWFwIFx1MDBBNzMpLiBJdCBib3VuZHMgd2hhdCBtYXkgYmVcbiAqIGdyYW50ZWQgdG8gQUdFTlQgYWN0b3JzOyB1c2VyIGFjdG9ycyBhcmUgbmV2ZXIgcGxhbi1maWx0ZXJlZC4gRW5mb3JjZWQgaW5cbiAqIHRoZSByZXNvbHZlciBhbmQgYXQgZ3JhbnQgdGltZSBcdTIwMTQgbm93aGVyZSBlbHNlLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIFBsYW5DZWlsaW5nIHtcbiAgLyoqIG1heSBhZ2VudHMgaG9sZCBnYXRlLUFQUFJPVkFMIHBlcm1pc3Npb25zIChzcGVjL3JldmlldyBhcHByb3ZlKT8gKi9cbiAgYWdlbnRHYXRlQXBwcm92ZTogYm9vbGVhbjtcbiAgLyoqIG1heSBhZ2VudHMgaG9sZCB0aGUgcmVqZWN0aW9uLWxvb3BiYWNrIHBlcm1pc3Npb24/ICovXG4gIGFnZW50R2F0ZVJlamVjdDogYm9vbGVhbjtcbn1cblxuZXhwb3J0IGNvbnN0IFBMQU5fQ0VJTElOR1M6IFJlY29yZDxQbGFuQ29kZSwgUGxhbkNlaWxpbmc+ID0ge1xuICBmcmVlOiB7IGFnZW50R2F0ZUFwcHJvdmU6IGZhbHNlLCBhZ2VudEdhdGVSZWplY3Q6IGZhbHNlIH0sXG4gIHRlYW06IHsgYWdlbnRHYXRlQXBwcm92ZTogZmFsc2UsIGFnZW50R2F0ZVJlamVjdDogdHJ1ZSB9LFxuICBlbnRlcnByaXNlOiB7IGFnZW50R2F0ZUFwcHJvdmU6IHRydWUsIGFnZW50R2F0ZVJlamVjdDogdHJ1ZSB9LFxufTtcblxuLyoqIFNlbGYtaG9zdCBkZWZhdWx0OiB0aGUgY2VpbGluZyBpcyBvcGVuOyB0aGUgb3JnIG5hcnJvd3MgKHJlc3RyaWN0LW9ubHkpLiAqL1xuZXhwb3J0IGNvbnN0IERFRkFVTFRfUExBTjogUGxhbkNvZGUgPSAnZW50ZXJwcmlzZSc7XG5cbi8qKiBHYXRlLWFwcHJvdmFsIHBlcm1pc3Npb25zIGJvdW5kZWQgYnkgUGxhbkNlaWxpbmcuYWdlbnRHYXRlQXBwcm92ZS4gKi9cbmV4cG9ydCBjb25zdCBBR0VOVF9HQVRFX0FQUFJPVkVfUEVSTUlTU0lPTlM6IHJlYWRvbmx5IFBlcm1pc3Npb25bXSA9IFtcbiAgJ2dhdGUuc3BlYy5hcHByb3ZlJyxcbiAgJ2dhdGUucmV2aWV3LmFwcHJvdmUnLFxuXTtcblxuLyoqXG4gKiBEZWxpdmVyeSByb2xlcyAocm9hZG1hcCBcdTAwQTczKSBcdTIwMTQgcGVybWlzc2lvbiBidW5kbGVzLCB2ZXJzaW9uZWQgZGF0YSBvZiB0aGVcbiAqIFJ1bGVzIGxheWVyLiBBbiBhc3NpZ25tZW50IGdyYW50cyB0aGUgYnVuZGxlOyByZXZvY2F0aW9uIHJlbW92ZXMgaXQuXG4gKi9cbmV4cG9ydCBjb25zdCBERUxJVkVSWV9ST0xFUzogUmVjb3JkPHN0cmluZywgcmVhZG9ubHkgUGVybWlzc2lvbltdPiA9IHtcbiAgcHJvZHVjdF9vd25lcjogWyd0YXNrLnBsYW4nLCAnZmVhdHVyZS5pbml0JywgJ2ZlYXR1cmUuYWR2YW5jZScsICdnYXRlLnNwZWMuYXBwcm92ZScsICdkaXNwYXRjaC5yZWxlYXNlX2hvbGQnXSxcbiAgdGVjaF9sZWFkOiBbJ3Rhc2sucGxhbicsICdnYXRlLnJldmlldy5hcHByb3ZlJywgJ2dhdGUucmV2aWV3LnJlamVjdCcsICdzdGF0ZS5kb3duZ3JhZGUnLCAnb3BzLmZvcmNlX3JlbGVhc2VfY2xhaW0nXSxcbiAgcmV2aWV3ZXI6IFsnZ2F0ZS5yZXZpZXcuYXBwcm92ZScsICdnYXRlLnJldmlldy5yZWplY3QnXSxcbiAgZGV2ZWxvcGVyOiBbJ3Rhc2suY2xhaW0nLCAndGFzay5hZHZhbmNlJywgJ3Rhc2suYmxvY2snXSxcbiAgcWE6IFsndGFzay5ibG9jayddLFxuICBjb250cmlidXRvcjogW10sXG59O1xuXG4vKipcbiAqIFdvcmtzcGFjZSBwb2xpY3kgXHUyMDE0IFJFU1RSSUNULU9OTFkga2V5cyAocm9hZG1hcCBcdTAwQTczKTogYSBwb2xpY3kgY2FuIG5hcnJvd1xuICogd2hhdCB0aGUgcGxhbiBhbGxvd3MsIG5ldmVyIHdpZGVuIGl0LiBVbmRlZmluZWQgPSBubyByZXN0cmljdGlvbi5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBXb3Jrc3BhY2VQb2xpY3kge1xuICAvKiogZmFsc2UgXHUyMUQyIGFnZW50cyBjYW5ub3QgZXhlcmNpc2UgZ2F0ZS1hcHByb3ZhbCBwZXJtaXNzaW9ucyBldmVuIGlmIGdyYW50ZWQgKi9cbiAgYWdlbnRHYXRlQXBwcm92YWxzPzogYm9vbGVhbjtcbiAgLyoqIGZhbHNlIFx1MjFEMiBhZ2VudHMgY2Fubm90IGNsYWltIHRhc2tzIG9uIHRoZWlyIG93biAobWVudGlvbi1kaXNwYXRjaCBvbmx5LCBQaGFzZSAzKSAqL1xuICBhZ2VudFNlbGZEaXNwYXRjaD86IGJvb2xlYW47XG4gIC8qKiBmYWxzZSBcdTIxRDIgbWVudGlvbnMgb2YgYWdlbnRzIG5ldmVyIG1hdGVyaWFsaXplIGpvYnMgKFBoYXNlIDMgcm91dGVyIGtpbGwtc3dpdGNoKSAqL1xuICBtZW50aW9uRGlzcGF0Y2g/OiBib29sZWFuO1xuICAvKiogdHJ1ZSBcdTIxRDIgYW4gYWdlbnQncyBtZW50aW9uIG9mIGFub3RoZXIgYWdlbnQgbWF5IG1hdGVyaWFsaXplIGEgam9iIChkZXB0aC1jYXBwZWQpOyBkZWZhdWx0IE9GRiAoXHUwMEE3NS40KSAqL1xuICBhZ2VudE1lbnRpb25BZ2VudD86IGJvb2xlYW47XG59XG5cbi8qKiBHYXRlIGRlZmluaXRpb25zIGFyZSBkYXRhIChyb2FkbWFwIFx1MDBBNzMpOiBxdW9ydW0gKyBhY3Rvci10eXBlIHJlcXVpcmVtZW50cy4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgR2F0ZVBvbGljeSB7XG4gIC8qKiBkaXN0aW5jdCBhcHByb3ZlcnMgcmVxdWlyZWQgaW4gdGhlIGN1cnJlbnQgcmV2aWV3IHJvdW5kIChkZWZhdWx0IDEpICovXG4gIG1pbkFwcHJvdmFscz86IG51bWJlcjtcbiAgLyoqIGF0IGxlYXN0IG9uZSBhcHByb3ZlciBvZiBlYWNoIGxpc3RlZCB0eXBlIGlzIHJlcXVpcmVkIChlLmcuIFsndXNlciddKSAqL1xuICByZXF1aXJlZEFjdG9yVHlwZXM/OiBBY3RvclR5cGVbXTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBSb2xlQXNzaWdubWVudCB7XG4gIGFjdG9ySWQ6IHN0cmluZztcbiAgcm9sZUNvZGU6IHN0cmluZztcbiAgZ3JhbnRlZEJ5OiBzdHJpbmc7XG4gIHJldm9rZWQ6IGJvb2xlYW47XG59XG5cbi8qKiBhdXRoei5leHBsYWluIFx1MjAxNCB0aGUgZGVjaXNpb24gdHJhY2UgYW4gYXVkaXRvciBjYW4gcmVwbGF5IChyb2FkbWFwIFx1MDBBNzMpLiAqL1xuZXhwb3J0IGludGVyZmFjZSBBdXRoekV4cGxhbmF0aW9uIHtcbiAgYWN0b3JJZDogc3RyaW5nO1xuICBwZXJtaXNzaW9uOiBQZXJtaXNzaW9uO1xuICBhbGxvd2VkOiBib29sZWFuO1xuICAvKiogJ2RpcmVjdCcgfCAncm9sZTo8Y29kZT4nIHdoZW4gYSBncmFudCBleGlzdHM7IG51bGwgd2hlbiBub25lIGRvZXMgKi9cbiAgc291cmNlOiBzdHJpbmcgfCBudWxsO1xuICBnb3Zlcm5hbmNlUm9sZTogR292ZXJuYW5jZVJvbGU7XG4gIHBsYW46IFBsYW5Db2RlO1xuICAvKiogZmFsc2Ugd2hlbiB0aGUgcGxhbiBjZWlsaW5nIGJsb2NrcyBhbiBhZ2VudCdzIGdhdGUgcGVybWlzc2lvbiAqL1xuICBwbGFuQWxsb3dzOiBib29sZWFuO1xuICAvKiogZmFsc2Ugd2hlbiB0aGUgcmVzdHJpY3Qtb25seSB3b3Jrc3BhY2UgcG9saWN5IGJsb2NrcyBpdCAqL1xuICBwb2xpY3lBbGxvd3M6IGJvb2xlYW47XG4gIHZlcnNpb25zOiB7IHBsYW46IG51bWJlcjsgcG9saWN5OiBudW1iZXIgfTtcbn1cblxuZXhwb3J0IHR5cGUgR2F0ZUNvZGUgPSAnc3BlY19hcHByb3ZhbCcgfCAncmV2aWV3X2FwcHJvdmFsJztcblxuZXhwb3J0IHR5cGUgRXZpZGVuY2VLaW5kID1cbiAgfCAndGVzdF9ydW4nIC8vIHtjb21tYW5kLCBleGl0Q29kZX0gIFx1MjAxNCBjb21tYW5kIE1VU1QgbWF0Y2ggYSBwaW5uZWQgb25lXG4gIHwgJ2dpdF9kaWZmJyAvLyB7YmFzZWxpbmUsIGZpbmFsLCBmaWxlc0NoYW5nZWQsIG5vbkVtcHR5LCBicmFuY2h9XG4gIHwgJ2NvbW1pdCcgLy8ge3NoYSwgYnJhbmNoLCByZWFjaGFibGVPblJlbW90ZX1cbiAgfCAnaGFsdF9yZXBvcnQnIC8vIHZlcmJhdGltIEF1dG8gUnVuIFJlc3VsdFxuICB8ICdyZXZpZXdfcmVwb3J0JyAvLyBMTE0tYXV0aG9yZWQ7IE5FVkVSIGEgZ3VhcmQsIGNvbnRleHQgb25seVxuICB8ICdkb2NfbGludCc7IC8vIHtzY2hlbWFWYWxpZH0gZm9yIG5vbi1jb2RlIHdvcmtcblxuZXhwb3J0IGludGVyZmFjZSBFdmlkZW5jZSB7XG4gIGtpbmQ6IEV2aWRlbmNlS2luZDtcbiAgcGF5bG9hZDogUmVjb3JkPHN0cmluZywgdW5rbm93bj47XG59XG5cbi8qKiBSZXZpZXcgbG9vcDogZXhhY3RseSB0aGlzIG1hbnkgbG9vcGJhY2tzIGFsbG93ZWQ7IHRoZSBuZXh0IG9uZSBibG9ja3MuICovXG5leHBvcnQgY29uc3QgUkVWSUVXX0xPT1BfTElNSVQgPSA1O1xuXG5leHBvcnQgY29uc3QgSU5URU5UX0hBU0hfQUxHTyA9ICd2MSc7XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gRW50aXRpZXMgKHByb2plY3Rpb24gc2hhcGVzIHJldHVybmVkIGJ5IHF1ZXJpZXMpXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuZXhwb3J0IGludGVyZmFjZSBBY3RvciB7XG4gIGlkOiBzdHJpbmc7XG4gIHR5cGU6IEFjdG9yVHlwZTtcbiAgZGlzcGxheU5hbWU6IHN0cmluZztcbiAgLyoqIFBsYXlib29rIHBlcnNvbmEgdGhpcyBhZ2VudCBlbWJvZGllcyAoZS5nLiAnYm1hZC1hZ2VudC1wbScpOyBudWxsIGZvciBodW1hbnMgYW5kIHBsYWluIGFnZW50cy4gKi9cbiAgcGVyc29uYUNvZGU6IHN0cmluZyB8IG51bGw7XG59XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gV29yay1pdGVtIGtpbmRzIChQaGFzZSA0LCByb2FkbWFwIEJ1aWxkIHBoYXNlcyk6IHRoZSB3b3JrZXIgYnJvYWRlbnMuXG4vLyBLaW5kIHNlbGVjdHMgV0hJQ0ggbWFjaGluZS1ldmlkZW5jZSBndWFyZHMgYXBwbHkgXHUyMDE0IG5ldmVyIFdITyBtYXkgcGFzcyBhXG4vLyBnYXRlICh0aGF0IHN0YXlzIGdyYW50cyArIGdhdGUgcG9saWN5KS5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5leHBvcnQgY29uc3QgV09SS19JVEVNX0tJTkRTID0gWydjb2RlJywgJ3NwZWNfZHJhZnQnLCAnZGVzaWduX3JldmlldycsICdxYV9yZXBvcnQnLCAnZG9jJ10gYXMgY29uc3Q7XG5leHBvcnQgdHlwZSBXb3JrSXRlbUtpbmQgPSAodHlwZW9mIFdPUktfSVRFTV9LSU5EUylbbnVtYmVyXTtcblxuLyoqXG4gKiBUaGUgc2l4IEJNQUQgcGVyc29uYXMgcHJvdmlzaW9uIGFzIGRlZmF1bHQgYWdlbnQgYWN0b3JzIHBlciB3b3Jrc3BhY2VcbiAqIChyb2FkbWFwIFx1MDBBNzMpLiBGbG9vci1zdGF0ZSBkZWZhdWx0cyAodGhlc2lzKTogQW1lbGlhIGhvbGRzIGBkZXZlbG9wZXJgO1xuICogZXZlcnlvbmUgZWxzZSBgY29udHJpYnV0b3JgOyBOTyBwZXJzb25hIGhvbGRzIGEgZ2F0ZSB1bnRpbCBhIHBlcm1pdHRlZFxuICogYWN0b3IgZ3JhbnRzIG9uZS5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBQZXJzb25hRGVmIHtcbiAgcGVyc29uYUNvZGU6IHN0cmluZzsgLy8gQk1BRCBwbGF5Ym9vayBza2lsbFxuICBkaXNwbGF5TmFtZTogc3RyaW5nO1xuICBkZWZhdWx0Um9sZToga2V5b2YgdHlwZW9mIERFTElWRVJZX1JPTEVTO1xufVxuXG5leHBvcnQgY29uc3QgUEVSU09OQVM6IHJlYWRvbmx5IFBlcnNvbmFEZWZbXSA9IFtcbiAgeyBwZXJzb25hQ29kZTogJ2JtYWQtYWdlbnQtYW5hbHlzdCcsIGRpc3BsYXlOYW1lOiAnTWFyeSAoQW5hbHlzdCknLCBkZWZhdWx0Um9sZTogJ2NvbnRyaWJ1dG9yJyB9LFxuICB7IHBlcnNvbmFDb2RlOiAnYm1hZC1hZ2VudC10ZWNoLXdyaXRlcicsIGRpc3BsYXlOYW1lOiAnUGFpZ2UgKFRlY2ggV3JpdGVyKScsIGRlZmF1bHRSb2xlOiAnY29udHJpYnV0b3InIH0sXG4gIHsgcGVyc29uYUNvZGU6ICdibWFkLWFnZW50LXBtJywgZGlzcGxheU5hbWU6ICdKb2huIChQTSknLCBkZWZhdWx0Um9sZTogJ2NvbnRyaWJ1dG9yJyB9LFxuICB7IHBlcnNvbmFDb2RlOiAnYm1hZC1hZ2VudC11eC1kZXNpZ25lcicsIGRpc3BsYXlOYW1lOiAnU2FsbHkgKFVYKScsIGRlZmF1bHRSb2xlOiAnY29udHJpYnV0b3InIH0sXG4gIHsgcGVyc29uYUNvZGU6ICdibWFkLWFnZW50LWFyY2hpdGVjdCcsIGRpc3BsYXlOYW1lOiAnV2luc3RvbiAoQXJjaGl0ZWN0KScsIGRlZmF1bHRSb2xlOiAnY29udHJpYnV0b3InIH0sXG4gIHsgcGVyc29uYUNvZGU6ICdibWFkLWFnZW50LWRldicsIGRpc3BsYXlOYW1lOiAnQW1lbGlhIChEZXYpJywgZGVmYXVsdFJvbGU6ICdkZXZlbG9wZXInIH0sXG5dO1xuXG5leHBvcnQgaW50ZXJmYWNlIEZlYXR1cmUge1xuICBpZDogc3RyaW5nO1xuICBzdGF0ZTogJ2JhY2tsb2cnIHwgJ2luX3Byb2dyZXNzJyB8ICdkb25lJztcbiAgLyoqIHRydWUgd2hpbGUgYSBkb25lX2NoZWNrcG9pbnQgaG9sZCBpcyBhY3RpdmU6IG5vIGZ1cnRoZXIgZGlzcGF0Y2ggaW4gdGhpcyBmZWF0dXJlICovXG4gIGRpc3BhdGNoSG9sZDogYm9vbGVhbjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBXb3JrSXRlbSB7XG4gIGlkOiBzdHJpbmc7XG4gIGZlYXR1cmVJZDogc3RyaW5nO1xuICBleHRlcm5hbEtleTogc3RyaW5nOyAvLyBpZCBmcm9tIHN0b3JpZXMueWFtbCwgZS5nLiBcIjMtMlwiXG4gIGtpbmQ6IFdvcmtJdGVtS2luZDsgLy8gJ2NvZGUnIHVubGVzcyBjcmVhdGVkIG90aGVyd2lzZSBcdTIwMTQgc2VsZWN0cyBldmlkZW5jZSBndWFyZHMgKFBoYXNlIDQpXG4gIHRpdGxlOiBzdHJpbmc7XG4gIHN0YXRlOiBXb3JrSXRlbVN0YXRlO1xuICBibG9ja2VkUmVhc29uOiBCbG9ja2VkUmVhc29uIHwgbnVsbDtcbiAgcmV2aWV3TG9vcEl0ZXJhdGlvbjogbnVtYmVyO1xuICBpbnRlbnRIYXNoOiBzdHJpbmcgfCBudWxsO1xuICBwaW5uZWRWZXJpZmljYXRpb246IHN0cmluZ1tdIHwgbnVsbDtcbiAgc3BlY0NoZWNrcG9pbnQ6IGJvb2xlYW47XG4gIGRvbmVDaGVja3BvaW50OiBib29sZWFuO1xuICBpbnZva2VEZXZXaXRoOiBzdHJpbmc7XG4gIHNwZWNQYXRoOiBzdHJpbmc7XG4gIHN0YXRlVmVyc2lvbjogbnVtYmVyO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIENsYWltIHtcbiAgaWQ6IHN0cmluZztcbiAgd29ya0l0ZW1JZDogc3RyaW5nO1xuICBhY3RvcklkOiBzdHJpbmc7XG4gIGZlbmNpbmdUb2tlbjogbnVtYmVyO1xuICBsZWFzZUV4cGlyZXNBdDogbnVtYmVyOyAvLyBlbmdpbmUtY2xvY2sgbXNcbiAgcmVsZWFzZWQ6IGJvb2xlYW47XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgU3BpbmVFdmVudCB7XG4gIGdsb2JhbFNlcTogbnVtYmVyO1xuICBzdHJlYW1UeXBlOiAnd29ya3NwYWNlJyB8ICdmZWF0dXJlJyB8ICd3b3JrX2l0ZW0nIHwgJ2FjdG9yJyB8ICd0aHJlYWQnIHwgJ2FnZW50X2pvYic7XG4gIHN0cmVhbUlkOiBzdHJpbmc7XG4gIHN0cmVhbVNlcTogbnVtYmVyO1xuICB0eXBlOiBzdHJpbmc7XG4gIGFjdG9ySWQ6IHN0cmluZztcbiAgcGF5bG9hZDogUmVjb3JkPHN0cmluZywgdW5rbm93bj47XG4gIGNhdXNhdGlvbklkPzogc3RyaW5nO1xufVxuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIENvbGxhYm9yYXRpb24gKFBoYXNlIDMsIHJvYWRtYXAgXHUwMEE3NSk6IHRoZSBjaGF0IFNVUkZBQ0UuIFNhY3JlZCBib3VuZGFyeVxuLy8gKFx1MDBBNzUuMik6IGEgbWVzc2FnZSBORVZFUiBtdXRhdGVzIGxpZmVjeWNsZTsgdGhlIG9ubHkgY3Jvc3MtZGlyZWN0aW9uIGlzXG4vLyByYWlscyBcdTIxOTIgY2hhdCAoc3lzdGVtIG5hcnJhdGlvbikuIE1lbnRpb25zIGFyZSBTVFJVQ1RVUkVEIGRhdGEgXHUyMDE0IHRoZSBzZXJ2ZXJcbi8vIG5ldmVyIHBhcnNlcyBtZXNzYWdlIHRleHQuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuZXhwb3J0IHR5cGUgVGhyZWFkS2luZCA9ICdzcGVjJyB8ICdkZXNpZ24nIHwgJ3Rhc2snIHwgJ2dlbmVyYWwnIHwgJ3ByaXZhdGUnO1xuZXhwb3J0IHR5cGUgVGhyZWFkVmlzaWJpbGl0eSA9ICdvcGVuJyB8ICdwcml2YXRlJztcblxuZXhwb3J0IGludGVyZmFjZSBUaHJlYWQge1xuICBpZDogc3RyaW5nO1xuICBmZWF0dXJlSWQ6IHN0cmluZyB8IG51bGw7XG4gIHdvcmtJdGVtSWQ6IHN0cmluZyB8IG51bGw7XG4gIGtpbmQ6IFRocmVhZEtpbmQ7XG4gIHZpc2liaWxpdHk6IFRocmVhZFZpc2liaWxpdHk7XG4gIGNyZWF0ZWRCeTogc3RyaW5nO1xuICBwYXJ0aWNpcGFudHM6IHN0cmluZ1tdOyAvLyBlbmZvcmNlZCBmb3IgcHJpdmF0ZSB0aHJlYWRzOyBpbmZvcm1hdGlvbmFsIGZvciBvcGVuIG9uZXNcbn1cblxuZXhwb3J0IGludGVyZmFjZSBNZXNzYWdlIHtcbiAgaWQ6IHN0cmluZztcbiAgdGhyZWFkSWQ6IHN0cmluZztcbiAgc2VxOiBudW1iZXI7IC8vIHBlci10aHJlYWQsIDEtYmFzZWQsIGdhcC1mcmVlXG4gIGF1dGhvcklkOiBzdHJpbmc7IC8vIGEgdXNlciBPUiBhbiBhZ2VudCAodGhlc2lzIFx1MDBBNzUuMykgXHUyMDE0IG9yIHRoZSBzeXN0ZW0gYWN0b3IgZm9yIG5hcnJhdGlvblxuICBraW5kOiAnY2hhdCcgfCAnc3lzdGVtJztcbiAgYm9keTogc3RyaW5nO1xuICByZXBseVRvOiBzdHJpbmcgfCBudWxsO1xufVxuXG4vKiogV2h5IGEgbWVudGlvbiBkaWQgb3IgZGlkIG5vdCBtYXRlcmlhbGl6ZSBhbiBhZ2VudCBqb2IgKFx1MDBBNzUuNCByb3V0ZXIgXHUyMDE0IHB1cmUgY29kZSkuICovXG5leHBvcnQgdHlwZSBNZW50aW9uUmVzb2x1dGlvbiA9XG4gIHwgJ25vdGlmaWVkJyAvLyBodW1hbiBtZW50aW9uZWQgXHUyMTkyIG5vdGlmaWNhdGlvbiBvbmx5XG4gIHwgJ2pvYl9jcmVhdGVkJyAvLyBhZ2VudCBtZW50aW9uZWQsIHJvdXRlciBwb2xpY3kgYWxsb3dzIFx1MjE5MiBhZ2VudF9qb2IgcXVldWVkXG4gIHwgJ2RlbmllZF9wb2xpY3knIC8vIGRlZmF1bHQtZGVueTogbWVudGlvbmVyIGxhY2tzIGludm9rZSBhdXRob3JpdHksIG9yIHBvbGljeSBvZmZcbiAgfCAnZGVuaWVkX2RlcHRoJzsgLy8gYWdlbnQtbWVudGlvbi1hZ2VudCBjaGFpbiBleGNlZWRlZCB0aGUgZGVwdGggY2FwXG5cbmV4cG9ydCBpbnRlcmZhY2UgTWVudGlvbiB7XG4gIG1lc3NhZ2VJZDogc3RyaW5nO1xuICBtZW50aW9uZWRBY3RvcklkOiBzdHJpbmc7XG4gIHJlc29sdXRpb246IE1lbnRpb25SZXNvbHV0aW9uO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIE5vdGlmaWNhdGlvbiB7XG4gIGlkOiBzdHJpbmc7XG4gIGFjdG9ySWQ6IHN0cmluZztcbiAgc291cmNlOiAnbWVudGlvbicgfCAnam9iX2NvbXBsZXRlZCc7XG4gIHJlZklkOiBzdHJpbmc7IC8vIG1lc3NhZ2VJZCBmb3IgbWVudGlvbnMsIGpvYklkIGZvciBjb21wbGV0aW9uc1xuICByZWFkOiBib29sZWFuO1xufVxuXG4vKipcbiAqIFJvdXRlci1tYXRlcmlhbGl6ZWQgd29yayBmb3IgYW4gYWdlbnQgKFx1MDBBNzUuNCkuIFJlcGx5LW9ubHkgY29udGV4dDogdGhlIGpvYlxuICogTkVWRVIgY2FycmllcyBhIGNsYWltIG9yIHByZS1hdXRob3JpemVkIGxpZmVjeWNsZSBhdXRob3JpdHkgXHUyMDE0IHRoZSBhZ2VudFxuICogbXV0YXRlcyBzdGF0ZSBvbmx5IHRocm91Z2ggaXRzIG93biBncmFudHMsIG9yIG5vdCBhdCBhbGwuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQWdlbnRKb2Ige1xuICBpZDogc3RyaW5nO1xuICBhZ2VudEFjdG9ySWQ6IHN0cmluZztcbiAgdGhyZWFkSWQ6IHN0cmluZztcbiAgbWVzc2FnZUlkOiBzdHJpbmc7IC8vIHRoZSB0cmlnZ2VyaW5nIG1lbnRpb25cbiAgd29ya0l0ZW1JZDogc3RyaW5nIHwgbnVsbDsgLy8gY29udGV4dCB3aGVuIHRoZSB0aHJlYWQgaXMgdGFzay1ib3VuZFxuICBmZWF0dXJlSWQ6IHN0cmluZyB8IG51bGw7XG4gIHN0YXR1czogJ3F1ZXVlZCcgfCAnZG9uZScgfCAnYmxvY2tlZCc7XG4gIGRlcHRoOiBudW1iZXI7IC8vIDAgPSBodW1hbi10cmlnZ2VyZWQ7ICsxIHBlciBhZ2VudC1tZW50aW9uLWFnZW50IGhvcFxuICBub3RlOiBzdHJpbmcgfCBudWxsO1xufVxuXG4vKiogRGVwdGggY2FwIGZvciBhZ2VudC1tZW50aW9uLWFnZW50IGNoYWlucyAoXHUwMEE3NS40OiBcImRlcHRoIGNvdW50ZXJcIikuICovXG5leHBvcnQgY29uc3QgQUdFTlRfSk9CX01BWF9ERVBUSCA9IDI7XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gQWdlbnQgbWVtb3J5IChQaGFzZSA1LCByb2FkbWFwIFx1MDBBNzYpOiB0aGUgd29ya2VyIERFRVBFTlMuIE1lbW9yeSBtYWtlcyB0aGVcbi8vIHdvcmtlciBiZXR0ZXIsIG5ldmVyIG1vcmUgYXV0aG9yaXplZCBcdTIwMTQgYXV0aG9yaXR5IGNvbWVzIG9ubHkgZnJvbSBncmFudHMsXG4vLyBhbmQgdGhlIG1lbW9yeSBBUEkgaGFzIG5vIHBhdGggdG8gdGhlbS4gRW5mb3JjZWQgYnkgYXJjaGl0ZWN0dXJlOiBvd25lci1cbi8vIHNjb3BlZCByZWFkcywgbm8gY3Jvc3MtYWN0b3IgcGFyYW1ldGVyLCBjb250ZW50IG5ldmVyIGVudGVycyB0aGUgc2hhcmVkXG4vLyBldmVudCBsb2cuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuZXhwb3J0IHR5cGUgTWVtb3J5S2luZCA9ICdlcGlzb2RpYycgfCAncHJvY2VkdXJhbCcgfCAnZW50aXR5JztcblxuZXhwb3J0IGludGVyZmFjZSBBZ2VudE1lbW9yeSB7XG4gIGlkOiBzdHJpbmc7XG4gIGFnZW50QWN0b3JJZDogc3RyaW5nO1xuICBraW5kOiBNZW1vcnlLaW5kO1xuICBjb250ZW50OiBzdHJpbmc7XG4gIC8qKiBUaHJlYWQgdGhlIG1lbW9yeSB3YXMgbGVhcm5lZCBpbiwgd2hlbiBhcHBsaWNhYmxlLiAqL1xuICBzb3VyY2VUaHJlYWRJZDogc3RyaW5nIHwgbnVsbDtcbiAgLyoqIFZpc2liaWxpdHkgb2YgdGhlIHNvdXJjZSBjb250ZXh0IGF0IGxlYXJuIHRpbWUgXHUyMDE0IHJlY2FsbCBmaWx0ZXJzIG9uIGl0IChcdTAwQTc2KS4gKi9cbiAgc291cmNlVmlzaWJpbGl0eTogVGhyZWFkVmlzaWJpbGl0eSB8IG51bGw7XG4gIC8qKiBQZXItYWdlbnQsIDEtYmFzZWQsIGFwcGVuZCBvcmRlci4gKi9cbiAgc2VxOiBudW1iZXI7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgRGl2ZXJnZW5jZVJlcG9ydCB7XG4gIHdvcmtJdGVtSWQ6IHN0cmluZztcbiAgZmlsZVN0YXRlOiBzdHJpbmc7XG4gIGRiU3RhdGU6IFdvcmtJdGVtU3RhdGU7XG4gIGtpbmQ6ICdmaWxlX2FoZWFkJyB8ICdkYl9haGVhZCcgfCAnY29uZmxpY3QnO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFN0b3JpZXNJbXBvcnRSZXN1bHQge1xuICBpbXBvcnRlZDogc3RyaW5nW107IC8vIGV4dGVybmFsS2V5cyBjcmVhdGVkXG4gIHVwZGF0ZWQ6IHN0cmluZ1tdOyAvLyBleHRlcm5hbEtleXMgYWxyZWFkeSBwcmVzZW50LCByZWZyZXNoZWRcbiAgd2FybmluZ3M6IHN0cmluZ1tdOyAvLyBlLmcuIHNraXBwZWQgcmV0cm9zcGVjdGl2ZSBlbnRyaWVzXG59XG5cblxuLy8gVGhlIHByb2R1Y3Rpb24gc2VydmljZSB3cmFwcyB0aGUgc2FtZSBjb3JlIHdpdGggUG9zdGdyZXMgcGVyc2lzdGVuY2UuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuZXhwb3J0IGludGVyZmFjZSBDcmVhdGVXb3JrSXRlbUlucHV0IHtcbiAgZmVhdHVyZUlkOiBzdHJpbmc7XG4gIGV4dGVybmFsS2V5OiBzdHJpbmc7XG4gIHRpdGxlOiBzdHJpbmc7XG4gIGtpbmQ/OiBXb3JrSXRlbUtpbmQ7IC8vIGRlZmF1bHQgJ2NvZGUnXG4gIHNwZWNDaGVja3BvaW50PzogYm9vbGVhbjtcbiAgZG9uZUNoZWNrcG9pbnQ/OiBib29sZWFuO1xuICBpbnZva2VEZXZXaXRoPzogc3RyaW5nO1xuICBkZXBlbmRzT24/OiBzdHJpbmdbXTsgLy8gZXh0ZXJuYWxLZXlzXG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQWR2YW5jZUlucHV0IHtcbiAgd29ya0l0ZW1JZDogc3RyaW5nO1xuICB0bzogV29ya0l0ZW1TdGF0ZTtcbiAgYWN0b3JJZDogc3RyaW5nO1xuICBmZW5jaW5nVG9rZW4/OiBudW1iZXI7IC8vIHJlcXVpcmVkIGZvciBjbGFpbS1ndWFyZGVkIHRyYW5zaXRpb25zXG4gIGlkZW1wb3RlbmN5S2V5Pzogc3RyaW5nO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEdhdGVEZWNpc2lvbklucHV0IHtcbiAgd29ya0l0ZW1JZDogc3RyaW5nO1xuICBnYXRlOiBHYXRlQ29kZTtcbiAgYWN0b3JJZDogc3RyaW5nO1xuICAvKiogc3BlY19hcHByb3ZhbCBvbmx5OiBwaW5zIHZlcmlmaWNhdGlvbiBjb21tYW5kcyBhcyBSdWxlcy1sYXllciBkYXRhIChyb2FkbWFwIEQ3KSAqL1xuICBwaW5uZWRWZXJpZmljYXRpb24/OiBzdHJpbmdbXTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBTcGluZUVuZ2luZSB7XG4gIC8vIC0tIHNldHVwIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICBjcmVhdGVBY3RvcihpbnB1dDoge1xuICAgIHR5cGU6IEV4Y2x1ZGU8QWN0b3JUeXBlLCAnc3lzdGVtJz47XG4gICAgZGlzcGxheU5hbWU6IHN0cmluZztcbiAgICAvKiogYm9vdHN0cmFwIHBsdW1iaW5nIChsaWtlIGNyZWF0ZUFjdG9yIGl0c2VsZik7IGRlZmF1bHQgJ21lbWJlcicgKi9cbiAgICBnb3Zlcm5hbmNlUm9sZT86IEdvdmVybmFuY2VSb2xlO1xuICAgIHBlcnNvbmFDb2RlPzogc3RyaW5nO1xuICB9KTogQWN0b3I7XG4gIC8qKiBBbGwgYWN0b3JzLCBwZXJzb25hcyBhbmQgc3lzdGVtIGluY2x1ZGVkICh0cmFuc3BhcmVuY3kgZm9yIHBpY2tlcnMvYXVkaXQpLiAqL1xuICBsaXN0QWN0b3JzKCk6IEFjdG9yW107XG4gIC8qKiBJZGVtcG90ZW50bHkgY3JlYXRlIHRoZSBzaXggQk1BRCBwZXJzb25hIGFnZW50IGFjdG9ycyB3aXRoIGZsb29yLXN0YXRlIHJvbGVzIChnYXRlZCB3cml0ZSkuICovXG4gIHByb3Zpc2lvblBlcnNvbmFzKGlucHV0OiB7IGJ5QWN0b3JJZDogc3RyaW5nIH0pOiBBY3RvcltdO1xuICBncmFudChpbnB1dDogeyBhY3RvcklkOiBzdHJpbmc7IHBlcm1pc3Npb246IFBlcm1pc3Npb247IHNjb3BlPzogc3RyaW5nIH0pOiB2b2lkO1xuICByZXZva2UoaW5wdXQ6IHsgYWN0b3JJZDogc3RyaW5nOyBwZXJtaXNzaW9uOiBQZXJtaXNzaW9uOyBzY29wZT86IHN0cmluZyB9KTogdm9pZDtcbiAgY3JlYXRlRmVhdHVyZShpbnB1dDogeyBhY3RvcklkOiBzdHJpbmcgfSk6IEZlYXR1cmU7XG4gIGNyZWF0ZVdvcmtJdGVtKGlucHV0OiBDcmVhdGVXb3JrSXRlbUlucHV0ICYgeyBhY3RvcklkOiBzdHJpbmcgfSk6IFdvcmtJdGVtO1xuXG4gIC8qKiBJbXBvcnQgc3Rvcmllcy55YW1sIGNvbnRlbnQgKHJhdyBZQU1MIHN0cmluZykuIElkZW1wb3RlbnQgcmUtaW1wb3J0IHBlciBzdG9yaWVzLXNjaGVtYSB1cGRhdGUgc2VtYW50aWNzLiAqL1xuICBpbXBvcnRTdG9yaWVzKGlucHV0OiB7IGZlYXR1cmVJZDogc3RyaW5nOyB5YW1sOiBzdHJpbmc7IGFjdG9ySWQ6IHN0cmluZyB9KTogU3Rvcmllc0ltcG9ydFJlc3VsdDtcblxuICAvLyAtLSBjbGFpbXMgKHJvYWRtYXAgXHUwMEE3MS4zKSAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIGNsYWltVGFzayhpbnB1dDogeyB3b3JrSXRlbUlkOiBzdHJpbmc7IGFjdG9ySWQ6IHN0cmluZzsgdHRsTXM/OiBudW1iZXIgfSk6IENsYWltO1xuICBoZWFydGJlYXQoaW5wdXQ6IHsgY2xhaW1JZDogc3RyaW5nIH0pOiB2b2lkO1xuICByZWxlYXNlQ2xhaW0oaW5wdXQ6IHsgY2xhaW1JZDogc3RyaW5nOyByZWFzb24/OiBzdHJpbmcgfSk6IHZvaWQ7XG4gIC8qKiB0ZXN0IGNsb2NrIFx1MjAxNCBsZWFzZSBleHBpcnkgaXMgdGltZS1iYXNlZCAqL1xuICBhZHZhbmNlQ2xvY2sobXM6IG51bWJlcik6IHZvaWQ7XG5cbiAgLy8gLS0gbGlmZWN5Y2xlIChyb2FkbWFwIFx1MDBBNzEuMikgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICBhZHZhbmNlU3RhdGUoaW5wdXQ6IEFkdmFuY2VJbnB1dCk6IFdvcmtJdGVtO1xuICBibG9ja1Rhc2soaW5wdXQ6IHsgd29ya0l0ZW1JZDogc3RyaW5nOyByZWFzb246IEJsb2NrZWRSZWFzb247IGFjdG9ySWQ6IHN0cmluZzsgZmVuY2luZ1Rva2VuPzogbnVtYmVyIH0pOiBXb3JrSXRlbTtcbiAgdW5ibG9ja1Rhc2soaW5wdXQ6IHsgd29ya0l0ZW1JZDogc3RyaW5nOyBhY3RvcklkOiBzdHJpbmcgfSk6IFdvcmtJdGVtO1xuXG4gIC8vIC0tIGdhdGVzICYgZXZpZGVuY2UgKHJvYWRtYXAgXHUwMEE3MS40KSAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHN1Ym1pdEV2aWRlbmNlKGlucHV0OiB7IHdvcmtJdGVtSWQ6IHN0cmluZzsgZXZpZGVuY2U6IEV2aWRlbmNlOyBhY3RvcklkOiBzdHJpbmc7IGZlbmNpbmdUb2tlbj86IG51bWJlciB9KTogdm9pZDtcbiAgYXBwcm92ZUdhdGUoaW5wdXQ6IEdhdGVEZWNpc2lvbklucHV0KTogV29ya0l0ZW07XG4gIC8qKiBSZWplY3Rpb24gZmlyZXMgdGhlIGxvb3BiYWNrIGFzIGEgc3lzdGVtIGVmZmVjdCBcdTIwMTQgbm8gY2xhaW0gaG9sZGVyIGludm9sdmVtZW50IChyb2FkbWFwIFx1MDBBNzEuMikuICovXG4gIHJlamVjdEdhdGUoaW5wdXQ6IEdhdGVEZWNpc2lvbklucHV0KTogV29ya0l0ZW07XG5cbiAgLy8gLS0gZGlzcGF0Y2ggKHJvYWRtYXAgXHUwMEE3Mi4zKSAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIC8qKiBSZWZ1c2VzIHN0YXRlPWRvbmUgaXRlbXM7IHJldHVybnMgZW50cnktc3RhdGUgY29udGV4dCBmb3IgdGhlIHJ1bm5lci4gKi9cbiAgZ2V0VGFza0NvbnRleHQoaW5wdXQ6IHsgd29ya0l0ZW1JZDogc3RyaW5nIH0pOiB7XG4gICAgd29ya0l0ZW06IFdvcmtJdGVtO1xuICAgIGVudHJ5U3RhdGU6IFdvcmtJdGVtU3RhdGU7XG4gIH07XG4gIC8qKiBSZWxlYXNlcyBhIGRvbmVfY2hlY2twb2ludCBkaXNwYXRjaCBob2xkIG9uIHRoZSBmZWF0dXJlLiAqL1xuICByZWxlYXNlRGlzcGF0Y2hIb2xkKGlucHV0OiB7IGZlYXR1cmVJZDogc3RyaW5nOyBhY3RvcklkOiBzdHJpbmcgfSk6IEZlYXR1cmU7XG5cbiAgLy8gLS0gcmVjb25jaWxpYXRpb24gKHJvYWRtYXAgXHUwMEE3MS42LCBkZXRlY3Qtb25seSkgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICByZWNvbmNpbGUoaW5wdXQ6IHsgZmlsZXM6IEFycmF5PHsgd29ya0l0ZW1JZDogc3RyaW5nOyBmcm9udG1hdHRlclN0YXR1czogc3RyaW5nIH0+IH0pOiBEaXZlcmdlbmNlUmVwb3J0W107XG5cbiAgLy8gLS0gZW50aXRsZW1lbnRzIChQaGFzZSAyLCByb2FkbWFwIFx1MDBBNzMpIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAvKiogR292ZXJuYW5jZSBhdXRob3JpdHk6IHRoZSBzeXN0ZW0gYWN0b3IgYW5kICdhZG1pbicgZ292ZXJuYW5jZS1yb2xlIGhvbGRlcnMuICovXG4gIHNldEdvdmVybmFuY2VSb2xlKGlucHV0OiB7IGFjdG9ySWQ6IHN0cmluZzsgcm9sZTogR292ZXJuYW5jZVJvbGU7IGJ5QWN0b3JJZDogc3RyaW5nIH0pOiB2b2lkO1xuICBnZXRHb3Zlcm5hbmNlUm9sZShhY3RvcklkOiBzdHJpbmcpOiBHb3Zlcm5hbmNlUm9sZTtcbiAgLyoqIEFzc2lnbi9yZXZva2UgYSBkZWxpdmVyeSByb2xlIChidW5kbGUgb2YgcGVybWlzc2lvbnMpLiBHYXRlZCB3cml0ZXM7IGF1ZGl0ZWQuICovXG4gIGFzc2lnblJvbGUoaW5wdXQ6IHsgYWN0b3JJZDogc3RyaW5nOyByb2xlQ29kZTogc3RyaW5nOyBieUFjdG9ySWQ6IHN0cmluZyB9KTogdm9pZDtcbiAgcmV2b2tlUm9sZShpbnB1dDogeyBhY3RvcklkOiBzdHJpbmc7IHJvbGVDb2RlOiBzdHJpbmc7IGJ5QWN0b3JJZDogc3RyaW5nIH0pOiB2b2lkO1xuICBsaXN0Um9sZUFzc2lnbm1lbnRzKGFjdG9ySWQ/OiBzdHJpbmcpOiBSb2xlQXNzaWdubWVudFtdO1xuICBzZXRQbGFuKGlucHV0OiB7IHBsYW46IFBsYW5Db2RlOyBieUFjdG9ySWQ6IHN0cmluZyB9KTogdm9pZDtcbiAgZ2V0UGxhbigpOiBQbGFuQ29kZTtcbiAgc2V0V29ya3NwYWNlUG9saWN5KGlucHV0OiB7IHBvbGljeTogV29ya3NwYWNlUG9saWN5OyBieUFjdG9ySWQ6IHN0cmluZyB9KTogdm9pZDtcbiAgZ2V0V29ya3NwYWNlUG9saWN5KCk6IFdvcmtzcGFjZVBvbGljeTtcbiAgc2V0R2F0ZVBvbGljeShpbnB1dDogeyBnYXRlOiBHYXRlQ29kZTsgcG9saWN5OiBHYXRlUG9saWN5OyBieUFjdG9ySWQ6IHN0cmluZyB9KTogdm9pZDtcbiAgZ2V0R2F0ZVBvbGljeShnYXRlOiBHYXRlQ29kZSk6IEdhdGVQb2xpY3k7XG4gIC8qKiBQdXJlIGRlY2lzaW9uIHRyYWNlIFx1MjAxNCByZXBsYXlhYmxlIGJ5IGFuIGF1ZGl0b3IuIE5ldmVyIG11dGF0ZXMuICovXG4gIGF1dGh6RXhwbGFpbihpbnB1dDogeyBhY3RvcklkOiBzdHJpbmc7IHBlcm1pc3Npb246IFBlcm1pc3Npb24gfSk6IEF1dGh6RXhwbGFuYXRpb247XG5cbiAgLy8gLS0gY29sbGFib3JhdGlvbiAoUGhhc2UgMywgcm9hZG1hcCBcdTAwQTc1KSAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIGNyZWF0ZVRocmVhZChpbnB1dDoge1xuICAgIGFjdG9ySWQ6IHN0cmluZztcbiAgICBraW5kOiBUaHJlYWRLaW5kO1xuICAgIGZlYXR1cmVJZD86IHN0cmluZztcbiAgICB3b3JrSXRlbUlkPzogc3RyaW5nO1xuICAgIHZpc2liaWxpdHk/OiBUaHJlYWRWaXNpYmlsaXR5O1xuICB9KTogVGhyZWFkO1xuICBhZGRUaHJlYWRQYXJ0aWNpcGFudChpbnB1dDogeyB0aHJlYWRJZDogc3RyaW5nOyBhY3RvcklkOiBzdHJpbmc7IGJ5QWN0b3JJZDogc3RyaW5nIH0pOiBUaHJlYWQ7XG4gIC8qKlxuICAgKiBQb3N0IGEgbWVzc2FnZS4gYG1lbnRpb25zYCBpcyBTVFJVQ1RVUkVEIChhY3RvciBpZHMpIFx1MjAxNCB0aGUgc2VydmVyIG5ldmVyXG4gICAqIHBhcnNlcyBib2R5IHRleHQgKFx1MDBBNzUuMikuIE1lbnRpb25pbmcgYW4gYWdlbnQgcnVucyB0aGUgZGV0ZXJtaW5pc3RpY1xuICAgKiByb3V0ZXIgKFx1MDBBNzUuNCk6IGRlZmF1bHQtZGVueSwgcG9saWN5LWdhdGVkLCBkZXB0aC1jYXBwZWQuXG4gICAqL1xuICBwb3N0TWVzc2FnZShpbnB1dDoge1xuICAgIHRocmVhZElkOiBzdHJpbmc7XG4gICAgYWN0b3JJZDogc3RyaW5nO1xuICAgIGJvZHk6IHN0cmluZztcbiAgICByZXBseVRvPzogc3RyaW5nO1xuICAgIG1lbnRpb25zPzogc3RyaW5nW107XG4gIH0pOiBNZXNzYWdlO1xuICBsaXN0VGhyZWFkcyhmaWx0ZXI/OiB7IGZlYXR1cmVJZD86IHN0cmluZzsgd29ya0l0ZW1JZD86IHN0cmluZzsgYWN0b3JJZD86IHN0cmluZyB9KTogVGhyZWFkW107XG4gIGxpc3RNZXNzYWdlcyhpbnB1dDogeyB0aHJlYWRJZDogc3RyaW5nOyBhY3RvcklkOiBzdHJpbmc7IHNpbmNlU2VxPzogbnVtYmVyIH0pOiBNZXNzYWdlW107XG4gIGxpc3RNZW50aW9ucyhtZXNzYWdlSWQ6IHN0cmluZyk6IE1lbnRpb25bXTtcbiAgbGlzdE5vdGlmaWNhdGlvbnMoaW5wdXQ6IHsgYWN0b3JJZDogc3RyaW5nOyB1bnJlYWRPbmx5PzogYm9vbGVhbiB9KTogTm90aWZpY2F0aW9uW107XG4gIG1hcmtOb3RpZmljYXRpb25SZWFkKGlucHV0OiB7IG5vdGlmaWNhdGlvbklkOiBzdHJpbmc7IGFjdG9ySWQ6IHN0cmluZyB9KTogdm9pZDtcbiAgbGlzdEFnZW50Sm9icyhmaWx0ZXI/OiB7IGFnZW50QWN0b3JJZD86IHN0cmluZzsgc3RhdHVzPzogQWdlbnRKb2JbJ3N0YXR1cyddIH0pOiBBZ2VudEpvYltdO1xuICAvKiogT25seSB0aGUgam9iJ3MgYWdlbnQgbWF5IGNvbXBsZXRlIGl0OyBjb21wbGV0aW9uIG5vdGlmaWVzIHRoZSBtZW50aW9uZXIuICovXG4gIGNvbXBsZXRlQWdlbnRKb2IoaW5wdXQ6IHsgam9iSWQ6IHN0cmluZzsgYWN0b3JJZDogc3RyaW5nOyBzdGF0dXM6ICdkb25lJyB8ICdibG9ja2VkJzsgbm90ZT86IHN0cmluZyB9KTogQWdlbnRKb2I7XG5cbiAgLy8gLS0gYWdlbnQgbWVtb3J5IChQaGFzZSA1LCByb2FkbWFwIFx1MDBBNzYpIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgLyoqIEFnZW50cyBvbmx5OyBsZWFybmluZyBmcm9tIGEgcHJpdmF0ZSB0aHJlYWQgcmVxdWlyZXMgaGF2aW5nIGJlZW4gaW4gaXQuICovXG4gIGFwcGVuZEFnZW50TWVtb3J5KGlucHV0OiB7XG4gICAgYWN0b3JJZDogc3RyaW5nO1xuICAgIGtpbmQ6IE1lbW9yeUtpbmQ7XG4gICAgY29udGVudDogc3RyaW5nO1xuICAgIHNvdXJjZVRocmVhZElkPzogc3RyaW5nO1xuICB9KTogQWdlbnRNZW1vcnk7XG4gIC8qKlxuICAgKiBPd25lci1zY29wZWQgcmVjYWxsOiBhbHdheXMgYW5kIG9ubHkgdGhlIGNhbGxlcidzIG1lbW9yaWVzLiBQcml2YXRlLVxuICAgKiBzb3VyY2VkIG1lbW9yaWVzIHN1cmZhY2UgT05MWSB3aGVuIHJlY2FsbGVkIGluc2lkZSB0aGVpciBzb3VyY2UgdGhyZWFkIFx1MjAxNFxuICAgKiBub3RoaW5nIGxlYXJuZWQgaW4gYSBwcml2YXRlIHRocmVhZCBzdXJmYWNlcyBpbiBhbiBvcGVuIGNvbnRleHQgKFx1MDBBNzYpLlxuICAgKi9cbiAgc2VhcmNoQWdlbnRNZW1vcnkoaW5wdXQ6IHtcbiAgICBhY3RvcklkOiBzdHJpbmc7XG4gICAgY29udGV4dFRocmVhZElkPzogc3RyaW5nO1xuICAgIGtpbmQ/OiBNZW1vcnlLaW5kO1xuICAgIHF1ZXJ5Pzogc3RyaW5nO1xuICB9KTogQWdlbnRNZW1vcnlbXTtcblxuICAvLyAtLSBxdWVyaWVzIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgZ2V0V29ya0l0ZW0oaWQ6IHN0cmluZyk6IFdvcmtJdGVtO1xuICBnZXRGZWF0dXJlKGlkOiBzdHJpbmcpOiBGZWF0dXJlO1xuICBnZXRDbGFpbXMod29ya0l0ZW1JZDogc3RyaW5nKTogQ2xhaW1bXTtcbiAgLyoqIEFkZGl0aXZlIHF1ZXJ5IHN1cmZhY2UgKHBvc3QtY29uZm9ybWFuY2UpOiBsaXN0L2ZpbHRlciB3b3JrIGl0ZW1zLiAqL1xuICBsaXN0V29ya0l0ZW1zKGZpbHRlcj86IHsgc3RhdGU/OiBXb3JrSXRlbVN0YXRlOyBmZWF0dXJlSWQ/OiBzdHJpbmc7IGNsYWltYWJsZT86IGJvb2xlYW4gfSk6IFdvcmtJdGVtW107XG4gIGV2ZW50cyhzdHJlYW1JZD86IHN0cmluZyk6IFNwaW5lRXZlbnRbXTtcbn1cbiIsICIvKipcbiAqIHN0b3JpZXMueWFtbCBwYXJzaW5nICsgdmFsaWRpdHkgcnVsZXMgKHN0b3JpZXMtc2NoZW1hLm1kLCByb2FkbWFwIEQ5KS5cbiAqXG4gKiBUaGUgc2NoZW1hJ3MgdmFsaWRpdHkgcnVsZXMgYmVjb21lIHRocm93aW5nIGNoZWNrcyBoZXJlOyB0aGUgaW1wb3J0ZXIgaW5cbiAqIHRoZSBlbmdpbmUgY29uc3VtZXMgdGhlIHZhbGlkYXRlZCBlbnRyaWVzLiBcIk5vIHN0YXR1cyBmaWVsZCwgZXZlci5cIlxuICovXG5pbXBvcnQgeyBwYXJzZSB9IGZyb20gJ3lhbWwnO1xuXG5pbXBvcnQgeyBTdG9yaWVzVmFsaWRhdGlvbkVycm9yIH0gZnJvbSAnLi90eXBlcy5qcyc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgU3RvcnlFbnRyeSB7XG4gIGlkOiBzdHJpbmc7XG4gIHRpdGxlOiBzdHJpbmc7XG4gIGRlc2NyaXB0aW9uOiBzdHJpbmc7XG4gIHNwZWNDaGVja3BvaW50OiBib29sZWFuO1xuICBkb25lQ2hlY2twb2ludDogYm9vbGVhbjtcbiAgaW52b2tlRGV2V2l0aDogc3RyaW5nO1xufVxuXG5jb25zdCBJRF9QQVRURVJOID0gL15bQS1aYS16MC05LV0rJC87XG5cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZVN0b3JpZXMoeWFtbFRleHQ6IHN0cmluZyk6IFN0b3J5RW50cnlbXSB7XG4gIGxldCByYXc6IHVua25vd247XG4gIHRyeSB7XG4gICAgcmF3ID0gcGFyc2UoeWFtbFRleHQpO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIHRocm93IG5ldyBTdG9yaWVzVmFsaWRhdGlvbkVycm9yKGBZQU1MIHBhcnNlIGZhaWx1cmU6ICR7U3RyaW5nKGVycm9yKX1gKTtcbiAgfVxuICBpZiAoIUFycmF5LmlzQXJyYXkocmF3KSkge1xuICAgIHRocm93IG5ldyBTdG9yaWVzVmFsaWRhdGlvbkVycm9yKCd0b3AgbGV2ZWwgbXVzdCBiZSBhIFlBTUwgbGlzdCBvZiBzdG9yaWVzJyk7XG4gIH1cblxuICBjb25zdCBlbnRyaWVzOiBTdG9yeUVudHJ5W10gPSBbXTtcbiAgZm9yIChjb25zdCBpdGVtIG9mIHJhdykge1xuICAgIGlmICh0eXBlb2YgaXRlbSAhPT0gJ29iamVjdCcgfHwgaXRlbSA9PT0gbnVsbCB8fCBBcnJheS5pc0FycmF5KGl0ZW0pKSB7XG4gICAgICB0aHJvdyBuZXcgU3Rvcmllc1ZhbGlkYXRpb25FcnJvcignZXZlcnkgZW50cnkgbXVzdCBiZSBhIG1hcHBpbmcnKTtcbiAgICB9XG4gICAgY29uc3QgZW50cnkgPSBpdGVtIGFzIFJlY29yZDxzdHJpbmcsIHVua25vd24+O1xuXG4gICAgLy8gUnVsZSAzOiBcIk5vIHN0YXR1cyBmaWVsZCwgZXZlci5cIlxuICAgIGlmICgnc3RhdHVzJyBpbiBlbnRyeSkge1xuICAgICAgdGhyb3cgbmV3IFN0b3JpZXNWYWxpZGF0aW9uRXJyb3IoJ25vIHN0YXR1cyBmaWVsZCwgZXZlcicpO1xuICAgIH1cbiAgICAvLyBSdWxlIDQ6IGlkcyBhcmUgWUFNTCBzdHJpbmdzLCBhbHdheXMgcXVvdGVkIFx1MjAxNCBhbiB1bnF1b3RlZCBgaWQ6IDFgXG4gICAgLy8gcGFyc2VzIGFzIGEgbnVtYmVyIGFuZCBicmVha3Mgc3RyaW5nIGNvbXBhcmlzb24uXG4gICAgaWYgKHR5cGVvZiBlbnRyeVsnaWQnXSAhPT0gJ3N0cmluZycpIHtcbiAgICAgIHRocm93IG5ldyBTdG9yaWVzVmFsaWRhdGlvbkVycm9yKCdpZCBtdXN0IGJlIGEgcXVvdGVkIFlBTUwgc3RyaW5nJyk7XG4gICAgfVxuICAgIGNvbnN0IGlkID0gZW50cnlbJ2lkJ107XG4gICAgaWYgKCFJRF9QQVRURVJOLnRlc3QoaWQpKSB7XG4gICAgICB0aHJvdyBuZXcgU3Rvcmllc1ZhbGlkYXRpb25FcnJvcihgaWQgXCIke2lkfVwiIG1heSBjb250YWluIG9ubHkgbGV0dGVycywgZGlnaXRzLCBhbmQgZGFzaGVzYCk7XG4gICAgfVxuICAgIC8vIFJ1bGUgMTogcmVxdWlyZWQgZmllbGRzLlxuICAgIGlmICh0eXBlb2YgZW50cnlbJ3RpdGxlJ10gIT09ICdzdHJpbmcnIHx8IGVudHJ5Wyd0aXRsZSddLmxlbmd0aCA9PT0gMCkge1xuICAgICAgdGhyb3cgbmV3IFN0b3JpZXNWYWxpZGF0aW9uRXJyb3IoYGVudHJ5IFwiJHtpZH1cIiBpcyBtaXNzaW5nIHJlcXVpcmVkIGZpZWxkOiB0aXRsZWApO1xuICAgIH1cbiAgICBpZiAodHlwZW9mIGVudHJ5WydkZXNjcmlwdGlvbiddICE9PSAnc3RyaW5nJyB8fCBlbnRyeVsnZGVzY3JpcHRpb24nXS5sZW5ndGggPT09IDApIHtcbiAgICAgIHRocm93IG5ldyBTdG9yaWVzVmFsaWRhdGlvbkVycm9yKGBlbnRyeSBcIiR7aWR9XCIgaXMgbWlzc2luZyByZXF1aXJlZCBmaWVsZDogZGVzY3JpcHRpb25gKTtcbiAgICB9XG5cbiAgICBlbnRyaWVzLnB1c2goe1xuICAgICAgaWQsXG4gICAgICB0aXRsZTogZW50cnlbJ3RpdGxlJ10sXG4gICAgICBkZXNjcmlwdGlvbjogZW50cnlbJ2Rlc2NyaXB0aW9uJ10sXG4gICAgICBzcGVjQ2hlY2twb2ludDogZW50cnlbJ3NwZWNfY2hlY2twb2ludCddID09PSB0cnVlLFxuICAgICAgZG9uZUNoZWNrcG9pbnQ6IGVudHJ5Wydkb25lX2NoZWNrcG9pbnQnXSA9PT0gdHJ1ZSxcbiAgICAgIGludm9rZURldldpdGg6IHR5cGVvZiBlbnRyeVsnaW52b2tlX2Rldl93aXRoJ10gPT09ICdzdHJpbmcnID8gZW50cnlbJ2ludm9rZV9kZXZfd2l0aCddIDogJycsXG4gICAgfSk7XG4gIH1cblxuICAvLyBSdWxlIDE6IGlkcyB1bmlxdWUuXG4gIGNvbnN0IHNlZW4gPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgZm9yIChjb25zdCB7IGlkIH0gb2YgZW50cmllcykge1xuICAgIGlmIChzZWVuLmhhcyhpZCkpIHRocm93IG5ldyBTdG9yaWVzVmFsaWRhdGlvbkVycm9yKGBkdXBsaWNhdGUgaWQgXCIke2lkfVwiYCk7XG4gICAgc2Vlbi5hZGQoaWQpO1xuICB9XG4gIC8vIFJ1bGUgMjogcHJlZml4LWZyZWUgdW5kZXIgdGhlIGA8aWQ+LWAgZmlsZW5hbWUtbWF0Y2hpbmcgY29udmVudGlvbi5cbiAgZm9yIChjb25zdCBhIG9mIHNlZW4pIHtcbiAgICBmb3IgKGNvbnN0IGIgb2Ygc2Vlbikge1xuICAgICAgaWYgKGEgIT09IGIgJiYgYS5zdGFydHNXaXRoKGAke2J9LWApKSB7XG4gICAgICAgIHRocm93IG5ldyBTdG9yaWVzVmFsaWRhdGlvbkVycm9yKGBpZHMgXCIke2J9XCIgYW5kIFwiJHthfVwiIGNvbGxpZGUgdW5kZXIgdGhlIDxpZD4tIGNvbnZlbnRpb25gKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgcmV0dXJuIGVudHJpZXM7XG59XG4iLCAiLyoqXG4gKiBJbi1tZW1vcnkgcmVmZXJlbmNlIGltcGxlbWVudGF0aW9uIG9mIHRoZSBzcGluZSBlbmdpbmUsIHdyaXR0ZW4gdG8gbWFrZSB0aGVcbiAqIGNvbmZvcm1hbmNlIHN1aXRlIGluIHRlc3QvIHBhc3MuIFRoZSBwcm9kdWN0aW9uIHNlcnZpY2Ugd3JhcHMgdGhpcyBzYW1lXG4gKiBjb3JlIHdpdGggUG9zdGdyZXMgcGVyc2lzdGVuY2UgKFBoYXNlIDEgc3RvcnkgXCIxMVwiKS5cbiAqXG4gKiBSdWxlIHByb3ZlbmFuY2UgbGl2ZXMgaW4gdGhlIHRlc3RzIGFuZCBpbiB0ZXN0L0NPTkZPUk1BTkNFLm1kIFx1MjAxNCB0aGlzIGZpbGVcbiAqIG9ubHkgZW5jb2RlcyB3aGF0IHRoZSBzdWl0ZSBwaW5zLiBXaGVyZSBhbiBvcmRlcmluZyBvciBzZW1hbnRpYyB3YXNcbiAqIGFyYml0cmF0ZWQsIHRoZSBjb21tZW50IG5hbWVzIHRoZSBwaW4uXG4gKi9cbmltcG9ydCB7XG4gIEFHRU5UX0dBVEVfQVBQUk9WRV9QRVJNSVNTSU9OUyxcbiAgQUdFTlRfSk9CX01BWF9ERVBUSCxcbiAgQkxPQ0tFRF9SRUFTT05TLFxuICBDb25mbGljdEVycm9yLFxuICBERUZBVUxUX1BMQU4sXG4gIERFTElWRVJZX1JPTEVTLFxuICBHdWFyZEZhaWxlZEVycm9yLFxuICBJbnZhbGlkVHJhbnNpdGlvbkVycm9yLFxuICBQZXJtaXNzaW9uRGVuaWVkRXJyb3IsXG4gIFBFUlNPTkFTLFxuICBQTEFOX0NFSUxJTkdTLFxuICBSRVZJRVdfTE9PUF9MSU1JVCxcbiAgU3Rvcmllc1ZhbGlkYXRpb25FcnJvcixcbiAgV09SS19JVEVNX1NUQVRFUyxcbiAgdHlwZSBBY3RvcixcbiAgdHlwZSBBY3RvclR5cGUsXG4gIHR5cGUgQWR2YW5jZUlucHV0LFxuICB0eXBlIEFnZW50Sm9iLFxuICB0eXBlIEF1dGh6RXhwbGFuYXRpb24sXG4gIHR5cGUgQmxvY2tlZFJlYXNvbixcbiAgdHlwZSBBZ2VudE1lbW9yeSxcbiAgdHlwZSBNZW1vcnlLaW5kLFxuICB0eXBlIE1lbnRpb24sXG4gIHR5cGUgTWVzc2FnZSxcbiAgdHlwZSBOb3RpZmljYXRpb24sXG4gIHR5cGUgVGhyZWFkLFxuICB0eXBlIFRocmVhZEtpbmQsXG4gIHR5cGUgVGhyZWFkVmlzaWJpbGl0eSxcbiAgdHlwZSBDbGFpbSxcbiAgdHlwZSBDcmVhdGVXb3JrSXRlbUlucHV0LFxuICB0eXBlIERpdmVyZ2VuY2VSZXBvcnQsXG4gIHR5cGUgRXZpZGVuY2UsXG4gIHR5cGUgRmVhdHVyZSxcbiAgdHlwZSBHYXRlQ29kZSxcbiAgdHlwZSBHYXRlRGVjaXNpb25JbnB1dCxcbiAgdHlwZSBHYXRlUG9saWN5LFxuICB0eXBlIEdvdmVybmFuY2VSb2xlLFxuICB0eXBlIFBlcm1pc3Npb24sXG4gIHR5cGUgUGxhbkNvZGUsXG4gIHR5cGUgUm9sZUFzc2lnbm1lbnQsXG4gIHR5cGUgU3BpbmVFbmdpbmUsXG4gIHR5cGUgU3BpbmVFdmVudCxcbiAgdHlwZSBTdG9yaWVzSW1wb3J0UmVzdWx0LFxuICB0eXBlIFdvcmtJdGVtLFxuICB0eXBlIFdvcmtJdGVtS2luZCxcbiAgdHlwZSBXb3JrSXRlbVN0YXRlLFxuICB0eXBlIFdvcmtzcGFjZVBvbGljeSxcbn0gZnJvbSAnLi90eXBlcy5qcyc7XG5pbXBvcnQgeyBwYXJzZVN0b3JpZXMgfSBmcm9tICcuL3N0b3JpZXMuanMnO1xuXG5jb25zdCBSQU5LOiBSZWNvcmQ8V29ya0l0ZW1TdGF0ZSwgbnVtYmVyPiA9IE9iamVjdC5mcm9tRW50cmllcyhcbiAgV09SS19JVEVNX1NUQVRFUy5tYXAoKHMsIGkpID0+IFtzLCBpXSksXG4pIGFzIFJlY29yZDxXb3JrSXRlbVN0YXRlLCBudW1iZXI+O1xuXG4vKipcbiAqIFRoZSB2ZXJzaW9uZWQgdHJhbnNpdGlvbiB0YWJsZSAocm9hZG1hcCBcdTAwQTcxLjIpLiBDbGFpbXMgc2VyaWFsaXplIHRoZVxuICogRVhFQ1VUSU9OIHpvbmUgKGNvbmZvcm1hbmNlIHBpbiwgc2VlIHRlc3QvQ09ORk9STUFOQ0UubWQpOiBwbGFubmluZ1xuICogdHJhbnNpdGlvbnMgYXJlIHBlcm1pc3Npb24tb25seTsgcmVhZHlfZm9yX2Rldlx1MjE5MmluX3Byb2dyZXNzIG9ud2FyZCBkZW1hbmQgYVxuICogcHJlc2VudGVkLCBsaXZlIGZlbmNpbmcgdG9rZW4uIEdhdGUtZmlyZWQgdHJhbnNpdGlvbnMgKHNwZWNfYXBwcm92YWwsXG4gKiByZXZpZXdfYXBwcm92YWwpIGRvIG5vdCBhcHBlYXIgaGVyZSBcdTIwMTQgYXBwcm92ZUdhdGUvcmVqZWN0R2F0ZSBmaXJlIHRoZW0uXG4gKi9cbmludGVyZmFjZSBUcmFuc2l0aW9uUnVsZSB7XG4gIGZyb206IFdvcmtJdGVtU3RhdGU7XG4gIHRvOiBXb3JrSXRlbVN0YXRlO1xuICBwZXJtaXNzaW9uOiBQZXJtaXNzaW9uO1xuICBjbGFpbVJlcXVpcmVkOiBib29sZWFuO1xuICBndWFyZHM6IEFycmF5PCdkZXBzX2RvbmUnIHwgJ3NwZWNfZ2F0ZV9pZl9jaGVja3BvaW50JyB8ICdub25lbXB0eV9kaWZmJz47XG59XG5cbmNvbnN0IFRSQU5TSVRJT05TOiBUcmFuc2l0aW9uUnVsZVtdID0gW1xuICB7IGZyb206ICdiYWNrbG9nJywgdG86ICdkcmFmdCcsIHBlcm1pc3Npb246ICd0YXNrLnBsYW4nLCBjbGFpbVJlcXVpcmVkOiBmYWxzZSwgZ3VhcmRzOiBbXSB9LFxuICB7XG4gICAgZnJvbTogJ2RyYWZ0JyxcbiAgICB0bzogJ3JlYWR5X2Zvcl9kZXYnLFxuICAgIHBlcm1pc3Npb246ICd0YXNrLnBsYW4nLFxuICAgIGNsYWltUmVxdWlyZWQ6IGZhbHNlLFxuICAgIGd1YXJkczogWydzcGVjX2dhdGVfaWZfY2hlY2twb2ludCddLFxuICB9LFxuICB7XG4gICAgZnJvbTogJ3JlYWR5X2Zvcl9kZXYnLFxuICAgIHRvOiAnaW5fcHJvZ3Jlc3MnLFxuICAgIHBlcm1pc3Npb246ICd0YXNrLmFkdmFuY2UnLFxuICAgIGNsYWltUmVxdWlyZWQ6IHRydWUsXG4gICAgZ3VhcmRzOiBbJ2RlcHNfZG9uZSddLFxuICB9LFxuICB7XG4gICAgZnJvbTogJ2luX3Byb2dyZXNzJyxcbiAgICB0bzogJ2luX3JldmlldycsXG4gICAgcGVybWlzc2lvbjogJ3Rhc2suYWR2YW5jZScsXG4gICAgY2xhaW1SZXF1aXJlZDogdHJ1ZSxcbiAgICBndWFyZHM6IFsnbm9uZW1wdHlfZGlmZiddLFxuICB9LFxuXTtcblxuaW50ZXJmYWNlIFdvcmtJdGVtUm93IGV4dGVuZHMgV29ya0l0ZW0ge1xuICBkZXBlbmRzT246IHN0cmluZ1tdO1xufVxuXG5pbnRlcmZhY2UgQ2xhaW1Sb3cgZXh0ZW5kcyBDbGFpbSB7XG4gIHR0bE1zOiBudW1iZXI7XG59XG5cbmludGVyZmFjZSBHYXRlRGVjaXNpb25Sb3cge1xuICB3b3JrSXRlbUlkOiBzdHJpbmc7XG4gIGdhdGU6IEdhdGVDb2RlO1xuICBkZWNpc2lvbjogJ2FwcHJvdmVkJyB8ICdyZWplY3RlZCc7XG4gIGFjdG9ySWQ6IHN0cmluZztcbiAgLyoqIHJldmlldyByb3VuZCB0aGUgZGVjaXNpb24gYmVsb25ncyB0byAoPSByZXZpZXdMb29wSXRlcmF0aW9uIGF0IGRlY2lzaW9uIHRpbWUpICovXG4gIHJvdW5kOiBudW1iZXI7XG59XG5cbmludGVyZmFjZSBSb2xlQXNzaWdubWVudFJvdyBleHRlbmRzIFJvbGVBc3NpZ25tZW50IHt9XG5cbmludGVyZmFjZSBFdmlkZW5jZVJvdyB7XG4gIHdvcmtJdGVtSWQ6IHN0cmluZztcbiAgZXZpZGVuY2U6IEV2aWRlbmNlO1xuICBzZXE6IG51bWJlcjtcbn1cblxuY29uc3QgTEVHQUNZX1NUQVRVUzogUmVjb3JkPHN0cmluZywgV29ya0l0ZW1TdGF0ZT4gPSB7XG4gIGJhY2tsb2c6ICdiYWNrbG9nJyxcbiAgZHJhZnQ6ICdkcmFmdCcsXG4gICdyZWFkeS1mb3ItZGV2JzogJ3JlYWR5X2Zvcl9kZXYnLFxuICByZWFkeV9mb3JfZGV2OiAncmVhZHlfZm9yX2RldicsXG4gICdpbi1wcm9ncmVzcyc6ICdpbl9wcm9ncmVzcycsXG4gIGluX3Byb2dyZXNzOiAnaW5fcHJvZ3Jlc3MnLFxuICAnaW4tcmV2aWV3JzogJ2luX3JldmlldycsXG4gIGluX3JldmlldzogJ2luX3JldmlldycsXG4gIHJldmlldzogJ2luX3JldmlldycsXG4gIGRvbmU6ICdkb25lJyxcbn07XG5cbmNsYXNzIEVuZ2luZUltcGwgaW1wbGVtZW50cyBTcGluZUVuZ2luZSB7XG4gIHByaXZhdGUgbm93ID0gMDtcbiAgcHJpdmF0ZSBzZXEgPSAwO1xuICBwcml2YXRlIGdsb2JhbFNlcSA9IDA7XG5cbiAgcHJpdmF0ZSByZWFkb25seSBhY3RvcnMgPSBuZXcgTWFwPHN0cmluZywgQWN0b3I+KCk7XG4gIHByaXZhdGUgcmVhZG9ubHkgZ3JhbnRzID0gbmV3IE1hcDxzdHJpbmcsIFNldDxzdHJpbmc+PigpOyAvLyBhY3RvcklkIC0+IFwicGVybWlzc2lvblwiIChzY29wZSBpZ25vcmVkIHVudGlsIFBoYXNlIDIpXG4gIHByaXZhdGUgcmVhZG9ubHkgZmVhdHVyZXMgPSBuZXcgTWFwPHN0cmluZywgRmVhdHVyZT4oKTtcbiAgcHJpdmF0ZSByZWFkb25seSB3b3JrSXRlbXMgPSBuZXcgTWFwPHN0cmluZywgV29ya0l0ZW1Sb3c+KCk7XG4gIHByaXZhdGUgcmVhZG9ubHkgZXh0ZXJuYWxLZXlJbmRleCA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmc+KCk7IC8vIGV4dGVybmFsS2V5IC0+IHdvcmtJdGVtSWQgKGZpcnN0IHdyaXRlciB3aW5zKVxuICBwcml2YXRlIHJlYWRvbmx5IGNsYWltcyA9IG5ldyBNYXA8c3RyaW5nLCBDbGFpbVJvdz4oKTtcbiAgcHJpdmF0ZSByZWFkb25seSBjbGFpbXNCeUl0ZW0gPSBuZXcgTWFwPHN0cmluZywgc3RyaW5nW10+KCk7IC8vIHdvcmtJdGVtSWQgLT4gY2xhaW1JZHNcbiAgcHJpdmF0ZSByZWFkb25seSBmZW5jaW5nQ291bnRlciA9IG5ldyBNYXA8c3RyaW5nLCBudW1iZXI+KCk7IC8vIHdvcmtJdGVtSWQgLT4gbGFzdCB0b2tlblxuICBwcml2YXRlIHJlYWRvbmx5IGdhdGVEZWNpc2lvbnM6IEdhdGVEZWNpc2lvblJvd1tdID0gW107XG4gIHByaXZhdGUgcmVhZG9ubHkgZXZpZGVuY2VSb3dzOiBFdmlkZW5jZVJvd1tdID0gW107XG4gIHByaXZhdGUgcmVhZG9ubHkgZXZlbnRMb2c6IFNwaW5lRXZlbnRbXSA9IFtdO1xuICBwcml2YXRlIHJlYWRvbmx5IHN0cmVhbVNlcXMgPSBuZXcgTWFwPHN0cmluZywgbnVtYmVyPigpO1xuICBwcml2YXRlIHJlYWRvbmx5IGlkZW1wb3RlbmN5Q2FjaGUgPSBuZXcgTWFwPHN0cmluZywgV29ya0l0ZW0+KCk7XG5cbiAgLy8gLS0gZW50aXRsZW1lbnRzIHN0YXRlIChQaGFzZSAyLCByb2FkbWFwIFx1MDBBNzMpIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHByaXZhdGUgcmVhZG9ubHkgZ292ZXJuYW5jZVJvbGVzID0gbmV3IE1hcDxzdHJpbmcsIEdvdmVybmFuY2VSb2xlPigpO1xuICBwcml2YXRlIHJlYWRvbmx5IHJvbGVBc3NpZ25tZW50czogUm9sZUFzc2lnbm1lbnRSb3dbXSA9IFtdO1xuICBwcml2YXRlIHBsYW46IFBsYW5Db2RlID0gREVGQVVMVF9QTEFOO1xuICBwcml2YXRlIHBsYW5WZXJzaW9uID0gMTtcbiAgcHJpdmF0ZSB3b3Jrc3BhY2VQb2xpY3k6IFdvcmtzcGFjZVBvbGljeSA9IHt9O1xuICBwcml2YXRlIHBvbGljeVZlcnNpb24gPSAxO1xuICBwcml2YXRlIHJlYWRvbmx5IGdhdGVQb2xpY2llcyA9IG5ldyBNYXA8R2F0ZUNvZGUsIEdhdGVQb2xpY3k+KCk7XG5cbiAgLy8gLS0gY29sbGFib3JhdGlvbiBzdGF0ZSAoUGhhc2UgMywgcm9hZG1hcCBcdTAwQTc1KSAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICBwcml2YXRlIHJlYWRvbmx5IHRocmVhZHMgPSBuZXcgTWFwPHN0cmluZywgVGhyZWFkPigpO1xuICBwcml2YXRlIHJlYWRvbmx5IG1lc3NhZ2VzOiBNZXNzYWdlW10gPSBbXTtcbiAgcHJpdmF0ZSByZWFkb25seSBtZW50aW9uczogTWVudGlvbltdID0gW107XG4gIHByaXZhdGUgcmVhZG9ubHkgbm90aWZpY2F0aW9uczogTm90aWZpY2F0aW9uW10gPSBbXTtcbiAgcHJpdmF0ZSByZWFkb25seSBhZ2VudEpvYnMgPSBuZXcgTWFwPHN0cmluZywgQWdlbnRKb2I+KCk7XG5cbiAgLy8gLS0gYWdlbnQgbWVtb3J5IHN0YXRlIChQaGFzZSA1LCByb2FkbWFwIFx1MDBBNzYpIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgcHJpdmF0ZSByZWFkb25seSBhZ2VudE1lbW9yaWVzOiBBZ2VudE1lbW9yeVtdID0gW107XG5cbiAgcmVhZG9ubHkgc3lzdGVtQWN0b3JJZDogc3RyaW5nO1xuXG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHRoaXMuc3lzdGVtQWN0b3JJZCA9IHRoaXMubmV4dElkKCdhY3Rvci1zeXN0ZW0nKTtcbiAgICB0aGlzLmFjdG9ycy5zZXQodGhpcy5zeXN0ZW1BY3RvcklkLCB7XG4gICAgICBpZDogdGhpcy5zeXN0ZW1BY3RvcklkLFxuICAgICAgdHlwZTogJ3N5c3RlbScsXG4gICAgICBkaXNwbGF5TmFtZTogJ3N5c3RlbScsXG4gICAgICBwZXJzb25hQ29kZTogbnVsbCxcbiAgICB9KTtcbiAgfVxuXG4gIC8vIC0tIGluZnJhc3RydWN0dXJlIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgcHJpdmF0ZSBuZXh0SWQocHJlZml4OiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIHRoaXMuc2VxICs9IDE7XG4gICAgcmV0dXJuIGAke3ByZWZpeH1fJHt0aGlzLnNlcS50b1N0cmluZygzNikucGFkU3RhcnQoNiwgJzAnKX1gO1xuICB9XG5cbiAgcHJpdmF0ZSBhcHBlbmQoXG4gICAgc3RyZWFtVHlwZTogU3BpbmVFdmVudFsnc3RyZWFtVHlwZSddLFxuICAgIHN0cmVhbUlkOiBzdHJpbmcsXG4gICAgdHlwZTogc3RyaW5nLFxuICAgIGFjdG9ySWQ6IHN0cmluZyxcbiAgICBwYXlsb2FkOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPixcbiAgICBleHRyYT86IHsgY2F1c2F0aW9uSWQ/OiBzdHJpbmc7IGlkZW1wb3RlbmN5S2V5Pzogc3RyaW5nIH0sXG4gICk6IFNwaW5lRXZlbnQge1xuICAgIHRoaXMuZ2xvYmFsU2VxICs9IDE7XG4gICAgY29uc3Qgc3RyZWFtU2VxID0gKHRoaXMuc3RyZWFtU2Vxcy5nZXQoc3RyZWFtSWQpID8/IDApICsgMTtcbiAgICB0aGlzLnN0cmVhbVNlcXMuc2V0KHN0cmVhbUlkLCBzdHJlYW1TZXEpO1xuICAgIGNvbnN0IGV2ZW50OiBTcGluZUV2ZW50ID0ge1xuICAgICAgZ2xvYmFsU2VxOiB0aGlzLmdsb2JhbFNlcSxcbiAgICAgIHN0cmVhbVR5cGUsXG4gICAgICBzdHJlYW1JZCxcbiAgICAgIHN0cmVhbVNlcSxcbiAgICAgIHR5cGUsXG4gICAgICBhY3RvcklkLFxuICAgICAgcGF5bG9hZCxcbiAgICAgIC4uLihleHRyYT8uY2F1c2F0aW9uSWQgIT09IHVuZGVmaW5lZCA/IHsgY2F1c2F0aW9uSWQ6IGV4dHJhLmNhdXNhdGlvbklkIH0gOiB7fSksXG4gICAgfTtcbiAgICB0aGlzLmV2ZW50TG9nLnB1c2goZXZlbnQpO1xuICAgIHJldHVybiBldmVudDtcbiAgfVxuXG4gIHByaXZhdGUgbXVzdEdldEl0ZW0od29ya0l0ZW1JZDogc3RyaW5nKTogV29ya0l0ZW1Sb3cge1xuICAgIGNvbnN0IGJ5SWQgPSB0aGlzLndvcmtJdGVtcy5nZXQod29ya0l0ZW1JZCk7XG4gICAgaWYgKGJ5SWQpIHJldHVybiBieUlkO1xuICAgIC8vIEltcG9ydGVkIHN0b3JpZXMgYXJlIGFkZHJlc3NlZCBieSB0aGVpciBleHRlcm5hbEtleSBoYW5kbGVcbiAgICAvLyAoY29uZm9ybWFuY2UgcGluIGluIHN0b3JpZXMtaW1wb3J0LnRlc3QudHMpLlxuICAgIGNvbnN0IG1hcHBlZCA9IHRoaXMuZXh0ZXJuYWxLZXlJbmRleC5nZXQod29ya0l0ZW1JZCk7XG4gICAgaWYgKG1hcHBlZCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBjb25zdCBpdGVtID0gdGhpcy53b3JrSXRlbXMuZ2V0KG1hcHBlZCk7XG4gICAgICBpZiAoaXRlbSkgcmV0dXJuIGl0ZW07XG4gICAgfVxuICAgIHRocm93IG5ldyBHdWFyZEZhaWxlZEVycm9yKGB1bmtub3duIHdvcmsgaXRlbTogJHt3b3JrSXRlbUlkfWApO1xuICB9XG5cbiAgLyoqXG4gICAqIEVudGl0bGVtZW50IHJlc29sdXRpb24gXHUyMDE0IGEgUFVSRSBmdW5jdGlvbiBvdmVyIHBsYW4gXHUwMEQ3IGdvdmVybmFuY2UgXHUwMEQ3XG4gICAqIGRlbGl2ZXJ5LXJvbGUgZGF0YSAocm9hZG1hcCBcdTAwQTczKS4gQSBncmFudCBtYXkgRVhJU1QgKGRpcmVjdCBvciB2aWEgYVxuICAgKiByb2xlKSBhbmQgc3RpbGwgbm90IFJFU09MVkUgZm9yIGFuIGFnZW50IHdoZW4gdGhlIHBsYW4gY2VpbGluZyBvciB0aGVcbiAgICogcmVzdHJpY3Qtb25seSB3b3Jrc3BhY2UgcG9saWN5IG5hcnJvd3MgaXQuIFVzZXJzIGFyZSBuZXZlciBwbGFuLWZpbHRlcmVkLlxuICAgKi9cbiAgcHJpdmF0ZSBncmFudFNvdXJjZShhY3RvcklkOiBzdHJpbmcsIHBlcm1pc3Npb246IFBlcm1pc3Npb24pOiBzdHJpbmcgfCBudWxsIHtcbiAgICBpZiAodGhpcy5ncmFudHMuZ2V0KGFjdG9ySWQpPy5oYXMocGVybWlzc2lvbikpIHJldHVybiAnZGlyZWN0JztcbiAgICBmb3IgKGNvbnN0IGFzc2lnbm1lbnQgb2YgdGhpcy5yb2xlQXNzaWdubWVudHMpIHtcbiAgICAgIGlmIChhc3NpZ25tZW50LmFjdG9ySWQgIT09IGFjdG9ySWQgfHwgYXNzaWdubWVudC5yZXZva2VkKSBjb250aW51ZTtcbiAgICAgIGlmICgoREVMSVZFUllfUk9MRVNbYXNzaWdubWVudC5yb2xlQ29kZV0gPz8gW10pLmluY2x1ZGVzKHBlcm1pc3Npb24pKSB7XG4gICAgICAgIHJldHVybiBgcm9sZToke2Fzc2lnbm1lbnQucm9sZUNvZGV9YDtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICBwcml2YXRlIGFnZW50Q2VpbGluZ0FsbG93cyhhY3RvcjogQWN0b3IgfCB1bmRlZmluZWQsIHBlcm1pc3Npb246IFBlcm1pc3Npb24pOiB7IHBsYW46IGJvb2xlYW47IHBvbGljeTogYm9vbGVhbiB9IHtcbiAgICBpZiAoIWFjdG9yIHx8IGFjdG9yLnR5cGUgIT09ICdhZ2VudCcpIHJldHVybiB7IHBsYW46IHRydWUsIHBvbGljeTogdHJ1ZSB9O1xuICAgIGNvbnN0IGNlaWxpbmcgPSBQTEFOX0NFSUxJTkdTW3RoaXMucGxhbl07XG4gICAgaWYgKChBR0VOVF9HQVRFX0FQUFJPVkVfUEVSTUlTU0lPTlMgYXMgcmVhZG9ubHkgc3RyaW5nW10pLmluY2x1ZGVzKHBlcm1pc3Npb24pKSB7XG4gICAgICByZXR1cm4geyBwbGFuOiBjZWlsaW5nLmFnZW50R2F0ZUFwcHJvdmUsIHBvbGljeTogdGhpcy53b3Jrc3BhY2VQb2xpY3kuYWdlbnRHYXRlQXBwcm92YWxzICE9PSBmYWxzZSB9O1xuICAgIH1cbiAgICBpZiAocGVybWlzc2lvbiA9PT0gJ2dhdGUucmV2aWV3LnJlamVjdCcpIHtcbiAgICAgIHJldHVybiB7IHBsYW46IGNlaWxpbmcuYWdlbnRHYXRlUmVqZWN0LCBwb2xpY3k6IHRydWUgfTtcbiAgICB9XG4gICAgaWYgKHBlcm1pc3Npb24gPT09ICd0YXNrLmNsYWltJykge1xuICAgICAgcmV0dXJuIHsgcGxhbjogdHJ1ZSwgcG9saWN5OiB0aGlzLndvcmtzcGFjZVBvbGljeS5hZ2VudFNlbGZEaXNwYXRjaCAhPT0gZmFsc2UgfTtcbiAgICB9XG4gICAgcmV0dXJuIHsgcGxhbjogdHJ1ZSwgcG9saWN5OiB0cnVlIH07XG4gIH1cblxuICBwcml2YXRlIGhhc1Blcm1pc3Npb24oYWN0b3JJZDogc3RyaW5nLCBwZXJtaXNzaW9uOiBQZXJtaXNzaW9uKTogYm9vbGVhbiB7XG4gICAgaWYgKHRoaXMuZ3JhbnRTb3VyY2UoYWN0b3JJZCwgcGVybWlzc2lvbikgPT09IG51bGwpIHJldHVybiBmYWxzZTtcbiAgICBjb25zdCBhbGxvd3MgPSB0aGlzLmFnZW50Q2VpbGluZ0FsbG93cyh0aGlzLmFjdG9ycy5nZXQoYWN0b3JJZCksIHBlcm1pc3Npb24pO1xuICAgIHJldHVybiBhbGxvd3MucGxhbiAmJiBhbGxvd3MucG9saWN5O1xuICB9XG5cbiAgcHJpdmF0ZSByZXF1aXJlUGVybWlzc2lvbihhY3RvcklkOiBzdHJpbmcsIHBlcm1pc3Npb246IFBlcm1pc3Npb24pOiB2b2lkIHtcbiAgICBpZiAoIXRoaXMuaGFzUGVybWlzc2lvbihhY3RvcklkLCBwZXJtaXNzaW9uKSkge1xuICAgICAgdGhyb3cgbmV3IFBlcm1pc3Npb25EZW5pZWRFcnJvcihwZXJtaXNzaW9uLCBhY3RvcklkKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIHJlcXVpcmVHb3Zlcm5hbmNlQWRtaW4oYnlBY3RvcklkOiBzdHJpbmcpOiB2b2lkIHtcbiAgICBpZiAoYnlBY3RvcklkID09PSB0aGlzLnN5c3RlbUFjdG9ySWQpIHJldHVybjtcbiAgICBpZiAodGhpcy5nb3Zlcm5hbmNlUm9sZXMuZ2V0KGJ5QWN0b3JJZCkgPT09ICdhZG1pbicpIHJldHVybjtcbiAgICB0aHJvdyBuZXcgUGVybWlzc2lvbkRlbmllZEVycm9yKCdnb3Zlcm5hbmNlLmFkbWluJywgYnlBY3RvcklkKTtcbiAgfVxuXG4gIC8qKiBHcmFudC10aW1lIHBsYW4gY2VpbGluZzogcmVmdXNlIGlzc3VpbmcgYWdlbnQgZ2F0ZSBwZXJtaXNzaW9ucyB0aGUgcGxhbiBmb3JiaWRzLiAqL1xuICBwcml2YXRlIGNoZWNrR3JhbnRDZWlsaW5nKGFjdG9ySWQ6IHN0cmluZywgcGVybWlzc2lvbjogUGVybWlzc2lvbik6IHZvaWQge1xuICAgIGNvbnN0IGFjdG9yID0gdGhpcy5hY3RvcnMuZ2V0KGFjdG9ySWQpO1xuICAgIGlmICghYWN0b3IgfHwgYWN0b3IudHlwZSAhPT0gJ2FnZW50JykgcmV0dXJuO1xuICAgIGNvbnN0IGNlaWxpbmcgPSBQTEFOX0NFSUxJTkdTW3RoaXMucGxhbl07XG4gICAgaWYgKChBR0VOVF9HQVRFX0FQUFJPVkVfUEVSTUlTU0lPTlMgYXMgcmVhZG9ubHkgc3RyaW5nW10pLmluY2x1ZGVzKHBlcm1pc3Npb24pICYmICFjZWlsaW5nLmFnZW50R2F0ZUFwcHJvdmUpIHtcbiAgICAgIHRocm93IG5ldyBHdWFyZEZhaWxlZEVycm9yKGBwbGFuICR7dGhpcy5wbGFufSBkb2VzIG5vdCBhbGxvdyBhZ2VudHMgdG8gaG9sZCAke3Blcm1pc3Npb259YCk7XG4gICAgfVxuICAgIGlmIChwZXJtaXNzaW9uID09PSAnZ2F0ZS5yZXZpZXcucmVqZWN0JyAmJiAhY2VpbGluZy5hZ2VudEdhdGVSZWplY3QpIHtcbiAgICAgIHRocm93IG5ldyBHdWFyZEZhaWxlZEVycm9yKGBwbGFuICR7dGhpcy5wbGFufSBkb2VzIG5vdCBhbGxvdyBhZ2VudHMgdG8gaG9sZCAke3Blcm1pc3Npb259YCk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBsaXZlQ2xhaW0od29ya0l0ZW1JZDogc3RyaW5nKTogQ2xhaW1Sb3cgfCBudWxsIHtcbiAgICBmb3IgKGNvbnN0IGNsYWltSWQgb2YgdGhpcy5jbGFpbXNCeUl0ZW0uZ2V0KHdvcmtJdGVtSWQpID8/IFtdKSB7XG4gICAgICBjb25zdCBjbGFpbSA9IHRoaXMuY2xhaW1zLmdldChjbGFpbUlkKTtcbiAgICAgIGlmIChjbGFpbSAmJiAhY2xhaW0ucmVsZWFzZWQgJiYgY2xhaW0ubGVhc2VFeHBpcmVzQXQgPiB0aGlzLm5vdykgcmV0dXJuIGNsYWltO1xuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIC8qKlxuICAgKiBBIFBSRVNFTlRFRCB0b2tlbiBpcyBhbHdheXMgdmFsaWRhdGVkLCBvbiBldmVyeSBjb21tYW5kIChjb25mb3JtYW5jZSBwaW4sXG4gICAqIGNsYWltcy50ZXN0LnRzKTogc3RhbGUvZm9yZWlnbi9uby1saXZlLWNsYWltIFx1MjE5MiBDb25mbGljdEVycm9yICsgYXVkaXQgZXZlbnQuXG4gICAqL1xuICBwcml2YXRlIHZhbGlkYXRlUHJlc2VudGVkVG9rZW4oaXRlbTogV29ya0l0ZW1Sb3csIGZlbmNpbmdUb2tlbjogbnVtYmVyIHwgdW5kZWZpbmVkLCBhY3RvcklkOiBzdHJpbmcpOiB2b2lkIHtcbiAgICBpZiAoZmVuY2luZ1Rva2VuID09PSB1bmRlZmluZWQpIHJldHVybjtcbiAgICBjb25zdCBsaXZlID0gdGhpcy5saXZlQ2xhaW0oaXRlbS5pZCk7XG4gICAgaWYgKGxpdmUgPT09IG51bGwgfHwgbGl2ZS5mZW5jaW5nVG9rZW4gIT09IGZlbmNpbmdUb2tlbikge1xuICAgICAgdGhpcy5hcHBlbmQoJ3dvcmtfaXRlbScsIGl0ZW0uaWQsICdmZW5jaW5nLnJlamVjdGVkJywgYWN0b3JJZCwge1xuICAgICAgICBwcmVzZW50ZWRUb2tlbjogZmVuY2luZ1Rva2VuLFxuICAgICAgICBsaXZlVG9rZW46IGxpdmU/LmZlbmNpbmdUb2tlbiA/PyBudWxsLFxuICAgICAgfSk7XG4gICAgICB0aHJvdyBuZXcgQ29uZmxpY3RFcnJvcihgc3RhbGUgb3IgZm9yZWlnbiBmZW5jaW5nIHRva2VuIGZvciB3b3JrIGl0ZW0gJHtpdGVtLmlkfWApO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgY29weUl0ZW0oaXRlbTogV29ya0l0ZW1Sb3cpOiBXb3JrSXRlbSB7XG4gICAgY29uc3QgeyBkZXBlbmRzT246IF9kZXBlbmRzT24sIC4uLnB1YiB9ID0gaXRlbTtcbiAgICByZXR1cm4geyAuLi5wdWIsIHBpbm5lZFZlcmlmaWNhdGlvbjogaXRlbS5waW5uZWRWZXJpZmljYXRpb24gPyBbLi4uaXRlbS5waW5uZWRWZXJpZmljYXRpb25dIDogbnVsbCB9O1xuICB9XG5cbiAgcHJpdmF0ZSBjb3B5RmVhdHVyZShmZWF0dXJlOiBGZWF0dXJlKTogRmVhdHVyZSB7XG4gICAgcmV0dXJuIHsgLi4uZmVhdHVyZSB9O1xuICB9XG5cbiAgcHJpdmF0ZSBjb3B5Q2xhaW0oY2xhaW06IENsYWltUm93KTogQ2xhaW0ge1xuICAgIGNvbnN0IHsgdHRsTXM6IF90dGwsIC4uLnB1YiB9ID0gY2xhaW07XG4gICAgcmV0dXJuIHsgLi4ucHViIH07XG4gIH1cblxuICAvLyAtLSBzZXR1cCAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIGNyZWF0ZUFjdG9yKGlucHV0OiB7XG4gICAgdHlwZTogRXhjbHVkZTxBY3RvclR5cGUsICdzeXN0ZW0nPjtcbiAgICBkaXNwbGF5TmFtZTogc3RyaW5nO1xuICAgIGdvdmVybmFuY2VSb2xlPzogR292ZXJuYW5jZVJvbGU7XG4gICAgcGVyc29uYUNvZGU/OiBzdHJpbmc7XG4gIH0pOiBBY3RvciB7XG4gICAgY29uc3QgYWN0b3I6IEFjdG9yID0ge1xuICAgICAgaWQ6IHRoaXMubmV4dElkKCdhY3RvcicpLFxuICAgICAgdHlwZTogaW5wdXQudHlwZSxcbiAgICAgIGRpc3BsYXlOYW1lOiBpbnB1dC5kaXNwbGF5TmFtZSxcbiAgICAgIHBlcnNvbmFDb2RlOiBpbnB1dC5wZXJzb25hQ29kZSA/PyBudWxsLFxuICAgIH07XG4gICAgdGhpcy5hY3RvcnMuc2V0KGFjdG9yLmlkLCBhY3Rvcik7XG4gICAgdGhpcy5nb3Zlcm5hbmNlUm9sZXMuc2V0KGFjdG9yLmlkLCBpbnB1dC5nb3Zlcm5hbmNlUm9sZSA/PyAnbWVtYmVyJyk7XG4gICAgcmV0dXJuIHsgLi4uYWN0b3IgfTtcbiAgfVxuXG4gIGdyYW50KGlucHV0OiB7IGFjdG9ySWQ6IHN0cmluZzsgcGVybWlzc2lvbjogUGVybWlzc2lvbjsgc2NvcGU/OiBzdHJpbmcgfSk6IHZvaWQge1xuICAgIHRoaXMuY2hlY2tHcmFudENlaWxpbmcoaW5wdXQuYWN0b3JJZCwgaW5wdXQucGVybWlzc2lvbik7XG4gICAgY29uc3Qgc2V0ID0gdGhpcy5ncmFudHMuZ2V0KGlucHV0LmFjdG9ySWQpID8/IG5ldyBTZXQ8c3RyaW5nPigpO1xuICAgIHNldC5hZGQoaW5wdXQucGVybWlzc2lvbik7XG4gICAgdGhpcy5ncmFudHMuc2V0KGlucHV0LmFjdG9ySWQsIHNldCk7XG4gICAgdGhpcy5hcHBlbmQoJ2FjdG9yJywgaW5wdXQuYWN0b3JJZCwgJ2dyYW50Lmlzc3VlZCcsIHRoaXMuc3lzdGVtQWN0b3JJZCwgeyBwZXJtaXNzaW9uOiBpbnB1dC5wZXJtaXNzaW9uIH0pO1xuICB9XG5cbiAgcmV2b2tlKGlucHV0OiB7IGFjdG9ySWQ6IHN0cmluZzsgcGVybWlzc2lvbjogUGVybWlzc2lvbjsgc2NvcGU/OiBzdHJpbmcgfSk6IHZvaWQge1xuICAgIHRoaXMuZ3JhbnRzLmdldChpbnB1dC5hY3RvcklkKT8uZGVsZXRlKGlucHV0LnBlcm1pc3Npb24pO1xuICAgIHRoaXMuYXBwZW5kKCdhY3RvcicsIGlucHV0LmFjdG9ySWQsICdncmFudC5yZXZva2VkJywgdGhpcy5zeXN0ZW1BY3RvcklkLCB7IHBlcm1pc3Npb246IGlucHV0LnBlcm1pc3Npb24gfSk7XG4gIH1cblxuICAvLyAtLSBlbnRpdGxlbWVudHMgKFBoYXNlIDIsIHJvYWRtYXAgXHUwMEE3MykgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIHNldEdvdmVybmFuY2VSb2xlKGlucHV0OiB7IGFjdG9ySWQ6IHN0cmluZzsgcm9sZTogR292ZXJuYW5jZVJvbGU7IGJ5QWN0b3JJZDogc3RyaW5nIH0pOiB2b2lkIHtcbiAgICB0aGlzLnJlcXVpcmVHb3Zlcm5hbmNlQWRtaW4oaW5wdXQuYnlBY3RvcklkKTtcbiAgICBpZiAoIXRoaXMuYWN0b3JzLmhhcyhpbnB1dC5hY3RvcklkKSkgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoYHVua25vd24gYWN0b3I6ICR7aW5wdXQuYWN0b3JJZH1gKTtcbiAgICB0aGlzLmdvdmVybmFuY2VSb2xlcy5zZXQoaW5wdXQuYWN0b3JJZCwgaW5wdXQucm9sZSk7XG4gICAgdGhpcy5hcHBlbmQoJ2FjdG9yJywgaW5wdXQuYWN0b3JJZCwgJ2dvdmVybmFuY2UuY2hhbmdlZCcsIGlucHV0LmJ5QWN0b3JJZCwgeyByb2xlOiBpbnB1dC5yb2xlIH0pO1xuICB9XG5cbiAgZ2V0R292ZXJuYW5jZVJvbGUoYWN0b3JJZDogc3RyaW5nKTogR292ZXJuYW5jZVJvbGUge1xuICAgIHJldHVybiB0aGlzLmdvdmVybmFuY2VSb2xlcy5nZXQoYWN0b3JJZCkgPz8gJ21lbWJlcic7XG4gIH1cblxuICBhc3NpZ25Sb2xlKGlucHV0OiB7IGFjdG9ySWQ6IHN0cmluZzsgcm9sZUNvZGU6IHN0cmluZzsgYnlBY3RvcklkOiBzdHJpbmcgfSk6IHZvaWQge1xuICAgIHRoaXMucmVxdWlyZUdvdmVybmFuY2VBZG1pbihpbnB1dC5ieUFjdG9ySWQpO1xuICAgIGNvbnN0IGJ1bmRsZSA9IERFTElWRVJZX1JPTEVTW2lucHV0LnJvbGVDb2RlXTtcbiAgICBpZiAoYnVuZGxlID09PSB1bmRlZmluZWQpIHRocm93IG5ldyBHdWFyZEZhaWxlZEVycm9yKGB1bmtub3duIGRlbGl2ZXJ5IHJvbGU6ICR7aW5wdXQucm9sZUNvZGV9YCk7XG4gICAgaWYgKCF0aGlzLmFjdG9ycy5oYXMoaW5wdXQuYWN0b3JJZCkpIHRocm93IG5ldyBHdWFyZEZhaWxlZEVycm9yKGB1bmtub3duIGFjdG9yOiAke2lucHV0LmFjdG9ySWR9YCk7XG4gICAgZm9yIChjb25zdCBwZXJtaXNzaW9uIG9mIGJ1bmRsZSkge1xuICAgICAgdGhpcy5jaGVja0dyYW50Q2VpbGluZyhpbnB1dC5hY3RvcklkLCBwZXJtaXNzaW9uKTtcbiAgICB9XG4gICAgY29uc3QgYWN0aXZlID0gdGhpcy5yb2xlQXNzaWdubWVudHMuc29tZShcbiAgICAgIChhKSA9PiBhLmFjdG9ySWQgPT09IGlucHV0LmFjdG9ySWQgJiYgYS5yb2xlQ29kZSA9PT0gaW5wdXQucm9sZUNvZGUgJiYgIWEucmV2b2tlZCxcbiAgICApO1xuICAgIGlmIChhY3RpdmUpIHJldHVybjsgLy8gaWRlbXBvdGVudFxuICAgIHRoaXMucm9sZUFzc2lnbm1lbnRzLnB1c2goe1xuICAgICAgYWN0b3JJZDogaW5wdXQuYWN0b3JJZCxcbiAgICAgIHJvbGVDb2RlOiBpbnB1dC5yb2xlQ29kZSxcbiAgICAgIGdyYW50ZWRCeTogaW5wdXQuYnlBY3RvcklkLFxuICAgICAgcmV2b2tlZDogZmFsc2UsXG4gICAgfSk7XG4gICAgdGhpcy5hcHBlbmQoJ2FjdG9yJywgaW5wdXQuYWN0b3JJZCwgJ3JvbGUuYXNzaWduZWQnLCBpbnB1dC5ieUFjdG9ySWQsIHsgcm9sZUNvZGU6IGlucHV0LnJvbGVDb2RlIH0pO1xuICB9XG5cbiAgcmV2b2tlUm9sZShpbnB1dDogeyBhY3RvcklkOiBzdHJpbmc7IHJvbGVDb2RlOiBzdHJpbmc7IGJ5QWN0b3JJZDogc3RyaW5nIH0pOiB2b2lkIHtcbiAgICB0aGlzLnJlcXVpcmVHb3Zlcm5hbmNlQWRtaW4oaW5wdXQuYnlBY3RvcklkKTtcbiAgICBpZiAoREVMSVZFUllfUk9MRVNbaW5wdXQucm9sZUNvZGVdID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRocm93IG5ldyBHdWFyZEZhaWxlZEVycm9yKGB1bmtub3duIGRlbGl2ZXJ5IHJvbGU6ICR7aW5wdXQucm9sZUNvZGV9YCk7XG4gICAgfVxuICAgIGZvciAoY29uc3QgYXNzaWdubWVudCBvZiB0aGlzLnJvbGVBc3NpZ25tZW50cykge1xuICAgICAgaWYgKGFzc2lnbm1lbnQuYWN0b3JJZCA9PT0gaW5wdXQuYWN0b3JJZCAmJiBhc3NpZ25tZW50LnJvbGVDb2RlID09PSBpbnB1dC5yb2xlQ29kZSAmJiAhYXNzaWdubWVudC5yZXZva2VkKSB7XG4gICAgICAgIGFzc2lnbm1lbnQucmV2b2tlZCA9IHRydWU7XG4gICAgICB9XG4gICAgfVxuICAgIHRoaXMuYXBwZW5kKCdhY3RvcicsIGlucHV0LmFjdG9ySWQsICdyb2xlLnJldm9rZWQnLCBpbnB1dC5ieUFjdG9ySWQsIHsgcm9sZUNvZGU6IGlucHV0LnJvbGVDb2RlIH0pO1xuICB9XG5cbiAgbGlzdFJvbGVBc3NpZ25tZW50cyhhY3RvcklkPzogc3RyaW5nKTogUm9sZUFzc2lnbm1lbnRbXSB7XG4gICAgcmV0dXJuIHRoaXMucm9sZUFzc2lnbm1lbnRzXG4gICAgICAuZmlsdGVyKChhKSA9PiBhY3RvcklkID09PSB1bmRlZmluZWQgfHwgYS5hY3RvcklkID09PSBhY3RvcklkKVxuICAgICAgLm1hcCgoYSkgPT4gKHsgLi4uYSB9KSk7XG4gIH1cblxuICBzZXRQbGFuKGlucHV0OiB7IHBsYW46IFBsYW5Db2RlOyBieUFjdG9ySWQ6IHN0cmluZyB9KTogdm9pZCB7XG4gICAgdGhpcy5yZXF1aXJlR292ZXJuYW5jZUFkbWluKGlucHV0LmJ5QWN0b3JJZCk7XG4gICAgaWYgKFBMQU5fQ0VJTElOR1NbaW5wdXQucGxhbl0gPT09IHVuZGVmaW5lZCkgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoYHVua25vd24gcGxhbjogJHtpbnB1dC5wbGFufWApO1xuICAgIHRoaXMucGxhbiA9IGlucHV0LnBsYW47XG4gICAgdGhpcy5wbGFuVmVyc2lvbiArPSAxO1xuICAgIHRoaXMuYXBwZW5kKCd3b3Jrc3BhY2UnLCAnd29ya3NwYWNlJywgJ3BsYW4uY2hhbmdlZCcsIGlucHV0LmJ5QWN0b3JJZCwge1xuICAgICAgcGxhbjogaW5wdXQucGxhbixcbiAgICAgIHBsYW5WZXJzaW9uOiB0aGlzLnBsYW5WZXJzaW9uLFxuICAgIH0pO1xuICB9XG5cbiAgZ2V0UGxhbigpOiBQbGFuQ29kZSB7XG4gICAgcmV0dXJuIHRoaXMucGxhbjtcbiAgfVxuXG4gIHNldFdvcmtzcGFjZVBvbGljeShpbnB1dDogeyBwb2xpY3k6IFdvcmtzcGFjZVBvbGljeTsgYnlBY3RvcklkOiBzdHJpbmcgfSk6IHZvaWQge1xuICAgIHRoaXMucmVxdWlyZUdvdmVybmFuY2VBZG1pbihpbnB1dC5ieUFjdG9ySWQpO1xuICAgIHRoaXMud29ya3NwYWNlUG9saWN5ID0geyAuLi50aGlzLndvcmtzcGFjZVBvbGljeSwgLi4uaW5wdXQucG9saWN5IH07XG4gICAgdGhpcy5wb2xpY3lWZXJzaW9uICs9IDE7XG4gICAgdGhpcy5hcHBlbmQoJ3dvcmtzcGFjZScsICd3b3Jrc3BhY2UnLCAncG9saWN5LmNoYW5nZWQnLCBpbnB1dC5ieUFjdG9ySWQsIHtcbiAgICAgIHBvbGljeTogeyAuLi50aGlzLndvcmtzcGFjZVBvbGljeSB9LFxuICAgICAgcG9saWN5VmVyc2lvbjogdGhpcy5wb2xpY3lWZXJzaW9uLFxuICAgIH0pO1xuICB9XG5cbiAgZ2V0V29ya3NwYWNlUG9saWN5KCk6IFdvcmtzcGFjZVBvbGljeSB7XG4gICAgcmV0dXJuIHsgLi4udGhpcy53b3Jrc3BhY2VQb2xpY3kgfTtcbiAgfVxuXG4gIHNldEdhdGVQb2xpY3koaW5wdXQ6IHsgZ2F0ZTogR2F0ZUNvZGU7IHBvbGljeTogR2F0ZVBvbGljeTsgYnlBY3RvcklkOiBzdHJpbmcgfSk6IHZvaWQge1xuICAgIHRoaXMucmVxdWlyZUdvdmVybmFuY2VBZG1pbihpbnB1dC5ieUFjdG9ySWQpO1xuICAgIGNvbnN0IG1pbkFwcHJvdmFscyA9IGlucHV0LnBvbGljeS5taW5BcHByb3ZhbHMgPz8gMTtcbiAgICBpZiAoIU51bWJlci5pc0ludGVnZXIobWluQXBwcm92YWxzKSB8fCBtaW5BcHByb3ZhbHMgPCAxKSB7XG4gICAgICB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcignbWluQXBwcm92YWxzIG11c3QgYmUgYSBwb3NpdGl2ZSBpbnRlZ2VyJyk7XG4gICAgfVxuICAgIHRoaXMuZ2F0ZVBvbGljaWVzLnNldChpbnB1dC5nYXRlLCB7IC4uLmlucHV0LnBvbGljeSB9KTtcbiAgICB0aGlzLmFwcGVuZCgnd29ya3NwYWNlJywgJ3dvcmtzcGFjZScsICdnYXRlX3BvbGljeS5jaGFuZ2VkJywgaW5wdXQuYnlBY3RvcklkLCB7XG4gICAgICBnYXRlOiBpbnB1dC5nYXRlLFxuICAgICAgcG9saWN5OiB7IC4uLmlucHV0LnBvbGljeSB9LFxuICAgIH0pO1xuICB9XG5cbiAgZ2V0R2F0ZVBvbGljeShnYXRlOiBHYXRlQ29kZSk6IEdhdGVQb2xpY3kge1xuICAgIHJldHVybiB7IC4uLih0aGlzLmdhdGVQb2xpY2llcy5nZXQoZ2F0ZSkgPz8ge30pIH07XG4gIH1cblxuICBsaXN0QWN0b3JzKCk6IEFjdG9yW10ge1xuICAgIHJldHVybiBbLi4udGhpcy5hY3RvcnMudmFsdWVzKCldLm1hcCgoYSkgPT4gKHsgLi4uYSB9KSk7XG4gIH1cblxuICBwcm92aXNpb25QZXJzb25hcyhpbnB1dDogeyBieUFjdG9ySWQ6IHN0cmluZyB9KTogQWN0b3JbXSB7XG4gICAgdGhpcy5yZXF1aXJlR292ZXJuYW5jZUFkbWluKGlucHV0LmJ5QWN0b3JJZCk7XG4gICAgY29uc3QgcHJvdmlzaW9uZWQ6IEFjdG9yW10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IHBlcnNvbmEgb2YgUEVSU09OQVMpIHtcbiAgICAgIGxldCBhY3RvciA9IFsuLi50aGlzLmFjdG9ycy52YWx1ZXMoKV0uZmluZCgoYSkgPT4gYS5wZXJzb25hQ29kZSA9PT0gcGVyc29uYS5wZXJzb25hQ29kZSk7XG4gICAgICBpZiAoIWFjdG9yKSB7XG4gICAgICAgIGFjdG9yID0gdGhpcy5jcmVhdGVBY3Rvcih7XG4gICAgICAgICAgdHlwZTogJ2FnZW50JyxcbiAgICAgICAgICBkaXNwbGF5TmFtZTogcGVyc29uYS5kaXNwbGF5TmFtZSxcbiAgICAgICAgICBwZXJzb25hQ29kZTogcGVyc29uYS5wZXJzb25hQ29kZSxcbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMuYXBwZW5kKCdhY3RvcicsIGFjdG9yLmlkLCAnYWN0b3IucHJvdmlzaW9uZWQnLCBpbnB1dC5ieUFjdG9ySWQsIHtcbiAgICAgICAgICBwZXJzb25hQ29kZTogcGVyc29uYS5wZXJzb25hQ29kZSxcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICAvLyBGbG9vci1zdGF0ZSByb2xlICh0aGVzaXMpOiBhc3NpZ25Sb2xlIGlzIGlkZW1wb3RlbnQuXG4gICAgICB0aGlzLmFzc2lnblJvbGUoeyBhY3RvcklkOiBhY3Rvci5pZCwgcm9sZUNvZGU6IHBlcnNvbmEuZGVmYXVsdFJvbGUsIGJ5QWN0b3JJZDogaW5wdXQuYnlBY3RvcklkIH0pO1xuICAgICAgcHJvdmlzaW9uZWQucHVzaCh7IC4uLmFjdG9yIH0pO1xuICAgIH1cbiAgICByZXR1cm4gcHJvdmlzaW9uZWQ7XG4gIH1cblxuICBhdXRoekV4cGxhaW4oaW5wdXQ6IHsgYWN0b3JJZDogc3RyaW5nOyBwZXJtaXNzaW9uOiBQZXJtaXNzaW9uIH0pOiBBdXRoekV4cGxhbmF0aW9uIHtcbiAgICBjb25zdCBzb3VyY2UgPSB0aGlzLmdyYW50U291cmNlKGlucHV0LmFjdG9ySWQsIGlucHV0LnBlcm1pc3Npb24pO1xuICAgIGNvbnN0IGFsbG93cyA9IHRoaXMuYWdlbnRDZWlsaW5nQWxsb3dzKHRoaXMuYWN0b3JzLmdldChpbnB1dC5hY3RvcklkKSwgaW5wdXQucGVybWlzc2lvbik7XG4gICAgcmV0dXJuIHtcbiAgICAgIGFjdG9ySWQ6IGlucHV0LmFjdG9ySWQsXG4gICAgICBwZXJtaXNzaW9uOiBpbnB1dC5wZXJtaXNzaW9uLFxuICAgICAgYWxsb3dlZDogc291cmNlICE9PSBudWxsICYmIGFsbG93cy5wbGFuICYmIGFsbG93cy5wb2xpY3ksXG4gICAgICBzb3VyY2UsXG4gICAgICBnb3Zlcm5hbmNlUm9sZTogdGhpcy5nZXRHb3Zlcm5hbmNlUm9sZShpbnB1dC5hY3RvcklkKSxcbiAgICAgIHBsYW46IHRoaXMucGxhbixcbiAgICAgIHBsYW5BbGxvd3M6IGFsbG93cy5wbGFuLFxuICAgICAgcG9saWN5QWxsb3dzOiBhbGxvd3MucG9saWN5LFxuICAgICAgdmVyc2lvbnM6IHsgcGxhbjogdGhpcy5wbGFuVmVyc2lvbiwgcG9saWN5OiB0aGlzLnBvbGljeVZlcnNpb24gfSxcbiAgICB9O1xuICB9XG5cbiAgY3JlYXRlRmVhdHVyZShpbnB1dDogeyBhY3RvcklkOiBzdHJpbmcgfSk6IEZlYXR1cmUge1xuICAgIGNvbnN0IGZlYXR1cmU6IEZlYXR1cmUgPSB7IGlkOiB0aGlzLm5leHRJZCgnZmVhdCcpLCBzdGF0ZTogJ2JhY2tsb2cnLCBkaXNwYXRjaEhvbGQ6IGZhbHNlIH07XG4gICAgdGhpcy5mZWF0dXJlcy5zZXQoZmVhdHVyZS5pZCwgZmVhdHVyZSk7XG4gICAgdGhpcy5hcHBlbmQoJ2ZlYXR1cmUnLCBmZWF0dXJlLmlkLCAnZmVhdHVyZS5jcmVhdGVkJywgaW5wdXQuYWN0b3JJZCwge30pO1xuICAgIHJldHVybiB0aGlzLmNvcHlGZWF0dXJlKGZlYXR1cmUpO1xuICB9XG5cbiAgY3JlYXRlV29ya0l0ZW0oaW5wdXQ6IENyZWF0ZVdvcmtJdGVtSW5wdXQgJiB7IGFjdG9ySWQ6IHN0cmluZyB9KTogV29ya0l0ZW0ge1xuICAgIGNvbnN0IHNsdWcgPSBpbnB1dC50aXRsZVxuICAgICAgLnRvTG93ZXJDYXNlKClcbiAgICAgIC5yZXBsYWNlKC9bXmEtejAtOV0rL2csICctJylcbiAgICAgIC5yZXBsYWNlKC8oXi18LSQpL2csICcnKTtcbiAgICBjb25zdCBpdGVtOiBXb3JrSXRlbVJvdyA9IHtcbiAgICAgIGlkOiB0aGlzLm5leHRJZCgnd2knKSxcbiAgICAgIGZlYXR1cmVJZDogaW5wdXQuZmVhdHVyZUlkLFxuICAgICAgZXh0ZXJuYWxLZXk6IGlucHV0LmV4dGVybmFsS2V5LFxuICAgICAga2luZDogaW5wdXQua2luZCA/PyAnY29kZScsXG4gICAgICB0aXRsZTogaW5wdXQudGl0bGUsXG4gICAgICBzdGF0ZTogJ2JhY2tsb2cnLFxuICAgICAgYmxvY2tlZFJlYXNvbjogbnVsbCxcbiAgICAgIHJldmlld0xvb3BJdGVyYXRpb246IDAsXG4gICAgICBpbnRlbnRIYXNoOiBudWxsLFxuICAgICAgcGlubmVkVmVyaWZpY2F0aW9uOiBudWxsLFxuICAgICAgc3BlY0NoZWNrcG9pbnQ6IGlucHV0LnNwZWNDaGVja3BvaW50ID8/IGZhbHNlLFxuICAgICAgZG9uZUNoZWNrcG9pbnQ6IGlucHV0LmRvbmVDaGVja3BvaW50ID8/IGZhbHNlLFxuICAgICAgaW52b2tlRGV2V2l0aDogaW5wdXQuaW52b2tlRGV2V2l0aCA/PyAnJyxcbiAgICAgIHNwZWNQYXRoOiBgc3Rvcmllcy8ke2lucHV0LmV4dGVybmFsS2V5fS0ke3NsdWd9Lm1kYCxcbiAgICAgIHN0YXRlVmVyc2lvbjogMCxcbiAgICAgIGRlcGVuZHNPbjogaW5wdXQuZGVwZW5kc09uID8gWy4uLmlucHV0LmRlcGVuZHNPbl0gOiBbXSxcbiAgICB9O1xuICAgIHRoaXMud29ya0l0ZW1zLnNldChpdGVtLmlkLCBpdGVtKTtcbiAgICBpZiAoIXRoaXMuZXh0ZXJuYWxLZXlJbmRleC5oYXMoaXRlbS5leHRlcm5hbEtleSkpIHtcbiAgICAgIHRoaXMuZXh0ZXJuYWxLZXlJbmRleC5zZXQoaXRlbS5leHRlcm5hbEtleSwgaXRlbS5pZCk7XG4gICAgfVxuICAgIHRoaXMuYXBwZW5kKCd3b3JrX2l0ZW0nLCBpdGVtLmlkLCAnd29ya19pdGVtLmNyZWF0ZWQnLCBpbnB1dC5hY3RvcklkLCB7XG4gICAgICBleHRlcm5hbEtleTogaXRlbS5leHRlcm5hbEtleSxcbiAgICAgIGZlYXR1cmVJZDogaXRlbS5mZWF0dXJlSWQsXG4gICAgfSk7XG4gICAgcmV0dXJuIHRoaXMuY29weUl0ZW0oaXRlbSk7XG4gIH1cblxuICBpbXBvcnRTdG9yaWVzKGlucHV0OiB7IGZlYXR1cmVJZDogc3RyaW5nOyB5YW1sOiBzdHJpbmc7IGFjdG9ySWQ6IHN0cmluZyB9KTogU3Rvcmllc0ltcG9ydFJlc3VsdCB7XG4gICAgY29uc3QgZW50cmllcyA9IHBhcnNlU3RvcmllcyhpbnB1dC55YW1sKTtcbiAgICBpZiAoIXRoaXMuZmVhdHVyZXMuaGFzKGlucHV0LmZlYXR1cmVJZCkpIHtcbiAgICAgIHRocm93IG5ldyBTdG9yaWVzVmFsaWRhdGlvbkVycm9yKGB1bmtub3duIGZlYXR1cmU6ICR7aW5wdXQuZmVhdHVyZUlkfWApO1xuICAgIH1cbiAgICBjb25zdCBpbXBvcnRlZDogc3RyaW5nW10gPSBbXTtcbiAgICBjb25zdCB1cGRhdGVkOiBzdHJpbmdbXSA9IFtdO1xuICAgIGNvbnN0IHdhcm5pbmdzOiBzdHJpbmdbXSA9IFtdO1xuXG4gICAgZm9yIChjb25zdCBlbnRyeSBvZiBlbnRyaWVzKSB7XG4gICAgICBjb25zdCBleGlzdGluZyA9IFsuLi50aGlzLndvcmtJdGVtcy52YWx1ZXMoKV0uZmluZChcbiAgICAgICAgKHdpKSA9PiB3aS5mZWF0dXJlSWQgPT09IGlucHV0LmZlYXR1cmVJZCAmJiB3aS5leHRlcm5hbEtleSA9PT0gZW50cnkuaWQsXG4gICAgICApO1xuICAgICAgaWYgKGV4aXN0aW5nKSB7XG4gICAgICAgIC8vIFJlLWltcG9ydCByZWZyZXNoZXMgZGVzY3JpcHRpdmUgZmllbGRzOyBsaWZlY3ljbGUgc3RhdGUgaXMgbmV2ZXJcbiAgICAgICAgLy8gdG91Y2hlZCAoc3Rvcmllcy55YW1sIGNhcnJpZXMgbm8gc3RhdHVzIFx1MjAxNCBEOSwgdmFsaWRpdHkgcnVsZSAzKS5cbiAgICAgICAgZXhpc3RpbmcudGl0bGUgPSBlbnRyeS50aXRsZTtcbiAgICAgICAgZXhpc3Rpbmcuc3BlY0NoZWNrcG9pbnQgPSBlbnRyeS5zcGVjQ2hlY2twb2ludDtcbiAgICAgICAgZXhpc3RpbmcuZG9uZUNoZWNrcG9pbnQgPSBlbnRyeS5kb25lQ2hlY2twb2ludDtcbiAgICAgICAgZXhpc3RpbmcuaW52b2tlRGV2V2l0aCA9IGVudHJ5Lmludm9rZURldldpdGg7XG4gICAgICAgIHRoaXMuYXBwZW5kKCd3b3JrX2l0ZW0nLCBleGlzdGluZy5pZCwgJ3dvcmtfaXRlbS5yZWltcG9ydGVkJywgaW5wdXQuYWN0b3JJZCwgeyBleHRlcm5hbEtleTogZW50cnkuaWQgfSk7XG4gICAgICAgIHVwZGF0ZWQucHVzaChlbnRyeS5pZCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmNyZWF0ZVdvcmtJdGVtKHtcbiAgICAgICAgICBmZWF0dXJlSWQ6IGlucHV0LmZlYXR1cmVJZCxcbiAgICAgICAgICBleHRlcm5hbEtleTogZW50cnkuaWQsXG4gICAgICAgICAgdGl0bGU6IGVudHJ5LnRpdGxlLFxuICAgICAgICAgIHNwZWNDaGVja3BvaW50OiBlbnRyeS5zcGVjQ2hlY2twb2ludCxcbiAgICAgICAgICBkb25lQ2hlY2twb2ludDogZW50cnkuZG9uZUNoZWNrcG9pbnQsXG4gICAgICAgICAgaW52b2tlRGV2V2l0aDogZW50cnkuaW52b2tlRGV2V2l0aCxcbiAgICAgICAgICBhY3RvcklkOiBpbnB1dC5hY3RvcklkLFxuICAgICAgICB9KTtcbiAgICAgICAgaW1wb3J0ZWQucHVzaChlbnRyeS5pZCk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB7IGltcG9ydGVkLCB1cGRhdGVkLCB3YXJuaW5ncyB9O1xuICB9XG5cbiAgLy8gLS0gY2xhaW1zIChyb2FkbWFwIFx1MDBBNzEuMykgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgY2xhaW1UYXNrKGlucHV0OiB7IHdvcmtJdGVtSWQ6IHN0cmluZzsgYWN0b3JJZDogc3RyaW5nOyB0dGxNcz86IG51bWJlciB9KTogQ2xhaW0ge1xuICAgIGNvbnN0IGl0ZW0gPSB0aGlzLm11c3RHZXRJdGVtKGlucHV0LndvcmtJdGVtSWQpO1xuICAgIHRoaXMucmVxdWlyZVBlcm1pc3Npb24oaW5wdXQuYWN0b3JJZCwgJ3Rhc2suY2xhaW0nKTtcbiAgICBpZiAodGhpcy5saXZlQ2xhaW0oaXRlbS5pZCkgIT09IG51bGwpIHtcbiAgICAgIC8vIE9uZSBsaXZlIGNsYWltIHBlciB3b3JrIGl0ZW0gXHUyMDE0IHJhY2VzIGxvc2UgYnkgY29uc3RyYWludCAoXHUwMEE3MS4zKTtcbiAgICAgIC8vIHRoZSBsb3NlciBsZWF2ZXMgbm8gcm93IGJlaGluZC5cbiAgICAgIHRocm93IG5ldyBDb25mbGljdEVycm9yKGB3b3JrIGl0ZW0gJHtpdGVtLmlkfSBhbHJlYWR5IGhhcyBhIGxpdmUgY2xhaW1gKTtcbiAgICB9XG4gICAgY29uc3QgdHRsTXMgPSBpbnB1dC50dGxNcyA/PyAxNSAqIDYwICogMTAwMDtcbiAgICBjb25zdCB0b2tlbiA9ICh0aGlzLmZlbmNpbmdDb3VudGVyLmdldChpdGVtLmlkKSA/PyAwKSArIDE7XG4gICAgdGhpcy5mZW5jaW5nQ291bnRlci5zZXQoaXRlbS5pZCwgdG9rZW4pO1xuICAgIGNvbnN0IGNsYWltOiBDbGFpbVJvdyA9IHtcbiAgICAgIGlkOiB0aGlzLm5leHRJZCgnY2xhaW0nKSxcbiAgICAgIHdvcmtJdGVtSWQ6IGl0ZW0uaWQsXG4gICAgICBhY3RvcklkOiBpbnB1dC5hY3RvcklkLFxuICAgICAgZmVuY2luZ1Rva2VuOiB0b2tlbixcbiAgICAgIGxlYXNlRXhwaXJlc0F0OiB0aGlzLm5vdyArIHR0bE1zLFxuICAgICAgcmVsZWFzZWQ6IGZhbHNlLFxuICAgICAgdHRsTXMsXG4gICAgfTtcbiAgICB0aGlzLmNsYWltcy5zZXQoY2xhaW0uaWQsIGNsYWltKTtcbiAgICB0aGlzLmNsYWltc0J5SXRlbS5zZXQoaXRlbS5pZCwgWy4uLih0aGlzLmNsYWltc0J5SXRlbS5nZXQoaXRlbS5pZCkgPz8gW10pLCBjbGFpbS5pZF0pO1xuICAgIHRoaXMuYXBwZW5kKCd3b3JrX2l0ZW0nLCBpdGVtLmlkLCAnd29ya19pdGVtLmNsYWltZWQnLCBpbnB1dC5hY3RvcklkLCB7IGNsYWltSWQ6IGNsYWltLmlkLCBmZW5jaW5nVG9rZW46IHRva2VuIH0pO1xuICAgIHJldHVybiB0aGlzLmNvcHlDbGFpbShjbGFpbSk7XG4gIH1cblxuICBoZWFydGJlYXQoaW5wdXQ6IHsgY2xhaW1JZDogc3RyaW5nIH0pOiB2b2lkIHtcbiAgICBjb25zdCBjbGFpbSA9IHRoaXMuY2xhaW1zLmdldChpbnB1dC5jbGFpbUlkKTtcbiAgICBpZiAoIWNsYWltIHx8IGNsYWltLnJlbGVhc2VkIHx8IGNsYWltLmxlYXNlRXhwaXJlc0F0IDw9IHRoaXMubm93KSB7XG4gICAgICB0aHJvdyBuZXcgQ29uZmxpY3RFcnJvcihgY2xhaW0gJHtpbnB1dC5jbGFpbUlkfSBpcyBub3QgbGl2ZWApO1xuICAgIH1cbiAgICBjbGFpbS5sZWFzZUV4cGlyZXNBdCA9IHRoaXMubm93ICsgY2xhaW0udHRsTXM7XG4gIH1cblxuICByZWxlYXNlQ2xhaW0oaW5wdXQ6IHsgY2xhaW1JZDogc3RyaW5nOyByZWFzb24/OiBzdHJpbmcgfSk6IHZvaWQge1xuICAgIGNvbnN0IGNsYWltID0gdGhpcy5jbGFpbXMuZ2V0KGlucHV0LmNsYWltSWQpO1xuICAgIGlmICghY2xhaW0gfHwgY2xhaW0ucmVsZWFzZWQpIHJldHVybjtcbiAgICBjbGFpbS5yZWxlYXNlZCA9IHRydWU7XG4gICAgdGhpcy5hcHBlbmQoJ3dvcmtfaXRlbScsIGNsYWltLndvcmtJdGVtSWQsICdjbGFpbS5yZWxlYXNlZCcsIGNsYWltLmFjdG9ySWQsIHtcbiAgICAgIGNsYWltSWQ6IGNsYWltLmlkLFxuICAgICAgcmVhc29uOiBpbnB1dC5yZWFzb24gPz8gbnVsbCxcbiAgICB9KTtcbiAgfVxuXG4gIGFkdmFuY2VDbG9jayhtczogbnVtYmVyKTogdm9pZCB7XG4gICAgdGhpcy5ub3cgKz0gbXM7XG4gIH1cblxuICAvLyAtLSBsaWZlY3ljbGUgKHJvYWRtYXAgXHUwMEE3MS4yKSAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIGFkdmFuY2VTdGF0ZShpbnB1dDogQWR2YW5jZUlucHV0KTogV29ya0l0ZW0ge1xuICAgIGNvbnN0IGl0ZW0gPSB0aGlzLm11c3RHZXRJdGVtKGlucHV0LndvcmtJdGVtSWQpO1xuXG4gICAgLy8gS2V5ZWQgcmVwbGF5OiB0aGUgc2FtZSBjb21tYW5kIHJldHVybnMgdGhlIHNhbWUgcmVzdWx0LCBhcHBlbmRzIG5vdGhpbmcuXG4gICAgaWYgKGlucHV0LmlkZW1wb3RlbmN5S2V5ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIGNvbnN0IGNhY2hlZCA9IHRoaXMuaWRlbXBvdGVuY3lDYWNoZS5nZXQoaW5wdXQuaWRlbXBvdGVuY3lLZXkpO1xuICAgICAgaWYgKGNhY2hlZCkgcmV0dXJuIHsgLi4uY2FjaGVkIH07XG4gICAgfVxuXG4gICAgLy8gUHJlc2VydmF0aW9uIG5vLW9wIChzcHJpbnQtcGxhbm5pbmcgaWRlbXBvdGVuY3kgcnVsZSk6IGFuIFVOS0VZRURcbiAgICAvLyByZS1yZXF1ZXN0IG9mIHRoZSBjdXJyZW50IHN0YXRlIHN1Y2NlZWRzIHdpdGhvdXQgYW4gZXZlbnQuIEEgTkVXIGtleWVkXG4gICAgLy8gY29tbWFuZCBpcyBhIGdlbnVpbmVseSBuZXcgY29tbWFuZCBhbmQgZmFsbHMgdGhyb3VnaCB0byB0aGUgc3RyaWN0XG4gICAgLy8gdGFibGUgY2hlY2sgKGNvbmN1cnJlbmN5LnRlc3QudHMgcGluKS5cbiAgICBpZiAoaW5wdXQuaWRlbXBvdGVuY3lLZXkgPT09IHVuZGVmaW5lZCAmJiBpbnB1dC50byA9PT0gaXRlbS5zdGF0ZSkge1xuICAgICAgdGhpcy52YWxpZGF0ZVByZXNlbnRlZFRva2VuKGl0ZW0sIGlucHV0LmZlbmNpbmdUb2tlbiwgaW5wdXQuYWN0b3JJZCk7XG4gICAgICByZXR1cm4gdGhpcy5jb3B5SXRlbShpdGVtKTtcbiAgICB9XG5cbiAgICAvLyBUcmFuc2l0aW9uLXRhYmxlIGxvb2t1cCBwcmVjZWRlcyBjbGFpbS90b2tlbi9wZXJtaXNzaW9uIGNoZWNrc1xuICAgIC8vIChmc20tdHJhbnNpdGlvbnMgcGluOiB1bmRlY2xhcmVkIGRvd25ncmFkZXMgYXJlIEludmFsaWRUcmFuc2l0aW9uRXJyb3JcbiAgICAvLyBldmVuIHdpdGggbm8gdG9rZW4gcHJlc2VudGVkKS5cbiAgICBjb25zdCBydWxlID0gVFJBTlNJVElPTlMuZmluZCgodCkgPT4gdC5mcm9tID09PSBpdGVtLnN0YXRlICYmIHQudG8gPT09IGlucHV0LnRvKTtcbiAgICBpZiAoIXJ1bGUpIHtcbiAgICAgIGlmIChSQU5LW2lucHV0LnRvXSA8IFJBTktbaXRlbS5zdGF0ZV0gJiYgdGhpcy5oYXNQZXJtaXNzaW9uKGlucHV0LmFjdG9ySWQsICdzdGF0ZS5kb3duZ3JhZGUnKSkge1xuICAgICAgICByZXR1cm4gdGhpcy5wcml2aWxlZ2VkRG93bmdyYWRlKGl0ZW0sIGlucHV0KTtcbiAgICAgIH1cbiAgICAgIHRocm93IG5ldyBJbnZhbGlkVHJhbnNpdGlvbkVycm9yKGl0ZW0uc3RhdGUsIGlucHV0LnRvKTtcbiAgICB9XG5cbiAgICB0aGlzLnZhbGlkYXRlUHJlc2VudGVkVG9rZW4oaXRlbSwgaW5wdXQuZmVuY2luZ1Rva2VuLCBpbnB1dC5hY3RvcklkKTtcblxuICAgIC8vIEJsb2NrZWQgb3ZlcmxheSBmcmVlemVzIHRyYW5zaXRpb25zIGF0IGV2ZXJ5IHN0YXRlIChEOCwgXHUwMEE3MS4xKS5cbiAgICBpZiAoaXRlbS5ibG9ja2VkUmVhc29uICE9PSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcihgd29yayBpdGVtIGlzIGJsb2NrZWQ6ICR7aXRlbS5ibG9ja2VkUmVhc29ufWApO1xuICAgIH1cblxuICAgIHRoaXMucmVxdWlyZVBlcm1pc3Npb24oaW5wdXQuYWN0b3JJZCwgcnVsZS5wZXJtaXNzaW9uKTtcblxuICAgIGlmIChydWxlLmNsYWltUmVxdWlyZWQpIHtcbiAgICAgIC8vIEV4ZWN1dGlvbi16b25lIHRyYW5zaXRpb25zIGRlbWFuZCBhIFBSRVNFTlRFRCBsaXZlIHRva2VuIFx1MjAxNCBob2xkaW5nXG4gICAgICAvLyB0aGUgY2xhaW0gd2l0aG91dCBwcmVzZW50aW5nIGl0IGlzIG5vdCBlbm91Z2ggKGNsYWltcy50ZXN0LnRzIHBpbikuXG4gICAgICBpZiAoaW5wdXQuZmVuY2luZ1Rva2VuID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoJ2NsYWltIGZlbmNpbmcgdG9rZW4gcmVxdWlyZWQgZm9yIHRoaXMgdHJhbnNpdGlvbicpO1xuICAgICAgfVxuICAgICAgLy8gKGFscmVhZHkgdmFsaWRhdGVkIGFib3ZlKVxuICAgIH1cblxuICAgIGZvciAoY29uc3QgZ3VhcmQgb2YgcnVsZS5ndWFyZHMpIHtcbiAgICAgIHRoaXMuY2hlY2tHdWFyZChndWFyZCwgaXRlbSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuZXhlY3V0ZVRyYW5zaXRpb24oaXRlbSwgaW5wdXQudG8sIGlucHV0LmFjdG9ySWQsIGlucHV0LmlkZW1wb3RlbmN5S2V5KTtcbiAgfVxuXG4gIHByaXZhdGUgY2hlY2tHdWFyZChndWFyZDogVHJhbnNpdGlvblJ1bGVbJ2d1YXJkcyddW251bWJlcl0sIGl0ZW06IFdvcmtJdGVtUm93KTogdm9pZCB7XG4gICAgc3dpdGNoIChndWFyZCkge1xuICAgICAgY2FzZSAnZGVwc19kb25lJzoge1xuICAgICAgICBmb3IgKGNvbnN0IGRlcEtleSBvZiBpdGVtLmRlcGVuZHNPbikge1xuICAgICAgICAgIGNvbnN0IGRlcCA9IFsuLi50aGlzLndvcmtJdGVtcy52YWx1ZXMoKV0uZmluZChcbiAgICAgICAgICAgICh3aSkgPT4gd2kuZmVhdHVyZUlkID09PSBpdGVtLmZlYXR1cmVJZCAmJiB3aS5leHRlcm5hbEtleSA9PT0gZGVwS2V5LFxuICAgICAgICAgICk7XG4gICAgICAgICAgaWYgKGRlcCAmJiBkZXAuc3RhdGUgIT09ICdkb25lJykge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoYGRlcGVuZGVuY3kgJHtkZXBLZXl9IGlzIG5vdCBkb25lYCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGNhc2UgJ3NwZWNfZ2F0ZV9pZl9jaGVja3BvaW50Jzoge1xuICAgICAgICBpZiAoIWl0ZW0uc3BlY0NoZWNrcG9pbnQpIHJldHVybjtcbiAgICAgICAgY29uc3QgYXBwcm92ZWQgPSB0aGlzLmdhdGVEZWNpc2lvbnMuc29tZShcbiAgICAgICAgICAoZCkgPT4gZC53b3JrSXRlbUlkID09PSBpdGVtLmlkICYmIGQuZ2F0ZSA9PT0gJ3NwZWNfYXBwcm92YWwnICYmIGQuZGVjaXNpb24gPT09ICdhcHByb3ZlZCcsXG4gICAgICAgICk7XG4gICAgICAgIGlmICghYXBwcm92ZWQpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcignc3BlY19jaGVja3BvaW50IHJlcXVpcmVzIGFuIGFwcHJvdmVkIHNwZWNfYXBwcm92YWwgZ2F0ZSBkZWNpc2lvbicpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGNhc2UgJ25vbmVtcHR5X2RpZmYnOiB7XG4gICAgICAgIC8vIFBoYXNlIDQgKHJvYWRtYXAgXHUwMEE3MS40KToga2luZCBzZWxlY3RzIFdISUNIIG1hY2hpbmUgZXZpZGVuY2UgYXBwbGllcy5cbiAgICAgICAgaWYgKGl0ZW0ua2luZCAhPT0gJ2NvZGUnKSB7XG4gICAgICAgICAgLy8gRG9jIGtpbmRzOiB0aGUgbGF0ZXN0IGRvY19saW50IChpZiBhbnkpIG11c3QgYmUgc2NoZW1hLXZhbGlkO1xuICAgICAgICAgIC8vIGdpdF9kaWZmIGlzIG5ldmVyIGNvbnN1bHRlZCBmb3Igbm9uLWNvZGUgZGVsaXZlcmFibGVzLlxuICAgICAgICAgIGNvbnN0IGxpbnRzID0gdGhpcy5ldmlkZW5jZVJvd3MuZmlsdGVyKFxuICAgICAgICAgICAgKHJvdykgPT4gcm93LndvcmtJdGVtSWQgPT09IGl0ZW0uaWQgJiYgcm93LmV2aWRlbmNlLmtpbmQgPT09ICdkb2NfbGludCcsXG4gICAgICAgICAgKTtcbiAgICAgICAgICBjb25zdCBsYXRlc3RMaW50ID0gbGludHNbbGludHMubGVuZ3RoIC0gMV07XG4gICAgICAgICAgaWYgKGxhdGVzdExpbnQgJiYgbGF0ZXN0TGludC5ldmlkZW5jZS5wYXlsb2FkWydzY2hlbWFWYWxpZCddICE9PSB0cnVlKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcigndGhlIGxhdGVzdCBkb2NfbGludCBldmlkZW5jZSBmYWlsZWQgXHUyMDE0IGRvY3VtZW50IGlzIG5vdCBzY2hlbWEtdmFsaWQnKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIC8vIEFyYml0cmF0ZWQgKENPTkZPUk1BTkNFLm1kIFwiRXZpZGVuY2VcIik6IHRoZSBMQVRFU1Qgc3VibWl0dGVkXG4gICAgICAgIC8vIGdpdF9kaWZmLCBpZiBhbnksIG11c3QgYmUgbm9uLWVtcHR5IFx1MjAxNCBhbiBlbXB0eSBkaWZmIGlzIHRoZVxuICAgICAgICAvLyBmYWtlLWRvbmUgZGVueS4gQWJzZW5jZSBpcyBub3QgY2hlY2tlZCBhdCB0aGlzIHRyYW5zaXRpb24gKHRoZVxuICAgICAgICAvLyBydW5uZXIgY29udHJhY3Qgc3VibWl0cyB0aGUgZGlmZiBiZWZvcmUgcmVxdWVzdGluZyByZXZpZXcsIGFuZCB0aGVcbiAgICAgICAgLy8gZG9uZSBnYXRlIGluZGVwZW5kZW50bHkgZGVtYW5kcyByZW1vdGUtcmVhY2hhYmxlIGNvbW1pdCBldmlkZW5jZSkuXG4gICAgICAgIGNvbnN0IGRpZmZzID0gdGhpcy5ldmlkZW5jZVJvd3MuZmlsdGVyKFxuICAgICAgICAgIChyb3cpID0+IHJvdy53b3JrSXRlbUlkID09PSBpdGVtLmlkICYmIHJvdy5ldmlkZW5jZS5raW5kID09PSAnZ2l0X2RpZmYnLFxuICAgICAgICApO1xuICAgICAgICBjb25zdCBsYXRlc3QgPSBkaWZmc1tkaWZmcy5sZW5ndGggLSAxXTtcbiAgICAgICAgaWYgKGxhdGVzdCAmJiBsYXRlc3QuZXZpZGVuY2UucGF5bG9hZFsnbm9uRW1wdHknXSAhPT0gdHJ1ZSkge1xuICAgICAgICAgIHRocm93IG5ldyBHdWFyZEZhaWxlZEVycm9yKCd0aGUgbGF0ZXN0IGdpdF9kaWZmIGV2aWRlbmNlIGlzIGVtcHR5IFx1MjAxNCBub3RoaW5nIHRvIHJldmlldycpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBwcml2YXRlIHByaXZpbGVnZWREb3duZ3JhZGUoaXRlbTogV29ya0l0ZW1Sb3csIGlucHV0OiBBZHZhbmNlSW5wdXQpOiBXb3JrSXRlbSB7XG4gICAgdGhpcy52YWxpZGF0ZVByZXNlbnRlZFRva2VuKGl0ZW0sIGlucHV0LmZlbmNpbmdUb2tlbiwgaW5wdXQuYWN0b3JJZCk7XG4gICAgaWYgKGl0ZW0uYmxvY2tlZFJlYXNvbiAhPT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoYHdvcmsgaXRlbSBpcyBibG9ja2VkOiAke2l0ZW0uYmxvY2tlZFJlYXNvbn1gKTtcbiAgICB9XG4gICAgY29uc3QgZnJvbSA9IGl0ZW0uc3RhdGU7XG4gICAgaXRlbS5zdGF0ZSA9IGlucHV0LnRvO1xuICAgIGl0ZW0uc3RhdGVWZXJzaW9uICs9IDE7XG4gICAgdGhpcy5hcHBlbmQoXG4gICAgICAnd29ya19pdGVtJyxcbiAgICAgIGl0ZW0uaWQsXG4gICAgICAnd29ya19pdGVtLnN0YXRlX2Rvd25ncmFkZWQnLFxuICAgICAgaW5wdXQuYWN0b3JJZCxcbiAgICAgIHsgZnJvbSwgdG86IGlucHV0LnRvLCBjb21wZW5zYXRpbmc6IHRydWUgfSxcbiAgICAgIGlucHV0LmlkZW1wb3RlbmN5S2V5ICE9PSB1bmRlZmluZWQgPyB7IGlkZW1wb3RlbmN5S2V5OiBpbnB1dC5pZGVtcG90ZW5jeUtleSB9IDogdW5kZWZpbmVkLFxuICAgICk7XG4gICAgY29uc3QgcmVzdWx0ID0gdGhpcy5jb3B5SXRlbShpdGVtKTtcbiAgICBpZiAoaW5wdXQuaWRlbXBvdGVuY3lLZXkgIT09IHVuZGVmaW5lZCkgdGhpcy5pZGVtcG90ZW5jeUNhY2hlLnNldChpbnB1dC5pZGVtcG90ZW5jeUtleSwgeyAuLi5yZXN1bHQgfSk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIC8qKiBTaGFyZWQgYnkgYWR2YW5jZVN0YXRlIGFuZCB0aGUgZ2F0ZS1maXJlZCB0cmFuc2l0aW9ucy4gKi9cbiAgcHJpdmF0ZSBleGVjdXRlVHJhbnNpdGlvbihcbiAgICBpdGVtOiBXb3JrSXRlbVJvdyxcbiAgICB0bzogV29ya0l0ZW1TdGF0ZSxcbiAgICBhY3RvcklkOiBzdHJpbmcsXG4gICAgaWRlbXBvdGVuY3lLZXk/OiBzdHJpbmcsXG4gICAgY2F1c2F0aW9uSWQ/OiBzdHJpbmcsXG4gICk6IFdvcmtJdGVtIHtcbiAgICBjb25zdCBmcm9tID0gaXRlbS5zdGF0ZTtcbiAgICBpdGVtLnN0YXRlID0gdG87XG4gICAgaXRlbS5zdGF0ZVZlcnNpb24gKz0gMTtcbiAgICBjb25zdCBldmVudCA9IHRoaXMuYXBwZW5kKFxuICAgICAgJ3dvcmtfaXRlbScsXG4gICAgICBpdGVtLmlkLFxuICAgICAgJ3dvcmtfaXRlbS5zdGF0ZV9jaGFuZ2VkJyxcbiAgICAgIGFjdG9ySWQsXG4gICAgICB7IGZyb20sIHRvIH0sXG4gICAgICB7XG4gICAgICAgIC4uLihjYXVzYXRpb25JZCAhPT0gdW5kZWZpbmVkID8geyBjYXVzYXRpb25JZCB9IDoge30pLFxuICAgICAgICAuLi4oaWRlbXBvdGVuY3lLZXkgIT09IHVuZGVmaW5lZCA/IHsgaWRlbXBvdGVuY3lLZXkgfSA6IHt9KSxcbiAgICAgIH0sXG4gICAgKTtcblxuICAgIC8vIEVwaWMtbGlmdCBwcm9qZWN0b3IgKHJvYWRtYXAgXHUwMEE3MS4yKTogZmlyc3QgY2hpbGQgTEVBVklORyBiYWNrbG9nIGxpZnRzXG4gICAgLy8gdGhlIGZlYXR1cmU7IGlkZW1wb3RlbnQgYnkgY2hlY2s7IGF1dGhvcmVkIGJ5IHRoZSBzeXN0ZW0gYWN0b3IuXG4gICAgaWYgKGZyb20gPT09ICdiYWNrbG9nJyAmJiB0byAhPT0gJ2JhY2tsb2cnKSB7XG4gICAgICBjb25zdCBmZWF0dXJlID0gdGhpcy5mZWF0dXJlcy5nZXQoaXRlbS5mZWF0dXJlSWQpO1xuICAgICAgaWYgKGZlYXR1cmUgJiYgZmVhdHVyZS5zdGF0ZSA9PT0gJ2JhY2tsb2cnKSB7XG4gICAgICAgIGZlYXR1cmUuc3RhdGUgPSAnaW5fcHJvZ3Jlc3MnO1xuICAgICAgICB0aGlzLmFwcGVuZCgnZmVhdHVyZScsIGZlYXR1cmUuaWQsICdmZWF0dXJlLnN0YXRlX2NoYW5nZWQnLCB0aGlzLnN5c3RlbUFjdG9ySWQsIHtcbiAgICAgICAgICBmcm9tOiAnYmFja2xvZycsXG4gICAgICAgICAgdG86ICdpbl9wcm9ncmVzcycsXG4gICAgICAgIH0sIHsgY2F1c2F0aW9uSWQ6IFN0cmluZyhldmVudC5nbG9iYWxTZXEpIH0pO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIGRvbmVfY2hlY2twb2ludCAocm9hZG1hcCBcdTAwQTcxLjEpOiB0aGUgc3RvcnkgY29tcGxldGVzIG5vcm1hbGx5OyB0aGUgaG9sZFxuICAgIC8vIG1hdGVyaWFsaXplcyBvbiB0aGUgZmVhdHVyZSBleGFjdGx5IGF0IGNvbXBsZXRpb24uXG4gICAgaWYgKHRvID09PSAnZG9uZScgJiYgaXRlbS5kb25lQ2hlY2twb2ludCkge1xuICAgICAgY29uc3QgZmVhdHVyZSA9IHRoaXMuZmVhdHVyZXMuZ2V0KGl0ZW0uZmVhdHVyZUlkKTtcbiAgICAgIGlmIChmZWF0dXJlICYmICFmZWF0dXJlLmRpc3BhdGNoSG9sZCkge1xuICAgICAgICBmZWF0dXJlLmRpc3BhdGNoSG9sZCA9IHRydWU7XG4gICAgICAgIHRoaXMuYXBwZW5kKCdmZWF0dXJlJywgZmVhdHVyZS5pZCwgJ2ZlYXR1cmUuZGlzcGF0Y2hfaG9sZF9yYWlzZWQnLCB0aGlzLnN5c3RlbUFjdG9ySWQsIHtcbiAgICAgICAgICB3b3JrSXRlbUlkOiBpdGVtLmlkLFxuICAgICAgICB9LCB7IGNhdXNhdGlvbklkOiBTdHJpbmcoZXZlbnQuZ2xvYmFsU2VxKSB9KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBSYWlscyBcdTIxOTIgY2hhdDogbmFycmF0ZSB0aGUgdHJhbnNpdGlvbiBpbnRvIGJvdW5kIHRhc2sgdGhyZWFkcyAoXHUwMEE3NS4yKS5cbiAgICB0aGlzLm5hcnJhdGVXb3JrSXRlbShpdGVtLCBgc3RhdGU6ICR7ZnJvbX0gXHUyMTkyICR7dG99YCk7XG5cbiAgICBjb25zdCByZXN1bHQgPSB0aGlzLmNvcHlJdGVtKGl0ZW0pO1xuICAgIGlmIChpZGVtcG90ZW5jeUtleSAhPT0gdW5kZWZpbmVkKSB0aGlzLmlkZW1wb3RlbmN5Q2FjaGUuc2V0KGlkZW1wb3RlbmN5S2V5LCB7IC4uLnJlc3VsdCB9KTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgYmxvY2tUYXNrKGlucHV0OiB7XG4gICAgd29ya0l0ZW1JZDogc3RyaW5nO1xuICAgIHJlYXNvbjogQmxvY2tlZFJlYXNvbjtcbiAgICBhY3RvcklkOiBzdHJpbmc7XG4gICAgZmVuY2luZ1Rva2VuPzogbnVtYmVyO1xuICB9KTogV29ya0l0ZW0ge1xuICAgIGNvbnN0IGl0ZW0gPSB0aGlzLm11c3RHZXRJdGVtKGlucHV0LndvcmtJdGVtSWQpO1xuICAgIGlmICghKEJMT0NLRURfUkVBU09OUyBhcyByZWFkb25seSBzdHJpbmdbXSkuaW5jbHVkZXMoaW5wdXQucmVhc29uKSkge1xuICAgICAgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoYHVua25vd24gYmxvY2tpbmcgY29uZGl0aW9uOiAke2lucHV0LnJlYXNvbn1gKTtcbiAgICB9XG4gICAgdGhpcy52YWxpZGF0ZVByZXNlbnRlZFRva2VuKGl0ZW0sIGlucHV0LmZlbmNpbmdUb2tlbiwgaW5wdXQuYWN0b3JJZCk7XG4gICAgdGhpcy5yZXF1aXJlUGVybWlzc2lvbihpbnB1dC5hY3RvcklkLCAndGFzay5ibG9jaycpO1xuICAgIGl0ZW0uYmxvY2tlZFJlYXNvbiA9IGlucHV0LnJlYXNvbjtcbiAgICBpdGVtLnN0YXRlVmVyc2lvbiArPSAxO1xuICAgIHRoaXMuYXBwZW5kKCd3b3JrX2l0ZW0nLCBpdGVtLmlkLCAnd29ya19pdGVtLmJsb2NrZWQnLCBpbnB1dC5hY3RvcklkLCB7IHJlYXNvbjogaW5wdXQucmVhc29uIH0pO1xuICAgIHJldHVybiB0aGlzLmNvcHlJdGVtKGl0ZW0pO1xuICB9XG5cbiAgdW5ibG9ja1Rhc2soaW5wdXQ6IHsgd29ya0l0ZW1JZDogc3RyaW5nOyBhY3RvcklkOiBzdHJpbmcgfSk6IFdvcmtJdGVtIHtcbiAgICBjb25zdCBpdGVtID0gdGhpcy5tdXN0R2V0SXRlbShpbnB1dC53b3JrSXRlbUlkKTtcbiAgICAvLyBcdTAwQTc0LjI6IHJldmlld19ub25fY29udmVyZ2VuY2UgY2FuIG9ubHkgYmUgcmVsZWFzZWQgYnkgYSByZXZpZXctZ2F0ZVxuICAgIC8vIGhvbGRlcjsgb3JkaW5hcnkgYmxvY2tzIHJlbGVhc2UgdW5kZXIgdGFzay5ibG9jay5cbiAgICBpZiAoaXRlbS5ibG9ja2VkUmVhc29uID09PSAncmV2aWV3X25vbl9jb252ZXJnZW5jZScpIHtcbiAgICAgIHRoaXMucmVxdWlyZVBlcm1pc3Npb24oaW5wdXQuYWN0b3JJZCwgJ2dhdGUucmV2aWV3LmFwcHJvdmUnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5yZXF1aXJlUGVybWlzc2lvbihpbnB1dC5hY3RvcklkLCAndGFzay5ibG9jaycpO1xuICAgIH1cbiAgICBpdGVtLmJsb2NrZWRSZWFzb24gPSBudWxsO1xuICAgIGl0ZW0uc3RhdGVWZXJzaW9uICs9IDE7XG4gICAgdGhpcy5hcHBlbmQoJ3dvcmtfaXRlbScsIGl0ZW0uaWQsICd3b3JrX2l0ZW0udW5ibG9ja2VkJywgaW5wdXQuYWN0b3JJZCwge30pO1xuICAgIHJldHVybiB0aGlzLmNvcHlJdGVtKGl0ZW0pO1xuICB9XG5cbiAgLy8gLS0gZ2F0ZXMgJiBldmlkZW5jZSAocm9hZG1hcCBcdTAwQTcxLjQpIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIHN1Ym1pdEV2aWRlbmNlKGlucHV0OiB7XG4gICAgd29ya0l0ZW1JZDogc3RyaW5nO1xuICAgIGV2aWRlbmNlOiBFdmlkZW5jZTtcbiAgICBhY3RvcklkOiBzdHJpbmc7XG4gICAgZmVuY2luZ1Rva2VuPzogbnVtYmVyO1xuICB9KTogdm9pZCB7XG4gICAgY29uc3QgaXRlbSA9IHRoaXMubXVzdEdldEl0ZW0oaW5wdXQud29ya0l0ZW1JZCk7XG4gICAgdGhpcy52YWxpZGF0ZVByZXNlbnRlZFRva2VuKGl0ZW0sIGlucHV0LmZlbmNpbmdUb2tlbiwgaW5wdXQuYWN0b3JJZCk7XG4gICAgdGhpcy5ldmlkZW5jZVJvd3MucHVzaCh7IHdvcmtJdGVtSWQ6IGl0ZW0uaWQsIGV2aWRlbmNlOiBpbnB1dC5ldmlkZW5jZSwgc2VxOiB0aGlzLmV2aWRlbmNlUm93cy5sZW5ndGggKyAxIH0pO1xuICAgIHRoaXMuYXBwZW5kKCd3b3JrX2l0ZW0nLCBpdGVtLmlkLCAnZXZpZGVuY2Uuc3VibWl0dGVkJywgaW5wdXQuYWN0b3JJZCwge1xuICAgICAga2luZDogaW5wdXQuZXZpZGVuY2Uua2luZCxcbiAgICB9KTtcbiAgfVxuXG4gIGFwcHJvdmVHYXRlKGlucHV0OiBHYXRlRGVjaXNpb25JbnB1dCk6IFdvcmtJdGVtIHtcbiAgICBjb25zdCBpdGVtID0gdGhpcy5tdXN0R2V0SXRlbShpbnB1dC53b3JrSXRlbUlkKTtcblxuICAgIGlmIChpbnB1dC5nYXRlID09PSAnc3BlY19hcHByb3ZhbCcpIHtcbiAgICAgIC8vIFBlcm1pc3Npb24gcHJlY2VkZXMgYW55IGVmZmVjdDogYSBkZW5pZWQgYXR0ZW1wdCBwaW5zIG5vdGhpbmcuXG4gICAgICB0aGlzLnJlcXVpcmVQZXJtaXNzaW9uKGlucHV0LmFjdG9ySWQsICdnYXRlLnNwZWMuYXBwcm92ZScpO1xuICAgICAgaWYgKGl0ZW0uYmxvY2tlZFJlYXNvbiAhPT0gbnVsbCkge1xuICAgICAgICB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcihgd29yayBpdGVtIGlzIGJsb2NrZWQ6ICR7aXRlbS5ibG9ja2VkUmVhc29ufWApO1xuICAgICAgfVxuICAgICAgaWYgKGl0ZW0uc3RhdGUgIT09ICdkcmFmdCcpIHtcbiAgICAgICAgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoYHNwZWNfYXBwcm92YWwgYXBwbGllcyB0byBkcmFmdCBpdGVtcywgbm90ICR7aXRlbS5zdGF0ZX1gKTtcbiAgICAgIH1cbiAgICAgIGlmIChpbnB1dC5waW5uZWRWZXJpZmljYXRpb24gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBpdGVtLnBpbm5lZFZlcmlmaWNhdGlvbiA9IFsuLi5pbnB1dC5waW5uZWRWZXJpZmljYXRpb25dO1xuICAgICAgfVxuICAgICAgaWYgKCF0aGlzLnF1b3J1bVdvdWxkQmVNZXQoaXRlbSwgJ3NwZWNfYXBwcm92YWwnLCBpbnB1dC5hY3RvcklkKSkge1xuICAgICAgICB0aGlzLnJlY29yZEFwcHJvdmFsKGl0ZW0sICdzcGVjX2FwcHJvdmFsJywgaW5wdXQuYWN0b3JJZCk7XG4gICAgICAgIHJldHVybiB0aGlzLmNvcHlJdGVtKGl0ZW0pOyAvLyBkZWNpc2lvbiByZWNvcmRlZDsgcXVvcnVtIHBlbmRpbmcgKGdhdGUgcG9saWN5IGlzIGRhdGEsIHJvYWRtYXAgXHUwMEE3MylcbiAgICAgIH1cbiAgICAgIHRoaXMucmVjb3JkQXBwcm92YWwoaXRlbSwgJ3NwZWNfYXBwcm92YWwnLCBpbnB1dC5hY3RvcklkKTtcbiAgICAgIC8vIFRoZSBhcHByb3ZhbCBmaXJlcyB0aGUgZ2F0ZWQgZm9yd2FyZCB0cmFuc2l0aW9uIChjb25mb3JtYW5jZSBwaW4pLlxuICAgICAgcmV0dXJuIHRoaXMuZXhlY3V0ZVRyYW5zaXRpb24oaXRlbSwgJ3JlYWR5X2Zvcl9kZXYnLCBpbnB1dC5hY3RvcklkKTtcbiAgICB9XG5cbiAgICAvLyByZXZpZXdfYXBwcm92YWxcbiAgICB0aGlzLnJlcXVpcmVQZXJtaXNzaW9uKGlucHV0LmFjdG9ySWQsICdnYXRlLnJldmlldy5hcHByb3ZlJyk7XG4gICAgaWYgKGl0ZW0uYmxvY2tlZFJlYXNvbiAhPT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoYHdvcmsgaXRlbSBpcyBibG9ja2VkOiAke2l0ZW0uYmxvY2tlZFJlYXNvbn1gKTtcbiAgICB9XG4gICAgaWYgKGl0ZW0uc3RhdGUgIT09ICdpbl9yZXZpZXcnKSB7XG4gICAgICB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcihgcmV2aWV3X2FwcHJvdmFsIGFwcGxpZXMgdG8gaW5fcmV2aWV3IGl0ZW1zLCBub3QgJHtpdGVtLnN0YXRlfWApO1xuICAgIH1cbiAgICBpZiAoIXRoaXMucXVvcnVtV291bGRCZU1ldChpdGVtLCAncmV2aWV3X2FwcHJvdmFsJywgaW5wdXQuYWN0b3JJZCkpIHtcbiAgICAgIHRoaXMucmVjb3JkQXBwcm92YWwoaXRlbSwgJ3Jldmlld19hcHByb3ZhbCcsIGlucHV0LmFjdG9ySWQpO1xuICAgICAgcmV0dXJuIHRoaXMuY29weUl0ZW0oaXRlbSk7IC8vIHF1b3J1bSBwZW5kaW5nIFx1MjAxNCBubyB0cmFuc2l0aW9uIHlldFxuICAgIH1cbiAgICAvLyBFdmlkZW5jZSBpcyBjaGVja2VkIGV4YWN0bHkgd2hlbiB0aGUgcXVvcnVtIHdvdWxkIGNvbXBsZXRlLCBzbyBhIGZhaWxlZFxuICAgIC8vIGFwcHJvdmFsIHJlY29yZHMgbm90aGluZyAoUGhhc2UgMSBwaW46IGRlbmllZCBhdHRlbXB0cyBtdXRhdGUgbm90aGluZykuXG4gICAgdGhpcy5jaGVja1Jldmlld0V2aWRlbmNlKGl0ZW0pO1xuICAgIHRoaXMucmVjb3JkQXBwcm92YWwoaXRlbSwgJ3Jldmlld19hcHByb3ZhbCcsIGlucHV0LmFjdG9ySWQpO1xuICAgIHJldHVybiB0aGlzLmV4ZWN1dGVUcmFuc2l0aW9uKGl0ZW0sICdkb25lJywgaW5wdXQuYWN0b3JJZCk7XG4gIH1cblxuICAvKiogRGlzdGluY3QgYXBwcm92ZXJzIG9mIHRoaXMgcm91bmQgKHJvdW5kID0gcmV2aWV3TG9vcEl0ZXJhdGlvbiBhdCBkZWNpc2lvbiB0aW1lKS4gKi9cbiAgcHJpdmF0ZSByb3VuZEFwcHJvdmVycyhpdGVtOiBXb3JrSXRlbVJvdywgZ2F0ZTogR2F0ZUNvZGUpOiBBY3RvcltdIHtcbiAgICBjb25zdCBpZHMgPSBuZXcgU2V0KFxuICAgICAgdGhpcy5nYXRlRGVjaXNpb25zXG4gICAgICAgIC5maWx0ZXIoXG4gICAgICAgICAgKGQpID0+XG4gICAgICAgICAgICBkLndvcmtJdGVtSWQgPT09IGl0ZW0uaWQgJiZcbiAgICAgICAgICAgIGQuZ2F0ZSA9PT0gZ2F0ZSAmJlxuICAgICAgICAgICAgZC5kZWNpc2lvbiA9PT0gJ2FwcHJvdmVkJyAmJlxuICAgICAgICAgICAgZC5yb3VuZCA9PT0gaXRlbS5yZXZpZXdMb29wSXRlcmF0aW9uLFxuICAgICAgICApXG4gICAgICAgIC5tYXAoKGQpID0+IGQuYWN0b3JJZCksXG4gICAgKTtcbiAgICByZXR1cm4gWy4uLmlkc10uZmxhdE1hcCgoaWQpID0+IHtcbiAgICAgIGNvbnN0IGFjdG9yID0gdGhpcy5hY3RvcnMuZ2V0KGlkKTtcbiAgICAgIHJldHVybiBhY3RvciA/IFthY3Rvcl0gOiBbXTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKiBHYXRlIHBvbGljeSBxdW9ydW0gKHJvYWRtYXAgXHUwMEE3Myk6IG1pbiBkaXN0aW5jdCBhcHByb3ZlcnMgKyByZXF1aXJlZCBhY3RvciB0eXBlcywgYXMgREFUQS4gKi9cbiAgcHJpdmF0ZSBxdW9ydW1Xb3VsZEJlTWV0KGl0ZW06IFdvcmtJdGVtUm93LCBnYXRlOiBHYXRlQ29kZSwgbmV4dEFwcHJvdmVySWQ6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgIGNvbnN0IHBvbGljeSA9IHRoaXMuZ2F0ZVBvbGljaWVzLmdldChnYXRlKSA/PyB7fTtcbiAgICBjb25zdCBtaW4gPSBwb2xpY3kubWluQXBwcm92YWxzID8/IDE7XG4gICAgY29uc3QgcmVxdWlyZWQgPSBwb2xpY3kucmVxdWlyZWRBY3RvclR5cGVzID8/IFtdO1xuICAgIGNvbnN0IGFwcHJvdmVycyA9IHRoaXMucm91bmRBcHByb3ZlcnMoaXRlbSwgZ2F0ZSk7XG4gICAgY29uc3QgbmV4dEFjdG9yID0gdGhpcy5hY3RvcnMuZ2V0KG5leHRBcHByb3ZlcklkKTtcbiAgICBpZiAobmV4dEFjdG9yICYmICFhcHByb3ZlcnMuc29tZSgoYSkgPT4gYS5pZCA9PT0gbmV4dEFjdG9yLmlkKSkgYXBwcm92ZXJzLnB1c2gobmV4dEFjdG9yKTtcbiAgICBpZiAoYXBwcm92ZXJzLmxlbmd0aCA8IG1pbikgcmV0dXJuIGZhbHNlO1xuICAgIGZvciAoY29uc3QgdHlwZSBvZiByZXF1aXJlZCkge1xuICAgICAgaWYgKCFhcHByb3ZlcnMuc29tZSgoYSkgPT4gYS50eXBlID09PSB0eXBlKSkgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIHByaXZhdGUgcmVjb3JkQXBwcm92YWwoaXRlbTogV29ya0l0ZW1Sb3csIGdhdGU6IEdhdGVDb2RlLCBhY3RvcklkOiBzdHJpbmcpOiB2b2lkIHtcbiAgICB0aGlzLmdhdGVEZWNpc2lvbnMucHVzaCh7XG4gICAgICB3b3JrSXRlbUlkOiBpdGVtLmlkLFxuICAgICAgZ2F0ZSxcbiAgICAgIGRlY2lzaW9uOiAnYXBwcm92ZWQnLFxuICAgICAgYWN0b3JJZCxcbiAgICAgIHJvdW5kOiBpdGVtLnJldmlld0xvb3BJdGVyYXRpb24sXG4gICAgfSk7XG4gICAgdGhpcy5hcHBlbmQoJ3dvcmtfaXRlbScsIGl0ZW0uaWQsICdnYXRlLmFwcHJvdmVkJywgYWN0b3JJZCwge1xuICAgICAgZ2F0ZSxcbiAgICAgIHJvdW5kOiBpdGVtLnJldmlld0xvb3BJdGVyYXRpb24sXG4gICAgICAuLi4oZ2F0ZSA9PT0gJ3NwZWNfYXBwcm92YWwnID8geyBwaW5uZWRWZXJpZmljYXRpb246IGl0ZW0ucGlubmVkVmVyaWZpY2F0aW9uIH0gOiB7fSksXG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogRXZpZGVuY2UgY29uZGl0aW9uIG9mIHRoZSBkb25lIGdhdGUgKFx1MDBBNzEuNCwgRDcpOiBldmVyeSBQSU5ORUQgY29tbWFuZCdzXG4gICAqIGxhdGVzdCB0ZXN0X3J1biBleGl0ZWQgMCAoYW4gdW5waW5uZWQgY29tbWFuZCBzYXRpc2ZpZXMgbm90aGluZyksIGFuZCB0aGVcbiAgICogZmluYWwgY29tbWl0IGlzIHJlYWNoYWJsZSBvbiB0aGUgcmVtb3RlLiByZXZpZXdfcmVwb3J0IGlzIG5ldmVyIGNvbnN1bHRlZC5cbiAgICogV2l0aCBub3RoaW5nIHBpbm5lZCwgdGhlIGdhdGUgZGVjaXNpb24gYnkgdGhlIHBlcm1pdHRlZCBhY3RvciBJUyB0aGUgaHVtYW5cbiAgICogZGVjaXNpb24gXHUyMDE0IGV2aWRlbmNlIGFsb25lIG5ldmVyIGNvbXBsZXRlcyB0aGUgaXRlbSBlaXRoZXIgd2F5LlxuICAgKi9cbiAgcHJpdmF0ZSBjaGVja1Jldmlld0V2aWRlbmNlKGl0ZW06IFdvcmtJdGVtUm93KTogdm9pZCB7XG4gICAgY29uc3Qgcm93cyA9IHRoaXMuZXZpZGVuY2VSb3dzLmZpbHRlcigocm93KSA9PiByb3cud29ya0l0ZW1JZCA9PT0gaXRlbS5pZCk7XG4gICAgZm9yIChjb25zdCBjb21tYW5kIG9mIGl0ZW0ucGlubmVkVmVyaWZpY2F0aW9uID8/IFtdKSB7XG4gICAgICBjb25zdCBydW5zID0gcm93cy5maWx0ZXIoXG4gICAgICAgIChyb3cpID0+IHJvdy5ldmlkZW5jZS5raW5kID09PSAndGVzdF9ydW4nICYmIHJvdy5ldmlkZW5jZS5wYXlsb2FkWydjb21tYW5kJ10gPT09IGNvbW1hbmQsXG4gICAgICApO1xuICAgICAgY29uc3QgbGF0ZXN0ID0gcnVuc1tydW5zLmxlbmd0aCAtIDFdO1xuICAgICAgaWYgKCFsYXRlc3QgfHwgbGF0ZXN0LmV2aWRlbmNlLnBheWxvYWRbJ2V4aXRDb2RlJ10gIT09IDApIHtcbiAgICAgICAgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoYHBpbm5lZCB2ZXJpZmljYXRpb24gZGlkIG5vdCBwYXNzOiAke2NvbW1hbmR9YCk7XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChpdGVtLmtpbmQgPT09ICdjb2RlJykge1xuICAgICAgLy8gTm9uLWNvZGUgZGVsaXZlcmFibGVzIGNhcnJ5IG5vIGNvbW1pdCByZXF1aXJlbWVudCAocm9hZG1hcCBcdTAwQTcxLjQpOlxuICAgICAgLy8gdGhlaXIgY29tcGxldGlvbiByZXN0cyBvbiBtYWNoaW5lLWNoZWNrYWJsZSBkb2MgZXZpZGVuY2UgcGx1cyB0aGVcbiAgICAgIC8vIHBlcm1pdHRlZCBhY3RvcidzIGRlY2lzaW9uLlxuICAgICAgY29uc3QgY29tbWl0T2sgPSByb3dzLnNvbWUoXG4gICAgICAgIChyb3cpID0+IHJvdy5ldmlkZW5jZS5raW5kID09PSAnY29tbWl0JyAmJiByb3cuZXZpZGVuY2UucGF5bG9hZFsncmVhY2hhYmxlT25SZW1vdGUnXSA9PT0gdHJ1ZSxcbiAgICAgICk7XG4gICAgICBpZiAoIWNvbW1pdE9rKSB7XG4gICAgICAgIHRocm93IG5ldyBHdWFyZEZhaWxlZEVycm9yKCdmaW5hbCByZXZpc2lvbiBtdXN0IGJlIHJlYWNoYWJsZSBvbiB0aGUgcmVtb3RlIChwdXNoIGlzIHBhcnQgb2YgdGhlIEhBTFQgY29udHJhY3QpJyk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmVqZWN0R2F0ZShpbnB1dDogR2F0ZURlY2lzaW9uSW5wdXQpOiBXb3JrSXRlbSB7XG4gICAgY29uc3QgaXRlbSA9IHRoaXMubXVzdEdldEl0ZW0oaW5wdXQud29ya0l0ZW1JZCk7XG4gICAgaWYgKGlucHV0LmdhdGUgIT09ICdyZXZpZXdfYXBwcm92YWwnKSB7XG4gICAgICB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcignb25seSByZXZpZXdfYXBwcm92YWwgcmVqZWN0aW9uIGlzIGRlZmluZWQgaW4gUGhhc2UgMScpO1xuICAgIH1cbiAgICAvLyBQaGFzZSAyIChhZGRpdGl2ZSk6IHJlamVjdGlvbiBhdXRob3JpdHkgPSBnYXRlLnJldmlldy5hcHByb3ZlIE9SXG4gICAgLy8gZ2F0ZS5yZXZpZXcucmVqZWN0IFx1MjAxNCB0aGUgUGhhc2UgMiBleGl0IGNyaXRlcmlvbidzIHJldmlld2VyLWFnZW50IGhvbGRzXG4gICAgLy8gb25seSB0aGUgbGF0dGVyLiBFdmVyeSBQaGFzZSAxIHBpbiBvbiByZWplY3RHYXRlIGtlZXBzIGhvbGRpbmcuXG4gICAgaWYgKFxuICAgICAgIXRoaXMuaGFzUGVybWlzc2lvbihpbnB1dC5hY3RvcklkLCAnZ2F0ZS5yZXZpZXcuYXBwcm92ZScpICYmXG4gICAgICAhdGhpcy5oYXNQZXJtaXNzaW9uKGlucHV0LmFjdG9ySWQsICdnYXRlLnJldmlldy5yZWplY3QnKVxuICAgICkge1xuICAgICAgdGhyb3cgbmV3IFBlcm1pc3Npb25EZW5pZWRFcnJvcignZ2F0ZS5yZXZpZXcucmVqZWN0JywgaW5wdXQuYWN0b3JJZCk7XG4gICAgfVxuICAgIGlmIChpdGVtLnN0YXRlICE9PSAnaW5fcmV2aWV3Jykge1xuICAgICAgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoYHJldmlldyByZWplY3Rpb24gYXBwbGllcyB0byBpbl9yZXZpZXcgaXRlbXMsIG5vdCAke2l0ZW0uc3RhdGV9YCk7XG4gICAgfVxuICAgIHRoaXMuZ2F0ZURlY2lzaW9ucy5wdXNoKHtcbiAgICAgIHdvcmtJdGVtSWQ6IGl0ZW0uaWQsXG4gICAgICBnYXRlOiAncmV2aWV3X2FwcHJvdmFsJyxcbiAgICAgIGRlY2lzaW9uOiAncmVqZWN0ZWQnLFxuICAgICAgYWN0b3JJZDogaW5wdXQuYWN0b3JJZCxcbiAgICAgIHJvdW5kOiBpdGVtLnJldmlld0xvb3BJdGVyYXRpb24sXG4gICAgfSk7XG4gICAgY29uc3QgZGVjaXNpb25FdmVudCA9IHRoaXMuYXBwZW5kKCd3b3JrX2l0ZW0nLCBpdGVtLmlkLCAnZ2F0ZS5yZWplY3RlZCcsIGlucHV0LmFjdG9ySWQsIHtcbiAgICAgIGdhdGU6ICdyZXZpZXdfYXBwcm92YWwnLFxuICAgIH0pO1xuXG4gICAgaWYgKGl0ZW0ucmV2aWV3TG9vcEl0ZXJhdGlvbiA+PSBSRVZJRVdfTE9PUF9MSU1JVCkge1xuICAgICAgLy8gVGhlIDZ0aCByZWplY3Rpb24gcGVyZm9ybXMgbm8gbG9vcGJhY2s6IG92ZXJsYXkgcmV2aWV3X25vbl9jb252ZXJnZW5jZSxcbiAgICAgIC8vIHN0YXRlIGZyb3plbiBhdCBpbl9yZXZpZXcsIGNvdW50ZXIgdW50b3VjaGVkIChDT05GT1JNQU5DRS5tZCBwaW4pLlxuICAgICAgaXRlbS5ibG9ja2VkUmVhc29uID0gJ3Jldmlld19ub25fY29udmVyZ2VuY2UnO1xuICAgICAgaXRlbS5zdGF0ZVZlcnNpb24gKz0gMTtcbiAgICAgIHRoaXMuYXBwZW5kKFxuICAgICAgICAnd29ya19pdGVtJyxcbiAgICAgICAgaXRlbS5pZCxcbiAgICAgICAgJ3dvcmtfaXRlbS5ibG9ja2VkJyxcbiAgICAgICAgdGhpcy5zeXN0ZW1BY3RvcklkLFxuICAgICAgICB7IHJlYXNvbjogJ3Jldmlld19ub25fY29udmVyZ2VuY2UnIH0sXG4gICAgICAgIHsgY2F1c2F0aW9uSWQ6IFN0cmluZyhkZWNpc2lvbkV2ZW50Lmdsb2JhbFNlcSkgfSxcbiAgICAgICk7XG4gICAgICByZXR1cm4gdGhpcy5jb3B5SXRlbShpdGVtKTtcbiAgICB9XG5cbiAgICAvLyBcdTAwQTcxLjI6IHRoZSBsb29wYmFjayBpcyBhIHN5c3RlbSBlZmZlY3QgXHUyMDE0IG5vIGNsYWltLWhvbGRlciBwYXJ0aWNpcGF0aW9uLlxuICAgIGl0ZW0ucmV2aWV3TG9vcEl0ZXJhdGlvbiArPSAxO1xuICAgIHJldHVybiB0aGlzLmV4ZWN1dGVUcmFuc2l0aW9uKGl0ZW0sICdpbl9wcm9ncmVzcycsIHRoaXMuc3lzdGVtQWN0b3JJZCwgdW5kZWZpbmVkLCBTdHJpbmcoZGVjaXNpb25FdmVudC5nbG9iYWxTZXEpKTtcbiAgfVxuXG4gIC8vIC0tIGNvbGxhYm9yYXRpb24gKFBoYXNlIDMsIHJvYWRtYXAgXHUwMEE3NSkgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgcHJpdmF0ZSBtdXN0R2V0VGhyZWFkKHRocmVhZElkOiBzdHJpbmcpOiBUaHJlYWQge1xuICAgIGNvbnN0IHRocmVhZCA9IHRoaXMudGhyZWFkcy5nZXQodGhyZWFkSWQpO1xuICAgIGlmICghdGhyZWFkKSB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcihgdW5rbm93biB0aHJlYWQ6ICR7dGhyZWFkSWR9YCk7XG4gICAgcmV0dXJuIHRocmVhZDtcbiAgfVxuXG4gIHByaXZhdGUgaXNQYXJ0aWNpcGFudCh0aHJlYWQ6IFRocmVhZCwgYWN0b3JJZDogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRocmVhZC5jcmVhdGVkQnkgPT09IGFjdG9ySWQgfHwgdGhyZWFkLnBhcnRpY2lwYW50cy5pbmNsdWRlcyhhY3RvcklkKTtcbiAgfVxuXG4gIGNyZWF0ZVRocmVhZChpbnB1dDoge1xuICAgIGFjdG9ySWQ6IHN0cmluZztcbiAgICBraW5kOiBUaHJlYWRLaW5kO1xuICAgIGZlYXR1cmVJZD86IHN0cmluZztcbiAgICB3b3JrSXRlbUlkPzogc3RyaW5nO1xuICAgIHZpc2liaWxpdHk/OiBUaHJlYWRWaXNpYmlsaXR5O1xuICB9KTogVGhyZWFkIHtcbiAgICBpZiAoaW5wdXQuZmVhdHVyZUlkICE9PSB1bmRlZmluZWQgJiYgIXRoaXMuZmVhdHVyZXMuaGFzKGlucHV0LmZlYXR1cmVJZCkpIHtcbiAgICAgIHRocm93IG5ldyBHdWFyZEZhaWxlZEVycm9yKGB1bmtub3duIGZlYXR1cmU6ICR7aW5wdXQuZmVhdHVyZUlkfWApO1xuICAgIH1cbiAgICBsZXQgd29ya0l0ZW1JZDogc3RyaW5nIHwgbnVsbCA9IG51bGw7XG4gICAgaWYgKGlucHV0LndvcmtJdGVtSWQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgd29ya0l0ZW1JZCA9IHRoaXMubXVzdEdldEl0ZW0oaW5wdXQud29ya0l0ZW1JZCkuaWQ7XG4gICAgfVxuICAgIGNvbnN0IHRocmVhZDogVGhyZWFkID0ge1xuICAgICAgaWQ6IHRoaXMubmV4dElkKCd0aCcpLFxuICAgICAgZmVhdHVyZUlkOiBpbnB1dC5mZWF0dXJlSWQgPz8gbnVsbCxcbiAgICAgIHdvcmtJdGVtSWQsXG4gICAgICBraW5kOiBpbnB1dC5raW5kLFxuICAgICAgdmlzaWJpbGl0eTogaW5wdXQudmlzaWJpbGl0eSA/PyAoaW5wdXQua2luZCA9PT0gJ3ByaXZhdGUnID8gJ3ByaXZhdGUnIDogJ29wZW4nKSxcbiAgICAgIGNyZWF0ZWRCeTogaW5wdXQuYWN0b3JJZCxcbiAgICAgIHBhcnRpY2lwYW50czogW2lucHV0LmFjdG9ySWRdLFxuICAgIH07XG4gICAgdGhpcy50aHJlYWRzLnNldCh0aHJlYWQuaWQsIHRocmVhZCk7XG4gICAgdGhpcy5hcHBlbmQoJ3RocmVhZCcsIHRocmVhZC5pZCwgJ3RocmVhZC5jcmVhdGVkJywgaW5wdXQuYWN0b3JJZCwge1xuICAgICAga2luZDogdGhyZWFkLmtpbmQsXG4gICAgICBmZWF0dXJlSWQ6IHRocmVhZC5mZWF0dXJlSWQsXG4gICAgICB3b3JrSXRlbUlkOiB0aHJlYWQud29ya0l0ZW1JZCxcbiAgICAgIHZpc2liaWxpdHk6IHRocmVhZC52aXNpYmlsaXR5LFxuICAgIH0pO1xuICAgIHJldHVybiB7IC4uLnRocmVhZCwgcGFydGljaXBhbnRzOiBbLi4udGhyZWFkLnBhcnRpY2lwYW50c10gfTtcbiAgfVxuXG4gIGFkZFRocmVhZFBhcnRpY2lwYW50KGlucHV0OiB7IHRocmVhZElkOiBzdHJpbmc7IGFjdG9ySWQ6IHN0cmluZzsgYnlBY3RvcklkOiBzdHJpbmcgfSk6IFRocmVhZCB7XG4gICAgY29uc3QgdGhyZWFkID0gdGhpcy5tdXN0R2V0VGhyZWFkKGlucHV0LnRocmVhZElkKTtcbiAgICBpZiAoIXRoaXMuaXNQYXJ0aWNpcGFudCh0aHJlYWQsIGlucHV0LmJ5QWN0b3JJZCkpIHtcbiAgICAgIHRocm93IG5ldyBQZXJtaXNzaW9uRGVuaWVkRXJyb3IoJ3RocmVhZC5pbnZpdGUnLCBpbnB1dC5ieUFjdG9ySWQpO1xuICAgIH1cbiAgICBpZiAoIXRoaXMuYWN0b3JzLmhhcyhpbnB1dC5hY3RvcklkKSkgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoYHVua25vd24gYWN0b3I6ICR7aW5wdXQuYWN0b3JJZH1gKTtcbiAgICBpZiAoIXRocmVhZC5wYXJ0aWNpcGFudHMuaW5jbHVkZXMoaW5wdXQuYWN0b3JJZCkpIHtcbiAgICAgIHRocmVhZC5wYXJ0aWNpcGFudHMucHVzaChpbnB1dC5hY3RvcklkKTtcbiAgICAgIHRoaXMuYXBwZW5kKCd0aHJlYWQnLCB0aHJlYWQuaWQsICd0aHJlYWQucGFydGljaXBhbnRfYWRkZWQnLCBpbnB1dC5ieUFjdG9ySWQsIHtcbiAgICAgICAgYWN0b3JJZDogaW5wdXQuYWN0b3JJZCxcbiAgICAgIH0pO1xuICAgIH1cbiAgICByZXR1cm4geyAuLi50aHJlYWQsIHBhcnRpY2lwYW50czogWy4uLnRocmVhZC5wYXJ0aWNpcGFudHNdIH07XG4gIH1cblxuICAvKiogSW50ZXJuYWwgYXBwZW5kIHRoYXQgbmV2ZXIgcnVucyB0aGUgcm91dGVyIFx1MjAxNCB1c2VkIGZvciBjaGF0LCBuYXJyYXRpb24gYWxpa2UuICovXG4gIHByaXZhdGUgYXBwZW5kTWVzc2FnZShcbiAgICB0aHJlYWQ6IFRocmVhZCxcbiAgICBhdXRob3JJZDogc3RyaW5nLFxuICAgIGtpbmQ6IE1lc3NhZ2VbJ2tpbmQnXSxcbiAgICBib2R5OiBzdHJpbmcsXG4gICAgcmVwbHlUbzogc3RyaW5nIHwgbnVsbCxcbiAgKTogTWVzc2FnZSB7XG4gICAgY29uc3Qgc2VxID0gdGhpcy5tZXNzYWdlcy5maWx0ZXIoKG0pID0+IG0udGhyZWFkSWQgPT09IHRocmVhZC5pZCkubGVuZ3RoICsgMTtcbiAgICBjb25zdCBtZXNzYWdlOiBNZXNzYWdlID0ge1xuICAgICAgaWQ6IHRoaXMubmV4dElkKCdtc2cnKSxcbiAgICAgIHRocmVhZElkOiB0aHJlYWQuaWQsXG4gICAgICBzZXEsXG4gICAgICBhdXRob3JJZCxcbiAgICAgIGtpbmQsXG4gICAgICBib2R5LFxuICAgICAgcmVwbHlUbyxcbiAgICB9O1xuICAgIHRoaXMubWVzc2FnZXMucHVzaChtZXNzYWdlKTtcbiAgICB0aGlzLmFwcGVuZCgndGhyZWFkJywgdGhyZWFkLmlkLCAnbWVzc2FnZS5wb3N0ZWQnLCBhdXRob3JJZCwgeyBtZXNzYWdlSWQ6IG1lc3NhZ2UuaWQsIGtpbmQgfSk7XG4gICAgcmV0dXJuIHsgLi4ubWVzc2FnZSB9O1xuICB9XG5cbiAgLyoqXG4gICAqIFx1MDBBNzUuMjogdGhlIHNlcnZlciBORVZFUiBwYXJzZXMgYm9keSB0ZXh0IFx1MjAxNCBgbWVudGlvbnNgIGlzIHN0cnVjdHVyZWQgYWN0b3JcbiAgICogaWRzLiBcdTAwQTc1LjQ6IHRoZSByb3V0ZXIgaXMgcHVyZSBjb2RlLCBkZWZhdWx0LWRlbnksIHBvbGljeS1nYXRlZCxcbiAgICogZGVwdGgtY2FwcGVkOyBhIGpvYiBpcyByZXBseS1vbmx5IGNvbnRleHQsIG5ldmVyIGEgY2xhaW0uXG4gICAqL1xuICBwb3N0TWVzc2FnZShpbnB1dDoge1xuICAgIHRocmVhZElkOiBzdHJpbmc7XG4gICAgYWN0b3JJZDogc3RyaW5nO1xuICAgIGJvZHk6IHN0cmluZztcbiAgICByZXBseVRvPzogc3RyaW5nO1xuICAgIG1lbnRpb25zPzogc3RyaW5nW107XG4gIH0pOiBNZXNzYWdlIHtcbiAgICBjb25zdCB0aHJlYWQgPSB0aGlzLm11c3RHZXRUaHJlYWQoaW5wdXQudGhyZWFkSWQpO1xuICAgIGlmICh0aHJlYWQudmlzaWJpbGl0eSA9PT0gJ3ByaXZhdGUnICYmICF0aGlzLmlzUGFydGljaXBhbnQodGhyZWFkLCBpbnB1dC5hY3RvcklkKSkge1xuICAgICAgdGhyb3cgbmV3IFBlcm1pc3Npb25EZW5pZWRFcnJvcigndGhyZWFkLnBvc3QnLCBpbnB1dC5hY3RvcklkKTtcbiAgICB9XG4gICAgY29uc3QgbWVzc2FnZSA9IHRoaXMuYXBwZW5kTWVzc2FnZSh0aHJlYWQsIGlucHV0LmFjdG9ySWQsICdjaGF0JywgaW5wdXQuYm9keSwgaW5wdXQucmVwbHlUbyA/PyBudWxsKTtcblxuICAgIGZvciAoY29uc3QgbWVudGlvbmVkSWQgb2YgWy4uLm5ldyBTZXQoaW5wdXQubWVudGlvbnMgPz8gW10pXSkge1xuICAgICAgY29uc3QgbWVudGlvbmVkID0gdGhpcy5hY3RvcnMuZ2V0KG1lbnRpb25lZElkKTtcbiAgICAgIGlmICghbWVudGlvbmVkKSB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcihgdW5rbm93biBtZW50aW9uZWQgYWN0b3I6ICR7bWVudGlvbmVkSWR9YCk7XG4gICAgICBjb25zdCByZXNvbHV0aW9uID0gdGhpcy5yb3V0ZU1lbnRpb24odGhyZWFkLCBtZXNzYWdlLCBpbnB1dC5hY3RvcklkLCBtZW50aW9uZWQpO1xuICAgICAgdGhpcy5tZW50aW9ucy5wdXNoKHsgbWVzc2FnZUlkOiBtZXNzYWdlLmlkLCBtZW50aW9uZWRBY3RvcklkOiBtZW50aW9uZWRJZCwgcmVzb2x1dGlvbiB9KTtcbiAgICAgIHRoaXMuYXBwZW5kKCd0aHJlYWQnLCB0aHJlYWQuaWQsICdtZW50aW9uLnJlY29yZGVkJywgaW5wdXQuYWN0b3JJZCwge1xuICAgICAgICBtZXNzYWdlSWQ6IG1lc3NhZ2UuaWQsXG4gICAgICAgIG1lbnRpb25lZEFjdG9ySWQ6IG1lbnRpb25lZElkLFxuICAgICAgICByZXNvbHV0aW9uLFxuICAgICAgfSk7XG4gICAgfVxuICAgIHJldHVybiBtZXNzYWdlO1xuICB9XG5cbiAgLyoqIFRoZSBkZXRlcm1pbmlzdGljIG1lbnRpb24gcm91dGVyIChcdTAwQTc1LjQpLiBSZXR1cm5zIHRoZSByZWNvcmRlZCByZXNvbHV0aW9uLiAqL1xuICBwcml2YXRlIHJvdXRlTWVudGlvbihcbiAgICB0aHJlYWQ6IFRocmVhZCxcbiAgICBtZXNzYWdlOiBNZXNzYWdlLFxuICAgIG1lbnRpb25lcklkOiBzdHJpbmcsXG4gICAgbWVudGlvbmVkOiBBY3RvcixcbiAgKTogTWVudGlvblsncmVzb2x1dGlvbiddIHtcbiAgICBpZiAobWVudGlvbmVkLnR5cGUgIT09ICdhZ2VudCcpIHtcbiAgICAgIHRoaXMucHVzaE5vdGlmaWNhdGlvbihtZW50aW9uZWQuaWQsICdtZW50aW9uJywgbWVzc2FnZS5pZCk7XG4gICAgICByZXR1cm4gJ25vdGlmaWVkJztcbiAgICB9XG4gICAgLy8ga2lsbC1zd2l0Y2ggYXBwbGllcyB0byBldmVyeSBqb2ItbWF0ZXJpYWxpemluZyBwYXRoXG4gICAgaWYgKHRoaXMud29ya3NwYWNlUG9saWN5Lm1lbnRpb25EaXNwYXRjaCA9PT0gZmFsc2UpIHJldHVybiAnZGVuaWVkX3BvbGljeSc7XG5cbiAgICBjb25zdCBtZW50aW9uZXIgPSB0aGlzLmFjdG9ycy5nZXQobWVudGlvbmVySWQpO1xuICAgIGxldCBkZXB0aCA9IDA7XG4gICAgaWYgKG1lbnRpb25lcj8udHlwZSA9PT0gJ2FnZW50Jykge1xuICAgICAgLy8gYWdlbnQtbWVudGlvbi1hZ2VudDogZXhwbGljaXQgcG9saWN5ICsgZGVwdGggY2FwIChcdTAwQTc1LjQpXG4gICAgICBpZiAodGhpcy53b3Jrc3BhY2VQb2xpY3kuYWdlbnRNZW50aW9uQWdlbnQgIT09IHRydWUpIHJldHVybiAnZGVuaWVkX3BvbGljeSc7XG4gICAgICBjb25zdCBtZW50aW9uZXJKb2JzID0gWy4uLnRoaXMuYWdlbnRKb2JzLnZhbHVlcygpXS5maWx0ZXIoKGopID0+IGouYWdlbnRBY3RvcklkID09PSBtZW50aW9uZXJJZCk7XG4gICAgICBkZXB0aCA9IE1hdGgubWF4KDAsIC4uLm1lbnRpb25lckpvYnMubWFwKChqKSA9PiBqLmRlcHRoKSkgKyAxO1xuICAgICAgaWYgKGRlcHRoID4gQUdFTlRfSk9CX01BWF9ERVBUSCkgcmV0dXJuICdkZW5pZWRfZGVwdGgnO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBkZWZhdWx0LWRlbnk6IHRoZSBodW1hbiBtZW50aW9uZXIgbXVzdCBob2xkIGludm9rZSBhdXRob3JpdHkgXHUyMDE0XG4gICAgICAvLyBhdCBsZWFzdCBvbmUgYWN0aXZlIGRlbGl2ZXJ5IHJvbGUsIG9yIGdvdmVybmFuY2UgYWRtaW4uXG4gICAgICBjb25zdCBoYXNSb2xlID0gdGhpcy5yb2xlQXNzaWdubWVudHMuc29tZSgoYSkgPT4gYS5hY3RvcklkID09PSBtZW50aW9uZXJJZCAmJiAhYS5yZXZva2VkKTtcbiAgICAgIGNvbnN0IGlzQWRtaW4gPSB0aGlzLmdvdmVybmFuY2VSb2xlcy5nZXQobWVudGlvbmVySWQpID09PSAnYWRtaW4nIHx8IG1lbnRpb25lcklkID09PSB0aGlzLnN5c3RlbUFjdG9ySWQ7XG4gICAgICBpZiAoIWhhc1JvbGUgJiYgIWlzQWRtaW4pIHJldHVybiAnZGVuaWVkX3BvbGljeSc7XG4gICAgfVxuXG4gICAgY29uc3Qgam9iOiBBZ2VudEpvYiA9IHtcbiAgICAgIGlkOiB0aGlzLm5leHRJZCgnam9iJyksXG4gICAgICBhZ2VudEFjdG9ySWQ6IG1lbnRpb25lZC5pZCxcbiAgICAgIHRocmVhZElkOiB0aHJlYWQuaWQsXG4gICAgICBtZXNzYWdlSWQ6IG1lc3NhZ2UuaWQsXG4gICAgICB3b3JrSXRlbUlkOiB0aHJlYWQud29ya0l0ZW1JZCxcbiAgICAgIGZlYXR1cmVJZDogdGhyZWFkLmZlYXR1cmVJZCxcbiAgICAgIHN0YXR1czogJ3F1ZXVlZCcsXG4gICAgICBkZXB0aCxcbiAgICAgIG5vdGU6IG51bGwsXG4gICAgfTtcbiAgICB0aGlzLmFnZW50Sm9icy5zZXQoam9iLmlkLCBqb2IpO1xuICAgIHRoaXMuYXBwZW5kKCdhZ2VudF9qb2InLCBqb2IuaWQsICdhZ2VudF9qb2IuY3JlYXRlZCcsIG1lbnRpb25lcklkLCB7XG4gICAgICBhZ2VudEFjdG9ySWQ6IG1lbnRpb25lZC5pZCxcbiAgICAgIHRocmVhZElkOiB0aHJlYWQuaWQsXG4gICAgICBtZXNzYWdlSWQ6IG1lc3NhZ2UuaWQsXG4gICAgICBkZXB0aCxcbiAgICB9KTtcbiAgICB0aGlzLnB1c2hOb3RpZmljYXRpb24obWVudGlvbmVkLmlkLCAnbWVudGlvbicsIG1lc3NhZ2UuaWQpO1xuICAgIHJldHVybiAnam9iX2NyZWF0ZWQnO1xuICB9XG5cbiAgcHJpdmF0ZSBwdXNoTm90aWZpY2F0aW9uKGFjdG9ySWQ6IHN0cmluZywgc291cmNlOiBOb3RpZmljYXRpb25bJ3NvdXJjZSddLCByZWZJZDogc3RyaW5nKTogdm9pZCB7XG4gICAgdGhpcy5ub3RpZmljYXRpb25zLnB1c2goeyBpZDogdGhpcy5uZXh0SWQoJ250ZicpLCBhY3RvcklkLCBzb3VyY2UsIHJlZklkLCByZWFkOiBmYWxzZSB9KTtcbiAgfVxuXG4gIGxpc3RUaHJlYWRzKGZpbHRlcj86IHsgZmVhdHVyZUlkPzogc3RyaW5nOyB3b3JrSXRlbUlkPzogc3RyaW5nOyBhY3RvcklkPzogc3RyaW5nIH0pOiBUaHJlYWRbXSB7XG4gICAgcmV0dXJuIFsuLi50aGlzLnRocmVhZHMudmFsdWVzKCldXG4gICAgICAuZmlsdGVyKCh0KSA9PiB7XG4gICAgICAgIGlmIChmaWx0ZXI/LmZlYXR1cmVJZCAhPT0gdW5kZWZpbmVkICYmIHQuZmVhdHVyZUlkICE9PSBmaWx0ZXIuZmVhdHVyZUlkKSByZXR1cm4gZmFsc2U7XG4gICAgICAgIGlmIChmaWx0ZXI/LndvcmtJdGVtSWQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIGNvbnN0IHJlc29sdmVkID0gdGhpcy5tdXN0R2V0SXRlbShmaWx0ZXIud29ya0l0ZW1JZCkuaWQ7XG4gICAgICAgICAgaWYgKHQud29ya0l0ZW1JZCAhPT0gcmVzb2x2ZWQpIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZmlsdGVyPy5hY3RvcklkICE9PSB1bmRlZmluZWQgJiYgdC52aXNpYmlsaXR5ID09PSAncHJpdmF0ZScgJiYgIXRoaXMuaXNQYXJ0aWNpcGFudCh0LCBmaWx0ZXIuYWN0b3JJZCkpIHtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9KVxuICAgICAgLm1hcCgodCkgPT4gKHsgLi4udCwgcGFydGljaXBhbnRzOiBbLi4udC5wYXJ0aWNpcGFudHNdIH0pKTtcbiAgfVxuXG4gIGxpc3RNZXNzYWdlcyhpbnB1dDogeyB0aHJlYWRJZDogc3RyaW5nOyBhY3RvcklkOiBzdHJpbmc7IHNpbmNlU2VxPzogbnVtYmVyIH0pOiBNZXNzYWdlW10ge1xuICAgIGNvbnN0IHRocmVhZCA9IHRoaXMubXVzdEdldFRocmVhZChpbnB1dC50aHJlYWRJZCk7XG4gICAgaWYgKHRocmVhZC52aXNpYmlsaXR5ID09PSAncHJpdmF0ZScgJiYgIXRoaXMuaXNQYXJ0aWNpcGFudCh0aHJlYWQsIGlucHV0LmFjdG9ySWQpKSB7XG4gICAgICB0aHJvdyBuZXcgUGVybWlzc2lvbkRlbmllZEVycm9yKCd0aHJlYWQucmVhZCcsIGlucHV0LmFjdG9ySWQpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5tZXNzYWdlc1xuICAgICAgLmZpbHRlcigobSkgPT4gbS50aHJlYWRJZCA9PT0gdGhyZWFkLmlkICYmIChpbnB1dC5zaW5jZVNlcSA9PT0gdW5kZWZpbmVkIHx8IG0uc2VxID4gaW5wdXQuc2luY2VTZXEpKVxuICAgICAgLm1hcCgobSkgPT4gKHsgLi4ubSB9KSk7XG4gIH1cblxuICBsaXN0TWVudGlvbnMobWVzc2FnZUlkOiBzdHJpbmcpOiBNZW50aW9uW10ge1xuICAgIHJldHVybiB0aGlzLm1lbnRpb25zLmZpbHRlcigobSkgPT4gbS5tZXNzYWdlSWQgPT09IG1lc3NhZ2VJZCkubWFwKChtKSA9PiAoeyAuLi5tIH0pKTtcbiAgfVxuXG4gIGxpc3ROb3RpZmljYXRpb25zKGlucHV0OiB7IGFjdG9ySWQ6IHN0cmluZzsgdW5yZWFkT25seT86IGJvb2xlYW4gfSk6IE5vdGlmaWNhdGlvbltdIHtcbiAgICByZXR1cm4gdGhpcy5ub3RpZmljYXRpb25zXG4gICAgICAuZmlsdGVyKChuKSA9PiBuLmFjdG9ySWQgPT09IGlucHV0LmFjdG9ySWQgJiYgKGlucHV0LnVucmVhZE9ubHkgIT09IHRydWUgfHwgIW4ucmVhZCkpXG4gICAgICAubWFwKChuKSA9PiAoeyAuLi5uIH0pKTtcbiAgfVxuXG4gIG1hcmtOb3RpZmljYXRpb25SZWFkKGlucHV0OiB7IG5vdGlmaWNhdGlvbklkOiBzdHJpbmc7IGFjdG9ySWQ6IHN0cmluZyB9KTogdm9pZCB7XG4gICAgY29uc3Qgbm90aWZpY2F0aW9uID0gdGhpcy5ub3RpZmljYXRpb25zLmZpbmQoKG4pID0+IG4uaWQgPT09IGlucHV0Lm5vdGlmaWNhdGlvbklkKTtcbiAgICBpZiAoIW5vdGlmaWNhdGlvbikgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoYHVua25vd24gbm90aWZpY2F0aW9uOiAke2lucHV0Lm5vdGlmaWNhdGlvbklkfWApO1xuICAgIGlmIChub3RpZmljYXRpb24uYWN0b3JJZCAhPT0gaW5wdXQuYWN0b3JJZCkge1xuICAgICAgdGhyb3cgbmV3IFBlcm1pc3Npb25EZW5pZWRFcnJvcigndGhyZWFkLnJlYWQnLCBpbnB1dC5hY3RvcklkKTtcbiAgICB9XG4gICAgbm90aWZpY2F0aW9uLnJlYWQgPSB0cnVlO1xuICB9XG5cbiAgbGlzdEFnZW50Sm9icyhmaWx0ZXI/OiB7IGFnZW50QWN0b3JJZD86IHN0cmluZzsgc3RhdHVzPzogQWdlbnRKb2JbJ3N0YXR1cyddIH0pOiBBZ2VudEpvYltdIHtcbiAgICByZXR1cm4gWy4uLnRoaXMuYWdlbnRKb2JzLnZhbHVlcygpXVxuICAgICAgLmZpbHRlcihcbiAgICAgICAgKGopID0+XG4gICAgICAgICAgKGZpbHRlcj8uYWdlbnRBY3RvcklkID09PSB1bmRlZmluZWQgfHwgai5hZ2VudEFjdG9ySWQgPT09IGZpbHRlci5hZ2VudEFjdG9ySWQpICYmXG4gICAgICAgICAgKGZpbHRlcj8uc3RhdHVzID09PSB1bmRlZmluZWQgfHwgai5zdGF0dXMgPT09IGZpbHRlci5zdGF0dXMpLFxuICAgICAgKVxuICAgICAgLm1hcCgoaikgPT4gKHsgLi4uaiB9KSk7XG4gIH1cblxuICBjb21wbGV0ZUFnZW50Sm9iKGlucHV0OiB7IGpvYklkOiBzdHJpbmc7IGFjdG9ySWQ6IHN0cmluZzsgc3RhdHVzOiAnZG9uZScgfCAnYmxvY2tlZCc7IG5vdGU/OiBzdHJpbmcgfSk6IEFnZW50Sm9iIHtcbiAgICBjb25zdCBqb2IgPSB0aGlzLmFnZW50Sm9icy5nZXQoaW5wdXQuam9iSWQpO1xuICAgIGlmICgham9iKSB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcihgdW5rbm93biBhZ2VudCBqb2I6ICR7aW5wdXQuam9iSWR9YCk7XG4gICAgaWYgKGpvYi5hZ2VudEFjdG9ySWQgIT09IGlucHV0LmFjdG9ySWQpIHtcbiAgICAgIHRocm93IG5ldyBQZXJtaXNzaW9uRGVuaWVkRXJyb3IoJ2FnZW50X2pvYi5jb21wbGV0ZScsIGlucHV0LmFjdG9ySWQpO1xuICAgIH1cbiAgICBpZiAoam9iLnN0YXR1cyAhPT0gJ3F1ZXVlZCcpIHRocm93IG5ldyBHdWFyZEZhaWxlZEVycm9yKGBhZ2VudCBqb2IgJHtqb2IuaWR9IGlzIGFscmVhZHkgJHtqb2Iuc3RhdHVzfWApO1xuICAgIGpvYi5zdGF0dXMgPSBpbnB1dC5zdGF0dXM7XG4gICAgam9iLm5vdGUgPSBpbnB1dC5ub3RlID8/IG51bGw7XG4gICAgdGhpcy5hcHBlbmQoJ2FnZW50X2pvYicsIGpvYi5pZCwgJ2FnZW50X2pvYi5jb21wbGV0ZWQnLCBpbnB1dC5hY3RvcklkLCB7XG4gICAgICBzdGF0dXM6IGlucHV0LnN0YXR1cyxcbiAgICAgIG5vdGU6IGpvYi5ub3RlLFxuICAgIH0pO1xuICAgIC8vIG5vdGlmeSB0aGUgbWVudGlvbmVyIFx1MjAxNCB0aGUgcmV2ZXJzZSBkaXJlY3Rpb24gaXMgYSBtZXNzYWdlICsgbm90aWZpY2F0aW9uLCBub3RoaW5nIG1vcmUgKFx1MDBBNzUuNClcbiAgICBjb25zdCB0cmlnZ2VyID0gdGhpcy5tZXNzYWdlcy5maW5kKChtKSA9PiBtLmlkID09PSBqb2IubWVzc2FnZUlkKTtcbiAgICBpZiAodHJpZ2dlcikgdGhpcy5wdXNoTm90aWZpY2F0aW9uKHRyaWdnZXIuYXV0aG9ySWQsICdqb2JfY29tcGxldGVkJywgam9iLmlkKTtcbiAgICByZXR1cm4geyAuLi5qb2IgfTtcbiAgfVxuXG4gIC8vIC0tIGFnZW50IG1lbW9yeSAoUGhhc2UgNSwgcm9hZG1hcCBcdTAwQTc2KSAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgYXBwZW5kQWdlbnRNZW1vcnkoaW5wdXQ6IHtcbiAgICBhY3RvcklkOiBzdHJpbmc7XG4gICAga2luZDogTWVtb3J5S2luZDtcbiAgICBjb250ZW50OiBzdHJpbmc7XG4gICAgc291cmNlVGhyZWFkSWQ/OiBzdHJpbmc7XG4gIH0pOiBBZ2VudE1lbW9yeSB7XG4gICAgY29uc3QgYWN0b3IgPSB0aGlzLmFjdG9ycy5nZXQoaW5wdXQuYWN0b3JJZCk7XG4gICAgaWYgKCFhY3RvcikgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoYHVua25vd24gYWN0b3I6ICR7aW5wdXQuYWN0b3JJZH1gKTtcbiAgICBpZiAoYWN0b3IudHlwZSAhPT0gJ2FnZW50Jykge1xuICAgICAgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoJ21lbW9yeSBiZWxvbmdzIHRvIGFnZW50IGFjdG9ycyAocm9hZG1hcCBcdTAwQTc2KScpO1xuICAgIH1cbiAgICBsZXQgc291cmNlVGhyZWFkSWQ6IHN0cmluZyB8IG51bGwgPSBudWxsO1xuICAgIGxldCBzb3VyY2VWaXNpYmlsaXR5OiBBZ2VudE1lbW9yeVsnc291cmNlVmlzaWJpbGl0eSddID0gbnVsbDtcbiAgICBpZiAoaW5wdXQuc291cmNlVGhyZWFkSWQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgY29uc3QgdGhyZWFkID0gdGhpcy5tdXN0R2V0VGhyZWFkKGlucHV0LnNvdXJjZVRocmVhZElkKTtcbiAgICAgIC8vIExlYXJuaW5nIGZyb20gYSBwcml2YXRlIGNvbnRleHQgcmVxdWlyZXMgaGF2aW5nIGJlZW4gaW4gaXQuXG4gICAgICBpZiAodGhyZWFkLnZpc2liaWxpdHkgPT09ICdwcml2YXRlJyAmJiAhdGhpcy5pc1BhcnRpY2lwYW50KHRocmVhZCwgaW5wdXQuYWN0b3JJZCkpIHtcbiAgICAgICAgdGhyb3cgbmV3IFBlcm1pc3Npb25EZW5pZWRFcnJvcigndGhyZWFkLnJlYWQnLCBpbnB1dC5hY3RvcklkKTtcbiAgICAgIH1cbiAgICAgIHNvdXJjZVRocmVhZElkID0gdGhyZWFkLmlkO1xuICAgICAgc291cmNlVmlzaWJpbGl0eSA9IHRocmVhZC52aXNpYmlsaXR5O1xuICAgIH1cbiAgICBjb25zdCBzZXEgPSB0aGlzLmFnZW50TWVtb3JpZXMuZmlsdGVyKChtKSA9PiBtLmFnZW50QWN0b3JJZCA9PT0gaW5wdXQuYWN0b3JJZCkubGVuZ3RoICsgMTtcbiAgICBjb25zdCBtZW1vcnk6IEFnZW50TWVtb3J5ID0ge1xuICAgICAgaWQ6IHRoaXMubmV4dElkKCdtZW0nKSxcbiAgICAgIGFnZW50QWN0b3JJZDogaW5wdXQuYWN0b3JJZCxcbiAgICAgIGtpbmQ6IGlucHV0LmtpbmQsXG4gICAgICBjb250ZW50OiBpbnB1dC5jb250ZW50LFxuICAgICAgc291cmNlVGhyZWFkSWQsXG4gICAgICBzb3VyY2VWaXNpYmlsaXR5LFxuICAgICAgc2VxLFxuICAgIH07XG4gICAgdGhpcy5hZ2VudE1lbW9yaWVzLnB1c2gobWVtb3J5KTtcbiAgICAvLyBDb250ZW50IE5FVkVSIGVudGVycyB0aGUgc2hhcmVkIGV2ZW50IGxvZyBcdTIwMTQgcHJpdmF0ZSBsZWFybmluZyBtdXN0IG5vdFxuICAgIC8vIGxlYWsgaW50byB0aGUgYXVkaXQgc3RyZWFtIChyb2FkbWFwIFx1MDBBNzYgcGluKS5cbiAgICB0aGlzLmFwcGVuZCgnYWN0b3InLCBpbnB1dC5hY3RvcklkLCAnbWVtb3J5LmFwcGVuZGVkJywgaW5wdXQuYWN0b3JJZCwge1xuICAgICAgbWVtb3J5SWQ6IG1lbW9yeS5pZCxcbiAgICAgIGtpbmQ6IG1lbW9yeS5raW5kLFxuICAgICAgc291cmNlVGhyZWFkSWQsXG4gICAgfSk7XG4gICAgcmV0dXJuIHsgLi4ubWVtb3J5IH07XG4gIH1cblxuICBzZWFyY2hBZ2VudE1lbW9yeShpbnB1dDoge1xuICAgIGFjdG9ySWQ6IHN0cmluZztcbiAgICBjb250ZXh0VGhyZWFkSWQ/OiBzdHJpbmc7XG4gICAga2luZD86IE1lbW9yeUtpbmQ7XG4gICAgcXVlcnk/OiBzdHJpbmc7XG4gIH0pOiBBZ2VudE1lbW9yeVtdIHtcbiAgICAvLyBPd25lci1zY29wZWQgYnkgY29uc3RydWN0aW9uOiB0aGVyZSBpcyBubyBjcm9zcy1hY3RvciBwYXJhbWV0ZXIuXG4gICAgcmV0dXJuIHRoaXMuYWdlbnRNZW1vcmllc1xuICAgICAgLmZpbHRlcigobSkgPT4ge1xuICAgICAgICBpZiAobS5hZ2VudEFjdG9ySWQgIT09IGlucHV0LmFjdG9ySWQpIHJldHVybiBmYWxzZTtcbiAgICAgICAgaWYgKGlucHV0LmtpbmQgIT09IHVuZGVmaW5lZCAmJiBtLmtpbmQgIT09IGlucHV0LmtpbmQpIHJldHVybiBmYWxzZTtcbiAgICAgICAgaWYgKGlucHV0LnF1ZXJ5ICE9PSB1bmRlZmluZWQgJiYgIW0uY29udGVudC50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKGlucHV0LnF1ZXJ5LnRvTG93ZXJDYXNlKCkpKSByZXR1cm4gZmFsc2U7XG4gICAgICAgIC8vIFx1MDBBNzY6IG5vdGhpbmcgbGVhcm5lZCBpbiBhIHByaXZhdGUgdGhyZWFkIHN1cmZhY2VzIG91dHNpZGUgaXRzXG4gICAgICAgIC8vIHNvdXJjZSB0aHJlYWQuXG4gICAgICAgIGlmIChtLnNvdXJjZVZpc2liaWxpdHkgPT09ICdwcml2YXRlJyAmJiBtLnNvdXJjZVRocmVhZElkICE9PSBpbnB1dC5jb250ZXh0VGhyZWFkSWQpIHJldHVybiBmYWxzZTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9KVxuICAgICAgLm1hcCgobSkgPT4gKHsgLi4ubSB9KSk7XG4gIH1cblxuICAvKiogUmFpbHMgXHUyMTkyIGNoYXQgbmFycmF0aW9uIChcdTAwQTc1LjIpOiBzdGF0ZSBjaGFuZ2VzIG5hcnJhdGUgaW50byBib3VuZCB0YXNrIHRocmVhZHMuICovXG4gIHByaXZhdGUgbmFycmF0ZVdvcmtJdGVtKGl0ZW06IFdvcmtJdGVtUm93LCBib2R5OiBzdHJpbmcpOiB2b2lkIHtcbiAgICBmb3IgKGNvbnN0IHRocmVhZCBvZiB0aGlzLnRocmVhZHMudmFsdWVzKCkpIHtcbiAgICAgIGlmICh0aHJlYWQud29ya0l0ZW1JZCA9PT0gaXRlbS5pZCkge1xuICAgICAgICB0aGlzLmFwcGVuZE1lc3NhZ2UodGhyZWFkLCB0aGlzLnN5c3RlbUFjdG9ySWQsICdzeXN0ZW0nLCBib2R5LCBudWxsKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvLyAtLSBkaXNwYXRjaCAocm9hZG1hcCBcdTAwQTcyLjMpIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgZ2V0VGFza0NvbnRleHQoaW5wdXQ6IHsgd29ya0l0ZW1JZDogc3RyaW5nIH0pOiB7IHdvcmtJdGVtOiBXb3JrSXRlbTsgZW50cnlTdGF0ZTogV29ya0l0ZW1TdGF0ZSB9IHtcbiAgICBjb25zdCBpdGVtID0gdGhpcy5tdXN0R2V0SXRlbShpbnB1dC53b3JrSXRlbUlkKTtcbiAgICBpZiAoaXRlbS5zdGF0ZSA9PT0gJ2RvbmUnKSB7XG4gICAgICB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcignZG9uZSBpdGVtcyBhcmUgbmV2ZXIgcmUtZGlzcGF0Y2hlZDsgZm9sbG93LXVwIHJldmlldyBpcyBhIG5ldyB3b3JrIGl0ZW0nKTtcbiAgICB9XG4gICAgY29uc3QgZmVhdHVyZSA9IHRoaXMuZmVhdHVyZXMuZ2V0KGl0ZW0uZmVhdHVyZUlkKTtcbiAgICBpZiAoZmVhdHVyZT8uZGlzcGF0Y2hIb2xkKSB7XG4gICAgICB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcignZmVhdHVyZSBpcyB1bmRlciBhIGRvbmVfY2hlY2twb2ludCBkaXNwYXRjaCBob2xkJyk7XG4gICAgfVxuICAgIHJldHVybiB7IHdvcmtJdGVtOiB0aGlzLmNvcHlJdGVtKGl0ZW0pLCBlbnRyeVN0YXRlOiBpdGVtLnN0YXRlIH07XG4gIH1cblxuICByZWxlYXNlRGlzcGF0Y2hIb2xkKGlucHV0OiB7IGZlYXR1cmVJZDogc3RyaW5nOyBhY3RvcklkOiBzdHJpbmcgfSk6IEZlYXR1cmUge1xuICAgIHRoaXMucmVxdWlyZVBlcm1pc3Npb24oaW5wdXQuYWN0b3JJZCwgJ2Rpc3BhdGNoLnJlbGVhc2VfaG9sZCcpO1xuICAgIGNvbnN0IGZlYXR1cmUgPSB0aGlzLmZlYXR1cmVzLmdldChpbnB1dC5mZWF0dXJlSWQpO1xuICAgIGlmICghZmVhdHVyZSkgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoYHVua25vd24gZmVhdHVyZTogJHtpbnB1dC5mZWF0dXJlSWR9YCk7XG4gICAgZmVhdHVyZS5kaXNwYXRjaEhvbGQgPSBmYWxzZTtcbiAgICB0aGlzLmFwcGVuZCgnZmVhdHVyZScsIGZlYXR1cmUuaWQsICdmZWF0dXJlLmRpc3BhdGNoX2hvbGRfcmVsZWFzZWQnLCBpbnB1dC5hY3RvcklkLCB7fSk7XG4gICAgcmV0dXJuIHRoaXMuY29weUZlYXR1cmUoZmVhdHVyZSk7XG4gIH1cblxuICAvLyAtLSByZWNvbmNpbGlhdGlvbiAocm9hZG1hcCBcdTAwQTcxLjYsIEQ2OiBkZXRlY3Qtb25seSwgbmV2ZXIgbXV0YXRlcykgLS0tLS0tLS0tLS0tXG5cbiAgcmVjb25jaWxlKGlucHV0OiB7IGZpbGVzOiBBcnJheTx7IHdvcmtJdGVtSWQ6IHN0cmluZzsgZnJvbnRtYXR0ZXJTdGF0dXM6IHN0cmluZyB9PiB9KTogRGl2ZXJnZW5jZVJlcG9ydFtdIHtcbiAgICBjb25zdCByZXBvcnRzOiBEaXZlcmdlbmNlUmVwb3J0W10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IGZpbGUgb2YgaW5wdXQuZmlsZXMpIHtcbiAgICAgIGNvbnN0IGl0ZW0gPSB0aGlzLm11c3RHZXRJdGVtKGZpbGUud29ya0l0ZW1JZCk7XG4gICAgICAvLyBGaWxlcyB1bmRlciBhIGxpdmUgY2xhaW0gYXJlIGV4Y2x1ZGVkIFx1MjAxNCBwbGF5Ym9va3MgbGVnaXRpbWF0ZWx5IHdyaXRlXG4gICAgICAvLyBmcm9udG1hdHRlciBtaWQtcnVuIChcdTAwQTcxLjYpLlxuICAgICAgaWYgKHRoaXMubGl2ZUNsYWltKGl0ZW0uaWQpICE9PSBudWxsKSBjb250aW51ZTtcblxuICAgICAgY29uc3QgcmF3ID0gZmlsZS5mcm9udG1hdHRlclN0YXR1cy50cmltKCk7XG4gICAgICBpZiAocmF3ID09PSAnYmxvY2tlZCcpIHtcbiAgICAgICAgLy8gRDg6IG92ZXJsYXkgaW4gdGhlIERCIGFuZCBgc3RhdHVzOiBibG9ja2VkYCBpbiB0aGUgZmlsZSBhcmUgdGhlXG4gICAgICAgIC8vIHNhbWUgdHJ1dGguIEJsb2NrZWQtaW4tZmlsZSB3aXRoIE5PIG92ZXJsYXkgaXMgcmVhbCBkcmlmdC5cbiAgICAgICAgaWYgKGl0ZW0uYmxvY2tlZFJlYXNvbiAhPT0gbnVsbCkgY29udGludWU7XG4gICAgICAgIHJlcG9ydHMucHVzaCh7XG4gICAgICAgICAgd29ya0l0ZW1JZDogaXRlbS5pZCxcbiAgICAgICAgICBmaWxlU3RhdGU6IHJhdyxcbiAgICAgICAgICBkYlN0YXRlOiBpdGVtLnN0YXRlLFxuICAgICAgICAgIGtpbmQ6ICdjb25mbGljdCcsXG4gICAgICAgIH0pO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgY29uc3Qgbm9ybWFsaXplZCA9IExFR0FDWV9TVEFUVVNbcmF3XTtcbiAgICAgIGlmIChub3JtYWxpemVkID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmVwb3J0cy5wdXNoKHsgd29ya0l0ZW1JZDogaXRlbS5pZCwgZmlsZVN0YXRlOiByYXcsIGRiU3RhdGU6IGl0ZW0uc3RhdGUsIGtpbmQ6ICdjb25mbGljdCcgfSk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgaWYgKG5vcm1hbGl6ZWQgPT09IGl0ZW0uc3RhdGUpIGNvbnRpbnVlO1xuICAgICAgcmVwb3J0cy5wdXNoKHtcbiAgICAgICAgd29ya0l0ZW1JZDogaXRlbS5pZCxcbiAgICAgICAgZmlsZVN0YXRlOiByYXcsXG4gICAgICAgIGRiU3RhdGU6IGl0ZW0uc3RhdGUsXG4gICAgICAgIGtpbmQ6IFJBTktbbm9ybWFsaXplZF0gPiBSQU5LW2l0ZW0uc3RhdGVdID8gJ2ZpbGVfYWhlYWQnIDogJ2RiX2FoZWFkJyxcbiAgICAgIH0pO1xuICAgIH1cbiAgICByZXR1cm4gcmVwb3J0cztcbiAgfVxuXG4gIC8vIC0tIHF1ZXJpZXMgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgZ2V0V29ya0l0ZW0oaWQ6IHN0cmluZyk6IFdvcmtJdGVtIHtcbiAgICByZXR1cm4gdGhpcy5jb3B5SXRlbSh0aGlzLm11c3RHZXRJdGVtKGlkKSk7XG4gIH1cblxuICBnZXRGZWF0dXJlKGlkOiBzdHJpbmcpOiBGZWF0dXJlIHtcbiAgICBjb25zdCBmZWF0dXJlID0gdGhpcy5mZWF0dXJlcy5nZXQoaWQpO1xuICAgIGlmICghZmVhdHVyZSkgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoYHVua25vd24gZmVhdHVyZTogJHtpZH1gKTtcbiAgICByZXR1cm4gdGhpcy5jb3B5RmVhdHVyZShmZWF0dXJlKTtcbiAgfVxuXG4gIGxpc3RXb3JrSXRlbXMoZmlsdGVyPzogeyBzdGF0ZT86IFdvcmtJdGVtU3RhdGU7IGZlYXR1cmVJZD86IHN0cmluZzsgY2xhaW1hYmxlPzogYm9vbGVhbiB9KTogV29ya0l0ZW1bXSB7XG4gICAgcmV0dXJuIFsuLi50aGlzLndvcmtJdGVtcy52YWx1ZXMoKV1cbiAgICAgIC5maWx0ZXIoKGl0ZW0pID0+IHtcbiAgICAgICAgaWYgKGZpbHRlcj8uc3RhdGUgIT09IHVuZGVmaW5lZCAmJiBpdGVtLnN0YXRlICE9PSBmaWx0ZXIuc3RhdGUpIHJldHVybiBmYWxzZTtcbiAgICAgICAgaWYgKGZpbHRlcj8uZmVhdHVyZUlkICE9PSB1bmRlZmluZWQgJiYgaXRlbS5mZWF0dXJlSWQgIT09IGZpbHRlci5mZWF0dXJlSWQpIHJldHVybiBmYWxzZTtcbiAgICAgICAgaWYgKGZpbHRlcj8uY2xhaW1hYmxlID09PSB0cnVlICYmIHRoaXMubGl2ZUNsYWltKGl0ZW0uaWQpICE9PSBudWxsKSByZXR1cm4gZmFsc2U7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfSlcbiAgICAgIC5tYXAoKGl0ZW0pID0+IHRoaXMuY29weUl0ZW0oaXRlbSkpO1xuICB9XG5cbiAgZ2V0Q2xhaW1zKHdvcmtJdGVtSWQ6IHN0cmluZyk6IENsYWltW10ge1xuICAgIGNvbnN0IGl0ZW0gPSB0aGlzLm11c3RHZXRJdGVtKHdvcmtJdGVtSWQpO1xuICAgIHJldHVybiAodGhpcy5jbGFpbXNCeUl0ZW0uZ2V0KGl0ZW0uaWQpID8/IFtdKS5mbGF0TWFwKChjbGFpbUlkKSA9PiB7XG4gICAgICBjb25zdCBjbGFpbSA9IHRoaXMuY2xhaW1zLmdldChjbGFpbUlkKTtcbiAgICAgIHJldHVybiBjbGFpbSA/IFt0aGlzLmNvcHlDbGFpbShjbGFpbSldIDogW107XG4gICAgfSk7XG4gIH1cblxuICBldmVudHMoc3RyZWFtSWQ/OiBzdHJpbmcpOiBTcGluZUV2ZW50W10ge1xuICAgIGNvbnN0IHNvdXJjZSA9IHN0cmVhbUlkID09PSB1bmRlZmluZWQgPyB0aGlzLmV2ZW50TG9nIDogdGhpcy5ldmVudExvZy5maWx0ZXIoKGUpID0+IGUuc3RyZWFtSWQgPT09IHN0cmVhbUlkKTtcbiAgICByZXR1cm4gc291cmNlLm1hcCgoZXZlbnQpID0+ICh7IC4uLmV2ZW50LCBwYXlsb2FkOiB7IC4uLmV2ZW50LnBheWxvYWQgfSB9KSk7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUVuZ2luZSgpOiBTcGluZUVuZ2luZSB7XG4gIHJldHVybiBuZXcgRW5naW5lSW1wbCgpO1xufVxuIiwgIi8qKlxuICogRnJvemVuIGludGVudCByZWdpb24gZXh0cmFjdGlvbiArIHZlcnNpb25lZCBpbnRlbnQgaGFzaCAocm9hZG1hcCBcdTAwQTcxLjEpLlxuICpcbiAqIEJvdGggcmVhbC13b3JsZCB0YWdzIGFyZSByZWNvZ25pemVkOiBgPGludGVudC1jb250cmFjdD5gIChkZXYtYXV0b1xuICogc3BlYy10ZW1wbGF0ZS5tZCkgYW5kIGA8ZnJvemVuLWFmdGVyLWFwcHJvdmFsIC4uLj5gIChxdWljay1kZXZcbiAqIHNwZWMtdGVtcGxhdGUubWQpLiBIYXNoaW5nIGhhcHBlbnMgYWZ0ZXIgY2Fub25pY2FsaXphdGlvbiBzbyBsaW5lLWVuZGluZ1xuICogYW5kIHRyYWlsaW5nLXdoaXRlc3BhY2UgY2h1cm4gKENSTEYgZWRpdG9ycywgYXV0by1mb3JtYXR0ZXJzKSBuZXZlciBtb3Zlc1xuICogdGhlIGhhc2ggXHUyMDE0IG9ubHkgcmVhbCBpbnRlbnQgZHJpZnQgZG9lcyAodGVjaG5pY2FsLXJpc2sgcmV2aWV3OiBhbGFybVxuICogZmF0aWd1ZSBraWxscyB0aGUgbWVjaGFuaXNtKS5cbiAqL1xuaW1wb3J0IHsgY3JlYXRlSGFzaCB9IGZyb20gJ25vZGU6Y3J5cHRvJztcblxuaW1wb3J0IHsgSU5URU5UX0hBU0hfQUxHTyB9IGZyb20gJy4vdHlwZXMuanMnO1xuXG5jb25zdCBUQUdfUEFUVEVSTlMgPSBbXG4gIC88aW50ZW50LWNvbnRyYWN0PihbXFxzXFxTXSo/KTxcXC9pbnRlbnQtY29udHJhY3Q+LyxcbiAgLzxmcm96ZW4tYWZ0ZXItYXBwcm92YWxcXGJbXj5dKj4oW1xcc1xcU10qPyk8XFwvZnJvemVuLWFmdGVyLWFwcHJvdmFsPi8sXG5dO1xuXG5leHBvcnQgZnVuY3Rpb24gZXh0cmFjdEludGVudFJlZ2lvbihtYXJrZG93bjogc3RyaW5nKTogc3RyaW5nIHwgbnVsbCB7XG4gIGZvciAoY29uc3QgcGF0dGVybiBvZiBUQUdfUEFUVEVSTlMpIHtcbiAgICBjb25zdCBtYXRjaCA9IHBhdHRlcm4uZXhlYyhtYXJrZG93bik7XG4gICAgaWYgKG1hdGNoICE9PSBudWxsKSByZXR1cm4gbWF0Y2hbMV0gPz8gJyc7XG4gIH1cbiAgcmV0dXJuIG51bGw7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjYW5vbmljYWxpemVGb3JIYXNoKHRleHQ6IHN0cmluZyk6IHN0cmluZyB7XG4gIGNvbnN0IHVuaXhOZXdsaW5lcyA9IHRleHQucmVwbGFjZSgvXFxyXFxuL2csICdcXG4nKTtcbiAgY29uc3Qgc3RyaXBwZWQgPSB1bml4TmV3bGluZXNcbiAgICAuc3BsaXQoJ1xcbicpXG4gICAgLm1hcCgobGluZSkgPT4gbGluZS5yZXBsYWNlKC9bIFxcdF0rJC8sICcnKSlcbiAgICAuam9pbignXFxuJyk7XG4gIC8vIENvbGxhcHNlIHJ1bnMgb2YgMisgYmxhbmsgbGluZXMgdG8gYSBzaW5nbGUgYmxhbmsgbGluZTsgYSBzaW5nbGUgYmxhbmtcbiAgLy8gbGluZSBpcyBtZWFuaW5nZnVsIG1hcmtkb3duIGFuZCBwYXNzZXMgdGhyb3VnaCB1bnRvdWNoZWQuXG4gIHJldHVybiBzdHJpcHBlZC5yZXBsYWNlKC9cXG57Myx9L2csICdcXG5cXG4nKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNvbXB1dGVJbnRlbnRIYXNoKHJlZ2lvbjogc3RyaW5nKTogc3RyaW5nIHtcbiAgY29uc3QgZGlnZXN0ID0gY3JlYXRlSGFzaCgnc2hhMjU2JykudXBkYXRlKGNhbm9uaWNhbGl6ZUZvckhhc2gocmVnaW9uKSwgJ3V0ZjgnKS5kaWdlc3QoJ2hleCcpO1xuICByZXR1cm4gYCR7SU5URU5UX0hBU0hfQUxHT306JHtkaWdlc3R9YDtcbn1cbiIsICIvKipcbiAqIEBvYWhzL2NvcmUgXHUyMDE0IHB1YmxpYyBBUEkgb2YgdGhlIGRldGVybWluaXN0aWMgc3BpbmUgKFJ1bGVzIGxheWVyIGFzIGNvZGUpLlxuICpcbiAqIFRoZSBjb25mb3JtYW5jZSBzdWl0ZSBpbiB0ZXN0LyBpcyB0aGUgc3BlY2lmaWNhdGlvbjogaXQgd2FzIHdyaXR0ZW4gZmlyc3QsXG4gKiBmcm9tIHRoZSBwcm9zZSBydWxlcyBpbiB0aGUgQk1BRCBzb3VyY2UgYXMgYXJiaXRyYXRlZCBpbiBwcm9kdWN0LXJvYWRtYXAubWRcbiAqIFx1MDBBNzEgYW5kIHRlc3QvQ09ORk9STUFOQ0UubWQuIEltcGxlbWVudGF0aW9uIG1vZHVsZXM6XG4gKiAgLSB0eXBlcy50cyAgICAgICBcdTIwMTQgdm9jYWJ1bGFyeSwgZW50aXRpZXMsIGVycm9ycyAodGhlIGZpeGVkIHN1cmZhY2UpXG4gKiAgLSBlbmdpbmUudHMgICAgICBcdTIwMTQgaW4tbWVtb3J5IHJlZmVyZW5jZSBlbmdpbmUgKEZTTSwgY2xhaW1zLCBnYXRlcywgZXZlbnRzKVxuICogIC0gaW50ZW50LWhhc2gudHMgXHUyMDE0IGZyb3plbi1yZWdpb24gZXh0cmFjdGlvbiArIHZlcnNpb25lZCBjYW5vbmljYWxpemVkIGhhc2hcbiAqICAtIHN0b3JpZXMudHMgICAgIFx1MjAxNCBzdG9yaWVzLnlhbWwgcGFyc2luZyArIHZhbGlkaXR5IHJ1bGVzXG4gKlxuICogSW52YXJpYW50cyAocHJvZHVjdC1yb2FkbWFwLm1kIFx1MDBBNzAuMSwgbWFjaGluZS1jaGVja2VkIGluIENJKTpcbiAqICAtIE5vIExMTSBTREsgaW1wb3J0IGFueXdoZXJlIHVuZGVyIHBhY2thZ2VzL2NvcmUuXG4gKiAgLSBObyBjb2RlIHBhdGggb3V0c2lkZSBjb21tYW5kIGhhbmRsZXJzIHdyaXRlcyBwcm9qZWN0aW9ucy5cbiAqL1xuaW1wb3J0IHsgY3JlYXRlRW5naW5lIGFzIGNyZWF0ZU1lbW9yeUVuZ2luZSB9IGZyb20gJy4vZW5naW5lLmpzJztcbmltcG9ydCB0eXBlIHsgU3BpbmVFbmdpbmUgfSBmcm9tICcuL3R5cGVzLmpzJztcblxuZXhwb3J0ICogZnJvbSAnLi90eXBlcy5qcyc7XG5leHBvcnQgeyBleHRyYWN0SW50ZW50UmVnaW9uLCBjYW5vbmljYWxpemVGb3JIYXNoLCBjb21wdXRlSW50ZW50SGFzaCB9IGZyb20gJy4vaW50ZW50LWhhc2guanMnO1xuZXhwb3J0IHsgcGFyc2VTdG9yaWVzLCB0eXBlIFN0b3J5RW50cnkgfSBmcm9tICcuL3N0b3JpZXMuanMnO1xuXG4vKipcbiAqIEVuZ2luZSBmYWN0b3J5IGluZGlyZWN0aW9uOiB0aGUgY29uZm9ybWFuY2Ugc3VpdGUgYWx3YXlzIGNhbGxzXG4gKiBjcmVhdGVFbmdpbmUoKTsgYSBwZXJzaXN0ZW5jZSBwYWNrYWdlIChlLmcuIEBvYWhzL2RiKSByZWdpc3RlcnMgaXRzIG93blxuICogZmFjdG9yeSBpbiBhIHZpdGVzdCBzZXR1cCBmaWxlIHRvIHJ1biB0aGUgSURFTlRJQ0FMIHN1aXRlIGFnYWluc3QgUG9zdGdyZXNcbiAqIChzdG9yeSBcIjExXCI6IFwiY29uZm9ybWFuY2Ugc3VpdGUgcnVucyBhZ2FpbnN0IGJvdGggbWVtb3J5IGFuZCBQb3N0Z3Jlc1xuICogZW5naW5lc1wiKS4gRGVmYXVsdCBpcyB0aGUgaW4tbWVtb3J5IHJlZmVyZW5jZSBlbmdpbmUuXG4gKi9cbmxldCBlbmdpbmVGYWN0b3J5OiAoKSA9PiBTcGluZUVuZ2luZSA9IGNyZWF0ZU1lbW9yeUVuZ2luZTtcblxuZXhwb3J0IGZ1bmN0aW9uIHNldEVuZ2luZUZhY3RvcnkoZmFjdG9yeTogKCkgPT4gU3BpbmVFbmdpbmUpOiB2b2lkIHtcbiAgZW5naW5lRmFjdG9yeSA9IGZhY3Rvcnk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVFbmdpbmUoKTogU3BpbmVFbmdpbmUge1xuICByZXR1cm4gZW5naW5lRmFjdG9yeSgpO1xufVxuXG5leHBvcnQgeyBjcmVhdGVNZW1vcnlFbmdpbmUgfTtcbiIsICIvKipcbiAqIGRvY2xpbnQgXHUyMDE0IHRoZSBNRUFTVVJJTkcgdG9vbCBmb3Igbm9uLWNvZGUgd29yayAoUGhhc2UgNCwgcm9hZG1hcCBcdTAwQTcxLjQpLlxuICpcbiAqIFwiRm9yIG5vbi1jb2RlIHdvcms6IGV2aWRlbmNlIGlzIGVpdGhlciBtYWNoaW5lLWNoZWNrYWJsZSAoZmlsZSBleGlzdHMsXG4gKiBmcm9udG1hdHRlciBzY2hlbWEtdmFsaWQsIGRvY3VtZW50IGxpbnQpIG9yIGEgcGVybWl0dGVkIGFjdG9yJ3MgZ2F0ZVxuICogZGVjaXNpb24uIEEgY2hlY2tsaXN0IGFuIExMTSB0aWNrZWQgaXMgbmVpdGhlci5cIlxuICpcbiAqIGxpbnREb2MgaXMgZGV0ZXJtaW5pc3RpYyBhbmQgTExNLWZyZWU6IGl0IE1FQVNVUkVTIGEgZG9jdW1lbnQgYW5kIHJldHVybnNcbiAqIHJhdyBmaW5kaW5ncy4gVGhlIHZlcmRpY3QgKHdoZXRoZXIgYSBmYWlsaW5nIGxpbnQgYmxvY2tzIGluX3Byb2dyZXNzIFx1MjE5MlxuICogaW5fcmV2aWV3KSBpcyBjb21wdXRlZCBieSB0aGUgY29yZSBmcm9tIHRoZSBzdWJtaXR0ZWQgZG9jX2xpbnQgZXZpZGVuY2UgXHUyMDE0XG4gKiBuZXZlciBoZXJlLlxuICpcbiAqIENoZWNrczpcbiAqICAxLiBub24tZW1wdHkgY29udGVudDtcbiAqICAyLiBpZiB0aGUgZG9jdW1lbnQgb3BlbnMgd2l0aCBhICctLS0nIGZyb250bWF0dGVyIGZlbmNlLCB0aGUgYmxvY2sgbXVzdFxuICogICAgIHBhcnNlIGFzIFlBTUwgKGFuZCBjbG9zZSk7XG4gKiAgMy4gZXZlcnkgcmVxdWVzdGVkIHJlcXVpcmVkIHNlY3Rpb24gbXVzdCBleGlzdCBhcyBhbiBIMiBoZWFkaW5nXG4gKiAgICAgKGAjIyA8bmFtZT5gLCBjYXNlLWluc2Vuc2l0aXZlKTtcbiAqICA0LiBwbGFjZWhvbGRlciBtYXJrZXJzIChUQkQgLyBUT0RPIC8gRklYTUUgLyBMT1JFTSBJUFNVTSkgYXJlIGZpbmRpbmdzIFx1MjAxNFxuICogICAgIGEgcGxhY2Vob2xkZXItcmlkZGVuIGRvY3VtZW50IGlzIG5vdCBzY2hlbWEtdmFsaWQuXG4gKi9cbmltcG9ydCB7IHBhcnNlIGFzIHBhcnNlWWFtbCB9IGZyb20gJ3lhbWwnO1xuXG5leHBvcnQgaW50ZXJmYWNlIExpbnREb2NPcHRpb25zIHtcbiAgLyoqIEgyIGhlYWRpbmdzIHRoZSBkb2N1bWVudCBtdXN0IGNvbnRhaW4gKG1hdGNoZWQgYXMgYCMjIDxuYW1lPmApLiAqL1xuICByZXF1aXJlZFNlY3Rpb25zPzogc3RyaW5nW107XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgRG9jTGludFJlc3VsdCB7XG4gIC8qKiB0cnVlIHdoZW4gZXZlcnkgY2hlY2sgcGFzc2VkIFx1MjAxNCB0aGUgcGF5bG9hZCB0aGUgY29yZSBndWFyZHMgb24uICovXG4gIHNjaGVtYVZhbGlkOiBib29sZWFuO1xuICAvKiogSHVtYW4tcmVhZGFibGUgZmluZGluZ3MsIGVtcHR5IHdoZW4gc2NoZW1hVmFsaWQuICovXG4gIGZpbmRpbmdzOiBzdHJpbmdbXTtcbn1cblxuY29uc3QgUExBQ0VIT0xERVJfUkUgPSAvXFxiKFRCRHxUT0RPfEZJWE1FfExPUkVNIElQU1VNKVxcYi9pO1xuXG4vKiogRXNjYXBlIGEgc3RyaW5nIGZvciBsaXRlcmFsIHVzZSBpbnNpZGUgYSBSZWdFeHAuICovXG5mdW5jdGlvbiBlc2NhcGVSZWdFeHAodmFsdWU6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiB2YWx1ZS5yZXBsYWNlKC9bLiorP14ke30oKXxbXFxdXFxcXF0vZywgJ1xcXFwkJicpO1xufVxuXG4vKipcbiAqIFNwbGl0IG9mZiBhIGxlYWRpbmcgJy0tLScgZnJvbnRtYXR0ZXIgYmxvY2suIFJldHVybnMgdGhlIHJhdyBibG9jayAobnVsbFxuICogd2hlbiB0aGVyZSBpcyBub25lKSwgd2hldGhlciB0aGUgZmVuY2UgY2xvc2VkLCBhbmQgdGhlIHJlbWFpbmluZyBib2R5LlxuICovXG5mdW5jdGlvbiBzcGxpdEZyb250bWF0dGVyKGNvbnRlbnQ6IHN0cmluZyk6IHtcbiAgYmxvY2s6IHN0cmluZyB8IG51bGw7XG4gIGNsb3NlZDogYm9vbGVhbjtcbiAgYm9keTogc3RyaW5nO1xufSB7XG4gIGlmICghY29udGVudC5zdGFydHNXaXRoKCctLS0nKSkgcmV0dXJuIHsgYmxvY2s6IG51bGwsIGNsb3NlZDogdHJ1ZSwgYm9keTogY29udGVudCB9O1xuICBjb25zdCBjbG9zZSA9IGNvbnRlbnQuaW5kZXhPZignXFxuLS0tJywgMyk7XG4gIGlmIChjbG9zZSA9PT0gLTEpIHJldHVybiB7IGJsb2NrOiBudWxsLCBjbG9zZWQ6IGZhbHNlLCBib2R5OiBjb250ZW50IH07XG4gIGNvbnN0IGZpcnN0TmV3bGluZSA9IGNvbnRlbnQuaW5kZXhPZignXFxuJyk7XG4gIGNvbnN0IGJsb2NrID0gY29udGVudC5zbGljZShmaXJzdE5ld2xpbmUgKyAxLCBjbG9zZSk7XG4gIGNvbnN0IGJvZHlTdGFydCA9IGNvbnRlbnQuaW5kZXhPZignXFxuJywgY2xvc2UgKyAxKTtcbiAgY29uc3QgYm9keSA9IGJvZHlTdGFydCA9PT0gLTEgPyAnJyA6IGNvbnRlbnQuc2xpY2UoYm9keVN0YXJ0ICsgMSk7XG4gIHJldHVybiB7IGJsb2NrLCBjbG9zZWQ6IHRydWUsIGJvZHkgfTtcbn1cblxuLyoqIERldGVybWluaXN0aWNhbGx5IGxpbnQgYSBkb2N1bWVudC4gUHVyZSBtZWFzdXJlbWVudCBcdTIwMTQgbm8gTExNLCBubyB2ZXJkaWN0cy4gKi9cbmV4cG9ydCBmdW5jdGlvbiBsaW50RG9jKGNvbnRlbnQ6IHN0cmluZywgb3B0czogTGludERvY09wdGlvbnMgPSB7fSk6IERvY0xpbnRSZXN1bHQge1xuICBjb25zdCBmaW5kaW5nczogc3RyaW5nW10gPSBbXTtcblxuICBpZiAoY29udGVudC50cmltKCkubGVuZ3RoID09PSAwKSB7XG4gICAgZmluZGluZ3MucHVzaCgnZG9jdW1lbnQgaXMgZW1wdHknKTtcbiAgICByZXR1cm4geyBzY2hlbWFWYWxpZDogZmFsc2UsIGZpbmRpbmdzIH07XG4gIH1cblxuICBjb25zdCB7IGJsb2NrLCBjbG9zZWQgfSA9IHNwbGl0RnJvbnRtYXR0ZXIoY29udGVudCk7XG4gIGlmICghY2xvc2VkKSB7XG4gICAgZmluZGluZ3MucHVzaChcImZyb250bWF0dGVyIGZlbmNlICctLS0nIG5ldmVyIGNsb3Nlc1wiKTtcbiAgfSBlbHNlIGlmIChibG9jayAhPT0gbnVsbCkge1xuICAgIHRyeSB7XG4gICAgICBwYXJzZVlhbWwoYmxvY2spO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBjb25zdCBtZXNzYWdlID0gZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2Uuc3BsaXQoJ1xcbicpWzBdIDogU3RyaW5nKGVycm9yKTtcbiAgICAgIGZpbmRpbmdzLnB1c2goYGZyb250bWF0dGVyIGlzIG5vdCB2YWxpZCBZQU1MOiAke21lc3NhZ2UgPz8gJ3BhcnNlIGVycm9yJ31gKTtcbiAgICB9XG4gIH1cblxuICBmb3IgKGNvbnN0IHNlY3Rpb24gb2Ygb3B0cy5yZXF1aXJlZFNlY3Rpb25zID8/IFtdKSB7XG4gICAgY29uc3QgaGVhZGluZ1JlID0gbmV3IFJlZ0V4cChgXiMjXFxcXHMrJHtlc2NhcGVSZWdFeHAoc2VjdGlvbil9XFxcXHMqJGAsICdpbScpO1xuICAgIGlmICghaGVhZGluZ1JlLnRlc3QoY29udGVudCkpIHtcbiAgICAgIGZpbmRpbmdzLnB1c2goYG1pc3NpbmcgcmVxdWlyZWQgc2VjdGlvbjogIyMgJHtzZWN0aW9ufWApO1xuICAgIH1cbiAgfVxuXG4gIGNvbnN0IGxpbmVzID0gY29udGVudC5zcGxpdCgnXFxuJyk7XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgbGluZXMubGVuZ3RoOyBpICs9IDEpIHtcbiAgICBjb25zdCBsaW5lID0gbGluZXNbaV07XG4gICAgaWYgKGxpbmUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgY29uc3QgbWF0Y2ggPSBQTEFDRUhPTERFUl9SRS5leGVjKGxpbmUpO1xuICAgICAgaWYgKG1hdGNoICE9PSBudWxsKSB7XG4gICAgICAgIGZpbmRpbmdzLnB1c2goYHBsYWNlaG9sZGVyIFwiJHttYXRjaFsxXSA/PyBtYXRjaFswXX1cIiBhdCBsaW5lICR7aSArIDF9YCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHsgc2NoZW1hVmFsaWQ6IGZpbmRpbmdzLmxlbmd0aCA9PT0gMCwgZmluZGluZ3MgfTtcbn1cbiIsICIvKipcbiAqIEBvYWhzL3J1bm5lciBcdTIwMTQgdGVhbW1hdGUgSk9CUyBydW50aW1lIChQaGFzZSA1LCByb2FkbWFwIFx1MDBBNzYpLlxuICpcbiAqIFRoZSBnZW5lcmljIGxlYXJuaW5nLXRlYW1tYXRlIGxvb3A6IGEgbWVudGlvbiBtYXRlcmlhbGl6ZXMgYSByZXBseS1vbmx5XG4gKiBhZ2VudCBqb2IgKFx1MDBBNzUuNCk7IHRoaXMgcnVudGltZSBsZXRzIEFOWSBhZ2VudC1jbWQgKGNsYXVkZSwgaGVybWVzLCBcdTIwMjYpIHNlcnZlXG4gKiB0aG9zZSBqb2JzIFRIUk9VR0ggVEhFIFJBSUxTIFx1MjAxNCByZWFkIGNvbnRleHQgdmlhIGxpc3RfbWVzc2FnZXMsIHJlY2FsbCB2aWFcbiAqIHNlYXJjaF9hZ2VudF9tZW1vcnksIHJlcGx5IHZpYSBwb3N0X21lc3NhZ2UsIGxlYXJuIHZpYSBhcHBlbmRfYWdlbnRfbWVtb3J5LlxuICpcbiAqIEd1YXJkcmFpbCBieSBjb25zdHJ1Y3Rpb24gKFx1MDBBNzYgXCJsZWFybmluZyBuZXZlciBiZWNvbWVzIGF1dGhvcml0eVwiKTogdGhpc1xuICogbW9kdWxlIGNhbGxzIE5PIGxpZmVjeWNsZSBjb21tYW5kIFx1MjAxNCBubyBjbGFpbSwgbm8gYWR2YW5jZSwgbm8gZ2F0ZS4gVGhlXG4gKiBhdWRpdCB0cmFpbCBvZiBhIGpvYnMtbW9kZSBhZ2VudCBzaG93cyBtZXNzYWdlcywgam9iIGNvbXBsZXRpb25zLCBhbmRcbiAqIGNvbnRlbnQtZnJlZSBtZW1vcnkgZXZlbnRzLCBub3RoaW5nIGVsc2UuIFRoZXJlIGlzIG5vIExMTSBTREsgaGVyZTsgdGhlXG4gKiBhZ2VudCBiaW5hcnkgaXMgYW4gZXh0ZXJuYWwgY29tbWFuZCwgZXhhY3RseSBsaWtlIHRoZSB3b3JrZXIgbG9vcCdzLlxuICpcbiAqIE9uZSBjeWNsZSAocnVuSm9ic09uY2UpOlxuICogIDEuIHBvbGwgbGlzdF9hZ2VudF9qb2JzKGFnZW50QWN0b3JJZCwgc3RhdHVzPXF1ZXVlZCkgXHUyMTkyIGZpcnN0IGpvYlxuICogIDIuIHJlYWQgdGhlIHRocmVhZCB2aWEgdGhlIHJhaWxzLiBBIHByaXZhdGUgdGhyZWFkIHRoZSBhZ2VudCB3YXMgbmV2ZXJcbiAqICAgICBpbnZpdGVkIGludG8gYW5zd2VycyA0MDMgXHUyMDE0IHRoZSBqb2IgY29tcGxldGVzIGBibG9ja2VkYCB3aXRoIG5vdGVcbiAqICAgICAnbm8gdGhyZWFkIGFjY2VzcycgKHRoZSByYWlscyBkZWNpZGUgdmlzaWJpbGl0eSwgbmV2ZXIgdGhlIHJ1bnRpbWUpLlxuICogIDMuIHJlY2FsbDogc2VhcmNoX2FnZW50X21lbW9yeShjb250ZXh0VGhyZWFkSWQgPSBqb2IudGhyZWFkSWQpLCBuZXdlc3QgMjBcbiAqICAgICAocmVjYWxsIGZhaWx1cmVzIGFyZSBzb2Z0IFx1MjAxNCBtZW1vcnkgbWFrZXMgcmVwbGllcyBiZXR0ZXIsIG5ldmVyIGdhdGVzIHRoZW0pXG4gKiAgNC4gd3JpdGUge2pvYiwgbWVzc2FnZXMsIG1lbW9yaWVzfSBKU09OIHRvIGEgdGVtcCBDT05URVhUX0ZJTEVcbiAqICA1LiBpbnZva2UgdGhlIGFnZW50IGNvbW1hbmQgdGVtcGxhdGUgKHtDT05URVhUX0ZJTEV9IHtSRVBMWV9GSUxFfVxuICogICAgIHtUSFJFQURfSUR9IHtKT0JfSUR9OyBlbnYgT0FIU19DT05URVhUX0ZJTEUgLyBPQUhTX1JFUExZX0ZJTEUpO1xuICogICAgIHRoZSBhZ2VudCB3cml0ZXMgaXRzIHJlcGx5IHRleHQgdG8gUkVQTFlfRklMRVxuICogIDYuIHBvc3RfbWVzc2FnZSh0aHJlYWRJZCwgcmVwbHksIG1lbnRpb25zPVt0cmlnZ2VyIGF1dGhvcl0pIFx1MjE5MiB0aGUgcmV2ZXJzZVxuICogICAgIG1lbnRpb24gbm90aWZpZXMgdGhlIGh1bWFuIHdobyBhc2tlZCAoXHUwMEE3NS40KVxuICogIDcuIGNvbXBsZXRlX2FnZW50X2pvYihkb25lKVxuICogIDguIGFwcGVuZF9hZ2VudF9tZW1vcnkoZXBpc29kaWMsICdqb2IgPGlkPiBpbiB0aHJlYWQgPGlkPjogPHJlcGx5IGhlYWQ+JyxcbiAqICAgICBzb3VyY2VUaHJlYWRJZCA9IGpvYi50aHJlYWRJZCkgXHUyMDE0IHNvZnQ6IGEgbGVhcm5pbmcgZmFpbHVyZSBuZXZlciB1bmRvZXNcbiAqICAgICB0aGUgZGVsaXZlcmVkIHJlcGx5LlxuICovXG5pbXBvcnQgeyBzcGF3blN5bmMgfSBmcm9tICdub2RlOmNoaWxkX3Byb2Nlc3MnO1xuaW1wb3J0IHsgZXhpc3RzU3luYywgbWtkdGVtcFN5bmMsIHJlYWRGaWxlU3luYywgcm1TeW5jLCB3cml0ZUZpbGVTeW5jIH0gZnJvbSAnbm9kZTpmcyc7XG5pbXBvcnQgeyB0bXBkaXIgfSBmcm9tICdub2RlOm9zJztcbmltcG9ydCB7IGpvaW4gfSBmcm9tICdub2RlOnBhdGgnO1xuaW1wb3J0IHR5cGUgeyBPYWhzQ2xpZW50IH0gZnJvbSAnQG9haHMvY29udHJhY3RzJztcbmltcG9ydCB0eXBlIHsgQWdlbnRKb2IsIEFnZW50TWVtb3J5LCBNZXNzYWdlIH0gZnJvbSAnQG9haHMvY29yZSc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgSm9ic1J1bm5lck9wdGlvbnMge1xuICBjbGllbnQ6IE9haHNDbGllbnQ7XG4gIC8qKiBUaGUgYWdlbnQgYWN0b3IgdGhpcyBydW50aW1lIHNlcnZlcyBcdTIwMTQgaXRzIE9XTiBqb2JzLCBub2JvZHkgZWxzZSdzLiAqL1xuICBhZ2VudEFjdG9ySWQ6IHN0cmluZztcbiAgLyoqXG4gICAqIEFnZW50IGNvbW1hbmQgdGVtcGxhdGUuIFBsYWNlaG9sZGVyczoge0NPTlRFWFRfRklMRX0ge1JFUExZX0ZJTEV9XG4gICAqIHtUSFJFQURfSUR9IHtKT0JfSUR9LiBBbHNvIHJlY2VpdmVzIGVudiBPQUhTX0NPTlRFWFRfRklMRSAvIE9BSFNfUkVQTFlfRklMRS5cbiAgICovXG4gIGFnZW50Q21kOiBzdHJpbmc7XG4gIC8qKiBNYXggd2FsbCB0aW1lIGZvciBvbmUgYWdlbnQgaW52b2NhdGlvbiAobXMpLiBEZWZhdWx0IDEwIG1pbnV0ZXMuICovXG4gIGFnZW50VGltZW91dE1zPzogbnVtYmVyO1xuICAvKiogRXh0cmEgZW52aXJvbm1lbnQgdmFyaWFibGVzIHBhc3NlZCB0byB0aGUgYWdlbnQgaW52b2NhdGlvbi4gKi9cbiAgYWdlbnRFbnY/OiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+O1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEpvYnNPbmNlUmVzdWx0IHtcbiAgLyoqIHRydWUgd2hlbiBhIHF1ZXVlZCBqb2IgZXhpc3RlZCBhbmQgd2FzIGRyaXZlbiB0byBkb25lL2Jsb2NrZWQuICovXG4gIGhhbmRsZWQ6IGJvb2xlYW47XG4gIGpvYklkPzogc3RyaW5nO1xuICBvdXRjb21lPzogJ2RvbmUnIHwgJ2Jsb2NrZWQnO1xuICBkZXRhaWxzPzogc3RyaW5nO1xufVxuXG4vKiogTmV3ZXN0IG1lbW9yaWVzIHRoZSBjb250ZXh0IGZpbGUgY2FycmllcyAobW9zdCByZWNlbnQgbGFzdCwgYXBwZW5kIG9yZGVyKS4gKi9cbmNvbnN0IFJFQ0FMTF9MSU1JVCA9IDIwO1xuXG4vKiogRXBpc29kaWMgbGVhcm5pbmcgbm90ZSBrZWVwcyBvbmx5IHRoZSBoZWFkIG9mIHRoZSByZXBseS4gKi9cbmNvbnN0IE1FTU9SWV9SRVBMWV9IRUFEID0gMjAwO1xuXG5mdW5jdGlvbiBpc1JlbW90ZUVycm9yKGVycm9yOiB1bmtub3duLCBuYW1lOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgcmV0dXJuIChcbiAgICB0eXBlb2YgZXJyb3IgPT09ICdvYmplY3QnICYmXG4gICAgZXJyb3IgIT09IG51bGwgJiZcbiAgICAoZXJyb3IgYXMgeyBlcnJvck5hbWU/OiB1bmtub3duIH0pLmVycm9yTmFtZSA9PT0gbmFtZVxuICApO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcnVuSm9ic09uY2Uob3B0aW9uczogSm9ic1J1bm5lck9wdGlvbnMpOiBQcm9taXNlPEpvYnNPbmNlUmVzdWx0PiB7XG4gIGNvbnN0IHsgY2xpZW50LCBhZ2VudEFjdG9ySWQgfSA9IG9wdGlvbnM7XG5cbiAgLy8gMSBcdTIwMTQgcG9sbDogdGhpcyBhZ2VudCdzIHF1ZXVlZCBqb2JzIG9ubHk7IHRha2UgdGhlIGZpcnN0LlxuICBjb25zdCBxdWV1ZWQgPSBhd2FpdCBjbGllbnQuY2FsbDxBZ2VudEpvYltdPignbGlzdF9hZ2VudF9qb2JzJywge1xuICAgIGFnZW50QWN0b3JJZCxcbiAgICBzdGF0dXM6ICdxdWV1ZWQnLFxuICB9KTtcbiAgY29uc3Qgam9iID0gcXVldWVkWzBdO1xuICBpZiAoam9iID09PSB1bmRlZmluZWQpIHJldHVybiB7IGhhbmRsZWQ6IGZhbHNlIH07XG5cbiAgLy8gMiBcdTIwMTQgcmVhZCB0aGUgdGhyZWFkIFRIUk9VR0ggdGhlIHJhaWxzLiA0MDMgPSB0aGUgYWdlbnQgbWF5IG5vdCBzZWUgdGhpc1xuICAvLyBjb250ZXh0IChwcml2YXRlIHRocmVhZCwgbmV2ZXIgaW52aXRlZCkgXHUyMTkyIGJsb2NrZWQsIG5vdGUgb25seS4gTm8gcmV0cnksXG4gIC8vIG5vIHByaXZpbGVnZTogdmlzaWJpbGl0eSBpcyB0aGUgZW5naW5lJ3MgY2FsbC5cbiAgbGV0IG1lc3NhZ2VzOiBNZXNzYWdlW107XG4gIHRyeSB7XG4gICAgbWVzc2FnZXMgPSBhd2FpdCBjbGllbnQuY2FsbDxNZXNzYWdlW10+KCdsaXN0X21lc3NhZ2VzJywgeyB0aHJlYWRJZDogam9iLnRocmVhZElkIH0pO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGlmIChpc1JlbW90ZUVycm9yKGVycm9yLCAnUGVybWlzc2lvbkRlbmllZEVycm9yJykpIHtcbiAgICAgIGF3YWl0IGNsaWVudC5jYWxsKCdjb21wbGV0ZV9hZ2VudF9qb2InLCB7XG4gICAgICAgIGpvYklkOiBqb2IuaWQsXG4gICAgICAgIHN0YXR1czogJ2Jsb2NrZWQnLFxuICAgICAgICBub3RlOiAnbm8gdGhyZWFkIGFjY2VzcycsXG4gICAgICB9KTtcbiAgICAgIHJldHVybiB7IGhhbmRsZWQ6IHRydWUsIGpvYklkOiBqb2IuaWQsIG91dGNvbWU6ICdibG9ja2VkJywgZGV0YWlsczogJ25vIHRocmVhZCBhY2Nlc3MnIH07XG4gICAgfVxuICAgIHRocm93IGVycm9yO1xuICB9XG5cbiAgLy8gMyBcdTIwMTQgcmVjYWxsIChzb2Z0KTogb3duZXItc2NvcGVkIGJ5IGNvbnN0cnVjdGlvbjsgdGhlIGVuZ2luZSBhbHJlYWR5XG4gIC8vIGZpbHRlcnMgcHJpdmF0ZS1zb3VyY2VkIG1lbW9yaWVzIHRvIHRoZWlyIHNvdXJjZSB0aHJlYWQgKFx1MDBBNzYpLlxuICBsZXQgbWVtb3JpZXM6IEFnZW50TWVtb3J5W10gPSBbXTtcbiAgdHJ5IHtcbiAgICBjb25zdCByZWNhbGxlZCA9IGF3YWl0IGNsaWVudC5jYWxsPEFnZW50TWVtb3J5W10+KCdzZWFyY2hfYWdlbnRfbWVtb3J5Jywge1xuICAgICAgY29udGV4dFRocmVhZElkOiBqb2IudGhyZWFkSWQsXG4gICAgfSk7XG4gICAgbWVtb3JpZXMgPSByZWNhbGxlZC5zbGljZSgtUkVDQUxMX0xJTUlUKTtcbiAgfSBjYXRjaCB7XG4gICAgLyogcmVjYWxsIG5ldmVyIGdhdGVzIGEgcmVwbHkgKi9cbiAgfVxuXG4gIC8vIDQvNSBcdTIwMTQgY29udGV4dCBmaWxlIGluLCByZXBseSBmaWxlIG91dC5cbiAgY29uc3QgZGlyID0gbWtkdGVtcFN5bmMoam9pbih0bXBkaXIoKSwgJ29haHMtam9iLScpKTtcbiAgdHJ5IHtcbiAgICBjb25zdCBjb250ZXh0RmlsZSA9IGpvaW4oZGlyLCAnY29udGV4dC5qc29uJyk7XG4gICAgY29uc3QgcmVwbHlGaWxlID0gam9pbihkaXIsICdyZXBseS50eHQnKTtcbiAgICB3cml0ZUZpbGVTeW5jKGNvbnRleHRGaWxlLCBgJHtKU09OLnN0cmluZ2lmeSh7IGpvYiwgbWVzc2FnZXMsIG1lbW9yaWVzIH0sIG51bGwsIDIpfVxcbmAsICd1dGY4Jyk7XG5cbiAgICBjb25zdCBjb21tYW5kID0gb3B0aW9ucy5hZ2VudENtZFxuICAgICAgLnJlcGxhY2VBbGwoJ3tDT05URVhUX0ZJTEV9JywgY29udGV4dEZpbGUpXG4gICAgICAucmVwbGFjZUFsbCgne1JFUExZX0ZJTEV9JywgcmVwbHlGaWxlKVxuICAgICAgLnJlcGxhY2VBbGwoJ3tUSFJFQURfSUR9Jywgam9iLnRocmVhZElkKVxuICAgICAgLnJlcGxhY2VBbGwoJ3tKT0JfSUR9Jywgam9iLmlkKTtcbiAgICBjb25zdCBpbnZva2VkID0gc3Bhd25TeW5jKCdiYXNoJywgWyctbGMnLCBjb21tYW5kXSwge1xuICAgICAgY3dkOiBkaXIsXG4gICAgICBlbmNvZGluZzogJ3V0ZjgnLFxuICAgICAgdGltZW91dDogb3B0aW9ucy5hZ2VudFRpbWVvdXRNcyA/PyAxMCAqIDYwICogMTAwMCxcbiAgICAgIGtpbGxTaWduYWw6ICdTSUdLSUxMJyxcbiAgICAgIGVudjoge1xuICAgICAgICAuLi5wcm9jZXNzLmVudixcbiAgICAgICAgLi4ub3B0aW9ucy5hZ2VudEVudixcbiAgICAgICAgT0FIU19DT05URVhUX0ZJTEU6IGNvbnRleHRGaWxlLFxuICAgICAgICBPQUhTX1JFUExZX0ZJTEU6IHJlcGx5RmlsZSxcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICBjb25zdCByZXBseSA9IGV4aXN0c1N5bmMocmVwbHlGaWxlKSA/IHJlYWRGaWxlU3luYyhyZXBseUZpbGUsICd1dGY4JykudHJpbSgpIDogJyc7XG4gICAgaWYgKHJlcGx5ID09PSAnJykge1xuICAgICAgY29uc3Qgbm90ZSA9IGBhZ2VudCB3cm90ZSBubyByZXBseSAoZXhpdCAke1N0cmluZyhpbnZva2VkLnN0YXR1cyA/PyAtMSl9KWA7XG4gICAgICBhd2FpdCBjbGllbnQuY2FsbCgnY29tcGxldGVfYWdlbnRfam9iJywgeyBqb2JJZDogam9iLmlkLCBzdGF0dXM6ICdibG9ja2VkJywgbm90ZSB9KTtcbiAgICAgIHJldHVybiB7IGhhbmRsZWQ6IHRydWUsIGpvYklkOiBqb2IuaWQsIG91dGNvbWU6ICdibG9ja2VkJywgZGV0YWlsczogbm90ZSB9O1xuICAgIH1cblxuICAgIC8vIDYgXHUyMDE0IHJlcGx5IHdpdGggdGhlIHJldmVyc2UgbWVudGlvbiB0byB3aG9ldmVyIHRyaWdnZXJlZCB0aGUgam9iLlxuICAgIGNvbnN0IHRyaWdnZXIgPSBtZXNzYWdlcy5maW5kKChtKSA9PiBtLmlkID09PSBqb2IubWVzc2FnZUlkKTtcbiAgICBhd2FpdCBjbGllbnQuY2FsbDxNZXNzYWdlPigncG9zdF9tZXNzYWdlJywge1xuICAgICAgdGhyZWFkSWQ6IGpvYi50aHJlYWRJZCxcbiAgICAgIGJvZHk6IHJlcGx5LFxuICAgICAgLi4uKHRyaWdnZXIgIT09IHVuZGVmaW5lZCA/IHsgbWVudGlvbnM6IFt0cmlnZ2VyLmF1dGhvcklkXSB9IDoge30pLFxuICAgIH0pO1xuXG4gICAgLy8gNyBcdTIwMTQgY29tcGxldGU6IG5vdGlmaWVzIHRoZSBtZW50aW9uZXI7IG5vdGhpbmcgZWxzZSBtb3ZlcyAoXHUwMEE3NS40KS5cbiAgICBhd2FpdCBjbGllbnQuY2FsbCgnY29tcGxldGVfYWdlbnRfam9iJywgeyBqb2JJZDogam9iLmlkLCBzdGF0dXM6ICdkb25lJyB9KTtcblxuICAgIC8vIDggXHUyMDE0IGxlYXJuIChzb2Z0KTogZXBpc29kaWMgbm90ZSwgc291cmNlLXNjb3BlZCB0byB0aGUgam9iJ3MgdGhyZWFkLlxuICAgIC8vIFRoZSBhZ2VudCByZWFkIHRoZSB0aHJlYWQgYWJvdmUsIHNvIHBhcnRpY2lwYXRpb24gYWxyZWFkeSBob2xkcyBmb3IgYVxuICAgIC8vIHByaXZhdGUgdGhyZWFkIFx1MjAxNCBidXQgYSBsZWFybmluZyBmYWlsdXJlIG11c3QgbmV2ZXIgdW5kbyB0aGUgcmVwbHkuXG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IGNsaWVudC5jYWxsKCdhcHBlbmRfYWdlbnRfbWVtb3J5Jywge1xuICAgICAgICBraW5kOiAnZXBpc29kaWMnLFxuICAgICAgICBjb250ZW50OiBgam9iICR7am9iLmlkfSBpbiB0aHJlYWQgJHtqb2IudGhyZWFkSWR9OiAke3JlcGx5LnNsaWNlKDAsIE1FTU9SWV9SRVBMWV9IRUFEKX1gLFxuICAgICAgICBzb3VyY2VUaHJlYWRJZDogam9iLnRocmVhZElkLFxuICAgICAgfSk7XG4gICAgfSBjYXRjaCB7XG4gICAgICAvKiBsZWFybmluZyBpcyBhZGRpdGl2ZSwgbmV2ZXIgbG9hZC1iZWFyaW5nICovXG4gICAgfVxuXG4gICAgcmV0dXJuIHsgaGFuZGxlZDogdHJ1ZSwgam9iSWQ6IGpvYi5pZCwgb3V0Y29tZTogJ2RvbmUnIH07XG4gIH0gZmluYWxseSB7XG4gICAgcm1TeW5jKGRpciwgeyByZWN1cnNpdmU6IHRydWUsIGZvcmNlOiB0cnVlIH0pO1xuICB9XG59XG5cbi8qKiBSdW4gdW50aWwgc3RvcHBlZDogcG9sbCBcdTIxOTIgcnVuSm9ic09uY2UgXHUyMTkyIHNsZWVwKHBvbGxNcykuIFNJR0lOVCBleGl0cyBjbGVhbmx5LiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGpvYnNMb29wKFxuICBvcHRpb25zOiBKb2JzUnVubmVyT3B0aW9ucyAmIHsgcG9sbE1zPzogbnVtYmVyOyBvbmNlPzogYm9vbGVhbiB9LFxuKTogUHJvbWlzZTx2b2lkPiB7XG4gIGxldCBzdG9wcGVkID0gZmFsc2U7XG4gIGxldCB3YWtlOiAoKCkgPT4gdm9pZCkgfCB1bmRlZmluZWQ7XG4gIGNvbnN0IG9uU2lnaW50ID0gKCk6IHZvaWQgPT4ge1xuICAgIHN0b3BwZWQgPSB0cnVlO1xuICAgIHdha2U/LigpO1xuICB9O1xuICBwcm9jZXNzLm9uY2UoJ1NJR0lOVCcsIG9uU2lnaW50KTtcbiAgdHJ5IHtcbiAgICBmb3IgKDs7KSB7XG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBydW5Kb2JzT25jZShvcHRpb25zKTtcbiAgICAgIGlmIChvcHRpb25zLm9uY2UgPT09IHRydWUgfHwgc3RvcHBlZCkgcmV0dXJuO1xuICAgICAgaWYgKCFyZXN1bHQuaGFuZGxlZCkge1xuICAgICAgICBhd2FpdCBuZXcgUHJvbWlzZTx2b2lkPigocmVzb2x2ZVNsZWVwKSA9PiB7XG4gICAgICAgICAgd2FrZSA9IHJlc29sdmVTbGVlcDtcbiAgICAgICAgICBzZXRUaW1lb3V0KHJlc29sdmVTbGVlcCwgb3B0aW9ucy5wb2xsTXMgPz8gMTVfMDAwKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHdha2UgPSB1bmRlZmluZWQ7XG4gICAgICAgIGlmIChzdG9wcGVkKSByZXR1cm47XG4gICAgICB9XG4gICAgfVxuICB9IGZpbmFsbHkge1xuICAgIHByb2Nlc3MucmVtb3ZlTGlzdGVuZXIoJ1NJR0lOVCcsIG9uU2lnaW50KTtcbiAgfVxufVxuIiwgIi8qKlxuICogQG9haHMvcnVubmVyIFx1MjAxNCB0aGUgQllPIHdvcmtlciBsb29wIChQaGFzZSAxIHN0b3J5IDE0KS5cbiAqXG4gKiBGSVhFRCBJTlRFUkZBQ0UgYmV0d2VlbiB0aGUgb2FocyBDTEkgKGBvYWhzIHdvcmtgKSBhbmQgdGhlIHJ1bm5lciBsaWJyYXJ5LlxuICogVGhlIENMSSB3aXJlcyBmbGFncy9lbnYgaW50byBSdW5uZXJPcHRpb25zIGFuZCBjYWxscyB3b3JrTG9vcC9ydW5PbmNlOyBhbGxcbiAqIHJ1bm5lciBsb2dpYyBsaXZlcyBoZXJlLlxuICpcbiAqIENvbnRyYWN0IChwcm9kdWN0LXJvYWRtYXAubWQgXHUwMEE3Mi4zKTpcbiAqICAxLiBwb2xsIGxpc3Rfd29ya19pdGVtcyhzdGF0ZT1yZWFkeV9mb3JfZGV2LCBjbGFpbWFibGUpIFx1MjE5MiBjbGFpbV90YXNrXG4gKiAgICAgKGNyYXNoIHJlLWRpc3BhdGNoOiBhbiBpbl9wcm9ncmVzcyBpdGVtIHdpdGggTk8gbGl2ZSBjbGFpbSBpcyBhIGRlYWRcbiAqICAgICB3b3JrZXIncyBydW4gXHUyMDE0IHBvbGxlZCBhcyBhIGZhbGxiYWNrIHNvIHJlY292ZXJ5IHVzZXMgdGhlIHNhbWUgbG9vcClcbiAqICAyLiB3b3JrdHJlZSBuYW1lZCBieSBjbGFpbSBpZDsgYnJhbmNoIGBjbGFpbS88Y2xhaW1JZD5gXG4gKiAgMy4gbWlycm9yLW9uLWRpc3BhdGNoOiBzdGFtcCBzcGVjIGZyb250bWF0dGVyIHRvIHRoZSBEQiBlbnRyeSBzdGF0ZVxuICogIDQuIGFkdmFuY2Vfc3RhdGUodG89aW5fcHJvZ3Jlc3MpIEJFRk9SRSB0aGUgYWdlbnQgcnVucyBcdTIwMTQgREIgaXMgdGhlIGVudHJ5IHN0YXRlXG4gKiAgNS4gaW52b2tlIHRoZSBjb2RpbmcgYWdlbnQgKHRlbXBsYXRlOyB1bm1vZGlmaWVkIGJtYWQtZGV2LWF1dG8gY29udGVudClcbiAqICA2LiBwYXJzZSBIQUxUICsgQXV0byBSdW4gUmVzdWx0IFx1MjE5MiBoYWx0X3JlcG9ydCBldmlkZW5jZSAodmVyYmF0aW0pXG4gKiAgNy4gcnVuIFBJTk5FRCB2ZXJpZmljYXRpb24gY29tbWFuZHMgb25seSAoYWxsb3dsaXN0ZWQpIFx1MjE5MiB0ZXN0X3J1biBldmlkZW5jZVxuICogIDguIHB1c2ggYnJhbmNoIFx1MjE5MiBnaXRfZGlmZiArIGNvbW1pdCBldmlkZW5jZSAocmVtb3RlIHJlYWNoYWJpbGl0eSBtZWFzdXJlZClcbiAqICA5LiBhZHZhbmNlX3N0YXRlIC8gYmxvY2tfdGFzayBwZXIgSEFMVCBzdGF0dXMgXHUyMDE0IHRoZSBjb3JlIGNvbXB1dGVzIHZlcmRpY3RzXG4gKiAxMC4gY3Jhc2ggcmVjb3Zlcnkgb24gcmUtY2xhaW06IGFkb3B0IGEgZGVjZW50bHktZmluaXNoZWQgd29ya3RyZWUgKHRlcm1pbmFsXG4gKiAgICAgZnJvbnRtYXR0ZXIgKyBhIHJlYWwgY29tbWl0IHBhc3QgaXRzIGJhc2VsaW5lKSB3aXRoIGxhdGUgZXZpZGVuY2VcbiAqICAgICBzdWJtaXNzaW9uOyBhIHdyZWNrZWQgd29ya3RyZWUgaXMgY2xlYW5lZCBhbmQgYmxvY2tlZCBgc3RhbGVfd29ya3RyZWVgLlxuICpcbiAqIEFnZW50IGludm9jYXRpb24gZW52aXJvbm1lbnQgKHBhcnQgb2YgdGhpcyBpbnRlcmZhY2UpOiB0aGUgYWdlbnQgY29tbWFuZFxuICogdGVtcGxhdGUgaXMgZXhwYW5kZWQgKHtTUEVDX0ZPTERFUn0ge1NUT1JZX0lEfSB7SU5WT0tFX1dJVEh9IHtXT1JLVFJFRX0pLFxuICogcnVuIHdpdGggY3dkID0gdGhlIGNsYWltIHdvcmt0cmVlLCBhbmQgcmVjZWl2ZXMgdHdvIGV4dHJhIGVudiB2YXJzOlxuICogICBPQUhTX1NQRUNfRklMRSBcdTIwMTQgYWJzb2x1dGUgcGF0aCBvZiB0aGUgc3Rvcnkgc3BlYyBmaWxlIGluc2lkZSB0aGUgd29ya3RyZWVcbiAqICAgT0FIU19TVE9SWV9JRCAgXHUyMDE0IHRoZSB3b3JrIGl0ZW0gZXh0ZXJuYWxLZXkgKHN0b3JpZXMueWFtbCBpZClcbiAqL1xuLy8gUGhhc2UgNCAocm9hZG1hcCBcdTAwQTcxLjQpOiB0aGUgZGV0ZXJtaW5pc3RpYyBkb2N1bWVudCBsaW50IGZvciBub24tY29kZSB3b3JrLlxuZXhwb3J0IHsgbGludERvYywgdHlwZSBEb2NMaW50UmVzdWx0LCB0eXBlIExpbnREb2NPcHRpb25zIH0gZnJvbSAnLi9kb2NsaW50LmpzJztcbi8vIFBoYXNlIDUgKHJvYWRtYXAgXHUwMEE3Nik6IHRoZSB0ZWFtbWF0ZSBKT0JTIHJ1bnRpbWUgXHUyMDE0IHJlcGx5LW9ubHkgYWdlbnQgam9ic1xuLy8gc2VydmVkIHRocm91Z2ggdGhlIHJhaWxzIHdpdGggbWVtb3J5IHJlY2FsbC9sZWFybmluZywgemVybyBsaWZlY3ljbGUgY2FsbHMuXG5leHBvcnQgeyBqb2JzTG9vcCwgcnVuSm9ic09uY2UsIHR5cGUgSm9ic09uY2VSZXN1bHQsIHR5cGUgSm9ic1J1bm5lck9wdGlvbnMgfSBmcm9tICcuL2pvYnMuanMnO1xuXG5pbXBvcnQgeyBzcGF3blN5bmMgfSBmcm9tICdub2RlOmNoaWxkX3Byb2Nlc3MnO1xuaW1wb3J0IHtcbiAgZXhpc3RzU3luYyxcbiAgbWtkaXJTeW5jLFxuICByZWFkZGlyU3luYyxcbiAgcmVhZEZpbGVTeW5jLFxuICBybVN5bmMsXG4gIHN0YXRTeW5jLFxuICB3cml0ZUZpbGVTeW5jLFxufSBmcm9tICdub2RlOmZzJztcbmltcG9ydCB7IGpvaW4sIHJlc29sdmUgfSBmcm9tICdub2RlOnBhdGgnO1xuaW1wb3J0IHsgcGFyc2UgYXMgcGFyc2VZYW1sIH0gZnJvbSAneWFtbCc7XG5pbXBvcnQgdHlwZSB7IE9haHNDbGllbnQgfSBmcm9tICdAb2Focy9jb250cmFjdHMnO1xuaW1wb3J0IHR5cGUgeyBCbG9ja2VkUmVhc29uLCBDbGFpbSwgRXZpZGVuY2UsIFdvcmtJdGVtLCBXb3JrSXRlbVN0YXRlIH0gZnJvbSAnQG9haHMvY29yZSc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgUnVubmVyT3B0aW9ucyB7XG4gIGNsaWVudDogT2Foc0NsaWVudDtcbiAgLyoqIEFic29sdXRlIHBhdGggb2YgdGhlIHRhcmdldCBwcm9qZWN0IGdpdCBjaGVja291dC4gKi9cbiAgcmVwb1BhdGg6IHN0cmluZztcbiAgLyoqIFNwZWMgZm9sZGVyIChyZWxhdGl2ZSB0byByZXBvIHJvb3QpIGhvbGRpbmcgU1BFQy5tZCArIHN0b3JpZXMueWFtbCArIHN0b3JpZXMvLiAqL1xuICBzcGVjRm9sZGVyOiBzdHJpbmc7XG4gIC8qKlxuICAgKiBDb2RpbmctYWdlbnQgY29tbWFuZCB0ZW1wbGF0ZS4gUGxhY2Vob2xkZXJzOiB7U1BFQ19GT0xERVJ9IHtTVE9SWV9JRH1cbiAgICoge0lOVk9LRV9XSVRIfSB7V09SS1RSRUV9LiBFeGVjdXRlZCB3aXRoIGN3ZCA9IHRoZSBjbGFpbSB3b3JrdHJlZS5cbiAgICovXG4gIGFnZW50Q21kOiBzdHJpbmc7XG4gIC8qKiBQb2xsIGludGVydmFsIGZvciB3b3JrTG9vcCAobXMpLiBEZWZhdWx0IDE1XzAwMC4gKi9cbiAgcG9sbE1zPzogbnVtYmVyO1xuICAvKiogQmluYXJpZXMgcGlubmVkIHZlcmlmaWNhdGlvbiBjb21tYW5kcyBtYXkgc3RhcnQgd2l0aC4gKi9cbiAgdmVyaWZpY2F0aW9uQWxsb3dsaXN0Pzogc3RyaW5nW107XG4gIC8qKiBHaXQgcmVtb3RlIHRvIHB1c2ggY2xhaW0gYnJhbmNoZXMgdG8uIERlZmF1bHQgJ29yaWdpbicuICovXG4gIHJlbW90ZT86IHN0cmluZztcbiAgLyoqIFRFU1QgT05MWTogZGllIGF0IGEgc3BlY2lmaWMgcG9pbnQgdG8gZXhlcmNpc2UgY3Jhc2ggcmVjb3ZlcnkuICovXG4gIGZhaWxwb2ludD86ICdiZWZvcmVfcmVwb3J0JztcbiAgLyoqIE1heCB3YWxsIHRpbWUgZm9yIG9uZSBhZ2VudCBpbnZvY2F0aW9uIChtcykuIERlZmF1bHQgMzAgbWludXRlcy4gKi9cbiAgYWdlbnRUaW1lb3V0TXM/OiBudW1iZXI7XG4gIC8qKiBFeHRyYSBlbnZpcm9ubWVudCB2YXJpYWJsZXMgcGFzc2VkIHRvIHRoZSBhZ2VudCBpbnZvY2F0aW9uLiAqL1xuICBhZ2VudEVudj86IFJlY29yZDxzdHJpbmcsIHN0cmluZz47XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUnVuT25jZVJlc3VsdCB7XG4gIGRpc3BhdGNoZWQ6IGJvb2xlYW47XG4gIHdvcmtJdGVtSWQ/OiBzdHJpbmc7XG4gIGV4dGVybmFsS2V5Pzogc3RyaW5nO1xuICBvdXRjb21lPzogJ2luX3JldmlldycgfCAnYmxvY2tlZCcgfCAnYWRvcHRlZF9pbl9yZXZpZXcnIHwgJ2NyYXNoZWQnO1xuICBkZXRhaWxzPzogc3RyaW5nO1xuICAvKiogQ2xhaW0gdGFrZW4gYnkgdGhpcyBydW4gKGJyYW5jaCBpcyBgY2xhaW0vPGNsYWltSWQ+YCkuICovXG4gIGNsYWltSWQ/OiBzdHJpbmc7XG4gIC8qKiBSYXcgZXZpZGVuY2Ugc3VibWl0dGVkIGR1cmluZyB0aGlzIHJ1biwgaW4gc3VibWlzc2lvbiBvcmRlci4gKi9cbiAgZXZpZGVuY2U/OiBFdmlkZW5jZVtdO1xufVxuXG4vKiogQmluYXJpZXMgYSBwaW5uZWQgdmVyaWZpY2F0aW9uIGNvbW1hbmQgbWF5IHN0YXJ0IHdpdGggKGZpcnN0IHRva2VuKS4gKi9cbmV4cG9ydCBjb25zdCBERUZBVUxUX1ZFUklGSUNBVElPTl9BTExPV0xJU1Q6IHJlYWRvbmx5IHN0cmluZ1tdID0gW1xuICAnbm9kZScsXG4gICducG0nLFxuICAncG5wbScsXG4gICducHgnLFxuICAncHl0ZXN0JyxcbiAgJ3B5dGhvbjMnLFxuICAnc2gnLFxuICAnYmFzaCcsXG4gICdnaXQnLFxuXTtcblxuLyoqIE1hcmtlciBkcm9wcGVkIGluIGV2ZXJ5IGNsYWltIHdvcmt0cmVlIHNvIGEgbGF0ZXIgY2xhaW0gY2FuIG1hcCBpdCBiYWNrLiAqL1xuY29uc3QgTUFSS0VSX0ZJTEUgPSAnLm9haHMtd29yay1pdGVtJztcblxuLyoqIERCIHN0YXRlIFx1MjE5MiBzcGVjLWZpbGUgZnJvbnRtYXR0ZXIgdm9jYWJ1bGFyeSAoZGV2LWF1dG8gZmlsZSBkaWFsZWN0KS4gKi9cbmNvbnN0IEVOVFJZX1NUQVRVUzogUmVhZG9ubHk8UGFydGlhbDxSZWNvcmQ8V29ya0l0ZW1TdGF0ZSwgc3RyaW5nPj4+ID0ge1xuICByZWFkeV9mb3JfZGV2OiAncmVhZHktZm9yLWRldicsXG4gIGluX3Byb2dyZXNzOiAnaW4tcHJvZ3Jlc3MnLFxuICBpbl9yZXZpZXc6ICdpbi1yZXZpZXcnLFxufTtcblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBnaXQgcGx1bWJpbmcgKGNoaWxkX3Byb2Nlc3Mgb25seSBcdTIwMTQgbm8gZXh0ZXJuYWwgZGVwcylcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4vKiogUnVuIGEgZ2l0IGNvbW1hbmQ7IHRocm93cyBvbiBub24temVybyBleGl0OyByZXR1cm5zIHRyaW1tZWQgc3Rkb3V0LiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdpdChhcmdzOiBzdHJpbmdbXSwgY3dkOiBzdHJpbmcpOiBzdHJpbmcge1xuICBjb25zdCByZXN1bHQgPSBzcGF3blN5bmMoJ2dpdCcsIGFyZ3MsIHsgY3dkLCBlbmNvZGluZzogJ3V0ZjgnIH0pO1xuICBpZiAocmVzdWx0LmVycm9yKSB0aHJvdyByZXN1bHQuZXJyb3I7XG4gIGlmIChyZXN1bHQuc3RhdHVzICE9PSAwKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgYGdpdCAke2FyZ3Muam9pbignICcpfSBmYWlsZWQgd2l0aCBleGl0ICR7U3RyaW5nKHJlc3VsdC5zdGF0dXMpfTogJHtyZXN1bHQuc3RkZXJyLnRyaW0oKX1gLFxuICAgICk7XG4gIH1cbiAgcmV0dXJuIHJlc3VsdC5zdGRvdXQudHJpbSgpO1xufVxuXG4vKipcbiAqIEtlZXAgcnVubmVyIGJvb2trZWVwaW5nIG91dCBvZiBhZ2VudCBjb21taXRzOiB0aGUgbWFya2VyIGZpbGUgYW5kIHRoZVxuICogd29ya3RyZWUgcm9vdCBhcmUgYWRkZWQgdG8gJEdJVF9DT01NT05fRElSL2luZm8vZXhjbHVkZSAoc2hhcmVkIGJ5IGFsbFxuICogd29ya3RyZWVzKSwgc28gYW4gYWdlbnQncyBgZ2l0IGFkZCAtQWAgbmV2ZXIgcGlja3MgdGhlbSB1cC5cbiAqL1xuZnVuY3Rpb24gZW5zdXJlR2l0RXhjbHVkZXMocmVwb1BhdGg6IHN0cmluZyk6IHZvaWQge1xuICBjb25zdCBnaXREaXIgPSBqb2luKHJlcG9QYXRoLCAnLmdpdCcpO1xuICB0cnkge1xuICAgIGlmICghc3RhdFN5bmMoZ2l0RGlyKS5pc0RpcmVjdG9yeSgpKSByZXR1cm47IC8vIHJlcG9QYXRoIGlzIGl0c2VsZiBhIHdvcmt0cmVlIFx1MjAxNCBza2lwXG4gIH0gY2F0Y2gge1xuICAgIHJldHVybjtcbiAgfVxuICBjb25zdCBpbmZvRGlyID0gam9pbihnaXREaXIsICdpbmZvJyk7XG4gIG1rZGlyU3luYyhpbmZvRGlyLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcbiAgY29uc3QgZXhjbHVkZVBhdGggPSBqb2luKGluZm9EaXIsICdleGNsdWRlJyk7XG4gIGNvbnN0IGN1cnJlbnQgPSBleGlzdHNTeW5jKGV4Y2x1ZGVQYXRoKSA/IHJlYWRGaWxlU3luYyhleGNsdWRlUGF0aCwgJ3V0ZjgnKSA6ICcnO1xuICBjb25zdCB3YW50ZWQgPSBbJy5vYWhzLycsIE1BUktFUl9GSUxFXTtcbiAgY29uc3QgaGF2ZSA9IG5ldyBTZXQoY3VycmVudC5zcGxpdCgnXFxuJykubWFwKChsaW5lKSA9PiBsaW5lLnRyaW0oKSkpO1xuICBjb25zdCBtaXNzaW5nID0gd2FudGVkLmZpbHRlcigobGluZSkgPT4gIWhhdmUuaGFzKGxpbmUpKTtcbiAgaWYgKG1pc3NpbmcubGVuZ3RoID09PSAwKSByZXR1cm47XG4gIGNvbnN0IHByZWZpeCA9IGN1cnJlbnQgPT09ICcnIHx8IGN1cnJlbnQuZW5kc1dpdGgoJ1xcbicpID8gY3VycmVudCA6IGAke2N1cnJlbnR9XFxuYDtcbiAgd3JpdGVGaWxlU3luYyhleGNsdWRlUGF0aCwgYCR7cHJlZml4fSR7bWlzc2luZy5qb2luKCdcXG4nKX1cXG5gLCAndXRmOCcpO1xufVxuXG5mdW5jdGlvbiByZW1vdmVXb3JrdHJlZShkaXI6IHN0cmluZywgcmVwb1BhdGg6IHN0cmluZyk6IHZvaWQge1xuICB0cnkge1xuICAgIGdpdChbJ3dvcmt0cmVlJywgJ3JlbW92ZScsICctLWZvcmNlJywgZGlyXSwgcmVwb1BhdGgpO1xuICB9IGNhdGNoIHtcbiAgICB0cnkge1xuICAgICAgcm1TeW5jKGRpciwgeyByZWN1cnNpdmU6IHRydWUsIGZvcmNlOiB0cnVlIH0pO1xuICAgICAgZ2l0KFsnd29ya3RyZWUnLCAncHJ1bmUnXSwgcmVwb1BhdGgpO1xuICAgIH0gY2F0Y2gge1xuICAgICAgLyogYmVzdCBlZmZvcnQgXHUyMDE0IGEgbGVmdG92ZXIgZGlyIGlzIHJlLWRldGVjdGVkIGFzIGEgc3RhbGUgd29ya3RyZWUgKi9cbiAgICB9XG4gIH1cbn1cblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBXb3JrdHJlZSBtYXJrZXIgKGNyYXNoLXJlY292ZXJ5IGJvb2trZWVwaW5nKVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbmludGVyZmFjZSBXb3JrdHJlZU1hcmtlciB7XG4gIHdvcmtJdGVtSWQ6IHN0cmluZztcbiAgY2xhaW1JZDogc3RyaW5nO1xuICBiYXNlbGluZTogc3RyaW5nO1xuICAvKiogSG93IG1hbnkgdGltZXMgYW4gYWdlbnQgd2FzIGludm9rZWQgaW5zaWRlIHRoaXMgd29ya3RyZWUuICovXG4gIGludm9jYXRpb25zOiBudW1iZXI7XG59XG5cbmZ1bmN0aW9uIHdyaXRlTWFya2VyKHdvcmt0cmVlRGlyOiBzdHJpbmcsIG1hcmtlcjogV29ya3RyZWVNYXJrZXIpOiB2b2lkIHtcbiAgd3JpdGVGaWxlU3luYyhqb2luKHdvcmt0cmVlRGlyLCBNQVJLRVJfRklMRSksIGAke0pTT04uc3RyaW5naWZ5KG1hcmtlciwgbnVsbCwgMil9XFxuYCwgJ3V0ZjgnKTtcbn1cblxuZnVuY3Rpb24gcmVhZE1hcmtlcih3b3JrdHJlZURpcjogc3RyaW5nKTogV29ya3RyZWVNYXJrZXIgfCBudWxsIHtcbiAgY29uc3QgcGF0aCA9IGpvaW4od29ya3RyZWVEaXIsIE1BUktFUl9GSUxFKTtcbiAgaWYgKCFleGlzdHNTeW5jKHBhdGgpKSByZXR1cm4gbnVsbDtcbiAgdHJ5IHtcbiAgICBjb25zdCByYXcgPSBKU09OLnBhcnNlKHJlYWRGaWxlU3luYyhwYXRoLCAndXRmOCcpKSBhcyBQYXJ0aWFsPFdvcmt0cmVlTWFya2VyPjtcbiAgICBpZiAodHlwZW9mIHJhdy53b3JrSXRlbUlkICE9PSAnc3RyaW5nJyB8fCB0eXBlb2YgcmF3LmJhc2VsaW5lICE9PSAnc3RyaW5nJykgcmV0dXJuIG51bGw7XG4gICAgcmV0dXJuIHtcbiAgICAgIHdvcmtJdGVtSWQ6IHJhdy53b3JrSXRlbUlkLFxuICAgICAgY2xhaW1JZDogdHlwZW9mIHJhdy5jbGFpbUlkID09PSAnc3RyaW5nJyA/IHJhdy5jbGFpbUlkIDogJycsXG4gICAgICBiYXNlbGluZTogcmF3LmJhc2VsaW5lLFxuICAgICAgaW52b2NhdGlvbnM6IHR5cGVvZiByYXcuaW52b2NhdGlvbnMgPT09ICdudW1iZXInID8gcmF3Lmludm9jYXRpb25zIDogMCxcbiAgICB9O1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufVxuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIFNwZWMgZmlsZSByZWFkaW5nIChmcm9udG1hdHRlciArIEhBTFQgcmVwb3J0KVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbmludGVyZmFjZSBTcGVjUmVwb3J0IHtcbiAgc3RhdHVzOiBzdHJpbmcgfCBudWxsO1xuICBibG9ja2luZ0NvbmRpdGlvbjogc3RyaW5nIHwgbnVsbDtcbiAgYXV0b1J1blJlc3VsdDogc3RyaW5nIHwgbnVsbDtcbn1cblxuZnVuY3Rpb24gc3BsaXRGcm9udG1hdHRlcihyYXc6IHN0cmluZyk6IHsgZGF0YTogUmVjb3JkPHN0cmluZywgdW5rbm93bj47IGJvZHk6IHN0cmluZyB9IHtcbiAgaWYgKCFyYXcuc3RhcnRzV2l0aCgnLS0tJykpIHJldHVybiB7IGRhdGE6IHt9LCBib2R5OiByYXcgfTtcbiAgY29uc3QgY2xvc2UgPSByYXcuaW5kZXhPZignXFxuLS0tJywgMyk7XG4gIGlmIChjbG9zZSA9PT0gLTEpIHJldHVybiB7IGRhdGE6IHt9LCBib2R5OiByYXcgfTtcbiAgY29uc3QgZmlyc3ROZXdsaW5lID0gcmF3LmluZGV4T2YoJ1xcbicpO1xuICBjb25zdCBibG9jayA9IHJhdy5zbGljZShmaXJzdE5ld2xpbmUgKyAxLCBjbG9zZSk7XG4gIGNvbnN0IGJvZHlTdGFydCA9IHJhdy5pbmRleE9mKCdcXG4nLCBjbG9zZSArIDEpO1xuICBjb25zdCBib2R5ID0gYm9keVN0YXJ0ID09PSAtMSA/ICcnIDogcmF3LnNsaWNlKGJvZHlTdGFydCArIDEpO1xuICBsZXQgZGF0YTogdW5rbm93biA9IHt9O1xuICB0cnkge1xuICAgIGRhdGEgPSBwYXJzZVlhbWwoYmxvY2spO1xuICB9IGNhdGNoIHtcbiAgICBkYXRhID0ge307XG4gIH1cbiAgY29uc3QgcmVjb3JkID1cbiAgICB0eXBlb2YgZGF0YSA9PT0gJ29iamVjdCcgJiYgZGF0YSAhPT0gbnVsbCAmJiAhQXJyYXkuaXNBcnJheShkYXRhKVxuICAgICAgPyAoZGF0YSBhcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPilcbiAgICAgIDoge307XG4gIHJldHVybiB7IGRhdGE6IHJlY29yZCwgYm9keSB9O1xufVxuXG4vKiogVmVyYmF0aW0gJyMjIEF1dG8gUnVuIFJlc3VsdCcgc2VjdGlvbiAoaGVhZGluZyBpbmNsdWRlZCksIHVwIHRvIHRoZSBuZXh0IEgyLiAqL1xuZnVuY3Rpb24gZXh0cmFjdEF1dG9SdW5SZXN1bHQoYm9keTogc3RyaW5nKTogc3RyaW5nIHwgbnVsbCB7XG4gIGNvbnN0IGxpbmVzID0gYm9keS5zcGxpdCgnXFxuJyk7XG4gIGNvbnN0IHN0YXJ0ID0gbGluZXMuZmluZEluZGV4KChsaW5lKSA9PiAvXiMjXFxzK2F1dG8gcnVuIHJlc3VsdFxccyokL2kudGVzdChsaW5lLnRyaW0oKSkpO1xuICBpZiAoc3RhcnQgPT09IC0xKSByZXR1cm4gbnVsbDtcbiAgbGV0IGVuZCA9IGxpbmVzLmxlbmd0aDtcbiAgZm9yIChsZXQgaSA9IHN0YXJ0ICsgMTsgaSA8IGxpbmVzLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgY29uc3QgbGluZSA9IGxpbmVzW2ldO1xuICAgIGlmIChsaW5lICE9PSB1bmRlZmluZWQgJiYgL14jI1xccysvLnRlc3QobGluZSkpIHtcbiAgICAgIGVuZCA9IGk7XG4gICAgICBicmVhaztcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGxpbmVzLnNsaWNlKHN0YXJ0LCBlbmQpLmpvaW4oJ1xcbicpLnRyaW1FbmQoKTtcbn1cblxuZnVuY3Rpb24gcmVhZFNwZWNSZXBvcnQoc3BlY0Fic1BhdGg6IHN0cmluZyk6IFNwZWNSZXBvcnQge1xuICBpZiAoIWV4aXN0c1N5bmMoc3BlY0Fic1BhdGgpKSB7XG4gICAgcmV0dXJuIHsgc3RhdHVzOiBudWxsLCBibG9ja2luZ0NvbmRpdGlvbjogbnVsbCwgYXV0b1J1blJlc3VsdDogbnVsbCB9O1xuICB9XG4gIGNvbnN0IHsgZGF0YSwgYm9keSB9ID0gc3BsaXRGcm9udG1hdHRlcihyZWFkRmlsZVN5bmMoc3BlY0Fic1BhdGgsICd1dGY4JykpO1xuICBjb25zdCBzdGF0dXNSYXcgPSBkYXRhWydzdGF0dXMnXTtcbiAgY29uc3Qgc3RhdHVzID1cbiAgICB0eXBlb2Ygc3RhdHVzUmF3ID09PSAnc3RyaW5nJyA/IHN0YXR1c1JhdyA6IHN0YXR1c1JhdyAhPSBudWxsID8gU3RyaW5nKHN0YXR1c1JhdykgOiBudWxsO1xuICBjb25zdCBhdXRvUnVuUmVzdWx0ID0gZXh0cmFjdEF1dG9SdW5SZXN1bHQoYm9keSk7XG4gIGxldCBibG9ja2luZ0NvbmRpdGlvbiA9XG4gICAgdHlwZW9mIGRhdGFbJ2Jsb2NraW5nX2NvbmRpdGlvbiddID09PSAnc3RyaW5nJyA/IGRhdGFbJ2Jsb2NraW5nX2NvbmRpdGlvbiddIDogbnVsbDtcbiAgaWYgKGJsb2NraW5nQ29uZGl0aW9uID09PSBudWxsICYmIGF1dG9SdW5SZXN1bHQgIT09IG51bGwpIHtcbiAgICBjb25zdCBtYXRjaCA9IC9eYmxvY2tpbmcgY29uZGl0aW9uOlxccyooLispJC9pbS5leGVjKGF1dG9SdW5SZXN1bHQpO1xuICAgIGJsb2NraW5nQ29uZGl0aW9uID0gbWF0Y2g/LlsxXT8udHJpbSgpID8/IG51bGw7XG4gIH1cbiAgcmV0dXJuIHsgc3RhdHVzLCBibG9ja2luZ0NvbmRpdGlvbiwgYXV0b1J1blJlc3VsdCB9O1xufVxuXG4vKiogUmV3cml0ZSAob3IgaW5zZXJ0KSB0aGUgZnJvbnRtYXR0ZXIgYHN0YXR1czpgIGxpbmUsIHByZXNlcnZpbmcgZXZlcnl0aGluZyBlbHNlLiAqL1xuZnVuY3Rpb24gc2V0RnJvbnRtYXR0ZXJTdGF0dXMoc3BlY0Fic1BhdGg6IHN0cmluZywgc3RhdHVzOiBzdHJpbmcpOiB2b2lkIHtcbiAgY29uc3QgcmF3ID0gcmVhZEZpbGVTeW5jKHNwZWNBYnNQYXRoLCAndXRmOCcpO1xuICBpZiAocmF3LnN0YXJ0c1dpdGgoJy0tLScpKSB7XG4gICAgY29uc3QgY2xvc2UgPSByYXcuaW5kZXhPZignXFxuLS0tJywgMyk7XG4gICAgaWYgKGNsb3NlICE9PSAtMSkge1xuICAgICAgY29uc3QgaGVhZCA9IHJhdy5zbGljZSgwLCBjbG9zZSk7XG4gICAgICBjb25zdCByZXN0ID0gcmF3LnNsaWNlKGNsb3NlKTtcbiAgICAgIGNvbnN0IHJlcGxhY2VkID0gL15zdGF0dXM6LiokL20udGVzdChoZWFkKVxuICAgICAgICA/IGhlYWQucmVwbGFjZSgvXnN0YXR1czouKiQvbSwgYHN0YXR1czogJHtzdGF0dXN9YClcbiAgICAgICAgOiBgJHtoZWFkfVxcbnN0YXR1czogJHtzdGF0dXN9YDtcbiAgICAgIHdyaXRlRmlsZVN5bmMoc3BlY0Fic1BhdGgsIHJlcGxhY2VkICsgcmVzdCwgJ3V0ZjgnKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gIH1cbiAgd3JpdGVGaWxlU3luYyhzcGVjQWJzUGF0aCwgYC0tLVxcbnN0YXR1czogJHtzdGF0dXN9XFxuLS0tXFxuJHtyYXd9YCwgJ3V0ZjgnKTtcbn1cblxuZnVuY3Rpb24gbm9ybWFsaXplU3RhdHVzKHN0YXR1czogc3RyaW5nIHwgbnVsbCk6IHN0cmluZyB8IG51bGwge1xuICBpZiAoc3RhdHVzID09PSBudWxsKSByZXR1cm4gbnVsbDtcbiAgY29uc3QgZmxhdCA9IHN0YXR1cy50cmltKCkudG9Mb3dlckNhc2UoKS5yZXBsYWNlQWxsKCctJywgJ18nKTtcbiAgcmV0dXJuIGZsYXQgPT09ICdyZXZpZXcnID8gJ2luX3JldmlldycgOiBmbGF0O1xufVxuXG4vKiogZGV2LWF1dG8gSEFMVCBibG9ja2luZyBjb25kaXRpb24gXHUyMTkyIEJMT0NLRURfUkVBU09OUyB0YXhvbm9teSAoZGVmYXVsdCAnb3RoZXInKS4gKi9cbmZ1bmN0aW9uIG1hcEJsb2NraW5nQ29uZGl0aW9uKGNvbmRpdGlvbjogc3RyaW5nIHwgbnVsbCk6IEJsb2NrZWRSZWFzb24ge1xuICBpZiAoY29uZGl0aW9uID09PSBudWxsKSByZXR1cm4gJ290aGVyJztcbiAgY29uc3QgYyA9IGNvbmRpdGlvbi50b0xvd2VyQ2FzZSgpO1xuICBpZiAoYy5pbmNsdWRlcygncmV2aWV3IHJlcGFpciBsb29wIGV4Y2VlZGVkJykpIHJldHVybiAncmV2aWV3X25vbl9jb252ZXJnZW5jZSc7XG4gIGlmIChjLmluY2x1ZGVzKCd1bmNsZWFyIGludGVudCcpKSByZXR1cm4gJ3VuY2xlYXJfaW50ZW50JztcbiAgaWYgKGMuaW5jbHVkZXMoJ25vIHN0b3JpZXMueWFtbCcpKSByZXR1cm4gJ25vX3N0b3JpZXNfeWFtbF9mb3VuZCc7XG4gIGlmIChjLmluY2x1ZGVzKCdhbWJpZ3VvdXMgc3RvcnkgZmlsZSBtYXRjaCcpKSByZXR1cm4gJ2FtYmlndW91c19zdG9yeV9maWxlX21hdGNoJztcbiAgaWYgKGMuaW5jbHVkZXMoJ25vIHN1YmFnZW50cycpKSByZXR1cm4gJ25vX3N1YmFnZW50cyc7XG4gIHJldHVybiAnb3RoZXInO1xufVxuXG5mdW5jdGlvbiBpc1JlbW90ZUVycm9yKGVycm9yOiB1bmtub3duLCBuYW1lOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgcmV0dXJuIChcbiAgICB0eXBlb2YgZXJyb3IgPT09ICdvYmplY3QnICYmXG4gICAgZXJyb3IgIT09IG51bGwgJiZcbiAgICAoZXJyb3IgYXMgeyBlcnJvck5hbWU/OiB1bmtub3duIH0pLmVycm9yTmFtZSA9PT0gbmFtZVxuICApO1xufVxuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIFN0ZXBzIDZcdTIwMTM5OiBtZWFzdXJlLCBzdWJtaXQgcmF3IGV2aWRlbmNlLCByb3V0ZSBieSBIQUxUIHN0YXR1c1xuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbmludGVyZmFjZSBGaW5pc2hBcmdzIHtcbiAgY2xpZW50OiBPYWhzQ2xpZW50O1xuICB3b3JrSXRlbTogV29ya0l0ZW07XG4gIGNsYWltOiBDbGFpbTtcbiAgLyoqIERpcmVjdG9yeSBob2xkaW5nIHRoZSBydW4ncyBmaWxlcyAoZnJlc2ggd29ya3RyZWUsIG9yIHRoZSBhZG9wdGVkIG9uZSkuICovXG4gIHdvcmtEaXI6IHN0cmluZztcbiAgLyoqIFNwZWMgZmlsZSBwYXRoIHJlbGF0aXZlIHRvIHRoZSByZXBvIHJvb3QuICovXG4gIHNwZWNSZWw6IHN0cmluZztcbiAgYmFzZWxpbmU6IHN0cmluZztcbiAgYnJhbmNoOiBzdHJpbmc7XG4gIHJlcG9QYXRoOiBzdHJpbmc7XG4gIHJlbW90ZTogc3RyaW5nO1xuICBhbGxvd2xpc3Q6IHJlYWRvbmx5IHN0cmluZ1tdO1xuICAvKiogbnVsbCB3aGVuIGFkb3B0aW5nICh0aGUgYWdlbnQgd2FzIGludm9rZWQgYnkgdGhlIGNyYXNoZWQgcnVuKS4gKi9cbiAgYWdlbnRFeGl0Q29kZTogbnVtYmVyIHwgbnVsbDtcbiAgc3VibWl0OiAoa2luZDogRXZpZGVuY2VbJ2tpbmQnXSwgcGF5bG9hZDogUmVjb3JkPHN0cmluZywgdW5rbm93bj4pID0+IFByb21pc2U8dm9pZD47XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGZpbmlzaFJ1bihhcmdzOiBGaW5pc2hBcmdzKTogUHJvbWlzZTwnaW5fcmV2aWV3JyB8ICdibG9ja2VkJz4ge1xuICBjb25zdCB7IGNsaWVudCwgd29ya0l0ZW0sIGNsYWltIH0gPSBhcmdzO1xuXG4gIC8vIDYgXHUyMDE0IHBhcnNlIEhBTFQ6IGZyb250bWF0dGVyIHN0YXR1cyArIHZlcmJhdGltIEF1dG8gUnVuIFJlc3VsdC5cbiAgY29uc3Qgc3BlYyA9IHJlYWRTcGVjUmVwb3J0KGpvaW4oYXJncy53b3JrRGlyLCBhcmdzLnNwZWNSZWwpKTtcbiAgYXdhaXQgYXJncy5zdWJtaXQoJ2hhbHRfcmVwb3J0Jywge1xuICAgIHN0YXR1czogc3BlYy5zdGF0dXMsXG4gICAgYmxvY2tpbmdDb25kaXRpb246IHNwZWMuYmxvY2tpbmdDb25kaXRpb24sXG4gICAgYXV0b1J1blJlc3VsdDogc3BlYy5hdXRvUnVuUmVzdWx0LFxuICAgIGFnZW50RXhpdENvZGU6IGFyZ3MuYWdlbnRFeGl0Q29kZSxcbiAgfSk7XG5cbiAgLy8gNyBcdTIwMTQgcGlubmVkIHZlcmlmaWNhdGlvbiBvbmx5OyB0aGUgYWxsb3dsaXN0IGdhdGVzIHdoYXQgZXZlciBnZXRzIGV4ZWN1dGVkLlxuICBmb3IgKGNvbnN0IGNvbW1hbmQgb2Ygd29ya0l0ZW0ucGlubmVkVmVyaWZpY2F0aW9uID8/IFtdKSB7XG4gICAgY29uc3QgYmluYXJ5ID0gY29tbWFuZC50cmltKCkuc3BsaXQoL1xccysvKVswXSA/PyAnJztcbiAgICBpZiAoIWFyZ3MuYWxsb3dsaXN0LmluY2x1ZGVzKGJpbmFyeSkpIHtcbiAgICAgIGF3YWl0IGFyZ3Muc3VibWl0KCd0ZXN0X3J1bicsIHsgY29tbWFuZCwgZXhpdENvZGU6IC0xLCByZWZ1c2VkOiB0cnVlIH0pO1xuICAgICAgY29udGludWU7XG4gICAgfVxuICAgIGNvbnN0IHJ1biA9IHNwYXduU3luYygnYmFzaCcsIFsnLWMnLCBjb21tYW5kXSwge1xuICAgICAgY3dkOiBhcmdzLndvcmtEaXIsXG4gICAgICBlbmNvZGluZzogJ3V0ZjgnLFxuICAgICAgdGltZW91dDogMTAgKiA2MCAqIDEwMDAsXG4gICAgfSk7XG4gICAgYXdhaXQgYXJncy5zdWJtaXQoJ3Rlc3RfcnVuJywgeyBjb21tYW5kLCBleGl0Q29kZTogcnVuLnN0YXR1cyA/PyAtMSB9KTtcbiAgfVxuXG4gIC8vIDggXHUyMDE0IGRpZmYgKyBwdXNoICsgY29tbWl0IGV2aWRlbmNlIChtZWFzdXJlZCwgbmV2ZXIganVkZ2VkIGhlcmUpLlxuICBjb25zdCBmaW5hbCA9IGdpdChbJ3Jldi1wYXJzZScsICdIRUFEJ10sIGFyZ3Mud29ya0Rpcik7XG4gIGNvbnN0IHNob3J0c3RhdCA9XG4gICAgZmluYWwgPT09IGFyZ3MuYmFzZWxpbmVcbiAgICAgID8gJydcbiAgICAgIDogZ2l0KFsnZGlmZicsICctLXNob3J0c3RhdCcsIGAke2FyZ3MuYmFzZWxpbmV9Li4ke2ZpbmFsfWBdLCBhcmdzLndvcmtEaXIpO1xuICBjb25zdCBmaWxlc0NoYW5nZWQgPSBOdW1iZXIoLyhcXGQrKSBmaWxlcz8gY2hhbmdlZC8uZXhlYyhzaG9ydHN0YXQpPy5bMV0gPz8gJzAnKTtcbiAgYXdhaXQgYXJncy5zdWJtaXQoJ2dpdF9kaWZmJywge1xuICAgIGJhc2VsaW5lOiBhcmdzLmJhc2VsaW5lLFxuICAgIGZpbmFsLFxuICAgIGZpbGVzQ2hhbmdlZCxcbiAgICBub25FbXB0eTogZmlsZXNDaGFuZ2VkID4gMCxcbiAgICBicmFuY2g6IGFyZ3MuYnJhbmNoLFxuICB9KTtcblxuICBnaXQoWydwdXNoJywgYXJncy5yZW1vdGUsIGFyZ3MuYnJhbmNoXSwgYXJncy5yZXBvUGF0aCk7XG4gIGNvbnN0IGxzUmVtb3RlID0gZ2l0KFsnbHMtcmVtb3RlJywgYXJncy5yZW1vdGUsIGByZWZzL2hlYWRzLyR7YXJncy5icmFuY2h9YF0sIGFyZ3MucmVwb1BhdGgpO1xuICBhd2FpdCBhcmdzLnN1Ym1pdCgnY29tbWl0Jywge1xuICAgIHNoYTogZmluYWwsXG4gICAgYnJhbmNoOiBhcmdzLmJyYW5jaCxcbiAgICByZWFjaGFibGVPblJlbW90ZTogbHNSZW1vdGUuaW5jbHVkZXMoZmluYWwpLFxuICB9KTtcblxuICAvLyA5IFx1MjAxNCByb3V0aW5nOiB0aGUgZmlsZSBzYXlzIHdoYXQgdGhlIGFnZW50IGNsYWltczsgdGhlIGNvcmUgZGVjaWRlcy5cbiAgY29uc3Qgc3RhdHVzID0gbm9ybWFsaXplU3RhdHVzKHNwZWMuc3RhdHVzKTtcbiAgY29uc3QgdG9rZW4gPSBjbGFpbS5mZW5jaW5nVG9rZW47XG4gIGlmIChzdGF0dXMgPT09ICdibG9ja2VkJykge1xuICAgIGF3YWl0IGNsaWVudC5jYWxsKCdibG9ja190YXNrJywge1xuICAgICAgd29ya0l0ZW1JZDogd29ya0l0ZW0uaWQsXG4gICAgICByZWFzb246IG1hcEJsb2NraW5nQ29uZGl0aW9uKHNwZWMuYmxvY2tpbmdDb25kaXRpb24pLFxuICAgICAgZmVuY2luZ1Rva2VuOiB0b2tlbixcbiAgICB9KTtcbiAgICBhd2FpdCBjbGllbnQuY2FsbCgncmVsZWFzZV9jbGFpbScsIHsgY2xhaW1JZDogY2xhaW0uaWQsIHJlYXNvbjogJ3J1biBibG9ja2VkJyB9KTtcbiAgICByZXR1cm4gJ2Jsb2NrZWQnO1xuICB9XG4gIGNvbnN0IGhhc0NvbW1pdCA9IGZpbmFsICE9PSBhcmdzLmJhc2VsaW5lO1xuICBpZiAoc3RhdHVzID09PSAnZG9uZScgfHwgc3RhdHVzID09PSAnaW5fcmV2aWV3JyB8fCAoc3RhdHVzID09PSAnaW5fcHJvZ3Jlc3MnICYmIGhhc0NvbW1pdCkpIHtcbiAgICBhd2FpdCBjbGllbnQuY2FsbCgnYWR2YW5jZV9zdGF0ZScsIHtcbiAgICAgIHdvcmtJdGVtSWQ6IHdvcmtJdGVtLmlkLFxuICAgICAgdG86ICdpbl9yZXZpZXcnLFxuICAgICAgZmVuY2luZ1Rva2VuOiB0b2tlbixcbiAgICB9KTtcbiAgICBhd2FpdCBjbGllbnQuY2FsbCgncmVsZWFzZV9jbGFpbScsIHsgY2xhaW1JZDogY2xhaW0uaWQsIHJlYXNvbjogJ3J1biBmaW5pc2hlZCcgfSk7XG4gICAgcmV0dXJuICdpbl9yZXZpZXcnO1xuICB9XG4gIC8vIEFnZW50IGV4aXRlZCBub24temVybyB3aXRoIG5vIHJlYWRhYmxlIEhBTFQgc3RhdHVzLCBvciBhbiB1bmtub3duIHN0YXR1cy5cbiAgYXdhaXQgY2xpZW50LmNhbGwoJ2Jsb2NrX3Rhc2snLCB7IHdvcmtJdGVtSWQ6IHdvcmtJdGVtLmlkLCByZWFzb246ICdvdGhlcicsIGZlbmNpbmdUb2tlbjogdG9rZW4gfSk7XG4gIGF3YWl0IGNsaWVudC5jYWxsKCdyZWxlYXNlX2NsYWltJywge1xuICAgIGNsYWltSWQ6IGNsYWltLmlkLFxuICAgIHJlYXNvbjogJ3J1biBmYWlsZWQgd2l0aG91dCBhIHJlYWRhYmxlIEhBTFQnLFxuICB9KTtcbiAgcmV0dXJuICdibG9ja2VkJztcbn1cblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBDcmFzaC1yZWNvdmVyeSBzY2FuIChzdGVwIDEwKVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbmludGVyZmFjZSBXb3JrdHJlZVNjYW4ge1xuICBhZG9wdGFibGU6IHsgZGlyOiBzdHJpbmc7IGhlYWQ6IHN0cmluZzsgYmFzZWxpbmU6IHN0cmluZyB9IHwgbnVsbDtcbiAgd3JlY2tlZDogc3RyaW5nW107XG59XG5cbmZ1bmN0aW9uIHNjYW5PbGRXb3JrdHJlZXMocm9vdDogc3RyaW5nLCB3b3JrSXRlbUlkOiBzdHJpbmcsIHNwZWNSZWw6IHN0cmluZyk6IFdvcmt0cmVlU2NhbiB7XG4gIGNvbnN0IHNjYW46IFdvcmt0cmVlU2NhbiA9IHsgYWRvcHRhYmxlOiBudWxsLCB3cmVja2VkOiBbXSB9O1xuICBpZiAoIWV4aXN0c1N5bmMocm9vdCkpIHJldHVybiBzY2FuO1xuICBmb3IgKGNvbnN0IG5hbWUgb2YgcmVhZGRpclN5bmMocm9vdCkpIHtcbiAgICBjb25zdCBkaXIgPSBqb2luKHJvb3QsIG5hbWUpO1xuICAgIGNvbnN0IG1hcmtlciA9IHJlYWRNYXJrZXIoZGlyKTtcbiAgICBpZiAobWFya2VyID09PSBudWxsIHx8IG1hcmtlci53b3JrSXRlbUlkICE9PSB3b3JrSXRlbUlkKSBjb250aW51ZTtcbiAgICBsZXQgaGVhZDogc3RyaW5nIHwgbnVsbCA9IG51bGw7XG4gICAgdHJ5IHtcbiAgICAgIGhlYWQgPSBnaXQoWydyZXYtcGFyc2UnLCAnSEVBRCddLCBkaXIpO1xuICAgIH0gY2F0Y2gge1xuICAgICAgaGVhZCA9IG51bGw7XG4gICAgfVxuICAgIGNvbnN0IHN0YXR1cyA9IG5vcm1hbGl6ZVN0YXR1cyhyZWFkU3BlY1JlcG9ydChqb2luKGRpciwgc3BlY1JlbCkpLnN0YXR1cyk7XG4gICAgY29uc3QgdGVybWluYWwgPSBzdGF0dXMgPT09ICdkb25lJyB8fCBzdGF0dXMgPT09ICdpbl9yZXZpZXcnO1xuICAgIGlmIChzY2FuLmFkb3B0YWJsZSA9PT0gbnVsbCAmJiBoZWFkICE9PSBudWxsICYmIGhlYWQgIT09IG1hcmtlci5iYXNlbGluZSAmJiB0ZXJtaW5hbCkge1xuICAgICAgc2Nhbi5hZG9wdGFibGUgPSB7IGRpciwgaGVhZCwgYmFzZWxpbmU6IG1hcmtlci5iYXNlbGluZSB9O1xuICAgIH0gZWxzZSB7XG4gICAgICBzY2FuLndyZWNrZWQucHVzaChkaXIpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gc2Nhbjtcbn1cblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBydW5PbmNlIFx1MjAxNCBvbmUgZnVsbCBkaXNwYXRjaCBjeWNsZVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBydW5PbmNlKG9wdGlvbnM6IFJ1bm5lck9wdGlvbnMpOiBQcm9taXNlPFJ1bk9uY2VSZXN1bHQ+IHtcbiAgY29uc3QgeyBjbGllbnQgfSA9IG9wdGlvbnM7XG4gIGNvbnN0IHJlcG9QYXRoID0gcmVzb2x2ZShvcHRpb25zLnJlcG9QYXRoKTtcbiAgY29uc3QgcmVtb3RlID0gb3B0aW9ucy5yZW1vdGUgPz8gJ29yaWdpbic7XG4gIGNvbnN0IGFsbG93bGlzdCA9IG9wdGlvbnMudmVyaWZpY2F0aW9uQWxsb3dsaXN0ID8/IERFRkFVTFRfVkVSSUZJQ0FUSU9OX0FMTE9XTElTVDtcblxuICAvLyAxIFx1MjAxNCBwb2xsLiBPcmRlciBvZiB0aGUgQVBJIHJlc3BvbnNlID0gaW1wb3J0IG9yZGVyOyB0YWtlIHRoZSBmaXJzdC5cbiAgLy8gRmFsbGJhY2s6IGFuIGluX3Byb2dyZXNzIGl0ZW0gd2l0aCBubyBsaXZlIGNsYWltIGlzIGEgY3Jhc2hlZCBkaXNwYXRjaC5cbiAgY29uc3QgbGlzdFVuYmxvY2tlZCA9IGFzeW5jIChzdGF0ZTogV29ya0l0ZW1TdGF0ZSk6IFByb21pc2U8V29ya0l0ZW1bXT4gPT5cbiAgICAoYXdhaXQgY2xpZW50LmNhbGw8V29ya0l0ZW1bXT4oJ2xpc3Rfd29ya19pdGVtcycsIHsgc3RhdGUsIGNsYWltYWJsZTogdHJ1ZSB9KSkuZmlsdGVyKFxuICAgICAgKGl0ZW0pID0+IGl0ZW0uYmxvY2tlZFJlYXNvbiA9PT0gbnVsbCxcbiAgICApO1xuICBsZXQgY2FuZGlkYXRlcyA9IGF3YWl0IGxpc3RVbmJsb2NrZWQoJ3JlYWR5X2Zvcl9kZXYnKTtcbiAgaWYgKGNhbmRpZGF0ZXMubGVuZ3RoID09PSAwKSBjYW5kaWRhdGVzID0gYXdhaXQgbGlzdFVuYmxvY2tlZCgnaW5fcHJvZ3Jlc3MnKTtcbiAgY29uc3QgcGlja2VkID0gY2FuZGlkYXRlc1swXTtcbiAgaWYgKHBpY2tlZCA9PT0gdW5kZWZpbmVkKSByZXR1cm4geyBkaXNwYXRjaGVkOiBmYWxzZSB9O1xuXG4gIGxldCBjbGFpbTogQ2xhaW07XG4gIHRyeSB7XG4gICAgY2xhaW0gPSBhd2FpdCBjbGllbnQuY2FsbDxDbGFpbT4oJ2NsYWltX3Rhc2snLCB7IHdvcmtJdGVtSWQ6IHBpY2tlZC5pZCB9KTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBpZiAoaXNSZW1vdGVFcnJvcihlcnJvciwgJ0NvbmZsaWN0RXJyb3InKSkge1xuICAgICAgcmV0dXJuIHsgZGlzcGF0Y2hlZDogZmFsc2UsIGRldGFpbHM6IGBsb3N0IHRoZSBjbGFpbSByYWNlIGZvciAke3BpY2tlZC5leHRlcm5hbEtleX1gIH07XG4gICAgfVxuICAgIHRocm93IGVycm9yO1xuICB9XG5cbiAgY29uc3QgY29udGV4dCA9IGF3YWl0IGNsaWVudC5jYWxsPHsgd29ya0l0ZW06IFdvcmtJdGVtOyBlbnRyeVN0YXRlOiBXb3JrSXRlbVN0YXRlIH0+KFxuICAgICdnZXRfdGFza19jb250ZXh0JyxcbiAgICB7IHdvcmtJdGVtSWQ6IHBpY2tlZC5pZCB9LFxuICApO1xuICBjb25zdCB3b3JrSXRlbSA9IGNvbnRleHQud29ya0l0ZW07XG4gIGNvbnN0IHNwZWNSZWwgPSBqb2luKG9wdGlvbnMuc3BlY0ZvbGRlciwgd29ya0l0ZW0uc3BlY1BhdGgpO1xuICBjb25zdCBicmFuY2ggPSBgY2xhaW0vJHtjbGFpbS5pZH1gO1xuICBjb25zdCB3b3JrdHJlZXNSb290ID0gam9pbihyZXBvUGF0aCwgJy5vYWhzJywgJ3dvcmt0cmVlcycpO1xuICBjb25zdCBldmlkZW5jZTogRXZpZGVuY2VbXSA9IFtdO1xuXG4gIGNvbnN0IHN1Ym1pdCA9IGFzeW5jIChraW5kOiBFdmlkZW5jZVsna2luZCddLCBwYXlsb2FkOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPik6IFByb21pc2U8dm9pZD4gPT4ge1xuICAgIGNvbnN0IGl0ZW06IEV2aWRlbmNlID0geyBraW5kLCBwYXlsb2FkIH07XG4gICAgZXZpZGVuY2UucHVzaChpdGVtKTtcbiAgICBhd2FpdCBjbGllbnQuY2FsbCgnc3VibWl0X2V2aWRlbmNlJywge1xuICAgICAgd29ya0l0ZW1JZDogd29ya0l0ZW0uaWQsXG4gICAgICBldmlkZW5jZTogaXRlbSxcbiAgICAgIGZlbmNpbmdUb2tlbjogY2xhaW0uZmVuY2luZ1Rva2VuLFxuICAgIH0pO1xuICB9O1xuXG4gIGNvbnN0IGJhc2UgPSB7XG4gICAgZGlzcGF0Y2hlZDogdHJ1ZSxcbiAgICB3b3JrSXRlbUlkOiB3b3JrSXRlbS5pZCxcbiAgICBleHRlcm5hbEtleTogd29ya0l0ZW0uZXh0ZXJuYWxLZXksXG4gICAgY2xhaW1JZDogY2xhaW0uaWQsXG4gICAgZXZpZGVuY2UsXG4gIH0gc2F0aXNmaWVzIFJ1bk9uY2VSZXN1bHQ7XG5cbiAgY29uc3QgZmluaXNoQXJncyA9IHtcbiAgICBjbGllbnQsXG4gICAgd29ya0l0ZW0sXG4gICAgY2xhaW0sXG4gICAgc3BlY1JlbCxcbiAgICBicmFuY2gsXG4gICAgcmVwb1BhdGgsXG4gICAgcmVtb3RlLFxuICAgIGFsbG93bGlzdCxcbiAgICBzdWJtaXQsXG4gIH07XG5cbiAgLy8gMTAgXHUyMDE0IGFkb3B0IChjcmFzaCByZWNvdmVyeSk6IGluc3BlY3QgbGVmdG92ZXIgd29ya3RyZWVzIG9mIHRoaXMgd29yayBpdGVtLlxuICBjb25zdCBzY2FuID0gc2Nhbk9sZFdvcmt0cmVlcyh3b3JrdHJlZXNSb290LCB3b3JrSXRlbS5pZCwgc3BlY1JlbCk7XG4gIGlmIChzY2FuLmFkb3B0YWJsZSAhPT0gbnVsbCkge1xuICAgIGNvbnN0IHsgZGlyLCBoZWFkLCBiYXNlbGluZSB9ID0gc2Nhbi5hZG9wdGFibGU7XG4gICAgLy8gVGhlIG5ldyBjbGFpbSdzIGJyYW5jaCBwb2ludHMgYXQgdGhlIGNyYXNoZWQgcnVuJ3MgZmluaXNoZWQgSEVBRDsgdGhlXG4gICAgLy8gYWdlbnQgaXMgTk9UIHJlLWludm9rZWQgXHUyMDE0IHRoaXMgaXMgbGF0ZSBldmlkZW5jZSBzdWJtaXNzaW9uLCBub3QgcmVkby5cbiAgICBnaXQoWydicmFuY2gnLCBicmFuY2gsIGhlYWRdLCByZXBvUGF0aCk7XG4gICAgLy8gRW50cnktc3RhdGUgYWxpZ25tZW50IChuby1vcCB3aGVuIHRoZSBjcmFzaGVkIHJ1biBhbHJlYWR5IGFkdmFuY2VkKS5cbiAgICBhd2FpdCBjbGllbnQuY2FsbCgnYWR2YW5jZV9zdGF0ZScsIHtcbiAgICAgIHdvcmtJdGVtSWQ6IHdvcmtJdGVtLmlkLFxuICAgICAgdG86ICdpbl9wcm9ncmVzcycsXG4gICAgICBmZW5jaW5nVG9rZW46IGNsYWltLmZlbmNpbmdUb2tlbixcbiAgICB9KTtcbiAgICBpZiAob3B0aW9ucy5mYWlscG9pbnQgPT09ICdiZWZvcmVfcmVwb3J0Jykge1xuICAgICAgcmV0dXJuIHsgLi4uYmFzZSwgb3V0Y29tZTogJ2NyYXNoZWQnLCBkZXRhaWxzOiAnZmFpbHBvaW50IGJlZm9yZV9yZXBvcnQgKGFkb3B0IHBhdGgpJyB9O1xuICAgIH1cbiAgICBjb25zdCBvdXRjb21lID0gYXdhaXQgZmluaXNoUnVuKHtcbiAgICAgIC4uLmZpbmlzaEFyZ3MsXG4gICAgICB3b3JrRGlyOiBkaXIsXG4gICAgICBiYXNlbGluZSxcbiAgICAgIGFnZW50RXhpdENvZGU6IG51bGwsXG4gICAgfSk7XG4gICAgcmVtb3ZlV29ya3RyZWUoZGlyLCByZXBvUGF0aCk7XG4gICAgcmV0dXJuIHtcbiAgICAgIC4uLmJhc2UsXG4gICAgICBvdXRjb21lOiBvdXRjb21lID09PSAnaW5fcmV2aWV3JyA/ICdhZG9wdGVkX2luX3JldmlldycgOiBvdXRjb21lLFxuICAgICAgZGV0YWlsczogYGFkb3B0ZWQgZmluaXNoZWQgd29ya3RyZWUgJHtkaXJ9YCxcbiAgICB9O1xuICB9XG4gIGlmIChzY2FuLndyZWNrZWQubGVuZ3RoID4gMCkge1xuICAgIC8vIEEgd3JlY2tlZCB3b3JrdHJlZSAobm8gY29tbWl0IHBhc3QgYmFzZWxpbmUgLyBub24tdGVybWluYWwgc3RhdHVzKSBpc1xuICAgIC8vIGNsZWFuZWQ7IHRoZSBpdGVtIGJsb2NrcyBzdGFsZV93b3JrdHJlZSBmb3IgYSBodW1hbiBsb29rLlxuICAgIGZvciAoY29uc3QgZGlyIG9mIHNjYW4ud3JlY2tlZCkgcmVtb3ZlV29ya3RyZWUoZGlyLCByZXBvUGF0aCk7XG4gICAgYXdhaXQgY2xpZW50LmNhbGwoJ2Jsb2NrX3Rhc2snLCB7XG4gICAgICB3b3JrSXRlbUlkOiB3b3JrSXRlbS5pZCxcbiAgICAgIHJlYXNvbjogJ3N0YWxlX3dvcmt0cmVlJyxcbiAgICAgIGZlbmNpbmdUb2tlbjogY2xhaW0uZmVuY2luZ1Rva2VuLFxuICAgIH0pO1xuICAgIGF3YWl0IGNsaWVudC5jYWxsKCdyZWxlYXNlX2NsYWltJywgeyBjbGFpbUlkOiBjbGFpbS5pZCwgcmVhc29uOiAnc3RhbGUgd29ya3RyZWUgY2xlYW5lZCcgfSk7XG4gICAgcmV0dXJuIHsgLi4uYmFzZSwgb3V0Y29tZTogJ2Jsb2NrZWQnLCBkZXRhaWxzOiAnc3RhbGUgd29ya3RyZWUgY2xlYW5lZDsgdGFzayBibG9ja2VkJyB9O1xuICB9XG5cbiAgLy8gMiBcdTIwMTQgZ2l0IHBsdW1iaW5nOiBiYXNlbGluZSwgY2xhaW0gYnJhbmNoLCBjbGFpbS1uYW1lZCB3b3JrdHJlZS5cbiAgY29uc3QgYmFzZWxpbmUgPSBnaXQoWydyZXYtcGFyc2UnLCAnSEVBRCddLCByZXBvUGF0aCk7XG4gIGVuc3VyZUdpdEV4Y2x1ZGVzKHJlcG9QYXRoKTtcbiAgbWtkaXJTeW5jKHdvcmt0cmVlc1Jvb3QsIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xuICBjb25zdCB3b3JrdHJlZURpciA9IGpvaW4od29ya3RyZWVzUm9vdCwgY2xhaW0uaWQpO1xuICBnaXQoWyd3b3JrdHJlZScsICdhZGQnLCAnLWInLCBicmFuY2gsIHdvcmt0cmVlRGlyLCBiYXNlbGluZV0sIHJlcG9QYXRoKTtcbiAgd3JpdGVNYXJrZXIod29ya3RyZWVEaXIsIHtcbiAgICB3b3JrSXRlbUlkOiB3b3JrSXRlbS5pZCxcbiAgICBjbGFpbUlkOiBjbGFpbS5pZCxcbiAgICBiYXNlbGluZSxcbiAgICBpbnZvY2F0aW9uczogMCxcbiAgfSk7XG5cbiAgLy8gMyBcdTIwMTQgbWlycm9yLW9uLWRpc3BhdGNoOiBzdGFtcCBmcm9udG1hdHRlciB0byB0aGUgREIgZW50cnkgc3RhdGUgc28gdGhlXG4gIC8vIG9uZSBtb21lbnQgdGhlIGZpbGUgaXMgcmVhZCBhcyBhbiBlbnRyeSBzdGF0ZSwgaXQgaXMgZnJlc2ggKFx1MDBBNzEuNikuXG4gIGNvbnN0IHNwZWNBYnMgPSBqb2luKHdvcmt0cmVlRGlyLCBzcGVjUmVsKTtcbiAgaWYgKGV4aXN0c1N5bmMoc3BlY0FicykpIHtcbiAgICBzZXRGcm9udG1hdHRlclN0YXR1cyhzcGVjQWJzLCBFTlRSWV9TVEFUVVNbY29udGV4dC5lbnRyeVN0YXRlXSA/PyBjb250ZXh0LmVudHJ5U3RhdGUpO1xuICB9XG5cbiAgLy8gNCBcdTIwMTQgYWR2YW5jZSBpbnRvIGV4ZWN1dGlvbiBCRUZPUkUgdGhlIGFnZW50IHJ1bnMgKERCIGlzIHRoZSBlbnRyeSBzdGF0ZSkuXG4gIGF3YWl0IGNsaWVudC5jYWxsKCdhZHZhbmNlX3N0YXRlJywge1xuICAgIHdvcmtJdGVtSWQ6IHdvcmtJdGVtLmlkLFxuICAgIHRvOiAnaW5fcHJvZ3Jlc3MnLFxuICAgIGZlbmNpbmdUb2tlbjogY2xhaW0uZmVuY2luZ1Rva2VuLFxuICB9KTtcblxuICAvLyA1IFx1MjAxNCBpbnZva2UgdGhlIGNvZGluZyBhZ2VudC5cbiAgY29uc3QgY29tbWFuZCA9IG9wdGlvbnMuYWdlbnRDbWRcbiAgICAucmVwbGFjZUFsbCgne1NQRUNfRk9MREVSfScsIG9wdGlvbnMuc3BlY0ZvbGRlcilcbiAgICAucmVwbGFjZUFsbCgne1NUT1JZX0lEfScsIHdvcmtJdGVtLmV4dGVybmFsS2V5KVxuICAgIC5yZXBsYWNlQWxsKCd7SU5WT0tFX1dJVEh9Jywgd29ya0l0ZW0uaW52b2tlRGV2V2l0aClcbiAgICAucmVwbGFjZUFsbCgne1dPUktUUkVFfScsIHdvcmt0cmVlRGlyKTtcbiAgd3JpdGVNYXJrZXIod29ya3RyZWVEaXIsIHtcbiAgICB3b3JrSXRlbUlkOiB3b3JrSXRlbS5pZCxcbiAgICBjbGFpbUlkOiBjbGFpbS5pZCxcbiAgICBiYXNlbGluZSxcbiAgICBpbnZvY2F0aW9uczogMSxcbiAgfSk7XG4gIGNvbnN0IGludm9rZWQgPSBzcGF3blN5bmMoJ2Jhc2gnLCBbJy1sYycsIGNvbW1hbmRdLCB7XG4gICAgY3dkOiB3b3JrdHJlZURpcixcbiAgICBlbmNvZGluZzogJ3V0ZjgnLFxuICAgIHRpbWVvdXQ6IG9wdGlvbnMuYWdlbnRUaW1lb3V0TXMgPz8gMzAgKiA2MCAqIDEwMDAsXG4gICAga2lsbFNpZ25hbDogJ1NJR0tJTEwnLFxuICAgIGVudjoge1xuICAgICAgLi4ucHJvY2Vzcy5lbnYsXG4gICAgICAuLi5vcHRpb25zLmFnZW50RW52LFxuICAgICAgT0FIU19TUEVDX0ZJTEU6IHNwZWNBYnMsXG4gICAgICBPQUhTX1NUT1JZX0lEOiB3b3JrSXRlbS5leHRlcm5hbEtleSxcbiAgICB9LFxuICB9KTtcbiAgY29uc3QgYWdlbnRFeGl0Q29kZSA9IGludm9rZWQuc3RhdHVzID8/IC0xO1xuXG4gIC8vIFRFU1QgT05MWTogc2ltdWxhdGUgZHlpbmcgYWZ0ZXIgdGhlIGFnZW50IGNvbW1pdHRlZCwgYmVmb3JlIGFueSByZXBvcnQuXG4gIC8vIE5vIGV2aWRlbmNlLCBubyBhZHZhbmNlLCBubyByZWxlYXNlIFx1MjAxNCB0aGUgY2xhaW0gc3RheXMgbGl2ZSwgdGhlIHdvcmt0cmVlXG4gIC8vIHN0YXlzIG9uIGRpc2s7IGEgbGF0ZXIgY2xhaW0gYWRvcHRzIG9yIGNsZWFucyBpdCAoc3RlcCAxMCkuXG4gIGlmIChvcHRpb25zLmZhaWxwb2ludCA9PT0gJ2JlZm9yZV9yZXBvcnQnKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIC4uLmJhc2UsXG4gICAgICBvdXRjb21lOiAnY3Jhc2hlZCcsXG4gICAgICBkZXRhaWxzOiAnZmFpbHBvaW50IGJlZm9yZV9yZXBvcnQ6IGRpZWQgYWZ0ZXIgdGhlIGFnZW50IHJhbiwgYmVmb3JlIHJlcG9ydGluZycsXG4gICAgfTtcbiAgfVxuXG4gIGNvbnN0IG91dGNvbWUgPSBhd2FpdCBmaW5pc2hSdW4oe1xuICAgIC4uLmZpbmlzaEFyZ3MsXG4gICAgd29ya0Rpcjogd29ya3RyZWVEaXIsXG4gICAgYmFzZWxpbmUsXG4gICAgYWdlbnRFeGl0Q29kZSxcbiAgfSk7XG4gIHJlbW92ZVdvcmt0cmVlKHdvcmt0cmVlRGlyLCByZXBvUGF0aCk7XG4gIHJldHVybiB7IC4uLmJhc2UsIG91dGNvbWUgfTtcbn1cblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyB3b3JrTG9vcCBcdTIwMTQgcG9sbCBcdTIxOTIgcnVuT25jZSBcdTIxOTIgc2xlZXBcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4vKiogUnVuIHVudGlsIHN0b3BwZWQ6IHBvbGwgXHUyMTkyIHJ1bk9uY2UgXHUyMTkyIHNsZWVwKHBvbGxNcykuIFNJR0lOVCBleGl0cyBjbGVhbmx5LiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHdvcmtMb29wKG9wdGlvbnM6IFJ1bm5lck9wdGlvbnMgJiB7IG9uY2U/OiBib29sZWFuIH0pOiBQcm9taXNlPHZvaWQ+IHtcbiAgbGV0IHN0b3BwZWQgPSBmYWxzZTtcbiAgbGV0IHdha2U6ICgoKSA9PiB2b2lkKSB8IHVuZGVmaW5lZDtcbiAgY29uc3Qgb25TaWdpbnQgPSAoKTogdm9pZCA9PiB7XG4gICAgc3RvcHBlZCA9IHRydWU7XG4gICAgd2FrZT8uKCk7XG4gIH07XG4gIHByb2Nlc3Mub25jZSgnU0lHSU5UJywgb25TaWdpbnQpO1xuICB0cnkge1xuICAgIGZvciAoOzspIHtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHJ1bk9uY2Uob3B0aW9ucyk7XG4gICAgICBpZiAob3B0aW9ucy5vbmNlID09PSB0cnVlIHx8IHN0b3BwZWQpIHJldHVybjtcbiAgICAgIGlmICghcmVzdWx0LmRpc3BhdGNoZWQpIHtcbiAgICAgICAgYXdhaXQgbmV3IFByb21pc2U8dm9pZD4oKHJlc29sdmVTbGVlcCkgPT4ge1xuICAgICAgICAgIHdha2UgPSByZXNvbHZlU2xlZXA7XG4gICAgICAgICAgc2V0VGltZW91dChyZXNvbHZlU2xlZXAsIG9wdGlvbnMucG9sbE1zID8/IDE1XzAwMCk7XG4gICAgICAgIH0pO1xuICAgICAgICB3YWtlID0gdW5kZWZpbmVkO1xuICAgICAgICBpZiAoc3RvcHBlZCkgcmV0dXJuO1xuICAgICAgfVxuICAgIH1cbiAgfSBmaW5hbGx5IHtcbiAgICBwcm9jZXNzLnJlbW92ZUxpc3RlbmVyKCdTSUdJTlQnLCBvblNpZ2ludCk7XG4gIH1cbn1cbiIsICIvKipcbiAqIERyaXp6bGUgcGctY29yZSBzY2hlbWEgZm9yIHRoZSBvYWhzIHNwaW5lIChQaGFzZSAxIHN0b3J5IDExKS5cbiAqXG4gKiBEZXNpZ24gKHByb2R1Y3Qtcm9hZG1hcC5tZCBcdTAwQTcxLjMsIFx1MDBBNzEuNSBcdTIwMTQgXCJyYWNlcyBsb3NlIGJ5IGNvbnN0cmFpbnQsIG5vdCBieVxuICogYXBwbGljYXRpb24gbG9naWNcIik6XG4gKiAgLSBjbGFpbXM6IHBhcnRpYWwgdW5pcXVlIGluZGV4IE9OICh3b3JrX2l0ZW1faWQpIFdIRVJFIHJlbGVhc2VkID0gZmFsc2UgXHUyMDE0XG4gKiAgICB0aGUgc2Vjb25kIGNvbmN1cnJlbnQgY2xhaW0gbG9zZXMgYXQgdGhlIGNvbnN0cmFpbnQsIGxlYXZpbmcgbm8gcm93LlxuICogIC0gZXZlbnRzOiBVTklRVUUgKHN0cmVhbV9pZCwgc3RyZWFtX3NlcSkgZG91YmxlcyBhcyB0aGUgb3B0aW1pc3RpYyBsb2NrO1xuICogICAgZ2xvYmFsX3NlcSBpcyBhIHNlcmlhbCBpZGVudGl0eS5cbiAqICAtIHdvcmtfaXRlbXM6IHN0YXRlX3ZlcnNpb24gaW50IFx1MjAxNCBDQVMgdmlhIFVQREFURSAuLi4gV0hFUkUgc3RhdGVfdmVyc2lvbiA9ICRleHBlY3RlZC5cbiAqXG4gKiBIYW5kLW1haW50YWluZWQgdHdpbiBEREwgbGl2ZXMgaW4gc2NoZW1hLXNxbC50cyAocnVucyBvbiBQR2xpdGUgaW4gdGhlXG4gKiBjb25mb3JtYW5jZSBoYXJuZXNzKTsga2VlcCB0aGUgdHdvIGluIGxvY2tzdGVwLlxuICovXG5pbXBvcnQgeyBzcWwgfSBmcm9tICdkcml6emxlLW9ybSc7XG5pbXBvcnQge1xuICBiaWdpbnQsXG4gIGJvb2xlYW4sXG4gIGludGVnZXIsXG4gIGpzb25iLFxuICBwZ1RhYmxlLFxuICBwcmltYXJ5S2V5LFxuICBzZXJpYWwsXG4gIHRleHQsXG4gIHVuaXF1ZUluZGV4LFxufSBmcm9tICdkcml6emxlLW9ybS9wZy1jb3JlJztcblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBhY3RvcnMgXHUyMDE0IHVzZXJzLCBhZ2VudHMsIGFuZCB0aGUgcGVyLXdvcmtzcGFjZSBzeXN0ZW0gYWN0b3IgKHJvYWRtYXAgXHUwMEE3MS4yKVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5leHBvcnQgY29uc3QgYWN0b3JzID0gcGdUYWJsZSgnYWN0b3JzJywge1xuICBpZDogdGV4dCgnaWQnKS5wcmltYXJ5S2V5KCksXG4gIHR5cGU6IHRleHQoJ3R5cGUnKS5ub3ROdWxsKCksIC8vICd1c2VyJyB8ICdhZ2VudCcgfCAnc3lzdGVtJ1xuICBkaXNwbGF5TmFtZTogdGV4dCgnZGlzcGxheV9uYW1lJykubm90TnVsbCgpLFxuICAvKiogUGhhc2UgMiAocm9hZG1hcCBcdTAwQTczKTogJ2FkbWluJyB8ICdtZW1iZXInIHwgJ2F1ZGl0b3InIFx1MjAxNCBnYXRlZC13cml0ZSBhdXRob3JpdHkgKi9cbiAgZ292ZXJuYW5jZVJvbGU6IHRleHQoJ2dvdmVybmFuY2Vfcm9sZScpLm5vdE51bGwoKS5kZWZhdWx0KCdtZW1iZXInKSxcbiAgLyoqIFBoYXNlIDQgKHJvYWRtYXAgXHUwMEE3Myk6IEJNQUQgcGxheWJvb2sgcGVyc29uYSAoZS5nLiAnYm1hZC1hZ2VudC1wbScpOyBOVUxMIGZvciBodW1hbnMgYW5kIHBsYWluIGFnZW50cyAqL1xuICBwZXJzb25hQ29kZTogdGV4dCgncGVyc29uYV9jb2RlJyksXG59KTtcblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBncmFudHMgXHUyMDE0IGZsYXQgUGhhc2UtMSBwZXJtaXNzaW9uIHNldCAoc2NvcGUgYmVjb21lcyBtZWFuaW5nZnVsIGluIFBoYXNlIDIpXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbmV4cG9ydCBjb25zdCBncmFudHMgPSBwZ1RhYmxlKFxuICAnZ3JhbnRzJyxcbiAge1xuICAgIGFjdG9ySWQ6IHRleHQoJ2FjdG9yX2lkJykubm90TnVsbCgpLFxuICAgIHBlcm1pc3Npb246IHRleHQoJ3Blcm1pc3Npb24nKS5ub3ROdWxsKCksXG4gICAgc2NvcGU6IHRleHQoJ3Njb3BlJyksXG4gIH0sXG4gICh0KSA9PiBbcHJpbWFyeUtleSh7IGNvbHVtbnM6IFt0LmFjdG9ySWQsIHQucGVybWlzc2lvbl0gfSldLFxuKTtcblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyByb2xlX2Fzc2lnbm1lbnRzIFx1MjAxNCBkZWxpdmVyeS1yb2xlIGJ1bmRsZXMgKFBoYXNlIDIsIHJvYWRtYXAgXHUwMEE3MykuIEFzc2lnbm1lbnRcbi8vIGdyYW50cyB0aGUgYnVuZGxlOyByZXZvY2F0aW9uIGZsaXBzIGByZXZva2VkYCAoYXVkaXQgaGlzdG9yeSBpcyBrZXB0KS5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuZXhwb3J0IGNvbnN0IHJvbGVBc3NpZ25tZW50cyA9IHBnVGFibGUoJ3JvbGVfYXNzaWdubWVudHMnLCB7XG4gIHNlcTogc2VyaWFsKCdzZXEnKS5wcmltYXJ5S2V5KCksXG4gIGFjdG9ySWQ6IHRleHQoJ2FjdG9yX2lkJykubm90TnVsbCgpLFxuICByb2xlQ29kZTogdGV4dCgncm9sZV9jb2RlJykubm90TnVsbCgpLFxuICBncmFudGVkQnk6IHRleHQoJ2dyYW50ZWRfYnknKS5ub3ROdWxsKCksXG4gIHJldm9rZWQ6IGJvb2xlYW4oJ3Jldm9rZWQnKS5ub3ROdWxsKCkuZGVmYXVsdChmYWxzZSksXG59KTtcblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyB3b3Jrc3BhY2Vfc3RhdGUgXHUyMDE0IHRoZSBzaW5nbGUtcm93IHBsYW4vcG9saWN5IHByb2plY3Rpb24gKFBoYXNlIDIsIHJvYWRtYXBcbi8vIFx1MDBBNzMpLiBFeGFjdGx5IG9uZSByb3cgd2l0aCBpZCA9ICd3b3Jrc3BhY2UnOyB2ZXJzaW9ucyBiYWNrIGF1dGh6LmV4cGxhaW4uXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbmV4cG9ydCBjb25zdCB3b3Jrc3BhY2VTdGF0ZSA9IHBnVGFibGUoJ3dvcmtzcGFjZV9zdGF0ZScsIHtcbiAgaWQ6IHRleHQoJ2lkJykucHJpbWFyeUtleSgpLCAvLyBhbHdheXMgJ3dvcmtzcGFjZSdcbiAgcGxhbjogdGV4dCgncGxhbicpLm5vdE51bGwoKSwgLy8gJ2ZyZWUnIHwgJ3RlYW0nIHwgJ2VudGVycHJpc2UnXG4gIHBsYW5WZXJzaW9uOiBpbnRlZ2VyKCdwbGFuX3ZlcnNpb24nKS5ub3ROdWxsKCkuZGVmYXVsdCgxKSxcbiAgcG9saWN5OiBqc29uYigncG9saWN5JykuJHR5cGU8UmVjb3JkPHN0cmluZywgdW5rbm93bj4+KCkubm90TnVsbCgpLmRlZmF1bHQoc3FsYCd7fSc6Ompzb25iYCksXG4gIHBvbGljeVZlcnNpb246IGludGVnZXIoJ3BvbGljeV92ZXJzaW9uJykubm90TnVsbCgpLmRlZmF1bHQoMSksXG59KTtcblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBnYXRlX3BvbGljaWVzIFx1MjAxNCBnYXRlIGRlZmluaXRpb25zIGFzIERBVEEgKFBoYXNlIDIsIHJvYWRtYXAgXHUwMEE3Myk6XG4vLyBtaW5BcHByb3ZhbHMgKyByZXF1aXJlZEFjdG9yVHlwZXMsIGtleWVkIGJ5IGdhdGUgY29kZS5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuZXhwb3J0IGNvbnN0IGdhdGVQb2xpY2llcyA9IHBnVGFibGUoJ2dhdGVfcG9saWNpZXMnLCB7XG4gIGdhdGU6IHRleHQoJ2dhdGUnKS5wcmltYXJ5S2V5KCksIC8vICdzcGVjX2FwcHJvdmFsJyB8ICdyZXZpZXdfYXBwcm92YWwnXG4gIHBvbGljeToganNvbmIoJ3BvbGljeScpLiR0eXBlPFJlY29yZDxzdHJpbmcsIHVua25vd24+PigpLm5vdE51bGwoKSxcbn0pO1xuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIGZlYXR1cmVzIFx1MjAxNCBlcGljLWxldmVsIHByb2plY3Rpb24gKHN0YXRlICsgZG9uZV9jaGVja3BvaW50IGRpc3BhdGNoIGhvbGQpXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbmV4cG9ydCBjb25zdCBmZWF0dXJlcyA9IHBnVGFibGUoJ2ZlYXR1cmVzJywge1xuICBpZDogdGV4dCgnaWQnKS5wcmltYXJ5S2V5KCksXG4gIHNlcTogc2VyaWFsKCdzZXEnKS5ub3ROdWxsKCksXG4gIHN0YXRlOiB0ZXh0KCdzdGF0ZScpLm5vdE51bGwoKSwgLy8gJ2JhY2tsb2cnIHwgJ2luX3Byb2dyZXNzJyB8ICdkb25lJ1xuICBkaXNwYXRjaEhvbGQ6IGJvb2xlYW4oJ2Rpc3BhdGNoX2hvbGQnKS5ub3ROdWxsKCkuZGVmYXVsdChmYWxzZSksXG59KTtcblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyB3b3JrX2l0ZW1zIFx1MjAxNCB0aGUgdW5pZmllZCB3b3JrLWl0ZW0gbW9kZWwgKHJvYWRtYXAgXHUwMEE3MS4xKVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5leHBvcnQgY29uc3Qgd29ya0l0ZW1zID0gcGdUYWJsZSgnd29ya19pdGVtcycsIHtcbiAgaWQ6IHRleHQoJ2lkJykucHJpbWFyeUtleSgpLFxuICAvKiogY3JlYXRpb24gb3JkZXIgXHUyMDE0IGJhY2tzIGZpcnN0LXdyaXRlci13aW5zIGV4dGVybmFsS2V5IHJlc29sdXRpb24gKi9cbiAgc2VxOiBzZXJpYWwoJ3NlcScpLm5vdE51bGwoKSxcbiAgZmVhdHVyZUlkOiB0ZXh0KCdmZWF0dXJlX2lkJykubm90TnVsbCgpLFxuICBleHRlcm5hbEtleTogdGV4dCgnZXh0ZXJuYWxfa2V5Jykubm90TnVsbCgpLFxuICAvKiogUGhhc2UgNCAocm9hZG1hcCBcdTAwQTcxLjQpOiBzZWxlY3RzIFdISUNIIG1hY2hpbmUtZXZpZGVuY2UgZ3VhcmRzIGFwcGx5IFx1MjAxNCBuZXZlciBXSE8gcGFzc2VzIGEgZ2F0ZSAqL1xuICBraW5kOiB0ZXh0KCdraW5kJykubm90TnVsbCgpLmRlZmF1bHQoJ2NvZGUnKSxcbiAgdGl0bGU6IHRleHQoJ3RpdGxlJykubm90TnVsbCgpLFxuICBzdGF0ZTogdGV4dCgnc3RhdGUnKS5ub3ROdWxsKCksXG4gIGJsb2NrZWRSZWFzb246IHRleHQoJ2Jsb2NrZWRfcmVhc29uJyksIC8vIG92ZXJsYXksIG5vdCBhIHN0YXRlIChEOClcbiAgcmV2aWV3TG9vcEl0ZXJhdGlvbjogaW50ZWdlcigncmV2aWV3X2xvb3BfaXRlcmF0aW9uJykubm90TnVsbCgpLmRlZmF1bHQoMCksXG4gIGludGVudEhhc2g6IHRleHQoJ2ludGVudF9oYXNoJyksXG4gIHBpbm5lZFZlcmlmaWNhdGlvbjoganNvbmIoJ3Bpbm5lZF92ZXJpZmljYXRpb24nKS4kdHlwZTxzdHJpbmdbXT4oKSwgLy8gUnVsZXMtbGF5ZXIgZGF0YSAoRDcpXG4gIHNwZWNDaGVja3BvaW50OiBib29sZWFuKCdzcGVjX2NoZWNrcG9pbnQnKS5ub3ROdWxsKCkuZGVmYXVsdChmYWxzZSksXG4gIGRvbmVDaGVja3BvaW50OiBib29sZWFuKCdkb25lX2NoZWNrcG9pbnQnKS5ub3ROdWxsKCkuZGVmYXVsdChmYWxzZSksXG4gIGludm9rZURldldpdGg6IHRleHQoJ2ludm9rZV9kZXZfd2l0aCcpLm5vdE51bGwoKS5kZWZhdWx0KCcnKSxcbiAgc3BlY1BhdGg6IHRleHQoJ3NwZWNfcGF0aCcpLm5vdE51bGwoKSxcbiAgLyoqIG9wdGltaXN0aWMgY29uY3VycmVuY3k6IENBUyBieSBVUERBVEUgLi4uIFdIRVJFIHN0YXRlX3ZlcnNpb24gPSBleHBlY3RlZCAqL1xuICBzdGF0ZVZlcnNpb246IGludGVnZXIoJ3N0YXRlX3ZlcnNpb24nKS5ub3ROdWxsKCkuZGVmYXVsdCgwKSxcbiAgLyoqIGRlcGVuZGVuY3kgZXh0ZXJuYWxLZXlzIHdpdGhpbiB0aGUgc2FtZSBmZWF0dXJlICovXG4gIGRlcGVuZHNPbjoganNvbmIoJ2RlcGVuZHNfb24nKS4kdHlwZTxzdHJpbmdbXT4oKS5ub3ROdWxsKCkuZGVmYXVsdChzcWxgJ1tdJzo6anNvbmJgKSxcbiAgLyoqIG1vbm90b25pYyBmZW5jaW5nIGNvdW50ZXIgcGVyIHdvcmsgaXRlbSAocm9hZG1hcCBcdTAwQTcxLjMpICovXG4gIGxhc3RGZW5jaW5nVG9rZW46IGludGVnZXIoJ2xhc3RfZmVuY2luZ190b2tlbicpLm5vdE51bGwoKS5kZWZhdWx0KDApLFxufSk7XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gY2xhaW1zIFx1MjAxNCBsZWFzZXMgKyBmZW5jaW5nIHRva2VuczsgT05FIGxpdmUgY2xhaW0gcGVyIGl0ZW0gQlkgQ09OU1RSQUlOVFxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5leHBvcnQgY29uc3QgY2xhaW1zID0gcGdUYWJsZShcbiAgJ2NsYWltcycsXG4gIHtcbiAgICBpZDogdGV4dCgnaWQnKS5wcmltYXJ5S2V5KCksXG4gICAgc2VxOiBzZXJpYWwoJ3NlcScpLm5vdE51bGwoKSxcbiAgICB3b3JrSXRlbUlkOiB0ZXh0KCd3b3JrX2l0ZW1faWQnKS5ub3ROdWxsKCksXG4gICAgYWN0b3JJZDogdGV4dCgnYWN0b3JfaWQnKS5ub3ROdWxsKCksXG4gICAgZmVuY2luZ1Rva2VuOiBpbnRlZ2VyKCdmZW5jaW5nX3Rva2VuJykubm90TnVsbCgpLFxuICAgIC8qKiBlbmdpbmUtY2xvY2sgbWlsbGlzZWNvbmRzIChKUyBmaWVsZCBgbm93YCksIG5ldmVyIFNRTCBub3coKSAqL1xuICAgIGxlYXNlRXhwaXJlc0F0OiBiaWdpbnQoJ2xlYXNlX2V4cGlyZXNfYXQnLCB7IG1vZGU6ICdudW1iZXInIH0pLm5vdE51bGwoKSxcbiAgICByZWxlYXNlZDogYm9vbGVhbigncmVsZWFzZWQnKS5ub3ROdWxsKCkuZGVmYXVsdChmYWxzZSksXG4gICAgdHRsTXM6IGJpZ2ludCgndHRsX21zJywgeyBtb2RlOiAnbnVtYmVyJyB9KS5ub3ROdWxsKCksXG4gIH0sXG4gICh0KSA9PiBbXG4gICAgLy8gcm9hZG1hcCBcdTAwQTcxLjM6IFwiT25lIGxpdmUgY2xhaW0gcGVyIHdvcmsgaXRlbSwgZW5mb3JjZWQgYnkgYSBwYXJ0aWFsXG4gICAgLy8gdW5pcXVlIGluZGV4IFx1MjAxNCByYWNlcyBsb3NlIGJ5IGNvbnN0cmFpbnQsIG5vdCBieSBhcHBsaWNhdGlvbiBsb2dpYy5cIlxuICAgIHVuaXF1ZUluZGV4KCdjbGFpbXNfb25lX2xpdmVfcGVyX2l0ZW0nKS5vbih0LndvcmtJdGVtSWQpLndoZXJlKHNxbGByZWxlYXNlZCA9IGZhbHNlYCksXG4gIF0sXG4pO1xuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIGdhdGVfZGVjaXNpb25zIFx1MjAxNCBwZXJtaXNzaW9uIHNuYXBzaG90ICsgZGVjaXNpb24gcmVjb3JkIChyb2FkbWFwIFx1MDBBNzEuNClcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuZXhwb3J0IGNvbnN0IGdhdGVEZWNpc2lvbnMgPSBwZ1RhYmxlKCdnYXRlX2RlY2lzaW9ucycsIHtcbiAgc2VxOiBzZXJpYWwoJ3NlcScpLnByaW1hcnlLZXkoKSxcbiAgd29ya0l0ZW1JZDogdGV4dCgnd29ya19pdGVtX2lkJykubm90TnVsbCgpLFxuICBnYXRlOiB0ZXh0KCdnYXRlJykubm90TnVsbCgpLCAvLyAnc3BlY19hcHByb3ZhbCcgfCAncmV2aWV3X2FwcHJvdmFsJ1xuICBkZWNpc2lvbjogdGV4dCgnZGVjaXNpb24nKS5ub3ROdWxsKCksIC8vICdhcHByb3ZlZCcgfCAncmVqZWN0ZWQnXG4gIGFjdG9ySWQ6IHRleHQoJ2FjdG9yX2lkJykubm90TnVsbCgpLFxuICAvKiogcmV2aWV3IHJvdW5kIHRoZSBkZWNpc2lvbiBiZWxvbmdzIHRvICg9IHJldmlld19sb29wX2l0ZXJhdGlvbiBhdCBkZWNpc2lvbiB0aW1lKSAqL1xuICByb3VuZDogaW50ZWdlcigncm91bmQnKS5ub3ROdWxsKCkuZGVmYXVsdCgwKSxcbn0pO1xuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIGV2aWRlbmNlIFx1MjAxNCBtYWNoaW5lLWNvbGxlY3RlZCBmYWN0czsgc2VxIG9yZGVycyBcImxhdGVzdFwiIHNlbWFudGljc1xuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5leHBvcnQgY29uc3QgZXZpZGVuY2UgPSBwZ1RhYmxlKCdldmlkZW5jZScsIHtcbiAgc2VxOiBzZXJpYWwoJ3NlcScpLnByaW1hcnlLZXkoKSxcbiAgd29ya0l0ZW1JZDogdGV4dCgnd29ya19pdGVtX2lkJykubm90TnVsbCgpLFxuICBraW5kOiB0ZXh0KCdraW5kJykubm90TnVsbCgpLFxuICBwYXlsb2FkOiBqc29uYigncGF5bG9hZCcpLiR0eXBlPFJlY29yZDxzdHJpbmcsIHVua25vd24+PigpLm5vdE51bGwoKSxcbn0pO1xuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIGV2ZW50cyBcdTIwMTQgYXBwZW5kLW9ubHkgbG9nLCBzYW1lLXRyYW5zYWN0aW9uIGFzIHByb2plY3Rpb25zIChyb2FkbWFwIFx1MDBBNzEuNSlcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuZXhwb3J0IGNvbnN0IGV2ZW50cyA9IHBnVGFibGUoXG4gICdldmVudHMnLFxuICB7XG4gICAgZ2xvYmFsU2VxOiBzZXJpYWwoJ2dsb2JhbF9zZXEnKS5wcmltYXJ5S2V5KCksXG4gICAgc3RyZWFtVHlwZTogdGV4dCgnc3RyZWFtX3R5cGUnKS5ub3ROdWxsKCksIC8vICd3b3Jrc3BhY2UnfCdmZWF0dXJlJ3wnd29ya19pdGVtJ3wnYWN0b3InXG4gICAgc3RyZWFtSWQ6IHRleHQoJ3N0cmVhbV9pZCcpLm5vdE51bGwoKSxcbiAgICBzdHJlYW1TZXE6IGludGVnZXIoJ3N0cmVhbV9zZXEnKS5ub3ROdWxsKCksXG4gICAgdHlwZTogdGV4dCgndHlwZScpLm5vdE51bGwoKSxcbiAgICBhY3RvcklkOiB0ZXh0KCdhY3Rvcl9pZCcpLm5vdE51bGwoKSxcbiAgICBwYXlsb2FkOiBqc29uYigncGF5bG9hZCcpLiR0eXBlPFJlY29yZDxzdHJpbmcsIHVua25vd24+PigpLm5vdE51bGwoKSxcbiAgICBjYXVzYXRpb25JZDogdGV4dCgnY2F1c2F0aW9uX2lkJyksXG4gICAgaWRlbXBvdGVuY3lLZXk6IHRleHQoJ2lkZW1wb3RlbmN5X2tleScpLFxuICB9LFxuICAodCkgPT4gW1xuICAgIC8vIFx1MDBBNzEuNTogXCJVTklRVUUoc3RyZWFtX2lkLCBzdHJlYW1fc2VxKSBkb3VibGVzIGFzIHRoZSBvcHRpbWlzdGljIGxvY2suXCJcbiAgICB1bmlxdWVJbmRleCgnZXZlbnRzX3N0cmVhbV9pZF9zdHJlYW1fc2VxJykub24odC5zdHJlYW1JZCwgdC5zdHJlYW1TZXEpLFxuICBdLFxuKTtcblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBpZGVtcG90ZW5jeV9rZXlzIFx1MjAxNCBrZXllZCByZXBsYXkgcmV0dXJucyB0aGUgcmVjb3JkZWQgcmVzdWx0LCBhcHBlbmRzIG5vdGhpbmdcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuZXhwb3J0IGNvbnN0IGlkZW1wb3RlbmN5S2V5cyA9IHBnVGFibGUoJ2lkZW1wb3RlbmN5X2tleXMnLCB7XG4gIGtleTogdGV4dCgna2V5JykucHJpbWFyeUtleSgpLFxuICByZXN1bHQ6IGpzb25iKCdyZXN1bHQnKS4kdHlwZTxSZWNvcmQ8c3RyaW5nLCB1bmtub3duPj4oKS5ub3ROdWxsKCksXG59KTtcblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyB0aHJlYWRzIFx1MjAxNCB0aGUgY2hhdCBTVVJGQUNFIChQaGFzZSAzLCByb2FkbWFwIFx1MDBBNzUuMykuIHBhcnRpY2lwYW50cyBpcyBqc29uYjpcbi8vIGVuZm9yY2VkIGZvciBwcml2YXRlIHRocmVhZHMsIGluZm9ybWF0aW9uYWwgZm9yIG9wZW4gb25lcy5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuZXhwb3J0IGNvbnN0IHRocmVhZHMgPSBwZ1RhYmxlKCd0aHJlYWRzJywge1xuICBpZDogdGV4dCgnaWQnKS5wcmltYXJ5S2V5KCksXG4gIHNlcTogc2VyaWFsKCdzZXEnKS5ub3ROdWxsKCksXG4gIGZlYXR1cmVJZDogdGV4dCgnZmVhdHVyZV9pZCcpLFxuICB3b3JrSXRlbUlkOiB0ZXh0KCd3b3JrX2l0ZW1faWQnKSxcbiAga2luZDogdGV4dCgna2luZCcpLm5vdE51bGwoKSwgLy8gJ3NwZWMnIHwgJ2Rlc2lnbicgfCAndGFzaycgfCAnZ2VuZXJhbCcgfCAncHJpdmF0ZSdcbiAgdmlzaWJpbGl0eTogdGV4dCgndmlzaWJpbGl0eScpLm5vdE51bGwoKSwgLy8gJ29wZW4nIHwgJ3ByaXZhdGUnXG4gIGNyZWF0ZWRCeTogdGV4dCgnY3JlYXRlZF9ieScpLm5vdE51bGwoKSxcbiAgcGFydGljaXBhbnRzOiBqc29uYigncGFydGljaXBhbnRzJykuJHR5cGU8c3RyaW5nW10+KCkubm90TnVsbCgpLmRlZmF1bHQoc3FsYCdbXSc6Ompzb25iYCksXG59KTtcblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBtZXNzYWdlcyBcdTIwMTQgb25lIGNvbHVtbiwgb25lIHRhYmxlIGZvciB1c2VyIEFORCBhZ2VudCBhdXRob3JzIChcdTAwQTc1LjMpO1xuLy8gVU5JUVVFKHRocmVhZF9pZCwgc2VxKSBrZWVwcyB0aGUgcGVyLXRocmVhZCBzZXF1ZW5jZSBnYXAtZnJlZSBieSBjb25zdHJhaW50LlxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5leHBvcnQgY29uc3QgbWVzc2FnZXMgPSBwZ1RhYmxlKFxuICAnbWVzc2FnZXMnLFxuICB7XG4gICAgaWQ6IHRleHQoJ2lkJykucHJpbWFyeUtleSgpLFxuICAgIHRocmVhZElkOiB0ZXh0KCd0aHJlYWRfaWQnKS5ub3ROdWxsKCksXG4gICAgc2VxOiBpbnRlZ2VyKCdzZXEnKS5ub3ROdWxsKCksIC8vIHBlci10aHJlYWQsIDEtYmFzZWQsIGdhcC1mcmVlXG4gICAgYXV0aG9ySWQ6IHRleHQoJ2F1dGhvcl9pZCcpLm5vdE51bGwoKSxcbiAgICBraW5kOiB0ZXh0KCdraW5kJykubm90TnVsbCgpLCAvLyAnY2hhdCcgfCAnc3lzdGVtJ1xuICAgIGJvZHk6IHRleHQoJ2JvZHknKS5ub3ROdWxsKCksXG4gICAgcmVwbHlUbzogdGV4dCgncmVwbHlfdG8nKSxcbiAgfSxcbiAgKHQpID0+IFt1bmlxdWVJbmRleCgnbWVzc2FnZXNfdGhyZWFkX2lkX3NlcScpLm9uKHQudGhyZWFkSWQsIHQuc2VxKV0sXG4pO1xuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIG1lbnRpb25zIFx1MjAxNCBTVFJVQ1RVUkVEIG1lbnRpb24gcmVjb3JkcyArIHRoZSByb3V0ZXIncyByZWNvcmRlZCByZXNvbHV0aW9uXG4vLyAoXHUwMEE3NS40KS4gVGhlIHNlcnZlciBuZXZlciBwYXJzZXMgbWVzc2FnZSBib2RpZXMuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbmV4cG9ydCBjb25zdCBtZW50aW9ucyA9IHBnVGFibGUoJ21lbnRpb25zJywge1xuICBzZXE6IHNlcmlhbCgnc2VxJykucHJpbWFyeUtleSgpLFxuICBtZXNzYWdlSWQ6IHRleHQoJ21lc3NhZ2VfaWQnKS5ub3ROdWxsKCksXG4gIG1lbnRpb25lZEFjdG9ySWQ6IHRleHQoJ21lbnRpb25lZF9hY3Rvcl9pZCcpLm5vdE51bGwoKSxcbiAgcmVzb2x1dGlvbjogdGV4dCgncmVzb2x1dGlvbicpLm5vdE51bGwoKSwgLy8gJ25vdGlmaWVkJ3wnam9iX2NyZWF0ZWQnfCdkZW5pZWRfcG9saWN5J3wnZGVuaWVkX2RlcHRoJ1xufSk7XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gbm90aWZpY2F0aW9ucyBcdTIwMTQgbWVudGlvbi9qb2ItY29tcGxldGlvbiBpbmJveCByb3dzIChcdTAwQTc1LjQpXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbmV4cG9ydCBjb25zdCBub3RpZmljYXRpb25zID0gcGdUYWJsZSgnbm90aWZpY2F0aW9ucycsIHtcbiAgaWQ6IHRleHQoJ2lkJykucHJpbWFyeUtleSgpLFxuICBzZXE6IHNlcmlhbCgnc2VxJykubm90TnVsbCgpLFxuICBhY3RvcklkOiB0ZXh0KCdhY3Rvcl9pZCcpLm5vdE51bGwoKSxcbiAgc291cmNlOiB0ZXh0KCdzb3VyY2UnKS5ub3ROdWxsKCksIC8vICdtZW50aW9uJyB8ICdqb2JfY29tcGxldGVkJ1xuICByZWZJZDogdGV4dCgncmVmX2lkJykubm90TnVsbCgpLCAvLyBtZXNzYWdlSWQgZm9yIG1lbnRpb25zLCBqb2JJZCBmb3IgY29tcGxldGlvbnNcbiAgcmVhZDogYm9vbGVhbigncmVhZCcpLm5vdE51bGwoKS5kZWZhdWx0KGZhbHNlKSxcbn0pO1xuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIGFnZW50X21lbW9yaWVzIFx1MjAxNCBQaGFzZSA1IChyb2FkbWFwIFx1MDBBNzYpOiBvd25lci1zY29wZWQgYWdlbnQgbWVtb3J5LiBzZXEgaXNcbi8vIHBlci1hZ2VudCwgMS1iYXNlZCwgYXBwZW5kIG9yZGVyIFx1MjAxNCBVTklRVUUoYWdlbnRfYWN0b3JfaWQsIHNlcSkgbWFrZXMgdGhlXG4vLyBvcmRlcmluZyBhIGNvbnN0cmFpbnQsIG5vdCBhIGNvbnZlbnRpb24uIENvbnRlbnQgbGl2ZXMgT05MWSBoZXJlOyBtZW1vcnlcbi8vIGV2ZW50cyBuZXZlciBjYXJyeSBpdC5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuZXhwb3J0IGNvbnN0IGFnZW50TWVtb3JpZXMgPSBwZ1RhYmxlKFxuICAnYWdlbnRfbWVtb3JpZXMnLFxuICB7XG4gICAgaWQ6IHRleHQoJ2lkJykucHJpbWFyeUtleSgpLFxuICAgIGFnZW50QWN0b3JJZDogdGV4dCgnYWdlbnRfYWN0b3JfaWQnKS5ub3ROdWxsKCksXG4gICAga2luZDogdGV4dCgna2luZCcpLm5vdE51bGwoKSwgLy8gJ2VwaXNvZGljJyB8ICdwcm9jZWR1cmFsJyB8ICdlbnRpdHknXG4gICAgY29udGVudDogdGV4dCgnY29udGVudCcpLm5vdE51bGwoKSxcbiAgICBzb3VyY2VUaHJlYWRJZDogdGV4dCgnc291cmNlX3RocmVhZF9pZCcpLFxuICAgIHNvdXJjZVZpc2liaWxpdHk6IHRleHQoJ3NvdXJjZV92aXNpYmlsaXR5JyksIC8vICdvcGVuJyB8ICdwcml2YXRlJyB8IE5VTExcbiAgICBzZXE6IGludGVnZXIoJ3NlcScpLm5vdE51bGwoKSxcbiAgfSxcbiAgKHQpID0+IFt1bmlxdWVJbmRleCgnYWdlbnRfbWVtb3JpZXNfYWdlbnRfYWN0b3JfaWRfc2VxJykub24odC5hZ2VudEFjdG9ySWQsIHQuc2VxKV0sXG4pO1xuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIGFnZW50X2pvYnMgXHUyMDE0IHJvdXRlci1tYXRlcmlhbGl6ZWQsIHJlcGx5LW9ubHkgY29udGV4dCAoXHUwMEE3NS40KTogTkVWRVIgYSBjbGFpbSxcbi8vIG5ldmVyIGxpZmVjeWNsZSBhdXRob3JpdHkuIGRlcHRoIGNvdW50cyBhZ2VudC1tZW50aW9uLWFnZW50IGhvcHMuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbmV4cG9ydCBjb25zdCBhZ2VudEpvYnMgPSBwZ1RhYmxlKCdhZ2VudF9qb2JzJywge1xuICBpZDogdGV4dCgnaWQnKS5wcmltYXJ5S2V5KCksXG4gIHNlcTogc2VyaWFsKCdzZXEnKS5ub3ROdWxsKCksXG4gIGFnZW50QWN0b3JJZDogdGV4dCgnYWdlbnRfYWN0b3JfaWQnKS5ub3ROdWxsKCksXG4gIHRocmVhZElkOiB0ZXh0KCd0aHJlYWRfaWQnKS5ub3ROdWxsKCksXG4gIG1lc3NhZ2VJZDogdGV4dCgnbWVzc2FnZV9pZCcpLm5vdE51bGwoKSxcbiAgd29ya0l0ZW1JZDogdGV4dCgnd29ya19pdGVtX2lkJyksXG4gIGZlYXR1cmVJZDogdGV4dCgnZmVhdHVyZV9pZCcpLFxuICBzdGF0dXM6IHRleHQoJ3N0YXR1cycpLm5vdE51bGwoKSwgLy8gJ3F1ZXVlZCcgfCAnZG9uZScgfCAnYmxvY2tlZCdcbiAgZGVwdGg6IGludGVnZXIoJ2RlcHRoJykubm90TnVsbCgpLmRlZmF1bHQoMCksXG4gIG5vdGU6IHRleHQoJ25vdGUnKSxcbn0pO1xuIiwgIi8qKlxuICogUGdFbmdpbmUgXHUyMDE0IGFzeW5jIFBvc3RncmVzIHBvcnQgb2YgdGhlIGluLW1lbW9yeSByZWZlcmVuY2UgZW5naW5lXG4gKiAoQG9haHMvY29yZSBzcmMvZW5naW5lLnRzKS4gU2VtYW50aWNzIGFyZSBhIEZBSVRIRlVMIG1pcnJvciwgbWV0aG9kIGJ5XG4gKiBtZXRob2Q6IHNhbWUgY2hlY2sgb3JkZXJpbmcsIHNhbWUgZXJyb3IgY2xhc3Nlcywgc2FtZSBldmVudCB0eXBlcywgc2FtZVxuICogY29uZm9ybWFuY2UgcGlucyAoc2VlIHBhY2thZ2VzL2NvcmUvdGVzdC9DT05GT1JNQU5DRS5tZCkuIFdoZXJlIHRoZVxuICogcmVmZXJlbmNlIHVzZWQgaW4tcHJvY2VzcyBkYXRhIHN0cnVjdHVyZXMsIHRoaXMgZW5naW5lIHVzZXMgdGhlIERyaXp6bGVcbiAqIHNjaGVtYSBpbiBzY2hlbWEudHMgYW5kIGxldHMgY29uc3RyYWludHMgZG8gdGhlIHJhY2luZyAocm9hZG1hcCBcdTAwQTcxLjNcbiAqIFwicmFjZXMgbG9zZSBieSBjb25zdHJhaW50LCBub3QgYnkgYXBwbGljYXRpb24gbG9naWNcIikuXG4gKlxuICogVGVjaG5pY2FsIG5vdGVzOlxuICogIC0gVGhlIGVuZ2luZSBjbG9jayBpcyB0aGUgSlMgZmllbGQgYG5vd2AgKGFkdmFuY2VDbG9jayBhZGRzIHRvIGl0KTsgbGVhc2VcbiAqICAgIGNvbXBhcmlzb25zIGFsd2F5cyB1c2UgdGhpcy5ub3csIG5ldmVyIFNRTCBub3coKS5cbiAqICAtIEV2ZXJ5IGNvbW1hbmQncyB3cml0ZXMgaGFwcGVuIGluIE9ORSBkYi50cmFuc2FjdGlvbiAoZXZlbnQgYXBwZW5kICtcbiAqICAgIHByb2plY3Rpb24gdXBkYXRlIHRvZ2V0aGVyIFx1MjAxNCByb2FkbWFwIFx1MDBBNzEuNSkuIFRoZSBzaW5nbGUgZGVsaWJlcmF0ZVxuICogICAgZXhjZXB0aW9uOiB0aGUgZmVuY2luZy5yZWplY3RlZCBBVURJVCBldmVudCBjb21taXRzIGluIGl0cyBvd25cbiAqICAgIHRyYW5zYWN0aW9uLCBiZWNhdXNlIHRoZSBjb21tYW5kIGl0IGJlbG9uZ3MgdG8gZmFpbHMgd2l0aCBDb25mbGljdEVycm9yXG4gKiAgICBhbmQgbXVzdCBsZWF2ZSB0aGUgcHJvamVjdGlvbiB1bnRvdWNoZWQgd2hpbGUgdGhlIHJlZnVzYWwgaXMgcmVjb3JkZWRcbiAqICAgIChcdTAwQTcxLjMgXCJhIHN0YWxlIHRva2VuIGdldHMgNDA5IGFuZCBhbiBhdWRpdCBldmVudFwiKS5cbiAqICAtIEFsbCByZXR1cm5lZCB2YWx1ZXMgYXJlIHN0cnVjdHVyZWQtY2xvbmUtYWJsZSBwbGFpbiBvYmplY3RzIChudW1iZXJcbiAqICAgIHRpbWVzdGFtcHMsIG5vIERhdGUsIG5vIHVuZGVmaW5lZCBhcnJheSBob2xlcykgc28gdGhleSBjcm9zcyB0aGVcbiAqICAgIHN5bmNraXQgd29ya2VyIGJvdW5kYXJ5IGludGFjdC5cbiAqL1xuaW1wb3J0IHsgYW5kLCBhc2MsIGVxLCBndCwgbHRlLCBzcWwgfSBmcm9tICdkcml6emxlLW9ybSc7XG5pbXBvcnQgdHlwZSB7IFBnbGl0ZURhdGFiYXNlIH0gZnJvbSAnZHJpenpsZS1vcm0vcGdsaXRlJztcblxuaW1wb3J0IHtcbiAgQUdFTlRfR0FURV9BUFBST1ZFX1BFUk1JU1NJT05TLFxuICBBR0VOVF9KT0JfTUFYX0RFUFRILFxuICBCTE9DS0VEX1JFQVNPTlMsXG4gIENvbmZsaWN0RXJyb3IsXG4gIERFRkFVTFRfUExBTixcbiAgREVMSVZFUllfUk9MRVMsXG4gIEd1YXJkRmFpbGVkRXJyb3IsXG4gIEludmFsaWRUcmFuc2l0aW9uRXJyb3IsXG4gIFBlcm1pc3Npb25EZW5pZWRFcnJvcixcbiAgUEVSU09OQVMsXG4gIFBMQU5fQ0VJTElOR1MsXG4gIFJFVklFV19MT09QX0xJTUlULFxuICBTdG9yaWVzVmFsaWRhdGlvbkVycm9yLFxuICBXT1JLX0lURU1fU1RBVEVTLFxuICBwYXJzZVN0b3JpZXMsXG4gIHR5cGUgQWN0b3IsXG4gIHR5cGUgQWN0b3JUeXBlLFxuICB0eXBlIEFkdmFuY2VJbnB1dCxcbiAgdHlwZSBBZ2VudEpvYixcbiAgdHlwZSBBZ2VudE1lbW9yeSxcbiAgdHlwZSBBdXRoekV4cGxhbmF0aW9uLFxuICB0eXBlIEJsb2NrZWRSZWFzb24sXG4gIHR5cGUgQ2xhaW0sXG4gIHR5cGUgQ3JlYXRlV29ya0l0ZW1JbnB1dCxcbiAgdHlwZSBEaXZlcmdlbmNlUmVwb3J0LFxuICB0eXBlIEV2aWRlbmNlLFxuICB0eXBlIEZlYXR1cmUsXG4gIHR5cGUgR2F0ZUNvZGUsXG4gIHR5cGUgR2F0ZURlY2lzaW9uSW5wdXQsXG4gIHR5cGUgR2F0ZVBvbGljeSxcbiAgdHlwZSBHb3Zlcm5hbmNlUm9sZSxcbiAgdHlwZSBNZW1vcnlLaW5kLFxuICB0eXBlIE1lbnRpb24sXG4gIHR5cGUgTWVudGlvblJlc29sdXRpb24sXG4gIHR5cGUgTWVzc2FnZSxcbiAgdHlwZSBOb3RpZmljYXRpb24sXG4gIHR5cGUgUGVybWlzc2lvbixcbiAgdHlwZSBQbGFuQ29kZSxcbiAgdHlwZSBSb2xlQXNzaWdubWVudCxcbiAgdHlwZSBTcGluZUV2ZW50LFxuICB0eXBlIFN0b3JpZXNJbXBvcnRSZXN1bHQsXG4gIHR5cGUgVGhyZWFkLFxuICB0eXBlIFRocmVhZEtpbmQsXG4gIHR5cGUgVGhyZWFkVmlzaWJpbGl0eSxcbiAgdHlwZSBXb3JrSXRlbSxcbiAgdHlwZSBXb3JrSXRlbUtpbmQsXG4gIHR5cGUgV29ya0l0ZW1TdGF0ZSxcbiAgdHlwZSBXb3Jrc3BhY2VQb2xpY3ksXG59IGZyb20gJ0BvYWhzL2NvcmUnO1xuXG5pbXBvcnQge1xuICBhY3RvcnMsXG4gIGFnZW50Sm9icyxcbiAgYWdlbnRNZW1vcmllcyxcbiAgY2xhaW1zLFxuICBldmlkZW5jZSBhcyBldmlkZW5jZVRhYmxlLFxuICBldmVudHMsXG4gIGZlYXR1cmVzLFxuICBnYXRlRGVjaXNpb25zLFxuICBnYXRlUG9saWNpZXMsXG4gIGdyYW50cyxcbiAgaWRlbXBvdGVuY3lLZXlzLFxuICBtZW50aW9ucyxcbiAgbWVzc2FnZXMsXG4gIG5vdGlmaWNhdGlvbnMsXG4gIHJvbGVBc3NpZ25tZW50cyxcbiAgdGhyZWFkcyxcbiAgd29ya0l0ZW1zLFxuICB3b3Jrc3BhY2VTdGF0ZSxcbn0gZnJvbSAnLi9zY2hlbWEuanMnO1xuXG50eXBlIERiID0gUGdsaXRlRGF0YWJhc2U8UmVjb3JkPHN0cmluZywgdW5rbm93bj4+O1xudHlwZSBUeCA9IFBhcmFtZXRlcnM8UGFyYW1ldGVyczxEYlsndHJhbnNhY3Rpb24nXT5bMF0+WzBdO1xuLyoqIEJvdGggdGhlIHJvb3QgZGF0YWJhc2UgYW5kIGEgdHJhbnNhY3Rpb24gZXhwb3NlIHRoZSBzYW1lIHF1ZXJ5IHN1cmZhY2UuICovXG50eXBlIFF1ZXJ5YWJsZSA9IERiIHwgVHg7XG5cbnR5cGUgV29ya0l0ZW1Sb3cgPSB0eXBlb2Ygd29ya0l0ZW1zLiRpbmZlclNlbGVjdDtcbnR5cGUgQ2xhaW1Sb3cgPSB0eXBlb2YgY2xhaW1zLiRpbmZlclNlbGVjdDtcbnR5cGUgRmVhdHVyZVJvdyA9IHR5cGVvZiBmZWF0dXJlcy4kaW5mZXJTZWxlY3Q7XG50eXBlIEV2ZW50Um93ID0gdHlwZW9mIGV2ZW50cy4kaW5mZXJTZWxlY3Q7XG50eXBlIEFjdG9yUm93ID0gdHlwZW9mIGFjdG9ycy4kaW5mZXJTZWxlY3Q7XG50eXBlIFdvcmtzcGFjZVN0YXRlUm93ID0gdHlwZW9mIHdvcmtzcGFjZVN0YXRlLiRpbmZlclNlbGVjdDtcbnR5cGUgVGhyZWFkUm93ID0gdHlwZW9mIHRocmVhZHMuJGluZmVyU2VsZWN0O1xudHlwZSBNZXNzYWdlUm93ID0gdHlwZW9mIG1lc3NhZ2VzLiRpbmZlclNlbGVjdDtcbnR5cGUgQWdlbnRKb2JSb3cgPSB0eXBlb2YgYWdlbnRKb2JzLiRpbmZlclNlbGVjdDtcbnR5cGUgQWdlbnRNZW1vcnlSb3cgPSB0eXBlb2YgYWdlbnRNZW1vcmllcy4kaW5mZXJTZWxlY3Q7XG5cbi8qKiBUaGUgc2luZ2xlIHdvcmtzcGFjZV9zdGF0ZSByb3cga2V5IChhbmQgdGhlIHdvcmtzcGFjZSBldmVudC1zdHJlYW0gaWQpLiAqL1xuY29uc3QgV09SS1NQQUNFX0lEID0gJ3dvcmtzcGFjZSc7XG5cbmNvbnN0IFJBTks6IFJlY29yZDxXb3JrSXRlbVN0YXRlLCBudW1iZXI+ID0gT2JqZWN0LmZyb21FbnRyaWVzKFxuICBXT1JLX0lURU1fU1RBVEVTLm1hcCgocywgaSkgPT4gW3MsIGldKSxcbikgYXMgUmVjb3JkPFdvcmtJdGVtU3RhdGUsIG51bWJlcj47XG5cbi8qKiBNaXJyb3Igb2YgdGhlIHJlZmVyZW5jZSB0cmFuc2l0aW9uIHRhYmxlIChlbmdpbmUudHMpIFx1MjAxNCBkbyBub3QgZGl2ZXJnZS4gKi9cbmludGVyZmFjZSBUcmFuc2l0aW9uUnVsZSB7XG4gIGZyb206IFdvcmtJdGVtU3RhdGU7XG4gIHRvOiBXb3JrSXRlbVN0YXRlO1xuICBwZXJtaXNzaW9uOiBQZXJtaXNzaW9uO1xuICBjbGFpbVJlcXVpcmVkOiBib29sZWFuO1xuICBndWFyZHM6IEFycmF5PCdkZXBzX2RvbmUnIHwgJ3NwZWNfZ2F0ZV9pZl9jaGVja3BvaW50JyB8ICdub25lbXB0eV9kaWZmJz47XG59XG5cbmNvbnN0IFRSQU5TSVRJT05TOiBUcmFuc2l0aW9uUnVsZVtdID0gW1xuICB7IGZyb206ICdiYWNrbG9nJywgdG86ICdkcmFmdCcsIHBlcm1pc3Npb246ICd0YXNrLnBsYW4nLCBjbGFpbVJlcXVpcmVkOiBmYWxzZSwgZ3VhcmRzOiBbXSB9LFxuICB7XG4gICAgZnJvbTogJ2RyYWZ0JyxcbiAgICB0bzogJ3JlYWR5X2Zvcl9kZXYnLFxuICAgIHBlcm1pc3Npb246ICd0YXNrLnBsYW4nLFxuICAgIGNsYWltUmVxdWlyZWQ6IGZhbHNlLFxuICAgIGd1YXJkczogWydzcGVjX2dhdGVfaWZfY2hlY2twb2ludCddLFxuICB9LFxuICB7XG4gICAgZnJvbTogJ3JlYWR5X2Zvcl9kZXYnLFxuICAgIHRvOiAnaW5fcHJvZ3Jlc3MnLFxuICAgIHBlcm1pc3Npb246ICd0YXNrLmFkdmFuY2UnLFxuICAgIGNsYWltUmVxdWlyZWQ6IHRydWUsXG4gICAgZ3VhcmRzOiBbJ2RlcHNfZG9uZSddLFxuICB9LFxuICB7XG4gICAgZnJvbTogJ2luX3Byb2dyZXNzJyxcbiAgICB0bzogJ2luX3JldmlldycsXG4gICAgcGVybWlzc2lvbjogJ3Rhc2suYWR2YW5jZScsXG4gICAgY2xhaW1SZXF1aXJlZDogdHJ1ZSxcbiAgICBndWFyZHM6IFsnbm9uZW1wdHlfZGlmZiddLFxuICB9LFxuXTtcblxuY29uc3QgTEVHQUNZX1NUQVRVUzogUmVjb3JkPHN0cmluZywgV29ya0l0ZW1TdGF0ZT4gPSB7XG4gIGJhY2tsb2c6ICdiYWNrbG9nJyxcbiAgZHJhZnQ6ICdkcmFmdCcsXG4gICdyZWFkeS1mb3ItZGV2JzogJ3JlYWR5X2Zvcl9kZXYnLFxuICByZWFkeV9mb3JfZGV2OiAncmVhZHlfZm9yX2RldicsXG4gICdpbi1wcm9ncmVzcyc6ICdpbl9wcm9ncmVzcycsXG4gIGluX3Byb2dyZXNzOiAnaW5fcHJvZ3Jlc3MnLFxuICAnaW4tcmV2aWV3JzogJ2luX3JldmlldycsXG4gIGluX3JldmlldzogJ2luX3JldmlldycsXG4gIHJldmlldzogJ2luX3JldmlldycsXG4gIGRvbmU6ICdkb25lJyxcbn07XG5cbi8qKiBQb3N0Z3JlcyB1bmlxdWUtdmlvbGF0aW9uIGRldGVjdG9yICh3YWxrcyBkcml6emxlJ3Mgd3JhcHBlZCBjYXVzZXMpLiAqL1xuZnVuY3Rpb24gaXNVbmlxdWVWaW9sYXRpb24oZXJyb3I6IHVua25vd24pOiBib29sZWFuIHtcbiAgbGV0IGN1cnJlbnQ6IHVua25vd24gPSBlcnJvcjtcbiAgZm9yIChsZXQgZGVwdGggPSAwOyBkZXB0aCA8IDUgJiYgY3VycmVudCAhPT0gbnVsbCAmJiB0eXBlb2YgY3VycmVudCA9PT0gJ29iamVjdCc7IGRlcHRoICs9IDEpIHtcbiAgICBjb25zdCBlcnIgPSBjdXJyZW50IGFzIHsgY29kZT86IHVua25vd247IG1lc3NhZ2U/OiB1bmtub3duOyBjYXVzZT86IHVua25vd24gfTtcbiAgICBpZiAoZXJyLmNvZGUgPT09ICcyMzUwNScpIHJldHVybiB0cnVlO1xuICAgIGlmICh0eXBlb2YgZXJyLm1lc3NhZ2UgPT09ICdzdHJpbmcnICYmIC9kdXBsaWNhdGUga2V5IHZhbHVlIHZpb2xhdGVzIHVuaXF1ZS9pLnRlc3QoZXJyLm1lc3NhZ2UpKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgY3VycmVudCA9IGVyci5jYXVzZTtcbiAgfVxuICByZXR1cm4gZmFsc2U7XG59XG5cbmV4cG9ydCBjbGFzcyBQZ0VuZ2luZSB7XG4gIC8qKiBFbmdpbmUgY2xvY2sgaW4gbXMgXHUyMDE0IHRoZSBPTkxZIHRpbWUgc291cmNlIGZvciBsZWFzZSBsb2dpYy4gKi9cbiAgcHJpdmF0ZSBub3cgPSAwO1xuICBwcml2YXRlIHNlcSA9IDA7XG4gIHByaXZhdGUgc3lzdGVtQWN0b3JJZCA9ICcnO1xuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgcmVhZG9ubHkgZGI6IERiKSB7fVxuXG4gIC8qKlxuICAgKiBQb3N0LXJlc2V0IHNldHVwOiB0aGUgcGVyLXdvcmtzcGFjZSBzeXN0ZW0gYWN0b3IgKHJvYWRtYXAgXHUwMEE3MS4yKS5cbiAgICpcbiAgICogSWRlbXBvdGVudCBmb3IgcGVyc2lzdGVudCBkYXRhYmFzZXMgKHN0b3J5IDEzLCBgb2FocyBzZXJ2ZSAtLWRhdGFgKTogYVxuICAgKiByZXN0YXJ0IG92ZXIgYW4gZXhpc3RpbmcgUEdsaXRlIGRhdGEgZGlyZWN0b3J5IGZpbmRzIHRoZSBzeXN0ZW0gYWN0b3JcbiAgICogYWxyZWFkeSBwcmVzZW50LCByZXVzZXMgaXQsIGFuZCByZWNvdmVycyB0aGUgaWQgY291bnRlciBmcm9tIHRoZSBzdG9yZWRcbiAgICogaWRzIHNvIGZyZXNobHktY3JlYXRlZCBlbnRpdGllcyBuZXZlciBjb2xsaWRlIHdpdGggcGVyc2lzdGVkIG9uZXMuIEFcbiAgICogZnJlc2ggKG9yIHRydW5jYXRlZCkgZGF0YWJhc2UgdGFrZXMgdGhlIG9yaWdpbmFsIHBhdGggdW5jaGFuZ2VkLCBzbyB0aGVcbiAgICogY29uZm9ybWFuY2Ugc3VpdGUgc2VtYW50aWNzIGFyZSB1bnRvdWNoZWQuXG4gICAqL1xuICBhc3luYyBpbml0KCk6IFByb21pc2U8dm9pZD4ge1xuICAgIC8vIFNpbmdsZS1yb3cgcGxhbi9wb2xpY3kgcHJvamVjdGlvbiAoUGhhc2UgMiwgcm9hZG1hcCBcdTAwQTczKS4gb25Db25mbGljdERvTm90aGluZ1xuICAgIC8vIGtlZXBzIHRoaXMgaWRlbXBvdGVudCBmb3IgZHVyYWJsZSByZXN0YXJ0cyBcdTIwMTQgYW4gZXhpc3RpbmcgcGxhbiBzdXJ2aXZlcy5cbiAgICBhd2FpdCB0aGlzLmRiXG4gICAgICAuaW5zZXJ0KHdvcmtzcGFjZVN0YXRlKVxuICAgICAgLnZhbHVlcyh7IGlkOiBXT1JLU1BBQ0VfSUQsIHBsYW46IERFRkFVTFRfUExBTiwgcGxhblZlcnNpb246IDEsIHBvbGljeToge30sIHBvbGljeVZlcnNpb246IDEgfSlcbiAgICAgIC5vbkNvbmZsaWN0RG9Ob3RoaW5nKCk7XG4gICAgY29uc3QgZXhpc3RpbmcgPSBhd2FpdCB0aGlzLmRiXG4gICAgICAuc2VsZWN0KHsgaWQ6IGFjdG9ycy5pZCB9KVxuICAgICAgLmZyb20oYWN0b3JzKVxuICAgICAgLndoZXJlKGVxKGFjdG9ycy50eXBlLCAnc3lzdGVtJykpXG4gICAgICAubGltaXQoMSk7XG4gICAgY29uc3QgZm91bmQgPSBleGlzdGluZ1swXTtcbiAgICBpZiAoZm91bmQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhpcy5zeXN0ZW1BY3RvcklkID0gZm91bmQuaWQ7XG4gICAgICB0aGlzLnNlcSA9IGF3YWl0IHRoaXMucmVjb3ZlclNlcSgpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLnN5c3RlbUFjdG9ySWQgPSB0aGlzLm5leHRJZCgnYWN0b3Itc3lzdGVtJyk7XG4gICAgYXdhaXQgdGhpcy5kYi5pbnNlcnQoYWN0b3JzKS52YWx1ZXMoe1xuICAgICAgaWQ6IHRoaXMuc3lzdGVtQWN0b3JJZCxcbiAgICAgIHR5cGU6ICdzeXN0ZW0nLFxuICAgICAgZGlzcGxheU5hbWU6ICdzeXN0ZW0nLFxuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIExhcmdlc3QgbmV4dElkKCkgc3VmZml4IHN0b3JlZCBpbiBhbnkgdGV4dC1pZCB0YWJsZSBcdTIwMTQgcmVzdGFydC1zYWZlIGlkXG4gICAqIGdlbmVyYXRpb24gZm9yIHBlcnNpc3RlbnQgZGF0YSBkaXJlY3Rvcmllcy4gSWRzIGFyZSBgJHtwcmVmaXh9XyR7YmFzZTM2fWAuXG4gICAqL1xuICBwcml2YXRlIGFzeW5jIHJlY292ZXJTZXEoKTogUHJvbWlzZTxudW1iZXI+IHtcbiAgICBjb25zdCBpZHM6IHN0cmluZ1tdID0gW107XG4gICAgaWRzLnB1c2goLi4uKGF3YWl0IHRoaXMuZGIuc2VsZWN0KHsgaWQ6IGFjdG9ycy5pZCB9KS5mcm9tKGFjdG9ycykpLm1hcCgocikgPT4gci5pZCkpO1xuICAgIGlkcy5wdXNoKC4uLihhd2FpdCB0aGlzLmRiLnNlbGVjdCh7IGlkOiBmZWF0dXJlcy5pZCB9KS5mcm9tKGZlYXR1cmVzKSkubWFwKChyKSA9PiByLmlkKSk7XG4gICAgaWRzLnB1c2goLi4uKGF3YWl0IHRoaXMuZGIuc2VsZWN0KHsgaWQ6IHdvcmtJdGVtcy5pZCB9KS5mcm9tKHdvcmtJdGVtcykpLm1hcCgocikgPT4gci5pZCkpO1xuICAgIGlkcy5wdXNoKC4uLihhd2FpdCB0aGlzLmRiLnNlbGVjdCh7IGlkOiBjbGFpbXMuaWQgfSkuZnJvbShjbGFpbXMpKS5tYXAoKHIpID0+IHIuaWQpKTtcbiAgICAvLyBQaGFzZSAzIChyb2FkbWFwIFx1MDBBNzUpOiB0aHJlYWRzL21lc3NhZ2VzL2pvYnMvbm90aWZpY2F0aW9ucyBhcmUgZHVyYWJsZSB0b28uXG4gICAgaWRzLnB1c2goLi4uKGF3YWl0IHRoaXMuZGIuc2VsZWN0KHsgaWQ6IHRocmVhZHMuaWQgfSkuZnJvbSh0aHJlYWRzKSkubWFwKChyKSA9PiByLmlkKSk7XG4gICAgaWRzLnB1c2goLi4uKGF3YWl0IHRoaXMuZGIuc2VsZWN0KHsgaWQ6IG1lc3NhZ2VzLmlkIH0pLmZyb20obWVzc2FnZXMpKS5tYXAoKHIpID0+IHIuaWQpKTtcbiAgICBpZHMucHVzaCguLi4oYXdhaXQgdGhpcy5kYi5zZWxlY3QoeyBpZDogYWdlbnRKb2JzLmlkIH0pLmZyb20oYWdlbnRKb2JzKSkubWFwKChyKSA9PiByLmlkKSk7XG4gICAgaWRzLnB1c2goLi4uKGF3YWl0IHRoaXMuZGIuc2VsZWN0KHsgaWQ6IG5vdGlmaWNhdGlvbnMuaWQgfSkuZnJvbShub3RpZmljYXRpb25zKSkubWFwKChyKSA9PiByLmlkKSk7XG4gICAgLy8gUGhhc2UgNSAocm9hZG1hcCBcdTAwQTc2KTogbWVtb3J5IGlkcyAobWVtXyopIGFyZSBkdXJhYmxlIHRvby5cbiAgICBpZHMucHVzaCguLi4oYXdhaXQgdGhpcy5kYi5zZWxlY3QoeyBpZDogYWdlbnRNZW1vcmllcy5pZCB9KS5mcm9tKGFnZW50TWVtb3JpZXMpKS5tYXAoKHIpID0+IHIuaWQpKTtcbiAgICBsZXQgbWF4ID0gMDtcbiAgICBmb3IgKGNvbnN0IGlkIG9mIGlkcykge1xuICAgICAgY29uc3Qgc2VwID0gaWQubGFzdEluZGV4T2YoJ18nKTtcbiAgICAgIGlmIChzZXAgPCAwKSBjb250aW51ZTtcbiAgICAgIGNvbnN0IG4gPSBOdW1iZXIucGFyc2VJbnQoaWQuc2xpY2Uoc2VwICsgMSksIDM2KTtcbiAgICAgIGlmIChOdW1iZXIuaXNGaW5pdGUobikgJiYgbiA+IG1heCkgbWF4ID0gbjtcbiAgICB9XG4gICAgcmV0dXJuIG1heDtcbiAgfVxuXG4gIC8vIC0tIGluZnJhc3RydWN0dXJlIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgcHJpdmF0ZSBuZXh0SWQocHJlZml4OiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIHRoaXMuc2VxICs9IDE7XG4gICAgcmV0dXJuIGAke3ByZWZpeH1fJHt0aGlzLnNlcS50b1N0cmluZygzNikucGFkU3RhcnQoNiwgJzAnKX1gO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBhcHBlbmRUeChcbiAgICB0eDogUXVlcnlhYmxlLFxuICAgIHN0cmVhbVR5cGU6IFNwaW5lRXZlbnRbJ3N0cmVhbVR5cGUnXSxcbiAgICBzdHJlYW1JZDogc3RyaW5nLFxuICAgIHR5cGU6IHN0cmluZyxcbiAgICBhY3RvcklkOiBzdHJpbmcsXG4gICAgcGF5bG9hZDogUmVjb3JkPHN0cmluZywgdW5rbm93bj4sXG4gICAgZXh0cmE/OiB7IGNhdXNhdGlvbklkPzogc3RyaW5nOyBpZGVtcG90ZW5jeUtleT86IHN0cmluZyB9LFxuICApOiBQcm9taXNlPFNwaW5lRXZlbnQ+IHtcbiAgICAvLyBzdHJlYW1fc2VxIGlzIDEtYmFzZWQgYW5kIGdhcC1mcmVlIHBlciBzdHJlYW0gKFx1MDBBNzEuNSk7IGNvbXB1dGVkIGluIHRoZVxuICAgIC8vIHNhbWUgdHJhbnNhY3Rpb24gYXMgdGhlIHByb2plY3Rpb24gdXBkYXRlLCBzbyBVTklRVUUoc3RyZWFtX2lkLFxuICAgIC8vIHN0cmVhbV9zZXEpIGRvdWJsZXMgYXMgdGhlIG9wdGltaXN0aWMgbG9jay5cbiAgICBjb25zdCBbcm93XSA9IGF3YWl0IHR4XG4gICAgICAuc2VsZWN0KHsgbWF4U2VxOiBzcWw8bnVtYmVyPmBjb2FsZXNjZShtYXgoJHtldmVudHMuc3RyZWFtU2VxfSksIDApYCB9KVxuICAgICAgLmZyb20oZXZlbnRzKVxuICAgICAgLndoZXJlKGVxKGV2ZW50cy5zdHJlYW1JZCwgc3RyZWFtSWQpKTtcbiAgICBjb25zdCBzdHJlYW1TZXEgPSBOdW1iZXIocm93Py5tYXhTZXEgPz8gMCkgKyAxO1xuICAgIGNvbnN0IGluc2VydGVkID0gYXdhaXQgdHhcbiAgICAgIC5pbnNlcnQoZXZlbnRzKVxuICAgICAgLnZhbHVlcyh7XG4gICAgICAgIHN0cmVhbVR5cGUsXG4gICAgICAgIHN0cmVhbUlkLFxuICAgICAgICBzdHJlYW1TZXEsXG4gICAgICAgIHR5cGUsXG4gICAgICAgIGFjdG9ySWQsXG4gICAgICAgIHBheWxvYWQsXG4gICAgICAgIGNhdXNhdGlvbklkOiBleHRyYT8uY2F1c2F0aW9uSWQgPz8gbnVsbCxcbiAgICAgICAgaWRlbXBvdGVuY3lLZXk6IGV4dHJhPy5pZGVtcG90ZW5jeUtleSA/PyBudWxsLFxuICAgICAgfSlcbiAgICAgIC5yZXR1cm5pbmcoeyBnbG9iYWxTZXE6IGV2ZW50cy5nbG9iYWxTZXEgfSk7XG4gICAgY29uc3QgZ2xvYmFsU2VxID0gaW5zZXJ0ZWRbMF0/Lmdsb2JhbFNlcTtcbiAgICBpZiAoZ2xvYmFsU2VxID09PSB1bmRlZmluZWQpIHRocm93IG5ldyBFcnJvcignZXZlbnQgaW5zZXJ0IHJldHVybmVkIG5vIGdsb2JhbF9zZXEnKTtcbiAgICByZXR1cm4ge1xuICAgICAgZ2xvYmFsU2VxLFxuICAgICAgc3RyZWFtVHlwZSxcbiAgICAgIHN0cmVhbUlkLFxuICAgICAgc3RyZWFtU2VxLFxuICAgICAgdHlwZSxcbiAgICAgIGFjdG9ySWQsXG4gICAgICBwYXlsb2FkLFxuICAgICAgLi4uKGV4dHJhPy5jYXVzYXRpb25JZCAhPT0gdW5kZWZpbmVkID8geyBjYXVzYXRpb25JZDogZXh0cmEuY2F1c2F0aW9uSWQgfSA6IHt9KSxcbiAgICB9O1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBtdXN0R2V0SXRlbSh3b3JrSXRlbUlkOiBzdHJpbmcpOiBQcm9taXNlPFdvcmtJdGVtUm93PiB7XG4gICAgY29uc3QgYnlJZCA9IGF3YWl0IHRoaXMuZGIuc2VsZWN0KCkuZnJvbSh3b3JrSXRlbXMpLndoZXJlKGVxKHdvcmtJdGVtcy5pZCwgd29ya0l0ZW1JZCkpLmxpbWl0KDEpO1xuICAgIGlmIChieUlkWzBdKSByZXR1cm4gYnlJZFswXTtcbiAgICAvLyBJbXBvcnRlZCBzdG9yaWVzIGFyZSBhZGRyZXNzZWQgYnkgdGhlaXIgZXh0ZXJuYWxLZXkgaGFuZGxlOyBmaXJzdFxuICAgIC8vIHdyaXRlciB3aW5zIFx1MjAxNCB0aGUgZWFybGllc3QtY3JlYXRlZCByb3cgcmVzb2x2ZXMgKGNvbmZvcm1hbmNlIHBpbiBpblxuICAgIC8vIHN0b3JpZXMtaW1wb3J0LnRlc3QudHMsIG1pcnJvcmVkIGZyb20gdGhlIHJlZmVyZW5jZSBleHRlcm5hbEtleUluZGV4KS5cbiAgICBjb25zdCBieUtleSA9IGF3YWl0IHRoaXMuZGJcbiAgICAgIC5zZWxlY3QoKVxuICAgICAgLmZyb20od29ya0l0ZW1zKVxuICAgICAgLndoZXJlKGVxKHdvcmtJdGVtcy5leHRlcm5hbEtleSwgd29ya0l0ZW1JZCkpXG4gICAgICAub3JkZXJCeShhc2Mod29ya0l0ZW1zLnNlcSkpXG4gICAgICAubGltaXQoMSk7XG4gICAgaWYgKGJ5S2V5WzBdKSByZXR1cm4gYnlLZXlbMF07XG4gICAgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoYHVua25vd24gd29yayBpdGVtOiAke3dvcmtJdGVtSWR9YCk7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIGdldEZlYXR1cmVSb3coZmVhdHVyZUlkOiBzdHJpbmcsIHR4OiBRdWVyeWFibGUgPSB0aGlzLmRiKTogUHJvbWlzZTxGZWF0dXJlUm93IHwgbnVsbD4ge1xuICAgIGNvbnN0IHJvd3MgPSBhd2FpdCB0eC5zZWxlY3QoKS5mcm9tKGZlYXR1cmVzKS53aGVyZShlcShmZWF0dXJlcy5pZCwgZmVhdHVyZUlkKSkubGltaXQoMSk7XG4gICAgcmV0dXJuIHJvd3NbMF0gPz8gbnVsbDtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgZ2V0QWN0b3JSb3coYWN0b3JJZDogc3RyaW5nLCB0eDogUXVlcnlhYmxlID0gdGhpcy5kYik6IFByb21pc2U8QWN0b3JSb3cgfCBudWxsPiB7XG4gICAgY29uc3Qgcm93cyA9IGF3YWl0IHR4LnNlbGVjdCgpLmZyb20oYWN0b3JzKS53aGVyZShlcShhY3RvcnMuaWQsIGFjdG9ySWQpKS5saW1pdCgxKTtcbiAgICByZXR1cm4gcm93c1swXSA/PyBudWxsO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyB3b3Jrc3BhY2VSb3codHg6IFF1ZXJ5YWJsZSA9IHRoaXMuZGIpOiBQcm9taXNlPFdvcmtzcGFjZVN0YXRlUm93PiB7XG4gICAgY29uc3Qgcm93cyA9IGF3YWl0IHR4LnNlbGVjdCgpLmZyb20od29ya3NwYWNlU3RhdGUpLndoZXJlKGVxKHdvcmtzcGFjZVN0YXRlLmlkLCBXT1JLU1BBQ0VfSUQpKS5saW1pdCgxKTtcbiAgICBjb25zdCByb3cgPSByb3dzWzBdO1xuICAgIGlmIChyb3cpIHJldHVybiByb3c7XG4gICAgLy8gaW5pdCgpIHNlZWRzIHRoZSByb3c7IHRoaXMgZGVmYXVsdCBvbmx5IGd1YXJkcyBhIG5vdC15ZXQtaW5pdGlhbGl6ZWQgcmVhZC5cbiAgICByZXR1cm4geyBpZDogV09SS1NQQUNFX0lELCBwbGFuOiBERUZBVUxUX1BMQU4sIHBsYW5WZXJzaW9uOiAxLCBwb2xpY3k6IHt9LCBwb2xpY3lWZXJzaW9uOiAxIH07XG4gIH1cblxuICAvKipcbiAgICogRW50aXRsZW1lbnQgcmVzb2x1dGlvbiBcdTIwMTQgYSBQVVJFIGZ1bmN0aW9uIG92ZXIgcGxhbiBcdTAwRDcgZ292ZXJuYW5jZSBcdTAwRDdcbiAgICogZGVsaXZlcnktcm9sZSBkYXRhIChyb2FkbWFwIFx1MDBBNzMpLCBtaXJyb3JpbmcgdGhlIHJlZmVyZW5jZSBlbmdpbmUuIEEgZ3JhbnRcbiAgICogbWF5IEVYSVNUIChkaXJlY3Qgb3IgdmlhIGEgcm9sZSkgYW5kIHN0aWxsIG5vdCBSRVNPTFZFIGZvciBhbiBhZ2VudCB3aGVuXG4gICAqIHRoZSBwbGFuIGNlaWxpbmcgb3IgdGhlIHJlc3RyaWN0LW9ubHkgd29ya3NwYWNlIHBvbGljeSBuYXJyb3dzIGl0LiBVc2Vyc1xuICAgKiBhcmUgbmV2ZXIgcGxhbi1maWx0ZXJlZC5cbiAgICovXG4gIHByaXZhdGUgYXN5bmMgZ3JhbnRTb3VyY2UoYWN0b3JJZDogc3RyaW5nLCBwZXJtaXNzaW9uOiBQZXJtaXNzaW9uKTogUHJvbWlzZTxzdHJpbmcgfCBudWxsPiB7XG4gICAgY29uc3QgZGlyZWN0ID0gYXdhaXQgdGhpcy5kYlxuICAgICAgLnNlbGVjdCh7IHBlcm1pc3Npb246IGdyYW50cy5wZXJtaXNzaW9uIH0pXG4gICAgICAuZnJvbShncmFudHMpXG4gICAgICAud2hlcmUoYW5kKGVxKGdyYW50cy5hY3RvcklkLCBhY3RvcklkKSwgZXEoZ3JhbnRzLnBlcm1pc3Npb24sIHBlcm1pc3Npb24pKSlcbiAgICAgIC5saW1pdCgxKTtcbiAgICBpZiAoZGlyZWN0Lmxlbmd0aCA+IDApIHJldHVybiAnZGlyZWN0JztcbiAgICBjb25zdCBhc3NpZ25tZW50cyA9IGF3YWl0IHRoaXMuZGJcbiAgICAgIC5zZWxlY3QoKVxuICAgICAgLmZyb20ocm9sZUFzc2lnbm1lbnRzKVxuICAgICAgLndoZXJlKGFuZChlcShyb2xlQXNzaWdubWVudHMuYWN0b3JJZCwgYWN0b3JJZCksIGVxKHJvbGVBc3NpZ25tZW50cy5yZXZva2VkLCBmYWxzZSkpKVxuICAgICAgLm9yZGVyQnkoYXNjKHJvbGVBc3NpZ25tZW50cy5zZXEpKTtcbiAgICBmb3IgKGNvbnN0IGFzc2lnbm1lbnQgb2YgYXNzaWdubWVudHMpIHtcbiAgICAgIGlmICgoREVMSVZFUllfUk9MRVNbYXNzaWdubWVudC5yb2xlQ29kZV0gPz8gW10pLmluY2x1ZGVzKHBlcm1pc3Npb24pKSB7XG4gICAgICAgIHJldHVybiBgcm9sZToke2Fzc2lnbm1lbnQucm9sZUNvZGV9YDtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICBwcml2YXRlIGFnZW50Q2VpbGluZ0FsbG93cyhcbiAgICBhY3RvcjogQWN0b3JSb3cgfCBudWxsLFxuICAgIHBlcm1pc3Npb246IFBlcm1pc3Npb24sXG4gICAgd29ya3NwYWNlOiBXb3Jrc3BhY2VTdGF0ZVJvdyxcbiAgKTogeyBwbGFuOiBib29sZWFuOyBwb2xpY3k6IGJvb2xlYW4gfSB7XG4gICAgaWYgKCFhY3RvciB8fCBhY3Rvci50eXBlICE9PSAnYWdlbnQnKSByZXR1cm4geyBwbGFuOiB0cnVlLCBwb2xpY3k6IHRydWUgfTtcbiAgICBjb25zdCBjZWlsaW5nID0gUExBTl9DRUlMSU5HU1t3b3Jrc3BhY2UucGxhbiBhcyBQbGFuQ29kZV07XG4gICAgY29uc3QgcG9saWN5ID0gd29ya3NwYWNlLnBvbGljeSBhcyBXb3Jrc3BhY2VQb2xpY3k7XG4gICAgaWYgKChBR0VOVF9HQVRFX0FQUFJPVkVfUEVSTUlTU0lPTlMgYXMgcmVhZG9ubHkgc3RyaW5nW10pLmluY2x1ZGVzKHBlcm1pc3Npb24pKSB7XG4gICAgICByZXR1cm4geyBwbGFuOiBjZWlsaW5nLmFnZW50R2F0ZUFwcHJvdmUsIHBvbGljeTogcG9saWN5LmFnZW50R2F0ZUFwcHJvdmFscyAhPT0gZmFsc2UgfTtcbiAgICB9XG4gICAgaWYgKHBlcm1pc3Npb24gPT09ICdnYXRlLnJldmlldy5yZWplY3QnKSB7XG4gICAgICByZXR1cm4geyBwbGFuOiBjZWlsaW5nLmFnZW50R2F0ZVJlamVjdCwgcG9saWN5OiB0cnVlIH07XG4gICAgfVxuICAgIGlmIChwZXJtaXNzaW9uID09PSAndGFzay5jbGFpbScpIHtcbiAgICAgIHJldHVybiB7IHBsYW46IHRydWUsIHBvbGljeTogcG9saWN5LmFnZW50U2VsZkRpc3BhdGNoICE9PSBmYWxzZSB9O1xuICAgIH1cbiAgICByZXR1cm4geyBwbGFuOiB0cnVlLCBwb2xpY3k6IHRydWUgfTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgaGFzUGVybWlzc2lvbihhY3RvcklkOiBzdHJpbmcsIHBlcm1pc3Npb246IFBlcm1pc3Npb24pOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICBpZiAoKGF3YWl0IHRoaXMuZ3JhbnRTb3VyY2UoYWN0b3JJZCwgcGVybWlzc2lvbikpID09PSBudWxsKSByZXR1cm4gZmFsc2U7XG4gICAgY29uc3QgYWxsb3dzID0gdGhpcy5hZ2VudENlaWxpbmdBbGxvd3MoYXdhaXQgdGhpcy5nZXRBY3RvclJvdyhhY3RvcklkKSwgcGVybWlzc2lvbiwgYXdhaXQgdGhpcy53b3Jrc3BhY2VSb3coKSk7XG4gICAgcmV0dXJuIGFsbG93cy5wbGFuICYmIGFsbG93cy5wb2xpY3k7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIHJlcXVpcmVQZXJtaXNzaW9uKGFjdG9ySWQ6IHN0cmluZywgcGVybWlzc2lvbjogUGVybWlzc2lvbik6IFByb21pc2U8dm9pZD4ge1xuICAgIGlmICghKGF3YWl0IHRoaXMuaGFzUGVybWlzc2lvbihhY3RvcklkLCBwZXJtaXNzaW9uKSkpIHtcbiAgICAgIHRocm93IG5ldyBQZXJtaXNzaW9uRGVuaWVkRXJyb3IocGVybWlzc2lvbiwgYWN0b3JJZCk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyByZXF1aXJlR292ZXJuYW5jZUFkbWluKGJ5QWN0b3JJZDogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgaWYgKGJ5QWN0b3JJZCA9PT0gdGhpcy5zeXN0ZW1BY3RvcklkKSByZXR1cm47XG4gICAgY29uc3QgYWN0b3IgPSBhd2FpdCB0aGlzLmdldEFjdG9yUm93KGJ5QWN0b3JJZCk7XG4gICAgaWYgKGFjdG9yPy5nb3Zlcm5hbmNlUm9sZSA9PT0gJ2FkbWluJykgcmV0dXJuO1xuICAgIHRocm93IG5ldyBQZXJtaXNzaW9uRGVuaWVkRXJyb3IoJ2dvdmVybmFuY2UuYWRtaW4nLCBieUFjdG9ySWQpO1xuICB9XG5cbiAgLyoqIEdyYW50LXRpbWUgcGxhbiBjZWlsaW5nOiByZWZ1c2UgaXNzdWluZyBhZ2VudCBnYXRlIHBlcm1pc3Npb25zIHRoZSBwbGFuIGZvcmJpZHMuICovXG4gIHByaXZhdGUgYXN5bmMgY2hlY2tHcmFudENlaWxpbmcoYWN0b3JJZDogc3RyaW5nLCBwZXJtaXNzaW9uOiBQZXJtaXNzaW9uKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgYWN0b3IgPSBhd2FpdCB0aGlzLmdldEFjdG9yUm93KGFjdG9ySWQpO1xuICAgIGlmICghYWN0b3IgfHwgYWN0b3IudHlwZSAhPT0gJ2FnZW50JykgcmV0dXJuO1xuICAgIGNvbnN0IHdvcmtzcGFjZSA9IGF3YWl0IHRoaXMud29ya3NwYWNlUm93KCk7XG4gICAgY29uc3QgY2VpbGluZyA9IFBMQU5fQ0VJTElOR1Nbd29ya3NwYWNlLnBsYW4gYXMgUGxhbkNvZGVdO1xuICAgIGlmICgoQUdFTlRfR0FURV9BUFBST1ZFX1BFUk1JU1NJT05TIGFzIHJlYWRvbmx5IHN0cmluZ1tdKS5pbmNsdWRlcyhwZXJtaXNzaW9uKSAmJiAhY2VpbGluZy5hZ2VudEdhdGVBcHByb3ZlKSB7XG4gICAgICB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcihgcGxhbiAke3dvcmtzcGFjZS5wbGFufSBkb2VzIG5vdCBhbGxvdyBhZ2VudHMgdG8gaG9sZCAke3Blcm1pc3Npb259YCk7XG4gICAgfVxuICAgIGlmIChwZXJtaXNzaW9uID09PSAnZ2F0ZS5yZXZpZXcucmVqZWN0JyAmJiAhY2VpbGluZy5hZ2VudEdhdGVSZWplY3QpIHtcbiAgICAgIHRocm93IG5ldyBHdWFyZEZhaWxlZEVycm9yKGBwbGFuICR7d29ya3NwYWNlLnBsYW59IGRvZXMgbm90IGFsbG93IGFnZW50cyB0byBob2xkICR7cGVybWlzc2lvbn1gKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIGxpdmVDbGFpbSh3b3JrSXRlbUlkOiBzdHJpbmcpOiBQcm9taXNlPENsYWltUm93IHwgbnVsbD4ge1xuICAgIGNvbnN0IHJvd3MgPSBhd2FpdCB0aGlzLmRiXG4gICAgICAuc2VsZWN0KClcbiAgICAgIC5mcm9tKGNsYWltcylcbiAgICAgIC53aGVyZShcbiAgICAgICAgYW5kKFxuICAgICAgICAgIGVxKGNsYWltcy53b3JrSXRlbUlkLCB3b3JrSXRlbUlkKSxcbiAgICAgICAgICBlcShjbGFpbXMucmVsZWFzZWQsIGZhbHNlKSxcbiAgICAgICAgICBndChjbGFpbXMubGVhc2VFeHBpcmVzQXQsIHRoaXMubm93KSxcbiAgICAgICAgKSxcbiAgICAgIClcbiAgICAgIC5vcmRlckJ5KGFzYyhjbGFpbXMuc2VxKSlcbiAgICAgIC5saW1pdCgxKTtcbiAgICByZXR1cm4gcm93c1swXSA/PyBudWxsO1xuICB9XG5cbiAgLyoqXG4gICAqIEEgUFJFU0VOVEVEIHRva2VuIGlzIGFsd2F5cyB2YWxpZGF0ZWQsIG9uIGV2ZXJ5IGNvbW1hbmQgKGNvbmZvcm1hbmNlXG4gICAqIHBpbiwgY2xhaW1zLnRlc3QudHMpOiBzdGFsZS9mb3JlaWduL25vLWxpdmUtY2xhaW0gXHUyMTkyIENvbmZsaWN0RXJyb3IgKyBhdWRpdFxuICAgKiBldmVudC4gVGhlIGF1ZGl0IGV2ZW50IGNvbW1pdHMgaW4gaXRzIE9XTiB0cmFuc2FjdGlvbiBcdTIwMTQgdGhlIGZhaWxpbmdcbiAgICogY29tbWFuZCdzIHRyYW5zYWN0aW9uIChpZiBhbnkpIG11c3Qgbm90IHN3YWxsb3cgaXQuXG4gICAqL1xuICBwcml2YXRlIGFzeW5jIHZhbGlkYXRlUHJlc2VudGVkVG9rZW4oXG4gICAgaXRlbTogV29ya0l0ZW1Sb3csXG4gICAgZmVuY2luZ1Rva2VuOiBudW1iZXIgfCB1bmRlZmluZWQsXG4gICAgYWN0b3JJZDogc3RyaW5nLFxuICApOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBpZiAoZmVuY2luZ1Rva2VuID09PSB1bmRlZmluZWQpIHJldHVybjtcbiAgICBjb25zdCBsaXZlID0gYXdhaXQgdGhpcy5saXZlQ2xhaW0oaXRlbS5pZCk7XG4gICAgaWYgKGxpdmUgPT09IG51bGwgfHwgbGl2ZS5mZW5jaW5nVG9rZW4gIT09IGZlbmNpbmdUb2tlbikge1xuICAgICAgYXdhaXQgdGhpcy5kYi50cmFuc2FjdGlvbihhc3luYyAodHgpID0+IHtcbiAgICAgICAgYXdhaXQgdGhpcy5hcHBlbmRUeCh0eCwgJ3dvcmtfaXRlbScsIGl0ZW0uaWQsICdmZW5jaW5nLnJlamVjdGVkJywgYWN0b3JJZCwge1xuICAgICAgICAgIHByZXNlbnRlZFRva2VuOiBmZW5jaW5nVG9rZW4sXG4gICAgICAgICAgbGl2ZVRva2VuOiBsaXZlPy5mZW5jaW5nVG9rZW4gPz8gbnVsbCxcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICAgIHRocm93IG5ldyBDb25mbGljdEVycm9yKGBzdGFsZSBvciBmb3JlaWduIGZlbmNpbmcgdG9rZW4gZm9yIHdvcmsgaXRlbSAke2l0ZW0uaWR9YCk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBwdWJsaWNJdGVtKHJvdzogV29ya0l0ZW1Sb3cpOiBXb3JrSXRlbSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGlkOiByb3cuaWQsXG4gICAgICBmZWF0dXJlSWQ6IHJvdy5mZWF0dXJlSWQsXG4gICAgICBleHRlcm5hbEtleTogcm93LmV4dGVybmFsS2V5LFxuICAgICAga2luZDogcm93LmtpbmQgYXMgV29ya0l0ZW1LaW5kLFxuICAgICAgdGl0bGU6IHJvdy50aXRsZSxcbiAgICAgIHN0YXRlOiByb3cuc3RhdGUgYXMgV29ya0l0ZW1TdGF0ZSxcbiAgICAgIGJsb2NrZWRSZWFzb246IChyb3cuYmxvY2tlZFJlYXNvbiBhcyBCbG9ja2VkUmVhc29uIHwgbnVsbCkgPz8gbnVsbCxcbiAgICAgIHJldmlld0xvb3BJdGVyYXRpb246IHJvdy5yZXZpZXdMb29wSXRlcmF0aW9uLFxuICAgICAgaW50ZW50SGFzaDogcm93LmludGVudEhhc2gsXG4gICAgICBwaW5uZWRWZXJpZmljYXRpb246IHJvdy5waW5uZWRWZXJpZmljYXRpb24gPyBbLi4ucm93LnBpbm5lZFZlcmlmaWNhdGlvbl0gOiBudWxsLFxuICAgICAgc3BlY0NoZWNrcG9pbnQ6IHJvdy5zcGVjQ2hlY2twb2ludCxcbiAgICAgIGRvbmVDaGVja3BvaW50OiByb3cuZG9uZUNoZWNrcG9pbnQsXG4gICAgICBpbnZva2VEZXZXaXRoOiByb3cuaW52b2tlRGV2V2l0aCxcbiAgICAgIHNwZWNQYXRoOiByb3cuc3BlY1BhdGgsXG4gICAgICBzdGF0ZVZlcnNpb246IHJvdy5zdGF0ZVZlcnNpb24sXG4gICAgfTtcbiAgfVxuXG4gIHByaXZhdGUgcHVibGljRmVhdHVyZShyb3c6IEZlYXR1cmVSb3cpOiBGZWF0dXJlIHtcbiAgICByZXR1cm4ge1xuICAgICAgaWQ6IHJvdy5pZCxcbiAgICAgIHN0YXRlOiByb3cuc3RhdGUgYXMgRmVhdHVyZVsnc3RhdGUnXSxcbiAgICAgIGRpc3BhdGNoSG9sZDogcm93LmRpc3BhdGNoSG9sZCxcbiAgICB9O1xuICB9XG5cbiAgcHJpdmF0ZSBwdWJsaWNDbGFpbShyb3c6IENsYWltUm93KTogQ2xhaW0ge1xuICAgIHJldHVybiB7XG4gICAgICBpZDogcm93LmlkLFxuICAgICAgd29ya0l0ZW1JZDogcm93LndvcmtJdGVtSWQsXG4gICAgICBhY3RvcklkOiByb3cuYWN0b3JJZCxcbiAgICAgIGZlbmNpbmdUb2tlbjogcm93LmZlbmNpbmdUb2tlbixcbiAgICAgIGxlYXNlRXhwaXJlc0F0OiByb3cubGVhc2VFeHBpcmVzQXQsXG4gICAgICByZWxlYXNlZDogcm93LnJlbGVhc2VkLFxuICAgIH07XG4gIH1cblxuICBwcml2YXRlIGV2ZW50RnJvbVJvdyhyb3c6IEV2ZW50Um93KTogU3BpbmVFdmVudCB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGdsb2JhbFNlcTogcm93Lmdsb2JhbFNlcSxcbiAgICAgIHN0cmVhbVR5cGU6IHJvdy5zdHJlYW1UeXBlIGFzIFNwaW5lRXZlbnRbJ3N0cmVhbVR5cGUnXSxcbiAgICAgIHN0cmVhbUlkOiByb3cuc3RyZWFtSWQsXG4gICAgICBzdHJlYW1TZXE6IHJvdy5zdHJlYW1TZXEsXG4gICAgICB0eXBlOiByb3cudHlwZSxcbiAgICAgIGFjdG9ySWQ6IHJvdy5hY3RvcklkLFxuICAgICAgcGF5bG9hZDogcm93LnBheWxvYWQsXG4gICAgICAuLi4ocm93LmNhdXNhdGlvbklkICE9PSBudWxsID8geyBjYXVzYXRpb25JZDogcm93LmNhdXNhdGlvbklkIH0gOiB7fSksXG4gICAgfTtcbiAgfVxuXG4gIC8vIC0tIHNldHVwIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgYXN5bmMgY3JlYXRlQWN0b3IoaW5wdXQ6IHtcbiAgICB0eXBlOiBFeGNsdWRlPEFjdG9yVHlwZSwgJ3N5c3RlbSc+O1xuICAgIGRpc3BsYXlOYW1lOiBzdHJpbmc7XG4gICAgZ292ZXJuYW5jZVJvbGU/OiBHb3Zlcm5hbmNlUm9sZTtcbiAgICBwZXJzb25hQ29kZT86IHN0cmluZztcbiAgfSk6IFByb21pc2U8QWN0b3I+IHtcbiAgICBjb25zdCBhY3RvcjogQWN0b3IgPSB7XG4gICAgICBpZDogdGhpcy5uZXh0SWQoJ2FjdG9yJyksXG4gICAgICB0eXBlOiBpbnB1dC50eXBlLFxuICAgICAgZGlzcGxheU5hbWU6IGlucHV0LmRpc3BsYXlOYW1lLFxuICAgICAgcGVyc29uYUNvZGU6IGlucHV0LnBlcnNvbmFDb2RlID8/IG51bGwsXG4gICAgfTtcbiAgICBhd2FpdCB0aGlzLmRiLmluc2VydChhY3RvcnMpLnZhbHVlcyh7XG4gICAgICBpZDogYWN0b3IuaWQsXG4gICAgICB0eXBlOiBhY3Rvci50eXBlLFxuICAgICAgZGlzcGxheU5hbWU6IGFjdG9yLmRpc3BsYXlOYW1lLFxuICAgICAgZ292ZXJuYW5jZVJvbGU6IGlucHV0LmdvdmVybmFuY2VSb2xlID8/ICdtZW1iZXInLFxuICAgICAgcGVyc29uYUNvZGU6IGFjdG9yLnBlcnNvbmFDb2RlLFxuICAgIH0pO1xuICAgIHJldHVybiBhY3RvcjtcbiAgfVxuXG4gIHByaXZhdGUgcHVibGljQWN0b3Iocm93OiBBY3RvclJvdyk6IEFjdG9yIHtcbiAgICByZXR1cm4ge1xuICAgICAgaWQ6IHJvdy5pZCxcbiAgICAgIHR5cGU6IHJvdy50eXBlIGFzIEFjdG9yVHlwZSxcbiAgICAgIGRpc3BsYXlOYW1lOiByb3cuZGlzcGxheU5hbWUsXG4gICAgICBwZXJzb25hQ29kZTogcm93LnBlcnNvbmFDb2RlID8/IG51bGwsXG4gICAgfTtcbiAgfVxuXG4gIC8qKiBBbGwgYWN0b3JzLCBwZXJzb25hcyBhbmQgc3lzdGVtIGluY2x1ZGVkICh0cmFuc3BhcmVuY3kgZm9yIHBpY2tlcnMvYXVkaXQpLiAqL1xuICBhc3luYyBsaXN0QWN0b3JzKCk6IFByb21pc2U8QWN0b3JbXT4ge1xuICAgIGNvbnN0IHJvd3MgPSBhd2FpdCB0aGlzLmRiLnNlbGVjdCgpLmZyb20oYWN0b3JzKS5vcmRlckJ5KGFzYyhhY3RvcnMuaWQpKTtcbiAgICByZXR1cm4gcm93cy5tYXAoKHJvdykgPT4gdGhpcy5wdWJsaWNBY3Rvcihyb3cpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBJZGVtcG90ZW50bHkgY3JlYXRlIHRoZSBzaXggQk1BRCBwZXJzb25hIGFnZW50IGFjdG9ycyB3aXRoIGZsb29yLXN0YXRlXG4gICAqIHJvbGVzIChQaGFzZSA0LCByb2FkbWFwIFx1MDBBNzMpLiBHYXRlZCB3cml0ZS4gSWRlbXBvdGVuY3kgaXMgRFVSQUJMRTogdGhlXG4gICAqIGxvb2t1cCBrZXlzIG9uIHRoZSBwZXJzaXN0ZWQgcGVyc29uYV9jb2RlIGNvbHVtbiwgc28gYSByZXN0YXJ0IG92ZXIgYW5cbiAgICogZXhpc3RpbmcgZGF0YSBkaXJlY3RvcnkgcmUtcHJvdmlzaW9ucyBub3RoaW5nLlxuICAgKi9cbiAgYXN5bmMgcHJvdmlzaW9uUGVyc29uYXMoaW5wdXQ6IHsgYnlBY3RvcklkOiBzdHJpbmcgfSk6IFByb21pc2U8QWN0b3JbXT4ge1xuICAgIGF3YWl0IHRoaXMucmVxdWlyZUdvdmVybmFuY2VBZG1pbihpbnB1dC5ieUFjdG9ySWQpO1xuICAgIGNvbnN0IHByb3Zpc2lvbmVkOiBBY3RvcltdID0gW107XG4gICAgZm9yIChjb25zdCBwZXJzb25hIG9mIFBFUlNPTkFTKSB7XG4gICAgICBjb25zdCBleGlzdGluZyA9IGF3YWl0IHRoaXMuZGJcbiAgICAgICAgLnNlbGVjdCgpXG4gICAgICAgIC5mcm9tKGFjdG9ycylcbiAgICAgICAgLndoZXJlKGVxKGFjdG9ycy5wZXJzb25hQ29kZSwgcGVyc29uYS5wZXJzb25hQ29kZSkpXG4gICAgICAgIC5vcmRlckJ5KGFzYyhhY3RvcnMuaWQpKVxuICAgICAgICAubGltaXQoMSk7XG4gICAgICBsZXQgYWN0b3I6IEFjdG9yO1xuICAgICAgaWYgKGV4aXN0aW5nWzBdKSB7XG4gICAgICAgIGFjdG9yID0gdGhpcy5wdWJsaWNBY3RvcihleGlzdGluZ1swXSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBhY3RvciA9IGF3YWl0IHRoaXMuY3JlYXRlQWN0b3Ioe1xuICAgICAgICAgIHR5cGU6ICdhZ2VudCcsXG4gICAgICAgICAgZGlzcGxheU5hbWU6IHBlcnNvbmEuZGlzcGxheU5hbWUsXG4gICAgICAgICAgcGVyc29uYUNvZGU6IHBlcnNvbmEucGVyc29uYUNvZGUsXG4gICAgICAgIH0pO1xuICAgICAgICBhd2FpdCB0aGlzLmRiLnRyYW5zYWN0aW9uKGFzeW5jICh0eCkgPT4ge1xuICAgICAgICAgIGF3YWl0IHRoaXMuYXBwZW5kVHgodHgsICdhY3RvcicsIGFjdG9yLmlkLCAnYWN0b3IucHJvdmlzaW9uZWQnLCBpbnB1dC5ieUFjdG9ySWQsIHtcbiAgICAgICAgICAgIHBlcnNvbmFDb2RlOiBwZXJzb25hLnBlcnNvbmFDb2RlLFxuICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIC8vIEZsb29yLXN0YXRlIHJvbGUgKHRoZXNpcyk6IGFzc2lnblJvbGUgaXMgaWRlbXBvdGVudC5cbiAgICAgIGF3YWl0IHRoaXMuYXNzaWduUm9sZSh7IGFjdG9ySWQ6IGFjdG9yLmlkLCByb2xlQ29kZTogcGVyc29uYS5kZWZhdWx0Um9sZSwgYnlBY3RvcklkOiBpbnB1dC5ieUFjdG9ySWQgfSk7XG4gICAgICBwcm92aXNpb25lZC5wdXNoKHsgLi4uYWN0b3IgfSk7XG4gICAgfVxuICAgIHJldHVybiBwcm92aXNpb25lZDtcbiAgfVxuXG4gIGFzeW5jIGdyYW50KGlucHV0OiB7IGFjdG9ySWQ6IHN0cmluZzsgcGVybWlzc2lvbjogUGVybWlzc2lvbjsgc2NvcGU/OiBzdHJpbmcgfSk6IFByb21pc2U8dm9pZD4ge1xuICAgIC8vIEdyYW50LXRpbWUgcGxhbiBjZWlsaW5nIHByZWNlZGVzIGFueSBlZmZlY3QgKFBoYXNlIDIgcGluKTogYSByZWZ1c2VkXG4gICAgLy8gZ3JhbnQgaW5zZXJ0cyBub3RoaW5nIGFuZCBhcHBlbmRzIG5vdGhpbmcuXG4gICAgYXdhaXQgdGhpcy5jaGVja0dyYW50Q2VpbGluZyhpbnB1dC5hY3RvcklkLCBpbnB1dC5wZXJtaXNzaW9uKTtcbiAgICBhd2FpdCB0aGlzLmRiLnRyYW5zYWN0aW9uKGFzeW5jICh0eCkgPT4ge1xuICAgICAgYXdhaXQgdHhcbiAgICAgICAgLmluc2VydChncmFudHMpXG4gICAgICAgIC52YWx1ZXMoeyBhY3RvcklkOiBpbnB1dC5hY3RvcklkLCBwZXJtaXNzaW9uOiBpbnB1dC5wZXJtaXNzaW9uLCBzY29wZTogaW5wdXQuc2NvcGUgPz8gbnVsbCB9KVxuICAgICAgICAub25Db25mbGljdERvTm90aGluZygpO1xuICAgICAgYXdhaXQgdGhpcy5hcHBlbmRUeCh0eCwgJ2FjdG9yJywgaW5wdXQuYWN0b3JJZCwgJ2dyYW50Lmlzc3VlZCcsIHRoaXMuc3lzdGVtQWN0b3JJZCwge1xuICAgICAgICBwZXJtaXNzaW9uOiBpbnB1dC5wZXJtaXNzaW9uLFxuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICBhc3luYyByZXZva2UoaW5wdXQ6IHsgYWN0b3JJZDogc3RyaW5nOyBwZXJtaXNzaW9uOiBQZXJtaXNzaW9uOyBzY29wZT86IHN0cmluZyB9KTogUHJvbWlzZTx2b2lkPiB7XG4gICAgYXdhaXQgdGhpcy5kYi50cmFuc2FjdGlvbihhc3luYyAodHgpID0+IHtcbiAgICAgIGF3YWl0IHR4XG4gICAgICAgIC5kZWxldGUoZ3JhbnRzKVxuICAgICAgICAud2hlcmUoYW5kKGVxKGdyYW50cy5hY3RvcklkLCBpbnB1dC5hY3RvcklkKSwgZXEoZ3JhbnRzLnBlcm1pc3Npb24sIGlucHV0LnBlcm1pc3Npb24pKSk7XG4gICAgICBhd2FpdCB0aGlzLmFwcGVuZFR4KHR4LCAnYWN0b3InLCBpbnB1dC5hY3RvcklkLCAnZ3JhbnQucmV2b2tlZCcsIHRoaXMuc3lzdGVtQWN0b3JJZCwge1xuICAgICAgICBwZXJtaXNzaW9uOiBpbnB1dC5wZXJtaXNzaW9uLFxuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICAvLyAtLSBlbnRpdGxlbWVudHMgKFBoYXNlIDIsIHJvYWRtYXAgXHUwMEE3MykgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIGFzeW5jIHNldEdvdmVybmFuY2VSb2xlKGlucHV0OiB7IGFjdG9ySWQ6IHN0cmluZzsgcm9sZTogR292ZXJuYW5jZVJvbGU7IGJ5QWN0b3JJZDogc3RyaW5nIH0pOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBhd2FpdCB0aGlzLnJlcXVpcmVHb3Zlcm5hbmNlQWRtaW4oaW5wdXQuYnlBY3RvcklkKTtcbiAgICBpZiAoKGF3YWl0IHRoaXMuZ2V0QWN0b3JSb3coaW5wdXQuYWN0b3JJZCkpID09PSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcihgdW5rbm93biBhY3RvcjogJHtpbnB1dC5hY3RvcklkfWApO1xuICAgIH1cbiAgICBhd2FpdCB0aGlzLmRiLnRyYW5zYWN0aW9uKGFzeW5jICh0eCkgPT4ge1xuICAgICAgYXdhaXQgdHgudXBkYXRlKGFjdG9ycykuc2V0KHsgZ292ZXJuYW5jZVJvbGU6IGlucHV0LnJvbGUgfSkud2hlcmUoZXEoYWN0b3JzLmlkLCBpbnB1dC5hY3RvcklkKSk7XG4gICAgICBhd2FpdCB0aGlzLmFwcGVuZFR4KHR4LCAnYWN0b3InLCBpbnB1dC5hY3RvcklkLCAnZ292ZXJuYW5jZS5jaGFuZ2VkJywgaW5wdXQuYnlBY3RvcklkLCB7IHJvbGU6IGlucHV0LnJvbGUgfSk7XG4gICAgfSk7XG4gIH1cblxuICBhc3luYyBnZXRHb3Zlcm5hbmNlUm9sZShhY3RvcklkOiBzdHJpbmcpOiBQcm9taXNlPEdvdmVybmFuY2VSb2xlPiB7XG4gICAgY29uc3QgYWN0b3IgPSBhd2FpdCB0aGlzLmdldEFjdG9yUm93KGFjdG9ySWQpO1xuICAgIHJldHVybiAoYWN0b3I/LmdvdmVybmFuY2VSb2xlIGFzIEdvdmVybmFuY2VSb2xlIHwgdW5kZWZpbmVkKSA/PyAnbWVtYmVyJztcbiAgfVxuXG4gIGFzeW5jIGFzc2lnblJvbGUoaW5wdXQ6IHsgYWN0b3JJZDogc3RyaW5nOyByb2xlQ29kZTogc3RyaW5nOyBieUFjdG9ySWQ6IHN0cmluZyB9KTogUHJvbWlzZTx2b2lkPiB7XG4gICAgYXdhaXQgdGhpcy5yZXF1aXJlR292ZXJuYW5jZUFkbWluKGlucHV0LmJ5QWN0b3JJZCk7XG4gICAgY29uc3QgYnVuZGxlID0gREVMSVZFUllfUk9MRVNbaW5wdXQucm9sZUNvZGVdO1xuICAgIGlmIChidW5kbGUgPT09IHVuZGVmaW5lZCkgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoYHVua25vd24gZGVsaXZlcnkgcm9sZTogJHtpbnB1dC5yb2xlQ29kZX1gKTtcbiAgICBpZiAoKGF3YWl0IHRoaXMuZ2V0QWN0b3JSb3coaW5wdXQuYWN0b3JJZCkpID09PSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcihgdW5rbm93biBhY3RvcjogJHtpbnB1dC5hY3RvcklkfWApO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IHBlcm1pc3Npb24gb2YgYnVuZGxlKSB7XG4gICAgICBhd2FpdCB0aGlzLmNoZWNrR3JhbnRDZWlsaW5nKGlucHV0LmFjdG9ySWQsIHBlcm1pc3Npb24pO1xuICAgIH1cbiAgICBjb25zdCBhY3RpdmUgPSBhd2FpdCB0aGlzLmRiXG4gICAgICAuc2VsZWN0KHsgc2VxOiByb2xlQXNzaWdubWVudHMuc2VxIH0pXG4gICAgICAuZnJvbShyb2xlQXNzaWdubWVudHMpXG4gICAgICAud2hlcmUoXG4gICAgICAgIGFuZChcbiAgICAgICAgICBlcShyb2xlQXNzaWdubWVudHMuYWN0b3JJZCwgaW5wdXQuYWN0b3JJZCksXG4gICAgICAgICAgZXEocm9sZUFzc2lnbm1lbnRzLnJvbGVDb2RlLCBpbnB1dC5yb2xlQ29kZSksXG4gICAgICAgICAgZXEocm9sZUFzc2lnbm1lbnRzLnJldm9rZWQsIGZhbHNlKSxcbiAgICAgICAgKSxcbiAgICAgIClcbiAgICAgIC5saW1pdCgxKTtcbiAgICBpZiAoYWN0aXZlLmxlbmd0aCA+IDApIHJldHVybjsgLy8gaWRlbXBvdGVudFxuICAgIGF3YWl0IHRoaXMuZGIudHJhbnNhY3Rpb24oYXN5bmMgKHR4KSA9PiB7XG4gICAgICBhd2FpdCB0eC5pbnNlcnQocm9sZUFzc2lnbm1lbnRzKS52YWx1ZXMoe1xuICAgICAgICBhY3RvcklkOiBpbnB1dC5hY3RvcklkLFxuICAgICAgICByb2xlQ29kZTogaW5wdXQucm9sZUNvZGUsXG4gICAgICAgIGdyYW50ZWRCeTogaW5wdXQuYnlBY3RvcklkLFxuICAgICAgICByZXZva2VkOiBmYWxzZSxcbiAgICAgIH0pO1xuICAgICAgYXdhaXQgdGhpcy5hcHBlbmRUeCh0eCwgJ2FjdG9yJywgaW5wdXQuYWN0b3JJZCwgJ3JvbGUuYXNzaWduZWQnLCBpbnB1dC5ieUFjdG9ySWQsIHtcbiAgICAgICAgcm9sZUNvZGU6IGlucHV0LnJvbGVDb2RlLFxuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICBhc3luYyByZXZva2VSb2xlKGlucHV0OiB7IGFjdG9ySWQ6IHN0cmluZzsgcm9sZUNvZGU6IHN0cmluZzsgYnlBY3RvcklkOiBzdHJpbmcgfSk6IFByb21pc2U8dm9pZD4ge1xuICAgIGF3YWl0IHRoaXMucmVxdWlyZUdvdmVybmFuY2VBZG1pbihpbnB1dC5ieUFjdG9ySWQpO1xuICAgIGlmIChERUxJVkVSWV9ST0xFU1tpbnB1dC5yb2xlQ29kZV0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoYHVua25vd24gZGVsaXZlcnkgcm9sZTogJHtpbnB1dC5yb2xlQ29kZX1gKTtcbiAgICB9XG4gICAgYXdhaXQgdGhpcy5kYi50cmFuc2FjdGlvbihhc3luYyAodHgpID0+IHtcbiAgICAgIGF3YWl0IHR4XG4gICAgICAgIC51cGRhdGUocm9sZUFzc2lnbm1lbnRzKVxuICAgICAgICAuc2V0KHsgcmV2b2tlZDogdHJ1ZSB9KVxuICAgICAgICAud2hlcmUoXG4gICAgICAgICAgYW5kKFxuICAgICAgICAgICAgZXEocm9sZUFzc2lnbm1lbnRzLmFjdG9ySWQsIGlucHV0LmFjdG9ySWQpLFxuICAgICAgICAgICAgZXEocm9sZUFzc2lnbm1lbnRzLnJvbGVDb2RlLCBpbnB1dC5yb2xlQ29kZSksXG4gICAgICAgICAgICBlcShyb2xlQXNzaWdubWVudHMucmV2b2tlZCwgZmFsc2UpLFxuICAgICAgICAgICksXG4gICAgICAgICk7XG4gICAgICBhd2FpdCB0aGlzLmFwcGVuZFR4KHR4LCAnYWN0b3InLCBpbnB1dC5hY3RvcklkLCAncm9sZS5yZXZva2VkJywgaW5wdXQuYnlBY3RvcklkLCB7XG4gICAgICAgIHJvbGVDb2RlOiBpbnB1dC5yb2xlQ29kZSxcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgYXN5bmMgbGlzdFJvbGVBc3NpZ25tZW50cyhhY3RvcklkPzogc3RyaW5nKTogUHJvbWlzZTxSb2xlQXNzaWdubWVudFtdPiB7XG4gICAgY29uc3Qgcm93cyA9XG4gICAgICBhY3RvcklkID09PSB1bmRlZmluZWRcbiAgICAgICAgPyBhd2FpdCB0aGlzLmRiLnNlbGVjdCgpLmZyb20ocm9sZUFzc2lnbm1lbnRzKS5vcmRlckJ5KGFzYyhyb2xlQXNzaWdubWVudHMuc2VxKSlcbiAgICAgICAgOiBhd2FpdCB0aGlzLmRiXG4gICAgICAgICAgICAuc2VsZWN0KClcbiAgICAgICAgICAgIC5mcm9tKHJvbGVBc3NpZ25tZW50cylcbiAgICAgICAgICAgIC53aGVyZShlcShyb2xlQXNzaWdubWVudHMuYWN0b3JJZCwgYWN0b3JJZCkpXG4gICAgICAgICAgICAub3JkZXJCeShhc2Mocm9sZUFzc2lnbm1lbnRzLnNlcSkpO1xuICAgIHJldHVybiByb3dzLm1hcCgocm93KSA9PiAoe1xuICAgICAgYWN0b3JJZDogcm93LmFjdG9ySWQsXG4gICAgICByb2xlQ29kZTogcm93LnJvbGVDb2RlLFxuICAgICAgZ3JhbnRlZEJ5OiByb3cuZ3JhbnRlZEJ5LFxuICAgICAgcmV2b2tlZDogcm93LnJldm9rZWQsXG4gICAgfSkpO1xuICB9XG5cbiAgYXN5bmMgc2V0UGxhbihpbnB1dDogeyBwbGFuOiBQbGFuQ29kZTsgYnlBY3RvcklkOiBzdHJpbmcgfSk6IFByb21pc2U8dm9pZD4ge1xuICAgIGF3YWl0IHRoaXMucmVxdWlyZUdvdmVybmFuY2VBZG1pbihpbnB1dC5ieUFjdG9ySWQpO1xuICAgIGlmIChQTEFOX0NFSUxJTkdTW2lucHV0LnBsYW5dID09PSB1bmRlZmluZWQpIHRocm93IG5ldyBHdWFyZEZhaWxlZEVycm9yKGB1bmtub3duIHBsYW46ICR7aW5wdXQucGxhbn1gKTtcbiAgICBjb25zdCB3b3Jrc3BhY2UgPSBhd2FpdCB0aGlzLndvcmtzcGFjZVJvdygpO1xuICAgIGNvbnN0IHBsYW5WZXJzaW9uID0gd29ya3NwYWNlLnBsYW5WZXJzaW9uICsgMTtcbiAgICBhd2FpdCB0aGlzLmRiLnRyYW5zYWN0aW9uKGFzeW5jICh0eCkgPT4ge1xuICAgICAgYXdhaXQgdHhcbiAgICAgICAgLnVwZGF0ZSh3b3Jrc3BhY2VTdGF0ZSlcbiAgICAgICAgLnNldCh7IHBsYW46IGlucHV0LnBsYW4sIHBsYW5WZXJzaW9uIH0pXG4gICAgICAgIC53aGVyZShlcSh3b3Jrc3BhY2VTdGF0ZS5pZCwgV09SS1NQQUNFX0lEKSk7XG4gICAgICBhd2FpdCB0aGlzLmFwcGVuZFR4KHR4LCAnd29ya3NwYWNlJywgV09SS1NQQUNFX0lELCAncGxhbi5jaGFuZ2VkJywgaW5wdXQuYnlBY3RvcklkLCB7XG4gICAgICAgIHBsYW46IGlucHV0LnBsYW4sXG4gICAgICAgIHBsYW5WZXJzaW9uLFxuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICBhc3luYyBnZXRQbGFuKCk6IFByb21pc2U8UGxhbkNvZGU+IHtcbiAgICByZXR1cm4gKGF3YWl0IHRoaXMud29ya3NwYWNlUm93KCkpLnBsYW4gYXMgUGxhbkNvZGU7XG4gIH1cblxuICBhc3luYyBzZXRXb3Jrc3BhY2VQb2xpY3koaW5wdXQ6IHsgcG9saWN5OiBXb3Jrc3BhY2VQb2xpY3k7IGJ5QWN0b3JJZDogc3RyaW5nIH0pOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBhd2FpdCB0aGlzLnJlcXVpcmVHb3Zlcm5hbmNlQWRtaW4oaW5wdXQuYnlBY3RvcklkKTtcbiAgICBjb25zdCB3b3Jrc3BhY2UgPSBhd2FpdCB0aGlzLndvcmtzcGFjZVJvdygpO1xuICAgIGNvbnN0IG1lcmdlZDogV29ya3NwYWNlUG9saWN5ID0geyAuLi4od29ya3NwYWNlLnBvbGljeSBhcyBXb3Jrc3BhY2VQb2xpY3kpLCAuLi5pbnB1dC5wb2xpY3kgfTtcbiAgICBjb25zdCBwb2xpY3lWZXJzaW9uID0gd29ya3NwYWNlLnBvbGljeVZlcnNpb24gKyAxO1xuICAgIGF3YWl0IHRoaXMuZGIudHJhbnNhY3Rpb24oYXN5bmMgKHR4KSA9PiB7XG4gICAgICBhd2FpdCB0eFxuICAgICAgICAudXBkYXRlKHdvcmtzcGFjZVN0YXRlKVxuICAgICAgICAuc2V0KHsgcG9saWN5OiBtZXJnZWQgYXMgUmVjb3JkPHN0cmluZywgdW5rbm93bj4sIHBvbGljeVZlcnNpb24gfSlcbiAgICAgICAgLndoZXJlKGVxKHdvcmtzcGFjZVN0YXRlLmlkLCBXT1JLU1BBQ0VfSUQpKTtcbiAgICAgIGF3YWl0IHRoaXMuYXBwZW5kVHgodHgsICd3b3Jrc3BhY2UnLCBXT1JLU1BBQ0VfSUQsICdwb2xpY3kuY2hhbmdlZCcsIGlucHV0LmJ5QWN0b3JJZCwge1xuICAgICAgICBwb2xpY3k6IHsgLi4ubWVyZ2VkIH0sXG4gICAgICAgIHBvbGljeVZlcnNpb24sXG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuXG4gIGFzeW5jIGdldFdvcmtzcGFjZVBvbGljeSgpOiBQcm9taXNlPFdvcmtzcGFjZVBvbGljeT4ge1xuICAgIHJldHVybiB7IC4uLigoYXdhaXQgdGhpcy53b3Jrc3BhY2VSb3coKSkucG9saWN5IGFzIFdvcmtzcGFjZVBvbGljeSkgfTtcbiAgfVxuXG4gIGFzeW5jIHNldEdhdGVQb2xpY3koaW5wdXQ6IHsgZ2F0ZTogR2F0ZUNvZGU7IHBvbGljeTogR2F0ZVBvbGljeTsgYnlBY3RvcklkOiBzdHJpbmcgfSk6IFByb21pc2U8dm9pZD4ge1xuICAgIGF3YWl0IHRoaXMucmVxdWlyZUdvdmVybmFuY2VBZG1pbihpbnB1dC5ieUFjdG9ySWQpO1xuICAgIGNvbnN0IG1pbkFwcHJvdmFscyA9IGlucHV0LnBvbGljeS5taW5BcHByb3ZhbHMgPz8gMTtcbiAgICBpZiAoIU51bWJlci5pc0ludGVnZXIobWluQXBwcm92YWxzKSB8fCBtaW5BcHByb3ZhbHMgPCAxKSB7XG4gICAgICB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcignbWluQXBwcm92YWxzIG11c3QgYmUgYSBwb3NpdGl2ZSBpbnRlZ2VyJyk7XG4gICAgfVxuICAgIGF3YWl0IHRoaXMuZGIudHJhbnNhY3Rpb24oYXN5bmMgKHR4KSA9PiB7XG4gICAgICBhd2FpdCB0eFxuICAgICAgICAuaW5zZXJ0KGdhdGVQb2xpY2llcylcbiAgICAgICAgLnZhbHVlcyh7IGdhdGU6IGlucHV0LmdhdGUsIHBvbGljeTogeyAuLi5pbnB1dC5wb2xpY3kgfSBhcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiB9KVxuICAgICAgICAub25Db25mbGljdERvVXBkYXRlKHtcbiAgICAgICAgICB0YXJnZXQ6IGdhdGVQb2xpY2llcy5nYXRlLFxuICAgICAgICAgIHNldDogeyBwb2xpY3k6IHsgLi4uaW5wdXQucG9saWN5IH0gYXMgUmVjb3JkPHN0cmluZywgdW5rbm93bj4gfSxcbiAgICAgICAgfSk7XG4gICAgICBhd2FpdCB0aGlzLmFwcGVuZFR4KHR4LCAnd29ya3NwYWNlJywgV09SS1NQQUNFX0lELCAnZ2F0ZV9wb2xpY3kuY2hhbmdlZCcsIGlucHV0LmJ5QWN0b3JJZCwge1xuICAgICAgICBnYXRlOiBpbnB1dC5nYXRlLFxuICAgICAgICBwb2xpY3k6IHsgLi4uaW5wdXQucG9saWN5IH0sXG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuXG4gIGFzeW5jIGdldEdhdGVQb2xpY3koZ2F0ZTogR2F0ZUNvZGUpOiBQcm9taXNlPEdhdGVQb2xpY3k+IHtcbiAgICBjb25zdCByb3dzID0gYXdhaXQgdGhpcy5kYi5zZWxlY3QoKS5mcm9tKGdhdGVQb2xpY2llcykud2hlcmUoZXEoZ2F0ZVBvbGljaWVzLmdhdGUsIGdhdGUpKS5saW1pdCgxKTtcbiAgICByZXR1cm4geyAuLi4oKHJvd3NbMF0/LnBvbGljeSBhcyBHYXRlUG9saWN5IHwgdW5kZWZpbmVkKSA/PyB7fSkgfTtcbiAgfVxuXG4gIGFzeW5jIGF1dGh6RXhwbGFpbihpbnB1dDogeyBhY3RvcklkOiBzdHJpbmc7IHBlcm1pc3Npb246IFBlcm1pc3Npb24gfSk6IFByb21pc2U8QXV0aHpFeHBsYW5hdGlvbj4ge1xuICAgIGNvbnN0IHNvdXJjZSA9IGF3YWl0IHRoaXMuZ3JhbnRTb3VyY2UoaW5wdXQuYWN0b3JJZCwgaW5wdXQucGVybWlzc2lvbik7XG4gICAgY29uc3QgYWN0b3IgPSBhd2FpdCB0aGlzLmdldEFjdG9yUm93KGlucHV0LmFjdG9ySWQpO1xuICAgIGNvbnN0IHdvcmtzcGFjZSA9IGF3YWl0IHRoaXMud29ya3NwYWNlUm93KCk7XG4gICAgY29uc3QgYWxsb3dzID0gdGhpcy5hZ2VudENlaWxpbmdBbGxvd3MoYWN0b3IsIGlucHV0LnBlcm1pc3Npb24sIHdvcmtzcGFjZSk7XG4gICAgcmV0dXJuIHtcbiAgICAgIGFjdG9ySWQ6IGlucHV0LmFjdG9ySWQsXG4gICAgICBwZXJtaXNzaW9uOiBpbnB1dC5wZXJtaXNzaW9uLFxuICAgICAgYWxsb3dlZDogc291cmNlICE9PSBudWxsICYmIGFsbG93cy5wbGFuICYmIGFsbG93cy5wb2xpY3ksXG4gICAgICBzb3VyY2UsXG4gICAgICBnb3Zlcm5hbmNlUm9sZTogKGFjdG9yPy5nb3Zlcm5hbmNlUm9sZSBhcyBHb3Zlcm5hbmNlUm9sZSB8IHVuZGVmaW5lZCkgPz8gJ21lbWJlcicsXG4gICAgICBwbGFuOiB3b3Jrc3BhY2UucGxhbiBhcyBQbGFuQ29kZSxcbiAgICAgIHBsYW5BbGxvd3M6IGFsbG93cy5wbGFuLFxuICAgICAgcG9saWN5QWxsb3dzOiBhbGxvd3MucG9saWN5LFxuICAgICAgdmVyc2lvbnM6IHsgcGxhbjogd29ya3NwYWNlLnBsYW5WZXJzaW9uLCBwb2xpY3k6IHdvcmtzcGFjZS5wb2xpY3lWZXJzaW9uIH0sXG4gICAgfTtcbiAgfVxuXG4gIGFzeW5jIGNyZWF0ZUZlYXR1cmUoaW5wdXQ6IHsgYWN0b3JJZDogc3RyaW5nIH0pOiBQcm9taXNlPEZlYXR1cmU+IHtcbiAgICBjb25zdCBpZCA9IHRoaXMubmV4dElkKCdmZWF0Jyk7XG4gICAgcmV0dXJuIHRoaXMuZGIudHJhbnNhY3Rpb24oYXN5bmMgKHR4KSA9PiB7XG4gICAgICBhd2FpdCB0eC5pbnNlcnQoZmVhdHVyZXMpLnZhbHVlcyh7IGlkLCBzdGF0ZTogJ2JhY2tsb2cnLCBkaXNwYXRjaEhvbGQ6IGZhbHNlIH0pO1xuICAgICAgYXdhaXQgdGhpcy5hcHBlbmRUeCh0eCwgJ2ZlYXR1cmUnLCBpZCwgJ2ZlYXR1cmUuY3JlYXRlZCcsIGlucHV0LmFjdG9ySWQsIHt9KTtcbiAgICAgIHJldHVybiB7IGlkLCBzdGF0ZTogJ2JhY2tsb2cnIGFzIGNvbnN0LCBkaXNwYXRjaEhvbGQ6IGZhbHNlIH07XG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIGNyZWF0ZVdvcmtJdGVtVHgodHg6IFF1ZXJ5YWJsZSwgaW5wdXQ6IENyZWF0ZVdvcmtJdGVtSW5wdXQgJiB7IGFjdG9ySWQ6IHN0cmluZyB9KTogUHJvbWlzZTxXb3JrSXRlbT4ge1xuICAgIGNvbnN0IHNsdWcgPSBpbnB1dC50aXRsZVxuICAgICAgLnRvTG93ZXJDYXNlKClcbiAgICAgIC5yZXBsYWNlKC9bXmEtejAtOV0rL2csICctJylcbiAgICAgIC5yZXBsYWNlKC8oXi18LSQpL2csICcnKTtcbiAgICBjb25zdCByb3c6IFdvcmtJdGVtUm93ID0ge1xuICAgICAgaWQ6IHRoaXMubmV4dElkKCd3aScpLFxuICAgICAgc2VxOiAwLCAvLyBhc3NpZ25lZCBieSB0aGUgc2VyaWFsOyBwbGFjZWhvbGRlciBmb3IgdGhlIGxvY2FsIGNvcHkgb25seVxuICAgICAgZmVhdHVyZUlkOiBpbnB1dC5mZWF0dXJlSWQsXG4gICAgICBleHRlcm5hbEtleTogaW5wdXQuZXh0ZXJuYWxLZXksXG4gICAgICBraW5kOiBpbnB1dC5raW5kID8/ICdjb2RlJyxcbiAgICAgIHRpdGxlOiBpbnB1dC50aXRsZSxcbiAgICAgIHN0YXRlOiAnYmFja2xvZycsXG4gICAgICBibG9ja2VkUmVhc29uOiBudWxsLFxuICAgICAgcmV2aWV3TG9vcEl0ZXJhdGlvbjogMCxcbiAgICAgIGludGVudEhhc2g6IG51bGwsXG4gICAgICBwaW5uZWRWZXJpZmljYXRpb246IG51bGwsXG4gICAgICBzcGVjQ2hlY2twb2ludDogaW5wdXQuc3BlY0NoZWNrcG9pbnQgPz8gZmFsc2UsXG4gICAgICBkb25lQ2hlY2twb2ludDogaW5wdXQuZG9uZUNoZWNrcG9pbnQgPz8gZmFsc2UsXG4gICAgICBpbnZva2VEZXZXaXRoOiBpbnB1dC5pbnZva2VEZXZXaXRoID8/ICcnLFxuICAgICAgc3BlY1BhdGg6IGBzdG9yaWVzLyR7aW5wdXQuZXh0ZXJuYWxLZXl9LSR7c2x1Z30ubWRgLFxuICAgICAgc3RhdGVWZXJzaW9uOiAwLFxuICAgICAgZGVwZW5kc09uOiBpbnB1dC5kZXBlbmRzT24gPyBbLi4uaW5wdXQuZGVwZW5kc09uXSA6IFtdLFxuICAgICAgbGFzdEZlbmNpbmdUb2tlbjogMCxcbiAgICB9O1xuICAgIGF3YWl0IHR4Lmluc2VydCh3b3JrSXRlbXMpLnZhbHVlcyh7XG4gICAgICBpZDogcm93LmlkLFxuICAgICAgZmVhdHVyZUlkOiByb3cuZmVhdHVyZUlkLFxuICAgICAgZXh0ZXJuYWxLZXk6IHJvdy5leHRlcm5hbEtleSxcbiAgICAgIGtpbmQ6IHJvdy5raW5kLFxuICAgICAgdGl0bGU6IHJvdy50aXRsZSxcbiAgICAgIHN0YXRlOiByb3cuc3RhdGUsXG4gICAgICBibG9ja2VkUmVhc29uOiByb3cuYmxvY2tlZFJlYXNvbixcbiAgICAgIHJldmlld0xvb3BJdGVyYXRpb246IHJvdy5yZXZpZXdMb29wSXRlcmF0aW9uLFxuICAgICAgaW50ZW50SGFzaDogcm93LmludGVudEhhc2gsXG4gICAgICBwaW5uZWRWZXJpZmljYXRpb246IHJvdy5waW5uZWRWZXJpZmljYXRpb24sXG4gICAgICBzcGVjQ2hlY2twb2ludDogcm93LnNwZWNDaGVja3BvaW50LFxuICAgICAgZG9uZUNoZWNrcG9pbnQ6IHJvdy5kb25lQ2hlY2twb2ludCxcbiAgICAgIGludm9rZURldldpdGg6IHJvdy5pbnZva2VEZXZXaXRoLFxuICAgICAgc3BlY1BhdGg6IHJvdy5zcGVjUGF0aCxcbiAgICAgIHN0YXRlVmVyc2lvbjogcm93LnN0YXRlVmVyc2lvbixcbiAgICAgIGRlcGVuZHNPbjogcm93LmRlcGVuZHNPbixcbiAgICAgIGxhc3RGZW5jaW5nVG9rZW46IHJvdy5sYXN0RmVuY2luZ1Rva2VuLFxuICAgIH0pO1xuICAgIGF3YWl0IHRoaXMuYXBwZW5kVHgodHgsICd3b3JrX2l0ZW0nLCByb3cuaWQsICd3b3JrX2l0ZW0uY3JlYXRlZCcsIGlucHV0LmFjdG9ySWQsIHtcbiAgICAgIGV4dGVybmFsS2V5OiByb3cuZXh0ZXJuYWxLZXksXG4gICAgICBmZWF0dXJlSWQ6IHJvdy5mZWF0dXJlSWQsXG4gICAgfSk7XG4gICAgcmV0dXJuIHRoaXMucHVibGljSXRlbShyb3cpO1xuICB9XG5cbiAgYXN5bmMgY3JlYXRlV29ya0l0ZW0oaW5wdXQ6IENyZWF0ZVdvcmtJdGVtSW5wdXQgJiB7IGFjdG9ySWQ6IHN0cmluZyB9KTogUHJvbWlzZTxXb3JrSXRlbT4ge1xuICAgIHJldHVybiB0aGlzLmRiLnRyYW5zYWN0aW9uKGFzeW5jICh0eCkgPT4gdGhpcy5jcmVhdGVXb3JrSXRlbVR4KHR4LCBpbnB1dCkpO1xuICB9XG5cbiAgYXN5bmMgaW1wb3J0U3RvcmllcyhpbnB1dDogeyBmZWF0dXJlSWQ6IHN0cmluZzsgeWFtbDogc3RyaW5nOyBhY3RvcklkOiBzdHJpbmcgfSk6IFByb21pc2U8U3Rvcmllc0ltcG9ydFJlc3VsdD4ge1xuICAgIGNvbnN0IGVudHJpZXMgPSBwYXJzZVN0b3JpZXMoaW5wdXQueWFtbCk7XG4gICAgY29uc3QgZmVhdHVyZSA9IGF3YWl0IHRoaXMuZ2V0RmVhdHVyZVJvdyhpbnB1dC5mZWF0dXJlSWQpO1xuICAgIGlmICghZmVhdHVyZSkge1xuICAgICAgdGhyb3cgbmV3IFN0b3JpZXNWYWxpZGF0aW9uRXJyb3IoYHVua25vd24gZmVhdHVyZTogJHtpbnB1dC5mZWF0dXJlSWR9YCk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmRiLnRyYW5zYWN0aW9uKGFzeW5jICh0eCkgPT4ge1xuICAgICAgY29uc3QgaW1wb3J0ZWQ6IHN0cmluZ1tdID0gW107XG4gICAgICBjb25zdCB1cGRhdGVkOiBzdHJpbmdbXSA9IFtdO1xuICAgICAgY29uc3Qgd2FybmluZ3M6IHN0cmluZ1tdID0gW107XG4gICAgICBmb3IgKGNvbnN0IGVudHJ5IG9mIGVudHJpZXMpIHtcbiAgICAgICAgY29uc3QgZXhpc3RpbmcgPSAoXG4gICAgICAgICAgYXdhaXQgdHhcbiAgICAgICAgICAgIC5zZWxlY3QoKVxuICAgICAgICAgICAgLmZyb20od29ya0l0ZW1zKVxuICAgICAgICAgICAgLndoZXJlKGFuZChlcSh3b3JrSXRlbXMuZmVhdHVyZUlkLCBpbnB1dC5mZWF0dXJlSWQpLCBlcSh3b3JrSXRlbXMuZXh0ZXJuYWxLZXksIGVudHJ5LmlkKSkpXG4gICAgICAgICAgICAub3JkZXJCeShhc2Mod29ya0l0ZW1zLnNlcSkpXG4gICAgICAgICAgICAubGltaXQoMSlcbiAgICAgICAgKVswXTtcbiAgICAgICAgaWYgKGV4aXN0aW5nKSB7XG4gICAgICAgICAgLy8gUmUtaW1wb3J0IHJlZnJlc2hlcyBkZXNjcmlwdGl2ZSBmaWVsZHM7IGxpZmVjeWNsZSBzdGF0ZSBpcyBuZXZlclxuICAgICAgICAgIC8vIHRvdWNoZWQgKHN0b3JpZXMueWFtbCBjYXJyaWVzIG5vIHN0YXR1cyBcdTIwMTQgRDksIHZhbGlkaXR5IHJ1bGUgMykuXG4gICAgICAgICAgYXdhaXQgdHhcbiAgICAgICAgICAgIC51cGRhdGUod29ya0l0ZW1zKVxuICAgICAgICAgICAgLnNldCh7XG4gICAgICAgICAgICAgIHRpdGxlOiBlbnRyeS50aXRsZSxcbiAgICAgICAgICAgICAgc3BlY0NoZWNrcG9pbnQ6IGVudHJ5LnNwZWNDaGVja3BvaW50LFxuICAgICAgICAgICAgICBkb25lQ2hlY2twb2ludDogZW50cnkuZG9uZUNoZWNrcG9pbnQsXG4gICAgICAgICAgICAgIGludm9rZURldldpdGg6IGVudHJ5Lmludm9rZURldldpdGgsXG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLndoZXJlKGVxKHdvcmtJdGVtcy5pZCwgZXhpc3RpbmcuaWQpKTtcbiAgICAgICAgICBhd2FpdCB0aGlzLmFwcGVuZFR4KHR4LCAnd29ya19pdGVtJywgZXhpc3RpbmcuaWQsICd3b3JrX2l0ZW0ucmVpbXBvcnRlZCcsIGlucHV0LmFjdG9ySWQsIHtcbiAgICAgICAgICAgIGV4dGVybmFsS2V5OiBlbnRyeS5pZCxcbiAgICAgICAgICB9KTtcbiAgICAgICAgICB1cGRhdGVkLnB1c2goZW50cnkuaWQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGF3YWl0IHRoaXMuY3JlYXRlV29ya0l0ZW1UeCh0eCwge1xuICAgICAgICAgICAgZmVhdHVyZUlkOiBpbnB1dC5mZWF0dXJlSWQsXG4gICAgICAgICAgICBleHRlcm5hbEtleTogZW50cnkuaWQsXG4gICAgICAgICAgICB0aXRsZTogZW50cnkudGl0bGUsXG4gICAgICAgICAgICBzcGVjQ2hlY2twb2ludDogZW50cnkuc3BlY0NoZWNrcG9pbnQsXG4gICAgICAgICAgICBkb25lQ2hlY2twb2ludDogZW50cnkuZG9uZUNoZWNrcG9pbnQsXG4gICAgICAgICAgICBpbnZva2VEZXZXaXRoOiBlbnRyeS5pbnZva2VEZXZXaXRoLFxuICAgICAgICAgICAgYWN0b3JJZDogaW5wdXQuYWN0b3JJZCxcbiAgICAgICAgICB9KTtcbiAgICAgICAgICBpbXBvcnRlZC5wdXNoKGVudHJ5LmlkKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIHsgaW1wb3J0ZWQsIHVwZGF0ZWQsIHdhcm5pbmdzIH07XG4gICAgfSk7XG4gIH1cblxuICAvLyAtLSBjbGFpbXMgKHJvYWRtYXAgXHUwMEE3MS4zKSAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICBhc3luYyBjbGFpbVRhc2soaW5wdXQ6IHsgd29ya0l0ZW1JZDogc3RyaW5nOyBhY3RvcklkOiBzdHJpbmc7IHR0bE1zPzogbnVtYmVyIH0pOiBQcm9taXNlPENsYWltPiB7XG4gICAgY29uc3QgaXRlbSA9IGF3YWl0IHRoaXMubXVzdEdldEl0ZW0oaW5wdXQud29ya0l0ZW1JZCk7XG4gICAgYXdhaXQgdGhpcy5yZXF1aXJlUGVybWlzc2lvbihpbnB1dC5hY3RvcklkLCAndGFzay5jbGFpbScpO1xuICAgIGNvbnN0IHR0bE1zID0gaW5wdXQudHRsTXMgPz8gMTUgKiA2MCAqIDEwMDA7XG4gICAgY29uc3QgY2xhaW1JZCA9IHRoaXMubmV4dElkKCdjbGFpbScpO1xuICAgIHRyeSB7XG4gICAgICByZXR1cm4gYXdhaXQgdGhpcy5kYi50cmFuc2FjdGlvbihhc3luYyAodHgpID0+IHtcbiAgICAgICAgLy8gU3dlZXA6IGFuIEVYUElSRUQgbGVhc2UgcmV0dXJucyB0aGUgaXRlbSB0byB0aGUgcG9vbCBcdTIwMTQgZmxpcCBpdHNcbiAgICAgICAgLy8gcmVsZWFzZWQgZmxhZyBzbyB0aGUgcGFydGlhbCB1bmlxdWUgaW5kZXggb25seSBndWFyZHMgbGl2ZSBjbGFpbXMuXG4gICAgICAgIGF3YWl0IHR4XG4gICAgICAgICAgLnVwZGF0ZShjbGFpbXMpXG4gICAgICAgICAgLnNldCh7IHJlbGVhc2VkOiB0cnVlIH0pXG4gICAgICAgICAgLndoZXJlKFxuICAgICAgICAgICAgYW5kKFxuICAgICAgICAgICAgICBlcShjbGFpbXMud29ya0l0ZW1JZCwgaXRlbS5pZCksXG4gICAgICAgICAgICAgIGVxKGNsYWltcy5yZWxlYXNlZCwgZmFsc2UpLFxuICAgICAgICAgICAgICBsdGUoY2xhaW1zLmxlYXNlRXhwaXJlc0F0LCB0aGlzLm5vdyksXG4gICAgICAgICAgICApLFxuICAgICAgICAgICk7XG4gICAgICAgIC8vIE1vbm90b25pYyBmZW5jaW5nIHRva2VuIHBlciB3b3JrIGl0ZW0sIGNvbnN1bWVkIG9ubHkgb24gc3VjY2Vzc1xuICAgICAgICAvLyAodGhlIHRyYW5zYWN0aW9uIHJvbGxzIHRoZSBjb3VudGVyIGJhY2sgd2hlbiB0aGUgaW5zZXJ0IGxvc2VzKS5cbiAgICAgICAgY29uc3QgY291bnRlclJvdyA9IChcbiAgICAgICAgICBhd2FpdCB0eFxuICAgICAgICAgICAgLnNlbGVjdCh7IGxhc3RGZW5jaW5nVG9rZW46IHdvcmtJdGVtcy5sYXN0RmVuY2luZ1Rva2VuIH0pXG4gICAgICAgICAgICAuZnJvbSh3b3JrSXRlbXMpXG4gICAgICAgICAgICAud2hlcmUoZXEod29ya0l0ZW1zLmlkLCBpdGVtLmlkKSlcbiAgICAgICAgICAgIC5saW1pdCgxKVxuICAgICAgICApWzBdO1xuICAgICAgICBjb25zdCB0b2tlbiA9IChjb3VudGVyUm93Py5sYXN0RmVuY2luZ1Rva2VuID8/IDApICsgMTtcbiAgICAgICAgYXdhaXQgdHgudXBkYXRlKHdvcmtJdGVtcykuc2V0KHsgbGFzdEZlbmNpbmdUb2tlbjogdG9rZW4gfSkud2hlcmUoZXEod29ya0l0ZW1zLmlkLCBpdGVtLmlkKSk7XG4gICAgICAgIC8vIFRoZSBwYXJ0aWFsIHVuaXF1ZSBpbmRleCBjbGFpbXNfb25lX2xpdmVfcGVyX2l0ZW0gZGVjaWRlcyB0aGUgcmFjZTpcbiAgICAgICAgLy8gYSBsaXZlIGNsYWltIG1ha2VzIHRoaXMgSU5TRVJUIGZhaWwgXHUyMDE0IHRoZSBsb3NlciBsZWF2ZXMgbm8gcm93LlxuICAgICAgICBhd2FpdCB0eC5pbnNlcnQoY2xhaW1zKS52YWx1ZXMoe1xuICAgICAgICAgIGlkOiBjbGFpbUlkLFxuICAgICAgICAgIHdvcmtJdGVtSWQ6IGl0ZW0uaWQsXG4gICAgICAgICAgYWN0b3JJZDogaW5wdXQuYWN0b3JJZCxcbiAgICAgICAgICBmZW5jaW5nVG9rZW46IHRva2VuLFxuICAgICAgICAgIGxlYXNlRXhwaXJlc0F0OiB0aGlzLm5vdyArIHR0bE1zLFxuICAgICAgICAgIHJlbGVhc2VkOiBmYWxzZSxcbiAgICAgICAgICB0dGxNcyxcbiAgICAgICAgfSk7XG4gICAgICAgIGF3YWl0IHRoaXMuYXBwZW5kVHgodHgsICd3b3JrX2l0ZW0nLCBpdGVtLmlkLCAnd29ya19pdGVtLmNsYWltZWQnLCBpbnB1dC5hY3RvcklkLCB7XG4gICAgICAgICAgY2xhaW1JZCxcbiAgICAgICAgICBmZW5jaW5nVG9rZW46IHRva2VuLFxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBpZDogY2xhaW1JZCxcbiAgICAgICAgICB3b3JrSXRlbUlkOiBpdGVtLmlkLFxuICAgICAgICAgIGFjdG9ySWQ6IGlucHV0LmFjdG9ySWQsXG4gICAgICAgICAgZmVuY2luZ1Rva2VuOiB0b2tlbixcbiAgICAgICAgICBsZWFzZUV4cGlyZXNBdDogdGhpcy5ub3cgKyB0dGxNcyxcbiAgICAgICAgICByZWxlYXNlZDogZmFsc2UsXG4gICAgICAgIH07XG4gICAgICB9KTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgaWYgKGlzVW5pcXVlVmlvbGF0aW9uKGVycm9yKSkge1xuICAgICAgICB0aHJvdyBuZXcgQ29uZmxpY3RFcnJvcihgd29yayBpdGVtICR7aXRlbS5pZH0gYWxyZWFkeSBoYXMgYSBsaXZlIGNsYWltYCk7XG4gICAgICB9XG4gICAgICB0aHJvdyBlcnJvcjtcbiAgICB9XG4gIH1cblxuICBhc3luYyBoZWFydGJlYXQoaW5wdXQ6IHsgY2xhaW1JZDogc3RyaW5nIH0pOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCByb3cgPSAoYXdhaXQgdGhpcy5kYi5zZWxlY3QoKS5mcm9tKGNsYWltcykud2hlcmUoZXEoY2xhaW1zLmlkLCBpbnB1dC5jbGFpbUlkKSkubGltaXQoMSkpWzBdO1xuICAgIGlmICghcm93IHx8IHJvdy5yZWxlYXNlZCB8fCByb3cubGVhc2VFeHBpcmVzQXQgPD0gdGhpcy5ub3cpIHtcbiAgICAgIHRocm93IG5ldyBDb25mbGljdEVycm9yKGBjbGFpbSAke2lucHV0LmNsYWltSWR9IGlzIG5vdCBsaXZlYCk7XG4gICAgfVxuICAgIC8vIEhlYXJ0YmVhdCByZW5ld3MgdGhlIEZVTEwgb3JpZ2luYWwgVFRMIGZyb20gdGhlIGhlYXJ0YmVhdCBtb21lbnQuXG4gICAgYXdhaXQgdGhpcy5kYlxuICAgICAgLnVwZGF0ZShjbGFpbXMpXG4gICAgICAuc2V0KHsgbGVhc2VFeHBpcmVzQXQ6IHRoaXMubm93ICsgcm93LnR0bE1zIH0pXG4gICAgICAud2hlcmUoZXEoY2xhaW1zLmlkLCByb3cuaWQpKTtcbiAgfVxuXG4gIGFzeW5jIHJlbGVhc2VDbGFpbShpbnB1dDogeyBjbGFpbUlkOiBzdHJpbmc7IHJlYXNvbj86IHN0cmluZyB9KTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3Qgcm93ID0gKGF3YWl0IHRoaXMuZGIuc2VsZWN0KCkuZnJvbShjbGFpbXMpLndoZXJlKGVxKGNsYWltcy5pZCwgaW5wdXQuY2xhaW1JZCkpLmxpbWl0KDEpKVswXTtcbiAgICBpZiAoIXJvdyB8fCByb3cucmVsZWFzZWQpIHJldHVybjtcbiAgICBhd2FpdCB0aGlzLmRiLnRyYW5zYWN0aW9uKGFzeW5jICh0eCkgPT4ge1xuICAgICAgYXdhaXQgdHgudXBkYXRlKGNsYWltcykuc2V0KHsgcmVsZWFzZWQ6IHRydWUgfSkud2hlcmUoZXEoY2xhaW1zLmlkLCByb3cuaWQpKTtcbiAgICAgIGF3YWl0IHRoaXMuYXBwZW5kVHgodHgsICd3b3JrX2l0ZW0nLCByb3cud29ya0l0ZW1JZCwgJ2NsYWltLnJlbGVhc2VkJywgcm93LmFjdG9ySWQsIHtcbiAgICAgICAgY2xhaW1JZDogcm93LmlkLFxuICAgICAgICByZWFzb246IGlucHV0LnJlYXNvbiA/PyBudWxsLFxuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICBhZHZhbmNlQ2xvY2sobXM6IG51bWJlcik6IHZvaWQge1xuICAgIHRoaXMubm93ICs9IG1zO1xuICB9XG5cbiAgLy8gLS0gbGlmZWN5Y2xlIChyb2FkbWFwIFx1MDBBNzEuMikgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICBhc3luYyBhZHZhbmNlU3RhdGUoaW5wdXQ6IEFkdmFuY2VJbnB1dCk6IFByb21pc2U8V29ya0l0ZW0+IHtcbiAgICBjb25zdCBpdGVtID0gYXdhaXQgdGhpcy5tdXN0R2V0SXRlbShpbnB1dC53b3JrSXRlbUlkKTtcblxuICAgIC8vIEtleWVkIHJlcGxheTogdGhlIHNhbWUgY29tbWFuZCByZXR1cm5zIHRoZSBzYW1lIHJlc3VsdCwgYXBwZW5kcyBub3RoaW5nLlxuICAgIGlmIChpbnB1dC5pZGVtcG90ZW5jeUtleSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBjb25zdCBjYWNoZWQgPSAoXG4gICAgICAgIGF3YWl0IHRoaXMuZGJcbiAgICAgICAgICAuc2VsZWN0KClcbiAgICAgICAgICAuZnJvbShpZGVtcG90ZW5jeUtleXMpXG4gICAgICAgICAgLndoZXJlKGVxKGlkZW1wb3RlbmN5S2V5cy5rZXksIGlucHV0LmlkZW1wb3RlbmN5S2V5KSlcbiAgICAgICAgICAubGltaXQoMSlcbiAgICAgIClbMF07XG4gICAgICBpZiAoY2FjaGVkKSByZXR1cm4geyAuLi4oY2FjaGVkLnJlc3VsdCBhcyB1bmtub3duIGFzIFdvcmtJdGVtKSB9O1xuICAgIH1cblxuICAgIC8vIFByZXNlcnZhdGlvbiBuby1vcCAoc3ByaW50LXBsYW5uaW5nIGlkZW1wb3RlbmN5IHJ1bGUpOiBhbiBVTktFWUVEXG4gICAgLy8gcmUtcmVxdWVzdCBvZiB0aGUgY3VycmVudCBzdGF0ZSBzdWNjZWVkcyB3aXRob3V0IGFuIGV2ZW50LlxuICAgIGlmIChpbnB1dC5pZGVtcG90ZW5jeUtleSA9PT0gdW5kZWZpbmVkICYmIGlucHV0LnRvID09PSBpdGVtLnN0YXRlKSB7XG4gICAgICBhd2FpdCB0aGlzLnZhbGlkYXRlUHJlc2VudGVkVG9rZW4oaXRlbSwgaW5wdXQuZmVuY2luZ1Rva2VuLCBpbnB1dC5hY3RvcklkKTtcbiAgICAgIHJldHVybiB0aGlzLnB1YmxpY0l0ZW0oaXRlbSk7XG4gICAgfVxuXG4gICAgLy8gVHJhbnNpdGlvbi10YWJsZSBsb29rdXAgcHJlY2VkZXMgY2xhaW0vdG9rZW4vcGVybWlzc2lvbiBjaGVja3NcbiAgICAvLyAoZnNtLXRyYW5zaXRpb25zIHBpbikuXG4gICAgY29uc3QgcnVsZSA9IFRSQU5TSVRJT05TLmZpbmQoKHQpID0+IHQuZnJvbSA9PT0gaXRlbS5zdGF0ZSAmJiB0LnRvID09PSBpbnB1dC50byk7XG4gICAgaWYgKCFydWxlKSB7XG4gICAgICBpZiAoXG4gICAgICAgIFJBTktbaW5wdXQudG9dIDwgUkFOS1tpdGVtLnN0YXRlIGFzIFdvcmtJdGVtU3RhdGVdICYmXG4gICAgICAgIChhd2FpdCB0aGlzLmhhc1Blcm1pc3Npb24oaW5wdXQuYWN0b3JJZCwgJ3N0YXRlLmRvd25ncmFkZScpKVxuICAgICAgKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnByaXZpbGVnZWREb3duZ3JhZGUoaXRlbSwgaW5wdXQpO1xuICAgICAgfVxuICAgICAgdGhyb3cgbmV3IEludmFsaWRUcmFuc2l0aW9uRXJyb3IoaXRlbS5zdGF0ZSBhcyBXb3JrSXRlbVN0YXRlLCBpbnB1dC50byk7XG4gICAgfVxuXG4gICAgYXdhaXQgdGhpcy52YWxpZGF0ZVByZXNlbnRlZFRva2VuKGl0ZW0sIGlucHV0LmZlbmNpbmdUb2tlbiwgaW5wdXQuYWN0b3JJZCk7XG5cbiAgICAvLyBCbG9ja2VkIG92ZXJsYXkgZnJlZXplcyB0cmFuc2l0aW9ucyBhdCBldmVyeSBzdGF0ZSAoRDgsIFx1MDBBNzEuMSkuXG4gICAgaWYgKGl0ZW0uYmxvY2tlZFJlYXNvbiAhPT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoYHdvcmsgaXRlbSBpcyBibG9ja2VkOiAke2l0ZW0uYmxvY2tlZFJlYXNvbn1gKTtcbiAgICB9XG5cbiAgICBhd2FpdCB0aGlzLnJlcXVpcmVQZXJtaXNzaW9uKGlucHV0LmFjdG9ySWQsIHJ1bGUucGVybWlzc2lvbik7XG5cbiAgICBpZiAocnVsZS5jbGFpbVJlcXVpcmVkICYmIGlucHV0LmZlbmNpbmdUb2tlbiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAvLyBFeGVjdXRpb24tem9uZSB0cmFuc2l0aW9ucyBkZW1hbmQgYSBQUkVTRU5URUQgbGl2ZSB0b2tlbi5cbiAgICAgIHRocm93IG5ldyBHdWFyZEZhaWxlZEVycm9yKCdjbGFpbSBmZW5jaW5nIHRva2VuIHJlcXVpcmVkIGZvciB0aGlzIHRyYW5zaXRpb24nKTtcbiAgICB9XG5cbiAgICBmb3IgKGNvbnN0IGd1YXJkIG9mIHJ1bGUuZ3VhcmRzKSB7XG4gICAgICBhd2FpdCB0aGlzLmNoZWNrR3VhcmQoZ3VhcmQsIGl0ZW0pO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLmRiLnRyYW5zYWN0aW9uKGFzeW5jICh0eCkgPT5cbiAgICAgIHRoaXMuZXhlY3V0ZVRyYW5zaXRpb25UeCh0eCwgaXRlbSwgaW5wdXQudG8sIGlucHV0LmFjdG9ySWQsIGlucHV0LmlkZW1wb3RlbmN5S2V5KSxcbiAgICApO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBjaGVja0d1YXJkKGd1YXJkOiBUcmFuc2l0aW9uUnVsZVsnZ3VhcmRzJ11bbnVtYmVyXSwgaXRlbTogV29ya0l0ZW1Sb3cpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBzd2l0Y2ggKGd1YXJkKSB7XG4gICAgICBjYXNlICdkZXBzX2RvbmUnOiB7XG4gICAgICAgIGZvciAoY29uc3QgZGVwS2V5IG9mIGl0ZW0uZGVwZW5kc09uKSB7XG4gICAgICAgICAgY29uc3QgZGVwID0gKFxuICAgICAgICAgICAgYXdhaXQgdGhpcy5kYlxuICAgICAgICAgICAgICAuc2VsZWN0KClcbiAgICAgICAgICAgICAgLmZyb20od29ya0l0ZW1zKVxuICAgICAgICAgICAgICAud2hlcmUoYW5kKGVxKHdvcmtJdGVtcy5mZWF0dXJlSWQsIGl0ZW0uZmVhdHVyZUlkKSwgZXEod29ya0l0ZW1zLmV4dGVybmFsS2V5LCBkZXBLZXkpKSlcbiAgICAgICAgICAgICAgLm9yZGVyQnkoYXNjKHdvcmtJdGVtcy5zZXEpKVxuICAgICAgICAgICAgICAubGltaXQoMSlcbiAgICAgICAgICApWzBdO1xuICAgICAgICAgIGlmIChkZXAgJiYgZGVwLnN0YXRlICE9PSAnZG9uZScpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBHdWFyZEZhaWxlZEVycm9yKGBkZXBlbmRlbmN5ICR7ZGVwS2V5fSBpcyBub3QgZG9uZWApO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBjYXNlICdzcGVjX2dhdGVfaWZfY2hlY2twb2ludCc6IHtcbiAgICAgICAgaWYgKCFpdGVtLnNwZWNDaGVja3BvaW50KSByZXR1cm47XG4gICAgICAgIGNvbnN0IGFwcHJvdmVkID0gKFxuICAgICAgICAgIGF3YWl0IHRoaXMuZGJcbiAgICAgICAgICAgIC5zZWxlY3QoeyBzZXE6IGdhdGVEZWNpc2lvbnMuc2VxIH0pXG4gICAgICAgICAgICAuZnJvbShnYXRlRGVjaXNpb25zKVxuICAgICAgICAgICAgLndoZXJlKFxuICAgICAgICAgICAgICBhbmQoXG4gICAgICAgICAgICAgICAgZXEoZ2F0ZURlY2lzaW9ucy53b3JrSXRlbUlkLCBpdGVtLmlkKSxcbiAgICAgICAgICAgICAgICBlcShnYXRlRGVjaXNpb25zLmdhdGUsICdzcGVjX2FwcHJvdmFsJyksXG4gICAgICAgICAgICAgICAgZXEoZ2F0ZURlY2lzaW9ucy5kZWNpc2lvbiwgJ2FwcHJvdmVkJyksXG4gICAgICAgICAgICAgICksXG4gICAgICAgICAgICApXG4gICAgICAgICAgICAubGltaXQoMSlcbiAgICAgICAgKVswXTtcbiAgICAgICAgaWYgKCFhcHByb3ZlZCkge1xuICAgICAgICAgIHRocm93IG5ldyBHdWFyZEZhaWxlZEVycm9yKCdzcGVjX2NoZWNrcG9pbnQgcmVxdWlyZXMgYW4gYXBwcm92ZWQgc3BlY19hcHByb3ZhbCBnYXRlIGRlY2lzaW9uJyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgY2FzZSAnbm9uZW1wdHlfZGlmZic6IHtcbiAgICAgICAgLy8gUGhhc2UgNCAocm9hZG1hcCBcdTAwQTcxLjQpOiBraW5kIHNlbGVjdHMgV0hJQ0ggbWFjaGluZSBldmlkZW5jZSBhcHBsaWVzLlxuICAgICAgICBpZiAoaXRlbS5raW5kICE9PSAnY29kZScpIHtcbiAgICAgICAgICAvLyBEb2Mga2luZHM6IHRoZSBsYXRlc3QgZG9jX2xpbnQgKGlmIGFueSkgbXVzdCBiZSBzY2hlbWEtdmFsaWQ7XG4gICAgICAgICAgLy8gZ2l0X2RpZmYgaXMgbmV2ZXIgY29uc3VsdGVkIGZvciBub24tY29kZSBkZWxpdmVyYWJsZXMuXG4gICAgICAgICAgY29uc3QgbGludHMgPSBhd2FpdCB0aGlzLmRiXG4gICAgICAgICAgICAuc2VsZWN0KClcbiAgICAgICAgICAgIC5mcm9tKGV2aWRlbmNlVGFibGUpXG4gICAgICAgICAgICAud2hlcmUoYW5kKGVxKGV2aWRlbmNlVGFibGUud29ya0l0ZW1JZCwgaXRlbS5pZCksIGVxKGV2aWRlbmNlVGFibGUua2luZCwgJ2RvY19saW50JykpKVxuICAgICAgICAgICAgLm9yZGVyQnkoYXNjKGV2aWRlbmNlVGFibGUuc2VxKSk7XG4gICAgICAgICAgY29uc3QgbGF0ZXN0TGludCA9IGxpbnRzW2xpbnRzLmxlbmd0aCAtIDFdO1xuICAgICAgICAgIGlmIChsYXRlc3RMaW50ICYmIGxhdGVzdExpbnQucGF5bG9hZFsnc2NoZW1hVmFsaWQnXSAhPT0gdHJ1ZSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoJ3RoZSBsYXRlc3QgZG9jX2xpbnQgZXZpZGVuY2UgZmFpbGVkIFx1MjAxNCBkb2N1bWVudCBpcyBub3Qgc2NoZW1hLXZhbGlkJyk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICAvLyBUaGUgTEFURVNUIHN1Ym1pdHRlZCBnaXRfZGlmZiwgaWYgYW55LCBtdXN0IGJlIG5vbi1lbXB0eSBcdTIwMTQgdGhlXG4gICAgICAgIC8vIGZha2UtZG9uZSBkZW55LiBBYnNlbmNlIGlzIG5vdCBjaGVja2VkIGhlcmUgKENPTkZPUk1BTkNFLm1kIHBpbikuXG4gICAgICAgIGNvbnN0IHJvd3MgPSBhd2FpdCB0aGlzLmRiXG4gICAgICAgICAgLnNlbGVjdCgpXG4gICAgICAgICAgLmZyb20oZXZpZGVuY2VUYWJsZSlcbiAgICAgICAgICAud2hlcmUoYW5kKGVxKGV2aWRlbmNlVGFibGUud29ya0l0ZW1JZCwgaXRlbS5pZCksIGVxKGV2aWRlbmNlVGFibGUua2luZCwgJ2dpdF9kaWZmJykpKVxuICAgICAgICAgIC5vcmRlckJ5KGFzYyhldmlkZW5jZVRhYmxlLnNlcSkpO1xuICAgICAgICBjb25zdCBsYXRlc3QgPSByb3dzW3Jvd3MubGVuZ3RoIC0gMV07XG4gICAgICAgIGlmIChsYXRlc3QgJiYgbGF0ZXN0LnBheWxvYWRbJ25vbkVtcHR5J10gIT09IHRydWUpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcigndGhlIGxhdGVzdCBnaXRfZGlmZiBldmlkZW5jZSBpcyBlbXB0eSBcdTIwMTQgbm90aGluZyB0byByZXZpZXcnKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBwcml2aWxlZ2VkRG93bmdyYWRlKGl0ZW06IFdvcmtJdGVtUm93LCBpbnB1dDogQWR2YW5jZUlucHV0KTogUHJvbWlzZTxXb3JrSXRlbT4ge1xuICAgIGF3YWl0IHRoaXMudmFsaWRhdGVQcmVzZW50ZWRUb2tlbihpdGVtLCBpbnB1dC5mZW5jaW5nVG9rZW4sIGlucHV0LmFjdG9ySWQpO1xuICAgIGlmIChpdGVtLmJsb2NrZWRSZWFzb24gIT09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBHdWFyZEZhaWxlZEVycm9yKGB3b3JrIGl0ZW0gaXMgYmxvY2tlZDogJHtpdGVtLmJsb2NrZWRSZWFzb259YCk7XG4gICAgfVxuICAgIGNvbnN0IGZyb20gPSBpdGVtLnN0YXRlO1xuICAgIHJldHVybiB0aGlzLmRiLnRyYW5zYWN0aW9uKGFzeW5jICh0eCkgPT4ge1xuICAgICAgY29uc3QgdXBkYXRlZCA9IGF3YWl0IHR4XG4gICAgICAgIC51cGRhdGUod29ya0l0ZW1zKVxuICAgICAgICAuc2V0KHsgc3RhdGU6IGlucHV0LnRvLCBzdGF0ZVZlcnNpb246IGl0ZW0uc3RhdGVWZXJzaW9uICsgMSB9KVxuICAgICAgICAud2hlcmUoYW5kKGVxKHdvcmtJdGVtcy5pZCwgaXRlbS5pZCksIGVxKHdvcmtJdGVtcy5zdGF0ZVZlcnNpb24sIGl0ZW0uc3RhdGVWZXJzaW9uKSkpXG4gICAgICAgIC5yZXR1cm5pbmcoeyBpZDogd29ya0l0ZW1zLmlkIH0pO1xuICAgICAgaWYgKHVwZGF0ZWQubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHRocm93IG5ldyBDb25mbGljdEVycm9yKGBzdGF0ZV92ZXJzaW9uIGNvbmZsaWN0IG9uIHdvcmsgaXRlbSAke2l0ZW0uaWR9YCk7XG4gICAgICB9XG4gICAgICBhd2FpdCB0aGlzLmFwcGVuZFR4KFxuICAgICAgICB0eCxcbiAgICAgICAgJ3dvcmtfaXRlbScsXG4gICAgICAgIGl0ZW0uaWQsXG4gICAgICAgICd3b3JrX2l0ZW0uc3RhdGVfZG93bmdyYWRlZCcsXG4gICAgICAgIGlucHV0LmFjdG9ySWQsXG4gICAgICAgIHsgZnJvbSwgdG86IGlucHV0LnRvLCBjb21wZW5zYXRpbmc6IHRydWUgfSxcbiAgICAgICAgaW5wdXQuaWRlbXBvdGVuY3lLZXkgIT09IHVuZGVmaW5lZCA/IHsgaWRlbXBvdGVuY3lLZXk6IGlucHV0LmlkZW1wb3RlbmN5S2V5IH0gOiB1bmRlZmluZWQsXG4gICAgICApO1xuICAgICAgY29uc3QgcmVzdWx0ID0gdGhpcy5wdWJsaWNJdGVtKHsgLi4uaXRlbSwgc3RhdGU6IGlucHV0LnRvLCBzdGF0ZVZlcnNpb246IGl0ZW0uc3RhdGVWZXJzaW9uICsgMSB9KTtcbiAgICAgIGlmIChpbnB1dC5pZGVtcG90ZW5jeUtleSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGF3YWl0IHR4XG4gICAgICAgICAgLmluc2VydChpZGVtcG90ZW5jeUtleXMpXG4gICAgICAgICAgLnZhbHVlcyh7IGtleTogaW5wdXQuaWRlbXBvdGVuY3lLZXksIHJlc3VsdDogcmVzdWx0IGFzIHVua25vd24gYXMgUmVjb3JkPHN0cmluZywgdW5rbm93bj4gfSlcbiAgICAgICAgICAub25Db25mbGljdERvTm90aGluZygpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKiBTaGFyZWQgYnkgYWR2YW5jZVN0YXRlIGFuZCB0aGUgZ2F0ZS1maXJlZCB0cmFuc2l0aW9ucy4gT05FIHRyYW5zYWN0aW9uIHBlciBjb21tYW5kLiAqL1xuICBwcml2YXRlIGFzeW5jIGV4ZWN1dGVUcmFuc2l0aW9uVHgoXG4gICAgdHg6IFR4LFxuICAgIGl0ZW06IFdvcmtJdGVtUm93LFxuICAgIHRvOiBXb3JrSXRlbVN0YXRlLFxuICAgIGFjdG9ySWQ6IHN0cmluZyxcbiAgICBpZGVtcG90ZW5jeUtleT86IHN0cmluZyxcbiAgICBjYXVzYXRpb25JZD86IHN0cmluZyxcbiAgKTogUHJvbWlzZTxXb3JrSXRlbT4ge1xuICAgIGNvbnN0IGZyb20gPSBpdGVtLnN0YXRlIGFzIFdvcmtJdGVtU3RhdGU7XG4gICAgLy8gQ0FTOiBvcHRpbWlzdGljIGNvbmN1cnJlbmN5IGJ5IHN0YXRlX3ZlcnNpb24gKHJvYWRtYXAgXHUwMEE3MS4xKS5cbiAgICBjb25zdCB1cGRhdGVkID0gYXdhaXQgdHhcbiAgICAgIC51cGRhdGUod29ya0l0ZW1zKVxuICAgICAgLnNldCh7IHN0YXRlOiB0bywgc3RhdGVWZXJzaW9uOiBpdGVtLnN0YXRlVmVyc2lvbiArIDEgfSlcbiAgICAgIC53aGVyZShhbmQoZXEod29ya0l0ZW1zLmlkLCBpdGVtLmlkKSwgZXEod29ya0l0ZW1zLnN0YXRlVmVyc2lvbiwgaXRlbS5zdGF0ZVZlcnNpb24pKSlcbiAgICAgIC5yZXR1cm5pbmcoeyBpZDogd29ya0l0ZW1zLmlkIH0pO1xuICAgIGlmICh1cGRhdGVkLmxlbmd0aCA9PT0gMCkge1xuICAgICAgdGhyb3cgbmV3IENvbmZsaWN0RXJyb3IoYHN0YXRlX3ZlcnNpb24gY29uZmxpY3Qgb24gd29yayBpdGVtICR7aXRlbS5pZH1gKTtcbiAgICB9XG4gICAgY29uc3QgZXZlbnQgPSBhd2FpdCB0aGlzLmFwcGVuZFR4KFxuICAgICAgdHgsXG4gICAgICAnd29ya19pdGVtJyxcbiAgICAgIGl0ZW0uaWQsXG4gICAgICAnd29ya19pdGVtLnN0YXRlX2NoYW5nZWQnLFxuICAgICAgYWN0b3JJZCxcbiAgICAgIHsgZnJvbSwgdG8gfSxcbiAgICAgIHtcbiAgICAgICAgLi4uKGNhdXNhdGlvbklkICE9PSB1bmRlZmluZWQgPyB7IGNhdXNhdGlvbklkIH0gOiB7fSksXG4gICAgICAgIC4uLihpZGVtcG90ZW5jeUtleSAhPT0gdW5kZWZpbmVkID8geyBpZGVtcG90ZW5jeUtleSB9IDoge30pLFxuICAgICAgfSxcbiAgICApO1xuXG4gICAgLy8gRXBpYy1saWZ0IHByb2plY3RvciAocm9hZG1hcCBcdTAwQTcxLjIpOiBmaXJzdCBjaGlsZCBMRUFWSU5HIGJhY2tsb2cgbGlmdHNcbiAgICAvLyB0aGUgZmVhdHVyZTsgaWRlbXBvdGVudCBieSBjaGVjazsgYXV0aG9yZWQgYnkgdGhlIHN5c3RlbSBhY3Rvci5cbiAgICBpZiAoZnJvbSA9PT0gJ2JhY2tsb2cnICYmIHRvICE9PSAnYmFja2xvZycpIHtcbiAgICAgIGNvbnN0IGZlYXR1cmUgPSBhd2FpdCB0aGlzLmdldEZlYXR1cmVSb3coaXRlbS5mZWF0dXJlSWQsIHR4KTtcbiAgICAgIGlmIChmZWF0dXJlICYmIGZlYXR1cmUuc3RhdGUgPT09ICdiYWNrbG9nJykge1xuICAgICAgICBhd2FpdCB0eC51cGRhdGUoZmVhdHVyZXMpLnNldCh7IHN0YXRlOiAnaW5fcHJvZ3Jlc3MnIH0pLndoZXJlKGVxKGZlYXR1cmVzLmlkLCBmZWF0dXJlLmlkKSk7XG4gICAgICAgIGF3YWl0IHRoaXMuYXBwZW5kVHgoXG4gICAgICAgICAgdHgsXG4gICAgICAgICAgJ2ZlYXR1cmUnLFxuICAgICAgICAgIGZlYXR1cmUuaWQsXG4gICAgICAgICAgJ2ZlYXR1cmUuc3RhdGVfY2hhbmdlZCcsXG4gICAgICAgICAgdGhpcy5zeXN0ZW1BY3RvcklkLFxuICAgICAgICAgIHsgZnJvbTogJ2JhY2tsb2cnLCB0bzogJ2luX3Byb2dyZXNzJyB9LFxuICAgICAgICAgIHsgY2F1c2F0aW9uSWQ6IFN0cmluZyhldmVudC5nbG9iYWxTZXEpIH0sXG4gICAgICAgICk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gZG9uZV9jaGVja3BvaW50IChyb2FkbWFwIFx1MDBBNzEuMSk6IHRoZSBzdG9yeSBjb21wbGV0ZXMgbm9ybWFsbHk7IHRoZSBob2xkXG4gICAgLy8gbWF0ZXJpYWxpemVzIG9uIHRoZSBmZWF0dXJlIGV4YWN0bHkgYXQgY29tcGxldGlvbi5cbiAgICBpZiAodG8gPT09ICdkb25lJyAmJiBpdGVtLmRvbmVDaGVja3BvaW50KSB7XG4gICAgICBjb25zdCBmZWF0dXJlID0gYXdhaXQgdGhpcy5nZXRGZWF0dXJlUm93KGl0ZW0uZmVhdHVyZUlkLCB0eCk7XG4gICAgICBpZiAoZmVhdHVyZSAmJiAhZmVhdHVyZS5kaXNwYXRjaEhvbGQpIHtcbiAgICAgICAgYXdhaXQgdHgudXBkYXRlKGZlYXR1cmVzKS5zZXQoeyBkaXNwYXRjaEhvbGQ6IHRydWUgfSkud2hlcmUoZXEoZmVhdHVyZXMuaWQsIGZlYXR1cmUuaWQpKTtcbiAgICAgICAgYXdhaXQgdGhpcy5hcHBlbmRUeChcbiAgICAgICAgICB0eCxcbiAgICAgICAgICAnZmVhdHVyZScsXG4gICAgICAgICAgZmVhdHVyZS5pZCxcbiAgICAgICAgICAnZmVhdHVyZS5kaXNwYXRjaF9ob2xkX3JhaXNlZCcsXG4gICAgICAgICAgdGhpcy5zeXN0ZW1BY3RvcklkLFxuICAgICAgICAgIHsgd29ya0l0ZW1JZDogaXRlbS5pZCB9LFxuICAgICAgICAgIHsgY2F1c2F0aW9uSWQ6IFN0cmluZyhldmVudC5nbG9iYWxTZXEpIH0sXG4gICAgICAgICk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gUmFpbHMgXHUyMTkyIGNoYXQ6IG5hcnJhdGUgdGhlIHRyYW5zaXRpb24gaW50byBib3VuZCB0YXNrIHRocmVhZHMgKFx1MDBBNzUuMikuXG4gICAgLy8gTWlycm9yIG9mIHRoZSByZWZlcmVuY2U6IEVWRVJZIGV4ZWN1dGVUcmFuc2l0aW9uIG5hcnJhdGVzIChnYXRlLWZpcmVkLFxuICAgIC8vIGxvb3BiYWNrIGluY2x1ZGVkKTsgcHJpdmlsZWdlZERvd25ncmFkZSBkb2VzIE5PVCBnbyB0aHJvdWdoIGhlcmUgYW5kXG4gICAgLy8gdGhlcmVmb3JlIGRvZXMgbm90IG5hcnJhdGUgXHUyMDE0IGV4YWN0bHkgbGlrZSB0aGUgcmVmZXJlbmNlIGVuZ2luZS5cbiAgICBhd2FpdCB0aGlzLm5hcnJhdGVXb3JrSXRlbVR4KHR4LCBpdGVtLmlkLCBgc3RhdGU6ICR7ZnJvbX0gXHUyMTkyICR7dG99YCk7XG5cbiAgICBjb25zdCByZXN1bHQgPSB0aGlzLnB1YmxpY0l0ZW0oeyAuLi5pdGVtLCBzdGF0ZTogdG8sIHN0YXRlVmVyc2lvbjogaXRlbS5zdGF0ZVZlcnNpb24gKyAxIH0pO1xuICAgIGlmIChpZGVtcG90ZW5jeUtleSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBhd2FpdCB0eFxuICAgICAgICAuaW5zZXJ0KGlkZW1wb3RlbmN5S2V5cylcbiAgICAgICAgLnZhbHVlcyh7IGtleTogaWRlbXBvdGVuY3lLZXksIHJlc3VsdDogcmVzdWx0IGFzIHVua25vd24gYXMgUmVjb3JkPHN0cmluZywgdW5rbm93bj4gfSlcbiAgICAgICAgLm9uQ29uZmxpY3REb05vdGhpbmcoKTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIGFzeW5jIGJsb2NrVGFzayhpbnB1dDoge1xuICAgIHdvcmtJdGVtSWQ6IHN0cmluZztcbiAgICByZWFzb246IEJsb2NrZWRSZWFzb247XG4gICAgYWN0b3JJZDogc3RyaW5nO1xuICAgIGZlbmNpbmdUb2tlbj86IG51bWJlcjtcbiAgfSk6IFByb21pc2U8V29ya0l0ZW0+IHtcbiAgICBjb25zdCBpdGVtID0gYXdhaXQgdGhpcy5tdXN0R2V0SXRlbShpbnB1dC53b3JrSXRlbUlkKTtcbiAgICBpZiAoIShCTE9DS0VEX1JFQVNPTlMgYXMgcmVhZG9ubHkgc3RyaW5nW10pLmluY2x1ZGVzKGlucHV0LnJlYXNvbikpIHtcbiAgICAgIHRocm93IG5ldyBHdWFyZEZhaWxlZEVycm9yKGB1bmtub3duIGJsb2NraW5nIGNvbmRpdGlvbjogJHtpbnB1dC5yZWFzb259YCk7XG4gICAgfVxuICAgIGF3YWl0IHRoaXMudmFsaWRhdGVQcmVzZW50ZWRUb2tlbihpdGVtLCBpbnB1dC5mZW5jaW5nVG9rZW4sIGlucHV0LmFjdG9ySWQpO1xuICAgIGF3YWl0IHRoaXMucmVxdWlyZVBlcm1pc3Npb24oaW5wdXQuYWN0b3JJZCwgJ3Rhc2suYmxvY2snKTtcbiAgICByZXR1cm4gdGhpcy5kYi50cmFuc2FjdGlvbihhc3luYyAodHgpID0+IHtcbiAgICAgIGF3YWl0IHR4XG4gICAgICAgIC51cGRhdGUod29ya0l0ZW1zKVxuICAgICAgICAuc2V0KHsgYmxvY2tlZFJlYXNvbjogaW5wdXQucmVhc29uLCBzdGF0ZVZlcnNpb246IGl0ZW0uc3RhdGVWZXJzaW9uICsgMSB9KVxuICAgICAgICAud2hlcmUoZXEod29ya0l0ZW1zLmlkLCBpdGVtLmlkKSk7XG4gICAgICBhd2FpdCB0aGlzLmFwcGVuZFR4KHR4LCAnd29ya19pdGVtJywgaXRlbS5pZCwgJ3dvcmtfaXRlbS5ibG9ja2VkJywgaW5wdXQuYWN0b3JJZCwge1xuICAgICAgICByZWFzb246IGlucHV0LnJlYXNvbixcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIHRoaXMucHVibGljSXRlbSh7IC4uLml0ZW0sIGJsb2NrZWRSZWFzb246IGlucHV0LnJlYXNvbiwgc3RhdGVWZXJzaW9uOiBpdGVtLnN0YXRlVmVyc2lvbiArIDEgfSk7XG4gICAgfSk7XG4gIH1cblxuICBhc3luYyB1bmJsb2NrVGFzayhpbnB1dDogeyB3b3JrSXRlbUlkOiBzdHJpbmc7IGFjdG9ySWQ6IHN0cmluZyB9KTogUHJvbWlzZTxXb3JrSXRlbT4ge1xuICAgIGNvbnN0IGl0ZW0gPSBhd2FpdCB0aGlzLm11c3RHZXRJdGVtKGlucHV0LndvcmtJdGVtSWQpO1xuICAgIC8vIFx1MDBBNzQuMjogcmV2aWV3X25vbl9jb252ZXJnZW5jZSBjYW4gb25seSBiZSByZWxlYXNlZCBieSBhIHJldmlldy1nYXRlXG4gICAgLy8gaG9sZGVyOyBvcmRpbmFyeSBibG9ja3MgcmVsZWFzZSB1bmRlciB0YXNrLmJsb2NrLlxuICAgIGlmIChpdGVtLmJsb2NrZWRSZWFzb24gPT09ICdyZXZpZXdfbm9uX2NvbnZlcmdlbmNlJykge1xuICAgICAgYXdhaXQgdGhpcy5yZXF1aXJlUGVybWlzc2lvbihpbnB1dC5hY3RvcklkLCAnZ2F0ZS5yZXZpZXcuYXBwcm92ZScpO1xuICAgIH0gZWxzZSB7XG4gICAgICBhd2FpdCB0aGlzLnJlcXVpcmVQZXJtaXNzaW9uKGlucHV0LmFjdG9ySWQsICd0YXNrLmJsb2NrJyk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmRiLnRyYW5zYWN0aW9uKGFzeW5jICh0eCkgPT4ge1xuICAgICAgYXdhaXQgdHhcbiAgICAgICAgLnVwZGF0ZSh3b3JrSXRlbXMpXG4gICAgICAgIC5zZXQoeyBibG9ja2VkUmVhc29uOiBudWxsLCBzdGF0ZVZlcnNpb246IGl0ZW0uc3RhdGVWZXJzaW9uICsgMSB9KVxuICAgICAgICAud2hlcmUoZXEod29ya0l0ZW1zLmlkLCBpdGVtLmlkKSk7XG4gICAgICBhd2FpdCB0aGlzLmFwcGVuZFR4KHR4LCAnd29ya19pdGVtJywgaXRlbS5pZCwgJ3dvcmtfaXRlbS51bmJsb2NrZWQnLCBpbnB1dC5hY3RvcklkLCB7fSk7XG4gICAgICByZXR1cm4gdGhpcy5wdWJsaWNJdGVtKHsgLi4uaXRlbSwgYmxvY2tlZFJlYXNvbjogbnVsbCwgc3RhdGVWZXJzaW9uOiBpdGVtLnN0YXRlVmVyc2lvbiArIDEgfSk7XG4gICAgfSk7XG4gIH1cblxuICAvLyAtLSBnYXRlcyAmIGV2aWRlbmNlIChyb2FkbWFwIFx1MDBBNzEuNCkgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgYXN5bmMgc3VibWl0RXZpZGVuY2UoaW5wdXQ6IHtcbiAgICB3b3JrSXRlbUlkOiBzdHJpbmc7XG4gICAgZXZpZGVuY2U6IEV2aWRlbmNlO1xuICAgIGFjdG9ySWQ6IHN0cmluZztcbiAgICBmZW5jaW5nVG9rZW4/OiBudW1iZXI7XG4gIH0pOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCBpdGVtID0gYXdhaXQgdGhpcy5tdXN0R2V0SXRlbShpbnB1dC53b3JrSXRlbUlkKTtcbiAgICBhd2FpdCB0aGlzLnZhbGlkYXRlUHJlc2VudGVkVG9rZW4oaXRlbSwgaW5wdXQuZmVuY2luZ1Rva2VuLCBpbnB1dC5hY3RvcklkKTtcbiAgICBhd2FpdCB0aGlzLmRiLnRyYW5zYWN0aW9uKGFzeW5jICh0eCkgPT4ge1xuICAgICAgYXdhaXQgdHguaW5zZXJ0KGV2aWRlbmNlVGFibGUpLnZhbHVlcyh7XG4gICAgICAgIHdvcmtJdGVtSWQ6IGl0ZW0uaWQsXG4gICAgICAgIGtpbmQ6IGlucHV0LmV2aWRlbmNlLmtpbmQsXG4gICAgICAgIHBheWxvYWQ6IGlucHV0LmV2aWRlbmNlLnBheWxvYWQsXG4gICAgICB9KTtcbiAgICAgIGF3YWl0IHRoaXMuYXBwZW5kVHgodHgsICd3b3JrX2l0ZW0nLCBpdGVtLmlkLCAnZXZpZGVuY2Uuc3VibWl0dGVkJywgaW5wdXQuYWN0b3JJZCwge1xuICAgICAgICBraW5kOiBpbnB1dC5ldmlkZW5jZS5raW5kLFxuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICBhc3luYyBhcHByb3ZlR2F0ZShpbnB1dDogR2F0ZURlY2lzaW9uSW5wdXQpOiBQcm9taXNlPFdvcmtJdGVtPiB7XG4gICAgY29uc3QgaXRlbSA9IGF3YWl0IHRoaXMubXVzdEdldEl0ZW0oaW5wdXQud29ya0l0ZW1JZCk7XG5cbiAgICBpZiAoaW5wdXQuZ2F0ZSA9PT0gJ3NwZWNfYXBwcm92YWwnKSB7XG4gICAgICAvLyBQZXJtaXNzaW9uIHByZWNlZGVzIGFueSBlZmZlY3Q6IGEgZGVuaWVkIGF0dGVtcHQgcGlucyBub3RoaW5nLlxuICAgICAgYXdhaXQgdGhpcy5yZXF1aXJlUGVybWlzc2lvbihpbnB1dC5hY3RvcklkLCAnZ2F0ZS5zcGVjLmFwcHJvdmUnKTtcbiAgICAgIGlmIChpdGVtLmJsb2NrZWRSZWFzb24gIT09IG51bGwpIHtcbiAgICAgICAgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoYHdvcmsgaXRlbSBpcyBibG9ja2VkOiAke2l0ZW0uYmxvY2tlZFJlYXNvbn1gKTtcbiAgICAgIH1cbiAgICAgIGlmIChpdGVtLnN0YXRlICE9PSAnZHJhZnQnKSB7XG4gICAgICAgIHRocm93IG5ldyBHdWFyZEZhaWxlZEVycm9yKGBzcGVjX2FwcHJvdmFsIGFwcGxpZXMgdG8gZHJhZnQgaXRlbXMsIG5vdCAke2l0ZW0uc3RhdGV9YCk7XG4gICAgICB9XG4gICAgICBjb25zdCBxdW9ydW1NZXQgPSBhd2FpdCB0aGlzLnF1b3J1bVdvdWxkQmVNZXQoaXRlbSwgJ3NwZWNfYXBwcm92YWwnLCBpbnB1dC5hY3RvcklkKTtcbiAgICAgIHJldHVybiB0aGlzLmRiLnRyYW5zYWN0aW9uKGFzeW5jICh0eCkgPT4ge1xuICAgICAgICBsZXQgcGlubmVkID0gaXRlbS5waW5uZWRWZXJpZmljYXRpb247XG4gICAgICAgIGlmIChpbnB1dC5waW5uZWRWZXJpZmljYXRpb24gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIHBpbm5lZCA9IFsuLi5pbnB1dC5waW5uZWRWZXJpZmljYXRpb25dO1xuICAgICAgICAgIGF3YWl0IHR4LnVwZGF0ZSh3b3JrSXRlbXMpLnNldCh7IHBpbm5lZFZlcmlmaWNhdGlvbjogcGlubmVkIH0pLndoZXJlKGVxKHdvcmtJdGVtcy5pZCwgaXRlbS5pZCkpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHBpbm5lZEl0ZW0gPSB7IC4uLml0ZW0sIHBpbm5lZFZlcmlmaWNhdGlvbjogcGlubmVkIH07XG4gICAgICAgIGF3YWl0IHRoaXMucmVjb3JkQXBwcm92YWxUeCh0eCwgcGlubmVkSXRlbSwgJ3NwZWNfYXBwcm92YWwnLCBpbnB1dC5hY3RvcklkKTtcbiAgICAgICAgaWYgKCFxdW9ydW1NZXQpIHtcbiAgICAgICAgICAvLyBEZWNpc2lvbiByZWNvcmRlZDsgcXVvcnVtIHBlbmRpbmcgKGdhdGUgcG9saWN5IGlzIGRhdGEsIHJvYWRtYXAgXHUwMEE3MykuXG4gICAgICAgICAgcmV0dXJuIHRoaXMucHVibGljSXRlbShwaW5uZWRJdGVtKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBUaGUgYXBwcm92YWwgZmlyZXMgdGhlIGdhdGVkIGZvcndhcmQgdHJhbnNpdGlvbiAoY29uZm9ybWFuY2UgcGluKS5cbiAgICAgICAgcmV0dXJuIHRoaXMuZXhlY3V0ZVRyYW5zaXRpb25UeCh0eCwgcGlubmVkSXRlbSwgJ3JlYWR5X2Zvcl9kZXYnLCBpbnB1dC5hY3RvcklkKTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIHJldmlld19hcHByb3ZhbFxuICAgIGF3YWl0IHRoaXMucmVxdWlyZVBlcm1pc3Npb24oaW5wdXQuYWN0b3JJZCwgJ2dhdGUucmV2aWV3LmFwcHJvdmUnKTtcbiAgICBpZiAoaXRlbS5ibG9ja2VkUmVhc29uICE9PSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcihgd29yayBpdGVtIGlzIGJsb2NrZWQ6ICR7aXRlbS5ibG9ja2VkUmVhc29ufWApO1xuICAgIH1cbiAgICBpZiAoaXRlbS5zdGF0ZSAhPT0gJ2luX3JldmlldycpIHtcbiAgICAgIHRocm93IG5ldyBHdWFyZEZhaWxlZEVycm9yKGByZXZpZXdfYXBwcm92YWwgYXBwbGllcyB0byBpbl9yZXZpZXcgaXRlbXMsIG5vdCAke2l0ZW0uc3RhdGV9YCk7XG4gICAgfVxuICAgIGNvbnN0IHF1b3J1bU1ldCA9IGF3YWl0IHRoaXMucXVvcnVtV291bGRCZU1ldChpdGVtLCAncmV2aWV3X2FwcHJvdmFsJywgaW5wdXQuYWN0b3JJZCk7XG4gICAgLy8gRXZpZGVuY2UgaXMgY2hlY2tlZCBleGFjdGx5IHdoZW4gdGhlIHF1b3J1bSB3b3VsZCBjb21wbGV0ZSwgc28gYSBmYWlsZWRcbiAgICAvLyBhcHByb3ZhbCByZWNvcmRzIG5vdGhpbmcgKFBoYXNlIDEgcGluOiBkZW5pZWQgYXR0ZW1wdHMgbXV0YXRlIG5vdGhpbmcpLlxuICAgIGlmIChxdW9ydW1NZXQpIGF3YWl0IHRoaXMuY2hlY2tSZXZpZXdFdmlkZW5jZShpdGVtKTtcbiAgICByZXR1cm4gdGhpcy5kYi50cmFuc2FjdGlvbihhc3luYyAodHgpID0+IHtcbiAgICAgIGF3YWl0IHRoaXMucmVjb3JkQXBwcm92YWxUeCh0eCwgaXRlbSwgJ3Jldmlld19hcHByb3ZhbCcsIGlucHV0LmFjdG9ySWQpO1xuICAgICAgaWYgKCFxdW9ydW1NZXQpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMucHVibGljSXRlbShpdGVtKTsgLy8gcXVvcnVtIHBlbmRpbmcgXHUyMDE0IG5vIHRyYW5zaXRpb24geWV0XG4gICAgICB9XG4gICAgICByZXR1cm4gdGhpcy5leGVjdXRlVHJhbnNpdGlvblR4KHR4LCBpdGVtLCAnZG9uZScsIGlucHV0LmFjdG9ySWQpO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqIERpc3RpbmN0IGFwcHJvdmVycyBvZiB0aGlzIHJvdW5kIChyb3VuZCA9IHJldmlld0xvb3BJdGVyYXRpb24gYXQgZGVjaXNpb24gdGltZSkuICovXG4gIHByaXZhdGUgYXN5bmMgcm91bmRBcHByb3ZlcnMoaXRlbTogV29ya0l0ZW1Sb3csIGdhdGU6IEdhdGVDb2RlKTogUHJvbWlzZTxBY3RvclJvd1tdPiB7XG4gICAgY29uc3Qgcm93cyA9IGF3YWl0IHRoaXMuZGJcbiAgICAgIC5zZWxlY3QoeyBhY3RvcklkOiBnYXRlRGVjaXNpb25zLmFjdG9ySWQgfSlcbiAgICAgIC5mcm9tKGdhdGVEZWNpc2lvbnMpXG4gICAgICAud2hlcmUoXG4gICAgICAgIGFuZChcbiAgICAgICAgICBlcShnYXRlRGVjaXNpb25zLndvcmtJdGVtSWQsIGl0ZW0uaWQpLFxuICAgICAgICAgIGVxKGdhdGVEZWNpc2lvbnMuZ2F0ZSwgZ2F0ZSksXG4gICAgICAgICAgZXEoZ2F0ZURlY2lzaW9ucy5kZWNpc2lvbiwgJ2FwcHJvdmVkJyksXG4gICAgICAgICAgZXEoZ2F0ZURlY2lzaW9ucy5yb3VuZCwgaXRlbS5yZXZpZXdMb29wSXRlcmF0aW9uKSxcbiAgICAgICAgKSxcbiAgICAgIClcbiAgICAgIC5vcmRlckJ5KGFzYyhnYXRlRGVjaXNpb25zLnNlcSkpO1xuICAgIGNvbnN0IGlkcyA9IFsuLi5uZXcgU2V0KHJvd3MubWFwKChyb3cpID0+IHJvdy5hY3RvcklkKSldO1xuICAgIGNvbnN0IHJlc3VsdDogQWN0b3JSb3dbXSA9IFtdO1xuICAgIGZvciAoY29uc3QgaWQgb2YgaWRzKSB7XG4gICAgICBjb25zdCBhY3RvciA9IGF3YWl0IHRoaXMuZ2V0QWN0b3JSb3coaWQpO1xuICAgICAgaWYgKGFjdG9yKSByZXN1bHQucHVzaChhY3Rvcik7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICAvKiogR2F0ZSBwb2xpY3kgcXVvcnVtIChyb2FkbWFwIFx1MDBBNzMpOiBtaW4gZGlzdGluY3QgYXBwcm92ZXJzICsgcmVxdWlyZWQgYWN0b3IgdHlwZXMsIGFzIERBVEEuICovXG4gIHByaXZhdGUgYXN5bmMgcXVvcnVtV291bGRCZU1ldChpdGVtOiBXb3JrSXRlbVJvdywgZ2F0ZTogR2F0ZUNvZGUsIG5leHRBcHByb3ZlcklkOiBzdHJpbmcpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICBjb25zdCBwb2xpY3kgPSBhd2FpdCB0aGlzLmdldEdhdGVQb2xpY3koZ2F0ZSk7XG4gICAgY29uc3QgbWluID0gcG9saWN5Lm1pbkFwcHJvdmFscyA/PyAxO1xuICAgIGNvbnN0IHJlcXVpcmVkID0gcG9saWN5LnJlcXVpcmVkQWN0b3JUeXBlcyA/PyBbXTtcbiAgICBjb25zdCBhcHByb3ZlcnMgPSBhd2FpdCB0aGlzLnJvdW5kQXBwcm92ZXJzKGl0ZW0sIGdhdGUpO1xuICAgIGNvbnN0IG5leHRBY3RvciA9IGF3YWl0IHRoaXMuZ2V0QWN0b3JSb3cobmV4dEFwcHJvdmVySWQpO1xuICAgIGlmIChuZXh0QWN0b3IgJiYgIWFwcHJvdmVycy5zb21lKChhKSA9PiBhLmlkID09PSBuZXh0QWN0b3IuaWQpKSBhcHByb3ZlcnMucHVzaChuZXh0QWN0b3IpO1xuICAgIGlmIChhcHByb3ZlcnMubGVuZ3RoIDwgbWluKSByZXR1cm4gZmFsc2U7XG4gICAgZm9yIChjb25zdCB0eXBlIG9mIHJlcXVpcmVkKSB7XG4gICAgICBpZiAoIWFwcHJvdmVycy5zb21lKChhKSA9PiBhLnR5cGUgPT09IHR5cGUpKSByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyByZWNvcmRBcHByb3ZhbFR4KHR4OiBRdWVyeWFibGUsIGl0ZW06IFdvcmtJdGVtUm93LCBnYXRlOiBHYXRlQ29kZSwgYWN0b3JJZDogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgYXdhaXQgdHguaW5zZXJ0KGdhdGVEZWNpc2lvbnMpLnZhbHVlcyh7XG4gICAgICB3b3JrSXRlbUlkOiBpdGVtLmlkLFxuICAgICAgZ2F0ZSxcbiAgICAgIGRlY2lzaW9uOiAnYXBwcm92ZWQnLFxuICAgICAgYWN0b3JJZCxcbiAgICAgIHJvdW5kOiBpdGVtLnJldmlld0xvb3BJdGVyYXRpb24sXG4gICAgfSk7XG4gICAgYXdhaXQgdGhpcy5hcHBlbmRUeCh0eCwgJ3dvcmtfaXRlbScsIGl0ZW0uaWQsICdnYXRlLmFwcHJvdmVkJywgYWN0b3JJZCwge1xuICAgICAgZ2F0ZSxcbiAgICAgIHJvdW5kOiBpdGVtLnJldmlld0xvb3BJdGVyYXRpb24sXG4gICAgICAuLi4oZ2F0ZSA9PT0gJ3NwZWNfYXBwcm92YWwnID8geyBwaW5uZWRWZXJpZmljYXRpb246IGl0ZW0ucGlubmVkVmVyaWZpY2F0aW9uIH0gOiB7fSksXG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogRXZpZGVuY2UgY29uZGl0aW9uIG9mIHRoZSBkb25lIGdhdGUgKFx1MDBBNzEuNCwgRDcpOiBldmVyeSBQSU5ORUQgY29tbWFuZCdzXG4gICAqIGxhdGVzdCB0ZXN0X3J1biBleGl0ZWQgMCwgYW5kIHRoZSBmaW5hbCBjb21taXQgaXMgcmVhY2hhYmxlIG9uIHRoZVxuICAgKiByZW1vdGUuIHJldmlld19yZXBvcnQgaXMgbmV2ZXIgY29uc3VsdGVkLlxuICAgKi9cbiAgcHJpdmF0ZSBhc3luYyBjaGVja1Jldmlld0V2aWRlbmNlKGl0ZW06IFdvcmtJdGVtUm93KTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3Qgcm93cyA9IGF3YWl0IHRoaXMuZGJcbiAgICAgIC5zZWxlY3QoKVxuICAgICAgLmZyb20oZXZpZGVuY2VUYWJsZSlcbiAgICAgIC53aGVyZShlcShldmlkZW5jZVRhYmxlLndvcmtJdGVtSWQsIGl0ZW0uaWQpKVxuICAgICAgLm9yZGVyQnkoYXNjKGV2aWRlbmNlVGFibGUuc2VxKSk7XG4gICAgZm9yIChjb25zdCBjb21tYW5kIG9mIGl0ZW0ucGlubmVkVmVyaWZpY2F0aW9uID8/IFtdKSB7XG4gICAgICBjb25zdCBydW5zID0gcm93cy5maWx0ZXIoKHJvdykgPT4gcm93LmtpbmQgPT09ICd0ZXN0X3J1bicgJiYgcm93LnBheWxvYWRbJ2NvbW1hbmQnXSA9PT0gY29tbWFuZCk7XG4gICAgICBjb25zdCBsYXRlc3QgPSBydW5zW3J1bnMubGVuZ3RoIC0gMV07XG4gICAgICBpZiAoIWxhdGVzdCB8fCBsYXRlc3QucGF5bG9hZFsnZXhpdENvZGUnXSAhPT0gMCkge1xuICAgICAgICB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcihgcGlubmVkIHZlcmlmaWNhdGlvbiBkaWQgbm90IHBhc3M6ICR7Y29tbWFuZH1gKTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKGl0ZW0ua2luZCA9PT0gJ2NvZGUnKSB7XG4gICAgICAvLyBOb24tY29kZSBkZWxpdmVyYWJsZXMgY2Fycnkgbm8gY29tbWl0IHJlcXVpcmVtZW50IChyb2FkbWFwIFx1MDBBNzEuNCk6XG4gICAgICAvLyB0aGVpciBjb21wbGV0aW9uIHJlc3RzIG9uIG1hY2hpbmUtY2hlY2thYmxlIGRvYyBldmlkZW5jZSBwbHVzIHRoZVxuICAgICAgLy8gcGVybWl0dGVkIGFjdG9yJ3MgZGVjaXNpb24uXG4gICAgICBjb25zdCBjb21taXRPayA9IHJvd3Muc29tZSgocm93KSA9PiByb3cua2luZCA9PT0gJ2NvbW1pdCcgJiYgcm93LnBheWxvYWRbJ3JlYWNoYWJsZU9uUmVtb3RlJ10gPT09IHRydWUpO1xuICAgICAgaWYgKCFjb21taXRPaykge1xuICAgICAgICB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcihcbiAgICAgICAgICAnZmluYWwgcmV2aXNpb24gbXVzdCBiZSByZWFjaGFibGUgb24gdGhlIHJlbW90ZSAocHVzaCBpcyBwYXJ0IG9mIHRoZSBIQUxUIGNvbnRyYWN0KScsXG4gICAgICAgICk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgcmVqZWN0R2F0ZShpbnB1dDogR2F0ZURlY2lzaW9uSW5wdXQpOiBQcm9taXNlPFdvcmtJdGVtPiB7XG4gICAgY29uc3QgaXRlbSA9IGF3YWl0IHRoaXMubXVzdEdldEl0ZW0oaW5wdXQud29ya0l0ZW1JZCk7XG4gICAgaWYgKGlucHV0LmdhdGUgIT09ICdyZXZpZXdfYXBwcm92YWwnKSB7XG4gICAgICB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcignb25seSByZXZpZXdfYXBwcm92YWwgcmVqZWN0aW9uIGlzIGRlZmluZWQgaW4gUGhhc2UgMScpO1xuICAgIH1cbiAgICAvLyBQaGFzZSAyIChhZGRpdGl2ZSk6IHJlamVjdGlvbiBhdXRob3JpdHkgPSBnYXRlLnJldmlldy5hcHByb3ZlIE9SXG4gICAgLy8gZ2F0ZS5yZXZpZXcucmVqZWN0IFx1MjAxNCB0aGUgUGhhc2UgMiBleGl0IGNyaXRlcmlvbidzIHJldmlld2VyLWFnZW50IGhvbGRzXG4gICAgLy8gb25seSB0aGUgbGF0dGVyLiBFdmVyeSBQaGFzZSAxIHBpbiBvbiByZWplY3RHYXRlIGtlZXBzIGhvbGRpbmcuXG4gICAgaWYgKFxuICAgICAgIShhd2FpdCB0aGlzLmhhc1Blcm1pc3Npb24oaW5wdXQuYWN0b3JJZCwgJ2dhdGUucmV2aWV3LmFwcHJvdmUnKSkgJiZcbiAgICAgICEoYXdhaXQgdGhpcy5oYXNQZXJtaXNzaW9uKGlucHV0LmFjdG9ySWQsICdnYXRlLnJldmlldy5yZWplY3QnKSlcbiAgICApIHtcbiAgICAgIHRocm93IG5ldyBQZXJtaXNzaW9uRGVuaWVkRXJyb3IoJ2dhdGUucmV2aWV3LnJlamVjdCcsIGlucHV0LmFjdG9ySWQpO1xuICAgIH1cbiAgICBpZiAoaXRlbS5zdGF0ZSAhPT0gJ2luX3JldmlldycpIHtcbiAgICAgIHRocm93IG5ldyBHdWFyZEZhaWxlZEVycm9yKGByZXZpZXcgcmVqZWN0aW9uIGFwcGxpZXMgdG8gaW5fcmV2aWV3IGl0ZW1zLCBub3QgJHtpdGVtLnN0YXRlfWApO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5kYi50cmFuc2FjdGlvbihhc3luYyAodHgpID0+IHtcbiAgICAgIGF3YWl0IHR4Lmluc2VydChnYXRlRGVjaXNpb25zKS52YWx1ZXMoe1xuICAgICAgICB3b3JrSXRlbUlkOiBpdGVtLmlkLFxuICAgICAgICBnYXRlOiAncmV2aWV3X2FwcHJvdmFsJyxcbiAgICAgICAgZGVjaXNpb246ICdyZWplY3RlZCcsXG4gICAgICAgIGFjdG9ySWQ6IGlucHV0LmFjdG9ySWQsXG4gICAgICAgIHJvdW5kOiBpdGVtLnJldmlld0xvb3BJdGVyYXRpb24sXG4gICAgICB9KTtcbiAgICAgIGNvbnN0IGRlY2lzaW9uRXZlbnQgPSBhd2FpdCB0aGlzLmFwcGVuZFR4KHR4LCAnd29ya19pdGVtJywgaXRlbS5pZCwgJ2dhdGUucmVqZWN0ZWQnLCBpbnB1dC5hY3RvcklkLCB7XG4gICAgICAgIGdhdGU6ICdyZXZpZXdfYXBwcm92YWwnLFxuICAgICAgfSk7XG5cbiAgICAgIGlmIChpdGVtLnJldmlld0xvb3BJdGVyYXRpb24gPj0gUkVWSUVXX0xPT1BfTElNSVQpIHtcbiAgICAgICAgLy8gVGhlIDZ0aCByZWplY3Rpb24gcGVyZm9ybXMgbm8gbG9vcGJhY2s6IG92ZXJsYXkgcmV2aWV3X25vbl9jb252ZXJnZW5jZSxcbiAgICAgICAgLy8gc3RhdGUgZnJvemVuIGF0IGluX3JldmlldywgY291bnRlciB1bnRvdWNoZWQgKENPTkZPUk1BTkNFLm1kIHBpbikuXG4gICAgICAgIGF3YWl0IHR4XG4gICAgICAgICAgLnVwZGF0ZSh3b3JrSXRlbXMpXG4gICAgICAgICAgLnNldCh7IGJsb2NrZWRSZWFzb246ICdyZXZpZXdfbm9uX2NvbnZlcmdlbmNlJywgc3RhdGVWZXJzaW9uOiBpdGVtLnN0YXRlVmVyc2lvbiArIDEgfSlcbiAgICAgICAgICAud2hlcmUoZXEod29ya0l0ZW1zLmlkLCBpdGVtLmlkKSk7XG4gICAgICAgIGF3YWl0IHRoaXMuYXBwZW5kVHgoXG4gICAgICAgICAgdHgsXG4gICAgICAgICAgJ3dvcmtfaXRlbScsXG4gICAgICAgICAgaXRlbS5pZCxcbiAgICAgICAgICAnd29ya19pdGVtLmJsb2NrZWQnLFxuICAgICAgICAgIHRoaXMuc3lzdGVtQWN0b3JJZCxcbiAgICAgICAgICB7IHJlYXNvbjogJ3Jldmlld19ub25fY29udmVyZ2VuY2UnIH0sXG4gICAgICAgICAgeyBjYXVzYXRpb25JZDogU3RyaW5nKGRlY2lzaW9uRXZlbnQuZ2xvYmFsU2VxKSB9LFxuICAgICAgICApO1xuICAgICAgICByZXR1cm4gdGhpcy5wdWJsaWNJdGVtKHtcbiAgICAgICAgICAuLi5pdGVtLFxuICAgICAgICAgIGJsb2NrZWRSZWFzb246ICdyZXZpZXdfbm9uX2NvbnZlcmdlbmNlJyxcbiAgICAgICAgICBzdGF0ZVZlcnNpb246IGl0ZW0uc3RhdGVWZXJzaW9uICsgMSxcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIC8vIFx1MDBBNzEuMjogdGhlIGxvb3BiYWNrIGlzIGEgc3lzdGVtIGVmZmVjdCBcdTIwMTQgbm8gY2xhaW0taG9sZGVyIHBhcnRpY2lwYXRpb24uXG4gICAgICBhd2FpdCB0eFxuICAgICAgICAudXBkYXRlKHdvcmtJdGVtcylcbiAgICAgICAgLnNldCh7IHJldmlld0xvb3BJdGVyYXRpb246IGl0ZW0ucmV2aWV3TG9vcEl0ZXJhdGlvbiArIDEgfSlcbiAgICAgICAgLndoZXJlKGVxKHdvcmtJdGVtcy5pZCwgaXRlbS5pZCkpO1xuICAgICAgY29uc3QgYnVtcGVkID0geyAuLi5pdGVtLCByZXZpZXdMb29wSXRlcmF0aW9uOiBpdGVtLnJldmlld0xvb3BJdGVyYXRpb24gKyAxIH07XG4gICAgICByZXR1cm4gdGhpcy5leGVjdXRlVHJhbnNpdGlvblR4KFxuICAgICAgICB0eCxcbiAgICAgICAgYnVtcGVkLFxuICAgICAgICAnaW5fcHJvZ3Jlc3MnLFxuICAgICAgICB0aGlzLnN5c3RlbUFjdG9ySWQsXG4gICAgICAgIHVuZGVmaW5lZCxcbiAgICAgICAgU3RyaW5nKGRlY2lzaW9uRXZlbnQuZ2xvYmFsU2VxKSxcbiAgICAgICk7XG4gICAgfSk7XG4gIH1cblxuICAvLyAtLSBjb2xsYWJvcmF0aW9uIChQaGFzZSAzLCByb2FkbWFwIFx1MDBBNzUpIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIHByaXZhdGUgYXN5bmMgbXVzdEdldFRocmVhZCh0aHJlYWRJZDogc3RyaW5nLCB0eDogUXVlcnlhYmxlID0gdGhpcy5kYik6IFByb21pc2U8VGhyZWFkUm93PiB7XG4gICAgY29uc3Qgcm93cyA9IGF3YWl0IHR4LnNlbGVjdCgpLmZyb20odGhyZWFkcykud2hlcmUoZXEodGhyZWFkcy5pZCwgdGhyZWFkSWQpKS5saW1pdCgxKTtcbiAgICBjb25zdCByb3cgPSByb3dzWzBdO1xuICAgIGlmICghcm93KSB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcihgdW5rbm93biB0aHJlYWQ6ICR7dGhyZWFkSWR9YCk7XG4gICAgcmV0dXJuIHJvdztcbiAgfVxuXG4gIHByaXZhdGUgaXNQYXJ0aWNpcGFudCh0aHJlYWQ6IFRocmVhZFJvdywgYWN0b3JJZDogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRocmVhZC5jcmVhdGVkQnkgPT09IGFjdG9ySWQgfHwgdGhyZWFkLnBhcnRpY2lwYW50cy5pbmNsdWRlcyhhY3RvcklkKTtcbiAgfVxuXG4gIHByaXZhdGUgcHVibGljVGhyZWFkKHJvdzogT21pdDxUaHJlYWRSb3csICdzZXEnPik6IFRocmVhZCB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGlkOiByb3cuaWQsXG4gICAgICBmZWF0dXJlSWQ6IHJvdy5mZWF0dXJlSWQsXG4gICAgICB3b3JrSXRlbUlkOiByb3cud29ya0l0ZW1JZCxcbiAgICAgIGtpbmQ6IHJvdy5raW5kIGFzIFRocmVhZEtpbmQsXG4gICAgICB2aXNpYmlsaXR5OiByb3cudmlzaWJpbGl0eSBhcyBUaHJlYWRWaXNpYmlsaXR5LFxuICAgICAgY3JlYXRlZEJ5OiByb3cuY3JlYXRlZEJ5LFxuICAgICAgcGFydGljaXBhbnRzOiBbLi4ucm93LnBhcnRpY2lwYW50c10sXG4gICAgfTtcbiAgfVxuXG4gIHByaXZhdGUgcHVibGljTWVzc2FnZShyb3c6IE1lc3NhZ2VSb3cpOiBNZXNzYWdlIHtcbiAgICByZXR1cm4ge1xuICAgICAgaWQ6IHJvdy5pZCxcbiAgICAgIHRocmVhZElkOiByb3cudGhyZWFkSWQsXG4gICAgICBzZXE6IHJvdy5zZXEsXG4gICAgICBhdXRob3JJZDogcm93LmF1dGhvcklkLFxuICAgICAga2luZDogcm93LmtpbmQgYXMgTWVzc2FnZVsna2luZCddLFxuICAgICAgYm9keTogcm93LmJvZHksXG4gICAgICByZXBseVRvOiByb3cucmVwbHlUbyxcbiAgICB9O1xuICB9XG5cbiAgcHJpdmF0ZSBwdWJsaWNKb2Iocm93OiBPbWl0PEFnZW50Sm9iUm93LCAnc2VxJz4pOiBBZ2VudEpvYiB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGlkOiByb3cuaWQsXG4gICAgICBhZ2VudEFjdG9ySWQ6IHJvdy5hZ2VudEFjdG9ySWQsXG4gICAgICB0aHJlYWRJZDogcm93LnRocmVhZElkLFxuICAgICAgbWVzc2FnZUlkOiByb3cubWVzc2FnZUlkLFxuICAgICAgd29ya0l0ZW1JZDogcm93LndvcmtJdGVtSWQsXG4gICAgICBmZWF0dXJlSWQ6IHJvdy5mZWF0dXJlSWQsXG4gICAgICBzdGF0dXM6IHJvdy5zdGF0dXMgYXMgQWdlbnRKb2JbJ3N0YXR1cyddLFxuICAgICAgZGVwdGg6IHJvdy5kZXB0aCxcbiAgICAgIG5vdGU6IHJvdy5ub3RlLFxuICAgIH07XG4gIH1cblxuICBhc3luYyBjcmVhdGVUaHJlYWQoaW5wdXQ6IHtcbiAgICBhY3RvcklkOiBzdHJpbmc7XG4gICAga2luZDogVGhyZWFkS2luZDtcbiAgICBmZWF0dXJlSWQ/OiBzdHJpbmc7XG4gICAgd29ya0l0ZW1JZD86IHN0cmluZztcbiAgICB2aXNpYmlsaXR5PzogVGhyZWFkVmlzaWJpbGl0eTtcbiAgfSk6IFByb21pc2U8VGhyZWFkPiB7XG4gICAgaWYgKGlucHV0LmZlYXR1cmVJZCAhPT0gdW5kZWZpbmVkICYmIChhd2FpdCB0aGlzLmdldEZlYXR1cmVSb3coaW5wdXQuZmVhdHVyZUlkKSkgPT09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBHdWFyZEZhaWxlZEVycm9yKGB1bmtub3duIGZlYXR1cmU6ICR7aW5wdXQuZmVhdHVyZUlkfWApO1xuICAgIH1cbiAgICBsZXQgd29ya0l0ZW1JZDogc3RyaW5nIHwgbnVsbCA9IG51bGw7XG4gICAgaWYgKGlucHV0LndvcmtJdGVtSWQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgd29ya0l0ZW1JZCA9IChhd2FpdCB0aGlzLm11c3RHZXRJdGVtKGlucHV0LndvcmtJdGVtSWQpKS5pZDtcbiAgICB9XG4gICAgY29uc3QgdGhyZWFkID0ge1xuICAgICAgaWQ6IHRoaXMubmV4dElkKCd0aCcpLFxuICAgICAgZmVhdHVyZUlkOiBpbnB1dC5mZWF0dXJlSWQgPz8gbnVsbCxcbiAgICAgIHdvcmtJdGVtSWQsXG4gICAgICBraW5kOiBpbnB1dC5raW5kLFxuICAgICAgdmlzaWJpbGl0eTogaW5wdXQudmlzaWJpbGl0eSA/PyAoaW5wdXQua2luZCA9PT0gJ3ByaXZhdGUnID8gJ3ByaXZhdGUnIDogJ29wZW4nKSxcbiAgICAgIGNyZWF0ZWRCeTogaW5wdXQuYWN0b3JJZCxcbiAgICAgIHBhcnRpY2lwYW50czogW2lucHV0LmFjdG9ySWRdLFxuICAgIH07XG4gICAgcmV0dXJuIHRoaXMuZGIudHJhbnNhY3Rpb24oYXN5bmMgKHR4KSA9PiB7XG4gICAgICBhd2FpdCB0eC5pbnNlcnQodGhyZWFkcykudmFsdWVzKHRocmVhZCk7XG4gICAgICBhd2FpdCB0aGlzLmFwcGVuZFR4KHR4LCAndGhyZWFkJywgdGhyZWFkLmlkLCAndGhyZWFkLmNyZWF0ZWQnLCBpbnB1dC5hY3RvcklkLCB7XG4gICAgICAgIGtpbmQ6IHRocmVhZC5raW5kLFxuICAgICAgICBmZWF0dXJlSWQ6IHRocmVhZC5mZWF0dXJlSWQsXG4gICAgICAgIHdvcmtJdGVtSWQ6IHRocmVhZC53b3JrSXRlbUlkLFxuICAgICAgICB2aXNpYmlsaXR5OiB0aHJlYWQudmlzaWJpbGl0eSxcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIHRoaXMucHVibGljVGhyZWFkKHRocmVhZCk7XG4gICAgfSk7XG4gIH1cblxuICBhc3luYyBhZGRUaHJlYWRQYXJ0aWNpcGFudChpbnB1dDogeyB0aHJlYWRJZDogc3RyaW5nOyBhY3RvcklkOiBzdHJpbmc7IGJ5QWN0b3JJZDogc3RyaW5nIH0pOiBQcm9taXNlPFRocmVhZD4ge1xuICAgIGNvbnN0IHRocmVhZCA9IGF3YWl0IHRoaXMubXVzdEdldFRocmVhZChpbnB1dC50aHJlYWRJZCk7XG4gICAgaWYgKCF0aGlzLmlzUGFydGljaXBhbnQodGhyZWFkLCBpbnB1dC5ieUFjdG9ySWQpKSB7XG4gICAgICB0aHJvdyBuZXcgUGVybWlzc2lvbkRlbmllZEVycm9yKCd0aHJlYWQuaW52aXRlJywgaW5wdXQuYnlBY3RvcklkKTtcbiAgICB9XG4gICAgaWYgKChhd2FpdCB0aGlzLmdldEFjdG9yUm93KGlucHV0LmFjdG9ySWQpKSA9PT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoYHVua25vd24gYWN0b3I6ICR7aW5wdXQuYWN0b3JJZH1gKTtcbiAgICB9XG4gICAgaWYgKHRocmVhZC5wYXJ0aWNpcGFudHMuaW5jbHVkZXMoaW5wdXQuYWN0b3JJZCkpIHJldHVybiB0aGlzLnB1YmxpY1RocmVhZCh0aHJlYWQpO1xuICAgIGNvbnN0IHBhcnRpY2lwYW50cyA9IFsuLi50aHJlYWQucGFydGljaXBhbnRzLCBpbnB1dC5hY3RvcklkXTtcbiAgICByZXR1cm4gdGhpcy5kYi50cmFuc2FjdGlvbihhc3luYyAodHgpID0+IHtcbiAgICAgIGF3YWl0IHR4LnVwZGF0ZSh0aHJlYWRzKS5zZXQoeyBwYXJ0aWNpcGFudHMgfSkud2hlcmUoZXEodGhyZWFkcy5pZCwgdGhyZWFkLmlkKSk7XG4gICAgICBhd2FpdCB0aGlzLmFwcGVuZFR4KHR4LCAndGhyZWFkJywgdGhyZWFkLmlkLCAndGhyZWFkLnBhcnRpY2lwYW50X2FkZGVkJywgaW5wdXQuYnlBY3RvcklkLCB7XG4gICAgICAgIGFjdG9ySWQ6IGlucHV0LmFjdG9ySWQsXG4gICAgICB9KTtcbiAgICAgIHJldHVybiB0aGlzLnB1YmxpY1RocmVhZCh7IC4uLnRocmVhZCwgcGFydGljaXBhbnRzIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqIEludGVybmFsIGFwcGVuZCB0aGF0IG5ldmVyIHJ1bnMgdGhlIHJvdXRlciBcdTIwMTQgdXNlZCBmb3IgY2hhdCwgbmFycmF0aW9uIGFsaWtlLiAqL1xuICBwcml2YXRlIGFzeW5jIGFwcGVuZE1lc3NhZ2VUeChcbiAgICB0eDogUXVlcnlhYmxlLFxuICAgIHRocmVhZDogVGhyZWFkUm93IHwgT21pdDxUaHJlYWRSb3csICdzZXEnPixcbiAgICBhdXRob3JJZDogc3RyaW5nLFxuICAgIGtpbmQ6IE1lc3NhZ2VbJ2tpbmQnXSxcbiAgICBib2R5OiBzdHJpbmcsXG4gICAgcmVwbHlUbzogc3RyaW5nIHwgbnVsbCxcbiAgKTogUHJvbWlzZTxNZXNzYWdlPiB7XG4gICAgLy8gUGVyLXRocmVhZCwgMS1iYXNlZCwgZ2FwLWZyZWUgXHUyMDE0IFVOSVFVRSh0aHJlYWRfaWQsIHNlcSkgZW5mb3JjZXMgaXQsIHRoZVxuICAgIC8vIHNhbWUtdHJhbnNhY3Rpb24gbWF4KCkgY29tcHV0ZXMgaXQgKG1pcnJvcnMgdGhlIHJlZmVyZW5jZSBjb3VudCsxKS5cbiAgICBjb25zdCBbcm93XSA9IGF3YWl0IHR4XG4gICAgICAuc2VsZWN0KHsgbWF4U2VxOiBzcWw8bnVtYmVyPmBjb2FsZXNjZShtYXgoJHttZXNzYWdlcy5zZXF9KSwgMClgIH0pXG4gICAgICAuZnJvbShtZXNzYWdlcylcbiAgICAgIC53aGVyZShlcShtZXNzYWdlcy50aHJlYWRJZCwgdGhyZWFkLmlkKSk7XG4gICAgY29uc3Qgc2VxID0gTnVtYmVyKHJvdz8ubWF4U2VxID8/IDApICsgMTtcbiAgICBjb25zdCBtZXNzYWdlOiBNZXNzYWdlID0ge1xuICAgICAgaWQ6IHRoaXMubmV4dElkKCdtc2cnKSxcbiAgICAgIHRocmVhZElkOiB0aHJlYWQuaWQsXG4gICAgICBzZXEsXG4gICAgICBhdXRob3JJZCxcbiAgICAgIGtpbmQsXG4gICAgICBib2R5LFxuICAgICAgcmVwbHlUbyxcbiAgICB9O1xuICAgIGF3YWl0IHR4Lmluc2VydChtZXNzYWdlcykudmFsdWVzKG1lc3NhZ2UpO1xuICAgIGF3YWl0IHRoaXMuYXBwZW5kVHgodHgsICd0aHJlYWQnLCB0aHJlYWQuaWQsICdtZXNzYWdlLnBvc3RlZCcsIGF1dGhvcklkLCB7XG4gICAgICBtZXNzYWdlSWQ6IG1lc3NhZ2UuaWQsXG4gICAgICBraW5kLFxuICAgIH0pO1xuICAgIHJldHVybiB7IC4uLm1lc3NhZ2UgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBcdTAwQTc1LjI6IHRoZSBzZXJ2ZXIgTkVWRVIgcGFyc2VzIGJvZHkgdGV4dCBcdTIwMTQgYG1lbnRpb25zYCBpcyBzdHJ1Y3R1cmVkIGFjdG9yXG4gICAqIGlkcy4gXHUwMEE3NS40OiB0aGUgcm91dGVyIGlzIHB1cmUgY29kZSwgZGVmYXVsdC1kZW55LCBwb2xpY3ktZ2F0ZWQsXG4gICAqIGRlcHRoLWNhcHBlZDsgYSBqb2IgaXMgcmVwbHktb25seSBjb250ZXh0LCBuZXZlciBhIGNsYWltLlxuICAgKi9cbiAgYXN5bmMgcG9zdE1lc3NhZ2UoaW5wdXQ6IHtcbiAgICB0aHJlYWRJZDogc3RyaW5nO1xuICAgIGFjdG9ySWQ6IHN0cmluZztcbiAgICBib2R5OiBzdHJpbmc7XG4gICAgcmVwbHlUbz86IHN0cmluZztcbiAgICBtZW50aW9ucz86IHN0cmluZ1tdO1xuICB9KTogUHJvbWlzZTxNZXNzYWdlPiB7XG4gICAgY29uc3QgdGhyZWFkID0gYXdhaXQgdGhpcy5tdXN0R2V0VGhyZWFkKGlucHV0LnRocmVhZElkKTtcbiAgICBpZiAodGhyZWFkLnZpc2liaWxpdHkgPT09ICdwcml2YXRlJyAmJiAhdGhpcy5pc1BhcnRpY2lwYW50KHRocmVhZCwgaW5wdXQuYWN0b3JJZCkpIHtcbiAgICAgIHRocm93IG5ldyBQZXJtaXNzaW9uRGVuaWVkRXJyb3IoJ3RocmVhZC5wb3N0JywgaW5wdXQuYWN0b3JJZCk7XG4gICAgfVxuICAgIGNvbnN0IG1lbnRpb25JZHMgPSBbLi4ubmV3IFNldChpbnB1dC5tZW50aW9ucyA/PyBbXSldO1xuICAgIHJldHVybiB0aGlzLmRiLnRyYW5zYWN0aW9uKGFzeW5jICh0eCkgPT4ge1xuICAgICAgY29uc3QgbWVzc2FnZSA9IGF3YWl0IHRoaXMuYXBwZW5kTWVzc2FnZVR4KHR4LCB0aHJlYWQsIGlucHV0LmFjdG9ySWQsICdjaGF0JywgaW5wdXQuYm9keSwgaW5wdXQucmVwbHlUbyA/PyBudWxsKTtcbiAgICAgIGZvciAoY29uc3QgbWVudGlvbmVkSWQgb2YgbWVudGlvbklkcykge1xuICAgICAgICBjb25zdCBtZW50aW9uZWQgPSBhd2FpdCB0aGlzLmdldEFjdG9yUm93KG1lbnRpb25lZElkLCB0eCk7XG4gICAgICAgIGlmICghbWVudGlvbmVkKSB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcihgdW5rbm93biBtZW50aW9uZWQgYWN0b3I6ICR7bWVudGlvbmVkSWR9YCk7XG4gICAgICAgIGNvbnN0IHJlc29sdXRpb24gPSBhd2FpdCB0aGlzLnJvdXRlTWVudGlvblR4KHR4LCB0aHJlYWQsIG1lc3NhZ2UsIGlucHV0LmFjdG9ySWQsIG1lbnRpb25lZCk7XG4gICAgICAgIGF3YWl0IHR4Lmluc2VydChtZW50aW9ucykudmFsdWVzKHtcbiAgICAgICAgICBtZXNzYWdlSWQ6IG1lc3NhZ2UuaWQsXG4gICAgICAgICAgbWVudGlvbmVkQWN0b3JJZDogbWVudGlvbmVkSWQsXG4gICAgICAgICAgcmVzb2x1dGlvbixcbiAgICAgICAgfSk7XG4gICAgICAgIGF3YWl0IHRoaXMuYXBwZW5kVHgodHgsICd0aHJlYWQnLCB0aHJlYWQuaWQsICdtZW50aW9uLnJlY29yZGVkJywgaW5wdXQuYWN0b3JJZCwge1xuICAgICAgICAgIG1lc3NhZ2VJZDogbWVzc2FnZS5pZCxcbiAgICAgICAgICBtZW50aW9uZWRBY3RvcklkOiBtZW50aW9uZWRJZCxcbiAgICAgICAgICByZXNvbHV0aW9uLFxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBtZXNzYWdlO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqIFRoZSBkZXRlcm1pbmlzdGljIG1lbnRpb24gcm91dGVyIChcdTAwQTc1LjQpLiBSZXR1cm5zIHRoZSByZWNvcmRlZCByZXNvbHV0aW9uLiAqL1xuICBwcml2YXRlIGFzeW5jIHJvdXRlTWVudGlvblR4KFxuICAgIHR4OiBUeCxcbiAgICB0aHJlYWQ6IFRocmVhZFJvdyxcbiAgICBtZXNzYWdlOiBNZXNzYWdlLFxuICAgIG1lbnRpb25lcklkOiBzdHJpbmcsXG4gICAgbWVudGlvbmVkOiBBY3RvclJvdyxcbiAgKTogUHJvbWlzZTxNZW50aW9uUmVzb2x1dGlvbj4ge1xuICAgIGlmIChtZW50aW9uZWQudHlwZSAhPT0gJ2FnZW50Jykge1xuICAgICAgYXdhaXQgdGhpcy5wdXNoTm90aWZpY2F0aW9uVHgodHgsIG1lbnRpb25lZC5pZCwgJ21lbnRpb24nLCBtZXNzYWdlLmlkKTtcbiAgICAgIHJldHVybiAnbm90aWZpZWQnO1xuICAgIH1cbiAgICBjb25zdCBwb2xpY3kgPSAoYXdhaXQgdGhpcy53b3Jrc3BhY2VSb3codHgpKS5wb2xpY3kgYXMgV29ya3NwYWNlUG9saWN5O1xuICAgIC8vIGtpbGwtc3dpdGNoIGFwcGxpZXMgdG8gZXZlcnkgam9iLW1hdGVyaWFsaXppbmcgcGF0aFxuICAgIGlmIChwb2xpY3kubWVudGlvbkRpc3BhdGNoID09PSBmYWxzZSkgcmV0dXJuICdkZW5pZWRfcG9saWN5JztcblxuICAgIGNvbnN0IG1lbnRpb25lciA9IGF3YWl0IHRoaXMuZ2V0QWN0b3JSb3cobWVudGlvbmVySWQsIHR4KTtcbiAgICBsZXQgZGVwdGggPSAwO1xuICAgIGlmIChtZW50aW9uZXI/LnR5cGUgPT09ICdhZ2VudCcpIHtcbiAgICAgIC8vIGFnZW50LW1lbnRpb24tYWdlbnQ6IGV4cGxpY2l0IHBvbGljeSArIGRlcHRoIGNhcCAoXHUwMEE3NS40KVxuICAgICAgaWYgKHBvbGljeS5hZ2VudE1lbnRpb25BZ2VudCAhPT0gdHJ1ZSkgcmV0dXJuICdkZW5pZWRfcG9saWN5JztcbiAgICAgIGNvbnN0IG1lbnRpb25lckpvYnMgPSBhd2FpdCB0eFxuICAgICAgICAuc2VsZWN0KHsgZGVwdGg6IGFnZW50Sm9icy5kZXB0aCB9KVxuICAgICAgICAuZnJvbShhZ2VudEpvYnMpXG4gICAgICAgIC53aGVyZShlcShhZ2VudEpvYnMuYWdlbnRBY3RvcklkLCBtZW50aW9uZXJJZCkpO1xuICAgICAgZGVwdGggPSBNYXRoLm1heCgwLCAuLi5tZW50aW9uZXJKb2JzLm1hcCgoaikgPT4gai5kZXB0aCkpICsgMTtcbiAgICAgIGlmIChkZXB0aCA+IEFHRU5UX0pPQl9NQVhfREVQVEgpIHJldHVybiAnZGVuaWVkX2RlcHRoJztcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gZGVmYXVsdC1kZW55OiB0aGUgaHVtYW4gbWVudGlvbmVyIG11c3QgaG9sZCBpbnZva2UgYXV0aG9yaXR5IFx1MjAxNFxuICAgICAgLy8gYXQgbGVhc3Qgb25lIGFjdGl2ZSBkZWxpdmVyeSByb2xlLCBvciBnb3Zlcm5hbmNlIGFkbWluLlxuICAgICAgY29uc3QgaGFzUm9sZSA9XG4gICAgICAgIChcbiAgICAgICAgICBhd2FpdCB0eFxuICAgICAgICAgICAgLnNlbGVjdCh7IHNlcTogcm9sZUFzc2lnbm1lbnRzLnNlcSB9KVxuICAgICAgICAgICAgLmZyb20ocm9sZUFzc2lnbm1lbnRzKVxuICAgICAgICAgICAgLndoZXJlKGFuZChlcShyb2xlQXNzaWdubWVudHMuYWN0b3JJZCwgbWVudGlvbmVySWQpLCBlcShyb2xlQXNzaWdubWVudHMucmV2b2tlZCwgZmFsc2UpKSlcbiAgICAgICAgICAgIC5saW1pdCgxKVxuICAgICAgICApLmxlbmd0aCA+IDA7XG4gICAgICBjb25zdCBpc0FkbWluID0gbWVudGlvbmVyPy5nb3Zlcm5hbmNlUm9sZSA9PT0gJ2FkbWluJyB8fCBtZW50aW9uZXJJZCA9PT0gdGhpcy5zeXN0ZW1BY3RvcklkO1xuICAgICAgaWYgKCFoYXNSb2xlICYmICFpc0FkbWluKSByZXR1cm4gJ2RlbmllZF9wb2xpY3knO1xuICAgIH1cblxuICAgIGNvbnN0IGpvYiA9IHtcbiAgICAgIGlkOiB0aGlzLm5leHRJZCgnam9iJyksXG4gICAgICBhZ2VudEFjdG9ySWQ6IG1lbnRpb25lZC5pZCxcbiAgICAgIHRocmVhZElkOiB0aHJlYWQuaWQsXG4gICAgICBtZXNzYWdlSWQ6IG1lc3NhZ2UuaWQsXG4gICAgICB3b3JrSXRlbUlkOiB0aHJlYWQud29ya0l0ZW1JZCxcbiAgICAgIGZlYXR1cmVJZDogdGhyZWFkLmZlYXR1cmVJZCxcbiAgICAgIHN0YXR1czogJ3F1ZXVlZCcgYXMgY29uc3QsXG4gICAgICBkZXB0aCxcbiAgICAgIG5vdGU6IG51bGwsXG4gICAgfTtcbiAgICBhd2FpdCB0eC5pbnNlcnQoYWdlbnRKb2JzKS52YWx1ZXMoam9iKTtcbiAgICBhd2FpdCB0aGlzLmFwcGVuZFR4KHR4LCAnYWdlbnRfam9iJywgam9iLmlkLCAnYWdlbnRfam9iLmNyZWF0ZWQnLCBtZW50aW9uZXJJZCwge1xuICAgICAgYWdlbnRBY3RvcklkOiBtZW50aW9uZWQuaWQsXG4gICAgICB0aHJlYWRJZDogdGhyZWFkLmlkLFxuICAgICAgbWVzc2FnZUlkOiBtZXNzYWdlLmlkLFxuICAgICAgZGVwdGgsXG4gICAgfSk7XG4gICAgYXdhaXQgdGhpcy5wdXNoTm90aWZpY2F0aW9uVHgodHgsIG1lbnRpb25lZC5pZCwgJ21lbnRpb24nLCBtZXNzYWdlLmlkKTtcbiAgICByZXR1cm4gJ2pvYl9jcmVhdGVkJztcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgcHVzaE5vdGlmaWNhdGlvblR4KFxuICAgIHR4OiBRdWVyeWFibGUsXG4gICAgYWN0b3JJZDogc3RyaW5nLFxuICAgIHNvdXJjZTogTm90aWZpY2F0aW9uWydzb3VyY2UnXSxcbiAgICByZWZJZDogc3RyaW5nLFxuICApOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBhd2FpdCB0eC5pbnNlcnQobm90aWZpY2F0aW9ucykudmFsdWVzKHtcbiAgICAgIGlkOiB0aGlzLm5leHRJZCgnbnRmJyksXG4gICAgICBhY3RvcklkLFxuICAgICAgc291cmNlLFxuICAgICAgcmVmSWQsXG4gICAgICByZWFkOiBmYWxzZSxcbiAgICB9KTtcbiAgfVxuXG4gIGFzeW5jIGxpc3RUaHJlYWRzKGZpbHRlcj86IHsgZmVhdHVyZUlkPzogc3RyaW5nOyB3b3JrSXRlbUlkPzogc3RyaW5nOyBhY3RvcklkPzogc3RyaW5nIH0pOiBQcm9taXNlPFRocmVhZFtdPiB7XG4gICAgY29uc3Qgcm93cyA9IGF3YWl0IHRoaXMuZGIuc2VsZWN0KCkuZnJvbSh0aHJlYWRzKS5vcmRlckJ5KGFzYyh0aHJlYWRzLnNlcSkpO1xuICAgIC8vIExhemlseSByZXNvbHZlZCBsaWtlIHRoZSByZWZlcmVuY2U6IGFuIHVua25vd24gd29ya0l0ZW1JZCBvbmx5IHRocm93c1xuICAgIC8vIHdoZW4gYXQgbGVhc3Qgb25lIHRocmVhZCBpcyBleGFtaW5lZCAobXVzdEdldEl0ZW0gaW5zaWRlIHRoZSBmaWx0ZXIpLlxuICAgIGxldCByZXNvbHZlZFdvcmtJdGVtSWQ6IHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgICBpZiAoZmlsdGVyPy53b3JrSXRlbUlkICE9PSB1bmRlZmluZWQgJiYgcm93cy5sZW5ndGggPiAwKSB7XG4gICAgICByZXNvbHZlZFdvcmtJdGVtSWQgPSAoYXdhaXQgdGhpcy5tdXN0R2V0SXRlbShmaWx0ZXIud29ya0l0ZW1JZCkpLmlkO1xuICAgIH1cbiAgICBjb25zdCByZXN1bHQ6IFRocmVhZFtdID0gW107XG4gICAgZm9yIChjb25zdCByb3cgb2Ygcm93cykge1xuICAgICAgaWYgKGZpbHRlcj8uZmVhdHVyZUlkICE9PSB1bmRlZmluZWQgJiYgcm93LmZlYXR1cmVJZCAhPT0gZmlsdGVyLmZlYXR1cmVJZCkgY29udGludWU7XG4gICAgICBpZiAocmVzb2x2ZWRXb3JrSXRlbUlkICE9PSB1bmRlZmluZWQgJiYgcm93LndvcmtJdGVtSWQgIT09IHJlc29sdmVkV29ya0l0ZW1JZCkgY29udGludWU7XG4gICAgICBpZiAoXG4gICAgICAgIGZpbHRlcj8uYWN0b3JJZCAhPT0gdW5kZWZpbmVkICYmXG4gICAgICAgIHJvdy52aXNpYmlsaXR5ID09PSAncHJpdmF0ZScgJiZcbiAgICAgICAgIXRoaXMuaXNQYXJ0aWNpcGFudChyb3csIGZpbHRlci5hY3RvcklkKVxuICAgICAgKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgcmVzdWx0LnB1c2godGhpcy5wdWJsaWNUaHJlYWQocm93KSk7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICBhc3luYyBsaXN0TWVzc2FnZXMoaW5wdXQ6IHsgdGhyZWFkSWQ6IHN0cmluZzsgYWN0b3JJZDogc3RyaW5nOyBzaW5jZVNlcT86IG51bWJlciB9KTogUHJvbWlzZTxNZXNzYWdlW10+IHtcbiAgICBjb25zdCB0aHJlYWQgPSBhd2FpdCB0aGlzLm11c3RHZXRUaHJlYWQoaW5wdXQudGhyZWFkSWQpO1xuICAgIGlmICh0aHJlYWQudmlzaWJpbGl0eSA9PT0gJ3ByaXZhdGUnICYmICF0aGlzLmlzUGFydGljaXBhbnQodGhyZWFkLCBpbnB1dC5hY3RvcklkKSkge1xuICAgICAgdGhyb3cgbmV3IFBlcm1pc3Npb25EZW5pZWRFcnJvcigndGhyZWFkLnJlYWQnLCBpbnB1dC5hY3RvcklkKTtcbiAgICB9XG4gICAgY29uc3Qgcm93cyA9IGF3YWl0IHRoaXMuZGJcbiAgICAgIC5zZWxlY3QoKVxuICAgICAgLmZyb20obWVzc2FnZXMpXG4gICAgICAud2hlcmUoZXEobWVzc2FnZXMudGhyZWFkSWQsIHRocmVhZC5pZCkpXG4gICAgICAub3JkZXJCeShhc2MobWVzc2FnZXMuc2VxKSk7XG4gICAgcmV0dXJuIHJvd3NcbiAgICAgIC5maWx0ZXIoKG0pID0+IGlucHV0LnNpbmNlU2VxID09PSB1bmRlZmluZWQgfHwgbS5zZXEgPiBpbnB1dC5zaW5jZVNlcSlcbiAgICAgIC5tYXAoKG0pID0+IHRoaXMucHVibGljTWVzc2FnZShtKSk7XG4gIH1cblxuICBhc3luYyBsaXN0TWVudGlvbnMobWVzc2FnZUlkOiBzdHJpbmcpOiBQcm9taXNlPE1lbnRpb25bXT4ge1xuICAgIGNvbnN0IHJvd3MgPSBhd2FpdCB0aGlzLmRiXG4gICAgICAuc2VsZWN0KClcbiAgICAgIC5mcm9tKG1lbnRpb25zKVxuICAgICAgLndoZXJlKGVxKG1lbnRpb25zLm1lc3NhZ2VJZCwgbWVzc2FnZUlkKSlcbiAgICAgIC5vcmRlckJ5KGFzYyhtZW50aW9ucy5zZXEpKTtcbiAgICByZXR1cm4gcm93cy5tYXAoKHJvdykgPT4gKHtcbiAgICAgIG1lc3NhZ2VJZDogcm93Lm1lc3NhZ2VJZCxcbiAgICAgIG1lbnRpb25lZEFjdG9ySWQ6IHJvdy5tZW50aW9uZWRBY3RvcklkLFxuICAgICAgcmVzb2x1dGlvbjogcm93LnJlc29sdXRpb24gYXMgTWVudGlvblJlc29sdXRpb24sXG4gICAgfSkpO1xuICB9XG5cbiAgYXN5bmMgbGlzdE5vdGlmaWNhdGlvbnMoaW5wdXQ6IHsgYWN0b3JJZDogc3RyaW5nOyB1bnJlYWRPbmx5PzogYm9vbGVhbiB9KTogUHJvbWlzZTxOb3RpZmljYXRpb25bXT4ge1xuICAgIGNvbnN0IHJvd3MgPSBhd2FpdCB0aGlzLmRiXG4gICAgICAuc2VsZWN0KClcbiAgICAgIC5mcm9tKG5vdGlmaWNhdGlvbnMpXG4gICAgICAud2hlcmUoZXEobm90aWZpY2F0aW9ucy5hY3RvcklkLCBpbnB1dC5hY3RvcklkKSlcbiAgICAgIC5vcmRlckJ5KGFzYyhub3RpZmljYXRpb25zLnNlcSkpO1xuICAgIHJldHVybiByb3dzXG4gICAgICAuZmlsdGVyKChuKSA9PiBpbnB1dC51bnJlYWRPbmx5ICE9PSB0cnVlIHx8ICFuLnJlYWQpXG4gICAgICAubWFwKChuKSA9PiAoeyBpZDogbi5pZCwgYWN0b3JJZDogbi5hY3RvcklkLCBzb3VyY2U6IG4uc291cmNlIGFzIE5vdGlmaWNhdGlvblsnc291cmNlJ10sIHJlZklkOiBuLnJlZklkLCByZWFkOiBuLnJlYWQgfSkpO1xuICB9XG5cbiAgYXN5bmMgbWFya05vdGlmaWNhdGlvblJlYWQoaW5wdXQ6IHsgbm90aWZpY2F0aW9uSWQ6IHN0cmluZzsgYWN0b3JJZDogc3RyaW5nIH0pOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCByb3dzID0gYXdhaXQgdGhpcy5kYlxuICAgICAgLnNlbGVjdCgpXG4gICAgICAuZnJvbShub3RpZmljYXRpb25zKVxuICAgICAgLndoZXJlKGVxKG5vdGlmaWNhdGlvbnMuaWQsIGlucHV0Lm5vdGlmaWNhdGlvbklkKSlcbiAgICAgIC5saW1pdCgxKTtcbiAgICBjb25zdCBub3RpZmljYXRpb24gPSByb3dzWzBdO1xuICAgIGlmICghbm90aWZpY2F0aW9uKSB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcihgdW5rbm93biBub3RpZmljYXRpb246ICR7aW5wdXQubm90aWZpY2F0aW9uSWR9YCk7XG4gICAgaWYgKG5vdGlmaWNhdGlvbi5hY3RvcklkICE9PSBpbnB1dC5hY3RvcklkKSB7XG4gICAgICB0aHJvdyBuZXcgUGVybWlzc2lvbkRlbmllZEVycm9yKCd0aHJlYWQucmVhZCcsIGlucHV0LmFjdG9ySWQpO1xuICAgIH1cbiAgICBhd2FpdCB0aGlzLmRiLnVwZGF0ZShub3RpZmljYXRpb25zKS5zZXQoeyByZWFkOiB0cnVlIH0pLndoZXJlKGVxKG5vdGlmaWNhdGlvbnMuaWQsIG5vdGlmaWNhdGlvbi5pZCkpO1xuICB9XG5cbiAgYXN5bmMgbGlzdEFnZW50Sm9icyhmaWx0ZXI/OiB7IGFnZW50QWN0b3JJZD86IHN0cmluZzsgc3RhdHVzPzogQWdlbnRKb2JbJ3N0YXR1cyddIH0pOiBQcm9taXNlPEFnZW50Sm9iW10+IHtcbiAgICBjb25zdCByb3dzID0gYXdhaXQgdGhpcy5kYi5zZWxlY3QoKS5mcm9tKGFnZW50Sm9icykub3JkZXJCeShhc2MoYWdlbnRKb2JzLnNlcSkpO1xuICAgIHJldHVybiByb3dzXG4gICAgICAuZmlsdGVyKFxuICAgICAgICAoaikgPT5cbiAgICAgICAgICAoZmlsdGVyPy5hZ2VudEFjdG9ySWQgPT09IHVuZGVmaW5lZCB8fCBqLmFnZW50QWN0b3JJZCA9PT0gZmlsdGVyLmFnZW50QWN0b3JJZCkgJiZcbiAgICAgICAgICAoZmlsdGVyPy5zdGF0dXMgPT09IHVuZGVmaW5lZCB8fCBqLnN0YXR1cyA9PT0gZmlsdGVyLnN0YXR1cyksXG4gICAgICApXG4gICAgICAubWFwKChqKSA9PiB0aGlzLnB1YmxpY0pvYihqKSk7XG4gIH1cblxuICBhc3luYyBjb21wbGV0ZUFnZW50Sm9iKGlucHV0OiB7XG4gICAgam9iSWQ6IHN0cmluZztcbiAgICBhY3RvcklkOiBzdHJpbmc7XG4gICAgc3RhdHVzOiAnZG9uZScgfCAnYmxvY2tlZCc7XG4gICAgbm90ZT86IHN0cmluZztcbiAgfSk6IFByb21pc2U8QWdlbnRKb2I+IHtcbiAgICBjb25zdCByb3dzID0gYXdhaXQgdGhpcy5kYi5zZWxlY3QoKS5mcm9tKGFnZW50Sm9icykud2hlcmUoZXEoYWdlbnRKb2JzLmlkLCBpbnB1dC5qb2JJZCkpLmxpbWl0KDEpO1xuICAgIGNvbnN0IGpvYiA9IHJvd3NbMF07XG4gICAgaWYgKCFqb2IpIHRocm93IG5ldyBHdWFyZEZhaWxlZEVycm9yKGB1bmtub3duIGFnZW50IGpvYjogJHtpbnB1dC5qb2JJZH1gKTtcbiAgICBpZiAoam9iLmFnZW50QWN0b3JJZCAhPT0gaW5wdXQuYWN0b3JJZCkge1xuICAgICAgdGhyb3cgbmV3IFBlcm1pc3Npb25EZW5pZWRFcnJvcignYWdlbnRfam9iLmNvbXBsZXRlJywgaW5wdXQuYWN0b3JJZCk7XG4gICAgfVxuICAgIGlmIChqb2Iuc3RhdHVzICE9PSAncXVldWVkJykgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoYGFnZW50IGpvYiAke2pvYi5pZH0gaXMgYWxyZWFkeSAke2pvYi5zdGF0dXN9YCk7XG4gICAgY29uc3Qgbm90ZSA9IGlucHV0Lm5vdGUgPz8gbnVsbDtcbiAgICByZXR1cm4gdGhpcy5kYi50cmFuc2FjdGlvbihhc3luYyAodHgpID0+IHtcbiAgICAgIGF3YWl0IHR4LnVwZGF0ZShhZ2VudEpvYnMpLnNldCh7IHN0YXR1czogaW5wdXQuc3RhdHVzLCBub3RlIH0pLndoZXJlKGVxKGFnZW50Sm9icy5pZCwgam9iLmlkKSk7XG4gICAgICBhd2FpdCB0aGlzLmFwcGVuZFR4KHR4LCAnYWdlbnRfam9iJywgam9iLmlkLCAnYWdlbnRfam9iLmNvbXBsZXRlZCcsIGlucHV0LmFjdG9ySWQsIHtcbiAgICAgICAgc3RhdHVzOiBpbnB1dC5zdGF0dXMsXG4gICAgICAgIG5vdGUsXG4gICAgICB9KTtcbiAgICAgIC8vIG5vdGlmeSB0aGUgbWVudGlvbmVyIFx1MjAxNCB0aGUgcmV2ZXJzZSBkaXJlY3Rpb24gaXMgYSBtZXNzYWdlICsgbm90aWZpY2F0aW9uLCBub3RoaW5nIG1vcmUgKFx1MDBBNzUuNClcbiAgICAgIGNvbnN0IHRyaWdnZXIgPSAoXG4gICAgICAgIGF3YWl0IHR4XG4gICAgICAgICAgLnNlbGVjdCh7IGF1dGhvcklkOiBtZXNzYWdlcy5hdXRob3JJZCB9KVxuICAgICAgICAgIC5mcm9tKG1lc3NhZ2VzKVxuICAgICAgICAgIC53aGVyZShlcShtZXNzYWdlcy5pZCwgam9iLm1lc3NhZ2VJZCkpXG4gICAgICAgICAgLmxpbWl0KDEpXG4gICAgICApWzBdO1xuICAgICAgaWYgKHRyaWdnZXIpIGF3YWl0IHRoaXMucHVzaE5vdGlmaWNhdGlvblR4KHR4LCB0cmlnZ2VyLmF1dGhvcklkLCAnam9iX2NvbXBsZXRlZCcsIGpvYi5pZCk7XG4gICAgICByZXR1cm4gdGhpcy5wdWJsaWNKb2IoeyAuLi5qb2IsIHN0YXR1czogaW5wdXQuc3RhdHVzLCBub3RlIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgLy8gLS0gYWdlbnQgbWVtb3J5IChQaGFzZSA1LCByb2FkbWFwIFx1MDBBNzYpIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICBhc3luYyBhcHBlbmRBZ2VudE1lbW9yeShpbnB1dDoge1xuICAgIGFjdG9ySWQ6IHN0cmluZztcbiAgICBraW5kOiBNZW1vcnlLaW5kO1xuICAgIGNvbnRlbnQ6IHN0cmluZztcbiAgICBzb3VyY2VUaHJlYWRJZD86IHN0cmluZztcbiAgfSk6IFByb21pc2U8QWdlbnRNZW1vcnk+IHtcbiAgICBjb25zdCBhY3RvciA9IGF3YWl0IHRoaXMuZ2V0QWN0b3JSb3coaW5wdXQuYWN0b3JJZCk7XG4gICAgaWYgKCFhY3RvcikgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoYHVua25vd24gYWN0b3I6ICR7aW5wdXQuYWN0b3JJZH1gKTtcbiAgICBpZiAoYWN0b3IudHlwZSAhPT0gJ2FnZW50Jykge1xuICAgICAgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoJ21lbW9yeSBiZWxvbmdzIHRvIGFnZW50IGFjdG9ycyAocm9hZG1hcCBcdTAwQTc2KScpO1xuICAgIH1cbiAgICBsZXQgc291cmNlVGhyZWFkSWQ6IHN0cmluZyB8IG51bGwgPSBudWxsO1xuICAgIGxldCBzb3VyY2VWaXNpYmlsaXR5OiBBZ2VudE1lbW9yeVsnc291cmNlVmlzaWJpbGl0eSddID0gbnVsbDtcbiAgICBpZiAoaW5wdXQuc291cmNlVGhyZWFkSWQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgY29uc3QgdGhyZWFkID0gYXdhaXQgdGhpcy5tdXN0R2V0VGhyZWFkKGlucHV0LnNvdXJjZVRocmVhZElkKTtcbiAgICAgIC8vIExlYXJuaW5nIGZyb20gYSBwcml2YXRlIGNvbnRleHQgcmVxdWlyZXMgaGF2aW5nIGJlZW4gaW4gaXQuXG4gICAgICBpZiAodGhyZWFkLnZpc2liaWxpdHkgPT09ICdwcml2YXRlJyAmJiAhdGhpcy5pc1BhcnRpY2lwYW50KHRocmVhZCwgaW5wdXQuYWN0b3JJZCkpIHtcbiAgICAgICAgdGhyb3cgbmV3IFBlcm1pc3Npb25EZW5pZWRFcnJvcigndGhyZWFkLnJlYWQnLCBpbnB1dC5hY3RvcklkKTtcbiAgICAgIH1cbiAgICAgIHNvdXJjZVRocmVhZElkID0gdGhyZWFkLmlkO1xuICAgICAgc291cmNlVmlzaWJpbGl0eSA9IHRocmVhZC52aXNpYmlsaXR5IGFzIEFnZW50TWVtb3J5Wydzb3VyY2VWaXNpYmlsaXR5J107XG4gICAgfVxuICAgIGNvbnN0IGlkID0gdGhpcy5uZXh0SWQoJ21lbScpO1xuICAgIHJldHVybiB0aGlzLmRiLnRyYW5zYWN0aW9uKGFzeW5jICh0eCkgPT4ge1xuICAgICAgLy8gUGVyLWFnZW50IHNlcSBjb21wdXRlZCBJTiB0aGUgdHJhbnNhY3Rpb247IFVOSVFVRShhZ2VudF9hY3Rvcl9pZCwgc2VxKVxuICAgICAgLy8gbWFrZXMgYSBjb25jdXJyZW50IGR1cGxpY2F0ZSBsb3NlIGJ5IGNvbnN0cmFpbnQuXG4gICAgICBjb25zdCBbcm93XSA9IGF3YWl0IHR4XG4gICAgICAgIC5zZWxlY3QoeyBtYXhTZXE6IHNxbDxudW1iZXI+YGNvYWxlc2NlKG1heCgke2FnZW50TWVtb3JpZXMuc2VxfSksIDApYCB9KVxuICAgICAgICAuZnJvbShhZ2VudE1lbW9yaWVzKVxuICAgICAgICAud2hlcmUoZXEoYWdlbnRNZW1vcmllcy5hZ2VudEFjdG9ySWQsIGlucHV0LmFjdG9ySWQpKTtcbiAgICAgIGNvbnN0IHNlcSA9IE51bWJlcihyb3c/Lm1heFNlcSA/PyAwKSArIDE7XG4gICAgICBhd2FpdCB0eC5pbnNlcnQoYWdlbnRNZW1vcmllcykudmFsdWVzKHtcbiAgICAgICAgaWQsXG4gICAgICAgIGFnZW50QWN0b3JJZDogaW5wdXQuYWN0b3JJZCxcbiAgICAgICAga2luZDogaW5wdXQua2luZCxcbiAgICAgICAgY29udGVudDogaW5wdXQuY29udGVudCxcbiAgICAgICAgc291cmNlVGhyZWFkSWQsXG4gICAgICAgIHNvdXJjZVZpc2liaWxpdHksXG4gICAgICAgIHNlcSxcbiAgICAgIH0pO1xuICAgICAgLy8gQ29udGVudCBORVZFUiBlbnRlcnMgdGhlIHNoYXJlZCBldmVudCBsb2cgXHUyMDE0IHByaXZhdGUgbGVhcm5pbmcgbXVzdCBub3RcbiAgICAgIC8vIGxlYWsgaW50byB0aGUgYXVkaXQgc3RyZWFtIChyb2FkbWFwIFx1MDBBNzYgcGluKS5cbiAgICAgIGF3YWl0IHRoaXMuYXBwZW5kVHgodHgsICdhY3RvcicsIGlucHV0LmFjdG9ySWQsICdtZW1vcnkuYXBwZW5kZWQnLCBpbnB1dC5hY3RvcklkLCB7XG4gICAgICAgIG1lbW9yeUlkOiBpZCxcbiAgICAgICAga2luZDogaW5wdXQua2luZCxcbiAgICAgICAgc291cmNlVGhyZWFkSWQsXG4gICAgICB9KTtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGlkLFxuICAgICAgICBhZ2VudEFjdG9ySWQ6IGlucHV0LmFjdG9ySWQsXG4gICAgICAgIGtpbmQ6IGlucHV0LmtpbmQsXG4gICAgICAgIGNvbnRlbnQ6IGlucHV0LmNvbnRlbnQsXG4gICAgICAgIHNvdXJjZVRocmVhZElkLFxuICAgICAgICBzb3VyY2VWaXNpYmlsaXR5LFxuICAgICAgICBzZXEsXG4gICAgICB9O1xuICAgIH0pO1xuICB9XG5cbiAgYXN5bmMgc2VhcmNoQWdlbnRNZW1vcnkoaW5wdXQ6IHtcbiAgICBhY3RvcklkOiBzdHJpbmc7XG4gICAgY29udGV4dFRocmVhZElkPzogc3RyaW5nO1xuICAgIGtpbmQ/OiBNZW1vcnlLaW5kO1xuICAgIHF1ZXJ5Pzogc3RyaW5nO1xuICB9KTogUHJvbWlzZTxBZ2VudE1lbW9yeVtdPiB7XG4gICAgLy8gT3duZXItc2NvcGVkIGJ5IGNvbnN0cnVjdGlvbjogdGhlcmUgaXMgbm8gY3Jvc3MtYWN0b3IgcGFyYW1ldGVyLlxuICAgIGNvbnN0IHJvd3MgPSBhd2FpdCB0aGlzLmRiXG4gICAgICAuc2VsZWN0KClcbiAgICAgIC5mcm9tKGFnZW50TWVtb3JpZXMpXG4gICAgICAud2hlcmUoZXEoYWdlbnRNZW1vcmllcy5hZ2VudEFjdG9ySWQsIGlucHV0LmFjdG9ySWQpKVxuICAgICAgLm9yZGVyQnkoYXNjKGFnZW50TWVtb3JpZXMuc2VxKSk7XG4gICAgcmV0dXJuIHJvd3NcbiAgICAgIC5maWx0ZXIoKG0pID0+IHtcbiAgICAgICAgaWYgKGlucHV0LmtpbmQgIT09IHVuZGVmaW5lZCAmJiBtLmtpbmQgIT09IGlucHV0LmtpbmQpIHJldHVybiBmYWxzZTtcbiAgICAgICAgaWYgKGlucHV0LnF1ZXJ5ICE9PSB1bmRlZmluZWQgJiYgIW0uY29udGVudC50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKGlucHV0LnF1ZXJ5LnRvTG93ZXJDYXNlKCkpKSByZXR1cm4gZmFsc2U7XG4gICAgICAgIC8vIFx1MDBBNzY6IG5vdGhpbmcgbGVhcm5lZCBpbiBhIHByaXZhdGUgdGhyZWFkIHN1cmZhY2VzIG91dHNpZGUgaXRzXG4gICAgICAgIC8vIHNvdXJjZSB0aHJlYWQuXG4gICAgICAgIGlmIChtLnNvdXJjZVZpc2liaWxpdHkgPT09ICdwcml2YXRlJyAmJiBtLnNvdXJjZVRocmVhZElkICE9PSBpbnB1dC5jb250ZXh0VGhyZWFkSWQpIHJldHVybiBmYWxzZTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9KVxuICAgICAgLm1hcCgobSkgPT4gdGhpcy5wdWJsaWNNZW1vcnkobSkpO1xuICB9XG5cbiAgcHJpdmF0ZSBwdWJsaWNNZW1vcnkocm93OiBBZ2VudE1lbW9yeVJvdyk6IEFnZW50TWVtb3J5IHtcbiAgICByZXR1cm4ge1xuICAgICAgaWQ6IHJvdy5pZCxcbiAgICAgIGFnZW50QWN0b3JJZDogcm93LmFnZW50QWN0b3JJZCxcbiAgICAgIGtpbmQ6IHJvdy5raW5kIGFzIE1lbW9yeUtpbmQsXG4gICAgICBjb250ZW50OiByb3cuY29udGVudCxcbiAgICAgIHNvdXJjZVRocmVhZElkOiByb3cuc291cmNlVGhyZWFkSWQsXG4gICAgICBzb3VyY2VWaXNpYmlsaXR5OiByb3cuc291cmNlVmlzaWJpbGl0eSBhcyBBZ2VudE1lbW9yeVsnc291cmNlVmlzaWJpbGl0eSddLFxuICAgICAgc2VxOiByb3cuc2VxLFxuICAgIH07XG4gIH1cblxuICAvKiogUmFpbHMgXHUyMTkyIGNoYXQgbmFycmF0aW9uIChcdTAwQTc1LjIpOiBzdGF0ZSBjaGFuZ2VzIG5hcnJhdGUgaW50byBib3VuZCB0YXNrIHRocmVhZHMuICovXG4gIHByaXZhdGUgYXN5bmMgbmFycmF0ZVdvcmtJdGVtVHgodHg6IFR4LCB3b3JrSXRlbUlkOiBzdHJpbmcsIGJvZHk6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IGJvdW5kID0gYXdhaXQgdHhcbiAgICAgIC5zZWxlY3QoKVxuICAgICAgLmZyb20odGhyZWFkcylcbiAgICAgIC53aGVyZShlcSh0aHJlYWRzLndvcmtJdGVtSWQsIHdvcmtJdGVtSWQpKVxuICAgICAgLm9yZGVyQnkoYXNjKHRocmVhZHMuc2VxKSk7XG4gICAgZm9yIChjb25zdCB0aHJlYWQgb2YgYm91bmQpIHtcbiAgICAgIGF3YWl0IHRoaXMuYXBwZW5kTWVzc2FnZVR4KHR4LCB0aHJlYWQsIHRoaXMuc3lzdGVtQWN0b3JJZCwgJ3N5c3RlbScsIGJvZHksIG51bGwpO1xuICAgIH1cbiAgfVxuXG4gIC8vIC0tIGRpc3BhdGNoIChyb2FkbWFwIFx1MDBBNzIuMykgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICBhc3luYyBnZXRUYXNrQ29udGV4dChpbnB1dDogeyB3b3JrSXRlbUlkOiBzdHJpbmcgfSk6IFByb21pc2U8eyB3b3JrSXRlbTogV29ya0l0ZW07IGVudHJ5U3RhdGU6IFdvcmtJdGVtU3RhdGUgfT4ge1xuICAgIGNvbnN0IGl0ZW0gPSBhd2FpdCB0aGlzLm11c3RHZXRJdGVtKGlucHV0LndvcmtJdGVtSWQpO1xuICAgIGlmIChpdGVtLnN0YXRlID09PSAnZG9uZScpIHtcbiAgICAgIHRocm93IG5ldyBHdWFyZEZhaWxlZEVycm9yKCdkb25lIGl0ZW1zIGFyZSBuZXZlciByZS1kaXNwYXRjaGVkOyBmb2xsb3ctdXAgcmV2aWV3IGlzIGEgbmV3IHdvcmsgaXRlbScpO1xuICAgIH1cbiAgICBjb25zdCBmZWF0dXJlID0gYXdhaXQgdGhpcy5nZXRGZWF0dXJlUm93KGl0ZW0uZmVhdHVyZUlkKTtcbiAgICBpZiAoZmVhdHVyZT8uZGlzcGF0Y2hIb2xkKSB7XG4gICAgICB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcignZmVhdHVyZSBpcyB1bmRlciBhIGRvbmVfY2hlY2twb2ludCBkaXNwYXRjaCBob2xkJyk7XG4gICAgfVxuICAgIHJldHVybiB7IHdvcmtJdGVtOiB0aGlzLnB1YmxpY0l0ZW0oaXRlbSksIGVudHJ5U3RhdGU6IGl0ZW0uc3RhdGUgYXMgV29ya0l0ZW1TdGF0ZSB9O1xuICB9XG5cbiAgYXN5bmMgcmVsZWFzZURpc3BhdGNoSG9sZChpbnB1dDogeyBmZWF0dXJlSWQ6IHN0cmluZzsgYWN0b3JJZDogc3RyaW5nIH0pOiBQcm9taXNlPEZlYXR1cmU+IHtcbiAgICBhd2FpdCB0aGlzLnJlcXVpcmVQZXJtaXNzaW9uKGlucHV0LmFjdG9ySWQsICdkaXNwYXRjaC5yZWxlYXNlX2hvbGQnKTtcbiAgICBjb25zdCBmZWF0dXJlID0gYXdhaXQgdGhpcy5nZXRGZWF0dXJlUm93KGlucHV0LmZlYXR1cmVJZCk7XG4gICAgaWYgKCFmZWF0dXJlKSB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcihgdW5rbm93biBmZWF0dXJlOiAke2lucHV0LmZlYXR1cmVJZH1gKTtcbiAgICByZXR1cm4gdGhpcy5kYi50cmFuc2FjdGlvbihhc3luYyAodHgpID0+IHtcbiAgICAgIGF3YWl0IHR4LnVwZGF0ZShmZWF0dXJlcykuc2V0KHsgZGlzcGF0Y2hIb2xkOiBmYWxzZSB9KS53aGVyZShlcShmZWF0dXJlcy5pZCwgZmVhdHVyZS5pZCkpO1xuICAgICAgYXdhaXQgdGhpcy5hcHBlbmRUeCh0eCwgJ2ZlYXR1cmUnLCBmZWF0dXJlLmlkLCAnZmVhdHVyZS5kaXNwYXRjaF9ob2xkX3JlbGVhc2VkJywgaW5wdXQuYWN0b3JJZCwge30pO1xuICAgICAgcmV0dXJuIHRoaXMucHVibGljRmVhdHVyZSh7IC4uLmZlYXR1cmUsIGRpc3BhdGNoSG9sZDogZmFsc2UgfSk7XG4gICAgfSk7XG4gIH1cblxuICAvLyAtLSByZWNvbmNpbGlhdGlvbiAocm9hZG1hcCBcdTAwQTcxLjYsIEQ2OiBkZXRlY3Qtb25seSwgbmV2ZXIgbXV0YXRlcykgLS0tLS0tLS0tLS0tXG5cbiAgYXN5bmMgcmVjb25jaWxlKGlucHV0OiB7XG4gICAgZmlsZXM6IEFycmF5PHsgd29ya0l0ZW1JZDogc3RyaW5nOyBmcm9udG1hdHRlclN0YXR1czogc3RyaW5nIH0+O1xuICB9KTogUHJvbWlzZTxEaXZlcmdlbmNlUmVwb3J0W10+IHtcbiAgICBjb25zdCByZXBvcnRzOiBEaXZlcmdlbmNlUmVwb3J0W10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IGZpbGUgb2YgaW5wdXQuZmlsZXMpIHtcbiAgICAgIGNvbnN0IGl0ZW0gPSBhd2FpdCB0aGlzLm11c3RHZXRJdGVtKGZpbGUud29ya0l0ZW1JZCk7XG4gICAgICAvLyBGaWxlcyB1bmRlciBhIGxpdmUgY2xhaW0gYXJlIGV4Y2x1ZGVkIFx1MjAxNCBwbGF5Ym9va3MgbGVnaXRpbWF0ZWx5IHdyaXRlXG4gICAgICAvLyBmcm9udG1hdHRlciBtaWQtcnVuIChcdTAwQTcxLjYpLlxuICAgICAgaWYgKChhd2FpdCB0aGlzLmxpdmVDbGFpbShpdGVtLmlkKSkgIT09IG51bGwpIGNvbnRpbnVlO1xuXG4gICAgICBjb25zdCByYXcgPSBmaWxlLmZyb250bWF0dGVyU3RhdHVzLnRyaW0oKTtcbiAgICAgIGNvbnN0IGRiU3RhdGUgPSBpdGVtLnN0YXRlIGFzIFdvcmtJdGVtU3RhdGU7XG4gICAgICBpZiAocmF3ID09PSAnYmxvY2tlZCcpIHtcbiAgICAgICAgLy8gRDg6IG92ZXJsYXkgaW4gdGhlIERCIGFuZCBgc3RhdHVzOiBibG9ja2VkYCBpbiB0aGUgZmlsZSBhcmUgdGhlXG4gICAgICAgIC8vIHNhbWUgdHJ1dGguIEJsb2NrZWQtaW4tZmlsZSB3aXRoIE5PIG92ZXJsYXkgaXMgcmVhbCBkcmlmdC5cbiAgICAgICAgaWYgKGl0ZW0uYmxvY2tlZFJlYXNvbiAhPT0gbnVsbCkgY29udGludWU7XG4gICAgICAgIHJlcG9ydHMucHVzaCh7IHdvcmtJdGVtSWQ6IGl0ZW0uaWQsIGZpbGVTdGF0ZTogcmF3LCBkYlN0YXRlLCBraW5kOiAnY29uZmxpY3QnIH0pO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgY29uc3Qgbm9ybWFsaXplZCA9IExFR0FDWV9TVEFUVVNbcmF3XTtcbiAgICAgIGlmIChub3JtYWxpemVkID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmVwb3J0cy5wdXNoKHsgd29ya0l0ZW1JZDogaXRlbS5pZCwgZmlsZVN0YXRlOiByYXcsIGRiU3RhdGUsIGtpbmQ6ICdjb25mbGljdCcgfSk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgaWYgKG5vcm1hbGl6ZWQgPT09IGRiU3RhdGUpIGNvbnRpbnVlO1xuICAgICAgcmVwb3J0cy5wdXNoKHtcbiAgICAgICAgd29ya0l0ZW1JZDogaXRlbS5pZCxcbiAgICAgICAgZmlsZVN0YXRlOiByYXcsXG4gICAgICAgIGRiU3RhdGUsXG4gICAgICAgIGtpbmQ6IFJBTktbbm9ybWFsaXplZF0gPiBSQU5LW2RiU3RhdGVdID8gJ2ZpbGVfYWhlYWQnIDogJ2RiX2FoZWFkJyxcbiAgICAgIH0pO1xuICAgIH1cbiAgICByZXR1cm4gcmVwb3J0cztcbiAgfVxuXG4gIC8vIC0tIHF1ZXJpZXMgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgYXN5bmMgZ2V0V29ya0l0ZW0oaWQ6IHN0cmluZyk6IFByb21pc2U8V29ya0l0ZW0+IHtcbiAgICByZXR1cm4gdGhpcy5wdWJsaWNJdGVtKGF3YWl0IHRoaXMubXVzdEdldEl0ZW0oaWQpKTtcbiAgfVxuXG4gIGFzeW5jIGdldEZlYXR1cmUoaWQ6IHN0cmluZyk6IFByb21pc2U8RmVhdHVyZT4ge1xuICAgIGNvbnN0IGZlYXR1cmUgPSBhd2FpdCB0aGlzLmdldEZlYXR1cmVSb3coaWQpO1xuICAgIGlmICghZmVhdHVyZSkgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoYHVua25vd24gZmVhdHVyZTogJHtpZH1gKTtcbiAgICByZXR1cm4gdGhpcy5wdWJsaWNGZWF0dXJlKGZlYXR1cmUpO1xuICB9XG5cbiAgYXN5bmMgbGlzdFdvcmtJdGVtcyhmaWx0ZXI/OiB7XG4gICAgc3RhdGU/OiBXb3JrSXRlbVN0YXRlO1xuICAgIGZlYXR1cmVJZD86IHN0cmluZztcbiAgICBjbGFpbWFibGU/OiBib29sZWFuO1xuICB9KTogUHJvbWlzZTxXb3JrSXRlbVtdPiB7XG4gICAgY29uc3Qgcm93cyA9IGF3YWl0IHRoaXMuZGIuc2VsZWN0KCkuZnJvbSh3b3JrSXRlbXMpLm9yZGVyQnkoYXNjKHdvcmtJdGVtcy5zZXEpKTtcbiAgICBjb25zdCByZXN1bHQ6IFdvcmtJdGVtW10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IHJvdyBvZiByb3dzKSB7XG4gICAgICBpZiAoZmlsdGVyPy5zdGF0ZSAhPT0gdW5kZWZpbmVkICYmIHJvdy5zdGF0ZSAhPT0gZmlsdGVyLnN0YXRlKSBjb250aW51ZTtcbiAgICAgIGlmIChmaWx0ZXI/LmZlYXR1cmVJZCAhPT0gdW5kZWZpbmVkICYmIHJvdy5mZWF0dXJlSWQgIT09IGZpbHRlci5mZWF0dXJlSWQpIGNvbnRpbnVlO1xuICAgICAgaWYgKGZpbHRlcj8uY2xhaW1hYmxlID09PSB0cnVlICYmIChhd2FpdCB0aGlzLmxpdmVDbGFpbShyb3cuaWQpKSAhPT0gbnVsbCkgY29udGludWU7XG4gICAgICByZXN1bHQucHVzaCh0aGlzLnB1YmxpY0l0ZW0ocm93KSk7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICBhc3luYyBnZXRDbGFpbXMod29ya0l0ZW1JZDogc3RyaW5nKTogUHJvbWlzZTxDbGFpbVtdPiB7XG4gICAgY29uc3QgaXRlbSA9IGF3YWl0IHRoaXMubXVzdEdldEl0ZW0od29ya0l0ZW1JZCk7XG4gICAgY29uc3Qgcm93cyA9IGF3YWl0IHRoaXMuZGJcbiAgICAgIC5zZWxlY3QoKVxuICAgICAgLmZyb20oY2xhaW1zKVxuICAgICAgLndoZXJlKGVxKGNsYWltcy53b3JrSXRlbUlkLCBpdGVtLmlkKSlcbiAgICAgIC5vcmRlckJ5KGFzYyhjbGFpbXMuc2VxKSk7XG4gICAgcmV0dXJuIHJvd3MubWFwKChyb3cpID0+IHRoaXMucHVibGljQ2xhaW0ocm93KSk7XG4gIH1cblxuICBhc3luYyBldmVudHMoc3RyZWFtSWQ/OiBzdHJpbmcpOiBQcm9taXNlPFNwaW5lRXZlbnRbXT4ge1xuICAgIGNvbnN0IHJvd3MgPVxuICAgICAgc3RyZWFtSWQgPT09IHVuZGVmaW5lZFxuICAgICAgICA/IGF3YWl0IHRoaXMuZGIuc2VsZWN0KCkuZnJvbShldmVudHMpLm9yZGVyQnkoYXNjKGV2ZW50cy5nbG9iYWxTZXEpKVxuICAgICAgICA6IGF3YWl0IHRoaXMuZGIuc2VsZWN0KCkuZnJvbShldmVudHMpLndoZXJlKGVxKGV2ZW50cy5zdHJlYW1JZCwgc3RyZWFtSWQpKS5vcmRlckJ5KGFzYyhldmVudHMuZ2xvYmFsU2VxKSk7XG4gICAgcmV0dXJuIHJvd3MubWFwKChyb3cpID0+IHRoaXMuZXZlbnRGcm9tUm93KHJvdykpO1xuICB9XG59XG4iLCAiLyoqXG4gKiBTeW5jaHJvbm91cyBmYWNhZGUgb3ZlciB0aGUgYXN5bmMgUGdFbmdpbmUgcnVubmluZyBpbiBhIHN5bmNraXQgd29ya2VyLlxuICogSW1wbGVtZW50cyB0aGUgZXhhY3QgQG9haHMvY29yZSBTcGluZUVuZ2luZSBpbnRlcmZhY2UsIHNvIHRoZSBjb25mb3JtYW5jZVxuICogc3VpdGUgZHJpdmVzIFBvc3RncmVzIHRocm91Z2ggdGhlIHNhbWUgY2FsbHMgaXQgZHJpdmVzIHRoZSBtZW1vcnkgZW5naW5lLlxuICovXG5pbXBvcnQgeyBjcmVhdGVSZXF1aXJlIH0gZnJvbSAnbm9kZTptb2R1bGUnO1xuaW1wb3J0IHsgZGlybmFtZSwgam9pbiB9IGZyb20gJ25vZGU6cGF0aCc7XG5pbXBvcnQgeyBmaWxlVVJMVG9QYXRoIH0gZnJvbSAnbm9kZTp1cmwnO1xuaW1wb3J0IHsgY3JlYXRlU3luY0ZuIH0gZnJvbSAnc3luY2tpdCc7XG5cbmltcG9ydCB7XG4gIENvbmZsaWN0RXJyb3IsXG4gIEd1YXJkRmFpbGVkRXJyb3IsXG4gIEludmFsaWRUcmFuc2l0aW9uRXJyb3IsXG4gIFBlcm1pc3Npb25EZW5pZWRFcnJvcixcbiAgU3Rvcmllc1ZhbGlkYXRpb25FcnJvcixcbiAgdHlwZSBTcGluZUVuZ2luZSxcbn0gZnJvbSAnQG9haHMvY29yZSc7XG5cbmNvbnN0IGhlcmUgPSBkaXJuYW1lKGZpbGVVUkxUb1BhdGgoaW1wb3J0Lm1ldGEudXJsKSk7XG5jb25zdCB3b3JrZXJQYXRoID0gam9pbihoZXJlLCAnLi4nLCAnZGlzdCcsICd3b3JrZXIubWpzJyk7XG5cbnR5cGUgV2lyZVJlc3VsdCA9XG4gIHwgeyBvazogdHJ1ZTsgdmFsdWU6IHVua25vd24gfVxuICB8IHsgb2s6IGZhbHNlOyBlcnJvcjogeyBuYW1lOiBzdHJpbmc7IG1lc3NhZ2U6IHN0cmluZyB9IH07XG5cbmNvbnN0IGNhbGxXb3JrZXIgPSBjcmVhdGVTeW5jRm4od29ya2VyUGF0aCkgYXMgKG9wOiB1bmtub3duKSA9PiBXaXJlUmVzdWx0O1xuXG5jb25zdCBFUlJPUl9DTEFTU0VTOiBSZWNvcmQ8c3RyaW5nLCBuZXcgKC4uLmFyZ3M6IG5ldmVyW10pID0+IEVycm9yPiA9IHtcbiAgQ29uZmxpY3RFcnJvcjogQ29uZmxpY3RFcnJvciBhcyBuZXZlcixcbiAgR3VhcmRGYWlsZWRFcnJvcjogR3VhcmRGYWlsZWRFcnJvciBhcyBuZXZlcixcbiAgSW52YWxpZFRyYW5zaXRpb25FcnJvcjogSW52YWxpZFRyYW5zaXRpb25FcnJvciBhcyBuZXZlcixcbiAgUGVybWlzc2lvbkRlbmllZEVycm9yOiBQZXJtaXNzaW9uRGVuaWVkRXJyb3IgYXMgbmV2ZXIsXG4gIFN0b3JpZXNWYWxpZGF0aW9uRXJyb3I6IFN0b3JpZXNWYWxpZGF0aW9uRXJyb3IgYXMgbmV2ZXIsXG59O1xuXG5mdW5jdGlvbiByZXRocm93KGVycm9yOiB7IG5hbWU6IHN0cmluZzsgbWVzc2FnZTogc3RyaW5nIH0pOiBuZXZlciB7XG4gIGNvbnN0IENscyA9IEVSUk9SX0NMQVNTRVNbZXJyb3IubmFtZV07XG4gIGlmIChDbHMpIHtcbiAgICAvLyBSZWNvbnN0cnVjdCB3aXRoIHRoZSB3aXJlIG1lc3NhZ2U6IHRoZSBjb25mb3JtYW5jZSBzdWl0ZSBtYXRjaGVzXG4gICAgLy8gY2xhc3Nlcywgbm90IGNvbnN0cnVjdG9yIGFyZ3VtZW50cy5cbiAgICBjb25zdCBpbnN0YW5jZSA9IE9iamVjdC5jcmVhdGUoQ2xzLnByb3RvdHlwZSkgYXMgRXJyb3I7XG4gICAgaW5zdGFuY2UubWVzc2FnZSA9IGVycm9yLm1lc3NhZ2U7XG4gICAgaW5zdGFuY2UubmFtZSA9IGVycm9yLm5hbWU7XG4gICAgdGhyb3cgaW5zdGFuY2U7XG4gIH1cbiAgdGhyb3cgbmV3IEVycm9yKGAke2Vycm9yLm5hbWV9OiAke2Vycm9yLm1lc3NhZ2V9YCk7XG59XG5cbmZ1bmN0aW9uIHVud3JhcChyZXN1bHQ6IFdpcmVSZXN1bHQpOiB1bmtub3duIHtcbiAgaWYgKHJlc3VsdC5vaykgcmV0dXJuIHJlc3VsdC52YWx1ZTtcbiAgcmV0aHJvdyhyZXN1bHQuZXJyb3IpO1xufVxuXG5jb25zdCBNRVRIT0RTOiBBcnJheTxrZXlvZiBTcGluZUVuZ2luZT4gPSBbXG4gICdjcmVhdGVBY3RvcicsXG4gICdsaXN0QWN0b3JzJyxcbiAgJ3Byb3Zpc2lvblBlcnNvbmFzJyxcbiAgJ2dyYW50JyxcbiAgJ3Jldm9rZScsXG4gICdjcmVhdGVGZWF0dXJlJyxcbiAgJ2NyZWF0ZVdvcmtJdGVtJyxcbiAgJ2ltcG9ydFN0b3JpZXMnLFxuICAnY2xhaW1UYXNrJyxcbiAgJ2hlYXJ0YmVhdCcsXG4gICdyZWxlYXNlQ2xhaW0nLFxuICAnYWR2YW5jZUNsb2NrJyxcbiAgJ2FkdmFuY2VTdGF0ZScsXG4gICdibG9ja1Rhc2snLFxuICAndW5ibG9ja1Rhc2snLFxuICAnc3VibWl0RXZpZGVuY2UnLFxuICAnYXBwcm92ZUdhdGUnLFxuICAncmVqZWN0R2F0ZScsXG4gICdnZXRUYXNrQ29udGV4dCcsXG4gICdyZWxlYXNlRGlzcGF0Y2hIb2xkJyxcbiAgJ3JlY29uY2lsZScsXG4gICdzZXRHb3Zlcm5hbmNlUm9sZScsXG4gICdnZXRHb3Zlcm5hbmNlUm9sZScsXG4gICdhc3NpZ25Sb2xlJyxcbiAgJ3Jldm9rZVJvbGUnLFxuICAnbGlzdFJvbGVBc3NpZ25tZW50cycsXG4gICdzZXRQbGFuJyxcbiAgJ2dldFBsYW4nLFxuICAnc2V0V29ya3NwYWNlUG9saWN5JyxcbiAgJ2dldFdvcmtzcGFjZVBvbGljeScsXG4gICdzZXRHYXRlUG9saWN5JyxcbiAgJ2dldEdhdGVQb2xpY3knLFxuICAnYXV0aHpFeHBsYWluJyxcbiAgJ2NyZWF0ZVRocmVhZCcsXG4gICdhZGRUaHJlYWRQYXJ0aWNpcGFudCcsXG4gICdwb3N0TWVzc2FnZScsXG4gICdsaXN0VGhyZWFkcycsXG4gICdsaXN0TWVzc2FnZXMnLFxuICAnbGlzdE1lbnRpb25zJyxcbiAgJ2xpc3ROb3RpZmljYXRpb25zJyxcbiAgJ21hcmtOb3RpZmljYXRpb25SZWFkJyxcbiAgJ2xpc3RBZ2VudEpvYnMnLFxuICAnY29tcGxldGVBZ2VudEpvYicsXG4gICdhcHBlbmRBZ2VudE1lbW9yeScsXG4gICdzZWFyY2hBZ2VudE1lbW9yeScsXG4gICdnZXRXb3JrSXRlbScsXG4gICdnZXRGZWF0dXJlJyxcbiAgJ2dldENsYWltcycsXG4gICdsaXN0V29ya0l0ZW1zJyxcbiAgJ2V2ZW50cycsXG5dO1xuXG5leHBvcnQgaW50ZXJmYWNlIFBnU3luY0VuZ2luZU9wdGlvbnMge1xuICAvKipcbiAgICogRGlyZWN0b3J5IGZvciBhIERVUkFCTEUgUEdsaXRlIGRhdGFiYXNlIChzdG9yeSAxMywgYG9haHMgc2VydmUgLS1kYXRhYCkuXG4gICAqIE9taXR0ZWQgXHUyMTkyIGluLW1lbW9yeSBkYXRhYmFzZSwgdHJ1bmNhdGVkIHBlciBlbmdpbmUgKGNvbmZvcm1hbmNlIG1vZGUpLlxuICAgKi9cbiAgZGF0YURpcj86IHN0cmluZztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVBnU3luY0VuZ2luZShvcHRpb25zPzogUGdTeW5jRW5naW5lT3B0aW9ucyk6IFNwaW5lRW5naW5lIHtcbiAgY29uc3QgY3JlYXRlZCA9IHVud3JhcChcbiAgICBjYWxsV29ya2VyKHtcbiAgICAgIG9wOiAnbmV3JyxcbiAgICAgIC4uLihvcHRpb25zPy5kYXRhRGlyICE9PSB1bmRlZmluZWQgPyB7IGRhdGFEaXI6IG9wdGlvbnMuZGF0YURpciB9IDoge30pLFxuICAgIH0pLFxuICApIGFzIHsgZW5naW5lSWQ6IG51bWJlciB9O1xuICBjb25zdCBlbmdpbmVJZCA9IGNyZWF0ZWQuZW5naW5lSWQ7XG4gIGNvbnN0IHByb3h5OiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiA9IHt9O1xuICBmb3IgKGNvbnN0IG1ldGhvZCBvZiBNRVRIT0RTKSB7XG4gICAgcHJveHlbbWV0aG9kXSA9ICguLi5hcmdzOiB1bmtub3duW10pID0+XG4gICAgICB1bndyYXAoY2FsbFdvcmtlcih7IG9wOiAnY2FsbCcsIGVuZ2luZUlkLCBtZXRob2QsIGFyZ3MgfSkpO1xuICB9XG4gIHJldHVybiBwcm94eSBhcyB1bmtub3duIGFzIFNwaW5lRW5naW5lO1xufVxuXG4vLyBjcmVhdGVSZXF1aXJlIGtlcHQgZm9yIGZ1dHVyZSBuYXRpdmUtcGcgcGF0aCByZXNvbHV0aW9uOyBoYXJtbGVzcyBpZiB1bnVzZWQuXG5leHBvcnQgY29uc3QgX3JlcXVpcmUgPSBjcmVhdGVSZXF1aXJlKGltcG9ydC5tZXRhLnVybCk7XG4iLCAiLyoqXG4gKiBIYW5kLW1haW50YWluZWQgRERMIG1hdGNoaW5nIHNjaGVtYS50cyAxLTEgKGRyaXp6bGUta2l0IG1pZ3JhdGlvbiBwaXBlbGluZVxuICogaXMgbGF0ZXIgZGVidCkuIFJ1bnMgb24gUEdsaXRlIGluIHRoZSBjb25mb3JtYW5jZSBoYXJuZXNzIHdvcmtlci5cbiAqL1xuZXhwb3J0IGNvbnN0IFNDSEVNQV9TUUwgPSBgXG5DUkVBVEUgVEFCTEUgSUYgTk9UIEVYSVNUUyBhY3RvcnMgKFxuICBpZCBURVhUIFBSSU1BUlkgS0VZLFxuICB0eXBlIFRFWFQgTk9UIE5VTEwsXG4gIGRpc3BsYXlfbmFtZSBURVhUIE5PVCBOVUxMLFxuICBnb3Zlcm5hbmNlX3JvbGUgVEVYVCBOT1QgTlVMTCBERUZBVUxUICdtZW1iZXInLFxuICBwZXJzb25hX2NvZGUgVEVYVFxuKTtcblxuLS0gUGhhc2UgMiB1cGdyYWRlIHBhdGggZm9yIGR1cmFibGUgZGF0YSBkaXJzIGNyZWF0ZWQgdW5kZXIgUGhhc2UgMSAoc3RvcnkgMTMpLlxuQUxURVIgVEFCTEUgYWN0b3JzIEFERCBDT0xVTU4gSUYgTk9UIEVYSVNUUyBnb3Zlcm5hbmNlX3JvbGUgVEVYVCBOT1QgTlVMTCBERUZBVUxUICdtZW1iZXInO1xuLS0gUGhhc2UgNCB1cGdyYWRlIHBhdGggKHJvYWRtYXAgXHUwMEE3Myk6IHBlcnNvbmEgYWN0b3JzIG9uIGR1cmFibGUgUGhhc2UgMS0zIGRpcnMuXG5BTFRFUiBUQUJMRSBhY3RvcnMgQUREIENPTFVNTiBJRiBOT1QgRVhJU1RTIHBlcnNvbmFfY29kZSBURVhUO1xuXG5DUkVBVEUgVEFCTEUgSUYgTk9UIEVYSVNUUyBncmFudHMgKFxuICBhY3Rvcl9pZCBURVhUIE5PVCBOVUxMLFxuICBwZXJtaXNzaW9uIFRFWFQgTk9UIE5VTEwsXG4gIHNjb3BlIFRFWFQsXG4gIFBSSU1BUlkgS0VZIChhY3Rvcl9pZCwgcGVybWlzc2lvbilcbik7XG5cbkNSRUFURSBUQUJMRSBJRiBOT1QgRVhJU1RTIHJvbGVfYXNzaWdubWVudHMgKFxuICBzZXEgU0VSSUFMIFBSSU1BUlkgS0VZLFxuICBhY3Rvcl9pZCBURVhUIE5PVCBOVUxMLFxuICByb2xlX2NvZGUgVEVYVCBOT1QgTlVMTCxcbiAgZ3JhbnRlZF9ieSBURVhUIE5PVCBOVUxMLFxuICByZXZva2VkIEJPT0xFQU4gTk9UIE5VTEwgREVGQVVMVCBGQUxTRVxuKTtcblxuQ1JFQVRFIFRBQkxFIElGIE5PVCBFWElTVFMgd29ya3NwYWNlX3N0YXRlIChcbiAgaWQgVEVYVCBQUklNQVJZIEtFWSxcbiAgcGxhbiBURVhUIE5PVCBOVUxMLFxuICBwbGFuX3ZlcnNpb24gSU5URUdFUiBOT1QgTlVMTCBERUZBVUxUIDEsXG4gIHBvbGljeSBKU09OQiBOT1QgTlVMTCBERUZBVUxUICd7fSc6Ompzb25iLFxuICBwb2xpY3lfdmVyc2lvbiBJTlRFR0VSIE5PVCBOVUxMIERFRkFVTFQgMVxuKTtcblxuQ1JFQVRFIFRBQkxFIElGIE5PVCBFWElTVFMgZ2F0ZV9wb2xpY2llcyAoXG4gIGdhdGUgVEVYVCBQUklNQVJZIEtFWSxcbiAgcG9saWN5IEpTT05CIE5PVCBOVUxMXG4pO1xuXG5DUkVBVEUgVEFCTEUgSUYgTk9UIEVYSVNUUyBmZWF0dXJlcyAoXG4gIGlkIFRFWFQgUFJJTUFSWSBLRVksXG4gIHNlcSBTRVJJQUwgTk9UIE5VTEwsXG4gIHN0YXRlIFRFWFQgTk9UIE5VTEwsXG4gIGRpc3BhdGNoX2hvbGQgQk9PTEVBTiBOT1QgTlVMTCBERUZBVUxUIEZBTFNFXG4pO1xuXG5DUkVBVEUgVEFCTEUgSUYgTk9UIEVYSVNUUyB3b3JrX2l0ZW1zIChcbiAgaWQgVEVYVCBQUklNQVJZIEtFWSxcbiAgc2VxIFNFUklBTCBOT1QgTlVMTCxcbiAgZmVhdHVyZV9pZCBURVhUIE5PVCBOVUxMLFxuICBleHRlcm5hbF9rZXkgVEVYVCBOT1QgTlVMTCxcbiAga2luZCBURVhUIE5PVCBOVUxMIERFRkFVTFQgJ2NvZGUnLFxuICB0aXRsZSBURVhUIE5PVCBOVUxMLFxuICBzdGF0ZSBURVhUIE5PVCBOVUxMLFxuICBibG9ja2VkX3JlYXNvbiBURVhULFxuICByZXZpZXdfbG9vcF9pdGVyYXRpb24gSU5URUdFUiBOT1QgTlVMTCBERUZBVUxUIDAsXG4gIGludGVudF9oYXNoIFRFWFQsXG4gIHBpbm5lZF92ZXJpZmljYXRpb24gSlNPTkIsXG4gIHNwZWNfY2hlY2twb2ludCBCT09MRUFOIE5PVCBOVUxMIERFRkFVTFQgRkFMU0UsXG4gIGRvbmVfY2hlY2twb2ludCBCT09MRUFOIE5PVCBOVUxMIERFRkFVTFQgRkFMU0UsXG4gIGludm9rZV9kZXZfd2l0aCBURVhUIE5PVCBOVUxMIERFRkFVTFQgJycsXG4gIHNwZWNfcGF0aCBURVhUIE5PVCBOVUxMLFxuICBzdGF0ZV92ZXJzaW9uIElOVEVHRVIgTk9UIE5VTEwgREVGQVVMVCAwLFxuICBkZXBlbmRzX29uIEpTT05CIE5PVCBOVUxMIERFRkFVTFQgJ1tdJzo6anNvbmIsXG4gIGxhc3RfZmVuY2luZ190b2tlbiBJTlRFR0VSIE5PVCBOVUxMIERFRkFVTFQgMFxuKTtcblxuLS0gUGhhc2UgNCB1cGdyYWRlIHBhdGggKHJvYWRtYXAgXHUwMEE3MS40KToga2luZCBvbiBkdXJhYmxlIFBoYXNlIDEtMyBkaXJzIHN0YXlzICdjb2RlJy5cbkFMVEVSIFRBQkxFIHdvcmtfaXRlbXMgQUREIENPTFVNTiBJRiBOT1QgRVhJU1RTIGtpbmQgVEVYVCBOT1QgTlVMTCBERUZBVUxUICdjb2RlJztcblxuQ1JFQVRFIFRBQkxFIElGIE5PVCBFWElTVFMgY2xhaW1zIChcbiAgaWQgVEVYVCBQUklNQVJZIEtFWSxcbiAgc2VxIFNFUklBTCBOT1QgTlVMTCxcbiAgd29ya19pdGVtX2lkIFRFWFQgTk9UIE5VTEwsXG4gIGFjdG9yX2lkIFRFWFQgTk9UIE5VTEwsXG4gIGZlbmNpbmdfdG9rZW4gSU5URUdFUiBOT1QgTlVMTCxcbiAgbGVhc2VfZXhwaXJlc19hdCBCSUdJTlQgTk9UIE5VTEwsXG4gIHJlbGVhc2VkIEJPT0xFQU4gTk9UIE5VTEwgREVGQVVMVCBGQUxTRSxcbiAgdHRsX21zIEJJR0lOVCBOT1QgTlVMTFxuKTtcblxuLS0gcm9hZG1hcCBcdTAwQTcxLjM6IG9uZSBsaXZlIGNsYWltIHBlciB3b3JrIGl0ZW0gXHUyMDE0IHJhY2VzIGxvc2UgYnkgY29uc3RyYWludC5cbkNSRUFURSBVTklRVUUgSU5ERVggSUYgTk9UIEVYSVNUUyBjbGFpbXNfb25lX2xpdmVfcGVyX2l0ZW1cbiAgT04gY2xhaW1zICh3b3JrX2l0ZW1faWQpIFdIRVJFIHJlbGVhc2VkID0gZmFsc2U7XG5cbkNSRUFURSBUQUJMRSBJRiBOT1QgRVhJU1RTIGdhdGVfZGVjaXNpb25zIChcbiAgc2VxIFNFUklBTCBQUklNQVJZIEtFWSxcbiAgd29ya19pdGVtX2lkIFRFWFQgTk9UIE5VTEwsXG4gIGdhdGUgVEVYVCBOT1QgTlVMTCxcbiAgZGVjaXNpb24gVEVYVCBOT1QgTlVMTCxcbiAgYWN0b3JfaWQgVEVYVCBOT1QgTlVMTCxcbiAgcm91bmQgSU5URUdFUiBOT1QgTlVMTCBERUZBVUxUIDBcbik7XG5cbi0tIFBoYXNlIDIgdXBncmFkZSBwYXRoIGZvciBkdXJhYmxlIGRhdGEgZGlycyBjcmVhdGVkIHVuZGVyIFBoYXNlIDEgKHN0b3J5IDEzKS5cbkFMVEVSIFRBQkxFIGdhdGVfZGVjaXNpb25zIEFERCBDT0xVTU4gSUYgTk9UIEVYSVNUUyByb3VuZCBJTlRFR0VSIE5PVCBOVUxMIERFRkFVTFQgMDtcblxuQ1JFQVRFIFRBQkxFIElGIE5PVCBFWElTVFMgZXZpZGVuY2UgKFxuICBzZXEgU0VSSUFMIFBSSU1BUlkgS0VZLFxuICB3b3JrX2l0ZW1faWQgVEVYVCBOT1QgTlVMTCxcbiAga2luZCBURVhUIE5PVCBOVUxMLFxuICBwYXlsb2FkIEpTT05CIE5PVCBOVUxMXG4pO1xuXG5DUkVBVEUgVEFCTEUgSUYgTk9UIEVYSVNUUyBldmVudHMgKFxuICBnbG9iYWxfc2VxIFNFUklBTCBQUklNQVJZIEtFWSxcbiAgc3RyZWFtX3R5cGUgVEVYVCBOT1QgTlVMTCxcbiAgc3RyZWFtX2lkIFRFWFQgTk9UIE5VTEwsXG4gIHN0cmVhbV9zZXEgSU5URUdFUiBOT1QgTlVMTCxcbiAgdHlwZSBURVhUIE5PVCBOVUxMLFxuICBhY3Rvcl9pZCBURVhUIE5PVCBOVUxMLFxuICBwYXlsb2FkIEpTT05CIE5PVCBOVUxMLFxuICBjYXVzYXRpb25faWQgVEVYVCxcbiAgaWRlbXBvdGVuY3lfa2V5IFRFWFRcbik7XG5cbi0tIFx1MDBBNzEuNTogVU5JUVVFKHN0cmVhbV9pZCwgc3RyZWFtX3NlcSkgZG91YmxlcyBhcyB0aGUgb3B0aW1pc3RpYyBsb2NrLlxuQ1JFQVRFIFVOSVFVRSBJTkRFWCBJRiBOT1QgRVhJU1RTIGV2ZW50c19zdHJlYW1faWRfc3RyZWFtX3NlcVxuICBPTiBldmVudHMgKHN0cmVhbV9pZCwgc3RyZWFtX3NlcSk7XG5cbkNSRUFURSBUQUJMRSBJRiBOT1QgRVhJU1RTIGlkZW1wb3RlbmN5X2tleXMgKFxuICBrZXkgVEVYVCBQUklNQVJZIEtFWSxcbiAgcmVzdWx0IEpTT05CIE5PVCBOVUxMXG4pO1xuXG4tLSBQaGFzZSAzIGNvbGxhYm9yYXRpb24gKHJvYWRtYXAgXHUwMEE3NSkuIElGIE5PVCBFWElTVFMga2VlcHMgZHVyYWJsZSBQaGFzZS0xLzJcbi0tIGRhdGEgZGlyZWN0b3JpZXMgdXBncmFkaW5nIGluIHBsYWNlIChzdG9yeSAxMykuXG5cbkNSRUFURSBUQUJMRSBJRiBOT1QgRVhJU1RTIHRocmVhZHMgKFxuICBpZCBURVhUIFBSSU1BUlkgS0VZLFxuICBzZXEgU0VSSUFMIE5PVCBOVUxMLFxuICBmZWF0dXJlX2lkIFRFWFQsXG4gIHdvcmtfaXRlbV9pZCBURVhULFxuICBraW5kIFRFWFQgTk9UIE5VTEwsXG4gIHZpc2liaWxpdHkgVEVYVCBOT1QgTlVMTCxcbiAgY3JlYXRlZF9ieSBURVhUIE5PVCBOVUxMLFxuICBwYXJ0aWNpcGFudHMgSlNPTkIgTk9UIE5VTEwgREVGQVVMVCAnW10nOjpqc29uYlxuKTtcblxuQ1JFQVRFIFRBQkxFIElGIE5PVCBFWElTVFMgbWVzc2FnZXMgKFxuICBpZCBURVhUIFBSSU1BUlkgS0VZLFxuICB0aHJlYWRfaWQgVEVYVCBOT1QgTlVMTCxcbiAgc2VxIElOVEVHRVIgTk9UIE5VTEwsXG4gIGF1dGhvcl9pZCBURVhUIE5PVCBOVUxMLFxuICBraW5kIFRFWFQgTk9UIE5VTEwsXG4gIGJvZHkgVEVYVCBOT1QgTlVMTCxcbiAgcmVwbHlfdG8gVEVYVFxuKTtcblxuLS0gXHUwMEE3NS4zOiB0aGUgcGVyLXRocmVhZCBtZXNzYWdlIHNlcXVlbmNlIGlzIGdhcC1mcmVlIEJZIENPTlNUUkFJTlQuXG5DUkVBVEUgVU5JUVVFIElOREVYIElGIE5PVCBFWElTVFMgbWVzc2FnZXNfdGhyZWFkX2lkX3NlcVxuICBPTiBtZXNzYWdlcyAodGhyZWFkX2lkLCBzZXEpO1xuXG5DUkVBVEUgVEFCTEUgSUYgTk9UIEVYSVNUUyBtZW50aW9ucyAoXG4gIHNlcSBTRVJJQUwgUFJJTUFSWSBLRVksXG4gIG1lc3NhZ2VfaWQgVEVYVCBOT1QgTlVMTCxcbiAgbWVudGlvbmVkX2FjdG9yX2lkIFRFWFQgTk9UIE5VTEwsXG4gIHJlc29sdXRpb24gVEVYVCBOT1QgTlVMTFxuKTtcblxuQ1JFQVRFIFRBQkxFIElGIE5PVCBFWElTVFMgbm90aWZpY2F0aW9ucyAoXG4gIGlkIFRFWFQgUFJJTUFSWSBLRVksXG4gIHNlcSBTRVJJQUwgTk9UIE5VTEwsXG4gIGFjdG9yX2lkIFRFWFQgTk9UIE5VTEwsXG4gIHNvdXJjZSBURVhUIE5PVCBOVUxMLFxuICByZWZfaWQgVEVYVCBOT1QgTlVMTCxcbiAgcmVhZCBCT09MRUFOIE5PVCBOVUxMIERFRkFVTFQgRkFMU0Vcbik7XG5cbi0tIFBoYXNlIDUgYWdlbnQgbWVtb3J5IChyb2FkbWFwIFx1MDBBNzYpLiBOZXcgdGFibGUgXHUyMDE0IElGIE5PVCBFWElTVFMgdXBncmFkZXNcbi0tIGR1cmFibGUgUGhhc2UgMS00IGRhdGEgZGlyZWN0b3JpZXMgaW4gcGxhY2U7IG5vIEFMVEVSIG5lZWRlZC5cbkNSRUFURSBUQUJMRSBJRiBOT1QgRVhJU1RTIGFnZW50X21lbW9yaWVzIChcbiAgaWQgVEVYVCBQUklNQVJZIEtFWSxcbiAgYWdlbnRfYWN0b3JfaWQgVEVYVCBOT1QgTlVMTCxcbiAga2luZCBURVhUIE5PVCBOVUxMLFxuICBjb250ZW50IFRFWFQgTk9UIE5VTEwsXG4gIHNvdXJjZV90aHJlYWRfaWQgVEVYVCxcbiAgc291cmNlX3Zpc2liaWxpdHkgVEVYVCxcbiAgc2VxIElOVEVHRVIgTk9UIE5VTExcbik7XG5cbi0tIFx1MDBBNzY6IHBlci1hZ2VudCBtZW1vcnkgb3JkZXIgaXMgYSBDT05TVFJBSU5UICgxLWJhc2VkIGFwcGVuZCBvcmRlcikuXG5DUkVBVEUgVU5JUVVFIElOREVYIElGIE5PVCBFWElTVFMgYWdlbnRfbWVtb3JpZXNfYWdlbnRfYWN0b3JfaWRfc2VxXG4gIE9OIGFnZW50X21lbW9yaWVzIChhZ2VudF9hY3Rvcl9pZCwgc2VxKTtcblxuQ1JFQVRFIFRBQkxFIElGIE5PVCBFWElTVFMgYWdlbnRfam9icyAoXG4gIGlkIFRFWFQgUFJJTUFSWSBLRVksXG4gIHNlcSBTRVJJQUwgTk9UIE5VTEwsXG4gIGFnZW50X2FjdG9yX2lkIFRFWFQgTk9UIE5VTEwsXG4gIHRocmVhZF9pZCBURVhUIE5PVCBOVUxMLFxuICBtZXNzYWdlX2lkIFRFWFQgTk9UIE5VTEwsXG4gIHdvcmtfaXRlbV9pZCBURVhULFxuICBmZWF0dXJlX2lkIFRFWFQsXG4gIHN0YXR1cyBURVhUIE5PVCBOVUxMLFxuICBkZXB0aCBJTlRFR0VSIE5PVCBOVUxMIERFRkFVTFQgMCxcbiAgbm90ZSBURVhUXG4pO1xuYDtcbiIsICJleHBvcnQgeyBQZ0VuZ2luZSB9IGZyb20gJy4vcGctZW5naW5lLmpzJztcbmV4cG9ydCB7IGNyZWF0ZVBnU3luY0VuZ2luZSwgdHlwZSBQZ1N5bmNFbmdpbmVPcHRpb25zIH0gZnJvbSAnLi9zeW5jLWVuZ2luZS5qcyc7XG5leHBvcnQgeyBTQ0hFTUFfU1FMIH0gZnJvbSAnLi9zY2hlbWEtc3FsLmpzJztcbmV4cG9ydCAqIGFzIHNjaGVtYSBmcm9tICcuL3NjaGVtYS5qcyc7XG4iLCAiLyoqXG4gKiBUaGUgYG9haHNgIGJpbmFyeSBcdTIwMTQgY29tbWFuZGVyIHdpcmluZyBPTkxZLiBFdmVyeSBnYXRlLWhvbGRlciBjb21tYW5kIGlzIGFcbiAqIHB1cmUgZnVuY3Rpb24gaW4gc3JjL2NvbW1hbmRzLyB0YWtpbmcgKGNsaWVudCwgb3B0cyk7IHNlcnZlIGxpdmVzIGluXG4gKiBzcmMvc2VydmUudHM7IHRoZSB3b3JrZXIgbG9vcCBsaXZlcyBpbiBAb2Focy9ydW5uZXIgYW5kIGlzIGltcG9ydGVkIExBWklMWVxuICogc28gdGhlIHJlc3Qgb2YgdGhlIENMSSB3b3JrcyB3aGlsZSB0aGUgcnVubmVyIGlzIHN0aWxsIGxhbmRpbmcgKHN0b3J5IDE0KS5cbiAqXG4gKiBFbnYgaXMgcmVhZCBoZXJlIGFuZCBvbmx5IGhlcmU6IE9BSFNfVE9LRU4gKGNsaWVudCBhdXRoKSBhbmRcbiAqIE9BSFNfQURNSU5fVE9LRU4gKHNlcnZlIGJvb3RzdHJhcCkuXG4gKi9cbmltcG9ydCB7IHJlc29sdmUgfSBmcm9tICdub2RlOnBhdGgnO1xuXG5pbXBvcnQgeyBDb21tYW5kIH0gZnJvbSAnY29tbWFuZGVyJztcbmltcG9ydCB7IG1ha2VDbGllbnQsIHR5cGUgT2Foc0NsaWVudCB9IGZyb20gJ0BvYWhzL2NvbnRyYWN0cyc7XG5cbmltcG9ydCB7XG4gIGFjdG9yQ3JlYXRlQ29tbWFuZCxcbiAgYWN0b3JzQ29tbWFuZCxcbiAgYWR2YW5jZUNvbW1hbmQsXG4gIGFkdmlzZU5leHRUYXNrQ29tbWFuZCxcbiAgYWR2aXNlUmVjb25jaWxlQ29tbWFuZCxcbiAgYXBwcm92ZUNvbW1hbmQsXG4gIGF1dGh6Q29tbWFuZCxcbiAgZG9jbGludENvbW1hbmQsXG4gIGV2ZW50c0NvbW1hbmQsXG4gIGZlYXR1cmVDcmVhdGVDb21tYW5kLFxuICBnYXRlUG9saWN5U2V0Q29tbWFuZCxcbiAgZ292ZXJuYW5jZVNldENvbW1hbmQsXG4gIGdyYW50Q29tbWFuZCxcbiAgaW1wb3J0U3Rvcmllc0NvbW1hbmQsXG4gIGluYm94Q29tbWFuZCxcbiAgaXRlbUNyZWF0ZUNvbW1hbmQsXG4gIGpvYkNvbXBsZXRlQ29tbWFuZCxcbiAgam9ic0NvbW1hbmQsXG4gIG1lbW9yeUNvbW1hbmQsXG4gIG1lc3NhZ2VzQ29tbWFuZCxcbiAgbm90aWZpY2F0aW9uc0NvbW1hbmQsXG4gIHBlcnNvbmFzUHJvdmlzaW9uQ29tbWFuZCxcbiAgcGxhblNldENvbW1hbmQsXG4gIHBvbGljeVNldENvbW1hbmQsXG4gIHBvc3RDb21tYW5kLFxuICByZWplY3RDb21tYW5kLFxuICByb2xlQXNzaWduQ29tbWFuZCxcbiAgcm9sZUxpc3RDb21tYW5kLFxuICByb2xlUmV2b2tlQ29tbWFuZCxcbiAgcnVuVG9PdXRwdXQsXG4gIHN0YXRzUmV2aWV3c0NvbW1hbmQsXG4gIHN0YXR1c0NvbW1hbmQsXG4gIHRocmVhZENyZWF0ZUNvbW1hbmQsXG4gIHRocmVhZExpc3RDb21tYW5kLFxufSBmcm9tICcuL2NvbW1hbmRzL2luZGV4LmpzJztcbmltcG9ydCB7IERFRkFVTFRfUE9SVCwgc3RhcnRTZXJ2ZSB9IGZyb20gJy4vc2VydmUuanMnO1xuXG5jb25zdCBERUZBVUxUX1VSTCA9IGBodHRwOi8vbG9jYWxob3N0OiR7REVGQVVMVF9QT1JUfWA7XG5cbmludGVyZmFjZSBDbGllbnRGbGFncyB7XG4gIHVybDogc3RyaW5nO1xuICB0b2tlbj86IHN0cmluZztcbn1cblxuZnVuY3Rpb24gY2xpZW50RnJvbShmbGFnczogQ2xpZW50RmxhZ3MpOiBPYWhzQ2xpZW50IHtcbiAgY29uc3QgdG9rZW4gPSBmbGFncy50b2tlbiA/PyBwcm9jZXNzLmVudlsnT0FIU19UT0tFTiddO1xuICBpZiAodG9rZW4gPT09IHVuZGVmaW5lZCB8fCB0b2tlbi5sZW5ndGggPT09IDApIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ21pc3NpbmcgdG9rZW46IHBhc3MgLS10b2tlbiA8dG9rZW4+IG9yIHNldCBPQUhTX1RPS0VOJyk7XG4gIH1cbiAgcmV0dXJuIG1ha2VDbGllbnQoeyBiYXNlVXJsOiBmbGFncy51cmwsIHRva2VuIH0pO1xufVxuXG4vKiogQXR0YWNoIHRoZSBzaGFyZWQgY2xpZW50IGZsYWdzIHRvIGEgZ2F0ZS1ob2xkZXIgY29tbWFuZC4gKi9cbmZ1bmN0aW9uIHdpdGhDbGllbnRGbGFncyhjbWQ6IENvbW1hbmQpOiBDb21tYW5kIHtcbiAgcmV0dXJuIGNtZFxuICAgIC5vcHRpb24oJy0tdXJsIDx1cmw+JywgJ3NwaW5lLWFwaSBiYXNlIFVSTCcsIERFRkFVTFRfVVJMKVxuICAgIC5vcHRpb24oJy0tdG9rZW4gPHRva2VuPicsICdiZWFyZXIgdG9rZW4gKGRlZmF1bHQ6IGVudiBPQUhTX1RPS0VOKScpO1xufVxuXG4vKiogUnVuIGEgY29tbWFuZCBmdW5jdGlvbiBhbmQgdHJhbnNsYXRlIGl0cyBvdXRjb21lIHRvIHN0ZG91dC9zdGRlcnIgKyBleGl0IGNvZGUuICovXG5hc3luYyBmdW5jdGlvbiBlbWl0KGZuOiAoKSA9PiBQcm9taXNlPHN0cmluZz4pOiBQcm9taXNlPHZvaWQ+IHtcbiAgY29uc3QgeyB0ZXh0LCBleGl0Q29kZSB9ID0gYXdhaXQgcnVuVG9PdXRwdXQoZm4pO1xuICBpZiAoZXhpdENvZGUgPT09IDApIHtcbiAgICBwcm9jZXNzLnN0ZG91dC53cml0ZShgJHt0ZXh0fVxcbmApO1xuICB9IGVsc2Uge1xuICAgIHByb2Nlc3Muc3RkZXJyLndyaXRlKGAke3RleHR9XFxuYCk7XG4gICAgcHJvY2Vzcy5leGl0Q29kZSA9IGV4aXRDb2RlO1xuICB9XG59XG5cbmNvbnN0IGNvbGxlY3QgPSAodmFsdWU6IHN0cmluZywgcHJldmlvdXM6IHN0cmluZ1tdKTogc3RyaW5nW10gPT4gWy4uLnByZXZpb3VzLCB2YWx1ZV07XG5cbmV4cG9ydCBmdW5jdGlvbiBidWlsZFByb2dyYW0oKTogQ29tbWFuZCB7XG4gIGNvbnN0IHByb2dyYW0gPSBuZXcgQ29tbWFuZCgpO1xuICBwcm9ncmFtXG4gICAgLm5hbWUoJ29haHMnKVxuICAgIC5kZXNjcmlwdGlvbignb2FocyBcdTIwMTQgT3BlbiBBZ2VudHMgSGFybmVzcyBTeXN0ZW0gQ0xJIChzcGluZSBzZXJ2ZXIgKyBnYXRlLWhvbGRlciBjb21tYW5kcyknKTtcblxuICAvLyAtLSBzZXJ2ZSAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgcHJvZ3JhbVxuICAgIC5jb21tYW5kKCdzZXJ2ZScpXG4gICAgLmRlc2NyaXB0aW9uKCdzdGFydCB0aGUgc3BpbmUtYXBpIChIVFRQIC9ycGMvKiArIE1DUCAvbWNwKScpXG4gICAgLm9wdGlvbignLS1wb3J0IDxwb3J0PicsICdUQ1AgcG9ydCcsIFN0cmluZyhERUZBVUxUX1BPUlQpKVxuICAgIC5vcHRpb24oJy0tYWRtaW4tdG9rZW4gPHRva2VuPicsICdib290c3RyYXAgYWRtaW4gdG9rZW4gKGRlZmF1bHQ6IGVudiBPQUhTX0FETUlOX1RPS0VOLCBlbHNlIGdlbmVyYXRlZCknKVxuICAgIC5vcHRpb24oJy0tZGF0YSA8ZGlyPicsICdwZXJzaXN0ZW5jZSBkaXJlY3RvcnkgKGR1cmFibGUgUEdsaXRlICsgdG9rZW4gc3RvcmUpJylcbiAgICAuYWN0aW9uKGFzeW5jIChvcHRzOiB7IHBvcnQ6IHN0cmluZzsgYWRtaW5Ub2tlbj86IHN0cmluZzsgZGF0YT86IHN0cmluZyB9KSA9PiB7XG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCBhZG1pblRva2VuID0gb3B0cy5hZG1pblRva2VuID8/IHByb2Nlc3MuZW52WydPQUhTX0FETUlOX1RPS0VOJ107XG4gICAgICAgIGNvbnN0IGhhbmRsZSA9IGF3YWl0IHN0YXJ0U2VydmUoe1xuICAgICAgICAgIHBvcnQ6IE51bWJlcihvcHRzLnBvcnQpLFxuICAgICAgICAgIC4uLihhZG1pblRva2VuICE9PSB1bmRlZmluZWQgJiYgYWRtaW5Ub2tlbi5sZW5ndGggPiAwID8geyBhZG1pblRva2VuIH0gOiB7fSksXG4gICAgICAgICAgLi4uKG9wdHMuZGF0YSAhPT0gdW5kZWZpbmVkID8geyBkYXRhRGlyOiByZXNvbHZlKG9wdHMuZGF0YSkgfSA6IHt9KSxcbiAgICAgICAgfSk7XG4gICAgICAgIHByb2Nlc3Muc3Rkb3V0LndyaXRlKFxuICAgICAgICAgIGBvYWhzIHNwaW5lLWFwaSBsaXN0ZW5pbmcgb24gOiR7aGFuZGxlLnBvcnR9IChIVFRQIC9ycGMvKiwgTUNQIC9tY3A7IGVuZ2luZTogJHtoYW5kbGUuZW5naW5lS2luZH0ke1xuICAgICAgICAgICAgb3B0cy5kYXRhICE9PSB1bmRlZmluZWQgPyBgLCBkYXRhOiAke3Jlc29sdmUob3B0cy5kYXRhKX1gIDogJydcbiAgICAgICAgICB9KVxcbmAsXG4gICAgICAgICk7XG4gICAgICAgIGlmIChoYW5kbGUuYWRtaW5Ub2tlbkdlbmVyYXRlZCkge1xuICAgICAgICAgIHByb2Nlc3Muc3Rkb3V0LndyaXRlKGBhZG1pbiB0b2tlbiAoZ2VuZXJhdGVkKTogJHtoYW5kbGUuYWRtaW5Ub2tlbn1cXG5gKTtcbiAgICAgICAgfVxuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgY29uc3QgZXJyID0gZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yIDogbmV3IEVycm9yKFN0cmluZyhlcnJvcikpO1xuICAgICAgICBwcm9jZXNzLnN0ZGVyci53cml0ZShgJHtlcnIubmFtZX06ICR7ZXJyLm1lc3NhZ2V9XFxuYCk7XG4gICAgICAgIHByb2Nlc3MuZXhpdENvZGUgPSAxO1xuICAgICAgfVxuICAgIH0pO1xuXG4gIC8vIC0tIGdhdGUtaG9sZGVyIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICB3aXRoQ2xpZW50RmxhZ3MocHJvZ3JhbS5jb21tYW5kKCdpbmJveCcpKVxuICAgIC5kZXNjcmlwdGlvbignaXRlbXMgYXdhaXRpbmcgYSBnYXRlIGRlY2lzaW9uIChzcGVjIGFwcHJvdmFsIC8gcmV2aWV3IGRlY2lzaW9uKScpXG4gICAgLmFjdGlvbihhc3luYyAob3B0czogQ2xpZW50RmxhZ3MpID0+IGVtaXQoKCkgPT4gaW5ib3hDb21tYW5kKGNsaWVudEZyb20ob3B0cykpKSk7XG5cbiAgd2l0aENsaWVudEZsYWdzKHByb2dyYW0uY29tbWFuZCgnYXBwcm92ZSA8d29ya0l0ZW1JZD4nKSlcbiAgICAuZGVzY3JpcHRpb24oJ2FwcHJvdmUgYSBnYXRlIChzcGVjX2FwcHJvdmFsIHBpbnMgdmVyaWZpY2F0aW9uIGNvbW1hbmRzKScpXG4gICAgLnJlcXVpcmVkT3B0aW9uKCctLWdhdGUgPGdhdGU+JywgJ3NwZWNfYXBwcm92YWwgfCByZXZpZXdfYXBwcm92YWwnKVxuICAgIC5vcHRpb24oJy0tcGluIDxjbWQ+JywgJ3BpbiBhIHZlcmlmaWNhdGlvbiBjb21tYW5kIChyZXBlYXRhYmxlLCBzcGVjX2FwcHJvdmFsIG9ubHkpJywgY29sbGVjdCwgW10pXG4gICAgLmFjdGlvbihhc3luYyAod29ya0l0ZW1JZDogc3RyaW5nLCBvcHRzOiBDbGllbnRGbGFncyAmIHsgZ2F0ZTogc3RyaW5nOyBwaW46IHN0cmluZ1tdIH0pID0+XG4gICAgICBlbWl0KCgpID0+IGFwcHJvdmVDb21tYW5kKGNsaWVudEZyb20ob3B0cyksIHsgd29ya0l0ZW1JZCwgZ2F0ZTogb3B0cy5nYXRlLCBwaW46IG9wdHMucGluIH0pKSxcbiAgICApO1xuXG4gIHdpdGhDbGllbnRGbGFncyhwcm9ncmFtLmNvbW1hbmQoJ2FkdmFuY2UgPHdvcmtJdGVtSWQ+JykpXG4gICAgLmRlc2NyaXB0aW9uKCdhZHZhbmNlIGEgd29yayBpdGVtIHRocm91Z2ggdGhlIEZTTSAocGxhbm5pbmctem9uZSBtb3ZlcyBmb3IgaHVtYW5zKScpXG4gICAgLnJlcXVpcmVkT3B0aW9uKCctLXRvIDxzdGF0ZT4nLCAndGFyZ2V0IHN0YXRlLCBlLmcuIGRyYWZ0IHwgcmVhZHlfZm9yX2RldicpXG4gICAgLm9wdGlvbignLS1mZW5jaW5nLXRva2VuIDxuPicsICdmZW5jaW5nIHRva2VuIHdoZW4gYWN0aW5nIHVuZGVyIGEgY2xhaW0nLCAodjogc3RyaW5nKSA9PiBOdW1iZXIodikpXG4gICAgLmFjdGlvbihhc3luYyAod29ya0l0ZW1JZDogc3RyaW5nLCBvcHRzOiBDbGllbnRGbGFncyAmIHsgdG86IHN0cmluZzsgZmVuY2luZ1Rva2VuPzogbnVtYmVyIH0pID0+XG4gICAgICBlbWl0KCgpID0+XG4gICAgICAgIGFkdmFuY2VDb21tYW5kKGNsaWVudEZyb20ob3B0cyksIHtcbiAgICAgICAgICB3b3JrSXRlbUlkLFxuICAgICAgICAgIHRvOiBvcHRzLnRvLFxuICAgICAgICAgIC4uLihvcHRzLmZlbmNpbmdUb2tlbiAhPT0gdW5kZWZpbmVkID8geyBmZW5jaW5nVG9rZW46IG9wdHMuZmVuY2luZ1Rva2VuIH0gOiB7fSksXG4gICAgICAgIH0pLFxuICAgICAgKSxcbiAgICApO1xuXG4gIHdpdGhDbGllbnRGbGFncyhwcm9ncmFtLmNvbW1hbmQoJ3JlamVjdCA8d29ya0l0ZW1JZD4nKSlcbiAgICAuZGVzY3JpcHRpb24oJ3JlamVjdCBhIGdhdGUgKHJldmlldyByZWplY3Rpb24gZmlyZXMgdGhlIGRldGVybWluaXN0aWMgbG9vcGJhY2spJylcbiAgICAucmVxdWlyZWRPcHRpb24oJy0tZ2F0ZSA8Z2F0ZT4nLCAnc3BlY19hcHByb3ZhbCB8IHJldmlld19hcHByb3ZhbCcpXG4gICAgLmFjdGlvbihhc3luYyAod29ya0l0ZW1JZDogc3RyaW5nLCBvcHRzOiBDbGllbnRGbGFncyAmIHsgZ2F0ZTogc3RyaW5nIH0pID0+XG4gICAgICBlbWl0KCgpID0+IHJlamVjdENvbW1hbmQoY2xpZW50RnJvbShvcHRzKSwgeyB3b3JrSXRlbUlkLCBnYXRlOiBvcHRzLmdhdGUgfSkpLFxuICAgICk7XG5cbiAgd2l0aENsaWVudEZsYWdzKHByb2dyYW0uY29tbWFuZCgnc3RhdHVzJykpXG4gICAgLmRlc2NyaXB0aW9uKCdhbGwgd29yayBpdGVtcyBncm91cGVkIGJ5IHN0YXRlLCBwbHVzIGZlYXR1cmUgZGlzcGF0Y2ggaG9sZHMnKVxuICAgIC5hY3Rpb24oYXN5bmMgKG9wdHM6IENsaWVudEZsYWdzKSA9PiBlbWl0KCgpID0+IHN0YXR1c0NvbW1hbmQoY2xpZW50RnJvbShvcHRzKSkpKTtcblxuICBjb25zdCBhY3RvciA9IHByb2dyYW0uY29tbWFuZCgnYWN0b3InKS5kZXNjcmlwdGlvbignYWN0b3IgbWFuYWdlbWVudCAoYWRtaW4pJyk7XG4gIHdpdGhDbGllbnRGbGFncyhhY3Rvci5jb21tYW5kKCdjcmVhdGUnKSlcbiAgICAuZGVzY3JpcHRpb24oJ2NyZWF0ZSBhIHVzZXIgb3IgYWdlbnQgYWN0b3I7IHByaW50cyBhY3RvcklkICsgdG9rZW4gKGFkbWluIG9ubHkpJylcbiAgICAucmVxdWlyZWRPcHRpb24oJy0tdHlwZSA8dHlwZT4nLCAndXNlciB8IGFnZW50JylcbiAgICAucmVxdWlyZWRPcHRpb24oJy0tbmFtZSA8bmFtZT4nLCAnZGlzcGxheSBuYW1lJylcbiAgICAub3B0aW9uKCctLWdvdmVybmFuY2Utcm9sZSA8cm9sZT4nLCAnYWRtaW4gfCBtZW1iZXIgfCBhdWRpdG9yIChib290c3RyYXAgcGx1bWJpbmcsIGFkbWluIG9ubHkpJylcbiAgICAuYWN0aW9uKGFzeW5jIChvcHRzOiBDbGllbnRGbGFncyAmIHsgdHlwZTogc3RyaW5nOyBuYW1lOiBzdHJpbmc7IGdvdmVybmFuY2VSb2xlPzogc3RyaW5nIH0pID0+XG4gICAgICBlbWl0KCgpID0+XG4gICAgICAgIGFjdG9yQ3JlYXRlQ29tbWFuZChjbGllbnRGcm9tKG9wdHMpLCB7XG4gICAgICAgICAgdHlwZTogb3B0cy50eXBlLFxuICAgICAgICAgIG5hbWU6IG9wdHMubmFtZSxcbiAgICAgICAgICAuLi4ob3B0cy5nb3Zlcm5hbmNlUm9sZSAhPT0gdW5kZWZpbmVkID8geyBnb3Zlcm5hbmNlUm9sZTogb3B0cy5nb3Zlcm5hbmNlUm9sZSB9IDoge30pLFxuICAgICAgICB9KSxcbiAgICAgICksXG4gICAgKTtcblxuICAvLyAtLSBQaGFzZSA0OiBub24tY29kaW5nIHRlYW1tYXRlcyBvbiB0aGUgc2FtZSByYWlscyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgd2l0aENsaWVudEZsYWdzKHByb2dyYW0uY29tbWFuZCgnYWN0b3JzJykpXG4gICAgLmRlc2NyaXB0aW9uKCdsaXN0IEFMTCBhY3RvcnMgXHUyMDE0IGh1bWFucywgYWdlbnRzLCBwZXJzb25hcywgYW5kIHRoZSBzeXN0ZW0gYWN0b3InKVxuICAgIC5hY3Rpb24oYXN5bmMgKG9wdHM6IENsaWVudEZsYWdzKSA9PiBlbWl0KCgpID0+IGFjdG9yc0NvbW1hbmQoY2xpZW50RnJvbShvcHRzKSkpKTtcblxuICBjb25zdCBwZXJzb25hcyA9IHByb2dyYW0uY29tbWFuZCgncGVyc29uYXMnKS5kZXNjcmlwdGlvbignQk1BRCBwZXJzb25hIGFnZW50IGFjdG9ycyAocm9hZG1hcCBcdTAwQTczKScpO1xuICB3aXRoQ2xpZW50RmxhZ3MocGVyc29uYXMuY29tbWFuZCgncHJvdmlzaW9uJykpXG4gICAgLmRlc2NyaXB0aW9uKCdpZGVtcG90ZW50bHkgcHJvdmlzaW9uIHRoZSBzaXggQk1BRCBwZXJzb25hcyAoZ292ZXJuYW5jZS1hZG1pbiBvbmx5LCBlbmdpbmUtZ2F0ZWQpJylcbiAgICAuYWN0aW9uKGFzeW5jIChvcHRzOiBDbGllbnRGbGFncykgPT4gZW1pdCgoKSA9PiBwZXJzb25hc1Byb3Zpc2lvbkNvbW1hbmQoY2xpZW50RnJvbShvcHRzKSkpKTtcblxuICBjb25zdCBpdGVtID0gcHJvZ3JhbS5jb21tYW5kKCdpdGVtJykuZGVzY3JpcHRpb24oJ3NpbmdsZSB3b3JrIGl0ZW1zIChQaGFzZSA0OiBub24tY29kZSBraW5kcyknKTtcbiAgd2l0aENsaWVudEZsYWdzKGl0ZW0uY29tbWFuZCgnY3JlYXRlJykpXG4gICAgLmRlc2NyaXB0aW9uKCdjcmVhdGUgb25lIHdvcmsgaXRlbTsgLS1raW5kIHNlbGVjdHMgZXZpZGVuY2UgZ3VhcmRzLCBuZXZlciBnYXRlIGF1dGhvcml0eScpXG4gICAgLnJlcXVpcmVkT3B0aW9uKCctLWZlYXR1cmUgPGZlYXR1cmVJZD4nLCAnZmVhdHVyZSB0byBjcmVhdGUgdGhlIGl0ZW0gaW4nKVxuICAgIC5yZXF1aXJlZE9wdGlvbignLS1rZXkgPGV4dGVybmFsS2V5PicsICdleHRlcm5hbCBrZXkgKHN0b3JpZXMueWFtbCBpZCB2b2NhYnVsYXJ5KScpXG4gICAgLnJlcXVpcmVkT3B0aW9uKCctLXRpdGxlIDx0aXRsZT4nLCAnd29yayBpdGVtIHRpdGxlJylcbiAgICAub3B0aW9uKCctLWtpbmQgPGtpbmQ+JywgJ2NvZGUgfCBzcGVjX2RyYWZ0IHwgZGVzaWduX3JldmlldyB8IHFhX3JlcG9ydCB8IGRvYyAoZGVmYXVsdCBjb2RlKScpXG4gICAgLm9wdGlvbignLS1zcGVjLWNoZWNrcG9pbnQnLCAncmVxdWlyZSBzcGVjX2FwcHJvdmFsIGJlZm9yZSByZWFkeV9mb3JfZGV2JylcbiAgICAub3B0aW9uKCctLWRvbmUtY2hlY2twb2ludCcsICdob2xkIGZlYXR1cmUgZGlzcGF0Y2ggYWZ0ZXIgdGhpcyBpdGVtIGlzIGRvbmUnKVxuICAgIC5vcHRpb24oJy0taW52b2tlLWRldi13aXRoIDx0ZXh0PicsICdhZ2VudCBpbnZvY2F0aW9uIGhpbnQnKVxuICAgIC5vcHRpb24oJy0tZGVwZW5kcy1vbiA8ZXh0ZXJuYWxLZXk+JywgJ2RlcGVuZGVuY3kgZXh0ZXJuYWwga2V5IChyZXBlYXRhYmxlKScsIGNvbGxlY3QsIFtdKVxuICAgIC5hY3Rpb24oXG4gICAgICBhc3luYyAoXG4gICAgICAgIG9wdHM6IENsaWVudEZsYWdzICYge1xuICAgICAgICAgIGZlYXR1cmU6IHN0cmluZztcbiAgICAgICAgICBrZXk6IHN0cmluZztcbiAgICAgICAgICB0aXRsZTogc3RyaW5nO1xuICAgICAgICAgIGtpbmQ/OiBzdHJpbmc7XG4gICAgICAgICAgc3BlY0NoZWNrcG9pbnQ/OiBib29sZWFuO1xuICAgICAgICAgIGRvbmVDaGVja3BvaW50PzogYm9vbGVhbjtcbiAgICAgICAgICBpbnZva2VEZXZXaXRoPzogc3RyaW5nO1xuICAgICAgICAgIGRlcGVuZHNPbjogc3RyaW5nW107XG4gICAgICAgIH0sXG4gICAgICApID0+XG4gICAgICAgIGVtaXQoKCkgPT5cbiAgICAgICAgICBpdGVtQ3JlYXRlQ29tbWFuZChjbGllbnRGcm9tKG9wdHMpLCB7XG4gICAgICAgICAgICBmZWF0dXJlSWQ6IG9wdHMuZmVhdHVyZSxcbiAgICAgICAgICAgIGV4dGVybmFsS2V5OiBvcHRzLmtleSxcbiAgICAgICAgICAgIHRpdGxlOiBvcHRzLnRpdGxlLFxuICAgICAgICAgICAgLi4uKG9wdHMua2luZCAhPT0gdW5kZWZpbmVkID8geyBraW5kOiBvcHRzLmtpbmQgfSA6IHt9KSxcbiAgICAgICAgICAgIC4uLihvcHRzLnNwZWNDaGVja3BvaW50ID09PSB0cnVlID8geyBzcGVjQ2hlY2twb2ludDogdHJ1ZSB9IDoge30pLFxuICAgICAgICAgICAgLi4uKG9wdHMuZG9uZUNoZWNrcG9pbnQgPT09IHRydWUgPyB7IGRvbmVDaGVja3BvaW50OiB0cnVlIH0gOiB7fSksXG4gICAgICAgICAgICAuLi4ob3B0cy5pbnZva2VEZXZXaXRoICE9PSB1bmRlZmluZWQgPyB7IGludm9rZURldldpdGg6IG9wdHMuaW52b2tlRGV2V2l0aCB9IDoge30pLFxuICAgICAgICAgICAgLi4uKG9wdHMuZGVwZW5kc09uLmxlbmd0aCA+IDAgPyB7IGRlcGVuZHNPbjogb3B0cy5kZXBlbmRzT24gfSA6IHt9KSxcbiAgICAgICAgICB9KSxcbiAgICAgICAgKSxcbiAgICApO1xuXG4gIHdpdGhDbGllbnRGbGFncyhwcm9ncmFtLmNvbW1hbmQoJ2RvY2xpbnQgPGZpbGU+JykpXG4gICAgLmRlc2NyaXB0aW9uKCdkZXRlcm1pbmlzdGljIGRvY3VtZW50IGxpbnQgKG5vIExMTSk7IC0tc3VibWl0IHNlbmRzIGRvY19saW50IGV2aWRlbmNlOyBleGl0IDEgd2hlbiBub3Qgc2NoZW1hLXZhbGlkJylcbiAgICAub3B0aW9uKCctLXJlcXVpcmUtc2VjdGlvbiA8bmFtZT4nLCAncmVxdWlyZWQgIyMgc2VjdGlvbiAocmVwZWF0YWJsZSknLCBjb2xsZWN0LCBbXSlcbiAgICAub3B0aW9uKCctLXdvcmstaXRlbSA8d29ya0l0ZW1JZD4nLCAnd29yayBpdGVtIHRvIHN1Ym1pdCBkb2NfbGludCBldmlkZW5jZSBvbicpXG4gICAgLm9wdGlvbignLS1zdWJtaXQnLCAnc3VibWl0IHtzY2hlbWFWYWxpZCwgZmluZGluZ3N9IGFzIGRvY19saW50IGV2aWRlbmNlIHZpYSB0aGUgcmFpbHMnKVxuICAgIC5vcHRpb24oJy0tZmVuY2luZy10b2tlbiA8bj4nLCAnZmVuY2luZyB0b2tlbiB3aGVuIGFjdGluZyB1bmRlciBhIGNsYWltJywgKHY6IHN0cmluZykgPT4gTnVtYmVyKHYpKVxuICAgIC5hY3Rpb24oXG4gICAgICBhc3luYyAoXG4gICAgICAgIGZpbGU6IHN0cmluZyxcbiAgICAgICAgb3B0czogQ2xpZW50RmxhZ3MgJiB7XG4gICAgICAgICAgcmVxdWlyZVNlY3Rpb246IHN0cmluZ1tdO1xuICAgICAgICAgIHdvcmtJdGVtPzogc3RyaW5nO1xuICAgICAgICAgIHN1Ym1pdD86IGJvb2xlYW47XG4gICAgICAgICAgZmVuY2luZ1Rva2VuPzogbnVtYmVyO1xuICAgICAgICB9LFxuICAgICAgKSA9PiB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgLy8gVGhlIGxpbnQgaXRzZWxmIG5lZWRzIG5vIHNlcnZlcjsgYSBjbGllbnQgZXhpc3RzIG9ubHkgZm9yIC0tc3VibWl0LlxuICAgICAgICAgIGNvbnN0IGNsaWVudCA9IG9wdHMuc3VibWl0ID09PSB0cnVlID8gY2xpZW50RnJvbShvcHRzKSA6IG51bGw7XG4gICAgICAgICAgY29uc3QgeyB0ZXh0LCBleGl0Q29kZSB9ID0gYXdhaXQgZG9jbGludENvbW1hbmQoY2xpZW50LCB7XG4gICAgICAgICAgICBwYXRoOiBmaWxlLFxuICAgICAgICAgICAgLi4uKG9wdHMucmVxdWlyZVNlY3Rpb24ubGVuZ3RoID4gMCA/IHsgcmVxdWlyZVNlY3Rpb25zOiBvcHRzLnJlcXVpcmVTZWN0aW9uIH0gOiB7fSksXG4gICAgICAgICAgICAuLi4ob3B0cy53b3JrSXRlbSAhPT0gdW5kZWZpbmVkID8geyB3b3JrSXRlbUlkOiBvcHRzLndvcmtJdGVtIH0gOiB7fSksXG4gICAgICAgICAgICAuLi4ob3B0cy5zdWJtaXQgPT09IHRydWUgPyB7IHN1Ym1pdDogdHJ1ZSB9IDoge30pLFxuICAgICAgICAgICAgLi4uKG9wdHMuZmVuY2luZ1Rva2VuICE9PSB1bmRlZmluZWQgPyB7IGZlbmNpbmdUb2tlbjogb3B0cy5mZW5jaW5nVG9rZW4gfSA6IHt9KSxcbiAgICAgICAgICB9KTtcbiAgICAgICAgICBwcm9jZXNzLnN0ZG91dC53cml0ZShgJHt0ZXh0fVxcbmApO1xuICAgICAgICAgIHByb2Nlc3MuZXhpdENvZGUgPSBleGl0Q29kZTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICBjb25zdCBlcnIgPSBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IgOiBuZXcgRXJyb3IoU3RyaW5nKGVycm9yKSk7XG4gICAgICAgICAgcHJvY2Vzcy5zdGRlcnIud3JpdGUoYCR7ZXJyLm5hbWV9OiAke2Vyci5tZXNzYWdlfVxcbmApO1xuICAgICAgICAgIHByb2Nlc3MuZXhpdENvZGUgPSAxO1xuICAgICAgICB9XG4gICAgICB9LFxuICAgICk7XG5cbiAgd2l0aENsaWVudEZsYWdzKHByb2dyYW0uY29tbWFuZCgnZ3JhbnQgPGFjdG9ySWQ+IDxwZXJtaXNzaW9uPicpKVxuICAgIC5kZXNjcmlwdGlvbignZ3JhbnQgYSBwZXJtaXNzaW9uIHRvIGFuIGFjdG9yIChhZG1pbiBvbmx5KScpXG4gICAgLmFjdGlvbihhc3luYyAoYWN0b3JJZDogc3RyaW5nLCBwZXJtaXNzaW9uOiBzdHJpbmcsIG9wdHM6IENsaWVudEZsYWdzKSA9PlxuICAgICAgZW1pdCgoKSA9PiBncmFudENvbW1hbmQoY2xpZW50RnJvbShvcHRzKSwgeyBhY3RvcklkLCBwZXJtaXNzaW9uIH0pKSxcbiAgICApO1xuXG4gIC8vIC0tIGVudGl0bGVtZW50cyAoUGhhc2UgMiwgcm9hZG1hcCBcdTAwQTczKSAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgY29uc3Qgcm9sZSA9IHByb2dyYW0uY29tbWFuZCgncm9sZScpLmRlc2NyaXB0aW9uKCdkZWxpdmVyeSByb2xlcyBcdTIwMTQgcGVybWlzc2lvbiBidW5kbGVzIChyb2FkbWFwIFx1MDBBNzMpJyk7XG4gIHdpdGhDbGllbnRGbGFncyhyb2xlLmNvbW1hbmQoJ2Fzc2lnbiA8YWN0b3JJZD4gPHJvbGVDb2RlPicpKVxuICAgIC5kZXNjcmlwdGlvbignYXNzaWduIGEgZGVsaXZlcnkgcm9sZSB0byBhbiBhY3RvciAoZ292ZXJuYW5jZS1hZG1pbiBvbmx5LCBlbmdpbmUtZ2F0ZWQpJylcbiAgICAuYWN0aW9uKGFzeW5jIChhY3RvcklkOiBzdHJpbmcsIHJvbGVDb2RlOiBzdHJpbmcsIG9wdHM6IENsaWVudEZsYWdzKSA9PlxuICAgICAgZW1pdCgoKSA9PiByb2xlQXNzaWduQ29tbWFuZChjbGllbnRGcm9tKG9wdHMpLCB7IGFjdG9ySWQsIHJvbGVDb2RlIH0pKSxcbiAgICApO1xuICB3aXRoQ2xpZW50RmxhZ3Mocm9sZS5jb21tYW5kKCdyZXZva2UgPGFjdG9ySWQ+IDxyb2xlQ29kZT4nKSlcbiAgICAuZGVzY3JpcHRpb24oJ3Jldm9rZSBhIGRlbGl2ZXJ5IHJvbGUgZnJvbSBhbiBhY3RvciAoZ292ZXJuYW5jZS1hZG1pbiBvbmx5LCBlbmdpbmUtZ2F0ZWQpJylcbiAgICAuYWN0aW9uKGFzeW5jIChhY3RvcklkOiBzdHJpbmcsIHJvbGVDb2RlOiBzdHJpbmcsIG9wdHM6IENsaWVudEZsYWdzKSA9PlxuICAgICAgZW1pdCgoKSA9PiByb2xlUmV2b2tlQ29tbWFuZChjbGllbnRGcm9tKG9wdHMpLCB7IGFjdG9ySWQsIHJvbGVDb2RlIH0pKSxcbiAgICApO1xuICB3aXRoQ2xpZW50RmxhZ3Mocm9sZS5jb21tYW5kKCdsaXN0IFthY3RvcklkXScpKVxuICAgIC5kZXNjcmlwdGlvbignbGlzdCBkZWxpdmVyeS1yb2xlIGFzc2lnbm1lbnRzIChhbGwsIG9yIG9uZSBhY3RvciknKVxuICAgIC5hY3Rpb24oYXN5bmMgKGFjdG9ySWQ6IHN0cmluZyB8IHVuZGVmaW5lZCwgb3B0czogQ2xpZW50RmxhZ3MpID0+XG4gICAgICBlbWl0KCgpID0+IHJvbGVMaXN0Q29tbWFuZChjbGllbnRGcm9tKG9wdHMpLCBhY3RvcklkICE9PSB1bmRlZmluZWQgPyB7IGFjdG9ySWQgfSA6IHt9KSksXG4gICAgKTtcblxuICBjb25zdCBwbGFuID0gcHJvZ3JhbS5jb21tYW5kKCdwbGFuJykuZGVzY3JpcHRpb24oJ3dvcmtzcGFjZSBwbGFuIFx1MjAxNCBhIGNlaWxpbmcsIG5ldmVyIGEgZ3JhbnQgKHJvYWRtYXAgXHUwMEE3MyknKTtcbiAgd2l0aENsaWVudEZsYWdzKHBsYW4uY29tbWFuZCgnc2V0IDxwbGFuPicpKVxuICAgIC5kZXNjcmlwdGlvbignc2V0IHRoZSB3b3Jrc3BhY2UgcGxhbjogZnJlZSB8IHRlYW0gfCBlbnRlcnByaXNlIChnb3Zlcm5hbmNlLWFkbWluIG9ubHkpJylcbiAgICAuYWN0aW9uKGFzeW5jIChwbGFuQ29kZTogc3RyaW5nLCBvcHRzOiBDbGllbnRGbGFncykgPT5cbiAgICAgIGVtaXQoKCkgPT4gcGxhblNldENvbW1hbmQoY2xpZW50RnJvbShvcHRzKSwgeyBwbGFuOiBwbGFuQ29kZSB9KSksXG4gICAgKTtcblxuICBjb25zdCBwb2xpY3kgPSBwcm9ncmFtLmNvbW1hbmQoJ3BvbGljeScpLmRlc2NyaXB0aW9uKCdyZXN0cmljdC1vbmx5IHdvcmtzcGFjZSBwb2xpY3kgKHJvYWRtYXAgXHUwMEE3MyknKTtcbiAgd2l0aENsaWVudEZsYWdzKHBvbGljeS5jb21tYW5kKCdzZXQnKSlcbiAgICAuZGVzY3JpcHRpb24oJ3NldCByZXN0cmljdC1vbmx5IHBvbGljeSBrZXlzIChnb3Zlcm5hbmNlLWFkbWluIG9ubHkpJylcbiAgICAub3B0aW9uKCctLWFnZW50LWdhdGUtYXBwcm92YWxzIDxib29sPicsICd0cnVlIHwgZmFsc2UgXHUyMDE0IG1heSBhZ2VudHMgZXhlcmNpc2UgZ2F0ZSBhcHByb3ZhbHM/JylcbiAgICAub3B0aW9uKCctLWFnZW50LXNlbGYtZGlzcGF0Y2ggPGJvb2w+JywgJ3RydWUgfCBmYWxzZSBcdTIwMTQgbWF5IGFnZW50cyBjbGFpbSB0YXNrcyBvbiB0aGVpciBvd24/JylcbiAgICAuYWN0aW9uKGFzeW5jIChvcHRzOiBDbGllbnRGbGFncyAmIHsgYWdlbnRHYXRlQXBwcm92YWxzPzogc3RyaW5nOyBhZ2VudFNlbGZEaXNwYXRjaD86IHN0cmluZyB9KSA9PlxuICAgICAgZW1pdCgoKSA9PlxuICAgICAgICBwb2xpY3lTZXRDb21tYW5kKGNsaWVudEZyb20ob3B0cyksIHtcbiAgICAgICAgICAuLi4ob3B0cy5hZ2VudEdhdGVBcHByb3ZhbHMgIT09IHVuZGVmaW5lZCA/IHsgYWdlbnRHYXRlQXBwcm92YWxzOiBvcHRzLmFnZW50R2F0ZUFwcHJvdmFscyB9IDoge30pLFxuICAgICAgICAgIC4uLihvcHRzLmFnZW50U2VsZkRpc3BhdGNoICE9PSB1bmRlZmluZWQgPyB7IGFnZW50U2VsZkRpc3BhdGNoOiBvcHRzLmFnZW50U2VsZkRpc3BhdGNoIH0gOiB7fSksXG4gICAgICAgIH0pLFxuICAgICAgKSxcbiAgICApO1xuXG4gIGNvbnN0IGdhdGVQb2xpY3kgPSBwcm9ncmFtLmNvbW1hbmQoJ2dhdGUtcG9saWN5JykuZGVzY3JpcHRpb24oJ2dhdGUgZGVmaW5pdGlvbnMgYXMgZGF0YSAocm9hZG1hcCBcdTAwQTczKScpO1xuICB3aXRoQ2xpZW50RmxhZ3MoZ2F0ZVBvbGljeS5jb21tYW5kKCdzZXQgPGdhdGU+JykpXG4gICAgLmRlc2NyaXB0aW9uKCdzZXQgcXVvcnVtL2FjdG9yLXR5cGUgcmVxdWlyZW1lbnRzIG9mIGEgZ2F0ZSAoZ292ZXJuYW5jZS1hZG1pbiBvbmx5KScpXG4gICAgLm9wdGlvbignLS1taW4tYXBwcm92YWxzIDxuPicsICdkaXN0aW5jdCBhcHByb3ZlcnMgcmVxdWlyZWQgcGVyIHJldmlldyByb3VuZCcpXG4gICAgLm9wdGlvbignLS1yZXF1aXJlLXR5cGUgPHR5cGU+JywgJ3JlcXVpcmUgYXQgbGVhc3Qgb25lIGFwcHJvdmVyIG9mIHRoaXMgdHlwZSAocmVwZWF0YWJsZSknLCBjb2xsZWN0LCBbXSlcbiAgICAuYWN0aW9uKGFzeW5jIChnYXRlOiBzdHJpbmcsIG9wdHM6IENsaWVudEZsYWdzICYgeyBtaW5BcHByb3ZhbHM/OiBzdHJpbmc7IHJlcXVpcmVUeXBlOiBzdHJpbmdbXSB9KSA9PlxuICAgICAgZW1pdCgoKSA9PlxuICAgICAgICBnYXRlUG9saWN5U2V0Q29tbWFuZChjbGllbnRGcm9tKG9wdHMpLCB7XG4gICAgICAgICAgZ2F0ZSxcbiAgICAgICAgICAuLi4ob3B0cy5taW5BcHByb3ZhbHMgIT09IHVuZGVmaW5lZCA/IHsgbWluQXBwcm92YWxzOiBvcHRzLm1pbkFwcHJvdmFscyB9IDoge30pLFxuICAgICAgICAgIC4uLihvcHRzLnJlcXVpcmVUeXBlLmxlbmd0aCA+IDAgPyB7IHJlcXVpcmVUeXBlczogb3B0cy5yZXF1aXJlVHlwZSB9IDoge30pLFxuICAgICAgICB9KSxcbiAgICAgICksXG4gICAgKTtcblxuICBjb25zdCBnb3Zlcm5hbmNlID0gcHJvZ3JhbS5jb21tYW5kKCdnb3Zlcm5hbmNlJykuZGVzY3JpcHRpb24oJ2dvdmVybmFuY2Ugcm9sZXMgKHJvYWRtYXAgXHUwMEE3MyknKTtcbiAgd2l0aENsaWVudEZsYWdzKGdvdmVybmFuY2UuY29tbWFuZCgnc2V0IDxhY3RvcklkPiA8cm9sZT4nKSlcbiAgICAuZGVzY3JpcHRpb24oJ3NldCBhbiBhY3RvciBnb3Zlcm5hbmNlIHJvbGU6IGFkbWluIHwgbWVtYmVyIHwgYXVkaXRvciAoZ292ZXJuYW5jZS1hZG1pbiBvbmx5KScpXG4gICAgLmFjdGlvbihhc3luYyAoYWN0b3JJZDogc3RyaW5nLCByb2xlQ29kZTogc3RyaW5nLCBvcHRzOiBDbGllbnRGbGFncykgPT5cbiAgICAgIGVtaXQoKCkgPT4gZ292ZXJuYW5jZVNldENvbW1hbmQoY2xpZW50RnJvbShvcHRzKSwgeyBhY3RvcklkLCByb2xlOiByb2xlQ29kZSB9KSksXG4gICAgKTtcblxuICB3aXRoQ2xpZW50RmxhZ3MocHJvZ3JhbS5jb21tYW5kKCdhdXRoeiA8YWN0b3JJZD4gPHBlcm1pc3Npb24+JykpXG4gICAgLmRlc2NyaXB0aW9uKCdwcmludCB0aGUgcmVwbGF5YWJsZSBhdXRoeiBkZWNpc2lvbiB0cmFjZSBmb3IgYW4gYWN0b3IgXHUwMEQ3IHBlcm1pc3Npb24gKHJvYWRtYXAgXHUwMEE3MyknKVxuICAgIC5hY3Rpb24oYXN5bmMgKGFjdG9ySWQ6IHN0cmluZywgcGVybWlzc2lvbjogc3RyaW5nLCBvcHRzOiBDbGllbnRGbGFncykgPT5cbiAgICAgIGVtaXQoKCkgPT4gYXV0aHpDb21tYW5kKGNsaWVudEZyb20ob3B0cyksIHsgYWN0b3JJZCwgcGVybWlzc2lvbiB9KSksXG4gICAgKTtcblxuICBjb25zdCBmZWF0dXJlID0gcHJvZ3JhbS5jb21tYW5kKCdmZWF0dXJlJykuZGVzY3JpcHRpb24oJ2ZlYXR1cmUgbWFuYWdlbWVudCcpO1xuICB3aXRoQ2xpZW50RmxhZ3MoZmVhdHVyZS5jb21tYW5kKCdjcmVhdGUnKSlcbiAgICAuZGVzY3JpcHRpb24oJ2NyZWF0ZSBhIGZlYXR1cmU7IHByaW50cyBmZWF0dXJlSWQnKVxuICAgIC5hY3Rpb24oYXN5bmMgKG9wdHM6IENsaWVudEZsYWdzKSA9PiBlbWl0KCgpID0+IGZlYXR1cmVDcmVhdGVDb21tYW5kKGNsaWVudEZyb20ob3B0cykpKSk7XG5cbiAgd2l0aENsaWVudEZsYWdzKHByb2dyYW0uY29tbWFuZCgnaW1wb3J0IDxmZWF0dXJlSWQ+IDxzdG9yaWVzWWFtbFBhdGg+JykpXG4gICAgLmRlc2NyaXB0aW9uKCdpbXBvcnQgYSBzdG9yaWVzLnlhbWwgZmlsZSBpbnRvIGEgZmVhdHVyZSAoaWRlbXBvdGVudCknKVxuICAgIC5hY3Rpb24oYXN5bmMgKGZlYXR1cmVJZDogc3RyaW5nLCBzdG9yaWVzWWFtbFBhdGg6IHN0cmluZywgb3B0czogQ2xpZW50RmxhZ3MpID0+XG4gICAgICBlbWl0KCgpID0+IGltcG9ydFN0b3JpZXNDb21tYW5kKGNsaWVudEZyb20ob3B0cyksIHsgZmVhdHVyZUlkLCBwYXRoOiBzdG9yaWVzWWFtbFBhdGggfSkpLFxuICAgICk7XG5cbiAgLy8gLS0gY29sbGFib3JhdGlvbiAoUGhhc2UgMywgcm9hZG1hcCBcdTAwQTc1KSAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgY29uc3QgdGhyZWFkID0gcHJvZ3JhbS5jb21tYW5kKCd0aHJlYWQnKS5kZXNjcmlwdGlvbignY29udmVyc2F0aW9uIHRocmVhZHMgKFBoYXNlIDMsIHJvYWRtYXAgXHUwMEE3NSknKTtcbiAgd2l0aENsaWVudEZsYWdzKHRocmVhZC5jb21tYW5kKCdjcmVhdGUnKSlcbiAgICAuZGVzY3JpcHRpb24oJ2NyZWF0ZSBhIHRocmVhZCwgb3B0aW9uYWxseSBib3VuZCB0byBhIGZlYXR1cmUvd29yayBpdGVtJylcbiAgICAucmVxdWlyZWRPcHRpb24oJy0ta2luZCA8a2luZD4nLCAnc3BlYyB8IGRlc2lnbiB8IHRhc2sgfCBnZW5lcmFsIHwgcHJpdmF0ZScpXG4gICAgLm9wdGlvbignLS1mZWF0dXJlIDxmZWF0dXJlSWQ+JywgJ2JpbmQgdG8gYSBmZWF0dXJlJylcbiAgICAub3B0aW9uKCctLXdvcmstaXRlbSA8d29ya0l0ZW1JZD4nLCAnYmluZCB0byBhIHdvcmsgaXRlbSAoaWQgb3IgZXh0ZXJuYWxLZXkpJylcbiAgICAub3B0aW9uKCctLXZpc2liaWxpdHkgPHZpc2liaWxpdHk+JywgJ29wZW4gfCBwcml2YXRlJylcbiAgICAuYWN0aW9uKFxuICAgICAgYXN5bmMgKFxuICAgICAgICBvcHRzOiBDbGllbnRGbGFncyAmIHsga2luZDogc3RyaW5nOyBmZWF0dXJlPzogc3RyaW5nOyB3b3JrSXRlbT86IHN0cmluZzsgdmlzaWJpbGl0eT86IHN0cmluZyB9LFxuICAgICAgKSA9PlxuICAgICAgICBlbWl0KCgpID0+XG4gICAgICAgICAgdGhyZWFkQ3JlYXRlQ29tbWFuZChjbGllbnRGcm9tKG9wdHMpLCB7XG4gICAgICAgICAgICBraW5kOiBvcHRzLmtpbmQsXG4gICAgICAgICAgICAuLi4ob3B0cy5mZWF0dXJlICE9PSB1bmRlZmluZWQgPyB7IGZlYXR1cmVJZDogb3B0cy5mZWF0dXJlIH0gOiB7fSksXG4gICAgICAgICAgICAuLi4ob3B0cy53b3JrSXRlbSAhPT0gdW5kZWZpbmVkID8geyB3b3JrSXRlbUlkOiBvcHRzLndvcmtJdGVtIH0gOiB7fSksXG4gICAgICAgICAgICAuLi4ob3B0cy52aXNpYmlsaXR5ICE9PSB1bmRlZmluZWQgPyB7IHZpc2liaWxpdHk6IG9wdHMudmlzaWJpbGl0eSB9IDoge30pLFxuICAgICAgICAgIH0pLFxuICAgICAgICApLFxuICAgICk7XG4gIHdpdGhDbGllbnRGbGFncyh0aHJlYWQuY29tbWFuZCgnbGlzdCcpKVxuICAgIC5kZXNjcmlwdGlvbignbGlzdCB0aHJlYWRzIChwcml2YXRlIG9uZXMgb25seSB3aGVuIHlvdSBwYXJ0aWNpcGF0ZSknKVxuICAgIC5vcHRpb24oJy0tZmVhdHVyZSA8ZmVhdHVyZUlkPicsICdmaWx0ZXIgYnkgZmVhdHVyZScpXG4gICAgLm9wdGlvbignLS13b3JrLWl0ZW0gPHdvcmtJdGVtSWQ+JywgJ2ZpbHRlciBieSB3b3JrIGl0ZW0nKVxuICAgIC5hY3Rpb24oYXN5bmMgKG9wdHM6IENsaWVudEZsYWdzICYgeyBmZWF0dXJlPzogc3RyaW5nOyB3b3JrSXRlbT86IHN0cmluZyB9KSA9PlxuICAgICAgZW1pdCgoKSA9PlxuICAgICAgICB0aHJlYWRMaXN0Q29tbWFuZChjbGllbnRGcm9tKG9wdHMpLCB7XG4gICAgICAgICAgLi4uKG9wdHMuZmVhdHVyZSAhPT0gdW5kZWZpbmVkID8geyBmZWF0dXJlSWQ6IG9wdHMuZmVhdHVyZSB9IDoge30pLFxuICAgICAgICAgIC4uLihvcHRzLndvcmtJdGVtICE9PSB1bmRlZmluZWQgPyB7IHdvcmtJdGVtSWQ6IG9wdHMud29ya0l0ZW0gfSA6IHt9KSxcbiAgICAgICAgfSksXG4gICAgICApLFxuICAgICk7XG5cbiAgd2l0aENsaWVudEZsYWdzKHByb2dyYW0uY29tbWFuZCgncG9zdCA8dGhyZWFkSWQ+IDxib2R5PicpKVxuICAgIC5kZXNjcmlwdGlvbigncG9zdCBhIG1lc3NhZ2U7IC0tbWVudGlvbiB0YWtlcyBTVFJVQ1RVUkVEIGFjdG9yIGlkcyAoYm9keSB0ZXh0IGlzIG5ldmVyIHBhcnNlZCknKVxuICAgIC5vcHRpb24oJy0tbWVudGlvbiA8YWN0b3JJZD4nLCAnbWVudGlvbiBhbiBhY3RvciBieSBpZCAocmVwZWF0YWJsZSknLCBjb2xsZWN0LCBbXSlcbiAgICAub3B0aW9uKCctLXJlcGx5LXRvIDxtZXNzYWdlSWQ+JywgJ3JlcGx5IHRvIGEgbWVzc2FnZScpXG4gICAgLmFjdGlvbihcbiAgICAgIGFzeW5jICh0aHJlYWRJZDogc3RyaW5nLCBib2R5OiBzdHJpbmcsIG9wdHM6IENsaWVudEZsYWdzICYgeyBtZW50aW9uOiBzdHJpbmdbXTsgcmVwbHlUbz86IHN0cmluZyB9KSA9PlxuICAgICAgICBlbWl0KCgpID0+XG4gICAgICAgICAgcG9zdENvbW1hbmQoY2xpZW50RnJvbShvcHRzKSwge1xuICAgICAgICAgICAgdGhyZWFkSWQsXG4gICAgICAgICAgICBib2R5LFxuICAgICAgICAgICAgLi4uKG9wdHMubWVudGlvbi5sZW5ndGggPiAwID8geyBtZW50aW9uczogb3B0cy5tZW50aW9uIH0gOiB7fSksXG4gICAgICAgICAgICAuLi4ob3B0cy5yZXBseVRvICE9PSB1bmRlZmluZWQgPyB7IHJlcGx5VG86IG9wdHMucmVwbHlUbyB9IDoge30pLFxuICAgICAgICAgIH0pLFxuICAgICAgICApLFxuICAgICk7XG5cbiAgd2l0aENsaWVudEZsYWdzKHByb2dyYW0uY29tbWFuZCgnbWVzc2FnZXMgPHRocmVhZElkPicpKVxuICAgIC5kZXNjcmlwdGlvbignbGlzdCBtZXNzYWdlcyBvZiBhIHRocmVhZCAocmF3IGF1dGhvcklkOyBzeXN0ZW0gbmFycmF0aW9uIGluY2x1ZGVkKScpXG4gICAgLm9wdGlvbignLS1zaW5jZSA8c2VxPicsICdvbmx5IG1lc3NhZ2VzIHdpdGggc2VxIGdyZWF0ZXIgdGhhbiB0aGlzJywgKHY6IHN0cmluZykgPT4gTnVtYmVyKHYpKVxuICAgIC5hY3Rpb24oYXN5bmMgKHRocmVhZElkOiBzdHJpbmcsIG9wdHM6IENsaWVudEZsYWdzICYgeyBzaW5jZT86IG51bWJlciB9KSA9PlxuICAgICAgZW1pdCgoKSA9PlxuICAgICAgICBtZXNzYWdlc0NvbW1hbmQoY2xpZW50RnJvbShvcHRzKSwge1xuICAgICAgICAgIHRocmVhZElkLFxuICAgICAgICAgIC4uLihvcHRzLnNpbmNlICE9PSB1bmRlZmluZWQgPyB7IHNpbmNlU2VxOiBvcHRzLnNpbmNlIH0gOiB7fSksXG4gICAgICAgIH0pLFxuICAgICAgKSxcbiAgICApO1xuXG4gIHdpdGhDbGllbnRGbGFncyhwcm9ncmFtLmNvbW1hbmQoJ25vdGlmaWNhdGlvbnMnKSlcbiAgICAuZGVzY3JpcHRpb24oJ3lvdXIgb3duIG5vdGlmaWNhdGlvbnMgKG1lbnRpb25zICsgYWdlbnQtam9iIGNvbXBsZXRpb25zKScpXG4gICAgLm9wdGlvbignLS11bnJlYWQnLCAnb25seSB1bnJlYWQgbm90aWZpY2F0aW9ucycpXG4gICAgLmFjdGlvbihhc3luYyAob3B0czogQ2xpZW50RmxhZ3MgJiB7IHVucmVhZD86IGJvb2xlYW4gfSkgPT5cbiAgICAgIGVtaXQoKCkgPT5cbiAgICAgICAgbm90aWZpY2F0aW9uc0NvbW1hbmQoY2xpZW50RnJvbShvcHRzKSwgb3B0cy51bnJlYWQgPT09IHRydWUgPyB7IHVucmVhZE9ubHk6IHRydWUgfSA6IHt9KSxcbiAgICAgICksXG4gICAgKTtcblxuICBjb25zdCBqb2IgPSBwcm9ncmFtLmNvbW1hbmQoJ2pvYicpLmRlc2NyaXB0aW9uKCdyb3V0ZXItbWF0ZXJpYWxpemVkIGFnZW50IGpvYnMgKHJlcGx5LW9ubHksIFx1MDBBNzUuNCknKTtcbiAgd2l0aENsaWVudEZsYWdzKHByb2dyYW0uY29tbWFuZCgnam9icycpKVxuICAgIC5kZXNjcmlwdGlvbignbGlzdCBhZ2VudCBqb2JzJylcbiAgICAub3B0aW9uKCctLWFnZW50IDxhY3RvcklkPicsICdmaWx0ZXIgYnkgYWdlbnQgYWN0b3InKVxuICAgIC5vcHRpb24oJy0tc3RhdHVzIDxzdGF0dXM+JywgJ3F1ZXVlZCB8IGRvbmUgfCBibG9ja2VkJylcbiAgICAuYWN0aW9uKGFzeW5jIChvcHRzOiBDbGllbnRGbGFncyAmIHsgYWdlbnQ/OiBzdHJpbmc7IHN0YXR1cz86IHN0cmluZyB9KSA9PlxuICAgICAgZW1pdCgoKSA9PlxuICAgICAgICBqb2JzQ29tbWFuZChjbGllbnRGcm9tKG9wdHMpLCB7XG4gICAgICAgICAgLi4uKG9wdHMuYWdlbnQgIT09IHVuZGVmaW5lZCA/IHsgYWdlbnRBY3RvcklkOiBvcHRzLmFnZW50IH0gOiB7fSksXG4gICAgICAgICAgLi4uKG9wdHMuc3RhdHVzICE9PSB1bmRlZmluZWQgPyB7IHN0YXR1czogb3B0cy5zdGF0dXMgfSA6IHt9KSxcbiAgICAgICAgfSksXG4gICAgICApLFxuICAgICk7XG4gIHdpdGhDbGllbnRGbGFncyhqb2IuY29tbWFuZCgnZG9uZSA8am9iSWQ+JykpXG4gICAgLmRlc2NyaXB0aW9uKCdjb21wbGV0ZSBhIGpvYiBhcyBpdHMgYWdlbnQgKG5vdGlmaWVzIHRoZSBtZW50aW9uZXIgXHUyMDE0IG5vdGhpbmcgZWxzZSBtb3ZlcyknKVxuICAgIC5vcHRpb24oJy0tbm90ZSA8bm90ZT4nLCAnY29tcGxldGlvbiBub3RlJylcbiAgICAuYWN0aW9uKGFzeW5jIChqb2JJZDogc3RyaW5nLCBvcHRzOiBDbGllbnRGbGFncyAmIHsgbm90ZT86IHN0cmluZyB9KSA9PlxuICAgICAgZW1pdCgoKSA9PlxuICAgICAgICBqb2JDb21wbGV0ZUNvbW1hbmQoY2xpZW50RnJvbShvcHRzKSwge1xuICAgICAgICAgIGpvYklkLFxuICAgICAgICAgIHN0YXR1czogJ2RvbmUnLFxuICAgICAgICAgIC4uLihvcHRzLm5vdGUgIT09IHVuZGVmaW5lZCA/IHsgbm90ZTogb3B0cy5ub3RlIH0gOiB7fSksXG4gICAgICAgIH0pLFxuICAgICAgKSxcbiAgICApO1xuXG4gIC8vIC0tIGFkdmlzb3IgYm90cyAocmVhZCArIHBvc3Qgb25seSwgZGV0ZXJtaW5pc3RpYywgbm8gTExNKSAtLS0tLS0tLS0tLS0tLS0tLS0tLVxuICBjb25zdCBhZHZpc2UgPSBwcm9ncmFtXG4gICAgLmNvbW1hbmQoJ2FkdmlzZScpXG4gICAgLmRlc2NyaXB0aW9uKCdkZXRlcm1pbmlzdGljIGFkdmlzb3IgYm90cyBcdTIwMTQgcmVhZCArIHBvc3Qgb25seSwgbmV2ZXIgYSBsaWZlY3ljbGUgbXV0YXRpb24nKTtcbiAgd2l0aENsaWVudEZsYWdzKGFkdmlzZS5jb21tYW5kKCduZXh0LXRhc2snKSlcbiAgICAuZGVzY3JpcHRpb24oJ3Bvc3QgdGhlIHN1Z2dlc3RlZCBjbGFpbSBvcmRlciAoY2xhaW1hYmxlIHJlYWR5X2Zvcl9kZXYpIGludG8gYSB0aHJlYWQnKVxuICAgIC5yZXF1aXJlZE9wdGlvbignLS10aHJlYWQgPHRocmVhZElkPicsICd0aHJlYWQgdG8gcG9zdCB0aGUgYWR2aWNlIGludG8nKVxuICAgIC5hY3Rpb24oYXN5bmMgKG9wdHM6IENsaWVudEZsYWdzICYgeyB0aHJlYWQ6IHN0cmluZyB9KSA9PlxuICAgICAgZW1pdCgoKSA9PiBhZHZpc2VOZXh0VGFza0NvbW1hbmQoY2xpZW50RnJvbShvcHRzKSwgeyB0aHJlYWRJZDogb3B0cy50aHJlYWQgfSkpLFxuICAgICk7XG4gIHdpdGhDbGllbnRGbGFncyhhZHZpc2UuY29tbWFuZCgncmVjb25jaWxlJykpXG4gICAgLmRlc2NyaXB0aW9uKCdwb3N0IHRoZSBkZXRlY3Qtb25seSBmaWxlXHUyMTk0REIgZGl2ZXJnZW5jZSByZXBvcnQgaW50byBhIHRocmVhZCcpXG4gICAgLnJlcXVpcmVkT3B0aW9uKCctLXRocmVhZCA8dGhyZWFkSWQ+JywgJ3RocmVhZCB0byBwb3N0IHRoZSBhZHZpY2UgaW50bycpXG4gICAgLnJlcXVpcmVkT3B0aW9uKCctLWZpbGUgPHBhaXI+JywgJ29uZSA8d29ya0l0ZW1JZD49PGZyb250bWF0dGVyU3RhdHVzPiBwYWlyIChyZXBlYXRhYmxlKScsIGNvbGxlY3QsIFtdKVxuICAgIC5hY3Rpb24oYXN5bmMgKG9wdHM6IENsaWVudEZsYWdzICYgeyB0aHJlYWQ6IHN0cmluZzsgZmlsZTogc3RyaW5nW10gfSkgPT5cbiAgICAgIGVtaXQoKCkgPT5cbiAgICAgICAgYWR2aXNlUmVjb25jaWxlQ29tbWFuZChjbGllbnRGcm9tKG9wdHMpLCB7IHRocmVhZElkOiBvcHRzLnRocmVhZCwgZmlsZXM6IG9wdHMuZmlsZSB9KSxcbiAgICAgICksXG4gICAgKTtcblxuICAvLyAtLSBQaGFzZSA1IChyb2FkbWFwIFx1MDBBNzYpOiBsZWFybmluZyB0ZWFtbWF0ZXMgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgd2l0aENsaWVudEZsYWdzKHByb2dyYW0uY29tbWFuZCgnbWVtb3J5JykpXG4gICAgLmRlc2NyaXB0aW9uKCd5b3VyIE9XTiBhZ2VudCBtZW1vcmllcyAob3duZXItc2NvcGVkIGJ5IGNvbnN0cnVjdGlvbiBcdTIwMTQgbm8gY3Jvc3MtYWN0b3IgcGFyYW1ldGVyIGV4aXN0cyknKVxuICAgIC5vcHRpb24oJy0ta2luZCA8a2luZD4nLCAnZXBpc29kaWMgfCBwcm9jZWR1cmFsIHwgZW50aXR5JylcbiAgICAub3B0aW9uKCctLXF1ZXJ5IDx0ZXh0PicsICdjYXNlLWluc2Vuc2l0aXZlIHN1YnN0cmluZyBmaWx0ZXInKVxuICAgIC5vcHRpb24oJy0tY29udGV4dCA8dGhyZWFkSWQ+JywgJ3JlY2FsbCBjb250ZXh0IHRocmVhZCAoZ2F0ZXMgcHJpdmF0ZS1zb3VyY2VkIG1lbW9yaWVzLCBcdTAwQTc2KScpXG4gICAgLmFjdGlvbihhc3luYyAob3B0czogQ2xpZW50RmxhZ3MgJiB7IGtpbmQ/OiBzdHJpbmc7IHF1ZXJ5Pzogc3RyaW5nOyBjb250ZXh0Pzogc3RyaW5nIH0pID0+XG4gICAgICBlbWl0KCgpID0+XG4gICAgICAgIG1lbW9yeUNvbW1hbmQoY2xpZW50RnJvbShvcHRzKSwge1xuICAgICAgICAgIC4uLihvcHRzLmtpbmQgIT09IHVuZGVmaW5lZCA/IHsga2luZDogb3B0cy5raW5kIH0gOiB7fSksXG4gICAgICAgICAgLi4uKG9wdHMucXVlcnkgIT09IHVuZGVmaW5lZCA/IHsgcXVlcnk6IG9wdHMucXVlcnkgfSA6IHt9KSxcbiAgICAgICAgICAuLi4ob3B0cy5jb250ZXh0ICE9PSB1bmRlZmluZWQgPyB7IGNvbnRleHRUaHJlYWRJZDogb3B0cy5jb250ZXh0IH0gOiB7fSksXG4gICAgICAgIH0pLFxuICAgICAgKSxcbiAgICApO1xuXG4gIGNvbnN0IHN0YXRzID0gcHJvZ3JhbS5jb21tYW5kKCdzdGF0cycpLmRlc2NyaXB0aW9uKCdkZXRlcm1pbmlzdGljIGRlbGl2ZXJ5IG1ldHJpY3MgKHJvYWRtYXAgXHUwMEE3NiknKTtcbiAgd2l0aENsaWVudEZsYWdzKHN0YXRzLmNvbW1hbmQoJ3Jldmlld3MnKSlcbiAgICAuZGVzY3JpcHRpb24oJ3Jldmlldy1sb29wIGNvbnZlcmdlbmNlIHBlciBraW5kICsgcGVyIGl0ZW0gXHUyMDE0IHRoZSBpbXByb3ZlLXdlZWstb3Zlci13ZWVrIG1lYXN1cmluZyBzdGljaycpXG4gICAgLmFjdGlvbihhc3luYyAob3B0czogQ2xpZW50RmxhZ3MpID0+IGVtaXQoKCkgPT4gc3RhdHNSZXZpZXdzQ29tbWFuZChjbGllbnRGcm9tKG9wdHMpKSkpO1xuXG4gIHdpdGhDbGllbnRGbGFncyhwcm9ncmFtLmNvbW1hbmQoJ2V2ZW50cyBbc3RyZWFtSWRdJykpXG4gICAgLmRlc2NyaXB0aW9uKCdhdWRpdCBxdWVyeSBvdmVyIHRoZSBhcHBlbmQtb25seSBldmVudCBsb2cnKVxuICAgIC5hY3Rpb24oYXN5bmMgKHN0cmVhbUlkOiBzdHJpbmcgfCB1bmRlZmluZWQsIG9wdHM6IENsaWVudEZsYWdzKSA9PlxuICAgICAgZW1pdCgoKSA9PlxuICAgICAgICBldmVudHNDb21tYW5kKGNsaWVudEZyb20ob3B0cyksIHN0cmVhbUlkICE9PSB1bmRlZmluZWQgPyB7IHN0cmVhbUlkIH0gOiB7fSksXG4gICAgICApLFxuICAgICk7XG5cbiAgLy8gLS0gd29yayAocnVubmVyIGhhbmRvZmY7IEBvYWhzL3J1bm5lciBsYW5kcyB3aXRoIHN0b3J5IDE0KSAtLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHdpdGhDbGllbnRGbGFncyhwcm9ncmFtLmNvbW1hbmQoJ3dvcmsnKSlcbiAgICAuZGVzY3JpcHRpb24oJ3J1biB0aGUgQllPIHdvcmtlciBsb29wIChjb2RpbmcpIG9yIC0tam9iczogdGhlIHRlYW1tYXRlIGpvYnMgbG9vcCAocmVwbHktb25seSwgcm9hZG1hcCBcdTAwQTc2KScpXG4gICAgLm9wdGlvbignLS1qb2JzJywgJ3NlcnZlIHJlcGx5LW9ubHkgYWdlbnQgam9icyBmb3IgVEhJUyB0b2tlblx1MjAxOXMgYWdlbnQgKG1lbnRpb24tZGlzcGF0Y2gsIHplcm8gbGlmZWN5Y2xlIGF1dGhvcml0eSknKVxuICAgIC5vcHRpb24oJy0tcmVwbyA8cGF0aD4nLCAndGFyZ2V0IHByb2plY3QgZ2l0IGNoZWNrb3V0IChjb2RpbmcgbW9kZSknKVxuICAgIC5vcHRpb24oJy0tc3BlYy1mb2xkZXIgPHJlbD4nLCAnc3BlYyBmb2xkZXIgcmVsYXRpdmUgdG8gdGhlIHJlcG8gcm9vdCAoY29kaW5nIG1vZGUpJylcbiAgICAucmVxdWlyZWRPcHRpb24oXG4gICAgICAnLS1hZ2VudC1jbWQgPHRlbXBsYXRlPicsXG4gICAgICAnYWdlbnQgY29tbWFuZCB0ZW1wbGF0ZSAoY29kaW5nOiB7U1BFQ19GT0xERVJ9IHtTVE9SWV9JRH0ge0lOVk9LRV9XSVRIfSB7V09SS1RSRUV9OyBqb2JzOiB7Q09OVEVYVF9GSUxFfSB7UkVQTFlfRklMRX0ge1RIUkVBRF9JRH0ge0pPQl9JRH0pJyxcbiAgICApXG4gICAgLm9wdGlvbignLS1vbmNlJywgJ3J1biBhdCBtb3N0IG9uZSBkaXNwYXRjaC9qb2IgY3ljbGUsIHRoZW4gZXhpdCcpXG4gICAgLm9wdGlvbignLS1wb2xsIDxtcz4nLCAncG9sbCBpbnRlcnZhbCBpbiBtaWxsaXNlY29uZHMnKVxuICAgIC5hY3Rpb24oXG4gICAgICBhc3luYyAoXG4gICAgICAgIG9wdHM6IENsaWVudEZsYWdzICYge1xuICAgICAgICAgIGpvYnM/OiBib29sZWFuO1xuICAgICAgICAgIHJlcG8/OiBzdHJpbmc7XG4gICAgICAgICAgc3BlY0ZvbGRlcj86IHN0cmluZztcbiAgICAgICAgICBhZ2VudENtZDogc3RyaW5nO1xuICAgICAgICAgIG9uY2U/OiBib29sZWFuO1xuICAgICAgICAgIHBvbGw/OiBzdHJpbmc7XG4gICAgICAgIH0sXG4gICAgICApID0+IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBjb25zdCBjbGllbnQgPSBjbGllbnRGcm9tKG9wdHMpO1xuICAgICAgICAgIC8vIExBWlkgaW1wb3J0OiB0aGUgcnVubmVyIGlzIGEgZml4ZWQgaW50ZXJmYWNlIHRoYXQgbWF5IHN0aWxsIGJlIGFcbiAgICAgICAgICAvLyBzdHViIFx1MjAxNCB0aGUgcmVzdCBvZiB0aGUgQ0xJIG11c3QgbmV2ZXIgcGF5IGZvciAob3IgYnJlYWsgb24pIGl0LlxuICAgICAgICAgIGNvbnN0IHJ1bm5lciA9IGF3YWl0IGltcG9ydCgnQG9haHMvcnVubmVyJyk7XG4gICAgICAgICAgaWYgKG9wdHMuam9icyA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgLy8gVGhlIHNlcnZlZCBhZ2VudCBpcyBBTFdBWVMgdGhlIGF1dGhlbnRpY2F0ZWQgdG9rZW4ncyBhY3RvciBcdTIwMTRcbiAgICAgICAgICAgIC8vIHdob2FtaSwgbmV2ZXIgYSBmbGFnIChvd25lci1zY29waW5nIG1pcnJvcnMgdGhlIG1lbW9yeSByYWlscykuXG4gICAgICAgICAgICBjb25zdCBtZSA9IGF3YWl0IGNsaWVudC5jYWxsPHsgYWN0b3JJZDogc3RyaW5nIH0+KCd3aG9hbWknKTtcbiAgICAgICAgICAgIGF3YWl0IHJ1bm5lci5qb2JzTG9vcCh7XG4gICAgICAgICAgICAgIGNsaWVudCxcbiAgICAgICAgICAgICAgYWdlbnRBY3RvcklkOiBtZS5hY3RvcklkLFxuICAgICAgICAgICAgICBhZ2VudENtZDogb3B0cy5hZ2VudENtZCxcbiAgICAgICAgICAgICAgLi4uKG9wdHMucG9sbCAhPT0gdW5kZWZpbmVkID8geyBwb2xsTXM6IE51bWJlcihvcHRzLnBvbGwpIH0gOiB7fSksXG4gICAgICAgICAgICAgIC4uLihvcHRzLm9uY2UgPT09IHRydWUgPyB7IG9uY2U6IHRydWUgfSA6IHt9KSxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAob3B0cy5yZXBvID09PSB1bmRlZmluZWQgfHwgb3B0cy5zcGVjRm9sZGVyID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignY29kaW5nIG1vZGUgcmVxdWlyZXMgLS1yZXBvIGFuZCAtLXNwZWMtZm9sZGVyIChvciBwYXNzIC0tam9icyknKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgYXdhaXQgcnVubmVyLndvcmtMb29wKHtcbiAgICAgICAgICAgIGNsaWVudCxcbiAgICAgICAgICAgIHJlcG9QYXRoOiByZXNvbHZlKG9wdHMucmVwbyksXG4gICAgICAgICAgICBzcGVjRm9sZGVyOiBvcHRzLnNwZWNGb2xkZXIsXG4gICAgICAgICAgICBhZ2VudENtZDogb3B0cy5hZ2VudENtZCxcbiAgICAgICAgICAgIC4uLihvcHRzLnBvbGwgIT09IHVuZGVmaW5lZCA/IHsgcG9sbE1zOiBOdW1iZXIob3B0cy5wb2xsKSB9IDoge30pLFxuICAgICAgICAgICAgLi4uKG9wdHMub25jZSA9PT0gdHJ1ZSA/IHsgb25jZTogdHJ1ZSB9IDoge30pLFxuICAgICAgICAgIH0pO1xuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgIGNvbnN0IGVyciA9IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvciA6IG5ldyBFcnJvcihTdHJpbmcoZXJyb3IpKTtcbiAgICAgICAgICBwcm9jZXNzLnN0ZGVyci53cml0ZShgb2FocyB3b3JrIGZhaWxlZCBcdTIwMTQgJHtlcnIubmFtZX06ICR7ZXJyLm1lc3NhZ2V9XFxuYCk7XG4gICAgICAgICAgcHJvY2Vzcy5leGl0Q29kZSA9IDE7XG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgKTtcblxuICByZXR1cm4gcHJvZ3JhbTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIG1haW4oYXJndjogc3RyaW5nW10gPSBwcm9jZXNzLmFyZ3YpOiBQcm9taXNlPHZvaWQ+IHtcbiAgYXdhaXQgYnVpbGRQcm9ncmFtKCkucGFyc2VBc3luYyhhcmd2KTtcbn1cblxuLy8gQnVuZGxlZCBhcyBiaW4vb2Focy5tanMgXHUyMDE0IHRoZSBidW5kbGUgZW50cnlwb2ludCBJUyB0aGUgZXhlY3V0YWJsZS5cbnZvaWQgbWFpbigpO1xuIiwgIi8qKlxuICogQG9haHMvY29udHJhY3RzIFx1MjAxNCB0aGUgc2luZ2xlIHNvdXJjZSBvZiB0cnV0aCBmb3IgZXZlcnkgb2FocyBjb21tYW5kLlxuICpcbiAqIE9uZSByZWdpc3RyeSBlbnRyeSA9IG9uZSBIVFRQIGVuZHBvaW50IChgUE9TVCAvcnBjLzxuYW1lPmApID0gb25lIE1DUCB0b29sXG4gKiAoYG9haHNfPG5hbWU+YCkgPSBvbmUgdHlwZWQgY2xpZW50IG1ldGhvZC4gQm90aCBhZGFwdGVycyBjYWxsIHRoZSBzYW1lXG4gKiBjb21tYW5kIGJ1cyB3aXRoIHRoZSBzYW1lIHpvZC12YWxpZGF0ZWQgaW5wdXQsIHNvIFwiTUNQIHNlbWFudGljcyBcdTIyNjEgSFRUUFxuICogc2VtYW50aWNzXCIgaXMgYSBzdHJ1Y3R1cmFsIGNvbnNlcXVlbmNlLCBub3QgYSByZXZpZXcgZGlzY2lwbGluZVxuICogKHByb2R1Y3Qtcm9hZG1hcC5tZCBcdTAwQTcwLjEgaW52YXJpYW50LCBENSkuXG4gKlxuICogVHJhbnNwb3J0IGlzIGRlbGliZXJhdGVseSB1bmlmb3JtIFJQQyAobm8gUkVTVCBwYXRoIHBhcmFtZXRlcnMpOiBwYXJpdHlcbiAqIGJldHdlZW4gc3VyZmFjZXMgc3RheXMgbWFjaGluZS1jaGVja2FibGUsIGFuZCB0aGUgcGFyaXR5IHRlc3QgaW5cbiAqIGFwcHMvc3BpbmUtYXBpIGFzc2VydHMgZXZlcnkgcmVnaXN0cnkgZW50cnkgZXhpc3RzIG9uIGJvdGggc3VyZmFjZXMuXG4gKi9cbmltcG9ydCB7IHogfSBmcm9tICd6b2QnO1xuaW1wb3J0IHtcbiAgQkxPQ0tFRF9SRUFTT05TLFxuICBXT1JLX0lURU1fS0lORFMsXG4gIFdPUktfSVRFTV9TVEFURVMsXG4gIHR5cGUgU3BpbmVFbmdpbmUsXG59IGZyb20gJ0BvYWhzL2NvcmUnO1xuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIFNoYXJlZCBmaWVsZCBzY2hlbWFzXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuY29uc3Qgd29ya0l0ZW1JZCA9IHouc3RyaW5nKCkubWluKDEpLmRlc2NyaWJlKCdXb3JrIGl0ZW0gaWQgKG9yIGl0cyBzdG9yaWVzLnlhbWwgZXh0ZXJuYWxLZXkpJyk7XG5jb25zdCBmZW5jaW5nVG9rZW4gPSB6XG4gIC5udW1iZXIoKVxuICAuaW50KClcbiAgLm9wdGlvbmFsKClcbiAgLmRlc2NyaWJlKCdGZW5jaW5nIHRva2VuIG9mIHRoZSBsaXZlIGNsYWltIFx1MjAxNCByZXF1aXJlZCBmb3IgZXhlY3V0aW9uLXpvbmUgbXV0YXRpb25zJyk7XG5cbmNvbnN0IGV2aWRlbmNlU2NoZW1hID0gelxuICAub2JqZWN0KHtcbiAgICBraW5kOiB6LmVudW0oWyd0ZXN0X3J1bicsICdnaXRfZGlmZicsICdjb21taXQnLCAnaGFsdF9yZXBvcnQnLCAncmV2aWV3X3JlcG9ydCcsICdkb2NfbGludCddKSxcbiAgICBwYXlsb2FkOiB6LnJlY29yZCh6LnN0cmluZygpLCB6LnVua25vd24oKSksXG4gIH0pXG4gIC5kZXNjcmliZSgnUmF3IG1hY2hpbmUtY29sbGVjdGVkIGV2aWRlbmNlOyB0aGUgY29yZSBjb21wdXRlcyB2ZXJkaWN0cywgdGhlIHJ1bm5lciBuZXZlciBkb2VzJyk7XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gUmVnaXN0cnlcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5leHBvcnQgaW50ZXJmYWNlIENvbW1hbmREZWY8SW5wdXQgZXh0ZW5kcyB6LlpvZFR5cGUgPSB6LlpvZFR5cGU+IHtcbiAgLyoqIHNuYWtlX2Nhc2UgY29tbWFuZCBuYW1lOyBIVFRQIHBhdGggaXMgL3JwYy88bmFtZT4sIE1DUCB0b29sIGlzIG9haHNfPG5hbWU+ICovXG4gIG5hbWU6IHN0cmluZztcbiAgZGVzY3JpcHRpb246IHN0cmluZztcbiAgaW5wdXQ6IElucHV0O1xuICAvKiogdHJ1ZSB3aGVuIHRoZSBjb21tYW5kIG9ubHkgcmVhZHMgc3RhdGUgKHVzZWQgZm9yIGRvY3M7IHNhbWUgcmFpbHMgZWl0aGVyIHdheSkgKi9cbiAgcmVhZG9ubHk6IGJvb2xlYW47XG59XG5cbmZ1bmN0aW9uIGRlZjxJIGV4dGVuZHMgei5ab2RUeXBlPihcbiAgbmFtZTogc3RyaW5nLFxuICBkZXNjcmlwdGlvbjogc3RyaW5nLFxuICBpbnB1dDogSSxcbiAgcmVhZG9ubHkgPSBmYWxzZSxcbik6IENvbW1hbmREZWY8ST4ge1xuICByZXR1cm4geyBuYW1lLCBkZXNjcmlwdGlvbiwgaW5wdXQsIHJlYWRvbmx5IH07XG59XG5cbmV4cG9ydCBjb25zdCBDT01NQU5EUyA9IFtcbiAgLy8gLS0gc2V0dXAgLyBhZG1pbiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgZGVmKFxuICAgICdjcmVhdGVfYWN0b3InLFxuICAgICdDcmVhdGUgYSB1c2VyIG9yIGFnZW50IGFjdG9yLiBSZXR1cm5zIHRoZSBhY3RvciBhbmQgaXRzIEFQSSB0b2tlbiAoYWRtaW4gb25seSkuJyxcbiAgICB6Lm9iamVjdCh7XG4gICAgICB0eXBlOiB6LmVudW0oWyd1c2VyJywgJ2FnZW50J10pLFxuICAgICAgZGlzcGxheU5hbWU6IHouc3RyaW5nKCkubWluKDEpLFxuICAgICAgZ292ZXJuYW5jZVJvbGU6IHpcbiAgICAgICAgLmVudW0oWydhZG1pbicsICdtZW1iZXInLCAnYXVkaXRvciddKVxuICAgICAgICAub3B0aW9uYWwoKVxuICAgICAgICAuZGVzY3JpYmUoJ0Jvb3RzdHJhcCBwbHVtYmluZyAocm9hZG1hcCBcdTAwQTczKTogaW5pdGlhbCBnb3Zlcm5hbmNlIHJvbGUgXHUyMDE0IGFkbWluIGNvbnRleHQgb25seScpLFxuICAgIH0pLFxuICApLFxuICBkZWYoXG4gICAgJ2dyYW50X3Blcm1pc3Npb24nLFxuICAgICdHcmFudCBhIHBlcm1pc3Npb24gdG8gYW4gYWN0b3IgKGFkbWluIG9ubHkpLiBHcmFudHMgYXJlIGV4cGxpY2l0IGFuZCBhdWRpdGVkIFx1MjAxNCBhdXRob3JpdHkgbmV2ZXIgY29tZXMgZnJvbSBhY3RvciB0eXBlLCB0ZW51cmUsIG9yIG1lbW9yeSAodGhlc2lzIFx1MDBBNzMpLicsXG4gICAgei5vYmplY3Qoe1xuICAgICAgYWN0b3JJZDogei5zdHJpbmcoKS5taW4oMSksXG4gICAgICBwZXJtaXNzaW9uOiB6LnN0cmluZygpLm1pbigxKSxcbiAgICAgIHNjb3BlOiB6LnN0cmluZygpLm9wdGlvbmFsKCksXG4gICAgfSksXG4gICksXG4gIGRlZihcbiAgICAncmV2b2tlX3Blcm1pc3Npb24nLFxuICAgICdSZXZva2UgYSBwZXJtaXNzaW9uIGZyb20gYW4gYWN0b3IgKGFkbWluIG9ubHkpLicsXG4gICAgei5vYmplY3Qoe1xuICAgICAgYWN0b3JJZDogei5zdHJpbmcoKS5taW4oMSksXG4gICAgICBwZXJtaXNzaW9uOiB6LnN0cmluZygpLm1pbigxKSxcbiAgICAgIHNjb3BlOiB6LnN0cmluZygpLm9wdGlvbmFsKCksXG4gICAgfSksXG4gICksXG4gIGRlZignY3JlYXRlX2ZlYXR1cmUnLCAnQ3JlYXRlIGEgZmVhdHVyZSAobWFwcyBhIEJNQUQgZXBpYykuJywgei5vYmplY3Qoe30pKSxcbiAgZGVmKFxuICAgICdjcmVhdGVfd29ya19pdGVtJyxcbiAgICAnQ3JlYXRlIGEgc2luZ2xlIHdvcmsgaXRlbS4ga2luZCBzZWxlY3RzIFdISUNIIG1hY2hpbmUtZXZpZGVuY2UgZ3VhcmRzIGFwcGx5IChQaGFzZSA0KSBcdTIwMTQgbmV2ZXIgV0hPIG1heSBwYXNzIGEgZ2F0ZS4nLFxuICAgIHoub2JqZWN0KHtcbiAgICAgIGZlYXR1cmVJZDogei5zdHJpbmcoKS5taW4oMSksXG4gICAgICBleHRlcm5hbEtleTogei5zdHJpbmcoKS5taW4oMSksXG4gICAgICB0aXRsZTogei5zdHJpbmcoKS5taW4oMSksXG4gICAgICBraW5kOiB6LmVudW0oV09SS19JVEVNX0tJTkRTKS5vcHRpb25hbCgpLmRlc2NyaWJlKFwiV29yay1pdGVtIGtpbmQ7IGRlZmF1bHQgJ2NvZGUnXCIpLFxuICAgICAgc3BlY0NoZWNrcG9pbnQ6IHouYm9vbGVhbigpLm9wdGlvbmFsKCksXG4gICAgICBkb25lQ2hlY2twb2ludDogei5ib29sZWFuKCkub3B0aW9uYWwoKSxcbiAgICAgIGludm9rZURldldpdGg6IHouc3RyaW5nKCkub3B0aW9uYWwoKSxcbiAgICAgIGRlcGVuZHNPbjogei5hcnJheSh6LnN0cmluZygpLm1pbigxKSkub3B0aW9uYWwoKS5kZXNjcmliZSgnZXh0ZXJuYWxLZXlzIHRoaXMgaXRlbSBkZXBlbmRzIG9uJyksXG4gICAgfSksXG4gICksXG4gIGRlZihcbiAgICAnbGlzdF9hY3RvcnMnLFxuICAgICdMaXN0IEFMTCBhY3RvcnMgXHUyMDE0IGh1bWFucywgYWdlbnRzLCBwZXJzb25hcywgYW5kIHRoZSBzeXN0ZW0gYWN0b3IgKHRyYW5zcGFyZW5jeSBmb3IgcGlja2Vycy9hdWRpdCkuJyxcbiAgICB6Lm9iamVjdCh7fSksXG4gICAgdHJ1ZSxcbiAgKSxcbiAgZGVmKFxuICAgICdwcm92aXNpb25fcGVyc29uYXMnLFxuICAgICdJZGVtcG90ZW50bHkgcHJvdmlzaW9uIHRoZSBzaXggQk1BRCBwZXJzb25hcyBhcyBhZ2VudCBhY3RvcnMgd2l0aCBmbG9vci1zdGF0ZSByb2xlcyAoZ2F0ZWQgYnkgZW5naW5lIGdvdmVybmFuY2U7IHplcm8gZ2F0ZSBhdXRob3JpdHkpLicsXG4gICAgei5vYmplY3Qoe30pLFxuICApLFxuICBkZWYoXG4gICAgJ2ltcG9ydF9zdG9yaWVzJyxcbiAgICAnSW1wb3J0IGEgc3Rvcmllcy55YW1sIGZpbGUgaW50byBhIGZlYXR1cmUgKGlkZW1wb3RlbnQgcmUtaW1wb3J0OyB2YWxpZGl0eSBydWxlcyBmcm9tIHN0b3JpZXMtc2NoZW1hLm1kKS4nLFxuICAgIHoub2JqZWN0KHtcbiAgICAgIGZlYXR1cmVJZDogei5zdHJpbmcoKS5taW4oMSksXG4gICAgICB5YW1sOiB6LnN0cmluZygpLm1pbigxKSxcbiAgICB9KSxcbiAgKSxcblxuICAvLyAtLSBjbGFpbXMgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICBkZWYoXG4gICAgJ2NsYWltX3Rhc2snLFxuICAgICdDbGFpbSBhIHdvcmsgaXRlbSB1bmRlciBhIGxlYXNlLiBSZXR1cm5zIHRoZSBjbGFpbSB3aXRoIGl0cyBmZW5jaW5nIHRva2VuLicsXG4gICAgei5vYmplY3Qoe1xuICAgICAgd29ya0l0ZW1JZCxcbiAgICAgIHR0bE1zOiB6Lm51bWJlcigpLmludCgpLnBvc2l0aXZlKCkub3B0aW9uYWwoKSxcbiAgICB9KSxcbiAgKSxcbiAgZGVmKCdoZWFydGJlYXQnLCAnUmVuZXcgdGhlIGxlYXNlIG9mIGEgbGl2ZSBjbGFpbS4nLCB6Lm9iamVjdCh7IGNsYWltSWQ6IHouc3RyaW5nKCkubWluKDEpIH0pKSxcbiAgZGVmKFxuICAgICdyZWxlYXNlX2NsYWltJyxcbiAgICAnUmVsZWFzZSBhIGNsYWltIChub3JtYWwgY29tcGxldGlvbiBvciB2b2x1bnRhcnkgaGFuZG9mZikuJyxcbiAgICB6Lm9iamVjdCh7IGNsYWltSWQ6IHouc3RyaW5nKCkubWluKDEpLCByZWFzb246IHouc3RyaW5nKCkub3B0aW9uYWwoKSB9KSxcbiAgKSxcblxuICAvLyAtLSBsaWZlY3ljbGUgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIGRlZihcbiAgICAnYWR2YW5jZV9zdGF0ZScsXG4gICAgJ0FkdmFuY2UgYSB3b3JrIGl0ZW0gdGhyb3VnaCB0aGUgRlNNLiBEZXRlcm1pbmlzdGljOiBwZXJtaXNzaW9uICsgZ3VhcmRzICsgZXZpZGVuY2UgZGVjaWRlLCBuZXZlciBpbnRlcnByZXRhdGlvbi4nLFxuICAgIHoub2JqZWN0KHtcbiAgICAgIHdvcmtJdGVtSWQsXG4gICAgICB0bzogei5lbnVtKFdPUktfSVRFTV9TVEFURVMpLFxuICAgICAgZmVuY2luZ1Rva2VuLFxuICAgICAgaWRlbXBvdGVuY3lLZXk6IHouc3RyaW5nKCkub3B0aW9uYWwoKSxcbiAgICB9KSxcbiAgKSxcbiAgZGVmKFxuICAgICdibG9ja190YXNrJyxcbiAgICAnU2V0IHRoZSBibG9ja2VkIG92ZXJsYXkgd2l0aCBhIGJsb2NraW5nIGNvbmRpdGlvbiBmcm9tIHRoZSBIQUxUIHRheG9ub215LicsXG4gICAgei5vYmplY3Qoe1xuICAgICAgd29ya0l0ZW1JZCxcbiAgICAgIHJlYXNvbjogei5lbnVtKEJMT0NLRURfUkVBU09OUyksXG4gICAgICBmZW5jaW5nVG9rZW4sXG4gICAgfSksXG4gICksXG4gIGRlZigndW5ibG9ja190YXNrJywgJ0NsZWFyIHRoZSBibG9ja2VkIG92ZXJsYXkgKHJldmlld19ub25fY29udmVyZ2VuY2UgbmVlZHMgdGhlIHJldmlldyBnYXRlIGdyYW50KS4nLCB6Lm9iamVjdCh7IHdvcmtJdGVtSWQgfSkpLFxuICBkZWYoXG4gICAgJ3N1Ym1pdF9ldmlkZW5jZScsXG4gICAgJ1N1Ym1pdCByYXcgbWFjaGluZS1jb2xsZWN0ZWQgZXZpZGVuY2UgKGV4aXQgY29kZXMsIGRpZmYgc3RhdHMsIHNoYXMpLiBUaGUgY29yZSBjb21wdXRlcyB2ZXJkaWN0cy4nLFxuICAgIHoub2JqZWN0KHsgd29ya0l0ZW1JZCwgZXZpZGVuY2U6IGV2aWRlbmNlU2NoZW1hLCBmZW5jaW5nVG9rZW4gfSksXG4gICksXG4gIGRlZihcbiAgICAnYXBwcm92ZV9nYXRlJyxcbiAgICAnQXBwcm92ZSBhIGdhdGUgYXMgYSBwZXJtaXR0ZWQgYWN0b3IuIHNwZWNfYXBwcm92YWwgcGlucyB0aGUgdmVyaWZpY2F0aW9uIGNvbW1hbmRzIChENykgYW5kIGZpcmVzIGRyYWZ0XHUyMTkycmVhZHlfZm9yX2RldjsgcmV2aWV3X2FwcHJvdmFsIGNoZWNrcyBwaW5uZWQgZXZpZGVuY2UgYW5kIGZpcmVzIGluX3Jldmlld1x1MjE5MmRvbmUuJyxcbiAgICB6Lm9iamVjdCh7XG4gICAgICB3b3JrSXRlbUlkLFxuICAgICAgZ2F0ZTogei5lbnVtKFsnc3BlY19hcHByb3ZhbCcsICdyZXZpZXdfYXBwcm92YWwnXSksXG4gICAgICBwaW5uZWRWZXJpZmljYXRpb246IHouYXJyYXkoei5zdHJpbmcoKSkub3B0aW9uYWwoKSxcbiAgICB9KSxcbiAgKSxcbiAgZGVmKFxuICAgICdyZWplY3RfZ2F0ZScsXG4gICAgJ1JlamVjdCBhIGdhdGUgYXMgYSBwZXJtaXR0ZWQgYWN0b3IuIFJldmlldyByZWplY3Rpb24gZmlyZXMgdGhlIGxvb3BiYWNrIGFzIGEgc3lzdGVtIGVmZmVjdCAob3IgYmxvY2tzIHdpdGggcmV2aWV3X25vbl9jb252ZXJnZW5jZSBvbiB0aGUgNnRoKS4nLFxuICAgIHoub2JqZWN0KHtcbiAgICAgIHdvcmtJdGVtSWQsXG4gICAgICBnYXRlOiB6LmVudW0oWydzcGVjX2FwcHJvdmFsJywgJ3Jldmlld19hcHByb3ZhbCddKSxcbiAgICB9KSxcbiAgKSxcbiAgZGVmKFxuICAgICdyZWxlYXNlX2Rpc3BhdGNoX2hvbGQnLFxuICAgICdSZWxlYXNlIGEgZG9uZV9jaGVja3BvaW50IGRpc3BhdGNoIGhvbGQgb24gYSBmZWF0dXJlIChwZXJtaXR0ZWQgYWN0b3JzIG9ubHkpLicsXG4gICAgei5vYmplY3QoeyBmZWF0dXJlSWQ6IHouc3RyaW5nKCkubWluKDEpIH0pLFxuICApLFxuXG4gIC8vIC0tIGVudGl0bGVtZW50cyAoUGhhc2UgMiwgcm9hZG1hcCBcdTAwQTczKSAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgLy8gQXV0aG9yaXR5IGZvciB0aGlzIGdyb3VwIGlzIGRlY2lkZWQgYnkgdGhlIEVOR0lORSBmcm9tIHRoZSBjYWxsZXInc1xuICAvLyBnb3Zlcm5hbmNlIHJvbGUgKFwiZW50aXRsZW1lbnQgPSBwbGFuIFx1MDBENyBnb3Zlcm5hbmNlIHJvbGUgXHUwMEQ3IGRlbGl2ZXJ5IHJvbGUsXG4gIC8vIHJlc29sdmVkIGJ5IGEgcHVyZSBmdW5jdGlvbiBvdmVyIHZlcnNpb25lZCBjb25maWcvZGF0YVwiKSBcdTIwMTQgdGhlIGJ1cyBuZXZlclxuICAvLyBwcmUtY2hlY2tzIGFkbWluIGhlcmUuXG4gIGRlZihcbiAgICAnYXNzaWduX3JvbGUnLFxuICAgICdBc3NpZ24gYSBkZWxpdmVyeSByb2xlIChwZXJtaXNzaW9uIGJ1bmRsZSwgcm9hZG1hcCBcdTAwQTczKSB0byBhbiBhY3Rvci4gR2F0ZWQgd3JpdGU6IHJlcXVpcmVzIGdvdmVybmFuY2UtYWRtaW4gYXV0aG9yaXR5OyBhdWRpdGVkLicsXG4gICAgei5vYmplY3Qoe1xuICAgICAgYWN0b3JJZDogei5zdHJpbmcoKS5taW4oMSksXG4gICAgICByb2xlQ29kZTogei5zdHJpbmcoKS5taW4oMSkuZGVzY3JpYmUoJ0RlbGl2ZXJ5IHJvbGUgY29kZSwgZS5nLiByZXZpZXdlciB8IGRldmVsb3BlciB8IHByb2R1Y3Rfb3duZXInKSxcbiAgICB9KSxcbiAgKSxcbiAgZGVmKFxuICAgICdyZXZva2Vfcm9sZScsXG4gICAgJ1Jldm9rZSBhIGRlbGl2ZXJ5IHJvbGUgYXNzaWdubWVudCBmcm9tIGFuIGFjdG9yLiBHYXRlZCB3cml0ZTogcmVxdWlyZXMgZ292ZXJuYW5jZS1hZG1pbiBhdXRob3JpdHk7IGF1ZGl0ZWQuJyxcbiAgICB6Lm9iamVjdCh7XG4gICAgICBhY3RvcklkOiB6LnN0cmluZygpLm1pbigxKSxcbiAgICAgIHJvbGVDb2RlOiB6LnN0cmluZygpLm1pbigxKSxcbiAgICB9KSxcbiAgKSxcbiAgZGVmKFxuICAgICdsaXN0X3JvbGVfYXNzaWdubWVudHMnLFxuICAgICdMaXN0IGRlbGl2ZXJ5LXJvbGUgYXNzaWdubWVudHMgKGFsbCwgb3Igb25lIGFjdG9yXHUyMDE5cyksIGluY2x1ZGluZyByZXZva2VkIHJvd3MgZm9yIGF1ZGl0LicsXG4gICAgei5vYmplY3QoeyBhY3RvcklkOiB6LnN0cmluZygpLm1pbigxKS5vcHRpb25hbCgpIH0pLFxuICAgIHRydWUsXG4gICksXG4gIGRlZihcbiAgICAnc2V0X2dvdmVybmFuY2Vfcm9sZScsXG4gICAgJ1NldCBhbiBhY3Rvclx1MjAxOXMgZ292ZXJuYW5jZSByb2xlIChhZG1pbiB8IG1lbWJlciB8IGF1ZGl0b3IpLiBHYXRlZCB3cml0ZTogcmVxdWlyZXMgZ292ZXJuYW5jZS1hZG1pbiBhdXRob3JpdHkuJyxcbiAgICB6Lm9iamVjdCh7XG4gICAgICBhY3RvcklkOiB6LnN0cmluZygpLm1pbigxKSxcbiAgICAgIHJvbGU6IHouZW51bShbJ2FkbWluJywgJ21lbWJlcicsICdhdWRpdG9yJ10pLFxuICAgIH0pLFxuICApLFxuICBkZWYoXG4gICAgJ3NldF9wbGFuJyxcbiAgICAnU2V0IHRoZSB3b3Jrc3BhY2UgcGxhbi4gUGxhbiBpcyBhIENFSUxJTkcsIG5ldmVyIGEgZ3JhbnQgKHJvYWRtYXAgXHUwMEE3Myk6IGl0IGJvdW5kcyB3aGF0IGFnZW50cyBtYXkgaG9sZC9leGVyY2lzZTsgdXNlcnMgYXJlIG5ldmVyIHBsYW4tZmlsdGVyZWQuJyxcbiAgICB6Lm9iamVjdCh7IHBsYW46IHouZW51bShbJ2ZyZWUnLCAndGVhbScsICdlbnRlcnByaXNlJ10pIH0pLFxuICApLFxuICBkZWYoXG4gICAgJ3NldF93b3Jrc3BhY2VfcG9saWN5JyxcbiAgICAnU2V0IHJlc3RyaWN0LW9ubHkgd29ya3NwYWNlIHBvbGljeSBrZXlzIChyb2FkbWFwIFx1MDBBNzMpOiBhIHBvbGljeSBjYW4gbmFycm93IHdoYXQgdGhlIHBsYW4gYWxsb3dzLCBuZXZlciB3aWRlbiBpdC4nLFxuICAgIHoub2JqZWN0KHtcbiAgICAgIHBvbGljeTogei5vYmplY3Qoe1xuICAgICAgICBhZ2VudEdhdGVBcHByb3ZhbHM6IHpcbiAgICAgICAgICAuYm9vbGVhbigpXG4gICAgICAgICAgLm9wdGlvbmFsKClcbiAgICAgICAgICAuZGVzY3JpYmUoJ2ZhbHNlIFx1MjFEMiBhZ2VudHMgY2Fubm90IGV4ZXJjaXNlIGdhdGUtYXBwcm92YWwgcGVybWlzc2lvbnMgZXZlbiBpZiBncmFudGVkJyksXG4gICAgICAgIGFnZW50U2VsZkRpc3BhdGNoOiB6XG4gICAgICAgICAgLmJvb2xlYW4oKVxuICAgICAgICAgIC5vcHRpb25hbCgpXG4gICAgICAgICAgLmRlc2NyaWJlKCdmYWxzZSBcdTIxRDIgYWdlbnRzIGNhbm5vdCBjbGFpbSB0YXNrcyBvbiB0aGVpciBvd24gKG1lbnRpb24tZGlzcGF0Y2ggb25seSknKSxcbiAgICAgIH0pLFxuICAgIH0pLFxuICApLFxuICBkZWYoXG4gICAgJ3NldF9nYXRlX3BvbGljeScsXG4gICAgJ1NldCBhIGdhdGUgZGVmaW5pdGlvbiBhcyBEQVRBIChyb2FkbWFwIFx1MDBBNzMpOiBtaW5fYXBwcm92YWxzIHF1b3J1bSBhbmQgcmVxdWlyZWRfYWN0b3JfdHlwZXMgXHUyMDE0IGh1bWFuLW9ubHkgaXMgYSBkZWZhdWx0LCBub3QgYSBoYXJkY29kZS4nLFxuICAgIHoub2JqZWN0KHtcbiAgICAgIGdhdGU6IHouZW51bShbJ3NwZWNfYXBwcm92YWwnLCAncmV2aWV3X2FwcHJvdmFsJ10pLFxuICAgICAgcG9saWN5OiB6Lm9iamVjdCh7XG4gICAgICAgIG1pbkFwcHJvdmFsczogei5udW1iZXIoKS5pbnQoKS5wb3NpdGl2ZSgpLm9wdGlvbmFsKCkuZGVzY3JpYmUoJ2Rpc3RpbmN0IGFwcHJvdmVycyByZXF1aXJlZCBwZXIgcmV2aWV3IHJvdW5kJyksXG4gICAgICAgIHJlcXVpcmVkQWN0b3JUeXBlczogelxuICAgICAgICAgIC5hcnJheSh6LmVudW0oWyd1c2VyJywgJ2FnZW50JywgJ3N5c3RlbSddKSlcbiAgICAgICAgICAub3B0aW9uYWwoKVxuICAgICAgICAgIC5kZXNjcmliZSgnYXQgbGVhc3Qgb25lIGFwcHJvdmVyIG9mIGVhY2ggbGlzdGVkIHR5cGUgaXMgcmVxdWlyZWQnKSxcbiAgICAgIH0pLFxuICAgIH0pLFxuICApLFxuICBkZWYoXG4gICAgJ2F1dGh6X2V4cGxhaW4nLFxuICAgICdSZXBsYXlhYmxlIGF1dGh6IGRlY2lzaW9uIHRyYWNlIChyb2FkbWFwIFx1MDBBNzMpOiBzb3VyY2UgZ3JhbnQvcm9sZSwgcGxhbiBjZWlsaW5nLCBwb2xpY3ksIGFuZCB0aGUgcG9saWN5IHZlcnNpb24gdHVwbGUgYW4gYXVkaXRvciBjYW4gcmVwbGF5LicsXG4gICAgei5vYmplY3Qoe1xuICAgICAgYWN0b3JJZDogei5zdHJpbmcoKS5taW4oMSksXG4gICAgICBwZXJtaXNzaW9uOiB6LnN0cmluZygpLm1pbigxKSxcbiAgICB9KSxcbiAgICB0cnVlLFxuICApLFxuXG4gIC8vIC0tIGNvbGxhYm9yYXRpb24gKFBoYXNlIDMsIHJvYWRtYXAgXHUwMEE3NSkgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIC8vIFRoZSBjaGF0IFNVUkZBQ0Ugb3ZlciB0aGUgc2FtZSByYWlscy4gU2FjcmVkIGJvdW5kYXJ5IChcdTAwQTc1LjIpOiBhIG1lc3NhZ2VcbiAgLy8gTkVWRVIgbXV0YXRlcyBsaWZlY3ljbGU7IG1lbnRpb25zIGFyZSBTVFJVQ1RVUkVEIGFjdG9yIGlkcyBcdTIwMTQgbm8gc2VydmVyXG4gIC8vIGNvZGUgcGF0aCBldmVyIHBhcnNlcyBtZXNzYWdlIGJvZHkgdGV4dC4gQWN0b3IgaWRlbnRpdHkgZm9yIGV2ZXJ5IGNvbW1hbmRcbiAgLy8gaGVyZSBjb21lcyBmcm9tIGN0eCAodGhlIGF1dGhlbnRpY2F0ZWQgdG9rZW4pLCBuZXZlciBmcm9tIHRoZSBpbnB1dC5cbiAgZGVmKFxuICAgICdjcmVhdGVfdGhyZWFkJyxcbiAgICAnQ3JlYXRlIGEgY29udmVyc2F0aW9uIHRocmVhZCwgb3B0aW9uYWxseSBib3VuZCB0byBhIGZlYXR1cmUvd29yayBpdGVtLiBraW5kPXByaXZhdGUgZGVmYXVsdHMgdmlzaWJpbGl0eSB0byBwcml2YXRlLicsXG4gICAgei5vYmplY3Qoe1xuICAgICAga2luZDogei5lbnVtKFsnc3BlYycsICdkZXNpZ24nLCAndGFzaycsICdnZW5lcmFsJywgJ3ByaXZhdGUnXSksXG4gICAgICBmZWF0dXJlSWQ6IHouc3RyaW5nKCkubWluKDEpLm9wdGlvbmFsKCksXG4gICAgICB3b3JrSXRlbUlkOiB3b3JrSXRlbUlkLm9wdGlvbmFsKCksXG4gICAgICB2aXNpYmlsaXR5OiB6LmVudW0oWydvcGVuJywgJ3ByaXZhdGUnXSkub3B0aW9uYWwoKSxcbiAgICB9KSxcbiAgKSxcbiAgZGVmKFxuICAgICdhZGRfdGhyZWFkX3BhcnRpY2lwYW50JyxcbiAgICAnSW52aXRlIGFuIGFjdG9yIGludG8gYSB0aHJlYWQgKHByaXZhdGUgdGhyZWFkczogb25seSBleGlzdGluZyBwYXJ0aWNpcGFudHMgbWF5IGludml0ZSkuJyxcbiAgICB6Lm9iamVjdCh7XG4gICAgICB0aHJlYWRJZDogei5zdHJpbmcoKS5taW4oMSksXG4gICAgICBhY3RvcklkOiB6LnN0cmluZygpLm1pbigxKSxcbiAgICB9KSxcbiAgKSxcbiAgZGVmKFxuICAgICdwb3N0X21lc3NhZ2UnLFxuICAgICdQb3N0IGEgY2hhdCBtZXNzYWdlLiBgbWVudGlvbnNgIGlzIHN0cnVjdHVyZWQgYWN0b3IgaWRzIChcdTAwQTc1LjIgXHUyMDE0IGJvZHkgdGV4dCBpcyBuZXZlciBwYXJzZWQpOyBtZW50aW9uaW5nIGFuIGFnZW50IHJ1bnMgdGhlIGRldGVybWluaXN0aWMgZGVmYXVsdC1kZW55IHJvdXRlciAoXHUwMEE3NS40KS4nLFxuICAgIHoub2JqZWN0KHtcbiAgICAgIHRocmVhZElkOiB6LnN0cmluZygpLm1pbigxKSxcbiAgICAgIGJvZHk6IHouc3RyaW5nKCkubWluKDEpLFxuICAgICAgcmVwbHlUbzogei5zdHJpbmcoKS5taW4oMSkub3B0aW9uYWwoKSxcbiAgICAgIG1lbnRpb25zOiB6LmFycmF5KHouc3RyaW5nKCkubWluKDEpKS5vcHRpb25hbCgpLFxuICAgIH0pLFxuICApLFxuICBkZWYoXG4gICAgJ2xpc3RfdGhyZWFkcycsXG4gICAgJ0xpc3QgdGhyZWFkcywgb3B0aW9uYWxseSBmaWx0ZXJlZCBieSBmZWF0dXJlIC8gd29yayBpdGVtLiBQcml2YXRlIHRocmVhZHMgYXJlIHZpc2libGUgb25seSB0byB0aGVpciBwYXJ0aWNpcGFudHMgKGN0eCBhY3RvcikuJyxcbiAgICB6Lm9iamVjdCh7XG4gICAgICBmZWF0dXJlSWQ6IHouc3RyaW5nKCkubWluKDEpLm9wdGlvbmFsKCksXG4gICAgICB3b3JrSXRlbUlkOiB3b3JrSXRlbUlkLm9wdGlvbmFsKCksXG4gICAgfSksXG4gICAgdHJ1ZSxcbiAgKSxcbiAgZGVmKFxuICAgICdsaXN0X21lc3NhZ2VzJyxcbiAgICAnTGlzdCBtZXNzYWdlcyBvZiBhIHRocmVhZCAob3B0aW9uYWxseSBhZnRlciBhIHNlcSkuIFByaXZhdGUgdGhyZWFkcyByZXF1aXJlIHBhcnRpY2lwYXRpb24gXHUyMDE0IHRoZSByZWFkZXIgaXMgQUxXQVlTIHRoZSBjdHggYWN0b3IuJyxcbiAgICB6Lm9iamVjdCh7XG4gICAgICB0aHJlYWRJZDogei5zdHJpbmcoKS5taW4oMSksXG4gICAgICBzaW5jZVNlcTogei5udW1iZXIoKS5pbnQoKS5ub25uZWdhdGl2ZSgpLm9wdGlvbmFsKCksXG4gICAgfSksXG4gICAgdHJ1ZSxcbiAgKSxcbiAgZGVmKFxuICAgICdsaXN0X21lbnRpb25zJyxcbiAgICAnTGlzdCB0aGUgcmVjb3JkZWQgbWVudGlvbnMgb2YgYSBtZXNzYWdlIHdpdGggdGhlaXIgcm91dGVyIHJlc29sdXRpb25zIChub3RpZmllZCB8IGpvYl9jcmVhdGVkIHwgZGVuaWVkX3BvbGljeSB8IGRlbmllZF9kZXB0aCkuJyxcbiAgICB6Lm9iamVjdCh7IG1lc3NhZ2VJZDogei5zdHJpbmcoKS5taW4oMSkgfSksXG4gICAgdHJ1ZSxcbiAgKSxcbiAgZGVmKFxuICAgICdsaXN0X25vdGlmaWNhdGlvbnMnLFxuICAgICdMaXN0IHRoZSBjdHggYWN0b3JcdTIwMTlzIE9XTiBub3RpZmljYXRpb25zIChtZW50aW9ucyArIGpvYiBjb21wbGV0aW9ucykuJyxcbiAgICB6Lm9iamVjdCh7IHVucmVhZE9ubHk6IHouYm9vbGVhbigpLm9wdGlvbmFsKCkgfSksXG4gICAgdHJ1ZSxcbiAgKSxcbiAgZGVmKFxuICAgICdtYXJrX25vdGlmaWNhdGlvbl9yZWFkJyxcbiAgICAnTWFyayBvbmUgb2YgdGhlIGN0eCBhY3Rvclx1MjAxOXMgb3duIG5vdGlmaWNhdGlvbnMgYXMgcmVhZC4nLFxuICAgIHoub2JqZWN0KHsgbm90aWZpY2F0aW9uSWQ6IHouc3RyaW5nKCkubWluKDEpIH0pLFxuICApLFxuICBkZWYoXG4gICAgJ2xpc3RfYWdlbnRfam9icycsXG4gICAgJ0xpc3Qgcm91dGVyLW1hdGVyaWFsaXplZCBhZ2VudCBqb2JzIChyZXBseS1vbmx5IGNvbnRleHQgXHUyMDE0IGEgam9iIG5ldmVyIGNhcnJpZXMgYSBjbGFpbSBvciBsaWZlY3ljbGUgYXV0aG9yaXR5LCBcdTAwQTc1LjQpLicsXG4gICAgei5vYmplY3Qoe1xuICAgICAgYWdlbnRBY3RvcklkOiB6LnN0cmluZygpLm1pbigxKS5vcHRpb25hbCgpLFxuICAgICAgc3RhdHVzOiB6LmVudW0oWydxdWV1ZWQnLCAnZG9uZScsICdibG9ja2VkJ10pLm9wdGlvbmFsKCksXG4gICAgfSksXG4gICAgdHJ1ZSxcbiAgKSxcbiAgZGVmKFxuICAgICdjb21wbGV0ZV9hZ2VudF9qb2InLFxuICAgICdDb21wbGV0ZSBhbiBhZ2VudCBqb2IgKG9ubHkgdGhlIGpvYlx1MjAxOXMgYWdlbnQgbWF5KS4gQ29tcGxldGlvbiBub3RpZmllcyB0aGUgbWVudGlvbmVyIFx1MjAxNCBub3RoaW5nIGVsc2UgbW92ZXMuJyxcbiAgICB6Lm9iamVjdCh7XG4gICAgICBqb2JJZDogei5zdHJpbmcoKS5taW4oMSksXG4gICAgICBzdGF0dXM6IHouZW51bShbJ2RvbmUnLCAnYmxvY2tlZCddKSxcbiAgICAgIG5vdGU6IHouc3RyaW5nKCkub3B0aW9uYWwoKSxcbiAgICB9KSxcbiAgKSxcblxuICAvLyAtLSBhZ2VudCBtZW1vcnkgKFBoYXNlIDUsIHJvYWRtYXAgXHUwMEE3NikgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgLy8gT3duZXItc2NvcGVkIEJZIENPTlNUUlVDVElPTjogbmVpdGhlciBjb21tYW5kIHRha2VzIGFuIGFjdG9yIHBhcmFtZXRlciBcdTIwMTRcbiAgLy8gdGhlIG1lbW9yeSBvd25lciBpcyBBTFdBWVMgdGhlIGF1dGhlbnRpY2F0ZWQgY3R4IGFjdG9yLiBMZWFybmluZyBuZXZlclxuICAvLyBiZWNvbWVzIGF1dGhvcml0eTogdGhlc2UgY29tbWFuZHMgdG91Y2ggdGhlIG1lbW9yeSBzdG9yZSBvbmx5LCBuZXZlciBhXG4gIC8vIGdyYW50LCBnYXRlLCBvciB0cmFuc2l0aW9uLlxuICBkZWYoXG4gICAgJ2FwcGVuZF9hZ2VudF9tZW1vcnknLFxuICAgICdBcHBlbmQgYSBtZW1vcnkgZm9yIHRoZSBjdHggYWdlbnQgYWN0b3IgKGFnZW50cyBvbmx5KS4gTGVhcm5pbmcgZnJvbSBhIHByaXZhdGUgdGhyZWFkIHJlcXVpcmVzIHBhcnRpY2lwYXRpb247IG1lbW9yeSBldmVudHMgbmV2ZXIgY2FycnkgY29udGVudCAoXHUwMEE3NikuJyxcbiAgICB6Lm9iamVjdCh7XG4gICAgICBraW5kOiB6LmVudW0oWydlcGlzb2RpYycsICdwcm9jZWR1cmFsJywgJ2VudGl0eSddKSxcbiAgICAgIGNvbnRlbnQ6IHouc3RyaW5nKCkubWluKDEpLFxuICAgICAgc291cmNlVGhyZWFkSWQ6IHpcbiAgICAgICAgLnN0cmluZygpXG4gICAgICAgIC5taW4oMSlcbiAgICAgICAgLm9wdGlvbmFsKClcbiAgICAgICAgLmRlc2NyaWJlKCdUaHJlYWQgdGhlIG1lbW9yeSB3YXMgbGVhcm5lZCBpbiBcdTIwMTQgaXRzIHZpc2liaWxpdHkgZ2F0ZXMgcmVjYWxsIChcdTAwQTc2KScpLFxuICAgIH0pLFxuICApLFxuICBkZWYoXG4gICAgJ3NlYXJjaF9hZ2VudF9tZW1vcnknLFxuICAgICdSZWNhbGwgdGhlIGN0eCBhY3Rvclx1MjAxOXMgT1dOIG1lbW9yaWVzLiBQcml2YXRlLXNvdXJjZWQgbWVtb3JpZXMgc3VyZmFjZSBvbmx5IHdoZW4gY29udGV4dFRocmVhZElkIGlzIHRoZWlyIHNvdXJjZSB0aHJlYWQgKFx1MDBBNzYpLicsXG4gICAgei5vYmplY3Qoe1xuICAgICAgY29udGV4dFRocmVhZElkOiB6XG4gICAgICAgIC5zdHJpbmcoKVxuICAgICAgICAubWluKDEpXG4gICAgICAgIC5vcHRpb25hbCgpXG4gICAgICAgIC5kZXNjcmliZSgnVGhyZWFkIHRoZSByZWNhbGwgaGFwcGVucyBpbiBcdTIwMTQgZ2F0ZXMgcHJpdmF0ZS1zb3VyY2VkIG1lbW9yaWVzJyksXG4gICAgICBraW5kOiB6LmVudW0oWydlcGlzb2RpYycsICdwcm9jZWR1cmFsJywgJ2VudGl0eSddKS5vcHRpb25hbCgpLFxuICAgICAgcXVlcnk6IHouc3RyaW5nKCkubWluKDEpLm9wdGlvbmFsKCkuZGVzY3JpYmUoJ0Nhc2UtaW5zZW5zaXRpdmUgc3Vic3RyaW5nIGZpbHRlcicpLFxuICAgIH0pLFxuICAgIHRydWUsXG4gICksXG5cbiAgLy8gLS0gcmVjb25jaWxpYXRpb24gKHJvYWRtYXAgXHUwMEE3MS42LCBENjogZGV0ZWN0LW9ubHkpIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIGRlZihcbiAgICAncmVjb25jaWxlJyxcbiAgICAnRGV0ZWN0LW9ubHkgZGl2ZXJnZW5jZSByZXBvcnQgYmV0d2VlbiBmaWxlIGZyb250bWF0dGVyIHN0YXR1c2VzIGFuZCBEQiBzdGF0ZXMgKG5ldmVyIG11dGF0ZXM7IGxpdmUtY2xhaW1lZCBpdGVtcyBhcmUgZXhjbHVkZWQpLicsXG4gICAgei5vYmplY3Qoe1xuICAgICAgZmlsZXM6IHouYXJyYXkoXG4gICAgICAgIHoub2JqZWN0KHtcbiAgICAgICAgICB3b3JrSXRlbUlkLFxuICAgICAgICAgIGZyb250bWF0dGVyU3RhdHVzOiB6LnN0cmluZygpLm1pbigxKSxcbiAgICAgICAgfSksXG4gICAgICApLFxuICAgIH0pLFxuICAgIHRydWUsXG4gICksXG5cbiAgLy8gLS0gb3BzIChzbyBub2JvZHkgZXZlciBuZWVkcyB0byB0b3VjaCB0aGUgREIgYnkgaGFuZCkgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgZGVmKFxuICAgICdmb3JjZV9yZWxlYXNlX2NsYWltJyxcbiAgICAnT3BzOiBmb3JjZS1yZWxlYXNlIHRoZSBsaXZlIGNsYWltIG9mIGEgd29yayBpdGVtIChzdHVjayBydW5uZXIsIGxvc3QgbWFjaGluZSkuJyxcbiAgICB6Lm9iamVjdCh7IHdvcmtJdGVtSWQgfSksXG4gICksXG5cbiAgLy8gLS0gcXVlcmllcyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICBkZWYoJ2dldF93b3JrX2l0ZW0nLCAnRmV0Y2ggb25lIHdvcmsgaXRlbSBieSBpZCBvciBleHRlcm5hbEtleS4nLCB6Lm9iamVjdCh7IHdvcmtJdGVtSWQgfSksIHRydWUpLFxuICBkZWYoJ2dldF9mZWF0dXJlJywgJ0ZldGNoIG9uZSBmZWF0dXJlLicsIHoub2JqZWN0KHsgZmVhdHVyZUlkOiB6LnN0cmluZygpLm1pbigxKSB9KSwgdHJ1ZSksXG4gIGRlZihcbiAgICAnZ2V0X3Rhc2tfY29udGV4dCcsXG4gICAgJ0Rpc3BhdGNoIGNvbnRleHQgZm9yIGEgcnVubmVyOiBlbnRyeSBzdGF0ZSByb3V0aW5nIHBlciBkZXYtYXV0by4gUmVmdXNlcyBkb25lIGl0ZW1zIGFuZCBoZWxkIGZlYXR1cmVzLicsXG4gICAgei5vYmplY3QoeyB3b3JrSXRlbUlkIH0pLFxuICAgIHRydWUsXG4gICksXG4gIGRlZihcbiAgICAnbGlzdF93b3JrX2l0ZW1zJyxcbiAgICAnTGlzdCB3b3JrIGl0ZW1zLCBvcHRpb25hbGx5IGZpbHRlcmVkIGJ5IHN0YXRlIC8gZmVhdHVyZSAvIGNsYWltYWJpbGl0eS4nLFxuICAgIHoub2JqZWN0KHtcbiAgICAgIHN0YXRlOiB6LmVudW0oV09SS19JVEVNX1NUQVRFUykub3B0aW9uYWwoKSxcbiAgICAgIGZlYXR1cmVJZDogei5zdHJpbmcoKS5vcHRpb25hbCgpLFxuICAgICAgY2xhaW1hYmxlOiB6LmJvb2xlYW4oKS5vcHRpb25hbCgpLmRlc2NyaWJlKCd0cnVlID0gbm8gbGl2ZSBjbGFpbSBvbiB0aGUgaXRlbScpLFxuICAgIH0pLFxuICAgIHRydWUsXG4gICksXG4gIGRlZihcbiAgICAnaW5ib3gnLFxuICAgICdHYXRlLWhvbGRlciBpbmJveDogaXRlbXMgYXdhaXRpbmcgYSBnYXRlIGRlY2lzaW9uIChkcmFmdCtzcGVjX2NoZWNrcG9pbnQgYXdhaXRpbmcgc3BlYyBhcHByb3ZhbDsgaW5fcmV2aWV3IGF3YWl0aW5nIHJldmlldyBkZWNpc2lvbikuJyxcbiAgICB6Lm9iamVjdCh7fSksXG4gICAgdHJ1ZSxcbiAgKSxcbiAgZGVmKFxuICAgICdxdWVyeV9ldmVudHMnLFxuICAgICdBdWRpdCBxdWVyeTogdGhlIGFwcGVuZC1vbmx5IGV2ZW50IGxvZywgb3B0aW9uYWxseSBzY29wZWQgdG8gb25lIHN0cmVhbS4nLFxuICAgIHoub2JqZWN0KHsgc3RyZWFtSWQ6IHouc3RyaW5nKCkub3B0aW9uYWwoKSB9KSxcbiAgICB0cnVlLFxuICApLFxuICBkZWYoJ2dldF9jbGFpbXMnLCAnQWxsIGNsYWltcyAobGl2ZSBhbmQgcmVsZWFzZWQpIG9mIGEgd29yayBpdGVtLicsIHoub2JqZWN0KHsgd29ya0l0ZW1JZCB9KSwgdHJ1ZSksXG4gIGRlZignd2hvYW1pJywgJ1Jlc29sdmUgdGhlIGF1dGhlbnRpY2F0ZWQgYWN0b3IuJywgei5vYmplY3Qoe30pLCB0cnVlKSxcbl0gYXMgY29uc3Q7XG5cbmV4cG9ydCB0eXBlIENvbW1hbmROYW1lID0gKHR5cGVvZiBDT01NQU5EUylbbnVtYmVyXVsnbmFtZSddO1xuXG5leHBvcnQgY29uc3QgQ09NTUFORF9NQVA6IFJlYWRvbmx5TWFwPHN0cmluZywgQ29tbWFuZERlZj4gPSBuZXcgTWFwKFxuICBDT01NQU5EUy5tYXAoKGMpID0+IFtjLm5hbWUsIGMgYXMgQ29tbWFuZERlZl0pLFxuKTtcblxuLyoqIE1DUCB0b29sIG5hbWUgZm9yIGEgY29tbWFuZCAodW5pZm9ybSBwcmVmaXgsIEQxMSB2b2NhYnVsYXJ5KS4gKi9cbmV4cG9ydCBmdW5jdGlvbiBtY3BUb29sTmFtZShjb21tYW5kOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gYG9haHNfJHtjb21tYW5kfWA7XG59XG5cbi8qKiBKU09OIFNjaGVtYSBmb3IgYSBjb21tYW5kIGlucHV0ICh6b2QgdjQgbmF0aXZlIGVtaXR0ZXIpIFx1MjAxNCB1c2VkIHZlcmJhdGltIGFzIHRoZSBNQ1AgdG9vbCBpbnB1dFNjaGVtYS4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpbnB1dEpzb25TY2hlbWEoY29tbWFuZDogc3RyaW5nKTogUmVjb3JkPHN0cmluZywgdW5rbm93bj4ge1xuICBjb25zdCBkZWZuID0gQ09NTUFORF9NQVAuZ2V0KGNvbW1hbmQpO1xuICBpZiAoIWRlZm4pIHRocm93IG5ldyBFcnJvcihgdW5rbm93biBjb21tYW5kOiAke2NvbW1hbmR9YCk7XG4gIHJldHVybiB6LnRvSlNPTlNjaGVtYShkZWZuLmlucHV0KSBhcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPjtcbn1cblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBXaXJlIGVudmVsb3BlXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuLyoqXG4gKiBFdmVyeSByZWplY3Rpb24gY3Jvc3NlcyB0aGUgd2lyZSBhcyBhIG1hY2hpbmUtcmVhZGFibGUgZW52ZWxvcGUgY2FycnlpbmdcbiAqIHRoZSBjb3JlIGVycm9yIGNsYXNzIG5hbWUgXHUyMDE0IGNsaWVudHMgcmV0aHJvdyB0aGUgcHJvcGVyIGNsYXNzLCBzbyBlcnJvclxuICogc2VtYW50aWNzIHN1cnZpdmUgdGhlIHRyYW5zcG9ydCAoNDA5IGZvciBjb25mbGljdHMsIDQwMyBmb3IgcGVybWlzc2lvbixcbiAqIDQyMiBmb3IgZ3VhcmRzL3RyYW5zaXRpb25zL3ZhbGlkYXRpb24pLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIEVycm9yRW52ZWxvcGUge1xuICBvazogZmFsc2U7XG4gIGVycm9yOiB7XG4gICAgbmFtZTpcbiAgICAgIHwgJ1Blcm1pc3Npb25EZW5pZWRFcnJvcidcbiAgICAgIHwgJ0d1YXJkRmFpbGVkRXJyb3InXG4gICAgICB8ICdDb25mbGljdEVycm9yJ1xuICAgICAgfCAnSW52YWxpZFRyYW5zaXRpb25FcnJvcidcbiAgICAgIHwgJ1N0b3JpZXNWYWxpZGF0aW9uRXJyb3InXG4gICAgICB8ICdFcnJvcic7XG4gICAgbWVzc2FnZTogc3RyaW5nO1xuICB9O1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIE9rRW52ZWxvcGU8VCA9IHVua25vd24+IHtcbiAgb2s6IHRydWU7XG4gIHJlc3VsdDogVDtcbn1cblxuZXhwb3J0IHR5cGUgRW52ZWxvcGU8VCA9IHVua25vd24+ID0gT2tFbnZlbG9wZTxUPiB8IEVycm9yRW52ZWxvcGU7XG5cbmV4cG9ydCBjb25zdCBIVFRQX1NUQVRVUzogUmVjb3JkPEVycm9yRW52ZWxvcGVbJ2Vycm9yJ11bJ25hbWUnXSwgbnVtYmVyPiA9IHtcbiAgUGVybWlzc2lvbkRlbmllZEVycm9yOiA0MDMsXG4gIENvbmZsaWN0RXJyb3I6IDQwOSxcbiAgR3VhcmRGYWlsZWRFcnJvcjogNDIyLFxuICBJbnZhbGlkVHJhbnNpdGlvbkVycm9yOiA0MjIsXG4gIFN0b3JpZXNWYWxpZGF0aW9uRXJyb3I6IDQyMixcbiAgRXJyb3I6IDUwMCxcbn07XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gQ29tbWFuZCBidXMgY29udHJhY3QgKGltcGxlbWVudGVkIGluIGFwcHMvc3BpbmUtYXBpLCBjb25zdW1lZCBieSBhZGFwdGVycylcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5leHBvcnQgaW50ZXJmYWNlIEFjdG9yQ29udGV4dCB7XG4gIGFjdG9ySWQ6IHN0cmluZztcbiAgaXNBZG1pbjogYm9vbGVhbjtcbn1cblxuLyoqXG4gKiBUaGUgb25lIHBsYWNlIGNvbW1hbmRzIGV4ZWN1dGUuIEhUVFAgYW5kIE1DUCBhcmUgdGhpbiBwYXJzZXJzIGluIGZyb250IG9mXG4gKiB0aGlzOyBub3RoaW5nIGVsc2Ugd3JpdGVzIHN0YXRlIChcdTAwQTcwLjEgXCJubyB3cml0ZXMgb3V0c2lkZSB0aGUgY29tbWFuZCBidXNcIikuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQ29tbWFuZEJ1cyB7XG4gIGV4ZWN1dGUoY29tbWFuZDogc3RyaW5nLCBpbnB1dDogdW5rbm93biwgY3R4OiBBY3RvckNvbnRleHQpOiBQcm9taXNlPHVua25vd24+O1xuICByZWFkb25seSBlbmdpbmU6IFNwaW5lRW5naW5lO1xufVxuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIFR5cGVkIGNsaWVudCAodXNlZCBieSB0aGUgb2FocyBDTEksIHRoZSBydW5uZXIsIGFuZCB0ZXN0cylcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5leHBvcnQgaW50ZXJmYWNlIENsaWVudE9wdGlvbnMge1xuICBiYXNlVXJsOiBzdHJpbmc7XG4gIHRva2VuOiBzdHJpbmc7XG4gIGZldGNoSW1wbD86IHR5cGVvZiBmZXRjaDtcbn1cblxuZXhwb3J0IGNsYXNzIE9haHNSZW1vdGVFcnJvciBleHRlbmRzIEVycm9yIHtcbiAgY29uc3RydWN0b3IoXG4gICAgcHVibGljIHJlYWRvbmx5IGVycm9yTmFtZTogc3RyaW5nLFxuICAgIG1lc3NhZ2U6IHN0cmluZyxcbiAgICBwdWJsaWMgcmVhZG9ubHkgc3RhdHVzOiBudW1iZXIsXG4gICkge1xuICAgIHN1cGVyKG1lc3NhZ2UpO1xuICAgIHRoaXMubmFtZSA9IGVycm9yTmFtZTtcbiAgfVxufVxuXG5leHBvcnQgaW50ZXJmYWNlIE9haHNDbGllbnQge1xuICBjYWxsPFQgPSB1bmtub3duPihjb21tYW5kOiBDb21tYW5kTmFtZSwgaW5wdXQ/OiB1bmtub3duKTogUHJvbWlzZTxUPjtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG1ha2VDbGllbnQob3B0aW9uczogQ2xpZW50T3B0aW9ucyk6IE9haHNDbGllbnQge1xuICBjb25zdCBkb0ZldGNoID0gb3B0aW9ucy5mZXRjaEltcGwgPz8gZmV0Y2g7XG4gIHJldHVybiB7XG4gICAgYXN5bmMgY2FsbDxUPihjb21tYW5kOiBDb21tYW5kTmFtZSwgaW5wdXQ6IHVua25vd24gPSB7fSk6IFByb21pc2U8VD4ge1xuICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBkb0ZldGNoKGAke29wdGlvbnMuYmFzZVVybH0vcnBjLyR7Y29tbWFuZH1gLCB7XG4gICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgJ2NvbnRlbnQtdHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgICAgICAgICBhdXRob3JpemF0aW9uOiBgQmVhcmVyICR7b3B0aW9ucy50b2tlbn1gLFxuICAgICAgICB9LFxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeShpbnB1dCksXG4gICAgICB9KTtcbiAgICAgIGNvbnN0IGVudmVsb3BlID0gKGF3YWl0IHJlc3BvbnNlLmpzb24oKSkgYXMgRW52ZWxvcGU8VD47XG4gICAgICBpZiAoZW52ZWxvcGUub2spIHJldHVybiBlbnZlbG9wZS5yZXN1bHQ7XG4gICAgICB0aHJvdyBuZXcgT2Foc1JlbW90ZUVycm9yKGVudmVsb3BlLmVycm9yLm5hbWUsIGVudmVsb3BlLmVycm9yLm1lc3NhZ2UsIHJlc3BvbnNlLnN0YXR1cyk7XG4gICAgfSxcbiAgfTtcbn1cbiIsICIvKipcbiAqIEdhdGUtaG9sZGVyIGNvbW1hbmQgaW1wbGVtZW50YXRpb25zIFx1MjAxNCBwdXJlIGZ1bmN0aW9ucyBvdmVyIHRoZSB0eXBlZFxuICogY29udHJhY3RzIGNsaWVudDogKGNsaWVudCwgb3B0cykgXHUyMTkyIG91dHB1dCB0ZXh0LiBjbGkudHMgb25seSB3aXJlc1xuICogY29tbWFuZGVyIG9udG8gdGhlc2U7IHRlc3RzIGNhbGwgdGhlbSBkaXJlY3RseSBhZ2FpbnN0IGFuIGluLXByb2Nlc3NcbiAqIHNwaW5lLWFwaS4gRXZlcnkgbXV0YXRpb24gZ29lcyB0aHJvdWdoIC9ycGMvPGNvbW1hbmQ+LCBuZXZlciBhcm91bmQgaXQuXG4gKi9cbmltcG9ydCB7IHJlYWRGaWxlU3luYyB9IGZyb20gJ25vZGU6ZnMnO1xuaW1wb3J0IHsgcmVzb2x2ZSB9IGZyb20gJ25vZGU6cGF0aCc7XG5cbmltcG9ydCB0eXBlIHsgT2Foc0NsaWVudCB9IGZyb20gJ0BvYWhzL2NvbnRyYWN0cyc7XG5pbXBvcnQgeyBsaW50RG9jIH0gZnJvbSAnQG9haHMvcnVubmVyJztcbmltcG9ydCB7XG4gIFdPUktfSVRFTV9LSU5EUyxcbiAgV09SS19JVEVNX1NUQVRFUyxcbiAgdHlwZSBBY3RvcixcbiAgdHlwZSBBdXRoekV4cGxhbmF0aW9uLFxuICB0eXBlIEZlYXR1cmUsXG4gIHR5cGUgR2F0ZUNvZGUsXG4gIHR5cGUgR292ZXJuYW5jZVJvbGUsXG4gIHR5cGUgUGxhbkNvZGUsXG4gIHR5cGUgUm9sZUFzc2lnbm1lbnQsXG4gIHR5cGUgU3BpbmVFdmVudCxcbiAgdHlwZSBTdG9yaWVzSW1wb3J0UmVzdWx0LFxuICB0eXBlIFdvcmtJdGVtLFxuICB0eXBlIFdvcmtzcGFjZVBvbGljeSxcbn0gZnJvbSAnQG9haHMvY29yZSc7XG5cbmltcG9ydCB7IHJlbmRlclRhYmxlLCB0eXBlIENlbGwgfSBmcm9tICcuLi9mb3JtYXQuanMnO1xuXG4vLyBQaGFzZSAzIGNvbGxhYm9yYXRpb24gKyBhZHZpc29yIGJvdHMgKHJvYWRtYXAgXHUwMEE3NSkgbGl2ZSBpbiBjb2xsYWIudHMuXG5leHBvcnQgKiBmcm9tICcuL2NvbGxhYi5qcyc7XG4vLyBQaGFzZSA1IG1lbW9yeSArIHJldmlldy1jb252ZXJnZW5jZSBzdGF0cyAocm9hZG1hcCBcdTAwQTc2KSBsaXZlIGluIHBoYXNlNS50cy5cbmV4cG9ydCAqIGZyb20gJy4vcGhhc2U1LmpzJztcblxuZXhwb3J0IGNvbnN0IEdBVEVTID0gWydzcGVjX2FwcHJvdmFsJywgJ3Jldmlld19hcHByb3ZhbCddIGFzIGNvbnN0O1xuXG5mdW5jdGlvbiBhc3NlcnRHYXRlKGdhdGU6IHN0cmluZyk6IGFzc2VydHMgZ2F0ZSBpcyBHYXRlQ29kZSB7XG4gIGlmICghKEdBVEVTIGFzIHJlYWRvbmx5IHN0cmluZ1tdKS5pbmNsdWRlcyhnYXRlKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihgaW52YWxpZCAtLWdhdGUgXCIke2dhdGV9XCIgKGV4cGVjdGVkICR7R0FURVMuam9pbignIHwgJyl9KWApO1xuICB9XG59XG5cbmNvbnN0IFdPUktfSVRFTV9IRUFERVJTID0gWydpZCcsICdleHRlcm5hbEtleScsICd0aXRsZScsICdzdGF0ZScsICdibG9ja2VkUmVhc29uJ107XG5cbmZ1bmN0aW9uIHdvcmtJdGVtUm93KGl0ZW06IFdvcmtJdGVtKTogQ2VsbFtdIHtcbiAgcmV0dXJuIFtpdGVtLmlkLCBpdGVtLmV4dGVybmFsS2V5LCBpdGVtLnRpdGxlLCBpdGVtLnN0YXRlLCBpdGVtLmJsb2NrZWRSZWFzb25dO1xufVxuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIGluYm94XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGluYm94Q29tbWFuZChjbGllbnQ6IE9haHNDbGllbnQpOiBQcm9taXNlPHN0cmluZz4ge1xuICBjb25zdCB7IGF3YWl0aW5nU3BlYywgYXdhaXRpbmdSZXZpZXcgfSA9IGF3YWl0IGNsaWVudC5jYWxsPHtcbiAgICBhd2FpdGluZ1NwZWM6IFdvcmtJdGVtW107XG4gICAgYXdhaXRpbmdSZXZpZXc6IFdvcmtJdGVtW107XG4gIH0+KCdpbmJveCcpO1xuICByZXR1cm4gW1xuICAgICdhd2FpdGluZyBzcGVjIGFwcHJvdmFsOicsXG4gICAgcmVuZGVyVGFibGUoV09SS19JVEVNX0hFQURFUlMsIGF3YWl0aW5nU3BlYy5tYXAod29ya0l0ZW1Sb3cpKSxcbiAgICAnJyxcbiAgICAnYXdhaXRpbmcgcmV2aWV3IGRlY2lzaW9uOicsXG4gICAgcmVuZGVyVGFibGUoV09SS19JVEVNX0hFQURFUlMsIGF3YWl0aW5nUmV2aWV3Lm1hcCh3b3JrSXRlbVJvdykpLFxuICBdLmpvaW4oJ1xcbicpO1xufVxuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIGFwcHJvdmUgLyByZWplY3Rcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5leHBvcnQgaW50ZXJmYWNlIEFwcHJvdmVPcHRpb25zIHtcbiAgd29ya0l0ZW1JZDogc3RyaW5nO1xuICBnYXRlOiBzdHJpbmc7XG4gIC8qKiBzcGVjX2FwcHJvdmFsIG9ubHk6IHZlcmlmaWNhdGlvbiBjb21tYW5kcyB0byBwaW4gKHJvYWRtYXAgRDcpLiAqL1xuICBwaW4/OiBzdHJpbmdbXTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGFwcHJvdmVDb21tYW5kKGNsaWVudDogT2Foc0NsaWVudCwgb3B0czogQXBwcm92ZU9wdGlvbnMpOiBQcm9taXNlPHN0cmluZz4ge1xuICBhc3NlcnRHYXRlKG9wdHMuZ2F0ZSk7XG4gIGNvbnN0IGl0ZW0gPSBhd2FpdCBjbGllbnQuY2FsbDxXb3JrSXRlbT4oJ2FwcHJvdmVfZ2F0ZScsIHtcbiAgICB3b3JrSXRlbUlkOiBvcHRzLndvcmtJdGVtSWQsXG4gICAgZ2F0ZTogb3B0cy5nYXRlLFxuICAgIC4uLihvcHRzLnBpbiAhPT0gdW5kZWZpbmVkICYmIG9wdHMucGluLmxlbmd0aCA+IDAgPyB7IHBpbm5lZFZlcmlmaWNhdGlvbjogb3B0cy5waW4gfSA6IHt9KSxcbiAgfSk7XG4gIGNvbnN0IGxpbmVzID0gW1xuICAgIGBhcHByb3ZlZCAke29wdHMuZ2F0ZX0gb24gJHtpdGVtLmV4dGVybmFsS2V5fSAoJHtpdGVtLmlkfSlgLFxuICAgIGBzdGF0ZTogJHtpdGVtLnN0YXRlfWAsXG4gIF07XG4gIGlmIChpdGVtLnBpbm5lZFZlcmlmaWNhdGlvbiAhPT0gbnVsbCAmJiBpdGVtLnBpbm5lZFZlcmlmaWNhdGlvbi5sZW5ndGggPiAwKSB7XG4gICAgbGluZXMucHVzaChgcGlubmVkIHZlcmlmaWNhdGlvbjogJHtpdGVtLnBpbm5lZFZlcmlmaWNhdGlvbi5qb2luKCcgJiYgJyl9YCk7XG4gIH1cbiAgcmV0dXJuIGxpbmVzLmpvaW4oJ1xcbicpO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEFkdmFuY2VPcHRpb25zIHtcbiAgd29ya0l0ZW1JZDogc3RyaW5nO1xuICB0bzogc3RyaW5nO1xuICBmZW5jaW5nVG9rZW4/OiBudW1iZXI7XG59XG5cbi8qKlxuICogUGxhbm5pbmctem9uZSBhZHZhbmNlcyBmb3IgaHVtYW5zIChiYWNrbG9nXHUyMTkyZHJhZnQgd2hlbiB0aGUgUE8gc3RhcnRzXG4gKiBkcmFmdGluZywgZHJhZnRcdTIxOTJyZWFkeV9mb3JfZGV2IG9uIG5vbi1jaGVja3BvaW50IGl0ZW1zKS4gRXhlY3V0aW9uLXpvbmVcbiAqIHRyYW5zaXRpb25zIGJlbG9uZyB0byB0aGUgcnVubmVyLCB3aGljaCBob2xkcyB0aGUgY2xhaW0uXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBhZHZhbmNlQ29tbWFuZChjbGllbnQ6IE9haHNDbGllbnQsIG9wdHM6IEFkdmFuY2VPcHRpb25zKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgY29uc3QgaXRlbSA9IGF3YWl0IGNsaWVudC5jYWxsPFdvcmtJdGVtPignYWR2YW5jZV9zdGF0ZScsIHtcbiAgICB3b3JrSXRlbUlkOiBvcHRzLndvcmtJdGVtSWQsXG4gICAgdG86IG9wdHMudG8sXG4gICAgLi4uKG9wdHMuZmVuY2luZ1Rva2VuICE9PSB1bmRlZmluZWQgPyB7IGZlbmNpbmdUb2tlbjogb3B0cy5mZW5jaW5nVG9rZW4gfSA6IHt9KSxcbiAgfSk7XG4gIHJldHVybiBgYWR2YW5jZWQgJHtpdGVtLmV4dGVybmFsS2V5fSAoJHtpdGVtLmlkfSlcXG5zdGF0ZTogJHtpdGVtLnN0YXRlfWA7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUmVqZWN0T3B0aW9ucyB7XG4gIHdvcmtJdGVtSWQ6IHN0cmluZztcbiAgZ2F0ZTogc3RyaW5nO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVqZWN0Q29tbWFuZChjbGllbnQ6IE9haHNDbGllbnQsIG9wdHM6IFJlamVjdE9wdGlvbnMpOiBQcm9taXNlPHN0cmluZz4ge1xuICBhc3NlcnRHYXRlKG9wdHMuZ2F0ZSk7XG4gIGNvbnN0IGl0ZW0gPSBhd2FpdCBjbGllbnQuY2FsbDxXb3JrSXRlbT4oJ3JlamVjdF9nYXRlJywge1xuICAgIHdvcmtJdGVtSWQ6IG9wdHMud29ya0l0ZW1JZCxcbiAgICBnYXRlOiBvcHRzLmdhdGUsXG4gIH0pO1xuICByZXR1cm4gW1xuICAgIGByZWplY3RlZCAke29wdHMuZ2F0ZX0gb24gJHtpdGVtLmV4dGVybmFsS2V5fSAoJHtpdGVtLmlkfSlgLFxuICAgIGBzdGF0ZTogJHtpdGVtLnN0YXRlfWAsXG4gICAgYGJsb2NrZWRSZWFzb246ICR7aXRlbS5ibG9ja2VkUmVhc29uID8/ICctJ31gLFxuICAgIGByZXZpZXdMb29wSXRlcmF0aW9uOiAke2l0ZW0ucmV2aWV3TG9vcEl0ZXJhdGlvbn1gLFxuICBdLmpvaW4oJ1xcbicpO1xufVxuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIHN0YXR1c1xuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBzdGF0dXNDb21tYW5kKGNsaWVudDogT2Foc0NsaWVudCk6IFByb21pc2U8c3RyaW5nPiB7XG4gIGNvbnN0IGl0ZW1zID0gYXdhaXQgY2xpZW50LmNhbGw8V29ya0l0ZW1bXT4oJ2xpc3Rfd29ya19pdGVtcycpO1xuICBjb25zdCByYW5rID0gbmV3IE1hcDxzdHJpbmcsIG51bWJlcj4oV09SS19JVEVNX1NUQVRFUy5tYXAoKHMsIGkpID0+IFtzLCBpXSkpO1xuICBjb25zdCBzb3J0ZWQgPSBbLi4uaXRlbXNdLnNvcnQoXG4gICAgKGEsIGIpID0+XG4gICAgICAocmFuay5nZXQoYS5zdGF0ZSkgPz8gMCkgLSAocmFuay5nZXQoYi5zdGF0ZSkgPz8gMCkgfHxcbiAgICAgIGEuZXh0ZXJuYWxLZXkubG9jYWxlQ29tcGFyZShiLmV4dGVybmFsS2V5KSxcbiAgKTtcbiAgY29uc3QgZmVhdHVyZUlkcyA9IFsuLi5uZXcgU2V0KGl0ZW1zLm1hcCgoaXRlbSkgPT4gaXRlbS5mZWF0dXJlSWQpKV07XG4gIGNvbnN0IGZlYXR1cmVzOiBGZWF0dXJlW10gPSBbXTtcbiAgZm9yIChjb25zdCBmZWF0dXJlSWQgb2YgZmVhdHVyZUlkcykge1xuICAgIGZlYXR1cmVzLnB1c2goYXdhaXQgY2xpZW50LmNhbGw8RmVhdHVyZT4oJ2dldF9mZWF0dXJlJywgeyBmZWF0dXJlSWQgfSkpO1xuICB9XG4gIHJldHVybiBbXG4gICAgJ3dvcmsgaXRlbXM6JyxcbiAgICByZW5kZXJUYWJsZShcbiAgICAgIFsnc3RhdGUnLCAnaWQnLCAnZXh0ZXJuYWxLZXknLCAndGl0bGUnLCAnYmxvY2tlZFJlYXNvbiddLFxuICAgICAgc29ydGVkLm1hcCgoaXRlbSkgPT4gW2l0ZW0uc3RhdGUsIGl0ZW0uaWQsIGl0ZW0uZXh0ZXJuYWxLZXksIGl0ZW0udGl0bGUsIGl0ZW0uYmxvY2tlZFJlYXNvbl0pLFxuICAgICksXG4gICAgJycsXG4gICAgJ2ZlYXR1cmVzOicsXG4gICAgcmVuZGVyVGFibGUoXG4gICAgICBbJ2lkJywgJ3N0YXRlJywgJ2Rpc3BhdGNoSG9sZCddLFxuICAgICAgZmVhdHVyZXMubWFwKChmZWF0dXJlKSA9PiBbZmVhdHVyZS5pZCwgZmVhdHVyZS5zdGF0ZSwgZmVhdHVyZS5kaXNwYXRjaEhvbGRdKSxcbiAgICApLFxuICBdLmpvaW4oJ1xcbicpO1xufVxuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIGFjdG9yIC8gZ3JhbnRcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5leHBvcnQgaW50ZXJmYWNlIEFjdG9yQ3JlYXRlT3B0aW9ucyB7XG4gIHR5cGU6IHN0cmluZztcbiAgbmFtZTogc3RyaW5nO1xuICAvKiogUGhhc2UgMiAocm9hZG1hcCBcdTAwQTczKTogaW5pdGlhbCBnb3Zlcm5hbmNlIHJvbGUgXHUyMDE0IGFkbWluIGNvbnRleHQgb25seS4gKi9cbiAgZ292ZXJuYW5jZVJvbGU/OiBzdHJpbmc7XG59XG5cbmNvbnN0IEdPVkVSTkFOQ0VfUk9MRVMgPSBbJ2FkbWluJywgJ21lbWJlcicsICdhdWRpdG9yJ10gYXMgY29uc3Q7XG5cbmZ1bmN0aW9uIGFzc2VydEdvdmVybmFuY2VSb2xlKHJvbGU6IHN0cmluZyk6IGFzc2VydHMgcm9sZSBpcyBHb3Zlcm5hbmNlUm9sZSB7XG4gIGlmICghKEdPVkVSTkFOQ0VfUk9MRVMgYXMgcmVhZG9ubHkgc3RyaW5nW10pLmluY2x1ZGVzKHJvbGUpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBpbnZhbGlkIGdvdmVybmFuY2Ugcm9sZSBcIiR7cm9sZX1cIiAoZXhwZWN0ZWQgJHtHT1ZFUk5BTkNFX1JPTEVTLmpvaW4oJyB8ICcpfSlgKTtcbiAgfVxufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gYWN0b3JDcmVhdGVDb21tYW5kKFxuICBjbGllbnQ6IE9haHNDbGllbnQsXG4gIG9wdHM6IEFjdG9yQ3JlYXRlT3B0aW9ucyxcbik6IFByb21pc2U8c3RyaW5nPiB7XG4gIGlmIChvcHRzLnR5cGUgIT09ICd1c2VyJyAmJiBvcHRzLnR5cGUgIT09ICdhZ2VudCcpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYGludmFsaWQgLS10eXBlIFwiJHtvcHRzLnR5cGV9XCIgKGV4cGVjdGVkIHVzZXIgfCBhZ2VudClgKTtcbiAgfVxuICBpZiAob3B0cy5nb3Zlcm5hbmNlUm9sZSAhPT0gdW5kZWZpbmVkKSBhc3NlcnRHb3Zlcm5hbmNlUm9sZShvcHRzLmdvdmVybmFuY2VSb2xlKTtcbiAgY29uc3QgY3JlYXRlZCA9IGF3YWl0IGNsaWVudC5jYWxsPHsgYWN0b3I6IEFjdG9yOyB0b2tlbjogc3RyaW5nIH0+KCdjcmVhdGVfYWN0b3InLCB7XG4gICAgdHlwZTogb3B0cy50eXBlLFxuICAgIGRpc3BsYXlOYW1lOiBvcHRzLm5hbWUsXG4gICAgLi4uKG9wdHMuZ292ZXJuYW5jZVJvbGUgIT09IHVuZGVmaW5lZCA/IHsgZ292ZXJuYW5jZVJvbGU6IG9wdHMuZ292ZXJuYW5jZVJvbGUgfSA6IHt9KSxcbiAgfSk7XG4gIHJldHVybiBbXG4gICAgYGFjdG9ySWQ6ICR7Y3JlYXRlZC5hY3Rvci5pZH1gLFxuICAgIGB0eXBlOiAke2NyZWF0ZWQuYWN0b3IudHlwZX1gLFxuICAgIGBkaXNwbGF5TmFtZTogJHtjcmVhdGVkLmFjdG9yLmRpc3BsYXlOYW1lfWAsXG4gICAgYHRva2VuOiAke2NyZWF0ZWQudG9rZW59YCxcbiAgXS5qb2luKCdcXG4nKTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBHcmFudE9wdGlvbnMge1xuICBhY3RvcklkOiBzdHJpbmc7XG4gIHBlcm1pc3Npb246IHN0cmluZztcbiAgc2NvcGU/OiBzdHJpbmc7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBncmFudENvbW1hbmQoY2xpZW50OiBPYWhzQ2xpZW50LCBvcHRzOiBHcmFudE9wdGlvbnMpOiBQcm9taXNlPHN0cmluZz4ge1xuICBhd2FpdCBjbGllbnQuY2FsbCgnZ3JhbnRfcGVybWlzc2lvbicsIHtcbiAgICBhY3RvcklkOiBvcHRzLmFjdG9ySWQsXG4gICAgcGVybWlzc2lvbjogb3B0cy5wZXJtaXNzaW9uLFxuICAgIC4uLihvcHRzLnNjb3BlICE9PSB1bmRlZmluZWQgPyB7IHNjb3BlOiBvcHRzLnNjb3BlIH0gOiB7fSksXG4gIH0pO1xuICByZXR1cm4gYGdyYW50ZWQgJHtvcHRzLnBlcm1pc3Npb259IHRvICR7b3B0cy5hY3RvcklkfWA7XG59XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gZmVhdHVyZSAvIGltcG9ydFxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBmZWF0dXJlQ3JlYXRlQ29tbWFuZChjbGllbnQ6IE9haHNDbGllbnQpOiBQcm9taXNlPHN0cmluZz4ge1xuICBjb25zdCBmZWF0dXJlID0gYXdhaXQgY2xpZW50LmNhbGw8RmVhdHVyZT4oJ2NyZWF0ZV9mZWF0dXJlJyk7XG4gIHJldHVybiBbYGZlYXR1cmVJZDogJHtmZWF0dXJlLmlkfWAsIGBzdGF0ZTogJHtmZWF0dXJlLnN0YXRlfWBdLmpvaW4oJ1xcbicpO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEltcG9ydFN0b3JpZXNPcHRpb25zIHtcbiAgZmVhdHVyZUlkOiBzdHJpbmc7XG4gIHBhdGg6IHN0cmluZztcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGltcG9ydFN0b3JpZXNDb21tYW5kKFxuICBjbGllbnQ6IE9haHNDbGllbnQsXG4gIG9wdHM6IEltcG9ydFN0b3JpZXNPcHRpb25zLFxuKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgY29uc3QgeWFtbCA9IHJlYWRGaWxlU3luYyhyZXNvbHZlKG9wdHMucGF0aCksICd1dGY4Jyk7XG4gIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGNsaWVudC5jYWxsPFN0b3JpZXNJbXBvcnRSZXN1bHQ+KCdpbXBvcnRfc3RvcmllcycsIHtcbiAgICBmZWF0dXJlSWQ6IG9wdHMuZmVhdHVyZUlkLFxuICAgIHlhbWwsXG4gIH0pO1xuICBjb25zdCBsaXN0ID0gKHZhbHVlczogc3RyaW5nW10pOiBzdHJpbmcgPT4gKHZhbHVlcy5sZW5ndGggPiAwID8gdmFsdWVzLmpvaW4oJywgJykgOiAnKG5vbmUpJyk7XG4gIHJldHVybiBbXG4gICAgYGltcG9ydGVkOiAke2xpc3QocmVzdWx0LmltcG9ydGVkKX1gLFxuICAgIGB1cGRhdGVkOiAke2xpc3QocmVzdWx0LnVwZGF0ZWQpfWAsXG4gICAgYHdhcm5pbmdzOiAke2xpc3QocmVzdWx0Lndhcm5pbmdzKX1gLFxuICBdLmpvaW4oJ1xcbicpO1xufVxuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIGV2ZW50c1xuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbmV4cG9ydCBpbnRlcmZhY2UgRXZlbnRzT3B0aW9ucyB7XG4gIHN0cmVhbUlkPzogc3RyaW5nO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZXZlbnRzQ29tbWFuZChcbiAgY2xpZW50OiBPYWhzQ2xpZW50LFxuICBvcHRzOiBFdmVudHNPcHRpb25zID0ge30sXG4pOiBQcm9taXNlPHN0cmluZz4ge1xuICBjb25zdCBldmVudHMgPSBhd2FpdCBjbGllbnQuY2FsbDxTcGluZUV2ZW50W10+KFxuICAgICdxdWVyeV9ldmVudHMnLFxuICAgIG9wdHMuc3RyZWFtSWQgIT09IHVuZGVmaW5lZCA/IHsgc3RyZWFtSWQ6IG9wdHMuc3RyZWFtSWQgfSA6IHt9LFxuICApO1xuICByZXR1cm4gcmVuZGVyVGFibGUoXG4gICAgWydzZXEnLCAndHlwZScsICdzdHJlYW0nLCAnYWN0b3InXSxcbiAgICBldmVudHMubWFwKChldmVudCkgPT4gW1xuICAgICAgZXZlbnQuZ2xvYmFsU2VxLFxuICAgICAgZXZlbnQudHlwZSxcbiAgICAgIGAke2V2ZW50LnN0cmVhbVR5cGV9LyR7ZXZlbnQuc3RyZWFtSWR9IyR7ZXZlbnQuc3RyZWFtU2VxfWAsXG4gICAgICBldmVudC5hY3RvcklkLFxuICAgIF0pLFxuICApO1xufVxuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIGVudGl0bGVtZW50cyAoUGhhc2UgMiwgcm9hZG1hcCBcdTAwQTczKSBcdTIwMTQgcm9sZSAvIHBsYW4gLyBwb2xpY3kgLyBnb3Zlcm5hbmNlIC8gYXV0aHpcbi8vIEF1dGhvcml0eSBmb3IgdGhlc2Ugd3JpdGVzIGlzIGRlY2lkZWQgYnkgdGhlIEVOR0lORSBmcm9tIHRoZSBjYWxsZXInc1xuLy8gZ292ZXJuYW5jZSByb2xlOyB0aGUgQ0xJIG9ubHkgdmFsaWRhdGVzIHNoYXBlcyBsb2NhbGx5LlxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbmV4cG9ydCBpbnRlcmZhY2UgUm9sZU9wdGlvbnMge1xuICBhY3RvcklkOiBzdHJpbmc7XG4gIHJvbGVDb2RlOiBzdHJpbmc7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByb2xlQXNzaWduQ29tbWFuZChjbGllbnQ6IE9haHNDbGllbnQsIG9wdHM6IFJvbGVPcHRpb25zKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgYXdhaXQgY2xpZW50LmNhbGwoJ2Fzc2lnbl9yb2xlJywgeyBhY3RvcklkOiBvcHRzLmFjdG9ySWQsIHJvbGVDb2RlOiBvcHRzLnJvbGVDb2RlIH0pO1xuICByZXR1cm4gYGFzc2lnbmVkIHJvbGUgJHtvcHRzLnJvbGVDb2RlfSB0byAke29wdHMuYWN0b3JJZH1gO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcm9sZVJldm9rZUNvbW1hbmQoY2xpZW50OiBPYWhzQ2xpZW50LCBvcHRzOiBSb2xlT3B0aW9ucyk6IFByb21pc2U8c3RyaW5nPiB7XG4gIGF3YWl0IGNsaWVudC5jYWxsKCdyZXZva2Vfcm9sZScsIHsgYWN0b3JJZDogb3B0cy5hY3RvcklkLCByb2xlQ29kZTogb3B0cy5yb2xlQ29kZSB9KTtcbiAgcmV0dXJuIGByZXZva2VkIHJvbGUgJHtvcHRzLnJvbGVDb2RlfSBmcm9tICR7b3B0cy5hY3RvcklkfWA7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUm9sZUxpc3RPcHRpb25zIHtcbiAgYWN0b3JJZD86IHN0cmluZztcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJvbGVMaXN0Q29tbWFuZChcbiAgY2xpZW50OiBPYWhzQ2xpZW50LFxuICBvcHRzOiBSb2xlTGlzdE9wdGlvbnMgPSB7fSxcbik6IFByb21pc2U8c3RyaW5nPiB7XG4gIGNvbnN0IGFzc2lnbm1lbnRzID0gYXdhaXQgY2xpZW50LmNhbGw8Um9sZUFzc2lnbm1lbnRbXT4oXG4gICAgJ2xpc3Rfcm9sZV9hc3NpZ25tZW50cycsXG4gICAgb3B0cy5hY3RvcklkICE9PSB1bmRlZmluZWQgPyB7IGFjdG9ySWQ6IG9wdHMuYWN0b3JJZCB9IDoge30sXG4gICk7XG4gIHJldHVybiByZW5kZXJUYWJsZShcbiAgICBbJ2FjdG9ySWQnLCAncm9sZUNvZGUnLCAnZ3JhbnRlZEJ5JywgJ3Jldm9rZWQnXSxcbiAgICBhc3NpZ25tZW50cy5tYXAoKGEpID0+IFthLmFjdG9ySWQsIGEucm9sZUNvZGUsIGEuZ3JhbnRlZEJ5LCBhLnJldm9rZWRdKSxcbiAgKTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBQbGFuU2V0T3B0aW9ucyB7XG4gIHBsYW46IHN0cmluZztcbn1cblxuY29uc3QgUExBTlMgPSBbJ2ZyZWUnLCAndGVhbScsICdlbnRlcnByaXNlJ10gYXMgY29uc3Q7XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBwbGFuU2V0Q29tbWFuZChjbGllbnQ6IE9haHNDbGllbnQsIG9wdHM6IFBsYW5TZXRPcHRpb25zKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgaWYgKCEoUExBTlMgYXMgcmVhZG9ubHkgc3RyaW5nW10pLmluY2x1ZGVzKG9wdHMucGxhbikpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYGludmFsaWQgcGxhbiBcIiR7b3B0cy5wbGFufVwiIChleHBlY3RlZCAke1BMQU5TLmpvaW4oJyB8ICcpfSlgKTtcbiAgfVxuICBjb25zdCByZXN1bHQgPSBhd2FpdCBjbGllbnQuY2FsbDx7IHBsYW46IFBsYW5Db2RlIH0+KCdzZXRfcGxhbicsIHsgcGxhbjogb3B0cy5wbGFuIH0pO1xuICByZXR1cm4gYHBsYW4gc2V0OiAke3Jlc3VsdC5wbGFufSAoYSBjZWlsaW5nIGZvciBhZ2VudCBncmFudHMgXHUyMDE0IG5ldmVyIGEgZ3JhbnQgaXRzZWxmKWA7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUG9saWN5U2V0T3B0aW9ucyB7XG4gIC8qKiAndHJ1ZScgfCAnZmFsc2UnIFx1MjAxNCByZXN0cmljdC1vbmx5IGtleSAocm9hZG1hcCBcdTAwQTczKS4gKi9cbiAgYWdlbnRHYXRlQXBwcm92YWxzPzogc3RyaW5nO1xuICAvKiogJ3RydWUnIHwgJ2ZhbHNlJyBcdTIwMTQgcmVzdHJpY3Qtb25seSBrZXkgKHJvYWRtYXAgXHUwMEE3MykuICovXG4gIGFnZW50U2VsZkRpc3BhdGNoPzogc3RyaW5nO1xufVxuXG5mdW5jdGlvbiBwYXJzZUJvb2xGbGFnKGZsYWc6IHN0cmluZywgdmFsdWU6IHN0cmluZyk6IGJvb2xlYW4ge1xuICBpZiAodmFsdWUgPT09ICd0cnVlJykgcmV0dXJuIHRydWU7XG4gIGlmICh2YWx1ZSA9PT0gJ2ZhbHNlJykgcmV0dXJuIGZhbHNlO1xuICB0aHJvdyBuZXcgRXJyb3IoYGludmFsaWQgJHtmbGFnfSBcIiR7dmFsdWV9XCIgKGV4cGVjdGVkIHRydWUgfCBmYWxzZSlgKTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHBvbGljeVNldENvbW1hbmQoY2xpZW50OiBPYWhzQ2xpZW50LCBvcHRzOiBQb2xpY3lTZXRPcHRpb25zKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgY29uc3QgcG9saWN5OiBXb3Jrc3BhY2VQb2xpY3kgPSB7XG4gICAgLi4uKG9wdHMuYWdlbnRHYXRlQXBwcm92YWxzICE9PSB1bmRlZmluZWRcbiAgICAgID8geyBhZ2VudEdhdGVBcHByb3ZhbHM6IHBhcnNlQm9vbEZsYWcoJy0tYWdlbnQtZ2F0ZS1hcHByb3ZhbHMnLCBvcHRzLmFnZW50R2F0ZUFwcHJvdmFscykgfVxuICAgICAgOiB7fSksXG4gICAgLi4uKG9wdHMuYWdlbnRTZWxmRGlzcGF0Y2ggIT09IHVuZGVmaW5lZFxuICAgICAgPyB7IGFnZW50U2VsZkRpc3BhdGNoOiBwYXJzZUJvb2xGbGFnKCctLWFnZW50LXNlbGYtZGlzcGF0Y2gnLCBvcHRzLmFnZW50U2VsZkRpc3BhdGNoKSB9XG4gICAgICA6IHt9KSxcbiAgfTtcbiAgaWYgKE9iamVjdC5rZXlzKHBvbGljeSkubGVuZ3RoID09PSAwKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdub3RoaW5nIHRvIHNldDogcGFzcyAtLWFnZW50LWdhdGUtYXBwcm92YWxzIGFuZC9vciAtLWFnZW50LXNlbGYtZGlzcGF0Y2gnKTtcbiAgfVxuICBjb25zdCBlZmZlY3RpdmUgPSBhd2FpdCBjbGllbnQuY2FsbDxXb3Jrc3BhY2VQb2xpY3k+KCdzZXRfd29ya3NwYWNlX3BvbGljeScsIHsgcG9saWN5IH0pO1xuICByZXR1cm4gW1xuICAgICd3b3Jrc3BhY2UgcG9saWN5IChyZXN0cmljdC1vbmx5IFx1MjAxNCBuYXJyb3dzIHRoZSBwbGFuLCBuZXZlciB3aWRlbnMgaXQpOicsXG4gICAgYCAgYWdlbnRHYXRlQXBwcm92YWxzOiAke2VmZmVjdGl2ZS5hZ2VudEdhdGVBcHByb3ZhbHMgPz8gJyh1bnNldCknfWAsXG4gICAgYCAgYWdlbnRTZWxmRGlzcGF0Y2g6ICR7ZWZmZWN0aXZlLmFnZW50U2VsZkRpc3BhdGNoID8/ICcodW5zZXQpJ31gLFxuICBdLmpvaW4oJ1xcbicpO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEdhdGVQb2xpY3lTZXRPcHRpb25zIHtcbiAgZ2F0ZTogc3RyaW5nO1xuICBtaW5BcHByb3ZhbHM/OiBzdHJpbmc7XG4gIHJlcXVpcmVUeXBlcz86IHN0cmluZ1tdO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZ2F0ZVBvbGljeVNldENvbW1hbmQoXG4gIGNsaWVudDogT2Foc0NsaWVudCxcbiAgb3B0czogR2F0ZVBvbGljeVNldE9wdGlvbnMsXG4pOiBQcm9taXNlPHN0cmluZz4ge1xuICBhc3NlcnRHYXRlKG9wdHMuZ2F0ZSk7XG4gIGNvbnN0IG1pbkFwcHJvdmFscyA9IG9wdHMubWluQXBwcm92YWxzICE9PSB1bmRlZmluZWQgPyBOdW1iZXIob3B0cy5taW5BcHByb3ZhbHMpIDogdW5kZWZpbmVkO1xuICBpZiAobWluQXBwcm92YWxzICE9PSB1bmRlZmluZWQgJiYgKCFOdW1iZXIuaXNJbnRlZ2VyKG1pbkFwcHJvdmFscykgfHwgbWluQXBwcm92YWxzIDwgMSkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYGludmFsaWQgLS1taW4tYXBwcm92YWxzIFwiJHtvcHRzLm1pbkFwcHJvdmFsc31cIiAoZXhwZWN0ZWQgYSBwb3NpdGl2ZSBpbnRlZ2VyKWApO1xuICB9XG4gIGNvbnN0IHJlcXVpcmVUeXBlcyA9IG9wdHMucmVxdWlyZVR5cGVzID8/IFtdO1xuICBmb3IgKGNvbnN0IHR5cGUgb2YgcmVxdWlyZVR5cGVzKSB7XG4gICAgaWYgKHR5cGUgIT09ICd1c2VyJyAmJiB0eXBlICE9PSAnYWdlbnQnICYmIHR5cGUgIT09ICdzeXN0ZW0nKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYGludmFsaWQgLS1yZXF1aXJlLXR5cGUgXCIke3R5cGV9XCIgKGV4cGVjdGVkIHVzZXIgfCBhZ2VudCB8IHN5c3RlbSlgKTtcbiAgICB9XG4gIH1cbiAgaWYgKG1pbkFwcHJvdmFscyA9PT0gdW5kZWZpbmVkICYmIHJlcXVpcmVUeXBlcy5sZW5ndGggPT09IDApIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ25vdGhpbmcgdG8gc2V0OiBwYXNzIC0tbWluLWFwcHJvdmFscyBhbmQvb3IgLS1yZXF1aXJlLXR5cGUnKTtcbiAgfVxuICBjb25zdCByZXN1bHQgPSBhd2FpdCBjbGllbnQuY2FsbDx7XG4gICAgZ2F0ZTogR2F0ZUNvZGU7XG4gICAgcG9saWN5OiB7IG1pbkFwcHJvdmFscz86IG51bWJlcjsgcmVxdWlyZWRBY3RvclR5cGVzPzogc3RyaW5nW10gfTtcbiAgfT4oJ3NldF9nYXRlX3BvbGljeScsIHtcbiAgICBnYXRlOiBvcHRzLmdhdGUsXG4gICAgcG9saWN5OiB7XG4gICAgICAuLi4obWluQXBwcm92YWxzICE9PSB1bmRlZmluZWQgPyB7IG1pbkFwcHJvdmFscyB9IDoge30pLFxuICAgICAgLi4uKHJlcXVpcmVUeXBlcy5sZW5ndGggPiAwID8geyByZXF1aXJlZEFjdG9yVHlwZXM6IHJlcXVpcmVUeXBlcyB9IDoge30pLFxuICAgIH0sXG4gIH0pO1xuICByZXR1cm4gW1xuICAgIGBnYXRlIHBvbGljeSBzZXQgb24gJHtyZXN1bHQuZ2F0ZX0gKGdhdGUgZGVmaW5pdGlvbnMgYXJlIGRhdGEsIHJvYWRtYXAgXHUwMEE3Myk6YCxcbiAgICBgICBtaW5BcHByb3ZhbHM6ICR7cmVzdWx0LnBvbGljeS5taW5BcHByb3ZhbHMgPz8gMX1gLFxuICAgIGAgIHJlcXVpcmVkQWN0b3JUeXBlczogJHtcbiAgICAgIHJlc3VsdC5wb2xpY3kucmVxdWlyZWRBY3RvclR5cGVzICE9PSB1bmRlZmluZWQgJiYgcmVzdWx0LnBvbGljeS5yZXF1aXJlZEFjdG9yVHlwZXMubGVuZ3RoID4gMFxuICAgICAgICA/IHJlc3VsdC5wb2xpY3kucmVxdWlyZWRBY3RvclR5cGVzLmpvaW4oJywgJylcbiAgICAgICAgOiAnKG5vbmUpJ1xuICAgIH1gLFxuICBdLmpvaW4oJ1xcbicpO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEdvdmVybmFuY2VTZXRPcHRpb25zIHtcbiAgYWN0b3JJZDogc3RyaW5nO1xuICByb2xlOiBzdHJpbmc7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnb3Zlcm5hbmNlU2V0Q29tbWFuZChcbiAgY2xpZW50OiBPYWhzQ2xpZW50LFxuICBvcHRzOiBHb3Zlcm5hbmNlU2V0T3B0aW9ucyxcbik6IFByb21pc2U8c3RyaW5nPiB7XG4gIGFzc2VydEdvdmVybmFuY2VSb2xlKG9wdHMucm9sZSk7XG4gIGF3YWl0IGNsaWVudC5jYWxsKCdzZXRfZ292ZXJuYW5jZV9yb2xlJywgeyBhY3RvcklkOiBvcHRzLmFjdG9ySWQsIHJvbGU6IG9wdHMucm9sZSB9KTtcbiAgcmV0dXJuIGBnb3Zlcm5hbmNlIHJvbGUgb2YgJHtvcHRzLmFjdG9ySWR9IHNldCB0byAke29wdHMucm9sZX1gO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEF1dGh6T3B0aW9ucyB7XG4gIGFjdG9ySWQ6IHN0cmluZztcbiAgcGVybWlzc2lvbjogc3RyaW5nO1xufVxuXG4vKiogSHVtYW4tcmVhZGFibGUgcmVuZGVyaW5nIG9mIHRoZSByZXBsYXlhYmxlIGF1dGh6X2V4cGxhaW4gdHJhY2UgKHJvYWRtYXAgXHUwMEE3MykuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gYXV0aHpDb21tYW5kKGNsaWVudDogT2Foc0NsaWVudCwgb3B0czogQXV0aHpPcHRpb25zKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgY29uc3QgZXhwbGFuYXRpb24gPSBhd2FpdCBjbGllbnQuY2FsbDxBdXRoekV4cGxhbmF0aW9uPignYXV0aHpfZXhwbGFpbicsIHtcbiAgICBhY3RvcklkOiBvcHRzLmFjdG9ySWQsXG4gICAgcGVybWlzc2lvbjogb3B0cy5wZXJtaXNzaW9uLFxuICB9KTtcbiAgcmV0dXJuIFtcbiAgICBgYXV0aHogJHtleHBsYW5hdGlvbi5wZXJtaXNzaW9ufSBmb3IgJHtleHBsYW5hdGlvbi5hY3RvcklkfTogJHtcbiAgICAgIGV4cGxhbmF0aW9uLmFsbG93ZWQgPyAnQUxMT1dFRCcgOiAnREVOSUVEJ1xuICAgIH1gLFxuICAgIGAgIHNvdXJjZTogJHtleHBsYW5hdGlvbi5zb3VyY2UgPz8gJyhubyBncmFudCBcdTIwMTQgZGlyZWN0IG9yIHZpYSByb2xlKSd9YCxcbiAgICBgICBnb3Zlcm5hbmNlUm9sZTogJHtleHBsYW5hdGlvbi5nb3Zlcm5hbmNlUm9sZX1gLFxuICAgIGAgIHBsYW46ICR7ZXhwbGFuYXRpb24ucGxhbn0gKHBsYW5BbGxvd3M6ICR7ZXhwbGFuYXRpb24ucGxhbkFsbG93c30pYCxcbiAgICBgICBwb2xpY3lBbGxvd3M6ICR7ZXhwbGFuYXRpb24ucG9saWN5QWxsb3dzfWAsXG4gICAgYCAgdmVyc2lvbnM6IHBsYW4gdiR7ZXhwbGFuYXRpb24udmVyc2lvbnMucGxhbn0sIHBvbGljeSB2JHtleHBsYW5hdGlvbi52ZXJzaW9ucy5wb2xpY3l9YCxcbiAgXS5qb2luKCdcXG4nKTtcbn1cblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBQaGFzZSA0IChyb2FkbWFwIEJ1aWxkIHBoYXNlcyArIFx1MDBBNzEuNCk6IG5vbi1jb2RpbmcgdGVhbW1hdGVzIG9uIHRoZSBzYW1lXG4vLyByYWlscyBcdTIwMTQgYWN0b3JzIHBpY2tlciBkYXRhLCBwZXJzb25hIHByb3Zpc2lvbmluZywgZGlyZWN0IHdvcmstaXRlbVxuLy8gY3JlYXRpb24gd2l0aCBhIGtpbmQsIGFuZCB0aGUgZGV0ZXJtaW5pc3RpYyBkb2N1bWVudCBsaW50LlxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbi8qKiBgb2FocyBhY3RvcnNgIFx1MjAxNCBldmVyeW9uZSBvbiB0aGUgcmFpbHM6IGh1bWFucywgYWdlbnRzLCBwZXJzb25hcywgc3lzdGVtLiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGFjdG9yc0NvbW1hbmQoY2xpZW50OiBPYWhzQ2xpZW50KTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgY29uc3QgYWN0b3JzID0gYXdhaXQgY2xpZW50LmNhbGw8QWN0b3JbXT4oJ2xpc3RfYWN0b3JzJyk7XG4gIHJldHVybiByZW5kZXJUYWJsZShcbiAgICBbJ2lkJywgJ3R5cGUnLCAnZGlzcGxheU5hbWUnLCAncGVyc29uYUNvZGUnXSxcbiAgICBhY3RvcnMubWFwKChhY3RvcikgPT4gW2FjdG9yLmlkLCBhY3Rvci50eXBlLCBhY3Rvci5kaXNwbGF5TmFtZSwgYWN0b3IucGVyc29uYUNvZGVdKSxcbiAgKTtcbn1cblxuLyoqIGBvYWhzIHBlcnNvbmFzIHByb3Zpc2lvbmAgXHUyMDE0IGlkZW1wb3RlbnQsIGVuZ2luZS1nb3Zlcm5hbmNlLWdhdGVkLiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHBlcnNvbmFzUHJvdmlzaW9uQ29tbWFuZChjbGllbnQ6IE9haHNDbGllbnQpOiBQcm9taXNlPHN0cmluZz4ge1xuICBjb25zdCBwZXJzb25hcyA9IGF3YWl0IGNsaWVudC5jYWxsPEFjdG9yW10+KCdwcm92aXNpb25fcGVyc29uYXMnKTtcbiAgcmV0dXJuIFtcbiAgICBgcHJvdmlzaW9uZWQgJHtwZXJzb25hcy5sZW5ndGh9IHBlcnNvbmFzIChpZGVtcG90ZW50OyBmbG9vci1zdGF0ZSByb2xlcywgemVybyBnYXRlIGF1dGhvcml0eSk6YCxcbiAgICByZW5kZXJUYWJsZShcbiAgICAgIFsnaWQnLCAnZGlzcGxheU5hbWUnLCAncGVyc29uYUNvZGUnXSxcbiAgICAgIHBlcnNvbmFzLm1hcCgoYWN0b3IpID0+IFthY3Rvci5pZCwgYWN0b3IuZGlzcGxheU5hbWUsIGFjdG9yLnBlcnNvbmFDb2RlXSksXG4gICAgKSxcbiAgXS5qb2luKCdcXG4nKTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBJdGVtQ3JlYXRlT3B0aW9ucyB7XG4gIGZlYXR1cmVJZDogc3RyaW5nO1xuICBleHRlcm5hbEtleTogc3RyaW5nO1xuICB0aXRsZTogc3RyaW5nO1xuICAvKiogV29yay1pdGVtIGtpbmQ7IGRlZmF1bHQgJ2NvZGUnLiBTZWxlY3RzIGV2aWRlbmNlIGd1YXJkcywgbmV2ZXIgZ2F0ZSBhdXRob3JpdHkuICovXG4gIGtpbmQ/OiBzdHJpbmc7XG4gIHNwZWNDaGVja3BvaW50PzogYm9vbGVhbjtcbiAgZG9uZUNoZWNrcG9pbnQ/OiBib29sZWFuO1xuICBpbnZva2VEZXZXaXRoPzogc3RyaW5nO1xuICBkZXBlbmRzT24/OiBzdHJpbmdbXTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGl0ZW1DcmVhdGVDb21tYW5kKFxuICBjbGllbnQ6IE9haHNDbGllbnQsXG4gIG9wdHM6IEl0ZW1DcmVhdGVPcHRpb25zLFxuKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgaWYgKG9wdHMua2luZCAhPT0gdW5kZWZpbmVkICYmICEoV09SS19JVEVNX0tJTkRTIGFzIHJlYWRvbmx5IHN0cmluZ1tdKS5pbmNsdWRlcyhvcHRzLmtpbmQpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBpbnZhbGlkIC0ta2luZCBcIiR7b3B0cy5raW5kfVwiIChleHBlY3RlZCAke1dPUktfSVRFTV9LSU5EUy5qb2luKCcgfCAnKX0pYCk7XG4gIH1cbiAgY29uc3QgaXRlbSA9IGF3YWl0IGNsaWVudC5jYWxsPFdvcmtJdGVtPignY3JlYXRlX3dvcmtfaXRlbScsIHtcbiAgICBmZWF0dXJlSWQ6IG9wdHMuZmVhdHVyZUlkLFxuICAgIGV4dGVybmFsS2V5OiBvcHRzLmV4dGVybmFsS2V5LFxuICAgIHRpdGxlOiBvcHRzLnRpdGxlLFxuICAgIC4uLihvcHRzLmtpbmQgIT09IHVuZGVmaW5lZCA/IHsga2luZDogb3B0cy5raW5kIH0gOiB7fSksXG4gICAgLi4uKG9wdHMuc3BlY0NoZWNrcG9pbnQgIT09IHVuZGVmaW5lZCA/IHsgc3BlY0NoZWNrcG9pbnQ6IG9wdHMuc3BlY0NoZWNrcG9pbnQgfSA6IHt9KSxcbiAgICAuLi4ob3B0cy5kb25lQ2hlY2twb2ludCAhPT0gdW5kZWZpbmVkID8geyBkb25lQ2hlY2twb2ludDogb3B0cy5kb25lQ2hlY2twb2ludCB9IDoge30pLFxuICAgIC4uLihvcHRzLmludm9rZURldldpdGggIT09IHVuZGVmaW5lZCA/IHsgaW52b2tlRGV2V2l0aDogb3B0cy5pbnZva2VEZXZXaXRoIH0gOiB7fSksXG4gICAgLi4uKG9wdHMuZGVwZW5kc09uICE9PSB1bmRlZmluZWQgJiYgb3B0cy5kZXBlbmRzT24ubGVuZ3RoID4gMFxuICAgICAgPyB7IGRlcGVuZHNPbjogb3B0cy5kZXBlbmRzT24gfVxuICAgICAgOiB7fSksXG4gIH0pO1xuICByZXR1cm4gW1xuICAgIGBjcmVhdGVkICR7aXRlbS5leHRlcm5hbEtleX0gKCR7aXRlbS5pZH0pYCxcbiAgICBga2luZDogJHtpdGVtLmtpbmR9YCxcbiAgICBgc3RhdGU6ICR7aXRlbS5zdGF0ZX1gLFxuICAgIGBzcGVjQ2hlY2twb2ludDogJHtpdGVtLnNwZWNDaGVja3BvaW50fWAsXG4gIF0uam9pbignXFxuJyk7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgRG9jbGludE9wdGlvbnMge1xuICAvKiogUGF0aCBvZiB0aGUgZG9jdW1lbnQgdG8gbGludC4gKi9cbiAgcGF0aDogc3RyaW5nO1xuICAvKiogUmVxdWlyZWQgYCMjIDxuYW1lPmAgc2VjdGlvbnMgKHJlcGVhdGFibGUgZmxhZykuICovXG4gIHJlcXVpcmVTZWN0aW9ucz86IHN0cmluZ1tdO1xuICAvKiogU3VibWl0IHRoZSByZXN1bHQgYXMgZG9jX2xpbnQgZXZpZGVuY2Ugb24gdGhpcyB3b3JrIGl0ZW0uICovXG4gIHdvcmtJdGVtSWQ/OiBzdHJpbmc7XG4gIHN1Ym1pdD86IGJvb2xlYW47XG4gIGZlbmNpbmdUb2tlbj86IG51bWJlcjtcbn1cblxuLyoqXG4gKiBgb2FocyBkb2NsaW50IDxmaWxlPmAgXHUyMDE0IHJ1biB0aGUgZGV0ZXJtaW5pc3RpYyBsaW50IChhIE1FQVNVUklORyB0b29sLCBub1xuICogTExNKTsgd2l0aCAtLXN1Ym1pdCB0aGUgcmF3IHtzY2hlbWFWYWxpZCwgZmluZGluZ3N9IGdvZXMgb250byB0aGUgcmFpbHMgYXNcbiAqIGRvY19saW50IGV2aWRlbmNlIGFuZCB0aGUgQ09SRSBkZWNpZGVzIHdoYXQgaXQgZ2F0ZXMuIEV4aXQgMSBvbiBhIGZhaWxpbmdcbiAqIGxpbnQgc28gc2NyaXB0cyBjYW4gY2hhaW4gb24gaXQuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBkb2NsaW50Q29tbWFuZChcbiAgY2xpZW50OiBPYWhzQ2xpZW50IHwgbnVsbCxcbiAgb3B0czogRG9jbGludE9wdGlvbnMsXG4pOiBQcm9taXNlPENvbW1hbmRPdXRwdXQ+IHtcbiAgY29uc3QgY29udGVudCA9IHJlYWRGaWxlU3luYyhyZXNvbHZlKG9wdHMucGF0aCksICd1dGY4Jyk7XG4gIGNvbnN0IHJlc3VsdCA9IGxpbnREb2MoY29udGVudCwge1xuICAgIC4uLihvcHRzLnJlcXVpcmVTZWN0aW9ucyAhPT0gdW5kZWZpbmVkID8geyByZXF1aXJlZFNlY3Rpb25zOiBvcHRzLnJlcXVpcmVTZWN0aW9ucyB9IDoge30pLFxuICB9KTtcbiAgY29uc3QgbGluZXMgPSBbXG4gICAgYGRvY2xpbnQgJHtvcHRzLnBhdGh9OiAke3Jlc3VsdC5zY2hlbWFWYWxpZCA/ICdzY2hlbWEtdmFsaWQnIDogJ05PVCBzY2hlbWEtdmFsaWQnfWAsXG4gICAgLi4ucmVzdWx0LmZpbmRpbmdzLm1hcCgoZmluZGluZykgPT4gYCAgLSAke2ZpbmRpbmd9YCksXG4gIF07XG4gIGlmIChvcHRzLnN1Ym1pdCA9PT0gdHJ1ZSkge1xuICAgIGlmIChvcHRzLndvcmtJdGVtSWQgPT09IHVuZGVmaW5lZCkgdGhyb3cgbmV3IEVycm9yKCctLXN1Ym1pdCByZXF1aXJlcyAtLXdvcmstaXRlbSA8aWQ+Jyk7XG4gICAgaWYgKGNsaWVudCA9PT0gbnVsbCkgdGhyb3cgbmV3IEVycm9yKCctLXN1Ym1pdCByZXF1aXJlcyBhIGNsaWVudCAodG9rZW4gKyB1cmwpJyk7XG4gICAgYXdhaXQgY2xpZW50LmNhbGwoJ3N1Ym1pdF9ldmlkZW5jZScsIHtcbiAgICAgIHdvcmtJdGVtSWQ6IG9wdHMud29ya0l0ZW1JZCxcbiAgICAgIGV2aWRlbmNlOiB7XG4gICAgICAgIGtpbmQ6ICdkb2NfbGludCcsXG4gICAgICAgIHBheWxvYWQ6IHsgc2NoZW1hVmFsaWQ6IHJlc3VsdC5zY2hlbWFWYWxpZCwgZmluZGluZ3M6IHJlc3VsdC5maW5kaW5ncyB9LFxuICAgICAgfSxcbiAgICAgIC4uLihvcHRzLmZlbmNpbmdUb2tlbiAhPT0gdW5kZWZpbmVkID8geyBmZW5jaW5nVG9rZW46IG9wdHMuZmVuY2luZ1Rva2VuIH0gOiB7fSksXG4gICAgfSk7XG4gICAgbGluZXMucHVzaChgc3VibWl0dGVkIGRvY19saW50IGV2aWRlbmNlIG9uICR7b3B0cy53b3JrSXRlbUlkfWApO1xuICB9XG4gIHJldHVybiB7IHRleHQ6IGxpbmVzLmpvaW4oJ1xcbicpLCBleGl0Q29kZTogcmVzdWx0LnNjaGVtYVZhbGlkID8gMCA6IDEgfTtcbn1cblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBvdXRwdXQgaGFybmVzcyAoc2hhcmVkIGJ5IGNsaS50cyBhbmQgdGhlIHRlc3RzKVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbmV4cG9ydCBpbnRlcmZhY2UgQ29tbWFuZE91dHB1dCB7XG4gIHRleHQ6IHN0cmluZztcbiAgZXhpdENvZGU6IG51bWJlcjtcbn1cblxuLyoqXG4gKiBSdW4gb25lIGNvbW1hbmQgZnVuY3Rpb24gdG8gYSBwcmludGFibGUgb3V0Y29tZTogc3VjY2VzcyBcdTIxOTIgaXRzIHRleHQgd2l0aFxuICogZXhpdCAwOyBmYWlsdXJlIFx1MjE5MiBgPGVycm9yLm5hbWU+OiA8bWVzc2FnZT5gIChPYWhzUmVtb3RlRXJyb3IgY2FycmllcyB0aGVcbiAqIHdpcmUgZXJyb3IgY2xhc3MgbmFtZSkgd2l0aCBleGl0IDEuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBydW5Ub091dHB1dChmbjogKCkgPT4gUHJvbWlzZTxzdHJpbmc+KTogUHJvbWlzZTxDb21tYW5kT3V0cHV0PiB7XG4gIHRyeSB7XG4gICAgcmV0dXJuIHsgdGV4dDogYXdhaXQgZm4oKSwgZXhpdENvZGU6IDAgfTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBpZiAoZXJyb3IgaW5zdGFuY2VvZiBFcnJvcikge1xuICAgICAgcmV0dXJuIHsgdGV4dDogYCR7ZXJyb3IubmFtZX06ICR7ZXJyb3IubWVzc2FnZX1gLCBleGl0Q29kZTogMSB9O1xuICAgIH1cbiAgICByZXR1cm4geyB0ZXh0OiBTdHJpbmcoZXJyb3IpLCBleGl0Q29kZTogMSB9O1xuICB9XG59XG4iLCAiLyoqXG4gKiBQbGFpbi10ZXh0IHRhYmxlIHJlbmRlcmluZyBcdTIwMTQgZGVsaWJlcmF0ZWx5IGRlcGVuZGVuY3ktZnJlZSAoc3RvcnkgMTM6XG4gKiBcImJcdTFFQTNuZyB0ZXh0IFx1MDExMVx1MDFBMW4gZ2lcdTFFQTNuLCBraFx1MDBGNG5nIGRlcCBiXHUxRUEzbmcgbmdvXHUwMEUwaVwiKS4gTW9ub3NwYWNlIGNvbHVtbnMgcGFkZGVkIHRvXG4gKiB0aGUgd2lkZXN0IGNlbGw7IGFuIGVtcHR5IHJvdyBzZXQgcmVuZGVycyBhcyBcIihlbXB0eSlcIi5cbiAqL1xuXG5leHBvcnQgdHlwZSBDZWxsID0gc3RyaW5nIHwgbnVtYmVyIHwgYm9vbGVhbiB8IG51bGwgfCB1bmRlZmluZWQ7XG5cbmZ1bmN0aW9uIHRvVGV4dChjZWxsOiBDZWxsKTogc3RyaW5nIHtcbiAgaWYgKGNlbGwgPT09IG51bGwgfHwgY2VsbCA9PT0gdW5kZWZpbmVkKSByZXR1cm4gJy0nO1xuICByZXR1cm4gU3RyaW5nKGNlbGwpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVuZGVyVGFibGUoaGVhZGVyczogc3RyaW5nW10sIHJvd3M6IENlbGxbXVtdKTogc3RyaW5nIHtcbiAgaWYgKHJvd3MubGVuZ3RoID09PSAwKSByZXR1cm4gJyhlbXB0eSknO1xuICBjb25zdCB0ZXh0Um93cyA9IHJvd3MubWFwKChyb3cpID0+IHJvdy5tYXAodG9UZXh0KSk7XG4gIGNvbnN0IHdpZHRocyA9IGhlYWRlcnMubWFwKChoZWFkZXIsIGNvbCkgPT5cbiAgICBNYXRoLm1heChoZWFkZXIubGVuZ3RoLCAuLi50ZXh0Um93cy5tYXAoKHJvdykgPT4gKHJvd1tjb2xdID8/ICcnKS5sZW5ndGgpKSxcbiAgKTtcbiAgY29uc3QgbGluZSA9IChjZWxsczogc3RyaW5nW10pOiBzdHJpbmcgPT5cbiAgICBjZWxscy5tYXAoKGNlbGwsIGNvbCkgPT4gY2VsbC5wYWRFbmQod2lkdGhzW2NvbF0gPz8gY2VsbC5sZW5ndGgpKS5qb2luKCcgICcpLnRyaW1FbmQoKTtcbiAgY29uc3Qgc2VwYXJhdG9yID0gd2lkdGhzLm1hcCgodykgPT4gJy0nLnJlcGVhdCh3KSkuam9pbignICAnKTtcbiAgcmV0dXJuIFtsaW5lKGhlYWRlcnMpLCBzZXBhcmF0b3IsIC4uLnRleHRSb3dzLm1hcChsaW5lKV0uam9pbignXFxuJyk7XG59XG4iLCAiLyoqXG4gKiBQaGFzZSAzIGNvbGxhYm9yYXRpb24gY29tbWFuZHMgKHJvYWRtYXAgXHUwMEE3NSkgKyB0aGUgYWR2aXNvciBib3RzIFx1MjAxNCBwdXJlXG4gKiBmdW5jdGlvbnMgb3ZlciB0aGUgdHlwZWQgY29udHJhY3RzIGNsaWVudCwgc2FtZSBzaGFwZSBhcyBjb21tYW5kcy9pbmRleC50cy5cbiAqXG4gKiBUaGUgYWR2aXNvciBib3RzIGFyZSB0aGUgXCJhZ2VudGlmeSBXSVRIT1VUIHRvdWNoaW5nIHRoZSBzcGluZVwiIHBhdHRlcm5cbiAqICh0aGVzaXMgXHUwMEE3NSk6IGRldGVybWluaXN0aWMgcmVhZCArIHBvc3QsIE5PIExMTSwgTk8gbGlmZWN5Y2xlIG11dGF0aW9uLlxuICogVGhleSBydW4gdW5kZXIgd2hhdGV2ZXIgdG9rZW4gdGhlIGNhbGxlciBob2xkcyBhbmQgb25seSBuZWVkIHRoZSByaWdodCB0b1xuICogcG9zdCBpbnRvIGFuIG9wZW4gdGhyZWFkIFx1MjAxNCB0aGUgYXVkaXQgdHJhaWwgc2hvd3MgemVybyBnYXRlcywgemVyb1xuICogdHJhbnNpdGlvbnMgZnJvbSB0aGVtLlxuICovXG5pbXBvcnQgdHlwZSB7IE9haHNDbGllbnQgfSBmcm9tICdAb2Focy9jb250cmFjdHMnO1xuaW1wb3J0IHR5cGUge1xuICBBZ2VudEpvYixcbiAgRGl2ZXJnZW5jZVJlcG9ydCxcbiAgTWVzc2FnZSxcbiAgTWVudGlvbixcbiAgTm90aWZpY2F0aW9uLFxuICBUaHJlYWQsXG4gIFRocmVhZEtpbmQsXG4gIFRocmVhZFZpc2liaWxpdHksXG4gIFdvcmtJdGVtLFxufSBmcm9tICdAb2Focy9jb3JlJztcblxuaW1wb3J0IHsgcmVuZGVyVGFibGUgfSBmcm9tICcuLi9mb3JtYXQuanMnO1xuXG5jb25zdCBUSFJFQURfS0lORFMgPSBbJ3NwZWMnLCAnZGVzaWduJywgJ3Rhc2snLCAnZ2VuZXJhbCcsICdwcml2YXRlJ10gYXMgY29uc3Q7XG5jb25zdCBWSVNJQklMSVRJRVMgPSBbJ29wZW4nLCAncHJpdmF0ZSddIGFzIGNvbnN0O1xuY29uc3QgSk9CX1NUQVRVU0VTID0gWydxdWV1ZWQnLCAnZG9uZScsICdibG9ja2VkJ10gYXMgY29uc3Q7XG5cbmZ1bmN0aW9uIGFzc2VydFRocmVhZEtpbmQoa2luZDogc3RyaW5nKTogYXNzZXJ0cyBraW5kIGlzIFRocmVhZEtpbmQge1xuICBpZiAoIShUSFJFQURfS0lORFMgYXMgcmVhZG9ubHkgc3RyaW5nW10pLmluY2x1ZGVzKGtpbmQpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBpbnZhbGlkIC0ta2luZCBcIiR7a2luZH1cIiAoZXhwZWN0ZWQgJHtUSFJFQURfS0lORFMuam9pbignIHwgJyl9KWApO1xuICB9XG59XG5cbmZ1bmN0aW9uIGFzc2VydFZpc2liaWxpdHkodmlzaWJpbGl0eTogc3RyaW5nKTogYXNzZXJ0cyB2aXNpYmlsaXR5IGlzIFRocmVhZFZpc2liaWxpdHkge1xuICBpZiAoIShWSVNJQklMSVRJRVMgYXMgcmVhZG9ubHkgc3RyaW5nW10pLmluY2x1ZGVzKHZpc2liaWxpdHkpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBpbnZhbGlkIC0tdmlzaWJpbGl0eSBcIiR7dmlzaWJpbGl0eX1cIiAoZXhwZWN0ZWQgJHtWSVNJQklMSVRJRVMuam9pbignIHwgJyl9KWApO1xuICB9XG59XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gdGhyZWFkIGNyZWF0ZSAvIGxpc3Rcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5leHBvcnQgaW50ZXJmYWNlIFRocmVhZENyZWF0ZU9wdGlvbnMge1xuICBraW5kOiBzdHJpbmc7XG4gIGZlYXR1cmVJZD86IHN0cmluZztcbiAgd29ya0l0ZW1JZD86IHN0cmluZztcbiAgdmlzaWJpbGl0eT86IHN0cmluZztcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHRocmVhZENyZWF0ZUNvbW1hbmQoXG4gIGNsaWVudDogT2Foc0NsaWVudCxcbiAgb3B0czogVGhyZWFkQ3JlYXRlT3B0aW9ucyxcbik6IFByb21pc2U8c3RyaW5nPiB7XG4gIGFzc2VydFRocmVhZEtpbmQob3B0cy5raW5kKTtcbiAgaWYgKG9wdHMudmlzaWJpbGl0eSAhPT0gdW5kZWZpbmVkKSBhc3NlcnRWaXNpYmlsaXR5KG9wdHMudmlzaWJpbGl0eSk7XG4gIGNvbnN0IHRocmVhZCA9IGF3YWl0IGNsaWVudC5jYWxsPFRocmVhZD4oJ2NyZWF0ZV90aHJlYWQnLCB7XG4gICAga2luZDogb3B0cy5raW5kLFxuICAgIC4uLihvcHRzLmZlYXR1cmVJZCAhPT0gdW5kZWZpbmVkID8geyBmZWF0dXJlSWQ6IG9wdHMuZmVhdHVyZUlkIH0gOiB7fSksXG4gICAgLi4uKG9wdHMud29ya0l0ZW1JZCAhPT0gdW5kZWZpbmVkID8geyB3b3JrSXRlbUlkOiBvcHRzLndvcmtJdGVtSWQgfSA6IHt9KSxcbiAgICAuLi4ob3B0cy52aXNpYmlsaXR5ICE9PSB1bmRlZmluZWQgPyB7IHZpc2liaWxpdHk6IG9wdHMudmlzaWJpbGl0eSB9IDoge30pLFxuICB9KTtcbiAgcmV0dXJuIFtcbiAgICBgdGhyZWFkSWQ6ICR7dGhyZWFkLmlkfWAsXG4gICAgYGtpbmQ6ICR7dGhyZWFkLmtpbmR9YCxcbiAgICBgdmlzaWJpbGl0eTogJHt0aHJlYWQudmlzaWJpbGl0eX1gLFxuICAgIGBmZWF0dXJlSWQ6ICR7dGhyZWFkLmZlYXR1cmVJZCA/PyAnLSd9YCxcbiAgICBgd29ya0l0ZW1JZDogJHt0aHJlYWQud29ya0l0ZW1JZCA/PyAnLSd9YCxcbiAgXS5qb2luKCdcXG4nKTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBUaHJlYWRMaXN0T3B0aW9ucyB7XG4gIGZlYXR1cmVJZD86IHN0cmluZztcbiAgd29ya0l0ZW1JZD86IHN0cmluZztcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHRocmVhZExpc3RDb21tYW5kKFxuICBjbGllbnQ6IE9haHNDbGllbnQsXG4gIG9wdHM6IFRocmVhZExpc3RPcHRpb25zID0ge30sXG4pOiBQcm9taXNlPHN0cmluZz4ge1xuICBjb25zdCB0aHJlYWRzID0gYXdhaXQgY2xpZW50LmNhbGw8VGhyZWFkW10+KCdsaXN0X3RocmVhZHMnLCB7XG4gICAgLi4uKG9wdHMuZmVhdHVyZUlkICE9PSB1bmRlZmluZWQgPyB7IGZlYXR1cmVJZDogb3B0cy5mZWF0dXJlSWQgfSA6IHt9KSxcbiAgICAuLi4ob3B0cy53b3JrSXRlbUlkICE9PSB1bmRlZmluZWQgPyB7IHdvcmtJdGVtSWQ6IG9wdHMud29ya0l0ZW1JZCB9IDoge30pLFxuICB9KTtcbiAgcmV0dXJuIHJlbmRlclRhYmxlKFxuICAgIFsnaWQnLCAna2luZCcsICd2aXNpYmlsaXR5JywgJ2ZlYXR1cmVJZCcsICd3b3JrSXRlbUlkJywgJ2NyZWF0ZWRCeSddLFxuICAgIHRocmVhZHMubWFwKCh0KSA9PiBbdC5pZCwgdC5raW5kLCB0LnZpc2liaWxpdHksIHQuZmVhdHVyZUlkLCB0LndvcmtJdGVtSWQsIHQuY3JlYXRlZEJ5XSksXG4gICk7XG59XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gcG9zdCAvIG1lc3NhZ2VzXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuZXhwb3J0IGludGVyZmFjZSBQb3N0T3B0aW9ucyB7XG4gIHRocmVhZElkOiBzdHJpbmc7XG4gIGJvZHk6IHN0cmluZztcbiAgLyoqIFNUUlVDVFVSRUQgbWVudGlvbnMgXHUyMDE0IGFjdG9yIGlkcywgbmV2ZXIgcGFyc2VkIGZyb20gdGhlIGJvZHkgKFx1MDBBNzUuMikuICovXG4gIG1lbnRpb25zPzogc3RyaW5nW107XG4gIHJlcGx5VG8/OiBzdHJpbmc7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBwb3N0Q29tbWFuZChjbGllbnQ6IE9haHNDbGllbnQsIG9wdHM6IFBvc3RPcHRpb25zKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgY29uc3QgbWVzc2FnZSA9IGF3YWl0IGNsaWVudC5jYWxsPE1lc3NhZ2U+KCdwb3N0X21lc3NhZ2UnLCB7XG4gICAgdGhyZWFkSWQ6IG9wdHMudGhyZWFkSWQsXG4gICAgYm9keTogb3B0cy5ib2R5LFxuICAgIC4uLihvcHRzLnJlcGx5VG8gIT09IHVuZGVmaW5lZCA/IHsgcmVwbHlUbzogb3B0cy5yZXBseVRvIH0gOiB7fSksXG4gICAgLi4uKG9wdHMubWVudGlvbnMgIT09IHVuZGVmaW5lZCAmJiBvcHRzLm1lbnRpb25zLmxlbmd0aCA+IDAgPyB7IG1lbnRpb25zOiBvcHRzLm1lbnRpb25zIH0gOiB7fSksXG4gIH0pO1xuICBjb25zdCBsaW5lcyA9IFtgcG9zdGVkICMke21lc3NhZ2Uuc2VxfSAoJHttZXNzYWdlLmlkfSkgdG8gJHttZXNzYWdlLnRocmVhZElkfWBdO1xuICBpZiAob3B0cy5tZW50aW9ucyAhPT0gdW5kZWZpbmVkICYmIG9wdHMubWVudGlvbnMubGVuZ3RoID4gMCkge1xuICAgIGNvbnN0IG1lbnRpb25zID0gYXdhaXQgY2xpZW50LmNhbGw8TWVudGlvbltdPignbGlzdF9tZW50aW9ucycsIHsgbWVzc2FnZUlkOiBtZXNzYWdlLmlkIH0pO1xuICAgIGZvciAoY29uc3QgbWVudGlvbiBvZiBtZW50aW9ucykge1xuICAgICAgbGluZXMucHVzaChgbWVudGlvbiAke21lbnRpb24ubWVudGlvbmVkQWN0b3JJZH06ICR7bWVudGlvbi5yZXNvbHV0aW9ufWApO1xuICAgIH1cbiAgfVxuICByZXR1cm4gbGluZXMuam9pbignXFxuJyk7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgTWVzc2FnZXNPcHRpb25zIHtcbiAgdGhyZWFkSWQ6IHN0cmluZztcbiAgc2luY2VTZXE/OiBudW1iZXI7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBtZXNzYWdlc0NvbW1hbmQoY2xpZW50OiBPYWhzQ2xpZW50LCBvcHRzOiBNZXNzYWdlc09wdGlvbnMpOiBQcm9taXNlPHN0cmluZz4ge1xuICBjb25zdCBtZXNzYWdlcyA9IGF3YWl0IGNsaWVudC5jYWxsPE1lc3NhZ2VbXT4oJ2xpc3RfbWVzc2FnZXMnLCB7XG4gICAgdGhyZWFkSWQ6IG9wdHMudGhyZWFkSWQsXG4gICAgLi4uKG9wdHMuc2luY2VTZXEgIT09IHVuZGVmaW5lZCA/IHsgc2luY2VTZXE6IG9wdHMuc2luY2VTZXEgfSA6IHt9KSxcbiAgfSk7XG4gIC8vIGF1dGhvcklkIGlzIHJlbmRlcmVkIFJBVyBcdTIwMTQgdGhlIENMSSBoYXMgbm8gYWN0b3IgZGlyZWN0b3J5IGFuZCBuZWVkcyBub25lLlxuICByZXR1cm4gcmVuZGVyVGFibGUoXG4gICAgWydzZXEnLCAna2luZCcsICdhdXRob3JJZCcsICdib2R5J10sXG4gICAgbWVzc2FnZXMubWFwKChtKSA9PiBbbS5zZXEsIG0ua2luZCwgbS5hdXRob3JJZCwgbS5ib2R5XSksXG4gICk7XG59XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gbm90aWZpY2F0aW9uc1xuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbmV4cG9ydCBpbnRlcmZhY2UgTm90aWZpY2F0aW9uc09wdGlvbnMge1xuICB1bnJlYWRPbmx5PzogYm9vbGVhbjtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIG5vdGlmaWNhdGlvbnNDb21tYW5kKFxuICBjbGllbnQ6IE9haHNDbGllbnQsXG4gIG9wdHM6IE5vdGlmaWNhdGlvbnNPcHRpb25zID0ge30sXG4pOiBQcm9taXNlPHN0cmluZz4ge1xuICBjb25zdCBub3RpZmljYXRpb25zID0gYXdhaXQgY2xpZW50LmNhbGw8Tm90aWZpY2F0aW9uW10+KCdsaXN0X25vdGlmaWNhdGlvbnMnLCB7XG4gICAgLi4uKG9wdHMudW5yZWFkT25seSA9PT0gdHJ1ZSA/IHsgdW5yZWFkT25seTogdHJ1ZSB9IDoge30pLFxuICB9KTtcbiAgcmV0dXJuIHJlbmRlclRhYmxlKFxuICAgIFsnaWQnLCAnc291cmNlJywgJ3JlZklkJywgJ3JlYWQnXSxcbiAgICBub3RpZmljYXRpb25zLm1hcCgobikgPT4gW24uaWQsIG4uc291cmNlLCBuLnJlZklkLCBuLnJlYWRdKSxcbiAgKTtcbn1cblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBhZ2VudCBqb2JzXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuZXhwb3J0IGludGVyZmFjZSBKb2JzT3B0aW9ucyB7XG4gIGFnZW50QWN0b3JJZD86IHN0cmluZztcbiAgc3RhdHVzPzogc3RyaW5nO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gam9ic0NvbW1hbmQoY2xpZW50OiBPYWhzQ2xpZW50LCBvcHRzOiBKb2JzT3B0aW9ucyA9IHt9KTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgaWYgKG9wdHMuc3RhdHVzICE9PSB1bmRlZmluZWQgJiYgIShKT0JfU1RBVFVTRVMgYXMgcmVhZG9ubHkgc3RyaW5nW10pLmluY2x1ZGVzKG9wdHMuc3RhdHVzKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihgaW52YWxpZCAtLXN0YXR1cyBcIiR7b3B0cy5zdGF0dXN9XCIgKGV4cGVjdGVkICR7Sk9CX1NUQVRVU0VTLmpvaW4oJyB8ICcpfSlgKTtcbiAgfVxuICBjb25zdCBqb2JzID0gYXdhaXQgY2xpZW50LmNhbGw8QWdlbnRKb2JbXT4oJ2xpc3RfYWdlbnRfam9icycsIHtcbiAgICAuLi4ob3B0cy5hZ2VudEFjdG9ySWQgIT09IHVuZGVmaW5lZCA/IHsgYWdlbnRBY3RvcklkOiBvcHRzLmFnZW50QWN0b3JJZCB9IDoge30pLFxuICAgIC4uLihvcHRzLnN0YXR1cyAhPT0gdW5kZWZpbmVkID8geyBzdGF0dXM6IG9wdHMuc3RhdHVzIH0gOiB7fSksXG4gIH0pO1xuICByZXR1cm4gcmVuZGVyVGFibGUoXG4gICAgWydpZCcsICdhZ2VudEFjdG9ySWQnLCAnc3RhdHVzJywgJ3RocmVhZElkJywgJ3dvcmtJdGVtSWQnLCAnZGVwdGgnLCAnbm90ZSddLFxuICAgIGpvYnMubWFwKChqKSA9PiBbai5pZCwgai5hZ2VudEFjdG9ySWQsIGouc3RhdHVzLCBqLnRocmVhZElkLCBqLndvcmtJdGVtSWQsIGouZGVwdGgsIGoubm90ZV0pLFxuICApO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEpvYkNvbXBsZXRlT3B0aW9ucyB7XG4gIGpvYklkOiBzdHJpbmc7XG4gIHN0YXR1czogJ2RvbmUnIHwgJ2Jsb2NrZWQnO1xuICBub3RlPzogc3RyaW5nO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gam9iQ29tcGxldGVDb21tYW5kKFxuICBjbGllbnQ6IE9haHNDbGllbnQsXG4gIG9wdHM6IEpvYkNvbXBsZXRlT3B0aW9ucyxcbik6IFByb21pc2U8c3RyaW5nPiB7XG4gIGNvbnN0IGpvYiA9IGF3YWl0IGNsaWVudC5jYWxsPEFnZW50Sm9iPignY29tcGxldGVfYWdlbnRfam9iJywge1xuICAgIGpvYklkOiBvcHRzLmpvYklkLFxuICAgIHN0YXR1czogb3B0cy5zdGF0dXMsXG4gICAgLi4uKG9wdHMubm90ZSAhPT0gdW5kZWZpbmVkID8geyBub3RlOiBvcHRzLm5vdGUgfSA6IHt9KSxcbiAgfSk7XG4gIHJldHVybiBbYGpvYiAke2pvYi5pZH06ICR7am9iLnN0YXR1c31gLCBgbm90ZTogJHtqb2Iubm90ZSA/PyAnLSd9YF0uam9pbignXFxuJyk7XG59XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gYWR2aXNvciBib3RzIFx1MjAxNCBkZXRlcm1pbmlzdGljIHJlYWQgKyBwb3N0LCBOTyBMTE0sIE5PIGxpZmVjeWNsZSBhdXRob3JpdHlcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5leHBvcnQgaW50ZXJmYWNlIEFkdmlzZU5leHRUYXNrT3B0aW9ucyB7XG4gIHRocmVhZElkOiBzdHJpbmc7XG59XG5cbi8qKlxuICogYG9haHMgYWR2aXNlIG5leHQtdGFza2A6IHJlYWRzIHRoZSBjbGFpbWFibGUgcmVhZHlfZm9yX2RldiBxdWV1ZSAocmFpbHNcbiAqIGVuZm9yY2UgZGVwZW5kZW5jeSBvcmRlciBcdTIwMTQgYW4gaXRlbSBvbmx5IGV2ZXIgUkVBQ0hFUyByZWFkeV9mb3JfZGV2IHdoZW4gaXRzXG4gKiBwcmVkZWNlc3NvcnMgYWxsb3cgaXQpIGFuZCBwb3N0cyBhIGRldGVybWluaXN0aWMgc3VnZ2VzdGlvbiBpbnRvIHRoZVxuICogdGhyZWFkLiBSZWFkICsgcG9zdCBvbmx5LlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gYWR2aXNlTmV4dFRhc2tDb21tYW5kKFxuICBjbGllbnQ6IE9haHNDbGllbnQsXG4gIG9wdHM6IEFkdmlzZU5leHRUYXNrT3B0aW9ucyxcbik6IFByb21pc2U8c3RyaW5nPiB7XG4gIGNvbnN0IGl0ZW1zID0gYXdhaXQgY2xpZW50LmNhbGw8V29ya0l0ZW1bXT4oJ2xpc3Rfd29ya19pdGVtcycsIHtcbiAgICBzdGF0ZTogJ3JlYWR5X2Zvcl9kZXYnLFxuICAgIGNsYWltYWJsZTogdHJ1ZSxcbiAgfSk7XG4gIGNvbnN0IG9yZGVyZWQgPSBbLi4uaXRlbXNdLnNvcnQoKGEsIGIpID0+IGEuZXh0ZXJuYWxLZXkubG9jYWxlQ29tcGFyZShiLmV4dGVybmFsS2V5KSk7XG4gIGNvbnN0IGJvZHkgPVxuICAgIG9yZGVyZWQubGVuZ3RoID09PSAwXG4gICAgICA/ICdhZHZpc29yKG5leHQtdGFzayk6IG5vIGNsYWltYWJsZSByZWFkeV9mb3JfZGV2IGl0ZW1zIHJpZ2h0IG5vdy4nXG4gICAgICA6IFtcbiAgICAgICAgICAnYWR2aXNvcihuZXh0LXRhc2spOiBzdWdnZXN0ZWQgY2xhaW0gb3JkZXIgKGNsYWltYWJsZSByZWFkeV9mb3JfZGV2KTonLFxuICAgICAgICAgIC4uLm9yZGVyZWQubWFwKChpdGVtLCBpKSA9PiBgJHtpICsgMX0uICR7aXRlbS5leHRlcm5hbEtleX0gXHUyMDE0ICR7aXRlbS50aXRsZX0gKCR7aXRlbS5pZH0pYCksXG4gICAgICAgIF0uam9pbignXFxuJyk7XG4gIGNvbnN0IG1lc3NhZ2UgPSBhd2FpdCBjbGllbnQuY2FsbDxNZXNzYWdlPigncG9zdF9tZXNzYWdlJywge1xuICAgIHRocmVhZElkOiBvcHRzLnRocmVhZElkLFxuICAgIGJvZHksXG4gIH0pO1xuICByZXR1cm4gW2BhZHZpc2VkIGluICMke21lc3NhZ2Uuc2VxfSAoJHttZXNzYWdlLmlkfSlgLCBib2R5XS5qb2luKCdcXG4nKTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBBZHZpc2VSZWNvbmNpbGVPcHRpb25zIHtcbiAgdGhyZWFkSWQ6IHN0cmluZztcbiAgLyoqIFJlcGVhdGVkIGAtLWZpbGUgPHdvcmtJdGVtSWQ+PTxmcm9udG1hdHRlclN0YXR1cz5gIHBhaXJzLiAqL1xuICBmaWxlczogc3RyaW5nW107XG59XG5cbi8qKlxuICogYG9haHMgYWR2aXNlIHJlY29uY2lsZWA6IHJ1bnMgdGhlIERFVEVDVC1PTkxZIHJlY29uY2lsZSBxdWVyeSBvdmVyIHRoZVxuICogZ2l2ZW4gZnJvbnRtYXR0ZXIgc3RhdHVzZXMgYW5kIHBvc3RzIHRoZSBkaXZlcmdlbmNlIHJlcG9ydCBpbnRvIHRoZVxuICogdGhyZWFkLiBOZXZlciBtdXRhdGVzIGFueXRoaW5nIChyb2FkbWFwIFx1MDBBNzEuNiAvIEQ2KS5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGFkdmlzZVJlY29uY2lsZUNvbW1hbmQoXG4gIGNsaWVudDogT2Foc0NsaWVudCxcbiAgb3B0czogQWR2aXNlUmVjb25jaWxlT3B0aW9ucyxcbik6IFByb21pc2U8c3RyaW5nPiB7XG4gIGlmIChvcHRzLmZpbGVzLmxlbmd0aCA9PT0gMCkge1xuICAgIHRocm93IG5ldyBFcnJvcignbm90aGluZyB0byByZWNvbmNpbGU6IHBhc3MgYXQgbGVhc3Qgb25lIC0tZmlsZSA8d29ya0l0ZW1JZD49PHN0YXR1cz4nKTtcbiAgfVxuICBjb25zdCBmaWxlcyA9IG9wdHMuZmlsZXMubWFwKChwYWlyKSA9PiB7XG4gICAgY29uc3QgZXEgPSBwYWlyLmluZGV4T2YoJz0nKTtcbiAgICBpZiAoZXEgPD0gMCB8fCBlcSA9PT0gcGFpci5sZW5ndGggLSAxKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYGludmFsaWQgLS1maWxlIFwiJHtwYWlyfVwiIChleHBlY3RlZCA8d29ya0l0ZW1JZD49PHN0YXR1cz4pYCk7XG4gICAgfVxuICAgIHJldHVybiB7IHdvcmtJdGVtSWQ6IHBhaXIuc2xpY2UoMCwgZXEpLCBmcm9udG1hdHRlclN0YXR1czogcGFpci5zbGljZShlcSArIDEpIH07XG4gIH0pO1xuICBjb25zdCByZXBvcnRzID0gYXdhaXQgY2xpZW50LmNhbGw8RGl2ZXJnZW5jZVJlcG9ydFtdPigncmVjb25jaWxlJywgeyBmaWxlcyB9KTtcbiAgY29uc3QgYm9keSA9XG4gICAgcmVwb3J0cy5sZW5ndGggPT09IDBcbiAgICAgID8gYGFkdmlzb3IocmVjb25jaWxlKTogbm8gZGl2ZXJnZW5jZSBhY3Jvc3MgJHtmaWxlcy5sZW5ndGh9IGZpbGUocykuIChkZXRlY3Qtb25seSlgXG4gICAgICA6IFtcbiAgICAgICAgICBgYWR2aXNvcihyZWNvbmNpbGUpOiAke3JlcG9ydHMubGVuZ3RofSBkaXZlcmdlbmNlKHMpIGRldGVjdGVkIChkZXRlY3Qtb25seSwgbm90aGluZyB3YXMgY2hhbmdlZCk6YCxcbiAgICAgICAgICAuLi5yZXBvcnRzLm1hcChcbiAgICAgICAgICAgIChyKSA9PiBgLSAke3Iud29ya0l0ZW1JZH06IGZpbGU9JHtyLmZpbGVTdGF0ZX0gZGI9JHtyLmRiU3RhdGV9IFx1MjE5MiAke3Iua2luZH1gLFxuICAgICAgICAgICksXG4gICAgICAgIF0uam9pbignXFxuJyk7XG4gIGNvbnN0IG1lc3NhZ2UgPSBhd2FpdCBjbGllbnQuY2FsbDxNZXNzYWdlPigncG9zdF9tZXNzYWdlJywge1xuICAgIHRocmVhZElkOiBvcHRzLnRocmVhZElkLFxuICAgIGJvZHksXG4gIH0pO1xuICByZXR1cm4gW2BhZHZpc2VkIGluICMke21lc3NhZ2Uuc2VxfSAoJHttZXNzYWdlLmlkfSlgLCBib2R5XS5qb2luKCdcXG4nKTtcbn1cbiIsICIvKipcbiAqIFBoYXNlIDUgY29tbWFuZHMgKHJvYWRtYXAgXHUwMEE3Nik6IHRoZSBsZWFybmluZyB0ZWFtbWF0ZSdzIE9XTiBtZW1vcnkgYW5kIHRoZVxuICogcmV2aWV3LWNvbnZlcmdlbmNlIG1lYXN1cmluZyBzdGljayBcdTIwMTQgcHVyZSBmdW5jdGlvbnMgb3ZlciB0aGUgdHlwZWRcbiAqIGNvbnRyYWN0cyBjbGllbnQsIHNhbWUgc2hhcGUgYXMgY29tbWFuZHMvaW5kZXgudHMuXG4gKlxuICogYG9haHMgbWVtb3J5YCByZWFkcyBvbmx5IHRoZSBjYWxsZXItdG9rZW4ncyBtZW1vcmllczogdGhlIHdpcmUgY29tbWFuZHNcbiAqIGNhcnJ5IE5PIGFjdG9yIHBhcmFtZXRlciAob3duZXItc2NvcGVkIGJ5IGNvbnN0cnVjdGlvbiksIHNvIHRoZSBDTEkgY2Fubm90XG4gKiBldmVuIGV4cHJlc3MgXCJzaG93IG1lIGFub3RoZXIgYWdlbnQncyBtZW1vcnlcIi5cbiAqXG4gKiBgb2FocyBzdGF0cyByZXZpZXdzYCByZW5kZXJzIHJldmlld0xvb3BJdGVyYXRpb24gcGVyIHdvcmsgaXRlbSBhbmQgcGVyXG4gKiBraW5kIFx1MjAxNCB0aGUgZGV0ZXJtaW5pc3RpYyBudW1iZXIgYmVoaW5kIHRoZSBcdTAwQTc2IGV4aXQgY3JpdGVyaW9uIFwicmV2aWV3XG4gKiBpdGVyYXRpb25zIGltcHJvdmUgd2Vlay1vdmVyLXdlZWtcIi5cbiAqL1xuaW1wb3J0IHR5cGUgeyBPYWhzQ2xpZW50IH0gZnJvbSAnQG9haHMvY29udHJhY3RzJztcbmltcG9ydCB0eXBlIHsgQWdlbnRNZW1vcnksIE1lbW9yeUtpbmQsIFdvcmtJdGVtIH0gZnJvbSAnQG9haHMvY29yZSc7XG5cbmltcG9ydCB7IHJlbmRlclRhYmxlIH0gZnJvbSAnLi4vZm9ybWF0LmpzJztcblxuY29uc3QgTUVNT1JZX0tJTkRTID0gWydlcGlzb2RpYycsICdwcm9jZWR1cmFsJywgJ2VudGl0eSddIGFzIGNvbnN0O1xuXG5mdW5jdGlvbiBhc3NlcnRNZW1vcnlLaW5kKGtpbmQ6IHN0cmluZyk6IGFzc2VydHMga2luZCBpcyBNZW1vcnlLaW5kIHtcbiAgaWYgKCEoTUVNT1JZX0tJTkRTIGFzIHJlYWRvbmx5IHN0cmluZ1tdKS5pbmNsdWRlcyhraW5kKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihgaW52YWxpZCAtLWtpbmQgXCIke2tpbmR9XCIgKGV4cGVjdGVkICR7TUVNT1JZX0tJTkRTLmpvaW4oJyB8ICcpfSlgKTtcbiAgfVxufVxuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIG1lbW9yeVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbmV4cG9ydCBpbnRlcmZhY2UgTWVtb3J5T3B0aW9ucyB7XG4gIGtpbmQ/OiBzdHJpbmc7XG4gIHF1ZXJ5Pzogc3RyaW5nO1xuICAvKiogUmVjYWxsIGNvbnRleHQ6IHByaXZhdGUtc291cmNlZCBtZW1vcmllcyBzdXJmYWNlIG9ubHkgaW4gdGhlaXIgc291cmNlIHRocmVhZCAoXHUwMEE3NikuICovXG4gIGNvbnRleHRUaHJlYWRJZD86IHN0cmluZztcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIG1lbW9yeUNvbW1hbmQoY2xpZW50OiBPYWhzQ2xpZW50LCBvcHRzOiBNZW1vcnlPcHRpb25zID0ge30pOiBQcm9taXNlPHN0cmluZz4ge1xuICBpZiAob3B0cy5raW5kICE9PSB1bmRlZmluZWQpIGFzc2VydE1lbW9yeUtpbmQob3B0cy5raW5kKTtcbiAgY29uc3QgbWVtb3JpZXMgPSBhd2FpdCBjbGllbnQuY2FsbDxBZ2VudE1lbW9yeVtdPignc2VhcmNoX2FnZW50X21lbW9yeScsIHtcbiAgICAuLi4ob3B0cy5raW5kICE9PSB1bmRlZmluZWQgPyB7IGtpbmQ6IG9wdHMua2luZCB9IDoge30pLFxuICAgIC4uLihvcHRzLnF1ZXJ5ICE9PSB1bmRlZmluZWQgPyB7IHF1ZXJ5OiBvcHRzLnF1ZXJ5IH0gOiB7fSksXG4gICAgLi4uKG9wdHMuY29udGV4dFRocmVhZElkICE9PSB1bmRlZmluZWQgPyB7IGNvbnRleHRUaHJlYWRJZDogb3B0cy5jb250ZXh0VGhyZWFkSWQgfSA6IHt9KSxcbiAgfSk7XG4gIHJldHVybiBbXG4gICAgJ3lvdXIgbWVtb3JpZXMgKG93bmVyLXNjb3BlZCBcdTIwMTQgdGhpcyB0b2tlblx1MjAxOXMgYWdlbnQgb25seSk6JyxcbiAgICByZW5kZXJUYWJsZShcbiAgICAgIFsnc2VxJywgJ2tpbmQnLCAnc291cmNlVGhyZWFkSWQnLCAnc291cmNlVmlzaWJpbGl0eScsICdjb250ZW50J10sXG4gICAgICBtZW1vcmllcy5tYXAoKG0pID0+IFttLnNlcSwgbS5raW5kLCBtLnNvdXJjZVRocmVhZElkLCBtLnNvdXJjZVZpc2liaWxpdHksIG0uY29udGVudF0pLFxuICAgICksXG4gIF0uam9pbignXFxuJyk7XG59XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gc3RhdHMgcmV2aWV3c1xuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbmludGVyZmFjZSBLaW5kU3RhdHMge1xuICBraW5kOiBzdHJpbmc7XG4gIGRvbmU6IG51bWJlcjtcbiAgdG90YWxMb29wczogbnVtYmVyO1xuICBtYXhMb29wczogbnVtYmVyO1xufVxuXG4vKipcbiAqIGBvYWhzIHN0YXRzIHJldmlld3NgOiByZXZpZXctbG9vcCBjb252ZXJnZW5jZSBwZXIga2luZCBvdmVyIGRvbmUgaXRlbXMsXG4gKiBwbHVzIGV2ZXJ5IGl0ZW0ncyBvd24gbG9vcCBjb3VudCBcdTIwMTQgY29tcGFyYWJsZSBydW4gb3ZlciBydW4sIHdoaWNoIGlzIHRoZVxuICogd2hvbGUgcG9pbnQgb2YgdGhlIG1ldHJpYy5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHN0YXRzUmV2aWV3c0NvbW1hbmQoY2xpZW50OiBPYWhzQ2xpZW50KTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgY29uc3QgaXRlbXMgPSBhd2FpdCBjbGllbnQuY2FsbDxXb3JrSXRlbVtdPignbGlzdF93b3JrX2l0ZW1zJyk7XG4gIGNvbnN0IGJ5S2luZCA9IG5ldyBNYXA8c3RyaW5nLCBLaW5kU3RhdHM+KCk7XG4gIGZvciAoY29uc3QgaXRlbSBvZiBpdGVtcykge1xuICAgIGlmIChpdGVtLnN0YXRlICE9PSAnZG9uZScpIGNvbnRpbnVlO1xuICAgIGNvbnN0IHN0YXRzID0gYnlLaW5kLmdldChpdGVtLmtpbmQpID8/IHsga2luZDogaXRlbS5raW5kLCBkb25lOiAwLCB0b3RhbExvb3BzOiAwLCBtYXhMb29wczogMCB9O1xuICAgIHN0YXRzLmRvbmUgKz0gMTtcbiAgICBzdGF0cy50b3RhbExvb3BzICs9IGl0ZW0ucmV2aWV3TG9vcEl0ZXJhdGlvbjtcbiAgICBzdGF0cy5tYXhMb29wcyA9IE1hdGgubWF4KHN0YXRzLm1heExvb3BzLCBpdGVtLnJldmlld0xvb3BJdGVyYXRpb24pO1xuICAgIGJ5S2luZC5zZXQoaXRlbS5raW5kLCBzdGF0cyk7XG4gIH1cbiAgY29uc3Qga2luZHMgPSBbLi4uYnlLaW5kLnZhbHVlcygpXS5zb3J0KChhLCBiKSA9PiBhLmtpbmQubG9jYWxlQ29tcGFyZShiLmtpbmQpKTtcbiAgY29uc3Qgc29ydGVkID0gWy4uLml0ZW1zXS5zb3J0KChhLCBiKSA9PiBhLmV4dGVybmFsS2V5LmxvY2FsZUNvbXBhcmUoYi5leHRlcm5hbEtleSkpO1xuICByZXR1cm4gW1xuICAgICdyZXZpZXcgY29udmVyZ2VuY2UgYnkga2luZCAoZG9uZSBpdGVtcyBcdTIwMTQgbG93ZXIgbG9vcHMgPSBiZXR0ZXIpOicsXG4gICAgcmVuZGVyVGFibGUoXG4gICAgICBbJ2tpbmQnLCAnZG9uZScsICdhdmdMb29wcycsICdtYXhMb29wcyddLFxuICAgICAga2luZHMubWFwKChzKSA9PiBbcy5raW5kLCBzLmRvbmUsIChzLnRvdGFsTG9vcHMgLyBzLmRvbmUpLnRvRml4ZWQoMiksIHMubWF4TG9vcHNdKSxcbiAgICApLFxuICAgICcnLFxuICAgICdpdGVtczonLFxuICAgIHJlbmRlclRhYmxlKFxuICAgICAgWydleHRlcm5hbEtleScsICdraW5kJywgJ3N0YXRlJywgJ2xvb3BzJ10sXG4gICAgICBzb3J0ZWQubWFwKChpdGVtKSA9PiBbaXRlbS5leHRlcm5hbEtleSwgaXRlbS5raW5kLCBpdGVtLnN0YXRlLCBpdGVtLnJldmlld0xvb3BJdGVyYXRpb25dKSxcbiAgICApLFxuICBdLmpvaW4oJ1xcbicpO1xufVxuIiwgIi8qKlxuICogYG9haHMgc2VydmVgIFx1MjAxNCBib290IHRoZSBzcGluZS1hcGkgaW4tcHJvY2Vzcy5cbiAqXG4gKiBFbmdpbmUgc2VsZWN0aW9uOlxuICogIC0gZGVmYXVsdDogQG9haHMvY29yZSBjcmVhdGVNZW1vcnlFbmdpbmUgKHplcm8gcGVyc2lzdGVuY2UsIGluc3RhbnQpO1xuICogIC0gLS1kYXRhIDxkaXI+OiBEVVJBQkxFIFBHbGl0ZSB2aWEgQG9haHMvZGIgY3JlYXRlUGdTeW5jRW5naW5lKHtkYXRhRGlyfSlcbiAqICAgIHBsdXMgYSBwZXJzaXN0ZWQgVG9rZW5TdG9yZSwgc28gYWN0b3JzL3Rva2Vucy9zdGF0ZSBzdXJ2aXZlIHJlc3RhcnRzLlxuICpcbiAqIEBvYWhzL2RiIGlzIGltcG9ydGVkIExBWklMWTogaXRzIHN5bmNocm9ub3VzIGZhY2FkZSBzcGF3bnMgYSBzeW5ja2l0XG4gKiB3b3JrZXIgKFBHbGl0ZSB3YXNtKSBhdCBtb2R1bGUgbG9hZCwgd2hpY2ggbm8gbWVtb3J5LWVuZ2luZSBzZXJ2ZSBcdTIwMTQgYW5kIG5vXG4gKiBnYXRlLWhvbGRlciBjb21tYW5kIFx1MjAxNCBzaG91bGQgZXZlciBwYXkgZm9yLlxuICpcbiAqIEVudiBpcyByZWFkIGluIGNsaS50cyAodGhlIGVudHJ5cG9pbnQpLCBuZXZlciBoZXJlOiB0aGlzIG1vZHVsZSB0YWtlc1xuICogZXZlcnl0aGluZyBhcyBwYXJhbWV0ZXJzLCBtaXJyb3JpbmcgdGhlIHNwaW5lLWFwaSBjb252ZW50aW9uLlxuICovXG5pbXBvcnQgeyByYW5kb21CeXRlcyB9IGZyb20gJ25vZGU6Y3J5cHRvJztcbmltcG9ydCB7IG1rZGlyU3luYyB9IGZyb20gJ25vZGU6ZnMnO1xuaW1wb3J0IHR5cGUgeyBBZGRyZXNzSW5mbyB9IGZyb20gJ25vZGU6bmV0JztcbmltcG9ydCB7IGpvaW4gfSBmcm9tICdub2RlOnBhdGgnO1xuXG5pbXBvcnQgeyBjcmVhdGVNZW1vcnlFbmdpbmUgfSBmcm9tICdAb2Focy9jb3JlJztcbmltcG9ydCB7IFRva2VuU3RvcmUsIGJ1aWxkU2VydmVyIH0gZnJvbSAnQG9haHMvc3BpbmUtYXBpJztcblxuZXhwb3J0IGNvbnN0IERFRkFVTFRfUE9SVCA9IDQ1MTc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgU2VydmVPcHRpb25zIHtcbiAgLyoqIFRDUCBwb3J0ICgwID0gZXBoZW1lcmFsKS4gRGVmYXVsdCA0NTE3LiAqL1xuICBwb3J0PzogbnVtYmVyO1xuICAvKiogQmluZCBob3N0LiBEZWZhdWx0IDAuMC4wLjAuICovXG4gIGhvc3Q/OiBzdHJpbmc7XG4gIC8qKiBCb290c3RyYXAgYWRtaW4gY3JlZGVudGlhbC4gT21pdHRlZCBcdTIxOTIgZ2VuZXJhdGVkIChzZWUgaGFuZGxlLmFkbWluVG9rZW5HZW5lcmF0ZWQpLiAqL1xuICBhZG1pblRva2VuPzogc3RyaW5nO1xuICAvKiogUGVyc2lzdGVuY2Ugcm9vdDogUEdsaXRlIGRhdGEgdW5kZXIgPGRhdGFEaXI+L3BnLCB0b2tlbnMgaW4gPGRhdGFEaXI+L3Rva2Vucy5qc29uLiAqL1xuICBkYXRhRGlyPzogc3RyaW5nO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFNlcnZlSGFuZGxlIHtcbiAgdXJsOiBzdHJpbmc7XG4gIHBvcnQ6IG51bWJlcjtcbiAgYWRtaW5Ub2tlbjogc3RyaW5nO1xuICAvKiogdHJ1ZSB3aGVuIG5vIGFkbWluIHRva2VuIHdhcyBwcm92aWRlZCBhbmQgb25lIHdhcyBnZW5lcmF0ZWQuICovXG4gIGFkbWluVG9rZW5HZW5lcmF0ZWQ6IGJvb2xlYW47XG4gIGVuZ2luZUtpbmQ6ICdtZW1vcnknIHwgJ3BnbGl0ZSc7XG4gIGNsb3NlKCk6IFByb21pc2U8dm9pZD47XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBzdGFydFNlcnZlKG9wdGlvbnM6IFNlcnZlT3B0aW9ucyA9IHt9KTogUHJvbWlzZTxTZXJ2ZUhhbmRsZT4ge1xuICBjb25zdCBhZG1pblRva2VuR2VuZXJhdGVkID0gb3B0aW9ucy5hZG1pblRva2VuID09PSB1bmRlZmluZWQ7XG4gIGNvbnN0IGFkbWluVG9rZW4gPSBvcHRpb25zLmFkbWluVG9rZW4gPz8gcmFuZG9tQnl0ZXMoMzIpLnRvU3RyaW5nKCdoZXgnKTtcblxuICBsZXQgZW5naW5lS2luZDogU2VydmVIYW5kbGVbJ2VuZ2luZUtpbmQnXTtcbiAgbGV0IGVuZ2luZTtcbiAgbGV0IHRva2VuU3RvcmU6IFRva2VuU3RvcmU7XG4gIGlmIChvcHRpb25zLmRhdGFEaXIgIT09IHVuZGVmaW5lZCkge1xuICAgIG1rZGlyU3luYyhvcHRpb25zLmRhdGFEaXIsIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xuICAgIGNvbnN0IHsgY3JlYXRlUGdTeW5jRW5naW5lIH0gPSBhd2FpdCBpbXBvcnQoJ0BvYWhzL2RiJyk7XG4gICAgZW5naW5lID0gY3JlYXRlUGdTeW5jRW5naW5lKHsgZGF0YURpcjogam9pbihvcHRpb25zLmRhdGFEaXIsICdwZycpIH0pO1xuICAgIHRva2VuU3RvcmUgPSBuZXcgVG9rZW5TdG9yZSh7IHBlcnNpc3RQYXRoOiBqb2luKG9wdGlvbnMuZGF0YURpciwgJ3Rva2Vucy5qc29uJykgfSk7XG4gICAgZW5naW5lS2luZCA9ICdwZ2xpdGUnO1xuICB9IGVsc2Uge1xuICAgIGVuZ2luZSA9IGNyZWF0ZU1lbW9yeUVuZ2luZSgpO1xuICAgIHRva2VuU3RvcmUgPSBuZXcgVG9rZW5TdG9yZSgpO1xuICAgIGVuZ2luZUtpbmQgPSAnbWVtb3J5JztcbiAgfVxuXG4gIGNvbnN0IGFwcCA9IGF3YWl0IGJ1aWxkU2VydmVyKHsgZW5naW5lLCB0b2tlblN0b3JlLCBhZG1pblRva2VuIH0pO1xuICBhd2FpdCBhcHAubGlzdGVuKHsgcG9ydDogb3B0aW9ucy5wb3J0ID8/IERFRkFVTFRfUE9SVCwgaG9zdDogb3B0aW9ucy5ob3N0ID8/ICcwLjAuMC4wJyB9KTtcbiAgY29uc3QgeyBwb3J0IH0gPSBhcHAuc2VydmVyLmFkZHJlc3MoKSBhcyBBZGRyZXNzSW5mbztcblxuICByZXR1cm4ge1xuICAgIHVybDogYGh0dHA6Ly8xMjcuMC4wLjE6JHtwb3J0fWAsXG4gICAgcG9ydCxcbiAgICBhZG1pblRva2VuLFxuICAgIGFkbWluVG9rZW5HZW5lcmF0ZWQsXG4gICAgZW5naW5lS2luZCxcbiAgICBjbG9zZTogYXN5bmMgKCkgPT4ge1xuICAgICAgYXdhaXQgYXBwLmNsb3NlKCk7XG4gICAgfSxcbiAgfTtcbn1cbiIsICIvKipcbiAqIEBvYWhzL3NwaW5lLWFwaSBcdTIwMTQgSFRUUCArIE1DUCBzdXJmYWNlcyBvdmVyIHRoZSBvbmUgY29tbWFuZCBidXMuXG4gKlxuICogRW52IGlzIHJlYWQgT05MWSBoZXJlIChzdGFydCgpLCBmb3IgdGhlIENMSSBlbnRyeXBvaW50KTsgdGhlIGxpYnJhcnlcbiAqIG1vZHVsZXMgdGFrZSBldmVyeXRoaW5nIGFzIHBhcmFtZXRlcnMuXG4gKi9cbmltcG9ydCB7IGNyZWF0ZU1lbW9yeUVuZ2luZSB9IGZyb20gJ0BvYWhzL2NvcmUnO1xuXG5pbXBvcnQgeyBUb2tlblN0b3JlIH0gZnJvbSAnLi9hdXRoLmpzJztcbmltcG9ydCB7IGJ1aWxkU2VydmVyIH0gZnJvbSAnLi9zZXJ2ZXIuanMnO1xuXG5leHBvcnQgeyBUb2tlblN0b3JlLCB0eXBlIFJlc29sdmVkVG9rZW4gfSBmcm9tICcuL2F1dGguanMnO1xuZXhwb3J0IHsgY3JlYXRlQ29tbWFuZEJ1cyB9IGZyb20gJy4vYnVzLmpzJztcbmV4cG9ydCB7IGJ1aWxkU2VydmVyLCBlcnJvckVudmVsb3BlLCBlcnJvck5hbWUsIHR5cGUgQnVpbGRTZXJ2ZXJPcHRpb25zIH0gZnJvbSAnLi9zZXJ2ZXIuanMnO1xuZXhwb3J0IHsgYnVpbGRNY3BTZXJ2ZXIsIHJlZ2lzdGVyTWNwUm91dGUgfSBmcm9tICcuL21jcC5qcyc7XG5leHBvcnQge1xuICBwb2xsaW5nRXZlbnRUYWlsLFxuICByZWdpc3RlckV2ZW50U3RyZWFtLFxuICB0eXBlIEV2ZW50U3RyZWFtT3B0aW9ucyxcbiAgdHlwZSBFdmVudFRhaWwsXG59IGZyb20gJy4vc3NlLmpzJztcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHN0YXJ0KCk6IFByb21pc2U8dm9pZD4ge1xuICBjb25zdCBwb3J0ID0gTnVtYmVyKHByb2Nlc3MuZW52WydQT1JUJ10gPz8gJzMwMDAnKTtcbiAgY29uc3QgYWRtaW5Ub2tlbiA9IHByb2Nlc3MuZW52WydPQUhTX0FETUlOX1RPS0VOJ107XG4gIGlmIChhZG1pblRva2VuID09PSB1bmRlZmluZWQgfHwgYWRtaW5Ub2tlbi5sZW5ndGggPT09IDApIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ09BSFNfQURNSU5fVE9LRU4gbXVzdCBiZSBzZXQgKGJvb3RzdHJhcCBhZG1pbiBjcmVkZW50aWFsKScpO1xuICB9XG4gIGNvbnN0IHBlcnNpc3RQYXRoID0gcHJvY2Vzcy5lbnZbJ09BSFNfVE9LRU5fU1RPUkVfUEFUSCddO1xuICBjb25zdCB0b2tlblN0b3JlID0gbmV3IFRva2VuU3RvcmUocGVyc2lzdFBhdGggIT09IHVuZGVmaW5lZCA/IHsgcGVyc2lzdFBhdGggfSA6IHt9KTtcbiAgY29uc3QgZW5naW5lID0gY3JlYXRlTWVtb3J5RW5naW5lKCk7XG4gIGNvbnN0IGFwcCA9IGF3YWl0IGJ1aWxkU2VydmVyKHsgZW5naW5lLCB0b2tlblN0b3JlLCBhZG1pblRva2VuIH0pO1xuICBhd2FpdCBhcHAubGlzdGVuKHsgcG9ydCwgaG9zdDogJzAuMC4wLjAnIH0pO1xuICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICBjb25zb2xlLmxvZyhgb2FocyBzcGluZS1hcGkgbGlzdGVuaW5nIG9uIDoke3BvcnR9IChIVFRQIC9ycGMvKiwgTUNQIC9tY3ApYCk7XG59XG4iLCAiLyoqXG4gKiBUb2tlblN0b3JlIFx1MjAxNCBiZWFyZXItdG9rZW4gYXV0aGVudGljYXRpb24gZm9yIGJvdGggc3VyZmFjZXMgKEhUVFAgKyBNQ1ApLlxuICpcbiAqIFRva2VucyBhcmUgb3BhcXVlIDMyLWJ5dGUgcmFuZG9tIGhleCBzdHJpbmdzOyBvbmx5IHRoZWlyIHNoYTI1NiBoYXNoIGlzXG4gKiBzdG9yZWQgKGFuZCBvcHRpb25hbGx5IHBlcnNpc3RlZCksIHNvIGEgbGVha2VkIHN0b3JlIGZpbGUgbmV2ZXIgbGVha3MgYVxuICogdXNhYmxlIGNyZWRlbnRpYWwuIFRoZSBib290c3RyYXAgYWRtaW4gdG9rZW4gYXJyaXZlcyBhcyBhIFBBUkFNRVRFUiBcdTIwMTQgdGhpc1xuICogbW9kdWxlIG5ldmVyIHJlYWRzIHRoZSBlbnZpcm9ubWVudCAoZW52IGhhbmRsaW5nIGxpdmVzIGluIGluZGV4LnRzIHN0YXJ0KCkpLlxuICovXG5pbXBvcnQgeyBjcmVhdGVIYXNoLCByYW5kb21CeXRlcyB9IGZyb20gJ25vZGU6Y3J5cHRvJztcbmltcG9ydCB7IGV4aXN0c1N5bmMsIG1rZGlyU3luYywgcmVhZEZpbGVTeW5jLCB3cml0ZUZpbGVTeW5jIH0gZnJvbSAnbm9kZTpmcyc7XG5pbXBvcnQgeyBkaXJuYW1lIH0gZnJvbSAnbm9kZTpwYXRoJztcblxuZXhwb3J0IGludGVyZmFjZSBSZXNvbHZlZFRva2VuIHtcbiAgYWN0b3JJZDogc3RyaW5nO1xuICBpc0FkbWluOiBib29sZWFuO1xufVxuXG5pbnRlcmZhY2UgUGVyc2lzdFNoYXBlIHtcbiAgdmVyc2lvbjogMTtcbiAgdG9rZW5zOiBSZWNvcmQ8c3RyaW5nLCBSZXNvbHZlZFRva2VuPjsgLy8gc2hhMjU2KHRva2VuKSBoZXggLT4gcmVjb3JkXG4gIC8qKlxuICAgKiBQaGFzZSAyIChyb2FkbWFwIFx1MDBBNzMpOiB0aGUgUkVBTCBlbmdpbmUgYWN0b3IgdGhlIGJvb3RzdHJhcCBhZG1pbiB0b2tlblxuICAgKiBhY3RzIGFzICgnV29ya3NwYWNlIEFkbWluJywgZ292ZXJuYW5jZSByb2xlICdhZG1pbicpLiBQZXJzaXN0ZWQgc28gYVxuICAgKiBgLS1kYXRhYCByZXN0YXJ0IHJldXNlcyB0aGUgc2FtZSBhY3RvciBpbnN0ZWFkIG9mIG1pbnRpbmcgYSBuZXcgb25lLlxuICAgKi9cbiAgYWRtaW5BY3RvcklkPzogc3RyaW5nO1xufVxuXG5mdW5jdGlvbiBoYXNoVG9rZW4odG9rZW46IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBjcmVhdGVIYXNoKCdzaGEyNTYnKS51cGRhdGUodG9rZW4sICd1dGY4JykuZGlnZXN0KCdoZXgnKTtcbn1cblxuZXhwb3J0IGNsYXNzIFRva2VuU3RvcmUge1xuICBwcml2YXRlIHJlYWRvbmx5IGJ5SGFzaCA9IG5ldyBNYXA8c3RyaW5nLCBSZXNvbHZlZFRva2VuPigpO1xuICBwcml2YXRlIHJlYWRvbmx5IHBlcnNpc3RQYXRoOiBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gIHByaXZhdGUgYWRtaW5BY3RvcklkOiBzdHJpbmcgfCB1bmRlZmluZWQ7XG5cbiAgY29uc3RydWN0b3Iob3B0aW9ucz86IHsgcGVyc2lzdFBhdGg/OiBzdHJpbmcgfSkge1xuICAgIHRoaXMucGVyc2lzdFBhdGggPSBvcHRpb25zPy5wZXJzaXN0UGF0aDtcbiAgICBpZiAodGhpcy5wZXJzaXN0UGF0aCAhPT0gdW5kZWZpbmVkICYmIGV4aXN0c1N5bmModGhpcy5wZXJzaXN0UGF0aCkpIHtcbiAgICAgIGNvbnN0IHJhdyA9IEpTT04ucGFyc2UocmVhZEZpbGVTeW5jKHRoaXMucGVyc2lzdFBhdGgsICd1dGY4JykpIGFzIFBlcnNpc3RTaGFwZTtcbiAgICAgIGZvciAoY29uc3QgW2hhc2gsIHJlY29yZF0gb2YgT2JqZWN0LmVudHJpZXMocmF3LnRva2VucykpIHtcbiAgICAgICAgdGhpcy5ieUhhc2guc2V0KGhhc2gsIHsgYWN0b3JJZDogcmVjb3JkLmFjdG9ySWQsIGlzQWRtaW46IHJlY29yZC5pc0FkbWluIH0pO1xuICAgICAgfVxuICAgICAgdGhpcy5hZG1pbkFjdG9ySWQgPSByYXcuYWRtaW5BY3RvcklkO1xuICAgIH1cbiAgfVxuXG4gIC8qKiBQZXJzaXN0ZWQgZW5naW5lLWFjdG9yIGlkIHRoZSBib290c3RyYXAgYWRtaW4gdG9rZW4gbWFwcyB0byAoaWYgYW55KS4gKi9cbiAgZ2V0QWRtaW5BY3RvcklkKCk6IHN0cmluZyB8IHVuZGVmaW5lZCB7XG4gICAgcmV0dXJuIHRoaXMuYWRtaW5BY3RvcklkO1xuICB9XG5cbiAgLyoqIFJlbWVtYmVyIChhbmQgcGVyc2lzdCkgdGhlIGJvb3RzdHJhcCBhZG1pbiBhY3RvciBtYXBwaW5nLiAqL1xuICBzZXRBZG1pbkFjdG9ySWQoYWN0b3JJZDogc3RyaW5nKTogdm9pZCB7XG4gICAgdGhpcy5hZG1pbkFjdG9ySWQgPSBhY3RvcklkO1xuICAgIHRoaXMuc2F2ZSgpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlZ2lzdGVyIHRoZSBib290c3RyYXAgYWRtaW4gdG9rZW4gKHN1cnZpdmVzIHJlc3RhcnRzIGJ5IHJlLWJvb3RzdHJhcCxcbiAgICogbm90IHBlcnNpc3RlbmNlIFx1MjAxNCB0aGUgYWRtaW4gY3JlZGVudGlhbCBpcyBjb25maWd1cmF0aW9uLCBub3Qgc3RhdGUpLlxuICAgKi9cbiAgYm9vdHN0cmFwQWRtaW4odG9rZW46IHN0cmluZywgYWN0b3JJZCA9ICdhZG1pbicpOiB2b2lkIHtcbiAgICB0aGlzLmJ5SGFzaC5zZXQoaGFzaFRva2VuKHRva2VuKSwgeyBhY3RvcklkLCBpc0FkbWluOiB0cnVlIH0pO1xuICB9XG5cbiAgLyoqIElzc3VlIGEgZnJlc2ggdG9rZW4gZm9yIGFuIGFjdG9yLiBUaGUgcGxhaW50ZXh0IGlzIHJldHVybmVkIGV4YWN0bHkgb25jZS4gKi9cbiAgaXNzdWUoYWN0b3JJZDogc3RyaW5nKTogc3RyaW5nIHtcbiAgICBjb25zdCB0b2tlbiA9IHJhbmRvbUJ5dGVzKDMyKS50b1N0cmluZygnaGV4Jyk7XG4gICAgdGhpcy5ieUhhc2guc2V0KGhhc2hUb2tlbih0b2tlbiksIHsgYWN0b3JJZCwgaXNBZG1pbjogZmFsc2UgfSk7XG4gICAgdGhpcy5zYXZlKCk7XG4gICAgcmV0dXJuIHRva2VuO1xuICB9XG5cbiAgcmVzb2x2ZSh0b2tlbjogc3RyaW5nKTogUmVzb2x2ZWRUb2tlbiB8IG51bGwge1xuICAgIGNvbnN0IHJlY29yZCA9IHRoaXMuYnlIYXNoLmdldChoYXNoVG9rZW4odG9rZW4pKTtcbiAgICByZXR1cm4gcmVjb3JkID8geyAuLi5yZWNvcmQgfSA6IG51bGw7XG4gIH1cblxuICBwcml2YXRlIHNhdmUoKTogdm9pZCB7XG4gICAgaWYgKHRoaXMucGVyc2lzdFBhdGggPT09IHVuZGVmaW5lZCkgcmV0dXJuO1xuICAgIGNvbnN0IHNoYXBlOiBQZXJzaXN0U2hhcGUgPSB7XG4gICAgICB2ZXJzaW9uOiAxLFxuICAgICAgdG9rZW5zOiB7fSxcbiAgICAgIC4uLih0aGlzLmFkbWluQWN0b3JJZCAhPT0gdW5kZWZpbmVkID8geyBhZG1pbkFjdG9ySWQ6IHRoaXMuYWRtaW5BY3RvcklkIH0gOiB7fSksXG4gICAgfTtcbiAgICBmb3IgKGNvbnN0IFtoYXNoLCByZWNvcmRdIG9mIHRoaXMuYnlIYXNoKSB7XG4gICAgICAvLyBBZG1pbiBib290c3RyYXAgZW50cmllcyBhcmUgY29uZmlndXJhdGlvbjsgcGVyc2lzdCBvbmx5IGlzc3VlZCB0b2tlbnMuXG4gICAgICBpZiAocmVjb3JkLmlzQWRtaW4pIGNvbnRpbnVlO1xuICAgICAgc2hhcGUudG9rZW5zW2hhc2hdID0geyAuLi5yZWNvcmQgfTtcbiAgICB9XG4gICAgbWtkaXJTeW5jKGRpcm5hbWUodGhpcy5wZXJzaXN0UGF0aCksIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xuICAgIHdyaXRlRmlsZVN5bmModGhpcy5wZXJzaXN0UGF0aCwgSlNPTi5zdHJpbmdpZnkoc2hhcGUsIG51bGwsIDIpLCAndXRmOCcpO1xuICB9XG59XG4iLCAiLyoqXG4gKiBGYXN0aWZ5IEhUVFAgYWRhcHRlcjogUE9TVCAvcnBjLzxjb21tYW5kPiBcdTIwMTQgYSB0aGluIHBhcnNlciBpbiBmcm9udCBvZiB0aGVcbiAqIGNvbW1hbmQgYnVzLiBFdmVyeSByZWplY3Rpb24gY3Jvc3NlcyB0aGUgd2lyZSBhcyB0aGUgY29udHJhY3RzIGVudmVsb3BlLFxuICogc3RhdHVzLW1hcHBlZCBieSBIVFRQX1NUQVRVUyBzbyBlcnJvciBzZW1hbnRpY3Mgc3Vydml2ZSB0aGUgdHJhbnNwb3J0LlxuICovXG5pbXBvcnQgRmFzdGlmeSwgeyB0eXBlIEZhc3RpZnlJbnN0YW5jZSwgdHlwZSBGYXN0aWZ5UmVxdWVzdCB9IGZyb20gJ2Zhc3RpZnknO1xuaW1wb3J0IHtcbiAgQ29uZmxpY3RFcnJvcixcbiAgR3VhcmRGYWlsZWRFcnJvcixcbiAgSW52YWxpZFRyYW5zaXRpb25FcnJvcixcbiAgUGVybWlzc2lvbkRlbmllZEVycm9yLFxuICBTdG9yaWVzVmFsaWRhdGlvbkVycm9yLFxuICB0eXBlIFNwaW5lRW5naW5lLFxufSBmcm9tICdAb2Focy9jb3JlJztcbmltcG9ydCB7XG4gIENPTU1BTkRfTUFQLFxuICBIVFRQX1NUQVRVUyxcbiAgdHlwZSBBY3RvckNvbnRleHQsXG4gIHR5cGUgRXJyb3JFbnZlbG9wZSxcbn0gZnJvbSAnQG9haHMvY29udHJhY3RzJztcblxuaW1wb3J0IHR5cGUgeyBUb2tlblN0b3JlIH0gZnJvbSAnLi9hdXRoLmpzJztcbmltcG9ydCB7IGNyZWF0ZUNvbW1hbmRCdXMgfSBmcm9tICcuL2J1cy5qcyc7XG5pbXBvcnQgeyByZWdpc3Rlck1jcFJvdXRlIH0gZnJvbSAnLi9tY3AuanMnO1xuaW1wb3J0IHsgcG9sbGluZ0V2ZW50VGFpbCwgcmVnaXN0ZXJFdmVudFN0cmVhbSwgdHlwZSBFdmVudFN0cmVhbU9wdGlvbnMgfSBmcm9tICcuL3NzZS5qcyc7XG5pbXBvcnQgeyByZWdpc3RlclVpUm91dGVzIH0gZnJvbSAnLi91aS5qcyc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgQnVpbGRTZXJ2ZXJPcHRpb25zIHtcbiAgZW5naW5lOiBTcGluZUVuZ2luZTtcbiAgdG9rZW5TdG9yZTogVG9rZW5TdG9yZTtcbiAgLyoqIEJvb3RzdHJhcCBhZG1pbiBjcmVkZW50aWFsIFx1MjAxNCBwYXNzZWQgaW4sIG5ldmVyIHJlYWQgZnJvbSBlbnYgaGVyZS4gKi9cbiAgYWRtaW5Ub2tlbjogc3RyaW5nO1xuICAvKiogU1NFIHJlbGF5IGtub2JzIChwb2xsL2hlYXJ0YmVhdCBpbnRlcnZhbHMpIFx1MjAxNCBkZWZhdWx0cyBhcmUgcHJvZHVjdGlvbiB2YWx1ZXMuICovXG4gIGV2ZW50U3RyZWFtPzogRXZlbnRTdHJlYW1PcHRpb25zO1xufVxuXG4vKiogTWFwIGEgdGhyb3duIGNvcmUgZXJyb3Igb250byB0aGUgd2lyZSBlcnJvciB0YXhvbm9teS4gKi9cbmV4cG9ydCBmdW5jdGlvbiBlcnJvck5hbWUoZXJyb3I6IHVua25vd24pOiBFcnJvckVudmVsb3BlWydlcnJvciddWyduYW1lJ10ge1xuICBpZiAoZXJyb3IgaW5zdGFuY2VvZiBQZXJtaXNzaW9uRGVuaWVkRXJyb3IpIHJldHVybiAnUGVybWlzc2lvbkRlbmllZEVycm9yJztcbiAgaWYgKGVycm9yIGluc3RhbmNlb2YgQ29uZmxpY3RFcnJvcikgcmV0dXJuICdDb25mbGljdEVycm9yJztcbiAgaWYgKGVycm9yIGluc3RhbmNlb2YgR3VhcmRGYWlsZWRFcnJvcikgcmV0dXJuICdHdWFyZEZhaWxlZEVycm9yJztcbiAgaWYgKGVycm9yIGluc3RhbmNlb2YgSW52YWxpZFRyYW5zaXRpb25FcnJvcikgcmV0dXJuICdJbnZhbGlkVHJhbnNpdGlvbkVycm9yJztcbiAgaWYgKGVycm9yIGluc3RhbmNlb2YgU3Rvcmllc1ZhbGlkYXRpb25FcnJvcikgcmV0dXJuICdTdG9yaWVzVmFsaWRhdGlvbkVycm9yJztcbiAgcmV0dXJuICdFcnJvcic7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBlcnJvckVudmVsb3BlKGVycm9yOiB1bmtub3duKTogRXJyb3JFbnZlbG9wZSB7XG4gIHJldHVybiB7XG4gICAgb2s6IGZhbHNlLFxuICAgIGVycm9yOiB7XG4gICAgICBuYW1lOiBlcnJvck5hbWUoZXJyb3IpLFxuICAgICAgbWVzc2FnZTogZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpLFxuICAgIH0sXG4gIH07XG59XG5cbi8qKlxuICogUGhhc2UgMiBib290c3RyYXAgKHJvYWRtYXAgXHUwMEE3Myk6IHRoZSBhZG1pbiB0b2tlbiBtdXN0IHJlc29sdmUgdG8gYSBSRUFMXG4gKiBlbmdpbmUgYWN0b3IgaG9sZGluZyBnb3Zlcm5hbmNlIHJvbGUgJ2FkbWluJyBcdTIwMTQgZ2F0ZWQgZW50aXRsZW1lbnQgd3JpdGVzXG4gKiAoYXNzaWduX3JvbGUvc2V0X3BsYW4vc2V0XypfcG9saWN5L1x1MjAyNikgYXJlIGF1dGhvcml6ZWQgYnkgdGhlIEVOR0lORSBmcm9tXG4gKiB0aGF0IHJvbGUsIG5ldmVyIGJ5IHRoZSB0cmFuc3BvcnQncyBpc0FkbWluIGZsYWcuIFRoZSBtYXBwaW5nIHBlcnNpc3RzIGluXG4gKiB0aGUgVG9rZW5TdG9yZSwgc28gYSBgLS1kYXRhYCByZXN0YXJ0IHJldXNlcyB0aGUgc2FtZSAnV29ya3NwYWNlIEFkbWluJ1xuICogYWN0b3I7IHdoZW4gdGhlIGVuZ2luZSBjYW5ub3QgY29uZmlybSB0aGUgcGVyc2lzdGVkIHJvbGUgKGZyZXNoIGVuZ2luZSwgb3JcbiAqIGEgcGVyc2lzdGVuY2UgbGF5ZXIgdGhhdCBwcmVkYXRlcyBQaGFzZSAyKSwgYSBmcmVzaCBib290c3RyYXAgYWN0b3IgaXNcbiAqIGNyZWF0ZWQgaW5zdGVhZC5cbiAqL1xuZnVuY3Rpb24gZW5zdXJlQm9vdHN0cmFwQWRtaW5BY3RvcihlbmdpbmU6IFNwaW5lRW5naW5lLCB0b2tlblN0b3JlOiBUb2tlblN0b3JlKTogc3RyaW5nIHtcbiAgY29uc3QgcGVyc2lzdGVkID0gdG9rZW5TdG9yZS5nZXRBZG1pbkFjdG9ySWQoKTtcbiAgaWYgKHBlcnNpc3RlZCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgdHJ5IHtcbiAgICAgIGlmIChlbmdpbmUuZ2V0R292ZXJuYW5jZVJvbGUocGVyc2lzdGVkKSA9PT0gJ2FkbWluJykgcmV0dXJuIHBlcnNpc3RlZDtcbiAgICB9IGNhdGNoIHtcbiAgICAgIC8vIGZhbGwgdGhyb3VnaDogdGhlIGVuZ2luZSBjYW5ub3Qgdm91Y2ggZm9yIHRoZSBwZXJzaXN0ZWQgbWFwcGluZ1xuICAgIH1cbiAgfVxuICBjb25zdCBhY3RvciA9IGVuZ2luZS5jcmVhdGVBY3Rvcih7XG4gICAgdHlwZTogJ3VzZXInLFxuICAgIGRpc3BsYXlOYW1lOiAnV29ya3NwYWNlIEFkbWluJyxcbiAgICBnb3Zlcm5hbmNlUm9sZTogJ2FkbWluJyxcbiAgfSk7XG4gIHRva2VuU3RvcmUuc2V0QWRtaW5BY3RvcklkKGFjdG9yLmlkKTtcbiAgcmV0dXJuIGFjdG9yLmlkO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gYnVpbGRTZXJ2ZXIob3B0aW9uczogQnVpbGRTZXJ2ZXJPcHRpb25zKTogUHJvbWlzZTxGYXN0aWZ5SW5zdGFuY2U+IHtcbiAgY29uc3QgeyBlbmdpbmUsIHRva2VuU3RvcmUsIGFkbWluVG9rZW4gfSA9IG9wdGlvbnM7XG4gIHRva2VuU3RvcmUuYm9vdHN0cmFwQWRtaW4oYWRtaW5Ub2tlbiwgZW5zdXJlQm9vdHN0cmFwQWRtaW5BY3RvcihlbmdpbmUsIHRva2VuU3RvcmUpKTtcbiAgY29uc3QgYnVzID0gY3JlYXRlQ29tbWFuZEJ1cyhlbmdpbmUsIHRva2VuU3RvcmUpO1xuXG4gIGNvbnN0IGFwcCA9IEZhc3RpZnkoeyBsb2dnZXI6IGZhbHNlIH0pO1xuXG4gIGNvbnN0IGF1dGhlbnRpY2F0ZSA9IChyZXF1ZXN0OiBGYXN0aWZ5UmVxdWVzdCk6IEFjdG9yQ29udGV4dCB8IG51bGwgPT4ge1xuICAgIGNvbnN0IGhlYWRlciA9IHJlcXVlc3QuaGVhZGVycy5hdXRob3JpemF0aW9uO1xuICAgIGlmICh0eXBlb2YgaGVhZGVyICE9PSAnc3RyaW5nJyB8fCAhaGVhZGVyLnN0YXJ0c1dpdGgoJ0JlYXJlciAnKSkgcmV0dXJuIG51bGw7XG4gICAgY29uc3QgcmVzb2x2ZWQgPSB0b2tlblN0b3JlLnJlc29sdmUoaGVhZGVyLnNsaWNlKCdCZWFyZXIgJy5sZW5ndGgpLnRyaW0oKSk7XG4gICAgcmV0dXJuIHJlc29sdmVkID09PSBudWxsID8gbnVsbCA6IHsgYWN0b3JJZDogcmVzb2x2ZWQuYWN0b3JJZCwgaXNBZG1pbjogcmVzb2x2ZWQuaXNBZG1pbiB9O1xuICB9O1xuXG4gIGFwcC5nZXQoJy9oZWFsdGh6JywgYXN5bmMgKCkgPT4gKHsgb2s6IHRydWUgfSkpO1xuXG4gIGFwcC5wb3N0KCcvcnBjLzpjb21tYW5kJywgYXN5bmMgKHJlcXVlc3QsIHJlcGx5KSA9PiB7XG4gICAgY29uc3QgY3R4ID0gYXV0aGVudGljYXRlKHJlcXVlc3QpO1xuICAgIGlmIChjdHggPT09IG51bGwpIHtcbiAgICAgIHJldHVybiByZXBseS5jb2RlKDQwMSkuc2VuZCh7XG4gICAgICAgIG9rOiBmYWxzZSxcbiAgICAgICAgZXJyb3I6IHsgbmFtZTogJ0Vycm9yJywgbWVzc2FnZTogJ3VuYXV0aG9yaXplZDogbWlzc2luZyBvciBpbnZhbGlkIGJlYXJlciB0b2tlbicgfSxcbiAgICAgIH0gc2F0aXNmaWVzIEVycm9yRW52ZWxvcGUpO1xuICAgIH1cbiAgICBjb25zdCB7IGNvbW1hbmQgfSA9IHJlcXVlc3QucGFyYW1zIGFzIHsgY29tbWFuZDogc3RyaW5nIH07XG4gICAgaWYgKCFDT01NQU5EX01BUC5oYXMoY29tbWFuZCkpIHtcbiAgICAgIHJldHVybiByZXBseS5jb2RlKDQwNCkuc2VuZCh7XG4gICAgICAgIG9rOiBmYWxzZSxcbiAgICAgICAgZXJyb3I6IHsgbmFtZTogJ0Vycm9yJywgbWVzc2FnZTogYHVua25vd24gY29tbWFuZDogJHtjb21tYW5kfWAgfSxcbiAgICAgIH0gc2F0aXNmaWVzIEVycm9yRW52ZWxvcGUpO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgYnVzLmV4ZWN1dGUoY29tbWFuZCwgcmVxdWVzdC5ib2R5ID8/IHt9LCBjdHgpO1xuICAgICAgcmV0dXJuIHJlcGx5LmNvZGUoMjAwKS5zZW5kKHsgb2s6IHRydWUsIHJlc3VsdCB9KTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgY29uc3QgZW52ZWxvcGUgPSBlcnJvckVudmVsb3BlKGVycm9yKTtcbiAgICAgIHJldHVybiByZXBseS5jb2RlKEhUVFBfU1RBVFVTW2VudmVsb3BlLmVycm9yLm5hbWVdKS5zZW5kKGVudmVsb3BlKTtcbiAgICB9XG4gIH0pO1xuXG4gIHJlZ2lzdGVyTWNwUm91dGUoYXBwLCBidXMsIGF1dGhlbnRpY2F0ZSk7XG4gIHJlZ2lzdGVyRXZlbnRTdHJlYW0oYXBwLCBwb2xsaW5nRXZlbnRUYWlsKGVuZ2luZSksIGF1dGhlbnRpY2F0ZSwgb3B0aW9ucy5ldmVudFN0cmVhbSA/PyB7fSk7XG4gIHJlZ2lzdGVyVWlSb3V0ZXMoYXBwKTtcblxuICByZXR1cm4gYXBwO1xufVxuIiwgIi8qKlxuICogVGhlIGNvbW1hbmQgYnVzIFx1MjAxNCB0aGUgT05FIHBsYWNlIGNvbW1hbmRzIGV4ZWN1dGUgKHJvYWRtYXAgXHUwMEE3MC4xOiBubyB3cml0ZXNcbiAqIG91dHNpZGUgdGhlIGNvbW1hbmQgYnVzKS4gSFRUUCAoL3JwYy86Y29tbWFuZCkgYW5kIE1DUCAob2Foc18qIHRvb2xzKSBhcmVcbiAqIHRoaW4gcGFyc2VycyBpbiBmcm9udCBvZiBleGVjdXRlKCk7IG5laXRoZXIgY2FycmllcyBpdHMgb3duIGxvZ2ljLlxuICpcbiAqIEFjdG9yIGlkZW50aXR5IEFMV0FZUyBjb21lcyBmcm9tIHRoZSBhdXRoZW50aWNhdGVkIGNvbnRleHQsIG5ldmVyIGZyb20gdGhlXG4gKiByZXF1ZXN0IGJvZHkgXHUyMDE0IGEgbGlmZWN5Y2xlIGNvbW1hbmQgY2FuIG9ubHkgYWN0IGFzIHRoZSBhY3RvciB3aG9zZSB0b2tlblxuICogc2lnbmVkIHRoZSByZXF1ZXN0LlxuICovXG5pbXBvcnQge1xuICBHdWFyZEZhaWxlZEVycm9yLFxuICBQZXJtaXNzaW9uRGVuaWVkRXJyb3IsXG4gIHR5cGUgQWN0b3JUeXBlLFxuICB0eXBlIEFnZW50Sm9iLFxuICB0eXBlIEJsb2NrZWRSZWFzb24sXG4gIHR5cGUgRXZpZGVuY2UsXG4gIHR5cGUgR2F0ZUNvZGUsXG4gIHR5cGUgR292ZXJuYW5jZVJvbGUsXG4gIHR5cGUgTWVtb3J5S2luZCxcbiAgdHlwZSBQZXJtaXNzaW9uLFxuICB0eXBlIFBsYW5Db2RlLFxuICB0eXBlIFNwaW5lRW5naW5lLFxuICB0eXBlIFRocmVhZEtpbmQsXG4gIHR5cGUgVGhyZWFkVmlzaWJpbGl0eSxcbiAgdHlwZSBXb3JrSXRlbUtpbmQsXG4gIHR5cGUgV29ya0l0ZW1TdGF0ZSxcbn0gZnJvbSAnQG9haHMvY29yZSc7XG5pbXBvcnQgeyBDT01NQU5EX01BUCwgdHlwZSBBY3RvckNvbnRleHQsIHR5cGUgQ29tbWFuZEJ1cywgdHlwZSBDb21tYW5kTmFtZSB9IGZyb20gJ0BvYWhzL2NvbnRyYWN0cyc7XG5cbmltcG9ydCB0eXBlIHsgVG9rZW5TdG9yZSB9IGZyb20gJy4vYXV0aC5qcyc7XG5cbi8vIFBhcnNlZC1pbnB1dCBzaGFwZXMgKG1pcnJvciB0aGUgem9kIHNjaGVtYXMgaW4gQG9haHMvY29udHJhY3RzOyB0aGUgem9kXG4vLyBwYXJzZSBpbiBleGVjdXRlKCkgaXMgdGhlIHJ1bnRpbWUgZ3VhcmFudGVlLCB0aGVzZSBhcmUgdGhlIHN0YXRpYyB2aWV3KS5cbmludGVyZmFjZSBDcmVhdGVBY3RvckluIHsgdHlwZTogJ3VzZXInIHwgJ2FnZW50JzsgZGlzcGxheU5hbWU6IHN0cmluZzsgZ292ZXJuYW5jZVJvbGU/OiBHb3Zlcm5hbmNlUm9sZSB8IHVuZGVmaW5lZCB9XG5pbnRlcmZhY2UgR3JhbnRJbiB7IGFjdG9ySWQ6IHN0cmluZzsgcGVybWlzc2lvbjogc3RyaW5nOyBzY29wZT86IHN0cmluZyB8IHVuZGVmaW5lZCB9XG5pbnRlcmZhY2UgUm9sZUluIHsgYWN0b3JJZDogc3RyaW5nOyByb2xlQ29kZTogc3RyaW5nIH1cbmludGVyZmFjZSBMaXN0Um9sZUFzc2lnbm1lbnRzSW4geyBhY3RvcklkPzogc3RyaW5nIHwgdW5kZWZpbmVkIH1cbmludGVyZmFjZSBTZXRHb3Zlcm5hbmNlUm9sZUluIHsgYWN0b3JJZDogc3RyaW5nOyByb2xlOiBHb3Zlcm5hbmNlUm9sZSB9XG5pbnRlcmZhY2UgU2V0UGxhbkluIHsgcGxhbjogUGxhbkNvZGUgfVxuaW50ZXJmYWNlIFNldFdvcmtzcGFjZVBvbGljeUluIHtcbiAgcG9saWN5OiB7IGFnZW50R2F0ZUFwcHJvdmFscz86IGJvb2xlYW4gfCB1bmRlZmluZWQ7IGFnZW50U2VsZkRpc3BhdGNoPzogYm9vbGVhbiB8IHVuZGVmaW5lZCB9O1xufVxuaW50ZXJmYWNlIFNldEdhdGVQb2xpY3lJbiB7XG4gIGdhdGU6IEdhdGVDb2RlO1xuICBwb2xpY3k6IHsgbWluQXBwcm92YWxzPzogbnVtYmVyIHwgdW5kZWZpbmVkOyByZXF1aXJlZEFjdG9yVHlwZXM/OiBBY3RvclR5cGVbXSB8IHVuZGVmaW5lZCB9O1xufVxuaW50ZXJmYWNlIEF1dGh6RXhwbGFpbkluIHsgYWN0b3JJZDogc3RyaW5nOyBwZXJtaXNzaW9uOiBzdHJpbmcgfVxuaW50ZXJmYWNlIEltcG9ydFN0b3JpZXNJbiB7IGZlYXR1cmVJZDogc3RyaW5nOyB5YW1sOiBzdHJpbmcgfVxuaW50ZXJmYWNlIENyZWF0ZVdvcmtJdGVtSW4ge1xuICBmZWF0dXJlSWQ6IHN0cmluZztcbiAgZXh0ZXJuYWxLZXk6IHN0cmluZztcbiAgdGl0bGU6IHN0cmluZztcbiAga2luZD86IFdvcmtJdGVtS2luZCB8IHVuZGVmaW5lZDtcbiAgc3BlY0NoZWNrcG9pbnQ/OiBib29sZWFuIHwgdW5kZWZpbmVkO1xuICBkb25lQ2hlY2twb2ludD86IGJvb2xlYW4gfCB1bmRlZmluZWQ7XG4gIGludm9rZURldldpdGg/OiBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gIGRlcGVuZHNPbj86IHN0cmluZ1tdIHwgdW5kZWZpbmVkO1xufVxuaW50ZXJmYWNlIENsYWltVGFza0luIHsgd29ya0l0ZW1JZDogc3RyaW5nOyB0dGxNcz86IG51bWJlciB8IHVuZGVmaW5lZCB9XG5pbnRlcmZhY2UgSGVhcnRiZWF0SW4geyBjbGFpbUlkOiBzdHJpbmcgfVxuaW50ZXJmYWNlIFJlbGVhc2VDbGFpbUluIHsgY2xhaW1JZDogc3RyaW5nOyByZWFzb24/OiBzdHJpbmcgfCB1bmRlZmluZWQgfVxuaW50ZXJmYWNlIEFkdmFuY2VJbiB7IHdvcmtJdGVtSWQ6IHN0cmluZzsgdG86IFdvcmtJdGVtU3RhdGU7IGZlbmNpbmdUb2tlbj86IG51bWJlciB8IHVuZGVmaW5lZDsgaWRlbXBvdGVuY3lLZXk/OiBzdHJpbmcgfCB1bmRlZmluZWQgfVxuaW50ZXJmYWNlIEJsb2NrSW4geyB3b3JrSXRlbUlkOiBzdHJpbmc7IHJlYXNvbjogQmxvY2tlZFJlYXNvbjsgZmVuY2luZ1Rva2VuPzogbnVtYmVyIHwgdW5kZWZpbmVkIH1cbmludGVyZmFjZSBXb3JrSXRlbUluIHsgd29ya0l0ZW1JZDogc3RyaW5nIH1cbmludGVyZmFjZSBTdWJtaXRFdmlkZW5jZUluIHsgd29ya0l0ZW1JZDogc3RyaW5nOyBldmlkZW5jZTogRXZpZGVuY2U7IGZlbmNpbmdUb2tlbj86IG51bWJlciB8IHVuZGVmaW5lZCB9XG5pbnRlcmZhY2UgQXBwcm92ZUdhdGVJbiB7IHdvcmtJdGVtSWQ6IHN0cmluZzsgZ2F0ZTogR2F0ZUNvZGU7IHBpbm5lZFZlcmlmaWNhdGlvbj86IHN0cmluZ1tdIHwgdW5kZWZpbmVkIH1cbmludGVyZmFjZSBSZWplY3RHYXRlSW4geyB3b3JrSXRlbUlkOiBzdHJpbmc7IGdhdGU6IEdhdGVDb2RlIH1cbmludGVyZmFjZSBGZWF0dXJlSW4geyBmZWF0dXJlSWQ6IHN0cmluZyB9XG5pbnRlcmZhY2UgTGlzdFdvcmtJdGVtc0luIHsgc3RhdGU/OiBXb3JrSXRlbVN0YXRlIHwgdW5kZWZpbmVkOyBmZWF0dXJlSWQ/OiBzdHJpbmcgfCB1bmRlZmluZWQ7IGNsYWltYWJsZT86IGJvb2xlYW4gfCB1bmRlZmluZWQgfVxuaW50ZXJmYWNlIFF1ZXJ5RXZlbnRzSW4geyBzdHJlYW1JZD86IHN0cmluZyB8IHVuZGVmaW5lZCB9XG5pbnRlcmZhY2UgQ3JlYXRlVGhyZWFkSW4ge1xuICBraW5kOiBUaHJlYWRLaW5kO1xuICBmZWF0dXJlSWQ/OiBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gIHdvcmtJdGVtSWQ/OiBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gIHZpc2liaWxpdHk/OiBUaHJlYWRWaXNpYmlsaXR5IHwgdW5kZWZpbmVkO1xufVxuaW50ZXJmYWNlIEFkZFRocmVhZFBhcnRpY2lwYW50SW4geyB0aHJlYWRJZDogc3RyaW5nOyBhY3RvcklkOiBzdHJpbmcgfVxuaW50ZXJmYWNlIFBvc3RNZXNzYWdlSW4ge1xuICB0aHJlYWRJZDogc3RyaW5nO1xuICBib2R5OiBzdHJpbmc7XG4gIHJlcGx5VG8/OiBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gIG1lbnRpb25zPzogc3RyaW5nW10gfCB1bmRlZmluZWQ7XG59XG5pbnRlcmZhY2UgTGlzdFRocmVhZHNJbiB7IGZlYXR1cmVJZD86IHN0cmluZyB8IHVuZGVmaW5lZDsgd29ya0l0ZW1JZD86IHN0cmluZyB8IHVuZGVmaW5lZCB9XG5pbnRlcmZhY2UgTGlzdE1lc3NhZ2VzSW4geyB0aHJlYWRJZDogc3RyaW5nOyBzaW5jZVNlcT86IG51bWJlciB8IHVuZGVmaW5lZCB9XG5pbnRlcmZhY2UgTGlzdE1lbnRpb25zSW4geyBtZXNzYWdlSWQ6IHN0cmluZyB9XG5pbnRlcmZhY2UgTGlzdE5vdGlmaWNhdGlvbnNJbiB7IHVucmVhZE9ubHk/OiBib29sZWFuIHwgdW5kZWZpbmVkIH1cbmludGVyZmFjZSBNYXJrTm90aWZpY2F0aW9uUmVhZEluIHsgbm90aWZpY2F0aW9uSWQ6IHN0cmluZyB9XG5pbnRlcmZhY2UgTGlzdEFnZW50Sm9ic0luIHsgYWdlbnRBY3RvcklkPzogc3RyaW5nIHwgdW5kZWZpbmVkOyBzdGF0dXM/OiBBZ2VudEpvYlsnc3RhdHVzJ10gfCB1bmRlZmluZWQgfVxuaW50ZXJmYWNlIENvbXBsZXRlQWdlbnRKb2JJbiB7IGpvYklkOiBzdHJpbmc7IHN0YXR1czogJ2RvbmUnIHwgJ2Jsb2NrZWQnOyBub3RlPzogc3RyaW5nIHwgdW5kZWZpbmVkIH1cbmludGVyZmFjZSBSZWNvbmNpbGVJbiB7IGZpbGVzOiBBcnJheTx7IHdvcmtJdGVtSWQ6IHN0cmluZzsgZnJvbnRtYXR0ZXJTdGF0dXM6IHN0cmluZyB9PiB9XG5pbnRlcmZhY2UgQXBwZW5kQWdlbnRNZW1vcnlJbiB7IGtpbmQ6IE1lbW9yeUtpbmQ7IGNvbnRlbnQ6IHN0cmluZzsgc291cmNlVGhyZWFkSWQ/OiBzdHJpbmcgfCB1bmRlZmluZWQgfVxuaW50ZXJmYWNlIFNlYXJjaEFnZW50TWVtb3J5SW4ge1xuICBjb250ZXh0VGhyZWFkSWQ/OiBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gIGtpbmQ/OiBNZW1vcnlLaW5kIHwgdW5kZWZpbmVkO1xuICBxdWVyeT86IHN0cmluZyB8IHVuZGVmaW5lZDtcbn1cblxuLyoqIENvbXBhY3Qgb25lLWxpbmUgc3VtbWFyeSBvZiB6b2QgaXNzdWVzIChkdWNrLXR5cGVkOiB6b2QgY29waWVzIG1heSBkaWZmZXIpLiAqL1xuZnVuY3Rpb24gem9kTWVzc2FnZShlcnJvcjogdW5rbm93bik6IHN0cmluZyB7XG4gIGNvbnN0IGlzc3VlcyA9IChlcnJvciBhcyB7IGlzc3Vlcz86IEFycmF5PHsgcGF0aD86IEFycmF5PHN0cmluZyB8IG51bWJlcj47IG1lc3NhZ2U/OiBzdHJpbmcgfT4gfSlcbiAgICAuaXNzdWVzO1xuICBpZiAoIUFycmF5LmlzQXJyYXkoaXNzdWVzKSkgcmV0dXJuIFN0cmluZyhlcnJvcik7XG4gIHJldHVybiBpc3N1ZXNcbiAgICAubWFwKChpc3N1ZSkgPT4ge1xuICAgICAgY29uc3QgcGF0aCA9IGlzc3VlLnBhdGggJiYgaXNzdWUucGF0aC5sZW5ndGggPiAwID8gaXNzdWUucGF0aC5qb2luKCcuJykgOiAnKHJvb3QpJztcbiAgICAgIHJldHVybiBgJHtwYXRofTogJHtpc3N1ZS5tZXNzYWdlID8/ICdpbnZhbGlkJ31gO1xuICAgIH0pXG4gICAgLmpvaW4oJzsgJyk7XG59XG5cbmZ1bmN0aW9uIHJlcXVpcmVBZG1pbihjdHg6IEFjdG9yQ29udGV4dCwgY29tbWFuZDogc3RyaW5nKTogdm9pZCB7XG4gIGlmICghY3R4LmlzQWRtaW4pIHtcbiAgICB0aHJvdyBuZXcgUGVybWlzc2lvbkRlbmllZEVycm9yKGBhZG1pbjoke2NvbW1hbmR9YCBhcyBQZXJtaXNzaW9uLCBjdHguYWN0b3JJZCk7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUNvbW1hbmRCdXMoZW5naW5lOiBTcGluZUVuZ2luZSwgdG9rZW5zOiBUb2tlblN0b3JlKTogQ29tbWFuZEJ1cyB7XG4gIGFzeW5jIGZ1bmN0aW9uIGV4ZWN1dGUoY29tbWFuZDogc3RyaW5nLCBpbnB1dDogdW5rbm93biwgY3R4OiBBY3RvckNvbnRleHQpOiBQcm9taXNlPHVua25vd24+IHtcbiAgICBjb25zdCBkZWYgPSBDT01NQU5EX01BUC5nZXQoY29tbWFuZCk7XG4gICAgaWYgKCFkZWYpIHRocm93IG5ldyBHdWFyZEZhaWxlZEVycm9yKGB1bmtub3duIGNvbW1hbmQ6ICR7Y29tbWFuZH1gKTtcblxuICAgIGNvbnN0IHBhcnNlZFJlc3VsdCA9IGRlZi5pbnB1dC5zYWZlUGFyc2UoaW5wdXQgPz8ge30pO1xuICAgIGlmICghcGFyc2VkUmVzdWx0LnN1Y2Nlc3MpIHtcbiAgICAgIHRocm93IG5ldyBHdWFyZEZhaWxlZEVycm9yKGBpbnZhbGlkIGlucHV0IGZvciAke2NvbW1hbmR9OiAke3pvZE1lc3NhZ2UocGFyc2VkUmVzdWx0LmVycm9yKX1gKTtcbiAgICB9XG4gICAgY29uc3QgcGFyc2VkOiB1bmtub3duID0gcGFyc2VkUmVzdWx0LmRhdGE7XG5cbiAgICBzd2l0Y2ggKGNvbW1hbmQgYXMgQ29tbWFuZE5hbWUpIHtcbiAgICAgIC8vIC0tIHNldHVwIC8gYWRtaW4gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgIGNhc2UgJ2NyZWF0ZV9hY3Rvcic6IHtcbiAgICAgICAgLy8gY3JlYXRlX2FjdG9yIHN0YXlzIGFkbWluLXRva2VuLWdhdGVkIChib290c3RyYXAgcGx1bWJpbmcpLCB3aGljaFxuICAgICAgICAvLyBhbHNvIG1ha2VzIGl0IHRoZSBvbmx5IGN0eCBhbGxvd2VkIHRvIHBhc3MgZ292ZXJuYW5jZVJvbGUuXG4gICAgICAgIHJlcXVpcmVBZG1pbihjdHgsIGNvbW1hbmQpO1xuICAgICAgICBjb25zdCBwID0gcGFyc2VkIGFzIENyZWF0ZUFjdG9ySW47XG4gICAgICAgIGNvbnN0IGFjdG9yID0gZW5naW5lLmNyZWF0ZUFjdG9yKHtcbiAgICAgICAgICB0eXBlOiBwLnR5cGUsXG4gICAgICAgICAgZGlzcGxheU5hbWU6IHAuZGlzcGxheU5hbWUsXG4gICAgICAgICAgLi4uKHAuZ292ZXJuYW5jZVJvbGUgIT09IHVuZGVmaW5lZCA/IHsgZ292ZXJuYW5jZVJvbGU6IHAuZ292ZXJuYW5jZVJvbGUgfSA6IHt9KSxcbiAgICAgICAgfSk7XG4gICAgICAgIGNvbnN0IHRva2VuID0gdG9rZW5zLmlzc3VlKGFjdG9yLmlkKTtcbiAgICAgICAgcmV0dXJuIHsgYWN0b3IsIHRva2VuIH07XG4gICAgICB9XG4gICAgICBjYXNlICdncmFudF9wZXJtaXNzaW9uJzoge1xuICAgICAgICByZXF1aXJlQWRtaW4oY3R4LCBjb21tYW5kKTtcbiAgICAgICAgY29uc3QgcCA9IHBhcnNlZCBhcyBHcmFudEluO1xuICAgICAgICBlbmdpbmUuZ3JhbnQoe1xuICAgICAgICAgIGFjdG9ySWQ6IHAuYWN0b3JJZCxcbiAgICAgICAgICBwZXJtaXNzaW9uOiBwLnBlcm1pc3Npb24gYXMgUGVybWlzc2lvbixcbiAgICAgICAgICAuLi4ocC5zY29wZSAhPT0gdW5kZWZpbmVkID8geyBzY29wZTogcC5zY29wZSB9IDoge30pLFxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHsgZ3JhbnRlZDogdHJ1ZSB9O1xuICAgICAgfVxuICAgICAgY2FzZSAncmV2b2tlX3Blcm1pc3Npb24nOiB7XG4gICAgICAgIHJlcXVpcmVBZG1pbihjdHgsIGNvbW1hbmQpO1xuICAgICAgICBjb25zdCBwID0gcGFyc2VkIGFzIEdyYW50SW47XG4gICAgICAgIGVuZ2luZS5yZXZva2Uoe1xuICAgICAgICAgIGFjdG9ySWQ6IHAuYWN0b3JJZCxcbiAgICAgICAgICBwZXJtaXNzaW9uOiBwLnBlcm1pc3Npb24gYXMgUGVybWlzc2lvbixcbiAgICAgICAgICAuLi4ocC5zY29wZSAhPT0gdW5kZWZpbmVkID8geyBzY29wZTogcC5zY29wZSB9IDoge30pLFxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHsgcmV2b2tlZDogdHJ1ZSB9O1xuICAgICAgfVxuICAgICAgY2FzZSAnY3JlYXRlX2ZlYXR1cmUnOiB7XG4gICAgICAgIHJldHVybiBlbmdpbmUuY3JlYXRlRmVhdHVyZSh7IGFjdG9ySWQ6IGN0eC5hY3RvcklkIH0pO1xuICAgICAgfVxuICAgICAgY2FzZSAnY3JlYXRlX3dvcmtfaXRlbSc6IHtcbiAgICAgICAgLy8gQ3JlYXRvciBpZGVudGl0eSBmcm9tIGN0eDsga2luZCBkZWZhdWx0cyB0byAnY29kZScgaW4gdGhlIGVuZ2luZS5cbiAgICAgICAgY29uc3QgcCA9IHBhcnNlZCBhcyBDcmVhdGVXb3JrSXRlbUluO1xuICAgICAgICByZXR1cm4gZW5naW5lLmNyZWF0ZVdvcmtJdGVtKHtcbiAgICAgICAgICBmZWF0dXJlSWQ6IHAuZmVhdHVyZUlkLFxuICAgICAgICAgIGV4dGVybmFsS2V5OiBwLmV4dGVybmFsS2V5LFxuICAgICAgICAgIHRpdGxlOiBwLnRpdGxlLFxuICAgICAgICAgIGFjdG9ySWQ6IGN0eC5hY3RvcklkLFxuICAgICAgICAgIC4uLihwLmtpbmQgIT09IHVuZGVmaW5lZCA/IHsga2luZDogcC5raW5kIH0gOiB7fSksXG4gICAgICAgICAgLi4uKHAuc3BlY0NoZWNrcG9pbnQgIT09IHVuZGVmaW5lZCA/IHsgc3BlY0NoZWNrcG9pbnQ6IHAuc3BlY0NoZWNrcG9pbnQgfSA6IHt9KSxcbiAgICAgICAgICAuLi4ocC5kb25lQ2hlY2twb2ludCAhPT0gdW5kZWZpbmVkID8geyBkb25lQ2hlY2twb2ludDogcC5kb25lQ2hlY2twb2ludCB9IDoge30pLFxuICAgICAgICAgIC4uLihwLmludm9rZURldldpdGggIT09IHVuZGVmaW5lZCA/IHsgaW52b2tlRGV2V2l0aDogcC5pbnZva2VEZXZXaXRoIH0gOiB7fSksXG4gICAgICAgICAgLi4uKHAuZGVwZW5kc09uICE9PSB1bmRlZmluZWQgPyB7IGRlcGVuZHNPbjogcC5kZXBlbmRzT24gfSA6IHt9KSxcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICBjYXNlICdsaXN0X2FjdG9ycyc6IHtcbiAgICAgICAgcmV0dXJuIGVuZ2luZS5saXN0QWN0b3JzKCk7XG4gICAgICB9XG4gICAgICBjYXNlICdwcm92aXNpb25fcGVyc29uYXMnOiB7XG4gICAgICAgIC8vIEdhdGVkIGJ5IEVOR0lORSBnb3Zlcm5hbmNlIChyZXF1aXJlR292ZXJuYW5jZUFkbWluIG9uIGJ5QWN0b3JJZCkgXHUyMDE0XG4gICAgICAgIC8vIHRoZSBidXMgbmV2ZXIgcHJlLWNoZWNrcyBhZG1pbiBoZXJlLCBtaXJyb3JpbmcgdGhlIFx1MDBBNzMgZ3JvdXAuXG4gICAgICAgIHJldHVybiBlbmdpbmUucHJvdmlzaW9uUGVyc29uYXMoeyBieUFjdG9ySWQ6IGN0eC5hY3RvcklkIH0pO1xuICAgICAgfVxuXG4gICAgICAvLyAtLSBlbnRpdGxlbWVudHMgKFBoYXNlIDIsIHJvYWRtYXAgXHUwMEE3MykgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICAgLy8gTm8gcmVxdWlyZUFkbWluIGhlcmU6IGF1dGhvcml0eSBpcyBkZWNpZGVkIGJ5IHRoZSBFTkdJTkUgZnJvbSB0aGVcbiAgICAgIC8vIGNhbGxlcidzIGdvdmVybmFuY2Ugcm9sZSAoYnlBY3RvcklkID0gdGhlIGF1dGhlbnRpY2F0ZWQgYWN0b3IpLlxuICAgICAgY2FzZSAnYXNzaWduX3JvbGUnOiB7XG4gICAgICAgIGNvbnN0IHAgPSBwYXJzZWQgYXMgUm9sZUluO1xuICAgICAgICBlbmdpbmUuYXNzaWduUm9sZSh7IGFjdG9ySWQ6IHAuYWN0b3JJZCwgcm9sZUNvZGU6IHAucm9sZUNvZGUsIGJ5QWN0b3JJZDogY3R4LmFjdG9ySWQgfSk7XG4gICAgICAgIHJldHVybiB7IGFzc2lnbmVkOiB0cnVlIH07XG4gICAgICB9XG4gICAgICBjYXNlICdyZXZva2Vfcm9sZSc6IHtcbiAgICAgICAgY29uc3QgcCA9IHBhcnNlZCBhcyBSb2xlSW47XG4gICAgICAgIGVuZ2luZS5yZXZva2VSb2xlKHsgYWN0b3JJZDogcC5hY3RvcklkLCByb2xlQ29kZTogcC5yb2xlQ29kZSwgYnlBY3RvcklkOiBjdHguYWN0b3JJZCB9KTtcbiAgICAgICAgcmV0dXJuIHsgcmV2b2tlZDogdHJ1ZSB9O1xuICAgICAgfVxuICAgICAgY2FzZSAnbGlzdF9yb2xlX2Fzc2lnbm1lbnRzJzoge1xuICAgICAgICBjb25zdCBwID0gcGFyc2VkIGFzIExpc3RSb2xlQXNzaWdubWVudHNJbjtcbiAgICAgICAgcmV0dXJuIGVuZ2luZS5saXN0Um9sZUFzc2lnbm1lbnRzKHAuYWN0b3JJZCk7XG4gICAgICB9XG4gICAgICBjYXNlICdzZXRfZ292ZXJuYW5jZV9yb2xlJzoge1xuICAgICAgICBjb25zdCBwID0gcGFyc2VkIGFzIFNldEdvdmVybmFuY2VSb2xlSW47XG4gICAgICAgIGVuZ2luZS5zZXRHb3Zlcm5hbmNlUm9sZSh7IGFjdG9ySWQ6IHAuYWN0b3JJZCwgcm9sZTogcC5yb2xlLCBieUFjdG9ySWQ6IGN0eC5hY3RvcklkIH0pO1xuICAgICAgICByZXR1cm4geyBhY3RvcklkOiBwLmFjdG9ySWQsIHJvbGU6IHAucm9sZSB9O1xuICAgICAgfVxuICAgICAgY2FzZSAnc2V0X3BsYW4nOiB7XG4gICAgICAgIGNvbnN0IHAgPSBwYXJzZWQgYXMgU2V0UGxhbkluO1xuICAgICAgICBlbmdpbmUuc2V0UGxhbih7IHBsYW46IHAucGxhbiwgYnlBY3RvcklkOiBjdHguYWN0b3JJZCB9KTtcbiAgICAgICAgcmV0dXJuIHsgcGxhbjogZW5naW5lLmdldFBsYW4oKSB9O1xuICAgICAgfVxuICAgICAgY2FzZSAnc2V0X3dvcmtzcGFjZV9wb2xpY3knOiB7XG4gICAgICAgIGNvbnN0IHAgPSBwYXJzZWQgYXMgU2V0V29ya3NwYWNlUG9saWN5SW47XG4gICAgICAgIGVuZ2luZS5zZXRXb3Jrc3BhY2VQb2xpY3koe1xuICAgICAgICAgIHBvbGljeToge1xuICAgICAgICAgICAgLi4uKHAucG9saWN5LmFnZW50R2F0ZUFwcHJvdmFscyAhPT0gdW5kZWZpbmVkXG4gICAgICAgICAgICAgID8geyBhZ2VudEdhdGVBcHByb3ZhbHM6IHAucG9saWN5LmFnZW50R2F0ZUFwcHJvdmFscyB9XG4gICAgICAgICAgICAgIDoge30pLFxuICAgICAgICAgICAgLi4uKHAucG9saWN5LmFnZW50U2VsZkRpc3BhdGNoICE9PSB1bmRlZmluZWRcbiAgICAgICAgICAgICAgPyB7IGFnZW50U2VsZkRpc3BhdGNoOiBwLnBvbGljeS5hZ2VudFNlbGZEaXNwYXRjaCB9XG4gICAgICAgICAgICAgIDoge30pLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgYnlBY3RvcklkOiBjdHguYWN0b3JJZCxcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBlbmdpbmUuZ2V0V29ya3NwYWNlUG9saWN5KCk7XG4gICAgICB9XG4gICAgICBjYXNlICdzZXRfZ2F0ZV9wb2xpY3knOiB7XG4gICAgICAgIGNvbnN0IHAgPSBwYXJzZWQgYXMgU2V0R2F0ZVBvbGljeUluO1xuICAgICAgICBlbmdpbmUuc2V0R2F0ZVBvbGljeSh7XG4gICAgICAgICAgZ2F0ZTogcC5nYXRlLFxuICAgICAgICAgIHBvbGljeToge1xuICAgICAgICAgICAgLi4uKHAucG9saWN5Lm1pbkFwcHJvdmFscyAhPT0gdW5kZWZpbmVkID8geyBtaW5BcHByb3ZhbHM6IHAucG9saWN5Lm1pbkFwcHJvdmFscyB9IDoge30pLFxuICAgICAgICAgICAgLi4uKHAucG9saWN5LnJlcXVpcmVkQWN0b3JUeXBlcyAhPT0gdW5kZWZpbmVkXG4gICAgICAgICAgICAgID8geyByZXF1aXJlZEFjdG9yVHlwZXM6IFsuLi5wLnBvbGljeS5yZXF1aXJlZEFjdG9yVHlwZXNdIH1cbiAgICAgICAgICAgICAgOiB7fSksXG4gICAgICAgICAgfSxcbiAgICAgICAgICBieUFjdG9ySWQ6IGN0eC5hY3RvcklkLFxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHsgZ2F0ZTogcC5nYXRlLCBwb2xpY3k6IGVuZ2luZS5nZXRHYXRlUG9saWN5KHAuZ2F0ZSkgfTtcbiAgICAgIH1cbiAgICAgIGNhc2UgJ2F1dGh6X2V4cGxhaW4nOiB7XG4gICAgICAgIGNvbnN0IHAgPSBwYXJzZWQgYXMgQXV0aHpFeHBsYWluSW47XG4gICAgICAgIHJldHVybiBlbmdpbmUuYXV0aHpFeHBsYWluKHsgYWN0b3JJZDogcC5hY3RvcklkLCBwZXJtaXNzaW9uOiBwLnBlcm1pc3Npb24gYXMgUGVybWlzc2lvbiB9KTtcbiAgICAgIH1cbiAgICAgIGNhc2UgJ2ltcG9ydF9zdG9yaWVzJzoge1xuICAgICAgICBjb25zdCBwID0gcGFyc2VkIGFzIEltcG9ydFN0b3JpZXNJbjtcbiAgICAgICAgcmV0dXJuIGVuZ2luZS5pbXBvcnRTdG9yaWVzKHsgZmVhdHVyZUlkOiBwLmZlYXR1cmVJZCwgeWFtbDogcC55YW1sLCBhY3RvcklkOiBjdHguYWN0b3JJZCB9KTtcbiAgICAgIH1cblxuICAgICAgLy8gLS0gY2xhaW1zIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICBjYXNlICdjbGFpbV90YXNrJzoge1xuICAgICAgICBjb25zdCBwID0gcGFyc2VkIGFzIENsYWltVGFza0luO1xuICAgICAgICByZXR1cm4gZW5naW5lLmNsYWltVGFzayh7XG4gICAgICAgICAgd29ya0l0ZW1JZDogcC53b3JrSXRlbUlkLFxuICAgICAgICAgIGFjdG9ySWQ6IGN0eC5hY3RvcklkLFxuICAgICAgICAgIC4uLihwLnR0bE1zICE9PSB1bmRlZmluZWQgPyB7IHR0bE1zOiBwLnR0bE1zIH0gOiB7fSksXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgY2FzZSAnaGVhcnRiZWF0Jzoge1xuICAgICAgICBjb25zdCBwID0gcGFyc2VkIGFzIEhlYXJ0YmVhdEluO1xuICAgICAgICBlbmdpbmUuaGVhcnRiZWF0KHsgY2xhaW1JZDogcC5jbGFpbUlkIH0pO1xuICAgICAgICByZXR1cm4geyByZW5ld2VkOiB0cnVlIH07XG4gICAgICB9XG4gICAgICBjYXNlICdyZWxlYXNlX2NsYWltJzoge1xuICAgICAgICBjb25zdCBwID0gcGFyc2VkIGFzIFJlbGVhc2VDbGFpbUluO1xuICAgICAgICBlbmdpbmUucmVsZWFzZUNsYWltKHtcbiAgICAgICAgICBjbGFpbUlkOiBwLmNsYWltSWQsXG4gICAgICAgICAgLi4uKHAucmVhc29uICE9PSB1bmRlZmluZWQgPyB7IHJlYXNvbjogcC5yZWFzb24gfSA6IHt9KSxcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiB7IHJlbGVhc2VkOiB0cnVlIH07XG4gICAgICB9XG5cbiAgICAgIC8vIC0tIGxpZmVjeWNsZSAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICBjYXNlICdhZHZhbmNlX3N0YXRlJzoge1xuICAgICAgICBjb25zdCBwID0gcGFyc2VkIGFzIEFkdmFuY2VJbjtcbiAgICAgICAgcmV0dXJuIGVuZ2luZS5hZHZhbmNlU3RhdGUoe1xuICAgICAgICAgIHdvcmtJdGVtSWQ6IHAud29ya0l0ZW1JZCxcbiAgICAgICAgICB0bzogcC50byBhcyBXb3JrSXRlbVN0YXRlLFxuICAgICAgICAgIGFjdG9ySWQ6IGN0eC5hY3RvcklkLFxuICAgICAgICAgIC4uLihwLmZlbmNpbmdUb2tlbiAhPT0gdW5kZWZpbmVkID8geyBmZW5jaW5nVG9rZW46IHAuZmVuY2luZ1Rva2VuIH0gOiB7fSksXG4gICAgICAgICAgLi4uKHAuaWRlbXBvdGVuY3lLZXkgIT09IHVuZGVmaW5lZCA/IHsgaWRlbXBvdGVuY3lLZXk6IHAuaWRlbXBvdGVuY3lLZXkgfSA6IHt9KSxcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICBjYXNlICdibG9ja190YXNrJzoge1xuICAgICAgICBjb25zdCBwID0gcGFyc2VkIGFzIEJsb2NrSW47XG4gICAgICAgIHJldHVybiBlbmdpbmUuYmxvY2tUYXNrKHtcbiAgICAgICAgICB3b3JrSXRlbUlkOiBwLndvcmtJdGVtSWQsXG4gICAgICAgICAgcmVhc29uOiBwLnJlYXNvbixcbiAgICAgICAgICBhY3RvcklkOiBjdHguYWN0b3JJZCxcbiAgICAgICAgICAuLi4ocC5mZW5jaW5nVG9rZW4gIT09IHVuZGVmaW5lZCA/IHsgZmVuY2luZ1Rva2VuOiBwLmZlbmNpbmdUb2tlbiB9IDoge30pLFxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIGNhc2UgJ3VuYmxvY2tfdGFzayc6IHtcbiAgICAgICAgY29uc3QgcCA9IHBhcnNlZCBhcyBXb3JrSXRlbUluO1xuICAgICAgICByZXR1cm4gZW5naW5lLnVuYmxvY2tUYXNrKHsgd29ya0l0ZW1JZDogcC53b3JrSXRlbUlkLCBhY3RvcklkOiBjdHguYWN0b3JJZCB9KTtcbiAgICAgIH1cbiAgICAgIGNhc2UgJ3N1Ym1pdF9ldmlkZW5jZSc6IHtcbiAgICAgICAgY29uc3QgcCA9IHBhcnNlZCBhcyBTdWJtaXRFdmlkZW5jZUluO1xuICAgICAgICBlbmdpbmUuc3VibWl0RXZpZGVuY2Uoe1xuICAgICAgICAgIHdvcmtJdGVtSWQ6IHAud29ya0l0ZW1JZCxcbiAgICAgICAgICBldmlkZW5jZTogcC5ldmlkZW5jZSBhcyBFdmlkZW5jZSxcbiAgICAgICAgICBhY3RvcklkOiBjdHguYWN0b3JJZCxcbiAgICAgICAgICAuLi4ocC5mZW5jaW5nVG9rZW4gIT09IHVuZGVmaW5lZCA/IHsgZmVuY2luZ1Rva2VuOiBwLmZlbmNpbmdUb2tlbiB9IDoge30pLFxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHsgc3VibWl0dGVkOiB0cnVlIH07XG4gICAgICB9XG4gICAgICBjYXNlICdhcHByb3ZlX2dhdGUnOiB7XG4gICAgICAgIGNvbnN0IHAgPSBwYXJzZWQgYXMgQXBwcm92ZUdhdGVJbjtcbiAgICAgICAgcmV0dXJuIGVuZ2luZS5hcHByb3ZlR2F0ZSh7XG4gICAgICAgICAgd29ya0l0ZW1JZDogcC53b3JrSXRlbUlkLFxuICAgICAgICAgIGdhdGU6IHAuZ2F0ZSxcbiAgICAgICAgICBhY3RvcklkOiBjdHguYWN0b3JJZCxcbiAgICAgICAgICAuLi4ocC5waW5uZWRWZXJpZmljYXRpb24gIT09IHVuZGVmaW5lZFxuICAgICAgICAgICAgPyB7IHBpbm5lZFZlcmlmaWNhdGlvbjogcC5waW5uZWRWZXJpZmljYXRpb24gfVxuICAgICAgICAgICAgOiB7fSksXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgY2FzZSAncmVqZWN0X2dhdGUnOiB7XG4gICAgICAgIGNvbnN0IHAgPSBwYXJzZWQgYXMgUmVqZWN0R2F0ZUluO1xuICAgICAgICByZXR1cm4gZW5naW5lLnJlamVjdEdhdGUoeyB3b3JrSXRlbUlkOiBwLndvcmtJdGVtSWQsIGdhdGU6IHAuZ2F0ZSwgYWN0b3JJZDogY3R4LmFjdG9ySWQgfSk7XG4gICAgICB9XG4gICAgICBjYXNlICdyZWxlYXNlX2Rpc3BhdGNoX2hvbGQnOiB7XG4gICAgICAgIGNvbnN0IHAgPSBwYXJzZWQgYXMgRmVhdHVyZUluO1xuICAgICAgICByZXR1cm4gZW5naW5lLnJlbGVhc2VEaXNwYXRjaEhvbGQoeyBmZWF0dXJlSWQ6IHAuZmVhdHVyZUlkLCBhY3RvcklkOiBjdHguYWN0b3JJZCB9KTtcbiAgICAgIH1cblxuICAgICAgLy8gLS0gY29sbGFib3JhdGlvbiAoUGhhc2UgMywgcm9hZG1hcCBcdTAwQTc1KSAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICAvLyBBY3RvciBpZGVudGl0eSBBTFdBWVMgZnJvbSBjdHg6IHRoZSBwb3N0ZXIsIHJlYWRlciwgbm90aWZpY2F0aW9uIG93bmVyXG4gICAgICAvLyBhbmQgam9iIGNvbXBsZXRlciBhcmUgdGhlIGF1dGhlbnRpY2F0ZWQgYWN0b3IgXHUyMDE0IG5ldmVyIGEgYm9keSBmaWVsZC5cbiAgICAgIGNhc2UgJ2NyZWF0ZV90aHJlYWQnOiB7XG4gICAgICAgIGNvbnN0IHAgPSBwYXJzZWQgYXMgQ3JlYXRlVGhyZWFkSW47XG4gICAgICAgIHJldHVybiBlbmdpbmUuY3JlYXRlVGhyZWFkKHtcbiAgICAgICAgICBhY3RvcklkOiBjdHguYWN0b3JJZCxcbiAgICAgICAgICBraW5kOiBwLmtpbmQsXG4gICAgICAgICAgLi4uKHAuZmVhdHVyZUlkICE9PSB1bmRlZmluZWQgPyB7IGZlYXR1cmVJZDogcC5mZWF0dXJlSWQgfSA6IHt9KSxcbiAgICAgICAgICAuLi4ocC53b3JrSXRlbUlkICE9PSB1bmRlZmluZWQgPyB7IHdvcmtJdGVtSWQ6IHAud29ya0l0ZW1JZCB9IDoge30pLFxuICAgICAgICAgIC4uLihwLnZpc2liaWxpdHkgIT09IHVuZGVmaW5lZCA/IHsgdmlzaWJpbGl0eTogcC52aXNpYmlsaXR5IH0gOiB7fSksXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgY2FzZSAnYWRkX3RocmVhZF9wYXJ0aWNpcGFudCc6IHtcbiAgICAgICAgY29uc3QgcCA9IHBhcnNlZCBhcyBBZGRUaHJlYWRQYXJ0aWNpcGFudEluO1xuICAgICAgICByZXR1cm4gZW5naW5lLmFkZFRocmVhZFBhcnRpY2lwYW50KHtcbiAgICAgICAgICB0aHJlYWRJZDogcC50aHJlYWRJZCxcbiAgICAgICAgICBhY3RvcklkOiBwLmFjdG9ySWQsXG4gICAgICAgICAgYnlBY3RvcklkOiBjdHguYWN0b3JJZCxcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICBjYXNlICdwb3N0X21lc3NhZ2UnOiB7XG4gICAgICAgIGNvbnN0IHAgPSBwYXJzZWQgYXMgUG9zdE1lc3NhZ2VJbjtcbiAgICAgICAgcmV0dXJuIGVuZ2luZS5wb3N0TWVzc2FnZSh7XG4gICAgICAgICAgdGhyZWFkSWQ6IHAudGhyZWFkSWQsXG4gICAgICAgICAgYWN0b3JJZDogY3R4LmFjdG9ySWQsXG4gICAgICAgICAgYm9keTogcC5ib2R5LFxuICAgICAgICAgIC4uLihwLnJlcGx5VG8gIT09IHVuZGVmaW5lZCA/IHsgcmVwbHlUbzogcC5yZXBseVRvIH0gOiB7fSksXG4gICAgICAgICAgLi4uKHAubWVudGlvbnMgIT09IHVuZGVmaW5lZCA/IHsgbWVudGlvbnM6IHAubWVudGlvbnMgfSA6IHt9KSxcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICBjYXNlICdsaXN0X3RocmVhZHMnOiB7XG4gICAgICAgIGNvbnN0IHAgPSBwYXJzZWQgYXMgTGlzdFRocmVhZHNJbjtcbiAgICAgICAgcmV0dXJuIGVuZ2luZS5saXN0VGhyZWFkcyh7XG4gICAgICAgICAgYWN0b3JJZDogY3R4LmFjdG9ySWQsIC8vIHByaXZhdGUgdGhyZWFkcyBzdGF5IGludmlzaWJsZSB0byBub24tcGFydGljaXBhbnRzXG4gICAgICAgICAgLi4uKHAuZmVhdHVyZUlkICE9PSB1bmRlZmluZWQgPyB7IGZlYXR1cmVJZDogcC5mZWF0dXJlSWQgfSA6IHt9KSxcbiAgICAgICAgICAuLi4ocC53b3JrSXRlbUlkICE9PSB1bmRlZmluZWQgPyB7IHdvcmtJdGVtSWQ6IHAud29ya0l0ZW1JZCB9IDoge30pLFxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIGNhc2UgJ2xpc3RfbWVzc2FnZXMnOiB7XG4gICAgICAgIGNvbnN0IHAgPSBwYXJzZWQgYXMgTGlzdE1lc3NhZ2VzSW47XG4gICAgICAgIHJldHVybiBlbmdpbmUubGlzdE1lc3NhZ2VzKHtcbiAgICAgICAgICB0aHJlYWRJZDogcC50aHJlYWRJZCxcbiAgICAgICAgICBhY3RvcklkOiBjdHguYWN0b3JJZCxcbiAgICAgICAgICAuLi4ocC5zaW5jZVNlcSAhPT0gdW5kZWZpbmVkID8geyBzaW5jZVNlcTogcC5zaW5jZVNlcSB9IDoge30pLFxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIGNhc2UgJ2xpc3RfbWVudGlvbnMnOiB7XG4gICAgICAgIGNvbnN0IHAgPSBwYXJzZWQgYXMgTGlzdE1lbnRpb25zSW47XG4gICAgICAgIHJldHVybiBlbmdpbmUubGlzdE1lbnRpb25zKHAubWVzc2FnZUlkKTtcbiAgICAgIH1cbiAgICAgIGNhc2UgJ2xpc3Rfbm90aWZpY2F0aW9ucyc6IHtcbiAgICAgICAgY29uc3QgcCA9IHBhcnNlZCBhcyBMaXN0Tm90aWZpY2F0aW9uc0luO1xuICAgICAgICByZXR1cm4gZW5naW5lLmxpc3ROb3RpZmljYXRpb25zKHtcbiAgICAgICAgICBhY3RvcklkOiBjdHguYWN0b3JJZCxcbiAgICAgICAgICAuLi4ocC51bnJlYWRPbmx5ICE9PSB1bmRlZmluZWQgPyB7IHVucmVhZE9ubHk6IHAudW5yZWFkT25seSB9IDoge30pLFxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIGNhc2UgJ21hcmtfbm90aWZpY2F0aW9uX3JlYWQnOiB7XG4gICAgICAgIGNvbnN0IHAgPSBwYXJzZWQgYXMgTWFya05vdGlmaWNhdGlvblJlYWRJbjtcbiAgICAgICAgZW5naW5lLm1hcmtOb3RpZmljYXRpb25SZWFkKHsgbm90aWZpY2F0aW9uSWQ6IHAubm90aWZpY2F0aW9uSWQsIGFjdG9ySWQ6IGN0eC5hY3RvcklkIH0pO1xuICAgICAgICByZXR1cm4geyByZWFkOiB0cnVlIH07XG4gICAgICB9XG4gICAgICBjYXNlICdsaXN0X2FnZW50X2pvYnMnOiB7XG4gICAgICAgIGNvbnN0IHAgPSBwYXJzZWQgYXMgTGlzdEFnZW50Sm9ic0luO1xuICAgICAgICByZXR1cm4gZW5naW5lLmxpc3RBZ2VudEpvYnMoe1xuICAgICAgICAgIC4uLihwLmFnZW50QWN0b3JJZCAhPT0gdW5kZWZpbmVkID8geyBhZ2VudEFjdG9ySWQ6IHAuYWdlbnRBY3RvcklkIH0gOiB7fSksXG4gICAgICAgICAgLi4uKHAuc3RhdHVzICE9PSB1bmRlZmluZWQgPyB7IHN0YXR1czogcC5zdGF0dXMgfSA6IHt9KSxcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICBjYXNlICdjb21wbGV0ZV9hZ2VudF9qb2InOiB7XG4gICAgICAgIGNvbnN0IHAgPSBwYXJzZWQgYXMgQ29tcGxldGVBZ2VudEpvYkluO1xuICAgICAgICByZXR1cm4gZW5naW5lLmNvbXBsZXRlQWdlbnRKb2Ioe1xuICAgICAgICAgIGpvYklkOiBwLmpvYklkLFxuICAgICAgICAgIGFjdG9ySWQ6IGN0eC5hY3RvcklkLFxuICAgICAgICAgIHN0YXR1czogcC5zdGF0dXMsXG4gICAgICAgICAgLi4uKHAubm90ZSAhPT0gdW5kZWZpbmVkID8geyBub3RlOiBwLm5vdGUgfSA6IHt9KSxcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIC8vIC0tIGFnZW50IG1lbW9yeSAoUGhhc2UgNSwgcm9hZG1hcCBcdTAwQTc2KSAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgIC8vIFRoZSBtZW1vcnkgb3duZXIgaXMgQUxXQVlTIHRoZSBjdHggYWN0b3IgXHUyMDE0IG5vIGNyb3NzLWFjdG9yIHBhcmFtZXRlclxuICAgICAgLy8gZXhpc3RzIG9uIHRoZSB3aXJlLCBzbyBvd25lci1zY29waW5nIGlzIHN0cnVjdHVyYWwsIG5vdCBkaXNjaXBsaW5lZC5cbiAgICAgIGNhc2UgJ2FwcGVuZF9hZ2VudF9tZW1vcnknOiB7XG4gICAgICAgIGNvbnN0IHAgPSBwYXJzZWQgYXMgQXBwZW5kQWdlbnRNZW1vcnlJbjtcbiAgICAgICAgcmV0dXJuIGVuZ2luZS5hcHBlbmRBZ2VudE1lbW9yeSh7XG4gICAgICAgICAgYWN0b3JJZDogY3R4LmFjdG9ySWQsXG4gICAgICAgICAga2luZDogcC5raW5kLFxuICAgICAgICAgIGNvbnRlbnQ6IHAuY29udGVudCxcbiAgICAgICAgICAuLi4ocC5zb3VyY2VUaHJlYWRJZCAhPT0gdW5kZWZpbmVkID8geyBzb3VyY2VUaHJlYWRJZDogcC5zb3VyY2VUaHJlYWRJZCB9IDoge30pLFxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIGNhc2UgJ3NlYXJjaF9hZ2VudF9tZW1vcnknOiB7XG4gICAgICAgIGNvbnN0IHAgPSBwYXJzZWQgYXMgU2VhcmNoQWdlbnRNZW1vcnlJbjtcbiAgICAgICAgcmV0dXJuIGVuZ2luZS5zZWFyY2hBZ2VudE1lbW9yeSh7XG4gICAgICAgICAgYWN0b3JJZDogY3R4LmFjdG9ySWQsXG4gICAgICAgICAgLi4uKHAuY29udGV4dFRocmVhZElkICE9PSB1bmRlZmluZWQgPyB7IGNvbnRleHRUaHJlYWRJZDogcC5jb250ZXh0VGhyZWFkSWQgfSA6IHt9KSxcbiAgICAgICAgICAuLi4ocC5raW5kICE9PSB1bmRlZmluZWQgPyB7IGtpbmQ6IHAua2luZCB9IDoge30pLFxuICAgICAgICAgIC4uLihwLnF1ZXJ5ICE9PSB1bmRlZmluZWQgPyB7IHF1ZXJ5OiBwLnF1ZXJ5IH0gOiB7fSksXG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICAvLyAtLSByZWNvbmNpbGlhdGlvbiAocm9hZG1hcCBcdTAwQTcxLjYsIGRldGVjdC1vbmx5KSAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICBjYXNlICdyZWNvbmNpbGUnOiB7XG4gICAgICAgIGNvbnN0IHAgPSBwYXJzZWQgYXMgUmVjb25jaWxlSW47XG4gICAgICAgIHJldHVybiBlbmdpbmUucmVjb25jaWxlKHsgZmlsZXM6IHAuZmlsZXMgfSk7XG4gICAgICB9XG5cbiAgICAgIC8vIC0tIG9wcyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgIGNhc2UgJ2ZvcmNlX3JlbGVhc2VfY2xhaW0nOiB7XG4gICAgICAgIGNvbnN0IHAgPSBwYXJzZWQgYXMgV29ya0l0ZW1JbjtcbiAgICAgICAgY29uc3QgdW5yZWxlYXNlZCA9IGVuZ2luZS5nZXRDbGFpbXMocC53b3JrSXRlbUlkKS5maWx0ZXIoKGNsYWltKSA9PiAhY2xhaW0ucmVsZWFzZWQpO1xuICAgICAgICBpZiAodW5yZWxlYXNlZC5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcihgbm8gbGl2ZSBjbGFpbSBvbiB3b3JrIGl0ZW0gJHtwLndvcmtJdGVtSWR9YCk7XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChjb25zdCBjbGFpbSBvZiB1bnJlbGVhc2VkKSB7XG4gICAgICAgICAgZW5naW5lLnJlbGVhc2VDbGFpbSh7IGNsYWltSWQ6IGNsYWltLmlkLCByZWFzb246ICdvcHMgZm9yY2UgcmVsZWFzZScgfSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHsgcmVsZWFzZWQ6IHVucmVsZWFzZWQubWFwKChjbGFpbSkgPT4gY2xhaW0uaWQpIH07XG4gICAgICB9XG5cbiAgICAgIC8vIC0tIHF1ZXJpZXMgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICAgY2FzZSAnZ2V0X3dvcmtfaXRlbSc6IHtcbiAgICAgICAgY29uc3QgcCA9IHBhcnNlZCBhcyBXb3JrSXRlbUluO1xuICAgICAgICByZXR1cm4gZW5naW5lLmdldFdvcmtJdGVtKHAud29ya0l0ZW1JZCk7XG4gICAgICB9XG4gICAgICBjYXNlICdnZXRfZmVhdHVyZSc6IHtcbiAgICAgICAgY29uc3QgcCA9IHBhcnNlZCBhcyBGZWF0dXJlSW47XG4gICAgICAgIHJldHVybiBlbmdpbmUuZ2V0RmVhdHVyZShwLmZlYXR1cmVJZCk7XG4gICAgICB9XG4gICAgICBjYXNlICdnZXRfdGFza19jb250ZXh0Jzoge1xuICAgICAgICBjb25zdCBwID0gcGFyc2VkIGFzIFdvcmtJdGVtSW47XG4gICAgICAgIHJldHVybiBlbmdpbmUuZ2V0VGFza0NvbnRleHQoeyB3b3JrSXRlbUlkOiBwLndvcmtJdGVtSWQgfSk7XG4gICAgICB9XG4gICAgICBjYXNlICdsaXN0X3dvcmtfaXRlbXMnOiB7XG4gICAgICAgIGNvbnN0IHAgPSBwYXJzZWQgYXMgTGlzdFdvcmtJdGVtc0luO1xuICAgICAgICByZXR1cm4gZW5naW5lLmxpc3RXb3JrSXRlbXMoe1xuICAgICAgICAgIC4uLihwLnN0YXRlICE9PSB1bmRlZmluZWQgPyB7IHN0YXRlOiBwLnN0YXRlIGFzIFdvcmtJdGVtU3RhdGUgfSA6IHt9KSxcbiAgICAgICAgICAuLi4ocC5mZWF0dXJlSWQgIT09IHVuZGVmaW5lZCA/IHsgZmVhdHVyZUlkOiBwLmZlYXR1cmVJZCB9IDoge30pLFxuICAgICAgICAgIC4uLihwLmNsYWltYWJsZSAhPT0gdW5kZWZpbmVkID8geyBjbGFpbWFibGU6IHAuY2xhaW1hYmxlIH0gOiB7fSksXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgY2FzZSAnaW5ib3gnOiB7XG4gICAgICAgIGNvbnN0IGF3YWl0aW5nU3BlYyA9IGVuZ2luZVxuICAgICAgICAgIC5saXN0V29ya0l0ZW1zKHsgc3RhdGU6ICdkcmFmdCcgfSlcbiAgICAgICAgICAuZmlsdGVyKChpdGVtKSA9PiBpdGVtLnNwZWNDaGVja3BvaW50KTtcbiAgICAgICAgY29uc3QgYXdhaXRpbmdSZXZpZXcgPSBlbmdpbmUubGlzdFdvcmtJdGVtcyh7IHN0YXRlOiAnaW5fcmV2aWV3JyB9KTtcbiAgICAgICAgcmV0dXJuIHsgYXdhaXRpbmdTcGVjLCBhd2FpdGluZ1JldmlldyB9O1xuICAgICAgfVxuICAgICAgY2FzZSAncXVlcnlfZXZlbnRzJzoge1xuICAgICAgICBjb25zdCBwID0gcGFyc2VkIGFzIFF1ZXJ5RXZlbnRzSW47XG4gICAgICAgIHJldHVybiBlbmdpbmUuZXZlbnRzKHAuc3RyZWFtSWQpO1xuICAgICAgfVxuICAgICAgY2FzZSAnZ2V0X2NsYWltcyc6IHtcbiAgICAgICAgY29uc3QgcCA9IHBhcnNlZCBhcyBXb3JrSXRlbUluO1xuICAgICAgICByZXR1cm4gZW5naW5lLmdldENsYWltcyhwLndvcmtJdGVtSWQpO1xuICAgICAgfVxuICAgICAgY2FzZSAnd2hvYW1pJzoge1xuICAgICAgICByZXR1cm4geyBhY3RvcklkOiBjdHguYWN0b3JJZCwgaXNBZG1pbjogY3R4LmlzQWRtaW4gfTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBVbnJlYWNoYWJsZSB3aGlsZSB0aGUgc3dpdGNoIGNvdmVycyB0aGUgcmVnaXN0cnk7IGtlZXBzIHRoZSBjb21waWxlciBob25lc3QuXG4gICAgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoYGNvbW1hbmQgbm90IHdpcmVkIHRvIHRoZSBidXM6ICR7Y29tbWFuZH1gKTtcbiAgfVxuXG4gIHJldHVybiB7IGV4ZWN1dGUsIGVuZ2luZSB9O1xufVxuIiwgIi8qKlxuICogTUNQIGFkYXB0ZXIgXHUyMDE0IGV2ZXJ5IHJlZ2lzdHJ5IGVudHJ5IGluIENPTU1BTkRTIGJlY29tZXMgb25lIHRvb2w7IGV2ZXJ5XG4gKiB0b29sIGhhbmRsZXIgY2FsbHMgdGhlIFNBTUUgYnVzLmV4ZWN1dGUgdGhlIEhUVFAgcm91dGUgY2FsbHMuIE5vIGxvZ2ljXG4gKiBsaXZlcyBoZXJlIChyb2FkbWFwIFx1MDBBNzIuMjogc3RydWN0dXJhbGx5IGlkZW50aWNhbCBzZW1hbnRpY3MsIEQ1KS5cbiAqXG4gKiBERUNJU0lPTiAocmVjb3JkZWQpOiB3ZSB1c2UgdGhlIGxvdy1sZXZlbCBgU2VydmVyYCArXG4gKiBzZXRSZXF1ZXN0SGFuZGxlcihMaXN0VG9vbHMvQ2FsbFRvb2wpIGluc3RlYWQgb2YgYE1jcFNlcnZlci5yZWdpc3RlclRvb2xgLlxuICogU0RLIDEuMjkncyBNY3BTZXJ2ZXIgYWNjZXB0cyB6b2Qgc2NoZW1hcyBhbmQgcmUtZW1pdHMgSlNPTiBTY2hlbWEgdGhyb3VnaFxuICogaXRzIG93biBjb21wYXQgbGF5ZXIgKHpvZCB2NCBicmFuY2ggdGFyZ2V0cyBkcmFmdC03KTsgY29udHJhY3RzJ1xuICogaW5wdXRKc29uU2NoZW1hKCkgaXMgem9kIHY0J3MgbmF0aXZlIGRyYWZ0LTIwMjAtMTIgZW1pc3Npb24uIEZlZWRpbmcgdGhlXG4gKiBjb250cmFjdHMgSlNPTiBTY2hlbWEgdmVyYmF0aW0gdGhyb3VnaCB0aGUgbG93LWxldmVsIEFQSSBrZWVwc1xuICogXCJ0b29sIGlucHV0U2NoZW1hID09PSBpbnB1dEpzb25TY2hlbWEoY29tbWFuZClcIiBieXRlLWlkZW50aWNhbCBcdTIwMTQgcGFyaXR5IGlzXG4gKiBhc3NlcnRlZCBieSBkZWVwLWVxdWFsaXR5IGluIHRlc3QvcGFyaXR5LnRlc3QudHMuXG4gKi9cbmltcG9ydCB7IFNlcnZlciB9IGZyb20gJ0Btb2RlbGNvbnRleHRwcm90b2NvbC9zZGsvc2VydmVyL2luZGV4LmpzJztcbmltcG9ydCB7IFN0cmVhbWFibGVIVFRQU2VydmVyVHJhbnNwb3J0IH0gZnJvbSAnQG1vZGVsY29udGV4dHByb3RvY29sL3Nkay9zZXJ2ZXIvc3RyZWFtYWJsZUh0dHAuanMnO1xuaW1wb3J0IHtcbiAgQ2FsbFRvb2xSZXF1ZXN0U2NoZW1hLFxuICBMaXN0VG9vbHNSZXF1ZXN0U2NoZW1hLFxuICB0eXBlIENhbGxUb29sUmVzdWx0LFxufSBmcm9tICdAbW9kZWxjb250ZXh0cHJvdG9jb2wvc2RrL3R5cGVzLmpzJztcbmltcG9ydCB0eXBlIHsgRmFzdGlmeUluc3RhbmNlLCBGYXN0aWZ5UmVxdWVzdCB9IGZyb20gJ2Zhc3RpZnknO1xuaW1wb3J0IHtcbiAgQ09NTUFORFMsXG4gIGlucHV0SnNvblNjaGVtYSxcbiAgbWNwVG9vbE5hbWUsXG4gIHR5cGUgQWN0b3JDb250ZXh0LFxuICB0eXBlIENvbW1hbmRCdXMsXG59IGZyb20gJ0BvYWhzL2NvbnRyYWN0cyc7XG5cbmltcG9ydCB7IGVycm9yTmFtZSB9IGZyb20gJy4vc2VydmVyLmpzJztcblxuY29uc3QgVE9PTF9UT19DT01NQU5EOiBSZWFkb25seU1hcDxzdHJpbmcsIHN0cmluZz4gPSBuZXcgTWFwKFxuICBDT01NQU5EUy5tYXAoKGNvbW1hbmQpID0+IFttY3BUb29sTmFtZShjb21tYW5kLm5hbWUpLCBjb21tYW5kLm5hbWVdKSxcbik7XG5cbi8qKlxuICogQnVpbGQgb25lIE1DUCBzZXJ2ZXIgYm91bmQgdG8gYW4gYXV0aGVudGljYXRlZCBhY3RvciBjb250ZXh0LiBTdGF0ZWxlc3NcbiAqIEhUVFAgbW91bnRzIGNvbnN0cnVjdCBvbmUgcGVyIHJlcXVlc3Q7IHRlc3RzIHdpcmUgb25lIHRvIGFuXG4gKiBJbk1lbW9yeVRyYW5zcG9ydCBkaXJlY3RseS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkTWNwU2VydmVyKGJ1czogQ29tbWFuZEJ1cywgY3R4OiBBY3RvckNvbnRleHQpOiBTZXJ2ZXIge1xuICBjb25zdCBzZXJ2ZXIgPSBuZXcgU2VydmVyKFxuICAgIHsgbmFtZTogJ29haHMtc3BpbmUnLCB2ZXJzaW9uOiAnMC4wLjEnIH0sXG4gICAgeyBjYXBhYmlsaXRpZXM6IHsgdG9vbHM6IHt9IH0gfSxcbiAgKTtcblxuICBzZXJ2ZXIuc2V0UmVxdWVzdEhhbmRsZXIoTGlzdFRvb2xzUmVxdWVzdFNjaGVtYSwgYXN5bmMgKCkgPT4gKHtcbiAgICB0b29sczogQ09NTUFORFMubWFwKChjb21tYW5kKSA9PiAoe1xuICAgICAgbmFtZTogbWNwVG9vbE5hbWUoY29tbWFuZC5uYW1lKSxcbiAgICAgIGRlc2NyaXB0aW9uOiBjb21tYW5kLmRlc2NyaXB0aW9uLFxuICAgICAgLy8gVmVyYmF0aW0gZnJvbSBjb250cmFjdHMgXHUyMDE0IHRoZSBwYXJpdHkgdGVzdCBkZWVwLWVxdWFscyB0aGlzLlxuICAgICAgaW5wdXRTY2hlbWE6IGlucHV0SnNvblNjaGVtYShjb21tYW5kLm5hbWUpIGFzIHsgdHlwZTogJ29iamVjdCc7IFtrOiBzdHJpbmddOiB1bmtub3duIH0sXG4gICAgfSkpLFxuICB9KSk7XG5cbiAgc2VydmVyLnNldFJlcXVlc3RIYW5kbGVyKENhbGxUb29sUmVxdWVzdFNjaGVtYSwgYXN5bmMgKHJlcXVlc3QpOiBQcm9taXNlPENhbGxUb29sUmVzdWx0PiA9PiB7XG4gICAgY29uc3QgY29tbWFuZE5hbWUgPSBUT09MX1RPX0NPTU1BTkQuZ2V0KHJlcXVlc3QucGFyYW1zLm5hbWUpO1xuICAgIGlmIChjb21tYW5kTmFtZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBjb250ZW50OiBbeyB0eXBlOiAndGV4dCcsIHRleHQ6IGB1bmtub3duIHRvb2w6ICR7cmVxdWVzdC5wYXJhbXMubmFtZX1gIH1dLFxuICAgICAgICBpc0Vycm9yOiB0cnVlLFxuICAgICAgfTtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgIC8vIFRoZSBleGFjdCBzYW1lIGNhbGwgdGhlIEhUVFAgcm91dGUgbWFrZXMgXHUyMDE0IG5vIE1DUC1vbmx5IGxvZ2ljLlxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgYnVzLmV4ZWN1dGUoY29tbWFuZE5hbWUsIHJlcXVlc3QucGFyYW1zLmFyZ3VtZW50cyA/PyB7fSwgY3R4KTtcbiAgICAgIHJldHVybiB7IGNvbnRlbnQ6IFt7IHR5cGU6ICd0ZXh0JywgdGV4dDogSlNPTi5zdHJpbmdpZnkocmVzdWx0ID8/IG51bGwpIH1dIH07XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICB0eXBlOiAndGV4dCcsXG4gICAgICAgICAgICB0ZXh0OiBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgICAgIGVycm9yOiB7XG4gICAgICAgICAgICAgICAgbmFtZTogZXJyb3JOYW1lKGVycm9yKSxcbiAgICAgICAgICAgICAgICBtZXNzYWdlOiBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvciksXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9KSxcbiAgICAgICAgICB9LFxuICAgICAgICBdLFxuICAgICAgICBpc0Vycm9yOiB0cnVlLFxuICAgICAgfTtcbiAgICB9XG4gIH0pO1xuXG4gIHJldHVybiBzZXJ2ZXI7XG59XG5cbi8qKlxuICogTW91bnQgUE9TVCAvbWNwIG9uIHRoZSBGYXN0aWZ5IGFwcCBcdTIwMTQgc3RhdGVsZXNzIFN0cmVhbWFibGVIVFRQIHBhdHRlcm5cbiAqIChzZXNzaW9uSWRHZW5lcmF0b3I6IHVuZGVmaW5lZCk6IGEgZnJlc2ggc2VydmVyK3RyYW5zcG9ydCBwYWlyIHBlciByZXF1ZXN0LFxuICogZnVsbHkgaXNvbGF0ZWQsIG5vIHNlc3Npb24gc3RhdGUgdG8gbGVhayBiZXR3ZWVuIGFjdG9ycy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlZ2lzdGVyTWNwUm91dGUoXG4gIGFwcDogRmFzdGlmeUluc3RhbmNlLFxuICBidXM6IENvbW1hbmRCdXMsXG4gIGF1dGhlbnRpY2F0ZTogKHJlcXVlc3Q6IEZhc3RpZnlSZXF1ZXN0KSA9PiBBY3RvckNvbnRleHQgfCBudWxsLFxuKTogdm9pZCB7XG4gIGFwcC5wb3N0KCcvbWNwJywgYXN5bmMgKHJlcXVlc3QsIHJlcGx5KSA9PiB7XG4gICAgY29uc3QgY3R4ID0gYXV0aGVudGljYXRlKHJlcXVlc3QpO1xuICAgIGlmIChjdHggPT09IG51bGwpIHtcbiAgICAgIHJldHVybiByZXBseVxuICAgICAgICAuY29kZSg0MDEpXG4gICAgICAgIC5zZW5kKHsganNvbnJwYzogJzIuMCcsIGVycm9yOiB7IGNvZGU6IC0zMjAwMSwgbWVzc2FnZTogJ3VuYXV0aG9yaXplZCcgfSwgaWQ6IG51bGwgfSk7XG4gICAgfVxuXG4gICAgY29uc3Qgc2VydmVyID0gYnVpbGRNY3BTZXJ2ZXIoYnVzLCBjdHgpO1xuICAgIC8vIFN0YXRlbGVzcyBtb2RlOiBzZXNzaW9uSWRHZW5lcmF0b3Igb21pdHRlZCAoXHUyMjYxIHVuZGVmaW5lZCBcdTIwMTQgdGhlIFNESydzXG4gICAgLy8gZG9jdW1lbnRlZCBzdGF0ZWxlc3MgcGF0dGVybjsgdGhlIGtleSBpcyBsZWZ0IG91dCBvbmx5IGJlY2F1c2UgdGhlIFNES1xuICAgIC8vIG9wdGlvbnMgdHlwZSBpcyBub3QgZXhhY3RPcHRpb25hbFByb3BlcnR5VHlwZXMtY2xlYW4pLlxuICAgIGNvbnN0IHRyYW5zcG9ydCA9IG5ldyBTdHJlYW1hYmxlSFRUUFNlcnZlclRyYW5zcG9ydCh7IGVuYWJsZUpzb25SZXNwb25zZTogdHJ1ZSB9KTtcblxuICAgIHJlcGx5LmhpamFjaygpO1xuICAgIHRyeSB7XG4gICAgICAvLyBDYXN0OiB0aGUgU0RLJ3MgVHJhbnNwb3J0IGludGVyZmFjZSBpcyBub3QgZXhhY3RPcHRpb25hbFByb3BlcnR5VHlwZXMtY2xlYW4uXG4gICAgICBhd2FpdCBzZXJ2ZXIuY29ubmVjdCh0cmFuc3BvcnQgYXMgdW5rbm93biBhcyBQYXJhbWV0ZXJzPHR5cGVvZiBzZXJ2ZXIuY29ubmVjdD5bMF0pO1xuICAgICAgLy8gSlNPTi1yZXNwb25zZSBtb2RlOiByZXNvbHZlcyBvbmNlIHRoZSByZXNwb25zZSBoYXMgYmVlbiB3cml0dGVuLlxuICAgICAgLy8gKERvIE5PVCBjbG9zZSBvbiByZXF1ZXN0LnJhdyAnY2xvc2UnIFx1MjAxNCBOb2RlIGVtaXRzIGl0IGFzIHNvb24gYXMgdGhlXG4gICAgICAvLyBwYXJzZWQgcmVxdWVzdCBzdHJlYW0gZW5kcywgd2hpY2ggd291bGQga2lsbCB0aGUgcGVuZGluZyByZXNwb25zZS4pXG4gICAgICBhd2FpdCB0cmFuc3BvcnQuaGFuZGxlUmVxdWVzdChyZXF1ZXN0LnJhdywgcmVwbHkucmF3LCByZXF1ZXN0LmJvZHkpO1xuICAgIH0gZmluYWxseSB7XG4gICAgICB2b2lkIHRyYW5zcG9ydC5jbG9zZSgpO1xuICAgICAgdm9pZCBzZXJ2ZXIuY2xvc2UoKTtcbiAgICB9XG4gICAgcmV0dXJuIHJlcGx5O1xuICB9KTtcbn1cbiIsICIvKipcbiAqIEdFVCAvZXZlbnRzL3N0cmVhbSBcdTIwMTQgU2VydmVyLVNlbnQgRXZlbnRzIHJlbGF5IG9mIHRoZSBhcHBlbmQtb25seSBldmVudCBsb2cuXG4gKlxuICogUmVhZC1vbmx5IHN1cmZhY2UgKG5ldmVyIGEgd3JpdGUgcGF0aCk6IGVhY2ggU1NFIGZyYW1lIGlzIG9uZSBTcGluZUV2ZW50IGFzXG4gKiBKU09OIHdpdGggYGlkOiA8Z2xvYmFsU2VxPmAsIHNvIHN0YW5kYXJkIEV2ZW50U291cmNlIHJlY29ubmVjdGlvblxuICogKExhc3QtRXZlbnQtSUQpIHJlc3VtZXMgZXhhY3RseSB3aGVyZSB0aGUgY2xpZW50IGxlZnQgb2ZmOyBgP3NpbmNlPTxzZXE+YFxuICogZG9lcyB0aGUgc2FtZSBmb3IgYSBmaXJzdCBjb25uZWN0LlxuICpcbiAqIFRvZGF5IHRoZSByZWxheSBQT0xMUyBlbmdpbmUuZXZlbnRzKCkgKDMwMG1zKSBiZWhpbmQgdGhlIEV2ZW50VGFpbFxuICogaW50ZXJmYWNlOyBhIHJlYWwgdHJhbnNhY3Rpb25hbCBvdXRib3ggY2FuIHJlcGxhY2UgcG9sbGluZ0V2ZW50VGFpbCB3aXRob3V0XG4gKiB0b3VjaGluZyB0aGUgcm91dGUuIEhlYXJ0YmVhdCBjb21tZW50cyBldmVyeSAxNXMga2VlcCBwcm94aWVzIGZyb20gdGltaW5nXG4gKiBvdXQgdGhlIGlkbGUgc3RyZWFtOyBldmVyeSB0aW1lciBpcyBjbGVhcmVkIG9uIGNsaWVudCBkaXNjb25uZWN0IGFuZCBvblxuICogc2VydmVyIGNsb3NlLlxuICovXG5pbXBvcnQgdHlwZSB7IEZhc3RpZnlJbnN0YW5jZSwgRmFzdGlmeVJlcXVlc3QgfSBmcm9tICdmYXN0aWZ5JztcbmltcG9ydCB0eXBlIHsgU3BpbmVFbmdpbmUsIFNwaW5lRXZlbnQgfSBmcm9tICdAb2Focy9jb3JlJztcbmltcG9ydCB0eXBlIHsgQWN0b3JDb250ZXh0LCBFcnJvckVudmVsb3BlIH0gZnJvbSAnQG9haHMvY29udHJhY3RzJztcblxuLyoqIEFic3RyYWN0IG9yZGVyZWQgZXZlbnQgc291cmNlOiBldmVyeXRoaW5nIHN0cmljdGx5IGFmdGVyIGEgZ2xvYmFsIHNlcS4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgRXZlbnRUYWlsIHtcbiAgYWZ0ZXIoZ2xvYmFsU2VxOiBudW1iZXIpOiBTcGluZUV2ZW50W107XG59XG5cbi8qKiBQb2xsaW5nIGltcGxlbWVudGF0aW9uIG92ZXIgZW5naW5lLmV2ZW50cygpIFx1MjAxNCBzd2FwcGVkIGZvciBhbiBvdXRib3ggbGF0ZXIuICovXG5leHBvcnQgZnVuY3Rpb24gcG9sbGluZ0V2ZW50VGFpbChlbmdpbmU6IFNwaW5lRW5naW5lKTogRXZlbnRUYWlsIHtcbiAgcmV0dXJuIHtcbiAgICBhZnRlcihnbG9iYWxTZXE6IG51bWJlcik6IFNwaW5lRXZlbnRbXSB7XG4gICAgICByZXR1cm4gZW5naW5lLmV2ZW50cygpLmZpbHRlcigoZXZlbnQpID0+IGV2ZW50Lmdsb2JhbFNlcSA+IGdsb2JhbFNlcSk7XG4gICAgfSxcbiAgfTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBFdmVudFN0cmVhbU9wdGlvbnMge1xuICAvKiogUG9sbCBpbnRlcnZhbCBmb3IgbmV3IGV2ZW50cyAobXMpLiBEZWZhdWx0IDMwMC4gKi9cbiAgcG9sbE1zPzogbnVtYmVyO1xuICAvKiogSGVhcnRiZWF0IGNvbW1lbnQgaW50ZXJ2YWwgKG1zKS4gRGVmYXVsdCAxNTAwMC4gKi9cbiAgaGVhcnRiZWF0TXM/OiBudW1iZXI7XG59XG5cbmZ1bmN0aW9uIHBhcnNlQ3Vyc29yKHJlcXVlc3Q6IEZhc3RpZnlSZXF1ZXN0KTogbnVtYmVyIHtcbiAgLy8gU1NFIHJlY29ubmVjdGlvbiB3aW5zOiB0aGUgYnJvd3NlciBFdmVudFNvdXJjZSByZXNlbmRzIHRoZSBsYXN0IHNlZW4gaWQuXG4gIGNvbnN0IGxhc3RFdmVudElkID0gcmVxdWVzdC5oZWFkZXJzWydsYXN0LWV2ZW50LWlkJ107XG4gIGNvbnN0IHJhdyA9XG4gICAgdHlwZW9mIGxhc3RFdmVudElkID09PSAnc3RyaW5nJyAmJiBsYXN0RXZlbnRJZC50cmltKCkgIT09ICcnXG4gICAgICA/IGxhc3RFdmVudElkXG4gICAgICA6IChyZXF1ZXN0LnF1ZXJ5IGFzIHsgc2luY2U/OiBzdHJpbmcgfSkuc2luY2U7XG4gIGlmIChyYXcgPT09IHVuZGVmaW5lZCkgcmV0dXJuIDA7XG4gIGNvbnN0IHBhcnNlZCA9IE51bWJlcihyYXcpO1xuICByZXR1cm4gTnVtYmVyLmlzRmluaXRlKHBhcnNlZCkgJiYgcGFyc2VkID49IDAgPyBNYXRoLmZsb29yKHBhcnNlZCkgOiAwO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVnaXN0ZXJFdmVudFN0cmVhbShcbiAgYXBwOiBGYXN0aWZ5SW5zdGFuY2UsXG4gIHRhaWw6IEV2ZW50VGFpbCxcbiAgYXV0aGVudGljYXRlOiAocmVxdWVzdDogRmFzdGlmeVJlcXVlc3QpID0+IEFjdG9yQ29udGV4dCB8IG51bGwsXG4gIG9wdGlvbnM6IEV2ZW50U3RyZWFtT3B0aW9ucyA9IHt9LFxuKTogdm9pZCB7XG4gIGNvbnN0IHBvbGxNcyA9IG9wdGlvbnMucG9sbE1zID8/IDMwMDtcbiAgY29uc3QgaGVhcnRiZWF0TXMgPSBvcHRpb25zLmhlYXJ0YmVhdE1zID8/IDE1XzAwMDtcbiAgY29uc3QgY2xlYW51cHMgPSBuZXcgU2V0PCgpID0+IHZvaWQ+KCk7XG5cbiAgLy8gQSBoaWphY2tlZCBTU0UgcmVzcG9uc2Ugb3V0bGl2ZXMgRmFzdGlmeSdzIHJlcXVlc3QgbGlmZWN5Y2xlIFx1MjAxNCBjbG9zZSBhbGxcbiAgLy8gbGl2ZSBzdHJlYW1zIHdoZW4gdGhlIHNlcnZlciBjbG9zZXMgc28gdGVzdHMgKGFuZCBzaHV0ZG93bnMpIG5ldmVyIGhhbmcuXG4gIGFwcC5hZGRIb29rKCdvbkNsb3NlJywgKF9pbnN0YW5jZSwgZG9uZSkgPT4ge1xuICAgIGZvciAoY29uc3QgY2xlYW51cCBvZiBbLi4uY2xlYW51cHNdKSBjbGVhbnVwKCk7XG4gICAgZG9uZSgpO1xuICB9KTtcblxuICBhcHAuZ2V0KCcvZXZlbnRzL3N0cmVhbScsIChyZXF1ZXN0LCByZXBseSkgPT4ge1xuICAgIGNvbnN0IGN0eCA9IGF1dGhlbnRpY2F0ZShyZXF1ZXN0KTtcbiAgICBpZiAoY3R4ID09PSBudWxsKSB7XG4gICAgICB2b2lkIHJlcGx5LmNvZGUoNDAxKS5zZW5kKHtcbiAgICAgICAgb2s6IGZhbHNlLFxuICAgICAgICBlcnJvcjogeyBuYW1lOiAnRXJyb3InLCBtZXNzYWdlOiAndW5hdXRob3JpemVkOiBtaXNzaW5nIG9yIGludmFsaWQgYmVhcmVyIHRva2VuJyB9LFxuICAgICAgfSBzYXRpc2ZpZXMgRXJyb3JFbnZlbG9wZSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgbGV0IGN1cnNvciA9IHBhcnNlQ3Vyc29yKHJlcXVlc3QpO1xuXG4gICAgcmVwbHkuaGlqYWNrKCk7XG4gICAgY29uc3QgcmVzID0gcmVwbHkucmF3O1xuICAgIHJlcy53cml0ZUhlYWQoMjAwLCB7XG4gICAgICAnY29udGVudC10eXBlJzogJ3RleHQvZXZlbnQtc3RyZWFtJyxcbiAgICAgICdjYWNoZS1jb250cm9sJzogJ25vLWNhY2hlLCBuby10cmFuc2Zvcm0nLFxuICAgICAgY29ubmVjdGlvbjogJ2tlZXAtYWxpdmUnLFxuICAgICAgJ3gtYWNjZWwtYnVmZmVyaW5nJzogJ25vJyxcbiAgICB9KTtcbiAgICByZXMud3JpdGUoJzogY29ubmVjdGVkXFxuXFxuJyk7XG5cbiAgICBjb25zdCBmbHVzaCA9ICgpOiB2b2lkID0+IHtcbiAgICAgIGZvciAoY29uc3QgZXZlbnQgb2YgdGFpbC5hZnRlcihjdXJzb3IpKSB7XG4gICAgICAgIGN1cnNvciA9IGV2ZW50Lmdsb2JhbFNlcTtcbiAgICAgICAgcmVzLndyaXRlKGBpZDogJHtldmVudC5nbG9iYWxTZXF9XFxuZGF0YTogJHtKU09OLnN0cmluZ2lmeShldmVudCl9XFxuXFxuYCk7XG4gICAgICB9XG4gICAgfTtcbiAgICBmbHVzaCgpO1xuXG4gICAgY29uc3QgcG9sbCA9IHNldEludGVydmFsKGZsdXNoLCBwb2xsTXMpO1xuICAgIGNvbnN0IGhlYXJ0YmVhdCA9IHNldEludGVydmFsKCgpID0+IHtcbiAgICAgIHJlcy53cml0ZSgnOiBoZWFydGJlYXRcXG5cXG4nKTtcbiAgICB9LCBoZWFydGJlYXRNcyk7XG5cbiAgICBjb25zdCBjbGVhbnVwID0gKCk6IHZvaWQgPT4ge1xuICAgICAgY2xlYXJJbnRlcnZhbChwb2xsKTtcbiAgICAgIGNsZWFySW50ZXJ2YWwoaGVhcnRiZWF0KTtcbiAgICAgIGNsZWFudXBzLmRlbGV0ZShjbGVhbnVwKTtcbiAgICAgIGlmICghcmVzLndyaXRhYmxlRW5kZWQpIHJlcy5lbmQoKTtcbiAgICB9O1xuICAgIGNsZWFudXBzLmFkZChjbGVhbnVwKTtcbiAgICAvLyBSZXNwb25zZSAnY2xvc2UnIGZpcmVzIHdoZW4gdGhlIHVuZGVybHlpbmcgc29ja2V0IGdvZXMgYXdheSBcdTIwMTQgY2xpZW50XG4gICAgLy8gZGlzY29ubmVjdHMgaW5jbHVkZWQuIChyZXF1ZXN0LnJhdyAnY2xvc2UnIGZpcmVzIGFzIHNvb24gYXMgdGhlIHBhcnNlZFxuICAgIC8vIHJlcXVlc3Qgc3RyZWFtIGVuZHMsIHdoaWNoIGlzIGltbWVkaWF0ZWx5IGZvciBhIEdFVC4pXG4gICAgcmVzLm9uKCdjbG9zZScsIGNsZWFudXApO1xuICB9KTtcbn1cbiIsICIvKipcbiAqIEdFVCAvdWkgXHUyMDE0IHRoZSBzdGF0aWMgY2hhdCBVSSAoRDMpLiBUaHJlZSBmaWxlcyBvdXQgb2YgcHVibGljLyAoYnVpbHQgYnlcbiAqIHNjcmlwdHMvYnVpbGQtdWkubWpzKSwgc2VydmVkIHdpdGggcGxhaW4gcmVhZEZpbGVTeW5jIFx1MjAxNCBubyBAZmFzdGlmeS9zdGF0aWNcbiAqIGRlcGVuZGVuY3kgZm9yIHRocmVlIGZpbGVzLCBhbmQgTk8gbmV3IHNlcnZlciBsb2dpYzogdGhlIFVJIHRhbGtzIHRvIHRoZVxuICogc2FtZSAvcnBjLyogKyAvZXZlbnRzL3N0cmVhbSBzdXJmYWNlcyBhcyBldmVyeSBvdGhlciBjbGllbnQsIGF1dGhlbnRpY2F0ZWRcbiAqIGJ5IHRoZSBiZWFyZXIgdG9rZW4gdGhlIHVzZXIgcGFzdGVzIGluLiBUaGUgc3RhdGljIHJvdXRlcyB0aGVtc2VsdmVzIGFyZVxuICogdW5hdXRoZW50aWNhdGVkIG9uIHB1cnBvc2UgKGxvZ2luIGhhcHBlbnMgaW4tYXBwKS5cbiAqL1xuaW1wb3J0IHsgcmVhZEZpbGVTeW5jIH0gZnJvbSAnbm9kZTpmcyc7XG5pbXBvcnQgeyBkaXJuYW1lLCBqb2luIH0gZnJvbSAnbm9kZTpwYXRoJztcbmltcG9ydCB7IGZpbGVVUkxUb1BhdGggfSBmcm9tICdub2RlOnVybCc7XG5pbXBvcnQgdHlwZSB7IEZhc3RpZnlJbnN0YW5jZSB9IGZyb20gJ2Zhc3RpZnknO1xuXG5jb25zdCBwdWJsaWNEaXIgPSBqb2luKGRpcm5hbWUoZmlsZVVSTFRvUGF0aChpbXBvcnQubWV0YS51cmwpKSwgJy4uJywgJ3B1YmxpYycpO1xuXG5jb25zdCBDT05URU5UX1RZUEVTOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge1xuICAnLmh0bWwnOiAndGV4dC9odG1sOyBjaGFyc2V0PXV0Zi04JyxcbiAgJy5qcyc6ICd0ZXh0L2phdmFzY3JpcHQ7IGNoYXJzZXQ9dXRmLTgnLFxuICAnLmNzcyc6ICd0ZXh0L2NzczsgY2hhcnNldD11dGYtOCcsXG59O1xuXG5leHBvcnQgZnVuY3Rpb24gcmVnaXN0ZXJVaVJvdXRlcyhhcHA6IEZhc3RpZnlJbnN0YW5jZSk6IHZvaWQge1xuICBjb25zdCBzZXJ2ZSA9IChyb3V0ZVBhdGg6IHN0cmluZywgZmlsZU5hbWU6IHN0cmluZywgZXh0OiBzdHJpbmcpOiB2b2lkID0+IHtcbiAgICBhcHAuZ2V0KHJvdXRlUGF0aCwgKF9yZXF1ZXN0LCByZXBseSkgPT4ge1xuICAgICAgdHJ5IHtcbiAgICAgICAgLy8gUmVhZCBwZXIgcmVxdWVzdDogdGhyZWUgc21hbGwgZmlsZXMsIGFuZCBhIHJlYnVpbHQgYnVuZGxlIGlzIHBpY2tlZFxuICAgICAgICAvLyB1cCB3aXRob3V0IGEgc2VydmVyIHJlc3RhcnQuXG4gICAgICAgIGNvbnN0IGNvbnRlbnQgPSByZWFkRmlsZVN5bmMoam9pbihwdWJsaWNEaXIsIGZpbGVOYW1lKSk7XG4gICAgICAgIHZvaWQgcmVwbHkudHlwZShDT05URU5UX1RZUEVTW2V4dF0gPz8gJ2FwcGxpY2F0aW9uL29jdGV0LXN0cmVhbScpLnNlbmQoY29udGVudCk7XG4gICAgICB9IGNhdGNoIHtcbiAgICAgICAgdm9pZCByZXBseS5jb2RlKDQwNCkuc2VuZCh7XG4gICAgICAgICAgb2s6IGZhbHNlLFxuICAgICAgICAgIGVycm9yOiB7IG5hbWU6ICdFcnJvcicsIG1lc3NhZ2U6IGB1aSBhc3NldCBub3QgYnVpbHQ6ICR7ZmlsZU5hbWV9IChydW4gcG5wbSBidWlsZDp1aSlgIH0sXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH0pO1xuICB9O1xuXG4gIHNlcnZlKCcvdWknLCAnaW5kZXguaHRtbCcsICcuaHRtbCcpO1xuICBzZXJ2ZSgnL3VpL2FwcC5qcycsICdhcHAuanMnLCAnLmpzJyk7XG4gIHNlcnZlKCcvdWkvYXBwLmNzcycsICdhcHAuY3NzJywgJy5jc3MnKTtcbn1cbiJdLAogICJtYXBwaW5ncyI6ICI7Ozs7Ozs7Ozs7Ozs7QUFBQSxJQTBCYSx1QkFXQSxrQkFRQSxlQVFBLHdCQVdBLHdCQWFBLGtCQVdBLGlCQXVEQSxlQU9BLGNBR0EsZ0NBU0EsZ0JBdUVBLG1CQXNCQSxpQkFlQSxVQTJIQTtBQXpZYjtBQUFBO0FBQUE7QUEwQk8sSUFBTSx3QkFBTixjQUFvQyxNQUFNO0FBQUEsTUFDL0MsWUFDa0IsWUFDQSxTQUNoQjtBQUNBLGNBQU0sc0JBQXNCLFVBQVUsY0FBYyxPQUFPLEVBQUU7QUFIN0M7QUFDQTtBQUdoQixhQUFLLE9BQU87QUFBQSxNQUNkO0FBQUEsSUFDRjtBQUdPLElBQU0sbUJBQU4sY0FBK0IsTUFBTTtBQUFBLE1BQzFDLFlBQTRCLE9BQWU7QUFDekMsY0FBTSxpQkFBaUIsS0FBSyxFQUFFO0FBREo7QUFFMUIsYUFBSyxPQUFPO0FBQUEsTUFDZDtBQUFBLElBQ0Y7QUFHTyxJQUFNLGdCQUFOLGNBQTRCLE1BQU07QUFBQSxNQUN2QyxZQUE0QixRQUFnQjtBQUMxQyxjQUFNLGFBQWEsTUFBTSxFQUFFO0FBREQ7QUFFMUIsYUFBSyxPQUFPO0FBQUEsTUFDZDtBQUFBLElBQ0Y7QUFHTyxJQUFNLHlCQUFOLGNBQXFDLE1BQU07QUFBQSxNQUNoRCxZ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LE1BQ0E7QUFBQSxNQUNBO0FBQUEsSUFDRjtBQTJCTyxJQUFNLFdBQVcsY0FBYyxZQUFZLEdBQUc7QUFBQTtBQUFBOzs7QUNwSXJELElBSWE7QUFKYjtBQUFBO0FBQUE7QUFJTyxJQUFNLGFBQWE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFB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QU0sT0FBTyxLQUFLLENBQUM7QUFDcEUsZ0JBQVEsT0FBTyxNQUFNLDJCQUFzQixJQUFJLElBQUksS0FBSyxJQUFJLE9BQU87QUFBQSxDQUFJO0FBQ3ZFLGdCQUFRLFdBQVc7QUFBQSxNQUNyQjtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBRUYsU0FBTztBQUNUO0FBRUEsZUFBc0IsS0FBSyxPQUFpQixRQUFRLE1BQXFCO0FBQ3ZFLFFBQU0sYUFBYSxFQUFFLFdBQVcsSUFBSTtBQUN0QztBQUdBLEtBQUssS0FBSzsiLAogICJuYW1lcyI6IFsid29ya0l0ZW1JZCIsICJmZW5jaW5nVG9rZW4iLCAibWVzc2FnZXMiLCAic3Bhd25TeW5jIiwgImV4aXN0c1N5bmMiLCAicmVhZEZpbGVTeW5jIiwgInJtU3luYyIsICJ3cml0ZUZpbGVTeW5jIiwgImpvaW4iLCAicGFyc2VZYW1sIiwgInNwbGl0RnJvbnRtYXR0ZXIiLCAiaXNSZW1vdGVFcnJvciIsICJ3b3JrSXRlbUlkIiwgImV2aWRlbmNlIiwgImJhc2VsaW5lIiwgIm91dGNvbWUiLCAiaW5pdF9zcmMiLCAic3FsIiwgIlJBTksiLCAiVFJBTlNJVElPTlMiLCAiTEVHQUNZX1NUQVRVUyIsICJ3b3JrSXRlbUlkIiwgImZlbmNpbmdUb2tlbiIsICJxdW9ydW1NZXQiLCAiZGlybmFtZSIsICJqb2luIiwgImZpbGVVUkxUb1BhdGgiLCAic3JjX2V4cG9ydHMiLCAiaW5pdF9zcmMiLCAicmVzb2x2ZSIsICJlcnJvck5hbWUiLCAiaW5pdF9zcmMiLCAicmVhZEZpbGVTeW5jIiwgInJlc29sdmUiLCAidGhyZWFkcyIsICJtZW50aW9ucyIsICJtZXNzYWdlcyIsICJub3RpZmljYXRpb25zIiwgImVxIiwgImZlYXR1cmVzIiwgInJlYWRGaWxlU3luYyIsICJyZXNvbHZlIiwgImV2ZW50cyIsICJhY3RvcnMiLCAicmFuZG9tQnl0ZXMiLCAibWtkaXJTeW5jIiwgImpvaW4iLCAiZXhpc3RzU3luYyIsICJta2RpclN5bmMiLCAicmVhZEZpbGVTeW5jIiwgIndyaXRlRmlsZVN5bmMiLCAiZGVmIiwgInJlYWRGaWxlU3luYyIsICJkaXJuYW1lIiwgImpvaW4iLCAicmFuZG9tQnl0ZXMiLCAibWtkaXJTeW5jIiwgImNyZWF0ZVBnU3luY0VuZ2luZSIsICJqb2luIiwgInRleHQiLCAicmVzb2x2ZSIsICJ3b3JrSXRlbUlkIl0KfQo=
