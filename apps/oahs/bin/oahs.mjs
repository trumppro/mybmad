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

// ../../packages/runner/src/index.ts
var src_exports = {};
__export(src_exports, {
  DEFAULT_VERIFICATION_ALLOWLIST: () => DEFAULT_VERIFICATION_ALLOWLIST,
  git: () => git,
  lintDoc: () => lintDoc,
  runOnce: () => runOnce,
  workLoop: () => workLoop
});
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync
} from "node:fs";
import { join, resolve } from "node:path";
import { parse as parseYaml2 } from "yaml";
function git(args, cwd) {
  const result = spawnSync("git", args, { cwd, encoding: "utf8" });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      `git ${args.join(" ")} failed with exit ${String(result.status)}: ${result.stderr.trim()}`
    );
  }
  return result.stdout.trim();
}
function ensureGitExcludes(repoPath) {
  const gitDir = join(repoPath, ".git");
  try {
    if (!statSync(gitDir).isDirectory()) return;
  } catch {
    return;
  }
  const infoDir = join(gitDir, "info");
  mkdirSync(infoDir, { recursive: true });
  const excludePath = join(infoDir, "exclude");
  const current = existsSync(excludePath) ? readFileSync(excludePath, "utf8") : "";
  const wanted = [".oahs/", MARKER_FILE];
  const have = new Set(current.split("\n").map((line) => line.trim()));
  const missing = wanted.filter((line) => !have.has(line));
  if (missing.length === 0) return;
  const prefix = current === "" || current.endsWith("\n") ? current : `${current}
`;
  writeFileSync(excludePath, `${prefix}${missing.join("\n")}
`, "utf8");
}
function removeWorktree(dir, repoPath) {
  try {
    git(["worktree", "remove", "--force", dir], repoPath);
  } catch {
    try {
      rmSync(dir, { recursive: true, force: true });
      git(["worktree", "prune"], repoPath);
    } catch {
    }
  }
}
function writeMarker(worktreeDir, marker) {
  writeFileSync(join(worktreeDir, MARKER_FILE), `${JSON.stringify(marker, null, 2)}
`, "utf8");
}
function readMarker(worktreeDir) {
  const path = join(worktreeDir, MARKER_FILE);
  if (!existsSync(path)) return null;
  try {
    const raw = JSON.parse(readFileSync(path, "utf8"));
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
  if (!existsSync(specAbsPath)) {
    return { status: null, blockingCondition: null, autoRunResult: null };
  }
  const { data, body } = splitFrontmatter2(readFileSync(specAbsPath, "utf8"));
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
  const raw = readFileSync(specAbsPath, "utf8");
  if (raw.startsWith("---")) {
    const close = raw.indexOf("\n---", 3);
    if (close !== -1) {
      const head = raw.slice(0, close);
      const rest = raw.slice(close);
      const replaced = /^status:.*$/m.test(head) ? head.replace(/^status:.*$/m, `status: ${status}`) : `${head}
status: ${status}`;
      writeFileSync(specAbsPath, replaced + rest, "utf8");
      return;
    }
  }
  writeFileSync(specAbsPath, `---
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
function isRemoteError(error, name) {
  return typeof error === "object" && error !== null && error.errorName === name;
}
async function finishRun(args) {
  const { client, workItem, claim } = args;
  const spec = readSpecReport(join(args.workDir, args.specRel));
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
    const run = spawnSync("bash", ["-c", command], {
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
  if (!existsSync(root)) return scan;
  for (const name of readdirSync(root)) {
    const dir = join(root, name);
    const marker = readMarker(dir);
    if (marker === null || marker.workItemId !== workItemId2) continue;
    let head = null;
    try {
      head = git(["rev-parse", "HEAD"], dir);
    } catch {
      head = null;
    }
    const status = normalizeStatus(readSpecReport(join(dir, specRel)).status);
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
    if (isRemoteError(error, "ConflictError")) {
      return { dispatched: false, details: `lost the claim race for ${picked.externalKey}` };
    }
    throw error;
  }
  const context = await client.call(
    "get_task_context",
    { workItemId: picked.id }
  );
  const workItem = context.workItem;
  const specRel = join(options.specFolder, workItem.specPath);
  const branch = `claim/${claim.id}`;
  const worktreesRoot = join(repoPath, ".oahs", "worktrees");
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
  const worktreeDir = join(worktreesRoot, claim.id);
  git(["worktree", "add", "-b", branch, worktreeDir, baseline], repoPath);
  writeMarker(worktreeDir, {
    workItemId: workItem.id,
    claimId: claim.id,
    baseline,
    invocations: 0
  });
  const specAbs = join(worktreeDir, specRel);
  if (existsSync(specAbs)) {
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
  const invoked = spawnSync("bash", ["-lc", command], {
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
var actors, grants, roleAssignments, workspaceState, gatePolicies, features, workItems, claims, gateDecisions, evidence, events, idempotencyKeys, threads, messages, mentions, notifications, agentJobs;
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
import { dirname as dirname3, join as join3 } from "node:path";
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
    workerPath = join3(here, "..", "dist", "worker.mjs");
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
import { readFileSync as readFileSync2 } from "node:fs";
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
  const yaml = readFileSync2(resolve2(opts.path), "utf8");
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
  const content = readFileSync2(resolve2(opts.path), "utf8");
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
import { join as join4 } from "node:path";

// ../spine-api/src/index.ts
init_src();

// ../spine-api/src/auth.ts
import { createHash, randomBytes } from "node:crypto";
import { existsSync as existsSync2, mkdirSync as mkdirSync2, readFileSync as readFileSync3, writeFileSync as writeFileSync2 } from "node:fs";
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
    if (this.persistPath !== void 0 && existsSync2(this.persistPath)) {
      const raw = JSON.parse(readFileSync3(this.persistPath, "utf8"));
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
    writeFileSync2(this.persistPath, JSON.stringify(shape, null, 2), "utf8");
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
import { readFileSync as readFileSync4 } from "node:fs";
import { dirname as dirname2, join as join2 } from "node:path";
import { fileURLToPath } from "node:url";
var publicDir = join2(dirname2(fileURLToPath(import.meta.url)), "..", "public");
var CONTENT_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8"
};
function registerUiRoutes(app) {
  const serve = (routePath, fileName, ext) => {
    app.get(routePath, (_request, reply) => {
      try {
        const content = readFileSync4(join2(publicDir, fileName));
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
    engine = createPgSyncEngine2({ dataDir: join4(options.dataDir, "pg") });
    tokenStore = new TokenStore({ persistPath: join4(options.dataDir, "tokens.json") });
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
  withClientFlags(program.command("events [streamId]")).description("audit query over the append-only event log").action(
    async (streamId, opts) => emit(
      () => eventsCommand(clientFrom(opts), streamId !== void 0 ? { streamId } : {})
    )
  );
  withClientFlags(program.command("work")).description("run the BYO worker loop against this spine (requires @oahs/runner)").requiredOption("--repo <path>", "target project git checkout").requiredOption("--spec-folder <rel>", "spec folder relative to the repo root").requiredOption("--agent-cmd <template>", "coding-agent command template ({SPEC_FOLDER} {STORY_ID} {INVOKE_WITH} {WORKTREE})").option("--once", "dispatch at most one work item, then exit").option("--poll <ms>", "poll interval in milliseconds").action(
    async (opts) => {
      try {
        const client = clientFrom(opts);
        const runner = await Promise.resolve().then(() => (init_src2(), src_exports));
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vLi4vLi4vcGFja2FnZXMvY29yZS9zcmMvdHlwZXMudHMiLCAiLi4vLi4vLi4vcGFja2FnZXMvY29yZS9zcmMvc3Rvcmllcy50cyIsICIuLi8uLi8uLi9wYWNrYWdlcy9jb3JlL3NyYy9lbmdpbmUudHMiLCAiLi4vLi4vLi4vcGFja2FnZXMvY29yZS9zcmMvaW50ZW50LWhhc2gudHMiLCAiLi4vLi4vLi4vcGFja2FnZXMvY29yZS9zcmMvaW5kZXgudHMiLCAiLi4vLi4vLi4vcGFja2FnZXMvcnVubmVyL3NyYy9kb2NsaW50LnRzIiwgIi4uLy4uLy4uL3BhY2thZ2VzL3J1bm5lci9zcmMvaW5kZXgudHMiLCAiLi4vLi4vLi4vcGFja2FnZXMvZGIvc3JjL3NjaGVtYS50cyIsICIuLi8uLi8uLi9wYWNrYWdlcy9kYi9zcmMvcGctZW5naW5lLnRzIiwgIi4uLy4uLy4uL3BhY2thZ2VzL2RiL3NyYy9zeW5jLWVuZ2luZS50cyIsICIuLi8uLi8uLi9wYWNrYWdlcy9kYi9zcmMvc2NoZW1hLXNxbC50cyIsICIuLi8uLi8uLi9wYWNrYWdlcy9kYi9zcmMvaW5kZXgudHMiLCAiLi4vc3JjL2NsaS50cyIsICIuLi8uLi8uLi9wYWNrYWdlcy9jb250cmFjdHMvc3JjL2luZGV4LnRzIiwgIi4uL3NyYy9jb21tYW5kcy9pbmRleC50cyIsICIuLi9zcmMvZm9ybWF0LnRzIiwgIi4uL3NyYy9jb21tYW5kcy9jb2xsYWIudHMiLCAiLi4vc3JjL3NlcnZlLnRzIiwgIi4uLy4uL3NwaW5lLWFwaS9zcmMvaW5kZXgudHMiLCAiLi4vLi4vc3BpbmUtYXBpL3NyYy9hdXRoLnRzIiwgIi4uLy4uL3NwaW5lLWFwaS9zcmMvc2VydmVyLnRzIiwgIi4uLy4uL3NwaW5lLWFwaS9zcmMvYnVzLnRzIiwgIi4uLy4uL3NwaW5lLWFwaS9zcmMvbWNwLnRzIiwgIi4uLy4uL3NwaW5lLWFwaS9zcmMvc3NlLnRzIiwgIi4uLy4uL3NwaW5lLWFwaS9zcmMvdWkudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbIi8qKlxuICogQG9haHMvY29yZSBcdTIwMTQgdHlwZXMsIGVycm9ycywgYW5kIHZvY2FidWxhcnkgb2YgdGhlIGRldGVybWluaXN0aWMgc3BpbmUuXG4gKlxuICogVGhlIGNvbmZvcm1hbmNlIHN1aXRlIGluIHRlc3QvIHdhcyB3cml0dGVuIEZJUlNULCBmcm9tIHRoZSBwcm9zZSBydWxlcyBpblxuICogdGhlIEJNQUQgc291cmNlIChibWFkLXNwcmludC1wbGFubmluZywgYm1hZC1kZXYtYXV0bywgYm1hZC1xdWljay1kZXYsXG4gKiBzdG9yaWVzLXNjaGVtYS5tZCkgYXMgYXJiaXRyYXRlZCBpbiBwcm9kdWN0LXJvYWRtYXAubWQgXHUwMEE3MS4gVGhlIGVuZ2luZSBpc1xuICogaW1wbGVtZW50ZWQgdG8gbWFrZSB0aGF0IHN1aXRlIHBhc3MgXHUyMDE0IG5ldmVyIHRoZSBvdGhlciB3YXkgYXJvdW5kLlxuICpcbiAqIEludmFyaWFudHMgZW5mb3JjZWQgaGVyZSBmb3JldmVyIChwcm9kdWN0LXJvYWRtYXAubWQgXHUwMEE3MC4xKTpcbiAqICAtIE5vIExMTSBTREsgaW1wb3J0LiBFdmVyLiAoQ0kgbGludClcbiAqICAtIEV2ZXJ5IG11dGF0aW9uIGdvZXMgdGhyb3VnaCBhIGNvbW1hbmQ7IGNvbW1hbmRzIGVtaXQgZXZlbnRzOyBwcm9qZWN0aW9uc1xuICogICAgYXJlIGNvbnNlcXVlbmNlcyBvZiBldmVudHMuXG4gKi9cblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBFcnJvcnNcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5leHBvcnQgY2xhc3MgTm90SW1wbGVtZW50ZWRFcnJvciBleHRlbmRzIEVycm9yIHtcbiAgY29uc3RydWN0b3Iod2hhdDogc3RyaW5nKSB7XG4gICAgc3VwZXIoYE5vdCBpbXBsZW1lbnRlZDogJHt3aGF0fWApO1xuICAgIHRoaXMubmFtZSA9ICdOb3RJbXBsZW1lbnRlZEVycm9yJztcbiAgfVxufVxuXG4vKiogQ29tbWFuZCByZWplY3RlZDogYWN0b3IgbGFja3MgdGhlIHJlcXVpcmVkIGdyYW50LiAqL1xuZXhwb3J0IGNsYXNzIFBlcm1pc3Npb25EZW5pZWRFcnJvciBleHRlbmRzIEVycm9yIHtcbiAgY29uc3RydWN0b3IoXG4gICAgcHVibGljIHJlYWRvbmx5IHBlcm1pc3Npb246IFBlcm1pc3Npb24sXG4gICAgcHVibGljIHJlYWRvbmx5IGFjdG9ySWQ6IHN0cmluZyxcbiAgKSB7XG4gICAgc3VwZXIoYHBlcm1pc3Npb24gZGVuaWVkOiAke3Blcm1pc3Npb259IGZvciBhY3RvciAke2FjdG9ySWR9YCk7XG4gICAgdGhpcy5uYW1lID0gJ1Blcm1pc3Npb25EZW5pZWRFcnJvcic7XG4gIH1cbn1cblxuLyoqIENvbW1hbmQgcmVqZWN0ZWQ6IEZTTSBndWFyZCBmYWlsZWQgKGluY2x1ZGVzIHRoZSBtYWNoaW5lLXJlYWRhYmxlIGd1YXJkIGNvZGUpLiAqL1xuZXhwb3J0IGNsYXNzIEd1YXJkRmFpbGVkRXJyb3IgZXh0ZW5kcyBFcnJvciB7XG4gIGNvbnN0cnVjdG9yKHB1YmxpYyByZWFkb25seSBndWFyZDogc3RyaW5nKSB7XG4gICAgc3VwZXIoYGd1YXJkIGZhaWxlZDogJHtndWFyZH1gKTtcbiAgICB0aGlzLm5hbWUgPSAnR3VhcmRGYWlsZWRFcnJvcic7XG4gIH1cbn1cblxuLyoqIENvbW1hbmQgcmVqZWN0ZWQ6IHN0YWxlIGZlbmNpbmcgdG9rZW4gb3Igc3RhdGVfdmVyc2lvbiBjb25mbGljdCAoSFRUUCA0MDkgc2VtYW50aWNzKS4gKi9cbmV4cG9ydCBjbGFzcyBDb25mbGljdEVycm9yIGV4dGVuZHMgRXJyb3Ige1xuICBjb25zdHJ1Y3RvcihwdWJsaWMgcmVhZG9ubHkgcmVhc29uOiBzdHJpbmcpIHtcbiAgICBzdXBlcihgY29uZmxpY3Q6ICR7cmVhc29ufWApO1xuICAgIHRoaXMubmFtZSA9ICdDb25mbGljdEVycm9yJztcbiAgfVxufVxuXG4vKiogVHJhbnNpdGlvbiBub3QgZGVjbGFyZWQgaW4gdGhlIHRhYmxlIChpbmNsdWRlcyBuZXZlci1kb3duZ3JhZGUgcmVqZWN0aW9ucykuICovXG5leHBvcnQgY2xhc3MgSW52YWxpZFRyYW5zaXRpb25FcnJvciBleHRlbmRzIEVycm9yIHtcbiAgY29uc3RydWN0b3IoXG4gICAgcHVibGljIHJlYWRvbmx5IGZyb206IFdvcmtJdGVtU3RhdGUsXG4gICAgcHVibGljIHJlYWRvbmx5IHRvOiBXb3JrSXRlbVN0YXRlLFxuICApIHtcbiAgICBzdXBlcihgaW52YWxpZCB0cmFuc2l0aW9uOiAke2Zyb219IC0+ICR7dG99YCk7XG4gICAgdGhpcy5uYW1lID0gJ0ludmFsaWRUcmFuc2l0aW9uRXJyb3InO1xuICB9XG59XG5cbi8qKiBzdG9yaWVzLnlhbWwgZmFpbGVkIGEgdmFsaWRpdHkgcnVsZSAoc3Rvcmllcy1zY2hlbWEubWQpLiAqL1xuZXhwb3J0IGNsYXNzIFN0b3JpZXNWYWxpZGF0aW9uRXJyb3IgZXh0ZW5kcyBFcnJvciB7XG4gIGNvbnN0cnVjdG9yKHB1YmxpYyByZWFkb25seSBydWxlOiBzdHJpbmcpIHtcbiAgICBzdXBlcihgc3Rvcmllcy55YW1sIGludmFsaWQ6ICR7cnVsZX1gKTtcbiAgICB0aGlzLm5hbWUgPSAnU3Rvcmllc1ZhbGlkYXRpb25FcnJvcic7XG4gIH1cbn1cblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBWb2NhYnVsYXJ5IChwcm9kdWN0LXJvYWRtYXAubWQgXHUwMEE3MC4yLCBcdTAwQTcxLjEpXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuZXhwb3J0IHR5cGUgQWN0b3JUeXBlID0gJ3VzZXInIHwgJ2FnZW50JyB8ICdzeXN0ZW0nO1xuXG5leHBvcnQgY29uc3QgV09SS19JVEVNX1NUQVRFUyA9IFtcbiAgJ2JhY2tsb2cnLFxuICAnZHJhZnQnLFxuICAncmVhZHlfZm9yX2RldicsXG4gICdpbl9wcm9ncmVzcycsXG4gICdpbl9yZXZpZXcnLFxuICAnZG9uZScsXG5dIGFzIGNvbnN0O1xuZXhwb3J0IHR5cGUgV29ya0l0ZW1TdGF0ZSA9ICh0eXBlb2YgV09SS19JVEVNX1NUQVRFUylbbnVtYmVyXTtcblxuLyoqIGJsb2NrZWQgaXMgYW4gT1ZFUkxBWSwgbm90IGEgc3RhdGUgKHJvYWRtYXAgRDgpLiBUYXhvbm9teSBmcm9tIGRldi1hdXRvIEhBTFQuICovXG5leHBvcnQgY29uc3QgQkxPQ0tFRF9SRUFTT05TID0gW1xuICAndW5jbGVhcl9pbnRlbnQnLFxuICAnbm9fc3Rvcmllc195YW1sX2ZvdW5kJyxcbiAgJ2FtYmlndW91c19zdG9yeV9maWxlX21hdGNoJyxcbiAgJ3Jldmlld19ub25fY29udmVyZ2VuY2UnLFxuICAnbm9fc3ViYWdlbnRzJyxcbiAgJ2RpcnR5X3RyZWUnLFxuICAnc3RhbGVfd29ya3RyZWUnLFxuICAnYXdhaXRpbmdfaHVtYW5faW5wdXQnLFxuICAnb3RoZXInLFxuXSBhcyBjb25zdDtcbmV4cG9ydCB0eXBlIEJsb2NrZWRSZWFzb24gPSAodHlwZW9mIEJMT0NLRURfUkVBU09OUylbbnVtYmVyXTtcblxuZXhwb3J0IHR5cGUgUGVybWlzc2lvbiA9XG4gIHwgJ3Rhc2sucGxhbidcbiAgfCAndGFzay5jbGFpbSdcbiAgfCAndGFzay5hZHZhbmNlJ1xuICB8ICd0YXNrLmJsb2NrJ1xuICB8ICdnYXRlLnNwZWMuYXBwcm92ZSdcbiAgfCAnZ2F0ZS5yZXZpZXcuYXBwcm92ZSdcbiAgfCAnZ2F0ZS5yZXZpZXcucmVqZWN0JyAvLyBQaGFzZSAyOiByZWplY3Rpb24tbG9vcGJhY2sgV0lUSE9VVCBkb25lLWFwcHJvdmFsIChyb2FkbWFwIFBoYXNlIDIgZXhpdCBjcml0ZXJpb24pXG4gIHwgJ2ZlYXR1cmUuaW5pdCdcbiAgfCAnZmVhdHVyZS5hZHZhbmNlJ1xuICB8ICdkaXNwYXRjaC5yZWxlYXNlX2hvbGQnXG4gIHwgJ2ludGVudC5lZGl0J1xuICB8ICdzdGF0ZS5kb3duZ3JhZGUnXG4gIHwgJ29wcy5mb3JjZV9yZWxlYXNlX2NsYWltJ1xuICB8ICdnb3Zlcm5hbmNlLmFkbWluJyAvLyBQaGFzZSAyOiBhdXRob3JpdHkgb3ZlciBnYXRlZCBlbnRpdGxlbWVudCB3cml0ZXMgKGhlbGQgdmlhIGdvdmVybmFuY2Ugcm9sZSwgbm90IGdyYW50cylcbiAgLy8gUGhhc2UgMyBpZGVudGl0eS92aXNpYmlsaXR5IGF1dGhvcml0aWVzIChjaGVja2VkIHN0cnVjdHVyYWxseSwgbm90IHZpYSBncmFudHMpOlxuICB8ICd0aHJlYWQucG9zdCdcbiAgfCAndGhyZWFkLnJlYWQnXG4gIHwgJ3RocmVhZC5pbnZpdGUnXG4gIHwgJ2FnZW50X2pvYi5jb21wbGV0ZSc7XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gRW50aXRsZW1lbnRzIChQaGFzZSAyLCByb2FkbWFwIFx1MDBBNzMpOiBwbGFuIFx1MDBENyBnb3Zlcm5hbmNlIHJvbGUgXHUwMEQ3IGRlbGl2ZXJ5IHJvbGUuXG4vLyBSZXNvbHV0aW9uIGlzIGEgUFVSRSBmdW5jdGlvbiBvdmVyIHRoaXMgZGF0YSBcdTIwMTQgbm8gaW50ZXJwcmV0YXRpb24gYW55d2hlcmUuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuZXhwb3J0IHR5cGUgR292ZXJuYW5jZVJvbGUgPSAnYWRtaW4nIHwgJ21lbWJlcicgfCAnYXVkaXRvcic7XG5cbmV4cG9ydCB0eXBlIFBsYW5Db2RlID0gJ2ZyZWUnIHwgJ3RlYW0nIHwgJ2VudGVycHJpc2UnO1xuXG4vKipcbiAqIFBsYW4gaXMgYSBDRUlMSU5HLCBuZXZlciBhIGdyYW50IChyb2FkbWFwIFx1MDBBNzMpLiBJdCBib3VuZHMgd2hhdCBtYXkgYmVcbiAqIGdyYW50ZWQgdG8gQUdFTlQgYWN0b3JzOyB1c2VyIGFjdG9ycyBhcmUgbmV2ZXIgcGxhbi1maWx0ZXJlZC4gRW5mb3JjZWQgaW5cbiAqIHRoZSByZXNvbHZlciBhbmQgYXQgZ3JhbnQgdGltZSBcdTIwMTQgbm93aGVyZSBlbHNlLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIFBsYW5DZWlsaW5nIHtcbiAgLyoqIG1heSBhZ2VudHMgaG9sZCBnYXRlLUFQUFJPVkFMIHBlcm1pc3Npb25zIChzcGVjL3JldmlldyBhcHByb3ZlKT8gKi9cbiAgYWdlbnRHYXRlQXBwcm92ZTogYm9vbGVhbjtcbiAgLyoqIG1heSBhZ2VudHMgaG9sZCB0aGUgcmVqZWN0aW9uLWxvb3BiYWNrIHBlcm1pc3Npb24/ICovXG4gIGFnZW50R2F0ZVJlamVjdDogYm9vbGVhbjtcbn1cblxuZXhwb3J0IGNvbnN0IFBMQU5fQ0VJTElOR1M6IFJlY29yZDxQbGFuQ29kZSwgUGxhbkNlaWxpbmc+ID0ge1xuICBmcmVlOiB7IGFnZW50R2F0ZUFwcHJvdmU6IGZhbHNlLCBhZ2VudEdhdGVSZWplY3Q6IGZhbHNlIH0sXG4gIHRlYW06IHsgYWdlbnRHYXRlQXBwcm92ZTogZmFsc2UsIGFnZW50R2F0ZVJlamVjdDogdHJ1ZSB9LFxuICBlbnRlcnByaXNlOiB7IGFnZW50R2F0ZUFwcHJvdmU6IHRydWUsIGFnZW50R2F0ZVJlamVjdDogdHJ1ZSB9LFxufTtcblxuLyoqIFNlbGYtaG9zdCBkZWZhdWx0OiB0aGUgY2VpbGluZyBpcyBvcGVuOyB0aGUgb3JnIG5hcnJvd3MgKHJlc3RyaWN0LW9ubHkpLiAqL1xuZXhwb3J0IGNvbnN0IERFRkFVTFRfUExBTjogUGxhbkNvZGUgPSAnZW50ZXJwcmlzZSc7XG5cbi8qKiBHYXRlLWFwcHJvdmFsIHBlcm1pc3Npb25zIGJvdW5kZWQgYnkgUGxhbkNlaWxpbmcuYWdlbnRHYXRlQXBwcm92ZS4gKi9cbmV4cG9ydCBjb25zdCBBR0VOVF9HQVRFX0FQUFJPVkVfUEVSTUlTU0lPTlM6IHJlYWRvbmx5IFBlcm1pc3Npb25bXSA9IFtcbiAgJ2dhdGUuc3BlYy5hcHByb3ZlJyxcbiAgJ2dhdGUucmV2aWV3LmFwcHJvdmUnLFxuXTtcblxuLyoqXG4gKiBEZWxpdmVyeSByb2xlcyAocm9hZG1hcCBcdTAwQTczKSBcdTIwMTQgcGVybWlzc2lvbiBidW5kbGVzLCB2ZXJzaW9uZWQgZGF0YSBvZiB0aGVcbiAqIFJ1bGVzIGxheWVyLiBBbiBhc3NpZ25tZW50IGdyYW50cyB0aGUgYnVuZGxlOyByZXZvY2F0aW9uIHJlbW92ZXMgaXQuXG4gKi9cbmV4cG9ydCBjb25zdCBERUxJVkVSWV9ST0xFUzogUmVjb3JkPHN0cmluZywgcmVhZG9ubHkgUGVybWlzc2lvbltdPiA9IHtcbiAgcHJvZHVjdF9vd25lcjogWyd0YXNrLnBsYW4nLCAnZmVhdHVyZS5pbml0JywgJ2ZlYXR1cmUuYWR2YW5jZScsICdnYXRlLnNwZWMuYXBwcm92ZScsICdkaXNwYXRjaC5yZWxlYXNlX2hvbGQnXSxcbiAgdGVjaF9sZWFkOiBbJ3Rhc2sucGxhbicsICdnYXRlLnJldmlldy5hcHByb3ZlJywgJ2dhdGUucmV2aWV3LnJlamVjdCcsICdzdGF0ZS5kb3duZ3JhZGUnLCAnb3BzLmZvcmNlX3JlbGVhc2VfY2xhaW0nXSxcbiAgcmV2aWV3ZXI6IFsnZ2F0ZS5yZXZpZXcuYXBwcm92ZScsICdnYXRlLnJldmlldy5yZWplY3QnXSxcbiAgZGV2ZWxvcGVyOiBbJ3Rhc2suY2xhaW0nLCAndGFzay5hZHZhbmNlJywgJ3Rhc2suYmxvY2snXSxcbiAgcWE6IFsndGFzay5ibG9jayddLFxuICBjb250cmlidXRvcjogW10sXG59O1xuXG4vKipcbiAqIFdvcmtzcGFjZSBwb2xpY3kgXHUyMDE0IFJFU1RSSUNULU9OTFkga2V5cyAocm9hZG1hcCBcdTAwQTczKTogYSBwb2xpY3kgY2FuIG5hcnJvd1xuICogd2hhdCB0aGUgcGxhbiBhbGxvd3MsIG5ldmVyIHdpZGVuIGl0LiBVbmRlZmluZWQgPSBubyByZXN0cmljdGlvbi5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBXb3Jrc3BhY2VQb2xpY3kge1xuICAvKiogZmFsc2UgXHUyMUQyIGFnZW50cyBjYW5ub3QgZXhlcmNpc2UgZ2F0ZS1hcHByb3ZhbCBwZXJtaXNzaW9ucyBldmVuIGlmIGdyYW50ZWQgKi9cbiAgYWdlbnRHYXRlQXBwcm92YWxzPzogYm9vbGVhbjtcbiAgLyoqIGZhbHNlIFx1MjFEMiBhZ2VudHMgY2Fubm90IGNsYWltIHRhc2tzIG9uIHRoZWlyIG93biAobWVudGlvbi1kaXNwYXRjaCBvbmx5LCBQaGFzZSAzKSAqL1xuICBhZ2VudFNlbGZEaXNwYXRjaD86IGJvb2xlYW47XG4gIC8qKiBmYWxzZSBcdTIxRDIgbWVudGlvbnMgb2YgYWdlbnRzIG5ldmVyIG1hdGVyaWFsaXplIGpvYnMgKFBoYXNlIDMgcm91dGVyIGtpbGwtc3dpdGNoKSAqL1xuICBtZW50aW9uRGlzcGF0Y2g/OiBib29sZWFuO1xuICAvKiogdHJ1ZSBcdTIxRDIgYW4gYWdlbnQncyBtZW50aW9uIG9mIGFub3RoZXIgYWdlbnQgbWF5IG1hdGVyaWFsaXplIGEgam9iIChkZXB0aC1jYXBwZWQpOyBkZWZhdWx0IE9GRiAoXHUwMEE3NS40KSAqL1xuICBhZ2VudE1lbnRpb25BZ2VudD86IGJvb2xlYW47XG59XG5cbi8qKiBHYXRlIGRlZmluaXRpb25zIGFyZSBkYXRhIChyb2FkbWFwIFx1MDBBNzMpOiBxdW9ydW0gKyBhY3Rvci10eXBlIHJlcXVpcmVtZW50cy4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgR2F0ZVBvbGljeSB7XG4gIC8qKiBkaXN0aW5jdCBhcHByb3ZlcnMgcmVxdWlyZWQgaW4gdGhlIGN1cnJlbnQgcmV2aWV3IHJvdW5kIChkZWZhdWx0IDEpICovXG4gIG1pbkFwcHJvdmFscz86IG51bWJlcjtcbiAgLyoqIGF0IGxlYXN0IG9uZSBhcHByb3ZlciBvZiBlYWNoIGxpc3RlZCB0eXBlIGlzIHJlcXVpcmVkIChlLmcuIFsndXNlciddKSAqL1xuICByZXF1aXJlZEFjdG9yVHlwZXM/OiBBY3RvclR5cGVbXTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBSb2xlQXNzaWdubWVudCB7XG4gIGFjdG9ySWQ6IHN0cmluZztcbiAgcm9sZUNvZGU6IHN0cmluZztcbiAgZ3JhbnRlZEJ5OiBzdHJpbmc7XG4gIHJldm9rZWQ6IGJvb2xlYW47XG59XG5cbi8qKiBhdXRoei5leHBsYWluIFx1MjAxNCB0aGUgZGVjaXNpb24gdHJhY2UgYW4gYXVkaXRvciBjYW4gcmVwbGF5IChyb2FkbWFwIFx1MDBBNzMpLiAqL1xuZXhwb3J0IGludGVyZmFjZSBBdXRoekV4cGxhbmF0aW9uIHtcbiAgYWN0b3JJZDogc3RyaW5nO1xuICBwZXJtaXNzaW9uOiBQZXJtaXNzaW9uO1xuICBhbGxvd2VkOiBib29sZWFuO1xuICAvKiogJ2RpcmVjdCcgfCAncm9sZTo8Y29kZT4nIHdoZW4gYSBncmFudCBleGlzdHM7IG51bGwgd2hlbiBub25lIGRvZXMgKi9cbiAgc291cmNlOiBzdHJpbmcgfCBudWxsO1xuICBnb3Zlcm5hbmNlUm9sZTogR292ZXJuYW5jZVJvbGU7XG4gIHBsYW46IFBsYW5Db2RlO1xuICAvKiogZmFsc2Ugd2hlbiB0aGUgcGxhbiBjZWlsaW5nIGJsb2NrcyBhbiBhZ2VudCdzIGdhdGUgcGVybWlzc2lvbiAqL1xuICBwbGFuQWxsb3dzOiBib29sZWFuO1xuICAvKiogZmFsc2Ugd2hlbiB0aGUgcmVzdHJpY3Qtb25seSB3b3Jrc3BhY2UgcG9saWN5IGJsb2NrcyBpdCAqL1xuICBwb2xpY3lBbGxvd3M6IGJvb2xlYW47XG4gIHZlcnNpb25zOiB7IHBsYW46IG51bWJlcjsgcG9saWN5OiBudW1iZXIgfTtcbn1cblxuZXhwb3J0IHR5cGUgR2F0ZUNvZGUgPSAnc3BlY19hcHByb3ZhbCcgfCAncmV2aWV3X2FwcHJvdmFsJztcblxuZXhwb3J0IHR5cGUgRXZpZGVuY2VLaW5kID1cbiAgfCAndGVzdF9ydW4nIC8vIHtjb21tYW5kLCBleGl0Q29kZX0gIFx1MjAxNCBjb21tYW5kIE1VU1QgbWF0Y2ggYSBwaW5uZWQgb25lXG4gIHwgJ2dpdF9kaWZmJyAvLyB7YmFzZWxpbmUsIGZpbmFsLCBmaWxlc0NoYW5nZWQsIG5vbkVtcHR5LCBicmFuY2h9XG4gIHwgJ2NvbW1pdCcgLy8ge3NoYSwgYnJhbmNoLCByZWFjaGFibGVPblJlbW90ZX1cbiAgfCAnaGFsdF9yZXBvcnQnIC8vIHZlcmJhdGltIEF1dG8gUnVuIFJlc3VsdFxuICB8ICdyZXZpZXdfcmVwb3J0JyAvLyBMTE0tYXV0aG9yZWQ7IE5FVkVSIGEgZ3VhcmQsIGNvbnRleHQgb25seVxuICB8ICdkb2NfbGludCc7IC8vIHtzY2hlbWFWYWxpZH0gZm9yIG5vbi1jb2RlIHdvcmtcblxuZXhwb3J0IGludGVyZmFjZSBFdmlkZW5jZSB7XG4gIGtpbmQ6IEV2aWRlbmNlS2luZDtcbiAgcGF5bG9hZDogUmVjb3JkPHN0cmluZywgdW5rbm93bj47XG59XG5cbi8qKiBSZXZpZXcgbG9vcDogZXhhY3RseSB0aGlzIG1hbnkgbG9vcGJhY2tzIGFsbG93ZWQ7IHRoZSBuZXh0IG9uZSBibG9ja3MuICovXG5leHBvcnQgY29uc3QgUkVWSUVXX0xPT1BfTElNSVQgPSA1O1xuXG5leHBvcnQgY29uc3QgSU5URU5UX0hBU0hfQUxHTyA9ICd2MSc7XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gRW50aXRpZXMgKHByb2plY3Rpb24gc2hhcGVzIHJldHVybmVkIGJ5IHF1ZXJpZXMpXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuZXhwb3J0IGludGVyZmFjZSBBY3RvciB7XG4gIGlkOiBzdHJpbmc7XG4gIHR5cGU6IEFjdG9yVHlwZTtcbiAgZGlzcGxheU5hbWU6IHN0cmluZztcbiAgLyoqIFBsYXlib29rIHBlcnNvbmEgdGhpcyBhZ2VudCBlbWJvZGllcyAoZS5nLiAnYm1hZC1hZ2VudC1wbScpOyBudWxsIGZvciBodW1hbnMgYW5kIHBsYWluIGFnZW50cy4gKi9cbiAgcGVyc29uYUNvZGU6IHN0cmluZyB8IG51bGw7XG59XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gV29yay1pdGVtIGtpbmRzIChQaGFzZSA0LCByb2FkbWFwIEJ1aWxkIHBoYXNlcyk6IHRoZSB3b3JrZXIgYnJvYWRlbnMuXG4vLyBLaW5kIHNlbGVjdHMgV0hJQ0ggbWFjaGluZS1ldmlkZW5jZSBndWFyZHMgYXBwbHkgXHUyMDE0IG5ldmVyIFdITyBtYXkgcGFzcyBhXG4vLyBnYXRlICh0aGF0IHN0YXlzIGdyYW50cyArIGdhdGUgcG9saWN5KS5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5leHBvcnQgY29uc3QgV09SS19JVEVNX0tJTkRTID0gWydjb2RlJywgJ3NwZWNfZHJhZnQnLCAnZGVzaWduX3JldmlldycsICdxYV9yZXBvcnQnLCAnZG9jJ10gYXMgY29uc3Q7XG5leHBvcnQgdHlwZSBXb3JrSXRlbUtpbmQgPSAodHlwZW9mIFdPUktfSVRFTV9LSU5EUylbbnVtYmVyXTtcblxuLyoqXG4gKiBUaGUgc2l4IEJNQUQgcGVyc29uYXMgcHJvdmlzaW9uIGFzIGRlZmF1bHQgYWdlbnQgYWN0b3JzIHBlciB3b3Jrc3BhY2VcbiAqIChyb2FkbWFwIFx1MDBBNzMpLiBGbG9vci1zdGF0ZSBkZWZhdWx0cyAodGhlc2lzKTogQW1lbGlhIGhvbGRzIGBkZXZlbG9wZXJgO1xuICogZXZlcnlvbmUgZWxzZSBgY29udHJpYnV0b3JgOyBOTyBwZXJzb25hIGhvbGRzIGEgZ2F0ZSB1bnRpbCBhIHBlcm1pdHRlZFxuICogYWN0b3IgZ3JhbnRzIG9uZS5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBQZXJzb25hRGVmIHtcbiAgcGVyc29uYUNvZGU6IHN0cmluZzsgLy8gQk1BRCBwbGF5Ym9vayBza2lsbFxuICBkaXNwbGF5TmFtZTogc3RyaW5nO1xuICBkZWZhdWx0Um9sZToga2V5b2YgdHlwZW9mIERFTElWRVJZX1JPTEVTO1xufVxuXG5leHBvcnQgY29uc3QgUEVSU09OQVM6IHJlYWRvbmx5IFBlcnNvbmFEZWZbXSA9IFtcbiAgeyBwZXJzb25hQ29kZTogJ2JtYWQtYWdlbnQtYW5hbHlzdCcsIGRpc3BsYXlOYW1lOiAnTWFyeSAoQW5hbHlzdCknLCBkZWZhdWx0Um9sZTogJ2NvbnRyaWJ1dG9yJyB9LFxuICB7IHBlcnNvbmFDb2RlOiAnYm1hZC1hZ2VudC10ZWNoLXdyaXRlcicsIGRpc3BsYXlOYW1lOiAnUGFpZ2UgKFRlY2ggV3JpdGVyKScsIGRlZmF1bHRSb2xlOiAnY29udHJpYnV0b3InIH0sXG4gIHsgcGVyc29uYUNvZGU6ICdibWFkLWFnZW50LXBtJywgZGlzcGxheU5hbWU6ICdKb2huIChQTSknLCBkZWZhdWx0Um9sZTogJ2NvbnRyaWJ1dG9yJyB9LFxuICB7IHBlcnNvbmFDb2RlOiAnYm1hZC1hZ2VudC11eC1kZXNpZ25lcicsIGRpc3BsYXlOYW1lOiAnU2FsbHkgKFVYKScsIGRlZmF1bHRSb2xlOiAnY29udHJpYnV0b3InIH0sXG4gIHsgcGVyc29uYUNvZGU6ICdibWFkLWFnZW50LWFyY2hpdGVjdCcsIGRpc3BsYXlOYW1lOiAnV2luc3RvbiAoQXJjaGl0ZWN0KScsIGRlZmF1bHRSb2xlOiAnY29udHJpYnV0b3InIH0sXG4gIHsgcGVyc29uYUNvZGU6ICdibWFkLWFnZW50LWRldicsIGRpc3BsYXlOYW1lOiAnQW1lbGlhIChEZXYpJywgZGVmYXVsdFJvbGU6ICdkZXZlbG9wZXInIH0sXG5dO1xuXG5leHBvcnQgaW50ZXJmYWNlIEZlYXR1cmUge1xuICBpZDogc3RyaW5nO1xuICBzdGF0ZTogJ2JhY2tsb2cnIHwgJ2luX3Byb2dyZXNzJyB8ICdkb25lJztcbiAgLyoqIHRydWUgd2hpbGUgYSBkb25lX2NoZWNrcG9pbnQgaG9sZCBpcyBhY3RpdmU6IG5vIGZ1cnRoZXIgZGlzcGF0Y2ggaW4gdGhpcyBmZWF0dXJlICovXG4gIGRpc3BhdGNoSG9sZDogYm9vbGVhbjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBXb3JrSXRlbSB7XG4gIGlkOiBzdHJpbmc7XG4gIGZlYXR1cmVJZDogc3RyaW5nO1xuICBleHRlcm5hbEtleTogc3RyaW5nOyAvLyBpZCBmcm9tIHN0b3JpZXMueWFtbCwgZS5nLiBcIjMtMlwiXG4gIGtpbmQ6IFdvcmtJdGVtS2luZDsgLy8gJ2NvZGUnIHVubGVzcyBjcmVhdGVkIG90aGVyd2lzZSBcdTIwMTQgc2VsZWN0cyBldmlkZW5jZSBndWFyZHMgKFBoYXNlIDQpXG4gIHRpdGxlOiBzdHJpbmc7XG4gIHN0YXRlOiBXb3JrSXRlbVN0YXRlO1xuICBibG9ja2VkUmVhc29uOiBCbG9ja2VkUmVhc29uIHwgbnVsbDtcbiAgcmV2aWV3TG9vcEl0ZXJhdGlvbjogbnVtYmVyO1xuICBpbnRlbnRIYXNoOiBzdHJpbmcgfCBudWxsO1xuICBwaW5uZWRWZXJpZmljYXRpb246IHN0cmluZ1tdIHwgbnVsbDtcbiAgc3BlY0NoZWNrcG9pbnQ6IGJvb2xlYW47XG4gIGRvbmVDaGVja3BvaW50OiBib29sZWFuO1xuICBpbnZva2VEZXZXaXRoOiBzdHJpbmc7XG4gIHNwZWNQYXRoOiBzdHJpbmc7XG4gIHN0YXRlVmVyc2lvbjogbnVtYmVyO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIENsYWltIHtcbiAgaWQ6IHN0cmluZztcbiAgd29ya0l0ZW1JZDogc3RyaW5nO1xuICBhY3RvcklkOiBzdHJpbmc7XG4gIGZlbmNpbmdUb2tlbjogbnVtYmVyO1xuICBsZWFzZUV4cGlyZXNBdDogbnVtYmVyOyAvLyBlbmdpbmUtY2xvY2sgbXNcbiAgcmVsZWFzZWQ6IGJvb2xlYW47XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgU3BpbmVFdmVudCB7XG4gIGdsb2JhbFNlcTogbnVtYmVyO1xuICBzdHJlYW1UeXBlOiAnd29ya3NwYWNlJyB8ICdmZWF0dXJlJyB8ICd3b3JrX2l0ZW0nIHwgJ2FjdG9yJyB8ICd0aHJlYWQnIHwgJ2FnZW50X2pvYic7XG4gIHN0cmVhbUlkOiBzdHJpbmc7XG4gIHN0cmVhbVNlcTogbnVtYmVyO1xuICB0eXBlOiBzdHJpbmc7XG4gIGFjdG9ySWQ6IHN0cmluZztcbiAgcGF5bG9hZDogUmVjb3JkPHN0cmluZywgdW5rbm93bj47XG4gIGNhdXNhdGlvbklkPzogc3RyaW5nO1xufVxuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIENvbGxhYm9yYXRpb24gKFBoYXNlIDMsIHJvYWRtYXAgXHUwMEE3NSk6IHRoZSBjaGF0IFNVUkZBQ0UuIFNhY3JlZCBib3VuZGFyeVxuLy8gKFx1MDBBNzUuMik6IGEgbWVzc2FnZSBORVZFUiBtdXRhdGVzIGxpZmVjeWNsZTsgdGhlIG9ubHkgY3Jvc3MtZGlyZWN0aW9uIGlzXG4vLyByYWlscyBcdTIxOTIgY2hhdCAoc3lzdGVtIG5hcnJhdGlvbikuIE1lbnRpb25zIGFyZSBTVFJVQ1RVUkVEIGRhdGEgXHUyMDE0IHRoZSBzZXJ2ZXJcbi8vIG5ldmVyIHBhcnNlcyBtZXNzYWdlIHRleHQuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuZXhwb3J0IHR5cGUgVGhyZWFkS2luZCA9ICdzcGVjJyB8ICdkZXNpZ24nIHwgJ3Rhc2snIHwgJ2dlbmVyYWwnIHwgJ3ByaXZhdGUnO1xuZXhwb3J0IHR5cGUgVGhyZWFkVmlzaWJpbGl0eSA9ICdvcGVuJyB8ICdwcml2YXRlJztcblxuZXhwb3J0IGludGVyZmFjZSBUaHJlYWQge1xuICBpZDogc3RyaW5nO1xuICBmZWF0dXJlSWQ6IHN0cmluZyB8IG51bGw7XG4gIHdvcmtJdGVtSWQ6IHN0cmluZyB8IG51bGw7XG4gIGtpbmQ6IFRocmVhZEtpbmQ7XG4gIHZpc2liaWxpdHk6IFRocmVhZFZpc2liaWxpdHk7XG4gIGNyZWF0ZWRCeTogc3RyaW5nO1xuICBwYXJ0aWNpcGFudHM6IHN0cmluZ1tdOyAvLyBlbmZvcmNlZCBmb3IgcHJpdmF0ZSB0aHJlYWRzOyBpbmZvcm1hdGlvbmFsIGZvciBvcGVuIG9uZXNcbn1cblxuZXhwb3J0IGludGVyZmFjZSBNZXNzYWdlIHtcbiAgaWQ6IHN0cmluZztcbiAgdGhyZWFkSWQ6IHN0cmluZztcbiAgc2VxOiBudW1iZXI7IC8vIHBlci10aHJlYWQsIDEtYmFzZWQsIGdhcC1mcmVlXG4gIGF1dGhvcklkOiBzdHJpbmc7IC8vIGEgdXNlciBPUiBhbiBhZ2VudCAodGhlc2lzIFx1MDBBNzUuMykgXHUyMDE0IG9yIHRoZSBzeXN0ZW0gYWN0b3IgZm9yIG5hcnJhdGlvblxuICBraW5kOiAnY2hhdCcgfCAnc3lzdGVtJztcbiAgYm9keTogc3RyaW5nO1xuICByZXBseVRvOiBzdHJpbmcgfCBudWxsO1xufVxuXG4vKiogV2h5IGEgbWVudGlvbiBkaWQgb3IgZGlkIG5vdCBtYXRlcmlhbGl6ZSBhbiBhZ2VudCBqb2IgKFx1MDBBNzUuNCByb3V0ZXIgXHUyMDE0IHB1cmUgY29kZSkuICovXG5leHBvcnQgdHlwZSBNZW50aW9uUmVzb2x1dGlvbiA9XG4gIHwgJ25vdGlmaWVkJyAvLyBodW1hbiBtZW50aW9uZWQgXHUyMTkyIG5vdGlmaWNhdGlvbiBvbmx5XG4gIHwgJ2pvYl9jcmVhdGVkJyAvLyBhZ2VudCBtZW50aW9uZWQsIHJvdXRlciBwb2xpY3kgYWxsb3dzIFx1MjE5MiBhZ2VudF9qb2IgcXVldWVkXG4gIHwgJ2RlbmllZF9wb2xpY3knIC8vIGRlZmF1bHQtZGVueTogbWVudGlvbmVyIGxhY2tzIGludm9rZSBhdXRob3JpdHksIG9yIHBvbGljeSBvZmZcbiAgfCAnZGVuaWVkX2RlcHRoJzsgLy8gYWdlbnQtbWVudGlvbi1hZ2VudCBjaGFpbiBleGNlZWRlZCB0aGUgZGVwdGggY2FwXG5cbmV4cG9ydCBpbnRlcmZhY2UgTWVudGlvbiB7XG4gIG1lc3NhZ2VJZDogc3RyaW5nO1xuICBtZW50aW9uZWRBY3RvcklkOiBzdHJpbmc7XG4gIHJlc29sdXRpb246IE1lbnRpb25SZXNvbHV0aW9uO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIE5vdGlmaWNhdGlvbiB7XG4gIGlkOiBzdHJpbmc7XG4gIGFjdG9ySWQ6IHN0cmluZztcbiAgc291cmNlOiAnbWVudGlvbicgfCAnam9iX2NvbXBsZXRlZCc7XG4gIHJlZklkOiBzdHJpbmc7IC8vIG1lc3NhZ2VJZCBmb3IgbWVudGlvbnMsIGpvYklkIGZvciBjb21wbGV0aW9uc1xuICByZWFkOiBib29sZWFuO1xufVxuXG4vKipcbiAqIFJvdXRlci1tYXRlcmlhbGl6ZWQgd29yayBmb3IgYW4gYWdlbnQgKFx1MDBBNzUuNCkuIFJlcGx5LW9ubHkgY29udGV4dDogdGhlIGpvYlxuICogTkVWRVIgY2FycmllcyBhIGNsYWltIG9yIHByZS1hdXRob3JpemVkIGxpZmVjeWNsZSBhdXRob3JpdHkgXHUyMDE0IHRoZSBhZ2VudFxuICogbXV0YXRlcyBzdGF0ZSBvbmx5IHRocm91Z2ggaXRzIG93biBncmFudHMsIG9yIG5vdCBhdCBhbGwuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQWdlbnRKb2Ige1xuICBpZDogc3RyaW5nO1xuICBhZ2VudEFjdG9ySWQ6IHN0cmluZztcbiAgdGhyZWFkSWQ6IHN0cmluZztcbiAgbWVzc2FnZUlkOiBzdHJpbmc7IC8vIHRoZSB0cmlnZ2VyaW5nIG1lbnRpb25cbiAgd29ya0l0ZW1JZDogc3RyaW5nIHwgbnVsbDsgLy8gY29udGV4dCB3aGVuIHRoZSB0aHJlYWQgaXMgdGFzay1ib3VuZFxuICBmZWF0dXJlSWQ6IHN0cmluZyB8IG51bGw7XG4gIHN0YXR1czogJ3F1ZXVlZCcgfCAnZG9uZScgfCAnYmxvY2tlZCc7XG4gIGRlcHRoOiBudW1iZXI7IC8vIDAgPSBodW1hbi10cmlnZ2VyZWQ7ICsxIHBlciBhZ2VudC1tZW50aW9uLWFnZW50IGhvcFxuICBub3RlOiBzdHJpbmcgfCBudWxsO1xufVxuXG4vKiogRGVwdGggY2FwIGZvciBhZ2VudC1tZW50aW9uLWFnZW50IGNoYWlucyAoXHUwMEE3NS40OiBcImRlcHRoIGNvdW50ZXJcIikuICovXG5leHBvcnQgY29uc3QgQUdFTlRfSk9CX01BWF9ERVBUSCA9IDI7XG5cbmV4cG9ydCBpbnRlcmZhY2UgRGl2ZXJnZW5jZVJlcG9ydCB7XG4gIHdvcmtJdGVtSWQ6IHN0cmluZztcbiAgZmlsZVN0YXRlOiBzdHJpbmc7XG4gIGRiU3RhdGU6IFdvcmtJdGVtU3RhdGU7XG4gIGtpbmQ6ICdmaWxlX2FoZWFkJyB8ICdkYl9haGVhZCcgfCAnY29uZmxpY3QnO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFN0b3JpZXNJbXBvcnRSZXN1bHQge1xuICBpbXBvcnRlZDogc3RyaW5nW107IC8vIGV4dGVybmFsS2V5cyBjcmVhdGVkXG4gIHVwZGF0ZWQ6IHN0cmluZ1tdOyAvLyBleHRlcm5hbEtleXMgYWxyZWFkeSBwcmVzZW50LCByZWZyZXNoZWRcbiAgd2FybmluZ3M6IHN0cmluZ1tdOyAvLyBlLmcuIHNraXBwZWQgcmV0cm9zcGVjdGl2ZSBlbnRyaWVzXG59XG5cblxuLy8gVGhlIHByb2R1Y3Rpb24gc2VydmljZSB3cmFwcyB0aGUgc2FtZSBjb3JlIHdpdGggUG9zdGdyZXMgcGVyc2lzdGVuY2UuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuZXhwb3J0IGludGVyZmFjZSBDcmVhdGVXb3JrSXRlbUlucHV0IHtcbiAgZmVhdHVyZUlkOiBzdHJpbmc7XG4gIGV4dGVybmFsS2V5OiBzdHJpbmc7XG4gIHRpdGxlOiBzdHJpbmc7XG4gIGtpbmQ/OiBXb3JrSXRlbUtpbmQ7IC8vIGRlZmF1bHQgJ2NvZGUnXG4gIHNwZWNDaGVja3BvaW50PzogYm9vbGVhbjtcbiAgZG9uZUNoZWNrcG9pbnQ/OiBib29sZWFuO1xuICBpbnZva2VEZXZXaXRoPzogc3RyaW5nO1xuICBkZXBlbmRzT24/OiBzdHJpbmdbXTsgLy8gZXh0ZXJuYWxLZXlzXG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQWR2YW5jZUlucHV0IHtcbiAgd29ya0l0ZW1JZDogc3RyaW5nO1xuICB0bzogV29ya0l0ZW1TdGF0ZTtcbiAgYWN0b3JJZDogc3RyaW5nO1xuICBmZW5jaW5nVG9rZW4/OiBudW1iZXI7IC8vIHJlcXVpcmVkIGZvciBjbGFpbS1ndWFyZGVkIHRyYW5zaXRpb25zXG4gIGlkZW1wb3RlbmN5S2V5Pzogc3RyaW5nO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEdhdGVEZWNpc2lvbklucHV0IHtcbiAgd29ya0l0ZW1JZDogc3RyaW5nO1xuICBnYXRlOiBHYXRlQ29kZTtcbiAgYWN0b3JJZDogc3RyaW5nO1xuICAvKiogc3BlY19hcHByb3ZhbCBvbmx5OiBwaW5zIHZlcmlmaWNhdGlvbiBjb21tYW5kcyBhcyBSdWxlcy1sYXllciBkYXRhIChyb2FkbWFwIEQ3KSAqL1xuICBwaW5uZWRWZXJpZmljYXRpb24/OiBzdHJpbmdbXTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBTcGluZUVuZ2luZSB7XG4gIC8vIC0tIHNldHVwIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICBjcmVhdGVBY3RvcihpbnB1dDoge1xuICAgIHR5cGU6IEV4Y2x1ZGU8QWN0b3JUeXBlLCAnc3lzdGVtJz47XG4gICAgZGlzcGxheU5hbWU6IHN0cmluZztcbiAgICAvKiogYm9vdHN0cmFwIHBsdW1iaW5nIChsaWtlIGNyZWF0ZUFjdG9yIGl0c2VsZik7IGRlZmF1bHQgJ21lbWJlcicgKi9cbiAgICBnb3Zlcm5hbmNlUm9sZT86IEdvdmVybmFuY2VSb2xlO1xuICAgIHBlcnNvbmFDb2RlPzogc3RyaW5nO1xuICB9KTogQWN0b3I7XG4gIC8qKiBBbGwgYWN0b3JzLCBwZXJzb25hcyBhbmQgc3lzdGVtIGluY2x1ZGVkICh0cmFuc3BhcmVuY3kgZm9yIHBpY2tlcnMvYXVkaXQpLiAqL1xuICBsaXN0QWN0b3JzKCk6IEFjdG9yW107XG4gIC8qKiBJZGVtcG90ZW50bHkgY3JlYXRlIHRoZSBzaXggQk1BRCBwZXJzb25hIGFnZW50IGFjdG9ycyB3aXRoIGZsb29yLXN0YXRlIHJvbGVzIChnYXRlZCB3cml0ZSkuICovXG4gIHByb3Zpc2lvblBlcnNvbmFzKGlucHV0OiB7IGJ5QWN0b3JJZDogc3RyaW5nIH0pOiBBY3RvcltdO1xuICBncmFudChpbnB1dDogeyBhY3RvcklkOiBzdHJpbmc7IHBlcm1pc3Npb246IFBlcm1pc3Npb247IHNjb3BlPzogc3RyaW5nIH0pOiB2b2lkO1xuICByZXZva2UoaW5wdXQ6IHsgYWN0b3JJZDogc3RyaW5nOyBwZXJtaXNzaW9uOiBQZXJtaXNzaW9uOyBzY29wZT86IHN0cmluZyB9KTogdm9pZDtcbiAgY3JlYXRlRmVhdHVyZShpbnB1dDogeyBhY3RvcklkOiBzdHJpbmcgfSk6IEZlYXR1cmU7XG4gIGNyZWF0ZVdvcmtJdGVtKGlucHV0OiBDcmVhdGVXb3JrSXRlbUlucHV0ICYgeyBhY3RvcklkOiBzdHJpbmcgfSk6IFdvcmtJdGVtO1xuXG4gIC8qKiBJbXBvcnQgc3Rvcmllcy55YW1sIGNvbnRlbnQgKHJhdyBZQU1MIHN0cmluZykuIElkZW1wb3RlbnQgcmUtaW1wb3J0IHBlciBzdG9yaWVzLXNjaGVtYSB1cGRhdGUgc2VtYW50aWNzLiAqL1xuICBpbXBvcnRTdG9yaWVzKGlucHV0OiB7IGZlYXR1cmVJZDogc3RyaW5nOyB5YW1sOiBzdHJpbmc7IGFjdG9ySWQ6IHN0cmluZyB9KTogU3Rvcmllc0ltcG9ydFJlc3VsdDtcblxuICAvLyAtLSBjbGFpbXMgKHJvYWRtYXAgXHUwMEE3MS4zKSAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIGNsYWltVGFzayhpbnB1dDogeyB3b3JrSXRlbUlkOiBzdHJpbmc7IGFjdG9ySWQ6IHN0cmluZzsgdHRsTXM/OiBudW1iZXIgfSk6IENsYWltO1xuICBoZWFydGJlYXQoaW5wdXQ6IHsgY2xhaW1JZDogc3RyaW5nIH0pOiB2b2lkO1xuICByZWxlYXNlQ2xhaW0oaW5wdXQ6IHsgY2xhaW1JZDogc3RyaW5nOyByZWFzb24/OiBzdHJpbmcgfSk6IHZvaWQ7XG4gIC8qKiB0ZXN0IGNsb2NrIFx1MjAxNCBsZWFzZSBleHBpcnkgaXMgdGltZS1iYXNlZCAqL1xuICBhZHZhbmNlQ2xvY2sobXM6IG51bWJlcik6IHZvaWQ7XG5cbiAgLy8gLS0gbGlmZWN5Y2xlIChyb2FkbWFwIFx1MDBBNzEuMikgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICBhZHZhbmNlU3RhdGUoaW5wdXQ6IEFkdmFuY2VJbnB1dCk6IFdvcmtJdGVtO1xuICBibG9ja1Rhc2soaW5wdXQ6IHsgd29ya0l0ZW1JZDogc3RyaW5nOyByZWFzb246IEJsb2NrZWRSZWFzb247IGFjdG9ySWQ6IHN0cmluZzsgZmVuY2luZ1Rva2VuPzogbnVtYmVyIH0pOiBXb3JrSXRlbTtcbiAgdW5ibG9ja1Rhc2soaW5wdXQ6IHsgd29ya0l0ZW1JZDogc3RyaW5nOyBhY3RvcklkOiBzdHJpbmcgfSk6IFdvcmtJdGVtO1xuXG4gIC8vIC0tIGdhdGVzICYgZXZpZGVuY2UgKHJvYWRtYXAgXHUwMEE3MS40KSAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHN1Ym1pdEV2aWRlbmNlKGlucHV0OiB7IHdvcmtJdGVtSWQ6IHN0cmluZzsgZXZpZGVuY2U6IEV2aWRlbmNlOyBhY3RvcklkOiBzdHJpbmc7IGZlbmNpbmdUb2tlbj86IG51bWJlciB9KTogdm9pZDtcbiAgYXBwcm92ZUdhdGUoaW5wdXQ6IEdhdGVEZWNpc2lvbklucHV0KTogV29ya0l0ZW07XG4gIC8qKiBSZWplY3Rpb24gZmlyZXMgdGhlIGxvb3BiYWNrIGFzIGEgc3lzdGVtIGVmZmVjdCBcdTIwMTQgbm8gY2xhaW0gaG9sZGVyIGludm9sdmVtZW50IChyb2FkbWFwIFx1MDBBNzEuMikuICovXG4gIHJlamVjdEdhdGUoaW5wdXQ6IEdhdGVEZWNpc2lvbklucHV0KTogV29ya0l0ZW07XG5cbiAgLy8gLS0gZGlzcGF0Y2ggKHJvYWRtYXAgXHUwMEE3Mi4zKSAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIC8qKiBSZWZ1c2VzIHN0YXRlPWRvbmUgaXRlbXM7IHJldHVybnMgZW50cnktc3RhdGUgY29udGV4dCBmb3IgdGhlIHJ1bm5lci4gKi9cbiAgZ2V0VGFza0NvbnRleHQoaW5wdXQ6IHsgd29ya0l0ZW1JZDogc3RyaW5nIH0pOiB7XG4gICAgd29ya0l0ZW06IFdvcmtJdGVtO1xuICAgIGVudHJ5U3RhdGU6IFdvcmtJdGVtU3RhdGU7XG4gIH07XG4gIC8qKiBSZWxlYXNlcyBhIGRvbmVfY2hlY2twb2ludCBkaXNwYXRjaCBob2xkIG9uIHRoZSBmZWF0dXJlLiAqL1xuICByZWxlYXNlRGlzcGF0Y2hIb2xkKGlucHV0OiB7IGZlYXR1cmVJZDogc3RyaW5nOyBhY3RvcklkOiBzdHJpbmcgfSk6IEZlYXR1cmU7XG5cbiAgLy8gLS0gcmVjb25jaWxpYXRpb24gKHJvYWRtYXAgXHUwMEE3MS42LCBkZXRlY3Qtb25seSkgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICByZWNvbmNpbGUoaW5wdXQ6IHsgZmlsZXM6IEFycmF5PHsgd29ya0l0ZW1JZDogc3RyaW5nOyBmcm9udG1hdHRlclN0YXR1czogc3RyaW5nIH0+IH0pOiBEaXZlcmdlbmNlUmVwb3J0W107XG5cbiAgLy8gLS0gZW50aXRsZW1lbnRzIChQaGFzZSAyLCByb2FkbWFwIFx1MDBBNzMpIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAvKiogR292ZXJuYW5jZSBhdXRob3JpdHk6IHRoZSBzeXN0ZW0gYWN0b3IgYW5kICdhZG1pbicgZ292ZXJuYW5jZS1yb2xlIGhvbGRlcnMuICovXG4gIHNldEdvdmVybmFuY2VSb2xlKGlucHV0OiB7IGFjdG9ySWQ6IHN0cmluZzsgcm9sZTogR292ZXJuYW5jZVJvbGU7IGJ5QWN0b3JJZDogc3RyaW5nIH0pOiB2b2lkO1xuICBnZXRHb3Zlcm5hbmNlUm9sZShhY3RvcklkOiBzdHJpbmcpOiBHb3Zlcm5hbmNlUm9sZTtcbiAgLyoqIEFzc2lnbi9yZXZva2UgYSBkZWxpdmVyeSByb2xlIChidW5kbGUgb2YgcGVybWlzc2lvbnMpLiBHYXRlZCB3cml0ZXM7IGF1ZGl0ZWQuICovXG4gIGFzc2lnblJvbGUoaW5wdXQ6IHsgYWN0b3JJZDogc3RyaW5nOyByb2xlQ29kZTogc3RyaW5nOyBieUFjdG9ySWQ6IHN0cmluZyB9KTogdm9pZDtcbiAgcmV2b2tlUm9sZShpbnB1dDogeyBhY3RvcklkOiBzdHJpbmc7IHJvbGVDb2RlOiBzdHJpbmc7IGJ5QWN0b3JJZDogc3RyaW5nIH0pOiB2b2lkO1xuICBsaXN0Um9sZUFzc2lnbm1lbnRzKGFjdG9ySWQ/OiBzdHJpbmcpOiBSb2xlQXNzaWdubWVudFtdO1xuICBzZXRQbGFuKGlucHV0OiB7IHBsYW46IFBsYW5Db2RlOyBieUFjdG9ySWQ6IHN0cmluZyB9KTogdm9pZDtcbiAgZ2V0UGxhbigpOiBQbGFuQ29kZTtcbiAgc2V0V29ya3NwYWNlUG9saWN5KGlucHV0OiB7IHBvbGljeTogV29ya3NwYWNlUG9saWN5OyBieUFjdG9ySWQ6IHN0cmluZyB9KTogdm9pZDtcbiAgZ2V0V29ya3NwYWNlUG9saWN5KCk6IFdvcmtzcGFjZVBvbGljeTtcbiAgc2V0R2F0ZVBvbGljeShpbnB1dDogeyBnYXRlOiBHYXRlQ29kZTsgcG9saWN5OiBHYXRlUG9saWN5OyBieUFjdG9ySWQ6IHN0cmluZyB9KTogdm9pZDtcbiAgZ2V0R2F0ZVBvbGljeShnYXRlOiBHYXRlQ29kZSk6IEdhdGVQb2xpY3k7XG4gIC8qKiBQdXJlIGRlY2lzaW9uIHRyYWNlIFx1MjAxNCByZXBsYXlhYmxlIGJ5IGFuIGF1ZGl0b3IuIE5ldmVyIG11dGF0ZXMuICovXG4gIGF1dGh6RXhwbGFpbihpbnB1dDogeyBhY3RvcklkOiBzdHJpbmc7IHBlcm1pc3Npb246IFBlcm1pc3Npb24gfSk6IEF1dGh6RXhwbGFuYXRpb247XG5cbiAgLy8gLS0gY29sbGFib3JhdGlvbiAoUGhhc2UgMywgcm9hZG1hcCBcdTAwQTc1KSAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIGNyZWF0ZVRocmVhZChpbnB1dDoge1xuICAgIGFjdG9ySWQ6IHN0cmluZztcbiAgICBraW5kOiBUaHJlYWRLaW5kO1xuICAgIGZlYXR1cmVJZD86IHN0cmluZztcbiAgICB3b3JrSXRlbUlkPzogc3RyaW5nO1xuICAgIHZpc2liaWxpdHk/OiBUaHJlYWRWaXNpYmlsaXR5O1xuICB9KTogVGhyZWFkO1xuICBhZGRUaHJlYWRQYXJ0aWNpcGFudChpbnB1dDogeyB0aHJlYWRJZDogc3RyaW5nOyBhY3RvcklkOiBzdHJpbmc7IGJ5QWN0b3JJZDogc3RyaW5nIH0pOiBUaHJlYWQ7XG4gIC8qKlxuICAgKiBQb3N0IGEgbWVzc2FnZS4gYG1lbnRpb25zYCBpcyBTVFJVQ1RVUkVEIChhY3RvciBpZHMpIFx1MjAxNCB0aGUgc2VydmVyIG5ldmVyXG4gICAqIHBhcnNlcyBib2R5IHRleHQgKFx1MDBBNzUuMikuIE1lbnRpb25pbmcgYW4gYWdlbnQgcnVucyB0aGUgZGV0ZXJtaW5pc3RpY1xuICAgKiByb3V0ZXIgKFx1MDBBNzUuNCk6IGRlZmF1bHQtZGVueSwgcG9saWN5LWdhdGVkLCBkZXB0aC1jYXBwZWQuXG4gICAqL1xuICBwb3N0TWVzc2FnZShpbnB1dDoge1xuICAgIHRocmVhZElkOiBzdHJpbmc7XG4gICAgYWN0b3JJZDogc3RyaW5nO1xuICAgIGJvZHk6IHN0cmluZztcbiAgICByZXBseVRvPzogc3RyaW5nO1xuICAgIG1lbnRpb25zPzogc3RyaW5nW107XG4gIH0pOiBNZXNzYWdlO1xuICBsaXN0VGhyZWFkcyhmaWx0ZXI/OiB7IGZlYXR1cmVJZD86IHN0cmluZzsgd29ya0l0ZW1JZD86IHN0cmluZzsgYWN0b3JJZD86IHN0cmluZyB9KTogVGhyZWFkW107XG4gIGxpc3RNZXNzYWdlcyhpbnB1dDogeyB0aHJlYWRJZDogc3RyaW5nOyBhY3RvcklkOiBzdHJpbmc7IHNpbmNlU2VxPzogbnVtYmVyIH0pOiBNZXNzYWdlW107XG4gIGxpc3RNZW50aW9ucyhtZXNzYWdlSWQ6IHN0cmluZyk6IE1lbnRpb25bXTtcbiAgbGlzdE5vdGlmaWNhdGlvbnMoaW5wdXQ6IHsgYWN0b3JJZDogc3RyaW5nOyB1bnJlYWRPbmx5PzogYm9vbGVhbiB9KTogTm90aWZpY2F0aW9uW107XG4gIG1hcmtOb3RpZmljYXRpb25SZWFkKGlucHV0OiB7IG5vdGlmaWNhdGlvbklkOiBzdHJpbmc7IGFjdG9ySWQ6IHN0cmluZyB9KTogdm9pZDtcbiAgbGlzdEFnZW50Sm9icyhmaWx0ZXI/OiB7IGFnZW50QWN0b3JJZD86IHN0cmluZzsgc3RhdHVzPzogQWdlbnRKb2JbJ3N0YXR1cyddIH0pOiBBZ2VudEpvYltdO1xuICAvKiogT25seSB0aGUgam9iJ3MgYWdlbnQgbWF5IGNvbXBsZXRlIGl0OyBjb21wbGV0aW9uIG5vdGlmaWVzIHRoZSBtZW50aW9uZXIuICovXG4gIGNvbXBsZXRlQWdlbnRKb2IoaW5wdXQ6IHsgam9iSWQ6IHN0cmluZzsgYWN0b3JJZDogc3RyaW5nOyBzdGF0dXM6ICdkb25lJyB8ICdibG9ja2VkJzsgbm90ZT86IHN0cmluZyB9KTogQWdlbnRKb2I7XG5cbiAgLy8gLS0gcXVlcmllcyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIGdldFdvcmtJdGVtKGlkOiBzdHJpbmcpOiBXb3JrSXRlbTtcbiAgZ2V0RmVhdHVyZShpZDogc3RyaW5nKTogRmVhdHVyZTtcbiAgZ2V0Q2xhaW1zKHdvcmtJdGVtSWQ6IHN0cmluZyk6IENsYWltW107XG4gIC8qKiBBZGRpdGl2ZSBxdWVyeSBzdXJmYWNlIChwb3N0LWNvbmZvcm1hbmNlKTogbGlzdC9maWx0ZXIgd29yayBpdGVtcy4gKi9cbiAgbGlzdFdvcmtJdGVtcyhmaWx0ZXI/OiB7IHN0YXRlPzogV29ya0l0ZW1TdGF0ZTsgZmVhdHVyZUlkPzogc3RyaW5nOyBjbGFpbWFibGU/OiBib29sZWFuIH0pOiBXb3JrSXRlbVtdO1xuICBldmVudHMoc3RyZWFtSWQ/OiBzdHJpbmcpOiBTcGluZUV2ZW50W107XG59XG4iLCAiLyoqXG4gKiBzdG9yaWVzLnlhbWwgcGFyc2luZyArIHZhbGlkaXR5IHJ1bGVzIChzdG9yaWVzLXNjaGVtYS5tZCwgcm9hZG1hcCBEOSkuXG4gKlxuICogVGhlIHNjaGVtYSdzIHZhbGlkaXR5IHJ1bGVzIGJlY29tZSB0aHJvd2luZyBjaGVja3MgaGVyZTsgdGhlIGltcG9ydGVyIGluXG4gKiB0aGUgZW5naW5lIGNvbnN1bWVzIHRoZSB2YWxpZGF0ZWQgZW50cmllcy4gXCJObyBzdGF0dXMgZmllbGQsIGV2ZXIuXCJcbiAqL1xuaW1wb3J0IHsgcGFyc2UgfSBmcm9tICd5YW1sJztcblxuaW1wb3J0IHsgU3Rvcmllc1ZhbGlkYXRpb25FcnJvciB9IGZyb20gJy4vdHlwZXMuanMnO1xuXG5leHBvcnQgaW50ZXJmYWNlIFN0b3J5RW50cnkge1xuICBpZDogc3RyaW5nO1xuICB0aXRsZTogc3RyaW5nO1xuICBkZXNjcmlwdGlvbjogc3RyaW5nO1xuICBzcGVjQ2hlY2twb2ludDogYm9vbGVhbjtcbiAgZG9uZUNoZWNrcG9pbnQ6IGJvb2xlYW47XG4gIGludm9rZURldldpdGg6IHN0cmluZztcbn1cblxuY29uc3QgSURfUEFUVEVSTiA9IC9eW0EtWmEtejAtOS1dKyQvO1xuXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VTdG9yaWVzKHlhbWxUZXh0OiBzdHJpbmcpOiBTdG9yeUVudHJ5W10ge1xuICBsZXQgcmF3OiB1bmtub3duO1xuICB0cnkge1xuICAgIHJhdyA9IHBhcnNlKHlhbWxUZXh0KTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICB0aHJvdyBuZXcgU3Rvcmllc1ZhbGlkYXRpb25FcnJvcihgWUFNTCBwYXJzZSBmYWlsdXJlOiAke1N0cmluZyhlcnJvcil9YCk7XG4gIH1cbiAgaWYgKCFBcnJheS5pc0FycmF5KHJhdykpIHtcbiAgICB0aHJvdyBuZXcgU3Rvcmllc1ZhbGlkYXRpb25FcnJvcigndG9wIGxldmVsIG11c3QgYmUgYSBZQU1MIGxpc3Qgb2Ygc3RvcmllcycpO1xuICB9XG5cbiAgY29uc3QgZW50cmllczogU3RvcnlFbnRyeVtdID0gW107XG4gIGZvciAoY29uc3QgaXRlbSBvZiByYXcpIHtcbiAgICBpZiAodHlwZW9mIGl0ZW0gIT09ICdvYmplY3QnIHx8IGl0ZW0gPT09IG51bGwgfHwgQXJyYXkuaXNBcnJheShpdGVtKSkge1xuICAgICAgdGhyb3cgbmV3IFN0b3JpZXNWYWxpZGF0aW9uRXJyb3IoJ2V2ZXJ5IGVudHJ5IG11c3QgYmUgYSBtYXBwaW5nJyk7XG4gICAgfVxuICAgIGNvbnN0IGVudHJ5ID0gaXRlbSBhcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPjtcblxuICAgIC8vIFJ1bGUgMzogXCJObyBzdGF0dXMgZmllbGQsIGV2ZXIuXCJcbiAgICBpZiAoJ3N0YXR1cycgaW4gZW50cnkpIHtcbiAgICAgIHRocm93IG5ldyBTdG9yaWVzVmFsaWRhdGlvbkVycm9yKCdubyBzdGF0dXMgZmllbGQsIGV2ZXInKTtcbiAgICB9XG4gICAgLy8gUnVsZSA0OiBpZHMgYXJlIFlBTUwgc3RyaW5ncywgYWx3YXlzIHF1b3RlZCBcdTIwMTQgYW4gdW5xdW90ZWQgYGlkOiAxYFxuICAgIC8vIHBhcnNlcyBhcyBhIG51bWJlciBhbmQgYnJlYWtzIHN0cmluZyBjb21wYXJpc29uLlxuICAgIGlmICh0eXBlb2YgZW50cnlbJ2lkJ10gIT09ICdzdHJpbmcnKSB7XG4gICAgICB0aHJvdyBuZXcgU3Rvcmllc1ZhbGlkYXRpb25FcnJvcignaWQgbXVzdCBiZSBhIHF1b3RlZCBZQU1MIHN0cmluZycpO1xuICAgIH1cbiAgICBjb25zdCBpZCA9IGVudHJ5WydpZCddO1xuICAgIGlmICghSURfUEFUVEVSTi50ZXN0KGlkKSkge1xuICAgICAgdGhyb3cgbmV3IFN0b3JpZXNWYWxpZGF0aW9uRXJyb3IoYGlkIFwiJHtpZH1cIiBtYXkgY29udGFpbiBvbmx5IGxldHRlcnMsIGRpZ2l0cywgYW5kIGRhc2hlc2ApO1xuICAgIH1cbiAgICAvLyBSdWxlIDE6IHJlcXVpcmVkIGZpZWxkcy5cbiAgICBpZiAodHlwZW9mIGVudHJ5Wyd0aXRsZSddICE9PSAnc3RyaW5nJyB8fCBlbnRyeVsndGl0bGUnXS5sZW5ndGggPT09IDApIHtcbiAgICAgIHRocm93IG5ldyBTdG9yaWVzVmFsaWRhdGlvbkVycm9yKGBlbnRyeSBcIiR7aWR9XCIgaXMgbWlzc2luZyByZXF1aXJlZCBmaWVsZDogdGl0bGVgKTtcbiAgICB9XG4gICAgaWYgKHR5cGVvZiBlbnRyeVsnZGVzY3JpcHRpb24nXSAhPT0gJ3N0cmluZycgfHwgZW50cnlbJ2Rlc2NyaXB0aW9uJ10ubGVuZ3RoID09PSAwKSB7XG4gICAgICB0aHJvdyBuZXcgU3Rvcmllc1ZhbGlkYXRpb25FcnJvcihgZW50cnkgXCIke2lkfVwiIGlzIG1pc3NpbmcgcmVxdWlyZWQgZmllbGQ6IGRlc2NyaXB0aW9uYCk7XG4gICAgfVxuXG4gICAgZW50cmllcy5wdXNoKHtcbiAgICAgIGlkLFxuICAgICAgdGl0bGU6IGVudHJ5Wyd0aXRsZSddLFxuICAgICAgZGVzY3JpcHRpb246IGVudHJ5WydkZXNjcmlwdGlvbiddLFxuICAgICAgc3BlY0NoZWNrcG9pbnQ6IGVudHJ5WydzcGVjX2NoZWNrcG9pbnQnXSA9PT0gdHJ1ZSxcbiAgICAgIGRvbmVDaGVja3BvaW50OiBlbnRyeVsnZG9uZV9jaGVja3BvaW50J10gPT09IHRydWUsXG4gICAgICBpbnZva2VEZXZXaXRoOiB0eXBlb2YgZW50cnlbJ2ludm9rZV9kZXZfd2l0aCddID09PSAnc3RyaW5nJyA/IGVudHJ5WydpbnZva2VfZGV2X3dpdGgnXSA6ICcnLFxuICAgIH0pO1xuICB9XG5cbiAgLy8gUnVsZSAxOiBpZHMgdW5pcXVlLlxuICBjb25zdCBzZWVuID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gIGZvciAoY29uc3QgeyBpZCB9IG9mIGVudHJpZXMpIHtcbiAgICBpZiAoc2Vlbi5oYXMoaWQpKSB0aHJvdyBuZXcgU3Rvcmllc1ZhbGlkYXRpb25FcnJvcihgZHVwbGljYXRlIGlkIFwiJHtpZH1cImApO1xuICAgIHNlZW4uYWRkKGlkKTtcbiAgfVxuICAvLyBSdWxlIDI6IHByZWZpeC1mcmVlIHVuZGVyIHRoZSBgPGlkPi1gIGZpbGVuYW1lLW1hdGNoaW5nIGNvbnZlbnRpb24uXG4gIGZvciAoY29uc3QgYSBvZiBzZWVuKSB7XG4gICAgZm9yIChjb25zdCBiIG9mIHNlZW4pIHtcbiAgICAgIGlmIChhICE9PSBiICYmIGEuc3RhcnRzV2l0aChgJHtifS1gKSkge1xuICAgICAgICB0aHJvdyBuZXcgU3Rvcmllc1ZhbGlkYXRpb25FcnJvcihgaWRzIFwiJHtifVwiIGFuZCBcIiR7YX1cIiBjb2xsaWRlIHVuZGVyIHRoZSA8aWQ+LSBjb252ZW50aW9uYCk7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIHJldHVybiBlbnRyaWVzO1xufVxuIiwgIi8qKlxuICogSW4tbWVtb3J5IHJlZmVyZW5jZSBpbXBsZW1lbnRhdGlvbiBvZiB0aGUgc3BpbmUgZW5naW5lLCB3cml0dGVuIHRvIG1ha2UgdGhlXG4gKiBjb25mb3JtYW5jZSBzdWl0ZSBpbiB0ZXN0LyBwYXNzLiBUaGUgcHJvZHVjdGlvbiBzZXJ2aWNlIHdyYXBzIHRoaXMgc2FtZVxuICogY29yZSB3aXRoIFBvc3RncmVzIHBlcnNpc3RlbmNlIChQaGFzZSAxIHN0b3J5IFwiMTFcIikuXG4gKlxuICogUnVsZSBwcm92ZW5hbmNlIGxpdmVzIGluIHRoZSB0ZXN0cyBhbmQgaW4gdGVzdC9DT05GT1JNQU5DRS5tZCBcdTIwMTQgdGhpcyBmaWxlXG4gKiBvbmx5IGVuY29kZXMgd2hhdCB0aGUgc3VpdGUgcGlucy4gV2hlcmUgYW4gb3JkZXJpbmcgb3Igc2VtYW50aWMgd2FzXG4gKiBhcmJpdHJhdGVkLCB0aGUgY29tbWVudCBuYW1lcyB0aGUgcGluLlxuICovXG5pbXBvcnQge1xuICBBR0VOVF9HQVRFX0FQUFJPVkVfUEVSTUlTU0lPTlMsXG4gIEFHRU5UX0pPQl9NQVhfREVQVEgsXG4gIEJMT0NLRURfUkVBU09OUyxcbiAgQ29uZmxpY3RFcnJvcixcbiAgREVGQVVMVF9QTEFOLFxuICBERUxJVkVSWV9ST0xFUyxcbiAgR3VhcmRGYWlsZWRFcnJvcixcbiAgSW52YWxpZFRyYW5zaXRpb25FcnJvcixcbiAgUGVybWlzc2lvbkRlbmllZEVycm9yLFxuICBQRVJTT05BUyxcbiAgUExBTl9DRUlMSU5HUyxcbiAgUkVWSUVXX0xPT1BfTElNSVQsXG4gIFN0b3JpZXNWYWxpZGF0aW9uRXJyb3IsXG4gIFdPUktfSVRFTV9TVEFURVMsXG4gIHR5cGUgQWN0b3IsXG4gIHR5cGUgQWN0b3JUeXBlLFxuICB0eXBlIEFkdmFuY2VJbnB1dCxcbiAgdHlwZSBBZ2VudEpvYixcbiAgdHlwZSBBdXRoekV4cGxhbmF0aW9uLFxuICB0eXBlIEJsb2NrZWRSZWFzb24sXG4gIHR5cGUgTWVudGlvbixcbiAgdHlwZSBNZXNzYWdlLFxuICB0eXBlIE5vdGlmaWNhdGlvbixcbiAgdHlwZSBUaHJlYWQsXG4gIHR5cGUgVGhyZWFkS2luZCxcbiAgdHlwZSBUaHJlYWRWaXNpYmlsaXR5LFxuICB0eXBlIENsYWltLFxuICB0eXBlIENyZWF0ZVdvcmtJdGVtSW5wdXQsXG4gIHR5cGUgRGl2ZXJnZW5jZVJlcG9ydCxcbiAgdHlwZSBFdmlkZW5jZSxcbiAgdHlwZSBGZWF0dXJlLFxuICB0eXBlIEdhdGVDb2RlLFxuICB0eXBlIEdhdGVEZWNpc2lvbklucHV0LFxuICB0eXBlIEdhdGVQb2xpY3ksXG4gIHR5cGUgR292ZXJuYW5jZVJvbGUsXG4gIHR5cGUgUGVybWlzc2lvbixcbiAgdHlwZSBQbGFuQ29kZSxcbiAgdHlwZSBSb2xlQXNzaWdubWVudCxcbiAgdHlwZSBTcGluZUVuZ2luZSxcbiAgdHlwZSBTcGluZUV2ZW50LFxuICB0eXBlIFN0b3JpZXNJbXBvcnRSZXN1bHQsXG4gIHR5cGUgV29ya0l0ZW0sXG4gIHR5cGUgV29ya0l0ZW1LaW5kLFxuICB0eXBlIFdvcmtJdGVtU3RhdGUsXG4gIHR5cGUgV29ya3NwYWNlUG9saWN5LFxufSBmcm9tICcuL3R5cGVzLmpzJztcbmltcG9ydCB7IHBhcnNlU3RvcmllcyB9IGZyb20gJy4vc3Rvcmllcy5qcyc7XG5cbmNvbnN0IFJBTks6IFJlY29yZDxXb3JrSXRlbVN0YXRlLCBudW1iZXI+ID0gT2JqZWN0LmZyb21FbnRyaWVzKFxuICBXT1JLX0lURU1fU1RBVEVTLm1hcCgocywgaSkgPT4gW3MsIGldKSxcbikgYXMgUmVjb3JkPFdvcmtJdGVtU3RhdGUsIG51bWJlcj47XG5cbi8qKlxuICogVGhlIHZlcnNpb25lZCB0cmFuc2l0aW9uIHRhYmxlIChyb2FkbWFwIFx1MDBBNzEuMikuIENsYWltcyBzZXJpYWxpemUgdGhlXG4gKiBFWEVDVVRJT04gem9uZSAoY29uZm9ybWFuY2UgcGluLCBzZWUgdGVzdC9DT05GT1JNQU5DRS5tZCk6IHBsYW5uaW5nXG4gKiB0cmFuc2l0aW9ucyBhcmUgcGVybWlzc2lvbi1vbmx5OyByZWFkeV9mb3JfZGV2XHUyMTkyaW5fcHJvZ3Jlc3Mgb253YXJkIGRlbWFuZCBhXG4gKiBwcmVzZW50ZWQsIGxpdmUgZmVuY2luZyB0b2tlbi4gR2F0ZS1maXJlZCB0cmFuc2l0aW9ucyAoc3BlY19hcHByb3ZhbCxcbiAqIHJldmlld19hcHByb3ZhbCkgZG8gbm90IGFwcGVhciBoZXJlIFx1MjAxNCBhcHByb3ZlR2F0ZS9yZWplY3RHYXRlIGZpcmUgdGhlbS5cbiAqL1xuaW50ZXJmYWNlIFRyYW5zaXRpb25SdWxlIHtcbiAgZnJvbTogV29ya0l0ZW1TdGF0ZTtcbiAgdG86IFdvcmtJdGVtU3RhdGU7XG4gIHBlcm1pc3Npb246IFBlcm1pc3Npb247XG4gIGNsYWltUmVxdWlyZWQ6IGJvb2xlYW47XG4gIGd1YXJkczogQXJyYXk8J2RlcHNfZG9uZScgfCAnc3BlY19nYXRlX2lmX2NoZWNrcG9pbnQnIHwgJ25vbmVtcHR5X2RpZmYnPjtcbn1cblxuY29uc3QgVFJBTlNJVElPTlM6IFRyYW5zaXRpb25SdWxlW10gPSBbXG4gIHsgZnJvbTogJ2JhY2tsb2cnLCB0bzogJ2RyYWZ0JywgcGVybWlzc2lvbjogJ3Rhc2sucGxhbicsIGNsYWltUmVxdWlyZWQ6IGZhbHNlLCBndWFyZHM6IFtdIH0sXG4gIHtcbiAgICBmcm9tOiAnZHJhZnQnLFxuICAgIHRvOiAncmVhZHlfZm9yX2RldicsXG4gICAgcGVybWlzc2lvbjogJ3Rhc2sucGxhbicsXG4gICAgY2xhaW1SZXF1aXJlZDogZmFsc2UsXG4gICAgZ3VhcmRzOiBbJ3NwZWNfZ2F0ZV9pZl9jaGVja3BvaW50J10sXG4gIH0sXG4gIHtcbiAgICBmcm9tOiAncmVhZHlfZm9yX2RldicsXG4gICAgdG86ICdpbl9wcm9ncmVzcycsXG4gICAgcGVybWlzc2lvbjogJ3Rhc2suYWR2YW5jZScsXG4gICAgY2xhaW1SZXF1aXJlZDogdHJ1ZSxcbiAgICBndWFyZHM6IFsnZGVwc19kb25lJ10sXG4gIH0sXG4gIHtcbiAgICBmcm9tOiAnaW5fcHJvZ3Jlc3MnLFxuICAgIHRvOiAnaW5fcmV2aWV3JyxcbiAgICBwZXJtaXNzaW9uOiAndGFzay5hZHZhbmNlJyxcbiAgICBjbGFpbVJlcXVpcmVkOiB0cnVlLFxuICAgIGd1YXJkczogWydub25lbXB0eV9kaWZmJ10sXG4gIH0sXG5dO1xuXG5pbnRlcmZhY2UgV29ya0l0ZW1Sb3cgZXh0ZW5kcyBXb3JrSXRlbSB7XG4gIGRlcGVuZHNPbjogc3RyaW5nW107XG59XG5cbmludGVyZmFjZSBDbGFpbVJvdyBleHRlbmRzIENsYWltIHtcbiAgdHRsTXM6IG51bWJlcjtcbn1cblxuaW50ZXJmYWNlIEdhdGVEZWNpc2lvblJvdyB7XG4gIHdvcmtJdGVtSWQ6IHN0cmluZztcbiAgZ2F0ZTogR2F0ZUNvZGU7XG4gIGRlY2lzaW9uOiAnYXBwcm92ZWQnIHwgJ3JlamVjdGVkJztcbiAgYWN0b3JJZDogc3RyaW5nO1xuICAvKiogcmV2aWV3IHJvdW5kIHRoZSBkZWNpc2lvbiBiZWxvbmdzIHRvICg9IHJldmlld0xvb3BJdGVyYXRpb24gYXQgZGVjaXNpb24gdGltZSkgKi9cbiAgcm91bmQ6IG51bWJlcjtcbn1cblxuaW50ZXJmYWNlIFJvbGVBc3NpZ25tZW50Um93IGV4dGVuZHMgUm9sZUFzc2lnbm1lbnQge31cblxuaW50ZXJmYWNlIEV2aWRlbmNlUm93IHtcbiAgd29ya0l0ZW1JZDogc3RyaW5nO1xuICBldmlkZW5jZTogRXZpZGVuY2U7XG4gIHNlcTogbnVtYmVyO1xufVxuXG5jb25zdCBMRUdBQ1lfU1RBVFVTOiBSZWNvcmQ8c3RyaW5nLCBXb3JrSXRlbVN0YXRlPiA9IHtcbiAgYmFja2xvZzogJ2JhY2tsb2cnLFxuICBkcmFmdDogJ2RyYWZ0JyxcbiAgJ3JlYWR5LWZvci1kZXYnOiAncmVhZHlfZm9yX2RldicsXG4gIHJlYWR5X2Zvcl9kZXY6ICdyZWFkeV9mb3JfZGV2JyxcbiAgJ2luLXByb2dyZXNzJzogJ2luX3Byb2dyZXNzJyxcbiAgaW5fcHJvZ3Jlc3M6ICdpbl9wcm9ncmVzcycsXG4gICdpbi1yZXZpZXcnOiAnaW5fcmV2aWV3JyxcbiAgaW5fcmV2aWV3OiAnaW5fcmV2aWV3JyxcbiAgcmV2aWV3OiAnaW5fcmV2aWV3JyxcbiAgZG9uZTogJ2RvbmUnLFxufTtcblxuY2xhc3MgRW5naW5lSW1wbCBpbXBsZW1lbnRzIFNwaW5lRW5naW5lIHtcbiAgcHJpdmF0ZSBub3cgPSAwO1xuICBwcml2YXRlIHNlcSA9IDA7XG4gIHByaXZhdGUgZ2xvYmFsU2VxID0gMDtcblxuICBwcml2YXRlIHJlYWRvbmx5IGFjdG9ycyA9IG5ldyBNYXA8c3RyaW5nLCBBY3Rvcj4oKTtcbiAgcHJpdmF0ZSByZWFkb25seSBncmFudHMgPSBuZXcgTWFwPHN0cmluZywgU2V0PHN0cmluZz4+KCk7IC8vIGFjdG9ySWQgLT4gXCJwZXJtaXNzaW9uXCIgKHNjb3BlIGlnbm9yZWQgdW50aWwgUGhhc2UgMilcbiAgcHJpdmF0ZSByZWFkb25seSBmZWF0dXJlcyA9IG5ldyBNYXA8c3RyaW5nLCBGZWF0dXJlPigpO1xuICBwcml2YXRlIHJlYWRvbmx5IHdvcmtJdGVtcyA9IG5ldyBNYXA8c3RyaW5nLCBXb3JrSXRlbVJvdz4oKTtcbiAgcHJpdmF0ZSByZWFkb25seSBleHRlcm5hbEtleUluZGV4ID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZz4oKTsgLy8gZXh0ZXJuYWxLZXkgLT4gd29ya0l0ZW1JZCAoZmlyc3Qgd3JpdGVyIHdpbnMpXG4gIHByaXZhdGUgcmVhZG9ubHkgY2xhaW1zID0gbmV3IE1hcDxzdHJpbmcsIENsYWltUm93PigpO1xuICBwcml2YXRlIHJlYWRvbmx5IGNsYWltc0J5SXRlbSA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmdbXT4oKTsgLy8gd29ya0l0ZW1JZCAtPiBjbGFpbUlkc1xuICBwcml2YXRlIHJlYWRvbmx5IGZlbmNpbmdDb3VudGVyID0gbmV3IE1hcDxzdHJpbmcsIG51bWJlcj4oKTsgLy8gd29ya0l0ZW1JZCAtPiBsYXN0IHRva2VuXG4gIHByaXZhdGUgcmVhZG9ubHkgZ2F0ZURlY2lzaW9uczogR2F0ZURlY2lzaW9uUm93W10gPSBbXTtcbiAgcHJpdmF0ZSByZWFkb25seSBldmlkZW5jZVJvd3M6IEV2aWRlbmNlUm93W10gPSBbXTtcbiAgcHJpdmF0ZSByZWFkb25seSBldmVudExvZzogU3BpbmVFdmVudFtdID0gW107XG4gIHByaXZhdGUgcmVhZG9ubHkgc3RyZWFtU2VxcyA9IG5ldyBNYXA8c3RyaW5nLCBudW1iZXI+KCk7XG4gIHByaXZhdGUgcmVhZG9ubHkgaWRlbXBvdGVuY3lDYWNoZSA9IG5ldyBNYXA8c3RyaW5nLCBXb3JrSXRlbT4oKTtcblxuICAvLyAtLSBlbnRpdGxlbWVudHMgc3RhdGUgKFBoYXNlIDIsIHJvYWRtYXAgXHUwMEE3MykgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgcHJpdmF0ZSByZWFkb25seSBnb3Zlcm5hbmNlUm9sZXMgPSBuZXcgTWFwPHN0cmluZywgR292ZXJuYW5jZVJvbGU+KCk7XG4gIHByaXZhdGUgcmVhZG9ubHkgcm9sZUFzc2lnbm1lbnRzOiBSb2xlQXNzaWdubWVudFJvd1tdID0gW107XG4gIHByaXZhdGUgcGxhbjogUGxhbkNvZGUgPSBERUZBVUxUX1BMQU47XG4gIHByaXZhdGUgcGxhblZlcnNpb24gPSAxO1xuICBwcml2YXRlIHdvcmtzcGFjZVBvbGljeTogV29ya3NwYWNlUG9saWN5ID0ge307XG4gIHByaXZhdGUgcG9saWN5VmVyc2lvbiA9IDE7XG4gIHByaXZhdGUgcmVhZG9ubHkgZ2F0ZVBvbGljaWVzID0gbmV3IE1hcDxHYXRlQ29kZSwgR2F0ZVBvbGljeT4oKTtcblxuICAvLyAtLSBjb2xsYWJvcmF0aW9uIHN0YXRlIChQaGFzZSAzLCByb2FkbWFwIFx1MDBBNzUpIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHByaXZhdGUgcmVhZG9ubHkgdGhyZWFkcyA9IG5ldyBNYXA8c3RyaW5nLCBUaHJlYWQ+KCk7XG4gIHByaXZhdGUgcmVhZG9ubHkgbWVzc2FnZXM6IE1lc3NhZ2VbXSA9IFtdO1xuICBwcml2YXRlIHJlYWRvbmx5IG1lbnRpb25zOiBNZW50aW9uW10gPSBbXTtcbiAgcHJpdmF0ZSByZWFkb25seSBub3RpZmljYXRpb25zOiBOb3RpZmljYXRpb25bXSA9IFtdO1xuICBwcml2YXRlIHJlYWRvbmx5IGFnZW50Sm9icyA9IG5ldyBNYXA8c3RyaW5nLCBBZ2VudEpvYj4oKTtcblxuICByZWFkb25seSBzeXN0ZW1BY3RvcklkOiBzdHJpbmc7XG5cbiAgY29uc3RydWN0b3IoKSB7XG4gICAgdGhpcy5zeXN0ZW1BY3RvcklkID0gdGhpcy5uZXh0SWQoJ2FjdG9yLXN5c3RlbScpO1xuICAgIHRoaXMuYWN0b3JzLnNldCh0aGlzLnN5c3RlbUFjdG9ySWQsIHtcbiAgICAgIGlkOiB0aGlzLnN5c3RlbUFjdG9ySWQsXG4gICAgICB0eXBlOiAnc3lzdGVtJyxcbiAgICAgIGRpc3BsYXlOYW1lOiAnc3lzdGVtJyxcbiAgICAgIHBlcnNvbmFDb2RlOiBudWxsLFxuICAgIH0pO1xuICB9XG5cbiAgLy8gLS0gaW5mcmFzdHJ1Y3R1cmUgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICBwcml2YXRlIG5leHRJZChwcmVmaXg6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgdGhpcy5zZXEgKz0gMTtcbiAgICByZXR1cm4gYCR7cHJlZml4fV8ke3RoaXMuc2VxLnRvU3RyaW5nKDM2KS5wYWRTdGFydCg2LCAnMCcpfWA7XG4gIH1cblxuICBwcml2YXRlIGFwcGVuZChcbiAgICBzdHJlYW1UeXBlOiBTcGluZUV2ZW50WydzdHJlYW1UeXBlJ10sXG4gICAgc3RyZWFtSWQ6IHN0cmluZyxcbiAgICB0eXBlOiBzdHJpbmcsXG4gICAgYWN0b3JJZDogc3RyaW5nLFxuICAgIHBheWxvYWQ6IFJlY29yZDxzdHJpbmcsIHVua25vd24+LFxuICAgIGV4dHJhPzogeyBjYXVzYXRpb25JZD86IHN0cmluZzsgaWRlbXBvdGVuY3lLZXk/OiBzdHJpbmcgfSxcbiAgKTogU3BpbmVFdmVudCB7XG4gICAgdGhpcy5nbG9iYWxTZXEgKz0gMTtcbiAgICBjb25zdCBzdHJlYW1TZXEgPSAodGhpcy5zdHJlYW1TZXFzLmdldChzdHJlYW1JZCkgPz8gMCkgKyAxO1xuICAgIHRoaXMuc3RyZWFtU2Vxcy5zZXQoc3RyZWFtSWQsIHN0cmVhbVNlcSk7XG4gICAgY29uc3QgZXZlbnQ6IFNwaW5lRXZlbnQgPSB7XG4gICAgICBnbG9iYWxTZXE6IHRoaXMuZ2xvYmFsU2VxLFxuICAgICAgc3RyZWFtVHlwZSxcbiAgICAgIHN0cmVhbUlkLFxuICAgICAgc3RyZWFtU2VxLFxuICAgICAgdHlwZSxcbiAgICAgIGFjdG9ySWQsXG4gICAgICBwYXlsb2FkLFxuICAgICAgLi4uKGV4dHJhPy5jYXVzYXRpb25JZCAhPT0gdW5kZWZpbmVkID8geyBjYXVzYXRpb25JZDogZXh0cmEuY2F1c2F0aW9uSWQgfSA6IHt9KSxcbiAgICB9O1xuICAgIHRoaXMuZXZlbnRMb2cucHVzaChldmVudCk7XG4gICAgcmV0dXJuIGV2ZW50O1xuICB9XG5cbiAgcHJpdmF0ZSBtdXN0R2V0SXRlbSh3b3JrSXRlbUlkOiBzdHJpbmcpOiBXb3JrSXRlbVJvdyB7XG4gICAgY29uc3QgYnlJZCA9IHRoaXMud29ya0l0ZW1zLmdldCh3b3JrSXRlbUlkKTtcbiAgICBpZiAoYnlJZCkgcmV0dXJuIGJ5SWQ7XG4gICAgLy8gSW1wb3J0ZWQgc3RvcmllcyBhcmUgYWRkcmVzc2VkIGJ5IHRoZWlyIGV4dGVybmFsS2V5IGhhbmRsZVxuICAgIC8vIChjb25mb3JtYW5jZSBwaW4gaW4gc3Rvcmllcy1pbXBvcnQudGVzdC50cykuXG4gICAgY29uc3QgbWFwcGVkID0gdGhpcy5leHRlcm5hbEtleUluZGV4LmdldCh3b3JrSXRlbUlkKTtcbiAgICBpZiAobWFwcGVkICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIGNvbnN0IGl0ZW0gPSB0aGlzLndvcmtJdGVtcy5nZXQobWFwcGVkKTtcbiAgICAgIGlmIChpdGVtKSByZXR1cm4gaXRlbTtcbiAgICB9XG4gICAgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoYHVua25vd24gd29yayBpdGVtOiAke3dvcmtJdGVtSWR9YCk7XG4gIH1cblxuICAvKipcbiAgICogRW50aXRsZW1lbnQgcmVzb2x1dGlvbiBcdTIwMTQgYSBQVVJFIGZ1bmN0aW9uIG92ZXIgcGxhbiBcdTAwRDcgZ292ZXJuYW5jZSBcdTAwRDdcbiAgICogZGVsaXZlcnktcm9sZSBkYXRhIChyb2FkbWFwIFx1MDBBNzMpLiBBIGdyYW50IG1heSBFWElTVCAoZGlyZWN0IG9yIHZpYSBhXG4gICAqIHJvbGUpIGFuZCBzdGlsbCBub3QgUkVTT0xWRSBmb3IgYW4gYWdlbnQgd2hlbiB0aGUgcGxhbiBjZWlsaW5nIG9yIHRoZVxuICAgKiByZXN0cmljdC1vbmx5IHdvcmtzcGFjZSBwb2xpY3kgbmFycm93cyBpdC4gVXNlcnMgYXJlIG5ldmVyIHBsYW4tZmlsdGVyZWQuXG4gICAqL1xuICBwcml2YXRlIGdyYW50U291cmNlKGFjdG9ySWQ6IHN0cmluZywgcGVybWlzc2lvbjogUGVybWlzc2lvbik6IHN0cmluZyB8IG51bGwge1xuICAgIGlmICh0aGlzLmdyYW50cy5nZXQoYWN0b3JJZCk/LmhhcyhwZXJtaXNzaW9uKSkgcmV0dXJuICdkaXJlY3QnO1xuICAgIGZvciAoY29uc3QgYXNzaWdubWVudCBvZiB0aGlzLnJvbGVBc3NpZ25tZW50cykge1xuICAgICAgaWYgKGFzc2lnbm1lbnQuYWN0b3JJZCAhPT0gYWN0b3JJZCB8fCBhc3NpZ25tZW50LnJldm9rZWQpIGNvbnRpbnVlO1xuICAgICAgaWYgKChERUxJVkVSWV9ST0xFU1thc3NpZ25tZW50LnJvbGVDb2RlXSA/PyBbXSkuaW5jbHVkZXMocGVybWlzc2lvbikpIHtcbiAgICAgICAgcmV0dXJuIGByb2xlOiR7YXNzaWdubWVudC5yb2xlQ29kZX1gO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIHByaXZhdGUgYWdlbnRDZWlsaW5nQWxsb3dzKGFjdG9yOiBBY3RvciB8IHVuZGVmaW5lZCwgcGVybWlzc2lvbjogUGVybWlzc2lvbik6IHsgcGxhbjogYm9vbGVhbjsgcG9saWN5OiBib29sZWFuIH0ge1xuICAgIGlmICghYWN0b3IgfHwgYWN0b3IudHlwZSAhPT0gJ2FnZW50JykgcmV0dXJuIHsgcGxhbjogdHJ1ZSwgcG9saWN5OiB0cnVlIH07XG4gICAgY29uc3QgY2VpbGluZyA9IFBMQU5fQ0VJTElOR1NbdGhpcy5wbGFuXTtcbiAgICBpZiAoKEFHRU5UX0dBVEVfQVBQUk9WRV9QRVJNSVNTSU9OUyBhcyByZWFkb25seSBzdHJpbmdbXSkuaW5jbHVkZXMocGVybWlzc2lvbikpIHtcbiAgICAgIHJldHVybiB7IHBsYW46IGNlaWxpbmcuYWdlbnRHYXRlQXBwcm92ZSwgcG9saWN5OiB0aGlzLndvcmtzcGFjZVBvbGljeS5hZ2VudEdhdGVBcHByb3ZhbHMgIT09IGZhbHNlIH07XG4gICAgfVxuICAgIGlmIChwZXJtaXNzaW9uID09PSAnZ2F0ZS5yZXZpZXcucmVqZWN0Jykge1xuICAgICAgcmV0dXJuIHsgcGxhbjogY2VpbGluZy5hZ2VudEdhdGVSZWplY3QsIHBvbGljeTogdHJ1ZSB9O1xuICAgIH1cbiAgICBpZiAocGVybWlzc2lvbiA9PT0gJ3Rhc2suY2xhaW0nKSB7XG4gICAgICByZXR1cm4geyBwbGFuOiB0cnVlLCBwb2xpY3k6IHRoaXMud29ya3NwYWNlUG9saWN5LmFnZW50U2VsZkRpc3BhdGNoICE9PSBmYWxzZSB9O1xuICAgIH1cbiAgICByZXR1cm4geyBwbGFuOiB0cnVlLCBwb2xpY3k6IHRydWUgfTtcbiAgfVxuXG4gIHByaXZhdGUgaGFzUGVybWlzc2lvbihhY3RvcklkOiBzdHJpbmcsIHBlcm1pc3Npb246IFBlcm1pc3Npb24pOiBib29sZWFuIHtcbiAgICBpZiAodGhpcy5ncmFudFNvdXJjZShhY3RvcklkLCBwZXJtaXNzaW9uKSA9PT0gbnVsbCkgcmV0dXJuIGZhbHNlO1xuICAgIGNvbnN0IGFsbG93cyA9IHRoaXMuYWdlbnRDZWlsaW5nQWxsb3dzKHRoaXMuYWN0b3JzLmdldChhY3RvcklkKSwgcGVybWlzc2lvbik7XG4gICAgcmV0dXJuIGFsbG93cy5wbGFuICYmIGFsbG93cy5wb2xpY3k7XG4gIH1cblxuICBwcml2YXRlIHJlcXVpcmVQZXJtaXNzaW9uKGFjdG9ySWQ6IHN0cmluZywgcGVybWlzc2lvbjogUGVybWlzc2lvbik6IHZvaWQge1xuICAgIGlmICghdGhpcy5oYXNQZXJtaXNzaW9uKGFjdG9ySWQsIHBlcm1pc3Npb24pKSB7XG4gICAgICB0aHJvdyBuZXcgUGVybWlzc2lvbkRlbmllZEVycm9yKHBlcm1pc3Npb24sIGFjdG9ySWQpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgcmVxdWlyZUdvdmVybmFuY2VBZG1pbihieUFjdG9ySWQ6IHN0cmluZyk6IHZvaWQge1xuICAgIGlmIChieUFjdG9ySWQgPT09IHRoaXMuc3lzdGVtQWN0b3JJZCkgcmV0dXJuO1xuICAgIGlmICh0aGlzLmdvdmVybmFuY2VSb2xlcy5nZXQoYnlBY3RvcklkKSA9PT0gJ2FkbWluJykgcmV0dXJuO1xuICAgIHRocm93IG5ldyBQZXJtaXNzaW9uRGVuaWVkRXJyb3IoJ2dvdmVybmFuY2UuYWRtaW4nLCBieUFjdG9ySWQpO1xuICB9XG5cbiAgLyoqIEdyYW50LXRpbWUgcGxhbiBjZWlsaW5nOiByZWZ1c2UgaXNzdWluZyBhZ2VudCBnYXRlIHBlcm1pc3Npb25zIHRoZSBwbGFuIGZvcmJpZHMuICovXG4gIHByaXZhdGUgY2hlY2tHcmFudENlaWxpbmcoYWN0b3JJZDogc3RyaW5nLCBwZXJtaXNzaW9uOiBQZXJtaXNzaW9uKTogdm9pZCB7XG4gICAgY29uc3QgYWN0b3IgPSB0aGlzLmFjdG9ycy5nZXQoYWN0b3JJZCk7XG4gICAgaWYgKCFhY3RvciB8fCBhY3Rvci50eXBlICE9PSAnYWdlbnQnKSByZXR1cm47XG4gICAgY29uc3QgY2VpbGluZyA9IFBMQU5fQ0VJTElOR1NbdGhpcy5wbGFuXTtcbiAgICBpZiAoKEFHRU5UX0dBVEVfQVBQUk9WRV9QRVJNSVNTSU9OUyBhcyByZWFkb25seSBzdHJpbmdbXSkuaW5jbHVkZXMocGVybWlzc2lvbikgJiYgIWNlaWxpbmcuYWdlbnRHYXRlQXBwcm92ZSkge1xuICAgICAgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoYHBsYW4gJHt0aGlzLnBsYW59IGRvZXMgbm90IGFsbG93IGFnZW50cyB0byBob2xkICR7cGVybWlzc2lvbn1gKTtcbiAgICB9XG4gICAgaWYgKHBlcm1pc3Npb24gPT09ICdnYXRlLnJldmlldy5yZWplY3QnICYmICFjZWlsaW5nLmFnZW50R2F0ZVJlamVjdCkge1xuICAgICAgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoYHBsYW4gJHt0aGlzLnBsYW59IGRvZXMgbm90IGFsbG93IGFnZW50cyB0byBob2xkICR7cGVybWlzc2lvbn1gKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGxpdmVDbGFpbSh3b3JrSXRlbUlkOiBzdHJpbmcpOiBDbGFpbVJvdyB8IG51bGwge1xuICAgIGZvciAoY29uc3QgY2xhaW1JZCBvZiB0aGlzLmNsYWltc0J5SXRlbS5nZXQod29ya0l0ZW1JZCkgPz8gW10pIHtcbiAgICAgIGNvbnN0IGNsYWltID0gdGhpcy5jbGFpbXMuZ2V0KGNsYWltSWQpO1xuICAgICAgaWYgKGNsYWltICYmICFjbGFpbS5yZWxlYXNlZCAmJiBjbGFpbS5sZWFzZUV4cGlyZXNBdCA+IHRoaXMubm93KSByZXR1cm4gY2xhaW07XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgLyoqXG4gICAqIEEgUFJFU0VOVEVEIHRva2VuIGlzIGFsd2F5cyB2YWxpZGF0ZWQsIG9uIGV2ZXJ5IGNvbW1hbmQgKGNvbmZvcm1hbmNlIHBpbixcbiAgICogY2xhaW1zLnRlc3QudHMpOiBzdGFsZS9mb3JlaWduL25vLWxpdmUtY2xhaW0gXHUyMTkyIENvbmZsaWN0RXJyb3IgKyBhdWRpdCBldmVudC5cbiAgICovXG4gIHByaXZhdGUgdmFsaWRhdGVQcmVzZW50ZWRUb2tlbihpdGVtOiBXb3JrSXRlbVJvdywgZmVuY2luZ1Rva2VuOiBudW1iZXIgfCB1bmRlZmluZWQsIGFjdG9ySWQ6IHN0cmluZyk6IHZvaWQge1xuICAgIGlmIChmZW5jaW5nVG9rZW4gPT09IHVuZGVmaW5lZCkgcmV0dXJuO1xuICAgIGNvbnN0IGxpdmUgPSB0aGlzLmxpdmVDbGFpbShpdGVtLmlkKTtcbiAgICBpZiAobGl2ZSA9PT0gbnVsbCB8fCBsaXZlLmZlbmNpbmdUb2tlbiAhPT0gZmVuY2luZ1Rva2VuKSB7XG4gICAgICB0aGlzLmFwcGVuZCgnd29ya19pdGVtJywgaXRlbS5pZCwgJ2ZlbmNpbmcucmVqZWN0ZWQnLCBhY3RvcklkLCB7XG4gICAgICAgIHByZXNlbnRlZFRva2VuOiBmZW5jaW5nVG9rZW4sXG4gICAgICAgIGxpdmVUb2tlbjogbGl2ZT8uZmVuY2luZ1Rva2VuID8/IG51bGwsXG4gICAgICB9KTtcbiAgICAgIHRocm93IG5ldyBDb25mbGljdEVycm9yKGBzdGFsZSBvciBmb3JlaWduIGZlbmNpbmcgdG9rZW4gZm9yIHdvcmsgaXRlbSAke2l0ZW0uaWR9YCk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBjb3B5SXRlbShpdGVtOiBXb3JrSXRlbVJvdyk6IFdvcmtJdGVtIHtcbiAgICBjb25zdCB7IGRlcGVuZHNPbjogX2RlcGVuZHNPbiwgLi4ucHViIH0gPSBpdGVtO1xuICAgIHJldHVybiB7IC4uLnB1YiwgcGlubmVkVmVyaWZpY2F0aW9uOiBpdGVtLnBpbm5lZFZlcmlmaWNhdGlvbiA/IFsuLi5pdGVtLnBpbm5lZFZlcmlmaWNhdGlvbl0gOiBudWxsIH07XG4gIH1cblxuICBwcml2YXRlIGNvcHlGZWF0dXJlKGZlYXR1cmU6IEZlYXR1cmUpOiBGZWF0dXJlIHtcbiAgICByZXR1cm4geyAuLi5mZWF0dXJlIH07XG4gIH1cblxuICBwcml2YXRlIGNvcHlDbGFpbShjbGFpbTogQ2xhaW1Sb3cpOiBDbGFpbSB7XG4gICAgY29uc3QgeyB0dGxNczogX3R0bCwgLi4ucHViIH0gPSBjbGFpbTtcbiAgICByZXR1cm4geyAuLi5wdWIgfTtcbiAgfVxuXG4gIC8vIC0tIHNldHVwIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgY3JlYXRlQWN0b3IoaW5wdXQ6IHtcbiAgICB0eXBlOiBFeGNsdWRlPEFjdG9yVHlwZSwgJ3N5c3RlbSc+O1xuICAgIGRpc3BsYXlOYW1lOiBzdHJpbmc7XG4gICAgZ292ZXJuYW5jZVJvbGU/OiBHb3Zlcm5hbmNlUm9sZTtcbiAgICBwZXJzb25hQ29kZT86IHN0cmluZztcbiAgfSk6IEFjdG9yIHtcbiAgICBjb25zdCBhY3RvcjogQWN0b3IgPSB7XG4gICAgICBpZDogdGhpcy5uZXh0SWQoJ2FjdG9yJyksXG4gICAgICB0eXBlOiBpbnB1dC50eXBlLFxuICAgICAgZGlzcGxheU5hbWU6IGlucHV0LmRpc3BsYXlOYW1lLFxuICAgICAgcGVyc29uYUNvZGU6IGlucHV0LnBlcnNvbmFDb2RlID8/IG51bGwsXG4gICAgfTtcbiAgICB0aGlzLmFjdG9ycy5zZXQoYWN0b3IuaWQsIGFjdG9yKTtcbiAgICB0aGlzLmdvdmVybmFuY2VSb2xlcy5zZXQoYWN0b3IuaWQsIGlucHV0LmdvdmVybmFuY2VSb2xlID8/ICdtZW1iZXInKTtcbiAgICByZXR1cm4geyAuLi5hY3RvciB9O1xuICB9XG5cbiAgZ3JhbnQoaW5wdXQ6IHsgYWN0b3JJZDogc3RyaW5nOyBwZXJtaXNzaW9uOiBQZXJtaXNzaW9uOyBzY29wZT86IHN0cmluZyB9KTogdm9pZCB7XG4gICAgdGhpcy5jaGVja0dyYW50Q2VpbGluZyhpbnB1dC5hY3RvcklkLCBpbnB1dC5wZXJtaXNzaW9uKTtcbiAgICBjb25zdCBzZXQgPSB0aGlzLmdyYW50cy5nZXQoaW5wdXQuYWN0b3JJZCkgPz8gbmV3IFNldDxzdHJpbmc+KCk7XG4gICAgc2V0LmFkZChpbnB1dC5wZXJtaXNzaW9uKTtcbiAgICB0aGlzLmdyYW50cy5zZXQoaW5wdXQuYWN0b3JJZCwgc2V0KTtcbiAgICB0aGlzLmFwcGVuZCgnYWN0b3InLCBpbnB1dC5hY3RvcklkLCAnZ3JhbnQuaXNzdWVkJywgdGhpcy5zeXN0ZW1BY3RvcklkLCB7IHBlcm1pc3Npb246IGlucHV0LnBlcm1pc3Npb24gfSk7XG4gIH1cblxuICByZXZva2UoaW5wdXQ6IHsgYWN0b3JJZDogc3RyaW5nOyBwZXJtaXNzaW9uOiBQZXJtaXNzaW9uOyBzY29wZT86IHN0cmluZyB9KTogdm9pZCB7XG4gICAgdGhpcy5ncmFudHMuZ2V0KGlucHV0LmFjdG9ySWQpPy5kZWxldGUoaW5wdXQucGVybWlzc2lvbik7XG4gICAgdGhpcy5hcHBlbmQoJ2FjdG9yJywgaW5wdXQuYWN0b3JJZCwgJ2dyYW50LnJldm9rZWQnLCB0aGlzLnN5c3RlbUFjdG9ySWQsIHsgcGVybWlzc2lvbjogaW5wdXQucGVybWlzc2lvbiB9KTtcbiAgfVxuXG4gIC8vIC0tIGVudGl0bGVtZW50cyAoUGhhc2UgMiwgcm9hZG1hcCBcdTAwQTczKSAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgc2V0R292ZXJuYW5jZVJvbGUoaW5wdXQ6IHsgYWN0b3JJZDogc3RyaW5nOyByb2xlOiBHb3Zlcm5hbmNlUm9sZTsgYnlBY3RvcklkOiBzdHJpbmcgfSk6IHZvaWQge1xuICAgIHRoaXMucmVxdWlyZUdvdmVybmFuY2VBZG1pbihpbnB1dC5ieUFjdG9ySWQpO1xuICAgIGlmICghdGhpcy5hY3RvcnMuaGFzKGlucHV0LmFjdG9ySWQpKSB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcihgdW5rbm93biBhY3RvcjogJHtpbnB1dC5hY3RvcklkfWApO1xuICAgIHRoaXMuZ292ZXJuYW5jZVJvbGVzLnNldChpbnB1dC5hY3RvcklkLCBpbnB1dC5yb2xlKTtcbiAgICB0aGlzLmFwcGVuZCgnYWN0b3InLCBpbnB1dC5hY3RvcklkLCAnZ292ZXJuYW5jZS5jaGFuZ2VkJywgaW5wdXQuYnlBY3RvcklkLCB7IHJvbGU6IGlucHV0LnJvbGUgfSk7XG4gIH1cblxuICBnZXRHb3Zlcm5hbmNlUm9sZShhY3RvcklkOiBzdHJpbmcpOiBHb3Zlcm5hbmNlUm9sZSB7XG4gICAgcmV0dXJuIHRoaXMuZ292ZXJuYW5jZVJvbGVzLmdldChhY3RvcklkKSA/PyAnbWVtYmVyJztcbiAgfVxuXG4gIGFzc2lnblJvbGUoaW5wdXQ6IHsgYWN0b3JJZDogc3RyaW5nOyByb2xlQ29kZTogc3RyaW5nOyBieUFjdG9ySWQ6IHN0cmluZyB9KTogdm9pZCB7XG4gICAgdGhpcy5yZXF1aXJlR292ZXJuYW5jZUFkbWluKGlucHV0LmJ5QWN0b3JJZCk7XG4gICAgY29uc3QgYnVuZGxlID0gREVMSVZFUllfUk9MRVNbaW5wdXQucm9sZUNvZGVdO1xuICAgIGlmIChidW5kbGUgPT09IHVuZGVmaW5lZCkgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoYHVua25vd24gZGVsaXZlcnkgcm9sZTogJHtpbnB1dC5yb2xlQ29kZX1gKTtcbiAgICBpZiAoIXRoaXMuYWN0b3JzLmhhcyhpbnB1dC5hY3RvcklkKSkgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoYHVua25vd24gYWN0b3I6ICR7aW5wdXQuYWN0b3JJZH1gKTtcbiAgICBmb3IgKGNvbnN0IHBlcm1pc3Npb24gb2YgYnVuZGxlKSB7XG4gICAgICB0aGlzLmNoZWNrR3JhbnRDZWlsaW5nKGlucHV0LmFjdG9ySWQsIHBlcm1pc3Npb24pO1xuICAgIH1cbiAgICBjb25zdCBhY3RpdmUgPSB0aGlzLnJvbGVBc3NpZ25tZW50cy5zb21lKFxuICAgICAgKGEpID0+IGEuYWN0b3JJZCA9PT0gaW5wdXQuYWN0b3JJZCAmJiBhLnJvbGVDb2RlID09PSBpbnB1dC5yb2xlQ29kZSAmJiAhYS5yZXZva2VkLFxuICAgICk7XG4gICAgaWYgKGFjdGl2ZSkgcmV0dXJuOyAvLyBpZGVtcG90ZW50XG4gICAgdGhpcy5yb2xlQXNzaWdubWVudHMucHVzaCh7XG4gICAgICBhY3RvcklkOiBpbnB1dC5hY3RvcklkLFxuICAgICAgcm9sZUNvZGU6IGlucHV0LnJvbGVDb2RlLFxuICAgICAgZ3JhbnRlZEJ5OiBpbnB1dC5ieUFjdG9ySWQsXG4gICAgICByZXZva2VkOiBmYWxzZSxcbiAgICB9KTtcbiAgICB0aGlzLmFwcGVuZCgnYWN0b3InLCBpbnB1dC5hY3RvcklkLCAncm9sZS5hc3NpZ25lZCcsIGlucHV0LmJ5QWN0b3JJZCwgeyByb2xlQ29kZTogaW5wdXQucm9sZUNvZGUgfSk7XG4gIH1cblxuICByZXZva2VSb2xlKGlucHV0OiB7IGFjdG9ySWQ6IHN0cmluZzsgcm9sZUNvZGU6IHN0cmluZzsgYnlBY3RvcklkOiBzdHJpbmcgfSk6IHZvaWQge1xuICAgIHRoaXMucmVxdWlyZUdvdmVybmFuY2VBZG1pbihpbnB1dC5ieUFjdG9ySWQpO1xuICAgIGlmIChERUxJVkVSWV9ST0xFU1tpbnB1dC5yb2xlQ29kZV0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoYHVua25vd24gZGVsaXZlcnkgcm9sZTogJHtpbnB1dC5yb2xlQ29kZX1gKTtcbiAgICB9XG4gICAgZm9yIChjb25zdCBhc3NpZ25tZW50IG9mIHRoaXMucm9sZUFzc2lnbm1lbnRzKSB7XG4gICAgICBpZiAoYXNzaWdubWVudC5hY3RvcklkID09PSBpbnB1dC5hY3RvcklkICYmIGFzc2lnbm1lbnQucm9sZUNvZGUgPT09IGlucHV0LnJvbGVDb2RlICYmICFhc3NpZ25tZW50LnJldm9rZWQpIHtcbiAgICAgICAgYXNzaWdubWVudC5yZXZva2VkID0gdHJ1ZTtcbiAgICAgIH1cbiAgICB9XG4gICAgdGhpcy5hcHBlbmQoJ2FjdG9yJywgaW5wdXQuYWN0b3JJZCwgJ3JvbGUucmV2b2tlZCcsIGlucHV0LmJ5QWN0b3JJZCwgeyByb2xlQ29kZTogaW5wdXQucm9sZUNvZGUgfSk7XG4gIH1cblxuICBsaXN0Um9sZUFzc2lnbm1lbnRzKGFjdG9ySWQ/OiBzdHJpbmcpOiBSb2xlQXNzaWdubWVudFtdIHtcbiAgICByZXR1cm4gdGhpcy5yb2xlQXNzaWdubWVudHNcbiAgICAgIC5maWx0ZXIoKGEpID0+IGFjdG9ySWQgPT09IHVuZGVmaW5lZCB8fCBhLmFjdG9ySWQgPT09IGFjdG9ySWQpXG4gICAgICAubWFwKChhKSA9PiAoeyAuLi5hIH0pKTtcbiAgfVxuXG4gIHNldFBsYW4oaW5wdXQ6IHsgcGxhbjogUGxhbkNvZGU7IGJ5QWN0b3JJZDogc3RyaW5nIH0pOiB2b2lkIHtcbiAgICB0aGlzLnJlcXVpcmVHb3Zlcm5hbmNlQWRtaW4oaW5wdXQuYnlBY3RvcklkKTtcbiAgICBpZiAoUExBTl9DRUlMSU5HU1tpbnB1dC5wbGFuXSA9PT0gdW5kZWZpbmVkKSB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcihgdW5rbm93biBwbGFuOiAke2lucHV0LnBsYW59YCk7XG4gICAgdGhpcy5wbGFuID0gaW5wdXQucGxhbjtcbiAgICB0aGlzLnBsYW5WZXJzaW9uICs9IDE7XG4gICAgdGhpcy5hcHBlbmQoJ3dvcmtzcGFjZScsICd3b3Jrc3BhY2UnLCAncGxhbi5jaGFuZ2VkJywgaW5wdXQuYnlBY3RvcklkLCB7XG4gICAgICBwbGFuOiBpbnB1dC5wbGFuLFxuICAgICAgcGxhblZlcnNpb246IHRoaXMucGxhblZlcnNpb24sXG4gICAgfSk7XG4gIH1cblxuICBnZXRQbGFuKCk6IFBsYW5Db2RlIHtcbiAgICByZXR1cm4gdGhpcy5wbGFuO1xuICB9XG5cbiAgc2V0V29ya3NwYWNlUG9saWN5KGlucHV0OiB7IHBvbGljeTogV29ya3NwYWNlUG9saWN5OyBieUFjdG9ySWQ6IHN0cmluZyB9KTogdm9pZCB7XG4gICAgdGhpcy5yZXF1aXJlR292ZXJuYW5jZUFkbWluKGlucHV0LmJ5QWN0b3JJZCk7XG4gICAgdGhpcy53b3Jrc3BhY2VQb2xpY3kgPSB7IC4uLnRoaXMud29ya3NwYWNlUG9saWN5LCAuLi5pbnB1dC5wb2xpY3kgfTtcbiAgICB0aGlzLnBvbGljeVZlcnNpb24gKz0gMTtcbiAgICB0aGlzLmFwcGVuZCgnd29ya3NwYWNlJywgJ3dvcmtzcGFjZScsICdwb2xpY3kuY2hhbmdlZCcsIGlucHV0LmJ5QWN0b3JJZCwge1xuICAgICAgcG9saWN5OiB7IC4uLnRoaXMud29ya3NwYWNlUG9saWN5IH0sXG4gICAgICBwb2xpY3lWZXJzaW9uOiB0aGlzLnBvbGljeVZlcnNpb24sXG4gICAgfSk7XG4gIH1cblxuICBnZXRXb3Jrc3BhY2VQb2xpY3koKTogV29ya3NwYWNlUG9saWN5IHtcbiAgICByZXR1cm4geyAuLi50aGlzLndvcmtzcGFjZVBvbGljeSB9O1xuICB9XG5cbiAgc2V0R2F0ZVBvbGljeShpbnB1dDogeyBnYXRlOiBHYXRlQ29kZTsgcG9saWN5OiBHYXRlUG9saWN5OyBieUFjdG9ySWQ6IHN0cmluZyB9KTogdm9pZCB7XG4gICAgdGhpcy5yZXF1aXJlR292ZXJuYW5jZUFkbWluKGlucHV0LmJ5QWN0b3JJZCk7XG4gICAgY29uc3QgbWluQXBwcm92YWxzID0gaW5wdXQucG9saWN5Lm1pbkFwcHJvdmFscyA/PyAxO1xuICAgIGlmICghTnVtYmVyLmlzSW50ZWdlcihtaW5BcHByb3ZhbHMpIHx8IG1pbkFwcHJvdmFscyA8IDEpIHtcbiAgICAgIHRocm93IG5ldyBHdWFyZEZhaWxlZEVycm9yKCdtaW5BcHByb3ZhbHMgbXVzdCBiZSBhIHBvc2l0aXZlIGludGVnZXInKTtcbiAgICB9XG4gICAgdGhpcy5nYXRlUG9saWNpZXMuc2V0KGlucHV0LmdhdGUsIHsgLi4uaW5wdXQucG9saWN5IH0pO1xuICAgIHRoaXMuYXBwZW5kKCd3b3Jrc3BhY2UnLCAnd29ya3NwYWNlJywgJ2dhdGVfcG9saWN5LmNoYW5nZWQnLCBpbnB1dC5ieUFjdG9ySWQsIHtcbiAgICAgIGdhdGU6IGlucHV0LmdhdGUsXG4gICAgICBwb2xpY3k6IHsgLi4uaW5wdXQucG9saWN5IH0sXG4gICAgfSk7XG4gIH1cblxuICBnZXRHYXRlUG9saWN5KGdhdGU6IEdhdGVDb2RlKTogR2F0ZVBvbGljeSB7XG4gICAgcmV0dXJuIHsgLi4uKHRoaXMuZ2F0ZVBvbGljaWVzLmdldChnYXRlKSA/PyB7fSkgfTtcbiAgfVxuXG4gIGxpc3RBY3RvcnMoKTogQWN0b3JbXSB7XG4gICAgcmV0dXJuIFsuLi50aGlzLmFjdG9ycy52YWx1ZXMoKV0ubWFwKChhKSA9PiAoeyAuLi5hIH0pKTtcbiAgfVxuXG4gIHByb3Zpc2lvblBlcnNvbmFzKGlucHV0OiB7IGJ5QWN0b3JJZDogc3RyaW5nIH0pOiBBY3RvcltdIHtcbiAgICB0aGlzLnJlcXVpcmVHb3Zlcm5hbmNlQWRtaW4oaW5wdXQuYnlBY3RvcklkKTtcbiAgICBjb25zdCBwcm92aXNpb25lZDogQWN0b3JbXSA9IFtdO1xuICAgIGZvciAoY29uc3QgcGVyc29uYSBvZiBQRVJTT05BUykge1xuICAgICAgbGV0IGFjdG9yID0gWy4uLnRoaXMuYWN0b3JzLnZhbHVlcygpXS5maW5kKChhKSA9PiBhLnBlcnNvbmFDb2RlID09PSBwZXJzb25hLnBlcnNvbmFDb2RlKTtcbiAgICAgIGlmICghYWN0b3IpIHtcbiAgICAgICAgYWN0b3IgPSB0aGlzLmNyZWF0ZUFjdG9yKHtcbiAgICAgICAgICB0eXBlOiAnYWdlbnQnLFxuICAgICAgICAgIGRpc3BsYXlOYW1lOiBwZXJzb25hLmRpc3BsYXlOYW1lLFxuICAgICAgICAgIHBlcnNvbmFDb2RlOiBwZXJzb25hLnBlcnNvbmFDb2RlLFxuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy5hcHBlbmQoJ2FjdG9yJywgYWN0b3IuaWQsICdhY3Rvci5wcm92aXNpb25lZCcsIGlucHV0LmJ5QWN0b3JJZCwge1xuICAgICAgICAgIHBlcnNvbmFDb2RlOiBwZXJzb25hLnBlcnNvbmFDb2RlLFxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIC8vIEZsb29yLXN0YXRlIHJvbGUgKHRoZXNpcyk6IGFzc2lnblJvbGUgaXMgaWRlbXBvdGVudC5cbiAgICAgIHRoaXMuYXNzaWduUm9sZSh7IGFjdG9ySWQ6IGFjdG9yLmlkLCByb2xlQ29kZTogcGVyc29uYS5kZWZhdWx0Um9sZSwgYnlBY3RvcklkOiBpbnB1dC5ieUFjdG9ySWQgfSk7XG4gICAgICBwcm92aXNpb25lZC5wdXNoKHsgLi4uYWN0b3IgfSk7XG4gICAgfVxuICAgIHJldHVybiBwcm92aXNpb25lZDtcbiAgfVxuXG4gIGF1dGh6RXhwbGFpbihpbnB1dDogeyBhY3RvcklkOiBzdHJpbmc7IHBlcm1pc3Npb246IFBlcm1pc3Npb24gfSk6IEF1dGh6RXhwbGFuYXRpb24ge1xuICAgIGNvbnN0IHNvdXJjZSA9IHRoaXMuZ3JhbnRTb3VyY2UoaW5wdXQuYWN0b3JJZCwgaW5wdXQucGVybWlzc2lvbik7XG4gICAgY29uc3QgYWxsb3dzID0gdGhpcy5hZ2VudENlaWxpbmdBbGxvd3ModGhpcy5hY3RvcnMuZ2V0KGlucHV0LmFjdG9ySWQpLCBpbnB1dC5wZXJtaXNzaW9uKTtcbiAgICByZXR1cm4ge1xuICAgICAgYWN0b3JJZDogaW5wdXQuYWN0b3JJZCxcbiAgICAgIHBlcm1pc3Npb246IGlucHV0LnBlcm1pc3Npb24sXG4gICAgICBhbGxvd2VkOiBzb3VyY2UgIT09IG51bGwgJiYgYWxsb3dzLnBsYW4gJiYgYWxsb3dzLnBvbGljeSxcbiAgICAgIHNvdXJjZSxcbiAgICAgIGdvdmVybmFuY2VSb2xlOiB0aGlzLmdldEdvdmVybmFuY2VSb2xlKGlucHV0LmFjdG9ySWQpLFxuICAgICAgcGxhbjogdGhpcy5wbGFuLFxuICAgICAgcGxhbkFsbG93czogYWxsb3dzLnBsYW4sXG4gICAgICBwb2xpY3lBbGxvd3M6IGFsbG93cy5wb2xpY3ksXG4gICAgICB2ZXJzaW9uczogeyBwbGFuOiB0aGlzLnBsYW5WZXJzaW9uLCBwb2xpY3k6IHRoaXMucG9saWN5VmVyc2lvbiB9LFxuICAgIH07XG4gIH1cblxuICBjcmVhdGVGZWF0dXJlKGlucHV0OiB7IGFjdG9ySWQ6IHN0cmluZyB9KTogRmVhdHVyZSB7XG4gICAgY29uc3QgZmVhdHVyZTogRmVhdHVyZSA9IHsgaWQ6IHRoaXMubmV4dElkKCdmZWF0JyksIHN0YXRlOiAnYmFja2xvZycsIGRpc3BhdGNoSG9sZDogZmFsc2UgfTtcbiAgICB0aGlzLmZlYXR1cmVzLnNldChmZWF0dXJlLmlkLCBmZWF0dXJlKTtcbiAgICB0aGlzLmFwcGVuZCgnZmVhdHVyZScsIGZlYXR1cmUuaWQsICdmZWF0dXJlLmNyZWF0ZWQnLCBpbnB1dC5hY3RvcklkLCB7fSk7XG4gICAgcmV0dXJuIHRoaXMuY29weUZlYXR1cmUoZmVhdHVyZSk7XG4gIH1cblxuICBjcmVhdGVXb3JrSXRlbShpbnB1dDogQ3JlYXRlV29ya0l0ZW1JbnB1dCAmIHsgYWN0b3JJZDogc3RyaW5nIH0pOiBXb3JrSXRlbSB7XG4gICAgY29uc3Qgc2x1ZyA9IGlucHV0LnRpdGxlXG4gICAgICAudG9Mb3dlckNhc2UoKVxuICAgICAgLnJlcGxhY2UoL1teYS16MC05XSsvZywgJy0nKVxuICAgICAgLnJlcGxhY2UoLyheLXwtJCkvZywgJycpO1xuICAgIGNvbnN0IGl0ZW06IFdvcmtJdGVtUm93ID0ge1xuICAgICAgaWQ6IHRoaXMubmV4dElkKCd3aScpLFxuICAgICAgZmVhdHVyZUlkOiBpbnB1dC5mZWF0dXJlSWQsXG4gICAgICBleHRlcm5hbEtleTogaW5wdXQuZXh0ZXJuYWxLZXksXG4gICAgICBraW5kOiBpbnB1dC5raW5kID8/ICdjb2RlJyxcbiAgICAgIHRpdGxlOiBpbnB1dC50aXRsZSxcbiAgICAgIHN0YXRlOiAnYmFja2xvZycsXG4gICAgICBibG9ja2VkUmVhc29uOiBudWxsLFxuICAgICAgcmV2aWV3TG9vcEl0ZXJhdGlvbjogMCxcbiAgICAgIGludGVudEhhc2g6IG51bGwsXG4gICAgICBwaW5uZWRWZXJpZmljYXRpb246IG51bGwsXG4gICAgICBzcGVjQ2hlY2twb2ludDogaW5wdXQuc3BlY0NoZWNrcG9pbnQgPz8gZmFsc2UsXG4gICAgICBkb25lQ2hlY2twb2ludDogaW5wdXQuZG9uZUNoZWNrcG9pbnQgPz8gZmFsc2UsXG4gICAgICBpbnZva2VEZXZXaXRoOiBpbnB1dC5pbnZva2VEZXZXaXRoID8/ICcnLFxuICAgICAgc3BlY1BhdGg6IGBzdG9yaWVzLyR7aW5wdXQuZXh0ZXJuYWxLZXl9LSR7c2x1Z30ubWRgLFxuICAgICAgc3RhdGVWZXJzaW9uOiAwLFxuICAgICAgZGVwZW5kc09uOiBpbnB1dC5kZXBlbmRzT24gPyBbLi4uaW5wdXQuZGVwZW5kc09uXSA6IFtdLFxuICAgIH07XG4gICAgdGhpcy53b3JrSXRlbXMuc2V0KGl0ZW0uaWQsIGl0ZW0pO1xuICAgIGlmICghdGhpcy5leHRlcm5hbEtleUluZGV4LmhhcyhpdGVtLmV4dGVybmFsS2V5KSkge1xuICAgICAgdGhpcy5leHRlcm5hbEtleUluZGV4LnNldChpdGVtLmV4dGVybmFsS2V5LCBpdGVtLmlkKTtcbiAgICB9XG4gICAgdGhpcy5hcHBlbmQoJ3dvcmtfaXRlbScsIGl0ZW0uaWQsICd3b3JrX2l0ZW0uY3JlYXRlZCcsIGlucHV0LmFjdG9ySWQsIHtcbiAgICAgIGV4dGVybmFsS2V5OiBpdGVtLmV4dGVybmFsS2V5LFxuICAgICAgZmVhdHVyZUlkOiBpdGVtLmZlYXR1cmVJZCxcbiAgICB9KTtcbiAgICByZXR1cm4gdGhpcy5jb3B5SXRlbShpdGVtKTtcbiAgfVxuXG4gIGltcG9ydFN0b3JpZXMoaW5wdXQ6IHsgZmVhdHVyZUlkOiBzdHJpbmc7IHlhbWw6IHN0cmluZzsgYWN0b3JJZDogc3RyaW5nIH0pOiBTdG9yaWVzSW1wb3J0UmVzdWx0IHtcbiAgICBjb25zdCBlbnRyaWVzID0gcGFyc2VTdG9yaWVzKGlucHV0LnlhbWwpO1xuICAgIGlmICghdGhpcy5mZWF0dXJlcy5oYXMoaW5wdXQuZmVhdHVyZUlkKSkge1xuICAgICAgdGhyb3cgbmV3IFN0b3JpZXNWYWxpZGF0aW9uRXJyb3IoYHVua25vd24gZmVhdHVyZTogJHtpbnB1dC5mZWF0dXJlSWR9YCk7XG4gICAgfVxuICAgIGNvbnN0IGltcG9ydGVkOiBzdHJpbmdbXSA9IFtdO1xuICAgIGNvbnN0IHVwZGF0ZWQ6IHN0cmluZ1tdID0gW107XG4gICAgY29uc3Qgd2FybmluZ3M6IHN0cmluZ1tdID0gW107XG5cbiAgICBmb3IgKGNvbnN0IGVudHJ5IG9mIGVudHJpZXMpIHtcbiAgICAgIGNvbnN0IGV4aXN0aW5nID0gWy4uLnRoaXMud29ya0l0ZW1zLnZhbHVlcygpXS5maW5kKFxuICAgICAgICAod2kpID0+IHdpLmZlYXR1cmVJZCA9PT0gaW5wdXQuZmVhdHVyZUlkICYmIHdpLmV4dGVybmFsS2V5ID09PSBlbnRyeS5pZCxcbiAgICAgICk7XG4gICAgICBpZiAoZXhpc3RpbmcpIHtcbiAgICAgICAgLy8gUmUtaW1wb3J0IHJlZnJlc2hlcyBkZXNjcmlwdGl2ZSBmaWVsZHM7IGxpZmVjeWNsZSBzdGF0ZSBpcyBuZXZlclxuICAgICAgICAvLyB0b3VjaGVkIChzdG9yaWVzLnlhbWwgY2FycmllcyBubyBzdGF0dXMgXHUyMDE0IEQ5LCB2YWxpZGl0eSBydWxlIDMpLlxuICAgICAgICBleGlzdGluZy50aXRsZSA9IGVudHJ5LnRpdGxlO1xuICAgICAgICBleGlzdGluZy5zcGVjQ2hlY2twb2ludCA9IGVudHJ5LnNwZWNDaGVja3BvaW50O1xuICAgICAgICBleGlzdGluZy5kb25lQ2hlY2twb2ludCA9IGVudHJ5LmRvbmVDaGVja3BvaW50O1xuICAgICAgICBleGlzdGluZy5pbnZva2VEZXZXaXRoID0gZW50cnkuaW52b2tlRGV2V2l0aDtcbiAgICAgICAgdGhpcy5hcHBlbmQoJ3dvcmtfaXRlbScsIGV4aXN0aW5nLmlkLCAnd29ya19pdGVtLnJlaW1wb3J0ZWQnLCBpbnB1dC5hY3RvcklkLCB7IGV4dGVybmFsS2V5OiBlbnRyeS5pZCB9KTtcbiAgICAgICAgdXBkYXRlZC5wdXNoKGVudHJ5LmlkKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuY3JlYXRlV29ya0l0ZW0oe1xuICAgICAgICAgIGZlYXR1cmVJZDogaW5wdXQuZmVhdHVyZUlkLFxuICAgICAgICAgIGV4dGVybmFsS2V5OiBlbnRyeS5pZCxcbiAgICAgICAgICB0aXRsZTogZW50cnkudGl0bGUsXG4gICAgICAgICAgc3BlY0NoZWNrcG9pbnQ6IGVudHJ5LnNwZWNDaGVja3BvaW50LFxuICAgICAgICAgIGRvbmVDaGVja3BvaW50OiBlbnRyeS5kb25lQ2hlY2twb2ludCxcbiAgICAgICAgICBpbnZva2VEZXZXaXRoOiBlbnRyeS5pbnZva2VEZXZXaXRoLFxuICAgICAgICAgIGFjdG9ySWQ6IGlucHV0LmFjdG9ySWQsXG4gICAgICAgIH0pO1xuICAgICAgICBpbXBvcnRlZC5wdXNoKGVudHJ5LmlkKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHsgaW1wb3J0ZWQsIHVwZGF0ZWQsIHdhcm5pbmdzIH07XG4gIH1cblxuICAvLyAtLSBjbGFpbXMgKHJvYWRtYXAgXHUwMEE3MS4zKSAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICBjbGFpbVRhc2soaW5wdXQ6IHsgd29ya0l0ZW1JZDogc3RyaW5nOyBhY3RvcklkOiBzdHJpbmc7IHR0bE1zPzogbnVtYmVyIH0pOiBDbGFpbSB7XG4gICAgY29uc3QgaXRlbSA9IHRoaXMubXVzdEdldEl0ZW0oaW5wdXQud29ya0l0ZW1JZCk7XG4gICAgdGhpcy5yZXF1aXJlUGVybWlzc2lvbihpbnB1dC5hY3RvcklkLCAndGFzay5jbGFpbScpO1xuICAgIGlmICh0aGlzLmxpdmVDbGFpbShpdGVtLmlkKSAhPT0gbnVsbCkge1xuICAgICAgLy8gT25lIGxpdmUgY2xhaW0gcGVyIHdvcmsgaXRlbSBcdTIwMTQgcmFjZXMgbG9zZSBieSBjb25zdHJhaW50IChcdTAwQTcxLjMpO1xuICAgICAgLy8gdGhlIGxvc2VyIGxlYXZlcyBubyByb3cgYmVoaW5kLlxuICAgICAgdGhyb3cgbmV3IENvbmZsaWN0RXJyb3IoYHdvcmsgaXRlbSAke2l0ZW0uaWR9IGFscmVhZHkgaGFzIGEgbGl2ZSBjbGFpbWApO1xuICAgIH1cbiAgICBjb25zdCB0dGxNcyA9IGlucHV0LnR0bE1zID8/IDE1ICogNjAgKiAxMDAwO1xuICAgIGNvbnN0IHRva2VuID0gKHRoaXMuZmVuY2luZ0NvdW50ZXIuZ2V0KGl0ZW0uaWQpID8/IDApICsgMTtcbiAgICB0aGlzLmZlbmNpbmdDb3VudGVyLnNldChpdGVtLmlkLCB0b2tlbik7XG4gICAgY29uc3QgY2xhaW06IENsYWltUm93ID0ge1xuICAgICAgaWQ6IHRoaXMubmV4dElkKCdjbGFpbScpLFxuICAgICAgd29ya0l0ZW1JZDogaXRlbS5pZCxcbiAgICAgIGFjdG9ySWQ6IGlucHV0LmFjdG9ySWQsXG4gICAgICBmZW5jaW5nVG9rZW46IHRva2VuLFxuICAgICAgbGVhc2VFeHBpcmVzQXQ6IHRoaXMubm93ICsgdHRsTXMsXG4gICAgICByZWxlYXNlZDogZmFsc2UsXG4gICAgICB0dGxNcyxcbiAgICB9O1xuICAgIHRoaXMuY2xhaW1zLnNldChjbGFpbS5pZCwgY2xhaW0pO1xuICAgIHRoaXMuY2xhaW1zQnlJdGVtLnNldChpdGVtLmlkLCBbLi4uKHRoaXMuY2xhaW1zQnlJdGVtLmdldChpdGVtLmlkKSA/PyBbXSksIGNsYWltLmlkXSk7XG4gICAgdGhpcy5hcHBlbmQoJ3dvcmtfaXRlbScsIGl0ZW0uaWQsICd3b3JrX2l0ZW0uY2xhaW1lZCcsIGlucHV0LmFjdG9ySWQsIHsgY2xhaW1JZDogY2xhaW0uaWQsIGZlbmNpbmdUb2tlbjogdG9rZW4gfSk7XG4gICAgcmV0dXJuIHRoaXMuY29weUNsYWltKGNsYWltKTtcbiAgfVxuXG4gIGhlYXJ0YmVhdChpbnB1dDogeyBjbGFpbUlkOiBzdHJpbmcgfSk6IHZvaWQge1xuICAgIGNvbnN0IGNsYWltID0gdGhpcy5jbGFpbXMuZ2V0KGlucHV0LmNsYWltSWQpO1xuICAgIGlmICghY2xhaW0gfHwgY2xhaW0ucmVsZWFzZWQgfHwgY2xhaW0ubGVhc2VFeHBpcmVzQXQgPD0gdGhpcy5ub3cpIHtcbiAgICAgIHRocm93IG5ldyBDb25mbGljdEVycm9yKGBjbGFpbSAke2lucHV0LmNsYWltSWR9IGlzIG5vdCBsaXZlYCk7XG4gICAgfVxuICAgIGNsYWltLmxlYXNlRXhwaXJlc0F0ID0gdGhpcy5ub3cgKyBjbGFpbS50dGxNcztcbiAgfVxuXG4gIHJlbGVhc2VDbGFpbShpbnB1dDogeyBjbGFpbUlkOiBzdHJpbmc7IHJlYXNvbj86IHN0cmluZyB9KTogdm9pZCB7XG4gICAgY29uc3QgY2xhaW0gPSB0aGlzLmNsYWltcy5nZXQoaW5wdXQuY2xhaW1JZCk7XG4gICAgaWYgKCFjbGFpbSB8fCBjbGFpbS5yZWxlYXNlZCkgcmV0dXJuO1xuICAgIGNsYWltLnJlbGVhc2VkID0gdHJ1ZTtcbiAgICB0aGlzLmFwcGVuZCgnd29ya19pdGVtJywgY2xhaW0ud29ya0l0ZW1JZCwgJ2NsYWltLnJlbGVhc2VkJywgY2xhaW0uYWN0b3JJZCwge1xuICAgICAgY2xhaW1JZDogY2xhaW0uaWQsXG4gICAgICByZWFzb246IGlucHV0LnJlYXNvbiA/PyBudWxsLFxuICAgIH0pO1xuICB9XG5cbiAgYWR2YW5jZUNsb2NrKG1zOiBudW1iZXIpOiB2b2lkIHtcbiAgICB0aGlzLm5vdyArPSBtcztcbiAgfVxuXG4gIC8vIC0tIGxpZmVjeWNsZSAocm9hZG1hcCBcdTAwQTcxLjIpIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgYWR2YW5jZVN0YXRlKGlucHV0OiBBZHZhbmNlSW5wdXQpOiBXb3JrSXRlbSB7XG4gICAgY29uc3QgaXRlbSA9IHRoaXMubXVzdEdldEl0ZW0oaW5wdXQud29ya0l0ZW1JZCk7XG5cbiAgICAvLyBLZXllZCByZXBsYXk6IHRoZSBzYW1lIGNvbW1hbmQgcmV0dXJucyB0aGUgc2FtZSByZXN1bHQsIGFwcGVuZHMgbm90aGluZy5cbiAgICBpZiAoaW5wdXQuaWRlbXBvdGVuY3lLZXkgIT09IHVuZGVmaW5lZCkge1xuICAgICAgY29uc3QgY2FjaGVkID0gdGhpcy5pZGVtcG90ZW5jeUNhY2hlLmdldChpbnB1dC5pZGVtcG90ZW5jeUtleSk7XG4gICAgICBpZiAoY2FjaGVkKSByZXR1cm4geyAuLi5jYWNoZWQgfTtcbiAgICB9XG5cbiAgICAvLyBQcmVzZXJ2YXRpb24gbm8tb3AgKHNwcmludC1wbGFubmluZyBpZGVtcG90ZW5jeSBydWxlKTogYW4gVU5LRVlFRFxuICAgIC8vIHJlLXJlcXVlc3Qgb2YgdGhlIGN1cnJlbnQgc3RhdGUgc3VjY2VlZHMgd2l0aG91dCBhbiBldmVudC4gQSBORVcga2V5ZWRcbiAgICAvLyBjb21tYW5kIGlzIGEgZ2VudWluZWx5IG5ldyBjb21tYW5kIGFuZCBmYWxscyB0aHJvdWdoIHRvIHRoZSBzdHJpY3RcbiAgICAvLyB0YWJsZSBjaGVjayAoY29uY3VycmVuY3kudGVzdC50cyBwaW4pLlxuICAgIGlmIChpbnB1dC5pZGVtcG90ZW5jeUtleSA9PT0gdW5kZWZpbmVkICYmIGlucHV0LnRvID09PSBpdGVtLnN0YXRlKSB7XG4gICAgICB0aGlzLnZhbGlkYXRlUHJlc2VudGVkVG9rZW4oaXRlbSwgaW5wdXQuZmVuY2luZ1Rva2VuLCBpbnB1dC5hY3RvcklkKTtcbiAgICAgIHJldHVybiB0aGlzLmNvcHlJdGVtKGl0ZW0pO1xuICAgIH1cblxuICAgIC8vIFRyYW5zaXRpb24tdGFibGUgbG9va3VwIHByZWNlZGVzIGNsYWltL3Rva2VuL3Blcm1pc3Npb24gY2hlY2tzXG4gICAgLy8gKGZzbS10cmFuc2l0aW9ucyBwaW46IHVuZGVjbGFyZWQgZG93bmdyYWRlcyBhcmUgSW52YWxpZFRyYW5zaXRpb25FcnJvclxuICAgIC8vIGV2ZW4gd2l0aCBubyB0b2tlbiBwcmVzZW50ZWQpLlxuICAgIGNvbnN0IHJ1bGUgPSBUUkFOU0lUSU9OUy5maW5kKCh0KSA9PiB0LmZyb20gPT09IGl0ZW0uc3RhdGUgJiYgdC50byA9PT0gaW5wdXQudG8pO1xuICAgIGlmICghcnVsZSkge1xuICAgICAgaWYgKFJBTktbaW5wdXQudG9dIDwgUkFOS1tpdGVtLnN0YXRlXSAmJiB0aGlzLmhhc1Blcm1pc3Npb24oaW5wdXQuYWN0b3JJZCwgJ3N0YXRlLmRvd25ncmFkZScpKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnByaXZpbGVnZWREb3duZ3JhZGUoaXRlbSwgaW5wdXQpO1xuICAgICAgfVxuICAgICAgdGhyb3cgbmV3IEludmFsaWRUcmFuc2l0aW9uRXJyb3IoaXRlbS5zdGF0ZSwgaW5wdXQudG8pO1xuICAgIH1cblxuICAgIHRoaXMudmFsaWRhdGVQcmVzZW50ZWRUb2tlbihpdGVtLCBpbnB1dC5mZW5jaW5nVG9rZW4sIGlucHV0LmFjdG9ySWQpO1xuXG4gICAgLy8gQmxvY2tlZCBvdmVybGF5IGZyZWV6ZXMgdHJhbnNpdGlvbnMgYXQgZXZlcnkgc3RhdGUgKEQ4LCBcdTAwQTcxLjEpLlxuICAgIGlmIChpdGVtLmJsb2NrZWRSZWFzb24gIT09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBHdWFyZEZhaWxlZEVycm9yKGB3b3JrIGl0ZW0gaXMgYmxvY2tlZDogJHtpdGVtLmJsb2NrZWRSZWFzb259YCk7XG4gICAgfVxuXG4gICAgdGhpcy5yZXF1aXJlUGVybWlzc2lvbihpbnB1dC5hY3RvcklkLCBydWxlLnBlcm1pc3Npb24pO1xuXG4gICAgaWYgKHJ1bGUuY2xhaW1SZXF1aXJlZCkge1xuICAgICAgLy8gRXhlY3V0aW9uLXpvbmUgdHJhbnNpdGlvbnMgZGVtYW5kIGEgUFJFU0VOVEVEIGxpdmUgdG9rZW4gXHUyMDE0IGhvbGRpbmdcbiAgICAgIC8vIHRoZSBjbGFpbSB3aXRob3V0IHByZXNlbnRpbmcgaXQgaXMgbm90IGVub3VnaCAoY2xhaW1zLnRlc3QudHMgcGluKS5cbiAgICAgIGlmIChpbnB1dC5mZW5jaW5nVG9rZW4gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcignY2xhaW0gZmVuY2luZyB0b2tlbiByZXF1aXJlZCBmb3IgdGhpcyB0cmFuc2l0aW9uJyk7XG4gICAgICB9XG4gICAgICAvLyAoYWxyZWFkeSB2YWxpZGF0ZWQgYWJvdmUpXG4gICAgfVxuXG4gICAgZm9yIChjb25zdCBndWFyZCBvZiBydWxlLmd1YXJkcykge1xuICAgICAgdGhpcy5jaGVja0d1YXJkKGd1YXJkLCBpdGVtKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5leGVjdXRlVHJhbnNpdGlvbihpdGVtLCBpbnB1dC50bywgaW5wdXQuYWN0b3JJZCwgaW5wdXQuaWRlbXBvdGVuY3lLZXkpO1xuICB9XG5cbiAgcHJpdmF0ZSBjaGVja0d1YXJkKGd1YXJkOiBUcmFuc2l0aW9uUnVsZVsnZ3VhcmRzJ11bbnVtYmVyXSwgaXRlbTogV29ya0l0ZW1Sb3cpOiB2b2lkIHtcbiAgICBzd2l0Y2ggKGd1YXJkKSB7XG4gICAgICBjYXNlICdkZXBzX2RvbmUnOiB7XG4gICAgICAgIGZvciAoY29uc3QgZGVwS2V5IG9mIGl0ZW0uZGVwZW5kc09uKSB7XG4gICAgICAgICAgY29uc3QgZGVwID0gWy4uLnRoaXMud29ya0l0ZW1zLnZhbHVlcygpXS5maW5kKFxuICAgICAgICAgICAgKHdpKSA9PiB3aS5mZWF0dXJlSWQgPT09IGl0ZW0uZmVhdHVyZUlkICYmIHdpLmV4dGVybmFsS2V5ID09PSBkZXBLZXksXG4gICAgICAgICAgKTtcbiAgICAgICAgICBpZiAoZGVwICYmIGRlcC5zdGF0ZSAhPT0gJ2RvbmUnKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcihgZGVwZW5kZW5jeSAke2RlcEtleX0gaXMgbm90IGRvbmVgKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgY2FzZSAnc3BlY19nYXRlX2lmX2NoZWNrcG9pbnQnOiB7XG4gICAgICAgIGlmICghaXRlbS5zcGVjQ2hlY2twb2ludCkgcmV0dXJuO1xuICAgICAgICBjb25zdCBhcHByb3ZlZCA9IHRoaXMuZ2F0ZURlY2lzaW9ucy5zb21lKFxuICAgICAgICAgIChkKSA9PiBkLndvcmtJdGVtSWQgPT09IGl0ZW0uaWQgJiYgZC5nYXRlID09PSAnc3BlY19hcHByb3ZhbCcgJiYgZC5kZWNpc2lvbiA9PT0gJ2FwcHJvdmVkJyxcbiAgICAgICAgKTtcbiAgICAgICAgaWYgKCFhcHByb3ZlZCkge1xuICAgICAgICAgIHRocm93IG5ldyBHdWFyZEZhaWxlZEVycm9yKCdzcGVjX2NoZWNrcG9pbnQgcmVxdWlyZXMgYW4gYXBwcm92ZWQgc3BlY19hcHByb3ZhbCBnYXRlIGRlY2lzaW9uJyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgY2FzZSAnbm9uZW1wdHlfZGlmZic6IHtcbiAgICAgICAgLy8gUGhhc2UgNCAocm9hZG1hcCBcdTAwQTcxLjQpOiBraW5kIHNlbGVjdHMgV0hJQ0ggbWFjaGluZSBldmlkZW5jZSBhcHBsaWVzLlxuICAgICAgICBpZiAoaXRlbS5raW5kICE9PSAnY29kZScpIHtcbiAgICAgICAgICAvLyBEb2Mga2luZHM6IHRoZSBsYXRlc3QgZG9jX2xpbnQgKGlmIGFueSkgbXVzdCBiZSBzY2hlbWEtdmFsaWQ7XG4gICAgICAgICAgLy8gZ2l0X2RpZmYgaXMgbmV2ZXIgY29uc3VsdGVkIGZvciBub24tY29kZSBkZWxpdmVyYWJsZXMuXG4gICAgICAgICAgY29uc3QgbGludHMgPSB0aGlzLmV2aWRlbmNlUm93cy5maWx0ZXIoXG4gICAgICAgICAgICAocm93KSA9PiByb3cud29ya0l0ZW1JZCA9PT0gaXRlbS5pZCAmJiByb3cuZXZpZGVuY2Uua2luZCA9PT0gJ2RvY19saW50JyxcbiAgICAgICAgICApO1xuICAgICAgICAgIGNvbnN0IGxhdGVzdExpbnQgPSBsaW50c1tsaW50cy5sZW5ndGggLSAxXTtcbiAgICAgICAgICBpZiAobGF0ZXN0TGludCAmJiBsYXRlc3RMaW50LmV2aWRlbmNlLnBheWxvYWRbJ3NjaGVtYVZhbGlkJ10gIT09IHRydWUpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBHdWFyZEZhaWxlZEVycm9yKCd0aGUgbGF0ZXN0IGRvY19saW50IGV2aWRlbmNlIGZhaWxlZCBcdTIwMTQgZG9jdW1lbnQgaXMgbm90IHNjaGVtYS12YWxpZCcpO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgLy8gQXJiaXRyYXRlZCAoQ09ORk9STUFOQ0UubWQgXCJFdmlkZW5jZVwiKTogdGhlIExBVEVTVCBzdWJtaXR0ZWRcbiAgICAgICAgLy8gZ2l0X2RpZmYsIGlmIGFueSwgbXVzdCBiZSBub24tZW1wdHkgXHUyMDE0IGFuIGVtcHR5IGRpZmYgaXMgdGhlXG4gICAgICAgIC8vIGZha2UtZG9uZSBkZW55LiBBYnNlbmNlIGlzIG5vdCBjaGVja2VkIGF0IHRoaXMgdHJhbnNpdGlvbiAodGhlXG4gICAgICAgIC8vIHJ1bm5lciBjb250cmFjdCBzdWJtaXRzIHRoZSBkaWZmIGJlZm9yZSByZXF1ZXN0aW5nIHJldmlldywgYW5kIHRoZVxuICAgICAgICAvLyBkb25lIGdhdGUgaW5kZXBlbmRlbnRseSBkZW1hbmRzIHJlbW90ZS1yZWFjaGFibGUgY29tbWl0IGV2aWRlbmNlKS5cbiAgICAgICAgY29uc3QgZGlmZnMgPSB0aGlzLmV2aWRlbmNlUm93cy5maWx0ZXIoXG4gICAgICAgICAgKHJvdykgPT4gcm93LndvcmtJdGVtSWQgPT09IGl0ZW0uaWQgJiYgcm93LmV2aWRlbmNlLmtpbmQgPT09ICdnaXRfZGlmZicsXG4gICAgICAgICk7XG4gICAgICAgIGNvbnN0IGxhdGVzdCA9IGRpZmZzW2RpZmZzLmxlbmd0aCAtIDFdO1xuICAgICAgICBpZiAobGF0ZXN0ICYmIGxhdGVzdC5ldmlkZW5jZS5wYXlsb2FkWydub25FbXB0eSddICE9PSB0cnVlKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoJ3RoZSBsYXRlc3QgZ2l0X2RpZmYgZXZpZGVuY2UgaXMgZW1wdHkgXHUyMDE0IG5vdGhpbmcgdG8gcmV2aWV3Jyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgcHJpdmlsZWdlZERvd25ncmFkZShpdGVtOiBXb3JrSXRlbVJvdywgaW5wdXQ6IEFkdmFuY2VJbnB1dCk6IFdvcmtJdGVtIHtcbiAgICB0aGlzLnZhbGlkYXRlUHJlc2VudGVkVG9rZW4oaXRlbSwgaW5wdXQuZmVuY2luZ1Rva2VuLCBpbnB1dC5hY3RvcklkKTtcbiAgICBpZiAoaXRlbS5ibG9ja2VkUmVhc29uICE9PSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcihgd29yayBpdGVtIGlzIGJsb2NrZWQ6ICR7aXRlbS5ibG9ja2VkUmVhc29ufWApO1xuICAgIH1cbiAgICBjb25zdCBmcm9tID0gaXRlbS5zdGF0ZTtcbiAgICBpdGVtLnN0YXRlID0gaW5wdXQudG87XG4gICAgaXRlbS5zdGF0ZVZlcnNpb24gKz0gMTtcbiAgICB0aGlzLmFwcGVuZChcbiAgICAgICd3b3JrX2l0ZW0nLFxuICAgICAgaXRlbS5pZCxcbiAgICAgICd3b3JrX2l0ZW0uc3RhdGVfZG93bmdyYWRlZCcsXG4gICAgICBpbnB1dC5hY3RvcklkLFxuICAgICAgeyBmcm9tLCB0bzogaW5wdXQudG8sIGNvbXBlbnNhdGluZzogdHJ1ZSB9LFxuICAgICAgaW5wdXQuaWRlbXBvdGVuY3lLZXkgIT09IHVuZGVmaW5lZCA/IHsgaWRlbXBvdGVuY3lLZXk6IGlucHV0LmlkZW1wb3RlbmN5S2V5IH0gOiB1bmRlZmluZWQsXG4gICAgKTtcbiAgICBjb25zdCByZXN1bHQgPSB0aGlzLmNvcHlJdGVtKGl0ZW0pO1xuICAgIGlmIChpbnB1dC5pZGVtcG90ZW5jeUtleSAhPT0gdW5kZWZpbmVkKSB0aGlzLmlkZW1wb3RlbmN5Q2FjaGUuc2V0KGlucHV0LmlkZW1wb3RlbmN5S2V5LCB7IC4uLnJlc3VsdCB9KTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgLyoqIFNoYXJlZCBieSBhZHZhbmNlU3RhdGUgYW5kIHRoZSBnYXRlLWZpcmVkIHRyYW5zaXRpb25zLiAqL1xuICBwcml2YXRlIGV4ZWN1dGVUcmFuc2l0aW9uKFxuICAgIGl0ZW06IFdvcmtJdGVtUm93LFxuICAgIHRvOiBXb3JrSXRlbVN0YXRlLFxuICAgIGFjdG9ySWQ6IHN0cmluZyxcbiAgICBpZGVtcG90ZW5jeUtleT86IHN0cmluZyxcbiAgICBjYXVzYXRpb25JZD86IHN0cmluZyxcbiAgKTogV29ya0l0ZW0ge1xuICAgIGNvbnN0IGZyb20gPSBpdGVtLnN0YXRlO1xuICAgIGl0ZW0uc3RhdGUgPSB0bztcbiAgICBpdGVtLnN0YXRlVmVyc2lvbiArPSAxO1xuICAgIGNvbnN0IGV2ZW50ID0gdGhpcy5hcHBlbmQoXG4gICAgICAnd29ya19pdGVtJyxcbiAgICAgIGl0ZW0uaWQsXG4gICAgICAnd29ya19pdGVtLnN0YXRlX2NoYW5nZWQnLFxuICAgICAgYWN0b3JJZCxcbiAgICAgIHsgZnJvbSwgdG8gfSxcbiAgICAgIHtcbiAgICAgICAgLi4uKGNhdXNhdGlvbklkICE9PSB1bmRlZmluZWQgPyB7IGNhdXNhdGlvbklkIH0gOiB7fSksXG4gICAgICAgIC4uLihpZGVtcG90ZW5jeUtleSAhPT0gdW5kZWZpbmVkID8geyBpZGVtcG90ZW5jeUtleSB9IDoge30pLFxuICAgICAgfSxcbiAgICApO1xuXG4gICAgLy8gRXBpYy1saWZ0IHByb2plY3RvciAocm9hZG1hcCBcdTAwQTcxLjIpOiBmaXJzdCBjaGlsZCBMRUFWSU5HIGJhY2tsb2cgbGlmdHNcbiAgICAvLyB0aGUgZmVhdHVyZTsgaWRlbXBvdGVudCBieSBjaGVjazsgYXV0aG9yZWQgYnkgdGhlIHN5c3RlbSBhY3Rvci5cbiAgICBpZiAoZnJvbSA9PT0gJ2JhY2tsb2cnICYmIHRvICE9PSAnYmFja2xvZycpIHtcbiAgICAgIGNvbnN0IGZlYXR1cmUgPSB0aGlzLmZlYXR1cmVzLmdldChpdGVtLmZlYXR1cmVJZCk7XG4gICAgICBpZiAoZmVhdHVyZSAmJiBmZWF0dXJlLnN0YXRlID09PSAnYmFja2xvZycpIHtcbiAgICAgICAgZmVhdHVyZS5zdGF0ZSA9ICdpbl9wcm9ncmVzcyc7XG4gICAgICAgIHRoaXMuYXBwZW5kKCdmZWF0dXJlJywgZmVhdHVyZS5pZCwgJ2ZlYXR1cmUuc3RhdGVfY2hhbmdlZCcsIHRoaXMuc3lzdGVtQWN0b3JJZCwge1xuICAgICAgICAgIGZyb206ICdiYWNrbG9nJyxcbiAgICAgICAgICB0bzogJ2luX3Byb2dyZXNzJyxcbiAgICAgICAgfSwgeyBjYXVzYXRpb25JZDogU3RyaW5nKGV2ZW50Lmdsb2JhbFNlcSkgfSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gZG9uZV9jaGVja3BvaW50IChyb2FkbWFwIFx1MDBBNzEuMSk6IHRoZSBzdG9yeSBjb21wbGV0ZXMgbm9ybWFsbHk7IHRoZSBob2xkXG4gICAgLy8gbWF0ZXJpYWxpemVzIG9uIHRoZSBmZWF0dXJlIGV4YWN0bHkgYXQgY29tcGxldGlvbi5cbiAgICBpZiAodG8gPT09ICdkb25lJyAmJiBpdGVtLmRvbmVDaGVja3BvaW50KSB7XG4gICAgICBjb25zdCBmZWF0dXJlID0gdGhpcy5mZWF0dXJlcy5nZXQoaXRlbS5mZWF0dXJlSWQpO1xuICAgICAgaWYgKGZlYXR1cmUgJiYgIWZlYXR1cmUuZGlzcGF0Y2hIb2xkKSB7XG4gICAgICAgIGZlYXR1cmUuZGlzcGF0Y2hIb2xkID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5hcHBlbmQoJ2ZlYXR1cmUnLCBmZWF0dXJlLmlkLCAnZmVhdHVyZS5kaXNwYXRjaF9ob2xkX3JhaXNlZCcsIHRoaXMuc3lzdGVtQWN0b3JJZCwge1xuICAgICAgICAgIHdvcmtJdGVtSWQ6IGl0ZW0uaWQsXG4gICAgICAgIH0sIHsgY2F1c2F0aW9uSWQ6IFN0cmluZyhldmVudC5nbG9iYWxTZXEpIH0pO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIFJhaWxzIFx1MjE5MiBjaGF0OiBuYXJyYXRlIHRoZSB0cmFuc2l0aW9uIGludG8gYm91bmQgdGFzayB0aHJlYWRzIChcdTAwQTc1LjIpLlxuICAgIHRoaXMubmFycmF0ZVdvcmtJdGVtKGl0ZW0sIGBzdGF0ZTogJHtmcm9tfSBcdTIxOTIgJHt0b31gKTtcblxuICAgIGNvbnN0IHJlc3VsdCA9IHRoaXMuY29weUl0ZW0oaXRlbSk7XG4gICAgaWYgKGlkZW1wb3RlbmN5S2V5ICE9PSB1bmRlZmluZWQpIHRoaXMuaWRlbXBvdGVuY3lDYWNoZS5zZXQoaWRlbXBvdGVuY3lLZXksIHsgLi4ucmVzdWx0IH0pO1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICBibG9ja1Rhc2soaW5wdXQ6IHtcbiAgICB3b3JrSXRlbUlkOiBzdHJpbmc7XG4gICAgcmVhc29uOiBCbG9ja2VkUmVhc29uO1xuICAgIGFjdG9ySWQ6IHN0cmluZztcbiAgICBmZW5jaW5nVG9rZW4/OiBudW1iZXI7XG4gIH0pOiBXb3JrSXRlbSB7XG4gICAgY29uc3QgaXRlbSA9IHRoaXMubXVzdEdldEl0ZW0oaW5wdXQud29ya0l0ZW1JZCk7XG4gICAgaWYgKCEoQkxPQ0tFRF9SRUFTT05TIGFzIHJlYWRvbmx5IHN0cmluZ1tdKS5pbmNsdWRlcyhpbnB1dC5yZWFzb24pKSB7XG4gICAgICB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcihgdW5rbm93biBibG9ja2luZyBjb25kaXRpb246ICR7aW5wdXQucmVhc29ufWApO1xuICAgIH1cbiAgICB0aGlzLnZhbGlkYXRlUHJlc2VudGVkVG9rZW4oaXRlbSwgaW5wdXQuZmVuY2luZ1Rva2VuLCBpbnB1dC5hY3RvcklkKTtcbiAgICB0aGlzLnJlcXVpcmVQZXJtaXNzaW9uKGlucHV0LmFjdG9ySWQsICd0YXNrLmJsb2NrJyk7XG4gICAgaXRlbS5ibG9ja2VkUmVhc29uID0gaW5wdXQucmVhc29uO1xuICAgIGl0ZW0uc3RhdGVWZXJzaW9uICs9IDE7XG4gICAgdGhpcy5hcHBlbmQoJ3dvcmtfaXRlbScsIGl0ZW0uaWQsICd3b3JrX2l0ZW0uYmxvY2tlZCcsIGlucHV0LmFjdG9ySWQsIHsgcmVhc29uOiBpbnB1dC5yZWFzb24gfSk7XG4gICAgcmV0dXJuIHRoaXMuY29weUl0ZW0oaXRlbSk7XG4gIH1cblxuICB1bmJsb2NrVGFzayhpbnB1dDogeyB3b3JrSXRlbUlkOiBzdHJpbmc7IGFjdG9ySWQ6IHN0cmluZyB9KTogV29ya0l0ZW0ge1xuICAgIGNvbnN0IGl0ZW0gPSB0aGlzLm11c3RHZXRJdGVtKGlucHV0LndvcmtJdGVtSWQpO1xuICAgIC8vIFx1MDBBNzQuMjogcmV2aWV3X25vbl9jb252ZXJnZW5jZSBjYW4gb25seSBiZSByZWxlYXNlZCBieSBhIHJldmlldy1nYXRlXG4gICAgLy8gaG9sZGVyOyBvcmRpbmFyeSBibG9ja3MgcmVsZWFzZSB1bmRlciB0YXNrLmJsb2NrLlxuICAgIGlmIChpdGVtLmJsb2NrZWRSZWFzb24gPT09ICdyZXZpZXdfbm9uX2NvbnZlcmdlbmNlJykge1xuICAgICAgdGhpcy5yZXF1aXJlUGVybWlzc2lvbihpbnB1dC5hY3RvcklkLCAnZ2F0ZS5yZXZpZXcuYXBwcm92ZScpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnJlcXVpcmVQZXJtaXNzaW9uKGlucHV0LmFjdG9ySWQsICd0YXNrLmJsb2NrJyk7XG4gICAgfVxuICAgIGl0ZW0uYmxvY2tlZFJlYXNvbiA9IG51bGw7XG4gICAgaXRlbS5zdGF0ZVZlcnNpb24gKz0gMTtcbiAgICB0aGlzLmFwcGVuZCgnd29ya19pdGVtJywgaXRlbS5pZCwgJ3dvcmtfaXRlbS51bmJsb2NrZWQnLCBpbnB1dC5hY3RvcklkLCB7fSk7XG4gICAgcmV0dXJuIHRoaXMuY29weUl0ZW0oaXRlbSk7XG4gIH1cblxuICAvLyAtLSBnYXRlcyAmIGV2aWRlbmNlIChyb2FkbWFwIFx1MDBBNzEuNCkgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgc3VibWl0RXZpZGVuY2UoaW5wdXQ6IHtcbiAgICB3b3JrSXRlbUlkOiBzdHJpbmc7XG4gICAgZXZpZGVuY2U6IEV2aWRlbmNlO1xuICAgIGFjdG9ySWQ6IHN0cmluZztcbiAgICBmZW5jaW5nVG9rZW4/OiBudW1iZXI7XG4gIH0pOiB2b2lkIHtcbiAgICBjb25zdCBpdGVtID0gdGhpcy5tdXN0R2V0SXRlbShpbnB1dC53b3JrSXRlbUlkKTtcbiAgICB0aGlzLnZhbGlkYXRlUHJlc2VudGVkVG9rZW4oaXRlbSwgaW5wdXQuZmVuY2luZ1Rva2VuLCBpbnB1dC5hY3RvcklkKTtcbiAgICB0aGlzLmV2aWRlbmNlUm93cy5wdXNoKHsgd29ya0l0ZW1JZDogaXRlbS5pZCwgZXZpZGVuY2U6IGlucHV0LmV2aWRlbmNlLCBzZXE6IHRoaXMuZXZpZGVuY2VSb3dzLmxlbmd0aCArIDEgfSk7XG4gICAgdGhpcy5hcHBlbmQoJ3dvcmtfaXRlbScsIGl0ZW0uaWQsICdldmlkZW5jZS5zdWJtaXR0ZWQnLCBpbnB1dC5hY3RvcklkLCB7XG4gICAgICBraW5kOiBpbnB1dC5ldmlkZW5jZS5raW5kLFxuICAgIH0pO1xuICB9XG5cbiAgYXBwcm92ZUdhdGUoaW5wdXQ6IEdhdGVEZWNpc2lvbklucHV0KTogV29ya0l0ZW0ge1xuICAgIGNvbnN0IGl0ZW0gPSB0aGlzLm11c3RHZXRJdGVtKGlucHV0LndvcmtJdGVtSWQpO1xuXG4gICAgaWYgKGlucHV0LmdhdGUgPT09ICdzcGVjX2FwcHJvdmFsJykge1xuICAgICAgLy8gUGVybWlzc2lvbiBwcmVjZWRlcyBhbnkgZWZmZWN0OiBhIGRlbmllZCBhdHRlbXB0IHBpbnMgbm90aGluZy5cbiAgICAgIHRoaXMucmVxdWlyZVBlcm1pc3Npb24oaW5wdXQuYWN0b3JJZCwgJ2dhdGUuc3BlYy5hcHByb3ZlJyk7XG4gICAgICBpZiAoaXRlbS5ibG9ja2VkUmVhc29uICE9PSBudWxsKSB7XG4gICAgICAgIHRocm93IG5ldyBHdWFyZEZhaWxlZEVycm9yKGB3b3JrIGl0ZW0gaXMgYmxvY2tlZDogJHtpdGVtLmJsb2NrZWRSZWFzb259YCk7XG4gICAgICB9XG4gICAgICBpZiAoaXRlbS5zdGF0ZSAhPT0gJ2RyYWZ0Jykge1xuICAgICAgICB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcihgc3BlY19hcHByb3ZhbCBhcHBsaWVzIHRvIGRyYWZ0IGl0ZW1zLCBub3QgJHtpdGVtLnN0YXRlfWApO1xuICAgICAgfVxuICAgICAgaWYgKGlucHV0LnBpbm5lZFZlcmlmaWNhdGlvbiAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGl0ZW0ucGlubmVkVmVyaWZpY2F0aW9uID0gWy4uLmlucHV0LnBpbm5lZFZlcmlmaWNhdGlvbl07XG4gICAgICB9XG4gICAgICBpZiAoIXRoaXMucXVvcnVtV291bGRCZU1ldChpdGVtLCAnc3BlY19hcHByb3ZhbCcsIGlucHV0LmFjdG9ySWQpKSB7XG4gICAgICAgIHRoaXMucmVjb3JkQXBwcm92YWwoaXRlbSwgJ3NwZWNfYXBwcm92YWwnLCBpbnB1dC5hY3RvcklkKTtcbiAgICAgICAgcmV0dXJuIHRoaXMuY29weUl0ZW0oaXRlbSk7IC8vIGRlY2lzaW9uIHJlY29yZGVkOyBxdW9ydW0gcGVuZGluZyAoZ2F0ZSBwb2xpY3kgaXMgZGF0YSwgcm9hZG1hcCBcdTAwQTczKVxuICAgICAgfVxuICAgICAgdGhpcy5yZWNvcmRBcHByb3ZhbChpdGVtLCAnc3BlY19hcHByb3ZhbCcsIGlucHV0LmFjdG9ySWQpO1xuICAgICAgLy8gVGhlIGFwcHJvdmFsIGZpcmVzIHRoZSBnYXRlZCBmb3J3YXJkIHRyYW5zaXRpb24gKGNvbmZvcm1hbmNlIHBpbikuXG4gICAgICByZXR1cm4gdGhpcy5leGVjdXRlVHJhbnNpdGlvbihpdGVtLCAncmVhZHlfZm9yX2RldicsIGlucHV0LmFjdG9ySWQpO1xuICAgIH1cblxuICAgIC8vIHJldmlld19hcHByb3ZhbFxuICAgIHRoaXMucmVxdWlyZVBlcm1pc3Npb24oaW5wdXQuYWN0b3JJZCwgJ2dhdGUucmV2aWV3LmFwcHJvdmUnKTtcbiAgICBpZiAoaXRlbS5ibG9ja2VkUmVhc29uICE9PSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcihgd29yayBpdGVtIGlzIGJsb2NrZWQ6ICR7aXRlbS5ibG9ja2VkUmVhc29ufWApO1xuICAgIH1cbiAgICBpZiAoaXRlbS5zdGF0ZSAhPT0gJ2luX3JldmlldycpIHtcbiAgICAgIHRocm93IG5ldyBHdWFyZEZhaWxlZEVycm9yKGByZXZpZXdfYXBwcm92YWwgYXBwbGllcyB0byBpbl9yZXZpZXcgaXRlbXMsIG5vdCAke2l0ZW0uc3RhdGV9YCk7XG4gICAgfVxuICAgIGlmICghdGhpcy5xdW9ydW1Xb3VsZEJlTWV0KGl0ZW0sICdyZXZpZXdfYXBwcm92YWwnLCBpbnB1dC5hY3RvcklkKSkge1xuICAgICAgdGhpcy5yZWNvcmRBcHByb3ZhbChpdGVtLCAncmV2aWV3X2FwcHJvdmFsJywgaW5wdXQuYWN0b3JJZCk7XG4gICAgICByZXR1cm4gdGhpcy5jb3B5SXRlbShpdGVtKTsgLy8gcXVvcnVtIHBlbmRpbmcgXHUyMDE0IG5vIHRyYW5zaXRpb24geWV0XG4gICAgfVxuICAgIC8vIEV2aWRlbmNlIGlzIGNoZWNrZWQgZXhhY3RseSB3aGVuIHRoZSBxdW9ydW0gd291bGQgY29tcGxldGUsIHNvIGEgZmFpbGVkXG4gICAgLy8gYXBwcm92YWwgcmVjb3JkcyBub3RoaW5nIChQaGFzZSAxIHBpbjogZGVuaWVkIGF0dGVtcHRzIG11dGF0ZSBub3RoaW5nKS5cbiAgICB0aGlzLmNoZWNrUmV2aWV3RXZpZGVuY2UoaXRlbSk7XG4gICAgdGhpcy5yZWNvcmRBcHByb3ZhbChpdGVtLCAncmV2aWV3X2FwcHJvdmFsJywgaW5wdXQuYWN0b3JJZCk7XG4gICAgcmV0dXJuIHRoaXMuZXhlY3V0ZVRyYW5zaXRpb24oaXRlbSwgJ2RvbmUnLCBpbnB1dC5hY3RvcklkKTtcbiAgfVxuXG4gIC8qKiBEaXN0aW5jdCBhcHByb3ZlcnMgb2YgdGhpcyByb3VuZCAocm91bmQgPSByZXZpZXdMb29wSXRlcmF0aW9uIGF0IGRlY2lzaW9uIHRpbWUpLiAqL1xuICBwcml2YXRlIHJvdW5kQXBwcm92ZXJzKGl0ZW06IFdvcmtJdGVtUm93LCBnYXRlOiBHYXRlQ29kZSk6IEFjdG9yW10ge1xuICAgIGNvbnN0IGlkcyA9IG5ldyBTZXQoXG4gICAgICB0aGlzLmdhdGVEZWNpc2lvbnNcbiAgICAgICAgLmZpbHRlcihcbiAgICAgICAgICAoZCkgPT5cbiAgICAgICAgICAgIGQud29ya0l0ZW1JZCA9PT0gaXRlbS5pZCAmJlxuICAgICAgICAgICAgZC5nYXRlID09PSBnYXRlICYmXG4gICAgICAgICAgICBkLmRlY2lzaW9uID09PSAnYXBwcm92ZWQnICYmXG4gICAgICAgICAgICBkLnJvdW5kID09PSBpdGVtLnJldmlld0xvb3BJdGVyYXRpb24sXG4gICAgICAgIClcbiAgICAgICAgLm1hcCgoZCkgPT4gZC5hY3RvcklkKSxcbiAgICApO1xuICAgIHJldHVybiBbLi4uaWRzXS5mbGF0TWFwKChpZCkgPT4ge1xuICAgICAgY29uc3QgYWN0b3IgPSB0aGlzLmFjdG9ycy5nZXQoaWQpO1xuICAgICAgcmV0dXJuIGFjdG9yID8gW2FjdG9yXSA6IFtdO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqIEdhdGUgcG9saWN5IHF1b3J1bSAocm9hZG1hcCBcdTAwQTczKTogbWluIGRpc3RpbmN0IGFwcHJvdmVycyArIHJlcXVpcmVkIGFjdG9yIHR5cGVzLCBhcyBEQVRBLiAqL1xuICBwcml2YXRlIHF1b3J1bVdvdWxkQmVNZXQoaXRlbTogV29ya0l0ZW1Sb3csIGdhdGU6IEdhdGVDb2RlLCBuZXh0QXBwcm92ZXJJZDogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgY29uc3QgcG9saWN5ID0gdGhpcy5nYXRlUG9saWNpZXMuZ2V0KGdhdGUpID8/IHt9O1xuICAgIGNvbnN0IG1pbiA9IHBvbGljeS5taW5BcHByb3ZhbHMgPz8gMTtcbiAgICBjb25zdCByZXF1aXJlZCA9IHBvbGljeS5yZXF1aXJlZEFjdG9yVHlwZXMgPz8gW107XG4gICAgY29uc3QgYXBwcm92ZXJzID0gdGhpcy5yb3VuZEFwcHJvdmVycyhpdGVtLCBnYXRlKTtcbiAgICBjb25zdCBuZXh0QWN0b3IgPSB0aGlzLmFjdG9ycy5nZXQobmV4dEFwcHJvdmVySWQpO1xuICAgIGlmIChuZXh0QWN0b3IgJiYgIWFwcHJvdmVycy5zb21lKChhKSA9PiBhLmlkID09PSBuZXh0QWN0b3IuaWQpKSBhcHByb3ZlcnMucHVzaChuZXh0QWN0b3IpO1xuICAgIGlmIChhcHByb3ZlcnMubGVuZ3RoIDwgbWluKSByZXR1cm4gZmFsc2U7XG4gICAgZm9yIChjb25zdCB0eXBlIG9mIHJlcXVpcmVkKSB7XG4gICAgICBpZiAoIWFwcHJvdmVycy5zb21lKChhKSA9PiBhLnR5cGUgPT09IHR5cGUpKSByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgcHJpdmF0ZSByZWNvcmRBcHByb3ZhbChpdGVtOiBXb3JrSXRlbVJvdywgZ2F0ZTogR2F0ZUNvZGUsIGFjdG9ySWQ6IHN0cmluZyk6IHZvaWQge1xuICAgIHRoaXMuZ2F0ZURlY2lzaW9ucy5wdXNoKHtcbiAgICAgIHdvcmtJdGVtSWQ6IGl0ZW0uaWQsXG4gICAgICBnYXRlLFxuICAgICAgZGVjaXNpb246ICdhcHByb3ZlZCcsXG4gICAgICBhY3RvcklkLFxuICAgICAgcm91bmQ6IGl0ZW0ucmV2aWV3TG9vcEl0ZXJhdGlvbixcbiAgICB9KTtcbiAgICB0aGlzLmFwcGVuZCgnd29ya19pdGVtJywgaXRlbS5pZCwgJ2dhdGUuYXBwcm92ZWQnLCBhY3RvcklkLCB7XG4gICAgICBnYXRlLFxuICAgICAgcm91bmQ6IGl0ZW0ucmV2aWV3TG9vcEl0ZXJhdGlvbixcbiAgICAgIC4uLihnYXRlID09PSAnc3BlY19hcHByb3ZhbCcgPyB7IHBpbm5lZFZlcmlmaWNhdGlvbjogaXRlbS5waW5uZWRWZXJpZmljYXRpb24gfSA6IHt9KSxcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBFdmlkZW5jZSBjb25kaXRpb24gb2YgdGhlIGRvbmUgZ2F0ZSAoXHUwMEE3MS40LCBENyk6IGV2ZXJ5IFBJTk5FRCBjb21tYW5kJ3NcbiAgICogbGF0ZXN0IHRlc3RfcnVuIGV4aXRlZCAwIChhbiB1bnBpbm5lZCBjb21tYW5kIHNhdGlzZmllcyBub3RoaW5nKSwgYW5kIHRoZVxuICAgKiBmaW5hbCBjb21taXQgaXMgcmVhY2hhYmxlIG9uIHRoZSByZW1vdGUuIHJldmlld19yZXBvcnQgaXMgbmV2ZXIgY29uc3VsdGVkLlxuICAgKiBXaXRoIG5vdGhpbmcgcGlubmVkLCB0aGUgZ2F0ZSBkZWNpc2lvbiBieSB0aGUgcGVybWl0dGVkIGFjdG9yIElTIHRoZSBodW1hblxuICAgKiBkZWNpc2lvbiBcdTIwMTQgZXZpZGVuY2UgYWxvbmUgbmV2ZXIgY29tcGxldGVzIHRoZSBpdGVtIGVpdGhlciB3YXkuXG4gICAqL1xuICBwcml2YXRlIGNoZWNrUmV2aWV3RXZpZGVuY2UoaXRlbTogV29ya0l0ZW1Sb3cpOiB2b2lkIHtcbiAgICBjb25zdCByb3dzID0gdGhpcy5ldmlkZW5jZVJvd3MuZmlsdGVyKChyb3cpID0+IHJvdy53b3JrSXRlbUlkID09PSBpdGVtLmlkKTtcbiAgICBmb3IgKGNvbnN0IGNvbW1hbmQgb2YgaXRlbS5waW5uZWRWZXJpZmljYXRpb24gPz8gW10pIHtcbiAgICAgIGNvbnN0IHJ1bnMgPSByb3dzLmZpbHRlcihcbiAgICAgICAgKHJvdykgPT4gcm93LmV2aWRlbmNlLmtpbmQgPT09ICd0ZXN0X3J1bicgJiYgcm93LmV2aWRlbmNlLnBheWxvYWRbJ2NvbW1hbmQnXSA9PT0gY29tbWFuZCxcbiAgICAgICk7XG4gICAgICBjb25zdCBsYXRlc3QgPSBydW5zW3J1bnMubGVuZ3RoIC0gMV07XG4gICAgICBpZiAoIWxhdGVzdCB8fCBsYXRlc3QuZXZpZGVuY2UucGF5bG9hZFsnZXhpdENvZGUnXSAhPT0gMCkge1xuICAgICAgICB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcihgcGlubmVkIHZlcmlmaWNhdGlvbiBkaWQgbm90IHBhc3M6ICR7Y29tbWFuZH1gKTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKGl0ZW0ua2luZCA9PT0gJ2NvZGUnKSB7XG4gICAgICAvLyBOb24tY29kZSBkZWxpdmVyYWJsZXMgY2Fycnkgbm8gY29tbWl0IHJlcXVpcmVtZW50IChyb2FkbWFwIFx1MDBBNzEuNCk6XG4gICAgICAvLyB0aGVpciBjb21wbGV0aW9uIHJlc3RzIG9uIG1hY2hpbmUtY2hlY2thYmxlIGRvYyBldmlkZW5jZSBwbHVzIHRoZVxuICAgICAgLy8gcGVybWl0dGVkIGFjdG9yJ3MgZGVjaXNpb24uXG4gICAgICBjb25zdCBjb21taXRPayA9IHJvd3Muc29tZShcbiAgICAgICAgKHJvdykgPT4gcm93LmV2aWRlbmNlLmtpbmQgPT09ICdjb21taXQnICYmIHJvdy5ldmlkZW5jZS5wYXlsb2FkWydyZWFjaGFibGVPblJlbW90ZSddID09PSB0cnVlLFxuICAgICAgKTtcbiAgICAgIGlmICghY29tbWl0T2spIHtcbiAgICAgICAgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoJ2ZpbmFsIHJldmlzaW9uIG11c3QgYmUgcmVhY2hhYmxlIG9uIHRoZSByZW1vdGUgKHB1c2ggaXMgcGFydCBvZiB0aGUgSEFMVCBjb250cmFjdCknKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZWplY3RHYXRlKGlucHV0OiBHYXRlRGVjaXNpb25JbnB1dCk6IFdvcmtJdGVtIHtcbiAgICBjb25zdCBpdGVtID0gdGhpcy5tdXN0R2V0SXRlbShpbnB1dC53b3JrSXRlbUlkKTtcbiAgICBpZiAoaW5wdXQuZ2F0ZSAhPT0gJ3Jldmlld19hcHByb3ZhbCcpIHtcbiAgICAgIHRocm93IG5ldyBHdWFyZEZhaWxlZEVycm9yKCdvbmx5IHJldmlld19hcHByb3ZhbCByZWplY3Rpb24gaXMgZGVmaW5lZCBpbiBQaGFzZSAxJyk7XG4gICAgfVxuICAgIC8vIFBoYXNlIDIgKGFkZGl0aXZlKTogcmVqZWN0aW9uIGF1dGhvcml0eSA9IGdhdGUucmV2aWV3LmFwcHJvdmUgT1JcbiAgICAvLyBnYXRlLnJldmlldy5yZWplY3QgXHUyMDE0IHRoZSBQaGFzZSAyIGV4aXQgY3JpdGVyaW9uJ3MgcmV2aWV3ZXItYWdlbnQgaG9sZHNcbiAgICAvLyBvbmx5IHRoZSBsYXR0ZXIuIEV2ZXJ5IFBoYXNlIDEgcGluIG9uIHJlamVjdEdhdGUga2VlcHMgaG9sZGluZy5cbiAgICBpZiAoXG4gICAgICAhdGhpcy5oYXNQZXJtaXNzaW9uKGlucHV0LmFjdG9ySWQsICdnYXRlLnJldmlldy5hcHByb3ZlJykgJiZcbiAgICAgICF0aGlzLmhhc1Blcm1pc3Npb24oaW5wdXQuYWN0b3JJZCwgJ2dhdGUucmV2aWV3LnJlamVjdCcpXG4gICAgKSB7XG4gICAgICB0aHJvdyBuZXcgUGVybWlzc2lvbkRlbmllZEVycm9yKCdnYXRlLnJldmlldy5yZWplY3QnLCBpbnB1dC5hY3RvcklkKTtcbiAgICB9XG4gICAgaWYgKGl0ZW0uc3RhdGUgIT09ICdpbl9yZXZpZXcnKSB7XG4gICAgICB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcihgcmV2aWV3IHJlamVjdGlvbiBhcHBsaWVzIHRvIGluX3JldmlldyBpdGVtcywgbm90ICR7aXRlbS5zdGF0ZX1gKTtcbiAgICB9XG4gICAgdGhpcy5nYXRlRGVjaXNpb25zLnB1c2goe1xuICAgICAgd29ya0l0ZW1JZDogaXRlbS5pZCxcbiAgICAgIGdhdGU6ICdyZXZpZXdfYXBwcm92YWwnLFxuICAgICAgZGVjaXNpb246ICdyZWplY3RlZCcsXG4gICAgICBhY3RvcklkOiBpbnB1dC5hY3RvcklkLFxuICAgICAgcm91bmQ6IGl0ZW0ucmV2aWV3TG9vcEl0ZXJhdGlvbixcbiAgICB9KTtcbiAgICBjb25zdCBkZWNpc2lvbkV2ZW50ID0gdGhpcy5hcHBlbmQoJ3dvcmtfaXRlbScsIGl0ZW0uaWQsICdnYXRlLnJlamVjdGVkJywgaW5wdXQuYWN0b3JJZCwge1xuICAgICAgZ2F0ZTogJ3Jldmlld19hcHByb3ZhbCcsXG4gICAgfSk7XG5cbiAgICBpZiAoaXRlbS5yZXZpZXdMb29wSXRlcmF0aW9uID49IFJFVklFV19MT09QX0xJTUlUKSB7XG4gICAgICAvLyBUaGUgNnRoIHJlamVjdGlvbiBwZXJmb3JtcyBubyBsb29wYmFjazogb3ZlcmxheSByZXZpZXdfbm9uX2NvbnZlcmdlbmNlLFxuICAgICAgLy8gc3RhdGUgZnJvemVuIGF0IGluX3JldmlldywgY291bnRlciB1bnRvdWNoZWQgKENPTkZPUk1BTkNFLm1kIHBpbikuXG4gICAgICBpdGVtLmJsb2NrZWRSZWFzb24gPSAncmV2aWV3X25vbl9jb252ZXJnZW5jZSc7XG4gICAgICBpdGVtLnN0YXRlVmVyc2lvbiArPSAxO1xuICAgICAgdGhpcy5hcHBlbmQoXG4gICAgICAgICd3b3JrX2l0ZW0nLFxuICAgICAgICBpdGVtLmlkLFxuICAgICAgICAnd29ya19pdGVtLmJsb2NrZWQnLFxuICAgICAgICB0aGlzLnN5c3RlbUFjdG9ySWQsXG4gICAgICAgIHsgcmVhc29uOiAncmV2aWV3X25vbl9jb252ZXJnZW5jZScgfSxcbiAgICAgICAgeyBjYXVzYXRpb25JZDogU3RyaW5nKGRlY2lzaW9uRXZlbnQuZ2xvYmFsU2VxKSB9LFxuICAgICAgKTtcbiAgICAgIHJldHVybiB0aGlzLmNvcHlJdGVtKGl0ZW0pO1xuICAgIH1cblxuICAgIC8vIFx1MDBBNzEuMjogdGhlIGxvb3BiYWNrIGlzIGEgc3lzdGVtIGVmZmVjdCBcdTIwMTQgbm8gY2xhaW0taG9sZGVyIHBhcnRpY2lwYXRpb24uXG4gICAgaXRlbS5yZXZpZXdMb29wSXRlcmF0aW9uICs9IDE7XG4gICAgcmV0dXJuIHRoaXMuZXhlY3V0ZVRyYW5zaXRpb24oaXRlbSwgJ2luX3Byb2dyZXNzJywgdGhpcy5zeXN0ZW1BY3RvcklkLCB1bmRlZmluZWQsIFN0cmluZyhkZWNpc2lvbkV2ZW50Lmdsb2JhbFNlcSkpO1xuICB9XG5cbiAgLy8gLS0gY29sbGFib3JhdGlvbiAoUGhhc2UgMywgcm9hZG1hcCBcdTAwQTc1KSAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICBwcml2YXRlIG11c3RHZXRUaHJlYWQodGhyZWFkSWQ6IHN0cmluZyk6IFRocmVhZCB7XG4gICAgY29uc3QgdGhyZWFkID0gdGhpcy50aHJlYWRzLmdldCh0aHJlYWRJZCk7XG4gICAgaWYgKCF0aHJlYWQpIHRocm93IG5ldyBHdWFyZEZhaWxlZEVycm9yKGB1bmtub3duIHRocmVhZDogJHt0aHJlYWRJZH1gKTtcbiAgICByZXR1cm4gdGhyZWFkO1xuICB9XG5cbiAgcHJpdmF0ZSBpc1BhcnRpY2lwYW50KHRocmVhZDogVGhyZWFkLCBhY3RvcklkOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhyZWFkLmNyZWF0ZWRCeSA9PT0gYWN0b3JJZCB8fCB0aHJlYWQucGFydGljaXBhbnRzLmluY2x1ZGVzKGFjdG9ySWQpO1xuICB9XG5cbiAgY3JlYXRlVGhyZWFkKGlucHV0OiB7XG4gICAgYWN0b3JJZDogc3RyaW5nO1xuICAgIGtpbmQ6IFRocmVhZEtpbmQ7XG4gICAgZmVhdHVyZUlkPzogc3RyaW5nO1xuICAgIHdvcmtJdGVtSWQ/OiBzdHJpbmc7XG4gICAgdmlzaWJpbGl0eT86IFRocmVhZFZpc2liaWxpdHk7XG4gIH0pOiBUaHJlYWQge1xuICAgIGlmIChpbnB1dC5mZWF0dXJlSWQgIT09IHVuZGVmaW5lZCAmJiAhdGhpcy5mZWF0dXJlcy5oYXMoaW5wdXQuZmVhdHVyZUlkKSkge1xuICAgICAgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoYHVua25vd24gZmVhdHVyZTogJHtpbnB1dC5mZWF0dXJlSWR9YCk7XG4gICAgfVxuICAgIGxldCB3b3JrSXRlbUlkOiBzdHJpbmcgfCBudWxsID0gbnVsbDtcbiAgICBpZiAoaW5wdXQud29ya0l0ZW1JZCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICB3b3JrSXRlbUlkID0gdGhpcy5tdXN0R2V0SXRlbShpbnB1dC53b3JrSXRlbUlkKS5pZDtcbiAgICB9XG4gICAgY29uc3QgdGhyZWFkOiBUaHJlYWQgPSB7XG4gICAgICBpZDogdGhpcy5uZXh0SWQoJ3RoJyksXG4gICAgICBmZWF0dXJlSWQ6IGlucHV0LmZlYXR1cmVJZCA/PyBudWxsLFxuICAgICAgd29ya0l0ZW1JZCxcbiAgICAgIGtpbmQ6IGlucHV0LmtpbmQsXG4gICAgICB2aXNpYmlsaXR5OiBpbnB1dC52aXNpYmlsaXR5ID8/IChpbnB1dC5raW5kID09PSAncHJpdmF0ZScgPyAncHJpdmF0ZScgOiAnb3BlbicpLFxuICAgICAgY3JlYXRlZEJ5OiBpbnB1dC5hY3RvcklkLFxuICAgICAgcGFydGljaXBhbnRzOiBbaW5wdXQuYWN0b3JJZF0sXG4gICAgfTtcbiAgICB0aGlzLnRocmVhZHMuc2V0KHRocmVhZC5pZCwgdGhyZWFkKTtcbiAgICB0aGlzLmFwcGVuZCgndGhyZWFkJywgdGhyZWFkLmlkLCAndGhyZWFkLmNyZWF0ZWQnLCBpbnB1dC5hY3RvcklkLCB7XG4gICAgICBraW5kOiB0aHJlYWQua2luZCxcbiAgICAgIGZlYXR1cmVJZDogdGhyZWFkLmZlYXR1cmVJZCxcbiAgICAgIHdvcmtJdGVtSWQ6IHRocmVhZC53b3JrSXRlbUlkLFxuICAgICAgdmlzaWJpbGl0eTogdGhyZWFkLnZpc2liaWxpdHksXG4gICAgfSk7XG4gICAgcmV0dXJuIHsgLi4udGhyZWFkLCBwYXJ0aWNpcGFudHM6IFsuLi50aHJlYWQucGFydGljaXBhbnRzXSB9O1xuICB9XG5cbiAgYWRkVGhyZWFkUGFydGljaXBhbnQoaW5wdXQ6IHsgdGhyZWFkSWQ6IHN0cmluZzsgYWN0b3JJZDogc3RyaW5nOyBieUFjdG9ySWQ6IHN0cmluZyB9KTogVGhyZWFkIHtcbiAgICBjb25zdCB0aHJlYWQgPSB0aGlzLm11c3RHZXRUaHJlYWQoaW5wdXQudGhyZWFkSWQpO1xuICAgIGlmICghdGhpcy5pc1BhcnRpY2lwYW50KHRocmVhZCwgaW5wdXQuYnlBY3RvcklkKSkge1xuICAgICAgdGhyb3cgbmV3IFBlcm1pc3Npb25EZW5pZWRFcnJvcigndGhyZWFkLmludml0ZScsIGlucHV0LmJ5QWN0b3JJZCk7XG4gICAgfVxuICAgIGlmICghdGhpcy5hY3RvcnMuaGFzKGlucHV0LmFjdG9ySWQpKSB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcihgdW5rbm93biBhY3RvcjogJHtpbnB1dC5hY3RvcklkfWApO1xuICAgIGlmICghdGhyZWFkLnBhcnRpY2lwYW50cy5pbmNsdWRlcyhpbnB1dC5hY3RvcklkKSkge1xuICAgICAgdGhyZWFkLnBhcnRpY2lwYW50cy5wdXNoKGlucHV0LmFjdG9ySWQpO1xuICAgICAgdGhpcy5hcHBlbmQoJ3RocmVhZCcsIHRocmVhZC5pZCwgJ3RocmVhZC5wYXJ0aWNpcGFudF9hZGRlZCcsIGlucHV0LmJ5QWN0b3JJZCwge1xuICAgICAgICBhY3RvcklkOiBpbnB1dC5hY3RvcklkLFxuICAgICAgfSk7XG4gICAgfVxuICAgIHJldHVybiB7IC4uLnRocmVhZCwgcGFydGljaXBhbnRzOiBbLi4udGhyZWFkLnBhcnRpY2lwYW50c10gfTtcbiAgfVxuXG4gIC8qKiBJbnRlcm5hbCBhcHBlbmQgdGhhdCBuZXZlciBydW5zIHRoZSByb3V0ZXIgXHUyMDE0IHVzZWQgZm9yIGNoYXQsIG5hcnJhdGlvbiBhbGlrZS4gKi9cbiAgcHJpdmF0ZSBhcHBlbmRNZXNzYWdlKFxuICAgIHRocmVhZDogVGhyZWFkLFxuICAgIGF1dGhvcklkOiBzdHJpbmcsXG4gICAga2luZDogTWVzc2FnZVsna2luZCddLFxuICAgIGJvZHk6IHN0cmluZyxcbiAgICByZXBseVRvOiBzdHJpbmcgfCBudWxsLFxuICApOiBNZXNzYWdlIHtcbiAgICBjb25zdCBzZXEgPSB0aGlzLm1lc3NhZ2VzLmZpbHRlcigobSkgPT4gbS50aHJlYWRJZCA9PT0gdGhyZWFkLmlkKS5sZW5ndGggKyAxO1xuICAgIGNvbnN0IG1lc3NhZ2U6IE1lc3NhZ2UgPSB7XG4gICAgICBpZDogdGhpcy5uZXh0SWQoJ21zZycpLFxuICAgICAgdGhyZWFkSWQ6IHRocmVhZC5pZCxcbiAgICAgIHNlcSxcbiAgICAgIGF1dGhvcklkLFxuICAgICAga2luZCxcbiAgICAgIGJvZHksXG4gICAgICByZXBseVRvLFxuICAgIH07XG4gICAgdGhpcy5tZXNzYWdlcy5wdXNoKG1lc3NhZ2UpO1xuICAgIHRoaXMuYXBwZW5kKCd0aHJlYWQnLCB0aHJlYWQuaWQsICdtZXNzYWdlLnBvc3RlZCcsIGF1dGhvcklkLCB7IG1lc3NhZ2VJZDogbWVzc2FnZS5pZCwga2luZCB9KTtcbiAgICByZXR1cm4geyAuLi5tZXNzYWdlIH07XG4gIH1cblxuICAvKipcbiAgICogXHUwMEE3NS4yOiB0aGUgc2VydmVyIE5FVkVSIHBhcnNlcyBib2R5IHRleHQgXHUyMDE0IGBtZW50aW9uc2AgaXMgc3RydWN0dXJlZCBhY3RvclxuICAgKiBpZHMuIFx1MDBBNzUuNDogdGhlIHJvdXRlciBpcyBwdXJlIGNvZGUsIGRlZmF1bHQtZGVueSwgcG9saWN5LWdhdGVkLFxuICAgKiBkZXB0aC1jYXBwZWQ7IGEgam9iIGlzIHJlcGx5LW9ubHkgY29udGV4dCwgbmV2ZXIgYSBjbGFpbS5cbiAgICovXG4gIHBvc3RNZXNzYWdlKGlucHV0OiB7XG4gICAgdGhyZWFkSWQ6IHN0cmluZztcbiAgICBhY3RvcklkOiBzdHJpbmc7XG4gICAgYm9keTogc3RyaW5nO1xuICAgIHJlcGx5VG8/OiBzdHJpbmc7XG4gICAgbWVudGlvbnM/OiBzdHJpbmdbXTtcbiAgfSk6IE1lc3NhZ2Uge1xuICAgIGNvbnN0IHRocmVhZCA9IHRoaXMubXVzdEdldFRocmVhZChpbnB1dC50aHJlYWRJZCk7XG4gICAgaWYgKHRocmVhZC52aXNpYmlsaXR5ID09PSAncHJpdmF0ZScgJiYgIXRoaXMuaXNQYXJ0aWNpcGFudCh0aHJlYWQsIGlucHV0LmFjdG9ySWQpKSB7XG4gICAgICB0aHJvdyBuZXcgUGVybWlzc2lvbkRlbmllZEVycm9yKCd0aHJlYWQucG9zdCcsIGlucHV0LmFjdG9ySWQpO1xuICAgIH1cbiAgICBjb25zdCBtZXNzYWdlID0gdGhpcy5hcHBlbmRNZXNzYWdlKHRocmVhZCwgaW5wdXQuYWN0b3JJZCwgJ2NoYXQnLCBpbnB1dC5ib2R5LCBpbnB1dC5yZXBseVRvID8/IG51bGwpO1xuXG4gICAgZm9yIChjb25zdCBtZW50aW9uZWRJZCBvZiBbLi4ubmV3IFNldChpbnB1dC5tZW50aW9ucyA/PyBbXSldKSB7XG4gICAgICBjb25zdCBtZW50aW9uZWQgPSB0aGlzLmFjdG9ycy5nZXQobWVudGlvbmVkSWQpO1xuICAgICAgaWYgKCFtZW50aW9uZWQpIHRocm93IG5ldyBHdWFyZEZhaWxlZEVycm9yKGB1bmtub3duIG1lbnRpb25lZCBhY3RvcjogJHttZW50aW9uZWRJZH1gKTtcbiAgICAgIGNvbnN0IHJlc29sdXRpb24gPSB0aGlzLnJvdXRlTWVudGlvbih0aHJlYWQsIG1lc3NhZ2UsIGlucHV0LmFjdG9ySWQsIG1lbnRpb25lZCk7XG4gICAgICB0aGlzLm1lbnRpb25zLnB1c2goeyBtZXNzYWdlSWQ6IG1lc3NhZ2UuaWQsIG1lbnRpb25lZEFjdG9ySWQ6IG1lbnRpb25lZElkLCByZXNvbHV0aW9uIH0pO1xuICAgICAgdGhpcy5hcHBlbmQoJ3RocmVhZCcsIHRocmVhZC5pZCwgJ21lbnRpb24ucmVjb3JkZWQnLCBpbnB1dC5hY3RvcklkLCB7XG4gICAgICAgIG1lc3NhZ2VJZDogbWVzc2FnZS5pZCxcbiAgICAgICAgbWVudGlvbmVkQWN0b3JJZDogbWVudGlvbmVkSWQsXG4gICAgICAgIHJlc29sdXRpb24sXG4gICAgICB9KTtcbiAgICB9XG4gICAgcmV0dXJuIG1lc3NhZ2U7XG4gIH1cblxuICAvKiogVGhlIGRldGVybWluaXN0aWMgbWVudGlvbiByb3V0ZXIgKFx1MDBBNzUuNCkuIFJldHVybnMgdGhlIHJlY29yZGVkIHJlc29sdXRpb24uICovXG4gIHByaXZhdGUgcm91dGVNZW50aW9uKFxuICAgIHRocmVhZDogVGhyZWFkLFxuICAgIG1lc3NhZ2U6IE1lc3NhZ2UsXG4gICAgbWVudGlvbmVySWQ6IHN0cmluZyxcbiAgICBtZW50aW9uZWQ6IEFjdG9yLFxuICApOiBNZW50aW9uWydyZXNvbHV0aW9uJ10ge1xuICAgIGlmIChtZW50aW9uZWQudHlwZSAhPT0gJ2FnZW50Jykge1xuICAgICAgdGhpcy5wdXNoTm90aWZpY2F0aW9uKG1lbnRpb25lZC5pZCwgJ21lbnRpb24nLCBtZXNzYWdlLmlkKTtcbiAgICAgIHJldHVybiAnbm90aWZpZWQnO1xuICAgIH1cbiAgICAvLyBraWxsLXN3aXRjaCBhcHBsaWVzIHRvIGV2ZXJ5IGpvYi1tYXRlcmlhbGl6aW5nIHBhdGhcbiAgICBpZiAodGhpcy53b3Jrc3BhY2VQb2xpY3kubWVudGlvbkRpc3BhdGNoID09PSBmYWxzZSkgcmV0dXJuICdkZW5pZWRfcG9saWN5JztcblxuICAgIGNvbnN0IG1lbnRpb25lciA9IHRoaXMuYWN0b3JzLmdldChtZW50aW9uZXJJZCk7XG4gICAgbGV0IGRlcHRoID0gMDtcbiAgICBpZiAobWVudGlvbmVyPy50eXBlID09PSAnYWdlbnQnKSB7XG4gICAgICAvLyBhZ2VudC1tZW50aW9uLWFnZW50OiBleHBsaWNpdCBwb2xpY3kgKyBkZXB0aCBjYXAgKFx1MDBBNzUuNClcbiAgICAgIGlmICh0aGlzLndvcmtzcGFjZVBvbGljeS5hZ2VudE1lbnRpb25BZ2VudCAhPT0gdHJ1ZSkgcmV0dXJuICdkZW5pZWRfcG9saWN5JztcbiAgICAgIGNvbnN0IG1lbnRpb25lckpvYnMgPSBbLi4udGhpcy5hZ2VudEpvYnMudmFsdWVzKCldLmZpbHRlcigoaikgPT4gai5hZ2VudEFjdG9ySWQgPT09IG1lbnRpb25lcklkKTtcbiAgICAgIGRlcHRoID0gTWF0aC5tYXgoMCwgLi4ubWVudGlvbmVySm9icy5tYXAoKGopID0+IGouZGVwdGgpKSArIDE7XG4gICAgICBpZiAoZGVwdGggPiBBR0VOVF9KT0JfTUFYX0RFUFRIKSByZXR1cm4gJ2RlbmllZF9kZXB0aCc7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIGRlZmF1bHQtZGVueTogdGhlIGh1bWFuIG1lbnRpb25lciBtdXN0IGhvbGQgaW52b2tlIGF1dGhvcml0eSBcdTIwMTRcbiAgICAgIC8vIGF0IGxlYXN0IG9uZSBhY3RpdmUgZGVsaXZlcnkgcm9sZSwgb3IgZ292ZXJuYW5jZSBhZG1pbi5cbiAgICAgIGNvbnN0IGhhc1JvbGUgPSB0aGlzLnJvbGVBc3NpZ25tZW50cy5zb21lKChhKSA9PiBhLmFjdG9ySWQgPT09IG1lbnRpb25lcklkICYmICFhLnJldm9rZWQpO1xuICAgICAgY29uc3QgaXNBZG1pbiA9IHRoaXMuZ292ZXJuYW5jZVJvbGVzLmdldChtZW50aW9uZXJJZCkgPT09ICdhZG1pbicgfHwgbWVudGlvbmVySWQgPT09IHRoaXMuc3lzdGVtQWN0b3JJZDtcbiAgICAgIGlmICghaGFzUm9sZSAmJiAhaXNBZG1pbikgcmV0dXJuICdkZW5pZWRfcG9saWN5JztcbiAgICB9XG5cbiAgICBjb25zdCBqb2I6IEFnZW50Sm9iID0ge1xuICAgICAgaWQ6IHRoaXMubmV4dElkKCdqb2InKSxcbiAgICAgIGFnZW50QWN0b3JJZDogbWVudGlvbmVkLmlkLFxuICAgICAgdGhyZWFkSWQ6IHRocmVhZC5pZCxcbiAgICAgIG1lc3NhZ2VJZDogbWVzc2FnZS5pZCxcbiAgICAgIHdvcmtJdGVtSWQ6IHRocmVhZC53b3JrSXRlbUlkLFxuICAgICAgZmVhdHVyZUlkOiB0aHJlYWQuZmVhdHVyZUlkLFxuICAgICAgc3RhdHVzOiAncXVldWVkJyxcbiAgICAgIGRlcHRoLFxuICAgICAgbm90ZTogbnVsbCxcbiAgICB9O1xuICAgIHRoaXMuYWdlbnRKb2JzLnNldChqb2IuaWQsIGpvYik7XG4gICAgdGhpcy5hcHBlbmQoJ2FnZW50X2pvYicsIGpvYi5pZCwgJ2FnZW50X2pvYi5jcmVhdGVkJywgbWVudGlvbmVySWQsIHtcbiAgICAgIGFnZW50QWN0b3JJZDogbWVudGlvbmVkLmlkLFxuICAgICAgdGhyZWFkSWQ6IHRocmVhZC5pZCxcbiAgICAgIG1lc3NhZ2VJZDogbWVzc2FnZS5pZCxcbiAgICAgIGRlcHRoLFxuICAgIH0pO1xuICAgIHRoaXMucHVzaE5vdGlmaWNhdGlvbihtZW50aW9uZWQuaWQsICdtZW50aW9uJywgbWVzc2FnZS5pZCk7XG4gICAgcmV0dXJuICdqb2JfY3JlYXRlZCc7XG4gIH1cblxuICBwcml2YXRlIHB1c2hOb3RpZmljYXRpb24oYWN0b3JJZDogc3RyaW5nLCBzb3VyY2U6IE5vdGlmaWNhdGlvblsnc291cmNlJ10sIHJlZklkOiBzdHJpbmcpOiB2b2lkIHtcbiAgICB0aGlzLm5vdGlmaWNhdGlvbnMucHVzaCh7IGlkOiB0aGlzLm5leHRJZCgnbnRmJyksIGFjdG9ySWQsIHNvdXJjZSwgcmVmSWQsIHJlYWQ6IGZhbHNlIH0pO1xuICB9XG5cbiAgbGlzdFRocmVhZHMoZmlsdGVyPzogeyBmZWF0dXJlSWQ/OiBzdHJpbmc7IHdvcmtJdGVtSWQ/OiBzdHJpbmc7IGFjdG9ySWQ/OiBzdHJpbmcgfSk6IFRocmVhZFtdIHtcbiAgICByZXR1cm4gWy4uLnRoaXMudGhyZWFkcy52YWx1ZXMoKV1cbiAgICAgIC5maWx0ZXIoKHQpID0+IHtcbiAgICAgICAgaWYgKGZpbHRlcj8uZmVhdHVyZUlkICE9PSB1bmRlZmluZWQgJiYgdC5mZWF0dXJlSWQgIT09IGZpbHRlci5mZWF0dXJlSWQpIHJldHVybiBmYWxzZTtcbiAgICAgICAgaWYgKGZpbHRlcj8ud29ya0l0ZW1JZCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgY29uc3QgcmVzb2x2ZWQgPSB0aGlzLm11c3RHZXRJdGVtKGZpbHRlci53b3JrSXRlbUlkKS5pZDtcbiAgICAgICAgICBpZiAodC53b3JrSXRlbUlkICE9PSByZXNvbHZlZCkgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIGlmIChmaWx0ZXI/LmFjdG9ySWQgIT09IHVuZGVmaW5lZCAmJiB0LnZpc2liaWxpdHkgPT09ICdwcml2YXRlJyAmJiAhdGhpcy5pc1BhcnRpY2lwYW50KHQsIGZpbHRlci5hY3RvcklkKSkge1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH0pXG4gICAgICAubWFwKCh0KSA9PiAoeyAuLi50LCBwYXJ0aWNpcGFudHM6IFsuLi50LnBhcnRpY2lwYW50c10gfSkpO1xuICB9XG5cbiAgbGlzdE1lc3NhZ2VzKGlucHV0OiB7IHRocmVhZElkOiBzdHJpbmc7IGFjdG9ySWQ6IHN0cmluZzsgc2luY2VTZXE/OiBudW1iZXIgfSk6IE1lc3NhZ2VbXSB7XG4gICAgY29uc3QgdGhyZWFkID0gdGhpcy5tdXN0R2V0VGhyZWFkKGlucHV0LnRocmVhZElkKTtcbiAgICBpZiAodGhyZWFkLnZpc2liaWxpdHkgPT09ICdwcml2YXRlJyAmJiAhdGhpcy5pc1BhcnRpY2lwYW50KHRocmVhZCwgaW5wdXQuYWN0b3JJZCkpIHtcbiAgICAgIHRocm93IG5ldyBQZXJtaXNzaW9uRGVuaWVkRXJyb3IoJ3RocmVhZC5yZWFkJywgaW5wdXQuYWN0b3JJZCk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLm1lc3NhZ2VzXG4gICAgICAuZmlsdGVyKChtKSA9PiBtLnRocmVhZElkID09PSB0aHJlYWQuaWQgJiYgKGlucHV0LnNpbmNlU2VxID09PSB1bmRlZmluZWQgfHwgbS5zZXEgPiBpbnB1dC5zaW5jZVNlcSkpXG4gICAgICAubWFwKChtKSA9PiAoeyAuLi5tIH0pKTtcbiAgfVxuXG4gIGxpc3RNZW50aW9ucyhtZXNzYWdlSWQ6IHN0cmluZyk6IE1lbnRpb25bXSB7XG4gICAgcmV0dXJuIHRoaXMubWVudGlvbnMuZmlsdGVyKChtKSA9PiBtLm1lc3NhZ2VJZCA9PT0gbWVzc2FnZUlkKS5tYXAoKG0pID0+ICh7IC4uLm0gfSkpO1xuICB9XG5cbiAgbGlzdE5vdGlmaWNhdGlvbnMoaW5wdXQ6IHsgYWN0b3JJZDogc3RyaW5nOyB1bnJlYWRPbmx5PzogYm9vbGVhbiB9KTogTm90aWZpY2F0aW9uW10ge1xuICAgIHJldHVybiB0aGlzLm5vdGlmaWNhdGlvbnNcbiAgICAgIC5maWx0ZXIoKG4pID0+IG4uYWN0b3JJZCA9PT0gaW5wdXQuYWN0b3JJZCAmJiAoaW5wdXQudW5yZWFkT25seSAhPT0gdHJ1ZSB8fCAhbi5yZWFkKSlcbiAgICAgIC5tYXAoKG4pID0+ICh7IC4uLm4gfSkpO1xuICB9XG5cbiAgbWFya05vdGlmaWNhdGlvblJlYWQoaW5wdXQ6IHsgbm90aWZpY2F0aW9uSWQ6IHN0cmluZzsgYWN0b3JJZDogc3RyaW5nIH0pOiB2b2lkIHtcbiAgICBjb25zdCBub3RpZmljYXRpb24gPSB0aGlzLm5vdGlmaWNhdGlvbnMuZmluZCgobikgPT4gbi5pZCA9PT0gaW5wdXQubm90aWZpY2F0aW9uSWQpO1xuICAgIGlmICghbm90aWZpY2F0aW9uKSB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcihgdW5rbm93biBub3RpZmljYXRpb246ICR7aW5wdXQubm90aWZpY2F0aW9uSWR9YCk7XG4gICAgaWYgKG5vdGlmaWNhdGlvbi5hY3RvcklkICE9PSBpbnB1dC5hY3RvcklkKSB7XG4gICAgICB0aHJvdyBuZXcgUGVybWlzc2lvbkRlbmllZEVycm9yKCd0aHJlYWQucmVhZCcsIGlucHV0LmFjdG9ySWQpO1xuICAgIH1cbiAgICBub3RpZmljYXRpb24ucmVhZCA9IHRydWU7XG4gIH1cblxuICBsaXN0QWdlbnRKb2JzKGZpbHRlcj86IHsgYWdlbnRBY3RvcklkPzogc3RyaW5nOyBzdGF0dXM/OiBBZ2VudEpvYlsnc3RhdHVzJ10gfSk6IEFnZW50Sm9iW10ge1xuICAgIHJldHVybiBbLi4udGhpcy5hZ2VudEpvYnMudmFsdWVzKCldXG4gICAgICAuZmlsdGVyKFxuICAgICAgICAoaikgPT5cbiAgICAgICAgICAoZmlsdGVyPy5hZ2VudEFjdG9ySWQgPT09IHVuZGVmaW5lZCB8fCBqLmFnZW50QWN0b3JJZCA9PT0gZmlsdGVyLmFnZW50QWN0b3JJZCkgJiZcbiAgICAgICAgICAoZmlsdGVyPy5zdGF0dXMgPT09IHVuZGVmaW5lZCB8fCBqLnN0YXR1cyA9PT0gZmlsdGVyLnN0YXR1cyksXG4gICAgICApXG4gICAgICAubWFwKChqKSA9PiAoeyAuLi5qIH0pKTtcbiAgfVxuXG4gIGNvbXBsZXRlQWdlbnRKb2IoaW5wdXQ6IHsgam9iSWQ6IHN0cmluZzsgYWN0b3JJZDogc3RyaW5nOyBzdGF0dXM6ICdkb25lJyB8ICdibG9ja2VkJzsgbm90ZT86IHN0cmluZyB9KTogQWdlbnRKb2Ige1xuICAgIGNvbnN0IGpvYiA9IHRoaXMuYWdlbnRKb2JzLmdldChpbnB1dC5qb2JJZCk7XG4gICAgaWYgKCFqb2IpIHRocm93IG5ldyBHdWFyZEZhaWxlZEVycm9yKGB1bmtub3duIGFnZW50IGpvYjogJHtpbnB1dC5qb2JJZH1gKTtcbiAgICBpZiAoam9iLmFnZW50QWN0b3JJZCAhPT0gaW5wdXQuYWN0b3JJZCkge1xuICAgICAgdGhyb3cgbmV3IFBlcm1pc3Npb25EZW5pZWRFcnJvcignYWdlbnRfam9iLmNvbXBsZXRlJywgaW5wdXQuYWN0b3JJZCk7XG4gICAgfVxuICAgIGlmIChqb2Iuc3RhdHVzICE9PSAncXVldWVkJykgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoYGFnZW50IGpvYiAke2pvYi5pZH0gaXMgYWxyZWFkeSAke2pvYi5zdGF0dXN9YCk7XG4gICAgam9iLnN0YXR1cyA9IGlucHV0LnN0YXR1cztcbiAgICBqb2Iubm90ZSA9IGlucHV0Lm5vdGUgPz8gbnVsbDtcbiAgICB0aGlzLmFwcGVuZCgnYWdlbnRfam9iJywgam9iLmlkLCAnYWdlbnRfam9iLmNvbXBsZXRlZCcsIGlucHV0LmFjdG9ySWQsIHtcbiAgICAgIHN0YXR1czogaW5wdXQuc3RhdHVzLFxuICAgICAgbm90ZTogam9iLm5vdGUsXG4gICAgfSk7XG4gICAgLy8gbm90aWZ5IHRoZSBtZW50aW9uZXIgXHUyMDE0IHRoZSByZXZlcnNlIGRpcmVjdGlvbiBpcyBhIG1lc3NhZ2UgKyBub3RpZmljYXRpb24sIG5vdGhpbmcgbW9yZSAoXHUwMEE3NS40KVxuICAgIGNvbnN0IHRyaWdnZXIgPSB0aGlzLm1lc3NhZ2VzLmZpbmQoKG0pID0+IG0uaWQgPT09IGpvYi5tZXNzYWdlSWQpO1xuICAgIGlmICh0cmlnZ2VyKSB0aGlzLnB1c2hOb3RpZmljYXRpb24odHJpZ2dlci5hdXRob3JJZCwgJ2pvYl9jb21wbGV0ZWQnLCBqb2IuaWQpO1xuICAgIHJldHVybiB7IC4uLmpvYiB9O1xuICB9XG5cbiAgLyoqIFJhaWxzIFx1MjE5MiBjaGF0IG5hcnJhdGlvbiAoXHUwMEE3NS4yKTogc3RhdGUgY2hhbmdlcyBuYXJyYXRlIGludG8gYm91bmQgdGFzayB0aHJlYWRzLiAqL1xuICBwcml2YXRlIG5hcnJhdGVXb3JrSXRlbShpdGVtOiBXb3JrSXRlbVJvdywgYm9keTogc3RyaW5nKTogdm9pZCB7XG4gICAgZm9yIChjb25zdCB0aHJlYWQgb2YgdGhpcy50aHJlYWRzLnZhbHVlcygpKSB7XG4gICAgICBpZiAodGhyZWFkLndvcmtJdGVtSWQgPT09IGl0ZW0uaWQpIHtcbiAgICAgICAgdGhpcy5hcHBlbmRNZXNzYWdlKHRocmVhZCwgdGhpcy5zeXN0ZW1BY3RvcklkLCAnc3lzdGVtJywgYm9keSwgbnVsbCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLy8gLS0gZGlzcGF0Y2ggKHJvYWRtYXAgXHUwMEE3Mi4zKSAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIGdldFRhc2tDb250ZXh0KGlucHV0OiB7IHdvcmtJdGVtSWQ6IHN0cmluZyB9KTogeyB3b3JrSXRlbTogV29ya0l0ZW07IGVudHJ5U3RhdGU6IFdvcmtJdGVtU3RhdGUgfSB7XG4gICAgY29uc3QgaXRlbSA9IHRoaXMubXVzdEdldEl0ZW0oaW5wdXQud29ya0l0ZW1JZCk7XG4gICAgaWYgKGl0ZW0uc3RhdGUgPT09ICdkb25lJykge1xuICAgICAgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoJ2RvbmUgaXRlbXMgYXJlIG5ldmVyIHJlLWRpc3BhdGNoZWQ7IGZvbGxvdy11cCByZXZpZXcgaXMgYSBuZXcgd29yayBpdGVtJyk7XG4gICAgfVxuICAgIGNvbnN0IGZlYXR1cmUgPSB0aGlzLmZlYXR1cmVzLmdldChpdGVtLmZlYXR1cmVJZCk7XG4gICAgaWYgKGZlYXR1cmU/LmRpc3BhdGNoSG9sZCkge1xuICAgICAgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoJ2ZlYXR1cmUgaXMgdW5kZXIgYSBkb25lX2NoZWNrcG9pbnQgZGlzcGF0Y2ggaG9sZCcpO1xuICAgIH1cbiAgICByZXR1cm4geyB3b3JrSXRlbTogdGhpcy5jb3B5SXRlbShpdGVtKSwgZW50cnlTdGF0ZTogaXRlbS5zdGF0ZSB9O1xuICB9XG5cbiAgcmVsZWFzZURpc3BhdGNoSG9sZChpbnB1dDogeyBmZWF0dXJlSWQ6IHN0cmluZzsgYWN0b3JJZDogc3RyaW5nIH0pOiBGZWF0dXJlIHtcbiAgICB0aGlzLnJlcXVpcmVQZXJtaXNzaW9uKGlucHV0LmFjdG9ySWQsICdkaXNwYXRjaC5yZWxlYXNlX2hvbGQnKTtcbiAgICBjb25zdCBmZWF0dXJlID0gdGhpcy5mZWF0dXJlcy5nZXQoaW5wdXQuZmVhdHVyZUlkKTtcbiAgICBpZiAoIWZlYXR1cmUpIHRocm93IG5ldyBHdWFyZEZhaWxlZEVycm9yKGB1bmtub3duIGZlYXR1cmU6ICR7aW5wdXQuZmVhdHVyZUlkfWApO1xuICAgIGZlYXR1cmUuZGlzcGF0Y2hIb2xkID0gZmFsc2U7XG4gICAgdGhpcy5hcHBlbmQoJ2ZlYXR1cmUnLCBmZWF0dXJlLmlkLCAnZmVhdHVyZS5kaXNwYXRjaF9ob2xkX3JlbGVhc2VkJywgaW5wdXQuYWN0b3JJZCwge30pO1xuICAgIHJldHVybiB0aGlzLmNvcHlGZWF0dXJlKGZlYXR1cmUpO1xuICB9XG5cbiAgLy8gLS0gcmVjb25jaWxpYXRpb24gKHJvYWRtYXAgXHUwMEE3MS42LCBENjogZGV0ZWN0LW9ubHksIG5ldmVyIG11dGF0ZXMpIC0tLS0tLS0tLS0tLVxuXG4gIHJlY29uY2lsZShpbnB1dDogeyBmaWxlczogQXJyYXk8eyB3b3JrSXRlbUlkOiBzdHJpbmc7IGZyb250bWF0dGVyU3RhdHVzOiBzdHJpbmcgfT4gfSk6IERpdmVyZ2VuY2VSZXBvcnRbXSB7XG4gICAgY29uc3QgcmVwb3J0czogRGl2ZXJnZW5jZVJlcG9ydFtdID0gW107XG4gICAgZm9yIChjb25zdCBmaWxlIG9mIGlucHV0LmZpbGVzKSB7XG4gICAgICBjb25zdCBpdGVtID0gdGhpcy5tdXN0R2V0SXRlbShmaWxlLndvcmtJdGVtSWQpO1xuICAgICAgLy8gRmlsZXMgdW5kZXIgYSBsaXZlIGNsYWltIGFyZSBleGNsdWRlZCBcdTIwMTQgcGxheWJvb2tzIGxlZ2l0aW1hdGVseSB3cml0ZVxuICAgICAgLy8gZnJvbnRtYXR0ZXIgbWlkLXJ1biAoXHUwMEE3MS42KS5cbiAgICAgIGlmICh0aGlzLmxpdmVDbGFpbShpdGVtLmlkKSAhPT0gbnVsbCkgY29udGludWU7XG5cbiAgICAgIGNvbnN0IHJhdyA9IGZpbGUuZnJvbnRtYXR0ZXJTdGF0dXMudHJpbSgpO1xuICAgICAgaWYgKHJhdyA9PT0gJ2Jsb2NrZWQnKSB7XG4gICAgICAgIC8vIEQ4OiBvdmVybGF5IGluIHRoZSBEQiBhbmQgYHN0YXR1czogYmxvY2tlZGAgaW4gdGhlIGZpbGUgYXJlIHRoZVxuICAgICAgICAvLyBzYW1lIHRydXRoLiBCbG9ja2VkLWluLWZpbGUgd2l0aCBOTyBvdmVybGF5IGlzIHJlYWwgZHJpZnQuXG4gICAgICAgIGlmIChpdGVtLmJsb2NrZWRSZWFzb24gIT09IG51bGwpIGNvbnRpbnVlO1xuICAgICAgICByZXBvcnRzLnB1c2goe1xuICAgICAgICAgIHdvcmtJdGVtSWQ6IGl0ZW0uaWQsXG4gICAgICAgICAgZmlsZVN0YXRlOiByYXcsXG4gICAgICAgICAgZGJTdGF0ZTogaXRlbS5zdGF0ZSxcbiAgICAgICAgICBraW5kOiAnY29uZmxpY3QnLFxuICAgICAgICB9KTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IG5vcm1hbGl6ZWQgPSBMRUdBQ1lfU1RBVFVTW3Jhd107XG4gICAgICBpZiAobm9ybWFsaXplZCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJlcG9ydHMucHVzaCh7IHdvcmtJdGVtSWQ6IGl0ZW0uaWQsIGZpbGVTdGF0ZTogcmF3LCBkYlN0YXRlOiBpdGVtLnN0YXRlLCBraW5kOiAnY29uZmxpY3QnIH0pO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGlmIChub3JtYWxpemVkID09PSBpdGVtLnN0YXRlKSBjb250aW51ZTtcbiAgICAgIHJlcG9ydHMucHVzaCh7XG4gICAgICAgIHdvcmtJdGVtSWQ6IGl0ZW0uaWQsXG4gICAgICAgIGZpbGVTdGF0ZTogcmF3LFxuICAgICAgICBkYlN0YXRlOiBpdGVtLnN0YXRlLFxuICAgICAgICBraW5kOiBSQU5LW25vcm1hbGl6ZWRdID4gUkFOS1tpdGVtLnN0YXRlXSA/ICdmaWxlX2FoZWFkJyA6ICdkYl9haGVhZCcsXG4gICAgICB9KTtcbiAgICB9XG4gICAgcmV0dXJuIHJlcG9ydHM7XG4gIH1cblxuICAvLyAtLSBxdWVyaWVzIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIGdldFdvcmtJdGVtKGlkOiBzdHJpbmcpOiBXb3JrSXRlbSB7XG4gICAgcmV0dXJuIHRoaXMuY29weUl0ZW0odGhpcy5tdXN0R2V0SXRlbShpZCkpO1xuICB9XG5cbiAgZ2V0RmVhdHVyZShpZDogc3RyaW5nKTogRmVhdHVyZSB7XG4gICAgY29uc3QgZmVhdHVyZSA9IHRoaXMuZmVhdHVyZXMuZ2V0KGlkKTtcbiAgICBpZiAoIWZlYXR1cmUpIHRocm93IG5ldyBHdWFyZEZhaWxlZEVycm9yKGB1bmtub3duIGZlYXR1cmU6ICR7aWR9YCk7XG4gICAgcmV0dXJuIHRoaXMuY29weUZlYXR1cmUoZmVhdHVyZSk7XG4gIH1cblxuICBsaXN0V29ya0l0ZW1zKGZpbHRlcj86IHsgc3RhdGU/OiBXb3JrSXRlbVN0YXRlOyBmZWF0dXJlSWQ/OiBzdHJpbmc7IGNsYWltYWJsZT86IGJvb2xlYW4gfSk6IFdvcmtJdGVtW10ge1xuICAgIHJldHVybiBbLi4udGhpcy53b3JrSXRlbXMudmFsdWVzKCldXG4gICAgICAuZmlsdGVyKChpdGVtKSA9PiB7XG4gICAgICAgIGlmIChmaWx0ZXI/LnN0YXRlICE9PSB1bmRlZmluZWQgJiYgaXRlbS5zdGF0ZSAhPT0gZmlsdGVyLnN0YXRlKSByZXR1cm4gZmFsc2U7XG4gICAgICAgIGlmIChmaWx0ZXI/LmZlYXR1cmVJZCAhPT0gdW5kZWZpbmVkICYmIGl0ZW0uZmVhdHVyZUlkICE9PSBmaWx0ZXIuZmVhdHVyZUlkKSByZXR1cm4gZmFsc2U7XG4gICAgICAgIGlmIChmaWx0ZXI/LmNsYWltYWJsZSA9PT0gdHJ1ZSAmJiB0aGlzLmxpdmVDbGFpbShpdGVtLmlkKSAhPT0gbnVsbCkgcmV0dXJuIGZhbHNlO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH0pXG4gICAgICAubWFwKChpdGVtKSA9PiB0aGlzLmNvcHlJdGVtKGl0ZW0pKTtcbiAgfVxuXG4gIGdldENsYWltcyh3b3JrSXRlbUlkOiBzdHJpbmcpOiBDbGFpbVtdIHtcbiAgICBjb25zdCBpdGVtID0gdGhpcy5tdXN0R2V0SXRlbSh3b3JrSXRlbUlkKTtcbiAgICByZXR1cm4gKHRoaXMuY2xhaW1zQnlJdGVtLmdldChpdGVtLmlkKSA/PyBbXSkuZmxhdE1hcCgoY2xhaW1JZCkgPT4ge1xuICAgICAgY29uc3QgY2xhaW0gPSB0aGlzLmNsYWltcy5nZXQoY2xhaW1JZCk7XG4gICAgICByZXR1cm4gY2xhaW0gPyBbdGhpcy5jb3B5Q2xhaW0oY2xhaW0pXSA6IFtdO1xuICAgIH0pO1xuICB9XG5cbiAgZXZlbnRzKHN0cmVhbUlkPzogc3RyaW5nKTogU3BpbmVFdmVudFtdIHtcbiAgICBjb25zdCBzb3VyY2UgPSBzdHJlYW1JZCA9PT0gdW5kZWZpbmVkID8gdGhpcy5ldmVudExvZyA6IHRoaXMuZXZlbnRMb2cuZmlsdGVyKChlKSA9PiBlLnN0cmVhbUlkID09PSBzdHJlYW1JZCk7XG4gICAgcmV0dXJuIHNvdXJjZS5tYXAoKGV2ZW50KSA9PiAoeyAuLi5ldmVudCwgcGF5bG9hZDogeyAuLi5ldmVudC5wYXlsb2FkIH0gfSkpO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVFbmdpbmUoKTogU3BpbmVFbmdpbmUge1xuICByZXR1cm4gbmV3IEVuZ2luZUltcGwoKTtcbn1cbiIsICIvKipcbiAqIEZyb3plbiBpbnRlbnQgcmVnaW9uIGV4dHJhY3Rpb24gKyB2ZXJzaW9uZWQgaW50ZW50IGhhc2ggKHJvYWRtYXAgXHUwMEE3MS4xKS5cbiAqXG4gKiBCb3RoIHJlYWwtd29ybGQgdGFncyBhcmUgcmVjb2duaXplZDogYDxpbnRlbnQtY29udHJhY3Q+YCAoZGV2LWF1dG9cbiAqIHNwZWMtdGVtcGxhdGUubWQpIGFuZCBgPGZyb3plbi1hZnRlci1hcHByb3ZhbCAuLi4+YCAocXVpY2stZGV2XG4gKiBzcGVjLXRlbXBsYXRlLm1kKS4gSGFzaGluZyBoYXBwZW5zIGFmdGVyIGNhbm9uaWNhbGl6YXRpb24gc28gbGluZS1lbmRpbmdcbiAqIGFuZCB0cmFpbGluZy13aGl0ZXNwYWNlIGNodXJuIChDUkxGIGVkaXRvcnMsIGF1dG8tZm9ybWF0dGVycykgbmV2ZXIgbW92ZXNcbiAqIHRoZSBoYXNoIFx1MjAxNCBvbmx5IHJlYWwgaW50ZW50IGRyaWZ0IGRvZXMgKHRlY2huaWNhbC1yaXNrIHJldmlldzogYWxhcm1cbiAqIGZhdGlndWUga2lsbHMgdGhlIG1lY2hhbmlzbSkuXG4gKi9cbmltcG9ydCB7IGNyZWF0ZUhhc2ggfSBmcm9tICdub2RlOmNyeXB0byc7XG5cbmltcG9ydCB7IElOVEVOVF9IQVNIX0FMR08gfSBmcm9tICcuL3R5cGVzLmpzJztcblxuY29uc3QgVEFHX1BBVFRFUk5TID0gW1xuICAvPGludGVudC1jb250cmFjdD4oW1xcc1xcU10qPyk8XFwvaW50ZW50LWNvbnRyYWN0Pi8sXG4gIC88ZnJvemVuLWFmdGVyLWFwcHJvdmFsXFxiW14+XSo+KFtcXHNcXFNdKj8pPFxcL2Zyb3plbi1hZnRlci1hcHByb3ZhbD4vLFxuXTtcblxuZXhwb3J0IGZ1bmN0aW9uIGV4dHJhY3RJbnRlbnRSZWdpb24obWFya2Rvd246IHN0cmluZyk6IHN0cmluZyB8IG51bGwge1xuICBmb3IgKGNvbnN0IHBhdHRlcm4gb2YgVEFHX1BBVFRFUk5TKSB7XG4gICAgY29uc3QgbWF0Y2ggPSBwYXR0ZXJuLmV4ZWMobWFya2Rvd24pO1xuICAgIGlmIChtYXRjaCAhPT0gbnVsbCkgcmV0dXJuIG1hdGNoWzFdID8/ICcnO1xuICB9XG4gIHJldHVybiBudWxsO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY2Fub25pY2FsaXplRm9ySGFzaCh0ZXh0OiBzdHJpbmcpOiBzdHJpbmcge1xuICBjb25zdCB1bml4TmV3bGluZXMgPSB0ZXh0LnJlcGxhY2UoL1xcclxcbi9nLCAnXFxuJyk7XG4gIGNvbnN0IHN0cmlwcGVkID0gdW5peE5ld2xpbmVzXG4gICAgLnNwbGl0KCdcXG4nKVxuICAgIC5tYXAoKGxpbmUpID0+IGxpbmUucmVwbGFjZSgvWyBcXHRdKyQvLCAnJykpXG4gICAgLmpvaW4oJ1xcbicpO1xuICAvLyBDb2xsYXBzZSBydW5zIG9mIDIrIGJsYW5rIGxpbmVzIHRvIGEgc2luZ2xlIGJsYW5rIGxpbmU7IGEgc2luZ2xlIGJsYW5rXG4gIC8vIGxpbmUgaXMgbWVhbmluZ2Z1bCBtYXJrZG93biBhbmQgcGFzc2VzIHRocm91Z2ggdW50b3VjaGVkLlxuICByZXR1cm4gc3RyaXBwZWQucmVwbGFjZSgvXFxuezMsfS9nLCAnXFxuXFxuJyk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjb21wdXRlSW50ZW50SGFzaChyZWdpb246IHN0cmluZyk6IHN0cmluZyB7XG4gIGNvbnN0IGRpZ2VzdCA9IGNyZWF0ZUhhc2goJ3NoYTI1NicpLnVwZGF0ZShjYW5vbmljYWxpemVGb3JIYXNoKHJlZ2lvbiksICd1dGY4JykuZGlnZXN0KCdoZXgnKTtcbiAgcmV0dXJuIGAke0lOVEVOVF9IQVNIX0FMR099OiR7ZGlnZXN0fWA7XG59XG4iLCAiLyoqXG4gKiBAb2Focy9jb3JlIFx1MjAxNCBwdWJsaWMgQVBJIG9mIHRoZSBkZXRlcm1pbmlzdGljIHNwaW5lIChSdWxlcyBsYXllciBhcyBjb2RlKS5cbiAqXG4gKiBUaGUgY29uZm9ybWFuY2Ugc3VpdGUgaW4gdGVzdC8gaXMgdGhlIHNwZWNpZmljYXRpb246IGl0IHdhcyB3cml0dGVuIGZpcnN0LFxuICogZnJvbSB0aGUgcHJvc2UgcnVsZXMgaW4gdGhlIEJNQUQgc291cmNlIGFzIGFyYml0cmF0ZWQgaW4gcHJvZHVjdC1yb2FkbWFwLm1kXG4gKiBcdTAwQTcxIGFuZCB0ZXN0L0NPTkZPUk1BTkNFLm1kLiBJbXBsZW1lbnRhdGlvbiBtb2R1bGVzOlxuICogIC0gdHlwZXMudHMgICAgICAgXHUyMDE0IHZvY2FidWxhcnksIGVudGl0aWVzLCBlcnJvcnMgKHRoZSBmaXhlZCBzdXJmYWNlKVxuICogIC0gZW5naW5lLnRzICAgICAgXHUyMDE0IGluLW1lbW9yeSByZWZlcmVuY2UgZW5naW5lIChGU00sIGNsYWltcywgZ2F0ZXMsIGV2ZW50cylcbiAqICAtIGludGVudC1oYXNoLnRzIFx1MjAxNCBmcm96ZW4tcmVnaW9uIGV4dHJhY3Rpb24gKyB2ZXJzaW9uZWQgY2Fub25pY2FsaXplZCBoYXNoXG4gKiAgLSBzdG9yaWVzLnRzICAgICBcdTIwMTQgc3Rvcmllcy55YW1sIHBhcnNpbmcgKyB2YWxpZGl0eSBydWxlc1xuICpcbiAqIEludmFyaWFudHMgKHByb2R1Y3Qtcm9hZG1hcC5tZCBcdTAwQTcwLjEsIG1hY2hpbmUtY2hlY2tlZCBpbiBDSSk6XG4gKiAgLSBObyBMTE0gU0RLIGltcG9ydCBhbnl3aGVyZSB1bmRlciBwYWNrYWdlcy9jb3JlLlxuICogIC0gTm8gY29kZSBwYXRoIG91dHNpZGUgY29tbWFuZCBoYW5kbGVycyB3cml0ZXMgcHJvamVjdGlvbnMuXG4gKi9cbmltcG9ydCB7IGNyZWF0ZUVuZ2luZSBhcyBjcmVhdGVNZW1vcnlFbmdpbmUgfSBmcm9tICcuL2VuZ2luZS5qcyc7XG5pbXBvcnQgdHlwZSB7IFNwaW5lRW5naW5lIH0gZnJvbSAnLi90eXBlcy5qcyc7XG5cbmV4cG9ydCAqIGZyb20gJy4vdHlwZXMuanMnO1xuZXhwb3J0IHsgZXh0cmFjdEludGVudFJlZ2lvbiwgY2Fub25pY2FsaXplRm9ySGFzaCwgY29tcHV0ZUludGVudEhhc2ggfSBmcm9tICcuL2ludGVudC1oYXNoLmpzJztcbmV4cG9ydCB7IHBhcnNlU3RvcmllcywgdHlwZSBTdG9yeUVudHJ5IH0gZnJvbSAnLi9zdG9yaWVzLmpzJztcblxuLyoqXG4gKiBFbmdpbmUgZmFjdG9yeSBpbmRpcmVjdGlvbjogdGhlIGNvbmZvcm1hbmNlIHN1aXRlIGFsd2F5cyBjYWxsc1xuICogY3JlYXRlRW5naW5lKCk7IGEgcGVyc2lzdGVuY2UgcGFja2FnZSAoZS5nLiBAb2Focy9kYikgcmVnaXN0ZXJzIGl0cyBvd25cbiAqIGZhY3RvcnkgaW4gYSB2aXRlc3Qgc2V0dXAgZmlsZSB0byBydW4gdGhlIElERU5USUNBTCBzdWl0ZSBhZ2FpbnN0IFBvc3RncmVzXG4gKiAoc3RvcnkgXCIxMVwiOiBcImNvbmZvcm1hbmNlIHN1aXRlIHJ1bnMgYWdhaW5zdCBib3RoIG1lbW9yeSBhbmQgUG9zdGdyZXNcbiAqIGVuZ2luZXNcIikuIERlZmF1bHQgaXMgdGhlIGluLW1lbW9yeSByZWZlcmVuY2UgZW5naW5lLlxuICovXG5sZXQgZW5naW5lRmFjdG9yeTogKCkgPT4gU3BpbmVFbmdpbmUgPSBjcmVhdGVNZW1vcnlFbmdpbmU7XG5cbmV4cG9ydCBmdW5jdGlvbiBzZXRFbmdpbmVGYWN0b3J5KGZhY3Rvcnk6ICgpID0+IFNwaW5lRW5naW5lKTogdm9pZCB7XG4gIGVuZ2luZUZhY3RvcnkgPSBmYWN0b3J5O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlRW5naW5lKCk6IFNwaW5lRW5naW5lIHtcbiAgcmV0dXJuIGVuZ2luZUZhY3RvcnkoKTtcbn1cblxuZXhwb3J0IHsgY3JlYXRlTWVtb3J5RW5naW5lIH07XG4iLCAiLyoqXG4gKiBkb2NsaW50IFx1MjAxNCB0aGUgTUVBU1VSSU5HIHRvb2wgZm9yIG5vbi1jb2RlIHdvcmsgKFBoYXNlIDQsIHJvYWRtYXAgXHUwMEE3MS40KS5cbiAqXG4gKiBcIkZvciBub24tY29kZSB3b3JrOiBldmlkZW5jZSBpcyBlaXRoZXIgbWFjaGluZS1jaGVja2FibGUgKGZpbGUgZXhpc3RzLFxuICogZnJvbnRtYXR0ZXIgc2NoZW1hLXZhbGlkLCBkb2N1bWVudCBsaW50KSBvciBhIHBlcm1pdHRlZCBhY3RvcidzIGdhdGVcbiAqIGRlY2lzaW9uLiBBIGNoZWNrbGlzdCBhbiBMTE0gdGlja2VkIGlzIG5laXRoZXIuXCJcbiAqXG4gKiBsaW50RG9jIGlzIGRldGVybWluaXN0aWMgYW5kIExMTS1mcmVlOiBpdCBNRUFTVVJFUyBhIGRvY3VtZW50IGFuZCByZXR1cm5zXG4gKiByYXcgZmluZGluZ3MuIFRoZSB2ZXJkaWN0ICh3aGV0aGVyIGEgZmFpbGluZyBsaW50IGJsb2NrcyBpbl9wcm9ncmVzcyBcdTIxOTJcbiAqIGluX3JldmlldykgaXMgY29tcHV0ZWQgYnkgdGhlIGNvcmUgZnJvbSB0aGUgc3VibWl0dGVkIGRvY19saW50IGV2aWRlbmNlIFx1MjAxNFxuICogbmV2ZXIgaGVyZS5cbiAqXG4gKiBDaGVja3M6XG4gKiAgMS4gbm9uLWVtcHR5IGNvbnRlbnQ7XG4gKiAgMi4gaWYgdGhlIGRvY3VtZW50IG9wZW5zIHdpdGggYSAnLS0tJyBmcm9udG1hdHRlciBmZW5jZSwgdGhlIGJsb2NrIG11c3RcbiAqICAgICBwYXJzZSBhcyBZQU1MIChhbmQgY2xvc2UpO1xuICogIDMuIGV2ZXJ5IHJlcXVlc3RlZCByZXF1aXJlZCBzZWN0aW9uIG11c3QgZXhpc3QgYXMgYW4gSDIgaGVhZGluZ1xuICogICAgIChgIyMgPG5hbWU+YCwgY2FzZS1pbnNlbnNpdGl2ZSk7XG4gKiAgNC4gcGxhY2Vob2xkZXIgbWFya2VycyAoVEJEIC8gVE9ETyAvIEZJWE1FIC8gTE9SRU0gSVBTVU0pIGFyZSBmaW5kaW5ncyBcdTIwMTRcbiAqICAgICBhIHBsYWNlaG9sZGVyLXJpZGRlbiBkb2N1bWVudCBpcyBub3Qgc2NoZW1hLXZhbGlkLlxuICovXG5pbXBvcnQgeyBwYXJzZSBhcyBwYXJzZVlhbWwgfSBmcm9tICd5YW1sJztcblxuZXhwb3J0IGludGVyZmFjZSBMaW50RG9jT3B0aW9ucyB7XG4gIC8qKiBIMiBoZWFkaW5ncyB0aGUgZG9jdW1lbnQgbXVzdCBjb250YWluIChtYXRjaGVkIGFzIGAjIyA8bmFtZT5gKS4gKi9cbiAgcmVxdWlyZWRTZWN0aW9ucz86IHN0cmluZ1tdO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIERvY0xpbnRSZXN1bHQge1xuICAvKiogdHJ1ZSB3aGVuIGV2ZXJ5IGNoZWNrIHBhc3NlZCBcdTIwMTQgdGhlIHBheWxvYWQgdGhlIGNvcmUgZ3VhcmRzIG9uLiAqL1xuICBzY2hlbWFWYWxpZDogYm9vbGVhbjtcbiAgLyoqIEh1bWFuLXJlYWRhYmxlIGZpbmRpbmdzLCBlbXB0eSB3aGVuIHNjaGVtYVZhbGlkLiAqL1xuICBmaW5kaW5nczogc3RyaW5nW107XG59XG5cbmNvbnN0IFBMQUNFSE9MREVSX1JFID0gL1xcYihUQkR8VE9ET3xGSVhNRXxMT1JFTSBJUFNVTSlcXGIvaTtcblxuLyoqIEVzY2FwZSBhIHN0cmluZyBmb3IgbGl0ZXJhbCB1c2UgaW5zaWRlIGEgUmVnRXhwLiAqL1xuZnVuY3Rpb24gZXNjYXBlUmVnRXhwKHZhbHVlOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gdmFsdWUucmVwbGFjZSgvWy4qKz9eJHt9KCl8W1xcXVxcXFxdL2csICdcXFxcJCYnKTtcbn1cblxuLyoqXG4gKiBTcGxpdCBvZmYgYSBsZWFkaW5nICctLS0nIGZyb250bWF0dGVyIGJsb2NrLiBSZXR1cm5zIHRoZSByYXcgYmxvY2sgKG51bGxcbiAqIHdoZW4gdGhlcmUgaXMgbm9uZSksIHdoZXRoZXIgdGhlIGZlbmNlIGNsb3NlZCwgYW5kIHRoZSByZW1haW5pbmcgYm9keS5cbiAqL1xuZnVuY3Rpb24gc3BsaXRGcm9udG1hdHRlcihjb250ZW50OiBzdHJpbmcpOiB7XG4gIGJsb2NrOiBzdHJpbmcgfCBudWxsO1xuICBjbG9zZWQ6IGJvb2xlYW47XG4gIGJvZHk6IHN0cmluZztcbn0ge1xuICBpZiAoIWNvbnRlbnQuc3RhcnRzV2l0aCgnLS0tJykpIHJldHVybiB7IGJsb2NrOiBudWxsLCBjbG9zZWQ6IHRydWUsIGJvZHk6IGNvbnRlbnQgfTtcbiAgY29uc3QgY2xvc2UgPSBjb250ZW50LmluZGV4T2YoJ1xcbi0tLScsIDMpO1xuICBpZiAoY2xvc2UgPT09IC0xKSByZXR1cm4geyBibG9jazogbnVsbCwgY2xvc2VkOiBmYWxzZSwgYm9keTogY29udGVudCB9O1xuICBjb25zdCBmaXJzdE5ld2xpbmUgPSBjb250ZW50LmluZGV4T2YoJ1xcbicpO1xuICBjb25zdCBibG9jayA9IGNvbnRlbnQuc2xpY2UoZmlyc3ROZXdsaW5lICsgMSwgY2xvc2UpO1xuICBjb25zdCBib2R5U3RhcnQgPSBjb250ZW50LmluZGV4T2YoJ1xcbicsIGNsb3NlICsgMSk7XG4gIGNvbnN0IGJvZHkgPSBib2R5U3RhcnQgPT09IC0xID8gJycgOiBjb250ZW50LnNsaWNlKGJvZHlTdGFydCArIDEpO1xuICByZXR1cm4geyBibG9jaywgY2xvc2VkOiB0cnVlLCBib2R5IH07XG59XG5cbi8qKiBEZXRlcm1pbmlzdGljYWxseSBsaW50IGEgZG9jdW1lbnQuIFB1cmUgbWVhc3VyZW1lbnQgXHUyMDE0IG5vIExMTSwgbm8gdmVyZGljdHMuICovXG5leHBvcnQgZnVuY3Rpb24gbGludERvYyhjb250ZW50OiBzdHJpbmcsIG9wdHM6IExpbnREb2NPcHRpb25zID0ge30pOiBEb2NMaW50UmVzdWx0IHtcbiAgY29uc3QgZmluZGluZ3M6IHN0cmluZ1tdID0gW107XG5cbiAgaWYgKGNvbnRlbnQudHJpbSgpLmxlbmd0aCA9PT0gMCkge1xuICAgIGZpbmRpbmdzLnB1c2goJ2RvY3VtZW50IGlzIGVtcHR5Jyk7XG4gICAgcmV0dXJuIHsgc2NoZW1hVmFsaWQ6IGZhbHNlLCBmaW5kaW5ncyB9O1xuICB9XG5cbiAgY29uc3QgeyBibG9jaywgY2xvc2VkIH0gPSBzcGxpdEZyb250bWF0dGVyKGNvbnRlbnQpO1xuICBpZiAoIWNsb3NlZCkge1xuICAgIGZpbmRpbmdzLnB1c2goXCJmcm9udG1hdHRlciBmZW5jZSAnLS0tJyBuZXZlciBjbG9zZXNcIik7XG4gIH0gZWxzZSBpZiAoYmxvY2sgIT09IG51bGwpIHtcbiAgICB0cnkge1xuICAgICAgcGFyc2VZYW1sKGJsb2NrKTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgY29uc3QgbWVzc2FnZSA9IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlLnNwbGl0KCdcXG4nKVswXSA6IFN0cmluZyhlcnJvcik7XG4gICAgICBmaW5kaW5ncy5wdXNoKGBmcm9udG1hdHRlciBpcyBub3QgdmFsaWQgWUFNTDogJHttZXNzYWdlID8/ICdwYXJzZSBlcnJvcid9YCk7XG4gICAgfVxuICB9XG5cbiAgZm9yIChjb25zdCBzZWN0aW9uIG9mIG9wdHMucmVxdWlyZWRTZWN0aW9ucyA/PyBbXSkge1xuICAgIGNvbnN0IGhlYWRpbmdSZSA9IG5ldyBSZWdFeHAoYF4jI1xcXFxzKyR7ZXNjYXBlUmVnRXhwKHNlY3Rpb24pfVxcXFxzKiRgLCAnaW0nKTtcbiAgICBpZiAoIWhlYWRpbmdSZS50ZXN0KGNvbnRlbnQpKSB7XG4gICAgICBmaW5kaW5ncy5wdXNoKGBtaXNzaW5nIHJlcXVpcmVkIHNlY3Rpb246ICMjICR7c2VjdGlvbn1gKTtcbiAgICB9XG4gIH1cblxuICBjb25zdCBsaW5lcyA9IGNvbnRlbnQuc3BsaXQoJ1xcbicpO1xuICBmb3IgKGxldCBpID0gMDsgaSA8IGxpbmVzLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgY29uc3QgbGluZSA9IGxpbmVzW2ldO1xuICAgIGlmIChsaW5lICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIGNvbnN0IG1hdGNoID0gUExBQ0VIT0xERVJfUkUuZXhlYyhsaW5lKTtcbiAgICAgIGlmIChtYXRjaCAhPT0gbnVsbCkge1xuICAgICAgICBmaW5kaW5ncy5wdXNoKGBwbGFjZWhvbGRlciBcIiR7bWF0Y2hbMV0gPz8gbWF0Y2hbMF19XCIgYXQgbGluZSAke2kgKyAxfWApO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiB7IHNjaGVtYVZhbGlkOiBmaW5kaW5ncy5sZW5ndGggPT09IDAsIGZpbmRpbmdzIH07XG59XG4iLCAiLyoqXG4gKiBAb2Focy9ydW5uZXIgXHUyMDE0IHRoZSBCWU8gd29ya2VyIGxvb3AgKFBoYXNlIDEgc3RvcnkgMTQpLlxuICpcbiAqIEZJWEVEIElOVEVSRkFDRSBiZXR3ZWVuIHRoZSBvYWhzIENMSSAoYG9haHMgd29ya2ApIGFuZCB0aGUgcnVubmVyIGxpYnJhcnkuXG4gKiBUaGUgQ0xJIHdpcmVzIGZsYWdzL2VudiBpbnRvIFJ1bm5lck9wdGlvbnMgYW5kIGNhbGxzIHdvcmtMb29wL3J1bk9uY2U7IGFsbFxuICogcnVubmVyIGxvZ2ljIGxpdmVzIGhlcmUuXG4gKlxuICogQ29udHJhY3QgKHByb2R1Y3Qtcm9hZG1hcC5tZCBcdTAwQTcyLjMpOlxuICogIDEuIHBvbGwgbGlzdF93b3JrX2l0ZW1zKHN0YXRlPXJlYWR5X2Zvcl9kZXYsIGNsYWltYWJsZSkgXHUyMTkyIGNsYWltX3Rhc2tcbiAqICAgICAoY3Jhc2ggcmUtZGlzcGF0Y2g6IGFuIGluX3Byb2dyZXNzIGl0ZW0gd2l0aCBOTyBsaXZlIGNsYWltIGlzIGEgZGVhZFxuICogICAgIHdvcmtlcidzIHJ1biBcdTIwMTQgcG9sbGVkIGFzIGEgZmFsbGJhY2sgc28gcmVjb3ZlcnkgdXNlcyB0aGUgc2FtZSBsb29wKVxuICogIDIuIHdvcmt0cmVlIG5hbWVkIGJ5IGNsYWltIGlkOyBicmFuY2ggYGNsYWltLzxjbGFpbUlkPmBcbiAqICAzLiBtaXJyb3Itb24tZGlzcGF0Y2g6IHN0YW1wIHNwZWMgZnJvbnRtYXR0ZXIgdG8gdGhlIERCIGVudHJ5IHN0YXRlXG4gKiAgNC4gYWR2YW5jZV9zdGF0ZSh0bz1pbl9wcm9ncmVzcykgQkVGT1JFIHRoZSBhZ2VudCBydW5zIFx1MjAxNCBEQiBpcyB0aGUgZW50cnkgc3RhdGVcbiAqICA1LiBpbnZva2UgdGhlIGNvZGluZyBhZ2VudCAodGVtcGxhdGU7IHVubW9kaWZpZWQgYm1hZC1kZXYtYXV0byBjb250ZW50KVxuICogIDYuIHBhcnNlIEhBTFQgKyBBdXRvIFJ1biBSZXN1bHQgXHUyMTkyIGhhbHRfcmVwb3J0IGV2aWRlbmNlICh2ZXJiYXRpbSlcbiAqICA3LiBydW4gUElOTkVEIHZlcmlmaWNhdGlvbiBjb21tYW5kcyBvbmx5IChhbGxvd2xpc3RlZCkgXHUyMTkyIHRlc3RfcnVuIGV2aWRlbmNlXG4gKiAgOC4gcHVzaCBicmFuY2ggXHUyMTkyIGdpdF9kaWZmICsgY29tbWl0IGV2aWRlbmNlIChyZW1vdGUgcmVhY2hhYmlsaXR5IG1lYXN1cmVkKVxuICogIDkuIGFkdmFuY2Vfc3RhdGUgLyBibG9ja190YXNrIHBlciBIQUxUIHN0YXR1cyBcdTIwMTQgdGhlIGNvcmUgY29tcHV0ZXMgdmVyZGljdHNcbiAqIDEwLiBjcmFzaCByZWNvdmVyeSBvbiByZS1jbGFpbTogYWRvcHQgYSBkZWNlbnRseS1maW5pc2hlZCB3b3JrdHJlZSAodGVybWluYWxcbiAqICAgICBmcm9udG1hdHRlciArIGEgcmVhbCBjb21taXQgcGFzdCBpdHMgYmFzZWxpbmUpIHdpdGggbGF0ZSBldmlkZW5jZVxuICogICAgIHN1Ym1pc3Npb247IGEgd3JlY2tlZCB3b3JrdHJlZSBpcyBjbGVhbmVkIGFuZCBibG9ja2VkIGBzdGFsZV93b3JrdHJlZWAuXG4gKlxuICogQWdlbnQgaW52b2NhdGlvbiBlbnZpcm9ubWVudCAocGFydCBvZiB0aGlzIGludGVyZmFjZSk6IHRoZSBhZ2VudCBjb21tYW5kXG4gKiB0ZW1wbGF0ZSBpcyBleHBhbmRlZCAoe1NQRUNfRk9MREVSfSB7U1RPUllfSUR9IHtJTlZPS0VfV0lUSH0ge1dPUktUUkVFfSksXG4gKiBydW4gd2l0aCBjd2QgPSB0aGUgY2xhaW0gd29ya3RyZWUsIGFuZCByZWNlaXZlcyB0d28gZXh0cmEgZW52IHZhcnM6XG4gKiAgIE9BSFNfU1BFQ19GSUxFIFx1MjAxNCBhYnNvbHV0ZSBwYXRoIG9mIHRoZSBzdG9yeSBzcGVjIGZpbGUgaW5zaWRlIHRoZSB3b3JrdHJlZVxuICogICBPQUhTX1NUT1JZX0lEICBcdTIwMTQgdGhlIHdvcmsgaXRlbSBleHRlcm5hbEtleSAoc3Rvcmllcy55YW1sIGlkKVxuICovXG4vLyBQaGFzZSA0IChyb2FkbWFwIFx1MDBBNzEuNCk6IHRoZSBkZXRlcm1pbmlzdGljIGRvY3VtZW50IGxpbnQgZm9yIG5vbi1jb2RlIHdvcmsuXG5leHBvcnQgeyBsaW50RG9jLCB0eXBlIERvY0xpbnRSZXN1bHQsIHR5cGUgTGludERvY09wdGlvbnMgfSBmcm9tICcuL2RvY2xpbnQuanMnO1xuXG5pbXBvcnQgeyBzcGF3blN5bmMgfSBmcm9tICdub2RlOmNoaWxkX3Byb2Nlc3MnO1xuaW1wb3J0IHtcbiAgZXhpc3RzU3luYyxcbiAgbWtkaXJTeW5jLFxuICByZWFkZGlyU3luYyxcbiAgcmVhZEZpbGVTeW5jLFxuICBybVN5bmMsXG4gIHN0YXRTeW5jLFxuICB3cml0ZUZpbGVTeW5jLFxufSBmcm9tICdub2RlOmZzJztcbmltcG9ydCB7IGpvaW4sIHJlc29sdmUgfSBmcm9tICdub2RlOnBhdGgnO1xuaW1wb3J0IHsgcGFyc2UgYXMgcGFyc2VZYW1sIH0gZnJvbSAneWFtbCc7XG5pbXBvcnQgdHlwZSB7IE9haHNDbGllbnQgfSBmcm9tICdAb2Focy9jb250cmFjdHMnO1xuaW1wb3J0IHR5cGUgeyBCbG9ja2VkUmVhc29uLCBDbGFpbSwgRXZpZGVuY2UsIFdvcmtJdGVtLCBXb3JrSXRlbVN0YXRlIH0gZnJvbSAnQG9haHMvY29yZSc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgUnVubmVyT3B0aW9ucyB7XG4gIGNsaWVudDogT2Foc0NsaWVudDtcbiAgLyoqIEFic29sdXRlIHBhdGggb2YgdGhlIHRhcmdldCBwcm9qZWN0IGdpdCBjaGVja291dC4gKi9cbiAgcmVwb1BhdGg6IHN0cmluZztcbiAgLyoqIFNwZWMgZm9sZGVyIChyZWxhdGl2ZSB0byByZXBvIHJvb3QpIGhvbGRpbmcgU1BFQy5tZCArIHN0b3JpZXMueWFtbCArIHN0b3JpZXMvLiAqL1xuICBzcGVjRm9sZGVyOiBzdHJpbmc7XG4gIC8qKlxuICAgKiBDb2RpbmctYWdlbnQgY29tbWFuZCB0ZW1wbGF0ZS4gUGxhY2Vob2xkZXJzOiB7U1BFQ19GT0xERVJ9IHtTVE9SWV9JRH1cbiAgICoge0lOVk9LRV9XSVRIfSB7V09SS1RSRUV9LiBFeGVjdXRlZCB3aXRoIGN3ZCA9IHRoZSBjbGFpbSB3b3JrdHJlZS5cbiAgICovXG4gIGFnZW50Q21kOiBzdHJpbmc7XG4gIC8qKiBQb2xsIGludGVydmFsIGZvciB3b3JrTG9vcCAobXMpLiBEZWZhdWx0IDE1XzAwMC4gKi9cbiAgcG9sbE1zPzogbnVtYmVyO1xuICAvKiogQmluYXJpZXMgcGlubmVkIHZlcmlmaWNhdGlvbiBjb21tYW5kcyBtYXkgc3RhcnQgd2l0aC4gKi9cbiAgdmVyaWZpY2F0aW9uQWxsb3dsaXN0Pzogc3RyaW5nW107XG4gIC8qKiBHaXQgcmVtb3RlIHRvIHB1c2ggY2xhaW0gYnJhbmNoZXMgdG8uIERlZmF1bHQgJ29yaWdpbicuICovXG4gIHJlbW90ZT86IHN0cmluZztcbiAgLyoqIFRFU1QgT05MWTogZGllIGF0IGEgc3BlY2lmaWMgcG9pbnQgdG8gZXhlcmNpc2UgY3Jhc2ggcmVjb3ZlcnkuICovXG4gIGZhaWxwb2ludD86ICdiZWZvcmVfcmVwb3J0JztcbiAgLyoqIE1heCB3YWxsIHRpbWUgZm9yIG9uZSBhZ2VudCBpbnZvY2F0aW9uIChtcykuIERlZmF1bHQgMzAgbWludXRlcy4gKi9cbiAgYWdlbnRUaW1lb3V0TXM/OiBudW1iZXI7XG4gIC8qKiBFeHRyYSBlbnZpcm9ubWVudCB2YXJpYWJsZXMgcGFzc2VkIHRvIHRoZSBhZ2VudCBpbnZvY2F0aW9uLiAqL1xuICBhZ2VudEVudj86IFJlY29yZDxzdHJpbmcsIHN0cmluZz47XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUnVuT25jZVJlc3VsdCB7XG4gIGRpc3BhdGNoZWQ6IGJvb2xlYW47XG4gIHdvcmtJdGVtSWQ/OiBzdHJpbmc7XG4gIGV4dGVybmFsS2V5Pzogc3RyaW5nO1xuICBvdXRjb21lPzogJ2luX3JldmlldycgfCAnYmxvY2tlZCcgfCAnYWRvcHRlZF9pbl9yZXZpZXcnIHwgJ2NyYXNoZWQnO1xuICBkZXRhaWxzPzogc3RyaW5nO1xuICAvKiogQ2xhaW0gdGFrZW4gYnkgdGhpcyBydW4gKGJyYW5jaCBpcyBgY2xhaW0vPGNsYWltSWQ+YCkuICovXG4gIGNsYWltSWQ/OiBzdHJpbmc7XG4gIC8qKiBSYXcgZXZpZGVuY2Ugc3VibWl0dGVkIGR1cmluZyB0aGlzIHJ1biwgaW4gc3VibWlzc2lvbiBvcmRlci4gKi9cbiAgZXZpZGVuY2U/OiBFdmlkZW5jZVtdO1xufVxuXG4vKiogQmluYXJpZXMgYSBwaW5uZWQgdmVyaWZpY2F0aW9uIGNvbW1hbmQgbWF5IHN0YXJ0IHdpdGggKGZpcnN0IHRva2VuKS4gKi9cbmV4cG9ydCBjb25zdCBERUZBVUxUX1ZFUklGSUNBVElPTl9BTExPV0xJU1Q6IHJlYWRvbmx5IHN0cmluZ1tdID0gW1xuICAnbm9kZScsXG4gICducG0nLFxuICAncG5wbScsXG4gICducHgnLFxuICAncHl0ZXN0JyxcbiAgJ3B5dGhvbjMnLFxuICAnc2gnLFxuICAnYmFzaCcsXG4gICdnaXQnLFxuXTtcblxuLyoqIE1hcmtlciBkcm9wcGVkIGluIGV2ZXJ5IGNsYWltIHdvcmt0cmVlIHNvIGEgbGF0ZXIgY2xhaW0gY2FuIG1hcCBpdCBiYWNrLiAqL1xuY29uc3QgTUFSS0VSX0ZJTEUgPSAnLm9haHMtd29yay1pdGVtJztcblxuLyoqIERCIHN0YXRlIFx1MjE5MiBzcGVjLWZpbGUgZnJvbnRtYXR0ZXIgdm9jYWJ1bGFyeSAoZGV2LWF1dG8gZmlsZSBkaWFsZWN0KS4gKi9cbmNvbnN0IEVOVFJZX1NUQVRVUzogUmVhZG9ubHk8UGFydGlhbDxSZWNvcmQ8V29ya0l0ZW1TdGF0ZSwgc3RyaW5nPj4+ID0ge1xuICByZWFkeV9mb3JfZGV2OiAncmVhZHktZm9yLWRldicsXG4gIGluX3Byb2dyZXNzOiAnaW4tcHJvZ3Jlc3MnLFxuICBpbl9yZXZpZXc6ICdpbi1yZXZpZXcnLFxufTtcblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBnaXQgcGx1bWJpbmcgKGNoaWxkX3Byb2Nlc3Mgb25seSBcdTIwMTQgbm8gZXh0ZXJuYWwgZGVwcylcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4vKiogUnVuIGEgZ2l0IGNvbW1hbmQ7IHRocm93cyBvbiBub24temVybyBleGl0OyByZXR1cm5zIHRyaW1tZWQgc3Rkb3V0LiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdpdChhcmdzOiBzdHJpbmdbXSwgY3dkOiBzdHJpbmcpOiBzdHJpbmcge1xuICBjb25zdCByZXN1bHQgPSBzcGF3blN5bmMoJ2dpdCcsIGFyZ3MsIHsgY3dkLCBlbmNvZGluZzogJ3V0ZjgnIH0pO1xuICBpZiAocmVzdWx0LmVycm9yKSB0aHJvdyByZXN1bHQuZXJyb3I7XG4gIGlmIChyZXN1bHQuc3RhdHVzICE9PSAwKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgYGdpdCAke2FyZ3Muam9pbignICcpfSBmYWlsZWQgd2l0aCBleGl0ICR7U3RyaW5nKHJlc3VsdC5zdGF0dXMpfTogJHtyZXN1bHQuc3RkZXJyLnRyaW0oKX1gLFxuICAgICk7XG4gIH1cbiAgcmV0dXJuIHJlc3VsdC5zdGRvdXQudHJpbSgpO1xufVxuXG4vKipcbiAqIEtlZXAgcnVubmVyIGJvb2trZWVwaW5nIG91dCBvZiBhZ2VudCBjb21taXRzOiB0aGUgbWFya2VyIGZpbGUgYW5kIHRoZVxuICogd29ya3RyZWUgcm9vdCBhcmUgYWRkZWQgdG8gJEdJVF9DT01NT05fRElSL2luZm8vZXhjbHVkZSAoc2hhcmVkIGJ5IGFsbFxuICogd29ya3RyZWVzKSwgc28gYW4gYWdlbnQncyBgZ2l0IGFkZCAtQWAgbmV2ZXIgcGlja3MgdGhlbSB1cC5cbiAqL1xuZnVuY3Rpb24gZW5zdXJlR2l0RXhjbHVkZXMocmVwb1BhdGg6IHN0cmluZyk6IHZvaWQge1xuICBjb25zdCBnaXREaXIgPSBqb2luKHJlcG9QYXRoLCAnLmdpdCcpO1xuICB0cnkge1xuICAgIGlmICghc3RhdFN5bmMoZ2l0RGlyKS5pc0RpcmVjdG9yeSgpKSByZXR1cm47IC8vIHJlcG9QYXRoIGlzIGl0c2VsZiBhIHdvcmt0cmVlIFx1MjAxNCBza2lwXG4gIH0gY2F0Y2gge1xuICAgIHJldHVybjtcbiAgfVxuICBjb25zdCBpbmZvRGlyID0gam9pbihnaXREaXIsICdpbmZvJyk7XG4gIG1rZGlyU3luYyhpbmZvRGlyLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcbiAgY29uc3QgZXhjbHVkZVBhdGggPSBqb2luKGluZm9EaXIsICdleGNsdWRlJyk7XG4gIGNvbnN0IGN1cnJlbnQgPSBleGlzdHNTeW5jKGV4Y2x1ZGVQYXRoKSA/IHJlYWRGaWxlU3luYyhleGNsdWRlUGF0aCwgJ3V0ZjgnKSA6ICcnO1xuICBjb25zdCB3YW50ZWQgPSBbJy5vYWhzLycsIE1BUktFUl9GSUxFXTtcbiAgY29uc3QgaGF2ZSA9IG5ldyBTZXQoY3VycmVudC5zcGxpdCgnXFxuJykubWFwKChsaW5lKSA9PiBsaW5lLnRyaW0oKSkpO1xuICBjb25zdCBtaXNzaW5nID0gd2FudGVkLmZpbHRlcigobGluZSkgPT4gIWhhdmUuaGFzKGxpbmUpKTtcbiAgaWYgKG1pc3NpbmcubGVuZ3RoID09PSAwKSByZXR1cm47XG4gIGNvbnN0IHByZWZpeCA9IGN1cnJlbnQgPT09ICcnIHx8IGN1cnJlbnQuZW5kc1dpdGgoJ1xcbicpID8gY3VycmVudCA6IGAke2N1cnJlbnR9XFxuYDtcbiAgd3JpdGVGaWxlU3luYyhleGNsdWRlUGF0aCwgYCR7cHJlZml4fSR7bWlzc2luZy5qb2luKCdcXG4nKX1cXG5gLCAndXRmOCcpO1xufVxuXG5mdW5jdGlvbiByZW1vdmVXb3JrdHJlZShkaXI6IHN0cmluZywgcmVwb1BhdGg6IHN0cmluZyk6IHZvaWQge1xuICB0cnkge1xuICAgIGdpdChbJ3dvcmt0cmVlJywgJ3JlbW92ZScsICctLWZvcmNlJywgZGlyXSwgcmVwb1BhdGgpO1xuICB9IGNhdGNoIHtcbiAgICB0cnkge1xuICAgICAgcm1TeW5jKGRpciwgeyByZWN1cnNpdmU6IHRydWUsIGZvcmNlOiB0cnVlIH0pO1xuICAgICAgZ2l0KFsnd29ya3RyZWUnLCAncHJ1bmUnXSwgcmVwb1BhdGgpO1xuICAgIH0gY2F0Y2gge1xuICAgICAgLyogYmVzdCBlZmZvcnQgXHUyMDE0IGEgbGVmdG92ZXIgZGlyIGlzIHJlLWRldGVjdGVkIGFzIGEgc3RhbGUgd29ya3RyZWUgKi9cbiAgICB9XG4gIH1cbn1cblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBXb3JrdHJlZSBtYXJrZXIgKGNyYXNoLXJlY292ZXJ5IGJvb2trZWVwaW5nKVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbmludGVyZmFjZSBXb3JrdHJlZU1hcmtlciB7XG4gIHdvcmtJdGVtSWQ6IHN0cmluZztcbiAgY2xhaW1JZDogc3RyaW5nO1xuICBiYXNlbGluZTogc3RyaW5nO1xuICAvKiogSG93IG1hbnkgdGltZXMgYW4gYWdlbnQgd2FzIGludm9rZWQgaW5zaWRlIHRoaXMgd29ya3RyZWUuICovXG4gIGludm9jYXRpb25zOiBudW1iZXI7XG59XG5cbmZ1bmN0aW9uIHdyaXRlTWFya2VyKHdvcmt0cmVlRGlyOiBzdHJpbmcsIG1hcmtlcjogV29ya3RyZWVNYXJrZXIpOiB2b2lkIHtcbiAgd3JpdGVGaWxlU3luYyhqb2luKHdvcmt0cmVlRGlyLCBNQVJLRVJfRklMRSksIGAke0pTT04uc3RyaW5naWZ5KG1hcmtlciwgbnVsbCwgMil9XFxuYCwgJ3V0ZjgnKTtcbn1cblxuZnVuY3Rpb24gcmVhZE1hcmtlcih3b3JrdHJlZURpcjogc3RyaW5nKTogV29ya3RyZWVNYXJrZXIgfCBudWxsIHtcbiAgY29uc3QgcGF0aCA9IGpvaW4od29ya3RyZWVEaXIsIE1BUktFUl9GSUxFKTtcbiAgaWYgKCFleGlzdHNTeW5jKHBhdGgpKSByZXR1cm4gbnVsbDtcbiAgdHJ5IHtcbiAgICBjb25zdCByYXcgPSBKU09OLnBhcnNlKHJlYWRGaWxlU3luYyhwYXRoLCAndXRmOCcpKSBhcyBQYXJ0aWFsPFdvcmt0cmVlTWFya2VyPjtcbiAgICBpZiAodHlwZW9mIHJhdy53b3JrSXRlbUlkICE9PSAnc3RyaW5nJyB8fCB0eXBlb2YgcmF3LmJhc2VsaW5lICE9PSAnc3RyaW5nJykgcmV0dXJuIG51bGw7XG4gICAgcmV0dXJuIHtcbiAgICAgIHdvcmtJdGVtSWQ6IHJhdy53b3JrSXRlbUlkLFxuICAgICAgY2xhaW1JZDogdHlwZW9mIHJhdy5jbGFpbUlkID09PSAnc3RyaW5nJyA/IHJhdy5jbGFpbUlkIDogJycsXG4gICAgICBiYXNlbGluZTogcmF3LmJhc2VsaW5lLFxuICAgICAgaW52b2NhdGlvbnM6IHR5cGVvZiByYXcuaW52b2NhdGlvbnMgPT09ICdudW1iZXInID8gcmF3Lmludm9jYXRpb25zIDogMCxcbiAgICB9O1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufVxuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIFNwZWMgZmlsZSByZWFkaW5nIChmcm9udG1hdHRlciArIEhBTFQgcmVwb3J0KVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbmludGVyZmFjZSBTcGVjUmVwb3J0IHtcbiAgc3RhdHVzOiBzdHJpbmcgfCBudWxsO1xuICBibG9ja2luZ0NvbmRpdGlvbjogc3RyaW5nIHwgbnVsbDtcbiAgYXV0b1J1blJlc3VsdDogc3RyaW5nIHwgbnVsbDtcbn1cblxuZnVuY3Rpb24gc3BsaXRGcm9udG1hdHRlcihyYXc6IHN0cmluZyk6IHsgZGF0YTogUmVjb3JkPHN0cmluZywgdW5rbm93bj47IGJvZHk6IHN0cmluZyB9IHtcbiAgaWYgKCFyYXcuc3RhcnRzV2l0aCgnLS0tJykpIHJldHVybiB7IGRhdGE6IHt9LCBib2R5OiByYXcgfTtcbiAgY29uc3QgY2xvc2UgPSByYXcuaW5kZXhPZignXFxuLS0tJywgMyk7XG4gIGlmIChjbG9zZSA9PT0gLTEpIHJldHVybiB7IGRhdGE6IHt9LCBib2R5OiByYXcgfTtcbiAgY29uc3QgZmlyc3ROZXdsaW5lID0gcmF3LmluZGV4T2YoJ1xcbicpO1xuICBjb25zdCBibG9jayA9IHJhdy5zbGljZShmaXJzdE5ld2xpbmUgKyAxLCBjbG9zZSk7XG4gIGNvbnN0IGJvZHlTdGFydCA9IHJhdy5pbmRleE9mKCdcXG4nLCBjbG9zZSArIDEpO1xuICBjb25zdCBib2R5ID0gYm9keVN0YXJ0ID09PSAtMSA/ICcnIDogcmF3LnNsaWNlKGJvZHlTdGFydCArIDEpO1xuICBsZXQgZGF0YTogdW5rbm93biA9IHt9O1xuICB0cnkge1xuICAgIGRhdGEgPSBwYXJzZVlhbWwoYmxvY2spO1xuICB9IGNhdGNoIHtcbiAgICBkYXRhID0ge307XG4gIH1cbiAgY29uc3QgcmVjb3JkID1cbiAgICB0eXBlb2YgZGF0YSA9PT0gJ29iamVjdCcgJiYgZGF0YSAhPT0gbnVsbCAmJiAhQXJyYXkuaXNBcnJheShkYXRhKVxuICAgICAgPyAoZGF0YSBhcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPilcbiAgICAgIDoge307XG4gIHJldHVybiB7IGRhdGE6IHJlY29yZCwgYm9keSB9O1xufVxuXG4vKiogVmVyYmF0aW0gJyMjIEF1dG8gUnVuIFJlc3VsdCcgc2VjdGlvbiAoaGVhZGluZyBpbmNsdWRlZCksIHVwIHRvIHRoZSBuZXh0IEgyLiAqL1xuZnVuY3Rpb24gZXh0cmFjdEF1dG9SdW5SZXN1bHQoYm9keTogc3RyaW5nKTogc3RyaW5nIHwgbnVsbCB7XG4gIGNvbnN0IGxpbmVzID0gYm9keS5zcGxpdCgnXFxuJyk7XG4gIGNvbnN0IHN0YXJ0ID0gbGluZXMuZmluZEluZGV4KChsaW5lKSA9PiAvXiMjXFxzK2F1dG8gcnVuIHJlc3VsdFxccyokL2kudGVzdChsaW5lLnRyaW0oKSkpO1xuICBpZiAoc3RhcnQgPT09IC0xKSByZXR1cm4gbnVsbDtcbiAgbGV0IGVuZCA9IGxpbmVzLmxlbmd0aDtcbiAgZm9yIChsZXQgaSA9IHN0YXJ0ICsgMTsgaSA8IGxpbmVzLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgY29uc3QgbGluZSA9IGxpbmVzW2ldO1xuICAgIGlmIChsaW5lICE9PSB1bmRlZmluZWQgJiYgL14jI1xccysvLnRlc3QobGluZSkpIHtcbiAgICAgIGVuZCA9IGk7XG4gICAgICBicmVhaztcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGxpbmVzLnNsaWNlKHN0YXJ0LCBlbmQpLmpvaW4oJ1xcbicpLnRyaW1FbmQoKTtcbn1cblxuZnVuY3Rpb24gcmVhZFNwZWNSZXBvcnQoc3BlY0Fic1BhdGg6IHN0cmluZyk6IFNwZWNSZXBvcnQge1xuICBpZiAoIWV4aXN0c1N5bmMoc3BlY0Fic1BhdGgpKSB7XG4gICAgcmV0dXJuIHsgc3RhdHVzOiBudWxsLCBibG9ja2luZ0NvbmRpdGlvbjogbnVsbCwgYXV0b1J1blJlc3VsdDogbnVsbCB9O1xuICB9XG4gIGNvbnN0IHsgZGF0YSwgYm9keSB9ID0gc3BsaXRGcm9udG1hdHRlcihyZWFkRmlsZVN5bmMoc3BlY0Fic1BhdGgsICd1dGY4JykpO1xuICBjb25zdCBzdGF0dXNSYXcgPSBkYXRhWydzdGF0dXMnXTtcbiAgY29uc3Qgc3RhdHVzID1cbiAgICB0eXBlb2Ygc3RhdHVzUmF3ID09PSAnc3RyaW5nJyA/IHN0YXR1c1JhdyA6IHN0YXR1c1JhdyAhPSBudWxsID8gU3RyaW5nKHN0YXR1c1JhdykgOiBudWxsO1xuICBjb25zdCBhdXRvUnVuUmVzdWx0ID0gZXh0cmFjdEF1dG9SdW5SZXN1bHQoYm9keSk7XG4gIGxldCBibG9ja2luZ0NvbmRpdGlvbiA9XG4gICAgdHlwZW9mIGRhdGFbJ2Jsb2NraW5nX2NvbmRpdGlvbiddID09PSAnc3RyaW5nJyA/IGRhdGFbJ2Jsb2NraW5nX2NvbmRpdGlvbiddIDogbnVsbDtcbiAgaWYgKGJsb2NraW5nQ29uZGl0aW9uID09PSBudWxsICYmIGF1dG9SdW5SZXN1bHQgIT09IG51bGwpIHtcbiAgICBjb25zdCBtYXRjaCA9IC9eYmxvY2tpbmcgY29uZGl0aW9uOlxccyooLispJC9pbS5leGVjKGF1dG9SdW5SZXN1bHQpO1xuICAgIGJsb2NraW5nQ29uZGl0aW9uID0gbWF0Y2g/LlsxXT8udHJpbSgpID8/IG51bGw7XG4gIH1cbiAgcmV0dXJuIHsgc3RhdHVzLCBibG9ja2luZ0NvbmRpdGlvbiwgYXV0b1J1blJlc3VsdCB9O1xufVxuXG4vKiogUmV3cml0ZSAob3IgaW5zZXJ0KSB0aGUgZnJvbnRtYXR0ZXIgYHN0YXR1czpgIGxpbmUsIHByZXNlcnZpbmcgZXZlcnl0aGluZyBlbHNlLiAqL1xuZnVuY3Rpb24gc2V0RnJvbnRtYXR0ZXJTdGF0dXMoc3BlY0Fic1BhdGg6IHN0cmluZywgc3RhdHVzOiBzdHJpbmcpOiB2b2lkIHtcbiAgY29uc3QgcmF3ID0gcmVhZEZpbGVTeW5jKHNwZWNBYnNQYXRoLCAndXRmOCcpO1xuICBpZiAocmF3LnN0YXJ0c1dpdGgoJy0tLScpKSB7XG4gICAgY29uc3QgY2xvc2UgPSByYXcuaW5kZXhPZignXFxuLS0tJywgMyk7XG4gICAgaWYgKGNsb3NlICE9PSAtMSkge1xuICAgICAgY29uc3QgaGVhZCA9IHJhdy5zbGljZSgwLCBjbG9zZSk7XG4gICAgICBjb25zdCByZXN0ID0gcmF3LnNsaWNlKGNsb3NlKTtcbiAgICAgIGNvbnN0IHJlcGxhY2VkID0gL15zdGF0dXM6LiokL20udGVzdChoZWFkKVxuICAgICAgICA/IGhlYWQucmVwbGFjZSgvXnN0YXR1czouKiQvbSwgYHN0YXR1czogJHtzdGF0dXN9YClcbiAgICAgICAgOiBgJHtoZWFkfVxcbnN0YXR1czogJHtzdGF0dXN9YDtcbiAgICAgIHdyaXRlRmlsZVN5bmMoc3BlY0Fic1BhdGgsIHJlcGxhY2VkICsgcmVzdCwgJ3V0ZjgnKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gIH1cbiAgd3JpdGVGaWxlU3luYyhzcGVjQWJzUGF0aCwgYC0tLVxcbnN0YXR1czogJHtzdGF0dXN9XFxuLS0tXFxuJHtyYXd9YCwgJ3V0ZjgnKTtcbn1cblxuZnVuY3Rpb24gbm9ybWFsaXplU3RhdHVzKHN0YXR1czogc3RyaW5nIHwgbnVsbCk6IHN0cmluZyB8IG51bGwge1xuICBpZiAoc3RhdHVzID09PSBudWxsKSByZXR1cm4gbnVsbDtcbiAgY29uc3QgZmxhdCA9IHN0YXR1cy50cmltKCkudG9Mb3dlckNhc2UoKS5yZXBsYWNlQWxsKCctJywgJ18nKTtcbiAgcmV0dXJuIGZsYXQgPT09ICdyZXZpZXcnID8gJ2luX3JldmlldycgOiBmbGF0O1xufVxuXG4vKiogZGV2LWF1dG8gSEFMVCBibG9ja2luZyBjb25kaXRpb24gXHUyMTkyIEJMT0NLRURfUkVBU09OUyB0YXhvbm9teSAoZGVmYXVsdCAnb3RoZXInKS4gKi9cbmZ1bmN0aW9uIG1hcEJsb2NraW5nQ29uZGl0aW9uKGNvbmRpdGlvbjogc3RyaW5nIHwgbnVsbCk6IEJsb2NrZWRSZWFzb24ge1xuICBpZiAoY29uZGl0aW9uID09PSBudWxsKSByZXR1cm4gJ290aGVyJztcbiAgY29uc3QgYyA9IGNvbmRpdGlvbi50b0xvd2VyQ2FzZSgpO1xuICBpZiAoYy5pbmNsdWRlcygncmV2aWV3IHJlcGFpciBsb29wIGV4Y2VlZGVkJykpIHJldHVybiAncmV2aWV3X25vbl9jb252ZXJnZW5jZSc7XG4gIGlmIChjLmluY2x1ZGVzKCd1bmNsZWFyIGludGVudCcpKSByZXR1cm4gJ3VuY2xlYXJfaW50ZW50JztcbiAgaWYgKGMuaW5jbHVkZXMoJ25vIHN0b3JpZXMueWFtbCcpKSByZXR1cm4gJ25vX3N0b3JpZXNfeWFtbF9mb3VuZCc7XG4gIGlmIChjLmluY2x1ZGVzKCdhbWJpZ3VvdXMgc3RvcnkgZmlsZSBtYXRjaCcpKSByZXR1cm4gJ2FtYmlndW91c19zdG9yeV9maWxlX21hdGNoJztcbiAgaWYgKGMuaW5jbHVkZXMoJ25vIHN1YmFnZW50cycpKSByZXR1cm4gJ25vX3N1YmFnZW50cyc7XG4gIHJldHVybiAnb3RoZXInO1xufVxuXG5mdW5jdGlvbiBpc1JlbW90ZUVycm9yKGVycm9yOiB1bmtub3duLCBuYW1lOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgcmV0dXJuIChcbiAgICB0eXBlb2YgZXJyb3IgPT09ICdvYmplY3QnICYmXG4gICAgZXJyb3IgIT09IG51bGwgJiZcbiAgICAoZXJyb3IgYXMgeyBlcnJvck5hbWU/OiB1bmtub3duIH0pLmVycm9yTmFtZSA9PT0gbmFtZVxuICApO1xufVxuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIFN0ZXBzIDZcdTIwMTM5OiBtZWFzdXJlLCBzdWJtaXQgcmF3IGV2aWRlbmNlLCByb3V0ZSBieSBIQUxUIHN0YXR1c1xuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbmludGVyZmFjZSBGaW5pc2hBcmdzIHtcbiAgY2xpZW50OiBPYWhzQ2xpZW50O1xuICB3b3JrSXRlbTogV29ya0l0ZW07XG4gIGNsYWltOiBDbGFpbTtcbiAgLyoqIERpcmVjdG9yeSBob2xkaW5nIHRoZSBydW4ncyBmaWxlcyAoZnJlc2ggd29ya3RyZWUsIG9yIHRoZSBhZG9wdGVkIG9uZSkuICovXG4gIHdvcmtEaXI6IHN0cmluZztcbiAgLyoqIFNwZWMgZmlsZSBwYXRoIHJlbGF0aXZlIHRvIHRoZSByZXBvIHJvb3QuICovXG4gIHNwZWNSZWw6IHN0cmluZztcbiAgYmFzZWxpbmU6IHN0cmluZztcbiAgYnJhbmNoOiBzdHJpbmc7XG4gIHJlcG9QYXRoOiBzdHJpbmc7XG4gIHJlbW90ZTogc3RyaW5nO1xuICBhbGxvd2xpc3Q6IHJlYWRvbmx5IHN0cmluZ1tdO1xuICAvKiogbnVsbCB3aGVuIGFkb3B0aW5nICh0aGUgYWdlbnQgd2FzIGludm9rZWQgYnkgdGhlIGNyYXNoZWQgcnVuKS4gKi9cbiAgYWdlbnRFeGl0Q29kZTogbnVtYmVyIHwgbnVsbDtcbiAgc3VibWl0OiAoa2luZDogRXZpZGVuY2VbJ2tpbmQnXSwgcGF5bG9hZDogUmVjb3JkPHN0cmluZywgdW5rbm93bj4pID0+IFByb21pc2U8dm9pZD47XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGZpbmlzaFJ1bihhcmdzOiBGaW5pc2hBcmdzKTogUHJvbWlzZTwnaW5fcmV2aWV3JyB8ICdibG9ja2VkJz4ge1xuICBjb25zdCB7IGNsaWVudCwgd29ya0l0ZW0sIGNsYWltIH0gPSBhcmdzO1xuXG4gIC8vIDYgXHUyMDE0IHBhcnNlIEhBTFQ6IGZyb250bWF0dGVyIHN0YXR1cyArIHZlcmJhdGltIEF1dG8gUnVuIFJlc3VsdC5cbiAgY29uc3Qgc3BlYyA9IHJlYWRTcGVjUmVwb3J0KGpvaW4oYXJncy53b3JrRGlyLCBhcmdzLnNwZWNSZWwpKTtcbiAgYXdhaXQgYXJncy5zdWJtaXQoJ2hhbHRfcmVwb3J0Jywge1xuICAgIHN0YXR1czogc3BlYy5zdGF0dXMsXG4gICAgYmxvY2tpbmdDb25kaXRpb246IHNwZWMuYmxvY2tpbmdDb25kaXRpb24sXG4gICAgYXV0b1J1blJlc3VsdDogc3BlYy5hdXRvUnVuUmVzdWx0LFxuICAgIGFnZW50RXhpdENvZGU6IGFyZ3MuYWdlbnRFeGl0Q29kZSxcbiAgfSk7XG5cbiAgLy8gNyBcdTIwMTQgcGlubmVkIHZlcmlmaWNhdGlvbiBvbmx5OyB0aGUgYWxsb3dsaXN0IGdhdGVzIHdoYXQgZXZlciBnZXRzIGV4ZWN1dGVkLlxuICBmb3IgKGNvbnN0IGNvbW1hbmQgb2Ygd29ya0l0ZW0ucGlubmVkVmVyaWZpY2F0aW9uID8/IFtdKSB7XG4gICAgY29uc3QgYmluYXJ5ID0gY29tbWFuZC50cmltKCkuc3BsaXQoL1xccysvKVswXSA/PyAnJztcbiAgICBpZiAoIWFyZ3MuYWxsb3dsaXN0LmluY2x1ZGVzKGJpbmFyeSkpIHtcbiAgICAgIGF3YWl0IGFyZ3Muc3VibWl0KCd0ZXN0X3J1bicsIHsgY29tbWFuZCwgZXhpdENvZGU6IC0xLCByZWZ1c2VkOiB0cnVlIH0pO1xuICAgICAgY29udGludWU7XG4gICAgfVxuICAgIGNvbnN0IHJ1biA9IHNwYXduU3luYygnYmFzaCcsIFsnLWMnLCBjb21tYW5kXSwge1xuICAgICAgY3dkOiBhcmdzLndvcmtEaXIsXG4gICAgICBlbmNvZGluZzogJ3V0ZjgnLFxuICAgICAgdGltZW91dDogMTAgKiA2MCAqIDEwMDAsXG4gICAgfSk7XG4gICAgYXdhaXQgYXJncy5zdWJtaXQoJ3Rlc3RfcnVuJywgeyBjb21tYW5kLCBleGl0Q29kZTogcnVuLnN0YXR1cyA/PyAtMSB9KTtcbiAgfVxuXG4gIC8vIDggXHUyMDE0IGRpZmYgKyBwdXNoICsgY29tbWl0IGV2aWRlbmNlIChtZWFzdXJlZCwgbmV2ZXIganVkZ2VkIGhlcmUpLlxuICBjb25zdCBmaW5hbCA9IGdpdChbJ3Jldi1wYXJzZScsICdIRUFEJ10sIGFyZ3Mud29ya0Rpcik7XG4gIGNvbnN0IHNob3J0c3RhdCA9XG4gICAgZmluYWwgPT09IGFyZ3MuYmFzZWxpbmVcbiAgICAgID8gJydcbiAgICAgIDogZ2l0KFsnZGlmZicsICctLXNob3J0c3RhdCcsIGAke2FyZ3MuYmFzZWxpbmV9Li4ke2ZpbmFsfWBdLCBhcmdzLndvcmtEaXIpO1xuICBjb25zdCBmaWxlc0NoYW5nZWQgPSBOdW1iZXIoLyhcXGQrKSBmaWxlcz8gY2hhbmdlZC8uZXhlYyhzaG9ydHN0YXQpPy5bMV0gPz8gJzAnKTtcbiAgYXdhaXQgYXJncy5zdWJtaXQoJ2dpdF9kaWZmJywge1xuICAgIGJhc2VsaW5lOiBhcmdzLmJhc2VsaW5lLFxuICAgIGZpbmFsLFxuICAgIGZpbGVzQ2hhbmdlZCxcbiAgICBub25FbXB0eTogZmlsZXNDaGFuZ2VkID4gMCxcbiAgICBicmFuY2g6IGFyZ3MuYnJhbmNoLFxuICB9KTtcblxuICBnaXQoWydwdXNoJywgYXJncy5yZW1vdGUsIGFyZ3MuYnJhbmNoXSwgYXJncy5yZXBvUGF0aCk7XG4gIGNvbnN0IGxzUmVtb3RlID0gZ2l0KFsnbHMtcmVtb3RlJywgYXJncy5yZW1vdGUsIGByZWZzL2hlYWRzLyR7YXJncy5icmFuY2h9YF0sIGFyZ3MucmVwb1BhdGgpO1xuICBhd2FpdCBhcmdzLnN1Ym1pdCgnY29tbWl0Jywge1xuICAgIHNoYTogZmluYWwsXG4gICAgYnJhbmNoOiBhcmdzLmJyYW5jaCxcbiAgICByZWFjaGFibGVPblJlbW90ZTogbHNSZW1vdGUuaW5jbHVkZXMoZmluYWwpLFxuICB9KTtcblxuICAvLyA5IFx1MjAxNCByb3V0aW5nOiB0aGUgZmlsZSBzYXlzIHdoYXQgdGhlIGFnZW50IGNsYWltczsgdGhlIGNvcmUgZGVjaWRlcy5cbiAgY29uc3Qgc3RhdHVzID0gbm9ybWFsaXplU3RhdHVzKHNwZWMuc3RhdHVzKTtcbiAgY29uc3QgdG9rZW4gPSBjbGFpbS5mZW5jaW5nVG9rZW47XG4gIGlmIChzdGF0dXMgPT09ICdibG9ja2VkJykge1xuICAgIGF3YWl0IGNsaWVudC5jYWxsKCdibG9ja190YXNrJywge1xuICAgICAgd29ya0l0ZW1JZDogd29ya0l0ZW0uaWQsXG4gICAgICByZWFzb246IG1hcEJsb2NraW5nQ29uZGl0aW9uKHNwZWMuYmxvY2tpbmdDb25kaXRpb24pLFxuICAgICAgZmVuY2luZ1Rva2VuOiB0b2tlbixcbiAgICB9KTtcbiAgICBhd2FpdCBjbGllbnQuY2FsbCgncmVsZWFzZV9jbGFpbScsIHsgY2xhaW1JZDogY2xhaW0uaWQsIHJlYXNvbjogJ3J1biBibG9ja2VkJyB9KTtcbiAgICByZXR1cm4gJ2Jsb2NrZWQnO1xuICB9XG4gIGNvbnN0IGhhc0NvbW1pdCA9IGZpbmFsICE9PSBhcmdzLmJhc2VsaW5lO1xuICBpZiAoc3RhdHVzID09PSAnZG9uZScgfHwgc3RhdHVzID09PSAnaW5fcmV2aWV3JyB8fCAoc3RhdHVzID09PSAnaW5fcHJvZ3Jlc3MnICYmIGhhc0NvbW1pdCkpIHtcbiAgICBhd2FpdCBjbGllbnQuY2FsbCgnYWR2YW5jZV9zdGF0ZScsIHtcbiAgICAgIHdvcmtJdGVtSWQ6IHdvcmtJdGVtLmlkLFxuICAgICAgdG86ICdpbl9yZXZpZXcnLFxuICAgICAgZmVuY2luZ1Rva2VuOiB0b2tlbixcbiAgICB9KTtcbiAgICBhd2FpdCBjbGllbnQuY2FsbCgncmVsZWFzZV9jbGFpbScsIHsgY2xhaW1JZDogY2xhaW0uaWQsIHJlYXNvbjogJ3J1biBmaW5pc2hlZCcgfSk7XG4gICAgcmV0dXJuICdpbl9yZXZpZXcnO1xuICB9XG4gIC8vIEFnZW50IGV4aXRlZCBub24temVybyB3aXRoIG5vIHJlYWRhYmxlIEhBTFQgc3RhdHVzLCBvciBhbiB1bmtub3duIHN0YXR1cy5cbiAgYXdhaXQgY2xpZW50LmNhbGwoJ2Jsb2NrX3Rhc2snLCB7IHdvcmtJdGVtSWQ6IHdvcmtJdGVtLmlkLCByZWFzb246ICdvdGhlcicsIGZlbmNpbmdUb2tlbjogdG9rZW4gfSk7XG4gIGF3YWl0IGNsaWVudC5jYWxsKCdyZWxlYXNlX2NsYWltJywge1xuICAgIGNsYWltSWQ6IGNsYWltLmlkLFxuICAgIHJlYXNvbjogJ3J1biBmYWlsZWQgd2l0aG91dCBhIHJlYWRhYmxlIEhBTFQnLFxuICB9KTtcbiAgcmV0dXJuICdibG9ja2VkJztcbn1cblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBDcmFzaC1yZWNvdmVyeSBzY2FuIChzdGVwIDEwKVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbmludGVyZmFjZSBXb3JrdHJlZVNjYW4ge1xuICBhZG9wdGFibGU6IHsgZGlyOiBzdHJpbmc7IGhlYWQ6IHN0cmluZzsgYmFzZWxpbmU6IHN0cmluZyB9IHwgbnVsbDtcbiAgd3JlY2tlZDogc3RyaW5nW107XG59XG5cbmZ1bmN0aW9uIHNjYW5PbGRXb3JrdHJlZXMocm9vdDogc3RyaW5nLCB3b3JrSXRlbUlkOiBzdHJpbmcsIHNwZWNSZWw6IHN0cmluZyk6IFdvcmt0cmVlU2NhbiB7XG4gIGNvbnN0IHNjYW46IFdvcmt0cmVlU2NhbiA9IHsgYWRvcHRhYmxlOiBudWxsLCB3cmVja2VkOiBbXSB9O1xuICBpZiAoIWV4aXN0c1N5bmMocm9vdCkpIHJldHVybiBzY2FuO1xuICBmb3IgKGNvbnN0IG5hbWUgb2YgcmVhZGRpclN5bmMocm9vdCkpIHtcbiAgICBjb25zdCBkaXIgPSBqb2luKHJvb3QsIG5hbWUpO1xuICAgIGNvbnN0IG1hcmtlciA9IHJlYWRNYXJrZXIoZGlyKTtcbiAgICBpZiAobWFya2VyID09PSBudWxsIHx8IG1hcmtlci53b3JrSXRlbUlkICE9PSB3b3JrSXRlbUlkKSBjb250aW51ZTtcbiAgICBsZXQgaGVhZDogc3RyaW5nIHwgbnVsbCA9IG51bGw7XG4gICAgdHJ5IHtcbiAgICAgIGhlYWQgPSBnaXQoWydyZXYtcGFyc2UnLCAnSEVBRCddLCBkaXIpO1xuICAgIH0gY2F0Y2gge1xuICAgICAgaGVhZCA9IG51bGw7XG4gICAgfVxuICAgIGNvbnN0IHN0YXR1cyA9IG5vcm1hbGl6ZVN0YXR1cyhyZWFkU3BlY1JlcG9ydChqb2luKGRpciwgc3BlY1JlbCkpLnN0YXR1cyk7XG4gICAgY29uc3QgdGVybWluYWwgPSBzdGF0dXMgPT09ICdkb25lJyB8fCBzdGF0dXMgPT09ICdpbl9yZXZpZXcnO1xuICAgIGlmIChzY2FuLmFkb3B0YWJsZSA9PT0gbnVsbCAmJiBoZWFkICE9PSBudWxsICYmIGhlYWQgIT09IG1hcmtlci5iYXNlbGluZSAmJiB0ZXJtaW5hbCkge1xuICAgICAgc2Nhbi5hZG9wdGFibGUgPSB7IGRpciwgaGVhZCwgYmFzZWxpbmU6IG1hcmtlci5iYXNlbGluZSB9O1xuICAgIH0gZWxzZSB7XG4gICAgICBzY2FuLndyZWNrZWQucHVzaChkaXIpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gc2Nhbjtcbn1cblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBydW5PbmNlIFx1MjAxNCBvbmUgZnVsbCBkaXNwYXRjaCBjeWNsZVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBydW5PbmNlKG9wdGlvbnM6IFJ1bm5lck9wdGlvbnMpOiBQcm9taXNlPFJ1bk9uY2VSZXN1bHQ+IHtcbiAgY29uc3QgeyBjbGllbnQgfSA9IG9wdGlvbnM7XG4gIGNvbnN0IHJlcG9QYXRoID0gcmVzb2x2ZShvcHRpb25zLnJlcG9QYXRoKTtcbiAgY29uc3QgcmVtb3RlID0gb3B0aW9ucy5yZW1vdGUgPz8gJ29yaWdpbic7XG4gIGNvbnN0IGFsbG93bGlzdCA9IG9wdGlvbnMudmVyaWZpY2F0aW9uQWxsb3dsaXN0ID8/IERFRkFVTFRfVkVSSUZJQ0FUSU9OX0FMTE9XTElTVDtcblxuICAvLyAxIFx1MjAxNCBwb2xsLiBPcmRlciBvZiB0aGUgQVBJIHJlc3BvbnNlID0gaW1wb3J0IG9yZGVyOyB0YWtlIHRoZSBmaXJzdC5cbiAgLy8gRmFsbGJhY2s6IGFuIGluX3Byb2dyZXNzIGl0ZW0gd2l0aCBubyBsaXZlIGNsYWltIGlzIGEgY3Jhc2hlZCBkaXNwYXRjaC5cbiAgY29uc3QgbGlzdFVuYmxvY2tlZCA9IGFzeW5jIChzdGF0ZTogV29ya0l0ZW1TdGF0ZSk6IFByb21pc2U8V29ya0l0ZW1bXT4gPT5cbiAgICAoYXdhaXQgY2xpZW50LmNhbGw8V29ya0l0ZW1bXT4oJ2xpc3Rfd29ya19pdGVtcycsIHsgc3RhdGUsIGNsYWltYWJsZTogdHJ1ZSB9KSkuZmlsdGVyKFxuICAgICAgKGl0ZW0pID0+IGl0ZW0uYmxvY2tlZFJlYXNvbiA9PT0gbnVsbCxcbiAgICApO1xuICBsZXQgY2FuZGlkYXRlcyA9IGF3YWl0IGxpc3RVbmJsb2NrZWQoJ3JlYWR5X2Zvcl9kZXYnKTtcbiAgaWYgKGNhbmRpZGF0ZXMubGVuZ3RoID09PSAwKSBjYW5kaWRhdGVzID0gYXdhaXQgbGlzdFVuYmxvY2tlZCgnaW5fcHJvZ3Jlc3MnKTtcbiAgY29uc3QgcGlja2VkID0gY2FuZGlkYXRlc1swXTtcbiAgaWYgKHBpY2tlZCA9PT0gdW5kZWZpbmVkKSByZXR1cm4geyBkaXNwYXRjaGVkOiBmYWxzZSB9O1xuXG4gIGxldCBjbGFpbTogQ2xhaW07XG4gIHRyeSB7XG4gICAgY2xhaW0gPSBhd2FpdCBjbGllbnQuY2FsbDxDbGFpbT4oJ2NsYWltX3Rhc2snLCB7IHdvcmtJdGVtSWQ6IHBpY2tlZC5pZCB9KTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBpZiAoaXNSZW1vdGVFcnJvcihlcnJvciwgJ0NvbmZsaWN0RXJyb3InKSkge1xuICAgICAgcmV0dXJuIHsgZGlzcGF0Y2hlZDogZmFsc2UsIGRldGFpbHM6IGBsb3N0IHRoZSBjbGFpbSByYWNlIGZvciAke3BpY2tlZC5leHRlcm5hbEtleX1gIH07XG4gICAgfVxuICAgIHRocm93IGVycm9yO1xuICB9XG5cbiAgY29uc3QgY29udGV4dCA9IGF3YWl0IGNsaWVudC5jYWxsPHsgd29ya0l0ZW06IFdvcmtJdGVtOyBlbnRyeVN0YXRlOiBXb3JrSXRlbVN0YXRlIH0+KFxuICAgICdnZXRfdGFza19jb250ZXh0JyxcbiAgICB7IHdvcmtJdGVtSWQ6IHBpY2tlZC5pZCB9LFxuICApO1xuICBjb25zdCB3b3JrSXRlbSA9IGNvbnRleHQud29ya0l0ZW07XG4gIGNvbnN0IHNwZWNSZWwgPSBqb2luKG9wdGlvbnMuc3BlY0ZvbGRlciwgd29ya0l0ZW0uc3BlY1BhdGgpO1xuICBjb25zdCBicmFuY2ggPSBgY2xhaW0vJHtjbGFpbS5pZH1gO1xuICBjb25zdCB3b3JrdHJlZXNSb290ID0gam9pbihyZXBvUGF0aCwgJy5vYWhzJywgJ3dvcmt0cmVlcycpO1xuICBjb25zdCBldmlkZW5jZTogRXZpZGVuY2VbXSA9IFtdO1xuXG4gIGNvbnN0IHN1Ym1pdCA9IGFzeW5jIChraW5kOiBFdmlkZW5jZVsna2luZCddLCBwYXlsb2FkOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPik6IFByb21pc2U8dm9pZD4gPT4ge1xuICAgIGNvbnN0IGl0ZW06IEV2aWRlbmNlID0geyBraW5kLCBwYXlsb2FkIH07XG4gICAgZXZpZGVuY2UucHVzaChpdGVtKTtcbiAgICBhd2FpdCBjbGllbnQuY2FsbCgnc3VibWl0X2V2aWRlbmNlJywge1xuICAgICAgd29ya0l0ZW1JZDogd29ya0l0ZW0uaWQsXG4gICAgICBldmlkZW5jZTogaXRlbSxcbiAgICAgIGZlbmNpbmdUb2tlbjogY2xhaW0uZmVuY2luZ1Rva2VuLFxuICAgIH0pO1xuICB9O1xuXG4gIGNvbnN0IGJhc2UgPSB7XG4gICAgZGlzcGF0Y2hlZDogdHJ1ZSxcbiAgICB3b3JrSXRlbUlkOiB3b3JrSXRlbS5pZCxcbiAgICBleHRlcm5hbEtleTogd29ya0l0ZW0uZXh0ZXJuYWxLZXksXG4gICAgY2xhaW1JZDogY2xhaW0uaWQsXG4gICAgZXZpZGVuY2UsXG4gIH0gc2F0aXNmaWVzIFJ1bk9uY2VSZXN1bHQ7XG5cbiAgY29uc3QgZmluaXNoQXJncyA9IHtcbiAgICBjbGllbnQsXG4gICAgd29ya0l0ZW0sXG4gICAgY2xhaW0sXG4gICAgc3BlY1JlbCxcbiAgICBicmFuY2gsXG4gICAgcmVwb1BhdGgsXG4gICAgcmVtb3RlLFxuICAgIGFsbG93bGlzdCxcbiAgICBzdWJtaXQsXG4gIH07XG5cbiAgLy8gMTAgXHUyMDE0IGFkb3B0IChjcmFzaCByZWNvdmVyeSk6IGluc3BlY3QgbGVmdG92ZXIgd29ya3RyZWVzIG9mIHRoaXMgd29yayBpdGVtLlxuICBjb25zdCBzY2FuID0gc2Nhbk9sZFdvcmt0cmVlcyh3b3JrdHJlZXNSb290LCB3b3JrSXRlbS5pZCwgc3BlY1JlbCk7XG4gIGlmIChzY2FuLmFkb3B0YWJsZSAhPT0gbnVsbCkge1xuICAgIGNvbnN0IHsgZGlyLCBoZWFkLCBiYXNlbGluZSB9ID0gc2Nhbi5hZG9wdGFibGU7XG4gICAgLy8gVGhlIG5ldyBjbGFpbSdzIGJyYW5jaCBwb2ludHMgYXQgdGhlIGNyYXNoZWQgcnVuJ3MgZmluaXNoZWQgSEVBRDsgdGhlXG4gICAgLy8gYWdlbnQgaXMgTk9UIHJlLWludm9rZWQgXHUyMDE0IHRoaXMgaXMgbGF0ZSBldmlkZW5jZSBzdWJtaXNzaW9uLCBub3QgcmVkby5cbiAgICBnaXQoWydicmFuY2gnLCBicmFuY2gsIGhlYWRdLCByZXBvUGF0aCk7XG4gICAgLy8gRW50cnktc3RhdGUgYWxpZ25tZW50IChuby1vcCB3aGVuIHRoZSBjcmFzaGVkIHJ1biBhbHJlYWR5IGFkdmFuY2VkKS5cbiAgICBhd2FpdCBjbGllbnQuY2FsbCgnYWR2YW5jZV9zdGF0ZScsIHtcbiAgICAgIHdvcmtJdGVtSWQ6IHdvcmtJdGVtLmlkLFxuICAgICAgdG86ICdpbl9wcm9ncmVzcycsXG4gICAgICBmZW5jaW5nVG9rZW46IGNsYWltLmZlbmNpbmdUb2tlbixcbiAgICB9KTtcbiAgICBpZiAob3B0aW9ucy5mYWlscG9pbnQgPT09ICdiZWZvcmVfcmVwb3J0Jykge1xuICAgICAgcmV0dXJuIHsgLi4uYmFzZSwgb3V0Y29tZTogJ2NyYXNoZWQnLCBkZXRhaWxzOiAnZmFpbHBvaW50IGJlZm9yZV9yZXBvcnQgKGFkb3B0IHBhdGgpJyB9O1xuICAgIH1cbiAgICBjb25zdCBvdXRjb21lID0gYXdhaXQgZmluaXNoUnVuKHtcbiAgICAgIC4uLmZpbmlzaEFyZ3MsXG4gICAgICB3b3JrRGlyOiBkaXIsXG4gICAgICBiYXNlbGluZSxcbiAgICAgIGFnZW50RXhpdENvZGU6IG51bGwsXG4gICAgfSk7XG4gICAgcmVtb3ZlV29ya3RyZWUoZGlyLCByZXBvUGF0aCk7XG4gICAgcmV0dXJuIHtcbiAgICAgIC4uLmJhc2UsXG4gICAgICBvdXRjb21lOiBvdXRjb21lID09PSAnaW5fcmV2aWV3JyA/ICdhZG9wdGVkX2luX3JldmlldycgOiBvdXRjb21lLFxuICAgICAgZGV0YWlsczogYGFkb3B0ZWQgZmluaXNoZWQgd29ya3RyZWUgJHtkaXJ9YCxcbiAgICB9O1xuICB9XG4gIGlmIChzY2FuLndyZWNrZWQubGVuZ3RoID4gMCkge1xuICAgIC8vIEEgd3JlY2tlZCB3b3JrdHJlZSAobm8gY29tbWl0IHBhc3QgYmFzZWxpbmUgLyBub24tdGVybWluYWwgc3RhdHVzKSBpc1xuICAgIC8vIGNsZWFuZWQ7IHRoZSBpdGVtIGJsb2NrcyBzdGFsZV93b3JrdHJlZSBmb3IgYSBodW1hbiBsb29rLlxuICAgIGZvciAoY29uc3QgZGlyIG9mIHNjYW4ud3JlY2tlZCkgcmVtb3ZlV29ya3RyZWUoZGlyLCByZXBvUGF0aCk7XG4gICAgYXdhaXQgY2xpZW50LmNhbGwoJ2Jsb2NrX3Rhc2snLCB7XG4gICAgICB3b3JrSXRlbUlkOiB3b3JrSXRlbS5pZCxcbiAgICAgIHJlYXNvbjogJ3N0YWxlX3dvcmt0cmVlJyxcbiAgICAgIGZlbmNpbmdUb2tlbjogY2xhaW0uZmVuY2luZ1Rva2VuLFxuICAgIH0pO1xuICAgIGF3YWl0IGNsaWVudC5jYWxsKCdyZWxlYXNlX2NsYWltJywgeyBjbGFpbUlkOiBjbGFpbS5pZCwgcmVhc29uOiAnc3RhbGUgd29ya3RyZWUgY2xlYW5lZCcgfSk7XG4gICAgcmV0dXJuIHsgLi4uYmFzZSwgb3V0Y29tZTogJ2Jsb2NrZWQnLCBkZXRhaWxzOiAnc3RhbGUgd29ya3RyZWUgY2xlYW5lZDsgdGFzayBibG9ja2VkJyB9O1xuICB9XG5cbiAgLy8gMiBcdTIwMTQgZ2l0IHBsdW1iaW5nOiBiYXNlbGluZSwgY2xhaW0gYnJhbmNoLCBjbGFpbS1uYW1lZCB3b3JrdHJlZS5cbiAgY29uc3QgYmFzZWxpbmUgPSBnaXQoWydyZXYtcGFyc2UnLCAnSEVBRCddLCByZXBvUGF0aCk7XG4gIGVuc3VyZUdpdEV4Y2x1ZGVzKHJlcG9QYXRoKTtcbiAgbWtkaXJTeW5jKHdvcmt0cmVlc1Jvb3QsIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xuICBjb25zdCB3b3JrdHJlZURpciA9IGpvaW4od29ya3RyZWVzUm9vdCwgY2xhaW0uaWQpO1xuICBnaXQoWyd3b3JrdHJlZScsICdhZGQnLCAnLWInLCBicmFuY2gsIHdvcmt0cmVlRGlyLCBiYXNlbGluZV0sIHJlcG9QYXRoKTtcbiAgd3JpdGVNYXJrZXIod29ya3RyZWVEaXIsIHtcbiAgICB3b3JrSXRlbUlkOiB3b3JrSXRlbS5pZCxcbiAgICBjbGFpbUlkOiBjbGFpbS5pZCxcbiAgICBiYXNlbGluZSxcbiAgICBpbnZvY2F0aW9uczogMCxcbiAgfSk7XG5cbiAgLy8gMyBcdTIwMTQgbWlycm9yLW9uLWRpc3BhdGNoOiBzdGFtcCBmcm9udG1hdHRlciB0byB0aGUgREIgZW50cnkgc3RhdGUgc28gdGhlXG4gIC8vIG9uZSBtb21lbnQgdGhlIGZpbGUgaXMgcmVhZCBhcyBhbiBlbnRyeSBzdGF0ZSwgaXQgaXMgZnJlc2ggKFx1MDBBNzEuNikuXG4gIGNvbnN0IHNwZWNBYnMgPSBqb2luKHdvcmt0cmVlRGlyLCBzcGVjUmVsKTtcbiAgaWYgKGV4aXN0c1N5bmMoc3BlY0FicykpIHtcbiAgICBzZXRGcm9udG1hdHRlclN0YXR1cyhzcGVjQWJzLCBFTlRSWV9TVEFUVVNbY29udGV4dC5lbnRyeVN0YXRlXSA/PyBjb250ZXh0LmVudHJ5U3RhdGUpO1xuICB9XG5cbiAgLy8gNCBcdTIwMTQgYWR2YW5jZSBpbnRvIGV4ZWN1dGlvbiBCRUZPUkUgdGhlIGFnZW50IHJ1bnMgKERCIGlzIHRoZSBlbnRyeSBzdGF0ZSkuXG4gIGF3YWl0IGNsaWVudC5jYWxsKCdhZHZhbmNlX3N0YXRlJywge1xuICAgIHdvcmtJdGVtSWQ6IHdvcmtJdGVtLmlkLFxuICAgIHRvOiAnaW5fcHJvZ3Jlc3MnLFxuICAgIGZlbmNpbmdUb2tlbjogY2xhaW0uZmVuY2luZ1Rva2VuLFxuICB9KTtcblxuICAvLyA1IFx1MjAxNCBpbnZva2UgdGhlIGNvZGluZyBhZ2VudC5cbiAgY29uc3QgY29tbWFuZCA9IG9wdGlvbnMuYWdlbnRDbWRcbiAgICAucmVwbGFjZUFsbCgne1NQRUNfRk9MREVSfScsIG9wdGlvbnMuc3BlY0ZvbGRlcilcbiAgICAucmVwbGFjZUFsbCgne1NUT1JZX0lEfScsIHdvcmtJdGVtLmV4dGVybmFsS2V5KVxuICAgIC5yZXBsYWNlQWxsKCd7SU5WT0tFX1dJVEh9Jywgd29ya0l0ZW0uaW52b2tlRGV2V2l0aClcbiAgICAucmVwbGFjZUFsbCgne1dPUktUUkVFfScsIHdvcmt0cmVlRGlyKTtcbiAgd3JpdGVNYXJrZXIod29ya3RyZWVEaXIsIHtcbiAgICB3b3JrSXRlbUlkOiB3b3JrSXRlbS5pZCxcbiAgICBjbGFpbUlkOiBjbGFpbS5pZCxcbiAgICBiYXNlbGluZSxcbiAgICBpbnZvY2F0aW9uczogMSxcbiAgfSk7XG4gIGNvbnN0IGludm9rZWQgPSBzcGF3blN5bmMoJ2Jhc2gnLCBbJy1sYycsIGNvbW1hbmRdLCB7XG4gICAgY3dkOiB3b3JrdHJlZURpcixcbiAgICBlbmNvZGluZzogJ3V0ZjgnLFxuICAgIHRpbWVvdXQ6IG9wdGlvbnMuYWdlbnRUaW1lb3V0TXMgPz8gMzAgKiA2MCAqIDEwMDAsXG4gICAga2lsbFNpZ25hbDogJ1NJR0tJTEwnLFxuICAgIGVudjoge1xuICAgICAgLi4ucHJvY2Vzcy5lbnYsXG4gICAgICAuLi5vcHRpb25zLmFnZW50RW52LFxuICAgICAgT0FIU19TUEVDX0ZJTEU6IHNwZWNBYnMsXG4gICAgICBPQUhTX1NUT1JZX0lEOiB3b3JrSXRlbS5leHRlcm5hbEtleSxcbiAgICB9LFxuICB9KTtcbiAgY29uc3QgYWdlbnRFeGl0Q29kZSA9IGludm9rZWQuc3RhdHVzID8/IC0xO1xuXG4gIC8vIFRFU1QgT05MWTogc2ltdWxhdGUgZHlpbmcgYWZ0ZXIgdGhlIGFnZW50IGNvbW1pdHRlZCwgYmVmb3JlIGFueSByZXBvcnQuXG4gIC8vIE5vIGV2aWRlbmNlLCBubyBhZHZhbmNlLCBubyByZWxlYXNlIFx1MjAxNCB0aGUgY2xhaW0gc3RheXMgbGl2ZSwgdGhlIHdvcmt0cmVlXG4gIC8vIHN0YXlzIG9uIGRpc2s7IGEgbGF0ZXIgY2xhaW0gYWRvcHRzIG9yIGNsZWFucyBpdCAoc3RlcCAxMCkuXG4gIGlmIChvcHRpb25zLmZhaWxwb2ludCA9PT0gJ2JlZm9yZV9yZXBvcnQnKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIC4uLmJhc2UsXG4gICAgICBvdXRjb21lOiAnY3Jhc2hlZCcsXG4gICAgICBkZXRhaWxzOiAnZmFpbHBvaW50IGJlZm9yZV9yZXBvcnQ6IGRpZWQgYWZ0ZXIgdGhlIGFnZW50IHJhbiwgYmVmb3JlIHJlcG9ydGluZycsXG4gICAgfTtcbiAgfVxuXG4gIGNvbnN0IG91dGNvbWUgPSBhd2FpdCBmaW5pc2hSdW4oe1xuICAgIC4uLmZpbmlzaEFyZ3MsXG4gICAgd29ya0Rpcjogd29ya3RyZWVEaXIsXG4gICAgYmFzZWxpbmUsXG4gICAgYWdlbnRFeGl0Q29kZSxcbiAgfSk7XG4gIHJlbW92ZVdvcmt0cmVlKHdvcmt0cmVlRGlyLCByZXBvUGF0aCk7XG4gIHJldHVybiB7IC4uLmJhc2UsIG91dGNvbWUgfTtcbn1cblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyB3b3JrTG9vcCBcdTIwMTQgcG9sbCBcdTIxOTIgcnVuT25jZSBcdTIxOTIgc2xlZXBcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4vKiogUnVuIHVudGlsIHN0b3BwZWQ6IHBvbGwgXHUyMTkyIHJ1bk9uY2UgXHUyMTkyIHNsZWVwKHBvbGxNcykuIFNJR0lOVCBleGl0cyBjbGVhbmx5LiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHdvcmtMb29wKG9wdGlvbnM6IFJ1bm5lck9wdGlvbnMgJiB7IG9uY2U/OiBib29sZWFuIH0pOiBQcm9taXNlPHZvaWQ+IHtcbiAgbGV0IHN0b3BwZWQgPSBmYWxzZTtcbiAgbGV0IHdha2U6ICgoKSA9PiB2b2lkKSB8IHVuZGVmaW5lZDtcbiAgY29uc3Qgb25TaWdpbnQgPSAoKTogdm9pZCA9PiB7XG4gICAgc3RvcHBlZCA9IHRydWU7XG4gICAgd2FrZT8uKCk7XG4gIH07XG4gIHByb2Nlc3Mub25jZSgnU0lHSU5UJywgb25TaWdpbnQpO1xuICB0cnkge1xuICAgIGZvciAoOzspIHtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHJ1bk9uY2Uob3B0aW9ucyk7XG4gICAgICBpZiAob3B0aW9ucy5vbmNlID09PSB0cnVlIHx8IHN0b3BwZWQpIHJldHVybjtcbiAgICAgIGlmICghcmVzdWx0LmRpc3BhdGNoZWQpIHtcbiAgICAgICAgYXdhaXQgbmV3IFByb21pc2U8dm9pZD4oKHJlc29sdmVTbGVlcCkgPT4ge1xuICAgICAgICAgIHdha2UgPSByZXNvbHZlU2xlZXA7XG4gICAgICAgICAgc2V0VGltZW91dChyZXNvbHZlU2xlZXAsIG9wdGlvbnMucG9sbE1zID8/IDE1XzAwMCk7XG4gICAgICAgIH0pO1xuICAgICAgICB3YWtlID0gdW5kZWZpbmVkO1xuICAgICAgICBpZiAoc3RvcHBlZCkgcmV0dXJuO1xuICAgICAgfVxuICAgIH1cbiAgfSBmaW5hbGx5IHtcbiAgICBwcm9jZXNzLnJlbW92ZUxpc3RlbmVyKCdTSUdJTlQnLCBvblNpZ2ludCk7XG4gIH1cbn1cbiIsICIvKipcbiAqIERyaXp6bGUgcGctY29yZSBzY2hlbWEgZm9yIHRoZSBvYWhzIHNwaW5lIChQaGFzZSAxIHN0b3J5IDExKS5cbiAqXG4gKiBEZXNpZ24gKHByb2R1Y3Qtcm9hZG1hcC5tZCBcdTAwQTcxLjMsIFx1MDBBNzEuNSBcdTIwMTQgXCJyYWNlcyBsb3NlIGJ5IGNvbnN0cmFpbnQsIG5vdCBieVxuICogYXBwbGljYXRpb24gbG9naWNcIik6XG4gKiAgLSBjbGFpbXM6IHBhcnRpYWwgdW5pcXVlIGluZGV4IE9OICh3b3JrX2l0ZW1faWQpIFdIRVJFIHJlbGVhc2VkID0gZmFsc2UgXHUyMDE0XG4gKiAgICB0aGUgc2Vjb25kIGNvbmN1cnJlbnQgY2xhaW0gbG9zZXMgYXQgdGhlIGNvbnN0cmFpbnQsIGxlYXZpbmcgbm8gcm93LlxuICogIC0gZXZlbnRzOiBVTklRVUUgKHN0cmVhbV9pZCwgc3RyZWFtX3NlcSkgZG91YmxlcyBhcyB0aGUgb3B0aW1pc3RpYyBsb2NrO1xuICogICAgZ2xvYmFsX3NlcSBpcyBhIHNlcmlhbCBpZGVudGl0eS5cbiAqICAtIHdvcmtfaXRlbXM6IHN0YXRlX3ZlcnNpb24gaW50IFx1MjAxNCBDQVMgdmlhIFVQREFURSAuLi4gV0hFUkUgc3RhdGVfdmVyc2lvbiA9ICRleHBlY3RlZC5cbiAqXG4gKiBIYW5kLW1haW50YWluZWQgdHdpbiBEREwgbGl2ZXMgaW4gc2NoZW1hLXNxbC50cyAocnVucyBvbiBQR2xpdGUgaW4gdGhlXG4gKiBjb25mb3JtYW5jZSBoYXJuZXNzKTsga2VlcCB0aGUgdHdvIGluIGxvY2tzdGVwLlxuICovXG5pbXBvcnQgeyBzcWwgfSBmcm9tICdkcml6emxlLW9ybSc7XG5pbXBvcnQge1xuICBiaWdpbnQsXG4gIGJvb2xlYW4sXG4gIGludGVnZXIsXG4gIGpzb25iLFxuICBwZ1RhYmxlLFxuICBwcmltYXJ5S2V5LFxuICBzZXJpYWwsXG4gIHRleHQsXG4gIHVuaXF1ZUluZGV4LFxufSBmcm9tICdkcml6emxlLW9ybS9wZy1jb3JlJztcblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBhY3RvcnMgXHUyMDE0IHVzZXJzLCBhZ2VudHMsIGFuZCB0aGUgcGVyLXdvcmtzcGFjZSBzeXN0ZW0gYWN0b3IgKHJvYWRtYXAgXHUwMEE3MS4yKVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5leHBvcnQgY29uc3QgYWN0b3JzID0gcGdUYWJsZSgnYWN0b3JzJywge1xuICBpZDogdGV4dCgnaWQnKS5wcmltYXJ5S2V5KCksXG4gIHR5cGU6IHRleHQoJ3R5cGUnKS5ub3ROdWxsKCksIC8vICd1c2VyJyB8ICdhZ2VudCcgfCAnc3lzdGVtJ1xuICBkaXNwbGF5TmFtZTogdGV4dCgnZGlzcGxheV9uYW1lJykubm90TnVsbCgpLFxuICAvKiogUGhhc2UgMiAocm9hZG1hcCBcdTAwQTczKTogJ2FkbWluJyB8ICdtZW1iZXInIHwgJ2F1ZGl0b3InIFx1MjAxNCBnYXRlZC13cml0ZSBhdXRob3JpdHkgKi9cbiAgZ292ZXJuYW5jZVJvbGU6IHRleHQoJ2dvdmVybmFuY2Vfcm9sZScpLm5vdE51bGwoKS5kZWZhdWx0KCdtZW1iZXInKSxcbiAgLyoqIFBoYXNlIDQgKHJvYWRtYXAgXHUwMEE3Myk6IEJNQUQgcGxheWJvb2sgcGVyc29uYSAoZS5nLiAnYm1hZC1hZ2VudC1wbScpOyBOVUxMIGZvciBodW1hbnMgYW5kIHBsYWluIGFnZW50cyAqL1xuICBwZXJzb25hQ29kZTogdGV4dCgncGVyc29uYV9jb2RlJyksXG59KTtcblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBncmFudHMgXHUyMDE0IGZsYXQgUGhhc2UtMSBwZXJtaXNzaW9uIHNldCAoc2NvcGUgYmVjb21lcyBtZWFuaW5nZnVsIGluIFBoYXNlIDIpXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbmV4cG9ydCBjb25zdCBncmFudHMgPSBwZ1RhYmxlKFxuICAnZ3JhbnRzJyxcbiAge1xuICAgIGFjdG9ySWQ6IHRleHQoJ2FjdG9yX2lkJykubm90TnVsbCgpLFxuICAgIHBlcm1pc3Npb246IHRleHQoJ3Blcm1pc3Npb24nKS5ub3ROdWxsKCksXG4gICAgc2NvcGU6IHRleHQoJ3Njb3BlJyksXG4gIH0sXG4gICh0KSA9PiBbcHJpbWFyeUtleSh7IGNvbHVtbnM6IFt0LmFjdG9ySWQsIHQucGVybWlzc2lvbl0gfSldLFxuKTtcblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyByb2xlX2Fzc2lnbm1lbnRzIFx1MjAxNCBkZWxpdmVyeS1yb2xlIGJ1bmRsZXMgKFBoYXNlIDIsIHJvYWRtYXAgXHUwMEE3MykuIEFzc2lnbm1lbnRcbi8vIGdyYW50cyB0aGUgYnVuZGxlOyByZXZvY2F0aW9uIGZsaXBzIGByZXZva2VkYCAoYXVkaXQgaGlzdG9yeSBpcyBrZXB0KS5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuZXhwb3J0IGNvbnN0IHJvbGVBc3NpZ25tZW50cyA9IHBnVGFibGUoJ3JvbGVfYXNzaWdubWVudHMnLCB7XG4gIHNlcTogc2VyaWFsKCdzZXEnKS5wcmltYXJ5S2V5KCksXG4gIGFjdG9ySWQ6IHRleHQoJ2FjdG9yX2lkJykubm90TnVsbCgpLFxuICByb2xlQ29kZTogdGV4dCgncm9sZV9jb2RlJykubm90TnVsbCgpLFxuICBncmFudGVkQnk6IHRleHQoJ2dyYW50ZWRfYnknKS5ub3ROdWxsKCksXG4gIHJldm9rZWQ6IGJvb2xlYW4oJ3Jldm9rZWQnKS5ub3ROdWxsKCkuZGVmYXVsdChmYWxzZSksXG59KTtcblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyB3b3Jrc3BhY2Vfc3RhdGUgXHUyMDE0IHRoZSBzaW5nbGUtcm93IHBsYW4vcG9saWN5IHByb2plY3Rpb24gKFBoYXNlIDIsIHJvYWRtYXBcbi8vIFx1MDBBNzMpLiBFeGFjdGx5IG9uZSByb3cgd2l0aCBpZCA9ICd3b3Jrc3BhY2UnOyB2ZXJzaW9ucyBiYWNrIGF1dGh6LmV4cGxhaW4uXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbmV4cG9ydCBjb25zdCB3b3Jrc3BhY2VTdGF0ZSA9IHBnVGFibGUoJ3dvcmtzcGFjZV9zdGF0ZScsIHtcbiAgaWQ6IHRleHQoJ2lkJykucHJpbWFyeUtleSgpLCAvLyBhbHdheXMgJ3dvcmtzcGFjZSdcbiAgcGxhbjogdGV4dCgncGxhbicpLm5vdE51bGwoKSwgLy8gJ2ZyZWUnIHwgJ3RlYW0nIHwgJ2VudGVycHJpc2UnXG4gIHBsYW5WZXJzaW9uOiBpbnRlZ2VyKCdwbGFuX3ZlcnNpb24nKS5ub3ROdWxsKCkuZGVmYXVsdCgxKSxcbiAgcG9saWN5OiBqc29uYigncG9saWN5JykuJHR5cGU8UmVjb3JkPHN0cmluZywgdW5rbm93bj4+KCkubm90TnVsbCgpLmRlZmF1bHQoc3FsYCd7fSc6Ompzb25iYCksXG4gIHBvbGljeVZlcnNpb246IGludGVnZXIoJ3BvbGljeV92ZXJzaW9uJykubm90TnVsbCgpLmRlZmF1bHQoMSksXG59KTtcblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBnYXRlX3BvbGljaWVzIFx1MjAxNCBnYXRlIGRlZmluaXRpb25zIGFzIERBVEEgKFBoYXNlIDIsIHJvYWRtYXAgXHUwMEE3Myk6XG4vLyBtaW5BcHByb3ZhbHMgKyByZXF1aXJlZEFjdG9yVHlwZXMsIGtleWVkIGJ5IGdhdGUgY29kZS5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuZXhwb3J0IGNvbnN0IGdhdGVQb2xpY2llcyA9IHBnVGFibGUoJ2dhdGVfcG9saWNpZXMnLCB7XG4gIGdhdGU6IHRleHQoJ2dhdGUnKS5wcmltYXJ5S2V5KCksIC8vICdzcGVjX2FwcHJvdmFsJyB8ICdyZXZpZXdfYXBwcm92YWwnXG4gIHBvbGljeToganNvbmIoJ3BvbGljeScpLiR0eXBlPFJlY29yZDxzdHJpbmcsIHVua25vd24+PigpLm5vdE51bGwoKSxcbn0pO1xuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIGZlYXR1cmVzIFx1MjAxNCBlcGljLWxldmVsIHByb2plY3Rpb24gKHN0YXRlICsgZG9uZV9jaGVja3BvaW50IGRpc3BhdGNoIGhvbGQpXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbmV4cG9ydCBjb25zdCBmZWF0dXJlcyA9IHBnVGFibGUoJ2ZlYXR1cmVzJywge1xuICBpZDogdGV4dCgnaWQnKS5wcmltYXJ5S2V5KCksXG4gIHNlcTogc2VyaWFsKCdzZXEnKS5ub3ROdWxsKCksXG4gIHN0YXRlOiB0ZXh0KCdzdGF0ZScpLm5vdE51bGwoKSwgLy8gJ2JhY2tsb2cnIHwgJ2luX3Byb2dyZXNzJyB8ICdkb25lJ1xuICBkaXNwYXRjaEhvbGQ6IGJvb2xlYW4oJ2Rpc3BhdGNoX2hvbGQnKS5ub3ROdWxsKCkuZGVmYXVsdChmYWxzZSksXG59KTtcblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyB3b3JrX2l0ZW1zIFx1MjAxNCB0aGUgdW5pZmllZCB3b3JrLWl0ZW0gbW9kZWwgKHJvYWRtYXAgXHUwMEE3MS4xKVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5leHBvcnQgY29uc3Qgd29ya0l0ZW1zID0gcGdUYWJsZSgnd29ya19pdGVtcycsIHtcbiAgaWQ6IHRleHQoJ2lkJykucHJpbWFyeUtleSgpLFxuICAvKiogY3JlYXRpb24gb3JkZXIgXHUyMDE0IGJhY2tzIGZpcnN0LXdyaXRlci13aW5zIGV4dGVybmFsS2V5IHJlc29sdXRpb24gKi9cbiAgc2VxOiBzZXJpYWwoJ3NlcScpLm5vdE51bGwoKSxcbiAgZmVhdHVyZUlkOiB0ZXh0KCdmZWF0dXJlX2lkJykubm90TnVsbCgpLFxuICBleHRlcm5hbEtleTogdGV4dCgnZXh0ZXJuYWxfa2V5Jykubm90TnVsbCgpLFxuICAvKiogUGhhc2UgNCAocm9hZG1hcCBcdTAwQTcxLjQpOiBzZWxlY3RzIFdISUNIIG1hY2hpbmUtZXZpZGVuY2UgZ3VhcmRzIGFwcGx5IFx1MjAxNCBuZXZlciBXSE8gcGFzc2VzIGEgZ2F0ZSAqL1xuICBraW5kOiB0ZXh0KCdraW5kJykubm90TnVsbCgpLmRlZmF1bHQoJ2NvZGUnKSxcbiAgdGl0bGU6IHRleHQoJ3RpdGxlJykubm90TnVsbCgpLFxuICBzdGF0ZTogdGV4dCgnc3RhdGUnKS5ub3ROdWxsKCksXG4gIGJsb2NrZWRSZWFzb246IHRleHQoJ2Jsb2NrZWRfcmVhc29uJyksIC8vIG92ZXJsYXksIG5vdCBhIHN0YXRlIChEOClcbiAgcmV2aWV3TG9vcEl0ZXJhdGlvbjogaW50ZWdlcigncmV2aWV3X2xvb3BfaXRlcmF0aW9uJykubm90TnVsbCgpLmRlZmF1bHQoMCksXG4gIGludGVudEhhc2g6IHRleHQoJ2ludGVudF9oYXNoJyksXG4gIHBpbm5lZFZlcmlmaWNhdGlvbjoganNvbmIoJ3Bpbm5lZF92ZXJpZmljYXRpb24nKS4kdHlwZTxzdHJpbmdbXT4oKSwgLy8gUnVsZXMtbGF5ZXIgZGF0YSAoRDcpXG4gIHNwZWNDaGVja3BvaW50OiBib29sZWFuKCdzcGVjX2NoZWNrcG9pbnQnKS5ub3ROdWxsKCkuZGVmYXVsdChmYWxzZSksXG4gIGRvbmVDaGVja3BvaW50OiBib29sZWFuKCdkb25lX2NoZWNrcG9pbnQnKS5ub3ROdWxsKCkuZGVmYXVsdChmYWxzZSksXG4gIGludm9rZURldldpdGg6IHRleHQoJ2ludm9rZV9kZXZfd2l0aCcpLm5vdE51bGwoKS5kZWZhdWx0KCcnKSxcbiAgc3BlY1BhdGg6IHRleHQoJ3NwZWNfcGF0aCcpLm5vdE51bGwoKSxcbiAgLyoqIG9wdGltaXN0aWMgY29uY3VycmVuY3k6IENBUyBieSBVUERBVEUgLi4uIFdIRVJFIHN0YXRlX3ZlcnNpb24gPSBleHBlY3RlZCAqL1xuICBzdGF0ZVZlcnNpb246IGludGVnZXIoJ3N0YXRlX3ZlcnNpb24nKS5ub3ROdWxsKCkuZGVmYXVsdCgwKSxcbiAgLyoqIGRlcGVuZGVuY3kgZXh0ZXJuYWxLZXlzIHdpdGhpbiB0aGUgc2FtZSBmZWF0dXJlICovXG4gIGRlcGVuZHNPbjoganNvbmIoJ2RlcGVuZHNfb24nKS4kdHlwZTxzdHJpbmdbXT4oKS5ub3ROdWxsKCkuZGVmYXVsdChzcWxgJ1tdJzo6anNvbmJgKSxcbiAgLyoqIG1vbm90b25pYyBmZW5jaW5nIGNvdW50ZXIgcGVyIHdvcmsgaXRlbSAocm9hZG1hcCBcdTAwQTcxLjMpICovXG4gIGxhc3RGZW5jaW5nVG9rZW46IGludGVnZXIoJ2xhc3RfZmVuY2luZ190b2tlbicpLm5vdE51bGwoKS5kZWZhdWx0KDApLFxufSk7XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gY2xhaW1zIFx1MjAxNCBsZWFzZXMgKyBmZW5jaW5nIHRva2VuczsgT05FIGxpdmUgY2xhaW0gcGVyIGl0ZW0gQlkgQ09OU1RSQUlOVFxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5leHBvcnQgY29uc3QgY2xhaW1zID0gcGdUYWJsZShcbiAgJ2NsYWltcycsXG4gIHtcbiAgICBpZDogdGV4dCgnaWQnKS5wcmltYXJ5S2V5KCksXG4gICAgc2VxOiBzZXJpYWwoJ3NlcScpLm5vdE51bGwoKSxcbiAgICB3b3JrSXRlbUlkOiB0ZXh0KCd3b3JrX2l0ZW1faWQnKS5ub3ROdWxsKCksXG4gICAgYWN0b3JJZDogdGV4dCgnYWN0b3JfaWQnKS5ub3ROdWxsKCksXG4gICAgZmVuY2luZ1Rva2VuOiBpbnRlZ2VyKCdmZW5jaW5nX3Rva2VuJykubm90TnVsbCgpLFxuICAgIC8qKiBlbmdpbmUtY2xvY2sgbWlsbGlzZWNvbmRzIChKUyBmaWVsZCBgbm93YCksIG5ldmVyIFNRTCBub3coKSAqL1xuICAgIGxlYXNlRXhwaXJlc0F0OiBiaWdpbnQoJ2xlYXNlX2V4cGlyZXNfYXQnLCB7IG1vZGU6ICdudW1iZXInIH0pLm5vdE51bGwoKSxcbiAgICByZWxlYXNlZDogYm9vbGVhbigncmVsZWFzZWQnKS5ub3ROdWxsKCkuZGVmYXVsdChmYWxzZSksXG4gICAgdHRsTXM6IGJpZ2ludCgndHRsX21zJywgeyBtb2RlOiAnbnVtYmVyJyB9KS5ub3ROdWxsKCksXG4gIH0sXG4gICh0KSA9PiBbXG4gICAgLy8gcm9hZG1hcCBcdTAwQTcxLjM6IFwiT25lIGxpdmUgY2xhaW0gcGVyIHdvcmsgaXRlbSwgZW5mb3JjZWQgYnkgYSBwYXJ0aWFsXG4gICAgLy8gdW5pcXVlIGluZGV4IFx1MjAxNCByYWNlcyBsb3NlIGJ5IGNvbnN0cmFpbnQsIG5vdCBieSBhcHBsaWNhdGlvbiBsb2dpYy5cIlxuICAgIHVuaXF1ZUluZGV4KCdjbGFpbXNfb25lX2xpdmVfcGVyX2l0ZW0nKS5vbih0LndvcmtJdGVtSWQpLndoZXJlKHNxbGByZWxlYXNlZCA9IGZhbHNlYCksXG4gIF0sXG4pO1xuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIGdhdGVfZGVjaXNpb25zIFx1MjAxNCBwZXJtaXNzaW9uIHNuYXBzaG90ICsgZGVjaXNpb24gcmVjb3JkIChyb2FkbWFwIFx1MDBBNzEuNClcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuZXhwb3J0IGNvbnN0IGdhdGVEZWNpc2lvbnMgPSBwZ1RhYmxlKCdnYXRlX2RlY2lzaW9ucycsIHtcbiAgc2VxOiBzZXJpYWwoJ3NlcScpLnByaW1hcnlLZXkoKSxcbiAgd29ya0l0ZW1JZDogdGV4dCgnd29ya19pdGVtX2lkJykubm90TnVsbCgpLFxuICBnYXRlOiB0ZXh0KCdnYXRlJykubm90TnVsbCgpLCAvLyAnc3BlY19hcHByb3ZhbCcgfCAncmV2aWV3X2FwcHJvdmFsJ1xuICBkZWNpc2lvbjogdGV4dCgnZGVjaXNpb24nKS5ub3ROdWxsKCksIC8vICdhcHByb3ZlZCcgfCAncmVqZWN0ZWQnXG4gIGFjdG9ySWQ6IHRleHQoJ2FjdG9yX2lkJykubm90TnVsbCgpLFxuICAvKiogcmV2aWV3IHJvdW5kIHRoZSBkZWNpc2lvbiBiZWxvbmdzIHRvICg9IHJldmlld19sb29wX2l0ZXJhdGlvbiBhdCBkZWNpc2lvbiB0aW1lKSAqL1xuICByb3VuZDogaW50ZWdlcigncm91bmQnKS5ub3ROdWxsKCkuZGVmYXVsdCgwKSxcbn0pO1xuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIGV2aWRlbmNlIFx1MjAxNCBtYWNoaW5lLWNvbGxlY3RlZCBmYWN0czsgc2VxIG9yZGVycyBcImxhdGVzdFwiIHNlbWFudGljc1xuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5leHBvcnQgY29uc3QgZXZpZGVuY2UgPSBwZ1RhYmxlKCdldmlkZW5jZScsIHtcbiAgc2VxOiBzZXJpYWwoJ3NlcScpLnByaW1hcnlLZXkoKSxcbiAgd29ya0l0ZW1JZDogdGV4dCgnd29ya19pdGVtX2lkJykubm90TnVsbCgpLFxuICBraW5kOiB0ZXh0KCdraW5kJykubm90TnVsbCgpLFxuICBwYXlsb2FkOiBqc29uYigncGF5bG9hZCcpLiR0eXBlPFJlY29yZDxzdHJpbmcsIHVua25vd24+PigpLm5vdE51bGwoKSxcbn0pO1xuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIGV2ZW50cyBcdTIwMTQgYXBwZW5kLW9ubHkgbG9nLCBzYW1lLXRyYW5zYWN0aW9uIGFzIHByb2plY3Rpb25zIChyb2FkbWFwIFx1MDBBNzEuNSlcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuZXhwb3J0IGNvbnN0IGV2ZW50cyA9IHBnVGFibGUoXG4gICdldmVudHMnLFxuICB7XG4gICAgZ2xvYmFsU2VxOiBzZXJpYWwoJ2dsb2JhbF9zZXEnKS5wcmltYXJ5S2V5KCksXG4gICAgc3RyZWFtVHlwZTogdGV4dCgnc3RyZWFtX3R5cGUnKS5ub3ROdWxsKCksIC8vICd3b3Jrc3BhY2UnfCdmZWF0dXJlJ3wnd29ya19pdGVtJ3wnYWN0b3InXG4gICAgc3RyZWFtSWQ6IHRleHQoJ3N0cmVhbV9pZCcpLm5vdE51bGwoKSxcbiAgICBzdHJlYW1TZXE6IGludGVnZXIoJ3N0cmVhbV9zZXEnKS5ub3ROdWxsKCksXG4gICAgdHlwZTogdGV4dCgndHlwZScpLm5vdE51bGwoKSxcbiAgICBhY3RvcklkOiB0ZXh0KCdhY3Rvcl9pZCcpLm5vdE51bGwoKSxcbiAgICBwYXlsb2FkOiBqc29uYigncGF5bG9hZCcpLiR0eXBlPFJlY29yZDxzdHJpbmcsIHVua25vd24+PigpLm5vdE51bGwoKSxcbiAgICBjYXVzYXRpb25JZDogdGV4dCgnY2F1c2F0aW9uX2lkJyksXG4gICAgaWRlbXBvdGVuY3lLZXk6IHRleHQoJ2lkZW1wb3RlbmN5X2tleScpLFxuICB9LFxuICAodCkgPT4gW1xuICAgIC8vIFx1MDBBNzEuNTogXCJVTklRVUUoc3RyZWFtX2lkLCBzdHJlYW1fc2VxKSBkb3VibGVzIGFzIHRoZSBvcHRpbWlzdGljIGxvY2suXCJcbiAgICB1bmlxdWVJbmRleCgnZXZlbnRzX3N0cmVhbV9pZF9zdHJlYW1fc2VxJykub24odC5zdHJlYW1JZCwgdC5zdHJlYW1TZXEpLFxuICBdLFxuKTtcblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBpZGVtcG90ZW5jeV9rZXlzIFx1MjAxNCBrZXllZCByZXBsYXkgcmV0dXJucyB0aGUgcmVjb3JkZWQgcmVzdWx0LCBhcHBlbmRzIG5vdGhpbmdcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuZXhwb3J0IGNvbnN0IGlkZW1wb3RlbmN5S2V5cyA9IHBnVGFibGUoJ2lkZW1wb3RlbmN5X2tleXMnLCB7XG4gIGtleTogdGV4dCgna2V5JykucHJpbWFyeUtleSgpLFxuICByZXN1bHQ6IGpzb25iKCdyZXN1bHQnKS4kdHlwZTxSZWNvcmQ8c3RyaW5nLCB1bmtub3duPj4oKS5ub3ROdWxsKCksXG59KTtcblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyB0aHJlYWRzIFx1MjAxNCB0aGUgY2hhdCBTVVJGQUNFIChQaGFzZSAzLCByb2FkbWFwIFx1MDBBNzUuMykuIHBhcnRpY2lwYW50cyBpcyBqc29uYjpcbi8vIGVuZm9yY2VkIGZvciBwcml2YXRlIHRocmVhZHMsIGluZm9ybWF0aW9uYWwgZm9yIG9wZW4gb25lcy5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuZXhwb3J0IGNvbnN0IHRocmVhZHMgPSBwZ1RhYmxlKCd0aHJlYWRzJywge1xuICBpZDogdGV4dCgnaWQnKS5wcmltYXJ5S2V5KCksXG4gIHNlcTogc2VyaWFsKCdzZXEnKS5ub3ROdWxsKCksXG4gIGZlYXR1cmVJZDogdGV4dCgnZmVhdHVyZV9pZCcpLFxuICB3b3JrSXRlbUlkOiB0ZXh0KCd3b3JrX2l0ZW1faWQnKSxcbiAga2luZDogdGV4dCgna2luZCcpLm5vdE51bGwoKSwgLy8gJ3NwZWMnIHwgJ2Rlc2lnbicgfCAndGFzaycgfCAnZ2VuZXJhbCcgfCAncHJpdmF0ZSdcbiAgdmlzaWJpbGl0eTogdGV4dCgndmlzaWJpbGl0eScpLm5vdE51bGwoKSwgLy8gJ29wZW4nIHwgJ3ByaXZhdGUnXG4gIGNyZWF0ZWRCeTogdGV4dCgnY3JlYXRlZF9ieScpLm5vdE51bGwoKSxcbiAgcGFydGljaXBhbnRzOiBqc29uYigncGFydGljaXBhbnRzJykuJHR5cGU8c3RyaW5nW10+KCkubm90TnVsbCgpLmRlZmF1bHQoc3FsYCdbXSc6Ompzb25iYCksXG59KTtcblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBtZXNzYWdlcyBcdTIwMTQgb25lIGNvbHVtbiwgb25lIHRhYmxlIGZvciB1c2VyIEFORCBhZ2VudCBhdXRob3JzIChcdTAwQTc1LjMpO1xuLy8gVU5JUVVFKHRocmVhZF9pZCwgc2VxKSBrZWVwcyB0aGUgcGVyLXRocmVhZCBzZXF1ZW5jZSBnYXAtZnJlZSBieSBjb25zdHJhaW50LlxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5leHBvcnQgY29uc3QgbWVzc2FnZXMgPSBwZ1RhYmxlKFxuICAnbWVzc2FnZXMnLFxuICB7XG4gICAgaWQ6IHRleHQoJ2lkJykucHJpbWFyeUtleSgpLFxuICAgIHRocmVhZElkOiB0ZXh0KCd0aHJlYWRfaWQnKS5ub3ROdWxsKCksXG4gICAgc2VxOiBpbnRlZ2VyKCdzZXEnKS5ub3ROdWxsKCksIC8vIHBlci10aHJlYWQsIDEtYmFzZWQsIGdhcC1mcmVlXG4gICAgYXV0aG9ySWQ6IHRleHQoJ2F1dGhvcl9pZCcpLm5vdE51bGwoKSxcbiAgICBraW5kOiB0ZXh0KCdraW5kJykubm90TnVsbCgpLCAvLyAnY2hhdCcgfCAnc3lzdGVtJ1xuICAgIGJvZHk6IHRleHQoJ2JvZHknKS5ub3ROdWxsKCksXG4gICAgcmVwbHlUbzogdGV4dCgncmVwbHlfdG8nKSxcbiAgfSxcbiAgKHQpID0+IFt1bmlxdWVJbmRleCgnbWVzc2FnZXNfdGhyZWFkX2lkX3NlcScpLm9uKHQudGhyZWFkSWQsIHQuc2VxKV0sXG4pO1xuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIG1lbnRpb25zIFx1MjAxNCBTVFJVQ1RVUkVEIG1lbnRpb24gcmVjb3JkcyArIHRoZSByb3V0ZXIncyByZWNvcmRlZCByZXNvbHV0aW9uXG4vLyAoXHUwMEE3NS40KS4gVGhlIHNlcnZlciBuZXZlciBwYXJzZXMgbWVzc2FnZSBib2RpZXMuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbmV4cG9ydCBjb25zdCBtZW50aW9ucyA9IHBnVGFibGUoJ21lbnRpb25zJywge1xuICBzZXE6IHNlcmlhbCgnc2VxJykucHJpbWFyeUtleSgpLFxuICBtZXNzYWdlSWQ6IHRleHQoJ21lc3NhZ2VfaWQnKS5ub3ROdWxsKCksXG4gIG1lbnRpb25lZEFjdG9ySWQ6IHRleHQoJ21lbnRpb25lZF9hY3Rvcl9pZCcpLm5vdE51bGwoKSxcbiAgcmVzb2x1dGlvbjogdGV4dCgncmVzb2x1dGlvbicpLm5vdE51bGwoKSwgLy8gJ25vdGlmaWVkJ3wnam9iX2NyZWF0ZWQnfCdkZW5pZWRfcG9saWN5J3wnZGVuaWVkX2RlcHRoJ1xufSk7XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gbm90aWZpY2F0aW9ucyBcdTIwMTQgbWVudGlvbi9qb2ItY29tcGxldGlvbiBpbmJveCByb3dzIChcdTAwQTc1LjQpXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbmV4cG9ydCBjb25zdCBub3RpZmljYXRpb25zID0gcGdUYWJsZSgnbm90aWZpY2F0aW9ucycsIHtcbiAgaWQ6IHRleHQoJ2lkJykucHJpbWFyeUtleSgpLFxuICBzZXE6IHNlcmlhbCgnc2VxJykubm90TnVsbCgpLFxuICBhY3RvcklkOiB0ZXh0KCdhY3Rvcl9pZCcpLm5vdE51bGwoKSxcbiAgc291cmNlOiB0ZXh0KCdzb3VyY2UnKS5ub3ROdWxsKCksIC8vICdtZW50aW9uJyB8ICdqb2JfY29tcGxldGVkJ1xuICByZWZJZDogdGV4dCgncmVmX2lkJykubm90TnVsbCgpLCAvLyBtZXNzYWdlSWQgZm9yIG1lbnRpb25zLCBqb2JJZCBmb3IgY29tcGxldGlvbnNcbiAgcmVhZDogYm9vbGVhbigncmVhZCcpLm5vdE51bGwoKS5kZWZhdWx0KGZhbHNlKSxcbn0pO1xuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIGFnZW50X2pvYnMgXHUyMDE0IHJvdXRlci1tYXRlcmlhbGl6ZWQsIHJlcGx5LW9ubHkgY29udGV4dCAoXHUwMEE3NS40KTogTkVWRVIgYSBjbGFpbSxcbi8vIG5ldmVyIGxpZmVjeWNsZSBhdXRob3JpdHkuIGRlcHRoIGNvdW50cyBhZ2VudC1tZW50aW9uLWFnZW50IGhvcHMuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbmV4cG9ydCBjb25zdCBhZ2VudEpvYnMgPSBwZ1RhYmxlKCdhZ2VudF9qb2JzJywge1xuICBpZDogdGV4dCgnaWQnKS5wcmltYXJ5S2V5KCksXG4gIHNlcTogc2VyaWFsKCdzZXEnKS5ub3ROdWxsKCksXG4gIGFnZW50QWN0b3JJZDogdGV4dCgnYWdlbnRfYWN0b3JfaWQnKS5ub3ROdWxsKCksXG4gIHRocmVhZElkOiB0ZXh0KCd0aHJlYWRfaWQnKS5ub3ROdWxsKCksXG4gIG1lc3NhZ2VJZDogdGV4dCgnbWVzc2FnZV9pZCcpLm5vdE51bGwoKSxcbiAgd29ya0l0ZW1JZDogdGV4dCgnd29ya19pdGVtX2lkJyksXG4gIGZlYXR1cmVJZDogdGV4dCgnZmVhdHVyZV9pZCcpLFxuICBzdGF0dXM6IHRleHQoJ3N0YXR1cycpLm5vdE51bGwoKSwgLy8gJ3F1ZXVlZCcgfCAnZG9uZScgfCAnYmxvY2tlZCdcbiAgZGVwdGg6IGludGVnZXIoJ2RlcHRoJykubm90TnVsbCgpLmRlZmF1bHQoMCksXG4gIG5vdGU6IHRleHQoJ25vdGUnKSxcbn0pO1xuIiwgIi8qKlxuICogUGdFbmdpbmUgXHUyMDE0IGFzeW5jIFBvc3RncmVzIHBvcnQgb2YgdGhlIGluLW1lbW9yeSByZWZlcmVuY2UgZW5naW5lXG4gKiAoQG9haHMvY29yZSBzcmMvZW5naW5lLnRzKS4gU2VtYW50aWNzIGFyZSBhIEZBSVRIRlVMIG1pcnJvciwgbWV0aG9kIGJ5XG4gKiBtZXRob2Q6IHNhbWUgY2hlY2sgb3JkZXJpbmcsIHNhbWUgZXJyb3IgY2xhc3Nlcywgc2FtZSBldmVudCB0eXBlcywgc2FtZVxuICogY29uZm9ybWFuY2UgcGlucyAoc2VlIHBhY2thZ2VzL2NvcmUvdGVzdC9DT05GT1JNQU5DRS5tZCkuIFdoZXJlIHRoZVxuICogcmVmZXJlbmNlIHVzZWQgaW4tcHJvY2VzcyBkYXRhIHN0cnVjdHVyZXMsIHRoaXMgZW5naW5lIHVzZXMgdGhlIERyaXp6bGVcbiAqIHNjaGVtYSBpbiBzY2hlbWEudHMgYW5kIGxldHMgY29uc3RyYWludHMgZG8gdGhlIHJhY2luZyAocm9hZG1hcCBcdTAwQTcxLjNcbiAqIFwicmFjZXMgbG9zZSBieSBjb25zdHJhaW50LCBub3QgYnkgYXBwbGljYXRpb24gbG9naWNcIikuXG4gKlxuICogVGVjaG5pY2FsIG5vdGVzOlxuICogIC0gVGhlIGVuZ2luZSBjbG9jayBpcyB0aGUgSlMgZmllbGQgYG5vd2AgKGFkdmFuY2VDbG9jayBhZGRzIHRvIGl0KTsgbGVhc2VcbiAqICAgIGNvbXBhcmlzb25zIGFsd2F5cyB1c2UgdGhpcy5ub3csIG5ldmVyIFNRTCBub3coKS5cbiAqICAtIEV2ZXJ5IGNvbW1hbmQncyB3cml0ZXMgaGFwcGVuIGluIE9ORSBkYi50cmFuc2FjdGlvbiAoZXZlbnQgYXBwZW5kICtcbiAqICAgIHByb2plY3Rpb24gdXBkYXRlIHRvZ2V0aGVyIFx1MjAxNCByb2FkbWFwIFx1MDBBNzEuNSkuIFRoZSBzaW5nbGUgZGVsaWJlcmF0ZVxuICogICAgZXhjZXB0aW9uOiB0aGUgZmVuY2luZy5yZWplY3RlZCBBVURJVCBldmVudCBjb21taXRzIGluIGl0cyBvd25cbiAqICAgIHRyYW5zYWN0aW9uLCBiZWNhdXNlIHRoZSBjb21tYW5kIGl0IGJlbG9uZ3MgdG8gZmFpbHMgd2l0aCBDb25mbGljdEVycm9yXG4gKiAgICBhbmQgbXVzdCBsZWF2ZSB0aGUgcHJvamVjdGlvbiB1bnRvdWNoZWQgd2hpbGUgdGhlIHJlZnVzYWwgaXMgcmVjb3JkZWRcbiAqICAgIChcdTAwQTcxLjMgXCJhIHN0YWxlIHRva2VuIGdldHMgNDA5IGFuZCBhbiBhdWRpdCBldmVudFwiKS5cbiAqICAtIEFsbCByZXR1cm5lZCB2YWx1ZXMgYXJlIHN0cnVjdHVyZWQtY2xvbmUtYWJsZSBwbGFpbiBvYmplY3RzIChudW1iZXJcbiAqICAgIHRpbWVzdGFtcHMsIG5vIERhdGUsIG5vIHVuZGVmaW5lZCBhcnJheSBob2xlcykgc28gdGhleSBjcm9zcyB0aGVcbiAqICAgIHN5bmNraXQgd29ya2VyIGJvdW5kYXJ5IGludGFjdC5cbiAqL1xuaW1wb3J0IHsgYW5kLCBhc2MsIGVxLCBndCwgbHRlLCBzcWwgfSBmcm9tICdkcml6emxlLW9ybSc7XG5pbXBvcnQgdHlwZSB7IFBnbGl0ZURhdGFiYXNlIH0gZnJvbSAnZHJpenpsZS1vcm0vcGdsaXRlJztcblxuaW1wb3J0IHtcbiAgQUdFTlRfR0FURV9BUFBST1ZFX1BFUk1JU1NJT05TLFxuICBBR0VOVF9KT0JfTUFYX0RFUFRILFxuICBCTE9DS0VEX1JFQVNPTlMsXG4gIENvbmZsaWN0RXJyb3IsXG4gIERFRkFVTFRfUExBTixcbiAgREVMSVZFUllfUk9MRVMsXG4gIEd1YXJkRmFpbGVkRXJyb3IsXG4gIEludmFsaWRUcmFuc2l0aW9uRXJyb3IsXG4gIFBlcm1pc3Npb25EZW5pZWRFcnJvcixcbiAgUEVSU09OQVMsXG4gIFBMQU5fQ0VJTElOR1MsXG4gIFJFVklFV19MT09QX0xJTUlULFxuICBTdG9yaWVzVmFsaWRhdGlvbkVycm9yLFxuICBXT1JLX0lURU1fU1RBVEVTLFxuICBwYXJzZVN0b3JpZXMsXG4gIHR5cGUgQWN0b3IsXG4gIHR5cGUgQWN0b3JUeXBlLFxuICB0eXBlIEFkdmFuY2VJbnB1dCxcbiAgdHlwZSBBZ2VudEpvYixcbiAgdHlwZSBBdXRoekV4cGxhbmF0aW9uLFxuICB0eXBlIEJsb2NrZWRSZWFzb24sXG4gIHR5cGUgQ2xhaW0sXG4gIHR5cGUgQ3JlYXRlV29ya0l0ZW1JbnB1dCxcbiAgdHlwZSBEaXZlcmdlbmNlUmVwb3J0LFxuICB0eXBlIEV2aWRlbmNlLFxuICB0eXBlIEZlYXR1cmUsXG4gIHR5cGUgR2F0ZUNvZGUsXG4gIHR5cGUgR2F0ZURlY2lzaW9uSW5wdXQsXG4gIHR5cGUgR2F0ZVBvbGljeSxcbiAgdHlwZSBHb3Zlcm5hbmNlUm9sZSxcbiAgdHlwZSBNZW50aW9uLFxuICB0eXBlIE1lbnRpb25SZXNvbHV0aW9uLFxuICB0eXBlIE1lc3NhZ2UsXG4gIHR5cGUgTm90aWZpY2F0aW9uLFxuICB0eXBlIFBlcm1pc3Npb24sXG4gIHR5cGUgUGxhbkNvZGUsXG4gIHR5cGUgUm9sZUFzc2lnbm1lbnQsXG4gIHR5cGUgU3BpbmVFdmVudCxcbiAgdHlwZSBTdG9yaWVzSW1wb3J0UmVzdWx0LFxuICB0eXBlIFRocmVhZCxcbiAgdHlwZSBUaHJlYWRLaW5kLFxuICB0eXBlIFRocmVhZFZpc2liaWxpdHksXG4gIHR5cGUgV29ya0l0ZW0sXG4gIHR5cGUgV29ya0l0ZW1LaW5kLFxuICB0eXBlIFdvcmtJdGVtU3RhdGUsXG4gIHR5cGUgV29ya3NwYWNlUG9saWN5LFxufSBmcm9tICdAb2Focy9jb3JlJztcblxuaW1wb3J0IHtcbiAgYWN0b3JzLFxuICBhZ2VudEpvYnMsXG4gIGNsYWltcyxcbiAgZXZpZGVuY2UgYXMgZXZpZGVuY2VUYWJsZSxcbiAgZXZlbnRzLFxuICBmZWF0dXJlcyxcbiAgZ2F0ZURlY2lzaW9ucyxcbiAgZ2F0ZVBvbGljaWVzLFxuICBncmFudHMsXG4gIGlkZW1wb3RlbmN5S2V5cyxcbiAgbWVudGlvbnMsXG4gIG1lc3NhZ2VzLFxuICBub3RpZmljYXRpb25zLFxuICByb2xlQXNzaWdubWVudHMsXG4gIHRocmVhZHMsXG4gIHdvcmtJdGVtcyxcbiAgd29ya3NwYWNlU3RhdGUsXG59IGZyb20gJy4vc2NoZW1hLmpzJztcblxudHlwZSBEYiA9IFBnbGl0ZURhdGFiYXNlPFJlY29yZDxzdHJpbmcsIHVua25vd24+PjtcbnR5cGUgVHggPSBQYXJhbWV0ZXJzPFBhcmFtZXRlcnM8RGJbJ3RyYW5zYWN0aW9uJ10+WzBdPlswXTtcbi8qKiBCb3RoIHRoZSByb290IGRhdGFiYXNlIGFuZCBhIHRyYW5zYWN0aW9uIGV4cG9zZSB0aGUgc2FtZSBxdWVyeSBzdXJmYWNlLiAqL1xudHlwZSBRdWVyeWFibGUgPSBEYiB8IFR4O1xuXG50eXBlIFdvcmtJdGVtUm93ID0gdHlwZW9mIHdvcmtJdGVtcy4kaW5mZXJTZWxlY3Q7XG50eXBlIENsYWltUm93ID0gdHlwZW9mIGNsYWltcy4kaW5mZXJTZWxlY3Q7XG50eXBlIEZlYXR1cmVSb3cgPSB0eXBlb2YgZmVhdHVyZXMuJGluZmVyU2VsZWN0O1xudHlwZSBFdmVudFJvdyA9IHR5cGVvZiBldmVudHMuJGluZmVyU2VsZWN0O1xudHlwZSBBY3RvclJvdyA9IHR5cGVvZiBhY3RvcnMuJGluZmVyU2VsZWN0O1xudHlwZSBXb3Jrc3BhY2VTdGF0ZVJvdyA9IHR5cGVvZiB3b3Jrc3BhY2VTdGF0ZS4kaW5mZXJTZWxlY3Q7XG50eXBlIFRocmVhZFJvdyA9IHR5cGVvZiB0aHJlYWRzLiRpbmZlclNlbGVjdDtcbnR5cGUgTWVzc2FnZVJvdyA9IHR5cGVvZiBtZXNzYWdlcy4kaW5mZXJTZWxlY3Q7XG50eXBlIEFnZW50Sm9iUm93ID0gdHlwZW9mIGFnZW50Sm9icy4kaW5mZXJTZWxlY3Q7XG5cbi8qKiBUaGUgc2luZ2xlIHdvcmtzcGFjZV9zdGF0ZSByb3cga2V5IChhbmQgdGhlIHdvcmtzcGFjZSBldmVudC1zdHJlYW0gaWQpLiAqL1xuY29uc3QgV09SS1NQQUNFX0lEID0gJ3dvcmtzcGFjZSc7XG5cbmNvbnN0IFJBTks6IFJlY29yZDxXb3JrSXRlbVN0YXRlLCBudW1iZXI+ID0gT2JqZWN0LmZyb21FbnRyaWVzKFxuICBXT1JLX0lURU1fU1RBVEVTLm1hcCgocywgaSkgPT4gW3MsIGldKSxcbikgYXMgUmVjb3JkPFdvcmtJdGVtU3RhdGUsIG51bWJlcj47XG5cbi8qKiBNaXJyb3Igb2YgdGhlIHJlZmVyZW5jZSB0cmFuc2l0aW9uIHRhYmxlIChlbmdpbmUudHMpIFx1MjAxNCBkbyBub3QgZGl2ZXJnZS4gKi9cbmludGVyZmFjZSBUcmFuc2l0aW9uUnVsZSB7XG4gIGZyb206IFdvcmtJdGVtU3RhdGU7XG4gIHRvOiBXb3JrSXRlbVN0YXRlO1xuICBwZXJtaXNzaW9uOiBQZXJtaXNzaW9uO1xuICBjbGFpbVJlcXVpcmVkOiBib29sZWFuO1xuICBndWFyZHM6IEFycmF5PCdkZXBzX2RvbmUnIHwgJ3NwZWNfZ2F0ZV9pZl9jaGVja3BvaW50JyB8ICdub25lbXB0eV9kaWZmJz47XG59XG5cbmNvbnN0IFRSQU5TSVRJT05TOiBUcmFuc2l0aW9uUnVsZVtdID0gW1xuICB7IGZyb206ICdiYWNrbG9nJywgdG86ICdkcmFmdCcsIHBlcm1pc3Npb246ICd0YXNrLnBsYW4nLCBjbGFpbVJlcXVpcmVkOiBmYWxzZSwgZ3VhcmRzOiBbXSB9LFxuICB7XG4gICAgZnJvbTogJ2RyYWZ0JyxcbiAgICB0bzogJ3JlYWR5X2Zvcl9kZXYnLFxuICAgIHBlcm1pc3Npb246ICd0YXNrLnBsYW4nLFxuICAgIGNsYWltUmVxdWlyZWQ6IGZhbHNlLFxuICAgIGd1YXJkczogWydzcGVjX2dhdGVfaWZfY2hlY2twb2ludCddLFxuICB9LFxuICB7XG4gICAgZnJvbTogJ3JlYWR5X2Zvcl9kZXYnLFxuICAgIHRvOiAnaW5fcHJvZ3Jlc3MnLFxuICAgIHBlcm1pc3Npb246ICd0YXNrLmFkdmFuY2UnLFxuICAgIGNsYWltUmVxdWlyZWQ6IHRydWUsXG4gICAgZ3VhcmRzOiBbJ2RlcHNfZG9uZSddLFxuICB9LFxuICB7XG4gICAgZnJvbTogJ2luX3Byb2dyZXNzJyxcbiAgICB0bzogJ2luX3JldmlldycsXG4gICAgcGVybWlzc2lvbjogJ3Rhc2suYWR2YW5jZScsXG4gICAgY2xhaW1SZXF1aXJlZDogdHJ1ZSxcbiAgICBndWFyZHM6IFsnbm9uZW1wdHlfZGlmZiddLFxuICB9LFxuXTtcblxuY29uc3QgTEVHQUNZX1NUQVRVUzogUmVjb3JkPHN0cmluZywgV29ya0l0ZW1TdGF0ZT4gPSB7XG4gIGJhY2tsb2c6ICdiYWNrbG9nJyxcbiAgZHJhZnQ6ICdkcmFmdCcsXG4gICdyZWFkeS1mb3ItZGV2JzogJ3JlYWR5X2Zvcl9kZXYnLFxuICByZWFkeV9mb3JfZGV2OiAncmVhZHlfZm9yX2RldicsXG4gICdpbi1wcm9ncmVzcyc6ICdpbl9wcm9ncmVzcycsXG4gIGluX3Byb2dyZXNzOiAnaW5fcHJvZ3Jlc3MnLFxuICAnaW4tcmV2aWV3JzogJ2luX3JldmlldycsXG4gIGluX3JldmlldzogJ2luX3JldmlldycsXG4gIHJldmlldzogJ2luX3JldmlldycsXG4gIGRvbmU6ICdkb25lJyxcbn07XG5cbi8qKiBQb3N0Z3JlcyB1bmlxdWUtdmlvbGF0aW9uIGRldGVjdG9yICh3YWxrcyBkcml6emxlJ3Mgd3JhcHBlZCBjYXVzZXMpLiAqL1xuZnVuY3Rpb24gaXNVbmlxdWVWaW9sYXRpb24oZXJyb3I6IHVua25vd24pOiBib29sZWFuIHtcbiAgbGV0IGN1cnJlbnQ6IHVua25vd24gPSBlcnJvcjtcbiAgZm9yIChsZXQgZGVwdGggPSAwOyBkZXB0aCA8IDUgJiYgY3VycmVudCAhPT0gbnVsbCAmJiB0eXBlb2YgY3VycmVudCA9PT0gJ29iamVjdCc7IGRlcHRoICs9IDEpIHtcbiAgICBjb25zdCBlcnIgPSBjdXJyZW50IGFzIHsgY29kZT86IHVua25vd247IG1lc3NhZ2U/OiB1bmtub3duOyBjYXVzZT86IHVua25vd24gfTtcbiAgICBpZiAoZXJyLmNvZGUgPT09ICcyMzUwNScpIHJldHVybiB0cnVlO1xuICAgIGlmICh0eXBlb2YgZXJyLm1lc3NhZ2UgPT09ICdzdHJpbmcnICYmIC9kdXBsaWNhdGUga2V5IHZhbHVlIHZpb2xhdGVzIHVuaXF1ZS9pLnRlc3QoZXJyLm1lc3NhZ2UpKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgY3VycmVudCA9IGVyci5jYXVzZTtcbiAgfVxuICByZXR1cm4gZmFsc2U7XG59XG5cbmV4cG9ydCBjbGFzcyBQZ0VuZ2luZSB7XG4gIC8qKiBFbmdpbmUgY2xvY2sgaW4gbXMgXHUyMDE0IHRoZSBPTkxZIHRpbWUgc291cmNlIGZvciBsZWFzZSBsb2dpYy4gKi9cbiAgcHJpdmF0ZSBub3cgPSAwO1xuICBwcml2YXRlIHNlcSA9IDA7XG4gIHByaXZhdGUgc3lzdGVtQWN0b3JJZCA9ICcnO1xuXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgcmVhZG9ubHkgZGI6IERiKSB7fVxuXG4gIC8qKlxuICAgKiBQb3N0LXJlc2V0IHNldHVwOiB0aGUgcGVyLXdvcmtzcGFjZSBzeXN0ZW0gYWN0b3IgKHJvYWRtYXAgXHUwMEE3MS4yKS5cbiAgICpcbiAgICogSWRlbXBvdGVudCBmb3IgcGVyc2lzdGVudCBkYXRhYmFzZXMgKHN0b3J5IDEzLCBgb2FocyBzZXJ2ZSAtLWRhdGFgKTogYVxuICAgKiByZXN0YXJ0IG92ZXIgYW4gZXhpc3RpbmcgUEdsaXRlIGRhdGEgZGlyZWN0b3J5IGZpbmRzIHRoZSBzeXN0ZW0gYWN0b3JcbiAgICogYWxyZWFkeSBwcmVzZW50LCByZXVzZXMgaXQsIGFuZCByZWNvdmVycyB0aGUgaWQgY291bnRlciBmcm9tIHRoZSBzdG9yZWRcbiAgICogaWRzIHNvIGZyZXNobHktY3JlYXRlZCBlbnRpdGllcyBuZXZlciBjb2xsaWRlIHdpdGggcGVyc2lzdGVkIG9uZXMuIEFcbiAgICogZnJlc2ggKG9yIHRydW5jYXRlZCkgZGF0YWJhc2UgdGFrZXMgdGhlIG9yaWdpbmFsIHBhdGggdW5jaGFuZ2VkLCBzbyB0aGVcbiAgICogY29uZm9ybWFuY2Ugc3VpdGUgc2VtYW50aWNzIGFyZSB1bnRvdWNoZWQuXG4gICAqL1xuICBhc3luYyBpbml0KCk6IFByb21pc2U8dm9pZD4ge1xuICAgIC8vIFNpbmdsZS1yb3cgcGxhbi9wb2xpY3kgcHJvamVjdGlvbiAoUGhhc2UgMiwgcm9hZG1hcCBcdTAwQTczKS4gb25Db25mbGljdERvTm90aGluZ1xuICAgIC8vIGtlZXBzIHRoaXMgaWRlbXBvdGVudCBmb3IgZHVyYWJsZSByZXN0YXJ0cyBcdTIwMTQgYW4gZXhpc3RpbmcgcGxhbiBzdXJ2aXZlcy5cbiAgICBhd2FpdCB0aGlzLmRiXG4gICAgICAuaW5zZXJ0KHdvcmtzcGFjZVN0YXRlKVxuICAgICAgLnZhbHVlcyh7IGlkOiBXT1JLU1BBQ0VfSUQsIHBsYW46IERFRkFVTFRfUExBTiwgcGxhblZlcnNpb246IDEsIHBvbGljeToge30sIHBvbGljeVZlcnNpb246IDEgfSlcbiAgICAgIC5vbkNvbmZsaWN0RG9Ob3RoaW5nKCk7XG4gICAgY29uc3QgZXhpc3RpbmcgPSBhd2FpdCB0aGlzLmRiXG4gICAgICAuc2VsZWN0KHsgaWQ6IGFjdG9ycy5pZCB9KVxuICAgICAgLmZyb20oYWN0b3JzKVxuICAgICAgLndoZXJlKGVxKGFjdG9ycy50eXBlLCAnc3lzdGVtJykpXG4gICAgICAubGltaXQoMSk7XG4gICAgY29uc3QgZm91bmQgPSBleGlzdGluZ1swXTtcbiAgICBpZiAoZm91bmQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhpcy5zeXN0ZW1BY3RvcklkID0gZm91bmQuaWQ7XG4gICAgICB0aGlzLnNlcSA9IGF3YWl0IHRoaXMucmVjb3ZlclNlcSgpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLnN5c3RlbUFjdG9ySWQgPSB0aGlzLm5leHRJZCgnYWN0b3Itc3lzdGVtJyk7XG4gICAgYXdhaXQgdGhpcy5kYi5pbnNlcnQoYWN0b3JzKS52YWx1ZXMoe1xuICAgICAgaWQ6IHRoaXMuc3lzdGVtQWN0b3JJZCxcbiAgICAgIHR5cGU6ICdzeXN0ZW0nLFxuICAgICAgZGlzcGxheU5hbWU6ICdzeXN0ZW0nLFxuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIExhcmdlc3QgbmV4dElkKCkgc3VmZml4IHN0b3JlZCBpbiBhbnkgdGV4dC1pZCB0YWJsZSBcdTIwMTQgcmVzdGFydC1zYWZlIGlkXG4gICAqIGdlbmVyYXRpb24gZm9yIHBlcnNpc3RlbnQgZGF0YSBkaXJlY3Rvcmllcy4gSWRzIGFyZSBgJHtwcmVmaXh9XyR7YmFzZTM2fWAuXG4gICAqL1xuICBwcml2YXRlIGFzeW5jIHJlY292ZXJTZXEoKTogUHJvbWlzZTxudW1iZXI+IHtcbiAgICBjb25zdCBpZHM6IHN0cmluZ1tdID0gW107XG4gICAgaWRzLnB1c2goLi4uKGF3YWl0IHRoaXMuZGIuc2VsZWN0KHsgaWQ6IGFjdG9ycy5pZCB9KS5mcm9tKGFjdG9ycykpLm1hcCgocikgPT4gci5pZCkpO1xuICAgIGlkcy5wdXNoKC4uLihhd2FpdCB0aGlzLmRiLnNlbGVjdCh7IGlkOiBmZWF0dXJlcy5pZCB9KS5mcm9tKGZlYXR1cmVzKSkubWFwKChyKSA9PiByLmlkKSk7XG4gICAgaWRzLnB1c2goLi4uKGF3YWl0IHRoaXMuZGIuc2VsZWN0KHsgaWQ6IHdvcmtJdGVtcy5pZCB9KS5mcm9tKHdvcmtJdGVtcykpLm1hcCgocikgPT4gci5pZCkpO1xuICAgIGlkcy5wdXNoKC4uLihhd2FpdCB0aGlzLmRiLnNlbGVjdCh7IGlkOiBjbGFpbXMuaWQgfSkuZnJvbShjbGFpbXMpKS5tYXAoKHIpID0+IHIuaWQpKTtcbiAgICAvLyBQaGFzZSAzIChyb2FkbWFwIFx1MDBBNzUpOiB0aHJlYWRzL21lc3NhZ2VzL2pvYnMvbm90aWZpY2F0aW9ucyBhcmUgZHVyYWJsZSB0b28uXG4gICAgaWRzLnB1c2goLi4uKGF3YWl0IHRoaXMuZGIuc2VsZWN0KHsgaWQ6IHRocmVhZHMuaWQgfSkuZnJvbSh0aHJlYWRzKSkubWFwKChyKSA9PiByLmlkKSk7XG4gICAgaWRzLnB1c2goLi4uKGF3YWl0IHRoaXMuZGIuc2VsZWN0KHsgaWQ6IG1lc3NhZ2VzLmlkIH0pLmZyb20obWVzc2FnZXMpKS5tYXAoKHIpID0+IHIuaWQpKTtcbiAgICBpZHMucHVzaCguLi4oYXdhaXQgdGhpcy5kYi5zZWxlY3QoeyBpZDogYWdlbnRKb2JzLmlkIH0pLmZyb20oYWdlbnRKb2JzKSkubWFwKChyKSA9PiByLmlkKSk7XG4gICAgaWRzLnB1c2goLi4uKGF3YWl0IHRoaXMuZGIuc2VsZWN0KHsgaWQ6IG5vdGlmaWNhdGlvbnMuaWQgfSkuZnJvbShub3RpZmljYXRpb25zKSkubWFwKChyKSA9PiByLmlkKSk7XG4gICAgbGV0IG1heCA9IDA7XG4gICAgZm9yIChjb25zdCBpZCBvZiBpZHMpIHtcbiAgICAgIGNvbnN0IHNlcCA9IGlkLmxhc3RJbmRleE9mKCdfJyk7XG4gICAgICBpZiAoc2VwIDwgMCkgY29udGludWU7XG4gICAgICBjb25zdCBuID0gTnVtYmVyLnBhcnNlSW50KGlkLnNsaWNlKHNlcCArIDEpLCAzNik7XG4gICAgICBpZiAoTnVtYmVyLmlzRmluaXRlKG4pICYmIG4gPiBtYXgpIG1heCA9IG47XG4gICAgfVxuICAgIHJldHVybiBtYXg7XG4gIH1cblxuICAvLyAtLSBpbmZyYXN0cnVjdHVyZSAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIHByaXZhdGUgbmV4dElkKHByZWZpeDogc3RyaW5nKTogc3RyaW5nIHtcbiAgICB0aGlzLnNlcSArPSAxO1xuICAgIHJldHVybiBgJHtwcmVmaXh9XyR7dGhpcy5zZXEudG9TdHJpbmcoMzYpLnBhZFN0YXJ0KDYsICcwJyl9YDtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgYXBwZW5kVHgoXG4gICAgdHg6IFF1ZXJ5YWJsZSxcbiAgICBzdHJlYW1UeXBlOiBTcGluZUV2ZW50WydzdHJlYW1UeXBlJ10sXG4gICAgc3RyZWFtSWQ6IHN0cmluZyxcbiAgICB0eXBlOiBzdHJpbmcsXG4gICAgYWN0b3JJZDogc3RyaW5nLFxuICAgIHBheWxvYWQ6IFJlY29yZDxzdHJpbmcsIHVua25vd24+LFxuICAgIGV4dHJhPzogeyBjYXVzYXRpb25JZD86IHN0cmluZzsgaWRlbXBvdGVuY3lLZXk/OiBzdHJpbmcgfSxcbiAgKTogUHJvbWlzZTxTcGluZUV2ZW50PiB7XG4gICAgLy8gc3RyZWFtX3NlcSBpcyAxLWJhc2VkIGFuZCBnYXAtZnJlZSBwZXIgc3RyZWFtIChcdTAwQTcxLjUpOyBjb21wdXRlZCBpbiB0aGVcbiAgICAvLyBzYW1lIHRyYW5zYWN0aW9uIGFzIHRoZSBwcm9qZWN0aW9uIHVwZGF0ZSwgc28gVU5JUVVFKHN0cmVhbV9pZCxcbiAgICAvLyBzdHJlYW1fc2VxKSBkb3VibGVzIGFzIHRoZSBvcHRpbWlzdGljIGxvY2suXG4gICAgY29uc3QgW3Jvd10gPSBhd2FpdCB0eFxuICAgICAgLnNlbGVjdCh7IG1heFNlcTogc3FsPG51bWJlcj5gY29hbGVzY2UobWF4KCR7ZXZlbnRzLnN0cmVhbVNlcX0pLCAwKWAgfSlcbiAgICAgIC5mcm9tKGV2ZW50cylcbiAgICAgIC53aGVyZShlcShldmVudHMuc3RyZWFtSWQsIHN0cmVhbUlkKSk7XG4gICAgY29uc3Qgc3RyZWFtU2VxID0gTnVtYmVyKHJvdz8ubWF4U2VxID8/IDApICsgMTtcbiAgICBjb25zdCBpbnNlcnRlZCA9IGF3YWl0IHR4XG4gICAgICAuaW5zZXJ0KGV2ZW50cylcbiAgICAgIC52YWx1ZXMoe1xuICAgICAgICBzdHJlYW1UeXBlLFxuICAgICAgICBzdHJlYW1JZCxcbiAgICAgICAgc3RyZWFtU2VxLFxuICAgICAgICB0eXBlLFxuICAgICAgICBhY3RvcklkLFxuICAgICAgICBwYXlsb2FkLFxuICAgICAgICBjYXVzYXRpb25JZDogZXh0cmE/LmNhdXNhdGlvbklkID8/IG51bGwsXG4gICAgICAgIGlkZW1wb3RlbmN5S2V5OiBleHRyYT8uaWRlbXBvdGVuY3lLZXkgPz8gbnVsbCxcbiAgICAgIH0pXG4gICAgICAucmV0dXJuaW5nKHsgZ2xvYmFsU2VxOiBldmVudHMuZ2xvYmFsU2VxIH0pO1xuICAgIGNvbnN0IGdsb2JhbFNlcSA9IGluc2VydGVkWzBdPy5nbG9iYWxTZXE7XG4gICAgaWYgKGdsb2JhbFNlcSA9PT0gdW5kZWZpbmVkKSB0aHJvdyBuZXcgRXJyb3IoJ2V2ZW50IGluc2VydCByZXR1cm5lZCBubyBnbG9iYWxfc2VxJyk7XG4gICAgcmV0dXJuIHtcbiAgICAgIGdsb2JhbFNlcSxcbiAgICAgIHN0cmVhbVR5cGUsXG4gICAgICBzdHJlYW1JZCxcbiAgICAgIHN0cmVhbVNlcSxcbiAgICAgIHR5cGUsXG4gICAgICBhY3RvcklkLFxuICAgICAgcGF5bG9hZCxcbiAgICAgIC4uLihleHRyYT8uY2F1c2F0aW9uSWQgIT09IHVuZGVmaW5lZCA/IHsgY2F1c2F0aW9uSWQ6IGV4dHJhLmNhdXNhdGlvbklkIH0gOiB7fSksXG4gICAgfTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgbXVzdEdldEl0ZW0od29ya0l0ZW1JZDogc3RyaW5nKTogUHJvbWlzZTxXb3JrSXRlbVJvdz4ge1xuICAgIGNvbnN0IGJ5SWQgPSBhd2FpdCB0aGlzLmRiLnNlbGVjdCgpLmZyb20od29ya0l0ZW1zKS53aGVyZShlcSh3b3JrSXRlbXMuaWQsIHdvcmtJdGVtSWQpKS5saW1pdCgxKTtcbiAgICBpZiAoYnlJZFswXSkgcmV0dXJuIGJ5SWRbMF07XG4gICAgLy8gSW1wb3J0ZWQgc3RvcmllcyBhcmUgYWRkcmVzc2VkIGJ5IHRoZWlyIGV4dGVybmFsS2V5IGhhbmRsZTsgZmlyc3RcbiAgICAvLyB3cml0ZXIgd2lucyBcdTIwMTQgdGhlIGVhcmxpZXN0LWNyZWF0ZWQgcm93IHJlc29sdmVzIChjb25mb3JtYW5jZSBwaW4gaW5cbiAgICAvLyBzdG9yaWVzLWltcG9ydC50ZXN0LnRzLCBtaXJyb3JlZCBmcm9tIHRoZSByZWZlcmVuY2UgZXh0ZXJuYWxLZXlJbmRleCkuXG4gICAgY29uc3QgYnlLZXkgPSBhd2FpdCB0aGlzLmRiXG4gICAgICAuc2VsZWN0KClcbiAgICAgIC5mcm9tKHdvcmtJdGVtcylcbiAgICAgIC53aGVyZShlcSh3b3JrSXRlbXMuZXh0ZXJuYWxLZXksIHdvcmtJdGVtSWQpKVxuICAgICAgLm9yZGVyQnkoYXNjKHdvcmtJdGVtcy5zZXEpKVxuICAgICAgLmxpbWl0KDEpO1xuICAgIGlmIChieUtleVswXSkgcmV0dXJuIGJ5S2V5WzBdO1xuICAgIHRocm93IG5ldyBHdWFyZEZhaWxlZEVycm9yKGB1bmtub3duIHdvcmsgaXRlbTogJHt3b3JrSXRlbUlkfWApO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBnZXRGZWF0dXJlUm93KGZlYXR1cmVJZDogc3RyaW5nLCB0eDogUXVlcnlhYmxlID0gdGhpcy5kYik6IFByb21pc2U8RmVhdHVyZVJvdyB8IG51bGw+IHtcbiAgICBjb25zdCByb3dzID0gYXdhaXQgdHguc2VsZWN0KCkuZnJvbShmZWF0dXJlcykud2hlcmUoZXEoZmVhdHVyZXMuaWQsIGZlYXR1cmVJZCkpLmxpbWl0KDEpO1xuICAgIHJldHVybiByb3dzWzBdID8/IG51bGw7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIGdldEFjdG9yUm93KGFjdG9ySWQ6IHN0cmluZywgdHg6IFF1ZXJ5YWJsZSA9IHRoaXMuZGIpOiBQcm9taXNlPEFjdG9yUm93IHwgbnVsbD4ge1xuICAgIGNvbnN0IHJvd3MgPSBhd2FpdCB0eC5zZWxlY3QoKS5mcm9tKGFjdG9ycykud2hlcmUoZXEoYWN0b3JzLmlkLCBhY3RvcklkKSkubGltaXQoMSk7XG4gICAgcmV0dXJuIHJvd3NbMF0gPz8gbnVsbDtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgd29ya3NwYWNlUm93KHR4OiBRdWVyeWFibGUgPSB0aGlzLmRiKTogUHJvbWlzZTxXb3Jrc3BhY2VTdGF0ZVJvdz4ge1xuICAgIGNvbnN0IHJvd3MgPSBhd2FpdCB0eC5zZWxlY3QoKS5mcm9tKHdvcmtzcGFjZVN0YXRlKS53aGVyZShlcSh3b3Jrc3BhY2VTdGF0ZS5pZCwgV09SS1NQQUNFX0lEKSkubGltaXQoMSk7XG4gICAgY29uc3Qgcm93ID0gcm93c1swXTtcbiAgICBpZiAocm93KSByZXR1cm4gcm93O1xuICAgIC8vIGluaXQoKSBzZWVkcyB0aGUgcm93OyB0aGlzIGRlZmF1bHQgb25seSBndWFyZHMgYSBub3QteWV0LWluaXRpYWxpemVkIHJlYWQuXG4gICAgcmV0dXJuIHsgaWQ6IFdPUktTUEFDRV9JRCwgcGxhbjogREVGQVVMVF9QTEFOLCBwbGFuVmVyc2lvbjogMSwgcG9saWN5OiB7fSwgcG9saWN5VmVyc2lvbjogMSB9O1xuICB9XG5cbiAgLyoqXG4gICAqIEVudGl0bGVtZW50IHJlc29sdXRpb24gXHUyMDE0IGEgUFVSRSBmdW5jdGlvbiBvdmVyIHBsYW4gXHUwMEQ3IGdvdmVybmFuY2UgXHUwMEQ3XG4gICAqIGRlbGl2ZXJ5LXJvbGUgZGF0YSAocm9hZG1hcCBcdTAwQTczKSwgbWlycm9yaW5nIHRoZSByZWZlcmVuY2UgZW5naW5lLiBBIGdyYW50XG4gICAqIG1heSBFWElTVCAoZGlyZWN0IG9yIHZpYSBhIHJvbGUpIGFuZCBzdGlsbCBub3QgUkVTT0xWRSBmb3IgYW4gYWdlbnQgd2hlblxuICAgKiB0aGUgcGxhbiBjZWlsaW5nIG9yIHRoZSByZXN0cmljdC1vbmx5IHdvcmtzcGFjZSBwb2xpY3kgbmFycm93cyBpdC4gVXNlcnNcbiAgICogYXJlIG5ldmVyIHBsYW4tZmlsdGVyZWQuXG4gICAqL1xuICBwcml2YXRlIGFzeW5jIGdyYW50U291cmNlKGFjdG9ySWQ6IHN0cmluZywgcGVybWlzc2lvbjogUGVybWlzc2lvbik6IFByb21pc2U8c3RyaW5nIHwgbnVsbD4ge1xuICAgIGNvbnN0IGRpcmVjdCA9IGF3YWl0IHRoaXMuZGJcbiAgICAgIC5zZWxlY3QoeyBwZXJtaXNzaW9uOiBncmFudHMucGVybWlzc2lvbiB9KVxuICAgICAgLmZyb20oZ3JhbnRzKVxuICAgICAgLndoZXJlKGFuZChlcShncmFudHMuYWN0b3JJZCwgYWN0b3JJZCksIGVxKGdyYW50cy5wZXJtaXNzaW9uLCBwZXJtaXNzaW9uKSkpXG4gICAgICAubGltaXQoMSk7XG4gICAgaWYgKGRpcmVjdC5sZW5ndGggPiAwKSByZXR1cm4gJ2RpcmVjdCc7XG4gICAgY29uc3QgYXNzaWdubWVudHMgPSBhd2FpdCB0aGlzLmRiXG4gICAgICAuc2VsZWN0KClcbiAgICAgIC5mcm9tKHJvbGVBc3NpZ25tZW50cylcbiAgICAgIC53aGVyZShhbmQoZXEocm9sZUFzc2lnbm1lbnRzLmFjdG9ySWQsIGFjdG9ySWQpLCBlcShyb2xlQXNzaWdubWVudHMucmV2b2tlZCwgZmFsc2UpKSlcbiAgICAgIC5vcmRlckJ5KGFzYyhyb2xlQXNzaWdubWVudHMuc2VxKSk7XG4gICAgZm9yIChjb25zdCBhc3NpZ25tZW50IG9mIGFzc2lnbm1lbnRzKSB7XG4gICAgICBpZiAoKERFTElWRVJZX1JPTEVTW2Fzc2lnbm1lbnQucm9sZUNvZGVdID8/IFtdKS5pbmNsdWRlcyhwZXJtaXNzaW9uKSkge1xuICAgICAgICByZXR1cm4gYHJvbGU6JHthc3NpZ25tZW50LnJvbGVDb2RlfWA7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgcHJpdmF0ZSBhZ2VudENlaWxpbmdBbGxvd3MoXG4gICAgYWN0b3I6IEFjdG9yUm93IHwgbnVsbCxcbiAgICBwZXJtaXNzaW9uOiBQZXJtaXNzaW9uLFxuICAgIHdvcmtzcGFjZTogV29ya3NwYWNlU3RhdGVSb3csXG4gICk6IHsgcGxhbjogYm9vbGVhbjsgcG9saWN5OiBib29sZWFuIH0ge1xuICAgIGlmICghYWN0b3IgfHwgYWN0b3IudHlwZSAhPT0gJ2FnZW50JykgcmV0dXJuIHsgcGxhbjogdHJ1ZSwgcG9saWN5OiB0cnVlIH07XG4gICAgY29uc3QgY2VpbGluZyA9IFBMQU5fQ0VJTElOR1Nbd29ya3NwYWNlLnBsYW4gYXMgUGxhbkNvZGVdO1xuICAgIGNvbnN0IHBvbGljeSA9IHdvcmtzcGFjZS5wb2xpY3kgYXMgV29ya3NwYWNlUG9saWN5O1xuICAgIGlmICgoQUdFTlRfR0FURV9BUFBST1ZFX1BFUk1JU1NJT05TIGFzIHJlYWRvbmx5IHN0cmluZ1tdKS5pbmNsdWRlcyhwZXJtaXNzaW9uKSkge1xuICAgICAgcmV0dXJuIHsgcGxhbjogY2VpbGluZy5hZ2VudEdhdGVBcHByb3ZlLCBwb2xpY3k6IHBvbGljeS5hZ2VudEdhdGVBcHByb3ZhbHMgIT09IGZhbHNlIH07XG4gICAgfVxuICAgIGlmIChwZXJtaXNzaW9uID09PSAnZ2F0ZS5yZXZpZXcucmVqZWN0Jykge1xuICAgICAgcmV0dXJuIHsgcGxhbjogY2VpbGluZy5hZ2VudEdhdGVSZWplY3QsIHBvbGljeTogdHJ1ZSB9O1xuICAgIH1cbiAgICBpZiAocGVybWlzc2lvbiA9PT0gJ3Rhc2suY2xhaW0nKSB7XG4gICAgICByZXR1cm4geyBwbGFuOiB0cnVlLCBwb2xpY3k6IHBvbGljeS5hZ2VudFNlbGZEaXNwYXRjaCAhPT0gZmFsc2UgfTtcbiAgICB9XG4gICAgcmV0dXJuIHsgcGxhbjogdHJ1ZSwgcG9saWN5OiB0cnVlIH07XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIGhhc1Blcm1pc3Npb24oYWN0b3JJZDogc3RyaW5nLCBwZXJtaXNzaW9uOiBQZXJtaXNzaW9uKTogUHJvbWlzZTxib29sZWFuPiB7XG4gICAgaWYgKChhd2FpdCB0aGlzLmdyYW50U291cmNlKGFjdG9ySWQsIHBlcm1pc3Npb24pKSA9PT0gbnVsbCkgcmV0dXJuIGZhbHNlO1xuICAgIGNvbnN0IGFsbG93cyA9IHRoaXMuYWdlbnRDZWlsaW5nQWxsb3dzKGF3YWl0IHRoaXMuZ2V0QWN0b3JSb3coYWN0b3JJZCksIHBlcm1pc3Npb24sIGF3YWl0IHRoaXMud29ya3NwYWNlUm93KCkpO1xuICAgIHJldHVybiBhbGxvd3MucGxhbiAmJiBhbGxvd3MucG9saWN5O1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyByZXF1aXJlUGVybWlzc2lvbihhY3RvcklkOiBzdHJpbmcsIHBlcm1pc3Npb246IFBlcm1pc3Npb24pOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBpZiAoIShhd2FpdCB0aGlzLmhhc1Blcm1pc3Npb24oYWN0b3JJZCwgcGVybWlzc2lvbikpKSB7XG4gICAgICB0aHJvdyBuZXcgUGVybWlzc2lvbkRlbmllZEVycm9yKHBlcm1pc3Npb24sIGFjdG9ySWQpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgcmVxdWlyZUdvdmVybmFuY2VBZG1pbihieUFjdG9ySWQ6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xuICAgIGlmIChieUFjdG9ySWQgPT09IHRoaXMuc3lzdGVtQWN0b3JJZCkgcmV0dXJuO1xuICAgIGNvbnN0IGFjdG9yID0gYXdhaXQgdGhpcy5nZXRBY3RvclJvdyhieUFjdG9ySWQpO1xuICAgIGlmIChhY3Rvcj8uZ292ZXJuYW5jZVJvbGUgPT09ICdhZG1pbicpIHJldHVybjtcbiAgICB0aHJvdyBuZXcgUGVybWlzc2lvbkRlbmllZEVycm9yKCdnb3Zlcm5hbmNlLmFkbWluJywgYnlBY3RvcklkKTtcbiAgfVxuXG4gIC8qKiBHcmFudC10aW1lIHBsYW4gY2VpbGluZzogcmVmdXNlIGlzc3VpbmcgYWdlbnQgZ2F0ZSBwZXJtaXNzaW9ucyB0aGUgcGxhbiBmb3JiaWRzLiAqL1xuICBwcml2YXRlIGFzeW5jIGNoZWNrR3JhbnRDZWlsaW5nKGFjdG9ySWQ6IHN0cmluZywgcGVybWlzc2lvbjogUGVybWlzc2lvbik6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IGFjdG9yID0gYXdhaXQgdGhpcy5nZXRBY3RvclJvdyhhY3RvcklkKTtcbiAgICBpZiAoIWFjdG9yIHx8IGFjdG9yLnR5cGUgIT09ICdhZ2VudCcpIHJldHVybjtcbiAgICBjb25zdCB3b3Jrc3BhY2UgPSBhd2FpdCB0aGlzLndvcmtzcGFjZVJvdygpO1xuICAgIGNvbnN0IGNlaWxpbmcgPSBQTEFOX0NFSUxJTkdTW3dvcmtzcGFjZS5wbGFuIGFzIFBsYW5Db2RlXTtcbiAgICBpZiAoKEFHRU5UX0dBVEVfQVBQUk9WRV9QRVJNSVNTSU9OUyBhcyByZWFkb25seSBzdHJpbmdbXSkuaW5jbHVkZXMocGVybWlzc2lvbikgJiYgIWNlaWxpbmcuYWdlbnRHYXRlQXBwcm92ZSkge1xuICAgICAgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoYHBsYW4gJHt3b3Jrc3BhY2UucGxhbn0gZG9lcyBub3QgYWxsb3cgYWdlbnRzIHRvIGhvbGQgJHtwZXJtaXNzaW9ufWApO1xuICAgIH1cbiAgICBpZiAocGVybWlzc2lvbiA9PT0gJ2dhdGUucmV2aWV3LnJlamVjdCcgJiYgIWNlaWxpbmcuYWdlbnRHYXRlUmVqZWN0KSB7XG4gICAgICB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcihgcGxhbiAke3dvcmtzcGFjZS5wbGFufSBkb2VzIG5vdCBhbGxvdyBhZ2VudHMgdG8gaG9sZCAke3Blcm1pc3Npb259YCk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBsaXZlQ2xhaW0od29ya0l0ZW1JZDogc3RyaW5nKTogUHJvbWlzZTxDbGFpbVJvdyB8IG51bGw+IHtcbiAgICBjb25zdCByb3dzID0gYXdhaXQgdGhpcy5kYlxuICAgICAgLnNlbGVjdCgpXG4gICAgICAuZnJvbShjbGFpbXMpXG4gICAgICAud2hlcmUoXG4gICAgICAgIGFuZChcbiAgICAgICAgICBlcShjbGFpbXMud29ya0l0ZW1JZCwgd29ya0l0ZW1JZCksXG4gICAgICAgICAgZXEoY2xhaW1zLnJlbGVhc2VkLCBmYWxzZSksXG4gICAgICAgICAgZ3QoY2xhaW1zLmxlYXNlRXhwaXJlc0F0LCB0aGlzLm5vdyksXG4gICAgICAgICksXG4gICAgICApXG4gICAgICAub3JkZXJCeShhc2MoY2xhaW1zLnNlcSkpXG4gICAgICAubGltaXQoMSk7XG4gICAgcmV0dXJuIHJvd3NbMF0gPz8gbnVsbDtcbiAgfVxuXG4gIC8qKlxuICAgKiBBIFBSRVNFTlRFRCB0b2tlbiBpcyBhbHdheXMgdmFsaWRhdGVkLCBvbiBldmVyeSBjb21tYW5kIChjb25mb3JtYW5jZVxuICAgKiBwaW4sIGNsYWltcy50ZXN0LnRzKTogc3RhbGUvZm9yZWlnbi9uby1saXZlLWNsYWltIFx1MjE5MiBDb25mbGljdEVycm9yICsgYXVkaXRcbiAgICogZXZlbnQuIFRoZSBhdWRpdCBldmVudCBjb21taXRzIGluIGl0cyBPV04gdHJhbnNhY3Rpb24gXHUyMDE0IHRoZSBmYWlsaW5nXG4gICAqIGNvbW1hbmQncyB0cmFuc2FjdGlvbiAoaWYgYW55KSBtdXN0IG5vdCBzd2FsbG93IGl0LlxuICAgKi9cbiAgcHJpdmF0ZSBhc3luYyB2YWxpZGF0ZVByZXNlbnRlZFRva2VuKFxuICAgIGl0ZW06IFdvcmtJdGVtUm93LFxuICAgIGZlbmNpbmdUb2tlbjogbnVtYmVyIHwgdW5kZWZpbmVkLFxuICAgIGFjdG9ySWQ6IHN0cmluZyxcbiAgKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgaWYgKGZlbmNpbmdUb2tlbiA9PT0gdW5kZWZpbmVkKSByZXR1cm47XG4gICAgY29uc3QgbGl2ZSA9IGF3YWl0IHRoaXMubGl2ZUNsYWltKGl0ZW0uaWQpO1xuICAgIGlmIChsaXZlID09PSBudWxsIHx8IGxpdmUuZmVuY2luZ1Rva2VuICE9PSBmZW5jaW5nVG9rZW4pIHtcbiAgICAgIGF3YWl0IHRoaXMuZGIudHJhbnNhY3Rpb24oYXN5bmMgKHR4KSA9PiB7XG4gICAgICAgIGF3YWl0IHRoaXMuYXBwZW5kVHgodHgsICd3b3JrX2l0ZW0nLCBpdGVtLmlkLCAnZmVuY2luZy5yZWplY3RlZCcsIGFjdG9ySWQsIHtcbiAgICAgICAgICBwcmVzZW50ZWRUb2tlbjogZmVuY2luZ1Rva2VuLFxuICAgICAgICAgIGxpdmVUb2tlbjogbGl2ZT8uZmVuY2luZ1Rva2VuID8/IG51bGwsXG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgICB0aHJvdyBuZXcgQ29uZmxpY3RFcnJvcihgc3RhbGUgb3IgZm9yZWlnbiBmZW5jaW5nIHRva2VuIGZvciB3b3JrIGl0ZW0gJHtpdGVtLmlkfWApO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgcHVibGljSXRlbShyb3c6IFdvcmtJdGVtUm93KTogV29ya0l0ZW0ge1xuICAgIHJldHVybiB7XG4gICAgICBpZDogcm93LmlkLFxuICAgICAgZmVhdHVyZUlkOiByb3cuZmVhdHVyZUlkLFxuICAgICAgZXh0ZXJuYWxLZXk6IHJvdy5leHRlcm5hbEtleSxcbiAgICAgIGtpbmQ6IHJvdy5raW5kIGFzIFdvcmtJdGVtS2luZCxcbiAgICAgIHRpdGxlOiByb3cudGl0bGUsXG4gICAgICBzdGF0ZTogcm93LnN0YXRlIGFzIFdvcmtJdGVtU3RhdGUsXG4gICAgICBibG9ja2VkUmVhc29uOiAocm93LmJsb2NrZWRSZWFzb24gYXMgQmxvY2tlZFJlYXNvbiB8IG51bGwpID8/IG51bGwsXG4gICAgICByZXZpZXdMb29wSXRlcmF0aW9uOiByb3cucmV2aWV3TG9vcEl0ZXJhdGlvbixcbiAgICAgIGludGVudEhhc2g6IHJvdy5pbnRlbnRIYXNoLFxuICAgICAgcGlubmVkVmVyaWZpY2F0aW9uOiByb3cucGlubmVkVmVyaWZpY2F0aW9uID8gWy4uLnJvdy5waW5uZWRWZXJpZmljYXRpb25dIDogbnVsbCxcbiAgICAgIHNwZWNDaGVja3BvaW50OiByb3cuc3BlY0NoZWNrcG9pbnQsXG4gICAgICBkb25lQ2hlY2twb2ludDogcm93LmRvbmVDaGVja3BvaW50LFxuICAgICAgaW52b2tlRGV2V2l0aDogcm93Lmludm9rZURldldpdGgsXG4gICAgICBzcGVjUGF0aDogcm93LnNwZWNQYXRoLFxuICAgICAgc3RhdGVWZXJzaW9uOiByb3cuc3RhdGVWZXJzaW9uLFxuICAgIH07XG4gIH1cblxuICBwcml2YXRlIHB1YmxpY0ZlYXR1cmUocm93OiBGZWF0dXJlUm93KTogRmVhdHVyZSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGlkOiByb3cuaWQsXG4gICAgICBzdGF0ZTogcm93LnN0YXRlIGFzIEZlYXR1cmVbJ3N0YXRlJ10sXG4gICAgICBkaXNwYXRjaEhvbGQ6IHJvdy5kaXNwYXRjaEhvbGQsXG4gICAgfTtcbiAgfVxuXG4gIHByaXZhdGUgcHVibGljQ2xhaW0ocm93OiBDbGFpbVJvdyk6IENsYWltIHtcbiAgICByZXR1cm4ge1xuICAgICAgaWQ6IHJvdy5pZCxcbiAgICAgIHdvcmtJdGVtSWQ6IHJvdy53b3JrSXRlbUlkLFxuICAgICAgYWN0b3JJZDogcm93LmFjdG9ySWQsXG4gICAgICBmZW5jaW5nVG9rZW46IHJvdy5mZW5jaW5nVG9rZW4sXG4gICAgICBsZWFzZUV4cGlyZXNBdDogcm93LmxlYXNlRXhwaXJlc0F0LFxuICAgICAgcmVsZWFzZWQ6IHJvdy5yZWxlYXNlZCxcbiAgICB9O1xuICB9XG5cbiAgcHJpdmF0ZSBldmVudEZyb21Sb3cocm93OiBFdmVudFJvdyk6IFNwaW5lRXZlbnQge1xuICAgIHJldHVybiB7XG4gICAgICBnbG9iYWxTZXE6IHJvdy5nbG9iYWxTZXEsXG4gICAgICBzdHJlYW1UeXBlOiByb3cuc3RyZWFtVHlwZSBhcyBTcGluZUV2ZW50WydzdHJlYW1UeXBlJ10sXG4gICAgICBzdHJlYW1JZDogcm93LnN0cmVhbUlkLFxuICAgICAgc3RyZWFtU2VxOiByb3cuc3RyZWFtU2VxLFxuICAgICAgdHlwZTogcm93LnR5cGUsXG4gICAgICBhY3RvcklkOiByb3cuYWN0b3JJZCxcbiAgICAgIHBheWxvYWQ6IHJvdy5wYXlsb2FkLFxuICAgICAgLi4uKHJvdy5jYXVzYXRpb25JZCAhPT0gbnVsbCA/IHsgY2F1c2F0aW9uSWQ6IHJvdy5jYXVzYXRpb25JZCB9IDoge30pLFxuICAgIH07XG4gIH1cblxuICAvLyAtLSBzZXR1cCAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIGFzeW5jIGNyZWF0ZUFjdG9yKGlucHV0OiB7XG4gICAgdHlwZTogRXhjbHVkZTxBY3RvclR5cGUsICdzeXN0ZW0nPjtcbiAgICBkaXNwbGF5TmFtZTogc3RyaW5nO1xuICAgIGdvdmVybmFuY2VSb2xlPzogR292ZXJuYW5jZVJvbGU7XG4gICAgcGVyc29uYUNvZGU/OiBzdHJpbmc7XG4gIH0pOiBQcm9taXNlPEFjdG9yPiB7XG4gICAgY29uc3QgYWN0b3I6IEFjdG9yID0ge1xuICAgICAgaWQ6IHRoaXMubmV4dElkKCdhY3RvcicpLFxuICAgICAgdHlwZTogaW5wdXQudHlwZSxcbiAgICAgIGRpc3BsYXlOYW1lOiBpbnB1dC5kaXNwbGF5TmFtZSxcbiAgICAgIHBlcnNvbmFDb2RlOiBpbnB1dC5wZXJzb25hQ29kZSA/PyBudWxsLFxuICAgIH07XG4gICAgYXdhaXQgdGhpcy5kYi5pbnNlcnQoYWN0b3JzKS52YWx1ZXMoe1xuICAgICAgaWQ6IGFjdG9yLmlkLFxuICAgICAgdHlwZTogYWN0b3IudHlwZSxcbiAgICAgIGRpc3BsYXlOYW1lOiBhY3Rvci5kaXNwbGF5TmFtZSxcbiAgICAgIGdvdmVybmFuY2VSb2xlOiBpbnB1dC5nb3Zlcm5hbmNlUm9sZSA/PyAnbWVtYmVyJyxcbiAgICAgIHBlcnNvbmFDb2RlOiBhY3Rvci5wZXJzb25hQ29kZSxcbiAgICB9KTtcbiAgICByZXR1cm4gYWN0b3I7XG4gIH1cblxuICBwcml2YXRlIHB1YmxpY0FjdG9yKHJvdzogQWN0b3JSb3cpOiBBY3RvciB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGlkOiByb3cuaWQsXG4gICAgICB0eXBlOiByb3cudHlwZSBhcyBBY3RvclR5cGUsXG4gICAgICBkaXNwbGF5TmFtZTogcm93LmRpc3BsYXlOYW1lLFxuICAgICAgcGVyc29uYUNvZGU6IHJvdy5wZXJzb25hQ29kZSA/PyBudWxsLFxuICAgIH07XG4gIH1cblxuICAvKiogQWxsIGFjdG9ycywgcGVyc29uYXMgYW5kIHN5c3RlbSBpbmNsdWRlZCAodHJhbnNwYXJlbmN5IGZvciBwaWNrZXJzL2F1ZGl0KS4gKi9cbiAgYXN5bmMgbGlzdEFjdG9ycygpOiBQcm9taXNlPEFjdG9yW10+IHtcbiAgICBjb25zdCByb3dzID0gYXdhaXQgdGhpcy5kYi5zZWxlY3QoKS5mcm9tKGFjdG9ycykub3JkZXJCeShhc2MoYWN0b3JzLmlkKSk7XG4gICAgcmV0dXJuIHJvd3MubWFwKChyb3cpID0+IHRoaXMucHVibGljQWN0b3Iocm93KSk7XG4gIH1cblxuICAvKipcbiAgICogSWRlbXBvdGVudGx5IGNyZWF0ZSB0aGUgc2l4IEJNQUQgcGVyc29uYSBhZ2VudCBhY3RvcnMgd2l0aCBmbG9vci1zdGF0ZVxuICAgKiByb2xlcyAoUGhhc2UgNCwgcm9hZG1hcCBcdTAwQTczKS4gR2F0ZWQgd3JpdGUuIElkZW1wb3RlbmN5IGlzIERVUkFCTEU6IHRoZVxuICAgKiBsb29rdXAga2V5cyBvbiB0aGUgcGVyc2lzdGVkIHBlcnNvbmFfY29kZSBjb2x1bW4sIHNvIGEgcmVzdGFydCBvdmVyIGFuXG4gICAqIGV4aXN0aW5nIGRhdGEgZGlyZWN0b3J5IHJlLXByb3Zpc2lvbnMgbm90aGluZy5cbiAgICovXG4gIGFzeW5jIHByb3Zpc2lvblBlcnNvbmFzKGlucHV0OiB7IGJ5QWN0b3JJZDogc3RyaW5nIH0pOiBQcm9taXNlPEFjdG9yW10+IHtcbiAgICBhd2FpdCB0aGlzLnJlcXVpcmVHb3Zlcm5hbmNlQWRtaW4oaW5wdXQuYnlBY3RvcklkKTtcbiAgICBjb25zdCBwcm92aXNpb25lZDogQWN0b3JbXSA9IFtdO1xuICAgIGZvciAoY29uc3QgcGVyc29uYSBvZiBQRVJTT05BUykge1xuICAgICAgY29uc3QgZXhpc3RpbmcgPSBhd2FpdCB0aGlzLmRiXG4gICAgICAgIC5zZWxlY3QoKVxuICAgICAgICAuZnJvbShhY3RvcnMpXG4gICAgICAgIC53aGVyZShlcShhY3RvcnMucGVyc29uYUNvZGUsIHBlcnNvbmEucGVyc29uYUNvZGUpKVxuICAgICAgICAub3JkZXJCeShhc2MoYWN0b3JzLmlkKSlcbiAgICAgICAgLmxpbWl0KDEpO1xuICAgICAgbGV0IGFjdG9yOiBBY3RvcjtcbiAgICAgIGlmIChleGlzdGluZ1swXSkge1xuICAgICAgICBhY3RvciA9IHRoaXMucHVibGljQWN0b3IoZXhpc3RpbmdbMF0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgYWN0b3IgPSBhd2FpdCB0aGlzLmNyZWF0ZUFjdG9yKHtcbiAgICAgICAgICB0eXBlOiAnYWdlbnQnLFxuICAgICAgICAgIGRpc3BsYXlOYW1lOiBwZXJzb25hLmRpc3BsYXlOYW1lLFxuICAgICAgICAgIHBlcnNvbmFDb2RlOiBwZXJzb25hLnBlcnNvbmFDb2RlLFxuICAgICAgICB9KTtcbiAgICAgICAgYXdhaXQgdGhpcy5kYi50cmFuc2FjdGlvbihhc3luYyAodHgpID0+IHtcbiAgICAgICAgICBhd2FpdCB0aGlzLmFwcGVuZFR4KHR4LCAnYWN0b3InLCBhY3Rvci5pZCwgJ2FjdG9yLnByb3Zpc2lvbmVkJywgaW5wdXQuYnlBY3RvcklkLCB7XG4gICAgICAgICAgICBwZXJzb25hQ29kZTogcGVyc29uYS5wZXJzb25hQ29kZSxcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICAvLyBGbG9vci1zdGF0ZSByb2xlICh0aGVzaXMpOiBhc3NpZ25Sb2xlIGlzIGlkZW1wb3RlbnQuXG4gICAgICBhd2FpdCB0aGlzLmFzc2lnblJvbGUoeyBhY3RvcklkOiBhY3Rvci5pZCwgcm9sZUNvZGU6IHBlcnNvbmEuZGVmYXVsdFJvbGUsIGJ5QWN0b3JJZDogaW5wdXQuYnlBY3RvcklkIH0pO1xuICAgICAgcHJvdmlzaW9uZWQucHVzaCh7IC4uLmFjdG9yIH0pO1xuICAgIH1cbiAgICByZXR1cm4gcHJvdmlzaW9uZWQ7XG4gIH1cblxuICBhc3luYyBncmFudChpbnB1dDogeyBhY3RvcklkOiBzdHJpbmc7IHBlcm1pc3Npb246IFBlcm1pc3Npb247IHNjb3BlPzogc3RyaW5nIH0pOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAvLyBHcmFudC10aW1lIHBsYW4gY2VpbGluZyBwcmVjZWRlcyBhbnkgZWZmZWN0IChQaGFzZSAyIHBpbik6IGEgcmVmdXNlZFxuICAgIC8vIGdyYW50IGluc2VydHMgbm90aGluZyBhbmQgYXBwZW5kcyBub3RoaW5nLlxuICAgIGF3YWl0IHRoaXMuY2hlY2tHcmFudENlaWxpbmcoaW5wdXQuYWN0b3JJZCwgaW5wdXQucGVybWlzc2lvbik7XG4gICAgYXdhaXQgdGhpcy5kYi50cmFuc2FjdGlvbihhc3luYyAodHgpID0+IHtcbiAgICAgIGF3YWl0IHR4XG4gICAgICAgIC5pbnNlcnQoZ3JhbnRzKVxuICAgICAgICAudmFsdWVzKHsgYWN0b3JJZDogaW5wdXQuYWN0b3JJZCwgcGVybWlzc2lvbjogaW5wdXQucGVybWlzc2lvbiwgc2NvcGU6IGlucHV0LnNjb3BlID8/IG51bGwgfSlcbiAgICAgICAgLm9uQ29uZmxpY3REb05vdGhpbmcoKTtcbiAgICAgIGF3YWl0IHRoaXMuYXBwZW5kVHgodHgsICdhY3RvcicsIGlucHV0LmFjdG9ySWQsICdncmFudC5pc3N1ZWQnLCB0aGlzLnN5c3RlbUFjdG9ySWQsIHtcbiAgICAgICAgcGVybWlzc2lvbjogaW5wdXQucGVybWlzc2lvbixcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgYXN5bmMgcmV2b2tlKGlucHV0OiB7IGFjdG9ySWQ6IHN0cmluZzsgcGVybWlzc2lvbjogUGVybWlzc2lvbjsgc2NvcGU/OiBzdHJpbmcgfSk6IFByb21pc2U8dm9pZD4ge1xuICAgIGF3YWl0IHRoaXMuZGIudHJhbnNhY3Rpb24oYXN5bmMgKHR4KSA9PiB7XG4gICAgICBhd2FpdCB0eFxuICAgICAgICAuZGVsZXRlKGdyYW50cylcbiAgICAgICAgLndoZXJlKGFuZChlcShncmFudHMuYWN0b3JJZCwgaW5wdXQuYWN0b3JJZCksIGVxKGdyYW50cy5wZXJtaXNzaW9uLCBpbnB1dC5wZXJtaXNzaW9uKSkpO1xuICAgICAgYXdhaXQgdGhpcy5hcHBlbmRUeCh0eCwgJ2FjdG9yJywgaW5wdXQuYWN0b3JJZCwgJ2dyYW50LnJldm9rZWQnLCB0aGlzLnN5c3RlbUFjdG9ySWQsIHtcbiAgICAgICAgcGVybWlzc2lvbjogaW5wdXQucGVybWlzc2lvbixcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgLy8gLS0gZW50aXRsZW1lbnRzIChQaGFzZSAyLCByb2FkbWFwIFx1MDBBNzMpIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICBhc3luYyBzZXRHb3Zlcm5hbmNlUm9sZShpbnB1dDogeyBhY3RvcklkOiBzdHJpbmc7IHJvbGU6IEdvdmVybmFuY2VSb2xlOyBieUFjdG9ySWQ6IHN0cmluZyB9KTogUHJvbWlzZTx2b2lkPiB7XG4gICAgYXdhaXQgdGhpcy5yZXF1aXJlR292ZXJuYW5jZUFkbWluKGlucHV0LmJ5QWN0b3JJZCk7XG4gICAgaWYgKChhd2FpdCB0aGlzLmdldEFjdG9yUm93KGlucHV0LmFjdG9ySWQpKSA9PT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoYHVua25vd24gYWN0b3I6ICR7aW5wdXQuYWN0b3JJZH1gKTtcbiAgICB9XG4gICAgYXdhaXQgdGhpcy5kYi50cmFuc2FjdGlvbihhc3luYyAodHgpID0+IHtcbiAgICAgIGF3YWl0IHR4LnVwZGF0ZShhY3RvcnMpLnNldCh7IGdvdmVybmFuY2VSb2xlOiBpbnB1dC5yb2xlIH0pLndoZXJlKGVxKGFjdG9ycy5pZCwgaW5wdXQuYWN0b3JJZCkpO1xuICAgICAgYXdhaXQgdGhpcy5hcHBlbmRUeCh0eCwgJ2FjdG9yJywgaW5wdXQuYWN0b3JJZCwgJ2dvdmVybmFuY2UuY2hhbmdlZCcsIGlucHV0LmJ5QWN0b3JJZCwgeyByb2xlOiBpbnB1dC5yb2xlIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgYXN5bmMgZ2V0R292ZXJuYW5jZVJvbGUoYWN0b3JJZDogc3RyaW5nKTogUHJvbWlzZTxHb3Zlcm5hbmNlUm9sZT4ge1xuICAgIGNvbnN0IGFjdG9yID0gYXdhaXQgdGhpcy5nZXRBY3RvclJvdyhhY3RvcklkKTtcbiAgICByZXR1cm4gKGFjdG9yPy5nb3Zlcm5hbmNlUm9sZSBhcyBHb3Zlcm5hbmNlUm9sZSB8IHVuZGVmaW5lZCkgPz8gJ21lbWJlcic7XG4gIH1cblxuICBhc3luYyBhc3NpZ25Sb2xlKGlucHV0OiB7IGFjdG9ySWQ6IHN0cmluZzsgcm9sZUNvZGU6IHN0cmluZzsgYnlBY3RvcklkOiBzdHJpbmcgfSk6IFByb21pc2U8dm9pZD4ge1xuICAgIGF3YWl0IHRoaXMucmVxdWlyZUdvdmVybmFuY2VBZG1pbihpbnB1dC5ieUFjdG9ySWQpO1xuICAgIGNvbnN0IGJ1bmRsZSA9IERFTElWRVJZX1JPTEVTW2lucHV0LnJvbGVDb2RlXTtcbiAgICBpZiAoYnVuZGxlID09PSB1bmRlZmluZWQpIHRocm93IG5ldyBHdWFyZEZhaWxlZEVycm9yKGB1bmtub3duIGRlbGl2ZXJ5IHJvbGU6ICR7aW5wdXQucm9sZUNvZGV9YCk7XG4gICAgaWYgKChhd2FpdCB0aGlzLmdldEFjdG9yUm93KGlucHV0LmFjdG9ySWQpKSA9PT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoYHVua25vd24gYWN0b3I6ICR7aW5wdXQuYWN0b3JJZH1gKTtcbiAgICB9XG4gICAgZm9yIChjb25zdCBwZXJtaXNzaW9uIG9mIGJ1bmRsZSkge1xuICAgICAgYXdhaXQgdGhpcy5jaGVja0dyYW50Q2VpbGluZyhpbnB1dC5hY3RvcklkLCBwZXJtaXNzaW9uKTtcbiAgICB9XG4gICAgY29uc3QgYWN0aXZlID0gYXdhaXQgdGhpcy5kYlxuICAgICAgLnNlbGVjdCh7IHNlcTogcm9sZUFzc2lnbm1lbnRzLnNlcSB9KVxuICAgICAgLmZyb20ocm9sZUFzc2lnbm1lbnRzKVxuICAgICAgLndoZXJlKFxuICAgICAgICBhbmQoXG4gICAgICAgICAgZXEocm9sZUFzc2lnbm1lbnRzLmFjdG9ySWQsIGlucHV0LmFjdG9ySWQpLFxuICAgICAgICAgIGVxKHJvbGVBc3NpZ25tZW50cy5yb2xlQ29kZSwgaW5wdXQucm9sZUNvZGUpLFxuICAgICAgICAgIGVxKHJvbGVBc3NpZ25tZW50cy5yZXZva2VkLCBmYWxzZSksXG4gICAgICAgICksXG4gICAgICApXG4gICAgICAubGltaXQoMSk7XG4gICAgaWYgKGFjdGl2ZS5sZW5ndGggPiAwKSByZXR1cm47IC8vIGlkZW1wb3RlbnRcbiAgICBhd2FpdCB0aGlzLmRiLnRyYW5zYWN0aW9uKGFzeW5jICh0eCkgPT4ge1xuICAgICAgYXdhaXQgdHguaW5zZXJ0KHJvbGVBc3NpZ25tZW50cykudmFsdWVzKHtcbiAgICAgICAgYWN0b3JJZDogaW5wdXQuYWN0b3JJZCxcbiAgICAgICAgcm9sZUNvZGU6IGlucHV0LnJvbGVDb2RlLFxuICAgICAgICBncmFudGVkQnk6IGlucHV0LmJ5QWN0b3JJZCxcbiAgICAgICAgcmV2b2tlZDogZmFsc2UsXG4gICAgICB9KTtcbiAgICAgIGF3YWl0IHRoaXMuYXBwZW5kVHgodHgsICdhY3RvcicsIGlucHV0LmFjdG9ySWQsICdyb2xlLmFzc2lnbmVkJywgaW5wdXQuYnlBY3RvcklkLCB7XG4gICAgICAgIHJvbGVDb2RlOiBpbnB1dC5yb2xlQ29kZSxcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgYXN5bmMgcmV2b2tlUm9sZShpbnB1dDogeyBhY3RvcklkOiBzdHJpbmc7IHJvbGVDb2RlOiBzdHJpbmc7IGJ5QWN0b3JJZDogc3RyaW5nIH0pOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBhd2FpdCB0aGlzLnJlcXVpcmVHb3Zlcm5hbmNlQWRtaW4oaW5wdXQuYnlBY3RvcklkKTtcbiAgICBpZiAoREVMSVZFUllfUk9MRVNbaW5wdXQucm9sZUNvZGVdID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRocm93IG5ldyBHdWFyZEZhaWxlZEVycm9yKGB1bmtub3duIGRlbGl2ZXJ5IHJvbGU6ICR7aW5wdXQucm9sZUNvZGV9YCk7XG4gICAgfVxuICAgIGF3YWl0IHRoaXMuZGIudHJhbnNhY3Rpb24oYXN5bmMgKHR4KSA9PiB7XG4gICAgICBhd2FpdCB0eFxuICAgICAgICAudXBkYXRlKHJvbGVBc3NpZ25tZW50cylcbiAgICAgICAgLnNldCh7IHJldm9rZWQ6IHRydWUgfSlcbiAgICAgICAgLndoZXJlKFxuICAgICAgICAgIGFuZChcbiAgICAgICAgICAgIGVxKHJvbGVBc3NpZ25tZW50cy5hY3RvcklkLCBpbnB1dC5hY3RvcklkKSxcbiAgICAgICAgICAgIGVxKHJvbGVBc3NpZ25tZW50cy5yb2xlQ29kZSwgaW5wdXQucm9sZUNvZGUpLFxuICAgICAgICAgICAgZXEocm9sZUFzc2lnbm1lbnRzLnJldm9rZWQsIGZhbHNlKSxcbiAgICAgICAgICApLFxuICAgICAgICApO1xuICAgICAgYXdhaXQgdGhpcy5hcHBlbmRUeCh0eCwgJ2FjdG9yJywgaW5wdXQuYWN0b3JJZCwgJ3JvbGUucmV2b2tlZCcsIGlucHV0LmJ5QWN0b3JJZCwge1xuICAgICAgICByb2xlQ29kZTogaW5wdXQucm9sZUNvZGUsXG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuXG4gIGFzeW5jIGxpc3RSb2xlQXNzaWdubWVudHMoYWN0b3JJZD86IHN0cmluZyk6IFByb21pc2U8Um9sZUFzc2lnbm1lbnRbXT4ge1xuICAgIGNvbnN0IHJvd3MgPVxuICAgICAgYWN0b3JJZCA9PT0gdW5kZWZpbmVkXG4gICAgICAgID8gYXdhaXQgdGhpcy5kYi5zZWxlY3QoKS5mcm9tKHJvbGVBc3NpZ25tZW50cykub3JkZXJCeShhc2Mocm9sZUFzc2lnbm1lbnRzLnNlcSkpXG4gICAgICAgIDogYXdhaXQgdGhpcy5kYlxuICAgICAgICAgICAgLnNlbGVjdCgpXG4gICAgICAgICAgICAuZnJvbShyb2xlQXNzaWdubWVudHMpXG4gICAgICAgICAgICAud2hlcmUoZXEocm9sZUFzc2lnbm1lbnRzLmFjdG9ySWQsIGFjdG9ySWQpKVxuICAgICAgICAgICAgLm9yZGVyQnkoYXNjKHJvbGVBc3NpZ25tZW50cy5zZXEpKTtcbiAgICByZXR1cm4gcm93cy5tYXAoKHJvdykgPT4gKHtcbiAgICAgIGFjdG9ySWQ6IHJvdy5hY3RvcklkLFxuICAgICAgcm9sZUNvZGU6IHJvdy5yb2xlQ29kZSxcbiAgICAgIGdyYW50ZWRCeTogcm93LmdyYW50ZWRCeSxcbiAgICAgIHJldm9rZWQ6IHJvdy5yZXZva2VkLFxuICAgIH0pKTtcbiAgfVxuXG4gIGFzeW5jIHNldFBsYW4oaW5wdXQ6IHsgcGxhbjogUGxhbkNvZGU7IGJ5QWN0b3JJZDogc3RyaW5nIH0pOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBhd2FpdCB0aGlzLnJlcXVpcmVHb3Zlcm5hbmNlQWRtaW4oaW5wdXQuYnlBY3RvcklkKTtcbiAgICBpZiAoUExBTl9DRUlMSU5HU1tpbnB1dC5wbGFuXSA9PT0gdW5kZWZpbmVkKSB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcihgdW5rbm93biBwbGFuOiAke2lucHV0LnBsYW59YCk7XG4gICAgY29uc3Qgd29ya3NwYWNlID0gYXdhaXQgdGhpcy53b3Jrc3BhY2VSb3coKTtcbiAgICBjb25zdCBwbGFuVmVyc2lvbiA9IHdvcmtzcGFjZS5wbGFuVmVyc2lvbiArIDE7XG4gICAgYXdhaXQgdGhpcy5kYi50cmFuc2FjdGlvbihhc3luYyAodHgpID0+IHtcbiAgICAgIGF3YWl0IHR4XG4gICAgICAgIC51cGRhdGUod29ya3NwYWNlU3RhdGUpXG4gICAgICAgIC5zZXQoeyBwbGFuOiBpbnB1dC5wbGFuLCBwbGFuVmVyc2lvbiB9KVxuICAgICAgICAud2hlcmUoZXEod29ya3NwYWNlU3RhdGUuaWQsIFdPUktTUEFDRV9JRCkpO1xuICAgICAgYXdhaXQgdGhpcy5hcHBlbmRUeCh0eCwgJ3dvcmtzcGFjZScsIFdPUktTUEFDRV9JRCwgJ3BsYW4uY2hhbmdlZCcsIGlucHV0LmJ5QWN0b3JJZCwge1xuICAgICAgICBwbGFuOiBpbnB1dC5wbGFuLFxuICAgICAgICBwbGFuVmVyc2lvbixcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgYXN5bmMgZ2V0UGxhbigpOiBQcm9taXNlPFBsYW5Db2RlPiB7XG4gICAgcmV0dXJuIChhd2FpdCB0aGlzLndvcmtzcGFjZVJvdygpKS5wbGFuIGFzIFBsYW5Db2RlO1xuICB9XG5cbiAgYXN5bmMgc2V0V29ya3NwYWNlUG9saWN5KGlucHV0OiB7IHBvbGljeTogV29ya3NwYWNlUG9saWN5OyBieUFjdG9ySWQ6IHN0cmluZyB9KTogUHJvbWlzZTx2b2lkPiB7XG4gICAgYXdhaXQgdGhpcy5yZXF1aXJlR292ZXJuYW5jZUFkbWluKGlucHV0LmJ5QWN0b3JJZCk7XG4gICAgY29uc3Qgd29ya3NwYWNlID0gYXdhaXQgdGhpcy53b3Jrc3BhY2VSb3coKTtcbiAgICBjb25zdCBtZXJnZWQ6IFdvcmtzcGFjZVBvbGljeSA9IHsgLi4uKHdvcmtzcGFjZS5wb2xpY3kgYXMgV29ya3NwYWNlUG9saWN5KSwgLi4uaW5wdXQucG9saWN5IH07XG4gICAgY29uc3QgcG9saWN5VmVyc2lvbiA9IHdvcmtzcGFjZS5wb2xpY3lWZXJzaW9uICsgMTtcbiAgICBhd2FpdCB0aGlzLmRiLnRyYW5zYWN0aW9uKGFzeW5jICh0eCkgPT4ge1xuICAgICAgYXdhaXQgdHhcbiAgICAgICAgLnVwZGF0ZSh3b3Jrc3BhY2VTdGF0ZSlcbiAgICAgICAgLnNldCh7IHBvbGljeTogbWVyZ2VkIGFzIFJlY29yZDxzdHJpbmcsIHVua25vd24+LCBwb2xpY3lWZXJzaW9uIH0pXG4gICAgICAgIC53aGVyZShlcSh3b3Jrc3BhY2VTdGF0ZS5pZCwgV09SS1NQQUNFX0lEKSk7XG4gICAgICBhd2FpdCB0aGlzLmFwcGVuZFR4KHR4LCAnd29ya3NwYWNlJywgV09SS1NQQUNFX0lELCAncG9saWN5LmNoYW5nZWQnLCBpbnB1dC5ieUFjdG9ySWQsIHtcbiAgICAgICAgcG9saWN5OiB7IC4uLm1lcmdlZCB9LFxuICAgICAgICBwb2xpY3lWZXJzaW9uLFxuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICBhc3luYyBnZXRXb3Jrc3BhY2VQb2xpY3koKTogUHJvbWlzZTxXb3Jrc3BhY2VQb2xpY3k+IHtcbiAgICByZXR1cm4geyAuLi4oKGF3YWl0IHRoaXMud29ya3NwYWNlUm93KCkpLnBvbGljeSBhcyBXb3Jrc3BhY2VQb2xpY3kpIH07XG4gIH1cblxuICBhc3luYyBzZXRHYXRlUG9saWN5KGlucHV0OiB7IGdhdGU6IEdhdGVDb2RlOyBwb2xpY3k6IEdhdGVQb2xpY3k7IGJ5QWN0b3JJZDogc3RyaW5nIH0pOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBhd2FpdCB0aGlzLnJlcXVpcmVHb3Zlcm5hbmNlQWRtaW4oaW5wdXQuYnlBY3RvcklkKTtcbiAgICBjb25zdCBtaW5BcHByb3ZhbHMgPSBpbnB1dC5wb2xpY3kubWluQXBwcm92YWxzID8/IDE7XG4gICAgaWYgKCFOdW1iZXIuaXNJbnRlZ2VyKG1pbkFwcHJvdmFscykgfHwgbWluQXBwcm92YWxzIDwgMSkge1xuICAgICAgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoJ21pbkFwcHJvdmFscyBtdXN0IGJlIGEgcG9zaXRpdmUgaW50ZWdlcicpO1xuICAgIH1cbiAgICBhd2FpdCB0aGlzLmRiLnRyYW5zYWN0aW9uKGFzeW5jICh0eCkgPT4ge1xuICAgICAgYXdhaXQgdHhcbiAgICAgICAgLmluc2VydChnYXRlUG9saWNpZXMpXG4gICAgICAgIC52YWx1ZXMoeyBnYXRlOiBpbnB1dC5nYXRlLCBwb2xpY3k6IHsgLi4uaW5wdXQucG9saWN5IH0gYXMgUmVjb3JkPHN0cmluZywgdW5rbm93bj4gfSlcbiAgICAgICAgLm9uQ29uZmxpY3REb1VwZGF0ZSh7XG4gICAgICAgICAgdGFyZ2V0OiBnYXRlUG9saWNpZXMuZ2F0ZSxcbiAgICAgICAgICBzZXQ6IHsgcG9saWN5OiB7IC4uLmlucHV0LnBvbGljeSB9IGFzIFJlY29yZDxzdHJpbmcsIHVua25vd24+IH0sXG4gICAgICAgIH0pO1xuICAgICAgYXdhaXQgdGhpcy5hcHBlbmRUeCh0eCwgJ3dvcmtzcGFjZScsIFdPUktTUEFDRV9JRCwgJ2dhdGVfcG9saWN5LmNoYW5nZWQnLCBpbnB1dC5ieUFjdG9ySWQsIHtcbiAgICAgICAgZ2F0ZTogaW5wdXQuZ2F0ZSxcbiAgICAgICAgcG9saWN5OiB7IC4uLmlucHV0LnBvbGljeSB9LFxuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICBhc3luYyBnZXRHYXRlUG9saWN5KGdhdGU6IEdhdGVDb2RlKTogUHJvbWlzZTxHYXRlUG9saWN5PiB7XG4gICAgY29uc3Qgcm93cyA9IGF3YWl0IHRoaXMuZGIuc2VsZWN0KCkuZnJvbShnYXRlUG9saWNpZXMpLndoZXJlKGVxKGdhdGVQb2xpY2llcy5nYXRlLCBnYXRlKSkubGltaXQoMSk7XG4gICAgcmV0dXJuIHsgLi4uKChyb3dzWzBdPy5wb2xpY3kgYXMgR2F0ZVBvbGljeSB8IHVuZGVmaW5lZCkgPz8ge30pIH07XG4gIH1cblxuICBhc3luYyBhdXRoekV4cGxhaW4oaW5wdXQ6IHsgYWN0b3JJZDogc3RyaW5nOyBwZXJtaXNzaW9uOiBQZXJtaXNzaW9uIH0pOiBQcm9taXNlPEF1dGh6RXhwbGFuYXRpb24+IHtcbiAgICBjb25zdCBzb3VyY2UgPSBhd2FpdCB0aGlzLmdyYW50U291cmNlKGlucHV0LmFjdG9ySWQsIGlucHV0LnBlcm1pc3Npb24pO1xuICAgIGNvbnN0IGFjdG9yID0gYXdhaXQgdGhpcy5nZXRBY3RvclJvdyhpbnB1dC5hY3RvcklkKTtcbiAgICBjb25zdCB3b3Jrc3BhY2UgPSBhd2FpdCB0aGlzLndvcmtzcGFjZVJvdygpO1xuICAgIGNvbnN0IGFsbG93cyA9IHRoaXMuYWdlbnRDZWlsaW5nQWxsb3dzKGFjdG9yLCBpbnB1dC5wZXJtaXNzaW9uLCB3b3Jrc3BhY2UpO1xuICAgIHJldHVybiB7XG4gICAgICBhY3RvcklkOiBpbnB1dC5hY3RvcklkLFxuICAgICAgcGVybWlzc2lvbjogaW5wdXQucGVybWlzc2lvbixcbiAgICAgIGFsbG93ZWQ6IHNvdXJjZSAhPT0gbnVsbCAmJiBhbGxvd3MucGxhbiAmJiBhbGxvd3MucG9saWN5LFxuICAgICAgc291cmNlLFxuICAgICAgZ292ZXJuYW5jZVJvbGU6IChhY3Rvcj8uZ292ZXJuYW5jZVJvbGUgYXMgR292ZXJuYW5jZVJvbGUgfCB1bmRlZmluZWQpID8/ICdtZW1iZXInLFxuICAgICAgcGxhbjogd29ya3NwYWNlLnBsYW4gYXMgUGxhbkNvZGUsXG4gICAgICBwbGFuQWxsb3dzOiBhbGxvd3MucGxhbixcbiAgICAgIHBvbGljeUFsbG93czogYWxsb3dzLnBvbGljeSxcbiAgICAgIHZlcnNpb25zOiB7IHBsYW46IHdvcmtzcGFjZS5wbGFuVmVyc2lvbiwgcG9saWN5OiB3b3Jrc3BhY2UucG9saWN5VmVyc2lvbiB9LFxuICAgIH07XG4gIH1cblxuICBhc3luYyBjcmVhdGVGZWF0dXJlKGlucHV0OiB7IGFjdG9ySWQ6IHN0cmluZyB9KTogUHJvbWlzZTxGZWF0dXJlPiB7XG4gICAgY29uc3QgaWQgPSB0aGlzLm5leHRJZCgnZmVhdCcpO1xuICAgIHJldHVybiB0aGlzLmRiLnRyYW5zYWN0aW9uKGFzeW5jICh0eCkgPT4ge1xuICAgICAgYXdhaXQgdHguaW5zZXJ0KGZlYXR1cmVzKS52YWx1ZXMoeyBpZCwgc3RhdGU6ICdiYWNrbG9nJywgZGlzcGF0Y2hIb2xkOiBmYWxzZSB9KTtcbiAgICAgIGF3YWl0IHRoaXMuYXBwZW5kVHgodHgsICdmZWF0dXJlJywgaWQsICdmZWF0dXJlLmNyZWF0ZWQnLCBpbnB1dC5hY3RvcklkLCB7fSk7XG4gICAgICByZXR1cm4geyBpZCwgc3RhdGU6ICdiYWNrbG9nJyBhcyBjb25zdCwgZGlzcGF0Y2hIb2xkOiBmYWxzZSB9O1xuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBjcmVhdGVXb3JrSXRlbVR4KHR4OiBRdWVyeWFibGUsIGlucHV0OiBDcmVhdGVXb3JrSXRlbUlucHV0ICYgeyBhY3RvcklkOiBzdHJpbmcgfSk6IFByb21pc2U8V29ya0l0ZW0+IHtcbiAgICBjb25zdCBzbHVnID0gaW5wdXQudGl0bGVcbiAgICAgIC50b0xvd2VyQ2FzZSgpXG4gICAgICAucmVwbGFjZSgvW15hLXowLTldKy9nLCAnLScpXG4gICAgICAucmVwbGFjZSgvKF4tfC0kKS9nLCAnJyk7XG4gICAgY29uc3Qgcm93OiBXb3JrSXRlbVJvdyA9IHtcbiAgICAgIGlkOiB0aGlzLm5leHRJZCgnd2knKSxcbiAgICAgIHNlcTogMCwgLy8gYXNzaWduZWQgYnkgdGhlIHNlcmlhbDsgcGxhY2Vob2xkZXIgZm9yIHRoZSBsb2NhbCBjb3B5IG9ubHlcbiAgICAgIGZlYXR1cmVJZDogaW5wdXQuZmVhdHVyZUlkLFxuICAgICAgZXh0ZXJuYWxLZXk6IGlucHV0LmV4dGVybmFsS2V5LFxuICAgICAga2luZDogaW5wdXQua2luZCA/PyAnY29kZScsXG4gICAgICB0aXRsZTogaW5wdXQudGl0bGUsXG4gICAgICBzdGF0ZTogJ2JhY2tsb2cnLFxuICAgICAgYmxvY2tlZFJlYXNvbjogbnVsbCxcbiAgICAgIHJldmlld0xvb3BJdGVyYXRpb246IDAsXG4gICAgICBpbnRlbnRIYXNoOiBudWxsLFxuICAgICAgcGlubmVkVmVyaWZpY2F0aW9uOiBudWxsLFxuICAgICAgc3BlY0NoZWNrcG9pbnQ6IGlucHV0LnNwZWNDaGVja3BvaW50ID8/IGZhbHNlLFxuICAgICAgZG9uZUNoZWNrcG9pbnQ6IGlucHV0LmRvbmVDaGVja3BvaW50ID8/IGZhbHNlLFxuICAgICAgaW52b2tlRGV2V2l0aDogaW5wdXQuaW52b2tlRGV2V2l0aCA/PyAnJyxcbiAgICAgIHNwZWNQYXRoOiBgc3Rvcmllcy8ke2lucHV0LmV4dGVybmFsS2V5fS0ke3NsdWd9Lm1kYCxcbiAgICAgIHN0YXRlVmVyc2lvbjogMCxcbiAgICAgIGRlcGVuZHNPbjogaW5wdXQuZGVwZW5kc09uID8gWy4uLmlucHV0LmRlcGVuZHNPbl0gOiBbXSxcbiAgICAgIGxhc3RGZW5jaW5nVG9rZW46IDAsXG4gICAgfTtcbiAgICBhd2FpdCB0eC5pbnNlcnQod29ya0l0ZW1zKS52YWx1ZXMoe1xuICAgICAgaWQ6IHJvdy5pZCxcbiAgICAgIGZlYXR1cmVJZDogcm93LmZlYXR1cmVJZCxcbiAgICAgIGV4dGVybmFsS2V5OiByb3cuZXh0ZXJuYWxLZXksXG4gICAgICBraW5kOiByb3cua2luZCxcbiAgICAgIHRpdGxlOiByb3cudGl0bGUsXG4gICAgICBzdGF0ZTogcm93LnN0YXRlLFxuICAgICAgYmxvY2tlZFJlYXNvbjogcm93LmJsb2NrZWRSZWFzb24sXG4gICAgICByZXZpZXdMb29wSXRlcmF0aW9uOiByb3cucmV2aWV3TG9vcEl0ZXJhdGlvbixcbiAgICAgIGludGVudEhhc2g6IHJvdy5pbnRlbnRIYXNoLFxuICAgICAgcGlubmVkVmVyaWZpY2F0aW9uOiByb3cucGlubmVkVmVyaWZpY2F0aW9uLFxuICAgICAgc3BlY0NoZWNrcG9pbnQ6IHJvdy5zcGVjQ2hlY2twb2ludCxcbiAgICAgIGRvbmVDaGVja3BvaW50OiByb3cuZG9uZUNoZWNrcG9pbnQsXG4gICAgICBpbnZva2VEZXZXaXRoOiByb3cuaW52b2tlRGV2V2l0aCxcbiAgICAgIHNwZWNQYXRoOiByb3cuc3BlY1BhdGgsXG4gICAgICBzdGF0ZVZlcnNpb246IHJvdy5zdGF0ZVZlcnNpb24sXG4gICAgICBkZXBlbmRzT246IHJvdy5kZXBlbmRzT24sXG4gICAgICBsYXN0RmVuY2luZ1Rva2VuOiByb3cubGFzdEZlbmNpbmdUb2tlbixcbiAgICB9KTtcbiAgICBhd2FpdCB0aGlzLmFwcGVuZFR4KHR4LCAnd29ya19pdGVtJywgcm93LmlkLCAnd29ya19pdGVtLmNyZWF0ZWQnLCBpbnB1dC5hY3RvcklkLCB7XG4gICAgICBleHRlcm5hbEtleTogcm93LmV4dGVybmFsS2V5LFxuICAgICAgZmVhdHVyZUlkOiByb3cuZmVhdHVyZUlkLFxuICAgIH0pO1xuICAgIHJldHVybiB0aGlzLnB1YmxpY0l0ZW0ocm93KTtcbiAgfVxuXG4gIGFzeW5jIGNyZWF0ZVdvcmtJdGVtKGlucHV0OiBDcmVhdGVXb3JrSXRlbUlucHV0ICYgeyBhY3RvcklkOiBzdHJpbmcgfSk6IFByb21pc2U8V29ya0l0ZW0+IHtcbiAgICByZXR1cm4gdGhpcy5kYi50cmFuc2FjdGlvbihhc3luYyAodHgpID0+IHRoaXMuY3JlYXRlV29ya0l0ZW1UeCh0eCwgaW5wdXQpKTtcbiAgfVxuXG4gIGFzeW5jIGltcG9ydFN0b3JpZXMoaW5wdXQ6IHsgZmVhdHVyZUlkOiBzdHJpbmc7IHlhbWw6IHN0cmluZzsgYWN0b3JJZDogc3RyaW5nIH0pOiBQcm9taXNlPFN0b3JpZXNJbXBvcnRSZXN1bHQ+IHtcbiAgICBjb25zdCBlbnRyaWVzID0gcGFyc2VTdG9yaWVzKGlucHV0LnlhbWwpO1xuICAgIGNvbnN0IGZlYXR1cmUgPSBhd2FpdCB0aGlzLmdldEZlYXR1cmVSb3coaW5wdXQuZmVhdHVyZUlkKTtcbiAgICBpZiAoIWZlYXR1cmUpIHtcbiAgICAgIHRocm93IG5ldyBTdG9yaWVzVmFsaWRhdGlvbkVycm9yKGB1bmtub3duIGZlYXR1cmU6ICR7aW5wdXQuZmVhdHVyZUlkfWApO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5kYi50cmFuc2FjdGlvbihhc3luYyAodHgpID0+IHtcbiAgICAgIGNvbnN0IGltcG9ydGVkOiBzdHJpbmdbXSA9IFtdO1xuICAgICAgY29uc3QgdXBkYXRlZDogc3RyaW5nW10gPSBbXTtcbiAgICAgIGNvbnN0IHdhcm5pbmdzOiBzdHJpbmdbXSA9IFtdO1xuICAgICAgZm9yIChjb25zdCBlbnRyeSBvZiBlbnRyaWVzKSB7XG4gICAgICAgIGNvbnN0IGV4aXN0aW5nID0gKFxuICAgICAgICAgIGF3YWl0IHR4XG4gICAgICAgICAgICAuc2VsZWN0KClcbiAgICAgICAgICAgIC5mcm9tKHdvcmtJdGVtcylcbiAgICAgICAgICAgIC53aGVyZShhbmQoZXEod29ya0l0ZW1zLmZlYXR1cmVJZCwgaW5wdXQuZmVhdHVyZUlkKSwgZXEod29ya0l0ZW1zLmV4dGVybmFsS2V5LCBlbnRyeS5pZCkpKVxuICAgICAgICAgICAgLm9yZGVyQnkoYXNjKHdvcmtJdGVtcy5zZXEpKVxuICAgICAgICAgICAgLmxpbWl0KDEpXG4gICAgICAgIClbMF07XG4gICAgICAgIGlmIChleGlzdGluZykge1xuICAgICAgICAgIC8vIFJlLWltcG9ydCByZWZyZXNoZXMgZGVzY3JpcHRpdmUgZmllbGRzOyBsaWZlY3ljbGUgc3RhdGUgaXMgbmV2ZXJcbiAgICAgICAgICAvLyB0b3VjaGVkIChzdG9yaWVzLnlhbWwgY2FycmllcyBubyBzdGF0dXMgXHUyMDE0IEQ5LCB2YWxpZGl0eSBydWxlIDMpLlxuICAgICAgICAgIGF3YWl0IHR4XG4gICAgICAgICAgICAudXBkYXRlKHdvcmtJdGVtcylcbiAgICAgICAgICAgIC5zZXQoe1xuICAgICAgICAgICAgICB0aXRsZTogZW50cnkudGl0bGUsXG4gICAgICAgICAgICAgIHNwZWNDaGVja3BvaW50OiBlbnRyeS5zcGVjQ2hlY2twb2ludCxcbiAgICAgICAgICAgICAgZG9uZUNoZWNrcG9pbnQ6IGVudHJ5LmRvbmVDaGVja3BvaW50LFxuICAgICAgICAgICAgICBpbnZva2VEZXZXaXRoOiBlbnRyeS5pbnZva2VEZXZXaXRoLFxuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC53aGVyZShlcSh3b3JrSXRlbXMuaWQsIGV4aXN0aW5nLmlkKSk7XG4gICAgICAgICAgYXdhaXQgdGhpcy5hcHBlbmRUeCh0eCwgJ3dvcmtfaXRlbScsIGV4aXN0aW5nLmlkLCAnd29ya19pdGVtLnJlaW1wb3J0ZWQnLCBpbnB1dC5hY3RvcklkLCB7XG4gICAgICAgICAgICBleHRlcm5hbEtleTogZW50cnkuaWQsXG4gICAgICAgICAgfSk7XG4gICAgICAgICAgdXBkYXRlZC5wdXNoKGVudHJ5LmlkKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBhd2FpdCB0aGlzLmNyZWF0ZVdvcmtJdGVtVHgodHgsIHtcbiAgICAgICAgICAgIGZlYXR1cmVJZDogaW5wdXQuZmVhdHVyZUlkLFxuICAgICAgICAgICAgZXh0ZXJuYWxLZXk6IGVudHJ5LmlkLFxuICAgICAgICAgICAgdGl0bGU6IGVudHJ5LnRpdGxlLFxuICAgICAgICAgICAgc3BlY0NoZWNrcG9pbnQ6IGVudHJ5LnNwZWNDaGVja3BvaW50LFxuICAgICAgICAgICAgZG9uZUNoZWNrcG9pbnQ6IGVudHJ5LmRvbmVDaGVja3BvaW50LFxuICAgICAgICAgICAgaW52b2tlRGV2V2l0aDogZW50cnkuaW52b2tlRGV2V2l0aCxcbiAgICAgICAgICAgIGFjdG9ySWQ6IGlucHV0LmFjdG9ySWQsXG4gICAgICAgICAgfSk7XG4gICAgICAgICAgaW1wb3J0ZWQucHVzaChlbnRyeS5pZCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiB7IGltcG9ydGVkLCB1cGRhdGVkLCB3YXJuaW5ncyB9O1xuICAgIH0pO1xuICB9XG5cbiAgLy8gLS0gY2xhaW1zIChyb2FkbWFwIFx1MDBBNzEuMykgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgYXN5bmMgY2xhaW1UYXNrKGlucHV0OiB7IHdvcmtJdGVtSWQ6IHN0cmluZzsgYWN0b3JJZDogc3RyaW5nOyB0dGxNcz86IG51bWJlciB9KTogUHJvbWlzZTxDbGFpbT4ge1xuICAgIGNvbnN0IGl0ZW0gPSBhd2FpdCB0aGlzLm11c3RHZXRJdGVtKGlucHV0LndvcmtJdGVtSWQpO1xuICAgIGF3YWl0IHRoaXMucmVxdWlyZVBlcm1pc3Npb24oaW5wdXQuYWN0b3JJZCwgJ3Rhc2suY2xhaW0nKTtcbiAgICBjb25zdCB0dGxNcyA9IGlucHV0LnR0bE1zID8/IDE1ICogNjAgKiAxMDAwO1xuICAgIGNvbnN0IGNsYWltSWQgPSB0aGlzLm5leHRJZCgnY2xhaW0nKTtcbiAgICB0cnkge1xuICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuZGIudHJhbnNhY3Rpb24oYXN5bmMgKHR4KSA9PiB7XG4gICAgICAgIC8vIFN3ZWVwOiBhbiBFWFBJUkVEIGxlYXNlIHJldHVybnMgdGhlIGl0ZW0gdG8gdGhlIHBvb2wgXHUyMDE0IGZsaXAgaXRzXG4gICAgICAgIC8vIHJlbGVhc2VkIGZsYWcgc28gdGhlIHBhcnRpYWwgdW5pcXVlIGluZGV4IG9ubHkgZ3VhcmRzIGxpdmUgY2xhaW1zLlxuICAgICAgICBhd2FpdCB0eFxuICAgICAgICAgIC51cGRhdGUoY2xhaW1zKVxuICAgICAgICAgIC5zZXQoeyByZWxlYXNlZDogdHJ1ZSB9KVxuICAgICAgICAgIC53aGVyZShcbiAgICAgICAgICAgIGFuZChcbiAgICAgICAgICAgICAgZXEoY2xhaW1zLndvcmtJdGVtSWQsIGl0ZW0uaWQpLFxuICAgICAgICAgICAgICBlcShjbGFpbXMucmVsZWFzZWQsIGZhbHNlKSxcbiAgICAgICAgICAgICAgbHRlKGNsYWltcy5sZWFzZUV4cGlyZXNBdCwgdGhpcy5ub3cpLFxuICAgICAgICAgICAgKSxcbiAgICAgICAgICApO1xuICAgICAgICAvLyBNb25vdG9uaWMgZmVuY2luZyB0b2tlbiBwZXIgd29yayBpdGVtLCBjb25zdW1lZCBvbmx5IG9uIHN1Y2Nlc3NcbiAgICAgICAgLy8gKHRoZSB0cmFuc2FjdGlvbiByb2xscyB0aGUgY291bnRlciBiYWNrIHdoZW4gdGhlIGluc2VydCBsb3NlcykuXG4gICAgICAgIGNvbnN0IGNvdW50ZXJSb3cgPSAoXG4gICAgICAgICAgYXdhaXQgdHhcbiAgICAgICAgICAgIC5zZWxlY3QoeyBsYXN0RmVuY2luZ1Rva2VuOiB3b3JrSXRlbXMubGFzdEZlbmNpbmdUb2tlbiB9KVxuICAgICAgICAgICAgLmZyb20od29ya0l0ZW1zKVxuICAgICAgICAgICAgLndoZXJlKGVxKHdvcmtJdGVtcy5pZCwgaXRlbS5pZCkpXG4gICAgICAgICAgICAubGltaXQoMSlcbiAgICAgICAgKVswXTtcbiAgICAgICAgY29uc3QgdG9rZW4gPSAoY291bnRlclJvdz8ubGFzdEZlbmNpbmdUb2tlbiA/PyAwKSArIDE7XG4gICAgICAgIGF3YWl0IHR4LnVwZGF0ZSh3b3JrSXRlbXMpLnNldCh7IGxhc3RGZW5jaW5nVG9rZW46IHRva2VuIH0pLndoZXJlKGVxKHdvcmtJdGVtcy5pZCwgaXRlbS5pZCkpO1xuICAgICAgICAvLyBUaGUgcGFydGlhbCB1bmlxdWUgaW5kZXggY2xhaW1zX29uZV9saXZlX3Blcl9pdGVtIGRlY2lkZXMgdGhlIHJhY2U6XG4gICAgICAgIC8vIGEgbGl2ZSBjbGFpbSBtYWtlcyB0aGlzIElOU0VSVCBmYWlsIFx1MjAxNCB0aGUgbG9zZXIgbGVhdmVzIG5vIHJvdy5cbiAgICAgICAgYXdhaXQgdHguaW5zZXJ0KGNsYWltcykudmFsdWVzKHtcbiAgICAgICAgICBpZDogY2xhaW1JZCxcbiAgICAgICAgICB3b3JrSXRlbUlkOiBpdGVtLmlkLFxuICAgICAgICAgIGFjdG9ySWQ6IGlucHV0LmFjdG9ySWQsXG4gICAgICAgICAgZmVuY2luZ1Rva2VuOiB0b2tlbixcbiAgICAgICAgICBsZWFzZUV4cGlyZXNBdDogdGhpcy5ub3cgKyB0dGxNcyxcbiAgICAgICAgICByZWxlYXNlZDogZmFsc2UsXG4gICAgICAgICAgdHRsTXMsXG4gICAgICAgIH0pO1xuICAgICAgICBhd2FpdCB0aGlzLmFwcGVuZFR4KHR4LCAnd29ya19pdGVtJywgaXRlbS5pZCwgJ3dvcmtfaXRlbS5jbGFpbWVkJywgaW5wdXQuYWN0b3JJZCwge1xuICAgICAgICAgIGNsYWltSWQsXG4gICAgICAgICAgZmVuY2luZ1Rva2VuOiB0b2tlbixcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgaWQ6IGNsYWltSWQsXG4gICAgICAgICAgd29ya0l0ZW1JZDogaXRlbS5pZCxcbiAgICAgICAgICBhY3RvcklkOiBpbnB1dC5hY3RvcklkLFxuICAgICAgICAgIGZlbmNpbmdUb2tlbjogdG9rZW4sXG4gICAgICAgICAgbGVhc2VFeHBpcmVzQXQ6IHRoaXMubm93ICsgdHRsTXMsXG4gICAgICAgICAgcmVsZWFzZWQ6IGZhbHNlLFxuICAgICAgICB9O1xuICAgICAgfSk7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGlmIChpc1VuaXF1ZVZpb2xhdGlvbihlcnJvcikpIHtcbiAgICAgICAgdGhyb3cgbmV3IENvbmZsaWN0RXJyb3IoYHdvcmsgaXRlbSAke2l0ZW0uaWR9IGFscmVhZHkgaGFzIGEgbGl2ZSBjbGFpbWApO1xuICAgICAgfVxuICAgICAgdGhyb3cgZXJyb3I7XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgaGVhcnRiZWF0KGlucHV0OiB7IGNsYWltSWQ6IHN0cmluZyB9KTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3Qgcm93ID0gKGF3YWl0IHRoaXMuZGIuc2VsZWN0KCkuZnJvbShjbGFpbXMpLndoZXJlKGVxKGNsYWltcy5pZCwgaW5wdXQuY2xhaW1JZCkpLmxpbWl0KDEpKVswXTtcbiAgICBpZiAoIXJvdyB8fCByb3cucmVsZWFzZWQgfHwgcm93LmxlYXNlRXhwaXJlc0F0IDw9IHRoaXMubm93KSB7XG4gICAgICB0aHJvdyBuZXcgQ29uZmxpY3RFcnJvcihgY2xhaW0gJHtpbnB1dC5jbGFpbUlkfSBpcyBub3QgbGl2ZWApO1xuICAgIH1cbiAgICAvLyBIZWFydGJlYXQgcmVuZXdzIHRoZSBGVUxMIG9yaWdpbmFsIFRUTCBmcm9tIHRoZSBoZWFydGJlYXQgbW9tZW50LlxuICAgIGF3YWl0IHRoaXMuZGJcbiAgICAgIC51cGRhdGUoY2xhaW1zKVxuICAgICAgLnNldCh7IGxlYXNlRXhwaXJlc0F0OiB0aGlzLm5vdyArIHJvdy50dGxNcyB9KVxuICAgICAgLndoZXJlKGVxKGNsYWltcy5pZCwgcm93LmlkKSk7XG4gIH1cblxuICBhc3luYyByZWxlYXNlQ2xhaW0oaW5wdXQ6IHsgY2xhaW1JZDogc3RyaW5nOyByZWFzb24/OiBzdHJpbmcgfSk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IHJvdyA9IChhd2FpdCB0aGlzLmRiLnNlbGVjdCgpLmZyb20oY2xhaW1zKS53aGVyZShlcShjbGFpbXMuaWQsIGlucHV0LmNsYWltSWQpKS5saW1pdCgxKSlbMF07XG4gICAgaWYgKCFyb3cgfHwgcm93LnJlbGVhc2VkKSByZXR1cm47XG4gICAgYXdhaXQgdGhpcy5kYi50cmFuc2FjdGlvbihhc3luYyAodHgpID0+IHtcbiAgICAgIGF3YWl0IHR4LnVwZGF0ZShjbGFpbXMpLnNldCh7IHJlbGVhc2VkOiB0cnVlIH0pLndoZXJlKGVxKGNsYWltcy5pZCwgcm93LmlkKSk7XG4gICAgICBhd2FpdCB0aGlzLmFwcGVuZFR4KHR4LCAnd29ya19pdGVtJywgcm93LndvcmtJdGVtSWQsICdjbGFpbS5yZWxlYXNlZCcsIHJvdy5hY3RvcklkLCB7XG4gICAgICAgIGNsYWltSWQ6IHJvdy5pZCxcbiAgICAgICAgcmVhc29uOiBpbnB1dC5yZWFzb24gPz8gbnVsbCxcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgYWR2YW5jZUNsb2NrKG1zOiBudW1iZXIpOiB2b2lkIHtcbiAgICB0aGlzLm5vdyArPSBtcztcbiAgfVxuXG4gIC8vIC0tIGxpZmVjeWNsZSAocm9hZG1hcCBcdTAwQTcxLjIpIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgYXN5bmMgYWR2YW5jZVN0YXRlKGlucHV0OiBBZHZhbmNlSW5wdXQpOiBQcm9taXNlPFdvcmtJdGVtPiB7XG4gICAgY29uc3QgaXRlbSA9IGF3YWl0IHRoaXMubXVzdEdldEl0ZW0oaW5wdXQud29ya0l0ZW1JZCk7XG5cbiAgICAvLyBLZXllZCByZXBsYXk6IHRoZSBzYW1lIGNvbW1hbmQgcmV0dXJucyB0aGUgc2FtZSByZXN1bHQsIGFwcGVuZHMgbm90aGluZy5cbiAgICBpZiAoaW5wdXQuaWRlbXBvdGVuY3lLZXkgIT09IHVuZGVmaW5lZCkge1xuICAgICAgY29uc3QgY2FjaGVkID0gKFxuICAgICAgICBhd2FpdCB0aGlzLmRiXG4gICAgICAgICAgLnNlbGVjdCgpXG4gICAgICAgICAgLmZyb20oaWRlbXBvdGVuY3lLZXlzKVxuICAgICAgICAgIC53aGVyZShlcShpZGVtcG90ZW5jeUtleXMua2V5LCBpbnB1dC5pZGVtcG90ZW5jeUtleSkpXG4gICAgICAgICAgLmxpbWl0KDEpXG4gICAgICApWzBdO1xuICAgICAgaWYgKGNhY2hlZCkgcmV0dXJuIHsgLi4uKGNhY2hlZC5yZXN1bHQgYXMgdW5rbm93biBhcyBXb3JrSXRlbSkgfTtcbiAgICB9XG5cbiAgICAvLyBQcmVzZXJ2YXRpb24gbm8tb3AgKHNwcmludC1wbGFubmluZyBpZGVtcG90ZW5jeSBydWxlKTogYW4gVU5LRVlFRFxuICAgIC8vIHJlLXJlcXVlc3Qgb2YgdGhlIGN1cnJlbnQgc3RhdGUgc3VjY2VlZHMgd2l0aG91dCBhbiBldmVudC5cbiAgICBpZiAoaW5wdXQuaWRlbXBvdGVuY3lLZXkgPT09IHVuZGVmaW5lZCAmJiBpbnB1dC50byA9PT0gaXRlbS5zdGF0ZSkge1xuICAgICAgYXdhaXQgdGhpcy52YWxpZGF0ZVByZXNlbnRlZFRva2VuKGl0ZW0sIGlucHV0LmZlbmNpbmdUb2tlbiwgaW5wdXQuYWN0b3JJZCk7XG4gICAgICByZXR1cm4gdGhpcy5wdWJsaWNJdGVtKGl0ZW0pO1xuICAgIH1cblxuICAgIC8vIFRyYW5zaXRpb24tdGFibGUgbG9va3VwIHByZWNlZGVzIGNsYWltL3Rva2VuL3Blcm1pc3Npb24gY2hlY2tzXG4gICAgLy8gKGZzbS10cmFuc2l0aW9ucyBwaW4pLlxuICAgIGNvbnN0IHJ1bGUgPSBUUkFOU0lUSU9OUy5maW5kKCh0KSA9PiB0LmZyb20gPT09IGl0ZW0uc3RhdGUgJiYgdC50byA9PT0gaW5wdXQudG8pO1xuICAgIGlmICghcnVsZSkge1xuICAgICAgaWYgKFxuICAgICAgICBSQU5LW2lucHV0LnRvXSA8IFJBTktbaXRlbS5zdGF0ZSBhcyBXb3JrSXRlbVN0YXRlXSAmJlxuICAgICAgICAoYXdhaXQgdGhpcy5oYXNQZXJtaXNzaW9uKGlucHV0LmFjdG9ySWQsICdzdGF0ZS5kb3duZ3JhZGUnKSlcbiAgICAgICkge1xuICAgICAgICByZXR1cm4gdGhpcy5wcml2aWxlZ2VkRG93bmdyYWRlKGl0ZW0sIGlucHV0KTtcbiAgICAgIH1cbiAgICAgIHRocm93IG5ldyBJbnZhbGlkVHJhbnNpdGlvbkVycm9yKGl0ZW0uc3RhdGUgYXMgV29ya0l0ZW1TdGF0ZSwgaW5wdXQudG8pO1xuICAgIH1cblxuICAgIGF3YWl0IHRoaXMudmFsaWRhdGVQcmVzZW50ZWRUb2tlbihpdGVtLCBpbnB1dC5mZW5jaW5nVG9rZW4sIGlucHV0LmFjdG9ySWQpO1xuXG4gICAgLy8gQmxvY2tlZCBvdmVybGF5IGZyZWV6ZXMgdHJhbnNpdGlvbnMgYXQgZXZlcnkgc3RhdGUgKEQ4LCBcdTAwQTcxLjEpLlxuICAgIGlmIChpdGVtLmJsb2NrZWRSZWFzb24gIT09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBHdWFyZEZhaWxlZEVycm9yKGB3b3JrIGl0ZW0gaXMgYmxvY2tlZDogJHtpdGVtLmJsb2NrZWRSZWFzb259YCk7XG4gICAgfVxuXG4gICAgYXdhaXQgdGhpcy5yZXF1aXJlUGVybWlzc2lvbihpbnB1dC5hY3RvcklkLCBydWxlLnBlcm1pc3Npb24pO1xuXG4gICAgaWYgKHJ1bGUuY2xhaW1SZXF1aXJlZCAmJiBpbnB1dC5mZW5jaW5nVG9rZW4gPT09IHVuZGVmaW5lZCkge1xuICAgICAgLy8gRXhlY3V0aW9uLXpvbmUgdHJhbnNpdGlvbnMgZGVtYW5kIGEgUFJFU0VOVEVEIGxpdmUgdG9rZW4uXG4gICAgICB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcignY2xhaW0gZmVuY2luZyB0b2tlbiByZXF1aXJlZCBmb3IgdGhpcyB0cmFuc2l0aW9uJyk7XG4gICAgfVxuXG4gICAgZm9yIChjb25zdCBndWFyZCBvZiBydWxlLmd1YXJkcykge1xuICAgICAgYXdhaXQgdGhpcy5jaGVja0d1YXJkKGd1YXJkLCBpdGVtKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5kYi50cmFuc2FjdGlvbihhc3luYyAodHgpID0+XG4gICAgICB0aGlzLmV4ZWN1dGVUcmFuc2l0aW9uVHgodHgsIGl0ZW0sIGlucHV0LnRvLCBpbnB1dC5hY3RvcklkLCBpbnB1dC5pZGVtcG90ZW5jeUtleSksXG4gICAgKTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgY2hlY2tHdWFyZChndWFyZDogVHJhbnNpdGlvblJ1bGVbJ2d1YXJkcyddW251bWJlcl0sIGl0ZW06IFdvcmtJdGVtUm93KTogUHJvbWlzZTx2b2lkPiB7XG4gICAgc3dpdGNoIChndWFyZCkge1xuICAgICAgY2FzZSAnZGVwc19kb25lJzoge1xuICAgICAgICBmb3IgKGNvbnN0IGRlcEtleSBvZiBpdGVtLmRlcGVuZHNPbikge1xuICAgICAgICAgIGNvbnN0IGRlcCA9IChcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuZGJcbiAgICAgICAgICAgICAgLnNlbGVjdCgpXG4gICAgICAgICAgICAgIC5mcm9tKHdvcmtJdGVtcylcbiAgICAgICAgICAgICAgLndoZXJlKGFuZChlcSh3b3JrSXRlbXMuZmVhdHVyZUlkLCBpdGVtLmZlYXR1cmVJZCksIGVxKHdvcmtJdGVtcy5leHRlcm5hbEtleSwgZGVwS2V5KSkpXG4gICAgICAgICAgICAgIC5vcmRlckJ5KGFzYyh3b3JrSXRlbXMuc2VxKSlcbiAgICAgICAgICAgICAgLmxpbWl0KDEpXG4gICAgICAgICAgKVswXTtcbiAgICAgICAgICBpZiAoZGVwICYmIGRlcC5zdGF0ZSAhPT0gJ2RvbmUnKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcihgZGVwZW5kZW5jeSAke2RlcEtleX0gaXMgbm90IGRvbmVgKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgY2FzZSAnc3BlY19nYXRlX2lmX2NoZWNrcG9pbnQnOiB7XG4gICAgICAgIGlmICghaXRlbS5zcGVjQ2hlY2twb2ludCkgcmV0dXJuO1xuICAgICAgICBjb25zdCBhcHByb3ZlZCA9IChcbiAgICAgICAgICBhd2FpdCB0aGlzLmRiXG4gICAgICAgICAgICAuc2VsZWN0KHsgc2VxOiBnYXRlRGVjaXNpb25zLnNlcSB9KVxuICAgICAgICAgICAgLmZyb20oZ2F0ZURlY2lzaW9ucylcbiAgICAgICAgICAgIC53aGVyZShcbiAgICAgICAgICAgICAgYW5kKFxuICAgICAgICAgICAgICAgIGVxKGdhdGVEZWNpc2lvbnMud29ya0l0ZW1JZCwgaXRlbS5pZCksXG4gICAgICAgICAgICAgICAgZXEoZ2F0ZURlY2lzaW9ucy5nYXRlLCAnc3BlY19hcHByb3ZhbCcpLFxuICAgICAgICAgICAgICAgIGVxKGdhdGVEZWNpc2lvbnMuZGVjaXNpb24sICdhcHByb3ZlZCcpLFxuICAgICAgICAgICAgICApLFxuICAgICAgICAgICAgKVxuICAgICAgICAgICAgLmxpbWl0KDEpXG4gICAgICAgIClbMF07XG4gICAgICAgIGlmICghYXBwcm92ZWQpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcignc3BlY19jaGVja3BvaW50IHJlcXVpcmVzIGFuIGFwcHJvdmVkIHNwZWNfYXBwcm92YWwgZ2F0ZSBkZWNpc2lvbicpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGNhc2UgJ25vbmVtcHR5X2RpZmYnOiB7XG4gICAgICAgIC8vIFBoYXNlIDQgKHJvYWRtYXAgXHUwMEE3MS40KToga2luZCBzZWxlY3RzIFdISUNIIG1hY2hpbmUgZXZpZGVuY2UgYXBwbGllcy5cbiAgICAgICAgaWYgKGl0ZW0ua2luZCAhPT0gJ2NvZGUnKSB7XG4gICAgICAgICAgLy8gRG9jIGtpbmRzOiB0aGUgbGF0ZXN0IGRvY19saW50IChpZiBhbnkpIG11c3QgYmUgc2NoZW1hLXZhbGlkO1xuICAgICAgICAgIC8vIGdpdF9kaWZmIGlzIG5ldmVyIGNvbnN1bHRlZCBmb3Igbm9uLWNvZGUgZGVsaXZlcmFibGVzLlxuICAgICAgICAgIGNvbnN0IGxpbnRzID0gYXdhaXQgdGhpcy5kYlxuICAgICAgICAgICAgLnNlbGVjdCgpXG4gICAgICAgICAgICAuZnJvbShldmlkZW5jZVRhYmxlKVxuICAgICAgICAgICAgLndoZXJlKGFuZChlcShldmlkZW5jZVRhYmxlLndvcmtJdGVtSWQsIGl0ZW0uaWQpLCBlcShldmlkZW5jZVRhYmxlLmtpbmQsICdkb2NfbGludCcpKSlcbiAgICAgICAgICAgIC5vcmRlckJ5KGFzYyhldmlkZW5jZVRhYmxlLnNlcSkpO1xuICAgICAgICAgIGNvbnN0IGxhdGVzdExpbnQgPSBsaW50c1tsaW50cy5sZW5ndGggLSAxXTtcbiAgICAgICAgICBpZiAobGF0ZXN0TGludCAmJiBsYXRlc3RMaW50LnBheWxvYWRbJ3NjaGVtYVZhbGlkJ10gIT09IHRydWUpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBHdWFyZEZhaWxlZEVycm9yKCd0aGUgbGF0ZXN0IGRvY19saW50IGV2aWRlbmNlIGZhaWxlZCBcdTIwMTQgZG9jdW1lbnQgaXMgbm90IHNjaGVtYS12YWxpZCcpO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgLy8gVGhlIExBVEVTVCBzdWJtaXR0ZWQgZ2l0X2RpZmYsIGlmIGFueSwgbXVzdCBiZSBub24tZW1wdHkgXHUyMDE0IHRoZVxuICAgICAgICAvLyBmYWtlLWRvbmUgZGVueS4gQWJzZW5jZSBpcyBub3QgY2hlY2tlZCBoZXJlIChDT05GT1JNQU5DRS5tZCBwaW4pLlxuICAgICAgICBjb25zdCByb3dzID0gYXdhaXQgdGhpcy5kYlxuICAgICAgICAgIC5zZWxlY3QoKVxuICAgICAgICAgIC5mcm9tKGV2aWRlbmNlVGFibGUpXG4gICAgICAgICAgLndoZXJlKGFuZChlcShldmlkZW5jZVRhYmxlLndvcmtJdGVtSWQsIGl0ZW0uaWQpLCBlcShldmlkZW5jZVRhYmxlLmtpbmQsICdnaXRfZGlmZicpKSlcbiAgICAgICAgICAub3JkZXJCeShhc2MoZXZpZGVuY2VUYWJsZS5zZXEpKTtcbiAgICAgICAgY29uc3QgbGF0ZXN0ID0gcm93c1tyb3dzLmxlbmd0aCAtIDFdO1xuICAgICAgICBpZiAobGF0ZXN0ICYmIGxhdGVzdC5wYXlsb2FkWydub25FbXB0eSddICE9PSB0cnVlKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoJ3RoZSBsYXRlc3QgZ2l0X2RpZmYgZXZpZGVuY2UgaXMgZW1wdHkgXHUyMDE0IG5vdGhpbmcgdG8gcmV2aWV3Jyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgcHJpdmlsZWdlZERvd25ncmFkZShpdGVtOiBXb3JrSXRlbVJvdywgaW5wdXQ6IEFkdmFuY2VJbnB1dCk6IFByb21pc2U8V29ya0l0ZW0+IHtcbiAgICBhd2FpdCB0aGlzLnZhbGlkYXRlUHJlc2VudGVkVG9rZW4oaXRlbSwgaW5wdXQuZmVuY2luZ1Rva2VuLCBpbnB1dC5hY3RvcklkKTtcbiAgICBpZiAoaXRlbS5ibG9ja2VkUmVhc29uICE9PSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcihgd29yayBpdGVtIGlzIGJsb2NrZWQ6ICR7aXRlbS5ibG9ja2VkUmVhc29ufWApO1xuICAgIH1cbiAgICBjb25zdCBmcm9tID0gaXRlbS5zdGF0ZTtcbiAgICByZXR1cm4gdGhpcy5kYi50cmFuc2FjdGlvbihhc3luYyAodHgpID0+IHtcbiAgICAgIGNvbnN0IHVwZGF0ZWQgPSBhd2FpdCB0eFxuICAgICAgICAudXBkYXRlKHdvcmtJdGVtcylcbiAgICAgICAgLnNldCh7IHN0YXRlOiBpbnB1dC50bywgc3RhdGVWZXJzaW9uOiBpdGVtLnN0YXRlVmVyc2lvbiArIDEgfSlcbiAgICAgICAgLndoZXJlKGFuZChlcSh3b3JrSXRlbXMuaWQsIGl0ZW0uaWQpLCBlcSh3b3JrSXRlbXMuc3RhdGVWZXJzaW9uLCBpdGVtLnN0YXRlVmVyc2lvbikpKVxuICAgICAgICAucmV0dXJuaW5nKHsgaWQ6IHdvcmtJdGVtcy5pZCB9KTtcbiAgICAgIGlmICh1cGRhdGVkLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICB0aHJvdyBuZXcgQ29uZmxpY3RFcnJvcihgc3RhdGVfdmVyc2lvbiBjb25mbGljdCBvbiB3b3JrIGl0ZW0gJHtpdGVtLmlkfWApO1xuICAgICAgfVxuICAgICAgYXdhaXQgdGhpcy5hcHBlbmRUeChcbiAgICAgICAgdHgsXG4gICAgICAgICd3b3JrX2l0ZW0nLFxuICAgICAgICBpdGVtLmlkLFxuICAgICAgICAnd29ya19pdGVtLnN0YXRlX2Rvd25ncmFkZWQnLFxuICAgICAgICBpbnB1dC5hY3RvcklkLFxuICAgICAgICB7IGZyb20sIHRvOiBpbnB1dC50bywgY29tcGVuc2F0aW5nOiB0cnVlIH0sXG4gICAgICAgIGlucHV0LmlkZW1wb3RlbmN5S2V5ICE9PSB1bmRlZmluZWQgPyB7IGlkZW1wb3RlbmN5S2V5OiBpbnB1dC5pZGVtcG90ZW5jeUtleSB9IDogdW5kZWZpbmVkLFxuICAgICAgKTtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IHRoaXMucHVibGljSXRlbSh7IC4uLml0ZW0sIHN0YXRlOiBpbnB1dC50bywgc3RhdGVWZXJzaW9uOiBpdGVtLnN0YXRlVmVyc2lvbiArIDEgfSk7XG4gICAgICBpZiAoaW5wdXQuaWRlbXBvdGVuY3lLZXkgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBhd2FpdCB0eFxuICAgICAgICAgIC5pbnNlcnQoaWRlbXBvdGVuY3lLZXlzKVxuICAgICAgICAgIC52YWx1ZXMoeyBrZXk6IGlucHV0LmlkZW1wb3RlbmN5S2V5LCByZXN1bHQ6IHJlc3VsdCBhcyB1bmtub3duIGFzIFJlY29yZDxzdHJpbmcsIHVua25vd24+IH0pXG4gICAgICAgICAgLm9uQ29uZmxpY3REb05vdGhpbmcoKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSk7XG4gIH1cblxuICAvKiogU2hhcmVkIGJ5IGFkdmFuY2VTdGF0ZSBhbmQgdGhlIGdhdGUtZmlyZWQgdHJhbnNpdGlvbnMuIE9ORSB0cmFuc2FjdGlvbiBwZXIgY29tbWFuZC4gKi9cbiAgcHJpdmF0ZSBhc3luYyBleGVjdXRlVHJhbnNpdGlvblR4KFxuICAgIHR4OiBUeCxcbiAgICBpdGVtOiBXb3JrSXRlbVJvdyxcbiAgICB0bzogV29ya0l0ZW1TdGF0ZSxcbiAgICBhY3RvcklkOiBzdHJpbmcsXG4gICAgaWRlbXBvdGVuY3lLZXk/OiBzdHJpbmcsXG4gICAgY2F1c2F0aW9uSWQ/OiBzdHJpbmcsXG4gICk6IFByb21pc2U8V29ya0l0ZW0+IHtcbiAgICBjb25zdCBmcm9tID0gaXRlbS5zdGF0ZSBhcyBXb3JrSXRlbVN0YXRlO1xuICAgIC8vIENBUzogb3B0aW1pc3RpYyBjb25jdXJyZW5jeSBieSBzdGF0ZV92ZXJzaW9uIChyb2FkbWFwIFx1MDBBNzEuMSkuXG4gICAgY29uc3QgdXBkYXRlZCA9IGF3YWl0IHR4XG4gICAgICAudXBkYXRlKHdvcmtJdGVtcylcbiAgICAgIC5zZXQoeyBzdGF0ZTogdG8sIHN0YXRlVmVyc2lvbjogaXRlbS5zdGF0ZVZlcnNpb24gKyAxIH0pXG4gICAgICAud2hlcmUoYW5kKGVxKHdvcmtJdGVtcy5pZCwgaXRlbS5pZCksIGVxKHdvcmtJdGVtcy5zdGF0ZVZlcnNpb24sIGl0ZW0uc3RhdGVWZXJzaW9uKSkpXG4gICAgICAucmV0dXJuaW5nKHsgaWQ6IHdvcmtJdGVtcy5pZCB9KTtcbiAgICBpZiAodXBkYXRlZC5sZW5ndGggPT09IDApIHtcbiAgICAgIHRocm93IG5ldyBDb25mbGljdEVycm9yKGBzdGF0ZV92ZXJzaW9uIGNvbmZsaWN0IG9uIHdvcmsgaXRlbSAke2l0ZW0uaWR9YCk7XG4gICAgfVxuICAgIGNvbnN0IGV2ZW50ID0gYXdhaXQgdGhpcy5hcHBlbmRUeChcbiAgICAgIHR4LFxuICAgICAgJ3dvcmtfaXRlbScsXG4gICAgICBpdGVtLmlkLFxuICAgICAgJ3dvcmtfaXRlbS5zdGF0ZV9jaGFuZ2VkJyxcbiAgICAgIGFjdG9ySWQsXG4gICAgICB7IGZyb20sIHRvIH0sXG4gICAgICB7XG4gICAgICAgIC4uLihjYXVzYXRpb25JZCAhPT0gdW5kZWZpbmVkID8geyBjYXVzYXRpb25JZCB9IDoge30pLFxuICAgICAgICAuLi4oaWRlbXBvdGVuY3lLZXkgIT09IHVuZGVmaW5lZCA/IHsgaWRlbXBvdGVuY3lLZXkgfSA6IHt9KSxcbiAgICAgIH0sXG4gICAgKTtcblxuICAgIC8vIEVwaWMtbGlmdCBwcm9qZWN0b3IgKHJvYWRtYXAgXHUwMEE3MS4yKTogZmlyc3QgY2hpbGQgTEVBVklORyBiYWNrbG9nIGxpZnRzXG4gICAgLy8gdGhlIGZlYXR1cmU7IGlkZW1wb3RlbnQgYnkgY2hlY2s7IGF1dGhvcmVkIGJ5IHRoZSBzeXN0ZW0gYWN0b3IuXG4gICAgaWYgKGZyb20gPT09ICdiYWNrbG9nJyAmJiB0byAhPT0gJ2JhY2tsb2cnKSB7XG4gICAgICBjb25zdCBmZWF0dXJlID0gYXdhaXQgdGhpcy5nZXRGZWF0dXJlUm93KGl0ZW0uZmVhdHVyZUlkLCB0eCk7XG4gICAgICBpZiAoZmVhdHVyZSAmJiBmZWF0dXJlLnN0YXRlID09PSAnYmFja2xvZycpIHtcbiAgICAgICAgYXdhaXQgdHgudXBkYXRlKGZlYXR1cmVzKS5zZXQoeyBzdGF0ZTogJ2luX3Byb2dyZXNzJyB9KS53aGVyZShlcShmZWF0dXJlcy5pZCwgZmVhdHVyZS5pZCkpO1xuICAgICAgICBhd2FpdCB0aGlzLmFwcGVuZFR4KFxuICAgICAgICAgIHR4LFxuICAgICAgICAgICdmZWF0dXJlJyxcbiAgICAgICAgICBmZWF0dXJlLmlkLFxuICAgICAgICAgICdmZWF0dXJlLnN0YXRlX2NoYW5nZWQnLFxuICAgICAgICAgIHRoaXMuc3lzdGVtQWN0b3JJZCxcbiAgICAgICAgICB7IGZyb206ICdiYWNrbG9nJywgdG86ICdpbl9wcm9ncmVzcycgfSxcbiAgICAgICAgICB7IGNhdXNhdGlvbklkOiBTdHJpbmcoZXZlbnQuZ2xvYmFsU2VxKSB9LFxuICAgICAgICApO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIGRvbmVfY2hlY2twb2ludCAocm9hZG1hcCBcdTAwQTcxLjEpOiB0aGUgc3RvcnkgY29tcGxldGVzIG5vcm1hbGx5OyB0aGUgaG9sZFxuICAgIC8vIG1hdGVyaWFsaXplcyBvbiB0aGUgZmVhdHVyZSBleGFjdGx5IGF0IGNvbXBsZXRpb24uXG4gICAgaWYgKHRvID09PSAnZG9uZScgJiYgaXRlbS5kb25lQ2hlY2twb2ludCkge1xuICAgICAgY29uc3QgZmVhdHVyZSA9IGF3YWl0IHRoaXMuZ2V0RmVhdHVyZVJvdyhpdGVtLmZlYXR1cmVJZCwgdHgpO1xuICAgICAgaWYgKGZlYXR1cmUgJiYgIWZlYXR1cmUuZGlzcGF0Y2hIb2xkKSB7XG4gICAgICAgIGF3YWl0IHR4LnVwZGF0ZShmZWF0dXJlcykuc2V0KHsgZGlzcGF0Y2hIb2xkOiB0cnVlIH0pLndoZXJlKGVxKGZlYXR1cmVzLmlkLCBmZWF0dXJlLmlkKSk7XG4gICAgICAgIGF3YWl0IHRoaXMuYXBwZW5kVHgoXG4gICAgICAgICAgdHgsXG4gICAgICAgICAgJ2ZlYXR1cmUnLFxuICAgICAgICAgIGZlYXR1cmUuaWQsXG4gICAgICAgICAgJ2ZlYXR1cmUuZGlzcGF0Y2hfaG9sZF9yYWlzZWQnLFxuICAgICAgICAgIHRoaXMuc3lzdGVtQWN0b3JJZCxcbiAgICAgICAgICB7IHdvcmtJdGVtSWQ6IGl0ZW0uaWQgfSxcbiAgICAgICAgICB7IGNhdXNhdGlvbklkOiBTdHJpbmcoZXZlbnQuZ2xvYmFsU2VxKSB9LFxuICAgICAgICApO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIFJhaWxzIFx1MjE5MiBjaGF0OiBuYXJyYXRlIHRoZSB0cmFuc2l0aW9uIGludG8gYm91bmQgdGFzayB0aHJlYWRzIChcdTAwQTc1LjIpLlxuICAgIC8vIE1pcnJvciBvZiB0aGUgcmVmZXJlbmNlOiBFVkVSWSBleGVjdXRlVHJhbnNpdGlvbiBuYXJyYXRlcyAoZ2F0ZS1maXJlZCxcbiAgICAvLyBsb29wYmFjayBpbmNsdWRlZCk7IHByaXZpbGVnZWREb3duZ3JhZGUgZG9lcyBOT1QgZ28gdGhyb3VnaCBoZXJlIGFuZFxuICAgIC8vIHRoZXJlZm9yZSBkb2VzIG5vdCBuYXJyYXRlIFx1MjAxNCBleGFjdGx5IGxpa2UgdGhlIHJlZmVyZW5jZSBlbmdpbmUuXG4gICAgYXdhaXQgdGhpcy5uYXJyYXRlV29ya0l0ZW1UeCh0eCwgaXRlbS5pZCwgYHN0YXRlOiAke2Zyb219IFx1MjE5MiAke3RvfWApO1xuXG4gICAgY29uc3QgcmVzdWx0ID0gdGhpcy5wdWJsaWNJdGVtKHsgLi4uaXRlbSwgc3RhdGU6IHRvLCBzdGF0ZVZlcnNpb246IGl0ZW0uc3RhdGVWZXJzaW9uICsgMSB9KTtcbiAgICBpZiAoaWRlbXBvdGVuY3lLZXkgIT09IHVuZGVmaW5lZCkge1xuICAgICAgYXdhaXQgdHhcbiAgICAgICAgLmluc2VydChpZGVtcG90ZW5jeUtleXMpXG4gICAgICAgIC52YWx1ZXMoeyBrZXk6IGlkZW1wb3RlbmN5S2V5LCByZXN1bHQ6IHJlc3VsdCBhcyB1bmtub3duIGFzIFJlY29yZDxzdHJpbmcsIHVua25vd24+IH0pXG4gICAgICAgIC5vbkNvbmZsaWN0RG9Ob3RoaW5nKCk7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICBhc3luYyBibG9ja1Rhc2soaW5wdXQ6IHtcbiAgICB3b3JrSXRlbUlkOiBzdHJpbmc7XG4gICAgcmVhc29uOiBCbG9ja2VkUmVhc29uO1xuICAgIGFjdG9ySWQ6IHN0cmluZztcbiAgICBmZW5jaW5nVG9rZW4/OiBudW1iZXI7XG4gIH0pOiBQcm9taXNlPFdvcmtJdGVtPiB7XG4gICAgY29uc3QgaXRlbSA9IGF3YWl0IHRoaXMubXVzdEdldEl0ZW0oaW5wdXQud29ya0l0ZW1JZCk7XG4gICAgaWYgKCEoQkxPQ0tFRF9SRUFTT05TIGFzIHJlYWRvbmx5IHN0cmluZ1tdKS5pbmNsdWRlcyhpbnB1dC5yZWFzb24pKSB7XG4gICAgICB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcihgdW5rbm93biBibG9ja2luZyBjb25kaXRpb246ICR7aW5wdXQucmVhc29ufWApO1xuICAgIH1cbiAgICBhd2FpdCB0aGlzLnZhbGlkYXRlUHJlc2VudGVkVG9rZW4oaXRlbSwgaW5wdXQuZmVuY2luZ1Rva2VuLCBpbnB1dC5hY3RvcklkKTtcbiAgICBhd2FpdCB0aGlzLnJlcXVpcmVQZXJtaXNzaW9uKGlucHV0LmFjdG9ySWQsICd0YXNrLmJsb2NrJyk7XG4gICAgcmV0dXJuIHRoaXMuZGIudHJhbnNhY3Rpb24oYXN5bmMgKHR4KSA9PiB7XG4gICAgICBhd2FpdCB0eFxuICAgICAgICAudXBkYXRlKHdvcmtJdGVtcylcbiAgICAgICAgLnNldCh7IGJsb2NrZWRSZWFzb246IGlucHV0LnJlYXNvbiwgc3RhdGVWZXJzaW9uOiBpdGVtLnN0YXRlVmVyc2lvbiArIDEgfSlcbiAgICAgICAgLndoZXJlKGVxKHdvcmtJdGVtcy5pZCwgaXRlbS5pZCkpO1xuICAgICAgYXdhaXQgdGhpcy5hcHBlbmRUeCh0eCwgJ3dvcmtfaXRlbScsIGl0ZW0uaWQsICd3b3JrX2l0ZW0uYmxvY2tlZCcsIGlucHV0LmFjdG9ySWQsIHtcbiAgICAgICAgcmVhc29uOiBpbnB1dC5yZWFzb24sXG4gICAgICB9KTtcbiAgICAgIHJldHVybiB0aGlzLnB1YmxpY0l0ZW0oeyAuLi5pdGVtLCBibG9ja2VkUmVhc29uOiBpbnB1dC5yZWFzb24sIHN0YXRlVmVyc2lvbjogaXRlbS5zdGF0ZVZlcnNpb24gKyAxIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgYXN5bmMgdW5ibG9ja1Rhc2soaW5wdXQ6IHsgd29ya0l0ZW1JZDogc3RyaW5nOyBhY3RvcklkOiBzdHJpbmcgfSk6IFByb21pc2U8V29ya0l0ZW0+IHtcbiAgICBjb25zdCBpdGVtID0gYXdhaXQgdGhpcy5tdXN0R2V0SXRlbShpbnB1dC53b3JrSXRlbUlkKTtcbiAgICAvLyBcdTAwQTc0LjI6IHJldmlld19ub25fY29udmVyZ2VuY2UgY2FuIG9ubHkgYmUgcmVsZWFzZWQgYnkgYSByZXZpZXctZ2F0ZVxuICAgIC8vIGhvbGRlcjsgb3JkaW5hcnkgYmxvY2tzIHJlbGVhc2UgdW5kZXIgdGFzay5ibG9jay5cbiAgICBpZiAoaXRlbS5ibG9ja2VkUmVhc29uID09PSAncmV2aWV3X25vbl9jb252ZXJnZW5jZScpIHtcbiAgICAgIGF3YWl0IHRoaXMucmVxdWlyZVBlcm1pc3Npb24oaW5wdXQuYWN0b3JJZCwgJ2dhdGUucmV2aWV3LmFwcHJvdmUnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgYXdhaXQgdGhpcy5yZXF1aXJlUGVybWlzc2lvbihpbnB1dC5hY3RvcklkLCAndGFzay5ibG9jaycpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5kYi50cmFuc2FjdGlvbihhc3luYyAodHgpID0+IHtcbiAgICAgIGF3YWl0IHR4XG4gICAgICAgIC51cGRhdGUod29ya0l0ZW1zKVxuICAgICAgICAuc2V0KHsgYmxvY2tlZFJlYXNvbjogbnVsbCwgc3RhdGVWZXJzaW9uOiBpdGVtLnN0YXRlVmVyc2lvbiArIDEgfSlcbiAgICAgICAgLndoZXJlKGVxKHdvcmtJdGVtcy5pZCwgaXRlbS5pZCkpO1xuICAgICAgYXdhaXQgdGhpcy5hcHBlbmRUeCh0eCwgJ3dvcmtfaXRlbScsIGl0ZW0uaWQsICd3b3JrX2l0ZW0udW5ibG9ja2VkJywgaW5wdXQuYWN0b3JJZCwge30pO1xuICAgICAgcmV0dXJuIHRoaXMucHVibGljSXRlbSh7IC4uLml0ZW0sIGJsb2NrZWRSZWFzb246IG51bGwsIHN0YXRlVmVyc2lvbjogaXRlbS5zdGF0ZVZlcnNpb24gKyAxIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgLy8gLS0gZ2F0ZXMgJiBldmlkZW5jZSAocm9hZG1hcCBcdTAwQTcxLjQpIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIGFzeW5jIHN1Ym1pdEV2aWRlbmNlKGlucHV0OiB7XG4gICAgd29ya0l0ZW1JZDogc3RyaW5nO1xuICAgIGV2aWRlbmNlOiBFdmlkZW5jZTtcbiAgICBhY3RvcklkOiBzdHJpbmc7XG4gICAgZmVuY2luZ1Rva2VuPzogbnVtYmVyO1xuICB9KTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgaXRlbSA9IGF3YWl0IHRoaXMubXVzdEdldEl0ZW0oaW5wdXQud29ya0l0ZW1JZCk7XG4gICAgYXdhaXQgdGhpcy52YWxpZGF0ZVByZXNlbnRlZFRva2VuKGl0ZW0sIGlucHV0LmZlbmNpbmdUb2tlbiwgaW5wdXQuYWN0b3JJZCk7XG4gICAgYXdhaXQgdGhpcy5kYi50cmFuc2FjdGlvbihhc3luYyAodHgpID0+IHtcbiAgICAgIGF3YWl0IHR4Lmluc2VydChldmlkZW5jZVRhYmxlKS52YWx1ZXMoe1xuICAgICAgICB3b3JrSXRlbUlkOiBpdGVtLmlkLFxuICAgICAgICBraW5kOiBpbnB1dC5ldmlkZW5jZS5raW5kLFxuICAgICAgICBwYXlsb2FkOiBpbnB1dC5ldmlkZW5jZS5wYXlsb2FkLFxuICAgICAgfSk7XG4gICAgICBhd2FpdCB0aGlzLmFwcGVuZFR4KHR4LCAnd29ya19pdGVtJywgaXRlbS5pZCwgJ2V2aWRlbmNlLnN1Ym1pdHRlZCcsIGlucHV0LmFjdG9ySWQsIHtcbiAgICAgICAga2luZDogaW5wdXQuZXZpZGVuY2Uua2luZCxcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgYXN5bmMgYXBwcm92ZUdhdGUoaW5wdXQ6IEdhdGVEZWNpc2lvbklucHV0KTogUHJvbWlzZTxXb3JrSXRlbT4ge1xuICAgIGNvbnN0IGl0ZW0gPSBhd2FpdCB0aGlzLm11c3RHZXRJdGVtKGlucHV0LndvcmtJdGVtSWQpO1xuXG4gICAgaWYgKGlucHV0LmdhdGUgPT09ICdzcGVjX2FwcHJvdmFsJykge1xuICAgICAgLy8gUGVybWlzc2lvbiBwcmVjZWRlcyBhbnkgZWZmZWN0OiBhIGRlbmllZCBhdHRlbXB0IHBpbnMgbm90aGluZy5cbiAgICAgIGF3YWl0IHRoaXMucmVxdWlyZVBlcm1pc3Npb24oaW5wdXQuYWN0b3JJZCwgJ2dhdGUuc3BlYy5hcHByb3ZlJyk7XG4gICAgICBpZiAoaXRlbS5ibG9ja2VkUmVhc29uICE9PSBudWxsKSB7XG4gICAgICAgIHRocm93IG5ldyBHdWFyZEZhaWxlZEVycm9yKGB3b3JrIGl0ZW0gaXMgYmxvY2tlZDogJHtpdGVtLmJsb2NrZWRSZWFzb259YCk7XG4gICAgICB9XG4gICAgICBpZiAoaXRlbS5zdGF0ZSAhPT0gJ2RyYWZ0Jykge1xuICAgICAgICB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcihgc3BlY19hcHByb3ZhbCBhcHBsaWVzIHRvIGRyYWZ0IGl0ZW1zLCBub3QgJHtpdGVtLnN0YXRlfWApO1xuICAgICAgfVxuICAgICAgY29uc3QgcXVvcnVtTWV0ID0gYXdhaXQgdGhpcy5xdW9ydW1Xb3VsZEJlTWV0KGl0ZW0sICdzcGVjX2FwcHJvdmFsJywgaW5wdXQuYWN0b3JJZCk7XG4gICAgICByZXR1cm4gdGhpcy5kYi50cmFuc2FjdGlvbihhc3luYyAodHgpID0+IHtcbiAgICAgICAgbGV0IHBpbm5lZCA9IGl0ZW0ucGlubmVkVmVyaWZpY2F0aW9uO1xuICAgICAgICBpZiAoaW5wdXQucGlubmVkVmVyaWZpY2F0aW9uICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBwaW5uZWQgPSBbLi4uaW5wdXQucGlubmVkVmVyaWZpY2F0aW9uXTtcbiAgICAgICAgICBhd2FpdCB0eC51cGRhdGUod29ya0l0ZW1zKS5zZXQoeyBwaW5uZWRWZXJpZmljYXRpb246IHBpbm5lZCB9KS53aGVyZShlcSh3b3JrSXRlbXMuaWQsIGl0ZW0uaWQpKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBwaW5uZWRJdGVtID0geyAuLi5pdGVtLCBwaW5uZWRWZXJpZmljYXRpb246IHBpbm5lZCB9O1xuICAgICAgICBhd2FpdCB0aGlzLnJlY29yZEFwcHJvdmFsVHgodHgsIHBpbm5lZEl0ZW0sICdzcGVjX2FwcHJvdmFsJywgaW5wdXQuYWN0b3JJZCk7XG4gICAgICAgIGlmICghcXVvcnVtTWV0KSB7XG4gICAgICAgICAgLy8gRGVjaXNpb24gcmVjb3JkZWQ7IHF1b3J1bSBwZW5kaW5nIChnYXRlIHBvbGljeSBpcyBkYXRhLCByb2FkbWFwIFx1MDBBNzMpLlxuICAgICAgICAgIHJldHVybiB0aGlzLnB1YmxpY0l0ZW0ocGlubmVkSXRlbSk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gVGhlIGFwcHJvdmFsIGZpcmVzIHRoZSBnYXRlZCBmb3J3YXJkIHRyYW5zaXRpb24gKGNvbmZvcm1hbmNlIHBpbikuXG4gICAgICAgIHJldHVybiB0aGlzLmV4ZWN1dGVUcmFuc2l0aW9uVHgodHgsIHBpbm5lZEl0ZW0sICdyZWFkeV9mb3JfZGV2JywgaW5wdXQuYWN0b3JJZCk7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICAvLyByZXZpZXdfYXBwcm92YWxcbiAgICBhd2FpdCB0aGlzLnJlcXVpcmVQZXJtaXNzaW9uKGlucHV0LmFjdG9ySWQsICdnYXRlLnJldmlldy5hcHByb3ZlJyk7XG4gICAgaWYgKGl0ZW0uYmxvY2tlZFJlYXNvbiAhPT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoYHdvcmsgaXRlbSBpcyBibG9ja2VkOiAke2l0ZW0uYmxvY2tlZFJlYXNvbn1gKTtcbiAgICB9XG4gICAgaWYgKGl0ZW0uc3RhdGUgIT09ICdpbl9yZXZpZXcnKSB7XG4gICAgICB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcihgcmV2aWV3X2FwcHJvdmFsIGFwcGxpZXMgdG8gaW5fcmV2aWV3IGl0ZW1zLCBub3QgJHtpdGVtLnN0YXRlfWApO1xuICAgIH1cbiAgICBjb25zdCBxdW9ydW1NZXQgPSBhd2FpdCB0aGlzLnF1b3J1bVdvdWxkQmVNZXQoaXRlbSwgJ3Jldmlld19hcHByb3ZhbCcsIGlucHV0LmFjdG9ySWQpO1xuICAgIC8vIEV2aWRlbmNlIGlzIGNoZWNrZWQgZXhhY3RseSB3aGVuIHRoZSBxdW9ydW0gd291bGQgY29tcGxldGUsIHNvIGEgZmFpbGVkXG4gICAgLy8gYXBwcm92YWwgcmVjb3JkcyBub3RoaW5nIChQaGFzZSAxIHBpbjogZGVuaWVkIGF0dGVtcHRzIG11dGF0ZSBub3RoaW5nKS5cbiAgICBpZiAocXVvcnVtTWV0KSBhd2FpdCB0aGlzLmNoZWNrUmV2aWV3RXZpZGVuY2UoaXRlbSk7XG4gICAgcmV0dXJuIHRoaXMuZGIudHJhbnNhY3Rpb24oYXN5bmMgKHR4KSA9PiB7XG4gICAgICBhd2FpdCB0aGlzLnJlY29yZEFwcHJvdmFsVHgodHgsIGl0ZW0sICdyZXZpZXdfYXBwcm92YWwnLCBpbnB1dC5hY3RvcklkKTtcbiAgICAgIGlmICghcXVvcnVtTWV0KSB7XG4gICAgICAgIHJldHVybiB0aGlzLnB1YmxpY0l0ZW0oaXRlbSk7IC8vIHF1b3J1bSBwZW5kaW5nIFx1MjAxNCBubyB0cmFuc2l0aW9uIHlldFxuICAgICAgfVxuICAgICAgcmV0dXJuIHRoaXMuZXhlY3V0ZVRyYW5zaXRpb25UeCh0eCwgaXRlbSwgJ2RvbmUnLCBpbnB1dC5hY3RvcklkKTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKiBEaXN0aW5jdCBhcHByb3ZlcnMgb2YgdGhpcyByb3VuZCAocm91bmQgPSByZXZpZXdMb29wSXRlcmF0aW9uIGF0IGRlY2lzaW9uIHRpbWUpLiAqL1xuICBwcml2YXRlIGFzeW5jIHJvdW5kQXBwcm92ZXJzKGl0ZW06IFdvcmtJdGVtUm93LCBnYXRlOiBHYXRlQ29kZSk6IFByb21pc2U8QWN0b3JSb3dbXT4ge1xuICAgIGNvbnN0IHJvd3MgPSBhd2FpdCB0aGlzLmRiXG4gICAgICAuc2VsZWN0KHsgYWN0b3JJZDogZ2F0ZURlY2lzaW9ucy5hY3RvcklkIH0pXG4gICAgICAuZnJvbShnYXRlRGVjaXNpb25zKVxuICAgICAgLndoZXJlKFxuICAgICAgICBhbmQoXG4gICAgICAgICAgZXEoZ2F0ZURlY2lzaW9ucy53b3JrSXRlbUlkLCBpdGVtLmlkKSxcbiAgICAgICAgICBlcShnYXRlRGVjaXNpb25zLmdhdGUsIGdhdGUpLFxuICAgICAgICAgIGVxKGdhdGVEZWNpc2lvbnMuZGVjaXNpb24sICdhcHByb3ZlZCcpLFxuICAgICAgICAgIGVxKGdhdGVEZWNpc2lvbnMucm91bmQsIGl0ZW0ucmV2aWV3TG9vcEl0ZXJhdGlvbiksXG4gICAgICAgICksXG4gICAgICApXG4gICAgICAub3JkZXJCeShhc2MoZ2F0ZURlY2lzaW9ucy5zZXEpKTtcbiAgICBjb25zdCBpZHMgPSBbLi4ubmV3IFNldChyb3dzLm1hcCgocm93KSA9PiByb3cuYWN0b3JJZCkpXTtcbiAgICBjb25zdCByZXN1bHQ6IEFjdG9yUm93W10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IGlkIG9mIGlkcykge1xuICAgICAgY29uc3QgYWN0b3IgPSBhd2FpdCB0aGlzLmdldEFjdG9yUm93KGlkKTtcbiAgICAgIGlmIChhY3RvcikgcmVzdWx0LnB1c2goYWN0b3IpO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgLyoqIEdhdGUgcG9saWN5IHF1b3J1bSAocm9hZG1hcCBcdTAwQTczKTogbWluIGRpc3RpbmN0IGFwcHJvdmVycyArIHJlcXVpcmVkIGFjdG9yIHR5cGVzLCBhcyBEQVRBLiAqL1xuICBwcml2YXRlIGFzeW5jIHF1b3J1bVdvdWxkQmVNZXQoaXRlbTogV29ya0l0ZW1Sb3csIGdhdGU6IEdhdGVDb2RlLCBuZXh0QXBwcm92ZXJJZDogc3RyaW5nKTogUHJvbWlzZTxib29sZWFuPiB7XG4gICAgY29uc3QgcG9saWN5ID0gYXdhaXQgdGhpcy5nZXRHYXRlUG9saWN5KGdhdGUpO1xuICAgIGNvbnN0IG1pbiA9IHBvbGljeS5taW5BcHByb3ZhbHMgPz8gMTtcbiAgICBjb25zdCByZXF1aXJlZCA9IHBvbGljeS5yZXF1aXJlZEFjdG9yVHlwZXMgPz8gW107XG4gICAgY29uc3QgYXBwcm92ZXJzID0gYXdhaXQgdGhpcy5yb3VuZEFwcHJvdmVycyhpdGVtLCBnYXRlKTtcbiAgICBjb25zdCBuZXh0QWN0b3IgPSBhd2FpdCB0aGlzLmdldEFjdG9yUm93KG5leHRBcHByb3ZlcklkKTtcbiAgICBpZiAobmV4dEFjdG9yICYmICFhcHByb3ZlcnMuc29tZSgoYSkgPT4gYS5pZCA9PT0gbmV4dEFjdG9yLmlkKSkgYXBwcm92ZXJzLnB1c2gobmV4dEFjdG9yKTtcbiAgICBpZiAoYXBwcm92ZXJzLmxlbmd0aCA8IG1pbikgcmV0dXJuIGZhbHNlO1xuICAgIGZvciAoY29uc3QgdHlwZSBvZiByZXF1aXJlZCkge1xuICAgICAgaWYgKCFhcHByb3ZlcnMuc29tZSgoYSkgPT4gYS50eXBlID09PSB0eXBlKSkgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgcmVjb3JkQXBwcm92YWxUeCh0eDogUXVlcnlhYmxlLCBpdGVtOiBXb3JrSXRlbVJvdywgZ2F0ZTogR2F0ZUNvZGUsIGFjdG9ySWQ6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xuICAgIGF3YWl0IHR4Lmluc2VydChnYXRlRGVjaXNpb25zKS52YWx1ZXMoe1xuICAgICAgd29ya0l0ZW1JZDogaXRlbS5pZCxcbiAgICAgIGdhdGUsXG4gICAgICBkZWNpc2lvbjogJ2FwcHJvdmVkJyxcbiAgICAgIGFjdG9ySWQsXG4gICAgICByb3VuZDogaXRlbS5yZXZpZXdMb29wSXRlcmF0aW9uLFxuICAgIH0pO1xuICAgIGF3YWl0IHRoaXMuYXBwZW5kVHgodHgsICd3b3JrX2l0ZW0nLCBpdGVtLmlkLCAnZ2F0ZS5hcHByb3ZlZCcsIGFjdG9ySWQsIHtcbiAgICAgIGdhdGUsXG4gICAgICByb3VuZDogaXRlbS5yZXZpZXdMb29wSXRlcmF0aW9uLFxuICAgICAgLi4uKGdhdGUgPT09ICdzcGVjX2FwcHJvdmFsJyA/IHsgcGlubmVkVmVyaWZpY2F0aW9uOiBpdGVtLnBpbm5lZFZlcmlmaWNhdGlvbiB9IDoge30pLFxuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEV2aWRlbmNlIGNvbmRpdGlvbiBvZiB0aGUgZG9uZSBnYXRlIChcdTAwQTcxLjQsIEQ3KTogZXZlcnkgUElOTkVEIGNvbW1hbmQnc1xuICAgKiBsYXRlc3QgdGVzdF9ydW4gZXhpdGVkIDAsIGFuZCB0aGUgZmluYWwgY29tbWl0IGlzIHJlYWNoYWJsZSBvbiB0aGVcbiAgICogcmVtb3RlLiByZXZpZXdfcmVwb3J0IGlzIG5ldmVyIGNvbnN1bHRlZC5cbiAgICovXG4gIHByaXZhdGUgYXN5bmMgY2hlY2tSZXZpZXdFdmlkZW5jZShpdGVtOiBXb3JrSXRlbVJvdyk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IHJvd3MgPSBhd2FpdCB0aGlzLmRiXG4gICAgICAuc2VsZWN0KClcbiAgICAgIC5mcm9tKGV2aWRlbmNlVGFibGUpXG4gICAgICAud2hlcmUoZXEoZXZpZGVuY2VUYWJsZS53b3JrSXRlbUlkLCBpdGVtLmlkKSlcbiAgICAgIC5vcmRlckJ5KGFzYyhldmlkZW5jZVRhYmxlLnNlcSkpO1xuICAgIGZvciAoY29uc3QgY29tbWFuZCBvZiBpdGVtLnBpbm5lZFZlcmlmaWNhdGlvbiA/PyBbXSkge1xuICAgICAgY29uc3QgcnVucyA9IHJvd3MuZmlsdGVyKChyb3cpID0+IHJvdy5raW5kID09PSAndGVzdF9ydW4nICYmIHJvdy5wYXlsb2FkWydjb21tYW5kJ10gPT09IGNvbW1hbmQpO1xuICAgICAgY29uc3QgbGF0ZXN0ID0gcnVuc1tydW5zLmxlbmd0aCAtIDFdO1xuICAgICAgaWYgKCFsYXRlc3QgfHwgbGF0ZXN0LnBheWxvYWRbJ2V4aXRDb2RlJ10gIT09IDApIHtcbiAgICAgICAgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoYHBpbm5lZCB2ZXJpZmljYXRpb24gZGlkIG5vdCBwYXNzOiAke2NvbW1hbmR9YCk7XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChpdGVtLmtpbmQgPT09ICdjb2RlJykge1xuICAgICAgLy8gTm9uLWNvZGUgZGVsaXZlcmFibGVzIGNhcnJ5IG5vIGNvbW1pdCByZXF1aXJlbWVudCAocm9hZG1hcCBcdTAwQTcxLjQpOlxuICAgICAgLy8gdGhlaXIgY29tcGxldGlvbiByZXN0cyBvbiBtYWNoaW5lLWNoZWNrYWJsZSBkb2MgZXZpZGVuY2UgcGx1cyB0aGVcbiAgICAgIC8vIHBlcm1pdHRlZCBhY3RvcidzIGRlY2lzaW9uLlxuICAgICAgY29uc3QgY29tbWl0T2sgPSByb3dzLnNvbWUoKHJvdykgPT4gcm93LmtpbmQgPT09ICdjb21taXQnICYmIHJvdy5wYXlsb2FkWydyZWFjaGFibGVPblJlbW90ZSddID09PSB0cnVlKTtcbiAgICAgIGlmICghY29tbWl0T2spIHtcbiAgICAgICAgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoXG4gICAgICAgICAgJ2ZpbmFsIHJldmlzaW9uIG11c3QgYmUgcmVhY2hhYmxlIG9uIHRoZSByZW1vdGUgKHB1c2ggaXMgcGFydCBvZiB0aGUgSEFMVCBjb250cmFjdCknLFxuICAgICAgICApO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGFzeW5jIHJlamVjdEdhdGUoaW5wdXQ6IEdhdGVEZWNpc2lvbklucHV0KTogUHJvbWlzZTxXb3JrSXRlbT4ge1xuICAgIGNvbnN0IGl0ZW0gPSBhd2FpdCB0aGlzLm11c3RHZXRJdGVtKGlucHV0LndvcmtJdGVtSWQpO1xuICAgIGlmIChpbnB1dC5nYXRlICE9PSAncmV2aWV3X2FwcHJvdmFsJykge1xuICAgICAgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoJ29ubHkgcmV2aWV3X2FwcHJvdmFsIHJlamVjdGlvbiBpcyBkZWZpbmVkIGluIFBoYXNlIDEnKTtcbiAgICB9XG4gICAgLy8gUGhhc2UgMiAoYWRkaXRpdmUpOiByZWplY3Rpb24gYXV0aG9yaXR5ID0gZ2F0ZS5yZXZpZXcuYXBwcm92ZSBPUlxuICAgIC8vIGdhdGUucmV2aWV3LnJlamVjdCBcdTIwMTQgdGhlIFBoYXNlIDIgZXhpdCBjcml0ZXJpb24ncyByZXZpZXdlci1hZ2VudCBob2xkc1xuICAgIC8vIG9ubHkgdGhlIGxhdHRlci4gRXZlcnkgUGhhc2UgMSBwaW4gb24gcmVqZWN0R2F0ZSBrZWVwcyBob2xkaW5nLlxuICAgIGlmIChcbiAgICAgICEoYXdhaXQgdGhpcy5oYXNQZXJtaXNzaW9uKGlucHV0LmFjdG9ySWQsICdnYXRlLnJldmlldy5hcHByb3ZlJykpICYmXG4gICAgICAhKGF3YWl0IHRoaXMuaGFzUGVybWlzc2lvbihpbnB1dC5hY3RvcklkLCAnZ2F0ZS5yZXZpZXcucmVqZWN0JykpXG4gICAgKSB7XG4gICAgICB0aHJvdyBuZXcgUGVybWlzc2lvbkRlbmllZEVycm9yKCdnYXRlLnJldmlldy5yZWplY3QnLCBpbnB1dC5hY3RvcklkKTtcbiAgICB9XG4gICAgaWYgKGl0ZW0uc3RhdGUgIT09ICdpbl9yZXZpZXcnKSB7XG4gICAgICB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcihgcmV2aWV3IHJlamVjdGlvbiBhcHBsaWVzIHRvIGluX3JldmlldyBpdGVtcywgbm90ICR7aXRlbS5zdGF0ZX1gKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuZGIudHJhbnNhY3Rpb24oYXN5bmMgKHR4KSA9PiB7XG4gICAgICBhd2FpdCB0eC5pbnNlcnQoZ2F0ZURlY2lzaW9ucykudmFsdWVzKHtcbiAgICAgICAgd29ya0l0ZW1JZDogaXRlbS5pZCxcbiAgICAgICAgZ2F0ZTogJ3Jldmlld19hcHByb3ZhbCcsXG4gICAgICAgIGRlY2lzaW9uOiAncmVqZWN0ZWQnLFxuICAgICAgICBhY3RvcklkOiBpbnB1dC5hY3RvcklkLFxuICAgICAgICByb3VuZDogaXRlbS5yZXZpZXdMb29wSXRlcmF0aW9uLFxuICAgICAgfSk7XG4gICAgICBjb25zdCBkZWNpc2lvbkV2ZW50ID0gYXdhaXQgdGhpcy5hcHBlbmRUeCh0eCwgJ3dvcmtfaXRlbScsIGl0ZW0uaWQsICdnYXRlLnJlamVjdGVkJywgaW5wdXQuYWN0b3JJZCwge1xuICAgICAgICBnYXRlOiAncmV2aWV3X2FwcHJvdmFsJyxcbiAgICAgIH0pO1xuXG4gICAgICBpZiAoaXRlbS5yZXZpZXdMb29wSXRlcmF0aW9uID49IFJFVklFV19MT09QX0xJTUlUKSB7XG4gICAgICAgIC8vIFRoZSA2dGggcmVqZWN0aW9uIHBlcmZvcm1zIG5vIGxvb3BiYWNrOiBvdmVybGF5IHJldmlld19ub25fY29udmVyZ2VuY2UsXG4gICAgICAgIC8vIHN0YXRlIGZyb3plbiBhdCBpbl9yZXZpZXcsIGNvdW50ZXIgdW50b3VjaGVkIChDT05GT1JNQU5DRS5tZCBwaW4pLlxuICAgICAgICBhd2FpdCB0eFxuICAgICAgICAgIC51cGRhdGUod29ya0l0ZW1zKVxuICAgICAgICAgIC5zZXQoeyBibG9ja2VkUmVhc29uOiAncmV2aWV3X25vbl9jb252ZXJnZW5jZScsIHN0YXRlVmVyc2lvbjogaXRlbS5zdGF0ZVZlcnNpb24gKyAxIH0pXG4gICAgICAgICAgLndoZXJlKGVxKHdvcmtJdGVtcy5pZCwgaXRlbS5pZCkpO1xuICAgICAgICBhd2FpdCB0aGlzLmFwcGVuZFR4KFxuICAgICAgICAgIHR4LFxuICAgICAgICAgICd3b3JrX2l0ZW0nLFxuICAgICAgICAgIGl0ZW0uaWQsXG4gICAgICAgICAgJ3dvcmtfaXRlbS5ibG9ja2VkJyxcbiAgICAgICAgICB0aGlzLnN5c3RlbUFjdG9ySWQsXG4gICAgICAgICAgeyByZWFzb246ICdyZXZpZXdfbm9uX2NvbnZlcmdlbmNlJyB9LFxuICAgICAgICAgIHsgY2F1c2F0aW9uSWQ6IFN0cmluZyhkZWNpc2lvbkV2ZW50Lmdsb2JhbFNlcSkgfSxcbiAgICAgICAgKTtcbiAgICAgICAgcmV0dXJuIHRoaXMucHVibGljSXRlbSh7XG4gICAgICAgICAgLi4uaXRlbSxcbiAgICAgICAgICBibG9ja2VkUmVhc29uOiAncmV2aWV3X25vbl9jb252ZXJnZW5jZScsXG4gICAgICAgICAgc3RhdGVWZXJzaW9uOiBpdGVtLnN0YXRlVmVyc2lvbiArIDEsXG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICAvLyBcdTAwQTcxLjI6IHRoZSBsb29wYmFjayBpcyBhIHN5c3RlbSBlZmZlY3QgXHUyMDE0IG5vIGNsYWltLWhvbGRlciBwYXJ0aWNpcGF0aW9uLlxuICAgICAgYXdhaXQgdHhcbiAgICAgICAgLnVwZGF0ZSh3b3JrSXRlbXMpXG4gICAgICAgIC5zZXQoeyByZXZpZXdMb29wSXRlcmF0aW9uOiBpdGVtLnJldmlld0xvb3BJdGVyYXRpb24gKyAxIH0pXG4gICAgICAgIC53aGVyZShlcSh3b3JrSXRlbXMuaWQsIGl0ZW0uaWQpKTtcbiAgICAgIGNvbnN0IGJ1bXBlZCA9IHsgLi4uaXRlbSwgcmV2aWV3TG9vcEl0ZXJhdGlvbjogaXRlbS5yZXZpZXdMb29wSXRlcmF0aW9uICsgMSB9O1xuICAgICAgcmV0dXJuIHRoaXMuZXhlY3V0ZVRyYW5zaXRpb25UeChcbiAgICAgICAgdHgsXG4gICAgICAgIGJ1bXBlZCxcbiAgICAgICAgJ2luX3Byb2dyZXNzJyxcbiAgICAgICAgdGhpcy5zeXN0ZW1BY3RvcklkLFxuICAgICAgICB1bmRlZmluZWQsXG4gICAgICAgIFN0cmluZyhkZWNpc2lvbkV2ZW50Lmdsb2JhbFNlcSksXG4gICAgICApO1xuICAgIH0pO1xuICB9XG5cbiAgLy8gLS0gY29sbGFib3JhdGlvbiAoUGhhc2UgMywgcm9hZG1hcCBcdTAwQTc1KSAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICBwcml2YXRlIGFzeW5jIG11c3RHZXRUaHJlYWQodGhyZWFkSWQ6IHN0cmluZywgdHg6IFF1ZXJ5YWJsZSA9IHRoaXMuZGIpOiBQcm9taXNlPFRocmVhZFJvdz4ge1xuICAgIGNvbnN0IHJvd3MgPSBhd2FpdCB0eC5zZWxlY3QoKS5mcm9tKHRocmVhZHMpLndoZXJlKGVxKHRocmVhZHMuaWQsIHRocmVhZElkKSkubGltaXQoMSk7XG4gICAgY29uc3Qgcm93ID0gcm93c1swXTtcbiAgICBpZiAoIXJvdykgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoYHVua25vd24gdGhyZWFkOiAke3RocmVhZElkfWApO1xuICAgIHJldHVybiByb3c7XG4gIH1cblxuICBwcml2YXRlIGlzUGFydGljaXBhbnQodGhyZWFkOiBUaHJlYWRSb3csIGFjdG9ySWQ6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aHJlYWQuY3JlYXRlZEJ5ID09PSBhY3RvcklkIHx8IHRocmVhZC5wYXJ0aWNpcGFudHMuaW5jbHVkZXMoYWN0b3JJZCk7XG4gIH1cblxuICBwcml2YXRlIHB1YmxpY1RocmVhZChyb3c6IE9taXQ8VGhyZWFkUm93LCAnc2VxJz4pOiBUaHJlYWQge1xuICAgIHJldHVybiB7XG4gICAgICBpZDogcm93LmlkLFxuICAgICAgZmVhdHVyZUlkOiByb3cuZmVhdHVyZUlkLFxuICAgICAgd29ya0l0ZW1JZDogcm93LndvcmtJdGVtSWQsXG4gICAgICBraW5kOiByb3cua2luZCBhcyBUaHJlYWRLaW5kLFxuICAgICAgdmlzaWJpbGl0eTogcm93LnZpc2liaWxpdHkgYXMgVGhyZWFkVmlzaWJpbGl0eSxcbiAgICAgIGNyZWF0ZWRCeTogcm93LmNyZWF0ZWRCeSxcbiAgICAgIHBhcnRpY2lwYW50czogWy4uLnJvdy5wYXJ0aWNpcGFudHNdLFxuICAgIH07XG4gIH1cblxuICBwcml2YXRlIHB1YmxpY01lc3NhZ2Uocm93OiBNZXNzYWdlUm93KTogTWVzc2FnZSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGlkOiByb3cuaWQsXG4gICAgICB0aHJlYWRJZDogcm93LnRocmVhZElkLFxuICAgICAgc2VxOiByb3cuc2VxLFxuICAgICAgYXV0aG9ySWQ6IHJvdy5hdXRob3JJZCxcbiAgICAgIGtpbmQ6IHJvdy5raW5kIGFzIE1lc3NhZ2VbJ2tpbmQnXSxcbiAgICAgIGJvZHk6IHJvdy5ib2R5LFxuICAgICAgcmVwbHlUbzogcm93LnJlcGx5VG8sXG4gICAgfTtcbiAgfVxuXG4gIHByaXZhdGUgcHVibGljSm9iKHJvdzogT21pdDxBZ2VudEpvYlJvdywgJ3NlcSc+KTogQWdlbnRKb2Ige1xuICAgIHJldHVybiB7XG4gICAgICBpZDogcm93LmlkLFxuICAgICAgYWdlbnRBY3RvcklkOiByb3cuYWdlbnRBY3RvcklkLFxuICAgICAgdGhyZWFkSWQ6IHJvdy50aHJlYWRJZCxcbiAgICAgIG1lc3NhZ2VJZDogcm93Lm1lc3NhZ2VJZCxcbiAgICAgIHdvcmtJdGVtSWQ6IHJvdy53b3JrSXRlbUlkLFxuICAgICAgZmVhdHVyZUlkOiByb3cuZmVhdHVyZUlkLFxuICAgICAgc3RhdHVzOiByb3cuc3RhdHVzIGFzIEFnZW50Sm9iWydzdGF0dXMnXSxcbiAgICAgIGRlcHRoOiByb3cuZGVwdGgsXG4gICAgICBub3RlOiByb3cubm90ZSxcbiAgICB9O1xuICB9XG5cbiAgYXN5bmMgY3JlYXRlVGhyZWFkKGlucHV0OiB7XG4gICAgYWN0b3JJZDogc3RyaW5nO1xuICAgIGtpbmQ6IFRocmVhZEtpbmQ7XG4gICAgZmVhdHVyZUlkPzogc3RyaW5nO1xuICAgIHdvcmtJdGVtSWQ/OiBzdHJpbmc7XG4gICAgdmlzaWJpbGl0eT86IFRocmVhZFZpc2liaWxpdHk7XG4gIH0pOiBQcm9taXNlPFRocmVhZD4ge1xuICAgIGlmIChpbnB1dC5mZWF0dXJlSWQgIT09IHVuZGVmaW5lZCAmJiAoYXdhaXQgdGhpcy5nZXRGZWF0dXJlUm93KGlucHV0LmZlYXR1cmVJZCkpID09PSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcihgdW5rbm93biBmZWF0dXJlOiAke2lucHV0LmZlYXR1cmVJZH1gKTtcbiAgICB9XG4gICAgbGV0IHdvcmtJdGVtSWQ6IHN0cmluZyB8IG51bGwgPSBudWxsO1xuICAgIGlmIChpbnB1dC53b3JrSXRlbUlkICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHdvcmtJdGVtSWQgPSAoYXdhaXQgdGhpcy5tdXN0R2V0SXRlbShpbnB1dC53b3JrSXRlbUlkKSkuaWQ7XG4gICAgfVxuICAgIGNvbnN0IHRocmVhZCA9IHtcbiAgICAgIGlkOiB0aGlzLm5leHRJZCgndGgnKSxcbiAgICAgIGZlYXR1cmVJZDogaW5wdXQuZmVhdHVyZUlkID8/IG51bGwsXG4gICAgICB3b3JrSXRlbUlkLFxuICAgICAga2luZDogaW5wdXQua2luZCxcbiAgICAgIHZpc2liaWxpdHk6IGlucHV0LnZpc2liaWxpdHkgPz8gKGlucHV0LmtpbmQgPT09ICdwcml2YXRlJyA/ICdwcml2YXRlJyA6ICdvcGVuJyksXG4gICAgICBjcmVhdGVkQnk6IGlucHV0LmFjdG9ySWQsXG4gICAgICBwYXJ0aWNpcGFudHM6IFtpbnB1dC5hY3RvcklkXSxcbiAgICB9O1xuICAgIHJldHVybiB0aGlzLmRiLnRyYW5zYWN0aW9uKGFzeW5jICh0eCkgPT4ge1xuICAgICAgYXdhaXQgdHguaW5zZXJ0KHRocmVhZHMpLnZhbHVlcyh0aHJlYWQpO1xuICAgICAgYXdhaXQgdGhpcy5hcHBlbmRUeCh0eCwgJ3RocmVhZCcsIHRocmVhZC5pZCwgJ3RocmVhZC5jcmVhdGVkJywgaW5wdXQuYWN0b3JJZCwge1xuICAgICAgICBraW5kOiB0aHJlYWQua2luZCxcbiAgICAgICAgZmVhdHVyZUlkOiB0aHJlYWQuZmVhdHVyZUlkLFxuICAgICAgICB3b3JrSXRlbUlkOiB0aHJlYWQud29ya0l0ZW1JZCxcbiAgICAgICAgdmlzaWJpbGl0eTogdGhyZWFkLnZpc2liaWxpdHksXG4gICAgICB9KTtcbiAgICAgIHJldHVybiB0aGlzLnB1YmxpY1RocmVhZCh0aHJlYWQpO1xuICAgIH0pO1xuICB9XG5cbiAgYXN5bmMgYWRkVGhyZWFkUGFydGljaXBhbnQoaW5wdXQ6IHsgdGhyZWFkSWQ6IHN0cmluZzsgYWN0b3JJZDogc3RyaW5nOyBieUFjdG9ySWQ6IHN0cmluZyB9KTogUHJvbWlzZTxUaHJlYWQ+IHtcbiAgICBjb25zdCB0aHJlYWQgPSBhd2FpdCB0aGlzLm11c3RHZXRUaHJlYWQoaW5wdXQudGhyZWFkSWQpO1xuICAgIGlmICghdGhpcy5pc1BhcnRpY2lwYW50KHRocmVhZCwgaW5wdXQuYnlBY3RvcklkKSkge1xuICAgICAgdGhyb3cgbmV3IFBlcm1pc3Npb25EZW5pZWRFcnJvcigndGhyZWFkLmludml0ZScsIGlucHV0LmJ5QWN0b3JJZCk7XG4gICAgfVxuICAgIGlmICgoYXdhaXQgdGhpcy5nZXRBY3RvclJvdyhpbnB1dC5hY3RvcklkKSkgPT09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBHdWFyZEZhaWxlZEVycm9yKGB1bmtub3duIGFjdG9yOiAke2lucHV0LmFjdG9ySWR9YCk7XG4gICAgfVxuICAgIGlmICh0aHJlYWQucGFydGljaXBhbnRzLmluY2x1ZGVzKGlucHV0LmFjdG9ySWQpKSByZXR1cm4gdGhpcy5wdWJsaWNUaHJlYWQodGhyZWFkKTtcbiAgICBjb25zdCBwYXJ0aWNpcGFudHMgPSBbLi4udGhyZWFkLnBhcnRpY2lwYW50cywgaW5wdXQuYWN0b3JJZF07XG4gICAgcmV0dXJuIHRoaXMuZGIudHJhbnNhY3Rpb24oYXN5bmMgKHR4KSA9PiB7XG4gICAgICBhd2FpdCB0eC51cGRhdGUodGhyZWFkcykuc2V0KHsgcGFydGljaXBhbnRzIH0pLndoZXJlKGVxKHRocmVhZHMuaWQsIHRocmVhZC5pZCkpO1xuICAgICAgYXdhaXQgdGhpcy5hcHBlbmRUeCh0eCwgJ3RocmVhZCcsIHRocmVhZC5pZCwgJ3RocmVhZC5wYXJ0aWNpcGFudF9hZGRlZCcsIGlucHV0LmJ5QWN0b3JJZCwge1xuICAgICAgICBhY3RvcklkOiBpbnB1dC5hY3RvcklkLFxuICAgICAgfSk7XG4gICAgICByZXR1cm4gdGhpcy5wdWJsaWNUaHJlYWQoeyAuLi50aHJlYWQsIHBhcnRpY2lwYW50cyB9KTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKiBJbnRlcm5hbCBhcHBlbmQgdGhhdCBuZXZlciBydW5zIHRoZSByb3V0ZXIgXHUyMDE0IHVzZWQgZm9yIGNoYXQsIG5hcnJhdGlvbiBhbGlrZS4gKi9cbiAgcHJpdmF0ZSBhc3luYyBhcHBlbmRNZXNzYWdlVHgoXG4gICAgdHg6IFF1ZXJ5YWJsZSxcbiAgICB0aHJlYWQ6IFRocmVhZFJvdyB8IE9taXQ8VGhyZWFkUm93LCAnc2VxJz4sXG4gICAgYXV0aG9ySWQ6IHN0cmluZyxcbiAgICBraW5kOiBNZXNzYWdlWydraW5kJ10sXG4gICAgYm9keTogc3RyaW5nLFxuICAgIHJlcGx5VG86IHN0cmluZyB8IG51bGwsXG4gICk6IFByb21pc2U8TWVzc2FnZT4ge1xuICAgIC8vIFBlci10aHJlYWQsIDEtYmFzZWQsIGdhcC1mcmVlIFx1MjAxNCBVTklRVUUodGhyZWFkX2lkLCBzZXEpIGVuZm9yY2VzIGl0LCB0aGVcbiAgICAvLyBzYW1lLXRyYW5zYWN0aW9uIG1heCgpIGNvbXB1dGVzIGl0IChtaXJyb3JzIHRoZSByZWZlcmVuY2UgY291bnQrMSkuXG4gICAgY29uc3QgW3Jvd10gPSBhd2FpdCB0eFxuICAgICAgLnNlbGVjdCh7IG1heFNlcTogc3FsPG51bWJlcj5gY29hbGVzY2UobWF4KCR7bWVzc2FnZXMuc2VxfSksIDApYCB9KVxuICAgICAgLmZyb20obWVzc2FnZXMpXG4gICAgICAud2hlcmUoZXEobWVzc2FnZXMudGhyZWFkSWQsIHRocmVhZC5pZCkpO1xuICAgIGNvbnN0IHNlcSA9IE51bWJlcihyb3c/Lm1heFNlcSA/PyAwKSArIDE7XG4gICAgY29uc3QgbWVzc2FnZTogTWVzc2FnZSA9IHtcbiAgICAgIGlkOiB0aGlzLm5leHRJZCgnbXNnJyksXG4gICAgICB0aHJlYWRJZDogdGhyZWFkLmlkLFxuICAgICAgc2VxLFxuICAgICAgYXV0aG9ySWQsXG4gICAgICBraW5kLFxuICAgICAgYm9keSxcbiAgICAgIHJlcGx5VG8sXG4gICAgfTtcbiAgICBhd2FpdCB0eC5pbnNlcnQobWVzc2FnZXMpLnZhbHVlcyhtZXNzYWdlKTtcbiAgICBhd2FpdCB0aGlzLmFwcGVuZFR4KHR4LCAndGhyZWFkJywgdGhyZWFkLmlkLCAnbWVzc2FnZS5wb3N0ZWQnLCBhdXRob3JJZCwge1xuICAgICAgbWVzc2FnZUlkOiBtZXNzYWdlLmlkLFxuICAgICAga2luZCxcbiAgICB9KTtcbiAgICByZXR1cm4geyAuLi5tZXNzYWdlIH07XG4gIH1cblxuICAvKipcbiAgICogXHUwMEE3NS4yOiB0aGUgc2VydmVyIE5FVkVSIHBhcnNlcyBib2R5IHRleHQgXHUyMDE0IGBtZW50aW9uc2AgaXMgc3RydWN0dXJlZCBhY3RvclxuICAgKiBpZHMuIFx1MDBBNzUuNDogdGhlIHJvdXRlciBpcyBwdXJlIGNvZGUsIGRlZmF1bHQtZGVueSwgcG9saWN5LWdhdGVkLFxuICAgKiBkZXB0aC1jYXBwZWQ7IGEgam9iIGlzIHJlcGx5LW9ubHkgY29udGV4dCwgbmV2ZXIgYSBjbGFpbS5cbiAgICovXG4gIGFzeW5jIHBvc3RNZXNzYWdlKGlucHV0OiB7XG4gICAgdGhyZWFkSWQ6IHN0cmluZztcbiAgICBhY3RvcklkOiBzdHJpbmc7XG4gICAgYm9keTogc3RyaW5nO1xuICAgIHJlcGx5VG8/OiBzdHJpbmc7XG4gICAgbWVudGlvbnM/OiBzdHJpbmdbXTtcbiAgfSk6IFByb21pc2U8TWVzc2FnZT4ge1xuICAgIGNvbnN0IHRocmVhZCA9IGF3YWl0IHRoaXMubXVzdEdldFRocmVhZChpbnB1dC50aHJlYWRJZCk7XG4gICAgaWYgKHRocmVhZC52aXNpYmlsaXR5ID09PSAncHJpdmF0ZScgJiYgIXRoaXMuaXNQYXJ0aWNpcGFudCh0aHJlYWQsIGlucHV0LmFjdG9ySWQpKSB7XG4gICAgICB0aHJvdyBuZXcgUGVybWlzc2lvbkRlbmllZEVycm9yKCd0aHJlYWQucG9zdCcsIGlucHV0LmFjdG9ySWQpO1xuICAgIH1cbiAgICBjb25zdCBtZW50aW9uSWRzID0gWy4uLm5ldyBTZXQoaW5wdXQubWVudGlvbnMgPz8gW10pXTtcbiAgICByZXR1cm4gdGhpcy5kYi50cmFuc2FjdGlvbihhc3luYyAodHgpID0+IHtcbiAgICAgIGNvbnN0IG1lc3NhZ2UgPSBhd2FpdCB0aGlzLmFwcGVuZE1lc3NhZ2VUeCh0eCwgdGhyZWFkLCBpbnB1dC5hY3RvcklkLCAnY2hhdCcsIGlucHV0LmJvZHksIGlucHV0LnJlcGx5VG8gPz8gbnVsbCk7XG4gICAgICBmb3IgKGNvbnN0IG1lbnRpb25lZElkIG9mIG1lbnRpb25JZHMpIHtcbiAgICAgICAgY29uc3QgbWVudGlvbmVkID0gYXdhaXQgdGhpcy5nZXRBY3RvclJvdyhtZW50aW9uZWRJZCwgdHgpO1xuICAgICAgICBpZiAoIW1lbnRpb25lZCkgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoYHVua25vd24gbWVudGlvbmVkIGFjdG9yOiAke21lbnRpb25lZElkfWApO1xuICAgICAgICBjb25zdCByZXNvbHV0aW9uID0gYXdhaXQgdGhpcy5yb3V0ZU1lbnRpb25UeCh0eCwgdGhyZWFkLCBtZXNzYWdlLCBpbnB1dC5hY3RvcklkLCBtZW50aW9uZWQpO1xuICAgICAgICBhd2FpdCB0eC5pbnNlcnQobWVudGlvbnMpLnZhbHVlcyh7XG4gICAgICAgICAgbWVzc2FnZUlkOiBtZXNzYWdlLmlkLFxuICAgICAgICAgIG1lbnRpb25lZEFjdG9ySWQ6IG1lbnRpb25lZElkLFxuICAgICAgICAgIHJlc29sdXRpb24sXG4gICAgICAgIH0pO1xuICAgICAgICBhd2FpdCB0aGlzLmFwcGVuZFR4KHR4LCAndGhyZWFkJywgdGhyZWFkLmlkLCAnbWVudGlvbi5yZWNvcmRlZCcsIGlucHV0LmFjdG9ySWQsIHtcbiAgICAgICAgICBtZXNzYWdlSWQ6IG1lc3NhZ2UuaWQsXG4gICAgICAgICAgbWVudGlvbmVkQWN0b3JJZDogbWVudGlvbmVkSWQsXG4gICAgICAgICAgcmVzb2x1dGlvbixcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gbWVzc2FnZTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKiBUaGUgZGV0ZXJtaW5pc3RpYyBtZW50aW9uIHJvdXRlciAoXHUwMEE3NS40KS4gUmV0dXJucyB0aGUgcmVjb3JkZWQgcmVzb2x1dGlvbi4gKi9cbiAgcHJpdmF0ZSBhc3luYyByb3V0ZU1lbnRpb25UeChcbiAgICB0eDogVHgsXG4gICAgdGhyZWFkOiBUaHJlYWRSb3csXG4gICAgbWVzc2FnZTogTWVzc2FnZSxcbiAgICBtZW50aW9uZXJJZDogc3RyaW5nLFxuICAgIG1lbnRpb25lZDogQWN0b3JSb3csXG4gICk6IFByb21pc2U8TWVudGlvblJlc29sdXRpb24+IHtcbiAgICBpZiAobWVudGlvbmVkLnR5cGUgIT09ICdhZ2VudCcpIHtcbiAgICAgIGF3YWl0IHRoaXMucHVzaE5vdGlmaWNhdGlvblR4KHR4LCBtZW50aW9uZWQuaWQsICdtZW50aW9uJywgbWVzc2FnZS5pZCk7XG4gICAgICByZXR1cm4gJ25vdGlmaWVkJztcbiAgICB9XG4gICAgY29uc3QgcG9saWN5ID0gKGF3YWl0IHRoaXMud29ya3NwYWNlUm93KHR4KSkucG9saWN5IGFzIFdvcmtzcGFjZVBvbGljeTtcbiAgICAvLyBraWxsLXN3aXRjaCBhcHBsaWVzIHRvIGV2ZXJ5IGpvYi1tYXRlcmlhbGl6aW5nIHBhdGhcbiAgICBpZiAocG9saWN5Lm1lbnRpb25EaXNwYXRjaCA9PT0gZmFsc2UpIHJldHVybiAnZGVuaWVkX3BvbGljeSc7XG5cbiAgICBjb25zdCBtZW50aW9uZXIgPSBhd2FpdCB0aGlzLmdldEFjdG9yUm93KG1lbnRpb25lcklkLCB0eCk7XG4gICAgbGV0IGRlcHRoID0gMDtcbiAgICBpZiAobWVudGlvbmVyPy50eXBlID09PSAnYWdlbnQnKSB7XG4gICAgICAvLyBhZ2VudC1tZW50aW9uLWFnZW50OiBleHBsaWNpdCBwb2xpY3kgKyBkZXB0aCBjYXAgKFx1MDBBNzUuNClcbiAgICAgIGlmIChwb2xpY3kuYWdlbnRNZW50aW9uQWdlbnQgIT09IHRydWUpIHJldHVybiAnZGVuaWVkX3BvbGljeSc7XG4gICAgICBjb25zdCBtZW50aW9uZXJKb2JzID0gYXdhaXQgdHhcbiAgICAgICAgLnNlbGVjdCh7IGRlcHRoOiBhZ2VudEpvYnMuZGVwdGggfSlcbiAgICAgICAgLmZyb20oYWdlbnRKb2JzKVxuICAgICAgICAud2hlcmUoZXEoYWdlbnRKb2JzLmFnZW50QWN0b3JJZCwgbWVudGlvbmVySWQpKTtcbiAgICAgIGRlcHRoID0gTWF0aC5tYXgoMCwgLi4ubWVudGlvbmVySm9icy5tYXAoKGopID0+IGouZGVwdGgpKSArIDE7XG4gICAgICBpZiAoZGVwdGggPiBBR0VOVF9KT0JfTUFYX0RFUFRIKSByZXR1cm4gJ2RlbmllZF9kZXB0aCc7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIGRlZmF1bHQtZGVueTogdGhlIGh1bWFuIG1lbnRpb25lciBtdXN0IGhvbGQgaW52b2tlIGF1dGhvcml0eSBcdTIwMTRcbiAgICAgIC8vIGF0IGxlYXN0IG9uZSBhY3RpdmUgZGVsaXZlcnkgcm9sZSwgb3IgZ292ZXJuYW5jZSBhZG1pbi5cbiAgICAgIGNvbnN0IGhhc1JvbGUgPVxuICAgICAgICAoXG4gICAgICAgICAgYXdhaXQgdHhcbiAgICAgICAgICAgIC5zZWxlY3QoeyBzZXE6IHJvbGVBc3NpZ25tZW50cy5zZXEgfSlcbiAgICAgICAgICAgIC5mcm9tKHJvbGVBc3NpZ25tZW50cylcbiAgICAgICAgICAgIC53aGVyZShhbmQoZXEocm9sZUFzc2lnbm1lbnRzLmFjdG9ySWQsIG1lbnRpb25lcklkKSwgZXEocm9sZUFzc2lnbm1lbnRzLnJldm9rZWQsIGZhbHNlKSkpXG4gICAgICAgICAgICAubGltaXQoMSlcbiAgICAgICAgKS5sZW5ndGggPiAwO1xuICAgICAgY29uc3QgaXNBZG1pbiA9IG1lbnRpb25lcj8uZ292ZXJuYW5jZVJvbGUgPT09ICdhZG1pbicgfHwgbWVudGlvbmVySWQgPT09IHRoaXMuc3lzdGVtQWN0b3JJZDtcbiAgICAgIGlmICghaGFzUm9sZSAmJiAhaXNBZG1pbikgcmV0dXJuICdkZW5pZWRfcG9saWN5JztcbiAgICB9XG5cbiAgICBjb25zdCBqb2IgPSB7XG4gICAgICBpZDogdGhpcy5uZXh0SWQoJ2pvYicpLFxuICAgICAgYWdlbnRBY3RvcklkOiBtZW50aW9uZWQuaWQsXG4gICAgICB0aHJlYWRJZDogdGhyZWFkLmlkLFxuICAgICAgbWVzc2FnZUlkOiBtZXNzYWdlLmlkLFxuICAgICAgd29ya0l0ZW1JZDogdGhyZWFkLndvcmtJdGVtSWQsXG4gICAgICBmZWF0dXJlSWQ6IHRocmVhZC5mZWF0dXJlSWQsXG4gICAgICBzdGF0dXM6ICdxdWV1ZWQnIGFzIGNvbnN0LFxuICAgICAgZGVwdGgsXG4gICAgICBub3RlOiBudWxsLFxuICAgIH07XG4gICAgYXdhaXQgdHguaW5zZXJ0KGFnZW50Sm9icykudmFsdWVzKGpvYik7XG4gICAgYXdhaXQgdGhpcy5hcHBlbmRUeCh0eCwgJ2FnZW50X2pvYicsIGpvYi5pZCwgJ2FnZW50X2pvYi5jcmVhdGVkJywgbWVudGlvbmVySWQsIHtcbiAgICAgIGFnZW50QWN0b3JJZDogbWVudGlvbmVkLmlkLFxuICAgICAgdGhyZWFkSWQ6IHRocmVhZC5pZCxcbiAgICAgIG1lc3NhZ2VJZDogbWVzc2FnZS5pZCxcbiAgICAgIGRlcHRoLFxuICAgIH0pO1xuICAgIGF3YWl0IHRoaXMucHVzaE5vdGlmaWNhdGlvblR4KHR4LCBtZW50aW9uZWQuaWQsICdtZW50aW9uJywgbWVzc2FnZS5pZCk7XG4gICAgcmV0dXJuICdqb2JfY3JlYXRlZCc7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIHB1c2hOb3RpZmljYXRpb25UeChcbiAgICB0eDogUXVlcnlhYmxlLFxuICAgIGFjdG9ySWQ6IHN0cmluZyxcbiAgICBzb3VyY2U6IE5vdGlmaWNhdGlvblsnc291cmNlJ10sXG4gICAgcmVmSWQ6IHN0cmluZyxcbiAgKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgYXdhaXQgdHguaW5zZXJ0KG5vdGlmaWNhdGlvbnMpLnZhbHVlcyh7XG4gICAgICBpZDogdGhpcy5uZXh0SWQoJ250ZicpLFxuICAgICAgYWN0b3JJZCxcbiAgICAgIHNvdXJjZSxcbiAgICAgIHJlZklkLFxuICAgICAgcmVhZDogZmFsc2UsXG4gICAgfSk7XG4gIH1cblxuICBhc3luYyBsaXN0VGhyZWFkcyhmaWx0ZXI/OiB7IGZlYXR1cmVJZD86IHN0cmluZzsgd29ya0l0ZW1JZD86IHN0cmluZzsgYWN0b3JJZD86IHN0cmluZyB9KTogUHJvbWlzZTxUaHJlYWRbXT4ge1xuICAgIGNvbnN0IHJvd3MgPSBhd2FpdCB0aGlzLmRiLnNlbGVjdCgpLmZyb20odGhyZWFkcykub3JkZXJCeShhc2ModGhyZWFkcy5zZXEpKTtcbiAgICAvLyBMYXppbHkgcmVzb2x2ZWQgbGlrZSB0aGUgcmVmZXJlbmNlOiBhbiB1bmtub3duIHdvcmtJdGVtSWQgb25seSB0aHJvd3NcbiAgICAvLyB3aGVuIGF0IGxlYXN0IG9uZSB0aHJlYWQgaXMgZXhhbWluZWQgKG11c3RHZXRJdGVtIGluc2lkZSB0aGUgZmlsdGVyKS5cbiAgICBsZXQgcmVzb2x2ZWRXb3JrSXRlbUlkOiBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gICAgaWYgKGZpbHRlcj8ud29ya0l0ZW1JZCAhPT0gdW5kZWZpbmVkICYmIHJvd3MubGVuZ3RoID4gMCkge1xuICAgICAgcmVzb2x2ZWRXb3JrSXRlbUlkID0gKGF3YWl0IHRoaXMubXVzdEdldEl0ZW0oZmlsdGVyLndvcmtJdGVtSWQpKS5pZDtcbiAgICB9XG4gICAgY29uc3QgcmVzdWx0OiBUaHJlYWRbXSA9IFtdO1xuICAgIGZvciAoY29uc3Qgcm93IG9mIHJvd3MpIHtcbiAgICAgIGlmIChmaWx0ZXI/LmZlYXR1cmVJZCAhPT0gdW5kZWZpbmVkICYmIHJvdy5mZWF0dXJlSWQgIT09IGZpbHRlci5mZWF0dXJlSWQpIGNvbnRpbnVlO1xuICAgICAgaWYgKHJlc29sdmVkV29ya0l0ZW1JZCAhPT0gdW5kZWZpbmVkICYmIHJvdy53b3JrSXRlbUlkICE9PSByZXNvbHZlZFdvcmtJdGVtSWQpIGNvbnRpbnVlO1xuICAgICAgaWYgKFxuICAgICAgICBmaWx0ZXI/LmFjdG9ySWQgIT09IHVuZGVmaW5lZCAmJlxuICAgICAgICByb3cudmlzaWJpbGl0eSA9PT0gJ3ByaXZhdGUnICYmXG4gICAgICAgICF0aGlzLmlzUGFydGljaXBhbnQocm93LCBmaWx0ZXIuYWN0b3JJZClcbiAgICAgICkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIHJlc3VsdC5wdXNoKHRoaXMucHVibGljVGhyZWFkKHJvdykpO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgYXN5bmMgbGlzdE1lc3NhZ2VzKGlucHV0OiB7IHRocmVhZElkOiBzdHJpbmc7IGFjdG9ySWQ6IHN0cmluZzsgc2luY2VTZXE/OiBudW1iZXIgfSk6IFByb21pc2U8TWVzc2FnZVtdPiB7XG4gICAgY29uc3QgdGhyZWFkID0gYXdhaXQgdGhpcy5tdXN0R2V0VGhyZWFkKGlucHV0LnRocmVhZElkKTtcbiAgICBpZiAodGhyZWFkLnZpc2liaWxpdHkgPT09ICdwcml2YXRlJyAmJiAhdGhpcy5pc1BhcnRpY2lwYW50KHRocmVhZCwgaW5wdXQuYWN0b3JJZCkpIHtcbiAgICAgIHRocm93IG5ldyBQZXJtaXNzaW9uRGVuaWVkRXJyb3IoJ3RocmVhZC5yZWFkJywgaW5wdXQuYWN0b3JJZCk7XG4gICAgfVxuICAgIGNvbnN0IHJvd3MgPSBhd2FpdCB0aGlzLmRiXG4gICAgICAuc2VsZWN0KClcbiAgICAgIC5mcm9tKG1lc3NhZ2VzKVxuICAgICAgLndoZXJlKGVxKG1lc3NhZ2VzLnRocmVhZElkLCB0aHJlYWQuaWQpKVxuICAgICAgLm9yZGVyQnkoYXNjKG1lc3NhZ2VzLnNlcSkpO1xuICAgIHJldHVybiByb3dzXG4gICAgICAuZmlsdGVyKChtKSA9PiBpbnB1dC5zaW5jZVNlcSA9PT0gdW5kZWZpbmVkIHx8IG0uc2VxID4gaW5wdXQuc2luY2VTZXEpXG4gICAgICAubWFwKChtKSA9PiB0aGlzLnB1YmxpY01lc3NhZ2UobSkpO1xuICB9XG5cbiAgYXN5bmMgbGlzdE1lbnRpb25zKG1lc3NhZ2VJZDogc3RyaW5nKTogUHJvbWlzZTxNZW50aW9uW10+IHtcbiAgICBjb25zdCByb3dzID0gYXdhaXQgdGhpcy5kYlxuICAgICAgLnNlbGVjdCgpXG4gICAgICAuZnJvbShtZW50aW9ucylcbiAgICAgIC53aGVyZShlcShtZW50aW9ucy5tZXNzYWdlSWQsIG1lc3NhZ2VJZCkpXG4gICAgICAub3JkZXJCeShhc2MobWVudGlvbnMuc2VxKSk7XG4gICAgcmV0dXJuIHJvd3MubWFwKChyb3cpID0+ICh7XG4gICAgICBtZXNzYWdlSWQ6IHJvdy5tZXNzYWdlSWQsXG4gICAgICBtZW50aW9uZWRBY3RvcklkOiByb3cubWVudGlvbmVkQWN0b3JJZCxcbiAgICAgIHJlc29sdXRpb246IHJvdy5yZXNvbHV0aW9uIGFzIE1lbnRpb25SZXNvbHV0aW9uLFxuICAgIH0pKTtcbiAgfVxuXG4gIGFzeW5jIGxpc3ROb3RpZmljYXRpb25zKGlucHV0OiB7IGFjdG9ySWQ6IHN0cmluZzsgdW5yZWFkT25seT86IGJvb2xlYW4gfSk6IFByb21pc2U8Tm90aWZpY2F0aW9uW10+IHtcbiAgICBjb25zdCByb3dzID0gYXdhaXQgdGhpcy5kYlxuICAgICAgLnNlbGVjdCgpXG4gICAgICAuZnJvbShub3RpZmljYXRpb25zKVxuICAgICAgLndoZXJlKGVxKG5vdGlmaWNhdGlvbnMuYWN0b3JJZCwgaW5wdXQuYWN0b3JJZCkpXG4gICAgICAub3JkZXJCeShhc2Mobm90aWZpY2F0aW9ucy5zZXEpKTtcbiAgICByZXR1cm4gcm93c1xuICAgICAgLmZpbHRlcigobikgPT4gaW5wdXQudW5yZWFkT25seSAhPT0gdHJ1ZSB8fCAhbi5yZWFkKVxuICAgICAgLm1hcCgobikgPT4gKHsgaWQ6IG4uaWQsIGFjdG9ySWQ6IG4uYWN0b3JJZCwgc291cmNlOiBuLnNvdXJjZSBhcyBOb3RpZmljYXRpb25bJ3NvdXJjZSddLCByZWZJZDogbi5yZWZJZCwgcmVhZDogbi5yZWFkIH0pKTtcbiAgfVxuXG4gIGFzeW5jIG1hcmtOb3RpZmljYXRpb25SZWFkKGlucHV0OiB7IG5vdGlmaWNhdGlvbklkOiBzdHJpbmc7IGFjdG9ySWQ6IHN0cmluZyB9KTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3Qgcm93cyA9IGF3YWl0IHRoaXMuZGJcbiAgICAgIC5zZWxlY3QoKVxuICAgICAgLmZyb20obm90aWZpY2F0aW9ucylcbiAgICAgIC53aGVyZShlcShub3RpZmljYXRpb25zLmlkLCBpbnB1dC5ub3RpZmljYXRpb25JZCkpXG4gICAgICAubGltaXQoMSk7XG4gICAgY29uc3Qgbm90aWZpY2F0aW9uID0gcm93c1swXTtcbiAgICBpZiAoIW5vdGlmaWNhdGlvbikgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoYHVua25vd24gbm90aWZpY2F0aW9uOiAke2lucHV0Lm5vdGlmaWNhdGlvbklkfWApO1xuICAgIGlmIChub3RpZmljYXRpb24uYWN0b3JJZCAhPT0gaW5wdXQuYWN0b3JJZCkge1xuICAgICAgdGhyb3cgbmV3IFBlcm1pc3Npb25EZW5pZWRFcnJvcigndGhyZWFkLnJlYWQnLCBpbnB1dC5hY3RvcklkKTtcbiAgICB9XG4gICAgYXdhaXQgdGhpcy5kYi51cGRhdGUobm90aWZpY2F0aW9ucykuc2V0KHsgcmVhZDogdHJ1ZSB9KS53aGVyZShlcShub3RpZmljYXRpb25zLmlkLCBub3RpZmljYXRpb24uaWQpKTtcbiAgfVxuXG4gIGFzeW5jIGxpc3RBZ2VudEpvYnMoZmlsdGVyPzogeyBhZ2VudEFjdG9ySWQ/OiBzdHJpbmc7IHN0YXR1cz86IEFnZW50Sm9iWydzdGF0dXMnXSB9KTogUHJvbWlzZTxBZ2VudEpvYltdPiB7XG4gICAgY29uc3Qgcm93cyA9IGF3YWl0IHRoaXMuZGIuc2VsZWN0KCkuZnJvbShhZ2VudEpvYnMpLm9yZGVyQnkoYXNjKGFnZW50Sm9icy5zZXEpKTtcbiAgICByZXR1cm4gcm93c1xuICAgICAgLmZpbHRlcihcbiAgICAgICAgKGopID0+XG4gICAgICAgICAgKGZpbHRlcj8uYWdlbnRBY3RvcklkID09PSB1bmRlZmluZWQgfHwgai5hZ2VudEFjdG9ySWQgPT09IGZpbHRlci5hZ2VudEFjdG9ySWQpICYmXG4gICAgICAgICAgKGZpbHRlcj8uc3RhdHVzID09PSB1bmRlZmluZWQgfHwgai5zdGF0dXMgPT09IGZpbHRlci5zdGF0dXMpLFxuICAgICAgKVxuICAgICAgLm1hcCgoaikgPT4gdGhpcy5wdWJsaWNKb2IoaikpO1xuICB9XG5cbiAgYXN5bmMgY29tcGxldGVBZ2VudEpvYihpbnB1dDoge1xuICAgIGpvYklkOiBzdHJpbmc7XG4gICAgYWN0b3JJZDogc3RyaW5nO1xuICAgIHN0YXR1czogJ2RvbmUnIHwgJ2Jsb2NrZWQnO1xuICAgIG5vdGU/OiBzdHJpbmc7XG4gIH0pOiBQcm9taXNlPEFnZW50Sm9iPiB7XG4gICAgY29uc3Qgcm93cyA9IGF3YWl0IHRoaXMuZGIuc2VsZWN0KCkuZnJvbShhZ2VudEpvYnMpLndoZXJlKGVxKGFnZW50Sm9icy5pZCwgaW5wdXQuam9iSWQpKS5saW1pdCgxKTtcbiAgICBjb25zdCBqb2IgPSByb3dzWzBdO1xuICAgIGlmICgham9iKSB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcihgdW5rbm93biBhZ2VudCBqb2I6ICR7aW5wdXQuam9iSWR9YCk7XG4gICAgaWYgKGpvYi5hZ2VudEFjdG9ySWQgIT09IGlucHV0LmFjdG9ySWQpIHtcbiAgICAgIHRocm93IG5ldyBQZXJtaXNzaW9uRGVuaWVkRXJyb3IoJ2FnZW50X2pvYi5jb21wbGV0ZScsIGlucHV0LmFjdG9ySWQpO1xuICAgIH1cbiAgICBpZiAoam9iLnN0YXR1cyAhPT0gJ3F1ZXVlZCcpIHRocm93IG5ldyBHdWFyZEZhaWxlZEVycm9yKGBhZ2VudCBqb2IgJHtqb2IuaWR9IGlzIGFscmVhZHkgJHtqb2Iuc3RhdHVzfWApO1xuICAgIGNvbnN0IG5vdGUgPSBpbnB1dC5ub3RlID8/IG51bGw7XG4gICAgcmV0dXJuIHRoaXMuZGIudHJhbnNhY3Rpb24oYXN5bmMgKHR4KSA9PiB7XG4gICAgICBhd2FpdCB0eC51cGRhdGUoYWdlbnRKb2JzKS5zZXQoeyBzdGF0dXM6IGlucHV0LnN0YXR1cywgbm90ZSB9KS53aGVyZShlcShhZ2VudEpvYnMuaWQsIGpvYi5pZCkpO1xuICAgICAgYXdhaXQgdGhpcy5hcHBlbmRUeCh0eCwgJ2FnZW50X2pvYicsIGpvYi5pZCwgJ2FnZW50X2pvYi5jb21wbGV0ZWQnLCBpbnB1dC5hY3RvcklkLCB7XG4gICAgICAgIHN0YXR1czogaW5wdXQuc3RhdHVzLFxuICAgICAgICBub3RlLFxuICAgICAgfSk7XG4gICAgICAvLyBub3RpZnkgdGhlIG1lbnRpb25lciBcdTIwMTQgdGhlIHJldmVyc2UgZGlyZWN0aW9uIGlzIGEgbWVzc2FnZSArIG5vdGlmaWNhdGlvbiwgbm90aGluZyBtb3JlIChcdTAwQTc1LjQpXG4gICAgICBjb25zdCB0cmlnZ2VyID0gKFxuICAgICAgICBhd2FpdCB0eFxuICAgICAgICAgIC5zZWxlY3QoeyBhdXRob3JJZDogbWVzc2FnZXMuYXV0aG9ySWQgfSlcbiAgICAgICAgICAuZnJvbShtZXNzYWdlcylcbiAgICAgICAgICAud2hlcmUoZXEobWVzc2FnZXMuaWQsIGpvYi5tZXNzYWdlSWQpKVxuICAgICAgICAgIC5saW1pdCgxKVxuICAgICAgKVswXTtcbiAgICAgIGlmICh0cmlnZ2VyKSBhd2FpdCB0aGlzLnB1c2hOb3RpZmljYXRpb25UeCh0eCwgdHJpZ2dlci5hdXRob3JJZCwgJ2pvYl9jb21wbGV0ZWQnLCBqb2IuaWQpO1xuICAgICAgcmV0dXJuIHRoaXMucHVibGljSm9iKHsgLi4uam9iLCBzdGF0dXM6IGlucHV0LnN0YXR1cywgbm90ZSB9KTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKiBSYWlscyBcdTIxOTIgY2hhdCBuYXJyYXRpb24gKFx1MDBBNzUuMik6IHN0YXRlIGNoYW5nZXMgbmFycmF0ZSBpbnRvIGJvdW5kIHRhc2sgdGhyZWFkcy4gKi9cbiAgcHJpdmF0ZSBhc3luYyBuYXJyYXRlV29ya0l0ZW1UeCh0eDogVHgsIHdvcmtJdGVtSWQ6IHN0cmluZywgYm9keTogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgYm91bmQgPSBhd2FpdCB0eFxuICAgICAgLnNlbGVjdCgpXG4gICAgICAuZnJvbSh0aHJlYWRzKVxuICAgICAgLndoZXJlKGVxKHRocmVhZHMud29ya0l0ZW1JZCwgd29ya0l0ZW1JZCkpXG4gICAgICAub3JkZXJCeShhc2ModGhyZWFkcy5zZXEpKTtcbiAgICBmb3IgKGNvbnN0IHRocmVhZCBvZiBib3VuZCkge1xuICAgICAgYXdhaXQgdGhpcy5hcHBlbmRNZXNzYWdlVHgodHgsIHRocmVhZCwgdGhpcy5zeXN0ZW1BY3RvcklkLCAnc3lzdGVtJywgYm9keSwgbnVsbCk7XG4gICAgfVxuICB9XG5cbiAgLy8gLS0gZGlzcGF0Y2ggKHJvYWRtYXAgXHUwMEE3Mi4zKSAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIGFzeW5jIGdldFRhc2tDb250ZXh0KGlucHV0OiB7IHdvcmtJdGVtSWQ6IHN0cmluZyB9KTogUHJvbWlzZTx7IHdvcmtJdGVtOiBXb3JrSXRlbTsgZW50cnlTdGF0ZTogV29ya0l0ZW1TdGF0ZSB9PiB7XG4gICAgY29uc3QgaXRlbSA9IGF3YWl0IHRoaXMubXVzdEdldEl0ZW0oaW5wdXQud29ya0l0ZW1JZCk7XG4gICAgaWYgKGl0ZW0uc3RhdGUgPT09ICdkb25lJykge1xuICAgICAgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoJ2RvbmUgaXRlbXMgYXJlIG5ldmVyIHJlLWRpc3BhdGNoZWQ7IGZvbGxvdy11cCByZXZpZXcgaXMgYSBuZXcgd29yayBpdGVtJyk7XG4gICAgfVxuICAgIGNvbnN0IGZlYXR1cmUgPSBhd2FpdCB0aGlzLmdldEZlYXR1cmVSb3coaXRlbS5mZWF0dXJlSWQpO1xuICAgIGlmIChmZWF0dXJlPy5kaXNwYXRjaEhvbGQpIHtcbiAgICAgIHRocm93IG5ldyBHdWFyZEZhaWxlZEVycm9yKCdmZWF0dXJlIGlzIHVuZGVyIGEgZG9uZV9jaGVja3BvaW50IGRpc3BhdGNoIGhvbGQnKTtcbiAgICB9XG4gICAgcmV0dXJuIHsgd29ya0l0ZW06IHRoaXMucHVibGljSXRlbShpdGVtKSwgZW50cnlTdGF0ZTogaXRlbS5zdGF0ZSBhcyBXb3JrSXRlbVN0YXRlIH07XG4gIH1cblxuICBhc3luYyByZWxlYXNlRGlzcGF0Y2hIb2xkKGlucHV0OiB7IGZlYXR1cmVJZDogc3RyaW5nOyBhY3RvcklkOiBzdHJpbmcgfSk6IFByb21pc2U8RmVhdHVyZT4ge1xuICAgIGF3YWl0IHRoaXMucmVxdWlyZVBlcm1pc3Npb24oaW5wdXQuYWN0b3JJZCwgJ2Rpc3BhdGNoLnJlbGVhc2VfaG9sZCcpO1xuICAgIGNvbnN0IGZlYXR1cmUgPSBhd2FpdCB0aGlzLmdldEZlYXR1cmVSb3coaW5wdXQuZmVhdHVyZUlkKTtcbiAgICBpZiAoIWZlYXR1cmUpIHRocm93IG5ldyBHdWFyZEZhaWxlZEVycm9yKGB1bmtub3duIGZlYXR1cmU6ICR7aW5wdXQuZmVhdHVyZUlkfWApO1xuICAgIHJldHVybiB0aGlzLmRiLnRyYW5zYWN0aW9uKGFzeW5jICh0eCkgPT4ge1xuICAgICAgYXdhaXQgdHgudXBkYXRlKGZlYXR1cmVzKS5zZXQoeyBkaXNwYXRjaEhvbGQ6IGZhbHNlIH0pLndoZXJlKGVxKGZlYXR1cmVzLmlkLCBmZWF0dXJlLmlkKSk7XG4gICAgICBhd2FpdCB0aGlzLmFwcGVuZFR4KHR4LCAnZmVhdHVyZScsIGZlYXR1cmUuaWQsICdmZWF0dXJlLmRpc3BhdGNoX2hvbGRfcmVsZWFzZWQnLCBpbnB1dC5hY3RvcklkLCB7fSk7XG4gICAgICByZXR1cm4gdGhpcy5wdWJsaWNGZWF0dXJlKHsgLi4uZmVhdHVyZSwgZGlzcGF0Y2hIb2xkOiBmYWxzZSB9KTtcbiAgICB9KTtcbiAgfVxuXG4gIC8vIC0tIHJlY29uY2lsaWF0aW9uIChyb2FkbWFwIFx1MDBBNzEuNiwgRDY6IGRldGVjdC1vbmx5LCBuZXZlciBtdXRhdGVzKSAtLS0tLS0tLS0tLS1cblxuICBhc3luYyByZWNvbmNpbGUoaW5wdXQ6IHtcbiAgICBmaWxlczogQXJyYXk8eyB3b3JrSXRlbUlkOiBzdHJpbmc7IGZyb250bWF0dGVyU3RhdHVzOiBzdHJpbmcgfT47XG4gIH0pOiBQcm9taXNlPERpdmVyZ2VuY2VSZXBvcnRbXT4ge1xuICAgIGNvbnN0IHJlcG9ydHM6IERpdmVyZ2VuY2VSZXBvcnRbXSA9IFtdO1xuICAgIGZvciAoY29uc3QgZmlsZSBvZiBpbnB1dC5maWxlcykge1xuICAgICAgY29uc3QgaXRlbSA9IGF3YWl0IHRoaXMubXVzdEdldEl0ZW0oZmlsZS53b3JrSXRlbUlkKTtcbiAgICAgIC8vIEZpbGVzIHVuZGVyIGEgbGl2ZSBjbGFpbSBhcmUgZXhjbHVkZWQgXHUyMDE0IHBsYXlib29rcyBsZWdpdGltYXRlbHkgd3JpdGVcbiAgICAgIC8vIGZyb250bWF0dGVyIG1pZC1ydW4gKFx1MDBBNzEuNikuXG4gICAgICBpZiAoKGF3YWl0IHRoaXMubGl2ZUNsYWltKGl0ZW0uaWQpKSAhPT0gbnVsbCkgY29udGludWU7XG5cbiAgICAgIGNvbnN0IHJhdyA9IGZpbGUuZnJvbnRtYXR0ZXJTdGF0dXMudHJpbSgpO1xuICAgICAgY29uc3QgZGJTdGF0ZSA9IGl0ZW0uc3RhdGUgYXMgV29ya0l0ZW1TdGF0ZTtcbiAgICAgIGlmIChyYXcgPT09ICdibG9ja2VkJykge1xuICAgICAgICAvLyBEODogb3ZlcmxheSBpbiB0aGUgREIgYW5kIGBzdGF0dXM6IGJsb2NrZWRgIGluIHRoZSBmaWxlIGFyZSB0aGVcbiAgICAgICAgLy8gc2FtZSB0cnV0aC4gQmxvY2tlZC1pbi1maWxlIHdpdGggTk8gb3ZlcmxheSBpcyByZWFsIGRyaWZ0LlxuICAgICAgICBpZiAoaXRlbS5ibG9ja2VkUmVhc29uICE9PSBudWxsKSBjb250aW51ZTtcbiAgICAgICAgcmVwb3J0cy5wdXNoKHsgd29ya0l0ZW1JZDogaXRlbS5pZCwgZmlsZVN0YXRlOiByYXcsIGRiU3RhdGUsIGtpbmQ6ICdjb25mbGljdCcgfSk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBub3JtYWxpemVkID0gTEVHQUNZX1NUQVRVU1tyYXddO1xuICAgICAgaWYgKG5vcm1hbGl6ZWQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXBvcnRzLnB1c2goeyB3b3JrSXRlbUlkOiBpdGVtLmlkLCBmaWxlU3RhdGU6IHJhdywgZGJTdGF0ZSwga2luZDogJ2NvbmZsaWN0JyB9KTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBpZiAobm9ybWFsaXplZCA9PT0gZGJTdGF0ZSkgY29udGludWU7XG4gICAgICByZXBvcnRzLnB1c2goe1xuICAgICAgICB3b3JrSXRlbUlkOiBpdGVtLmlkLFxuICAgICAgICBmaWxlU3RhdGU6IHJhdyxcbiAgICAgICAgZGJTdGF0ZSxcbiAgICAgICAga2luZDogUkFOS1tub3JtYWxpemVkXSA+IFJBTktbZGJTdGF0ZV0gPyAnZmlsZV9haGVhZCcgOiAnZGJfYWhlYWQnLFxuICAgICAgfSk7XG4gICAgfVxuICAgIHJldHVybiByZXBvcnRzO1xuICB9XG5cbiAgLy8gLS0gcXVlcmllcyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICBhc3luYyBnZXRXb3JrSXRlbShpZDogc3RyaW5nKTogUHJvbWlzZTxXb3JrSXRlbT4ge1xuICAgIHJldHVybiB0aGlzLnB1YmxpY0l0ZW0oYXdhaXQgdGhpcy5tdXN0R2V0SXRlbShpZCkpO1xuICB9XG5cbiAgYXN5bmMgZ2V0RmVhdHVyZShpZDogc3RyaW5nKTogUHJvbWlzZTxGZWF0dXJlPiB7XG4gICAgY29uc3QgZmVhdHVyZSA9IGF3YWl0IHRoaXMuZ2V0RmVhdHVyZVJvdyhpZCk7XG4gICAgaWYgKCFmZWF0dXJlKSB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcihgdW5rbm93biBmZWF0dXJlOiAke2lkfWApO1xuICAgIHJldHVybiB0aGlzLnB1YmxpY0ZlYXR1cmUoZmVhdHVyZSk7XG4gIH1cblxuICBhc3luYyBsaXN0V29ya0l0ZW1zKGZpbHRlcj86IHtcbiAgICBzdGF0ZT86IFdvcmtJdGVtU3RhdGU7XG4gICAgZmVhdHVyZUlkPzogc3RyaW5nO1xuICAgIGNsYWltYWJsZT86IGJvb2xlYW47XG4gIH0pOiBQcm9taXNlPFdvcmtJdGVtW10+IHtcbiAgICBjb25zdCByb3dzID0gYXdhaXQgdGhpcy5kYi5zZWxlY3QoKS5mcm9tKHdvcmtJdGVtcykub3JkZXJCeShhc2Mod29ya0l0ZW1zLnNlcSkpO1xuICAgIGNvbnN0IHJlc3VsdDogV29ya0l0ZW1bXSA9IFtdO1xuICAgIGZvciAoY29uc3Qgcm93IG9mIHJvd3MpIHtcbiAgICAgIGlmIChmaWx0ZXI/LnN0YXRlICE9PSB1bmRlZmluZWQgJiYgcm93LnN0YXRlICE9PSBmaWx0ZXIuc3RhdGUpIGNvbnRpbnVlO1xuICAgICAgaWYgKGZpbHRlcj8uZmVhdHVyZUlkICE9PSB1bmRlZmluZWQgJiYgcm93LmZlYXR1cmVJZCAhPT0gZmlsdGVyLmZlYXR1cmVJZCkgY29udGludWU7XG4gICAgICBpZiAoZmlsdGVyPy5jbGFpbWFibGUgPT09IHRydWUgJiYgKGF3YWl0IHRoaXMubGl2ZUNsYWltKHJvdy5pZCkpICE9PSBudWxsKSBjb250aW51ZTtcbiAgICAgIHJlc3VsdC5wdXNoKHRoaXMucHVibGljSXRlbShyb3cpKTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIGFzeW5jIGdldENsYWltcyh3b3JrSXRlbUlkOiBzdHJpbmcpOiBQcm9taXNlPENsYWltW10+IHtcbiAgICBjb25zdCBpdGVtID0gYXdhaXQgdGhpcy5tdXN0R2V0SXRlbSh3b3JrSXRlbUlkKTtcbiAgICBjb25zdCByb3dzID0gYXdhaXQgdGhpcy5kYlxuICAgICAgLnNlbGVjdCgpXG4gICAgICAuZnJvbShjbGFpbXMpXG4gICAgICAud2hlcmUoZXEoY2xhaW1zLndvcmtJdGVtSWQsIGl0ZW0uaWQpKVxuICAgICAgLm9yZGVyQnkoYXNjKGNsYWltcy5zZXEpKTtcbiAgICByZXR1cm4gcm93cy5tYXAoKHJvdykgPT4gdGhpcy5wdWJsaWNDbGFpbShyb3cpKTtcbiAgfVxuXG4gIGFzeW5jIGV2ZW50cyhzdHJlYW1JZD86IHN0cmluZyk6IFByb21pc2U8U3BpbmVFdmVudFtdPiB7XG4gICAgY29uc3Qgcm93cyA9XG4gICAgICBzdHJlYW1JZCA9PT0gdW5kZWZpbmVkXG4gICAgICAgID8gYXdhaXQgdGhpcy5kYi5zZWxlY3QoKS5mcm9tKGV2ZW50cykub3JkZXJCeShhc2MoZXZlbnRzLmdsb2JhbFNlcSkpXG4gICAgICAgIDogYXdhaXQgdGhpcy5kYi5zZWxlY3QoKS5mcm9tKGV2ZW50cykud2hlcmUoZXEoZXZlbnRzLnN0cmVhbUlkLCBzdHJlYW1JZCkpLm9yZGVyQnkoYXNjKGV2ZW50cy5nbG9iYWxTZXEpKTtcbiAgICByZXR1cm4gcm93cy5tYXAoKHJvdykgPT4gdGhpcy5ldmVudEZyb21Sb3cocm93KSk7XG4gIH1cbn1cbiIsICIvKipcbiAqIFN5bmNocm9ub3VzIGZhY2FkZSBvdmVyIHRoZSBhc3luYyBQZ0VuZ2luZSBydW5uaW5nIGluIGEgc3luY2tpdCB3b3JrZXIuXG4gKiBJbXBsZW1lbnRzIHRoZSBleGFjdCBAb2Focy9jb3JlIFNwaW5lRW5naW5lIGludGVyZmFjZSwgc28gdGhlIGNvbmZvcm1hbmNlXG4gKiBzdWl0ZSBkcml2ZXMgUG9zdGdyZXMgdGhyb3VnaCB0aGUgc2FtZSBjYWxscyBpdCBkcml2ZXMgdGhlIG1lbW9yeSBlbmdpbmUuXG4gKi9cbmltcG9ydCB7IGNyZWF0ZVJlcXVpcmUgfSBmcm9tICdub2RlOm1vZHVsZSc7XG5pbXBvcnQgeyBkaXJuYW1lLCBqb2luIH0gZnJvbSAnbm9kZTpwYXRoJztcbmltcG9ydCB7IGZpbGVVUkxUb1BhdGggfSBmcm9tICdub2RlOnVybCc7XG5pbXBvcnQgeyBjcmVhdGVTeW5jRm4gfSBmcm9tICdzeW5ja2l0JztcblxuaW1wb3J0IHtcbiAgQ29uZmxpY3RFcnJvcixcbiAgR3VhcmRGYWlsZWRFcnJvcixcbiAgSW52YWxpZFRyYW5zaXRpb25FcnJvcixcbiAgUGVybWlzc2lvbkRlbmllZEVycm9yLFxuICBTdG9yaWVzVmFsaWRhdGlvbkVycm9yLFxuICB0eXBlIFNwaW5lRW5naW5lLFxufSBmcm9tICdAb2Focy9jb3JlJztcblxuY29uc3QgaGVyZSA9IGRpcm5hbWUoZmlsZVVSTFRvUGF0aChpbXBvcnQubWV0YS51cmwpKTtcbmNvbnN0IHdvcmtlclBhdGggPSBqb2luKGhlcmUsICcuLicsICdkaXN0JywgJ3dvcmtlci5tanMnKTtcblxudHlwZSBXaXJlUmVzdWx0ID1cbiAgfCB7IG9rOiB0cnVlOyB2YWx1ZTogdW5rbm93biB9XG4gIHwgeyBvazogZmFsc2U7IGVycm9yOiB7IG5hbWU6IHN0cmluZzsgbWVzc2FnZTogc3RyaW5nIH0gfTtcblxuY29uc3QgY2FsbFdvcmtlciA9IGNyZWF0ZVN5bmNGbih3b3JrZXJQYXRoKSBhcyAob3A6IHVua25vd24pID0+IFdpcmVSZXN1bHQ7XG5cbmNvbnN0IEVSUk9SX0NMQVNTRVM6IFJlY29yZDxzdHJpbmcsIG5ldyAoLi4uYXJnczogbmV2ZXJbXSkgPT4gRXJyb3I+ID0ge1xuICBDb25mbGljdEVycm9yOiBDb25mbGljdEVycm9yIGFzIG5ldmVyLFxuICBHdWFyZEZhaWxlZEVycm9yOiBHdWFyZEZhaWxlZEVycm9yIGFzIG5ldmVyLFxuICBJbnZhbGlkVHJhbnNpdGlvbkVycm9yOiBJbnZhbGlkVHJhbnNpdGlvbkVycm9yIGFzIG5ldmVyLFxuICBQZXJtaXNzaW9uRGVuaWVkRXJyb3I6IFBlcm1pc3Npb25EZW5pZWRFcnJvciBhcyBuZXZlcixcbiAgU3Rvcmllc1ZhbGlkYXRpb25FcnJvcjogU3Rvcmllc1ZhbGlkYXRpb25FcnJvciBhcyBuZXZlcixcbn07XG5cbmZ1bmN0aW9uIHJldGhyb3coZXJyb3I6IHsgbmFtZTogc3RyaW5nOyBtZXNzYWdlOiBzdHJpbmcgfSk6IG5ldmVyIHtcbiAgY29uc3QgQ2xzID0gRVJST1JfQ0xBU1NFU1tlcnJvci5uYW1lXTtcbiAgaWYgKENscykge1xuICAgIC8vIFJlY29uc3RydWN0IHdpdGggdGhlIHdpcmUgbWVzc2FnZTogdGhlIGNvbmZvcm1hbmNlIHN1aXRlIG1hdGNoZXNcbiAgICAvLyBjbGFzc2VzLCBub3QgY29uc3RydWN0b3IgYXJndW1lbnRzLlxuICAgIGNvbnN0IGluc3RhbmNlID0gT2JqZWN0LmNyZWF0ZShDbHMucHJvdG90eXBlKSBhcyBFcnJvcjtcbiAgICBpbnN0YW5jZS5tZXNzYWdlID0gZXJyb3IubWVzc2FnZTtcbiAgICBpbnN0YW5jZS5uYW1lID0gZXJyb3IubmFtZTtcbiAgICB0aHJvdyBpbnN0YW5jZTtcbiAgfVxuICB0aHJvdyBuZXcgRXJyb3IoYCR7ZXJyb3IubmFtZX06ICR7ZXJyb3IubWVzc2FnZX1gKTtcbn1cblxuZnVuY3Rpb24gdW53cmFwKHJlc3VsdDogV2lyZVJlc3VsdCk6IHVua25vd24ge1xuICBpZiAocmVzdWx0Lm9rKSByZXR1cm4gcmVzdWx0LnZhbHVlO1xuICByZXRocm93KHJlc3VsdC5lcnJvcik7XG59XG5cbmNvbnN0IE1FVEhPRFM6IEFycmF5PGtleW9mIFNwaW5lRW5naW5lPiA9IFtcbiAgJ2NyZWF0ZUFjdG9yJyxcbiAgJ2xpc3RBY3RvcnMnLFxuICAncHJvdmlzaW9uUGVyc29uYXMnLFxuICAnZ3JhbnQnLFxuICAncmV2b2tlJyxcbiAgJ2NyZWF0ZUZlYXR1cmUnLFxuICAnY3JlYXRlV29ya0l0ZW0nLFxuICAnaW1wb3J0U3RvcmllcycsXG4gICdjbGFpbVRhc2snLFxuICAnaGVhcnRiZWF0JyxcbiAgJ3JlbGVhc2VDbGFpbScsXG4gICdhZHZhbmNlQ2xvY2snLFxuICAnYWR2YW5jZVN0YXRlJyxcbiAgJ2Jsb2NrVGFzaycsXG4gICd1bmJsb2NrVGFzaycsXG4gICdzdWJtaXRFdmlkZW5jZScsXG4gICdhcHByb3ZlR2F0ZScsXG4gICdyZWplY3RHYXRlJyxcbiAgJ2dldFRhc2tDb250ZXh0JyxcbiAgJ3JlbGVhc2VEaXNwYXRjaEhvbGQnLFxuICAncmVjb25jaWxlJyxcbiAgJ3NldEdvdmVybmFuY2VSb2xlJyxcbiAgJ2dldEdvdmVybmFuY2VSb2xlJyxcbiAgJ2Fzc2lnblJvbGUnLFxuICAncmV2b2tlUm9sZScsXG4gICdsaXN0Um9sZUFzc2lnbm1lbnRzJyxcbiAgJ3NldFBsYW4nLFxuICAnZ2V0UGxhbicsXG4gICdzZXRXb3Jrc3BhY2VQb2xpY3knLFxuICAnZ2V0V29ya3NwYWNlUG9saWN5JyxcbiAgJ3NldEdhdGVQb2xpY3knLFxuICAnZ2V0R2F0ZVBvbGljeScsXG4gICdhdXRoekV4cGxhaW4nLFxuICAnY3JlYXRlVGhyZWFkJyxcbiAgJ2FkZFRocmVhZFBhcnRpY2lwYW50JyxcbiAgJ3Bvc3RNZXNzYWdlJyxcbiAgJ2xpc3RUaHJlYWRzJyxcbiAgJ2xpc3RNZXNzYWdlcycsXG4gICdsaXN0TWVudGlvbnMnLFxuICAnbGlzdE5vdGlmaWNhdGlvbnMnLFxuICAnbWFya05vdGlmaWNhdGlvblJlYWQnLFxuICAnbGlzdEFnZW50Sm9icycsXG4gICdjb21wbGV0ZUFnZW50Sm9iJyxcbiAgJ2dldFdvcmtJdGVtJyxcbiAgJ2dldEZlYXR1cmUnLFxuICAnZ2V0Q2xhaW1zJyxcbiAgJ2xpc3RXb3JrSXRlbXMnLFxuICAnZXZlbnRzJyxcbl07XG5cbmV4cG9ydCBpbnRlcmZhY2UgUGdTeW5jRW5naW5lT3B0aW9ucyB7XG4gIC8qKlxuICAgKiBEaXJlY3RvcnkgZm9yIGEgRFVSQUJMRSBQR2xpdGUgZGF0YWJhc2UgKHN0b3J5IDEzLCBgb2FocyBzZXJ2ZSAtLWRhdGFgKS5cbiAgICogT21pdHRlZCBcdTIxOTIgaW4tbWVtb3J5IGRhdGFiYXNlLCB0cnVuY2F0ZWQgcGVyIGVuZ2luZSAoY29uZm9ybWFuY2UgbW9kZSkuXG4gICAqL1xuICBkYXRhRGlyPzogc3RyaW5nO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlUGdTeW5jRW5naW5lKG9wdGlvbnM/OiBQZ1N5bmNFbmdpbmVPcHRpb25zKTogU3BpbmVFbmdpbmUge1xuICBjb25zdCBjcmVhdGVkID0gdW53cmFwKFxuICAgIGNhbGxXb3JrZXIoe1xuICAgICAgb3A6ICduZXcnLFxuICAgICAgLi4uKG9wdGlvbnM/LmRhdGFEaXIgIT09IHVuZGVmaW5lZCA/IHsgZGF0YURpcjogb3B0aW9ucy5kYXRhRGlyIH0gOiB7fSksXG4gICAgfSksXG4gICkgYXMgeyBlbmdpbmVJZDogbnVtYmVyIH07XG4gIGNvbnN0IGVuZ2luZUlkID0gY3JlYXRlZC5lbmdpbmVJZDtcbiAgY29uc3QgcHJveHk6IFJlY29yZDxzdHJpbmcsIHVua25vd24+ID0ge307XG4gIGZvciAoY29uc3QgbWV0aG9kIG9mIE1FVEhPRFMpIHtcbiAgICBwcm94eVttZXRob2RdID0gKC4uLmFyZ3M6IHVua25vd25bXSkgPT5cbiAgICAgIHVud3JhcChjYWxsV29ya2VyKHsgb3A6ICdjYWxsJywgZW5naW5lSWQsIG1ldGhvZCwgYXJncyB9KSk7XG4gIH1cbiAgcmV0dXJuIHByb3h5IGFzIHVua25vd24gYXMgU3BpbmVFbmdpbmU7XG59XG5cbi8vIGNyZWF0ZVJlcXVpcmUga2VwdCBmb3IgZnV0dXJlIG5hdGl2ZS1wZyBwYXRoIHJlc29sdXRpb247IGhhcm1sZXNzIGlmIHVudXNlZC5cbmV4cG9ydCBjb25zdCBfcmVxdWlyZSA9IGNyZWF0ZVJlcXVpcmUoaW1wb3J0Lm1ldGEudXJsKTtcbiIsICIvKipcbiAqIEhhbmQtbWFpbnRhaW5lZCBEREwgbWF0Y2hpbmcgc2NoZW1hLnRzIDEtMSAoZHJpenpsZS1raXQgbWlncmF0aW9uIHBpcGVsaW5lXG4gKiBpcyBsYXRlciBkZWJ0KS4gUnVucyBvbiBQR2xpdGUgaW4gdGhlIGNvbmZvcm1hbmNlIGhhcm5lc3Mgd29ya2VyLlxuICovXG5leHBvcnQgY29uc3QgU0NIRU1BX1NRTCA9IGBcbkNSRUFURSBUQUJMRSBJRiBOT1QgRVhJU1RTIGFjdG9ycyAoXG4gIGlkIFRFWFQgUFJJTUFSWSBLRVksXG4gIHR5cGUgVEVYVCBOT1QgTlVMTCxcbiAgZGlzcGxheV9uYW1lIFRFWFQgTk9UIE5VTEwsXG4gIGdvdmVybmFuY2Vfcm9sZSBURVhUIE5PVCBOVUxMIERFRkFVTFQgJ21lbWJlcicsXG4gIHBlcnNvbmFfY29kZSBURVhUXG4pO1xuXG4tLSBQaGFzZSAyIHVwZ3JhZGUgcGF0aCBmb3IgZHVyYWJsZSBkYXRhIGRpcnMgY3JlYXRlZCB1bmRlciBQaGFzZSAxIChzdG9yeSAxMykuXG5BTFRFUiBUQUJMRSBhY3RvcnMgQUREIENPTFVNTiBJRiBOT1QgRVhJU1RTIGdvdmVybmFuY2Vfcm9sZSBURVhUIE5PVCBOVUxMIERFRkFVTFQgJ21lbWJlcic7XG4tLSBQaGFzZSA0IHVwZ3JhZGUgcGF0aCAocm9hZG1hcCBcdTAwQTczKTogcGVyc29uYSBhY3RvcnMgb24gZHVyYWJsZSBQaGFzZSAxLTMgZGlycy5cbkFMVEVSIFRBQkxFIGFjdG9ycyBBREQgQ09MVU1OIElGIE5PVCBFWElTVFMgcGVyc29uYV9jb2RlIFRFWFQ7XG5cbkNSRUFURSBUQUJMRSBJRiBOT1QgRVhJU1RTIGdyYW50cyAoXG4gIGFjdG9yX2lkIFRFWFQgTk9UIE5VTEwsXG4gIHBlcm1pc3Npb24gVEVYVCBOT1QgTlVMTCxcbiAgc2NvcGUgVEVYVCxcbiAgUFJJTUFSWSBLRVkgKGFjdG9yX2lkLCBwZXJtaXNzaW9uKVxuKTtcblxuQ1JFQVRFIFRBQkxFIElGIE5PVCBFWElTVFMgcm9sZV9hc3NpZ25tZW50cyAoXG4gIHNlcSBTRVJJQUwgUFJJTUFSWSBLRVksXG4gIGFjdG9yX2lkIFRFWFQgTk9UIE5VTEwsXG4gIHJvbGVfY29kZSBURVhUIE5PVCBOVUxMLFxuICBncmFudGVkX2J5IFRFWFQgTk9UIE5VTEwsXG4gIHJldm9rZWQgQk9PTEVBTiBOT1QgTlVMTCBERUZBVUxUIEZBTFNFXG4pO1xuXG5DUkVBVEUgVEFCTEUgSUYgTk9UIEVYSVNUUyB3b3Jrc3BhY2Vfc3RhdGUgKFxuICBpZCBURVhUIFBSSU1BUlkgS0VZLFxuICBwbGFuIFRFWFQgTk9UIE5VTEwsXG4gIHBsYW5fdmVyc2lvbiBJTlRFR0VSIE5PVCBOVUxMIERFRkFVTFQgMSxcbiAgcG9saWN5IEpTT05CIE5PVCBOVUxMIERFRkFVTFQgJ3t9Jzo6anNvbmIsXG4gIHBvbGljeV92ZXJzaW9uIElOVEVHRVIgTk9UIE5VTEwgREVGQVVMVCAxXG4pO1xuXG5DUkVBVEUgVEFCTEUgSUYgTk9UIEVYSVNUUyBnYXRlX3BvbGljaWVzIChcbiAgZ2F0ZSBURVhUIFBSSU1BUlkgS0VZLFxuICBwb2xpY3kgSlNPTkIgTk9UIE5VTExcbik7XG5cbkNSRUFURSBUQUJMRSBJRiBOT1QgRVhJU1RTIGZlYXR1cmVzIChcbiAgaWQgVEVYVCBQUklNQVJZIEtFWSxcbiAgc2VxIFNFUklBTCBOT1QgTlVMTCxcbiAgc3RhdGUgVEVYVCBOT1QgTlVMTCxcbiAgZGlzcGF0Y2hfaG9sZCBCT09MRUFOIE5PVCBOVUxMIERFRkFVTFQgRkFMU0Vcbik7XG5cbkNSRUFURSBUQUJMRSBJRiBOT1QgRVhJU1RTIHdvcmtfaXRlbXMgKFxuICBpZCBURVhUIFBSSU1BUlkgS0VZLFxuICBzZXEgU0VSSUFMIE5PVCBOVUxMLFxuICBmZWF0dXJlX2lkIFRFWFQgTk9UIE5VTEwsXG4gIGV4dGVybmFsX2tleSBURVhUIE5PVCBOVUxMLFxuICBraW5kIFRFWFQgTk9UIE5VTEwgREVGQVVMVCAnY29kZScsXG4gIHRpdGxlIFRFWFQgTk9UIE5VTEwsXG4gIHN0YXRlIFRFWFQgTk9UIE5VTEwsXG4gIGJsb2NrZWRfcmVhc29uIFRFWFQsXG4gIHJldmlld19sb29wX2l0ZXJhdGlvbiBJTlRFR0VSIE5PVCBOVUxMIERFRkFVTFQgMCxcbiAgaW50ZW50X2hhc2ggVEVYVCxcbiAgcGlubmVkX3ZlcmlmaWNhdGlvbiBKU09OQixcbiAgc3BlY19jaGVja3BvaW50IEJPT0xFQU4gTk9UIE5VTEwgREVGQVVMVCBGQUxTRSxcbiAgZG9uZV9jaGVja3BvaW50IEJPT0xFQU4gTk9UIE5VTEwgREVGQVVMVCBGQUxTRSxcbiAgaW52b2tlX2Rldl93aXRoIFRFWFQgTk9UIE5VTEwgREVGQVVMVCAnJyxcbiAgc3BlY19wYXRoIFRFWFQgTk9UIE5VTEwsXG4gIHN0YXRlX3ZlcnNpb24gSU5URUdFUiBOT1QgTlVMTCBERUZBVUxUIDAsXG4gIGRlcGVuZHNfb24gSlNPTkIgTk9UIE5VTEwgREVGQVVMVCAnW10nOjpqc29uYixcbiAgbGFzdF9mZW5jaW5nX3Rva2VuIElOVEVHRVIgTk9UIE5VTEwgREVGQVVMVCAwXG4pO1xuXG4tLSBQaGFzZSA0IHVwZ3JhZGUgcGF0aCAocm9hZG1hcCBcdTAwQTcxLjQpOiBraW5kIG9uIGR1cmFibGUgUGhhc2UgMS0zIGRpcnMgc3RheXMgJ2NvZGUnLlxuQUxURVIgVEFCTEUgd29ya19pdGVtcyBBREQgQ09MVU1OIElGIE5PVCBFWElTVFMga2luZCBURVhUIE5PVCBOVUxMIERFRkFVTFQgJ2NvZGUnO1xuXG5DUkVBVEUgVEFCTEUgSUYgTk9UIEVYSVNUUyBjbGFpbXMgKFxuICBpZCBURVhUIFBSSU1BUlkgS0VZLFxuICBzZXEgU0VSSUFMIE5PVCBOVUxMLFxuICB3b3JrX2l0ZW1faWQgVEVYVCBOT1QgTlVMTCxcbiAgYWN0b3JfaWQgVEVYVCBOT1QgTlVMTCxcbiAgZmVuY2luZ190b2tlbiBJTlRFR0VSIE5PVCBOVUxMLFxuICBsZWFzZV9leHBpcmVzX2F0IEJJR0lOVCBOT1QgTlVMTCxcbiAgcmVsZWFzZWQgQk9PTEVBTiBOT1QgTlVMTCBERUZBVUxUIEZBTFNFLFxuICB0dGxfbXMgQklHSU5UIE5PVCBOVUxMXG4pO1xuXG4tLSByb2FkbWFwIFx1MDBBNzEuMzogb25lIGxpdmUgY2xhaW0gcGVyIHdvcmsgaXRlbSBcdTIwMTQgcmFjZXMgbG9zZSBieSBjb25zdHJhaW50LlxuQ1JFQVRFIFVOSVFVRSBJTkRFWCBJRiBOT1QgRVhJU1RTIGNsYWltc19vbmVfbGl2ZV9wZXJfaXRlbVxuICBPTiBjbGFpbXMgKHdvcmtfaXRlbV9pZCkgV0hFUkUgcmVsZWFzZWQgPSBmYWxzZTtcblxuQ1JFQVRFIFRBQkxFIElGIE5PVCBFWElTVFMgZ2F0ZV9kZWNpc2lvbnMgKFxuICBzZXEgU0VSSUFMIFBSSU1BUlkgS0VZLFxuICB3b3JrX2l0ZW1faWQgVEVYVCBOT1QgTlVMTCxcbiAgZ2F0ZSBURVhUIE5PVCBOVUxMLFxuICBkZWNpc2lvbiBURVhUIE5PVCBOVUxMLFxuICBhY3Rvcl9pZCBURVhUIE5PVCBOVUxMLFxuICByb3VuZCBJTlRFR0VSIE5PVCBOVUxMIERFRkFVTFQgMFxuKTtcblxuLS0gUGhhc2UgMiB1cGdyYWRlIHBhdGggZm9yIGR1cmFibGUgZGF0YSBkaXJzIGNyZWF0ZWQgdW5kZXIgUGhhc2UgMSAoc3RvcnkgMTMpLlxuQUxURVIgVEFCTEUgZ2F0ZV9kZWNpc2lvbnMgQUREIENPTFVNTiBJRiBOT1QgRVhJU1RTIHJvdW5kIElOVEVHRVIgTk9UIE5VTEwgREVGQVVMVCAwO1xuXG5DUkVBVEUgVEFCTEUgSUYgTk9UIEVYSVNUUyBldmlkZW5jZSAoXG4gIHNlcSBTRVJJQUwgUFJJTUFSWSBLRVksXG4gIHdvcmtfaXRlbV9pZCBURVhUIE5PVCBOVUxMLFxuICBraW5kIFRFWFQgTk9UIE5VTEwsXG4gIHBheWxvYWQgSlNPTkIgTk9UIE5VTExcbik7XG5cbkNSRUFURSBUQUJMRSBJRiBOT1QgRVhJU1RTIGV2ZW50cyAoXG4gIGdsb2JhbF9zZXEgU0VSSUFMIFBSSU1BUlkgS0VZLFxuICBzdHJlYW1fdHlwZSBURVhUIE5PVCBOVUxMLFxuICBzdHJlYW1faWQgVEVYVCBOT1QgTlVMTCxcbiAgc3RyZWFtX3NlcSBJTlRFR0VSIE5PVCBOVUxMLFxuICB0eXBlIFRFWFQgTk9UIE5VTEwsXG4gIGFjdG9yX2lkIFRFWFQgTk9UIE5VTEwsXG4gIHBheWxvYWQgSlNPTkIgTk9UIE5VTEwsXG4gIGNhdXNhdGlvbl9pZCBURVhULFxuICBpZGVtcG90ZW5jeV9rZXkgVEVYVFxuKTtcblxuLS0gXHUwMEE3MS41OiBVTklRVUUoc3RyZWFtX2lkLCBzdHJlYW1fc2VxKSBkb3VibGVzIGFzIHRoZSBvcHRpbWlzdGljIGxvY2suXG5DUkVBVEUgVU5JUVVFIElOREVYIElGIE5PVCBFWElTVFMgZXZlbnRzX3N0cmVhbV9pZF9zdHJlYW1fc2VxXG4gIE9OIGV2ZW50cyAoc3RyZWFtX2lkLCBzdHJlYW1fc2VxKTtcblxuQ1JFQVRFIFRBQkxFIElGIE5PVCBFWElTVFMgaWRlbXBvdGVuY3lfa2V5cyAoXG4gIGtleSBURVhUIFBSSU1BUlkgS0VZLFxuICByZXN1bHQgSlNPTkIgTk9UIE5VTExcbik7XG5cbi0tIFBoYXNlIDMgY29sbGFib3JhdGlvbiAocm9hZG1hcCBcdTAwQTc1KS4gSUYgTk9UIEVYSVNUUyBrZWVwcyBkdXJhYmxlIFBoYXNlLTEvMlxuLS0gZGF0YSBkaXJlY3RvcmllcyB1cGdyYWRpbmcgaW4gcGxhY2UgKHN0b3J5IDEzKS5cblxuQ1JFQVRFIFRBQkxFIElGIE5PVCBFWElTVFMgdGhyZWFkcyAoXG4gIGlkIFRFWFQgUFJJTUFSWSBLRVksXG4gIHNlcSBTRVJJQUwgTk9UIE5VTEwsXG4gIGZlYXR1cmVfaWQgVEVYVCxcbiAgd29ya19pdGVtX2lkIFRFWFQsXG4gIGtpbmQgVEVYVCBOT1QgTlVMTCxcbiAgdmlzaWJpbGl0eSBURVhUIE5PVCBOVUxMLFxuICBjcmVhdGVkX2J5IFRFWFQgTk9UIE5VTEwsXG4gIHBhcnRpY2lwYW50cyBKU09OQiBOT1QgTlVMTCBERUZBVUxUICdbXSc6Ompzb25iXG4pO1xuXG5DUkVBVEUgVEFCTEUgSUYgTk9UIEVYSVNUUyBtZXNzYWdlcyAoXG4gIGlkIFRFWFQgUFJJTUFSWSBLRVksXG4gIHRocmVhZF9pZCBURVhUIE5PVCBOVUxMLFxuICBzZXEgSU5URUdFUiBOT1QgTlVMTCxcbiAgYXV0aG9yX2lkIFRFWFQgTk9UIE5VTEwsXG4gIGtpbmQgVEVYVCBOT1QgTlVMTCxcbiAgYm9keSBURVhUIE5PVCBOVUxMLFxuICByZXBseV90byBURVhUXG4pO1xuXG4tLSBcdTAwQTc1LjM6IHRoZSBwZXItdGhyZWFkIG1lc3NhZ2Ugc2VxdWVuY2UgaXMgZ2FwLWZyZWUgQlkgQ09OU1RSQUlOVC5cbkNSRUFURSBVTklRVUUgSU5ERVggSUYgTk9UIEVYSVNUUyBtZXNzYWdlc190aHJlYWRfaWRfc2VxXG4gIE9OIG1lc3NhZ2VzICh0aHJlYWRfaWQsIHNlcSk7XG5cbkNSRUFURSBUQUJMRSBJRiBOT1QgRVhJU1RTIG1lbnRpb25zIChcbiAgc2VxIFNFUklBTCBQUklNQVJZIEtFWSxcbiAgbWVzc2FnZV9pZCBURVhUIE5PVCBOVUxMLFxuICBtZW50aW9uZWRfYWN0b3JfaWQgVEVYVCBOT1QgTlVMTCxcbiAgcmVzb2x1dGlvbiBURVhUIE5PVCBOVUxMXG4pO1xuXG5DUkVBVEUgVEFCTEUgSUYgTk9UIEVYSVNUUyBub3RpZmljYXRpb25zIChcbiAgaWQgVEVYVCBQUklNQVJZIEtFWSxcbiAgc2VxIFNFUklBTCBOT1QgTlVMTCxcbiAgYWN0b3JfaWQgVEVYVCBOT1QgTlVMTCxcbiAgc291cmNlIFRFWFQgTk9UIE5VTEwsXG4gIHJlZl9pZCBURVhUIE5PVCBOVUxMLFxuICByZWFkIEJPT0xFQU4gTk9UIE5VTEwgREVGQVVMVCBGQUxTRVxuKTtcblxuQ1JFQVRFIFRBQkxFIElGIE5PVCBFWElTVFMgYWdlbnRfam9icyAoXG4gIGlkIFRFWFQgUFJJTUFSWSBLRVksXG4gIHNlcSBTRVJJQUwgTk9UIE5VTEwsXG4gIGFnZW50X2FjdG9yX2lkIFRFWFQgTk9UIE5VTEwsXG4gIHRocmVhZF9pZCBURVhUIE5PVCBOVUxMLFxuICBtZXNzYWdlX2lkIFRFWFQgTk9UIE5VTEwsXG4gIHdvcmtfaXRlbV9pZCBURVhULFxuICBmZWF0dXJlX2lkIFRFWFQsXG4gIHN0YXR1cyBURVhUIE5PVCBOVUxMLFxuICBkZXB0aCBJTlRFR0VSIE5PVCBOVUxMIERFRkFVTFQgMCxcbiAgbm90ZSBURVhUXG4pO1xuYDtcbiIsICJleHBvcnQgeyBQZ0VuZ2luZSB9IGZyb20gJy4vcGctZW5naW5lLmpzJztcbmV4cG9ydCB7IGNyZWF0ZVBnU3luY0VuZ2luZSwgdHlwZSBQZ1N5bmNFbmdpbmVPcHRpb25zIH0gZnJvbSAnLi9zeW5jLWVuZ2luZS5qcyc7XG5leHBvcnQgeyBTQ0hFTUFfU1FMIH0gZnJvbSAnLi9zY2hlbWEtc3FsLmpzJztcbmV4cG9ydCAqIGFzIHNjaGVtYSBmcm9tICcuL3NjaGVtYS5qcyc7XG4iLCAiLyoqXG4gKiBUaGUgYG9haHNgIGJpbmFyeSBcdTIwMTQgY29tbWFuZGVyIHdpcmluZyBPTkxZLiBFdmVyeSBnYXRlLWhvbGRlciBjb21tYW5kIGlzIGFcbiAqIHB1cmUgZnVuY3Rpb24gaW4gc3JjL2NvbW1hbmRzLyB0YWtpbmcgKGNsaWVudCwgb3B0cyk7IHNlcnZlIGxpdmVzIGluXG4gKiBzcmMvc2VydmUudHM7IHRoZSB3b3JrZXIgbG9vcCBsaXZlcyBpbiBAb2Focy9ydW5uZXIgYW5kIGlzIGltcG9ydGVkIExBWklMWVxuICogc28gdGhlIHJlc3Qgb2YgdGhlIENMSSB3b3JrcyB3aGlsZSB0aGUgcnVubmVyIGlzIHN0aWxsIGxhbmRpbmcgKHN0b3J5IDE0KS5cbiAqXG4gKiBFbnYgaXMgcmVhZCBoZXJlIGFuZCBvbmx5IGhlcmU6IE9BSFNfVE9LRU4gKGNsaWVudCBhdXRoKSBhbmRcbiAqIE9BSFNfQURNSU5fVE9LRU4gKHNlcnZlIGJvb3RzdHJhcCkuXG4gKi9cbmltcG9ydCB7IHJlc29sdmUgfSBmcm9tICdub2RlOnBhdGgnO1xuXG5pbXBvcnQgeyBDb21tYW5kIH0gZnJvbSAnY29tbWFuZGVyJztcbmltcG9ydCB7IG1ha2VDbGllbnQsIHR5cGUgT2Foc0NsaWVudCB9IGZyb20gJ0BvYWhzL2NvbnRyYWN0cyc7XG5cbmltcG9ydCB7XG4gIGFjdG9yQ3JlYXRlQ29tbWFuZCxcbiAgYWN0b3JzQ29tbWFuZCxcbiAgYWR2YW5jZUNvbW1hbmQsXG4gIGFkdmlzZU5leHRUYXNrQ29tbWFuZCxcbiAgYWR2aXNlUmVjb25jaWxlQ29tbWFuZCxcbiAgYXBwcm92ZUNvbW1hbmQsXG4gIGF1dGh6Q29tbWFuZCxcbiAgZG9jbGludENvbW1hbmQsXG4gIGV2ZW50c0NvbW1hbmQsXG4gIGZlYXR1cmVDcmVhdGVDb21tYW5kLFxuICBnYXRlUG9saWN5U2V0Q29tbWFuZCxcbiAgZ292ZXJuYW5jZVNldENvbW1hbmQsXG4gIGdyYW50Q29tbWFuZCxcbiAgaW1wb3J0U3Rvcmllc0NvbW1hbmQsXG4gIGluYm94Q29tbWFuZCxcbiAgaXRlbUNyZWF0ZUNvbW1hbmQsXG4gIGpvYkNvbXBsZXRlQ29tbWFuZCxcbiAgam9ic0NvbW1hbmQsXG4gIG1lc3NhZ2VzQ29tbWFuZCxcbiAgbm90aWZpY2F0aW9uc0NvbW1hbmQsXG4gIHBlcnNvbmFzUHJvdmlzaW9uQ29tbWFuZCxcbiAgcGxhblNldENvbW1hbmQsXG4gIHBvbGljeVNldENvbW1hbmQsXG4gIHBvc3RDb21tYW5kLFxuICByZWplY3RDb21tYW5kLFxuICByb2xlQXNzaWduQ29tbWFuZCxcbiAgcm9sZUxpc3RDb21tYW5kLFxuICByb2xlUmV2b2tlQ29tbWFuZCxcbiAgcnVuVG9PdXRwdXQsXG4gIHN0YXR1c0NvbW1hbmQsXG4gIHRocmVhZENyZWF0ZUNvbW1hbmQsXG4gIHRocmVhZExpc3RDb21tYW5kLFxufSBmcm9tICcuL2NvbW1hbmRzL2luZGV4LmpzJztcbmltcG9ydCB7IERFRkFVTFRfUE9SVCwgc3RhcnRTZXJ2ZSB9IGZyb20gJy4vc2VydmUuanMnO1xuXG5jb25zdCBERUZBVUxUX1VSTCA9IGBodHRwOi8vbG9jYWxob3N0OiR7REVGQVVMVF9QT1JUfWA7XG5cbmludGVyZmFjZSBDbGllbnRGbGFncyB7XG4gIHVybDogc3RyaW5nO1xuICB0b2tlbj86IHN0cmluZztcbn1cblxuZnVuY3Rpb24gY2xpZW50RnJvbShmbGFnczogQ2xpZW50RmxhZ3MpOiBPYWhzQ2xpZW50IHtcbiAgY29uc3QgdG9rZW4gPSBmbGFncy50b2tlbiA/PyBwcm9jZXNzLmVudlsnT0FIU19UT0tFTiddO1xuICBpZiAodG9rZW4gPT09IHVuZGVmaW5lZCB8fCB0b2tlbi5sZW5ndGggPT09IDApIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ21pc3NpbmcgdG9rZW46IHBhc3MgLS10b2tlbiA8dG9rZW4+IG9yIHNldCBPQUhTX1RPS0VOJyk7XG4gIH1cbiAgcmV0dXJuIG1ha2VDbGllbnQoeyBiYXNlVXJsOiBmbGFncy51cmwsIHRva2VuIH0pO1xufVxuXG4vKiogQXR0YWNoIHRoZSBzaGFyZWQgY2xpZW50IGZsYWdzIHRvIGEgZ2F0ZS1ob2xkZXIgY29tbWFuZC4gKi9cbmZ1bmN0aW9uIHdpdGhDbGllbnRGbGFncyhjbWQ6IENvbW1hbmQpOiBDb21tYW5kIHtcbiAgcmV0dXJuIGNtZFxuICAgIC5vcHRpb24oJy0tdXJsIDx1cmw+JywgJ3NwaW5lLWFwaSBiYXNlIFVSTCcsIERFRkFVTFRfVVJMKVxuICAgIC5vcHRpb24oJy0tdG9rZW4gPHRva2VuPicsICdiZWFyZXIgdG9rZW4gKGRlZmF1bHQ6IGVudiBPQUhTX1RPS0VOKScpO1xufVxuXG4vKiogUnVuIGEgY29tbWFuZCBmdW5jdGlvbiBhbmQgdHJhbnNsYXRlIGl0cyBvdXRjb21lIHRvIHN0ZG91dC9zdGRlcnIgKyBleGl0IGNvZGUuICovXG5hc3luYyBmdW5jdGlvbiBlbWl0KGZuOiAoKSA9PiBQcm9taXNlPHN0cmluZz4pOiBQcm9taXNlPHZvaWQ+IHtcbiAgY29uc3QgeyB0ZXh0LCBleGl0Q29kZSB9ID0gYXdhaXQgcnVuVG9PdXRwdXQoZm4pO1xuICBpZiAoZXhpdENvZGUgPT09IDApIHtcbiAgICBwcm9jZXNzLnN0ZG91dC53cml0ZShgJHt0ZXh0fVxcbmApO1xuICB9IGVsc2Uge1xuICAgIHByb2Nlc3Muc3RkZXJyLndyaXRlKGAke3RleHR9XFxuYCk7XG4gICAgcHJvY2Vzcy5leGl0Q29kZSA9IGV4aXRDb2RlO1xuICB9XG59XG5cbmNvbnN0IGNvbGxlY3QgPSAodmFsdWU6IHN0cmluZywgcHJldmlvdXM6IHN0cmluZ1tdKTogc3RyaW5nW10gPT4gWy4uLnByZXZpb3VzLCB2YWx1ZV07XG5cbmV4cG9ydCBmdW5jdGlvbiBidWlsZFByb2dyYW0oKTogQ29tbWFuZCB7XG4gIGNvbnN0IHByb2dyYW0gPSBuZXcgQ29tbWFuZCgpO1xuICBwcm9ncmFtXG4gICAgLm5hbWUoJ29haHMnKVxuICAgIC5kZXNjcmlwdGlvbignb2FocyBcdTIwMTQgT3BlbiBBZ2VudHMgSGFybmVzcyBTeXN0ZW0gQ0xJIChzcGluZSBzZXJ2ZXIgKyBnYXRlLWhvbGRlciBjb21tYW5kcyknKTtcblxuICAvLyAtLSBzZXJ2ZSAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgcHJvZ3JhbVxuICAgIC5jb21tYW5kKCdzZXJ2ZScpXG4gICAgLmRlc2NyaXB0aW9uKCdzdGFydCB0aGUgc3BpbmUtYXBpIChIVFRQIC9ycGMvKiArIE1DUCAvbWNwKScpXG4gICAgLm9wdGlvbignLS1wb3J0IDxwb3J0PicsICdUQ1AgcG9ydCcsIFN0cmluZyhERUZBVUxUX1BPUlQpKVxuICAgIC5vcHRpb24oJy0tYWRtaW4tdG9rZW4gPHRva2VuPicsICdib290c3RyYXAgYWRtaW4gdG9rZW4gKGRlZmF1bHQ6IGVudiBPQUhTX0FETUlOX1RPS0VOLCBlbHNlIGdlbmVyYXRlZCknKVxuICAgIC5vcHRpb24oJy0tZGF0YSA8ZGlyPicsICdwZXJzaXN0ZW5jZSBkaXJlY3RvcnkgKGR1cmFibGUgUEdsaXRlICsgdG9rZW4gc3RvcmUpJylcbiAgICAuYWN0aW9uKGFzeW5jIChvcHRzOiB7IHBvcnQ6IHN0cmluZzsgYWRtaW5Ub2tlbj86IHN0cmluZzsgZGF0YT86IHN0cmluZyB9KSA9PiB7XG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCBhZG1pblRva2VuID0gb3B0cy5hZG1pblRva2VuID8/IHByb2Nlc3MuZW52WydPQUhTX0FETUlOX1RPS0VOJ107XG4gICAgICAgIGNvbnN0IGhhbmRsZSA9IGF3YWl0IHN0YXJ0U2VydmUoe1xuICAgICAgICAgIHBvcnQ6IE51bWJlcihvcHRzLnBvcnQpLFxuICAgICAgICAgIC4uLihhZG1pblRva2VuICE9PSB1bmRlZmluZWQgJiYgYWRtaW5Ub2tlbi5sZW5ndGggPiAwID8geyBhZG1pblRva2VuIH0gOiB7fSksXG4gICAgICAgICAgLi4uKG9wdHMuZGF0YSAhPT0gdW5kZWZpbmVkID8geyBkYXRhRGlyOiByZXNvbHZlKG9wdHMuZGF0YSkgfSA6IHt9KSxcbiAgICAgICAgfSk7XG4gICAgICAgIHByb2Nlc3Muc3Rkb3V0LndyaXRlKFxuICAgICAgICAgIGBvYWhzIHNwaW5lLWFwaSBsaXN0ZW5pbmcgb24gOiR7aGFuZGxlLnBvcnR9IChIVFRQIC9ycGMvKiwgTUNQIC9tY3A7IGVuZ2luZTogJHtoYW5kbGUuZW5naW5lS2luZH0ke1xuICAgICAgICAgICAgb3B0cy5kYXRhICE9PSB1bmRlZmluZWQgPyBgLCBkYXRhOiAke3Jlc29sdmUob3B0cy5kYXRhKX1gIDogJydcbiAgICAgICAgICB9KVxcbmAsXG4gICAgICAgICk7XG4gICAgICAgIGlmIChoYW5kbGUuYWRtaW5Ub2tlbkdlbmVyYXRlZCkge1xuICAgICAgICAgIHByb2Nlc3Muc3Rkb3V0LndyaXRlKGBhZG1pbiB0b2tlbiAoZ2VuZXJhdGVkKTogJHtoYW5kbGUuYWRtaW5Ub2tlbn1cXG5gKTtcbiAgICAgICAgfVxuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgY29uc3QgZXJyID0gZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yIDogbmV3IEVycm9yKFN0cmluZyhlcnJvcikpO1xuICAgICAgICBwcm9jZXNzLnN0ZGVyci53cml0ZShgJHtlcnIubmFtZX06ICR7ZXJyLm1lc3NhZ2V9XFxuYCk7XG4gICAgICAgIHByb2Nlc3MuZXhpdENvZGUgPSAxO1xuICAgICAgfVxuICAgIH0pO1xuXG4gIC8vIC0tIGdhdGUtaG9sZGVyIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICB3aXRoQ2xpZW50RmxhZ3MocHJvZ3JhbS5jb21tYW5kKCdpbmJveCcpKVxuICAgIC5kZXNjcmlwdGlvbignaXRlbXMgYXdhaXRpbmcgYSBnYXRlIGRlY2lzaW9uIChzcGVjIGFwcHJvdmFsIC8gcmV2aWV3IGRlY2lzaW9uKScpXG4gICAgLmFjdGlvbihhc3luYyAob3B0czogQ2xpZW50RmxhZ3MpID0+IGVtaXQoKCkgPT4gaW5ib3hDb21tYW5kKGNsaWVudEZyb20ob3B0cykpKSk7XG5cbiAgd2l0aENsaWVudEZsYWdzKHByb2dyYW0uY29tbWFuZCgnYXBwcm92ZSA8d29ya0l0ZW1JZD4nKSlcbiAgICAuZGVzY3JpcHRpb24oJ2FwcHJvdmUgYSBnYXRlIChzcGVjX2FwcHJvdmFsIHBpbnMgdmVyaWZpY2F0aW9uIGNvbW1hbmRzKScpXG4gICAgLnJlcXVpcmVkT3B0aW9uKCctLWdhdGUgPGdhdGU+JywgJ3NwZWNfYXBwcm92YWwgfCByZXZpZXdfYXBwcm92YWwnKVxuICAgIC5vcHRpb24oJy0tcGluIDxjbWQ+JywgJ3BpbiBhIHZlcmlmaWNhdGlvbiBjb21tYW5kIChyZXBlYXRhYmxlLCBzcGVjX2FwcHJvdmFsIG9ubHkpJywgY29sbGVjdCwgW10pXG4gICAgLmFjdGlvbihhc3luYyAod29ya0l0ZW1JZDogc3RyaW5nLCBvcHRzOiBDbGllbnRGbGFncyAmIHsgZ2F0ZTogc3RyaW5nOyBwaW46IHN0cmluZ1tdIH0pID0+XG4gICAgICBlbWl0KCgpID0+IGFwcHJvdmVDb21tYW5kKGNsaWVudEZyb20ob3B0cyksIHsgd29ya0l0ZW1JZCwgZ2F0ZTogb3B0cy5nYXRlLCBwaW46IG9wdHMucGluIH0pKSxcbiAgICApO1xuXG4gIHdpdGhDbGllbnRGbGFncyhwcm9ncmFtLmNvbW1hbmQoJ2FkdmFuY2UgPHdvcmtJdGVtSWQ+JykpXG4gICAgLmRlc2NyaXB0aW9uKCdhZHZhbmNlIGEgd29yayBpdGVtIHRocm91Z2ggdGhlIEZTTSAocGxhbm5pbmctem9uZSBtb3ZlcyBmb3IgaHVtYW5zKScpXG4gICAgLnJlcXVpcmVkT3B0aW9uKCctLXRvIDxzdGF0ZT4nLCAndGFyZ2V0IHN0YXRlLCBlLmcuIGRyYWZ0IHwgcmVhZHlfZm9yX2RldicpXG4gICAgLm9wdGlvbignLS1mZW5jaW5nLXRva2VuIDxuPicsICdmZW5jaW5nIHRva2VuIHdoZW4gYWN0aW5nIHVuZGVyIGEgY2xhaW0nLCAodjogc3RyaW5nKSA9PiBOdW1iZXIodikpXG4gICAgLmFjdGlvbihhc3luYyAod29ya0l0ZW1JZDogc3RyaW5nLCBvcHRzOiBDbGllbnRGbGFncyAmIHsgdG86IHN0cmluZzsgZmVuY2luZ1Rva2VuPzogbnVtYmVyIH0pID0+XG4gICAgICBlbWl0KCgpID0+XG4gICAgICAgIGFkdmFuY2VDb21tYW5kKGNsaWVudEZyb20ob3B0cyksIHtcbiAgICAgICAgICB3b3JrSXRlbUlkLFxuICAgICAgICAgIHRvOiBvcHRzLnRvLFxuICAgICAgICAgIC4uLihvcHRzLmZlbmNpbmdUb2tlbiAhPT0gdW5kZWZpbmVkID8geyBmZW5jaW5nVG9rZW46IG9wdHMuZmVuY2luZ1Rva2VuIH0gOiB7fSksXG4gICAgICAgIH0pLFxuICAgICAgKSxcbiAgICApO1xuXG4gIHdpdGhDbGllbnRGbGFncyhwcm9ncmFtLmNvbW1hbmQoJ3JlamVjdCA8d29ya0l0ZW1JZD4nKSlcbiAgICAuZGVzY3JpcHRpb24oJ3JlamVjdCBhIGdhdGUgKHJldmlldyByZWplY3Rpb24gZmlyZXMgdGhlIGRldGVybWluaXN0aWMgbG9vcGJhY2spJylcbiAgICAucmVxdWlyZWRPcHRpb24oJy0tZ2F0ZSA8Z2F0ZT4nLCAnc3BlY19hcHByb3ZhbCB8IHJldmlld19hcHByb3ZhbCcpXG4gICAgLmFjdGlvbihhc3luYyAod29ya0l0ZW1JZDogc3RyaW5nLCBvcHRzOiBDbGllbnRGbGFncyAmIHsgZ2F0ZTogc3RyaW5nIH0pID0+XG4gICAgICBlbWl0KCgpID0+IHJlamVjdENvbW1hbmQoY2xpZW50RnJvbShvcHRzKSwgeyB3b3JrSXRlbUlkLCBnYXRlOiBvcHRzLmdhdGUgfSkpLFxuICAgICk7XG5cbiAgd2l0aENsaWVudEZsYWdzKHByb2dyYW0uY29tbWFuZCgnc3RhdHVzJykpXG4gICAgLmRlc2NyaXB0aW9uKCdhbGwgd29yayBpdGVtcyBncm91cGVkIGJ5IHN0YXRlLCBwbHVzIGZlYXR1cmUgZGlzcGF0Y2ggaG9sZHMnKVxuICAgIC5hY3Rpb24oYXN5bmMgKG9wdHM6IENsaWVudEZsYWdzKSA9PiBlbWl0KCgpID0+IHN0YXR1c0NvbW1hbmQoY2xpZW50RnJvbShvcHRzKSkpKTtcblxuICBjb25zdCBhY3RvciA9IHByb2dyYW0uY29tbWFuZCgnYWN0b3InKS5kZXNjcmlwdGlvbignYWN0b3IgbWFuYWdlbWVudCAoYWRtaW4pJyk7XG4gIHdpdGhDbGllbnRGbGFncyhhY3Rvci5jb21tYW5kKCdjcmVhdGUnKSlcbiAgICAuZGVzY3JpcHRpb24oJ2NyZWF0ZSBhIHVzZXIgb3IgYWdlbnQgYWN0b3I7IHByaW50cyBhY3RvcklkICsgdG9rZW4gKGFkbWluIG9ubHkpJylcbiAgICAucmVxdWlyZWRPcHRpb24oJy0tdHlwZSA8dHlwZT4nLCAndXNlciB8IGFnZW50JylcbiAgICAucmVxdWlyZWRPcHRpb24oJy0tbmFtZSA8bmFtZT4nLCAnZGlzcGxheSBuYW1lJylcbiAgICAub3B0aW9uKCctLWdvdmVybmFuY2Utcm9sZSA8cm9sZT4nLCAnYWRtaW4gfCBtZW1iZXIgfCBhdWRpdG9yIChib290c3RyYXAgcGx1bWJpbmcsIGFkbWluIG9ubHkpJylcbiAgICAuYWN0aW9uKGFzeW5jIChvcHRzOiBDbGllbnRGbGFncyAmIHsgdHlwZTogc3RyaW5nOyBuYW1lOiBzdHJpbmc7IGdvdmVybmFuY2VSb2xlPzogc3RyaW5nIH0pID0+XG4gICAgICBlbWl0KCgpID0+XG4gICAgICAgIGFjdG9yQ3JlYXRlQ29tbWFuZChjbGllbnRGcm9tKG9wdHMpLCB7XG4gICAgICAgICAgdHlwZTogb3B0cy50eXBlLFxuICAgICAgICAgIG5hbWU6IG9wdHMubmFtZSxcbiAgICAgICAgICAuLi4ob3B0cy5nb3Zlcm5hbmNlUm9sZSAhPT0gdW5kZWZpbmVkID8geyBnb3Zlcm5hbmNlUm9sZTogb3B0cy5nb3Zlcm5hbmNlUm9sZSB9IDoge30pLFxuICAgICAgICB9KSxcbiAgICAgICksXG4gICAgKTtcblxuICAvLyAtLSBQaGFzZSA0OiBub24tY29kaW5nIHRlYW1tYXRlcyBvbiB0aGUgc2FtZSByYWlscyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgd2l0aENsaWVudEZsYWdzKHByb2dyYW0uY29tbWFuZCgnYWN0b3JzJykpXG4gICAgLmRlc2NyaXB0aW9uKCdsaXN0IEFMTCBhY3RvcnMgXHUyMDE0IGh1bWFucywgYWdlbnRzLCBwZXJzb25hcywgYW5kIHRoZSBzeXN0ZW0gYWN0b3InKVxuICAgIC5hY3Rpb24oYXN5bmMgKG9wdHM6IENsaWVudEZsYWdzKSA9PiBlbWl0KCgpID0+IGFjdG9yc0NvbW1hbmQoY2xpZW50RnJvbShvcHRzKSkpKTtcblxuICBjb25zdCBwZXJzb25hcyA9IHByb2dyYW0uY29tbWFuZCgncGVyc29uYXMnKS5kZXNjcmlwdGlvbignQk1BRCBwZXJzb25hIGFnZW50IGFjdG9ycyAocm9hZG1hcCBcdTAwQTczKScpO1xuICB3aXRoQ2xpZW50RmxhZ3MocGVyc29uYXMuY29tbWFuZCgncHJvdmlzaW9uJykpXG4gICAgLmRlc2NyaXB0aW9uKCdpZGVtcG90ZW50bHkgcHJvdmlzaW9uIHRoZSBzaXggQk1BRCBwZXJzb25hcyAoZ292ZXJuYW5jZS1hZG1pbiBvbmx5LCBlbmdpbmUtZ2F0ZWQpJylcbiAgICAuYWN0aW9uKGFzeW5jIChvcHRzOiBDbGllbnRGbGFncykgPT4gZW1pdCgoKSA9PiBwZXJzb25hc1Byb3Zpc2lvbkNvbW1hbmQoY2xpZW50RnJvbShvcHRzKSkpKTtcblxuICBjb25zdCBpdGVtID0gcHJvZ3JhbS5jb21tYW5kKCdpdGVtJykuZGVzY3JpcHRpb24oJ3NpbmdsZSB3b3JrIGl0ZW1zIChQaGFzZSA0OiBub24tY29kZSBraW5kcyknKTtcbiAgd2l0aENsaWVudEZsYWdzKGl0ZW0uY29tbWFuZCgnY3JlYXRlJykpXG4gICAgLmRlc2NyaXB0aW9uKCdjcmVhdGUgb25lIHdvcmsgaXRlbTsgLS1raW5kIHNlbGVjdHMgZXZpZGVuY2UgZ3VhcmRzLCBuZXZlciBnYXRlIGF1dGhvcml0eScpXG4gICAgLnJlcXVpcmVkT3B0aW9uKCctLWZlYXR1cmUgPGZlYXR1cmVJZD4nLCAnZmVhdHVyZSB0byBjcmVhdGUgdGhlIGl0ZW0gaW4nKVxuICAgIC5yZXF1aXJlZE9wdGlvbignLS1rZXkgPGV4dGVybmFsS2V5PicsICdleHRlcm5hbCBrZXkgKHN0b3JpZXMueWFtbCBpZCB2b2NhYnVsYXJ5KScpXG4gICAgLnJlcXVpcmVkT3B0aW9uKCctLXRpdGxlIDx0aXRsZT4nLCAnd29yayBpdGVtIHRpdGxlJylcbiAgICAub3B0aW9uKCctLWtpbmQgPGtpbmQ+JywgJ2NvZGUgfCBzcGVjX2RyYWZ0IHwgZGVzaWduX3JldmlldyB8IHFhX3JlcG9ydCB8IGRvYyAoZGVmYXVsdCBjb2RlKScpXG4gICAgLm9wdGlvbignLS1zcGVjLWNoZWNrcG9pbnQnLCAncmVxdWlyZSBzcGVjX2FwcHJvdmFsIGJlZm9yZSByZWFkeV9mb3JfZGV2JylcbiAgICAub3B0aW9uKCctLWRvbmUtY2hlY2twb2ludCcsICdob2xkIGZlYXR1cmUgZGlzcGF0Y2ggYWZ0ZXIgdGhpcyBpdGVtIGlzIGRvbmUnKVxuICAgIC5vcHRpb24oJy0taW52b2tlLWRldi13aXRoIDx0ZXh0PicsICdhZ2VudCBpbnZvY2F0aW9uIGhpbnQnKVxuICAgIC5vcHRpb24oJy0tZGVwZW5kcy1vbiA8ZXh0ZXJuYWxLZXk+JywgJ2RlcGVuZGVuY3kgZXh0ZXJuYWwga2V5IChyZXBlYXRhYmxlKScsIGNvbGxlY3QsIFtdKVxuICAgIC5hY3Rpb24oXG4gICAgICBhc3luYyAoXG4gICAgICAgIG9wdHM6IENsaWVudEZsYWdzICYge1xuICAgICAgICAgIGZlYXR1cmU6IHN0cmluZztcbiAgICAgICAgICBrZXk6IHN0cmluZztcbiAgICAgICAgICB0aXRsZTogc3RyaW5nO1xuICAgICAgICAgIGtpbmQ/OiBzdHJpbmc7XG4gICAgICAgICAgc3BlY0NoZWNrcG9pbnQ/OiBib29sZWFuO1xuICAgICAgICAgIGRvbmVDaGVja3BvaW50PzogYm9vbGVhbjtcbiAgICAgICAgICBpbnZva2VEZXZXaXRoPzogc3RyaW5nO1xuICAgICAgICAgIGRlcGVuZHNPbjogc3RyaW5nW107XG4gICAgICAgIH0sXG4gICAgICApID0+XG4gICAgICAgIGVtaXQoKCkgPT5cbiAgICAgICAgICBpdGVtQ3JlYXRlQ29tbWFuZChjbGllbnRGcm9tKG9wdHMpLCB7XG4gICAgICAgICAgICBmZWF0dXJlSWQ6IG9wdHMuZmVhdHVyZSxcbiAgICAgICAgICAgIGV4dGVybmFsS2V5OiBvcHRzLmtleSxcbiAgICAgICAgICAgIHRpdGxlOiBvcHRzLnRpdGxlLFxuICAgICAgICAgICAgLi4uKG9wdHMua2luZCAhPT0gdW5kZWZpbmVkID8geyBraW5kOiBvcHRzLmtpbmQgfSA6IHt9KSxcbiAgICAgICAgICAgIC4uLihvcHRzLnNwZWNDaGVja3BvaW50ID09PSB0cnVlID8geyBzcGVjQ2hlY2twb2ludDogdHJ1ZSB9IDoge30pLFxuICAgICAgICAgICAgLi4uKG9wdHMuZG9uZUNoZWNrcG9pbnQgPT09IHRydWUgPyB7IGRvbmVDaGVja3BvaW50OiB0cnVlIH0gOiB7fSksXG4gICAgICAgICAgICAuLi4ob3B0cy5pbnZva2VEZXZXaXRoICE9PSB1bmRlZmluZWQgPyB7IGludm9rZURldldpdGg6IG9wdHMuaW52b2tlRGV2V2l0aCB9IDoge30pLFxuICAgICAgICAgICAgLi4uKG9wdHMuZGVwZW5kc09uLmxlbmd0aCA+IDAgPyB7IGRlcGVuZHNPbjogb3B0cy5kZXBlbmRzT24gfSA6IHt9KSxcbiAgICAgICAgICB9KSxcbiAgICAgICAgKSxcbiAgICApO1xuXG4gIHdpdGhDbGllbnRGbGFncyhwcm9ncmFtLmNvbW1hbmQoJ2RvY2xpbnQgPGZpbGU+JykpXG4gICAgLmRlc2NyaXB0aW9uKCdkZXRlcm1pbmlzdGljIGRvY3VtZW50IGxpbnQgKG5vIExMTSk7IC0tc3VibWl0IHNlbmRzIGRvY19saW50IGV2aWRlbmNlOyBleGl0IDEgd2hlbiBub3Qgc2NoZW1hLXZhbGlkJylcbiAgICAub3B0aW9uKCctLXJlcXVpcmUtc2VjdGlvbiA8bmFtZT4nLCAncmVxdWlyZWQgIyMgc2VjdGlvbiAocmVwZWF0YWJsZSknLCBjb2xsZWN0LCBbXSlcbiAgICAub3B0aW9uKCctLXdvcmstaXRlbSA8d29ya0l0ZW1JZD4nLCAnd29yayBpdGVtIHRvIHN1Ym1pdCBkb2NfbGludCBldmlkZW5jZSBvbicpXG4gICAgLm9wdGlvbignLS1zdWJtaXQnLCAnc3VibWl0IHtzY2hlbWFWYWxpZCwgZmluZGluZ3N9IGFzIGRvY19saW50IGV2aWRlbmNlIHZpYSB0aGUgcmFpbHMnKVxuICAgIC5vcHRpb24oJy0tZmVuY2luZy10b2tlbiA8bj4nLCAnZmVuY2luZyB0b2tlbiB3aGVuIGFjdGluZyB1bmRlciBhIGNsYWltJywgKHY6IHN0cmluZykgPT4gTnVtYmVyKHYpKVxuICAgIC5hY3Rpb24oXG4gICAgICBhc3luYyAoXG4gICAgICAgIGZpbGU6IHN0cmluZyxcbiAgICAgICAgb3B0czogQ2xpZW50RmxhZ3MgJiB7XG4gICAgICAgICAgcmVxdWlyZVNlY3Rpb246IHN0cmluZ1tdO1xuICAgICAgICAgIHdvcmtJdGVtPzogc3RyaW5nO1xuICAgICAgICAgIHN1Ym1pdD86IGJvb2xlYW47XG4gICAgICAgICAgZmVuY2luZ1Rva2VuPzogbnVtYmVyO1xuICAgICAgICB9LFxuICAgICAgKSA9PiB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgLy8gVGhlIGxpbnQgaXRzZWxmIG5lZWRzIG5vIHNlcnZlcjsgYSBjbGllbnQgZXhpc3RzIG9ubHkgZm9yIC0tc3VibWl0LlxuICAgICAgICAgIGNvbnN0IGNsaWVudCA9IG9wdHMuc3VibWl0ID09PSB0cnVlID8gY2xpZW50RnJvbShvcHRzKSA6IG51bGw7XG4gICAgICAgICAgY29uc3QgeyB0ZXh0LCBleGl0Q29kZSB9ID0gYXdhaXQgZG9jbGludENvbW1hbmQoY2xpZW50LCB7XG4gICAgICAgICAgICBwYXRoOiBmaWxlLFxuICAgICAgICAgICAgLi4uKG9wdHMucmVxdWlyZVNlY3Rpb24ubGVuZ3RoID4gMCA/IHsgcmVxdWlyZVNlY3Rpb25zOiBvcHRzLnJlcXVpcmVTZWN0aW9uIH0gOiB7fSksXG4gICAgICAgICAgICAuLi4ob3B0cy53b3JrSXRlbSAhPT0gdW5kZWZpbmVkID8geyB3b3JrSXRlbUlkOiBvcHRzLndvcmtJdGVtIH0gOiB7fSksXG4gICAgICAgICAgICAuLi4ob3B0cy5zdWJtaXQgPT09IHRydWUgPyB7IHN1Ym1pdDogdHJ1ZSB9IDoge30pLFxuICAgICAgICAgICAgLi4uKG9wdHMuZmVuY2luZ1Rva2VuICE9PSB1bmRlZmluZWQgPyB7IGZlbmNpbmdUb2tlbjogb3B0cy5mZW5jaW5nVG9rZW4gfSA6IHt9KSxcbiAgICAgICAgICB9KTtcbiAgICAgICAgICBwcm9jZXNzLnN0ZG91dC53cml0ZShgJHt0ZXh0fVxcbmApO1xuICAgICAgICAgIHByb2Nlc3MuZXhpdENvZGUgPSBleGl0Q29kZTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICBjb25zdCBlcnIgPSBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IgOiBuZXcgRXJyb3IoU3RyaW5nKGVycm9yKSk7XG4gICAgICAgICAgcHJvY2Vzcy5zdGRlcnIud3JpdGUoYCR7ZXJyLm5hbWV9OiAke2Vyci5tZXNzYWdlfVxcbmApO1xuICAgICAgICAgIHByb2Nlc3MuZXhpdENvZGUgPSAxO1xuICAgICAgICB9XG4gICAgICB9LFxuICAgICk7XG5cbiAgd2l0aENsaWVudEZsYWdzKHByb2dyYW0uY29tbWFuZCgnZ3JhbnQgPGFjdG9ySWQ+IDxwZXJtaXNzaW9uPicpKVxuICAgIC5kZXNjcmlwdGlvbignZ3JhbnQgYSBwZXJtaXNzaW9uIHRvIGFuIGFjdG9yIChhZG1pbiBvbmx5KScpXG4gICAgLmFjdGlvbihhc3luYyAoYWN0b3JJZDogc3RyaW5nLCBwZXJtaXNzaW9uOiBzdHJpbmcsIG9wdHM6IENsaWVudEZsYWdzKSA9PlxuICAgICAgZW1pdCgoKSA9PiBncmFudENvbW1hbmQoY2xpZW50RnJvbShvcHRzKSwgeyBhY3RvcklkLCBwZXJtaXNzaW9uIH0pKSxcbiAgICApO1xuXG4gIC8vIC0tIGVudGl0bGVtZW50cyAoUGhhc2UgMiwgcm9hZG1hcCBcdTAwQTczKSAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgY29uc3Qgcm9sZSA9IHByb2dyYW0uY29tbWFuZCgncm9sZScpLmRlc2NyaXB0aW9uKCdkZWxpdmVyeSByb2xlcyBcdTIwMTQgcGVybWlzc2lvbiBidW5kbGVzIChyb2FkbWFwIFx1MDBBNzMpJyk7XG4gIHdpdGhDbGllbnRGbGFncyhyb2xlLmNvbW1hbmQoJ2Fzc2lnbiA8YWN0b3JJZD4gPHJvbGVDb2RlPicpKVxuICAgIC5kZXNjcmlwdGlvbignYXNzaWduIGEgZGVsaXZlcnkgcm9sZSB0byBhbiBhY3RvciAoZ292ZXJuYW5jZS1hZG1pbiBvbmx5LCBlbmdpbmUtZ2F0ZWQpJylcbiAgICAuYWN0aW9uKGFzeW5jIChhY3RvcklkOiBzdHJpbmcsIHJvbGVDb2RlOiBzdHJpbmcsIG9wdHM6IENsaWVudEZsYWdzKSA9PlxuICAgICAgZW1pdCgoKSA9PiByb2xlQXNzaWduQ29tbWFuZChjbGllbnRGcm9tKG9wdHMpLCB7IGFjdG9ySWQsIHJvbGVDb2RlIH0pKSxcbiAgICApO1xuICB3aXRoQ2xpZW50RmxhZ3Mocm9sZS5jb21tYW5kKCdyZXZva2UgPGFjdG9ySWQ+IDxyb2xlQ29kZT4nKSlcbiAgICAuZGVzY3JpcHRpb24oJ3Jldm9rZSBhIGRlbGl2ZXJ5IHJvbGUgZnJvbSBhbiBhY3RvciAoZ292ZXJuYW5jZS1hZG1pbiBvbmx5LCBlbmdpbmUtZ2F0ZWQpJylcbiAgICAuYWN0aW9uKGFzeW5jIChhY3RvcklkOiBzdHJpbmcsIHJvbGVDb2RlOiBzdHJpbmcsIG9wdHM6IENsaWVudEZsYWdzKSA9PlxuICAgICAgZW1pdCgoKSA9PiByb2xlUmV2b2tlQ29tbWFuZChjbGllbnRGcm9tKG9wdHMpLCB7IGFjdG9ySWQsIHJvbGVDb2RlIH0pKSxcbiAgICApO1xuICB3aXRoQ2xpZW50RmxhZ3Mocm9sZS5jb21tYW5kKCdsaXN0IFthY3RvcklkXScpKVxuICAgIC5kZXNjcmlwdGlvbignbGlzdCBkZWxpdmVyeS1yb2xlIGFzc2lnbm1lbnRzIChhbGwsIG9yIG9uZSBhY3RvciknKVxuICAgIC5hY3Rpb24oYXN5bmMgKGFjdG9ySWQ6IHN0cmluZyB8IHVuZGVmaW5lZCwgb3B0czogQ2xpZW50RmxhZ3MpID0+XG4gICAgICBlbWl0KCgpID0+IHJvbGVMaXN0Q29tbWFuZChjbGllbnRGcm9tKG9wdHMpLCBhY3RvcklkICE9PSB1bmRlZmluZWQgPyB7IGFjdG9ySWQgfSA6IHt9KSksXG4gICAgKTtcblxuICBjb25zdCBwbGFuID0gcHJvZ3JhbS5jb21tYW5kKCdwbGFuJykuZGVzY3JpcHRpb24oJ3dvcmtzcGFjZSBwbGFuIFx1MjAxNCBhIGNlaWxpbmcsIG5ldmVyIGEgZ3JhbnQgKHJvYWRtYXAgXHUwMEE3MyknKTtcbiAgd2l0aENsaWVudEZsYWdzKHBsYW4uY29tbWFuZCgnc2V0IDxwbGFuPicpKVxuICAgIC5kZXNjcmlwdGlvbignc2V0IHRoZSB3b3Jrc3BhY2UgcGxhbjogZnJlZSB8IHRlYW0gfCBlbnRlcnByaXNlIChnb3Zlcm5hbmNlLWFkbWluIG9ubHkpJylcbiAgICAuYWN0aW9uKGFzeW5jIChwbGFuQ29kZTogc3RyaW5nLCBvcHRzOiBDbGllbnRGbGFncykgPT5cbiAgICAgIGVtaXQoKCkgPT4gcGxhblNldENvbW1hbmQoY2xpZW50RnJvbShvcHRzKSwgeyBwbGFuOiBwbGFuQ29kZSB9KSksXG4gICAgKTtcblxuICBjb25zdCBwb2xpY3kgPSBwcm9ncmFtLmNvbW1hbmQoJ3BvbGljeScpLmRlc2NyaXB0aW9uKCdyZXN0cmljdC1vbmx5IHdvcmtzcGFjZSBwb2xpY3kgKHJvYWRtYXAgXHUwMEE3MyknKTtcbiAgd2l0aENsaWVudEZsYWdzKHBvbGljeS5jb21tYW5kKCdzZXQnKSlcbiAgICAuZGVzY3JpcHRpb24oJ3NldCByZXN0cmljdC1vbmx5IHBvbGljeSBrZXlzIChnb3Zlcm5hbmNlLWFkbWluIG9ubHkpJylcbiAgICAub3B0aW9uKCctLWFnZW50LWdhdGUtYXBwcm92YWxzIDxib29sPicsICd0cnVlIHwgZmFsc2UgXHUyMDE0IG1heSBhZ2VudHMgZXhlcmNpc2UgZ2F0ZSBhcHByb3ZhbHM/JylcbiAgICAub3B0aW9uKCctLWFnZW50LXNlbGYtZGlzcGF0Y2ggPGJvb2w+JywgJ3RydWUgfCBmYWxzZSBcdTIwMTQgbWF5IGFnZW50cyBjbGFpbSB0YXNrcyBvbiB0aGVpciBvd24/JylcbiAgICAuYWN0aW9uKGFzeW5jIChvcHRzOiBDbGllbnRGbGFncyAmIHsgYWdlbnRHYXRlQXBwcm92YWxzPzogc3RyaW5nOyBhZ2VudFNlbGZEaXNwYXRjaD86IHN0cmluZyB9KSA9PlxuICAgICAgZW1pdCgoKSA9PlxuICAgICAgICBwb2xpY3lTZXRDb21tYW5kKGNsaWVudEZyb20ob3B0cyksIHtcbiAgICAgICAgICAuLi4ob3B0cy5hZ2VudEdhdGVBcHByb3ZhbHMgIT09IHVuZGVmaW5lZCA/IHsgYWdlbnRHYXRlQXBwcm92YWxzOiBvcHRzLmFnZW50R2F0ZUFwcHJvdmFscyB9IDoge30pLFxuICAgICAgICAgIC4uLihvcHRzLmFnZW50U2VsZkRpc3BhdGNoICE9PSB1bmRlZmluZWQgPyB7IGFnZW50U2VsZkRpc3BhdGNoOiBvcHRzLmFnZW50U2VsZkRpc3BhdGNoIH0gOiB7fSksXG4gICAgICAgIH0pLFxuICAgICAgKSxcbiAgICApO1xuXG4gIGNvbnN0IGdhdGVQb2xpY3kgPSBwcm9ncmFtLmNvbW1hbmQoJ2dhdGUtcG9saWN5JykuZGVzY3JpcHRpb24oJ2dhdGUgZGVmaW5pdGlvbnMgYXMgZGF0YSAocm9hZG1hcCBcdTAwQTczKScpO1xuICB3aXRoQ2xpZW50RmxhZ3MoZ2F0ZVBvbGljeS5jb21tYW5kKCdzZXQgPGdhdGU+JykpXG4gICAgLmRlc2NyaXB0aW9uKCdzZXQgcXVvcnVtL2FjdG9yLXR5cGUgcmVxdWlyZW1lbnRzIG9mIGEgZ2F0ZSAoZ292ZXJuYW5jZS1hZG1pbiBvbmx5KScpXG4gICAgLm9wdGlvbignLS1taW4tYXBwcm92YWxzIDxuPicsICdkaXN0aW5jdCBhcHByb3ZlcnMgcmVxdWlyZWQgcGVyIHJldmlldyByb3VuZCcpXG4gICAgLm9wdGlvbignLS1yZXF1aXJlLXR5cGUgPHR5cGU+JywgJ3JlcXVpcmUgYXQgbGVhc3Qgb25lIGFwcHJvdmVyIG9mIHRoaXMgdHlwZSAocmVwZWF0YWJsZSknLCBjb2xsZWN0LCBbXSlcbiAgICAuYWN0aW9uKGFzeW5jIChnYXRlOiBzdHJpbmcsIG9wdHM6IENsaWVudEZsYWdzICYgeyBtaW5BcHByb3ZhbHM/OiBzdHJpbmc7IHJlcXVpcmVUeXBlOiBzdHJpbmdbXSB9KSA9PlxuICAgICAgZW1pdCgoKSA9PlxuICAgICAgICBnYXRlUG9saWN5U2V0Q29tbWFuZChjbGllbnRGcm9tKG9wdHMpLCB7XG4gICAgICAgICAgZ2F0ZSxcbiAgICAgICAgICAuLi4ob3B0cy5taW5BcHByb3ZhbHMgIT09IHVuZGVmaW5lZCA/IHsgbWluQXBwcm92YWxzOiBvcHRzLm1pbkFwcHJvdmFscyB9IDoge30pLFxuICAgICAgICAgIC4uLihvcHRzLnJlcXVpcmVUeXBlLmxlbmd0aCA+IDAgPyB7IHJlcXVpcmVUeXBlczogb3B0cy5yZXF1aXJlVHlwZSB9IDoge30pLFxuICAgICAgICB9KSxcbiAgICAgICksXG4gICAgKTtcblxuICBjb25zdCBnb3Zlcm5hbmNlID0gcHJvZ3JhbS5jb21tYW5kKCdnb3Zlcm5hbmNlJykuZGVzY3JpcHRpb24oJ2dvdmVybmFuY2Ugcm9sZXMgKHJvYWRtYXAgXHUwMEE3MyknKTtcbiAgd2l0aENsaWVudEZsYWdzKGdvdmVybmFuY2UuY29tbWFuZCgnc2V0IDxhY3RvcklkPiA8cm9sZT4nKSlcbiAgICAuZGVzY3JpcHRpb24oJ3NldCBhbiBhY3RvciBnb3Zlcm5hbmNlIHJvbGU6IGFkbWluIHwgbWVtYmVyIHwgYXVkaXRvciAoZ292ZXJuYW5jZS1hZG1pbiBvbmx5KScpXG4gICAgLmFjdGlvbihhc3luYyAoYWN0b3JJZDogc3RyaW5nLCByb2xlQ29kZTogc3RyaW5nLCBvcHRzOiBDbGllbnRGbGFncykgPT5cbiAgICAgIGVtaXQoKCkgPT4gZ292ZXJuYW5jZVNldENvbW1hbmQoY2xpZW50RnJvbShvcHRzKSwgeyBhY3RvcklkLCByb2xlOiByb2xlQ29kZSB9KSksXG4gICAgKTtcblxuICB3aXRoQ2xpZW50RmxhZ3MocHJvZ3JhbS5jb21tYW5kKCdhdXRoeiA8YWN0b3JJZD4gPHBlcm1pc3Npb24+JykpXG4gICAgLmRlc2NyaXB0aW9uKCdwcmludCB0aGUgcmVwbGF5YWJsZSBhdXRoeiBkZWNpc2lvbiB0cmFjZSBmb3IgYW4gYWN0b3IgXHUwMEQ3IHBlcm1pc3Npb24gKHJvYWRtYXAgXHUwMEE3MyknKVxuICAgIC5hY3Rpb24oYXN5bmMgKGFjdG9ySWQ6IHN0cmluZywgcGVybWlzc2lvbjogc3RyaW5nLCBvcHRzOiBDbGllbnRGbGFncykgPT5cbiAgICAgIGVtaXQoKCkgPT4gYXV0aHpDb21tYW5kKGNsaWVudEZyb20ob3B0cyksIHsgYWN0b3JJZCwgcGVybWlzc2lvbiB9KSksXG4gICAgKTtcblxuICBjb25zdCBmZWF0dXJlID0gcHJvZ3JhbS5jb21tYW5kKCdmZWF0dXJlJykuZGVzY3JpcHRpb24oJ2ZlYXR1cmUgbWFuYWdlbWVudCcpO1xuICB3aXRoQ2xpZW50RmxhZ3MoZmVhdHVyZS5jb21tYW5kKCdjcmVhdGUnKSlcbiAgICAuZGVzY3JpcHRpb24oJ2NyZWF0ZSBhIGZlYXR1cmU7IHByaW50cyBmZWF0dXJlSWQnKVxuICAgIC5hY3Rpb24oYXN5bmMgKG9wdHM6IENsaWVudEZsYWdzKSA9PiBlbWl0KCgpID0+IGZlYXR1cmVDcmVhdGVDb21tYW5kKGNsaWVudEZyb20ob3B0cykpKSk7XG5cbiAgd2l0aENsaWVudEZsYWdzKHByb2dyYW0uY29tbWFuZCgnaW1wb3J0IDxmZWF0dXJlSWQ+IDxzdG9yaWVzWWFtbFBhdGg+JykpXG4gICAgLmRlc2NyaXB0aW9uKCdpbXBvcnQgYSBzdG9yaWVzLnlhbWwgZmlsZSBpbnRvIGEgZmVhdHVyZSAoaWRlbXBvdGVudCknKVxuICAgIC5hY3Rpb24oYXN5bmMgKGZlYXR1cmVJZDogc3RyaW5nLCBzdG9yaWVzWWFtbFBhdGg6IHN0cmluZywgb3B0czogQ2xpZW50RmxhZ3MpID0+XG4gICAgICBlbWl0KCgpID0+IGltcG9ydFN0b3JpZXNDb21tYW5kKGNsaWVudEZyb20ob3B0cyksIHsgZmVhdHVyZUlkLCBwYXRoOiBzdG9yaWVzWWFtbFBhdGggfSkpLFxuICAgICk7XG5cbiAgLy8gLS0gY29sbGFib3JhdGlvbiAoUGhhc2UgMywgcm9hZG1hcCBcdTAwQTc1KSAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgY29uc3QgdGhyZWFkID0gcHJvZ3JhbS5jb21tYW5kKCd0aHJlYWQnKS5kZXNjcmlwdGlvbignY29udmVyc2F0aW9uIHRocmVhZHMgKFBoYXNlIDMsIHJvYWRtYXAgXHUwMEE3NSknKTtcbiAgd2l0aENsaWVudEZsYWdzKHRocmVhZC5jb21tYW5kKCdjcmVhdGUnKSlcbiAgICAuZGVzY3JpcHRpb24oJ2NyZWF0ZSBhIHRocmVhZCwgb3B0aW9uYWxseSBib3VuZCB0byBhIGZlYXR1cmUvd29yayBpdGVtJylcbiAgICAucmVxdWlyZWRPcHRpb24oJy0ta2luZCA8a2luZD4nLCAnc3BlYyB8IGRlc2lnbiB8IHRhc2sgfCBnZW5lcmFsIHwgcHJpdmF0ZScpXG4gICAgLm9wdGlvbignLS1mZWF0dXJlIDxmZWF0dXJlSWQ+JywgJ2JpbmQgdG8gYSBmZWF0dXJlJylcbiAgICAub3B0aW9uKCctLXdvcmstaXRlbSA8d29ya0l0ZW1JZD4nLCAnYmluZCB0byBhIHdvcmsgaXRlbSAoaWQgb3IgZXh0ZXJuYWxLZXkpJylcbiAgICAub3B0aW9uKCctLXZpc2liaWxpdHkgPHZpc2liaWxpdHk+JywgJ29wZW4gfCBwcml2YXRlJylcbiAgICAuYWN0aW9uKFxuICAgICAgYXN5bmMgKFxuICAgICAgICBvcHRzOiBDbGllbnRGbGFncyAmIHsga2luZDogc3RyaW5nOyBmZWF0dXJlPzogc3RyaW5nOyB3b3JrSXRlbT86IHN0cmluZzsgdmlzaWJpbGl0eT86IHN0cmluZyB9LFxuICAgICAgKSA9PlxuICAgICAgICBlbWl0KCgpID0+XG4gICAgICAgICAgdGhyZWFkQ3JlYXRlQ29tbWFuZChjbGllbnRGcm9tKG9wdHMpLCB7XG4gICAgICAgICAgICBraW5kOiBvcHRzLmtpbmQsXG4gICAgICAgICAgICAuLi4ob3B0cy5mZWF0dXJlICE9PSB1bmRlZmluZWQgPyB7IGZlYXR1cmVJZDogb3B0cy5mZWF0dXJlIH0gOiB7fSksXG4gICAgICAgICAgICAuLi4ob3B0cy53b3JrSXRlbSAhPT0gdW5kZWZpbmVkID8geyB3b3JrSXRlbUlkOiBvcHRzLndvcmtJdGVtIH0gOiB7fSksXG4gICAgICAgICAgICAuLi4ob3B0cy52aXNpYmlsaXR5ICE9PSB1bmRlZmluZWQgPyB7IHZpc2liaWxpdHk6IG9wdHMudmlzaWJpbGl0eSB9IDoge30pLFxuICAgICAgICAgIH0pLFxuICAgICAgICApLFxuICAgICk7XG4gIHdpdGhDbGllbnRGbGFncyh0aHJlYWQuY29tbWFuZCgnbGlzdCcpKVxuICAgIC5kZXNjcmlwdGlvbignbGlzdCB0aHJlYWRzIChwcml2YXRlIG9uZXMgb25seSB3aGVuIHlvdSBwYXJ0aWNpcGF0ZSknKVxuICAgIC5vcHRpb24oJy0tZmVhdHVyZSA8ZmVhdHVyZUlkPicsICdmaWx0ZXIgYnkgZmVhdHVyZScpXG4gICAgLm9wdGlvbignLS13b3JrLWl0ZW0gPHdvcmtJdGVtSWQ+JywgJ2ZpbHRlciBieSB3b3JrIGl0ZW0nKVxuICAgIC5hY3Rpb24oYXN5bmMgKG9wdHM6IENsaWVudEZsYWdzICYgeyBmZWF0dXJlPzogc3RyaW5nOyB3b3JrSXRlbT86IHN0cmluZyB9KSA9PlxuICAgICAgZW1pdCgoKSA9PlxuICAgICAgICB0aHJlYWRMaXN0Q29tbWFuZChjbGllbnRGcm9tKG9wdHMpLCB7XG4gICAgICAgICAgLi4uKG9wdHMuZmVhdHVyZSAhPT0gdW5kZWZpbmVkID8geyBmZWF0dXJlSWQ6IG9wdHMuZmVhdHVyZSB9IDoge30pLFxuICAgICAgICAgIC4uLihvcHRzLndvcmtJdGVtICE9PSB1bmRlZmluZWQgPyB7IHdvcmtJdGVtSWQ6IG9wdHMud29ya0l0ZW0gfSA6IHt9KSxcbiAgICAgICAgfSksXG4gICAgICApLFxuICAgICk7XG5cbiAgd2l0aENsaWVudEZsYWdzKHByb2dyYW0uY29tbWFuZCgncG9zdCA8dGhyZWFkSWQ+IDxib2R5PicpKVxuICAgIC5kZXNjcmlwdGlvbigncG9zdCBhIG1lc3NhZ2U7IC0tbWVudGlvbiB0YWtlcyBTVFJVQ1RVUkVEIGFjdG9yIGlkcyAoYm9keSB0ZXh0IGlzIG5ldmVyIHBhcnNlZCknKVxuICAgIC5vcHRpb24oJy0tbWVudGlvbiA8YWN0b3JJZD4nLCAnbWVudGlvbiBhbiBhY3RvciBieSBpZCAocmVwZWF0YWJsZSknLCBjb2xsZWN0LCBbXSlcbiAgICAub3B0aW9uKCctLXJlcGx5LXRvIDxtZXNzYWdlSWQ+JywgJ3JlcGx5IHRvIGEgbWVzc2FnZScpXG4gICAgLmFjdGlvbihcbiAgICAgIGFzeW5jICh0aHJlYWRJZDogc3RyaW5nLCBib2R5OiBzdHJpbmcsIG9wdHM6IENsaWVudEZsYWdzICYgeyBtZW50aW9uOiBzdHJpbmdbXTsgcmVwbHlUbz86IHN0cmluZyB9KSA9PlxuICAgICAgICBlbWl0KCgpID0+XG4gICAgICAgICAgcG9zdENvbW1hbmQoY2xpZW50RnJvbShvcHRzKSwge1xuICAgICAgICAgICAgdGhyZWFkSWQsXG4gICAgICAgICAgICBib2R5LFxuICAgICAgICAgICAgLi4uKG9wdHMubWVudGlvbi5sZW5ndGggPiAwID8geyBtZW50aW9uczogb3B0cy5tZW50aW9uIH0gOiB7fSksXG4gICAgICAgICAgICAuLi4ob3B0cy5yZXBseVRvICE9PSB1bmRlZmluZWQgPyB7IHJlcGx5VG86IG9wdHMucmVwbHlUbyB9IDoge30pLFxuICAgICAgICAgIH0pLFxuICAgICAgICApLFxuICAgICk7XG5cbiAgd2l0aENsaWVudEZsYWdzKHByb2dyYW0uY29tbWFuZCgnbWVzc2FnZXMgPHRocmVhZElkPicpKVxuICAgIC5kZXNjcmlwdGlvbignbGlzdCBtZXNzYWdlcyBvZiBhIHRocmVhZCAocmF3IGF1dGhvcklkOyBzeXN0ZW0gbmFycmF0aW9uIGluY2x1ZGVkKScpXG4gICAgLm9wdGlvbignLS1zaW5jZSA8c2VxPicsICdvbmx5IG1lc3NhZ2VzIHdpdGggc2VxIGdyZWF0ZXIgdGhhbiB0aGlzJywgKHY6IHN0cmluZykgPT4gTnVtYmVyKHYpKVxuICAgIC5hY3Rpb24oYXN5bmMgKHRocmVhZElkOiBzdHJpbmcsIG9wdHM6IENsaWVudEZsYWdzICYgeyBzaW5jZT86IG51bWJlciB9KSA9PlxuICAgICAgZW1pdCgoKSA9PlxuICAgICAgICBtZXNzYWdlc0NvbW1hbmQoY2xpZW50RnJvbShvcHRzKSwge1xuICAgICAgICAgIHRocmVhZElkLFxuICAgICAgICAgIC4uLihvcHRzLnNpbmNlICE9PSB1bmRlZmluZWQgPyB7IHNpbmNlU2VxOiBvcHRzLnNpbmNlIH0gOiB7fSksXG4gICAgICAgIH0pLFxuICAgICAgKSxcbiAgICApO1xuXG4gIHdpdGhDbGllbnRGbGFncyhwcm9ncmFtLmNvbW1hbmQoJ25vdGlmaWNhdGlvbnMnKSlcbiAgICAuZGVzY3JpcHRpb24oJ3lvdXIgb3duIG5vdGlmaWNhdGlvbnMgKG1lbnRpb25zICsgYWdlbnQtam9iIGNvbXBsZXRpb25zKScpXG4gICAgLm9wdGlvbignLS11bnJlYWQnLCAnb25seSB1bnJlYWQgbm90aWZpY2F0aW9ucycpXG4gICAgLmFjdGlvbihhc3luYyAob3B0czogQ2xpZW50RmxhZ3MgJiB7IHVucmVhZD86IGJvb2xlYW4gfSkgPT5cbiAgICAgIGVtaXQoKCkgPT5cbiAgICAgICAgbm90aWZpY2F0aW9uc0NvbW1hbmQoY2xpZW50RnJvbShvcHRzKSwgb3B0cy51bnJlYWQgPT09IHRydWUgPyB7IHVucmVhZE9ubHk6IHRydWUgfSA6IHt9KSxcbiAgICAgICksXG4gICAgKTtcblxuICBjb25zdCBqb2IgPSBwcm9ncmFtLmNvbW1hbmQoJ2pvYicpLmRlc2NyaXB0aW9uKCdyb3V0ZXItbWF0ZXJpYWxpemVkIGFnZW50IGpvYnMgKHJlcGx5LW9ubHksIFx1MDBBNzUuNCknKTtcbiAgd2l0aENsaWVudEZsYWdzKHByb2dyYW0uY29tbWFuZCgnam9icycpKVxuICAgIC5kZXNjcmlwdGlvbignbGlzdCBhZ2VudCBqb2JzJylcbiAgICAub3B0aW9uKCctLWFnZW50IDxhY3RvcklkPicsICdmaWx0ZXIgYnkgYWdlbnQgYWN0b3InKVxuICAgIC5vcHRpb24oJy0tc3RhdHVzIDxzdGF0dXM+JywgJ3F1ZXVlZCB8IGRvbmUgfCBibG9ja2VkJylcbiAgICAuYWN0aW9uKGFzeW5jIChvcHRzOiBDbGllbnRGbGFncyAmIHsgYWdlbnQ/OiBzdHJpbmc7IHN0YXR1cz86IHN0cmluZyB9KSA9PlxuICAgICAgZW1pdCgoKSA9PlxuICAgICAgICBqb2JzQ29tbWFuZChjbGllbnRGcm9tKG9wdHMpLCB7XG4gICAgICAgICAgLi4uKG9wdHMuYWdlbnQgIT09IHVuZGVmaW5lZCA/IHsgYWdlbnRBY3RvcklkOiBvcHRzLmFnZW50IH0gOiB7fSksXG4gICAgICAgICAgLi4uKG9wdHMuc3RhdHVzICE9PSB1bmRlZmluZWQgPyB7IHN0YXR1czogb3B0cy5zdGF0dXMgfSA6IHt9KSxcbiAgICAgICAgfSksXG4gICAgICApLFxuICAgICk7XG4gIHdpdGhDbGllbnRGbGFncyhqb2IuY29tbWFuZCgnZG9uZSA8am9iSWQ+JykpXG4gICAgLmRlc2NyaXB0aW9uKCdjb21wbGV0ZSBhIGpvYiBhcyBpdHMgYWdlbnQgKG5vdGlmaWVzIHRoZSBtZW50aW9uZXIgXHUyMDE0IG5vdGhpbmcgZWxzZSBtb3ZlcyknKVxuICAgIC5vcHRpb24oJy0tbm90ZSA8bm90ZT4nLCAnY29tcGxldGlvbiBub3RlJylcbiAgICAuYWN0aW9uKGFzeW5jIChqb2JJZDogc3RyaW5nLCBvcHRzOiBDbGllbnRGbGFncyAmIHsgbm90ZT86IHN0cmluZyB9KSA9PlxuICAgICAgZW1pdCgoKSA9PlxuICAgICAgICBqb2JDb21wbGV0ZUNvbW1hbmQoY2xpZW50RnJvbShvcHRzKSwge1xuICAgICAgICAgIGpvYklkLFxuICAgICAgICAgIHN0YXR1czogJ2RvbmUnLFxuICAgICAgICAgIC4uLihvcHRzLm5vdGUgIT09IHVuZGVmaW5lZCA/IHsgbm90ZTogb3B0cy5ub3RlIH0gOiB7fSksXG4gICAgICAgIH0pLFxuICAgICAgKSxcbiAgICApO1xuXG4gIC8vIC0tIGFkdmlzb3IgYm90cyAocmVhZCArIHBvc3Qgb25seSwgZGV0ZXJtaW5pc3RpYywgbm8gTExNKSAtLS0tLS0tLS0tLS0tLS0tLS0tLVxuICBjb25zdCBhZHZpc2UgPSBwcm9ncmFtXG4gICAgLmNvbW1hbmQoJ2FkdmlzZScpXG4gICAgLmRlc2NyaXB0aW9uKCdkZXRlcm1pbmlzdGljIGFkdmlzb3IgYm90cyBcdTIwMTQgcmVhZCArIHBvc3Qgb25seSwgbmV2ZXIgYSBsaWZlY3ljbGUgbXV0YXRpb24nKTtcbiAgd2l0aENsaWVudEZsYWdzKGFkdmlzZS5jb21tYW5kKCduZXh0LXRhc2snKSlcbiAgICAuZGVzY3JpcHRpb24oJ3Bvc3QgdGhlIHN1Z2dlc3RlZCBjbGFpbSBvcmRlciAoY2xhaW1hYmxlIHJlYWR5X2Zvcl9kZXYpIGludG8gYSB0aHJlYWQnKVxuICAgIC5yZXF1aXJlZE9wdGlvbignLS10aHJlYWQgPHRocmVhZElkPicsICd0aHJlYWQgdG8gcG9zdCB0aGUgYWR2aWNlIGludG8nKVxuICAgIC5hY3Rpb24oYXN5bmMgKG9wdHM6IENsaWVudEZsYWdzICYgeyB0aHJlYWQ6IHN0cmluZyB9KSA9PlxuICAgICAgZW1pdCgoKSA9PiBhZHZpc2VOZXh0VGFza0NvbW1hbmQoY2xpZW50RnJvbShvcHRzKSwgeyB0aHJlYWRJZDogb3B0cy50aHJlYWQgfSkpLFxuICAgICk7XG4gIHdpdGhDbGllbnRGbGFncyhhZHZpc2UuY29tbWFuZCgncmVjb25jaWxlJykpXG4gICAgLmRlc2NyaXB0aW9uKCdwb3N0IHRoZSBkZXRlY3Qtb25seSBmaWxlXHUyMTk0REIgZGl2ZXJnZW5jZSByZXBvcnQgaW50byBhIHRocmVhZCcpXG4gICAgLnJlcXVpcmVkT3B0aW9uKCctLXRocmVhZCA8dGhyZWFkSWQ+JywgJ3RocmVhZCB0byBwb3N0IHRoZSBhZHZpY2UgaW50bycpXG4gICAgLnJlcXVpcmVkT3B0aW9uKCctLWZpbGUgPHBhaXI+JywgJ29uZSA8d29ya0l0ZW1JZD49PGZyb250bWF0dGVyU3RhdHVzPiBwYWlyIChyZXBlYXRhYmxlKScsIGNvbGxlY3QsIFtdKVxuICAgIC5hY3Rpb24oYXN5bmMgKG9wdHM6IENsaWVudEZsYWdzICYgeyB0aHJlYWQ6IHN0cmluZzsgZmlsZTogc3RyaW5nW10gfSkgPT5cbiAgICAgIGVtaXQoKCkgPT5cbiAgICAgICAgYWR2aXNlUmVjb25jaWxlQ29tbWFuZChjbGllbnRGcm9tKG9wdHMpLCB7IHRocmVhZElkOiBvcHRzLnRocmVhZCwgZmlsZXM6IG9wdHMuZmlsZSB9KSxcbiAgICAgICksXG4gICAgKTtcblxuICB3aXRoQ2xpZW50RmxhZ3MocHJvZ3JhbS5jb21tYW5kKCdldmVudHMgW3N0cmVhbUlkXScpKVxuICAgIC5kZXNjcmlwdGlvbignYXVkaXQgcXVlcnkgb3ZlciB0aGUgYXBwZW5kLW9ubHkgZXZlbnQgbG9nJylcbiAgICAuYWN0aW9uKGFzeW5jIChzdHJlYW1JZDogc3RyaW5nIHwgdW5kZWZpbmVkLCBvcHRzOiBDbGllbnRGbGFncykgPT5cbiAgICAgIGVtaXQoKCkgPT5cbiAgICAgICAgZXZlbnRzQ29tbWFuZChjbGllbnRGcm9tKG9wdHMpLCBzdHJlYW1JZCAhPT0gdW5kZWZpbmVkID8geyBzdHJlYW1JZCB9IDoge30pLFxuICAgICAgKSxcbiAgICApO1xuXG4gIC8vIC0tIHdvcmsgKHJ1bm5lciBoYW5kb2ZmOyBAb2Focy9ydW5uZXIgbGFuZHMgd2l0aCBzdG9yeSAxNCkgLS0tLS0tLS0tLS0tLS0tLS0tLVxuICB3aXRoQ2xpZW50RmxhZ3MocHJvZ3JhbS5jb21tYW5kKCd3b3JrJykpXG4gICAgLmRlc2NyaXB0aW9uKCdydW4gdGhlIEJZTyB3b3JrZXIgbG9vcCBhZ2FpbnN0IHRoaXMgc3BpbmUgKHJlcXVpcmVzIEBvYWhzL3J1bm5lciknKVxuICAgIC5yZXF1aXJlZE9wdGlvbignLS1yZXBvIDxwYXRoPicsICd0YXJnZXQgcHJvamVjdCBnaXQgY2hlY2tvdXQnKVxuICAgIC5yZXF1aXJlZE9wdGlvbignLS1zcGVjLWZvbGRlciA8cmVsPicsICdzcGVjIGZvbGRlciByZWxhdGl2ZSB0byB0aGUgcmVwbyByb290JylcbiAgICAucmVxdWlyZWRPcHRpb24oJy0tYWdlbnQtY21kIDx0ZW1wbGF0ZT4nLCAnY29kaW5nLWFnZW50IGNvbW1hbmQgdGVtcGxhdGUgKHtTUEVDX0ZPTERFUn0ge1NUT1JZX0lEfSB7SU5WT0tFX1dJVEh9IHtXT1JLVFJFRX0pJylcbiAgICAub3B0aW9uKCctLW9uY2UnLCAnZGlzcGF0Y2ggYXQgbW9zdCBvbmUgd29yayBpdGVtLCB0aGVuIGV4aXQnKVxuICAgIC5vcHRpb24oJy0tcG9sbCA8bXM+JywgJ3BvbGwgaW50ZXJ2YWwgaW4gbWlsbGlzZWNvbmRzJylcbiAgICAuYWN0aW9uKFxuICAgICAgYXN5bmMgKFxuICAgICAgICBvcHRzOiBDbGllbnRGbGFncyAmIHtcbiAgICAgICAgICByZXBvOiBzdHJpbmc7XG4gICAgICAgICAgc3BlY0ZvbGRlcjogc3RyaW5nO1xuICAgICAgICAgIGFnZW50Q21kOiBzdHJpbmc7XG4gICAgICAgICAgb25jZT86IGJvb2xlYW47XG4gICAgICAgICAgcG9sbD86IHN0cmluZztcbiAgICAgICAgfSxcbiAgICAgICkgPT4ge1xuICAgICAgICB0cnkge1xuICAgICAgICAgIGNvbnN0IGNsaWVudCA9IGNsaWVudEZyb20ob3B0cyk7XG4gICAgICAgICAgLy8gTEFaWSBpbXBvcnQ6IHRoZSBydW5uZXIgaXMgYSBmaXhlZCBpbnRlcmZhY2UgdGhhdCBtYXkgc3RpbGwgYmUgYVxuICAgICAgICAgIC8vIHN0dWIgXHUyMDE0IHRoZSByZXN0IG9mIHRoZSBDTEkgbXVzdCBuZXZlciBwYXkgZm9yIChvciBicmVhayBvbikgaXQuXG4gICAgICAgICAgY29uc3QgcnVubmVyID0gYXdhaXQgaW1wb3J0KCdAb2Focy9ydW5uZXInKTtcbiAgICAgICAgICBhd2FpdCBydW5uZXIud29ya0xvb3Aoe1xuICAgICAgICAgICAgY2xpZW50LFxuICAgICAgICAgICAgcmVwb1BhdGg6IHJlc29sdmUob3B0cy5yZXBvKSxcbiAgICAgICAgICAgIHNwZWNGb2xkZXI6IG9wdHMuc3BlY0ZvbGRlcixcbiAgICAgICAgICAgIGFnZW50Q21kOiBvcHRzLmFnZW50Q21kLFxuICAgICAgICAgICAgLi4uKG9wdHMucG9sbCAhPT0gdW5kZWZpbmVkID8geyBwb2xsTXM6IE51bWJlcihvcHRzLnBvbGwpIH0gOiB7fSksXG4gICAgICAgICAgICAuLi4ob3B0cy5vbmNlID09PSB0cnVlID8geyBvbmNlOiB0cnVlIH0gOiB7fSksXG4gICAgICAgICAgfSk7XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgY29uc3QgZXJyID0gZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yIDogbmV3IEVycm9yKFN0cmluZyhlcnJvcikpO1xuICAgICAgICAgIHByb2Nlc3Muc3RkZXJyLndyaXRlKGBvYWhzIHdvcmsgZmFpbGVkIFx1MjAxNCAke2Vyci5uYW1lfTogJHtlcnIubWVzc2FnZX1cXG5gKTtcbiAgICAgICAgICBwcm9jZXNzLmV4aXRDb2RlID0gMTtcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICApO1xuXG4gIHJldHVybiBwcm9ncmFtO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gbWFpbihhcmd2OiBzdHJpbmdbXSA9IHByb2Nlc3MuYXJndik6IFByb21pc2U8dm9pZD4ge1xuICBhd2FpdCBidWlsZFByb2dyYW0oKS5wYXJzZUFzeW5jKGFyZ3YpO1xufVxuXG4vLyBCdW5kbGVkIGFzIGJpbi9vYWhzLm1qcyBcdTIwMTQgdGhlIGJ1bmRsZSBlbnRyeXBvaW50IElTIHRoZSBleGVjdXRhYmxlLlxudm9pZCBtYWluKCk7XG4iLCAiLyoqXG4gKiBAb2Focy9jb250cmFjdHMgXHUyMDE0IHRoZSBzaW5nbGUgc291cmNlIG9mIHRydXRoIGZvciBldmVyeSBvYWhzIGNvbW1hbmQuXG4gKlxuICogT25lIHJlZ2lzdHJ5IGVudHJ5ID0gb25lIEhUVFAgZW5kcG9pbnQgKGBQT1NUIC9ycGMvPG5hbWU+YCkgPSBvbmUgTUNQIHRvb2xcbiAqIChgb2Foc188bmFtZT5gKSA9IG9uZSB0eXBlZCBjbGllbnQgbWV0aG9kLiBCb3RoIGFkYXB0ZXJzIGNhbGwgdGhlIHNhbWVcbiAqIGNvbW1hbmQgYnVzIHdpdGggdGhlIHNhbWUgem9kLXZhbGlkYXRlZCBpbnB1dCwgc28gXCJNQ1Agc2VtYW50aWNzIFx1MjI2MSBIVFRQXG4gKiBzZW1hbnRpY3NcIiBpcyBhIHN0cnVjdHVyYWwgY29uc2VxdWVuY2UsIG5vdCBhIHJldmlldyBkaXNjaXBsaW5lXG4gKiAocHJvZHVjdC1yb2FkbWFwLm1kIFx1MDBBNzAuMSBpbnZhcmlhbnQsIEQ1KS5cbiAqXG4gKiBUcmFuc3BvcnQgaXMgZGVsaWJlcmF0ZWx5IHVuaWZvcm0gUlBDIChubyBSRVNUIHBhdGggcGFyYW1ldGVycyk6IHBhcml0eVxuICogYmV0d2VlbiBzdXJmYWNlcyBzdGF5cyBtYWNoaW5lLWNoZWNrYWJsZSwgYW5kIHRoZSBwYXJpdHkgdGVzdCBpblxuICogYXBwcy9zcGluZS1hcGkgYXNzZXJ0cyBldmVyeSByZWdpc3RyeSBlbnRyeSBleGlzdHMgb24gYm90aCBzdXJmYWNlcy5cbiAqL1xuaW1wb3J0IHsgeiB9IGZyb20gJ3pvZCc7XG5pbXBvcnQge1xuICBCTE9DS0VEX1JFQVNPTlMsXG4gIFdPUktfSVRFTV9LSU5EUyxcbiAgV09SS19JVEVNX1NUQVRFUyxcbiAgdHlwZSBTcGluZUVuZ2luZSxcbn0gZnJvbSAnQG9haHMvY29yZSc7XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gU2hhcmVkIGZpZWxkIHNjaGVtYXNcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5jb25zdCB3b3JrSXRlbUlkID0gei5zdHJpbmcoKS5taW4oMSkuZGVzY3JpYmUoJ1dvcmsgaXRlbSBpZCAob3IgaXRzIHN0b3JpZXMueWFtbCBleHRlcm5hbEtleSknKTtcbmNvbnN0IGZlbmNpbmdUb2tlbiA9IHpcbiAgLm51bWJlcigpXG4gIC5pbnQoKVxuICAub3B0aW9uYWwoKVxuICAuZGVzY3JpYmUoJ0ZlbmNpbmcgdG9rZW4gb2YgdGhlIGxpdmUgY2xhaW0gXHUyMDE0IHJlcXVpcmVkIGZvciBleGVjdXRpb24tem9uZSBtdXRhdGlvbnMnKTtcblxuY29uc3QgZXZpZGVuY2VTY2hlbWEgPSB6XG4gIC5vYmplY3Qoe1xuICAgIGtpbmQ6IHouZW51bShbJ3Rlc3RfcnVuJywgJ2dpdF9kaWZmJywgJ2NvbW1pdCcsICdoYWx0X3JlcG9ydCcsICdyZXZpZXdfcmVwb3J0JywgJ2RvY19saW50J10pLFxuICAgIHBheWxvYWQ6IHoucmVjb3JkKHouc3RyaW5nKCksIHoudW5rbm93bigpKSxcbiAgfSlcbiAgLmRlc2NyaWJlKCdSYXcgbWFjaGluZS1jb2xsZWN0ZWQgZXZpZGVuY2U7IHRoZSBjb3JlIGNvbXB1dGVzIHZlcmRpY3RzLCB0aGUgcnVubmVyIG5ldmVyIGRvZXMnKTtcblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBSZWdpc3RyeVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbmV4cG9ydCBpbnRlcmZhY2UgQ29tbWFuZERlZjxJbnB1dCBleHRlbmRzIHouWm9kVHlwZSA9IHouWm9kVHlwZT4ge1xuICAvKiogc25ha2VfY2FzZSBjb21tYW5kIG5hbWU7IEhUVFAgcGF0aCBpcyAvcnBjLzxuYW1lPiwgTUNQIHRvb2wgaXMgb2Foc188bmFtZT4gKi9cbiAgbmFtZTogc3RyaW5nO1xuICBkZXNjcmlwdGlvbjogc3RyaW5nO1xuICBpbnB1dDogSW5wdXQ7XG4gIC8qKiB0cnVlIHdoZW4gdGhlIGNvbW1hbmQgb25seSByZWFkcyBzdGF0ZSAodXNlZCBmb3IgZG9jczsgc2FtZSByYWlscyBlaXRoZXIgd2F5KSAqL1xuICByZWFkb25seTogYm9vbGVhbjtcbn1cblxuZnVuY3Rpb24gZGVmPEkgZXh0ZW5kcyB6LlpvZFR5cGU+KFxuICBuYW1lOiBzdHJpbmcsXG4gIGRlc2NyaXB0aW9uOiBzdHJpbmcsXG4gIGlucHV0OiBJLFxuICByZWFkb25seSA9IGZhbHNlLFxuKTogQ29tbWFuZERlZjxJPiB7XG4gIHJldHVybiB7IG5hbWUsIGRlc2NyaXB0aW9uLCBpbnB1dCwgcmVhZG9ubHkgfTtcbn1cblxuZXhwb3J0IGNvbnN0IENPTU1BTkRTID0gW1xuICAvLyAtLSBzZXR1cCAvIGFkbWluIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICBkZWYoXG4gICAgJ2NyZWF0ZV9hY3RvcicsXG4gICAgJ0NyZWF0ZSBhIHVzZXIgb3IgYWdlbnQgYWN0b3IuIFJldHVybnMgdGhlIGFjdG9yIGFuZCBpdHMgQVBJIHRva2VuIChhZG1pbiBvbmx5KS4nLFxuICAgIHoub2JqZWN0KHtcbiAgICAgIHR5cGU6IHouZW51bShbJ3VzZXInLCAnYWdlbnQnXSksXG4gICAgICBkaXNwbGF5TmFtZTogei5zdHJpbmcoKS5taW4oMSksXG4gICAgICBnb3Zlcm5hbmNlUm9sZTogelxuICAgICAgICAuZW51bShbJ2FkbWluJywgJ21lbWJlcicsICdhdWRpdG9yJ10pXG4gICAgICAgIC5vcHRpb25hbCgpXG4gICAgICAgIC5kZXNjcmliZSgnQm9vdHN0cmFwIHBsdW1iaW5nIChyb2FkbWFwIFx1MDBBNzMpOiBpbml0aWFsIGdvdmVybmFuY2Ugcm9sZSBcdTIwMTQgYWRtaW4gY29udGV4dCBvbmx5JyksXG4gICAgfSksXG4gICksXG4gIGRlZihcbiAgICAnZ3JhbnRfcGVybWlzc2lvbicsXG4gICAgJ0dyYW50IGEgcGVybWlzc2lvbiB0byBhbiBhY3RvciAoYWRtaW4gb25seSkuIEdyYW50cyBhcmUgZXhwbGljaXQgYW5kIGF1ZGl0ZWQgXHUyMDE0IGF1dGhvcml0eSBuZXZlciBjb21lcyBmcm9tIGFjdG9yIHR5cGUsIHRlbnVyZSwgb3IgbWVtb3J5ICh0aGVzaXMgXHUwMEE3MykuJyxcbiAgICB6Lm9iamVjdCh7XG4gICAgICBhY3RvcklkOiB6LnN0cmluZygpLm1pbigxKSxcbiAgICAgIHBlcm1pc3Npb246IHouc3RyaW5nKCkubWluKDEpLFxuICAgICAgc2NvcGU6IHouc3RyaW5nKCkub3B0aW9uYWwoKSxcbiAgICB9KSxcbiAgKSxcbiAgZGVmKFxuICAgICdyZXZva2VfcGVybWlzc2lvbicsXG4gICAgJ1Jldm9rZSBhIHBlcm1pc3Npb24gZnJvbSBhbiBhY3RvciAoYWRtaW4gb25seSkuJyxcbiAgICB6Lm9iamVjdCh7XG4gICAgICBhY3RvcklkOiB6LnN0cmluZygpLm1pbigxKSxcbiAgICAgIHBlcm1pc3Npb246IHouc3RyaW5nKCkubWluKDEpLFxuICAgICAgc2NvcGU6IHouc3RyaW5nKCkub3B0aW9uYWwoKSxcbiAgICB9KSxcbiAgKSxcbiAgZGVmKCdjcmVhdGVfZmVhdHVyZScsICdDcmVhdGUgYSBmZWF0dXJlIChtYXBzIGEgQk1BRCBlcGljKS4nLCB6Lm9iamVjdCh7fSkpLFxuICBkZWYoXG4gICAgJ2NyZWF0ZV93b3JrX2l0ZW0nLFxuICAgICdDcmVhdGUgYSBzaW5nbGUgd29yayBpdGVtLiBraW5kIHNlbGVjdHMgV0hJQ0ggbWFjaGluZS1ldmlkZW5jZSBndWFyZHMgYXBwbHkgKFBoYXNlIDQpIFx1MjAxNCBuZXZlciBXSE8gbWF5IHBhc3MgYSBnYXRlLicsXG4gICAgei5vYmplY3Qoe1xuICAgICAgZmVhdHVyZUlkOiB6LnN0cmluZygpLm1pbigxKSxcbiAgICAgIGV4dGVybmFsS2V5OiB6LnN0cmluZygpLm1pbigxKSxcbiAgICAgIHRpdGxlOiB6LnN0cmluZygpLm1pbigxKSxcbiAgICAgIGtpbmQ6IHouZW51bShXT1JLX0lURU1fS0lORFMpLm9wdGlvbmFsKCkuZGVzY3JpYmUoXCJXb3JrLWl0ZW0ga2luZDsgZGVmYXVsdCAnY29kZSdcIiksXG4gICAgICBzcGVjQ2hlY2twb2ludDogei5ib29sZWFuKCkub3B0aW9uYWwoKSxcbiAgICAgIGRvbmVDaGVja3BvaW50OiB6LmJvb2xlYW4oKS5vcHRpb25hbCgpLFxuICAgICAgaW52b2tlRGV2V2l0aDogei5zdHJpbmcoKS5vcHRpb25hbCgpLFxuICAgICAgZGVwZW5kc09uOiB6LmFycmF5KHouc3RyaW5nKCkubWluKDEpKS5vcHRpb25hbCgpLmRlc2NyaWJlKCdleHRlcm5hbEtleXMgdGhpcyBpdGVtIGRlcGVuZHMgb24nKSxcbiAgICB9KSxcbiAgKSxcbiAgZGVmKFxuICAgICdsaXN0X2FjdG9ycycsXG4gICAgJ0xpc3QgQUxMIGFjdG9ycyBcdTIwMTQgaHVtYW5zLCBhZ2VudHMsIHBlcnNvbmFzLCBhbmQgdGhlIHN5c3RlbSBhY3RvciAodHJhbnNwYXJlbmN5IGZvciBwaWNrZXJzL2F1ZGl0KS4nLFxuICAgIHoub2JqZWN0KHt9KSxcbiAgICB0cnVlLFxuICApLFxuICBkZWYoXG4gICAgJ3Byb3Zpc2lvbl9wZXJzb25hcycsXG4gICAgJ0lkZW1wb3RlbnRseSBwcm92aXNpb24gdGhlIHNpeCBCTUFEIHBlcnNvbmFzIGFzIGFnZW50IGFjdG9ycyB3aXRoIGZsb29yLXN0YXRlIHJvbGVzIChnYXRlZCBieSBlbmdpbmUgZ292ZXJuYW5jZTsgemVybyBnYXRlIGF1dGhvcml0eSkuJyxcbiAgICB6Lm9iamVjdCh7fSksXG4gICksXG4gIGRlZihcbiAgICAnaW1wb3J0X3N0b3JpZXMnLFxuICAgICdJbXBvcnQgYSBzdG9yaWVzLnlhbWwgZmlsZSBpbnRvIGEgZmVhdHVyZSAoaWRlbXBvdGVudCByZS1pbXBvcnQ7IHZhbGlkaXR5IHJ1bGVzIGZyb20gc3Rvcmllcy1zY2hlbWEubWQpLicsXG4gICAgei5vYmplY3Qoe1xuICAgICAgZmVhdHVyZUlkOiB6LnN0cmluZygpLm1pbigxKSxcbiAgICAgIHlhbWw6IHouc3RyaW5nKCkubWluKDEpLFxuICAgIH0pLFxuICApLFxuXG4gIC8vIC0tIGNsYWltcyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIGRlZihcbiAgICAnY2xhaW1fdGFzaycsXG4gICAgJ0NsYWltIGEgd29yayBpdGVtIHVuZGVyIGEgbGVhc2UuIFJldHVybnMgdGhlIGNsYWltIHdpdGggaXRzIGZlbmNpbmcgdG9rZW4uJyxcbiAgICB6Lm9iamVjdCh7XG4gICAgICB3b3JrSXRlbUlkLFxuICAgICAgdHRsTXM6IHoubnVtYmVyKCkuaW50KCkucG9zaXRpdmUoKS5vcHRpb25hbCgpLFxuICAgIH0pLFxuICApLFxuICBkZWYoJ2hlYXJ0YmVhdCcsICdSZW5ldyB0aGUgbGVhc2Ugb2YgYSBsaXZlIGNsYWltLicsIHoub2JqZWN0KHsgY2xhaW1JZDogei5zdHJpbmcoKS5taW4oMSkgfSkpLFxuICBkZWYoXG4gICAgJ3JlbGVhc2VfY2xhaW0nLFxuICAgICdSZWxlYXNlIGEgY2xhaW0gKG5vcm1hbCBjb21wbGV0aW9uIG9yIHZvbHVudGFyeSBoYW5kb2ZmKS4nLFxuICAgIHoub2JqZWN0KHsgY2xhaW1JZDogei5zdHJpbmcoKS5taW4oMSksIHJlYXNvbjogei5zdHJpbmcoKS5vcHRpb25hbCgpIH0pLFxuICApLFxuXG4gIC8vIC0tIGxpZmVjeWNsZSAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgZGVmKFxuICAgICdhZHZhbmNlX3N0YXRlJyxcbiAgICAnQWR2YW5jZSBhIHdvcmsgaXRlbSB0aHJvdWdoIHRoZSBGU00uIERldGVybWluaXN0aWM6IHBlcm1pc3Npb24gKyBndWFyZHMgKyBldmlkZW5jZSBkZWNpZGUsIG5ldmVyIGludGVycHJldGF0aW9uLicsXG4gICAgei5vYmplY3Qoe1xuICAgICAgd29ya0l0ZW1JZCxcbiAgICAgIHRvOiB6LmVudW0oV09SS19JVEVNX1NUQVRFUyksXG4gICAgICBmZW5jaW5nVG9rZW4sXG4gICAgICBpZGVtcG90ZW5jeUtleTogei5zdHJpbmcoKS5vcHRpb25hbCgpLFxuICAgIH0pLFxuICApLFxuICBkZWYoXG4gICAgJ2Jsb2NrX3Rhc2snLFxuICAgICdTZXQgdGhlIGJsb2NrZWQgb3ZlcmxheSB3aXRoIGEgYmxvY2tpbmcgY29uZGl0aW9uIGZyb20gdGhlIEhBTFQgdGF4b25vbXkuJyxcbiAgICB6Lm9iamVjdCh7XG4gICAgICB3b3JrSXRlbUlkLFxuICAgICAgcmVhc29uOiB6LmVudW0oQkxPQ0tFRF9SRUFTT05TKSxcbiAgICAgIGZlbmNpbmdUb2tlbixcbiAgICB9KSxcbiAgKSxcbiAgZGVmKCd1bmJsb2NrX3Rhc2snLCAnQ2xlYXIgdGhlIGJsb2NrZWQgb3ZlcmxheSAocmV2aWV3X25vbl9jb252ZXJnZW5jZSBuZWVkcyB0aGUgcmV2aWV3IGdhdGUgZ3JhbnQpLicsIHoub2JqZWN0KHsgd29ya0l0ZW1JZCB9KSksXG4gIGRlZihcbiAgICAnc3VibWl0X2V2aWRlbmNlJyxcbiAgICAnU3VibWl0IHJhdyBtYWNoaW5lLWNvbGxlY3RlZCBldmlkZW5jZSAoZXhpdCBjb2RlcywgZGlmZiBzdGF0cywgc2hhcykuIFRoZSBjb3JlIGNvbXB1dGVzIHZlcmRpY3RzLicsXG4gICAgei5vYmplY3QoeyB3b3JrSXRlbUlkLCBldmlkZW5jZTogZXZpZGVuY2VTY2hlbWEsIGZlbmNpbmdUb2tlbiB9KSxcbiAgKSxcbiAgZGVmKFxuICAgICdhcHByb3ZlX2dhdGUnLFxuICAgICdBcHByb3ZlIGEgZ2F0ZSBhcyBhIHBlcm1pdHRlZCBhY3Rvci4gc3BlY19hcHByb3ZhbCBwaW5zIHRoZSB2ZXJpZmljYXRpb24gY29tbWFuZHMgKEQ3KSBhbmQgZmlyZXMgZHJhZnRcdTIxOTJyZWFkeV9mb3JfZGV2OyByZXZpZXdfYXBwcm92YWwgY2hlY2tzIHBpbm5lZCBldmlkZW5jZSBhbmQgZmlyZXMgaW5fcmV2aWV3XHUyMTkyZG9uZS4nLFxuICAgIHoub2JqZWN0KHtcbiAgICAgIHdvcmtJdGVtSWQsXG4gICAgICBnYXRlOiB6LmVudW0oWydzcGVjX2FwcHJvdmFsJywgJ3Jldmlld19hcHByb3ZhbCddKSxcbiAgICAgIHBpbm5lZFZlcmlmaWNhdGlvbjogei5hcnJheSh6LnN0cmluZygpKS5vcHRpb25hbCgpLFxuICAgIH0pLFxuICApLFxuICBkZWYoXG4gICAgJ3JlamVjdF9nYXRlJyxcbiAgICAnUmVqZWN0IGEgZ2F0ZSBhcyBhIHBlcm1pdHRlZCBhY3Rvci4gUmV2aWV3IHJlamVjdGlvbiBmaXJlcyB0aGUgbG9vcGJhY2sgYXMgYSBzeXN0ZW0gZWZmZWN0IChvciBibG9ja3Mgd2l0aCByZXZpZXdfbm9uX2NvbnZlcmdlbmNlIG9uIHRoZSA2dGgpLicsXG4gICAgei5vYmplY3Qoe1xuICAgICAgd29ya0l0ZW1JZCxcbiAgICAgIGdhdGU6IHouZW51bShbJ3NwZWNfYXBwcm92YWwnLCAncmV2aWV3X2FwcHJvdmFsJ10pLFxuICAgIH0pLFxuICApLFxuICBkZWYoXG4gICAgJ3JlbGVhc2VfZGlzcGF0Y2hfaG9sZCcsXG4gICAgJ1JlbGVhc2UgYSBkb25lX2NoZWNrcG9pbnQgZGlzcGF0Y2ggaG9sZCBvbiBhIGZlYXR1cmUgKHBlcm1pdHRlZCBhY3RvcnMgb25seSkuJyxcbiAgICB6Lm9iamVjdCh7IGZlYXR1cmVJZDogei5zdHJpbmcoKS5taW4oMSkgfSksXG4gICksXG5cbiAgLy8gLS0gZW50aXRsZW1lbnRzIChQaGFzZSAyLCByb2FkbWFwIFx1MDBBNzMpIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAvLyBBdXRob3JpdHkgZm9yIHRoaXMgZ3JvdXAgaXMgZGVjaWRlZCBieSB0aGUgRU5HSU5FIGZyb20gdGhlIGNhbGxlcidzXG4gIC8vIGdvdmVybmFuY2Ugcm9sZSAoXCJlbnRpdGxlbWVudCA9IHBsYW4gXHUwMEQ3IGdvdmVybmFuY2Ugcm9sZSBcdTAwRDcgZGVsaXZlcnkgcm9sZSxcbiAgLy8gcmVzb2x2ZWQgYnkgYSBwdXJlIGZ1bmN0aW9uIG92ZXIgdmVyc2lvbmVkIGNvbmZpZy9kYXRhXCIpIFx1MjAxNCB0aGUgYnVzIG5ldmVyXG4gIC8vIHByZS1jaGVja3MgYWRtaW4gaGVyZS5cbiAgZGVmKFxuICAgICdhc3NpZ25fcm9sZScsXG4gICAgJ0Fzc2lnbiBhIGRlbGl2ZXJ5IHJvbGUgKHBlcm1pc3Npb24gYnVuZGxlLCByb2FkbWFwIFx1MDBBNzMpIHRvIGFuIGFjdG9yLiBHYXRlZCB3cml0ZTogcmVxdWlyZXMgZ292ZXJuYW5jZS1hZG1pbiBhdXRob3JpdHk7IGF1ZGl0ZWQuJyxcbiAgICB6Lm9iamVjdCh7XG4gICAgICBhY3RvcklkOiB6LnN0cmluZygpLm1pbigxKSxcbiAgICAgIHJvbGVDb2RlOiB6LnN0cmluZygpLm1pbigxKS5kZXNjcmliZSgnRGVsaXZlcnkgcm9sZSBjb2RlLCBlLmcuIHJldmlld2VyIHwgZGV2ZWxvcGVyIHwgcHJvZHVjdF9vd25lcicpLFxuICAgIH0pLFxuICApLFxuICBkZWYoXG4gICAgJ3Jldm9rZV9yb2xlJyxcbiAgICAnUmV2b2tlIGEgZGVsaXZlcnkgcm9sZSBhc3NpZ25tZW50IGZyb20gYW4gYWN0b3IuIEdhdGVkIHdyaXRlOiByZXF1aXJlcyBnb3Zlcm5hbmNlLWFkbWluIGF1dGhvcml0eTsgYXVkaXRlZC4nLFxuICAgIHoub2JqZWN0KHtcbiAgICAgIGFjdG9ySWQ6IHouc3RyaW5nKCkubWluKDEpLFxuICAgICAgcm9sZUNvZGU6IHouc3RyaW5nKCkubWluKDEpLFxuICAgIH0pLFxuICApLFxuICBkZWYoXG4gICAgJ2xpc3Rfcm9sZV9hc3NpZ25tZW50cycsXG4gICAgJ0xpc3QgZGVsaXZlcnktcm9sZSBhc3NpZ25tZW50cyAoYWxsLCBvciBvbmUgYWN0b3JcdTIwMTlzKSwgaW5jbHVkaW5nIHJldm9rZWQgcm93cyBmb3IgYXVkaXQuJyxcbiAgICB6Lm9iamVjdCh7IGFjdG9ySWQ6IHouc3RyaW5nKCkubWluKDEpLm9wdGlvbmFsKCkgfSksXG4gICAgdHJ1ZSxcbiAgKSxcbiAgZGVmKFxuICAgICdzZXRfZ292ZXJuYW5jZV9yb2xlJyxcbiAgICAnU2V0IGFuIGFjdG9yXHUyMDE5cyBnb3Zlcm5hbmNlIHJvbGUgKGFkbWluIHwgbWVtYmVyIHwgYXVkaXRvcikuIEdhdGVkIHdyaXRlOiByZXF1aXJlcyBnb3Zlcm5hbmNlLWFkbWluIGF1dGhvcml0eS4nLFxuICAgIHoub2JqZWN0KHtcbiAgICAgIGFjdG9ySWQ6IHouc3RyaW5nKCkubWluKDEpLFxuICAgICAgcm9sZTogei5lbnVtKFsnYWRtaW4nLCAnbWVtYmVyJywgJ2F1ZGl0b3InXSksXG4gICAgfSksXG4gICksXG4gIGRlZihcbiAgICAnc2V0X3BsYW4nLFxuICAgICdTZXQgdGhlIHdvcmtzcGFjZSBwbGFuLiBQbGFuIGlzIGEgQ0VJTElORywgbmV2ZXIgYSBncmFudCAocm9hZG1hcCBcdTAwQTczKTogaXQgYm91bmRzIHdoYXQgYWdlbnRzIG1heSBob2xkL2V4ZXJjaXNlOyB1c2VycyBhcmUgbmV2ZXIgcGxhbi1maWx0ZXJlZC4nLFxuICAgIHoub2JqZWN0KHsgcGxhbjogei5lbnVtKFsnZnJlZScsICd0ZWFtJywgJ2VudGVycHJpc2UnXSkgfSksXG4gICksXG4gIGRlZihcbiAgICAnc2V0X3dvcmtzcGFjZV9wb2xpY3knLFxuICAgICdTZXQgcmVzdHJpY3Qtb25seSB3b3Jrc3BhY2UgcG9saWN5IGtleXMgKHJvYWRtYXAgXHUwMEE3Myk6IGEgcG9saWN5IGNhbiBuYXJyb3cgd2hhdCB0aGUgcGxhbiBhbGxvd3MsIG5ldmVyIHdpZGVuIGl0LicsXG4gICAgei5vYmplY3Qoe1xuICAgICAgcG9saWN5OiB6Lm9iamVjdCh7XG4gICAgICAgIGFnZW50R2F0ZUFwcHJvdmFsczogelxuICAgICAgICAgIC5ib29sZWFuKClcbiAgICAgICAgICAub3B0aW9uYWwoKVxuICAgICAgICAgIC5kZXNjcmliZSgnZmFsc2UgXHUyMUQyIGFnZW50cyBjYW5ub3QgZXhlcmNpc2UgZ2F0ZS1hcHByb3ZhbCBwZXJtaXNzaW9ucyBldmVuIGlmIGdyYW50ZWQnKSxcbiAgICAgICAgYWdlbnRTZWxmRGlzcGF0Y2g6IHpcbiAgICAgICAgICAuYm9vbGVhbigpXG4gICAgICAgICAgLm9wdGlvbmFsKClcbiAgICAgICAgICAuZGVzY3JpYmUoJ2ZhbHNlIFx1MjFEMiBhZ2VudHMgY2Fubm90IGNsYWltIHRhc2tzIG9uIHRoZWlyIG93biAobWVudGlvbi1kaXNwYXRjaCBvbmx5KScpLFxuICAgICAgfSksXG4gICAgfSksXG4gICksXG4gIGRlZihcbiAgICAnc2V0X2dhdGVfcG9saWN5JyxcbiAgICAnU2V0IGEgZ2F0ZSBkZWZpbml0aW9uIGFzIERBVEEgKHJvYWRtYXAgXHUwMEE3Myk6IG1pbl9hcHByb3ZhbHMgcXVvcnVtIGFuZCByZXF1aXJlZF9hY3Rvcl90eXBlcyBcdTIwMTQgaHVtYW4tb25seSBpcyBhIGRlZmF1bHQsIG5vdCBhIGhhcmRjb2RlLicsXG4gICAgei5vYmplY3Qoe1xuICAgICAgZ2F0ZTogei5lbnVtKFsnc3BlY19hcHByb3ZhbCcsICdyZXZpZXdfYXBwcm92YWwnXSksXG4gICAgICBwb2xpY3k6IHoub2JqZWN0KHtcbiAgICAgICAgbWluQXBwcm92YWxzOiB6Lm51bWJlcigpLmludCgpLnBvc2l0aXZlKCkub3B0aW9uYWwoKS5kZXNjcmliZSgnZGlzdGluY3QgYXBwcm92ZXJzIHJlcXVpcmVkIHBlciByZXZpZXcgcm91bmQnKSxcbiAgICAgICAgcmVxdWlyZWRBY3RvclR5cGVzOiB6XG4gICAgICAgICAgLmFycmF5KHouZW51bShbJ3VzZXInLCAnYWdlbnQnLCAnc3lzdGVtJ10pKVxuICAgICAgICAgIC5vcHRpb25hbCgpXG4gICAgICAgICAgLmRlc2NyaWJlKCdhdCBsZWFzdCBvbmUgYXBwcm92ZXIgb2YgZWFjaCBsaXN0ZWQgdHlwZSBpcyByZXF1aXJlZCcpLFxuICAgICAgfSksXG4gICAgfSksXG4gICksXG4gIGRlZihcbiAgICAnYXV0aHpfZXhwbGFpbicsXG4gICAgJ1JlcGxheWFibGUgYXV0aHogZGVjaXNpb24gdHJhY2UgKHJvYWRtYXAgXHUwMEE3Myk6IHNvdXJjZSBncmFudC9yb2xlLCBwbGFuIGNlaWxpbmcsIHBvbGljeSwgYW5kIHRoZSBwb2xpY3kgdmVyc2lvbiB0dXBsZSBhbiBhdWRpdG9yIGNhbiByZXBsYXkuJyxcbiAgICB6Lm9iamVjdCh7XG4gICAgICBhY3RvcklkOiB6LnN0cmluZygpLm1pbigxKSxcbiAgICAgIHBlcm1pc3Npb246IHouc3RyaW5nKCkubWluKDEpLFxuICAgIH0pLFxuICAgIHRydWUsXG4gICksXG5cbiAgLy8gLS0gY29sbGFib3JhdGlvbiAoUGhhc2UgMywgcm9hZG1hcCBcdTAwQTc1KSAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgLy8gVGhlIGNoYXQgU1VSRkFDRSBvdmVyIHRoZSBzYW1lIHJhaWxzLiBTYWNyZWQgYm91bmRhcnkgKFx1MDBBNzUuMik6IGEgbWVzc2FnZVxuICAvLyBORVZFUiBtdXRhdGVzIGxpZmVjeWNsZTsgbWVudGlvbnMgYXJlIFNUUlVDVFVSRUQgYWN0b3IgaWRzIFx1MjAxNCBubyBzZXJ2ZXJcbiAgLy8gY29kZSBwYXRoIGV2ZXIgcGFyc2VzIG1lc3NhZ2UgYm9keSB0ZXh0LiBBY3RvciBpZGVudGl0eSBmb3IgZXZlcnkgY29tbWFuZFxuICAvLyBoZXJlIGNvbWVzIGZyb20gY3R4ICh0aGUgYXV0aGVudGljYXRlZCB0b2tlbiksIG5ldmVyIGZyb20gdGhlIGlucHV0LlxuICBkZWYoXG4gICAgJ2NyZWF0ZV90aHJlYWQnLFxuICAgICdDcmVhdGUgYSBjb252ZXJzYXRpb24gdGhyZWFkLCBvcHRpb25hbGx5IGJvdW5kIHRvIGEgZmVhdHVyZS93b3JrIGl0ZW0uIGtpbmQ9cHJpdmF0ZSBkZWZhdWx0cyB2aXNpYmlsaXR5IHRvIHByaXZhdGUuJyxcbiAgICB6Lm9iamVjdCh7XG4gICAgICBraW5kOiB6LmVudW0oWydzcGVjJywgJ2Rlc2lnbicsICd0YXNrJywgJ2dlbmVyYWwnLCAncHJpdmF0ZSddKSxcbiAgICAgIGZlYXR1cmVJZDogei5zdHJpbmcoKS5taW4oMSkub3B0aW9uYWwoKSxcbiAgICAgIHdvcmtJdGVtSWQ6IHdvcmtJdGVtSWQub3B0aW9uYWwoKSxcbiAgICAgIHZpc2liaWxpdHk6IHouZW51bShbJ29wZW4nLCAncHJpdmF0ZSddKS5vcHRpb25hbCgpLFxuICAgIH0pLFxuICApLFxuICBkZWYoXG4gICAgJ2FkZF90aHJlYWRfcGFydGljaXBhbnQnLFxuICAgICdJbnZpdGUgYW4gYWN0b3IgaW50byBhIHRocmVhZCAocHJpdmF0ZSB0aHJlYWRzOiBvbmx5IGV4aXN0aW5nIHBhcnRpY2lwYW50cyBtYXkgaW52aXRlKS4nLFxuICAgIHoub2JqZWN0KHtcbiAgICAgIHRocmVhZElkOiB6LnN0cmluZygpLm1pbigxKSxcbiAgICAgIGFjdG9ySWQ6IHouc3RyaW5nKCkubWluKDEpLFxuICAgIH0pLFxuICApLFxuICBkZWYoXG4gICAgJ3Bvc3RfbWVzc2FnZScsXG4gICAgJ1Bvc3QgYSBjaGF0IG1lc3NhZ2UuIGBtZW50aW9uc2AgaXMgc3RydWN0dXJlZCBhY3RvciBpZHMgKFx1MDBBNzUuMiBcdTIwMTQgYm9keSB0ZXh0IGlzIG5ldmVyIHBhcnNlZCk7IG1lbnRpb25pbmcgYW4gYWdlbnQgcnVucyB0aGUgZGV0ZXJtaW5pc3RpYyBkZWZhdWx0LWRlbnkgcm91dGVyIChcdTAwQTc1LjQpLicsXG4gICAgei5vYmplY3Qoe1xuICAgICAgdGhyZWFkSWQ6IHouc3RyaW5nKCkubWluKDEpLFxuICAgICAgYm9keTogei5zdHJpbmcoKS5taW4oMSksXG4gICAgICByZXBseVRvOiB6LnN0cmluZygpLm1pbigxKS5vcHRpb25hbCgpLFxuICAgICAgbWVudGlvbnM6IHouYXJyYXkoei5zdHJpbmcoKS5taW4oMSkpLm9wdGlvbmFsKCksXG4gICAgfSksXG4gICksXG4gIGRlZihcbiAgICAnbGlzdF90aHJlYWRzJyxcbiAgICAnTGlzdCB0aHJlYWRzLCBvcHRpb25hbGx5IGZpbHRlcmVkIGJ5IGZlYXR1cmUgLyB3b3JrIGl0ZW0uIFByaXZhdGUgdGhyZWFkcyBhcmUgdmlzaWJsZSBvbmx5IHRvIHRoZWlyIHBhcnRpY2lwYW50cyAoY3R4IGFjdG9yKS4nLFxuICAgIHoub2JqZWN0KHtcbiAgICAgIGZlYXR1cmVJZDogei5zdHJpbmcoKS5taW4oMSkub3B0aW9uYWwoKSxcbiAgICAgIHdvcmtJdGVtSWQ6IHdvcmtJdGVtSWQub3B0aW9uYWwoKSxcbiAgICB9KSxcbiAgICB0cnVlLFxuICApLFxuICBkZWYoXG4gICAgJ2xpc3RfbWVzc2FnZXMnLFxuICAgICdMaXN0IG1lc3NhZ2VzIG9mIGEgdGhyZWFkIChvcHRpb25hbGx5IGFmdGVyIGEgc2VxKS4gUHJpdmF0ZSB0aHJlYWRzIHJlcXVpcmUgcGFydGljaXBhdGlvbiBcdTIwMTQgdGhlIHJlYWRlciBpcyBBTFdBWVMgdGhlIGN0eCBhY3Rvci4nLFxuICAgIHoub2JqZWN0KHtcbiAgICAgIHRocmVhZElkOiB6LnN0cmluZygpLm1pbigxKSxcbiAgICAgIHNpbmNlU2VxOiB6Lm51bWJlcigpLmludCgpLm5vbm5lZ2F0aXZlKCkub3B0aW9uYWwoKSxcbiAgICB9KSxcbiAgICB0cnVlLFxuICApLFxuICBkZWYoXG4gICAgJ2xpc3RfbWVudGlvbnMnLFxuICAgICdMaXN0IHRoZSByZWNvcmRlZCBtZW50aW9ucyBvZiBhIG1lc3NhZ2Ugd2l0aCB0aGVpciByb3V0ZXIgcmVzb2x1dGlvbnMgKG5vdGlmaWVkIHwgam9iX2NyZWF0ZWQgfCBkZW5pZWRfcG9saWN5IHwgZGVuaWVkX2RlcHRoKS4nLFxuICAgIHoub2JqZWN0KHsgbWVzc2FnZUlkOiB6LnN0cmluZygpLm1pbigxKSB9KSxcbiAgICB0cnVlLFxuICApLFxuICBkZWYoXG4gICAgJ2xpc3Rfbm90aWZpY2F0aW9ucycsXG4gICAgJ0xpc3QgdGhlIGN0eCBhY3Rvclx1MjAxOXMgT1dOIG5vdGlmaWNhdGlvbnMgKG1lbnRpb25zICsgam9iIGNvbXBsZXRpb25zKS4nLFxuICAgIHoub2JqZWN0KHsgdW5yZWFkT25seTogei5ib29sZWFuKCkub3B0aW9uYWwoKSB9KSxcbiAgICB0cnVlLFxuICApLFxuICBkZWYoXG4gICAgJ21hcmtfbm90aWZpY2F0aW9uX3JlYWQnLFxuICAgICdNYXJrIG9uZSBvZiB0aGUgY3R4IGFjdG9yXHUyMDE5cyBvd24gbm90aWZpY2F0aW9ucyBhcyByZWFkLicsXG4gICAgei5vYmplY3QoeyBub3RpZmljYXRpb25JZDogei5zdHJpbmcoKS5taW4oMSkgfSksXG4gICksXG4gIGRlZihcbiAgICAnbGlzdF9hZ2VudF9qb2JzJyxcbiAgICAnTGlzdCByb3V0ZXItbWF0ZXJpYWxpemVkIGFnZW50IGpvYnMgKHJlcGx5LW9ubHkgY29udGV4dCBcdTIwMTQgYSBqb2IgbmV2ZXIgY2FycmllcyBhIGNsYWltIG9yIGxpZmVjeWNsZSBhdXRob3JpdHksIFx1MDBBNzUuNCkuJyxcbiAgICB6Lm9iamVjdCh7XG4gICAgICBhZ2VudEFjdG9ySWQ6IHouc3RyaW5nKCkubWluKDEpLm9wdGlvbmFsKCksXG4gICAgICBzdGF0dXM6IHouZW51bShbJ3F1ZXVlZCcsICdkb25lJywgJ2Jsb2NrZWQnXSkub3B0aW9uYWwoKSxcbiAgICB9KSxcbiAgICB0cnVlLFxuICApLFxuICBkZWYoXG4gICAgJ2NvbXBsZXRlX2FnZW50X2pvYicsXG4gICAgJ0NvbXBsZXRlIGFuIGFnZW50IGpvYiAob25seSB0aGUgam9iXHUyMDE5cyBhZ2VudCBtYXkpLiBDb21wbGV0aW9uIG5vdGlmaWVzIHRoZSBtZW50aW9uZXIgXHUyMDE0IG5vdGhpbmcgZWxzZSBtb3Zlcy4nLFxuICAgIHoub2JqZWN0KHtcbiAgICAgIGpvYklkOiB6LnN0cmluZygpLm1pbigxKSxcbiAgICAgIHN0YXR1czogei5lbnVtKFsnZG9uZScsICdibG9ja2VkJ10pLFxuICAgICAgbm90ZTogei5zdHJpbmcoKS5vcHRpb25hbCgpLFxuICAgIH0pLFxuICApLFxuXG4gIC8vIC0tIHJlY29uY2lsaWF0aW9uIChyb2FkbWFwIFx1MDBBNzEuNiwgRDY6IGRldGVjdC1vbmx5KSAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICBkZWYoXG4gICAgJ3JlY29uY2lsZScsXG4gICAgJ0RldGVjdC1vbmx5IGRpdmVyZ2VuY2UgcmVwb3J0IGJldHdlZW4gZmlsZSBmcm9udG1hdHRlciBzdGF0dXNlcyBhbmQgREIgc3RhdGVzIChuZXZlciBtdXRhdGVzOyBsaXZlLWNsYWltZWQgaXRlbXMgYXJlIGV4Y2x1ZGVkKS4nLFxuICAgIHoub2JqZWN0KHtcbiAgICAgIGZpbGVzOiB6LmFycmF5KFxuICAgICAgICB6Lm9iamVjdCh7XG4gICAgICAgICAgd29ya0l0ZW1JZCxcbiAgICAgICAgICBmcm9udG1hdHRlclN0YXR1czogei5zdHJpbmcoKS5taW4oMSksXG4gICAgICAgIH0pLFxuICAgICAgKSxcbiAgICB9KSxcbiAgICB0cnVlLFxuICApLFxuXG4gIC8vIC0tIG9wcyAoc28gbm9ib2R5IGV2ZXIgbmVlZHMgdG8gdG91Y2ggdGhlIERCIGJ5IGhhbmQpIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIGRlZihcbiAgICAnZm9yY2VfcmVsZWFzZV9jbGFpbScsXG4gICAgJ09wczogZm9yY2UtcmVsZWFzZSB0aGUgbGl2ZSBjbGFpbSBvZiBhIHdvcmsgaXRlbSAoc3R1Y2sgcnVubmVyLCBsb3N0IG1hY2hpbmUpLicsXG4gICAgei5vYmplY3QoeyB3b3JrSXRlbUlkIH0pLFxuICApLFxuXG4gIC8vIC0tIHF1ZXJpZXMgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgZGVmKCdnZXRfd29ya19pdGVtJywgJ0ZldGNoIG9uZSB3b3JrIGl0ZW0gYnkgaWQgb3IgZXh0ZXJuYWxLZXkuJywgei5vYmplY3QoeyB3b3JrSXRlbUlkIH0pLCB0cnVlKSxcbiAgZGVmKCdnZXRfZmVhdHVyZScsICdGZXRjaCBvbmUgZmVhdHVyZS4nLCB6Lm9iamVjdCh7IGZlYXR1cmVJZDogei5zdHJpbmcoKS5taW4oMSkgfSksIHRydWUpLFxuICBkZWYoXG4gICAgJ2dldF90YXNrX2NvbnRleHQnLFxuICAgICdEaXNwYXRjaCBjb250ZXh0IGZvciBhIHJ1bm5lcjogZW50cnkgc3RhdGUgcm91dGluZyBwZXIgZGV2LWF1dG8uIFJlZnVzZXMgZG9uZSBpdGVtcyBhbmQgaGVsZCBmZWF0dXJlcy4nLFxuICAgIHoub2JqZWN0KHsgd29ya0l0ZW1JZCB9KSxcbiAgICB0cnVlLFxuICApLFxuICBkZWYoXG4gICAgJ2xpc3Rfd29ya19pdGVtcycsXG4gICAgJ0xpc3Qgd29yayBpdGVtcywgb3B0aW9uYWxseSBmaWx0ZXJlZCBieSBzdGF0ZSAvIGZlYXR1cmUgLyBjbGFpbWFiaWxpdHkuJyxcbiAgICB6Lm9iamVjdCh7XG4gICAgICBzdGF0ZTogei5lbnVtKFdPUktfSVRFTV9TVEFURVMpLm9wdGlvbmFsKCksXG4gICAgICBmZWF0dXJlSWQ6IHouc3RyaW5nKCkub3B0aW9uYWwoKSxcbiAgICAgIGNsYWltYWJsZTogei5ib29sZWFuKCkub3B0aW9uYWwoKS5kZXNjcmliZSgndHJ1ZSA9IG5vIGxpdmUgY2xhaW0gb24gdGhlIGl0ZW0nKSxcbiAgICB9KSxcbiAgICB0cnVlLFxuICApLFxuICBkZWYoXG4gICAgJ2luYm94JyxcbiAgICAnR2F0ZS1ob2xkZXIgaW5ib3g6IGl0ZW1zIGF3YWl0aW5nIGEgZ2F0ZSBkZWNpc2lvbiAoZHJhZnQrc3BlY19jaGVja3BvaW50IGF3YWl0aW5nIHNwZWMgYXBwcm92YWw7IGluX3JldmlldyBhd2FpdGluZyByZXZpZXcgZGVjaXNpb24pLicsXG4gICAgei5vYmplY3Qoe30pLFxuICAgIHRydWUsXG4gICksXG4gIGRlZihcbiAgICAncXVlcnlfZXZlbnRzJyxcbiAgICAnQXVkaXQgcXVlcnk6IHRoZSBhcHBlbmQtb25seSBldmVudCBsb2csIG9wdGlvbmFsbHkgc2NvcGVkIHRvIG9uZSBzdHJlYW0uJyxcbiAgICB6Lm9iamVjdCh7IHN0cmVhbUlkOiB6LnN0cmluZygpLm9wdGlvbmFsKCkgfSksXG4gICAgdHJ1ZSxcbiAgKSxcbiAgZGVmKCdnZXRfY2xhaW1zJywgJ0FsbCBjbGFpbXMgKGxpdmUgYW5kIHJlbGVhc2VkKSBvZiBhIHdvcmsgaXRlbS4nLCB6Lm9iamVjdCh7IHdvcmtJdGVtSWQgfSksIHRydWUpLFxuICBkZWYoJ3dob2FtaScsICdSZXNvbHZlIHRoZSBhdXRoZW50aWNhdGVkIGFjdG9yLicsIHoub2JqZWN0KHt9KSwgdHJ1ZSksXG5dIGFzIGNvbnN0O1xuXG5leHBvcnQgdHlwZSBDb21tYW5kTmFtZSA9ICh0eXBlb2YgQ09NTUFORFMpW251bWJlcl1bJ25hbWUnXTtcblxuZXhwb3J0IGNvbnN0IENPTU1BTkRfTUFQOiBSZWFkb25seU1hcDxzdHJpbmcsIENvbW1hbmREZWY+ID0gbmV3IE1hcChcbiAgQ09NTUFORFMubWFwKChjKSA9PiBbYy5uYW1lLCBjIGFzIENvbW1hbmREZWZdKSxcbik7XG5cbi8qKiBNQ1AgdG9vbCBuYW1lIGZvciBhIGNvbW1hbmQgKHVuaWZvcm0gcHJlZml4LCBEMTEgdm9jYWJ1bGFyeSkuICovXG5leHBvcnQgZnVuY3Rpb24gbWNwVG9vbE5hbWUoY29tbWFuZDogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIGBvYWhzXyR7Y29tbWFuZH1gO1xufVxuXG4vKiogSlNPTiBTY2hlbWEgZm9yIGEgY29tbWFuZCBpbnB1dCAoem9kIHY0IG5hdGl2ZSBlbWl0dGVyKSBcdTIwMTQgdXNlZCB2ZXJiYXRpbSBhcyB0aGUgTUNQIHRvb2wgaW5wdXRTY2hlbWEuICovXG5leHBvcnQgZnVuY3Rpb24gaW5wdXRKc29uU2NoZW1hKGNvbW1hbmQ6IHN0cmluZyk6IFJlY29yZDxzdHJpbmcsIHVua25vd24+IHtcbiAgY29uc3QgZGVmbiA9IENPTU1BTkRfTUFQLmdldChjb21tYW5kKTtcbiAgaWYgKCFkZWZuKSB0aHJvdyBuZXcgRXJyb3IoYHVua25vd24gY29tbWFuZDogJHtjb21tYW5kfWApO1xuICByZXR1cm4gei50b0pTT05TY2hlbWEoZGVmbi5pbnB1dCkgYXMgUmVjb3JkPHN0cmluZywgdW5rbm93bj47XG59XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gV2lyZSBlbnZlbG9wZVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbi8qKlxuICogRXZlcnkgcmVqZWN0aW9uIGNyb3NzZXMgdGhlIHdpcmUgYXMgYSBtYWNoaW5lLXJlYWRhYmxlIGVudmVsb3BlIGNhcnJ5aW5nXG4gKiB0aGUgY29yZSBlcnJvciBjbGFzcyBuYW1lIFx1MjAxNCBjbGllbnRzIHJldGhyb3cgdGhlIHByb3BlciBjbGFzcywgc28gZXJyb3JcbiAqIHNlbWFudGljcyBzdXJ2aXZlIHRoZSB0cmFuc3BvcnQgKDQwOSBmb3IgY29uZmxpY3RzLCA0MDMgZm9yIHBlcm1pc3Npb24sXG4gKiA0MjIgZm9yIGd1YXJkcy90cmFuc2l0aW9ucy92YWxpZGF0aW9uKS5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBFcnJvckVudmVsb3BlIHtcbiAgb2s6IGZhbHNlO1xuICBlcnJvcjoge1xuICAgIG5hbWU6XG4gICAgICB8ICdQZXJtaXNzaW9uRGVuaWVkRXJyb3InXG4gICAgICB8ICdHdWFyZEZhaWxlZEVycm9yJ1xuICAgICAgfCAnQ29uZmxpY3RFcnJvcidcbiAgICAgIHwgJ0ludmFsaWRUcmFuc2l0aW9uRXJyb3InXG4gICAgICB8ICdTdG9yaWVzVmFsaWRhdGlvbkVycm9yJ1xuICAgICAgfCAnRXJyb3InO1xuICAgIG1lc3NhZ2U6IHN0cmluZztcbiAgfTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBPa0VudmVsb3BlPFQgPSB1bmtub3duPiB7XG4gIG9rOiB0cnVlO1xuICByZXN1bHQ6IFQ7XG59XG5cbmV4cG9ydCB0eXBlIEVudmVsb3BlPFQgPSB1bmtub3duPiA9IE9rRW52ZWxvcGU8VD4gfCBFcnJvckVudmVsb3BlO1xuXG5leHBvcnQgY29uc3QgSFRUUF9TVEFUVVM6IFJlY29yZDxFcnJvckVudmVsb3BlWydlcnJvciddWyduYW1lJ10sIG51bWJlcj4gPSB7XG4gIFBlcm1pc3Npb25EZW5pZWRFcnJvcjogNDAzLFxuICBDb25mbGljdEVycm9yOiA0MDksXG4gIEd1YXJkRmFpbGVkRXJyb3I6IDQyMixcbiAgSW52YWxpZFRyYW5zaXRpb25FcnJvcjogNDIyLFxuICBTdG9yaWVzVmFsaWRhdGlvbkVycm9yOiA0MjIsXG4gIEVycm9yOiA1MDAsXG59O1xuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIENvbW1hbmQgYnVzIGNvbnRyYWN0IChpbXBsZW1lbnRlZCBpbiBhcHBzL3NwaW5lLWFwaSwgY29uc3VtZWQgYnkgYWRhcHRlcnMpXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuZXhwb3J0IGludGVyZmFjZSBBY3RvckNvbnRleHQge1xuICBhY3RvcklkOiBzdHJpbmc7XG4gIGlzQWRtaW46IGJvb2xlYW47XG59XG5cbi8qKlxuICogVGhlIG9uZSBwbGFjZSBjb21tYW5kcyBleGVjdXRlLiBIVFRQIGFuZCBNQ1AgYXJlIHRoaW4gcGFyc2VycyBpbiBmcm9udCBvZlxuICogdGhpczsgbm90aGluZyBlbHNlIHdyaXRlcyBzdGF0ZSAoXHUwMEE3MC4xIFwibm8gd3JpdGVzIG91dHNpZGUgdGhlIGNvbW1hbmQgYnVzXCIpLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIENvbW1hbmRCdXMge1xuICBleGVjdXRlKGNvbW1hbmQ6IHN0cmluZywgaW5wdXQ6IHVua25vd24sIGN0eDogQWN0b3JDb250ZXh0KTogUHJvbWlzZTx1bmtub3duPjtcbiAgcmVhZG9ubHkgZW5naW5lOiBTcGluZUVuZ2luZTtcbn1cblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBUeXBlZCBjbGllbnQgKHVzZWQgYnkgdGhlIG9haHMgQ0xJLCB0aGUgcnVubmVyLCBhbmQgdGVzdHMpXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuZXhwb3J0IGludGVyZmFjZSBDbGllbnRPcHRpb25zIHtcbiAgYmFzZVVybDogc3RyaW5nO1xuICB0b2tlbjogc3RyaW5nO1xuICBmZXRjaEltcGw/OiB0eXBlb2YgZmV0Y2g7XG59XG5cbmV4cG9ydCBjbGFzcyBPYWhzUmVtb3RlRXJyb3IgZXh0ZW5kcyBFcnJvciB7XG4gIGNvbnN0cnVjdG9yKFxuICAgIHB1YmxpYyByZWFkb25seSBlcnJvck5hbWU6IHN0cmluZyxcbiAgICBtZXNzYWdlOiBzdHJpbmcsXG4gICAgcHVibGljIHJlYWRvbmx5IHN0YXR1czogbnVtYmVyLFxuICApIHtcbiAgICBzdXBlcihtZXNzYWdlKTtcbiAgICB0aGlzLm5hbWUgPSBlcnJvck5hbWU7XG4gIH1cbn1cblxuZXhwb3J0IGludGVyZmFjZSBPYWhzQ2xpZW50IHtcbiAgY2FsbDxUID0gdW5rbm93bj4oY29tbWFuZDogQ29tbWFuZE5hbWUsIGlucHV0PzogdW5rbm93bik6IFByb21pc2U8VD47XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBtYWtlQ2xpZW50KG9wdGlvbnM6IENsaWVudE9wdGlvbnMpOiBPYWhzQ2xpZW50IHtcbiAgY29uc3QgZG9GZXRjaCA9IG9wdGlvbnMuZmV0Y2hJbXBsID8/IGZldGNoO1xuICByZXR1cm4ge1xuICAgIGFzeW5jIGNhbGw8VD4oY29tbWFuZDogQ29tbWFuZE5hbWUsIGlucHV0OiB1bmtub3duID0ge30pOiBQcm9taXNlPFQ+IHtcbiAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZG9GZXRjaChgJHtvcHRpb25zLmJhc2VVcmx9L3JwYy8ke2NvbW1hbmR9YCwge1xuICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgICdjb250ZW50LXR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXG4gICAgICAgICAgYXV0aG9yaXphdGlvbjogYEJlYXJlciAke29wdGlvbnMudG9rZW59YCxcbiAgICAgICAgfSxcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoaW5wdXQpLFxuICAgICAgfSk7XG4gICAgICBjb25zdCBlbnZlbG9wZSA9IChhd2FpdCByZXNwb25zZS5qc29uKCkpIGFzIEVudmVsb3BlPFQ+O1xuICAgICAgaWYgKGVudmVsb3BlLm9rKSByZXR1cm4gZW52ZWxvcGUucmVzdWx0O1xuICAgICAgdGhyb3cgbmV3IE9haHNSZW1vdGVFcnJvcihlbnZlbG9wZS5lcnJvci5uYW1lLCBlbnZlbG9wZS5lcnJvci5tZXNzYWdlLCByZXNwb25zZS5zdGF0dXMpO1xuICAgIH0sXG4gIH07XG59XG4iLCAiLyoqXG4gKiBHYXRlLWhvbGRlciBjb21tYW5kIGltcGxlbWVudGF0aW9ucyBcdTIwMTQgcHVyZSBmdW5jdGlvbnMgb3ZlciB0aGUgdHlwZWRcbiAqIGNvbnRyYWN0cyBjbGllbnQ6IChjbGllbnQsIG9wdHMpIFx1MjE5MiBvdXRwdXQgdGV4dC4gY2xpLnRzIG9ubHkgd2lyZXNcbiAqIGNvbW1hbmRlciBvbnRvIHRoZXNlOyB0ZXN0cyBjYWxsIHRoZW0gZGlyZWN0bHkgYWdhaW5zdCBhbiBpbi1wcm9jZXNzXG4gKiBzcGluZS1hcGkuIEV2ZXJ5IG11dGF0aW9uIGdvZXMgdGhyb3VnaCAvcnBjLzxjb21tYW5kPiwgbmV2ZXIgYXJvdW5kIGl0LlxuICovXG5pbXBvcnQgeyByZWFkRmlsZVN5bmMgfSBmcm9tICdub2RlOmZzJztcbmltcG9ydCB7IHJlc29sdmUgfSBmcm9tICdub2RlOnBhdGgnO1xuXG5pbXBvcnQgdHlwZSB7IE9haHNDbGllbnQgfSBmcm9tICdAb2Focy9jb250cmFjdHMnO1xuaW1wb3J0IHsgbGludERvYyB9IGZyb20gJ0BvYWhzL3J1bm5lcic7XG5pbXBvcnQge1xuICBXT1JLX0lURU1fS0lORFMsXG4gIFdPUktfSVRFTV9TVEFURVMsXG4gIHR5cGUgQWN0b3IsXG4gIHR5cGUgQXV0aHpFeHBsYW5hdGlvbixcbiAgdHlwZSBGZWF0dXJlLFxuICB0eXBlIEdhdGVDb2RlLFxuICB0eXBlIEdvdmVybmFuY2VSb2xlLFxuICB0eXBlIFBsYW5Db2RlLFxuICB0eXBlIFJvbGVBc3NpZ25tZW50LFxuICB0eXBlIFNwaW5lRXZlbnQsXG4gIHR5cGUgU3Rvcmllc0ltcG9ydFJlc3VsdCxcbiAgdHlwZSBXb3JrSXRlbSxcbiAgdHlwZSBXb3Jrc3BhY2VQb2xpY3ksXG59IGZyb20gJ0BvYWhzL2NvcmUnO1xuXG5pbXBvcnQgeyByZW5kZXJUYWJsZSwgdHlwZSBDZWxsIH0gZnJvbSAnLi4vZm9ybWF0LmpzJztcblxuLy8gUGhhc2UgMyBjb2xsYWJvcmF0aW9uICsgYWR2aXNvciBib3RzIChyb2FkbWFwIFx1MDBBNzUpIGxpdmUgaW4gY29sbGFiLnRzLlxuZXhwb3J0ICogZnJvbSAnLi9jb2xsYWIuanMnO1xuXG5leHBvcnQgY29uc3QgR0FURVMgPSBbJ3NwZWNfYXBwcm92YWwnLCAncmV2aWV3X2FwcHJvdmFsJ10gYXMgY29uc3Q7XG5cbmZ1bmN0aW9uIGFzc2VydEdhdGUoZ2F0ZTogc3RyaW5nKTogYXNzZXJ0cyBnYXRlIGlzIEdhdGVDb2RlIHtcbiAgaWYgKCEoR0FURVMgYXMgcmVhZG9ubHkgc3RyaW5nW10pLmluY2x1ZGVzKGdhdGUpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBpbnZhbGlkIC0tZ2F0ZSBcIiR7Z2F0ZX1cIiAoZXhwZWN0ZWQgJHtHQVRFUy5qb2luKCcgfCAnKX0pYCk7XG4gIH1cbn1cblxuY29uc3QgV09SS19JVEVNX0hFQURFUlMgPSBbJ2lkJywgJ2V4dGVybmFsS2V5JywgJ3RpdGxlJywgJ3N0YXRlJywgJ2Jsb2NrZWRSZWFzb24nXTtcblxuZnVuY3Rpb24gd29ya0l0ZW1Sb3coaXRlbTogV29ya0l0ZW0pOiBDZWxsW10ge1xuICByZXR1cm4gW2l0ZW0uaWQsIGl0ZW0uZXh0ZXJuYWxLZXksIGl0ZW0udGl0bGUsIGl0ZW0uc3RhdGUsIGl0ZW0uYmxvY2tlZFJlYXNvbl07XG59XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gaW5ib3hcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gaW5ib3hDb21tYW5kKGNsaWVudDogT2Foc0NsaWVudCk6IFByb21pc2U8c3RyaW5nPiB7XG4gIGNvbnN0IHsgYXdhaXRpbmdTcGVjLCBhd2FpdGluZ1JldmlldyB9ID0gYXdhaXQgY2xpZW50LmNhbGw8e1xuICAgIGF3YWl0aW5nU3BlYzogV29ya0l0ZW1bXTtcbiAgICBhd2FpdGluZ1JldmlldzogV29ya0l0ZW1bXTtcbiAgfT4oJ2luYm94Jyk7XG4gIHJldHVybiBbXG4gICAgJ2F3YWl0aW5nIHNwZWMgYXBwcm92YWw6JyxcbiAgICByZW5kZXJUYWJsZShXT1JLX0lURU1fSEVBREVSUywgYXdhaXRpbmdTcGVjLm1hcCh3b3JrSXRlbVJvdykpLFxuICAgICcnLFxuICAgICdhd2FpdGluZyByZXZpZXcgZGVjaXNpb246JyxcbiAgICByZW5kZXJUYWJsZShXT1JLX0lURU1fSEVBREVSUywgYXdhaXRpbmdSZXZpZXcubWFwKHdvcmtJdGVtUm93KSksXG4gIF0uam9pbignXFxuJyk7XG59XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gYXBwcm92ZSAvIHJlamVjdFxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbmV4cG9ydCBpbnRlcmZhY2UgQXBwcm92ZU9wdGlvbnMge1xuICB3b3JrSXRlbUlkOiBzdHJpbmc7XG4gIGdhdGU6IHN0cmluZztcbiAgLyoqIHNwZWNfYXBwcm92YWwgb25seTogdmVyaWZpY2F0aW9uIGNvbW1hbmRzIHRvIHBpbiAocm9hZG1hcCBENykuICovXG4gIHBpbj86IHN0cmluZ1tdO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gYXBwcm92ZUNvbW1hbmQoY2xpZW50OiBPYWhzQ2xpZW50LCBvcHRzOiBBcHByb3ZlT3B0aW9ucyk6IFByb21pc2U8c3RyaW5nPiB7XG4gIGFzc2VydEdhdGUob3B0cy5nYXRlKTtcbiAgY29uc3QgaXRlbSA9IGF3YWl0IGNsaWVudC5jYWxsPFdvcmtJdGVtPignYXBwcm92ZV9nYXRlJywge1xuICAgIHdvcmtJdGVtSWQ6IG9wdHMud29ya0l0ZW1JZCxcbiAgICBnYXRlOiBvcHRzLmdhdGUsXG4gICAgLi4uKG9wdHMucGluICE9PSB1bmRlZmluZWQgJiYgb3B0cy5waW4ubGVuZ3RoID4gMCA/IHsgcGlubmVkVmVyaWZpY2F0aW9uOiBvcHRzLnBpbiB9IDoge30pLFxuICB9KTtcbiAgY29uc3QgbGluZXMgPSBbXG4gICAgYGFwcHJvdmVkICR7b3B0cy5nYXRlfSBvbiAke2l0ZW0uZXh0ZXJuYWxLZXl9ICgke2l0ZW0uaWR9KWAsXG4gICAgYHN0YXRlOiAke2l0ZW0uc3RhdGV9YCxcbiAgXTtcbiAgaWYgKGl0ZW0ucGlubmVkVmVyaWZpY2F0aW9uICE9PSBudWxsICYmIGl0ZW0ucGlubmVkVmVyaWZpY2F0aW9uLmxlbmd0aCA+IDApIHtcbiAgICBsaW5lcy5wdXNoKGBwaW5uZWQgdmVyaWZpY2F0aW9uOiAke2l0ZW0ucGlubmVkVmVyaWZpY2F0aW9uLmpvaW4oJyAmJiAnKX1gKTtcbiAgfVxuICByZXR1cm4gbGluZXMuam9pbignXFxuJyk7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQWR2YW5jZU9wdGlvbnMge1xuICB3b3JrSXRlbUlkOiBzdHJpbmc7XG4gIHRvOiBzdHJpbmc7XG4gIGZlbmNpbmdUb2tlbj86IG51bWJlcjtcbn1cblxuLyoqXG4gKiBQbGFubmluZy16b25lIGFkdmFuY2VzIGZvciBodW1hbnMgKGJhY2tsb2dcdTIxOTJkcmFmdCB3aGVuIHRoZSBQTyBzdGFydHNcbiAqIGRyYWZ0aW5nLCBkcmFmdFx1MjE5MnJlYWR5X2Zvcl9kZXYgb24gbm9uLWNoZWNrcG9pbnQgaXRlbXMpLiBFeGVjdXRpb24tem9uZVxuICogdHJhbnNpdGlvbnMgYmVsb25nIHRvIHRoZSBydW5uZXIsIHdoaWNoIGhvbGRzIHRoZSBjbGFpbS5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGFkdmFuY2VDb21tYW5kKGNsaWVudDogT2Foc0NsaWVudCwgb3B0czogQWR2YW5jZU9wdGlvbnMpOiBQcm9taXNlPHN0cmluZz4ge1xuICBjb25zdCBpdGVtID0gYXdhaXQgY2xpZW50LmNhbGw8V29ya0l0ZW0+KCdhZHZhbmNlX3N0YXRlJywge1xuICAgIHdvcmtJdGVtSWQ6IG9wdHMud29ya0l0ZW1JZCxcbiAgICB0bzogb3B0cy50byxcbiAgICAuLi4ob3B0cy5mZW5jaW5nVG9rZW4gIT09IHVuZGVmaW5lZCA/IHsgZmVuY2luZ1Rva2VuOiBvcHRzLmZlbmNpbmdUb2tlbiB9IDoge30pLFxuICB9KTtcbiAgcmV0dXJuIGBhZHZhbmNlZCAke2l0ZW0uZXh0ZXJuYWxLZXl9ICgke2l0ZW0uaWR9KVxcbnN0YXRlOiAke2l0ZW0uc3RhdGV9YDtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBSZWplY3RPcHRpb25zIHtcbiAgd29ya0l0ZW1JZDogc3RyaW5nO1xuICBnYXRlOiBzdHJpbmc7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZWplY3RDb21tYW5kKGNsaWVudDogT2Foc0NsaWVudCwgb3B0czogUmVqZWN0T3B0aW9ucyk6IFByb21pc2U8c3RyaW5nPiB7XG4gIGFzc2VydEdhdGUob3B0cy5nYXRlKTtcbiAgY29uc3QgaXRlbSA9IGF3YWl0IGNsaWVudC5jYWxsPFdvcmtJdGVtPigncmVqZWN0X2dhdGUnLCB7XG4gICAgd29ya0l0ZW1JZDogb3B0cy53b3JrSXRlbUlkLFxuICAgIGdhdGU6IG9wdHMuZ2F0ZSxcbiAgfSk7XG4gIHJldHVybiBbXG4gICAgYHJlamVjdGVkICR7b3B0cy5nYXRlfSBvbiAke2l0ZW0uZXh0ZXJuYWxLZXl9ICgke2l0ZW0uaWR9KWAsXG4gICAgYHN0YXRlOiAke2l0ZW0uc3RhdGV9YCxcbiAgICBgYmxvY2tlZFJlYXNvbjogJHtpdGVtLmJsb2NrZWRSZWFzb24gPz8gJy0nfWAsXG4gICAgYHJldmlld0xvb3BJdGVyYXRpb246ICR7aXRlbS5yZXZpZXdMb29wSXRlcmF0aW9ufWAsXG4gIF0uam9pbignXFxuJyk7XG59XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gc3RhdHVzXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHN0YXR1c0NvbW1hbmQoY2xpZW50OiBPYWhzQ2xpZW50KTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgY29uc3QgaXRlbXMgPSBhd2FpdCBjbGllbnQuY2FsbDxXb3JrSXRlbVtdPignbGlzdF93b3JrX2l0ZW1zJyk7XG4gIGNvbnN0IHJhbmsgPSBuZXcgTWFwPHN0cmluZywgbnVtYmVyPihXT1JLX0lURU1fU1RBVEVTLm1hcCgocywgaSkgPT4gW3MsIGldKSk7XG4gIGNvbnN0IHNvcnRlZCA9IFsuLi5pdGVtc10uc29ydChcbiAgICAoYSwgYikgPT5cbiAgICAgIChyYW5rLmdldChhLnN0YXRlKSA/PyAwKSAtIChyYW5rLmdldChiLnN0YXRlKSA/PyAwKSB8fFxuICAgICAgYS5leHRlcm5hbEtleS5sb2NhbGVDb21wYXJlKGIuZXh0ZXJuYWxLZXkpLFxuICApO1xuICBjb25zdCBmZWF0dXJlSWRzID0gWy4uLm5ldyBTZXQoaXRlbXMubWFwKChpdGVtKSA9PiBpdGVtLmZlYXR1cmVJZCkpXTtcbiAgY29uc3QgZmVhdHVyZXM6IEZlYXR1cmVbXSA9IFtdO1xuICBmb3IgKGNvbnN0IGZlYXR1cmVJZCBvZiBmZWF0dXJlSWRzKSB7XG4gICAgZmVhdHVyZXMucHVzaChhd2FpdCBjbGllbnQuY2FsbDxGZWF0dXJlPignZ2V0X2ZlYXR1cmUnLCB7IGZlYXR1cmVJZCB9KSk7XG4gIH1cbiAgcmV0dXJuIFtcbiAgICAnd29yayBpdGVtczonLFxuICAgIHJlbmRlclRhYmxlKFxuICAgICAgWydzdGF0ZScsICdpZCcsICdleHRlcm5hbEtleScsICd0aXRsZScsICdibG9ja2VkUmVhc29uJ10sXG4gICAgICBzb3J0ZWQubWFwKChpdGVtKSA9PiBbaXRlbS5zdGF0ZSwgaXRlbS5pZCwgaXRlbS5leHRlcm5hbEtleSwgaXRlbS50aXRsZSwgaXRlbS5ibG9ja2VkUmVhc29uXSksXG4gICAgKSxcbiAgICAnJyxcbiAgICAnZmVhdHVyZXM6JyxcbiAgICByZW5kZXJUYWJsZShcbiAgICAgIFsnaWQnLCAnc3RhdGUnLCAnZGlzcGF0Y2hIb2xkJ10sXG4gICAgICBmZWF0dXJlcy5tYXAoKGZlYXR1cmUpID0+IFtmZWF0dXJlLmlkLCBmZWF0dXJlLnN0YXRlLCBmZWF0dXJlLmRpc3BhdGNoSG9sZF0pLFxuICAgICksXG4gIF0uam9pbignXFxuJyk7XG59XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gYWN0b3IgLyBncmFudFxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbmV4cG9ydCBpbnRlcmZhY2UgQWN0b3JDcmVhdGVPcHRpb25zIHtcbiAgdHlwZTogc3RyaW5nO1xuICBuYW1lOiBzdHJpbmc7XG4gIC8qKiBQaGFzZSAyIChyb2FkbWFwIFx1MDBBNzMpOiBpbml0aWFsIGdvdmVybmFuY2Ugcm9sZSBcdTIwMTQgYWRtaW4gY29udGV4dCBvbmx5LiAqL1xuICBnb3Zlcm5hbmNlUm9sZT86IHN0cmluZztcbn1cblxuY29uc3QgR09WRVJOQU5DRV9ST0xFUyA9IFsnYWRtaW4nLCAnbWVtYmVyJywgJ2F1ZGl0b3InXSBhcyBjb25zdDtcblxuZnVuY3Rpb24gYXNzZXJ0R292ZXJuYW5jZVJvbGUocm9sZTogc3RyaW5nKTogYXNzZXJ0cyByb2xlIGlzIEdvdmVybmFuY2VSb2xlIHtcbiAgaWYgKCEoR09WRVJOQU5DRV9ST0xFUyBhcyByZWFkb25seSBzdHJpbmdbXSkuaW5jbHVkZXMocm9sZSkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYGludmFsaWQgZ292ZXJuYW5jZSByb2xlIFwiJHtyb2xlfVwiIChleHBlY3RlZCAke0dPVkVSTkFOQ0VfUk9MRVMuam9pbignIHwgJyl9KWApO1xuICB9XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBhY3RvckNyZWF0ZUNvbW1hbmQoXG4gIGNsaWVudDogT2Foc0NsaWVudCxcbiAgb3B0czogQWN0b3JDcmVhdGVPcHRpb25zLFxuKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgaWYgKG9wdHMudHlwZSAhPT0gJ3VzZXInICYmIG9wdHMudHlwZSAhPT0gJ2FnZW50Jykge1xuICAgIHRocm93IG5ldyBFcnJvcihgaW52YWxpZCAtLXR5cGUgXCIke29wdHMudHlwZX1cIiAoZXhwZWN0ZWQgdXNlciB8IGFnZW50KWApO1xuICB9XG4gIGlmIChvcHRzLmdvdmVybmFuY2VSb2xlICE9PSB1bmRlZmluZWQpIGFzc2VydEdvdmVybmFuY2VSb2xlKG9wdHMuZ292ZXJuYW5jZVJvbGUpO1xuICBjb25zdCBjcmVhdGVkID0gYXdhaXQgY2xpZW50LmNhbGw8eyBhY3RvcjogQWN0b3I7IHRva2VuOiBzdHJpbmcgfT4oJ2NyZWF0ZV9hY3RvcicsIHtcbiAgICB0eXBlOiBvcHRzLnR5cGUsXG4gICAgZGlzcGxheU5hbWU6IG9wdHMubmFtZSxcbiAgICAuLi4ob3B0cy5nb3Zlcm5hbmNlUm9sZSAhPT0gdW5kZWZpbmVkID8geyBnb3Zlcm5hbmNlUm9sZTogb3B0cy5nb3Zlcm5hbmNlUm9sZSB9IDoge30pLFxuICB9KTtcbiAgcmV0dXJuIFtcbiAgICBgYWN0b3JJZDogJHtjcmVhdGVkLmFjdG9yLmlkfWAsXG4gICAgYHR5cGU6ICR7Y3JlYXRlZC5hY3Rvci50eXBlfWAsXG4gICAgYGRpc3BsYXlOYW1lOiAke2NyZWF0ZWQuYWN0b3IuZGlzcGxheU5hbWV9YCxcbiAgICBgdG9rZW46ICR7Y3JlYXRlZC50b2tlbn1gLFxuICBdLmpvaW4oJ1xcbicpO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEdyYW50T3B0aW9ucyB7XG4gIGFjdG9ySWQ6IHN0cmluZztcbiAgcGVybWlzc2lvbjogc3RyaW5nO1xuICBzY29wZT86IHN0cmluZztcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdyYW50Q29tbWFuZChjbGllbnQ6IE9haHNDbGllbnQsIG9wdHM6IEdyYW50T3B0aW9ucyk6IFByb21pc2U8c3RyaW5nPiB7XG4gIGF3YWl0IGNsaWVudC5jYWxsKCdncmFudF9wZXJtaXNzaW9uJywge1xuICAgIGFjdG9ySWQ6IG9wdHMuYWN0b3JJZCxcbiAgICBwZXJtaXNzaW9uOiBvcHRzLnBlcm1pc3Npb24sXG4gICAgLi4uKG9wdHMuc2NvcGUgIT09IHVuZGVmaW5lZCA/IHsgc2NvcGU6IG9wdHMuc2NvcGUgfSA6IHt9KSxcbiAgfSk7XG4gIHJldHVybiBgZ3JhbnRlZCAke29wdHMucGVybWlzc2lvbn0gdG8gJHtvcHRzLmFjdG9ySWR9YDtcbn1cblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBmZWF0dXJlIC8gaW1wb3J0XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGZlYXR1cmVDcmVhdGVDb21tYW5kKGNsaWVudDogT2Foc0NsaWVudCk6IFByb21pc2U8c3RyaW5nPiB7XG4gIGNvbnN0IGZlYXR1cmUgPSBhd2FpdCBjbGllbnQuY2FsbDxGZWF0dXJlPignY3JlYXRlX2ZlYXR1cmUnKTtcbiAgcmV0dXJuIFtgZmVhdHVyZUlkOiAke2ZlYXR1cmUuaWR9YCwgYHN0YXRlOiAke2ZlYXR1cmUuc3RhdGV9YF0uam9pbignXFxuJyk7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgSW1wb3J0U3Rvcmllc09wdGlvbnMge1xuICBmZWF0dXJlSWQ6IHN0cmluZztcbiAgcGF0aDogc3RyaW5nO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gaW1wb3J0U3Rvcmllc0NvbW1hbmQoXG4gIGNsaWVudDogT2Foc0NsaWVudCxcbiAgb3B0czogSW1wb3J0U3Rvcmllc09wdGlvbnMsXG4pOiBQcm9taXNlPHN0cmluZz4ge1xuICBjb25zdCB5YW1sID0gcmVhZEZpbGVTeW5jKHJlc29sdmUob3B0cy5wYXRoKSwgJ3V0ZjgnKTtcbiAgY29uc3QgcmVzdWx0ID0gYXdhaXQgY2xpZW50LmNhbGw8U3Rvcmllc0ltcG9ydFJlc3VsdD4oJ2ltcG9ydF9zdG9yaWVzJywge1xuICAgIGZlYXR1cmVJZDogb3B0cy5mZWF0dXJlSWQsXG4gICAgeWFtbCxcbiAgfSk7XG4gIGNvbnN0IGxpc3QgPSAodmFsdWVzOiBzdHJpbmdbXSk6IHN0cmluZyA9PiAodmFsdWVzLmxlbmd0aCA+IDAgPyB2YWx1ZXMuam9pbignLCAnKSA6ICcobm9uZSknKTtcbiAgcmV0dXJuIFtcbiAgICBgaW1wb3J0ZWQ6ICR7bGlzdChyZXN1bHQuaW1wb3J0ZWQpfWAsXG4gICAgYHVwZGF0ZWQ6ICR7bGlzdChyZXN1bHQudXBkYXRlZCl9YCxcbiAgICBgd2FybmluZ3M6ICR7bGlzdChyZXN1bHQud2FybmluZ3MpfWAsXG4gIF0uam9pbignXFxuJyk7XG59XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gZXZlbnRzXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuZXhwb3J0IGludGVyZmFjZSBFdmVudHNPcHRpb25zIHtcbiAgc3RyZWFtSWQ/OiBzdHJpbmc7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBldmVudHNDb21tYW5kKFxuICBjbGllbnQ6IE9haHNDbGllbnQsXG4gIG9wdHM6IEV2ZW50c09wdGlvbnMgPSB7fSxcbik6IFByb21pc2U8c3RyaW5nPiB7XG4gIGNvbnN0IGV2ZW50cyA9IGF3YWl0IGNsaWVudC5jYWxsPFNwaW5lRXZlbnRbXT4oXG4gICAgJ3F1ZXJ5X2V2ZW50cycsXG4gICAgb3B0cy5zdHJlYW1JZCAhPT0gdW5kZWZpbmVkID8geyBzdHJlYW1JZDogb3B0cy5zdHJlYW1JZCB9IDoge30sXG4gICk7XG4gIHJldHVybiByZW5kZXJUYWJsZShcbiAgICBbJ3NlcScsICd0eXBlJywgJ3N0cmVhbScsICdhY3RvciddLFxuICAgIGV2ZW50cy5tYXAoKGV2ZW50KSA9PiBbXG4gICAgICBldmVudC5nbG9iYWxTZXEsXG4gICAgICBldmVudC50eXBlLFxuICAgICAgYCR7ZXZlbnQuc3RyZWFtVHlwZX0vJHtldmVudC5zdHJlYW1JZH0jJHtldmVudC5zdHJlYW1TZXF9YCxcbiAgICAgIGV2ZW50LmFjdG9ySWQsXG4gICAgXSksXG4gICk7XG59XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gZW50aXRsZW1lbnRzIChQaGFzZSAyLCByb2FkbWFwIFx1MDBBNzMpIFx1MjAxNCByb2xlIC8gcGxhbiAvIHBvbGljeSAvIGdvdmVybmFuY2UgLyBhdXRoelxuLy8gQXV0aG9yaXR5IGZvciB0aGVzZSB3cml0ZXMgaXMgZGVjaWRlZCBieSB0aGUgRU5HSU5FIGZyb20gdGhlIGNhbGxlcidzXG4vLyBnb3Zlcm5hbmNlIHJvbGU7IHRoZSBDTEkgb25seSB2YWxpZGF0ZXMgc2hhcGVzIGxvY2FsbHkuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuZXhwb3J0IGludGVyZmFjZSBSb2xlT3B0aW9ucyB7XG4gIGFjdG9ySWQ6IHN0cmluZztcbiAgcm9sZUNvZGU6IHN0cmluZztcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJvbGVBc3NpZ25Db21tYW5kKGNsaWVudDogT2Foc0NsaWVudCwgb3B0czogUm9sZU9wdGlvbnMpOiBQcm9taXNlPHN0cmluZz4ge1xuICBhd2FpdCBjbGllbnQuY2FsbCgnYXNzaWduX3JvbGUnLCB7IGFjdG9ySWQ6IG9wdHMuYWN0b3JJZCwgcm9sZUNvZGU6IG9wdHMucm9sZUNvZGUgfSk7XG4gIHJldHVybiBgYXNzaWduZWQgcm9sZSAke29wdHMucm9sZUNvZGV9IHRvICR7b3B0cy5hY3RvcklkfWA7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByb2xlUmV2b2tlQ29tbWFuZChjbGllbnQ6IE9haHNDbGllbnQsIG9wdHM6IFJvbGVPcHRpb25zKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgYXdhaXQgY2xpZW50LmNhbGwoJ3Jldm9rZV9yb2xlJywgeyBhY3RvcklkOiBvcHRzLmFjdG9ySWQsIHJvbGVDb2RlOiBvcHRzLnJvbGVDb2RlIH0pO1xuICByZXR1cm4gYHJldm9rZWQgcm9sZSAke29wdHMucm9sZUNvZGV9IGZyb20gJHtvcHRzLmFjdG9ySWR9YDtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBSb2xlTGlzdE9wdGlvbnMge1xuICBhY3RvcklkPzogc3RyaW5nO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcm9sZUxpc3RDb21tYW5kKFxuICBjbGllbnQ6IE9haHNDbGllbnQsXG4gIG9wdHM6IFJvbGVMaXN0T3B0aW9ucyA9IHt9LFxuKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgY29uc3QgYXNzaWdubWVudHMgPSBhd2FpdCBjbGllbnQuY2FsbDxSb2xlQXNzaWdubWVudFtdPihcbiAgICAnbGlzdF9yb2xlX2Fzc2lnbm1lbnRzJyxcbiAgICBvcHRzLmFjdG9ySWQgIT09IHVuZGVmaW5lZCA/IHsgYWN0b3JJZDogb3B0cy5hY3RvcklkIH0gOiB7fSxcbiAgKTtcbiAgcmV0dXJuIHJlbmRlclRhYmxlKFxuICAgIFsnYWN0b3JJZCcsICdyb2xlQ29kZScsICdncmFudGVkQnknLCAncmV2b2tlZCddLFxuICAgIGFzc2lnbm1lbnRzLm1hcCgoYSkgPT4gW2EuYWN0b3JJZCwgYS5yb2xlQ29kZSwgYS5ncmFudGVkQnksIGEucmV2b2tlZF0pLFxuICApO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFBsYW5TZXRPcHRpb25zIHtcbiAgcGxhbjogc3RyaW5nO1xufVxuXG5jb25zdCBQTEFOUyA9IFsnZnJlZScsICd0ZWFtJywgJ2VudGVycHJpc2UnXSBhcyBjb25zdDtcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHBsYW5TZXRDb21tYW5kKGNsaWVudDogT2Foc0NsaWVudCwgb3B0czogUGxhblNldE9wdGlvbnMpOiBQcm9taXNlPHN0cmluZz4ge1xuICBpZiAoIShQTEFOUyBhcyByZWFkb25seSBzdHJpbmdbXSkuaW5jbHVkZXMob3B0cy5wbGFuKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihgaW52YWxpZCBwbGFuIFwiJHtvcHRzLnBsYW59XCIgKGV4cGVjdGVkICR7UExBTlMuam9pbignIHwgJyl9KWApO1xuICB9XG4gIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGNsaWVudC5jYWxsPHsgcGxhbjogUGxhbkNvZGUgfT4oJ3NldF9wbGFuJywgeyBwbGFuOiBvcHRzLnBsYW4gfSk7XG4gIHJldHVybiBgcGxhbiBzZXQ6ICR7cmVzdWx0LnBsYW59IChhIGNlaWxpbmcgZm9yIGFnZW50IGdyYW50cyBcdTIwMTQgbmV2ZXIgYSBncmFudCBpdHNlbGYpYDtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBQb2xpY3lTZXRPcHRpb25zIHtcbiAgLyoqICd0cnVlJyB8ICdmYWxzZScgXHUyMDE0IHJlc3RyaWN0LW9ubHkga2V5IChyb2FkbWFwIFx1MDBBNzMpLiAqL1xuICBhZ2VudEdhdGVBcHByb3ZhbHM/OiBzdHJpbmc7XG4gIC8qKiAndHJ1ZScgfCAnZmFsc2UnIFx1MjAxNCByZXN0cmljdC1vbmx5IGtleSAocm9hZG1hcCBcdTAwQTczKS4gKi9cbiAgYWdlbnRTZWxmRGlzcGF0Y2g/OiBzdHJpbmc7XG59XG5cbmZ1bmN0aW9uIHBhcnNlQm9vbEZsYWcoZmxhZzogc3RyaW5nLCB2YWx1ZTogc3RyaW5nKTogYm9vbGVhbiB7XG4gIGlmICh2YWx1ZSA9PT0gJ3RydWUnKSByZXR1cm4gdHJ1ZTtcbiAgaWYgKHZhbHVlID09PSAnZmFsc2UnKSByZXR1cm4gZmFsc2U7XG4gIHRocm93IG5ldyBFcnJvcihgaW52YWxpZCAke2ZsYWd9IFwiJHt2YWx1ZX1cIiAoZXhwZWN0ZWQgdHJ1ZSB8IGZhbHNlKWApO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcG9saWN5U2V0Q29tbWFuZChjbGllbnQ6IE9haHNDbGllbnQsIG9wdHM6IFBvbGljeVNldE9wdGlvbnMpOiBQcm9taXNlPHN0cmluZz4ge1xuICBjb25zdCBwb2xpY3k6IFdvcmtzcGFjZVBvbGljeSA9IHtcbiAgICAuLi4ob3B0cy5hZ2VudEdhdGVBcHByb3ZhbHMgIT09IHVuZGVmaW5lZFxuICAgICAgPyB7IGFnZW50R2F0ZUFwcHJvdmFsczogcGFyc2VCb29sRmxhZygnLS1hZ2VudC1nYXRlLWFwcHJvdmFscycsIG9wdHMuYWdlbnRHYXRlQXBwcm92YWxzKSB9XG4gICAgICA6IHt9KSxcbiAgICAuLi4ob3B0cy5hZ2VudFNlbGZEaXNwYXRjaCAhPT0gdW5kZWZpbmVkXG4gICAgICA/IHsgYWdlbnRTZWxmRGlzcGF0Y2g6IHBhcnNlQm9vbEZsYWcoJy0tYWdlbnQtc2VsZi1kaXNwYXRjaCcsIG9wdHMuYWdlbnRTZWxmRGlzcGF0Y2gpIH1cbiAgICAgIDoge30pLFxuICB9O1xuICBpZiAoT2JqZWN0LmtleXMocG9saWN5KS5sZW5ndGggPT09IDApIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ25vdGhpbmcgdG8gc2V0OiBwYXNzIC0tYWdlbnQtZ2F0ZS1hcHByb3ZhbHMgYW5kL29yIC0tYWdlbnQtc2VsZi1kaXNwYXRjaCcpO1xuICB9XG4gIGNvbnN0IGVmZmVjdGl2ZSA9IGF3YWl0IGNsaWVudC5jYWxsPFdvcmtzcGFjZVBvbGljeT4oJ3NldF93b3Jrc3BhY2VfcG9saWN5JywgeyBwb2xpY3kgfSk7XG4gIHJldHVybiBbXG4gICAgJ3dvcmtzcGFjZSBwb2xpY3kgKHJlc3RyaWN0LW9ubHkgXHUyMDE0IG5hcnJvd3MgdGhlIHBsYW4sIG5ldmVyIHdpZGVucyBpdCk6JyxcbiAgICBgICBhZ2VudEdhdGVBcHByb3ZhbHM6ICR7ZWZmZWN0aXZlLmFnZW50R2F0ZUFwcHJvdmFscyA/PyAnKHVuc2V0KSd9YCxcbiAgICBgICBhZ2VudFNlbGZEaXNwYXRjaDogJHtlZmZlY3RpdmUuYWdlbnRTZWxmRGlzcGF0Y2ggPz8gJyh1bnNldCknfWAsXG4gIF0uam9pbignXFxuJyk7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgR2F0ZVBvbGljeVNldE9wdGlvbnMge1xuICBnYXRlOiBzdHJpbmc7XG4gIG1pbkFwcHJvdmFscz86IHN0cmluZztcbiAgcmVxdWlyZVR5cGVzPzogc3RyaW5nW107XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnYXRlUG9saWN5U2V0Q29tbWFuZChcbiAgY2xpZW50OiBPYWhzQ2xpZW50LFxuICBvcHRzOiBHYXRlUG9saWN5U2V0T3B0aW9ucyxcbik6IFByb21pc2U8c3RyaW5nPiB7XG4gIGFzc2VydEdhdGUob3B0cy5nYXRlKTtcbiAgY29uc3QgbWluQXBwcm92YWxzID0gb3B0cy5taW5BcHByb3ZhbHMgIT09IHVuZGVmaW5lZCA/IE51bWJlcihvcHRzLm1pbkFwcHJvdmFscykgOiB1bmRlZmluZWQ7XG4gIGlmIChtaW5BcHByb3ZhbHMgIT09IHVuZGVmaW5lZCAmJiAoIU51bWJlci5pc0ludGVnZXIobWluQXBwcm92YWxzKSB8fCBtaW5BcHByb3ZhbHMgPCAxKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihgaW52YWxpZCAtLW1pbi1hcHByb3ZhbHMgXCIke29wdHMubWluQXBwcm92YWxzfVwiIChleHBlY3RlZCBhIHBvc2l0aXZlIGludGVnZXIpYCk7XG4gIH1cbiAgY29uc3QgcmVxdWlyZVR5cGVzID0gb3B0cy5yZXF1aXJlVHlwZXMgPz8gW107XG4gIGZvciAoY29uc3QgdHlwZSBvZiByZXF1aXJlVHlwZXMpIHtcbiAgICBpZiAodHlwZSAhPT0gJ3VzZXInICYmIHR5cGUgIT09ICdhZ2VudCcgJiYgdHlwZSAhPT0gJ3N5c3RlbScpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgaW52YWxpZCAtLXJlcXVpcmUtdHlwZSBcIiR7dHlwZX1cIiAoZXhwZWN0ZWQgdXNlciB8IGFnZW50IHwgc3lzdGVtKWApO1xuICAgIH1cbiAgfVxuICBpZiAobWluQXBwcm92YWxzID09PSB1bmRlZmluZWQgJiYgcmVxdWlyZVR5cGVzLmxlbmd0aCA9PT0gMCkge1xuICAgIHRocm93IG5ldyBFcnJvcignbm90aGluZyB0byBzZXQ6IHBhc3MgLS1taW4tYXBwcm92YWxzIGFuZC9vciAtLXJlcXVpcmUtdHlwZScpO1xuICB9XG4gIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGNsaWVudC5jYWxsPHtcbiAgICBnYXRlOiBHYXRlQ29kZTtcbiAgICBwb2xpY3k6IHsgbWluQXBwcm92YWxzPzogbnVtYmVyOyByZXF1aXJlZEFjdG9yVHlwZXM/OiBzdHJpbmdbXSB9O1xuICB9Pignc2V0X2dhdGVfcG9saWN5Jywge1xuICAgIGdhdGU6IG9wdHMuZ2F0ZSxcbiAgICBwb2xpY3k6IHtcbiAgICAgIC4uLihtaW5BcHByb3ZhbHMgIT09IHVuZGVmaW5lZCA/IHsgbWluQXBwcm92YWxzIH0gOiB7fSksXG4gICAgICAuLi4ocmVxdWlyZVR5cGVzLmxlbmd0aCA+IDAgPyB7IHJlcXVpcmVkQWN0b3JUeXBlczogcmVxdWlyZVR5cGVzIH0gOiB7fSksXG4gICAgfSxcbiAgfSk7XG4gIHJldHVybiBbXG4gICAgYGdhdGUgcG9saWN5IHNldCBvbiAke3Jlc3VsdC5nYXRlfSAoZ2F0ZSBkZWZpbml0aW9ucyBhcmUgZGF0YSwgcm9hZG1hcCBcdTAwQTczKTpgLFxuICAgIGAgIG1pbkFwcHJvdmFsczogJHtyZXN1bHQucG9saWN5Lm1pbkFwcHJvdmFscyA/PyAxfWAsXG4gICAgYCAgcmVxdWlyZWRBY3RvclR5cGVzOiAke1xuICAgICAgcmVzdWx0LnBvbGljeS5yZXF1aXJlZEFjdG9yVHlwZXMgIT09IHVuZGVmaW5lZCAmJiByZXN1bHQucG9saWN5LnJlcXVpcmVkQWN0b3JUeXBlcy5sZW5ndGggPiAwXG4gICAgICAgID8gcmVzdWx0LnBvbGljeS5yZXF1aXJlZEFjdG9yVHlwZXMuam9pbignLCAnKVxuICAgICAgICA6ICcobm9uZSknXG4gICAgfWAsXG4gIF0uam9pbignXFxuJyk7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgR292ZXJuYW5jZVNldE9wdGlvbnMge1xuICBhY3RvcklkOiBzdHJpbmc7XG4gIHJvbGU6IHN0cmluZztcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdvdmVybmFuY2VTZXRDb21tYW5kKFxuICBjbGllbnQ6IE9haHNDbGllbnQsXG4gIG9wdHM6IEdvdmVybmFuY2VTZXRPcHRpb25zLFxuKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgYXNzZXJ0R292ZXJuYW5jZVJvbGUob3B0cy5yb2xlKTtcbiAgYXdhaXQgY2xpZW50LmNhbGwoJ3NldF9nb3Zlcm5hbmNlX3JvbGUnLCB7IGFjdG9ySWQ6IG9wdHMuYWN0b3JJZCwgcm9sZTogb3B0cy5yb2xlIH0pO1xuICByZXR1cm4gYGdvdmVybmFuY2Ugcm9sZSBvZiAke29wdHMuYWN0b3JJZH0gc2V0IHRvICR7b3B0cy5yb2xlfWA7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQXV0aHpPcHRpb25zIHtcbiAgYWN0b3JJZDogc3RyaW5nO1xuICBwZXJtaXNzaW9uOiBzdHJpbmc7XG59XG5cbi8qKiBIdW1hbi1yZWFkYWJsZSByZW5kZXJpbmcgb2YgdGhlIHJlcGxheWFibGUgYXV0aHpfZXhwbGFpbiB0cmFjZSAocm9hZG1hcCBcdTAwQTczKS4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBhdXRoekNvbW1hbmQoY2xpZW50OiBPYWhzQ2xpZW50LCBvcHRzOiBBdXRoek9wdGlvbnMpOiBQcm9taXNlPHN0cmluZz4ge1xuICBjb25zdCBleHBsYW5hdGlvbiA9IGF3YWl0IGNsaWVudC5jYWxsPEF1dGh6RXhwbGFuYXRpb24+KCdhdXRoel9leHBsYWluJywge1xuICAgIGFjdG9ySWQ6IG9wdHMuYWN0b3JJZCxcbiAgICBwZXJtaXNzaW9uOiBvcHRzLnBlcm1pc3Npb24sXG4gIH0pO1xuICByZXR1cm4gW1xuICAgIGBhdXRoeiAke2V4cGxhbmF0aW9uLnBlcm1pc3Npb259IGZvciAke2V4cGxhbmF0aW9uLmFjdG9ySWR9OiAke1xuICAgICAgZXhwbGFuYXRpb24uYWxsb3dlZCA/ICdBTExPV0VEJyA6ICdERU5JRUQnXG4gICAgfWAsXG4gICAgYCAgc291cmNlOiAke2V4cGxhbmF0aW9uLnNvdXJjZSA/PyAnKG5vIGdyYW50IFx1MjAxNCBkaXJlY3Qgb3IgdmlhIHJvbGUpJ31gLFxuICAgIGAgIGdvdmVybmFuY2VSb2xlOiAke2V4cGxhbmF0aW9uLmdvdmVybmFuY2VSb2xlfWAsXG4gICAgYCAgcGxhbjogJHtleHBsYW5hdGlvbi5wbGFufSAocGxhbkFsbG93czogJHtleHBsYW5hdGlvbi5wbGFuQWxsb3dzfSlgLFxuICAgIGAgIHBvbGljeUFsbG93czogJHtleHBsYW5hdGlvbi5wb2xpY3lBbGxvd3N9YCxcbiAgICBgICB2ZXJzaW9uczogcGxhbiB2JHtleHBsYW5hdGlvbi52ZXJzaW9ucy5wbGFufSwgcG9saWN5IHYke2V4cGxhbmF0aW9uLnZlcnNpb25zLnBvbGljeX1gLFxuICBdLmpvaW4oJ1xcbicpO1xufVxuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIFBoYXNlIDQgKHJvYWRtYXAgQnVpbGQgcGhhc2VzICsgXHUwMEE3MS40KTogbm9uLWNvZGluZyB0ZWFtbWF0ZXMgb24gdGhlIHNhbWVcbi8vIHJhaWxzIFx1MjAxNCBhY3RvcnMgcGlja2VyIGRhdGEsIHBlcnNvbmEgcHJvdmlzaW9uaW5nLCBkaXJlY3Qgd29yay1pdGVtXG4vLyBjcmVhdGlvbiB3aXRoIGEga2luZCwgYW5kIHRoZSBkZXRlcm1pbmlzdGljIGRvY3VtZW50IGxpbnQuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuLyoqIGBvYWhzIGFjdG9yc2AgXHUyMDE0IGV2ZXJ5b25lIG9uIHRoZSByYWlsczogaHVtYW5zLCBhZ2VudHMsIHBlcnNvbmFzLCBzeXN0ZW0uICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gYWN0b3JzQ29tbWFuZChjbGllbnQ6IE9haHNDbGllbnQpOiBQcm9taXNlPHN0cmluZz4ge1xuICBjb25zdCBhY3RvcnMgPSBhd2FpdCBjbGllbnQuY2FsbDxBY3RvcltdPignbGlzdF9hY3RvcnMnKTtcbiAgcmV0dXJuIHJlbmRlclRhYmxlKFxuICAgIFsnaWQnLCAndHlwZScsICdkaXNwbGF5TmFtZScsICdwZXJzb25hQ29kZSddLFxuICAgIGFjdG9ycy5tYXAoKGFjdG9yKSA9PiBbYWN0b3IuaWQsIGFjdG9yLnR5cGUsIGFjdG9yLmRpc3BsYXlOYW1lLCBhY3Rvci5wZXJzb25hQ29kZV0pLFxuICApO1xufVxuXG4vKiogYG9haHMgcGVyc29uYXMgcHJvdmlzaW9uYCBcdTIwMTQgaWRlbXBvdGVudCwgZW5naW5lLWdvdmVybmFuY2UtZ2F0ZWQuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcGVyc29uYXNQcm92aXNpb25Db21tYW5kKGNsaWVudDogT2Foc0NsaWVudCk6IFByb21pc2U8c3RyaW5nPiB7XG4gIGNvbnN0IHBlcnNvbmFzID0gYXdhaXQgY2xpZW50LmNhbGw8QWN0b3JbXT4oJ3Byb3Zpc2lvbl9wZXJzb25hcycpO1xuICByZXR1cm4gW1xuICAgIGBwcm92aXNpb25lZCAke3BlcnNvbmFzLmxlbmd0aH0gcGVyc29uYXMgKGlkZW1wb3RlbnQ7IGZsb29yLXN0YXRlIHJvbGVzLCB6ZXJvIGdhdGUgYXV0aG9yaXR5KTpgLFxuICAgIHJlbmRlclRhYmxlKFxuICAgICAgWydpZCcsICdkaXNwbGF5TmFtZScsICdwZXJzb25hQ29kZSddLFxuICAgICAgcGVyc29uYXMubWFwKChhY3RvcikgPT4gW2FjdG9yLmlkLCBhY3Rvci5kaXNwbGF5TmFtZSwgYWN0b3IucGVyc29uYUNvZGVdKSxcbiAgICApLFxuICBdLmpvaW4oJ1xcbicpO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEl0ZW1DcmVhdGVPcHRpb25zIHtcbiAgZmVhdHVyZUlkOiBzdHJpbmc7XG4gIGV4dGVybmFsS2V5OiBzdHJpbmc7XG4gIHRpdGxlOiBzdHJpbmc7XG4gIC8qKiBXb3JrLWl0ZW0ga2luZDsgZGVmYXVsdCAnY29kZScuIFNlbGVjdHMgZXZpZGVuY2UgZ3VhcmRzLCBuZXZlciBnYXRlIGF1dGhvcml0eS4gKi9cbiAga2luZD86IHN0cmluZztcbiAgc3BlY0NoZWNrcG9pbnQ/OiBib29sZWFuO1xuICBkb25lQ2hlY2twb2ludD86IGJvb2xlYW47XG4gIGludm9rZURldldpdGg/OiBzdHJpbmc7XG4gIGRlcGVuZHNPbj86IHN0cmluZ1tdO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gaXRlbUNyZWF0ZUNvbW1hbmQoXG4gIGNsaWVudDogT2Foc0NsaWVudCxcbiAgb3B0czogSXRlbUNyZWF0ZU9wdGlvbnMsXG4pOiBQcm9taXNlPHN0cmluZz4ge1xuICBpZiAob3B0cy5raW5kICE9PSB1bmRlZmluZWQgJiYgIShXT1JLX0lURU1fS0lORFMgYXMgcmVhZG9ubHkgc3RyaW5nW10pLmluY2x1ZGVzKG9wdHMua2luZCkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYGludmFsaWQgLS1raW5kIFwiJHtvcHRzLmtpbmR9XCIgKGV4cGVjdGVkICR7V09SS19JVEVNX0tJTkRTLmpvaW4oJyB8ICcpfSlgKTtcbiAgfVxuICBjb25zdCBpdGVtID0gYXdhaXQgY2xpZW50LmNhbGw8V29ya0l0ZW0+KCdjcmVhdGVfd29ya19pdGVtJywge1xuICAgIGZlYXR1cmVJZDogb3B0cy5mZWF0dXJlSWQsXG4gICAgZXh0ZXJuYWxLZXk6IG9wdHMuZXh0ZXJuYWxLZXksXG4gICAgdGl0bGU6IG9wdHMudGl0bGUsXG4gICAgLi4uKG9wdHMua2luZCAhPT0gdW5kZWZpbmVkID8geyBraW5kOiBvcHRzLmtpbmQgfSA6IHt9KSxcbiAgICAuLi4ob3B0cy5zcGVjQ2hlY2twb2ludCAhPT0gdW5kZWZpbmVkID8geyBzcGVjQ2hlY2twb2ludDogb3B0cy5zcGVjQ2hlY2twb2ludCB9IDoge30pLFxuICAgIC4uLihvcHRzLmRvbmVDaGVja3BvaW50ICE9PSB1bmRlZmluZWQgPyB7IGRvbmVDaGVja3BvaW50OiBvcHRzLmRvbmVDaGVja3BvaW50IH0gOiB7fSksXG4gICAgLi4uKG9wdHMuaW52b2tlRGV2V2l0aCAhPT0gdW5kZWZpbmVkID8geyBpbnZva2VEZXZXaXRoOiBvcHRzLmludm9rZURldldpdGggfSA6IHt9KSxcbiAgICAuLi4ob3B0cy5kZXBlbmRzT24gIT09IHVuZGVmaW5lZCAmJiBvcHRzLmRlcGVuZHNPbi5sZW5ndGggPiAwXG4gICAgICA/IHsgZGVwZW5kc09uOiBvcHRzLmRlcGVuZHNPbiB9XG4gICAgICA6IHt9KSxcbiAgfSk7XG4gIHJldHVybiBbXG4gICAgYGNyZWF0ZWQgJHtpdGVtLmV4dGVybmFsS2V5fSAoJHtpdGVtLmlkfSlgLFxuICAgIGBraW5kOiAke2l0ZW0ua2luZH1gLFxuICAgIGBzdGF0ZTogJHtpdGVtLnN0YXRlfWAsXG4gICAgYHNwZWNDaGVja3BvaW50OiAke2l0ZW0uc3BlY0NoZWNrcG9pbnR9YCxcbiAgXS5qb2luKCdcXG4nKTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBEb2NsaW50T3B0aW9ucyB7XG4gIC8qKiBQYXRoIG9mIHRoZSBkb2N1bWVudCB0byBsaW50LiAqL1xuICBwYXRoOiBzdHJpbmc7XG4gIC8qKiBSZXF1aXJlZCBgIyMgPG5hbWU+YCBzZWN0aW9ucyAocmVwZWF0YWJsZSBmbGFnKS4gKi9cbiAgcmVxdWlyZVNlY3Rpb25zPzogc3RyaW5nW107XG4gIC8qKiBTdWJtaXQgdGhlIHJlc3VsdCBhcyBkb2NfbGludCBldmlkZW5jZSBvbiB0aGlzIHdvcmsgaXRlbS4gKi9cbiAgd29ya0l0ZW1JZD86IHN0cmluZztcbiAgc3VibWl0PzogYm9vbGVhbjtcbiAgZmVuY2luZ1Rva2VuPzogbnVtYmVyO1xufVxuXG4vKipcbiAqIGBvYWhzIGRvY2xpbnQgPGZpbGU+YCBcdTIwMTQgcnVuIHRoZSBkZXRlcm1pbmlzdGljIGxpbnQgKGEgTUVBU1VSSU5HIHRvb2wsIG5vXG4gKiBMTE0pOyB3aXRoIC0tc3VibWl0IHRoZSByYXcge3NjaGVtYVZhbGlkLCBmaW5kaW5nc30gZ29lcyBvbnRvIHRoZSByYWlscyBhc1xuICogZG9jX2xpbnQgZXZpZGVuY2UgYW5kIHRoZSBDT1JFIGRlY2lkZXMgd2hhdCBpdCBnYXRlcy4gRXhpdCAxIG9uIGEgZmFpbGluZ1xuICogbGludCBzbyBzY3JpcHRzIGNhbiBjaGFpbiBvbiBpdC5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGRvY2xpbnRDb21tYW5kKFxuICBjbGllbnQ6IE9haHNDbGllbnQgfCBudWxsLFxuICBvcHRzOiBEb2NsaW50T3B0aW9ucyxcbik6IFByb21pc2U8Q29tbWFuZE91dHB1dD4ge1xuICBjb25zdCBjb250ZW50ID0gcmVhZEZpbGVTeW5jKHJlc29sdmUob3B0cy5wYXRoKSwgJ3V0ZjgnKTtcbiAgY29uc3QgcmVzdWx0ID0gbGludERvYyhjb250ZW50LCB7XG4gICAgLi4uKG9wdHMucmVxdWlyZVNlY3Rpb25zICE9PSB1bmRlZmluZWQgPyB7IHJlcXVpcmVkU2VjdGlvbnM6IG9wdHMucmVxdWlyZVNlY3Rpb25zIH0gOiB7fSksXG4gIH0pO1xuICBjb25zdCBsaW5lcyA9IFtcbiAgICBgZG9jbGludCAke29wdHMucGF0aH06ICR7cmVzdWx0LnNjaGVtYVZhbGlkID8gJ3NjaGVtYS12YWxpZCcgOiAnTk9UIHNjaGVtYS12YWxpZCd9YCxcbiAgICAuLi5yZXN1bHQuZmluZGluZ3MubWFwKChmaW5kaW5nKSA9PiBgICAtICR7ZmluZGluZ31gKSxcbiAgXTtcbiAgaWYgKG9wdHMuc3VibWl0ID09PSB0cnVlKSB7XG4gICAgaWYgKG9wdHMud29ya0l0ZW1JZCA9PT0gdW5kZWZpbmVkKSB0aHJvdyBuZXcgRXJyb3IoJy0tc3VibWl0IHJlcXVpcmVzIC0td29yay1pdGVtIDxpZD4nKTtcbiAgICBpZiAoY2xpZW50ID09PSBudWxsKSB0aHJvdyBuZXcgRXJyb3IoJy0tc3VibWl0IHJlcXVpcmVzIGEgY2xpZW50ICh0b2tlbiArIHVybCknKTtcbiAgICBhd2FpdCBjbGllbnQuY2FsbCgnc3VibWl0X2V2aWRlbmNlJywge1xuICAgICAgd29ya0l0ZW1JZDogb3B0cy53b3JrSXRlbUlkLFxuICAgICAgZXZpZGVuY2U6IHtcbiAgICAgICAga2luZDogJ2RvY19saW50JyxcbiAgICAgICAgcGF5bG9hZDogeyBzY2hlbWFWYWxpZDogcmVzdWx0LnNjaGVtYVZhbGlkLCBmaW5kaW5nczogcmVzdWx0LmZpbmRpbmdzIH0sXG4gICAgICB9LFxuICAgICAgLi4uKG9wdHMuZmVuY2luZ1Rva2VuICE9PSB1bmRlZmluZWQgPyB7IGZlbmNpbmdUb2tlbjogb3B0cy5mZW5jaW5nVG9rZW4gfSA6IHt9KSxcbiAgICB9KTtcbiAgICBsaW5lcy5wdXNoKGBzdWJtaXR0ZWQgZG9jX2xpbnQgZXZpZGVuY2Ugb24gJHtvcHRzLndvcmtJdGVtSWR9YCk7XG4gIH1cbiAgcmV0dXJuIHsgdGV4dDogbGluZXMuam9pbignXFxuJyksIGV4aXRDb2RlOiByZXN1bHQuc2NoZW1hVmFsaWQgPyAwIDogMSB9O1xufVxuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIG91dHB1dCBoYXJuZXNzIChzaGFyZWQgYnkgY2xpLnRzIGFuZCB0aGUgdGVzdHMpXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuZXhwb3J0IGludGVyZmFjZSBDb21tYW5kT3V0cHV0IHtcbiAgdGV4dDogc3RyaW5nO1xuICBleGl0Q29kZTogbnVtYmVyO1xufVxuXG4vKipcbiAqIFJ1biBvbmUgY29tbWFuZCBmdW5jdGlvbiB0byBhIHByaW50YWJsZSBvdXRjb21lOiBzdWNjZXNzIFx1MjE5MiBpdHMgdGV4dCB3aXRoXG4gKiBleGl0IDA7IGZhaWx1cmUgXHUyMTkyIGA8ZXJyb3IubmFtZT46IDxtZXNzYWdlPmAgKE9haHNSZW1vdGVFcnJvciBjYXJyaWVzIHRoZVxuICogd2lyZSBlcnJvciBjbGFzcyBuYW1lKSB3aXRoIGV4aXQgMS5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJ1blRvT3V0cHV0KGZuOiAoKSA9PiBQcm9taXNlPHN0cmluZz4pOiBQcm9taXNlPENvbW1hbmRPdXRwdXQ+IHtcbiAgdHJ5IHtcbiAgICByZXR1cm4geyB0ZXh0OiBhd2FpdCBmbigpLCBleGl0Q29kZTogMCB9O1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGlmIChlcnJvciBpbnN0YW5jZW9mIEVycm9yKSB7XG4gICAgICByZXR1cm4geyB0ZXh0OiBgJHtlcnJvci5uYW1lfTogJHtlcnJvci5tZXNzYWdlfWAsIGV4aXRDb2RlOiAxIH07XG4gICAgfVxuICAgIHJldHVybiB7IHRleHQ6IFN0cmluZyhlcnJvciksIGV4aXRDb2RlOiAxIH07XG4gIH1cbn1cbiIsICIvKipcbiAqIFBsYWluLXRleHQgdGFibGUgcmVuZGVyaW5nIFx1MjAxNCBkZWxpYmVyYXRlbHkgZGVwZW5kZW5jeS1mcmVlIChzdG9yeSAxMzpcbiAqIFwiYlx1MUVBM25nIHRleHQgXHUwMTExXHUwMUExbiBnaVx1MUVBM24sIGtoXHUwMEY0bmcgZGVwIGJcdTFFQTNuZyBuZ29cdTAwRTBpXCIpLiBNb25vc3BhY2UgY29sdW1ucyBwYWRkZWQgdG9cbiAqIHRoZSB3aWRlc3QgY2VsbDsgYW4gZW1wdHkgcm93IHNldCByZW5kZXJzIGFzIFwiKGVtcHR5KVwiLlxuICovXG5cbmV4cG9ydCB0eXBlIENlbGwgPSBzdHJpbmcgfCBudW1iZXIgfCBib29sZWFuIHwgbnVsbCB8IHVuZGVmaW5lZDtcblxuZnVuY3Rpb24gdG9UZXh0KGNlbGw6IENlbGwpOiBzdHJpbmcge1xuICBpZiAoY2VsbCA9PT0gbnVsbCB8fCBjZWxsID09PSB1bmRlZmluZWQpIHJldHVybiAnLSc7XG4gIHJldHVybiBTdHJpbmcoY2VsbCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiByZW5kZXJUYWJsZShoZWFkZXJzOiBzdHJpbmdbXSwgcm93czogQ2VsbFtdW10pOiBzdHJpbmcge1xuICBpZiAocm93cy5sZW5ndGggPT09IDApIHJldHVybiAnKGVtcHR5KSc7XG4gIGNvbnN0IHRleHRSb3dzID0gcm93cy5tYXAoKHJvdykgPT4gcm93Lm1hcCh0b1RleHQpKTtcbiAgY29uc3Qgd2lkdGhzID0gaGVhZGVycy5tYXAoKGhlYWRlciwgY29sKSA9PlxuICAgIE1hdGgubWF4KGhlYWRlci5sZW5ndGgsIC4uLnRleHRSb3dzLm1hcCgocm93KSA9PiAocm93W2NvbF0gPz8gJycpLmxlbmd0aCkpLFxuICApO1xuICBjb25zdCBsaW5lID0gKGNlbGxzOiBzdHJpbmdbXSk6IHN0cmluZyA9PlxuICAgIGNlbGxzLm1hcCgoY2VsbCwgY29sKSA9PiBjZWxsLnBhZEVuZCh3aWR0aHNbY29sXSA/PyBjZWxsLmxlbmd0aCkpLmpvaW4oJyAgJykudHJpbUVuZCgpO1xuICBjb25zdCBzZXBhcmF0b3IgPSB3aWR0aHMubWFwKCh3KSA9PiAnLScucmVwZWF0KHcpKS5qb2luKCcgICcpO1xuICByZXR1cm4gW2xpbmUoaGVhZGVycyksIHNlcGFyYXRvciwgLi4udGV4dFJvd3MubWFwKGxpbmUpXS5qb2luKCdcXG4nKTtcbn1cbiIsICIvKipcbiAqIFBoYXNlIDMgY29sbGFib3JhdGlvbiBjb21tYW5kcyAocm9hZG1hcCBcdTAwQTc1KSArIHRoZSBhZHZpc29yIGJvdHMgXHUyMDE0IHB1cmVcbiAqIGZ1bmN0aW9ucyBvdmVyIHRoZSB0eXBlZCBjb250cmFjdHMgY2xpZW50LCBzYW1lIHNoYXBlIGFzIGNvbW1hbmRzL2luZGV4LnRzLlxuICpcbiAqIFRoZSBhZHZpc29yIGJvdHMgYXJlIHRoZSBcImFnZW50aWZ5IFdJVEhPVVQgdG91Y2hpbmcgdGhlIHNwaW5lXCIgcGF0dGVyblxuICogKHRoZXNpcyBcdTAwQTc1KTogZGV0ZXJtaW5pc3RpYyByZWFkICsgcG9zdCwgTk8gTExNLCBOTyBsaWZlY3ljbGUgbXV0YXRpb24uXG4gKiBUaGV5IHJ1biB1bmRlciB3aGF0ZXZlciB0b2tlbiB0aGUgY2FsbGVyIGhvbGRzIGFuZCBvbmx5IG5lZWQgdGhlIHJpZ2h0IHRvXG4gKiBwb3N0IGludG8gYW4gb3BlbiB0aHJlYWQgXHUyMDE0IHRoZSBhdWRpdCB0cmFpbCBzaG93cyB6ZXJvIGdhdGVzLCB6ZXJvXG4gKiB0cmFuc2l0aW9ucyBmcm9tIHRoZW0uXG4gKi9cbmltcG9ydCB0eXBlIHsgT2Foc0NsaWVudCB9IGZyb20gJ0BvYWhzL2NvbnRyYWN0cyc7XG5pbXBvcnQgdHlwZSB7XG4gIEFnZW50Sm9iLFxuICBEaXZlcmdlbmNlUmVwb3J0LFxuICBNZXNzYWdlLFxuICBNZW50aW9uLFxuICBOb3RpZmljYXRpb24sXG4gIFRocmVhZCxcbiAgVGhyZWFkS2luZCxcbiAgVGhyZWFkVmlzaWJpbGl0eSxcbiAgV29ya0l0ZW0sXG59IGZyb20gJ0BvYWhzL2NvcmUnO1xuXG5pbXBvcnQgeyByZW5kZXJUYWJsZSB9IGZyb20gJy4uL2Zvcm1hdC5qcyc7XG5cbmNvbnN0IFRIUkVBRF9LSU5EUyA9IFsnc3BlYycsICdkZXNpZ24nLCAndGFzaycsICdnZW5lcmFsJywgJ3ByaXZhdGUnXSBhcyBjb25zdDtcbmNvbnN0IFZJU0lCSUxJVElFUyA9IFsnb3BlbicsICdwcml2YXRlJ10gYXMgY29uc3Q7XG5jb25zdCBKT0JfU1RBVFVTRVMgPSBbJ3F1ZXVlZCcsICdkb25lJywgJ2Jsb2NrZWQnXSBhcyBjb25zdDtcblxuZnVuY3Rpb24gYXNzZXJ0VGhyZWFkS2luZChraW5kOiBzdHJpbmcpOiBhc3NlcnRzIGtpbmQgaXMgVGhyZWFkS2luZCB7XG4gIGlmICghKFRIUkVBRF9LSU5EUyBhcyByZWFkb25seSBzdHJpbmdbXSkuaW5jbHVkZXMoa2luZCkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYGludmFsaWQgLS1raW5kIFwiJHtraW5kfVwiIChleHBlY3RlZCAke1RIUkVBRF9LSU5EUy5qb2luKCcgfCAnKX0pYCk7XG4gIH1cbn1cblxuZnVuY3Rpb24gYXNzZXJ0VmlzaWJpbGl0eSh2aXNpYmlsaXR5OiBzdHJpbmcpOiBhc3NlcnRzIHZpc2liaWxpdHkgaXMgVGhyZWFkVmlzaWJpbGl0eSB7XG4gIGlmICghKFZJU0lCSUxJVElFUyBhcyByZWFkb25seSBzdHJpbmdbXSkuaW5jbHVkZXModmlzaWJpbGl0eSkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYGludmFsaWQgLS12aXNpYmlsaXR5IFwiJHt2aXNpYmlsaXR5fVwiIChleHBlY3RlZCAke1ZJU0lCSUxJVElFUy5qb2luKCcgfCAnKX0pYCk7XG4gIH1cbn1cblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyB0aHJlYWQgY3JlYXRlIC8gbGlzdFxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbmV4cG9ydCBpbnRlcmZhY2UgVGhyZWFkQ3JlYXRlT3B0aW9ucyB7XG4gIGtpbmQ6IHN0cmluZztcbiAgZmVhdHVyZUlkPzogc3RyaW5nO1xuICB3b3JrSXRlbUlkPzogc3RyaW5nO1xuICB2aXNpYmlsaXR5Pzogc3RyaW5nO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gdGhyZWFkQ3JlYXRlQ29tbWFuZChcbiAgY2xpZW50OiBPYWhzQ2xpZW50LFxuICBvcHRzOiBUaHJlYWRDcmVhdGVPcHRpb25zLFxuKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgYXNzZXJ0VGhyZWFkS2luZChvcHRzLmtpbmQpO1xuICBpZiAob3B0cy52aXNpYmlsaXR5ICE9PSB1bmRlZmluZWQpIGFzc2VydFZpc2liaWxpdHkob3B0cy52aXNpYmlsaXR5KTtcbiAgY29uc3QgdGhyZWFkID0gYXdhaXQgY2xpZW50LmNhbGw8VGhyZWFkPignY3JlYXRlX3RocmVhZCcsIHtcbiAgICBraW5kOiBvcHRzLmtpbmQsXG4gICAgLi4uKG9wdHMuZmVhdHVyZUlkICE9PSB1bmRlZmluZWQgPyB7IGZlYXR1cmVJZDogb3B0cy5mZWF0dXJlSWQgfSA6IHt9KSxcbiAgICAuLi4ob3B0cy53b3JrSXRlbUlkICE9PSB1bmRlZmluZWQgPyB7IHdvcmtJdGVtSWQ6IG9wdHMud29ya0l0ZW1JZCB9IDoge30pLFxuICAgIC4uLihvcHRzLnZpc2liaWxpdHkgIT09IHVuZGVmaW5lZCA/IHsgdmlzaWJpbGl0eTogb3B0cy52aXNpYmlsaXR5IH0gOiB7fSksXG4gIH0pO1xuICByZXR1cm4gW1xuICAgIGB0aHJlYWRJZDogJHt0aHJlYWQuaWR9YCxcbiAgICBga2luZDogJHt0aHJlYWQua2luZH1gLFxuICAgIGB2aXNpYmlsaXR5OiAke3RocmVhZC52aXNpYmlsaXR5fWAsXG4gICAgYGZlYXR1cmVJZDogJHt0aHJlYWQuZmVhdHVyZUlkID8/ICctJ31gLFxuICAgIGB3b3JrSXRlbUlkOiAke3RocmVhZC53b3JrSXRlbUlkID8/ICctJ31gLFxuICBdLmpvaW4oJ1xcbicpO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFRocmVhZExpc3RPcHRpb25zIHtcbiAgZmVhdHVyZUlkPzogc3RyaW5nO1xuICB3b3JrSXRlbUlkPzogc3RyaW5nO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gdGhyZWFkTGlzdENvbW1hbmQoXG4gIGNsaWVudDogT2Foc0NsaWVudCxcbiAgb3B0czogVGhyZWFkTGlzdE9wdGlvbnMgPSB7fSxcbik6IFByb21pc2U8c3RyaW5nPiB7XG4gIGNvbnN0IHRocmVhZHMgPSBhd2FpdCBjbGllbnQuY2FsbDxUaHJlYWRbXT4oJ2xpc3RfdGhyZWFkcycsIHtcbiAgICAuLi4ob3B0cy5mZWF0dXJlSWQgIT09IHVuZGVmaW5lZCA/IHsgZmVhdHVyZUlkOiBvcHRzLmZlYXR1cmVJZCB9IDoge30pLFxuICAgIC4uLihvcHRzLndvcmtJdGVtSWQgIT09IHVuZGVmaW5lZCA/IHsgd29ya0l0ZW1JZDogb3B0cy53b3JrSXRlbUlkIH0gOiB7fSksXG4gIH0pO1xuICByZXR1cm4gcmVuZGVyVGFibGUoXG4gICAgWydpZCcsICdraW5kJywgJ3Zpc2liaWxpdHknLCAnZmVhdHVyZUlkJywgJ3dvcmtJdGVtSWQnLCAnY3JlYXRlZEJ5J10sXG4gICAgdGhyZWFkcy5tYXAoKHQpID0+IFt0LmlkLCB0LmtpbmQsIHQudmlzaWJpbGl0eSwgdC5mZWF0dXJlSWQsIHQud29ya0l0ZW1JZCwgdC5jcmVhdGVkQnldKSxcbiAgKTtcbn1cblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBwb3N0IC8gbWVzc2FnZXNcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5leHBvcnQgaW50ZXJmYWNlIFBvc3RPcHRpb25zIHtcbiAgdGhyZWFkSWQ6IHN0cmluZztcbiAgYm9keTogc3RyaW5nO1xuICAvKiogU1RSVUNUVVJFRCBtZW50aW9ucyBcdTIwMTQgYWN0b3IgaWRzLCBuZXZlciBwYXJzZWQgZnJvbSB0aGUgYm9keSAoXHUwMEE3NS4yKS4gKi9cbiAgbWVudGlvbnM/OiBzdHJpbmdbXTtcbiAgcmVwbHlUbz86IHN0cmluZztcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHBvc3RDb21tYW5kKGNsaWVudDogT2Foc0NsaWVudCwgb3B0czogUG9zdE9wdGlvbnMpOiBQcm9taXNlPHN0cmluZz4ge1xuICBjb25zdCBtZXNzYWdlID0gYXdhaXQgY2xpZW50LmNhbGw8TWVzc2FnZT4oJ3Bvc3RfbWVzc2FnZScsIHtcbiAgICB0aHJlYWRJZDogb3B0cy50aHJlYWRJZCxcbiAgICBib2R5OiBvcHRzLmJvZHksXG4gICAgLi4uKG9wdHMucmVwbHlUbyAhPT0gdW5kZWZpbmVkID8geyByZXBseVRvOiBvcHRzLnJlcGx5VG8gfSA6IHt9KSxcbiAgICAuLi4ob3B0cy5tZW50aW9ucyAhPT0gdW5kZWZpbmVkICYmIG9wdHMubWVudGlvbnMubGVuZ3RoID4gMCA/IHsgbWVudGlvbnM6IG9wdHMubWVudGlvbnMgfSA6IHt9KSxcbiAgfSk7XG4gIGNvbnN0IGxpbmVzID0gW2Bwb3N0ZWQgIyR7bWVzc2FnZS5zZXF9ICgke21lc3NhZ2UuaWR9KSB0byAke21lc3NhZ2UudGhyZWFkSWR9YF07XG4gIGlmIChvcHRzLm1lbnRpb25zICE9PSB1bmRlZmluZWQgJiYgb3B0cy5tZW50aW9ucy5sZW5ndGggPiAwKSB7XG4gICAgY29uc3QgbWVudGlvbnMgPSBhd2FpdCBjbGllbnQuY2FsbDxNZW50aW9uW10+KCdsaXN0X21lbnRpb25zJywgeyBtZXNzYWdlSWQ6IG1lc3NhZ2UuaWQgfSk7XG4gICAgZm9yIChjb25zdCBtZW50aW9uIG9mIG1lbnRpb25zKSB7XG4gICAgICBsaW5lcy5wdXNoKGBtZW50aW9uICR7bWVudGlvbi5tZW50aW9uZWRBY3RvcklkfTogJHttZW50aW9uLnJlc29sdXRpb259YCk7XG4gICAgfVxuICB9XG4gIHJldHVybiBsaW5lcy5qb2luKCdcXG4nKTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBNZXNzYWdlc09wdGlvbnMge1xuICB0aHJlYWRJZDogc3RyaW5nO1xuICBzaW5jZVNlcT86IG51bWJlcjtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIG1lc3NhZ2VzQ29tbWFuZChjbGllbnQ6IE9haHNDbGllbnQsIG9wdHM6IE1lc3NhZ2VzT3B0aW9ucyk6IFByb21pc2U8c3RyaW5nPiB7XG4gIGNvbnN0IG1lc3NhZ2VzID0gYXdhaXQgY2xpZW50LmNhbGw8TWVzc2FnZVtdPignbGlzdF9tZXNzYWdlcycsIHtcbiAgICB0aHJlYWRJZDogb3B0cy50aHJlYWRJZCxcbiAgICAuLi4ob3B0cy5zaW5jZVNlcSAhPT0gdW5kZWZpbmVkID8geyBzaW5jZVNlcTogb3B0cy5zaW5jZVNlcSB9IDoge30pLFxuICB9KTtcbiAgLy8gYXV0aG9ySWQgaXMgcmVuZGVyZWQgUkFXIFx1MjAxNCB0aGUgQ0xJIGhhcyBubyBhY3RvciBkaXJlY3RvcnkgYW5kIG5lZWRzIG5vbmUuXG4gIHJldHVybiByZW5kZXJUYWJsZShcbiAgICBbJ3NlcScsICdraW5kJywgJ2F1dGhvcklkJywgJ2JvZHknXSxcbiAgICBtZXNzYWdlcy5tYXAoKG0pID0+IFttLnNlcSwgbS5raW5kLCBtLmF1dGhvcklkLCBtLmJvZHldKSxcbiAgKTtcbn1cblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBub3RpZmljYXRpb25zXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuZXhwb3J0IGludGVyZmFjZSBOb3RpZmljYXRpb25zT3B0aW9ucyB7XG4gIHVucmVhZE9ubHk/OiBib29sZWFuO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gbm90aWZpY2F0aW9uc0NvbW1hbmQoXG4gIGNsaWVudDogT2Foc0NsaWVudCxcbiAgb3B0czogTm90aWZpY2F0aW9uc09wdGlvbnMgPSB7fSxcbik6IFByb21pc2U8c3RyaW5nPiB7XG4gIGNvbnN0IG5vdGlmaWNhdGlvbnMgPSBhd2FpdCBjbGllbnQuY2FsbDxOb3RpZmljYXRpb25bXT4oJ2xpc3Rfbm90aWZpY2F0aW9ucycsIHtcbiAgICAuLi4ob3B0cy51bnJlYWRPbmx5ID09PSB0cnVlID8geyB1bnJlYWRPbmx5OiB0cnVlIH0gOiB7fSksXG4gIH0pO1xuICByZXR1cm4gcmVuZGVyVGFibGUoXG4gICAgWydpZCcsICdzb3VyY2UnLCAncmVmSWQnLCAncmVhZCddLFxuICAgIG5vdGlmaWNhdGlvbnMubWFwKChuKSA9PiBbbi5pZCwgbi5zb3VyY2UsIG4ucmVmSWQsIG4ucmVhZF0pLFxuICApO1xufVxuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIGFnZW50IGpvYnNcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5leHBvcnQgaW50ZXJmYWNlIEpvYnNPcHRpb25zIHtcbiAgYWdlbnRBY3RvcklkPzogc3RyaW5nO1xuICBzdGF0dXM/OiBzdHJpbmc7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBqb2JzQ29tbWFuZChjbGllbnQ6IE9haHNDbGllbnQsIG9wdHM6IEpvYnNPcHRpb25zID0ge30pOiBQcm9taXNlPHN0cmluZz4ge1xuICBpZiAob3B0cy5zdGF0dXMgIT09IHVuZGVmaW5lZCAmJiAhKEpPQl9TVEFUVVNFUyBhcyByZWFkb25seSBzdHJpbmdbXSkuaW5jbHVkZXMob3B0cy5zdGF0dXMpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBpbnZhbGlkIC0tc3RhdHVzIFwiJHtvcHRzLnN0YXR1c31cIiAoZXhwZWN0ZWQgJHtKT0JfU1RBVFVTRVMuam9pbignIHwgJyl9KWApO1xuICB9XG4gIGNvbnN0IGpvYnMgPSBhd2FpdCBjbGllbnQuY2FsbDxBZ2VudEpvYltdPignbGlzdF9hZ2VudF9qb2JzJywge1xuICAgIC4uLihvcHRzLmFnZW50QWN0b3JJZCAhPT0gdW5kZWZpbmVkID8geyBhZ2VudEFjdG9ySWQ6IG9wdHMuYWdlbnRBY3RvcklkIH0gOiB7fSksXG4gICAgLi4uKG9wdHMuc3RhdHVzICE9PSB1bmRlZmluZWQgPyB7IHN0YXR1czogb3B0cy5zdGF0dXMgfSA6IHt9KSxcbiAgfSk7XG4gIHJldHVybiByZW5kZXJUYWJsZShcbiAgICBbJ2lkJywgJ2FnZW50QWN0b3JJZCcsICdzdGF0dXMnLCAndGhyZWFkSWQnLCAnd29ya0l0ZW1JZCcsICdkZXB0aCcsICdub3RlJ10sXG4gICAgam9icy5tYXAoKGopID0+IFtqLmlkLCBqLmFnZW50QWN0b3JJZCwgai5zdGF0dXMsIGoudGhyZWFkSWQsIGoud29ya0l0ZW1JZCwgai5kZXB0aCwgai5ub3RlXSksXG4gICk7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgSm9iQ29tcGxldGVPcHRpb25zIHtcbiAgam9iSWQ6IHN0cmluZztcbiAgc3RhdHVzOiAnZG9uZScgfCAnYmxvY2tlZCc7XG4gIG5vdGU/OiBzdHJpbmc7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBqb2JDb21wbGV0ZUNvbW1hbmQoXG4gIGNsaWVudDogT2Foc0NsaWVudCxcbiAgb3B0czogSm9iQ29tcGxldGVPcHRpb25zLFxuKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgY29uc3Qgam9iID0gYXdhaXQgY2xpZW50LmNhbGw8QWdlbnRKb2I+KCdjb21wbGV0ZV9hZ2VudF9qb2InLCB7XG4gICAgam9iSWQ6IG9wdHMuam9iSWQsXG4gICAgc3RhdHVzOiBvcHRzLnN0YXR1cyxcbiAgICAuLi4ob3B0cy5ub3RlICE9PSB1bmRlZmluZWQgPyB7IG5vdGU6IG9wdHMubm90ZSB9IDoge30pLFxuICB9KTtcbiAgcmV0dXJuIFtgam9iICR7am9iLmlkfTogJHtqb2Iuc3RhdHVzfWAsIGBub3RlOiAke2pvYi5ub3RlID8/ICctJ31gXS5qb2luKCdcXG4nKTtcbn1cblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBhZHZpc29yIGJvdHMgXHUyMDE0IGRldGVybWluaXN0aWMgcmVhZCArIHBvc3QsIE5PIExMTSwgTk8gbGlmZWN5Y2xlIGF1dGhvcml0eVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbmV4cG9ydCBpbnRlcmZhY2UgQWR2aXNlTmV4dFRhc2tPcHRpb25zIHtcbiAgdGhyZWFkSWQ6IHN0cmluZztcbn1cblxuLyoqXG4gKiBgb2FocyBhZHZpc2UgbmV4dC10YXNrYDogcmVhZHMgdGhlIGNsYWltYWJsZSByZWFkeV9mb3JfZGV2IHF1ZXVlIChyYWlsc1xuICogZW5mb3JjZSBkZXBlbmRlbmN5IG9yZGVyIFx1MjAxNCBhbiBpdGVtIG9ubHkgZXZlciBSRUFDSEVTIHJlYWR5X2Zvcl9kZXYgd2hlbiBpdHNcbiAqIHByZWRlY2Vzc29ycyBhbGxvdyBpdCkgYW5kIHBvc3RzIGEgZGV0ZXJtaW5pc3RpYyBzdWdnZXN0aW9uIGludG8gdGhlXG4gKiB0aHJlYWQuIFJlYWQgKyBwb3N0IG9ubHkuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBhZHZpc2VOZXh0VGFza0NvbW1hbmQoXG4gIGNsaWVudDogT2Foc0NsaWVudCxcbiAgb3B0czogQWR2aXNlTmV4dFRhc2tPcHRpb25zLFxuKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgY29uc3QgaXRlbXMgPSBhd2FpdCBjbGllbnQuY2FsbDxXb3JrSXRlbVtdPignbGlzdF93b3JrX2l0ZW1zJywge1xuICAgIHN0YXRlOiAncmVhZHlfZm9yX2RldicsXG4gICAgY2xhaW1hYmxlOiB0cnVlLFxuICB9KTtcbiAgY29uc3Qgb3JkZXJlZCA9IFsuLi5pdGVtc10uc29ydCgoYSwgYikgPT4gYS5leHRlcm5hbEtleS5sb2NhbGVDb21wYXJlKGIuZXh0ZXJuYWxLZXkpKTtcbiAgY29uc3QgYm9keSA9XG4gICAgb3JkZXJlZC5sZW5ndGggPT09IDBcbiAgICAgID8gJ2Fkdmlzb3IobmV4dC10YXNrKTogbm8gY2xhaW1hYmxlIHJlYWR5X2Zvcl9kZXYgaXRlbXMgcmlnaHQgbm93LidcbiAgICAgIDogW1xuICAgICAgICAgICdhZHZpc29yKG5leHQtdGFzayk6IHN1Z2dlc3RlZCBjbGFpbSBvcmRlciAoY2xhaW1hYmxlIHJlYWR5X2Zvcl9kZXYpOicsXG4gICAgICAgICAgLi4ub3JkZXJlZC5tYXAoKGl0ZW0sIGkpID0+IGAke2kgKyAxfS4gJHtpdGVtLmV4dGVybmFsS2V5fSBcdTIwMTQgJHtpdGVtLnRpdGxlfSAoJHtpdGVtLmlkfSlgKSxcbiAgICAgICAgXS5qb2luKCdcXG4nKTtcbiAgY29uc3QgbWVzc2FnZSA9IGF3YWl0IGNsaWVudC5jYWxsPE1lc3NhZ2U+KCdwb3N0X21lc3NhZ2UnLCB7XG4gICAgdGhyZWFkSWQ6IG9wdHMudGhyZWFkSWQsXG4gICAgYm9keSxcbiAgfSk7XG4gIHJldHVybiBbYGFkdmlzZWQgaW4gIyR7bWVzc2FnZS5zZXF9ICgke21lc3NhZ2UuaWR9KWAsIGJvZHldLmpvaW4oJ1xcbicpO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEFkdmlzZVJlY29uY2lsZU9wdGlvbnMge1xuICB0aHJlYWRJZDogc3RyaW5nO1xuICAvKiogUmVwZWF0ZWQgYC0tZmlsZSA8d29ya0l0ZW1JZD49PGZyb250bWF0dGVyU3RhdHVzPmAgcGFpcnMuICovXG4gIGZpbGVzOiBzdHJpbmdbXTtcbn1cblxuLyoqXG4gKiBgb2FocyBhZHZpc2UgcmVjb25jaWxlYDogcnVucyB0aGUgREVURUNULU9OTFkgcmVjb25jaWxlIHF1ZXJ5IG92ZXIgdGhlXG4gKiBnaXZlbiBmcm9udG1hdHRlciBzdGF0dXNlcyBhbmQgcG9zdHMgdGhlIGRpdmVyZ2VuY2UgcmVwb3J0IGludG8gdGhlXG4gKiB0aHJlYWQuIE5ldmVyIG11dGF0ZXMgYW55dGhpbmcgKHJvYWRtYXAgXHUwMEE3MS42IC8gRDYpLlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gYWR2aXNlUmVjb25jaWxlQ29tbWFuZChcbiAgY2xpZW50OiBPYWhzQ2xpZW50LFxuICBvcHRzOiBBZHZpc2VSZWNvbmNpbGVPcHRpb25zLFxuKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgaWYgKG9wdHMuZmlsZXMubGVuZ3RoID09PSAwKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdub3RoaW5nIHRvIHJlY29uY2lsZTogcGFzcyBhdCBsZWFzdCBvbmUgLS1maWxlIDx3b3JrSXRlbUlkPj08c3RhdHVzPicpO1xuICB9XG4gIGNvbnN0IGZpbGVzID0gb3B0cy5maWxlcy5tYXAoKHBhaXIpID0+IHtcbiAgICBjb25zdCBlcSA9IHBhaXIuaW5kZXhPZignPScpO1xuICAgIGlmIChlcSA8PSAwIHx8IGVxID09PSBwYWlyLmxlbmd0aCAtIDEpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgaW52YWxpZCAtLWZpbGUgXCIke3BhaXJ9XCIgKGV4cGVjdGVkIDx3b3JrSXRlbUlkPj08c3RhdHVzPilgKTtcbiAgICB9XG4gICAgcmV0dXJuIHsgd29ya0l0ZW1JZDogcGFpci5zbGljZSgwLCBlcSksIGZyb250bWF0dGVyU3RhdHVzOiBwYWlyLnNsaWNlKGVxICsgMSkgfTtcbiAgfSk7XG4gIGNvbnN0IHJlcG9ydHMgPSBhd2FpdCBjbGllbnQuY2FsbDxEaXZlcmdlbmNlUmVwb3J0W10+KCdyZWNvbmNpbGUnLCB7IGZpbGVzIH0pO1xuICBjb25zdCBib2R5ID1cbiAgICByZXBvcnRzLmxlbmd0aCA9PT0gMFxuICAgICAgPyBgYWR2aXNvcihyZWNvbmNpbGUpOiBubyBkaXZlcmdlbmNlIGFjcm9zcyAke2ZpbGVzLmxlbmd0aH0gZmlsZShzKS4gKGRldGVjdC1vbmx5KWBcbiAgICAgIDogW1xuICAgICAgICAgIGBhZHZpc29yKHJlY29uY2lsZSk6ICR7cmVwb3J0cy5sZW5ndGh9IGRpdmVyZ2VuY2UocykgZGV0ZWN0ZWQgKGRldGVjdC1vbmx5LCBub3RoaW5nIHdhcyBjaGFuZ2VkKTpgLFxuICAgICAgICAgIC4uLnJlcG9ydHMubWFwKFxuICAgICAgICAgICAgKHIpID0+IGAtICR7ci53b3JrSXRlbUlkfTogZmlsZT0ke3IuZmlsZVN0YXRlfSBkYj0ke3IuZGJTdGF0ZX0gXHUyMTkyICR7ci5raW5kfWAsXG4gICAgICAgICAgKSxcbiAgICAgICAgXS5qb2luKCdcXG4nKTtcbiAgY29uc3QgbWVzc2FnZSA9IGF3YWl0IGNsaWVudC5jYWxsPE1lc3NhZ2U+KCdwb3N0X21lc3NhZ2UnLCB7XG4gICAgdGhyZWFkSWQ6IG9wdHMudGhyZWFkSWQsXG4gICAgYm9keSxcbiAgfSk7XG4gIHJldHVybiBbYGFkdmlzZWQgaW4gIyR7bWVzc2FnZS5zZXF9ICgke21lc3NhZ2UuaWR9KWAsIGJvZHldLmpvaW4oJ1xcbicpO1xufVxuIiwgIi8qKlxuICogYG9haHMgc2VydmVgIFx1MjAxNCBib290IHRoZSBzcGluZS1hcGkgaW4tcHJvY2Vzcy5cbiAqXG4gKiBFbmdpbmUgc2VsZWN0aW9uOlxuICogIC0gZGVmYXVsdDogQG9haHMvY29yZSBjcmVhdGVNZW1vcnlFbmdpbmUgKHplcm8gcGVyc2lzdGVuY2UsIGluc3RhbnQpO1xuICogIC0gLS1kYXRhIDxkaXI+OiBEVVJBQkxFIFBHbGl0ZSB2aWEgQG9haHMvZGIgY3JlYXRlUGdTeW5jRW5naW5lKHtkYXRhRGlyfSlcbiAqICAgIHBsdXMgYSBwZXJzaXN0ZWQgVG9rZW5TdG9yZSwgc28gYWN0b3JzL3Rva2Vucy9zdGF0ZSBzdXJ2aXZlIHJlc3RhcnRzLlxuICpcbiAqIEBvYWhzL2RiIGlzIGltcG9ydGVkIExBWklMWTogaXRzIHN5bmNocm9ub3VzIGZhY2FkZSBzcGF3bnMgYSBzeW5ja2l0XG4gKiB3b3JrZXIgKFBHbGl0ZSB3YXNtKSBhdCBtb2R1bGUgbG9hZCwgd2hpY2ggbm8gbWVtb3J5LWVuZ2luZSBzZXJ2ZSBcdTIwMTQgYW5kIG5vXG4gKiBnYXRlLWhvbGRlciBjb21tYW5kIFx1MjAxNCBzaG91bGQgZXZlciBwYXkgZm9yLlxuICpcbiAqIEVudiBpcyByZWFkIGluIGNsaS50cyAodGhlIGVudHJ5cG9pbnQpLCBuZXZlciBoZXJlOiB0aGlzIG1vZHVsZSB0YWtlc1xuICogZXZlcnl0aGluZyBhcyBwYXJhbWV0ZXJzLCBtaXJyb3JpbmcgdGhlIHNwaW5lLWFwaSBjb252ZW50aW9uLlxuICovXG5pbXBvcnQgeyByYW5kb21CeXRlcyB9IGZyb20gJ25vZGU6Y3J5cHRvJztcbmltcG9ydCB7IG1rZGlyU3luYyB9IGZyb20gJ25vZGU6ZnMnO1xuaW1wb3J0IHR5cGUgeyBBZGRyZXNzSW5mbyB9IGZyb20gJ25vZGU6bmV0JztcbmltcG9ydCB7IGpvaW4gfSBmcm9tICdub2RlOnBhdGgnO1xuXG5pbXBvcnQgeyBjcmVhdGVNZW1vcnlFbmdpbmUgfSBmcm9tICdAb2Focy9jb3JlJztcbmltcG9ydCB7IFRva2VuU3RvcmUsIGJ1aWxkU2VydmVyIH0gZnJvbSAnQG9haHMvc3BpbmUtYXBpJztcblxuZXhwb3J0IGNvbnN0IERFRkFVTFRfUE9SVCA9IDQ1MTc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgU2VydmVPcHRpb25zIHtcbiAgLyoqIFRDUCBwb3J0ICgwID0gZXBoZW1lcmFsKS4gRGVmYXVsdCA0NTE3LiAqL1xuICBwb3J0PzogbnVtYmVyO1xuICAvKiogQmluZCBob3N0LiBEZWZhdWx0IDAuMC4wLjAuICovXG4gIGhvc3Q/OiBzdHJpbmc7XG4gIC8qKiBCb290c3RyYXAgYWRtaW4gY3JlZGVudGlhbC4gT21pdHRlZCBcdTIxOTIgZ2VuZXJhdGVkIChzZWUgaGFuZGxlLmFkbWluVG9rZW5HZW5lcmF0ZWQpLiAqL1xuICBhZG1pblRva2VuPzogc3RyaW5nO1xuICAvKiogUGVyc2lzdGVuY2Ugcm9vdDogUEdsaXRlIGRhdGEgdW5kZXIgPGRhdGFEaXI+L3BnLCB0b2tlbnMgaW4gPGRhdGFEaXI+L3Rva2Vucy5qc29uLiAqL1xuICBkYXRhRGlyPzogc3RyaW5nO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFNlcnZlSGFuZGxlIHtcbiAgdXJsOiBzdHJpbmc7XG4gIHBvcnQ6IG51bWJlcjtcbiAgYWRtaW5Ub2tlbjogc3RyaW5nO1xuICAvKiogdHJ1ZSB3aGVuIG5vIGFkbWluIHRva2VuIHdhcyBwcm92aWRlZCBhbmQgb25lIHdhcyBnZW5lcmF0ZWQuICovXG4gIGFkbWluVG9rZW5HZW5lcmF0ZWQ6IGJvb2xlYW47XG4gIGVuZ2luZUtpbmQ6ICdtZW1vcnknIHwgJ3BnbGl0ZSc7XG4gIGNsb3NlKCk6IFByb21pc2U8dm9pZD47XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBzdGFydFNlcnZlKG9wdGlvbnM6IFNlcnZlT3B0aW9ucyA9IHt9KTogUHJvbWlzZTxTZXJ2ZUhhbmRsZT4ge1xuICBjb25zdCBhZG1pblRva2VuR2VuZXJhdGVkID0gb3B0aW9ucy5hZG1pblRva2VuID09PSB1bmRlZmluZWQ7XG4gIGNvbnN0IGFkbWluVG9rZW4gPSBvcHRpb25zLmFkbWluVG9rZW4gPz8gcmFuZG9tQnl0ZXMoMzIpLnRvU3RyaW5nKCdoZXgnKTtcblxuICBsZXQgZW5naW5lS2luZDogU2VydmVIYW5kbGVbJ2VuZ2luZUtpbmQnXTtcbiAgbGV0IGVuZ2luZTtcbiAgbGV0IHRva2VuU3RvcmU6IFRva2VuU3RvcmU7XG4gIGlmIChvcHRpb25zLmRhdGFEaXIgIT09IHVuZGVmaW5lZCkge1xuICAgIG1rZGlyU3luYyhvcHRpb25zLmRhdGFEaXIsIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xuICAgIGNvbnN0IHsgY3JlYXRlUGdTeW5jRW5naW5lIH0gPSBhd2FpdCBpbXBvcnQoJ0BvYWhzL2RiJyk7XG4gICAgZW5naW5lID0gY3JlYXRlUGdTeW5jRW5naW5lKHsgZGF0YURpcjogam9pbihvcHRpb25zLmRhdGFEaXIsICdwZycpIH0pO1xuICAgIHRva2VuU3RvcmUgPSBuZXcgVG9rZW5TdG9yZSh7IHBlcnNpc3RQYXRoOiBqb2luKG9wdGlvbnMuZGF0YURpciwgJ3Rva2Vucy5qc29uJykgfSk7XG4gICAgZW5naW5lS2luZCA9ICdwZ2xpdGUnO1xuICB9IGVsc2Uge1xuICAgIGVuZ2luZSA9IGNyZWF0ZU1lbW9yeUVuZ2luZSgpO1xuICAgIHRva2VuU3RvcmUgPSBuZXcgVG9rZW5TdG9yZSgpO1xuICAgIGVuZ2luZUtpbmQgPSAnbWVtb3J5JztcbiAgfVxuXG4gIGNvbnN0IGFwcCA9IGF3YWl0IGJ1aWxkU2VydmVyKHsgZW5naW5lLCB0b2tlblN0b3JlLCBhZG1pblRva2VuIH0pO1xuICBhd2FpdCBhcHAubGlzdGVuKHsgcG9ydDogb3B0aW9ucy5wb3J0ID8/IERFRkFVTFRfUE9SVCwgaG9zdDogb3B0aW9ucy5ob3N0ID8/ICcwLjAuMC4wJyB9KTtcbiAgY29uc3QgeyBwb3J0IH0gPSBhcHAuc2VydmVyLmFkZHJlc3MoKSBhcyBBZGRyZXNzSW5mbztcblxuICByZXR1cm4ge1xuICAgIHVybDogYGh0dHA6Ly8xMjcuMC4wLjE6JHtwb3J0fWAsXG4gICAgcG9ydCxcbiAgICBhZG1pblRva2VuLFxuICAgIGFkbWluVG9rZW5HZW5lcmF0ZWQsXG4gICAgZW5naW5lS2luZCxcbiAgICBjbG9zZTogYXN5bmMgKCkgPT4ge1xuICAgICAgYXdhaXQgYXBwLmNsb3NlKCk7XG4gICAgfSxcbiAgfTtcbn1cbiIsICIvKipcbiAqIEBvYWhzL3NwaW5lLWFwaSBcdTIwMTQgSFRUUCArIE1DUCBzdXJmYWNlcyBvdmVyIHRoZSBvbmUgY29tbWFuZCBidXMuXG4gKlxuICogRW52IGlzIHJlYWQgT05MWSBoZXJlIChzdGFydCgpLCBmb3IgdGhlIENMSSBlbnRyeXBvaW50KTsgdGhlIGxpYnJhcnlcbiAqIG1vZHVsZXMgdGFrZSBldmVyeXRoaW5nIGFzIHBhcmFtZXRlcnMuXG4gKi9cbmltcG9ydCB7IGNyZWF0ZU1lbW9yeUVuZ2luZSB9IGZyb20gJ0BvYWhzL2NvcmUnO1xuXG5pbXBvcnQgeyBUb2tlblN0b3JlIH0gZnJvbSAnLi9hdXRoLmpzJztcbmltcG9ydCB7IGJ1aWxkU2VydmVyIH0gZnJvbSAnLi9zZXJ2ZXIuanMnO1xuXG5leHBvcnQgeyBUb2tlblN0b3JlLCB0eXBlIFJlc29sdmVkVG9rZW4gfSBmcm9tICcuL2F1dGguanMnO1xuZXhwb3J0IHsgY3JlYXRlQ29tbWFuZEJ1cyB9IGZyb20gJy4vYnVzLmpzJztcbmV4cG9ydCB7IGJ1aWxkU2VydmVyLCBlcnJvckVudmVsb3BlLCBlcnJvck5hbWUsIHR5cGUgQnVpbGRTZXJ2ZXJPcHRpb25zIH0gZnJvbSAnLi9zZXJ2ZXIuanMnO1xuZXhwb3J0IHsgYnVpbGRNY3BTZXJ2ZXIsIHJlZ2lzdGVyTWNwUm91dGUgfSBmcm9tICcuL21jcC5qcyc7XG5leHBvcnQge1xuICBwb2xsaW5nRXZlbnRUYWlsLFxuICByZWdpc3RlckV2ZW50U3RyZWFtLFxuICB0eXBlIEV2ZW50U3RyZWFtT3B0aW9ucyxcbiAgdHlwZSBFdmVudFRhaWwsXG59IGZyb20gJy4vc3NlLmpzJztcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHN0YXJ0KCk6IFByb21pc2U8dm9pZD4ge1xuICBjb25zdCBwb3J0ID0gTnVtYmVyKHByb2Nlc3MuZW52WydQT1JUJ10gPz8gJzMwMDAnKTtcbiAgY29uc3QgYWRtaW5Ub2tlbiA9IHByb2Nlc3MuZW52WydPQUhTX0FETUlOX1RPS0VOJ107XG4gIGlmIChhZG1pblRva2VuID09PSB1bmRlZmluZWQgfHwgYWRtaW5Ub2tlbi5sZW5ndGggPT09IDApIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ09BSFNfQURNSU5fVE9LRU4gbXVzdCBiZSBzZXQgKGJvb3RzdHJhcCBhZG1pbiBjcmVkZW50aWFsKScpO1xuICB9XG4gIGNvbnN0IHBlcnNpc3RQYXRoID0gcHJvY2Vzcy5lbnZbJ09BSFNfVE9LRU5fU1RPUkVfUEFUSCddO1xuICBjb25zdCB0b2tlblN0b3JlID0gbmV3IFRva2VuU3RvcmUocGVyc2lzdFBhdGggIT09IHVuZGVmaW5lZCA/IHsgcGVyc2lzdFBhdGggfSA6IHt9KTtcbiAgY29uc3QgZW5naW5lID0gY3JlYXRlTWVtb3J5RW5naW5lKCk7XG4gIGNvbnN0IGFwcCA9IGF3YWl0IGJ1aWxkU2VydmVyKHsgZW5naW5lLCB0b2tlblN0b3JlLCBhZG1pblRva2VuIH0pO1xuICBhd2FpdCBhcHAubGlzdGVuKHsgcG9ydCwgaG9zdDogJzAuMC4wLjAnIH0pO1xuICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICBjb25zb2xlLmxvZyhgb2FocyBzcGluZS1hcGkgbGlzdGVuaW5nIG9uIDoke3BvcnR9IChIVFRQIC9ycGMvKiwgTUNQIC9tY3ApYCk7XG59XG4iLCAiLyoqXG4gKiBUb2tlblN0b3JlIFx1MjAxNCBiZWFyZXItdG9rZW4gYXV0aGVudGljYXRpb24gZm9yIGJvdGggc3VyZmFjZXMgKEhUVFAgKyBNQ1ApLlxuICpcbiAqIFRva2VucyBhcmUgb3BhcXVlIDMyLWJ5dGUgcmFuZG9tIGhleCBzdHJpbmdzOyBvbmx5IHRoZWlyIHNoYTI1NiBoYXNoIGlzXG4gKiBzdG9yZWQgKGFuZCBvcHRpb25hbGx5IHBlcnNpc3RlZCksIHNvIGEgbGVha2VkIHN0b3JlIGZpbGUgbmV2ZXIgbGVha3MgYVxuICogdXNhYmxlIGNyZWRlbnRpYWwuIFRoZSBib290c3RyYXAgYWRtaW4gdG9rZW4gYXJyaXZlcyBhcyBhIFBBUkFNRVRFUiBcdTIwMTQgdGhpc1xuICogbW9kdWxlIG5ldmVyIHJlYWRzIHRoZSBlbnZpcm9ubWVudCAoZW52IGhhbmRsaW5nIGxpdmVzIGluIGluZGV4LnRzIHN0YXJ0KCkpLlxuICovXG5pbXBvcnQgeyBjcmVhdGVIYXNoLCByYW5kb21CeXRlcyB9IGZyb20gJ25vZGU6Y3J5cHRvJztcbmltcG9ydCB7IGV4aXN0c1N5bmMsIG1rZGlyU3luYywgcmVhZEZpbGVTeW5jLCB3cml0ZUZpbGVTeW5jIH0gZnJvbSAnbm9kZTpmcyc7XG5pbXBvcnQgeyBkaXJuYW1lIH0gZnJvbSAnbm9kZTpwYXRoJztcblxuZXhwb3J0IGludGVyZmFjZSBSZXNvbHZlZFRva2VuIHtcbiAgYWN0b3JJZDogc3RyaW5nO1xuICBpc0FkbWluOiBib29sZWFuO1xufVxuXG5pbnRlcmZhY2UgUGVyc2lzdFNoYXBlIHtcbiAgdmVyc2lvbjogMTtcbiAgdG9rZW5zOiBSZWNvcmQ8c3RyaW5nLCBSZXNvbHZlZFRva2VuPjsgLy8gc2hhMjU2KHRva2VuKSBoZXggLT4gcmVjb3JkXG4gIC8qKlxuICAgKiBQaGFzZSAyIChyb2FkbWFwIFx1MDBBNzMpOiB0aGUgUkVBTCBlbmdpbmUgYWN0b3IgdGhlIGJvb3RzdHJhcCBhZG1pbiB0b2tlblxuICAgKiBhY3RzIGFzICgnV29ya3NwYWNlIEFkbWluJywgZ292ZXJuYW5jZSByb2xlICdhZG1pbicpLiBQZXJzaXN0ZWQgc28gYVxuICAgKiBgLS1kYXRhYCByZXN0YXJ0IHJldXNlcyB0aGUgc2FtZSBhY3RvciBpbnN0ZWFkIG9mIG1pbnRpbmcgYSBuZXcgb25lLlxuICAgKi9cbiAgYWRtaW5BY3RvcklkPzogc3RyaW5nO1xufVxuXG5mdW5jdGlvbiBoYXNoVG9rZW4odG9rZW46IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBjcmVhdGVIYXNoKCdzaGEyNTYnKS51cGRhdGUodG9rZW4sICd1dGY4JykuZGlnZXN0KCdoZXgnKTtcbn1cblxuZXhwb3J0IGNsYXNzIFRva2VuU3RvcmUge1xuICBwcml2YXRlIHJlYWRvbmx5IGJ5SGFzaCA9IG5ldyBNYXA8c3RyaW5nLCBSZXNvbHZlZFRva2VuPigpO1xuICBwcml2YXRlIHJlYWRvbmx5IHBlcnNpc3RQYXRoOiBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gIHByaXZhdGUgYWRtaW5BY3RvcklkOiBzdHJpbmcgfCB1bmRlZmluZWQ7XG5cbiAgY29uc3RydWN0b3Iob3B0aW9ucz86IHsgcGVyc2lzdFBhdGg/OiBzdHJpbmcgfSkge1xuICAgIHRoaXMucGVyc2lzdFBhdGggPSBvcHRpb25zPy5wZXJzaXN0UGF0aDtcbiAgICBpZiAodGhpcy5wZXJzaXN0UGF0aCAhPT0gdW5kZWZpbmVkICYmIGV4aXN0c1N5bmModGhpcy5wZXJzaXN0UGF0aCkpIHtcbiAgICAgIGNvbnN0IHJhdyA9IEpTT04ucGFyc2UocmVhZEZpbGVTeW5jKHRoaXMucGVyc2lzdFBhdGgsICd1dGY4JykpIGFzIFBlcnNpc3RTaGFwZTtcbiAgICAgIGZvciAoY29uc3QgW2hhc2gsIHJlY29yZF0gb2YgT2JqZWN0LmVudHJpZXMocmF3LnRva2VucykpIHtcbiAgICAgICAgdGhpcy5ieUhhc2guc2V0KGhhc2gsIHsgYWN0b3JJZDogcmVjb3JkLmFjdG9ySWQsIGlzQWRtaW46IHJlY29yZC5pc0FkbWluIH0pO1xuICAgICAgfVxuICAgICAgdGhpcy5hZG1pbkFjdG9ySWQgPSByYXcuYWRtaW5BY3RvcklkO1xuICAgIH1cbiAgfVxuXG4gIC8qKiBQZXJzaXN0ZWQgZW5naW5lLWFjdG9yIGlkIHRoZSBib290c3RyYXAgYWRtaW4gdG9rZW4gbWFwcyB0byAoaWYgYW55KS4gKi9cbiAgZ2V0QWRtaW5BY3RvcklkKCk6IHN0cmluZyB8IHVuZGVmaW5lZCB7XG4gICAgcmV0dXJuIHRoaXMuYWRtaW5BY3RvcklkO1xuICB9XG5cbiAgLyoqIFJlbWVtYmVyIChhbmQgcGVyc2lzdCkgdGhlIGJvb3RzdHJhcCBhZG1pbiBhY3RvciBtYXBwaW5nLiAqL1xuICBzZXRBZG1pbkFjdG9ySWQoYWN0b3JJZDogc3RyaW5nKTogdm9pZCB7XG4gICAgdGhpcy5hZG1pbkFjdG9ySWQgPSBhY3RvcklkO1xuICAgIHRoaXMuc2F2ZSgpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlZ2lzdGVyIHRoZSBib290c3RyYXAgYWRtaW4gdG9rZW4gKHN1cnZpdmVzIHJlc3RhcnRzIGJ5IHJlLWJvb3RzdHJhcCxcbiAgICogbm90IHBlcnNpc3RlbmNlIFx1MjAxNCB0aGUgYWRtaW4gY3JlZGVudGlhbCBpcyBjb25maWd1cmF0aW9uLCBub3Qgc3RhdGUpLlxuICAgKi9cbiAgYm9vdHN0cmFwQWRtaW4odG9rZW46IHN0cmluZywgYWN0b3JJZCA9ICdhZG1pbicpOiB2b2lkIHtcbiAgICB0aGlzLmJ5SGFzaC5zZXQoaGFzaFRva2VuKHRva2VuKSwgeyBhY3RvcklkLCBpc0FkbWluOiB0cnVlIH0pO1xuICB9XG5cbiAgLyoqIElzc3VlIGEgZnJlc2ggdG9rZW4gZm9yIGFuIGFjdG9yLiBUaGUgcGxhaW50ZXh0IGlzIHJldHVybmVkIGV4YWN0bHkgb25jZS4gKi9cbiAgaXNzdWUoYWN0b3JJZDogc3RyaW5nKTogc3RyaW5nIHtcbiAgICBjb25zdCB0b2tlbiA9IHJhbmRvbUJ5dGVzKDMyKS50b1N0cmluZygnaGV4Jyk7XG4gICAgdGhpcy5ieUhhc2guc2V0KGhhc2hUb2tlbih0b2tlbiksIHsgYWN0b3JJZCwgaXNBZG1pbjogZmFsc2UgfSk7XG4gICAgdGhpcy5zYXZlKCk7XG4gICAgcmV0dXJuIHRva2VuO1xuICB9XG5cbiAgcmVzb2x2ZSh0b2tlbjogc3RyaW5nKTogUmVzb2x2ZWRUb2tlbiB8IG51bGwge1xuICAgIGNvbnN0IHJlY29yZCA9IHRoaXMuYnlIYXNoLmdldChoYXNoVG9rZW4odG9rZW4pKTtcbiAgICByZXR1cm4gcmVjb3JkID8geyAuLi5yZWNvcmQgfSA6IG51bGw7XG4gIH1cblxuICBwcml2YXRlIHNhdmUoKTogdm9pZCB7XG4gICAgaWYgKHRoaXMucGVyc2lzdFBhdGggPT09IHVuZGVmaW5lZCkgcmV0dXJuO1xuICAgIGNvbnN0IHNoYXBlOiBQZXJzaXN0U2hhcGUgPSB7XG4gICAgICB2ZXJzaW9uOiAxLFxuICAgICAgdG9rZW5zOiB7fSxcbiAgICAgIC4uLih0aGlzLmFkbWluQWN0b3JJZCAhPT0gdW5kZWZpbmVkID8geyBhZG1pbkFjdG9ySWQ6IHRoaXMuYWRtaW5BY3RvcklkIH0gOiB7fSksXG4gICAgfTtcbiAgICBmb3IgKGNvbnN0IFtoYXNoLCByZWNvcmRdIG9mIHRoaXMuYnlIYXNoKSB7XG4gICAgICAvLyBBZG1pbiBib290c3RyYXAgZW50cmllcyBhcmUgY29uZmlndXJhdGlvbjsgcGVyc2lzdCBvbmx5IGlzc3VlZCB0b2tlbnMuXG4gICAgICBpZiAocmVjb3JkLmlzQWRtaW4pIGNvbnRpbnVlO1xuICAgICAgc2hhcGUudG9rZW5zW2hhc2hdID0geyAuLi5yZWNvcmQgfTtcbiAgICB9XG4gICAgbWtkaXJTeW5jKGRpcm5hbWUodGhpcy5wZXJzaXN0UGF0aCksIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xuICAgIHdyaXRlRmlsZVN5bmModGhpcy5wZXJzaXN0UGF0aCwgSlNPTi5zdHJpbmdpZnkoc2hhcGUsIG51bGwsIDIpLCAndXRmOCcpO1xuICB9XG59XG4iLCAiLyoqXG4gKiBGYXN0aWZ5IEhUVFAgYWRhcHRlcjogUE9TVCAvcnBjLzxjb21tYW5kPiBcdTIwMTQgYSB0aGluIHBhcnNlciBpbiBmcm9udCBvZiB0aGVcbiAqIGNvbW1hbmQgYnVzLiBFdmVyeSByZWplY3Rpb24gY3Jvc3NlcyB0aGUgd2lyZSBhcyB0aGUgY29udHJhY3RzIGVudmVsb3BlLFxuICogc3RhdHVzLW1hcHBlZCBieSBIVFRQX1NUQVRVUyBzbyBlcnJvciBzZW1hbnRpY3Mgc3Vydml2ZSB0aGUgdHJhbnNwb3J0LlxuICovXG5pbXBvcnQgRmFzdGlmeSwgeyB0eXBlIEZhc3RpZnlJbnN0YW5jZSwgdHlwZSBGYXN0aWZ5UmVxdWVzdCB9IGZyb20gJ2Zhc3RpZnknO1xuaW1wb3J0IHtcbiAgQ29uZmxpY3RFcnJvcixcbiAgR3VhcmRGYWlsZWRFcnJvcixcbiAgSW52YWxpZFRyYW5zaXRpb25FcnJvcixcbiAgUGVybWlzc2lvbkRlbmllZEVycm9yLFxuICBTdG9yaWVzVmFsaWRhdGlvbkVycm9yLFxuICB0eXBlIFNwaW5lRW5naW5lLFxufSBmcm9tICdAb2Focy9jb3JlJztcbmltcG9ydCB7XG4gIENPTU1BTkRfTUFQLFxuICBIVFRQX1NUQVRVUyxcbiAgdHlwZSBBY3RvckNvbnRleHQsXG4gIHR5cGUgRXJyb3JFbnZlbG9wZSxcbn0gZnJvbSAnQG9haHMvY29udHJhY3RzJztcblxuaW1wb3J0IHR5cGUgeyBUb2tlblN0b3JlIH0gZnJvbSAnLi9hdXRoLmpzJztcbmltcG9ydCB7IGNyZWF0ZUNvbW1hbmRCdXMgfSBmcm9tICcuL2J1cy5qcyc7XG5pbXBvcnQgeyByZWdpc3Rlck1jcFJvdXRlIH0gZnJvbSAnLi9tY3AuanMnO1xuaW1wb3J0IHsgcG9sbGluZ0V2ZW50VGFpbCwgcmVnaXN0ZXJFdmVudFN0cmVhbSwgdHlwZSBFdmVudFN0cmVhbU9wdGlvbnMgfSBmcm9tICcuL3NzZS5qcyc7XG5pbXBvcnQgeyByZWdpc3RlclVpUm91dGVzIH0gZnJvbSAnLi91aS5qcyc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgQnVpbGRTZXJ2ZXJPcHRpb25zIHtcbiAgZW5naW5lOiBTcGluZUVuZ2luZTtcbiAgdG9rZW5TdG9yZTogVG9rZW5TdG9yZTtcbiAgLyoqIEJvb3RzdHJhcCBhZG1pbiBjcmVkZW50aWFsIFx1MjAxNCBwYXNzZWQgaW4sIG5ldmVyIHJlYWQgZnJvbSBlbnYgaGVyZS4gKi9cbiAgYWRtaW5Ub2tlbjogc3RyaW5nO1xuICAvKiogU1NFIHJlbGF5IGtub2JzIChwb2xsL2hlYXJ0YmVhdCBpbnRlcnZhbHMpIFx1MjAxNCBkZWZhdWx0cyBhcmUgcHJvZHVjdGlvbiB2YWx1ZXMuICovXG4gIGV2ZW50U3RyZWFtPzogRXZlbnRTdHJlYW1PcHRpb25zO1xufVxuXG4vKiogTWFwIGEgdGhyb3duIGNvcmUgZXJyb3Igb250byB0aGUgd2lyZSBlcnJvciB0YXhvbm9teS4gKi9cbmV4cG9ydCBmdW5jdGlvbiBlcnJvck5hbWUoZXJyb3I6IHVua25vd24pOiBFcnJvckVudmVsb3BlWydlcnJvciddWyduYW1lJ10ge1xuICBpZiAoZXJyb3IgaW5zdGFuY2VvZiBQZXJtaXNzaW9uRGVuaWVkRXJyb3IpIHJldHVybiAnUGVybWlzc2lvbkRlbmllZEVycm9yJztcbiAgaWYgKGVycm9yIGluc3RhbmNlb2YgQ29uZmxpY3RFcnJvcikgcmV0dXJuICdDb25mbGljdEVycm9yJztcbiAgaWYgKGVycm9yIGluc3RhbmNlb2YgR3VhcmRGYWlsZWRFcnJvcikgcmV0dXJuICdHdWFyZEZhaWxlZEVycm9yJztcbiAgaWYgKGVycm9yIGluc3RhbmNlb2YgSW52YWxpZFRyYW5zaXRpb25FcnJvcikgcmV0dXJuICdJbnZhbGlkVHJhbnNpdGlvbkVycm9yJztcbiAgaWYgKGVycm9yIGluc3RhbmNlb2YgU3Rvcmllc1ZhbGlkYXRpb25FcnJvcikgcmV0dXJuICdTdG9yaWVzVmFsaWRhdGlvbkVycm9yJztcbiAgcmV0dXJuICdFcnJvcic7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBlcnJvckVudmVsb3BlKGVycm9yOiB1bmtub3duKTogRXJyb3JFbnZlbG9wZSB7XG4gIHJldHVybiB7XG4gICAgb2s6IGZhbHNlLFxuICAgIGVycm9yOiB7XG4gICAgICBuYW1lOiBlcnJvck5hbWUoZXJyb3IpLFxuICAgICAgbWVzc2FnZTogZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpLFxuICAgIH0sXG4gIH07XG59XG5cbi8qKlxuICogUGhhc2UgMiBib290c3RyYXAgKHJvYWRtYXAgXHUwMEE3Myk6IHRoZSBhZG1pbiB0b2tlbiBtdXN0IHJlc29sdmUgdG8gYSBSRUFMXG4gKiBlbmdpbmUgYWN0b3IgaG9sZGluZyBnb3Zlcm5hbmNlIHJvbGUgJ2FkbWluJyBcdTIwMTQgZ2F0ZWQgZW50aXRsZW1lbnQgd3JpdGVzXG4gKiAoYXNzaWduX3JvbGUvc2V0X3BsYW4vc2V0XypfcG9saWN5L1x1MjAyNikgYXJlIGF1dGhvcml6ZWQgYnkgdGhlIEVOR0lORSBmcm9tXG4gKiB0aGF0IHJvbGUsIG5ldmVyIGJ5IHRoZSB0cmFuc3BvcnQncyBpc0FkbWluIGZsYWcuIFRoZSBtYXBwaW5nIHBlcnNpc3RzIGluXG4gKiB0aGUgVG9rZW5TdG9yZSwgc28gYSBgLS1kYXRhYCByZXN0YXJ0IHJldXNlcyB0aGUgc2FtZSAnV29ya3NwYWNlIEFkbWluJ1xuICogYWN0b3I7IHdoZW4gdGhlIGVuZ2luZSBjYW5ub3QgY29uZmlybSB0aGUgcGVyc2lzdGVkIHJvbGUgKGZyZXNoIGVuZ2luZSwgb3JcbiAqIGEgcGVyc2lzdGVuY2UgbGF5ZXIgdGhhdCBwcmVkYXRlcyBQaGFzZSAyKSwgYSBmcmVzaCBib290c3RyYXAgYWN0b3IgaXNcbiAqIGNyZWF0ZWQgaW5zdGVhZC5cbiAqL1xuZnVuY3Rpb24gZW5zdXJlQm9vdHN0cmFwQWRtaW5BY3RvcihlbmdpbmU6IFNwaW5lRW5naW5lLCB0b2tlblN0b3JlOiBUb2tlblN0b3JlKTogc3RyaW5nIHtcbiAgY29uc3QgcGVyc2lzdGVkID0gdG9rZW5TdG9yZS5nZXRBZG1pbkFjdG9ySWQoKTtcbiAgaWYgKHBlcnNpc3RlZCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgdHJ5IHtcbiAgICAgIGlmIChlbmdpbmUuZ2V0R292ZXJuYW5jZVJvbGUocGVyc2lzdGVkKSA9PT0gJ2FkbWluJykgcmV0dXJuIHBlcnNpc3RlZDtcbiAgICB9IGNhdGNoIHtcbiAgICAgIC8vIGZhbGwgdGhyb3VnaDogdGhlIGVuZ2luZSBjYW5ub3Qgdm91Y2ggZm9yIHRoZSBwZXJzaXN0ZWQgbWFwcGluZ1xuICAgIH1cbiAgfVxuICBjb25zdCBhY3RvciA9IGVuZ2luZS5jcmVhdGVBY3Rvcih7XG4gICAgdHlwZTogJ3VzZXInLFxuICAgIGRpc3BsYXlOYW1lOiAnV29ya3NwYWNlIEFkbWluJyxcbiAgICBnb3Zlcm5hbmNlUm9sZTogJ2FkbWluJyxcbiAgfSk7XG4gIHRva2VuU3RvcmUuc2V0QWRtaW5BY3RvcklkKGFjdG9yLmlkKTtcbiAgcmV0dXJuIGFjdG9yLmlkO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gYnVpbGRTZXJ2ZXIob3B0aW9uczogQnVpbGRTZXJ2ZXJPcHRpb25zKTogUHJvbWlzZTxGYXN0aWZ5SW5zdGFuY2U+IHtcbiAgY29uc3QgeyBlbmdpbmUsIHRva2VuU3RvcmUsIGFkbWluVG9rZW4gfSA9IG9wdGlvbnM7XG4gIHRva2VuU3RvcmUuYm9vdHN0cmFwQWRtaW4oYWRtaW5Ub2tlbiwgZW5zdXJlQm9vdHN0cmFwQWRtaW5BY3RvcihlbmdpbmUsIHRva2VuU3RvcmUpKTtcbiAgY29uc3QgYnVzID0gY3JlYXRlQ29tbWFuZEJ1cyhlbmdpbmUsIHRva2VuU3RvcmUpO1xuXG4gIGNvbnN0IGFwcCA9IEZhc3RpZnkoeyBsb2dnZXI6IGZhbHNlIH0pO1xuXG4gIGNvbnN0IGF1dGhlbnRpY2F0ZSA9IChyZXF1ZXN0OiBGYXN0aWZ5UmVxdWVzdCk6IEFjdG9yQ29udGV4dCB8IG51bGwgPT4ge1xuICAgIGNvbnN0IGhlYWRlciA9IHJlcXVlc3QuaGVhZGVycy5hdXRob3JpemF0aW9uO1xuICAgIGlmICh0eXBlb2YgaGVhZGVyICE9PSAnc3RyaW5nJyB8fCAhaGVhZGVyLnN0YXJ0c1dpdGgoJ0JlYXJlciAnKSkgcmV0dXJuIG51bGw7XG4gICAgY29uc3QgcmVzb2x2ZWQgPSB0b2tlblN0b3JlLnJlc29sdmUoaGVhZGVyLnNsaWNlKCdCZWFyZXIgJy5sZW5ndGgpLnRyaW0oKSk7XG4gICAgcmV0dXJuIHJlc29sdmVkID09PSBudWxsID8gbnVsbCA6IHsgYWN0b3JJZDogcmVzb2x2ZWQuYWN0b3JJZCwgaXNBZG1pbjogcmVzb2x2ZWQuaXNBZG1pbiB9O1xuICB9O1xuXG4gIGFwcC5nZXQoJy9oZWFsdGh6JywgYXN5bmMgKCkgPT4gKHsgb2s6IHRydWUgfSkpO1xuXG4gIGFwcC5wb3N0KCcvcnBjLzpjb21tYW5kJywgYXN5bmMgKHJlcXVlc3QsIHJlcGx5KSA9PiB7XG4gICAgY29uc3QgY3R4ID0gYXV0aGVudGljYXRlKHJlcXVlc3QpO1xuICAgIGlmIChjdHggPT09IG51bGwpIHtcbiAgICAgIHJldHVybiByZXBseS5jb2RlKDQwMSkuc2VuZCh7XG4gICAgICAgIG9rOiBmYWxzZSxcbiAgICAgICAgZXJyb3I6IHsgbmFtZTogJ0Vycm9yJywgbWVzc2FnZTogJ3VuYXV0aG9yaXplZDogbWlzc2luZyBvciBpbnZhbGlkIGJlYXJlciB0b2tlbicgfSxcbiAgICAgIH0gc2F0aXNmaWVzIEVycm9yRW52ZWxvcGUpO1xuICAgIH1cbiAgICBjb25zdCB7IGNvbW1hbmQgfSA9IHJlcXVlc3QucGFyYW1zIGFzIHsgY29tbWFuZDogc3RyaW5nIH07XG4gICAgaWYgKCFDT01NQU5EX01BUC5oYXMoY29tbWFuZCkpIHtcbiAgICAgIHJldHVybiByZXBseS5jb2RlKDQwNCkuc2VuZCh7XG4gICAgICAgIG9rOiBmYWxzZSxcbiAgICAgICAgZXJyb3I6IHsgbmFtZTogJ0Vycm9yJywgbWVzc2FnZTogYHVua25vd24gY29tbWFuZDogJHtjb21tYW5kfWAgfSxcbiAgICAgIH0gc2F0aXNmaWVzIEVycm9yRW52ZWxvcGUpO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgYnVzLmV4ZWN1dGUoY29tbWFuZCwgcmVxdWVzdC5ib2R5ID8/IHt9LCBjdHgpO1xuICAgICAgcmV0dXJuIHJlcGx5LmNvZGUoMjAwKS5zZW5kKHsgb2s6IHRydWUsIHJlc3VsdCB9KTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgY29uc3QgZW52ZWxvcGUgPSBlcnJvckVudmVsb3BlKGVycm9yKTtcbiAgICAgIHJldHVybiByZXBseS5jb2RlKEhUVFBfU1RBVFVTW2VudmVsb3BlLmVycm9yLm5hbWVdKS5zZW5kKGVudmVsb3BlKTtcbiAgICB9XG4gIH0pO1xuXG4gIHJlZ2lzdGVyTWNwUm91dGUoYXBwLCBidXMsIGF1dGhlbnRpY2F0ZSk7XG4gIHJlZ2lzdGVyRXZlbnRTdHJlYW0oYXBwLCBwb2xsaW5nRXZlbnRUYWlsKGVuZ2luZSksIGF1dGhlbnRpY2F0ZSwgb3B0aW9ucy5ldmVudFN0cmVhbSA/PyB7fSk7XG4gIHJlZ2lzdGVyVWlSb3V0ZXMoYXBwKTtcblxuICByZXR1cm4gYXBwO1xufVxuIiwgIi8qKlxuICogVGhlIGNvbW1hbmQgYnVzIFx1MjAxNCB0aGUgT05FIHBsYWNlIGNvbW1hbmRzIGV4ZWN1dGUgKHJvYWRtYXAgXHUwMEE3MC4xOiBubyB3cml0ZXNcbiAqIG91dHNpZGUgdGhlIGNvbW1hbmQgYnVzKS4gSFRUUCAoL3JwYy86Y29tbWFuZCkgYW5kIE1DUCAob2Foc18qIHRvb2xzKSBhcmVcbiAqIHRoaW4gcGFyc2VycyBpbiBmcm9udCBvZiBleGVjdXRlKCk7IG5laXRoZXIgY2FycmllcyBpdHMgb3duIGxvZ2ljLlxuICpcbiAqIEFjdG9yIGlkZW50aXR5IEFMV0FZUyBjb21lcyBmcm9tIHRoZSBhdXRoZW50aWNhdGVkIGNvbnRleHQsIG5ldmVyIGZyb20gdGhlXG4gKiByZXF1ZXN0IGJvZHkgXHUyMDE0IGEgbGlmZWN5Y2xlIGNvbW1hbmQgY2FuIG9ubHkgYWN0IGFzIHRoZSBhY3RvciB3aG9zZSB0b2tlblxuICogc2lnbmVkIHRoZSByZXF1ZXN0LlxuICovXG5pbXBvcnQge1xuICBHdWFyZEZhaWxlZEVycm9yLFxuICBQZXJtaXNzaW9uRGVuaWVkRXJyb3IsXG4gIHR5cGUgQWN0b3JUeXBlLFxuICB0eXBlIEFnZW50Sm9iLFxuICB0eXBlIEJsb2NrZWRSZWFzb24sXG4gIHR5cGUgRXZpZGVuY2UsXG4gIHR5cGUgR2F0ZUNvZGUsXG4gIHR5cGUgR292ZXJuYW5jZVJvbGUsXG4gIHR5cGUgUGVybWlzc2lvbixcbiAgdHlwZSBQbGFuQ29kZSxcbiAgdHlwZSBTcGluZUVuZ2luZSxcbiAgdHlwZSBUaHJlYWRLaW5kLFxuICB0eXBlIFRocmVhZFZpc2liaWxpdHksXG4gIHR5cGUgV29ya0l0ZW1LaW5kLFxuICB0eXBlIFdvcmtJdGVtU3RhdGUsXG59IGZyb20gJ0BvYWhzL2NvcmUnO1xuaW1wb3J0IHsgQ09NTUFORF9NQVAsIHR5cGUgQWN0b3JDb250ZXh0LCB0eXBlIENvbW1hbmRCdXMsIHR5cGUgQ29tbWFuZE5hbWUgfSBmcm9tICdAb2Focy9jb250cmFjdHMnO1xuXG5pbXBvcnQgdHlwZSB7IFRva2VuU3RvcmUgfSBmcm9tICcuL2F1dGguanMnO1xuXG4vLyBQYXJzZWQtaW5wdXQgc2hhcGVzIChtaXJyb3IgdGhlIHpvZCBzY2hlbWFzIGluIEBvYWhzL2NvbnRyYWN0czsgdGhlIHpvZFxuLy8gcGFyc2UgaW4gZXhlY3V0ZSgpIGlzIHRoZSBydW50aW1lIGd1YXJhbnRlZSwgdGhlc2UgYXJlIHRoZSBzdGF0aWMgdmlldykuXG5pbnRlcmZhY2UgQ3JlYXRlQWN0b3JJbiB7IHR5cGU6ICd1c2VyJyB8ICdhZ2VudCc7IGRpc3BsYXlOYW1lOiBzdHJpbmc7IGdvdmVybmFuY2VSb2xlPzogR292ZXJuYW5jZVJvbGUgfCB1bmRlZmluZWQgfVxuaW50ZXJmYWNlIEdyYW50SW4geyBhY3RvcklkOiBzdHJpbmc7IHBlcm1pc3Npb246IHN0cmluZzsgc2NvcGU/OiBzdHJpbmcgfCB1bmRlZmluZWQgfVxuaW50ZXJmYWNlIFJvbGVJbiB7IGFjdG9ySWQ6IHN0cmluZzsgcm9sZUNvZGU6IHN0cmluZyB9XG5pbnRlcmZhY2UgTGlzdFJvbGVBc3NpZ25tZW50c0luIHsgYWN0b3JJZD86IHN0cmluZyB8IHVuZGVmaW5lZCB9XG5pbnRlcmZhY2UgU2V0R292ZXJuYW5jZVJvbGVJbiB7IGFjdG9ySWQ6IHN0cmluZzsgcm9sZTogR292ZXJuYW5jZVJvbGUgfVxuaW50ZXJmYWNlIFNldFBsYW5JbiB7IHBsYW46IFBsYW5Db2RlIH1cbmludGVyZmFjZSBTZXRXb3Jrc3BhY2VQb2xpY3lJbiB7XG4gIHBvbGljeTogeyBhZ2VudEdhdGVBcHByb3ZhbHM/OiBib29sZWFuIHwgdW5kZWZpbmVkOyBhZ2VudFNlbGZEaXNwYXRjaD86IGJvb2xlYW4gfCB1bmRlZmluZWQgfTtcbn1cbmludGVyZmFjZSBTZXRHYXRlUG9saWN5SW4ge1xuICBnYXRlOiBHYXRlQ29kZTtcbiAgcG9saWN5OiB7IG1pbkFwcHJvdmFscz86IG51bWJlciB8IHVuZGVmaW5lZDsgcmVxdWlyZWRBY3RvclR5cGVzPzogQWN0b3JUeXBlW10gfCB1bmRlZmluZWQgfTtcbn1cbmludGVyZmFjZSBBdXRoekV4cGxhaW5JbiB7IGFjdG9ySWQ6IHN0cmluZzsgcGVybWlzc2lvbjogc3RyaW5nIH1cbmludGVyZmFjZSBJbXBvcnRTdG9yaWVzSW4geyBmZWF0dXJlSWQ6IHN0cmluZzsgeWFtbDogc3RyaW5nIH1cbmludGVyZmFjZSBDcmVhdGVXb3JrSXRlbUluIHtcbiAgZmVhdHVyZUlkOiBzdHJpbmc7XG4gIGV4dGVybmFsS2V5OiBzdHJpbmc7XG4gIHRpdGxlOiBzdHJpbmc7XG4gIGtpbmQ/OiBXb3JrSXRlbUtpbmQgfCB1bmRlZmluZWQ7XG4gIHNwZWNDaGVja3BvaW50PzogYm9vbGVhbiB8IHVuZGVmaW5lZDtcbiAgZG9uZUNoZWNrcG9pbnQ/OiBib29sZWFuIHwgdW5kZWZpbmVkO1xuICBpbnZva2VEZXZXaXRoPzogc3RyaW5nIHwgdW5kZWZpbmVkO1xuICBkZXBlbmRzT24/OiBzdHJpbmdbXSB8IHVuZGVmaW5lZDtcbn1cbmludGVyZmFjZSBDbGFpbVRhc2tJbiB7IHdvcmtJdGVtSWQ6IHN0cmluZzsgdHRsTXM/OiBudW1iZXIgfCB1bmRlZmluZWQgfVxuaW50ZXJmYWNlIEhlYXJ0YmVhdEluIHsgY2xhaW1JZDogc3RyaW5nIH1cbmludGVyZmFjZSBSZWxlYXNlQ2xhaW1JbiB7IGNsYWltSWQ6IHN0cmluZzsgcmVhc29uPzogc3RyaW5nIHwgdW5kZWZpbmVkIH1cbmludGVyZmFjZSBBZHZhbmNlSW4geyB3b3JrSXRlbUlkOiBzdHJpbmc7IHRvOiBXb3JrSXRlbVN0YXRlOyBmZW5jaW5nVG9rZW4/OiBudW1iZXIgfCB1bmRlZmluZWQ7IGlkZW1wb3RlbmN5S2V5Pzogc3RyaW5nIHwgdW5kZWZpbmVkIH1cbmludGVyZmFjZSBCbG9ja0luIHsgd29ya0l0ZW1JZDogc3RyaW5nOyByZWFzb246IEJsb2NrZWRSZWFzb247IGZlbmNpbmdUb2tlbj86IG51bWJlciB8IHVuZGVmaW5lZCB9XG5pbnRlcmZhY2UgV29ya0l0ZW1JbiB7IHdvcmtJdGVtSWQ6IHN0cmluZyB9XG5pbnRlcmZhY2UgU3VibWl0RXZpZGVuY2VJbiB7IHdvcmtJdGVtSWQ6IHN0cmluZzsgZXZpZGVuY2U6IEV2aWRlbmNlOyBmZW5jaW5nVG9rZW4/OiBudW1iZXIgfCB1bmRlZmluZWQgfVxuaW50ZXJmYWNlIEFwcHJvdmVHYXRlSW4geyB3b3JrSXRlbUlkOiBzdHJpbmc7IGdhdGU6IEdhdGVDb2RlOyBwaW5uZWRWZXJpZmljYXRpb24/OiBzdHJpbmdbXSB8IHVuZGVmaW5lZCB9XG5pbnRlcmZhY2UgUmVqZWN0R2F0ZUluIHsgd29ya0l0ZW1JZDogc3RyaW5nOyBnYXRlOiBHYXRlQ29kZSB9XG5pbnRlcmZhY2UgRmVhdHVyZUluIHsgZmVhdHVyZUlkOiBzdHJpbmcgfVxuaW50ZXJmYWNlIExpc3RXb3JrSXRlbXNJbiB7IHN0YXRlPzogV29ya0l0ZW1TdGF0ZSB8IHVuZGVmaW5lZDsgZmVhdHVyZUlkPzogc3RyaW5nIHwgdW5kZWZpbmVkOyBjbGFpbWFibGU/OiBib29sZWFuIHwgdW5kZWZpbmVkIH1cbmludGVyZmFjZSBRdWVyeUV2ZW50c0luIHsgc3RyZWFtSWQ/OiBzdHJpbmcgfCB1bmRlZmluZWQgfVxuaW50ZXJmYWNlIENyZWF0ZVRocmVhZEluIHtcbiAga2luZDogVGhyZWFkS2luZDtcbiAgZmVhdHVyZUlkPzogc3RyaW5nIHwgdW5kZWZpbmVkO1xuICB3b3JrSXRlbUlkPzogc3RyaW5nIHwgdW5kZWZpbmVkO1xuICB2aXNpYmlsaXR5PzogVGhyZWFkVmlzaWJpbGl0eSB8IHVuZGVmaW5lZDtcbn1cbmludGVyZmFjZSBBZGRUaHJlYWRQYXJ0aWNpcGFudEluIHsgdGhyZWFkSWQ6IHN0cmluZzsgYWN0b3JJZDogc3RyaW5nIH1cbmludGVyZmFjZSBQb3N0TWVzc2FnZUluIHtcbiAgdGhyZWFkSWQ6IHN0cmluZztcbiAgYm9keTogc3RyaW5nO1xuICByZXBseVRvPzogc3RyaW5nIHwgdW5kZWZpbmVkO1xuICBtZW50aW9ucz86IHN0cmluZ1tdIHwgdW5kZWZpbmVkO1xufVxuaW50ZXJmYWNlIExpc3RUaHJlYWRzSW4geyBmZWF0dXJlSWQ/OiBzdHJpbmcgfCB1bmRlZmluZWQ7IHdvcmtJdGVtSWQ/OiBzdHJpbmcgfCB1bmRlZmluZWQgfVxuaW50ZXJmYWNlIExpc3RNZXNzYWdlc0luIHsgdGhyZWFkSWQ6IHN0cmluZzsgc2luY2VTZXE/OiBudW1iZXIgfCB1bmRlZmluZWQgfVxuaW50ZXJmYWNlIExpc3RNZW50aW9uc0luIHsgbWVzc2FnZUlkOiBzdHJpbmcgfVxuaW50ZXJmYWNlIExpc3ROb3RpZmljYXRpb25zSW4geyB1bnJlYWRPbmx5PzogYm9vbGVhbiB8IHVuZGVmaW5lZCB9XG5pbnRlcmZhY2UgTWFya05vdGlmaWNhdGlvblJlYWRJbiB7IG5vdGlmaWNhdGlvbklkOiBzdHJpbmcgfVxuaW50ZXJmYWNlIExpc3RBZ2VudEpvYnNJbiB7IGFnZW50QWN0b3JJZD86IHN0cmluZyB8IHVuZGVmaW5lZDsgc3RhdHVzPzogQWdlbnRKb2JbJ3N0YXR1cyddIHwgdW5kZWZpbmVkIH1cbmludGVyZmFjZSBDb21wbGV0ZUFnZW50Sm9iSW4geyBqb2JJZDogc3RyaW5nOyBzdGF0dXM6ICdkb25lJyB8ICdibG9ja2VkJzsgbm90ZT86IHN0cmluZyB8IHVuZGVmaW5lZCB9XG5pbnRlcmZhY2UgUmVjb25jaWxlSW4geyBmaWxlczogQXJyYXk8eyB3b3JrSXRlbUlkOiBzdHJpbmc7IGZyb250bWF0dGVyU3RhdHVzOiBzdHJpbmcgfT4gfVxuXG4vKiogQ29tcGFjdCBvbmUtbGluZSBzdW1tYXJ5IG9mIHpvZCBpc3N1ZXMgKGR1Y2stdHlwZWQ6IHpvZCBjb3BpZXMgbWF5IGRpZmZlcikuICovXG5mdW5jdGlvbiB6b2RNZXNzYWdlKGVycm9yOiB1bmtub3duKTogc3RyaW5nIHtcbiAgY29uc3QgaXNzdWVzID0gKGVycm9yIGFzIHsgaXNzdWVzPzogQXJyYXk8eyBwYXRoPzogQXJyYXk8c3RyaW5nIHwgbnVtYmVyPjsgbWVzc2FnZT86IHN0cmluZyB9PiB9KVxuICAgIC5pc3N1ZXM7XG4gIGlmICghQXJyYXkuaXNBcnJheShpc3N1ZXMpKSByZXR1cm4gU3RyaW5nKGVycm9yKTtcbiAgcmV0dXJuIGlzc3Vlc1xuICAgIC5tYXAoKGlzc3VlKSA9PiB7XG4gICAgICBjb25zdCBwYXRoID0gaXNzdWUucGF0aCAmJiBpc3N1ZS5wYXRoLmxlbmd0aCA+IDAgPyBpc3N1ZS5wYXRoLmpvaW4oJy4nKSA6ICcocm9vdCknO1xuICAgICAgcmV0dXJuIGAke3BhdGh9OiAke2lzc3VlLm1lc3NhZ2UgPz8gJ2ludmFsaWQnfWA7XG4gICAgfSlcbiAgICAuam9pbignOyAnKTtcbn1cblxuZnVuY3Rpb24gcmVxdWlyZUFkbWluKGN0eDogQWN0b3JDb250ZXh0LCBjb21tYW5kOiBzdHJpbmcpOiB2b2lkIHtcbiAgaWYgKCFjdHguaXNBZG1pbikge1xuICAgIHRocm93IG5ldyBQZXJtaXNzaW9uRGVuaWVkRXJyb3IoYGFkbWluOiR7Y29tbWFuZH1gIGFzIFBlcm1pc3Npb24sIGN0eC5hY3RvcklkKTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlQ29tbWFuZEJ1cyhlbmdpbmU6IFNwaW5lRW5naW5lLCB0b2tlbnM6IFRva2VuU3RvcmUpOiBDb21tYW5kQnVzIHtcbiAgYXN5bmMgZnVuY3Rpb24gZXhlY3V0ZShjb21tYW5kOiBzdHJpbmcsIGlucHV0OiB1bmtub3duLCBjdHg6IEFjdG9yQ29udGV4dCk6IFByb21pc2U8dW5rbm93bj4ge1xuICAgIGNvbnN0IGRlZiA9IENPTU1BTkRfTUFQLmdldChjb21tYW5kKTtcbiAgICBpZiAoIWRlZikgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoYHVua25vd24gY29tbWFuZDogJHtjb21tYW5kfWApO1xuXG4gICAgY29uc3QgcGFyc2VkUmVzdWx0ID0gZGVmLmlucHV0LnNhZmVQYXJzZShpbnB1dCA/PyB7fSk7XG4gICAgaWYgKCFwYXJzZWRSZXN1bHQuc3VjY2Vzcykge1xuICAgICAgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoYGludmFsaWQgaW5wdXQgZm9yICR7Y29tbWFuZH06ICR7em9kTWVzc2FnZShwYXJzZWRSZXN1bHQuZXJyb3IpfWApO1xuICAgIH1cbiAgICBjb25zdCBwYXJzZWQ6IHVua25vd24gPSBwYXJzZWRSZXN1bHQuZGF0YTtcblxuICAgIHN3aXRjaCAoY29tbWFuZCBhcyBDb21tYW5kTmFtZSkge1xuICAgICAgLy8gLS0gc2V0dXAgLyBhZG1pbiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICAgY2FzZSAnY3JlYXRlX2FjdG9yJzoge1xuICAgICAgICAvLyBjcmVhdGVfYWN0b3Igc3RheXMgYWRtaW4tdG9rZW4tZ2F0ZWQgKGJvb3RzdHJhcCBwbHVtYmluZyksIHdoaWNoXG4gICAgICAgIC8vIGFsc28gbWFrZXMgaXQgdGhlIG9ubHkgY3R4IGFsbG93ZWQgdG8gcGFzcyBnb3Zlcm5hbmNlUm9sZS5cbiAgICAgICAgcmVxdWlyZUFkbWluKGN0eCwgY29tbWFuZCk7XG4gICAgICAgIGNvbnN0IHAgPSBwYXJzZWQgYXMgQ3JlYXRlQWN0b3JJbjtcbiAgICAgICAgY29uc3QgYWN0b3IgPSBlbmdpbmUuY3JlYXRlQWN0b3Ioe1xuICAgICAgICAgIHR5cGU6IHAudHlwZSxcbiAgICAgICAgICBkaXNwbGF5TmFtZTogcC5kaXNwbGF5TmFtZSxcbiAgICAgICAgICAuLi4ocC5nb3Zlcm5hbmNlUm9sZSAhPT0gdW5kZWZpbmVkID8geyBnb3Zlcm5hbmNlUm9sZTogcC5nb3Zlcm5hbmNlUm9sZSB9IDoge30pLFxuICAgICAgICB9KTtcbiAgICAgICAgY29uc3QgdG9rZW4gPSB0b2tlbnMuaXNzdWUoYWN0b3IuaWQpO1xuICAgICAgICByZXR1cm4geyBhY3RvciwgdG9rZW4gfTtcbiAgICAgIH1cbiAgICAgIGNhc2UgJ2dyYW50X3Blcm1pc3Npb24nOiB7XG4gICAgICAgIHJlcXVpcmVBZG1pbihjdHgsIGNvbW1hbmQpO1xuICAgICAgICBjb25zdCBwID0gcGFyc2VkIGFzIEdyYW50SW47XG4gICAgICAgIGVuZ2luZS5ncmFudCh7XG4gICAgICAgICAgYWN0b3JJZDogcC5hY3RvcklkLFxuICAgICAgICAgIHBlcm1pc3Npb246IHAucGVybWlzc2lvbiBhcyBQZXJtaXNzaW9uLFxuICAgICAgICAgIC4uLihwLnNjb3BlICE9PSB1bmRlZmluZWQgPyB7IHNjb3BlOiBwLnNjb3BlIH0gOiB7fSksXG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4geyBncmFudGVkOiB0cnVlIH07XG4gICAgICB9XG4gICAgICBjYXNlICdyZXZva2VfcGVybWlzc2lvbic6IHtcbiAgICAgICAgcmVxdWlyZUFkbWluKGN0eCwgY29tbWFuZCk7XG4gICAgICAgIGNvbnN0IHAgPSBwYXJzZWQgYXMgR3JhbnRJbjtcbiAgICAgICAgZW5naW5lLnJldm9rZSh7XG4gICAgICAgICAgYWN0b3JJZDogcC5hY3RvcklkLFxuICAgICAgICAgIHBlcm1pc3Npb246IHAucGVybWlzc2lvbiBhcyBQZXJtaXNzaW9uLFxuICAgICAgICAgIC4uLihwLnNjb3BlICE9PSB1bmRlZmluZWQgPyB7IHNjb3BlOiBwLnNjb3BlIH0gOiB7fSksXG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4geyByZXZva2VkOiB0cnVlIH07XG4gICAgICB9XG4gICAgICBjYXNlICdjcmVhdGVfZmVhdHVyZSc6IHtcbiAgICAgICAgcmV0dXJuIGVuZ2luZS5jcmVhdGVGZWF0dXJlKHsgYWN0b3JJZDogY3R4LmFjdG9ySWQgfSk7XG4gICAgICB9XG4gICAgICBjYXNlICdjcmVhdGVfd29ya19pdGVtJzoge1xuICAgICAgICAvLyBDcmVhdG9yIGlkZW50aXR5IGZyb20gY3R4OyBraW5kIGRlZmF1bHRzIHRvICdjb2RlJyBpbiB0aGUgZW5naW5lLlxuICAgICAgICBjb25zdCBwID0gcGFyc2VkIGFzIENyZWF0ZVdvcmtJdGVtSW47XG4gICAgICAgIHJldHVybiBlbmdpbmUuY3JlYXRlV29ya0l0ZW0oe1xuICAgICAgICAgIGZlYXR1cmVJZDogcC5mZWF0dXJlSWQsXG4gICAgICAgICAgZXh0ZXJuYWxLZXk6IHAuZXh0ZXJuYWxLZXksXG4gICAgICAgICAgdGl0bGU6IHAudGl0bGUsXG4gICAgICAgICAgYWN0b3JJZDogY3R4LmFjdG9ySWQsXG4gICAgICAgICAgLi4uKHAua2luZCAhPT0gdW5kZWZpbmVkID8geyBraW5kOiBwLmtpbmQgfSA6IHt9KSxcbiAgICAgICAgICAuLi4ocC5zcGVjQ2hlY2twb2ludCAhPT0gdW5kZWZpbmVkID8geyBzcGVjQ2hlY2twb2ludDogcC5zcGVjQ2hlY2twb2ludCB9IDoge30pLFxuICAgICAgICAgIC4uLihwLmRvbmVDaGVja3BvaW50ICE9PSB1bmRlZmluZWQgPyB7IGRvbmVDaGVja3BvaW50OiBwLmRvbmVDaGVja3BvaW50IH0gOiB7fSksXG4gICAgICAgICAgLi4uKHAuaW52b2tlRGV2V2l0aCAhPT0gdW5kZWZpbmVkID8geyBpbnZva2VEZXZXaXRoOiBwLmludm9rZURldldpdGggfSA6IHt9KSxcbiAgICAgICAgICAuLi4ocC5kZXBlbmRzT24gIT09IHVuZGVmaW5lZCA/IHsgZGVwZW5kc09uOiBwLmRlcGVuZHNPbiB9IDoge30pLFxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIGNhc2UgJ2xpc3RfYWN0b3JzJzoge1xuICAgICAgICByZXR1cm4gZW5naW5lLmxpc3RBY3RvcnMoKTtcbiAgICAgIH1cbiAgICAgIGNhc2UgJ3Byb3Zpc2lvbl9wZXJzb25hcyc6IHtcbiAgICAgICAgLy8gR2F0ZWQgYnkgRU5HSU5FIGdvdmVybmFuY2UgKHJlcXVpcmVHb3Zlcm5hbmNlQWRtaW4gb24gYnlBY3RvcklkKSBcdTIwMTRcbiAgICAgICAgLy8gdGhlIGJ1cyBuZXZlciBwcmUtY2hlY2tzIGFkbWluIGhlcmUsIG1pcnJvcmluZyB0aGUgXHUwMEE3MyBncm91cC5cbiAgICAgICAgcmV0dXJuIGVuZ2luZS5wcm92aXNpb25QZXJzb25hcyh7IGJ5QWN0b3JJZDogY3R4LmFjdG9ySWQgfSk7XG4gICAgICB9XG5cbiAgICAgIC8vIC0tIGVudGl0bGVtZW50cyAoUGhhc2UgMiwgcm9hZG1hcCBcdTAwQTczKSAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICAvLyBObyByZXF1aXJlQWRtaW4gaGVyZTogYXV0aG9yaXR5IGlzIGRlY2lkZWQgYnkgdGhlIEVOR0lORSBmcm9tIHRoZVxuICAgICAgLy8gY2FsbGVyJ3MgZ292ZXJuYW5jZSByb2xlIChieUFjdG9ySWQgPSB0aGUgYXV0aGVudGljYXRlZCBhY3RvcikuXG4gICAgICBjYXNlICdhc3NpZ25fcm9sZSc6IHtcbiAgICAgICAgY29uc3QgcCA9IHBhcnNlZCBhcyBSb2xlSW47XG4gICAgICAgIGVuZ2luZS5hc3NpZ25Sb2xlKHsgYWN0b3JJZDogcC5hY3RvcklkLCByb2xlQ29kZTogcC5yb2xlQ29kZSwgYnlBY3RvcklkOiBjdHguYWN0b3JJZCB9KTtcbiAgICAgICAgcmV0dXJuIHsgYXNzaWduZWQ6IHRydWUgfTtcbiAgICAgIH1cbiAgICAgIGNhc2UgJ3Jldm9rZV9yb2xlJzoge1xuICAgICAgICBjb25zdCBwID0gcGFyc2VkIGFzIFJvbGVJbjtcbiAgICAgICAgZW5naW5lLnJldm9rZVJvbGUoeyBhY3RvcklkOiBwLmFjdG9ySWQsIHJvbGVDb2RlOiBwLnJvbGVDb2RlLCBieUFjdG9ySWQ6IGN0eC5hY3RvcklkIH0pO1xuICAgICAgICByZXR1cm4geyByZXZva2VkOiB0cnVlIH07XG4gICAgICB9XG4gICAgICBjYXNlICdsaXN0X3JvbGVfYXNzaWdubWVudHMnOiB7XG4gICAgICAgIGNvbnN0IHAgPSBwYXJzZWQgYXMgTGlzdFJvbGVBc3NpZ25tZW50c0luO1xuICAgICAgICByZXR1cm4gZW5naW5lLmxpc3RSb2xlQXNzaWdubWVudHMocC5hY3RvcklkKTtcbiAgICAgIH1cbiAgICAgIGNhc2UgJ3NldF9nb3Zlcm5hbmNlX3JvbGUnOiB7XG4gICAgICAgIGNvbnN0IHAgPSBwYXJzZWQgYXMgU2V0R292ZXJuYW5jZVJvbGVJbjtcbiAgICAgICAgZW5naW5lLnNldEdvdmVybmFuY2VSb2xlKHsgYWN0b3JJZDogcC5hY3RvcklkLCByb2xlOiBwLnJvbGUsIGJ5QWN0b3JJZDogY3R4LmFjdG9ySWQgfSk7XG4gICAgICAgIHJldHVybiB7IGFjdG9ySWQ6IHAuYWN0b3JJZCwgcm9sZTogcC5yb2xlIH07XG4gICAgICB9XG4gICAgICBjYXNlICdzZXRfcGxhbic6IHtcbiAgICAgICAgY29uc3QgcCA9IHBhcnNlZCBhcyBTZXRQbGFuSW47XG4gICAgICAgIGVuZ2luZS5zZXRQbGFuKHsgcGxhbjogcC5wbGFuLCBieUFjdG9ySWQ6IGN0eC5hY3RvcklkIH0pO1xuICAgICAgICByZXR1cm4geyBwbGFuOiBlbmdpbmUuZ2V0UGxhbigpIH07XG4gICAgICB9XG4gICAgICBjYXNlICdzZXRfd29ya3NwYWNlX3BvbGljeSc6IHtcbiAgICAgICAgY29uc3QgcCA9IHBhcnNlZCBhcyBTZXRXb3Jrc3BhY2VQb2xpY3lJbjtcbiAgICAgICAgZW5naW5lLnNldFdvcmtzcGFjZVBvbGljeSh7XG4gICAgICAgICAgcG9saWN5OiB7XG4gICAgICAgICAgICAuLi4ocC5wb2xpY3kuYWdlbnRHYXRlQXBwcm92YWxzICE9PSB1bmRlZmluZWRcbiAgICAgICAgICAgICAgPyB7IGFnZW50R2F0ZUFwcHJvdmFsczogcC5wb2xpY3kuYWdlbnRHYXRlQXBwcm92YWxzIH1cbiAgICAgICAgICAgICAgOiB7fSksXG4gICAgICAgICAgICAuLi4ocC5wb2xpY3kuYWdlbnRTZWxmRGlzcGF0Y2ggIT09IHVuZGVmaW5lZFxuICAgICAgICAgICAgICA/IHsgYWdlbnRTZWxmRGlzcGF0Y2g6IHAucG9saWN5LmFnZW50U2VsZkRpc3BhdGNoIH1cbiAgICAgICAgICAgICAgOiB7fSksXG4gICAgICAgICAgfSxcbiAgICAgICAgICBieUFjdG9ySWQ6IGN0eC5hY3RvcklkLFxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIGVuZ2luZS5nZXRXb3Jrc3BhY2VQb2xpY3koKTtcbiAgICAgIH1cbiAgICAgIGNhc2UgJ3NldF9nYXRlX3BvbGljeSc6IHtcbiAgICAgICAgY29uc3QgcCA9IHBhcnNlZCBhcyBTZXRHYXRlUG9saWN5SW47XG4gICAgICAgIGVuZ2luZS5zZXRHYXRlUG9saWN5KHtcbiAgICAgICAgICBnYXRlOiBwLmdhdGUsXG4gICAgICAgICAgcG9saWN5OiB7XG4gICAgICAgICAgICAuLi4ocC5wb2xpY3kubWluQXBwcm92YWxzICE9PSB1bmRlZmluZWQgPyB7IG1pbkFwcHJvdmFsczogcC5wb2xpY3kubWluQXBwcm92YWxzIH0gOiB7fSksXG4gICAgICAgICAgICAuLi4ocC5wb2xpY3kucmVxdWlyZWRBY3RvclR5cGVzICE9PSB1bmRlZmluZWRcbiAgICAgICAgICAgICAgPyB7IHJlcXVpcmVkQWN0b3JUeXBlczogWy4uLnAucG9saWN5LnJlcXVpcmVkQWN0b3JUeXBlc10gfVxuICAgICAgICAgICAgICA6IHt9KSxcbiAgICAgICAgICB9LFxuICAgICAgICAgIGJ5QWN0b3JJZDogY3R4LmFjdG9ySWQsXG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4geyBnYXRlOiBwLmdhdGUsIHBvbGljeTogZW5naW5lLmdldEdhdGVQb2xpY3kocC5nYXRlKSB9O1xuICAgICAgfVxuICAgICAgY2FzZSAnYXV0aHpfZXhwbGFpbic6IHtcbiAgICAgICAgY29uc3QgcCA9IHBhcnNlZCBhcyBBdXRoekV4cGxhaW5JbjtcbiAgICAgICAgcmV0dXJuIGVuZ2luZS5hdXRoekV4cGxhaW4oeyBhY3RvcklkOiBwLmFjdG9ySWQsIHBlcm1pc3Npb246IHAucGVybWlzc2lvbiBhcyBQZXJtaXNzaW9uIH0pO1xuICAgICAgfVxuICAgICAgY2FzZSAnaW1wb3J0X3N0b3JpZXMnOiB7XG4gICAgICAgIGNvbnN0IHAgPSBwYXJzZWQgYXMgSW1wb3J0U3Rvcmllc0luO1xuICAgICAgICByZXR1cm4gZW5naW5lLmltcG9ydFN0b3JpZXMoeyBmZWF0dXJlSWQ6IHAuZmVhdHVyZUlkLCB5YW1sOiBwLnlhbWwsIGFjdG9ySWQ6IGN0eC5hY3RvcklkIH0pO1xuICAgICAgfVxuXG4gICAgICAvLyAtLSBjbGFpbXMgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgIGNhc2UgJ2NsYWltX3Rhc2snOiB7XG4gICAgICAgIGNvbnN0IHAgPSBwYXJzZWQgYXMgQ2xhaW1UYXNrSW47XG4gICAgICAgIHJldHVybiBlbmdpbmUuY2xhaW1UYXNrKHtcbiAgICAgICAgICB3b3JrSXRlbUlkOiBwLndvcmtJdGVtSWQsXG4gICAgICAgICAgYWN0b3JJZDogY3R4LmFjdG9ySWQsXG4gICAgICAgICAgLi4uKHAudHRsTXMgIT09IHVuZGVmaW5lZCA/IHsgdHRsTXM6IHAudHRsTXMgfSA6IHt9KSxcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICBjYXNlICdoZWFydGJlYXQnOiB7XG4gICAgICAgIGNvbnN0IHAgPSBwYXJzZWQgYXMgSGVhcnRiZWF0SW47XG4gICAgICAgIGVuZ2luZS5oZWFydGJlYXQoeyBjbGFpbUlkOiBwLmNsYWltSWQgfSk7XG4gICAgICAgIHJldHVybiB7IHJlbmV3ZWQ6IHRydWUgfTtcbiAgICAgIH1cbiAgICAgIGNhc2UgJ3JlbGVhc2VfY2xhaW0nOiB7XG4gICAgICAgIGNvbnN0IHAgPSBwYXJzZWQgYXMgUmVsZWFzZUNsYWltSW47XG4gICAgICAgIGVuZ2luZS5yZWxlYXNlQ2xhaW0oe1xuICAgICAgICAgIGNsYWltSWQ6IHAuY2xhaW1JZCxcbiAgICAgICAgICAuLi4ocC5yZWFzb24gIT09IHVuZGVmaW5lZCA/IHsgcmVhc29uOiBwLnJlYXNvbiB9IDoge30pLFxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHsgcmVsZWFzZWQ6IHRydWUgfTtcbiAgICAgIH1cblxuICAgICAgLy8gLS0gbGlmZWN5Y2xlIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgIGNhc2UgJ2FkdmFuY2Vfc3RhdGUnOiB7XG4gICAgICAgIGNvbnN0IHAgPSBwYXJzZWQgYXMgQWR2YW5jZUluO1xuICAgICAgICByZXR1cm4gZW5naW5lLmFkdmFuY2VTdGF0ZSh7XG4gICAgICAgICAgd29ya0l0ZW1JZDogcC53b3JrSXRlbUlkLFxuICAgICAgICAgIHRvOiBwLnRvIGFzIFdvcmtJdGVtU3RhdGUsXG4gICAgICAgICAgYWN0b3JJZDogY3R4LmFjdG9ySWQsXG4gICAgICAgICAgLi4uKHAuZmVuY2luZ1Rva2VuICE9PSB1bmRlZmluZWQgPyB7IGZlbmNpbmdUb2tlbjogcC5mZW5jaW5nVG9rZW4gfSA6IHt9KSxcbiAgICAgICAgICAuLi4ocC5pZGVtcG90ZW5jeUtleSAhPT0gdW5kZWZpbmVkID8geyBpZGVtcG90ZW5jeUtleTogcC5pZGVtcG90ZW5jeUtleSB9IDoge30pLFxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIGNhc2UgJ2Jsb2NrX3Rhc2snOiB7XG4gICAgICAgIGNvbnN0IHAgPSBwYXJzZWQgYXMgQmxvY2tJbjtcbiAgICAgICAgcmV0dXJuIGVuZ2luZS5ibG9ja1Rhc2soe1xuICAgICAgICAgIHdvcmtJdGVtSWQ6IHAud29ya0l0ZW1JZCxcbiAgICAgICAgICByZWFzb246IHAucmVhc29uLFxuICAgICAgICAgIGFjdG9ySWQ6IGN0eC5hY3RvcklkLFxuICAgICAgICAgIC4uLihwLmZlbmNpbmdUb2tlbiAhPT0gdW5kZWZpbmVkID8geyBmZW5jaW5nVG9rZW46IHAuZmVuY2luZ1Rva2VuIH0gOiB7fSksXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgY2FzZSAndW5ibG9ja190YXNrJzoge1xuICAgICAgICBjb25zdCBwID0gcGFyc2VkIGFzIFdvcmtJdGVtSW47XG4gICAgICAgIHJldHVybiBlbmdpbmUudW5ibG9ja1Rhc2soeyB3b3JrSXRlbUlkOiBwLndvcmtJdGVtSWQsIGFjdG9ySWQ6IGN0eC5hY3RvcklkIH0pO1xuICAgICAgfVxuICAgICAgY2FzZSAnc3VibWl0X2V2aWRlbmNlJzoge1xuICAgICAgICBjb25zdCBwID0gcGFyc2VkIGFzIFN1Ym1pdEV2aWRlbmNlSW47XG4gICAgICAgIGVuZ2luZS5zdWJtaXRFdmlkZW5jZSh7XG4gICAgICAgICAgd29ya0l0ZW1JZDogcC53b3JrSXRlbUlkLFxuICAgICAgICAgIGV2aWRlbmNlOiBwLmV2aWRlbmNlIGFzIEV2aWRlbmNlLFxuICAgICAgICAgIGFjdG9ySWQ6IGN0eC5hY3RvcklkLFxuICAgICAgICAgIC4uLihwLmZlbmNpbmdUb2tlbiAhPT0gdW5kZWZpbmVkID8geyBmZW5jaW5nVG9rZW46IHAuZmVuY2luZ1Rva2VuIH0gOiB7fSksXG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4geyBzdWJtaXR0ZWQ6IHRydWUgfTtcbiAgICAgIH1cbiAgICAgIGNhc2UgJ2FwcHJvdmVfZ2F0ZSc6IHtcbiAgICAgICAgY29uc3QgcCA9IHBhcnNlZCBhcyBBcHByb3ZlR2F0ZUluO1xuICAgICAgICByZXR1cm4gZW5naW5lLmFwcHJvdmVHYXRlKHtcbiAgICAgICAgICB3b3JrSXRlbUlkOiBwLndvcmtJdGVtSWQsXG4gICAgICAgICAgZ2F0ZTogcC5nYXRlLFxuICAgICAgICAgIGFjdG9ySWQ6IGN0eC5hY3RvcklkLFxuICAgICAgICAgIC4uLihwLnBpbm5lZFZlcmlmaWNhdGlvbiAhPT0gdW5kZWZpbmVkXG4gICAgICAgICAgICA/IHsgcGlubmVkVmVyaWZpY2F0aW9uOiBwLnBpbm5lZFZlcmlmaWNhdGlvbiB9XG4gICAgICAgICAgICA6IHt9KSxcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICBjYXNlICdyZWplY3RfZ2F0ZSc6IHtcbiAgICAgICAgY29uc3QgcCA9IHBhcnNlZCBhcyBSZWplY3RHYXRlSW47XG4gICAgICAgIHJldHVybiBlbmdpbmUucmVqZWN0R2F0ZSh7IHdvcmtJdGVtSWQ6IHAud29ya0l0ZW1JZCwgZ2F0ZTogcC5nYXRlLCBhY3RvcklkOiBjdHguYWN0b3JJZCB9KTtcbiAgICAgIH1cbiAgICAgIGNhc2UgJ3JlbGVhc2VfZGlzcGF0Y2hfaG9sZCc6IHtcbiAgICAgICAgY29uc3QgcCA9IHBhcnNlZCBhcyBGZWF0dXJlSW47XG4gICAgICAgIHJldHVybiBlbmdpbmUucmVsZWFzZURpc3BhdGNoSG9sZCh7IGZlYXR1cmVJZDogcC5mZWF0dXJlSWQsIGFjdG9ySWQ6IGN0eC5hY3RvcklkIH0pO1xuICAgICAgfVxuXG4gICAgICAvLyAtLSBjb2xsYWJvcmF0aW9uIChQaGFzZSAzLCByb2FkbWFwIFx1MDBBNzUpIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgIC8vIEFjdG9yIGlkZW50aXR5IEFMV0FZUyBmcm9tIGN0eDogdGhlIHBvc3RlciwgcmVhZGVyLCBub3RpZmljYXRpb24gb3duZXJcbiAgICAgIC8vIGFuZCBqb2IgY29tcGxldGVyIGFyZSB0aGUgYXV0aGVudGljYXRlZCBhY3RvciBcdTIwMTQgbmV2ZXIgYSBib2R5IGZpZWxkLlxuICAgICAgY2FzZSAnY3JlYXRlX3RocmVhZCc6IHtcbiAgICAgICAgY29uc3QgcCA9IHBhcnNlZCBhcyBDcmVhdGVUaHJlYWRJbjtcbiAgICAgICAgcmV0dXJuIGVuZ2luZS5jcmVhdGVUaHJlYWQoe1xuICAgICAgICAgIGFjdG9ySWQ6IGN0eC5hY3RvcklkLFxuICAgICAgICAgIGtpbmQ6IHAua2luZCxcbiAgICAgICAgICAuLi4ocC5mZWF0dXJlSWQgIT09IHVuZGVmaW5lZCA/IHsgZmVhdHVyZUlkOiBwLmZlYXR1cmVJZCB9IDoge30pLFxuICAgICAgICAgIC4uLihwLndvcmtJdGVtSWQgIT09IHVuZGVmaW5lZCA/IHsgd29ya0l0ZW1JZDogcC53b3JrSXRlbUlkIH0gOiB7fSksXG4gICAgICAgICAgLi4uKHAudmlzaWJpbGl0eSAhPT0gdW5kZWZpbmVkID8geyB2aXNpYmlsaXR5OiBwLnZpc2liaWxpdHkgfSA6IHt9KSxcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICBjYXNlICdhZGRfdGhyZWFkX3BhcnRpY2lwYW50Jzoge1xuICAgICAgICBjb25zdCBwID0gcGFyc2VkIGFzIEFkZFRocmVhZFBhcnRpY2lwYW50SW47XG4gICAgICAgIHJldHVybiBlbmdpbmUuYWRkVGhyZWFkUGFydGljaXBhbnQoe1xuICAgICAgICAgIHRocmVhZElkOiBwLnRocmVhZElkLFxuICAgICAgICAgIGFjdG9ySWQ6IHAuYWN0b3JJZCxcbiAgICAgICAgICBieUFjdG9ySWQ6IGN0eC5hY3RvcklkLFxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIGNhc2UgJ3Bvc3RfbWVzc2FnZSc6IHtcbiAgICAgICAgY29uc3QgcCA9IHBhcnNlZCBhcyBQb3N0TWVzc2FnZUluO1xuICAgICAgICByZXR1cm4gZW5naW5lLnBvc3RNZXNzYWdlKHtcbiAgICAgICAgICB0aHJlYWRJZDogcC50aHJlYWRJZCxcbiAgICAgICAgICBhY3RvcklkOiBjdHguYWN0b3JJZCxcbiAgICAgICAgICBib2R5OiBwLmJvZHksXG4gICAgICAgICAgLi4uKHAucmVwbHlUbyAhPT0gdW5kZWZpbmVkID8geyByZXBseVRvOiBwLnJlcGx5VG8gfSA6IHt9KSxcbiAgICAgICAgICAuLi4ocC5tZW50aW9ucyAhPT0gdW5kZWZpbmVkID8geyBtZW50aW9uczogcC5tZW50aW9ucyB9IDoge30pLFxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIGNhc2UgJ2xpc3RfdGhyZWFkcyc6IHtcbiAgICAgICAgY29uc3QgcCA9IHBhcnNlZCBhcyBMaXN0VGhyZWFkc0luO1xuICAgICAgICByZXR1cm4gZW5naW5lLmxpc3RUaHJlYWRzKHtcbiAgICAgICAgICBhY3RvcklkOiBjdHguYWN0b3JJZCwgLy8gcHJpdmF0ZSB0aHJlYWRzIHN0YXkgaW52aXNpYmxlIHRvIG5vbi1wYXJ0aWNpcGFudHNcbiAgICAgICAgICAuLi4ocC5mZWF0dXJlSWQgIT09IHVuZGVmaW5lZCA/IHsgZmVhdHVyZUlkOiBwLmZlYXR1cmVJZCB9IDoge30pLFxuICAgICAgICAgIC4uLihwLndvcmtJdGVtSWQgIT09IHVuZGVmaW5lZCA/IHsgd29ya0l0ZW1JZDogcC53b3JrSXRlbUlkIH0gOiB7fSksXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgY2FzZSAnbGlzdF9tZXNzYWdlcyc6IHtcbiAgICAgICAgY29uc3QgcCA9IHBhcnNlZCBhcyBMaXN0TWVzc2FnZXNJbjtcbiAgICAgICAgcmV0dXJuIGVuZ2luZS5saXN0TWVzc2FnZXMoe1xuICAgICAgICAgIHRocmVhZElkOiBwLnRocmVhZElkLFxuICAgICAgICAgIGFjdG9ySWQ6IGN0eC5hY3RvcklkLFxuICAgICAgICAgIC4uLihwLnNpbmNlU2VxICE9PSB1bmRlZmluZWQgPyB7IHNpbmNlU2VxOiBwLnNpbmNlU2VxIH0gOiB7fSksXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgY2FzZSAnbGlzdF9tZW50aW9ucyc6IHtcbiAgICAgICAgY29uc3QgcCA9IHBhcnNlZCBhcyBMaXN0TWVudGlvbnNJbjtcbiAgICAgICAgcmV0dXJuIGVuZ2luZS5saXN0TWVudGlvbnMocC5tZXNzYWdlSWQpO1xuICAgICAgfVxuICAgICAgY2FzZSAnbGlzdF9ub3RpZmljYXRpb25zJzoge1xuICAgICAgICBjb25zdCBwID0gcGFyc2VkIGFzIExpc3ROb3RpZmljYXRpb25zSW47XG4gICAgICAgIHJldHVybiBlbmdpbmUubGlzdE5vdGlmaWNhdGlvbnMoe1xuICAgICAgICAgIGFjdG9ySWQ6IGN0eC5hY3RvcklkLFxuICAgICAgICAgIC4uLihwLnVucmVhZE9ubHkgIT09IHVuZGVmaW5lZCA/IHsgdW5yZWFkT25seTogcC51bnJlYWRPbmx5IH0gOiB7fSksXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgY2FzZSAnbWFya19ub3RpZmljYXRpb25fcmVhZCc6IHtcbiAgICAgICAgY29uc3QgcCA9IHBhcnNlZCBhcyBNYXJrTm90aWZpY2F0aW9uUmVhZEluO1xuICAgICAgICBlbmdpbmUubWFya05vdGlmaWNhdGlvblJlYWQoeyBub3RpZmljYXRpb25JZDogcC5ub3RpZmljYXRpb25JZCwgYWN0b3JJZDogY3R4LmFjdG9ySWQgfSk7XG4gICAgICAgIHJldHVybiB7IHJlYWQ6IHRydWUgfTtcbiAgICAgIH1cbiAgICAgIGNhc2UgJ2xpc3RfYWdlbnRfam9icyc6IHtcbiAgICAgICAgY29uc3QgcCA9IHBhcnNlZCBhcyBMaXN0QWdlbnRKb2JzSW47XG4gICAgICAgIHJldHVybiBlbmdpbmUubGlzdEFnZW50Sm9icyh7XG4gICAgICAgICAgLi4uKHAuYWdlbnRBY3RvcklkICE9PSB1bmRlZmluZWQgPyB7IGFnZW50QWN0b3JJZDogcC5hZ2VudEFjdG9ySWQgfSA6IHt9KSxcbiAgICAgICAgICAuLi4ocC5zdGF0dXMgIT09IHVuZGVmaW5lZCA/IHsgc3RhdHVzOiBwLnN0YXR1cyB9IDoge30pLFxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIGNhc2UgJ2NvbXBsZXRlX2FnZW50X2pvYic6IHtcbiAgICAgICAgY29uc3QgcCA9IHBhcnNlZCBhcyBDb21wbGV0ZUFnZW50Sm9iSW47XG4gICAgICAgIHJldHVybiBlbmdpbmUuY29tcGxldGVBZ2VudEpvYih7XG4gICAgICAgICAgam9iSWQ6IHAuam9iSWQsXG4gICAgICAgICAgYWN0b3JJZDogY3R4LmFjdG9ySWQsXG4gICAgICAgICAgc3RhdHVzOiBwLnN0YXR1cyxcbiAgICAgICAgICAuLi4ocC5ub3RlICE9PSB1bmRlZmluZWQgPyB7IG5vdGU6IHAubm90ZSB9IDoge30pLFxuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgLy8gLS0gcmVjb25jaWxpYXRpb24gKHJvYWRtYXAgXHUwMEE3MS42LCBkZXRlY3Qtb25seSkgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICAgY2FzZSAncmVjb25jaWxlJzoge1xuICAgICAgICBjb25zdCBwID0gcGFyc2VkIGFzIFJlY29uY2lsZUluO1xuICAgICAgICByZXR1cm4gZW5naW5lLnJlY29uY2lsZSh7IGZpbGVzOiBwLmZpbGVzIH0pO1xuICAgICAgfVxuXG4gICAgICAvLyAtLSBvcHMgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICBjYXNlICdmb3JjZV9yZWxlYXNlX2NsYWltJzoge1xuICAgICAgICBjb25zdCBwID0gcGFyc2VkIGFzIFdvcmtJdGVtSW47XG4gICAgICAgIGNvbnN0IHVucmVsZWFzZWQgPSBlbmdpbmUuZ2V0Q2xhaW1zKHAud29ya0l0ZW1JZCkuZmlsdGVyKChjbGFpbSkgPT4gIWNsYWltLnJlbGVhc2VkKTtcbiAgICAgICAgaWYgKHVucmVsZWFzZWQubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoYG5vIGxpdmUgY2xhaW0gb24gd29yayBpdGVtICR7cC53b3JrSXRlbUlkfWApO1xuICAgICAgICB9XG4gICAgICAgIGZvciAoY29uc3QgY2xhaW0gb2YgdW5yZWxlYXNlZCkge1xuICAgICAgICAgIGVuZ2luZS5yZWxlYXNlQ2xhaW0oeyBjbGFpbUlkOiBjbGFpbS5pZCwgcmVhc29uOiAnb3BzIGZvcmNlIHJlbGVhc2UnIH0pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB7IHJlbGVhc2VkOiB1bnJlbGVhc2VkLm1hcCgoY2xhaW0pID0+IGNsYWltLmlkKSB9O1xuICAgICAgfVxuXG4gICAgICAvLyAtLSBxdWVyaWVzIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgIGNhc2UgJ2dldF93b3JrX2l0ZW0nOiB7XG4gICAgICAgIGNvbnN0IHAgPSBwYXJzZWQgYXMgV29ya0l0ZW1JbjtcbiAgICAgICAgcmV0dXJuIGVuZ2luZS5nZXRXb3JrSXRlbShwLndvcmtJdGVtSWQpO1xuICAgICAgfVxuICAgICAgY2FzZSAnZ2V0X2ZlYXR1cmUnOiB7XG4gICAgICAgIGNvbnN0IHAgPSBwYXJzZWQgYXMgRmVhdHVyZUluO1xuICAgICAgICByZXR1cm4gZW5naW5lLmdldEZlYXR1cmUocC5mZWF0dXJlSWQpO1xuICAgICAgfVxuICAgICAgY2FzZSAnZ2V0X3Rhc2tfY29udGV4dCc6IHtcbiAgICAgICAgY29uc3QgcCA9IHBhcnNlZCBhcyBXb3JrSXRlbUluO1xuICAgICAgICByZXR1cm4gZW5naW5lLmdldFRhc2tDb250ZXh0KHsgd29ya0l0ZW1JZDogcC53b3JrSXRlbUlkIH0pO1xuICAgICAgfVxuICAgICAgY2FzZSAnbGlzdF93b3JrX2l0ZW1zJzoge1xuICAgICAgICBjb25zdCBwID0gcGFyc2VkIGFzIExpc3RXb3JrSXRlbXNJbjtcbiAgICAgICAgcmV0dXJuIGVuZ2luZS5saXN0V29ya0l0ZW1zKHtcbiAgICAgICAgICAuLi4ocC5zdGF0ZSAhPT0gdW5kZWZpbmVkID8geyBzdGF0ZTogcC5zdGF0ZSBhcyBXb3JrSXRlbVN0YXRlIH0gOiB7fSksXG4gICAgICAgICAgLi4uKHAuZmVhdHVyZUlkICE9PSB1bmRlZmluZWQgPyB7IGZlYXR1cmVJZDogcC5mZWF0dXJlSWQgfSA6IHt9KSxcbiAgICAgICAgICAuLi4ocC5jbGFpbWFibGUgIT09IHVuZGVmaW5lZCA/IHsgY2xhaW1hYmxlOiBwLmNsYWltYWJsZSB9IDoge30pLFxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIGNhc2UgJ2luYm94Jzoge1xuICAgICAgICBjb25zdCBhd2FpdGluZ1NwZWMgPSBlbmdpbmVcbiAgICAgICAgICAubGlzdFdvcmtJdGVtcyh7IHN0YXRlOiAnZHJhZnQnIH0pXG4gICAgICAgICAgLmZpbHRlcigoaXRlbSkgPT4gaXRlbS5zcGVjQ2hlY2twb2ludCk7XG4gICAgICAgIGNvbnN0IGF3YWl0aW5nUmV2aWV3ID0gZW5naW5lLmxpc3RXb3JrSXRlbXMoeyBzdGF0ZTogJ2luX3JldmlldycgfSk7XG4gICAgICAgIHJldHVybiB7IGF3YWl0aW5nU3BlYywgYXdhaXRpbmdSZXZpZXcgfTtcbiAgICAgIH1cbiAgICAgIGNhc2UgJ3F1ZXJ5X2V2ZW50cyc6IHtcbiAgICAgICAgY29uc3QgcCA9IHBhcnNlZCBhcyBRdWVyeUV2ZW50c0luO1xuICAgICAgICByZXR1cm4gZW5naW5lLmV2ZW50cyhwLnN0cmVhbUlkKTtcbiAgICAgIH1cbiAgICAgIGNhc2UgJ2dldF9jbGFpbXMnOiB7XG4gICAgICAgIGNvbnN0IHAgPSBwYXJzZWQgYXMgV29ya0l0ZW1JbjtcbiAgICAgICAgcmV0dXJuIGVuZ2luZS5nZXRDbGFpbXMocC53b3JrSXRlbUlkKTtcbiAgICAgIH1cbiAgICAgIGNhc2UgJ3dob2FtaSc6IHtcbiAgICAgICAgcmV0dXJuIHsgYWN0b3JJZDogY3R4LmFjdG9ySWQsIGlzQWRtaW46IGN0eC5pc0FkbWluIH07XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gVW5yZWFjaGFibGUgd2hpbGUgdGhlIHN3aXRjaCBjb3ZlcnMgdGhlIHJlZ2lzdHJ5OyBrZWVwcyB0aGUgY29tcGlsZXIgaG9uZXN0LlxuICAgIHRocm93IG5ldyBHdWFyZEZhaWxlZEVycm9yKGBjb21tYW5kIG5vdCB3aXJlZCB0byB0aGUgYnVzOiAke2NvbW1hbmR9YCk7XG4gIH1cblxuICByZXR1cm4geyBleGVjdXRlLCBlbmdpbmUgfTtcbn1cbiIsICIvKipcbiAqIE1DUCBhZGFwdGVyIFx1MjAxNCBldmVyeSByZWdpc3RyeSBlbnRyeSBpbiBDT01NQU5EUyBiZWNvbWVzIG9uZSB0b29sOyBldmVyeVxuICogdG9vbCBoYW5kbGVyIGNhbGxzIHRoZSBTQU1FIGJ1cy5leGVjdXRlIHRoZSBIVFRQIHJvdXRlIGNhbGxzLiBObyBsb2dpY1xuICogbGl2ZXMgaGVyZSAocm9hZG1hcCBcdTAwQTcyLjI6IHN0cnVjdHVyYWxseSBpZGVudGljYWwgc2VtYW50aWNzLCBENSkuXG4gKlxuICogREVDSVNJT04gKHJlY29yZGVkKTogd2UgdXNlIHRoZSBsb3ctbGV2ZWwgYFNlcnZlcmAgK1xuICogc2V0UmVxdWVzdEhhbmRsZXIoTGlzdFRvb2xzL0NhbGxUb29sKSBpbnN0ZWFkIG9mIGBNY3BTZXJ2ZXIucmVnaXN0ZXJUb29sYC5cbiAqIFNESyAxLjI5J3MgTWNwU2VydmVyIGFjY2VwdHMgem9kIHNjaGVtYXMgYW5kIHJlLWVtaXRzIEpTT04gU2NoZW1hIHRocm91Z2hcbiAqIGl0cyBvd24gY29tcGF0IGxheWVyICh6b2QgdjQgYnJhbmNoIHRhcmdldHMgZHJhZnQtNyk7IGNvbnRyYWN0cydcbiAqIGlucHV0SnNvblNjaGVtYSgpIGlzIHpvZCB2NCdzIG5hdGl2ZSBkcmFmdC0yMDIwLTEyIGVtaXNzaW9uLiBGZWVkaW5nIHRoZVxuICogY29udHJhY3RzIEpTT04gU2NoZW1hIHZlcmJhdGltIHRocm91Z2ggdGhlIGxvdy1sZXZlbCBBUEkga2VlcHNcbiAqIFwidG9vbCBpbnB1dFNjaGVtYSA9PT0gaW5wdXRKc29uU2NoZW1hKGNvbW1hbmQpXCIgYnl0ZS1pZGVudGljYWwgXHUyMDE0IHBhcml0eSBpc1xuICogYXNzZXJ0ZWQgYnkgZGVlcC1lcXVhbGl0eSBpbiB0ZXN0L3Bhcml0eS50ZXN0LnRzLlxuICovXG5pbXBvcnQgeyBTZXJ2ZXIgfSBmcm9tICdAbW9kZWxjb250ZXh0cHJvdG9jb2wvc2RrL3NlcnZlci9pbmRleC5qcyc7XG5pbXBvcnQgeyBTdHJlYW1hYmxlSFRUUFNlcnZlclRyYW5zcG9ydCB9IGZyb20gJ0Btb2RlbGNvbnRleHRwcm90b2NvbC9zZGsvc2VydmVyL3N0cmVhbWFibGVIdHRwLmpzJztcbmltcG9ydCB7XG4gIENhbGxUb29sUmVxdWVzdFNjaGVtYSxcbiAgTGlzdFRvb2xzUmVxdWVzdFNjaGVtYSxcbiAgdHlwZSBDYWxsVG9vbFJlc3VsdCxcbn0gZnJvbSAnQG1vZGVsY29udGV4dHByb3RvY29sL3Nkay90eXBlcy5qcyc7XG5pbXBvcnQgdHlwZSB7IEZhc3RpZnlJbnN0YW5jZSwgRmFzdGlmeVJlcXVlc3QgfSBmcm9tICdmYXN0aWZ5JztcbmltcG9ydCB7XG4gIENPTU1BTkRTLFxuICBpbnB1dEpzb25TY2hlbWEsXG4gIG1jcFRvb2xOYW1lLFxuICB0eXBlIEFjdG9yQ29udGV4dCxcbiAgdHlwZSBDb21tYW5kQnVzLFxufSBmcm9tICdAb2Focy9jb250cmFjdHMnO1xuXG5pbXBvcnQgeyBlcnJvck5hbWUgfSBmcm9tICcuL3NlcnZlci5qcyc7XG5cbmNvbnN0IFRPT0xfVE9fQ09NTUFORDogUmVhZG9ubHlNYXA8c3RyaW5nLCBzdHJpbmc+ID0gbmV3IE1hcChcbiAgQ09NTUFORFMubWFwKChjb21tYW5kKSA9PiBbbWNwVG9vbE5hbWUoY29tbWFuZC5uYW1lKSwgY29tbWFuZC5uYW1lXSksXG4pO1xuXG4vKipcbiAqIEJ1aWxkIG9uZSBNQ1Agc2VydmVyIGJvdW5kIHRvIGFuIGF1dGhlbnRpY2F0ZWQgYWN0b3IgY29udGV4dC4gU3RhdGVsZXNzXG4gKiBIVFRQIG1vdW50cyBjb25zdHJ1Y3Qgb25lIHBlciByZXF1ZXN0OyB0ZXN0cyB3aXJlIG9uZSB0byBhblxuICogSW5NZW1vcnlUcmFuc3BvcnQgZGlyZWN0bHkuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBidWlsZE1jcFNlcnZlcihidXM6IENvbW1hbmRCdXMsIGN0eDogQWN0b3JDb250ZXh0KTogU2VydmVyIHtcbiAgY29uc3Qgc2VydmVyID0gbmV3IFNlcnZlcihcbiAgICB7IG5hbWU6ICdvYWhzLXNwaW5lJywgdmVyc2lvbjogJzAuMC4xJyB9LFxuICAgIHsgY2FwYWJpbGl0aWVzOiB7IHRvb2xzOiB7fSB9IH0sXG4gICk7XG5cbiAgc2VydmVyLnNldFJlcXVlc3RIYW5kbGVyKExpc3RUb29sc1JlcXVlc3RTY2hlbWEsIGFzeW5jICgpID0+ICh7XG4gICAgdG9vbHM6IENPTU1BTkRTLm1hcCgoY29tbWFuZCkgPT4gKHtcbiAgICAgIG5hbWU6IG1jcFRvb2xOYW1lKGNvbW1hbmQubmFtZSksXG4gICAgICBkZXNjcmlwdGlvbjogY29tbWFuZC5kZXNjcmlwdGlvbixcbiAgICAgIC8vIFZlcmJhdGltIGZyb20gY29udHJhY3RzIFx1MjAxNCB0aGUgcGFyaXR5IHRlc3QgZGVlcC1lcXVhbHMgdGhpcy5cbiAgICAgIGlucHV0U2NoZW1hOiBpbnB1dEpzb25TY2hlbWEoY29tbWFuZC5uYW1lKSBhcyB7IHR5cGU6ICdvYmplY3QnOyBbazogc3RyaW5nXTogdW5rbm93biB9LFxuICAgIH0pKSxcbiAgfSkpO1xuXG4gIHNlcnZlci5zZXRSZXF1ZXN0SGFuZGxlcihDYWxsVG9vbFJlcXVlc3RTY2hlbWEsIGFzeW5jIChyZXF1ZXN0KTogUHJvbWlzZTxDYWxsVG9vbFJlc3VsdD4gPT4ge1xuICAgIGNvbnN0IGNvbW1hbmROYW1lID0gVE9PTF9UT19DT01NQU5ELmdldChyZXF1ZXN0LnBhcmFtcy5uYW1lKTtcbiAgICBpZiAoY29tbWFuZE5hbWUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgY29udGVudDogW3sgdHlwZTogJ3RleHQnLCB0ZXh0OiBgdW5rbm93biB0b29sOiAke3JlcXVlc3QucGFyYW1zLm5hbWV9YCB9XSxcbiAgICAgICAgaXNFcnJvcjogdHJ1ZSxcbiAgICAgIH07XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAvLyBUaGUgZXhhY3Qgc2FtZSBjYWxsIHRoZSBIVFRQIHJvdXRlIG1ha2VzIFx1MjAxNCBubyBNQ1Atb25seSBsb2dpYy5cbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGJ1cy5leGVjdXRlKGNvbW1hbmROYW1lLCByZXF1ZXN0LnBhcmFtcy5hcmd1bWVudHMgPz8ge30sIGN0eCk7XG4gICAgICByZXR1cm4geyBjb250ZW50OiBbeyB0eXBlOiAndGV4dCcsIHRleHQ6IEpTT04uc3RyaW5naWZ5KHJlc3VsdCA/PyBudWxsKSB9XSB9O1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgdHlwZTogJ3RleHQnLFxuICAgICAgICAgICAgdGV4dDogSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICAgICAgICBlcnJvcjoge1xuICAgICAgICAgICAgICAgIG5hbWU6IGVycm9yTmFtZShlcnJvciksXG4gICAgICAgICAgICAgICAgbWVzc2FnZTogZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpLFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSksXG4gICAgICAgICAgfSxcbiAgICAgICAgXSxcbiAgICAgICAgaXNFcnJvcjogdHJ1ZSxcbiAgICAgIH07XG4gICAgfVxuICB9KTtcblxuICByZXR1cm4gc2VydmVyO1xufVxuXG4vKipcbiAqIE1vdW50IFBPU1QgL21jcCBvbiB0aGUgRmFzdGlmeSBhcHAgXHUyMDE0IHN0YXRlbGVzcyBTdHJlYW1hYmxlSFRUUCBwYXR0ZXJuXG4gKiAoc2Vzc2lvbklkR2VuZXJhdG9yOiB1bmRlZmluZWQpOiBhIGZyZXNoIHNlcnZlcit0cmFuc3BvcnQgcGFpciBwZXIgcmVxdWVzdCxcbiAqIGZ1bGx5IGlzb2xhdGVkLCBubyBzZXNzaW9uIHN0YXRlIHRvIGxlYWsgYmV0d2VlbiBhY3RvcnMuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZWdpc3Rlck1jcFJvdXRlKFxuICBhcHA6IEZhc3RpZnlJbnN0YW5jZSxcbiAgYnVzOiBDb21tYW5kQnVzLFxuICBhdXRoZW50aWNhdGU6IChyZXF1ZXN0OiBGYXN0aWZ5UmVxdWVzdCkgPT4gQWN0b3JDb250ZXh0IHwgbnVsbCxcbik6IHZvaWQge1xuICBhcHAucG9zdCgnL21jcCcsIGFzeW5jIChyZXF1ZXN0LCByZXBseSkgPT4ge1xuICAgIGNvbnN0IGN0eCA9IGF1dGhlbnRpY2F0ZShyZXF1ZXN0KTtcbiAgICBpZiAoY3R4ID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gcmVwbHlcbiAgICAgICAgLmNvZGUoNDAxKVxuICAgICAgICAuc2VuZCh7IGpzb25ycGM6ICcyLjAnLCBlcnJvcjogeyBjb2RlOiAtMzIwMDEsIG1lc3NhZ2U6ICd1bmF1dGhvcml6ZWQnIH0sIGlkOiBudWxsIH0pO1xuICAgIH1cblxuICAgIGNvbnN0IHNlcnZlciA9IGJ1aWxkTWNwU2VydmVyKGJ1cywgY3R4KTtcbiAgICAvLyBTdGF0ZWxlc3MgbW9kZTogc2Vzc2lvbklkR2VuZXJhdG9yIG9taXR0ZWQgKFx1MjI2MSB1bmRlZmluZWQgXHUyMDE0IHRoZSBTREsnc1xuICAgIC8vIGRvY3VtZW50ZWQgc3RhdGVsZXNzIHBhdHRlcm47IHRoZSBrZXkgaXMgbGVmdCBvdXQgb25seSBiZWNhdXNlIHRoZSBTREtcbiAgICAvLyBvcHRpb25zIHR5cGUgaXMgbm90IGV4YWN0T3B0aW9uYWxQcm9wZXJ0eVR5cGVzLWNsZWFuKS5cbiAgICBjb25zdCB0cmFuc3BvcnQgPSBuZXcgU3RyZWFtYWJsZUhUVFBTZXJ2ZXJUcmFuc3BvcnQoeyBlbmFibGVKc29uUmVzcG9uc2U6IHRydWUgfSk7XG5cbiAgICByZXBseS5oaWphY2soKTtcbiAgICB0cnkge1xuICAgICAgLy8gQ2FzdDogdGhlIFNESydzIFRyYW5zcG9ydCBpbnRlcmZhY2UgaXMgbm90IGV4YWN0T3B0aW9uYWxQcm9wZXJ0eVR5cGVzLWNsZWFuLlxuICAgICAgYXdhaXQgc2VydmVyLmNvbm5lY3QodHJhbnNwb3J0IGFzIHVua25vd24gYXMgUGFyYW1ldGVyczx0eXBlb2Ygc2VydmVyLmNvbm5lY3Q+WzBdKTtcbiAgICAgIC8vIEpTT04tcmVzcG9uc2UgbW9kZTogcmVzb2x2ZXMgb25jZSB0aGUgcmVzcG9uc2UgaGFzIGJlZW4gd3JpdHRlbi5cbiAgICAgIC8vIChEbyBOT1QgY2xvc2Ugb24gcmVxdWVzdC5yYXcgJ2Nsb3NlJyBcdTIwMTQgTm9kZSBlbWl0cyBpdCBhcyBzb29uIGFzIHRoZVxuICAgICAgLy8gcGFyc2VkIHJlcXVlc3Qgc3RyZWFtIGVuZHMsIHdoaWNoIHdvdWxkIGtpbGwgdGhlIHBlbmRpbmcgcmVzcG9uc2UuKVxuICAgICAgYXdhaXQgdHJhbnNwb3J0LmhhbmRsZVJlcXVlc3QocmVxdWVzdC5yYXcsIHJlcGx5LnJhdywgcmVxdWVzdC5ib2R5KTtcbiAgICB9IGZpbmFsbHkge1xuICAgICAgdm9pZCB0cmFuc3BvcnQuY2xvc2UoKTtcbiAgICAgIHZvaWQgc2VydmVyLmNsb3NlKCk7XG4gICAgfVxuICAgIHJldHVybiByZXBseTtcbiAgfSk7XG59XG4iLCAiLyoqXG4gKiBHRVQgL2V2ZW50cy9zdHJlYW0gXHUyMDE0IFNlcnZlci1TZW50IEV2ZW50cyByZWxheSBvZiB0aGUgYXBwZW5kLW9ubHkgZXZlbnQgbG9nLlxuICpcbiAqIFJlYWQtb25seSBzdXJmYWNlIChuZXZlciBhIHdyaXRlIHBhdGgpOiBlYWNoIFNTRSBmcmFtZSBpcyBvbmUgU3BpbmVFdmVudCBhc1xuICogSlNPTiB3aXRoIGBpZDogPGdsb2JhbFNlcT5gLCBzbyBzdGFuZGFyZCBFdmVudFNvdXJjZSByZWNvbm5lY3Rpb25cbiAqIChMYXN0LUV2ZW50LUlEKSByZXN1bWVzIGV4YWN0bHkgd2hlcmUgdGhlIGNsaWVudCBsZWZ0IG9mZjsgYD9zaW5jZT08c2VxPmBcbiAqIGRvZXMgdGhlIHNhbWUgZm9yIGEgZmlyc3QgY29ubmVjdC5cbiAqXG4gKiBUb2RheSB0aGUgcmVsYXkgUE9MTFMgZW5naW5lLmV2ZW50cygpICgzMDBtcykgYmVoaW5kIHRoZSBFdmVudFRhaWxcbiAqIGludGVyZmFjZTsgYSByZWFsIHRyYW5zYWN0aW9uYWwgb3V0Ym94IGNhbiByZXBsYWNlIHBvbGxpbmdFdmVudFRhaWwgd2l0aG91dFxuICogdG91Y2hpbmcgdGhlIHJvdXRlLiBIZWFydGJlYXQgY29tbWVudHMgZXZlcnkgMTVzIGtlZXAgcHJveGllcyBmcm9tIHRpbWluZ1xuICogb3V0IHRoZSBpZGxlIHN0cmVhbTsgZXZlcnkgdGltZXIgaXMgY2xlYXJlZCBvbiBjbGllbnQgZGlzY29ubmVjdCBhbmQgb25cbiAqIHNlcnZlciBjbG9zZS5cbiAqL1xuaW1wb3J0IHR5cGUgeyBGYXN0aWZ5SW5zdGFuY2UsIEZhc3RpZnlSZXF1ZXN0IH0gZnJvbSAnZmFzdGlmeSc7XG5pbXBvcnQgdHlwZSB7IFNwaW5lRW5naW5lLCBTcGluZUV2ZW50IH0gZnJvbSAnQG9haHMvY29yZSc7XG5pbXBvcnQgdHlwZSB7IEFjdG9yQ29udGV4dCwgRXJyb3JFbnZlbG9wZSB9IGZyb20gJ0BvYWhzL2NvbnRyYWN0cyc7XG5cbi8qKiBBYnN0cmFjdCBvcmRlcmVkIGV2ZW50IHNvdXJjZTogZXZlcnl0aGluZyBzdHJpY3RseSBhZnRlciBhIGdsb2JhbCBzZXEuICovXG5leHBvcnQgaW50ZXJmYWNlIEV2ZW50VGFpbCB7XG4gIGFmdGVyKGdsb2JhbFNlcTogbnVtYmVyKTogU3BpbmVFdmVudFtdO1xufVxuXG4vKiogUG9sbGluZyBpbXBsZW1lbnRhdGlvbiBvdmVyIGVuZ2luZS5ldmVudHMoKSBcdTIwMTQgc3dhcHBlZCBmb3IgYW4gb3V0Ym94IGxhdGVyLiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBvbGxpbmdFdmVudFRhaWwoZW5naW5lOiBTcGluZUVuZ2luZSk6IEV2ZW50VGFpbCB7XG4gIHJldHVybiB7XG4gICAgYWZ0ZXIoZ2xvYmFsU2VxOiBudW1iZXIpOiBTcGluZUV2ZW50W10ge1xuICAgICAgcmV0dXJuIGVuZ2luZS5ldmVudHMoKS5maWx0ZXIoKGV2ZW50KSA9PiBldmVudC5nbG9iYWxTZXEgPiBnbG9iYWxTZXEpO1xuICAgIH0sXG4gIH07XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgRXZlbnRTdHJlYW1PcHRpb25zIHtcbiAgLyoqIFBvbGwgaW50ZXJ2YWwgZm9yIG5ldyBldmVudHMgKG1zKS4gRGVmYXVsdCAzMDAuICovXG4gIHBvbGxNcz86IG51bWJlcjtcbiAgLyoqIEhlYXJ0YmVhdCBjb21tZW50IGludGVydmFsIChtcykuIERlZmF1bHQgMTUwMDAuICovXG4gIGhlYXJ0YmVhdE1zPzogbnVtYmVyO1xufVxuXG5mdW5jdGlvbiBwYXJzZUN1cnNvcihyZXF1ZXN0OiBGYXN0aWZ5UmVxdWVzdCk6IG51bWJlciB7XG4gIC8vIFNTRSByZWNvbm5lY3Rpb24gd2luczogdGhlIGJyb3dzZXIgRXZlbnRTb3VyY2UgcmVzZW5kcyB0aGUgbGFzdCBzZWVuIGlkLlxuICBjb25zdCBsYXN0RXZlbnRJZCA9IHJlcXVlc3QuaGVhZGVyc1snbGFzdC1ldmVudC1pZCddO1xuICBjb25zdCByYXcgPVxuICAgIHR5cGVvZiBsYXN0RXZlbnRJZCA9PT0gJ3N0cmluZycgJiYgbGFzdEV2ZW50SWQudHJpbSgpICE9PSAnJ1xuICAgICAgPyBsYXN0RXZlbnRJZFxuICAgICAgOiAocmVxdWVzdC5xdWVyeSBhcyB7IHNpbmNlPzogc3RyaW5nIH0pLnNpbmNlO1xuICBpZiAocmF3ID09PSB1bmRlZmluZWQpIHJldHVybiAwO1xuICBjb25zdCBwYXJzZWQgPSBOdW1iZXIocmF3KTtcbiAgcmV0dXJuIE51bWJlci5pc0Zpbml0ZShwYXJzZWQpICYmIHBhcnNlZCA+PSAwID8gTWF0aC5mbG9vcihwYXJzZWQpIDogMDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJlZ2lzdGVyRXZlbnRTdHJlYW0oXG4gIGFwcDogRmFzdGlmeUluc3RhbmNlLFxuICB0YWlsOiBFdmVudFRhaWwsXG4gIGF1dGhlbnRpY2F0ZTogKHJlcXVlc3Q6IEZhc3RpZnlSZXF1ZXN0KSA9PiBBY3RvckNvbnRleHQgfCBudWxsLFxuICBvcHRpb25zOiBFdmVudFN0cmVhbU9wdGlvbnMgPSB7fSxcbik6IHZvaWQge1xuICBjb25zdCBwb2xsTXMgPSBvcHRpb25zLnBvbGxNcyA/PyAzMDA7XG4gIGNvbnN0IGhlYXJ0YmVhdE1zID0gb3B0aW9ucy5oZWFydGJlYXRNcyA/PyAxNV8wMDA7XG4gIGNvbnN0IGNsZWFudXBzID0gbmV3IFNldDwoKSA9PiB2b2lkPigpO1xuXG4gIC8vIEEgaGlqYWNrZWQgU1NFIHJlc3BvbnNlIG91dGxpdmVzIEZhc3RpZnkncyByZXF1ZXN0IGxpZmVjeWNsZSBcdTIwMTQgY2xvc2UgYWxsXG4gIC8vIGxpdmUgc3RyZWFtcyB3aGVuIHRoZSBzZXJ2ZXIgY2xvc2VzIHNvIHRlc3RzIChhbmQgc2h1dGRvd25zKSBuZXZlciBoYW5nLlxuICBhcHAuYWRkSG9vaygnb25DbG9zZScsIChfaW5zdGFuY2UsIGRvbmUpID0+IHtcbiAgICBmb3IgKGNvbnN0IGNsZWFudXAgb2YgWy4uLmNsZWFudXBzXSkgY2xlYW51cCgpO1xuICAgIGRvbmUoKTtcbiAgfSk7XG5cbiAgYXBwLmdldCgnL2V2ZW50cy9zdHJlYW0nLCAocmVxdWVzdCwgcmVwbHkpID0+IHtcbiAgICBjb25zdCBjdHggPSBhdXRoZW50aWNhdGUocmVxdWVzdCk7XG4gICAgaWYgKGN0eCA9PT0gbnVsbCkge1xuICAgICAgdm9pZCByZXBseS5jb2RlKDQwMSkuc2VuZCh7XG4gICAgICAgIG9rOiBmYWxzZSxcbiAgICAgICAgZXJyb3I6IHsgbmFtZTogJ0Vycm9yJywgbWVzc2FnZTogJ3VuYXV0aG9yaXplZDogbWlzc2luZyBvciBpbnZhbGlkIGJlYXJlciB0b2tlbicgfSxcbiAgICAgIH0gc2F0aXNmaWVzIEVycm9yRW52ZWxvcGUpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGxldCBjdXJzb3IgPSBwYXJzZUN1cnNvcihyZXF1ZXN0KTtcblxuICAgIHJlcGx5LmhpamFjaygpO1xuICAgIGNvbnN0IHJlcyA9IHJlcGx5LnJhdztcbiAgICByZXMud3JpdGVIZWFkKDIwMCwge1xuICAgICAgJ2NvbnRlbnQtdHlwZSc6ICd0ZXh0L2V2ZW50LXN0cmVhbScsXG4gICAgICAnY2FjaGUtY29udHJvbCc6ICduby1jYWNoZSwgbm8tdHJhbnNmb3JtJyxcbiAgICAgIGNvbm5lY3Rpb246ICdrZWVwLWFsaXZlJyxcbiAgICAgICd4LWFjY2VsLWJ1ZmZlcmluZyc6ICdubycsXG4gICAgfSk7XG4gICAgcmVzLndyaXRlKCc6IGNvbm5lY3RlZFxcblxcbicpO1xuXG4gICAgY29uc3QgZmx1c2ggPSAoKTogdm9pZCA9PiB7XG4gICAgICBmb3IgKGNvbnN0IGV2ZW50IG9mIHRhaWwuYWZ0ZXIoY3Vyc29yKSkge1xuICAgICAgICBjdXJzb3IgPSBldmVudC5nbG9iYWxTZXE7XG4gICAgICAgIHJlcy53cml0ZShgaWQ6ICR7ZXZlbnQuZ2xvYmFsU2VxfVxcbmRhdGE6ICR7SlNPTi5zdHJpbmdpZnkoZXZlbnQpfVxcblxcbmApO1xuICAgICAgfVxuICAgIH07XG4gICAgZmx1c2goKTtcblxuICAgIGNvbnN0IHBvbGwgPSBzZXRJbnRlcnZhbChmbHVzaCwgcG9sbE1zKTtcbiAgICBjb25zdCBoZWFydGJlYXQgPSBzZXRJbnRlcnZhbCgoKSA9PiB7XG4gICAgICByZXMud3JpdGUoJzogaGVhcnRiZWF0XFxuXFxuJyk7XG4gICAgfSwgaGVhcnRiZWF0TXMpO1xuXG4gICAgY29uc3QgY2xlYW51cCA9ICgpOiB2b2lkID0+IHtcbiAgICAgIGNsZWFySW50ZXJ2YWwocG9sbCk7XG4gICAgICBjbGVhckludGVydmFsKGhlYXJ0YmVhdCk7XG4gICAgICBjbGVhbnVwcy5kZWxldGUoY2xlYW51cCk7XG4gICAgICBpZiAoIXJlcy53cml0YWJsZUVuZGVkKSByZXMuZW5kKCk7XG4gICAgfTtcbiAgICBjbGVhbnVwcy5hZGQoY2xlYW51cCk7XG4gICAgLy8gUmVzcG9uc2UgJ2Nsb3NlJyBmaXJlcyB3aGVuIHRoZSB1bmRlcmx5aW5nIHNvY2tldCBnb2VzIGF3YXkgXHUyMDE0IGNsaWVudFxuICAgIC8vIGRpc2Nvbm5lY3RzIGluY2x1ZGVkLiAocmVxdWVzdC5yYXcgJ2Nsb3NlJyBmaXJlcyBhcyBzb29uIGFzIHRoZSBwYXJzZWRcbiAgICAvLyByZXF1ZXN0IHN0cmVhbSBlbmRzLCB3aGljaCBpcyBpbW1lZGlhdGVseSBmb3IgYSBHRVQuKVxuICAgIHJlcy5vbignY2xvc2UnLCBjbGVhbnVwKTtcbiAgfSk7XG59XG4iLCAiLyoqXG4gKiBHRVQgL3VpIFx1MjAxNCB0aGUgc3RhdGljIGNoYXQgVUkgKEQzKS4gVGhyZWUgZmlsZXMgb3V0IG9mIHB1YmxpYy8gKGJ1aWx0IGJ5XG4gKiBzY3JpcHRzL2J1aWxkLXVpLm1qcyksIHNlcnZlZCB3aXRoIHBsYWluIHJlYWRGaWxlU3luYyBcdTIwMTQgbm8gQGZhc3RpZnkvc3RhdGljXG4gKiBkZXBlbmRlbmN5IGZvciB0aHJlZSBmaWxlcywgYW5kIE5PIG5ldyBzZXJ2ZXIgbG9naWM6IHRoZSBVSSB0YWxrcyB0byB0aGVcbiAqIHNhbWUgL3JwYy8qICsgL2V2ZW50cy9zdHJlYW0gc3VyZmFjZXMgYXMgZXZlcnkgb3RoZXIgY2xpZW50LCBhdXRoZW50aWNhdGVkXG4gKiBieSB0aGUgYmVhcmVyIHRva2VuIHRoZSB1c2VyIHBhc3RlcyBpbi4gVGhlIHN0YXRpYyByb3V0ZXMgdGhlbXNlbHZlcyBhcmVcbiAqIHVuYXV0aGVudGljYXRlZCBvbiBwdXJwb3NlIChsb2dpbiBoYXBwZW5zIGluLWFwcCkuXG4gKi9cbmltcG9ydCB7IHJlYWRGaWxlU3luYyB9IGZyb20gJ25vZGU6ZnMnO1xuaW1wb3J0IHsgZGlybmFtZSwgam9pbiB9IGZyb20gJ25vZGU6cGF0aCc7XG5pbXBvcnQgeyBmaWxlVVJMVG9QYXRoIH0gZnJvbSAnbm9kZTp1cmwnO1xuaW1wb3J0IHR5cGUgeyBGYXN0aWZ5SW5zdGFuY2UgfSBmcm9tICdmYXN0aWZ5JztcblxuY29uc3QgcHVibGljRGlyID0gam9pbihkaXJuYW1lKGZpbGVVUkxUb1BhdGgoaW1wb3J0Lm1ldGEudXJsKSksICcuLicsICdwdWJsaWMnKTtcblxuY29uc3QgQ09OVEVOVF9UWVBFUzogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHtcbiAgJy5odG1sJzogJ3RleHQvaHRtbDsgY2hhcnNldD11dGYtOCcsXG4gICcuanMnOiAndGV4dC9qYXZhc2NyaXB0OyBjaGFyc2V0PXV0Zi04JyxcbiAgJy5jc3MnOiAndGV4dC9jc3M7IGNoYXJzZXQ9dXRmLTgnLFxufTtcblxuZXhwb3J0IGZ1bmN0aW9uIHJlZ2lzdGVyVWlSb3V0ZXMoYXBwOiBGYXN0aWZ5SW5zdGFuY2UpOiB2b2lkIHtcbiAgY29uc3Qgc2VydmUgPSAocm91dGVQYXRoOiBzdHJpbmcsIGZpbGVOYW1lOiBzdHJpbmcsIGV4dDogc3RyaW5nKTogdm9pZCA9PiB7XG4gICAgYXBwLmdldChyb3V0ZVBhdGgsIChfcmVxdWVzdCwgcmVwbHkpID0+IHtcbiAgICAgIHRyeSB7XG4gICAgICAgIC8vIFJlYWQgcGVyIHJlcXVlc3Q6IHRocmVlIHNtYWxsIGZpbGVzLCBhbmQgYSByZWJ1aWx0IGJ1bmRsZSBpcyBwaWNrZWRcbiAgICAgICAgLy8gdXAgd2l0aG91dCBhIHNlcnZlciByZXN0YXJ0LlxuICAgICAgICBjb25zdCBjb250ZW50ID0gcmVhZEZpbGVTeW5jKGpvaW4ocHVibGljRGlyLCBmaWxlTmFtZSkpO1xuICAgICAgICB2b2lkIHJlcGx5LnR5cGUoQ09OVEVOVF9UWVBFU1tleHRdID8/ICdhcHBsaWNhdGlvbi9vY3RldC1zdHJlYW0nKS5zZW5kKGNvbnRlbnQpO1xuICAgICAgfSBjYXRjaCB7XG4gICAgICAgIHZvaWQgcmVwbHkuY29kZSg0MDQpLnNlbmQoe1xuICAgICAgICAgIG9rOiBmYWxzZSxcbiAgICAgICAgICBlcnJvcjogeyBuYW1lOiAnRXJyb3InLCBtZXNzYWdlOiBgdWkgYXNzZXQgbm90IGJ1aWx0OiAke2ZpbGVOYW1lfSAocnVuIHBucG0gYnVpbGQ6dWkpYCB9LFxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfTtcblxuICBzZXJ2ZSgnL3VpJywgJ2luZGV4Lmh0bWwnLCAnLmh0bWwnKTtcbiAgc2VydmUoJy91aS9hcHAuanMnLCAnYXBwLmpzJywgJy5qcycpO1xuICBzZXJ2ZSgnL3VpL2FwcC5jc3MnLCAnYXBwLmNzcycsICcuY3NzJyk7XG59XG4iXSwKICAibWFwcGluZ3MiOiAiOzs7Ozs7Ozs7Ozs7O0FBQUEsSUEwQmEsdUJBV0Esa0JBUUEsZUFRQSx3QkFXQSx3QkFhQSxrQkFXQSxpQkF1REEsZUFPQSxjQUdBLGdDQVNBLGdCQXVFQSxtQkFzQkEsaUJBZUEsVUEySEE7QUF6WWI7QUFBQTtBQUFBO0FBMEJPLElBQU0sd0JBQU4sY0FBb0MsTUFBTTtBQUFBLE1BQy9DLFlBQ2tCLFlBQ0EsU0FDaEI7QUFDQSxjQUFNLHNCQUFzQixVQUFVLGNBQWMsT0FBTyxFQUFFO0FBSDdDO0FBQ0E7QUFHaEIsYUFBSyxPQUFPO0FBQUEsTUFDZDtBQUFBLElBQ0Y7QUFHTyxJQUFNLG1CQUFOLGNBQStCLE1BQU07QUFBQSxNQUMxQyxZQUE0QixPQUFlO0FBQ3pDLGNBQU0saUJBQWlCLEtBQUssRUFBRTtBQURKO0FBRTFCLGFBQUssT0FBTztBQUFBLE1BQ2Q7QUFBQSxJQUNGO0FBR08sSUFBTSxnQkFBTixjQUE0QixNQUFNO0FBQUEsTUFDdkMsWUFBNEIsUUFBZ0I7QUFDMUMsY0FBTSxhQUFhLE1BQU0sRUFBRTtBQUREO0FB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QUFKYjtBQUFBO0FBQUE7QUFJTyxJQUFNLGFBQWE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7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SzsiLAogICJuYW1lcyI6IFsid29ya0l0ZW1JZCIsICJmZW5jaW5nVG9rZW4iLCAicGFyc2VZYW1sIiwgInNwbGl0RnJvbnRtYXR0ZXIiLCAid29ya0l0ZW1JZCIsICJldmlkZW5jZSIsICJiYXNlbGluZSIsICJvdXRjb21lIiwgImluaXRfc3JjIiwgInNxbCIsICJSQU5LIiwgIlRSQU5TSVRJT05TIiwgIkxFR0FDWV9TVEFUVVMiLCAid29ya0l0ZW1JZCIsICJmZW5jaW5nVG9rZW4iLCAicXVvcnVtTWV0IiwgImRpcm5hbWUiLCAiam9pbiIsICJmaWxlVVJMVG9QYXRoIiwgInNyY19leHBvcnRzIiwgImluaXRfc3JjIiwgInJlc29sdmUiLCAiZXJyb3JOYW1lIiwgImluaXRfc3JjIiwgInJlYWRGaWxlU3luYyIsICJyZXNvbHZlIiwgInRocmVhZHMiLCAibWVudGlvbnMiLCAibWVzc2FnZXMiLCAibm90aWZpY2F0aW9ucyIsICJlcSIsICJmZWF0dXJlcyIsICJyZWFkRmlsZVN5bmMiLCAicmVzb2x2ZSIsICJldmVudHMiLCAiYWN0b3JzIiwgInJhbmRvbUJ5dGVzIiwgIm1rZGlyU3luYyIsICJqb2luIiwgImV4aXN0c1N5bmMiLCAibWtkaXJTeW5jIiwgInJlYWRGaWxlU3luYyIsICJ3cml0ZUZpbGVTeW5jIiwgImRlZiIsICJyZWFkRmlsZVN5bmMiLCAiZGlybmFtZSIsICJqb2luIiwgInJhbmRvbUJ5dGVzIiwgIm1rZGlyU3luYyIsICJjcmVhdGVQZ1N5bmNFbmdpbmUiLCAiam9pbiIsICJ0ZXh0IiwgInJlc29sdmUiLCAid29ya0l0ZW1JZCJdCn0K
