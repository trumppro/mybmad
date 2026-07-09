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
var PermissionDeniedError, GuardFailedError, ConflictError, InvalidTransitionError, StoriesValidationError, WORK_ITEM_STATES, BLOCKED_REASONS, PLAN_CEILINGS, DEFAULT_PLAN, AGENT_GATE_APPROVE_PERMISSIONS, DELIVERY_ROLES, REVIEW_LOOP_LIMIT, AGENT_JOB_MAX_DEPTH;
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
          displayName: "system"
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
        const actor = { id: this.nextId("actor"), type: input.type, displayName: input.displayName };
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
        const commitOk = rows.some(
          (row) => row.evidence.kind === "commit" && row.evidence.payload["reachableOnRemote"] === true
        );
        if (!commitOk) {
          throw new GuardFailedError("final revision must be reachable on the remote (push is part of the HALT contract)");
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
      governanceRole: text("governance_role").notNull().default("member")
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
        const actor = { id: this.nextId("actor"), type: input.type, displayName: input.displayName };
        await this.db.insert(actors).values({
          id: actor.id,
          type: actor.type,
          displayName: actor.displayName,
          governanceRole: input.governanceRole ?? "member"
        });
        return actor;
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
        const commitOk = rows.some((row) => row.kind === "commit" && row.payload["reachableOnRemote"] === true);
        if (!commitOk) {
          throw new GuardFailedError(
            "final revision must be reachable on the remote (push is part of the HALT contract)"
          );
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
import { dirname as dirname3, join as join2 } from "node:path";
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
    workerPath = join2(here, "..", "dist", "worker.mjs");
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
var src_exports = {};
__export(src_exports, {
  PgEngine: () => PgEngine,
  SCHEMA_SQL: () => SCHEMA_SQL,
  createPgSyncEngine: () => createPgSyncEngine,
  schema: () => schema_exports
});
var init_src2 = __esm({
  "../../packages/db/src/index.ts"() {
    "use strict";
    init_pg_engine();
    init_sync_engine();
    init_schema_sql();
    init_schema();
  }
});

// ../../packages/runner/src/index.ts
var src_exports2 = {};
__export(src_exports2, {
  DEFAULT_VERIFICATION_ALLOWLIST: () => DEFAULT_VERIFICATION_ALLOWLIST,
  git: () => git,
  runOnce: () => runOnce,
  workLoop: () => workLoop
});
import { spawnSync } from "node:child_process";
import {
  existsSync as existsSync2,
  mkdirSync as mkdirSync3,
  readdirSync,
  readFileSync as readFileSync4,
  rmSync,
  statSync,
  writeFileSync as writeFileSync2
} from "node:fs";
import { join as join4, resolve as resolve2 } from "node:path";
import { parse as parseYaml } from "yaml";
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
  const gitDir = join4(repoPath, ".git");
  try {
    if (!statSync(gitDir).isDirectory()) return;
  } catch {
    return;
  }
  const infoDir = join4(gitDir, "info");
  mkdirSync3(infoDir, { recursive: true });
  const excludePath = join4(infoDir, "exclude");
  const current = existsSync2(excludePath) ? readFileSync4(excludePath, "utf8") : "";
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
      rmSync(dir, { recursive: true, force: true });
      git(["worktree", "prune"], repoPath);
    } catch {
    }
  }
}
function writeMarker(worktreeDir, marker) {
  writeFileSync2(join4(worktreeDir, MARKER_FILE), `${JSON.stringify(marker, null, 2)}
`, "utf8");
}
function readMarker(worktreeDir) {
  const path = join4(worktreeDir, MARKER_FILE);
  if (!existsSync2(path)) return null;
  try {
    const raw = JSON.parse(readFileSync4(path, "utf8"));
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
function splitFrontmatter(raw) {
  if (!raw.startsWith("---")) return { data: {}, body: raw };
  const close = raw.indexOf("\n---", 3);
  if (close === -1) return { data: {}, body: raw };
  const firstNewline = raw.indexOf("\n");
  const block = raw.slice(firstNewline + 1, close);
  const bodyStart = raw.indexOf("\n", close + 1);
  const body = bodyStart === -1 ? "" : raw.slice(bodyStart + 1);
  let data = {};
  try {
    data = parseYaml(block);
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
  const { data, body } = splitFrontmatter(readFileSync4(specAbsPath, "utf8"));
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
  const raw = readFileSync4(specAbsPath, "utf8");
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
function isRemoteError(error, name) {
  return typeof error === "object" && error !== null && error.errorName === name;
}
async function finishRun(args) {
  const { client, workItem, claim } = args;
  const spec = readSpecReport(join4(args.workDir, args.specRel));
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
  if (!existsSync2(root)) return scan;
  for (const name of readdirSync(root)) {
    const dir = join4(root, name);
    const marker = readMarker(dir);
    if (marker === null || marker.workItemId !== workItemId2) continue;
    let head = null;
    try {
      head = git(["rev-parse", "HEAD"], dir);
    } catch {
      head = null;
    }
    const status = normalizeStatus(readSpecReport(join4(dir, specRel)).status);
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
  const repoPath = resolve2(options.repoPath);
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
  const specRel = join4(options.specFolder, workItem.specPath);
  const branch = `claim/${claim.id}`;
  const worktreesRoot = join4(repoPath, ".oahs", "worktrees");
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
  mkdirSync3(worktreesRoot, { recursive: true });
  const worktreeDir = join4(worktreesRoot, claim.id);
  git(["worktree", "add", "-b", branch, worktreeDir, baseline], repoPath);
  writeMarker(worktreeDir, {
    workItemId: workItem.id,
    claimId: claim.id,
    baseline,
    invocations: 0
  });
  const specAbs = join4(worktreeDir, specRel);
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
var init_src3 = __esm({
  "../../packages/runner/src/index.ts"() {
    "use strict";
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
init_src();
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

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
  const yaml = readFileSync(resolve(opts.path), "utf8");
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
import { mkdirSync as mkdirSync2 } from "node:fs";
import { join as join3 } from "node:path";

// ../spine-api/src/index.ts
init_src();

// ../spine-api/src/auth.ts
import { createHash, randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync as readFileSync2, writeFileSync } from "node:fs";
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
    if (this.persistPath !== void 0 && existsSync(this.persistPath)) {
      const raw = JSON.parse(readFileSync2(this.persistPath, "utf8"));
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
    mkdirSync(dirname(this.persistPath), { recursive: true });
    writeFileSync(this.persistPath, JSON.stringify(shape, null, 2), "utf8");
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
import { readFileSync as readFileSync3 } from "node:fs";
import { dirname as dirname2, join } from "node:path";
import { fileURLToPath } from "node:url";
var publicDir = join(dirname2(fileURLToPath(import.meta.url)), "..", "public");
var CONTENT_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8"
};
function registerUiRoutes(app) {
  const serve = (routePath, fileName, ext) => {
    app.get(routePath, (_request, reply) => {
      try {
        const content = readFileSync3(join(publicDir, fileName));
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
    mkdirSync2(options.dataDir, { recursive: true });
    const { createPgSyncEngine: createPgSyncEngine2 } = await Promise.resolve().then(() => (init_src2(), src_exports));
    engine = createPgSyncEngine2({ dataDir: join3(options.dataDir, "pg") });
    tokenStore = new TokenStore({ persistPath: join3(options.dataDir, "tokens.json") });
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
        const runner = await Promise.resolve().then(() => (init_src3(), src_exports2));
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vLi4vLi4vcGFja2FnZXMvY29yZS9zcmMvdHlwZXMudHMiLCAiLi4vLi4vLi4vcGFja2FnZXMvY29yZS9zcmMvc3Rvcmllcy50cyIsICIuLi8uLi8uLi9wYWNrYWdlcy9jb3JlL3NyYy9lbmdpbmUudHMiLCAiLi4vLi4vLi4vcGFja2FnZXMvY29yZS9zcmMvaW50ZW50LWhhc2gudHMiLCAiLi4vLi4vLi4vcGFja2FnZXMvY29yZS9zcmMvaW5kZXgudHMiLCAiLi4vLi4vLi4vcGFja2FnZXMvZGIvc3JjL3NjaGVtYS50cyIsICIuLi8uLi8uLi9wYWNrYWdlcy9kYi9zcmMvcGctZW5naW5lLnRzIiwgIi4uLy4uLy4uL3BhY2thZ2VzL2RiL3NyYy9zeW5jLWVuZ2luZS50cyIsICIuLi8uLi8uLi9wYWNrYWdlcy9kYi9zcmMvc2NoZW1hLXNxbC50cyIsICIuLi8uLi8uLi9wYWNrYWdlcy9kYi9zcmMvaW5kZXgudHMiLCAiLi4vLi4vLi4vcGFja2FnZXMvcnVubmVyL3NyYy9pbmRleC50cyIsICIuLi9zcmMvY2xpLnRzIiwgIi4uLy4uLy4uL3BhY2thZ2VzL2NvbnRyYWN0cy9zcmMvaW5kZXgudHMiLCAiLi4vc3JjL2NvbW1hbmRzL2luZGV4LnRzIiwgIi4uL3NyYy9mb3JtYXQudHMiLCAiLi4vc3JjL2NvbW1hbmRzL2NvbGxhYi50cyIsICIuLi9zcmMvc2VydmUudHMiLCAiLi4vLi4vc3BpbmUtYXBpL3NyYy9pbmRleC50cyIsICIuLi8uLi9zcGluZS1hcGkvc3JjL2F1dGgudHMiLCAiLi4vLi4vc3BpbmUtYXBpL3NyYy9zZXJ2ZXIudHMiLCAiLi4vLi4vc3BpbmUtYXBpL3NyYy9idXMudHMiLCAiLi4vLi4vc3BpbmUtYXBpL3NyYy9tY3AudHMiLCAiLi4vLi4vc3BpbmUtYXBpL3NyYy9zc2UudHMiLCAiLi4vLi4vc3BpbmUtYXBpL3NyYy91aS50cyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiLyoqXG4gKiBAb2Focy9jb3JlIFx1MjAxNCB0eXBlcywgZXJyb3JzLCBhbmQgdm9jYWJ1bGFyeSBvZiB0aGUgZGV0ZXJtaW5pc3RpYyBzcGluZS5cbiAqXG4gKiBUaGUgY29uZm9ybWFuY2Ugc3VpdGUgaW4gdGVzdC8gd2FzIHdyaXR0ZW4gRklSU1QsIGZyb20gdGhlIHByb3NlIHJ1bGVzIGluXG4gKiB0aGUgQk1BRCBzb3VyY2UgKGJtYWQtc3ByaW50LXBsYW5uaW5nLCBibWFkLWRldi1hdXRvLCBibWFkLXF1aWNrLWRldixcbiAqIHN0b3JpZXMtc2NoZW1hLm1kKSBhcyBhcmJpdHJhdGVkIGluIHByb2R1Y3Qtcm9hZG1hcC5tZCBcdTAwQTcxLiBUaGUgZW5naW5lIGlzXG4gKiBpbXBsZW1lbnRlZCB0byBtYWtlIHRoYXQgc3VpdGUgcGFzcyBcdTIwMTQgbmV2ZXIgdGhlIG90aGVyIHdheSBhcm91bmQuXG4gKlxuICogSW52YXJpYW50cyBlbmZvcmNlZCBoZXJlIGZvcmV2ZXIgKHByb2R1Y3Qtcm9hZG1hcC5tZCBcdTAwQTcwLjEpOlxuICogIC0gTm8gTExNIFNESyBpbXBvcnQuIEV2ZXIuIChDSSBsaW50KVxuICogIC0gRXZlcnkgbXV0YXRpb24gZ29lcyB0aHJvdWdoIGEgY29tbWFuZDsgY29tbWFuZHMgZW1pdCBldmVudHM7IHByb2plY3Rpb25zXG4gKiAgICBhcmUgY29uc2VxdWVuY2VzIG9mIGV2ZW50cy5cbiAqL1xuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIEVycm9yc1xuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbmV4cG9ydCBjbGFzcyBOb3RJbXBsZW1lbnRlZEVycm9yIGV4dGVuZHMgRXJyb3Ige1xuICBjb25zdHJ1Y3Rvcih3aGF0OiBzdHJpbmcpIHtcbiAgICBzdXBlcihgTm90IGltcGxlbWVudGVkOiAke3doYXR9YCk7XG4gICAgdGhpcy5uYW1lID0gJ05vdEltcGxlbWVudGVkRXJyb3InO1xuICB9XG59XG5cbi8qKiBDb21tYW5kIHJlamVjdGVkOiBhY3RvciBsYWNrcyB0aGUgcmVxdWlyZWQgZ3JhbnQuICovXG5leHBvcnQgY2xhc3MgUGVybWlzc2lvbkRlbmllZEVycm9yIGV4dGVuZHMgRXJyb3Ige1xuICBjb25zdHJ1Y3RvcihcbiAgICBwdWJsaWMgcmVhZG9ubHkgcGVybWlzc2lvbjogUGVybWlzc2lvbixcbiAgICBwdWJsaWMgcmVhZG9ubHkgYWN0b3JJZDogc3RyaW5nLFxuICApIHtcbiAgICBzdXBlcihgcGVybWlzc2lvbiBkZW5pZWQ6ICR7cGVybWlzc2lvbn0gZm9yIGFjdG9yICR7YWN0b3JJZH1gKTtcbiAgICB0aGlzLm5hbWUgPSAnUGVybWlzc2lvbkRlbmllZEVycm9yJztcbiAgfVxufVxuXG4vKiogQ29tbWFuZCByZWplY3RlZDogRlNNIGd1YXJkIGZhaWxlZCAoaW5jbHVkZXMgdGhlIG1hY2hpbmUtcmVhZGFibGUgZ3VhcmQgY29kZSkuICovXG5leHBvcnQgY2xhc3MgR3VhcmRGYWlsZWRFcnJvciBleHRlbmRzIEVycm9yIHtcbiAgY29uc3RydWN0b3IocHVibGljIHJlYWRvbmx5IGd1YXJkOiBzdHJpbmcpIHtcbiAgICBzdXBlcihgZ3VhcmQgZmFpbGVkOiAke2d1YXJkfWApO1xuICAgIHRoaXMubmFtZSA9ICdHdWFyZEZhaWxlZEVycm9yJztcbiAgfVxufVxuXG4vKiogQ29tbWFuZCByZWplY3RlZDogc3RhbGUgZmVuY2luZyB0b2tlbiBvciBzdGF0ZV92ZXJzaW9uIGNvbmZsaWN0IChIVFRQIDQwOSBzZW1hbnRpY3MpLiAqL1xuZXhwb3J0IGNsYXNzIENvbmZsaWN0RXJyb3IgZXh0ZW5kcyBFcnJvciB7XG4gIGNvbnN0cnVjdG9yKHB1YmxpYyByZWFkb25seSByZWFzb246IHN0cmluZykge1xuICAgIHN1cGVyKGBjb25mbGljdDogJHtyZWFzb259YCk7XG4gICAgdGhpcy5uYW1lID0gJ0NvbmZsaWN0RXJyb3InO1xuICB9XG59XG5cbi8qKiBUcmFuc2l0aW9uIG5vdCBkZWNsYXJlZCBpbiB0aGUgdGFibGUgKGluY2x1ZGVzIG5ldmVyLWRvd25ncmFkZSByZWplY3Rpb25zKS4gKi9cbmV4cG9ydCBjbGFzcyBJbnZhbGlkVHJhbnNpdGlvbkVycm9yIGV4dGVuZHMgRXJyb3Ige1xuICBjb25zdHJ1Y3RvcihcbiAgICBwdWJsaWMgcmVhZG9ubHkgZnJvbTogV29ya0l0ZW1TdGF0ZSxcbiAgICBwdWJsaWMgcmVhZG9ubHkgdG86IFdvcmtJdGVtU3RhdGUsXG4gICkge1xuICAgIHN1cGVyKGBpbnZhbGlkIHRyYW5zaXRpb246ICR7ZnJvbX0gLT4gJHt0b31gKTtcbiAgICB0aGlzLm5hbWUgPSAnSW52YWxpZFRyYW5zaXRpb25FcnJvcic7XG4gIH1cbn1cblxuLyoqIHN0b3JpZXMueWFtbCBmYWlsZWQgYSB2YWxpZGl0eSBydWxlIChzdG9yaWVzLXNjaGVtYS5tZCkuICovXG5leHBvcnQgY2xhc3MgU3Rvcmllc1ZhbGlkYXRpb25FcnJvciBleHRlbmRzIEVycm9yIHtcbiAgY29uc3RydWN0b3IocHVibGljIHJlYWRvbmx5IHJ1bGU6IHN0cmluZykge1xuICAgIHN1cGVyKGBzdG9yaWVzLnlhbWwgaW52YWxpZDogJHtydWxlfWApO1xuICAgIHRoaXMubmFtZSA9ICdTdG9yaWVzVmFsaWRhdGlvbkVycm9yJztcbiAgfVxufVxuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIFZvY2FidWxhcnkgKHByb2R1Y3Qtcm9hZG1hcC5tZCBcdTAwQTcwLjIsIFx1MDBBNzEuMSlcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5leHBvcnQgdHlwZSBBY3RvclR5cGUgPSAndXNlcicgfCAnYWdlbnQnIHwgJ3N5c3RlbSc7XG5cbmV4cG9ydCBjb25zdCBXT1JLX0lURU1fU1RBVEVTID0gW1xuICAnYmFja2xvZycsXG4gICdkcmFmdCcsXG4gICdyZWFkeV9mb3JfZGV2JyxcbiAgJ2luX3Byb2dyZXNzJyxcbiAgJ2luX3JldmlldycsXG4gICdkb25lJyxcbl0gYXMgY29uc3Q7XG5leHBvcnQgdHlwZSBXb3JrSXRlbVN0YXRlID0gKHR5cGVvZiBXT1JLX0lURU1fU1RBVEVTKVtudW1iZXJdO1xuXG4vKiogYmxvY2tlZCBpcyBhbiBPVkVSTEFZLCBub3QgYSBzdGF0ZSAocm9hZG1hcCBEOCkuIFRheG9ub215IGZyb20gZGV2LWF1dG8gSEFMVC4gKi9cbmV4cG9ydCBjb25zdCBCTE9DS0VEX1JFQVNPTlMgPSBbXG4gICd1bmNsZWFyX2ludGVudCcsXG4gICdub19zdG9yaWVzX3lhbWxfZm91bmQnLFxuICAnYW1iaWd1b3VzX3N0b3J5X2ZpbGVfbWF0Y2gnLFxuICAncmV2aWV3X25vbl9jb252ZXJnZW5jZScsXG4gICdub19zdWJhZ2VudHMnLFxuICAnZGlydHlfdHJlZScsXG4gICdzdGFsZV93b3JrdHJlZScsXG4gICdhd2FpdGluZ19odW1hbl9pbnB1dCcsXG4gICdvdGhlcicsXG5dIGFzIGNvbnN0O1xuZXhwb3J0IHR5cGUgQmxvY2tlZFJlYXNvbiA9ICh0eXBlb2YgQkxPQ0tFRF9SRUFTT05TKVtudW1iZXJdO1xuXG5leHBvcnQgdHlwZSBQZXJtaXNzaW9uID1cbiAgfCAndGFzay5wbGFuJ1xuICB8ICd0YXNrLmNsYWltJ1xuICB8ICd0YXNrLmFkdmFuY2UnXG4gIHwgJ3Rhc2suYmxvY2snXG4gIHwgJ2dhdGUuc3BlYy5hcHByb3ZlJ1xuICB8ICdnYXRlLnJldmlldy5hcHByb3ZlJ1xuICB8ICdnYXRlLnJldmlldy5yZWplY3QnIC8vIFBoYXNlIDI6IHJlamVjdGlvbi1sb29wYmFjayBXSVRIT1VUIGRvbmUtYXBwcm92YWwgKHJvYWRtYXAgUGhhc2UgMiBleGl0IGNyaXRlcmlvbilcbiAgfCAnZmVhdHVyZS5pbml0J1xuICB8ICdmZWF0dXJlLmFkdmFuY2UnXG4gIHwgJ2Rpc3BhdGNoLnJlbGVhc2VfaG9sZCdcbiAgfCAnaW50ZW50LmVkaXQnXG4gIHwgJ3N0YXRlLmRvd25ncmFkZSdcbiAgfCAnb3BzLmZvcmNlX3JlbGVhc2VfY2xhaW0nXG4gIHwgJ2dvdmVybmFuY2UuYWRtaW4nIC8vIFBoYXNlIDI6IGF1dGhvcml0eSBvdmVyIGdhdGVkIGVudGl0bGVtZW50IHdyaXRlcyAoaGVsZCB2aWEgZ292ZXJuYW5jZSByb2xlLCBub3QgZ3JhbnRzKVxuICAvLyBQaGFzZSAzIGlkZW50aXR5L3Zpc2liaWxpdHkgYXV0aG9yaXRpZXMgKGNoZWNrZWQgc3RydWN0dXJhbGx5LCBub3QgdmlhIGdyYW50cyk6XG4gIHwgJ3RocmVhZC5wb3N0J1xuICB8ICd0aHJlYWQucmVhZCdcbiAgfCAndGhyZWFkLmludml0ZSdcbiAgfCAnYWdlbnRfam9iLmNvbXBsZXRlJztcblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBFbnRpdGxlbWVudHMgKFBoYXNlIDIsIHJvYWRtYXAgXHUwMEE3Myk6IHBsYW4gXHUwMEQ3IGdvdmVybmFuY2Ugcm9sZSBcdTAwRDcgZGVsaXZlcnkgcm9sZS5cbi8vIFJlc29sdXRpb24gaXMgYSBQVVJFIGZ1bmN0aW9uIG92ZXIgdGhpcyBkYXRhIFx1MjAxNCBubyBpbnRlcnByZXRhdGlvbiBhbnl3aGVyZS5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5leHBvcnQgdHlwZSBHb3Zlcm5hbmNlUm9sZSA9ICdhZG1pbicgfCAnbWVtYmVyJyB8ICdhdWRpdG9yJztcblxuZXhwb3J0IHR5cGUgUGxhbkNvZGUgPSAnZnJlZScgfCAndGVhbScgfCAnZW50ZXJwcmlzZSc7XG5cbi8qKlxuICogUGxhbiBpcyBhIENFSUxJTkcsIG5ldmVyIGEgZ3JhbnQgKHJvYWRtYXAgXHUwMEE3MykuIEl0IGJvdW5kcyB3aGF0IG1heSBiZVxuICogZ3JhbnRlZCB0byBBR0VOVCBhY3RvcnM7IHVzZXIgYWN0b3JzIGFyZSBuZXZlciBwbGFuLWZpbHRlcmVkLiBFbmZvcmNlZCBpblxuICogdGhlIHJlc29sdmVyIGFuZCBhdCBncmFudCB0aW1lIFx1MjAxNCBub3doZXJlIGVsc2UuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgUGxhbkNlaWxpbmcge1xuICAvKiogbWF5IGFnZW50cyBob2xkIGdhdGUtQVBQUk9WQUwgcGVybWlzc2lvbnMgKHNwZWMvcmV2aWV3IGFwcHJvdmUpPyAqL1xuICBhZ2VudEdhdGVBcHByb3ZlOiBib29sZWFuO1xuICAvKiogbWF5IGFnZW50cyBob2xkIHRoZSByZWplY3Rpb24tbG9vcGJhY2sgcGVybWlzc2lvbj8gKi9cbiAgYWdlbnRHYXRlUmVqZWN0OiBib29sZWFuO1xufVxuXG5leHBvcnQgY29uc3QgUExBTl9DRUlMSU5HUzogUmVjb3JkPFBsYW5Db2RlLCBQbGFuQ2VpbGluZz4gPSB7XG4gIGZyZWU6IHsgYWdlbnRHYXRlQXBwcm92ZTogZmFsc2UsIGFnZW50R2F0ZVJlamVjdDogZmFsc2UgfSxcbiAgdGVhbTogeyBhZ2VudEdhdGVBcHByb3ZlOiBmYWxzZSwgYWdlbnRHYXRlUmVqZWN0OiB0cnVlIH0sXG4gIGVudGVycHJpc2U6IHsgYWdlbnRHYXRlQXBwcm92ZTogdHJ1ZSwgYWdlbnRHYXRlUmVqZWN0OiB0cnVlIH0sXG59O1xuXG4vKiogU2VsZi1ob3N0IGRlZmF1bHQ6IHRoZSBjZWlsaW5nIGlzIG9wZW47IHRoZSBvcmcgbmFycm93cyAocmVzdHJpY3Qtb25seSkuICovXG5leHBvcnQgY29uc3QgREVGQVVMVF9QTEFOOiBQbGFuQ29kZSA9ICdlbnRlcnByaXNlJztcblxuLyoqIEdhdGUtYXBwcm92YWwgcGVybWlzc2lvbnMgYm91bmRlZCBieSBQbGFuQ2VpbGluZy5hZ2VudEdhdGVBcHByb3ZlLiAqL1xuZXhwb3J0IGNvbnN0IEFHRU5UX0dBVEVfQVBQUk9WRV9QRVJNSVNTSU9OUzogcmVhZG9ubHkgUGVybWlzc2lvbltdID0gW1xuICAnZ2F0ZS5zcGVjLmFwcHJvdmUnLFxuICAnZ2F0ZS5yZXZpZXcuYXBwcm92ZScsXG5dO1xuXG4vKipcbiAqIERlbGl2ZXJ5IHJvbGVzIChyb2FkbWFwIFx1MDBBNzMpIFx1MjAxNCBwZXJtaXNzaW9uIGJ1bmRsZXMsIHZlcnNpb25lZCBkYXRhIG9mIHRoZVxuICogUnVsZXMgbGF5ZXIuIEFuIGFzc2lnbm1lbnQgZ3JhbnRzIHRoZSBidW5kbGU7IHJldm9jYXRpb24gcmVtb3ZlcyBpdC5cbiAqL1xuZXhwb3J0IGNvbnN0IERFTElWRVJZX1JPTEVTOiBSZWNvcmQ8c3RyaW5nLCByZWFkb25seSBQZXJtaXNzaW9uW10+ID0ge1xuICBwcm9kdWN0X293bmVyOiBbJ3Rhc2sucGxhbicsICdmZWF0dXJlLmluaXQnLCAnZmVhdHVyZS5hZHZhbmNlJywgJ2dhdGUuc3BlYy5hcHByb3ZlJywgJ2Rpc3BhdGNoLnJlbGVhc2VfaG9sZCddLFxuICB0ZWNoX2xlYWQ6IFsndGFzay5wbGFuJywgJ2dhdGUucmV2aWV3LmFwcHJvdmUnLCAnZ2F0ZS5yZXZpZXcucmVqZWN0JywgJ3N0YXRlLmRvd25ncmFkZScsICdvcHMuZm9yY2VfcmVsZWFzZV9jbGFpbSddLFxuICByZXZpZXdlcjogWydnYXRlLnJldmlldy5hcHByb3ZlJywgJ2dhdGUucmV2aWV3LnJlamVjdCddLFxuICBkZXZlbG9wZXI6IFsndGFzay5jbGFpbScsICd0YXNrLmFkdmFuY2UnLCAndGFzay5ibG9jayddLFxuICBxYTogWyd0YXNrLmJsb2NrJ10sXG4gIGNvbnRyaWJ1dG9yOiBbXSxcbn07XG5cbi8qKlxuICogV29ya3NwYWNlIHBvbGljeSBcdTIwMTQgUkVTVFJJQ1QtT05MWSBrZXlzIChyb2FkbWFwIFx1MDBBNzMpOiBhIHBvbGljeSBjYW4gbmFycm93XG4gKiB3aGF0IHRoZSBwbGFuIGFsbG93cywgbmV2ZXIgd2lkZW4gaXQuIFVuZGVmaW5lZCA9IG5vIHJlc3RyaWN0aW9uLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIFdvcmtzcGFjZVBvbGljeSB7XG4gIC8qKiBmYWxzZSBcdTIxRDIgYWdlbnRzIGNhbm5vdCBleGVyY2lzZSBnYXRlLWFwcHJvdmFsIHBlcm1pc3Npb25zIGV2ZW4gaWYgZ3JhbnRlZCAqL1xuICBhZ2VudEdhdGVBcHByb3ZhbHM/OiBib29sZWFuO1xuICAvKiogZmFsc2UgXHUyMUQyIGFnZW50cyBjYW5ub3QgY2xhaW0gdGFza3Mgb24gdGhlaXIgb3duIChtZW50aW9uLWRpc3BhdGNoIG9ubHksIFBoYXNlIDMpICovXG4gIGFnZW50U2VsZkRpc3BhdGNoPzogYm9vbGVhbjtcbiAgLyoqIGZhbHNlIFx1MjFEMiBtZW50aW9ucyBvZiBhZ2VudHMgbmV2ZXIgbWF0ZXJpYWxpemUgam9icyAoUGhhc2UgMyByb3V0ZXIga2lsbC1zd2l0Y2gpICovXG4gIG1lbnRpb25EaXNwYXRjaD86IGJvb2xlYW47XG4gIC8qKiB0cnVlIFx1MjFEMiBhbiBhZ2VudCdzIG1lbnRpb24gb2YgYW5vdGhlciBhZ2VudCBtYXkgbWF0ZXJpYWxpemUgYSBqb2IgKGRlcHRoLWNhcHBlZCk7IGRlZmF1bHQgT0ZGIChcdTAwQTc1LjQpICovXG4gIGFnZW50TWVudGlvbkFnZW50PzogYm9vbGVhbjtcbn1cblxuLyoqIEdhdGUgZGVmaW5pdGlvbnMgYXJlIGRhdGEgKHJvYWRtYXAgXHUwMEE3Myk6IHF1b3J1bSArIGFjdG9yLXR5cGUgcmVxdWlyZW1lbnRzLiAqL1xuZXhwb3J0IGludGVyZmFjZSBHYXRlUG9saWN5IHtcbiAgLyoqIGRpc3RpbmN0IGFwcHJvdmVycyByZXF1aXJlZCBpbiB0aGUgY3VycmVudCByZXZpZXcgcm91bmQgKGRlZmF1bHQgMSkgKi9cbiAgbWluQXBwcm92YWxzPzogbnVtYmVyO1xuICAvKiogYXQgbGVhc3Qgb25lIGFwcHJvdmVyIG9mIGVhY2ggbGlzdGVkIHR5cGUgaXMgcmVxdWlyZWQgKGUuZy4gWyd1c2VyJ10pICovXG4gIHJlcXVpcmVkQWN0b3JUeXBlcz86IEFjdG9yVHlwZVtdO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFJvbGVBc3NpZ25tZW50IHtcbiAgYWN0b3JJZDogc3RyaW5nO1xuICByb2xlQ29kZTogc3RyaW5nO1xuICBncmFudGVkQnk6IHN0cmluZztcbiAgcmV2b2tlZDogYm9vbGVhbjtcbn1cblxuLyoqIGF1dGh6LmV4cGxhaW4gXHUyMDE0IHRoZSBkZWNpc2lvbiB0cmFjZSBhbiBhdWRpdG9yIGNhbiByZXBsYXkgKHJvYWRtYXAgXHUwMEE3MykuICovXG5leHBvcnQgaW50ZXJmYWNlIEF1dGh6RXhwbGFuYXRpb24ge1xuICBhY3RvcklkOiBzdHJpbmc7XG4gIHBlcm1pc3Npb246IFBlcm1pc3Npb247XG4gIGFsbG93ZWQ6IGJvb2xlYW47XG4gIC8qKiAnZGlyZWN0JyB8ICdyb2xlOjxjb2RlPicgd2hlbiBhIGdyYW50IGV4aXN0czsgbnVsbCB3aGVuIG5vbmUgZG9lcyAqL1xuICBzb3VyY2U6IHN0cmluZyB8IG51bGw7XG4gIGdvdmVybmFuY2VSb2xlOiBHb3Zlcm5hbmNlUm9sZTtcbiAgcGxhbjogUGxhbkNvZGU7XG4gIC8qKiBmYWxzZSB3aGVuIHRoZSBwbGFuIGNlaWxpbmcgYmxvY2tzIGFuIGFnZW50J3MgZ2F0ZSBwZXJtaXNzaW9uICovXG4gIHBsYW5BbGxvd3M6IGJvb2xlYW47XG4gIC8qKiBmYWxzZSB3aGVuIHRoZSByZXN0cmljdC1vbmx5IHdvcmtzcGFjZSBwb2xpY3kgYmxvY2tzIGl0ICovXG4gIHBvbGljeUFsbG93czogYm9vbGVhbjtcbiAgdmVyc2lvbnM6IHsgcGxhbjogbnVtYmVyOyBwb2xpY3k6IG51bWJlciB9O1xufVxuXG5leHBvcnQgdHlwZSBHYXRlQ29kZSA9ICdzcGVjX2FwcHJvdmFsJyB8ICdyZXZpZXdfYXBwcm92YWwnO1xuXG5leHBvcnQgdHlwZSBFdmlkZW5jZUtpbmQgPVxuICB8ICd0ZXN0X3J1bicgLy8ge2NvbW1hbmQsIGV4aXRDb2RlfSAgXHUyMDE0IGNvbW1hbmQgTVVTVCBtYXRjaCBhIHBpbm5lZCBvbmVcbiAgfCAnZ2l0X2RpZmYnIC8vIHtiYXNlbGluZSwgZmluYWwsIGZpbGVzQ2hhbmdlZCwgbm9uRW1wdHksIGJyYW5jaH1cbiAgfCAnY29tbWl0JyAvLyB7c2hhLCBicmFuY2gsIHJlYWNoYWJsZU9uUmVtb3RlfVxuICB8ICdoYWx0X3JlcG9ydCcgLy8gdmVyYmF0aW0gQXV0byBSdW4gUmVzdWx0XG4gIHwgJ3Jldmlld19yZXBvcnQnIC8vIExMTS1hdXRob3JlZDsgTkVWRVIgYSBndWFyZCwgY29udGV4dCBvbmx5XG4gIHwgJ2RvY19saW50JzsgLy8ge3NjaGVtYVZhbGlkfSBmb3Igbm9uLWNvZGUgd29ya1xuXG5leHBvcnQgaW50ZXJmYWNlIEV2aWRlbmNlIHtcbiAga2luZDogRXZpZGVuY2VLaW5kO1xuICBwYXlsb2FkOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPjtcbn1cblxuLyoqIFJldmlldyBsb29wOiBleGFjdGx5IHRoaXMgbWFueSBsb29wYmFja3MgYWxsb3dlZDsgdGhlIG5leHQgb25lIGJsb2Nrcy4gKi9cbmV4cG9ydCBjb25zdCBSRVZJRVdfTE9PUF9MSU1JVCA9IDU7XG5cbmV4cG9ydCBjb25zdCBJTlRFTlRfSEFTSF9BTEdPID0gJ3YxJztcblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBFbnRpdGllcyAocHJvamVjdGlvbiBzaGFwZXMgcmV0dXJuZWQgYnkgcXVlcmllcylcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5leHBvcnQgaW50ZXJmYWNlIEFjdG9yIHtcbiAgaWQ6IHN0cmluZztcbiAgdHlwZTogQWN0b3JUeXBlO1xuICBkaXNwbGF5TmFtZTogc3RyaW5nO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEZlYXR1cmUge1xuICBpZDogc3RyaW5nO1xuICBzdGF0ZTogJ2JhY2tsb2cnIHwgJ2luX3Byb2dyZXNzJyB8ICdkb25lJztcbiAgLyoqIHRydWUgd2hpbGUgYSBkb25lX2NoZWNrcG9pbnQgaG9sZCBpcyBhY3RpdmU6IG5vIGZ1cnRoZXIgZGlzcGF0Y2ggaW4gdGhpcyBmZWF0dXJlICovXG4gIGRpc3BhdGNoSG9sZDogYm9vbGVhbjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBXb3JrSXRlbSB7XG4gIGlkOiBzdHJpbmc7XG4gIGZlYXR1cmVJZDogc3RyaW5nO1xuICBleHRlcm5hbEtleTogc3RyaW5nOyAvLyBpZCBmcm9tIHN0b3JpZXMueWFtbCwgZS5nLiBcIjMtMlwiXG4gIHRpdGxlOiBzdHJpbmc7XG4gIHN0YXRlOiBXb3JrSXRlbVN0YXRlO1xuICBibG9ja2VkUmVhc29uOiBCbG9ja2VkUmVhc29uIHwgbnVsbDtcbiAgcmV2aWV3TG9vcEl0ZXJhdGlvbjogbnVtYmVyO1xuICBpbnRlbnRIYXNoOiBzdHJpbmcgfCBudWxsO1xuICBwaW5uZWRWZXJpZmljYXRpb246IHN0cmluZ1tdIHwgbnVsbDtcbiAgc3BlY0NoZWNrcG9pbnQ6IGJvb2xlYW47XG4gIGRvbmVDaGVja3BvaW50OiBib29sZWFuO1xuICBpbnZva2VEZXZXaXRoOiBzdHJpbmc7XG4gIHNwZWNQYXRoOiBzdHJpbmc7XG4gIHN0YXRlVmVyc2lvbjogbnVtYmVyO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIENsYWltIHtcbiAgaWQ6IHN0cmluZztcbiAgd29ya0l0ZW1JZDogc3RyaW5nO1xuICBhY3RvcklkOiBzdHJpbmc7XG4gIGZlbmNpbmdUb2tlbjogbnVtYmVyO1xuICBsZWFzZUV4cGlyZXNBdDogbnVtYmVyOyAvLyBlbmdpbmUtY2xvY2sgbXNcbiAgcmVsZWFzZWQ6IGJvb2xlYW47XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgU3BpbmVFdmVudCB7XG4gIGdsb2JhbFNlcTogbnVtYmVyO1xuICBzdHJlYW1UeXBlOiAnd29ya3NwYWNlJyB8ICdmZWF0dXJlJyB8ICd3b3JrX2l0ZW0nIHwgJ2FjdG9yJyB8ICd0aHJlYWQnIHwgJ2FnZW50X2pvYic7XG4gIHN0cmVhbUlkOiBzdHJpbmc7XG4gIHN0cmVhbVNlcTogbnVtYmVyO1xuICB0eXBlOiBzdHJpbmc7XG4gIGFjdG9ySWQ6IHN0cmluZztcbiAgcGF5bG9hZDogUmVjb3JkPHN0cmluZywgdW5rbm93bj47XG4gIGNhdXNhdGlvbklkPzogc3RyaW5nO1xufVxuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIENvbGxhYm9yYXRpb24gKFBoYXNlIDMsIHJvYWRtYXAgXHUwMEE3NSk6IHRoZSBjaGF0IFNVUkZBQ0UuIFNhY3JlZCBib3VuZGFyeVxuLy8gKFx1MDBBNzUuMik6IGEgbWVzc2FnZSBORVZFUiBtdXRhdGVzIGxpZmVjeWNsZTsgdGhlIG9ubHkgY3Jvc3MtZGlyZWN0aW9uIGlzXG4vLyByYWlscyBcdTIxOTIgY2hhdCAoc3lzdGVtIG5hcnJhdGlvbikuIE1lbnRpb25zIGFyZSBTVFJVQ1RVUkVEIGRhdGEgXHUyMDE0IHRoZSBzZXJ2ZXJcbi8vIG5ldmVyIHBhcnNlcyBtZXNzYWdlIHRleHQuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuZXhwb3J0IHR5cGUgVGhyZWFkS2luZCA9ICdzcGVjJyB8ICdkZXNpZ24nIHwgJ3Rhc2snIHwgJ2dlbmVyYWwnIHwgJ3ByaXZhdGUnO1xuZXhwb3J0IHR5cGUgVGhyZWFkVmlzaWJpbGl0eSA9ICdvcGVuJyB8ICdwcml2YXRlJztcblxuZXhwb3J0IGludGVyZmFjZSBUaHJlYWQge1xuICBpZDogc3RyaW5nO1xuICBmZWF0dXJlSWQ6IHN0cmluZyB8IG51bGw7XG4gIHdvcmtJdGVtSWQ6IHN0cmluZyB8IG51bGw7XG4gIGtpbmQ6IFRocmVhZEtpbmQ7XG4gIHZpc2liaWxpdHk6IFRocmVhZFZpc2liaWxpdHk7XG4gIGNyZWF0ZWRCeTogc3RyaW5nO1xuICBwYXJ0aWNpcGFudHM6IHN0cmluZ1tdOyAvLyBlbmZvcmNlZCBmb3IgcHJpdmF0ZSB0aHJlYWRzOyBpbmZvcm1hdGlvbmFsIGZvciBvcGVuIG9uZXNcbn1cblxuZXhwb3J0IGludGVyZmFjZSBNZXNzYWdlIHtcbiAgaWQ6IHN0cmluZztcbiAgdGhyZWFkSWQ6IHN0cmluZztcbiAgc2VxOiBudW1iZXI7IC8vIHBlci10aHJlYWQsIDEtYmFzZWQsIGdhcC1mcmVlXG4gIGF1dGhvcklkOiBzdHJpbmc7IC8vIGEgdXNlciBPUiBhbiBhZ2VudCAodGhlc2lzIFx1MDBBNzUuMykgXHUyMDE0IG9yIHRoZSBzeXN0ZW0gYWN0b3IgZm9yIG5hcnJhdGlvblxuICBraW5kOiAnY2hhdCcgfCAnc3lzdGVtJztcbiAgYm9keTogc3RyaW5nO1xuICByZXBseVRvOiBzdHJpbmcgfCBudWxsO1xufVxuXG4vKiogV2h5IGEgbWVudGlvbiBkaWQgb3IgZGlkIG5vdCBtYXRlcmlhbGl6ZSBhbiBhZ2VudCBqb2IgKFx1MDBBNzUuNCByb3V0ZXIgXHUyMDE0IHB1cmUgY29kZSkuICovXG5leHBvcnQgdHlwZSBNZW50aW9uUmVzb2x1dGlvbiA9XG4gIHwgJ25vdGlmaWVkJyAvLyBodW1hbiBtZW50aW9uZWQgXHUyMTkyIG5vdGlmaWNhdGlvbiBvbmx5XG4gIHwgJ2pvYl9jcmVhdGVkJyAvLyBhZ2VudCBtZW50aW9uZWQsIHJvdXRlciBwb2xpY3kgYWxsb3dzIFx1MjE5MiBhZ2VudF9qb2IgcXVldWVkXG4gIHwgJ2RlbmllZF9wb2xpY3knIC8vIGRlZmF1bHQtZGVueTogbWVudGlvbmVyIGxhY2tzIGludm9rZSBhdXRob3JpdHksIG9yIHBvbGljeSBvZmZcbiAgfCAnZGVuaWVkX2RlcHRoJzsgLy8gYWdlbnQtbWVudGlvbi1hZ2VudCBjaGFpbiBleGNlZWRlZCB0aGUgZGVwdGggY2FwXG5cbmV4cG9ydCBpbnRlcmZhY2UgTWVudGlvbiB7XG4gIG1lc3NhZ2VJZDogc3RyaW5nO1xuICBtZW50aW9uZWRBY3RvcklkOiBzdHJpbmc7XG4gIHJlc29sdXRpb246IE1lbnRpb25SZXNvbHV0aW9uO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIE5vdGlmaWNhdGlvbiB7XG4gIGlkOiBzdHJpbmc7XG4gIGFjdG9ySWQ6IHN0cmluZztcbiAgc291cmNlOiAnbWVudGlvbicgfCAnam9iX2NvbXBsZXRlZCc7XG4gIHJlZklkOiBzdHJpbmc7IC8vIG1lc3NhZ2VJZCBmb3IgbWVudGlvbnMsIGpvYklkIGZvciBjb21wbGV0aW9uc1xuICByZWFkOiBib29sZWFuO1xufVxuXG4vKipcbiAqIFJvdXRlci1tYXRlcmlhbGl6ZWQgd29yayBmb3IgYW4gYWdlbnQgKFx1MDBBNzUuNCkuIFJlcGx5LW9ubHkgY29udGV4dDogdGhlIGpvYlxuICogTkVWRVIgY2FycmllcyBhIGNsYWltIG9yIHByZS1hdXRob3JpemVkIGxpZmVjeWNsZSBhdXRob3JpdHkgXHUyMDE0IHRoZSBhZ2VudFxuICogbXV0YXRlcyBzdGF0ZSBvbmx5IHRocm91Z2ggaXRzIG93biBncmFudHMsIG9yIG5vdCBhdCBhbGwuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQWdlbnRKb2Ige1xuICBpZDogc3RyaW5nO1xuICBhZ2VudEFjdG9ySWQ6IHN0cmluZztcbiAgdGhyZWFkSWQ6IHN0cmluZztcbiAgbWVzc2FnZUlkOiBzdHJpbmc7IC8vIHRoZSB0cmlnZ2VyaW5nIG1lbnRpb25cbiAgd29ya0l0ZW1JZDogc3RyaW5nIHwgbnVsbDsgLy8gY29udGV4dCB3aGVuIHRoZSB0aHJlYWQgaXMgdGFzay1ib3VuZFxuICBmZWF0dXJlSWQ6IHN0cmluZyB8IG51bGw7XG4gIHN0YXR1czogJ3F1ZXVlZCcgfCAnZG9uZScgfCAnYmxvY2tlZCc7XG4gIGRlcHRoOiBudW1iZXI7IC8vIDAgPSBodW1hbi10cmlnZ2VyZWQ7ICsxIHBlciBhZ2VudC1tZW50aW9uLWFnZW50IGhvcFxuICBub3RlOiBzdHJpbmcgfCBudWxsO1xufVxuXG4vKiogRGVwdGggY2FwIGZvciBhZ2VudC1tZW50aW9uLWFnZW50IGNoYWlucyAoXHUwMEE3NS40OiBcImRlcHRoIGNvdW50ZXJcIikuICovXG5leHBvcnQgY29uc3QgQUdFTlRfSk9CX01BWF9ERVBUSCA9IDI7XG5cbmV4cG9ydCBpbnRlcmZhY2UgRGl2ZXJnZW5jZVJlcG9ydCB7XG4gIHdvcmtJdGVtSWQ6IHN0cmluZztcbiAgZmlsZVN0YXRlOiBzdHJpbmc7XG4gIGRiU3RhdGU6IFdvcmtJdGVtU3RhdGU7XG4gIGtpbmQ6ICdmaWxlX2FoZWFkJyB8ICdkYl9haGVhZCcgfCAnY29uZmxpY3QnO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFN0b3JpZXNJbXBvcnRSZXN1bHQge1xuICBpbXBvcnRlZDogc3RyaW5nW107IC8vIGV4dGVybmFsS2V5cyBjcmVhdGVkXG4gIHVwZGF0ZWQ6IHN0cmluZ1tdOyAvLyBleHRlcm5hbEtleXMgYWxyZWFkeSBwcmVzZW50LCByZWZyZXNoZWRcbiAgd2FybmluZ3M6IHN0cmluZ1tdOyAvLyBlLmcuIHNraXBwZWQgcmV0cm9zcGVjdGl2ZSBlbnRyaWVzXG59XG5cblxuLy8gVGhlIHByb2R1Y3Rpb24gc2VydmljZSB3cmFwcyB0aGUgc2FtZSBjb3JlIHdpdGggUG9zdGdyZXMgcGVyc2lzdGVuY2UuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuZXhwb3J0IGludGVyZmFjZSBDcmVhdGVXb3JrSXRlbUlucHV0IHtcbiAgZmVhdHVyZUlkOiBzdHJpbmc7XG4gIGV4dGVybmFsS2V5OiBzdHJpbmc7XG4gIHRpdGxlOiBzdHJpbmc7XG4gIHNwZWNDaGVja3BvaW50PzogYm9vbGVhbjtcbiAgZG9uZUNoZWNrcG9pbnQ/OiBib29sZWFuO1xuICBpbnZva2VEZXZXaXRoPzogc3RyaW5nO1xuICBkZXBlbmRzT24/OiBzdHJpbmdbXTsgLy8gZXh0ZXJuYWxLZXlzXG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQWR2YW5jZUlucHV0IHtcbiAgd29ya0l0ZW1JZDogc3RyaW5nO1xuICB0bzogV29ya0l0ZW1TdGF0ZTtcbiAgYWN0b3JJZDogc3RyaW5nO1xuICBmZW5jaW5nVG9rZW4/OiBudW1iZXI7IC8vIHJlcXVpcmVkIGZvciBjbGFpbS1ndWFyZGVkIHRyYW5zaXRpb25zXG4gIGlkZW1wb3RlbmN5S2V5Pzogc3RyaW5nO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEdhdGVEZWNpc2lvbklucHV0IHtcbiAgd29ya0l0ZW1JZDogc3RyaW5nO1xuICBnYXRlOiBHYXRlQ29kZTtcbiAgYWN0b3JJZDogc3RyaW5nO1xuICAvKiogc3BlY19hcHByb3ZhbCBvbmx5OiBwaW5zIHZlcmlmaWNhdGlvbiBjb21tYW5kcyBhcyBSdWxlcy1sYXllciBkYXRhIChyb2FkbWFwIEQ3KSAqL1xuICBwaW5uZWRWZXJpZmljYXRpb24/OiBzdHJpbmdbXTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBTcGluZUVuZ2luZSB7XG4gIC8vIC0tIHNldHVwIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICBjcmVhdGVBY3RvcihpbnB1dDoge1xuICAgIHR5cGU6IEV4Y2x1ZGU8QWN0b3JUeXBlLCAnc3lzdGVtJz47XG4gICAgZGlzcGxheU5hbWU6IHN0cmluZztcbiAgICAvKiogYm9vdHN0cmFwIHBsdW1iaW5nIChsaWtlIGNyZWF0ZUFjdG9yIGl0c2VsZik7IGRlZmF1bHQgJ21lbWJlcicgKi9cbiAgICBnb3Zlcm5hbmNlUm9sZT86IEdvdmVybmFuY2VSb2xlO1xuICB9KTogQWN0b3I7XG4gIGdyYW50KGlucHV0OiB7IGFjdG9ySWQ6IHN0cmluZzsgcGVybWlzc2lvbjogUGVybWlzc2lvbjsgc2NvcGU/OiBzdHJpbmcgfSk6IHZvaWQ7XG4gIHJldm9rZShpbnB1dDogeyBhY3RvcklkOiBzdHJpbmc7IHBlcm1pc3Npb246IFBlcm1pc3Npb247IHNjb3BlPzogc3RyaW5nIH0pOiB2b2lkO1xuICBjcmVhdGVGZWF0dXJlKGlucHV0OiB7IGFjdG9ySWQ6IHN0cmluZyB9KTogRmVhdHVyZTtcbiAgY3JlYXRlV29ya0l0ZW0oaW5wdXQ6IENyZWF0ZVdvcmtJdGVtSW5wdXQgJiB7IGFjdG9ySWQ6IHN0cmluZyB9KTogV29ya0l0ZW07XG5cbiAgLyoqIEltcG9ydCBzdG9yaWVzLnlhbWwgY29udGVudCAocmF3IFlBTUwgc3RyaW5nKS4gSWRlbXBvdGVudCByZS1pbXBvcnQgcGVyIHN0b3JpZXMtc2NoZW1hIHVwZGF0ZSBzZW1hbnRpY3MuICovXG4gIGltcG9ydFN0b3JpZXMoaW5wdXQ6IHsgZmVhdHVyZUlkOiBzdHJpbmc7IHlhbWw6IHN0cmluZzsgYWN0b3JJZDogc3RyaW5nIH0pOiBTdG9yaWVzSW1wb3J0UmVzdWx0O1xuXG4gIC8vIC0tIGNsYWltcyAocm9hZG1hcCBcdTAwQTcxLjMpIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgY2xhaW1UYXNrKGlucHV0OiB7IHdvcmtJdGVtSWQ6IHN0cmluZzsgYWN0b3JJZDogc3RyaW5nOyB0dGxNcz86IG51bWJlciB9KTogQ2xhaW07XG4gIGhlYXJ0YmVhdChpbnB1dDogeyBjbGFpbUlkOiBzdHJpbmcgfSk6IHZvaWQ7XG4gIHJlbGVhc2VDbGFpbShpbnB1dDogeyBjbGFpbUlkOiBzdHJpbmc7IHJlYXNvbj86IHN0cmluZyB9KTogdm9pZDtcbiAgLyoqIHRlc3QgY2xvY2sgXHUyMDE0IGxlYXNlIGV4cGlyeSBpcyB0aW1lLWJhc2VkICovXG4gIGFkdmFuY2VDbG9jayhtczogbnVtYmVyKTogdm9pZDtcblxuICAvLyAtLSBsaWZlY3ljbGUgKHJvYWRtYXAgXHUwMEE3MS4yKSAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIGFkdmFuY2VTdGF0ZShpbnB1dDogQWR2YW5jZUlucHV0KTogV29ya0l0ZW07XG4gIGJsb2NrVGFzayhpbnB1dDogeyB3b3JrSXRlbUlkOiBzdHJpbmc7IHJlYXNvbjogQmxvY2tlZFJlYXNvbjsgYWN0b3JJZDogc3RyaW5nOyBmZW5jaW5nVG9rZW4/OiBudW1iZXIgfSk6IFdvcmtJdGVtO1xuICB1bmJsb2NrVGFzayhpbnB1dDogeyB3b3JrSXRlbUlkOiBzdHJpbmc7IGFjdG9ySWQ6IHN0cmluZyB9KTogV29ya0l0ZW07XG5cbiAgLy8gLS0gZ2F0ZXMgJiBldmlkZW5jZSAocm9hZG1hcCBcdTAwQTcxLjQpIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgc3VibWl0RXZpZGVuY2UoaW5wdXQ6IHsgd29ya0l0ZW1JZDogc3RyaW5nOyBldmlkZW5jZTogRXZpZGVuY2U7IGFjdG9ySWQ6IHN0cmluZzsgZmVuY2luZ1Rva2VuPzogbnVtYmVyIH0pOiB2b2lkO1xuICBhcHByb3ZlR2F0ZShpbnB1dDogR2F0ZURlY2lzaW9uSW5wdXQpOiBXb3JrSXRlbTtcbiAgLyoqIFJlamVjdGlvbiBmaXJlcyB0aGUgbG9vcGJhY2sgYXMgYSBzeXN0ZW0gZWZmZWN0IFx1MjAxNCBubyBjbGFpbSBob2xkZXIgaW52b2x2ZW1lbnQgKHJvYWRtYXAgXHUwMEE3MS4yKS4gKi9cbiAgcmVqZWN0R2F0ZShpbnB1dDogR2F0ZURlY2lzaW9uSW5wdXQpOiBXb3JrSXRlbTtcblxuICAvLyAtLSBkaXNwYXRjaCAocm9hZG1hcCBcdTAwQTcyLjMpIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgLyoqIFJlZnVzZXMgc3RhdGU9ZG9uZSBpdGVtczsgcmV0dXJucyBlbnRyeS1zdGF0ZSBjb250ZXh0IGZvciB0aGUgcnVubmVyLiAqL1xuICBnZXRUYXNrQ29udGV4dChpbnB1dDogeyB3b3JrSXRlbUlkOiBzdHJpbmcgfSk6IHtcbiAgICB3b3JrSXRlbTogV29ya0l0ZW07XG4gICAgZW50cnlTdGF0ZTogV29ya0l0ZW1TdGF0ZTtcbiAgfTtcbiAgLyoqIFJlbGVhc2VzIGEgZG9uZV9jaGVja3BvaW50IGRpc3BhdGNoIGhvbGQgb24gdGhlIGZlYXR1cmUuICovXG4gIHJlbGVhc2VEaXNwYXRjaEhvbGQoaW5wdXQ6IHsgZmVhdHVyZUlkOiBzdHJpbmc7IGFjdG9ySWQ6IHN0cmluZyB9KTogRmVhdHVyZTtcblxuICAvLyAtLSByZWNvbmNpbGlhdGlvbiAocm9hZG1hcCBcdTAwQTcxLjYsIGRldGVjdC1vbmx5KSAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHJlY29uY2lsZShpbnB1dDogeyBmaWxlczogQXJyYXk8eyB3b3JrSXRlbUlkOiBzdHJpbmc7IGZyb250bWF0dGVyU3RhdHVzOiBzdHJpbmcgfT4gfSk6IERpdmVyZ2VuY2VSZXBvcnRbXTtcblxuICAvLyAtLSBlbnRpdGxlbWVudHMgKFBoYXNlIDIsIHJvYWRtYXAgXHUwMEE3MykgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIC8qKiBHb3Zlcm5hbmNlIGF1dGhvcml0eTogdGhlIHN5c3RlbSBhY3RvciBhbmQgJ2FkbWluJyBnb3Zlcm5hbmNlLXJvbGUgaG9sZGVycy4gKi9cbiAgc2V0R292ZXJuYW5jZVJvbGUoaW5wdXQ6IHsgYWN0b3JJZDogc3RyaW5nOyByb2xlOiBHb3Zlcm5hbmNlUm9sZTsgYnlBY3RvcklkOiBzdHJpbmcgfSk6IHZvaWQ7XG4gIGdldEdvdmVybmFuY2VSb2xlKGFjdG9ySWQ6IHN0cmluZyk6IEdvdmVybmFuY2VSb2xlO1xuICAvKiogQXNzaWduL3Jldm9rZSBhIGRlbGl2ZXJ5IHJvbGUgKGJ1bmRsZSBvZiBwZXJtaXNzaW9ucykuIEdhdGVkIHdyaXRlczsgYXVkaXRlZC4gKi9cbiAgYXNzaWduUm9sZShpbnB1dDogeyBhY3RvcklkOiBzdHJpbmc7IHJvbGVDb2RlOiBzdHJpbmc7IGJ5QWN0b3JJZDogc3RyaW5nIH0pOiB2b2lkO1xuICByZXZva2VSb2xlKGlucHV0OiB7IGFjdG9ySWQ6IHN0cmluZzsgcm9sZUNvZGU6IHN0cmluZzsgYnlBY3RvcklkOiBzdHJpbmcgfSk6IHZvaWQ7XG4gIGxpc3RSb2xlQXNzaWdubWVudHMoYWN0b3JJZD86IHN0cmluZyk6IFJvbGVBc3NpZ25tZW50W107XG4gIHNldFBsYW4oaW5wdXQ6IHsgcGxhbjogUGxhbkNvZGU7IGJ5QWN0b3JJZDogc3RyaW5nIH0pOiB2b2lkO1xuICBnZXRQbGFuKCk6IFBsYW5Db2RlO1xuICBzZXRXb3Jrc3BhY2VQb2xpY3koaW5wdXQ6IHsgcG9saWN5OiBXb3Jrc3BhY2VQb2xpY3k7IGJ5QWN0b3JJZDogc3RyaW5nIH0pOiB2b2lkO1xuICBnZXRXb3Jrc3BhY2VQb2xpY3koKTogV29ya3NwYWNlUG9saWN5O1xuICBzZXRHYXRlUG9saWN5KGlucHV0OiB7IGdhdGU6IEdhdGVDb2RlOyBwb2xpY3k6IEdhdGVQb2xpY3k7IGJ5QWN0b3JJZDogc3RyaW5nIH0pOiB2b2lkO1xuICBnZXRHYXRlUG9saWN5KGdhdGU6IEdhdGVDb2RlKTogR2F0ZVBvbGljeTtcbiAgLyoqIFB1cmUgZGVjaXNpb24gdHJhY2UgXHUyMDE0IHJlcGxheWFibGUgYnkgYW4gYXVkaXRvci4gTmV2ZXIgbXV0YXRlcy4gKi9cbiAgYXV0aHpFeHBsYWluKGlucHV0OiB7IGFjdG9ySWQ6IHN0cmluZzsgcGVybWlzc2lvbjogUGVybWlzc2lvbiB9KTogQXV0aHpFeHBsYW5hdGlvbjtcblxuICAvLyAtLSBjb2xsYWJvcmF0aW9uIChQaGFzZSAzLCByb2FkbWFwIFx1MDBBNzUpIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgY3JlYXRlVGhyZWFkKGlucHV0OiB7XG4gICAgYWN0b3JJZDogc3RyaW5nO1xuICAgIGtpbmQ6IFRocmVhZEtpbmQ7XG4gICAgZmVhdHVyZUlkPzogc3RyaW5nO1xuICAgIHdvcmtJdGVtSWQ/OiBzdHJpbmc7XG4gICAgdmlzaWJpbGl0eT86IFRocmVhZFZpc2liaWxpdHk7XG4gIH0pOiBUaHJlYWQ7XG4gIGFkZFRocmVhZFBhcnRpY2lwYW50KGlucHV0OiB7IHRocmVhZElkOiBzdHJpbmc7IGFjdG9ySWQ6IHN0cmluZzsgYnlBY3RvcklkOiBzdHJpbmcgfSk6IFRocmVhZDtcbiAgLyoqXG4gICAqIFBvc3QgYSBtZXNzYWdlLiBgbWVudGlvbnNgIGlzIFNUUlVDVFVSRUQgKGFjdG9yIGlkcykgXHUyMDE0IHRoZSBzZXJ2ZXIgbmV2ZXJcbiAgICogcGFyc2VzIGJvZHkgdGV4dCAoXHUwMEE3NS4yKS4gTWVudGlvbmluZyBhbiBhZ2VudCBydW5zIHRoZSBkZXRlcm1pbmlzdGljXG4gICAqIHJvdXRlciAoXHUwMEE3NS40KTogZGVmYXVsdC1kZW55LCBwb2xpY3ktZ2F0ZWQsIGRlcHRoLWNhcHBlZC5cbiAgICovXG4gIHBvc3RNZXNzYWdlKGlucHV0OiB7XG4gICAgdGhyZWFkSWQ6IHN0cmluZztcbiAgICBhY3RvcklkOiBzdHJpbmc7XG4gICAgYm9keTogc3RyaW5nO1xuICAgIHJlcGx5VG8/OiBzdHJpbmc7XG4gICAgbWVudGlvbnM/OiBzdHJpbmdbXTtcbiAgfSk6IE1lc3NhZ2U7XG4gIGxpc3RUaHJlYWRzKGZpbHRlcj86IHsgZmVhdHVyZUlkPzogc3RyaW5nOyB3b3JrSXRlbUlkPzogc3RyaW5nOyBhY3RvcklkPzogc3RyaW5nIH0pOiBUaHJlYWRbXTtcbiAgbGlzdE1lc3NhZ2VzKGlucHV0OiB7IHRocmVhZElkOiBzdHJpbmc7IGFjdG9ySWQ6IHN0cmluZzsgc2luY2VTZXE/OiBudW1iZXIgfSk6IE1lc3NhZ2VbXTtcbiAgbGlzdE1lbnRpb25zKG1lc3NhZ2VJZDogc3RyaW5nKTogTWVudGlvbltdO1xuICBsaXN0Tm90aWZpY2F0aW9ucyhpbnB1dDogeyBhY3RvcklkOiBzdHJpbmc7IHVucmVhZE9ubHk/OiBib29sZWFuIH0pOiBOb3RpZmljYXRpb25bXTtcbiAgbWFya05vdGlmaWNhdGlvblJlYWQoaW5wdXQ6IHsgbm90aWZpY2F0aW9uSWQ6IHN0cmluZzsgYWN0b3JJZDogc3RyaW5nIH0pOiB2b2lkO1xuICBsaXN0QWdlbnRKb2JzKGZpbHRlcj86IHsgYWdlbnRBY3RvcklkPzogc3RyaW5nOyBzdGF0dXM/OiBBZ2VudEpvYlsnc3RhdHVzJ10gfSk6IEFnZW50Sm9iW107XG4gIC8qKiBPbmx5IHRoZSBqb2IncyBhZ2VudCBtYXkgY29tcGxldGUgaXQ7IGNvbXBsZXRpb24gbm90aWZpZXMgdGhlIG1lbnRpb25lci4gKi9cbiAgY29tcGxldGVBZ2VudEpvYihpbnB1dDogeyBqb2JJZDogc3RyaW5nOyBhY3RvcklkOiBzdHJpbmc7IHN0YXR1czogJ2RvbmUnIHwgJ2Jsb2NrZWQnOyBub3RlPzogc3RyaW5nIH0pOiBBZ2VudEpvYjtcblxuICAvLyAtLSBxdWVyaWVzIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgZ2V0V29ya0l0ZW0oaWQ6IHN0cmluZyk6IFdvcmtJdGVtO1xuICBnZXRGZWF0dXJlKGlkOiBzdHJpbmcpOiBGZWF0dXJlO1xuICBnZXRDbGFpbXMod29ya0l0ZW1JZDogc3RyaW5nKTogQ2xhaW1bXTtcbiAgLyoqIEFkZGl0aXZlIHF1ZXJ5IHN1cmZhY2UgKHBvc3QtY29uZm9ybWFuY2UpOiBsaXN0L2ZpbHRlciB3b3JrIGl0ZW1zLiAqL1xuICBsaXN0V29ya0l0ZW1zKGZpbHRlcj86IHsgc3RhdGU/OiBXb3JrSXRlbVN0YXRlOyBmZWF0dXJlSWQ/OiBzdHJpbmc7IGNsYWltYWJsZT86IGJvb2xlYW4gfSk6IFdvcmtJdGVtW107XG4gIGV2ZW50cyhzdHJlYW1JZD86IHN0cmluZyk6IFNwaW5lRXZlbnRbXTtcbn1cbiIsICIvKipcbiAqIHN0b3JpZXMueWFtbCBwYXJzaW5nICsgdmFsaWRpdHkgcnVsZXMgKHN0b3JpZXMtc2NoZW1hLm1kLCByb2FkbWFwIEQ5KS5cbiAqXG4gKiBUaGUgc2NoZW1hJ3MgdmFsaWRpdHkgcnVsZXMgYmVjb21lIHRocm93aW5nIGNoZWNrcyBoZXJlOyB0aGUgaW1wb3J0ZXIgaW5cbiAqIHRoZSBlbmdpbmUgY29uc3VtZXMgdGhlIHZhbGlkYXRlZCBlbnRyaWVzLiBcIk5vIHN0YXR1cyBmaWVsZCwgZXZlci5cIlxuICovXG5pbXBvcnQgeyBwYXJzZSB9IGZyb20gJ3lhbWwnO1xuXG5pbXBvcnQgeyBTdG9yaWVzVmFsaWRhdGlvbkVycm9yIH0gZnJvbSAnLi90eXBlcy5qcyc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgU3RvcnlFbnRyeSB7XG4gIGlkOiBzdHJpbmc7XG4gIHRpdGxlOiBzdHJpbmc7XG4gIGRlc2NyaXB0aW9uOiBzdHJpbmc7XG4gIHNwZWNDaGVja3BvaW50OiBib29sZWFuO1xuICBkb25lQ2hlY2twb2ludDogYm9vbGVhbjtcbiAgaW52b2tlRGV2V2l0aDogc3RyaW5nO1xufVxuXG5jb25zdCBJRF9QQVRURVJOID0gL15bQS1aYS16MC05LV0rJC87XG5cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZVN0b3JpZXMoeWFtbFRleHQ6IHN0cmluZyk6IFN0b3J5RW50cnlbXSB7XG4gIGxldCByYXc6IHVua25vd247XG4gIHRyeSB7XG4gICAgcmF3ID0gcGFyc2UoeWFtbFRleHQpO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIHRocm93IG5ldyBTdG9yaWVzVmFsaWRhdGlvbkVycm9yKGBZQU1MIHBhcnNlIGZhaWx1cmU6ICR7U3RyaW5nKGVycm9yKX1gKTtcbiAgfVxuICBpZiAoIUFycmF5LmlzQXJyYXkocmF3KSkge1xuICAgIHRocm93IG5ldyBTdG9yaWVzVmFsaWRhdGlvbkVycm9yKCd0b3AgbGV2ZWwgbXVzdCBiZSBhIFlBTUwgbGlzdCBvZiBzdG9yaWVzJyk7XG4gIH1cblxuICBjb25zdCBlbnRyaWVzOiBTdG9yeUVudHJ5W10gPSBbXTtcbiAgZm9yIChjb25zdCBpdGVtIG9mIHJhdykge1xuICAgIGlmICh0eXBlb2YgaXRlbSAhPT0gJ29iamVjdCcgfHwgaXRlbSA9PT0gbnVsbCB8fCBBcnJheS5pc0FycmF5KGl0ZW0pKSB7XG4gICAgICB0aHJvdyBuZXcgU3Rvcmllc1ZhbGlkYXRpb25FcnJvcignZXZlcnkgZW50cnkgbXVzdCBiZSBhIG1hcHBpbmcnKTtcbiAgICB9XG4gICAgY29uc3QgZW50cnkgPSBpdGVtIGFzIFJlY29yZDxzdHJpbmcsIHVua25vd24+O1xuXG4gICAgLy8gUnVsZSAzOiBcIk5vIHN0YXR1cyBmaWVsZCwgZXZlci5cIlxuICAgIGlmICgnc3RhdHVzJyBpbiBlbnRyeSkge1xuICAgICAgdGhyb3cgbmV3IFN0b3JpZXNWYWxpZGF0aW9uRXJyb3IoJ25vIHN0YXR1cyBmaWVsZCwgZXZlcicpO1xuICAgIH1cbiAgICAvLyBSdWxlIDQ6IGlkcyBhcmUgWUFNTCBzdHJpbmdzLCBhbHdheXMgcXVvdGVkIFx1MjAxNCBhbiB1bnF1b3RlZCBgaWQ6IDFgXG4gICAgLy8gcGFyc2VzIGFzIGEgbnVtYmVyIGFuZCBicmVha3Mgc3RyaW5nIGNvbXBhcmlzb24uXG4gICAgaWYgKHR5cGVvZiBlbnRyeVsnaWQnXSAhPT0gJ3N0cmluZycpIHtcbiAgICAgIHRocm93IG5ldyBTdG9yaWVzVmFsaWRhdGlvbkVycm9yKCdpZCBtdXN0IGJlIGEgcXVvdGVkIFlBTUwgc3RyaW5nJyk7XG4gICAgfVxuICAgIGNvbnN0IGlkID0gZW50cnlbJ2lkJ107XG4gICAgaWYgKCFJRF9QQVRURVJOLnRlc3QoaWQpKSB7XG4gICAgICB0aHJvdyBuZXcgU3Rvcmllc1ZhbGlkYXRpb25FcnJvcihgaWQgXCIke2lkfVwiIG1heSBjb250YWluIG9ubHkgbGV0dGVycywgZGlnaXRzLCBhbmQgZGFzaGVzYCk7XG4gICAgfVxuICAgIC8vIFJ1bGUgMTogcmVxdWlyZWQgZmllbGRzLlxuICAgIGlmICh0eXBlb2YgZW50cnlbJ3RpdGxlJ10gIT09ICdzdHJpbmcnIHx8IGVudHJ5Wyd0aXRsZSddLmxlbmd0aCA9PT0gMCkge1xuICAgICAgdGhyb3cgbmV3IFN0b3JpZXNWYWxpZGF0aW9uRXJyb3IoYGVudHJ5IFwiJHtpZH1cIiBpcyBtaXNzaW5nIHJlcXVpcmVkIGZpZWxkOiB0aXRsZWApO1xuICAgIH1cbiAgICBpZiAodHlwZW9mIGVudHJ5WydkZXNjcmlwdGlvbiddICE9PSAnc3RyaW5nJyB8fCBlbnRyeVsnZGVzY3JpcHRpb24nXS5sZW5ndGggPT09IDApIHtcbiAgICAgIHRocm93IG5ldyBTdG9yaWVzVmFsaWRhdGlvbkVycm9yKGBlbnRyeSBcIiR7aWR9XCIgaXMgbWlzc2luZyByZXF1aXJlZCBmaWVsZDogZGVzY3JpcHRpb25gKTtcbiAgICB9XG5cbiAgICBlbnRyaWVzLnB1c2goe1xuICAgICAgaWQsXG4gICAgICB0aXRsZTogZW50cnlbJ3RpdGxlJ10sXG4gICAgICBkZXNjcmlwdGlvbjogZW50cnlbJ2Rlc2NyaXB0aW9uJ10sXG4gICAgICBzcGVjQ2hlY2twb2ludDogZW50cnlbJ3NwZWNfY2hlY2twb2ludCddID09PSB0cnVlLFxuICAgICAgZG9uZUNoZWNrcG9pbnQ6IGVudHJ5Wydkb25lX2NoZWNrcG9pbnQnXSA9PT0gdHJ1ZSxcbiAgICAgIGludm9rZURldldpdGg6IHR5cGVvZiBlbnRyeVsnaW52b2tlX2Rldl93aXRoJ10gPT09ICdzdHJpbmcnID8gZW50cnlbJ2ludm9rZV9kZXZfd2l0aCddIDogJycsXG4gICAgfSk7XG4gIH1cblxuICAvLyBSdWxlIDE6IGlkcyB1bmlxdWUuXG4gIGNvbnN0IHNlZW4gPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgZm9yIChjb25zdCB7IGlkIH0gb2YgZW50cmllcykge1xuICAgIGlmIChzZWVuLmhhcyhpZCkpIHRocm93IG5ldyBTdG9yaWVzVmFsaWRhdGlvbkVycm9yKGBkdXBsaWNhdGUgaWQgXCIke2lkfVwiYCk7XG4gICAgc2Vlbi5hZGQoaWQpO1xuICB9XG4gIC8vIFJ1bGUgMjogcHJlZml4LWZyZWUgdW5kZXIgdGhlIGA8aWQ+LWAgZmlsZW5hbWUtbWF0Y2hpbmcgY29udmVudGlvbi5cbiAgZm9yIChjb25zdCBhIG9mIHNlZW4pIHtcbiAgICBmb3IgKGNvbnN0IGIgb2Ygc2Vlbikge1xuICAgICAgaWYgKGEgIT09IGIgJiYgYS5zdGFydHNXaXRoKGAke2J9LWApKSB7XG4gICAgICAgIHRocm93IG5ldyBTdG9yaWVzVmFsaWRhdGlvbkVycm9yKGBpZHMgXCIke2J9XCIgYW5kIFwiJHthfVwiIGNvbGxpZGUgdW5kZXIgdGhlIDxpZD4tIGNvbnZlbnRpb25gKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgcmV0dXJuIGVudHJpZXM7XG59XG4iLCAiLyoqXG4gKiBJbi1tZW1vcnkgcmVmZXJlbmNlIGltcGxlbWVudGF0aW9uIG9mIHRoZSBzcGluZSBlbmdpbmUsIHdyaXR0ZW4gdG8gbWFrZSB0aGVcbiAqIGNvbmZvcm1hbmNlIHN1aXRlIGluIHRlc3QvIHBhc3MuIFRoZSBwcm9kdWN0aW9uIHNlcnZpY2Ugd3JhcHMgdGhpcyBzYW1lXG4gKiBjb3JlIHdpdGggUG9zdGdyZXMgcGVyc2lzdGVuY2UgKFBoYXNlIDEgc3RvcnkgXCIxMVwiKS5cbiAqXG4gKiBSdWxlIHByb3ZlbmFuY2UgbGl2ZXMgaW4gdGhlIHRlc3RzIGFuZCBpbiB0ZXN0L0NPTkZPUk1BTkNFLm1kIFx1MjAxNCB0aGlzIGZpbGVcbiAqIG9ubHkgZW5jb2RlcyB3aGF0IHRoZSBzdWl0ZSBwaW5zLiBXaGVyZSBhbiBvcmRlcmluZyBvciBzZW1hbnRpYyB3YXNcbiAqIGFyYml0cmF0ZWQsIHRoZSBjb21tZW50IG5hbWVzIHRoZSBwaW4uXG4gKi9cbmltcG9ydCB7XG4gIEFHRU5UX0dBVEVfQVBQUk9WRV9QRVJNSVNTSU9OUyxcbiAgQUdFTlRfSk9CX01BWF9ERVBUSCxcbiAgQkxPQ0tFRF9SRUFTT05TLFxuICBDb25mbGljdEVycm9yLFxuICBERUZBVUxUX1BMQU4sXG4gIERFTElWRVJZX1JPTEVTLFxuICBHdWFyZEZhaWxlZEVycm9yLFxuICBJbnZhbGlkVHJhbnNpdGlvbkVycm9yLFxuICBQZXJtaXNzaW9uRGVuaWVkRXJyb3IsXG4gIFBMQU5fQ0VJTElOR1MsXG4gIFJFVklFV19MT09QX0xJTUlULFxuICBTdG9yaWVzVmFsaWRhdGlvbkVycm9yLFxuICBXT1JLX0lURU1fU1RBVEVTLFxuICB0eXBlIEFjdG9yLFxuICB0eXBlIEFjdG9yVHlwZSxcbiAgdHlwZSBBZHZhbmNlSW5wdXQsXG4gIHR5cGUgQWdlbnRKb2IsXG4gIHR5cGUgQXV0aHpFeHBsYW5hdGlvbixcbiAgdHlwZSBCbG9ja2VkUmVhc29uLFxuICB0eXBlIE1lbnRpb24sXG4gIHR5cGUgTWVzc2FnZSxcbiAgdHlwZSBOb3RpZmljYXRpb24sXG4gIHR5cGUgVGhyZWFkLFxuICB0eXBlIFRocmVhZEtpbmQsXG4gIHR5cGUgVGhyZWFkVmlzaWJpbGl0eSxcbiAgdHlwZSBDbGFpbSxcbiAgdHlwZSBDcmVhdGVXb3JrSXRlbUlucHV0LFxuICB0eXBlIERpdmVyZ2VuY2VSZXBvcnQsXG4gIHR5cGUgRXZpZGVuY2UsXG4gIHR5cGUgRmVhdHVyZSxcbiAgdHlwZSBHYXRlQ29kZSxcbiAgdHlwZSBHYXRlRGVjaXNpb25JbnB1dCxcbiAgdHlwZSBHYXRlUG9saWN5LFxuICB0eXBlIEdvdmVybmFuY2VSb2xlLFxuICB0eXBlIFBlcm1pc3Npb24sXG4gIHR5cGUgUGxhbkNvZGUsXG4gIHR5cGUgUm9sZUFzc2lnbm1lbnQsXG4gIHR5cGUgU3BpbmVFbmdpbmUsXG4gIHR5cGUgU3BpbmVFdmVudCxcbiAgdHlwZSBTdG9yaWVzSW1wb3J0UmVzdWx0LFxuICB0eXBlIFdvcmtJdGVtLFxuICB0eXBlIFdvcmtJdGVtU3RhdGUsXG4gIHR5cGUgV29ya3NwYWNlUG9saWN5LFxufSBmcm9tICcuL3R5cGVzLmpzJztcbmltcG9ydCB7IHBhcnNlU3RvcmllcyB9IGZyb20gJy4vc3Rvcmllcy5qcyc7XG5cbmNvbnN0IFJBTks6IFJlY29yZDxXb3JrSXRlbVN0YXRlLCBudW1iZXI+ID0gT2JqZWN0LmZyb21FbnRyaWVzKFxuICBXT1JLX0lURU1fU1RBVEVTLm1hcCgocywgaSkgPT4gW3MsIGldKSxcbikgYXMgUmVjb3JkPFdvcmtJdGVtU3RhdGUsIG51bWJlcj47XG5cbi8qKlxuICogVGhlIHZlcnNpb25lZCB0cmFuc2l0aW9uIHRhYmxlIChyb2FkbWFwIFx1MDBBNzEuMikuIENsYWltcyBzZXJpYWxpemUgdGhlXG4gKiBFWEVDVVRJT04gem9uZSAoY29uZm9ybWFuY2UgcGluLCBzZWUgdGVzdC9DT05GT1JNQU5DRS5tZCk6IHBsYW5uaW5nXG4gKiB0cmFuc2l0aW9ucyBhcmUgcGVybWlzc2lvbi1vbmx5OyByZWFkeV9mb3JfZGV2XHUyMTkyaW5fcHJvZ3Jlc3Mgb253YXJkIGRlbWFuZCBhXG4gKiBwcmVzZW50ZWQsIGxpdmUgZmVuY2luZyB0b2tlbi4gR2F0ZS1maXJlZCB0cmFuc2l0aW9ucyAoc3BlY19hcHByb3ZhbCxcbiAqIHJldmlld19hcHByb3ZhbCkgZG8gbm90IGFwcGVhciBoZXJlIFx1MjAxNCBhcHByb3ZlR2F0ZS9yZWplY3RHYXRlIGZpcmUgdGhlbS5cbiAqL1xuaW50ZXJmYWNlIFRyYW5zaXRpb25SdWxlIHtcbiAgZnJvbTogV29ya0l0ZW1TdGF0ZTtcbiAgdG86IFdvcmtJdGVtU3RhdGU7XG4gIHBlcm1pc3Npb246IFBlcm1pc3Npb247XG4gIGNsYWltUmVxdWlyZWQ6IGJvb2xlYW47XG4gIGd1YXJkczogQXJyYXk8J2RlcHNfZG9uZScgfCAnc3BlY19nYXRlX2lmX2NoZWNrcG9pbnQnIHwgJ25vbmVtcHR5X2RpZmYnPjtcbn1cblxuY29uc3QgVFJBTlNJVElPTlM6IFRyYW5zaXRpb25SdWxlW10gPSBbXG4gIHsgZnJvbTogJ2JhY2tsb2cnLCB0bzogJ2RyYWZ0JywgcGVybWlzc2lvbjogJ3Rhc2sucGxhbicsIGNsYWltUmVxdWlyZWQ6IGZhbHNlLCBndWFyZHM6IFtdIH0sXG4gIHtcbiAgICBmcm9tOiAnZHJhZnQnLFxuICAgIHRvOiAncmVhZHlfZm9yX2RldicsXG4gICAgcGVybWlzc2lvbjogJ3Rhc2sucGxhbicsXG4gICAgY2xhaW1SZXF1aXJlZDogZmFsc2UsXG4gICAgZ3VhcmRzOiBbJ3NwZWNfZ2F0ZV9pZl9jaGVja3BvaW50J10sXG4gIH0sXG4gIHtcbiAgICBmcm9tOiAncmVhZHlfZm9yX2RldicsXG4gICAgdG86ICdpbl9wcm9ncmVzcycsXG4gICAgcGVybWlzc2lvbjogJ3Rhc2suYWR2YW5jZScsXG4gICAgY2xhaW1SZXF1aXJlZDogdHJ1ZSxcbiAgICBndWFyZHM6IFsnZGVwc19kb25lJ10sXG4gIH0sXG4gIHtcbiAgICBmcm9tOiAnaW5fcHJvZ3Jlc3MnLFxuICAgIHRvOiAnaW5fcmV2aWV3JyxcbiAgICBwZXJtaXNzaW9uOiAndGFzay5hZHZhbmNlJyxcbiAgICBjbGFpbVJlcXVpcmVkOiB0cnVlLFxuICAgIGd1YXJkczogWydub25lbXB0eV9kaWZmJ10sXG4gIH0sXG5dO1xuXG5pbnRlcmZhY2UgV29ya0l0ZW1Sb3cgZXh0ZW5kcyBXb3JrSXRlbSB7XG4gIGRlcGVuZHNPbjogc3RyaW5nW107XG59XG5cbmludGVyZmFjZSBDbGFpbVJvdyBleHRlbmRzIENsYWltIHtcbiAgdHRsTXM6IG51bWJlcjtcbn1cblxuaW50ZXJmYWNlIEdhdGVEZWNpc2lvblJvdyB7XG4gIHdvcmtJdGVtSWQ6IHN0cmluZztcbiAgZ2F0ZTogR2F0ZUNvZGU7XG4gIGRlY2lzaW9uOiAnYXBwcm92ZWQnIHwgJ3JlamVjdGVkJztcbiAgYWN0b3JJZDogc3RyaW5nO1xuICAvKiogcmV2aWV3IHJvdW5kIHRoZSBkZWNpc2lvbiBiZWxvbmdzIHRvICg9IHJldmlld0xvb3BJdGVyYXRpb24gYXQgZGVjaXNpb24gdGltZSkgKi9cbiAgcm91bmQ6IG51bWJlcjtcbn1cblxuaW50ZXJmYWNlIFJvbGVBc3NpZ25tZW50Um93IGV4dGVuZHMgUm9sZUFzc2lnbm1lbnQge31cblxuaW50ZXJmYWNlIEV2aWRlbmNlUm93IHtcbiAgd29ya0l0ZW1JZDogc3RyaW5nO1xuICBldmlkZW5jZTogRXZpZGVuY2U7XG4gIHNlcTogbnVtYmVyO1xufVxuXG5jb25zdCBMRUdBQ1lfU1RBVFVTOiBSZWNvcmQ8c3RyaW5nLCBXb3JrSXRlbVN0YXRlPiA9IHtcbiAgYmFja2xvZzogJ2JhY2tsb2cnLFxuICBkcmFmdDogJ2RyYWZ0JyxcbiAgJ3JlYWR5LWZvci1kZXYnOiAncmVhZHlfZm9yX2RldicsXG4gIHJlYWR5X2Zvcl9kZXY6ICdyZWFkeV9mb3JfZGV2JyxcbiAgJ2luLXByb2dyZXNzJzogJ2luX3Byb2dyZXNzJyxcbiAgaW5fcHJvZ3Jlc3M6ICdpbl9wcm9ncmVzcycsXG4gICdpbi1yZXZpZXcnOiAnaW5fcmV2aWV3JyxcbiAgaW5fcmV2aWV3OiAnaW5fcmV2aWV3JyxcbiAgcmV2aWV3OiAnaW5fcmV2aWV3JyxcbiAgZG9uZTogJ2RvbmUnLFxufTtcblxuY2xhc3MgRW5naW5lSW1wbCBpbXBsZW1lbnRzIFNwaW5lRW5naW5lIHtcbiAgcHJpdmF0ZSBub3cgPSAwO1xuICBwcml2YXRlIHNlcSA9IDA7XG4gIHByaXZhdGUgZ2xvYmFsU2VxID0gMDtcblxuICBwcml2YXRlIHJlYWRvbmx5IGFjdG9ycyA9IG5ldyBNYXA8c3RyaW5nLCBBY3Rvcj4oKTtcbiAgcHJpdmF0ZSByZWFkb25seSBncmFudHMgPSBuZXcgTWFwPHN0cmluZywgU2V0PHN0cmluZz4+KCk7IC8vIGFjdG9ySWQgLT4gXCJwZXJtaXNzaW9uXCIgKHNjb3BlIGlnbm9yZWQgdW50aWwgUGhhc2UgMilcbiAgcHJpdmF0ZSByZWFkb25seSBmZWF0dXJlcyA9IG5ldyBNYXA8c3RyaW5nLCBGZWF0dXJlPigpO1xuICBwcml2YXRlIHJlYWRvbmx5IHdvcmtJdGVtcyA9IG5ldyBNYXA8c3RyaW5nLCBXb3JrSXRlbVJvdz4oKTtcbiAgcHJpdmF0ZSByZWFkb25seSBleHRlcm5hbEtleUluZGV4ID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZz4oKTsgLy8gZXh0ZXJuYWxLZXkgLT4gd29ya0l0ZW1JZCAoZmlyc3Qgd3JpdGVyIHdpbnMpXG4gIHByaXZhdGUgcmVhZG9ubHkgY2xhaW1zID0gbmV3IE1hcDxzdHJpbmcsIENsYWltUm93PigpO1xuICBwcml2YXRlIHJlYWRvbmx5IGNsYWltc0J5SXRlbSA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmdbXT4oKTsgLy8gd29ya0l0ZW1JZCAtPiBjbGFpbUlkc1xuICBwcml2YXRlIHJlYWRvbmx5IGZlbmNpbmdDb3VudGVyID0gbmV3IE1hcDxzdHJpbmcsIG51bWJlcj4oKTsgLy8gd29ya0l0ZW1JZCAtPiBsYXN0IHRva2VuXG4gIHByaXZhdGUgcmVhZG9ubHkgZ2F0ZURlY2lzaW9uczogR2F0ZURlY2lzaW9uUm93W10gPSBbXTtcbiAgcHJpdmF0ZSByZWFkb25seSBldmlkZW5jZVJvd3M6IEV2aWRlbmNlUm93W10gPSBbXTtcbiAgcHJpdmF0ZSByZWFkb25seSBldmVudExvZzogU3BpbmVFdmVudFtdID0gW107XG4gIHByaXZhdGUgcmVhZG9ubHkgc3RyZWFtU2VxcyA9IG5ldyBNYXA8c3RyaW5nLCBudW1iZXI+KCk7XG4gIHByaXZhdGUgcmVhZG9ubHkgaWRlbXBvdGVuY3lDYWNoZSA9IG5ldyBNYXA8c3RyaW5nLCBXb3JrSXRlbT4oKTtcblxuICAvLyAtLSBlbnRpdGxlbWVudHMgc3RhdGUgKFBoYXNlIDIsIHJvYWRtYXAgXHUwMEE3MykgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgcHJpdmF0ZSByZWFkb25seSBnb3Zlcm5hbmNlUm9sZXMgPSBuZXcgTWFwPHN0cmluZywgR292ZXJuYW5jZVJvbGU+KCk7XG4gIHByaXZhdGUgcmVhZG9ubHkgcm9sZUFzc2lnbm1lbnRzOiBSb2xlQXNzaWdubWVudFJvd1tdID0gW107XG4gIHByaXZhdGUgcGxhbjogUGxhbkNvZGUgPSBERUZBVUxUX1BMQU47XG4gIHByaXZhdGUgcGxhblZlcnNpb24gPSAxO1xuICBwcml2YXRlIHdvcmtzcGFjZVBvbGljeTogV29ya3NwYWNlUG9saWN5ID0ge307XG4gIHByaXZhdGUgcG9saWN5VmVyc2lvbiA9IDE7XG4gIHByaXZhdGUgcmVhZG9ubHkgZ2F0ZVBvbGljaWVzID0gbmV3IE1hcDxHYXRlQ29kZSwgR2F0ZVBvbGljeT4oKTtcblxuICAvLyAtLSBjb2xsYWJvcmF0aW9uIHN0YXRlIChQaGFzZSAzLCByb2FkbWFwIFx1MDBBNzUpIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHByaXZhdGUgcmVhZG9ubHkgdGhyZWFkcyA9IG5ldyBNYXA8c3RyaW5nLCBUaHJlYWQ+KCk7XG4gIHByaXZhdGUgcmVhZG9ubHkgbWVzc2FnZXM6IE1lc3NhZ2VbXSA9IFtdO1xuICBwcml2YXRlIHJlYWRvbmx5IG1lbnRpb25zOiBNZW50aW9uW10gPSBbXTtcbiAgcHJpdmF0ZSByZWFkb25seSBub3RpZmljYXRpb25zOiBOb3RpZmljYXRpb25bXSA9IFtdO1xuICBwcml2YXRlIHJlYWRvbmx5IGFnZW50Sm9icyA9IG5ldyBNYXA8c3RyaW5nLCBBZ2VudEpvYj4oKTtcblxuICByZWFkb25seSBzeXN0ZW1BY3RvcklkOiBzdHJpbmc7XG5cbiAgY29uc3RydWN0b3IoKSB7XG4gICAgdGhpcy5zeXN0ZW1BY3RvcklkID0gdGhpcy5uZXh0SWQoJ2FjdG9yLXN5c3RlbScpO1xuICAgIHRoaXMuYWN0b3JzLnNldCh0aGlzLnN5c3RlbUFjdG9ySWQsIHtcbiAgICAgIGlkOiB0aGlzLnN5c3RlbUFjdG9ySWQsXG4gICAgICB0eXBlOiAnc3lzdGVtJyxcbiAgICAgIGRpc3BsYXlOYW1lOiAnc3lzdGVtJyxcbiAgICB9KTtcbiAgfVxuXG4gIC8vIC0tIGluZnJhc3RydWN0dXJlIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgcHJpdmF0ZSBuZXh0SWQocHJlZml4OiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIHRoaXMuc2VxICs9IDE7XG4gICAgcmV0dXJuIGAke3ByZWZpeH1fJHt0aGlzLnNlcS50b1N0cmluZygzNikucGFkU3RhcnQoNiwgJzAnKX1gO1xuICB9XG5cbiAgcHJpdmF0ZSBhcHBlbmQoXG4gICAgc3RyZWFtVHlwZTogU3BpbmVFdmVudFsnc3RyZWFtVHlwZSddLFxuICAgIHN0cmVhbUlkOiBzdHJpbmcsXG4gICAgdHlwZTogc3RyaW5nLFxuICAgIGFjdG9ySWQ6IHN0cmluZyxcbiAgICBwYXlsb2FkOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPixcbiAgICBleHRyYT86IHsgY2F1c2F0aW9uSWQ/OiBzdHJpbmc7IGlkZW1wb3RlbmN5S2V5Pzogc3RyaW5nIH0sXG4gICk6IFNwaW5lRXZlbnQge1xuICAgIHRoaXMuZ2xvYmFsU2VxICs9IDE7XG4gICAgY29uc3Qgc3RyZWFtU2VxID0gKHRoaXMuc3RyZWFtU2Vxcy5nZXQoc3RyZWFtSWQpID8/IDApICsgMTtcbiAgICB0aGlzLnN0cmVhbVNlcXMuc2V0KHN0cmVhbUlkLCBzdHJlYW1TZXEpO1xuICAgIGNvbnN0IGV2ZW50OiBTcGluZUV2ZW50ID0ge1xuICAgICAgZ2xvYmFsU2VxOiB0aGlzLmdsb2JhbFNlcSxcbiAgICAgIHN0cmVhbVR5cGUsXG4gICAgICBzdHJlYW1JZCxcbiAgICAgIHN0cmVhbVNlcSxcbiAgICAgIHR5cGUsXG4gICAgICBhY3RvcklkLFxuICAgICAgcGF5bG9hZCxcbiAgICAgIC4uLihleHRyYT8uY2F1c2F0aW9uSWQgIT09IHVuZGVmaW5lZCA/IHsgY2F1c2F0aW9uSWQ6IGV4dHJhLmNhdXNhdGlvbklkIH0gOiB7fSksXG4gICAgfTtcbiAgICB0aGlzLmV2ZW50TG9nLnB1c2goZXZlbnQpO1xuICAgIHJldHVybiBldmVudDtcbiAgfVxuXG4gIHByaXZhdGUgbXVzdEdldEl0ZW0od29ya0l0ZW1JZDogc3RyaW5nKTogV29ya0l0ZW1Sb3cge1xuICAgIGNvbnN0IGJ5SWQgPSB0aGlzLndvcmtJdGVtcy5nZXQod29ya0l0ZW1JZCk7XG4gICAgaWYgKGJ5SWQpIHJldHVybiBieUlkO1xuICAgIC8vIEltcG9ydGVkIHN0b3JpZXMgYXJlIGFkZHJlc3NlZCBieSB0aGVpciBleHRlcm5hbEtleSBoYW5kbGVcbiAgICAvLyAoY29uZm9ybWFuY2UgcGluIGluIHN0b3JpZXMtaW1wb3J0LnRlc3QudHMpLlxuICAgIGNvbnN0IG1hcHBlZCA9IHRoaXMuZXh0ZXJuYWxLZXlJbmRleC5nZXQod29ya0l0ZW1JZCk7XG4gICAgaWYgKG1hcHBlZCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBjb25zdCBpdGVtID0gdGhpcy53b3JrSXRlbXMuZ2V0KG1hcHBlZCk7XG4gICAgICBpZiAoaXRlbSkgcmV0dXJuIGl0ZW07XG4gICAgfVxuICAgIHRocm93IG5ldyBHdWFyZEZhaWxlZEVycm9yKGB1bmtub3duIHdvcmsgaXRlbTogJHt3b3JrSXRlbUlkfWApO1xuICB9XG5cbiAgLyoqXG4gICAqIEVudGl0bGVtZW50IHJlc29sdXRpb24gXHUyMDE0IGEgUFVSRSBmdW5jdGlvbiBvdmVyIHBsYW4gXHUwMEQ3IGdvdmVybmFuY2UgXHUwMEQ3XG4gICAqIGRlbGl2ZXJ5LXJvbGUgZGF0YSAocm9hZG1hcCBcdTAwQTczKS4gQSBncmFudCBtYXkgRVhJU1QgKGRpcmVjdCBvciB2aWEgYVxuICAgKiByb2xlKSBhbmQgc3RpbGwgbm90IFJFU09MVkUgZm9yIGFuIGFnZW50IHdoZW4gdGhlIHBsYW4gY2VpbGluZyBvciB0aGVcbiAgICogcmVzdHJpY3Qtb25seSB3b3Jrc3BhY2UgcG9saWN5IG5hcnJvd3MgaXQuIFVzZXJzIGFyZSBuZXZlciBwbGFuLWZpbHRlcmVkLlxuICAgKi9cbiAgcHJpdmF0ZSBncmFudFNvdXJjZShhY3RvcklkOiBzdHJpbmcsIHBlcm1pc3Npb246IFBlcm1pc3Npb24pOiBzdHJpbmcgfCBudWxsIHtcbiAgICBpZiAodGhpcy5ncmFudHMuZ2V0KGFjdG9ySWQpPy5oYXMocGVybWlzc2lvbikpIHJldHVybiAnZGlyZWN0JztcbiAgICBmb3IgKGNvbnN0IGFzc2lnbm1lbnQgb2YgdGhpcy5yb2xlQXNzaWdubWVudHMpIHtcbiAgICAgIGlmIChhc3NpZ25tZW50LmFjdG9ySWQgIT09IGFjdG9ySWQgfHwgYXNzaWdubWVudC5yZXZva2VkKSBjb250aW51ZTtcbiAgICAgIGlmICgoREVMSVZFUllfUk9MRVNbYXNzaWdubWVudC5yb2xlQ29kZV0gPz8gW10pLmluY2x1ZGVzKHBlcm1pc3Npb24pKSB7XG4gICAgICAgIHJldHVybiBgcm9sZToke2Fzc2lnbm1lbnQucm9sZUNvZGV9YDtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICBwcml2YXRlIGFnZW50Q2VpbGluZ0FsbG93cyhhY3RvcjogQWN0b3IgfCB1bmRlZmluZWQsIHBlcm1pc3Npb246IFBlcm1pc3Npb24pOiB7IHBsYW46IGJvb2xlYW47IHBvbGljeTogYm9vbGVhbiB9IHtcbiAgICBpZiAoIWFjdG9yIHx8IGFjdG9yLnR5cGUgIT09ICdhZ2VudCcpIHJldHVybiB7IHBsYW46IHRydWUsIHBvbGljeTogdHJ1ZSB9O1xuICAgIGNvbnN0IGNlaWxpbmcgPSBQTEFOX0NFSUxJTkdTW3RoaXMucGxhbl07XG4gICAgaWYgKChBR0VOVF9HQVRFX0FQUFJPVkVfUEVSTUlTU0lPTlMgYXMgcmVhZG9ubHkgc3RyaW5nW10pLmluY2x1ZGVzKHBlcm1pc3Npb24pKSB7XG4gICAgICByZXR1cm4geyBwbGFuOiBjZWlsaW5nLmFnZW50R2F0ZUFwcHJvdmUsIHBvbGljeTogdGhpcy53b3Jrc3BhY2VQb2xpY3kuYWdlbnRHYXRlQXBwcm92YWxzICE9PSBmYWxzZSB9O1xuICAgIH1cbiAgICBpZiAocGVybWlzc2lvbiA9PT0gJ2dhdGUucmV2aWV3LnJlamVjdCcpIHtcbiAgICAgIHJldHVybiB7IHBsYW46IGNlaWxpbmcuYWdlbnRHYXRlUmVqZWN0LCBwb2xpY3k6IHRydWUgfTtcbiAgICB9XG4gICAgaWYgKHBlcm1pc3Npb24gPT09ICd0YXNrLmNsYWltJykge1xuICAgICAgcmV0dXJuIHsgcGxhbjogdHJ1ZSwgcG9saWN5OiB0aGlzLndvcmtzcGFjZVBvbGljeS5hZ2VudFNlbGZEaXNwYXRjaCAhPT0gZmFsc2UgfTtcbiAgICB9XG4gICAgcmV0dXJuIHsgcGxhbjogdHJ1ZSwgcG9saWN5OiB0cnVlIH07XG4gIH1cblxuICBwcml2YXRlIGhhc1Blcm1pc3Npb24oYWN0b3JJZDogc3RyaW5nLCBwZXJtaXNzaW9uOiBQZXJtaXNzaW9uKTogYm9vbGVhbiB7XG4gICAgaWYgKHRoaXMuZ3JhbnRTb3VyY2UoYWN0b3JJZCwgcGVybWlzc2lvbikgPT09IG51bGwpIHJldHVybiBmYWxzZTtcbiAgICBjb25zdCBhbGxvd3MgPSB0aGlzLmFnZW50Q2VpbGluZ0FsbG93cyh0aGlzLmFjdG9ycy5nZXQoYWN0b3JJZCksIHBlcm1pc3Npb24pO1xuICAgIHJldHVybiBhbGxvd3MucGxhbiAmJiBhbGxvd3MucG9saWN5O1xuICB9XG5cbiAgcHJpdmF0ZSByZXF1aXJlUGVybWlzc2lvbihhY3RvcklkOiBzdHJpbmcsIHBlcm1pc3Npb246IFBlcm1pc3Npb24pOiB2b2lkIHtcbiAgICBpZiAoIXRoaXMuaGFzUGVybWlzc2lvbihhY3RvcklkLCBwZXJtaXNzaW9uKSkge1xuICAgICAgdGhyb3cgbmV3IFBlcm1pc3Npb25EZW5pZWRFcnJvcihwZXJtaXNzaW9uLCBhY3RvcklkKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIHJlcXVpcmVHb3Zlcm5hbmNlQWRtaW4oYnlBY3RvcklkOiBzdHJpbmcpOiB2b2lkIHtcbiAgICBpZiAoYnlBY3RvcklkID09PSB0aGlzLnN5c3RlbUFjdG9ySWQpIHJldHVybjtcbiAgICBpZiAodGhpcy5nb3Zlcm5hbmNlUm9sZXMuZ2V0KGJ5QWN0b3JJZCkgPT09ICdhZG1pbicpIHJldHVybjtcbiAgICB0aHJvdyBuZXcgUGVybWlzc2lvbkRlbmllZEVycm9yKCdnb3Zlcm5hbmNlLmFkbWluJywgYnlBY3RvcklkKTtcbiAgfVxuXG4gIC8qKiBHcmFudC10aW1lIHBsYW4gY2VpbGluZzogcmVmdXNlIGlzc3VpbmcgYWdlbnQgZ2F0ZSBwZXJtaXNzaW9ucyB0aGUgcGxhbiBmb3JiaWRzLiAqL1xuICBwcml2YXRlIGNoZWNrR3JhbnRDZWlsaW5nKGFjdG9ySWQ6IHN0cmluZywgcGVybWlzc2lvbjogUGVybWlzc2lvbik6IHZvaWQge1xuICAgIGNvbnN0IGFjdG9yID0gdGhpcy5hY3RvcnMuZ2V0KGFjdG9ySWQpO1xuICAgIGlmICghYWN0b3IgfHwgYWN0b3IudHlwZSAhPT0gJ2FnZW50JykgcmV0dXJuO1xuICAgIGNvbnN0IGNlaWxpbmcgPSBQTEFOX0NFSUxJTkdTW3RoaXMucGxhbl07XG4gICAgaWYgKChBR0VOVF9HQVRFX0FQUFJPVkVfUEVSTUlTU0lPTlMgYXMgcmVhZG9ubHkgc3RyaW5nW10pLmluY2x1ZGVzKHBlcm1pc3Npb24pICYmICFjZWlsaW5nLmFnZW50R2F0ZUFwcHJvdmUpIHtcbiAgICAgIHRocm93IG5ldyBHdWFyZEZhaWxlZEVycm9yKGBwbGFuICR7dGhpcy5wbGFufSBkb2VzIG5vdCBhbGxvdyBhZ2VudHMgdG8gaG9sZCAke3Blcm1pc3Npb259YCk7XG4gICAgfVxuICAgIGlmIChwZXJtaXNzaW9uID09PSAnZ2F0ZS5yZXZpZXcucmVqZWN0JyAmJiAhY2VpbGluZy5hZ2VudEdhdGVSZWplY3QpIHtcbiAgICAgIHRocm93IG5ldyBHdWFyZEZhaWxlZEVycm9yKGBwbGFuICR7dGhpcy5wbGFufSBkb2VzIG5vdCBhbGxvdyBhZ2VudHMgdG8gaG9sZCAke3Blcm1pc3Npb259YCk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBsaXZlQ2xhaW0od29ya0l0ZW1JZDogc3RyaW5nKTogQ2xhaW1Sb3cgfCBudWxsIHtcbiAgICBmb3IgKGNvbnN0IGNsYWltSWQgb2YgdGhpcy5jbGFpbXNCeUl0ZW0uZ2V0KHdvcmtJdGVtSWQpID8/IFtdKSB7XG4gICAgICBjb25zdCBjbGFpbSA9IHRoaXMuY2xhaW1zLmdldChjbGFpbUlkKTtcbiAgICAgIGlmIChjbGFpbSAmJiAhY2xhaW0ucmVsZWFzZWQgJiYgY2xhaW0ubGVhc2VFeHBpcmVzQXQgPiB0aGlzLm5vdykgcmV0dXJuIGNsYWltO1xuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIC8qKlxuICAgKiBBIFBSRVNFTlRFRCB0b2tlbiBpcyBhbHdheXMgdmFsaWRhdGVkLCBvbiBldmVyeSBjb21tYW5kIChjb25mb3JtYW5jZSBwaW4sXG4gICAqIGNsYWltcy50ZXN0LnRzKTogc3RhbGUvZm9yZWlnbi9uby1saXZlLWNsYWltIFx1MjE5MiBDb25mbGljdEVycm9yICsgYXVkaXQgZXZlbnQuXG4gICAqL1xuICBwcml2YXRlIHZhbGlkYXRlUHJlc2VudGVkVG9rZW4oaXRlbTogV29ya0l0ZW1Sb3csIGZlbmNpbmdUb2tlbjogbnVtYmVyIHwgdW5kZWZpbmVkLCBhY3RvcklkOiBzdHJpbmcpOiB2b2lkIHtcbiAgICBpZiAoZmVuY2luZ1Rva2VuID09PSB1bmRlZmluZWQpIHJldHVybjtcbiAgICBjb25zdCBsaXZlID0gdGhpcy5saXZlQ2xhaW0oaXRlbS5pZCk7XG4gICAgaWYgKGxpdmUgPT09IG51bGwgfHwgbGl2ZS5mZW5jaW5nVG9rZW4gIT09IGZlbmNpbmdUb2tlbikge1xuICAgICAgdGhpcy5hcHBlbmQoJ3dvcmtfaXRlbScsIGl0ZW0uaWQsICdmZW5jaW5nLnJlamVjdGVkJywgYWN0b3JJZCwge1xuICAgICAgICBwcmVzZW50ZWRUb2tlbjogZmVuY2luZ1Rva2VuLFxuICAgICAgICBsaXZlVG9rZW46IGxpdmU/LmZlbmNpbmdUb2tlbiA/PyBudWxsLFxuICAgICAgfSk7XG4gICAgICB0aHJvdyBuZXcgQ29uZmxpY3RFcnJvcihgc3RhbGUgb3IgZm9yZWlnbiBmZW5jaW5nIHRva2VuIGZvciB3b3JrIGl0ZW0gJHtpdGVtLmlkfWApO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgY29weUl0ZW0oaXRlbTogV29ya0l0ZW1Sb3cpOiBXb3JrSXRlbSB7XG4gICAgY29uc3QgeyBkZXBlbmRzT246IF9kZXBlbmRzT24sIC4uLnB1YiB9ID0gaXRlbTtcbiAgICByZXR1cm4geyAuLi5wdWIsIHBpbm5lZFZlcmlmaWNhdGlvbjogaXRlbS5waW5uZWRWZXJpZmljYXRpb24gPyBbLi4uaXRlbS5waW5uZWRWZXJpZmljYXRpb25dIDogbnVsbCB9O1xuICB9XG5cbiAgcHJpdmF0ZSBjb3B5RmVhdHVyZShmZWF0dXJlOiBGZWF0dXJlKTogRmVhdHVyZSB7XG4gICAgcmV0dXJuIHsgLi4uZmVhdHVyZSB9O1xuICB9XG5cbiAgcHJpdmF0ZSBjb3B5Q2xhaW0oY2xhaW06IENsYWltUm93KTogQ2xhaW0ge1xuICAgIGNvbnN0IHsgdHRsTXM6IF90dGwsIC4uLnB1YiB9ID0gY2xhaW07XG4gICAgcmV0dXJuIHsgLi4ucHViIH07XG4gIH1cblxuICAvLyAtLSBzZXR1cCAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIGNyZWF0ZUFjdG9yKGlucHV0OiB7XG4gICAgdHlwZTogRXhjbHVkZTxBY3RvclR5cGUsICdzeXN0ZW0nPjtcbiAgICBkaXNwbGF5TmFtZTogc3RyaW5nO1xuICAgIGdvdmVybmFuY2VSb2xlPzogR292ZXJuYW5jZVJvbGU7XG4gIH0pOiBBY3RvciB7XG4gICAgY29uc3QgYWN0b3I6IEFjdG9yID0geyBpZDogdGhpcy5uZXh0SWQoJ2FjdG9yJyksIHR5cGU6IGlucHV0LnR5cGUsIGRpc3BsYXlOYW1lOiBpbnB1dC5kaXNwbGF5TmFtZSB9O1xuICAgIHRoaXMuYWN0b3JzLnNldChhY3Rvci5pZCwgYWN0b3IpO1xuICAgIHRoaXMuZ292ZXJuYW5jZVJvbGVzLnNldChhY3Rvci5pZCwgaW5wdXQuZ292ZXJuYW5jZVJvbGUgPz8gJ21lbWJlcicpO1xuICAgIHJldHVybiB7IC4uLmFjdG9yIH07XG4gIH1cblxuICBncmFudChpbnB1dDogeyBhY3RvcklkOiBzdHJpbmc7IHBlcm1pc3Npb246IFBlcm1pc3Npb247IHNjb3BlPzogc3RyaW5nIH0pOiB2b2lkIHtcbiAgICB0aGlzLmNoZWNrR3JhbnRDZWlsaW5nKGlucHV0LmFjdG9ySWQsIGlucHV0LnBlcm1pc3Npb24pO1xuICAgIGNvbnN0IHNldCA9IHRoaXMuZ3JhbnRzLmdldChpbnB1dC5hY3RvcklkKSA/PyBuZXcgU2V0PHN0cmluZz4oKTtcbiAgICBzZXQuYWRkKGlucHV0LnBlcm1pc3Npb24pO1xuICAgIHRoaXMuZ3JhbnRzLnNldChpbnB1dC5hY3RvcklkLCBzZXQpO1xuICAgIHRoaXMuYXBwZW5kKCdhY3RvcicsIGlucHV0LmFjdG9ySWQsICdncmFudC5pc3N1ZWQnLCB0aGlzLnN5c3RlbUFjdG9ySWQsIHsgcGVybWlzc2lvbjogaW5wdXQucGVybWlzc2lvbiB9KTtcbiAgfVxuXG4gIHJldm9rZShpbnB1dDogeyBhY3RvcklkOiBzdHJpbmc7IHBlcm1pc3Npb246IFBlcm1pc3Npb247IHNjb3BlPzogc3RyaW5nIH0pOiB2b2lkIHtcbiAgICB0aGlzLmdyYW50cy5nZXQoaW5wdXQuYWN0b3JJZCk/LmRlbGV0ZShpbnB1dC5wZXJtaXNzaW9uKTtcbiAgICB0aGlzLmFwcGVuZCgnYWN0b3InLCBpbnB1dC5hY3RvcklkLCAnZ3JhbnQucmV2b2tlZCcsIHRoaXMuc3lzdGVtQWN0b3JJZCwgeyBwZXJtaXNzaW9uOiBpbnB1dC5wZXJtaXNzaW9uIH0pO1xuICB9XG5cbiAgLy8gLS0gZW50aXRsZW1lbnRzIChQaGFzZSAyLCByb2FkbWFwIFx1MDBBNzMpIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICBzZXRHb3Zlcm5hbmNlUm9sZShpbnB1dDogeyBhY3RvcklkOiBzdHJpbmc7IHJvbGU6IEdvdmVybmFuY2VSb2xlOyBieUFjdG9ySWQ6IHN0cmluZyB9KTogdm9pZCB7XG4gICAgdGhpcy5yZXF1aXJlR292ZXJuYW5jZUFkbWluKGlucHV0LmJ5QWN0b3JJZCk7XG4gICAgaWYgKCF0aGlzLmFjdG9ycy5oYXMoaW5wdXQuYWN0b3JJZCkpIHRocm93IG5ldyBHdWFyZEZhaWxlZEVycm9yKGB1bmtub3duIGFjdG9yOiAke2lucHV0LmFjdG9ySWR9YCk7XG4gICAgdGhpcy5nb3Zlcm5hbmNlUm9sZXMuc2V0KGlucHV0LmFjdG9ySWQsIGlucHV0LnJvbGUpO1xuICAgIHRoaXMuYXBwZW5kKCdhY3RvcicsIGlucHV0LmFjdG9ySWQsICdnb3Zlcm5hbmNlLmNoYW5nZWQnLCBpbnB1dC5ieUFjdG9ySWQsIHsgcm9sZTogaW5wdXQucm9sZSB9KTtcbiAgfVxuXG4gIGdldEdvdmVybmFuY2VSb2xlKGFjdG9ySWQ6IHN0cmluZyk6IEdvdmVybmFuY2VSb2xlIHtcbiAgICByZXR1cm4gdGhpcy5nb3Zlcm5hbmNlUm9sZXMuZ2V0KGFjdG9ySWQpID8/ICdtZW1iZXInO1xuICB9XG5cbiAgYXNzaWduUm9sZShpbnB1dDogeyBhY3RvcklkOiBzdHJpbmc7IHJvbGVDb2RlOiBzdHJpbmc7IGJ5QWN0b3JJZDogc3RyaW5nIH0pOiB2b2lkIHtcbiAgICB0aGlzLnJlcXVpcmVHb3Zlcm5hbmNlQWRtaW4oaW5wdXQuYnlBY3RvcklkKTtcbiAgICBjb25zdCBidW5kbGUgPSBERUxJVkVSWV9ST0xFU1tpbnB1dC5yb2xlQ29kZV07XG4gICAgaWYgKGJ1bmRsZSA9PT0gdW5kZWZpbmVkKSB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcihgdW5rbm93biBkZWxpdmVyeSByb2xlOiAke2lucHV0LnJvbGVDb2RlfWApO1xuICAgIGlmICghdGhpcy5hY3RvcnMuaGFzKGlucHV0LmFjdG9ySWQpKSB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcihgdW5rbm93biBhY3RvcjogJHtpbnB1dC5hY3RvcklkfWApO1xuICAgIGZvciAoY29uc3QgcGVybWlzc2lvbiBvZiBidW5kbGUpIHtcbiAgICAgIHRoaXMuY2hlY2tHcmFudENlaWxpbmcoaW5wdXQuYWN0b3JJZCwgcGVybWlzc2lvbik7XG4gICAgfVxuICAgIGNvbnN0IGFjdGl2ZSA9IHRoaXMucm9sZUFzc2lnbm1lbnRzLnNvbWUoXG4gICAgICAoYSkgPT4gYS5hY3RvcklkID09PSBpbnB1dC5hY3RvcklkICYmIGEucm9sZUNvZGUgPT09IGlucHV0LnJvbGVDb2RlICYmICFhLnJldm9rZWQsXG4gICAgKTtcbiAgICBpZiAoYWN0aXZlKSByZXR1cm47IC8vIGlkZW1wb3RlbnRcbiAgICB0aGlzLnJvbGVBc3NpZ25tZW50cy5wdXNoKHtcbiAgICAgIGFjdG9ySWQ6IGlucHV0LmFjdG9ySWQsXG4gICAgICByb2xlQ29kZTogaW5wdXQucm9sZUNvZGUsXG4gICAgICBncmFudGVkQnk6IGlucHV0LmJ5QWN0b3JJZCxcbiAgICAgIHJldm9rZWQ6IGZhbHNlLFxuICAgIH0pO1xuICAgIHRoaXMuYXBwZW5kKCdhY3RvcicsIGlucHV0LmFjdG9ySWQsICdyb2xlLmFzc2lnbmVkJywgaW5wdXQuYnlBY3RvcklkLCB7IHJvbGVDb2RlOiBpbnB1dC5yb2xlQ29kZSB9KTtcbiAgfVxuXG4gIHJldm9rZVJvbGUoaW5wdXQ6IHsgYWN0b3JJZDogc3RyaW5nOyByb2xlQ29kZTogc3RyaW5nOyBieUFjdG9ySWQ6IHN0cmluZyB9KTogdm9pZCB7XG4gICAgdGhpcy5yZXF1aXJlR292ZXJuYW5jZUFkbWluKGlucHV0LmJ5QWN0b3JJZCk7XG4gICAgaWYgKERFTElWRVJZX1JPTEVTW2lucHV0LnJvbGVDb2RlXSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcihgdW5rbm93biBkZWxpdmVyeSByb2xlOiAke2lucHV0LnJvbGVDb2RlfWApO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IGFzc2lnbm1lbnQgb2YgdGhpcy5yb2xlQXNzaWdubWVudHMpIHtcbiAgICAgIGlmIChhc3NpZ25tZW50LmFjdG9ySWQgPT09IGlucHV0LmFjdG9ySWQgJiYgYXNzaWdubWVudC5yb2xlQ29kZSA9PT0gaW5wdXQucm9sZUNvZGUgJiYgIWFzc2lnbm1lbnQucmV2b2tlZCkge1xuICAgICAgICBhc3NpZ25tZW50LnJldm9rZWQgPSB0cnVlO1xuICAgICAgfVxuICAgIH1cbiAgICB0aGlzLmFwcGVuZCgnYWN0b3InLCBpbnB1dC5hY3RvcklkLCAncm9sZS5yZXZva2VkJywgaW5wdXQuYnlBY3RvcklkLCB7IHJvbGVDb2RlOiBpbnB1dC5yb2xlQ29kZSB9KTtcbiAgfVxuXG4gIGxpc3RSb2xlQXNzaWdubWVudHMoYWN0b3JJZD86IHN0cmluZyk6IFJvbGVBc3NpZ25tZW50W10ge1xuICAgIHJldHVybiB0aGlzLnJvbGVBc3NpZ25tZW50c1xuICAgICAgLmZpbHRlcigoYSkgPT4gYWN0b3JJZCA9PT0gdW5kZWZpbmVkIHx8IGEuYWN0b3JJZCA9PT0gYWN0b3JJZClcbiAgICAgIC5tYXAoKGEpID0+ICh7IC4uLmEgfSkpO1xuICB9XG5cbiAgc2V0UGxhbihpbnB1dDogeyBwbGFuOiBQbGFuQ29kZTsgYnlBY3RvcklkOiBzdHJpbmcgfSk6IHZvaWQge1xuICAgIHRoaXMucmVxdWlyZUdvdmVybmFuY2VBZG1pbihpbnB1dC5ieUFjdG9ySWQpO1xuICAgIGlmIChQTEFOX0NFSUxJTkdTW2lucHV0LnBsYW5dID09PSB1bmRlZmluZWQpIHRocm93IG5ldyBHdWFyZEZhaWxlZEVycm9yKGB1bmtub3duIHBsYW46ICR7aW5wdXQucGxhbn1gKTtcbiAgICB0aGlzLnBsYW4gPSBpbnB1dC5wbGFuO1xuICAgIHRoaXMucGxhblZlcnNpb24gKz0gMTtcbiAgICB0aGlzLmFwcGVuZCgnd29ya3NwYWNlJywgJ3dvcmtzcGFjZScsICdwbGFuLmNoYW5nZWQnLCBpbnB1dC5ieUFjdG9ySWQsIHtcbiAgICAgIHBsYW46IGlucHV0LnBsYW4sXG4gICAgICBwbGFuVmVyc2lvbjogdGhpcy5wbGFuVmVyc2lvbixcbiAgICB9KTtcbiAgfVxuXG4gIGdldFBsYW4oKTogUGxhbkNvZGUge1xuICAgIHJldHVybiB0aGlzLnBsYW47XG4gIH1cblxuICBzZXRXb3Jrc3BhY2VQb2xpY3koaW5wdXQ6IHsgcG9saWN5OiBXb3Jrc3BhY2VQb2xpY3k7IGJ5QWN0b3JJZDogc3RyaW5nIH0pOiB2b2lkIHtcbiAgICB0aGlzLnJlcXVpcmVHb3Zlcm5hbmNlQWRtaW4oaW5wdXQuYnlBY3RvcklkKTtcbiAgICB0aGlzLndvcmtzcGFjZVBvbGljeSA9IHsgLi4udGhpcy53b3Jrc3BhY2VQb2xpY3ksIC4uLmlucHV0LnBvbGljeSB9O1xuICAgIHRoaXMucG9saWN5VmVyc2lvbiArPSAxO1xuICAgIHRoaXMuYXBwZW5kKCd3b3Jrc3BhY2UnLCAnd29ya3NwYWNlJywgJ3BvbGljeS5jaGFuZ2VkJywgaW5wdXQuYnlBY3RvcklkLCB7XG4gICAgICBwb2xpY3k6IHsgLi4udGhpcy53b3Jrc3BhY2VQb2xpY3kgfSxcbiAgICAgIHBvbGljeVZlcnNpb246IHRoaXMucG9saWN5VmVyc2lvbixcbiAgICB9KTtcbiAgfVxuXG4gIGdldFdvcmtzcGFjZVBvbGljeSgpOiBXb3Jrc3BhY2VQb2xpY3kge1xuICAgIHJldHVybiB7IC4uLnRoaXMud29ya3NwYWNlUG9saWN5IH07XG4gIH1cblxuICBzZXRHYXRlUG9saWN5KGlucHV0OiB7IGdhdGU6IEdhdGVDb2RlOyBwb2xpY3k6IEdhdGVQb2xpY3k7IGJ5QWN0b3JJZDogc3RyaW5nIH0pOiB2b2lkIHtcbiAgICB0aGlzLnJlcXVpcmVHb3Zlcm5hbmNlQWRtaW4oaW5wdXQuYnlBY3RvcklkKTtcbiAgICBjb25zdCBtaW5BcHByb3ZhbHMgPSBpbnB1dC5wb2xpY3kubWluQXBwcm92YWxzID8/IDE7XG4gICAgaWYgKCFOdW1iZXIuaXNJbnRlZ2VyKG1pbkFwcHJvdmFscykgfHwgbWluQXBwcm92YWxzIDwgMSkge1xuICAgICAgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoJ21pbkFwcHJvdmFscyBtdXN0IGJlIGEgcG9zaXRpdmUgaW50ZWdlcicpO1xuICAgIH1cbiAgICB0aGlzLmdhdGVQb2xpY2llcy5zZXQoaW5wdXQuZ2F0ZSwgeyAuLi5pbnB1dC5wb2xpY3kgfSk7XG4gICAgdGhpcy5hcHBlbmQoJ3dvcmtzcGFjZScsICd3b3Jrc3BhY2UnLCAnZ2F0ZV9wb2xpY3kuY2hhbmdlZCcsIGlucHV0LmJ5QWN0b3JJZCwge1xuICAgICAgZ2F0ZTogaW5wdXQuZ2F0ZSxcbiAgICAgIHBvbGljeTogeyAuLi5pbnB1dC5wb2xpY3kgfSxcbiAgICB9KTtcbiAgfVxuXG4gIGdldEdhdGVQb2xpY3koZ2F0ZTogR2F0ZUNvZGUpOiBHYXRlUG9saWN5IHtcbiAgICByZXR1cm4geyAuLi4odGhpcy5nYXRlUG9saWNpZXMuZ2V0KGdhdGUpID8/IHt9KSB9O1xuICB9XG5cbiAgYXV0aHpFeHBsYWluKGlucHV0OiB7IGFjdG9ySWQ6IHN0cmluZzsgcGVybWlzc2lvbjogUGVybWlzc2lvbiB9KTogQXV0aHpFeHBsYW5hdGlvbiB7XG4gICAgY29uc3Qgc291cmNlID0gdGhpcy5ncmFudFNvdXJjZShpbnB1dC5hY3RvcklkLCBpbnB1dC5wZXJtaXNzaW9uKTtcbiAgICBjb25zdCBhbGxvd3MgPSB0aGlzLmFnZW50Q2VpbGluZ0FsbG93cyh0aGlzLmFjdG9ycy5nZXQoaW5wdXQuYWN0b3JJZCksIGlucHV0LnBlcm1pc3Npb24pO1xuICAgIHJldHVybiB7XG4gICAgICBhY3RvcklkOiBpbnB1dC5hY3RvcklkLFxuICAgICAgcGVybWlzc2lvbjogaW5wdXQucGVybWlzc2lvbixcbiAgICAgIGFsbG93ZWQ6IHNvdXJjZSAhPT0gbnVsbCAmJiBhbGxvd3MucGxhbiAmJiBhbGxvd3MucG9saWN5LFxuICAgICAgc291cmNlLFxuICAgICAgZ292ZXJuYW5jZVJvbGU6IHRoaXMuZ2V0R292ZXJuYW5jZVJvbGUoaW5wdXQuYWN0b3JJZCksXG4gICAgICBwbGFuOiB0aGlzLnBsYW4sXG4gICAgICBwbGFuQWxsb3dzOiBhbGxvd3MucGxhbixcbiAgICAgIHBvbGljeUFsbG93czogYWxsb3dzLnBvbGljeSxcbiAgICAgIHZlcnNpb25zOiB7IHBsYW46IHRoaXMucGxhblZlcnNpb24sIHBvbGljeTogdGhpcy5wb2xpY3lWZXJzaW9uIH0sXG4gICAgfTtcbiAgfVxuXG4gIGNyZWF0ZUZlYXR1cmUoaW5wdXQ6IHsgYWN0b3JJZDogc3RyaW5nIH0pOiBGZWF0dXJlIHtcbiAgICBjb25zdCBmZWF0dXJlOiBGZWF0dXJlID0geyBpZDogdGhpcy5uZXh0SWQoJ2ZlYXQnKSwgc3RhdGU6ICdiYWNrbG9nJywgZGlzcGF0Y2hIb2xkOiBmYWxzZSB9O1xuICAgIHRoaXMuZmVhdHVyZXMuc2V0KGZlYXR1cmUuaWQsIGZlYXR1cmUpO1xuICAgIHRoaXMuYXBwZW5kKCdmZWF0dXJlJywgZmVhdHVyZS5pZCwgJ2ZlYXR1cmUuY3JlYXRlZCcsIGlucHV0LmFjdG9ySWQsIHt9KTtcbiAgICByZXR1cm4gdGhpcy5jb3B5RmVhdHVyZShmZWF0dXJlKTtcbiAgfVxuXG4gIGNyZWF0ZVdvcmtJdGVtKGlucHV0OiBDcmVhdGVXb3JrSXRlbUlucHV0ICYgeyBhY3RvcklkOiBzdHJpbmcgfSk6IFdvcmtJdGVtIHtcbiAgICBjb25zdCBzbHVnID0gaW5wdXQudGl0bGVcbiAgICAgIC50b0xvd2VyQ2FzZSgpXG4gICAgICAucmVwbGFjZSgvW15hLXowLTldKy9nLCAnLScpXG4gICAgICAucmVwbGFjZSgvKF4tfC0kKS9nLCAnJyk7XG4gICAgY29uc3QgaXRlbTogV29ya0l0ZW1Sb3cgPSB7XG4gICAgICBpZDogdGhpcy5uZXh0SWQoJ3dpJyksXG4gICAgICBmZWF0dXJlSWQ6IGlucHV0LmZlYXR1cmVJZCxcbiAgICAgIGV4dGVybmFsS2V5OiBpbnB1dC5leHRlcm5hbEtleSxcbiAgICAgIHRpdGxlOiBpbnB1dC50aXRsZSxcbiAgICAgIHN0YXRlOiAnYmFja2xvZycsXG4gICAgICBibG9ja2VkUmVhc29uOiBudWxsLFxuICAgICAgcmV2aWV3TG9vcEl0ZXJhdGlvbjogMCxcbiAgICAgIGludGVudEhhc2g6IG51bGwsXG4gICAgICBwaW5uZWRWZXJpZmljYXRpb246IG51bGwsXG4gICAgICBzcGVjQ2hlY2twb2ludDogaW5wdXQuc3BlY0NoZWNrcG9pbnQgPz8gZmFsc2UsXG4gICAgICBkb25lQ2hlY2twb2ludDogaW5wdXQuZG9uZUNoZWNrcG9pbnQgPz8gZmFsc2UsXG4gICAgICBpbnZva2VEZXZXaXRoOiBpbnB1dC5pbnZva2VEZXZXaXRoID8/ICcnLFxuICAgICAgc3BlY1BhdGg6IGBzdG9yaWVzLyR7aW5wdXQuZXh0ZXJuYWxLZXl9LSR7c2x1Z30ubWRgLFxuICAgICAgc3RhdGVWZXJzaW9uOiAwLFxuICAgICAgZGVwZW5kc09uOiBpbnB1dC5kZXBlbmRzT24gPyBbLi4uaW5wdXQuZGVwZW5kc09uXSA6IFtdLFxuICAgIH07XG4gICAgdGhpcy53b3JrSXRlbXMuc2V0KGl0ZW0uaWQsIGl0ZW0pO1xuICAgIGlmICghdGhpcy5leHRlcm5hbEtleUluZGV4LmhhcyhpdGVtLmV4dGVybmFsS2V5KSkge1xuICAgICAgdGhpcy5leHRlcm5hbEtleUluZGV4LnNldChpdGVtLmV4dGVybmFsS2V5LCBpdGVtLmlkKTtcbiAgICB9XG4gICAgdGhpcy5hcHBlbmQoJ3dvcmtfaXRlbScsIGl0ZW0uaWQsICd3b3JrX2l0ZW0uY3JlYXRlZCcsIGlucHV0LmFjdG9ySWQsIHtcbiAgICAgIGV4dGVybmFsS2V5OiBpdGVtLmV4dGVybmFsS2V5LFxuICAgICAgZmVhdHVyZUlkOiBpdGVtLmZlYXR1cmVJZCxcbiAgICB9KTtcbiAgICByZXR1cm4gdGhpcy5jb3B5SXRlbShpdGVtKTtcbiAgfVxuXG4gIGltcG9ydFN0b3JpZXMoaW5wdXQ6IHsgZmVhdHVyZUlkOiBzdHJpbmc7IHlhbWw6IHN0cmluZzsgYWN0b3JJZDogc3RyaW5nIH0pOiBTdG9yaWVzSW1wb3J0UmVzdWx0IHtcbiAgICBjb25zdCBlbnRyaWVzID0gcGFyc2VTdG9yaWVzKGlucHV0LnlhbWwpO1xuICAgIGlmICghdGhpcy5mZWF0dXJlcy5oYXMoaW5wdXQuZmVhdHVyZUlkKSkge1xuICAgICAgdGhyb3cgbmV3IFN0b3JpZXNWYWxpZGF0aW9uRXJyb3IoYHVua25vd24gZmVhdHVyZTogJHtpbnB1dC5mZWF0dXJlSWR9YCk7XG4gICAgfVxuICAgIGNvbnN0IGltcG9ydGVkOiBzdHJpbmdbXSA9IFtdO1xuICAgIGNvbnN0IHVwZGF0ZWQ6IHN0cmluZ1tdID0gW107XG4gICAgY29uc3Qgd2FybmluZ3M6IHN0cmluZ1tdID0gW107XG5cbiAgICBmb3IgKGNvbnN0IGVudHJ5IG9mIGVudHJpZXMpIHtcbiAgICAgIGNvbnN0IGV4aXN0aW5nID0gWy4uLnRoaXMud29ya0l0ZW1zLnZhbHVlcygpXS5maW5kKFxuICAgICAgICAod2kpID0+IHdpLmZlYXR1cmVJZCA9PT0gaW5wdXQuZmVhdHVyZUlkICYmIHdpLmV4dGVybmFsS2V5ID09PSBlbnRyeS5pZCxcbiAgICAgICk7XG4gICAgICBpZiAoZXhpc3RpbmcpIHtcbiAgICAgICAgLy8gUmUtaW1wb3J0IHJlZnJlc2hlcyBkZXNjcmlwdGl2ZSBmaWVsZHM7IGxpZmVjeWNsZSBzdGF0ZSBpcyBuZXZlclxuICAgICAgICAvLyB0b3VjaGVkIChzdG9yaWVzLnlhbWwgY2FycmllcyBubyBzdGF0dXMgXHUyMDE0IEQ5LCB2YWxpZGl0eSBydWxlIDMpLlxuICAgICAgICBleGlzdGluZy50aXRsZSA9IGVudHJ5LnRpdGxlO1xuICAgICAgICBleGlzdGluZy5zcGVjQ2hlY2twb2ludCA9IGVudHJ5LnNwZWNDaGVja3BvaW50O1xuICAgICAgICBleGlzdGluZy5kb25lQ2hlY2twb2ludCA9IGVudHJ5LmRvbmVDaGVja3BvaW50O1xuICAgICAgICBleGlzdGluZy5pbnZva2VEZXZXaXRoID0gZW50cnkuaW52b2tlRGV2V2l0aDtcbiAgICAgICAgdGhpcy5hcHBlbmQoJ3dvcmtfaXRlbScsIGV4aXN0aW5nLmlkLCAnd29ya19pdGVtLnJlaW1wb3J0ZWQnLCBpbnB1dC5hY3RvcklkLCB7IGV4dGVybmFsS2V5OiBlbnRyeS5pZCB9KTtcbiAgICAgICAgdXBkYXRlZC5wdXNoKGVudHJ5LmlkKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuY3JlYXRlV29ya0l0ZW0oe1xuICAgICAgICAgIGZlYXR1cmVJZDogaW5wdXQuZmVhdHVyZUlkLFxuICAgICAgICAgIGV4dGVybmFsS2V5OiBlbnRyeS5pZCxcbiAgICAgICAgICB0aXRsZTogZW50cnkudGl0bGUsXG4gICAgICAgICAgc3BlY0NoZWNrcG9pbnQ6IGVudHJ5LnNwZWNDaGVja3BvaW50LFxuICAgICAgICAgIGRvbmVDaGVja3BvaW50OiBlbnRyeS5kb25lQ2hlY2twb2ludCxcbiAgICAgICAgICBpbnZva2VEZXZXaXRoOiBlbnRyeS5pbnZva2VEZXZXaXRoLFxuICAgICAgICAgIGFjdG9ySWQ6IGlucHV0LmFjdG9ySWQsXG4gICAgICAgIH0pO1xuICAgICAgICBpbXBvcnRlZC5wdXNoKGVudHJ5LmlkKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHsgaW1wb3J0ZWQsIHVwZGF0ZWQsIHdhcm5pbmdzIH07XG4gIH1cblxuICAvLyAtLSBjbGFpbXMgKHJvYWRtYXAgXHUwMEE3MS4zKSAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICBjbGFpbVRhc2soaW5wdXQ6IHsgd29ya0l0ZW1JZDogc3RyaW5nOyBhY3RvcklkOiBzdHJpbmc7IHR0bE1zPzogbnVtYmVyIH0pOiBDbGFpbSB7XG4gICAgY29uc3QgaXRlbSA9IHRoaXMubXVzdEdldEl0ZW0oaW5wdXQud29ya0l0ZW1JZCk7XG4gICAgdGhpcy5yZXF1aXJlUGVybWlzc2lvbihpbnB1dC5hY3RvcklkLCAndGFzay5jbGFpbScpO1xuICAgIGlmICh0aGlzLmxpdmVDbGFpbShpdGVtLmlkKSAhPT0gbnVsbCkge1xuICAgICAgLy8gT25lIGxpdmUgY2xhaW0gcGVyIHdvcmsgaXRlbSBcdTIwMTQgcmFjZXMgbG9zZSBieSBjb25zdHJhaW50IChcdTAwQTcxLjMpO1xuICAgICAgLy8gdGhlIGxvc2VyIGxlYXZlcyBubyByb3cgYmVoaW5kLlxuICAgICAgdGhyb3cgbmV3IENvbmZsaWN0RXJyb3IoYHdvcmsgaXRlbSAke2l0ZW0uaWR9IGFscmVhZHkgaGFzIGEgbGl2ZSBjbGFpbWApO1xuICAgIH1cbiAgICBjb25zdCB0dGxNcyA9IGlucHV0LnR0bE1zID8/IDE1ICogNjAgKiAxMDAwO1xuICAgIGNvbnN0IHRva2VuID0gKHRoaXMuZmVuY2luZ0NvdW50ZXIuZ2V0KGl0ZW0uaWQpID8/IDApICsgMTtcbiAgICB0aGlzLmZlbmNpbmdDb3VudGVyLnNldChpdGVtLmlkLCB0b2tlbik7XG4gICAgY29uc3QgY2xhaW06IENsYWltUm93ID0ge1xuICAgICAgaWQ6IHRoaXMubmV4dElkKCdjbGFpbScpLFxuICAgICAgd29ya0l0ZW1JZDogaXRlbS5pZCxcbiAgICAgIGFjdG9ySWQ6IGlucHV0LmFjdG9ySWQsXG4gICAgICBmZW5jaW5nVG9rZW46IHRva2VuLFxuICAgICAgbGVhc2VFeHBpcmVzQXQ6IHRoaXMubm93ICsgdHRsTXMsXG4gICAgICByZWxlYXNlZDogZmFsc2UsXG4gICAgICB0dGxNcyxcbiAgICB9O1xuICAgIHRoaXMuY2xhaW1zLnNldChjbGFpbS5pZCwgY2xhaW0pO1xuICAgIHRoaXMuY2xhaW1zQnlJdGVtLnNldChpdGVtLmlkLCBbLi4uKHRoaXMuY2xhaW1zQnlJdGVtLmdldChpdGVtLmlkKSA/PyBbXSksIGNsYWltLmlkXSk7XG4gICAgdGhpcy5hcHBlbmQoJ3dvcmtfaXRlbScsIGl0ZW0uaWQsICd3b3JrX2l0ZW0uY2xhaW1lZCcsIGlucHV0LmFjdG9ySWQsIHsgY2xhaW1JZDogY2xhaW0uaWQsIGZlbmNpbmdUb2tlbjogdG9rZW4gfSk7XG4gICAgcmV0dXJuIHRoaXMuY29weUNsYWltKGNsYWltKTtcbiAgfVxuXG4gIGhlYXJ0YmVhdChpbnB1dDogeyBjbGFpbUlkOiBzdHJpbmcgfSk6IHZvaWQge1xuICAgIGNvbnN0IGNsYWltID0gdGhpcy5jbGFpbXMuZ2V0KGlucHV0LmNsYWltSWQpO1xuICAgIGlmICghY2xhaW0gfHwgY2xhaW0ucmVsZWFzZWQgfHwgY2xhaW0ubGVhc2VFeHBpcmVzQXQgPD0gdGhpcy5ub3cpIHtcbiAgICAgIHRocm93IG5ldyBDb25mbGljdEVycm9yKGBjbGFpbSAke2lucHV0LmNsYWltSWR9IGlzIG5vdCBsaXZlYCk7XG4gICAgfVxuICAgIGNsYWltLmxlYXNlRXhwaXJlc0F0ID0gdGhpcy5ub3cgKyBjbGFpbS50dGxNcztcbiAgfVxuXG4gIHJlbGVhc2VDbGFpbShpbnB1dDogeyBjbGFpbUlkOiBzdHJpbmc7IHJlYXNvbj86IHN0cmluZyB9KTogdm9pZCB7XG4gICAgY29uc3QgY2xhaW0gPSB0aGlzLmNsYWltcy5nZXQoaW5wdXQuY2xhaW1JZCk7XG4gICAgaWYgKCFjbGFpbSB8fCBjbGFpbS5yZWxlYXNlZCkgcmV0dXJuO1xuICAgIGNsYWltLnJlbGVhc2VkID0gdHJ1ZTtcbiAgICB0aGlzLmFwcGVuZCgnd29ya19pdGVtJywgY2xhaW0ud29ya0l0ZW1JZCwgJ2NsYWltLnJlbGVhc2VkJywgY2xhaW0uYWN0b3JJZCwge1xuICAgICAgY2xhaW1JZDogY2xhaW0uaWQsXG4gICAgICByZWFzb246IGlucHV0LnJlYXNvbiA/PyBudWxsLFxuICAgIH0pO1xuICB9XG5cbiAgYWR2YW5jZUNsb2NrKG1zOiBudW1iZXIpOiB2b2lkIHtcbiAgICB0aGlzLm5vdyArPSBtcztcbiAgfVxuXG4gIC8vIC0tIGxpZmVjeWNsZSAocm9hZG1hcCBcdTAwQTcxLjIpIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgYWR2YW5jZVN0YXRlKGlucHV0OiBBZHZhbmNlSW5wdXQpOiBXb3JrSXRlbSB7XG4gICAgY29uc3QgaXRlbSA9IHRoaXMubXVzdEdldEl0ZW0oaW5wdXQud29ya0l0ZW1JZCk7XG5cbiAgICAvLyBLZXllZCByZXBsYXk6IHRoZSBzYW1lIGNvbW1hbmQgcmV0dXJucyB0aGUgc2FtZSByZXN1bHQsIGFwcGVuZHMgbm90aGluZy5cbiAgICBpZiAoaW5wdXQuaWRlbXBvdGVuY3lLZXkgIT09IHVuZGVmaW5lZCkge1xuICAgICAgY29uc3QgY2FjaGVkID0gdGhpcy5pZGVtcG90ZW5jeUNhY2hlLmdldChpbnB1dC5pZGVtcG90ZW5jeUtleSk7XG4gICAgICBpZiAoY2FjaGVkKSByZXR1cm4geyAuLi5jYWNoZWQgfTtcbiAgICB9XG5cbiAgICAvLyBQcmVzZXJ2YXRpb24gbm8tb3AgKHNwcmludC1wbGFubmluZyBpZGVtcG90ZW5jeSBydWxlKTogYW4gVU5LRVlFRFxuICAgIC8vIHJlLXJlcXVlc3Qgb2YgdGhlIGN1cnJlbnQgc3RhdGUgc3VjY2VlZHMgd2l0aG91dCBhbiBldmVudC4gQSBORVcga2V5ZWRcbiAgICAvLyBjb21tYW5kIGlzIGEgZ2VudWluZWx5IG5ldyBjb21tYW5kIGFuZCBmYWxscyB0aHJvdWdoIHRvIHRoZSBzdHJpY3RcbiAgICAvLyB0YWJsZSBjaGVjayAoY29uY3VycmVuY3kudGVzdC50cyBwaW4pLlxuICAgIGlmIChpbnB1dC5pZGVtcG90ZW5jeUtleSA9PT0gdW5kZWZpbmVkICYmIGlucHV0LnRvID09PSBpdGVtLnN0YXRlKSB7XG4gICAgICB0aGlzLnZhbGlkYXRlUHJlc2VudGVkVG9rZW4oaXRlbSwgaW5wdXQuZmVuY2luZ1Rva2VuLCBpbnB1dC5hY3RvcklkKTtcbiAgICAgIHJldHVybiB0aGlzLmNvcHlJdGVtKGl0ZW0pO1xuICAgIH1cblxuICAgIC8vIFRyYW5zaXRpb24tdGFibGUgbG9va3VwIHByZWNlZGVzIGNsYWltL3Rva2VuL3Blcm1pc3Npb24gY2hlY2tzXG4gICAgLy8gKGZzbS10cmFuc2l0aW9ucyBwaW46IHVuZGVjbGFyZWQgZG93bmdyYWRlcyBhcmUgSW52YWxpZFRyYW5zaXRpb25FcnJvclxuICAgIC8vIGV2ZW4gd2l0aCBubyB0b2tlbiBwcmVzZW50ZWQpLlxuICAgIGNvbnN0IHJ1bGUgPSBUUkFOU0lUSU9OUy5maW5kKCh0KSA9PiB0LmZyb20gPT09IGl0ZW0uc3RhdGUgJiYgdC50byA9PT0gaW5wdXQudG8pO1xuICAgIGlmICghcnVsZSkge1xuICAgICAgaWYgKFJBTktbaW5wdXQudG9dIDwgUkFOS1tpdGVtLnN0YXRlXSAmJiB0aGlzLmhhc1Blcm1pc3Npb24oaW5wdXQuYWN0b3JJZCwgJ3N0YXRlLmRvd25ncmFkZScpKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnByaXZpbGVnZWREb3duZ3JhZGUoaXRlbSwgaW5wdXQpO1xuICAgICAgfVxuICAgICAgdGhyb3cgbmV3IEludmFsaWRUcmFuc2l0aW9uRXJyb3IoaXRlbS5zdGF0ZSwgaW5wdXQudG8pO1xuICAgIH1cblxuICAgIHRoaXMudmFsaWRhdGVQcmVzZW50ZWRUb2tlbihpdGVtLCBpbnB1dC5mZW5jaW5nVG9rZW4sIGlucHV0LmFjdG9ySWQpO1xuXG4gICAgLy8gQmxvY2tlZCBvdmVybGF5IGZyZWV6ZXMgdHJhbnNpdGlvbnMgYXQgZXZlcnkgc3RhdGUgKEQ4LCBcdTAwQTcxLjEpLlxuICAgIGlmIChpdGVtLmJsb2NrZWRSZWFzb24gIT09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBHdWFyZEZhaWxlZEVycm9yKGB3b3JrIGl0ZW0gaXMgYmxvY2tlZDogJHtpdGVtLmJsb2NrZWRSZWFzb259YCk7XG4gICAgfVxuXG4gICAgdGhpcy5yZXF1aXJlUGVybWlzc2lvbihpbnB1dC5hY3RvcklkLCBydWxlLnBlcm1pc3Npb24pO1xuXG4gICAgaWYgKHJ1bGUuY2xhaW1SZXF1aXJlZCkge1xuICAgICAgLy8gRXhlY3V0aW9uLXpvbmUgdHJhbnNpdGlvbnMgZGVtYW5kIGEgUFJFU0VOVEVEIGxpdmUgdG9rZW4gXHUyMDE0IGhvbGRpbmdcbiAgICAgIC8vIHRoZSBjbGFpbSB3aXRob3V0IHByZXNlbnRpbmcgaXQgaXMgbm90IGVub3VnaCAoY2xhaW1zLnRlc3QudHMgcGluKS5cbiAgICAgIGlmIChpbnB1dC5mZW5jaW5nVG9rZW4gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcignY2xhaW0gZmVuY2luZyB0b2tlbiByZXF1aXJlZCBmb3IgdGhpcyB0cmFuc2l0aW9uJyk7XG4gICAgICB9XG4gICAgICAvLyAoYWxyZWFkeSB2YWxpZGF0ZWQgYWJvdmUpXG4gICAgfVxuXG4gICAgZm9yIChjb25zdCBndWFyZCBvZiBydWxlLmd1YXJkcykge1xuICAgICAgdGhpcy5jaGVja0d1YXJkKGd1YXJkLCBpdGVtKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5leGVjdXRlVHJhbnNpdGlvbihpdGVtLCBpbnB1dC50bywgaW5wdXQuYWN0b3JJZCwgaW5wdXQuaWRlbXBvdGVuY3lLZXkpO1xuICB9XG5cbiAgcHJpdmF0ZSBjaGVja0d1YXJkKGd1YXJkOiBUcmFuc2l0aW9uUnVsZVsnZ3VhcmRzJ11bbnVtYmVyXSwgaXRlbTogV29ya0l0ZW1Sb3cpOiB2b2lkIHtcbiAgICBzd2l0Y2ggKGd1YXJkKSB7XG4gICAgICBjYXNlICdkZXBzX2RvbmUnOiB7XG4gICAgICAgIGZvciAoY29uc3QgZGVwS2V5IG9mIGl0ZW0uZGVwZW5kc09uKSB7XG4gICAgICAgICAgY29uc3QgZGVwID0gWy4uLnRoaXMud29ya0l0ZW1zLnZhbHVlcygpXS5maW5kKFxuICAgICAgICAgICAgKHdpKSA9PiB3aS5mZWF0dXJlSWQgPT09IGl0ZW0uZmVhdHVyZUlkICYmIHdpLmV4dGVybmFsS2V5ID09PSBkZXBLZXksXG4gICAgICAgICAgKTtcbiAgICAgICAgICBpZiAoZGVwICYmIGRlcC5zdGF0ZSAhPT0gJ2RvbmUnKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcihgZGVwZW5kZW5jeSAke2RlcEtleX0gaXMgbm90IGRvbmVgKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgY2FzZSAnc3BlY19nYXRlX2lmX2NoZWNrcG9pbnQnOiB7XG4gICAgICAgIGlmICghaXRlbS5zcGVjQ2hlY2twb2ludCkgcmV0dXJuO1xuICAgICAgICBjb25zdCBhcHByb3ZlZCA9IHRoaXMuZ2F0ZURlY2lzaW9ucy5zb21lKFxuICAgICAgICAgIChkKSA9PiBkLndvcmtJdGVtSWQgPT09IGl0ZW0uaWQgJiYgZC5nYXRlID09PSAnc3BlY19hcHByb3ZhbCcgJiYgZC5kZWNpc2lvbiA9PT0gJ2FwcHJvdmVkJyxcbiAgICAgICAgKTtcbiAgICAgICAgaWYgKCFhcHByb3ZlZCkge1xuICAgICAgICAgIHRocm93IG5ldyBHdWFyZEZhaWxlZEVycm9yKCdzcGVjX2NoZWNrcG9pbnQgcmVxdWlyZXMgYW4gYXBwcm92ZWQgc3BlY19hcHByb3ZhbCBnYXRlIGRlY2lzaW9uJyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgY2FzZSAnbm9uZW1wdHlfZGlmZic6IHtcbiAgICAgICAgLy8gQXJiaXRyYXRlZCAoQ09ORk9STUFOQ0UubWQgXCJFdmlkZW5jZVwiKTogdGhlIExBVEVTVCBzdWJtaXR0ZWRcbiAgICAgICAgLy8gZ2l0X2RpZmYsIGlmIGFueSwgbXVzdCBiZSBub24tZW1wdHkgXHUyMDE0IGFuIGVtcHR5IGRpZmYgaXMgdGhlXG4gICAgICAgIC8vIGZha2UtZG9uZSBkZW55LiBBYnNlbmNlIGlzIG5vdCBjaGVja2VkIGF0IHRoaXMgdHJhbnNpdGlvbiAodGhlXG4gICAgICAgIC8vIHJ1bm5lciBjb250cmFjdCBzdWJtaXRzIHRoZSBkaWZmIGJlZm9yZSByZXF1ZXN0aW5nIHJldmlldywgYW5kIHRoZVxuICAgICAgICAvLyBkb25lIGdhdGUgaW5kZXBlbmRlbnRseSBkZW1hbmRzIHJlbW90ZS1yZWFjaGFibGUgY29tbWl0IGV2aWRlbmNlKS5cbiAgICAgICAgY29uc3QgZGlmZnMgPSB0aGlzLmV2aWRlbmNlUm93cy5maWx0ZXIoXG4gICAgICAgICAgKHJvdykgPT4gcm93LndvcmtJdGVtSWQgPT09IGl0ZW0uaWQgJiYgcm93LmV2aWRlbmNlLmtpbmQgPT09ICdnaXRfZGlmZicsXG4gICAgICAgICk7XG4gICAgICAgIGNvbnN0IGxhdGVzdCA9IGRpZmZzW2RpZmZzLmxlbmd0aCAtIDFdO1xuICAgICAgICBpZiAobGF0ZXN0ICYmIGxhdGVzdC5ldmlkZW5jZS5wYXlsb2FkWydub25FbXB0eSddICE9PSB0cnVlKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoJ3RoZSBsYXRlc3QgZ2l0X2RpZmYgZXZpZGVuY2UgaXMgZW1wdHkgXHUyMDE0IG5vdGhpbmcgdG8gcmV2aWV3Jyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgcHJpdmlsZWdlZERvd25ncmFkZShpdGVtOiBXb3JrSXRlbVJvdywgaW5wdXQ6IEFkdmFuY2VJbnB1dCk6IFdvcmtJdGVtIHtcbiAgICB0aGlzLnZhbGlkYXRlUHJlc2VudGVkVG9rZW4oaXRlbSwgaW5wdXQuZmVuY2luZ1Rva2VuLCBpbnB1dC5hY3RvcklkKTtcbiAgICBpZiAoaXRlbS5ibG9ja2VkUmVhc29uICE9PSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcihgd29yayBpdGVtIGlzIGJsb2NrZWQ6ICR7aXRlbS5ibG9ja2VkUmVhc29ufWApO1xuICAgIH1cbiAgICBjb25zdCBmcm9tID0gaXRlbS5zdGF0ZTtcbiAgICBpdGVtLnN0YXRlID0gaW5wdXQudG87XG4gICAgaXRlbS5zdGF0ZVZlcnNpb24gKz0gMTtcbiAgICB0aGlzLmFwcGVuZChcbiAgICAgICd3b3JrX2l0ZW0nLFxuICAgICAgaXRlbS5pZCxcbiAgICAgICd3b3JrX2l0ZW0uc3RhdGVfZG93bmdyYWRlZCcsXG4gICAgICBpbnB1dC5hY3RvcklkLFxuICAgICAgeyBmcm9tLCB0bzogaW5wdXQudG8sIGNvbXBlbnNhdGluZzogdHJ1ZSB9LFxuICAgICAgaW5wdXQuaWRlbXBvdGVuY3lLZXkgIT09IHVuZGVmaW5lZCA/IHsgaWRlbXBvdGVuY3lLZXk6IGlucHV0LmlkZW1wb3RlbmN5S2V5IH0gOiB1bmRlZmluZWQsXG4gICAgKTtcbiAgICBjb25zdCByZXN1bHQgPSB0aGlzLmNvcHlJdGVtKGl0ZW0pO1xuICAgIGlmIChpbnB1dC5pZGVtcG90ZW5jeUtleSAhPT0gdW5kZWZpbmVkKSB0aGlzLmlkZW1wb3RlbmN5Q2FjaGUuc2V0KGlucHV0LmlkZW1wb3RlbmN5S2V5LCB7IC4uLnJlc3VsdCB9KTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgLyoqIFNoYXJlZCBieSBhZHZhbmNlU3RhdGUgYW5kIHRoZSBnYXRlLWZpcmVkIHRyYW5zaXRpb25zLiAqL1xuICBwcml2YXRlIGV4ZWN1dGVUcmFuc2l0aW9uKFxuICAgIGl0ZW06IFdvcmtJdGVtUm93LFxuICAgIHRvOiBXb3JrSXRlbVN0YXRlLFxuICAgIGFjdG9ySWQ6IHN0cmluZyxcbiAgICBpZGVtcG90ZW5jeUtleT86IHN0cmluZyxcbiAgICBjYXVzYXRpb25JZD86IHN0cmluZyxcbiAgKTogV29ya0l0ZW0ge1xuICAgIGNvbnN0IGZyb20gPSBpdGVtLnN0YXRlO1xuICAgIGl0ZW0uc3RhdGUgPSB0bztcbiAgICBpdGVtLnN0YXRlVmVyc2lvbiArPSAxO1xuICAgIGNvbnN0IGV2ZW50ID0gdGhpcy5hcHBlbmQoXG4gICAgICAnd29ya19pdGVtJyxcbiAgICAgIGl0ZW0uaWQsXG4gICAgICAnd29ya19pdGVtLnN0YXRlX2NoYW5nZWQnLFxuICAgICAgYWN0b3JJZCxcbiAgICAgIHsgZnJvbSwgdG8gfSxcbiAgICAgIHtcbiAgICAgICAgLi4uKGNhdXNhdGlvbklkICE9PSB1bmRlZmluZWQgPyB7IGNhdXNhdGlvbklkIH0gOiB7fSksXG4gICAgICAgIC4uLihpZGVtcG90ZW5jeUtleSAhPT0gdW5kZWZpbmVkID8geyBpZGVtcG90ZW5jeUtleSB9IDoge30pLFxuICAgICAgfSxcbiAgICApO1xuXG4gICAgLy8gRXBpYy1saWZ0IHByb2plY3RvciAocm9hZG1hcCBcdTAwQTcxLjIpOiBmaXJzdCBjaGlsZCBMRUFWSU5HIGJhY2tsb2cgbGlmdHNcbiAgICAvLyB0aGUgZmVhdHVyZTsgaWRlbXBvdGVudCBieSBjaGVjazsgYXV0aG9yZWQgYnkgdGhlIHN5c3RlbSBhY3Rvci5cbiAgICBpZiAoZnJvbSA9PT0gJ2JhY2tsb2cnICYmIHRvICE9PSAnYmFja2xvZycpIHtcbiAgICAgIGNvbnN0IGZlYXR1cmUgPSB0aGlzLmZlYXR1cmVzLmdldChpdGVtLmZlYXR1cmVJZCk7XG4gICAgICBpZiAoZmVhdHVyZSAmJiBmZWF0dXJlLnN0YXRlID09PSAnYmFja2xvZycpIHtcbiAgICAgICAgZmVhdHVyZS5zdGF0ZSA9ICdpbl9wcm9ncmVzcyc7XG4gICAgICAgIHRoaXMuYXBwZW5kKCdmZWF0dXJlJywgZmVhdHVyZS5pZCwgJ2ZlYXR1cmUuc3RhdGVfY2hhbmdlZCcsIHRoaXMuc3lzdGVtQWN0b3JJZCwge1xuICAgICAgICAgIGZyb206ICdiYWNrbG9nJyxcbiAgICAgICAgICB0bzogJ2luX3Byb2dyZXNzJyxcbiAgICAgICAgfSwgeyBjYXVzYXRpb25JZDogU3RyaW5nKGV2ZW50Lmdsb2JhbFNlcSkgfSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gZG9uZV9jaGVja3BvaW50IChyb2FkbWFwIFx1MDBBNzEuMSk6IHRoZSBzdG9yeSBjb21wbGV0ZXMgbm9ybWFsbHk7IHRoZSBob2xkXG4gICAgLy8gbWF0ZXJpYWxpemVzIG9uIHRoZSBmZWF0dXJlIGV4YWN0bHkgYXQgY29tcGxldGlvbi5cbiAgICBpZiAodG8gPT09ICdkb25lJyAmJiBpdGVtLmRvbmVDaGVja3BvaW50KSB7XG4gICAgICBjb25zdCBmZWF0dXJlID0gdGhpcy5mZWF0dXJlcy5nZXQoaXRlbS5mZWF0dXJlSWQpO1xuICAgICAgaWYgKGZlYXR1cmUgJiYgIWZlYXR1cmUuZGlzcGF0Y2hIb2xkKSB7XG4gICAgICAgIGZlYXR1cmUuZGlzcGF0Y2hIb2xkID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5hcHBlbmQoJ2ZlYXR1cmUnLCBmZWF0dXJlLmlkLCAnZmVhdHVyZS5kaXNwYXRjaF9ob2xkX3JhaXNlZCcsIHRoaXMuc3lzdGVtQWN0b3JJZCwge1xuICAgICAgICAgIHdvcmtJdGVtSWQ6IGl0ZW0uaWQsXG4gICAgICAgIH0sIHsgY2F1c2F0aW9uSWQ6IFN0cmluZyhldmVudC5nbG9iYWxTZXEpIH0pO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIFJhaWxzIFx1MjE5MiBjaGF0OiBuYXJyYXRlIHRoZSB0cmFuc2l0aW9uIGludG8gYm91bmQgdGFzayB0aHJlYWRzIChcdTAwQTc1LjIpLlxuICAgIHRoaXMubmFycmF0ZVdvcmtJdGVtKGl0ZW0sIGBzdGF0ZTogJHtmcm9tfSBcdTIxOTIgJHt0b31gKTtcblxuICAgIGNvbnN0IHJlc3VsdCA9IHRoaXMuY29weUl0ZW0oaXRlbSk7XG4gICAgaWYgKGlkZW1wb3RlbmN5S2V5ICE9PSB1bmRlZmluZWQpIHRoaXMuaWRlbXBvdGVuY3lDYWNoZS5zZXQoaWRlbXBvdGVuY3lLZXksIHsgLi4ucmVzdWx0IH0pO1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICBibG9ja1Rhc2soaW5wdXQ6IHtcbiAgICB3b3JrSXRlbUlkOiBzdHJpbmc7XG4gICAgcmVhc29uOiBCbG9ja2VkUmVhc29uO1xuICAgIGFjdG9ySWQ6IHN0cmluZztcbiAgICBmZW5jaW5nVG9rZW4/OiBudW1iZXI7XG4gIH0pOiBXb3JrSXRlbSB7XG4gICAgY29uc3QgaXRlbSA9IHRoaXMubXVzdEdldEl0ZW0oaW5wdXQud29ya0l0ZW1JZCk7XG4gICAgaWYgKCEoQkxPQ0tFRF9SRUFTT05TIGFzIHJlYWRvbmx5IHN0cmluZ1tdKS5pbmNsdWRlcyhpbnB1dC5yZWFzb24pKSB7XG4gICAgICB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcihgdW5rbm93biBibG9ja2luZyBjb25kaXRpb246ICR7aW5wdXQucmVhc29ufWApO1xuICAgIH1cbiAgICB0aGlzLnZhbGlkYXRlUHJlc2VudGVkVG9rZW4oaXRlbSwgaW5wdXQuZmVuY2luZ1Rva2VuLCBpbnB1dC5hY3RvcklkKTtcbiAgICB0aGlzLnJlcXVpcmVQZXJtaXNzaW9uKGlucHV0LmFjdG9ySWQsICd0YXNrLmJsb2NrJyk7XG4gICAgaXRlbS5ibG9ja2VkUmVhc29uID0gaW5wdXQucmVhc29uO1xuICAgIGl0ZW0uc3RhdGVWZXJzaW9uICs9IDE7XG4gICAgdGhpcy5hcHBlbmQoJ3dvcmtfaXRlbScsIGl0ZW0uaWQsICd3b3JrX2l0ZW0uYmxvY2tlZCcsIGlucHV0LmFjdG9ySWQsIHsgcmVhc29uOiBpbnB1dC5yZWFzb24gfSk7XG4gICAgcmV0dXJuIHRoaXMuY29weUl0ZW0oaXRlbSk7XG4gIH1cblxuICB1bmJsb2NrVGFzayhpbnB1dDogeyB3b3JrSXRlbUlkOiBzdHJpbmc7IGFjdG9ySWQ6IHN0cmluZyB9KTogV29ya0l0ZW0ge1xuICAgIGNvbnN0IGl0ZW0gPSB0aGlzLm11c3RHZXRJdGVtKGlucHV0LndvcmtJdGVtSWQpO1xuICAgIC8vIFx1MDBBNzQuMjogcmV2aWV3X25vbl9jb252ZXJnZW5jZSBjYW4gb25seSBiZSByZWxlYXNlZCBieSBhIHJldmlldy1nYXRlXG4gICAgLy8gaG9sZGVyOyBvcmRpbmFyeSBibG9ja3MgcmVsZWFzZSB1bmRlciB0YXNrLmJsb2NrLlxuICAgIGlmIChpdGVtLmJsb2NrZWRSZWFzb24gPT09ICdyZXZpZXdfbm9uX2NvbnZlcmdlbmNlJykge1xuICAgICAgdGhpcy5yZXF1aXJlUGVybWlzc2lvbihpbnB1dC5hY3RvcklkLCAnZ2F0ZS5yZXZpZXcuYXBwcm92ZScpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnJlcXVpcmVQZXJtaXNzaW9uKGlucHV0LmFjdG9ySWQsICd0YXNrLmJsb2NrJyk7XG4gICAgfVxuICAgIGl0ZW0uYmxvY2tlZFJlYXNvbiA9IG51bGw7XG4gICAgaXRlbS5zdGF0ZVZlcnNpb24gKz0gMTtcbiAgICB0aGlzLmFwcGVuZCgnd29ya19pdGVtJywgaXRlbS5pZCwgJ3dvcmtfaXRlbS51bmJsb2NrZWQnLCBpbnB1dC5hY3RvcklkLCB7fSk7XG4gICAgcmV0dXJuIHRoaXMuY29weUl0ZW0oaXRlbSk7XG4gIH1cblxuICAvLyAtLSBnYXRlcyAmIGV2aWRlbmNlIChyb2FkbWFwIFx1MDBBNzEuNCkgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgc3VibWl0RXZpZGVuY2UoaW5wdXQ6IHtcbiAgICB3b3JrSXRlbUlkOiBzdHJpbmc7XG4gICAgZXZpZGVuY2U6IEV2aWRlbmNlO1xuICAgIGFjdG9ySWQ6IHN0cmluZztcbiAgICBmZW5jaW5nVG9rZW4/OiBudW1iZXI7XG4gIH0pOiB2b2lkIHtcbiAgICBjb25zdCBpdGVtID0gdGhpcy5tdXN0R2V0SXRlbShpbnB1dC53b3JrSXRlbUlkKTtcbiAgICB0aGlzLnZhbGlkYXRlUHJlc2VudGVkVG9rZW4oaXRlbSwgaW5wdXQuZmVuY2luZ1Rva2VuLCBpbnB1dC5hY3RvcklkKTtcbiAgICB0aGlzLmV2aWRlbmNlUm93cy5wdXNoKHsgd29ya0l0ZW1JZDogaXRlbS5pZCwgZXZpZGVuY2U6IGlucHV0LmV2aWRlbmNlLCBzZXE6IHRoaXMuZXZpZGVuY2VSb3dzLmxlbmd0aCArIDEgfSk7XG4gICAgdGhpcy5hcHBlbmQoJ3dvcmtfaXRlbScsIGl0ZW0uaWQsICdldmlkZW5jZS5zdWJtaXR0ZWQnLCBpbnB1dC5hY3RvcklkLCB7XG4gICAgICBraW5kOiBpbnB1dC5ldmlkZW5jZS5raW5kLFxuICAgIH0pO1xuICB9XG5cbiAgYXBwcm92ZUdhdGUoaW5wdXQ6IEdhdGVEZWNpc2lvbklucHV0KTogV29ya0l0ZW0ge1xuICAgIGNvbnN0IGl0ZW0gPSB0aGlzLm11c3RHZXRJdGVtKGlucHV0LndvcmtJdGVtSWQpO1xuXG4gICAgaWYgKGlucHV0LmdhdGUgPT09ICdzcGVjX2FwcHJvdmFsJykge1xuICAgICAgLy8gUGVybWlzc2lvbiBwcmVjZWRlcyBhbnkgZWZmZWN0OiBhIGRlbmllZCBhdHRlbXB0IHBpbnMgbm90aGluZy5cbiAgICAgIHRoaXMucmVxdWlyZVBlcm1pc3Npb24oaW5wdXQuYWN0b3JJZCwgJ2dhdGUuc3BlYy5hcHByb3ZlJyk7XG4gICAgICBpZiAoaXRlbS5ibG9ja2VkUmVhc29uICE9PSBudWxsKSB7XG4gICAgICAgIHRocm93IG5ldyBHdWFyZEZhaWxlZEVycm9yKGB3b3JrIGl0ZW0gaXMgYmxvY2tlZDogJHtpdGVtLmJsb2NrZWRSZWFzb259YCk7XG4gICAgICB9XG4gICAgICBpZiAoaXRlbS5zdGF0ZSAhPT0gJ2RyYWZ0Jykge1xuICAgICAgICB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcihgc3BlY19hcHByb3ZhbCBhcHBsaWVzIHRvIGRyYWZ0IGl0ZW1zLCBub3QgJHtpdGVtLnN0YXRlfWApO1xuICAgICAgfVxuICAgICAgaWYgKGlucHV0LnBpbm5lZFZlcmlmaWNhdGlvbiAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGl0ZW0ucGlubmVkVmVyaWZpY2F0aW9uID0gWy4uLmlucHV0LnBpbm5lZFZlcmlmaWNhdGlvbl07XG4gICAgICB9XG4gICAgICBpZiAoIXRoaXMucXVvcnVtV291bGRCZU1ldChpdGVtLCAnc3BlY19hcHByb3ZhbCcsIGlucHV0LmFjdG9ySWQpKSB7XG4gICAgICAgIHRoaXMucmVjb3JkQXBwcm92YWwoaXRlbSwgJ3NwZWNfYXBwcm92YWwnLCBpbnB1dC5hY3RvcklkKTtcbiAgICAgICAgcmV0dXJuIHRoaXMuY29weUl0ZW0oaXRlbSk7IC8vIGRlY2lzaW9uIHJlY29yZGVkOyBxdW9ydW0gcGVuZGluZyAoZ2F0ZSBwb2xpY3kgaXMgZGF0YSwgcm9hZG1hcCBcdTAwQTczKVxuICAgICAgfVxuICAgICAgdGhpcy5yZWNvcmRBcHByb3ZhbChpdGVtLCAnc3BlY19hcHByb3ZhbCcsIGlucHV0LmFjdG9ySWQpO1xuICAgICAgLy8gVGhlIGFwcHJvdmFsIGZpcmVzIHRoZSBnYXRlZCBmb3J3YXJkIHRyYW5zaXRpb24gKGNvbmZvcm1hbmNlIHBpbikuXG4gICAgICByZXR1cm4gdGhpcy5leGVjdXRlVHJhbnNpdGlvbihpdGVtLCAncmVhZHlfZm9yX2RldicsIGlucHV0LmFjdG9ySWQpO1xuICAgIH1cblxuICAgIC8vIHJldmlld19hcHByb3ZhbFxuICAgIHRoaXMucmVxdWlyZVBlcm1pc3Npb24oaW5wdXQuYWN0b3JJZCwgJ2dhdGUucmV2aWV3LmFwcHJvdmUnKTtcbiAgICBpZiAoaXRlbS5ibG9ja2VkUmVhc29uICE9PSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcihgd29yayBpdGVtIGlzIGJsb2NrZWQ6ICR7aXRlbS5ibG9ja2VkUmVhc29ufWApO1xuICAgIH1cbiAgICBpZiAoaXRlbS5zdGF0ZSAhPT0gJ2luX3JldmlldycpIHtcbiAgICAgIHRocm93IG5ldyBHdWFyZEZhaWxlZEVycm9yKGByZXZpZXdfYXBwcm92YWwgYXBwbGllcyB0byBpbl9yZXZpZXcgaXRlbXMsIG5vdCAke2l0ZW0uc3RhdGV9YCk7XG4gICAgfVxuICAgIGlmICghdGhpcy5xdW9ydW1Xb3VsZEJlTWV0KGl0ZW0sICdyZXZpZXdfYXBwcm92YWwnLCBpbnB1dC5hY3RvcklkKSkge1xuICAgICAgdGhpcy5yZWNvcmRBcHByb3ZhbChpdGVtLCAncmV2aWV3X2FwcHJvdmFsJywgaW5wdXQuYWN0b3JJZCk7XG4gICAgICByZXR1cm4gdGhpcy5jb3B5SXRlbShpdGVtKTsgLy8gcXVvcnVtIHBlbmRpbmcgXHUyMDE0IG5vIHRyYW5zaXRpb24geWV0XG4gICAgfVxuICAgIC8vIEV2aWRlbmNlIGlzIGNoZWNrZWQgZXhhY3RseSB3aGVuIHRoZSBxdW9ydW0gd291bGQgY29tcGxldGUsIHNvIGEgZmFpbGVkXG4gICAgLy8gYXBwcm92YWwgcmVjb3JkcyBub3RoaW5nIChQaGFzZSAxIHBpbjogZGVuaWVkIGF0dGVtcHRzIG11dGF0ZSBub3RoaW5nKS5cbiAgICB0aGlzLmNoZWNrUmV2aWV3RXZpZGVuY2UoaXRlbSk7XG4gICAgdGhpcy5yZWNvcmRBcHByb3ZhbChpdGVtLCAncmV2aWV3X2FwcHJvdmFsJywgaW5wdXQuYWN0b3JJZCk7XG4gICAgcmV0dXJuIHRoaXMuZXhlY3V0ZVRyYW5zaXRpb24oaXRlbSwgJ2RvbmUnLCBpbnB1dC5hY3RvcklkKTtcbiAgfVxuXG4gIC8qKiBEaXN0aW5jdCBhcHByb3ZlcnMgb2YgdGhpcyByb3VuZCAocm91bmQgPSByZXZpZXdMb29wSXRlcmF0aW9uIGF0IGRlY2lzaW9uIHRpbWUpLiAqL1xuICBwcml2YXRlIHJvdW5kQXBwcm92ZXJzKGl0ZW06IFdvcmtJdGVtUm93LCBnYXRlOiBHYXRlQ29kZSk6IEFjdG9yW10ge1xuICAgIGNvbnN0IGlkcyA9IG5ldyBTZXQoXG4gICAgICB0aGlzLmdhdGVEZWNpc2lvbnNcbiAgICAgICAgLmZpbHRlcihcbiAgICAgICAgICAoZCkgPT5cbiAgICAgICAgICAgIGQud29ya0l0ZW1JZCA9PT0gaXRlbS5pZCAmJlxuICAgICAgICAgICAgZC5nYXRlID09PSBnYXRlICYmXG4gICAgICAgICAgICBkLmRlY2lzaW9uID09PSAnYXBwcm92ZWQnICYmXG4gICAgICAgICAgICBkLnJvdW5kID09PSBpdGVtLnJldmlld0xvb3BJdGVyYXRpb24sXG4gICAgICAgIClcbiAgICAgICAgLm1hcCgoZCkgPT4gZC5hY3RvcklkKSxcbiAgICApO1xuICAgIHJldHVybiBbLi4uaWRzXS5mbGF0TWFwKChpZCkgPT4ge1xuICAgICAgY29uc3QgYWN0b3IgPSB0aGlzLmFjdG9ycy5nZXQoaWQpO1xuICAgICAgcmV0dXJuIGFjdG9yID8gW2FjdG9yXSA6IFtdO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqIEdhdGUgcG9saWN5IHF1b3J1bSAocm9hZG1hcCBcdTAwQTczKTogbWluIGRpc3RpbmN0IGFwcHJvdmVycyArIHJlcXVpcmVkIGFjdG9yIHR5cGVzLCBhcyBEQVRBLiAqL1xuICBwcml2YXRlIHF1b3J1bVdvdWxkQmVNZXQoaXRlbTogV29ya0l0ZW1Sb3csIGdhdGU6IEdhdGVDb2RlLCBuZXh0QXBwcm92ZXJJZDogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgY29uc3QgcG9saWN5ID0gdGhpcy5nYXRlUG9saWNpZXMuZ2V0KGdhdGUpID8/IHt9O1xuICAgIGNvbnN0IG1pbiA9IHBvbGljeS5taW5BcHByb3ZhbHMgPz8gMTtcbiAgICBjb25zdCByZXF1aXJlZCA9IHBvbGljeS5yZXF1aXJlZEFjdG9yVHlwZXMgPz8gW107XG4gICAgY29uc3QgYXBwcm92ZXJzID0gdGhpcy5yb3VuZEFwcHJvdmVycyhpdGVtLCBnYXRlKTtcbiAgICBjb25zdCBuZXh0QWN0b3IgPSB0aGlzLmFjdG9ycy5nZXQobmV4dEFwcHJvdmVySWQpO1xuICAgIGlmIChuZXh0QWN0b3IgJiYgIWFwcHJvdmVycy5zb21lKChhKSA9PiBhLmlkID09PSBuZXh0QWN0b3IuaWQpKSBhcHByb3ZlcnMucHVzaChuZXh0QWN0b3IpO1xuICAgIGlmIChhcHByb3ZlcnMubGVuZ3RoIDwgbWluKSByZXR1cm4gZmFsc2U7XG4gICAgZm9yIChjb25zdCB0eXBlIG9mIHJlcXVpcmVkKSB7XG4gICAgICBpZiAoIWFwcHJvdmVycy5zb21lKChhKSA9PiBhLnR5cGUgPT09IHR5cGUpKSByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgcHJpdmF0ZSByZWNvcmRBcHByb3ZhbChpdGVtOiBXb3JrSXRlbVJvdywgZ2F0ZTogR2F0ZUNvZGUsIGFjdG9ySWQ6IHN0cmluZyk6IHZvaWQge1xuICAgIHRoaXMuZ2F0ZURlY2lzaW9ucy5wdXNoKHtcbiAgICAgIHdvcmtJdGVtSWQ6IGl0ZW0uaWQsXG4gICAgICBnYXRlLFxuICAgICAgZGVjaXNpb246ICdhcHByb3ZlZCcsXG4gICAgICBhY3RvcklkLFxuICAgICAgcm91bmQ6IGl0ZW0ucmV2aWV3TG9vcEl0ZXJhdGlvbixcbiAgICB9KTtcbiAgICB0aGlzLmFwcGVuZCgnd29ya19pdGVtJywgaXRlbS5pZCwgJ2dhdGUuYXBwcm92ZWQnLCBhY3RvcklkLCB7XG4gICAgICBnYXRlLFxuICAgICAgcm91bmQ6IGl0ZW0ucmV2aWV3TG9vcEl0ZXJhdGlvbixcbiAgICAgIC4uLihnYXRlID09PSAnc3BlY19hcHByb3ZhbCcgPyB7IHBpbm5lZFZlcmlmaWNhdGlvbjogaXRlbS5waW5uZWRWZXJpZmljYXRpb24gfSA6IHt9KSxcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBFdmlkZW5jZSBjb25kaXRpb24gb2YgdGhlIGRvbmUgZ2F0ZSAoXHUwMEE3MS40LCBENyk6IGV2ZXJ5IFBJTk5FRCBjb21tYW5kJ3NcbiAgICogbGF0ZXN0IHRlc3RfcnVuIGV4aXRlZCAwIChhbiB1bnBpbm5lZCBjb21tYW5kIHNhdGlzZmllcyBub3RoaW5nKSwgYW5kIHRoZVxuICAgKiBmaW5hbCBjb21taXQgaXMgcmVhY2hhYmxlIG9uIHRoZSByZW1vdGUuIHJldmlld19yZXBvcnQgaXMgbmV2ZXIgY29uc3VsdGVkLlxuICAgKiBXaXRoIG5vdGhpbmcgcGlubmVkLCB0aGUgZ2F0ZSBkZWNpc2lvbiBieSB0aGUgcGVybWl0dGVkIGFjdG9yIElTIHRoZSBodW1hblxuICAgKiBkZWNpc2lvbiBcdTIwMTQgZXZpZGVuY2UgYWxvbmUgbmV2ZXIgY29tcGxldGVzIHRoZSBpdGVtIGVpdGhlciB3YXkuXG4gICAqL1xuICBwcml2YXRlIGNoZWNrUmV2aWV3RXZpZGVuY2UoaXRlbTogV29ya0l0ZW1Sb3cpOiB2b2lkIHtcbiAgICBjb25zdCByb3dzID0gdGhpcy5ldmlkZW5jZVJvd3MuZmlsdGVyKChyb3cpID0+IHJvdy53b3JrSXRlbUlkID09PSBpdGVtLmlkKTtcbiAgICBmb3IgKGNvbnN0IGNvbW1hbmQgb2YgaXRlbS5waW5uZWRWZXJpZmljYXRpb24gPz8gW10pIHtcbiAgICAgIGNvbnN0IHJ1bnMgPSByb3dzLmZpbHRlcihcbiAgICAgICAgKHJvdykgPT4gcm93LmV2aWRlbmNlLmtpbmQgPT09ICd0ZXN0X3J1bicgJiYgcm93LmV2aWRlbmNlLnBheWxvYWRbJ2NvbW1hbmQnXSA9PT0gY29tbWFuZCxcbiAgICAgICk7XG4gICAgICBjb25zdCBsYXRlc3QgPSBydW5zW3J1bnMubGVuZ3RoIC0gMV07XG4gICAgICBpZiAoIWxhdGVzdCB8fCBsYXRlc3QuZXZpZGVuY2UucGF5bG9hZFsnZXhpdENvZGUnXSAhPT0gMCkge1xuICAgICAgICB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcihgcGlubmVkIHZlcmlmaWNhdGlvbiBkaWQgbm90IHBhc3M6ICR7Y29tbWFuZH1gKTtcbiAgICAgIH1cbiAgICB9XG4gICAgY29uc3QgY29tbWl0T2sgPSByb3dzLnNvbWUoXG4gICAgICAocm93KSA9PiByb3cuZXZpZGVuY2Uua2luZCA9PT0gJ2NvbW1pdCcgJiYgcm93LmV2aWRlbmNlLnBheWxvYWRbJ3JlYWNoYWJsZU9uUmVtb3RlJ10gPT09IHRydWUsXG4gICAgKTtcbiAgICBpZiAoIWNvbW1pdE9rKSB7XG4gICAgICB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcignZmluYWwgcmV2aXNpb24gbXVzdCBiZSByZWFjaGFibGUgb24gdGhlIHJlbW90ZSAocHVzaCBpcyBwYXJ0IG9mIHRoZSBIQUxUIGNvbnRyYWN0KScpO1xuICAgIH1cbiAgfVxuXG4gIHJlamVjdEdhdGUoaW5wdXQ6IEdhdGVEZWNpc2lvbklucHV0KTogV29ya0l0ZW0ge1xuICAgIGNvbnN0IGl0ZW0gPSB0aGlzLm11c3RHZXRJdGVtKGlucHV0LndvcmtJdGVtSWQpO1xuICAgIGlmIChpbnB1dC5nYXRlICE9PSAncmV2aWV3X2FwcHJvdmFsJykge1xuICAgICAgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoJ29ubHkgcmV2aWV3X2FwcHJvdmFsIHJlamVjdGlvbiBpcyBkZWZpbmVkIGluIFBoYXNlIDEnKTtcbiAgICB9XG4gICAgLy8gUGhhc2UgMiAoYWRkaXRpdmUpOiByZWplY3Rpb24gYXV0aG9yaXR5ID0gZ2F0ZS5yZXZpZXcuYXBwcm92ZSBPUlxuICAgIC8vIGdhdGUucmV2aWV3LnJlamVjdCBcdTIwMTQgdGhlIFBoYXNlIDIgZXhpdCBjcml0ZXJpb24ncyByZXZpZXdlci1hZ2VudCBob2xkc1xuICAgIC8vIG9ubHkgdGhlIGxhdHRlci4gRXZlcnkgUGhhc2UgMSBwaW4gb24gcmVqZWN0R2F0ZSBrZWVwcyBob2xkaW5nLlxuICAgIGlmIChcbiAgICAgICF0aGlzLmhhc1Blcm1pc3Npb24oaW5wdXQuYWN0b3JJZCwgJ2dhdGUucmV2aWV3LmFwcHJvdmUnKSAmJlxuICAgICAgIXRoaXMuaGFzUGVybWlzc2lvbihpbnB1dC5hY3RvcklkLCAnZ2F0ZS5yZXZpZXcucmVqZWN0JylcbiAgICApIHtcbiAgICAgIHRocm93IG5ldyBQZXJtaXNzaW9uRGVuaWVkRXJyb3IoJ2dhdGUucmV2aWV3LnJlamVjdCcsIGlucHV0LmFjdG9ySWQpO1xuICAgIH1cbiAgICBpZiAoaXRlbS5zdGF0ZSAhPT0gJ2luX3JldmlldycpIHtcbiAgICAgIHRocm93IG5ldyBHdWFyZEZhaWxlZEVycm9yKGByZXZpZXcgcmVqZWN0aW9uIGFwcGxpZXMgdG8gaW5fcmV2aWV3IGl0ZW1zLCBub3QgJHtpdGVtLnN0YXRlfWApO1xuICAgIH1cbiAgICB0aGlzLmdhdGVEZWNpc2lvbnMucHVzaCh7XG4gICAgICB3b3JrSXRlbUlkOiBpdGVtLmlkLFxuICAgICAgZ2F0ZTogJ3Jldmlld19hcHByb3ZhbCcsXG4gICAgICBkZWNpc2lvbjogJ3JlamVjdGVkJyxcbiAgICAgIGFjdG9ySWQ6IGlucHV0LmFjdG9ySWQsXG4gICAgICByb3VuZDogaXRlbS5yZXZpZXdMb29wSXRlcmF0aW9uLFxuICAgIH0pO1xuICAgIGNvbnN0IGRlY2lzaW9uRXZlbnQgPSB0aGlzLmFwcGVuZCgnd29ya19pdGVtJywgaXRlbS5pZCwgJ2dhdGUucmVqZWN0ZWQnLCBpbnB1dC5hY3RvcklkLCB7XG4gICAgICBnYXRlOiAncmV2aWV3X2FwcHJvdmFsJyxcbiAgICB9KTtcblxuICAgIGlmIChpdGVtLnJldmlld0xvb3BJdGVyYXRpb24gPj0gUkVWSUVXX0xPT1BfTElNSVQpIHtcbiAgICAgIC8vIFRoZSA2dGggcmVqZWN0aW9uIHBlcmZvcm1zIG5vIGxvb3BiYWNrOiBvdmVybGF5IHJldmlld19ub25fY29udmVyZ2VuY2UsXG4gICAgICAvLyBzdGF0ZSBmcm96ZW4gYXQgaW5fcmV2aWV3LCBjb3VudGVyIHVudG91Y2hlZCAoQ09ORk9STUFOQ0UubWQgcGluKS5cbiAgICAgIGl0ZW0uYmxvY2tlZFJlYXNvbiA9ICdyZXZpZXdfbm9uX2NvbnZlcmdlbmNlJztcbiAgICAgIGl0ZW0uc3RhdGVWZXJzaW9uICs9IDE7XG4gICAgICB0aGlzLmFwcGVuZChcbiAgICAgICAgJ3dvcmtfaXRlbScsXG4gICAgICAgIGl0ZW0uaWQsXG4gICAgICAgICd3b3JrX2l0ZW0uYmxvY2tlZCcsXG4gICAgICAgIHRoaXMuc3lzdGVtQWN0b3JJZCxcbiAgICAgICAgeyByZWFzb246ICdyZXZpZXdfbm9uX2NvbnZlcmdlbmNlJyB9LFxuICAgICAgICB7IGNhdXNhdGlvbklkOiBTdHJpbmcoZGVjaXNpb25FdmVudC5nbG9iYWxTZXEpIH0sXG4gICAgICApO1xuICAgICAgcmV0dXJuIHRoaXMuY29weUl0ZW0oaXRlbSk7XG4gICAgfVxuXG4gICAgLy8gXHUwMEE3MS4yOiB0aGUgbG9vcGJhY2sgaXMgYSBzeXN0ZW0gZWZmZWN0IFx1MjAxNCBubyBjbGFpbS1ob2xkZXIgcGFydGljaXBhdGlvbi5cbiAgICBpdGVtLnJldmlld0xvb3BJdGVyYXRpb24gKz0gMTtcbiAgICByZXR1cm4gdGhpcy5leGVjdXRlVHJhbnNpdGlvbihpdGVtLCAnaW5fcHJvZ3Jlc3MnLCB0aGlzLnN5c3RlbUFjdG9ySWQsIHVuZGVmaW5lZCwgU3RyaW5nKGRlY2lzaW9uRXZlbnQuZ2xvYmFsU2VxKSk7XG4gIH1cblxuICAvLyAtLSBjb2xsYWJvcmF0aW9uIChQaGFzZSAzLCByb2FkbWFwIFx1MDBBNzUpIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIHByaXZhdGUgbXVzdEdldFRocmVhZCh0aHJlYWRJZDogc3RyaW5nKTogVGhyZWFkIHtcbiAgICBjb25zdCB0aHJlYWQgPSB0aGlzLnRocmVhZHMuZ2V0KHRocmVhZElkKTtcbiAgICBpZiAoIXRocmVhZCkgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoYHVua25vd24gdGhyZWFkOiAke3RocmVhZElkfWApO1xuICAgIHJldHVybiB0aHJlYWQ7XG4gIH1cblxuICBwcml2YXRlIGlzUGFydGljaXBhbnQodGhyZWFkOiBUaHJlYWQsIGFjdG9ySWQ6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aHJlYWQuY3JlYXRlZEJ5ID09PSBhY3RvcklkIHx8IHRocmVhZC5wYXJ0aWNpcGFudHMuaW5jbHVkZXMoYWN0b3JJZCk7XG4gIH1cblxuICBjcmVhdGVUaHJlYWQoaW5wdXQ6IHtcbiAgICBhY3RvcklkOiBzdHJpbmc7XG4gICAga2luZDogVGhyZWFkS2luZDtcbiAgICBmZWF0dXJlSWQ/OiBzdHJpbmc7XG4gICAgd29ya0l0ZW1JZD86IHN0cmluZztcbiAgICB2aXNpYmlsaXR5PzogVGhyZWFkVmlzaWJpbGl0eTtcbiAgfSk6IFRocmVhZCB7XG4gICAgaWYgKGlucHV0LmZlYXR1cmVJZCAhPT0gdW5kZWZpbmVkICYmICF0aGlzLmZlYXR1cmVzLmhhcyhpbnB1dC5mZWF0dXJlSWQpKSB7XG4gICAgICB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcihgdW5rbm93biBmZWF0dXJlOiAke2lucHV0LmZlYXR1cmVJZH1gKTtcbiAgICB9XG4gICAgbGV0IHdvcmtJdGVtSWQ6IHN0cmluZyB8IG51bGwgPSBudWxsO1xuICAgIGlmIChpbnB1dC53b3JrSXRlbUlkICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHdvcmtJdGVtSWQgPSB0aGlzLm11c3RHZXRJdGVtKGlucHV0LndvcmtJdGVtSWQpLmlkO1xuICAgIH1cbiAgICBjb25zdCB0aHJlYWQ6IFRocmVhZCA9IHtcbiAgICAgIGlkOiB0aGlzLm5leHRJZCgndGgnKSxcbiAgICAgIGZlYXR1cmVJZDogaW5wdXQuZmVhdHVyZUlkID8/IG51bGwsXG4gICAgICB3b3JrSXRlbUlkLFxuICAgICAga2luZDogaW5wdXQua2luZCxcbiAgICAgIHZpc2liaWxpdHk6IGlucHV0LnZpc2liaWxpdHkgPz8gKGlucHV0LmtpbmQgPT09ICdwcml2YXRlJyA/ICdwcml2YXRlJyA6ICdvcGVuJyksXG4gICAgICBjcmVhdGVkQnk6IGlucHV0LmFjdG9ySWQsXG4gICAgICBwYXJ0aWNpcGFudHM6IFtpbnB1dC5hY3RvcklkXSxcbiAgICB9O1xuICAgIHRoaXMudGhyZWFkcy5zZXQodGhyZWFkLmlkLCB0aHJlYWQpO1xuICAgIHRoaXMuYXBwZW5kKCd0aHJlYWQnLCB0aHJlYWQuaWQsICd0aHJlYWQuY3JlYXRlZCcsIGlucHV0LmFjdG9ySWQsIHtcbiAgICAgIGtpbmQ6IHRocmVhZC5raW5kLFxuICAgICAgZmVhdHVyZUlkOiB0aHJlYWQuZmVhdHVyZUlkLFxuICAgICAgd29ya0l0ZW1JZDogdGhyZWFkLndvcmtJdGVtSWQsXG4gICAgICB2aXNpYmlsaXR5OiB0aHJlYWQudmlzaWJpbGl0eSxcbiAgICB9KTtcbiAgICByZXR1cm4geyAuLi50aHJlYWQsIHBhcnRpY2lwYW50czogWy4uLnRocmVhZC5wYXJ0aWNpcGFudHNdIH07XG4gIH1cblxuICBhZGRUaHJlYWRQYXJ0aWNpcGFudChpbnB1dDogeyB0aHJlYWRJZDogc3RyaW5nOyBhY3RvcklkOiBzdHJpbmc7IGJ5QWN0b3JJZDogc3RyaW5nIH0pOiBUaHJlYWQge1xuICAgIGNvbnN0IHRocmVhZCA9IHRoaXMubXVzdEdldFRocmVhZChpbnB1dC50aHJlYWRJZCk7XG4gICAgaWYgKCF0aGlzLmlzUGFydGljaXBhbnQodGhyZWFkLCBpbnB1dC5ieUFjdG9ySWQpKSB7XG4gICAgICB0aHJvdyBuZXcgUGVybWlzc2lvbkRlbmllZEVycm9yKCd0aHJlYWQuaW52aXRlJywgaW5wdXQuYnlBY3RvcklkKTtcbiAgICB9XG4gICAgaWYgKCF0aGlzLmFjdG9ycy5oYXMoaW5wdXQuYWN0b3JJZCkpIHRocm93IG5ldyBHdWFyZEZhaWxlZEVycm9yKGB1bmtub3duIGFjdG9yOiAke2lucHV0LmFjdG9ySWR9YCk7XG4gICAgaWYgKCF0aHJlYWQucGFydGljaXBhbnRzLmluY2x1ZGVzKGlucHV0LmFjdG9ySWQpKSB7XG4gICAgICB0aHJlYWQucGFydGljaXBhbnRzLnB1c2goaW5wdXQuYWN0b3JJZCk7XG4gICAgICB0aGlzLmFwcGVuZCgndGhyZWFkJywgdGhyZWFkLmlkLCAndGhyZWFkLnBhcnRpY2lwYW50X2FkZGVkJywgaW5wdXQuYnlBY3RvcklkLCB7XG4gICAgICAgIGFjdG9ySWQ6IGlucHV0LmFjdG9ySWQsXG4gICAgICB9KTtcbiAgICB9XG4gICAgcmV0dXJuIHsgLi4udGhyZWFkLCBwYXJ0aWNpcGFudHM6IFsuLi50aHJlYWQucGFydGljaXBhbnRzXSB9O1xuICB9XG5cbiAgLyoqIEludGVybmFsIGFwcGVuZCB0aGF0IG5ldmVyIHJ1bnMgdGhlIHJvdXRlciBcdTIwMTQgdXNlZCBmb3IgY2hhdCwgbmFycmF0aW9uIGFsaWtlLiAqL1xuICBwcml2YXRlIGFwcGVuZE1lc3NhZ2UoXG4gICAgdGhyZWFkOiBUaHJlYWQsXG4gICAgYXV0aG9ySWQ6IHN0cmluZyxcbiAgICBraW5kOiBNZXNzYWdlWydraW5kJ10sXG4gICAgYm9keTogc3RyaW5nLFxuICAgIHJlcGx5VG86IHN0cmluZyB8IG51bGwsXG4gICk6IE1lc3NhZ2Uge1xuICAgIGNvbnN0IHNlcSA9IHRoaXMubWVzc2FnZXMuZmlsdGVyKChtKSA9PiBtLnRocmVhZElkID09PSB0aHJlYWQuaWQpLmxlbmd0aCArIDE7XG4gICAgY29uc3QgbWVzc2FnZTogTWVzc2FnZSA9IHtcbiAgICAgIGlkOiB0aGlzLm5leHRJZCgnbXNnJyksXG4gICAgICB0aHJlYWRJZDogdGhyZWFkLmlkLFxuICAgICAgc2VxLFxuICAgICAgYXV0aG9ySWQsXG4gICAgICBraW5kLFxuICAgICAgYm9keSxcbiAgICAgIHJlcGx5VG8sXG4gICAgfTtcbiAgICB0aGlzLm1lc3NhZ2VzLnB1c2gobWVzc2FnZSk7XG4gICAgdGhpcy5hcHBlbmQoJ3RocmVhZCcsIHRocmVhZC5pZCwgJ21lc3NhZ2UucG9zdGVkJywgYXV0aG9ySWQsIHsgbWVzc2FnZUlkOiBtZXNzYWdlLmlkLCBraW5kIH0pO1xuICAgIHJldHVybiB7IC4uLm1lc3NhZ2UgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBcdTAwQTc1LjI6IHRoZSBzZXJ2ZXIgTkVWRVIgcGFyc2VzIGJvZHkgdGV4dCBcdTIwMTQgYG1lbnRpb25zYCBpcyBzdHJ1Y3R1cmVkIGFjdG9yXG4gICAqIGlkcy4gXHUwMEE3NS40OiB0aGUgcm91dGVyIGlzIHB1cmUgY29kZSwgZGVmYXVsdC1kZW55LCBwb2xpY3ktZ2F0ZWQsXG4gICAqIGRlcHRoLWNhcHBlZDsgYSBqb2IgaXMgcmVwbHktb25seSBjb250ZXh0LCBuZXZlciBhIGNsYWltLlxuICAgKi9cbiAgcG9zdE1lc3NhZ2UoaW5wdXQ6IHtcbiAgICB0aHJlYWRJZDogc3RyaW5nO1xuICAgIGFjdG9ySWQ6IHN0cmluZztcbiAgICBib2R5OiBzdHJpbmc7XG4gICAgcmVwbHlUbz86IHN0cmluZztcbiAgICBtZW50aW9ucz86IHN0cmluZ1tdO1xuICB9KTogTWVzc2FnZSB7XG4gICAgY29uc3QgdGhyZWFkID0gdGhpcy5tdXN0R2V0VGhyZWFkKGlucHV0LnRocmVhZElkKTtcbiAgICBpZiAodGhyZWFkLnZpc2liaWxpdHkgPT09ICdwcml2YXRlJyAmJiAhdGhpcy5pc1BhcnRpY2lwYW50KHRocmVhZCwgaW5wdXQuYWN0b3JJZCkpIHtcbiAgICAgIHRocm93IG5ldyBQZXJtaXNzaW9uRGVuaWVkRXJyb3IoJ3RocmVhZC5wb3N0JywgaW5wdXQuYWN0b3JJZCk7XG4gICAgfVxuICAgIGNvbnN0IG1lc3NhZ2UgPSB0aGlzLmFwcGVuZE1lc3NhZ2UodGhyZWFkLCBpbnB1dC5hY3RvcklkLCAnY2hhdCcsIGlucHV0LmJvZHksIGlucHV0LnJlcGx5VG8gPz8gbnVsbCk7XG5cbiAgICBmb3IgKGNvbnN0IG1lbnRpb25lZElkIG9mIFsuLi5uZXcgU2V0KGlucHV0Lm1lbnRpb25zID8/IFtdKV0pIHtcbiAgICAgIGNvbnN0IG1lbnRpb25lZCA9IHRoaXMuYWN0b3JzLmdldChtZW50aW9uZWRJZCk7XG4gICAgICBpZiAoIW1lbnRpb25lZCkgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoYHVua25vd24gbWVudGlvbmVkIGFjdG9yOiAke21lbnRpb25lZElkfWApO1xuICAgICAgY29uc3QgcmVzb2x1dGlvbiA9IHRoaXMucm91dGVNZW50aW9uKHRocmVhZCwgbWVzc2FnZSwgaW5wdXQuYWN0b3JJZCwgbWVudGlvbmVkKTtcbiAgICAgIHRoaXMubWVudGlvbnMucHVzaCh7IG1lc3NhZ2VJZDogbWVzc2FnZS5pZCwgbWVudGlvbmVkQWN0b3JJZDogbWVudGlvbmVkSWQsIHJlc29sdXRpb24gfSk7XG4gICAgICB0aGlzLmFwcGVuZCgndGhyZWFkJywgdGhyZWFkLmlkLCAnbWVudGlvbi5yZWNvcmRlZCcsIGlucHV0LmFjdG9ySWQsIHtcbiAgICAgICAgbWVzc2FnZUlkOiBtZXNzYWdlLmlkLFxuICAgICAgICBtZW50aW9uZWRBY3RvcklkOiBtZW50aW9uZWRJZCxcbiAgICAgICAgcmVzb2x1dGlvbixcbiAgICAgIH0pO1xuICAgIH1cbiAgICByZXR1cm4gbWVzc2FnZTtcbiAgfVxuXG4gIC8qKiBUaGUgZGV0ZXJtaW5pc3RpYyBtZW50aW9uIHJvdXRlciAoXHUwMEE3NS40KS4gUmV0dXJucyB0aGUgcmVjb3JkZWQgcmVzb2x1dGlvbi4gKi9cbiAgcHJpdmF0ZSByb3V0ZU1lbnRpb24oXG4gICAgdGhyZWFkOiBUaHJlYWQsXG4gICAgbWVzc2FnZTogTWVzc2FnZSxcbiAgICBtZW50aW9uZXJJZDogc3RyaW5nLFxuICAgIG1lbnRpb25lZDogQWN0b3IsXG4gICk6IE1lbnRpb25bJ3Jlc29sdXRpb24nXSB7XG4gICAgaWYgKG1lbnRpb25lZC50eXBlICE9PSAnYWdlbnQnKSB7XG4gICAgICB0aGlzLnB1c2hOb3RpZmljYXRpb24obWVudGlvbmVkLmlkLCAnbWVudGlvbicsIG1lc3NhZ2UuaWQpO1xuICAgICAgcmV0dXJuICdub3RpZmllZCc7XG4gICAgfVxuICAgIC8vIGtpbGwtc3dpdGNoIGFwcGxpZXMgdG8gZXZlcnkgam9iLW1hdGVyaWFsaXppbmcgcGF0aFxuICAgIGlmICh0aGlzLndvcmtzcGFjZVBvbGljeS5tZW50aW9uRGlzcGF0Y2ggPT09IGZhbHNlKSByZXR1cm4gJ2RlbmllZF9wb2xpY3knO1xuXG4gICAgY29uc3QgbWVudGlvbmVyID0gdGhpcy5hY3RvcnMuZ2V0KG1lbnRpb25lcklkKTtcbiAgICBsZXQgZGVwdGggPSAwO1xuICAgIGlmIChtZW50aW9uZXI/LnR5cGUgPT09ICdhZ2VudCcpIHtcbiAgICAgIC8vIGFnZW50LW1lbnRpb24tYWdlbnQ6IGV4cGxpY2l0IHBvbGljeSArIGRlcHRoIGNhcCAoXHUwMEE3NS40KVxuICAgICAgaWYgKHRoaXMud29ya3NwYWNlUG9saWN5LmFnZW50TWVudGlvbkFnZW50ICE9PSB0cnVlKSByZXR1cm4gJ2RlbmllZF9wb2xpY3knO1xuICAgICAgY29uc3QgbWVudGlvbmVySm9icyA9IFsuLi50aGlzLmFnZW50Sm9icy52YWx1ZXMoKV0uZmlsdGVyKChqKSA9PiBqLmFnZW50QWN0b3JJZCA9PT0gbWVudGlvbmVySWQpO1xuICAgICAgZGVwdGggPSBNYXRoLm1heCgwLCAuLi5tZW50aW9uZXJKb2JzLm1hcCgoaikgPT4gai5kZXB0aCkpICsgMTtcbiAgICAgIGlmIChkZXB0aCA+IEFHRU5UX0pPQl9NQVhfREVQVEgpIHJldHVybiAnZGVuaWVkX2RlcHRoJztcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gZGVmYXVsdC1kZW55OiB0aGUgaHVtYW4gbWVudGlvbmVyIG11c3QgaG9sZCBpbnZva2UgYXV0aG9yaXR5IFx1MjAxNFxuICAgICAgLy8gYXQgbGVhc3Qgb25lIGFjdGl2ZSBkZWxpdmVyeSByb2xlLCBvciBnb3Zlcm5hbmNlIGFkbWluLlxuICAgICAgY29uc3QgaGFzUm9sZSA9IHRoaXMucm9sZUFzc2lnbm1lbnRzLnNvbWUoKGEpID0+IGEuYWN0b3JJZCA9PT0gbWVudGlvbmVySWQgJiYgIWEucmV2b2tlZCk7XG4gICAgICBjb25zdCBpc0FkbWluID0gdGhpcy5nb3Zlcm5hbmNlUm9sZXMuZ2V0KG1lbnRpb25lcklkKSA9PT0gJ2FkbWluJyB8fCBtZW50aW9uZXJJZCA9PT0gdGhpcy5zeXN0ZW1BY3RvcklkO1xuICAgICAgaWYgKCFoYXNSb2xlICYmICFpc0FkbWluKSByZXR1cm4gJ2RlbmllZF9wb2xpY3knO1xuICAgIH1cblxuICAgIGNvbnN0IGpvYjogQWdlbnRKb2IgPSB7XG4gICAgICBpZDogdGhpcy5uZXh0SWQoJ2pvYicpLFxuICAgICAgYWdlbnRBY3RvcklkOiBtZW50aW9uZWQuaWQsXG4gICAgICB0aHJlYWRJZDogdGhyZWFkLmlkLFxuICAgICAgbWVzc2FnZUlkOiBtZXNzYWdlLmlkLFxuICAgICAgd29ya0l0ZW1JZDogdGhyZWFkLndvcmtJdGVtSWQsXG4gICAgICBmZWF0dXJlSWQ6IHRocmVhZC5mZWF0dXJlSWQsXG4gICAgICBzdGF0dXM6ICdxdWV1ZWQnLFxuICAgICAgZGVwdGgsXG4gICAgICBub3RlOiBudWxsLFxuICAgIH07XG4gICAgdGhpcy5hZ2VudEpvYnMuc2V0KGpvYi5pZCwgam9iKTtcbiAgICB0aGlzLmFwcGVuZCgnYWdlbnRfam9iJywgam9iLmlkLCAnYWdlbnRfam9iLmNyZWF0ZWQnLCBtZW50aW9uZXJJZCwge1xuICAgICAgYWdlbnRBY3RvcklkOiBtZW50aW9uZWQuaWQsXG4gICAgICB0aHJlYWRJZDogdGhyZWFkLmlkLFxuICAgICAgbWVzc2FnZUlkOiBtZXNzYWdlLmlkLFxuICAgICAgZGVwdGgsXG4gICAgfSk7XG4gICAgdGhpcy5wdXNoTm90aWZpY2F0aW9uKG1lbnRpb25lZC5pZCwgJ21lbnRpb24nLCBtZXNzYWdlLmlkKTtcbiAgICByZXR1cm4gJ2pvYl9jcmVhdGVkJztcbiAgfVxuXG4gIHByaXZhdGUgcHVzaE5vdGlmaWNhdGlvbihhY3RvcklkOiBzdHJpbmcsIHNvdXJjZTogTm90aWZpY2F0aW9uWydzb3VyY2UnXSwgcmVmSWQ6IHN0cmluZyk6IHZvaWQge1xuICAgIHRoaXMubm90aWZpY2F0aW9ucy5wdXNoKHsgaWQ6IHRoaXMubmV4dElkKCdudGYnKSwgYWN0b3JJZCwgc291cmNlLCByZWZJZCwgcmVhZDogZmFsc2UgfSk7XG4gIH1cblxuICBsaXN0VGhyZWFkcyhmaWx0ZXI/OiB7IGZlYXR1cmVJZD86IHN0cmluZzsgd29ya0l0ZW1JZD86IHN0cmluZzsgYWN0b3JJZD86IHN0cmluZyB9KTogVGhyZWFkW10ge1xuICAgIHJldHVybiBbLi4udGhpcy50aHJlYWRzLnZhbHVlcygpXVxuICAgICAgLmZpbHRlcigodCkgPT4ge1xuICAgICAgICBpZiAoZmlsdGVyPy5mZWF0dXJlSWQgIT09IHVuZGVmaW5lZCAmJiB0LmZlYXR1cmVJZCAhPT0gZmlsdGVyLmZlYXR1cmVJZCkgcmV0dXJuIGZhbHNlO1xuICAgICAgICBpZiAoZmlsdGVyPy53b3JrSXRlbUlkICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBjb25zdCByZXNvbHZlZCA9IHRoaXMubXVzdEdldEl0ZW0oZmlsdGVyLndvcmtJdGVtSWQpLmlkO1xuICAgICAgICAgIGlmICh0LndvcmtJdGVtSWQgIT09IHJlc29sdmVkKSByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGZpbHRlcj8uYWN0b3JJZCAhPT0gdW5kZWZpbmVkICYmIHQudmlzaWJpbGl0eSA9PT0gJ3ByaXZhdGUnICYmICF0aGlzLmlzUGFydGljaXBhbnQodCwgZmlsdGVyLmFjdG9ySWQpKSB7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfSlcbiAgICAgIC5tYXAoKHQpID0+ICh7IC4uLnQsIHBhcnRpY2lwYW50czogWy4uLnQucGFydGljaXBhbnRzXSB9KSk7XG4gIH1cblxuICBsaXN0TWVzc2FnZXMoaW5wdXQ6IHsgdGhyZWFkSWQ6IHN0cmluZzsgYWN0b3JJZDogc3RyaW5nOyBzaW5jZVNlcT86IG51bWJlciB9KTogTWVzc2FnZVtdIHtcbiAgICBjb25zdCB0aHJlYWQgPSB0aGlzLm11c3RHZXRUaHJlYWQoaW5wdXQudGhyZWFkSWQpO1xuICAgIGlmICh0aHJlYWQudmlzaWJpbGl0eSA9PT0gJ3ByaXZhdGUnICYmICF0aGlzLmlzUGFydGljaXBhbnQodGhyZWFkLCBpbnB1dC5hY3RvcklkKSkge1xuICAgICAgdGhyb3cgbmV3IFBlcm1pc3Npb25EZW5pZWRFcnJvcigndGhyZWFkLnJlYWQnLCBpbnB1dC5hY3RvcklkKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMubWVzc2FnZXNcbiAgICAgIC5maWx0ZXIoKG0pID0+IG0udGhyZWFkSWQgPT09IHRocmVhZC5pZCAmJiAoaW5wdXQuc2luY2VTZXEgPT09IHVuZGVmaW5lZCB8fCBtLnNlcSA+IGlucHV0LnNpbmNlU2VxKSlcbiAgICAgIC5tYXAoKG0pID0+ICh7IC4uLm0gfSkpO1xuICB9XG5cbiAgbGlzdE1lbnRpb25zKG1lc3NhZ2VJZDogc3RyaW5nKTogTWVudGlvbltdIHtcbiAgICByZXR1cm4gdGhpcy5tZW50aW9ucy5maWx0ZXIoKG0pID0+IG0ubWVzc2FnZUlkID09PSBtZXNzYWdlSWQpLm1hcCgobSkgPT4gKHsgLi4ubSB9KSk7XG4gIH1cblxuICBsaXN0Tm90aWZpY2F0aW9ucyhpbnB1dDogeyBhY3RvcklkOiBzdHJpbmc7IHVucmVhZE9ubHk/OiBib29sZWFuIH0pOiBOb3RpZmljYXRpb25bXSB7XG4gICAgcmV0dXJuIHRoaXMubm90aWZpY2F0aW9uc1xuICAgICAgLmZpbHRlcigobikgPT4gbi5hY3RvcklkID09PSBpbnB1dC5hY3RvcklkICYmIChpbnB1dC51bnJlYWRPbmx5ICE9PSB0cnVlIHx8ICFuLnJlYWQpKVxuICAgICAgLm1hcCgobikgPT4gKHsgLi4ubiB9KSk7XG4gIH1cblxuICBtYXJrTm90aWZpY2F0aW9uUmVhZChpbnB1dDogeyBub3RpZmljYXRpb25JZDogc3RyaW5nOyBhY3RvcklkOiBzdHJpbmcgfSk6IHZvaWQge1xuICAgIGNvbnN0IG5vdGlmaWNhdGlvbiA9IHRoaXMubm90aWZpY2F0aW9ucy5maW5kKChuKSA9PiBuLmlkID09PSBpbnB1dC5ub3RpZmljYXRpb25JZCk7XG4gICAgaWYgKCFub3RpZmljYXRpb24pIHRocm93IG5ldyBHdWFyZEZhaWxlZEVycm9yKGB1bmtub3duIG5vdGlmaWNhdGlvbjogJHtpbnB1dC5ub3RpZmljYXRpb25JZH1gKTtcbiAgICBpZiAobm90aWZpY2F0aW9uLmFjdG9ySWQgIT09IGlucHV0LmFjdG9ySWQpIHtcbiAgICAgIHRocm93IG5ldyBQZXJtaXNzaW9uRGVuaWVkRXJyb3IoJ3RocmVhZC5yZWFkJywgaW5wdXQuYWN0b3JJZCk7XG4gICAgfVxuICAgIG5vdGlmaWNhdGlvbi5yZWFkID0gdHJ1ZTtcbiAgfVxuXG4gIGxpc3RBZ2VudEpvYnMoZmlsdGVyPzogeyBhZ2VudEFjdG9ySWQ/OiBzdHJpbmc7IHN0YXR1cz86IEFnZW50Sm9iWydzdGF0dXMnXSB9KTogQWdlbnRKb2JbXSB7XG4gICAgcmV0dXJuIFsuLi50aGlzLmFnZW50Sm9icy52YWx1ZXMoKV1cbiAgICAgIC5maWx0ZXIoXG4gICAgICAgIChqKSA9PlxuICAgICAgICAgIChmaWx0ZXI/LmFnZW50QWN0b3JJZCA9PT0gdW5kZWZpbmVkIHx8IGouYWdlbnRBY3RvcklkID09PSBmaWx0ZXIuYWdlbnRBY3RvcklkKSAmJlxuICAgICAgICAgIChmaWx0ZXI/LnN0YXR1cyA9PT0gdW5kZWZpbmVkIHx8IGouc3RhdHVzID09PSBmaWx0ZXIuc3RhdHVzKSxcbiAgICAgIClcbiAgICAgIC5tYXAoKGopID0+ICh7IC4uLmogfSkpO1xuICB9XG5cbiAgY29tcGxldGVBZ2VudEpvYihpbnB1dDogeyBqb2JJZDogc3RyaW5nOyBhY3RvcklkOiBzdHJpbmc7IHN0YXR1czogJ2RvbmUnIHwgJ2Jsb2NrZWQnOyBub3RlPzogc3RyaW5nIH0pOiBBZ2VudEpvYiB7XG4gICAgY29uc3Qgam9iID0gdGhpcy5hZ2VudEpvYnMuZ2V0KGlucHV0LmpvYklkKTtcbiAgICBpZiAoIWpvYikgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoYHVua25vd24gYWdlbnQgam9iOiAke2lucHV0LmpvYklkfWApO1xuICAgIGlmIChqb2IuYWdlbnRBY3RvcklkICE9PSBpbnB1dC5hY3RvcklkKSB7XG4gICAgICB0aHJvdyBuZXcgUGVybWlzc2lvbkRlbmllZEVycm9yKCdhZ2VudF9qb2IuY29tcGxldGUnLCBpbnB1dC5hY3RvcklkKTtcbiAgICB9XG4gICAgaWYgKGpvYi5zdGF0dXMgIT09ICdxdWV1ZWQnKSB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcihgYWdlbnQgam9iICR7am9iLmlkfSBpcyBhbHJlYWR5ICR7am9iLnN0YXR1c31gKTtcbiAgICBqb2Iuc3RhdHVzID0gaW5wdXQuc3RhdHVzO1xuICAgIGpvYi5ub3RlID0gaW5wdXQubm90ZSA/PyBudWxsO1xuICAgIHRoaXMuYXBwZW5kKCdhZ2VudF9qb2InLCBqb2IuaWQsICdhZ2VudF9qb2IuY29tcGxldGVkJywgaW5wdXQuYWN0b3JJZCwge1xuICAgICAgc3RhdHVzOiBpbnB1dC5zdGF0dXMsXG4gICAgICBub3RlOiBqb2Iubm90ZSxcbiAgICB9KTtcbiAgICAvLyBub3RpZnkgdGhlIG1lbnRpb25lciBcdTIwMTQgdGhlIHJldmVyc2UgZGlyZWN0aW9uIGlzIGEgbWVzc2FnZSArIG5vdGlmaWNhdGlvbiwgbm90aGluZyBtb3JlIChcdTAwQTc1LjQpXG4gICAgY29uc3QgdHJpZ2dlciA9IHRoaXMubWVzc2FnZXMuZmluZCgobSkgPT4gbS5pZCA9PT0gam9iLm1lc3NhZ2VJZCk7XG4gICAgaWYgKHRyaWdnZXIpIHRoaXMucHVzaE5vdGlmaWNhdGlvbih0cmlnZ2VyLmF1dGhvcklkLCAnam9iX2NvbXBsZXRlZCcsIGpvYi5pZCk7XG4gICAgcmV0dXJuIHsgLi4uam9iIH07XG4gIH1cblxuICAvKiogUmFpbHMgXHUyMTkyIGNoYXQgbmFycmF0aW9uIChcdTAwQTc1LjIpOiBzdGF0ZSBjaGFuZ2VzIG5hcnJhdGUgaW50byBib3VuZCB0YXNrIHRocmVhZHMuICovXG4gIHByaXZhdGUgbmFycmF0ZVdvcmtJdGVtKGl0ZW06IFdvcmtJdGVtUm93LCBib2R5OiBzdHJpbmcpOiB2b2lkIHtcbiAgICBmb3IgKGNvbnN0IHRocmVhZCBvZiB0aGlzLnRocmVhZHMudmFsdWVzKCkpIHtcbiAgICAgIGlmICh0aHJlYWQud29ya0l0ZW1JZCA9PT0gaXRlbS5pZCkge1xuICAgICAgICB0aGlzLmFwcGVuZE1lc3NhZ2UodGhyZWFkLCB0aGlzLnN5c3RlbUFjdG9ySWQsICdzeXN0ZW0nLCBib2R5LCBudWxsKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvLyAtLSBkaXNwYXRjaCAocm9hZG1hcCBcdTAwQTcyLjMpIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgZ2V0VGFza0NvbnRleHQoaW5wdXQ6IHsgd29ya0l0ZW1JZDogc3RyaW5nIH0pOiB7IHdvcmtJdGVtOiBXb3JrSXRlbTsgZW50cnlTdGF0ZTogV29ya0l0ZW1TdGF0ZSB9IHtcbiAgICBjb25zdCBpdGVtID0gdGhpcy5tdXN0R2V0SXRlbShpbnB1dC53b3JrSXRlbUlkKTtcbiAgICBpZiAoaXRlbS5zdGF0ZSA9PT0gJ2RvbmUnKSB7XG4gICAgICB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcignZG9uZSBpdGVtcyBhcmUgbmV2ZXIgcmUtZGlzcGF0Y2hlZDsgZm9sbG93LXVwIHJldmlldyBpcyBhIG5ldyB3b3JrIGl0ZW0nKTtcbiAgICB9XG4gICAgY29uc3QgZmVhdHVyZSA9IHRoaXMuZmVhdHVyZXMuZ2V0KGl0ZW0uZmVhdHVyZUlkKTtcbiAgICBpZiAoZmVhdHVyZT8uZGlzcGF0Y2hIb2xkKSB7XG4gICAgICB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcignZmVhdHVyZSBpcyB1bmRlciBhIGRvbmVfY2hlY2twb2ludCBkaXNwYXRjaCBob2xkJyk7XG4gICAgfVxuICAgIHJldHVybiB7IHdvcmtJdGVtOiB0aGlzLmNvcHlJdGVtKGl0ZW0pLCBlbnRyeVN0YXRlOiBpdGVtLnN0YXRlIH07XG4gIH1cblxuICByZWxlYXNlRGlzcGF0Y2hIb2xkKGlucHV0OiB7IGZlYXR1cmVJZDogc3RyaW5nOyBhY3RvcklkOiBzdHJpbmcgfSk6IEZlYXR1cmUge1xuICAgIHRoaXMucmVxdWlyZVBlcm1pc3Npb24oaW5wdXQuYWN0b3JJZCwgJ2Rpc3BhdGNoLnJlbGVhc2VfaG9sZCcpO1xuICAgIGNvbnN0IGZlYXR1cmUgPSB0aGlzLmZlYXR1cmVzLmdldChpbnB1dC5mZWF0dXJlSWQpO1xuICAgIGlmICghZmVhdHVyZSkgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoYHVua25vd24gZmVhdHVyZTogJHtpbnB1dC5mZWF0dXJlSWR9YCk7XG4gICAgZmVhdHVyZS5kaXNwYXRjaEhvbGQgPSBmYWxzZTtcbiAgICB0aGlzLmFwcGVuZCgnZmVhdHVyZScsIGZlYXR1cmUuaWQsICdmZWF0dXJlLmRpc3BhdGNoX2hvbGRfcmVsZWFzZWQnLCBpbnB1dC5hY3RvcklkLCB7fSk7XG4gICAgcmV0dXJuIHRoaXMuY29weUZlYXR1cmUoZmVhdHVyZSk7XG4gIH1cblxuICAvLyAtLSByZWNvbmNpbGlhdGlvbiAocm9hZG1hcCBcdTAwQTcxLjYsIEQ2OiBkZXRlY3Qtb25seSwgbmV2ZXIgbXV0YXRlcykgLS0tLS0tLS0tLS0tXG5cbiAgcmVjb25jaWxlKGlucHV0OiB7IGZpbGVzOiBBcnJheTx7IHdvcmtJdGVtSWQ6IHN0cmluZzsgZnJvbnRtYXR0ZXJTdGF0dXM6IHN0cmluZyB9PiB9KTogRGl2ZXJnZW5jZVJlcG9ydFtdIHtcbiAgICBjb25zdCByZXBvcnRzOiBEaXZlcmdlbmNlUmVwb3J0W10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IGZpbGUgb2YgaW5wdXQuZmlsZXMpIHtcbiAgICAgIGNvbnN0IGl0ZW0gPSB0aGlzLm11c3RHZXRJdGVtKGZpbGUud29ya0l0ZW1JZCk7XG4gICAgICAvLyBGaWxlcyB1bmRlciBhIGxpdmUgY2xhaW0gYXJlIGV4Y2x1ZGVkIFx1MjAxNCBwbGF5Ym9va3MgbGVnaXRpbWF0ZWx5IHdyaXRlXG4gICAgICAvLyBmcm9udG1hdHRlciBtaWQtcnVuIChcdTAwQTcxLjYpLlxuICAgICAgaWYgKHRoaXMubGl2ZUNsYWltKGl0ZW0uaWQpICE9PSBudWxsKSBjb250aW51ZTtcblxuICAgICAgY29uc3QgcmF3ID0gZmlsZS5mcm9udG1hdHRlclN0YXR1cy50cmltKCk7XG4gICAgICBpZiAocmF3ID09PSAnYmxvY2tlZCcpIHtcbiAgICAgICAgLy8gRDg6IG92ZXJsYXkgaW4gdGhlIERCIGFuZCBgc3RhdHVzOiBibG9ja2VkYCBpbiB0aGUgZmlsZSBhcmUgdGhlXG4gICAgICAgIC8vIHNhbWUgdHJ1dGguIEJsb2NrZWQtaW4tZmlsZSB3aXRoIE5PIG92ZXJsYXkgaXMgcmVhbCBkcmlmdC5cbiAgICAgICAgaWYgKGl0ZW0uYmxvY2tlZFJlYXNvbiAhPT0gbnVsbCkgY29udGludWU7XG4gICAgICAgIHJlcG9ydHMucHVzaCh7XG4gICAgICAgICAgd29ya0l0ZW1JZDogaXRlbS5pZCxcbiAgICAgICAgICBmaWxlU3RhdGU6IHJhdyxcbiAgICAgICAgICBkYlN0YXRlOiBpdGVtLnN0YXRlLFxuICAgICAgICAgIGtpbmQ6ICdjb25mbGljdCcsXG4gICAgICAgIH0pO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgY29uc3Qgbm9ybWFsaXplZCA9IExFR0FDWV9TVEFUVVNbcmF3XTtcbiAgICAgIGlmIChub3JtYWxpemVkID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmVwb3J0cy5wdXNoKHsgd29ya0l0ZW1JZDogaXRlbS5pZCwgZmlsZVN0YXRlOiByYXcsIGRiU3RhdGU6IGl0ZW0uc3RhdGUsIGtpbmQ6ICdjb25mbGljdCcgfSk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgaWYgKG5vcm1hbGl6ZWQgPT09IGl0ZW0uc3RhdGUpIGNvbnRpbnVlO1xuICAgICAgcmVwb3J0cy5wdXNoKHtcbiAgICAgICAgd29ya0l0ZW1JZDogaXRlbS5pZCxcbiAgICAgICAgZmlsZVN0YXRlOiByYXcsXG4gICAgICAgIGRiU3RhdGU6IGl0ZW0uc3RhdGUsXG4gICAgICAgIGtpbmQ6IFJBTktbbm9ybWFsaXplZF0gPiBSQU5LW2l0ZW0uc3RhdGVdID8gJ2ZpbGVfYWhlYWQnIDogJ2RiX2FoZWFkJyxcbiAgICAgIH0pO1xuICAgIH1cbiAgICByZXR1cm4gcmVwb3J0cztcbiAgfVxuXG4gIC8vIC0tIHF1ZXJpZXMgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgZ2V0V29ya0l0ZW0oaWQ6IHN0cmluZyk6IFdvcmtJdGVtIHtcbiAgICByZXR1cm4gdGhpcy5jb3B5SXRlbSh0aGlzLm11c3RHZXRJdGVtKGlkKSk7XG4gIH1cblxuICBnZXRGZWF0dXJlKGlkOiBzdHJpbmcpOiBGZWF0dXJlIHtcbiAgICBjb25zdCBmZWF0dXJlID0gdGhpcy5mZWF0dXJlcy5nZXQoaWQpO1xuICAgIGlmICghZmVhdHVyZSkgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoYHVua25vd24gZmVhdHVyZTogJHtpZH1gKTtcbiAgICByZXR1cm4gdGhpcy5jb3B5RmVhdHVyZShmZWF0dXJlKTtcbiAgfVxuXG4gIGxpc3RXb3JrSXRlbXMoZmlsdGVyPzogeyBzdGF0ZT86IFdvcmtJdGVtU3RhdGU7IGZlYXR1cmVJZD86IHN0cmluZzsgY2xhaW1hYmxlPzogYm9vbGVhbiB9KTogV29ya0l0ZW1bXSB7XG4gICAgcmV0dXJuIFsuLi50aGlzLndvcmtJdGVtcy52YWx1ZXMoKV1cbiAgICAgIC5maWx0ZXIoKGl0ZW0pID0+IHtcbiAgICAgICAgaWYgKGZpbHRlcj8uc3RhdGUgIT09IHVuZGVmaW5lZCAmJiBpdGVtLnN0YXRlICE9PSBmaWx0ZXIuc3RhdGUpIHJldHVybiBmYWxzZTtcbiAgICAgICAgaWYgKGZpbHRlcj8uZmVhdHVyZUlkICE9PSB1bmRlZmluZWQgJiYgaXRlbS5mZWF0dXJlSWQgIT09IGZpbHRlci5mZWF0dXJlSWQpIHJldHVybiBmYWxzZTtcbiAgICAgICAgaWYgKGZpbHRlcj8uY2xhaW1hYmxlID09PSB0cnVlICYmIHRoaXMubGl2ZUNsYWltKGl0ZW0uaWQpICE9PSBudWxsKSByZXR1cm4gZmFsc2U7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfSlcbiAgICAgIC5tYXAoKGl0ZW0pID0+IHRoaXMuY29weUl0ZW0oaXRlbSkpO1xuICB9XG5cbiAgZ2V0Q2xhaW1zKHdvcmtJdGVtSWQ6IHN0cmluZyk6IENsYWltW10ge1xuICAgIGNvbnN0IGl0ZW0gPSB0aGlzLm11c3RHZXRJdGVtKHdvcmtJdGVtSWQpO1xuICAgIHJldHVybiAodGhpcy5jbGFpbXNCeUl0ZW0uZ2V0KGl0ZW0uaWQpID8/IFtdKS5mbGF0TWFwKChjbGFpbUlkKSA9PiB7XG4gICAgICBjb25zdCBjbGFpbSA9IHRoaXMuY2xhaW1zLmdldChjbGFpbUlkKTtcbiAgICAgIHJldHVybiBjbGFpbSA/IFt0aGlzLmNvcHlDbGFpbShjbGFpbSldIDogW107XG4gICAgfSk7XG4gIH1cblxuICBldmVudHMoc3RyZWFtSWQ/OiBzdHJpbmcpOiBTcGluZUV2ZW50W10ge1xuICAgIGNvbnN0IHNvdXJjZSA9IHN0cmVhbUlkID09PSB1bmRlZmluZWQgPyB0aGlzLmV2ZW50TG9nIDogdGhpcy5ldmVudExvZy5maWx0ZXIoKGUpID0+IGUuc3RyZWFtSWQgPT09IHN0cmVhbUlkKTtcbiAgICByZXR1cm4gc291cmNlLm1hcCgoZXZlbnQpID0+ICh7IC4uLmV2ZW50LCBwYXlsb2FkOiB7IC4uLmV2ZW50LnBheWxvYWQgfSB9KSk7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUVuZ2luZSgpOiBTcGluZUVuZ2luZSB7XG4gIHJldHVybiBuZXcgRW5naW5lSW1wbCgpO1xufVxuIiwgIi8qKlxuICogRnJvemVuIGludGVudCByZWdpb24gZXh0cmFjdGlvbiArIHZlcnNpb25lZCBpbnRlbnQgaGFzaCAocm9hZG1hcCBcdTAwQTcxLjEpLlxuICpcbiAqIEJvdGggcmVhbC13b3JsZCB0YWdzIGFyZSByZWNvZ25pemVkOiBgPGludGVudC1jb250cmFjdD5gIChkZXYtYXV0b1xuICogc3BlYy10ZW1wbGF0ZS5tZCkgYW5kIGA8ZnJvemVuLWFmdGVyLWFwcHJvdmFsIC4uLj5gIChxdWljay1kZXZcbiAqIHNwZWMtdGVtcGxhdGUubWQpLiBIYXNoaW5nIGhhcHBlbnMgYWZ0ZXIgY2Fub25pY2FsaXphdGlvbiBzbyBsaW5lLWVuZGluZ1xuICogYW5kIHRyYWlsaW5nLXdoaXRlc3BhY2UgY2h1cm4gKENSTEYgZWRpdG9ycywgYXV0by1mb3JtYXR0ZXJzKSBuZXZlciBtb3Zlc1xuICogdGhlIGhhc2ggXHUyMDE0IG9ubHkgcmVhbCBpbnRlbnQgZHJpZnQgZG9lcyAodGVjaG5pY2FsLXJpc2sgcmV2aWV3OiBhbGFybVxuICogZmF0aWd1ZSBraWxscyB0aGUgbWVjaGFuaXNtKS5cbiAqL1xuaW1wb3J0IHsgY3JlYXRlSGFzaCB9IGZyb20gJ25vZGU6Y3J5cHRvJztcblxuaW1wb3J0IHsgSU5URU5UX0hBU0hfQUxHTyB9IGZyb20gJy4vdHlwZXMuanMnO1xuXG5jb25zdCBUQUdfUEFUVEVSTlMgPSBbXG4gIC88aW50ZW50LWNvbnRyYWN0PihbXFxzXFxTXSo/KTxcXC9pbnRlbnQtY29udHJhY3Q+LyxcbiAgLzxmcm96ZW4tYWZ0ZXItYXBwcm92YWxcXGJbXj5dKj4oW1xcc1xcU10qPyk8XFwvZnJvemVuLWFmdGVyLWFwcHJvdmFsPi8sXG5dO1xuXG5leHBvcnQgZnVuY3Rpb24gZXh0cmFjdEludGVudFJlZ2lvbihtYXJrZG93bjogc3RyaW5nKTogc3RyaW5nIHwgbnVsbCB7XG4gIGZvciAoY29uc3QgcGF0dGVybiBvZiBUQUdfUEFUVEVSTlMpIHtcbiAgICBjb25zdCBtYXRjaCA9IHBhdHRlcm4uZXhlYyhtYXJrZG93bik7XG4gICAgaWYgKG1hdGNoICE9PSBudWxsKSByZXR1cm4gbWF0Y2hbMV0gPz8gJyc7XG4gIH1cbiAgcmV0dXJuIG51bGw7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjYW5vbmljYWxpemVGb3JIYXNoKHRleHQ6IHN0cmluZyk6IHN0cmluZyB7XG4gIGNvbnN0IHVuaXhOZXdsaW5lcyA9IHRleHQucmVwbGFjZSgvXFxyXFxuL2csICdcXG4nKTtcbiAgY29uc3Qgc3RyaXBwZWQgPSB1bml4TmV3bGluZXNcbiAgICAuc3BsaXQoJ1xcbicpXG4gICAgLm1hcCgobGluZSkgPT4gbGluZS5yZXBsYWNlKC9bIFxcdF0rJC8sICcnKSlcbiAgICAuam9pbignXFxuJyk7XG4gIC8vIENvbGxhcHNlIHJ1bnMgb2YgMisgYmxhbmsgbGluZXMgdG8gYSBzaW5nbGUgYmxhbmsgbGluZTsgYSBzaW5nbGUgYmxhbmtcbiAgLy8gbGluZSBpcyBtZWFuaW5nZnVsIG1hcmtkb3duIGFuZCBwYXNzZXMgdGhyb3VnaCB1bnRvdWNoZWQuXG4gIHJldHVybiBzdHJpcHBlZC5yZXBsYWNlKC9cXG57Myx9L2csICdcXG5cXG4nKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNvbXB1dGVJbnRlbnRIYXNoKHJlZ2lvbjogc3RyaW5nKTogc3RyaW5nIHtcbiAgY29uc3QgZGlnZXN0ID0gY3JlYXRlSGFzaCgnc2hhMjU2JykudXBkYXRlKGNhbm9uaWNhbGl6ZUZvckhhc2gocmVnaW9uKSwgJ3V0ZjgnKS5kaWdlc3QoJ2hleCcpO1xuICByZXR1cm4gYCR7SU5URU5UX0hBU0hfQUxHT306JHtkaWdlc3R9YDtcbn1cbiIsICIvKipcbiAqIEBvYWhzL2NvcmUgXHUyMDE0IHB1YmxpYyBBUEkgb2YgdGhlIGRldGVybWluaXN0aWMgc3BpbmUgKFJ1bGVzIGxheWVyIGFzIGNvZGUpLlxuICpcbiAqIFRoZSBjb25mb3JtYW5jZSBzdWl0ZSBpbiB0ZXN0LyBpcyB0aGUgc3BlY2lmaWNhdGlvbjogaXQgd2FzIHdyaXR0ZW4gZmlyc3QsXG4gKiBmcm9tIHRoZSBwcm9zZSBydWxlcyBpbiB0aGUgQk1BRCBzb3VyY2UgYXMgYXJiaXRyYXRlZCBpbiBwcm9kdWN0LXJvYWRtYXAubWRcbiAqIFx1MDBBNzEgYW5kIHRlc3QvQ09ORk9STUFOQ0UubWQuIEltcGxlbWVudGF0aW9uIG1vZHVsZXM6XG4gKiAgLSB0eXBlcy50cyAgICAgICBcdTIwMTQgdm9jYWJ1bGFyeSwgZW50aXRpZXMsIGVycm9ycyAodGhlIGZpeGVkIHN1cmZhY2UpXG4gKiAgLSBlbmdpbmUudHMgICAgICBcdTIwMTQgaW4tbWVtb3J5IHJlZmVyZW5jZSBlbmdpbmUgKEZTTSwgY2xhaW1zLCBnYXRlcywgZXZlbnRzKVxuICogIC0gaW50ZW50LWhhc2gudHMgXHUyMDE0IGZyb3plbi1yZWdpb24gZXh0cmFjdGlvbiArIHZlcnNpb25lZCBjYW5vbmljYWxpemVkIGhhc2hcbiAqICAtIHN0b3JpZXMudHMgICAgIFx1MjAxNCBzdG9yaWVzLnlhbWwgcGFyc2luZyArIHZhbGlkaXR5IHJ1bGVzXG4gKlxuICogSW52YXJpYW50cyAocHJvZHVjdC1yb2FkbWFwLm1kIFx1MDBBNzAuMSwgbWFjaGluZS1jaGVja2VkIGluIENJKTpcbiAqICAtIE5vIExMTSBTREsgaW1wb3J0IGFueXdoZXJlIHVuZGVyIHBhY2thZ2VzL2NvcmUuXG4gKiAgLSBObyBjb2RlIHBhdGggb3V0c2lkZSBjb21tYW5kIGhhbmRsZXJzIHdyaXRlcyBwcm9qZWN0aW9ucy5cbiAqL1xuaW1wb3J0IHsgY3JlYXRlRW5naW5lIGFzIGNyZWF0ZU1lbW9yeUVuZ2luZSB9IGZyb20gJy4vZW5naW5lLmpzJztcbmltcG9ydCB0eXBlIHsgU3BpbmVFbmdpbmUgfSBmcm9tICcuL3R5cGVzLmpzJztcblxuZXhwb3J0ICogZnJvbSAnLi90eXBlcy5qcyc7XG5leHBvcnQgeyBleHRyYWN0SW50ZW50UmVnaW9uLCBjYW5vbmljYWxpemVGb3JIYXNoLCBjb21wdXRlSW50ZW50SGFzaCB9IGZyb20gJy4vaW50ZW50LWhhc2guanMnO1xuZXhwb3J0IHsgcGFyc2VTdG9yaWVzLCB0eXBlIFN0b3J5RW50cnkgfSBmcm9tICcuL3N0b3JpZXMuanMnO1xuXG4vKipcbiAqIEVuZ2luZSBmYWN0b3J5IGluZGlyZWN0aW9uOiB0aGUgY29uZm9ybWFuY2Ugc3VpdGUgYWx3YXlzIGNhbGxzXG4gKiBjcmVhdGVFbmdpbmUoKTsgYSBwZXJzaXN0ZW5jZSBwYWNrYWdlIChlLmcuIEBvYWhzL2RiKSByZWdpc3RlcnMgaXRzIG93blxuICogZmFjdG9yeSBpbiBhIHZpdGVzdCBzZXR1cCBmaWxlIHRvIHJ1biB0aGUgSURFTlRJQ0FMIHN1aXRlIGFnYWluc3QgUG9zdGdyZXNcbiAqIChzdG9yeSBcIjExXCI6IFwiY29uZm9ybWFuY2Ugc3VpdGUgcnVucyBhZ2FpbnN0IGJvdGggbWVtb3J5IGFuZCBQb3N0Z3Jlc1xuICogZW5naW5lc1wiKS4gRGVmYXVsdCBpcyB0aGUgaW4tbWVtb3J5IHJlZmVyZW5jZSBlbmdpbmUuXG4gKi9cbmxldCBlbmdpbmVGYWN0b3J5OiAoKSA9PiBTcGluZUVuZ2luZSA9IGNyZWF0ZU1lbW9yeUVuZ2luZTtcblxuZXhwb3J0IGZ1bmN0aW9uIHNldEVuZ2luZUZhY3RvcnkoZmFjdG9yeTogKCkgPT4gU3BpbmVFbmdpbmUpOiB2b2lkIHtcbiAgZW5naW5lRmFjdG9yeSA9IGZhY3Rvcnk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVFbmdpbmUoKTogU3BpbmVFbmdpbmUge1xuICByZXR1cm4gZW5naW5lRmFjdG9yeSgpO1xufVxuXG5leHBvcnQgeyBjcmVhdGVNZW1vcnlFbmdpbmUgfTtcbiIsICIvKipcbiAqIERyaXp6bGUgcGctY29yZSBzY2hlbWEgZm9yIHRoZSBvYWhzIHNwaW5lIChQaGFzZSAxIHN0b3J5IDExKS5cbiAqXG4gKiBEZXNpZ24gKHByb2R1Y3Qtcm9hZG1hcC5tZCBcdTAwQTcxLjMsIFx1MDBBNzEuNSBcdTIwMTQgXCJyYWNlcyBsb3NlIGJ5IGNvbnN0cmFpbnQsIG5vdCBieVxuICogYXBwbGljYXRpb24gbG9naWNcIik6XG4gKiAgLSBjbGFpbXM6IHBhcnRpYWwgdW5pcXVlIGluZGV4IE9OICh3b3JrX2l0ZW1faWQpIFdIRVJFIHJlbGVhc2VkID0gZmFsc2UgXHUyMDE0XG4gKiAgICB0aGUgc2Vjb25kIGNvbmN1cnJlbnQgY2xhaW0gbG9zZXMgYXQgdGhlIGNvbnN0cmFpbnQsIGxlYXZpbmcgbm8gcm93LlxuICogIC0gZXZlbnRzOiBVTklRVUUgKHN0cmVhbV9pZCwgc3RyZWFtX3NlcSkgZG91YmxlcyBhcyB0aGUgb3B0aW1pc3RpYyBsb2NrO1xuICogICAgZ2xvYmFsX3NlcSBpcyBhIHNlcmlhbCBpZGVudGl0eS5cbiAqICAtIHdvcmtfaXRlbXM6IHN0YXRlX3ZlcnNpb24gaW50IFx1MjAxNCBDQVMgdmlhIFVQREFURSAuLi4gV0hFUkUgc3RhdGVfdmVyc2lvbiA9ICRleHBlY3RlZC5cbiAqXG4gKiBIYW5kLW1haW50YWluZWQgdHdpbiBEREwgbGl2ZXMgaW4gc2NoZW1hLXNxbC50cyAocnVucyBvbiBQR2xpdGUgaW4gdGhlXG4gKiBjb25mb3JtYW5jZSBoYXJuZXNzKTsga2VlcCB0aGUgdHdvIGluIGxvY2tzdGVwLlxuICovXG5pbXBvcnQgeyBzcWwgfSBmcm9tICdkcml6emxlLW9ybSc7XG5pbXBvcnQge1xuICBiaWdpbnQsXG4gIGJvb2xlYW4sXG4gIGludGVnZXIsXG4gIGpzb25iLFxuICBwZ1RhYmxlLFxuICBwcmltYXJ5S2V5LFxuICBzZXJpYWwsXG4gIHRleHQsXG4gIHVuaXF1ZUluZGV4LFxufSBmcm9tICdkcml6emxlLW9ybS9wZy1jb3JlJztcblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBhY3RvcnMgXHUyMDE0IHVzZXJzLCBhZ2VudHMsIGFuZCB0aGUgcGVyLXdvcmtzcGFjZSBzeXN0ZW0gYWN0b3IgKHJvYWRtYXAgXHUwMEE3MS4yKVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5leHBvcnQgY29uc3QgYWN0b3JzID0gcGdUYWJsZSgnYWN0b3JzJywge1xuICBpZDogdGV4dCgnaWQnKS5wcmltYXJ5S2V5KCksXG4gIHR5cGU6IHRleHQoJ3R5cGUnKS5ub3ROdWxsKCksIC8vICd1c2VyJyB8ICdhZ2VudCcgfCAnc3lzdGVtJ1xuICBkaXNwbGF5TmFtZTogdGV4dCgnZGlzcGxheV9uYW1lJykubm90TnVsbCgpLFxuICAvKiogUGhhc2UgMiAocm9hZG1hcCBcdTAwQTczKTogJ2FkbWluJyB8ICdtZW1iZXInIHwgJ2F1ZGl0b3InIFx1MjAxNCBnYXRlZC13cml0ZSBhdXRob3JpdHkgKi9cbiAgZ292ZXJuYW5jZVJvbGU6IHRleHQoJ2dvdmVybmFuY2Vfcm9sZScpLm5vdE51bGwoKS5kZWZhdWx0KCdtZW1iZXInKSxcbn0pO1xuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIGdyYW50cyBcdTIwMTQgZmxhdCBQaGFzZS0xIHBlcm1pc3Npb24gc2V0IChzY29wZSBiZWNvbWVzIG1lYW5pbmdmdWwgaW4gUGhhc2UgMilcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuZXhwb3J0IGNvbnN0IGdyYW50cyA9IHBnVGFibGUoXG4gICdncmFudHMnLFxuICB7XG4gICAgYWN0b3JJZDogdGV4dCgnYWN0b3JfaWQnKS5ub3ROdWxsKCksXG4gICAgcGVybWlzc2lvbjogdGV4dCgncGVybWlzc2lvbicpLm5vdE51bGwoKSxcbiAgICBzY29wZTogdGV4dCgnc2NvcGUnKSxcbiAgfSxcbiAgKHQpID0+IFtwcmltYXJ5S2V5KHsgY29sdW1uczogW3QuYWN0b3JJZCwgdC5wZXJtaXNzaW9uXSB9KV0sXG4pO1xuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIHJvbGVfYXNzaWdubWVudHMgXHUyMDE0IGRlbGl2ZXJ5LXJvbGUgYnVuZGxlcyAoUGhhc2UgMiwgcm9hZG1hcCBcdTAwQTczKS4gQXNzaWdubWVudFxuLy8gZ3JhbnRzIHRoZSBidW5kbGU7IHJldm9jYXRpb24gZmxpcHMgYHJldm9rZWRgIChhdWRpdCBoaXN0b3J5IGlzIGtlcHQpLlxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5leHBvcnQgY29uc3Qgcm9sZUFzc2lnbm1lbnRzID0gcGdUYWJsZSgncm9sZV9hc3NpZ25tZW50cycsIHtcbiAgc2VxOiBzZXJpYWwoJ3NlcScpLnByaW1hcnlLZXkoKSxcbiAgYWN0b3JJZDogdGV4dCgnYWN0b3JfaWQnKS5ub3ROdWxsKCksXG4gIHJvbGVDb2RlOiB0ZXh0KCdyb2xlX2NvZGUnKS5ub3ROdWxsKCksXG4gIGdyYW50ZWRCeTogdGV4dCgnZ3JhbnRlZF9ieScpLm5vdE51bGwoKSxcbiAgcmV2b2tlZDogYm9vbGVhbigncmV2b2tlZCcpLm5vdE51bGwoKS5kZWZhdWx0KGZhbHNlKSxcbn0pO1xuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIHdvcmtzcGFjZV9zdGF0ZSBcdTIwMTQgdGhlIHNpbmdsZS1yb3cgcGxhbi9wb2xpY3kgcHJvamVjdGlvbiAoUGhhc2UgMiwgcm9hZG1hcFxuLy8gXHUwMEE3MykuIEV4YWN0bHkgb25lIHJvdyB3aXRoIGlkID0gJ3dvcmtzcGFjZSc7IHZlcnNpb25zIGJhY2sgYXV0aHouZXhwbGFpbi5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuZXhwb3J0IGNvbnN0IHdvcmtzcGFjZVN0YXRlID0gcGdUYWJsZSgnd29ya3NwYWNlX3N0YXRlJywge1xuICBpZDogdGV4dCgnaWQnKS5wcmltYXJ5S2V5KCksIC8vIGFsd2F5cyAnd29ya3NwYWNlJ1xuICBwbGFuOiB0ZXh0KCdwbGFuJykubm90TnVsbCgpLCAvLyAnZnJlZScgfCAndGVhbScgfCAnZW50ZXJwcmlzZSdcbiAgcGxhblZlcnNpb246IGludGVnZXIoJ3BsYW5fdmVyc2lvbicpLm5vdE51bGwoKS5kZWZhdWx0KDEpLFxuICBwb2xpY3k6IGpzb25iKCdwb2xpY3knKS4kdHlwZTxSZWNvcmQ8c3RyaW5nLCB1bmtub3duPj4oKS5ub3ROdWxsKCkuZGVmYXVsdChzcWxgJ3t9Jzo6anNvbmJgKSxcbiAgcG9saWN5VmVyc2lvbjogaW50ZWdlcigncG9saWN5X3ZlcnNpb24nKS5ub3ROdWxsKCkuZGVmYXVsdCgxKSxcbn0pO1xuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIGdhdGVfcG9saWNpZXMgXHUyMDE0IGdhdGUgZGVmaW5pdGlvbnMgYXMgREFUQSAoUGhhc2UgMiwgcm9hZG1hcCBcdTAwQTczKTpcbi8vIG1pbkFwcHJvdmFscyArIHJlcXVpcmVkQWN0b3JUeXBlcywga2V5ZWQgYnkgZ2F0ZSBjb2RlLlxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5leHBvcnQgY29uc3QgZ2F0ZVBvbGljaWVzID0gcGdUYWJsZSgnZ2F0ZV9wb2xpY2llcycsIHtcbiAgZ2F0ZTogdGV4dCgnZ2F0ZScpLnByaW1hcnlLZXkoKSwgLy8gJ3NwZWNfYXBwcm92YWwnIHwgJ3Jldmlld19hcHByb3ZhbCdcbiAgcG9saWN5OiBqc29uYigncG9saWN5JykuJHR5cGU8UmVjb3JkPHN0cmluZywgdW5rbm93bj4+KCkubm90TnVsbCgpLFxufSk7XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gZmVhdHVyZXMgXHUyMDE0IGVwaWMtbGV2ZWwgcHJvamVjdGlvbiAoc3RhdGUgKyBkb25lX2NoZWNrcG9pbnQgZGlzcGF0Y2ggaG9sZClcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuZXhwb3J0IGNvbnN0IGZlYXR1cmVzID0gcGdUYWJsZSgnZmVhdHVyZXMnLCB7XG4gIGlkOiB0ZXh0KCdpZCcpLnByaW1hcnlLZXkoKSxcbiAgc2VxOiBzZXJpYWwoJ3NlcScpLm5vdE51bGwoKSxcbiAgc3RhdGU6IHRleHQoJ3N0YXRlJykubm90TnVsbCgpLCAvLyAnYmFja2xvZycgfCAnaW5fcHJvZ3Jlc3MnIHwgJ2RvbmUnXG4gIGRpc3BhdGNoSG9sZDogYm9vbGVhbignZGlzcGF0Y2hfaG9sZCcpLm5vdE51bGwoKS5kZWZhdWx0KGZhbHNlKSxcbn0pO1xuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIHdvcmtfaXRlbXMgXHUyMDE0IHRoZSB1bmlmaWVkIHdvcmstaXRlbSBtb2RlbCAocm9hZG1hcCBcdTAwQTcxLjEpXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbmV4cG9ydCBjb25zdCB3b3JrSXRlbXMgPSBwZ1RhYmxlKCd3b3JrX2l0ZW1zJywge1xuICBpZDogdGV4dCgnaWQnKS5wcmltYXJ5S2V5KCksXG4gIC8qKiBjcmVhdGlvbiBvcmRlciBcdTIwMTQgYmFja3MgZmlyc3Qtd3JpdGVyLXdpbnMgZXh0ZXJuYWxLZXkgcmVzb2x1dGlvbiAqL1xuICBzZXE6IHNlcmlhbCgnc2VxJykubm90TnVsbCgpLFxuICBmZWF0dXJlSWQ6IHRleHQoJ2ZlYXR1cmVfaWQnKS5ub3ROdWxsKCksXG4gIGV4dGVybmFsS2V5OiB0ZXh0KCdleHRlcm5hbF9rZXknKS5ub3ROdWxsKCksXG4gIHRpdGxlOiB0ZXh0KCd0aXRsZScpLm5vdE51bGwoKSxcbiAgc3RhdGU6IHRleHQoJ3N0YXRlJykubm90TnVsbCgpLFxuICBibG9ja2VkUmVhc29uOiB0ZXh0KCdibG9ja2VkX3JlYXNvbicpLCAvLyBvdmVybGF5LCBub3QgYSBzdGF0ZSAoRDgpXG4gIHJldmlld0xvb3BJdGVyYXRpb246IGludGVnZXIoJ3Jldmlld19sb29wX2l0ZXJhdGlvbicpLm5vdE51bGwoKS5kZWZhdWx0KDApLFxuICBpbnRlbnRIYXNoOiB0ZXh0KCdpbnRlbnRfaGFzaCcpLFxuICBwaW5uZWRWZXJpZmljYXRpb246IGpzb25iKCdwaW5uZWRfdmVyaWZpY2F0aW9uJykuJHR5cGU8c3RyaW5nW10+KCksIC8vIFJ1bGVzLWxheWVyIGRhdGEgKEQ3KVxuICBzcGVjQ2hlY2twb2ludDogYm9vbGVhbignc3BlY19jaGVja3BvaW50Jykubm90TnVsbCgpLmRlZmF1bHQoZmFsc2UpLFxuICBkb25lQ2hlY2twb2ludDogYm9vbGVhbignZG9uZV9jaGVja3BvaW50Jykubm90TnVsbCgpLmRlZmF1bHQoZmFsc2UpLFxuICBpbnZva2VEZXZXaXRoOiB0ZXh0KCdpbnZva2VfZGV2X3dpdGgnKS5ub3ROdWxsKCkuZGVmYXVsdCgnJyksXG4gIHNwZWNQYXRoOiB0ZXh0KCdzcGVjX3BhdGgnKS5ub3ROdWxsKCksXG4gIC8qKiBvcHRpbWlzdGljIGNvbmN1cnJlbmN5OiBDQVMgYnkgVVBEQVRFIC4uLiBXSEVSRSBzdGF0ZV92ZXJzaW9uID0gZXhwZWN0ZWQgKi9cbiAgc3RhdGVWZXJzaW9uOiBpbnRlZ2VyKCdzdGF0ZV92ZXJzaW9uJykubm90TnVsbCgpLmRlZmF1bHQoMCksXG4gIC8qKiBkZXBlbmRlbmN5IGV4dGVybmFsS2V5cyB3aXRoaW4gdGhlIHNhbWUgZmVhdHVyZSAqL1xuICBkZXBlbmRzT246IGpzb25iKCdkZXBlbmRzX29uJykuJHR5cGU8c3RyaW5nW10+KCkubm90TnVsbCgpLmRlZmF1bHQoc3FsYCdbXSc6Ompzb25iYCksXG4gIC8qKiBtb25vdG9uaWMgZmVuY2luZyBjb3VudGVyIHBlciB3b3JrIGl0ZW0gKHJvYWRtYXAgXHUwMEE3MS4zKSAqL1xuICBsYXN0RmVuY2luZ1Rva2VuOiBpbnRlZ2VyKCdsYXN0X2ZlbmNpbmdfdG9rZW4nKS5ub3ROdWxsKCkuZGVmYXVsdCgwKSxcbn0pO1xuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIGNsYWltcyBcdTIwMTQgbGVhc2VzICsgZmVuY2luZyB0b2tlbnM7IE9ORSBsaXZlIGNsYWltIHBlciBpdGVtIEJZIENPTlNUUkFJTlRcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuZXhwb3J0IGNvbnN0IGNsYWltcyA9IHBnVGFibGUoXG4gICdjbGFpbXMnLFxuICB7XG4gICAgaWQ6IHRleHQoJ2lkJykucHJpbWFyeUtleSgpLFxuICAgIHNlcTogc2VyaWFsKCdzZXEnKS5ub3ROdWxsKCksXG4gICAgd29ya0l0ZW1JZDogdGV4dCgnd29ya19pdGVtX2lkJykubm90TnVsbCgpLFxuICAgIGFjdG9ySWQ6IHRleHQoJ2FjdG9yX2lkJykubm90TnVsbCgpLFxuICAgIGZlbmNpbmdUb2tlbjogaW50ZWdlcignZmVuY2luZ190b2tlbicpLm5vdE51bGwoKSxcbiAgICAvKiogZW5naW5lLWNsb2NrIG1pbGxpc2Vjb25kcyAoSlMgZmllbGQgYG5vd2ApLCBuZXZlciBTUUwgbm93KCkgKi9cbiAgICBsZWFzZUV4cGlyZXNBdDogYmlnaW50KCdsZWFzZV9leHBpcmVzX2F0JywgeyBtb2RlOiAnbnVtYmVyJyB9KS5ub3ROdWxsKCksXG4gICAgcmVsZWFzZWQ6IGJvb2xlYW4oJ3JlbGVhc2VkJykubm90TnVsbCgpLmRlZmF1bHQoZmFsc2UpLFxuICAgIHR0bE1zOiBiaWdpbnQoJ3R0bF9tcycsIHsgbW9kZTogJ251bWJlcicgfSkubm90TnVsbCgpLFxuICB9LFxuICAodCkgPT4gW1xuICAgIC8vIHJvYWRtYXAgXHUwMEE3MS4zOiBcIk9uZSBsaXZlIGNsYWltIHBlciB3b3JrIGl0ZW0sIGVuZm9yY2VkIGJ5IGEgcGFydGlhbFxuICAgIC8vIHVuaXF1ZSBpbmRleCBcdTIwMTQgcmFjZXMgbG9zZSBieSBjb25zdHJhaW50LCBub3QgYnkgYXBwbGljYXRpb24gbG9naWMuXCJcbiAgICB1bmlxdWVJbmRleCgnY2xhaW1zX29uZV9saXZlX3Blcl9pdGVtJykub24odC53b3JrSXRlbUlkKS53aGVyZShzcWxgcmVsZWFzZWQgPSBmYWxzZWApLFxuICBdLFxuKTtcblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBnYXRlX2RlY2lzaW9ucyBcdTIwMTQgcGVybWlzc2lvbiBzbmFwc2hvdCArIGRlY2lzaW9uIHJlY29yZCAocm9hZG1hcCBcdTAwQTcxLjQpXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbmV4cG9ydCBjb25zdCBnYXRlRGVjaXNpb25zID0gcGdUYWJsZSgnZ2F0ZV9kZWNpc2lvbnMnLCB7XG4gIHNlcTogc2VyaWFsKCdzZXEnKS5wcmltYXJ5S2V5KCksXG4gIHdvcmtJdGVtSWQ6IHRleHQoJ3dvcmtfaXRlbV9pZCcpLm5vdE51bGwoKSxcbiAgZ2F0ZTogdGV4dCgnZ2F0ZScpLm5vdE51bGwoKSwgLy8gJ3NwZWNfYXBwcm92YWwnIHwgJ3Jldmlld19hcHByb3ZhbCdcbiAgZGVjaXNpb246IHRleHQoJ2RlY2lzaW9uJykubm90TnVsbCgpLCAvLyAnYXBwcm92ZWQnIHwgJ3JlamVjdGVkJ1xuICBhY3RvcklkOiB0ZXh0KCdhY3Rvcl9pZCcpLm5vdE51bGwoKSxcbiAgLyoqIHJldmlldyByb3VuZCB0aGUgZGVjaXNpb24gYmVsb25ncyB0byAoPSByZXZpZXdfbG9vcF9pdGVyYXRpb24gYXQgZGVjaXNpb24gdGltZSkgKi9cbiAgcm91bmQ6IGludGVnZXIoJ3JvdW5kJykubm90TnVsbCgpLmRlZmF1bHQoMCksXG59KTtcblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBldmlkZW5jZSBcdTIwMTQgbWFjaGluZS1jb2xsZWN0ZWQgZmFjdHM7IHNlcSBvcmRlcnMgXCJsYXRlc3RcIiBzZW1hbnRpY3Ncbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuZXhwb3J0IGNvbnN0IGV2aWRlbmNlID0gcGdUYWJsZSgnZXZpZGVuY2UnLCB7XG4gIHNlcTogc2VyaWFsKCdzZXEnKS5wcmltYXJ5S2V5KCksXG4gIHdvcmtJdGVtSWQ6IHRleHQoJ3dvcmtfaXRlbV9pZCcpLm5vdE51bGwoKSxcbiAga2luZDogdGV4dCgna2luZCcpLm5vdE51bGwoKSxcbiAgcGF5bG9hZDoganNvbmIoJ3BheWxvYWQnKS4kdHlwZTxSZWNvcmQ8c3RyaW5nLCB1bmtub3duPj4oKS5ub3ROdWxsKCksXG59KTtcblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBldmVudHMgXHUyMDE0IGFwcGVuZC1vbmx5IGxvZywgc2FtZS10cmFuc2FjdGlvbiBhcyBwcm9qZWN0aW9ucyAocm9hZG1hcCBcdTAwQTcxLjUpXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbmV4cG9ydCBjb25zdCBldmVudHMgPSBwZ1RhYmxlKFxuICAnZXZlbnRzJyxcbiAge1xuICAgIGdsb2JhbFNlcTogc2VyaWFsKCdnbG9iYWxfc2VxJykucHJpbWFyeUtleSgpLFxuICAgIHN0cmVhbVR5cGU6IHRleHQoJ3N0cmVhbV90eXBlJykubm90TnVsbCgpLCAvLyAnd29ya3NwYWNlJ3wnZmVhdHVyZSd8J3dvcmtfaXRlbSd8J2FjdG9yJ1xuICAgIHN0cmVhbUlkOiB0ZXh0KCdzdHJlYW1faWQnKS5ub3ROdWxsKCksXG4gICAgc3RyZWFtU2VxOiBpbnRlZ2VyKCdzdHJlYW1fc2VxJykubm90TnVsbCgpLFxuICAgIHR5cGU6IHRleHQoJ3R5cGUnKS5ub3ROdWxsKCksXG4gICAgYWN0b3JJZDogdGV4dCgnYWN0b3JfaWQnKS5ub3ROdWxsKCksXG4gICAgcGF5bG9hZDoganNvbmIoJ3BheWxvYWQnKS4kdHlwZTxSZWNvcmQ8c3RyaW5nLCB1bmtub3duPj4oKS5ub3ROdWxsKCksXG4gICAgY2F1c2F0aW9uSWQ6IHRleHQoJ2NhdXNhdGlvbl9pZCcpLFxuICAgIGlkZW1wb3RlbmN5S2V5OiB0ZXh0KCdpZGVtcG90ZW5jeV9rZXknKSxcbiAgfSxcbiAgKHQpID0+IFtcbiAgICAvLyBcdTAwQTcxLjU6IFwiVU5JUVVFKHN0cmVhbV9pZCwgc3RyZWFtX3NlcSkgZG91YmxlcyBhcyB0aGUgb3B0aW1pc3RpYyBsb2NrLlwiXG4gICAgdW5pcXVlSW5kZXgoJ2V2ZW50c19zdHJlYW1faWRfc3RyZWFtX3NlcScpLm9uKHQuc3RyZWFtSWQsIHQuc3RyZWFtU2VxKSxcbiAgXSxcbik7XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gaWRlbXBvdGVuY3lfa2V5cyBcdTIwMTQga2V5ZWQgcmVwbGF5IHJldHVybnMgdGhlIHJlY29yZGVkIHJlc3VsdCwgYXBwZW5kcyBub3RoaW5nXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbmV4cG9ydCBjb25zdCBpZGVtcG90ZW5jeUtleXMgPSBwZ1RhYmxlKCdpZGVtcG90ZW5jeV9rZXlzJywge1xuICBrZXk6IHRleHQoJ2tleScpLnByaW1hcnlLZXkoKSxcbiAgcmVzdWx0OiBqc29uYigncmVzdWx0JykuJHR5cGU8UmVjb3JkPHN0cmluZywgdW5rbm93bj4+KCkubm90TnVsbCgpLFxufSk7XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gdGhyZWFkcyBcdTIwMTQgdGhlIGNoYXQgU1VSRkFDRSAoUGhhc2UgMywgcm9hZG1hcCBcdTAwQTc1LjMpLiBwYXJ0aWNpcGFudHMgaXMganNvbmI6XG4vLyBlbmZvcmNlZCBmb3IgcHJpdmF0ZSB0aHJlYWRzLCBpbmZvcm1hdGlvbmFsIGZvciBvcGVuIG9uZXMuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbmV4cG9ydCBjb25zdCB0aHJlYWRzID0gcGdUYWJsZSgndGhyZWFkcycsIHtcbiAgaWQ6IHRleHQoJ2lkJykucHJpbWFyeUtleSgpLFxuICBzZXE6IHNlcmlhbCgnc2VxJykubm90TnVsbCgpLFxuICBmZWF0dXJlSWQ6IHRleHQoJ2ZlYXR1cmVfaWQnKSxcbiAgd29ya0l0ZW1JZDogdGV4dCgnd29ya19pdGVtX2lkJyksXG4gIGtpbmQ6IHRleHQoJ2tpbmQnKS5ub3ROdWxsKCksIC8vICdzcGVjJyB8ICdkZXNpZ24nIHwgJ3Rhc2snIHwgJ2dlbmVyYWwnIHwgJ3ByaXZhdGUnXG4gIHZpc2liaWxpdHk6IHRleHQoJ3Zpc2liaWxpdHknKS5ub3ROdWxsKCksIC8vICdvcGVuJyB8ICdwcml2YXRlJ1xuICBjcmVhdGVkQnk6IHRleHQoJ2NyZWF0ZWRfYnknKS5ub3ROdWxsKCksXG4gIHBhcnRpY2lwYW50czoganNvbmIoJ3BhcnRpY2lwYW50cycpLiR0eXBlPHN0cmluZ1tdPigpLm5vdE51bGwoKS5kZWZhdWx0KHNxbGAnW10nOjpqc29uYmApLFxufSk7XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gbWVzc2FnZXMgXHUyMDE0IG9uZSBjb2x1bW4sIG9uZSB0YWJsZSBmb3IgdXNlciBBTkQgYWdlbnQgYXV0aG9ycyAoXHUwMEE3NS4zKTtcbi8vIFVOSVFVRSh0aHJlYWRfaWQsIHNlcSkga2VlcHMgdGhlIHBlci10aHJlYWQgc2VxdWVuY2UgZ2FwLWZyZWUgYnkgY29uc3RyYWludC5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuZXhwb3J0IGNvbnN0IG1lc3NhZ2VzID0gcGdUYWJsZShcbiAgJ21lc3NhZ2VzJyxcbiAge1xuICAgIGlkOiB0ZXh0KCdpZCcpLnByaW1hcnlLZXkoKSxcbiAgICB0aHJlYWRJZDogdGV4dCgndGhyZWFkX2lkJykubm90TnVsbCgpLFxuICAgIHNlcTogaW50ZWdlcignc2VxJykubm90TnVsbCgpLCAvLyBwZXItdGhyZWFkLCAxLWJhc2VkLCBnYXAtZnJlZVxuICAgIGF1dGhvcklkOiB0ZXh0KCdhdXRob3JfaWQnKS5ub3ROdWxsKCksXG4gICAga2luZDogdGV4dCgna2luZCcpLm5vdE51bGwoKSwgLy8gJ2NoYXQnIHwgJ3N5c3RlbSdcbiAgICBib2R5OiB0ZXh0KCdib2R5Jykubm90TnVsbCgpLFxuICAgIHJlcGx5VG86IHRleHQoJ3JlcGx5X3RvJyksXG4gIH0sXG4gICh0KSA9PiBbdW5pcXVlSW5kZXgoJ21lc3NhZ2VzX3RocmVhZF9pZF9zZXEnKS5vbih0LnRocmVhZElkLCB0LnNlcSldLFxuKTtcblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBtZW50aW9ucyBcdTIwMTQgU1RSVUNUVVJFRCBtZW50aW9uIHJlY29yZHMgKyB0aGUgcm91dGVyJ3MgcmVjb3JkZWQgcmVzb2x1dGlvblxuLy8gKFx1MDBBNzUuNCkuIFRoZSBzZXJ2ZXIgbmV2ZXIgcGFyc2VzIG1lc3NhZ2UgYm9kaWVzLlxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5leHBvcnQgY29uc3QgbWVudGlvbnMgPSBwZ1RhYmxlKCdtZW50aW9ucycsIHtcbiAgc2VxOiBzZXJpYWwoJ3NlcScpLnByaW1hcnlLZXkoKSxcbiAgbWVzc2FnZUlkOiB0ZXh0KCdtZXNzYWdlX2lkJykubm90TnVsbCgpLFxuICBtZW50aW9uZWRBY3RvcklkOiB0ZXh0KCdtZW50aW9uZWRfYWN0b3JfaWQnKS5ub3ROdWxsKCksXG4gIHJlc29sdXRpb246IHRleHQoJ3Jlc29sdXRpb24nKS5ub3ROdWxsKCksIC8vICdub3RpZmllZCd8J2pvYl9jcmVhdGVkJ3wnZGVuaWVkX3BvbGljeSd8J2RlbmllZF9kZXB0aCdcbn0pO1xuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIG5vdGlmaWNhdGlvbnMgXHUyMDE0IG1lbnRpb24vam9iLWNvbXBsZXRpb24gaW5ib3ggcm93cyAoXHUwMEE3NS40KVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5leHBvcnQgY29uc3Qgbm90aWZpY2F0aW9ucyA9IHBnVGFibGUoJ25vdGlmaWNhdGlvbnMnLCB7XG4gIGlkOiB0ZXh0KCdpZCcpLnByaW1hcnlLZXkoKSxcbiAgc2VxOiBzZXJpYWwoJ3NlcScpLm5vdE51bGwoKSxcbiAgYWN0b3JJZDogdGV4dCgnYWN0b3JfaWQnKS5ub3ROdWxsKCksXG4gIHNvdXJjZTogdGV4dCgnc291cmNlJykubm90TnVsbCgpLCAvLyAnbWVudGlvbicgfCAnam9iX2NvbXBsZXRlZCdcbiAgcmVmSWQ6IHRleHQoJ3JlZl9pZCcpLm5vdE51bGwoKSwgLy8gbWVzc2FnZUlkIGZvciBtZW50aW9ucywgam9iSWQgZm9yIGNvbXBsZXRpb25zXG4gIHJlYWQ6IGJvb2xlYW4oJ3JlYWQnKS5ub3ROdWxsKCkuZGVmYXVsdChmYWxzZSksXG59KTtcblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBhZ2VudF9qb2JzIFx1MjAxNCByb3V0ZXItbWF0ZXJpYWxpemVkLCByZXBseS1vbmx5IGNvbnRleHQgKFx1MDBBNzUuNCk6IE5FVkVSIGEgY2xhaW0sXG4vLyBuZXZlciBsaWZlY3ljbGUgYXV0aG9yaXR5LiBkZXB0aCBjb3VudHMgYWdlbnQtbWVudGlvbi1hZ2VudCBob3BzLlxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5leHBvcnQgY29uc3QgYWdlbnRKb2JzID0gcGdUYWJsZSgnYWdlbnRfam9icycsIHtcbiAgaWQ6IHRleHQoJ2lkJykucHJpbWFyeUtleSgpLFxuICBzZXE6IHNlcmlhbCgnc2VxJykubm90TnVsbCgpLFxuICBhZ2VudEFjdG9ySWQ6IHRleHQoJ2FnZW50X2FjdG9yX2lkJykubm90TnVsbCgpLFxuICB0aHJlYWRJZDogdGV4dCgndGhyZWFkX2lkJykubm90TnVsbCgpLFxuICBtZXNzYWdlSWQ6IHRleHQoJ21lc3NhZ2VfaWQnKS5ub3ROdWxsKCksXG4gIHdvcmtJdGVtSWQ6IHRleHQoJ3dvcmtfaXRlbV9pZCcpLFxuICBmZWF0dXJlSWQ6IHRleHQoJ2ZlYXR1cmVfaWQnKSxcbiAgc3RhdHVzOiB0ZXh0KCdzdGF0dXMnKS5ub3ROdWxsKCksIC8vICdxdWV1ZWQnIHwgJ2RvbmUnIHwgJ2Jsb2NrZWQnXG4gIGRlcHRoOiBpbnRlZ2VyKCdkZXB0aCcpLm5vdE51bGwoKS5kZWZhdWx0KDApLFxuICBub3RlOiB0ZXh0KCdub3RlJyksXG59KTtcbiIsICIvKipcbiAqIFBnRW5naW5lIFx1MjAxNCBhc3luYyBQb3N0Z3JlcyBwb3J0IG9mIHRoZSBpbi1tZW1vcnkgcmVmZXJlbmNlIGVuZ2luZVxuICogKEBvYWhzL2NvcmUgc3JjL2VuZ2luZS50cykuIFNlbWFudGljcyBhcmUgYSBGQUlUSEZVTCBtaXJyb3IsIG1ldGhvZCBieVxuICogbWV0aG9kOiBzYW1lIGNoZWNrIG9yZGVyaW5nLCBzYW1lIGVycm9yIGNsYXNzZXMsIHNhbWUgZXZlbnQgdHlwZXMsIHNhbWVcbiAqIGNvbmZvcm1hbmNlIHBpbnMgKHNlZSBwYWNrYWdlcy9jb3JlL3Rlc3QvQ09ORk9STUFOQ0UubWQpLiBXaGVyZSB0aGVcbiAqIHJlZmVyZW5jZSB1c2VkIGluLXByb2Nlc3MgZGF0YSBzdHJ1Y3R1cmVzLCB0aGlzIGVuZ2luZSB1c2VzIHRoZSBEcml6emxlXG4gKiBzY2hlbWEgaW4gc2NoZW1hLnRzIGFuZCBsZXRzIGNvbnN0cmFpbnRzIGRvIHRoZSByYWNpbmcgKHJvYWRtYXAgXHUwMEE3MS4zXG4gKiBcInJhY2VzIGxvc2UgYnkgY29uc3RyYWludCwgbm90IGJ5IGFwcGxpY2F0aW9uIGxvZ2ljXCIpLlxuICpcbiAqIFRlY2huaWNhbCBub3RlczpcbiAqICAtIFRoZSBlbmdpbmUgY2xvY2sgaXMgdGhlIEpTIGZpZWxkIGBub3dgIChhZHZhbmNlQ2xvY2sgYWRkcyB0byBpdCk7IGxlYXNlXG4gKiAgICBjb21wYXJpc29ucyBhbHdheXMgdXNlIHRoaXMubm93LCBuZXZlciBTUUwgbm93KCkuXG4gKiAgLSBFdmVyeSBjb21tYW5kJ3Mgd3JpdGVzIGhhcHBlbiBpbiBPTkUgZGIudHJhbnNhY3Rpb24gKGV2ZW50IGFwcGVuZCArXG4gKiAgICBwcm9qZWN0aW9uIHVwZGF0ZSB0b2dldGhlciBcdTIwMTQgcm9hZG1hcCBcdTAwQTcxLjUpLiBUaGUgc2luZ2xlIGRlbGliZXJhdGVcbiAqICAgIGV4Y2VwdGlvbjogdGhlIGZlbmNpbmcucmVqZWN0ZWQgQVVESVQgZXZlbnQgY29tbWl0cyBpbiBpdHMgb3duXG4gKiAgICB0cmFuc2FjdGlvbiwgYmVjYXVzZSB0aGUgY29tbWFuZCBpdCBiZWxvbmdzIHRvIGZhaWxzIHdpdGggQ29uZmxpY3RFcnJvclxuICogICAgYW5kIG11c3QgbGVhdmUgdGhlIHByb2plY3Rpb24gdW50b3VjaGVkIHdoaWxlIHRoZSByZWZ1c2FsIGlzIHJlY29yZGVkXG4gKiAgICAoXHUwMEE3MS4zIFwiYSBzdGFsZSB0b2tlbiBnZXRzIDQwOSBhbmQgYW4gYXVkaXQgZXZlbnRcIikuXG4gKiAgLSBBbGwgcmV0dXJuZWQgdmFsdWVzIGFyZSBzdHJ1Y3R1cmVkLWNsb25lLWFibGUgcGxhaW4gb2JqZWN0cyAobnVtYmVyXG4gKiAgICB0aW1lc3RhbXBzLCBubyBEYXRlLCBubyB1bmRlZmluZWQgYXJyYXkgaG9sZXMpIHNvIHRoZXkgY3Jvc3MgdGhlXG4gKiAgICBzeW5ja2l0IHdvcmtlciBib3VuZGFyeSBpbnRhY3QuXG4gKi9cbmltcG9ydCB7IGFuZCwgYXNjLCBlcSwgZ3QsIGx0ZSwgc3FsIH0gZnJvbSAnZHJpenpsZS1vcm0nO1xuaW1wb3J0IHR5cGUgeyBQZ2xpdGVEYXRhYmFzZSB9IGZyb20gJ2RyaXp6bGUtb3JtL3BnbGl0ZSc7XG5cbmltcG9ydCB7XG4gIEFHRU5UX0dBVEVfQVBQUk9WRV9QRVJNSVNTSU9OUyxcbiAgQUdFTlRfSk9CX01BWF9ERVBUSCxcbiAgQkxPQ0tFRF9SRUFTT05TLFxuICBDb25mbGljdEVycm9yLFxuICBERUZBVUxUX1BMQU4sXG4gIERFTElWRVJZX1JPTEVTLFxuICBHdWFyZEZhaWxlZEVycm9yLFxuICBJbnZhbGlkVHJhbnNpdGlvbkVycm9yLFxuICBQZXJtaXNzaW9uRGVuaWVkRXJyb3IsXG4gIFBMQU5fQ0VJTElOR1MsXG4gIFJFVklFV19MT09QX0xJTUlULFxuICBTdG9yaWVzVmFsaWRhdGlvbkVycm9yLFxuICBXT1JLX0lURU1fU1RBVEVTLFxuICBwYXJzZVN0b3JpZXMsXG4gIHR5cGUgQWN0b3IsXG4gIHR5cGUgQWN0b3JUeXBlLFxuICB0eXBlIEFkdmFuY2VJbnB1dCxcbiAgdHlwZSBBZ2VudEpvYixcbiAgdHlwZSBBdXRoekV4cGxhbmF0aW9uLFxuICB0eXBlIEJsb2NrZWRSZWFzb24sXG4gIHR5cGUgQ2xhaW0sXG4gIHR5cGUgQ3JlYXRlV29ya0l0ZW1JbnB1dCxcbiAgdHlwZSBEaXZlcmdlbmNlUmVwb3J0LFxuICB0eXBlIEV2aWRlbmNlLFxuICB0eXBlIEZlYXR1cmUsXG4gIHR5cGUgR2F0ZUNvZGUsXG4gIHR5cGUgR2F0ZURlY2lzaW9uSW5wdXQsXG4gIHR5cGUgR2F0ZVBvbGljeSxcbiAgdHlwZSBHb3Zlcm5hbmNlUm9sZSxcbiAgdHlwZSBNZW50aW9uLFxuICB0eXBlIE1lbnRpb25SZXNvbHV0aW9uLFxuICB0eXBlIE1lc3NhZ2UsXG4gIHR5cGUgTm90aWZpY2F0aW9uLFxuICB0eXBlIFBlcm1pc3Npb24sXG4gIHR5cGUgUGxhbkNvZGUsXG4gIHR5cGUgUm9sZUFzc2lnbm1lbnQsXG4gIHR5cGUgU3BpbmVFdmVudCxcbiAgdHlwZSBTdG9yaWVzSW1wb3J0UmVzdWx0LFxuICB0eXBlIFRocmVhZCxcbiAgdHlwZSBUaHJlYWRLaW5kLFxuICB0eXBlIFRocmVhZFZpc2liaWxpdHksXG4gIHR5cGUgV29ya0l0ZW0sXG4gIHR5cGUgV29ya0l0ZW1TdGF0ZSxcbiAgdHlwZSBXb3Jrc3BhY2VQb2xpY3ksXG59IGZyb20gJ0BvYWhzL2NvcmUnO1xuXG5pbXBvcnQge1xuICBhY3RvcnMsXG4gIGFnZW50Sm9icyxcbiAgY2xhaW1zLFxuICBldmlkZW5jZSBhcyBldmlkZW5jZVRhYmxlLFxuICBldmVudHMsXG4gIGZlYXR1cmVzLFxuICBnYXRlRGVjaXNpb25zLFxuICBnYXRlUG9saWNpZXMsXG4gIGdyYW50cyxcbiAgaWRlbXBvdGVuY3lLZXlzLFxuICBtZW50aW9ucyxcbiAgbWVzc2FnZXMsXG4gIG5vdGlmaWNhdGlvbnMsXG4gIHJvbGVBc3NpZ25tZW50cyxcbiAgdGhyZWFkcyxcbiAgd29ya0l0ZW1zLFxuICB3b3Jrc3BhY2VTdGF0ZSxcbn0gZnJvbSAnLi9zY2hlbWEuanMnO1xuXG50eXBlIERiID0gUGdsaXRlRGF0YWJhc2U8UmVjb3JkPHN0cmluZywgdW5rbm93bj4+O1xudHlwZSBUeCA9IFBhcmFtZXRlcnM8UGFyYW1ldGVyczxEYlsndHJhbnNhY3Rpb24nXT5bMF0+WzBdO1xuLyoqIEJvdGggdGhlIHJvb3QgZGF0YWJhc2UgYW5kIGEgdHJhbnNhY3Rpb24gZXhwb3NlIHRoZSBzYW1lIHF1ZXJ5IHN1cmZhY2UuICovXG50eXBlIFF1ZXJ5YWJsZSA9IERiIHwgVHg7XG5cbnR5cGUgV29ya0l0ZW1Sb3cgPSB0eXBlb2Ygd29ya0l0ZW1zLiRpbmZlclNlbGVjdDtcbnR5cGUgQ2xhaW1Sb3cgPSB0eXBlb2YgY2xhaW1zLiRpbmZlclNlbGVjdDtcbnR5cGUgRmVhdHVyZVJvdyA9IHR5cGVvZiBmZWF0dXJlcy4kaW5mZXJTZWxlY3Q7XG50eXBlIEV2ZW50Um93ID0gdHlwZW9mIGV2ZW50cy4kaW5mZXJTZWxlY3Q7XG50eXBlIEFjdG9yUm93ID0gdHlwZW9mIGFjdG9ycy4kaW5mZXJTZWxlY3Q7XG50eXBlIFdvcmtzcGFjZVN0YXRlUm93ID0gdHlwZW9mIHdvcmtzcGFjZVN0YXRlLiRpbmZlclNlbGVjdDtcbnR5cGUgVGhyZWFkUm93ID0gdHlwZW9mIHRocmVhZHMuJGluZmVyU2VsZWN0O1xudHlwZSBNZXNzYWdlUm93ID0gdHlwZW9mIG1lc3NhZ2VzLiRpbmZlclNlbGVjdDtcbnR5cGUgQWdlbnRKb2JSb3cgPSB0eXBlb2YgYWdlbnRKb2JzLiRpbmZlclNlbGVjdDtcblxuLyoqIFRoZSBzaW5nbGUgd29ya3NwYWNlX3N0YXRlIHJvdyBrZXkgKGFuZCB0aGUgd29ya3NwYWNlIGV2ZW50LXN0cmVhbSBpZCkuICovXG5jb25zdCBXT1JLU1BBQ0VfSUQgPSAnd29ya3NwYWNlJztcblxuY29uc3QgUkFOSzogUmVjb3JkPFdvcmtJdGVtU3RhdGUsIG51bWJlcj4gPSBPYmplY3QuZnJvbUVudHJpZXMoXG4gIFdPUktfSVRFTV9TVEFURVMubWFwKChzLCBpKSA9PiBbcywgaV0pLFxuKSBhcyBSZWNvcmQ8V29ya0l0ZW1TdGF0ZSwgbnVtYmVyPjtcblxuLyoqIE1pcnJvciBvZiB0aGUgcmVmZXJlbmNlIHRyYW5zaXRpb24gdGFibGUgKGVuZ2luZS50cykgXHUyMDE0IGRvIG5vdCBkaXZlcmdlLiAqL1xuaW50ZXJmYWNlIFRyYW5zaXRpb25SdWxlIHtcbiAgZnJvbTogV29ya0l0ZW1TdGF0ZTtcbiAgdG86IFdvcmtJdGVtU3RhdGU7XG4gIHBlcm1pc3Npb246IFBlcm1pc3Npb247XG4gIGNsYWltUmVxdWlyZWQ6IGJvb2xlYW47XG4gIGd1YXJkczogQXJyYXk8J2RlcHNfZG9uZScgfCAnc3BlY19nYXRlX2lmX2NoZWNrcG9pbnQnIHwgJ25vbmVtcHR5X2RpZmYnPjtcbn1cblxuY29uc3QgVFJBTlNJVElPTlM6IFRyYW5zaXRpb25SdWxlW10gPSBbXG4gIHsgZnJvbTogJ2JhY2tsb2cnLCB0bzogJ2RyYWZ0JywgcGVybWlzc2lvbjogJ3Rhc2sucGxhbicsIGNsYWltUmVxdWlyZWQ6IGZhbHNlLCBndWFyZHM6IFtdIH0sXG4gIHtcbiAgICBmcm9tOiAnZHJhZnQnLFxuICAgIHRvOiAncmVhZHlfZm9yX2RldicsXG4gICAgcGVybWlzc2lvbjogJ3Rhc2sucGxhbicsXG4gICAgY2xhaW1SZXF1aXJlZDogZmFsc2UsXG4gICAgZ3VhcmRzOiBbJ3NwZWNfZ2F0ZV9pZl9jaGVja3BvaW50J10sXG4gIH0sXG4gIHtcbiAgICBmcm9tOiAncmVhZHlfZm9yX2RldicsXG4gICAgdG86ICdpbl9wcm9ncmVzcycsXG4gICAgcGVybWlzc2lvbjogJ3Rhc2suYWR2YW5jZScsXG4gICAgY2xhaW1SZXF1aXJlZDogdHJ1ZSxcbiAgICBndWFyZHM6IFsnZGVwc19kb25lJ10sXG4gIH0sXG4gIHtcbiAgICBmcm9tOiAnaW5fcHJvZ3Jlc3MnLFxuICAgIHRvOiAnaW5fcmV2aWV3JyxcbiAgICBwZXJtaXNzaW9uOiAndGFzay5hZHZhbmNlJyxcbiAgICBjbGFpbVJlcXVpcmVkOiB0cnVlLFxuICAgIGd1YXJkczogWydub25lbXB0eV9kaWZmJ10sXG4gIH0sXG5dO1xuXG5jb25zdCBMRUdBQ1lfU1RBVFVTOiBSZWNvcmQ8c3RyaW5nLCBXb3JrSXRlbVN0YXRlPiA9IHtcbiAgYmFja2xvZzogJ2JhY2tsb2cnLFxuICBkcmFmdDogJ2RyYWZ0JyxcbiAgJ3JlYWR5LWZvci1kZXYnOiAncmVhZHlfZm9yX2RldicsXG4gIHJlYWR5X2Zvcl9kZXY6ICdyZWFkeV9mb3JfZGV2JyxcbiAgJ2luLXByb2dyZXNzJzogJ2luX3Byb2dyZXNzJyxcbiAgaW5fcHJvZ3Jlc3M6ICdpbl9wcm9ncmVzcycsXG4gICdpbi1yZXZpZXcnOiAnaW5fcmV2aWV3JyxcbiAgaW5fcmV2aWV3OiAnaW5fcmV2aWV3JyxcbiAgcmV2aWV3OiAnaW5fcmV2aWV3JyxcbiAgZG9uZTogJ2RvbmUnLFxufTtcblxuLyoqIFBvc3RncmVzIHVuaXF1ZS12aW9sYXRpb24gZGV0ZWN0b3IgKHdhbGtzIGRyaXp6bGUncyB3cmFwcGVkIGNhdXNlcykuICovXG5mdW5jdGlvbiBpc1VuaXF1ZVZpb2xhdGlvbihlcnJvcjogdW5rbm93bik6IGJvb2xlYW4ge1xuICBsZXQgY3VycmVudDogdW5rbm93biA9IGVycm9yO1xuICBmb3IgKGxldCBkZXB0aCA9IDA7IGRlcHRoIDwgNSAmJiBjdXJyZW50ICE9PSBudWxsICYmIHR5cGVvZiBjdXJyZW50ID09PSAnb2JqZWN0JzsgZGVwdGggKz0gMSkge1xuICAgIGNvbnN0IGVyciA9IGN1cnJlbnQgYXMgeyBjb2RlPzogdW5rbm93bjsgbWVzc2FnZT86IHVua25vd247IGNhdXNlPzogdW5rbm93biB9O1xuICAgIGlmIChlcnIuY29kZSA9PT0gJzIzNTA1JykgcmV0dXJuIHRydWU7XG4gICAgaWYgKHR5cGVvZiBlcnIubWVzc2FnZSA9PT0gJ3N0cmluZycgJiYgL2R1cGxpY2F0ZSBrZXkgdmFsdWUgdmlvbGF0ZXMgdW5pcXVlL2kudGVzdChlcnIubWVzc2FnZSkpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICBjdXJyZW50ID0gZXJyLmNhdXNlO1xuICB9XG4gIHJldHVybiBmYWxzZTtcbn1cblxuZXhwb3J0IGNsYXNzIFBnRW5naW5lIHtcbiAgLyoqIEVuZ2luZSBjbG9jayBpbiBtcyBcdTIwMTQgdGhlIE9OTFkgdGltZSBzb3VyY2UgZm9yIGxlYXNlIGxvZ2ljLiAqL1xuICBwcml2YXRlIG5vdyA9IDA7XG4gIHByaXZhdGUgc2VxID0gMDtcbiAgcHJpdmF0ZSBzeXN0ZW1BY3RvcklkID0gJyc7XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSByZWFkb25seSBkYjogRGIpIHt9XG5cbiAgLyoqXG4gICAqIFBvc3QtcmVzZXQgc2V0dXA6IHRoZSBwZXItd29ya3NwYWNlIHN5c3RlbSBhY3RvciAocm9hZG1hcCBcdTAwQTcxLjIpLlxuICAgKlxuICAgKiBJZGVtcG90ZW50IGZvciBwZXJzaXN0ZW50IGRhdGFiYXNlcyAoc3RvcnkgMTMsIGBvYWhzIHNlcnZlIC0tZGF0YWApOiBhXG4gICAqIHJlc3RhcnQgb3ZlciBhbiBleGlzdGluZyBQR2xpdGUgZGF0YSBkaXJlY3RvcnkgZmluZHMgdGhlIHN5c3RlbSBhY3RvclxuICAgKiBhbHJlYWR5IHByZXNlbnQsIHJldXNlcyBpdCwgYW5kIHJlY292ZXJzIHRoZSBpZCBjb3VudGVyIGZyb20gdGhlIHN0b3JlZFxuICAgKiBpZHMgc28gZnJlc2hseS1jcmVhdGVkIGVudGl0aWVzIG5ldmVyIGNvbGxpZGUgd2l0aCBwZXJzaXN0ZWQgb25lcy4gQVxuICAgKiBmcmVzaCAob3IgdHJ1bmNhdGVkKSBkYXRhYmFzZSB0YWtlcyB0aGUgb3JpZ2luYWwgcGF0aCB1bmNoYW5nZWQsIHNvIHRoZVxuICAgKiBjb25mb3JtYW5jZSBzdWl0ZSBzZW1hbnRpY3MgYXJlIHVudG91Y2hlZC5cbiAgICovXG4gIGFzeW5jIGluaXQoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgLy8gU2luZ2xlLXJvdyBwbGFuL3BvbGljeSBwcm9qZWN0aW9uIChQaGFzZSAyLCByb2FkbWFwIFx1MDBBNzMpLiBvbkNvbmZsaWN0RG9Ob3RoaW5nXG4gICAgLy8ga2VlcHMgdGhpcyBpZGVtcG90ZW50IGZvciBkdXJhYmxlIHJlc3RhcnRzIFx1MjAxNCBhbiBleGlzdGluZyBwbGFuIHN1cnZpdmVzLlxuICAgIGF3YWl0IHRoaXMuZGJcbiAgICAgIC5pbnNlcnQod29ya3NwYWNlU3RhdGUpXG4gICAgICAudmFsdWVzKHsgaWQ6IFdPUktTUEFDRV9JRCwgcGxhbjogREVGQVVMVF9QTEFOLCBwbGFuVmVyc2lvbjogMSwgcG9saWN5OiB7fSwgcG9saWN5VmVyc2lvbjogMSB9KVxuICAgICAgLm9uQ29uZmxpY3REb05vdGhpbmcoKTtcbiAgICBjb25zdCBleGlzdGluZyA9IGF3YWl0IHRoaXMuZGJcbiAgICAgIC5zZWxlY3QoeyBpZDogYWN0b3JzLmlkIH0pXG4gICAgICAuZnJvbShhY3RvcnMpXG4gICAgICAud2hlcmUoZXEoYWN0b3JzLnR5cGUsICdzeXN0ZW0nKSlcbiAgICAgIC5saW1pdCgxKTtcbiAgICBjb25zdCBmb3VuZCA9IGV4aXN0aW5nWzBdO1xuICAgIGlmIChmb3VuZCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aGlzLnN5c3RlbUFjdG9ySWQgPSBmb3VuZC5pZDtcbiAgICAgIHRoaXMuc2VxID0gYXdhaXQgdGhpcy5yZWNvdmVyU2VxKCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXMuc3lzdGVtQWN0b3JJZCA9IHRoaXMubmV4dElkKCdhY3Rvci1zeXN0ZW0nKTtcbiAgICBhd2FpdCB0aGlzLmRiLmluc2VydChhY3RvcnMpLnZhbHVlcyh7XG4gICAgICBpZDogdGhpcy5zeXN0ZW1BY3RvcklkLFxuICAgICAgdHlwZTogJ3N5c3RlbScsXG4gICAgICBkaXNwbGF5TmFtZTogJ3N5c3RlbScsXG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogTGFyZ2VzdCBuZXh0SWQoKSBzdWZmaXggc3RvcmVkIGluIGFueSB0ZXh0LWlkIHRhYmxlIFx1MjAxNCByZXN0YXJ0LXNhZmUgaWRcbiAgICogZ2VuZXJhdGlvbiBmb3IgcGVyc2lzdGVudCBkYXRhIGRpcmVjdG9yaWVzLiBJZHMgYXJlIGAke3ByZWZpeH1fJHtiYXNlMzZ9YC5cbiAgICovXG4gIHByaXZhdGUgYXN5bmMgcmVjb3ZlclNlcSgpOiBQcm9taXNlPG51bWJlcj4ge1xuICAgIGNvbnN0IGlkczogc3RyaW5nW10gPSBbXTtcbiAgICBpZHMucHVzaCguLi4oYXdhaXQgdGhpcy5kYi5zZWxlY3QoeyBpZDogYWN0b3JzLmlkIH0pLmZyb20oYWN0b3JzKSkubWFwKChyKSA9PiByLmlkKSk7XG4gICAgaWRzLnB1c2goLi4uKGF3YWl0IHRoaXMuZGIuc2VsZWN0KHsgaWQ6IGZlYXR1cmVzLmlkIH0pLmZyb20oZmVhdHVyZXMpKS5tYXAoKHIpID0+IHIuaWQpKTtcbiAgICBpZHMucHVzaCguLi4oYXdhaXQgdGhpcy5kYi5zZWxlY3QoeyBpZDogd29ya0l0ZW1zLmlkIH0pLmZyb20od29ya0l0ZW1zKSkubWFwKChyKSA9PiByLmlkKSk7XG4gICAgaWRzLnB1c2goLi4uKGF3YWl0IHRoaXMuZGIuc2VsZWN0KHsgaWQ6IGNsYWltcy5pZCB9KS5mcm9tKGNsYWltcykpLm1hcCgocikgPT4gci5pZCkpO1xuICAgIC8vIFBoYXNlIDMgKHJvYWRtYXAgXHUwMEE3NSk6IHRocmVhZHMvbWVzc2FnZXMvam9icy9ub3RpZmljYXRpb25zIGFyZSBkdXJhYmxlIHRvby5cbiAgICBpZHMucHVzaCguLi4oYXdhaXQgdGhpcy5kYi5zZWxlY3QoeyBpZDogdGhyZWFkcy5pZCB9KS5mcm9tKHRocmVhZHMpKS5tYXAoKHIpID0+IHIuaWQpKTtcbiAgICBpZHMucHVzaCguLi4oYXdhaXQgdGhpcy5kYi5zZWxlY3QoeyBpZDogbWVzc2FnZXMuaWQgfSkuZnJvbShtZXNzYWdlcykpLm1hcCgocikgPT4gci5pZCkpO1xuICAgIGlkcy5wdXNoKC4uLihhd2FpdCB0aGlzLmRiLnNlbGVjdCh7IGlkOiBhZ2VudEpvYnMuaWQgfSkuZnJvbShhZ2VudEpvYnMpKS5tYXAoKHIpID0+IHIuaWQpKTtcbiAgICBpZHMucHVzaCguLi4oYXdhaXQgdGhpcy5kYi5zZWxlY3QoeyBpZDogbm90aWZpY2F0aW9ucy5pZCB9KS5mcm9tKG5vdGlmaWNhdGlvbnMpKS5tYXAoKHIpID0+IHIuaWQpKTtcbiAgICBsZXQgbWF4ID0gMDtcbiAgICBmb3IgKGNvbnN0IGlkIG9mIGlkcykge1xuICAgICAgY29uc3Qgc2VwID0gaWQubGFzdEluZGV4T2YoJ18nKTtcbiAgICAgIGlmIChzZXAgPCAwKSBjb250aW51ZTtcbiAgICAgIGNvbnN0IG4gPSBOdW1iZXIucGFyc2VJbnQoaWQuc2xpY2Uoc2VwICsgMSksIDM2KTtcbiAgICAgIGlmIChOdW1iZXIuaXNGaW5pdGUobikgJiYgbiA+IG1heCkgbWF4ID0gbjtcbiAgICB9XG4gICAgcmV0dXJuIG1heDtcbiAgfVxuXG4gIC8vIC0tIGluZnJhc3RydWN0dXJlIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgcHJpdmF0ZSBuZXh0SWQocHJlZml4OiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIHRoaXMuc2VxICs9IDE7XG4gICAgcmV0dXJuIGAke3ByZWZpeH1fJHt0aGlzLnNlcS50b1N0cmluZygzNikucGFkU3RhcnQoNiwgJzAnKX1gO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBhcHBlbmRUeChcbiAgICB0eDogUXVlcnlhYmxlLFxuICAgIHN0cmVhbVR5cGU6IFNwaW5lRXZlbnRbJ3N0cmVhbVR5cGUnXSxcbiAgICBzdHJlYW1JZDogc3RyaW5nLFxuICAgIHR5cGU6IHN0cmluZyxcbiAgICBhY3RvcklkOiBzdHJpbmcsXG4gICAgcGF5bG9hZDogUmVjb3JkPHN0cmluZywgdW5rbm93bj4sXG4gICAgZXh0cmE/OiB7IGNhdXNhdGlvbklkPzogc3RyaW5nOyBpZGVtcG90ZW5jeUtleT86IHN0cmluZyB9LFxuICApOiBQcm9taXNlPFNwaW5lRXZlbnQ+IHtcbiAgICAvLyBzdHJlYW1fc2VxIGlzIDEtYmFzZWQgYW5kIGdhcC1mcmVlIHBlciBzdHJlYW0gKFx1MDBBNzEuNSk7IGNvbXB1dGVkIGluIHRoZVxuICAgIC8vIHNhbWUgdHJhbnNhY3Rpb24gYXMgdGhlIHByb2plY3Rpb24gdXBkYXRlLCBzbyBVTklRVUUoc3RyZWFtX2lkLFxuICAgIC8vIHN0cmVhbV9zZXEpIGRvdWJsZXMgYXMgdGhlIG9wdGltaXN0aWMgbG9jay5cbiAgICBjb25zdCBbcm93XSA9IGF3YWl0IHR4XG4gICAgICAuc2VsZWN0KHsgbWF4U2VxOiBzcWw8bnVtYmVyPmBjb2FsZXNjZShtYXgoJHtldmVudHMuc3RyZWFtU2VxfSksIDApYCB9KVxuICAgICAgLmZyb20oZXZlbnRzKVxuICAgICAgLndoZXJlKGVxKGV2ZW50cy5zdHJlYW1JZCwgc3RyZWFtSWQpKTtcbiAgICBjb25zdCBzdHJlYW1TZXEgPSBOdW1iZXIocm93Py5tYXhTZXEgPz8gMCkgKyAxO1xuICAgIGNvbnN0IGluc2VydGVkID0gYXdhaXQgdHhcbiAgICAgIC5pbnNlcnQoZXZlbnRzKVxuICAgICAgLnZhbHVlcyh7XG4gICAgICAgIHN0cmVhbVR5cGUsXG4gICAgICAgIHN0cmVhbUlkLFxuICAgICAgICBzdHJlYW1TZXEsXG4gICAgICAgIHR5cGUsXG4gICAgICAgIGFjdG9ySWQsXG4gICAgICAgIHBheWxvYWQsXG4gICAgICAgIGNhdXNhdGlvbklkOiBleHRyYT8uY2F1c2F0aW9uSWQgPz8gbnVsbCxcbiAgICAgICAgaWRlbXBvdGVuY3lLZXk6IGV4dHJhPy5pZGVtcG90ZW5jeUtleSA/PyBudWxsLFxuICAgICAgfSlcbiAgICAgIC5yZXR1cm5pbmcoeyBnbG9iYWxTZXE6IGV2ZW50cy5nbG9iYWxTZXEgfSk7XG4gICAgY29uc3QgZ2xvYmFsU2VxID0gaW5zZXJ0ZWRbMF0/Lmdsb2JhbFNlcTtcbiAgICBpZiAoZ2xvYmFsU2VxID09PSB1bmRlZmluZWQpIHRocm93IG5ldyBFcnJvcignZXZlbnQgaW5zZXJ0IHJldHVybmVkIG5vIGdsb2JhbF9zZXEnKTtcbiAgICByZXR1cm4ge1xuICAgICAgZ2xvYmFsU2VxLFxuICAgICAgc3RyZWFtVHlwZSxcbiAgICAgIHN0cmVhbUlkLFxuICAgICAgc3RyZWFtU2VxLFxuICAgICAgdHlwZSxcbiAgICAgIGFjdG9ySWQsXG4gICAgICBwYXlsb2FkLFxuICAgICAgLi4uKGV4dHJhPy5jYXVzYXRpb25JZCAhPT0gdW5kZWZpbmVkID8geyBjYXVzYXRpb25JZDogZXh0cmEuY2F1c2F0aW9uSWQgfSA6IHt9KSxcbiAgICB9O1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBtdXN0R2V0SXRlbSh3b3JrSXRlbUlkOiBzdHJpbmcpOiBQcm9taXNlPFdvcmtJdGVtUm93PiB7XG4gICAgY29uc3QgYnlJZCA9IGF3YWl0IHRoaXMuZGIuc2VsZWN0KCkuZnJvbSh3b3JrSXRlbXMpLndoZXJlKGVxKHdvcmtJdGVtcy5pZCwgd29ya0l0ZW1JZCkpLmxpbWl0KDEpO1xuICAgIGlmIChieUlkWzBdKSByZXR1cm4gYnlJZFswXTtcbiAgICAvLyBJbXBvcnRlZCBzdG9yaWVzIGFyZSBhZGRyZXNzZWQgYnkgdGhlaXIgZXh0ZXJuYWxLZXkgaGFuZGxlOyBmaXJzdFxuICAgIC8vIHdyaXRlciB3aW5zIFx1MjAxNCB0aGUgZWFybGllc3QtY3JlYXRlZCByb3cgcmVzb2x2ZXMgKGNvbmZvcm1hbmNlIHBpbiBpblxuICAgIC8vIHN0b3JpZXMtaW1wb3J0LnRlc3QudHMsIG1pcnJvcmVkIGZyb20gdGhlIHJlZmVyZW5jZSBleHRlcm5hbEtleUluZGV4KS5cbiAgICBjb25zdCBieUtleSA9IGF3YWl0IHRoaXMuZGJcbiAgICAgIC5zZWxlY3QoKVxuICAgICAgLmZyb20od29ya0l0ZW1zKVxuICAgICAgLndoZXJlKGVxKHdvcmtJdGVtcy5leHRlcm5hbEtleSwgd29ya0l0ZW1JZCkpXG4gICAgICAub3JkZXJCeShhc2Mod29ya0l0ZW1zLnNlcSkpXG4gICAgICAubGltaXQoMSk7XG4gICAgaWYgKGJ5S2V5WzBdKSByZXR1cm4gYnlLZXlbMF07XG4gICAgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoYHVua25vd24gd29yayBpdGVtOiAke3dvcmtJdGVtSWR9YCk7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIGdldEZlYXR1cmVSb3coZmVhdHVyZUlkOiBzdHJpbmcsIHR4OiBRdWVyeWFibGUgPSB0aGlzLmRiKTogUHJvbWlzZTxGZWF0dXJlUm93IHwgbnVsbD4ge1xuICAgIGNvbnN0IHJvd3MgPSBhd2FpdCB0eC5zZWxlY3QoKS5mcm9tKGZlYXR1cmVzKS53aGVyZShlcShmZWF0dXJlcy5pZCwgZmVhdHVyZUlkKSkubGltaXQoMSk7XG4gICAgcmV0dXJuIHJvd3NbMF0gPz8gbnVsbDtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgZ2V0QWN0b3JSb3coYWN0b3JJZDogc3RyaW5nLCB0eDogUXVlcnlhYmxlID0gdGhpcy5kYik6IFByb21pc2U8QWN0b3JSb3cgfCBudWxsPiB7XG4gICAgY29uc3Qgcm93cyA9IGF3YWl0IHR4LnNlbGVjdCgpLmZyb20oYWN0b3JzKS53aGVyZShlcShhY3RvcnMuaWQsIGFjdG9ySWQpKS5saW1pdCgxKTtcbiAgICByZXR1cm4gcm93c1swXSA/PyBudWxsO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyB3b3Jrc3BhY2VSb3codHg6IFF1ZXJ5YWJsZSA9IHRoaXMuZGIpOiBQcm9taXNlPFdvcmtzcGFjZVN0YXRlUm93PiB7XG4gICAgY29uc3Qgcm93cyA9IGF3YWl0IHR4LnNlbGVjdCgpLmZyb20od29ya3NwYWNlU3RhdGUpLndoZXJlKGVxKHdvcmtzcGFjZVN0YXRlLmlkLCBXT1JLU1BBQ0VfSUQpKS5saW1pdCgxKTtcbiAgICBjb25zdCByb3cgPSByb3dzWzBdO1xuICAgIGlmIChyb3cpIHJldHVybiByb3c7XG4gICAgLy8gaW5pdCgpIHNlZWRzIHRoZSByb3c7IHRoaXMgZGVmYXVsdCBvbmx5IGd1YXJkcyBhIG5vdC15ZXQtaW5pdGlhbGl6ZWQgcmVhZC5cbiAgICByZXR1cm4geyBpZDogV09SS1NQQUNFX0lELCBwbGFuOiBERUZBVUxUX1BMQU4sIHBsYW5WZXJzaW9uOiAxLCBwb2xpY3k6IHt9LCBwb2xpY3lWZXJzaW9uOiAxIH07XG4gIH1cblxuICAvKipcbiAgICogRW50aXRsZW1lbnQgcmVzb2x1dGlvbiBcdTIwMTQgYSBQVVJFIGZ1bmN0aW9uIG92ZXIgcGxhbiBcdTAwRDcgZ292ZXJuYW5jZSBcdTAwRDdcbiAgICogZGVsaXZlcnktcm9sZSBkYXRhIChyb2FkbWFwIFx1MDBBNzMpLCBtaXJyb3JpbmcgdGhlIHJlZmVyZW5jZSBlbmdpbmUuIEEgZ3JhbnRcbiAgICogbWF5IEVYSVNUIChkaXJlY3Qgb3IgdmlhIGEgcm9sZSkgYW5kIHN0aWxsIG5vdCBSRVNPTFZFIGZvciBhbiBhZ2VudCB3aGVuXG4gICAqIHRoZSBwbGFuIGNlaWxpbmcgb3IgdGhlIHJlc3RyaWN0LW9ubHkgd29ya3NwYWNlIHBvbGljeSBuYXJyb3dzIGl0LiBVc2Vyc1xuICAgKiBhcmUgbmV2ZXIgcGxhbi1maWx0ZXJlZC5cbiAgICovXG4gIHByaXZhdGUgYXN5bmMgZ3JhbnRTb3VyY2UoYWN0b3JJZDogc3RyaW5nLCBwZXJtaXNzaW9uOiBQZXJtaXNzaW9uKTogUHJvbWlzZTxzdHJpbmcgfCBudWxsPiB7XG4gICAgY29uc3QgZGlyZWN0ID0gYXdhaXQgdGhpcy5kYlxuICAgICAgLnNlbGVjdCh7IHBlcm1pc3Npb246IGdyYW50cy5wZXJtaXNzaW9uIH0pXG4gICAgICAuZnJvbShncmFudHMpXG4gICAgICAud2hlcmUoYW5kKGVxKGdyYW50cy5hY3RvcklkLCBhY3RvcklkKSwgZXEoZ3JhbnRzLnBlcm1pc3Npb24sIHBlcm1pc3Npb24pKSlcbiAgICAgIC5saW1pdCgxKTtcbiAgICBpZiAoZGlyZWN0Lmxlbmd0aCA+IDApIHJldHVybiAnZGlyZWN0JztcbiAgICBjb25zdCBhc3NpZ25tZW50cyA9IGF3YWl0IHRoaXMuZGJcbiAgICAgIC5zZWxlY3QoKVxuICAgICAgLmZyb20ocm9sZUFzc2lnbm1lbnRzKVxuICAgICAgLndoZXJlKGFuZChlcShyb2xlQXNzaWdubWVudHMuYWN0b3JJZCwgYWN0b3JJZCksIGVxKHJvbGVBc3NpZ25tZW50cy5yZXZva2VkLCBmYWxzZSkpKVxuICAgICAgLm9yZGVyQnkoYXNjKHJvbGVBc3NpZ25tZW50cy5zZXEpKTtcbiAgICBmb3IgKGNvbnN0IGFzc2lnbm1lbnQgb2YgYXNzaWdubWVudHMpIHtcbiAgICAgIGlmICgoREVMSVZFUllfUk9MRVNbYXNzaWdubWVudC5yb2xlQ29kZV0gPz8gW10pLmluY2x1ZGVzKHBlcm1pc3Npb24pKSB7XG4gICAgICAgIHJldHVybiBgcm9sZToke2Fzc2lnbm1lbnQucm9sZUNvZGV9YDtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICBwcml2YXRlIGFnZW50Q2VpbGluZ0FsbG93cyhcbiAgICBhY3RvcjogQWN0b3JSb3cgfCBudWxsLFxuICAgIHBlcm1pc3Npb246IFBlcm1pc3Npb24sXG4gICAgd29ya3NwYWNlOiBXb3Jrc3BhY2VTdGF0ZVJvdyxcbiAgKTogeyBwbGFuOiBib29sZWFuOyBwb2xpY3k6IGJvb2xlYW4gfSB7XG4gICAgaWYgKCFhY3RvciB8fCBhY3Rvci50eXBlICE9PSAnYWdlbnQnKSByZXR1cm4geyBwbGFuOiB0cnVlLCBwb2xpY3k6IHRydWUgfTtcbiAgICBjb25zdCBjZWlsaW5nID0gUExBTl9DRUlMSU5HU1t3b3Jrc3BhY2UucGxhbiBhcyBQbGFuQ29kZV07XG4gICAgY29uc3QgcG9saWN5ID0gd29ya3NwYWNlLnBvbGljeSBhcyBXb3Jrc3BhY2VQb2xpY3k7XG4gICAgaWYgKChBR0VOVF9HQVRFX0FQUFJPVkVfUEVSTUlTU0lPTlMgYXMgcmVhZG9ubHkgc3RyaW5nW10pLmluY2x1ZGVzKHBlcm1pc3Npb24pKSB7XG4gICAgICByZXR1cm4geyBwbGFuOiBjZWlsaW5nLmFnZW50R2F0ZUFwcHJvdmUsIHBvbGljeTogcG9saWN5LmFnZW50R2F0ZUFwcHJvdmFscyAhPT0gZmFsc2UgfTtcbiAgICB9XG4gICAgaWYgKHBlcm1pc3Npb24gPT09ICdnYXRlLnJldmlldy5yZWplY3QnKSB7XG4gICAgICByZXR1cm4geyBwbGFuOiBjZWlsaW5nLmFnZW50R2F0ZVJlamVjdCwgcG9saWN5OiB0cnVlIH07XG4gICAgfVxuICAgIGlmIChwZXJtaXNzaW9uID09PSAndGFzay5jbGFpbScpIHtcbiAgICAgIHJldHVybiB7IHBsYW46IHRydWUsIHBvbGljeTogcG9saWN5LmFnZW50U2VsZkRpc3BhdGNoICE9PSBmYWxzZSB9O1xuICAgIH1cbiAgICByZXR1cm4geyBwbGFuOiB0cnVlLCBwb2xpY3k6IHRydWUgfTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgaGFzUGVybWlzc2lvbihhY3RvcklkOiBzdHJpbmcsIHBlcm1pc3Npb246IFBlcm1pc3Npb24pOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICBpZiAoKGF3YWl0IHRoaXMuZ3JhbnRTb3VyY2UoYWN0b3JJZCwgcGVybWlzc2lvbikpID09PSBudWxsKSByZXR1cm4gZmFsc2U7XG4gICAgY29uc3QgYWxsb3dzID0gdGhpcy5hZ2VudENlaWxpbmdBbGxvd3MoYXdhaXQgdGhpcy5nZXRBY3RvclJvdyhhY3RvcklkKSwgcGVybWlzc2lvbiwgYXdhaXQgdGhpcy53b3Jrc3BhY2VSb3coKSk7XG4gICAgcmV0dXJuIGFsbG93cy5wbGFuICYmIGFsbG93cy5wb2xpY3k7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIHJlcXVpcmVQZXJtaXNzaW9uKGFjdG9ySWQ6IHN0cmluZywgcGVybWlzc2lvbjogUGVybWlzc2lvbik6IFByb21pc2U8dm9pZD4ge1xuICAgIGlmICghKGF3YWl0IHRoaXMuaGFzUGVybWlzc2lvbihhY3RvcklkLCBwZXJtaXNzaW9uKSkpIHtcbiAgICAgIHRocm93IG5ldyBQZXJtaXNzaW9uRGVuaWVkRXJyb3IocGVybWlzc2lvbiwgYWN0b3JJZCk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyByZXF1aXJlR292ZXJuYW5jZUFkbWluKGJ5QWN0b3JJZDogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgaWYgKGJ5QWN0b3JJZCA9PT0gdGhpcy5zeXN0ZW1BY3RvcklkKSByZXR1cm47XG4gICAgY29uc3QgYWN0b3IgPSBhd2FpdCB0aGlzLmdldEFjdG9yUm93KGJ5QWN0b3JJZCk7XG4gICAgaWYgKGFjdG9yPy5nb3Zlcm5hbmNlUm9sZSA9PT0gJ2FkbWluJykgcmV0dXJuO1xuICAgIHRocm93IG5ldyBQZXJtaXNzaW9uRGVuaWVkRXJyb3IoJ2dvdmVybmFuY2UuYWRtaW4nLCBieUFjdG9ySWQpO1xuICB9XG5cbiAgLyoqIEdyYW50LXRpbWUgcGxhbiBjZWlsaW5nOiByZWZ1c2UgaXNzdWluZyBhZ2VudCBnYXRlIHBlcm1pc3Npb25zIHRoZSBwbGFuIGZvcmJpZHMuICovXG4gIHByaXZhdGUgYXN5bmMgY2hlY2tHcmFudENlaWxpbmcoYWN0b3JJZDogc3RyaW5nLCBwZXJtaXNzaW9uOiBQZXJtaXNzaW9uKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgYWN0b3IgPSBhd2FpdCB0aGlzLmdldEFjdG9yUm93KGFjdG9ySWQpO1xuICAgIGlmICghYWN0b3IgfHwgYWN0b3IudHlwZSAhPT0gJ2FnZW50JykgcmV0dXJuO1xuICAgIGNvbnN0IHdvcmtzcGFjZSA9IGF3YWl0IHRoaXMud29ya3NwYWNlUm93KCk7XG4gICAgY29uc3QgY2VpbGluZyA9IFBMQU5fQ0VJTElOR1Nbd29ya3NwYWNlLnBsYW4gYXMgUGxhbkNvZGVdO1xuICAgIGlmICgoQUdFTlRfR0FURV9BUFBST1ZFX1BFUk1JU1NJT05TIGFzIHJlYWRvbmx5IHN0cmluZ1tdKS5pbmNsdWRlcyhwZXJtaXNzaW9uKSAmJiAhY2VpbGluZy5hZ2VudEdhdGVBcHByb3ZlKSB7XG4gICAgICB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcihgcGxhbiAke3dvcmtzcGFjZS5wbGFufSBkb2VzIG5vdCBhbGxvdyBhZ2VudHMgdG8gaG9sZCAke3Blcm1pc3Npb259YCk7XG4gICAgfVxuICAgIGlmIChwZXJtaXNzaW9uID09PSAnZ2F0ZS5yZXZpZXcucmVqZWN0JyAmJiAhY2VpbGluZy5hZ2VudEdhdGVSZWplY3QpIHtcbiAgICAgIHRocm93IG5ldyBHdWFyZEZhaWxlZEVycm9yKGBwbGFuICR7d29ya3NwYWNlLnBsYW59IGRvZXMgbm90IGFsbG93IGFnZW50cyB0byBob2xkICR7cGVybWlzc2lvbn1gKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIGxpdmVDbGFpbSh3b3JrSXRlbUlkOiBzdHJpbmcpOiBQcm9taXNlPENsYWltUm93IHwgbnVsbD4ge1xuICAgIGNvbnN0IHJvd3MgPSBhd2FpdCB0aGlzLmRiXG4gICAgICAuc2VsZWN0KClcbiAgICAgIC5mcm9tKGNsYWltcylcbiAgICAgIC53aGVyZShcbiAgICAgICAgYW5kKFxuICAgICAgICAgIGVxKGNsYWltcy53b3JrSXRlbUlkLCB3b3JrSXRlbUlkKSxcbiAgICAgICAgICBlcShjbGFpbXMucmVsZWFzZWQsIGZhbHNlKSxcbiAgICAgICAgICBndChjbGFpbXMubGVhc2VFeHBpcmVzQXQsIHRoaXMubm93KSxcbiAgICAgICAgKSxcbiAgICAgIClcbiAgICAgIC5vcmRlckJ5KGFzYyhjbGFpbXMuc2VxKSlcbiAgICAgIC5saW1pdCgxKTtcbiAgICByZXR1cm4gcm93c1swXSA/PyBudWxsO1xuICB9XG5cbiAgLyoqXG4gICAqIEEgUFJFU0VOVEVEIHRva2VuIGlzIGFsd2F5cyB2YWxpZGF0ZWQsIG9uIGV2ZXJ5IGNvbW1hbmQgKGNvbmZvcm1hbmNlXG4gICAqIHBpbiwgY2xhaW1zLnRlc3QudHMpOiBzdGFsZS9mb3JlaWduL25vLWxpdmUtY2xhaW0gXHUyMTkyIENvbmZsaWN0RXJyb3IgKyBhdWRpdFxuICAgKiBldmVudC4gVGhlIGF1ZGl0IGV2ZW50IGNvbW1pdHMgaW4gaXRzIE9XTiB0cmFuc2FjdGlvbiBcdTIwMTQgdGhlIGZhaWxpbmdcbiAgICogY29tbWFuZCdzIHRyYW5zYWN0aW9uIChpZiBhbnkpIG11c3Qgbm90IHN3YWxsb3cgaXQuXG4gICAqL1xuICBwcml2YXRlIGFzeW5jIHZhbGlkYXRlUHJlc2VudGVkVG9rZW4oXG4gICAgaXRlbTogV29ya0l0ZW1Sb3csXG4gICAgZmVuY2luZ1Rva2VuOiBudW1iZXIgfCB1bmRlZmluZWQsXG4gICAgYWN0b3JJZDogc3RyaW5nLFxuICApOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBpZiAoZmVuY2luZ1Rva2VuID09PSB1bmRlZmluZWQpIHJldHVybjtcbiAgICBjb25zdCBsaXZlID0gYXdhaXQgdGhpcy5saXZlQ2xhaW0oaXRlbS5pZCk7XG4gICAgaWYgKGxpdmUgPT09IG51bGwgfHwgbGl2ZS5mZW5jaW5nVG9rZW4gIT09IGZlbmNpbmdUb2tlbikge1xuICAgICAgYXdhaXQgdGhpcy5kYi50cmFuc2FjdGlvbihhc3luYyAodHgpID0+IHtcbiAgICAgICAgYXdhaXQgdGhpcy5hcHBlbmRUeCh0eCwgJ3dvcmtfaXRlbScsIGl0ZW0uaWQsICdmZW5jaW5nLnJlamVjdGVkJywgYWN0b3JJZCwge1xuICAgICAgICAgIHByZXNlbnRlZFRva2VuOiBmZW5jaW5nVG9rZW4sXG4gICAgICAgICAgbGl2ZVRva2VuOiBsaXZlPy5mZW5jaW5nVG9rZW4gPz8gbnVsbCxcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICAgIHRocm93IG5ldyBDb25mbGljdEVycm9yKGBzdGFsZSBvciBmb3JlaWduIGZlbmNpbmcgdG9rZW4gZm9yIHdvcmsgaXRlbSAke2l0ZW0uaWR9YCk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBwdWJsaWNJdGVtKHJvdzogV29ya0l0ZW1Sb3cpOiBXb3JrSXRlbSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGlkOiByb3cuaWQsXG4gICAgICBmZWF0dXJlSWQ6IHJvdy5mZWF0dXJlSWQsXG4gICAgICBleHRlcm5hbEtleTogcm93LmV4dGVybmFsS2V5LFxuICAgICAgdGl0bGU6IHJvdy50aXRsZSxcbiAgICAgIHN0YXRlOiByb3cuc3RhdGUgYXMgV29ya0l0ZW1TdGF0ZSxcbiAgICAgIGJsb2NrZWRSZWFzb246IChyb3cuYmxvY2tlZFJlYXNvbiBhcyBCbG9ja2VkUmVhc29uIHwgbnVsbCkgPz8gbnVsbCxcbiAgICAgIHJldmlld0xvb3BJdGVyYXRpb246IHJvdy5yZXZpZXdMb29wSXRlcmF0aW9uLFxuICAgICAgaW50ZW50SGFzaDogcm93LmludGVudEhhc2gsXG4gICAgICBwaW5uZWRWZXJpZmljYXRpb246IHJvdy5waW5uZWRWZXJpZmljYXRpb24gPyBbLi4ucm93LnBpbm5lZFZlcmlmaWNhdGlvbl0gOiBudWxsLFxuICAgICAgc3BlY0NoZWNrcG9pbnQ6IHJvdy5zcGVjQ2hlY2twb2ludCxcbiAgICAgIGRvbmVDaGVja3BvaW50OiByb3cuZG9uZUNoZWNrcG9pbnQsXG4gICAgICBpbnZva2VEZXZXaXRoOiByb3cuaW52b2tlRGV2V2l0aCxcbiAgICAgIHNwZWNQYXRoOiByb3cuc3BlY1BhdGgsXG4gICAgICBzdGF0ZVZlcnNpb246IHJvdy5zdGF0ZVZlcnNpb24sXG4gICAgfTtcbiAgfVxuXG4gIHByaXZhdGUgcHVibGljRmVhdHVyZShyb3c6IEZlYXR1cmVSb3cpOiBGZWF0dXJlIHtcbiAgICByZXR1cm4ge1xuICAgICAgaWQ6IHJvdy5pZCxcbiAgICAgIHN0YXRlOiByb3cuc3RhdGUgYXMgRmVhdHVyZVsnc3RhdGUnXSxcbiAgICAgIGRpc3BhdGNoSG9sZDogcm93LmRpc3BhdGNoSG9sZCxcbiAgICB9O1xuICB9XG5cbiAgcHJpdmF0ZSBwdWJsaWNDbGFpbShyb3c6IENsYWltUm93KTogQ2xhaW0ge1xuICAgIHJldHVybiB7XG4gICAgICBpZDogcm93LmlkLFxuICAgICAgd29ya0l0ZW1JZDogcm93LndvcmtJdGVtSWQsXG4gICAgICBhY3RvcklkOiByb3cuYWN0b3JJZCxcbiAgICAgIGZlbmNpbmdUb2tlbjogcm93LmZlbmNpbmdUb2tlbixcbiAgICAgIGxlYXNlRXhwaXJlc0F0OiByb3cubGVhc2VFeHBpcmVzQXQsXG4gICAgICByZWxlYXNlZDogcm93LnJlbGVhc2VkLFxuICAgIH07XG4gIH1cblxuICBwcml2YXRlIGV2ZW50RnJvbVJvdyhyb3c6IEV2ZW50Um93KTogU3BpbmVFdmVudCB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGdsb2JhbFNlcTogcm93Lmdsb2JhbFNlcSxcbiAgICAgIHN0cmVhbVR5cGU6IHJvdy5zdHJlYW1UeXBlIGFzIFNwaW5lRXZlbnRbJ3N0cmVhbVR5cGUnXSxcbiAgICAgIHN0cmVhbUlkOiByb3cuc3RyZWFtSWQsXG4gICAgICBzdHJlYW1TZXE6IHJvdy5zdHJlYW1TZXEsXG4gICAgICB0eXBlOiByb3cudHlwZSxcbiAgICAgIGFjdG9ySWQ6IHJvdy5hY3RvcklkLFxuICAgICAgcGF5bG9hZDogcm93LnBheWxvYWQsXG4gICAgICAuLi4ocm93LmNhdXNhdGlvbklkICE9PSBudWxsID8geyBjYXVzYXRpb25JZDogcm93LmNhdXNhdGlvbklkIH0gOiB7fSksXG4gICAgfTtcbiAgfVxuXG4gIC8vIC0tIHNldHVwIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgYXN5bmMgY3JlYXRlQWN0b3IoaW5wdXQ6IHtcbiAgICB0eXBlOiBFeGNsdWRlPEFjdG9yVHlwZSwgJ3N5c3RlbSc+O1xuICAgIGRpc3BsYXlOYW1lOiBzdHJpbmc7XG4gICAgZ292ZXJuYW5jZVJvbGU/OiBHb3Zlcm5hbmNlUm9sZTtcbiAgfSk6IFByb21pc2U8QWN0b3I+IHtcbiAgICBjb25zdCBhY3RvcjogQWN0b3IgPSB7IGlkOiB0aGlzLm5leHRJZCgnYWN0b3InKSwgdHlwZTogaW5wdXQudHlwZSwgZGlzcGxheU5hbWU6IGlucHV0LmRpc3BsYXlOYW1lIH07XG4gICAgYXdhaXQgdGhpcy5kYi5pbnNlcnQoYWN0b3JzKS52YWx1ZXMoe1xuICAgICAgaWQ6IGFjdG9yLmlkLFxuICAgICAgdHlwZTogYWN0b3IudHlwZSxcbiAgICAgIGRpc3BsYXlOYW1lOiBhY3Rvci5kaXNwbGF5TmFtZSxcbiAgICAgIGdvdmVybmFuY2VSb2xlOiBpbnB1dC5nb3Zlcm5hbmNlUm9sZSA/PyAnbWVtYmVyJyxcbiAgICB9KTtcbiAgICByZXR1cm4gYWN0b3I7XG4gIH1cblxuICBhc3luYyBncmFudChpbnB1dDogeyBhY3RvcklkOiBzdHJpbmc7IHBlcm1pc3Npb246IFBlcm1pc3Npb247IHNjb3BlPzogc3RyaW5nIH0pOiBQcm9taXNlPHZvaWQ+IHtcbiAgICAvLyBHcmFudC10aW1lIHBsYW4gY2VpbGluZyBwcmVjZWRlcyBhbnkgZWZmZWN0IChQaGFzZSAyIHBpbik6IGEgcmVmdXNlZFxuICAgIC8vIGdyYW50IGluc2VydHMgbm90aGluZyBhbmQgYXBwZW5kcyBub3RoaW5nLlxuICAgIGF3YWl0IHRoaXMuY2hlY2tHcmFudENlaWxpbmcoaW5wdXQuYWN0b3JJZCwgaW5wdXQucGVybWlzc2lvbik7XG4gICAgYXdhaXQgdGhpcy5kYi50cmFuc2FjdGlvbihhc3luYyAodHgpID0+IHtcbiAgICAgIGF3YWl0IHR4XG4gICAgICAgIC5pbnNlcnQoZ3JhbnRzKVxuICAgICAgICAudmFsdWVzKHsgYWN0b3JJZDogaW5wdXQuYWN0b3JJZCwgcGVybWlzc2lvbjogaW5wdXQucGVybWlzc2lvbiwgc2NvcGU6IGlucHV0LnNjb3BlID8/IG51bGwgfSlcbiAgICAgICAgLm9uQ29uZmxpY3REb05vdGhpbmcoKTtcbiAgICAgIGF3YWl0IHRoaXMuYXBwZW5kVHgodHgsICdhY3RvcicsIGlucHV0LmFjdG9ySWQsICdncmFudC5pc3N1ZWQnLCB0aGlzLnN5c3RlbUFjdG9ySWQsIHtcbiAgICAgICAgcGVybWlzc2lvbjogaW5wdXQucGVybWlzc2lvbixcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgYXN5bmMgcmV2b2tlKGlucHV0OiB7IGFjdG9ySWQ6IHN0cmluZzsgcGVybWlzc2lvbjogUGVybWlzc2lvbjsgc2NvcGU/OiBzdHJpbmcgfSk6IFByb21pc2U8dm9pZD4ge1xuICAgIGF3YWl0IHRoaXMuZGIudHJhbnNhY3Rpb24oYXN5bmMgKHR4KSA9PiB7XG4gICAgICBhd2FpdCB0eFxuICAgICAgICAuZGVsZXRlKGdyYW50cylcbiAgICAgICAgLndoZXJlKGFuZChlcShncmFudHMuYWN0b3JJZCwgaW5wdXQuYWN0b3JJZCksIGVxKGdyYW50cy5wZXJtaXNzaW9uLCBpbnB1dC5wZXJtaXNzaW9uKSkpO1xuICAgICAgYXdhaXQgdGhpcy5hcHBlbmRUeCh0eCwgJ2FjdG9yJywgaW5wdXQuYWN0b3JJZCwgJ2dyYW50LnJldm9rZWQnLCB0aGlzLnN5c3RlbUFjdG9ySWQsIHtcbiAgICAgICAgcGVybWlzc2lvbjogaW5wdXQucGVybWlzc2lvbixcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgLy8gLS0gZW50aXRsZW1lbnRzIChQaGFzZSAyLCByb2FkbWFwIFx1MDBBNzMpIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICBhc3luYyBzZXRHb3Zlcm5hbmNlUm9sZShpbnB1dDogeyBhY3RvcklkOiBzdHJpbmc7IHJvbGU6IEdvdmVybmFuY2VSb2xlOyBieUFjdG9ySWQ6IHN0cmluZyB9KTogUHJvbWlzZTx2b2lkPiB7XG4gICAgYXdhaXQgdGhpcy5yZXF1aXJlR292ZXJuYW5jZUFkbWluKGlucHV0LmJ5QWN0b3JJZCk7XG4gICAgaWYgKChhd2FpdCB0aGlzLmdldEFjdG9yUm93KGlucHV0LmFjdG9ySWQpKSA9PT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoYHVua25vd24gYWN0b3I6ICR7aW5wdXQuYWN0b3JJZH1gKTtcbiAgICB9XG4gICAgYXdhaXQgdGhpcy5kYi50cmFuc2FjdGlvbihhc3luYyAodHgpID0+IHtcbiAgICAgIGF3YWl0IHR4LnVwZGF0ZShhY3RvcnMpLnNldCh7IGdvdmVybmFuY2VSb2xlOiBpbnB1dC5yb2xlIH0pLndoZXJlKGVxKGFjdG9ycy5pZCwgaW5wdXQuYWN0b3JJZCkpO1xuICAgICAgYXdhaXQgdGhpcy5hcHBlbmRUeCh0eCwgJ2FjdG9yJywgaW5wdXQuYWN0b3JJZCwgJ2dvdmVybmFuY2UuY2hhbmdlZCcsIGlucHV0LmJ5QWN0b3JJZCwgeyByb2xlOiBpbnB1dC5yb2xlIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgYXN5bmMgZ2V0R292ZXJuYW5jZVJvbGUoYWN0b3JJZDogc3RyaW5nKTogUHJvbWlzZTxHb3Zlcm5hbmNlUm9sZT4ge1xuICAgIGNvbnN0IGFjdG9yID0gYXdhaXQgdGhpcy5nZXRBY3RvclJvdyhhY3RvcklkKTtcbiAgICByZXR1cm4gKGFjdG9yPy5nb3Zlcm5hbmNlUm9sZSBhcyBHb3Zlcm5hbmNlUm9sZSB8IHVuZGVmaW5lZCkgPz8gJ21lbWJlcic7XG4gIH1cblxuICBhc3luYyBhc3NpZ25Sb2xlKGlucHV0OiB7IGFjdG9ySWQ6IHN0cmluZzsgcm9sZUNvZGU6IHN0cmluZzsgYnlBY3RvcklkOiBzdHJpbmcgfSk6IFByb21pc2U8dm9pZD4ge1xuICAgIGF3YWl0IHRoaXMucmVxdWlyZUdvdmVybmFuY2VBZG1pbihpbnB1dC5ieUFjdG9ySWQpO1xuICAgIGNvbnN0IGJ1bmRsZSA9IERFTElWRVJZX1JPTEVTW2lucHV0LnJvbGVDb2RlXTtcbiAgICBpZiAoYnVuZGxlID09PSB1bmRlZmluZWQpIHRocm93IG5ldyBHdWFyZEZhaWxlZEVycm9yKGB1bmtub3duIGRlbGl2ZXJ5IHJvbGU6ICR7aW5wdXQucm9sZUNvZGV9YCk7XG4gICAgaWYgKChhd2FpdCB0aGlzLmdldEFjdG9yUm93KGlucHV0LmFjdG9ySWQpKSA9PT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoYHVua25vd24gYWN0b3I6ICR7aW5wdXQuYWN0b3JJZH1gKTtcbiAgICB9XG4gICAgZm9yIChjb25zdCBwZXJtaXNzaW9uIG9mIGJ1bmRsZSkge1xuICAgICAgYXdhaXQgdGhpcy5jaGVja0dyYW50Q2VpbGluZyhpbnB1dC5hY3RvcklkLCBwZXJtaXNzaW9uKTtcbiAgICB9XG4gICAgY29uc3QgYWN0aXZlID0gYXdhaXQgdGhpcy5kYlxuICAgICAgLnNlbGVjdCh7IHNlcTogcm9sZUFzc2lnbm1lbnRzLnNlcSB9KVxuICAgICAgLmZyb20ocm9sZUFzc2lnbm1lbnRzKVxuICAgICAgLndoZXJlKFxuICAgICAgICBhbmQoXG4gICAgICAgICAgZXEocm9sZUFzc2lnbm1lbnRzLmFjdG9ySWQsIGlucHV0LmFjdG9ySWQpLFxuICAgICAgICAgIGVxKHJvbGVBc3NpZ25tZW50cy5yb2xlQ29kZSwgaW5wdXQucm9sZUNvZGUpLFxuICAgICAgICAgIGVxKHJvbGVBc3NpZ25tZW50cy5yZXZva2VkLCBmYWxzZSksXG4gICAgICAgICksXG4gICAgICApXG4gICAgICAubGltaXQoMSk7XG4gICAgaWYgKGFjdGl2ZS5sZW5ndGggPiAwKSByZXR1cm47IC8vIGlkZW1wb3RlbnRcbiAgICBhd2FpdCB0aGlzLmRiLnRyYW5zYWN0aW9uKGFzeW5jICh0eCkgPT4ge1xuICAgICAgYXdhaXQgdHguaW5zZXJ0KHJvbGVBc3NpZ25tZW50cykudmFsdWVzKHtcbiAgICAgICAgYWN0b3JJZDogaW5wdXQuYWN0b3JJZCxcbiAgICAgICAgcm9sZUNvZGU6IGlucHV0LnJvbGVDb2RlLFxuICAgICAgICBncmFudGVkQnk6IGlucHV0LmJ5QWN0b3JJZCxcbiAgICAgICAgcmV2b2tlZDogZmFsc2UsXG4gICAgICB9KTtcbiAgICAgIGF3YWl0IHRoaXMuYXBwZW5kVHgodHgsICdhY3RvcicsIGlucHV0LmFjdG9ySWQsICdyb2xlLmFzc2lnbmVkJywgaW5wdXQuYnlBY3RvcklkLCB7XG4gICAgICAgIHJvbGVDb2RlOiBpbnB1dC5yb2xlQ29kZSxcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgYXN5bmMgcmV2b2tlUm9sZShpbnB1dDogeyBhY3RvcklkOiBzdHJpbmc7IHJvbGVDb2RlOiBzdHJpbmc7IGJ5QWN0b3JJZDogc3RyaW5nIH0pOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBhd2FpdCB0aGlzLnJlcXVpcmVHb3Zlcm5hbmNlQWRtaW4oaW5wdXQuYnlBY3RvcklkKTtcbiAgICBpZiAoREVMSVZFUllfUk9MRVNbaW5wdXQucm9sZUNvZGVdID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRocm93IG5ldyBHdWFyZEZhaWxlZEVycm9yKGB1bmtub3duIGRlbGl2ZXJ5IHJvbGU6ICR7aW5wdXQucm9sZUNvZGV9YCk7XG4gICAgfVxuICAgIGF3YWl0IHRoaXMuZGIudHJhbnNhY3Rpb24oYXN5bmMgKHR4KSA9PiB7XG4gICAgICBhd2FpdCB0eFxuICAgICAgICAudXBkYXRlKHJvbGVBc3NpZ25tZW50cylcbiAgICAgICAgLnNldCh7IHJldm9rZWQ6IHRydWUgfSlcbiAgICAgICAgLndoZXJlKFxuICAgICAgICAgIGFuZChcbiAgICAgICAgICAgIGVxKHJvbGVBc3NpZ25tZW50cy5hY3RvcklkLCBpbnB1dC5hY3RvcklkKSxcbiAgICAgICAgICAgIGVxKHJvbGVBc3NpZ25tZW50cy5yb2xlQ29kZSwgaW5wdXQucm9sZUNvZGUpLFxuICAgICAgICAgICAgZXEocm9sZUFzc2lnbm1lbnRzLnJldm9rZWQsIGZhbHNlKSxcbiAgICAgICAgICApLFxuICAgICAgICApO1xuICAgICAgYXdhaXQgdGhpcy5hcHBlbmRUeCh0eCwgJ2FjdG9yJywgaW5wdXQuYWN0b3JJZCwgJ3JvbGUucmV2b2tlZCcsIGlucHV0LmJ5QWN0b3JJZCwge1xuICAgICAgICByb2xlQ29kZTogaW5wdXQucm9sZUNvZGUsXG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuXG4gIGFzeW5jIGxpc3RSb2xlQXNzaWdubWVudHMoYWN0b3JJZD86IHN0cmluZyk6IFByb21pc2U8Um9sZUFzc2lnbm1lbnRbXT4ge1xuICAgIGNvbnN0IHJvd3MgPVxuICAgICAgYWN0b3JJZCA9PT0gdW5kZWZpbmVkXG4gICAgICAgID8gYXdhaXQgdGhpcy5kYi5zZWxlY3QoKS5mcm9tKHJvbGVBc3NpZ25tZW50cykub3JkZXJCeShhc2Mocm9sZUFzc2lnbm1lbnRzLnNlcSkpXG4gICAgICAgIDogYXdhaXQgdGhpcy5kYlxuICAgICAgICAgICAgLnNlbGVjdCgpXG4gICAgICAgICAgICAuZnJvbShyb2xlQXNzaWdubWVudHMpXG4gICAgICAgICAgICAud2hlcmUoZXEocm9sZUFzc2lnbm1lbnRzLmFjdG9ySWQsIGFjdG9ySWQpKVxuICAgICAgICAgICAgLm9yZGVyQnkoYXNjKHJvbGVBc3NpZ25tZW50cy5zZXEpKTtcbiAgICByZXR1cm4gcm93cy5tYXAoKHJvdykgPT4gKHtcbiAgICAgIGFjdG9ySWQ6IHJvdy5hY3RvcklkLFxuICAgICAgcm9sZUNvZGU6IHJvdy5yb2xlQ29kZSxcbiAgICAgIGdyYW50ZWRCeTogcm93LmdyYW50ZWRCeSxcbiAgICAgIHJldm9rZWQ6IHJvdy5yZXZva2VkLFxuICAgIH0pKTtcbiAgfVxuXG4gIGFzeW5jIHNldFBsYW4oaW5wdXQ6IHsgcGxhbjogUGxhbkNvZGU7IGJ5QWN0b3JJZDogc3RyaW5nIH0pOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBhd2FpdCB0aGlzLnJlcXVpcmVHb3Zlcm5hbmNlQWRtaW4oaW5wdXQuYnlBY3RvcklkKTtcbiAgICBpZiAoUExBTl9DRUlMSU5HU1tpbnB1dC5wbGFuXSA9PT0gdW5kZWZpbmVkKSB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcihgdW5rbm93biBwbGFuOiAke2lucHV0LnBsYW59YCk7XG4gICAgY29uc3Qgd29ya3NwYWNlID0gYXdhaXQgdGhpcy53b3Jrc3BhY2VSb3coKTtcbiAgICBjb25zdCBwbGFuVmVyc2lvbiA9IHdvcmtzcGFjZS5wbGFuVmVyc2lvbiArIDE7XG4gICAgYXdhaXQgdGhpcy5kYi50cmFuc2FjdGlvbihhc3luYyAodHgpID0+IHtcbiAgICAgIGF3YWl0IHR4XG4gICAgICAgIC51cGRhdGUod29ya3NwYWNlU3RhdGUpXG4gICAgICAgIC5zZXQoeyBwbGFuOiBpbnB1dC5wbGFuLCBwbGFuVmVyc2lvbiB9KVxuICAgICAgICAud2hlcmUoZXEod29ya3NwYWNlU3RhdGUuaWQsIFdPUktTUEFDRV9JRCkpO1xuICAgICAgYXdhaXQgdGhpcy5hcHBlbmRUeCh0eCwgJ3dvcmtzcGFjZScsIFdPUktTUEFDRV9JRCwgJ3BsYW4uY2hhbmdlZCcsIGlucHV0LmJ5QWN0b3JJZCwge1xuICAgICAgICBwbGFuOiBpbnB1dC5wbGFuLFxuICAgICAgICBwbGFuVmVyc2lvbixcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgYXN5bmMgZ2V0UGxhbigpOiBQcm9taXNlPFBsYW5Db2RlPiB7XG4gICAgcmV0dXJuIChhd2FpdCB0aGlzLndvcmtzcGFjZVJvdygpKS5wbGFuIGFzIFBsYW5Db2RlO1xuICB9XG5cbiAgYXN5bmMgc2V0V29ya3NwYWNlUG9saWN5KGlucHV0OiB7IHBvbGljeTogV29ya3NwYWNlUG9saWN5OyBieUFjdG9ySWQ6IHN0cmluZyB9KTogUHJvbWlzZTx2b2lkPiB7XG4gICAgYXdhaXQgdGhpcy5yZXF1aXJlR292ZXJuYW5jZUFkbWluKGlucHV0LmJ5QWN0b3JJZCk7XG4gICAgY29uc3Qgd29ya3NwYWNlID0gYXdhaXQgdGhpcy53b3Jrc3BhY2VSb3coKTtcbiAgICBjb25zdCBtZXJnZWQ6IFdvcmtzcGFjZVBvbGljeSA9IHsgLi4uKHdvcmtzcGFjZS5wb2xpY3kgYXMgV29ya3NwYWNlUG9saWN5KSwgLi4uaW5wdXQucG9saWN5IH07XG4gICAgY29uc3QgcG9saWN5VmVyc2lvbiA9IHdvcmtzcGFjZS5wb2xpY3lWZXJzaW9uICsgMTtcbiAgICBhd2FpdCB0aGlzLmRiLnRyYW5zYWN0aW9uKGFzeW5jICh0eCkgPT4ge1xuICAgICAgYXdhaXQgdHhcbiAgICAgICAgLnVwZGF0ZSh3b3Jrc3BhY2VTdGF0ZSlcbiAgICAgICAgLnNldCh7IHBvbGljeTogbWVyZ2VkIGFzIFJlY29yZDxzdHJpbmcsIHVua25vd24+LCBwb2xpY3lWZXJzaW9uIH0pXG4gICAgICAgIC53aGVyZShlcSh3b3Jrc3BhY2VTdGF0ZS5pZCwgV09SS1NQQUNFX0lEKSk7XG4gICAgICBhd2FpdCB0aGlzLmFwcGVuZFR4KHR4LCAnd29ya3NwYWNlJywgV09SS1NQQUNFX0lELCAncG9saWN5LmNoYW5nZWQnLCBpbnB1dC5ieUFjdG9ySWQsIHtcbiAgICAgICAgcG9saWN5OiB7IC4uLm1lcmdlZCB9LFxuICAgICAgICBwb2xpY3lWZXJzaW9uLFxuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICBhc3luYyBnZXRXb3Jrc3BhY2VQb2xpY3koKTogUHJvbWlzZTxXb3Jrc3BhY2VQb2xpY3k+IHtcbiAgICByZXR1cm4geyAuLi4oKGF3YWl0IHRoaXMud29ya3NwYWNlUm93KCkpLnBvbGljeSBhcyBXb3Jrc3BhY2VQb2xpY3kpIH07XG4gIH1cblxuICBhc3luYyBzZXRHYXRlUG9saWN5KGlucHV0OiB7IGdhdGU6IEdhdGVDb2RlOyBwb2xpY3k6IEdhdGVQb2xpY3k7IGJ5QWN0b3JJZDogc3RyaW5nIH0pOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBhd2FpdCB0aGlzLnJlcXVpcmVHb3Zlcm5hbmNlQWRtaW4oaW5wdXQuYnlBY3RvcklkKTtcbiAgICBjb25zdCBtaW5BcHByb3ZhbHMgPSBpbnB1dC5wb2xpY3kubWluQXBwcm92YWxzID8/IDE7XG4gICAgaWYgKCFOdW1iZXIuaXNJbnRlZ2VyKG1pbkFwcHJvdmFscykgfHwgbWluQXBwcm92YWxzIDwgMSkge1xuICAgICAgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoJ21pbkFwcHJvdmFscyBtdXN0IGJlIGEgcG9zaXRpdmUgaW50ZWdlcicpO1xuICAgIH1cbiAgICBhd2FpdCB0aGlzLmRiLnRyYW5zYWN0aW9uKGFzeW5jICh0eCkgPT4ge1xuICAgICAgYXdhaXQgdHhcbiAgICAgICAgLmluc2VydChnYXRlUG9saWNpZXMpXG4gICAgICAgIC52YWx1ZXMoeyBnYXRlOiBpbnB1dC5nYXRlLCBwb2xpY3k6IHsgLi4uaW5wdXQucG9saWN5IH0gYXMgUmVjb3JkPHN0cmluZywgdW5rbm93bj4gfSlcbiAgICAgICAgLm9uQ29uZmxpY3REb1VwZGF0ZSh7XG4gICAgICAgICAgdGFyZ2V0OiBnYXRlUG9saWNpZXMuZ2F0ZSxcbiAgICAgICAgICBzZXQ6IHsgcG9saWN5OiB7IC4uLmlucHV0LnBvbGljeSB9IGFzIFJlY29yZDxzdHJpbmcsIHVua25vd24+IH0sXG4gICAgICAgIH0pO1xuICAgICAgYXdhaXQgdGhpcy5hcHBlbmRUeCh0eCwgJ3dvcmtzcGFjZScsIFdPUktTUEFDRV9JRCwgJ2dhdGVfcG9saWN5LmNoYW5nZWQnLCBpbnB1dC5ieUFjdG9ySWQsIHtcbiAgICAgICAgZ2F0ZTogaW5wdXQuZ2F0ZSxcbiAgICAgICAgcG9saWN5OiB7IC4uLmlucHV0LnBvbGljeSB9LFxuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICBhc3luYyBnZXRHYXRlUG9saWN5KGdhdGU6IEdhdGVDb2RlKTogUHJvbWlzZTxHYXRlUG9saWN5PiB7XG4gICAgY29uc3Qgcm93cyA9IGF3YWl0IHRoaXMuZGIuc2VsZWN0KCkuZnJvbShnYXRlUG9saWNpZXMpLndoZXJlKGVxKGdhdGVQb2xpY2llcy5nYXRlLCBnYXRlKSkubGltaXQoMSk7XG4gICAgcmV0dXJuIHsgLi4uKChyb3dzWzBdPy5wb2xpY3kgYXMgR2F0ZVBvbGljeSB8IHVuZGVmaW5lZCkgPz8ge30pIH07XG4gIH1cblxuICBhc3luYyBhdXRoekV4cGxhaW4oaW5wdXQ6IHsgYWN0b3JJZDogc3RyaW5nOyBwZXJtaXNzaW9uOiBQZXJtaXNzaW9uIH0pOiBQcm9taXNlPEF1dGh6RXhwbGFuYXRpb24+IHtcbiAgICBjb25zdCBzb3VyY2UgPSBhd2FpdCB0aGlzLmdyYW50U291cmNlKGlucHV0LmFjdG9ySWQsIGlucHV0LnBlcm1pc3Npb24pO1xuICAgIGNvbnN0IGFjdG9yID0gYXdhaXQgdGhpcy5nZXRBY3RvclJvdyhpbnB1dC5hY3RvcklkKTtcbiAgICBjb25zdCB3b3Jrc3BhY2UgPSBhd2FpdCB0aGlzLndvcmtzcGFjZVJvdygpO1xuICAgIGNvbnN0IGFsbG93cyA9IHRoaXMuYWdlbnRDZWlsaW5nQWxsb3dzKGFjdG9yLCBpbnB1dC5wZXJtaXNzaW9uLCB3b3Jrc3BhY2UpO1xuICAgIHJldHVybiB7XG4gICAgICBhY3RvcklkOiBpbnB1dC5hY3RvcklkLFxuICAgICAgcGVybWlzc2lvbjogaW5wdXQucGVybWlzc2lvbixcbiAgICAgIGFsbG93ZWQ6IHNvdXJjZSAhPT0gbnVsbCAmJiBhbGxvd3MucGxhbiAmJiBhbGxvd3MucG9saWN5LFxuICAgICAgc291cmNlLFxuICAgICAgZ292ZXJuYW5jZVJvbGU6IChhY3Rvcj8uZ292ZXJuYW5jZVJvbGUgYXMgR292ZXJuYW5jZVJvbGUgfCB1bmRlZmluZWQpID8/ICdtZW1iZXInLFxuICAgICAgcGxhbjogd29ya3NwYWNlLnBsYW4gYXMgUGxhbkNvZGUsXG4gICAgICBwbGFuQWxsb3dzOiBhbGxvd3MucGxhbixcbiAgICAgIHBvbGljeUFsbG93czogYWxsb3dzLnBvbGljeSxcbiAgICAgIHZlcnNpb25zOiB7IHBsYW46IHdvcmtzcGFjZS5wbGFuVmVyc2lvbiwgcG9saWN5OiB3b3Jrc3BhY2UucG9saWN5VmVyc2lvbiB9LFxuICAgIH07XG4gIH1cblxuICBhc3luYyBjcmVhdGVGZWF0dXJlKGlucHV0OiB7IGFjdG9ySWQ6IHN0cmluZyB9KTogUHJvbWlzZTxGZWF0dXJlPiB7XG4gICAgY29uc3QgaWQgPSB0aGlzLm5leHRJZCgnZmVhdCcpO1xuICAgIHJldHVybiB0aGlzLmRiLnRyYW5zYWN0aW9uKGFzeW5jICh0eCkgPT4ge1xuICAgICAgYXdhaXQgdHguaW5zZXJ0KGZlYXR1cmVzKS52YWx1ZXMoeyBpZCwgc3RhdGU6ICdiYWNrbG9nJywgZGlzcGF0Y2hIb2xkOiBmYWxzZSB9KTtcbiAgICAgIGF3YWl0IHRoaXMuYXBwZW5kVHgodHgsICdmZWF0dXJlJywgaWQsICdmZWF0dXJlLmNyZWF0ZWQnLCBpbnB1dC5hY3RvcklkLCB7fSk7XG4gICAgICByZXR1cm4geyBpZCwgc3RhdGU6ICdiYWNrbG9nJyBhcyBjb25zdCwgZGlzcGF0Y2hIb2xkOiBmYWxzZSB9O1xuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBjcmVhdGVXb3JrSXRlbVR4KHR4OiBRdWVyeWFibGUsIGlucHV0OiBDcmVhdGVXb3JrSXRlbUlucHV0ICYgeyBhY3RvcklkOiBzdHJpbmcgfSk6IFByb21pc2U8V29ya0l0ZW0+IHtcbiAgICBjb25zdCBzbHVnID0gaW5wdXQudGl0bGVcbiAgICAgIC50b0xvd2VyQ2FzZSgpXG4gICAgICAucmVwbGFjZSgvW15hLXowLTldKy9nLCAnLScpXG4gICAgICAucmVwbGFjZSgvKF4tfC0kKS9nLCAnJyk7XG4gICAgY29uc3Qgcm93OiBXb3JrSXRlbVJvdyA9IHtcbiAgICAgIGlkOiB0aGlzLm5leHRJZCgnd2knKSxcbiAgICAgIHNlcTogMCwgLy8gYXNzaWduZWQgYnkgdGhlIHNlcmlhbDsgcGxhY2Vob2xkZXIgZm9yIHRoZSBsb2NhbCBjb3B5IG9ubHlcbiAgICAgIGZlYXR1cmVJZDogaW5wdXQuZmVhdHVyZUlkLFxuICAgICAgZXh0ZXJuYWxLZXk6IGlucHV0LmV4dGVybmFsS2V5LFxuICAgICAgdGl0bGU6IGlucHV0LnRpdGxlLFxuICAgICAgc3RhdGU6ICdiYWNrbG9nJyxcbiAgICAgIGJsb2NrZWRSZWFzb246IG51bGwsXG4gICAgICByZXZpZXdMb29wSXRlcmF0aW9uOiAwLFxuICAgICAgaW50ZW50SGFzaDogbnVsbCxcbiAgICAgIHBpbm5lZFZlcmlmaWNhdGlvbjogbnVsbCxcbiAgICAgIHNwZWNDaGVja3BvaW50OiBpbnB1dC5zcGVjQ2hlY2twb2ludCA/PyBmYWxzZSxcbiAgICAgIGRvbmVDaGVja3BvaW50OiBpbnB1dC5kb25lQ2hlY2twb2ludCA/PyBmYWxzZSxcbiAgICAgIGludm9rZURldldpdGg6IGlucHV0Lmludm9rZURldldpdGggPz8gJycsXG4gICAgICBzcGVjUGF0aDogYHN0b3JpZXMvJHtpbnB1dC5leHRlcm5hbEtleX0tJHtzbHVnfS5tZGAsXG4gICAgICBzdGF0ZVZlcnNpb246IDAsXG4gICAgICBkZXBlbmRzT246IGlucHV0LmRlcGVuZHNPbiA/IFsuLi5pbnB1dC5kZXBlbmRzT25dIDogW10sXG4gICAgICBsYXN0RmVuY2luZ1Rva2VuOiAwLFxuICAgIH07XG4gICAgYXdhaXQgdHguaW5zZXJ0KHdvcmtJdGVtcykudmFsdWVzKHtcbiAgICAgIGlkOiByb3cuaWQsXG4gICAgICBmZWF0dXJlSWQ6IHJvdy5mZWF0dXJlSWQsXG4gICAgICBleHRlcm5hbEtleTogcm93LmV4dGVybmFsS2V5LFxuICAgICAgdGl0bGU6IHJvdy50aXRsZSxcbiAgICAgIHN0YXRlOiByb3cuc3RhdGUsXG4gICAgICBibG9ja2VkUmVhc29uOiByb3cuYmxvY2tlZFJlYXNvbixcbiAgICAgIHJldmlld0xvb3BJdGVyYXRpb246IHJvdy5yZXZpZXdMb29wSXRlcmF0aW9uLFxuICAgICAgaW50ZW50SGFzaDogcm93LmludGVudEhhc2gsXG4gICAgICBwaW5uZWRWZXJpZmljYXRpb246IHJvdy5waW5uZWRWZXJpZmljYXRpb24sXG4gICAgICBzcGVjQ2hlY2twb2ludDogcm93LnNwZWNDaGVja3BvaW50LFxuICAgICAgZG9uZUNoZWNrcG9pbnQ6IHJvdy5kb25lQ2hlY2twb2ludCxcbiAgICAgIGludm9rZURldldpdGg6IHJvdy5pbnZva2VEZXZXaXRoLFxuICAgICAgc3BlY1BhdGg6IHJvdy5zcGVjUGF0aCxcbiAgICAgIHN0YXRlVmVyc2lvbjogcm93LnN0YXRlVmVyc2lvbixcbiAgICAgIGRlcGVuZHNPbjogcm93LmRlcGVuZHNPbixcbiAgICAgIGxhc3RGZW5jaW5nVG9rZW46IHJvdy5sYXN0RmVuY2luZ1Rva2VuLFxuICAgIH0pO1xuICAgIGF3YWl0IHRoaXMuYXBwZW5kVHgodHgsICd3b3JrX2l0ZW0nLCByb3cuaWQsICd3b3JrX2l0ZW0uY3JlYXRlZCcsIGlucHV0LmFjdG9ySWQsIHtcbiAgICAgIGV4dGVybmFsS2V5OiByb3cuZXh0ZXJuYWxLZXksXG4gICAgICBmZWF0dXJlSWQ6IHJvdy5mZWF0dXJlSWQsXG4gICAgfSk7XG4gICAgcmV0dXJuIHRoaXMucHVibGljSXRlbShyb3cpO1xuICB9XG5cbiAgYXN5bmMgY3JlYXRlV29ya0l0ZW0oaW5wdXQ6IENyZWF0ZVdvcmtJdGVtSW5wdXQgJiB7IGFjdG9ySWQ6IHN0cmluZyB9KTogUHJvbWlzZTxXb3JrSXRlbT4ge1xuICAgIHJldHVybiB0aGlzLmRiLnRyYW5zYWN0aW9uKGFzeW5jICh0eCkgPT4gdGhpcy5jcmVhdGVXb3JrSXRlbVR4KHR4LCBpbnB1dCkpO1xuICB9XG5cbiAgYXN5bmMgaW1wb3J0U3RvcmllcyhpbnB1dDogeyBmZWF0dXJlSWQ6IHN0cmluZzsgeWFtbDogc3RyaW5nOyBhY3RvcklkOiBzdHJpbmcgfSk6IFByb21pc2U8U3Rvcmllc0ltcG9ydFJlc3VsdD4ge1xuICAgIGNvbnN0IGVudHJpZXMgPSBwYXJzZVN0b3JpZXMoaW5wdXQueWFtbCk7XG4gICAgY29uc3QgZmVhdHVyZSA9IGF3YWl0IHRoaXMuZ2V0RmVhdHVyZVJvdyhpbnB1dC5mZWF0dXJlSWQpO1xuICAgIGlmICghZmVhdHVyZSkge1xuICAgICAgdGhyb3cgbmV3IFN0b3JpZXNWYWxpZGF0aW9uRXJyb3IoYHVua25vd24gZmVhdHVyZTogJHtpbnB1dC5mZWF0dXJlSWR9YCk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmRiLnRyYW5zYWN0aW9uKGFzeW5jICh0eCkgPT4ge1xuICAgICAgY29uc3QgaW1wb3J0ZWQ6IHN0cmluZ1tdID0gW107XG4gICAgICBjb25zdCB1cGRhdGVkOiBzdHJpbmdbXSA9IFtdO1xuICAgICAgY29uc3Qgd2FybmluZ3M6IHN0cmluZ1tdID0gW107XG4gICAgICBmb3IgKGNvbnN0IGVudHJ5IG9mIGVudHJpZXMpIHtcbiAgICAgICAgY29uc3QgZXhpc3RpbmcgPSAoXG4gICAgICAgICAgYXdhaXQgdHhcbiAgICAgICAgICAgIC5zZWxlY3QoKVxuICAgICAgICAgICAgLmZyb20od29ya0l0ZW1zKVxuICAgICAgICAgICAgLndoZXJlKGFuZChlcSh3b3JrSXRlbXMuZmVhdHVyZUlkLCBpbnB1dC5mZWF0dXJlSWQpLCBlcSh3b3JrSXRlbXMuZXh0ZXJuYWxLZXksIGVudHJ5LmlkKSkpXG4gICAgICAgICAgICAub3JkZXJCeShhc2Mod29ya0l0ZW1zLnNlcSkpXG4gICAgICAgICAgICAubGltaXQoMSlcbiAgICAgICAgKVswXTtcbiAgICAgICAgaWYgKGV4aXN0aW5nKSB7XG4gICAgICAgICAgLy8gUmUtaW1wb3J0IHJlZnJlc2hlcyBkZXNjcmlwdGl2ZSBmaWVsZHM7IGxpZmVjeWNsZSBzdGF0ZSBpcyBuZXZlclxuICAgICAgICAgIC8vIHRvdWNoZWQgKHN0b3JpZXMueWFtbCBjYXJyaWVzIG5vIHN0YXR1cyBcdTIwMTQgRDksIHZhbGlkaXR5IHJ1bGUgMykuXG4gICAgICAgICAgYXdhaXQgdHhcbiAgICAgICAgICAgIC51cGRhdGUod29ya0l0ZW1zKVxuICAgICAgICAgICAgLnNldCh7XG4gICAgICAgICAgICAgIHRpdGxlOiBlbnRyeS50aXRsZSxcbiAgICAgICAgICAgICAgc3BlY0NoZWNrcG9pbnQ6IGVudHJ5LnNwZWNDaGVja3BvaW50LFxuICAgICAgICAgICAgICBkb25lQ2hlY2twb2ludDogZW50cnkuZG9uZUNoZWNrcG9pbnQsXG4gICAgICAgICAgICAgIGludm9rZURldldpdGg6IGVudHJ5Lmludm9rZURldldpdGgsXG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLndoZXJlKGVxKHdvcmtJdGVtcy5pZCwgZXhpc3RpbmcuaWQpKTtcbiAgICAgICAgICBhd2FpdCB0aGlzLmFwcGVuZFR4KHR4LCAnd29ya19pdGVtJywgZXhpc3RpbmcuaWQsICd3b3JrX2l0ZW0ucmVpbXBvcnRlZCcsIGlucHV0LmFjdG9ySWQsIHtcbiAgICAgICAgICAgIGV4dGVybmFsS2V5OiBlbnRyeS5pZCxcbiAgICAgICAgICB9KTtcbiAgICAgICAgICB1cGRhdGVkLnB1c2goZW50cnkuaWQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGF3YWl0IHRoaXMuY3JlYXRlV29ya0l0ZW1UeCh0eCwge1xuICAgICAgICAgICAgZmVhdHVyZUlkOiBpbnB1dC5mZWF0dXJlSWQsXG4gICAgICAgICAgICBleHRlcm5hbEtleTogZW50cnkuaWQsXG4gICAgICAgICAgICB0aXRsZTogZW50cnkudGl0bGUsXG4gICAgICAgICAgICBzcGVjQ2hlY2twb2ludDogZW50cnkuc3BlY0NoZWNrcG9pbnQsXG4gICAgICAgICAgICBkb25lQ2hlY2twb2ludDogZW50cnkuZG9uZUNoZWNrcG9pbnQsXG4gICAgICAgICAgICBpbnZva2VEZXZXaXRoOiBlbnRyeS5pbnZva2VEZXZXaXRoLFxuICAgICAgICAgICAgYWN0b3JJZDogaW5wdXQuYWN0b3JJZCxcbiAgICAgICAgICB9KTtcbiAgICAgICAgICBpbXBvcnRlZC5wdXNoKGVudHJ5LmlkKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIHsgaW1wb3J0ZWQsIHVwZGF0ZWQsIHdhcm5pbmdzIH07XG4gICAgfSk7XG4gIH1cblxuICAvLyAtLSBjbGFpbXMgKHJvYWRtYXAgXHUwMEE3MS4zKSAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICBhc3luYyBjbGFpbVRhc2soaW5wdXQ6IHsgd29ya0l0ZW1JZDogc3RyaW5nOyBhY3RvcklkOiBzdHJpbmc7IHR0bE1zPzogbnVtYmVyIH0pOiBQcm9taXNlPENsYWltPiB7XG4gICAgY29uc3QgaXRlbSA9IGF3YWl0IHRoaXMubXVzdEdldEl0ZW0oaW5wdXQud29ya0l0ZW1JZCk7XG4gICAgYXdhaXQgdGhpcy5yZXF1aXJlUGVybWlzc2lvbihpbnB1dC5hY3RvcklkLCAndGFzay5jbGFpbScpO1xuICAgIGNvbnN0IHR0bE1zID0gaW5wdXQudHRsTXMgPz8gMTUgKiA2MCAqIDEwMDA7XG4gICAgY29uc3QgY2xhaW1JZCA9IHRoaXMubmV4dElkKCdjbGFpbScpO1xuICAgIHRyeSB7XG4gICAgICByZXR1cm4gYXdhaXQgdGhpcy5kYi50cmFuc2FjdGlvbihhc3luYyAodHgpID0+IHtcbiAgICAgICAgLy8gU3dlZXA6IGFuIEVYUElSRUQgbGVhc2UgcmV0dXJucyB0aGUgaXRlbSB0byB0aGUgcG9vbCBcdTIwMTQgZmxpcCBpdHNcbiAgICAgICAgLy8gcmVsZWFzZWQgZmxhZyBzbyB0aGUgcGFydGlhbCB1bmlxdWUgaW5kZXggb25seSBndWFyZHMgbGl2ZSBjbGFpbXMuXG4gICAgICAgIGF3YWl0IHR4XG4gICAgICAgICAgLnVwZGF0ZShjbGFpbXMpXG4gICAgICAgICAgLnNldCh7IHJlbGVhc2VkOiB0cnVlIH0pXG4gICAgICAgICAgLndoZXJlKFxuICAgICAgICAgICAgYW5kKFxuICAgICAgICAgICAgICBlcShjbGFpbXMud29ya0l0ZW1JZCwgaXRlbS5pZCksXG4gICAgICAgICAgICAgIGVxKGNsYWltcy5yZWxlYXNlZCwgZmFsc2UpLFxuICAgICAgICAgICAgICBsdGUoY2xhaW1zLmxlYXNlRXhwaXJlc0F0LCB0aGlzLm5vdyksXG4gICAgICAgICAgICApLFxuICAgICAgICAgICk7XG4gICAgICAgIC8vIE1vbm90b25pYyBmZW5jaW5nIHRva2VuIHBlciB3b3JrIGl0ZW0sIGNvbnN1bWVkIG9ubHkgb24gc3VjY2Vzc1xuICAgICAgICAvLyAodGhlIHRyYW5zYWN0aW9uIHJvbGxzIHRoZSBjb3VudGVyIGJhY2sgd2hlbiB0aGUgaW5zZXJ0IGxvc2VzKS5cbiAgICAgICAgY29uc3QgY291bnRlclJvdyA9IChcbiAgICAgICAgICBhd2FpdCB0eFxuICAgICAgICAgICAgLnNlbGVjdCh7IGxhc3RGZW5jaW5nVG9rZW46IHdvcmtJdGVtcy5sYXN0RmVuY2luZ1Rva2VuIH0pXG4gICAgICAgICAgICAuZnJvbSh3b3JrSXRlbXMpXG4gICAgICAgICAgICAud2hlcmUoZXEod29ya0l0ZW1zLmlkLCBpdGVtLmlkKSlcbiAgICAgICAgICAgIC5saW1pdCgxKVxuICAgICAgICApWzBdO1xuICAgICAgICBjb25zdCB0b2tlbiA9IChjb3VudGVyUm93Py5sYXN0RmVuY2luZ1Rva2VuID8/IDApICsgMTtcbiAgICAgICAgYXdhaXQgdHgudXBkYXRlKHdvcmtJdGVtcykuc2V0KHsgbGFzdEZlbmNpbmdUb2tlbjogdG9rZW4gfSkud2hlcmUoZXEod29ya0l0ZW1zLmlkLCBpdGVtLmlkKSk7XG4gICAgICAgIC8vIFRoZSBwYXJ0aWFsIHVuaXF1ZSBpbmRleCBjbGFpbXNfb25lX2xpdmVfcGVyX2l0ZW0gZGVjaWRlcyB0aGUgcmFjZTpcbiAgICAgICAgLy8gYSBsaXZlIGNsYWltIG1ha2VzIHRoaXMgSU5TRVJUIGZhaWwgXHUyMDE0IHRoZSBsb3NlciBsZWF2ZXMgbm8gcm93LlxuICAgICAgICBhd2FpdCB0eC5pbnNlcnQoY2xhaW1zKS52YWx1ZXMoe1xuICAgICAgICAgIGlkOiBjbGFpbUlkLFxuICAgICAgICAgIHdvcmtJdGVtSWQ6IGl0ZW0uaWQsXG4gICAgICAgICAgYWN0b3JJZDogaW5wdXQuYWN0b3JJZCxcbiAgICAgICAgICBmZW5jaW5nVG9rZW46IHRva2VuLFxuICAgICAgICAgIGxlYXNlRXhwaXJlc0F0OiB0aGlzLm5vdyArIHR0bE1zLFxuICAgICAgICAgIHJlbGVhc2VkOiBmYWxzZSxcbiAgICAgICAgICB0dGxNcyxcbiAgICAgICAgfSk7XG4gICAgICAgIGF3YWl0IHRoaXMuYXBwZW5kVHgodHgsICd3b3JrX2l0ZW0nLCBpdGVtLmlkLCAnd29ya19pdGVtLmNsYWltZWQnLCBpbnB1dC5hY3RvcklkLCB7XG4gICAgICAgICAgY2xhaW1JZCxcbiAgICAgICAgICBmZW5jaW5nVG9rZW46IHRva2VuLFxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBpZDogY2xhaW1JZCxcbiAgICAgICAgICB3b3JrSXRlbUlkOiBpdGVtLmlkLFxuICAgICAgICAgIGFjdG9ySWQ6IGlucHV0LmFjdG9ySWQsXG4gICAgICAgICAgZmVuY2luZ1Rva2VuOiB0b2tlbixcbiAgICAgICAgICBsZWFzZUV4cGlyZXNBdDogdGhpcy5ub3cgKyB0dGxNcyxcbiAgICAgICAgICByZWxlYXNlZDogZmFsc2UsXG4gICAgICAgIH07XG4gICAgICB9KTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgaWYgKGlzVW5pcXVlVmlvbGF0aW9uKGVycm9yKSkge1xuICAgICAgICB0aHJvdyBuZXcgQ29uZmxpY3RFcnJvcihgd29yayBpdGVtICR7aXRlbS5pZH0gYWxyZWFkeSBoYXMgYSBsaXZlIGNsYWltYCk7XG4gICAgICB9XG4gICAgICB0aHJvdyBlcnJvcjtcbiAgICB9XG4gIH1cblxuICBhc3luYyBoZWFydGJlYXQoaW5wdXQ6IHsgY2xhaW1JZDogc3RyaW5nIH0pOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCByb3cgPSAoYXdhaXQgdGhpcy5kYi5zZWxlY3QoKS5mcm9tKGNsYWltcykud2hlcmUoZXEoY2xhaW1zLmlkLCBpbnB1dC5jbGFpbUlkKSkubGltaXQoMSkpWzBdO1xuICAgIGlmICghcm93IHx8IHJvdy5yZWxlYXNlZCB8fCByb3cubGVhc2VFeHBpcmVzQXQgPD0gdGhpcy5ub3cpIHtcbiAgICAgIHRocm93IG5ldyBDb25mbGljdEVycm9yKGBjbGFpbSAke2lucHV0LmNsYWltSWR9IGlzIG5vdCBsaXZlYCk7XG4gICAgfVxuICAgIC8vIEhlYXJ0YmVhdCByZW5ld3MgdGhlIEZVTEwgb3JpZ2luYWwgVFRMIGZyb20gdGhlIGhlYXJ0YmVhdCBtb21lbnQuXG4gICAgYXdhaXQgdGhpcy5kYlxuICAgICAgLnVwZGF0ZShjbGFpbXMpXG4gICAgICAuc2V0KHsgbGVhc2VFeHBpcmVzQXQ6IHRoaXMubm93ICsgcm93LnR0bE1zIH0pXG4gICAgICAud2hlcmUoZXEoY2xhaW1zLmlkLCByb3cuaWQpKTtcbiAgfVxuXG4gIGFzeW5jIHJlbGVhc2VDbGFpbShpbnB1dDogeyBjbGFpbUlkOiBzdHJpbmc7IHJlYXNvbj86IHN0cmluZyB9KTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3Qgcm93ID0gKGF3YWl0IHRoaXMuZGIuc2VsZWN0KCkuZnJvbShjbGFpbXMpLndoZXJlKGVxKGNsYWltcy5pZCwgaW5wdXQuY2xhaW1JZCkpLmxpbWl0KDEpKVswXTtcbiAgICBpZiAoIXJvdyB8fCByb3cucmVsZWFzZWQpIHJldHVybjtcbiAgICBhd2FpdCB0aGlzLmRiLnRyYW5zYWN0aW9uKGFzeW5jICh0eCkgPT4ge1xuICAgICAgYXdhaXQgdHgudXBkYXRlKGNsYWltcykuc2V0KHsgcmVsZWFzZWQ6IHRydWUgfSkud2hlcmUoZXEoY2xhaW1zLmlkLCByb3cuaWQpKTtcbiAgICAgIGF3YWl0IHRoaXMuYXBwZW5kVHgodHgsICd3b3JrX2l0ZW0nLCByb3cud29ya0l0ZW1JZCwgJ2NsYWltLnJlbGVhc2VkJywgcm93LmFjdG9ySWQsIHtcbiAgICAgICAgY2xhaW1JZDogcm93LmlkLFxuICAgICAgICByZWFzb246IGlucHV0LnJlYXNvbiA/PyBudWxsLFxuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICBhZHZhbmNlQ2xvY2sobXM6IG51bWJlcik6IHZvaWQge1xuICAgIHRoaXMubm93ICs9IG1zO1xuICB9XG5cbiAgLy8gLS0gbGlmZWN5Y2xlIChyb2FkbWFwIFx1MDBBNzEuMikgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICBhc3luYyBhZHZhbmNlU3RhdGUoaW5wdXQ6IEFkdmFuY2VJbnB1dCk6IFByb21pc2U8V29ya0l0ZW0+IHtcbiAgICBjb25zdCBpdGVtID0gYXdhaXQgdGhpcy5tdXN0R2V0SXRlbShpbnB1dC53b3JrSXRlbUlkKTtcblxuICAgIC8vIEtleWVkIHJlcGxheTogdGhlIHNhbWUgY29tbWFuZCByZXR1cm5zIHRoZSBzYW1lIHJlc3VsdCwgYXBwZW5kcyBub3RoaW5nLlxuICAgIGlmIChpbnB1dC5pZGVtcG90ZW5jeUtleSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBjb25zdCBjYWNoZWQgPSAoXG4gICAgICAgIGF3YWl0IHRoaXMuZGJcbiAgICAgICAgICAuc2VsZWN0KClcbiAgICAgICAgICAuZnJvbShpZGVtcG90ZW5jeUtleXMpXG4gICAgICAgICAgLndoZXJlKGVxKGlkZW1wb3RlbmN5S2V5cy5rZXksIGlucHV0LmlkZW1wb3RlbmN5S2V5KSlcbiAgICAgICAgICAubGltaXQoMSlcbiAgICAgIClbMF07XG4gICAgICBpZiAoY2FjaGVkKSByZXR1cm4geyAuLi4oY2FjaGVkLnJlc3VsdCBhcyB1bmtub3duIGFzIFdvcmtJdGVtKSB9O1xuICAgIH1cblxuICAgIC8vIFByZXNlcnZhdGlvbiBuby1vcCAoc3ByaW50LXBsYW5uaW5nIGlkZW1wb3RlbmN5IHJ1bGUpOiBhbiBVTktFWUVEXG4gICAgLy8gcmUtcmVxdWVzdCBvZiB0aGUgY3VycmVudCBzdGF0ZSBzdWNjZWVkcyB3aXRob3V0IGFuIGV2ZW50LlxuICAgIGlmIChpbnB1dC5pZGVtcG90ZW5jeUtleSA9PT0gdW5kZWZpbmVkICYmIGlucHV0LnRvID09PSBpdGVtLnN0YXRlKSB7XG4gICAgICBhd2FpdCB0aGlzLnZhbGlkYXRlUHJlc2VudGVkVG9rZW4oaXRlbSwgaW5wdXQuZmVuY2luZ1Rva2VuLCBpbnB1dC5hY3RvcklkKTtcbiAgICAgIHJldHVybiB0aGlzLnB1YmxpY0l0ZW0oaXRlbSk7XG4gICAgfVxuXG4gICAgLy8gVHJhbnNpdGlvbi10YWJsZSBsb29rdXAgcHJlY2VkZXMgY2xhaW0vdG9rZW4vcGVybWlzc2lvbiBjaGVja3NcbiAgICAvLyAoZnNtLXRyYW5zaXRpb25zIHBpbikuXG4gICAgY29uc3QgcnVsZSA9IFRSQU5TSVRJT05TLmZpbmQoKHQpID0+IHQuZnJvbSA9PT0gaXRlbS5zdGF0ZSAmJiB0LnRvID09PSBpbnB1dC50byk7XG4gICAgaWYgKCFydWxlKSB7XG4gICAgICBpZiAoXG4gICAgICAgIFJBTktbaW5wdXQudG9dIDwgUkFOS1tpdGVtLnN0YXRlIGFzIFdvcmtJdGVtU3RhdGVdICYmXG4gICAgICAgIChhd2FpdCB0aGlzLmhhc1Blcm1pc3Npb24oaW5wdXQuYWN0b3JJZCwgJ3N0YXRlLmRvd25ncmFkZScpKVxuICAgICAgKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnByaXZpbGVnZWREb3duZ3JhZGUoaXRlbSwgaW5wdXQpO1xuICAgICAgfVxuICAgICAgdGhyb3cgbmV3IEludmFsaWRUcmFuc2l0aW9uRXJyb3IoaXRlbS5zdGF0ZSBhcyBXb3JrSXRlbVN0YXRlLCBpbnB1dC50byk7XG4gICAgfVxuXG4gICAgYXdhaXQgdGhpcy52YWxpZGF0ZVByZXNlbnRlZFRva2VuKGl0ZW0sIGlucHV0LmZlbmNpbmdUb2tlbiwgaW5wdXQuYWN0b3JJZCk7XG5cbiAgICAvLyBCbG9ja2VkIG92ZXJsYXkgZnJlZXplcyB0cmFuc2l0aW9ucyBhdCBldmVyeSBzdGF0ZSAoRDgsIFx1MDBBNzEuMSkuXG4gICAgaWYgKGl0ZW0uYmxvY2tlZFJlYXNvbiAhPT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoYHdvcmsgaXRlbSBpcyBibG9ja2VkOiAke2l0ZW0uYmxvY2tlZFJlYXNvbn1gKTtcbiAgICB9XG5cbiAgICBhd2FpdCB0aGlzLnJlcXVpcmVQZXJtaXNzaW9uKGlucHV0LmFjdG9ySWQsIHJ1bGUucGVybWlzc2lvbik7XG5cbiAgICBpZiAocnVsZS5jbGFpbVJlcXVpcmVkICYmIGlucHV0LmZlbmNpbmdUb2tlbiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAvLyBFeGVjdXRpb24tem9uZSB0cmFuc2l0aW9ucyBkZW1hbmQgYSBQUkVTRU5URUQgbGl2ZSB0b2tlbi5cbiAgICAgIHRocm93IG5ldyBHdWFyZEZhaWxlZEVycm9yKCdjbGFpbSBmZW5jaW5nIHRva2VuIHJlcXVpcmVkIGZvciB0aGlzIHRyYW5zaXRpb24nKTtcbiAgICB9XG5cbiAgICBmb3IgKGNvbnN0IGd1YXJkIG9mIHJ1bGUuZ3VhcmRzKSB7XG4gICAgICBhd2FpdCB0aGlzLmNoZWNrR3VhcmQoZ3VhcmQsIGl0ZW0pO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLmRiLnRyYW5zYWN0aW9uKGFzeW5jICh0eCkgPT5cbiAgICAgIHRoaXMuZXhlY3V0ZVRyYW5zaXRpb25UeCh0eCwgaXRlbSwgaW5wdXQudG8sIGlucHV0LmFjdG9ySWQsIGlucHV0LmlkZW1wb3RlbmN5S2V5KSxcbiAgICApO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBjaGVja0d1YXJkKGd1YXJkOiBUcmFuc2l0aW9uUnVsZVsnZ3VhcmRzJ11bbnVtYmVyXSwgaXRlbTogV29ya0l0ZW1Sb3cpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBzd2l0Y2ggKGd1YXJkKSB7XG4gICAgICBjYXNlICdkZXBzX2RvbmUnOiB7XG4gICAgICAgIGZvciAoY29uc3QgZGVwS2V5IG9mIGl0ZW0uZGVwZW5kc09uKSB7XG4gICAgICAgICAgY29uc3QgZGVwID0gKFxuICAgICAgICAgICAgYXdhaXQgdGhpcy5kYlxuICAgICAgICAgICAgICAuc2VsZWN0KClcbiAgICAgICAgICAgICAgLmZyb20od29ya0l0ZW1zKVxuICAgICAgICAgICAgICAud2hlcmUoYW5kKGVxKHdvcmtJdGVtcy5mZWF0dXJlSWQsIGl0ZW0uZmVhdHVyZUlkKSwgZXEod29ya0l0ZW1zLmV4dGVybmFsS2V5LCBkZXBLZXkpKSlcbiAgICAgICAgICAgICAgLm9yZGVyQnkoYXNjKHdvcmtJdGVtcy5zZXEpKVxuICAgICAgICAgICAgICAubGltaXQoMSlcbiAgICAgICAgICApWzBdO1xuICAgICAgICAgIGlmIChkZXAgJiYgZGVwLnN0YXRlICE9PSAnZG9uZScpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBHdWFyZEZhaWxlZEVycm9yKGBkZXBlbmRlbmN5ICR7ZGVwS2V5fSBpcyBub3QgZG9uZWApO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBjYXNlICdzcGVjX2dhdGVfaWZfY2hlY2twb2ludCc6IHtcbiAgICAgICAgaWYgKCFpdGVtLnNwZWNDaGVja3BvaW50KSByZXR1cm47XG4gICAgICAgIGNvbnN0IGFwcHJvdmVkID0gKFxuICAgICAgICAgIGF3YWl0IHRoaXMuZGJcbiAgICAgICAgICAgIC5zZWxlY3QoeyBzZXE6IGdhdGVEZWNpc2lvbnMuc2VxIH0pXG4gICAgICAgICAgICAuZnJvbShnYXRlRGVjaXNpb25zKVxuICAgICAgICAgICAgLndoZXJlKFxuICAgICAgICAgICAgICBhbmQoXG4gICAgICAgICAgICAgICAgZXEoZ2F0ZURlY2lzaW9ucy53b3JrSXRlbUlkLCBpdGVtLmlkKSxcbiAgICAgICAgICAgICAgICBlcShnYXRlRGVjaXNpb25zLmdhdGUsICdzcGVjX2FwcHJvdmFsJyksXG4gICAgICAgICAgICAgICAgZXEoZ2F0ZURlY2lzaW9ucy5kZWNpc2lvbiwgJ2FwcHJvdmVkJyksXG4gICAgICAgICAgICAgICksXG4gICAgICAgICAgICApXG4gICAgICAgICAgICAubGltaXQoMSlcbiAgICAgICAgKVswXTtcbiAgICAgICAgaWYgKCFhcHByb3ZlZCkge1xuICAgICAgICAgIHRocm93IG5ldyBHdWFyZEZhaWxlZEVycm9yKCdzcGVjX2NoZWNrcG9pbnQgcmVxdWlyZXMgYW4gYXBwcm92ZWQgc3BlY19hcHByb3ZhbCBnYXRlIGRlY2lzaW9uJyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgY2FzZSAnbm9uZW1wdHlfZGlmZic6IHtcbiAgICAgICAgLy8gVGhlIExBVEVTVCBzdWJtaXR0ZWQgZ2l0X2RpZmYsIGlmIGFueSwgbXVzdCBiZSBub24tZW1wdHkgXHUyMDE0IHRoZVxuICAgICAgICAvLyBmYWtlLWRvbmUgZGVueS4gQWJzZW5jZSBpcyBub3QgY2hlY2tlZCBoZXJlIChDT05GT1JNQU5DRS5tZCBwaW4pLlxuICAgICAgICBjb25zdCByb3dzID0gYXdhaXQgdGhpcy5kYlxuICAgICAgICAgIC5zZWxlY3QoKVxuICAgICAgICAgIC5mcm9tKGV2aWRlbmNlVGFibGUpXG4gICAgICAgICAgLndoZXJlKGFuZChlcShldmlkZW5jZVRhYmxlLndvcmtJdGVtSWQsIGl0ZW0uaWQpLCBlcShldmlkZW5jZVRhYmxlLmtpbmQsICdnaXRfZGlmZicpKSlcbiAgICAgICAgICAub3JkZXJCeShhc2MoZXZpZGVuY2VUYWJsZS5zZXEpKTtcbiAgICAgICAgY29uc3QgbGF0ZXN0ID0gcm93c1tyb3dzLmxlbmd0aCAtIDFdO1xuICAgICAgICBpZiAobGF0ZXN0ICYmIGxhdGVzdC5wYXlsb2FkWydub25FbXB0eSddICE9PSB0cnVlKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoJ3RoZSBsYXRlc3QgZ2l0X2RpZmYgZXZpZGVuY2UgaXMgZW1wdHkgXHUyMDE0IG5vdGhpbmcgdG8gcmV2aWV3Jyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgcHJpdmlsZWdlZERvd25ncmFkZShpdGVtOiBXb3JrSXRlbVJvdywgaW5wdXQ6IEFkdmFuY2VJbnB1dCk6IFByb21pc2U8V29ya0l0ZW0+IHtcbiAgICBhd2FpdCB0aGlzLnZhbGlkYXRlUHJlc2VudGVkVG9rZW4oaXRlbSwgaW5wdXQuZmVuY2luZ1Rva2VuLCBpbnB1dC5hY3RvcklkKTtcbiAgICBpZiAoaXRlbS5ibG9ja2VkUmVhc29uICE9PSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcihgd29yayBpdGVtIGlzIGJsb2NrZWQ6ICR7aXRlbS5ibG9ja2VkUmVhc29ufWApO1xuICAgIH1cbiAgICBjb25zdCBmcm9tID0gaXRlbS5zdGF0ZTtcbiAgICByZXR1cm4gdGhpcy5kYi50cmFuc2FjdGlvbihhc3luYyAodHgpID0+IHtcbiAgICAgIGNvbnN0IHVwZGF0ZWQgPSBhd2FpdCB0eFxuICAgICAgICAudXBkYXRlKHdvcmtJdGVtcylcbiAgICAgICAgLnNldCh7IHN0YXRlOiBpbnB1dC50bywgc3RhdGVWZXJzaW9uOiBpdGVtLnN0YXRlVmVyc2lvbiArIDEgfSlcbiAgICAgICAgLndoZXJlKGFuZChlcSh3b3JrSXRlbXMuaWQsIGl0ZW0uaWQpLCBlcSh3b3JrSXRlbXMuc3RhdGVWZXJzaW9uLCBpdGVtLnN0YXRlVmVyc2lvbikpKVxuICAgICAgICAucmV0dXJuaW5nKHsgaWQ6IHdvcmtJdGVtcy5pZCB9KTtcbiAgICAgIGlmICh1cGRhdGVkLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICB0aHJvdyBuZXcgQ29uZmxpY3RFcnJvcihgc3RhdGVfdmVyc2lvbiBjb25mbGljdCBvbiB3b3JrIGl0ZW0gJHtpdGVtLmlkfWApO1xuICAgICAgfVxuICAgICAgYXdhaXQgdGhpcy5hcHBlbmRUeChcbiAgICAgICAgdHgsXG4gICAgICAgICd3b3JrX2l0ZW0nLFxuICAgICAgICBpdGVtLmlkLFxuICAgICAgICAnd29ya19pdGVtLnN0YXRlX2Rvd25ncmFkZWQnLFxuICAgICAgICBpbnB1dC5hY3RvcklkLFxuICAgICAgICB7IGZyb20sIHRvOiBpbnB1dC50bywgY29tcGVuc2F0aW5nOiB0cnVlIH0sXG4gICAgICAgIGlucHV0LmlkZW1wb3RlbmN5S2V5ICE9PSB1bmRlZmluZWQgPyB7IGlkZW1wb3RlbmN5S2V5OiBpbnB1dC5pZGVtcG90ZW5jeUtleSB9IDogdW5kZWZpbmVkLFxuICAgICAgKTtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IHRoaXMucHVibGljSXRlbSh7IC4uLml0ZW0sIHN0YXRlOiBpbnB1dC50bywgc3RhdGVWZXJzaW9uOiBpdGVtLnN0YXRlVmVyc2lvbiArIDEgfSk7XG4gICAgICBpZiAoaW5wdXQuaWRlbXBvdGVuY3lLZXkgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBhd2FpdCB0eFxuICAgICAgICAgIC5pbnNlcnQoaWRlbXBvdGVuY3lLZXlzKVxuICAgICAgICAgIC52YWx1ZXMoeyBrZXk6IGlucHV0LmlkZW1wb3RlbmN5S2V5LCByZXN1bHQ6IHJlc3VsdCBhcyB1bmtub3duIGFzIFJlY29yZDxzdHJpbmcsIHVua25vd24+IH0pXG4gICAgICAgICAgLm9uQ29uZmxpY3REb05vdGhpbmcoKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSk7XG4gIH1cblxuICAvKiogU2hhcmVkIGJ5IGFkdmFuY2VTdGF0ZSBhbmQgdGhlIGdhdGUtZmlyZWQgdHJhbnNpdGlvbnMuIE9ORSB0cmFuc2FjdGlvbiBwZXIgY29tbWFuZC4gKi9cbiAgcHJpdmF0ZSBhc3luYyBleGVjdXRlVHJhbnNpdGlvblR4KFxuICAgIHR4OiBUeCxcbiAgICBpdGVtOiBXb3JrSXRlbVJvdyxcbiAgICB0bzogV29ya0l0ZW1TdGF0ZSxcbiAgICBhY3RvcklkOiBzdHJpbmcsXG4gICAgaWRlbXBvdGVuY3lLZXk/OiBzdHJpbmcsXG4gICAgY2F1c2F0aW9uSWQ/OiBzdHJpbmcsXG4gICk6IFByb21pc2U8V29ya0l0ZW0+IHtcbiAgICBjb25zdCBmcm9tID0gaXRlbS5zdGF0ZSBhcyBXb3JrSXRlbVN0YXRlO1xuICAgIC8vIENBUzogb3B0aW1pc3RpYyBjb25jdXJyZW5jeSBieSBzdGF0ZV92ZXJzaW9uIChyb2FkbWFwIFx1MDBBNzEuMSkuXG4gICAgY29uc3QgdXBkYXRlZCA9IGF3YWl0IHR4XG4gICAgICAudXBkYXRlKHdvcmtJdGVtcylcbiAgICAgIC5zZXQoeyBzdGF0ZTogdG8sIHN0YXRlVmVyc2lvbjogaXRlbS5zdGF0ZVZlcnNpb24gKyAxIH0pXG4gICAgICAud2hlcmUoYW5kKGVxKHdvcmtJdGVtcy5pZCwgaXRlbS5pZCksIGVxKHdvcmtJdGVtcy5zdGF0ZVZlcnNpb24sIGl0ZW0uc3RhdGVWZXJzaW9uKSkpXG4gICAgICAucmV0dXJuaW5nKHsgaWQ6IHdvcmtJdGVtcy5pZCB9KTtcbiAgICBpZiAodXBkYXRlZC5sZW5ndGggPT09IDApIHtcbiAgICAgIHRocm93IG5ldyBDb25mbGljdEVycm9yKGBzdGF0ZV92ZXJzaW9uIGNvbmZsaWN0IG9uIHdvcmsgaXRlbSAke2l0ZW0uaWR9YCk7XG4gICAgfVxuICAgIGNvbnN0IGV2ZW50ID0gYXdhaXQgdGhpcy5hcHBlbmRUeChcbiAgICAgIHR4LFxuICAgICAgJ3dvcmtfaXRlbScsXG4gICAgICBpdGVtLmlkLFxuICAgICAgJ3dvcmtfaXRlbS5zdGF0ZV9jaGFuZ2VkJyxcbiAgICAgIGFjdG9ySWQsXG4gICAgICB7IGZyb20sIHRvIH0sXG4gICAgICB7XG4gICAgICAgIC4uLihjYXVzYXRpb25JZCAhPT0gdW5kZWZpbmVkID8geyBjYXVzYXRpb25JZCB9IDoge30pLFxuICAgICAgICAuLi4oaWRlbXBvdGVuY3lLZXkgIT09IHVuZGVmaW5lZCA/IHsgaWRlbXBvdGVuY3lLZXkgfSA6IHt9KSxcbiAgICAgIH0sXG4gICAgKTtcblxuICAgIC8vIEVwaWMtbGlmdCBwcm9qZWN0b3IgKHJvYWRtYXAgXHUwMEE3MS4yKTogZmlyc3QgY2hpbGQgTEVBVklORyBiYWNrbG9nIGxpZnRzXG4gICAgLy8gdGhlIGZlYXR1cmU7IGlkZW1wb3RlbnQgYnkgY2hlY2s7IGF1dGhvcmVkIGJ5IHRoZSBzeXN0ZW0gYWN0b3IuXG4gICAgaWYgKGZyb20gPT09ICdiYWNrbG9nJyAmJiB0byAhPT0gJ2JhY2tsb2cnKSB7XG4gICAgICBjb25zdCBmZWF0dXJlID0gYXdhaXQgdGhpcy5nZXRGZWF0dXJlUm93KGl0ZW0uZmVhdHVyZUlkLCB0eCk7XG4gICAgICBpZiAoZmVhdHVyZSAmJiBmZWF0dXJlLnN0YXRlID09PSAnYmFja2xvZycpIHtcbiAgICAgICAgYXdhaXQgdHgudXBkYXRlKGZlYXR1cmVzKS5zZXQoeyBzdGF0ZTogJ2luX3Byb2dyZXNzJyB9KS53aGVyZShlcShmZWF0dXJlcy5pZCwgZmVhdHVyZS5pZCkpO1xuICAgICAgICBhd2FpdCB0aGlzLmFwcGVuZFR4KFxuICAgICAgICAgIHR4LFxuICAgICAgICAgICdmZWF0dXJlJyxcbiAgICAgICAgICBmZWF0dXJlLmlkLFxuICAgICAgICAgICdmZWF0dXJlLnN0YXRlX2NoYW5nZWQnLFxuICAgICAgICAgIHRoaXMuc3lzdGVtQWN0b3JJZCxcbiAgICAgICAgICB7IGZyb206ICdiYWNrbG9nJywgdG86ICdpbl9wcm9ncmVzcycgfSxcbiAgICAgICAgICB7IGNhdXNhdGlvbklkOiBTdHJpbmcoZXZlbnQuZ2xvYmFsU2VxKSB9LFxuICAgICAgICApO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIGRvbmVfY2hlY2twb2ludCAocm9hZG1hcCBcdTAwQTcxLjEpOiB0aGUgc3RvcnkgY29tcGxldGVzIG5vcm1hbGx5OyB0aGUgaG9sZFxuICAgIC8vIG1hdGVyaWFsaXplcyBvbiB0aGUgZmVhdHVyZSBleGFjdGx5IGF0IGNvbXBsZXRpb24uXG4gICAgaWYgKHRvID09PSAnZG9uZScgJiYgaXRlbS5kb25lQ2hlY2twb2ludCkge1xuICAgICAgY29uc3QgZmVhdHVyZSA9IGF3YWl0IHRoaXMuZ2V0RmVhdHVyZVJvdyhpdGVtLmZlYXR1cmVJZCwgdHgpO1xuICAgICAgaWYgKGZlYXR1cmUgJiYgIWZlYXR1cmUuZGlzcGF0Y2hIb2xkKSB7XG4gICAgICAgIGF3YWl0IHR4LnVwZGF0ZShmZWF0dXJlcykuc2V0KHsgZGlzcGF0Y2hIb2xkOiB0cnVlIH0pLndoZXJlKGVxKGZlYXR1cmVzLmlkLCBmZWF0dXJlLmlkKSk7XG4gICAgICAgIGF3YWl0IHRoaXMuYXBwZW5kVHgoXG4gICAgICAgICAgdHgsXG4gICAgICAgICAgJ2ZlYXR1cmUnLFxuICAgICAgICAgIGZlYXR1cmUuaWQsXG4gICAgICAgICAgJ2ZlYXR1cmUuZGlzcGF0Y2hfaG9sZF9yYWlzZWQnLFxuICAgICAgICAgIHRoaXMuc3lzdGVtQWN0b3JJZCxcbiAgICAgICAgICB7IHdvcmtJdGVtSWQ6IGl0ZW0uaWQgfSxcbiAgICAgICAgICB7IGNhdXNhdGlvbklkOiBTdHJpbmcoZXZlbnQuZ2xvYmFsU2VxKSB9LFxuICAgICAgICApO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIFJhaWxzIFx1MjE5MiBjaGF0OiBuYXJyYXRlIHRoZSB0cmFuc2l0aW9uIGludG8gYm91bmQgdGFzayB0aHJlYWRzIChcdTAwQTc1LjIpLlxuICAgIC8vIE1pcnJvciBvZiB0aGUgcmVmZXJlbmNlOiBFVkVSWSBleGVjdXRlVHJhbnNpdGlvbiBuYXJyYXRlcyAoZ2F0ZS1maXJlZCxcbiAgICAvLyBsb29wYmFjayBpbmNsdWRlZCk7IHByaXZpbGVnZWREb3duZ3JhZGUgZG9lcyBOT1QgZ28gdGhyb3VnaCBoZXJlIGFuZFxuICAgIC8vIHRoZXJlZm9yZSBkb2VzIG5vdCBuYXJyYXRlIFx1MjAxNCBleGFjdGx5IGxpa2UgdGhlIHJlZmVyZW5jZSBlbmdpbmUuXG4gICAgYXdhaXQgdGhpcy5uYXJyYXRlV29ya0l0ZW1UeCh0eCwgaXRlbS5pZCwgYHN0YXRlOiAke2Zyb219IFx1MjE5MiAke3RvfWApO1xuXG4gICAgY29uc3QgcmVzdWx0ID0gdGhpcy5wdWJsaWNJdGVtKHsgLi4uaXRlbSwgc3RhdGU6IHRvLCBzdGF0ZVZlcnNpb246IGl0ZW0uc3RhdGVWZXJzaW9uICsgMSB9KTtcbiAgICBpZiAoaWRlbXBvdGVuY3lLZXkgIT09IHVuZGVmaW5lZCkge1xuICAgICAgYXdhaXQgdHhcbiAgICAgICAgLmluc2VydChpZGVtcG90ZW5jeUtleXMpXG4gICAgICAgIC52YWx1ZXMoeyBrZXk6IGlkZW1wb3RlbmN5S2V5LCByZXN1bHQ6IHJlc3VsdCBhcyB1bmtub3duIGFzIFJlY29yZDxzdHJpbmcsIHVua25vd24+IH0pXG4gICAgICAgIC5vbkNvbmZsaWN0RG9Ob3RoaW5nKCk7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICBhc3luYyBibG9ja1Rhc2soaW5wdXQ6IHtcbiAgICB3b3JrSXRlbUlkOiBzdHJpbmc7XG4gICAgcmVhc29uOiBCbG9ja2VkUmVhc29uO1xuICAgIGFjdG9ySWQ6IHN0cmluZztcbiAgICBmZW5jaW5nVG9rZW4/OiBudW1iZXI7XG4gIH0pOiBQcm9taXNlPFdvcmtJdGVtPiB7XG4gICAgY29uc3QgaXRlbSA9IGF3YWl0IHRoaXMubXVzdEdldEl0ZW0oaW5wdXQud29ya0l0ZW1JZCk7XG4gICAgaWYgKCEoQkxPQ0tFRF9SRUFTT05TIGFzIHJlYWRvbmx5IHN0cmluZ1tdKS5pbmNsdWRlcyhpbnB1dC5yZWFzb24pKSB7XG4gICAgICB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcihgdW5rbm93biBibG9ja2luZyBjb25kaXRpb246ICR7aW5wdXQucmVhc29ufWApO1xuICAgIH1cbiAgICBhd2FpdCB0aGlzLnZhbGlkYXRlUHJlc2VudGVkVG9rZW4oaXRlbSwgaW5wdXQuZmVuY2luZ1Rva2VuLCBpbnB1dC5hY3RvcklkKTtcbiAgICBhd2FpdCB0aGlzLnJlcXVpcmVQZXJtaXNzaW9uKGlucHV0LmFjdG9ySWQsICd0YXNrLmJsb2NrJyk7XG4gICAgcmV0dXJuIHRoaXMuZGIudHJhbnNhY3Rpb24oYXN5bmMgKHR4KSA9PiB7XG4gICAgICBhd2FpdCB0eFxuICAgICAgICAudXBkYXRlKHdvcmtJdGVtcylcbiAgICAgICAgLnNldCh7IGJsb2NrZWRSZWFzb246IGlucHV0LnJlYXNvbiwgc3RhdGVWZXJzaW9uOiBpdGVtLnN0YXRlVmVyc2lvbiArIDEgfSlcbiAgICAgICAgLndoZXJlKGVxKHdvcmtJdGVtcy5pZCwgaXRlbS5pZCkpO1xuICAgICAgYXdhaXQgdGhpcy5hcHBlbmRUeCh0eCwgJ3dvcmtfaXRlbScsIGl0ZW0uaWQsICd3b3JrX2l0ZW0uYmxvY2tlZCcsIGlucHV0LmFjdG9ySWQsIHtcbiAgICAgICAgcmVhc29uOiBpbnB1dC5yZWFzb24sXG4gICAgICB9KTtcbiAgICAgIHJldHVybiB0aGlzLnB1YmxpY0l0ZW0oeyAuLi5pdGVtLCBibG9ja2VkUmVhc29uOiBpbnB1dC5yZWFzb24sIHN0YXRlVmVyc2lvbjogaXRlbS5zdGF0ZVZlcnNpb24gKyAxIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgYXN5bmMgdW5ibG9ja1Rhc2soaW5wdXQ6IHsgd29ya0l0ZW1JZDogc3RyaW5nOyBhY3RvcklkOiBzdHJpbmcgfSk6IFByb21pc2U8V29ya0l0ZW0+IHtcbiAgICBjb25zdCBpdGVtID0gYXdhaXQgdGhpcy5tdXN0R2V0SXRlbShpbnB1dC53b3JrSXRlbUlkKTtcbiAgICAvLyBcdTAwQTc0LjI6IHJldmlld19ub25fY29udmVyZ2VuY2UgY2FuIG9ubHkgYmUgcmVsZWFzZWQgYnkgYSByZXZpZXctZ2F0ZVxuICAgIC8vIGhvbGRlcjsgb3JkaW5hcnkgYmxvY2tzIHJlbGVhc2UgdW5kZXIgdGFzay5ibG9jay5cbiAgICBpZiAoaXRlbS5ibG9ja2VkUmVhc29uID09PSAncmV2aWV3X25vbl9jb252ZXJnZW5jZScpIHtcbiAgICAgIGF3YWl0IHRoaXMucmVxdWlyZVBlcm1pc3Npb24oaW5wdXQuYWN0b3JJZCwgJ2dhdGUucmV2aWV3LmFwcHJvdmUnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgYXdhaXQgdGhpcy5yZXF1aXJlUGVybWlzc2lvbihpbnB1dC5hY3RvcklkLCAndGFzay5ibG9jaycpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5kYi50cmFuc2FjdGlvbihhc3luYyAodHgpID0+IHtcbiAgICAgIGF3YWl0IHR4XG4gICAgICAgIC51cGRhdGUod29ya0l0ZW1zKVxuICAgICAgICAuc2V0KHsgYmxvY2tlZFJlYXNvbjogbnVsbCwgc3RhdGVWZXJzaW9uOiBpdGVtLnN0YXRlVmVyc2lvbiArIDEgfSlcbiAgICAgICAgLndoZXJlKGVxKHdvcmtJdGVtcy5pZCwgaXRlbS5pZCkpO1xuICAgICAgYXdhaXQgdGhpcy5hcHBlbmRUeCh0eCwgJ3dvcmtfaXRlbScsIGl0ZW0uaWQsICd3b3JrX2l0ZW0udW5ibG9ja2VkJywgaW5wdXQuYWN0b3JJZCwge30pO1xuICAgICAgcmV0dXJuIHRoaXMucHVibGljSXRlbSh7IC4uLml0ZW0sIGJsb2NrZWRSZWFzb246IG51bGwsIHN0YXRlVmVyc2lvbjogaXRlbS5zdGF0ZVZlcnNpb24gKyAxIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgLy8gLS0gZ2F0ZXMgJiBldmlkZW5jZSAocm9hZG1hcCBcdTAwQTcxLjQpIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIGFzeW5jIHN1Ym1pdEV2aWRlbmNlKGlucHV0OiB7XG4gICAgd29ya0l0ZW1JZDogc3RyaW5nO1xuICAgIGV2aWRlbmNlOiBFdmlkZW5jZTtcbiAgICBhY3RvcklkOiBzdHJpbmc7XG4gICAgZmVuY2luZ1Rva2VuPzogbnVtYmVyO1xuICB9KTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgaXRlbSA9IGF3YWl0IHRoaXMubXVzdEdldEl0ZW0oaW5wdXQud29ya0l0ZW1JZCk7XG4gICAgYXdhaXQgdGhpcy52YWxpZGF0ZVByZXNlbnRlZFRva2VuKGl0ZW0sIGlucHV0LmZlbmNpbmdUb2tlbiwgaW5wdXQuYWN0b3JJZCk7XG4gICAgYXdhaXQgdGhpcy5kYi50cmFuc2FjdGlvbihhc3luYyAodHgpID0+IHtcbiAgICAgIGF3YWl0IHR4Lmluc2VydChldmlkZW5jZVRhYmxlKS52YWx1ZXMoe1xuICAgICAgICB3b3JrSXRlbUlkOiBpdGVtLmlkLFxuICAgICAgICBraW5kOiBpbnB1dC5ldmlkZW5jZS5raW5kLFxuICAgICAgICBwYXlsb2FkOiBpbnB1dC5ldmlkZW5jZS5wYXlsb2FkLFxuICAgICAgfSk7XG4gICAgICBhd2FpdCB0aGlzLmFwcGVuZFR4KHR4LCAnd29ya19pdGVtJywgaXRlbS5pZCwgJ2V2aWRlbmNlLnN1Ym1pdHRlZCcsIGlucHV0LmFjdG9ySWQsIHtcbiAgICAgICAga2luZDogaW5wdXQuZXZpZGVuY2Uua2luZCxcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgYXN5bmMgYXBwcm92ZUdhdGUoaW5wdXQ6IEdhdGVEZWNpc2lvbklucHV0KTogUHJvbWlzZTxXb3JrSXRlbT4ge1xuICAgIGNvbnN0IGl0ZW0gPSBhd2FpdCB0aGlzLm11c3RHZXRJdGVtKGlucHV0LndvcmtJdGVtSWQpO1xuXG4gICAgaWYgKGlucHV0LmdhdGUgPT09ICdzcGVjX2FwcHJvdmFsJykge1xuICAgICAgLy8gUGVybWlzc2lvbiBwcmVjZWRlcyBhbnkgZWZmZWN0OiBhIGRlbmllZCBhdHRlbXB0IHBpbnMgbm90aGluZy5cbiAgICAgIGF3YWl0IHRoaXMucmVxdWlyZVBlcm1pc3Npb24oaW5wdXQuYWN0b3JJZCwgJ2dhdGUuc3BlYy5hcHByb3ZlJyk7XG4gICAgICBpZiAoaXRlbS5ibG9ja2VkUmVhc29uICE9PSBudWxsKSB7XG4gICAgICAgIHRocm93IG5ldyBHdWFyZEZhaWxlZEVycm9yKGB3b3JrIGl0ZW0gaXMgYmxvY2tlZDogJHtpdGVtLmJsb2NrZWRSZWFzb259YCk7XG4gICAgICB9XG4gICAgICBpZiAoaXRlbS5zdGF0ZSAhPT0gJ2RyYWZ0Jykge1xuICAgICAgICB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcihgc3BlY19hcHByb3ZhbCBhcHBsaWVzIHRvIGRyYWZ0IGl0ZW1zLCBub3QgJHtpdGVtLnN0YXRlfWApO1xuICAgICAgfVxuICAgICAgY29uc3QgcXVvcnVtTWV0ID0gYXdhaXQgdGhpcy5xdW9ydW1Xb3VsZEJlTWV0KGl0ZW0sICdzcGVjX2FwcHJvdmFsJywgaW5wdXQuYWN0b3JJZCk7XG4gICAgICByZXR1cm4gdGhpcy5kYi50cmFuc2FjdGlvbihhc3luYyAodHgpID0+IHtcbiAgICAgICAgbGV0IHBpbm5lZCA9IGl0ZW0ucGlubmVkVmVyaWZpY2F0aW9uO1xuICAgICAgICBpZiAoaW5wdXQucGlubmVkVmVyaWZpY2F0aW9uICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBwaW5uZWQgPSBbLi4uaW5wdXQucGlubmVkVmVyaWZpY2F0aW9uXTtcbiAgICAgICAgICBhd2FpdCB0eC51cGRhdGUod29ya0l0ZW1zKS5zZXQoeyBwaW5uZWRWZXJpZmljYXRpb246IHBpbm5lZCB9KS53aGVyZShlcSh3b3JrSXRlbXMuaWQsIGl0ZW0uaWQpKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBwaW5uZWRJdGVtID0geyAuLi5pdGVtLCBwaW5uZWRWZXJpZmljYXRpb246IHBpbm5lZCB9O1xuICAgICAgICBhd2FpdCB0aGlzLnJlY29yZEFwcHJvdmFsVHgodHgsIHBpbm5lZEl0ZW0sICdzcGVjX2FwcHJvdmFsJywgaW5wdXQuYWN0b3JJZCk7XG4gICAgICAgIGlmICghcXVvcnVtTWV0KSB7XG4gICAgICAgICAgLy8gRGVjaXNpb24gcmVjb3JkZWQ7IHF1b3J1bSBwZW5kaW5nIChnYXRlIHBvbGljeSBpcyBkYXRhLCByb2FkbWFwIFx1MDBBNzMpLlxuICAgICAgICAgIHJldHVybiB0aGlzLnB1YmxpY0l0ZW0ocGlubmVkSXRlbSk7XG4gICAgICAgIH1cbiAgICAgICAgLy8gVGhlIGFwcHJvdmFsIGZpcmVzIHRoZSBnYXRlZCBmb3J3YXJkIHRyYW5zaXRpb24gKGNvbmZvcm1hbmNlIHBpbikuXG4gICAgICAgIHJldHVybiB0aGlzLmV4ZWN1dGVUcmFuc2l0aW9uVHgodHgsIHBpbm5lZEl0ZW0sICdyZWFkeV9mb3JfZGV2JywgaW5wdXQuYWN0b3JJZCk7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICAvLyByZXZpZXdfYXBwcm92YWxcbiAgICBhd2FpdCB0aGlzLnJlcXVpcmVQZXJtaXNzaW9uKGlucHV0LmFjdG9ySWQsICdnYXRlLnJldmlldy5hcHByb3ZlJyk7XG4gICAgaWYgKGl0ZW0uYmxvY2tlZFJlYXNvbiAhPT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoYHdvcmsgaXRlbSBpcyBibG9ja2VkOiAke2l0ZW0uYmxvY2tlZFJlYXNvbn1gKTtcbiAgICB9XG4gICAgaWYgKGl0ZW0uc3RhdGUgIT09ICdpbl9yZXZpZXcnKSB7XG4gICAgICB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcihgcmV2aWV3X2FwcHJvdmFsIGFwcGxpZXMgdG8gaW5fcmV2aWV3IGl0ZW1zLCBub3QgJHtpdGVtLnN0YXRlfWApO1xuICAgIH1cbiAgICBjb25zdCBxdW9ydW1NZXQgPSBhd2FpdCB0aGlzLnF1b3J1bVdvdWxkQmVNZXQoaXRlbSwgJ3Jldmlld19hcHByb3ZhbCcsIGlucHV0LmFjdG9ySWQpO1xuICAgIC8vIEV2aWRlbmNlIGlzIGNoZWNrZWQgZXhhY3RseSB3aGVuIHRoZSBxdW9ydW0gd291bGQgY29tcGxldGUsIHNvIGEgZmFpbGVkXG4gICAgLy8gYXBwcm92YWwgcmVjb3JkcyBub3RoaW5nIChQaGFzZSAxIHBpbjogZGVuaWVkIGF0dGVtcHRzIG11dGF0ZSBub3RoaW5nKS5cbiAgICBpZiAocXVvcnVtTWV0KSBhd2FpdCB0aGlzLmNoZWNrUmV2aWV3RXZpZGVuY2UoaXRlbSk7XG4gICAgcmV0dXJuIHRoaXMuZGIudHJhbnNhY3Rpb24oYXN5bmMgKHR4KSA9PiB7XG4gICAgICBhd2FpdCB0aGlzLnJlY29yZEFwcHJvdmFsVHgodHgsIGl0ZW0sICdyZXZpZXdfYXBwcm92YWwnLCBpbnB1dC5hY3RvcklkKTtcbiAgICAgIGlmICghcXVvcnVtTWV0KSB7XG4gICAgICAgIHJldHVybiB0aGlzLnB1YmxpY0l0ZW0oaXRlbSk7IC8vIHF1b3J1bSBwZW5kaW5nIFx1MjAxNCBubyB0cmFuc2l0aW9uIHlldFxuICAgICAgfVxuICAgICAgcmV0dXJuIHRoaXMuZXhlY3V0ZVRyYW5zaXRpb25UeCh0eCwgaXRlbSwgJ2RvbmUnLCBpbnB1dC5hY3RvcklkKTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKiBEaXN0aW5jdCBhcHByb3ZlcnMgb2YgdGhpcyByb3VuZCAocm91bmQgPSByZXZpZXdMb29wSXRlcmF0aW9uIGF0IGRlY2lzaW9uIHRpbWUpLiAqL1xuICBwcml2YXRlIGFzeW5jIHJvdW5kQXBwcm92ZXJzKGl0ZW06IFdvcmtJdGVtUm93LCBnYXRlOiBHYXRlQ29kZSk6IFByb21pc2U8QWN0b3JSb3dbXT4ge1xuICAgIGNvbnN0IHJvd3MgPSBhd2FpdCB0aGlzLmRiXG4gICAgICAuc2VsZWN0KHsgYWN0b3JJZDogZ2F0ZURlY2lzaW9ucy5hY3RvcklkIH0pXG4gICAgICAuZnJvbShnYXRlRGVjaXNpb25zKVxuICAgICAgLndoZXJlKFxuICAgICAgICBhbmQoXG4gICAgICAgICAgZXEoZ2F0ZURlY2lzaW9ucy53b3JrSXRlbUlkLCBpdGVtLmlkKSxcbiAgICAgICAgICBlcShnYXRlRGVjaXNpb25zLmdhdGUsIGdhdGUpLFxuICAgICAgICAgIGVxKGdhdGVEZWNpc2lvbnMuZGVjaXNpb24sICdhcHByb3ZlZCcpLFxuICAgICAgICAgIGVxKGdhdGVEZWNpc2lvbnMucm91bmQsIGl0ZW0ucmV2aWV3TG9vcEl0ZXJhdGlvbiksXG4gICAgICAgICksXG4gICAgICApXG4gICAgICAub3JkZXJCeShhc2MoZ2F0ZURlY2lzaW9ucy5zZXEpKTtcbiAgICBjb25zdCBpZHMgPSBbLi4ubmV3IFNldChyb3dzLm1hcCgocm93KSA9PiByb3cuYWN0b3JJZCkpXTtcbiAgICBjb25zdCByZXN1bHQ6IEFjdG9yUm93W10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IGlkIG9mIGlkcykge1xuICAgICAgY29uc3QgYWN0b3IgPSBhd2FpdCB0aGlzLmdldEFjdG9yUm93KGlkKTtcbiAgICAgIGlmIChhY3RvcikgcmVzdWx0LnB1c2goYWN0b3IpO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgLyoqIEdhdGUgcG9saWN5IHF1b3J1bSAocm9hZG1hcCBcdTAwQTczKTogbWluIGRpc3RpbmN0IGFwcHJvdmVycyArIHJlcXVpcmVkIGFjdG9yIHR5cGVzLCBhcyBEQVRBLiAqL1xuICBwcml2YXRlIGFzeW5jIHF1b3J1bVdvdWxkQmVNZXQoaXRlbTogV29ya0l0ZW1Sb3csIGdhdGU6IEdhdGVDb2RlLCBuZXh0QXBwcm92ZXJJZDogc3RyaW5nKTogUHJvbWlzZTxib29sZWFuPiB7XG4gICAgY29uc3QgcG9saWN5ID0gYXdhaXQgdGhpcy5nZXRHYXRlUG9saWN5KGdhdGUpO1xuICAgIGNvbnN0IG1pbiA9IHBvbGljeS5taW5BcHByb3ZhbHMgPz8gMTtcbiAgICBjb25zdCByZXF1aXJlZCA9IHBvbGljeS5yZXF1aXJlZEFjdG9yVHlwZXMgPz8gW107XG4gICAgY29uc3QgYXBwcm92ZXJzID0gYXdhaXQgdGhpcy5yb3VuZEFwcHJvdmVycyhpdGVtLCBnYXRlKTtcbiAgICBjb25zdCBuZXh0QWN0b3IgPSBhd2FpdCB0aGlzLmdldEFjdG9yUm93KG5leHRBcHByb3ZlcklkKTtcbiAgICBpZiAobmV4dEFjdG9yICYmICFhcHByb3ZlcnMuc29tZSgoYSkgPT4gYS5pZCA9PT0gbmV4dEFjdG9yLmlkKSkgYXBwcm92ZXJzLnB1c2gobmV4dEFjdG9yKTtcbiAgICBpZiAoYXBwcm92ZXJzLmxlbmd0aCA8IG1pbikgcmV0dXJuIGZhbHNlO1xuICAgIGZvciAoY29uc3QgdHlwZSBvZiByZXF1aXJlZCkge1xuICAgICAgaWYgKCFhcHByb3ZlcnMuc29tZSgoYSkgPT4gYS50eXBlID09PSB0eXBlKSkgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgcmVjb3JkQXBwcm92YWxUeCh0eDogUXVlcnlhYmxlLCBpdGVtOiBXb3JrSXRlbVJvdywgZ2F0ZTogR2F0ZUNvZGUsIGFjdG9ySWQ6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xuICAgIGF3YWl0IHR4Lmluc2VydChnYXRlRGVjaXNpb25zKS52YWx1ZXMoe1xuICAgICAgd29ya0l0ZW1JZDogaXRlbS5pZCxcbiAgICAgIGdhdGUsXG4gICAgICBkZWNpc2lvbjogJ2FwcHJvdmVkJyxcbiAgICAgIGFjdG9ySWQsXG4gICAgICByb3VuZDogaXRlbS5yZXZpZXdMb29wSXRlcmF0aW9uLFxuICAgIH0pO1xuICAgIGF3YWl0IHRoaXMuYXBwZW5kVHgodHgsICd3b3JrX2l0ZW0nLCBpdGVtLmlkLCAnZ2F0ZS5hcHByb3ZlZCcsIGFjdG9ySWQsIHtcbiAgICAgIGdhdGUsXG4gICAgICByb3VuZDogaXRlbS5yZXZpZXdMb29wSXRlcmF0aW9uLFxuICAgICAgLi4uKGdhdGUgPT09ICdzcGVjX2FwcHJvdmFsJyA/IHsgcGlubmVkVmVyaWZpY2F0aW9uOiBpdGVtLnBpbm5lZFZlcmlmaWNhdGlvbiB9IDoge30pLFxuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEV2aWRlbmNlIGNvbmRpdGlvbiBvZiB0aGUgZG9uZSBnYXRlIChcdTAwQTcxLjQsIEQ3KTogZXZlcnkgUElOTkVEIGNvbW1hbmQnc1xuICAgKiBsYXRlc3QgdGVzdF9ydW4gZXhpdGVkIDAsIGFuZCB0aGUgZmluYWwgY29tbWl0IGlzIHJlYWNoYWJsZSBvbiB0aGVcbiAgICogcmVtb3RlLiByZXZpZXdfcmVwb3J0IGlzIG5ldmVyIGNvbnN1bHRlZC5cbiAgICovXG4gIHByaXZhdGUgYXN5bmMgY2hlY2tSZXZpZXdFdmlkZW5jZShpdGVtOiBXb3JrSXRlbVJvdyk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IHJvd3MgPSBhd2FpdCB0aGlzLmRiXG4gICAgICAuc2VsZWN0KClcbiAgICAgIC5mcm9tKGV2aWRlbmNlVGFibGUpXG4gICAgICAud2hlcmUoZXEoZXZpZGVuY2VUYWJsZS53b3JrSXRlbUlkLCBpdGVtLmlkKSlcbiAgICAgIC5vcmRlckJ5KGFzYyhldmlkZW5jZVRhYmxlLnNlcSkpO1xuICAgIGZvciAoY29uc3QgY29tbWFuZCBvZiBpdGVtLnBpbm5lZFZlcmlmaWNhdGlvbiA/PyBbXSkge1xuICAgICAgY29uc3QgcnVucyA9IHJvd3MuZmlsdGVyKChyb3cpID0+IHJvdy5raW5kID09PSAndGVzdF9ydW4nICYmIHJvdy5wYXlsb2FkWydjb21tYW5kJ10gPT09IGNvbW1hbmQpO1xuICAgICAgY29uc3QgbGF0ZXN0ID0gcnVuc1tydW5zLmxlbmd0aCAtIDFdO1xuICAgICAgaWYgKCFsYXRlc3QgfHwgbGF0ZXN0LnBheWxvYWRbJ2V4aXRDb2RlJ10gIT09IDApIHtcbiAgICAgICAgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoYHBpbm5lZCB2ZXJpZmljYXRpb24gZGlkIG5vdCBwYXNzOiAke2NvbW1hbmR9YCk7XG4gICAgICB9XG4gICAgfVxuICAgIGNvbnN0IGNvbW1pdE9rID0gcm93cy5zb21lKChyb3cpID0+IHJvdy5raW5kID09PSAnY29tbWl0JyAmJiByb3cucGF5bG9hZFsncmVhY2hhYmxlT25SZW1vdGUnXSA9PT0gdHJ1ZSk7XG4gICAgaWYgKCFjb21taXRPaykge1xuICAgICAgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoXG4gICAgICAgICdmaW5hbCByZXZpc2lvbiBtdXN0IGJlIHJlYWNoYWJsZSBvbiB0aGUgcmVtb3RlIChwdXNoIGlzIHBhcnQgb2YgdGhlIEhBTFQgY29udHJhY3QpJyxcbiAgICAgICk7XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgcmVqZWN0R2F0ZShpbnB1dDogR2F0ZURlY2lzaW9uSW5wdXQpOiBQcm9taXNlPFdvcmtJdGVtPiB7XG4gICAgY29uc3QgaXRlbSA9IGF3YWl0IHRoaXMubXVzdEdldEl0ZW0oaW5wdXQud29ya0l0ZW1JZCk7XG4gICAgaWYgKGlucHV0LmdhdGUgIT09ICdyZXZpZXdfYXBwcm92YWwnKSB7XG4gICAgICB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcignb25seSByZXZpZXdfYXBwcm92YWwgcmVqZWN0aW9uIGlzIGRlZmluZWQgaW4gUGhhc2UgMScpO1xuICAgIH1cbiAgICAvLyBQaGFzZSAyIChhZGRpdGl2ZSk6IHJlamVjdGlvbiBhdXRob3JpdHkgPSBnYXRlLnJldmlldy5hcHByb3ZlIE9SXG4gICAgLy8gZ2F0ZS5yZXZpZXcucmVqZWN0IFx1MjAxNCB0aGUgUGhhc2UgMiBleGl0IGNyaXRlcmlvbidzIHJldmlld2VyLWFnZW50IGhvbGRzXG4gICAgLy8gb25seSB0aGUgbGF0dGVyLiBFdmVyeSBQaGFzZSAxIHBpbiBvbiByZWplY3RHYXRlIGtlZXBzIGhvbGRpbmcuXG4gICAgaWYgKFxuICAgICAgIShhd2FpdCB0aGlzLmhhc1Blcm1pc3Npb24oaW5wdXQuYWN0b3JJZCwgJ2dhdGUucmV2aWV3LmFwcHJvdmUnKSkgJiZcbiAgICAgICEoYXdhaXQgdGhpcy5oYXNQZXJtaXNzaW9uKGlucHV0LmFjdG9ySWQsICdnYXRlLnJldmlldy5yZWplY3QnKSlcbiAgICApIHtcbiAgICAgIHRocm93IG5ldyBQZXJtaXNzaW9uRGVuaWVkRXJyb3IoJ2dhdGUucmV2aWV3LnJlamVjdCcsIGlucHV0LmFjdG9ySWQpO1xuICAgIH1cbiAgICBpZiAoaXRlbS5zdGF0ZSAhPT0gJ2luX3JldmlldycpIHtcbiAgICAgIHRocm93IG5ldyBHdWFyZEZhaWxlZEVycm9yKGByZXZpZXcgcmVqZWN0aW9uIGFwcGxpZXMgdG8gaW5fcmV2aWV3IGl0ZW1zLCBub3QgJHtpdGVtLnN0YXRlfWApO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5kYi50cmFuc2FjdGlvbihhc3luYyAodHgpID0+IHtcbiAgICAgIGF3YWl0IHR4Lmluc2VydChnYXRlRGVjaXNpb25zKS52YWx1ZXMoe1xuICAgICAgICB3b3JrSXRlbUlkOiBpdGVtLmlkLFxuICAgICAgICBnYXRlOiAncmV2aWV3X2FwcHJvdmFsJyxcbiAgICAgICAgZGVjaXNpb246ICdyZWplY3RlZCcsXG4gICAgICAgIGFjdG9ySWQ6IGlucHV0LmFjdG9ySWQsXG4gICAgICAgIHJvdW5kOiBpdGVtLnJldmlld0xvb3BJdGVyYXRpb24sXG4gICAgICB9KTtcbiAgICAgIGNvbnN0IGRlY2lzaW9uRXZlbnQgPSBhd2FpdCB0aGlzLmFwcGVuZFR4KHR4LCAnd29ya19pdGVtJywgaXRlbS5pZCwgJ2dhdGUucmVqZWN0ZWQnLCBpbnB1dC5hY3RvcklkLCB7XG4gICAgICAgIGdhdGU6ICdyZXZpZXdfYXBwcm92YWwnLFxuICAgICAgfSk7XG5cbiAgICAgIGlmIChpdGVtLnJldmlld0xvb3BJdGVyYXRpb24gPj0gUkVWSUVXX0xPT1BfTElNSVQpIHtcbiAgICAgICAgLy8gVGhlIDZ0aCByZWplY3Rpb24gcGVyZm9ybXMgbm8gbG9vcGJhY2s6IG92ZXJsYXkgcmV2aWV3X25vbl9jb252ZXJnZW5jZSxcbiAgICAgICAgLy8gc3RhdGUgZnJvemVuIGF0IGluX3JldmlldywgY291bnRlciB1bnRvdWNoZWQgKENPTkZPUk1BTkNFLm1kIHBpbikuXG4gICAgICAgIGF3YWl0IHR4XG4gICAgICAgICAgLnVwZGF0ZSh3b3JrSXRlbXMpXG4gICAgICAgICAgLnNldCh7IGJsb2NrZWRSZWFzb246ICdyZXZpZXdfbm9uX2NvbnZlcmdlbmNlJywgc3RhdGVWZXJzaW9uOiBpdGVtLnN0YXRlVmVyc2lvbiArIDEgfSlcbiAgICAgICAgICAud2hlcmUoZXEod29ya0l0ZW1zLmlkLCBpdGVtLmlkKSk7XG4gICAgICAgIGF3YWl0IHRoaXMuYXBwZW5kVHgoXG4gICAgICAgICAgdHgsXG4gICAgICAgICAgJ3dvcmtfaXRlbScsXG4gICAgICAgICAgaXRlbS5pZCxcbiAgICAgICAgICAnd29ya19pdGVtLmJsb2NrZWQnLFxuICAgICAgICAgIHRoaXMuc3lzdGVtQWN0b3JJZCxcbiAgICAgICAgICB7IHJlYXNvbjogJ3Jldmlld19ub25fY29udmVyZ2VuY2UnIH0sXG4gICAgICAgICAgeyBjYXVzYXRpb25JZDogU3RyaW5nKGRlY2lzaW9uRXZlbnQuZ2xvYmFsU2VxKSB9LFxuICAgICAgICApO1xuICAgICAgICByZXR1cm4gdGhpcy5wdWJsaWNJdGVtKHtcbiAgICAgICAgICAuLi5pdGVtLFxuICAgICAgICAgIGJsb2NrZWRSZWFzb246ICdyZXZpZXdfbm9uX2NvbnZlcmdlbmNlJyxcbiAgICAgICAgICBzdGF0ZVZlcnNpb246IGl0ZW0uc3RhdGVWZXJzaW9uICsgMSxcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIC8vIFx1MDBBNzEuMjogdGhlIGxvb3BiYWNrIGlzIGEgc3lzdGVtIGVmZmVjdCBcdTIwMTQgbm8gY2xhaW0taG9sZGVyIHBhcnRpY2lwYXRpb24uXG4gICAgICBhd2FpdCB0eFxuICAgICAgICAudXBkYXRlKHdvcmtJdGVtcylcbiAgICAgICAgLnNldCh7IHJldmlld0xvb3BJdGVyYXRpb246IGl0ZW0ucmV2aWV3TG9vcEl0ZXJhdGlvbiArIDEgfSlcbiAgICAgICAgLndoZXJlKGVxKHdvcmtJdGVtcy5pZCwgaXRlbS5pZCkpO1xuICAgICAgY29uc3QgYnVtcGVkID0geyAuLi5pdGVtLCByZXZpZXdMb29wSXRlcmF0aW9uOiBpdGVtLnJldmlld0xvb3BJdGVyYXRpb24gKyAxIH07XG4gICAgICByZXR1cm4gdGhpcy5leGVjdXRlVHJhbnNpdGlvblR4KFxuICAgICAgICB0eCxcbiAgICAgICAgYnVtcGVkLFxuICAgICAgICAnaW5fcHJvZ3Jlc3MnLFxuICAgICAgICB0aGlzLnN5c3RlbUFjdG9ySWQsXG4gICAgICAgIHVuZGVmaW5lZCxcbiAgICAgICAgU3RyaW5nKGRlY2lzaW9uRXZlbnQuZ2xvYmFsU2VxKSxcbiAgICAgICk7XG4gICAgfSk7XG4gIH1cblxuICAvLyAtLSBjb2xsYWJvcmF0aW9uIChQaGFzZSAzLCByb2FkbWFwIFx1MDBBNzUpIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIHByaXZhdGUgYXN5bmMgbXVzdEdldFRocmVhZCh0aHJlYWRJZDogc3RyaW5nLCB0eDogUXVlcnlhYmxlID0gdGhpcy5kYik6IFByb21pc2U8VGhyZWFkUm93PiB7XG4gICAgY29uc3Qgcm93cyA9IGF3YWl0IHR4LnNlbGVjdCgpLmZyb20odGhyZWFkcykud2hlcmUoZXEodGhyZWFkcy5pZCwgdGhyZWFkSWQpKS5saW1pdCgxKTtcbiAgICBjb25zdCByb3cgPSByb3dzWzBdO1xuICAgIGlmICghcm93KSB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcihgdW5rbm93biB0aHJlYWQ6ICR7dGhyZWFkSWR9YCk7XG4gICAgcmV0dXJuIHJvdztcbiAgfVxuXG4gIHByaXZhdGUgaXNQYXJ0aWNpcGFudCh0aHJlYWQ6IFRocmVhZFJvdywgYWN0b3JJZDogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRocmVhZC5jcmVhdGVkQnkgPT09IGFjdG9ySWQgfHwgdGhyZWFkLnBhcnRpY2lwYW50cy5pbmNsdWRlcyhhY3RvcklkKTtcbiAgfVxuXG4gIHByaXZhdGUgcHVibGljVGhyZWFkKHJvdzogT21pdDxUaHJlYWRSb3csICdzZXEnPik6IFRocmVhZCB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGlkOiByb3cuaWQsXG4gICAgICBmZWF0dXJlSWQ6IHJvdy5mZWF0dXJlSWQsXG4gICAgICB3b3JrSXRlbUlkOiByb3cud29ya0l0ZW1JZCxcbiAgICAgIGtpbmQ6IHJvdy5raW5kIGFzIFRocmVhZEtpbmQsXG4gICAgICB2aXNpYmlsaXR5OiByb3cudmlzaWJpbGl0eSBhcyBUaHJlYWRWaXNpYmlsaXR5LFxuICAgICAgY3JlYXRlZEJ5OiByb3cuY3JlYXRlZEJ5LFxuICAgICAgcGFydGljaXBhbnRzOiBbLi4ucm93LnBhcnRpY2lwYW50c10sXG4gICAgfTtcbiAgfVxuXG4gIHByaXZhdGUgcHVibGljTWVzc2FnZShyb3c6IE1lc3NhZ2VSb3cpOiBNZXNzYWdlIHtcbiAgICByZXR1cm4ge1xuICAgICAgaWQ6IHJvdy5pZCxcbiAgICAgIHRocmVhZElkOiByb3cudGhyZWFkSWQsXG4gICAgICBzZXE6IHJvdy5zZXEsXG4gICAgICBhdXRob3JJZDogcm93LmF1dGhvcklkLFxuICAgICAga2luZDogcm93LmtpbmQgYXMgTWVzc2FnZVsna2luZCddLFxuICAgICAgYm9keTogcm93LmJvZHksXG4gICAgICByZXBseVRvOiByb3cucmVwbHlUbyxcbiAgICB9O1xuICB9XG5cbiAgcHJpdmF0ZSBwdWJsaWNKb2Iocm93OiBPbWl0PEFnZW50Sm9iUm93LCAnc2VxJz4pOiBBZ2VudEpvYiB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGlkOiByb3cuaWQsXG4gICAgICBhZ2VudEFjdG9ySWQ6IHJvdy5hZ2VudEFjdG9ySWQsXG4gICAgICB0aHJlYWRJZDogcm93LnRocmVhZElkLFxuICAgICAgbWVzc2FnZUlkOiByb3cubWVzc2FnZUlkLFxuICAgICAgd29ya0l0ZW1JZDogcm93LndvcmtJdGVtSWQsXG4gICAgICBmZWF0dXJlSWQ6IHJvdy5mZWF0dXJlSWQsXG4gICAgICBzdGF0dXM6IHJvdy5zdGF0dXMgYXMgQWdlbnRKb2JbJ3N0YXR1cyddLFxuICAgICAgZGVwdGg6IHJvdy5kZXB0aCxcbiAgICAgIG5vdGU6IHJvdy5ub3RlLFxuICAgIH07XG4gIH1cblxuICBhc3luYyBjcmVhdGVUaHJlYWQoaW5wdXQ6IHtcbiAgICBhY3RvcklkOiBzdHJpbmc7XG4gICAga2luZDogVGhyZWFkS2luZDtcbiAgICBmZWF0dXJlSWQ/OiBzdHJpbmc7XG4gICAgd29ya0l0ZW1JZD86IHN0cmluZztcbiAgICB2aXNpYmlsaXR5PzogVGhyZWFkVmlzaWJpbGl0eTtcbiAgfSk6IFByb21pc2U8VGhyZWFkPiB7XG4gICAgaWYgKGlucHV0LmZlYXR1cmVJZCAhPT0gdW5kZWZpbmVkICYmIChhd2FpdCB0aGlzLmdldEZlYXR1cmVSb3coaW5wdXQuZmVhdHVyZUlkKSkgPT09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBHdWFyZEZhaWxlZEVycm9yKGB1bmtub3duIGZlYXR1cmU6ICR7aW5wdXQuZmVhdHVyZUlkfWApO1xuICAgIH1cbiAgICBsZXQgd29ya0l0ZW1JZDogc3RyaW5nIHwgbnVsbCA9IG51bGw7XG4gICAgaWYgKGlucHV0LndvcmtJdGVtSWQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgd29ya0l0ZW1JZCA9IChhd2FpdCB0aGlzLm11c3RHZXRJdGVtKGlucHV0LndvcmtJdGVtSWQpKS5pZDtcbiAgICB9XG4gICAgY29uc3QgdGhyZWFkID0ge1xuICAgICAgaWQ6IHRoaXMubmV4dElkKCd0aCcpLFxuICAgICAgZmVhdHVyZUlkOiBpbnB1dC5mZWF0dXJlSWQgPz8gbnVsbCxcbiAgICAgIHdvcmtJdGVtSWQsXG4gICAgICBraW5kOiBpbnB1dC5raW5kLFxuICAgICAgdmlzaWJpbGl0eTogaW5wdXQudmlzaWJpbGl0eSA/PyAoaW5wdXQua2luZCA9PT0gJ3ByaXZhdGUnID8gJ3ByaXZhdGUnIDogJ29wZW4nKSxcbiAgICAgIGNyZWF0ZWRCeTogaW5wdXQuYWN0b3JJZCxcbiAgICAgIHBhcnRpY2lwYW50czogW2lucHV0LmFjdG9ySWRdLFxuICAgIH07XG4gICAgcmV0dXJuIHRoaXMuZGIudHJhbnNhY3Rpb24oYXN5bmMgKHR4KSA9PiB7XG4gICAgICBhd2FpdCB0eC5pbnNlcnQodGhyZWFkcykudmFsdWVzKHRocmVhZCk7XG4gICAgICBhd2FpdCB0aGlzLmFwcGVuZFR4KHR4LCAndGhyZWFkJywgdGhyZWFkLmlkLCAndGhyZWFkLmNyZWF0ZWQnLCBpbnB1dC5hY3RvcklkLCB7XG4gICAgICAgIGtpbmQ6IHRocmVhZC5raW5kLFxuICAgICAgICBmZWF0dXJlSWQ6IHRocmVhZC5mZWF0dXJlSWQsXG4gICAgICAgIHdvcmtJdGVtSWQ6IHRocmVhZC53b3JrSXRlbUlkLFxuICAgICAgICB2aXNpYmlsaXR5OiB0aHJlYWQudmlzaWJpbGl0eSxcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIHRoaXMucHVibGljVGhyZWFkKHRocmVhZCk7XG4gICAgfSk7XG4gIH1cblxuICBhc3luYyBhZGRUaHJlYWRQYXJ0aWNpcGFudChpbnB1dDogeyB0aHJlYWRJZDogc3RyaW5nOyBhY3RvcklkOiBzdHJpbmc7IGJ5QWN0b3JJZDogc3RyaW5nIH0pOiBQcm9taXNlPFRocmVhZD4ge1xuICAgIGNvbnN0IHRocmVhZCA9IGF3YWl0IHRoaXMubXVzdEdldFRocmVhZChpbnB1dC50aHJlYWRJZCk7XG4gICAgaWYgKCF0aGlzLmlzUGFydGljaXBhbnQodGhyZWFkLCBpbnB1dC5ieUFjdG9ySWQpKSB7XG4gICAgICB0aHJvdyBuZXcgUGVybWlzc2lvbkRlbmllZEVycm9yKCd0aHJlYWQuaW52aXRlJywgaW5wdXQuYnlBY3RvcklkKTtcbiAgICB9XG4gICAgaWYgKChhd2FpdCB0aGlzLmdldEFjdG9yUm93KGlucHV0LmFjdG9ySWQpKSA9PT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoYHVua25vd24gYWN0b3I6ICR7aW5wdXQuYWN0b3JJZH1gKTtcbiAgICB9XG4gICAgaWYgKHRocmVhZC5wYXJ0aWNpcGFudHMuaW5jbHVkZXMoaW5wdXQuYWN0b3JJZCkpIHJldHVybiB0aGlzLnB1YmxpY1RocmVhZCh0aHJlYWQpO1xuICAgIGNvbnN0IHBhcnRpY2lwYW50cyA9IFsuLi50aHJlYWQucGFydGljaXBhbnRzLCBpbnB1dC5hY3RvcklkXTtcbiAgICByZXR1cm4gdGhpcy5kYi50cmFuc2FjdGlvbihhc3luYyAodHgpID0+IHtcbiAgICAgIGF3YWl0IHR4LnVwZGF0ZSh0aHJlYWRzKS5zZXQoeyBwYXJ0aWNpcGFudHMgfSkud2hlcmUoZXEodGhyZWFkcy5pZCwgdGhyZWFkLmlkKSk7XG4gICAgICBhd2FpdCB0aGlzLmFwcGVuZFR4KHR4LCAndGhyZWFkJywgdGhyZWFkLmlkLCAndGhyZWFkLnBhcnRpY2lwYW50X2FkZGVkJywgaW5wdXQuYnlBY3RvcklkLCB7XG4gICAgICAgIGFjdG9ySWQ6IGlucHV0LmFjdG9ySWQsXG4gICAgICB9KTtcbiAgICAgIHJldHVybiB0aGlzLnB1YmxpY1RocmVhZCh7IC4uLnRocmVhZCwgcGFydGljaXBhbnRzIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqIEludGVybmFsIGFwcGVuZCB0aGF0IG5ldmVyIHJ1bnMgdGhlIHJvdXRlciBcdTIwMTQgdXNlZCBmb3IgY2hhdCwgbmFycmF0aW9uIGFsaWtlLiAqL1xuICBwcml2YXRlIGFzeW5jIGFwcGVuZE1lc3NhZ2VUeChcbiAgICB0eDogUXVlcnlhYmxlLFxuICAgIHRocmVhZDogVGhyZWFkUm93IHwgT21pdDxUaHJlYWRSb3csICdzZXEnPixcbiAgICBhdXRob3JJZDogc3RyaW5nLFxuICAgIGtpbmQ6IE1lc3NhZ2VbJ2tpbmQnXSxcbiAgICBib2R5OiBzdHJpbmcsXG4gICAgcmVwbHlUbzogc3RyaW5nIHwgbnVsbCxcbiAgKTogUHJvbWlzZTxNZXNzYWdlPiB7XG4gICAgLy8gUGVyLXRocmVhZCwgMS1iYXNlZCwgZ2FwLWZyZWUgXHUyMDE0IFVOSVFVRSh0aHJlYWRfaWQsIHNlcSkgZW5mb3JjZXMgaXQsIHRoZVxuICAgIC8vIHNhbWUtdHJhbnNhY3Rpb24gbWF4KCkgY29tcHV0ZXMgaXQgKG1pcnJvcnMgdGhlIHJlZmVyZW5jZSBjb3VudCsxKS5cbiAgICBjb25zdCBbcm93XSA9IGF3YWl0IHR4XG4gICAgICAuc2VsZWN0KHsgbWF4U2VxOiBzcWw8bnVtYmVyPmBjb2FsZXNjZShtYXgoJHttZXNzYWdlcy5zZXF9KSwgMClgIH0pXG4gICAgICAuZnJvbShtZXNzYWdlcylcbiAgICAgIC53aGVyZShlcShtZXNzYWdlcy50aHJlYWRJZCwgdGhyZWFkLmlkKSk7XG4gICAgY29uc3Qgc2VxID0gTnVtYmVyKHJvdz8ubWF4U2VxID8/IDApICsgMTtcbiAgICBjb25zdCBtZXNzYWdlOiBNZXNzYWdlID0ge1xuICAgICAgaWQ6IHRoaXMubmV4dElkKCdtc2cnKSxcbiAgICAgIHRocmVhZElkOiB0aHJlYWQuaWQsXG4gICAgICBzZXEsXG4gICAgICBhdXRob3JJZCxcbiAgICAgIGtpbmQsXG4gICAgICBib2R5LFxuICAgICAgcmVwbHlUbyxcbiAgICB9O1xuICAgIGF3YWl0IHR4Lmluc2VydChtZXNzYWdlcykudmFsdWVzKG1lc3NhZ2UpO1xuICAgIGF3YWl0IHRoaXMuYXBwZW5kVHgodHgsICd0aHJlYWQnLCB0aHJlYWQuaWQsICdtZXNzYWdlLnBvc3RlZCcsIGF1dGhvcklkLCB7XG4gICAgICBtZXNzYWdlSWQ6IG1lc3NhZ2UuaWQsXG4gICAgICBraW5kLFxuICAgIH0pO1xuICAgIHJldHVybiB7IC4uLm1lc3NhZ2UgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBcdTAwQTc1LjI6IHRoZSBzZXJ2ZXIgTkVWRVIgcGFyc2VzIGJvZHkgdGV4dCBcdTIwMTQgYG1lbnRpb25zYCBpcyBzdHJ1Y3R1cmVkIGFjdG9yXG4gICAqIGlkcy4gXHUwMEE3NS40OiB0aGUgcm91dGVyIGlzIHB1cmUgY29kZSwgZGVmYXVsdC1kZW55LCBwb2xpY3ktZ2F0ZWQsXG4gICAqIGRlcHRoLWNhcHBlZDsgYSBqb2IgaXMgcmVwbHktb25seSBjb250ZXh0LCBuZXZlciBhIGNsYWltLlxuICAgKi9cbiAgYXN5bmMgcG9zdE1lc3NhZ2UoaW5wdXQ6IHtcbiAgICB0aHJlYWRJZDogc3RyaW5nO1xuICAgIGFjdG9ySWQ6IHN0cmluZztcbiAgICBib2R5OiBzdHJpbmc7XG4gICAgcmVwbHlUbz86IHN0cmluZztcbiAgICBtZW50aW9ucz86IHN0cmluZ1tdO1xuICB9KTogUHJvbWlzZTxNZXNzYWdlPiB7XG4gICAgY29uc3QgdGhyZWFkID0gYXdhaXQgdGhpcy5tdXN0R2V0VGhyZWFkKGlucHV0LnRocmVhZElkKTtcbiAgICBpZiAodGhyZWFkLnZpc2liaWxpdHkgPT09ICdwcml2YXRlJyAmJiAhdGhpcy5pc1BhcnRpY2lwYW50KHRocmVhZCwgaW5wdXQuYWN0b3JJZCkpIHtcbiAgICAgIHRocm93IG5ldyBQZXJtaXNzaW9uRGVuaWVkRXJyb3IoJ3RocmVhZC5wb3N0JywgaW5wdXQuYWN0b3JJZCk7XG4gICAgfVxuICAgIGNvbnN0IG1lbnRpb25JZHMgPSBbLi4ubmV3IFNldChpbnB1dC5tZW50aW9ucyA/PyBbXSldO1xuICAgIHJldHVybiB0aGlzLmRiLnRyYW5zYWN0aW9uKGFzeW5jICh0eCkgPT4ge1xuICAgICAgY29uc3QgbWVzc2FnZSA9IGF3YWl0IHRoaXMuYXBwZW5kTWVzc2FnZVR4KHR4LCB0aHJlYWQsIGlucHV0LmFjdG9ySWQsICdjaGF0JywgaW5wdXQuYm9keSwgaW5wdXQucmVwbHlUbyA/PyBudWxsKTtcbiAgICAgIGZvciAoY29uc3QgbWVudGlvbmVkSWQgb2YgbWVudGlvbklkcykge1xuICAgICAgICBjb25zdCBtZW50aW9uZWQgPSBhd2FpdCB0aGlzLmdldEFjdG9yUm93KG1lbnRpb25lZElkLCB0eCk7XG4gICAgICAgIGlmICghbWVudGlvbmVkKSB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcihgdW5rbm93biBtZW50aW9uZWQgYWN0b3I6ICR7bWVudGlvbmVkSWR9YCk7XG4gICAgICAgIGNvbnN0IHJlc29sdXRpb24gPSBhd2FpdCB0aGlzLnJvdXRlTWVudGlvblR4KHR4LCB0aHJlYWQsIG1lc3NhZ2UsIGlucHV0LmFjdG9ySWQsIG1lbnRpb25lZCk7XG4gICAgICAgIGF3YWl0IHR4Lmluc2VydChtZW50aW9ucykudmFsdWVzKHtcbiAgICAgICAgICBtZXNzYWdlSWQ6IG1lc3NhZ2UuaWQsXG4gICAgICAgICAgbWVudGlvbmVkQWN0b3JJZDogbWVudGlvbmVkSWQsXG4gICAgICAgICAgcmVzb2x1dGlvbixcbiAgICAgICAgfSk7XG4gICAgICAgIGF3YWl0IHRoaXMuYXBwZW5kVHgodHgsICd0aHJlYWQnLCB0aHJlYWQuaWQsICdtZW50aW9uLnJlY29yZGVkJywgaW5wdXQuYWN0b3JJZCwge1xuICAgICAgICAgIG1lc3NhZ2VJZDogbWVzc2FnZS5pZCxcbiAgICAgICAgICBtZW50aW9uZWRBY3RvcklkOiBtZW50aW9uZWRJZCxcbiAgICAgICAgICByZXNvbHV0aW9uLFxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBtZXNzYWdlO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqIFRoZSBkZXRlcm1pbmlzdGljIG1lbnRpb24gcm91dGVyIChcdTAwQTc1LjQpLiBSZXR1cm5zIHRoZSByZWNvcmRlZCByZXNvbHV0aW9uLiAqL1xuICBwcml2YXRlIGFzeW5jIHJvdXRlTWVudGlvblR4KFxuICAgIHR4OiBUeCxcbiAgICB0aHJlYWQ6IFRocmVhZFJvdyxcbiAgICBtZXNzYWdlOiBNZXNzYWdlLFxuICAgIG1lbnRpb25lcklkOiBzdHJpbmcsXG4gICAgbWVudGlvbmVkOiBBY3RvclJvdyxcbiAgKTogUHJvbWlzZTxNZW50aW9uUmVzb2x1dGlvbj4ge1xuICAgIGlmIChtZW50aW9uZWQudHlwZSAhPT0gJ2FnZW50Jykge1xuICAgICAgYXdhaXQgdGhpcy5wdXNoTm90aWZpY2F0aW9uVHgodHgsIG1lbnRpb25lZC5pZCwgJ21lbnRpb24nLCBtZXNzYWdlLmlkKTtcbiAgICAgIHJldHVybiAnbm90aWZpZWQnO1xuICAgIH1cbiAgICBjb25zdCBwb2xpY3kgPSAoYXdhaXQgdGhpcy53b3Jrc3BhY2VSb3codHgpKS5wb2xpY3kgYXMgV29ya3NwYWNlUG9saWN5O1xuICAgIC8vIGtpbGwtc3dpdGNoIGFwcGxpZXMgdG8gZXZlcnkgam9iLW1hdGVyaWFsaXppbmcgcGF0aFxuICAgIGlmIChwb2xpY3kubWVudGlvbkRpc3BhdGNoID09PSBmYWxzZSkgcmV0dXJuICdkZW5pZWRfcG9saWN5JztcblxuICAgIGNvbnN0IG1lbnRpb25lciA9IGF3YWl0IHRoaXMuZ2V0QWN0b3JSb3cobWVudGlvbmVySWQsIHR4KTtcbiAgICBsZXQgZGVwdGggPSAwO1xuICAgIGlmIChtZW50aW9uZXI/LnR5cGUgPT09ICdhZ2VudCcpIHtcbiAgICAgIC8vIGFnZW50LW1lbnRpb24tYWdlbnQ6IGV4cGxpY2l0IHBvbGljeSArIGRlcHRoIGNhcCAoXHUwMEE3NS40KVxuICAgICAgaWYgKHBvbGljeS5hZ2VudE1lbnRpb25BZ2VudCAhPT0gdHJ1ZSkgcmV0dXJuICdkZW5pZWRfcG9saWN5JztcbiAgICAgIGNvbnN0IG1lbnRpb25lckpvYnMgPSBhd2FpdCB0eFxuICAgICAgICAuc2VsZWN0KHsgZGVwdGg6IGFnZW50Sm9icy5kZXB0aCB9KVxuICAgICAgICAuZnJvbShhZ2VudEpvYnMpXG4gICAgICAgIC53aGVyZShlcShhZ2VudEpvYnMuYWdlbnRBY3RvcklkLCBtZW50aW9uZXJJZCkpO1xuICAgICAgZGVwdGggPSBNYXRoLm1heCgwLCAuLi5tZW50aW9uZXJKb2JzLm1hcCgoaikgPT4gai5kZXB0aCkpICsgMTtcbiAgICAgIGlmIChkZXB0aCA+IEFHRU5UX0pPQl9NQVhfREVQVEgpIHJldHVybiAnZGVuaWVkX2RlcHRoJztcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gZGVmYXVsdC1kZW55OiB0aGUgaHVtYW4gbWVudGlvbmVyIG11c3QgaG9sZCBpbnZva2UgYXV0aG9yaXR5IFx1MjAxNFxuICAgICAgLy8gYXQgbGVhc3Qgb25lIGFjdGl2ZSBkZWxpdmVyeSByb2xlLCBvciBnb3Zlcm5hbmNlIGFkbWluLlxuICAgICAgY29uc3QgaGFzUm9sZSA9XG4gICAgICAgIChcbiAgICAgICAgICBhd2FpdCB0eFxuICAgICAgICAgICAgLnNlbGVjdCh7IHNlcTogcm9sZUFzc2lnbm1lbnRzLnNlcSB9KVxuICAgICAgICAgICAgLmZyb20ocm9sZUFzc2lnbm1lbnRzKVxuICAgICAgICAgICAgLndoZXJlKGFuZChlcShyb2xlQXNzaWdubWVudHMuYWN0b3JJZCwgbWVudGlvbmVySWQpLCBlcShyb2xlQXNzaWdubWVudHMucmV2b2tlZCwgZmFsc2UpKSlcbiAgICAgICAgICAgIC5saW1pdCgxKVxuICAgICAgICApLmxlbmd0aCA+IDA7XG4gICAgICBjb25zdCBpc0FkbWluID0gbWVudGlvbmVyPy5nb3Zlcm5hbmNlUm9sZSA9PT0gJ2FkbWluJyB8fCBtZW50aW9uZXJJZCA9PT0gdGhpcy5zeXN0ZW1BY3RvcklkO1xuICAgICAgaWYgKCFoYXNSb2xlICYmICFpc0FkbWluKSByZXR1cm4gJ2RlbmllZF9wb2xpY3knO1xuICAgIH1cblxuICAgIGNvbnN0IGpvYiA9IHtcbiAgICAgIGlkOiB0aGlzLm5leHRJZCgnam9iJyksXG4gICAgICBhZ2VudEFjdG9ySWQ6IG1lbnRpb25lZC5pZCxcbiAgICAgIHRocmVhZElkOiB0aHJlYWQuaWQsXG4gICAgICBtZXNzYWdlSWQ6IG1lc3NhZ2UuaWQsXG4gICAgICB3b3JrSXRlbUlkOiB0aHJlYWQud29ya0l0ZW1JZCxcbiAgICAgIGZlYXR1cmVJZDogdGhyZWFkLmZlYXR1cmVJZCxcbiAgICAgIHN0YXR1czogJ3F1ZXVlZCcgYXMgY29uc3QsXG4gICAgICBkZXB0aCxcbiAgICAgIG5vdGU6IG51bGwsXG4gICAgfTtcbiAgICBhd2FpdCB0eC5pbnNlcnQoYWdlbnRKb2JzKS52YWx1ZXMoam9iKTtcbiAgICBhd2FpdCB0aGlzLmFwcGVuZFR4KHR4LCAnYWdlbnRfam9iJywgam9iLmlkLCAnYWdlbnRfam9iLmNyZWF0ZWQnLCBtZW50aW9uZXJJZCwge1xuICAgICAgYWdlbnRBY3RvcklkOiBtZW50aW9uZWQuaWQsXG4gICAgICB0aHJlYWRJZDogdGhyZWFkLmlkLFxuICAgICAgbWVzc2FnZUlkOiBtZXNzYWdlLmlkLFxuICAgICAgZGVwdGgsXG4gICAgfSk7XG4gICAgYXdhaXQgdGhpcy5wdXNoTm90aWZpY2F0aW9uVHgodHgsIG1lbnRpb25lZC5pZCwgJ21lbnRpb24nLCBtZXNzYWdlLmlkKTtcbiAgICByZXR1cm4gJ2pvYl9jcmVhdGVkJztcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgcHVzaE5vdGlmaWNhdGlvblR4KFxuICAgIHR4OiBRdWVyeWFibGUsXG4gICAgYWN0b3JJZDogc3RyaW5nLFxuICAgIHNvdXJjZTogTm90aWZpY2F0aW9uWydzb3VyY2UnXSxcbiAgICByZWZJZDogc3RyaW5nLFxuICApOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBhd2FpdCB0eC5pbnNlcnQobm90aWZpY2F0aW9ucykudmFsdWVzKHtcbiAgICAgIGlkOiB0aGlzLm5leHRJZCgnbnRmJyksXG4gICAgICBhY3RvcklkLFxuICAgICAgc291cmNlLFxuICAgICAgcmVmSWQsXG4gICAgICByZWFkOiBmYWxzZSxcbiAgICB9KTtcbiAgfVxuXG4gIGFzeW5jIGxpc3RUaHJlYWRzKGZpbHRlcj86IHsgZmVhdHVyZUlkPzogc3RyaW5nOyB3b3JrSXRlbUlkPzogc3RyaW5nOyBhY3RvcklkPzogc3RyaW5nIH0pOiBQcm9taXNlPFRocmVhZFtdPiB7XG4gICAgY29uc3Qgcm93cyA9IGF3YWl0IHRoaXMuZGIuc2VsZWN0KCkuZnJvbSh0aHJlYWRzKS5vcmRlckJ5KGFzYyh0aHJlYWRzLnNlcSkpO1xuICAgIC8vIExhemlseSByZXNvbHZlZCBsaWtlIHRoZSByZWZlcmVuY2U6IGFuIHVua25vd24gd29ya0l0ZW1JZCBvbmx5IHRocm93c1xuICAgIC8vIHdoZW4gYXQgbGVhc3Qgb25lIHRocmVhZCBpcyBleGFtaW5lZCAobXVzdEdldEl0ZW0gaW5zaWRlIHRoZSBmaWx0ZXIpLlxuICAgIGxldCByZXNvbHZlZFdvcmtJdGVtSWQ6IHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgICBpZiAoZmlsdGVyPy53b3JrSXRlbUlkICE9PSB1bmRlZmluZWQgJiYgcm93cy5sZW5ndGggPiAwKSB7XG4gICAgICByZXNvbHZlZFdvcmtJdGVtSWQgPSAoYXdhaXQgdGhpcy5tdXN0R2V0SXRlbShmaWx0ZXIud29ya0l0ZW1JZCkpLmlkO1xuICAgIH1cbiAgICBjb25zdCByZXN1bHQ6IFRocmVhZFtdID0gW107XG4gICAgZm9yIChjb25zdCByb3cgb2Ygcm93cykge1xuICAgICAgaWYgKGZpbHRlcj8uZmVhdHVyZUlkICE9PSB1bmRlZmluZWQgJiYgcm93LmZlYXR1cmVJZCAhPT0gZmlsdGVyLmZlYXR1cmVJZCkgY29udGludWU7XG4gICAgICBpZiAocmVzb2x2ZWRXb3JrSXRlbUlkICE9PSB1bmRlZmluZWQgJiYgcm93LndvcmtJdGVtSWQgIT09IHJlc29sdmVkV29ya0l0ZW1JZCkgY29udGludWU7XG4gICAgICBpZiAoXG4gICAgICAgIGZpbHRlcj8uYWN0b3JJZCAhPT0gdW5kZWZpbmVkICYmXG4gICAgICAgIHJvdy52aXNpYmlsaXR5ID09PSAncHJpdmF0ZScgJiZcbiAgICAgICAgIXRoaXMuaXNQYXJ0aWNpcGFudChyb3csIGZpbHRlci5hY3RvcklkKVxuICAgICAgKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgcmVzdWx0LnB1c2godGhpcy5wdWJsaWNUaHJlYWQocm93KSk7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICBhc3luYyBsaXN0TWVzc2FnZXMoaW5wdXQ6IHsgdGhyZWFkSWQ6IHN0cmluZzsgYWN0b3JJZDogc3RyaW5nOyBzaW5jZVNlcT86IG51bWJlciB9KTogUHJvbWlzZTxNZXNzYWdlW10+IHtcbiAgICBjb25zdCB0aHJlYWQgPSBhd2FpdCB0aGlzLm11c3RHZXRUaHJlYWQoaW5wdXQudGhyZWFkSWQpO1xuICAgIGlmICh0aHJlYWQudmlzaWJpbGl0eSA9PT0gJ3ByaXZhdGUnICYmICF0aGlzLmlzUGFydGljaXBhbnQodGhyZWFkLCBpbnB1dC5hY3RvcklkKSkge1xuICAgICAgdGhyb3cgbmV3IFBlcm1pc3Npb25EZW5pZWRFcnJvcigndGhyZWFkLnJlYWQnLCBpbnB1dC5hY3RvcklkKTtcbiAgICB9XG4gICAgY29uc3Qgcm93cyA9IGF3YWl0IHRoaXMuZGJcbiAgICAgIC5zZWxlY3QoKVxuICAgICAgLmZyb20obWVzc2FnZXMpXG4gICAgICAud2hlcmUoZXEobWVzc2FnZXMudGhyZWFkSWQsIHRocmVhZC5pZCkpXG4gICAgICAub3JkZXJCeShhc2MobWVzc2FnZXMuc2VxKSk7XG4gICAgcmV0dXJuIHJvd3NcbiAgICAgIC5maWx0ZXIoKG0pID0+IGlucHV0LnNpbmNlU2VxID09PSB1bmRlZmluZWQgfHwgbS5zZXEgPiBpbnB1dC5zaW5jZVNlcSlcbiAgICAgIC5tYXAoKG0pID0+IHRoaXMucHVibGljTWVzc2FnZShtKSk7XG4gIH1cblxuICBhc3luYyBsaXN0TWVudGlvbnMobWVzc2FnZUlkOiBzdHJpbmcpOiBQcm9taXNlPE1lbnRpb25bXT4ge1xuICAgIGNvbnN0IHJvd3MgPSBhd2FpdCB0aGlzLmRiXG4gICAgICAuc2VsZWN0KClcbiAgICAgIC5mcm9tKG1lbnRpb25zKVxuICAgICAgLndoZXJlKGVxKG1lbnRpb25zLm1lc3NhZ2VJZCwgbWVzc2FnZUlkKSlcbiAgICAgIC5vcmRlckJ5KGFzYyhtZW50aW9ucy5zZXEpKTtcbiAgICByZXR1cm4gcm93cy5tYXAoKHJvdykgPT4gKHtcbiAgICAgIG1lc3NhZ2VJZDogcm93Lm1lc3NhZ2VJZCxcbiAgICAgIG1lbnRpb25lZEFjdG9ySWQ6IHJvdy5tZW50aW9uZWRBY3RvcklkLFxuICAgICAgcmVzb2x1dGlvbjogcm93LnJlc29sdXRpb24gYXMgTWVudGlvblJlc29sdXRpb24sXG4gICAgfSkpO1xuICB9XG5cbiAgYXN5bmMgbGlzdE5vdGlmaWNhdGlvbnMoaW5wdXQ6IHsgYWN0b3JJZDogc3RyaW5nOyB1bnJlYWRPbmx5PzogYm9vbGVhbiB9KTogUHJvbWlzZTxOb3RpZmljYXRpb25bXT4ge1xuICAgIGNvbnN0IHJvd3MgPSBhd2FpdCB0aGlzLmRiXG4gICAgICAuc2VsZWN0KClcbiAgICAgIC5mcm9tKG5vdGlmaWNhdGlvbnMpXG4gICAgICAud2hlcmUoZXEobm90aWZpY2F0aW9ucy5hY3RvcklkLCBpbnB1dC5hY3RvcklkKSlcbiAgICAgIC5vcmRlckJ5KGFzYyhub3RpZmljYXRpb25zLnNlcSkpO1xuICAgIHJldHVybiByb3dzXG4gICAgICAuZmlsdGVyKChuKSA9PiBpbnB1dC51bnJlYWRPbmx5ICE9PSB0cnVlIHx8ICFuLnJlYWQpXG4gICAgICAubWFwKChuKSA9PiAoeyBpZDogbi5pZCwgYWN0b3JJZDogbi5hY3RvcklkLCBzb3VyY2U6IG4uc291cmNlIGFzIE5vdGlmaWNhdGlvblsnc291cmNlJ10sIHJlZklkOiBuLnJlZklkLCByZWFkOiBuLnJlYWQgfSkpO1xuICB9XG5cbiAgYXN5bmMgbWFya05vdGlmaWNhdGlvblJlYWQoaW5wdXQ6IHsgbm90aWZpY2F0aW9uSWQ6IHN0cmluZzsgYWN0b3JJZDogc3RyaW5nIH0pOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCByb3dzID0gYXdhaXQgdGhpcy5kYlxuICAgICAgLnNlbGVjdCgpXG4gICAgICAuZnJvbShub3RpZmljYXRpb25zKVxuICAgICAgLndoZXJlKGVxKG5vdGlmaWNhdGlvbnMuaWQsIGlucHV0Lm5vdGlmaWNhdGlvbklkKSlcbiAgICAgIC5saW1pdCgxKTtcbiAgICBjb25zdCBub3RpZmljYXRpb24gPSByb3dzWzBdO1xuICAgIGlmICghbm90aWZpY2F0aW9uKSB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcihgdW5rbm93biBub3RpZmljYXRpb246ICR7aW5wdXQubm90aWZpY2F0aW9uSWR9YCk7XG4gICAgaWYgKG5vdGlmaWNhdGlvbi5hY3RvcklkICE9PSBpbnB1dC5hY3RvcklkKSB7XG4gICAgICB0aHJvdyBuZXcgUGVybWlzc2lvbkRlbmllZEVycm9yKCd0aHJlYWQucmVhZCcsIGlucHV0LmFjdG9ySWQpO1xuICAgIH1cbiAgICBhd2FpdCB0aGlzLmRiLnVwZGF0ZShub3RpZmljYXRpb25zKS5zZXQoeyByZWFkOiB0cnVlIH0pLndoZXJlKGVxKG5vdGlmaWNhdGlvbnMuaWQsIG5vdGlmaWNhdGlvbi5pZCkpO1xuICB9XG5cbiAgYXN5bmMgbGlzdEFnZW50Sm9icyhmaWx0ZXI/OiB7IGFnZW50QWN0b3JJZD86IHN0cmluZzsgc3RhdHVzPzogQWdlbnRKb2JbJ3N0YXR1cyddIH0pOiBQcm9taXNlPEFnZW50Sm9iW10+IHtcbiAgICBjb25zdCByb3dzID0gYXdhaXQgdGhpcy5kYi5zZWxlY3QoKS5mcm9tKGFnZW50Sm9icykub3JkZXJCeShhc2MoYWdlbnRKb2JzLnNlcSkpO1xuICAgIHJldHVybiByb3dzXG4gICAgICAuZmlsdGVyKFxuICAgICAgICAoaikgPT5cbiAgICAgICAgICAoZmlsdGVyPy5hZ2VudEFjdG9ySWQgPT09IHVuZGVmaW5lZCB8fCBqLmFnZW50QWN0b3JJZCA9PT0gZmlsdGVyLmFnZW50QWN0b3JJZCkgJiZcbiAgICAgICAgICAoZmlsdGVyPy5zdGF0dXMgPT09IHVuZGVmaW5lZCB8fCBqLnN0YXR1cyA9PT0gZmlsdGVyLnN0YXR1cyksXG4gICAgICApXG4gICAgICAubWFwKChqKSA9PiB0aGlzLnB1YmxpY0pvYihqKSk7XG4gIH1cblxuICBhc3luYyBjb21wbGV0ZUFnZW50Sm9iKGlucHV0OiB7XG4gICAgam9iSWQ6IHN0cmluZztcbiAgICBhY3RvcklkOiBzdHJpbmc7XG4gICAgc3RhdHVzOiAnZG9uZScgfCAnYmxvY2tlZCc7XG4gICAgbm90ZT86IHN0cmluZztcbiAgfSk6IFByb21pc2U8QWdlbnRKb2I+IHtcbiAgICBjb25zdCByb3dzID0gYXdhaXQgdGhpcy5kYi5zZWxlY3QoKS5mcm9tKGFnZW50Sm9icykud2hlcmUoZXEoYWdlbnRKb2JzLmlkLCBpbnB1dC5qb2JJZCkpLmxpbWl0KDEpO1xuICAgIGNvbnN0IGpvYiA9IHJvd3NbMF07XG4gICAgaWYgKCFqb2IpIHRocm93IG5ldyBHdWFyZEZhaWxlZEVycm9yKGB1bmtub3duIGFnZW50IGpvYjogJHtpbnB1dC5qb2JJZH1gKTtcbiAgICBpZiAoam9iLmFnZW50QWN0b3JJZCAhPT0gaW5wdXQuYWN0b3JJZCkge1xuICAgICAgdGhyb3cgbmV3IFBlcm1pc3Npb25EZW5pZWRFcnJvcignYWdlbnRfam9iLmNvbXBsZXRlJywgaW5wdXQuYWN0b3JJZCk7XG4gICAgfVxuICAgIGlmIChqb2Iuc3RhdHVzICE9PSAncXVldWVkJykgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoYGFnZW50IGpvYiAke2pvYi5pZH0gaXMgYWxyZWFkeSAke2pvYi5zdGF0dXN9YCk7XG4gICAgY29uc3Qgbm90ZSA9IGlucHV0Lm5vdGUgPz8gbnVsbDtcbiAgICByZXR1cm4gdGhpcy5kYi50cmFuc2FjdGlvbihhc3luYyAodHgpID0+IHtcbiAgICAgIGF3YWl0IHR4LnVwZGF0ZShhZ2VudEpvYnMpLnNldCh7IHN0YXR1czogaW5wdXQuc3RhdHVzLCBub3RlIH0pLndoZXJlKGVxKGFnZW50Sm9icy5pZCwgam9iLmlkKSk7XG4gICAgICBhd2FpdCB0aGlzLmFwcGVuZFR4KHR4LCAnYWdlbnRfam9iJywgam9iLmlkLCAnYWdlbnRfam9iLmNvbXBsZXRlZCcsIGlucHV0LmFjdG9ySWQsIHtcbiAgICAgICAgc3RhdHVzOiBpbnB1dC5zdGF0dXMsXG4gICAgICAgIG5vdGUsXG4gICAgICB9KTtcbiAgICAgIC8vIG5vdGlmeSB0aGUgbWVudGlvbmVyIFx1MjAxNCB0aGUgcmV2ZXJzZSBkaXJlY3Rpb24gaXMgYSBtZXNzYWdlICsgbm90aWZpY2F0aW9uLCBub3RoaW5nIG1vcmUgKFx1MDBBNzUuNClcbiAgICAgIGNvbnN0IHRyaWdnZXIgPSAoXG4gICAgICAgIGF3YWl0IHR4XG4gICAgICAgICAgLnNlbGVjdCh7IGF1dGhvcklkOiBtZXNzYWdlcy5hdXRob3JJZCB9KVxuICAgICAgICAgIC5mcm9tKG1lc3NhZ2VzKVxuICAgICAgICAgIC53aGVyZShlcShtZXNzYWdlcy5pZCwgam9iLm1lc3NhZ2VJZCkpXG4gICAgICAgICAgLmxpbWl0KDEpXG4gICAgICApWzBdO1xuICAgICAgaWYgKHRyaWdnZXIpIGF3YWl0IHRoaXMucHVzaE5vdGlmaWNhdGlvblR4KHR4LCB0cmlnZ2VyLmF1dGhvcklkLCAnam9iX2NvbXBsZXRlZCcsIGpvYi5pZCk7XG4gICAgICByZXR1cm4gdGhpcy5wdWJsaWNKb2IoeyAuLi5qb2IsIHN0YXR1czogaW5wdXQuc3RhdHVzLCBub3RlIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgLyoqIFJhaWxzIFx1MjE5MiBjaGF0IG5hcnJhdGlvbiAoXHUwMEE3NS4yKTogc3RhdGUgY2hhbmdlcyBuYXJyYXRlIGludG8gYm91bmQgdGFzayB0aHJlYWRzLiAqL1xuICBwcml2YXRlIGFzeW5jIG5hcnJhdGVXb3JrSXRlbVR4KHR4OiBUeCwgd29ya0l0ZW1JZDogc3RyaW5nLCBib2R5OiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCBib3VuZCA9IGF3YWl0IHR4XG4gICAgICAuc2VsZWN0KClcbiAgICAgIC5mcm9tKHRocmVhZHMpXG4gICAgICAud2hlcmUoZXEodGhyZWFkcy53b3JrSXRlbUlkLCB3b3JrSXRlbUlkKSlcbiAgICAgIC5vcmRlckJ5KGFzYyh0aHJlYWRzLnNlcSkpO1xuICAgIGZvciAoY29uc3QgdGhyZWFkIG9mIGJvdW5kKSB7XG4gICAgICBhd2FpdCB0aGlzLmFwcGVuZE1lc3NhZ2VUeCh0eCwgdGhyZWFkLCB0aGlzLnN5c3RlbUFjdG9ySWQsICdzeXN0ZW0nLCBib2R5LCBudWxsKTtcbiAgICB9XG4gIH1cblxuICAvLyAtLSBkaXNwYXRjaCAocm9hZG1hcCBcdTAwQTcyLjMpIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgYXN5bmMgZ2V0VGFza0NvbnRleHQoaW5wdXQ6IHsgd29ya0l0ZW1JZDogc3RyaW5nIH0pOiBQcm9taXNlPHsgd29ya0l0ZW06IFdvcmtJdGVtOyBlbnRyeVN0YXRlOiBXb3JrSXRlbVN0YXRlIH0+IHtcbiAgICBjb25zdCBpdGVtID0gYXdhaXQgdGhpcy5tdXN0R2V0SXRlbShpbnB1dC53b3JrSXRlbUlkKTtcbiAgICBpZiAoaXRlbS5zdGF0ZSA9PT0gJ2RvbmUnKSB7XG4gICAgICB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcignZG9uZSBpdGVtcyBhcmUgbmV2ZXIgcmUtZGlzcGF0Y2hlZDsgZm9sbG93LXVwIHJldmlldyBpcyBhIG5ldyB3b3JrIGl0ZW0nKTtcbiAgICB9XG4gICAgY29uc3QgZmVhdHVyZSA9IGF3YWl0IHRoaXMuZ2V0RmVhdHVyZVJvdyhpdGVtLmZlYXR1cmVJZCk7XG4gICAgaWYgKGZlYXR1cmU/LmRpc3BhdGNoSG9sZCkge1xuICAgICAgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoJ2ZlYXR1cmUgaXMgdW5kZXIgYSBkb25lX2NoZWNrcG9pbnQgZGlzcGF0Y2ggaG9sZCcpO1xuICAgIH1cbiAgICByZXR1cm4geyB3b3JrSXRlbTogdGhpcy5wdWJsaWNJdGVtKGl0ZW0pLCBlbnRyeVN0YXRlOiBpdGVtLnN0YXRlIGFzIFdvcmtJdGVtU3RhdGUgfTtcbiAgfVxuXG4gIGFzeW5jIHJlbGVhc2VEaXNwYXRjaEhvbGQoaW5wdXQ6IHsgZmVhdHVyZUlkOiBzdHJpbmc7IGFjdG9ySWQ6IHN0cmluZyB9KTogUHJvbWlzZTxGZWF0dXJlPiB7XG4gICAgYXdhaXQgdGhpcy5yZXF1aXJlUGVybWlzc2lvbihpbnB1dC5hY3RvcklkLCAnZGlzcGF0Y2gucmVsZWFzZV9ob2xkJyk7XG4gICAgY29uc3QgZmVhdHVyZSA9IGF3YWl0IHRoaXMuZ2V0RmVhdHVyZVJvdyhpbnB1dC5mZWF0dXJlSWQpO1xuICAgIGlmICghZmVhdHVyZSkgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoYHVua25vd24gZmVhdHVyZTogJHtpbnB1dC5mZWF0dXJlSWR9YCk7XG4gICAgcmV0dXJuIHRoaXMuZGIudHJhbnNhY3Rpb24oYXN5bmMgKHR4KSA9PiB7XG4gICAgICBhd2FpdCB0eC51cGRhdGUoZmVhdHVyZXMpLnNldCh7IGRpc3BhdGNoSG9sZDogZmFsc2UgfSkud2hlcmUoZXEoZmVhdHVyZXMuaWQsIGZlYXR1cmUuaWQpKTtcbiAgICAgIGF3YWl0IHRoaXMuYXBwZW5kVHgodHgsICdmZWF0dXJlJywgZmVhdHVyZS5pZCwgJ2ZlYXR1cmUuZGlzcGF0Y2hfaG9sZF9yZWxlYXNlZCcsIGlucHV0LmFjdG9ySWQsIHt9KTtcbiAgICAgIHJldHVybiB0aGlzLnB1YmxpY0ZlYXR1cmUoeyAuLi5mZWF0dXJlLCBkaXNwYXRjaEhvbGQ6IGZhbHNlIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgLy8gLS0gcmVjb25jaWxpYXRpb24gKHJvYWRtYXAgXHUwMEE3MS42LCBENjogZGV0ZWN0LW9ubHksIG5ldmVyIG11dGF0ZXMpIC0tLS0tLS0tLS0tLVxuXG4gIGFzeW5jIHJlY29uY2lsZShpbnB1dDoge1xuICAgIGZpbGVzOiBBcnJheTx7IHdvcmtJdGVtSWQ6IHN0cmluZzsgZnJvbnRtYXR0ZXJTdGF0dXM6IHN0cmluZyB9PjtcbiAgfSk6IFByb21pc2U8RGl2ZXJnZW5jZVJlcG9ydFtdPiB7XG4gICAgY29uc3QgcmVwb3J0czogRGl2ZXJnZW5jZVJlcG9ydFtdID0gW107XG4gICAgZm9yIChjb25zdCBmaWxlIG9mIGlucHV0LmZpbGVzKSB7XG4gICAgICBjb25zdCBpdGVtID0gYXdhaXQgdGhpcy5tdXN0R2V0SXRlbShmaWxlLndvcmtJdGVtSWQpO1xuICAgICAgLy8gRmlsZXMgdW5kZXIgYSBsaXZlIGNsYWltIGFyZSBleGNsdWRlZCBcdTIwMTQgcGxheWJvb2tzIGxlZ2l0aW1hdGVseSB3cml0ZVxuICAgICAgLy8gZnJvbnRtYXR0ZXIgbWlkLXJ1biAoXHUwMEE3MS42KS5cbiAgICAgIGlmICgoYXdhaXQgdGhpcy5saXZlQ2xhaW0oaXRlbS5pZCkpICE9PSBudWxsKSBjb250aW51ZTtcblxuICAgICAgY29uc3QgcmF3ID0gZmlsZS5mcm9udG1hdHRlclN0YXR1cy50cmltKCk7XG4gICAgICBjb25zdCBkYlN0YXRlID0gaXRlbS5zdGF0ZSBhcyBXb3JrSXRlbVN0YXRlO1xuICAgICAgaWYgKHJhdyA9PT0gJ2Jsb2NrZWQnKSB7XG4gICAgICAgIC8vIEQ4OiBvdmVybGF5IGluIHRoZSBEQiBhbmQgYHN0YXR1czogYmxvY2tlZGAgaW4gdGhlIGZpbGUgYXJlIHRoZVxuICAgICAgICAvLyBzYW1lIHRydXRoLiBCbG9ja2VkLWluLWZpbGUgd2l0aCBOTyBvdmVybGF5IGlzIHJlYWwgZHJpZnQuXG4gICAgICAgIGlmIChpdGVtLmJsb2NrZWRSZWFzb24gIT09IG51bGwpIGNvbnRpbnVlO1xuICAgICAgICByZXBvcnRzLnB1c2goeyB3b3JrSXRlbUlkOiBpdGVtLmlkLCBmaWxlU3RhdGU6IHJhdywgZGJTdGF0ZSwga2luZDogJ2NvbmZsaWN0JyB9KTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IG5vcm1hbGl6ZWQgPSBMRUdBQ1lfU1RBVFVTW3Jhd107XG4gICAgICBpZiAobm9ybWFsaXplZCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJlcG9ydHMucHVzaCh7IHdvcmtJdGVtSWQ6IGl0ZW0uaWQsIGZpbGVTdGF0ZTogcmF3LCBkYlN0YXRlLCBraW5kOiAnY29uZmxpY3QnIH0pO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGlmIChub3JtYWxpemVkID09PSBkYlN0YXRlKSBjb250aW51ZTtcbiAgICAgIHJlcG9ydHMucHVzaCh7XG4gICAgICAgIHdvcmtJdGVtSWQ6IGl0ZW0uaWQsXG4gICAgICAgIGZpbGVTdGF0ZTogcmF3LFxuICAgICAgICBkYlN0YXRlLFxuICAgICAgICBraW5kOiBSQU5LW25vcm1hbGl6ZWRdID4gUkFOS1tkYlN0YXRlXSA/ICdmaWxlX2FoZWFkJyA6ICdkYl9haGVhZCcsXG4gICAgICB9KTtcbiAgICB9XG4gICAgcmV0dXJuIHJlcG9ydHM7XG4gIH1cblxuICAvLyAtLSBxdWVyaWVzIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIGFzeW5jIGdldFdvcmtJdGVtKGlkOiBzdHJpbmcpOiBQcm9taXNlPFdvcmtJdGVtPiB7XG4gICAgcmV0dXJuIHRoaXMucHVibGljSXRlbShhd2FpdCB0aGlzLm11c3RHZXRJdGVtKGlkKSk7XG4gIH1cblxuICBhc3luYyBnZXRGZWF0dXJlKGlkOiBzdHJpbmcpOiBQcm9taXNlPEZlYXR1cmU+IHtcbiAgICBjb25zdCBmZWF0dXJlID0gYXdhaXQgdGhpcy5nZXRGZWF0dXJlUm93KGlkKTtcbiAgICBpZiAoIWZlYXR1cmUpIHRocm93IG5ldyBHdWFyZEZhaWxlZEVycm9yKGB1bmtub3duIGZlYXR1cmU6ICR7aWR9YCk7XG4gICAgcmV0dXJuIHRoaXMucHVibGljRmVhdHVyZShmZWF0dXJlKTtcbiAgfVxuXG4gIGFzeW5jIGxpc3RXb3JrSXRlbXMoZmlsdGVyPzoge1xuICAgIHN0YXRlPzogV29ya0l0ZW1TdGF0ZTtcbiAgICBmZWF0dXJlSWQ/OiBzdHJpbmc7XG4gICAgY2xhaW1hYmxlPzogYm9vbGVhbjtcbiAgfSk6IFByb21pc2U8V29ya0l0ZW1bXT4ge1xuICAgIGNvbnN0IHJvd3MgPSBhd2FpdCB0aGlzLmRiLnNlbGVjdCgpLmZyb20od29ya0l0ZW1zKS5vcmRlckJ5KGFzYyh3b3JrSXRlbXMuc2VxKSk7XG4gICAgY29uc3QgcmVzdWx0OiBXb3JrSXRlbVtdID0gW107XG4gICAgZm9yIChjb25zdCByb3cgb2Ygcm93cykge1xuICAgICAgaWYgKGZpbHRlcj8uc3RhdGUgIT09IHVuZGVmaW5lZCAmJiByb3cuc3RhdGUgIT09IGZpbHRlci5zdGF0ZSkgY29udGludWU7XG4gICAgICBpZiAoZmlsdGVyPy5mZWF0dXJlSWQgIT09IHVuZGVmaW5lZCAmJiByb3cuZmVhdHVyZUlkICE9PSBmaWx0ZXIuZmVhdHVyZUlkKSBjb250aW51ZTtcbiAgICAgIGlmIChmaWx0ZXI/LmNsYWltYWJsZSA9PT0gdHJ1ZSAmJiAoYXdhaXQgdGhpcy5saXZlQ2xhaW0ocm93LmlkKSkgIT09IG51bGwpIGNvbnRpbnVlO1xuICAgICAgcmVzdWx0LnB1c2godGhpcy5wdWJsaWNJdGVtKHJvdykpO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgYXN5bmMgZ2V0Q2xhaW1zKHdvcmtJdGVtSWQ6IHN0cmluZyk6IFByb21pc2U8Q2xhaW1bXT4ge1xuICAgIGNvbnN0IGl0ZW0gPSBhd2FpdCB0aGlzLm11c3RHZXRJdGVtKHdvcmtJdGVtSWQpO1xuICAgIGNvbnN0IHJvd3MgPSBhd2FpdCB0aGlzLmRiXG4gICAgICAuc2VsZWN0KClcbiAgICAgIC5mcm9tKGNsYWltcylcbiAgICAgIC53aGVyZShlcShjbGFpbXMud29ya0l0ZW1JZCwgaXRlbS5pZCkpXG4gICAgICAub3JkZXJCeShhc2MoY2xhaW1zLnNlcSkpO1xuICAgIHJldHVybiByb3dzLm1hcCgocm93KSA9PiB0aGlzLnB1YmxpY0NsYWltKHJvdykpO1xuICB9XG5cbiAgYXN5bmMgZXZlbnRzKHN0cmVhbUlkPzogc3RyaW5nKTogUHJvbWlzZTxTcGluZUV2ZW50W10+IHtcbiAgICBjb25zdCByb3dzID1cbiAgICAgIHN0cmVhbUlkID09PSB1bmRlZmluZWRcbiAgICAgICAgPyBhd2FpdCB0aGlzLmRiLnNlbGVjdCgpLmZyb20oZXZlbnRzKS5vcmRlckJ5KGFzYyhldmVudHMuZ2xvYmFsU2VxKSlcbiAgICAgICAgOiBhd2FpdCB0aGlzLmRiLnNlbGVjdCgpLmZyb20oZXZlbnRzKS53aGVyZShlcShldmVudHMuc3RyZWFtSWQsIHN0cmVhbUlkKSkub3JkZXJCeShhc2MoZXZlbnRzLmdsb2JhbFNlcSkpO1xuICAgIHJldHVybiByb3dzLm1hcCgocm93KSA9PiB0aGlzLmV2ZW50RnJvbVJvdyhyb3cpKTtcbiAgfVxufVxuIiwgIi8qKlxuICogU3luY2hyb25vdXMgZmFjYWRlIG92ZXIgdGhlIGFzeW5jIFBnRW5naW5lIHJ1bm5pbmcgaW4gYSBzeW5ja2l0IHdvcmtlci5cbiAqIEltcGxlbWVudHMgdGhlIGV4YWN0IEBvYWhzL2NvcmUgU3BpbmVFbmdpbmUgaW50ZXJmYWNlLCBzbyB0aGUgY29uZm9ybWFuY2VcbiAqIHN1aXRlIGRyaXZlcyBQb3N0Z3JlcyB0aHJvdWdoIHRoZSBzYW1lIGNhbGxzIGl0IGRyaXZlcyB0aGUgbWVtb3J5IGVuZ2luZS5cbiAqL1xuaW1wb3J0IHsgY3JlYXRlUmVxdWlyZSB9IGZyb20gJ25vZGU6bW9kdWxlJztcbmltcG9ydCB7IGRpcm5hbWUsIGpvaW4gfSBmcm9tICdub2RlOnBhdGgnO1xuaW1wb3J0IHsgZmlsZVVSTFRvUGF0aCB9IGZyb20gJ25vZGU6dXJsJztcbmltcG9ydCB7IGNyZWF0ZVN5bmNGbiB9IGZyb20gJ3N5bmNraXQnO1xuXG5pbXBvcnQge1xuICBDb25mbGljdEVycm9yLFxuICBHdWFyZEZhaWxlZEVycm9yLFxuICBJbnZhbGlkVHJhbnNpdGlvbkVycm9yLFxuICBQZXJtaXNzaW9uRGVuaWVkRXJyb3IsXG4gIFN0b3JpZXNWYWxpZGF0aW9uRXJyb3IsXG4gIHR5cGUgU3BpbmVFbmdpbmUsXG59IGZyb20gJ0BvYWhzL2NvcmUnO1xuXG5jb25zdCBoZXJlID0gZGlybmFtZShmaWxlVVJMVG9QYXRoKGltcG9ydC5tZXRhLnVybCkpO1xuY29uc3Qgd29ya2VyUGF0aCA9IGpvaW4oaGVyZSwgJy4uJywgJ2Rpc3QnLCAnd29ya2VyLm1qcycpO1xuXG50eXBlIFdpcmVSZXN1bHQgPVxuICB8IHsgb2s6IHRydWU7IHZhbHVlOiB1bmtub3duIH1cbiAgfCB7IG9rOiBmYWxzZTsgZXJyb3I6IHsgbmFtZTogc3RyaW5nOyBtZXNzYWdlOiBzdHJpbmcgfSB9O1xuXG5jb25zdCBjYWxsV29ya2VyID0gY3JlYXRlU3luY0ZuKHdvcmtlclBhdGgpIGFzIChvcDogdW5rbm93bikgPT4gV2lyZVJlc3VsdDtcblxuY29uc3QgRVJST1JfQ0xBU1NFUzogUmVjb3JkPHN0cmluZywgbmV3ICguLi5hcmdzOiBuZXZlcltdKSA9PiBFcnJvcj4gPSB7XG4gIENvbmZsaWN0RXJyb3I6IENvbmZsaWN0RXJyb3IgYXMgbmV2ZXIsXG4gIEd1YXJkRmFpbGVkRXJyb3I6IEd1YXJkRmFpbGVkRXJyb3IgYXMgbmV2ZXIsXG4gIEludmFsaWRUcmFuc2l0aW9uRXJyb3I6IEludmFsaWRUcmFuc2l0aW9uRXJyb3IgYXMgbmV2ZXIsXG4gIFBlcm1pc3Npb25EZW5pZWRFcnJvcjogUGVybWlzc2lvbkRlbmllZEVycm9yIGFzIG5ldmVyLFxuICBTdG9yaWVzVmFsaWRhdGlvbkVycm9yOiBTdG9yaWVzVmFsaWRhdGlvbkVycm9yIGFzIG5ldmVyLFxufTtcblxuZnVuY3Rpb24gcmV0aHJvdyhlcnJvcjogeyBuYW1lOiBzdHJpbmc7IG1lc3NhZ2U6IHN0cmluZyB9KTogbmV2ZXIge1xuICBjb25zdCBDbHMgPSBFUlJPUl9DTEFTU0VTW2Vycm9yLm5hbWVdO1xuICBpZiAoQ2xzKSB7XG4gICAgLy8gUmVjb25zdHJ1Y3Qgd2l0aCB0aGUgd2lyZSBtZXNzYWdlOiB0aGUgY29uZm9ybWFuY2Ugc3VpdGUgbWF0Y2hlc1xuICAgIC8vIGNsYXNzZXMsIG5vdCBjb25zdHJ1Y3RvciBhcmd1bWVudHMuXG4gICAgY29uc3QgaW5zdGFuY2UgPSBPYmplY3QuY3JlYXRlKENscy5wcm90b3R5cGUpIGFzIEVycm9yO1xuICAgIGluc3RhbmNlLm1lc3NhZ2UgPSBlcnJvci5tZXNzYWdlO1xuICAgIGluc3RhbmNlLm5hbWUgPSBlcnJvci5uYW1lO1xuICAgIHRocm93IGluc3RhbmNlO1xuICB9XG4gIHRocm93IG5ldyBFcnJvcihgJHtlcnJvci5uYW1lfTogJHtlcnJvci5tZXNzYWdlfWApO1xufVxuXG5mdW5jdGlvbiB1bndyYXAocmVzdWx0OiBXaXJlUmVzdWx0KTogdW5rbm93biB7XG4gIGlmIChyZXN1bHQub2spIHJldHVybiByZXN1bHQudmFsdWU7XG4gIHJldGhyb3cocmVzdWx0LmVycm9yKTtcbn1cblxuY29uc3QgTUVUSE9EUzogQXJyYXk8a2V5b2YgU3BpbmVFbmdpbmU+ID0gW1xuICAnY3JlYXRlQWN0b3InLFxuICAnZ3JhbnQnLFxuICAncmV2b2tlJyxcbiAgJ2NyZWF0ZUZlYXR1cmUnLFxuICAnY3JlYXRlV29ya0l0ZW0nLFxuICAnaW1wb3J0U3RvcmllcycsXG4gICdjbGFpbVRhc2snLFxuICAnaGVhcnRiZWF0JyxcbiAgJ3JlbGVhc2VDbGFpbScsXG4gICdhZHZhbmNlQ2xvY2snLFxuICAnYWR2YW5jZVN0YXRlJyxcbiAgJ2Jsb2NrVGFzaycsXG4gICd1bmJsb2NrVGFzaycsXG4gICdzdWJtaXRFdmlkZW5jZScsXG4gICdhcHByb3ZlR2F0ZScsXG4gICdyZWplY3RHYXRlJyxcbiAgJ2dldFRhc2tDb250ZXh0JyxcbiAgJ3JlbGVhc2VEaXNwYXRjaEhvbGQnLFxuICAncmVjb25jaWxlJyxcbiAgJ3NldEdvdmVybmFuY2VSb2xlJyxcbiAgJ2dldEdvdmVybmFuY2VSb2xlJyxcbiAgJ2Fzc2lnblJvbGUnLFxuICAncmV2b2tlUm9sZScsXG4gICdsaXN0Um9sZUFzc2lnbm1lbnRzJyxcbiAgJ3NldFBsYW4nLFxuICAnZ2V0UGxhbicsXG4gICdzZXRXb3Jrc3BhY2VQb2xpY3knLFxuICAnZ2V0V29ya3NwYWNlUG9saWN5JyxcbiAgJ3NldEdhdGVQb2xpY3knLFxuICAnZ2V0R2F0ZVBvbGljeScsXG4gICdhdXRoekV4cGxhaW4nLFxuICAnY3JlYXRlVGhyZWFkJyxcbiAgJ2FkZFRocmVhZFBhcnRpY2lwYW50JyxcbiAgJ3Bvc3RNZXNzYWdlJyxcbiAgJ2xpc3RUaHJlYWRzJyxcbiAgJ2xpc3RNZXNzYWdlcycsXG4gICdsaXN0TWVudGlvbnMnLFxuICAnbGlzdE5vdGlmaWNhdGlvbnMnLFxuICAnbWFya05vdGlmaWNhdGlvblJlYWQnLFxuICAnbGlzdEFnZW50Sm9icycsXG4gICdjb21wbGV0ZUFnZW50Sm9iJyxcbiAgJ2dldFdvcmtJdGVtJyxcbiAgJ2dldEZlYXR1cmUnLFxuICAnZ2V0Q2xhaW1zJyxcbiAgJ2xpc3RXb3JrSXRlbXMnLFxuICAnZXZlbnRzJyxcbl07XG5cbmV4cG9ydCBpbnRlcmZhY2UgUGdTeW5jRW5naW5lT3B0aW9ucyB7XG4gIC8qKlxuICAgKiBEaXJlY3RvcnkgZm9yIGEgRFVSQUJMRSBQR2xpdGUgZGF0YWJhc2UgKHN0b3J5IDEzLCBgb2FocyBzZXJ2ZSAtLWRhdGFgKS5cbiAgICogT21pdHRlZCBcdTIxOTIgaW4tbWVtb3J5IGRhdGFiYXNlLCB0cnVuY2F0ZWQgcGVyIGVuZ2luZSAoY29uZm9ybWFuY2UgbW9kZSkuXG4gICAqL1xuICBkYXRhRGlyPzogc3RyaW5nO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlUGdTeW5jRW5naW5lKG9wdGlvbnM/OiBQZ1N5bmNFbmdpbmVPcHRpb25zKTogU3BpbmVFbmdpbmUge1xuICBjb25zdCBjcmVhdGVkID0gdW53cmFwKFxuICAgIGNhbGxXb3JrZXIoe1xuICAgICAgb3A6ICduZXcnLFxuICAgICAgLi4uKG9wdGlvbnM/LmRhdGFEaXIgIT09IHVuZGVmaW5lZCA/IHsgZGF0YURpcjogb3B0aW9ucy5kYXRhRGlyIH0gOiB7fSksXG4gICAgfSksXG4gICkgYXMgeyBlbmdpbmVJZDogbnVtYmVyIH07XG4gIGNvbnN0IGVuZ2luZUlkID0gY3JlYXRlZC5lbmdpbmVJZDtcbiAgY29uc3QgcHJveHk6IFJlY29yZDxzdHJpbmcsIHVua25vd24+ID0ge307XG4gIGZvciAoY29uc3QgbWV0aG9kIG9mIE1FVEhPRFMpIHtcbiAgICBwcm94eVttZXRob2RdID0gKC4uLmFyZ3M6IHVua25vd25bXSkgPT5cbiAgICAgIHVud3JhcChjYWxsV29ya2VyKHsgb3A6ICdjYWxsJywgZW5naW5lSWQsIG1ldGhvZCwgYXJncyB9KSk7XG4gIH1cbiAgcmV0dXJuIHByb3h5IGFzIHVua25vd24gYXMgU3BpbmVFbmdpbmU7XG59XG5cbi8vIGNyZWF0ZVJlcXVpcmUga2VwdCBmb3IgZnV0dXJlIG5hdGl2ZS1wZyBwYXRoIHJlc29sdXRpb247IGhhcm1sZXNzIGlmIHVudXNlZC5cbmV4cG9ydCBjb25zdCBfcmVxdWlyZSA9IGNyZWF0ZVJlcXVpcmUoaW1wb3J0Lm1ldGEudXJsKTtcbiIsICIvKipcbiAqIEhhbmQtbWFpbnRhaW5lZCBEREwgbWF0Y2hpbmcgc2NoZW1hLnRzIDEtMSAoZHJpenpsZS1raXQgbWlncmF0aW9uIHBpcGVsaW5lXG4gKiBpcyBsYXRlciBkZWJ0KS4gUnVucyBvbiBQR2xpdGUgaW4gdGhlIGNvbmZvcm1hbmNlIGhhcm5lc3Mgd29ya2VyLlxuICovXG5leHBvcnQgY29uc3QgU0NIRU1BX1NRTCA9IGBcbkNSRUFURSBUQUJMRSBJRiBOT1QgRVhJU1RTIGFjdG9ycyAoXG4gIGlkIFRFWFQgUFJJTUFSWSBLRVksXG4gIHR5cGUgVEVYVCBOT1QgTlVMTCxcbiAgZGlzcGxheV9uYW1lIFRFWFQgTk9UIE5VTEwsXG4gIGdvdmVybmFuY2Vfcm9sZSBURVhUIE5PVCBOVUxMIERFRkFVTFQgJ21lbWJlcidcbik7XG5cbi0tIFBoYXNlIDIgdXBncmFkZSBwYXRoIGZvciBkdXJhYmxlIGRhdGEgZGlycyBjcmVhdGVkIHVuZGVyIFBoYXNlIDEgKHN0b3J5IDEzKS5cbkFMVEVSIFRBQkxFIGFjdG9ycyBBREQgQ09MVU1OIElGIE5PVCBFWElTVFMgZ292ZXJuYW5jZV9yb2xlIFRFWFQgTk9UIE5VTEwgREVGQVVMVCAnbWVtYmVyJztcblxuQ1JFQVRFIFRBQkxFIElGIE5PVCBFWElTVFMgZ3JhbnRzIChcbiAgYWN0b3JfaWQgVEVYVCBOT1QgTlVMTCxcbiAgcGVybWlzc2lvbiBURVhUIE5PVCBOVUxMLFxuICBzY29wZSBURVhULFxuICBQUklNQVJZIEtFWSAoYWN0b3JfaWQsIHBlcm1pc3Npb24pXG4pO1xuXG5DUkVBVEUgVEFCTEUgSUYgTk9UIEVYSVNUUyByb2xlX2Fzc2lnbm1lbnRzIChcbiAgc2VxIFNFUklBTCBQUklNQVJZIEtFWSxcbiAgYWN0b3JfaWQgVEVYVCBOT1QgTlVMTCxcbiAgcm9sZV9jb2RlIFRFWFQgTk9UIE5VTEwsXG4gIGdyYW50ZWRfYnkgVEVYVCBOT1QgTlVMTCxcbiAgcmV2b2tlZCBCT09MRUFOIE5PVCBOVUxMIERFRkFVTFQgRkFMU0Vcbik7XG5cbkNSRUFURSBUQUJMRSBJRiBOT1QgRVhJU1RTIHdvcmtzcGFjZV9zdGF0ZSAoXG4gIGlkIFRFWFQgUFJJTUFSWSBLRVksXG4gIHBsYW4gVEVYVCBOT1QgTlVMTCxcbiAgcGxhbl92ZXJzaW9uIElOVEVHRVIgTk9UIE5VTEwgREVGQVVMVCAxLFxuICBwb2xpY3kgSlNPTkIgTk9UIE5VTEwgREVGQVVMVCAne30nOjpqc29uYixcbiAgcG9saWN5X3ZlcnNpb24gSU5URUdFUiBOT1QgTlVMTCBERUZBVUxUIDFcbik7XG5cbkNSRUFURSBUQUJMRSBJRiBOT1QgRVhJU1RTIGdhdGVfcG9saWNpZXMgKFxuICBnYXRlIFRFWFQgUFJJTUFSWSBLRVksXG4gIHBvbGljeSBKU09OQiBOT1QgTlVMTFxuKTtcblxuQ1JFQVRFIFRBQkxFIElGIE5PVCBFWElTVFMgZmVhdHVyZXMgKFxuICBpZCBURVhUIFBSSU1BUlkgS0VZLFxuICBzZXEgU0VSSUFMIE5PVCBOVUxMLFxuICBzdGF0ZSBURVhUIE5PVCBOVUxMLFxuICBkaXNwYXRjaF9ob2xkIEJPT0xFQU4gTk9UIE5VTEwgREVGQVVMVCBGQUxTRVxuKTtcblxuQ1JFQVRFIFRBQkxFIElGIE5PVCBFWElTVFMgd29ya19pdGVtcyAoXG4gIGlkIFRFWFQgUFJJTUFSWSBLRVksXG4gIHNlcSBTRVJJQUwgTk9UIE5VTEwsXG4gIGZlYXR1cmVfaWQgVEVYVCBOT1QgTlVMTCxcbiAgZXh0ZXJuYWxfa2V5IFRFWFQgTk9UIE5VTEwsXG4gIHRpdGxlIFRFWFQgTk9UIE5VTEwsXG4gIHN0YXRlIFRFWFQgTk9UIE5VTEwsXG4gIGJsb2NrZWRfcmVhc29uIFRFWFQsXG4gIHJldmlld19sb29wX2l0ZXJhdGlvbiBJTlRFR0VSIE5PVCBOVUxMIERFRkFVTFQgMCxcbiAgaW50ZW50X2hhc2ggVEVYVCxcbiAgcGlubmVkX3ZlcmlmaWNhdGlvbiBKU09OQixcbiAgc3BlY19jaGVja3BvaW50IEJPT0xFQU4gTk9UIE5VTEwgREVGQVVMVCBGQUxTRSxcbiAgZG9uZV9jaGVja3BvaW50IEJPT0xFQU4gTk9UIE5VTEwgREVGQVVMVCBGQUxTRSxcbiAgaW52b2tlX2Rldl93aXRoIFRFWFQgTk9UIE5VTEwgREVGQVVMVCAnJyxcbiAgc3BlY19wYXRoIFRFWFQgTk9UIE5VTEwsXG4gIHN0YXRlX3ZlcnNpb24gSU5URUdFUiBOT1QgTlVMTCBERUZBVUxUIDAsXG4gIGRlcGVuZHNfb24gSlNPTkIgTk9UIE5VTEwgREVGQVVMVCAnW10nOjpqc29uYixcbiAgbGFzdF9mZW5jaW5nX3Rva2VuIElOVEVHRVIgTk9UIE5VTEwgREVGQVVMVCAwXG4pO1xuXG5DUkVBVEUgVEFCTEUgSUYgTk9UIEVYSVNUUyBjbGFpbXMgKFxuICBpZCBURVhUIFBSSU1BUlkgS0VZLFxuICBzZXEgU0VSSUFMIE5PVCBOVUxMLFxuICB3b3JrX2l0ZW1faWQgVEVYVCBOT1QgTlVMTCxcbiAgYWN0b3JfaWQgVEVYVCBOT1QgTlVMTCxcbiAgZmVuY2luZ190b2tlbiBJTlRFR0VSIE5PVCBOVUxMLFxuICBsZWFzZV9leHBpcmVzX2F0IEJJR0lOVCBOT1QgTlVMTCxcbiAgcmVsZWFzZWQgQk9PTEVBTiBOT1QgTlVMTCBERUZBVUxUIEZBTFNFLFxuICB0dGxfbXMgQklHSU5UIE5PVCBOVUxMXG4pO1xuXG4tLSByb2FkbWFwIFx1MDBBNzEuMzogb25lIGxpdmUgY2xhaW0gcGVyIHdvcmsgaXRlbSBcdTIwMTQgcmFjZXMgbG9zZSBieSBjb25zdHJhaW50LlxuQ1JFQVRFIFVOSVFVRSBJTkRFWCBJRiBOT1QgRVhJU1RTIGNsYWltc19vbmVfbGl2ZV9wZXJfaXRlbVxuICBPTiBjbGFpbXMgKHdvcmtfaXRlbV9pZCkgV0hFUkUgcmVsZWFzZWQgPSBmYWxzZTtcblxuQ1JFQVRFIFRBQkxFIElGIE5PVCBFWElTVFMgZ2F0ZV9kZWNpc2lvbnMgKFxuICBzZXEgU0VSSUFMIFBSSU1BUlkgS0VZLFxuICB3b3JrX2l0ZW1faWQgVEVYVCBOT1QgTlVMTCxcbiAgZ2F0ZSBURVhUIE5PVCBOVUxMLFxuICBkZWNpc2lvbiBURVhUIE5PVCBOVUxMLFxuICBhY3Rvcl9pZCBURVhUIE5PVCBOVUxMLFxuICByb3VuZCBJTlRFR0VSIE5PVCBOVUxMIERFRkFVTFQgMFxuKTtcblxuLS0gUGhhc2UgMiB1cGdyYWRlIHBhdGggZm9yIGR1cmFibGUgZGF0YSBkaXJzIGNyZWF0ZWQgdW5kZXIgUGhhc2UgMSAoc3RvcnkgMTMpLlxuQUxURVIgVEFCTEUgZ2F0ZV9kZWNpc2lvbnMgQUREIENPTFVNTiBJRiBOT1QgRVhJU1RTIHJvdW5kIElOVEVHRVIgTk9UIE5VTEwgREVGQVVMVCAwO1xuXG5DUkVBVEUgVEFCTEUgSUYgTk9UIEVYSVNUUyBldmlkZW5jZSAoXG4gIHNlcSBTRVJJQUwgUFJJTUFSWSBLRVksXG4gIHdvcmtfaXRlbV9pZCBURVhUIE5PVCBOVUxMLFxuICBraW5kIFRFWFQgTk9UIE5VTEwsXG4gIHBheWxvYWQgSlNPTkIgTk9UIE5VTExcbik7XG5cbkNSRUFURSBUQUJMRSBJRiBOT1QgRVhJU1RTIGV2ZW50cyAoXG4gIGdsb2JhbF9zZXEgU0VSSUFMIFBSSU1BUlkgS0VZLFxuICBzdHJlYW1fdHlwZSBURVhUIE5PVCBOVUxMLFxuICBzdHJlYW1faWQgVEVYVCBOT1QgTlVMTCxcbiAgc3RyZWFtX3NlcSBJTlRFR0VSIE5PVCBOVUxMLFxuICB0eXBlIFRFWFQgTk9UIE5VTEwsXG4gIGFjdG9yX2lkIFRFWFQgTk9UIE5VTEwsXG4gIHBheWxvYWQgSlNPTkIgTk9UIE5VTEwsXG4gIGNhdXNhdGlvbl9pZCBURVhULFxuICBpZGVtcG90ZW5jeV9rZXkgVEVYVFxuKTtcblxuLS0gXHUwMEE3MS41OiBVTklRVUUoc3RyZWFtX2lkLCBzdHJlYW1fc2VxKSBkb3VibGVzIGFzIHRoZSBvcHRpbWlzdGljIGxvY2suXG5DUkVBVEUgVU5JUVVFIElOREVYIElGIE5PVCBFWElTVFMgZXZlbnRzX3N0cmVhbV9pZF9zdHJlYW1fc2VxXG4gIE9OIGV2ZW50cyAoc3RyZWFtX2lkLCBzdHJlYW1fc2VxKTtcblxuQ1JFQVRFIFRBQkxFIElGIE5PVCBFWElTVFMgaWRlbXBvdGVuY3lfa2V5cyAoXG4gIGtleSBURVhUIFBSSU1BUlkgS0VZLFxuICByZXN1bHQgSlNPTkIgTk9UIE5VTExcbik7XG5cbi0tIFBoYXNlIDMgY29sbGFib3JhdGlvbiAocm9hZG1hcCBcdTAwQTc1KS4gSUYgTk9UIEVYSVNUUyBrZWVwcyBkdXJhYmxlIFBoYXNlLTEvMlxuLS0gZGF0YSBkaXJlY3RvcmllcyB1cGdyYWRpbmcgaW4gcGxhY2UgKHN0b3J5IDEzKS5cblxuQ1JFQVRFIFRBQkxFIElGIE5PVCBFWElTVFMgdGhyZWFkcyAoXG4gIGlkIFRFWFQgUFJJTUFSWSBLRVksXG4gIHNlcSBTRVJJQUwgTk9UIE5VTEwsXG4gIGZlYXR1cmVfaWQgVEVYVCxcbiAgd29ya19pdGVtX2lkIFRFWFQsXG4gIGtpbmQgVEVYVCBOT1QgTlVMTCxcbiAgdmlzaWJpbGl0eSBURVhUIE5PVCBOVUxMLFxuICBjcmVhdGVkX2J5IFRFWFQgTk9UIE5VTEwsXG4gIHBhcnRpY2lwYW50cyBKU09OQiBOT1QgTlVMTCBERUZBVUxUICdbXSc6Ompzb25iXG4pO1xuXG5DUkVBVEUgVEFCTEUgSUYgTk9UIEVYSVNUUyBtZXNzYWdlcyAoXG4gIGlkIFRFWFQgUFJJTUFSWSBLRVksXG4gIHRocmVhZF9pZCBURVhUIE5PVCBOVUxMLFxuICBzZXEgSU5URUdFUiBOT1QgTlVMTCxcbiAgYXV0aG9yX2lkIFRFWFQgTk9UIE5VTEwsXG4gIGtpbmQgVEVYVCBOT1QgTlVMTCxcbiAgYm9keSBURVhUIE5PVCBOVUxMLFxuICByZXBseV90byBURVhUXG4pO1xuXG4tLSBcdTAwQTc1LjM6IHRoZSBwZXItdGhyZWFkIG1lc3NhZ2Ugc2VxdWVuY2UgaXMgZ2FwLWZyZWUgQlkgQ09OU1RSQUlOVC5cbkNSRUFURSBVTklRVUUgSU5ERVggSUYgTk9UIEVYSVNUUyBtZXNzYWdlc190aHJlYWRfaWRfc2VxXG4gIE9OIG1lc3NhZ2VzICh0aHJlYWRfaWQsIHNlcSk7XG5cbkNSRUFURSBUQUJMRSBJRiBOT1QgRVhJU1RTIG1lbnRpb25zIChcbiAgc2VxIFNFUklBTCBQUklNQVJZIEtFWSxcbiAgbWVzc2FnZV9pZCBURVhUIE5PVCBOVUxMLFxuICBtZW50aW9uZWRfYWN0b3JfaWQgVEVYVCBOT1QgTlVMTCxcbiAgcmVzb2x1dGlvbiBURVhUIE5PVCBOVUxMXG4pO1xuXG5DUkVBVEUgVEFCTEUgSUYgTk9UIEVYSVNUUyBub3RpZmljYXRpb25zIChcbiAgaWQgVEVYVCBQUklNQVJZIEtFWSxcbiAgc2VxIFNFUklBTCBOT1QgTlVMTCxcbiAgYWN0b3JfaWQgVEVYVCBOT1QgTlVMTCxcbiAgc291cmNlIFRFWFQgTk9UIE5VTEwsXG4gIHJlZl9pZCBURVhUIE5PVCBOVUxMLFxuICByZWFkIEJPT0xFQU4gTk9UIE5VTEwgREVGQVVMVCBGQUxTRVxuKTtcblxuQ1JFQVRFIFRBQkxFIElGIE5PVCBFWElTVFMgYWdlbnRfam9icyAoXG4gIGlkIFRFWFQgUFJJTUFSWSBLRVksXG4gIHNlcSBTRVJJQUwgTk9UIE5VTEwsXG4gIGFnZW50X2FjdG9yX2lkIFRFWFQgTk9UIE5VTEwsXG4gIHRocmVhZF9pZCBURVhUIE5PVCBOVUxMLFxuICBtZXNzYWdlX2lkIFRFWFQgTk9UIE5VTEwsXG4gIHdvcmtfaXRlbV9pZCBURVhULFxuICBmZWF0dXJlX2lkIFRFWFQsXG4gIHN0YXR1cyBURVhUIE5PVCBOVUxMLFxuICBkZXB0aCBJTlRFR0VSIE5PVCBOVUxMIERFRkFVTFQgMCxcbiAgbm90ZSBURVhUXG4pO1xuYDtcbiIsICJleHBvcnQgeyBQZ0VuZ2luZSB9IGZyb20gJy4vcGctZW5naW5lLmpzJztcbmV4cG9ydCB7IGNyZWF0ZVBnU3luY0VuZ2luZSwgdHlwZSBQZ1N5bmNFbmdpbmVPcHRpb25zIH0gZnJvbSAnLi9zeW5jLWVuZ2luZS5qcyc7XG5leHBvcnQgeyBTQ0hFTUFfU1FMIH0gZnJvbSAnLi9zY2hlbWEtc3FsLmpzJztcbmV4cG9ydCAqIGFzIHNjaGVtYSBmcm9tICcuL3NjaGVtYS5qcyc7XG4iLCAiLyoqXG4gKiBAb2Focy9ydW5uZXIgXHUyMDE0IHRoZSBCWU8gd29ya2VyIGxvb3AgKFBoYXNlIDEgc3RvcnkgMTQpLlxuICpcbiAqIEZJWEVEIElOVEVSRkFDRSBiZXR3ZWVuIHRoZSBvYWhzIENMSSAoYG9haHMgd29ya2ApIGFuZCB0aGUgcnVubmVyIGxpYnJhcnkuXG4gKiBUaGUgQ0xJIHdpcmVzIGZsYWdzL2VudiBpbnRvIFJ1bm5lck9wdGlvbnMgYW5kIGNhbGxzIHdvcmtMb29wL3J1bk9uY2U7IGFsbFxuICogcnVubmVyIGxvZ2ljIGxpdmVzIGhlcmUuXG4gKlxuICogQ29udHJhY3QgKHByb2R1Y3Qtcm9hZG1hcC5tZCBcdTAwQTcyLjMpOlxuICogIDEuIHBvbGwgbGlzdF93b3JrX2l0ZW1zKHN0YXRlPXJlYWR5X2Zvcl9kZXYsIGNsYWltYWJsZSkgXHUyMTkyIGNsYWltX3Rhc2tcbiAqICAgICAoY3Jhc2ggcmUtZGlzcGF0Y2g6IGFuIGluX3Byb2dyZXNzIGl0ZW0gd2l0aCBOTyBsaXZlIGNsYWltIGlzIGEgZGVhZFxuICogICAgIHdvcmtlcidzIHJ1biBcdTIwMTQgcG9sbGVkIGFzIGEgZmFsbGJhY2sgc28gcmVjb3ZlcnkgdXNlcyB0aGUgc2FtZSBsb29wKVxuICogIDIuIHdvcmt0cmVlIG5hbWVkIGJ5IGNsYWltIGlkOyBicmFuY2ggYGNsYWltLzxjbGFpbUlkPmBcbiAqICAzLiBtaXJyb3Itb24tZGlzcGF0Y2g6IHN0YW1wIHNwZWMgZnJvbnRtYXR0ZXIgdG8gdGhlIERCIGVudHJ5IHN0YXRlXG4gKiAgNC4gYWR2YW5jZV9zdGF0ZSh0bz1pbl9wcm9ncmVzcykgQkVGT1JFIHRoZSBhZ2VudCBydW5zIFx1MjAxNCBEQiBpcyB0aGUgZW50cnkgc3RhdGVcbiAqICA1LiBpbnZva2UgdGhlIGNvZGluZyBhZ2VudCAodGVtcGxhdGU7IHVubW9kaWZpZWQgYm1hZC1kZXYtYXV0byBjb250ZW50KVxuICogIDYuIHBhcnNlIEhBTFQgKyBBdXRvIFJ1biBSZXN1bHQgXHUyMTkyIGhhbHRfcmVwb3J0IGV2aWRlbmNlICh2ZXJiYXRpbSlcbiAqICA3LiBydW4gUElOTkVEIHZlcmlmaWNhdGlvbiBjb21tYW5kcyBvbmx5IChhbGxvd2xpc3RlZCkgXHUyMTkyIHRlc3RfcnVuIGV2aWRlbmNlXG4gKiAgOC4gcHVzaCBicmFuY2ggXHUyMTkyIGdpdF9kaWZmICsgY29tbWl0IGV2aWRlbmNlIChyZW1vdGUgcmVhY2hhYmlsaXR5IG1lYXN1cmVkKVxuICogIDkuIGFkdmFuY2Vfc3RhdGUgLyBibG9ja190YXNrIHBlciBIQUxUIHN0YXR1cyBcdTIwMTQgdGhlIGNvcmUgY29tcHV0ZXMgdmVyZGljdHNcbiAqIDEwLiBjcmFzaCByZWNvdmVyeSBvbiByZS1jbGFpbTogYWRvcHQgYSBkZWNlbnRseS1maW5pc2hlZCB3b3JrdHJlZSAodGVybWluYWxcbiAqICAgICBmcm9udG1hdHRlciArIGEgcmVhbCBjb21taXQgcGFzdCBpdHMgYmFzZWxpbmUpIHdpdGggbGF0ZSBldmlkZW5jZVxuICogICAgIHN1Ym1pc3Npb247IGEgd3JlY2tlZCB3b3JrdHJlZSBpcyBjbGVhbmVkIGFuZCBibG9ja2VkIGBzdGFsZV93b3JrdHJlZWAuXG4gKlxuICogQWdlbnQgaW52b2NhdGlvbiBlbnZpcm9ubWVudCAocGFydCBvZiB0aGlzIGludGVyZmFjZSk6IHRoZSBhZ2VudCBjb21tYW5kXG4gKiB0ZW1wbGF0ZSBpcyBleHBhbmRlZCAoe1NQRUNfRk9MREVSfSB7U1RPUllfSUR9IHtJTlZPS0VfV0lUSH0ge1dPUktUUkVFfSksXG4gKiBydW4gd2l0aCBjd2QgPSB0aGUgY2xhaW0gd29ya3RyZWUsIGFuZCByZWNlaXZlcyB0d28gZXh0cmEgZW52IHZhcnM6XG4gKiAgIE9BSFNfU1BFQ19GSUxFIFx1MjAxNCBhYnNvbHV0ZSBwYXRoIG9mIHRoZSBzdG9yeSBzcGVjIGZpbGUgaW5zaWRlIHRoZSB3b3JrdHJlZVxuICogICBPQUhTX1NUT1JZX0lEICBcdTIwMTQgdGhlIHdvcmsgaXRlbSBleHRlcm5hbEtleSAoc3Rvcmllcy55YW1sIGlkKVxuICovXG5pbXBvcnQgeyBzcGF3blN5bmMgfSBmcm9tICdub2RlOmNoaWxkX3Byb2Nlc3MnO1xuaW1wb3J0IHtcbiAgZXhpc3RzU3luYyxcbiAgbWtkaXJTeW5jLFxuICByZWFkZGlyU3luYyxcbiAgcmVhZEZpbGVTeW5jLFxuICBybVN5bmMsXG4gIHN0YXRTeW5jLFxuICB3cml0ZUZpbGVTeW5jLFxufSBmcm9tICdub2RlOmZzJztcbmltcG9ydCB7IGpvaW4sIHJlc29sdmUgfSBmcm9tICdub2RlOnBhdGgnO1xuaW1wb3J0IHsgcGFyc2UgYXMgcGFyc2VZYW1sIH0gZnJvbSAneWFtbCc7XG5pbXBvcnQgdHlwZSB7IE9haHNDbGllbnQgfSBmcm9tICdAb2Focy9jb250cmFjdHMnO1xuaW1wb3J0IHR5cGUgeyBCbG9ja2VkUmVhc29uLCBDbGFpbSwgRXZpZGVuY2UsIFdvcmtJdGVtLCBXb3JrSXRlbVN0YXRlIH0gZnJvbSAnQG9haHMvY29yZSc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgUnVubmVyT3B0aW9ucyB7XG4gIGNsaWVudDogT2Foc0NsaWVudDtcbiAgLyoqIEFic29sdXRlIHBhdGggb2YgdGhlIHRhcmdldCBwcm9qZWN0IGdpdCBjaGVja291dC4gKi9cbiAgcmVwb1BhdGg6IHN0cmluZztcbiAgLyoqIFNwZWMgZm9sZGVyIChyZWxhdGl2ZSB0byByZXBvIHJvb3QpIGhvbGRpbmcgU1BFQy5tZCArIHN0b3JpZXMueWFtbCArIHN0b3JpZXMvLiAqL1xuICBzcGVjRm9sZGVyOiBzdHJpbmc7XG4gIC8qKlxuICAgKiBDb2RpbmctYWdlbnQgY29tbWFuZCB0ZW1wbGF0ZS4gUGxhY2Vob2xkZXJzOiB7U1BFQ19GT0xERVJ9IHtTVE9SWV9JRH1cbiAgICoge0lOVk9LRV9XSVRIfSB7V09SS1RSRUV9LiBFeGVjdXRlZCB3aXRoIGN3ZCA9IHRoZSBjbGFpbSB3b3JrdHJlZS5cbiAgICovXG4gIGFnZW50Q21kOiBzdHJpbmc7XG4gIC8qKiBQb2xsIGludGVydmFsIGZvciB3b3JrTG9vcCAobXMpLiBEZWZhdWx0IDE1XzAwMC4gKi9cbiAgcG9sbE1zPzogbnVtYmVyO1xuICAvKiogQmluYXJpZXMgcGlubmVkIHZlcmlmaWNhdGlvbiBjb21tYW5kcyBtYXkgc3RhcnQgd2l0aC4gKi9cbiAgdmVyaWZpY2F0aW9uQWxsb3dsaXN0Pzogc3RyaW5nW107XG4gIC8qKiBHaXQgcmVtb3RlIHRvIHB1c2ggY2xhaW0gYnJhbmNoZXMgdG8uIERlZmF1bHQgJ29yaWdpbicuICovXG4gIHJlbW90ZT86IHN0cmluZztcbiAgLyoqIFRFU1QgT05MWTogZGllIGF0IGEgc3BlY2lmaWMgcG9pbnQgdG8gZXhlcmNpc2UgY3Jhc2ggcmVjb3ZlcnkuICovXG4gIGZhaWxwb2ludD86ICdiZWZvcmVfcmVwb3J0JztcbiAgLyoqIE1heCB3YWxsIHRpbWUgZm9yIG9uZSBhZ2VudCBpbnZvY2F0aW9uIChtcykuIERlZmF1bHQgMzAgbWludXRlcy4gKi9cbiAgYWdlbnRUaW1lb3V0TXM/OiBudW1iZXI7XG4gIC8qKiBFeHRyYSBlbnZpcm9ubWVudCB2YXJpYWJsZXMgcGFzc2VkIHRvIHRoZSBhZ2VudCBpbnZvY2F0aW9uLiAqL1xuICBhZ2VudEVudj86IFJlY29yZDxzdHJpbmcsIHN0cmluZz47XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUnVuT25jZVJlc3VsdCB7XG4gIGRpc3BhdGNoZWQ6IGJvb2xlYW47XG4gIHdvcmtJdGVtSWQ/OiBzdHJpbmc7XG4gIGV4dGVybmFsS2V5Pzogc3RyaW5nO1xuICBvdXRjb21lPzogJ2luX3JldmlldycgfCAnYmxvY2tlZCcgfCAnYWRvcHRlZF9pbl9yZXZpZXcnIHwgJ2NyYXNoZWQnO1xuICBkZXRhaWxzPzogc3RyaW5nO1xuICAvKiogQ2xhaW0gdGFrZW4gYnkgdGhpcyBydW4gKGJyYW5jaCBpcyBgY2xhaW0vPGNsYWltSWQ+YCkuICovXG4gIGNsYWltSWQ/OiBzdHJpbmc7XG4gIC8qKiBSYXcgZXZpZGVuY2Ugc3VibWl0dGVkIGR1cmluZyB0aGlzIHJ1biwgaW4gc3VibWlzc2lvbiBvcmRlci4gKi9cbiAgZXZpZGVuY2U/OiBFdmlkZW5jZVtdO1xufVxuXG4vKiogQmluYXJpZXMgYSBwaW5uZWQgdmVyaWZpY2F0aW9uIGNvbW1hbmQgbWF5IHN0YXJ0IHdpdGggKGZpcnN0IHRva2VuKS4gKi9cbmV4cG9ydCBjb25zdCBERUZBVUxUX1ZFUklGSUNBVElPTl9BTExPV0xJU1Q6IHJlYWRvbmx5IHN0cmluZ1tdID0gW1xuICAnbm9kZScsXG4gICducG0nLFxuICAncG5wbScsXG4gICducHgnLFxuICAncHl0ZXN0JyxcbiAgJ3B5dGhvbjMnLFxuICAnc2gnLFxuICAnYmFzaCcsXG4gICdnaXQnLFxuXTtcblxuLyoqIE1hcmtlciBkcm9wcGVkIGluIGV2ZXJ5IGNsYWltIHdvcmt0cmVlIHNvIGEgbGF0ZXIgY2xhaW0gY2FuIG1hcCBpdCBiYWNrLiAqL1xuY29uc3QgTUFSS0VSX0ZJTEUgPSAnLm9haHMtd29yay1pdGVtJztcblxuLyoqIERCIHN0YXRlIFx1MjE5MiBzcGVjLWZpbGUgZnJvbnRtYXR0ZXIgdm9jYWJ1bGFyeSAoZGV2LWF1dG8gZmlsZSBkaWFsZWN0KS4gKi9cbmNvbnN0IEVOVFJZX1NUQVRVUzogUmVhZG9ubHk8UGFydGlhbDxSZWNvcmQ8V29ya0l0ZW1TdGF0ZSwgc3RyaW5nPj4+ID0ge1xuICByZWFkeV9mb3JfZGV2OiAncmVhZHktZm9yLWRldicsXG4gIGluX3Byb2dyZXNzOiAnaW4tcHJvZ3Jlc3MnLFxuICBpbl9yZXZpZXc6ICdpbi1yZXZpZXcnLFxufTtcblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBnaXQgcGx1bWJpbmcgKGNoaWxkX3Byb2Nlc3Mgb25seSBcdTIwMTQgbm8gZXh0ZXJuYWwgZGVwcylcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4vKiogUnVuIGEgZ2l0IGNvbW1hbmQ7IHRocm93cyBvbiBub24temVybyBleGl0OyByZXR1cm5zIHRyaW1tZWQgc3Rkb3V0LiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdpdChhcmdzOiBzdHJpbmdbXSwgY3dkOiBzdHJpbmcpOiBzdHJpbmcge1xuICBjb25zdCByZXN1bHQgPSBzcGF3blN5bmMoJ2dpdCcsIGFyZ3MsIHsgY3dkLCBlbmNvZGluZzogJ3V0ZjgnIH0pO1xuICBpZiAocmVzdWx0LmVycm9yKSB0aHJvdyByZXN1bHQuZXJyb3I7XG4gIGlmIChyZXN1bHQuc3RhdHVzICE9PSAwKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgYGdpdCAke2FyZ3Muam9pbignICcpfSBmYWlsZWQgd2l0aCBleGl0ICR7U3RyaW5nKHJlc3VsdC5zdGF0dXMpfTogJHtyZXN1bHQuc3RkZXJyLnRyaW0oKX1gLFxuICAgICk7XG4gIH1cbiAgcmV0dXJuIHJlc3VsdC5zdGRvdXQudHJpbSgpO1xufVxuXG4vKipcbiAqIEtlZXAgcnVubmVyIGJvb2trZWVwaW5nIG91dCBvZiBhZ2VudCBjb21taXRzOiB0aGUgbWFya2VyIGZpbGUgYW5kIHRoZVxuICogd29ya3RyZWUgcm9vdCBhcmUgYWRkZWQgdG8gJEdJVF9DT01NT05fRElSL2luZm8vZXhjbHVkZSAoc2hhcmVkIGJ5IGFsbFxuICogd29ya3RyZWVzKSwgc28gYW4gYWdlbnQncyBgZ2l0IGFkZCAtQWAgbmV2ZXIgcGlja3MgdGhlbSB1cC5cbiAqL1xuZnVuY3Rpb24gZW5zdXJlR2l0RXhjbHVkZXMocmVwb1BhdGg6IHN0cmluZyk6IHZvaWQge1xuICBjb25zdCBnaXREaXIgPSBqb2luKHJlcG9QYXRoLCAnLmdpdCcpO1xuICB0cnkge1xuICAgIGlmICghc3RhdFN5bmMoZ2l0RGlyKS5pc0RpcmVjdG9yeSgpKSByZXR1cm47IC8vIHJlcG9QYXRoIGlzIGl0c2VsZiBhIHdvcmt0cmVlIFx1MjAxNCBza2lwXG4gIH0gY2F0Y2gge1xuICAgIHJldHVybjtcbiAgfVxuICBjb25zdCBpbmZvRGlyID0gam9pbihnaXREaXIsICdpbmZvJyk7XG4gIG1rZGlyU3luYyhpbmZvRGlyLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcbiAgY29uc3QgZXhjbHVkZVBhdGggPSBqb2luKGluZm9EaXIsICdleGNsdWRlJyk7XG4gIGNvbnN0IGN1cnJlbnQgPSBleGlzdHNTeW5jKGV4Y2x1ZGVQYXRoKSA/IHJlYWRGaWxlU3luYyhleGNsdWRlUGF0aCwgJ3V0ZjgnKSA6ICcnO1xuICBjb25zdCB3YW50ZWQgPSBbJy5vYWhzLycsIE1BUktFUl9GSUxFXTtcbiAgY29uc3QgaGF2ZSA9IG5ldyBTZXQoY3VycmVudC5zcGxpdCgnXFxuJykubWFwKChsaW5lKSA9PiBsaW5lLnRyaW0oKSkpO1xuICBjb25zdCBtaXNzaW5nID0gd2FudGVkLmZpbHRlcigobGluZSkgPT4gIWhhdmUuaGFzKGxpbmUpKTtcbiAgaWYgKG1pc3NpbmcubGVuZ3RoID09PSAwKSByZXR1cm47XG4gIGNvbnN0IHByZWZpeCA9IGN1cnJlbnQgPT09ICcnIHx8IGN1cnJlbnQuZW5kc1dpdGgoJ1xcbicpID8gY3VycmVudCA6IGAke2N1cnJlbnR9XFxuYDtcbiAgd3JpdGVGaWxlU3luYyhleGNsdWRlUGF0aCwgYCR7cHJlZml4fSR7bWlzc2luZy5qb2luKCdcXG4nKX1cXG5gLCAndXRmOCcpO1xufVxuXG5mdW5jdGlvbiByZW1vdmVXb3JrdHJlZShkaXI6IHN0cmluZywgcmVwb1BhdGg6IHN0cmluZyk6IHZvaWQge1xuICB0cnkge1xuICAgIGdpdChbJ3dvcmt0cmVlJywgJ3JlbW92ZScsICctLWZvcmNlJywgZGlyXSwgcmVwb1BhdGgpO1xuICB9IGNhdGNoIHtcbiAgICB0cnkge1xuICAgICAgcm1TeW5jKGRpciwgeyByZWN1cnNpdmU6IHRydWUsIGZvcmNlOiB0cnVlIH0pO1xuICAgICAgZ2l0KFsnd29ya3RyZWUnLCAncHJ1bmUnXSwgcmVwb1BhdGgpO1xuICAgIH0gY2F0Y2gge1xuICAgICAgLyogYmVzdCBlZmZvcnQgXHUyMDE0IGEgbGVmdG92ZXIgZGlyIGlzIHJlLWRldGVjdGVkIGFzIGEgc3RhbGUgd29ya3RyZWUgKi9cbiAgICB9XG4gIH1cbn1cblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBXb3JrdHJlZSBtYXJrZXIgKGNyYXNoLXJlY292ZXJ5IGJvb2trZWVwaW5nKVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbmludGVyZmFjZSBXb3JrdHJlZU1hcmtlciB7XG4gIHdvcmtJdGVtSWQ6IHN0cmluZztcbiAgY2xhaW1JZDogc3RyaW5nO1xuICBiYXNlbGluZTogc3RyaW5nO1xuICAvKiogSG93IG1hbnkgdGltZXMgYW4gYWdlbnQgd2FzIGludm9rZWQgaW5zaWRlIHRoaXMgd29ya3RyZWUuICovXG4gIGludm9jYXRpb25zOiBudW1iZXI7XG59XG5cbmZ1bmN0aW9uIHdyaXRlTWFya2VyKHdvcmt0cmVlRGlyOiBzdHJpbmcsIG1hcmtlcjogV29ya3RyZWVNYXJrZXIpOiB2b2lkIHtcbiAgd3JpdGVGaWxlU3luYyhqb2luKHdvcmt0cmVlRGlyLCBNQVJLRVJfRklMRSksIGAke0pTT04uc3RyaW5naWZ5KG1hcmtlciwgbnVsbCwgMil9XFxuYCwgJ3V0ZjgnKTtcbn1cblxuZnVuY3Rpb24gcmVhZE1hcmtlcih3b3JrdHJlZURpcjogc3RyaW5nKTogV29ya3RyZWVNYXJrZXIgfCBudWxsIHtcbiAgY29uc3QgcGF0aCA9IGpvaW4od29ya3RyZWVEaXIsIE1BUktFUl9GSUxFKTtcbiAgaWYgKCFleGlzdHNTeW5jKHBhdGgpKSByZXR1cm4gbnVsbDtcbiAgdHJ5IHtcbiAgICBjb25zdCByYXcgPSBKU09OLnBhcnNlKHJlYWRGaWxlU3luYyhwYXRoLCAndXRmOCcpKSBhcyBQYXJ0aWFsPFdvcmt0cmVlTWFya2VyPjtcbiAgICBpZiAodHlwZW9mIHJhdy53b3JrSXRlbUlkICE9PSAnc3RyaW5nJyB8fCB0eXBlb2YgcmF3LmJhc2VsaW5lICE9PSAnc3RyaW5nJykgcmV0dXJuIG51bGw7XG4gICAgcmV0dXJuIHtcbiAgICAgIHdvcmtJdGVtSWQ6IHJhdy53b3JrSXRlbUlkLFxuICAgICAgY2xhaW1JZDogdHlwZW9mIHJhdy5jbGFpbUlkID09PSAnc3RyaW5nJyA/IHJhdy5jbGFpbUlkIDogJycsXG4gICAgICBiYXNlbGluZTogcmF3LmJhc2VsaW5lLFxuICAgICAgaW52b2NhdGlvbnM6IHR5cGVvZiByYXcuaW52b2NhdGlvbnMgPT09ICdudW1iZXInID8gcmF3Lmludm9jYXRpb25zIDogMCxcbiAgICB9O1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufVxuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIFNwZWMgZmlsZSByZWFkaW5nIChmcm9udG1hdHRlciArIEhBTFQgcmVwb3J0KVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbmludGVyZmFjZSBTcGVjUmVwb3J0IHtcbiAgc3RhdHVzOiBzdHJpbmcgfCBudWxsO1xuICBibG9ja2luZ0NvbmRpdGlvbjogc3RyaW5nIHwgbnVsbDtcbiAgYXV0b1J1blJlc3VsdDogc3RyaW5nIHwgbnVsbDtcbn1cblxuZnVuY3Rpb24gc3BsaXRGcm9udG1hdHRlcihyYXc6IHN0cmluZyk6IHsgZGF0YTogUmVjb3JkPHN0cmluZywgdW5rbm93bj47IGJvZHk6IHN0cmluZyB9IHtcbiAgaWYgKCFyYXcuc3RhcnRzV2l0aCgnLS0tJykpIHJldHVybiB7IGRhdGE6IHt9LCBib2R5OiByYXcgfTtcbiAgY29uc3QgY2xvc2UgPSByYXcuaW5kZXhPZignXFxuLS0tJywgMyk7XG4gIGlmIChjbG9zZSA9PT0gLTEpIHJldHVybiB7IGRhdGE6IHt9LCBib2R5OiByYXcgfTtcbiAgY29uc3QgZmlyc3ROZXdsaW5lID0gcmF3LmluZGV4T2YoJ1xcbicpO1xuICBjb25zdCBibG9jayA9IHJhdy5zbGljZShmaXJzdE5ld2xpbmUgKyAxLCBjbG9zZSk7XG4gIGNvbnN0IGJvZHlTdGFydCA9IHJhdy5pbmRleE9mKCdcXG4nLCBjbG9zZSArIDEpO1xuICBjb25zdCBib2R5ID0gYm9keVN0YXJ0ID09PSAtMSA/ICcnIDogcmF3LnNsaWNlKGJvZHlTdGFydCArIDEpO1xuICBsZXQgZGF0YTogdW5rbm93biA9IHt9O1xuICB0cnkge1xuICAgIGRhdGEgPSBwYXJzZVlhbWwoYmxvY2spO1xuICB9IGNhdGNoIHtcbiAgICBkYXRhID0ge307XG4gIH1cbiAgY29uc3QgcmVjb3JkID1cbiAgICB0eXBlb2YgZGF0YSA9PT0gJ29iamVjdCcgJiYgZGF0YSAhPT0gbnVsbCAmJiAhQXJyYXkuaXNBcnJheShkYXRhKVxuICAgICAgPyAoZGF0YSBhcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPilcbiAgICAgIDoge307XG4gIHJldHVybiB7IGRhdGE6IHJlY29yZCwgYm9keSB9O1xufVxuXG4vKiogVmVyYmF0aW0gJyMjIEF1dG8gUnVuIFJlc3VsdCcgc2VjdGlvbiAoaGVhZGluZyBpbmNsdWRlZCksIHVwIHRvIHRoZSBuZXh0IEgyLiAqL1xuZnVuY3Rpb24gZXh0cmFjdEF1dG9SdW5SZXN1bHQoYm9keTogc3RyaW5nKTogc3RyaW5nIHwgbnVsbCB7XG4gIGNvbnN0IGxpbmVzID0gYm9keS5zcGxpdCgnXFxuJyk7XG4gIGNvbnN0IHN0YXJ0ID0gbGluZXMuZmluZEluZGV4KChsaW5lKSA9PiAvXiMjXFxzK2F1dG8gcnVuIHJlc3VsdFxccyokL2kudGVzdChsaW5lLnRyaW0oKSkpO1xuICBpZiAoc3RhcnQgPT09IC0xKSByZXR1cm4gbnVsbDtcbiAgbGV0IGVuZCA9IGxpbmVzLmxlbmd0aDtcbiAgZm9yIChsZXQgaSA9IHN0YXJ0ICsgMTsgaSA8IGxpbmVzLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgY29uc3QgbGluZSA9IGxpbmVzW2ldO1xuICAgIGlmIChsaW5lICE9PSB1bmRlZmluZWQgJiYgL14jI1xccysvLnRlc3QobGluZSkpIHtcbiAgICAgIGVuZCA9IGk7XG4gICAgICBicmVhaztcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGxpbmVzLnNsaWNlKHN0YXJ0LCBlbmQpLmpvaW4oJ1xcbicpLnRyaW1FbmQoKTtcbn1cblxuZnVuY3Rpb24gcmVhZFNwZWNSZXBvcnQoc3BlY0Fic1BhdGg6IHN0cmluZyk6IFNwZWNSZXBvcnQge1xuICBpZiAoIWV4aXN0c1N5bmMoc3BlY0Fic1BhdGgpKSB7XG4gICAgcmV0dXJuIHsgc3RhdHVzOiBudWxsLCBibG9ja2luZ0NvbmRpdGlvbjogbnVsbCwgYXV0b1J1blJlc3VsdDogbnVsbCB9O1xuICB9XG4gIGNvbnN0IHsgZGF0YSwgYm9keSB9ID0gc3BsaXRGcm9udG1hdHRlcihyZWFkRmlsZVN5bmMoc3BlY0Fic1BhdGgsICd1dGY4JykpO1xuICBjb25zdCBzdGF0dXNSYXcgPSBkYXRhWydzdGF0dXMnXTtcbiAgY29uc3Qgc3RhdHVzID1cbiAgICB0eXBlb2Ygc3RhdHVzUmF3ID09PSAnc3RyaW5nJyA/IHN0YXR1c1JhdyA6IHN0YXR1c1JhdyAhPSBudWxsID8gU3RyaW5nKHN0YXR1c1JhdykgOiBudWxsO1xuICBjb25zdCBhdXRvUnVuUmVzdWx0ID0gZXh0cmFjdEF1dG9SdW5SZXN1bHQoYm9keSk7XG4gIGxldCBibG9ja2luZ0NvbmRpdGlvbiA9XG4gICAgdHlwZW9mIGRhdGFbJ2Jsb2NraW5nX2NvbmRpdGlvbiddID09PSAnc3RyaW5nJyA/IGRhdGFbJ2Jsb2NraW5nX2NvbmRpdGlvbiddIDogbnVsbDtcbiAgaWYgKGJsb2NraW5nQ29uZGl0aW9uID09PSBudWxsICYmIGF1dG9SdW5SZXN1bHQgIT09IG51bGwpIHtcbiAgICBjb25zdCBtYXRjaCA9IC9eYmxvY2tpbmcgY29uZGl0aW9uOlxccyooLispJC9pbS5leGVjKGF1dG9SdW5SZXN1bHQpO1xuICAgIGJsb2NraW5nQ29uZGl0aW9uID0gbWF0Y2g/LlsxXT8udHJpbSgpID8/IG51bGw7XG4gIH1cbiAgcmV0dXJuIHsgc3RhdHVzLCBibG9ja2luZ0NvbmRpdGlvbiwgYXV0b1J1blJlc3VsdCB9O1xufVxuXG4vKiogUmV3cml0ZSAob3IgaW5zZXJ0KSB0aGUgZnJvbnRtYXR0ZXIgYHN0YXR1czpgIGxpbmUsIHByZXNlcnZpbmcgZXZlcnl0aGluZyBlbHNlLiAqL1xuZnVuY3Rpb24gc2V0RnJvbnRtYXR0ZXJTdGF0dXMoc3BlY0Fic1BhdGg6IHN0cmluZywgc3RhdHVzOiBzdHJpbmcpOiB2b2lkIHtcbiAgY29uc3QgcmF3ID0gcmVhZEZpbGVTeW5jKHNwZWNBYnNQYXRoLCAndXRmOCcpO1xuICBpZiAocmF3LnN0YXJ0c1dpdGgoJy0tLScpKSB7XG4gICAgY29uc3QgY2xvc2UgPSByYXcuaW5kZXhPZignXFxuLS0tJywgMyk7XG4gICAgaWYgKGNsb3NlICE9PSAtMSkge1xuICAgICAgY29uc3QgaGVhZCA9IHJhdy5zbGljZSgwLCBjbG9zZSk7XG4gICAgICBjb25zdCByZXN0ID0gcmF3LnNsaWNlKGNsb3NlKTtcbiAgICAgIGNvbnN0IHJlcGxhY2VkID0gL15zdGF0dXM6LiokL20udGVzdChoZWFkKVxuICAgICAgICA/IGhlYWQucmVwbGFjZSgvXnN0YXR1czouKiQvbSwgYHN0YXR1czogJHtzdGF0dXN9YClcbiAgICAgICAgOiBgJHtoZWFkfVxcbnN0YXR1czogJHtzdGF0dXN9YDtcbiAgICAgIHdyaXRlRmlsZVN5bmMoc3BlY0Fic1BhdGgsIHJlcGxhY2VkICsgcmVzdCwgJ3V0ZjgnKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gIH1cbiAgd3JpdGVGaWxlU3luYyhzcGVjQWJzUGF0aCwgYC0tLVxcbnN0YXR1czogJHtzdGF0dXN9XFxuLS0tXFxuJHtyYXd9YCwgJ3V0ZjgnKTtcbn1cblxuZnVuY3Rpb24gbm9ybWFsaXplU3RhdHVzKHN0YXR1czogc3RyaW5nIHwgbnVsbCk6IHN0cmluZyB8IG51bGwge1xuICBpZiAoc3RhdHVzID09PSBudWxsKSByZXR1cm4gbnVsbDtcbiAgY29uc3QgZmxhdCA9IHN0YXR1cy50cmltKCkudG9Mb3dlckNhc2UoKS5yZXBsYWNlQWxsKCctJywgJ18nKTtcbiAgcmV0dXJuIGZsYXQgPT09ICdyZXZpZXcnID8gJ2luX3JldmlldycgOiBmbGF0O1xufVxuXG4vKiogZGV2LWF1dG8gSEFMVCBibG9ja2luZyBjb25kaXRpb24gXHUyMTkyIEJMT0NLRURfUkVBU09OUyB0YXhvbm9teSAoZGVmYXVsdCAnb3RoZXInKS4gKi9cbmZ1bmN0aW9uIG1hcEJsb2NraW5nQ29uZGl0aW9uKGNvbmRpdGlvbjogc3RyaW5nIHwgbnVsbCk6IEJsb2NrZWRSZWFzb24ge1xuICBpZiAoY29uZGl0aW9uID09PSBudWxsKSByZXR1cm4gJ290aGVyJztcbiAgY29uc3QgYyA9IGNvbmRpdGlvbi50b0xvd2VyQ2FzZSgpO1xuICBpZiAoYy5pbmNsdWRlcygncmV2aWV3IHJlcGFpciBsb29wIGV4Y2VlZGVkJykpIHJldHVybiAncmV2aWV3X25vbl9jb252ZXJnZW5jZSc7XG4gIGlmIChjLmluY2x1ZGVzKCd1bmNsZWFyIGludGVudCcpKSByZXR1cm4gJ3VuY2xlYXJfaW50ZW50JztcbiAgaWYgKGMuaW5jbHVkZXMoJ25vIHN0b3JpZXMueWFtbCcpKSByZXR1cm4gJ25vX3N0b3JpZXNfeWFtbF9mb3VuZCc7XG4gIGlmIChjLmluY2x1ZGVzKCdhbWJpZ3VvdXMgc3RvcnkgZmlsZSBtYXRjaCcpKSByZXR1cm4gJ2FtYmlndW91c19zdG9yeV9maWxlX21hdGNoJztcbiAgaWYgKGMuaW5jbHVkZXMoJ25vIHN1YmFnZW50cycpKSByZXR1cm4gJ25vX3N1YmFnZW50cyc7XG4gIHJldHVybiAnb3RoZXInO1xufVxuXG5mdW5jdGlvbiBpc1JlbW90ZUVycm9yKGVycm9yOiB1bmtub3duLCBuYW1lOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgcmV0dXJuIChcbiAgICB0eXBlb2YgZXJyb3IgPT09ICdvYmplY3QnICYmXG4gICAgZXJyb3IgIT09IG51bGwgJiZcbiAgICAoZXJyb3IgYXMgeyBlcnJvck5hbWU/OiB1bmtub3duIH0pLmVycm9yTmFtZSA9PT0gbmFtZVxuICApO1xufVxuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIFN0ZXBzIDZcdTIwMTM5OiBtZWFzdXJlLCBzdWJtaXQgcmF3IGV2aWRlbmNlLCByb3V0ZSBieSBIQUxUIHN0YXR1c1xuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbmludGVyZmFjZSBGaW5pc2hBcmdzIHtcbiAgY2xpZW50OiBPYWhzQ2xpZW50O1xuICB3b3JrSXRlbTogV29ya0l0ZW07XG4gIGNsYWltOiBDbGFpbTtcbiAgLyoqIERpcmVjdG9yeSBob2xkaW5nIHRoZSBydW4ncyBmaWxlcyAoZnJlc2ggd29ya3RyZWUsIG9yIHRoZSBhZG9wdGVkIG9uZSkuICovXG4gIHdvcmtEaXI6IHN0cmluZztcbiAgLyoqIFNwZWMgZmlsZSBwYXRoIHJlbGF0aXZlIHRvIHRoZSByZXBvIHJvb3QuICovXG4gIHNwZWNSZWw6IHN0cmluZztcbiAgYmFzZWxpbmU6IHN0cmluZztcbiAgYnJhbmNoOiBzdHJpbmc7XG4gIHJlcG9QYXRoOiBzdHJpbmc7XG4gIHJlbW90ZTogc3RyaW5nO1xuICBhbGxvd2xpc3Q6IHJlYWRvbmx5IHN0cmluZ1tdO1xuICAvKiogbnVsbCB3aGVuIGFkb3B0aW5nICh0aGUgYWdlbnQgd2FzIGludm9rZWQgYnkgdGhlIGNyYXNoZWQgcnVuKS4gKi9cbiAgYWdlbnRFeGl0Q29kZTogbnVtYmVyIHwgbnVsbDtcbiAgc3VibWl0OiAoa2luZDogRXZpZGVuY2VbJ2tpbmQnXSwgcGF5bG9hZDogUmVjb3JkPHN0cmluZywgdW5rbm93bj4pID0+IFByb21pc2U8dm9pZD47XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGZpbmlzaFJ1bihhcmdzOiBGaW5pc2hBcmdzKTogUHJvbWlzZTwnaW5fcmV2aWV3JyB8ICdibG9ja2VkJz4ge1xuICBjb25zdCB7IGNsaWVudCwgd29ya0l0ZW0sIGNsYWltIH0gPSBhcmdzO1xuXG4gIC8vIDYgXHUyMDE0IHBhcnNlIEhBTFQ6IGZyb250bWF0dGVyIHN0YXR1cyArIHZlcmJhdGltIEF1dG8gUnVuIFJlc3VsdC5cbiAgY29uc3Qgc3BlYyA9IHJlYWRTcGVjUmVwb3J0KGpvaW4oYXJncy53b3JrRGlyLCBhcmdzLnNwZWNSZWwpKTtcbiAgYXdhaXQgYXJncy5zdWJtaXQoJ2hhbHRfcmVwb3J0Jywge1xuICAgIHN0YXR1czogc3BlYy5zdGF0dXMsXG4gICAgYmxvY2tpbmdDb25kaXRpb246IHNwZWMuYmxvY2tpbmdDb25kaXRpb24sXG4gICAgYXV0b1J1blJlc3VsdDogc3BlYy5hdXRvUnVuUmVzdWx0LFxuICAgIGFnZW50RXhpdENvZGU6IGFyZ3MuYWdlbnRFeGl0Q29kZSxcbiAgfSk7XG5cbiAgLy8gNyBcdTIwMTQgcGlubmVkIHZlcmlmaWNhdGlvbiBvbmx5OyB0aGUgYWxsb3dsaXN0IGdhdGVzIHdoYXQgZXZlciBnZXRzIGV4ZWN1dGVkLlxuICBmb3IgKGNvbnN0IGNvbW1hbmQgb2Ygd29ya0l0ZW0ucGlubmVkVmVyaWZpY2F0aW9uID8/IFtdKSB7XG4gICAgY29uc3QgYmluYXJ5ID0gY29tbWFuZC50cmltKCkuc3BsaXQoL1xccysvKVswXSA/PyAnJztcbiAgICBpZiAoIWFyZ3MuYWxsb3dsaXN0LmluY2x1ZGVzKGJpbmFyeSkpIHtcbiAgICAgIGF3YWl0IGFyZ3Muc3VibWl0KCd0ZXN0X3J1bicsIHsgY29tbWFuZCwgZXhpdENvZGU6IC0xLCByZWZ1c2VkOiB0cnVlIH0pO1xuICAgICAgY29udGludWU7XG4gICAgfVxuICAgIGNvbnN0IHJ1biA9IHNwYXduU3luYygnYmFzaCcsIFsnLWMnLCBjb21tYW5kXSwge1xuICAgICAgY3dkOiBhcmdzLndvcmtEaXIsXG4gICAgICBlbmNvZGluZzogJ3V0ZjgnLFxuICAgICAgdGltZW91dDogMTAgKiA2MCAqIDEwMDAsXG4gICAgfSk7XG4gICAgYXdhaXQgYXJncy5zdWJtaXQoJ3Rlc3RfcnVuJywgeyBjb21tYW5kLCBleGl0Q29kZTogcnVuLnN0YXR1cyA/PyAtMSB9KTtcbiAgfVxuXG4gIC8vIDggXHUyMDE0IGRpZmYgKyBwdXNoICsgY29tbWl0IGV2aWRlbmNlIChtZWFzdXJlZCwgbmV2ZXIganVkZ2VkIGhlcmUpLlxuICBjb25zdCBmaW5hbCA9IGdpdChbJ3Jldi1wYXJzZScsICdIRUFEJ10sIGFyZ3Mud29ya0Rpcik7XG4gIGNvbnN0IHNob3J0c3RhdCA9XG4gICAgZmluYWwgPT09IGFyZ3MuYmFzZWxpbmVcbiAgICAgID8gJydcbiAgICAgIDogZ2l0KFsnZGlmZicsICctLXNob3J0c3RhdCcsIGAke2FyZ3MuYmFzZWxpbmV9Li4ke2ZpbmFsfWBdLCBhcmdzLndvcmtEaXIpO1xuICBjb25zdCBmaWxlc0NoYW5nZWQgPSBOdW1iZXIoLyhcXGQrKSBmaWxlcz8gY2hhbmdlZC8uZXhlYyhzaG9ydHN0YXQpPy5bMV0gPz8gJzAnKTtcbiAgYXdhaXQgYXJncy5zdWJtaXQoJ2dpdF9kaWZmJywge1xuICAgIGJhc2VsaW5lOiBhcmdzLmJhc2VsaW5lLFxuICAgIGZpbmFsLFxuICAgIGZpbGVzQ2hhbmdlZCxcbiAgICBub25FbXB0eTogZmlsZXNDaGFuZ2VkID4gMCxcbiAgICBicmFuY2g6IGFyZ3MuYnJhbmNoLFxuICB9KTtcblxuICBnaXQoWydwdXNoJywgYXJncy5yZW1vdGUsIGFyZ3MuYnJhbmNoXSwgYXJncy5yZXBvUGF0aCk7XG4gIGNvbnN0IGxzUmVtb3RlID0gZ2l0KFsnbHMtcmVtb3RlJywgYXJncy5yZW1vdGUsIGByZWZzL2hlYWRzLyR7YXJncy5icmFuY2h9YF0sIGFyZ3MucmVwb1BhdGgpO1xuICBhd2FpdCBhcmdzLnN1Ym1pdCgnY29tbWl0Jywge1xuICAgIHNoYTogZmluYWwsXG4gICAgYnJhbmNoOiBhcmdzLmJyYW5jaCxcbiAgICByZWFjaGFibGVPblJlbW90ZTogbHNSZW1vdGUuaW5jbHVkZXMoZmluYWwpLFxuICB9KTtcblxuICAvLyA5IFx1MjAxNCByb3V0aW5nOiB0aGUgZmlsZSBzYXlzIHdoYXQgdGhlIGFnZW50IGNsYWltczsgdGhlIGNvcmUgZGVjaWRlcy5cbiAgY29uc3Qgc3RhdHVzID0gbm9ybWFsaXplU3RhdHVzKHNwZWMuc3RhdHVzKTtcbiAgY29uc3QgdG9rZW4gPSBjbGFpbS5mZW5jaW5nVG9rZW47XG4gIGlmIChzdGF0dXMgPT09ICdibG9ja2VkJykge1xuICAgIGF3YWl0IGNsaWVudC5jYWxsKCdibG9ja190YXNrJywge1xuICAgICAgd29ya0l0ZW1JZDogd29ya0l0ZW0uaWQsXG4gICAgICByZWFzb246IG1hcEJsb2NraW5nQ29uZGl0aW9uKHNwZWMuYmxvY2tpbmdDb25kaXRpb24pLFxuICAgICAgZmVuY2luZ1Rva2VuOiB0b2tlbixcbiAgICB9KTtcbiAgICBhd2FpdCBjbGllbnQuY2FsbCgncmVsZWFzZV9jbGFpbScsIHsgY2xhaW1JZDogY2xhaW0uaWQsIHJlYXNvbjogJ3J1biBibG9ja2VkJyB9KTtcbiAgICByZXR1cm4gJ2Jsb2NrZWQnO1xuICB9XG4gIGNvbnN0IGhhc0NvbW1pdCA9IGZpbmFsICE9PSBhcmdzLmJhc2VsaW5lO1xuICBpZiAoc3RhdHVzID09PSAnZG9uZScgfHwgc3RhdHVzID09PSAnaW5fcmV2aWV3JyB8fCAoc3RhdHVzID09PSAnaW5fcHJvZ3Jlc3MnICYmIGhhc0NvbW1pdCkpIHtcbiAgICBhd2FpdCBjbGllbnQuY2FsbCgnYWR2YW5jZV9zdGF0ZScsIHtcbiAgICAgIHdvcmtJdGVtSWQ6IHdvcmtJdGVtLmlkLFxuICAgICAgdG86ICdpbl9yZXZpZXcnLFxuICAgICAgZmVuY2luZ1Rva2VuOiB0b2tlbixcbiAgICB9KTtcbiAgICBhd2FpdCBjbGllbnQuY2FsbCgncmVsZWFzZV9jbGFpbScsIHsgY2xhaW1JZDogY2xhaW0uaWQsIHJlYXNvbjogJ3J1biBmaW5pc2hlZCcgfSk7XG4gICAgcmV0dXJuICdpbl9yZXZpZXcnO1xuICB9XG4gIC8vIEFnZW50IGV4aXRlZCBub24temVybyB3aXRoIG5vIHJlYWRhYmxlIEhBTFQgc3RhdHVzLCBvciBhbiB1bmtub3duIHN0YXR1cy5cbiAgYXdhaXQgY2xpZW50LmNhbGwoJ2Jsb2NrX3Rhc2snLCB7IHdvcmtJdGVtSWQ6IHdvcmtJdGVtLmlkLCByZWFzb246ICdvdGhlcicsIGZlbmNpbmdUb2tlbjogdG9rZW4gfSk7XG4gIGF3YWl0IGNsaWVudC5jYWxsKCdyZWxlYXNlX2NsYWltJywge1xuICAgIGNsYWltSWQ6IGNsYWltLmlkLFxuICAgIHJlYXNvbjogJ3J1biBmYWlsZWQgd2l0aG91dCBhIHJlYWRhYmxlIEhBTFQnLFxuICB9KTtcbiAgcmV0dXJuICdibG9ja2VkJztcbn1cblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBDcmFzaC1yZWNvdmVyeSBzY2FuIChzdGVwIDEwKVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbmludGVyZmFjZSBXb3JrdHJlZVNjYW4ge1xuICBhZG9wdGFibGU6IHsgZGlyOiBzdHJpbmc7IGhlYWQ6IHN0cmluZzsgYmFzZWxpbmU6IHN0cmluZyB9IHwgbnVsbDtcbiAgd3JlY2tlZDogc3RyaW5nW107XG59XG5cbmZ1bmN0aW9uIHNjYW5PbGRXb3JrdHJlZXMocm9vdDogc3RyaW5nLCB3b3JrSXRlbUlkOiBzdHJpbmcsIHNwZWNSZWw6IHN0cmluZyk6IFdvcmt0cmVlU2NhbiB7XG4gIGNvbnN0IHNjYW46IFdvcmt0cmVlU2NhbiA9IHsgYWRvcHRhYmxlOiBudWxsLCB3cmVja2VkOiBbXSB9O1xuICBpZiAoIWV4aXN0c1N5bmMocm9vdCkpIHJldHVybiBzY2FuO1xuICBmb3IgKGNvbnN0IG5hbWUgb2YgcmVhZGRpclN5bmMocm9vdCkpIHtcbiAgICBjb25zdCBkaXIgPSBqb2luKHJvb3QsIG5hbWUpO1xuICAgIGNvbnN0IG1hcmtlciA9IHJlYWRNYXJrZXIoZGlyKTtcbiAgICBpZiAobWFya2VyID09PSBudWxsIHx8IG1hcmtlci53b3JrSXRlbUlkICE9PSB3b3JrSXRlbUlkKSBjb250aW51ZTtcbiAgICBsZXQgaGVhZDogc3RyaW5nIHwgbnVsbCA9IG51bGw7XG4gICAgdHJ5IHtcbiAgICAgIGhlYWQgPSBnaXQoWydyZXYtcGFyc2UnLCAnSEVBRCddLCBkaXIpO1xuICAgIH0gY2F0Y2gge1xuICAgICAgaGVhZCA9IG51bGw7XG4gICAgfVxuICAgIGNvbnN0IHN0YXR1cyA9IG5vcm1hbGl6ZVN0YXR1cyhyZWFkU3BlY1JlcG9ydChqb2luKGRpciwgc3BlY1JlbCkpLnN0YXR1cyk7XG4gICAgY29uc3QgdGVybWluYWwgPSBzdGF0dXMgPT09ICdkb25lJyB8fCBzdGF0dXMgPT09ICdpbl9yZXZpZXcnO1xuICAgIGlmIChzY2FuLmFkb3B0YWJsZSA9PT0gbnVsbCAmJiBoZWFkICE9PSBudWxsICYmIGhlYWQgIT09IG1hcmtlci5iYXNlbGluZSAmJiB0ZXJtaW5hbCkge1xuICAgICAgc2Nhbi5hZG9wdGFibGUgPSB7IGRpciwgaGVhZCwgYmFzZWxpbmU6IG1hcmtlci5iYXNlbGluZSB9O1xuICAgIH0gZWxzZSB7XG4gICAgICBzY2FuLndyZWNrZWQucHVzaChkaXIpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gc2Nhbjtcbn1cblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBydW5PbmNlIFx1MjAxNCBvbmUgZnVsbCBkaXNwYXRjaCBjeWNsZVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBydW5PbmNlKG9wdGlvbnM6IFJ1bm5lck9wdGlvbnMpOiBQcm9taXNlPFJ1bk9uY2VSZXN1bHQ+IHtcbiAgY29uc3QgeyBjbGllbnQgfSA9IG9wdGlvbnM7XG4gIGNvbnN0IHJlcG9QYXRoID0gcmVzb2x2ZShvcHRpb25zLnJlcG9QYXRoKTtcbiAgY29uc3QgcmVtb3RlID0gb3B0aW9ucy5yZW1vdGUgPz8gJ29yaWdpbic7XG4gIGNvbnN0IGFsbG93bGlzdCA9IG9wdGlvbnMudmVyaWZpY2F0aW9uQWxsb3dsaXN0ID8/IERFRkFVTFRfVkVSSUZJQ0FUSU9OX0FMTE9XTElTVDtcblxuICAvLyAxIFx1MjAxNCBwb2xsLiBPcmRlciBvZiB0aGUgQVBJIHJlc3BvbnNlID0gaW1wb3J0IG9yZGVyOyB0YWtlIHRoZSBmaXJzdC5cbiAgLy8gRmFsbGJhY2s6IGFuIGluX3Byb2dyZXNzIGl0ZW0gd2l0aCBubyBsaXZlIGNsYWltIGlzIGEgY3Jhc2hlZCBkaXNwYXRjaC5cbiAgY29uc3QgbGlzdFVuYmxvY2tlZCA9IGFzeW5jIChzdGF0ZTogV29ya0l0ZW1TdGF0ZSk6IFByb21pc2U8V29ya0l0ZW1bXT4gPT5cbiAgICAoYXdhaXQgY2xpZW50LmNhbGw8V29ya0l0ZW1bXT4oJ2xpc3Rfd29ya19pdGVtcycsIHsgc3RhdGUsIGNsYWltYWJsZTogdHJ1ZSB9KSkuZmlsdGVyKFxuICAgICAgKGl0ZW0pID0+IGl0ZW0uYmxvY2tlZFJlYXNvbiA9PT0gbnVsbCxcbiAgICApO1xuICBsZXQgY2FuZGlkYXRlcyA9IGF3YWl0IGxpc3RVbmJsb2NrZWQoJ3JlYWR5X2Zvcl9kZXYnKTtcbiAgaWYgKGNhbmRpZGF0ZXMubGVuZ3RoID09PSAwKSBjYW5kaWRhdGVzID0gYXdhaXQgbGlzdFVuYmxvY2tlZCgnaW5fcHJvZ3Jlc3MnKTtcbiAgY29uc3QgcGlja2VkID0gY2FuZGlkYXRlc1swXTtcbiAgaWYgKHBpY2tlZCA9PT0gdW5kZWZpbmVkKSByZXR1cm4geyBkaXNwYXRjaGVkOiBmYWxzZSB9O1xuXG4gIGxldCBjbGFpbTogQ2xhaW07XG4gIHRyeSB7XG4gICAgY2xhaW0gPSBhd2FpdCBjbGllbnQuY2FsbDxDbGFpbT4oJ2NsYWltX3Rhc2snLCB7IHdvcmtJdGVtSWQ6IHBpY2tlZC5pZCB9KTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBpZiAoaXNSZW1vdGVFcnJvcihlcnJvciwgJ0NvbmZsaWN0RXJyb3InKSkge1xuICAgICAgcmV0dXJuIHsgZGlzcGF0Y2hlZDogZmFsc2UsIGRldGFpbHM6IGBsb3N0IHRoZSBjbGFpbSByYWNlIGZvciAke3BpY2tlZC5leHRlcm5hbEtleX1gIH07XG4gICAgfVxuICAgIHRocm93IGVycm9yO1xuICB9XG5cbiAgY29uc3QgY29udGV4dCA9IGF3YWl0IGNsaWVudC5jYWxsPHsgd29ya0l0ZW06IFdvcmtJdGVtOyBlbnRyeVN0YXRlOiBXb3JrSXRlbVN0YXRlIH0+KFxuICAgICdnZXRfdGFza19jb250ZXh0JyxcbiAgICB7IHdvcmtJdGVtSWQ6IHBpY2tlZC5pZCB9LFxuICApO1xuICBjb25zdCB3b3JrSXRlbSA9IGNvbnRleHQud29ya0l0ZW07XG4gIGNvbnN0IHNwZWNSZWwgPSBqb2luKG9wdGlvbnMuc3BlY0ZvbGRlciwgd29ya0l0ZW0uc3BlY1BhdGgpO1xuICBjb25zdCBicmFuY2ggPSBgY2xhaW0vJHtjbGFpbS5pZH1gO1xuICBjb25zdCB3b3JrdHJlZXNSb290ID0gam9pbihyZXBvUGF0aCwgJy5vYWhzJywgJ3dvcmt0cmVlcycpO1xuICBjb25zdCBldmlkZW5jZTogRXZpZGVuY2VbXSA9IFtdO1xuXG4gIGNvbnN0IHN1Ym1pdCA9IGFzeW5jIChraW5kOiBFdmlkZW5jZVsna2luZCddLCBwYXlsb2FkOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPik6IFByb21pc2U8dm9pZD4gPT4ge1xuICAgIGNvbnN0IGl0ZW06IEV2aWRlbmNlID0geyBraW5kLCBwYXlsb2FkIH07XG4gICAgZXZpZGVuY2UucHVzaChpdGVtKTtcbiAgICBhd2FpdCBjbGllbnQuY2FsbCgnc3VibWl0X2V2aWRlbmNlJywge1xuICAgICAgd29ya0l0ZW1JZDogd29ya0l0ZW0uaWQsXG4gICAgICBldmlkZW5jZTogaXRlbSxcbiAgICAgIGZlbmNpbmdUb2tlbjogY2xhaW0uZmVuY2luZ1Rva2VuLFxuICAgIH0pO1xuICB9O1xuXG4gIGNvbnN0IGJhc2UgPSB7XG4gICAgZGlzcGF0Y2hlZDogdHJ1ZSxcbiAgICB3b3JrSXRlbUlkOiB3b3JrSXRlbS5pZCxcbiAgICBleHRlcm5hbEtleTogd29ya0l0ZW0uZXh0ZXJuYWxLZXksXG4gICAgY2xhaW1JZDogY2xhaW0uaWQsXG4gICAgZXZpZGVuY2UsXG4gIH0gc2F0aXNmaWVzIFJ1bk9uY2VSZXN1bHQ7XG5cbiAgY29uc3QgZmluaXNoQXJncyA9IHtcbiAgICBjbGllbnQsXG4gICAgd29ya0l0ZW0sXG4gICAgY2xhaW0sXG4gICAgc3BlY1JlbCxcbiAgICBicmFuY2gsXG4gICAgcmVwb1BhdGgsXG4gICAgcmVtb3RlLFxuICAgIGFsbG93bGlzdCxcbiAgICBzdWJtaXQsXG4gIH07XG5cbiAgLy8gMTAgXHUyMDE0IGFkb3B0IChjcmFzaCByZWNvdmVyeSk6IGluc3BlY3QgbGVmdG92ZXIgd29ya3RyZWVzIG9mIHRoaXMgd29yayBpdGVtLlxuICBjb25zdCBzY2FuID0gc2Nhbk9sZFdvcmt0cmVlcyh3b3JrdHJlZXNSb290LCB3b3JrSXRlbS5pZCwgc3BlY1JlbCk7XG4gIGlmIChzY2FuLmFkb3B0YWJsZSAhPT0gbnVsbCkge1xuICAgIGNvbnN0IHsgZGlyLCBoZWFkLCBiYXNlbGluZSB9ID0gc2Nhbi5hZG9wdGFibGU7XG4gICAgLy8gVGhlIG5ldyBjbGFpbSdzIGJyYW5jaCBwb2ludHMgYXQgdGhlIGNyYXNoZWQgcnVuJ3MgZmluaXNoZWQgSEVBRDsgdGhlXG4gICAgLy8gYWdlbnQgaXMgTk9UIHJlLWludm9rZWQgXHUyMDE0IHRoaXMgaXMgbGF0ZSBldmlkZW5jZSBzdWJtaXNzaW9uLCBub3QgcmVkby5cbiAgICBnaXQoWydicmFuY2gnLCBicmFuY2gsIGhlYWRdLCByZXBvUGF0aCk7XG4gICAgLy8gRW50cnktc3RhdGUgYWxpZ25tZW50IChuby1vcCB3aGVuIHRoZSBjcmFzaGVkIHJ1biBhbHJlYWR5IGFkdmFuY2VkKS5cbiAgICBhd2FpdCBjbGllbnQuY2FsbCgnYWR2YW5jZV9zdGF0ZScsIHtcbiAgICAgIHdvcmtJdGVtSWQ6IHdvcmtJdGVtLmlkLFxuICAgICAgdG86ICdpbl9wcm9ncmVzcycsXG4gICAgICBmZW5jaW5nVG9rZW46IGNsYWltLmZlbmNpbmdUb2tlbixcbiAgICB9KTtcbiAgICBpZiAob3B0aW9ucy5mYWlscG9pbnQgPT09ICdiZWZvcmVfcmVwb3J0Jykge1xuICAgICAgcmV0dXJuIHsgLi4uYmFzZSwgb3V0Y29tZTogJ2NyYXNoZWQnLCBkZXRhaWxzOiAnZmFpbHBvaW50IGJlZm9yZV9yZXBvcnQgKGFkb3B0IHBhdGgpJyB9O1xuICAgIH1cbiAgICBjb25zdCBvdXRjb21lID0gYXdhaXQgZmluaXNoUnVuKHtcbiAgICAgIC4uLmZpbmlzaEFyZ3MsXG4gICAgICB3b3JrRGlyOiBkaXIsXG4gICAgICBiYXNlbGluZSxcbiAgICAgIGFnZW50RXhpdENvZGU6IG51bGwsXG4gICAgfSk7XG4gICAgcmVtb3ZlV29ya3RyZWUoZGlyLCByZXBvUGF0aCk7XG4gICAgcmV0dXJuIHtcbiAgICAgIC4uLmJhc2UsXG4gICAgICBvdXRjb21lOiBvdXRjb21lID09PSAnaW5fcmV2aWV3JyA/ICdhZG9wdGVkX2luX3JldmlldycgOiBvdXRjb21lLFxuICAgICAgZGV0YWlsczogYGFkb3B0ZWQgZmluaXNoZWQgd29ya3RyZWUgJHtkaXJ9YCxcbiAgICB9O1xuICB9XG4gIGlmIChzY2FuLndyZWNrZWQubGVuZ3RoID4gMCkge1xuICAgIC8vIEEgd3JlY2tlZCB3b3JrdHJlZSAobm8gY29tbWl0IHBhc3QgYmFzZWxpbmUgLyBub24tdGVybWluYWwgc3RhdHVzKSBpc1xuICAgIC8vIGNsZWFuZWQ7IHRoZSBpdGVtIGJsb2NrcyBzdGFsZV93b3JrdHJlZSBmb3IgYSBodW1hbiBsb29rLlxuICAgIGZvciAoY29uc3QgZGlyIG9mIHNjYW4ud3JlY2tlZCkgcmVtb3ZlV29ya3RyZWUoZGlyLCByZXBvUGF0aCk7XG4gICAgYXdhaXQgY2xpZW50LmNhbGwoJ2Jsb2NrX3Rhc2snLCB7XG4gICAgICB3b3JrSXRlbUlkOiB3b3JrSXRlbS5pZCxcbiAgICAgIHJlYXNvbjogJ3N0YWxlX3dvcmt0cmVlJyxcbiAgICAgIGZlbmNpbmdUb2tlbjogY2xhaW0uZmVuY2luZ1Rva2VuLFxuICAgIH0pO1xuICAgIGF3YWl0IGNsaWVudC5jYWxsKCdyZWxlYXNlX2NsYWltJywgeyBjbGFpbUlkOiBjbGFpbS5pZCwgcmVhc29uOiAnc3RhbGUgd29ya3RyZWUgY2xlYW5lZCcgfSk7XG4gICAgcmV0dXJuIHsgLi4uYmFzZSwgb3V0Y29tZTogJ2Jsb2NrZWQnLCBkZXRhaWxzOiAnc3RhbGUgd29ya3RyZWUgY2xlYW5lZDsgdGFzayBibG9ja2VkJyB9O1xuICB9XG5cbiAgLy8gMiBcdTIwMTQgZ2l0IHBsdW1iaW5nOiBiYXNlbGluZSwgY2xhaW0gYnJhbmNoLCBjbGFpbS1uYW1lZCB3b3JrdHJlZS5cbiAgY29uc3QgYmFzZWxpbmUgPSBnaXQoWydyZXYtcGFyc2UnLCAnSEVBRCddLCByZXBvUGF0aCk7XG4gIGVuc3VyZUdpdEV4Y2x1ZGVzKHJlcG9QYXRoKTtcbiAgbWtkaXJTeW5jKHdvcmt0cmVlc1Jvb3QsIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xuICBjb25zdCB3b3JrdHJlZURpciA9IGpvaW4od29ya3RyZWVzUm9vdCwgY2xhaW0uaWQpO1xuICBnaXQoWyd3b3JrdHJlZScsICdhZGQnLCAnLWInLCBicmFuY2gsIHdvcmt0cmVlRGlyLCBiYXNlbGluZV0sIHJlcG9QYXRoKTtcbiAgd3JpdGVNYXJrZXIod29ya3RyZWVEaXIsIHtcbiAgICB3b3JrSXRlbUlkOiB3b3JrSXRlbS5pZCxcbiAgICBjbGFpbUlkOiBjbGFpbS5pZCxcbiAgICBiYXNlbGluZSxcbiAgICBpbnZvY2F0aW9uczogMCxcbiAgfSk7XG5cbiAgLy8gMyBcdTIwMTQgbWlycm9yLW9uLWRpc3BhdGNoOiBzdGFtcCBmcm9udG1hdHRlciB0byB0aGUgREIgZW50cnkgc3RhdGUgc28gdGhlXG4gIC8vIG9uZSBtb21lbnQgdGhlIGZpbGUgaXMgcmVhZCBhcyBhbiBlbnRyeSBzdGF0ZSwgaXQgaXMgZnJlc2ggKFx1MDBBNzEuNikuXG4gIGNvbnN0IHNwZWNBYnMgPSBqb2luKHdvcmt0cmVlRGlyLCBzcGVjUmVsKTtcbiAgaWYgKGV4aXN0c1N5bmMoc3BlY0FicykpIHtcbiAgICBzZXRGcm9udG1hdHRlclN0YXR1cyhzcGVjQWJzLCBFTlRSWV9TVEFUVVNbY29udGV4dC5lbnRyeVN0YXRlXSA/PyBjb250ZXh0LmVudHJ5U3RhdGUpO1xuICB9XG5cbiAgLy8gNCBcdTIwMTQgYWR2YW5jZSBpbnRvIGV4ZWN1dGlvbiBCRUZPUkUgdGhlIGFnZW50IHJ1bnMgKERCIGlzIHRoZSBlbnRyeSBzdGF0ZSkuXG4gIGF3YWl0IGNsaWVudC5jYWxsKCdhZHZhbmNlX3N0YXRlJywge1xuICAgIHdvcmtJdGVtSWQ6IHdvcmtJdGVtLmlkLFxuICAgIHRvOiAnaW5fcHJvZ3Jlc3MnLFxuICAgIGZlbmNpbmdUb2tlbjogY2xhaW0uZmVuY2luZ1Rva2VuLFxuICB9KTtcblxuICAvLyA1IFx1MjAxNCBpbnZva2UgdGhlIGNvZGluZyBhZ2VudC5cbiAgY29uc3QgY29tbWFuZCA9IG9wdGlvbnMuYWdlbnRDbWRcbiAgICAucmVwbGFjZUFsbCgne1NQRUNfRk9MREVSfScsIG9wdGlvbnMuc3BlY0ZvbGRlcilcbiAgICAucmVwbGFjZUFsbCgne1NUT1JZX0lEfScsIHdvcmtJdGVtLmV4dGVybmFsS2V5KVxuICAgIC5yZXBsYWNlQWxsKCd7SU5WT0tFX1dJVEh9Jywgd29ya0l0ZW0uaW52b2tlRGV2V2l0aClcbiAgICAucmVwbGFjZUFsbCgne1dPUktUUkVFfScsIHdvcmt0cmVlRGlyKTtcbiAgd3JpdGVNYXJrZXIod29ya3RyZWVEaXIsIHtcbiAgICB3b3JrSXRlbUlkOiB3b3JrSXRlbS5pZCxcbiAgICBjbGFpbUlkOiBjbGFpbS5pZCxcbiAgICBiYXNlbGluZSxcbiAgICBpbnZvY2F0aW9uczogMSxcbiAgfSk7XG4gIGNvbnN0IGludm9rZWQgPSBzcGF3blN5bmMoJ2Jhc2gnLCBbJy1sYycsIGNvbW1hbmRdLCB7XG4gICAgY3dkOiB3b3JrdHJlZURpcixcbiAgICBlbmNvZGluZzogJ3V0ZjgnLFxuICAgIHRpbWVvdXQ6IG9wdGlvbnMuYWdlbnRUaW1lb3V0TXMgPz8gMzAgKiA2MCAqIDEwMDAsXG4gICAga2lsbFNpZ25hbDogJ1NJR0tJTEwnLFxuICAgIGVudjoge1xuICAgICAgLi4ucHJvY2Vzcy5lbnYsXG4gICAgICAuLi5vcHRpb25zLmFnZW50RW52LFxuICAgICAgT0FIU19TUEVDX0ZJTEU6IHNwZWNBYnMsXG4gICAgICBPQUhTX1NUT1JZX0lEOiB3b3JrSXRlbS5leHRlcm5hbEtleSxcbiAgICB9LFxuICB9KTtcbiAgY29uc3QgYWdlbnRFeGl0Q29kZSA9IGludm9rZWQuc3RhdHVzID8/IC0xO1xuXG4gIC8vIFRFU1QgT05MWTogc2ltdWxhdGUgZHlpbmcgYWZ0ZXIgdGhlIGFnZW50IGNvbW1pdHRlZCwgYmVmb3JlIGFueSByZXBvcnQuXG4gIC8vIE5vIGV2aWRlbmNlLCBubyBhZHZhbmNlLCBubyByZWxlYXNlIFx1MjAxNCB0aGUgY2xhaW0gc3RheXMgbGl2ZSwgdGhlIHdvcmt0cmVlXG4gIC8vIHN0YXlzIG9uIGRpc2s7IGEgbGF0ZXIgY2xhaW0gYWRvcHRzIG9yIGNsZWFucyBpdCAoc3RlcCAxMCkuXG4gIGlmIChvcHRpb25zLmZhaWxwb2ludCA9PT0gJ2JlZm9yZV9yZXBvcnQnKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIC4uLmJhc2UsXG4gICAgICBvdXRjb21lOiAnY3Jhc2hlZCcsXG4gICAgICBkZXRhaWxzOiAnZmFpbHBvaW50IGJlZm9yZV9yZXBvcnQ6IGRpZWQgYWZ0ZXIgdGhlIGFnZW50IHJhbiwgYmVmb3JlIHJlcG9ydGluZycsXG4gICAgfTtcbiAgfVxuXG4gIGNvbnN0IG91dGNvbWUgPSBhd2FpdCBmaW5pc2hSdW4oe1xuICAgIC4uLmZpbmlzaEFyZ3MsXG4gICAgd29ya0Rpcjogd29ya3RyZWVEaXIsXG4gICAgYmFzZWxpbmUsXG4gICAgYWdlbnRFeGl0Q29kZSxcbiAgfSk7XG4gIHJlbW92ZVdvcmt0cmVlKHdvcmt0cmVlRGlyLCByZXBvUGF0aCk7XG4gIHJldHVybiB7IC4uLmJhc2UsIG91dGNvbWUgfTtcbn1cblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyB3b3JrTG9vcCBcdTIwMTQgcG9sbCBcdTIxOTIgcnVuT25jZSBcdTIxOTIgc2xlZXBcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4vKiogUnVuIHVudGlsIHN0b3BwZWQ6IHBvbGwgXHUyMTkyIHJ1bk9uY2UgXHUyMTkyIHNsZWVwKHBvbGxNcykuIFNJR0lOVCBleGl0cyBjbGVhbmx5LiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHdvcmtMb29wKG9wdGlvbnM6IFJ1bm5lck9wdGlvbnMgJiB7IG9uY2U/OiBib29sZWFuIH0pOiBQcm9taXNlPHZvaWQ+IHtcbiAgbGV0IHN0b3BwZWQgPSBmYWxzZTtcbiAgbGV0IHdha2U6ICgoKSA9PiB2b2lkKSB8IHVuZGVmaW5lZDtcbiAgY29uc3Qgb25TaWdpbnQgPSAoKTogdm9pZCA9PiB7XG4gICAgc3RvcHBlZCA9IHRydWU7XG4gICAgd2FrZT8uKCk7XG4gIH07XG4gIHByb2Nlc3Mub25jZSgnU0lHSU5UJywgb25TaWdpbnQpO1xuICB0cnkge1xuICAgIGZvciAoOzspIHtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHJ1bk9uY2Uob3B0aW9ucyk7XG4gICAgICBpZiAob3B0aW9ucy5vbmNlID09PSB0cnVlIHx8IHN0b3BwZWQpIHJldHVybjtcbiAgICAgIGlmICghcmVzdWx0LmRpc3BhdGNoZWQpIHtcbiAgICAgICAgYXdhaXQgbmV3IFByb21pc2U8dm9pZD4oKHJlc29sdmVTbGVlcCkgPT4ge1xuICAgICAgICAgIHdha2UgPSByZXNvbHZlU2xlZXA7XG4gICAgICAgICAgc2V0VGltZW91dChyZXNvbHZlU2xlZXAsIG9wdGlvbnMucG9sbE1zID8/IDE1XzAwMCk7XG4gICAgICAgIH0pO1xuICAgICAgICB3YWtlID0gdW5kZWZpbmVkO1xuICAgICAgICBpZiAoc3RvcHBlZCkgcmV0dXJuO1xuICAgICAgfVxuICAgIH1cbiAgfSBmaW5hbGx5IHtcbiAgICBwcm9jZXNzLnJlbW92ZUxpc3RlbmVyKCdTSUdJTlQnLCBvblNpZ2ludCk7XG4gIH1cbn1cbiIsICIvKipcbiAqIFRoZSBgb2Foc2AgYmluYXJ5IFx1MjAxNCBjb21tYW5kZXIgd2lyaW5nIE9OTFkuIEV2ZXJ5IGdhdGUtaG9sZGVyIGNvbW1hbmQgaXMgYVxuICogcHVyZSBmdW5jdGlvbiBpbiBzcmMvY29tbWFuZHMvIHRha2luZyAoY2xpZW50LCBvcHRzKTsgc2VydmUgbGl2ZXMgaW5cbiAqIHNyYy9zZXJ2ZS50czsgdGhlIHdvcmtlciBsb29wIGxpdmVzIGluIEBvYWhzL3J1bm5lciBhbmQgaXMgaW1wb3J0ZWQgTEFaSUxZXG4gKiBzbyB0aGUgcmVzdCBvZiB0aGUgQ0xJIHdvcmtzIHdoaWxlIHRoZSBydW5uZXIgaXMgc3RpbGwgbGFuZGluZyAoc3RvcnkgMTQpLlxuICpcbiAqIEVudiBpcyByZWFkIGhlcmUgYW5kIG9ubHkgaGVyZTogT0FIU19UT0tFTiAoY2xpZW50IGF1dGgpIGFuZFxuICogT0FIU19BRE1JTl9UT0tFTiAoc2VydmUgYm9vdHN0cmFwKS5cbiAqL1xuaW1wb3J0IHsgcmVzb2x2ZSB9IGZyb20gJ25vZGU6cGF0aCc7XG5cbmltcG9ydCB7IENvbW1hbmQgfSBmcm9tICdjb21tYW5kZXInO1xuaW1wb3J0IHsgbWFrZUNsaWVudCwgdHlwZSBPYWhzQ2xpZW50IH0gZnJvbSAnQG9haHMvY29udHJhY3RzJztcblxuaW1wb3J0IHtcbiAgYWN0b3JDcmVhdGVDb21tYW5kLFxuICBhZHZhbmNlQ29tbWFuZCxcbiAgYWR2aXNlTmV4dFRhc2tDb21tYW5kLFxuICBhZHZpc2VSZWNvbmNpbGVDb21tYW5kLFxuICBhcHByb3ZlQ29tbWFuZCxcbiAgYXV0aHpDb21tYW5kLFxuICBldmVudHNDb21tYW5kLFxuICBmZWF0dXJlQ3JlYXRlQ29tbWFuZCxcbiAgZ2F0ZVBvbGljeVNldENvbW1hbmQsXG4gIGdvdmVybmFuY2VTZXRDb21tYW5kLFxuICBncmFudENvbW1hbmQsXG4gIGltcG9ydFN0b3JpZXNDb21tYW5kLFxuICBpbmJveENvbW1hbmQsXG4gIGpvYkNvbXBsZXRlQ29tbWFuZCxcbiAgam9ic0NvbW1hbmQsXG4gIG1lc3NhZ2VzQ29tbWFuZCxcbiAgbm90aWZpY2F0aW9uc0NvbW1hbmQsXG4gIHBsYW5TZXRDb21tYW5kLFxuICBwb2xpY3lTZXRDb21tYW5kLFxuICBwb3N0Q29tbWFuZCxcbiAgcmVqZWN0Q29tbWFuZCxcbiAgcm9sZUFzc2lnbkNvbW1hbmQsXG4gIHJvbGVMaXN0Q29tbWFuZCxcbiAgcm9sZVJldm9rZUNvbW1hbmQsXG4gIHJ1blRvT3V0cHV0LFxuICBzdGF0dXNDb21tYW5kLFxuICB0aHJlYWRDcmVhdGVDb21tYW5kLFxuICB0aHJlYWRMaXN0Q29tbWFuZCxcbn0gZnJvbSAnLi9jb21tYW5kcy9pbmRleC5qcyc7XG5pbXBvcnQgeyBERUZBVUxUX1BPUlQsIHN0YXJ0U2VydmUgfSBmcm9tICcuL3NlcnZlLmpzJztcblxuY29uc3QgREVGQVVMVF9VUkwgPSBgaHR0cDovL2xvY2FsaG9zdDoke0RFRkFVTFRfUE9SVH1gO1xuXG5pbnRlcmZhY2UgQ2xpZW50RmxhZ3Mge1xuICB1cmw6IHN0cmluZztcbiAgdG9rZW4/OiBzdHJpbmc7XG59XG5cbmZ1bmN0aW9uIGNsaWVudEZyb20oZmxhZ3M6IENsaWVudEZsYWdzKTogT2Foc0NsaWVudCB7XG4gIGNvbnN0IHRva2VuID0gZmxhZ3MudG9rZW4gPz8gcHJvY2Vzcy5lbnZbJ09BSFNfVE9LRU4nXTtcbiAgaWYgKHRva2VuID09PSB1bmRlZmluZWQgfHwgdG9rZW4ubGVuZ3RoID09PSAwKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdtaXNzaW5nIHRva2VuOiBwYXNzIC0tdG9rZW4gPHRva2VuPiBvciBzZXQgT0FIU19UT0tFTicpO1xuICB9XG4gIHJldHVybiBtYWtlQ2xpZW50KHsgYmFzZVVybDogZmxhZ3MudXJsLCB0b2tlbiB9KTtcbn1cblxuLyoqIEF0dGFjaCB0aGUgc2hhcmVkIGNsaWVudCBmbGFncyB0byBhIGdhdGUtaG9sZGVyIGNvbW1hbmQuICovXG5mdW5jdGlvbiB3aXRoQ2xpZW50RmxhZ3MoY21kOiBDb21tYW5kKTogQ29tbWFuZCB7XG4gIHJldHVybiBjbWRcbiAgICAub3B0aW9uKCctLXVybCA8dXJsPicsICdzcGluZS1hcGkgYmFzZSBVUkwnLCBERUZBVUxUX1VSTClcbiAgICAub3B0aW9uKCctLXRva2VuIDx0b2tlbj4nLCAnYmVhcmVyIHRva2VuIChkZWZhdWx0OiBlbnYgT0FIU19UT0tFTiknKTtcbn1cblxuLyoqIFJ1biBhIGNvbW1hbmQgZnVuY3Rpb24gYW5kIHRyYW5zbGF0ZSBpdHMgb3V0Y29tZSB0byBzdGRvdXQvc3RkZXJyICsgZXhpdCBjb2RlLiAqL1xuYXN5bmMgZnVuY3Rpb24gZW1pdChmbjogKCkgPT4gUHJvbWlzZTxzdHJpbmc+KTogUHJvbWlzZTx2b2lkPiB7XG4gIGNvbnN0IHsgdGV4dCwgZXhpdENvZGUgfSA9IGF3YWl0IHJ1blRvT3V0cHV0KGZuKTtcbiAgaWYgKGV4aXRDb2RlID09PSAwKSB7XG4gICAgcHJvY2Vzcy5zdGRvdXQud3JpdGUoYCR7dGV4dH1cXG5gKTtcbiAgfSBlbHNlIHtcbiAgICBwcm9jZXNzLnN0ZGVyci53cml0ZShgJHt0ZXh0fVxcbmApO1xuICAgIHByb2Nlc3MuZXhpdENvZGUgPSBleGl0Q29kZTtcbiAgfVxufVxuXG5jb25zdCBjb2xsZWN0ID0gKHZhbHVlOiBzdHJpbmcsIHByZXZpb3VzOiBzdHJpbmdbXSk6IHN0cmluZ1tdID0+IFsuLi5wcmV2aW91cywgdmFsdWVdO1xuXG5leHBvcnQgZnVuY3Rpb24gYnVpbGRQcm9ncmFtKCk6IENvbW1hbmQge1xuICBjb25zdCBwcm9ncmFtID0gbmV3IENvbW1hbmQoKTtcbiAgcHJvZ3JhbVxuICAgIC5uYW1lKCdvYWhzJylcbiAgICAuZGVzY3JpcHRpb24oJ29haHMgXHUyMDE0IE9wZW4gQWdlbnRzIEhhcm5lc3MgU3lzdGVtIENMSSAoc3BpbmUgc2VydmVyICsgZ2F0ZS1ob2xkZXIgY29tbWFuZHMpJyk7XG5cbiAgLy8gLS0gc2VydmUgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHByb2dyYW1cbiAgICAuY29tbWFuZCgnc2VydmUnKVxuICAgIC5kZXNjcmlwdGlvbignc3RhcnQgdGhlIHNwaW5lLWFwaSAoSFRUUCAvcnBjLyogKyBNQ1AgL21jcCknKVxuICAgIC5vcHRpb24oJy0tcG9ydCA8cG9ydD4nLCAnVENQIHBvcnQnLCBTdHJpbmcoREVGQVVMVF9QT1JUKSlcbiAgICAub3B0aW9uKCctLWFkbWluLXRva2VuIDx0b2tlbj4nLCAnYm9vdHN0cmFwIGFkbWluIHRva2VuIChkZWZhdWx0OiBlbnYgT0FIU19BRE1JTl9UT0tFTiwgZWxzZSBnZW5lcmF0ZWQpJylcbiAgICAub3B0aW9uKCctLWRhdGEgPGRpcj4nLCAncGVyc2lzdGVuY2UgZGlyZWN0b3J5IChkdXJhYmxlIFBHbGl0ZSArIHRva2VuIHN0b3JlKScpXG4gICAgLmFjdGlvbihhc3luYyAob3B0czogeyBwb3J0OiBzdHJpbmc7IGFkbWluVG9rZW4/OiBzdHJpbmc7IGRhdGE/OiBzdHJpbmcgfSkgPT4ge1xuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc3QgYWRtaW5Ub2tlbiA9IG9wdHMuYWRtaW5Ub2tlbiA/PyBwcm9jZXNzLmVudlsnT0FIU19BRE1JTl9UT0tFTiddO1xuICAgICAgICBjb25zdCBoYW5kbGUgPSBhd2FpdCBzdGFydFNlcnZlKHtcbiAgICAgICAgICBwb3J0OiBOdW1iZXIob3B0cy5wb3J0KSxcbiAgICAgICAgICAuLi4oYWRtaW5Ub2tlbiAhPT0gdW5kZWZpbmVkICYmIGFkbWluVG9rZW4ubGVuZ3RoID4gMCA/IHsgYWRtaW5Ub2tlbiB9IDoge30pLFxuICAgICAgICAgIC4uLihvcHRzLmRhdGEgIT09IHVuZGVmaW5lZCA/IHsgZGF0YURpcjogcmVzb2x2ZShvcHRzLmRhdGEpIH0gOiB7fSksXG4gICAgICAgIH0pO1xuICAgICAgICBwcm9jZXNzLnN0ZG91dC53cml0ZShcbiAgICAgICAgICBgb2FocyBzcGluZS1hcGkgbGlzdGVuaW5nIG9uIDoke2hhbmRsZS5wb3J0fSAoSFRUUCAvcnBjLyosIE1DUCAvbWNwOyBlbmdpbmU6ICR7aGFuZGxlLmVuZ2luZUtpbmR9JHtcbiAgICAgICAgICAgIG9wdHMuZGF0YSAhPT0gdW5kZWZpbmVkID8gYCwgZGF0YTogJHtyZXNvbHZlKG9wdHMuZGF0YSl9YCA6ICcnXG4gICAgICAgICAgfSlcXG5gLFxuICAgICAgICApO1xuICAgICAgICBpZiAoaGFuZGxlLmFkbWluVG9rZW5HZW5lcmF0ZWQpIHtcbiAgICAgICAgICBwcm9jZXNzLnN0ZG91dC53cml0ZShgYWRtaW4gdG9rZW4gKGdlbmVyYXRlZCk6ICR7aGFuZGxlLmFkbWluVG9rZW59XFxuYCk7XG4gICAgICAgIH1cbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIGNvbnN0IGVyciA9IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvciA6IG5ldyBFcnJvcihTdHJpbmcoZXJyb3IpKTtcbiAgICAgICAgcHJvY2Vzcy5zdGRlcnIud3JpdGUoYCR7ZXJyLm5hbWV9OiAke2Vyci5tZXNzYWdlfVxcbmApO1xuICAgICAgICBwcm9jZXNzLmV4aXRDb2RlID0gMTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAvLyAtLSBnYXRlLWhvbGRlciAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgd2l0aENsaWVudEZsYWdzKHByb2dyYW0uY29tbWFuZCgnaW5ib3gnKSlcbiAgICAuZGVzY3JpcHRpb24oJ2l0ZW1zIGF3YWl0aW5nIGEgZ2F0ZSBkZWNpc2lvbiAoc3BlYyBhcHByb3ZhbCAvIHJldmlldyBkZWNpc2lvbiknKVxuICAgIC5hY3Rpb24oYXN5bmMgKG9wdHM6IENsaWVudEZsYWdzKSA9PiBlbWl0KCgpID0+IGluYm94Q29tbWFuZChjbGllbnRGcm9tKG9wdHMpKSkpO1xuXG4gIHdpdGhDbGllbnRGbGFncyhwcm9ncmFtLmNvbW1hbmQoJ2FwcHJvdmUgPHdvcmtJdGVtSWQ+JykpXG4gICAgLmRlc2NyaXB0aW9uKCdhcHByb3ZlIGEgZ2F0ZSAoc3BlY19hcHByb3ZhbCBwaW5zIHZlcmlmaWNhdGlvbiBjb21tYW5kcyknKVxuICAgIC5yZXF1aXJlZE9wdGlvbignLS1nYXRlIDxnYXRlPicsICdzcGVjX2FwcHJvdmFsIHwgcmV2aWV3X2FwcHJvdmFsJylcbiAgICAub3B0aW9uKCctLXBpbiA8Y21kPicsICdwaW4gYSB2ZXJpZmljYXRpb24gY29tbWFuZCAocmVwZWF0YWJsZSwgc3BlY19hcHByb3ZhbCBvbmx5KScsIGNvbGxlY3QsIFtdKVxuICAgIC5hY3Rpb24oYXN5bmMgKHdvcmtJdGVtSWQ6IHN0cmluZywgb3B0czogQ2xpZW50RmxhZ3MgJiB7IGdhdGU6IHN0cmluZzsgcGluOiBzdHJpbmdbXSB9KSA9PlxuICAgICAgZW1pdCgoKSA9PiBhcHByb3ZlQ29tbWFuZChjbGllbnRGcm9tKG9wdHMpLCB7IHdvcmtJdGVtSWQsIGdhdGU6IG9wdHMuZ2F0ZSwgcGluOiBvcHRzLnBpbiB9KSksXG4gICAgKTtcblxuICB3aXRoQ2xpZW50RmxhZ3MocHJvZ3JhbS5jb21tYW5kKCdhZHZhbmNlIDx3b3JrSXRlbUlkPicpKVxuICAgIC5kZXNjcmlwdGlvbignYWR2YW5jZSBhIHdvcmsgaXRlbSB0aHJvdWdoIHRoZSBGU00gKHBsYW5uaW5nLXpvbmUgbW92ZXMgZm9yIGh1bWFucyknKVxuICAgIC5yZXF1aXJlZE9wdGlvbignLS10byA8c3RhdGU+JywgJ3RhcmdldCBzdGF0ZSwgZS5nLiBkcmFmdCB8IHJlYWR5X2Zvcl9kZXYnKVxuICAgIC5vcHRpb24oJy0tZmVuY2luZy10b2tlbiA8bj4nLCAnZmVuY2luZyB0b2tlbiB3aGVuIGFjdGluZyB1bmRlciBhIGNsYWltJywgKHY6IHN0cmluZykgPT4gTnVtYmVyKHYpKVxuICAgIC5hY3Rpb24oYXN5bmMgKHdvcmtJdGVtSWQ6IHN0cmluZywgb3B0czogQ2xpZW50RmxhZ3MgJiB7IHRvOiBzdHJpbmc7IGZlbmNpbmdUb2tlbj86IG51bWJlciB9KSA9PlxuICAgICAgZW1pdCgoKSA9PlxuICAgICAgICBhZHZhbmNlQ29tbWFuZChjbGllbnRGcm9tKG9wdHMpLCB7XG4gICAgICAgICAgd29ya0l0ZW1JZCxcbiAgICAgICAgICB0bzogb3B0cy50byxcbiAgICAgICAgICAuLi4ob3B0cy5mZW5jaW5nVG9rZW4gIT09IHVuZGVmaW5lZCA/IHsgZmVuY2luZ1Rva2VuOiBvcHRzLmZlbmNpbmdUb2tlbiB9IDoge30pLFxuICAgICAgICB9KSxcbiAgICAgICksXG4gICAgKTtcblxuICB3aXRoQ2xpZW50RmxhZ3MocHJvZ3JhbS5jb21tYW5kKCdyZWplY3QgPHdvcmtJdGVtSWQ+JykpXG4gICAgLmRlc2NyaXB0aW9uKCdyZWplY3QgYSBnYXRlIChyZXZpZXcgcmVqZWN0aW9uIGZpcmVzIHRoZSBkZXRlcm1pbmlzdGljIGxvb3BiYWNrKScpXG4gICAgLnJlcXVpcmVkT3B0aW9uKCctLWdhdGUgPGdhdGU+JywgJ3NwZWNfYXBwcm92YWwgfCByZXZpZXdfYXBwcm92YWwnKVxuICAgIC5hY3Rpb24oYXN5bmMgKHdvcmtJdGVtSWQ6IHN0cmluZywgb3B0czogQ2xpZW50RmxhZ3MgJiB7IGdhdGU6IHN0cmluZyB9KSA9PlxuICAgICAgZW1pdCgoKSA9PiByZWplY3RDb21tYW5kKGNsaWVudEZyb20ob3B0cyksIHsgd29ya0l0ZW1JZCwgZ2F0ZTogb3B0cy5nYXRlIH0pKSxcbiAgICApO1xuXG4gIHdpdGhDbGllbnRGbGFncyhwcm9ncmFtLmNvbW1hbmQoJ3N0YXR1cycpKVxuICAgIC5kZXNjcmlwdGlvbignYWxsIHdvcmsgaXRlbXMgZ3JvdXBlZCBieSBzdGF0ZSwgcGx1cyBmZWF0dXJlIGRpc3BhdGNoIGhvbGRzJylcbiAgICAuYWN0aW9uKGFzeW5jIChvcHRzOiBDbGllbnRGbGFncykgPT4gZW1pdCgoKSA9PiBzdGF0dXNDb21tYW5kKGNsaWVudEZyb20ob3B0cykpKSk7XG5cbiAgY29uc3QgYWN0b3IgPSBwcm9ncmFtLmNvbW1hbmQoJ2FjdG9yJykuZGVzY3JpcHRpb24oJ2FjdG9yIG1hbmFnZW1lbnQgKGFkbWluKScpO1xuICB3aXRoQ2xpZW50RmxhZ3MoYWN0b3IuY29tbWFuZCgnY3JlYXRlJykpXG4gICAgLmRlc2NyaXB0aW9uKCdjcmVhdGUgYSB1c2VyIG9yIGFnZW50IGFjdG9yOyBwcmludHMgYWN0b3JJZCArIHRva2VuIChhZG1pbiBvbmx5KScpXG4gICAgLnJlcXVpcmVkT3B0aW9uKCctLXR5cGUgPHR5cGU+JywgJ3VzZXIgfCBhZ2VudCcpXG4gICAgLnJlcXVpcmVkT3B0aW9uKCctLW5hbWUgPG5hbWU+JywgJ2Rpc3BsYXkgbmFtZScpXG4gICAgLm9wdGlvbignLS1nb3Zlcm5hbmNlLXJvbGUgPHJvbGU+JywgJ2FkbWluIHwgbWVtYmVyIHwgYXVkaXRvciAoYm9vdHN0cmFwIHBsdW1iaW5nLCBhZG1pbiBvbmx5KScpXG4gICAgLmFjdGlvbihhc3luYyAob3B0czogQ2xpZW50RmxhZ3MgJiB7IHR5cGU6IHN0cmluZzsgbmFtZTogc3RyaW5nOyBnb3Zlcm5hbmNlUm9sZT86IHN0cmluZyB9KSA9PlxuICAgICAgZW1pdCgoKSA9PlxuICAgICAgICBhY3RvckNyZWF0ZUNvbW1hbmQoY2xpZW50RnJvbShvcHRzKSwge1xuICAgICAgICAgIHR5cGU6IG9wdHMudHlwZSxcbiAgICAgICAgICBuYW1lOiBvcHRzLm5hbWUsXG4gICAgICAgICAgLi4uKG9wdHMuZ292ZXJuYW5jZVJvbGUgIT09IHVuZGVmaW5lZCA/IHsgZ292ZXJuYW5jZVJvbGU6IG9wdHMuZ292ZXJuYW5jZVJvbGUgfSA6IHt9KSxcbiAgICAgICAgfSksXG4gICAgICApLFxuICAgICk7XG5cbiAgd2l0aENsaWVudEZsYWdzKHByb2dyYW0uY29tbWFuZCgnZ3JhbnQgPGFjdG9ySWQ+IDxwZXJtaXNzaW9uPicpKVxuICAgIC5kZXNjcmlwdGlvbignZ3JhbnQgYSBwZXJtaXNzaW9uIHRvIGFuIGFjdG9yIChhZG1pbiBvbmx5KScpXG4gICAgLmFjdGlvbihhc3luYyAoYWN0b3JJZDogc3RyaW5nLCBwZXJtaXNzaW9uOiBzdHJpbmcsIG9wdHM6IENsaWVudEZsYWdzKSA9PlxuICAgICAgZW1pdCgoKSA9PiBncmFudENvbW1hbmQoY2xpZW50RnJvbShvcHRzKSwgeyBhY3RvcklkLCBwZXJtaXNzaW9uIH0pKSxcbiAgICApO1xuXG4gIC8vIC0tIGVudGl0bGVtZW50cyAoUGhhc2UgMiwgcm9hZG1hcCBcdTAwQTczKSAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgY29uc3Qgcm9sZSA9IHByb2dyYW0uY29tbWFuZCgncm9sZScpLmRlc2NyaXB0aW9uKCdkZWxpdmVyeSByb2xlcyBcdTIwMTQgcGVybWlzc2lvbiBidW5kbGVzIChyb2FkbWFwIFx1MDBBNzMpJyk7XG4gIHdpdGhDbGllbnRGbGFncyhyb2xlLmNvbW1hbmQoJ2Fzc2lnbiA8YWN0b3JJZD4gPHJvbGVDb2RlPicpKVxuICAgIC5kZXNjcmlwdGlvbignYXNzaWduIGEgZGVsaXZlcnkgcm9sZSB0byBhbiBhY3RvciAoZ292ZXJuYW5jZS1hZG1pbiBvbmx5LCBlbmdpbmUtZ2F0ZWQpJylcbiAgICAuYWN0aW9uKGFzeW5jIChhY3RvcklkOiBzdHJpbmcsIHJvbGVDb2RlOiBzdHJpbmcsIG9wdHM6IENsaWVudEZsYWdzKSA9PlxuICAgICAgZW1pdCgoKSA9PiByb2xlQXNzaWduQ29tbWFuZChjbGllbnRGcm9tKG9wdHMpLCB7IGFjdG9ySWQsIHJvbGVDb2RlIH0pKSxcbiAgICApO1xuICB3aXRoQ2xpZW50RmxhZ3Mocm9sZS5jb21tYW5kKCdyZXZva2UgPGFjdG9ySWQ+IDxyb2xlQ29kZT4nKSlcbiAgICAuZGVzY3JpcHRpb24oJ3Jldm9rZSBhIGRlbGl2ZXJ5IHJvbGUgZnJvbSBhbiBhY3RvciAoZ292ZXJuYW5jZS1hZG1pbiBvbmx5LCBlbmdpbmUtZ2F0ZWQpJylcbiAgICAuYWN0aW9uKGFzeW5jIChhY3RvcklkOiBzdHJpbmcsIHJvbGVDb2RlOiBzdHJpbmcsIG9wdHM6IENsaWVudEZsYWdzKSA9PlxuICAgICAgZW1pdCgoKSA9PiByb2xlUmV2b2tlQ29tbWFuZChjbGllbnRGcm9tKG9wdHMpLCB7IGFjdG9ySWQsIHJvbGVDb2RlIH0pKSxcbiAgICApO1xuICB3aXRoQ2xpZW50RmxhZ3Mocm9sZS5jb21tYW5kKCdsaXN0IFthY3RvcklkXScpKVxuICAgIC5kZXNjcmlwdGlvbignbGlzdCBkZWxpdmVyeS1yb2xlIGFzc2lnbm1lbnRzIChhbGwsIG9yIG9uZSBhY3RvciknKVxuICAgIC5hY3Rpb24oYXN5bmMgKGFjdG9ySWQ6IHN0cmluZyB8IHVuZGVmaW5lZCwgb3B0czogQ2xpZW50RmxhZ3MpID0+XG4gICAgICBlbWl0KCgpID0+IHJvbGVMaXN0Q29tbWFuZChjbGllbnRGcm9tKG9wdHMpLCBhY3RvcklkICE9PSB1bmRlZmluZWQgPyB7IGFjdG9ySWQgfSA6IHt9KSksXG4gICAgKTtcblxuICBjb25zdCBwbGFuID0gcHJvZ3JhbS5jb21tYW5kKCdwbGFuJykuZGVzY3JpcHRpb24oJ3dvcmtzcGFjZSBwbGFuIFx1MjAxNCBhIGNlaWxpbmcsIG5ldmVyIGEgZ3JhbnQgKHJvYWRtYXAgXHUwMEE3MyknKTtcbiAgd2l0aENsaWVudEZsYWdzKHBsYW4uY29tbWFuZCgnc2V0IDxwbGFuPicpKVxuICAgIC5kZXNjcmlwdGlvbignc2V0IHRoZSB3b3Jrc3BhY2UgcGxhbjogZnJlZSB8IHRlYW0gfCBlbnRlcnByaXNlIChnb3Zlcm5hbmNlLWFkbWluIG9ubHkpJylcbiAgICAuYWN0aW9uKGFzeW5jIChwbGFuQ29kZTogc3RyaW5nLCBvcHRzOiBDbGllbnRGbGFncykgPT5cbiAgICAgIGVtaXQoKCkgPT4gcGxhblNldENvbW1hbmQoY2xpZW50RnJvbShvcHRzKSwgeyBwbGFuOiBwbGFuQ29kZSB9KSksXG4gICAgKTtcblxuICBjb25zdCBwb2xpY3kgPSBwcm9ncmFtLmNvbW1hbmQoJ3BvbGljeScpLmRlc2NyaXB0aW9uKCdyZXN0cmljdC1vbmx5IHdvcmtzcGFjZSBwb2xpY3kgKHJvYWRtYXAgXHUwMEE3MyknKTtcbiAgd2l0aENsaWVudEZsYWdzKHBvbGljeS5jb21tYW5kKCdzZXQnKSlcbiAgICAuZGVzY3JpcHRpb24oJ3NldCByZXN0cmljdC1vbmx5IHBvbGljeSBrZXlzIChnb3Zlcm5hbmNlLWFkbWluIG9ubHkpJylcbiAgICAub3B0aW9uKCctLWFnZW50LWdhdGUtYXBwcm92YWxzIDxib29sPicsICd0cnVlIHwgZmFsc2UgXHUyMDE0IG1heSBhZ2VudHMgZXhlcmNpc2UgZ2F0ZSBhcHByb3ZhbHM/JylcbiAgICAub3B0aW9uKCctLWFnZW50LXNlbGYtZGlzcGF0Y2ggPGJvb2w+JywgJ3RydWUgfCBmYWxzZSBcdTIwMTQgbWF5IGFnZW50cyBjbGFpbSB0YXNrcyBvbiB0aGVpciBvd24/JylcbiAgICAuYWN0aW9uKGFzeW5jIChvcHRzOiBDbGllbnRGbGFncyAmIHsgYWdlbnRHYXRlQXBwcm92YWxzPzogc3RyaW5nOyBhZ2VudFNlbGZEaXNwYXRjaD86IHN0cmluZyB9KSA9PlxuICAgICAgZW1pdCgoKSA9PlxuICAgICAgICBwb2xpY3lTZXRDb21tYW5kKGNsaWVudEZyb20ob3B0cyksIHtcbiAgICAgICAgICAuLi4ob3B0cy5hZ2VudEdhdGVBcHByb3ZhbHMgIT09IHVuZGVmaW5lZCA/IHsgYWdlbnRHYXRlQXBwcm92YWxzOiBvcHRzLmFnZW50R2F0ZUFwcHJvdmFscyB9IDoge30pLFxuICAgICAgICAgIC4uLihvcHRzLmFnZW50U2VsZkRpc3BhdGNoICE9PSB1bmRlZmluZWQgPyB7IGFnZW50U2VsZkRpc3BhdGNoOiBvcHRzLmFnZW50U2VsZkRpc3BhdGNoIH0gOiB7fSksXG4gICAgICAgIH0pLFxuICAgICAgKSxcbiAgICApO1xuXG4gIGNvbnN0IGdhdGVQb2xpY3kgPSBwcm9ncmFtLmNvbW1hbmQoJ2dhdGUtcG9saWN5JykuZGVzY3JpcHRpb24oJ2dhdGUgZGVmaW5pdGlvbnMgYXMgZGF0YSAocm9hZG1hcCBcdTAwQTczKScpO1xuICB3aXRoQ2xpZW50RmxhZ3MoZ2F0ZVBvbGljeS5jb21tYW5kKCdzZXQgPGdhdGU+JykpXG4gICAgLmRlc2NyaXB0aW9uKCdzZXQgcXVvcnVtL2FjdG9yLXR5cGUgcmVxdWlyZW1lbnRzIG9mIGEgZ2F0ZSAoZ292ZXJuYW5jZS1hZG1pbiBvbmx5KScpXG4gICAgLm9wdGlvbignLS1taW4tYXBwcm92YWxzIDxuPicsICdkaXN0aW5jdCBhcHByb3ZlcnMgcmVxdWlyZWQgcGVyIHJldmlldyByb3VuZCcpXG4gICAgLm9wdGlvbignLS1yZXF1aXJlLXR5cGUgPHR5cGU+JywgJ3JlcXVpcmUgYXQgbGVhc3Qgb25lIGFwcHJvdmVyIG9mIHRoaXMgdHlwZSAocmVwZWF0YWJsZSknLCBjb2xsZWN0LCBbXSlcbiAgICAuYWN0aW9uKGFzeW5jIChnYXRlOiBzdHJpbmcsIG9wdHM6IENsaWVudEZsYWdzICYgeyBtaW5BcHByb3ZhbHM/OiBzdHJpbmc7IHJlcXVpcmVUeXBlOiBzdHJpbmdbXSB9KSA9PlxuICAgICAgZW1pdCgoKSA9PlxuICAgICAgICBnYXRlUG9saWN5U2V0Q29tbWFuZChjbGllbnRGcm9tKG9wdHMpLCB7XG4gICAgICAgICAgZ2F0ZSxcbiAgICAgICAgICAuLi4ob3B0cy5taW5BcHByb3ZhbHMgIT09IHVuZGVmaW5lZCA/IHsgbWluQXBwcm92YWxzOiBvcHRzLm1pbkFwcHJvdmFscyB9IDoge30pLFxuICAgICAgICAgIC4uLihvcHRzLnJlcXVpcmVUeXBlLmxlbmd0aCA+IDAgPyB7IHJlcXVpcmVUeXBlczogb3B0cy5yZXF1aXJlVHlwZSB9IDoge30pLFxuICAgICAgICB9KSxcbiAgICAgICksXG4gICAgKTtcblxuICBjb25zdCBnb3Zlcm5hbmNlID0gcHJvZ3JhbS5jb21tYW5kKCdnb3Zlcm5hbmNlJykuZGVzY3JpcHRpb24oJ2dvdmVybmFuY2Ugcm9sZXMgKHJvYWRtYXAgXHUwMEE3MyknKTtcbiAgd2l0aENsaWVudEZsYWdzKGdvdmVybmFuY2UuY29tbWFuZCgnc2V0IDxhY3RvcklkPiA8cm9sZT4nKSlcbiAgICAuZGVzY3JpcHRpb24oJ3NldCBhbiBhY3RvciBnb3Zlcm5hbmNlIHJvbGU6IGFkbWluIHwgbWVtYmVyIHwgYXVkaXRvciAoZ292ZXJuYW5jZS1hZG1pbiBvbmx5KScpXG4gICAgLmFjdGlvbihhc3luYyAoYWN0b3JJZDogc3RyaW5nLCByb2xlQ29kZTogc3RyaW5nLCBvcHRzOiBDbGllbnRGbGFncykgPT5cbiAgICAgIGVtaXQoKCkgPT4gZ292ZXJuYW5jZVNldENvbW1hbmQoY2xpZW50RnJvbShvcHRzKSwgeyBhY3RvcklkLCByb2xlOiByb2xlQ29kZSB9KSksXG4gICAgKTtcblxuICB3aXRoQ2xpZW50RmxhZ3MocHJvZ3JhbS5jb21tYW5kKCdhdXRoeiA8YWN0b3JJZD4gPHBlcm1pc3Npb24+JykpXG4gICAgLmRlc2NyaXB0aW9uKCdwcmludCB0aGUgcmVwbGF5YWJsZSBhdXRoeiBkZWNpc2lvbiB0cmFjZSBmb3IgYW4gYWN0b3IgXHUwMEQ3IHBlcm1pc3Npb24gKHJvYWRtYXAgXHUwMEE3MyknKVxuICAgIC5hY3Rpb24oYXN5bmMgKGFjdG9ySWQ6IHN0cmluZywgcGVybWlzc2lvbjogc3RyaW5nLCBvcHRzOiBDbGllbnRGbGFncykgPT5cbiAgICAgIGVtaXQoKCkgPT4gYXV0aHpDb21tYW5kKGNsaWVudEZyb20ob3B0cyksIHsgYWN0b3JJZCwgcGVybWlzc2lvbiB9KSksXG4gICAgKTtcblxuICBjb25zdCBmZWF0dXJlID0gcHJvZ3JhbS5jb21tYW5kKCdmZWF0dXJlJykuZGVzY3JpcHRpb24oJ2ZlYXR1cmUgbWFuYWdlbWVudCcpO1xuICB3aXRoQ2xpZW50RmxhZ3MoZmVhdHVyZS5jb21tYW5kKCdjcmVhdGUnKSlcbiAgICAuZGVzY3JpcHRpb24oJ2NyZWF0ZSBhIGZlYXR1cmU7IHByaW50cyBmZWF0dXJlSWQnKVxuICAgIC5hY3Rpb24oYXN5bmMgKG9wdHM6IENsaWVudEZsYWdzKSA9PiBlbWl0KCgpID0+IGZlYXR1cmVDcmVhdGVDb21tYW5kKGNsaWVudEZyb20ob3B0cykpKSk7XG5cbiAgd2l0aENsaWVudEZsYWdzKHByb2dyYW0uY29tbWFuZCgnaW1wb3J0IDxmZWF0dXJlSWQ+IDxzdG9yaWVzWWFtbFBhdGg+JykpXG4gICAgLmRlc2NyaXB0aW9uKCdpbXBvcnQgYSBzdG9yaWVzLnlhbWwgZmlsZSBpbnRvIGEgZmVhdHVyZSAoaWRlbXBvdGVudCknKVxuICAgIC5hY3Rpb24oYXN5bmMgKGZlYXR1cmVJZDogc3RyaW5nLCBzdG9yaWVzWWFtbFBhdGg6IHN0cmluZywgb3B0czogQ2xpZW50RmxhZ3MpID0+XG4gICAgICBlbWl0KCgpID0+IGltcG9ydFN0b3JpZXNDb21tYW5kKGNsaWVudEZyb20ob3B0cyksIHsgZmVhdHVyZUlkLCBwYXRoOiBzdG9yaWVzWWFtbFBhdGggfSkpLFxuICAgICk7XG5cbiAgLy8gLS0gY29sbGFib3JhdGlvbiAoUGhhc2UgMywgcm9hZG1hcCBcdTAwQTc1KSAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgY29uc3QgdGhyZWFkID0gcHJvZ3JhbS5jb21tYW5kKCd0aHJlYWQnKS5kZXNjcmlwdGlvbignY29udmVyc2F0aW9uIHRocmVhZHMgKFBoYXNlIDMsIHJvYWRtYXAgXHUwMEE3NSknKTtcbiAgd2l0aENsaWVudEZsYWdzKHRocmVhZC5jb21tYW5kKCdjcmVhdGUnKSlcbiAgICAuZGVzY3JpcHRpb24oJ2NyZWF0ZSBhIHRocmVhZCwgb3B0aW9uYWxseSBib3VuZCB0byBhIGZlYXR1cmUvd29yayBpdGVtJylcbiAgICAucmVxdWlyZWRPcHRpb24oJy0ta2luZCA8a2luZD4nLCAnc3BlYyB8IGRlc2lnbiB8IHRhc2sgfCBnZW5lcmFsIHwgcHJpdmF0ZScpXG4gICAgLm9wdGlvbignLS1mZWF0dXJlIDxmZWF0dXJlSWQ+JywgJ2JpbmQgdG8gYSBmZWF0dXJlJylcbiAgICAub3B0aW9uKCctLXdvcmstaXRlbSA8d29ya0l0ZW1JZD4nLCAnYmluZCB0byBhIHdvcmsgaXRlbSAoaWQgb3IgZXh0ZXJuYWxLZXkpJylcbiAgICAub3B0aW9uKCctLXZpc2liaWxpdHkgPHZpc2liaWxpdHk+JywgJ29wZW4gfCBwcml2YXRlJylcbiAgICAuYWN0aW9uKFxuICAgICAgYXN5bmMgKFxuICAgICAgICBvcHRzOiBDbGllbnRGbGFncyAmIHsga2luZDogc3RyaW5nOyBmZWF0dXJlPzogc3RyaW5nOyB3b3JrSXRlbT86IHN0cmluZzsgdmlzaWJpbGl0eT86IHN0cmluZyB9LFxuICAgICAgKSA9PlxuICAgICAgICBlbWl0KCgpID0+XG4gICAgICAgICAgdGhyZWFkQ3JlYXRlQ29tbWFuZChjbGllbnRGcm9tKG9wdHMpLCB7XG4gICAgICAgICAgICBraW5kOiBvcHRzLmtpbmQsXG4gICAgICAgICAgICAuLi4ob3B0cy5mZWF0dXJlICE9PSB1bmRlZmluZWQgPyB7IGZlYXR1cmVJZDogb3B0cy5mZWF0dXJlIH0gOiB7fSksXG4gICAgICAgICAgICAuLi4ob3B0cy53b3JrSXRlbSAhPT0gdW5kZWZpbmVkID8geyB3b3JrSXRlbUlkOiBvcHRzLndvcmtJdGVtIH0gOiB7fSksXG4gICAgICAgICAgICAuLi4ob3B0cy52aXNpYmlsaXR5ICE9PSB1bmRlZmluZWQgPyB7IHZpc2liaWxpdHk6IG9wdHMudmlzaWJpbGl0eSB9IDoge30pLFxuICAgICAgICAgIH0pLFxuICAgICAgICApLFxuICAgICk7XG4gIHdpdGhDbGllbnRGbGFncyh0aHJlYWQuY29tbWFuZCgnbGlzdCcpKVxuICAgIC5kZXNjcmlwdGlvbignbGlzdCB0aHJlYWRzIChwcml2YXRlIG9uZXMgb25seSB3aGVuIHlvdSBwYXJ0aWNpcGF0ZSknKVxuICAgIC5vcHRpb24oJy0tZmVhdHVyZSA8ZmVhdHVyZUlkPicsICdmaWx0ZXIgYnkgZmVhdHVyZScpXG4gICAgLm9wdGlvbignLS13b3JrLWl0ZW0gPHdvcmtJdGVtSWQ+JywgJ2ZpbHRlciBieSB3b3JrIGl0ZW0nKVxuICAgIC5hY3Rpb24oYXN5bmMgKG9wdHM6IENsaWVudEZsYWdzICYgeyBmZWF0dXJlPzogc3RyaW5nOyB3b3JrSXRlbT86IHN0cmluZyB9KSA9PlxuICAgICAgZW1pdCgoKSA9PlxuICAgICAgICB0aHJlYWRMaXN0Q29tbWFuZChjbGllbnRGcm9tKG9wdHMpLCB7XG4gICAgICAgICAgLi4uKG9wdHMuZmVhdHVyZSAhPT0gdW5kZWZpbmVkID8geyBmZWF0dXJlSWQ6IG9wdHMuZmVhdHVyZSB9IDoge30pLFxuICAgICAgICAgIC4uLihvcHRzLndvcmtJdGVtICE9PSB1bmRlZmluZWQgPyB7IHdvcmtJdGVtSWQ6IG9wdHMud29ya0l0ZW0gfSA6IHt9KSxcbiAgICAgICAgfSksXG4gICAgICApLFxuICAgICk7XG5cbiAgd2l0aENsaWVudEZsYWdzKHByb2dyYW0uY29tbWFuZCgncG9zdCA8dGhyZWFkSWQ+IDxib2R5PicpKVxuICAgIC5kZXNjcmlwdGlvbigncG9zdCBhIG1lc3NhZ2U7IC0tbWVudGlvbiB0YWtlcyBTVFJVQ1RVUkVEIGFjdG9yIGlkcyAoYm9keSB0ZXh0IGlzIG5ldmVyIHBhcnNlZCknKVxuICAgIC5vcHRpb24oJy0tbWVudGlvbiA8YWN0b3JJZD4nLCAnbWVudGlvbiBhbiBhY3RvciBieSBpZCAocmVwZWF0YWJsZSknLCBjb2xsZWN0LCBbXSlcbiAgICAub3B0aW9uKCctLXJlcGx5LXRvIDxtZXNzYWdlSWQ+JywgJ3JlcGx5IHRvIGEgbWVzc2FnZScpXG4gICAgLmFjdGlvbihcbiAgICAgIGFzeW5jICh0aHJlYWRJZDogc3RyaW5nLCBib2R5OiBzdHJpbmcsIG9wdHM6IENsaWVudEZsYWdzICYgeyBtZW50aW9uOiBzdHJpbmdbXTsgcmVwbHlUbz86IHN0cmluZyB9KSA9PlxuICAgICAgICBlbWl0KCgpID0+XG4gICAgICAgICAgcG9zdENvbW1hbmQoY2xpZW50RnJvbShvcHRzKSwge1xuICAgICAgICAgICAgdGhyZWFkSWQsXG4gICAgICAgICAgICBib2R5LFxuICAgICAgICAgICAgLi4uKG9wdHMubWVudGlvbi5sZW5ndGggPiAwID8geyBtZW50aW9uczogb3B0cy5tZW50aW9uIH0gOiB7fSksXG4gICAgICAgICAgICAuLi4ob3B0cy5yZXBseVRvICE9PSB1bmRlZmluZWQgPyB7IHJlcGx5VG86IG9wdHMucmVwbHlUbyB9IDoge30pLFxuICAgICAgICAgIH0pLFxuICAgICAgICApLFxuICAgICk7XG5cbiAgd2l0aENsaWVudEZsYWdzKHByb2dyYW0uY29tbWFuZCgnbWVzc2FnZXMgPHRocmVhZElkPicpKVxuICAgIC5kZXNjcmlwdGlvbignbGlzdCBtZXNzYWdlcyBvZiBhIHRocmVhZCAocmF3IGF1dGhvcklkOyBzeXN0ZW0gbmFycmF0aW9uIGluY2x1ZGVkKScpXG4gICAgLm9wdGlvbignLS1zaW5jZSA8c2VxPicsICdvbmx5IG1lc3NhZ2VzIHdpdGggc2VxIGdyZWF0ZXIgdGhhbiB0aGlzJywgKHY6IHN0cmluZykgPT4gTnVtYmVyKHYpKVxuICAgIC5hY3Rpb24oYXN5bmMgKHRocmVhZElkOiBzdHJpbmcsIG9wdHM6IENsaWVudEZsYWdzICYgeyBzaW5jZT86IG51bWJlciB9KSA9PlxuICAgICAgZW1pdCgoKSA9PlxuICAgICAgICBtZXNzYWdlc0NvbW1hbmQoY2xpZW50RnJvbShvcHRzKSwge1xuICAgICAgICAgIHRocmVhZElkLFxuICAgICAgICAgIC4uLihvcHRzLnNpbmNlICE9PSB1bmRlZmluZWQgPyB7IHNpbmNlU2VxOiBvcHRzLnNpbmNlIH0gOiB7fSksXG4gICAgICAgIH0pLFxuICAgICAgKSxcbiAgICApO1xuXG4gIHdpdGhDbGllbnRGbGFncyhwcm9ncmFtLmNvbW1hbmQoJ25vdGlmaWNhdGlvbnMnKSlcbiAgICAuZGVzY3JpcHRpb24oJ3lvdXIgb3duIG5vdGlmaWNhdGlvbnMgKG1lbnRpb25zICsgYWdlbnQtam9iIGNvbXBsZXRpb25zKScpXG4gICAgLm9wdGlvbignLS11bnJlYWQnLCAnb25seSB1bnJlYWQgbm90aWZpY2F0aW9ucycpXG4gICAgLmFjdGlvbihhc3luYyAob3B0czogQ2xpZW50RmxhZ3MgJiB7IHVucmVhZD86IGJvb2xlYW4gfSkgPT5cbiAgICAgIGVtaXQoKCkgPT5cbiAgICAgICAgbm90aWZpY2F0aW9uc0NvbW1hbmQoY2xpZW50RnJvbShvcHRzKSwgb3B0cy51bnJlYWQgPT09IHRydWUgPyB7IHVucmVhZE9ubHk6IHRydWUgfSA6IHt9KSxcbiAgICAgICksXG4gICAgKTtcblxuICBjb25zdCBqb2IgPSBwcm9ncmFtLmNvbW1hbmQoJ2pvYicpLmRlc2NyaXB0aW9uKCdyb3V0ZXItbWF0ZXJpYWxpemVkIGFnZW50IGpvYnMgKHJlcGx5LW9ubHksIFx1MDBBNzUuNCknKTtcbiAgd2l0aENsaWVudEZsYWdzKHByb2dyYW0uY29tbWFuZCgnam9icycpKVxuICAgIC5kZXNjcmlwdGlvbignbGlzdCBhZ2VudCBqb2JzJylcbiAgICAub3B0aW9uKCctLWFnZW50IDxhY3RvcklkPicsICdmaWx0ZXIgYnkgYWdlbnQgYWN0b3InKVxuICAgIC5vcHRpb24oJy0tc3RhdHVzIDxzdGF0dXM+JywgJ3F1ZXVlZCB8IGRvbmUgfCBibG9ja2VkJylcbiAgICAuYWN0aW9uKGFzeW5jIChvcHRzOiBDbGllbnRGbGFncyAmIHsgYWdlbnQ/OiBzdHJpbmc7IHN0YXR1cz86IHN0cmluZyB9KSA9PlxuICAgICAgZW1pdCgoKSA9PlxuICAgICAgICBqb2JzQ29tbWFuZChjbGllbnRGcm9tKG9wdHMpLCB7XG4gICAgICAgICAgLi4uKG9wdHMuYWdlbnQgIT09IHVuZGVmaW5lZCA/IHsgYWdlbnRBY3RvcklkOiBvcHRzLmFnZW50IH0gOiB7fSksXG4gICAgICAgICAgLi4uKG9wdHMuc3RhdHVzICE9PSB1bmRlZmluZWQgPyB7IHN0YXR1czogb3B0cy5zdGF0dXMgfSA6IHt9KSxcbiAgICAgICAgfSksXG4gICAgICApLFxuICAgICk7XG4gIHdpdGhDbGllbnRGbGFncyhqb2IuY29tbWFuZCgnZG9uZSA8am9iSWQ+JykpXG4gICAgLmRlc2NyaXB0aW9uKCdjb21wbGV0ZSBhIGpvYiBhcyBpdHMgYWdlbnQgKG5vdGlmaWVzIHRoZSBtZW50aW9uZXIgXHUyMDE0IG5vdGhpbmcgZWxzZSBtb3ZlcyknKVxuICAgIC5vcHRpb24oJy0tbm90ZSA8bm90ZT4nLCAnY29tcGxldGlvbiBub3RlJylcbiAgICAuYWN0aW9uKGFzeW5jIChqb2JJZDogc3RyaW5nLCBvcHRzOiBDbGllbnRGbGFncyAmIHsgbm90ZT86IHN0cmluZyB9KSA9PlxuICAgICAgZW1pdCgoKSA9PlxuICAgICAgICBqb2JDb21wbGV0ZUNvbW1hbmQoY2xpZW50RnJvbShvcHRzKSwge1xuICAgICAgICAgIGpvYklkLFxuICAgICAgICAgIHN0YXR1czogJ2RvbmUnLFxuICAgICAgICAgIC4uLihvcHRzLm5vdGUgIT09IHVuZGVmaW5lZCA/IHsgbm90ZTogb3B0cy5ub3RlIH0gOiB7fSksXG4gICAgICAgIH0pLFxuICAgICAgKSxcbiAgICApO1xuXG4gIC8vIC0tIGFkdmlzb3IgYm90cyAocmVhZCArIHBvc3Qgb25seSwgZGV0ZXJtaW5pc3RpYywgbm8gTExNKSAtLS0tLS0tLS0tLS0tLS0tLS0tLVxuICBjb25zdCBhZHZpc2UgPSBwcm9ncmFtXG4gICAgLmNvbW1hbmQoJ2FkdmlzZScpXG4gICAgLmRlc2NyaXB0aW9uKCdkZXRlcm1pbmlzdGljIGFkdmlzb3IgYm90cyBcdTIwMTQgcmVhZCArIHBvc3Qgb25seSwgbmV2ZXIgYSBsaWZlY3ljbGUgbXV0YXRpb24nKTtcbiAgd2l0aENsaWVudEZsYWdzKGFkdmlzZS5jb21tYW5kKCduZXh0LXRhc2snKSlcbiAgICAuZGVzY3JpcHRpb24oJ3Bvc3QgdGhlIHN1Z2dlc3RlZCBjbGFpbSBvcmRlciAoY2xhaW1hYmxlIHJlYWR5X2Zvcl9kZXYpIGludG8gYSB0aHJlYWQnKVxuICAgIC5yZXF1aXJlZE9wdGlvbignLS10aHJlYWQgPHRocmVhZElkPicsICd0aHJlYWQgdG8gcG9zdCB0aGUgYWR2aWNlIGludG8nKVxuICAgIC5hY3Rpb24oYXN5bmMgKG9wdHM6IENsaWVudEZsYWdzICYgeyB0aHJlYWQ6IHN0cmluZyB9KSA9PlxuICAgICAgZW1pdCgoKSA9PiBhZHZpc2VOZXh0VGFza0NvbW1hbmQoY2xpZW50RnJvbShvcHRzKSwgeyB0aHJlYWRJZDogb3B0cy50aHJlYWQgfSkpLFxuICAgICk7XG4gIHdpdGhDbGllbnRGbGFncyhhZHZpc2UuY29tbWFuZCgncmVjb25jaWxlJykpXG4gICAgLmRlc2NyaXB0aW9uKCdwb3N0IHRoZSBkZXRlY3Qtb25seSBmaWxlXHUyMTk0REIgZGl2ZXJnZW5jZSByZXBvcnQgaW50byBhIHRocmVhZCcpXG4gICAgLnJlcXVpcmVkT3B0aW9uKCctLXRocmVhZCA8dGhyZWFkSWQ+JywgJ3RocmVhZCB0byBwb3N0IHRoZSBhZHZpY2UgaW50bycpXG4gICAgLnJlcXVpcmVkT3B0aW9uKCctLWZpbGUgPHBhaXI+JywgJ29uZSA8d29ya0l0ZW1JZD49PGZyb250bWF0dGVyU3RhdHVzPiBwYWlyIChyZXBlYXRhYmxlKScsIGNvbGxlY3QsIFtdKVxuICAgIC5hY3Rpb24oYXN5bmMgKG9wdHM6IENsaWVudEZsYWdzICYgeyB0aHJlYWQ6IHN0cmluZzsgZmlsZTogc3RyaW5nW10gfSkgPT5cbiAgICAgIGVtaXQoKCkgPT5cbiAgICAgICAgYWR2aXNlUmVjb25jaWxlQ29tbWFuZChjbGllbnRGcm9tKG9wdHMpLCB7IHRocmVhZElkOiBvcHRzLnRocmVhZCwgZmlsZXM6IG9wdHMuZmlsZSB9KSxcbiAgICAgICksXG4gICAgKTtcblxuICB3aXRoQ2xpZW50RmxhZ3MocHJvZ3JhbS5jb21tYW5kKCdldmVudHMgW3N0cmVhbUlkXScpKVxuICAgIC5kZXNjcmlwdGlvbignYXVkaXQgcXVlcnkgb3ZlciB0aGUgYXBwZW5kLW9ubHkgZXZlbnQgbG9nJylcbiAgICAuYWN0aW9uKGFzeW5jIChzdHJlYW1JZDogc3RyaW5nIHwgdW5kZWZpbmVkLCBvcHRzOiBDbGllbnRGbGFncykgPT5cbiAgICAgIGVtaXQoKCkgPT5cbiAgICAgICAgZXZlbnRzQ29tbWFuZChjbGllbnRGcm9tKG9wdHMpLCBzdHJlYW1JZCAhPT0gdW5kZWZpbmVkID8geyBzdHJlYW1JZCB9IDoge30pLFxuICAgICAgKSxcbiAgICApO1xuXG4gIC8vIC0tIHdvcmsgKHJ1bm5lciBoYW5kb2ZmOyBAb2Focy9ydW5uZXIgbGFuZHMgd2l0aCBzdG9yeSAxNCkgLS0tLS0tLS0tLS0tLS0tLS0tLVxuICB3aXRoQ2xpZW50RmxhZ3MocHJvZ3JhbS5jb21tYW5kKCd3b3JrJykpXG4gICAgLmRlc2NyaXB0aW9uKCdydW4gdGhlIEJZTyB3b3JrZXIgbG9vcCBhZ2FpbnN0IHRoaXMgc3BpbmUgKHJlcXVpcmVzIEBvYWhzL3J1bm5lciknKVxuICAgIC5yZXF1aXJlZE9wdGlvbignLS1yZXBvIDxwYXRoPicsICd0YXJnZXQgcHJvamVjdCBnaXQgY2hlY2tvdXQnKVxuICAgIC5yZXF1aXJlZE9wdGlvbignLS1zcGVjLWZvbGRlciA8cmVsPicsICdzcGVjIGZvbGRlciByZWxhdGl2ZSB0byB0aGUgcmVwbyByb290JylcbiAgICAucmVxdWlyZWRPcHRpb24oJy0tYWdlbnQtY21kIDx0ZW1wbGF0ZT4nLCAnY29kaW5nLWFnZW50IGNvbW1hbmQgdGVtcGxhdGUgKHtTUEVDX0ZPTERFUn0ge1NUT1JZX0lEfSB7SU5WT0tFX1dJVEh9IHtXT1JLVFJFRX0pJylcbiAgICAub3B0aW9uKCctLW9uY2UnLCAnZGlzcGF0Y2ggYXQgbW9zdCBvbmUgd29yayBpdGVtLCB0aGVuIGV4aXQnKVxuICAgIC5vcHRpb24oJy0tcG9sbCA8bXM+JywgJ3BvbGwgaW50ZXJ2YWwgaW4gbWlsbGlzZWNvbmRzJylcbiAgICAuYWN0aW9uKFxuICAgICAgYXN5bmMgKFxuICAgICAgICBvcHRzOiBDbGllbnRGbGFncyAmIHtcbiAgICAgICAgICByZXBvOiBzdHJpbmc7XG4gICAgICAgICAgc3BlY0ZvbGRlcjogc3RyaW5nO1xuICAgICAgICAgIGFnZW50Q21kOiBzdHJpbmc7XG4gICAgICAgICAgb25jZT86IGJvb2xlYW47XG4gICAgICAgICAgcG9sbD86IHN0cmluZztcbiAgICAgICAgfSxcbiAgICAgICkgPT4ge1xuICAgICAgICB0cnkge1xuICAgICAgICAgIGNvbnN0IGNsaWVudCA9IGNsaWVudEZyb20ob3B0cyk7XG4gICAgICAgICAgLy8gTEFaWSBpbXBvcnQ6IHRoZSBydW5uZXIgaXMgYSBmaXhlZCBpbnRlcmZhY2UgdGhhdCBtYXkgc3RpbGwgYmUgYVxuICAgICAgICAgIC8vIHN0dWIgXHUyMDE0IHRoZSByZXN0IG9mIHRoZSBDTEkgbXVzdCBuZXZlciBwYXkgZm9yIChvciBicmVhayBvbikgaXQuXG4gICAgICAgICAgY29uc3QgcnVubmVyID0gYXdhaXQgaW1wb3J0KCdAb2Focy9ydW5uZXInKTtcbiAgICAgICAgICBhd2FpdCBydW5uZXIud29ya0xvb3Aoe1xuICAgICAgICAgICAgY2xpZW50LFxuICAgICAgICAgICAgcmVwb1BhdGg6IHJlc29sdmUob3B0cy5yZXBvKSxcbiAgICAgICAgICAgIHNwZWNGb2xkZXI6IG9wdHMuc3BlY0ZvbGRlcixcbiAgICAgICAgICAgIGFnZW50Q21kOiBvcHRzLmFnZW50Q21kLFxuICAgICAgICAgICAgLi4uKG9wdHMucG9sbCAhPT0gdW5kZWZpbmVkID8geyBwb2xsTXM6IE51bWJlcihvcHRzLnBvbGwpIH0gOiB7fSksXG4gICAgICAgICAgICAuLi4ob3B0cy5vbmNlID09PSB0cnVlID8geyBvbmNlOiB0cnVlIH0gOiB7fSksXG4gICAgICAgICAgfSk7XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgY29uc3QgZXJyID0gZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yIDogbmV3IEVycm9yKFN0cmluZyhlcnJvcikpO1xuICAgICAgICAgIHByb2Nlc3Muc3RkZXJyLndyaXRlKGBvYWhzIHdvcmsgZmFpbGVkIFx1MjAxNCAke2Vyci5uYW1lfTogJHtlcnIubWVzc2FnZX1cXG5gKTtcbiAgICAgICAgICBwcm9jZXNzLmV4aXRDb2RlID0gMTtcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICApO1xuXG4gIHJldHVybiBwcm9ncmFtO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gbWFpbihhcmd2OiBzdHJpbmdbXSA9IHByb2Nlc3MuYXJndik6IFByb21pc2U8dm9pZD4ge1xuICBhd2FpdCBidWlsZFByb2dyYW0oKS5wYXJzZUFzeW5jKGFyZ3YpO1xufVxuXG4vLyBCdW5kbGVkIGFzIGJpbi9vYWhzLm1qcyBcdTIwMTQgdGhlIGJ1bmRsZSBlbnRyeXBvaW50IElTIHRoZSBleGVjdXRhYmxlLlxudm9pZCBtYWluKCk7XG4iLCAiLyoqXG4gKiBAb2Focy9jb250cmFjdHMgXHUyMDE0IHRoZSBzaW5nbGUgc291cmNlIG9mIHRydXRoIGZvciBldmVyeSBvYWhzIGNvbW1hbmQuXG4gKlxuICogT25lIHJlZ2lzdHJ5IGVudHJ5ID0gb25lIEhUVFAgZW5kcG9pbnQgKGBQT1NUIC9ycGMvPG5hbWU+YCkgPSBvbmUgTUNQIHRvb2xcbiAqIChgb2Foc188bmFtZT5gKSA9IG9uZSB0eXBlZCBjbGllbnQgbWV0aG9kLiBCb3RoIGFkYXB0ZXJzIGNhbGwgdGhlIHNhbWVcbiAqIGNvbW1hbmQgYnVzIHdpdGggdGhlIHNhbWUgem9kLXZhbGlkYXRlZCBpbnB1dCwgc28gXCJNQ1Agc2VtYW50aWNzIFx1MjI2MSBIVFRQXG4gKiBzZW1hbnRpY3NcIiBpcyBhIHN0cnVjdHVyYWwgY29uc2VxdWVuY2UsIG5vdCBhIHJldmlldyBkaXNjaXBsaW5lXG4gKiAocHJvZHVjdC1yb2FkbWFwLm1kIFx1MDBBNzAuMSBpbnZhcmlhbnQsIEQ1KS5cbiAqXG4gKiBUcmFuc3BvcnQgaXMgZGVsaWJlcmF0ZWx5IHVuaWZvcm0gUlBDIChubyBSRVNUIHBhdGggcGFyYW1ldGVycyk6IHBhcml0eVxuICogYmV0d2VlbiBzdXJmYWNlcyBzdGF5cyBtYWNoaW5lLWNoZWNrYWJsZSwgYW5kIHRoZSBwYXJpdHkgdGVzdCBpblxuICogYXBwcy9zcGluZS1hcGkgYXNzZXJ0cyBldmVyeSByZWdpc3RyeSBlbnRyeSBleGlzdHMgb24gYm90aCBzdXJmYWNlcy5cbiAqL1xuaW1wb3J0IHsgeiB9IGZyb20gJ3pvZCc7XG5pbXBvcnQge1xuICBCTE9DS0VEX1JFQVNPTlMsXG4gIFdPUktfSVRFTV9TVEFURVMsXG4gIHR5cGUgU3BpbmVFbmdpbmUsXG59IGZyb20gJ0BvYWhzL2NvcmUnO1xuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIFNoYXJlZCBmaWVsZCBzY2hlbWFzXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuY29uc3Qgd29ya0l0ZW1JZCA9IHouc3RyaW5nKCkubWluKDEpLmRlc2NyaWJlKCdXb3JrIGl0ZW0gaWQgKG9yIGl0cyBzdG9yaWVzLnlhbWwgZXh0ZXJuYWxLZXkpJyk7XG5jb25zdCBmZW5jaW5nVG9rZW4gPSB6XG4gIC5udW1iZXIoKVxuICAuaW50KClcbiAgLm9wdGlvbmFsKClcbiAgLmRlc2NyaWJlKCdGZW5jaW5nIHRva2VuIG9mIHRoZSBsaXZlIGNsYWltIFx1MjAxNCByZXF1aXJlZCBmb3IgZXhlY3V0aW9uLXpvbmUgbXV0YXRpb25zJyk7XG5cbmNvbnN0IGV2aWRlbmNlU2NoZW1hID0gelxuICAub2JqZWN0KHtcbiAgICBraW5kOiB6LmVudW0oWyd0ZXN0X3J1bicsICdnaXRfZGlmZicsICdjb21taXQnLCAnaGFsdF9yZXBvcnQnLCAncmV2aWV3X3JlcG9ydCcsICdkb2NfbGludCddKSxcbiAgICBwYXlsb2FkOiB6LnJlY29yZCh6LnN0cmluZygpLCB6LnVua25vd24oKSksXG4gIH0pXG4gIC5kZXNjcmliZSgnUmF3IG1hY2hpbmUtY29sbGVjdGVkIGV2aWRlbmNlOyB0aGUgY29yZSBjb21wdXRlcyB2ZXJkaWN0cywgdGhlIHJ1bm5lciBuZXZlciBkb2VzJyk7XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gUmVnaXN0cnlcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5leHBvcnQgaW50ZXJmYWNlIENvbW1hbmREZWY8SW5wdXQgZXh0ZW5kcyB6LlpvZFR5cGUgPSB6LlpvZFR5cGU+IHtcbiAgLyoqIHNuYWtlX2Nhc2UgY29tbWFuZCBuYW1lOyBIVFRQIHBhdGggaXMgL3JwYy88bmFtZT4sIE1DUCB0b29sIGlzIG9haHNfPG5hbWU+ICovXG4gIG5hbWU6IHN0cmluZztcbiAgZGVzY3JpcHRpb246IHN0cmluZztcbiAgaW5wdXQ6IElucHV0O1xuICAvKiogdHJ1ZSB3aGVuIHRoZSBjb21tYW5kIG9ubHkgcmVhZHMgc3RhdGUgKHVzZWQgZm9yIGRvY3M7IHNhbWUgcmFpbHMgZWl0aGVyIHdheSkgKi9cbiAgcmVhZG9ubHk6IGJvb2xlYW47XG59XG5cbmZ1bmN0aW9uIGRlZjxJIGV4dGVuZHMgei5ab2RUeXBlPihcbiAgbmFtZTogc3RyaW5nLFxuICBkZXNjcmlwdGlvbjogc3RyaW5nLFxuICBpbnB1dDogSSxcbiAgcmVhZG9ubHkgPSBmYWxzZSxcbik6IENvbW1hbmREZWY8ST4ge1xuICByZXR1cm4geyBuYW1lLCBkZXNjcmlwdGlvbiwgaW5wdXQsIHJlYWRvbmx5IH07XG59XG5cbmV4cG9ydCBjb25zdCBDT01NQU5EUyA9IFtcbiAgLy8gLS0gc2V0dXAgLyBhZG1pbiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgZGVmKFxuICAgICdjcmVhdGVfYWN0b3InLFxuICAgICdDcmVhdGUgYSB1c2VyIG9yIGFnZW50IGFjdG9yLiBSZXR1cm5zIHRoZSBhY3RvciBhbmQgaXRzIEFQSSB0b2tlbiAoYWRtaW4gb25seSkuJyxcbiAgICB6Lm9iamVjdCh7XG4gICAgICB0eXBlOiB6LmVudW0oWyd1c2VyJywgJ2FnZW50J10pLFxuICAgICAgZGlzcGxheU5hbWU6IHouc3RyaW5nKCkubWluKDEpLFxuICAgICAgZ292ZXJuYW5jZVJvbGU6IHpcbiAgICAgICAgLmVudW0oWydhZG1pbicsICdtZW1iZXInLCAnYXVkaXRvciddKVxuICAgICAgICAub3B0aW9uYWwoKVxuICAgICAgICAuZGVzY3JpYmUoJ0Jvb3RzdHJhcCBwbHVtYmluZyAocm9hZG1hcCBcdTAwQTczKTogaW5pdGlhbCBnb3Zlcm5hbmNlIHJvbGUgXHUyMDE0IGFkbWluIGNvbnRleHQgb25seScpLFxuICAgIH0pLFxuICApLFxuICBkZWYoXG4gICAgJ2dyYW50X3Blcm1pc3Npb24nLFxuICAgICdHcmFudCBhIHBlcm1pc3Npb24gdG8gYW4gYWN0b3IgKGFkbWluIG9ubHkpLiBHcmFudHMgYXJlIGV4cGxpY2l0IGFuZCBhdWRpdGVkIFx1MjAxNCBhdXRob3JpdHkgbmV2ZXIgY29tZXMgZnJvbSBhY3RvciB0eXBlLCB0ZW51cmUsIG9yIG1lbW9yeSAodGhlc2lzIFx1MDBBNzMpLicsXG4gICAgei5vYmplY3Qoe1xuICAgICAgYWN0b3JJZDogei5zdHJpbmcoKS5taW4oMSksXG4gICAgICBwZXJtaXNzaW9uOiB6LnN0cmluZygpLm1pbigxKSxcbiAgICAgIHNjb3BlOiB6LnN0cmluZygpLm9wdGlvbmFsKCksXG4gICAgfSksXG4gICksXG4gIGRlZihcbiAgICAncmV2b2tlX3Blcm1pc3Npb24nLFxuICAgICdSZXZva2UgYSBwZXJtaXNzaW9uIGZyb20gYW4gYWN0b3IgKGFkbWluIG9ubHkpLicsXG4gICAgei5vYmplY3Qoe1xuICAgICAgYWN0b3JJZDogei5zdHJpbmcoKS5taW4oMSksXG4gICAgICBwZXJtaXNzaW9uOiB6LnN0cmluZygpLm1pbigxKSxcbiAgICAgIHNjb3BlOiB6LnN0cmluZygpLm9wdGlvbmFsKCksXG4gICAgfSksXG4gICksXG4gIGRlZignY3JlYXRlX2ZlYXR1cmUnLCAnQ3JlYXRlIGEgZmVhdHVyZSAobWFwcyBhIEJNQUQgZXBpYykuJywgei5vYmplY3Qoe30pKSxcbiAgZGVmKFxuICAgICdpbXBvcnRfc3RvcmllcycsXG4gICAgJ0ltcG9ydCBhIHN0b3JpZXMueWFtbCBmaWxlIGludG8gYSBmZWF0dXJlIChpZGVtcG90ZW50IHJlLWltcG9ydDsgdmFsaWRpdHkgcnVsZXMgZnJvbSBzdG9yaWVzLXNjaGVtYS5tZCkuJyxcbiAgICB6Lm9iamVjdCh7XG4gICAgICBmZWF0dXJlSWQ6IHouc3RyaW5nKCkubWluKDEpLFxuICAgICAgeWFtbDogei5zdHJpbmcoKS5taW4oMSksXG4gICAgfSksXG4gICksXG5cbiAgLy8gLS0gY2xhaW1zIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgZGVmKFxuICAgICdjbGFpbV90YXNrJyxcbiAgICAnQ2xhaW0gYSB3b3JrIGl0ZW0gdW5kZXIgYSBsZWFzZS4gUmV0dXJucyB0aGUgY2xhaW0gd2l0aCBpdHMgZmVuY2luZyB0b2tlbi4nLFxuICAgIHoub2JqZWN0KHtcbiAgICAgIHdvcmtJdGVtSWQsXG4gICAgICB0dGxNczogei5udW1iZXIoKS5pbnQoKS5wb3NpdGl2ZSgpLm9wdGlvbmFsKCksXG4gICAgfSksXG4gICksXG4gIGRlZignaGVhcnRiZWF0JywgJ1JlbmV3IHRoZSBsZWFzZSBvZiBhIGxpdmUgY2xhaW0uJywgei5vYmplY3QoeyBjbGFpbUlkOiB6LnN0cmluZygpLm1pbigxKSB9KSksXG4gIGRlZihcbiAgICAncmVsZWFzZV9jbGFpbScsXG4gICAgJ1JlbGVhc2UgYSBjbGFpbSAobm9ybWFsIGNvbXBsZXRpb24gb3Igdm9sdW50YXJ5IGhhbmRvZmYpLicsXG4gICAgei5vYmplY3QoeyBjbGFpbUlkOiB6LnN0cmluZygpLm1pbigxKSwgcmVhc29uOiB6LnN0cmluZygpLm9wdGlvbmFsKCkgfSksXG4gICksXG5cbiAgLy8gLS0gbGlmZWN5Y2xlIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICBkZWYoXG4gICAgJ2FkdmFuY2Vfc3RhdGUnLFxuICAgICdBZHZhbmNlIGEgd29yayBpdGVtIHRocm91Z2ggdGhlIEZTTS4gRGV0ZXJtaW5pc3RpYzogcGVybWlzc2lvbiArIGd1YXJkcyArIGV2aWRlbmNlIGRlY2lkZSwgbmV2ZXIgaW50ZXJwcmV0YXRpb24uJyxcbiAgICB6Lm9iamVjdCh7XG4gICAgICB3b3JrSXRlbUlkLFxuICAgICAgdG86IHouZW51bShXT1JLX0lURU1fU1RBVEVTKSxcbiAgICAgIGZlbmNpbmdUb2tlbixcbiAgICAgIGlkZW1wb3RlbmN5S2V5OiB6LnN0cmluZygpLm9wdGlvbmFsKCksXG4gICAgfSksXG4gICksXG4gIGRlZihcbiAgICAnYmxvY2tfdGFzaycsXG4gICAgJ1NldCB0aGUgYmxvY2tlZCBvdmVybGF5IHdpdGggYSBibG9ja2luZyBjb25kaXRpb24gZnJvbSB0aGUgSEFMVCB0YXhvbm9teS4nLFxuICAgIHoub2JqZWN0KHtcbiAgICAgIHdvcmtJdGVtSWQsXG4gICAgICByZWFzb246IHouZW51bShCTE9DS0VEX1JFQVNPTlMpLFxuICAgICAgZmVuY2luZ1Rva2VuLFxuICAgIH0pLFxuICApLFxuICBkZWYoJ3VuYmxvY2tfdGFzaycsICdDbGVhciB0aGUgYmxvY2tlZCBvdmVybGF5IChyZXZpZXdfbm9uX2NvbnZlcmdlbmNlIG5lZWRzIHRoZSByZXZpZXcgZ2F0ZSBncmFudCkuJywgei5vYmplY3QoeyB3b3JrSXRlbUlkIH0pKSxcbiAgZGVmKFxuICAgICdzdWJtaXRfZXZpZGVuY2UnLFxuICAgICdTdWJtaXQgcmF3IG1hY2hpbmUtY29sbGVjdGVkIGV2aWRlbmNlIChleGl0IGNvZGVzLCBkaWZmIHN0YXRzLCBzaGFzKS4gVGhlIGNvcmUgY29tcHV0ZXMgdmVyZGljdHMuJyxcbiAgICB6Lm9iamVjdCh7IHdvcmtJdGVtSWQsIGV2aWRlbmNlOiBldmlkZW5jZVNjaGVtYSwgZmVuY2luZ1Rva2VuIH0pLFxuICApLFxuICBkZWYoXG4gICAgJ2FwcHJvdmVfZ2F0ZScsXG4gICAgJ0FwcHJvdmUgYSBnYXRlIGFzIGEgcGVybWl0dGVkIGFjdG9yLiBzcGVjX2FwcHJvdmFsIHBpbnMgdGhlIHZlcmlmaWNhdGlvbiBjb21tYW5kcyAoRDcpIGFuZCBmaXJlcyBkcmFmdFx1MjE5MnJlYWR5X2Zvcl9kZXY7IHJldmlld19hcHByb3ZhbCBjaGVja3MgcGlubmVkIGV2aWRlbmNlIGFuZCBmaXJlcyBpbl9yZXZpZXdcdTIxOTJkb25lLicsXG4gICAgei5vYmplY3Qoe1xuICAgICAgd29ya0l0ZW1JZCxcbiAgICAgIGdhdGU6IHouZW51bShbJ3NwZWNfYXBwcm92YWwnLCAncmV2aWV3X2FwcHJvdmFsJ10pLFxuICAgICAgcGlubmVkVmVyaWZpY2F0aW9uOiB6LmFycmF5KHouc3RyaW5nKCkpLm9wdGlvbmFsKCksXG4gICAgfSksXG4gICksXG4gIGRlZihcbiAgICAncmVqZWN0X2dhdGUnLFxuICAgICdSZWplY3QgYSBnYXRlIGFzIGEgcGVybWl0dGVkIGFjdG9yLiBSZXZpZXcgcmVqZWN0aW9uIGZpcmVzIHRoZSBsb29wYmFjayBhcyBhIHN5c3RlbSBlZmZlY3QgKG9yIGJsb2NrcyB3aXRoIHJldmlld19ub25fY29udmVyZ2VuY2Ugb24gdGhlIDZ0aCkuJyxcbiAgICB6Lm9iamVjdCh7XG4gICAgICB3b3JrSXRlbUlkLFxuICAgICAgZ2F0ZTogei5lbnVtKFsnc3BlY19hcHByb3ZhbCcsICdyZXZpZXdfYXBwcm92YWwnXSksXG4gICAgfSksXG4gICksXG4gIGRlZihcbiAgICAncmVsZWFzZV9kaXNwYXRjaF9ob2xkJyxcbiAgICAnUmVsZWFzZSBhIGRvbmVfY2hlY2twb2ludCBkaXNwYXRjaCBob2xkIG9uIGEgZmVhdHVyZSAocGVybWl0dGVkIGFjdG9ycyBvbmx5KS4nLFxuICAgIHoub2JqZWN0KHsgZmVhdHVyZUlkOiB6LnN0cmluZygpLm1pbigxKSB9KSxcbiAgKSxcblxuICAvLyAtLSBlbnRpdGxlbWVudHMgKFBoYXNlIDIsIHJvYWRtYXAgXHUwMEE3MykgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIC8vIEF1dGhvcml0eSBmb3IgdGhpcyBncm91cCBpcyBkZWNpZGVkIGJ5IHRoZSBFTkdJTkUgZnJvbSB0aGUgY2FsbGVyJ3NcbiAgLy8gZ292ZXJuYW5jZSByb2xlIChcImVudGl0bGVtZW50ID0gcGxhbiBcdTAwRDcgZ292ZXJuYW5jZSByb2xlIFx1MDBENyBkZWxpdmVyeSByb2xlLFxuICAvLyByZXNvbHZlZCBieSBhIHB1cmUgZnVuY3Rpb24gb3ZlciB2ZXJzaW9uZWQgY29uZmlnL2RhdGFcIikgXHUyMDE0IHRoZSBidXMgbmV2ZXJcbiAgLy8gcHJlLWNoZWNrcyBhZG1pbiBoZXJlLlxuICBkZWYoXG4gICAgJ2Fzc2lnbl9yb2xlJyxcbiAgICAnQXNzaWduIGEgZGVsaXZlcnkgcm9sZSAocGVybWlzc2lvbiBidW5kbGUsIHJvYWRtYXAgXHUwMEE3MykgdG8gYW4gYWN0b3IuIEdhdGVkIHdyaXRlOiByZXF1aXJlcyBnb3Zlcm5hbmNlLWFkbWluIGF1dGhvcml0eTsgYXVkaXRlZC4nLFxuICAgIHoub2JqZWN0KHtcbiAgICAgIGFjdG9ySWQ6IHouc3RyaW5nKCkubWluKDEpLFxuICAgICAgcm9sZUNvZGU6IHouc3RyaW5nKCkubWluKDEpLmRlc2NyaWJlKCdEZWxpdmVyeSByb2xlIGNvZGUsIGUuZy4gcmV2aWV3ZXIgfCBkZXZlbG9wZXIgfCBwcm9kdWN0X293bmVyJyksXG4gICAgfSksXG4gICksXG4gIGRlZihcbiAgICAncmV2b2tlX3JvbGUnLFxuICAgICdSZXZva2UgYSBkZWxpdmVyeSByb2xlIGFzc2lnbm1lbnQgZnJvbSBhbiBhY3Rvci4gR2F0ZWQgd3JpdGU6IHJlcXVpcmVzIGdvdmVybmFuY2UtYWRtaW4gYXV0aG9yaXR5OyBhdWRpdGVkLicsXG4gICAgei5vYmplY3Qoe1xuICAgICAgYWN0b3JJZDogei5zdHJpbmcoKS5taW4oMSksXG4gICAgICByb2xlQ29kZTogei5zdHJpbmcoKS5taW4oMSksXG4gICAgfSksXG4gICksXG4gIGRlZihcbiAgICAnbGlzdF9yb2xlX2Fzc2lnbm1lbnRzJyxcbiAgICAnTGlzdCBkZWxpdmVyeS1yb2xlIGFzc2lnbm1lbnRzIChhbGwsIG9yIG9uZSBhY3Rvclx1MjAxOXMpLCBpbmNsdWRpbmcgcmV2b2tlZCByb3dzIGZvciBhdWRpdC4nLFxuICAgIHoub2JqZWN0KHsgYWN0b3JJZDogei5zdHJpbmcoKS5taW4oMSkub3B0aW9uYWwoKSB9KSxcbiAgICB0cnVlLFxuICApLFxuICBkZWYoXG4gICAgJ3NldF9nb3Zlcm5hbmNlX3JvbGUnLFxuICAgICdTZXQgYW4gYWN0b3JcdTIwMTlzIGdvdmVybmFuY2Ugcm9sZSAoYWRtaW4gfCBtZW1iZXIgfCBhdWRpdG9yKS4gR2F0ZWQgd3JpdGU6IHJlcXVpcmVzIGdvdmVybmFuY2UtYWRtaW4gYXV0aG9yaXR5LicsXG4gICAgei5vYmplY3Qoe1xuICAgICAgYWN0b3JJZDogei5zdHJpbmcoKS5taW4oMSksXG4gICAgICByb2xlOiB6LmVudW0oWydhZG1pbicsICdtZW1iZXInLCAnYXVkaXRvciddKSxcbiAgICB9KSxcbiAgKSxcbiAgZGVmKFxuICAgICdzZXRfcGxhbicsXG4gICAgJ1NldCB0aGUgd29ya3NwYWNlIHBsYW4uIFBsYW4gaXMgYSBDRUlMSU5HLCBuZXZlciBhIGdyYW50IChyb2FkbWFwIFx1MDBBNzMpOiBpdCBib3VuZHMgd2hhdCBhZ2VudHMgbWF5IGhvbGQvZXhlcmNpc2U7IHVzZXJzIGFyZSBuZXZlciBwbGFuLWZpbHRlcmVkLicsXG4gICAgei5vYmplY3QoeyBwbGFuOiB6LmVudW0oWydmcmVlJywgJ3RlYW0nLCAnZW50ZXJwcmlzZSddKSB9KSxcbiAgKSxcbiAgZGVmKFxuICAgICdzZXRfd29ya3NwYWNlX3BvbGljeScsXG4gICAgJ1NldCByZXN0cmljdC1vbmx5IHdvcmtzcGFjZSBwb2xpY3kga2V5cyAocm9hZG1hcCBcdTAwQTczKTogYSBwb2xpY3kgY2FuIG5hcnJvdyB3aGF0IHRoZSBwbGFuIGFsbG93cywgbmV2ZXIgd2lkZW4gaXQuJyxcbiAgICB6Lm9iamVjdCh7XG4gICAgICBwb2xpY3k6IHoub2JqZWN0KHtcbiAgICAgICAgYWdlbnRHYXRlQXBwcm92YWxzOiB6XG4gICAgICAgICAgLmJvb2xlYW4oKVxuICAgICAgICAgIC5vcHRpb25hbCgpXG4gICAgICAgICAgLmRlc2NyaWJlKCdmYWxzZSBcdTIxRDIgYWdlbnRzIGNhbm5vdCBleGVyY2lzZSBnYXRlLWFwcHJvdmFsIHBlcm1pc3Npb25zIGV2ZW4gaWYgZ3JhbnRlZCcpLFxuICAgICAgICBhZ2VudFNlbGZEaXNwYXRjaDogelxuICAgICAgICAgIC5ib29sZWFuKClcbiAgICAgICAgICAub3B0aW9uYWwoKVxuICAgICAgICAgIC5kZXNjcmliZSgnZmFsc2UgXHUyMUQyIGFnZW50cyBjYW5ub3QgY2xhaW0gdGFza3Mgb24gdGhlaXIgb3duIChtZW50aW9uLWRpc3BhdGNoIG9ubHkpJyksXG4gICAgICB9KSxcbiAgICB9KSxcbiAgKSxcbiAgZGVmKFxuICAgICdzZXRfZ2F0ZV9wb2xpY3knLFxuICAgICdTZXQgYSBnYXRlIGRlZmluaXRpb24gYXMgREFUQSAocm9hZG1hcCBcdTAwQTczKTogbWluX2FwcHJvdmFscyBxdW9ydW0gYW5kIHJlcXVpcmVkX2FjdG9yX3R5cGVzIFx1MjAxNCBodW1hbi1vbmx5IGlzIGEgZGVmYXVsdCwgbm90IGEgaGFyZGNvZGUuJyxcbiAgICB6Lm9iamVjdCh7XG4gICAgICBnYXRlOiB6LmVudW0oWydzcGVjX2FwcHJvdmFsJywgJ3Jldmlld19hcHByb3ZhbCddKSxcbiAgICAgIHBvbGljeTogei5vYmplY3Qoe1xuICAgICAgICBtaW5BcHByb3ZhbHM6IHoubnVtYmVyKCkuaW50KCkucG9zaXRpdmUoKS5vcHRpb25hbCgpLmRlc2NyaWJlKCdkaXN0aW5jdCBhcHByb3ZlcnMgcmVxdWlyZWQgcGVyIHJldmlldyByb3VuZCcpLFxuICAgICAgICByZXF1aXJlZEFjdG9yVHlwZXM6IHpcbiAgICAgICAgICAuYXJyYXkoei5lbnVtKFsndXNlcicsICdhZ2VudCcsICdzeXN0ZW0nXSkpXG4gICAgICAgICAgLm9wdGlvbmFsKClcbiAgICAgICAgICAuZGVzY3JpYmUoJ2F0IGxlYXN0IG9uZSBhcHByb3ZlciBvZiBlYWNoIGxpc3RlZCB0eXBlIGlzIHJlcXVpcmVkJyksXG4gICAgICB9KSxcbiAgICB9KSxcbiAgKSxcbiAgZGVmKFxuICAgICdhdXRoel9leHBsYWluJyxcbiAgICAnUmVwbGF5YWJsZSBhdXRoeiBkZWNpc2lvbiB0cmFjZSAocm9hZG1hcCBcdTAwQTczKTogc291cmNlIGdyYW50L3JvbGUsIHBsYW4gY2VpbGluZywgcG9saWN5LCBhbmQgdGhlIHBvbGljeSB2ZXJzaW9uIHR1cGxlIGFuIGF1ZGl0b3IgY2FuIHJlcGxheS4nLFxuICAgIHoub2JqZWN0KHtcbiAgICAgIGFjdG9ySWQ6IHouc3RyaW5nKCkubWluKDEpLFxuICAgICAgcGVybWlzc2lvbjogei5zdHJpbmcoKS5taW4oMSksXG4gICAgfSksXG4gICAgdHJ1ZSxcbiAgKSxcblxuICAvLyAtLSBjb2xsYWJvcmF0aW9uIChQaGFzZSAzLCByb2FkbWFwIFx1MDBBNzUpIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAvLyBUaGUgY2hhdCBTVVJGQUNFIG92ZXIgdGhlIHNhbWUgcmFpbHMuIFNhY3JlZCBib3VuZGFyeSAoXHUwMEE3NS4yKTogYSBtZXNzYWdlXG4gIC8vIE5FVkVSIG11dGF0ZXMgbGlmZWN5Y2xlOyBtZW50aW9ucyBhcmUgU1RSVUNUVVJFRCBhY3RvciBpZHMgXHUyMDE0IG5vIHNlcnZlclxuICAvLyBjb2RlIHBhdGggZXZlciBwYXJzZXMgbWVzc2FnZSBib2R5IHRleHQuIEFjdG9yIGlkZW50aXR5IGZvciBldmVyeSBjb21tYW5kXG4gIC8vIGhlcmUgY29tZXMgZnJvbSBjdHggKHRoZSBhdXRoZW50aWNhdGVkIHRva2VuKSwgbmV2ZXIgZnJvbSB0aGUgaW5wdXQuXG4gIGRlZihcbiAgICAnY3JlYXRlX3RocmVhZCcsXG4gICAgJ0NyZWF0ZSBhIGNvbnZlcnNhdGlvbiB0aHJlYWQsIG9wdGlvbmFsbHkgYm91bmQgdG8gYSBmZWF0dXJlL3dvcmsgaXRlbS4ga2luZD1wcml2YXRlIGRlZmF1bHRzIHZpc2liaWxpdHkgdG8gcHJpdmF0ZS4nLFxuICAgIHoub2JqZWN0KHtcbiAgICAgIGtpbmQ6IHouZW51bShbJ3NwZWMnLCAnZGVzaWduJywgJ3Rhc2snLCAnZ2VuZXJhbCcsICdwcml2YXRlJ10pLFxuICAgICAgZmVhdHVyZUlkOiB6LnN0cmluZygpLm1pbigxKS5vcHRpb25hbCgpLFxuICAgICAgd29ya0l0ZW1JZDogd29ya0l0ZW1JZC5vcHRpb25hbCgpLFxuICAgICAgdmlzaWJpbGl0eTogei5lbnVtKFsnb3BlbicsICdwcml2YXRlJ10pLm9wdGlvbmFsKCksXG4gICAgfSksXG4gICksXG4gIGRlZihcbiAgICAnYWRkX3RocmVhZF9wYXJ0aWNpcGFudCcsXG4gICAgJ0ludml0ZSBhbiBhY3RvciBpbnRvIGEgdGhyZWFkIChwcml2YXRlIHRocmVhZHM6IG9ubHkgZXhpc3RpbmcgcGFydGljaXBhbnRzIG1heSBpbnZpdGUpLicsXG4gICAgei5vYmplY3Qoe1xuICAgICAgdGhyZWFkSWQ6IHouc3RyaW5nKCkubWluKDEpLFxuICAgICAgYWN0b3JJZDogei5zdHJpbmcoKS5taW4oMSksXG4gICAgfSksXG4gICksXG4gIGRlZihcbiAgICAncG9zdF9tZXNzYWdlJyxcbiAgICAnUG9zdCBhIGNoYXQgbWVzc2FnZS4gYG1lbnRpb25zYCBpcyBzdHJ1Y3R1cmVkIGFjdG9yIGlkcyAoXHUwMEE3NS4yIFx1MjAxNCBib2R5IHRleHQgaXMgbmV2ZXIgcGFyc2VkKTsgbWVudGlvbmluZyBhbiBhZ2VudCBydW5zIHRoZSBkZXRlcm1pbmlzdGljIGRlZmF1bHQtZGVueSByb3V0ZXIgKFx1MDBBNzUuNCkuJyxcbiAgICB6Lm9iamVjdCh7XG4gICAgICB0aHJlYWRJZDogei5zdHJpbmcoKS5taW4oMSksXG4gICAgICBib2R5OiB6LnN0cmluZygpLm1pbigxKSxcbiAgICAgIHJlcGx5VG86IHouc3RyaW5nKCkubWluKDEpLm9wdGlvbmFsKCksXG4gICAgICBtZW50aW9uczogei5hcnJheSh6LnN0cmluZygpLm1pbigxKSkub3B0aW9uYWwoKSxcbiAgICB9KSxcbiAgKSxcbiAgZGVmKFxuICAgICdsaXN0X3RocmVhZHMnLFxuICAgICdMaXN0IHRocmVhZHMsIG9wdGlvbmFsbHkgZmlsdGVyZWQgYnkgZmVhdHVyZSAvIHdvcmsgaXRlbS4gUHJpdmF0ZSB0aHJlYWRzIGFyZSB2aXNpYmxlIG9ubHkgdG8gdGhlaXIgcGFydGljaXBhbnRzIChjdHggYWN0b3IpLicsXG4gICAgei5vYmplY3Qoe1xuICAgICAgZmVhdHVyZUlkOiB6LnN0cmluZygpLm1pbigxKS5vcHRpb25hbCgpLFxuICAgICAgd29ya0l0ZW1JZDogd29ya0l0ZW1JZC5vcHRpb25hbCgpLFxuICAgIH0pLFxuICAgIHRydWUsXG4gICksXG4gIGRlZihcbiAgICAnbGlzdF9tZXNzYWdlcycsXG4gICAgJ0xpc3QgbWVzc2FnZXMgb2YgYSB0aHJlYWQgKG9wdGlvbmFsbHkgYWZ0ZXIgYSBzZXEpLiBQcml2YXRlIHRocmVhZHMgcmVxdWlyZSBwYXJ0aWNpcGF0aW9uIFx1MjAxNCB0aGUgcmVhZGVyIGlzIEFMV0FZUyB0aGUgY3R4IGFjdG9yLicsXG4gICAgei5vYmplY3Qoe1xuICAgICAgdGhyZWFkSWQ6IHouc3RyaW5nKCkubWluKDEpLFxuICAgICAgc2luY2VTZXE6IHoubnVtYmVyKCkuaW50KCkubm9ubmVnYXRpdmUoKS5vcHRpb25hbCgpLFxuICAgIH0pLFxuICAgIHRydWUsXG4gICksXG4gIGRlZihcbiAgICAnbGlzdF9tZW50aW9ucycsXG4gICAgJ0xpc3QgdGhlIHJlY29yZGVkIG1lbnRpb25zIG9mIGEgbWVzc2FnZSB3aXRoIHRoZWlyIHJvdXRlciByZXNvbHV0aW9ucyAobm90aWZpZWQgfCBqb2JfY3JlYXRlZCB8IGRlbmllZF9wb2xpY3kgfCBkZW5pZWRfZGVwdGgpLicsXG4gICAgei5vYmplY3QoeyBtZXNzYWdlSWQ6IHouc3RyaW5nKCkubWluKDEpIH0pLFxuICAgIHRydWUsXG4gICksXG4gIGRlZihcbiAgICAnbGlzdF9ub3RpZmljYXRpb25zJyxcbiAgICAnTGlzdCB0aGUgY3R4IGFjdG9yXHUyMDE5cyBPV04gbm90aWZpY2F0aW9ucyAobWVudGlvbnMgKyBqb2IgY29tcGxldGlvbnMpLicsXG4gICAgei5vYmplY3QoeyB1bnJlYWRPbmx5OiB6LmJvb2xlYW4oKS5vcHRpb25hbCgpIH0pLFxuICAgIHRydWUsXG4gICksXG4gIGRlZihcbiAgICAnbWFya19ub3RpZmljYXRpb25fcmVhZCcsXG4gICAgJ01hcmsgb25lIG9mIHRoZSBjdHggYWN0b3JcdTIwMTlzIG93biBub3RpZmljYXRpb25zIGFzIHJlYWQuJyxcbiAgICB6Lm9iamVjdCh7IG5vdGlmaWNhdGlvbklkOiB6LnN0cmluZygpLm1pbigxKSB9KSxcbiAgKSxcbiAgZGVmKFxuICAgICdsaXN0X2FnZW50X2pvYnMnLFxuICAgICdMaXN0IHJvdXRlci1tYXRlcmlhbGl6ZWQgYWdlbnQgam9icyAocmVwbHktb25seSBjb250ZXh0IFx1MjAxNCBhIGpvYiBuZXZlciBjYXJyaWVzIGEgY2xhaW0gb3IgbGlmZWN5Y2xlIGF1dGhvcml0eSwgXHUwMEE3NS40KS4nLFxuICAgIHoub2JqZWN0KHtcbiAgICAgIGFnZW50QWN0b3JJZDogei5zdHJpbmcoKS5taW4oMSkub3B0aW9uYWwoKSxcbiAgICAgIHN0YXR1czogei5lbnVtKFsncXVldWVkJywgJ2RvbmUnLCAnYmxvY2tlZCddKS5vcHRpb25hbCgpLFxuICAgIH0pLFxuICAgIHRydWUsXG4gICksXG4gIGRlZihcbiAgICAnY29tcGxldGVfYWdlbnRfam9iJyxcbiAgICAnQ29tcGxldGUgYW4gYWdlbnQgam9iIChvbmx5IHRoZSBqb2JcdTIwMTlzIGFnZW50IG1heSkuIENvbXBsZXRpb24gbm90aWZpZXMgdGhlIG1lbnRpb25lciBcdTIwMTQgbm90aGluZyBlbHNlIG1vdmVzLicsXG4gICAgei5vYmplY3Qoe1xuICAgICAgam9iSWQ6IHouc3RyaW5nKCkubWluKDEpLFxuICAgICAgc3RhdHVzOiB6LmVudW0oWydkb25lJywgJ2Jsb2NrZWQnXSksXG4gICAgICBub3RlOiB6LnN0cmluZygpLm9wdGlvbmFsKCksXG4gICAgfSksXG4gICksXG5cbiAgLy8gLS0gcmVjb25jaWxpYXRpb24gKHJvYWRtYXAgXHUwMEE3MS42LCBENjogZGV0ZWN0LW9ubHkpIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIGRlZihcbiAgICAncmVjb25jaWxlJyxcbiAgICAnRGV0ZWN0LW9ubHkgZGl2ZXJnZW5jZSByZXBvcnQgYmV0d2VlbiBmaWxlIGZyb250bWF0dGVyIHN0YXR1c2VzIGFuZCBEQiBzdGF0ZXMgKG5ldmVyIG11dGF0ZXM7IGxpdmUtY2xhaW1lZCBpdGVtcyBhcmUgZXhjbHVkZWQpLicsXG4gICAgei5vYmplY3Qoe1xuICAgICAgZmlsZXM6IHouYXJyYXkoXG4gICAgICAgIHoub2JqZWN0KHtcbiAgICAgICAgICB3b3JrSXRlbUlkLFxuICAgICAgICAgIGZyb250bWF0dGVyU3RhdHVzOiB6LnN0cmluZygpLm1pbigxKSxcbiAgICAgICAgfSksXG4gICAgICApLFxuICAgIH0pLFxuICAgIHRydWUsXG4gICksXG5cbiAgLy8gLS0gb3BzIChzbyBub2JvZHkgZXZlciBuZWVkcyB0byB0b3VjaCB0aGUgREIgYnkgaGFuZCkgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgZGVmKFxuICAgICdmb3JjZV9yZWxlYXNlX2NsYWltJyxcbiAgICAnT3BzOiBmb3JjZS1yZWxlYXNlIHRoZSBsaXZlIGNsYWltIG9mIGEgd29yayBpdGVtIChzdHVjayBydW5uZXIsIGxvc3QgbWFjaGluZSkuJyxcbiAgICB6Lm9iamVjdCh7IHdvcmtJdGVtSWQgfSksXG4gICksXG5cbiAgLy8gLS0gcXVlcmllcyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICBkZWYoJ2dldF93b3JrX2l0ZW0nLCAnRmV0Y2ggb25lIHdvcmsgaXRlbSBieSBpZCBvciBleHRlcm5hbEtleS4nLCB6Lm9iamVjdCh7IHdvcmtJdGVtSWQgfSksIHRydWUpLFxuICBkZWYoJ2dldF9mZWF0dXJlJywgJ0ZldGNoIG9uZSBmZWF0dXJlLicsIHoub2JqZWN0KHsgZmVhdHVyZUlkOiB6LnN0cmluZygpLm1pbigxKSB9KSwgdHJ1ZSksXG4gIGRlZihcbiAgICAnZ2V0X3Rhc2tfY29udGV4dCcsXG4gICAgJ0Rpc3BhdGNoIGNvbnRleHQgZm9yIGEgcnVubmVyOiBlbnRyeSBzdGF0ZSByb3V0aW5nIHBlciBkZXYtYXV0by4gUmVmdXNlcyBkb25lIGl0ZW1zIGFuZCBoZWxkIGZlYXR1cmVzLicsXG4gICAgei5vYmplY3QoeyB3b3JrSXRlbUlkIH0pLFxuICAgIHRydWUsXG4gICksXG4gIGRlZihcbiAgICAnbGlzdF93b3JrX2l0ZW1zJyxcbiAgICAnTGlzdCB3b3JrIGl0ZW1zLCBvcHRpb25hbGx5IGZpbHRlcmVkIGJ5IHN0YXRlIC8gZmVhdHVyZSAvIGNsYWltYWJpbGl0eS4nLFxuICAgIHoub2JqZWN0KHtcbiAgICAgIHN0YXRlOiB6LmVudW0oV09SS19JVEVNX1NUQVRFUykub3B0aW9uYWwoKSxcbiAgICAgIGZlYXR1cmVJZDogei5zdHJpbmcoKS5vcHRpb25hbCgpLFxuICAgICAgY2xhaW1hYmxlOiB6LmJvb2xlYW4oKS5vcHRpb25hbCgpLmRlc2NyaWJlKCd0cnVlID0gbm8gbGl2ZSBjbGFpbSBvbiB0aGUgaXRlbScpLFxuICAgIH0pLFxuICAgIHRydWUsXG4gICksXG4gIGRlZihcbiAgICAnaW5ib3gnLFxuICAgICdHYXRlLWhvbGRlciBpbmJveDogaXRlbXMgYXdhaXRpbmcgYSBnYXRlIGRlY2lzaW9uIChkcmFmdCtzcGVjX2NoZWNrcG9pbnQgYXdhaXRpbmcgc3BlYyBhcHByb3ZhbDsgaW5fcmV2aWV3IGF3YWl0aW5nIHJldmlldyBkZWNpc2lvbikuJyxcbiAgICB6Lm9iamVjdCh7fSksXG4gICAgdHJ1ZSxcbiAgKSxcbiAgZGVmKFxuICAgICdxdWVyeV9ldmVudHMnLFxuICAgICdBdWRpdCBxdWVyeTogdGhlIGFwcGVuZC1vbmx5IGV2ZW50IGxvZywgb3B0aW9uYWxseSBzY29wZWQgdG8gb25lIHN0cmVhbS4nLFxuICAgIHoub2JqZWN0KHsgc3RyZWFtSWQ6IHouc3RyaW5nKCkub3B0aW9uYWwoKSB9KSxcbiAgICB0cnVlLFxuICApLFxuICBkZWYoJ2dldF9jbGFpbXMnLCAnQWxsIGNsYWltcyAobGl2ZSBhbmQgcmVsZWFzZWQpIG9mIGEgd29yayBpdGVtLicsIHoub2JqZWN0KHsgd29ya0l0ZW1JZCB9KSwgdHJ1ZSksXG4gIGRlZignd2hvYW1pJywgJ1Jlc29sdmUgdGhlIGF1dGhlbnRpY2F0ZWQgYWN0b3IuJywgei5vYmplY3Qoe30pLCB0cnVlKSxcbl0gYXMgY29uc3Q7XG5cbmV4cG9ydCB0eXBlIENvbW1hbmROYW1lID0gKHR5cGVvZiBDT01NQU5EUylbbnVtYmVyXVsnbmFtZSddO1xuXG5leHBvcnQgY29uc3QgQ09NTUFORF9NQVA6IFJlYWRvbmx5TWFwPHN0cmluZywgQ29tbWFuZERlZj4gPSBuZXcgTWFwKFxuICBDT01NQU5EUy5tYXAoKGMpID0+IFtjLm5hbWUsIGMgYXMgQ29tbWFuZERlZl0pLFxuKTtcblxuLyoqIE1DUCB0b29sIG5hbWUgZm9yIGEgY29tbWFuZCAodW5pZm9ybSBwcmVmaXgsIEQxMSB2b2NhYnVsYXJ5KS4gKi9cbmV4cG9ydCBmdW5jdGlvbiBtY3BUb29sTmFtZShjb21tYW5kOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gYG9haHNfJHtjb21tYW5kfWA7XG59XG5cbi8qKiBKU09OIFNjaGVtYSBmb3IgYSBjb21tYW5kIGlucHV0ICh6b2QgdjQgbmF0aXZlIGVtaXR0ZXIpIFx1MjAxNCB1c2VkIHZlcmJhdGltIGFzIHRoZSBNQ1AgdG9vbCBpbnB1dFNjaGVtYS4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpbnB1dEpzb25TY2hlbWEoY29tbWFuZDogc3RyaW5nKTogUmVjb3JkPHN0cmluZywgdW5rbm93bj4ge1xuICBjb25zdCBkZWZuID0gQ09NTUFORF9NQVAuZ2V0KGNvbW1hbmQpO1xuICBpZiAoIWRlZm4pIHRocm93IG5ldyBFcnJvcihgdW5rbm93biBjb21tYW5kOiAke2NvbW1hbmR9YCk7XG4gIHJldHVybiB6LnRvSlNPTlNjaGVtYShkZWZuLmlucHV0KSBhcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPjtcbn1cblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBXaXJlIGVudmVsb3BlXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuLyoqXG4gKiBFdmVyeSByZWplY3Rpb24gY3Jvc3NlcyB0aGUgd2lyZSBhcyBhIG1hY2hpbmUtcmVhZGFibGUgZW52ZWxvcGUgY2FycnlpbmdcbiAqIHRoZSBjb3JlIGVycm9yIGNsYXNzIG5hbWUgXHUyMDE0IGNsaWVudHMgcmV0aHJvdyB0aGUgcHJvcGVyIGNsYXNzLCBzbyBlcnJvclxuICogc2VtYW50aWNzIHN1cnZpdmUgdGhlIHRyYW5zcG9ydCAoNDA5IGZvciBjb25mbGljdHMsIDQwMyBmb3IgcGVybWlzc2lvbixcbiAqIDQyMiBmb3IgZ3VhcmRzL3RyYW5zaXRpb25zL3ZhbGlkYXRpb24pLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIEVycm9yRW52ZWxvcGUge1xuICBvazogZmFsc2U7XG4gIGVycm9yOiB7XG4gICAgbmFtZTpcbiAgICAgIHwgJ1Blcm1pc3Npb25EZW5pZWRFcnJvcidcbiAgICAgIHwgJ0d1YXJkRmFpbGVkRXJyb3InXG4gICAgICB8ICdDb25mbGljdEVycm9yJ1xuICAgICAgfCAnSW52YWxpZFRyYW5zaXRpb25FcnJvcidcbiAgICAgIHwgJ1N0b3JpZXNWYWxpZGF0aW9uRXJyb3InXG4gICAgICB8ICdFcnJvcic7XG4gICAgbWVzc2FnZTogc3RyaW5nO1xuICB9O1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIE9rRW52ZWxvcGU8VCA9IHVua25vd24+IHtcbiAgb2s6IHRydWU7XG4gIHJlc3VsdDogVDtcbn1cblxuZXhwb3J0IHR5cGUgRW52ZWxvcGU8VCA9IHVua25vd24+ID0gT2tFbnZlbG9wZTxUPiB8IEVycm9yRW52ZWxvcGU7XG5cbmV4cG9ydCBjb25zdCBIVFRQX1NUQVRVUzogUmVjb3JkPEVycm9yRW52ZWxvcGVbJ2Vycm9yJ11bJ25hbWUnXSwgbnVtYmVyPiA9IHtcbiAgUGVybWlzc2lvbkRlbmllZEVycm9yOiA0MDMsXG4gIENvbmZsaWN0RXJyb3I6IDQwOSxcbiAgR3VhcmRGYWlsZWRFcnJvcjogNDIyLFxuICBJbnZhbGlkVHJhbnNpdGlvbkVycm9yOiA0MjIsXG4gIFN0b3JpZXNWYWxpZGF0aW9uRXJyb3I6IDQyMixcbiAgRXJyb3I6IDUwMCxcbn07XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gQ29tbWFuZCBidXMgY29udHJhY3QgKGltcGxlbWVudGVkIGluIGFwcHMvc3BpbmUtYXBpLCBjb25zdW1lZCBieSBhZGFwdGVycylcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5leHBvcnQgaW50ZXJmYWNlIEFjdG9yQ29udGV4dCB7XG4gIGFjdG9ySWQ6IHN0cmluZztcbiAgaXNBZG1pbjogYm9vbGVhbjtcbn1cblxuLyoqXG4gKiBUaGUgb25lIHBsYWNlIGNvbW1hbmRzIGV4ZWN1dGUuIEhUVFAgYW5kIE1DUCBhcmUgdGhpbiBwYXJzZXJzIGluIGZyb250IG9mXG4gKiB0aGlzOyBub3RoaW5nIGVsc2Ugd3JpdGVzIHN0YXRlIChcdTAwQTcwLjEgXCJubyB3cml0ZXMgb3V0c2lkZSB0aGUgY29tbWFuZCBidXNcIikuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQ29tbWFuZEJ1cyB7XG4gIGV4ZWN1dGUoY29tbWFuZDogc3RyaW5nLCBpbnB1dDogdW5rbm93biwgY3R4OiBBY3RvckNvbnRleHQpOiBQcm9taXNlPHVua25vd24+O1xuICByZWFkb25seSBlbmdpbmU6IFNwaW5lRW5naW5lO1xufVxuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIFR5cGVkIGNsaWVudCAodXNlZCBieSB0aGUgb2FocyBDTEksIHRoZSBydW5uZXIsIGFuZCB0ZXN0cylcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5leHBvcnQgaW50ZXJmYWNlIENsaWVudE9wdGlvbnMge1xuICBiYXNlVXJsOiBzdHJpbmc7XG4gIHRva2VuOiBzdHJpbmc7XG4gIGZldGNoSW1wbD86IHR5cGVvZiBmZXRjaDtcbn1cblxuZXhwb3J0IGNsYXNzIE9haHNSZW1vdGVFcnJvciBleHRlbmRzIEVycm9yIHtcbiAgY29uc3RydWN0b3IoXG4gICAgcHVibGljIHJlYWRvbmx5IGVycm9yTmFtZTogc3RyaW5nLFxuICAgIG1lc3NhZ2U6IHN0cmluZyxcbiAgICBwdWJsaWMgcmVhZG9ubHkgc3RhdHVzOiBudW1iZXIsXG4gICkge1xuICAgIHN1cGVyKG1lc3NhZ2UpO1xuICAgIHRoaXMubmFtZSA9IGVycm9yTmFtZTtcbiAgfVxufVxuXG5leHBvcnQgaW50ZXJmYWNlIE9haHNDbGllbnQge1xuICBjYWxsPFQgPSB1bmtub3duPihjb21tYW5kOiBDb21tYW5kTmFtZSwgaW5wdXQ/OiB1bmtub3duKTogUHJvbWlzZTxUPjtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG1ha2VDbGllbnQob3B0aW9uczogQ2xpZW50T3B0aW9ucyk6IE9haHNDbGllbnQge1xuICBjb25zdCBkb0ZldGNoID0gb3B0aW9ucy5mZXRjaEltcGwgPz8gZmV0Y2g7XG4gIHJldHVybiB7XG4gICAgYXN5bmMgY2FsbDxUPihjb21tYW5kOiBDb21tYW5kTmFtZSwgaW5wdXQ6IHVua25vd24gPSB7fSk6IFByb21pc2U8VD4ge1xuICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBkb0ZldGNoKGAke29wdGlvbnMuYmFzZVVybH0vcnBjLyR7Y29tbWFuZH1gLCB7XG4gICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgJ2NvbnRlbnQtdHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgICAgICAgICBhdXRob3JpemF0aW9uOiBgQmVhcmVyICR7b3B0aW9ucy50b2tlbn1gLFxuICAgICAgICB9LFxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeShpbnB1dCksXG4gICAgICB9KTtcbiAgICAgIGNvbnN0IGVudmVsb3BlID0gKGF3YWl0IHJlc3BvbnNlLmpzb24oKSkgYXMgRW52ZWxvcGU8VD47XG4gICAgICBpZiAoZW52ZWxvcGUub2spIHJldHVybiBlbnZlbG9wZS5yZXN1bHQ7XG4gICAgICB0aHJvdyBuZXcgT2Foc1JlbW90ZUVycm9yKGVudmVsb3BlLmVycm9yLm5hbWUsIGVudmVsb3BlLmVycm9yLm1lc3NhZ2UsIHJlc3BvbnNlLnN0YXR1cyk7XG4gICAgfSxcbiAgfTtcbn1cbiIsICIvKipcbiAqIEdhdGUtaG9sZGVyIGNvbW1hbmQgaW1wbGVtZW50YXRpb25zIFx1MjAxNCBwdXJlIGZ1bmN0aW9ucyBvdmVyIHRoZSB0eXBlZFxuICogY29udHJhY3RzIGNsaWVudDogKGNsaWVudCwgb3B0cykgXHUyMTkyIG91dHB1dCB0ZXh0LiBjbGkudHMgb25seSB3aXJlc1xuICogY29tbWFuZGVyIG9udG8gdGhlc2U7IHRlc3RzIGNhbGwgdGhlbSBkaXJlY3RseSBhZ2FpbnN0IGFuIGluLXByb2Nlc3NcbiAqIHNwaW5lLWFwaS4gRXZlcnkgbXV0YXRpb24gZ29lcyB0aHJvdWdoIC9ycGMvPGNvbW1hbmQ+LCBuZXZlciBhcm91bmQgaXQuXG4gKi9cbmltcG9ydCB7IHJlYWRGaWxlU3luYyB9IGZyb20gJ25vZGU6ZnMnO1xuaW1wb3J0IHsgcmVzb2x2ZSB9IGZyb20gJ25vZGU6cGF0aCc7XG5cbmltcG9ydCB0eXBlIHsgT2Foc0NsaWVudCB9IGZyb20gJ0BvYWhzL2NvbnRyYWN0cyc7XG5pbXBvcnQge1xuICBXT1JLX0lURU1fU1RBVEVTLFxuICB0eXBlIEFjdG9yLFxuICB0eXBlIEF1dGh6RXhwbGFuYXRpb24sXG4gIHR5cGUgRmVhdHVyZSxcbiAgdHlwZSBHYXRlQ29kZSxcbiAgdHlwZSBHb3Zlcm5hbmNlUm9sZSxcbiAgdHlwZSBQbGFuQ29kZSxcbiAgdHlwZSBSb2xlQXNzaWdubWVudCxcbiAgdHlwZSBTcGluZUV2ZW50LFxuICB0eXBlIFN0b3JpZXNJbXBvcnRSZXN1bHQsXG4gIHR5cGUgV29ya0l0ZW0sXG4gIHR5cGUgV29ya3NwYWNlUG9saWN5LFxufSBmcm9tICdAb2Focy9jb3JlJztcblxuaW1wb3J0IHsgcmVuZGVyVGFibGUsIHR5cGUgQ2VsbCB9IGZyb20gJy4uL2Zvcm1hdC5qcyc7XG5cbi8vIFBoYXNlIDMgY29sbGFib3JhdGlvbiArIGFkdmlzb3IgYm90cyAocm9hZG1hcCBcdTAwQTc1KSBsaXZlIGluIGNvbGxhYi50cy5cbmV4cG9ydCAqIGZyb20gJy4vY29sbGFiLmpzJztcblxuZXhwb3J0IGNvbnN0IEdBVEVTID0gWydzcGVjX2FwcHJvdmFsJywgJ3Jldmlld19hcHByb3ZhbCddIGFzIGNvbnN0O1xuXG5mdW5jdGlvbiBhc3NlcnRHYXRlKGdhdGU6IHN0cmluZyk6IGFzc2VydHMgZ2F0ZSBpcyBHYXRlQ29kZSB7XG4gIGlmICghKEdBVEVTIGFzIHJlYWRvbmx5IHN0cmluZ1tdKS5pbmNsdWRlcyhnYXRlKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihgaW52YWxpZCAtLWdhdGUgXCIke2dhdGV9XCIgKGV4cGVjdGVkICR7R0FURVMuam9pbignIHwgJyl9KWApO1xuICB9XG59XG5cbmNvbnN0IFdPUktfSVRFTV9IRUFERVJTID0gWydpZCcsICdleHRlcm5hbEtleScsICd0aXRsZScsICdzdGF0ZScsICdibG9ja2VkUmVhc29uJ107XG5cbmZ1bmN0aW9uIHdvcmtJdGVtUm93KGl0ZW06IFdvcmtJdGVtKTogQ2VsbFtdIHtcbiAgcmV0dXJuIFtpdGVtLmlkLCBpdGVtLmV4dGVybmFsS2V5LCBpdGVtLnRpdGxlLCBpdGVtLnN0YXRlLCBpdGVtLmJsb2NrZWRSZWFzb25dO1xufVxuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIGluYm94XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGluYm94Q29tbWFuZChjbGllbnQ6IE9haHNDbGllbnQpOiBQcm9taXNlPHN0cmluZz4ge1xuICBjb25zdCB7IGF3YWl0aW5nU3BlYywgYXdhaXRpbmdSZXZpZXcgfSA9IGF3YWl0IGNsaWVudC5jYWxsPHtcbiAgICBhd2FpdGluZ1NwZWM6IFdvcmtJdGVtW107XG4gICAgYXdhaXRpbmdSZXZpZXc6IFdvcmtJdGVtW107XG4gIH0+KCdpbmJveCcpO1xuICByZXR1cm4gW1xuICAgICdhd2FpdGluZyBzcGVjIGFwcHJvdmFsOicsXG4gICAgcmVuZGVyVGFibGUoV09SS19JVEVNX0hFQURFUlMsIGF3YWl0aW5nU3BlYy5tYXAod29ya0l0ZW1Sb3cpKSxcbiAgICAnJyxcbiAgICAnYXdhaXRpbmcgcmV2aWV3IGRlY2lzaW9uOicsXG4gICAgcmVuZGVyVGFibGUoV09SS19JVEVNX0hFQURFUlMsIGF3YWl0aW5nUmV2aWV3Lm1hcCh3b3JrSXRlbVJvdykpLFxuICBdLmpvaW4oJ1xcbicpO1xufVxuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIGFwcHJvdmUgLyByZWplY3Rcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5leHBvcnQgaW50ZXJmYWNlIEFwcHJvdmVPcHRpb25zIHtcbiAgd29ya0l0ZW1JZDogc3RyaW5nO1xuICBnYXRlOiBzdHJpbmc7XG4gIC8qKiBzcGVjX2FwcHJvdmFsIG9ubHk6IHZlcmlmaWNhdGlvbiBjb21tYW5kcyB0byBwaW4gKHJvYWRtYXAgRDcpLiAqL1xuICBwaW4/OiBzdHJpbmdbXTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGFwcHJvdmVDb21tYW5kKGNsaWVudDogT2Foc0NsaWVudCwgb3B0czogQXBwcm92ZU9wdGlvbnMpOiBQcm9taXNlPHN0cmluZz4ge1xuICBhc3NlcnRHYXRlKG9wdHMuZ2F0ZSk7XG4gIGNvbnN0IGl0ZW0gPSBhd2FpdCBjbGllbnQuY2FsbDxXb3JrSXRlbT4oJ2FwcHJvdmVfZ2F0ZScsIHtcbiAgICB3b3JrSXRlbUlkOiBvcHRzLndvcmtJdGVtSWQsXG4gICAgZ2F0ZTogb3B0cy5nYXRlLFxuICAgIC4uLihvcHRzLnBpbiAhPT0gdW5kZWZpbmVkICYmIG9wdHMucGluLmxlbmd0aCA+IDAgPyB7IHBpbm5lZFZlcmlmaWNhdGlvbjogb3B0cy5waW4gfSA6IHt9KSxcbiAgfSk7XG4gIGNvbnN0IGxpbmVzID0gW1xuICAgIGBhcHByb3ZlZCAke29wdHMuZ2F0ZX0gb24gJHtpdGVtLmV4dGVybmFsS2V5fSAoJHtpdGVtLmlkfSlgLFxuICAgIGBzdGF0ZTogJHtpdGVtLnN0YXRlfWAsXG4gIF07XG4gIGlmIChpdGVtLnBpbm5lZFZlcmlmaWNhdGlvbiAhPT0gbnVsbCAmJiBpdGVtLnBpbm5lZFZlcmlmaWNhdGlvbi5sZW5ndGggPiAwKSB7XG4gICAgbGluZXMucHVzaChgcGlubmVkIHZlcmlmaWNhdGlvbjogJHtpdGVtLnBpbm5lZFZlcmlmaWNhdGlvbi5qb2luKCcgJiYgJyl9YCk7XG4gIH1cbiAgcmV0dXJuIGxpbmVzLmpvaW4oJ1xcbicpO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEFkdmFuY2VPcHRpb25zIHtcbiAgd29ya0l0ZW1JZDogc3RyaW5nO1xuICB0bzogc3RyaW5nO1xuICBmZW5jaW5nVG9rZW4/OiBudW1iZXI7XG59XG5cbi8qKlxuICogUGxhbm5pbmctem9uZSBhZHZhbmNlcyBmb3IgaHVtYW5zIChiYWNrbG9nXHUyMTkyZHJhZnQgd2hlbiB0aGUgUE8gc3RhcnRzXG4gKiBkcmFmdGluZywgZHJhZnRcdTIxOTJyZWFkeV9mb3JfZGV2IG9uIG5vbi1jaGVja3BvaW50IGl0ZW1zKS4gRXhlY3V0aW9uLXpvbmVcbiAqIHRyYW5zaXRpb25zIGJlbG9uZyB0byB0aGUgcnVubmVyLCB3aGljaCBob2xkcyB0aGUgY2xhaW0uXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBhZHZhbmNlQ29tbWFuZChjbGllbnQ6IE9haHNDbGllbnQsIG9wdHM6IEFkdmFuY2VPcHRpb25zKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgY29uc3QgaXRlbSA9IGF3YWl0IGNsaWVudC5jYWxsPFdvcmtJdGVtPignYWR2YW5jZV9zdGF0ZScsIHtcbiAgICB3b3JrSXRlbUlkOiBvcHRzLndvcmtJdGVtSWQsXG4gICAgdG86IG9wdHMudG8sXG4gICAgLi4uKG9wdHMuZmVuY2luZ1Rva2VuICE9PSB1bmRlZmluZWQgPyB7IGZlbmNpbmdUb2tlbjogb3B0cy5mZW5jaW5nVG9rZW4gfSA6IHt9KSxcbiAgfSk7XG4gIHJldHVybiBgYWR2YW5jZWQgJHtpdGVtLmV4dGVybmFsS2V5fSAoJHtpdGVtLmlkfSlcXG5zdGF0ZTogJHtpdGVtLnN0YXRlfWA7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUmVqZWN0T3B0aW9ucyB7XG4gIHdvcmtJdGVtSWQ6IHN0cmluZztcbiAgZ2F0ZTogc3RyaW5nO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVqZWN0Q29tbWFuZChjbGllbnQ6IE9haHNDbGllbnQsIG9wdHM6IFJlamVjdE9wdGlvbnMpOiBQcm9taXNlPHN0cmluZz4ge1xuICBhc3NlcnRHYXRlKG9wdHMuZ2F0ZSk7XG4gIGNvbnN0IGl0ZW0gPSBhd2FpdCBjbGllbnQuY2FsbDxXb3JrSXRlbT4oJ3JlamVjdF9nYXRlJywge1xuICAgIHdvcmtJdGVtSWQ6IG9wdHMud29ya0l0ZW1JZCxcbiAgICBnYXRlOiBvcHRzLmdhdGUsXG4gIH0pO1xuICByZXR1cm4gW1xuICAgIGByZWplY3RlZCAke29wdHMuZ2F0ZX0gb24gJHtpdGVtLmV4dGVybmFsS2V5fSAoJHtpdGVtLmlkfSlgLFxuICAgIGBzdGF0ZTogJHtpdGVtLnN0YXRlfWAsXG4gICAgYGJsb2NrZWRSZWFzb246ICR7aXRlbS5ibG9ja2VkUmVhc29uID8/ICctJ31gLFxuICAgIGByZXZpZXdMb29wSXRlcmF0aW9uOiAke2l0ZW0ucmV2aWV3TG9vcEl0ZXJhdGlvbn1gLFxuICBdLmpvaW4oJ1xcbicpO1xufVxuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIHN0YXR1c1xuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBzdGF0dXNDb21tYW5kKGNsaWVudDogT2Foc0NsaWVudCk6IFByb21pc2U8c3RyaW5nPiB7XG4gIGNvbnN0IGl0ZW1zID0gYXdhaXQgY2xpZW50LmNhbGw8V29ya0l0ZW1bXT4oJ2xpc3Rfd29ya19pdGVtcycpO1xuICBjb25zdCByYW5rID0gbmV3IE1hcDxzdHJpbmcsIG51bWJlcj4oV09SS19JVEVNX1NUQVRFUy5tYXAoKHMsIGkpID0+IFtzLCBpXSkpO1xuICBjb25zdCBzb3J0ZWQgPSBbLi4uaXRlbXNdLnNvcnQoXG4gICAgKGEsIGIpID0+XG4gICAgICAocmFuay5nZXQoYS5zdGF0ZSkgPz8gMCkgLSAocmFuay5nZXQoYi5zdGF0ZSkgPz8gMCkgfHxcbiAgICAgIGEuZXh0ZXJuYWxLZXkubG9jYWxlQ29tcGFyZShiLmV4dGVybmFsS2V5KSxcbiAgKTtcbiAgY29uc3QgZmVhdHVyZUlkcyA9IFsuLi5uZXcgU2V0KGl0ZW1zLm1hcCgoaXRlbSkgPT4gaXRlbS5mZWF0dXJlSWQpKV07XG4gIGNvbnN0IGZlYXR1cmVzOiBGZWF0dXJlW10gPSBbXTtcbiAgZm9yIChjb25zdCBmZWF0dXJlSWQgb2YgZmVhdHVyZUlkcykge1xuICAgIGZlYXR1cmVzLnB1c2goYXdhaXQgY2xpZW50LmNhbGw8RmVhdHVyZT4oJ2dldF9mZWF0dXJlJywgeyBmZWF0dXJlSWQgfSkpO1xuICB9XG4gIHJldHVybiBbXG4gICAgJ3dvcmsgaXRlbXM6JyxcbiAgICByZW5kZXJUYWJsZShcbiAgICAgIFsnc3RhdGUnLCAnaWQnLCAnZXh0ZXJuYWxLZXknLCAndGl0bGUnLCAnYmxvY2tlZFJlYXNvbiddLFxuICAgICAgc29ydGVkLm1hcCgoaXRlbSkgPT4gW2l0ZW0uc3RhdGUsIGl0ZW0uaWQsIGl0ZW0uZXh0ZXJuYWxLZXksIGl0ZW0udGl0bGUsIGl0ZW0uYmxvY2tlZFJlYXNvbl0pLFxuICAgICksXG4gICAgJycsXG4gICAgJ2ZlYXR1cmVzOicsXG4gICAgcmVuZGVyVGFibGUoXG4gICAgICBbJ2lkJywgJ3N0YXRlJywgJ2Rpc3BhdGNoSG9sZCddLFxuICAgICAgZmVhdHVyZXMubWFwKChmZWF0dXJlKSA9PiBbZmVhdHVyZS5pZCwgZmVhdHVyZS5zdGF0ZSwgZmVhdHVyZS5kaXNwYXRjaEhvbGRdKSxcbiAgICApLFxuICBdLmpvaW4oJ1xcbicpO1xufVxuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIGFjdG9yIC8gZ3JhbnRcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5leHBvcnQgaW50ZXJmYWNlIEFjdG9yQ3JlYXRlT3B0aW9ucyB7XG4gIHR5cGU6IHN0cmluZztcbiAgbmFtZTogc3RyaW5nO1xuICAvKiogUGhhc2UgMiAocm9hZG1hcCBcdTAwQTczKTogaW5pdGlhbCBnb3Zlcm5hbmNlIHJvbGUgXHUyMDE0IGFkbWluIGNvbnRleHQgb25seS4gKi9cbiAgZ292ZXJuYW5jZVJvbGU/OiBzdHJpbmc7XG59XG5cbmNvbnN0IEdPVkVSTkFOQ0VfUk9MRVMgPSBbJ2FkbWluJywgJ21lbWJlcicsICdhdWRpdG9yJ10gYXMgY29uc3Q7XG5cbmZ1bmN0aW9uIGFzc2VydEdvdmVybmFuY2VSb2xlKHJvbGU6IHN0cmluZyk6IGFzc2VydHMgcm9sZSBpcyBHb3Zlcm5hbmNlUm9sZSB7XG4gIGlmICghKEdPVkVSTkFOQ0VfUk9MRVMgYXMgcmVhZG9ubHkgc3RyaW5nW10pLmluY2x1ZGVzKHJvbGUpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBpbnZhbGlkIGdvdmVybmFuY2Ugcm9sZSBcIiR7cm9sZX1cIiAoZXhwZWN0ZWQgJHtHT1ZFUk5BTkNFX1JPTEVTLmpvaW4oJyB8ICcpfSlgKTtcbiAgfVxufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gYWN0b3JDcmVhdGVDb21tYW5kKFxuICBjbGllbnQ6IE9haHNDbGllbnQsXG4gIG9wdHM6IEFjdG9yQ3JlYXRlT3B0aW9ucyxcbik6IFByb21pc2U8c3RyaW5nPiB7XG4gIGlmIChvcHRzLnR5cGUgIT09ICd1c2VyJyAmJiBvcHRzLnR5cGUgIT09ICdhZ2VudCcpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYGludmFsaWQgLS10eXBlIFwiJHtvcHRzLnR5cGV9XCIgKGV4cGVjdGVkIHVzZXIgfCBhZ2VudClgKTtcbiAgfVxuICBpZiAob3B0cy5nb3Zlcm5hbmNlUm9sZSAhPT0gdW5kZWZpbmVkKSBhc3NlcnRHb3Zlcm5hbmNlUm9sZShvcHRzLmdvdmVybmFuY2VSb2xlKTtcbiAgY29uc3QgY3JlYXRlZCA9IGF3YWl0IGNsaWVudC5jYWxsPHsgYWN0b3I6IEFjdG9yOyB0b2tlbjogc3RyaW5nIH0+KCdjcmVhdGVfYWN0b3InLCB7XG4gICAgdHlwZTogb3B0cy50eXBlLFxuICAgIGRpc3BsYXlOYW1lOiBvcHRzLm5hbWUsXG4gICAgLi4uKG9wdHMuZ292ZXJuYW5jZVJvbGUgIT09IHVuZGVmaW5lZCA/IHsgZ292ZXJuYW5jZVJvbGU6IG9wdHMuZ292ZXJuYW5jZVJvbGUgfSA6IHt9KSxcbiAgfSk7XG4gIHJldHVybiBbXG4gICAgYGFjdG9ySWQ6ICR7Y3JlYXRlZC5hY3Rvci5pZH1gLFxuICAgIGB0eXBlOiAke2NyZWF0ZWQuYWN0b3IudHlwZX1gLFxuICAgIGBkaXNwbGF5TmFtZTogJHtjcmVhdGVkLmFjdG9yLmRpc3BsYXlOYW1lfWAsXG4gICAgYHRva2VuOiAke2NyZWF0ZWQudG9rZW59YCxcbiAgXS5qb2luKCdcXG4nKTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBHcmFudE9wdGlvbnMge1xuICBhY3RvcklkOiBzdHJpbmc7XG4gIHBlcm1pc3Npb246IHN0cmluZztcbiAgc2NvcGU/OiBzdHJpbmc7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBncmFudENvbW1hbmQoY2xpZW50OiBPYWhzQ2xpZW50LCBvcHRzOiBHcmFudE9wdGlvbnMpOiBQcm9taXNlPHN0cmluZz4ge1xuICBhd2FpdCBjbGllbnQuY2FsbCgnZ3JhbnRfcGVybWlzc2lvbicsIHtcbiAgICBhY3RvcklkOiBvcHRzLmFjdG9ySWQsXG4gICAgcGVybWlzc2lvbjogb3B0cy5wZXJtaXNzaW9uLFxuICAgIC4uLihvcHRzLnNjb3BlICE9PSB1bmRlZmluZWQgPyB7IHNjb3BlOiBvcHRzLnNjb3BlIH0gOiB7fSksXG4gIH0pO1xuICByZXR1cm4gYGdyYW50ZWQgJHtvcHRzLnBlcm1pc3Npb259IHRvICR7b3B0cy5hY3RvcklkfWA7XG59XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gZmVhdHVyZSAvIGltcG9ydFxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBmZWF0dXJlQ3JlYXRlQ29tbWFuZChjbGllbnQ6IE9haHNDbGllbnQpOiBQcm9taXNlPHN0cmluZz4ge1xuICBjb25zdCBmZWF0dXJlID0gYXdhaXQgY2xpZW50LmNhbGw8RmVhdHVyZT4oJ2NyZWF0ZV9mZWF0dXJlJyk7XG4gIHJldHVybiBbYGZlYXR1cmVJZDogJHtmZWF0dXJlLmlkfWAsIGBzdGF0ZTogJHtmZWF0dXJlLnN0YXRlfWBdLmpvaW4oJ1xcbicpO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEltcG9ydFN0b3JpZXNPcHRpb25zIHtcbiAgZmVhdHVyZUlkOiBzdHJpbmc7XG4gIHBhdGg6IHN0cmluZztcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGltcG9ydFN0b3JpZXNDb21tYW5kKFxuICBjbGllbnQ6IE9haHNDbGllbnQsXG4gIG9wdHM6IEltcG9ydFN0b3JpZXNPcHRpb25zLFxuKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgY29uc3QgeWFtbCA9IHJlYWRGaWxlU3luYyhyZXNvbHZlKG9wdHMucGF0aCksICd1dGY4Jyk7XG4gIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGNsaWVudC5jYWxsPFN0b3JpZXNJbXBvcnRSZXN1bHQ+KCdpbXBvcnRfc3RvcmllcycsIHtcbiAgICBmZWF0dXJlSWQ6IG9wdHMuZmVhdHVyZUlkLFxuICAgIHlhbWwsXG4gIH0pO1xuICBjb25zdCBsaXN0ID0gKHZhbHVlczogc3RyaW5nW10pOiBzdHJpbmcgPT4gKHZhbHVlcy5sZW5ndGggPiAwID8gdmFsdWVzLmpvaW4oJywgJykgOiAnKG5vbmUpJyk7XG4gIHJldHVybiBbXG4gICAgYGltcG9ydGVkOiAke2xpc3QocmVzdWx0LmltcG9ydGVkKX1gLFxuICAgIGB1cGRhdGVkOiAke2xpc3QocmVzdWx0LnVwZGF0ZWQpfWAsXG4gICAgYHdhcm5pbmdzOiAke2xpc3QocmVzdWx0Lndhcm5pbmdzKX1gLFxuICBdLmpvaW4oJ1xcbicpO1xufVxuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIGV2ZW50c1xuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbmV4cG9ydCBpbnRlcmZhY2UgRXZlbnRzT3B0aW9ucyB7XG4gIHN0cmVhbUlkPzogc3RyaW5nO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZXZlbnRzQ29tbWFuZChcbiAgY2xpZW50OiBPYWhzQ2xpZW50LFxuICBvcHRzOiBFdmVudHNPcHRpb25zID0ge30sXG4pOiBQcm9taXNlPHN0cmluZz4ge1xuICBjb25zdCBldmVudHMgPSBhd2FpdCBjbGllbnQuY2FsbDxTcGluZUV2ZW50W10+KFxuICAgICdxdWVyeV9ldmVudHMnLFxuICAgIG9wdHMuc3RyZWFtSWQgIT09IHVuZGVmaW5lZCA/IHsgc3RyZWFtSWQ6IG9wdHMuc3RyZWFtSWQgfSA6IHt9LFxuICApO1xuICByZXR1cm4gcmVuZGVyVGFibGUoXG4gICAgWydzZXEnLCAndHlwZScsICdzdHJlYW0nLCAnYWN0b3InXSxcbiAgICBldmVudHMubWFwKChldmVudCkgPT4gW1xuICAgICAgZXZlbnQuZ2xvYmFsU2VxLFxuICAgICAgZXZlbnQudHlwZSxcbiAgICAgIGAke2V2ZW50LnN0cmVhbVR5cGV9LyR7ZXZlbnQuc3RyZWFtSWR9IyR7ZXZlbnQuc3RyZWFtU2VxfWAsXG4gICAgICBldmVudC5hY3RvcklkLFxuICAgIF0pLFxuICApO1xufVxuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIGVudGl0bGVtZW50cyAoUGhhc2UgMiwgcm9hZG1hcCBcdTAwQTczKSBcdTIwMTQgcm9sZSAvIHBsYW4gLyBwb2xpY3kgLyBnb3Zlcm5hbmNlIC8gYXV0aHpcbi8vIEF1dGhvcml0eSBmb3IgdGhlc2Ugd3JpdGVzIGlzIGRlY2lkZWQgYnkgdGhlIEVOR0lORSBmcm9tIHRoZSBjYWxsZXInc1xuLy8gZ292ZXJuYW5jZSByb2xlOyB0aGUgQ0xJIG9ubHkgdmFsaWRhdGVzIHNoYXBlcyBsb2NhbGx5LlxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbmV4cG9ydCBpbnRlcmZhY2UgUm9sZU9wdGlvbnMge1xuICBhY3RvcklkOiBzdHJpbmc7XG4gIHJvbGVDb2RlOiBzdHJpbmc7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByb2xlQXNzaWduQ29tbWFuZChjbGllbnQ6IE9haHNDbGllbnQsIG9wdHM6IFJvbGVPcHRpb25zKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgYXdhaXQgY2xpZW50LmNhbGwoJ2Fzc2lnbl9yb2xlJywgeyBhY3RvcklkOiBvcHRzLmFjdG9ySWQsIHJvbGVDb2RlOiBvcHRzLnJvbGVDb2RlIH0pO1xuICByZXR1cm4gYGFzc2lnbmVkIHJvbGUgJHtvcHRzLnJvbGVDb2RlfSB0byAke29wdHMuYWN0b3JJZH1gO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcm9sZVJldm9rZUNvbW1hbmQoY2xpZW50OiBPYWhzQ2xpZW50LCBvcHRzOiBSb2xlT3B0aW9ucyk6IFByb21pc2U8c3RyaW5nPiB7XG4gIGF3YWl0IGNsaWVudC5jYWxsKCdyZXZva2Vfcm9sZScsIHsgYWN0b3JJZDogb3B0cy5hY3RvcklkLCByb2xlQ29kZTogb3B0cy5yb2xlQ29kZSB9KTtcbiAgcmV0dXJuIGByZXZva2VkIHJvbGUgJHtvcHRzLnJvbGVDb2RlfSBmcm9tICR7b3B0cy5hY3RvcklkfWA7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUm9sZUxpc3RPcHRpb25zIHtcbiAgYWN0b3JJZD86IHN0cmluZztcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJvbGVMaXN0Q29tbWFuZChcbiAgY2xpZW50OiBPYWhzQ2xpZW50LFxuICBvcHRzOiBSb2xlTGlzdE9wdGlvbnMgPSB7fSxcbik6IFByb21pc2U8c3RyaW5nPiB7XG4gIGNvbnN0IGFzc2lnbm1lbnRzID0gYXdhaXQgY2xpZW50LmNhbGw8Um9sZUFzc2lnbm1lbnRbXT4oXG4gICAgJ2xpc3Rfcm9sZV9hc3NpZ25tZW50cycsXG4gICAgb3B0cy5hY3RvcklkICE9PSB1bmRlZmluZWQgPyB7IGFjdG9ySWQ6IG9wdHMuYWN0b3JJZCB9IDoge30sXG4gICk7XG4gIHJldHVybiByZW5kZXJUYWJsZShcbiAgICBbJ2FjdG9ySWQnLCAncm9sZUNvZGUnLCAnZ3JhbnRlZEJ5JywgJ3Jldm9rZWQnXSxcbiAgICBhc3NpZ25tZW50cy5tYXAoKGEpID0+IFthLmFjdG9ySWQsIGEucm9sZUNvZGUsIGEuZ3JhbnRlZEJ5LCBhLnJldm9rZWRdKSxcbiAgKTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBQbGFuU2V0T3B0aW9ucyB7XG4gIHBsYW46IHN0cmluZztcbn1cblxuY29uc3QgUExBTlMgPSBbJ2ZyZWUnLCAndGVhbScsICdlbnRlcnByaXNlJ10gYXMgY29uc3Q7XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBwbGFuU2V0Q29tbWFuZChjbGllbnQ6IE9haHNDbGllbnQsIG9wdHM6IFBsYW5TZXRPcHRpb25zKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgaWYgKCEoUExBTlMgYXMgcmVhZG9ubHkgc3RyaW5nW10pLmluY2x1ZGVzKG9wdHMucGxhbikpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYGludmFsaWQgcGxhbiBcIiR7b3B0cy5wbGFufVwiIChleHBlY3RlZCAke1BMQU5TLmpvaW4oJyB8ICcpfSlgKTtcbiAgfVxuICBjb25zdCByZXN1bHQgPSBhd2FpdCBjbGllbnQuY2FsbDx7IHBsYW46IFBsYW5Db2RlIH0+KCdzZXRfcGxhbicsIHsgcGxhbjogb3B0cy5wbGFuIH0pO1xuICByZXR1cm4gYHBsYW4gc2V0OiAke3Jlc3VsdC5wbGFufSAoYSBjZWlsaW5nIGZvciBhZ2VudCBncmFudHMgXHUyMDE0IG5ldmVyIGEgZ3JhbnQgaXRzZWxmKWA7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUG9saWN5U2V0T3B0aW9ucyB7XG4gIC8qKiAndHJ1ZScgfCAnZmFsc2UnIFx1MjAxNCByZXN0cmljdC1vbmx5IGtleSAocm9hZG1hcCBcdTAwQTczKS4gKi9cbiAgYWdlbnRHYXRlQXBwcm92YWxzPzogc3RyaW5nO1xuICAvKiogJ3RydWUnIHwgJ2ZhbHNlJyBcdTIwMTQgcmVzdHJpY3Qtb25seSBrZXkgKHJvYWRtYXAgXHUwMEE3MykuICovXG4gIGFnZW50U2VsZkRpc3BhdGNoPzogc3RyaW5nO1xufVxuXG5mdW5jdGlvbiBwYXJzZUJvb2xGbGFnKGZsYWc6IHN0cmluZywgdmFsdWU6IHN0cmluZyk6IGJvb2xlYW4ge1xuICBpZiAodmFsdWUgPT09ICd0cnVlJykgcmV0dXJuIHRydWU7XG4gIGlmICh2YWx1ZSA9PT0gJ2ZhbHNlJykgcmV0dXJuIGZhbHNlO1xuICB0aHJvdyBuZXcgRXJyb3IoYGludmFsaWQgJHtmbGFnfSBcIiR7dmFsdWV9XCIgKGV4cGVjdGVkIHRydWUgfCBmYWxzZSlgKTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHBvbGljeVNldENvbW1hbmQoY2xpZW50OiBPYWhzQ2xpZW50LCBvcHRzOiBQb2xpY3lTZXRPcHRpb25zKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgY29uc3QgcG9saWN5OiBXb3Jrc3BhY2VQb2xpY3kgPSB7XG4gICAgLi4uKG9wdHMuYWdlbnRHYXRlQXBwcm92YWxzICE9PSB1bmRlZmluZWRcbiAgICAgID8geyBhZ2VudEdhdGVBcHByb3ZhbHM6IHBhcnNlQm9vbEZsYWcoJy0tYWdlbnQtZ2F0ZS1hcHByb3ZhbHMnLCBvcHRzLmFnZW50R2F0ZUFwcHJvdmFscykgfVxuICAgICAgOiB7fSksXG4gICAgLi4uKG9wdHMuYWdlbnRTZWxmRGlzcGF0Y2ggIT09IHVuZGVmaW5lZFxuICAgICAgPyB7IGFnZW50U2VsZkRpc3BhdGNoOiBwYXJzZUJvb2xGbGFnKCctLWFnZW50LXNlbGYtZGlzcGF0Y2gnLCBvcHRzLmFnZW50U2VsZkRpc3BhdGNoKSB9XG4gICAgICA6IHt9KSxcbiAgfTtcbiAgaWYgKE9iamVjdC5rZXlzKHBvbGljeSkubGVuZ3RoID09PSAwKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdub3RoaW5nIHRvIHNldDogcGFzcyAtLWFnZW50LWdhdGUtYXBwcm92YWxzIGFuZC9vciAtLWFnZW50LXNlbGYtZGlzcGF0Y2gnKTtcbiAgfVxuICBjb25zdCBlZmZlY3RpdmUgPSBhd2FpdCBjbGllbnQuY2FsbDxXb3Jrc3BhY2VQb2xpY3k+KCdzZXRfd29ya3NwYWNlX3BvbGljeScsIHsgcG9saWN5IH0pO1xuICByZXR1cm4gW1xuICAgICd3b3Jrc3BhY2UgcG9saWN5IChyZXN0cmljdC1vbmx5IFx1MjAxNCBuYXJyb3dzIHRoZSBwbGFuLCBuZXZlciB3aWRlbnMgaXQpOicsXG4gICAgYCAgYWdlbnRHYXRlQXBwcm92YWxzOiAke2VmZmVjdGl2ZS5hZ2VudEdhdGVBcHByb3ZhbHMgPz8gJyh1bnNldCknfWAsXG4gICAgYCAgYWdlbnRTZWxmRGlzcGF0Y2g6ICR7ZWZmZWN0aXZlLmFnZW50U2VsZkRpc3BhdGNoID8/ICcodW5zZXQpJ31gLFxuICBdLmpvaW4oJ1xcbicpO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEdhdGVQb2xpY3lTZXRPcHRpb25zIHtcbiAgZ2F0ZTogc3RyaW5nO1xuICBtaW5BcHByb3ZhbHM/OiBzdHJpbmc7XG4gIHJlcXVpcmVUeXBlcz86IHN0cmluZ1tdO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZ2F0ZVBvbGljeVNldENvbW1hbmQoXG4gIGNsaWVudDogT2Foc0NsaWVudCxcbiAgb3B0czogR2F0ZVBvbGljeVNldE9wdGlvbnMsXG4pOiBQcm9taXNlPHN0cmluZz4ge1xuICBhc3NlcnRHYXRlKG9wdHMuZ2F0ZSk7XG4gIGNvbnN0IG1pbkFwcHJvdmFscyA9IG9wdHMubWluQXBwcm92YWxzICE9PSB1bmRlZmluZWQgPyBOdW1iZXIob3B0cy5taW5BcHByb3ZhbHMpIDogdW5kZWZpbmVkO1xuICBpZiAobWluQXBwcm92YWxzICE9PSB1bmRlZmluZWQgJiYgKCFOdW1iZXIuaXNJbnRlZ2VyKG1pbkFwcHJvdmFscykgfHwgbWluQXBwcm92YWxzIDwgMSkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYGludmFsaWQgLS1taW4tYXBwcm92YWxzIFwiJHtvcHRzLm1pbkFwcHJvdmFsc31cIiAoZXhwZWN0ZWQgYSBwb3NpdGl2ZSBpbnRlZ2VyKWApO1xuICB9XG4gIGNvbnN0IHJlcXVpcmVUeXBlcyA9IG9wdHMucmVxdWlyZVR5cGVzID8/IFtdO1xuICBmb3IgKGNvbnN0IHR5cGUgb2YgcmVxdWlyZVR5cGVzKSB7XG4gICAgaWYgKHR5cGUgIT09ICd1c2VyJyAmJiB0eXBlICE9PSAnYWdlbnQnICYmIHR5cGUgIT09ICdzeXN0ZW0nKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYGludmFsaWQgLS1yZXF1aXJlLXR5cGUgXCIke3R5cGV9XCIgKGV4cGVjdGVkIHVzZXIgfCBhZ2VudCB8IHN5c3RlbSlgKTtcbiAgICB9XG4gIH1cbiAgaWYgKG1pbkFwcHJvdmFscyA9PT0gdW5kZWZpbmVkICYmIHJlcXVpcmVUeXBlcy5sZW5ndGggPT09IDApIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ25vdGhpbmcgdG8gc2V0OiBwYXNzIC0tbWluLWFwcHJvdmFscyBhbmQvb3IgLS1yZXF1aXJlLXR5cGUnKTtcbiAgfVxuICBjb25zdCByZXN1bHQgPSBhd2FpdCBjbGllbnQuY2FsbDx7XG4gICAgZ2F0ZTogR2F0ZUNvZGU7XG4gICAgcG9saWN5OiB7IG1pbkFwcHJvdmFscz86IG51bWJlcjsgcmVxdWlyZWRBY3RvclR5cGVzPzogc3RyaW5nW10gfTtcbiAgfT4oJ3NldF9nYXRlX3BvbGljeScsIHtcbiAgICBnYXRlOiBvcHRzLmdhdGUsXG4gICAgcG9saWN5OiB7XG4gICAgICAuLi4obWluQXBwcm92YWxzICE9PSB1bmRlZmluZWQgPyB7IG1pbkFwcHJvdmFscyB9IDoge30pLFxuICAgICAgLi4uKHJlcXVpcmVUeXBlcy5sZW5ndGggPiAwID8geyByZXF1aXJlZEFjdG9yVHlwZXM6IHJlcXVpcmVUeXBlcyB9IDoge30pLFxuICAgIH0sXG4gIH0pO1xuICByZXR1cm4gW1xuICAgIGBnYXRlIHBvbGljeSBzZXQgb24gJHtyZXN1bHQuZ2F0ZX0gKGdhdGUgZGVmaW5pdGlvbnMgYXJlIGRhdGEsIHJvYWRtYXAgXHUwMEE3Myk6YCxcbiAgICBgICBtaW5BcHByb3ZhbHM6ICR7cmVzdWx0LnBvbGljeS5taW5BcHByb3ZhbHMgPz8gMX1gLFxuICAgIGAgIHJlcXVpcmVkQWN0b3JUeXBlczogJHtcbiAgICAgIHJlc3VsdC5wb2xpY3kucmVxdWlyZWRBY3RvclR5cGVzICE9PSB1bmRlZmluZWQgJiYgcmVzdWx0LnBvbGljeS5yZXF1aXJlZEFjdG9yVHlwZXMubGVuZ3RoID4gMFxuICAgICAgICA/IHJlc3VsdC5wb2xpY3kucmVxdWlyZWRBY3RvclR5cGVzLmpvaW4oJywgJylcbiAgICAgICAgOiAnKG5vbmUpJ1xuICAgIH1gLFxuICBdLmpvaW4oJ1xcbicpO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEdvdmVybmFuY2VTZXRPcHRpb25zIHtcbiAgYWN0b3JJZDogc3RyaW5nO1xuICByb2xlOiBzdHJpbmc7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnb3Zlcm5hbmNlU2V0Q29tbWFuZChcbiAgY2xpZW50OiBPYWhzQ2xpZW50LFxuICBvcHRzOiBHb3Zlcm5hbmNlU2V0T3B0aW9ucyxcbik6IFByb21pc2U8c3RyaW5nPiB7XG4gIGFzc2VydEdvdmVybmFuY2VSb2xlKG9wdHMucm9sZSk7XG4gIGF3YWl0IGNsaWVudC5jYWxsKCdzZXRfZ292ZXJuYW5jZV9yb2xlJywgeyBhY3RvcklkOiBvcHRzLmFjdG9ySWQsIHJvbGU6IG9wdHMucm9sZSB9KTtcbiAgcmV0dXJuIGBnb3Zlcm5hbmNlIHJvbGUgb2YgJHtvcHRzLmFjdG9ySWR9IHNldCB0byAke29wdHMucm9sZX1gO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEF1dGh6T3B0aW9ucyB7XG4gIGFjdG9ySWQ6IHN0cmluZztcbiAgcGVybWlzc2lvbjogc3RyaW5nO1xufVxuXG4vKiogSHVtYW4tcmVhZGFibGUgcmVuZGVyaW5nIG9mIHRoZSByZXBsYXlhYmxlIGF1dGh6X2V4cGxhaW4gdHJhY2UgKHJvYWRtYXAgXHUwMEE3MykuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gYXV0aHpDb21tYW5kKGNsaWVudDogT2Foc0NsaWVudCwgb3B0czogQXV0aHpPcHRpb25zKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgY29uc3QgZXhwbGFuYXRpb24gPSBhd2FpdCBjbGllbnQuY2FsbDxBdXRoekV4cGxhbmF0aW9uPignYXV0aHpfZXhwbGFpbicsIHtcbiAgICBhY3RvcklkOiBvcHRzLmFjdG9ySWQsXG4gICAgcGVybWlzc2lvbjogb3B0cy5wZXJtaXNzaW9uLFxuICB9KTtcbiAgcmV0dXJuIFtcbiAgICBgYXV0aHogJHtleHBsYW5hdGlvbi5wZXJtaXNzaW9ufSBmb3IgJHtleHBsYW5hdGlvbi5hY3RvcklkfTogJHtcbiAgICAgIGV4cGxhbmF0aW9uLmFsbG93ZWQgPyAnQUxMT1dFRCcgOiAnREVOSUVEJ1xuICAgIH1gLFxuICAgIGAgIHNvdXJjZTogJHtleHBsYW5hdGlvbi5zb3VyY2UgPz8gJyhubyBncmFudCBcdTIwMTQgZGlyZWN0IG9yIHZpYSByb2xlKSd9YCxcbiAgICBgICBnb3Zlcm5hbmNlUm9sZTogJHtleHBsYW5hdGlvbi5nb3Zlcm5hbmNlUm9sZX1gLFxuICAgIGAgIHBsYW46ICR7ZXhwbGFuYXRpb24ucGxhbn0gKHBsYW5BbGxvd3M6ICR7ZXhwbGFuYXRpb24ucGxhbkFsbG93c30pYCxcbiAgICBgICBwb2xpY3lBbGxvd3M6ICR7ZXhwbGFuYXRpb24ucG9saWN5QWxsb3dzfWAsXG4gICAgYCAgdmVyc2lvbnM6IHBsYW4gdiR7ZXhwbGFuYXRpb24udmVyc2lvbnMucGxhbn0sIHBvbGljeSB2JHtleHBsYW5hdGlvbi52ZXJzaW9ucy5wb2xpY3l9YCxcbiAgXS5qb2luKCdcXG4nKTtcbn1cblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBvdXRwdXQgaGFybmVzcyAoc2hhcmVkIGJ5IGNsaS50cyBhbmQgdGhlIHRlc3RzKVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbmV4cG9ydCBpbnRlcmZhY2UgQ29tbWFuZE91dHB1dCB7XG4gIHRleHQ6IHN0cmluZztcbiAgZXhpdENvZGU6IG51bWJlcjtcbn1cblxuLyoqXG4gKiBSdW4gb25lIGNvbW1hbmQgZnVuY3Rpb24gdG8gYSBwcmludGFibGUgb3V0Y29tZTogc3VjY2VzcyBcdTIxOTIgaXRzIHRleHQgd2l0aFxuICogZXhpdCAwOyBmYWlsdXJlIFx1MjE5MiBgPGVycm9yLm5hbWU+OiA8bWVzc2FnZT5gIChPYWhzUmVtb3RlRXJyb3IgY2FycmllcyB0aGVcbiAqIHdpcmUgZXJyb3IgY2xhc3MgbmFtZSkgd2l0aCBleGl0IDEuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBydW5Ub091dHB1dChmbjogKCkgPT4gUHJvbWlzZTxzdHJpbmc+KTogUHJvbWlzZTxDb21tYW5kT3V0cHV0PiB7XG4gIHRyeSB7XG4gICAgcmV0dXJuIHsgdGV4dDogYXdhaXQgZm4oKSwgZXhpdENvZGU6IDAgfTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBpZiAoZXJyb3IgaW5zdGFuY2VvZiBFcnJvcikge1xuICAgICAgcmV0dXJuIHsgdGV4dDogYCR7ZXJyb3IubmFtZX06ICR7ZXJyb3IubWVzc2FnZX1gLCBleGl0Q29kZTogMSB9O1xuICAgIH1cbiAgICByZXR1cm4geyB0ZXh0OiBTdHJpbmcoZXJyb3IpLCBleGl0Q29kZTogMSB9O1xuICB9XG59XG4iLCAiLyoqXG4gKiBQbGFpbi10ZXh0IHRhYmxlIHJlbmRlcmluZyBcdTIwMTQgZGVsaWJlcmF0ZWx5IGRlcGVuZGVuY3ktZnJlZSAoc3RvcnkgMTM6XG4gKiBcImJcdTFFQTNuZyB0ZXh0IFx1MDExMVx1MDFBMW4gZ2lcdTFFQTNuLCBraFx1MDBGNG5nIGRlcCBiXHUxRUEzbmcgbmdvXHUwMEUwaVwiKS4gTW9ub3NwYWNlIGNvbHVtbnMgcGFkZGVkIHRvXG4gKiB0aGUgd2lkZXN0IGNlbGw7IGFuIGVtcHR5IHJvdyBzZXQgcmVuZGVycyBhcyBcIihlbXB0eSlcIi5cbiAqL1xuXG5leHBvcnQgdHlwZSBDZWxsID0gc3RyaW5nIHwgbnVtYmVyIHwgYm9vbGVhbiB8IG51bGwgfCB1bmRlZmluZWQ7XG5cbmZ1bmN0aW9uIHRvVGV4dChjZWxsOiBDZWxsKTogc3RyaW5nIHtcbiAgaWYgKGNlbGwgPT09IG51bGwgfHwgY2VsbCA9PT0gdW5kZWZpbmVkKSByZXR1cm4gJy0nO1xuICByZXR1cm4gU3RyaW5nKGNlbGwpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVuZGVyVGFibGUoaGVhZGVyczogc3RyaW5nW10sIHJvd3M6IENlbGxbXVtdKTogc3RyaW5nIHtcbiAgaWYgKHJvd3MubGVuZ3RoID09PSAwKSByZXR1cm4gJyhlbXB0eSknO1xuICBjb25zdCB0ZXh0Um93cyA9IHJvd3MubWFwKChyb3cpID0+IHJvdy5tYXAodG9UZXh0KSk7XG4gIGNvbnN0IHdpZHRocyA9IGhlYWRlcnMubWFwKChoZWFkZXIsIGNvbCkgPT5cbiAgICBNYXRoLm1heChoZWFkZXIubGVuZ3RoLCAuLi50ZXh0Um93cy5tYXAoKHJvdykgPT4gKHJvd1tjb2xdID8/ICcnKS5sZW5ndGgpKSxcbiAgKTtcbiAgY29uc3QgbGluZSA9IChjZWxsczogc3RyaW5nW10pOiBzdHJpbmcgPT5cbiAgICBjZWxscy5tYXAoKGNlbGwsIGNvbCkgPT4gY2VsbC5wYWRFbmQod2lkdGhzW2NvbF0gPz8gY2VsbC5sZW5ndGgpKS5qb2luKCcgICcpLnRyaW1FbmQoKTtcbiAgY29uc3Qgc2VwYXJhdG9yID0gd2lkdGhzLm1hcCgodykgPT4gJy0nLnJlcGVhdCh3KSkuam9pbignICAnKTtcbiAgcmV0dXJuIFtsaW5lKGhlYWRlcnMpLCBzZXBhcmF0b3IsIC4uLnRleHRSb3dzLm1hcChsaW5lKV0uam9pbignXFxuJyk7XG59XG4iLCAiLyoqXG4gKiBQaGFzZSAzIGNvbGxhYm9yYXRpb24gY29tbWFuZHMgKHJvYWRtYXAgXHUwMEE3NSkgKyB0aGUgYWR2aXNvciBib3RzIFx1MjAxNCBwdXJlXG4gKiBmdW5jdGlvbnMgb3ZlciB0aGUgdHlwZWQgY29udHJhY3RzIGNsaWVudCwgc2FtZSBzaGFwZSBhcyBjb21tYW5kcy9pbmRleC50cy5cbiAqXG4gKiBUaGUgYWR2aXNvciBib3RzIGFyZSB0aGUgXCJhZ2VudGlmeSBXSVRIT1VUIHRvdWNoaW5nIHRoZSBzcGluZVwiIHBhdHRlcm5cbiAqICh0aGVzaXMgXHUwMEE3NSk6IGRldGVybWluaXN0aWMgcmVhZCArIHBvc3QsIE5PIExMTSwgTk8gbGlmZWN5Y2xlIG11dGF0aW9uLlxuICogVGhleSBydW4gdW5kZXIgd2hhdGV2ZXIgdG9rZW4gdGhlIGNhbGxlciBob2xkcyBhbmQgb25seSBuZWVkIHRoZSByaWdodCB0b1xuICogcG9zdCBpbnRvIGFuIG9wZW4gdGhyZWFkIFx1MjAxNCB0aGUgYXVkaXQgdHJhaWwgc2hvd3MgemVybyBnYXRlcywgemVyb1xuICogdHJhbnNpdGlvbnMgZnJvbSB0aGVtLlxuICovXG5pbXBvcnQgdHlwZSB7IE9haHNDbGllbnQgfSBmcm9tICdAb2Focy9jb250cmFjdHMnO1xuaW1wb3J0IHR5cGUge1xuICBBZ2VudEpvYixcbiAgRGl2ZXJnZW5jZVJlcG9ydCxcbiAgTWVzc2FnZSxcbiAgTWVudGlvbixcbiAgTm90aWZpY2F0aW9uLFxuICBUaHJlYWQsXG4gIFRocmVhZEtpbmQsXG4gIFRocmVhZFZpc2liaWxpdHksXG4gIFdvcmtJdGVtLFxufSBmcm9tICdAb2Focy9jb3JlJztcblxuaW1wb3J0IHsgcmVuZGVyVGFibGUgfSBmcm9tICcuLi9mb3JtYXQuanMnO1xuXG5jb25zdCBUSFJFQURfS0lORFMgPSBbJ3NwZWMnLCAnZGVzaWduJywgJ3Rhc2snLCAnZ2VuZXJhbCcsICdwcml2YXRlJ10gYXMgY29uc3Q7XG5jb25zdCBWSVNJQklMSVRJRVMgPSBbJ29wZW4nLCAncHJpdmF0ZSddIGFzIGNvbnN0O1xuY29uc3QgSk9CX1NUQVRVU0VTID0gWydxdWV1ZWQnLCAnZG9uZScsICdibG9ja2VkJ10gYXMgY29uc3Q7XG5cbmZ1bmN0aW9uIGFzc2VydFRocmVhZEtpbmQoa2luZDogc3RyaW5nKTogYXNzZXJ0cyBraW5kIGlzIFRocmVhZEtpbmQge1xuICBpZiAoIShUSFJFQURfS0lORFMgYXMgcmVhZG9ubHkgc3RyaW5nW10pLmluY2x1ZGVzKGtpbmQpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBpbnZhbGlkIC0ta2luZCBcIiR7a2luZH1cIiAoZXhwZWN0ZWQgJHtUSFJFQURfS0lORFMuam9pbignIHwgJyl9KWApO1xuICB9XG59XG5cbmZ1bmN0aW9uIGFzc2VydFZpc2liaWxpdHkodmlzaWJpbGl0eTogc3RyaW5nKTogYXNzZXJ0cyB2aXNpYmlsaXR5IGlzIFRocmVhZFZpc2liaWxpdHkge1xuICBpZiAoIShWSVNJQklMSVRJRVMgYXMgcmVhZG9ubHkgc3RyaW5nW10pLmluY2x1ZGVzKHZpc2liaWxpdHkpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBpbnZhbGlkIC0tdmlzaWJpbGl0eSBcIiR7dmlzaWJpbGl0eX1cIiAoZXhwZWN0ZWQgJHtWSVNJQklMSVRJRVMuam9pbignIHwgJyl9KWApO1xuICB9XG59XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gdGhyZWFkIGNyZWF0ZSAvIGxpc3Rcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5leHBvcnQgaW50ZXJmYWNlIFRocmVhZENyZWF0ZU9wdGlvbnMge1xuICBraW5kOiBzdHJpbmc7XG4gIGZlYXR1cmVJZD86IHN0cmluZztcbiAgd29ya0l0ZW1JZD86IHN0cmluZztcbiAgdmlzaWJpbGl0eT86IHN0cmluZztcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHRocmVhZENyZWF0ZUNvbW1hbmQoXG4gIGNsaWVudDogT2Foc0NsaWVudCxcbiAgb3B0czogVGhyZWFkQ3JlYXRlT3B0aW9ucyxcbik6IFByb21pc2U8c3RyaW5nPiB7XG4gIGFzc2VydFRocmVhZEtpbmQob3B0cy5raW5kKTtcbiAgaWYgKG9wdHMudmlzaWJpbGl0eSAhPT0gdW5kZWZpbmVkKSBhc3NlcnRWaXNpYmlsaXR5KG9wdHMudmlzaWJpbGl0eSk7XG4gIGNvbnN0IHRocmVhZCA9IGF3YWl0IGNsaWVudC5jYWxsPFRocmVhZD4oJ2NyZWF0ZV90aHJlYWQnLCB7XG4gICAga2luZDogb3B0cy5raW5kLFxuICAgIC4uLihvcHRzLmZlYXR1cmVJZCAhPT0gdW5kZWZpbmVkID8geyBmZWF0dXJlSWQ6IG9wdHMuZmVhdHVyZUlkIH0gOiB7fSksXG4gICAgLi4uKG9wdHMud29ya0l0ZW1JZCAhPT0gdW5kZWZpbmVkID8geyB3b3JrSXRlbUlkOiBvcHRzLndvcmtJdGVtSWQgfSA6IHt9KSxcbiAgICAuLi4ob3B0cy52aXNpYmlsaXR5ICE9PSB1bmRlZmluZWQgPyB7IHZpc2liaWxpdHk6IG9wdHMudmlzaWJpbGl0eSB9IDoge30pLFxuICB9KTtcbiAgcmV0dXJuIFtcbiAgICBgdGhyZWFkSWQ6ICR7dGhyZWFkLmlkfWAsXG4gICAgYGtpbmQ6ICR7dGhyZWFkLmtpbmR9YCxcbiAgICBgdmlzaWJpbGl0eTogJHt0aHJlYWQudmlzaWJpbGl0eX1gLFxuICAgIGBmZWF0dXJlSWQ6ICR7dGhyZWFkLmZlYXR1cmVJZCA/PyAnLSd9YCxcbiAgICBgd29ya0l0ZW1JZDogJHt0aHJlYWQud29ya0l0ZW1JZCA/PyAnLSd9YCxcbiAgXS5qb2luKCdcXG4nKTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBUaHJlYWRMaXN0T3B0aW9ucyB7XG4gIGZlYXR1cmVJZD86IHN0cmluZztcbiAgd29ya0l0ZW1JZD86IHN0cmluZztcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHRocmVhZExpc3RDb21tYW5kKFxuICBjbGllbnQ6IE9haHNDbGllbnQsXG4gIG9wdHM6IFRocmVhZExpc3RPcHRpb25zID0ge30sXG4pOiBQcm9taXNlPHN0cmluZz4ge1xuICBjb25zdCB0aHJlYWRzID0gYXdhaXQgY2xpZW50LmNhbGw8VGhyZWFkW10+KCdsaXN0X3RocmVhZHMnLCB7XG4gICAgLi4uKG9wdHMuZmVhdHVyZUlkICE9PSB1bmRlZmluZWQgPyB7IGZlYXR1cmVJZDogb3B0cy5mZWF0dXJlSWQgfSA6IHt9KSxcbiAgICAuLi4ob3B0cy53b3JrSXRlbUlkICE9PSB1bmRlZmluZWQgPyB7IHdvcmtJdGVtSWQ6IG9wdHMud29ya0l0ZW1JZCB9IDoge30pLFxuICB9KTtcbiAgcmV0dXJuIHJlbmRlclRhYmxlKFxuICAgIFsnaWQnLCAna2luZCcsICd2aXNpYmlsaXR5JywgJ2ZlYXR1cmVJZCcsICd3b3JrSXRlbUlkJywgJ2NyZWF0ZWRCeSddLFxuICAgIHRocmVhZHMubWFwKCh0KSA9PiBbdC5pZCwgdC5raW5kLCB0LnZpc2liaWxpdHksIHQuZmVhdHVyZUlkLCB0LndvcmtJdGVtSWQsIHQuY3JlYXRlZEJ5XSksXG4gICk7XG59XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gcG9zdCAvIG1lc3NhZ2VzXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuZXhwb3J0IGludGVyZmFjZSBQb3N0T3B0aW9ucyB7XG4gIHRocmVhZElkOiBzdHJpbmc7XG4gIGJvZHk6IHN0cmluZztcbiAgLyoqIFNUUlVDVFVSRUQgbWVudGlvbnMgXHUyMDE0IGFjdG9yIGlkcywgbmV2ZXIgcGFyc2VkIGZyb20gdGhlIGJvZHkgKFx1MDBBNzUuMikuICovXG4gIG1lbnRpb25zPzogc3RyaW5nW107XG4gIHJlcGx5VG8/OiBzdHJpbmc7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBwb3N0Q29tbWFuZChjbGllbnQ6IE9haHNDbGllbnQsIG9wdHM6IFBvc3RPcHRpb25zKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgY29uc3QgbWVzc2FnZSA9IGF3YWl0IGNsaWVudC5jYWxsPE1lc3NhZ2U+KCdwb3N0X21lc3NhZ2UnLCB7XG4gICAgdGhyZWFkSWQ6IG9wdHMudGhyZWFkSWQsXG4gICAgYm9keTogb3B0cy5ib2R5LFxuICAgIC4uLihvcHRzLnJlcGx5VG8gIT09IHVuZGVmaW5lZCA/IHsgcmVwbHlUbzogb3B0cy5yZXBseVRvIH0gOiB7fSksXG4gICAgLi4uKG9wdHMubWVudGlvbnMgIT09IHVuZGVmaW5lZCAmJiBvcHRzLm1lbnRpb25zLmxlbmd0aCA+IDAgPyB7IG1lbnRpb25zOiBvcHRzLm1lbnRpb25zIH0gOiB7fSksXG4gIH0pO1xuICBjb25zdCBsaW5lcyA9IFtgcG9zdGVkICMke21lc3NhZ2Uuc2VxfSAoJHttZXNzYWdlLmlkfSkgdG8gJHttZXNzYWdlLnRocmVhZElkfWBdO1xuICBpZiAob3B0cy5tZW50aW9ucyAhPT0gdW5kZWZpbmVkICYmIG9wdHMubWVudGlvbnMubGVuZ3RoID4gMCkge1xuICAgIGNvbnN0IG1lbnRpb25zID0gYXdhaXQgY2xpZW50LmNhbGw8TWVudGlvbltdPignbGlzdF9tZW50aW9ucycsIHsgbWVzc2FnZUlkOiBtZXNzYWdlLmlkIH0pO1xuICAgIGZvciAoY29uc3QgbWVudGlvbiBvZiBtZW50aW9ucykge1xuICAgICAgbGluZXMucHVzaChgbWVudGlvbiAke21lbnRpb24ubWVudGlvbmVkQWN0b3JJZH06ICR7bWVudGlvbi5yZXNvbHV0aW9ufWApO1xuICAgIH1cbiAgfVxuICByZXR1cm4gbGluZXMuam9pbignXFxuJyk7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgTWVzc2FnZXNPcHRpb25zIHtcbiAgdGhyZWFkSWQ6IHN0cmluZztcbiAgc2luY2VTZXE/OiBudW1iZXI7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBtZXNzYWdlc0NvbW1hbmQoY2xpZW50OiBPYWhzQ2xpZW50LCBvcHRzOiBNZXNzYWdlc09wdGlvbnMpOiBQcm9taXNlPHN0cmluZz4ge1xuICBjb25zdCBtZXNzYWdlcyA9IGF3YWl0IGNsaWVudC5jYWxsPE1lc3NhZ2VbXT4oJ2xpc3RfbWVzc2FnZXMnLCB7XG4gICAgdGhyZWFkSWQ6IG9wdHMudGhyZWFkSWQsXG4gICAgLi4uKG9wdHMuc2luY2VTZXEgIT09IHVuZGVmaW5lZCA/IHsgc2luY2VTZXE6IG9wdHMuc2luY2VTZXEgfSA6IHt9KSxcbiAgfSk7XG4gIC8vIGF1dGhvcklkIGlzIHJlbmRlcmVkIFJBVyBcdTIwMTQgdGhlIENMSSBoYXMgbm8gYWN0b3IgZGlyZWN0b3J5IGFuZCBuZWVkcyBub25lLlxuICByZXR1cm4gcmVuZGVyVGFibGUoXG4gICAgWydzZXEnLCAna2luZCcsICdhdXRob3JJZCcsICdib2R5J10sXG4gICAgbWVzc2FnZXMubWFwKChtKSA9PiBbbS5zZXEsIG0ua2luZCwgbS5hdXRob3JJZCwgbS5ib2R5XSksXG4gICk7XG59XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gbm90aWZpY2F0aW9uc1xuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbmV4cG9ydCBpbnRlcmZhY2UgTm90aWZpY2F0aW9uc09wdGlvbnMge1xuICB1bnJlYWRPbmx5PzogYm9vbGVhbjtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIG5vdGlmaWNhdGlvbnNDb21tYW5kKFxuICBjbGllbnQ6IE9haHNDbGllbnQsXG4gIG9wdHM6IE5vdGlmaWNhdGlvbnNPcHRpb25zID0ge30sXG4pOiBQcm9taXNlPHN0cmluZz4ge1xuICBjb25zdCBub3RpZmljYXRpb25zID0gYXdhaXQgY2xpZW50LmNhbGw8Tm90aWZpY2F0aW9uW10+KCdsaXN0X25vdGlmaWNhdGlvbnMnLCB7XG4gICAgLi4uKG9wdHMudW5yZWFkT25seSA9PT0gdHJ1ZSA/IHsgdW5yZWFkT25seTogdHJ1ZSB9IDoge30pLFxuICB9KTtcbiAgcmV0dXJuIHJlbmRlclRhYmxlKFxuICAgIFsnaWQnLCAnc291cmNlJywgJ3JlZklkJywgJ3JlYWQnXSxcbiAgICBub3RpZmljYXRpb25zLm1hcCgobikgPT4gW24uaWQsIG4uc291cmNlLCBuLnJlZklkLCBuLnJlYWRdKSxcbiAgKTtcbn1cblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBhZ2VudCBqb2JzXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuZXhwb3J0IGludGVyZmFjZSBKb2JzT3B0aW9ucyB7XG4gIGFnZW50QWN0b3JJZD86IHN0cmluZztcbiAgc3RhdHVzPzogc3RyaW5nO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gam9ic0NvbW1hbmQoY2xpZW50OiBPYWhzQ2xpZW50LCBvcHRzOiBKb2JzT3B0aW9ucyA9IHt9KTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgaWYgKG9wdHMuc3RhdHVzICE9PSB1bmRlZmluZWQgJiYgIShKT0JfU1RBVFVTRVMgYXMgcmVhZG9ubHkgc3RyaW5nW10pLmluY2x1ZGVzKG9wdHMuc3RhdHVzKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihgaW52YWxpZCAtLXN0YXR1cyBcIiR7b3B0cy5zdGF0dXN9XCIgKGV4cGVjdGVkICR7Sk9CX1NUQVRVU0VTLmpvaW4oJyB8ICcpfSlgKTtcbiAgfVxuICBjb25zdCBqb2JzID0gYXdhaXQgY2xpZW50LmNhbGw8QWdlbnRKb2JbXT4oJ2xpc3RfYWdlbnRfam9icycsIHtcbiAgICAuLi4ob3B0cy5hZ2VudEFjdG9ySWQgIT09IHVuZGVmaW5lZCA/IHsgYWdlbnRBY3RvcklkOiBvcHRzLmFnZW50QWN0b3JJZCB9IDoge30pLFxuICAgIC4uLihvcHRzLnN0YXR1cyAhPT0gdW5kZWZpbmVkID8geyBzdGF0dXM6IG9wdHMuc3RhdHVzIH0gOiB7fSksXG4gIH0pO1xuICByZXR1cm4gcmVuZGVyVGFibGUoXG4gICAgWydpZCcsICdhZ2VudEFjdG9ySWQnLCAnc3RhdHVzJywgJ3RocmVhZElkJywgJ3dvcmtJdGVtSWQnLCAnZGVwdGgnLCAnbm90ZSddLFxuICAgIGpvYnMubWFwKChqKSA9PiBbai5pZCwgai5hZ2VudEFjdG9ySWQsIGouc3RhdHVzLCBqLnRocmVhZElkLCBqLndvcmtJdGVtSWQsIGouZGVwdGgsIGoubm90ZV0pLFxuICApO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEpvYkNvbXBsZXRlT3B0aW9ucyB7XG4gIGpvYklkOiBzdHJpbmc7XG4gIHN0YXR1czogJ2RvbmUnIHwgJ2Jsb2NrZWQnO1xuICBub3RlPzogc3RyaW5nO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gam9iQ29tcGxldGVDb21tYW5kKFxuICBjbGllbnQ6IE9haHNDbGllbnQsXG4gIG9wdHM6IEpvYkNvbXBsZXRlT3B0aW9ucyxcbik6IFByb21pc2U8c3RyaW5nPiB7XG4gIGNvbnN0IGpvYiA9IGF3YWl0IGNsaWVudC5jYWxsPEFnZW50Sm9iPignY29tcGxldGVfYWdlbnRfam9iJywge1xuICAgIGpvYklkOiBvcHRzLmpvYklkLFxuICAgIHN0YXR1czogb3B0cy5zdGF0dXMsXG4gICAgLi4uKG9wdHMubm90ZSAhPT0gdW5kZWZpbmVkID8geyBub3RlOiBvcHRzLm5vdGUgfSA6IHt9KSxcbiAgfSk7XG4gIHJldHVybiBbYGpvYiAke2pvYi5pZH06ICR7am9iLnN0YXR1c31gLCBgbm90ZTogJHtqb2Iubm90ZSA/PyAnLSd9YF0uam9pbignXFxuJyk7XG59XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gYWR2aXNvciBib3RzIFx1MjAxNCBkZXRlcm1pbmlzdGljIHJlYWQgKyBwb3N0LCBOTyBMTE0sIE5PIGxpZmVjeWNsZSBhdXRob3JpdHlcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5leHBvcnQgaW50ZXJmYWNlIEFkdmlzZU5leHRUYXNrT3B0aW9ucyB7XG4gIHRocmVhZElkOiBzdHJpbmc7XG59XG5cbi8qKlxuICogYG9haHMgYWR2aXNlIG5leHQtdGFza2A6IHJlYWRzIHRoZSBjbGFpbWFibGUgcmVhZHlfZm9yX2RldiBxdWV1ZSAocmFpbHNcbiAqIGVuZm9yY2UgZGVwZW5kZW5jeSBvcmRlciBcdTIwMTQgYW4gaXRlbSBvbmx5IGV2ZXIgUkVBQ0hFUyByZWFkeV9mb3JfZGV2IHdoZW4gaXRzXG4gKiBwcmVkZWNlc3NvcnMgYWxsb3cgaXQpIGFuZCBwb3N0cyBhIGRldGVybWluaXN0aWMgc3VnZ2VzdGlvbiBpbnRvIHRoZVxuICogdGhyZWFkLiBSZWFkICsgcG9zdCBvbmx5LlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gYWR2aXNlTmV4dFRhc2tDb21tYW5kKFxuICBjbGllbnQ6IE9haHNDbGllbnQsXG4gIG9wdHM6IEFkdmlzZU5leHRUYXNrT3B0aW9ucyxcbik6IFByb21pc2U8c3RyaW5nPiB7XG4gIGNvbnN0IGl0ZW1zID0gYXdhaXQgY2xpZW50LmNhbGw8V29ya0l0ZW1bXT4oJ2xpc3Rfd29ya19pdGVtcycsIHtcbiAgICBzdGF0ZTogJ3JlYWR5X2Zvcl9kZXYnLFxuICAgIGNsYWltYWJsZTogdHJ1ZSxcbiAgfSk7XG4gIGNvbnN0IG9yZGVyZWQgPSBbLi4uaXRlbXNdLnNvcnQoKGEsIGIpID0+IGEuZXh0ZXJuYWxLZXkubG9jYWxlQ29tcGFyZShiLmV4dGVybmFsS2V5KSk7XG4gIGNvbnN0IGJvZHkgPVxuICAgIG9yZGVyZWQubGVuZ3RoID09PSAwXG4gICAgICA/ICdhZHZpc29yKG5leHQtdGFzayk6IG5vIGNsYWltYWJsZSByZWFkeV9mb3JfZGV2IGl0ZW1zIHJpZ2h0IG5vdy4nXG4gICAgICA6IFtcbiAgICAgICAgICAnYWR2aXNvcihuZXh0LXRhc2spOiBzdWdnZXN0ZWQgY2xhaW0gb3JkZXIgKGNsYWltYWJsZSByZWFkeV9mb3JfZGV2KTonLFxuICAgICAgICAgIC4uLm9yZGVyZWQubWFwKChpdGVtLCBpKSA9PiBgJHtpICsgMX0uICR7aXRlbS5leHRlcm5hbEtleX0gXHUyMDE0ICR7aXRlbS50aXRsZX0gKCR7aXRlbS5pZH0pYCksXG4gICAgICAgIF0uam9pbignXFxuJyk7XG4gIGNvbnN0IG1lc3NhZ2UgPSBhd2FpdCBjbGllbnQuY2FsbDxNZXNzYWdlPigncG9zdF9tZXNzYWdlJywge1xuICAgIHRocmVhZElkOiBvcHRzLnRocmVhZElkLFxuICAgIGJvZHksXG4gIH0pO1xuICByZXR1cm4gW2BhZHZpc2VkIGluICMke21lc3NhZ2Uuc2VxfSAoJHttZXNzYWdlLmlkfSlgLCBib2R5XS5qb2luKCdcXG4nKTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBBZHZpc2VSZWNvbmNpbGVPcHRpb25zIHtcbiAgdGhyZWFkSWQ6IHN0cmluZztcbiAgLyoqIFJlcGVhdGVkIGAtLWZpbGUgPHdvcmtJdGVtSWQ+PTxmcm9udG1hdHRlclN0YXR1cz5gIHBhaXJzLiAqL1xuICBmaWxlczogc3RyaW5nW107XG59XG5cbi8qKlxuICogYG9haHMgYWR2aXNlIHJlY29uY2lsZWA6IHJ1bnMgdGhlIERFVEVDVC1PTkxZIHJlY29uY2lsZSBxdWVyeSBvdmVyIHRoZVxuICogZ2l2ZW4gZnJvbnRtYXR0ZXIgc3RhdHVzZXMgYW5kIHBvc3RzIHRoZSBkaXZlcmdlbmNlIHJlcG9ydCBpbnRvIHRoZVxuICogdGhyZWFkLiBOZXZlciBtdXRhdGVzIGFueXRoaW5nIChyb2FkbWFwIFx1MDBBNzEuNiAvIEQ2KS5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGFkdmlzZVJlY29uY2lsZUNvbW1hbmQoXG4gIGNsaWVudDogT2Foc0NsaWVudCxcbiAgb3B0czogQWR2aXNlUmVjb25jaWxlT3B0aW9ucyxcbik6IFByb21pc2U8c3RyaW5nPiB7XG4gIGlmIChvcHRzLmZpbGVzLmxlbmd0aCA9PT0gMCkge1xuICAgIHRocm93IG5ldyBFcnJvcignbm90aGluZyB0byByZWNvbmNpbGU6IHBhc3MgYXQgbGVhc3Qgb25lIC0tZmlsZSA8d29ya0l0ZW1JZD49PHN0YXR1cz4nKTtcbiAgfVxuICBjb25zdCBmaWxlcyA9IG9wdHMuZmlsZXMubWFwKChwYWlyKSA9PiB7XG4gICAgY29uc3QgZXEgPSBwYWlyLmluZGV4T2YoJz0nKTtcbiAgICBpZiAoZXEgPD0gMCB8fCBlcSA9PT0gcGFpci5sZW5ndGggLSAxKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYGludmFsaWQgLS1maWxlIFwiJHtwYWlyfVwiIChleHBlY3RlZCA8d29ya0l0ZW1JZD49PHN0YXR1cz4pYCk7XG4gICAgfVxuICAgIHJldHVybiB7IHdvcmtJdGVtSWQ6IHBhaXIuc2xpY2UoMCwgZXEpLCBmcm9udG1hdHRlclN0YXR1czogcGFpci5zbGljZShlcSArIDEpIH07XG4gIH0pO1xuICBjb25zdCByZXBvcnRzID0gYXdhaXQgY2xpZW50LmNhbGw8RGl2ZXJnZW5jZVJlcG9ydFtdPigncmVjb25jaWxlJywgeyBmaWxlcyB9KTtcbiAgY29uc3QgYm9keSA9XG4gICAgcmVwb3J0cy5sZW5ndGggPT09IDBcbiAgICAgID8gYGFkdmlzb3IocmVjb25jaWxlKTogbm8gZGl2ZXJnZW5jZSBhY3Jvc3MgJHtmaWxlcy5sZW5ndGh9IGZpbGUocykuIChkZXRlY3Qtb25seSlgXG4gICAgICA6IFtcbiAgICAgICAgICBgYWR2aXNvcihyZWNvbmNpbGUpOiAke3JlcG9ydHMubGVuZ3RofSBkaXZlcmdlbmNlKHMpIGRldGVjdGVkIChkZXRlY3Qtb25seSwgbm90aGluZyB3YXMgY2hhbmdlZCk6YCxcbiAgICAgICAgICAuLi5yZXBvcnRzLm1hcChcbiAgICAgICAgICAgIChyKSA9PiBgLSAke3Iud29ya0l0ZW1JZH06IGZpbGU9JHtyLmZpbGVTdGF0ZX0gZGI9JHtyLmRiU3RhdGV9IFx1MjE5MiAke3Iua2luZH1gLFxuICAgICAgICAgICksXG4gICAgICAgIF0uam9pbignXFxuJyk7XG4gIGNvbnN0IG1lc3NhZ2UgPSBhd2FpdCBjbGllbnQuY2FsbDxNZXNzYWdlPigncG9zdF9tZXNzYWdlJywge1xuICAgIHRocmVhZElkOiBvcHRzLnRocmVhZElkLFxuICAgIGJvZHksXG4gIH0pO1xuICByZXR1cm4gW2BhZHZpc2VkIGluICMke21lc3NhZ2Uuc2VxfSAoJHttZXNzYWdlLmlkfSlgLCBib2R5XS5qb2luKCdcXG4nKTtcbn1cbiIsICIvKipcbiAqIGBvYWhzIHNlcnZlYCBcdTIwMTQgYm9vdCB0aGUgc3BpbmUtYXBpIGluLXByb2Nlc3MuXG4gKlxuICogRW5naW5lIHNlbGVjdGlvbjpcbiAqICAtIGRlZmF1bHQ6IEBvYWhzL2NvcmUgY3JlYXRlTWVtb3J5RW5naW5lICh6ZXJvIHBlcnNpc3RlbmNlLCBpbnN0YW50KTtcbiAqICAtIC0tZGF0YSA8ZGlyPjogRFVSQUJMRSBQR2xpdGUgdmlhIEBvYWhzL2RiIGNyZWF0ZVBnU3luY0VuZ2luZSh7ZGF0YURpcn0pXG4gKiAgICBwbHVzIGEgcGVyc2lzdGVkIFRva2VuU3RvcmUsIHNvIGFjdG9ycy90b2tlbnMvc3RhdGUgc3Vydml2ZSByZXN0YXJ0cy5cbiAqXG4gKiBAb2Focy9kYiBpcyBpbXBvcnRlZCBMQVpJTFk6IGl0cyBzeW5jaHJvbm91cyBmYWNhZGUgc3Bhd25zIGEgc3luY2tpdFxuICogd29ya2VyIChQR2xpdGUgd2FzbSkgYXQgbW9kdWxlIGxvYWQsIHdoaWNoIG5vIG1lbW9yeS1lbmdpbmUgc2VydmUgXHUyMDE0IGFuZCBub1xuICogZ2F0ZS1ob2xkZXIgY29tbWFuZCBcdTIwMTQgc2hvdWxkIGV2ZXIgcGF5IGZvci5cbiAqXG4gKiBFbnYgaXMgcmVhZCBpbiBjbGkudHMgKHRoZSBlbnRyeXBvaW50KSwgbmV2ZXIgaGVyZTogdGhpcyBtb2R1bGUgdGFrZXNcbiAqIGV2ZXJ5dGhpbmcgYXMgcGFyYW1ldGVycywgbWlycm9yaW5nIHRoZSBzcGluZS1hcGkgY29udmVudGlvbi5cbiAqL1xuaW1wb3J0IHsgcmFuZG9tQnl0ZXMgfSBmcm9tICdub2RlOmNyeXB0byc7XG5pbXBvcnQgeyBta2RpclN5bmMgfSBmcm9tICdub2RlOmZzJztcbmltcG9ydCB0eXBlIHsgQWRkcmVzc0luZm8gfSBmcm9tICdub2RlOm5ldCc7XG5pbXBvcnQgeyBqb2luIH0gZnJvbSAnbm9kZTpwYXRoJztcblxuaW1wb3J0IHsgY3JlYXRlTWVtb3J5RW5naW5lIH0gZnJvbSAnQG9haHMvY29yZSc7XG5pbXBvcnQgeyBUb2tlblN0b3JlLCBidWlsZFNlcnZlciB9IGZyb20gJ0BvYWhzL3NwaW5lLWFwaSc7XG5cbmV4cG9ydCBjb25zdCBERUZBVUxUX1BPUlQgPSA0NTE3O1xuXG5leHBvcnQgaW50ZXJmYWNlIFNlcnZlT3B0aW9ucyB7XG4gIC8qKiBUQ1AgcG9ydCAoMCA9IGVwaGVtZXJhbCkuIERlZmF1bHQgNDUxNy4gKi9cbiAgcG9ydD86IG51bWJlcjtcbiAgLyoqIEJpbmQgaG9zdC4gRGVmYXVsdCAwLjAuMC4wLiAqL1xuICBob3N0Pzogc3RyaW5nO1xuICAvKiogQm9vdHN0cmFwIGFkbWluIGNyZWRlbnRpYWwuIE9taXR0ZWQgXHUyMTkyIGdlbmVyYXRlZCAoc2VlIGhhbmRsZS5hZG1pblRva2VuR2VuZXJhdGVkKS4gKi9cbiAgYWRtaW5Ub2tlbj86IHN0cmluZztcbiAgLyoqIFBlcnNpc3RlbmNlIHJvb3Q6IFBHbGl0ZSBkYXRhIHVuZGVyIDxkYXRhRGlyPi9wZywgdG9rZW5zIGluIDxkYXRhRGlyPi90b2tlbnMuanNvbi4gKi9cbiAgZGF0YURpcj86IHN0cmluZztcbn1cblxuZXhwb3J0IGludGVyZmFjZSBTZXJ2ZUhhbmRsZSB7XG4gIHVybDogc3RyaW5nO1xuICBwb3J0OiBudW1iZXI7XG4gIGFkbWluVG9rZW46IHN0cmluZztcbiAgLyoqIHRydWUgd2hlbiBubyBhZG1pbiB0b2tlbiB3YXMgcHJvdmlkZWQgYW5kIG9uZSB3YXMgZ2VuZXJhdGVkLiAqL1xuICBhZG1pblRva2VuR2VuZXJhdGVkOiBib29sZWFuO1xuICBlbmdpbmVLaW5kOiAnbWVtb3J5JyB8ICdwZ2xpdGUnO1xuICBjbG9zZSgpOiBQcm9taXNlPHZvaWQ+O1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gc3RhcnRTZXJ2ZShvcHRpb25zOiBTZXJ2ZU9wdGlvbnMgPSB7fSk6IFByb21pc2U8U2VydmVIYW5kbGU+IHtcbiAgY29uc3QgYWRtaW5Ub2tlbkdlbmVyYXRlZCA9IG9wdGlvbnMuYWRtaW5Ub2tlbiA9PT0gdW5kZWZpbmVkO1xuICBjb25zdCBhZG1pblRva2VuID0gb3B0aW9ucy5hZG1pblRva2VuID8/IHJhbmRvbUJ5dGVzKDMyKS50b1N0cmluZygnaGV4Jyk7XG5cbiAgbGV0IGVuZ2luZUtpbmQ6IFNlcnZlSGFuZGxlWydlbmdpbmVLaW5kJ107XG4gIGxldCBlbmdpbmU7XG4gIGxldCB0b2tlblN0b3JlOiBUb2tlblN0b3JlO1xuICBpZiAob3B0aW9ucy5kYXRhRGlyICE9PSB1bmRlZmluZWQpIHtcbiAgICBta2RpclN5bmMob3B0aW9ucy5kYXRhRGlyLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcbiAgICBjb25zdCB7IGNyZWF0ZVBnU3luY0VuZ2luZSB9ID0gYXdhaXQgaW1wb3J0KCdAb2Focy9kYicpO1xuICAgIGVuZ2luZSA9IGNyZWF0ZVBnU3luY0VuZ2luZSh7IGRhdGFEaXI6IGpvaW4ob3B0aW9ucy5kYXRhRGlyLCAncGcnKSB9KTtcbiAgICB0b2tlblN0b3JlID0gbmV3IFRva2VuU3RvcmUoeyBwZXJzaXN0UGF0aDogam9pbihvcHRpb25zLmRhdGFEaXIsICd0b2tlbnMuanNvbicpIH0pO1xuICAgIGVuZ2luZUtpbmQgPSAncGdsaXRlJztcbiAgfSBlbHNlIHtcbiAgICBlbmdpbmUgPSBjcmVhdGVNZW1vcnlFbmdpbmUoKTtcbiAgICB0b2tlblN0b3JlID0gbmV3IFRva2VuU3RvcmUoKTtcbiAgICBlbmdpbmVLaW5kID0gJ21lbW9yeSc7XG4gIH1cblxuICBjb25zdCBhcHAgPSBhd2FpdCBidWlsZFNlcnZlcih7IGVuZ2luZSwgdG9rZW5TdG9yZSwgYWRtaW5Ub2tlbiB9KTtcbiAgYXdhaXQgYXBwLmxpc3Rlbih7IHBvcnQ6IG9wdGlvbnMucG9ydCA/PyBERUZBVUxUX1BPUlQsIGhvc3Q6IG9wdGlvbnMuaG9zdCA/PyAnMC4wLjAuMCcgfSk7XG4gIGNvbnN0IHsgcG9ydCB9ID0gYXBwLnNlcnZlci5hZGRyZXNzKCkgYXMgQWRkcmVzc0luZm87XG5cbiAgcmV0dXJuIHtcbiAgICB1cmw6IGBodHRwOi8vMTI3LjAuMC4xOiR7cG9ydH1gLFxuICAgIHBvcnQsXG4gICAgYWRtaW5Ub2tlbixcbiAgICBhZG1pblRva2VuR2VuZXJhdGVkLFxuICAgIGVuZ2luZUtpbmQsXG4gICAgY2xvc2U6IGFzeW5jICgpID0+IHtcbiAgICAgIGF3YWl0IGFwcC5jbG9zZSgpO1xuICAgIH0sXG4gIH07XG59XG4iLCAiLyoqXG4gKiBAb2Focy9zcGluZS1hcGkgXHUyMDE0IEhUVFAgKyBNQ1Agc3VyZmFjZXMgb3ZlciB0aGUgb25lIGNvbW1hbmQgYnVzLlxuICpcbiAqIEVudiBpcyByZWFkIE9OTFkgaGVyZSAoc3RhcnQoKSwgZm9yIHRoZSBDTEkgZW50cnlwb2ludCk7IHRoZSBsaWJyYXJ5XG4gKiBtb2R1bGVzIHRha2UgZXZlcnl0aGluZyBhcyBwYXJhbWV0ZXJzLlxuICovXG5pbXBvcnQgeyBjcmVhdGVNZW1vcnlFbmdpbmUgfSBmcm9tICdAb2Focy9jb3JlJztcblxuaW1wb3J0IHsgVG9rZW5TdG9yZSB9IGZyb20gJy4vYXV0aC5qcyc7XG5pbXBvcnQgeyBidWlsZFNlcnZlciB9IGZyb20gJy4vc2VydmVyLmpzJztcblxuZXhwb3J0IHsgVG9rZW5TdG9yZSwgdHlwZSBSZXNvbHZlZFRva2VuIH0gZnJvbSAnLi9hdXRoLmpzJztcbmV4cG9ydCB7IGNyZWF0ZUNvbW1hbmRCdXMgfSBmcm9tICcuL2J1cy5qcyc7XG5leHBvcnQgeyBidWlsZFNlcnZlciwgZXJyb3JFbnZlbG9wZSwgZXJyb3JOYW1lLCB0eXBlIEJ1aWxkU2VydmVyT3B0aW9ucyB9IGZyb20gJy4vc2VydmVyLmpzJztcbmV4cG9ydCB7IGJ1aWxkTWNwU2VydmVyLCByZWdpc3Rlck1jcFJvdXRlIH0gZnJvbSAnLi9tY3AuanMnO1xuZXhwb3J0IHtcbiAgcG9sbGluZ0V2ZW50VGFpbCxcbiAgcmVnaXN0ZXJFdmVudFN0cmVhbSxcbiAgdHlwZSBFdmVudFN0cmVhbU9wdGlvbnMsXG4gIHR5cGUgRXZlbnRUYWlsLFxufSBmcm9tICcuL3NzZS5qcyc7XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBzdGFydCgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgY29uc3QgcG9ydCA9IE51bWJlcihwcm9jZXNzLmVudlsnUE9SVCddID8/ICczMDAwJyk7XG4gIGNvbnN0IGFkbWluVG9rZW4gPSBwcm9jZXNzLmVudlsnT0FIU19BRE1JTl9UT0tFTiddO1xuICBpZiAoYWRtaW5Ub2tlbiA9PT0gdW5kZWZpbmVkIHx8IGFkbWluVG9rZW4ubGVuZ3RoID09PSAwKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdPQUhTX0FETUlOX1RPS0VOIG11c3QgYmUgc2V0IChib290c3RyYXAgYWRtaW4gY3JlZGVudGlhbCknKTtcbiAgfVxuICBjb25zdCBwZXJzaXN0UGF0aCA9IHByb2Nlc3MuZW52WydPQUhTX1RPS0VOX1NUT1JFX1BBVEgnXTtcbiAgY29uc3QgdG9rZW5TdG9yZSA9IG5ldyBUb2tlblN0b3JlKHBlcnNpc3RQYXRoICE9PSB1bmRlZmluZWQgPyB7IHBlcnNpc3RQYXRoIH0gOiB7fSk7XG4gIGNvbnN0IGVuZ2luZSA9IGNyZWF0ZU1lbW9yeUVuZ2luZSgpO1xuICBjb25zdCBhcHAgPSBhd2FpdCBidWlsZFNlcnZlcih7IGVuZ2luZSwgdG9rZW5TdG9yZSwgYWRtaW5Ub2tlbiB9KTtcbiAgYXdhaXQgYXBwLmxpc3Rlbih7IHBvcnQsIGhvc3Q6ICcwLjAuMC4wJyB9KTtcbiAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgY29uc29sZS5sb2coYG9haHMgc3BpbmUtYXBpIGxpc3RlbmluZyBvbiA6JHtwb3J0fSAoSFRUUCAvcnBjLyosIE1DUCAvbWNwKWApO1xufVxuIiwgIi8qKlxuICogVG9rZW5TdG9yZSBcdTIwMTQgYmVhcmVyLXRva2VuIGF1dGhlbnRpY2F0aW9uIGZvciBib3RoIHN1cmZhY2VzIChIVFRQICsgTUNQKS5cbiAqXG4gKiBUb2tlbnMgYXJlIG9wYXF1ZSAzMi1ieXRlIHJhbmRvbSBoZXggc3RyaW5nczsgb25seSB0aGVpciBzaGEyNTYgaGFzaCBpc1xuICogc3RvcmVkIChhbmQgb3B0aW9uYWxseSBwZXJzaXN0ZWQpLCBzbyBhIGxlYWtlZCBzdG9yZSBmaWxlIG5ldmVyIGxlYWtzIGFcbiAqIHVzYWJsZSBjcmVkZW50aWFsLiBUaGUgYm9vdHN0cmFwIGFkbWluIHRva2VuIGFycml2ZXMgYXMgYSBQQVJBTUVURVIgXHUyMDE0IHRoaXNcbiAqIG1vZHVsZSBuZXZlciByZWFkcyB0aGUgZW52aXJvbm1lbnQgKGVudiBoYW5kbGluZyBsaXZlcyBpbiBpbmRleC50cyBzdGFydCgpKS5cbiAqL1xuaW1wb3J0IHsgY3JlYXRlSGFzaCwgcmFuZG9tQnl0ZXMgfSBmcm9tICdub2RlOmNyeXB0byc7XG5pbXBvcnQgeyBleGlzdHNTeW5jLCBta2RpclN5bmMsIHJlYWRGaWxlU3luYywgd3JpdGVGaWxlU3luYyB9IGZyb20gJ25vZGU6ZnMnO1xuaW1wb3J0IHsgZGlybmFtZSB9IGZyb20gJ25vZGU6cGF0aCc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgUmVzb2x2ZWRUb2tlbiB7XG4gIGFjdG9ySWQ6IHN0cmluZztcbiAgaXNBZG1pbjogYm9vbGVhbjtcbn1cblxuaW50ZXJmYWNlIFBlcnNpc3RTaGFwZSB7XG4gIHZlcnNpb246IDE7XG4gIHRva2VuczogUmVjb3JkPHN0cmluZywgUmVzb2x2ZWRUb2tlbj47IC8vIHNoYTI1Nih0b2tlbikgaGV4IC0+IHJlY29yZFxuICAvKipcbiAgICogUGhhc2UgMiAocm9hZG1hcCBcdTAwQTczKTogdGhlIFJFQUwgZW5naW5lIGFjdG9yIHRoZSBib290c3RyYXAgYWRtaW4gdG9rZW5cbiAgICogYWN0cyBhcyAoJ1dvcmtzcGFjZSBBZG1pbicsIGdvdmVybmFuY2Ugcm9sZSAnYWRtaW4nKS4gUGVyc2lzdGVkIHNvIGFcbiAgICogYC0tZGF0YWAgcmVzdGFydCByZXVzZXMgdGhlIHNhbWUgYWN0b3IgaW5zdGVhZCBvZiBtaW50aW5nIGEgbmV3IG9uZS5cbiAgICovXG4gIGFkbWluQWN0b3JJZD86IHN0cmluZztcbn1cblxuZnVuY3Rpb24gaGFzaFRva2VuKHRva2VuOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gY3JlYXRlSGFzaCgnc2hhMjU2JykudXBkYXRlKHRva2VuLCAndXRmOCcpLmRpZ2VzdCgnaGV4Jyk7XG59XG5cbmV4cG9ydCBjbGFzcyBUb2tlblN0b3JlIHtcbiAgcHJpdmF0ZSByZWFkb25seSBieUhhc2ggPSBuZXcgTWFwPHN0cmluZywgUmVzb2x2ZWRUb2tlbj4oKTtcbiAgcHJpdmF0ZSByZWFkb25seSBwZXJzaXN0UGF0aDogc3RyaW5nIHwgdW5kZWZpbmVkO1xuICBwcml2YXRlIGFkbWluQWN0b3JJZDogc3RyaW5nIHwgdW5kZWZpbmVkO1xuXG4gIGNvbnN0cnVjdG9yKG9wdGlvbnM/OiB7IHBlcnNpc3RQYXRoPzogc3RyaW5nIH0pIHtcbiAgICB0aGlzLnBlcnNpc3RQYXRoID0gb3B0aW9ucz8ucGVyc2lzdFBhdGg7XG4gICAgaWYgKHRoaXMucGVyc2lzdFBhdGggIT09IHVuZGVmaW5lZCAmJiBleGlzdHNTeW5jKHRoaXMucGVyc2lzdFBhdGgpKSB7XG4gICAgICBjb25zdCByYXcgPSBKU09OLnBhcnNlKHJlYWRGaWxlU3luYyh0aGlzLnBlcnNpc3RQYXRoLCAndXRmOCcpKSBhcyBQZXJzaXN0U2hhcGU7XG4gICAgICBmb3IgKGNvbnN0IFtoYXNoLCByZWNvcmRdIG9mIE9iamVjdC5lbnRyaWVzKHJhdy50b2tlbnMpKSB7XG4gICAgICAgIHRoaXMuYnlIYXNoLnNldChoYXNoLCB7IGFjdG9ySWQ6IHJlY29yZC5hY3RvcklkLCBpc0FkbWluOiByZWNvcmQuaXNBZG1pbiB9KTtcbiAgICAgIH1cbiAgICAgIHRoaXMuYWRtaW5BY3RvcklkID0gcmF3LmFkbWluQWN0b3JJZDtcbiAgICB9XG4gIH1cblxuICAvKiogUGVyc2lzdGVkIGVuZ2luZS1hY3RvciBpZCB0aGUgYm9vdHN0cmFwIGFkbWluIHRva2VuIG1hcHMgdG8gKGlmIGFueSkuICovXG4gIGdldEFkbWluQWN0b3JJZCgpOiBzdHJpbmcgfCB1bmRlZmluZWQge1xuICAgIHJldHVybiB0aGlzLmFkbWluQWN0b3JJZDtcbiAgfVxuXG4gIC8qKiBSZW1lbWJlciAoYW5kIHBlcnNpc3QpIHRoZSBib290c3RyYXAgYWRtaW4gYWN0b3IgbWFwcGluZy4gKi9cbiAgc2V0QWRtaW5BY3RvcklkKGFjdG9ySWQ6IHN0cmluZyk6IHZvaWQge1xuICAgIHRoaXMuYWRtaW5BY3RvcklkID0gYWN0b3JJZDtcbiAgICB0aGlzLnNhdmUoKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZWdpc3RlciB0aGUgYm9vdHN0cmFwIGFkbWluIHRva2VuIChzdXJ2aXZlcyByZXN0YXJ0cyBieSByZS1ib290c3RyYXAsXG4gICAqIG5vdCBwZXJzaXN0ZW5jZSBcdTIwMTQgdGhlIGFkbWluIGNyZWRlbnRpYWwgaXMgY29uZmlndXJhdGlvbiwgbm90IHN0YXRlKS5cbiAgICovXG4gIGJvb3RzdHJhcEFkbWluKHRva2VuOiBzdHJpbmcsIGFjdG9ySWQgPSAnYWRtaW4nKTogdm9pZCB7XG4gICAgdGhpcy5ieUhhc2guc2V0KGhhc2hUb2tlbih0b2tlbiksIHsgYWN0b3JJZCwgaXNBZG1pbjogdHJ1ZSB9KTtcbiAgfVxuXG4gIC8qKiBJc3N1ZSBhIGZyZXNoIHRva2VuIGZvciBhbiBhY3Rvci4gVGhlIHBsYWludGV4dCBpcyByZXR1cm5lZCBleGFjdGx5IG9uY2UuICovXG4gIGlzc3VlKGFjdG9ySWQ6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgY29uc3QgdG9rZW4gPSByYW5kb21CeXRlcygzMikudG9TdHJpbmcoJ2hleCcpO1xuICAgIHRoaXMuYnlIYXNoLnNldChoYXNoVG9rZW4odG9rZW4pLCB7IGFjdG9ySWQsIGlzQWRtaW46IGZhbHNlIH0pO1xuICAgIHRoaXMuc2F2ZSgpO1xuICAgIHJldHVybiB0b2tlbjtcbiAgfVxuXG4gIHJlc29sdmUodG9rZW46IHN0cmluZyk6IFJlc29sdmVkVG9rZW4gfCBudWxsIHtcbiAgICBjb25zdCByZWNvcmQgPSB0aGlzLmJ5SGFzaC5nZXQoaGFzaFRva2VuKHRva2VuKSk7XG4gICAgcmV0dXJuIHJlY29yZCA/IHsgLi4ucmVjb3JkIH0gOiBudWxsO1xuICB9XG5cbiAgcHJpdmF0ZSBzYXZlKCk6IHZvaWQge1xuICAgIGlmICh0aGlzLnBlcnNpc3RQYXRoID09PSB1bmRlZmluZWQpIHJldHVybjtcbiAgICBjb25zdCBzaGFwZTogUGVyc2lzdFNoYXBlID0ge1xuICAgICAgdmVyc2lvbjogMSxcbiAgICAgIHRva2Vuczoge30sXG4gICAgICAuLi4odGhpcy5hZG1pbkFjdG9ySWQgIT09IHVuZGVmaW5lZCA/IHsgYWRtaW5BY3RvcklkOiB0aGlzLmFkbWluQWN0b3JJZCB9IDoge30pLFxuICAgIH07XG4gICAgZm9yIChjb25zdCBbaGFzaCwgcmVjb3JkXSBvZiB0aGlzLmJ5SGFzaCkge1xuICAgICAgLy8gQWRtaW4gYm9vdHN0cmFwIGVudHJpZXMgYXJlIGNvbmZpZ3VyYXRpb247IHBlcnNpc3Qgb25seSBpc3N1ZWQgdG9rZW5zLlxuICAgICAgaWYgKHJlY29yZC5pc0FkbWluKSBjb250aW51ZTtcbiAgICAgIHNoYXBlLnRva2Vuc1toYXNoXSA9IHsgLi4ucmVjb3JkIH07XG4gICAgfVxuICAgIG1rZGlyU3luYyhkaXJuYW1lKHRoaXMucGVyc2lzdFBhdGgpLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcbiAgICB3cml0ZUZpbGVTeW5jKHRoaXMucGVyc2lzdFBhdGgsIEpTT04uc3RyaW5naWZ5KHNoYXBlLCBudWxsLCAyKSwgJ3V0ZjgnKTtcbiAgfVxufVxuIiwgIi8qKlxuICogRmFzdGlmeSBIVFRQIGFkYXB0ZXI6IFBPU1QgL3JwYy88Y29tbWFuZD4gXHUyMDE0IGEgdGhpbiBwYXJzZXIgaW4gZnJvbnQgb2YgdGhlXG4gKiBjb21tYW5kIGJ1cy4gRXZlcnkgcmVqZWN0aW9uIGNyb3NzZXMgdGhlIHdpcmUgYXMgdGhlIGNvbnRyYWN0cyBlbnZlbG9wZSxcbiAqIHN0YXR1cy1tYXBwZWQgYnkgSFRUUF9TVEFUVVMgc28gZXJyb3Igc2VtYW50aWNzIHN1cnZpdmUgdGhlIHRyYW5zcG9ydC5cbiAqL1xuaW1wb3J0IEZhc3RpZnksIHsgdHlwZSBGYXN0aWZ5SW5zdGFuY2UsIHR5cGUgRmFzdGlmeVJlcXVlc3QgfSBmcm9tICdmYXN0aWZ5JztcbmltcG9ydCB7XG4gIENvbmZsaWN0RXJyb3IsXG4gIEd1YXJkRmFpbGVkRXJyb3IsXG4gIEludmFsaWRUcmFuc2l0aW9uRXJyb3IsXG4gIFBlcm1pc3Npb25EZW5pZWRFcnJvcixcbiAgU3Rvcmllc1ZhbGlkYXRpb25FcnJvcixcbiAgdHlwZSBTcGluZUVuZ2luZSxcbn0gZnJvbSAnQG9haHMvY29yZSc7XG5pbXBvcnQge1xuICBDT01NQU5EX01BUCxcbiAgSFRUUF9TVEFUVVMsXG4gIHR5cGUgQWN0b3JDb250ZXh0LFxuICB0eXBlIEVycm9yRW52ZWxvcGUsXG59IGZyb20gJ0BvYWhzL2NvbnRyYWN0cyc7XG5cbmltcG9ydCB0eXBlIHsgVG9rZW5TdG9yZSB9IGZyb20gJy4vYXV0aC5qcyc7XG5pbXBvcnQgeyBjcmVhdGVDb21tYW5kQnVzIH0gZnJvbSAnLi9idXMuanMnO1xuaW1wb3J0IHsgcmVnaXN0ZXJNY3BSb3V0ZSB9IGZyb20gJy4vbWNwLmpzJztcbmltcG9ydCB7IHBvbGxpbmdFdmVudFRhaWwsIHJlZ2lzdGVyRXZlbnRTdHJlYW0sIHR5cGUgRXZlbnRTdHJlYW1PcHRpb25zIH0gZnJvbSAnLi9zc2UuanMnO1xuaW1wb3J0IHsgcmVnaXN0ZXJVaVJvdXRlcyB9IGZyb20gJy4vdWkuanMnO1xuXG5leHBvcnQgaW50ZXJmYWNlIEJ1aWxkU2VydmVyT3B0aW9ucyB7XG4gIGVuZ2luZTogU3BpbmVFbmdpbmU7XG4gIHRva2VuU3RvcmU6IFRva2VuU3RvcmU7XG4gIC8qKiBCb290c3RyYXAgYWRtaW4gY3JlZGVudGlhbCBcdTIwMTQgcGFzc2VkIGluLCBuZXZlciByZWFkIGZyb20gZW52IGhlcmUuICovXG4gIGFkbWluVG9rZW46IHN0cmluZztcbiAgLyoqIFNTRSByZWxheSBrbm9icyAocG9sbC9oZWFydGJlYXQgaW50ZXJ2YWxzKSBcdTIwMTQgZGVmYXVsdHMgYXJlIHByb2R1Y3Rpb24gdmFsdWVzLiAqL1xuICBldmVudFN0cmVhbT86IEV2ZW50U3RyZWFtT3B0aW9ucztcbn1cblxuLyoqIE1hcCBhIHRocm93biBjb3JlIGVycm9yIG9udG8gdGhlIHdpcmUgZXJyb3IgdGF4b25vbXkuICovXG5leHBvcnQgZnVuY3Rpb24gZXJyb3JOYW1lKGVycm9yOiB1bmtub3duKTogRXJyb3JFbnZlbG9wZVsnZXJyb3InXVsnbmFtZSddIHtcbiAgaWYgKGVycm9yIGluc3RhbmNlb2YgUGVybWlzc2lvbkRlbmllZEVycm9yKSByZXR1cm4gJ1Blcm1pc3Npb25EZW5pZWRFcnJvcic7XG4gIGlmIChlcnJvciBpbnN0YW5jZW9mIENvbmZsaWN0RXJyb3IpIHJldHVybiAnQ29uZmxpY3RFcnJvcic7XG4gIGlmIChlcnJvciBpbnN0YW5jZW9mIEd1YXJkRmFpbGVkRXJyb3IpIHJldHVybiAnR3VhcmRGYWlsZWRFcnJvcic7XG4gIGlmIChlcnJvciBpbnN0YW5jZW9mIEludmFsaWRUcmFuc2l0aW9uRXJyb3IpIHJldHVybiAnSW52YWxpZFRyYW5zaXRpb25FcnJvcic7XG4gIGlmIChlcnJvciBpbnN0YW5jZW9mIFN0b3JpZXNWYWxpZGF0aW9uRXJyb3IpIHJldHVybiAnU3Rvcmllc1ZhbGlkYXRpb25FcnJvcic7XG4gIHJldHVybiAnRXJyb3InO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZXJyb3JFbnZlbG9wZShlcnJvcjogdW5rbm93bik6IEVycm9yRW52ZWxvcGUge1xuICByZXR1cm4ge1xuICAgIG9rOiBmYWxzZSxcbiAgICBlcnJvcjoge1xuICAgICAgbmFtZTogZXJyb3JOYW1lKGVycm9yKSxcbiAgICAgIG1lc3NhZ2U6IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKSxcbiAgICB9LFxuICB9O1xufVxuXG4vKipcbiAqIFBoYXNlIDIgYm9vdHN0cmFwIChyb2FkbWFwIFx1MDBBNzMpOiB0aGUgYWRtaW4gdG9rZW4gbXVzdCByZXNvbHZlIHRvIGEgUkVBTFxuICogZW5naW5lIGFjdG9yIGhvbGRpbmcgZ292ZXJuYW5jZSByb2xlICdhZG1pbicgXHUyMDE0IGdhdGVkIGVudGl0bGVtZW50IHdyaXRlc1xuICogKGFzc2lnbl9yb2xlL3NldF9wbGFuL3NldF8qX3BvbGljeS9cdTIwMjYpIGFyZSBhdXRob3JpemVkIGJ5IHRoZSBFTkdJTkUgZnJvbVxuICogdGhhdCByb2xlLCBuZXZlciBieSB0aGUgdHJhbnNwb3J0J3MgaXNBZG1pbiBmbGFnLiBUaGUgbWFwcGluZyBwZXJzaXN0cyBpblxuICogdGhlIFRva2VuU3RvcmUsIHNvIGEgYC0tZGF0YWAgcmVzdGFydCByZXVzZXMgdGhlIHNhbWUgJ1dvcmtzcGFjZSBBZG1pbidcbiAqIGFjdG9yOyB3aGVuIHRoZSBlbmdpbmUgY2Fubm90IGNvbmZpcm0gdGhlIHBlcnNpc3RlZCByb2xlIChmcmVzaCBlbmdpbmUsIG9yXG4gKiBhIHBlcnNpc3RlbmNlIGxheWVyIHRoYXQgcHJlZGF0ZXMgUGhhc2UgMiksIGEgZnJlc2ggYm9vdHN0cmFwIGFjdG9yIGlzXG4gKiBjcmVhdGVkIGluc3RlYWQuXG4gKi9cbmZ1bmN0aW9uIGVuc3VyZUJvb3RzdHJhcEFkbWluQWN0b3IoZW5naW5lOiBTcGluZUVuZ2luZSwgdG9rZW5TdG9yZTogVG9rZW5TdG9yZSk6IHN0cmluZyB7XG4gIGNvbnN0IHBlcnNpc3RlZCA9IHRva2VuU3RvcmUuZ2V0QWRtaW5BY3RvcklkKCk7XG4gIGlmIChwZXJzaXN0ZWQgIT09IHVuZGVmaW5lZCkge1xuICAgIHRyeSB7XG4gICAgICBpZiAoZW5naW5lLmdldEdvdmVybmFuY2VSb2xlKHBlcnNpc3RlZCkgPT09ICdhZG1pbicpIHJldHVybiBwZXJzaXN0ZWQ7XG4gICAgfSBjYXRjaCB7XG4gICAgICAvLyBmYWxsIHRocm91Z2g6IHRoZSBlbmdpbmUgY2Fubm90IHZvdWNoIGZvciB0aGUgcGVyc2lzdGVkIG1hcHBpbmdcbiAgICB9XG4gIH1cbiAgY29uc3QgYWN0b3IgPSBlbmdpbmUuY3JlYXRlQWN0b3Ioe1xuICAgIHR5cGU6ICd1c2VyJyxcbiAgICBkaXNwbGF5TmFtZTogJ1dvcmtzcGFjZSBBZG1pbicsXG4gICAgZ292ZXJuYW5jZVJvbGU6ICdhZG1pbicsXG4gIH0pO1xuICB0b2tlblN0b3JlLnNldEFkbWluQWN0b3JJZChhY3Rvci5pZCk7XG4gIHJldHVybiBhY3Rvci5pZDtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGJ1aWxkU2VydmVyKG9wdGlvbnM6IEJ1aWxkU2VydmVyT3B0aW9ucyk6IFByb21pc2U8RmFzdGlmeUluc3RhbmNlPiB7XG4gIGNvbnN0IHsgZW5naW5lLCB0b2tlblN0b3JlLCBhZG1pblRva2VuIH0gPSBvcHRpb25zO1xuICB0b2tlblN0b3JlLmJvb3RzdHJhcEFkbWluKGFkbWluVG9rZW4sIGVuc3VyZUJvb3RzdHJhcEFkbWluQWN0b3IoZW5naW5lLCB0b2tlblN0b3JlKSk7XG4gIGNvbnN0IGJ1cyA9IGNyZWF0ZUNvbW1hbmRCdXMoZW5naW5lLCB0b2tlblN0b3JlKTtcblxuICBjb25zdCBhcHAgPSBGYXN0aWZ5KHsgbG9nZ2VyOiBmYWxzZSB9KTtcblxuICBjb25zdCBhdXRoZW50aWNhdGUgPSAocmVxdWVzdDogRmFzdGlmeVJlcXVlc3QpOiBBY3RvckNvbnRleHQgfCBudWxsID0+IHtcbiAgICBjb25zdCBoZWFkZXIgPSByZXF1ZXN0LmhlYWRlcnMuYXV0aG9yaXphdGlvbjtcbiAgICBpZiAodHlwZW9mIGhlYWRlciAhPT0gJ3N0cmluZycgfHwgIWhlYWRlci5zdGFydHNXaXRoKCdCZWFyZXIgJykpIHJldHVybiBudWxsO1xuICAgIGNvbnN0IHJlc29sdmVkID0gdG9rZW5TdG9yZS5yZXNvbHZlKGhlYWRlci5zbGljZSgnQmVhcmVyICcubGVuZ3RoKS50cmltKCkpO1xuICAgIHJldHVybiByZXNvbHZlZCA9PT0gbnVsbCA/IG51bGwgOiB7IGFjdG9ySWQ6IHJlc29sdmVkLmFjdG9ySWQsIGlzQWRtaW46IHJlc29sdmVkLmlzQWRtaW4gfTtcbiAgfTtcblxuICBhcHAuZ2V0KCcvaGVhbHRoeicsIGFzeW5jICgpID0+ICh7IG9rOiB0cnVlIH0pKTtcblxuICBhcHAucG9zdCgnL3JwYy86Y29tbWFuZCcsIGFzeW5jIChyZXF1ZXN0LCByZXBseSkgPT4ge1xuICAgIGNvbnN0IGN0eCA9IGF1dGhlbnRpY2F0ZShyZXF1ZXN0KTtcbiAgICBpZiAoY3R4ID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gcmVwbHkuY29kZSg0MDEpLnNlbmQoe1xuICAgICAgICBvazogZmFsc2UsXG4gICAgICAgIGVycm9yOiB7IG5hbWU6ICdFcnJvcicsIG1lc3NhZ2U6ICd1bmF1dGhvcml6ZWQ6IG1pc3Npbmcgb3IgaW52YWxpZCBiZWFyZXIgdG9rZW4nIH0sXG4gICAgICB9IHNhdGlzZmllcyBFcnJvckVudmVsb3BlKTtcbiAgICB9XG4gICAgY29uc3QgeyBjb21tYW5kIH0gPSByZXF1ZXN0LnBhcmFtcyBhcyB7IGNvbW1hbmQ6IHN0cmluZyB9O1xuICAgIGlmICghQ09NTUFORF9NQVAuaGFzKGNvbW1hbmQpKSB7XG4gICAgICByZXR1cm4gcmVwbHkuY29kZSg0MDQpLnNlbmQoe1xuICAgICAgICBvazogZmFsc2UsXG4gICAgICAgIGVycm9yOiB7IG5hbWU6ICdFcnJvcicsIG1lc3NhZ2U6IGB1bmtub3duIGNvbW1hbmQ6ICR7Y29tbWFuZH1gIH0sXG4gICAgICB9IHNhdGlzZmllcyBFcnJvckVudmVsb3BlKTtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGJ1cy5leGVjdXRlKGNvbW1hbmQsIHJlcXVlc3QuYm9keSA/PyB7fSwgY3R4KTtcbiAgICAgIHJldHVybiByZXBseS5jb2RlKDIwMCkuc2VuZCh7IG9rOiB0cnVlLCByZXN1bHQgfSk7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGNvbnN0IGVudmVsb3BlID0gZXJyb3JFbnZlbG9wZShlcnJvcik7XG4gICAgICByZXR1cm4gcmVwbHkuY29kZShIVFRQX1NUQVRVU1tlbnZlbG9wZS5lcnJvci5uYW1lXSkuc2VuZChlbnZlbG9wZSk7XG4gICAgfVxuICB9KTtcblxuICByZWdpc3Rlck1jcFJvdXRlKGFwcCwgYnVzLCBhdXRoZW50aWNhdGUpO1xuICByZWdpc3RlckV2ZW50U3RyZWFtKGFwcCwgcG9sbGluZ0V2ZW50VGFpbChlbmdpbmUpLCBhdXRoZW50aWNhdGUsIG9wdGlvbnMuZXZlbnRTdHJlYW0gPz8ge30pO1xuICByZWdpc3RlclVpUm91dGVzKGFwcCk7XG5cbiAgcmV0dXJuIGFwcDtcbn1cbiIsICIvKipcbiAqIFRoZSBjb21tYW5kIGJ1cyBcdTIwMTQgdGhlIE9ORSBwbGFjZSBjb21tYW5kcyBleGVjdXRlIChyb2FkbWFwIFx1MDBBNzAuMTogbm8gd3JpdGVzXG4gKiBvdXRzaWRlIHRoZSBjb21tYW5kIGJ1cykuIEhUVFAgKC9ycGMvOmNvbW1hbmQpIGFuZCBNQ1AgKG9haHNfKiB0b29scykgYXJlXG4gKiB0aGluIHBhcnNlcnMgaW4gZnJvbnQgb2YgZXhlY3V0ZSgpOyBuZWl0aGVyIGNhcnJpZXMgaXRzIG93biBsb2dpYy5cbiAqXG4gKiBBY3RvciBpZGVudGl0eSBBTFdBWVMgY29tZXMgZnJvbSB0aGUgYXV0aGVudGljYXRlZCBjb250ZXh0LCBuZXZlciBmcm9tIHRoZVxuICogcmVxdWVzdCBib2R5IFx1MjAxNCBhIGxpZmVjeWNsZSBjb21tYW5kIGNhbiBvbmx5IGFjdCBhcyB0aGUgYWN0b3Igd2hvc2UgdG9rZW5cbiAqIHNpZ25lZCB0aGUgcmVxdWVzdC5cbiAqL1xuaW1wb3J0IHtcbiAgR3VhcmRGYWlsZWRFcnJvcixcbiAgUGVybWlzc2lvbkRlbmllZEVycm9yLFxuICB0eXBlIEFjdG9yVHlwZSxcbiAgdHlwZSBBZ2VudEpvYixcbiAgdHlwZSBCbG9ja2VkUmVhc29uLFxuICB0eXBlIEV2aWRlbmNlLFxuICB0eXBlIEdhdGVDb2RlLFxuICB0eXBlIEdvdmVybmFuY2VSb2xlLFxuICB0eXBlIFBlcm1pc3Npb24sXG4gIHR5cGUgUGxhbkNvZGUsXG4gIHR5cGUgU3BpbmVFbmdpbmUsXG4gIHR5cGUgVGhyZWFkS2luZCxcbiAgdHlwZSBUaHJlYWRWaXNpYmlsaXR5LFxuICB0eXBlIFdvcmtJdGVtU3RhdGUsXG59IGZyb20gJ0BvYWhzL2NvcmUnO1xuaW1wb3J0IHsgQ09NTUFORF9NQVAsIHR5cGUgQWN0b3JDb250ZXh0LCB0eXBlIENvbW1hbmRCdXMsIHR5cGUgQ29tbWFuZE5hbWUgfSBmcm9tICdAb2Focy9jb250cmFjdHMnO1xuXG5pbXBvcnQgdHlwZSB7IFRva2VuU3RvcmUgfSBmcm9tICcuL2F1dGguanMnO1xuXG4vLyBQYXJzZWQtaW5wdXQgc2hhcGVzIChtaXJyb3IgdGhlIHpvZCBzY2hlbWFzIGluIEBvYWhzL2NvbnRyYWN0czsgdGhlIHpvZFxuLy8gcGFyc2UgaW4gZXhlY3V0ZSgpIGlzIHRoZSBydW50aW1lIGd1YXJhbnRlZSwgdGhlc2UgYXJlIHRoZSBzdGF0aWMgdmlldykuXG5pbnRlcmZhY2UgQ3JlYXRlQWN0b3JJbiB7IHR5cGU6ICd1c2VyJyB8ICdhZ2VudCc7IGRpc3BsYXlOYW1lOiBzdHJpbmc7IGdvdmVybmFuY2VSb2xlPzogR292ZXJuYW5jZVJvbGUgfCB1bmRlZmluZWQgfVxuaW50ZXJmYWNlIEdyYW50SW4geyBhY3RvcklkOiBzdHJpbmc7IHBlcm1pc3Npb246IHN0cmluZzsgc2NvcGU/OiBzdHJpbmcgfCB1bmRlZmluZWQgfVxuaW50ZXJmYWNlIFJvbGVJbiB7IGFjdG9ySWQ6IHN0cmluZzsgcm9sZUNvZGU6IHN0cmluZyB9XG5pbnRlcmZhY2UgTGlzdFJvbGVBc3NpZ25tZW50c0luIHsgYWN0b3JJZD86IHN0cmluZyB8IHVuZGVmaW5lZCB9XG5pbnRlcmZhY2UgU2V0R292ZXJuYW5jZVJvbGVJbiB7IGFjdG9ySWQ6IHN0cmluZzsgcm9sZTogR292ZXJuYW5jZVJvbGUgfVxuaW50ZXJmYWNlIFNldFBsYW5JbiB7IHBsYW46IFBsYW5Db2RlIH1cbmludGVyZmFjZSBTZXRXb3Jrc3BhY2VQb2xpY3lJbiB7XG4gIHBvbGljeTogeyBhZ2VudEdhdGVBcHByb3ZhbHM/OiBib29sZWFuIHwgdW5kZWZpbmVkOyBhZ2VudFNlbGZEaXNwYXRjaD86IGJvb2xlYW4gfCB1bmRlZmluZWQgfTtcbn1cbmludGVyZmFjZSBTZXRHYXRlUG9saWN5SW4ge1xuICBnYXRlOiBHYXRlQ29kZTtcbiAgcG9saWN5OiB7IG1pbkFwcHJvdmFscz86IG51bWJlciB8IHVuZGVmaW5lZDsgcmVxdWlyZWRBY3RvclR5cGVzPzogQWN0b3JUeXBlW10gfCB1bmRlZmluZWQgfTtcbn1cbmludGVyZmFjZSBBdXRoekV4cGxhaW5JbiB7IGFjdG9ySWQ6IHN0cmluZzsgcGVybWlzc2lvbjogc3RyaW5nIH1cbmludGVyZmFjZSBJbXBvcnRTdG9yaWVzSW4geyBmZWF0dXJlSWQ6IHN0cmluZzsgeWFtbDogc3RyaW5nIH1cbmludGVyZmFjZSBDbGFpbVRhc2tJbiB7IHdvcmtJdGVtSWQ6IHN0cmluZzsgdHRsTXM/OiBudW1iZXIgfCB1bmRlZmluZWQgfVxuaW50ZXJmYWNlIEhlYXJ0YmVhdEluIHsgY2xhaW1JZDogc3RyaW5nIH1cbmludGVyZmFjZSBSZWxlYXNlQ2xhaW1JbiB7IGNsYWltSWQ6IHN0cmluZzsgcmVhc29uPzogc3RyaW5nIHwgdW5kZWZpbmVkIH1cbmludGVyZmFjZSBBZHZhbmNlSW4geyB3b3JrSXRlbUlkOiBzdHJpbmc7IHRvOiBXb3JrSXRlbVN0YXRlOyBmZW5jaW5nVG9rZW4/OiBudW1iZXIgfCB1bmRlZmluZWQ7IGlkZW1wb3RlbmN5S2V5Pzogc3RyaW5nIHwgdW5kZWZpbmVkIH1cbmludGVyZmFjZSBCbG9ja0luIHsgd29ya0l0ZW1JZDogc3RyaW5nOyByZWFzb246IEJsb2NrZWRSZWFzb247IGZlbmNpbmdUb2tlbj86IG51bWJlciB8IHVuZGVmaW5lZCB9XG5pbnRlcmZhY2UgV29ya0l0ZW1JbiB7IHdvcmtJdGVtSWQ6IHN0cmluZyB9XG5pbnRlcmZhY2UgU3VibWl0RXZpZGVuY2VJbiB7IHdvcmtJdGVtSWQ6IHN0cmluZzsgZXZpZGVuY2U6IEV2aWRlbmNlOyBmZW5jaW5nVG9rZW4/OiBudW1iZXIgfCB1bmRlZmluZWQgfVxuaW50ZXJmYWNlIEFwcHJvdmVHYXRlSW4geyB3b3JrSXRlbUlkOiBzdHJpbmc7IGdhdGU6IEdhdGVDb2RlOyBwaW5uZWRWZXJpZmljYXRpb24/OiBzdHJpbmdbXSB8IHVuZGVmaW5lZCB9XG5pbnRlcmZhY2UgUmVqZWN0R2F0ZUluIHsgd29ya0l0ZW1JZDogc3RyaW5nOyBnYXRlOiBHYXRlQ29kZSB9XG5pbnRlcmZhY2UgRmVhdHVyZUluIHsgZmVhdHVyZUlkOiBzdHJpbmcgfVxuaW50ZXJmYWNlIExpc3RXb3JrSXRlbXNJbiB7IHN0YXRlPzogV29ya0l0ZW1TdGF0ZSB8IHVuZGVmaW5lZDsgZmVhdHVyZUlkPzogc3RyaW5nIHwgdW5kZWZpbmVkOyBjbGFpbWFibGU/OiBib29sZWFuIHwgdW5kZWZpbmVkIH1cbmludGVyZmFjZSBRdWVyeUV2ZW50c0luIHsgc3RyZWFtSWQ/OiBzdHJpbmcgfCB1bmRlZmluZWQgfVxuaW50ZXJmYWNlIENyZWF0ZVRocmVhZEluIHtcbiAga2luZDogVGhyZWFkS2luZDtcbiAgZmVhdHVyZUlkPzogc3RyaW5nIHwgdW5kZWZpbmVkO1xuICB3b3JrSXRlbUlkPzogc3RyaW5nIHwgdW5kZWZpbmVkO1xuICB2aXNpYmlsaXR5PzogVGhyZWFkVmlzaWJpbGl0eSB8IHVuZGVmaW5lZDtcbn1cbmludGVyZmFjZSBBZGRUaHJlYWRQYXJ0aWNpcGFudEluIHsgdGhyZWFkSWQ6IHN0cmluZzsgYWN0b3JJZDogc3RyaW5nIH1cbmludGVyZmFjZSBQb3N0TWVzc2FnZUluIHtcbiAgdGhyZWFkSWQ6IHN0cmluZztcbiAgYm9keTogc3RyaW5nO1xuICByZXBseVRvPzogc3RyaW5nIHwgdW5kZWZpbmVkO1xuICBtZW50aW9ucz86IHN0cmluZ1tdIHwgdW5kZWZpbmVkO1xufVxuaW50ZXJmYWNlIExpc3RUaHJlYWRzSW4geyBmZWF0dXJlSWQ/OiBzdHJpbmcgfCB1bmRlZmluZWQ7IHdvcmtJdGVtSWQ/OiBzdHJpbmcgfCB1bmRlZmluZWQgfVxuaW50ZXJmYWNlIExpc3RNZXNzYWdlc0luIHsgdGhyZWFkSWQ6IHN0cmluZzsgc2luY2VTZXE/OiBudW1iZXIgfCB1bmRlZmluZWQgfVxuaW50ZXJmYWNlIExpc3RNZW50aW9uc0luIHsgbWVzc2FnZUlkOiBzdHJpbmcgfVxuaW50ZXJmYWNlIExpc3ROb3RpZmljYXRpb25zSW4geyB1bnJlYWRPbmx5PzogYm9vbGVhbiB8IHVuZGVmaW5lZCB9XG5pbnRlcmZhY2UgTWFya05vdGlmaWNhdGlvblJlYWRJbiB7IG5vdGlmaWNhdGlvbklkOiBzdHJpbmcgfVxuaW50ZXJmYWNlIExpc3RBZ2VudEpvYnNJbiB7IGFnZW50QWN0b3JJZD86IHN0cmluZyB8IHVuZGVmaW5lZDsgc3RhdHVzPzogQWdlbnRKb2JbJ3N0YXR1cyddIHwgdW5kZWZpbmVkIH1cbmludGVyZmFjZSBDb21wbGV0ZUFnZW50Sm9iSW4geyBqb2JJZDogc3RyaW5nOyBzdGF0dXM6ICdkb25lJyB8ICdibG9ja2VkJzsgbm90ZT86IHN0cmluZyB8IHVuZGVmaW5lZCB9XG5pbnRlcmZhY2UgUmVjb25jaWxlSW4geyBmaWxlczogQXJyYXk8eyB3b3JrSXRlbUlkOiBzdHJpbmc7IGZyb250bWF0dGVyU3RhdHVzOiBzdHJpbmcgfT4gfVxuXG4vKiogQ29tcGFjdCBvbmUtbGluZSBzdW1tYXJ5IG9mIHpvZCBpc3N1ZXMgKGR1Y2stdHlwZWQ6IHpvZCBjb3BpZXMgbWF5IGRpZmZlcikuICovXG5mdW5jdGlvbiB6b2RNZXNzYWdlKGVycm9yOiB1bmtub3duKTogc3RyaW5nIHtcbiAgY29uc3QgaXNzdWVzID0gKGVycm9yIGFzIHsgaXNzdWVzPzogQXJyYXk8eyBwYXRoPzogQXJyYXk8c3RyaW5nIHwgbnVtYmVyPjsgbWVzc2FnZT86IHN0cmluZyB9PiB9KVxuICAgIC5pc3N1ZXM7XG4gIGlmICghQXJyYXkuaXNBcnJheShpc3N1ZXMpKSByZXR1cm4gU3RyaW5nKGVycm9yKTtcbiAgcmV0dXJuIGlzc3Vlc1xuICAgIC5tYXAoKGlzc3VlKSA9PiB7XG4gICAgICBjb25zdCBwYXRoID0gaXNzdWUucGF0aCAmJiBpc3N1ZS5wYXRoLmxlbmd0aCA+IDAgPyBpc3N1ZS5wYXRoLmpvaW4oJy4nKSA6ICcocm9vdCknO1xuICAgICAgcmV0dXJuIGAke3BhdGh9OiAke2lzc3VlLm1lc3NhZ2UgPz8gJ2ludmFsaWQnfWA7XG4gICAgfSlcbiAgICAuam9pbignOyAnKTtcbn1cblxuZnVuY3Rpb24gcmVxdWlyZUFkbWluKGN0eDogQWN0b3JDb250ZXh0LCBjb21tYW5kOiBzdHJpbmcpOiB2b2lkIHtcbiAgaWYgKCFjdHguaXNBZG1pbikge1xuICAgIHRocm93IG5ldyBQZXJtaXNzaW9uRGVuaWVkRXJyb3IoYGFkbWluOiR7Y29tbWFuZH1gIGFzIFBlcm1pc3Npb24sIGN0eC5hY3RvcklkKTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlQ29tbWFuZEJ1cyhlbmdpbmU6IFNwaW5lRW5naW5lLCB0b2tlbnM6IFRva2VuU3RvcmUpOiBDb21tYW5kQnVzIHtcbiAgYXN5bmMgZnVuY3Rpb24gZXhlY3V0ZShjb21tYW5kOiBzdHJpbmcsIGlucHV0OiB1bmtub3duLCBjdHg6IEFjdG9yQ29udGV4dCk6IFByb21pc2U8dW5rbm93bj4ge1xuICAgIGNvbnN0IGRlZiA9IENPTU1BTkRfTUFQLmdldChjb21tYW5kKTtcbiAgICBpZiAoIWRlZikgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoYHVua25vd24gY29tbWFuZDogJHtjb21tYW5kfWApO1xuXG4gICAgY29uc3QgcGFyc2VkUmVzdWx0ID0gZGVmLmlucHV0LnNhZmVQYXJzZShpbnB1dCA/PyB7fSk7XG4gICAgaWYgKCFwYXJzZWRSZXN1bHQuc3VjY2Vzcykge1xuICAgICAgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoYGludmFsaWQgaW5wdXQgZm9yICR7Y29tbWFuZH06ICR7em9kTWVzc2FnZShwYXJzZWRSZXN1bHQuZXJyb3IpfWApO1xuICAgIH1cbiAgICBjb25zdCBwYXJzZWQ6IHVua25vd24gPSBwYXJzZWRSZXN1bHQuZGF0YTtcblxuICAgIHN3aXRjaCAoY29tbWFuZCBhcyBDb21tYW5kTmFtZSkge1xuICAgICAgLy8gLS0gc2V0dXAgLyBhZG1pbiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICAgY2FzZSAnY3JlYXRlX2FjdG9yJzoge1xuICAgICAgICAvLyBjcmVhdGVfYWN0b3Igc3RheXMgYWRtaW4tdG9rZW4tZ2F0ZWQgKGJvb3RzdHJhcCBwbHVtYmluZyksIHdoaWNoXG4gICAgICAgIC8vIGFsc28gbWFrZXMgaXQgdGhlIG9ubHkgY3R4IGFsbG93ZWQgdG8gcGFzcyBnb3Zlcm5hbmNlUm9sZS5cbiAgICAgICAgcmVxdWlyZUFkbWluKGN0eCwgY29tbWFuZCk7XG4gICAgICAgIGNvbnN0IHAgPSBwYXJzZWQgYXMgQ3JlYXRlQWN0b3JJbjtcbiAgICAgICAgY29uc3QgYWN0b3IgPSBlbmdpbmUuY3JlYXRlQWN0b3Ioe1xuICAgICAgICAgIHR5cGU6IHAudHlwZSxcbiAgICAgICAgICBkaXNwbGF5TmFtZTogcC5kaXNwbGF5TmFtZSxcbiAgICAgICAgICAuLi4ocC5nb3Zlcm5hbmNlUm9sZSAhPT0gdW5kZWZpbmVkID8geyBnb3Zlcm5hbmNlUm9sZTogcC5nb3Zlcm5hbmNlUm9sZSB9IDoge30pLFxuICAgICAgICB9KTtcbiAgICAgICAgY29uc3QgdG9rZW4gPSB0b2tlbnMuaXNzdWUoYWN0b3IuaWQpO1xuICAgICAgICByZXR1cm4geyBhY3RvciwgdG9rZW4gfTtcbiAgICAgIH1cbiAgICAgIGNhc2UgJ2dyYW50X3Blcm1pc3Npb24nOiB7XG4gICAgICAgIHJlcXVpcmVBZG1pbihjdHgsIGNvbW1hbmQpO1xuICAgICAgICBjb25zdCBwID0gcGFyc2VkIGFzIEdyYW50SW47XG4gICAgICAgIGVuZ2luZS5ncmFudCh7XG4gICAgICAgICAgYWN0b3JJZDogcC5hY3RvcklkLFxuICAgICAgICAgIHBlcm1pc3Npb246IHAucGVybWlzc2lvbiBhcyBQZXJtaXNzaW9uLFxuICAgICAgICAgIC4uLihwLnNjb3BlICE9PSB1bmRlZmluZWQgPyB7IHNjb3BlOiBwLnNjb3BlIH0gOiB7fSksXG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4geyBncmFudGVkOiB0cnVlIH07XG4gICAgICB9XG4gICAgICBjYXNlICdyZXZva2VfcGVybWlzc2lvbic6IHtcbiAgICAgICAgcmVxdWlyZUFkbWluKGN0eCwgY29tbWFuZCk7XG4gICAgICAgIGNvbnN0IHAgPSBwYXJzZWQgYXMgR3JhbnRJbjtcbiAgICAgICAgZW5naW5lLnJldm9rZSh7XG4gICAgICAgICAgYWN0b3JJZDogcC5hY3RvcklkLFxuICAgICAgICAgIHBlcm1pc3Npb246IHAucGVybWlzc2lvbiBhcyBQZXJtaXNzaW9uLFxuICAgICAgICAgIC4uLihwLnNjb3BlICE9PSB1bmRlZmluZWQgPyB7IHNjb3BlOiBwLnNjb3BlIH0gOiB7fSksXG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4geyByZXZva2VkOiB0cnVlIH07XG4gICAgICB9XG4gICAgICBjYXNlICdjcmVhdGVfZmVhdHVyZSc6IHtcbiAgICAgICAgcmV0dXJuIGVuZ2luZS5jcmVhdGVGZWF0dXJlKHsgYWN0b3JJZDogY3R4LmFjdG9ySWQgfSk7XG4gICAgICB9XG5cbiAgICAgIC8vIC0tIGVudGl0bGVtZW50cyAoUGhhc2UgMiwgcm9hZG1hcCBcdTAwQTczKSAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICAvLyBObyByZXF1aXJlQWRtaW4gaGVyZTogYXV0aG9yaXR5IGlzIGRlY2lkZWQgYnkgdGhlIEVOR0lORSBmcm9tIHRoZVxuICAgICAgLy8gY2FsbGVyJ3MgZ292ZXJuYW5jZSByb2xlIChieUFjdG9ySWQgPSB0aGUgYXV0aGVudGljYXRlZCBhY3RvcikuXG4gICAgICBjYXNlICdhc3NpZ25fcm9sZSc6IHtcbiAgICAgICAgY29uc3QgcCA9IHBhcnNlZCBhcyBSb2xlSW47XG4gICAgICAgIGVuZ2luZS5hc3NpZ25Sb2xlKHsgYWN0b3JJZDogcC5hY3RvcklkLCByb2xlQ29kZTogcC5yb2xlQ29kZSwgYnlBY3RvcklkOiBjdHguYWN0b3JJZCB9KTtcbiAgICAgICAgcmV0dXJuIHsgYXNzaWduZWQ6IHRydWUgfTtcbiAgICAgIH1cbiAgICAgIGNhc2UgJ3Jldm9rZV9yb2xlJzoge1xuICAgICAgICBjb25zdCBwID0gcGFyc2VkIGFzIFJvbGVJbjtcbiAgICAgICAgZW5naW5lLnJldm9rZVJvbGUoeyBhY3RvcklkOiBwLmFjdG9ySWQsIHJvbGVDb2RlOiBwLnJvbGVDb2RlLCBieUFjdG9ySWQ6IGN0eC5hY3RvcklkIH0pO1xuICAgICAgICByZXR1cm4geyByZXZva2VkOiB0cnVlIH07XG4gICAgICB9XG4gICAgICBjYXNlICdsaXN0X3JvbGVfYXNzaWdubWVudHMnOiB7XG4gICAgICAgIGNvbnN0IHAgPSBwYXJzZWQgYXMgTGlzdFJvbGVBc3NpZ25tZW50c0luO1xuICAgICAgICByZXR1cm4gZW5naW5lLmxpc3RSb2xlQXNzaWdubWVudHMocC5hY3RvcklkKTtcbiAgICAgIH1cbiAgICAgIGNhc2UgJ3NldF9nb3Zlcm5hbmNlX3JvbGUnOiB7XG4gICAgICAgIGNvbnN0IHAgPSBwYXJzZWQgYXMgU2V0R292ZXJuYW5jZVJvbGVJbjtcbiAgICAgICAgZW5naW5lLnNldEdvdmVybmFuY2VSb2xlKHsgYWN0b3JJZDogcC5hY3RvcklkLCByb2xlOiBwLnJvbGUsIGJ5QWN0b3JJZDogY3R4LmFjdG9ySWQgfSk7XG4gICAgICAgIHJldHVybiB7IGFjdG9ySWQ6IHAuYWN0b3JJZCwgcm9sZTogcC5yb2xlIH07XG4gICAgICB9XG4gICAgICBjYXNlICdzZXRfcGxhbic6IHtcbiAgICAgICAgY29uc3QgcCA9IHBhcnNlZCBhcyBTZXRQbGFuSW47XG4gICAgICAgIGVuZ2luZS5zZXRQbGFuKHsgcGxhbjogcC5wbGFuLCBieUFjdG9ySWQ6IGN0eC5hY3RvcklkIH0pO1xuICAgICAgICByZXR1cm4geyBwbGFuOiBlbmdpbmUuZ2V0UGxhbigpIH07XG4gICAgICB9XG4gICAgICBjYXNlICdzZXRfd29ya3NwYWNlX3BvbGljeSc6IHtcbiAgICAgICAgY29uc3QgcCA9IHBhcnNlZCBhcyBTZXRXb3Jrc3BhY2VQb2xpY3lJbjtcbiAgICAgICAgZW5naW5lLnNldFdvcmtzcGFjZVBvbGljeSh7XG4gICAgICAgICAgcG9saWN5OiB7XG4gICAgICAgICAgICAuLi4ocC5wb2xpY3kuYWdlbnRHYXRlQXBwcm92YWxzICE9PSB1bmRlZmluZWRcbiAgICAgICAgICAgICAgPyB7IGFnZW50R2F0ZUFwcHJvdmFsczogcC5wb2xpY3kuYWdlbnRHYXRlQXBwcm92YWxzIH1cbiAgICAgICAgICAgICAgOiB7fSksXG4gICAgICAgICAgICAuLi4ocC5wb2xpY3kuYWdlbnRTZWxmRGlzcGF0Y2ggIT09IHVuZGVmaW5lZFxuICAgICAgICAgICAgICA/IHsgYWdlbnRTZWxmRGlzcGF0Y2g6IHAucG9saWN5LmFnZW50U2VsZkRpc3BhdGNoIH1cbiAgICAgICAgICAgICAgOiB7fSksXG4gICAgICAgICAgfSxcbiAgICAgICAgICBieUFjdG9ySWQ6IGN0eC5hY3RvcklkLFxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIGVuZ2luZS5nZXRXb3Jrc3BhY2VQb2xpY3koKTtcbiAgICAgIH1cbiAgICAgIGNhc2UgJ3NldF9nYXRlX3BvbGljeSc6IHtcbiAgICAgICAgY29uc3QgcCA9IHBhcnNlZCBhcyBTZXRHYXRlUG9saWN5SW47XG4gICAgICAgIGVuZ2luZS5zZXRHYXRlUG9saWN5KHtcbiAgICAgICAgICBnYXRlOiBwLmdhdGUsXG4gICAgICAgICAgcG9saWN5OiB7XG4gICAgICAgICAgICAuLi4ocC5wb2xpY3kubWluQXBwcm92YWxzICE9PSB1bmRlZmluZWQgPyB7IG1pbkFwcHJvdmFsczogcC5wb2xpY3kubWluQXBwcm92YWxzIH0gOiB7fSksXG4gICAgICAgICAgICAuLi4ocC5wb2xpY3kucmVxdWlyZWRBY3RvclR5cGVzICE9PSB1bmRlZmluZWRcbiAgICAgICAgICAgICAgPyB7IHJlcXVpcmVkQWN0b3JUeXBlczogWy4uLnAucG9saWN5LnJlcXVpcmVkQWN0b3JUeXBlc10gfVxuICAgICAgICAgICAgICA6IHt9KSxcbiAgICAgICAgICB9LFxuICAgICAgICAgIGJ5QWN0b3JJZDogY3R4LmFjdG9ySWQsXG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4geyBnYXRlOiBwLmdhdGUsIHBvbGljeTogZW5naW5lLmdldEdhdGVQb2xpY3kocC5nYXRlKSB9O1xuICAgICAgfVxuICAgICAgY2FzZSAnYXV0aHpfZXhwbGFpbic6IHtcbiAgICAgICAgY29uc3QgcCA9IHBhcnNlZCBhcyBBdXRoekV4cGxhaW5JbjtcbiAgICAgICAgcmV0dXJuIGVuZ2luZS5hdXRoekV4cGxhaW4oeyBhY3RvcklkOiBwLmFjdG9ySWQsIHBlcm1pc3Npb246IHAucGVybWlzc2lvbiBhcyBQZXJtaXNzaW9uIH0pO1xuICAgICAgfVxuICAgICAgY2FzZSAnaW1wb3J0X3N0b3JpZXMnOiB7XG4gICAgICAgIGNvbnN0IHAgPSBwYXJzZWQgYXMgSW1wb3J0U3Rvcmllc0luO1xuICAgICAgICByZXR1cm4gZW5naW5lLmltcG9ydFN0b3JpZXMoeyBmZWF0dXJlSWQ6IHAuZmVhdHVyZUlkLCB5YW1sOiBwLnlhbWwsIGFjdG9ySWQ6IGN0eC5hY3RvcklkIH0pO1xuICAgICAgfVxuXG4gICAgICAvLyAtLSBjbGFpbXMgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgIGNhc2UgJ2NsYWltX3Rhc2snOiB7XG4gICAgICAgIGNvbnN0IHAgPSBwYXJzZWQgYXMgQ2xhaW1UYXNrSW47XG4gICAgICAgIHJldHVybiBlbmdpbmUuY2xhaW1UYXNrKHtcbiAgICAgICAgICB3b3JrSXRlbUlkOiBwLndvcmtJdGVtSWQsXG4gICAgICAgICAgYWN0b3JJZDogY3R4LmFjdG9ySWQsXG4gICAgICAgICAgLi4uKHAudHRsTXMgIT09IHVuZGVmaW5lZCA/IHsgdHRsTXM6IHAudHRsTXMgfSA6IHt9KSxcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICBjYXNlICdoZWFydGJlYXQnOiB7XG4gICAgICAgIGNvbnN0IHAgPSBwYXJzZWQgYXMgSGVhcnRiZWF0SW47XG4gICAgICAgIGVuZ2luZS5oZWFydGJlYXQoeyBjbGFpbUlkOiBwLmNsYWltSWQgfSk7XG4gICAgICAgIHJldHVybiB7IHJlbmV3ZWQ6IHRydWUgfTtcbiAgICAgIH1cbiAgICAgIGNhc2UgJ3JlbGVhc2VfY2xhaW0nOiB7XG4gICAgICAgIGNvbnN0IHAgPSBwYXJzZWQgYXMgUmVsZWFzZUNsYWltSW47XG4gICAgICAgIGVuZ2luZS5yZWxlYXNlQ2xhaW0oe1xuICAgICAgICAgIGNsYWltSWQ6IHAuY2xhaW1JZCxcbiAgICAgICAgICAuLi4ocC5yZWFzb24gIT09IHVuZGVmaW5lZCA/IHsgcmVhc29uOiBwLnJlYXNvbiB9IDoge30pLFxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHsgcmVsZWFzZWQ6IHRydWUgfTtcbiAgICAgIH1cblxuICAgICAgLy8gLS0gbGlmZWN5Y2xlIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgIGNhc2UgJ2FkdmFuY2Vfc3RhdGUnOiB7XG4gICAgICAgIGNvbnN0IHAgPSBwYXJzZWQgYXMgQWR2YW5jZUluO1xuICAgICAgICByZXR1cm4gZW5naW5lLmFkdmFuY2VTdGF0ZSh7XG4gICAgICAgICAgd29ya0l0ZW1JZDogcC53b3JrSXRlbUlkLFxuICAgICAgICAgIHRvOiBwLnRvIGFzIFdvcmtJdGVtU3RhdGUsXG4gICAgICAgICAgYWN0b3JJZDogY3R4LmFjdG9ySWQsXG4gICAgICAgICAgLi4uKHAuZmVuY2luZ1Rva2VuICE9PSB1bmRlZmluZWQgPyB7IGZlbmNpbmdUb2tlbjogcC5mZW5jaW5nVG9rZW4gfSA6IHt9KSxcbiAgICAgICAgICAuLi4ocC5pZGVtcG90ZW5jeUtleSAhPT0gdW5kZWZpbmVkID8geyBpZGVtcG90ZW5jeUtleTogcC5pZGVtcG90ZW5jeUtleSB9IDoge30pLFxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIGNhc2UgJ2Jsb2NrX3Rhc2snOiB7XG4gICAgICAgIGNvbnN0IHAgPSBwYXJzZWQgYXMgQmxvY2tJbjtcbiAgICAgICAgcmV0dXJuIGVuZ2luZS5ibG9ja1Rhc2soe1xuICAgICAgICAgIHdvcmtJdGVtSWQ6IHAud29ya0l0ZW1JZCxcbiAgICAgICAgICByZWFzb246IHAucmVhc29uLFxuICAgICAgICAgIGFjdG9ySWQ6IGN0eC5hY3RvcklkLFxuICAgICAgICAgIC4uLihwLmZlbmNpbmdUb2tlbiAhPT0gdW5kZWZpbmVkID8geyBmZW5jaW5nVG9rZW46IHAuZmVuY2luZ1Rva2VuIH0gOiB7fSksXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgY2FzZSAndW5ibG9ja190YXNrJzoge1xuICAgICAgICBjb25zdCBwID0gcGFyc2VkIGFzIFdvcmtJdGVtSW47XG4gICAgICAgIHJldHVybiBlbmdpbmUudW5ibG9ja1Rhc2soeyB3b3JrSXRlbUlkOiBwLndvcmtJdGVtSWQsIGFjdG9ySWQ6IGN0eC5hY3RvcklkIH0pO1xuICAgICAgfVxuICAgICAgY2FzZSAnc3VibWl0X2V2aWRlbmNlJzoge1xuICAgICAgICBjb25zdCBwID0gcGFyc2VkIGFzIFN1Ym1pdEV2aWRlbmNlSW47XG4gICAgICAgIGVuZ2luZS5zdWJtaXRFdmlkZW5jZSh7XG4gICAgICAgICAgd29ya0l0ZW1JZDogcC53b3JrSXRlbUlkLFxuICAgICAgICAgIGV2aWRlbmNlOiBwLmV2aWRlbmNlIGFzIEV2aWRlbmNlLFxuICAgICAgICAgIGFjdG9ySWQ6IGN0eC5hY3RvcklkLFxuICAgICAgICAgIC4uLihwLmZlbmNpbmdUb2tlbiAhPT0gdW5kZWZpbmVkID8geyBmZW5jaW5nVG9rZW46IHAuZmVuY2luZ1Rva2VuIH0gOiB7fSksXG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4geyBzdWJtaXR0ZWQ6IHRydWUgfTtcbiAgICAgIH1cbiAgICAgIGNhc2UgJ2FwcHJvdmVfZ2F0ZSc6IHtcbiAgICAgICAgY29uc3QgcCA9IHBhcnNlZCBhcyBBcHByb3ZlR2F0ZUluO1xuICAgICAgICByZXR1cm4gZW5naW5lLmFwcHJvdmVHYXRlKHtcbiAgICAgICAgICB3b3JrSXRlbUlkOiBwLndvcmtJdGVtSWQsXG4gICAgICAgICAgZ2F0ZTogcC5nYXRlLFxuICAgICAgICAgIGFjdG9ySWQ6IGN0eC5hY3RvcklkLFxuICAgICAgICAgIC4uLihwLnBpbm5lZFZlcmlmaWNhdGlvbiAhPT0gdW5kZWZpbmVkXG4gICAgICAgICAgICA/IHsgcGlubmVkVmVyaWZpY2F0aW9uOiBwLnBpbm5lZFZlcmlmaWNhdGlvbiB9XG4gICAgICAgICAgICA6IHt9KSxcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICBjYXNlICdyZWplY3RfZ2F0ZSc6IHtcbiAgICAgICAgY29uc3QgcCA9IHBhcnNlZCBhcyBSZWplY3RHYXRlSW47XG4gICAgICAgIHJldHVybiBlbmdpbmUucmVqZWN0R2F0ZSh7IHdvcmtJdGVtSWQ6IHAud29ya0l0ZW1JZCwgZ2F0ZTogcC5nYXRlLCBhY3RvcklkOiBjdHguYWN0b3JJZCB9KTtcbiAgICAgIH1cbiAgICAgIGNhc2UgJ3JlbGVhc2VfZGlzcGF0Y2hfaG9sZCc6IHtcbiAgICAgICAgY29uc3QgcCA9IHBhcnNlZCBhcyBGZWF0dXJlSW47XG4gICAgICAgIHJldHVybiBlbmdpbmUucmVsZWFzZURpc3BhdGNoSG9sZCh7IGZlYXR1cmVJZDogcC5mZWF0dXJlSWQsIGFjdG9ySWQ6IGN0eC5hY3RvcklkIH0pO1xuICAgICAgfVxuXG4gICAgICAvLyAtLSBjb2xsYWJvcmF0aW9uIChQaGFzZSAzLCByb2FkbWFwIFx1MDBBNzUpIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgIC8vIEFjdG9yIGlkZW50aXR5IEFMV0FZUyBmcm9tIGN0eDogdGhlIHBvc3RlciwgcmVhZGVyLCBub3RpZmljYXRpb24gb3duZXJcbiAgICAgIC8vIGFuZCBqb2IgY29tcGxldGVyIGFyZSB0aGUgYXV0aGVudGljYXRlZCBhY3RvciBcdTIwMTQgbmV2ZXIgYSBib2R5IGZpZWxkLlxuICAgICAgY2FzZSAnY3JlYXRlX3RocmVhZCc6IHtcbiAgICAgICAgY29uc3QgcCA9IHBhcnNlZCBhcyBDcmVhdGVUaHJlYWRJbjtcbiAgICAgICAgcmV0dXJuIGVuZ2luZS5jcmVhdGVUaHJlYWQoe1xuICAgICAgICAgIGFjdG9ySWQ6IGN0eC5hY3RvcklkLFxuICAgICAgICAgIGtpbmQ6IHAua2luZCxcbiAgICAgICAgICAuLi4ocC5mZWF0dXJlSWQgIT09IHVuZGVmaW5lZCA/IHsgZmVhdHVyZUlkOiBwLmZlYXR1cmVJZCB9IDoge30pLFxuICAgICAgICAgIC4uLihwLndvcmtJdGVtSWQgIT09IHVuZGVmaW5lZCA/IHsgd29ya0l0ZW1JZDogcC53b3JrSXRlbUlkIH0gOiB7fSksXG4gICAgICAgICAgLi4uKHAudmlzaWJpbGl0eSAhPT0gdW5kZWZpbmVkID8geyB2aXNpYmlsaXR5OiBwLnZpc2liaWxpdHkgfSA6IHt9KSxcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICBjYXNlICdhZGRfdGhyZWFkX3BhcnRpY2lwYW50Jzoge1xuICAgICAgICBjb25zdCBwID0gcGFyc2VkIGFzIEFkZFRocmVhZFBhcnRpY2lwYW50SW47XG4gICAgICAgIHJldHVybiBlbmdpbmUuYWRkVGhyZWFkUGFydGljaXBhbnQoe1xuICAgICAgICAgIHRocmVhZElkOiBwLnRocmVhZElkLFxuICAgICAgICAgIGFjdG9ySWQ6IHAuYWN0b3JJZCxcbiAgICAgICAgICBieUFjdG9ySWQ6IGN0eC5hY3RvcklkLFxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIGNhc2UgJ3Bvc3RfbWVzc2FnZSc6IHtcbiAgICAgICAgY29uc3QgcCA9IHBhcnNlZCBhcyBQb3N0TWVzc2FnZUluO1xuICAgICAgICByZXR1cm4gZW5naW5lLnBvc3RNZXNzYWdlKHtcbiAgICAgICAgICB0aHJlYWRJZDogcC50aHJlYWRJZCxcbiAgICAgICAgICBhY3RvcklkOiBjdHguYWN0b3JJZCxcbiAgICAgICAgICBib2R5OiBwLmJvZHksXG4gICAgICAgICAgLi4uKHAucmVwbHlUbyAhPT0gdW5kZWZpbmVkID8geyByZXBseVRvOiBwLnJlcGx5VG8gfSA6IHt9KSxcbiAgICAgICAgICAuLi4ocC5tZW50aW9ucyAhPT0gdW5kZWZpbmVkID8geyBtZW50aW9uczogcC5tZW50aW9ucyB9IDoge30pLFxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIGNhc2UgJ2xpc3RfdGhyZWFkcyc6IHtcbiAgICAgICAgY29uc3QgcCA9IHBhcnNlZCBhcyBMaXN0VGhyZWFkc0luO1xuICAgICAgICByZXR1cm4gZW5naW5lLmxpc3RUaHJlYWRzKHtcbiAgICAgICAgICBhY3RvcklkOiBjdHguYWN0b3JJZCwgLy8gcHJpdmF0ZSB0aHJlYWRzIHN0YXkgaW52aXNpYmxlIHRvIG5vbi1wYXJ0aWNpcGFudHNcbiAgICAgICAgICAuLi4ocC5mZWF0dXJlSWQgIT09IHVuZGVmaW5lZCA/IHsgZmVhdHVyZUlkOiBwLmZlYXR1cmVJZCB9IDoge30pLFxuICAgICAgICAgIC4uLihwLndvcmtJdGVtSWQgIT09IHVuZGVmaW5lZCA/IHsgd29ya0l0ZW1JZDogcC53b3JrSXRlbUlkIH0gOiB7fSksXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgY2FzZSAnbGlzdF9tZXNzYWdlcyc6IHtcbiAgICAgICAgY29uc3QgcCA9IHBhcnNlZCBhcyBMaXN0TWVzc2FnZXNJbjtcbiAgICAgICAgcmV0dXJuIGVuZ2luZS5saXN0TWVzc2FnZXMoe1xuICAgICAgICAgIHRocmVhZElkOiBwLnRocmVhZElkLFxuICAgICAgICAgIGFjdG9ySWQ6IGN0eC5hY3RvcklkLFxuICAgICAgICAgIC4uLihwLnNpbmNlU2VxICE9PSB1bmRlZmluZWQgPyB7IHNpbmNlU2VxOiBwLnNpbmNlU2VxIH0gOiB7fSksXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgY2FzZSAnbGlzdF9tZW50aW9ucyc6IHtcbiAgICAgICAgY29uc3QgcCA9IHBhcnNlZCBhcyBMaXN0TWVudGlvbnNJbjtcbiAgICAgICAgcmV0dXJuIGVuZ2luZS5saXN0TWVudGlvbnMocC5tZXNzYWdlSWQpO1xuICAgICAgfVxuICAgICAgY2FzZSAnbGlzdF9ub3RpZmljYXRpb25zJzoge1xuICAgICAgICBjb25zdCBwID0gcGFyc2VkIGFzIExpc3ROb3RpZmljYXRpb25zSW47XG4gICAgICAgIHJldHVybiBlbmdpbmUubGlzdE5vdGlmaWNhdGlvbnMoe1xuICAgICAgICAgIGFjdG9ySWQ6IGN0eC5hY3RvcklkLFxuICAgICAgICAgIC4uLihwLnVucmVhZE9ubHkgIT09IHVuZGVmaW5lZCA/IHsgdW5yZWFkT25seTogcC51bnJlYWRPbmx5IH0gOiB7fSksXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgY2FzZSAnbWFya19ub3RpZmljYXRpb25fcmVhZCc6IHtcbiAgICAgICAgY29uc3QgcCA9IHBhcnNlZCBhcyBNYXJrTm90aWZpY2F0aW9uUmVhZEluO1xuICAgICAgICBlbmdpbmUubWFya05vdGlmaWNhdGlvblJlYWQoeyBub3RpZmljYXRpb25JZDogcC5ub3RpZmljYXRpb25JZCwgYWN0b3JJZDogY3R4LmFjdG9ySWQgfSk7XG4gICAgICAgIHJldHVybiB7IHJlYWQ6IHRydWUgfTtcbiAgICAgIH1cbiAgICAgIGNhc2UgJ2xpc3RfYWdlbnRfam9icyc6IHtcbiAgICAgICAgY29uc3QgcCA9IHBhcnNlZCBhcyBMaXN0QWdlbnRKb2JzSW47XG4gICAgICAgIHJldHVybiBlbmdpbmUubGlzdEFnZW50Sm9icyh7XG4gICAgICAgICAgLi4uKHAuYWdlbnRBY3RvcklkICE9PSB1bmRlZmluZWQgPyB7IGFnZW50QWN0b3JJZDogcC5hZ2VudEFjdG9ySWQgfSA6IHt9KSxcbiAgICAgICAgICAuLi4ocC5zdGF0dXMgIT09IHVuZGVmaW5lZCA/IHsgc3RhdHVzOiBwLnN0YXR1cyB9IDoge30pLFxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIGNhc2UgJ2NvbXBsZXRlX2FnZW50X2pvYic6IHtcbiAgICAgICAgY29uc3QgcCA9IHBhcnNlZCBhcyBDb21wbGV0ZUFnZW50Sm9iSW47XG4gICAgICAgIHJldHVybiBlbmdpbmUuY29tcGxldGVBZ2VudEpvYih7XG4gICAgICAgICAgam9iSWQ6IHAuam9iSWQsXG4gICAgICAgICAgYWN0b3JJZDogY3R4LmFjdG9ySWQsXG4gICAgICAgICAgc3RhdHVzOiBwLnN0YXR1cyxcbiAgICAgICAgICAuLi4ocC5ub3RlICE9PSB1bmRlZmluZWQgPyB7IG5vdGU6IHAubm90ZSB9IDoge30pLFxuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgLy8gLS0gcmVjb25jaWxpYXRpb24gKHJvYWRtYXAgXHUwMEE3MS42LCBkZXRlY3Qtb25seSkgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICAgY2FzZSAncmVjb25jaWxlJzoge1xuICAgICAgICBjb25zdCBwID0gcGFyc2VkIGFzIFJlY29uY2lsZUluO1xuICAgICAgICByZXR1cm4gZW5naW5lLnJlY29uY2lsZSh7IGZpbGVzOiBwLmZpbGVzIH0pO1xuICAgICAgfVxuXG4gICAgICAvLyAtLSBvcHMgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICBjYXNlICdmb3JjZV9yZWxlYXNlX2NsYWltJzoge1xuICAgICAgICBjb25zdCBwID0gcGFyc2VkIGFzIFdvcmtJdGVtSW47XG4gICAgICAgIGNvbnN0IHVucmVsZWFzZWQgPSBlbmdpbmUuZ2V0Q2xhaW1zKHAud29ya0l0ZW1JZCkuZmlsdGVyKChjbGFpbSkgPT4gIWNsYWltLnJlbGVhc2VkKTtcbiAgICAgICAgaWYgKHVucmVsZWFzZWQubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoYG5vIGxpdmUgY2xhaW0gb24gd29yayBpdGVtICR7cC53b3JrSXRlbUlkfWApO1xuICAgICAgICB9XG4gICAgICAgIGZvciAoY29uc3QgY2xhaW0gb2YgdW5yZWxlYXNlZCkge1xuICAgICAgICAgIGVuZ2luZS5yZWxlYXNlQ2xhaW0oeyBjbGFpbUlkOiBjbGFpbS5pZCwgcmVhc29uOiAnb3BzIGZvcmNlIHJlbGVhc2UnIH0pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB7IHJlbGVhc2VkOiB1bnJlbGVhc2VkLm1hcCgoY2xhaW0pID0+IGNsYWltLmlkKSB9O1xuICAgICAgfVxuXG4gICAgICAvLyAtLSBxdWVyaWVzIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgIGNhc2UgJ2dldF93b3JrX2l0ZW0nOiB7XG4gICAgICAgIGNvbnN0IHAgPSBwYXJzZWQgYXMgV29ya0l0ZW1JbjtcbiAgICAgICAgcmV0dXJuIGVuZ2luZS5nZXRXb3JrSXRlbShwLndvcmtJdGVtSWQpO1xuICAgICAgfVxuICAgICAgY2FzZSAnZ2V0X2ZlYXR1cmUnOiB7XG4gICAgICAgIGNvbnN0IHAgPSBwYXJzZWQgYXMgRmVhdHVyZUluO1xuICAgICAgICByZXR1cm4gZW5naW5lLmdldEZlYXR1cmUocC5mZWF0dXJlSWQpO1xuICAgICAgfVxuICAgICAgY2FzZSAnZ2V0X3Rhc2tfY29udGV4dCc6IHtcbiAgICAgICAgY29uc3QgcCA9IHBhcnNlZCBhcyBXb3JrSXRlbUluO1xuICAgICAgICByZXR1cm4gZW5naW5lLmdldFRhc2tDb250ZXh0KHsgd29ya0l0ZW1JZDogcC53b3JrSXRlbUlkIH0pO1xuICAgICAgfVxuICAgICAgY2FzZSAnbGlzdF93b3JrX2l0ZW1zJzoge1xuICAgICAgICBjb25zdCBwID0gcGFyc2VkIGFzIExpc3RXb3JrSXRlbXNJbjtcbiAgICAgICAgcmV0dXJuIGVuZ2luZS5saXN0V29ya0l0ZW1zKHtcbiAgICAgICAgICAuLi4ocC5zdGF0ZSAhPT0gdW5kZWZpbmVkID8geyBzdGF0ZTogcC5zdGF0ZSBhcyBXb3JrSXRlbVN0YXRlIH0gOiB7fSksXG4gICAgICAgICAgLi4uKHAuZmVhdHVyZUlkICE9PSB1bmRlZmluZWQgPyB7IGZlYXR1cmVJZDogcC5mZWF0dXJlSWQgfSA6IHt9KSxcbiAgICAgICAgICAuLi4ocC5jbGFpbWFibGUgIT09IHVuZGVmaW5lZCA/IHsgY2xhaW1hYmxlOiBwLmNsYWltYWJsZSB9IDoge30pLFxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIGNhc2UgJ2luYm94Jzoge1xuICAgICAgICBjb25zdCBhd2FpdGluZ1NwZWMgPSBlbmdpbmVcbiAgICAgICAgICAubGlzdFdvcmtJdGVtcyh7IHN0YXRlOiAnZHJhZnQnIH0pXG4gICAgICAgICAgLmZpbHRlcigoaXRlbSkgPT4gaXRlbS5zcGVjQ2hlY2twb2ludCk7XG4gICAgICAgIGNvbnN0IGF3YWl0aW5nUmV2aWV3ID0gZW5naW5lLmxpc3RXb3JrSXRlbXMoeyBzdGF0ZTogJ2luX3JldmlldycgfSk7XG4gICAgICAgIHJldHVybiB7IGF3YWl0aW5nU3BlYywgYXdhaXRpbmdSZXZpZXcgfTtcbiAgICAgIH1cbiAgICAgIGNhc2UgJ3F1ZXJ5X2V2ZW50cyc6IHtcbiAgICAgICAgY29uc3QgcCA9IHBhcnNlZCBhcyBRdWVyeUV2ZW50c0luO1xuICAgICAgICByZXR1cm4gZW5naW5lLmV2ZW50cyhwLnN0cmVhbUlkKTtcbiAgICAgIH1cbiAgICAgIGNhc2UgJ2dldF9jbGFpbXMnOiB7XG4gICAgICAgIGNvbnN0IHAgPSBwYXJzZWQgYXMgV29ya0l0ZW1JbjtcbiAgICAgICAgcmV0dXJuIGVuZ2luZS5nZXRDbGFpbXMocC53b3JrSXRlbUlkKTtcbiAgICAgIH1cbiAgICAgIGNhc2UgJ3dob2FtaSc6IHtcbiAgICAgICAgcmV0dXJuIHsgYWN0b3JJZDogY3R4LmFjdG9ySWQsIGlzQWRtaW46IGN0eC5pc0FkbWluIH07XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gVW5yZWFjaGFibGUgd2hpbGUgdGhlIHN3aXRjaCBjb3ZlcnMgdGhlIHJlZ2lzdHJ5OyBrZWVwcyB0aGUgY29tcGlsZXIgaG9uZXN0LlxuICAgIHRocm93IG5ldyBHdWFyZEZhaWxlZEVycm9yKGBjb21tYW5kIG5vdCB3aXJlZCB0byB0aGUgYnVzOiAke2NvbW1hbmR9YCk7XG4gIH1cblxuICByZXR1cm4geyBleGVjdXRlLCBlbmdpbmUgfTtcbn1cbiIsICIvKipcbiAqIE1DUCBhZGFwdGVyIFx1MjAxNCBldmVyeSByZWdpc3RyeSBlbnRyeSBpbiBDT01NQU5EUyBiZWNvbWVzIG9uZSB0b29sOyBldmVyeVxuICogdG9vbCBoYW5kbGVyIGNhbGxzIHRoZSBTQU1FIGJ1cy5leGVjdXRlIHRoZSBIVFRQIHJvdXRlIGNhbGxzLiBObyBsb2dpY1xuICogbGl2ZXMgaGVyZSAocm9hZG1hcCBcdTAwQTcyLjI6IHN0cnVjdHVyYWxseSBpZGVudGljYWwgc2VtYW50aWNzLCBENSkuXG4gKlxuICogREVDSVNJT04gKHJlY29yZGVkKTogd2UgdXNlIHRoZSBsb3ctbGV2ZWwgYFNlcnZlcmAgK1xuICogc2V0UmVxdWVzdEhhbmRsZXIoTGlzdFRvb2xzL0NhbGxUb29sKSBpbnN0ZWFkIG9mIGBNY3BTZXJ2ZXIucmVnaXN0ZXJUb29sYC5cbiAqIFNESyAxLjI5J3MgTWNwU2VydmVyIGFjY2VwdHMgem9kIHNjaGVtYXMgYW5kIHJlLWVtaXRzIEpTT04gU2NoZW1hIHRocm91Z2hcbiAqIGl0cyBvd24gY29tcGF0IGxheWVyICh6b2QgdjQgYnJhbmNoIHRhcmdldHMgZHJhZnQtNyk7IGNvbnRyYWN0cydcbiAqIGlucHV0SnNvblNjaGVtYSgpIGlzIHpvZCB2NCdzIG5hdGl2ZSBkcmFmdC0yMDIwLTEyIGVtaXNzaW9uLiBGZWVkaW5nIHRoZVxuICogY29udHJhY3RzIEpTT04gU2NoZW1hIHZlcmJhdGltIHRocm91Z2ggdGhlIGxvdy1sZXZlbCBBUEkga2VlcHNcbiAqIFwidG9vbCBpbnB1dFNjaGVtYSA9PT0gaW5wdXRKc29uU2NoZW1hKGNvbW1hbmQpXCIgYnl0ZS1pZGVudGljYWwgXHUyMDE0IHBhcml0eSBpc1xuICogYXNzZXJ0ZWQgYnkgZGVlcC1lcXVhbGl0eSBpbiB0ZXN0L3Bhcml0eS50ZXN0LnRzLlxuICovXG5pbXBvcnQgeyBTZXJ2ZXIgfSBmcm9tICdAbW9kZWxjb250ZXh0cHJvdG9jb2wvc2RrL3NlcnZlci9pbmRleC5qcyc7XG5pbXBvcnQgeyBTdHJlYW1hYmxlSFRUUFNlcnZlclRyYW5zcG9ydCB9IGZyb20gJ0Btb2RlbGNvbnRleHRwcm90b2NvbC9zZGsvc2VydmVyL3N0cmVhbWFibGVIdHRwLmpzJztcbmltcG9ydCB7XG4gIENhbGxUb29sUmVxdWVzdFNjaGVtYSxcbiAgTGlzdFRvb2xzUmVxdWVzdFNjaGVtYSxcbiAgdHlwZSBDYWxsVG9vbFJlc3VsdCxcbn0gZnJvbSAnQG1vZGVsY29udGV4dHByb3RvY29sL3Nkay90eXBlcy5qcyc7XG5pbXBvcnQgdHlwZSB7IEZhc3RpZnlJbnN0YW5jZSwgRmFzdGlmeVJlcXVlc3QgfSBmcm9tICdmYXN0aWZ5JztcbmltcG9ydCB7XG4gIENPTU1BTkRTLFxuICBpbnB1dEpzb25TY2hlbWEsXG4gIG1jcFRvb2xOYW1lLFxuICB0eXBlIEFjdG9yQ29udGV4dCxcbiAgdHlwZSBDb21tYW5kQnVzLFxufSBmcm9tICdAb2Focy9jb250cmFjdHMnO1xuXG5pbXBvcnQgeyBlcnJvck5hbWUgfSBmcm9tICcuL3NlcnZlci5qcyc7XG5cbmNvbnN0IFRPT0xfVE9fQ09NTUFORDogUmVhZG9ubHlNYXA8c3RyaW5nLCBzdHJpbmc+ID0gbmV3IE1hcChcbiAgQ09NTUFORFMubWFwKChjb21tYW5kKSA9PiBbbWNwVG9vbE5hbWUoY29tbWFuZC5uYW1lKSwgY29tbWFuZC5uYW1lXSksXG4pO1xuXG4vKipcbiAqIEJ1aWxkIG9uZSBNQ1Agc2VydmVyIGJvdW5kIHRvIGFuIGF1dGhlbnRpY2F0ZWQgYWN0b3IgY29udGV4dC4gU3RhdGVsZXNzXG4gKiBIVFRQIG1vdW50cyBjb25zdHJ1Y3Qgb25lIHBlciByZXF1ZXN0OyB0ZXN0cyB3aXJlIG9uZSB0byBhblxuICogSW5NZW1vcnlUcmFuc3BvcnQgZGlyZWN0bHkuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBidWlsZE1jcFNlcnZlcihidXM6IENvbW1hbmRCdXMsIGN0eDogQWN0b3JDb250ZXh0KTogU2VydmVyIHtcbiAgY29uc3Qgc2VydmVyID0gbmV3IFNlcnZlcihcbiAgICB7IG5hbWU6ICdvYWhzLXNwaW5lJywgdmVyc2lvbjogJzAuMC4xJyB9LFxuICAgIHsgY2FwYWJpbGl0aWVzOiB7IHRvb2xzOiB7fSB9IH0sXG4gICk7XG5cbiAgc2VydmVyLnNldFJlcXVlc3RIYW5kbGVyKExpc3RUb29sc1JlcXVlc3RTY2hlbWEsIGFzeW5jICgpID0+ICh7XG4gICAgdG9vbHM6IENPTU1BTkRTLm1hcCgoY29tbWFuZCkgPT4gKHtcbiAgICAgIG5hbWU6IG1jcFRvb2xOYW1lKGNvbW1hbmQubmFtZSksXG4gICAgICBkZXNjcmlwdGlvbjogY29tbWFuZC5kZXNjcmlwdGlvbixcbiAgICAgIC8vIFZlcmJhdGltIGZyb20gY29udHJhY3RzIFx1MjAxNCB0aGUgcGFyaXR5IHRlc3QgZGVlcC1lcXVhbHMgdGhpcy5cbiAgICAgIGlucHV0U2NoZW1hOiBpbnB1dEpzb25TY2hlbWEoY29tbWFuZC5uYW1lKSBhcyB7IHR5cGU6ICdvYmplY3QnOyBbazogc3RyaW5nXTogdW5rbm93biB9LFxuICAgIH0pKSxcbiAgfSkpO1xuXG4gIHNlcnZlci5zZXRSZXF1ZXN0SGFuZGxlcihDYWxsVG9vbFJlcXVlc3RTY2hlbWEsIGFzeW5jIChyZXF1ZXN0KTogUHJvbWlzZTxDYWxsVG9vbFJlc3VsdD4gPT4ge1xuICAgIGNvbnN0IGNvbW1hbmROYW1lID0gVE9PTF9UT19DT01NQU5ELmdldChyZXF1ZXN0LnBhcmFtcy5uYW1lKTtcbiAgICBpZiAoY29tbWFuZE5hbWUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgY29udGVudDogW3sgdHlwZTogJ3RleHQnLCB0ZXh0OiBgdW5rbm93biB0b29sOiAke3JlcXVlc3QucGFyYW1zLm5hbWV9YCB9XSxcbiAgICAgICAgaXNFcnJvcjogdHJ1ZSxcbiAgICAgIH07XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAvLyBUaGUgZXhhY3Qgc2FtZSBjYWxsIHRoZSBIVFRQIHJvdXRlIG1ha2VzIFx1MjAxNCBubyBNQ1Atb25seSBsb2dpYy5cbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGJ1cy5leGVjdXRlKGNvbW1hbmROYW1lLCByZXF1ZXN0LnBhcmFtcy5hcmd1bWVudHMgPz8ge30sIGN0eCk7XG4gICAgICByZXR1cm4geyBjb250ZW50OiBbeyB0eXBlOiAndGV4dCcsIHRleHQ6IEpTT04uc3RyaW5naWZ5KHJlc3VsdCA/PyBudWxsKSB9XSB9O1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgdHlwZTogJ3RleHQnLFxuICAgICAgICAgICAgdGV4dDogSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICAgICAgICBlcnJvcjoge1xuICAgICAgICAgICAgICAgIG5hbWU6IGVycm9yTmFtZShlcnJvciksXG4gICAgICAgICAgICAgICAgbWVzc2FnZTogZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpLFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSksXG4gICAgICAgICAgfSxcbiAgICAgICAgXSxcbiAgICAgICAgaXNFcnJvcjogdHJ1ZSxcbiAgICAgIH07XG4gICAgfVxuICB9KTtcblxuICByZXR1cm4gc2VydmVyO1xufVxuXG4vKipcbiAqIE1vdW50IFBPU1QgL21jcCBvbiB0aGUgRmFzdGlmeSBhcHAgXHUyMDE0IHN0YXRlbGVzcyBTdHJlYW1hYmxlSFRUUCBwYXR0ZXJuXG4gKiAoc2Vzc2lvbklkR2VuZXJhdG9yOiB1bmRlZmluZWQpOiBhIGZyZXNoIHNlcnZlcit0cmFuc3BvcnQgcGFpciBwZXIgcmVxdWVzdCxcbiAqIGZ1bGx5IGlzb2xhdGVkLCBubyBzZXNzaW9uIHN0YXRlIHRvIGxlYWsgYmV0d2VlbiBhY3RvcnMuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZWdpc3Rlck1jcFJvdXRlKFxuICBhcHA6IEZhc3RpZnlJbnN0YW5jZSxcbiAgYnVzOiBDb21tYW5kQnVzLFxuICBhdXRoZW50aWNhdGU6IChyZXF1ZXN0OiBGYXN0aWZ5UmVxdWVzdCkgPT4gQWN0b3JDb250ZXh0IHwgbnVsbCxcbik6IHZvaWQge1xuICBhcHAucG9zdCgnL21jcCcsIGFzeW5jIChyZXF1ZXN0LCByZXBseSkgPT4ge1xuICAgIGNvbnN0IGN0eCA9IGF1dGhlbnRpY2F0ZShyZXF1ZXN0KTtcbiAgICBpZiAoY3R4ID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gcmVwbHlcbiAgICAgICAgLmNvZGUoNDAxKVxuICAgICAgICAuc2VuZCh7IGpzb25ycGM6ICcyLjAnLCBlcnJvcjogeyBjb2RlOiAtMzIwMDEsIG1lc3NhZ2U6ICd1bmF1dGhvcml6ZWQnIH0sIGlkOiBudWxsIH0pO1xuICAgIH1cblxuICAgIGNvbnN0IHNlcnZlciA9IGJ1aWxkTWNwU2VydmVyKGJ1cywgY3R4KTtcbiAgICAvLyBTdGF0ZWxlc3MgbW9kZTogc2Vzc2lvbklkR2VuZXJhdG9yIG9taXR0ZWQgKFx1MjI2MSB1bmRlZmluZWQgXHUyMDE0IHRoZSBTREsnc1xuICAgIC8vIGRvY3VtZW50ZWQgc3RhdGVsZXNzIHBhdHRlcm47IHRoZSBrZXkgaXMgbGVmdCBvdXQgb25seSBiZWNhdXNlIHRoZSBTREtcbiAgICAvLyBvcHRpb25zIHR5cGUgaXMgbm90IGV4YWN0T3B0aW9uYWxQcm9wZXJ0eVR5cGVzLWNsZWFuKS5cbiAgICBjb25zdCB0cmFuc3BvcnQgPSBuZXcgU3RyZWFtYWJsZUhUVFBTZXJ2ZXJUcmFuc3BvcnQoeyBlbmFibGVKc29uUmVzcG9uc2U6IHRydWUgfSk7XG5cbiAgICByZXBseS5oaWphY2soKTtcbiAgICB0cnkge1xuICAgICAgLy8gQ2FzdDogdGhlIFNESydzIFRyYW5zcG9ydCBpbnRlcmZhY2UgaXMgbm90IGV4YWN0T3B0aW9uYWxQcm9wZXJ0eVR5cGVzLWNsZWFuLlxuICAgICAgYXdhaXQgc2VydmVyLmNvbm5lY3QodHJhbnNwb3J0IGFzIHVua25vd24gYXMgUGFyYW1ldGVyczx0eXBlb2Ygc2VydmVyLmNvbm5lY3Q+WzBdKTtcbiAgICAgIC8vIEpTT04tcmVzcG9uc2UgbW9kZTogcmVzb2x2ZXMgb25jZSB0aGUgcmVzcG9uc2UgaGFzIGJlZW4gd3JpdHRlbi5cbiAgICAgIC8vIChEbyBOT1QgY2xvc2Ugb24gcmVxdWVzdC5yYXcgJ2Nsb3NlJyBcdTIwMTQgTm9kZSBlbWl0cyBpdCBhcyBzb29uIGFzIHRoZVxuICAgICAgLy8gcGFyc2VkIHJlcXVlc3Qgc3RyZWFtIGVuZHMsIHdoaWNoIHdvdWxkIGtpbGwgdGhlIHBlbmRpbmcgcmVzcG9uc2UuKVxuICAgICAgYXdhaXQgdHJhbnNwb3J0LmhhbmRsZVJlcXVlc3QocmVxdWVzdC5yYXcsIHJlcGx5LnJhdywgcmVxdWVzdC5ib2R5KTtcbiAgICB9IGZpbmFsbHkge1xuICAgICAgdm9pZCB0cmFuc3BvcnQuY2xvc2UoKTtcbiAgICAgIHZvaWQgc2VydmVyLmNsb3NlKCk7XG4gICAgfVxuICAgIHJldHVybiByZXBseTtcbiAgfSk7XG59XG4iLCAiLyoqXG4gKiBHRVQgL2V2ZW50cy9zdHJlYW0gXHUyMDE0IFNlcnZlci1TZW50IEV2ZW50cyByZWxheSBvZiB0aGUgYXBwZW5kLW9ubHkgZXZlbnQgbG9nLlxuICpcbiAqIFJlYWQtb25seSBzdXJmYWNlIChuZXZlciBhIHdyaXRlIHBhdGgpOiBlYWNoIFNTRSBmcmFtZSBpcyBvbmUgU3BpbmVFdmVudCBhc1xuICogSlNPTiB3aXRoIGBpZDogPGdsb2JhbFNlcT5gLCBzbyBzdGFuZGFyZCBFdmVudFNvdXJjZSByZWNvbm5lY3Rpb25cbiAqIChMYXN0LUV2ZW50LUlEKSByZXN1bWVzIGV4YWN0bHkgd2hlcmUgdGhlIGNsaWVudCBsZWZ0IG9mZjsgYD9zaW5jZT08c2VxPmBcbiAqIGRvZXMgdGhlIHNhbWUgZm9yIGEgZmlyc3QgY29ubmVjdC5cbiAqXG4gKiBUb2RheSB0aGUgcmVsYXkgUE9MTFMgZW5naW5lLmV2ZW50cygpICgzMDBtcykgYmVoaW5kIHRoZSBFdmVudFRhaWxcbiAqIGludGVyZmFjZTsgYSByZWFsIHRyYW5zYWN0aW9uYWwgb3V0Ym94IGNhbiByZXBsYWNlIHBvbGxpbmdFdmVudFRhaWwgd2l0aG91dFxuICogdG91Y2hpbmcgdGhlIHJvdXRlLiBIZWFydGJlYXQgY29tbWVudHMgZXZlcnkgMTVzIGtlZXAgcHJveGllcyBmcm9tIHRpbWluZ1xuICogb3V0IHRoZSBpZGxlIHN0cmVhbTsgZXZlcnkgdGltZXIgaXMgY2xlYXJlZCBvbiBjbGllbnQgZGlzY29ubmVjdCBhbmQgb25cbiAqIHNlcnZlciBjbG9zZS5cbiAqL1xuaW1wb3J0IHR5cGUgeyBGYXN0aWZ5SW5zdGFuY2UsIEZhc3RpZnlSZXF1ZXN0IH0gZnJvbSAnZmFzdGlmeSc7XG5pbXBvcnQgdHlwZSB7IFNwaW5lRW5naW5lLCBTcGluZUV2ZW50IH0gZnJvbSAnQG9haHMvY29yZSc7XG5pbXBvcnQgdHlwZSB7IEFjdG9yQ29udGV4dCwgRXJyb3JFbnZlbG9wZSB9IGZyb20gJ0BvYWhzL2NvbnRyYWN0cyc7XG5cbi8qKiBBYnN0cmFjdCBvcmRlcmVkIGV2ZW50IHNvdXJjZTogZXZlcnl0aGluZyBzdHJpY3RseSBhZnRlciBhIGdsb2JhbCBzZXEuICovXG5leHBvcnQgaW50ZXJmYWNlIEV2ZW50VGFpbCB7XG4gIGFmdGVyKGdsb2JhbFNlcTogbnVtYmVyKTogU3BpbmVFdmVudFtdO1xufVxuXG4vKiogUG9sbGluZyBpbXBsZW1lbnRhdGlvbiBvdmVyIGVuZ2luZS5ldmVudHMoKSBcdTIwMTQgc3dhcHBlZCBmb3IgYW4gb3V0Ym94IGxhdGVyLiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBvbGxpbmdFdmVudFRhaWwoZW5naW5lOiBTcGluZUVuZ2luZSk6IEV2ZW50VGFpbCB7XG4gIHJldHVybiB7XG4gICAgYWZ0ZXIoZ2xvYmFsU2VxOiBudW1iZXIpOiBTcGluZUV2ZW50W10ge1xuICAgICAgcmV0dXJuIGVuZ2luZS5ldmVudHMoKS5maWx0ZXIoKGV2ZW50KSA9PiBldmVudC5nbG9iYWxTZXEgPiBnbG9iYWxTZXEpO1xuICAgIH0sXG4gIH07XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgRXZlbnRTdHJlYW1PcHRpb25zIHtcbiAgLyoqIFBvbGwgaW50ZXJ2YWwgZm9yIG5ldyBldmVudHMgKG1zKS4gRGVmYXVsdCAzMDAuICovXG4gIHBvbGxNcz86IG51bWJlcjtcbiAgLyoqIEhlYXJ0YmVhdCBjb21tZW50IGludGVydmFsIChtcykuIERlZmF1bHQgMTUwMDAuICovXG4gIGhlYXJ0YmVhdE1zPzogbnVtYmVyO1xufVxuXG5mdW5jdGlvbiBwYXJzZUN1cnNvcihyZXF1ZXN0OiBGYXN0aWZ5UmVxdWVzdCk6IG51bWJlciB7XG4gIC8vIFNTRSByZWNvbm5lY3Rpb24gd2luczogdGhlIGJyb3dzZXIgRXZlbnRTb3VyY2UgcmVzZW5kcyB0aGUgbGFzdCBzZWVuIGlkLlxuICBjb25zdCBsYXN0RXZlbnRJZCA9IHJlcXVlc3QuaGVhZGVyc1snbGFzdC1ldmVudC1pZCddO1xuICBjb25zdCByYXcgPVxuICAgIHR5cGVvZiBsYXN0RXZlbnRJZCA9PT0gJ3N0cmluZycgJiYgbGFzdEV2ZW50SWQudHJpbSgpICE9PSAnJ1xuICAgICAgPyBsYXN0RXZlbnRJZFxuICAgICAgOiAocmVxdWVzdC5xdWVyeSBhcyB7IHNpbmNlPzogc3RyaW5nIH0pLnNpbmNlO1xuICBpZiAocmF3ID09PSB1bmRlZmluZWQpIHJldHVybiAwO1xuICBjb25zdCBwYXJzZWQgPSBOdW1iZXIocmF3KTtcbiAgcmV0dXJuIE51bWJlci5pc0Zpbml0ZShwYXJzZWQpICYmIHBhcnNlZCA+PSAwID8gTWF0aC5mbG9vcihwYXJzZWQpIDogMDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJlZ2lzdGVyRXZlbnRTdHJlYW0oXG4gIGFwcDogRmFzdGlmeUluc3RhbmNlLFxuICB0YWlsOiBFdmVudFRhaWwsXG4gIGF1dGhlbnRpY2F0ZTogKHJlcXVlc3Q6IEZhc3RpZnlSZXF1ZXN0KSA9PiBBY3RvckNvbnRleHQgfCBudWxsLFxuICBvcHRpb25zOiBFdmVudFN0cmVhbU9wdGlvbnMgPSB7fSxcbik6IHZvaWQge1xuICBjb25zdCBwb2xsTXMgPSBvcHRpb25zLnBvbGxNcyA/PyAzMDA7XG4gIGNvbnN0IGhlYXJ0YmVhdE1zID0gb3B0aW9ucy5oZWFydGJlYXRNcyA/PyAxNV8wMDA7XG4gIGNvbnN0IGNsZWFudXBzID0gbmV3IFNldDwoKSA9PiB2b2lkPigpO1xuXG4gIC8vIEEgaGlqYWNrZWQgU1NFIHJlc3BvbnNlIG91dGxpdmVzIEZhc3RpZnkncyByZXF1ZXN0IGxpZmVjeWNsZSBcdTIwMTQgY2xvc2UgYWxsXG4gIC8vIGxpdmUgc3RyZWFtcyB3aGVuIHRoZSBzZXJ2ZXIgY2xvc2VzIHNvIHRlc3RzIChhbmQgc2h1dGRvd25zKSBuZXZlciBoYW5nLlxuICBhcHAuYWRkSG9vaygnb25DbG9zZScsIChfaW5zdGFuY2UsIGRvbmUpID0+IHtcbiAgICBmb3IgKGNvbnN0IGNsZWFudXAgb2YgWy4uLmNsZWFudXBzXSkgY2xlYW51cCgpO1xuICAgIGRvbmUoKTtcbiAgfSk7XG5cbiAgYXBwLmdldCgnL2V2ZW50cy9zdHJlYW0nLCAocmVxdWVzdCwgcmVwbHkpID0+IHtcbiAgICBjb25zdCBjdHggPSBhdXRoZW50aWNhdGUocmVxdWVzdCk7XG4gICAgaWYgKGN0eCA9PT0gbnVsbCkge1xuICAgICAgdm9pZCByZXBseS5jb2RlKDQwMSkuc2VuZCh7XG4gICAgICAgIG9rOiBmYWxzZSxcbiAgICAgICAgZXJyb3I6IHsgbmFtZTogJ0Vycm9yJywgbWVzc2FnZTogJ3VuYXV0aG9yaXplZDogbWlzc2luZyBvciBpbnZhbGlkIGJlYXJlciB0b2tlbicgfSxcbiAgICAgIH0gc2F0aXNmaWVzIEVycm9yRW52ZWxvcGUpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGxldCBjdXJzb3IgPSBwYXJzZUN1cnNvcihyZXF1ZXN0KTtcblxuICAgIHJlcGx5LmhpamFjaygpO1xuICAgIGNvbnN0IHJlcyA9IHJlcGx5LnJhdztcbiAgICByZXMud3JpdGVIZWFkKDIwMCwge1xuICAgICAgJ2NvbnRlbnQtdHlwZSc6ICd0ZXh0L2V2ZW50LXN0cmVhbScsXG4gICAgICAnY2FjaGUtY29udHJvbCc6ICduby1jYWNoZSwgbm8tdHJhbnNmb3JtJyxcbiAgICAgIGNvbm5lY3Rpb246ICdrZWVwLWFsaXZlJyxcbiAgICAgICd4LWFjY2VsLWJ1ZmZlcmluZyc6ICdubycsXG4gICAgfSk7XG4gICAgcmVzLndyaXRlKCc6IGNvbm5lY3RlZFxcblxcbicpO1xuXG4gICAgY29uc3QgZmx1c2ggPSAoKTogdm9pZCA9PiB7XG4gICAgICBmb3IgKGNvbnN0IGV2ZW50IG9mIHRhaWwuYWZ0ZXIoY3Vyc29yKSkge1xuICAgICAgICBjdXJzb3IgPSBldmVudC5nbG9iYWxTZXE7XG4gICAgICAgIHJlcy53cml0ZShgaWQ6ICR7ZXZlbnQuZ2xvYmFsU2VxfVxcbmRhdGE6ICR7SlNPTi5zdHJpbmdpZnkoZXZlbnQpfVxcblxcbmApO1xuICAgICAgfVxuICAgIH07XG4gICAgZmx1c2goKTtcblxuICAgIGNvbnN0IHBvbGwgPSBzZXRJbnRlcnZhbChmbHVzaCwgcG9sbE1zKTtcbiAgICBjb25zdCBoZWFydGJlYXQgPSBzZXRJbnRlcnZhbCgoKSA9PiB7XG4gICAgICByZXMud3JpdGUoJzogaGVhcnRiZWF0XFxuXFxuJyk7XG4gICAgfSwgaGVhcnRiZWF0TXMpO1xuXG4gICAgY29uc3QgY2xlYW51cCA9ICgpOiB2b2lkID0+IHtcbiAgICAgIGNsZWFySW50ZXJ2YWwocG9sbCk7XG4gICAgICBjbGVhckludGVydmFsKGhlYXJ0YmVhdCk7XG4gICAgICBjbGVhbnVwcy5kZWxldGUoY2xlYW51cCk7XG4gICAgICBpZiAoIXJlcy53cml0YWJsZUVuZGVkKSByZXMuZW5kKCk7XG4gICAgfTtcbiAgICBjbGVhbnVwcy5hZGQoY2xlYW51cCk7XG4gICAgLy8gUmVzcG9uc2UgJ2Nsb3NlJyBmaXJlcyB3aGVuIHRoZSB1bmRlcmx5aW5nIHNvY2tldCBnb2VzIGF3YXkgXHUyMDE0IGNsaWVudFxuICAgIC8vIGRpc2Nvbm5lY3RzIGluY2x1ZGVkLiAocmVxdWVzdC5yYXcgJ2Nsb3NlJyBmaXJlcyBhcyBzb29uIGFzIHRoZSBwYXJzZWRcbiAgICAvLyByZXF1ZXN0IHN0cmVhbSBlbmRzLCB3aGljaCBpcyBpbW1lZGlhdGVseSBmb3IgYSBHRVQuKVxuICAgIHJlcy5vbignY2xvc2UnLCBjbGVhbnVwKTtcbiAgfSk7XG59XG4iLCAiLyoqXG4gKiBHRVQgL3VpIFx1MjAxNCB0aGUgc3RhdGljIGNoYXQgVUkgKEQzKS4gVGhyZWUgZmlsZXMgb3V0IG9mIHB1YmxpYy8gKGJ1aWx0IGJ5XG4gKiBzY3JpcHRzL2J1aWxkLXVpLm1qcyksIHNlcnZlZCB3aXRoIHBsYWluIHJlYWRGaWxlU3luYyBcdTIwMTQgbm8gQGZhc3RpZnkvc3RhdGljXG4gKiBkZXBlbmRlbmN5IGZvciB0aHJlZSBmaWxlcywgYW5kIE5PIG5ldyBzZXJ2ZXIgbG9naWM6IHRoZSBVSSB0YWxrcyB0byB0aGVcbiAqIHNhbWUgL3JwYy8qICsgL2V2ZW50cy9zdHJlYW0gc3VyZmFjZXMgYXMgZXZlcnkgb3RoZXIgY2xpZW50LCBhdXRoZW50aWNhdGVkXG4gKiBieSB0aGUgYmVhcmVyIHRva2VuIHRoZSB1c2VyIHBhc3RlcyBpbi4gVGhlIHN0YXRpYyByb3V0ZXMgdGhlbXNlbHZlcyBhcmVcbiAqIHVuYXV0aGVudGljYXRlZCBvbiBwdXJwb3NlIChsb2dpbiBoYXBwZW5zIGluLWFwcCkuXG4gKi9cbmltcG9ydCB7IHJlYWRGaWxlU3luYyB9IGZyb20gJ25vZGU6ZnMnO1xuaW1wb3J0IHsgZGlybmFtZSwgam9pbiB9IGZyb20gJ25vZGU6cGF0aCc7XG5pbXBvcnQgeyBmaWxlVVJMVG9QYXRoIH0gZnJvbSAnbm9kZTp1cmwnO1xuaW1wb3J0IHR5cGUgeyBGYXN0aWZ5SW5zdGFuY2UgfSBmcm9tICdmYXN0aWZ5JztcblxuY29uc3QgcHVibGljRGlyID0gam9pbihkaXJuYW1lKGZpbGVVUkxUb1BhdGgoaW1wb3J0Lm1ldGEudXJsKSksICcuLicsICdwdWJsaWMnKTtcblxuY29uc3QgQ09OVEVOVF9UWVBFUzogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHtcbiAgJy5odG1sJzogJ3RleHQvaHRtbDsgY2hhcnNldD11dGYtOCcsXG4gICcuanMnOiAndGV4dC9qYXZhc2NyaXB0OyBjaGFyc2V0PXV0Zi04JyxcbiAgJy5jc3MnOiAndGV4dC9jc3M7IGNoYXJzZXQ9dXRmLTgnLFxufTtcblxuZXhwb3J0IGZ1bmN0aW9uIHJlZ2lzdGVyVWlSb3V0ZXMoYXBwOiBGYXN0aWZ5SW5zdGFuY2UpOiB2b2lkIHtcbiAgY29uc3Qgc2VydmUgPSAocm91dGVQYXRoOiBzdHJpbmcsIGZpbGVOYW1lOiBzdHJpbmcsIGV4dDogc3RyaW5nKTogdm9pZCA9PiB7XG4gICAgYXBwLmdldChyb3V0ZVBhdGgsIChfcmVxdWVzdCwgcmVwbHkpID0+IHtcbiAgICAgIHRyeSB7XG4gICAgICAgIC8vIFJlYWQgcGVyIHJlcXVlc3Q6IHRocmVlIHNtYWxsIGZpbGVzLCBhbmQgYSByZWJ1aWx0IGJ1bmRsZSBpcyBwaWNrZWRcbiAgICAgICAgLy8gdXAgd2l0aG91dCBhIHNlcnZlciByZXN0YXJ0LlxuICAgICAgICBjb25zdCBjb250ZW50ID0gcmVhZEZpbGVTeW5jKGpvaW4ocHVibGljRGlyLCBmaWxlTmFtZSkpO1xuICAgICAgICB2b2lkIHJlcGx5LnR5cGUoQ09OVEVOVF9UWVBFU1tleHRdID8/ICdhcHBsaWNhdGlvbi9vY3RldC1zdHJlYW0nKS5zZW5kKGNvbnRlbnQpO1xuICAgICAgfSBjYXRjaCB7XG4gICAgICAgIHZvaWQgcmVwbHkuY29kZSg0MDQpLnNlbmQoe1xuICAgICAgICAgIG9rOiBmYWxzZSxcbiAgICAgICAgICBlcnJvcjogeyBuYW1lOiAnRXJyb3InLCBtZXNzYWdlOiBgdWkgYXNzZXQgbm90IGJ1aWx0OiAke2ZpbGVOYW1lfSAocnVuIHBucG0gYnVpbGQ6dWkpYCB9LFxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfTtcblxuICBzZXJ2ZSgnL3VpJywgJ2luZGV4Lmh0bWwnLCAnLmh0bWwnKTtcbiAgc2VydmUoJy91aS9hcHAuanMnLCAnYXBwLmpzJywgJy5qcycpO1xuICBzZXJ2ZSgnL3VpL2FwcC5jc3MnLCAnYXBwLmNzcycsICcuY3NzJyk7XG59XG4iXSwKICAibWFwcGluZ3MiOiAiOzs7Ozs7Ozs7Ozs7O0FBQUEsSUEwQmEsdUJBV0Esa0JBUUEsZUFRQSx3QkFXQSx3QkFhQSxrQkFXQSxpQkF1REEsZUFPQSxjQUdBLGdDQVNBLGdCQXVFQSxtQkErSEE7QUF4V2I7QUFBQTtBQUFBO0FBMEJPLElBQU0sd0JBQU4sY0FBb0MsTUFBTTtBQUFBLE1BQy9DLFlBQ2tCLFlBQ0EsU0FDaEI7QUFDQSxjQUFNLHNCQUFzQixVQUFVLGNBQWMsT0FBTyxFQUFFO0FBSDdDO0FBQ0E7QUFHaEIsYUFBSyxPQUFPO0FBQUEsTUFDZDtBQUFBLElBQ0Y7QUFHTyxJQUFNLG1CQUFOLGNBQStCLE1BQU07QUFBQSxNQUMxQyxZQUE0QixPQUFlO0FBQ3pDLGNBQU0saUJBQWlCLEtBQUssRUFBRTtBQURKO0FBRTFCLGFBQUssT0FBTztBQUFBLE1BQ2Q7QUFBQSxJQUNGO0FBR08sSUFBTSxnQkFBTixjQUE0QixNQUFNO0FBQUEsTUFDdkMsWUFBNEIsUUFBZ0I7QUFDMUMsY0FBTSxhQUFhLE1BQU0sRUFBRTtBQUREO0FBRTFCLGFBQUssT0FBTztBQUFBLE1BQ2Q7QUFBQSxJQUNGO0FBR08sSUFBTSx5QkFBTixjQUFxQyxNQUFNO0FBQUEsTUFDaEQsWUFDa0IsTUFDQSxJQUNoQjtBQUNBLGNBQU0sdUJBQXVCLElBQUksT0FBTyxFQUFFLEVBQUU7QUFINUI7QUFDQTtBQUdoQixhQUFLLE9BQU87QUFBQSxNQUNkO0FBQUEsSUFDRjtBQUdPLElBQU0seUJBQU4sY0FBcUMsTUFBTTtBQUFBLE1BQ2hELFlBQTRCLE1BQWM7QUFDeEMsY0FBTSx5QkFBeUIsSUFBSSxFQUFFO0FBRFg7QUFFMUIsYUFBSyxPQUFPO0FBQUEsTUFDZDtBQUFBLElBQ0Y7QUFRTyxJQUFNLG1CQUFtQjtBQUFBLE1BQzlCO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFB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TUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxJQUNGO0FBMkJPLElBQU0sV0FBVyxjQUFjLFlBQVksR0FBRztBQUFBO0FBQUE7OztBQ2hJckQsSUFJYTtBQUpiO0FBQUE7QUFBQTtBQUlPLElBQU0sYUFBYTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7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QWUsdUJBQXVCLHVDQUF1QyxFQUM3RSxlQUFlLDBCQUEwQixtRkFBbUYsRUFDNUgsT0FBTyxVQUFVLDJDQUEyQyxFQUM1RCxPQUFPLGVBQWUsK0JBQStCLEVBQ3JEO0FBQUEsSUFDQyxPQUNFLFNBT0c7QUFDSCxVQUFJO0FBQ0YsY0FBTSxTQUFTLFdBQVcsSUFBSTtBQUc5QixjQUFNLFNBQVMsTUFBTTtBQUNyQixjQUFNLE9BQU8sU0FBUztBQUFBLFVBQ3BCO0FBQUEsVUFDQSxVQUFVRCxTQUFRLEtBQUssSUFBSTtBQUFBLFVBQzNCLFlBQVksS0FBSztBQUFBLFVBQ2pCLFVBQVUsS0FBSztBQUFBLFVBQ2YsR0FBSSxLQUFLLFNBQVMsU0FBWSxFQUFFLFFBQVEsT0FBTyxLQUFLLElBQUksRUFBRSxJQUFJLENBQUM7QUFBQSxVQUMvRCxHQUFJLEtBQUssU0FBUyxPQUFPLEVBQUUsTUFBTSxLQUFLLElBQUksQ0FBQztBQUFBLFFBQzdDLENBQUM7QUFBQSxNQUNILFNBQVMsT0FBTztBQUNkLGNBQU0sTUFBTSxpQkFBaUIsUUFBUSxRQUFRLElBQUksTUFBTSxPQUFPLEtBQUssQ0FBQztBQUNwRSxnQkFBUSxPQUFPLE1BQU0sMkJBQXNCLElBQUksSUFBSSxLQUFLLElBQUksT0FBTztBQUFBLENBQUk7QUFDdkUsZ0JBQVEsV0FBVztBQUFBLE1BQ3JCO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFFRixTQUFPO0FBQ1Q7QUFFQSxlQUFzQixLQUFLLE9BQWlCLFFBQVEsTUFBcUI7QUFDdkUsUUFBTSxhQUFhLEVBQUUsV0FBVyxJQUFJO0FBQ3RDO0FBR0EsS0FBSyxLQUFLOyIsCiAgIm5hbWVzIjogWyJ3b3JrSXRlbUlkIiwgImZlbmNpbmdUb2tlbiIsICJzcWwiLCAiUkFOSyIsICJUUkFOU0lUSU9OUyIsICJMRUdBQ1lfU1RBVFVTIiwgIndvcmtJdGVtSWQiLCAiZmVuY2luZ1Rva2VuIiwgInF1b3J1bU1ldCIsICJkaXJuYW1lIiwgImpvaW4iLCAiZmlsZVVSTFRvUGF0aCIsICJpbml0X3NyYyIsICJzcmNfZXhwb3J0cyIsICJleGlzdHNTeW5jIiwgIm1rZGlyU3luYyIsICJyZWFkRmlsZVN5bmMiLCAid3JpdGVGaWxlU3luYyIsICJqb2luIiwgInJlc29sdmUiLCAid29ya0l0ZW1JZCIsICJldmlkZW5jZSIsICJiYXNlbGluZSIsICJvdXRjb21lIiwgImluaXRfc3JjIiwgInJlc29sdmUiLCAiZXJyb3JOYW1lIiwgInRocmVhZHMiLCAibWVudGlvbnMiLCAibWVzc2FnZXMiLCAibm90aWZpY2F0aW9ucyIsICJlcSIsICJmZWF0dXJlcyIsICJldmVudHMiLCAicmFuZG9tQnl0ZXMiLCAibWtkaXJTeW5jIiwgImpvaW4iLCAicmVhZEZpbGVTeW5jIiwgImRlZiIsICJyZWFkRmlsZVN5bmMiLCAiZGlybmFtZSIsICJyYW5kb21CeXRlcyIsICJta2RpclN5bmMiLCAiY3JlYXRlUGdTeW5jRW5naW5lIiwgImpvaW4iLCAidGV4dCIsICJyZXNvbHZlIiwgIndvcmtJdGVtSWQiXQp9Cg==
