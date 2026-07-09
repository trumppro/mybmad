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
var PermissionDeniedError, GuardFailedError, ConflictError, InvalidTransitionError, StoriesValidationError, WORK_ITEM_STATES, BLOCKED_REASONS, REVIEW_LOOP_LIMIT;
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
    REVIEW_LOOP_LIMIT = 5;
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
      hasPermission(actorId, permission) {
        return this.grants.get(actorId)?.has(permission) ?? false;
      }
      requirePermission(actorId, permission) {
        if (!this.hasPermission(actorId, permission)) {
          throw new PermissionDeniedError(permission, actorId);
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
        return { ...actor };
      }
      grant(input) {
        const set = this.grants.get(input.actorId) ?? /* @__PURE__ */ new Set();
        set.add(input.permission);
        this.grants.set(input.actorId, set);
      }
      revoke(input) {
        this.grants.get(input.actorId)?.delete(input.permission);
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
          this.gateDecisions.push({
            workItemId: item.id,
            gate: "spec_approval",
            decision: "approved",
            actorId: input.actorId
          });
          this.append("work_item", item.id, "gate.approved", input.actorId, {
            gate: "spec_approval",
            pinnedVerification: item.pinnedVerification
          });
          return this.executeTransition(item, "ready_for_dev", input.actorId);
        }
        this.requirePermission(input.actorId, "gate.review.approve");
        if (item.blockedReason !== null) {
          throw new GuardFailedError(`work item is blocked: ${item.blockedReason}`);
        }
        if (item.state !== "in_review") {
          throw new GuardFailedError(`review_approval applies to in_review items, not ${item.state}`);
        }
        this.checkReviewEvidence(item);
        this.gateDecisions.push({
          workItemId: item.id,
          gate: "review_approval",
          decision: "approved",
          actorId: input.actorId
        });
        this.append("work_item", item.id, "gate.approved", input.actorId, { gate: "review_approval" });
        return this.executeTransition(item, "done", input.actorId);
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
        this.requirePermission(input.actorId, "gate.review.approve");
        if (item.state !== "in_review") {
          throw new GuardFailedError(`review rejection applies to in_review items, not ${item.state}`);
        }
        this.gateDecisions.push({
          workItemId: item.id,
          gate: "review_approval",
          decision: "rejected",
          actorId: input.actorId
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
  claims: () => claims,
  events: () => events,
  evidence: () => evidence,
  features: () => features,
  gateDecisions: () => gateDecisions,
  grants: () => grants,
  idempotencyKeys: () => idempotencyKeys,
  workItems: () => workItems
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
var actors, grants, features, workItems, claims, gateDecisions, evidence, events, idempotencyKeys;
var init_schema = __esm({
  "../../packages/db/src/schema.ts"() {
    "use strict";
    actors = pgTable("actors", {
      id: text("id").primaryKey(),
      type: text("type").notNull(),
      // 'user' | 'agent' | 'system'
      displayName: text("display_name").notNull()
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
      actorId: text("actor_id").notNull()
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
var RANK2, TRANSITIONS2, LEGACY_STATUS2, PgEngine;
var init_pg_engine = __esm({
  "../../packages/db/src/pg-engine.ts"() {
    "use strict";
    init_src();
    init_schema();
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
      async hasPermission(actorId, permission) {
        const rows = await this.db.select({ permission: grants.permission }).from(grants).where(and(eq(grants.actorId, actorId), eq(grants.permission, permission))).limit(1);
        return rows.length > 0;
      }
      async requirePermission(actorId, permission) {
        if (!await this.hasPermission(actorId, permission)) {
          throw new PermissionDeniedError(permission, actorId);
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
        await this.db.insert(actors).values({ id: actor.id, type: actor.type, displayName: actor.displayName });
        return actor;
      }
      async grant(input) {
        await this.db.insert(grants).values({ actorId: input.actorId, permission: input.permission, scope: input.scope ?? null }).onConflictDoNothing();
      }
      async revoke(input) {
        await this.db.delete(grants).where(and(eq(grants.actorId, input.actorId), eq(grants.permission, input.permission)));
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
          return this.db.transaction(async (tx) => {
            let pinned = item.pinnedVerification;
            if (input.pinnedVerification !== void 0) {
              pinned = [...input.pinnedVerification];
              await tx.update(workItems).set({ pinnedVerification: pinned }).where(eq(workItems.id, item.id));
            }
            await tx.insert(gateDecisions).values({
              workItemId: item.id,
              gate: "spec_approval",
              decision: "approved",
              actorId: input.actorId
            });
            await this.appendTx(tx, "work_item", item.id, "gate.approved", input.actorId, {
              gate: "spec_approval",
              pinnedVerification: pinned ?? null
            });
            return this.executeTransitionTx(tx, { ...item, pinnedVerification: pinned }, "ready_for_dev", input.actorId);
          });
        }
        await this.requirePermission(input.actorId, "gate.review.approve");
        if (item.blockedReason !== null) {
          throw new GuardFailedError(`work item is blocked: ${item.blockedReason}`);
        }
        if (item.state !== "in_review") {
          throw new GuardFailedError(`review_approval applies to in_review items, not ${item.state}`);
        }
        await this.checkReviewEvidence(item);
        return this.db.transaction(async (tx) => {
          await tx.insert(gateDecisions).values({
            workItemId: item.id,
            gate: "review_approval",
            decision: "approved",
            actorId: input.actorId
          });
          await this.appendTx(tx, "work_item", item.id, "gate.approved", input.actorId, {
            gate: "review_approval"
          });
          return this.executeTransitionTx(tx, item, "done", input.actorId);
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
        await this.requirePermission(input.actorId, "gate.review.approve");
        if (item.state !== "in_review") {
          throw new GuardFailedError(`review rejection applies to in_review items, not ${item.state}`);
        }
        return this.db.transaction(async (tx) => {
          await tx.insert(gateDecisions).values({
            workItemId: item.id,
            gate: "review_approval",
            decision: "rejected",
            actorId: input.actorId
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
import { dirname as dirname2, join } from "node:path";
import { fileURLToPath } from "node:url";
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
    here = dirname2(fileURLToPath(import.meta.url));
    workerPath = join(here, "..", "dist", "worker.mjs");
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
  display_name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS grants (
  actor_id TEXT NOT NULL,
  permission TEXT NOT NULL,
  scope TEXT,
  PRIMARY KEY (actor_id, permission)
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
  actor_id TEXT NOT NULL
);

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
  readFileSync as readFileSync3,
  rmSync,
  statSync,
  writeFileSync as writeFileSync2
} from "node:fs";
import { join as join3, resolve as resolve2 } from "node:path";
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
  const gitDir = join3(repoPath, ".git");
  try {
    if (!statSync(gitDir).isDirectory()) return;
  } catch {
    return;
  }
  const infoDir = join3(gitDir, "info");
  mkdirSync3(infoDir, { recursive: true });
  const excludePath = join3(infoDir, "exclude");
  const current = existsSync2(excludePath) ? readFileSync3(excludePath, "utf8") : "";
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
  writeFileSync2(join3(worktreeDir, MARKER_FILE), `${JSON.stringify(marker, null, 2)}
`, "utf8");
}
function readMarker(worktreeDir) {
  const path = join3(worktreeDir, MARKER_FILE);
  if (!existsSync2(path)) return null;
  try {
    const raw = JSON.parse(readFileSync3(path, "utf8"));
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
  const { data, body } = splitFrontmatter(readFileSync3(specAbsPath, "utf8"));
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
  const raw = readFileSync3(specAbsPath, "utf8");
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
  const spec = readSpecReport(join3(args.workDir, args.specRel));
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
    const dir = join3(root, name);
    const marker = readMarker(dir);
    if (marker === null || marker.workItemId !== workItemId2) continue;
    let head = null;
    try {
      head = git(["rev-parse", "HEAD"], dir);
    } catch {
      head = null;
    }
    const status = normalizeStatus(readSpecReport(join3(dir, specRel)).status);
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
  const specRel = join3(options.specFolder, workItem.specPath);
  const branch = `claim/${claim.id}`;
  const worktreesRoot = join3(repoPath, ".oahs", "worktrees");
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
  const worktreeDir = join3(worktreesRoot, claim.id);
  git(["worktree", "add", "-b", branch, worktreeDir, baseline], repoPath);
  writeMarker(worktreeDir, {
    workItemId: workItem.id,
    claimId: claim.id,
    baseline,
    invocations: 0
  });
  const specAbs = join3(worktreeDir, specRel);
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
      displayName: z.string().min(1)
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
async function actorCreateCommand(client, opts) {
  if (opts.type !== "user" && opts.type !== "agent") {
    throw new Error(`invalid --type "${opts.type}" (expected user | agent)`);
  }
  const created = await client.call("create_actor", {
    type: opts.type,
    displayName: opts.name
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
import { join as join2 } from "node:path";

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
  constructor(options) {
    this.persistPath = options?.persistPath;
    if (this.persistPath !== void 0 && existsSync(this.persistPath)) {
      const raw = JSON.parse(readFileSync2(this.persistPath, "utf8"));
      for (const [hash, record] of Object.entries(raw.tokens)) {
        this.byHash.set(hash, { actorId: record.actorId, isAdmin: record.isAdmin });
      }
    }
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
    const shape = { version: 1, tokens: {} };
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
        const actor = engine.createActor({ type: p.type, displayName: p.displayName });
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
async function buildServer(options) {
  const { engine, tokenStore, adminToken } = options;
  tokenStore.bootstrapAdmin(adminToken);
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
    engine = createPgSyncEngine2({ dataDir: join2(options.dataDir, "pg") });
    tokenStore = new TokenStore({ persistPath: join2(options.dataDir, "tokens.json") });
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
  withClientFlags(actor.command("create")).description("create a user or agent actor; prints actorId + token (admin only)").requiredOption("--type <type>", "user | agent").requiredOption("--name <name>", "display name").action(
    async (opts) => emit(() => actorCreateCommand(clientFrom(opts), { type: opts.type, name: opts.name }))
  );
  withClientFlags(program.command("grant <actorId> <permission>")).description("grant a permission to an actor (admin only)").action(
    async (actorId, permission, opts) => emit(() => grantCommand(clientFrom(opts), { actorId, permission }))
  );
  const feature = program.command("feature").description("feature management");
  withClientFlags(feature.command("create")).description("create a feature; prints featureId").action(async (opts) => emit(() => featureCreateCommand(clientFrom(opts))));
  withClientFlags(program.command("import <featureId> <storiesYamlPath>")).description("import a stories.yaml file into a feature (idempotent)").action(
    async (featureId, storiesYamlPath, opts) => emit(() => importStoriesCommand(clientFrom(opts), { featureId, path: storiesYamlPath }))
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vLi4vLi4vcGFja2FnZXMvY29yZS9zcmMvdHlwZXMudHMiLCAiLi4vLi4vLi4vcGFja2FnZXMvY29yZS9zcmMvc3Rvcmllcy50cyIsICIuLi8uLi8uLi9wYWNrYWdlcy9jb3JlL3NyYy9lbmdpbmUudHMiLCAiLi4vLi4vLi4vcGFja2FnZXMvY29yZS9zcmMvaW50ZW50LWhhc2gudHMiLCAiLi4vLi4vLi4vcGFja2FnZXMvY29yZS9zcmMvaW5kZXgudHMiLCAiLi4vLi4vLi4vcGFja2FnZXMvZGIvc3JjL3NjaGVtYS50cyIsICIuLi8uLi8uLi9wYWNrYWdlcy9kYi9zcmMvcGctZW5naW5lLnRzIiwgIi4uLy4uLy4uL3BhY2thZ2VzL2RiL3NyYy9zeW5jLWVuZ2luZS50cyIsICIuLi8uLi8uLi9wYWNrYWdlcy9kYi9zcmMvc2NoZW1hLXNxbC50cyIsICIuLi8uLi8uLi9wYWNrYWdlcy9kYi9zcmMvaW5kZXgudHMiLCAiLi4vLi4vLi4vcGFja2FnZXMvcnVubmVyL3NyYy9pbmRleC50cyIsICIuLi9zcmMvY2xpLnRzIiwgIi4uLy4uLy4uL3BhY2thZ2VzL2NvbnRyYWN0cy9zcmMvaW5kZXgudHMiLCAiLi4vc3JjL2NvbW1hbmRzL2luZGV4LnRzIiwgIi4uL3NyYy9mb3JtYXQudHMiLCAiLi4vc3JjL3NlcnZlLnRzIiwgIi4uLy4uL3NwaW5lLWFwaS9zcmMvaW5kZXgudHMiLCAiLi4vLi4vc3BpbmUtYXBpL3NyYy9hdXRoLnRzIiwgIi4uLy4uL3NwaW5lLWFwaS9zcmMvc2VydmVyLnRzIiwgIi4uLy4uL3NwaW5lLWFwaS9zcmMvYnVzLnRzIiwgIi4uLy4uL3NwaW5lLWFwaS9zcmMvbWNwLnRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyIvKipcbiAqIEBvYWhzL2NvcmUgXHUyMDE0IHR5cGVzLCBlcnJvcnMsIGFuZCB2b2NhYnVsYXJ5IG9mIHRoZSBkZXRlcm1pbmlzdGljIHNwaW5lLlxuICpcbiAqIFRoZSBjb25mb3JtYW5jZSBzdWl0ZSBpbiB0ZXN0LyB3YXMgd3JpdHRlbiBGSVJTVCwgZnJvbSB0aGUgcHJvc2UgcnVsZXMgaW5cbiAqIHRoZSBCTUFEIHNvdXJjZSAoYm1hZC1zcHJpbnQtcGxhbm5pbmcsIGJtYWQtZGV2LWF1dG8sIGJtYWQtcXVpY2stZGV2LFxuICogc3Rvcmllcy1zY2hlbWEubWQpIGFzIGFyYml0cmF0ZWQgaW4gcHJvZHVjdC1yb2FkbWFwLm1kIFx1MDBBNzEuIFRoZSBlbmdpbmUgaXNcbiAqIGltcGxlbWVudGVkIHRvIG1ha2UgdGhhdCBzdWl0ZSBwYXNzIFx1MjAxNCBuZXZlciB0aGUgb3RoZXIgd2F5IGFyb3VuZC5cbiAqXG4gKiBJbnZhcmlhbnRzIGVuZm9yY2VkIGhlcmUgZm9yZXZlciAocHJvZHVjdC1yb2FkbWFwLm1kIFx1MDBBNzAuMSk6XG4gKiAgLSBObyBMTE0gU0RLIGltcG9ydC4gRXZlci4gKENJIGxpbnQpXG4gKiAgLSBFdmVyeSBtdXRhdGlvbiBnb2VzIHRocm91Z2ggYSBjb21tYW5kOyBjb21tYW5kcyBlbWl0IGV2ZW50czsgcHJvamVjdGlvbnNcbiAqICAgIGFyZSBjb25zZXF1ZW5jZXMgb2YgZXZlbnRzLlxuICovXG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gRXJyb3JzXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuZXhwb3J0IGNsYXNzIE5vdEltcGxlbWVudGVkRXJyb3IgZXh0ZW5kcyBFcnJvciB7XG4gIGNvbnN0cnVjdG9yKHdoYXQ6IHN0cmluZykge1xuICAgIHN1cGVyKGBOb3QgaW1wbGVtZW50ZWQ6ICR7d2hhdH1gKTtcbiAgICB0aGlzLm5hbWUgPSAnTm90SW1wbGVtZW50ZWRFcnJvcic7XG4gIH1cbn1cblxuLyoqIENvbW1hbmQgcmVqZWN0ZWQ6IGFjdG9yIGxhY2tzIHRoZSByZXF1aXJlZCBncmFudC4gKi9cbmV4cG9ydCBjbGFzcyBQZXJtaXNzaW9uRGVuaWVkRXJyb3IgZXh0ZW5kcyBFcnJvciB7XG4gIGNvbnN0cnVjdG9yKFxuICAgIHB1YmxpYyByZWFkb25seSBwZXJtaXNzaW9uOiBQZXJtaXNzaW9uLFxuICAgIHB1YmxpYyByZWFkb25seSBhY3RvcklkOiBzdHJpbmcsXG4gICkge1xuICAgIHN1cGVyKGBwZXJtaXNzaW9uIGRlbmllZDogJHtwZXJtaXNzaW9ufSBmb3IgYWN0b3IgJHthY3RvcklkfWApO1xuICAgIHRoaXMubmFtZSA9ICdQZXJtaXNzaW9uRGVuaWVkRXJyb3InO1xuICB9XG59XG5cbi8qKiBDb21tYW5kIHJlamVjdGVkOiBGU00gZ3VhcmQgZmFpbGVkIChpbmNsdWRlcyB0aGUgbWFjaGluZS1yZWFkYWJsZSBndWFyZCBjb2RlKS4gKi9cbmV4cG9ydCBjbGFzcyBHdWFyZEZhaWxlZEVycm9yIGV4dGVuZHMgRXJyb3Ige1xuICBjb25zdHJ1Y3RvcihwdWJsaWMgcmVhZG9ubHkgZ3VhcmQ6IHN0cmluZykge1xuICAgIHN1cGVyKGBndWFyZCBmYWlsZWQ6ICR7Z3VhcmR9YCk7XG4gICAgdGhpcy5uYW1lID0gJ0d1YXJkRmFpbGVkRXJyb3InO1xuICB9XG59XG5cbi8qKiBDb21tYW5kIHJlamVjdGVkOiBzdGFsZSBmZW5jaW5nIHRva2VuIG9yIHN0YXRlX3ZlcnNpb24gY29uZmxpY3QgKEhUVFAgNDA5IHNlbWFudGljcykuICovXG5leHBvcnQgY2xhc3MgQ29uZmxpY3RFcnJvciBleHRlbmRzIEVycm9yIHtcbiAgY29uc3RydWN0b3IocHVibGljIHJlYWRvbmx5IHJlYXNvbjogc3RyaW5nKSB7XG4gICAgc3VwZXIoYGNvbmZsaWN0OiAke3JlYXNvbn1gKTtcbiAgICB0aGlzLm5hbWUgPSAnQ29uZmxpY3RFcnJvcic7XG4gIH1cbn1cblxuLyoqIFRyYW5zaXRpb24gbm90IGRlY2xhcmVkIGluIHRoZSB0YWJsZSAoaW5jbHVkZXMgbmV2ZXItZG93bmdyYWRlIHJlamVjdGlvbnMpLiAqL1xuZXhwb3J0IGNsYXNzIEludmFsaWRUcmFuc2l0aW9uRXJyb3IgZXh0ZW5kcyBFcnJvciB7XG4gIGNvbnN0cnVjdG9yKFxuICAgIHB1YmxpYyByZWFkb25seSBmcm9tOiBXb3JrSXRlbVN0YXRlLFxuICAgIHB1YmxpYyByZWFkb25seSB0bzogV29ya0l0ZW1TdGF0ZSxcbiAgKSB7XG4gICAgc3VwZXIoYGludmFsaWQgdHJhbnNpdGlvbjogJHtmcm9tfSAtPiAke3RvfWApO1xuICAgIHRoaXMubmFtZSA9ICdJbnZhbGlkVHJhbnNpdGlvbkVycm9yJztcbiAgfVxufVxuXG4vKiogc3Rvcmllcy55YW1sIGZhaWxlZCBhIHZhbGlkaXR5IHJ1bGUgKHN0b3JpZXMtc2NoZW1hLm1kKS4gKi9cbmV4cG9ydCBjbGFzcyBTdG9yaWVzVmFsaWRhdGlvbkVycm9yIGV4dGVuZHMgRXJyb3Ige1xuICBjb25zdHJ1Y3RvcihwdWJsaWMgcmVhZG9ubHkgcnVsZTogc3RyaW5nKSB7XG4gICAgc3VwZXIoYHN0b3JpZXMueWFtbCBpbnZhbGlkOiAke3J1bGV9YCk7XG4gICAgdGhpcy5uYW1lID0gJ1N0b3JpZXNWYWxpZGF0aW9uRXJyb3InO1xuICB9XG59XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gVm9jYWJ1bGFyeSAocHJvZHVjdC1yb2FkbWFwLm1kIFx1MDBBNzAuMiwgXHUwMEE3MS4xKVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbmV4cG9ydCB0eXBlIEFjdG9yVHlwZSA9ICd1c2VyJyB8ICdhZ2VudCcgfCAnc3lzdGVtJztcblxuZXhwb3J0IGNvbnN0IFdPUktfSVRFTV9TVEFURVMgPSBbXG4gICdiYWNrbG9nJyxcbiAgJ2RyYWZ0JyxcbiAgJ3JlYWR5X2Zvcl9kZXYnLFxuICAnaW5fcHJvZ3Jlc3MnLFxuICAnaW5fcmV2aWV3JyxcbiAgJ2RvbmUnLFxuXSBhcyBjb25zdDtcbmV4cG9ydCB0eXBlIFdvcmtJdGVtU3RhdGUgPSAodHlwZW9mIFdPUktfSVRFTV9TVEFURVMpW251bWJlcl07XG5cbi8qKiBibG9ja2VkIGlzIGFuIE9WRVJMQVksIG5vdCBhIHN0YXRlIChyb2FkbWFwIEQ4KS4gVGF4b25vbXkgZnJvbSBkZXYtYXV0byBIQUxULiAqL1xuZXhwb3J0IGNvbnN0IEJMT0NLRURfUkVBU09OUyA9IFtcbiAgJ3VuY2xlYXJfaW50ZW50JyxcbiAgJ25vX3N0b3JpZXNfeWFtbF9mb3VuZCcsXG4gICdhbWJpZ3VvdXNfc3RvcnlfZmlsZV9tYXRjaCcsXG4gICdyZXZpZXdfbm9uX2NvbnZlcmdlbmNlJyxcbiAgJ25vX3N1YmFnZW50cycsXG4gICdkaXJ0eV90cmVlJyxcbiAgJ3N0YWxlX3dvcmt0cmVlJyxcbiAgJ2F3YWl0aW5nX2h1bWFuX2lucHV0JyxcbiAgJ290aGVyJyxcbl0gYXMgY29uc3Q7XG5leHBvcnQgdHlwZSBCbG9ja2VkUmVhc29uID0gKHR5cGVvZiBCTE9DS0VEX1JFQVNPTlMpW251bWJlcl07XG5cbmV4cG9ydCB0eXBlIFBlcm1pc3Npb24gPVxuICB8ICd0YXNrLnBsYW4nXG4gIHwgJ3Rhc2suY2xhaW0nXG4gIHwgJ3Rhc2suYWR2YW5jZSdcbiAgfCAndGFzay5ibG9jaydcbiAgfCAnZ2F0ZS5zcGVjLmFwcHJvdmUnXG4gIHwgJ2dhdGUucmV2aWV3LmFwcHJvdmUnXG4gIHwgJ2ZlYXR1cmUuaW5pdCdcbiAgfCAnZmVhdHVyZS5hZHZhbmNlJ1xuICB8ICdkaXNwYXRjaC5yZWxlYXNlX2hvbGQnXG4gIHwgJ2ludGVudC5lZGl0J1xuICB8ICdzdGF0ZS5kb3duZ3JhZGUnXG4gIHwgJ29wcy5mb3JjZV9yZWxlYXNlX2NsYWltJztcblxuZXhwb3J0IHR5cGUgR2F0ZUNvZGUgPSAnc3BlY19hcHByb3ZhbCcgfCAncmV2aWV3X2FwcHJvdmFsJztcblxuZXhwb3J0IHR5cGUgRXZpZGVuY2VLaW5kID1cbiAgfCAndGVzdF9ydW4nIC8vIHtjb21tYW5kLCBleGl0Q29kZX0gIFx1MjAxNCBjb21tYW5kIE1VU1QgbWF0Y2ggYSBwaW5uZWQgb25lXG4gIHwgJ2dpdF9kaWZmJyAvLyB7YmFzZWxpbmUsIGZpbmFsLCBmaWxlc0NoYW5nZWQsIG5vbkVtcHR5LCBicmFuY2h9XG4gIHwgJ2NvbW1pdCcgLy8ge3NoYSwgYnJhbmNoLCByZWFjaGFibGVPblJlbW90ZX1cbiAgfCAnaGFsdF9yZXBvcnQnIC8vIHZlcmJhdGltIEF1dG8gUnVuIFJlc3VsdFxuICB8ICdyZXZpZXdfcmVwb3J0JyAvLyBMTE0tYXV0aG9yZWQ7IE5FVkVSIGEgZ3VhcmQsIGNvbnRleHQgb25seVxuICB8ICdkb2NfbGludCc7IC8vIHtzY2hlbWFWYWxpZH0gZm9yIG5vbi1jb2RlIHdvcmtcblxuZXhwb3J0IGludGVyZmFjZSBFdmlkZW5jZSB7XG4gIGtpbmQ6IEV2aWRlbmNlS2luZDtcbiAgcGF5bG9hZDogUmVjb3JkPHN0cmluZywgdW5rbm93bj47XG59XG5cbi8qKiBSZXZpZXcgbG9vcDogZXhhY3RseSB0aGlzIG1hbnkgbG9vcGJhY2tzIGFsbG93ZWQ7IHRoZSBuZXh0IG9uZSBibG9ja3MuICovXG5leHBvcnQgY29uc3QgUkVWSUVXX0xPT1BfTElNSVQgPSA1O1xuXG5leHBvcnQgY29uc3QgSU5URU5UX0hBU0hfQUxHTyA9ICd2MSc7XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gRW50aXRpZXMgKHByb2plY3Rpb24gc2hhcGVzIHJldHVybmVkIGJ5IHF1ZXJpZXMpXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuZXhwb3J0IGludGVyZmFjZSBBY3RvciB7XG4gIGlkOiBzdHJpbmc7XG4gIHR5cGU6IEFjdG9yVHlwZTtcbiAgZGlzcGxheU5hbWU6IHN0cmluZztcbn1cblxuZXhwb3J0IGludGVyZmFjZSBGZWF0dXJlIHtcbiAgaWQ6IHN0cmluZztcbiAgc3RhdGU6ICdiYWNrbG9nJyB8ICdpbl9wcm9ncmVzcycgfCAnZG9uZSc7XG4gIC8qKiB0cnVlIHdoaWxlIGEgZG9uZV9jaGVja3BvaW50IGhvbGQgaXMgYWN0aXZlOiBubyBmdXJ0aGVyIGRpc3BhdGNoIGluIHRoaXMgZmVhdHVyZSAqL1xuICBkaXNwYXRjaEhvbGQ6IGJvb2xlYW47XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgV29ya0l0ZW0ge1xuICBpZDogc3RyaW5nO1xuICBmZWF0dXJlSWQ6IHN0cmluZztcbiAgZXh0ZXJuYWxLZXk6IHN0cmluZzsgLy8gaWQgZnJvbSBzdG9yaWVzLnlhbWwsIGUuZy4gXCIzLTJcIlxuICB0aXRsZTogc3RyaW5nO1xuICBzdGF0ZTogV29ya0l0ZW1TdGF0ZTtcbiAgYmxvY2tlZFJlYXNvbjogQmxvY2tlZFJlYXNvbiB8IG51bGw7XG4gIHJldmlld0xvb3BJdGVyYXRpb246IG51bWJlcjtcbiAgaW50ZW50SGFzaDogc3RyaW5nIHwgbnVsbDtcbiAgcGlubmVkVmVyaWZpY2F0aW9uOiBzdHJpbmdbXSB8IG51bGw7XG4gIHNwZWNDaGVja3BvaW50OiBib29sZWFuO1xuICBkb25lQ2hlY2twb2ludDogYm9vbGVhbjtcbiAgaW52b2tlRGV2V2l0aDogc3RyaW5nO1xuICBzcGVjUGF0aDogc3RyaW5nO1xuICBzdGF0ZVZlcnNpb246IG51bWJlcjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBDbGFpbSB7XG4gIGlkOiBzdHJpbmc7XG4gIHdvcmtJdGVtSWQ6IHN0cmluZztcbiAgYWN0b3JJZDogc3RyaW5nO1xuICBmZW5jaW5nVG9rZW46IG51bWJlcjtcbiAgbGVhc2VFeHBpcmVzQXQ6IG51bWJlcjsgLy8gZW5naW5lLWNsb2NrIG1zXG4gIHJlbGVhc2VkOiBib29sZWFuO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFNwaW5lRXZlbnQge1xuICBnbG9iYWxTZXE6IG51bWJlcjtcbiAgc3RyZWFtVHlwZTogJ3dvcmtzcGFjZScgfCAnZmVhdHVyZScgfCAnd29ya19pdGVtJyB8ICdhY3Rvcic7XG4gIHN0cmVhbUlkOiBzdHJpbmc7XG4gIHN0cmVhbVNlcTogbnVtYmVyO1xuICB0eXBlOiBzdHJpbmc7XG4gIGFjdG9ySWQ6IHN0cmluZztcbiAgcGF5bG9hZDogUmVjb3JkPHN0cmluZywgdW5rbm93bj47XG4gIGNhdXNhdGlvbklkPzogc3RyaW5nO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIERpdmVyZ2VuY2VSZXBvcnQge1xuICB3b3JrSXRlbUlkOiBzdHJpbmc7XG4gIGZpbGVTdGF0ZTogc3RyaW5nO1xuICBkYlN0YXRlOiBXb3JrSXRlbVN0YXRlO1xuICBraW5kOiAnZmlsZV9haGVhZCcgfCAnZGJfYWhlYWQnIHwgJ2NvbmZsaWN0Jztcbn1cblxuZXhwb3J0IGludGVyZmFjZSBTdG9yaWVzSW1wb3J0UmVzdWx0IHtcbiAgaW1wb3J0ZWQ6IHN0cmluZ1tdOyAvLyBleHRlcm5hbEtleXMgY3JlYXRlZFxuICB1cGRhdGVkOiBzdHJpbmdbXTsgLy8gZXh0ZXJuYWxLZXlzIGFscmVhZHkgcHJlc2VudCwgcmVmcmVzaGVkXG4gIHdhcm5pbmdzOiBzdHJpbmdbXTsgLy8gZS5nLiBza2lwcGVkIHJldHJvc3BlY3RpdmUgZW50cmllc1xufVxuXG5cbi8vIFRoZSBwcm9kdWN0aW9uIHNlcnZpY2Ugd3JhcHMgdGhlIHNhbWUgY29yZSB3aXRoIFBvc3RncmVzIHBlcnNpc3RlbmNlLlxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbmV4cG9ydCBpbnRlcmZhY2UgQ3JlYXRlV29ya0l0ZW1JbnB1dCB7XG4gIGZlYXR1cmVJZDogc3RyaW5nO1xuICBleHRlcm5hbEtleTogc3RyaW5nO1xuICB0aXRsZTogc3RyaW5nO1xuICBzcGVjQ2hlY2twb2ludD86IGJvb2xlYW47XG4gIGRvbmVDaGVja3BvaW50PzogYm9vbGVhbjtcbiAgaW52b2tlRGV2V2l0aD86IHN0cmluZztcbiAgZGVwZW5kc09uPzogc3RyaW5nW107IC8vIGV4dGVybmFsS2V5c1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEFkdmFuY2VJbnB1dCB7XG4gIHdvcmtJdGVtSWQ6IHN0cmluZztcbiAgdG86IFdvcmtJdGVtU3RhdGU7XG4gIGFjdG9ySWQ6IHN0cmluZztcbiAgZmVuY2luZ1Rva2VuPzogbnVtYmVyOyAvLyByZXF1aXJlZCBmb3IgY2xhaW0tZ3VhcmRlZCB0cmFuc2l0aW9uc1xuICBpZGVtcG90ZW5jeUtleT86IHN0cmluZztcbn1cblxuZXhwb3J0IGludGVyZmFjZSBHYXRlRGVjaXNpb25JbnB1dCB7XG4gIHdvcmtJdGVtSWQ6IHN0cmluZztcbiAgZ2F0ZTogR2F0ZUNvZGU7XG4gIGFjdG9ySWQ6IHN0cmluZztcbiAgLyoqIHNwZWNfYXBwcm92YWwgb25seTogcGlucyB2ZXJpZmljYXRpb24gY29tbWFuZHMgYXMgUnVsZXMtbGF5ZXIgZGF0YSAocm9hZG1hcCBENykgKi9cbiAgcGlubmVkVmVyaWZpY2F0aW9uPzogc3RyaW5nW107XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgU3BpbmVFbmdpbmUge1xuICAvLyAtLSBzZXR1cCAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgY3JlYXRlQWN0b3IoaW5wdXQ6IHsgdHlwZTogRXhjbHVkZTxBY3RvclR5cGUsICdzeXN0ZW0nPjsgZGlzcGxheU5hbWU6IHN0cmluZyB9KTogQWN0b3I7XG4gIGdyYW50KGlucHV0OiB7IGFjdG9ySWQ6IHN0cmluZzsgcGVybWlzc2lvbjogUGVybWlzc2lvbjsgc2NvcGU/OiBzdHJpbmcgfSk6IHZvaWQ7XG4gIHJldm9rZShpbnB1dDogeyBhY3RvcklkOiBzdHJpbmc7IHBlcm1pc3Npb246IFBlcm1pc3Npb247IHNjb3BlPzogc3RyaW5nIH0pOiB2b2lkO1xuICBjcmVhdGVGZWF0dXJlKGlucHV0OiB7IGFjdG9ySWQ6IHN0cmluZyB9KTogRmVhdHVyZTtcbiAgY3JlYXRlV29ya0l0ZW0oaW5wdXQ6IENyZWF0ZVdvcmtJdGVtSW5wdXQgJiB7IGFjdG9ySWQ6IHN0cmluZyB9KTogV29ya0l0ZW07XG5cbiAgLyoqIEltcG9ydCBzdG9yaWVzLnlhbWwgY29udGVudCAocmF3IFlBTUwgc3RyaW5nKS4gSWRlbXBvdGVudCByZS1pbXBvcnQgcGVyIHN0b3JpZXMtc2NoZW1hIHVwZGF0ZSBzZW1hbnRpY3MuICovXG4gIGltcG9ydFN0b3JpZXMoaW5wdXQ6IHsgZmVhdHVyZUlkOiBzdHJpbmc7IHlhbWw6IHN0cmluZzsgYWN0b3JJZDogc3RyaW5nIH0pOiBTdG9yaWVzSW1wb3J0UmVzdWx0O1xuXG4gIC8vIC0tIGNsYWltcyAocm9hZG1hcCBcdTAwQTcxLjMpIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgY2xhaW1UYXNrKGlucHV0OiB7IHdvcmtJdGVtSWQ6IHN0cmluZzsgYWN0b3JJZDogc3RyaW5nOyB0dGxNcz86IG51bWJlciB9KTogQ2xhaW07XG4gIGhlYXJ0YmVhdChpbnB1dDogeyBjbGFpbUlkOiBzdHJpbmcgfSk6IHZvaWQ7XG4gIHJlbGVhc2VDbGFpbShpbnB1dDogeyBjbGFpbUlkOiBzdHJpbmc7IHJlYXNvbj86IHN0cmluZyB9KTogdm9pZDtcbiAgLyoqIHRlc3QgY2xvY2sgXHUyMDE0IGxlYXNlIGV4cGlyeSBpcyB0aW1lLWJhc2VkICovXG4gIGFkdmFuY2VDbG9jayhtczogbnVtYmVyKTogdm9pZDtcblxuICAvLyAtLSBsaWZlY3ljbGUgKHJvYWRtYXAgXHUwMEE3MS4yKSAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIGFkdmFuY2VTdGF0ZShpbnB1dDogQWR2YW5jZUlucHV0KTogV29ya0l0ZW07XG4gIGJsb2NrVGFzayhpbnB1dDogeyB3b3JrSXRlbUlkOiBzdHJpbmc7IHJlYXNvbjogQmxvY2tlZFJlYXNvbjsgYWN0b3JJZDogc3RyaW5nOyBmZW5jaW5nVG9rZW4/OiBudW1iZXIgfSk6IFdvcmtJdGVtO1xuICB1bmJsb2NrVGFzayhpbnB1dDogeyB3b3JrSXRlbUlkOiBzdHJpbmc7IGFjdG9ySWQ6IHN0cmluZyB9KTogV29ya0l0ZW07XG5cbiAgLy8gLS0gZ2F0ZXMgJiBldmlkZW5jZSAocm9hZG1hcCBcdTAwQTcxLjQpIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgc3VibWl0RXZpZGVuY2UoaW5wdXQ6IHsgd29ya0l0ZW1JZDogc3RyaW5nOyBldmlkZW5jZTogRXZpZGVuY2U7IGFjdG9ySWQ6IHN0cmluZzsgZmVuY2luZ1Rva2VuPzogbnVtYmVyIH0pOiB2b2lkO1xuICBhcHByb3ZlR2F0ZShpbnB1dDogR2F0ZURlY2lzaW9uSW5wdXQpOiBXb3JrSXRlbTtcbiAgLyoqIFJlamVjdGlvbiBmaXJlcyB0aGUgbG9vcGJhY2sgYXMgYSBzeXN0ZW0gZWZmZWN0IFx1MjAxNCBubyBjbGFpbSBob2xkZXIgaW52b2x2ZW1lbnQgKHJvYWRtYXAgXHUwMEE3MS4yKS4gKi9cbiAgcmVqZWN0R2F0ZShpbnB1dDogR2F0ZURlY2lzaW9uSW5wdXQpOiBXb3JrSXRlbTtcblxuICAvLyAtLSBkaXNwYXRjaCAocm9hZG1hcCBcdTAwQTcyLjMpIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgLyoqIFJlZnVzZXMgc3RhdGU9ZG9uZSBpdGVtczsgcmV0dXJucyBlbnRyeS1zdGF0ZSBjb250ZXh0IGZvciB0aGUgcnVubmVyLiAqL1xuICBnZXRUYXNrQ29udGV4dChpbnB1dDogeyB3b3JrSXRlbUlkOiBzdHJpbmcgfSk6IHtcbiAgICB3b3JrSXRlbTogV29ya0l0ZW07XG4gICAgZW50cnlTdGF0ZTogV29ya0l0ZW1TdGF0ZTtcbiAgfTtcbiAgLyoqIFJlbGVhc2VzIGEgZG9uZV9jaGVja3BvaW50IGRpc3BhdGNoIGhvbGQgb24gdGhlIGZlYXR1cmUuICovXG4gIHJlbGVhc2VEaXNwYXRjaEhvbGQoaW5wdXQ6IHsgZmVhdHVyZUlkOiBzdHJpbmc7IGFjdG9ySWQ6IHN0cmluZyB9KTogRmVhdHVyZTtcblxuICAvLyAtLSByZWNvbmNpbGlhdGlvbiAocm9hZG1hcCBcdTAwQTcxLjYsIGRldGVjdC1vbmx5KSAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHJlY29uY2lsZShpbnB1dDogeyBmaWxlczogQXJyYXk8eyB3b3JrSXRlbUlkOiBzdHJpbmc7IGZyb250bWF0dGVyU3RhdHVzOiBzdHJpbmcgfT4gfSk6IERpdmVyZ2VuY2VSZXBvcnRbXTtcblxuICAvLyAtLSBxdWVyaWVzIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgZ2V0V29ya0l0ZW0oaWQ6IHN0cmluZyk6IFdvcmtJdGVtO1xuICBnZXRGZWF0dXJlKGlkOiBzdHJpbmcpOiBGZWF0dXJlO1xuICBnZXRDbGFpbXMod29ya0l0ZW1JZDogc3RyaW5nKTogQ2xhaW1bXTtcbiAgLyoqIEFkZGl0aXZlIHF1ZXJ5IHN1cmZhY2UgKHBvc3QtY29uZm9ybWFuY2UpOiBsaXN0L2ZpbHRlciB3b3JrIGl0ZW1zLiAqL1xuICBsaXN0V29ya0l0ZW1zKGZpbHRlcj86IHsgc3RhdGU/OiBXb3JrSXRlbVN0YXRlOyBmZWF0dXJlSWQ/OiBzdHJpbmc7IGNsYWltYWJsZT86IGJvb2xlYW4gfSk6IFdvcmtJdGVtW107XG4gIGV2ZW50cyhzdHJlYW1JZD86IHN0cmluZyk6IFNwaW5lRXZlbnRbXTtcbn1cbiIsICIvKipcbiAqIHN0b3JpZXMueWFtbCBwYXJzaW5nICsgdmFsaWRpdHkgcnVsZXMgKHN0b3JpZXMtc2NoZW1hLm1kLCByb2FkbWFwIEQ5KS5cbiAqXG4gKiBUaGUgc2NoZW1hJ3MgdmFsaWRpdHkgcnVsZXMgYmVjb21lIHRocm93aW5nIGNoZWNrcyBoZXJlOyB0aGUgaW1wb3J0ZXIgaW5cbiAqIHRoZSBlbmdpbmUgY29uc3VtZXMgdGhlIHZhbGlkYXRlZCBlbnRyaWVzLiBcIk5vIHN0YXR1cyBmaWVsZCwgZXZlci5cIlxuICovXG5pbXBvcnQgeyBwYXJzZSB9IGZyb20gJ3lhbWwnO1xuXG5pbXBvcnQgeyBTdG9yaWVzVmFsaWRhdGlvbkVycm9yIH0gZnJvbSAnLi90eXBlcy5qcyc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgU3RvcnlFbnRyeSB7XG4gIGlkOiBzdHJpbmc7XG4gIHRpdGxlOiBzdHJpbmc7XG4gIGRlc2NyaXB0aW9uOiBzdHJpbmc7XG4gIHNwZWNDaGVja3BvaW50OiBib29sZWFuO1xuICBkb25lQ2hlY2twb2ludDogYm9vbGVhbjtcbiAgaW52b2tlRGV2V2l0aDogc3RyaW5nO1xufVxuXG5jb25zdCBJRF9QQVRURVJOID0gL15bQS1aYS16MC05LV0rJC87XG5cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZVN0b3JpZXMoeWFtbFRleHQ6IHN0cmluZyk6IFN0b3J5RW50cnlbXSB7XG4gIGxldCByYXc6IHVua25vd247XG4gIHRyeSB7XG4gICAgcmF3ID0gcGFyc2UoeWFtbFRleHQpO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIHRocm93IG5ldyBTdG9yaWVzVmFsaWRhdGlvbkVycm9yKGBZQU1MIHBhcnNlIGZhaWx1cmU6ICR7U3RyaW5nKGVycm9yKX1gKTtcbiAgfVxuICBpZiAoIUFycmF5LmlzQXJyYXkocmF3KSkge1xuICAgIHRocm93IG5ldyBTdG9yaWVzVmFsaWRhdGlvbkVycm9yKCd0b3AgbGV2ZWwgbXVzdCBiZSBhIFlBTUwgbGlzdCBvZiBzdG9yaWVzJyk7XG4gIH1cblxuICBjb25zdCBlbnRyaWVzOiBTdG9yeUVudHJ5W10gPSBbXTtcbiAgZm9yIChjb25zdCBpdGVtIG9mIHJhdykge1xuICAgIGlmICh0eXBlb2YgaXRlbSAhPT0gJ29iamVjdCcgfHwgaXRlbSA9PT0gbnVsbCB8fCBBcnJheS5pc0FycmF5KGl0ZW0pKSB7XG4gICAgICB0aHJvdyBuZXcgU3Rvcmllc1ZhbGlkYXRpb25FcnJvcignZXZlcnkgZW50cnkgbXVzdCBiZSBhIG1hcHBpbmcnKTtcbiAgICB9XG4gICAgY29uc3QgZW50cnkgPSBpdGVtIGFzIFJlY29yZDxzdHJpbmcsIHVua25vd24+O1xuXG4gICAgLy8gUnVsZSAzOiBcIk5vIHN0YXR1cyBmaWVsZCwgZXZlci5cIlxuICAgIGlmICgnc3RhdHVzJyBpbiBlbnRyeSkge1xuICAgICAgdGhyb3cgbmV3IFN0b3JpZXNWYWxpZGF0aW9uRXJyb3IoJ25vIHN0YXR1cyBmaWVsZCwgZXZlcicpO1xuICAgIH1cbiAgICAvLyBSdWxlIDQ6IGlkcyBhcmUgWUFNTCBzdHJpbmdzLCBhbHdheXMgcXVvdGVkIFx1MjAxNCBhbiB1bnF1b3RlZCBgaWQ6IDFgXG4gICAgLy8gcGFyc2VzIGFzIGEgbnVtYmVyIGFuZCBicmVha3Mgc3RyaW5nIGNvbXBhcmlzb24uXG4gICAgaWYgKHR5cGVvZiBlbnRyeVsnaWQnXSAhPT0gJ3N0cmluZycpIHtcbiAgICAgIHRocm93IG5ldyBTdG9yaWVzVmFsaWRhdGlvbkVycm9yKCdpZCBtdXN0IGJlIGEgcXVvdGVkIFlBTUwgc3RyaW5nJyk7XG4gICAgfVxuICAgIGNvbnN0IGlkID0gZW50cnlbJ2lkJ107XG4gICAgaWYgKCFJRF9QQVRURVJOLnRlc3QoaWQpKSB7XG4gICAgICB0aHJvdyBuZXcgU3Rvcmllc1ZhbGlkYXRpb25FcnJvcihgaWQgXCIke2lkfVwiIG1heSBjb250YWluIG9ubHkgbGV0dGVycywgZGlnaXRzLCBhbmQgZGFzaGVzYCk7XG4gICAgfVxuICAgIC8vIFJ1bGUgMTogcmVxdWlyZWQgZmllbGRzLlxuICAgIGlmICh0eXBlb2YgZW50cnlbJ3RpdGxlJ10gIT09ICdzdHJpbmcnIHx8IGVudHJ5Wyd0aXRsZSddLmxlbmd0aCA9PT0gMCkge1xuICAgICAgdGhyb3cgbmV3IFN0b3JpZXNWYWxpZGF0aW9uRXJyb3IoYGVudHJ5IFwiJHtpZH1cIiBpcyBtaXNzaW5nIHJlcXVpcmVkIGZpZWxkOiB0aXRsZWApO1xuICAgIH1cbiAgICBpZiAodHlwZW9mIGVudHJ5WydkZXNjcmlwdGlvbiddICE9PSAnc3RyaW5nJyB8fCBlbnRyeVsnZGVzY3JpcHRpb24nXS5sZW5ndGggPT09IDApIHtcbiAgICAgIHRocm93IG5ldyBTdG9yaWVzVmFsaWRhdGlvbkVycm9yKGBlbnRyeSBcIiR7aWR9XCIgaXMgbWlzc2luZyByZXF1aXJlZCBmaWVsZDogZGVzY3JpcHRpb25gKTtcbiAgICB9XG5cbiAgICBlbnRyaWVzLnB1c2goe1xuICAgICAgaWQsXG4gICAgICB0aXRsZTogZW50cnlbJ3RpdGxlJ10sXG4gICAgICBkZXNjcmlwdGlvbjogZW50cnlbJ2Rlc2NyaXB0aW9uJ10sXG4gICAgICBzcGVjQ2hlY2twb2ludDogZW50cnlbJ3NwZWNfY2hlY2twb2ludCddID09PSB0cnVlLFxuICAgICAgZG9uZUNoZWNrcG9pbnQ6IGVudHJ5Wydkb25lX2NoZWNrcG9pbnQnXSA9PT0gdHJ1ZSxcbiAgICAgIGludm9rZURldldpdGg6IHR5cGVvZiBlbnRyeVsnaW52b2tlX2Rldl93aXRoJ10gPT09ICdzdHJpbmcnID8gZW50cnlbJ2ludm9rZV9kZXZfd2l0aCddIDogJycsXG4gICAgfSk7XG4gIH1cblxuICAvLyBSdWxlIDE6IGlkcyB1bmlxdWUuXG4gIGNvbnN0IHNlZW4gPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgZm9yIChjb25zdCB7IGlkIH0gb2YgZW50cmllcykge1xuICAgIGlmIChzZWVuLmhhcyhpZCkpIHRocm93IG5ldyBTdG9yaWVzVmFsaWRhdGlvbkVycm9yKGBkdXBsaWNhdGUgaWQgXCIke2lkfVwiYCk7XG4gICAgc2Vlbi5hZGQoaWQpO1xuICB9XG4gIC8vIFJ1bGUgMjogcHJlZml4LWZyZWUgdW5kZXIgdGhlIGA8aWQ+LWAgZmlsZW5hbWUtbWF0Y2hpbmcgY29udmVudGlvbi5cbiAgZm9yIChjb25zdCBhIG9mIHNlZW4pIHtcbiAgICBmb3IgKGNvbnN0IGIgb2Ygc2Vlbikge1xuICAgICAgaWYgKGEgIT09IGIgJiYgYS5zdGFydHNXaXRoKGAke2J9LWApKSB7XG4gICAgICAgIHRocm93IG5ldyBTdG9yaWVzVmFsaWRhdGlvbkVycm9yKGBpZHMgXCIke2J9XCIgYW5kIFwiJHthfVwiIGNvbGxpZGUgdW5kZXIgdGhlIDxpZD4tIGNvbnZlbnRpb25gKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgcmV0dXJuIGVudHJpZXM7XG59XG4iLCAiLyoqXG4gKiBJbi1tZW1vcnkgcmVmZXJlbmNlIGltcGxlbWVudGF0aW9uIG9mIHRoZSBzcGluZSBlbmdpbmUsIHdyaXR0ZW4gdG8gbWFrZSB0aGVcbiAqIGNvbmZvcm1hbmNlIHN1aXRlIGluIHRlc3QvIHBhc3MuIFRoZSBwcm9kdWN0aW9uIHNlcnZpY2Ugd3JhcHMgdGhpcyBzYW1lXG4gKiBjb3JlIHdpdGggUG9zdGdyZXMgcGVyc2lzdGVuY2UgKFBoYXNlIDEgc3RvcnkgXCIxMVwiKS5cbiAqXG4gKiBSdWxlIHByb3ZlbmFuY2UgbGl2ZXMgaW4gdGhlIHRlc3RzIGFuZCBpbiB0ZXN0L0NPTkZPUk1BTkNFLm1kIFx1MjAxNCB0aGlzIGZpbGVcbiAqIG9ubHkgZW5jb2RlcyB3aGF0IHRoZSBzdWl0ZSBwaW5zLiBXaGVyZSBhbiBvcmRlcmluZyBvciBzZW1hbnRpYyB3YXNcbiAqIGFyYml0cmF0ZWQsIHRoZSBjb21tZW50IG5hbWVzIHRoZSBwaW4uXG4gKi9cbmltcG9ydCB7XG4gIEJMT0NLRURfUkVBU09OUyxcbiAgQ29uZmxpY3RFcnJvcixcbiAgR3VhcmRGYWlsZWRFcnJvcixcbiAgSW52YWxpZFRyYW5zaXRpb25FcnJvcixcbiAgUGVybWlzc2lvbkRlbmllZEVycm9yLFxuICBSRVZJRVdfTE9PUF9MSU1JVCxcbiAgU3Rvcmllc1ZhbGlkYXRpb25FcnJvcixcbiAgV09SS19JVEVNX1NUQVRFUyxcbiAgdHlwZSBBY3RvcixcbiAgdHlwZSBBY3RvclR5cGUsXG4gIHR5cGUgQWR2YW5jZUlucHV0LFxuICB0eXBlIEJsb2NrZWRSZWFzb24sXG4gIHR5cGUgQ2xhaW0sXG4gIHR5cGUgQ3JlYXRlV29ya0l0ZW1JbnB1dCxcbiAgdHlwZSBEaXZlcmdlbmNlUmVwb3J0LFxuICB0eXBlIEV2aWRlbmNlLFxuICB0eXBlIEZlYXR1cmUsXG4gIHR5cGUgR2F0ZUNvZGUsXG4gIHR5cGUgR2F0ZURlY2lzaW9uSW5wdXQsXG4gIHR5cGUgUGVybWlzc2lvbixcbiAgdHlwZSBTcGluZUVuZ2luZSxcbiAgdHlwZSBTcGluZUV2ZW50LFxuICB0eXBlIFN0b3JpZXNJbXBvcnRSZXN1bHQsXG4gIHR5cGUgV29ya0l0ZW0sXG4gIHR5cGUgV29ya0l0ZW1TdGF0ZSxcbn0gZnJvbSAnLi90eXBlcy5qcyc7XG5pbXBvcnQgeyBwYXJzZVN0b3JpZXMgfSBmcm9tICcuL3N0b3JpZXMuanMnO1xuXG5jb25zdCBSQU5LOiBSZWNvcmQ8V29ya0l0ZW1TdGF0ZSwgbnVtYmVyPiA9IE9iamVjdC5mcm9tRW50cmllcyhcbiAgV09SS19JVEVNX1NUQVRFUy5tYXAoKHMsIGkpID0+IFtzLCBpXSksXG4pIGFzIFJlY29yZDxXb3JrSXRlbVN0YXRlLCBudW1iZXI+O1xuXG4vKipcbiAqIFRoZSB2ZXJzaW9uZWQgdHJhbnNpdGlvbiB0YWJsZSAocm9hZG1hcCBcdTAwQTcxLjIpLiBDbGFpbXMgc2VyaWFsaXplIHRoZVxuICogRVhFQ1VUSU9OIHpvbmUgKGNvbmZvcm1hbmNlIHBpbiwgc2VlIHRlc3QvQ09ORk9STUFOQ0UubWQpOiBwbGFubmluZ1xuICogdHJhbnNpdGlvbnMgYXJlIHBlcm1pc3Npb24tb25seTsgcmVhZHlfZm9yX2Rldlx1MjE5MmluX3Byb2dyZXNzIG9ud2FyZCBkZW1hbmQgYVxuICogcHJlc2VudGVkLCBsaXZlIGZlbmNpbmcgdG9rZW4uIEdhdGUtZmlyZWQgdHJhbnNpdGlvbnMgKHNwZWNfYXBwcm92YWwsXG4gKiByZXZpZXdfYXBwcm92YWwpIGRvIG5vdCBhcHBlYXIgaGVyZSBcdTIwMTQgYXBwcm92ZUdhdGUvcmVqZWN0R2F0ZSBmaXJlIHRoZW0uXG4gKi9cbmludGVyZmFjZSBUcmFuc2l0aW9uUnVsZSB7XG4gIGZyb206IFdvcmtJdGVtU3RhdGU7XG4gIHRvOiBXb3JrSXRlbVN0YXRlO1xuICBwZXJtaXNzaW9uOiBQZXJtaXNzaW9uO1xuICBjbGFpbVJlcXVpcmVkOiBib29sZWFuO1xuICBndWFyZHM6IEFycmF5PCdkZXBzX2RvbmUnIHwgJ3NwZWNfZ2F0ZV9pZl9jaGVja3BvaW50JyB8ICdub25lbXB0eV9kaWZmJz47XG59XG5cbmNvbnN0IFRSQU5TSVRJT05TOiBUcmFuc2l0aW9uUnVsZVtdID0gW1xuICB7IGZyb206ICdiYWNrbG9nJywgdG86ICdkcmFmdCcsIHBlcm1pc3Npb246ICd0YXNrLnBsYW4nLCBjbGFpbVJlcXVpcmVkOiBmYWxzZSwgZ3VhcmRzOiBbXSB9LFxuICB7XG4gICAgZnJvbTogJ2RyYWZ0JyxcbiAgICB0bzogJ3JlYWR5X2Zvcl9kZXYnLFxuICAgIHBlcm1pc3Npb246ICd0YXNrLnBsYW4nLFxuICAgIGNsYWltUmVxdWlyZWQ6IGZhbHNlLFxuICAgIGd1YXJkczogWydzcGVjX2dhdGVfaWZfY2hlY2twb2ludCddLFxuICB9LFxuICB7XG4gICAgZnJvbTogJ3JlYWR5X2Zvcl9kZXYnLFxuICAgIHRvOiAnaW5fcHJvZ3Jlc3MnLFxuICAgIHBlcm1pc3Npb246ICd0YXNrLmFkdmFuY2UnLFxuICAgIGNsYWltUmVxdWlyZWQ6IHRydWUsXG4gICAgZ3VhcmRzOiBbJ2RlcHNfZG9uZSddLFxuICB9LFxuICB7XG4gICAgZnJvbTogJ2luX3Byb2dyZXNzJyxcbiAgICB0bzogJ2luX3JldmlldycsXG4gICAgcGVybWlzc2lvbjogJ3Rhc2suYWR2YW5jZScsXG4gICAgY2xhaW1SZXF1aXJlZDogdHJ1ZSxcbiAgICBndWFyZHM6IFsnbm9uZW1wdHlfZGlmZiddLFxuICB9LFxuXTtcblxuaW50ZXJmYWNlIFdvcmtJdGVtUm93IGV4dGVuZHMgV29ya0l0ZW0ge1xuICBkZXBlbmRzT246IHN0cmluZ1tdO1xufVxuXG5pbnRlcmZhY2UgQ2xhaW1Sb3cgZXh0ZW5kcyBDbGFpbSB7XG4gIHR0bE1zOiBudW1iZXI7XG59XG5cbmludGVyZmFjZSBHYXRlRGVjaXNpb25Sb3cge1xuICB3b3JrSXRlbUlkOiBzdHJpbmc7XG4gIGdhdGU6IEdhdGVDb2RlO1xuICBkZWNpc2lvbjogJ2FwcHJvdmVkJyB8ICdyZWplY3RlZCc7XG4gIGFjdG9ySWQ6IHN0cmluZztcbn1cblxuaW50ZXJmYWNlIEV2aWRlbmNlUm93IHtcbiAgd29ya0l0ZW1JZDogc3RyaW5nO1xuICBldmlkZW5jZTogRXZpZGVuY2U7XG4gIHNlcTogbnVtYmVyO1xufVxuXG5jb25zdCBMRUdBQ1lfU1RBVFVTOiBSZWNvcmQ8c3RyaW5nLCBXb3JrSXRlbVN0YXRlPiA9IHtcbiAgYmFja2xvZzogJ2JhY2tsb2cnLFxuICBkcmFmdDogJ2RyYWZ0JyxcbiAgJ3JlYWR5LWZvci1kZXYnOiAncmVhZHlfZm9yX2RldicsXG4gIHJlYWR5X2Zvcl9kZXY6ICdyZWFkeV9mb3JfZGV2JyxcbiAgJ2luLXByb2dyZXNzJzogJ2luX3Byb2dyZXNzJyxcbiAgaW5fcHJvZ3Jlc3M6ICdpbl9wcm9ncmVzcycsXG4gICdpbi1yZXZpZXcnOiAnaW5fcmV2aWV3JyxcbiAgaW5fcmV2aWV3OiAnaW5fcmV2aWV3JyxcbiAgcmV2aWV3OiAnaW5fcmV2aWV3JyxcbiAgZG9uZTogJ2RvbmUnLFxufTtcblxuY2xhc3MgRW5naW5lSW1wbCBpbXBsZW1lbnRzIFNwaW5lRW5naW5lIHtcbiAgcHJpdmF0ZSBub3cgPSAwO1xuICBwcml2YXRlIHNlcSA9IDA7XG4gIHByaXZhdGUgZ2xvYmFsU2VxID0gMDtcblxuICBwcml2YXRlIHJlYWRvbmx5IGFjdG9ycyA9IG5ldyBNYXA8c3RyaW5nLCBBY3Rvcj4oKTtcbiAgcHJpdmF0ZSByZWFkb25seSBncmFudHMgPSBuZXcgTWFwPHN0cmluZywgU2V0PHN0cmluZz4+KCk7IC8vIGFjdG9ySWQgLT4gXCJwZXJtaXNzaW9uXCIgKHNjb3BlIGlnbm9yZWQgdW50aWwgUGhhc2UgMilcbiAgcHJpdmF0ZSByZWFkb25seSBmZWF0dXJlcyA9IG5ldyBNYXA8c3RyaW5nLCBGZWF0dXJlPigpO1xuICBwcml2YXRlIHJlYWRvbmx5IHdvcmtJdGVtcyA9IG5ldyBNYXA8c3RyaW5nLCBXb3JrSXRlbVJvdz4oKTtcbiAgcHJpdmF0ZSByZWFkb25seSBleHRlcm5hbEtleUluZGV4ID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZz4oKTsgLy8gZXh0ZXJuYWxLZXkgLT4gd29ya0l0ZW1JZCAoZmlyc3Qgd3JpdGVyIHdpbnMpXG4gIHByaXZhdGUgcmVhZG9ubHkgY2xhaW1zID0gbmV3IE1hcDxzdHJpbmcsIENsYWltUm93PigpO1xuICBwcml2YXRlIHJlYWRvbmx5IGNsYWltc0J5SXRlbSA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmdbXT4oKTsgLy8gd29ya0l0ZW1JZCAtPiBjbGFpbUlkc1xuICBwcml2YXRlIHJlYWRvbmx5IGZlbmNpbmdDb3VudGVyID0gbmV3IE1hcDxzdHJpbmcsIG51bWJlcj4oKTsgLy8gd29ya0l0ZW1JZCAtPiBsYXN0IHRva2VuXG4gIHByaXZhdGUgcmVhZG9ubHkgZ2F0ZURlY2lzaW9uczogR2F0ZURlY2lzaW9uUm93W10gPSBbXTtcbiAgcHJpdmF0ZSByZWFkb25seSBldmlkZW5jZVJvd3M6IEV2aWRlbmNlUm93W10gPSBbXTtcbiAgcHJpdmF0ZSByZWFkb25seSBldmVudExvZzogU3BpbmVFdmVudFtdID0gW107XG4gIHByaXZhdGUgcmVhZG9ubHkgc3RyZWFtU2VxcyA9IG5ldyBNYXA8c3RyaW5nLCBudW1iZXI+KCk7XG4gIHByaXZhdGUgcmVhZG9ubHkgaWRlbXBvdGVuY3lDYWNoZSA9IG5ldyBNYXA8c3RyaW5nLCBXb3JrSXRlbT4oKTtcblxuICByZWFkb25seSBzeXN0ZW1BY3RvcklkOiBzdHJpbmc7XG5cbiAgY29uc3RydWN0b3IoKSB7XG4gICAgdGhpcy5zeXN0ZW1BY3RvcklkID0gdGhpcy5uZXh0SWQoJ2FjdG9yLXN5c3RlbScpO1xuICAgIHRoaXMuYWN0b3JzLnNldCh0aGlzLnN5c3RlbUFjdG9ySWQsIHtcbiAgICAgIGlkOiB0aGlzLnN5c3RlbUFjdG9ySWQsXG4gICAgICB0eXBlOiAnc3lzdGVtJyxcbiAgICAgIGRpc3BsYXlOYW1lOiAnc3lzdGVtJyxcbiAgICB9KTtcbiAgfVxuXG4gIC8vIC0tIGluZnJhc3RydWN0dXJlIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgcHJpdmF0ZSBuZXh0SWQocHJlZml4OiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIHRoaXMuc2VxICs9IDE7XG4gICAgcmV0dXJuIGAke3ByZWZpeH1fJHt0aGlzLnNlcS50b1N0cmluZygzNikucGFkU3RhcnQoNiwgJzAnKX1gO1xuICB9XG5cbiAgcHJpdmF0ZSBhcHBlbmQoXG4gICAgc3RyZWFtVHlwZTogU3BpbmVFdmVudFsnc3RyZWFtVHlwZSddLFxuICAgIHN0cmVhbUlkOiBzdHJpbmcsXG4gICAgdHlwZTogc3RyaW5nLFxuICAgIGFjdG9ySWQ6IHN0cmluZyxcbiAgICBwYXlsb2FkOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPixcbiAgICBleHRyYT86IHsgY2F1c2F0aW9uSWQ/OiBzdHJpbmc7IGlkZW1wb3RlbmN5S2V5Pzogc3RyaW5nIH0sXG4gICk6IFNwaW5lRXZlbnQge1xuICAgIHRoaXMuZ2xvYmFsU2VxICs9IDE7XG4gICAgY29uc3Qgc3RyZWFtU2VxID0gKHRoaXMuc3RyZWFtU2Vxcy5nZXQoc3RyZWFtSWQpID8/IDApICsgMTtcbiAgICB0aGlzLnN0cmVhbVNlcXMuc2V0KHN0cmVhbUlkLCBzdHJlYW1TZXEpO1xuICAgIGNvbnN0IGV2ZW50OiBTcGluZUV2ZW50ID0ge1xuICAgICAgZ2xvYmFsU2VxOiB0aGlzLmdsb2JhbFNlcSxcbiAgICAgIHN0cmVhbVR5cGUsXG4gICAgICBzdHJlYW1JZCxcbiAgICAgIHN0cmVhbVNlcSxcbiAgICAgIHR5cGUsXG4gICAgICBhY3RvcklkLFxuICAgICAgcGF5bG9hZCxcbiAgICAgIC4uLihleHRyYT8uY2F1c2F0aW9uSWQgIT09IHVuZGVmaW5lZCA/IHsgY2F1c2F0aW9uSWQ6IGV4dHJhLmNhdXNhdGlvbklkIH0gOiB7fSksXG4gICAgfTtcbiAgICB0aGlzLmV2ZW50TG9nLnB1c2goZXZlbnQpO1xuICAgIHJldHVybiBldmVudDtcbiAgfVxuXG4gIHByaXZhdGUgbXVzdEdldEl0ZW0od29ya0l0ZW1JZDogc3RyaW5nKTogV29ya0l0ZW1Sb3cge1xuICAgIGNvbnN0IGJ5SWQgPSB0aGlzLndvcmtJdGVtcy5nZXQod29ya0l0ZW1JZCk7XG4gICAgaWYgKGJ5SWQpIHJldHVybiBieUlkO1xuICAgIC8vIEltcG9ydGVkIHN0b3JpZXMgYXJlIGFkZHJlc3NlZCBieSB0aGVpciBleHRlcm5hbEtleSBoYW5kbGVcbiAgICAvLyAoY29uZm9ybWFuY2UgcGluIGluIHN0b3JpZXMtaW1wb3J0LnRlc3QudHMpLlxuICAgIGNvbnN0IG1hcHBlZCA9IHRoaXMuZXh0ZXJuYWxLZXlJbmRleC5nZXQod29ya0l0ZW1JZCk7XG4gICAgaWYgKG1hcHBlZCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBjb25zdCBpdGVtID0gdGhpcy53b3JrSXRlbXMuZ2V0KG1hcHBlZCk7XG4gICAgICBpZiAoaXRlbSkgcmV0dXJuIGl0ZW07XG4gICAgfVxuICAgIHRocm93IG5ldyBHdWFyZEZhaWxlZEVycm9yKGB1bmtub3duIHdvcmsgaXRlbTogJHt3b3JrSXRlbUlkfWApO1xuICB9XG5cbiAgcHJpdmF0ZSBoYXNQZXJtaXNzaW9uKGFjdG9ySWQ6IHN0cmluZywgcGVybWlzc2lvbjogUGVybWlzc2lvbik6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmdyYW50cy5nZXQoYWN0b3JJZCk/LmhhcyhwZXJtaXNzaW9uKSA/PyBmYWxzZTtcbiAgfVxuXG4gIHByaXZhdGUgcmVxdWlyZVBlcm1pc3Npb24oYWN0b3JJZDogc3RyaW5nLCBwZXJtaXNzaW9uOiBQZXJtaXNzaW9uKTogdm9pZCB7XG4gICAgaWYgKCF0aGlzLmhhc1Blcm1pc3Npb24oYWN0b3JJZCwgcGVybWlzc2lvbikpIHtcbiAgICAgIHRocm93IG5ldyBQZXJtaXNzaW9uRGVuaWVkRXJyb3IocGVybWlzc2lvbiwgYWN0b3JJZCk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBsaXZlQ2xhaW0od29ya0l0ZW1JZDogc3RyaW5nKTogQ2xhaW1Sb3cgfCBudWxsIHtcbiAgICBmb3IgKGNvbnN0IGNsYWltSWQgb2YgdGhpcy5jbGFpbXNCeUl0ZW0uZ2V0KHdvcmtJdGVtSWQpID8/IFtdKSB7XG4gICAgICBjb25zdCBjbGFpbSA9IHRoaXMuY2xhaW1zLmdldChjbGFpbUlkKTtcbiAgICAgIGlmIChjbGFpbSAmJiAhY2xhaW0ucmVsZWFzZWQgJiYgY2xhaW0ubGVhc2VFeHBpcmVzQXQgPiB0aGlzLm5vdykgcmV0dXJuIGNsYWltO1xuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIC8qKlxuICAgKiBBIFBSRVNFTlRFRCB0b2tlbiBpcyBhbHdheXMgdmFsaWRhdGVkLCBvbiBldmVyeSBjb21tYW5kIChjb25mb3JtYW5jZSBwaW4sXG4gICAqIGNsYWltcy50ZXN0LnRzKTogc3RhbGUvZm9yZWlnbi9uby1saXZlLWNsYWltIFx1MjE5MiBDb25mbGljdEVycm9yICsgYXVkaXQgZXZlbnQuXG4gICAqL1xuICBwcml2YXRlIHZhbGlkYXRlUHJlc2VudGVkVG9rZW4oaXRlbTogV29ya0l0ZW1Sb3csIGZlbmNpbmdUb2tlbjogbnVtYmVyIHwgdW5kZWZpbmVkLCBhY3RvcklkOiBzdHJpbmcpOiB2b2lkIHtcbiAgICBpZiAoZmVuY2luZ1Rva2VuID09PSB1bmRlZmluZWQpIHJldHVybjtcbiAgICBjb25zdCBsaXZlID0gdGhpcy5saXZlQ2xhaW0oaXRlbS5pZCk7XG4gICAgaWYgKGxpdmUgPT09IG51bGwgfHwgbGl2ZS5mZW5jaW5nVG9rZW4gIT09IGZlbmNpbmdUb2tlbikge1xuICAgICAgdGhpcy5hcHBlbmQoJ3dvcmtfaXRlbScsIGl0ZW0uaWQsICdmZW5jaW5nLnJlamVjdGVkJywgYWN0b3JJZCwge1xuICAgICAgICBwcmVzZW50ZWRUb2tlbjogZmVuY2luZ1Rva2VuLFxuICAgICAgICBsaXZlVG9rZW46IGxpdmU/LmZlbmNpbmdUb2tlbiA/PyBudWxsLFxuICAgICAgfSk7XG4gICAgICB0aHJvdyBuZXcgQ29uZmxpY3RFcnJvcihgc3RhbGUgb3IgZm9yZWlnbiBmZW5jaW5nIHRva2VuIGZvciB3b3JrIGl0ZW0gJHtpdGVtLmlkfWApO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgY29weUl0ZW0oaXRlbTogV29ya0l0ZW1Sb3cpOiBXb3JrSXRlbSB7XG4gICAgY29uc3QgeyBkZXBlbmRzT246IF9kZXBlbmRzT24sIC4uLnB1YiB9ID0gaXRlbTtcbiAgICByZXR1cm4geyAuLi5wdWIsIHBpbm5lZFZlcmlmaWNhdGlvbjogaXRlbS5waW5uZWRWZXJpZmljYXRpb24gPyBbLi4uaXRlbS5waW5uZWRWZXJpZmljYXRpb25dIDogbnVsbCB9O1xuICB9XG5cbiAgcHJpdmF0ZSBjb3B5RmVhdHVyZShmZWF0dXJlOiBGZWF0dXJlKTogRmVhdHVyZSB7XG4gICAgcmV0dXJuIHsgLi4uZmVhdHVyZSB9O1xuICB9XG5cbiAgcHJpdmF0ZSBjb3B5Q2xhaW0oY2xhaW06IENsYWltUm93KTogQ2xhaW0ge1xuICAgIGNvbnN0IHsgdHRsTXM6IF90dGwsIC4uLnB1YiB9ID0gY2xhaW07XG4gICAgcmV0dXJuIHsgLi4ucHViIH07XG4gIH1cblxuICAvLyAtLSBzZXR1cCAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIGNyZWF0ZUFjdG9yKGlucHV0OiB7IHR5cGU6IEV4Y2x1ZGU8QWN0b3JUeXBlLCAnc3lzdGVtJz47IGRpc3BsYXlOYW1lOiBzdHJpbmcgfSk6IEFjdG9yIHtcbiAgICBjb25zdCBhY3RvcjogQWN0b3IgPSB7IGlkOiB0aGlzLm5leHRJZCgnYWN0b3InKSwgdHlwZTogaW5wdXQudHlwZSwgZGlzcGxheU5hbWU6IGlucHV0LmRpc3BsYXlOYW1lIH07XG4gICAgdGhpcy5hY3RvcnMuc2V0KGFjdG9yLmlkLCBhY3Rvcik7XG4gICAgcmV0dXJuIHsgLi4uYWN0b3IgfTtcbiAgfVxuXG4gIGdyYW50KGlucHV0OiB7IGFjdG9ySWQ6IHN0cmluZzsgcGVybWlzc2lvbjogUGVybWlzc2lvbjsgc2NvcGU/OiBzdHJpbmcgfSk6IHZvaWQge1xuICAgIGNvbnN0IHNldCA9IHRoaXMuZ3JhbnRzLmdldChpbnB1dC5hY3RvcklkKSA/PyBuZXcgU2V0PHN0cmluZz4oKTtcbiAgICBzZXQuYWRkKGlucHV0LnBlcm1pc3Npb24pO1xuICAgIHRoaXMuZ3JhbnRzLnNldChpbnB1dC5hY3RvcklkLCBzZXQpO1xuICB9XG5cbiAgcmV2b2tlKGlucHV0OiB7IGFjdG9ySWQ6IHN0cmluZzsgcGVybWlzc2lvbjogUGVybWlzc2lvbjsgc2NvcGU/OiBzdHJpbmcgfSk6IHZvaWQge1xuICAgIHRoaXMuZ3JhbnRzLmdldChpbnB1dC5hY3RvcklkKT8uZGVsZXRlKGlucHV0LnBlcm1pc3Npb24pO1xuICB9XG5cbiAgY3JlYXRlRmVhdHVyZShpbnB1dDogeyBhY3RvcklkOiBzdHJpbmcgfSk6IEZlYXR1cmUge1xuICAgIGNvbnN0IGZlYXR1cmU6IEZlYXR1cmUgPSB7IGlkOiB0aGlzLm5leHRJZCgnZmVhdCcpLCBzdGF0ZTogJ2JhY2tsb2cnLCBkaXNwYXRjaEhvbGQ6IGZhbHNlIH07XG4gICAgdGhpcy5mZWF0dXJlcy5zZXQoZmVhdHVyZS5pZCwgZmVhdHVyZSk7XG4gICAgdGhpcy5hcHBlbmQoJ2ZlYXR1cmUnLCBmZWF0dXJlLmlkLCAnZmVhdHVyZS5jcmVhdGVkJywgaW5wdXQuYWN0b3JJZCwge30pO1xuICAgIHJldHVybiB0aGlzLmNvcHlGZWF0dXJlKGZlYXR1cmUpO1xuICB9XG5cbiAgY3JlYXRlV29ya0l0ZW0oaW5wdXQ6IENyZWF0ZVdvcmtJdGVtSW5wdXQgJiB7IGFjdG9ySWQ6IHN0cmluZyB9KTogV29ya0l0ZW0ge1xuICAgIGNvbnN0IHNsdWcgPSBpbnB1dC50aXRsZVxuICAgICAgLnRvTG93ZXJDYXNlKClcbiAgICAgIC5yZXBsYWNlKC9bXmEtejAtOV0rL2csICctJylcbiAgICAgIC5yZXBsYWNlKC8oXi18LSQpL2csICcnKTtcbiAgICBjb25zdCBpdGVtOiBXb3JrSXRlbVJvdyA9IHtcbiAgICAgIGlkOiB0aGlzLm5leHRJZCgnd2knKSxcbiAgICAgIGZlYXR1cmVJZDogaW5wdXQuZmVhdHVyZUlkLFxuICAgICAgZXh0ZXJuYWxLZXk6IGlucHV0LmV4dGVybmFsS2V5LFxuICAgICAgdGl0bGU6IGlucHV0LnRpdGxlLFxuICAgICAgc3RhdGU6ICdiYWNrbG9nJyxcbiAgICAgIGJsb2NrZWRSZWFzb246IG51bGwsXG4gICAgICByZXZpZXdMb29wSXRlcmF0aW9uOiAwLFxuICAgICAgaW50ZW50SGFzaDogbnVsbCxcbiAgICAgIHBpbm5lZFZlcmlmaWNhdGlvbjogbnVsbCxcbiAgICAgIHNwZWNDaGVja3BvaW50OiBpbnB1dC5zcGVjQ2hlY2twb2ludCA/PyBmYWxzZSxcbiAgICAgIGRvbmVDaGVja3BvaW50OiBpbnB1dC5kb25lQ2hlY2twb2ludCA/PyBmYWxzZSxcbiAgICAgIGludm9rZURldldpdGg6IGlucHV0Lmludm9rZURldldpdGggPz8gJycsXG4gICAgICBzcGVjUGF0aDogYHN0b3JpZXMvJHtpbnB1dC5leHRlcm5hbEtleX0tJHtzbHVnfS5tZGAsXG4gICAgICBzdGF0ZVZlcnNpb246IDAsXG4gICAgICBkZXBlbmRzT246IGlucHV0LmRlcGVuZHNPbiA/IFsuLi5pbnB1dC5kZXBlbmRzT25dIDogW10sXG4gICAgfTtcbiAgICB0aGlzLndvcmtJdGVtcy5zZXQoaXRlbS5pZCwgaXRlbSk7XG4gICAgaWYgKCF0aGlzLmV4dGVybmFsS2V5SW5kZXguaGFzKGl0ZW0uZXh0ZXJuYWxLZXkpKSB7XG4gICAgICB0aGlzLmV4dGVybmFsS2V5SW5kZXguc2V0KGl0ZW0uZXh0ZXJuYWxLZXksIGl0ZW0uaWQpO1xuICAgIH1cbiAgICB0aGlzLmFwcGVuZCgnd29ya19pdGVtJywgaXRlbS5pZCwgJ3dvcmtfaXRlbS5jcmVhdGVkJywgaW5wdXQuYWN0b3JJZCwge1xuICAgICAgZXh0ZXJuYWxLZXk6IGl0ZW0uZXh0ZXJuYWxLZXksXG4gICAgICBmZWF0dXJlSWQ6IGl0ZW0uZmVhdHVyZUlkLFxuICAgIH0pO1xuICAgIHJldHVybiB0aGlzLmNvcHlJdGVtKGl0ZW0pO1xuICB9XG5cbiAgaW1wb3J0U3RvcmllcyhpbnB1dDogeyBmZWF0dXJlSWQ6IHN0cmluZzsgeWFtbDogc3RyaW5nOyBhY3RvcklkOiBzdHJpbmcgfSk6IFN0b3JpZXNJbXBvcnRSZXN1bHQge1xuICAgIGNvbnN0IGVudHJpZXMgPSBwYXJzZVN0b3JpZXMoaW5wdXQueWFtbCk7XG4gICAgaWYgKCF0aGlzLmZlYXR1cmVzLmhhcyhpbnB1dC5mZWF0dXJlSWQpKSB7XG4gICAgICB0aHJvdyBuZXcgU3Rvcmllc1ZhbGlkYXRpb25FcnJvcihgdW5rbm93biBmZWF0dXJlOiAke2lucHV0LmZlYXR1cmVJZH1gKTtcbiAgICB9XG4gICAgY29uc3QgaW1wb3J0ZWQ6IHN0cmluZ1tdID0gW107XG4gICAgY29uc3QgdXBkYXRlZDogc3RyaW5nW10gPSBbXTtcbiAgICBjb25zdCB3YXJuaW5nczogc3RyaW5nW10gPSBbXTtcblxuICAgIGZvciAoY29uc3QgZW50cnkgb2YgZW50cmllcykge1xuICAgICAgY29uc3QgZXhpc3RpbmcgPSBbLi4udGhpcy53b3JrSXRlbXMudmFsdWVzKCldLmZpbmQoXG4gICAgICAgICh3aSkgPT4gd2kuZmVhdHVyZUlkID09PSBpbnB1dC5mZWF0dXJlSWQgJiYgd2kuZXh0ZXJuYWxLZXkgPT09IGVudHJ5LmlkLFxuICAgICAgKTtcbiAgICAgIGlmIChleGlzdGluZykge1xuICAgICAgICAvLyBSZS1pbXBvcnQgcmVmcmVzaGVzIGRlc2NyaXB0aXZlIGZpZWxkczsgbGlmZWN5Y2xlIHN0YXRlIGlzIG5ldmVyXG4gICAgICAgIC8vIHRvdWNoZWQgKHN0b3JpZXMueWFtbCBjYXJyaWVzIG5vIHN0YXR1cyBcdTIwMTQgRDksIHZhbGlkaXR5IHJ1bGUgMykuXG4gICAgICAgIGV4aXN0aW5nLnRpdGxlID0gZW50cnkudGl0bGU7XG4gICAgICAgIGV4aXN0aW5nLnNwZWNDaGVja3BvaW50ID0gZW50cnkuc3BlY0NoZWNrcG9pbnQ7XG4gICAgICAgIGV4aXN0aW5nLmRvbmVDaGVja3BvaW50ID0gZW50cnkuZG9uZUNoZWNrcG9pbnQ7XG4gICAgICAgIGV4aXN0aW5nLmludm9rZURldldpdGggPSBlbnRyeS5pbnZva2VEZXZXaXRoO1xuICAgICAgICB0aGlzLmFwcGVuZCgnd29ya19pdGVtJywgZXhpc3RpbmcuaWQsICd3b3JrX2l0ZW0ucmVpbXBvcnRlZCcsIGlucHV0LmFjdG9ySWQsIHsgZXh0ZXJuYWxLZXk6IGVudHJ5LmlkIH0pO1xuICAgICAgICB1cGRhdGVkLnB1c2goZW50cnkuaWQpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5jcmVhdGVXb3JrSXRlbSh7XG4gICAgICAgICAgZmVhdHVyZUlkOiBpbnB1dC5mZWF0dXJlSWQsXG4gICAgICAgICAgZXh0ZXJuYWxLZXk6IGVudHJ5LmlkLFxuICAgICAgICAgIHRpdGxlOiBlbnRyeS50aXRsZSxcbiAgICAgICAgICBzcGVjQ2hlY2twb2ludDogZW50cnkuc3BlY0NoZWNrcG9pbnQsXG4gICAgICAgICAgZG9uZUNoZWNrcG9pbnQ6IGVudHJ5LmRvbmVDaGVja3BvaW50LFxuICAgICAgICAgIGludm9rZURldldpdGg6IGVudHJ5Lmludm9rZURldldpdGgsXG4gICAgICAgICAgYWN0b3JJZDogaW5wdXQuYWN0b3JJZCxcbiAgICAgICAgfSk7XG4gICAgICAgIGltcG9ydGVkLnB1c2goZW50cnkuaWQpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4geyBpbXBvcnRlZCwgdXBkYXRlZCwgd2FybmluZ3MgfTtcbiAgfVxuXG4gIC8vIC0tIGNsYWltcyAocm9hZG1hcCBcdTAwQTcxLjMpIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIGNsYWltVGFzayhpbnB1dDogeyB3b3JrSXRlbUlkOiBzdHJpbmc7IGFjdG9ySWQ6IHN0cmluZzsgdHRsTXM/OiBudW1iZXIgfSk6IENsYWltIHtcbiAgICBjb25zdCBpdGVtID0gdGhpcy5tdXN0R2V0SXRlbShpbnB1dC53b3JrSXRlbUlkKTtcbiAgICB0aGlzLnJlcXVpcmVQZXJtaXNzaW9uKGlucHV0LmFjdG9ySWQsICd0YXNrLmNsYWltJyk7XG4gICAgaWYgKHRoaXMubGl2ZUNsYWltKGl0ZW0uaWQpICE9PSBudWxsKSB7XG4gICAgICAvLyBPbmUgbGl2ZSBjbGFpbSBwZXIgd29yayBpdGVtIFx1MjAxNCByYWNlcyBsb3NlIGJ5IGNvbnN0cmFpbnQgKFx1MDBBNzEuMyk7XG4gICAgICAvLyB0aGUgbG9zZXIgbGVhdmVzIG5vIHJvdyBiZWhpbmQuXG4gICAgICB0aHJvdyBuZXcgQ29uZmxpY3RFcnJvcihgd29yayBpdGVtICR7aXRlbS5pZH0gYWxyZWFkeSBoYXMgYSBsaXZlIGNsYWltYCk7XG4gICAgfVxuICAgIGNvbnN0IHR0bE1zID0gaW5wdXQudHRsTXMgPz8gMTUgKiA2MCAqIDEwMDA7XG4gICAgY29uc3QgdG9rZW4gPSAodGhpcy5mZW5jaW5nQ291bnRlci5nZXQoaXRlbS5pZCkgPz8gMCkgKyAxO1xuICAgIHRoaXMuZmVuY2luZ0NvdW50ZXIuc2V0KGl0ZW0uaWQsIHRva2VuKTtcbiAgICBjb25zdCBjbGFpbTogQ2xhaW1Sb3cgPSB7XG4gICAgICBpZDogdGhpcy5uZXh0SWQoJ2NsYWltJyksXG4gICAgICB3b3JrSXRlbUlkOiBpdGVtLmlkLFxuICAgICAgYWN0b3JJZDogaW5wdXQuYWN0b3JJZCxcbiAgICAgIGZlbmNpbmdUb2tlbjogdG9rZW4sXG4gICAgICBsZWFzZUV4cGlyZXNBdDogdGhpcy5ub3cgKyB0dGxNcyxcbiAgICAgIHJlbGVhc2VkOiBmYWxzZSxcbiAgICAgIHR0bE1zLFxuICAgIH07XG4gICAgdGhpcy5jbGFpbXMuc2V0KGNsYWltLmlkLCBjbGFpbSk7XG4gICAgdGhpcy5jbGFpbXNCeUl0ZW0uc2V0KGl0ZW0uaWQsIFsuLi4odGhpcy5jbGFpbXNCeUl0ZW0uZ2V0KGl0ZW0uaWQpID8/IFtdKSwgY2xhaW0uaWRdKTtcbiAgICB0aGlzLmFwcGVuZCgnd29ya19pdGVtJywgaXRlbS5pZCwgJ3dvcmtfaXRlbS5jbGFpbWVkJywgaW5wdXQuYWN0b3JJZCwgeyBjbGFpbUlkOiBjbGFpbS5pZCwgZmVuY2luZ1Rva2VuOiB0b2tlbiB9KTtcbiAgICByZXR1cm4gdGhpcy5jb3B5Q2xhaW0oY2xhaW0pO1xuICB9XG5cbiAgaGVhcnRiZWF0KGlucHV0OiB7IGNsYWltSWQ6IHN0cmluZyB9KTogdm9pZCB7XG4gICAgY29uc3QgY2xhaW0gPSB0aGlzLmNsYWltcy5nZXQoaW5wdXQuY2xhaW1JZCk7XG4gICAgaWYgKCFjbGFpbSB8fCBjbGFpbS5yZWxlYXNlZCB8fCBjbGFpbS5sZWFzZUV4cGlyZXNBdCA8PSB0aGlzLm5vdykge1xuICAgICAgdGhyb3cgbmV3IENvbmZsaWN0RXJyb3IoYGNsYWltICR7aW5wdXQuY2xhaW1JZH0gaXMgbm90IGxpdmVgKTtcbiAgICB9XG4gICAgY2xhaW0ubGVhc2VFeHBpcmVzQXQgPSB0aGlzLm5vdyArIGNsYWltLnR0bE1zO1xuICB9XG5cbiAgcmVsZWFzZUNsYWltKGlucHV0OiB7IGNsYWltSWQ6IHN0cmluZzsgcmVhc29uPzogc3RyaW5nIH0pOiB2b2lkIHtcbiAgICBjb25zdCBjbGFpbSA9IHRoaXMuY2xhaW1zLmdldChpbnB1dC5jbGFpbUlkKTtcbiAgICBpZiAoIWNsYWltIHx8IGNsYWltLnJlbGVhc2VkKSByZXR1cm47XG4gICAgY2xhaW0ucmVsZWFzZWQgPSB0cnVlO1xuICAgIHRoaXMuYXBwZW5kKCd3b3JrX2l0ZW0nLCBjbGFpbS53b3JrSXRlbUlkLCAnY2xhaW0ucmVsZWFzZWQnLCBjbGFpbS5hY3RvcklkLCB7XG4gICAgICBjbGFpbUlkOiBjbGFpbS5pZCxcbiAgICAgIHJlYXNvbjogaW5wdXQucmVhc29uID8/IG51bGwsXG4gICAgfSk7XG4gIH1cblxuICBhZHZhbmNlQ2xvY2sobXM6IG51bWJlcik6IHZvaWQge1xuICAgIHRoaXMubm93ICs9IG1zO1xuICB9XG5cbiAgLy8gLS0gbGlmZWN5Y2xlIChyb2FkbWFwIFx1MDBBNzEuMikgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICBhZHZhbmNlU3RhdGUoaW5wdXQ6IEFkdmFuY2VJbnB1dCk6IFdvcmtJdGVtIHtcbiAgICBjb25zdCBpdGVtID0gdGhpcy5tdXN0R2V0SXRlbShpbnB1dC53b3JrSXRlbUlkKTtcblxuICAgIC8vIEtleWVkIHJlcGxheTogdGhlIHNhbWUgY29tbWFuZCByZXR1cm5zIHRoZSBzYW1lIHJlc3VsdCwgYXBwZW5kcyBub3RoaW5nLlxuICAgIGlmIChpbnB1dC5pZGVtcG90ZW5jeUtleSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBjb25zdCBjYWNoZWQgPSB0aGlzLmlkZW1wb3RlbmN5Q2FjaGUuZ2V0KGlucHV0LmlkZW1wb3RlbmN5S2V5KTtcbiAgICAgIGlmIChjYWNoZWQpIHJldHVybiB7IC4uLmNhY2hlZCB9O1xuICAgIH1cblxuICAgIC8vIFByZXNlcnZhdGlvbiBuby1vcCAoc3ByaW50LXBsYW5uaW5nIGlkZW1wb3RlbmN5IHJ1bGUpOiBhbiBVTktFWUVEXG4gICAgLy8gcmUtcmVxdWVzdCBvZiB0aGUgY3VycmVudCBzdGF0ZSBzdWNjZWVkcyB3aXRob3V0IGFuIGV2ZW50LiBBIE5FVyBrZXllZFxuICAgIC8vIGNvbW1hbmQgaXMgYSBnZW51aW5lbHkgbmV3IGNvbW1hbmQgYW5kIGZhbGxzIHRocm91Z2ggdG8gdGhlIHN0cmljdFxuICAgIC8vIHRhYmxlIGNoZWNrIChjb25jdXJyZW5jeS50ZXN0LnRzIHBpbikuXG4gICAgaWYgKGlucHV0LmlkZW1wb3RlbmN5S2V5ID09PSB1bmRlZmluZWQgJiYgaW5wdXQudG8gPT09IGl0ZW0uc3RhdGUpIHtcbiAgICAgIHRoaXMudmFsaWRhdGVQcmVzZW50ZWRUb2tlbihpdGVtLCBpbnB1dC5mZW5jaW5nVG9rZW4sIGlucHV0LmFjdG9ySWQpO1xuICAgICAgcmV0dXJuIHRoaXMuY29weUl0ZW0oaXRlbSk7XG4gICAgfVxuXG4gICAgLy8gVHJhbnNpdGlvbi10YWJsZSBsb29rdXAgcHJlY2VkZXMgY2xhaW0vdG9rZW4vcGVybWlzc2lvbiBjaGVja3NcbiAgICAvLyAoZnNtLXRyYW5zaXRpb25zIHBpbjogdW5kZWNsYXJlZCBkb3duZ3JhZGVzIGFyZSBJbnZhbGlkVHJhbnNpdGlvbkVycm9yXG4gICAgLy8gZXZlbiB3aXRoIG5vIHRva2VuIHByZXNlbnRlZCkuXG4gICAgY29uc3QgcnVsZSA9IFRSQU5TSVRJT05TLmZpbmQoKHQpID0+IHQuZnJvbSA9PT0gaXRlbS5zdGF0ZSAmJiB0LnRvID09PSBpbnB1dC50byk7XG4gICAgaWYgKCFydWxlKSB7XG4gICAgICBpZiAoUkFOS1tpbnB1dC50b10gPCBSQU5LW2l0ZW0uc3RhdGVdICYmIHRoaXMuaGFzUGVybWlzc2lvbihpbnB1dC5hY3RvcklkLCAnc3RhdGUuZG93bmdyYWRlJykpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMucHJpdmlsZWdlZERvd25ncmFkZShpdGVtLCBpbnB1dCk7XG4gICAgICB9XG4gICAgICB0aHJvdyBuZXcgSW52YWxpZFRyYW5zaXRpb25FcnJvcihpdGVtLnN0YXRlLCBpbnB1dC50byk7XG4gICAgfVxuXG4gICAgdGhpcy52YWxpZGF0ZVByZXNlbnRlZFRva2VuKGl0ZW0sIGlucHV0LmZlbmNpbmdUb2tlbiwgaW5wdXQuYWN0b3JJZCk7XG5cbiAgICAvLyBCbG9ja2VkIG92ZXJsYXkgZnJlZXplcyB0cmFuc2l0aW9ucyBhdCBldmVyeSBzdGF0ZSAoRDgsIFx1MDBBNzEuMSkuXG4gICAgaWYgKGl0ZW0uYmxvY2tlZFJlYXNvbiAhPT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoYHdvcmsgaXRlbSBpcyBibG9ja2VkOiAke2l0ZW0uYmxvY2tlZFJlYXNvbn1gKTtcbiAgICB9XG5cbiAgICB0aGlzLnJlcXVpcmVQZXJtaXNzaW9uKGlucHV0LmFjdG9ySWQsIHJ1bGUucGVybWlzc2lvbik7XG5cbiAgICBpZiAocnVsZS5jbGFpbVJlcXVpcmVkKSB7XG4gICAgICAvLyBFeGVjdXRpb24tem9uZSB0cmFuc2l0aW9ucyBkZW1hbmQgYSBQUkVTRU5URUQgbGl2ZSB0b2tlbiBcdTIwMTQgaG9sZGluZ1xuICAgICAgLy8gdGhlIGNsYWltIHdpdGhvdXQgcHJlc2VudGluZyBpdCBpcyBub3QgZW5vdWdoIChjbGFpbXMudGVzdC50cyBwaW4pLlxuICAgICAgaWYgKGlucHV0LmZlbmNpbmdUb2tlbiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRocm93IG5ldyBHdWFyZEZhaWxlZEVycm9yKCdjbGFpbSBmZW5jaW5nIHRva2VuIHJlcXVpcmVkIGZvciB0aGlzIHRyYW5zaXRpb24nKTtcbiAgICAgIH1cbiAgICAgIC8vIChhbHJlYWR5IHZhbGlkYXRlZCBhYm92ZSlcbiAgICB9XG5cbiAgICBmb3IgKGNvbnN0IGd1YXJkIG9mIHJ1bGUuZ3VhcmRzKSB7XG4gICAgICB0aGlzLmNoZWNrR3VhcmQoZ3VhcmQsIGl0ZW0pO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLmV4ZWN1dGVUcmFuc2l0aW9uKGl0ZW0sIGlucHV0LnRvLCBpbnB1dC5hY3RvcklkLCBpbnB1dC5pZGVtcG90ZW5jeUtleSk7XG4gIH1cblxuICBwcml2YXRlIGNoZWNrR3VhcmQoZ3VhcmQ6IFRyYW5zaXRpb25SdWxlWydndWFyZHMnXVtudW1iZXJdLCBpdGVtOiBXb3JrSXRlbVJvdyk6IHZvaWQge1xuICAgIHN3aXRjaCAoZ3VhcmQpIHtcbiAgICAgIGNhc2UgJ2RlcHNfZG9uZSc6IHtcbiAgICAgICAgZm9yIChjb25zdCBkZXBLZXkgb2YgaXRlbS5kZXBlbmRzT24pIHtcbiAgICAgICAgICBjb25zdCBkZXAgPSBbLi4udGhpcy53b3JrSXRlbXMudmFsdWVzKCldLmZpbmQoXG4gICAgICAgICAgICAod2kpID0+IHdpLmZlYXR1cmVJZCA9PT0gaXRlbS5mZWF0dXJlSWQgJiYgd2kuZXh0ZXJuYWxLZXkgPT09IGRlcEtleSxcbiAgICAgICAgICApO1xuICAgICAgICAgIGlmIChkZXAgJiYgZGVwLnN0YXRlICE9PSAnZG9uZScpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBHdWFyZEZhaWxlZEVycm9yKGBkZXBlbmRlbmN5ICR7ZGVwS2V5fSBpcyBub3QgZG9uZWApO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBjYXNlICdzcGVjX2dhdGVfaWZfY2hlY2twb2ludCc6IHtcbiAgICAgICAgaWYgKCFpdGVtLnNwZWNDaGVja3BvaW50KSByZXR1cm47XG4gICAgICAgIGNvbnN0IGFwcHJvdmVkID0gdGhpcy5nYXRlRGVjaXNpb25zLnNvbWUoXG4gICAgICAgICAgKGQpID0+IGQud29ya0l0ZW1JZCA9PT0gaXRlbS5pZCAmJiBkLmdhdGUgPT09ICdzcGVjX2FwcHJvdmFsJyAmJiBkLmRlY2lzaW9uID09PSAnYXBwcm92ZWQnLFxuICAgICAgICApO1xuICAgICAgICBpZiAoIWFwcHJvdmVkKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoJ3NwZWNfY2hlY2twb2ludCByZXF1aXJlcyBhbiBhcHByb3ZlZCBzcGVjX2FwcHJvdmFsIGdhdGUgZGVjaXNpb24nKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBjYXNlICdub25lbXB0eV9kaWZmJzoge1xuICAgICAgICAvLyBBcmJpdHJhdGVkIChDT05GT1JNQU5DRS5tZCBcIkV2aWRlbmNlXCIpOiB0aGUgTEFURVNUIHN1Ym1pdHRlZFxuICAgICAgICAvLyBnaXRfZGlmZiwgaWYgYW55LCBtdXN0IGJlIG5vbi1lbXB0eSBcdTIwMTQgYW4gZW1wdHkgZGlmZiBpcyB0aGVcbiAgICAgICAgLy8gZmFrZS1kb25lIGRlbnkuIEFic2VuY2UgaXMgbm90IGNoZWNrZWQgYXQgdGhpcyB0cmFuc2l0aW9uICh0aGVcbiAgICAgICAgLy8gcnVubmVyIGNvbnRyYWN0IHN1Ym1pdHMgdGhlIGRpZmYgYmVmb3JlIHJlcXVlc3RpbmcgcmV2aWV3LCBhbmQgdGhlXG4gICAgICAgIC8vIGRvbmUgZ2F0ZSBpbmRlcGVuZGVudGx5IGRlbWFuZHMgcmVtb3RlLXJlYWNoYWJsZSBjb21taXQgZXZpZGVuY2UpLlxuICAgICAgICBjb25zdCBkaWZmcyA9IHRoaXMuZXZpZGVuY2VSb3dzLmZpbHRlcihcbiAgICAgICAgICAocm93KSA9PiByb3cud29ya0l0ZW1JZCA9PT0gaXRlbS5pZCAmJiByb3cuZXZpZGVuY2Uua2luZCA9PT0gJ2dpdF9kaWZmJyxcbiAgICAgICAgKTtcbiAgICAgICAgY29uc3QgbGF0ZXN0ID0gZGlmZnNbZGlmZnMubGVuZ3RoIC0gMV07XG4gICAgICAgIGlmIChsYXRlc3QgJiYgbGF0ZXN0LmV2aWRlbmNlLnBheWxvYWRbJ25vbkVtcHR5J10gIT09IHRydWUpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcigndGhlIGxhdGVzdCBnaXRfZGlmZiBldmlkZW5jZSBpcyBlbXB0eSBcdTIwMTQgbm90aGluZyB0byByZXZpZXcnKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBwcml2aWxlZ2VkRG93bmdyYWRlKGl0ZW06IFdvcmtJdGVtUm93LCBpbnB1dDogQWR2YW5jZUlucHV0KTogV29ya0l0ZW0ge1xuICAgIHRoaXMudmFsaWRhdGVQcmVzZW50ZWRUb2tlbihpdGVtLCBpbnB1dC5mZW5jaW5nVG9rZW4sIGlucHV0LmFjdG9ySWQpO1xuICAgIGlmIChpdGVtLmJsb2NrZWRSZWFzb24gIT09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBHdWFyZEZhaWxlZEVycm9yKGB3b3JrIGl0ZW0gaXMgYmxvY2tlZDogJHtpdGVtLmJsb2NrZWRSZWFzb259YCk7XG4gICAgfVxuICAgIGNvbnN0IGZyb20gPSBpdGVtLnN0YXRlO1xuICAgIGl0ZW0uc3RhdGUgPSBpbnB1dC50bztcbiAgICBpdGVtLnN0YXRlVmVyc2lvbiArPSAxO1xuICAgIHRoaXMuYXBwZW5kKFxuICAgICAgJ3dvcmtfaXRlbScsXG4gICAgICBpdGVtLmlkLFxuICAgICAgJ3dvcmtfaXRlbS5zdGF0ZV9kb3duZ3JhZGVkJyxcbiAgICAgIGlucHV0LmFjdG9ySWQsXG4gICAgICB7IGZyb20sIHRvOiBpbnB1dC50bywgY29tcGVuc2F0aW5nOiB0cnVlIH0sXG4gICAgICBpbnB1dC5pZGVtcG90ZW5jeUtleSAhPT0gdW5kZWZpbmVkID8geyBpZGVtcG90ZW5jeUtleTogaW5wdXQuaWRlbXBvdGVuY3lLZXkgfSA6IHVuZGVmaW5lZCxcbiAgICApO1xuICAgIGNvbnN0IHJlc3VsdCA9IHRoaXMuY29weUl0ZW0oaXRlbSk7XG4gICAgaWYgKGlucHV0LmlkZW1wb3RlbmN5S2V5ICE9PSB1bmRlZmluZWQpIHRoaXMuaWRlbXBvdGVuY3lDYWNoZS5zZXQoaW5wdXQuaWRlbXBvdGVuY3lLZXksIHsgLi4ucmVzdWx0IH0pO1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICAvKiogU2hhcmVkIGJ5IGFkdmFuY2VTdGF0ZSBhbmQgdGhlIGdhdGUtZmlyZWQgdHJhbnNpdGlvbnMuICovXG4gIHByaXZhdGUgZXhlY3V0ZVRyYW5zaXRpb24oXG4gICAgaXRlbTogV29ya0l0ZW1Sb3csXG4gICAgdG86IFdvcmtJdGVtU3RhdGUsXG4gICAgYWN0b3JJZDogc3RyaW5nLFxuICAgIGlkZW1wb3RlbmN5S2V5Pzogc3RyaW5nLFxuICAgIGNhdXNhdGlvbklkPzogc3RyaW5nLFxuICApOiBXb3JrSXRlbSB7XG4gICAgY29uc3QgZnJvbSA9IGl0ZW0uc3RhdGU7XG4gICAgaXRlbS5zdGF0ZSA9IHRvO1xuICAgIGl0ZW0uc3RhdGVWZXJzaW9uICs9IDE7XG4gICAgY29uc3QgZXZlbnQgPSB0aGlzLmFwcGVuZChcbiAgICAgICd3b3JrX2l0ZW0nLFxuICAgICAgaXRlbS5pZCxcbiAgICAgICd3b3JrX2l0ZW0uc3RhdGVfY2hhbmdlZCcsXG4gICAgICBhY3RvcklkLFxuICAgICAgeyBmcm9tLCB0byB9LFxuICAgICAge1xuICAgICAgICAuLi4oY2F1c2F0aW9uSWQgIT09IHVuZGVmaW5lZCA/IHsgY2F1c2F0aW9uSWQgfSA6IHt9KSxcbiAgICAgICAgLi4uKGlkZW1wb3RlbmN5S2V5ICE9PSB1bmRlZmluZWQgPyB7IGlkZW1wb3RlbmN5S2V5IH0gOiB7fSksXG4gICAgICB9LFxuICAgICk7XG5cbiAgICAvLyBFcGljLWxpZnQgcHJvamVjdG9yIChyb2FkbWFwIFx1MDBBNzEuMik6IGZpcnN0IGNoaWxkIExFQVZJTkcgYmFja2xvZyBsaWZ0c1xuICAgIC8vIHRoZSBmZWF0dXJlOyBpZGVtcG90ZW50IGJ5IGNoZWNrOyBhdXRob3JlZCBieSB0aGUgc3lzdGVtIGFjdG9yLlxuICAgIGlmIChmcm9tID09PSAnYmFja2xvZycgJiYgdG8gIT09ICdiYWNrbG9nJykge1xuICAgICAgY29uc3QgZmVhdHVyZSA9IHRoaXMuZmVhdHVyZXMuZ2V0KGl0ZW0uZmVhdHVyZUlkKTtcbiAgICAgIGlmIChmZWF0dXJlICYmIGZlYXR1cmUuc3RhdGUgPT09ICdiYWNrbG9nJykge1xuICAgICAgICBmZWF0dXJlLnN0YXRlID0gJ2luX3Byb2dyZXNzJztcbiAgICAgICAgdGhpcy5hcHBlbmQoJ2ZlYXR1cmUnLCBmZWF0dXJlLmlkLCAnZmVhdHVyZS5zdGF0ZV9jaGFuZ2VkJywgdGhpcy5zeXN0ZW1BY3RvcklkLCB7XG4gICAgICAgICAgZnJvbTogJ2JhY2tsb2cnLFxuICAgICAgICAgIHRvOiAnaW5fcHJvZ3Jlc3MnLFxuICAgICAgICB9LCB7IGNhdXNhdGlvbklkOiBTdHJpbmcoZXZlbnQuZ2xvYmFsU2VxKSB9KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBkb25lX2NoZWNrcG9pbnQgKHJvYWRtYXAgXHUwMEE3MS4xKTogdGhlIHN0b3J5IGNvbXBsZXRlcyBub3JtYWxseTsgdGhlIGhvbGRcbiAgICAvLyBtYXRlcmlhbGl6ZXMgb24gdGhlIGZlYXR1cmUgZXhhY3RseSBhdCBjb21wbGV0aW9uLlxuICAgIGlmICh0byA9PT0gJ2RvbmUnICYmIGl0ZW0uZG9uZUNoZWNrcG9pbnQpIHtcbiAgICAgIGNvbnN0IGZlYXR1cmUgPSB0aGlzLmZlYXR1cmVzLmdldChpdGVtLmZlYXR1cmVJZCk7XG4gICAgICBpZiAoZmVhdHVyZSAmJiAhZmVhdHVyZS5kaXNwYXRjaEhvbGQpIHtcbiAgICAgICAgZmVhdHVyZS5kaXNwYXRjaEhvbGQgPSB0cnVlO1xuICAgICAgICB0aGlzLmFwcGVuZCgnZmVhdHVyZScsIGZlYXR1cmUuaWQsICdmZWF0dXJlLmRpc3BhdGNoX2hvbGRfcmFpc2VkJywgdGhpcy5zeXN0ZW1BY3RvcklkLCB7XG4gICAgICAgICAgd29ya0l0ZW1JZDogaXRlbS5pZCxcbiAgICAgICAgfSwgeyBjYXVzYXRpb25JZDogU3RyaW5nKGV2ZW50Lmdsb2JhbFNlcSkgfSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgcmVzdWx0ID0gdGhpcy5jb3B5SXRlbShpdGVtKTtcbiAgICBpZiAoaWRlbXBvdGVuY3lLZXkgIT09IHVuZGVmaW5lZCkgdGhpcy5pZGVtcG90ZW5jeUNhY2hlLnNldChpZGVtcG90ZW5jeUtleSwgeyAuLi5yZXN1bHQgfSk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIGJsb2NrVGFzayhpbnB1dDoge1xuICAgIHdvcmtJdGVtSWQ6IHN0cmluZztcbiAgICByZWFzb246IEJsb2NrZWRSZWFzb247XG4gICAgYWN0b3JJZDogc3RyaW5nO1xuICAgIGZlbmNpbmdUb2tlbj86IG51bWJlcjtcbiAgfSk6IFdvcmtJdGVtIHtcbiAgICBjb25zdCBpdGVtID0gdGhpcy5tdXN0R2V0SXRlbShpbnB1dC53b3JrSXRlbUlkKTtcbiAgICBpZiAoIShCTE9DS0VEX1JFQVNPTlMgYXMgcmVhZG9ubHkgc3RyaW5nW10pLmluY2x1ZGVzKGlucHV0LnJlYXNvbikpIHtcbiAgICAgIHRocm93IG5ldyBHdWFyZEZhaWxlZEVycm9yKGB1bmtub3duIGJsb2NraW5nIGNvbmRpdGlvbjogJHtpbnB1dC5yZWFzb259YCk7XG4gICAgfVxuICAgIHRoaXMudmFsaWRhdGVQcmVzZW50ZWRUb2tlbihpdGVtLCBpbnB1dC5mZW5jaW5nVG9rZW4sIGlucHV0LmFjdG9ySWQpO1xuICAgIHRoaXMucmVxdWlyZVBlcm1pc3Npb24oaW5wdXQuYWN0b3JJZCwgJ3Rhc2suYmxvY2snKTtcbiAgICBpdGVtLmJsb2NrZWRSZWFzb24gPSBpbnB1dC5yZWFzb247XG4gICAgaXRlbS5zdGF0ZVZlcnNpb24gKz0gMTtcbiAgICB0aGlzLmFwcGVuZCgnd29ya19pdGVtJywgaXRlbS5pZCwgJ3dvcmtfaXRlbS5ibG9ja2VkJywgaW5wdXQuYWN0b3JJZCwgeyByZWFzb246IGlucHV0LnJlYXNvbiB9KTtcbiAgICByZXR1cm4gdGhpcy5jb3B5SXRlbShpdGVtKTtcbiAgfVxuXG4gIHVuYmxvY2tUYXNrKGlucHV0OiB7IHdvcmtJdGVtSWQ6IHN0cmluZzsgYWN0b3JJZDogc3RyaW5nIH0pOiBXb3JrSXRlbSB7XG4gICAgY29uc3QgaXRlbSA9IHRoaXMubXVzdEdldEl0ZW0oaW5wdXQud29ya0l0ZW1JZCk7XG4gICAgLy8gXHUwMEE3NC4yOiByZXZpZXdfbm9uX2NvbnZlcmdlbmNlIGNhbiBvbmx5IGJlIHJlbGVhc2VkIGJ5IGEgcmV2aWV3LWdhdGVcbiAgICAvLyBob2xkZXI7IG9yZGluYXJ5IGJsb2NrcyByZWxlYXNlIHVuZGVyIHRhc2suYmxvY2suXG4gICAgaWYgKGl0ZW0uYmxvY2tlZFJlYXNvbiA9PT0gJ3Jldmlld19ub25fY29udmVyZ2VuY2UnKSB7XG4gICAgICB0aGlzLnJlcXVpcmVQZXJtaXNzaW9uKGlucHV0LmFjdG9ySWQsICdnYXRlLnJldmlldy5hcHByb3ZlJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMucmVxdWlyZVBlcm1pc3Npb24oaW5wdXQuYWN0b3JJZCwgJ3Rhc2suYmxvY2snKTtcbiAgICB9XG4gICAgaXRlbS5ibG9ja2VkUmVhc29uID0gbnVsbDtcbiAgICBpdGVtLnN0YXRlVmVyc2lvbiArPSAxO1xuICAgIHRoaXMuYXBwZW5kKCd3b3JrX2l0ZW0nLCBpdGVtLmlkLCAnd29ya19pdGVtLnVuYmxvY2tlZCcsIGlucHV0LmFjdG9ySWQsIHt9KTtcbiAgICByZXR1cm4gdGhpcy5jb3B5SXRlbShpdGVtKTtcbiAgfVxuXG4gIC8vIC0tIGdhdGVzICYgZXZpZGVuY2UgKHJvYWRtYXAgXHUwMEE3MS40KSAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICBzdWJtaXRFdmlkZW5jZShpbnB1dDoge1xuICAgIHdvcmtJdGVtSWQ6IHN0cmluZztcbiAgICBldmlkZW5jZTogRXZpZGVuY2U7XG4gICAgYWN0b3JJZDogc3RyaW5nO1xuICAgIGZlbmNpbmdUb2tlbj86IG51bWJlcjtcbiAgfSk6IHZvaWQge1xuICAgIGNvbnN0IGl0ZW0gPSB0aGlzLm11c3RHZXRJdGVtKGlucHV0LndvcmtJdGVtSWQpO1xuICAgIHRoaXMudmFsaWRhdGVQcmVzZW50ZWRUb2tlbihpdGVtLCBpbnB1dC5mZW5jaW5nVG9rZW4sIGlucHV0LmFjdG9ySWQpO1xuICAgIHRoaXMuZXZpZGVuY2VSb3dzLnB1c2goeyB3b3JrSXRlbUlkOiBpdGVtLmlkLCBldmlkZW5jZTogaW5wdXQuZXZpZGVuY2UsIHNlcTogdGhpcy5ldmlkZW5jZVJvd3MubGVuZ3RoICsgMSB9KTtcbiAgICB0aGlzLmFwcGVuZCgnd29ya19pdGVtJywgaXRlbS5pZCwgJ2V2aWRlbmNlLnN1Ym1pdHRlZCcsIGlucHV0LmFjdG9ySWQsIHtcbiAgICAgIGtpbmQ6IGlucHV0LmV2aWRlbmNlLmtpbmQsXG4gICAgfSk7XG4gIH1cblxuICBhcHByb3ZlR2F0ZShpbnB1dDogR2F0ZURlY2lzaW9uSW5wdXQpOiBXb3JrSXRlbSB7XG4gICAgY29uc3QgaXRlbSA9IHRoaXMubXVzdEdldEl0ZW0oaW5wdXQud29ya0l0ZW1JZCk7XG5cbiAgICBpZiAoaW5wdXQuZ2F0ZSA9PT0gJ3NwZWNfYXBwcm92YWwnKSB7XG4gICAgICAvLyBQZXJtaXNzaW9uIHByZWNlZGVzIGFueSBlZmZlY3Q6IGEgZGVuaWVkIGF0dGVtcHQgcGlucyBub3RoaW5nLlxuICAgICAgdGhpcy5yZXF1aXJlUGVybWlzc2lvbihpbnB1dC5hY3RvcklkLCAnZ2F0ZS5zcGVjLmFwcHJvdmUnKTtcbiAgICAgIGlmIChpdGVtLmJsb2NrZWRSZWFzb24gIT09IG51bGwpIHtcbiAgICAgICAgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoYHdvcmsgaXRlbSBpcyBibG9ja2VkOiAke2l0ZW0uYmxvY2tlZFJlYXNvbn1gKTtcbiAgICAgIH1cbiAgICAgIGlmIChpdGVtLnN0YXRlICE9PSAnZHJhZnQnKSB7XG4gICAgICAgIHRocm93IG5ldyBHdWFyZEZhaWxlZEVycm9yKGBzcGVjX2FwcHJvdmFsIGFwcGxpZXMgdG8gZHJhZnQgaXRlbXMsIG5vdCAke2l0ZW0uc3RhdGV9YCk7XG4gICAgICB9XG4gICAgICBpZiAoaW5wdXQucGlubmVkVmVyaWZpY2F0aW9uICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgaXRlbS5waW5uZWRWZXJpZmljYXRpb24gPSBbLi4uaW5wdXQucGlubmVkVmVyaWZpY2F0aW9uXTtcbiAgICAgIH1cbiAgICAgIHRoaXMuZ2F0ZURlY2lzaW9ucy5wdXNoKHtcbiAgICAgICAgd29ya0l0ZW1JZDogaXRlbS5pZCxcbiAgICAgICAgZ2F0ZTogJ3NwZWNfYXBwcm92YWwnLFxuICAgICAgICBkZWNpc2lvbjogJ2FwcHJvdmVkJyxcbiAgICAgICAgYWN0b3JJZDogaW5wdXQuYWN0b3JJZCxcbiAgICAgIH0pO1xuICAgICAgdGhpcy5hcHBlbmQoJ3dvcmtfaXRlbScsIGl0ZW0uaWQsICdnYXRlLmFwcHJvdmVkJywgaW5wdXQuYWN0b3JJZCwge1xuICAgICAgICBnYXRlOiAnc3BlY19hcHByb3ZhbCcsXG4gICAgICAgIHBpbm5lZFZlcmlmaWNhdGlvbjogaXRlbS5waW5uZWRWZXJpZmljYXRpb24sXG4gICAgICB9KTtcbiAgICAgIC8vIFRoZSBhcHByb3ZhbCBmaXJlcyB0aGUgZ2F0ZWQgZm9yd2FyZCB0cmFuc2l0aW9uIChjb25mb3JtYW5jZSBwaW4pLlxuICAgICAgcmV0dXJuIHRoaXMuZXhlY3V0ZVRyYW5zaXRpb24oaXRlbSwgJ3JlYWR5X2Zvcl9kZXYnLCBpbnB1dC5hY3RvcklkKTtcbiAgICB9XG5cbiAgICAvLyByZXZpZXdfYXBwcm92YWxcbiAgICB0aGlzLnJlcXVpcmVQZXJtaXNzaW9uKGlucHV0LmFjdG9ySWQsICdnYXRlLnJldmlldy5hcHByb3ZlJyk7XG4gICAgaWYgKGl0ZW0uYmxvY2tlZFJlYXNvbiAhPT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoYHdvcmsgaXRlbSBpcyBibG9ja2VkOiAke2l0ZW0uYmxvY2tlZFJlYXNvbn1gKTtcbiAgICB9XG4gICAgaWYgKGl0ZW0uc3RhdGUgIT09ICdpbl9yZXZpZXcnKSB7XG4gICAgICB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcihgcmV2aWV3X2FwcHJvdmFsIGFwcGxpZXMgdG8gaW5fcmV2aWV3IGl0ZW1zLCBub3QgJHtpdGVtLnN0YXRlfWApO1xuICAgIH1cbiAgICB0aGlzLmNoZWNrUmV2aWV3RXZpZGVuY2UoaXRlbSk7XG4gICAgdGhpcy5nYXRlRGVjaXNpb25zLnB1c2goe1xuICAgICAgd29ya0l0ZW1JZDogaXRlbS5pZCxcbiAgICAgIGdhdGU6ICdyZXZpZXdfYXBwcm92YWwnLFxuICAgICAgZGVjaXNpb246ICdhcHByb3ZlZCcsXG4gICAgICBhY3RvcklkOiBpbnB1dC5hY3RvcklkLFxuICAgIH0pO1xuICAgIHRoaXMuYXBwZW5kKCd3b3JrX2l0ZW0nLCBpdGVtLmlkLCAnZ2F0ZS5hcHByb3ZlZCcsIGlucHV0LmFjdG9ySWQsIHsgZ2F0ZTogJ3Jldmlld19hcHByb3ZhbCcgfSk7XG4gICAgcmV0dXJuIHRoaXMuZXhlY3V0ZVRyYW5zaXRpb24oaXRlbSwgJ2RvbmUnLCBpbnB1dC5hY3RvcklkKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBFdmlkZW5jZSBjb25kaXRpb24gb2YgdGhlIGRvbmUgZ2F0ZSAoXHUwMEE3MS40LCBENyk6IGV2ZXJ5IFBJTk5FRCBjb21tYW5kJ3NcbiAgICogbGF0ZXN0IHRlc3RfcnVuIGV4aXRlZCAwIChhbiB1bnBpbm5lZCBjb21tYW5kIHNhdGlzZmllcyBub3RoaW5nKSwgYW5kIHRoZVxuICAgKiBmaW5hbCBjb21taXQgaXMgcmVhY2hhYmxlIG9uIHRoZSByZW1vdGUuIHJldmlld19yZXBvcnQgaXMgbmV2ZXIgY29uc3VsdGVkLlxuICAgKiBXaXRoIG5vdGhpbmcgcGlubmVkLCB0aGUgZ2F0ZSBkZWNpc2lvbiBieSB0aGUgcGVybWl0dGVkIGFjdG9yIElTIHRoZSBodW1hblxuICAgKiBkZWNpc2lvbiBcdTIwMTQgZXZpZGVuY2UgYWxvbmUgbmV2ZXIgY29tcGxldGVzIHRoZSBpdGVtIGVpdGhlciB3YXkuXG4gICAqL1xuICBwcml2YXRlIGNoZWNrUmV2aWV3RXZpZGVuY2UoaXRlbTogV29ya0l0ZW1Sb3cpOiB2b2lkIHtcbiAgICBjb25zdCByb3dzID0gdGhpcy5ldmlkZW5jZVJvd3MuZmlsdGVyKChyb3cpID0+IHJvdy53b3JrSXRlbUlkID09PSBpdGVtLmlkKTtcbiAgICBmb3IgKGNvbnN0IGNvbW1hbmQgb2YgaXRlbS5waW5uZWRWZXJpZmljYXRpb24gPz8gW10pIHtcbiAgICAgIGNvbnN0IHJ1bnMgPSByb3dzLmZpbHRlcihcbiAgICAgICAgKHJvdykgPT4gcm93LmV2aWRlbmNlLmtpbmQgPT09ICd0ZXN0X3J1bicgJiYgcm93LmV2aWRlbmNlLnBheWxvYWRbJ2NvbW1hbmQnXSA9PT0gY29tbWFuZCxcbiAgICAgICk7XG4gICAgICBjb25zdCBsYXRlc3QgPSBydW5zW3J1bnMubGVuZ3RoIC0gMV07XG4gICAgICBpZiAoIWxhdGVzdCB8fCBsYXRlc3QuZXZpZGVuY2UucGF5bG9hZFsnZXhpdENvZGUnXSAhPT0gMCkge1xuICAgICAgICB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcihgcGlubmVkIHZlcmlmaWNhdGlvbiBkaWQgbm90IHBhc3M6ICR7Y29tbWFuZH1gKTtcbiAgICAgIH1cbiAgICB9XG4gICAgY29uc3QgY29tbWl0T2sgPSByb3dzLnNvbWUoXG4gICAgICAocm93KSA9PiByb3cuZXZpZGVuY2Uua2luZCA9PT0gJ2NvbW1pdCcgJiYgcm93LmV2aWRlbmNlLnBheWxvYWRbJ3JlYWNoYWJsZU9uUmVtb3RlJ10gPT09IHRydWUsXG4gICAgKTtcbiAgICBpZiAoIWNvbW1pdE9rKSB7XG4gICAgICB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcignZmluYWwgcmV2aXNpb24gbXVzdCBiZSByZWFjaGFibGUgb24gdGhlIHJlbW90ZSAocHVzaCBpcyBwYXJ0IG9mIHRoZSBIQUxUIGNvbnRyYWN0KScpO1xuICAgIH1cbiAgfVxuXG4gIHJlamVjdEdhdGUoaW5wdXQ6IEdhdGVEZWNpc2lvbklucHV0KTogV29ya0l0ZW0ge1xuICAgIGNvbnN0IGl0ZW0gPSB0aGlzLm11c3RHZXRJdGVtKGlucHV0LndvcmtJdGVtSWQpO1xuICAgIGlmIChpbnB1dC5nYXRlICE9PSAncmV2aWV3X2FwcHJvdmFsJykge1xuICAgICAgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoJ29ubHkgcmV2aWV3X2FwcHJvdmFsIHJlamVjdGlvbiBpcyBkZWZpbmVkIGluIFBoYXNlIDEnKTtcbiAgICB9XG4gICAgdGhpcy5yZXF1aXJlUGVybWlzc2lvbihpbnB1dC5hY3RvcklkLCAnZ2F0ZS5yZXZpZXcuYXBwcm92ZScpO1xuICAgIGlmIChpdGVtLnN0YXRlICE9PSAnaW5fcmV2aWV3Jykge1xuICAgICAgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoYHJldmlldyByZWplY3Rpb24gYXBwbGllcyB0byBpbl9yZXZpZXcgaXRlbXMsIG5vdCAke2l0ZW0uc3RhdGV9YCk7XG4gICAgfVxuICAgIHRoaXMuZ2F0ZURlY2lzaW9ucy5wdXNoKHtcbiAgICAgIHdvcmtJdGVtSWQ6IGl0ZW0uaWQsXG4gICAgICBnYXRlOiAncmV2aWV3X2FwcHJvdmFsJyxcbiAgICAgIGRlY2lzaW9uOiAncmVqZWN0ZWQnLFxuICAgICAgYWN0b3JJZDogaW5wdXQuYWN0b3JJZCxcbiAgICB9KTtcbiAgICBjb25zdCBkZWNpc2lvbkV2ZW50ID0gdGhpcy5hcHBlbmQoJ3dvcmtfaXRlbScsIGl0ZW0uaWQsICdnYXRlLnJlamVjdGVkJywgaW5wdXQuYWN0b3JJZCwge1xuICAgICAgZ2F0ZTogJ3Jldmlld19hcHByb3ZhbCcsXG4gICAgfSk7XG5cbiAgICBpZiAoaXRlbS5yZXZpZXdMb29wSXRlcmF0aW9uID49IFJFVklFV19MT09QX0xJTUlUKSB7XG4gICAgICAvLyBUaGUgNnRoIHJlamVjdGlvbiBwZXJmb3JtcyBubyBsb29wYmFjazogb3ZlcmxheSByZXZpZXdfbm9uX2NvbnZlcmdlbmNlLFxuICAgICAgLy8gc3RhdGUgZnJvemVuIGF0IGluX3JldmlldywgY291bnRlciB1bnRvdWNoZWQgKENPTkZPUk1BTkNFLm1kIHBpbikuXG4gICAgICBpdGVtLmJsb2NrZWRSZWFzb24gPSAncmV2aWV3X25vbl9jb252ZXJnZW5jZSc7XG4gICAgICBpdGVtLnN0YXRlVmVyc2lvbiArPSAxO1xuICAgICAgdGhpcy5hcHBlbmQoXG4gICAgICAgICd3b3JrX2l0ZW0nLFxuICAgICAgICBpdGVtLmlkLFxuICAgICAgICAnd29ya19pdGVtLmJsb2NrZWQnLFxuICAgICAgICB0aGlzLnN5c3RlbUFjdG9ySWQsXG4gICAgICAgIHsgcmVhc29uOiAncmV2aWV3X25vbl9jb252ZXJnZW5jZScgfSxcbiAgICAgICAgeyBjYXVzYXRpb25JZDogU3RyaW5nKGRlY2lzaW9uRXZlbnQuZ2xvYmFsU2VxKSB9LFxuICAgICAgKTtcbiAgICAgIHJldHVybiB0aGlzLmNvcHlJdGVtKGl0ZW0pO1xuICAgIH1cblxuICAgIC8vIFx1MDBBNzEuMjogdGhlIGxvb3BiYWNrIGlzIGEgc3lzdGVtIGVmZmVjdCBcdTIwMTQgbm8gY2xhaW0taG9sZGVyIHBhcnRpY2lwYXRpb24uXG4gICAgaXRlbS5yZXZpZXdMb29wSXRlcmF0aW9uICs9IDE7XG4gICAgcmV0dXJuIHRoaXMuZXhlY3V0ZVRyYW5zaXRpb24oaXRlbSwgJ2luX3Byb2dyZXNzJywgdGhpcy5zeXN0ZW1BY3RvcklkLCB1bmRlZmluZWQsIFN0cmluZyhkZWNpc2lvbkV2ZW50Lmdsb2JhbFNlcSkpO1xuICB9XG5cbiAgLy8gLS0gZGlzcGF0Y2ggKHJvYWRtYXAgXHUwMEE3Mi4zKSAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIGdldFRhc2tDb250ZXh0KGlucHV0OiB7IHdvcmtJdGVtSWQ6IHN0cmluZyB9KTogeyB3b3JrSXRlbTogV29ya0l0ZW07IGVudHJ5U3RhdGU6IFdvcmtJdGVtU3RhdGUgfSB7XG4gICAgY29uc3QgaXRlbSA9IHRoaXMubXVzdEdldEl0ZW0oaW5wdXQud29ya0l0ZW1JZCk7XG4gICAgaWYgKGl0ZW0uc3RhdGUgPT09ICdkb25lJykge1xuICAgICAgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoJ2RvbmUgaXRlbXMgYXJlIG5ldmVyIHJlLWRpc3BhdGNoZWQ7IGZvbGxvdy11cCByZXZpZXcgaXMgYSBuZXcgd29yayBpdGVtJyk7XG4gICAgfVxuICAgIGNvbnN0IGZlYXR1cmUgPSB0aGlzLmZlYXR1cmVzLmdldChpdGVtLmZlYXR1cmVJZCk7XG4gICAgaWYgKGZlYXR1cmU/LmRpc3BhdGNoSG9sZCkge1xuICAgICAgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoJ2ZlYXR1cmUgaXMgdW5kZXIgYSBkb25lX2NoZWNrcG9pbnQgZGlzcGF0Y2ggaG9sZCcpO1xuICAgIH1cbiAgICByZXR1cm4geyB3b3JrSXRlbTogdGhpcy5jb3B5SXRlbShpdGVtKSwgZW50cnlTdGF0ZTogaXRlbS5zdGF0ZSB9O1xuICB9XG5cbiAgcmVsZWFzZURpc3BhdGNoSG9sZChpbnB1dDogeyBmZWF0dXJlSWQ6IHN0cmluZzsgYWN0b3JJZDogc3RyaW5nIH0pOiBGZWF0dXJlIHtcbiAgICB0aGlzLnJlcXVpcmVQZXJtaXNzaW9uKGlucHV0LmFjdG9ySWQsICdkaXNwYXRjaC5yZWxlYXNlX2hvbGQnKTtcbiAgICBjb25zdCBmZWF0dXJlID0gdGhpcy5mZWF0dXJlcy5nZXQoaW5wdXQuZmVhdHVyZUlkKTtcbiAgICBpZiAoIWZlYXR1cmUpIHRocm93IG5ldyBHdWFyZEZhaWxlZEVycm9yKGB1bmtub3duIGZlYXR1cmU6ICR7aW5wdXQuZmVhdHVyZUlkfWApO1xuICAgIGZlYXR1cmUuZGlzcGF0Y2hIb2xkID0gZmFsc2U7XG4gICAgdGhpcy5hcHBlbmQoJ2ZlYXR1cmUnLCBmZWF0dXJlLmlkLCAnZmVhdHVyZS5kaXNwYXRjaF9ob2xkX3JlbGVhc2VkJywgaW5wdXQuYWN0b3JJZCwge30pO1xuICAgIHJldHVybiB0aGlzLmNvcHlGZWF0dXJlKGZlYXR1cmUpO1xuICB9XG5cbiAgLy8gLS0gcmVjb25jaWxpYXRpb24gKHJvYWRtYXAgXHUwMEE3MS42LCBENjogZGV0ZWN0LW9ubHksIG5ldmVyIG11dGF0ZXMpIC0tLS0tLS0tLS0tLVxuXG4gIHJlY29uY2lsZShpbnB1dDogeyBmaWxlczogQXJyYXk8eyB3b3JrSXRlbUlkOiBzdHJpbmc7IGZyb250bWF0dGVyU3RhdHVzOiBzdHJpbmcgfT4gfSk6IERpdmVyZ2VuY2VSZXBvcnRbXSB7XG4gICAgY29uc3QgcmVwb3J0czogRGl2ZXJnZW5jZVJlcG9ydFtdID0gW107XG4gICAgZm9yIChjb25zdCBmaWxlIG9mIGlucHV0LmZpbGVzKSB7XG4gICAgICBjb25zdCBpdGVtID0gdGhpcy5tdXN0R2V0SXRlbShmaWxlLndvcmtJdGVtSWQpO1xuICAgICAgLy8gRmlsZXMgdW5kZXIgYSBsaXZlIGNsYWltIGFyZSBleGNsdWRlZCBcdTIwMTQgcGxheWJvb2tzIGxlZ2l0aW1hdGVseSB3cml0ZVxuICAgICAgLy8gZnJvbnRtYXR0ZXIgbWlkLXJ1biAoXHUwMEE3MS42KS5cbiAgICAgIGlmICh0aGlzLmxpdmVDbGFpbShpdGVtLmlkKSAhPT0gbnVsbCkgY29udGludWU7XG5cbiAgICAgIGNvbnN0IHJhdyA9IGZpbGUuZnJvbnRtYXR0ZXJTdGF0dXMudHJpbSgpO1xuICAgICAgaWYgKHJhdyA9PT0gJ2Jsb2NrZWQnKSB7XG4gICAgICAgIC8vIEQ4OiBvdmVybGF5IGluIHRoZSBEQiBhbmQgYHN0YXR1czogYmxvY2tlZGAgaW4gdGhlIGZpbGUgYXJlIHRoZVxuICAgICAgICAvLyBzYW1lIHRydXRoLiBCbG9ja2VkLWluLWZpbGUgd2l0aCBOTyBvdmVybGF5IGlzIHJlYWwgZHJpZnQuXG4gICAgICAgIGlmIChpdGVtLmJsb2NrZWRSZWFzb24gIT09IG51bGwpIGNvbnRpbnVlO1xuICAgICAgICByZXBvcnRzLnB1c2goe1xuICAgICAgICAgIHdvcmtJdGVtSWQ6IGl0ZW0uaWQsXG4gICAgICAgICAgZmlsZVN0YXRlOiByYXcsXG4gICAgICAgICAgZGJTdGF0ZTogaXRlbS5zdGF0ZSxcbiAgICAgICAgICBraW5kOiAnY29uZmxpY3QnLFxuICAgICAgICB9KTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IG5vcm1hbGl6ZWQgPSBMRUdBQ1lfU1RBVFVTW3Jhd107XG4gICAgICBpZiAobm9ybWFsaXplZCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJlcG9ydHMucHVzaCh7IHdvcmtJdGVtSWQ6IGl0ZW0uaWQsIGZpbGVTdGF0ZTogcmF3LCBkYlN0YXRlOiBpdGVtLnN0YXRlLCBraW5kOiAnY29uZmxpY3QnIH0pO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGlmIChub3JtYWxpemVkID09PSBpdGVtLnN0YXRlKSBjb250aW51ZTtcbiAgICAgIHJlcG9ydHMucHVzaCh7XG4gICAgICAgIHdvcmtJdGVtSWQ6IGl0ZW0uaWQsXG4gICAgICAgIGZpbGVTdGF0ZTogcmF3LFxuICAgICAgICBkYlN0YXRlOiBpdGVtLnN0YXRlLFxuICAgICAgICBraW5kOiBSQU5LW25vcm1hbGl6ZWRdID4gUkFOS1tpdGVtLnN0YXRlXSA/ICdmaWxlX2FoZWFkJyA6ICdkYl9haGVhZCcsXG4gICAgICB9KTtcbiAgICB9XG4gICAgcmV0dXJuIHJlcG9ydHM7XG4gIH1cblxuICAvLyAtLSBxdWVyaWVzIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIGdldFdvcmtJdGVtKGlkOiBzdHJpbmcpOiBXb3JrSXRlbSB7XG4gICAgcmV0dXJuIHRoaXMuY29weUl0ZW0odGhpcy5tdXN0R2V0SXRlbShpZCkpO1xuICB9XG5cbiAgZ2V0RmVhdHVyZShpZDogc3RyaW5nKTogRmVhdHVyZSB7XG4gICAgY29uc3QgZmVhdHVyZSA9IHRoaXMuZmVhdHVyZXMuZ2V0KGlkKTtcbiAgICBpZiAoIWZlYXR1cmUpIHRocm93IG5ldyBHdWFyZEZhaWxlZEVycm9yKGB1bmtub3duIGZlYXR1cmU6ICR7aWR9YCk7XG4gICAgcmV0dXJuIHRoaXMuY29weUZlYXR1cmUoZmVhdHVyZSk7XG4gIH1cblxuICBsaXN0V29ya0l0ZW1zKGZpbHRlcj86IHsgc3RhdGU/OiBXb3JrSXRlbVN0YXRlOyBmZWF0dXJlSWQ/OiBzdHJpbmc7IGNsYWltYWJsZT86IGJvb2xlYW4gfSk6IFdvcmtJdGVtW10ge1xuICAgIHJldHVybiBbLi4udGhpcy53b3JrSXRlbXMudmFsdWVzKCldXG4gICAgICAuZmlsdGVyKChpdGVtKSA9PiB7XG4gICAgICAgIGlmIChmaWx0ZXI/LnN0YXRlICE9PSB1bmRlZmluZWQgJiYgaXRlbS5zdGF0ZSAhPT0gZmlsdGVyLnN0YXRlKSByZXR1cm4gZmFsc2U7XG4gICAgICAgIGlmIChmaWx0ZXI/LmZlYXR1cmVJZCAhPT0gdW5kZWZpbmVkICYmIGl0ZW0uZmVhdHVyZUlkICE9PSBmaWx0ZXIuZmVhdHVyZUlkKSByZXR1cm4gZmFsc2U7XG4gICAgICAgIGlmIChmaWx0ZXI/LmNsYWltYWJsZSA9PT0gdHJ1ZSAmJiB0aGlzLmxpdmVDbGFpbShpdGVtLmlkKSAhPT0gbnVsbCkgcmV0dXJuIGZhbHNlO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH0pXG4gICAgICAubWFwKChpdGVtKSA9PiB0aGlzLmNvcHlJdGVtKGl0ZW0pKTtcbiAgfVxuXG4gIGdldENsYWltcyh3b3JrSXRlbUlkOiBzdHJpbmcpOiBDbGFpbVtdIHtcbiAgICBjb25zdCBpdGVtID0gdGhpcy5tdXN0R2V0SXRlbSh3b3JrSXRlbUlkKTtcbiAgICByZXR1cm4gKHRoaXMuY2xhaW1zQnlJdGVtLmdldChpdGVtLmlkKSA/PyBbXSkuZmxhdE1hcCgoY2xhaW1JZCkgPT4ge1xuICAgICAgY29uc3QgY2xhaW0gPSB0aGlzLmNsYWltcy5nZXQoY2xhaW1JZCk7XG4gICAgICByZXR1cm4gY2xhaW0gPyBbdGhpcy5jb3B5Q2xhaW0oY2xhaW0pXSA6IFtdO1xuICAgIH0pO1xuICB9XG5cbiAgZXZlbnRzKHN0cmVhbUlkPzogc3RyaW5nKTogU3BpbmVFdmVudFtdIHtcbiAgICBjb25zdCBzb3VyY2UgPSBzdHJlYW1JZCA9PT0gdW5kZWZpbmVkID8gdGhpcy5ldmVudExvZyA6IHRoaXMuZXZlbnRMb2cuZmlsdGVyKChlKSA9PiBlLnN0cmVhbUlkID09PSBzdHJlYW1JZCk7XG4gICAgcmV0dXJuIHNvdXJjZS5tYXAoKGV2ZW50KSA9PiAoeyAuLi5ldmVudCwgcGF5bG9hZDogeyAuLi5ldmVudC5wYXlsb2FkIH0gfSkpO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVFbmdpbmUoKTogU3BpbmVFbmdpbmUge1xuICByZXR1cm4gbmV3IEVuZ2luZUltcGwoKTtcbn1cbiIsICIvKipcbiAqIEZyb3plbiBpbnRlbnQgcmVnaW9uIGV4dHJhY3Rpb24gKyB2ZXJzaW9uZWQgaW50ZW50IGhhc2ggKHJvYWRtYXAgXHUwMEE3MS4xKS5cbiAqXG4gKiBCb3RoIHJlYWwtd29ybGQgdGFncyBhcmUgcmVjb2duaXplZDogYDxpbnRlbnQtY29udHJhY3Q+YCAoZGV2LWF1dG9cbiAqIHNwZWMtdGVtcGxhdGUubWQpIGFuZCBgPGZyb3plbi1hZnRlci1hcHByb3ZhbCAuLi4+YCAocXVpY2stZGV2XG4gKiBzcGVjLXRlbXBsYXRlLm1kKS4gSGFzaGluZyBoYXBwZW5zIGFmdGVyIGNhbm9uaWNhbGl6YXRpb24gc28gbGluZS1lbmRpbmdcbiAqIGFuZCB0cmFpbGluZy13aGl0ZXNwYWNlIGNodXJuIChDUkxGIGVkaXRvcnMsIGF1dG8tZm9ybWF0dGVycykgbmV2ZXIgbW92ZXNcbiAqIHRoZSBoYXNoIFx1MjAxNCBvbmx5IHJlYWwgaW50ZW50IGRyaWZ0IGRvZXMgKHRlY2huaWNhbC1yaXNrIHJldmlldzogYWxhcm1cbiAqIGZhdGlndWUga2lsbHMgdGhlIG1lY2hhbmlzbSkuXG4gKi9cbmltcG9ydCB7IGNyZWF0ZUhhc2ggfSBmcm9tICdub2RlOmNyeXB0byc7XG5cbmltcG9ydCB7IElOVEVOVF9IQVNIX0FMR08gfSBmcm9tICcuL3R5cGVzLmpzJztcblxuY29uc3QgVEFHX1BBVFRFUk5TID0gW1xuICAvPGludGVudC1jb250cmFjdD4oW1xcc1xcU10qPyk8XFwvaW50ZW50LWNvbnRyYWN0Pi8sXG4gIC88ZnJvemVuLWFmdGVyLWFwcHJvdmFsXFxiW14+XSo+KFtcXHNcXFNdKj8pPFxcL2Zyb3plbi1hZnRlci1hcHByb3ZhbD4vLFxuXTtcblxuZXhwb3J0IGZ1bmN0aW9uIGV4dHJhY3RJbnRlbnRSZWdpb24obWFya2Rvd246IHN0cmluZyk6IHN0cmluZyB8IG51bGwge1xuICBmb3IgKGNvbnN0IHBhdHRlcm4gb2YgVEFHX1BBVFRFUk5TKSB7XG4gICAgY29uc3QgbWF0Y2ggPSBwYXR0ZXJuLmV4ZWMobWFya2Rvd24pO1xuICAgIGlmIChtYXRjaCAhPT0gbnVsbCkgcmV0dXJuIG1hdGNoWzFdID8/ICcnO1xuICB9XG4gIHJldHVybiBudWxsO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY2Fub25pY2FsaXplRm9ySGFzaCh0ZXh0OiBzdHJpbmcpOiBzdHJpbmcge1xuICBjb25zdCB1bml4TmV3bGluZXMgPSB0ZXh0LnJlcGxhY2UoL1xcclxcbi9nLCAnXFxuJyk7XG4gIGNvbnN0IHN0cmlwcGVkID0gdW5peE5ld2xpbmVzXG4gICAgLnNwbGl0KCdcXG4nKVxuICAgIC5tYXAoKGxpbmUpID0+IGxpbmUucmVwbGFjZSgvWyBcXHRdKyQvLCAnJykpXG4gICAgLmpvaW4oJ1xcbicpO1xuICAvLyBDb2xsYXBzZSBydW5zIG9mIDIrIGJsYW5rIGxpbmVzIHRvIGEgc2luZ2xlIGJsYW5rIGxpbmU7IGEgc2luZ2xlIGJsYW5rXG4gIC8vIGxpbmUgaXMgbWVhbmluZ2Z1bCBtYXJrZG93biBhbmQgcGFzc2VzIHRocm91Z2ggdW50b3VjaGVkLlxuICByZXR1cm4gc3RyaXBwZWQucmVwbGFjZSgvXFxuezMsfS9nLCAnXFxuXFxuJyk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjb21wdXRlSW50ZW50SGFzaChyZWdpb246IHN0cmluZyk6IHN0cmluZyB7XG4gIGNvbnN0IGRpZ2VzdCA9IGNyZWF0ZUhhc2goJ3NoYTI1NicpLnVwZGF0ZShjYW5vbmljYWxpemVGb3JIYXNoKHJlZ2lvbiksICd1dGY4JykuZGlnZXN0KCdoZXgnKTtcbiAgcmV0dXJuIGAke0lOVEVOVF9IQVNIX0FMR099OiR7ZGlnZXN0fWA7XG59XG4iLCAiLyoqXG4gKiBAb2Focy9jb3JlIFx1MjAxNCBwdWJsaWMgQVBJIG9mIHRoZSBkZXRlcm1pbmlzdGljIHNwaW5lIChSdWxlcyBsYXllciBhcyBjb2RlKS5cbiAqXG4gKiBUaGUgY29uZm9ybWFuY2Ugc3VpdGUgaW4gdGVzdC8gaXMgdGhlIHNwZWNpZmljYXRpb246IGl0IHdhcyB3cml0dGVuIGZpcnN0LFxuICogZnJvbSB0aGUgcHJvc2UgcnVsZXMgaW4gdGhlIEJNQUQgc291cmNlIGFzIGFyYml0cmF0ZWQgaW4gcHJvZHVjdC1yb2FkbWFwLm1kXG4gKiBcdTAwQTcxIGFuZCB0ZXN0L0NPTkZPUk1BTkNFLm1kLiBJbXBsZW1lbnRhdGlvbiBtb2R1bGVzOlxuICogIC0gdHlwZXMudHMgICAgICAgXHUyMDE0IHZvY2FidWxhcnksIGVudGl0aWVzLCBlcnJvcnMgKHRoZSBmaXhlZCBzdXJmYWNlKVxuICogIC0gZW5naW5lLnRzICAgICAgXHUyMDE0IGluLW1lbW9yeSByZWZlcmVuY2UgZW5naW5lIChGU00sIGNsYWltcywgZ2F0ZXMsIGV2ZW50cylcbiAqICAtIGludGVudC1oYXNoLnRzIFx1MjAxNCBmcm96ZW4tcmVnaW9uIGV4dHJhY3Rpb24gKyB2ZXJzaW9uZWQgY2Fub25pY2FsaXplZCBoYXNoXG4gKiAgLSBzdG9yaWVzLnRzICAgICBcdTIwMTQgc3Rvcmllcy55YW1sIHBhcnNpbmcgKyB2YWxpZGl0eSBydWxlc1xuICpcbiAqIEludmFyaWFudHMgKHByb2R1Y3Qtcm9hZG1hcC5tZCBcdTAwQTcwLjEsIG1hY2hpbmUtY2hlY2tlZCBpbiBDSSk6XG4gKiAgLSBObyBMTE0gU0RLIGltcG9ydCBhbnl3aGVyZSB1bmRlciBwYWNrYWdlcy9jb3JlLlxuICogIC0gTm8gY29kZSBwYXRoIG91dHNpZGUgY29tbWFuZCBoYW5kbGVycyB3cml0ZXMgcHJvamVjdGlvbnMuXG4gKi9cbmltcG9ydCB7IGNyZWF0ZUVuZ2luZSBhcyBjcmVhdGVNZW1vcnlFbmdpbmUgfSBmcm9tICcuL2VuZ2luZS5qcyc7XG5pbXBvcnQgdHlwZSB7IFNwaW5lRW5naW5lIH0gZnJvbSAnLi90eXBlcy5qcyc7XG5cbmV4cG9ydCAqIGZyb20gJy4vdHlwZXMuanMnO1xuZXhwb3J0IHsgZXh0cmFjdEludGVudFJlZ2lvbiwgY2Fub25pY2FsaXplRm9ySGFzaCwgY29tcHV0ZUludGVudEhhc2ggfSBmcm9tICcuL2ludGVudC1oYXNoLmpzJztcbmV4cG9ydCB7IHBhcnNlU3RvcmllcywgdHlwZSBTdG9yeUVudHJ5IH0gZnJvbSAnLi9zdG9yaWVzLmpzJztcblxuLyoqXG4gKiBFbmdpbmUgZmFjdG9yeSBpbmRpcmVjdGlvbjogdGhlIGNvbmZvcm1hbmNlIHN1aXRlIGFsd2F5cyBjYWxsc1xuICogY3JlYXRlRW5naW5lKCk7IGEgcGVyc2lzdGVuY2UgcGFja2FnZSAoZS5nLiBAb2Focy9kYikgcmVnaXN0ZXJzIGl0cyBvd25cbiAqIGZhY3RvcnkgaW4gYSB2aXRlc3Qgc2V0dXAgZmlsZSB0byBydW4gdGhlIElERU5USUNBTCBzdWl0ZSBhZ2FpbnN0IFBvc3RncmVzXG4gKiAoc3RvcnkgXCIxMVwiOiBcImNvbmZvcm1hbmNlIHN1aXRlIHJ1bnMgYWdhaW5zdCBib3RoIG1lbW9yeSBhbmQgUG9zdGdyZXNcbiAqIGVuZ2luZXNcIikuIERlZmF1bHQgaXMgdGhlIGluLW1lbW9yeSByZWZlcmVuY2UgZW5naW5lLlxuICovXG5sZXQgZW5naW5lRmFjdG9yeTogKCkgPT4gU3BpbmVFbmdpbmUgPSBjcmVhdGVNZW1vcnlFbmdpbmU7XG5cbmV4cG9ydCBmdW5jdGlvbiBzZXRFbmdpbmVGYWN0b3J5KGZhY3Rvcnk6ICgpID0+IFNwaW5lRW5naW5lKTogdm9pZCB7XG4gIGVuZ2luZUZhY3RvcnkgPSBmYWN0b3J5O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlRW5naW5lKCk6IFNwaW5lRW5naW5lIHtcbiAgcmV0dXJuIGVuZ2luZUZhY3RvcnkoKTtcbn1cblxuZXhwb3J0IHsgY3JlYXRlTWVtb3J5RW5naW5lIH07XG4iLCAiLyoqXG4gKiBEcml6emxlIHBnLWNvcmUgc2NoZW1hIGZvciB0aGUgb2FocyBzcGluZSAoUGhhc2UgMSBzdG9yeSAxMSkuXG4gKlxuICogRGVzaWduIChwcm9kdWN0LXJvYWRtYXAubWQgXHUwMEE3MS4zLCBcdTAwQTcxLjUgXHUyMDE0IFwicmFjZXMgbG9zZSBieSBjb25zdHJhaW50LCBub3QgYnlcbiAqIGFwcGxpY2F0aW9uIGxvZ2ljXCIpOlxuICogIC0gY2xhaW1zOiBwYXJ0aWFsIHVuaXF1ZSBpbmRleCBPTiAod29ya19pdGVtX2lkKSBXSEVSRSByZWxlYXNlZCA9IGZhbHNlIFx1MjAxNFxuICogICAgdGhlIHNlY29uZCBjb25jdXJyZW50IGNsYWltIGxvc2VzIGF0IHRoZSBjb25zdHJhaW50LCBsZWF2aW5nIG5vIHJvdy5cbiAqICAtIGV2ZW50czogVU5JUVVFIChzdHJlYW1faWQsIHN0cmVhbV9zZXEpIGRvdWJsZXMgYXMgdGhlIG9wdGltaXN0aWMgbG9jaztcbiAqICAgIGdsb2JhbF9zZXEgaXMgYSBzZXJpYWwgaWRlbnRpdHkuXG4gKiAgLSB3b3JrX2l0ZW1zOiBzdGF0ZV92ZXJzaW9uIGludCBcdTIwMTQgQ0FTIHZpYSBVUERBVEUgLi4uIFdIRVJFIHN0YXRlX3ZlcnNpb24gPSAkZXhwZWN0ZWQuXG4gKlxuICogSGFuZC1tYWludGFpbmVkIHR3aW4gRERMIGxpdmVzIGluIHNjaGVtYS1zcWwudHMgKHJ1bnMgb24gUEdsaXRlIGluIHRoZVxuICogY29uZm9ybWFuY2UgaGFybmVzcyk7IGtlZXAgdGhlIHR3byBpbiBsb2Nrc3RlcC5cbiAqL1xuaW1wb3J0IHsgc3FsIH0gZnJvbSAnZHJpenpsZS1vcm0nO1xuaW1wb3J0IHtcbiAgYmlnaW50LFxuICBib29sZWFuLFxuICBpbnRlZ2VyLFxuICBqc29uYixcbiAgcGdUYWJsZSxcbiAgcHJpbWFyeUtleSxcbiAgc2VyaWFsLFxuICB0ZXh0LFxuICB1bmlxdWVJbmRleCxcbn0gZnJvbSAnZHJpenpsZS1vcm0vcGctY29yZSc7XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gYWN0b3JzIFx1MjAxNCB1c2VycywgYWdlbnRzLCBhbmQgdGhlIHBlci13b3Jrc3BhY2Ugc3lzdGVtIGFjdG9yIChyb2FkbWFwIFx1MDBBNzEuMilcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuZXhwb3J0IGNvbnN0IGFjdG9ycyA9IHBnVGFibGUoJ2FjdG9ycycsIHtcbiAgaWQ6IHRleHQoJ2lkJykucHJpbWFyeUtleSgpLFxuICB0eXBlOiB0ZXh0KCd0eXBlJykubm90TnVsbCgpLCAvLyAndXNlcicgfCAnYWdlbnQnIHwgJ3N5c3RlbSdcbiAgZGlzcGxheU5hbWU6IHRleHQoJ2Rpc3BsYXlfbmFtZScpLm5vdE51bGwoKSxcbn0pO1xuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIGdyYW50cyBcdTIwMTQgZmxhdCBQaGFzZS0xIHBlcm1pc3Npb24gc2V0IChzY29wZSBiZWNvbWVzIG1lYW5pbmdmdWwgaW4gUGhhc2UgMilcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuZXhwb3J0IGNvbnN0IGdyYW50cyA9IHBnVGFibGUoXG4gICdncmFudHMnLFxuICB7XG4gICAgYWN0b3JJZDogdGV4dCgnYWN0b3JfaWQnKS5ub3ROdWxsKCksXG4gICAgcGVybWlzc2lvbjogdGV4dCgncGVybWlzc2lvbicpLm5vdE51bGwoKSxcbiAgICBzY29wZTogdGV4dCgnc2NvcGUnKSxcbiAgfSxcbiAgKHQpID0+IFtwcmltYXJ5S2V5KHsgY29sdW1uczogW3QuYWN0b3JJZCwgdC5wZXJtaXNzaW9uXSB9KV0sXG4pO1xuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIGZlYXR1cmVzIFx1MjAxNCBlcGljLWxldmVsIHByb2plY3Rpb24gKHN0YXRlICsgZG9uZV9jaGVja3BvaW50IGRpc3BhdGNoIGhvbGQpXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbmV4cG9ydCBjb25zdCBmZWF0dXJlcyA9IHBnVGFibGUoJ2ZlYXR1cmVzJywge1xuICBpZDogdGV4dCgnaWQnKS5wcmltYXJ5S2V5KCksXG4gIHNlcTogc2VyaWFsKCdzZXEnKS5ub3ROdWxsKCksXG4gIHN0YXRlOiB0ZXh0KCdzdGF0ZScpLm5vdE51bGwoKSwgLy8gJ2JhY2tsb2cnIHwgJ2luX3Byb2dyZXNzJyB8ICdkb25lJ1xuICBkaXNwYXRjaEhvbGQ6IGJvb2xlYW4oJ2Rpc3BhdGNoX2hvbGQnKS5ub3ROdWxsKCkuZGVmYXVsdChmYWxzZSksXG59KTtcblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyB3b3JrX2l0ZW1zIFx1MjAxNCB0aGUgdW5pZmllZCB3b3JrLWl0ZW0gbW9kZWwgKHJvYWRtYXAgXHUwMEE3MS4xKVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5leHBvcnQgY29uc3Qgd29ya0l0ZW1zID0gcGdUYWJsZSgnd29ya19pdGVtcycsIHtcbiAgaWQ6IHRleHQoJ2lkJykucHJpbWFyeUtleSgpLFxuICAvKiogY3JlYXRpb24gb3JkZXIgXHUyMDE0IGJhY2tzIGZpcnN0LXdyaXRlci13aW5zIGV4dGVybmFsS2V5IHJlc29sdXRpb24gKi9cbiAgc2VxOiBzZXJpYWwoJ3NlcScpLm5vdE51bGwoKSxcbiAgZmVhdHVyZUlkOiB0ZXh0KCdmZWF0dXJlX2lkJykubm90TnVsbCgpLFxuICBleHRlcm5hbEtleTogdGV4dCgnZXh0ZXJuYWxfa2V5Jykubm90TnVsbCgpLFxuICB0aXRsZTogdGV4dCgndGl0bGUnKS5ub3ROdWxsKCksXG4gIHN0YXRlOiB0ZXh0KCdzdGF0ZScpLm5vdE51bGwoKSxcbiAgYmxvY2tlZFJlYXNvbjogdGV4dCgnYmxvY2tlZF9yZWFzb24nKSwgLy8gb3ZlcmxheSwgbm90IGEgc3RhdGUgKEQ4KVxuICByZXZpZXdMb29wSXRlcmF0aW9uOiBpbnRlZ2VyKCdyZXZpZXdfbG9vcF9pdGVyYXRpb24nKS5ub3ROdWxsKCkuZGVmYXVsdCgwKSxcbiAgaW50ZW50SGFzaDogdGV4dCgnaW50ZW50X2hhc2gnKSxcbiAgcGlubmVkVmVyaWZpY2F0aW9uOiBqc29uYigncGlubmVkX3ZlcmlmaWNhdGlvbicpLiR0eXBlPHN0cmluZ1tdPigpLCAvLyBSdWxlcy1sYXllciBkYXRhIChENylcbiAgc3BlY0NoZWNrcG9pbnQ6IGJvb2xlYW4oJ3NwZWNfY2hlY2twb2ludCcpLm5vdE51bGwoKS5kZWZhdWx0KGZhbHNlKSxcbiAgZG9uZUNoZWNrcG9pbnQ6IGJvb2xlYW4oJ2RvbmVfY2hlY2twb2ludCcpLm5vdE51bGwoKS5kZWZhdWx0KGZhbHNlKSxcbiAgaW52b2tlRGV2V2l0aDogdGV4dCgnaW52b2tlX2Rldl93aXRoJykubm90TnVsbCgpLmRlZmF1bHQoJycpLFxuICBzcGVjUGF0aDogdGV4dCgnc3BlY19wYXRoJykubm90TnVsbCgpLFxuICAvKiogb3B0aW1pc3RpYyBjb25jdXJyZW5jeTogQ0FTIGJ5IFVQREFURSAuLi4gV0hFUkUgc3RhdGVfdmVyc2lvbiA9IGV4cGVjdGVkICovXG4gIHN0YXRlVmVyc2lvbjogaW50ZWdlcignc3RhdGVfdmVyc2lvbicpLm5vdE51bGwoKS5kZWZhdWx0KDApLFxuICAvKiogZGVwZW5kZW5jeSBleHRlcm5hbEtleXMgd2l0aGluIHRoZSBzYW1lIGZlYXR1cmUgKi9cbiAgZGVwZW5kc09uOiBqc29uYignZGVwZW5kc19vbicpLiR0eXBlPHN0cmluZ1tdPigpLm5vdE51bGwoKS5kZWZhdWx0KHNxbGAnW10nOjpqc29uYmApLFxuICAvKiogbW9ub3RvbmljIGZlbmNpbmcgY291bnRlciBwZXIgd29yayBpdGVtIChyb2FkbWFwIFx1MDBBNzEuMykgKi9cbiAgbGFzdEZlbmNpbmdUb2tlbjogaW50ZWdlcignbGFzdF9mZW5jaW5nX3Rva2VuJykubm90TnVsbCgpLmRlZmF1bHQoMCksXG59KTtcblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBjbGFpbXMgXHUyMDE0IGxlYXNlcyArIGZlbmNpbmcgdG9rZW5zOyBPTkUgbGl2ZSBjbGFpbSBwZXIgaXRlbSBCWSBDT05TVFJBSU5UXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbmV4cG9ydCBjb25zdCBjbGFpbXMgPSBwZ1RhYmxlKFxuICAnY2xhaW1zJyxcbiAge1xuICAgIGlkOiB0ZXh0KCdpZCcpLnByaW1hcnlLZXkoKSxcbiAgICBzZXE6IHNlcmlhbCgnc2VxJykubm90TnVsbCgpLFxuICAgIHdvcmtJdGVtSWQ6IHRleHQoJ3dvcmtfaXRlbV9pZCcpLm5vdE51bGwoKSxcbiAgICBhY3RvcklkOiB0ZXh0KCdhY3Rvcl9pZCcpLm5vdE51bGwoKSxcbiAgICBmZW5jaW5nVG9rZW46IGludGVnZXIoJ2ZlbmNpbmdfdG9rZW4nKS5ub3ROdWxsKCksXG4gICAgLyoqIGVuZ2luZS1jbG9jayBtaWxsaXNlY29uZHMgKEpTIGZpZWxkIGBub3dgKSwgbmV2ZXIgU1FMIG5vdygpICovXG4gICAgbGVhc2VFeHBpcmVzQXQ6IGJpZ2ludCgnbGVhc2VfZXhwaXJlc19hdCcsIHsgbW9kZTogJ251bWJlcicgfSkubm90TnVsbCgpLFxuICAgIHJlbGVhc2VkOiBib29sZWFuKCdyZWxlYXNlZCcpLm5vdE51bGwoKS5kZWZhdWx0KGZhbHNlKSxcbiAgICB0dGxNczogYmlnaW50KCd0dGxfbXMnLCB7IG1vZGU6ICdudW1iZXInIH0pLm5vdE51bGwoKSxcbiAgfSxcbiAgKHQpID0+IFtcbiAgICAvLyByb2FkbWFwIFx1MDBBNzEuMzogXCJPbmUgbGl2ZSBjbGFpbSBwZXIgd29yayBpdGVtLCBlbmZvcmNlZCBieSBhIHBhcnRpYWxcbiAgICAvLyB1bmlxdWUgaW5kZXggXHUyMDE0IHJhY2VzIGxvc2UgYnkgY29uc3RyYWludCwgbm90IGJ5IGFwcGxpY2F0aW9uIGxvZ2ljLlwiXG4gICAgdW5pcXVlSW5kZXgoJ2NsYWltc19vbmVfbGl2ZV9wZXJfaXRlbScpLm9uKHQud29ya0l0ZW1JZCkud2hlcmUoc3FsYHJlbGVhc2VkID0gZmFsc2VgKSxcbiAgXSxcbik7XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gZ2F0ZV9kZWNpc2lvbnMgXHUyMDE0IHBlcm1pc3Npb24gc25hcHNob3QgKyBkZWNpc2lvbiByZWNvcmQgKHJvYWRtYXAgXHUwMEE3MS40KVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5leHBvcnQgY29uc3QgZ2F0ZURlY2lzaW9ucyA9IHBnVGFibGUoJ2dhdGVfZGVjaXNpb25zJywge1xuICBzZXE6IHNlcmlhbCgnc2VxJykucHJpbWFyeUtleSgpLFxuICB3b3JrSXRlbUlkOiB0ZXh0KCd3b3JrX2l0ZW1faWQnKS5ub3ROdWxsKCksXG4gIGdhdGU6IHRleHQoJ2dhdGUnKS5ub3ROdWxsKCksIC8vICdzcGVjX2FwcHJvdmFsJyB8ICdyZXZpZXdfYXBwcm92YWwnXG4gIGRlY2lzaW9uOiB0ZXh0KCdkZWNpc2lvbicpLm5vdE51bGwoKSwgLy8gJ2FwcHJvdmVkJyB8ICdyZWplY3RlZCdcbiAgYWN0b3JJZDogdGV4dCgnYWN0b3JfaWQnKS5ub3ROdWxsKCksXG59KTtcblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBldmlkZW5jZSBcdTIwMTQgbWFjaGluZS1jb2xsZWN0ZWQgZmFjdHM7IHNlcSBvcmRlcnMgXCJsYXRlc3RcIiBzZW1hbnRpY3Ncbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuZXhwb3J0IGNvbnN0IGV2aWRlbmNlID0gcGdUYWJsZSgnZXZpZGVuY2UnLCB7XG4gIHNlcTogc2VyaWFsKCdzZXEnKS5wcmltYXJ5S2V5KCksXG4gIHdvcmtJdGVtSWQ6IHRleHQoJ3dvcmtfaXRlbV9pZCcpLm5vdE51bGwoKSxcbiAga2luZDogdGV4dCgna2luZCcpLm5vdE51bGwoKSxcbiAgcGF5bG9hZDoganNvbmIoJ3BheWxvYWQnKS4kdHlwZTxSZWNvcmQ8c3RyaW5nLCB1bmtub3duPj4oKS5ub3ROdWxsKCksXG59KTtcblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBldmVudHMgXHUyMDE0IGFwcGVuZC1vbmx5IGxvZywgc2FtZS10cmFuc2FjdGlvbiBhcyBwcm9qZWN0aW9ucyAocm9hZG1hcCBcdTAwQTcxLjUpXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbmV4cG9ydCBjb25zdCBldmVudHMgPSBwZ1RhYmxlKFxuICAnZXZlbnRzJyxcbiAge1xuICAgIGdsb2JhbFNlcTogc2VyaWFsKCdnbG9iYWxfc2VxJykucHJpbWFyeUtleSgpLFxuICAgIHN0cmVhbVR5cGU6IHRleHQoJ3N0cmVhbV90eXBlJykubm90TnVsbCgpLCAvLyAnd29ya3NwYWNlJ3wnZmVhdHVyZSd8J3dvcmtfaXRlbSd8J2FjdG9yJ1xuICAgIHN0cmVhbUlkOiB0ZXh0KCdzdHJlYW1faWQnKS5ub3ROdWxsKCksXG4gICAgc3RyZWFtU2VxOiBpbnRlZ2VyKCdzdHJlYW1fc2VxJykubm90TnVsbCgpLFxuICAgIHR5cGU6IHRleHQoJ3R5cGUnKS5ub3ROdWxsKCksXG4gICAgYWN0b3JJZDogdGV4dCgnYWN0b3JfaWQnKS5ub3ROdWxsKCksXG4gICAgcGF5bG9hZDoganNvbmIoJ3BheWxvYWQnKS4kdHlwZTxSZWNvcmQ8c3RyaW5nLCB1bmtub3duPj4oKS5ub3ROdWxsKCksXG4gICAgY2F1c2F0aW9uSWQ6IHRleHQoJ2NhdXNhdGlvbl9pZCcpLFxuICAgIGlkZW1wb3RlbmN5S2V5OiB0ZXh0KCdpZGVtcG90ZW5jeV9rZXknKSxcbiAgfSxcbiAgKHQpID0+IFtcbiAgICAvLyBcdTAwQTcxLjU6IFwiVU5JUVVFKHN0cmVhbV9pZCwgc3RyZWFtX3NlcSkgZG91YmxlcyBhcyB0aGUgb3B0aW1pc3RpYyBsb2NrLlwiXG4gICAgdW5pcXVlSW5kZXgoJ2V2ZW50c19zdHJlYW1faWRfc3RyZWFtX3NlcScpLm9uKHQuc3RyZWFtSWQsIHQuc3RyZWFtU2VxKSxcbiAgXSxcbik7XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gaWRlbXBvdGVuY3lfa2V5cyBcdTIwMTQga2V5ZWQgcmVwbGF5IHJldHVybnMgdGhlIHJlY29yZGVkIHJlc3VsdCwgYXBwZW5kcyBub3RoaW5nXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbmV4cG9ydCBjb25zdCBpZGVtcG90ZW5jeUtleXMgPSBwZ1RhYmxlKCdpZGVtcG90ZW5jeV9rZXlzJywge1xuICBrZXk6IHRleHQoJ2tleScpLnByaW1hcnlLZXkoKSxcbiAgcmVzdWx0OiBqc29uYigncmVzdWx0JykuJHR5cGU8UmVjb3JkPHN0cmluZywgdW5rbm93bj4+KCkubm90TnVsbCgpLFxufSk7XG4iLCAiLyoqXG4gKiBQZ0VuZ2luZSBcdTIwMTQgYXN5bmMgUG9zdGdyZXMgcG9ydCBvZiB0aGUgaW4tbWVtb3J5IHJlZmVyZW5jZSBlbmdpbmVcbiAqIChAb2Focy9jb3JlIHNyYy9lbmdpbmUudHMpLiBTZW1hbnRpY3MgYXJlIGEgRkFJVEhGVUwgbWlycm9yLCBtZXRob2QgYnlcbiAqIG1ldGhvZDogc2FtZSBjaGVjayBvcmRlcmluZywgc2FtZSBlcnJvciBjbGFzc2VzLCBzYW1lIGV2ZW50IHR5cGVzLCBzYW1lXG4gKiBjb25mb3JtYW5jZSBwaW5zIChzZWUgcGFja2FnZXMvY29yZS90ZXN0L0NPTkZPUk1BTkNFLm1kKS4gV2hlcmUgdGhlXG4gKiByZWZlcmVuY2UgdXNlZCBpbi1wcm9jZXNzIGRhdGEgc3RydWN0dXJlcywgdGhpcyBlbmdpbmUgdXNlcyB0aGUgRHJpenpsZVxuICogc2NoZW1hIGluIHNjaGVtYS50cyBhbmQgbGV0cyBjb25zdHJhaW50cyBkbyB0aGUgcmFjaW5nIChyb2FkbWFwIFx1MDBBNzEuM1xuICogXCJyYWNlcyBsb3NlIGJ5IGNvbnN0cmFpbnQsIG5vdCBieSBhcHBsaWNhdGlvbiBsb2dpY1wiKS5cbiAqXG4gKiBUZWNobmljYWwgbm90ZXM6XG4gKiAgLSBUaGUgZW5naW5lIGNsb2NrIGlzIHRoZSBKUyBmaWVsZCBgbm93YCAoYWR2YW5jZUNsb2NrIGFkZHMgdG8gaXQpOyBsZWFzZVxuICogICAgY29tcGFyaXNvbnMgYWx3YXlzIHVzZSB0aGlzLm5vdywgbmV2ZXIgU1FMIG5vdygpLlxuICogIC0gRXZlcnkgY29tbWFuZCdzIHdyaXRlcyBoYXBwZW4gaW4gT05FIGRiLnRyYW5zYWN0aW9uIChldmVudCBhcHBlbmQgK1xuICogICAgcHJvamVjdGlvbiB1cGRhdGUgdG9nZXRoZXIgXHUyMDE0IHJvYWRtYXAgXHUwMEE3MS41KS4gVGhlIHNpbmdsZSBkZWxpYmVyYXRlXG4gKiAgICBleGNlcHRpb246IHRoZSBmZW5jaW5nLnJlamVjdGVkIEFVRElUIGV2ZW50IGNvbW1pdHMgaW4gaXRzIG93blxuICogICAgdHJhbnNhY3Rpb24sIGJlY2F1c2UgdGhlIGNvbW1hbmQgaXQgYmVsb25ncyB0byBmYWlscyB3aXRoIENvbmZsaWN0RXJyb3JcbiAqICAgIGFuZCBtdXN0IGxlYXZlIHRoZSBwcm9qZWN0aW9uIHVudG91Y2hlZCB3aGlsZSB0aGUgcmVmdXNhbCBpcyByZWNvcmRlZFxuICogICAgKFx1MDBBNzEuMyBcImEgc3RhbGUgdG9rZW4gZ2V0cyA0MDkgYW5kIGFuIGF1ZGl0IGV2ZW50XCIpLlxuICogIC0gQWxsIHJldHVybmVkIHZhbHVlcyBhcmUgc3RydWN0dXJlZC1jbG9uZS1hYmxlIHBsYWluIG9iamVjdHMgKG51bWJlclxuICogICAgdGltZXN0YW1wcywgbm8gRGF0ZSwgbm8gdW5kZWZpbmVkIGFycmF5IGhvbGVzKSBzbyB0aGV5IGNyb3NzIHRoZVxuICogICAgc3luY2tpdCB3b3JrZXIgYm91bmRhcnkgaW50YWN0LlxuICovXG5pbXBvcnQgeyBhbmQsIGFzYywgZXEsIGd0LCBsdGUsIHNxbCB9IGZyb20gJ2RyaXp6bGUtb3JtJztcbmltcG9ydCB0eXBlIHsgUGdsaXRlRGF0YWJhc2UgfSBmcm9tICdkcml6emxlLW9ybS9wZ2xpdGUnO1xuXG5pbXBvcnQge1xuICBCTE9DS0VEX1JFQVNPTlMsXG4gIENvbmZsaWN0RXJyb3IsXG4gIEd1YXJkRmFpbGVkRXJyb3IsXG4gIEludmFsaWRUcmFuc2l0aW9uRXJyb3IsXG4gIFBlcm1pc3Npb25EZW5pZWRFcnJvcixcbiAgUkVWSUVXX0xPT1BfTElNSVQsXG4gIFN0b3JpZXNWYWxpZGF0aW9uRXJyb3IsXG4gIFdPUktfSVRFTV9TVEFURVMsXG4gIHBhcnNlU3RvcmllcyxcbiAgdHlwZSBBY3RvcixcbiAgdHlwZSBBY3RvclR5cGUsXG4gIHR5cGUgQWR2YW5jZUlucHV0LFxuICB0eXBlIEJsb2NrZWRSZWFzb24sXG4gIHR5cGUgQ2xhaW0sXG4gIHR5cGUgQ3JlYXRlV29ya0l0ZW1JbnB1dCxcbiAgdHlwZSBEaXZlcmdlbmNlUmVwb3J0LFxuICB0eXBlIEV2aWRlbmNlLFxuICB0eXBlIEZlYXR1cmUsXG4gIHR5cGUgR2F0ZURlY2lzaW9uSW5wdXQsXG4gIHR5cGUgUGVybWlzc2lvbixcbiAgdHlwZSBTcGluZUV2ZW50LFxuICB0eXBlIFN0b3JpZXNJbXBvcnRSZXN1bHQsXG4gIHR5cGUgV29ya0l0ZW0sXG4gIHR5cGUgV29ya0l0ZW1TdGF0ZSxcbn0gZnJvbSAnQG9haHMvY29yZSc7XG5cbmltcG9ydCB7XG4gIGFjdG9ycyxcbiAgY2xhaW1zLFxuICBldmlkZW5jZSBhcyBldmlkZW5jZVRhYmxlLFxuICBldmVudHMsXG4gIGZlYXR1cmVzLFxuICBnYXRlRGVjaXNpb25zLFxuICBncmFudHMsXG4gIGlkZW1wb3RlbmN5S2V5cyxcbiAgd29ya0l0ZW1zLFxufSBmcm9tICcuL3NjaGVtYS5qcyc7XG5cbnR5cGUgRGIgPSBQZ2xpdGVEYXRhYmFzZTxSZWNvcmQ8c3RyaW5nLCB1bmtub3duPj47XG50eXBlIFR4ID0gUGFyYW1ldGVyczxQYXJhbWV0ZXJzPERiWyd0cmFuc2FjdGlvbiddPlswXT5bMF07XG4vKiogQm90aCB0aGUgcm9vdCBkYXRhYmFzZSBhbmQgYSB0cmFuc2FjdGlvbiBleHBvc2UgdGhlIHNhbWUgcXVlcnkgc3VyZmFjZS4gKi9cbnR5cGUgUXVlcnlhYmxlID0gRGIgfCBUeDtcblxudHlwZSBXb3JrSXRlbVJvdyA9IHR5cGVvZiB3b3JrSXRlbXMuJGluZmVyU2VsZWN0O1xudHlwZSBDbGFpbVJvdyA9IHR5cGVvZiBjbGFpbXMuJGluZmVyU2VsZWN0O1xudHlwZSBGZWF0dXJlUm93ID0gdHlwZW9mIGZlYXR1cmVzLiRpbmZlclNlbGVjdDtcbnR5cGUgRXZlbnRSb3cgPSB0eXBlb2YgZXZlbnRzLiRpbmZlclNlbGVjdDtcblxuY29uc3QgUkFOSzogUmVjb3JkPFdvcmtJdGVtU3RhdGUsIG51bWJlcj4gPSBPYmplY3QuZnJvbUVudHJpZXMoXG4gIFdPUktfSVRFTV9TVEFURVMubWFwKChzLCBpKSA9PiBbcywgaV0pLFxuKSBhcyBSZWNvcmQ8V29ya0l0ZW1TdGF0ZSwgbnVtYmVyPjtcblxuLyoqIE1pcnJvciBvZiB0aGUgcmVmZXJlbmNlIHRyYW5zaXRpb24gdGFibGUgKGVuZ2luZS50cykgXHUyMDE0IGRvIG5vdCBkaXZlcmdlLiAqL1xuaW50ZXJmYWNlIFRyYW5zaXRpb25SdWxlIHtcbiAgZnJvbTogV29ya0l0ZW1TdGF0ZTtcbiAgdG86IFdvcmtJdGVtU3RhdGU7XG4gIHBlcm1pc3Npb246IFBlcm1pc3Npb247XG4gIGNsYWltUmVxdWlyZWQ6IGJvb2xlYW47XG4gIGd1YXJkczogQXJyYXk8J2RlcHNfZG9uZScgfCAnc3BlY19nYXRlX2lmX2NoZWNrcG9pbnQnIHwgJ25vbmVtcHR5X2RpZmYnPjtcbn1cblxuY29uc3QgVFJBTlNJVElPTlM6IFRyYW5zaXRpb25SdWxlW10gPSBbXG4gIHsgZnJvbTogJ2JhY2tsb2cnLCB0bzogJ2RyYWZ0JywgcGVybWlzc2lvbjogJ3Rhc2sucGxhbicsIGNsYWltUmVxdWlyZWQ6IGZhbHNlLCBndWFyZHM6IFtdIH0sXG4gIHtcbiAgICBmcm9tOiAnZHJhZnQnLFxuICAgIHRvOiAncmVhZHlfZm9yX2RldicsXG4gICAgcGVybWlzc2lvbjogJ3Rhc2sucGxhbicsXG4gICAgY2xhaW1SZXF1aXJlZDogZmFsc2UsXG4gICAgZ3VhcmRzOiBbJ3NwZWNfZ2F0ZV9pZl9jaGVja3BvaW50J10sXG4gIH0sXG4gIHtcbiAgICBmcm9tOiAncmVhZHlfZm9yX2RldicsXG4gICAgdG86ICdpbl9wcm9ncmVzcycsXG4gICAgcGVybWlzc2lvbjogJ3Rhc2suYWR2YW5jZScsXG4gICAgY2xhaW1SZXF1aXJlZDogdHJ1ZSxcbiAgICBndWFyZHM6IFsnZGVwc19kb25lJ10sXG4gIH0sXG4gIHtcbiAgICBmcm9tOiAnaW5fcHJvZ3Jlc3MnLFxuICAgIHRvOiAnaW5fcmV2aWV3JyxcbiAgICBwZXJtaXNzaW9uOiAndGFzay5hZHZhbmNlJyxcbiAgICBjbGFpbVJlcXVpcmVkOiB0cnVlLFxuICAgIGd1YXJkczogWydub25lbXB0eV9kaWZmJ10sXG4gIH0sXG5dO1xuXG5jb25zdCBMRUdBQ1lfU1RBVFVTOiBSZWNvcmQ8c3RyaW5nLCBXb3JrSXRlbVN0YXRlPiA9IHtcbiAgYmFja2xvZzogJ2JhY2tsb2cnLFxuICBkcmFmdDogJ2RyYWZ0JyxcbiAgJ3JlYWR5LWZvci1kZXYnOiAncmVhZHlfZm9yX2RldicsXG4gIHJlYWR5X2Zvcl9kZXY6ICdyZWFkeV9mb3JfZGV2JyxcbiAgJ2luLXByb2dyZXNzJzogJ2luX3Byb2dyZXNzJyxcbiAgaW5fcHJvZ3Jlc3M6ICdpbl9wcm9ncmVzcycsXG4gICdpbi1yZXZpZXcnOiAnaW5fcmV2aWV3JyxcbiAgaW5fcmV2aWV3OiAnaW5fcmV2aWV3JyxcbiAgcmV2aWV3OiAnaW5fcmV2aWV3JyxcbiAgZG9uZTogJ2RvbmUnLFxufTtcblxuLyoqIFBvc3RncmVzIHVuaXF1ZS12aW9sYXRpb24gZGV0ZWN0b3IgKHdhbGtzIGRyaXp6bGUncyB3cmFwcGVkIGNhdXNlcykuICovXG5mdW5jdGlvbiBpc1VuaXF1ZVZpb2xhdGlvbihlcnJvcjogdW5rbm93bik6IGJvb2xlYW4ge1xuICBsZXQgY3VycmVudDogdW5rbm93biA9IGVycm9yO1xuICBmb3IgKGxldCBkZXB0aCA9IDA7IGRlcHRoIDwgNSAmJiBjdXJyZW50ICE9PSBudWxsICYmIHR5cGVvZiBjdXJyZW50ID09PSAnb2JqZWN0JzsgZGVwdGggKz0gMSkge1xuICAgIGNvbnN0IGVyciA9IGN1cnJlbnQgYXMgeyBjb2RlPzogdW5rbm93bjsgbWVzc2FnZT86IHVua25vd247IGNhdXNlPzogdW5rbm93biB9O1xuICAgIGlmIChlcnIuY29kZSA9PT0gJzIzNTA1JykgcmV0dXJuIHRydWU7XG4gICAgaWYgKHR5cGVvZiBlcnIubWVzc2FnZSA9PT0gJ3N0cmluZycgJiYgL2R1cGxpY2F0ZSBrZXkgdmFsdWUgdmlvbGF0ZXMgdW5pcXVlL2kudGVzdChlcnIubWVzc2FnZSkpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICBjdXJyZW50ID0gZXJyLmNhdXNlO1xuICB9XG4gIHJldHVybiBmYWxzZTtcbn1cblxuZXhwb3J0IGNsYXNzIFBnRW5naW5lIHtcbiAgLyoqIEVuZ2luZSBjbG9jayBpbiBtcyBcdTIwMTQgdGhlIE9OTFkgdGltZSBzb3VyY2UgZm9yIGxlYXNlIGxvZ2ljLiAqL1xuICBwcml2YXRlIG5vdyA9IDA7XG4gIHByaXZhdGUgc2VxID0gMDtcbiAgcHJpdmF0ZSBzeXN0ZW1BY3RvcklkID0gJyc7XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSByZWFkb25seSBkYjogRGIpIHt9XG5cbiAgLyoqXG4gICAqIFBvc3QtcmVzZXQgc2V0dXA6IHRoZSBwZXItd29ya3NwYWNlIHN5c3RlbSBhY3RvciAocm9hZG1hcCBcdTAwQTcxLjIpLlxuICAgKlxuICAgKiBJZGVtcG90ZW50IGZvciBwZXJzaXN0ZW50IGRhdGFiYXNlcyAoc3RvcnkgMTMsIGBvYWhzIHNlcnZlIC0tZGF0YWApOiBhXG4gICAqIHJlc3RhcnQgb3ZlciBhbiBleGlzdGluZyBQR2xpdGUgZGF0YSBkaXJlY3RvcnkgZmluZHMgdGhlIHN5c3RlbSBhY3RvclxuICAgKiBhbHJlYWR5IHByZXNlbnQsIHJldXNlcyBpdCwgYW5kIHJlY292ZXJzIHRoZSBpZCBjb3VudGVyIGZyb20gdGhlIHN0b3JlZFxuICAgKiBpZHMgc28gZnJlc2hseS1jcmVhdGVkIGVudGl0aWVzIG5ldmVyIGNvbGxpZGUgd2l0aCBwZXJzaXN0ZWQgb25lcy4gQVxuICAgKiBmcmVzaCAob3IgdHJ1bmNhdGVkKSBkYXRhYmFzZSB0YWtlcyB0aGUgb3JpZ2luYWwgcGF0aCB1bmNoYW5nZWQsIHNvIHRoZVxuICAgKiBjb25mb3JtYW5jZSBzdWl0ZSBzZW1hbnRpY3MgYXJlIHVudG91Y2hlZC5cbiAgICovXG4gIGFzeW5jIGluaXQoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgZXhpc3RpbmcgPSBhd2FpdCB0aGlzLmRiXG4gICAgICAuc2VsZWN0KHsgaWQ6IGFjdG9ycy5pZCB9KVxuICAgICAgLmZyb20oYWN0b3JzKVxuICAgICAgLndoZXJlKGVxKGFjdG9ycy50eXBlLCAnc3lzdGVtJykpXG4gICAgICAubGltaXQoMSk7XG4gICAgY29uc3QgZm91bmQgPSBleGlzdGluZ1swXTtcbiAgICBpZiAoZm91bmQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhpcy5zeXN0ZW1BY3RvcklkID0gZm91bmQuaWQ7XG4gICAgICB0aGlzLnNlcSA9IGF3YWl0IHRoaXMucmVjb3ZlclNlcSgpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLnN5c3RlbUFjdG9ySWQgPSB0aGlzLm5leHRJZCgnYWN0b3Itc3lzdGVtJyk7XG4gICAgYXdhaXQgdGhpcy5kYi5pbnNlcnQoYWN0b3JzKS52YWx1ZXMoe1xuICAgICAgaWQ6IHRoaXMuc3lzdGVtQWN0b3JJZCxcbiAgICAgIHR5cGU6ICdzeXN0ZW0nLFxuICAgICAgZGlzcGxheU5hbWU6ICdzeXN0ZW0nLFxuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIExhcmdlc3QgbmV4dElkKCkgc3VmZml4IHN0b3JlZCBpbiBhbnkgdGV4dC1pZCB0YWJsZSBcdTIwMTQgcmVzdGFydC1zYWZlIGlkXG4gICAqIGdlbmVyYXRpb24gZm9yIHBlcnNpc3RlbnQgZGF0YSBkaXJlY3Rvcmllcy4gSWRzIGFyZSBgJHtwcmVmaXh9XyR7YmFzZTM2fWAuXG4gICAqL1xuICBwcml2YXRlIGFzeW5jIHJlY292ZXJTZXEoKTogUHJvbWlzZTxudW1iZXI+IHtcbiAgICBjb25zdCBpZHM6IHN0cmluZ1tdID0gW107XG4gICAgaWRzLnB1c2goLi4uKGF3YWl0IHRoaXMuZGIuc2VsZWN0KHsgaWQ6IGFjdG9ycy5pZCB9KS5mcm9tKGFjdG9ycykpLm1hcCgocikgPT4gci5pZCkpO1xuICAgIGlkcy5wdXNoKC4uLihhd2FpdCB0aGlzLmRiLnNlbGVjdCh7IGlkOiBmZWF0dXJlcy5pZCB9KS5mcm9tKGZlYXR1cmVzKSkubWFwKChyKSA9PiByLmlkKSk7XG4gICAgaWRzLnB1c2goLi4uKGF3YWl0IHRoaXMuZGIuc2VsZWN0KHsgaWQ6IHdvcmtJdGVtcy5pZCB9KS5mcm9tKHdvcmtJdGVtcykpLm1hcCgocikgPT4gci5pZCkpO1xuICAgIGlkcy5wdXNoKC4uLihhd2FpdCB0aGlzLmRiLnNlbGVjdCh7IGlkOiBjbGFpbXMuaWQgfSkuZnJvbShjbGFpbXMpKS5tYXAoKHIpID0+IHIuaWQpKTtcbiAgICBsZXQgbWF4ID0gMDtcbiAgICBmb3IgKGNvbnN0IGlkIG9mIGlkcykge1xuICAgICAgY29uc3Qgc2VwID0gaWQubGFzdEluZGV4T2YoJ18nKTtcbiAgICAgIGlmIChzZXAgPCAwKSBjb250aW51ZTtcbiAgICAgIGNvbnN0IG4gPSBOdW1iZXIucGFyc2VJbnQoaWQuc2xpY2Uoc2VwICsgMSksIDM2KTtcbiAgICAgIGlmIChOdW1iZXIuaXNGaW5pdGUobikgJiYgbiA+IG1heCkgbWF4ID0gbjtcbiAgICB9XG4gICAgcmV0dXJuIG1heDtcbiAgfVxuXG4gIC8vIC0tIGluZnJhc3RydWN0dXJlIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgcHJpdmF0ZSBuZXh0SWQocHJlZml4OiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIHRoaXMuc2VxICs9IDE7XG4gICAgcmV0dXJuIGAke3ByZWZpeH1fJHt0aGlzLnNlcS50b1N0cmluZygzNikucGFkU3RhcnQoNiwgJzAnKX1gO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBhcHBlbmRUeChcbiAgICB0eDogUXVlcnlhYmxlLFxuICAgIHN0cmVhbVR5cGU6IFNwaW5lRXZlbnRbJ3N0cmVhbVR5cGUnXSxcbiAgICBzdHJlYW1JZDogc3RyaW5nLFxuICAgIHR5cGU6IHN0cmluZyxcbiAgICBhY3RvcklkOiBzdHJpbmcsXG4gICAgcGF5bG9hZDogUmVjb3JkPHN0cmluZywgdW5rbm93bj4sXG4gICAgZXh0cmE/OiB7IGNhdXNhdGlvbklkPzogc3RyaW5nOyBpZGVtcG90ZW5jeUtleT86IHN0cmluZyB9LFxuICApOiBQcm9taXNlPFNwaW5lRXZlbnQ+IHtcbiAgICAvLyBzdHJlYW1fc2VxIGlzIDEtYmFzZWQgYW5kIGdhcC1mcmVlIHBlciBzdHJlYW0gKFx1MDBBNzEuNSk7IGNvbXB1dGVkIGluIHRoZVxuICAgIC8vIHNhbWUgdHJhbnNhY3Rpb24gYXMgdGhlIHByb2plY3Rpb24gdXBkYXRlLCBzbyBVTklRVUUoc3RyZWFtX2lkLFxuICAgIC8vIHN0cmVhbV9zZXEpIGRvdWJsZXMgYXMgdGhlIG9wdGltaXN0aWMgbG9jay5cbiAgICBjb25zdCBbcm93XSA9IGF3YWl0IHR4XG4gICAgICAuc2VsZWN0KHsgbWF4U2VxOiBzcWw8bnVtYmVyPmBjb2FsZXNjZShtYXgoJHtldmVudHMuc3RyZWFtU2VxfSksIDApYCB9KVxuICAgICAgLmZyb20oZXZlbnRzKVxuICAgICAgLndoZXJlKGVxKGV2ZW50cy5zdHJlYW1JZCwgc3RyZWFtSWQpKTtcbiAgICBjb25zdCBzdHJlYW1TZXEgPSBOdW1iZXIocm93Py5tYXhTZXEgPz8gMCkgKyAxO1xuICAgIGNvbnN0IGluc2VydGVkID0gYXdhaXQgdHhcbiAgICAgIC5pbnNlcnQoZXZlbnRzKVxuICAgICAgLnZhbHVlcyh7XG4gICAgICAgIHN0cmVhbVR5cGUsXG4gICAgICAgIHN0cmVhbUlkLFxuICAgICAgICBzdHJlYW1TZXEsXG4gICAgICAgIHR5cGUsXG4gICAgICAgIGFjdG9ySWQsXG4gICAgICAgIHBheWxvYWQsXG4gICAgICAgIGNhdXNhdGlvbklkOiBleHRyYT8uY2F1c2F0aW9uSWQgPz8gbnVsbCxcbiAgICAgICAgaWRlbXBvdGVuY3lLZXk6IGV4dHJhPy5pZGVtcG90ZW5jeUtleSA/PyBudWxsLFxuICAgICAgfSlcbiAgICAgIC5yZXR1cm5pbmcoeyBnbG9iYWxTZXE6IGV2ZW50cy5nbG9iYWxTZXEgfSk7XG4gICAgY29uc3QgZ2xvYmFsU2VxID0gaW5zZXJ0ZWRbMF0/Lmdsb2JhbFNlcTtcbiAgICBpZiAoZ2xvYmFsU2VxID09PSB1bmRlZmluZWQpIHRocm93IG5ldyBFcnJvcignZXZlbnQgaW5zZXJ0IHJldHVybmVkIG5vIGdsb2JhbF9zZXEnKTtcbiAgICByZXR1cm4ge1xuICAgICAgZ2xvYmFsU2VxLFxuICAgICAgc3RyZWFtVHlwZSxcbiAgICAgIHN0cmVhbUlkLFxuICAgICAgc3RyZWFtU2VxLFxuICAgICAgdHlwZSxcbiAgICAgIGFjdG9ySWQsXG4gICAgICBwYXlsb2FkLFxuICAgICAgLi4uKGV4dHJhPy5jYXVzYXRpb25JZCAhPT0gdW5kZWZpbmVkID8geyBjYXVzYXRpb25JZDogZXh0cmEuY2F1c2F0aW9uSWQgfSA6IHt9KSxcbiAgICB9O1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBtdXN0R2V0SXRlbSh3b3JrSXRlbUlkOiBzdHJpbmcpOiBQcm9taXNlPFdvcmtJdGVtUm93PiB7XG4gICAgY29uc3QgYnlJZCA9IGF3YWl0IHRoaXMuZGIuc2VsZWN0KCkuZnJvbSh3b3JrSXRlbXMpLndoZXJlKGVxKHdvcmtJdGVtcy5pZCwgd29ya0l0ZW1JZCkpLmxpbWl0KDEpO1xuICAgIGlmIChieUlkWzBdKSByZXR1cm4gYnlJZFswXTtcbiAgICAvLyBJbXBvcnRlZCBzdG9yaWVzIGFyZSBhZGRyZXNzZWQgYnkgdGhlaXIgZXh0ZXJuYWxLZXkgaGFuZGxlOyBmaXJzdFxuICAgIC8vIHdyaXRlciB3aW5zIFx1MjAxNCB0aGUgZWFybGllc3QtY3JlYXRlZCByb3cgcmVzb2x2ZXMgKGNvbmZvcm1hbmNlIHBpbiBpblxuICAgIC8vIHN0b3JpZXMtaW1wb3J0LnRlc3QudHMsIG1pcnJvcmVkIGZyb20gdGhlIHJlZmVyZW5jZSBleHRlcm5hbEtleUluZGV4KS5cbiAgICBjb25zdCBieUtleSA9IGF3YWl0IHRoaXMuZGJcbiAgICAgIC5zZWxlY3QoKVxuICAgICAgLmZyb20od29ya0l0ZW1zKVxuICAgICAgLndoZXJlKGVxKHdvcmtJdGVtcy5leHRlcm5hbEtleSwgd29ya0l0ZW1JZCkpXG4gICAgICAub3JkZXJCeShhc2Mod29ya0l0ZW1zLnNlcSkpXG4gICAgICAubGltaXQoMSk7XG4gICAgaWYgKGJ5S2V5WzBdKSByZXR1cm4gYnlLZXlbMF07XG4gICAgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoYHVua25vd24gd29yayBpdGVtOiAke3dvcmtJdGVtSWR9YCk7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIGdldEZlYXR1cmVSb3coZmVhdHVyZUlkOiBzdHJpbmcsIHR4OiBRdWVyeWFibGUgPSB0aGlzLmRiKTogUHJvbWlzZTxGZWF0dXJlUm93IHwgbnVsbD4ge1xuICAgIGNvbnN0IHJvd3MgPSBhd2FpdCB0eC5zZWxlY3QoKS5mcm9tKGZlYXR1cmVzKS53aGVyZShlcShmZWF0dXJlcy5pZCwgZmVhdHVyZUlkKSkubGltaXQoMSk7XG4gICAgcmV0dXJuIHJvd3NbMF0gPz8gbnVsbDtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgaGFzUGVybWlzc2lvbihhY3RvcklkOiBzdHJpbmcsIHBlcm1pc3Npb246IFBlcm1pc3Npb24pOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICBjb25zdCByb3dzID0gYXdhaXQgdGhpcy5kYlxuICAgICAgLnNlbGVjdCh7IHBlcm1pc3Npb246IGdyYW50cy5wZXJtaXNzaW9uIH0pXG4gICAgICAuZnJvbShncmFudHMpXG4gICAgICAud2hlcmUoYW5kKGVxKGdyYW50cy5hY3RvcklkLCBhY3RvcklkKSwgZXEoZ3JhbnRzLnBlcm1pc3Npb24sIHBlcm1pc3Npb24pKSlcbiAgICAgIC5saW1pdCgxKTtcbiAgICByZXR1cm4gcm93cy5sZW5ndGggPiAwO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyByZXF1aXJlUGVybWlzc2lvbihhY3RvcklkOiBzdHJpbmcsIHBlcm1pc3Npb246IFBlcm1pc3Npb24pOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBpZiAoIShhd2FpdCB0aGlzLmhhc1Blcm1pc3Npb24oYWN0b3JJZCwgcGVybWlzc2lvbikpKSB7XG4gICAgICB0aHJvdyBuZXcgUGVybWlzc2lvbkRlbmllZEVycm9yKHBlcm1pc3Npb24sIGFjdG9ySWQpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgbGl2ZUNsYWltKHdvcmtJdGVtSWQ6IHN0cmluZyk6IFByb21pc2U8Q2xhaW1Sb3cgfCBudWxsPiB7XG4gICAgY29uc3Qgcm93cyA9IGF3YWl0IHRoaXMuZGJcbiAgICAgIC5zZWxlY3QoKVxuICAgICAgLmZyb20oY2xhaW1zKVxuICAgICAgLndoZXJlKFxuICAgICAgICBhbmQoXG4gICAgICAgICAgZXEoY2xhaW1zLndvcmtJdGVtSWQsIHdvcmtJdGVtSWQpLFxuICAgICAgICAgIGVxKGNsYWltcy5yZWxlYXNlZCwgZmFsc2UpLFxuICAgICAgICAgIGd0KGNsYWltcy5sZWFzZUV4cGlyZXNBdCwgdGhpcy5ub3cpLFxuICAgICAgICApLFxuICAgICAgKVxuICAgICAgLm9yZGVyQnkoYXNjKGNsYWltcy5zZXEpKVxuICAgICAgLmxpbWl0KDEpO1xuICAgIHJldHVybiByb3dzWzBdID8/IG51bGw7XG4gIH1cblxuICAvKipcbiAgICogQSBQUkVTRU5URUQgdG9rZW4gaXMgYWx3YXlzIHZhbGlkYXRlZCwgb24gZXZlcnkgY29tbWFuZCAoY29uZm9ybWFuY2VcbiAgICogcGluLCBjbGFpbXMudGVzdC50cyk6IHN0YWxlL2ZvcmVpZ24vbm8tbGl2ZS1jbGFpbSBcdTIxOTIgQ29uZmxpY3RFcnJvciArIGF1ZGl0XG4gICAqIGV2ZW50LiBUaGUgYXVkaXQgZXZlbnQgY29tbWl0cyBpbiBpdHMgT1dOIHRyYW5zYWN0aW9uIFx1MjAxNCB0aGUgZmFpbGluZ1xuICAgKiBjb21tYW5kJ3MgdHJhbnNhY3Rpb24gKGlmIGFueSkgbXVzdCBub3Qgc3dhbGxvdyBpdC5cbiAgICovXG4gIHByaXZhdGUgYXN5bmMgdmFsaWRhdGVQcmVzZW50ZWRUb2tlbihcbiAgICBpdGVtOiBXb3JrSXRlbVJvdyxcbiAgICBmZW5jaW5nVG9rZW46IG51bWJlciB8IHVuZGVmaW5lZCxcbiAgICBhY3RvcklkOiBzdHJpbmcsXG4gICk6IFByb21pc2U8dm9pZD4ge1xuICAgIGlmIChmZW5jaW5nVG9rZW4gPT09IHVuZGVmaW5lZCkgcmV0dXJuO1xuICAgIGNvbnN0IGxpdmUgPSBhd2FpdCB0aGlzLmxpdmVDbGFpbShpdGVtLmlkKTtcbiAgICBpZiAobGl2ZSA9PT0gbnVsbCB8fCBsaXZlLmZlbmNpbmdUb2tlbiAhPT0gZmVuY2luZ1Rva2VuKSB7XG4gICAgICBhd2FpdCB0aGlzLmRiLnRyYW5zYWN0aW9uKGFzeW5jICh0eCkgPT4ge1xuICAgICAgICBhd2FpdCB0aGlzLmFwcGVuZFR4KHR4LCAnd29ya19pdGVtJywgaXRlbS5pZCwgJ2ZlbmNpbmcucmVqZWN0ZWQnLCBhY3RvcklkLCB7XG4gICAgICAgICAgcHJlc2VudGVkVG9rZW46IGZlbmNpbmdUb2tlbixcbiAgICAgICAgICBsaXZlVG9rZW46IGxpdmU/LmZlbmNpbmdUb2tlbiA/PyBudWxsLFxuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgICAgdGhyb3cgbmV3IENvbmZsaWN0RXJyb3IoYHN0YWxlIG9yIGZvcmVpZ24gZmVuY2luZyB0b2tlbiBmb3Igd29yayBpdGVtICR7aXRlbS5pZH1gKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIHB1YmxpY0l0ZW0ocm93OiBXb3JrSXRlbVJvdyk6IFdvcmtJdGVtIHtcbiAgICByZXR1cm4ge1xuICAgICAgaWQ6IHJvdy5pZCxcbiAgICAgIGZlYXR1cmVJZDogcm93LmZlYXR1cmVJZCxcbiAgICAgIGV4dGVybmFsS2V5OiByb3cuZXh0ZXJuYWxLZXksXG4gICAgICB0aXRsZTogcm93LnRpdGxlLFxuICAgICAgc3RhdGU6IHJvdy5zdGF0ZSBhcyBXb3JrSXRlbVN0YXRlLFxuICAgICAgYmxvY2tlZFJlYXNvbjogKHJvdy5ibG9ja2VkUmVhc29uIGFzIEJsb2NrZWRSZWFzb24gfCBudWxsKSA/PyBudWxsLFxuICAgICAgcmV2aWV3TG9vcEl0ZXJhdGlvbjogcm93LnJldmlld0xvb3BJdGVyYXRpb24sXG4gICAgICBpbnRlbnRIYXNoOiByb3cuaW50ZW50SGFzaCxcbiAgICAgIHBpbm5lZFZlcmlmaWNhdGlvbjogcm93LnBpbm5lZFZlcmlmaWNhdGlvbiA/IFsuLi5yb3cucGlubmVkVmVyaWZpY2F0aW9uXSA6IG51bGwsXG4gICAgICBzcGVjQ2hlY2twb2ludDogcm93LnNwZWNDaGVja3BvaW50LFxuICAgICAgZG9uZUNoZWNrcG9pbnQ6IHJvdy5kb25lQ2hlY2twb2ludCxcbiAgICAgIGludm9rZURldldpdGg6IHJvdy5pbnZva2VEZXZXaXRoLFxuICAgICAgc3BlY1BhdGg6IHJvdy5zcGVjUGF0aCxcbiAgICAgIHN0YXRlVmVyc2lvbjogcm93LnN0YXRlVmVyc2lvbixcbiAgICB9O1xuICB9XG5cbiAgcHJpdmF0ZSBwdWJsaWNGZWF0dXJlKHJvdzogRmVhdHVyZVJvdyk6IEZlYXR1cmUge1xuICAgIHJldHVybiB7XG4gICAgICBpZDogcm93LmlkLFxuICAgICAgc3RhdGU6IHJvdy5zdGF0ZSBhcyBGZWF0dXJlWydzdGF0ZSddLFxuICAgICAgZGlzcGF0Y2hIb2xkOiByb3cuZGlzcGF0Y2hIb2xkLFxuICAgIH07XG4gIH1cblxuICBwcml2YXRlIHB1YmxpY0NsYWltKHJvdzogQ2xhaW1Sb3cpOiBDbGFpbSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGlkOiByb3cuaWQsXG4gICAgICB3b3JrSXRlbUlkOiByb3cud29ya0l0ZW1JZCxcbiAgICAgIGFjdG9ySWQ6IHJvdy5hY3RvcklkLFxuICAgICAgZmVuY2luZ1Rva2VuOiByb3cuZmVuY2luZ1Rva2VuLFxuICAgICAgbGVhc2VFeHBpcmVzQXQ6IHJvdy5sZWFzZUV4cGlyZXNBdCxcbiAgICAgIHJlbGVhc2VkOiByb3cucmVsZWFzZWQsXG4gICAgfTtcbiAgfVxuXG4gIHByaXZhdGUgZXZlbnRGcm9tUm93KHJvdzogRXZlbnRSb3cpOiBTcGluZUV2ZW50IHtcbiAgICByZXR1cm4ge1xuICAgICAgZ2xvYmFsU2VxOiByb3cuZ2xvYmFsU2VxLFxuICAgICAgc3RyZWFtVHlwZTogcm93LnN0cmVhbVR5cGUgYXMgU3BpbmVFdmVudFsnc3RyZWFtVHlwZSddLFxuICAgICAgc3RyZWFtSWQ6IHJvdy5zdHJlYW1JZCxcbiAgICAgIHN0cmVhbVNlcTogcm93LnN0cmVhbVNlcSxcbiAgICAgIHR5cGU6IHJvdy50eXBlLFxuICAgICAgYWN0b3JJZDogcm93LmFjdG9ySWQsXG4gICAgICBwYXlsb2FkOiByb3cucGF5bG9hZCxcbiAgICAgIC4uLihyb3cuY2F1c2F0aW9uSWQgIT09IG51bGwgPyB7IGNhdXNhdGlvbklkOiByb3cuY2F1c2F0aW9uSWQgfSA6IHt9KSxcbiAgICB9O1xuICB9XG5cbiAgLy8gLS0gc2V0dXAgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICBhc3luYyBjcmVhdGVBY3RvcihpbnB1dDogeyB0eXBlOiBFeGNsdWRlPEFjdG9yVHlwZSwgJ3N5c3RlbSc+OyBkaXNwbGF5TmFtZTogc3RyaW5nIH0pOiBQcm9taXNlPEFjdG9yPiB7XG4gICAgY29uc3QgYWN0b3I6IEFjdG9yID0geyBpZDogdGhpcy5uZXh0SWQoJ2FjdG9yJyksIHR5cGU6IGlucHV0LnR5cGUsIGRpc3BsYXlOYW1lOiBpbnB1dC5kaXNwbGF5TmFtZSB9O1xuICAgIGF3YWl0IHRoaXMuZGIuaW5zZXJ0KGFjdG9ycykudmFsdWVzKHsgaWQ6IGFjdG9yLmlkLCB0eXBlOiBhY3Rvci50eXBlLCBkaXNwbGF5TmFtZTogYWN0b3IuZGlzcGxheU5hbWUgfSk7XG4gICAgcmV0dXJuIGFjdG9yO1xuICB9XG5cbiAgYXN5bmMgZ3JhbnQoaW5wdXQ6IHsgYWN0b3JJZDogc3RyaW5nOyBwZXJtaXNzaW9uOiBQZXJtaXNzaW9uOyBzY29wZT86IHN0cmluZyB9KTogUHJvbWlzZTx2b2lkPiB7XG4gICAgYXdhaXQgdGhpcy5kYlxuICAgICAgLmluc2VydChncmFudHMpXG4gICAgICAudmFsdWVzKHsgYWN0b3JJZDogaW5wdXQuYWN0b3JJZCwgcGVybWlzc2lvbjogaW5wdXQucGVybWlzc2lvbiwgc2NvcGU6IGlucHV0LnNjb3BlID8/IG51bGwgfSlcbiAgICAgIC5vbkNvbmZsaWN0RG9Ob3RoaW5nKCk7XG4gIH1cblxuICBhc3luYyByZXZva2UoaW5wdXQ6IHsgYWN0b3JJZDogc3RyaW5nOyBwZXJtaXNzaW9uOiBQZXJtaXNzaW9uOyBzY29wZT86IHN0cmluZyB9KTogUHJvbWlzZTx2b2lkPiB7XG4gICAgYXdhaXQgdGhpcy5kYlxuICAgICAgLmRlbGV0ZShncmFudHMpXG4gICAgICAud2hlcmUoYW5kKGVxKGdyYW50cy5hY3RvcklkLCBpbnB1dC5hY3RvcklkKSwgZXEoZ3JhbnRzLnBlcm1pc3Npb24sIGlucHV0LnBlcm1pc3Npb24pKSk7XG4gIH1cblxuICBhc3luYyBjcmVhdGVGZWF0dXJlKGlucHV0OiB7IGFjdG9ySWQ6IHN0cmluZyB9KTogUHJvbWlzZTxGZWF0dXJlPiB7XG4gICAgY29uc3QgaWQgPSB0aGlzLm5leHRJZCgnZmVhdCcpO1xuICAgIHJldHVybiB0aGlzLmRiLnRyYW5zYWN0aW9uKGFzeW5jICh0eCkgPT4ge1xuICAgICAgYXdhaXQgdHguaW5zZXJ0KGZlYXR1cmVzKS52YWx1ZXMoeyBpZCwgc3RhdGU6ICdiYWNrbG9nJywgZGlzcGF0Y2hIb2xkOiBmYWxzZSB9KTtcbiAgICAgIGF3YWl0IHRoaXMuYXBwZW5kVHgodHgsICdmZWF0dXJlJywgaWQsICdmZWF0dXJlLmNyZWF0ZWQnLCBpbnB1dC5hY3RvcklkLCB7fSk7XG4gICAgICByZXR1cm4geyBpZCwgc3RhdGU6ICdiYWNrbG9nJyBhcyBjb25zdCwgZGlzcGF0Y2hIb2xkOiBmYWxzZSB9O1xuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBjcmVhdGVXb3JrSXRlbVR4KHR4OiBRdWVyeWFibGUsIGlucHV0OiBDcmVhdGVXb3JrSXRlbUlucHV0ICYgeyBhY3RvcklkOiBzdHJpbmcgfSk6IFByb21pc2U8V29ya0l0ZW0+IHtcbiAgICBjb25zdCBzbHVnID0gaW5wdXQudGl0bGVcbiAgICAgIC50b0xvd2VyQ2FzZSgpXG4gICAgICAucmVwbGFjZSgvW15hLXowLTldKy9nLCAnLScpXG4gICAgICAucmVwbGFjZSgvKF4tfC0kKS9nLCAnJyk7XG4gICAgY29uc3Qgcm93OiBXb3JrSXRlbVJvdyA9IHtcbiAgICAgIGlkOiB0aGlzLm5leHRJZCgnd2knKSxcbiAgICAgIHNlcTogMCwgLy8gYXNzaWduZWQgYnkgdGhlIHNlcmlhbDsgcGxhY2Vob2xkZXIgZm9yIHRoZSBsb2NhbCBjb3B5IG9ubHlcbiAgICAgIGZlYXR1cmVJZDogaW5wdXQuZmVhdHVyZUlkLFxuICAgICAgZXh0ZXJuYWxLZXk6IGlucHV0LmV4dGVybmFsS2V5LFxuICAgICAgdGl0bGU6IGlucHV0LnRpdGxlLFxuICAgICAgc3RhdGU6ICdiYWNrbG9nJyxcbiAgICAgIGJsb2NrZWRSZWFzb246IG51bGwsXG4gICAgICByZXZpZXdMb29wSXRlcmF0aW9uOiAwLFxuICAgICAgaW50ZW50SGFzaDogbnVsbCxcbiAgICAgIHBpbm5lZFZlcmlmaWNhdGlvbjogbnVsbCxcbiAgICAgIHNwZWNDaGVja3BvaW50OiBpbnB1dC5zcGVjQ2hlY2twb2ludCA/PyBmYWxzZSxcbiAgICAgIGRvbmVDaGVja3BvaW50OiBpbnB1dC5kb25lQ2hlY2twb2ludCA/PyBmYWxzZSxcbiAgICAgIGludm9rZURldldpdGg6IGlucHV0Lmludm9rZURldldpdGggPz8gJycsXG4gICAgICBzcGVjUGF0aDogYHN0b3JpZXMvJHtpbnB1dC5leHRlcm5hbEtleX0tJHtzbHVnfS5tZGAsXG4gICAgICBzdGF0ZVZlcnNpb246IDAsXG4gICAgICBkZXBlbmRzT246IGlucHV0LmRlcGVuZHNPbiA/IFsuLi5pbnB1dC5kZXBlbmRzT25dIDogW10sXG4gICAgICBsYXN0RmVuY2luZ1Rva2VuOiAwLFxuICAgIH07XG4gICAgYXdhaXQgdHguaW5zZXJ0KHdvcmtJdGVtcykudmFsdWVzKHtcbiAgICAgIGlkOiByb3cuaWQsXG4gICAgICBmZWF0dXJlSWQ6IHJvdy5mZWF0dXJlSWQsXG4gICAgICBleHRlcm5hbEtleTogcm93LmV4dGVybmFsS2V5LFxuICAgICAgdGl0bGU6IHJvdy50aXRsZSxcbiAgICAgIHN0YXRlOiByb3cuc3RhdGUsXG4gICAgICBibG9ja2VkUmVhc29uOiByb3cuYmxvY2tlZFJlYXNvbixcbiAgICAgIHJldmlld0xvb3BJdGVyYXRpb246IHJvdy5yZXZpZXdMb29wSXRlcmF0aW9uLFxuICAgICAgaW50ZW50SGFzaDogcm93LmludGVudEhhc2gsXG4gICAgICBwaW5uZWRWZXJpZmljYXRpb246IHJvdy5waW5uZWRWZXJpZmljYXRpb24sXG4gICAgICBzcGVjQ2hlY2twb2ludDogcm93LnNwZWNDaGVja3BvaW50LFxuICAgICAgZG9uZUNoZWNrcG9pbnQ6IHJvdy5kb25lQ2hlY2twb2ludCxcbiAgICAgIGludm9rZURldldpdGg6IHJvdy5pbnZva2VEZXZXaXRoLFxuICAgICAgc3BlY1BhdGg6IHJvdy5zcGVjUGF0aCxcbiAgICAgIHN0YXRlVmVyc2lvbjogcm93LnN0YXRlVmVyc2lvbixcbiAgICAgIGRlcGVuZHNPbjogcm93LmRlcGVuZHNPbixcbiAgICAgIGxhc3RGZW5jaW5nVG9rZW46IHJvdy5sYXN0RmVuY2luZ1Rva2VuLFxuICAgIH0pO1xuICAgIGF3YWl0IHRoaXMuYXBwZW5kVHgodHgsICd3b3JrX2l0ZW0nLCByb3cuaWQsICd3b3JrX2l0ZW0uY3JlYXRlZCcsIGlucHV0LmFjdG9ySWQsIHtcbiAgICAgIGV4dGVybmFsS2V5OiByb3cuZXh0ZXJuYWxLZXksXG4gICAgICBmZWF0dXJlSWQ6IHJvdy5mZWF0dXJlSWQsXG4gICAgfSk7XG4gICAgcmV0dXJuIHRoaXMucHVibGljSXRlbShyb3cpO1xuICB9XG5cbiAgYXN5bmMgY3JlYXRlV29ya0l0ZW0oaW5wdXQ6IENyZWF0ZVdvcmtJdGVtSW5wdXQgJiB7IGFjdG9ySWQ6IHN0cmluZyB9KTogUHJvbWlzZTxXb3JrSXRlbT4ge1xuICAgIHJldHVybiB0aGlzLmRiLnRyYW5zYWN0aW9uKGFzeW5jICh0eCkgPT4gdGhpcy5jcmVhdGVXb3JrSXRlbVR4KHR4LCBpbnB1dCkpO1xuICB9XG5cbiAgYXN5bmMgaW1wb3J0U3RvcmllcyhpbnB1dDogeyBmZWF0dXJlSWQ6IHN0cmluZzsgeWFtbDogc3RyaW5nOyBhY3RvcklkOiBzdHJpbmcgfSk6IFByb21pc2U8U3Rvcmllc0ltcG9ydFJlc3VsdD4ge1xuICAgIGNvbnN0IGVudHJpZXMgPSBwYXJzZVN0b3JpZXMoaW5wdXQueWFtbCk7XG4gICAgY29uc3QgZmVhdHVyZSA9IGF3YWl0IHRoaXMuZ2V0RmVhdHVyZVJvdyhpbnB1dC5mZWF0dXJlSWQpO1xuICAgIGlmICghZmVhdHVyZSkge1xuICAgICAgdGhyb3cgbmV3IFN0b3JpZXNWYWxpZGF0aW9uRXJyb3IoYHVua25vd24gZmVhdHVyZTogJHtpbnB1dC5mZWF0dXJlSWR9YCk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmRiLnRyYW5zYWN0aW9uKGFzeW5jICh0eCkgPT4ge1xuICAgICAgY29uc3QgaW1wb3J0ZWQ6IHN0cmluZ1tdID0gW107XG4gICAgICBjb25zdCB1cGRhdGVkOiBzdHJpbmdbXSA9IFtdO1xuICAgICAgY29uc3Qgd2FybmluZ3M6IHN0cmluZ1tdID0gW107XG4gICAgICBmb3IgKGNvbnN0IGVudHJ5IG9mIGVudHJpZXMpIHtcbiAgICAgICAgY29uc3QgZXhpc3RpbmcgPSAoXG4gICAgICAgICAgYXdhaXQgdHhcbiAgICAgICAgICAgIC5zZWxlY3QoKVxuICAgICAgICAgICAgLmZyb20od29ya0l0ZW1zKVxuICAgICAgICAgICAgLndoZXJlKGFuZChlcSh3b3JrSXRlbXMuZmVhdHVyZUlkLCBpbnB1dC5mZWF0dXJlSWQpLCBlcSh3b3JrSXRlbXMuZXh0ZXJuYWxLZXksIGVudHJ5LmlkKSkpXG4gICAgICAgICAgICAub3JkZXJCeShhc2Mod29ya0l0ZW1zLnNlcSkpXG4gICAgICAgICAgICAubGltaXQoMSlcbiAgICAgICAgKVswXTtcbiAgICAgICAgaWYgKGV4aXN0aW5nKSB7XG4gICAgICAgICAgLy8gUmUtaW1wb3J0IHJlZnJlc2hlcyBkZXNjcmlwdGl2ZSBmaWVsZHM7IGxpZmVjeWNsZSBzdGF0ZSBpcyBuZXZlclxuICAgICAgICAgIC8vIHRvdWNoZWQgKHN0b3JpZXMueWFtbCBjYXJyaWVzIG5vIHN0YXR1cyBcdTIwMTQgRDksIHZhbGlkaXR5IHJ1bGUgMykuXG4gICAgICAgICAgYXdhaXQgdHhcbiAgICAgICAgICAgIC51cGRhdGUod29ya0l0ZW1zKVxuICAgICAgICAgICAgLnNldCh7XG4gICAgICAgICAgICAgIHRpdGxlOiBlbnRyeS50aXRsZSxcbiAgICAgICAgICAgICAgc3BlY0NoZWNrcG9pbnQ6IGVudHJ5LnNwZWNDaGVja3BvaW50LFxuICAgICAgICAgICAgICBkb25lQ2hlY2twb2ludDogZW50cnkuZG9uZUNoZWNrcG9pbnQsXG4gICAgICAgICAgICAgIGludm9rZURldldpdGg6IGVudHJ5Lmludm9rZURldldpdGgsXG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLndoZXJlKGVxKHdvcmtJdGVtcy5pZCwgZXhpc3RpbmcuaWQpKTtcbiAgICAgICAgICBhd2FpdCB0aGlzLmFwcGVuZFR4KHR4LCAnd29ya19pdGVtJywgZXhpc3RpbmcuaWQsICd3b3JrX2l0ZW0ucmVpbXBvcnRlZCcsIGlucHV0LmFjdG9ySWQsIHtcbiAgICAgICAgICAgIGV4dGVybmFsS2V5OiBlbnRyeS5pZCxcbiAgICAgICAgICB9KTtcbiAgICAgICAgICB1cGRhdGVkLnB1c2goZW50cnkuaWQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGF3YWl0IHRoaXMuY3JlYXRlV29ya0l0ZW1UeCh0eCwge1xuICAgICAgICAgICAgZmVhdHVyZUlkOiBpbnB1dC5mZWF0dXJlSWQsXG4gICAgICAgICAgICBleHRlcm5hbEtleTogZW50cnkuaWQsXG4gICAgICAgICAgICB0aXRsZTogZW50cnkudGl0bGUsXG4gICAgICAgICAgICBzcGVjQ2hlY2twb2ludDogZW50cnkuc3BlY0NoZWNrcG9pbnQsXG4gICAgICAgICAgICBkb25lQ2hlY2twb2ludDogZW50cnkuZG9uZUNoZWNrcG9pbnQsXG4gICAgICAgICAgICBpbnZva2VEZXZXaXRoOiBlbnRyeS5pbnZva2VEZXZXaXRoLFxuICAgICAgICAgICAgYWN0b3JJZDogaW5wdXQuYWN0b3JJZCxcbiAgICAgICAgICB9KTtcbiAgICAgICAgICBpbXBvcnRlZC5wdXNoKGVudHJ5LmlkKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIHsgaW1wb3J0ZWQsIHVwZGF0ZWQsIHdhcm5pbmdzIH07XG4gICAgfSk7XG4gIH1cblxuICAvLyAtLSBjbGFpbXMgKHJvYWRtYXAgXHUwMEE3MS4zKSAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICBhc3luYyBjbGFpbVRhc2soaW5wdXQ6IHsgd29ya0l0ZW1JZDogc3RyaW5nOyBhY3RvcklkOiBzdHJpbmc7IHR0bE1zPzogbnVtYmVyIH0pOiBQcm9taXNlPENsYWltPiB7XG4gICAgY29uc3QgaXRlbSA9IGF3YWl0IHRoaXMubXVzdEdldEl0ZW0oaW5wdXQud29ya0l0ZW1JZCk7XG4gICAgYXdhaXQgdGhpcy5yZXF1aXJlUGVybWlzc2lvbihpbnB1dC5hY3RvcklkLCAndGFzay5jbGFpbScpO1xuICAgIGNvbnN0IHR0bE1zID0gaW5wdXQudHRsTXMgPz8gMTUgKiA2MCAqIDEwMDA7XG4gICAgY29uc3QgY2xhaW1JZCA9IHRoaXMubmV4dElkKCdjbGFpbScpO1xuICAgIHRyeSB7XG4gICAgICByZXR1cm4gYXdhaXQgdGhpcy5kYi50cmFuc2FjdGlvbihhc3luYyAodHgpID0+IHtcbiAgICAgICAgLy8gU3dlZXA6IGFuIEVYUElSRUQgbGVhc2UgcmV0dXJucyB0aGUgaXRlbSB0byB0aGUgcG9vbCBcdTIwMTQgZmxpcCBpdHNcbiAgICAgICAgLy8gcmVsZWFzZWQgZmxhZyBzbyB0aGUgcGFydGlhbCB1bmlxdWUgaW5kZXggb25seSBndWFyZHMgbGl2ZSBjbGFpbXMuXG4gICAgICAgIGF3YWl0IHR4XG4gICAgICAgICAgLnVwZGF0ZShjbGFpbXMpXG4gICAgICAgICAgLnNldCh7IHJlbGVhc2VkOiB0cnVlIH0pXG4gICAgICAgICAgLndoZXJlKFxuICAgICAgICAgICAgYW5kKFxuICAgICAgICAgICAgICBlcShjbGFpbXMud29ya0l0ZW1JZCwgaXRlbS5pZCksXG4gICAgICAgICAgICAgIGVxKGNsYWltcy5yZWxlYXNlZCwgZmFsc2UpLFxuICAgICAgICAgICAgICBsdGUoY2xhaW1zLmxlYXNlRXhwaXJlc0F0LCB0aGlzLm5vdyksXG4gICAgICAgICAgICApLFxuICAgICAgICAgICk7XG4gICAgICAgIC8vIE1vbm90b25pYyBmZW5jaW5nIHRva2VuIHBlciB3b3JrIGl0ZW0sIGNvbnN1bWVkIG9ubHkgb24gc3VjY2Vzc1xuICAgICAgICAvLyAodGhlIHRyYW5zYWN0aW9uIHJvbGxzIHRoZSBjb3VudGVyIGJhY2sgd2hlbiB0aGUgaW5zZXJ0IGxvc2VzKS5cbiAgICAgICAgY29uc3QgY291bnRlclJvdyA9IChcbiAgICAgICAgICBhd2FpdCB0eFxuICAgICAgICAgICAgLnNlbGVjdCh7IGxhc3RGZW5jaW5nVG9rZW46IHdvcmtJdGVtcy5sYXN0RmVuY2luZ1Rva2VuIH0pXG4gICAgICAgICAgICAuZnJvbSh3b3JrSXRlbXMpXG4gICAgICAgICAgICAud2hlcmUoZXEod29ya0l0ZW1zLmlkLCBpdGVtLmlkKSlcbiAgICAgICAgICAgIC5saW1pdCgxKVxuICAgICAgICApWzBdO1xuICAgICAgICBjb25zdCB0b2tlbiA9IChjb3VudGVyUm93Py5sYXN0RmVuY2luZ1Rva2VuID8/IDApICsgMTtcbiAgICAgICAgYXdhaXQgdHgudXBkYXRlKHdvcmtJdGVtcykuc2V0KHsgbGFzdEZlbmNpbmdUb2tlbjogdG9rZW4gfSkud2hlcmUoZXEod29ya0l0ZW1zLmlkLCBpdGVtLmlkKSk7XG4gICAgICAgIC8vIFRoZSBwYXJ0aWFsIHVuaXF1ZSBpbmRleCBjbGFpbXNfb25lX2xpdmVfcGVyX2l0ZW0gZGVjaWRlcyB0aGUgcmFjZTpcbiAgICAgICAgLy8gYSBsaXZlIGNsYWltIG1ha2VzIHRoaXMgSU5TRVJUIGZhaWwgXHUyMDE0IHRoZSBsb3NlciBsZWF2ZXMgbm8gcm93LlxuICAgICAgICBhd2FpdCB0eC5pbnNlcnQoY2xhaW1zKS52YWx1ZXMoe1xuICAgICAgICAgIGlkOiBjbGFpbUlkLFxuICAgICAgICAgIHdvcmtJdGVtSWQ6IGl0ZW0uaWQsXG4gICAgICAgICAgYWN0b3JJZDogaW5wdXQuYWN0b3JJZCxcbiAgICAgICAgICBmZW5jaW5nVG9rZW46IHRva2VuLFxuICAgICAgICAgIGxlYXNlRXhwaXJlc0F0OiB0aGlzLm5vdyArIHR0bE1zLFxuICAgICAgICAgIHJlbGVhc2VkOiBmYWxzZSxcbiAgICAgICAgICB0dGxNcyxcbiAgICAgICAgfSk7XG4gICAgICAgIGF3YWl0IHRoaXMuYXBwZW5kVHgodHgsICd3b3JrX2l0ZW0nLCBpdGVtLmlkLCAnd29ya19pdGVtLmNsYWltZWQnLCBpbnB1dC5hY3RvcklkLCB7XG4gICAgICAgICAgY2xhaW1JZCxcbiAgICAgICAgICBmZW5jaW5nVG9rZW46IHRva2VuLFxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBpZDogY2xhaW1JZCxcbiAgICAgICAgICB3b3JrSXRlbUlkOiBpdGVtLmlkLFxuICAgICAgICAgIGFjdG9ySWQ6IGlucHV0LmFjdG9ySWQsXG4gICAgICAgICAgZmVuY2luZ1Rva2VuOiB0b2tlbixcbiAgICAgICAgICBsZWFzZUV4cGlyZXNBdDogdGhpcy5ub3cgKyB0dGxNcyxcbiAgICAgICAgICByZWxlYXNlZDogZmFsc2UsXG4gICAgICAgIH07XG4gICAgICB9KTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgaWYgKGlzVW5pcXVlVmlvbGF0aW9uKGVycm9yKSkge1xuICAgICAgICB0aHJvdyBuZXcgQ29uZmxpY3RFcnJvcihgd29yayBpdGVtICR7aXRlbS5pZH0gYWxyZWFkeSBoYXMgYSBsaXZlIGNsYWltYCk7XG4gICAgICB9XG4gICAgICB0aHJvdyBlcnJvcjtcbiAgICB9XG4gIH1cblxuICBhc3luYyBoZWFydGJlYXQoaW5wdXQ6IHsgY2xhaW1JZDogc3RyaW5nIH0pOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCByb3cgPSAoYXdhaXQgdGhpcy5kYi5zZWxlY3QoKS5mcm9tKGNsYWltcykud2hlcmUoZXEoY2xhaW1zLmlkLCBpbnB1dC5jbGFpbUlkKSkubGltaXQoMSkpWzBdO1xuICAgIGlmICghcm93IHx8IHJvdy5yZWxlYXNlZCB8fCByb3cubGVhc2VFeHBpcmVzQXQgPD0gdGhpcy5ub3cpIHtcbiAgICAgIHRocm93IG5ldyBDb25mbGljdEVycm9yKGBjbGFpbSAke2lucHV0LmNsYWltSWR9IGlzIG5vdCBsaXZlYCk7XG4gICAgfVxuICAgIC8vIEhlYXJ0YmVhdCByZW5ld3MgdGhlIEZVTEwgb3JpZ2luYWwgVFRMIGZyb20gdGhlIGhlYXJ0YmVhdCBtb21lbnQuXG4gICAgYXdhaXQgdGhpcy5kYlxuICAgICAgLnVwZGF0ZShjbGFpbXMpXG4gICAgICAuc2V0KHsgbGVhc2VFeHBpcmVzQXQ6IHRoaXMubm93ICsgcm93LnR0bE1zIH0pXG4gICAgICAud2hlcmUoZXEoY2xhaW1zLmlkLCByb3cuaWQpKTtcbiAgfVxuXG4gIGFzeW5jIHJlbGVhc2VDbGFpbShpbnB1dDogeyBjbGFpbUlkOiBzdHJpbmc7IHJlYXNvbj86IHN0cmluZyB9KTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3Qgcm93ID0gKGF3YWl0IHRoaXMuZGIuc2VsZWN0KCkuZnJvbShjbGFpbXMpLndoZXJlKGVxKGNsYWltcy5pZCwgaW5wdXQuY2xhaW1JZCkpLmxpbWl0KDEpKVswXTtcbiAgICBpZiAoIXJvdyB8fCByb3cucmVsZWFzZWQpIHJldHVybjtcbiAgICBhd2FpdCB0aGlzLmRiLnRyYW5zYWN0aW9uKGFzeW5jICh0eCkgPT4ge1xuICAgICAgYXdhaXQgdHgudXBkYXRlKGNsYWltcykuc2V0KHsgcmVsZWFzZWQ6IHRydWUgfSkud2hlcmUoZXEoY2xhaW1zLmlkLCByb3cuaWQpKTtcbiAgICAgIGF3YWl0IHRoaXMuYXBwZW5kVHgodHgsICd3b3JrX2l0ZW0nLCByb3cud29ya0l0ZW1JZCwgJ2NsYWltLnJlbGVhc2VkJywgcm93LmFjdG9ySWQsIHtcbiAgICAgICAgY2xhaW1JZDogcm93LmlkLFxuICAgICAgICByZWFzb246IGlucHV0LnJlYXNvbiA/PyBudWxsLFxuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICBhZHZhbmNlQ2xvY2sobXM6IG51bWJlcik6IHZvaWQge1xuICAgIHRoaXMubm93ICs9IG1zO1xuICB9XG5cbiAgLy8gLS0gbGlmZWN5Y2xlIChyb2FkbWFwIFx1MDBBNzEuMikgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICBhc3luYyBhZHZhbmNlU3RhdGUoaW5wdXQ6IEFkdmFuY2VJbnB1dCk6IFByb21pc2U8V29ya0l0ZW0+IHtcbiAgICBjb25zdCBpdGVtID0gYXdhaXQgdGhpcy5tdXN0R2V0SXRlbShpbnB1dC53b3JrSXRlbUlkKTtcblxuICAgIC8vIEtleWVkIHJlcGxheTogdGhlIHNhbWUgY29tbWFuZCByZXR1cm5zIHRoZSBzYW1lIHJlc3VsdCwgYXBwZW5kcyBub3RoaW5nLlxuICAgIGlmIChpbnB1dC5pZGVtcG90ZW5jeUtleSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBjb25zdCBjYWNoZWQgPSAoXG4gICAgICAgIGF3YWl0IHRoaXMuZGJcbiAgICAgICAgICAuc2VsZWN0KClcbiAgICAgICAgICAuZnJvbShpZGVtcG90ZW5jeUtleXMpXG4gICAgICAgICAgLndoZXJlKGVxKGlkZW1wb3RlbmN5S2V5cy5rZXksIGlucHV0LmlkZW1wb3RlbmN5S2V5KSlcbiAgICAgICAgICAubGltaXQoMSlcbiAgICAgIClbMF07XG4gICAgICBpZiAoY2FjaGVkKSByZXR1cm4geyAuLi4oY2FjaGVkLnJlc3VsdCBhcyB1bmtub3duIGFzIFdvcmtJdGVtKSB9O1xuICAgIH1cblxuICAgIC8vIFByZXNlcnZhdGlvbiBuby1vcCAoc3ByaW50LXBsYW5uaW5nIGlkZW1wb3RlbmN5IHJ1bGUpOiBhbiBVTktFWUVEXG4gICAgLy8gcmUtcmVxdWVzdCBvZiB0aGUgY3VycmVudCBzdGF0ZSBzdWNjZWVkcyB3aXRob3V0IGFuIGV2ZW50LlxuICAgIGlmIChpbnB1dC5pZGVtcG90ZW5jeUtleSA9PT0gdW5kZWZpbmVkICYmIGlucHV0LnRvID09PSBpdGVtLnN0YXRlKSB7XG4gICAgICBhd2FpdCB0aGlzLnZhbGlkYXRlUHJlc2VudGVkVG9rZW4oaXRlbSwgaW5wdXQuZmVuY2luZ1Rva2VuLCBpbnB1dC5hY3RvcklkKTtcbiAgICAgIHJldHVybiB0aGlzLnB1YmxpY0l0ZW0oaXRlbSk7XG4gICAgfVxuXG4gICAgLy8gVHJhbnNpdGlvbi10YWJsZSBsb29rdXAgcHJlY2VkZXMgY2xhaW0vdG9rZW4vcGVybWlzc2lvbiBjaGVja3NcbiAgICAvLyAoZnNtLXRyYW5zaXRpb25zIHBpbikuXG4gICAgY29uc3QgcnVsZSA9IFRSQU5TSVRJT05TLmZpbmQoKHQpID0+IHQuZnJvbSA9PT0gaXRlbS5zdGF0ZSAmJiB0LnRvID09PSBpbnB1dC50byk7XG4gICAgaWYgKCFydWxlKSB7XG4gICAgICBpZiAoXG4gICAgICAgIFJBTktbaW5wdXQudG9dIDwgUkFOS1tpdGVtLnN0YXRlIGFzIFdvcmtJdGVtU3RhdGVdICYmXG4gICAgICAgIChhd2FpdCB0aGlzLmhhc1Blcm1pc3Npb24oaW5wdXQuYWN0b3JJZCwgJ3N0YXRlLmRvd25ncmFkZScpKVxuICAgICAgKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnByaXZpbGVnZWREb3duZ3JhZGUoaXRlbSwgaW5wdXQpO1xuICAgICAgfVxuICAgICAgdGhyb3cgbmV3IEludmFsaWRUcmFuc2l0aW9uRXJyb3IoaXRlbS5zdGF0ZSBhcyBXb3JrSXRlbVN0YXRlLCBpbnB1dC50byk7XG4gICAgfVxuXG4gICAgYXdhaXQgdGhpcy52YWxpZGF0ZVByZXNlbnRlZFRva2VuKGl0ZW0sIGlucHV0LmZlbmNpbmdUb2tlbiwgaW5wdXQuYWN0b3JJZCk7XG5cbiAgICAvLyBCbG9ja2VkIG92ZXJsYXkgZnJlZXplcyB0cmFuc2l0aW9ucyBhdCBldmVyeSBzdGF0ZSAoRDgsIFx1MDBBNzEuMSkuXG4gICAgaWYgKGl0ZW0uYmxvY2tlZFJlYXNvbiAhPT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoYHdvcmsgaXRlbSBpcyBibG9ja2VkOiAke2l0ZW0uYmxvY2tlZFJlYXNvbn1gKTtcbiAgICB9XG5cbiAgICBhd2FpdCB0aGlzLnJlcXVpcmVQZXJtaXNzaW9uKGlucHV0LmFjdG9ySWQsIHJ1bGUucGVybWlzc2lvbik7XG5cbiAgICBpZiAocnVsZS5jbGFpbVJlcXVpcmVkICYmIGlucHV0LmZlbmNpbmdUb2tlbiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAvLyBFeGVjdXRpb24tem9uZSB0cmFuc2l0aW9ucyBkZW1hbmQgYSBQUkVTRU5URUQgbGl2ZSB0b2tlbi5cbiAgICAgIHRocm93IG5ldyBHdWFyZEZhaWxlZEVycm9yKCdjbGFpbSBmZW5jaW5nIHRva2VuIHJlcXVpcmVkIGZvciB0aGlzIHRyYW5zaXRpb24nKTtcbiAgICB9XG5cbiAgICBmb3IgKGNvbnN0IGd1YXJkIG9mIHJ1bGUuZ3VhcmRzKSB7XG4gICAgICBhd2FpdCB0aGlzLmNoZWNrR3VhcmQoZ3VhcmQsIGl0ZW0pO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLmRiLnRyYW5zYWN0aW9uKGFzeW5jICh0eCkgPT5cbiAgICAgIHRoaXMuZXhlY3V0ZVRyYW5zaXRpb25UeCh0eCwgaXRlbSwgaW5wdXQudG8sIGlucHV0LmFjdG9ySWQsIGlucHV0LmlkZW1wb3RlbmN5S2V5KSxcbiAgICApO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBjaGVja0d1YXJkKGd1YXJkOiBUcmFuc2l0aW9uUnVsZVsnZ3VhcmRzJ11bbnVtYmVyXSwgaXRlbTogV29ya0l0ZW1Sb3cpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBzd2l0Y2ggKGd1YXJkKSB7XG4gICAgICBjYXNlICdkZXBzX2RvbmUnOiB7XG4gICAgICAgIGZvciAoY29uc3QgZGVwS2V5IG9mIGl0ZW0uZGVwZW5kc09uKSB7XG4gICAgICAgICAgY29uc3QgZGVwID0gKFxuICAgICAgICAgICAgYXdhaXQgdGhpcy5kYlxuICAgICAgICAgICAgICAuc2VsZWN0KClcbiAgICAgICAgICAgICAgLmZyb20od29ya0l0ZW1zKVxuICAgICAgICAgICAgICAud2hlcmUoYW5kKGVxKHdvcmtJdGVtcy5mZWF0dXJlSWQsIGl0ZW0uZmVhdHVyZUlkKSwgZXEod29ya0l0ZW1zLmV4dGVybmFsS2V5LCBkZXBLZXkpKSlcbiAgICAgICAgICAgICAgLm9yZGVyQnkoYXNjKHdvcmtJdGVtcy5zZXEpKVxuICAgICAgICAgICAgICAubGltaXQoMSlcbiAgICAgICAgICApWzBdO1xuICAgICAgICAgIGlmIChkZXAgJiYgZGVwLnN0YXRlICE9PSAnZG9uZScpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBHdWFyZEZhaWxlZEVycm9yKGBkZXBlbmRlbmN5ICR7ZGVwS2V5fSBpcyBub3QgZG9uZWApO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBjYXNlICdzcGVjX2dhdGVfaWZfY2hlY2twb2ludCc6IHtcbiAgICAgICAgaWYgKCFpdGVtLnNwZWNDaGVja3BvaW50KSByZXR1cm47XG4gICAgICAgIGNvbnN0IGFwcHJvdmVkID0gKFxuICAgICAgICAgIGF3YWl0IHRoaXMuZGJcbiAgICAgICAgICAgIC5zZWxlY3QoeyBzZXE6IGdhdGVEZWNpc2lvbnMuc2VxIH0pXG4gICAgICAgICAgICAuZnJvbShnYXRlRGVjaXNpb25zKVxuICAgICAgICAgICAgLndoZXJlKFxuICAgICAgICAgICAgICBhbmQoXG4gICAgICAgICAgICAgICAgZXEoZ2F0ZURlY2lzaW9ucy53b3JrSXRlbUlkLCBpdGVtLmlkKSxcbiAgICAgICAgICAgICAgICBlcShnYXRlRGVjaXNpb25zLmdhdGUsICdzcGVjX2FwcHJvdmFsJyksXG4gICAgICAgICAgICAgICAgZXEoZ2F0ZURlY2lzaW9ucy5kZWNpc2lvbiwgJ2FwcHJvdmVkJyksXG4gICAgICAgICAgICAgICksXG4gICAgICAgICAgICApXG4gICAgICAgICAgICAubGltaXQoMSlcbiAgICAgICAgKVswXTtcbiAgICAgICAgaWYgKCFhcHByb3ZlZCkge1xuICAgICAgICAgIHRocm93IG5ldyBHdWFyZEZhaWxlZEVycm9yKCdzcGVjX2NoZWNrcG9pbnQgcmVxdWlyZXMgYW4gYXBwcm92ZWQgc3BlY19hcHByb3ZhbCBnYXRlIGRlY2lzaW9uJyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgY2FzZSAnbm9uZW1wdHlfZGlmZic6IHtcbiAgICAgICAgLy8gVGhlIExBVEVTVCBzdWJtaXR0ZWQgZ2l0X2RpZmYsIGlmIGFueSwgbXVzdCBiZSBub24tZW1wdHkgXHUyMDE0IHRoZVxuICAgICAgICAvLyBmYWtlLWRvbmUgZGVueS4gQWJzZW5jZSBpcyBub3QgY2hlY2tlZCBoZXJlIChDT05GT1JNQU5DRS5tZCBwaW4pLlxuICAgICAgICBjb25zdCByb3dzID0gYXdhaXQgdGhpcy5kYlxuICAgICAgICAgIC5zZWxlY3QoKVxuICAgICAgICAgIC5mcm9tKGV2aWRlbmNlVGFibGUpXG4gICAgICAgICAgLndoZXJlKGFuZChlcShldmlkZW5jZVRhYmxlLndvcmtJdGVtSWQsIGl0ZW0uaWQpLCBlcShldmlkZW5jZVRhYmxlLmtpbmQsICdnaXRfZGlmZicpKSlcbiAgICAgICAgICAub3JkZXJCeShhc2MoZXZpZGVuY2VUYWJsZS5zZXEpKTtcbiAgICAgICAgY29uc3QgbGF0ZXN0ID0gcm93c1tyb3dzLmxlbmd0aCAtIDFdO1xuICAgICAgICBpZiAobGF0ZXN0ICYmIGxhdGVzdC5wYXlsb2FkWydub25FbXB0eSddICE9PSB0cnVlKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoJ3RoZSBsYXRlc3QgZ2l0X2RpZmYgZXZpZGVuY2UgaXMgZW1wdHkgXHUyMDE0IG5vdGhpbmcgdG8gcmV2aWV3Jyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgcHJpdmlsZWdlZERvd25ncmFkZShpdGVtOiBXb3JrSXRlbVJvdywgaW5wdXQ6IEFkdmFuY2VJbnB1dCk6IFByb21pc2U8V29ya0l0ZW0+IHtcbiAgICBhd2FpdCB0aGlzLnZhbGlkYXRlUHJlc2VudGVkVG9rZW4oaXRlbSwgaW5wdXQuZmVuY2luZ1Rva2VuLCBpbnB1dC5hY3RvcklkKTtcbiAgICBpZiAoaXRlbS5ibG9ja2VkUmVhc29uICE9PSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcihgd29yayBpdGVtIGlzIGJsb2NrZWQ6ICR7aXRlbS5ibG9ja2VkUmVhc29ufWApO1xuICAgIH1cbiAgICBjb25zdCBmcm9tID0gaXRlbS5zdGF0ZTtcbiAgICByZXR1cm4gdGhpcy5kYi50cmFuc2FjdGlvbihhc3luYyAodHgpID0+IHtcbiAgICAgIGNvbnN0IHVwZGF0ZWQgPSBhd2FpdCB0eFxuICAgICAgICAudXBkYXRlKHdvcmtJdGVtcylcbiAgICAgICAgLnNldCh7IHN0YXRlOiBpbnB1dC50bywgc3RhdGVWZXJzaW9uOiBpdGVtLnN0YXRlVmVyc2lvbiArIDEgfSlcbiAgICAgICAgLndoZXJlKGFuZChlcSh3b3JrSXRlbXMuaWQsIGl0ZW0uaWQpLCBlcSh3b3JrSXRlbXMuc3RhdGVWZXJzaW9uLCBpdGVtLnN0YXRlVmVyc2lvbikpKVxuICAgICAgICAucmV0dXJuaW5nKHsgaWQ6IHdvcmtJdGVtcy5pZCB9KTtcbiAgICAgIGlmICh1cGRhdGVkLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICB0aHJvdyBuZXcgQ29uZmxpY3RFcnJvcihgc3RhdGVfdmVyc2lvbiBjb25mbGljdCBvbiB3b3JrIGl0ZW0gJHtpdGVtLmlkfWApO1xuICAgICAgfVxuICAgICAgYXdhaXQgdGhpcy5hcHBlbmRUeChcbiAgICAgICAgdHgsXG4gICAgICAgICd3b3JrX2l0ZW0nLFxuICAgICAgICBpdGVtLmlkLFxuICAgICAgICAnd29ya19pdGVtLnN0YXRlX2Rvd25ncmFkZWQnLFxuICAgICAgICBpbnB1dC5hY3RvcklkLFxuICAgICAgICB7IGZyb20sIHRvOiBpbnB1dC50bywgY29tcGVuc2F0aW5nOiB0cnVlIH0sXG4gICAgICAgIGlucHV0LmlkZW1wb3RlbmN5S2V5ICE9PSB1bmRlZmluZWQgPyB7IGlkZW1wb3RlbmN5S2V5OiBpbnB1dC5pZGVtcG90ZW5jeUtleSB9IDogdW5kZWZpbmVkLFxuICAgICAgKTtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IHRoaXMucHVibGljSXRlbSh7IC4uLml0ZW0sIHN0YXRlOiBpbnB1dC50bywgc3RhdGVWZXJzaW9uOiBpdGVtLnN0YXRlVmVyc2lvbiArIDEgfSk7XG4gICAgICBpZiAoaW5wdXQuaWRlbXBvdGVuY3lLZXkgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBhd2FpdCB0eFxuICAgICAgICAgIC5pbnNlcnQoaWRlbXBvdGVuY3lLZXlzKVxuICAgICAgICAgIC52YWx1ZXMoeyBrZXk6IGlucHV0LmlkZW1wb3RlbmN5S2V5LCByZXN1bHQ6IHJlc3VsdCBhcyB1bmtub3duIGFzIFJlY29yZDxzdHJpbmcsIHVua25vd24+IH0pXG4gICAgICAgICAgLm9uQ29uZmxpY3REb05vdGhpbmcoKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSk7XG4gIH1cblxuICAvKiogU2hhcmVkIGJ5IGFkdmFuY2VTdGF0ZSBhbmQgdGhlIGdhdGUtZmlyZWQgdHJhbnNpdGlvbnMuIE9ORSB0cmFuc2FjdGlvbiBwZXIgY29tbWFuZC4gKi9cbiAgcHJpdmF0ZSBhc3luYyBleGVjdXRlVHJhbnNpdGlvblR4KFxuICAgIHR4OiBUeCxcbiAgICBpdGVtOiBXb3JrSXRlbVJvdyxcbiAgICB0bzogV29ya0l0ZW1TdGF0ZSxcbiAgICBhY3RvcklkOiBzdHJpbmcsXG4gICAgaWRlbXBvdGVuY3lLZXk/OiBzdHJpbmcsXG4gICAgY2F1c2F0aW9uSWQ/OiBzdHJpbmcsXG4gICk6IFByb21pc2U8V29ya0l0ZW0+IHtcbiAgICBjb25zdCBmcm9tID0gaXRlbS5zdGF0ZSBhcyBXb3JrSXRlbVN0YXRlO1xuICAgIC8vIENBUzogb3B0aW1pc3RpYyBjb25jdXJyZW5jeSBieSBzdGF0ZV92ZXJzaW9uIChyb2FkbWFwIFx1MDBBNzEuMSkuXG4gICAgY29uc3QgdXBkYXRlZCA9IGF3YWl0IHR4XG4gICAgICAudXBkYXRlKHdvcmtJdGVtcylcbiAgICAgIC5zZXQoeyBzdGF0ZTogdG8sIHN0YXRlVmVyc2lvbjogaXRlbS5zdGF0ZVZlcnNpb24gKyAxIH0pXG4gICAgICAud2hlcmUoYW5kKGVxKHdvcmtJdGVtcy5pZCwgaXRlbS5pZCksIGVxKHdvcmtJdGVtcy5zdGF0ZVZlcnNpb24sIGl0ZW0uc3RhdGVWZXJzaW9uKSkpXG4gICAgICAucmV0dXJuaW5nKHsgaWQ6IHdvcmtJdGVtcy5pZCB9KTtcbiAgICBpZiAodXBkYXRlZC5sZW5ndGggPT09IDApIHtcbiAgICAgIHRocm93IG5ldyBDb25mbGljdEVycm9yKGBzdGF0ZV92ZXJzaW9uIGNvbmZsaWN0IG9uIHdvcmsgaXRlbSAke2l0ZW0uaWR9YCk7XG4gICAgfVxuICAgIGNvbnN0IGV2ZW50ID0gYXdhaXQgdGhpcy5hcHBlbmRUeChcbiAgICAgIHR4LFxuICAgICAgJ3dvcmtfaXRlbScsXG4gICAgICBpdGVtLmlkLFxuICAgICAgJ3dvcmtfaXRlbS5zdGF0ZV9jaGFuZ2VkJyxcbiAgICAgIGFjdG9ySWQsXG4gICAgICB7IGZyb20sIHRvIH0sXG4gICAgICB7XG4gICAgICAgIC4uLihjYXVzYXRpb25JZCAhPT0gdW5kZWZpbmVkID8geyBjYXVzYXRpb25JZCB9IDoge30pLFxuICAgICAgICAuLi4oaWRlbXBvdGVuY3lLZXkgIT09IHVuZGVmaW5lZCA/IHsgaWRlbXBvdGVuY3lLZXkgfSA6IHt9KSxcbiAgICAgIH0sXG4gICAgKTtcblxuICAgIC8vIEVwaWMtbGlmdCBwcm9qZWN0b3IgKHJvYWRtYXAgXHUwMEE3MS4yKTogZmlyc3QgY2hpbGQgTEVBVklORyBiYWNrbG9nIGxpZnRzXG4gICAgLy8gdGhlIGZlYXR1cmU7IGlkZW1wb3RlbnQgYnkgY2hlY2s7IGF1dGhvcmVkIGJ5IHRoZSBzeXN0ZW0gYWN0b3IuXG4gICAgaWYgKGZyb20gPT09ICdiYWNrbG9nJyAmJiB0byAhPT0gJ2JhY2tsb2cnKSB7XG4gICAgICBjb25zdCBmZWF0dXJlID0gYXdhaXQgdGhpcy5nZXRGZWF0dXJlUm93KGl0ZW0uZmVhdHVyZUlkLCB0eCk7XG4gICAgICBpZiAoZmVhdHVyZSAmJiBmZWF0dXJlLnN0YXRlID09PSAnYmFja2xvZycpIHtcbiAgICAgICAgYXdhaXQgdHgudXBkYXRlKGZlYXR1cmVzKS5zZXQoeyBzdGF0ZTogJ2luX3Byb2dyZXNzJyB9KS53aGVyZShlcShmZWF0dXJlcy5pZCwgZmVhdHVyZS5pZCkpO1xuICAgICAgICBhd2FpdCB0aGlzLmFwcGVuZFR4KFxuICAgICAgICAgIHR4LFxuICAgICAgICAgICdmZWF0dXJlJyxcbiAgICAgICAgICBmZWF0dXJlLmlkLFxuICAgICAgICAgICdmZWF0dXJlLnN0YXRlX2NoYW5nZWQnLFxuICAgICAgICAgIHRoaXMuc3lzdGVtQWN0b3JJZCxcbiAgICAgICAgICB7IGZyb206ICdiYWNrbG9nJywgdG86ICdpbl9wcm9ncmVzcycgfSxcbiAgICAgICAgICB7IGNhdXNhdGlvbklkOiBTdHJpbmcoZXZlbnQuZ2xvYmFsU2VxKSB9LFxuICAgICAgICApO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIGRvbmVfY2hlY2twb2ludCAocm9hZG1hcCBcdTAwQTcxLjEpOiB0aGUgc3RvcnkgY29tcGxldGVzIG5vcm1hbGx5OyB0aGUgaG9sZFxuICAgIC8vIG1hdGVyaWFsaXplcyBvbiB0aGUgZmVhdHVyZSBleGFjdGx5IGF0IGNvbXBsZXRpb24uXG4gICAgaWYgKHRvID09PSAnZG9uZScgJiYgaXRlbS5kb25lQ2hlY2twb2ludCkge1xuICAgICAgY29uc3QgZmVhdHVyZSA9IGF3YWl0IHRoaXMuZ2V0RmVhdHVyZVJvdyhpdGVtLmZlYXR1cmVJZCwgdHgpO1xuICAgICAgaWYgKGZlYXR1cmUgJiYgIWZlYXR1cmUuZGlzcGF0Y2hIb2xkKSB7XG4gICAgICAgIGF3YWl0IHR4LnVwZGF0ZShmZWF0dXJlcykuc2V0KHsgZGlzcGF0Y2hIb2xkOiB0cnVlIH0pLndoZXJlKGVxKGZlYXR1cmVzLmlkLCBmZWF0dXJlLmlkKSk7XG4gICAgICAgIGF3YWl0IHRoaXMuYXBwZW5kVHgoXG4gICAgICAgICAgdHgsXG4gICAgICAgICAgJ2ZlYXR1cmUnLFxuICAgICAgICAgIGZlYXR1cmUuaWQsXG4gICAgICAgICAgJ2ZlYXR1cmUuZGlzcGF0Y2hfaG9sZF9yYWlzZWQnLFxuICAgICAgICAgIHRoaXMuc3lzdGVtQWN0b3JJZCxcbiAgICAgICAgICB7IHdvcmtJdGVtSWQ6IGl0ZW0uaWQgfSxcbiAgICAgICAgICB7IGNhdXNhdGlvbklkOiBTdHJpbmcoZXZlbnQuZ2xvYmFsU2VxKSB9LFxuICAgICAgICApO1xuICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IHJlc3VsdCA9IHRoaXMucHVibGljSXRlbSh7IC4uLml0ZW0sIHN0YXRlOiB0bywgc3RhdGVWZXJzaW9uOiBpdGVtLnN0YXRlVmVyc2lvbiArIDEgfSk7XG4gICAgaWYgKGlkZW1wb3RlbmN5S2V5ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIGF3YWl0IHR4XG4gICAgICAgIC5pbnNlcnQoaWRlbXBvdGVuY3lLZXlzKVxuICAgICAgICAudmFsdWVzKHsga2V5OiBpZGVtcG90ZW5jeUtleSwgcmVzdWx0OiByZXN1bHQgYXMgdW5rbm93biBhcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiB9KVxuICAgICAgICAub25Db25mbGljdERvTm90aGluZygpO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgYXN5bmMgYmxvY2tUYXNrKGlucHV0OiB7XG4gICAgd29ya0l0ZW1JZDogc3RyaW5nO1xuICAgIHJlYXNvbjogQmxvY2tlZFJlYXNvbjtcbiAgICBhY3RvcklkOiBzdHJpbmc7XG4gICAgZmVuY2luZ1Rva2VuPzogbnVtYmVyO1xuICB9KTogUHJvbWlzZTxXb3JrSXRlbT4ge1xuICAgIGNvbnN0IGl0ZW0gPSBhd2FpdCB0aGlzLm11c3RHZXRJdGVtKGlucHV0LndvcmtJdGVtSWQpO1xuICAgIGlmICghKEJMT0NLRURfUkVBU09OUyBhcyByZWFkb25seSBzdHJpbmdbXSkuaW5jbHVkZXMoaW5wdXQucmVhc29uKSkge1xuICAgICAgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoYHVua25vd24gYmxvY2tpbmcgY29uZGl0aW9uOiAke2lucHV0LnJlYXNvbn1gKTtcbiAgICB9XG4gICAgYXdhaXQgdGhpcy52YWxpZGF0ZVByZXNlbnRlZFRva2VuKGl0ZW0sIGlucHV0LmZlbmNpbmdUb2tlbiwgaW5wdXQuYWN0b3JJZCk7XG4gICAgYXdhaXQgdGhpcy5yZXF1aXJlUGVybWlzc2lvbihpbnB1dC5hY3RvcklkLCAndGFzay5ibG9jaycpO1xuICAgIHJldHVybiB0aGlzLmRiLnRyYW5zYWN0aW9uKGFzeW5jICh0eCkgPT4ge1xuICAgICAgYXdhaXQgdHhcbiAgICAgICAgLnVwZGF0ZSh3b3JrSXRlbXMpXG4gICAgICAgIC5zZXQoeyBibG9ja2VkUmVhc29uOiBpbnB1dC5yZWFzb24sIHN0YXRlVmVyc2lvbjogaXRlbS5zdGF0ZVZlcnNpb24gKyAxIH0pXG4gICAgICAgIC53aGVyZShlcSh3b3JrSXRlbXMuaWQsIGl0ZW0uaWQpKTtcbiAgICAgIGF3YWl0IHRoaXMuYXBwZW5kVHgodHgsICd3b3JrX2l0ZW0nLCBpdGVtLmlkLCAnd29ya19pdGVtLmJsb2NrZWQnLCBpbnB1dC5hY3RvcklkLCB7XG4gICAgICAgIHJlYXNvbjogaW5wdXQucmVhc29uLFxuICAgICAgfSk7XG4gICAgICByZXR1cm4gdGhpcy5wdWJsaWNJdGVtKHsgLi4uaXRlbSwgYmxvY2tlZFJlYXNvbjogaW5wdXQucmVhc29uLCBzdGF0ZVZlcnNpb246IGl0ZW0uc3RhdGVWZXJzaW9uICsgMSB9KTtcbiAgICB9KTtcbiAgfVxuXG4gIGFzeW5jIHVuYmxvY2tUYXNrKGlucHV0OiB7IHdvcmtJdGVtSWQ6IHN0cmluZzsgYWN0b3JJZDogc3RyaW5nIH0pOiBQcm9taXNlPFdvcmtJdGVtPiB7XG4gICAgY29uc3QgaXRlbSA9IGF3YWl0IHRoaXMubXVzdEdldEl0ZW0oaW5wdXQud29ya0l0ZW1JZCk7XG4gICAgLy8gXHUwMEE3NC4yOiByZXZpZXdfbm9uX2NvbnZlcmdlbmNlIGNhbiBvbmx5IGJlIHJlbGVhc2VkIGJ5IGEgcmV2aWV3LWdhdGVcbiAgICAvLyBob2xkZXI7IG9yZGluYXJ5IGJsb2NrcyByZWxlYXNlIHVuZGVyIHRhc2suYmxvY2suXG4gICAgaWYgKGl0ZW0uYmxvY2tlZFJlYXNvbiA9PT0gJ3Jldmlld19ub25fY29udmVyZ2VuY2UnKSB7XG4gICAgICBhd2FpdCB0aGlzLnJlcXVpcmVQZXJtaXNzaW9uKGlucHV0LmFjdG9ySWQsICdnYXRlLnJldmlldy5hcHByb3ZlJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGF3YWl0IHRoaXMucmVxdWlyZVBlcm1pc3Npb24oaW5wdXQuYWN0b3JJZCwgJ3Rhc2suYmxvY2snKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuZGIudHJhbnNhY3Rpb24oYXN5bmMgKHR4KSA9PiB7XG4gICAgICBhd2FpdCB0eFxuICAgICAgICAudXBkYXRlKHdvcmtJdGVtcylcbiAgICAgICAgLnNldCh7IGJsb2NrZWRSZWFzb246IG51bGwsIHN0YXRlVmVyc2lvbjogaXRlbS5zdGF0ZVZlcnNpb24gKyAxIH0pXG4gICAgICAgIC53aGVyZShlcSh3b3JrSXRlbXMuaWQsIGl0ZW0uaWQpKTtcbiAgICAgIGF3YWl0IHRoaXMuYXBwZW5kVHgodHgsICd3b3JrX2l0ZW0nLCBpdGVtLmlkLCAnd29ya19pdGVtLnVuYmxvY2tlZCcsIGlucHV0LmFjdG9ySWQsIHt9KTtcbiAgICAgIHJldHVybiB0aGlzLnB1YmxpY0l0ZW0oeyAuLi5pdGVtLCBibG9ja2VkUmVhc29uOiBudWxsLCBzdGF0ZVZlcnNpb246IGl0ZW0uc3RhdGVWZXJzaW9uICsgMSB9KTtcbiAgICB9KTtcbiAgfVxuXG4gIC8vIC0tIGdhdGVzICYgZXZpZGVuY2UgKHJvYWRtYXAgXHUwMEE3MS40KSAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICBhc3luYyBzdWJtaXRFdmlkZW5jZShpbnB1dDoge1xuICAgIHdvcmtJdGVtSWQ6IHN0cmluZztcbiAgICBldmlkZW5jZTogRXZpZGVuY2U7XG4gICAgYWN0b3JJZDogc3RyaW5nO1xuICAgIGZlbmNpbmdUb2tlbj86IG51bWJlcjtcbiAgfSk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IGl0ZW0gPSBhd2FpdCB0aGlzLm11c3RHZXRJdGVtKGlucHV0LndvcmtJdGVtSWQpO1xuICAgIGF3YWl0IHRoaXMudmFsaWRhdGVQcmVzZW50ZWRUb2tlbihpdGVtLCBpbnB1dC5mZW5jaW5nVG9rZW4sIGlucHV0LmFjdG9ySWQpO1xuICAgIGF3YWl0IHRoaXMuZGIudHJhbnNhY3Rpb24oYXN5bmMgKHR4KSA9PiB7XG4gICAgICBhd2FpdCB0eC5pbnNlcnQoZXZpZGVuY2VUYWJsZSkudmFsdWVzKHtcbiAgICAgICAgd29ya0l0ZW1JZDogaXRlbS5pZCxcbiAgICAgICAga2luZDogaW5wdXQuZXZpZGVuY2Uua2luZCxcbiAgICAgICAgcGF5bG9hZDogaW5wdXQuZXZpZGVuY2UucGF5bG9hZCxcbiAgICAgIH0pO1xuICAgICAgYXdhaXQgdGhpcy5hcHBlbmRUeCh0eCwgJ3dvcmtfaXRlbScsIGl0ZW0uaWQsICdldmlkZW5jZS5zdWJtaXR0ZWQnLCBpbnB1dC5hY3RvcklkLCB7XG4gICAgICAgIGtpbmQ6IGlucHV0LmV2aWRlbmNlLmtpbmQsXG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuXG4gIGFzeW5jIGFwcHJvdmVHYXRlKGlucHV0OiBHYXRlRGVjaXNpb25JbnB1dCk6IFByb21pc2U8V29ya0l0ZW0+IHtcbiAgICBjb25zdCBpdGVtID0gYXdhaXQgdGhpcy5tdXN0R2V0SXRlbShpbnB1dC53b3JrSXRlbUlkKTtcblxuICAgIGlmIChpbnB1dC5nYXRlID09PSAnc3BlY19hcHByb3ZhbCcpIHtcbiAgICAgIC8vIFBlcm1pc3Npb24gcHJlY2VkZXMgYW55IGVmZmVjdDogYSBkZW5pZWQgYXR0ZW1wdCBwaW5zIG5vdGhpbmcuXG4gICAgICBhd2FpdCB0aGlzLnJlcXVpcmVQZXJtaXNzaW9uKGlucHV0LmFjdG9ySWQsICdnYXRlLnNwZWMuYXBwcm92ZScpO1xuICAgICAgaWYgKGl0ZW0uYmxvY2tlZFJlYXNvbiAhPT0gbnVsbCkge1xuICAgICAgICB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcihgd29yayBpdGVtIGlzIGJsb2NrZWQ6ICR7aXRlbS5ibG9ja2VkUmVhc29ufWApO1xuICAgICAgfVxuICAgICAgaWYgKGl0ZW0uc3RhdGUgIT09ICdkcmFmdCcpIHtcbiAgICAgICAgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoYHNwZWNfYXBwcm92YWwgYXBwbGllcyB0byBkcmFmdCBpdGVtcywgbm90ICR7aXRlbS5zdGF0ZX1gKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB0aGlzLmRiLnRyYW5zYWN0aW9uKGFzeW5jICh0eCkgPT4ge1xuICAgICAgICBsZXQgcGlubmVkID0gaXRlbS5waW5uZWRWZXJpZmljYXRpb247XG4gICAgICAgIGlmIChpbnB1dC5waW5uZWRWZXJpZmljYXRpb24gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIHBpbm5lZCA9IFsuLi5pbnB1dC5waW5uZWRWZXJpZmljYXRpb25dO1xuICAgICAgICAgIGF3YWl0IHR4LnVwZGF0ZSh3b3JrSXRlbXMpLnNldCh7IHBpbm5lZFZlcmlmaWNhdGlvbjogcGlubmVkIH0pLndoZXJlKGVxKHdvcmtJdGVtcy5pZCwgaXRlbS5pZCkpO1xuICAgICAgICB9XG4gICAgICAgIGF3YWl0IHR4Lmluc2VydChnYXRlRGVjaXNpb25zKS52YWx1ZXMoe1xuICAgICAgICAgIHdvcmtJdGVtSWQ6IGl0ZW0uaWQsXG4gICAgICAgICAgZ2F0ZTogJ3NwZWNfYXBwcm92YWwnLFxuICAgICAgICAgIGRlY2lzaW9uOiAnYXBwcm92ZWQnLFxuICAgICAgICAgIGFjdG9ySWQ6IGlucHV0LmFjdG9ySWQsXG4gICAgICAgIH0pO1xuICAgICAgICBhd2FpdCB0aGlzLmFwcGVuZFR4KHR4LCAnd29ya19pdGVtJywgaXRlbS5pZCwgJ2dhdGUuYXBwcm92ZWQnLCBpbnB1dC5hY3RvcklkLCB7XG4gICAgICAgICAgZ2F0ZTogJ3NwZWNfYXBwcm92YWwnLFxuICAgICAgICAgIHBpbm5lZFZlcmlmaWNhdGlvbjogcGlubmVkID8/IG51bGwsXG4gICAgICAgIH0pO1xuICAgICAgICAvLyBUaGUgYXBwcm92YWwgZmlyZXMgdGhlIGdhdGVkIGZvcndhcmQgdHJhbnNpdGlvbiAoY29uZm9ybWFuY2UgcGluKS5cbiAgICAgICAgcmV0dXJuIHRoaXMuZXhlY3V0ZVRyYW5zaXRpb25UeCh0eCwgeyAuLi5pdGVtLCBwaW5uZWRWZXJpZmljYXRpb246IHBpbm5lZCB9LCAncmVhZHlfZm9yX2RldicsIGlucHV0LmFjdG9ySWQpO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gcmV2aWV3X2FwcHJvdmFsXG4gICAgYXdhaXQgdGhpcy5yZXF1aXJlUGVybWlzc2lvbihpbnB1dC5hY3RvcklkLCAnZ2F0ZS5yZXZpZXcuYXBwcm92ZScpO1xuICAgIGlmIChpdGVtLmJsb2NrZWRSZWFzb24gIT09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBHdWFyZEZhaWxlZEVycm9yKGB3b3JrIGl0ZW0gaXMgYmxvY2tlZDogJHtpdGVtLmJsb2NrZWRSZWFzb259YCk7XG4gICAgfVxuICAgIGlmIChpdGVtLnN0YXRlICE9PSAnaW5fcmV2aWV3Jykge1xuICAgICAgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoYHJldmlld19hcHByb3ZhbCBhcHBsaWVzIHRvIGluX3JldmlldyBpdGVtcywgbm90ICR7aXRlbS5zdGF0ZX1gKTtcbiAgICB9XG4gICAgYXdhaXQgdGhpcy5jaGVja1Jldmlld0V2aWRlbmNlKGl0ZW0pO1xuICAgIHJldHVybiB0aGlzLmRiLnRyYW5zYWN0aW9uKGFzeW5jICh0eCkgPT4ge1xuICAgICAgYXdhaXQgdHguaW5zZXJ0KGdhdGVEZWNpc2lvbnMpLnZhbHVlcyh7XG4gICAgICAgIHdvcmtJdGVtSWQ6IGl0ZW0uaWQsXG4gICAgICAgIGdhdGU6ICdyZXZpZXdfYXBwcm92YWwnLFxuICAgICAgICBkZWNpc2lvbjogJ2FwcHJvdmVkJyxcbiAgICAgICAgYWN0b3JJZDogaW5wdXQuYWN0b3JJZCxcbiAgICAgIH0pO1xuICAgICAgYXdhaXQgdGhpcy5hcHBlbmRUeCh0eCwgJ3dvcmtfaXRlbScsIGl0ZW0uaWQsICdnYXRlLmFwcHJvdmVkJywgaW5wdXQuYWN0b3JJZCwge1xuICAgICAgICBnYXRlOiAncmV2aWV3X2FwcHJvdmFsJyxcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIHRoaXMuZXhlY3V0ZVRyYW5zaXRpb25UeCh0eCwgaXRlbSwgJ2RvbmUnLCBpbnB1dC5hY3RvcklkKTtcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBFdmlkZW5jZSBjb25kaXRpb24gb2YgdGhlIGRvbmUgZ2F0ZSAoXHUwMEE3MS40LCBENyk6IGV2ZXJ5IFBJTk5FRCBjb21tYW5kJ3NcbiAgICogbGF0ZXN0IHRlc3RfcnVuIGV4aXRlZCAwLCBhbmQgdGhlIGZpbmFsIGNvbW1pdCBpcyByZWFjaGFibGUgb24gdGhlXG4gICAqIHJlbW90ZS4gcmV2aWV3X3JlcG9ydCBpcyBuZXZlciBjb25zdWx0ZWQuXG4gICAqL1xuICBwcml2YXRlIGFzeW5jIGNoZWNrUmV2aWV3RXZpZGVuY2UoaXRlbTogV29ya0l0ZW1Sb3cpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCByb3dzID0gYXdhaXQgdGhpcy5kYlxuICAgICAgLnNlbGVjdCgpXG4gICAgICAuZnJvbShldmlkZW5jZVRhYmxlKVxuICAgICAgLndoZXJlKGVxKGV2aWRlbmNlVGFibGUud29ya0l0ZW1JZCwgaXRlbS5pZCkpXG4gICAgICAub3JkZXJCeShhc2MoZXZpZGVuY2VUYWJsZS5zZXEpKTtcbiAgICBmb3IgKGNvbnN0IGNvbW1hbmQgb2YgaXRlbS5waW5uZWRWZXJpZmljYXRpb24gPz8gW10pIHtcbiAgICAgIGNvbnN0IHJ1bnMgPSByb3dzLmZpbHRlcigocm93KSA9PiByb3cua2luZCA9PT0gJ3Rlc3RfcnVuJyAmJiByb3cucGF5bG9hZFsnY29tbWFuZCddID09PSBjb21tYW5kKTtcbiAgICAgIGNvbnN0IGxhdGVzdCA9IHJ1bnNbcnVucy5sZW5ndGggLSAxXTtcbiAgICAgIGlmICghbGF0ZXN0IHx8IGxhdGVzdC5wYXlsb2FkWydleGl0Q29kZSddICE9PSAwKSB7XG4gICAgICAgIHRocm93IG5ldyBHdWFyZEZhaWxlZEVycm9yKGBwaW5uZWQgdmVyaWZpY2F0aW9uIGRpZCBub3QgcGFzczogJHtjb21tYW5kfWApO1xuICAgICAgfVxuICAgIH1cbiAgICBjb25zdCBjb21taXRPayA9IHJvd3Muc29tZSgocm93KSA9PiByb3cua2luZCA9PT0gJ2NvbW1pdCcgJiYgcm93LnBheWxvYWRbJ3JlYWNoYWJsZU9uUmVtb3RlJ10gPT09IHRydWUpO1xuICAgIGlmICghY29tbWl0T2spIHtcbiAgICAgIHRocm93IG5ldyBHdWFyZEZhaWxlZEVycm9yKFxuICAgICAgICAnZmluYWwgcmV2aXNpb24gbXVzdCBiZSByZWFjaGFibGUgb24gdGhlIHJlbW90ZSAocHVzaCBpcyBwYXJ0IG9mIHRoZSBIQUxUIGNvbnRyYWN0KScsXG4gICAgICApO1xuICAgIH1cbiAgfVxuXG4gIGFzeW5jIHJlamVjdEdhdGUoaW5wdXQ6IEdhdGVEZWNpc2lvbklucHV0KTogUHJvbWlzZTxXb3JrSXRlbT4ge1xuICAgIGNvbnN0IGl0ZW0gPSBhd2FpdCB0aGlzLm11c3RHZXRJdGVtKGlucHV0LndvcmtJdGVtSWQpO1xuICAgIGlmIChpbnB1dC5nYXRlICE9PSAncmV2aWV3X2FwcHJvdmFsJykge1xuICAgICAgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoJ29ubHkgcmV2aWV3X2FwcHJvdmFsIHJlamVjdGlvbiBpcyBkZWZpbmVkIGluIFBoYXNlIDEnKTtcbiAgICB9XG4gICAgYXdhaXQgdGhpcy5yZXF1aXJlUGVybWlzc2lvbihpbnB1dC5hY3RvcklkLCAnZ2F0ZS5yZXZpZXcuYXBwcm92ZScpO1xuICAgIGlmIChpdGVtLnN0YXRlICE9PSAnaW5fcmV2aWV3Jykge1xuICAgICAgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoYHJldmlldyByZWplY3Rpb24gYXBwbGllcyB0byBpbl9yZXZpZXcgaXRlbXMsIG5vdCAke2l0ZW0uc3RhdGV9YCk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLmRiLnRyYW5zYWN0aW9uKGFzeW5jICh0eCkgPT4ge1xuICAgICAgYXdhaXQgdHguaW5zZXJ0KGdhdGVEZWNpc2lvbnMpLnZhbHVlcyh7XG4gICAgICAgIHdvcmtJdGVtSWQ6IGl0ZW0uaWQsXG4gICAgICAgIGdhdGU6ICdyZXZpZXdfYXBwcm92YWwnLFxuICAgICAgICBkZWNpc2lvbjogJ3JlamVjdGVkJyxcbiAgICAgICAgYWN0b3JJZDogaW5wdXQuYWN0b3JJZCxcbiAgICAgIH0pO1xuICAgICAgY29uc3QgZGVjaXNpb25FdmVudCA9IGF3YWl0IHRoaXMuYXBwZW5kVHgodHgsICd3b3JrX2l0ZW0nLCBpdGVtLmlkLCAnZ2F0ZS5yZWplY3RlZCcsIGlucHV0LmFjdG9ySWQsIHtcbiAgICAgICAgZ2F0ZTogJ3Jldmlld19hcHByb3ZhbCcsXG4gICAgICB9KTtcblxuICAgICAgaWYgKGl0ZW0ucmV2aWV3TG9vcEl0ZXJhdGlvbiA+PSBSRVZJRVdfTE9PUF9MSU1JVCkge1xuICAgICAgICAvLyBUaGUgNnRoIHJlamVjdGlvbiBwZXJmb3JtcyBubyBsb29wYmFjazogb3ZlcmxheSByZXZpZXdfbm9uX2NvbnZlcmdlbmNlLFxuICAgICAgICAvLyBzdGF0ZSBmcm96ZW4gYXQgaW5fcmV2aWV3LCBjb3VudGVyIHVudG91Y2hlZCAoQ09ORk9STUFOQ0UubWQgcGluKS5cbiAgICAgICAgYXdhaXQgdHhcbiAgICAgICAgICAudXBkYXRlKHdvcmtJdGVtcylcbiAgICAgICAgICAuc2V0KHsgYmxvY2tlZFJlYXNvbjogJ3Jldmlld19ub25fY29udmVyZ2VuY2UnLCBzdGF0ZVZlcnNpb246IGl0ZW0uc3RhdGVWZXJzaW9uICsgMSB9KVxuICAgICAgICAgIC53aGVyZShlcSh3b3JrSXRlbXMuaWQsIGl0ZW0uaWQpKTtcbiAgICAgICAgYXdhaXQgdGhpcy5hcHBlbmRUeChcbiAgICAgICAgICB0eCxcbiAgICAgICAgICAnd29ya19pdGVtJyxcbiAgICAgICAgICBpdGVtLmlkLFxuICAgICAgICAgICd3b3JrX2l0ZW0uYmxvY2tlZCcsXG4gICAgICAgICAgdGhpcy5zeXN0ZW1BY3RvcklkLFxuICAgICAgICAgIHsgcmVhc29uOiAncmV2aWV3X25vbl9jb252ZXJnZW5jZScgfSxcbiAgICAgICAgICB7IGNhdXNhdGlvbklkOiBTdHJpbmcoZGVjaXNpb25FdmVudC5nbG9iYWxTZXEpIH0sXG4gICAgICAgICk7XG4gICAgICAgIHJldHVybiB0aGlzLnB1YmxpY0l0ZW0oe1xuICAgICAgICAgIC4uLml0ZW0sXG4gICAgICAgICAgYmxvY2tlZFJlYXNvbjogJ3Jldmlld19ub25fY29udmVyZ2VuY2UnLFxuICAgICAgICAgIHN0YXRlVmVyc2lvbjogaXRlbS5zdGF0ZVZlcnNpb24gKyAxLFxuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgLy8gXHUwMEE3MS4yOiB0aGUgbG9vcGJhY2sgaXMgYSBzeXN0ZW0gZWZmZWN0IFx1MjAxNCBubyBjbGFpbS1ob2xkZXIgcGFydGljaXBhdGlvbi5cbiAgICAgIGF3YWl0IHR4XG4gICAgICAgIC51cGRhdGUod29ya0l0ZW1zKVxuICAgICAgICAuc2V0KHsgcmV2aWV3TG9vcEl0ZXJhdGlvbjogaXRlbS5yZXZpZXdMb29wSXRlcmF0aW9uICsgMSB9KVxuICAgICAgICAud2hlcmUoZXEod29ya0l0ZW1zLmlkLCBpdGVtLmlkKSk7XG4gICAgICBjb25zdCBidW1wZWQgPSB7IC4uLml0ZW0sIHJldmlld0xvb3BJdGVyYXRpb246IGl0ZW0ucmV2aWV3TG9vcEl0ZXJhdGlvbiArIDEgfTtcbiAgICAgIHJldHVybiB0aGlzLmV4ZWN1dGVUcmFuc2l0aW9uVHgoXG4gICAgICAgIHR4LFxuICAgICAgICBidW1wZWQsXG4gICAgICAgICdpbl9wcm9ncmVzcycsXG4gICAgICAgIHRoaXMuc3lzdGVtQWN0b3JJZCxcbiAgICAgICAgdW5kZWZpbmVkLFxuICAgICAgICBTdHJpbmcoZGVjaXNpb25FdmVudC5nbG9iYWxTZXEpLFxuICAgICAgKTtcbiAgICB9KTtcbiAgfVxuXG4gIC8vIC0tIGRpc3BhdGNoIChyb2FkbWFwIFx1MDBBNzIuMykgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICBhc3luYyBnZXRUYXNrQ29udGV4dChpbnB1dDogeyB3b3JrSXRlbUlkOiBzdHJpbmcgfSk6IFByb21pc2U8eyB3b3JrSXRlbTogV29ya0l0ZW07IGVudHJ5U3RhdGU6IFdvcmtJdGVtU3RhdGUgfT4ge1xuICAgIGNvbnN0IGl0ZW0gPSBhd2FpdCB0aGlzLm11c3RHZXRJdGVtKGlucHV0LndvcmtJdGVtSWQpO1xuICAgIGlmIChpdGVtLnN0YXRlID09PSAnZG9uZScpIHtcbiAgICAgIHRocm93IG5ldyBHdWFyZEZhaWxlZEVycm9yKCdkb25lIGl0ZW1zIGFyZSBuZXZlciByZS1kaXNwYXRjaGVkOyBmb2xsb3ctdXAgcmV2aWV3IGlzIGEgbmV3IHdvcmsgaXRlbScpO1xuICAgIH1cbiAgICBjb25zdCBmZWF0dXJlID0gYXdhaXQgdGhpcy5nZXRGZWF0dXJlUm93KGl0ZW0uZmVhdHVyZUlkKTtcbiAgICBpZiAoZmVhdHVyZT8uZGlzcGF0Y2hIb2xkKSB7XG4gICAgICB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcignZmVhdHVyZSBpcyB1bmRlciBhIGRvbmVfY2hlY2twb2ludCBkaXNwYXRjaCBob2xkJyk7XG4gICAgfVxuICAgIHJldHVybiB7IHdvcmtJdGVtOiB0aGlzLnB1YmxpY0l0ZW0oaXRlbSksIGVudHJ5U3RhdGU6IGl0ZW0uc3RhdGUgYXMgV29ya0l0ZW1TdGF0ZSB9O1xuICB9XG5cbiAgYXN5bmMgcmVsZWFzZURpc3BhdGNoSG9sZChpbnB1dDogeyBmZWF0dXJlSWQ6IHN0cmluZzsgYWN0b3JJZDogc3RyaW5nIH0pOiBQcm9taXNlPEZlYXR1cmU+IHtcbiAgICBhd2FpdCB0aGlzLnJlcXVpcmVQZXJtaXNzaW9uKGlucHV0LmFjdG9ySWQsICdkaXNwYXRjaC5yZWxlYXNlX2hvbGQnKTtcbiAgICBjb25zdCBmZWF0dXJlID0gYXdhaXQgdGhpcy5nZXRGZWF0dXJlUm93KGlucHV0LmZlYXR1cmVJZCk7XG4gICAgaWYgKCFmZWF0dXJlKSB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcihgdW5rbm93biBmZWF0dXJlOiAke2lucHV0LmZlYXR1cmVJZH1gKTtcbiAgICByZXR1cm4gdGhpcy5kYi50cmFuc2FjdGlvbihhc3luYyAodHgpID0+IHtcbiAgICAgIGF3YWl0IHR4LnVwZGF0ZShmZWF0dXJlcykuc2V0KHsgZGlzcGF0Y2hIb2xkOiBmYWxzZSB9KS53aGVyZShlcShmZWF0dXJlcy5pZCwgZmVhdHVyZS5pZCkpO1xuICAgICAgYXdhaXQgdGhpcy5hcHBlbmRUeCh0eCwgJ2ZlYXR1cmUnLCBmZWF0dXJlLmlkLCAnZmVhdHVyZS5kaXNwYXRjaF9ob2xkX3JlbGVhc2VkJywgaW5wdXQuYWN0b3JJZCwge30pO1xuICAgICAgcmV0dXJuIHRoaXMucHVibGljRmVhdHVyZSh7IC4uLmZlYXR1cmUsIGRpc3BhdGNoSG9sZDogZmFsc2UgfSk7XG4gICAgfSk7XG4gIH1cblxuICAvLyAtLSByZWNvbmNpbGlhdGlvbiAocm9hZG1hcCBcdTAwQTcxLjYsIEQ2OiBkZXRlY3Qtb25seSwgbmV2ZXIgbXV0YXRlcykgLS0tLS0tLS0tLS0tXG5cbiAgYXN5bmMgcmVjb25jaWxlKGlucHV0OiB7XG4gICAgZmlsZXM6IEFycmF5PHsgd29ya0l0ZW1JZDogc3RyaW5nOyBmcm9udG1hdHRlclN0YXR1czogc3RyaW5nIH0+O1xuICB9KTogUHJvbWlzZTxEaXZlcmdlbmNlUmVwb3J0W10+IHtcbiAgICBjb25zdCByZXBvcnRzOiBEaXZlcmdlbmNlUmVwb3J0W10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IGZpbGUgb2YgaW5wdXQuZmlsZXMpIHtcbiAgICAgIGNvbnN0IGl0ZW0gPSBhd2FpdCB0aGlzLm11c3RHZXRJdGVtKGZpbGUud29ya0l0ZW1JZCk7XG4gICAgICAvLyBGaWxlcyB1bmRlciBhIGxpdmUgY2xhaW0gYXJlIGV4Y2x1ZGVkIFx1MjAxNCBwbGF5Ym9va3MgbGVnaXRpbWF0ZWx5IHdyaXRlXG4gICAgICAvLyBmcm9udG1hdHRlciBtaWQtcnVuIChcdTAwQTcxLjYpLlxuICAgICAgaWYgKChhd2FpdCB0aGlzLmxpdmVDbGFpbShpdGVtLmlkKSkgIT09IG51bGwpIGNvbnRpbnVlO1xuXG4gICAgICBjb25zdCByYXcgPSBmaWxlLmZyb250bWF0dGVyU3RhdHVzLnRyaW0oKTtcbiAgICAgIGNvbnN0IGRiU3RhdGUgPSBpdGVtLnN0YXRlIGFzIFdvcmtJdGVtU3RhdGU7XG4gICAgICBpZiAocmF3ID09PSAnYmxvY2tlZCcpIHtcbiAgICAgICAgLy8gRDg6IG92ZXJsYXkgaW4gdGhlIERCIGFuZCBgc3RhdHVzOiBibG9ja2VkYCBpbiB0aGUgZmlsZSBhcmUgdGhlXG4gICAgICAgIC8vIHNhbWUgdHJ1dGguIEJsb2NrZWQtaW4tZmlsZSB3aXRoIE5PIG92ZXJsYXkgaXMgcmVhbCBkcmlmdC5cbiAgICAgICAgaWYgKGl0ZW0uYmxvY2tlZFJlYXNvbiAhPT0gbnVsbCkgY29udGludWU7XG4gICAgICAgIHJlcG9ydHMucHVzaCh7IHdvcmtJdGVtSWQ6IGl0ZW0uaWQsIGZpbGVTdGF0ZTogcmF3LCBkYlN0YXRlLCBraW5kOiAnY29uZmxpY3QnIH0pO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgY29uc3Qgbm9ybWFsaXplZCA9IExFR0FDWV9TVEFUVVNbcmF3XTtcbiAgICAgIGlmIChub3JtYWxpemVkID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmVwb3J0cy5wdXNoKHsgd29ya0l0ZW1JZDogaXRlbS5pZCwgZmlsZVN0YXRlOiByYXcsIGRiU3RhdGUsIGtpbmQ6ICdjb25mbGljdCcgfSk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgaWYgKG5vcm1hbGl6ZWQgPT09IGRiU3RhdGUpIGNvbnRpbnVlO1xuICAgICAgcmVwb3J0cy5wdXNoKHtcbiAgICAgICAgd29ya0l0ZW1JZDogaXRlbS5pZCxcbiAgICAgICAgZmlsZVN0YXRlOiByYXcsXG4gICAgICAgIGRiU3RhdGUsXG4gICAgICAgIGtpbmQ6IFJBTktbbm9ybWFsaXplZF0gPiBSQU5LW2RiU3RhdGVdID8gJ2ZpbGVfYWhlYWQnIDogJ2RiX2FoZWFkJyxcbiAgICAgIH0pO1xuICAgIH1cbiAgICByZXR1cm4gcmVwb3J0cztcbiAgfVxuXG4gIC8vIC0tIHF1ZXJpZXMgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgYXN5bmMgZ2V0V29ya0l0ZW0oaWQ6IHN0cmluZyk6IFByb21pc2U8V29ya0l0ZW0+IHtcbiAgICByZXR1cm4gdGhpcy5wdWJsaWNJdGVtKGF3YWl0IHRoaXMubXVzdEdldEl0ZW0oaWQpKTtcbiAgfVxuXG4gIGFzeW5jIGdldEZlYXR1cmUoaWQ6IHN0cmluZyk6IFByb21pc2U8RmVhdHVyZT4ge1xuICAgIGNvbnN0IGZlYXR1cmUgPSBhd2FpdCB0aGlzLmdldEZlYXR1cmVSb3coaWQpO1xuICAgIGlmICghZmVhdHVyZSkgdGhyb3cgbmV3IEd1YXJkRmFpbGVkRXJyb3IoYHVua25vd24gZmVhdHVyZTogJHtpZH1gKTtcbiAgICByZXR1cm4gdGhpcy5wdWJsaWNGZWF0dXJlKGZlYXR1cmUpO1xuICB9XG5cbiAgYXN5bmMgbGlzdFdvcmtJdGVtcyhmaWx0ZXI/OiB7XG4gICAgc3RhdGU/OiBXb3JrSXRlbVN0YXRlO1xuICAgIGZlYXR1cmVJZD86IHN0cmluZztcbiAgICBjbGFpbWFibGU/OiBib29sZWFuO1xuICB9KTogUHJvbWlzZTxXb3JrSXRlbVtdPiB7XG4gICAgY29uc3Qgcm93cyA9IGF3YWl0IHRoaXMuZGIuc2VsZWN0KCkuZnJvbSh3b3JrSXRlbXMpLm9yZGVyQnkoYXNjKHdvcmtJdGVtcy5zZXEpKTtcbiAgICBjb25zdCByZXN1bHQ6IFdvcmtJdGVtW10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IHJvdyBvZiByb3dzKSB7XG4gICAgICBpZiAoZmlsdGVyPy5zdGF0ZSAhPT0gdW5kZWZpbmVkICYmIHJvdy5zdGF0ZSAhPT0gZmlsdGVyLnN0YXRlKSBjb250aW51ZTtcbiAgICAgIGlmIChmaWx0ZXI/LmZlYXR1cmVJZCAhPT0gdW5kZWZpbmVkICYmIHJvdy5mZWF0dXJlSWQgIT09IGZpbHRlci5mZWF0dXJlSWQpIGNvbnRpbnVlO1xuICAgICAgaWYgKGZpbHRlcj8uY2xhaW1hYmxlID09PSB0cnVlICYmIChhd2FpdCB0aGlzLmxpdmVDbGFpbShyb3cuaWQpKSAhPT0gbnVsbCkgY29udGludWU7XG4gICAgICByZXN1bHQucHVzaCh0aGlzLnB1YmxpY0l0ZW0ocm93KSk7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICBhc3luYyBnZXRDbGFpbXMod29ya0l0ZW1JZDogc3RyaW5nKTogUHJvbWlzZTxDbGFpbVtdPiB7XG4gICAgY29uc3QgaXRlbSA9IGF3YWl0IHRoaXMubXVzdEdldEl0ZW0od29ya0l0ZW1JZCk7XG4gICAgY29uc3Qgcm93cyA9IGF3YWl0IHRoaXMuZGJcbiAgICAgIC5zZWxlY3QoKVxuICAgICAgLmZyb20oY2xhaW1zKVxuICAgICAgLndoZXJlKGVxKGNsYWltcy53b3JrSXRlbUlkLCBpdGVtLmlkKSlcbiAgICAgIC5vcmRlckJ5KGFzYyhjbGFpbXMuc2VxKSk7XG4gICAgcmV0dXJuIHJvd3MubWFwKChyb3cpID0+IHRoaXMucHVibGljQ2xhaW0ocm93KSk7XG4gIH1cblxuICBhc3luYyBldmVudHMoc3RyZWFtSWQ/OiBzdHJpbmcpOiBQcm9taXNlPFNwaW5lRXZlbnRbXT4ge1xuICAgIGNvbnN0IHJvd3MgPVxuICAgICAgc3RyZWFtSWQgPT09IHVuZGVmaW5lZFxuICAgICAgICA/IGF3YWl0IHRoaXMuZGIuc2VsZWN0KCkuZnJvbShldmVudHMpLm9yZGVyQnkoYXNjKGV2ZW50cy5nbG9iYWxTZXEpKVxuICAgICAgICA6IGF3YWl0IHRoaXMuZGIuc2VsZWN0KCkuZnJvbShldmVudHMpLndoZXJlKGVxKGV2ZW50cy5zdHJlYW1JZCwgc3RyZWFtSWQpKS5vcmRlckJ5KGFzYyhldmVudHMuZ2xvYmFsU2VxKSk7XG4gICAgcmV0dXJuIHJvd3MubWFwKChyb3cpID0+IHRoaXMuZXZlbnRGcm9tUm93KHJvdykpO1xuICB9XG59XG4iLCAiLyoqXG4gKiBTeW5jaHJvbm91cyBmYWNhZGUgb3ZlciB0aGUgYXN5bmMgUGdFbmdpbmUgcnVubmluZyBpbiBhIHN5bmNraXQgd29ya2VyLlxuICogSW1wbGVtZW50cyB0aGUgZXhhY3QgQG9haHMvY29yZSBTcGluZUVuZ2luZSBpbnRlcmZhY2UsIHNvIHRoZSBjb25mb3JtYW5jZVxuICogc3VpdGUgZHJpdmVzIFBvc3RncmVzIHRocm91Z2ggdGhlIHNhbWUgY2FsbHMgaXQgZHJpdmVzIHRoZSBtZW1vcnkgZW5naW5lLlxuICovXG5pbXBvcnQgeyBjcmVhdGVSZXF1aXJlIH0gZnJvbSAnbm9kZTptb2R1bGUnO1xuaW1wb3J0IHsgZGlybmFtZSwgam9pbiB9IGZyb20gJ25vZGU6cGF0aCc7XG5pbXBvcnQgeyBmaWxlVVJMVG9QYXRoIH0gZnJvbSAnbm9kZTp1cmwnO1xuaW1wb3J0IHsgY3JlYXRlU3luY0ZuIH0gZnJvbSAnc3luY2tpdCc7XG5cbmltcG9ydCB7XG4gIENvbmZsaWN0RXJyb3IsXG4gIEd1YXJkRmFpbGVkRXJyb3IsXG4gIEludmFsaWRUcmFuc2l0aW9uRXJyb3IsXG4gIFBlcm1pc3Npb25EZW5pZWRFcnJvcixcbiAgU3Rvcmllc1ZhbGlkYXRpb25FcnJvcixcbiAgdHlwZSBTcGluZUVuZ2luZSxcbn0gZnJvbSAnQG9haHMvY29yZSc7XG5cbmNvbnN0IGhlcmUgPSBkaXJuYW1lKGZpbGVVUkxUb1BhdGgoaW1wb3J0Lm1ldGEudXJsKSk7XG5jb25zdCB3b3JrZXJQYXRoID0gam9pbihoZXJlLCAnLi4nLCAnZGlzdCcsICd3b3JrZXIubWpzJyk7XG5cbnR5cGUgV2lyZVJlc3VsdCA9XG4gIHwgeyBvazogdHJ1ZTsgdmFsdWU6IHVua25vd24gfVxuICB8IHsgb2s6IGZhbHNlOyBlcnJvcjogeyBuYW1lOiBzdHJpbmc7IG1lc3NhZ2U6IHN0cmluZyB9IH07XG5cbmNvbnN0IGNhbGxXb3JrZXIgPSBjcmVhdGVTeW5jRm4od29ya2VyUGF0aCkgYXMgKG9wOiB1bmtub3duKSA9PiBXaXJlUmVzdWx0O1xuXG5jb25zdCBFUlJPUl9DTEFTU0VTOiBSZWNvcmQ8c3RyaW5nLCBuZXcgKC4uLmFyZ3M6IG5ldmVyW10pID0+IEVycm9yPiA9IHtcbiAgQ29uZmxpY3RFcnJvcjogQ29uZmxpY3RFcnJvciBhcyBuZXZlcixcbiAgR3VhcmRGYWlsZWRFcnJvcjogR3VhcmRGYWlsZWRFcnJvciBhcyBuZXZlcixcbiAgSW52YWxpZFRyYW5zaXRpb25FcnJvcjogSW52YWxpZFRyYW5zaXRpb25FcnJvciBhcyBuZXZlcixcbiAgUGVybWlzc2lvbkRlbmllZEVycm9yOiBQZXJtaXNzaW9uRGVuaWVkRXJyb3IgYXMgbmV2ZXIsXG4gIFN0b3JpZXNWYWxpZGF0aW9uRXJyb3I6IFN0b3JpZXNWYWxpZGF0aW9uRXJyb3IgYXMgbmV2ZXIsXG59O1xuXG5mdW5jdGlvbiByZXRocm93KGVycm9yOiB7IG5hbWU6IHN0cmluZzsgbWVzc2FnZTogc3RyaW5nIH0pOiBuZXZlciB7XG4gIGNvbnN0IENscyA9IEVSUk9SX0NMQVNTRVNbZXJyb3IubmFtZV07XG4gIGlmIChDbHMpIHtcbiAgICAvLyBSZWNvbnN0cnVjdCB3aXRoIHRoZSB3aXJlIG1lc3NhZ2U6IHRoZSBjb25mb3JtYW5jZSBzdWl0ZSBtYXRjaGVzXG4gICAgLy8gY2xhc3Nlcywgbm90IGNvbnN0cnVjdG9yIGFyZ3VtZW50cy5cbiAgICBjb25zdCBpbnN0YW5jZSA9IE9iamVjdC5jcmVhdGUoQ2xzLnByb3RvdHlwZSkgYXMgRXJyb3I7XG4gICAgaW5zdGFuY2UubWVzc2FnZSA9IGVycm9yLm1lc3NhZ2U7XG4gICAgaW5zdGFuY2UubmFtZSA9IGVycm9yLm5hbWU7XG4gICAgdGhyb3cgaW5zdGFuY2U7XG4gIH1cbiAgdGhyb3cgbmV3IEVycm9yKGAke2Vycm9yLm5hbWV9OiAke2Vycm9yLm1lc3NhZ2V9YCk7XG59XG5cbmZ1bmN0aW9uIHVud3JhcChyZXN1bHQ6IFdpcmVSZXN1bHQpOiB1bmtub3duIHtcbiAgaWYgKHJlc3VsdC5vaykgcmV0dXJuIHJlc3VsdC52YWx1ZTtcbiAgcmV0aHJvdyhyZXN1bHQuZXJyb3IpO1xufVxuXG5jb25zdCBNRVRIT0RTOiBBcnJheTxrZXlvZiBTcGluZUVuZ2luZT4gPSBbXG4gICdjcmVhdGVBY3RvcicsXG4gICdncmFudCcsXG4gICdyZXZva2UnLFxuICAnY3JlYXRlRmVhdHVyZScsXG4gICdjcmVhdGVXb3JrSXRlbScsXG4gICdpbXBvcnRTdG9yaWVzJyxcbiAgJ2NsYWltVGFzaycsXG4gICdoZWFydGJlYXQnLFxuICAncmVsZWFzZUNsYWltJyxcbiAgJ2FkdmFuY2VDbG9jaycsXG4gICdhZHZhbmNlU3RhdGUnLFxuICAnYmxvY2tUYXNrJyxcbiAgJ3VuYmxvY2tUYXNrJyxcbiAgJ3N1Ym1pdEV2aWRlbmNlJyxcbiAgJ2FwcHJvdmVHYXRlJyxcbiAgJ3JlamVjdEdhdGUnLFxuICAnZ2V0VGFza0NvbnRleHQnLFxuICAncmVsZWFzZURpc3BhdGNoSG9sZCcsXG4gICdyZWNvbmNpbGUnLFxuICAnZ2V0V29ya0l0ZW0nLFxuICAnZ2V0RmVhdHVyZScsXG4gICdnZXRDbGFpbXMnLFxuICAnbGlzdFdvcmtJdGVtcycsXG4gICdldmVudHMnLFxuXTtcblxuZXhwb3J0IGludGVyZmFjZSBQZ1N5bmNFbmdpbmVPcHRpb25zIHtcbiAgLyoqXG4gICAqIERpcmVjdG9yeSBmb3IgYSBEVVJBQkxFIFBHbGl0ZSBkYXRhYmFzZSAoc3RvcnkgMTMsIGBvYWhzIHNlcnZlIC0tZGF0YWApLlxuICAgKiBPbWl0dGVkIFx1MjE5MiBpbi1tZW1vcnkgZGF0YWJhc2UsIHRydW5jYXRlZCBwZXIgZW5naW5lIChjb25mb3JtYW5jZSBtb2RlKS5cbiAgICovXG4gIGRhdGFEaXI/OiBzdHJpbmc7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVQZ1N5bmNFbmdpbmUob3B0aW9ucz86IFBnU3luY0VuZ2luZU9wdGlvbnMpOiBTcGluZUVuZ2luZSB7XG4gIGNvbnN0IGNyZWF0ZWQgPSB1bndyYXAoXG4gICAgY2FsbFdvcmtlcih7XG4gICAgICBvcDogJ25ldycsXG4gICAgICAuLi4ob3B0aW9ucz8uZGF0YURpciAhPT0gdW5kZWZpbmVkID8geyBkYXRhRGlyOiBvcHRpb25zLmRhdGFEaXIgfSA6IHt9KSxcbiAgICB9KSxcbiAgKSBhcyB7IGVuZ2luZUlkOiBudW1iZXIgfTtcbiAgY29uc3QgZW5naW5lSWQgPSBjcmVhdGVkLmVuZ2luZUlkO1xuICBjb25zdCBwcm94eTogUmVjb3JkPHN0cmluZywgdW5rbm93bj4gPSB7fTtcbiAgZm9yIChjb25zdCBtZXRob2Qgb2YgTUVUSE9EUykge1xuICAgIHByb3h5W21ldGhvZF0gPSAoLi4uYXJnczogdW5rbm93bltdKSA9PlxuICAgICAgdW53cmFwKGNhbGxXb3JrZXIoeyBvcDogJ2NhbGwnLCBlbmdpbmVJZCwgbWV0aG9kLCBhcmdzIH0pKTtcbiAgfVxuICByZXR1cm4gcHJveHkgYXMgdW5rbm93biBhcyBTcGluZUVuZ2luZTtcbn1cblxuLy8gY3JlYXRlUmVxdWlyZSBrZXB0IGZvciBmdXR1cmUgbmF0aXZlLXBnIHBhdGggcmVzb2x1dGlvbjsgaGFybWxlc3MgaWYgdW51c2VkLlxuZXhwb3J0IGNvbnN0IF9yZXF1aXJlID0gY3JlYXRlUmVxdWlyZShpbXBvcnQubWV0YS51cmwpO1xuIiwgIi8qKlxuICogSGFuZC1tYWludGFpbmVkIERETCBtYXRjaGluZyBzY2hlbWEudHMgMS0xIChkcml6emxlLWtpdCBtaWdyYXRpb24gcGlwZWxpbmVcbiAqIGlzIGxhdGVyIGRlYnQpLiBSdW5zIG9uIFBHbGl0ZSBpbiB0aGUgY29uZm9ybWFuY2UgaGFybmVzcyB3b3JrZXIuXG4gKi9cbmV4cG9ydCBjb25zdCBTQ0hFTUFfU1FMID0gYFxuQ1JFQVRFIFRBQkxFIElGIE5PVCBFWElTVFMgYWN0b3JzIChcbiAgaWQgVEVYVCBQUklNQVJZIEtFWSxcbiAgdHlwZSBURVhUIE5PVCBOVUxMLFxuICBkaXNwbGF5X25hbWUgVEVYVCBOT1QgTlVMTFxuKTtcblxuQ1JFQVRFIFRBQkxFIElGIE5PVCBFWElTVFMgZ3JhbnRzIChcbiAgYWN0b3JfaWQgVEVYVCBOT1QgTlVMTCxcbiAgcGVybWlzc2lvbiBURVhUIE5PVCBOVUxMLFxuICBzY29wZSBURVhULFxuICBQUklNQVJZIEtFWSAoYWN0b3JfaWQsIHBlcm1pc3Npb24pXG4pO1xuXG5DUkVBVEUgVEFCTEUgSUYgTk9UIEVYSVNUUyBmZWF0dXJlcyAoXG4gIGlkIFRFWFQgUFJJTUFSWSBLRVksXG4gIHNlcSBTRVJJQUwgTk9UIE5VTEwsXG4gIHN0YXRlIFRFWFQgTk9UIE5VTEwsXG4gIGRpc3BhdGNoX2hvbGQgQk9PTEVBTiBOT1QgTlVMTCBERUZBVUxUIEZBTFNFXG4pO1xuXG5DUkVBVEUgVEFCTEUgSUYgTk9UIEVYSVNUUyB3b3JrX2l0ZW1zIChcbiAgaWQgVEVYVCBQUklNQVJZIEtFWSxcbiAgc2VxIFNFUklBTCBOT1QgTlVMTCxcbiAgZmVhdHVyZV9pZCBURVhUIE5PVCBOVUxMLFxuICBleHRlcm5hbF9rZXkgVEVYVCBOT1QgTlVMTCxcbiAgdGl0bGUgVEVYVCBOT1QgTlVMTCxcbiAgc3RhdGUgVEVYVCBOT1QgTlVMTCxcbiAgYmxvY2tlZF9yZWFzb24gVEVYVCxcbiAgcmV2aWV3X2xvb3BfaXRlcmF0aW9uIElOVEVHRVIgTk9UIE5VTEwgREVGQVVMVCAwLFxuICBpbnRlbnRfaGFzaCBURVhULFxuICBwaW5uZWRfdmVyaWZpY2F0aW9uIEpTT05CLFxuICBzcGVjX2NoZWNrcG9pbnQgQk9PTEVBTiBOT1QgTlVMTCBERUZBVUxUIEZBTFNFLFxuICBkb25lX2NoZWNrcG9pbnQgQk9PTEVBTiBOT1QgTlVMTCBERUZBVUxUIEZBTFNFLFxuICBpbnZva2VfZGV2X3dpdGggVEVYVCBOT1QgTlVMTCBERUZBVUxUICcnLFxuICBzcGVjX3BhdGggVEVYVCBOT1QgTlVMTCxcbiAgc3RhdGVfdmVyc2lvbiBJTlRFR0VSIE5PVCBOVUxMIERFRkFVTFQgMCxcbiAgZGVwZW5kc19vbiBKU09OQiBOT1QgTlVMTCBERUZBVUxUICdbXSc6Ompzb25iLFxuICBsYXN0X2ZlbmNpbmdfdG9rZW4gSU5URUdFUiBOT1QgTlVMTCBERUZBVUxUIDBcbik7XG5cbkNSRUFURSBUQUJMRSBJRiBOT1QgRVhJU1RTIGNsYWltcyAoXG4gIGlkIFRFWFQgUFJJTUFSWSBLRVksXG4gIHNlcSBTRVJJQUwgTk9UIE5VTEwsXG4gIHdvcmtfaXRlbV9pZCBURVhUIE5PVCBOVUxMLFxuICBhY3Rvcl9pZCBURVhUIE5PVCBOVUxMLFxuICBmZW5jaW5nX3Rva2VuIElOVEVHRVIgTk9UIE5VTEwsXG4gIGxlYXNlX2V4cGlyZXNfYXQgQklHSU5UIE5PVCBOVUxMLFxuICByZWxlYXNlZCBCT09MRUFOIE5PVCBOVUxMIERFRkFVTFQgRkFMU0UsXG4gIHR0bF9tcyBCSUdJTlQgTk9UIE5VTExcbik7XG5cbi0tIHJvYWRtYXAgXHUwMEE3MS4zOiBvbmUgbGl2ZSBjbGFpbSBwZXIgd29yayBpdGVtIFx1MjAxNCByYWNlcyBsb3NlIGJ5IGNvbnN0cmFpbnQuXG5DUkVBVEUgVU5JUVVFIElOREVYIElGIE5PVCBFWElTVFMgY2xhaW1zX29uZV9saXZlX3Blcl9pdGVtXG4gIE9OIGNsYWltcyAod29ya19pdGVtX2lkKSBXSEVSRSByZWxlYXNlZCA9IGZhbHNlO1xuXG5DUkVBVEUgVEFCTEUgSUYgTk9UIEVYSVNUUyBnYXRlX2RlY2lzaW9ucyAoXG4gIHNlcSBTRVJJQUwgUFJJTUFSWSBLRVksXG4gIHdvcmtfaXRlbV9pZCBURVhUIE5PVCBOVUxMLFxuICBnYXRlIFRFWFQgTk9UIE5VTEwsXG4gIGRlY2lzaW9uIFRFWFQgTk9UIE5VTEwsXG4gIGFjdG9yX2lkIFRFWFQgTk9UIE5VTExcbik7XG5cbkNSRUFURSBUQUJMRSBJRiBOT1QgRVhJU1RTIGV2aWRlbmNlIChcbiAgc2VxIFNFUklBTCBQUklNQVJZIEtFWSxcbiAgd29ya19pdGVtX2lkIFRFWFQgTk9UIE5VTEwsXG4gIGtpbmQgVEVYVCBOT1QgTlVMTCxcbiAgcGF5bG9hZCBKU09OQiBOT1QgTlVMTFxuKTtcblxuQ1JFQVRFIFRBQkxFIElGIE5PVCBFWElTVFMgZXZlbnRzIChcbiAgZ2xvYmFsX3NlcSBTRVJJQUwgUFJJTUFSWSBLRVksXG4gIHN0cmVhbV90eXBlIFRFWFQgTk9UIE5VTEwsXG4gIHN0cmVhbV9pZCBURVhUIE5PVCBOVUxMLFxuICBzdHJlYW1fc2VxIElOVEVHRVIgTk9UIE5VTEwsXG4gIHR5cGUgVEVYVCBOT1QgTlVMTCxcbiAgYWN0b3JfaWQgVEVYVCBOT1QgTlVMTCxcbiAgcGF5bG9hZCBKU09OQiBOT1QgTlVMTCxcbiAgY2F1c2F0aW9uX2lkIFRFWFQsXG4gIGlkZW1wb3RlbmN5X2tleSBURVhUXG4pO1xuXG4tLSBcdTAwQTcxLjU6IFVOSVFVRShzdHJlYW1faWQsIHN0cmVhbV9zZXEpIGRvdWJsZXMgYXMgdGhlIG9wdGltaXN0aWMgbG9jay5cbkNSRUFURSBVTklRVUUgSU5ERVggSUYgTk9UIEVYSVNUUyBldmVudHNfc3RyZWFtX2lkX3N0cmVhbV9zZXFcbiAgT04gZXZlbnRzIChzdHJlYW1faWQsIHN0cmVhbV9zZXEpO1xuXG5DUkVBVEUgVEFCTEUgSUYgTk9UIEVYSVNUUyBpZGVtcG90ZW5jeV9rZXlzIChcbiAga2V5IFRFWFQgUFJJTUFSWSBLRVksXG4gIHJlc3VsdCBKU09OQiBOT1QgTlVMTFxuKTtcbmA7XG4iLCAiZXhwb3J0IHsgUGdFbmdpbmUgfSBmcm9tICcuL3BnLWVuZ2luZS5qcyc7XG5leHBvcnQgeyBjcmVhdGVQZ1N5bmNFbmdpbmUsIHR5cGUgUGdTeW5jRW5naW5lT3B0aW9ucyB9IGZyb20gJy4vc3luYy1lbmdpbmUuanMnO1xuZXhwb3J0IHsgU0NIRU1BX1NRTCB9IGZyb20gJy4vc2NoZW1hLXNxbC5qcyc7XG5leHBvcnQgKiBhcyBzY2hlbWEgZnJvbSAnLi9zY2hlbWEuanMnO1xuIiwgIi8qKlxuICogQG9haHMvcnVubmVyIFx1MjAxNCB0aGUgQllPIHdvcmtlciBsb29wIChQaGFzZSAxIHN0b3J5IDE0KS5cbiAqXG4gKiBGSVhFRCBJTlRFUkZBQ0UgYmV0d2VlbiB0aGUgb2FocyBDTEkgKGBvYWhzIHdvcmtgKSBhbmQgdGhlIHJ1bm5lciBsaWJyYXJ5LlxuICogVGhlIENMSSB3aXJlcyBmbGFncy9lbnYgaW50byBSdW5uZXJPcHRpb25zIGFuZCBjYWxscyB3b3JrTG9vcC9ydW5PbmNlOyBhbGxcbiAqIHJ1bm5lciBsb2dpYyBsaXZlcyBoZXJlLlxuICpcbiAqIENvbnRyYWN0IChwcm9kdWN0LXJvYWRtYXAubWQgXHUwMEE3Mi4zKTpcbiAqICAxLiBwb2xsIGxpc3Rfd29ya19pdGVtcyhzdGF0ZT1yZWFkeV9mb3JfZGV2LCBjbGFpbWFibGUpIFx1MjE5MiBjbGFpbV90YXNrXG4gKiAgICAgKGNyYXNoIHJlLWRpc3BhdGNoOiBhbiBpbl9wcm9ncmVzcyBpdGVtIHdpdGggTk8gbGl2ZSBjbGFpbSBpcyBhIGRlYWRcbiAqICAgICB3b3JrZXIncyBydW4gXHUyMDE0IHBvbGxlZCBhcyBhIGZhbGxiYWNrIHNvIHJlY292ZXJ5IHVzZXMgdGhlIHNhbWUgbG9vcClcbiAqICAyLiB3b3JrdHJlZSBuYW1lZCBieSBjbGFpbSBpZDsgYnJhbmNoIGBjbGFpbS88Y2xhaW1JZD5gXG4gKiAgMy4gbWlycm9yLW9uLWRpc3BhdGNoOiBzdGFtcCBzcGVjIGZyb250bWF0dGVyIHRvIHRoZSBEQiBlbnRyeSBzdGF0ZVxuICogIDQuIGFkdmFuY2Vfc3RhdGUodG89aW5fcHJvZ3Jlc3MpIEJFRk9SRSB0aGUgYWdlbnQgcnVucyBcdTIwMTQgREIgaXMgdGhlIGVudHJ5IHN0YXRlXG4gKiAgNS4gaW52b2tlIHRoZSBjb2RpbmcgYWdlbnQgKHRlbXBsYXRlOyB1bm1vZGlmaWVkIGJtYWQtZGV2LWF1dG8gY29udGVudClcbiAqICA2LiBwYXJzZSBIQUxUICsgQXV0byBSdW4gUmVzdWx0IFx1MjE5MiBoYWx0X3JlcG9ydCBldmlkZW5jZSAodmVyYmF0aW0pXG4gKiAgNy4gcnVuIFBJTk5FRCB2ZXJpZmljYXRpb24gY29tbWFuZHMgb25seSAoYWxsb3dsaXN0ZWQpIFx1MjE5MiB0ZXN0X3J1biBldmlkZW5jZVxuICogIDguIHB1c2ggYnJhbmNoIFx1MjE5MiBnaXRfZGlmZiArIGNvbW1pdCBldmlkZW5jZSAocmVtb3RlIHJlYWNoYWJpbGl0eSBtZWFzdXJlZClcbiAqICA5LiBhZHZhbmNlX3N0YXRlIC8gYmxvY2tfdGFzayBwZXIgSEFMVCBzdGF0dXMgXHUyMDE0IHRoZSBjb3JlIGNvbXB1dGVzIHZlcmRpY3RzXG4gKiAxMC4gY3Jhc2ggcmVjb3Zlcnkgb24gcmUtY2xhaW06IGFkb3B0IGEgZGVjZW50bHktZmluaXNoZWQgd29ya3RyZWUgKHRlcm1pbmFsXG4gKiAgICAgZnJvbnRtYXR0ZXIgKyBhIHJlYWwgY29tbWl0IHBhc3QgaXRzIGJhc2VsaW5lKSB3aXRoIGxhdGUgZXZpZGVuY2VcbiAqICAgICBzdWJtaXNzaW9uOyBhIHdyZWNrZWQgd29ya3RyZWUgaXMgY2xlYW5lZCBhbmQgYmxvY2tlZCBgc3RhbGVfd29ya3RyZWVgLlxuICpcbiAqIEFnZW50IGludm9jYXRpb24gZW52aXJvbm1lbnQgKHBhcnQgb2YgdGhpcyBpbnRlcmZhY2UpOiB0aGUgYWdlbnQgY29tbWFuZFxuICogdGVtcGxhdGUgaXMgZXhwYW5kZWQgKHtTUEVDX0ZPTERFUn0ge1NUT1JZX0lEfSB7SU5WT0tFX1dJVEh9IHtXT1JLVFJFRX0pLFxuICogcnVuIHdpdGggY3dkID0gdGhlIGNsYWltIHdvcmt0cmVlLCBhbmQgcmVjZWl2ZXMgdHdvIGV4dHJhIGVudiB2YXJzOlxuICogICBPQUhTX1NQRUNfRklMRSBcdTIwMTQgYWJzb2x1dGUgcGF0aCBvZiB0aGUgc3Rvcnkgc3BlYyBmaWxlIGluc2lkZSB0aGUgd29ya3RyZWVcbiAqICAgT0FIU19TVE9SWV9JRCAgXHUyMDE0IHRoZSB3b3JrIGl0ZW0gZXh0ZXJuYWxLZXkgKHN0b3JpZXMueWFtbCBpZClcbiAqL1xuaW1wb3J0IHsgc3Bhd25TeW5jIH0gZnJvbSAnbm9kZTpjaGlsZF9wcm9jZXNzJztcbmltcG9ydCB7XG4gIGV4aXN0c1N5bmMsXG4gIG1rZGlyU3luYyxcbiAgcmVhZGRpclN5bmMsXG4gIHJlYWRGaWxlU3luYyxcbiAgcm1TeW5jLFxuICBzdGF0U3luYyxcbiAgd3JpdGVGaWxlU3luYyxcbn0gZnJvbSAnbm9kZTpmcyc7XG5pbXBvcnQgeyBqb2luLCByZXNvbHZlIH0gZnJvbSAnbm9kZTpwYXRoJztcbmltcG9ydCB7IHBhcnNlIGFzIHBhcnNlWWFtbCB9IGZyb20gJ3lhbWwnO1xuaW1wb3J0IHR5cGUgeyBPYWhzQ2xpZW50IH0gZnJvbSAnQG9haHMvY29udHJhY3RzJztcbmltcG9ydCB0eXBlIHsgQmxvY2tlZFJlYXNvbiwgQ2xhaW0sIEV2aWRlbmNlLCBXb3JrSXRlbSwgV29ya0l0ZW1TdGF0ZSB9IGZyb20gJ0BvYWhzL2NvcmUnO1xuXG5leHBvcnQgaW50ZXJmYWNlIFJ1bm5lck9wdGlvbnMge1xuICBjbGllbnQ6IE9haHNDbGllbnQ7XG4gIC8qKiBBYnNvbHV0ZSBwYXRoIG9mIHRoZSB0YXJnZXQgcHJvamVjdCBnaXQgY2hlY2tvdXQuICovXG4gIHJlcG9QYXRoOiBzdHJpbmc7XG4gIC8qKiBTcGVjIGZvbGRlciAocmVsYXRpdmUgdG8gcmVwbyByb290KSBob2xkaW5nIFNQRUMubWQgKyBzdG9yaWVzLnlhbWwgKyBzdG9yaWVzLy4gKi9cbiAgc3BlY0ZvbGRlcjogc3RyaW5nO1xuICAvKipcbiAgICogQ29kaW5nLWFnZW50IGNvbW1hbmQgdGVtcGxhdGUuIFBsYWNlaG9sZGVyczoge1NQRUNfRk9MREVSfSB7U1RPUllfSUR9XG4gICAqIHtJTlZPS0VfV0lUSH0ge1dPUktUUkVFfS4gRXhlY3V0ZWQgd2l0aCBjd2QgPSB0aGUgY2xhaW0gd29ya3RyZWUuXG4gICAqL1xuICBhZ2VudENtZDogc3RyaW5nO1xuICAvKiogUG9sbCBpbnRlcnZhbCBmb3Igd29ya0xvb3AgKG1zKS4gRGVmYXVsdCAxNV8wMDAuICovXG4gIHBvbGxNcz86IG51bWJlcjtcbiAgLyoqIEJpbmFyaWVzIHBpbm5lZCB2ZXJpZmljYXRpb24gY29tbWFuZHMgbWF5IHN0YXJ0IHdpdGguICovXG4gIHZlcmlmaWNhdGlvbkFsbG93bGlzdD86IHN0cmluZ1tdO1xuICAvKiogR2l0IHJlbW90ZSB0byBwdXNoIGNsYWltIGJyYW5jaGVzIHRvLiBEZWZhdWx0ICdvcmlnaW4nLiAqL1xuICByZW1vdGU/OiBzdHJpbmc7XG4gIC8qKiBURVNUIE9OTFk6IGRpZSBhdCBhIHNwZWNpZmljIHBvaW50IHRvIGV4ZXJjaXNlIGNyYXNoIHJlY292ZXJ5LiAqL1xuICBmYWlscG9pbnQ/OiAnYmVmb3JlX3JlcG9ydCc7XG4gIC8qKiBNYXggd2FsbCB0aW1lIGZvciBvbmUgYWdlbnQgaW52b2NhdGlvbiAobXMpLiBEZWZhdWx0IDMwIG1pbnV0ZXMuICovXG4gIGFnZW50VGltZW91dE1zPzogbnVtYmVyO1xuICAvKiogRXh0cmEgZW52aXJvbm1lbnQgdmFyaWFibGVzIHBhc3NlZCB0byB0aGUgYWdlbnQgaW52b2NhdGlvbi4gKi9cbiAgYWdlbnRFbnY/OiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+O1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFJ1bk9uY2VSZXN1bHQge1xuICBkaXNwYXRjaGVkOiBib29sZWFuO1xuICB3b3JrSXRlbUlkPzogc3RyaW5nO1xuICBleHRlcm5hbEtleT86IHN0cmluZztcbiAgb3V0Y29tZT86ICdpbl9yZXZpZXcnIHwgJ2Jsb2NrZWQnIHwgJ2Fkb3B0ZWRfaW5fcmV2aWV3JyB8ICdjcmFzaGVkJztcbiAgZGV0YWlscz86IHN0cmluZztcbiAgLyoqIENsYWltIHRha2VuIGJ5IHRoaXMgcnVuIChicmFuY2ggaXMgYGNsYWltLzxjbGFpbUlkPmApLiAqL1xuICBjbGFpbUlkPzogc3RyaW5nO1xuICAvKiogUmF3IGV2aWRlbmNlIHN1Ym1pdHRlZCBkdXJpbmcgdGhpcyBydW4sIGluIHN1Ym1pc3Npb24gb3JkZXIuICovXG4gIGV2aWRlbmNlPzogRXZpZGVuY2VbXTtcbn1cblxuLyoqIEJpbmFyaWVzIGEgcGlubmVkIHZlcmlmaWNhdGlvbiBjb21tYW5kIG1heSBzdGFydCB3aXRoIChmaXJzdCB0b2tlbikuICovXG5leHBvcnQgY29uc3QgREVGQVVMVF9WRVJJRklDQVRJT05fQUxMT1dMSVNUOiByZWFkb25seSBzdHJpbmdbXSA9IFtcbiAgJ25vZGUnLFxuICAnbnBtJyxcbiAgJ3BucG0nLFxuICAnbnB4JyxcbiAgJ3B5dGVzdCcsXG4gICdweXRob24zJyxcbiAgJ3NoJyxcbiAgJ2Jhc2gnLFxuICAnZ2l0Jyxcbl07XG5cbi8qKiBNYXJrZXIgZHJvcHBlZCBpbiBldmVyeSBjbGFpbSB3b3JrdHJlZSBzbyBhIGxhdGVyIGNsYWltIGNhbiBtYXAgaXQgYmFjay4gKi9cbmNvbnN0IE1BUktFUl9GSUxFID0gJy5vYWhzLXdvcmstaXRlbSc7XG5cbi8qKiBEQiBzdGF0ZSBcdTIxOTIgc3BlYy1maWxlIGZyb250bWF0dGVyIHZvY2FidWxhcnkgKGRldi1hdXRvIGZpbGUgZGlhbGVjdCkuICovXG5jb25zdCBFTlRSWV9TVEFUVVM6IFJlYWRvbmx5PFBhcnRpYWw8UmVjb3JkPFdvcmtJdGVtU3RhdGUsIHN0cmluZz4+PiA9IHtcbiAgcmVhZHlfZm9yX2RldjogJ3JlYWR5LWZvci1kZXYnLFxuICBpbl9wcm9ncmVzczogJ2luLXByb2dyZXNzJyxcbiAgaW5fcmV2aWV3OiAnaW4tcmV2aWV3Jyxcbn07XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gZ2l0IHBsdW1iaW5nIChjaGlsZF9wcm9jZXNzIG9ubHkgXHUyMDE0IG5vIGV4dGVybmFsIGRlcHMpXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuLyoqIFJ1biBhIGdpdCBjb21tYW5kOyB0aHJvd3Mgb24gbm9uLXplcm8gZXhpdDsgcmV0dXJucyB0cmltbWVkIHN0ZG91dC4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnaXQoYXJnczogc3RyaW5nW10sIGN3ZDogc3RyaW5nKTogc3RyaW5nIHtcbiAgY29uc3QgcmVzdWx0ID0gc3Bhd25TeW5jKCdnaXQnLCBhcmdzLCB7IGN3ZCwgZW5jb2Rpbmc6ICd1dGY4JyB9KTtcbiAgaWYgKHJlc3VsdC5lcnJvcikgdGhyb3cgcmVzdWx0LmVycm9yO1xuICBpZiAocmVzdWx0LnN0YXR1cyAhPT0gMCkge1xuICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgIGBnaXQgJHthcmdzLmpvaW4oJyAnKX0gZmFpbGVkIHdpdGggZXhpdCAke1N0cmluZyhyZXN1bHQuc3RhdHVzKX06ICR7cmVzdWx0LnN0ZGVyci50cmltKCl9YCxcbiAgICApO1xuICB9XG4gIHJldHVybiByZXN1bHQuc3Rkb3V0LnRyaW0oKTtcbn1cblxuLyoqXG4gKiBLZWVwIHJ1bm5lciBib29ra2VlcGluZyBvdXQgb2YgYWdlbnQgY29tbWl0czogdGhlIG1hcmtlciBmaWxlIGFuZCB0aGVcbiAqIHdvcmt0cmVlIHJvb3QgYXJlIGFkZGVkIHRvICRHSVRfQ09NTU9OX0RJUi9pbmZvL2V4Y2x1ZGUgKHNoYXJlZCBieSBhbGxcbiAqIHdvcmt0cmVlcyksIHNvIGFuIGFnZW50J3MgYGdpdCBhZGQgLUFgIG5ldmVyIHBpY2tzIHRoZW0gdXAuXG4gKi9cbmZ1bmN0aW9uIGVuc3VyZUdpdEV4Y2x1ZGVzKHJlcG9QYXRoOiBzdHJpbmcpOiB2b2lkIHtcbiAgY29uc3QgZ2l0RGlyID0gam9pbihyZXBvUGF0aCwgJy5naXQnKTtcbiAgdHJ5IHtcbiAgICBpZiAoIXN0YXRTeW5jKGdpdERpcikuaXNEaXJlY3RvcnkoKSkgcmV0dXJuOyAvLyByZXBvUGF0aCBpcyBpdHNlbGYgYSB3b3JrdHJlZSBcdTIwMTQgc2tpcFxuICB9IGNhdGNoIHtcbiAgICByZXR1cm47XG4gIH1cbiAgY29uc3QgaW5mb0RpciA9IGpvaW4oZ2l0RGlyLCAnaW5mbycpO1xuICBta2RpclN5bmMoaW5mb0RpciwgeyByZWN1cnNpdmU6IHRydWUgfSk7XG4gIGNvbnN0IGV4Y2x1ZGVQYXRoID0gam9pbihpbmZvRGlyLCAnZXhjbHVkZScpO1xuICBjb25zdCBjdXJyZW50ID0gZXhpc3RzU3luYyhleGNsdWRlUGF0aCkgPyByZWFkRmlsZVN5bmMoZXhjbHVkZVBhdGgsICd1dGY4JykgOiAnJztcbiAgY29uc3Qgd2FudGVkID0gWycub2Focy8nLCBNQVJLRVJfRklMRV07XG4gIGNvbnN0IGhhdmUgPSBuZXcgU2V0KGN1cnJlbnQuc3BsaXQoJ1xcbicpLm1hcCgobGluZSkgPT4gbGluZS50cmltKCkpKTtcbiAgY29uc3QgbWlzc2luZyA9IHdhbnRlZC5maWx0ZXIoKGxpbmUpID0+ICFoYXZlLmhhcyhsaW5lKSk7XG4gIGlmIChtaXNzaW5nLmxlbmd0aCA9PT0gMCkgcmV0dXJuO1xuICBjb25zdCBwcmVmaXggPSBjdXJyZW50ID09PSAnJyB8fCBjdXJyZW50LmVuZHNXaXRoKCdcXG4nKSA/IGN1cnJlbnQgOiBgJHtjdXJyZW50fVxcbmA7XG4gIHdyaXRlRmlsZVN5bmMoZXhjbHVkZVBhdGgsIGAke3ByZWZpeH0ke21pc3Npbmcuam9pbignXFxuJyl9XFxuYCwgJ3V0ZjgnKTtcbn1cblxuZnVuY3Rpb24gcmVtb3ZlV29ya3RyZWUoZGlyOiBzdHJpbmcsIHJlcG9QYXRoOiBzdHJpbmcpOiB2b2lkIHtcbiAgdHJ5IHtcbiAgICBnaXQoWyd3b3JrdHJlZScsICdyZW1vdmUnLCAnLS1mb3JjZScsIGRpcl0sIHJlcG9QYXRoKTtcbiAgfSBjYXRjaCB7XG4gICAgdHJ5IHtcbiAgICAgIHJtU3luYyhkaXIsIHsgcmVjdXJzaXZlOiB0cnVlLCBmb3JjZTogdHJ1ZSB9KTtcbiAgICAgIGdpdChbJ3dvcmt0cmVlJywgJ3BydW5lJ10sIHJlcG9QYXRoKTtcbiAgICB9IGNhdGNoIHtcbiAgICAgIC8qIGJlc3QgZWZmb3J0IFx1MjAxNCBhIGxlZnRvdmVyIGRpciBpcyByZS1kZXRlY3RlZCBhcyBhIHN0YWxlIHdvcmt0cmVlICovXG4gICAgfVxuICB9XG59XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gV29ya3RyZWUgbWFya2VyIChjcmFzaC1yZWNvdmVyeSBib29ra2VlcGluZylcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5pbnRlcmZhY2UgV29ya3RyZWVNYXJrZXIge1xuICB3b3JrSXRlbUlkOiBzdHJpbmc7XG4gIGNsYWltSWQ6IHN0cmluZztcbiAgYmFzZWxpbmU6IHN0cmluZztcbiAgLyoqIEhvdyBtYW55IHRpbWVzIGFuIGFnZW50IHdhcyBpbnZva2VkIGluc2lkZSB0aGlzIHdvcmt0cmVlLiAqL1xuICBpbnZvY2F0aW9uczogbnVtYmVyO1xufVxuXG5mdW5jdGlvbiB3cml0ZU1hcmtlcih3b3JrdHJlZURpcjogc3RyaW5nLCBtYXJrZXI6IFdvcmt0cmVlTWFya2VyKTogdm9pZCB7XG4gIHdyaXRlRmlsZVN5bmMoam9pbih3b3JrdHJlZURpciwgTUFSS0VSX0ZJTEUpLCBgJHtKU09OLnN0cmluZ2lmeShtYXJrZXIsIG51bGwsIDIpfVxcbmAsICd1dGY4Jyk7XG59XG5cbmZ1bmN0aW9uIHJlYWRNYXJrZXIod29ya3RyZWVEaXI6IHN0cmluZyk6IFdvcmt0cmVlTWFya2VyIHwgbnVsbCB7XG4gIGNvbnN0IHBhdGggPSBqb2luKHdvcmt0cmVlRGlyLCBNQVJLRVJfRklMRSk7XG4gIGlmICghZXhpc3RzU3luYyhwYXRoKSkgcmV0dXJuIG51bGw7XG4gIHRyeSB7XG4gICAgY29uc3QgcmF3ID0gSlNPTi5wYXJzZShyZWFkRmlsZVN5bmMocGF0aCwgJ3V0ZjgnKSkgYXMgUGFydGlhbDxXb3JrdHJlZU1hcmtlcj47XG4gICAgaWYgKHR5cGVvZiByYXcud29ya0l0ZW1JZCAhPT0gJ3N0cmluZycgfHwgdHlwZW9mIHJhdy5iYXNlbGluZSAhPT0gJ3N0cmluZycpIHJldHVybiBudWxsO1xuICAgIHJldHVybiB7XG4gICAgICB3b3JrSXRlbUlkOiByYXcud29ya0l0ZW1JZCxcbiAgICAgIGNsYWltSWQ6IHR5cGVvZiByYXcuY2xhaW1JZCA9PT0gJ3N0cmluZycgPyByYXcuY2xhaW1JZCA6ICcnLFxuICAgICAgYmFzZWxpbmU6IHJhdy5iYXNlbGluZSxcbiAgICAgIGludm9jYXRpb25zOiB0eXBlb2YgcmF3Lmludm9jYXRpb25zID09PSAnbnVtYmVyJyA/IHJhdy5pbnZvY2F0aW9ucyA6IDAsXG4gICAgfTtcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn1cblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBTcGVjIGZpbGUgcmVhZGluZyAoZnJvbnRtYXR0ZXIgKyBIQUxUIHJlcG9ydClcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5pbnRlcmZhY2UgU3BlY1JlcG9ydCB7XG4gIHN0YXR1czogc3RyaW5nIHwgbnVsbDtcbiAgYmxvY2tpbmdDb25kaXRpb246IHN0cmluZyB8IG51bGw7XG4gIGF1dG9SdW5SZXN1bHQ6IHN0cmluZyB8IG51bGw7XG59XG5cbmZ1bmN0aW9uIHNwbGl0RnJvbnRtYXR0ZXIocmF3OiBzdHJpbmcpOiB7IGRhdGE6IFJlY29yZDxzdHJpbmcsIHVua25vd24+OyBib2R5OiBzdHJpbmcgfSB7XG4gIGlmICghcmF3LnN0YXJ0c1dpdGgoJy0tLScpKSByZXR1cm4geyBkYXRhOiB7fSwgYm9keTogcmF3IH07XG4gIGNvbnN0IGNsb3NlID0gcmF3LmluZGV4T2YoJ1xcbi0tLScsIDMpO1xuICBpZiAoY2xvc2UgPT09IC0xKSByZXR1cm4geyBkYXRhOiB7fSwgYm9keTogcmF3IH07XG4gIGNvbnN0IGZpcnN0TmV3bGluZSA9IHJhdy5pbmRleE9mKCdcXG4nKTtcbiAgY29uc3QgYmxvY2sgPSByYXcuc2xpY2UoZmlyc3ROZXdsaW5lICsgMSwgY2xvc2UpO1xuICBjb25zdCBib2R5U3RhcnQgPSByYXcuaW5kZXhPZignXFxuJywgY2xvc2UgKyAxKTtcbiAgY29uc3QgYm9keSA9IGJvZHlTdGFydCA9PT0gLTEgPyAnJyA6IHJhdy5zbGljZShib2R5U3RhcnQgKyAxKTtcbiAgbGV0IGRhdGE6IHVua25vd24gPSB7fTtcbiAgdHJ5IHtcbiAgICBkYXRhID0gcGFyc2VZYW1sKGJsb2NrKTtcbiAgfSBjYXRjaCB7XG4gICAgZGF0YSA9IHt9O1xuICB9XG4gIGNvbnN0IHJlY29yZCA9XG4gICAgdHlwZW9mIGRhdGEgPT09ICdvYmplY3QnICYmIGRhdGEgIT09IG51bGwgJiYgIUFycmF5LmlzQXJyYXkoZGF0YSlcbiAgICAgID8gKGRhdGEgYXMgUmVjb3JkPHN0cmluZywgdW5rbm93bj4pXG4gICAgICA6IHt9O1xuICByZXR1cm4geyBkYXRhOiByZWNvcmQsIGJvZHkgfTtcbn1cblxuLyoqIFZlcmJhdGltICcjIyBBdXRvIFJ1biBSZXN1bHQnIHNlY3Rpb24gKGhlYWRpbmcgaW5jbHVkZWQpLCB1cCB0byB0aGUgbmV4dCBIMi4gKi9cbmZ1bmN0aW9uIGV4dHJhY3RBdXRvUnVuUmVzdWx0KGJvZHk6IHN0cmluZyk6IHN0cmluZyB8IG51bGwge1xuICBjb25zdCBsaW5lcyA9IGJvZHkuc3BsaXQoJ1xcbicpO1xuICBjb25zdCBzdGFydCA9IGxpbmVzLmZpbmRJbmRleCgobGluZSkgPT4gL14jI1xccythdXRvIHJ1biByZXN1bHRcXHMqJC9pLnRlc3QobGluZS50cmltKCkpKTtcbiAgaWYgKHN0YXJ0ID09PSAtMSkgcmV0dXJuIG51bGw7XG4gIGxldCBlbmQgPSBsaW5lcy5sZW5ndGg7XG4gIGZvciAobGV0IGkgPSBzdGFydCArIDE7IGkgPCBsaW5lcy5sZW5ndGg7IGkgKz0gMSkge1xuICAgIGNvbnN0IGxpbmUgPSBsaW5lc1tpXTtcbiAgICBpZiAobGluZSAhPT0gdW5kZWZpbmVkICYmIC9eIyNcXHMrLy50ZXN0KGxpbmUpKSB7XG4gICAgICBlbmQgPSBpO1xuICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG4gIHJldHVybiBsaW5lcy5zbGljZShzdGFydCwgZW5kKS5qb2luKCdcXG4nKS50cmltRW5kKCk7XG59XG5cbmZ1bmN0aW9uIHJlYWRTcGVjUmVwb3J0KHNwZWNBYnNQYXRoOiBzdHJpbmcpOiBTcGVjUmVwb3J0IHtcbiAgaWYgKCFleGlzdHNTeW5jKHNwZWNBYnNQYXRoKSkge1xuICAgIHJldHVybiB7IHN0YXR1czogbnVsbCwgYmxvY2tpbmdDb25kaXRpb246IG51bGwsIGF1dG9SdW5SZXN1bHQ6IG51bGwgfTtcbiAgfVxuICBjb25zdCB7IGRhdGEsIGJvZHkgfSA9IHNwbGl0RnJvbnRtYXR0ZXIocmVhZEZpbGVTeW5jKHNwZWNBYnNQYXRoLCAndXRmOCcpKTtcbiAgY29uc3Qgc3RhdHVzUmF3ID0gZGF0YVsnc3RhdHVzJ107XG4gIGNvbnN0IHN0YXR1cyA9XG4gICAgdHlwZW9mIHN0YXR1c1JhdyA9PT0gJ3N0cmluZycgPyBzdGF0dXNSYXcgOiBzdGF0dXNSYXcgIT0gbnVsbCA/IFN0cmluZyhzdGF0dXNSYXcpIDogbnVsbDtcbiAgY29uc3QgYXV0b1J1blJlc3VsdCA9IGV4dHJhY3RBdXRvUnVuUmVzdWx0KGJvZHkpO1xuICBsZXQgYmxvY2tpbmdDb25kaXRpb24gPVxuICAgIHR5cGVvZiBkYXRhWydibG9ja2luZ19jb25kaXRpb24nXSA9PT0gJ3N0cmluZycgPyBkYXRhWydibG9ja2luZ19jb25kaXRpb24nXSA6IG51bGw7XG4gIGlmIChibG9ja2luZ0NvbmRpdGlvbiA9PT0gbnVsbCAmJiBhdXRvUnVuUmVzdWx0ICE9PSBudWxsKSB7XG4gICAgY29uc3QgbWF0Y2ggPSAvXmJsb2NraW5nIGNvbmRpdGlvbjpcXHMqKC4rKSQvaW0uZXhlYyhhdXRvUnVuUmVzdWx0KTtcbiAgICBibG9ja2luZ0NvbmRpdGlvbiA9IG1hdGNoPy5bMV0/LnRyaW0oKSA/PyBudWxsO1xuICB9XG4gIHJldHVybiB7IHN0YXR1cywgYmxvY2tpbmdDb25kaXRpb24sIGF1dG9SdW5SZXN1bHQgfTtcbn1cblxuLyoqIFJld3JpdGUgKG9yIGluc2VydCkgdGhlIGZyb250bWF0dGVyIGBzdGF0dXM6YCBsaW5lLCBwcmVzZXJ2aW5nIGV2ZXJ5dGhpbmcgZWxzZS4gKi9cbmZ1bmN0aW9uIHNldEZyb250bWF0dGVyU3RhdHVzKHNwZWNBYnNQYXRoOiBzdHJpbmcsIHN0YXR1czogc3RyaW5nKTogdm9pZCB7XG4gIGNvbnN0IHJhdyA9IHJlYWRGaWxlU3luYyhzcGVjQWJzUGF0aCwgJ3V0ZjgnKTtcbiAgaWYgKHJhdy5zdGFydHNXaXRoKCctLS0nKSkge1xuICAgIGNvbnN0IGNsb3NlID0gcmF3LmluZGV4T2YoJ1xcbi0tLScsIDMpO1xuICAgIGlmIChjbG9zZSAhPT0gLTEpIHtcbiAgICAgIGNvbnN0IGhlYWQgPSByYXcuc2xpY2UoMCwgY2xvc2UpO1xuICAgICAgY29uc3QgcmVzdCA9IHJhdy5zbGljZShjbG9zZSk7XG4gICAgICBjb25zdCByZXBsYWNlZCA9IC9ec3RhdHVzOi4qJC9tLnRlc3QoaGVhZClcbiAgICAgICAgPyBoZWFkLnJlcGxhY2UoL15zdGF0dXM6LiokL20sIGBzdGF0dXM6ICR7c3RhdHVzfWApXG4gICAgICAgIDogYCR7aGVhZH1cXG5zdGF0dXM6ICR7c3RhdHVzfWA7XG4gICAgICB3cml0ZUZpbGVTeW5jKHNwZWNBYnNQYXRoLCByZXBsYWNlZCArIHJlc3QsICd1dGY4Jyk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICB9XG4gIHdyaXRlRmlsZVN5bmMoc3BlY0Fic1BhdGgsIGAtLS1cXG5zdGF0dXM6ICR7c3RhdHVzfVxcbi0tLVxcbiR7cmF3fWAsICd1dGY4Jyk7XG59XG5cbmZ1bmN0aW9uIG5vcm1hbGl6ZVN0YXR1cyhzdGF0dXM6IHN0cmluZyB8IG51bGwpOiBzdHJpbmcgfCBudWxsIHtcbiAgaWYgKHN0YXR1cyA9PT0gbnVsbCkgcmV0dXJuIG51bGw7XG4gIGNvbnN0IGZsYXQgPSBzdGF0dXMudHJpbSgpLnRvTG93ZXJDYXNlKCkucmVwbGFjZUFsbCgnLScsICdfJyk7XG4gIHJldHVybiBmbGF0ID09PSAncmV2aWV3JyA/ICdpbl9yZXZpZXcnIDogZmxhdDtcbn1cblxuLyoqIGRldi1hdXRvIEhBTFQgYmxvY2tpbmcgY29uZGl0aW9uIFx1MjE5MiBCTE9DS0VEX1JFQVNPTlMgdGF4b25vbXkgKGRlZmF1bHQgJ290aGVyJykuICovXG5mdW5jdGlvbiBtYXBCbG9ja2luZ0NvbmRpdGlvbihjb25kaXRpb246IHN0cmluZyB8IG51bGwpOiBCbG9ja2VkUmVhc29uIHtcbiAgaWYgKGNvbmRpdGlvbiA9PT0gbnVsbCkgcmV0dXJuICdvdGhlcic7XG4gIGNvbnN0IGMgPSBjb25kaXRpb24udG9Mb3dlckNhc2UoKTtcbiAgaWYgKGMuaW5jbHVkZXMoJ3JldmlldyByZXBhaXIgbG9vcCBleGNlZWRlZCcpKSByZXR1cm4gJ3Jldmlld19ub25fY29udmVyZ2VuY2UnO1xuICBpZiAoYy5pbmNsdWRlcygndW5jbGVhciBpbnRlbnQnKSkgcmV0dXJuICd1bmNsZWFyX2ludGVudCc7XG4gIGlmIChjLmluY2x1ZGVzKCdubyBzdG9yaWVzLnlhbWwnKSkgcmV0dXJuICdub19zdG9yaWVzX3lhbWxfZm91bmQnO1xuICBpZiAoYy5pbmNsdWRlcygnYW1iaWd1b3VzIHN0b3J5IGZpbGUgbWF0Y2gnKSkgcmV0dXJuICdhbWJpZ3VvdXNfc3RvcnlfZmlsZV9tYXRjaCc7XG4gIGlmIChjLmluY2x1ZGVzKCdubyBzdWJhZ2VudHMnKSkgcmV0dXJuICdub19zdWJhZ2VudHMnO1xuICByZXR1cm4gJ290aGVyJztcbn1cblxuZnVuY3Rpb24gaXNSZW1vdGVFcnJvcihlcnJvcjogdW5rbm93biwgbmFtZTogc3RyaW5nKTogYm9vbGVhbiB7XG4gIHJldHVybiAoXG4gICAgdHlwZW9mIGVycm9yID09PSAnb2JqZWN0JyAmJlxuICAgIGVycm9yICE9PSBudWxsICYmXG4gICAgKGVycm9yIGFzIHsgZXJyb3JOYW1lPzogdW5rbm93biB9KS5lcnJvck5hbWUgPT09IG5hbWVcbiAgKTtcbn1cblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBTdGVwcyA2XHUyMDEzOTogbWVhc3VyZSwgc3VibWl0IHJhdyBldmlkZW5jZSwgcm91dGUgYnkgSEFMVCBzdGF0dXNcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5pbnRlcmZhY2UgRmluaXNoQXJncyB7XG4gIGNsaWVudDogT2Foc0NsaWVudDtcbiAgd29ya0l0ZW06IFdvcmtJdGVtO1xuICBjbGFpbTogQ2xhaW07XG4gIC8qKiBEaXJlY3RvcnkgaG9sZGluZyB0aGUgcnVuJ3MgZmlsZXMgKGZyZXNoIHdvcmt0cmVlLCBvciB0aGUgYWRvcHRlZCBvbmUpLiAqL1xuICB3b3JrRGlyOiBzdHJpbmc7XG4gIC8qKiBTcGVjIGZpbGUgcGF0aCByZWxhdGl2ZSB0byB0aGUgcmVwbyByb290LiAqL1xuICBzcGVjUmVsOiBzdHJpbmc7XG4gIGJhc2VsaW5lOiBzdHJpbmc7XG4gIGJyYW5jaDogc3RyaW5nO1xuICByZXBvUGF0aDogc3RyaW5nO1xuICByZW1vdGU6IHN0cmluZztcbiAgYWxsb3dsaXN0OiByZWFkb25seSBzdHJpbmdbXTtcbiAgLyoqIG51bGwgd2hlbiBhZG9wdGluZyAodGhlIGFnZW50IHdhcyBpbnZva2VkIGJ5IHRoZSBjcmFzaGVkIHJ1bikuICovXG4gIGFnZW50RXhpdENvZGU6IG51bWJlciB8IG51bGw7XG4gIHN1Ym1pdDogKGtpbmQ6IEV2aWRlbmNlWydraW5kJ10sIHBheWxvYWQ6IFJlY29yZDxzdHJpbmcsIHVua25vd24+KSA9PiBQcm9taXNlPHZvaWQ+O1xufVxuXG5hc3luYyBmdW5jdGlvbiBmaW5pc2hSdW4oYXJnczogRmluaXNoQXJncyk6IFByb21pc2U8J2luX3JldmlldycgfCAnYmxvY2tlZCc+IHtcbiAgY29uc3QgeyBjbGllbnQsIHdvcmtJdGVtLCBjbGFpbSB9ID0gYXJncztcblxuICAvLyA2IFx1MjAxNCBwYXJzZSBIQUxUOiBmcm9udG1hdHRlciBzdGF0dXMgKyB2ZXJiYXRpbSBBdXRvIFJ1biBSZXN1bHQuXG4gIGNvbnN0IHNwZWMgPSByZWFkU3BlY1JlcG9ydChqb2luKGFyZ3Mud29ya0RpciwgYXJncy5zcGVjUmVsKSk7XG4gIGF3YWl0IGFyZ3Muc3VibWl0KCdoYWx0X3JlcG9ydCcsIHtcbiAgICBzdGF0dXM6IHNwZWMuc3RhdHVzLFxuICAgIGJsb2NraW5nQ29uZGl0aW9uOiBzcGVjLmJsb2NraW5nQ29uZGl0aW9uLFxuICAgIGF1dG9SdW5SZXN1bHQ6IHNwZWMuYXV0b1J1blJlc3VsdCxcbiAgICBhZ2VudEV4aXRDb2RlOiBhcmdzLmFnZW50RXhpdENvZGUsXG4gIH0pO1xuXG4gIC8vIDcgXHUyMDE0IHBpbm5lZCB2ZXJpZmljYXRpb24gb25seTsgdGhlIGFsbG93bGlzdCBnYXRlcyB3aGF0IGV2ZXIgZ2V0cyBleGVjdXRlZC5cbiAgZm9yIChjb25zdCBjb21tYW5kIG9mIHdvcmtJdGVtLnBpbm5lZFZlcmlmaWNhdGlvbiA/PyBbXSkge1xuICAgIGNvbnN0IGJpbmFyeSA9IGNvbW1hbmQudHJpbSgpLnNwbGl0KC9cXHMrLylbMF0gPz8gJyc7XG4gICAgaWYgKCFhcmdzLmFsbG93bGlzdC5pbmNsdWRlcyhiaW5hcnkpKSB7XG4gICAgICBhd2FpdCBhcmdzLnN1Ym1pdCgndGVzdF9ydW4nLCB7IGNvbW1hbmQsIGV4aXRDb2RlOiAtMSwgcmVmdXNlZDogdHJ1ZSB9KTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cbiAgICBjb25zdCBydW4gPSBzcGF3blN5bmMoJ2Jhc2gnLCBbJy1jJywgY29tbWFuZF0sIHtcbiAgICAgIGN3ZDogYXJncy53b3JrRGlyLFxuICAgICAgZW5jb2Rpbmc6ICd1dGY4JyxcbiAgICAgIHRpbWVvdXQ6IDEwICogNjAgKiAxMDAwLFxuICAgIH0pO1xuICAgIGF3YWl0IGFyZ3Muc3VibWl0KCd0ZXN0X3J1bicsIHsgY29tbWFuZCwgZXhpdENvZGU6IHJ1bi5zdGF0dXMgPz8gLTEgfSk7XG4gIH1cblxuICAvLyA4IFx1MjAxNCBkaWZmICsgcHVzaCArIGNvbW1pdCBldmlkZW5jZSAobWVhc3VyZWQsIG5ldmVyIGp1ZGdlZCBoZXJlKS5cbiAgY29uc3QgZmluYWwgPSBnaXQoWydyZXYtcGFyc2UnLCAnSEVBRCddLCBhcmdzLndvcmtEaXIpO1xuICBjb25zdCBzaG9ydHN0YXQgPVxuICAgIGZpbmFsID09PSBhcmdzLmJhc2VsaW5lXG4gICAgICA/ICcnXG4gICAgICA6IGdpdChbJ2RpZmYnLCAnLS1zaG9ydHN0YXQnLCBgJHthcmdzLmJhc2VsaW5lfS4uJHtmaW5hbH1gXSwgYXJncy53b3JrRGlyKTtcbiAgY29uc3QgZmlsZXNDaGFuZ2VkID0gTnVtYmVyKC8oXFxkKykgZmlsZXM/IGNoYW5nZWQvLmV4ZWMoc2hvcnRzdGF0KT8uWzFdID8/ICcwJyk7XG4gIGF3YWl0IGFyZ3Muc3VibWl0KCdnaXRfZGlmZicsIHtcbiAgICBiYXNlbGluZTogYXJncy5iYXNlbGluZSxcbiAgICBmaW5hbCxcbiAgICBmaWxlc0NoYW5nZWQsXG4gICAgbm9uRW1wdHk6IGZpbGVzQ2hhbmdlZCA+IDAsXG4gICAgYnJhbmNoOiBhcmdzLmJyYW5jaCxcbiAgfSk7XG5cbiAgZ2l0KFsncHVzaCcsIGFyZ3MucmVtb3RlLCBhcmdzLmJyYW5jaF0sIGFyZ3MucmVwb1BhdGgpO1xuICBjb25zdCBsc1JlbW90ZSA9IGdpdChbJ2xzLXJlbW90ZScsIGFyZ3MucmVtb3RlLCBgcmVmcy9oZWFkcy8ke2FyZ3MuYnJhbmNofWBdLCBhcmdzLnJlcG9QYXRoKTtcbiAgYXdhaXQgYXJncy5zdWJtaXQoJ2NvbW1pdCcsIHtcbiAgICBzaGE6IGZpbmFsLFxuICAgIGJyYW5jaDogYXJncy5icmFuY2gsXG4gICAgcmVhY2hhYmxlT25SZW1vdGU6IGxzUmVtb3RlLmluY2x1ZGVzKGZpbmFsKSxcbiAgfSk7XG5cbiAgLy8gOSBcdTIwMTQgcm91dGluZzogdGhlIGZpbGUgc2F5cyB3aGF0IHRoZSBhZ2VudCBjbGFpbXM7IHRoZSBjb3JlIGRlY2lkZXMuXG4gIGNvbnN0IHN0YXR1cyA9IG5vcm1hbGl6ZVN0YXR1cyhzcGVjLnN0YXR1cyk7XG4gIGNvbnN0IHRva2VuID0gY2xhaW0uZmVuY2luZ1Rva2VuO1xuICBpZiAoc3RhdHVzID09PSAnYmxvY2tlZCcpIHtcbiAgICBhd2FpdCBjbGllbnQuY2FsbCgnYmxvY2tfdGFzaycsIHtcbiAgICAgIHdvcmtJdGVtSWQ6IHdvcmtJdGVtLmlkLFxuICAgICAgcmVhc29uOiBtYXBCbG9ja2luZ0NvbmRpdGlvbihzcGVjLmJsb2NraW5nQ29uZGl0aW9uKSxcbiAgICAgIGZlbmNpbmdUb2tlbjogdG9rZW4sXG4gICAgfSk7XG4gICAgYXdhaXQgY2xpZW50LmNhbGwoJ3JlbGVhc2VfY2xhaW0nLCB7IGNsYWltSWQ6IGNsYWltLmlkLCByZWFzb246ICdydW4gYmxvY2tlZCcgfSk7XG4gICAgcmV0dXJuICdibG9ja2VkJztcbiAgfVxuICBjb25zdCBoYXNDb21taXQgPSBmaW5hbCAhPT0gYXJncy5iYXNlbGluZTtcbiAgaWYgKHN0YXR1cyA9PT0gJ2RvbmUnIHx8IHN0YXR1cyA9PT0gJ2luX3JldmlldycgfHwgKHN0YXR1cyA9PT0gJ2luX3Byb2dyZXNzJyAmJiBoYXNDb21taXQpKSB7XG4gICAgYXdhaXQgY2xpZW50LmNhbGwoJ2FkdmFuY2Vfc3RhdGUnLCB7XG4gICAgICB3b3JrSXRlbUlkOiB3b3JrSXRlbS5pZCxcbiAgICAgIHRvOiAnaW5fcmV2aWV3JyxcbiAgICAgIGZlbmNpbmdUb2tlbjogdG9rZW4sXG4gICAgfSk7XG4gICAgYXdhaXQgY2xpZW50LmNhbGwoJ3JlbGVhc2VfY2xhaW0nLCB7IGNsYWltSWQ6IGNsYWltLmlkLCByZWFzb246ICdydW4gZmluaXNoZWQnIH0pO1xuICAgIHJldHVybiAnaW5fcmV2aWV3JztcbiAgfVxuICAvLyBBZ2VudCBleGl0ZWQgbm9uLXplcm8gd2l0aCBubyByZWFkYWJsZSBIQUxUIHN0YXR1cywgb3IgYW4gdW5rbm93biBzdGF0dXMuXG4gIGF3YWl0IGNsaWVudC5jYWxsKCdibG9ja190YXNrJywgeyB3b3JrSXRlbUlkOiB3b3JrSXRlbS5pZCwgcmVhc29uOiAnb3RoZXInLCBmZW5jaW5nVG9rZW46IHRva2VuIH0pO1xuICBhd2FpdCBjbGllbnQuY2FsbCgncmVsZWFzZV9jbGFpbScsIHtcbiAgICBjbGFpbUlkOiBjbGFpbS5pZCxcbiAgICByZWFzb246ICdydW4gZmFpbGVkIHdpdGhvdXQgYSByZWFkYWJsZSBIQUxUJyxcbiAgfSk7XG4gIHJldHVybiAnYmxvY2tlZCc7XG59XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gQ3Jhc2gtcmVjb3Zlcnkgc2NhbiAoc3RlcCAxMClcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5pbnRlcmZhY2UgV29ya3RyZWVTY2FuIHtcbiAgYWRvcHRhYmxlOiB7IGRpcjogc3RyaW5nOyBoZWFkOiBzdHJpbmc7IGJhc2VsaW5lOiBzdHJpbmcgfSB8IG51bGw7XG4gIHdyZWNrZWQ6IHN0cmluZ1tdO1xufVxuXG5mdW5jdGlvbiBzY2FuT2xkV29ya3RyZWVzKHJvb3Q6IHN0cmluZywgd29ya0l0ZW1JZDogc3RyaW5nLCBzcGVjUmVsOiBzdHJpbmcpOiBXb3JrdHJlZVNjYW4ge1xuICBjb25zdCBzY2FuOiBXb3JrdHJlZVNjYW4gPSB7IGFkb3B0YWJsZTogbnVsbCwgd3JlY2tlZDogW10gfTtcbiAgaWYgKCFleGlzdHNTeW5jKHJvb3QpKSByZXR1cm4gc2NhbjtcbiAgZm9yIChjb25zdCBuYW1lIG9mIHJlYWRkaXJTeW5jKHJvb3QpKSB7XG4gICAgY29uc3QgZGlyID0gam9pbihyb290LCBuYW1lKTtcbiAgICBjb25zdCBtYXJrZXIgPSByZWFkTWFya2VyKGRpcik7XG4gICAgaWYgKG1hcmtlciA9PT0gbnVsbCB8fCBtYXJrZXIud29ya0l0ZW1JZCAhPT0gd29ya0l0ZW1JZCkgY29udGludWU7XG4gICAgbGV0IGhlYWQ6IHN0cmluZyB8IG51bGwgPSBudWxsO1xuICAgIHRyeSB7XG4gICAgICBoZWFkID0gZ2l0KFsncmV2LXBhcnNlJywgJ0hFQUQnXSwgZGlyKTtcbiAgICB9IGNhdGNoIHtcbiAgICAgIGhlYWQgPSBudWxsO1xuICAgIH1cbiAgICBjb25zdCBzdGF0dXMgPSBub3JtYWxpemVTdGF0dXMocmVhZFNwZWNSZXBvcnQoam9pbihkaXIsIHNwZWNSZWwpKS5zdGF0dXMpO1xuICAgIGNvbnN0IHRlcm1pbmFsID0gc3RhdHVzID09PSAnZG9uZScgfHwgc3RhdHVzID09PSAnaW5fcmV2aWV3JztcbiAgICBpZiAoc2Nhbi5hZG9wdGFibGUgPT09IG51bGwgJiYgaGVhZCAhPT0gbnVsbCAmJiBoZWFkICE9PSBtYXJrZXIuYmFzZWxpbmUgJiYgdGVybWluYWwpIHtcbiAgICAgIHNjYW4uYWRvcHRhYmxlID0geyBkaXIsIGhlYWQsIGJhc2VsaW5lOiBtYXJrZXIuYmFzZWxpbmUgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgc2Nhbi53cmVja2VkLnB1c2goZGlyKTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHNjYW47XG59XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gcnVuT25jZSBcdTIwMTQgb25lIGZ1bGwgZGlzcGF0Y2ggY3ljbGVcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcnVuT25jZShvcHRpb25zOiBSdW5uZXJPcHRpb25zKTogUHJvbWlzZTxSdW5PbmNlUmVzdWx0PiB7XG4gIGNvbnN0IHsgY2xpZW50IH0gPSBvcHRpb25zO1xuICBjb25zdCByZXBvUGF0aCA9IHJlc29sdmUob3B0aW9ucy5yZXBvUGF0aCk7XG4gIGNvbnN0IHJlbW90ZSA9IG9wdGlvbnMucmVtb3RlID8/ICdvcmlnaW4nO1xuICBjb25zdCBhbGxvd2xpc3QgPSBvcHRpb25zLnZlcmlmaWNhdGlvbkFsbG93bGlzdCA/PyBERUZBVUxUX1ZFUklGSUNBVElPTl9BTExPV0xJU1Q7XG5cbiAgLy8gMSBcdTIwMTQgcG9sbC4gT3JkZXIgb2YgdGhlIEFQSSByZXNwb25zZSA9IGltcG9ydCBvcmRlcjsgdGFrZSB0aGUgZmlyc3QuXG4gIC8vIEZhbGxiYWNrOiBhbiBpbl9wcm9ncmVzcyBpdGVtIHdpdGggbm8gbGl2ZSBjbGFpbSBpcyBhIGNyYXNoZWQgZGlzcGF0Y2guXG4gIGNvbnN0IGxpc3RVbmJsb2NrZWQgPSBhc3luYyAoc3RhdGU6IFdvcmtJdGVtU3RhdGUpOiBQcm9taXNlPFdvcmtJdGVtW10+ID0+XG4gICAgKGF3YWl0IGNsaWVudC5jYWxsPFdvcmtJdGVtW10+KCdsaXN0X3dvcmtfaXRlbXMnLCB7IHN0YXRlLCBjbGFpbWFibGU6IHRydWUgfSkpLmZpbHRlcihcbiAgICAgIChpdGVtKSA9PiBpdGVtLmJsb2NrZWRSZWFzb24gPT09IG51bGwsXG4gICAgKTtcbiAgbGV0IGNhbmRpZGF0ZXMgPSBhd2FpdCBsaXN0VW5ibG9ja2VkKCdyZWFkeV9mb3JfZGV2Jyk7XG4gIGlmIChjYW5kaWRhdGVzLmxlbmd0aCA9PT0gMCkgY2FuZGlkYXRlcyA9IGF3YWl0IGxpc3RVbmJsb2NrZWQoJ2luX3Byb2dyZXNzJyk7XG4gIGNvbnN0IHBpY2tlZCA9IGNhbmRpZGF0ZXNbMF07XG4gIGlmIChwaWNrZWQgPT09IHVuZGVmaW5lZCkgcmV0dXJuIHsgZGlzcGF0Y2hlZDogZmFsc2UgfTtcblxuICBsZXQgY2xhaW06IENsYWltO1xuICB0cnkge1xuICAgIGNsYWltID0gYXdhaXQgY2xpZW50LmNhbGw8Q2xhaW0+KCdjbGFpbV90YXNrJywgeyB3b3JrSXRlbUlkOiBwaWNrZWQuaWQgfSk7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgaWYgKGlzUmVtb3RlRXJyb3IoZXJyb3IsICdDb25mbGljdEVycm9yJykpIHtcbiAgICAgIHJldHVybiB7IGRpc3BhdGNoZWQ6IGZhbHNlLCBkZXRhaWxzOiBgbG9zdCB0aGUgY2xhaW0gcmFjZSBmb3IgJHtwaWNrZWQuZXh0ZXJuYWxLZXl9YCB9O1xuICAgIH1cbiAgICB0aHJvdyBlcnJvcjtcbiAgfVxuXG4gIGNvbnN0IGNvbnRleHQgPSBhd2FpdCBjbGllbnQuY2FsbDx7IHdvcmtJdGVtOiBXb3JrSXRlbTsgZW50cnlTdGF0ZTogV29ya0l0ZW1TdGF0ZSB9PihcbiAgICAnZ2V0X3Rhc2tfY29udGV4dCcsXG4gICAgeyB3b3JrSXRlbUlkOiBwaWNrZWQuaWQgfSxcbiAgKTtcbiAgY29uc3Qgd29ya0l0ZW0gPSBjb250ZXh0LndvcmtJdGVtO1xuICBjb25zdCBzcGVjUmVsID0gam9pbihvcHRpb25zLnNwZWNGb2xkZXIsIHdvcmtJdGVtLnNwZWNQYXRoKTtcbiAgY29uc3QgYnJhbmNoID0gYGNsYWltLyR7Y2xhaW0uaWR9YDtcbiAgY29uc3Qgd29ya3RyZWVzUm9vdCA9IGpvaW4ocmVwb1BhdGgsICcub2FocycsICd3b3JrdHJlZXMnKTtcbiAgY29uc3QgZXZpZGVuY2U6IEV2aWRlbmNlW10gPSBbXTtcblxuICBjb25zdCBzdWJtaXQgPSBhc3luYyAoa2luZDogRXZpZGVuY2VbJ2tpbmQnXSwgcGF5bG9hZDogUmVjb3JkPHN0cmluZywgdW5rbm93bj4pOiBQcm9taXNlPHZvaWQ+ID0+IHtcbiAgICBjb25zdCBpdGVtOiBFdmlkZW5jZSA9IHsga2luZCwgcGF5bG9hZCB9O1xuICAgIGV2aWRlbmNlLnB1c2goaXRlbSk7XG4gICAgYXdhaXQgY2xpZW50LmNhbGwoJ3N1Ym1pdF9ldmlkZW5jZScsIHtcbiAgICAgIHdvcmtJdGVtSWQ6IHdvcmtJdGVtLmlkLFxuICAgICAgZXZpZGVuY2U6IGl0ZW0sXG4gICAgICBmZW5jaW5nVG9rZW46IGNsYWltLmZlbmNpbmdUb2tlbixcbiAgICB9KTtcbiAgfTtcblxuICBjb25zdCBiYXNlID0ge1xuICAgIGRpc3BhdGNoZWQ6IHRydWUsXG4gICAgd29ya0l0ZW1JZDogd29ya0l0ZW0uaWQsXG4gICAgZXh0ZXJuYWxLZXk6IHdvcmtJdGVtLmV4dGVybmFsS2V5LFxuICAgIGNsYWltSWQ6IGNsYWltLmlkLFxuICAgIGV2aWRlbmNlLFxuICB9IHNhdGlzZmllcyBSdW5PbmNlUmVzdWx0O1xuXG4gIGNvbnN0IGZpbmlzaEFyZ3MgPSB7XG4gICAgY2xpZW50LFxuICAgIHdvcmtJdGVtLFxuICAgIGNsYWltLFxuICAgIHNwZWNSZWwsXG4gICAgYnJhbmNoLFxuICAgIHJlcG9QYXRoLFxuICAgIHJlbW90ZSxcbiAgICBhbGxvd2xpc3QsXG4gICAgc3VibWl0LFxuICB9O1xuXG4gIC8vIDEwIFx1MjAxNCBhZG9wdCAoY3Jhc2ggcmVjb3ZlcnkpOiBpbnNwZWN0IGxlZnRvdmVyIHdvcmt0cmVlcyBvZiB0aGlzIHdvcmsgaXRlbS5cbiAgY29uc3Qgc2NhbiA9IHNjYW5PbGRXb3JrdHJlZXMod29ya3RyZWVzUm9vdCwgd29ya0l0ZW0uaWQsIHNwZWNSZWwpO1xuICBpZiAoc2Nhbi5hZG9wdGFibGUgIT09IG51bGwpIHtcbiAgICBjb25zdCB7IGRpciwgaGVhZCwgYmFzZWxpbmUgfSA9IHNjYW4uYWRvcHRhYmxlO1xuICAgIC8vIFRoZSBuZXcgY2xhaW0ncyBicmFuY2ggcG9pbnRzIGF0IHRoZSBjcmFzaGVkIHJ1bidzIGZpbmlzaGVkIEhFQUQ7IHRoZVxuICAgIC8vIGFnZW50IGlzIE5PVCByZS1pbnZva2VkIFx1MjAxNCB0aGlzIGlzIGxhdGUgZXZpZGVuY2Ugc3VibWlzc2lvbiwgbm90IHJlZG8uXG4gICAgZ2l0KFsnYnJhbmNoJywgYnJhbmNoLCBoZWFkXSwgcmVwb1BhdGgpO1xuICAgIC8vIEVudHJ5LXN0YXRlIGFsaWdubWVudCAobm8tb3Agd2hlbiB0aGUgY3Jhc2hlZCBydW4gYWxyZWFkeSBhZHZhbmNlZCkuXG4gICAgYXdhaXQgY2xpZW50LmNhbGwoJ2FkdmFuY2Vfc3RhdGUnLCB7XG4gICAgICB3b3JrSXRlbUlkOiB3b3JrSXRlbS5pZCxcbiAgICAgIHRvOiAnaW5fcHJvZ3Jlc3MnLFxuICAgICAgZmVuY2luZ1Rva2VuOiBjbGFpbS5mZW5jaW5nVG9rZW4sXG4gICAgfSk7XG4gICAgaWYgKG9wdGlvbnMuZmFpbHBvaW50ID09PSAnYmVmb3JlX3JlcG9ydCcpIHtcbiAgICAgIHJldHVybiB7IC4uLmJhc2UsIG91dGNvbWU6ICdjcmFzaGVkJywgZGV0YWlsczogJ2ZhaWxwb2ludCBiZWZvcmVfcmVwb3J0IChhZG9wdCBwYXRoKScgfTtcbiAgICB9XG4gICAgY29uc3Qgb3V0Y29tZSA9IGF3YWl0IGZpbmlzaFJ1bih7XG4gICAgICAuLi5maW5pc2hBcmdzLFxuICAgICAgd29ya0RpcjogZGlyLFxuICAgICAgYmFzZWxpbmUsXG4gICAgICBhZ2VudEV4aXRDb2RlOiBudWxsLFxuICAgIH0pO1xuICAgIHJlbW92ZVdvcmt0cmVlKGRpciwgcmVwb1BhdGgpO1xuICAgIHJldHVybiB7XG4gICAgICAuLi5iYXNlLFxuICAgICAgb3V0Y29tZTogb3V0Y29tZSA9PT0gJ2luX3JldmlldycgPyAnYWRvcHRlZF9pbl9yZXZpZXcnIDogb3V0Y29tZSxcbiAgICAgIGRldGFpbHM6IGBhZG9wdGVkIGZpbmlzaGVkIHdvcmt0cmVlICR7ZGlyfWAsXG4gICAgfTtcbiAgfVxuICBpZiAoc2Nhbi53cmVja2VkLmxlbmd0aCA+IDApIHtcbiAgICAvLyBBIHdyZWNrZWQgd29ya3RyZWUgKG5vIGNvbW1pdCBwYXN0IGJhc2VsaW5lIC8gbm9uLXRlcm1pbmFsIHN0YXR1cykgaXNcbiAgICAvLyBjbGVhbmVkOyB0aGUgaXRlbSBibG9ja3Mgc3RhbGVfd29ya3RyZWUgZm9yIGEgaHVtYW4gbG9vay5cbiAgICBmb3IgKGNvbnN0IGRpciBvZiBzY2FuLndyZWNrZWQpIHJlbW92ZVdvcmt0cmVlKGRpciwgcmVwb1BhdGgpO1xuICAgIGF3YWl0IGNsaWVudC5jYWxsKCdibG9ja190YXNrJywge1xuICAgICAgd29ya0l0ZW1JZDogd29ya0l0ZW0uaWQsXG4gICAgICByZWFzb246ICdzdGFsZV93b3JrdHJlZScsXG4gICAgICBmZW5jaW5nVG9rZW46IGNsYWltLmZlbmNpbmdUb2tlbixcbiAgICB9KTtcbiAgICBhd2FpdCBjbGllbnQuY2FsbCgncmVsZWFzZV9jbGFpbScsIHsgY2xhaW1JZDogY2xhaW0uaWQsIHJlYXNvbjogJ3N0YWxlIHdvcmt0cmVlIGNsZWFuZWQnIH0pO1xuICAgIHJldHVybiB7IC4uLmJhc2UsIG91dGNvbWU6ICdibG9ja2VkJywgZGV0YWlsczogJ3N0YWxlIHdvcmt0cmVlIGNsZWFuZWQ7IHRhc2sgYmxvY2tlZCcgfTtcbiAgfVxuXG4gIC8vIDIgXHUyMDE0IGdpdCBwbHVtYmluZzogYmFzZWxpbmUsIGNsYWltIGJyYW5jaCwgY2xhaW0tbmFtZWQgd29ya3RyZWUuXG4gIGNvbnN0IGJhc2VsaW5lID0gZ2l0KFsncmV2LXBhcnNlJywgJ0hFQUQnXSwgcmVwb1BhdGgpO1xuICBlbnN1cmVHaXRFeGNsdWRlcyhyZXBvUGF0aCk7XG4gIG1rZGlyU3luYyh3b3JrdHJlZXNSb290LCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcbiAgY29uc3Qgd29ya3RyZWVEaXIgPSBqb2luKHdvcmt0cmVlc1Jvb3QsIGNsYWltLmlkKTtcbiAgZ2l0KFsnd29ya3RyZWUnLCAnYWRkJywgJy1iJywgYnJhbmNoLCB3b3JrdHJlZURpciwgYmFzZWxpbmVdLCByZXBvUGF0aCk7XG4gIHdyaXRlTWFya2VyKHdvcmt0cmVlRGlyLCB7XG4gICAgd29ya0l0ZW1JZDogd29ya0l0ZW0uaWQsXG4gICAgY2xhaW1JZDogY2xhaW0uaWQsXG4gICAgYmFzZWxpbmUsXG4gICAgaW52b2NhdGlvbnM6IDAsXG4gIH0pO1xuXG4gIC8vIDMgXHUyMDE0IG1pcnJvci1vbi1kaXNwYXRjaDogc3RhbXAgZnJvbnRtYXR0ZXIgdG8gdGhlIERCIGVudHJ5IHN0YXRlIHNvIHRoZVxuICAvLyBvbmUgbW9tZW50IHRoZSBmaWxlIGlzIHJlYWQgYXMgYW4gZW50cnkgc3RhdGUsIGl0IGlzIGZyZXNoIChcdTAwQTcxLjYpLlxuICBjb25zdCBzcGVjQWJzID0gam9pbih3b3JrdHJlZURpciwgc3BlY1JlbCk7XG4gIGlmIChleGlzdHNTeW5jKHNwZWNBYnMpKSB7XG4gICAgc2V0RnJvbnRtYXR0ZXJTdGF0dXMoc3BlY0FicywgRU5UUllfU1RBVFVTW2NvbnRleHQuZW50cnlTdGF0ZV0gPz8gY29udGV4dC5lbnRyeVN0YXRlKTtcbiAgfVxuXG4gIC8vIDQgXHUyMDE0IGFkdmFuY2UgaW50byBleGVjdXRpb24gQkVGT1JFIHRoZSBhZ2VudCBydW5zIChEQiBpcyB0aGUgZW50cnkgc3RhdGUpLlxuICBhd2FpdCBjbGllbnQuY2FsbCgnYWR2YW5jZV9zdGF0ZScsIHtcbiAgICB3b3JrSXRlbUlkOiB3b3JrSXRlbS5pZCxcbiAgICB0bzogJ2luX3Byb2dyZXNzJyxcbiAgICBmZW5jaW5nVG9rZW46IGNsYWltLmZlbmNpbmdUb2tlbixcbiAgfSk7XG5cbiAgLy8gNSBcdTIwMTQgaW52b2tlIHRoZSBjb2RpbmcgYWdlbnQuXG4gIGNvbnN0IGNvbW1hbmQgPSBvcHRpb25zLmFnZW50Q21kXG4gICAgLnJlcGxhY2VBbGwoJ3tTUEVDX0ZPTERFUn0nLCBvcHRpb25zLnNwZWNGb2xkZXIpXG4gICAgLnJlcGxhY2VBbGwoJ3tTVE9SWV9JRH0nLCB3b3JrSXRlbS5leHRlcm5hbEtleSlcbiAgICAucmVwbGFjZUFsbCgne0lOVk9LRV9XSVRIfScsIHdvcmtJdGVtLmludm9rZURldldpdGgpXG4gICAgLnJlcGxhY2VBbGwoJ3tXT1JLVFJFRX0nLCB3b3JrdHJlZURpcik7XG4gIHdyaXRlTWFya2VyKHdvcmt0cmVlRGlyLCB7XG4gICAgd29ya0l0ZW1JZDogd29ya0l0ZW0uaWQsXG4gICAgY2xhaW1JZDogY2xhaW0uaWQsXG4gICAgYmFzZWxpbmUsXG4gICAgaW52b2NhdGlvbnM6IDEsXG4gIH0pO1xuICBjb25zdCBpbnZva2VkID0gc3Bhd25TeW5jKCdiYXNoJywgWyctbGMnLCBjb21tYW5kXSwge1xuICAgIGN3ZDogd29ya3RyZWVEaXIsXG4gICAgZW5jb2Rpbmc6ICd1dGY4JyxcbiAgICB0aW1lb3V0OiBvcHRpb25zLmFnZW50VGltZW91dE1zID8/IDMwICogNjAgKiAxMDAwLFxuICAgIGtpbGxTaWduYWw6ICdTSUdLSUxMJyxcbiAgICBlbnY6IHtcbiAgICAgIC4uLnByb2Nlc3MuZW52LFxuICAgICAgLi4ub3B0aW9ucy5hZ2VudEVudixcbiAgICAgIE9BSFNfU1BFQ19GSUxFOiBzcGVjQWJzLFxuICAgICAgT0FIU19TVE9SWV9JRDogd29ya0l0ZW0uZXh0ZXJuYWxLZXksXG4gICAgfSxcbiAgfSk7XG4gIGNvbnN0IGFnZW50RXhpdENvZGUgPSBpbnZva2VkLnN0YXR1cyA/PyAtMTtcblxuICAvLyBURVNUIE9OTFk6IHNpbXVsYXRlIGR5aW5nIGFmdGVyIHRoZSBhZ2VudCBjb21taXR0ZWQsIGJlZm9yZSBhbnkgcmVwb3J0LlxuICAvLyBObyBldmlkZW5jZSwgbm8gYWR2YW5jZSwgbm8gcmVsZWFzZSBcdTIwMTQgdGhlIGNsYWltIHN0YXlzIGxpdmUsIHRoZSB3b3JrdHJlZVxuICAvLyBzdGF5cyBvbiBkaXNrOyBhIGxhdGVyIGNsYWltIGFkb3B0cyBvciBjbGVhbnMgaXQgKHN0ZXAgMTApLlxuICBpZiAob3B0aW9ucy5mYWlscG9pbnQgPT09ICdiZWZvcmVfcmVwb3J0Jykge1xuICAgIHJldHVybiB7XG4gICAgICAuLi5iYXNlLFxuICAgICAgb3V0Y29tZTogJ2NyYXNoZWQnLFxuICAgICAgZGV0YWlsczogJ2ZhaWxwb2ludCBiZWZvcmVfcmVwb3J0OiBkaWVkIGFmdGVyIHRoZSBhZ2VudCByYW4sIGJlZm9yZSByZXBvcnRpbmcnLFxuICAgIH07XG4gIH1cblxuICBjb25zdCBvdXRjb21lID0gYXdhaXQgZmluaXNoUnVuKHtcbiAgICAuLi5maW5pc2hBcmdzLFxuICAgIHdvcmtEaXI6IHdvcmt0cmVlRGlyLFxuICAgIGJhc2VsaW5lLFxuICAgIGFnZW50RXhpdENvZGUsXG4gIH0pO1xuICByZW1vdmVXb3JrdHJlZSh3b3JrdHJlZURpciwgcmVwb1BhdGgpO1xuICByZXR1cm4geyAuLi5iYXNlLCBvdXRjb21lIH07XG59XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gd29ya0xvb3AgXHUyMDE0IHBvbGwgXHUyMTkyIHJ1bk9uY2UgXHUyMTkyIHNsZWVwXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuLyoqIFJ1biB1bnRpbCBzdG9wcGVkOiBwb2xsIFx1MjE5MiBydW5PbmNlIFx1MjE5MiBzbGVlcChwb2xsTXMpLiBTSUdJTlQgZXhpdHMgY2xlYW5seS4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiB3b3JrTG9vcChvcHRpb25zOiBSdW5uZXJPcHRpb25zICYgeyBvbmNlPzogYm9vbGVhbiB9KTogUHJvbWlzZTx2b2lkPiB7XG4gIGxldCBzdG9wcGVkID0gZmFsc2U7XG4gIGxldCB3YWtlOiAoKCkgPT4gdm9pZCkgfCB1bmRlZmluZWQ7XG4gIGNvbnN0IG9uU2lnaW50ID0gKCk6IHZvaWQgPT4ge1xuICAgIHN0b3BwZWQgPSB0cnVlO1xuICAgIHdha2U/LigpO1xuICB9O1xuICBwcm9jZXNzLm9uY2UoJ1NJR0lOVCcsIG9uU2lnaW50KTtcbiAgdHJ5IHtcbiAgICBmb3IgKDs7KSB7XG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBydW5PbmNlKG9wdGlvbnMpO1xuICAgICAgaWYgKG9wdGlvbnMub25jZSA9PT0gdHJ1ZSB8fCBzdG9wcGVkKSByZXR1cm47XG4gICAgICBpZiAoIXJlc3VsdC5kaXNwYXRjaGVkKSB7XG4gICAgICAgIGF3YWl0IG5ldyBQcm9taXNlPHZvaWQ+KChyZXNvbHZlU2xlZXApID0+IHtcbiAgICAgICAgICB3YWtlID0gcmVzb2x2ZVNsZWVwO1xuICAgICAgICAgIHNldFRpbWVvdXQocmVzb2x2ZVNsZWVwLCBvcHRpb25zLnBvbGxNcyA/PyAxNV8wMDApO1xuICAgICAgICB9KTtcbiAgICAgICAgd2FrZSA9IHVuZGVmaW5lZDtcbiAgICAgICAgaWYgKHN0b3BwZWQpIHJldHVybjtcbiAgICAgIH1cbiAgICB9XG4gIH0gZmluYWxseSB7XG4gICAgcHJvY2Vzcy5yZW1vdmVMaXN0ZW5lcignU0lHSU5UJywgb25TaWdpbnQpO1xuICB9XG59XG4iLCAiLyoqXG4gKiBUaGUgYG9haHNgIGJpbmFyeSBcdTIwMTQgY29tbWFuZGVyIHdpcmluZyBPTkxZLiBFdmVyeSBnYXRlLWhvbGRlciBjb21tYW5kIGlzIGFcbiAqIHB1cmUgZnVuY3Rpb24gaW4gc3JjL2NvbW1hbmRzLyB0YWtpbmcgKGNsaWVudCwgb3B0cyk7IHNlcnZlIGxpdmVzIGluXG4gKiBzcmMvc2VydmUudHM7IHRoZSB3b3JrZXIgbG9vcCBsaXZlcyBpbiBAb2Focy9ydW5uZXIgYW5kIGlzIGltcG9ydGVkIExBWklMWVxuICogc28gdGhlIHJlc3Qgb2YgdGhlIENMSSB3b3JrcyB3aGlsZSB0aGUgcnVubmVyIGlzIHN0aWxsIGxhbmRpbmcgKHN0b3J5IDE0KS5cbiAqXG4gKiBFbnYgaXMgcmVhZCBoZXJlIGFuZCBvbmx5IGhlcmU6IE9BSFNfVE9LRU4gKGNsaWVudCBhdXRoKSBhbmRcbiAqIE9BSFNfQURNSU5fVE9LRU4gKHNlcnZlIGJvb3RzdHJhcCkuXG4gKi9cbmltcG9ydCB7IHJlc29sdmUgfSBmcm9tICdub2RlOnBhdGgnO1xuXG5pbXBvcnQgeyBDb21tYW5kIH0gZnJvbSAnY29tbWFuZGVyJztcbmltcG9ydCB7IG1ha2VDbGllbnQsIHR5cGUgT2Foc0NsaWVudCB9IGZyb20gJ0BvYWhzL2NvbnRyYWN0cyc7XG5cbmltcG9ydCB7XG4gIGFjdG9yQ3JlYXRlQ29tbWFuZCxcbiAgYWR2YW5jZUNvbW1hbmQsXG4gIGFwcHJvdmVDb21tYW5kLFxuICBldmVudHNDb21tYW5kLFxuICBmZWF0dXJlQ3JlYXRlQ29tbWFuZCxcbiAgZ3JhbnRDb21tYW5kLFxuICBpbXBvcnRTdG9yaWVzQ29tbWFuZCxcbiAgaW5ib3hDb21tYW5kLFxuICByZWplY3RDb21tYW5kLFxuICBydW5Ub091dHB1dCxcbiAgc3RhdHVzQ29tbWFuZCxcbn0gZnJvbSAnLi9jb21tYW5kcy9pbmRleC5qcyc7XG5pbXBvcnQgeyBERUZBVUxUX1BPUlQsIHN0YXJ0U2VydmUgfSBmcm9tICcuL3NlcnZlLmpzJztcblxuY29uc3QgREVGQVVMVF9VUkwgPSBgaHR0cDovL2xvY2FsaG9zdDoke0RFRkFVTFRfUE9SVH1gO1xuXG5pbnRlcmZhY2UgQ2xpZW50RmxhZ3Mge1xuICB1cmw6IHN0cmluZztcbiAgdG9rZW4/OiBzdHJpbmc7XG59XG5cbmZ1bmN0aW9uIGNsaWVudEZyb20oZmxhZ3M6IENsaWVudEZsYWdzKTogT2Foc0NsaWVudCB7XG4gIGNvbnN0IHRva2VuID0gZmxhZ3MudG9rZW4gPz8gcHJvY2Vzcy5lbnZbJ09BSFNfVE9LRU4nXTtcbiAgaWYgKHRva2VuID09PSB1bmRlZmluZWQgfHwgdG9rZW4ubGVuZ3RoID09PSAwKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdtaXNzaW5nIHRva2VuOiBwYXNzIC0tdG9rZW4gPHRva2VuPiBvciBzZXQgT0FIU19UT0tFTicpO1xuICB9XG4gIHJldHVybiBtYWtlQ2xpZW50KHsgYmFzZVVybDogZmxhZ3MudXJsLCB0b2tlbiB9KTtcbn1cblxuLyoqIEF0dGFjaCB0aGUgc2hhcmVkIGNsaWVudCBmbGFncyB0byBhIGdhdGUtaG9sZGVyIGNvbW1hbmQuICovXG5mdW5jdGlvbiB3aXRoQ2xpZW50RmxhZ3MoY21kOiBDb21tYW5kKTogQ29tbWFuZCB7XG4gIHJldHVybiBjbWRcbiAgICAub3B0aW9uKCctLXVybCA8dXJsPicsICdzcGluZS1hcGkgYmFzZSBVUkwnLCBERUZBVUxUX1VSTClcbiAgICAub3B0aW9uKCctLXRva2VuIDx0b2tlbj4nLCAnYmVhcmVyIHRva2VuIChkZWZhdWx0OiBlbnYgT0FIU19UT0tFTiknKTtcbn1cblxuLyoqIFJ1biBhIGNvbW1hbmQgZnVuY3Rpb24gYW5kIHRyYW5zbGF0ZSBpdHMgb3V0Y29tZSB0byBzdGRvdXQvc3RkZXJyICsgZXhpdCBjb2RlLiAqL1xuYXN5bmMgZnVuY3Rpb24gZW1pdChmbjogKCkgPT4gUHJvbWlzZTxzdHJpbmc+KTogUHJvbWlzZTx2b2lkPiB7XG4gIGNvbnN0IHsgdGV4dCwgZXhpdENvZGUgfSA9IGF3YWl0IHJ1blRvT3V0cHV0KGZuKTtcbiAgaWYgKGV4aXRDb2RlID09PSAwKSB7XG4gICAgcHJvY2Vzcy5zdGRvdXQud3JpdGUoYCR7dGV4dH1cXG5gKTtcbiAgfSBlbHNlIHtcbiAgICBwcm9jZXNzLnN0ZGVyci53cml0ZShgJHt0ZXh0fVxcbmApO1xuICAgIHByb2Nlc3MuZXhpdENvZGUgPSBleGl0Q29kZTtcbiAgfVxufVxuXG5jb25zdCBjb2xsZWN0ID0gKHZhbHVlOiBzdHJpbmcsIHByZXZpb3VzOiBzdHJpbmdbXSk6IHN0cmluZ1tdID0+IFsuLi5wcmV2aW91cywgdmFsdWVdO1xuXG5leHBvcnQgZnVuY3Rpb24gYnVpbGRQcm9ncmFtKCk6IENvbW1hbmQge1xuICBjb25zdCBwcm9ncmFtID0gbmV3IENvbW1hbmQoKTtcbiAgcHJvZ3JhbVxuICAgIC5uYW1lKCdvYWhzJylcbiAgICAuZGVzY3JpcHRpb24oJ29haHMgXHUyMDE0IE9wZW4gQWdlbnRzIEhhcm5lc3MgU3lzdGVtIENMSSAoc3BpbmUgc2VydmVyICsgZ2F0ZS1ob2xkZXIgY29tbWFuZHMpJyk7XG5cbiAgLy8gLS0gc2VydmUgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHByb2dyYW1cbiAgICAuY29tbWFuZCgnc2VydmUnKVxuICAgIC5kZXNjcmlwdGlvbignc3RhcnQgdGhlIHNwaW5lLWFwaSAoSFRUUCAvcnBjLyogKyBNQ1AgL21jcCknKVxuICAgIC5vcHRpb24oJy0tcG9ydCA8cG9ydD4nLCAnVENQIHBvcnQnLCBTdHJpbmcoREVGQVVMVF9QT1JUKSlcbiAgICAub3B0aW9uKCctLWFkbWluLXRva2VuIDx0b2tlbj4nLCAnYm9vdHN0cmFwIGFkbWluIHRva2VuIChkZWZhdWx0OiBlbnYgT0FIU19BRE1JTl9UT0tFTiwgZWxzZSBnZW5lcmF0ZWQpJylcbiAgICAub3B0aW9uKCctLWRhdGEgPGRpcj4nLCAncGVyc2lzdGVuY2UgZGlyZWN0b3J5IChkdXJhYmxlIFBHbGl0ZSArIHRva2VuIHN0b3JlKScpXG4gICAgLmFjdGlvbihhc3luYyAob3B0czogeyBwb3J0OiBzdHJpbmc7IGFkbWluVG9rZW4/OiBzdHJpbmc7IGRhdGE/OiBzdHJpbmcgfSkgPT4ge1xuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc3QgYWRtaW5Ub2tlbiA9IG9wdHMuYWRtaW5Ub2tlbiA/PyBwcm9jZXNzLmVudlsnT0FIU19BRE1JTl9UT0tFTiddO1xuICAgICAgICBjb25zdCBoYW5kbGUgPSBhd2FpdCBzdGFydFNlcnZlKHtcbiAgICAgICAgICBwb3J0OiBOdW1iZXIob3B0cy5wb3J0KSxcbiAgICAgICAgICAuLi4oYWRtaW5Ub2tlbiAhPT0gdW5kZWZpbmVkICYmIGFkbWluVG9rZW4ubGVuZ3RoID4gMCA/IHsgYWRtaW5Ub2tlbiB9IDoge30pLFxuICAgICAgICAgIC4uLihvcHRzLmRhdGEgIT09IHVuZGVmaW5lZCA/IHsgZGF0YURpcjogcmVzb2x2ZShvcHRzLmRhdGEpIH0gOiB7fSksXG4gICAgICAgIH0pO1xuICAgICAgICBwcm9jZXNzLnN0ZG91dC53cml0ZShcbiAgICAgICAgICBgb2FocyBzcGluZS1hcGkgbGlzdGVuaW5nIG9uIDoke2hhbmRsZS5wb3J0fSAoSFRUUCAvcnBjLyosIE1DUCAvbWNwOyBlbmdpbmU6ICR7aGFuZGxlLmVuZ2luZUtpbmR9JHtcbiAgICAgICAgICAgIG9wdHMuZGF0YSAhPT0gdW5kZWZpbmVkID8gYCwgZGF0YTogJHtyZXNvbHZlKG9wdHMuZGF0YSl9YCA6ICcnXG4gICAgICAgICAgfSlcXG5gLFxuICAgICAgICApO1xuICAgICAgICBpZiAoaGFuZGxlLmFkbWluVG9rZW5HZW5lcmF0ZWQpIHtcbiAgICAgICAgICBwcm9jZXNzLnN0ZG91dC53cml0ZShgYWRtaW4gdG9rZW4gKGdlbmVyYXRlZCk6ICR7aGFuZGxlLmFkbWluVG9rZW59XFxuYCk7XG4gICAgICAgIH1cbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIGNvbnN0IGVyciA9IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvciA6IG5ldyBFcnJvcihTdHJpbmcoZXJyb3IpKTtcbiAgICAgICAgcHJvY2Vzcy5zdGRlcnIud3JpdGUoYCR7ZXJyLm5hbWV9OiAke2Vyci5tZXNzYWdlfVxcbmApO1xuICAgICAgICBwcm9jZXNzLmV4aXRDb2RlID0gMTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAvLyAtLSBnYXRlLWhvbGRlciAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgd2l0aENsaWVudEZsYWdzKHByb2dyYW0uY29tbWFuZCgnaW5ib3gnKSlcbiAgICAuZGVzY3JpcHRpb24oJ2l0ZW1zIGF3YWl0aW5nIGEgZ2F0ZSBkZWNpc2lvbiAoc3BlYyBhcHByb3ZhbCAvIHJldmlldyBkZWNpc2lvbiknKVxuICAgIC5hY3Rpb24oYXN5bmMgKG9wdHM6IENsaWVudEZsYWdzKSA9PiBlbWl0KCgpID0+IGluYm94Q29tbWFuZChjbGllbnRGcm9tKG9wdHMpKSkpO1xuXG4gIHdpdGhDbGllbnRGbGFncyhwcm9ncmFtLmNvbW1hbmQoJ2FwcHJvdmUgPHdvcmtJdGVtSWQ+JykpXG4gICAgLmRlc2NyaXB0aW9uKCdhcHByb3ZlIGEgZ2F0ZSAoc3BlY19hcHByb3ZhbCBwaW5zIHZlcmlmaWNhdGlvbiBjb21tYW5kcyknKVxuICAgIC5yZXF1aXJlZE9wdGlvbignLS1nYXRlIDxnYXRlPicsICdzcGVjX2FwcHJvdmFsIHwgcmV2aWV3X2FwcHJvdmFsJylcbiAgICAub3B0aW9uKCctLXBpbiA8Y21kPicsICdwaW4gYSB2ZXJpZmljYXRpb24gY29tbWFuZCAocmVwZWF0YWJsZSwgc3BlY19hcHByb3ZhbCBvbmx5KScsIGNvbGxlY3QsIFtdKVxuICAgIC5hY3Rpb24oYXN5bmMgKHdvcmtJdGVtSWQ6IHN0cmluZywgb3B0czogQ2xpZW50RmxhZ3MgJiB7IGdhdGU6IHN0cmluZzsgcGluOiBzdHJpbmdbXSB9KSA9PlxuICAgICAgZW1pdCgoKSA9PiBhcHByb3ZlQ29tbWFuZChjbGllbnRGcm9tKG9wdHMpLCB7IHdvcmtJdGVtSWQsIGdhdGU6IG9wdHMuZ2F0ZSwgcGluOiBvcHRzLnBpbiB9KSksXG4gICAgKTtcblxuICB3aXRoQ2xpZW50RmxhZ3MocHJvZ3JhbS5jb21tYW5kKCdhZHZhbmNlIDx3b3JrSXRlbUlkPicpKVxuICAgIC5kZXNjcmlwdGlvbignYWR2YW5jZSBhIHdvcmsgaXRlbSB0aHJvdWdoIHRoZSBGU00gKHBsYW5uaW5nLXpvbmUgbW92ZXMgZm9yIGh1bWFucyknKVxuICAgIC5yZXF1aXJlZE9wdGlvbignLS10byA8c3RhdGU+JywgJ3RhcmdldCBzdGF0ZSwgZS5nLiBkcmFmdCB8IHJlYWR5X2Zvcl9kZXYnKVxuICAgIC5vcHRpb24oJy0tZmVuY2luZy10b2tlbiA8bj4nLCAnZmVuY2luZyB0b2tlbiB3aGVuIGFjdGluZyB1bmRlciBhIGNsYWltJywgKHY6IHN0cmluZykgPT4gTnVtYmVyKHYpKVxuICAgIC5hY3Rpb24oYXN5bmMgKHdvcmtJdGVtSWQ6IHN0cmluZywgb3B0czogQ2xpZW50RmxhZ3MgJiB7IHRvOiBzdHJpbmc7IGZlbmNpbmdUb2tlbj86IG51bWJlciB9KSA9PlxuICAgICAgZW1pdCgoKSA9PlxuICAgICAgICBhZHZhbmNlQ29tbWFuZChjbGllbnRGcm9tKG9wdHMpLCB7XG4gICAgICAgICAgd29ya0l0ZW1JZCxcbiAgICAgICAgICB0bzogb3B0cy50byxcbiAgICAgICAgICAuLi4ob3B0cy5mZW5jaW5nVG9rZW4gIT09IHVuZGVmaW5lZCA/IHsgZmVuY2luZ1Rva2VuOiBvcHRzLmZlbmNpbmdUb2tlbiB9IDoge30pLFxuICAgICAgICB9KSxcbiAgICAgICksXG4gICAgKTtcblxuICB3aXRoQ2xpZW50RmxhZ3MocHJvZ3JhbS5jb21tYW5kKCdyZWplY3QgPHdvcmtJdGVtSWQ+JykpXG4gICAgLmRlc2NyaXB0aW9uKCdyZWplY3QgYSBnYXRlIChyZXZpZXcgcmVqZWN0aW9uIGZpcmVzIHRoZSBkZXRlcm1pbmlzdGljIGxvb3BiYWNrKScpXG4gICAgLnJlcXVpcmVkT3B0aW9uKCctLWdhdGUgPGdhdGU+JywgJ3NwZWNfYXBwcm92YWwgfCByZXZpZXdfYXBwcm92YWwnKVxuICAgIC5hY3Rpb24oYXN5bmMgKHdvcmtJdGVtSWQ6IHN0cmluZywgb3B0czogQ2xpZW50RmxhZ3MgJiB7IGdhdGU6IHN0cmluZyB9KSA9PlxuICAgICAgZW1pdCgoKSA9PiByZWplY3RDb21tYW5kKGNsaWVudEZyb20ob3B0cyksIHsgd29ya0l0ZW1JZCwgZ2F0ZTogb3B0cy5nYXRlIH0pKSxcbiAgICApO1xuXG4gIHdpdGhDbGllbnRGbGFncyhwcm9ncmFtLmNvbW1hbmQoJ3N0YXR1cycpKVxuICAgIC5kZXNjcmlwdGlvbignYWxsIHdvcmsgaXRlbXMgZ3JvdXBlZCBieSBzdGF0ZSwgcGx1cyBmZWF0dXJlIGRpc3BhdGNoIGhvbGRzJylcbiAgICAuYWN0aW9uKGFzeW5jIChvcHRzOiBDbGllbnRGbGFncykgPT4gZW1pdCgoKSA9PiBzdGF0dXNDb21tYW5kKGNsaWVudEZyb20ob3B0cykpKSk7XG5cbiAgY29uc3QgYWN0b3IgPSBwcm9ncmFtLmNvbW1hbmQoJ2FjdG9yJykuZGVzY3JpcHRpb24oJ2FjdG9yIG1hbmFnZW1lbnQgKGFkbWluKScpO1xuICB3aXRoQ2xpZW50RmxhZ3MoYWN0b3IuY29tbWFuZCgnY3JlYXRlJykpXG4gICAgLmRlc2NyaXB0aW9uKCdjcmVhdGUgYSB1c2VyIG9yIGFnZW50IGFjdG9yOyBwcmludHMgYWN0b3JJZCArIHRva2VuIChhZG1pbiBvbmx5KScpXG4gICAgLnJlcXVpcmVkT3B0aW9uKCctLXR5cGUgPHR5cGU+JywgJ3VzZXIgfCBhZ2VudCcpXG4gICAgLnJlcXVpcmVkT3B0aW9uKCctLW5hbWUgPG5hbWU+JywgJ2Rpc3BsYXkgbmFtZScpXG4gICAgLmFjdGlvbihhc3luYyAob3B0czogQ2xpZW50RmxhZ3MgJiB7IHR5cGU6IHN0cmluZzsgbmFtZTogc3RyaW5nIH0pID0+XG4gICAgICBlbWl0KCgpID0+IGFjdG9yQ3JlYXRlQ29tbWFuZChjbGllbnRGcm9tKG9wdHMpLCB7IHR5cGU6IG9wdHMudHlwZSwgbmFtZTogb3B0cy5uYW1lIH0pKSxcbiAgICApO1xuXG4gIHdpdGhDbGllbnRGbGFncyhwcm9ncmFtLmNvbW1hbmQoJ2dyYW50IDxhY3RvcklkPiA8cGVybWlzc2lvbj4nKSlcbiAgICAuZGVzY3JpcHRpb24oJ2dyYW50IGEgcGVybWlzc2lvbiB0byBhbiBhY3RvciAoYWRtaW4gb25seSknKVxuICAgIC5hY3Rpb24oYXN5bmMgKGFjdG9ySWQ6IHN0cmluZywgcGVybWlzc2lvbjogc3RyaW5nLCBvcHRzOiBDbGllbnRGbGFncykgPT5cbiAgICAgIGVtaXQoKCkgPT4gZ3JhbnRDb21tYW5kKGNsaWVudEZyb20ob3B0cyksIHsgYWN0b3JJZCwgcGVybWlzc2lvbiB9KSksXG4gICAgKTtcblxuICBjb25zdCBmZWF0dXJlID0gcHJvZ3JhbS5jb21tYW5kKCdmZWF0dXJlJykuZGVzY3JpcHRpb24oJ2ZlYXR1cmUgbWFuYWdlbWVudCcpO1xuICB3aXRoQ2xpZW50RmxhZ3MoZmVhdHVyZS5jb21tYW5kKCdjcmVhdGUnKSlcbiAgICAuZGVzY3JpcHRpb24oJ2NyZWF0ZSBhIGZlYXR1cmU7IHByaW50cyBmZWF0dXJlSWQnKVxuICAgIC5hY3Rpb24oYXN5bmMgKG9wdHM6IENsaWVudEZsYWdzKSA9PiBlbWl0KCgpID0+IGZlYXR1cmVDcmVhdGVDb21tYW5kKGNsaWVudEZyb20ob3B0cykpKSk7XG5cbiAgd2l0aENsaWVudEZsYWdzKHByb2dyYW0uY29tbWFuZCgnaW1wb3J0IDxmZWF0dXJlSWQ+IDxzdG9yaWVzWWFtbFBhdGg+JykpXG4gICAgLmRlc2NyaXB0aW9uKCdpbXBvcnQgYSBzdG9yaWVzLnlhbWwgZmlsZSBpbnRvIGEgZmVhdHVyZSAoaWRlbXBvdGVudCknKVxuICAgIC5hY3Rpb24oYXN5bmMgKGZlYXR1cmVJZDogc3RyaW5nLCBzdG9yaWVzWWFtbFBhdGg6IHN0cmluZywgb3B0czogQ2xpZW50RmxhZ3MpID0+XG4gICAgICBlbWl0KCgpID0+IGltcG9ydFN0b3JpZXNDb21tYW5kKGNsaWVudEZyb20ob3B0cyksIHsgZmVhdHVyZUlkLCBwYXRoOiBzdG9yaWVzWWFtbFBhdGggfSkpLFxuICAgICk7XG5cbiAgd2l0aENsaWVudEZsYWdzKHByb2dyYW0uY29tbWFuZCgnZXZlbnRzIFtzdHJlYW1JZF0nKSlcbiAgICAuZGVzY3JpcHRpb24oJ2F1ZGl0IHF1ZXJ5IG92ZXIgdGhlIGFwcGVuZC1vbmx5IGV2ZW50IGxvZycpXG4gICAgLmFjdGlvbihhc3luYyAoc3RyZWFtSWQ6IHN0cmluZyB8IHVuZGVmaW5lZCwgb3B0czogQ2xpZW50RmxhZ3MpID0+XG4gICAgICBlbWl0KCgpID0+XG4gICAgICAgIGV2ZW50c0NvbW1hbmQoY2xpZW50RnJvbShvcHRzKSwgc3RyZWFtSWQgIT09IHVuZGVmaW5lZCA/IHsgc3RyZWFtSWQgfSA6IHt9KSxcbiAgICAgICksXG4gICAgKTtcblxuICAvLyAtLSB3b3JrIChydW5uZXIgaGFuZG9mZjsgQG9haHMvcnVubmVyIGxhbmRzIHdpdGggc3RvcnkgMTQpIC0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgd2l0aENsaWVudEZsYWdzKHByb2dyYW0uY29tbWFuZCgnd29yaycpKVxuICAgIC5kZXNjcmlwdGlvbigncnVuIHRoZSBCWU8gd29ya2VyIGxvb3AgYWdhaW5zdCB0aGlzIHNwaW5lIChyZXF1aXJlcyBAb2Focy9ydW5uZXIpJylcbiAgICAucmVxdWlyZWRPcHRpb24oJy0tcmVwbyA8cGF0aD4nLCAndGFyZ2V0IHByb2plY3QgZ2l0IGNoZWNrb3V0JylcbiAgICAucmVxdWlyZWRPcHRpb24oJy0tc3BlYy1mb2xkZXIgPHJlbD4nLCAnc3BlYyBmb2xkZXIgcmVsYXRpdmUgdG8gdGhlIHJlcG8gcm9vdCcpXG4gICAgLnJlcXVpcmVkT3B0aW9uKCctLWFnZW50LWNtZCA8dGVtcGxhdGU+JywgJ2NvZGluZy1hZ2VudCBjb21tYW5kIHRlbXBsYXRlICh7U1BFQ19GT0xERVJ9IHtTVE9SWV9JRH0ge0lOVk9LRV9XSVRIfSB7V09SS1RSRUV9KScpXG4gICAgLm9wdGlvbignLS1vbmNlJywgJ2Rpc3BhdGNoIGF0IG1vc3Qgb25lIHdvcmsgaXRlbSwgdGhlbiBleGl0JylcbiAgICAub3B0aW9uKCctLXBvbGwgPG1zPicsICdwb2xsIGludGVydmFsIGluIG1pbGxpc2Vjb25kcycpXG4gICAgLmFjdGlvbihcbiAgICAgIGFzeW5jIChcbiAgICAgICAgb3B0czogQ2xpZW50RmxhZ3MgJiB7XG4gICAgICAgICAgcmVwbzogc3RyaW5nO1xuICAgICAgICAgIHNwZWNGb2xkZXI6IHN0cmluZztcbiAgICAgICAgICBhZ2VudENtZDogc3RyaW5nO1xuICAgICAgICAgIG9uY2U/OiBib29sZWFuO1xuICAgICAgICAgIHBvbGw/OiBzdHJpbmc7XG4gICAgICAgIH0sXG4gICAgICApID0+IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBjb25zdCBjbGllbnQgPSBjbGllbnRGcm9tKG9wdHMpO1xuICAgICAgICAgIC8vIExBWlkgaW1wb3J0OiB0aGUgcnVubmVyIGlzIGEgZml4ZWQgaW50ZXJmYWNlIHRoYXQgbWF5IHN0aWxsIGJlIGFcbiAgICAgICAgICAvLyBzdHViIFx1MjAxNCB0aGUgcmVzdCBvZiB0aGUgQ0xJIG11c3QgbmV2ZXIgcGF5IGZvciAob3IgYnJlYWsgb24pIGl0LlxuICAgICAgICAgIGNvbnN0IHJ1bm5lciA9IGF3YWl0IGltcG9ydCgnQG9haHMvcnVubmVyJyk7XG4gICAgICAgICAgYXdhaXQgcnVubmVyLndvcmtMb29wKHtcbiAgICAgICAgICAgIGNsaWVudCxcbiAgICAgICAgICAgIHJlcG9QYXRoOiByZXNvbHZlKG9wdHMucmVwbyksXG4gICAgICAgICAgICBzcGVjRm9sZGVyOiBvcHRzLnNwZWNGb2xkZXIsXG4gICAgICAgICAgICBhZ2VudENtZDogb3B0cy5hZ2VudENtZCxcbiAgICAgICAgICAgIC4uLihvcHRzLnBvbGwgIT09IHVuZGVmaW5lZCA/IHsgcG9sbE1zOiBOdW1iZXIob3B0cy5wb2xsKSB9IDoge30pLFxuICAgICAgICAgICAgLi4uKG9wdHMub25jZSA9PT0gdHJ1ZSA/IHsgb25jZTogdHJ1ZSB9IDoge30pLFxuICAgICAgICAgIH0pO1xuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgIGNvbnN0IGVyciA9IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvciA6IG5ldyBFcnJvcihTdHJpbmcoZXJyb3IpKTtcbiAgICAgICAgICBwcm9jZXNzLnN0ZGVyci53cml0ZShgb2FocyB3b3JrIGZhaWxlZCBcdTIwMTQgJHtlcnIubmFtZX06ICR7ZXJyLm1lc3NhZ2V9XFxuYCk7XG4gICAgICAgICAgcHJvY2Vzcy5leGl0Q29kZSA9IDE7XG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgKTtcblxuICByZXR1cm4gcHJvZ3JhbTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIG1haW4oYXJndjogc3RyaW5nW10gPSBwcm9jZXNzLmFyZ3YpOiBQcm9taXNlPHZvaWQ+IHtcbiAgYXdhaXQgYnVpbGRQcm9ncmFtKCkucGFyc2VBc3luYyhhcmd2KTtcbn1cblxuLy8gQnVuZGxlZCBhcyBiaW4vb2Focy5tanMgXHUyMDE0IHRoZSBidW5kbGUgZW50cnlwb2ludCBJUyB0aGUgZXhlY3V0YWJsZS5cbnZvaWQgbWFpbigpO1xuIiwgIi8qKlxuICogQG9haHMvY29udHJhY3RzIFx1MjAxNCB0aGUgc2luZ2xlIHNvdXJjZSBvZiB0cnV0aCBmb3IgZXZlcnkgb2FocyBjb21tYW5kLlxuICpcbiAqIE9uZSByZWdpc3RyeSBlbnRyeSA9IG9uZSBIVFRQIGVuZHBvaW50IChgUE9TVCAvcnBjLzxuYW1lPmApID0gb25lIE1DUCB0b29sXG4gKiAoYG9haHNfPG5hbWU+YCkgPSBvbmUgdHlwZWQgY2xpZW50IG1ldGhvZC4gQm90aCBhZGFwdGVycyBjYWxsIHRoZSBzYW1lXG4gKiBjb21tYW5kIGJ1cyB3aXRoIHRoZSBzYW1lIHpvZC12YWxpZGF0ZWQgaW5wdXQsIHNvIFwiTUNQIHNlbWFudGljcyBcdTIyNjEgSFRUUFxuICogc2VtYW50aWNzXCIgaXMgYSBzdHJ1Y3R1cmFsIGNvbnNlcXVlbmNlLCBub3QgYSByZXZpZXcgZGlzY2lwbGluZVxuICogKHByb2R1Y3Qtcm9hZG1hcC5tZCBcdTAwQTcwLjEgaW52YXJpYW50LCBENSkuXG4gKlxuICogVHJhbnNwb3J0IGlzIGRlbGliZXJhdGVseSB1bmlmb3JtIFJQQyAobm8gUkVTVCBwYXRoIHBhcmFtZXRlcnMpOiBwYXJpdHlcbiAqIGJldHdlZW4gc3VyZmFjZXMgc3RheXMgbWFjaGluZS1jaGVja2FibGUsIGFuZCB0aGUgcGFyaXR5IHRlc3QgaW5cbiAqIGFwcHMvc3BpbmUtYXBpIGFzc2VydHMgZXZlcnkgcmVnaXN0cnkgZW50cnkgZXhpc3RzIG9uIGJvdGggc3VyZmFjZXMuXG4gKi9cbmltcG9ydCB7IHogfSBmcm9tICd6b2QnO1xuaW1wb3J0IHtcbiAgQkxPQ0tFRF9SRUFTT05TLFxuICBXT1JLX0lURU1fU1RBVEVTLFxuICB0eXBlIFNwaW5lRW5naW5lLFxufSBmcm9tICdAb2Focy9jb3JlJztcblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBTaGFyZWQgZmllbGQgc2NoZW1hc1xuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbmNvbnN0IHdvcmtJdGVtSWQgPSB6LnN0cmluZygpLm1pbigxKS5kZXNjcmliZSgnV29yayBpdGVtIGlkIChvciBpdHMgc3Rvcmllcy55YW1sIGV4dGVybmFsS2V5KScpO1xuY29uc3QgZmVuY2luZ1Rva2VuID0gelxuICAubnVtYmVyKClcbiAgLmludCgpXG4gIC5vcHRpb25hbCgpXG4gIC5kZXNjcmliZSgnRmVuY2luZyB0b2tlbiBvZiB0aGUgbGl2ZSBjbGFpbSBcdTIwMTQgcmVxdWlyZWQgZm9yIGV4ZWN1dGlvbi16b25lIG11dGF0aW9ucycpO1xuXG5jb25zdCBldmlkZW5jZVNjaGVtYSA9IHpcbiAgLm9iamVjdCh7XG4gICAga2luZDogei5lbnVtKFsndGVzdF9ydW4nLCAnZ2l0X2RpZmYnLCAnY29tbWl0JywgJ2hhbHRfcmVwb3J0JywgJ3Jldmlld19yZXBvcnQnLCAnZG9jX2xpbnQnXSksXG4gICAgcGF5bG9hZDogei5yZWNvcmQoei5zdHJpbmcoKSwgei51bmtub3duKCkpLFxuICB9KVxuICAuZGVzY3JpYmUoJ1JhdyBtYWNoaW5lLWNvbGxlY3RlZCBldmlkZW5jZTsgdGhlIGNvcmUgY29tcHV0ZXMgdmVyZGljdHMsIHRoZSBydW5uZXIgbmV2ZXIgZG9lcycpO1xuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIFJlZ2lzdHJ5XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuZXhwb3J0IGludGVyZmFjZSBDb21tYW5kRGVmPElucHV0IGV4dGVuZHMgei5ab2RUeXBlID0gei5ab2RUeXBlPiB7XG4gIC8qKiBzbmFrZV9jYXNlIGNvbW1hbmQgbmFtZTsgSFRUUCBwYXRoIGlzIC9ycGMvPG5hbWU+LCBNQ1AgdG9vbCBpcyBvYWhzXzxuYW1lPiAqL1xuICBuYW1lOiBzdHJpbmc7XG4gIGRlc2NyaXB0aW9uOiBzdHJpbmc7XG4gIGlucHV0OiBJbnB1dDtcbiAgLyoqIHRydWUgd2hlbiB0aGUgY29tbWFuZCBvbmx5IHJlYWRzIHN0YXRlICh1c2VkIGZvciBkb2NzOyBzYW1lIHJhaWxzIGVpdGhlciB3YXkpICovXG4gIHJlYWRvbmx5OiBib29sZWFuO1xufVxuXG5mdW5jdGlvbiBkZWY8SSBleHRlbmRzIHouWm9kVHlwZT4oXG4gIG5hbWU6IHN0cmluZyxcbiAgZGVzY3JpcHRpb246IHN0cmluZyxcbiAgaW5wdXQ6IEksXG4gIHJlYWRvbmx5ID0gZmFsc2UsXG4pOiBDb21tYW5kRGVmPEk+IHtcbiAgcmV0dXJuIHsgbmFtZSwgZGVzY3JpcHRpb24sIGlucHV0LCByZWFkb25seSB9O1xufVxuXG5leHBvcnQgY29uc3QgQ09NTUFORFMgPSBbXG4gIC8vIC0tIHNldHVwIC8gYWRtaW4gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIGRlZihcbiAgICAnY3JlYXRlX2FjdG9yJyxcbiAgICAnQ3JlYXRlIGEgdXNlciBvciBhZ2VudCBhY3Rvci4gUmV0dXJucyB0aGUgYWN0b3IgYW5kIGl0cyBBUEkgdG9rZW4gKGFkbWluIG9ubHkpLicsXG4gICAgei5vYmplY3Qoe1xuICAgICAgdHlwZTogei5lbnVtKFsndXNlcicsICdhZ2VudCddKSxcbiAgICAgIGRpc3BsYXlOYW1lOiB6LnN0cmluZygpLm1pbigxKSxcbiAgICB9KSxcbiAgKSxcbiAgZGVmKFxuICAgICdncmFudF9wZXJtaXNzaW9uJyxcbiAgICAnR3JhbnQgYSBwZXJtaXNzaW9uIHRvIGFuIGFjdG9yIChhZG1pbiBvbmx5KS4gR3JhbnRzIGFyZSBleHBsaWNpdCBhbmQgYXVkaXRlZCBcdTIwMTQgYXV0aG9yaXR5IG5ldmVyIGNvbWVzIGZyb20gYWN0b3IgdHlwZSwgdGVudXJlLCBvciBtZW1vcnkgKHRoZXNpcyBcdTAwQTczKS4nLFxuICAgIHoub2JqZWN0KHtcbiAgICAgIGFjdG9ySWQ6IHouc3RyaW5nKCkubWluKDEpLFxuICAgICAgcGVybWlzc2lvbjogei5zdHJpbmcoKS5taW4oMSksXG4gICAgICBzY29wZTogei5zdHJpbmcoKS5vcHRpb25hbCgpLFxuICAgIH0pLFxuICApLFxuICBkZWYoXG4gICAgJ3Jldm9rZV9wZXJtaXNzaW9uJyxcbiAgICAnUmV2b2tlIGEgcGVybWlzc2lvbiBmcm9tIGFuIGFjdG9yIChhZG1pbiBvbmx5KS4nLFxuICAgIHoub2JqZWN0KHtcbiAgICAgIGFjdG9ySWQ6IHouc3RyaW5nKCkubWluKDEpLFxuICAgICAgcGVybWlzc2lvbjogei5zdHJpbmcoKS5taW4oMSksXG4gICAgICBzY29wZTogei5zdHJpbmcoKS5vcHRpb25hbCgpLFxuICAgIH0pLFxuICApLFxuICBkZWYoJ2NyZWF0ZV9mZWF0dXJlJywgJ0NyZWF0ZSBhIGZlYXR1cmUgKG1hcHMgYSBCTUFEIGVwaWMpLicsIHoub2JqZWN0KHt9KSksXG4gIGRlZihcbiAgICAnaW1wb3J0X3N0b3JpZXMnLFxuICAgICdJbXBvcnQgYSBzdG9yaWVzLnlhbWwgZmlsZSBpbnRvIGEgZmVhdHVyZSAoaWRlbXBvdGVudCByZS1pbXBvcnQ7IHZhbGlkaXR5IHJ1bGVzIGZyb20gc3Rvcmllcy1zY2hlbWEubWQpLicsXG4gICAgei5vYmplY3Qoe1xuICAgICAgZmVhdHVyZUlkOiB6LnN0cmluZygpLm1pbigxKSxcbiAgICAgIHlhbWw6IHouc3RyaW5nKCkubWluKDEpLFxuICAgIH0pLFxuICApLFxuXG4gIC8vIC0tIGNsYWltcyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIGRlZihcbiAgICAnY2xhaW1fdGFzaycsXG4gICAgJ0NsYWltIGEgd29yayBpdGVtIHVuZGVyIGEgbGVhc2UuIFJldHVybnMgdGhlIGNsYWltIHdpdGggaXRzIGZlbmNpbmcgdG9rZW4uJyxcbiAgICB6Lm9iamVjdCh7XG4gICAgICB3b3JrSXRlbUlkLFxuICAgICAgdHRsTXM6IHoubnVtYmVyKCkuaW50KCkucG9zaXRpdmUoKS5vcHRpb25hbCgpLFxuICAgIH0pLFxuICApLFxuICBkZWYoJ2hlYXJ0YmVhdCcsICdSZW5ldyB0aGUgbGVhc2Ugb2YgYSBsaXZlIGNsYWltLicsIHoub2JqZWN0KHsgY2xhaW1JZDogei5zdHJpbmcoKS5taW4oMSkgfSkpLFxuICBkZWYoXG4gICAgJ3JlbGVhc2VfY2xhaW0nLFxuICAgICdSZWxlYXNlIGEgY2xhaW0gKG5vcm1hbCBjb21wbGV0aW9uIG9yIHZvbHVudGFyeSBoYW5kb2ZmKS4nLFxuICAgIHoub2JqZWN0KHsgY2xhaW1JZDogei5zdHJpbmcoKS5taW4oMSksIHJlYXNvbjogei5zdHJpbmcoKS5vcHRpb25hbCgpIH0pLFxuICApLFxuXG4gIC8vIC0tIGxpZmVjeWNsZSAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgZGVmKFxuICAgICdhZHZhbmNlX3N0YXRlJyxcbiAgICAnQWR2YW5jZSBhIHdvcmsgaXRlbSB0aHJvdWdoIHRoZSBGU00uIERldGVybWluaXN0aWM6IHBlcm1pc3Npb24gKyBndWFyZHMgKyBldmlkZW5jZSBkZWNpZGUsIG5ldmVyIGludGVycHJldGF0aW9uLicsXG4gICAgei5vYmplY3Qoe1xuICAgICAgd29ya0l0ZW1JZCxcbiAgICAgIHRvOiB6LmVudW0oV09SS19JVEVNX1NUQVRFUyksXG4gICAgICBmZW5jaW5nVG9rZW4sXG4gICAgICBpZGVtcG90ZW5jeUtleTogei5zdHJpbmcoKS5vcHRpb25hbCgpLFxuICAgIH0pLFxuICApLFxuICBkZWYoXG4gICAgJ2Jsb2NrX3Rhc2snLFxuICAgICdTZXQgdGhlIGJsb2NrZWQgb3ZlcmxheSB3aXRoIGEgYmxvY2tpbmcgY29uZGl0aW9uIGZyb20gdGhlIEhBTFQgdGF4b25vbXkuJyxcbiAgICB6Lm9iamVjdCh7XG4gICAgICB3b3JrSXRlbUlkLFxuICAgICAgcmVhc29uOiB6LmVudW0oQkxPQ0tFRF9SRUFTT05TKSxcbiAgICAgIGZlbmNpbmdUb2tlbixcbiAgICB9KSxcbiAgKSxcbiAgZGVmKCd1bmJsb2NrX3Rhc2snLCAnQ2xlYXIgdGhlIGJsb2NrZWQgb3ZlcmxheSAocmV2aWV3X25vbl9jb252ZXJnZW5jZSBuZWVkcyB0aGUgcmV2aWV3IGdhdGUgZ3JhbnQpLicsIHoub2JqZWN0KHsgd29ya0l0ZW1JZCB9KSksXG4gIGRlZihcbiAgICAnc3VibWl0X2V2aWRlbmNlJyxcbiAgICAnU3VibWl0IHJhdyBtYWNoaW5lLWNvbGxlY3RlZCBldmlkZW5jZSAoZXhpdCBjb2RlcywgZGlmZiBzdGF0cywgc2hhcykuIFRoZSBjb3JlIGNvbXB1dGVzIHZlcmRpY3RzLicsXG4gICAgei5vYmplY3QoeyB3b3JrSXRlbUlkLCBldmlkZW5jZTogZXZpZGVuY2VTY2hlbWEsIGZlbmNpbmdUb2tlbiB9KSxcbiAgKSxcbiAgZGVmKFxuICAgICdhcHByb3ZlX2dhdGUnLFxuICAgICdBcHByb3ZlIGEgZ2F0ZSBhcyBhIHBlcm1pdHRlZCBhY3Rvci4gc3BlY19hcHByb3ZhbCBwaW5zIHRoZSB2ZXJpZmljYXRpb24gY29tbWFuZHMgKEQ3KSBhbmQgZmlyZXMgZHJhZnRcdTIxOTJyZWFkeV9mb3JfZGV2OyByZXZpZXdfYXBwcm92YWwgY2hlY2tzIHBpbm5lZCBldmlkZW5jZSBhbmQgZmlyZXMgaW5fcmV2aWV3XHUyMTkyZG9uZS4nLFxuICAgIHoub2JqZWN0KHtcbiAgICAgIHdvcmtJdGVtSWQsXG4gICAgICBnYXRlOiB6LmVudW0oWydzcGVjX2FwcHJvdmFsJywgJ3Jldmlld19hcHByb3ZhbCddKSxcbiAgICAgIHBpbm5lZFZlcmlmaWNhdGlvbjogei5hcnJheSh6LnN0cmluZygpKS5vcHRpb25hbCgpLFxuICAgIH0pLFxuICApLFxuICBkZWYoXG4gICAgJ3JlamVjdF9nYXRlJyxcbiAgICAnUmVqZWN0IGEgZ2F0ZSBhcyBhIHBlcm1pdHRlZCBhY3Rvci4gUmV2aWV3IHJlamVjdGlvbiBmaXJlcyB0aGUgbG9vcGJhY2sgYXMgYSBzeXN0ZW0gZWZmZWN0IChvciBibG9ja3Mgd2l0aCByZXZpZXdfbm9uX2NvbnZlcmdlbmNlIG9uIHRoZSA2dGgpLicsXG4gICAgei5vYmplY3Qoe1xuICAgICAgd29ya0l0ZW1JZCxcbiAgICAgIGdhdGU6IHouZW51bShbJ3NwZWNfYXBwcm92YWwnLCAncmV2aWV3X2FwcHJvdmFsJ10pLFxuICAgIH0pLFxuICApLFxuICBkZWYoXG4gICAgJ3JlbGVhc2VfZGlzcGF0Y2hfaG9sZCcsXG4gICAgJ1JlbGVhc2UgYSBkb25lX2NoZWNrcG9pbnQgZGlzcGF0Y2ggaG9sZCBvbiBhIGZlYXR1cmUgKHBlcm1pdHRlZCBhY3RvcnMgb25seSkuJyxcbiAgICB6Lm9iamVjdCh7IGZlYXR1cmVJZDogei5zdHJpbmcoKS5taW4oMSkgfSksXG4gICksXG5cbiAgLy8gLS0gb3BzIChzbyBub2JvZHkgZXZlciBuZWVkcyB0byB0b3VjaCB0aGUgREIgYnkgaGFuZCkgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgZGVmKFxuICAgICdmb3JjZV9yZWxlYXNlX2NsYWltJyxcbiAgICAnT3BzOiBmb3JjZS1yZWxlYXNlIHRoZSBsaXZlIGNsYWltIG9mIGEgd29yayBpdGVtIChzdHVjayBydW5uZXIsIGxvc3QgbWFjaGluZSkuJyxcbiAgICB6Lm9iamVjdCh7IHdvcmtJdGVtSWQgfSksXG4gICksXG5cbiAgLy8gLS0gcXVlcmllcyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICBkZWYoJ2dldF93b3JrX2l0ZW0nLCAnRmV0Y2ggb25lIHdvcmsgaXRlbSBieSBpZCBvciBleHRlcm5hbEtleS4nLCB6Lm9iamVjdCh7IHdvcmtJdGVtSWQgfSksIHRydWUpLFxuICBkZWYoJ2dldF9mZWF0dXJlJywgJ0ZldGNoIG9uZSBmZWF0dXJlLicsIHoub2JqZWN0KHsgZmVhdHVyZUlkOiB6LnN0cmluZygpLm1pbigxKSB9KSwgdHJ1ZSksXG4gIGRlZihcbiAgICAnZ2V0X3Rhc2tfY29udGV4dCcsXG4gICAgJ0Rpc3BhdGNoIGNvbnRleHQgZm9yIGEgcnVubmVyOiBlbnRyeSBzdGF0ZSByb3V0aW5nIHBlciBkZXYtYXV0by4gUmVmdXNlcyBkb25lIGl0ZW1zIGFuZCBoZWxkIGZlYXR1cmVzLicsXG4gICAgei5vYmplY3QoeyB3b3JrSXRlbUlkIH0pLFxuICAgIHRydWUsXG4gICksXG4gIGRlZihcbiAgICAnbGlzdF93b3JrX2l0ZW1zJyxcbiAgICAnTGlzdCB3b3JrIGl0ZW1zLCBvcHRpb25hbGx5IGZpbHRlcmVkIGJ5IHN0YXRlIC8gZmVhdHVyZSAvIGNsYWltYWJpbGl0eS4nLFxuICAgIHoub2JqZWN0KHtcbiAgICAgIHN0YXRlOiB6LmVudW0oV09SS19JVEVNX1NUQVRFUykub3B0aW9uYWwoKSxcbiAgICAgIGZlYXR1cmVJZDogei5zdHJpbmcoKS5vcHRpb25hbCgpLFxuICAgICAgY2xhaW1hYmxlOiB6LmJvb2xlYW4oKS5vcHRpb25hbCgpLmRlc2NyaWJlKCd0cnVlID0gbm8gbGl2ZSBjbGFpbSBvbiB0aGUgaXRlbScpLFxuICAgIH0pLFxuICAgIHRydWUsXG4gICksXG4gIGRlZihcbiAgICAnaW5ib3gnLFxuICAgICdHYXRlLWhvbGRlciBpbmJveDogaXRlbXMgYXdhaXRpbmcgYSBnYXRlIGRlY2lzaW9uIChkcmFmdCtzcGVjX2NoZWNrcG9pbnQgYXdhaXRpbmcgc3BlYyBhcHByb3ZhbDsgaW5fcmV2aWV3IGF3YWl0aW5nIHJldmlldyBkZWNpc2lvbikuJyxcbiAgICB6Lm9iamVjdCh7fSksXG4gICAgdHJ1ZSxcbiAgKSxcbiAgZGVmKFxuICAgICdxdWVyeV9ldmVudHMnLFxuICAgICdBdWRpdCBxdWVyeTogdGhlIGFwcGVuZC1vbmx5IGV2ZW50IGxvZywgb3B0aW9uYWxseSBzY29wZWQgdG8gb25lIHN0cmVhbS4nLFxuICAgIHoub2JqZWN0KHsgc3RyZWFtSWQ6IHouc3RyaW5nKCkub3B0aW9uYWwoKSB9KSxcbiAgICB0cnVlLFxuICApLFxuICBkZWYoJ2dldF9jbGFpbXMnLCAnQWxsIGNsYWltcyAobGl2ZSBhbmQgcmVsZWFzZWQpIG9mIGEgd29yayBpdGVtLicsIHoub2JqZWN0KHsgd29ya0l0ZW1JZCB9KSwgdHJ1ZSksXG4gIGRlZignd2hvYW1pJywgJ1Jlc29sdmUgdGhlIGF1dGhlbnRpY2F0ZWQgYWN0b3IuJywgei5vYmplY3Qoe30pLCB0cnVlKSxcbl0gYXMgY29uc3Q7XG5cbmV4cG9ydCB0eXBlIENvbW1hbmROYW1lID0gKHR5cGVvZiBDT01NQU5EUylbbnVtYmVyXVsnbmFtZSddO1xuXG5leHBvcnQgY29uc3QgQ09NTUFORF9NQVA6IFJlYWRvbmx5TWFwPHN0cmluZywgQ29tbWFuZERlZj4gPSBuZXcgTWFwKFxuICBDT01NQU5EUy5tYXAoKGMpID0+IFtjLm5hbWUsIGMgYXMgQ29tbWFuZERlZl0pLFxuKTtcblxuLyoqIE1DUCB0b29sIG5hbWUgZm9yIGEgY29tbWFuZCAodW5pZm9ybSBwcmVmaXgsIEQxMSB2b2NhYnVsYXJ5KS4gKi9cbmV4cG9ydCBmdW5jdGlvbiBtY3BUb29sTmFtZShjb21tYW5kOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gYG9haHNfJHtjb21tYW5kfWA7XG59XG5cbi8qKiBKU09OIFNjaGVtYSBmb3IgYSBjb21tYW5kIGlucHV0ICh6b2QgdjQgbmF0aXZlIGVtaXR0ZXIpIFx1MjAxNCB1c2VkIHZlcmJhdGltIGFzIHRoZSBNQ1AgdG9vbCBpbnB1dFNjaGVtYS4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpbnB1dEpzb25TY2hlbWEoY29tbWFuZDogc3RyaW5nKTogUmVjb3JkPHN0cmluZywgdW5rbm93bj4ge1xuICBjb25zdCBkZWZuID0gQ09NTUFORF9NQVAuZ2V0KGNvbW1hbmQpO1xuICBpZiAoIWRlZm4pIHRocm93IG5ldyBFcnJvcihgdW5rbm93biBjb21tYW5kOiAke2NvbW1hbmR9YCk7XG4gIHJldHVybiB6LnRvSlNPTlNjaGVtYShkZWZuLmlucHV0KSBhcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPjtcbn1cblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBXaXJlIGVudmVsb3BlXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuLyoqXG4gKiBFdmVyeSByZWplY3Rpb24gY3Jvc3NlcyB0aGUgd2lyZSBhcyBhIG1hY2hpbmUtcmVhZGFibGUgZW52ZWxvcGUgY2FycnlpbmdcbiAqIHRoZSBjb3JlIGVycm9yIGNsYXNzIG5hbWUgXHUyMDE0IGNsaWVudHMgcmV0aHJvdyB0aGUgcHJvcGVyIGNsYXNzLCBzbyBlcnJvclxuICogc2VtYW50aWNzIHN1cnZpdmUgdGhlIHRyYW5zcG9ydCAoNDA5IGZvciBjb25mbGljdHMsIDQwMyBmb3IgcGVybWlzc2lvbixcbiAqIDQyMiBmb3IgZ3VhcmRzL3RyYW5zaXRpb25zL3ZhbGlkYXRpb24pLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIEVycm9yRW52ZWxvcGUge1xuICBvazogZmFsc2U7XG4gIGVycm9yOiB7XG4gICAgbmFtZTpcbiAgICAgIHwgJ1Blcm1pc3Npb25EZW5pZWRFcnJvcidcbiAgICAgIHwgJ0d1YXJkRmFpbGVkRXJyb3InXG4gICAgICB8ICdDb25mbGljdEVycm9yJ1xuICAgICAgfCAnSW52YWxpZFRyYW5zaXRpb25FcnJvcidcbiAgICAgIHwgJ1N0b3JpZXNWYWxpZGF0aW9uRXJyb3InXG4gICAgICB8ICdFcnJvcic7XG4gICAgbWVzc2FnZTogc3RyaW5nO1xuICB9O1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIE9rRW52ZWxvcGU8VCA9IHVua25vd24+IHtcbiAgb2s6IHRydWU7XG4gIHJlc3VsdDogVDtcbn1cblxuZXhwb3J0IHR5cGUgRW52ZWxvcGU8VCA9IHVua25vd24+ID0gT2tFbnZlbG9wZTxUPiB8IEVycm9yRW52ZWxvcGU7XG5cbmV4cG9ydCBjb25zdCBIVFRQX1NUQVRVUzogUmVjb3JkPEVycm9yRW52ZWxvcGVbJ2Vycm9yJ11bJ25hbWUnXSwgbnVtYmVyPiA9IHtcbiAgUGVybWlzc2lvbkRlbmllZEVycm9yOiA0MDMsXG4gIENvbmZsaWN0RXJyb3I6IDQwOSxcbiAgR3VhcmRGYWlsZWRFcnJvcjogNDIyLFxuICBJbnZhbGlkVHJhbnNpdGlvbkVycm9yOiA0MjIsXG4gIFN0b3JpZXNWYWxpZGF0aW9uRXJyb3I6IDQyMixcbiAgRXJyb3I6IDUwMCxcbn07XG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gQ29tbWFuZCBidXMgY29udHJhY3QgKGltcGxlbWVudGVkIGluIGFwcHMvc3BpbmUtYXBpLCBjb25zdW1lZCBieSBhZGFwdGVycylcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5leHBvcnQgaW50ZXJmYWNlIEFjdG9yQ29udGV4dCB7XG4gIGFjdG9ySWQ6IHN0cmluZztcbiAgaXNBZG1pbjogYm9vbGVhbjtcbn1cblxuLyoqXG4gKiBUaGUgb25lIHBsYWNlIGNvbW1hbmRzIGV4ZWN1dGUuIEhUVFAgYW5kIE1DUCBhcmUgdGhpbiBwYXJzZXJzIGluIGZyb250IG9mXG4gKiB0aGlzOyBub3RoaW5nIGVsc2Ugd3JpdGVzIHN0YXRlIChcdTAwQTcwLjEgXCJubyB3cml0ZXMgb3V0c2lkZSB0aGUgY29tbWFuZCBidXNcIikuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQ29tbWFuZEJ1cyB7XG4gIGV4ZWN1dGUoY29tbWFuZDogc3RyaW5nLCBpbnB1dDogdW5rbm93biwgY3R4OiBBY3RvckNvbnRleHQpOiBQcm9taXNlPHVua25vd24+O1xuICByZWFkb25seSBlbmdpbmU6IFNwaW5lRW5naW5lO1xufVxuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIFR5cGVkIGNsaWVudCAodXNlZCBieSB0aGUgb2FocyBDTEksIHRoZSBydW5uZXIsIGFuZCB0ZXN0cylcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5leHBvcnQgaW50ZXJmYWNlIENsaWVudE9wdGlvbnMge1xuICBiYXNlVXJsOiBzdHJpbmc7XG4gIHRva2VuOiBzdHJpbmc7XG4gIGZldGNoSW1wbD86IHR5cGVvZiBmZXRjaDtcbn1cblxuZXhwb3J0IGNsYXNzIE9haHNSZW1vdGVFcnJvciBleHRlbmRzIEVycm9yIHtcbiAgY29uc3RydWN0b3IoXG4gICAgcHVibGljIHJlYWRvbmx5IGVycm9yTmFtZTogc3RyaW5nLFxuICAgIG1lc3NhZ2U6IHN0cmluZyxcbiAgICBwdWJsaWMgcmVhZG9ubHkgc3RhdHVzOiBudW1iZXIsXG4gICkge1xuICAgIHN1cGVyKG1lc3NhZ2UpO1xuICAgIHRoaXMubmFtZSA9IGVycm9yTmFtZTtcbiAgfVxufVxuXG5leHBvcnQgaW50ZXJmYWNlIE9haHNDbGllbnQge1xuICBjYWxsPFQgPSB1bmtub3duPihjb21tYW5kOiBDb21tYW5kTmFtZSwgaW5wdXQ/OiB1bmtub3duKTogUHJvbWlzZTxUPjtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG1ha2VDbGllbnQob3B0aW9uczogQ2xpZW50T3B0aW9ucyk6IE9haHNDbGllbnQge1xuICBjb25zdCBkb0ZldGNoID0gb3B0aW9ucy5mZXRjaEltcGwgPz8gZmV0Y2g7XG4gIHJldHVybiB7XG4gICAgYXN5bmMgY2FsbDxUPihjb21tYW5kOiBDb21tYW5kTmFtZSwgaW5wdXQ6IHVua25vd24gPSB7fSk6IFByb21pc2U8VD4ge1xuICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBkb0ZldGNoKGAke29wdGlvbnMuYmFzZVVybH0vcnBjLyR7Y29tbWFuZH1gLCB7XG4gICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgJ2NvbnRlbnQtdHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgICAgICAgICBhdXRob3JpemF0aW9uOiBgQmVhcmVyICR7b3B0aW9ucy50b2tlbn1gLFxuICAgICAgICB9LFxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeShpbnB1dCksXG4gICAgICB9KTtcbiAgICAgIGNvbnN0IGVudmVsb3BlID0gKGF3YWl0IHJlc3BvbnNlLmpzb24oKSkgYXMgRW52ZWxvcGU8VD47XG4gICAgICBpZiAoZW52ZWxvcGUub2spIHJldHVybiBlbnZlbG9wZS5yZXN1bHQ7XG4gICAgICB0aHJvdyBuZXcgT2Foc1JlbW90ZUVycm9yKGVudmVsb3BlLmVycm9yLm5hbWUsIGVudmVsb3BlLmVycm9yLm1lc3NhZ2UsIHJlc3BvbnNlLnN0YXR1cyk7XG4gICAgfSxcbiAgfTtcbn1cbiIsICIvKipcbiAqIEdhdGUtaG9sZGVyIGNvbW1hbmQgaW1wbGVtZW50YXRpb25zIFx1MjAxNCBwdXJlIGZ1bmN0aW9ucyBvdmVyIHRoZSB0eXBlZFxuICogY29udHJhY3RzIGNsaWVudDogKGNsaWVudCwgb3B0cykgXHUyMTkyIG91dHB1dCB0ZXh0LiBjbGkudHMgb25seSB3aXJlc1xuICogY29tbWFuZGVyIG9udG8gdGhlc2U7IHRlc3RzIGNhbGwgdGhlbSBkaXJlY3RseSBhZ2FpbnN0IGFuIGluLXByb2Nlc3NcbiAqIHNwaW5lLWFwaS4gRXZlcnkgbXV0YXRpb24gZ29lcyB0aHJvdWdoIC9ycGMvPGNvbW1hbmQ+LCBuZXZlciBhcm91bmQgaXQuXG4gKi9cbmltcG9ydCB7IHJlYWRGaWxlU3luYyB9IGZyb20gJ25vZGU6ZnMnO1xuaW1wb3J0IHsgcmVzb2x2ZSB9IGZyb20gJ25vZGU6cGF0aCc7XG5cbmltcG9ydCB0eXBlIHsgT2Foc0NsaWVudCB9IGZyb20gJ0BvYWhzL2NvbnRyYWN0cyc7XG5pbXBvcnQge1xuICBXT1JLX0lURU1fU1RBVEVTLFxuICB0eXBlIEFjdG9yLFxuICB0eXBlIEZlYXR1cmUsXG4gIHR5cGUgR2F0ZUNvZGUsXG4gIHR5cGUgU3BpbmVFdmVudCxcbiAgdHlwZSBTdG9yaWVzSW1wb3J0UmVzdWx0LFxuICB0eXBlIFdvcmtJdGVtLFxufSBmcm9tICdAb2Focy9jb3JlJztcblxuaW1wb3J0IHsgcmVuZGVyVGFibGUsIHR5cGUgQ2VsbCB9IGZyb20gJy4uL2Zvcm1hdC5qcyc7XG5cbmV4cG9ydCBjb25zdCBHQVRFUyA9IFsnc3BlY19hcHByb3ZhbCcsICdyZXZpZXdfYXBwcm92YWwnXSBhcyBjb25zdDtcblxuZnVuY3Rpb24gYXNzZXJ0R2F0ZShnYXRlOiBzdHJpbmcpOiBhc3NlcnRzIGdhdGUgaXMgR2F0ZUNvZGUge1xuICBpZiAoIShHQVRFUyBhcyByZWFkb25seSBzdHJpbmdbXSkuaW5jbHVkZXMoZ2F0ZSkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYGludmFsaWQgLS1nYXRlIFwiJHtnYXRlfVwiIChleHBlY3RlZCAke0dBVEVTLmpvaW4oJyB8ICcpfSlgKTtcbiAgfVxufVxuXG5jb25zdCBXT1JLX0lURU1fSEVBREVSUyA9IFsnaWQnLCAnZXh0ZXJuYWxLZXknLCAndGl0bGUnLCAnc3RhdGUnLCAnYmxvY2tlZFJlYXNvbiddO1xuXG5mdW5jdGlvbiB3b3JrSXRlbVJvdyhpdGVtOiBXb3JrSXRlbSk6IENlbGxbXSB7XG4gIHJldHVybiBbaXRlbS5pZCwgaXRlbS5leHRlcm5hbEtleSwgaXRlbS50aXRsZSwgaXRlbS5zdGF0ZSwgaXRlbS5ibG9ja2VkUmVhc29uXTtcbn1cblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBpbmJveFxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBpbmJveENvbW1hbmQoY2xpZW50OiBPYWhzQ2xpZW50KTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgY29uc3QgeyBhd2FpdGluZ1NwZWMsIGF3YWl0aW5nUmV2aWV3IH0gPSBhd2FpdCBjbGllbnQuY2FsbDx7XG4gICAgYXdhaXRpbmdTcGVjOiBXb3JrSXRlbVtdO1xuICAgIGF3YWl0aW5nUmV2aWV3OiBXb3JrSXRlbVtdO1xuICB9PignaW5ib3gnKTtcbiAgcmV0dXJuIFtcbiAgICAnYXdhaXRpbmcgc3BlYyBhcHByb3ZhbDonLFxuICAgIHJlbmRlclRhYmxlKFdPUktfSVRFTV9IRUFERVJTLCBhd2FpdGluZ1NwZWMubWFwKHdvcmtJdGVtUm93KSksXG4gICAgJycsXG4gICAgJ2F3YWl0aW5nIHJldmlldyBkZWNpc2lvbjonLFxuICAgIHJlbmRlclRhYmxlKFdPUktfSVRFTV9IRUFERVJTLCBhd2FpdGluZ1Jldmlldy5tYXAod29ya0l0ZW1Sb3cpKSxcbiAgXS5qb2luKCdcXG4nKTtcbn1cblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBhcHByb3ZlIC8gcmVqZWN0XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuZXhwb3J0IGludGVyZmFjZSBBcHByb3ZlT3B0aW9ucyB7XG4gIHdvcmtJdGVtSWQ6IHN0cmluZztcbiAgZ2F0ZTogc3RyaW5nO1xuICAvKiogc3BlY19hcHByb3ZhbCBvbmx5OiB2ZXJpZmljYXRpb24gY29tbWFuZHMgdG8gcGluIChyb2FkbWFwIEQ3KS4gKi9cbiAgcGluPzogc3RyaW5nW107XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBhcHByb3ZlQ29tbWFuZChjbGllbnQ6IE9haHNDbGllbnQsIG9wdHM6IEFwcHJvdmVPcHRpb25zKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgYXNzZXJ0R2F0ZShvcHRzLmdhdGUpO1xuICBjb25zdCBpdGVtID0gYXdhaXQgY2xpZW50LmNhbGw8V29ya0l0ZW0+KCdhcHByb3ZlX2dhdGUnLCB7XG4gICAgd29ya0l0ZW1JZDogb3B0cy53b3JrSXRlbUlkLFxuICAgIGdhdGU6IG9wdHMuZ2F0ZSxcbiAgICAuLi4ob3B0cy5waW4gIT09IHVuZGVmaW5lZCAmJiBvcHRzLnBpbi5sZW5ndGggPiAwID8geyBwaW5uZWRWZXJpZmljYXRpb246IG9wdHMucGluIH0gOiB7fSksXG4gIH0pO1xuICBjb25zdCBsaW5lcyA9IFtcbiAgICBgYXBwcm92ZWQgJHtvcHRzLmdhdGV9IG9uICR7aXRlbS5leHRlcm5hbEtleX0gKCR7aXRlbS5pZH0pYCxcbiAgICBgc3RhdGU6ICR7aXRlbS5zdGF0ZX1gLFxuICBdO1xuICBpZiAoaXRlbS5waW5uZWRWZXJpZmljYXRpb24gIT09IG51bGwgJiYgaXRlbS5waW5uZWRWZXJpZmljYXRpb24ubGVuZ3RoID4gMCkge1xuICAgIGxpbmVzLnB1c2goYHBpbm5lZCB2ZXJpZmljYXRpb246ICR7aXRlbS5waW5uZWRWZXJpZmljYXRpb24uam9pbignICYmICcpfWApO1xuICB9XG4gIHJldHVybiBsaW5lcy5qb2luKCdcXG4nKTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBBZHZhbmNlT3B0aW9ucyB7XG4gIHdvcmtJdGVtSWQ6IHN0cmluZztcbiAgdG86IHN0cmluZztcbiAgZmVuY2luZ1Rva2VuPzogbnVtYmVyO1xufVxuXG4vKipcbiAqIFBsYW5uaW5nLXpvbmUgYWR2YW5jZXMgZm9yIGh1bWFucyAoYmFja2xvZ1x1MjE5MmRyYWZ0IHdoZW4gdGhlIFBPIHN0YXJ0c1xuICogZHJhZnRpbmcsIGRyYWZ0XHUyMTkycmVhZHlfZm9yX2RldiBvbiBub24tY2hlY2twb2ludCBpdGVtcykuIEV4ZWN1dGlvbi16b25lXG4gKiB0cmFuc2l0aW9ucyBiZWxvbmcgdG8gdGhlIHJ1bm5lciwgd2hpY2ggaG9sZHMgdGhlIGNsYWltLlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gYWR2YW5jZUNvbW1hbmQoY2xpZW50OiBPYWhzQ2xpZW50LCBvcHRzOiBBZHZhbmNlT3B0aW9ucyk6IFByb21pc2U8c3RyaW5nPiB7XG4gIGNvbnN0IGl0ZW0gPSBhd2FpdCBjbGllbnQuY2FsbDxXb3JrSXRlbT4oJ2FkdmFuY2Vfc3RhdGUnLCB7XG4gICAgd29ya0l0ZW1JZDogb3B0cy53b3JrSXRlbUlkLFxuICAgIHRvOiBvcHRzLnRvLFxuICAgIC4uLihvcHRzLmZlbmNpbmdUb2tlbiAhPT0gdW5kZWZpbmVkID8geyBmZW5jaW5nVG9rZW46IG9wdHMuZmVuY2luZ1Rva2VuIH0gOiB7fSksXG4gIH0pO1xuICByZXR1cm4gYGFkdmFuY2VkICR7aXRlbS5leHRlcm5hbEtleX0gKCR7aXRlbS5pZH0pXFxuc3RhdGU6ICR7aXRlbS5zdGF0ZX1gO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFJlamVjdE9wdGlvbnMge1xuICB3b3JrSXRlbUlkOiBzdHJpbmc7XG4gIGdhdGU6IHN0cmluZztcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJlamVjdENvbW1hbmQoY2xpZW50OiBPYWhzQ2xpZW50LCBvcHRzOiBSZWplY3RPcHRpb25zKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgYXNzZXJ0R2F0ZShvcHRzLmdhdGUpO1xuICBjb25zdCBpdGVtID0gYXdhaXQgY2xpZW50LmNhbGw8V29ya0l0ZW0+KCdyZWplY3RfZ2F0ZScsIHtcbiAgICB3b3JrSXRlbUlkOiBvcHRzLndvcmtJdGVtSWQsXG4gICAgZ2F0ZTogb3B0cy5nYXRlLFxuICB9KTtcbiAgcmV0dXJuIFtcbiAgICBgcmVqZWN0ZWQgJHtvcHRzLmdhdGV9IG9uICR7aXRlbS5leHRlcm5hbEtleX0gKCR7aXRlbS5pZH0pYCxcbiAgICBgc3RhdGU6ICR7aXRlbS5zdGF0ZX1gLFxuICAgIGBibG9ja2VkUmVhc29uOiAke2l0ZW0uYmxvY2tlZFJlYXNvbiA/PyAnLSd9YCxcbiAgICBgcmV2aWV3TG9vcEl0ZXJhdGlvbjogJHtpdGVtLnJldmlld0xvb3BJdGVyYXRpb259YCxcbiAgXS5qb2luKCdcXG4nKTtcbn1cblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBzdGF0dXNcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gc3RhdHVzQ29tbWFuZChjbGllbnQ6IE9haHNDbGllbnQpOiBQcm9taXNlPHN0cmluZz4ge1xuICBjb25zdCBpdGVtcyA9IGF3YWl0IGNsaWVudC5jYWxsPFdvcmtJdGVtW10+KCdsaXN0X3dvcmtfaXRlbXMnKTtcbiAgY29uc3QgcmFuayA9IG5ldyBNYXA8c3RyaW5nLCBudW1iZXI+KFdPUktfSVRFTV9TVEFURVMubWFwKChzLCBpKSA9PiBbcywgaV0pKTtcbiAgY29uc3Qgc29ydGVkID0gWy4uLml0ZW1zXS5zb3J0KFxuICAgIChhLCBiKSA9PlxuICAgICAgKHJhbmsuZ2V0KGEuc3RhdGUpID8/IDApIC0gKHJhbmsuZ2V0KGIuc3RhdGUpID8/IDApIHx8XG4gICAgICBhLmV4dGVybmFsS2V5LmxvY2FsZUNvbXBhcmUoYi5leHRlcm5hbEtleSksXG4gICk7XG4gIGNvbnN0IGZlYXR1cmVJZHMgPSBbLi4ubmV3IFNldChpdGVtcy5tYXAoKGl0ZW0pID0+IGl0ZW0uZmVhdHVyZUlkKSldO1xuICBjb25zdCBmZWF0dXJlczogRmVhdHVyZVtdID0gW107XG4gIGZvciAoY29uc3QgZmVhdHVyZUlkIG9mIGZlYXR1cmVJZHMpIHtcbiAgICBmZWF0dXJlcy5wdXNoKGF3YWl0IGNsaWVudC5jYWxsPEZlYXR1cmU+KCdnZXRfZmVhdHVyZScsIHsgZmVhdHVyZUlkIH0pKTtcbiAgfVxuICByZXR1cm4gW1xuICAgICd3b3JrIGl0ZW1zOicsXG4gICAgcmVuZGVyVGFibGUoXG4gICAgICBbJ3N0YXRlJywgJ2lkJywgJ2V4dGVybmFsS2V5JywgJ3RpdGxlJywgJ2Jsb2NrZWRSZWFzb24nXSxcbiAgICAgIHNvcnRlZC5tYXAoKGl0ZW0pID0+IFtpdGVtLnN0YXRlLCBpdGVtLmlkLCBpdGVtLmV4dGVybmFsS2V5LCBpdGVtLnRpdGxlLCBpdGVtLmJsb2NrZWRSZWFzb25dKSxcbiAgICApLFxuICAgICcnLFxuICAgICdmZWF0dXJlczonLFxuICAgIHJlbmRlclRhYmxlKFxuICAgICAgWydpZCcsICdzdGF0ZScsICdkaXNwYXRjaEhvbGQnXSxcbiAgICAgIGZlYXR1cmVzLm1hcCgoZmVhdHVyZSkgPT4gW2ZlYXR1cmUuaWQsIGZlYXR1cmUuc3RhdGUsIGZlYXR1cmUuZGlzcGF0Y2hIb2xkXSksXG4gICAgKSxcbiAgXS5qb2luKCdcXG4nKTtcbn1cblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBhY3RvciAvIGdyYW50XG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuZXhwb3J0IGludGVyZmFjZSBBY3RvckNyZWF0ZU9wdGlvbnMge1xuICB0eXBlOiBzdHJpbmc7XG4gIG5hbWU6IHN0cmluZztcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGFjdG9yQ3JlYXRlQ29tbWFuZChcbiAgY2xpZW50OiBPYWhzQ2xpZW50LFxuICBvcHRzOiBBY3RvckNyZWF0ZU9wdGlvbnMsXG4pOiBQcm9taXNlPHN0cmluZz4ge1xuICBpZiAob3B0cy50eXBlICE9PSAndXNlcicgJiYgb3B0cy50eXBlICE9PSAnYWdlbnQnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBpbnZhbGlkIC0tdHlwZSBcIiR7b3B0cy50eXBlfVwiIChleHBlY3RlZCB1c2VyIHwgYWdlbnQpYCk7XG4gIH1cbiAgY29uc3QgY3JlYXRlZCA9IGF3YWl0IGNsaWVudC5jYWxsPHsgYWN0b3I6IEFjdG9yOyB0b2tlbjogc3RyaW5nIH0+KCdjcmVhdGVfYWN0b3InLCB7XG4gICAgdHlwZTogb3B0cy50eXBlLFxuICAgIGRpc3BsYXlOYW1lOiBvcHRzLm5hbWUsXG4gIH0pO1xuICByZXR1cm4gW1xuICAgIGBhY3RvcklkOiAke2NyZWF0ZWQuYWN0b3IuaWR9YCxcbiAgICBgdHlwZTogJHtjcmVhdGVkLmFjdG9yLnR5cGV9YCxcbiAgICBgZGlzcGxheU5hbWU6ICR7Y3JlYXRlZC5hY3Rvci5kaXNwbGF5TmFtZX1gLFxuICAgIGB0b2tlbjogJHtjcmVhdGVkLnRva2VufWAsXG4gIF0uam9pbignXFxuJyk7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgR3JhbnRPcHRpb25zIHtcbiAgYWN0b3JJZDogc3RyaW5nO1xuICBwZXJtaXNzaW9uOiBzdHJpbmc7XG4gIHNjb3BlPzogc3RyaW5nO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZ3JhbnRDb21tYW5kKGNsaWVudDogT2Foc0NsaWVudCwgb3B0czogR3JhbnRPcHRpb25zKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgYXdhaXQgY2xpZW50LmNhbGwoJ2dyYW50X3Blcm1pc3Npb24nLCB7XG4gICAgYWN0b3JJZDogb3B0cy5hY3RvcklkLFxuICAgIHBlcm1pc3Npb246IG9wdHMucGVybWlzc2lvbixcbiAgICAuLi4ob3B0cy5zY29wZSAhPT0gdW5kZWZpbmVkID8geyBzY29wZTogb3B0cy5zY29wZSB9IDoge30pLFxuICB9KTtcbiAgcmV0dXJuIGBncmFudGVkICR7b3B0cy5wZXJtaXNzaW9ufSB0byAke29wdHMuYWN0b3JJZH1gO1xufVxuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIGZlYXR1cmUgLyBpbXBvcnRcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZmVhdHVyZUNyZWF0ZUNvbW1hbmQoY2xpZW50OiBPYWhzQ2xpZW50KTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgY29uc3QgZmVhdHVyZSA9IGF3YWl0IGNsaWVudC5jYWxsPEZlYXR1cmU+KCdjcmVhdGVfZmVhdHVyZScpO1xuICByZXR1cm4gW2BmZWF0dXJlSWQ6ICR7ZmVhdHVyZS5pZH1gLCBgc3RhdGU6ICR7ZmVhdHVyZS5zdGF0ZX1gXS5qb2luKCdcXG4nKTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBJbXBvcnRTdG9yaWVzT3B0aW9ucyB7XG4gIGZlYXR1cmVJZDogc3RyaW5nO1xuICBwYXRoOiBzdHJpbmc7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBpbXBvcnRTdG9yaWVzQ29tbWFuZChcbiAgY2xpZW50OiBPYWhzQ2xpZW50LFxuICBvcHRzOiBJbXBvcnRTdG9yaWVzT3B0aW9ucyxcbik6IFByb21pc2U8c3RyaW5nPiB7XG4gIGNvbnN0IHlhbWwgPSByZWFkRmlsZVN5bmMocmVzb2x2ZShvcHRzLnBhdGgpLCAndXRmOCcpO1xuICBjb25zdCByZXN1bHQgPSBhd2FpdCBjbGllbnQuY2FsbDxTdG9yaWVzSW1wb3J0UmVzdWx0PignaW1wb3J0X3N0b3JpZXMnLCB7XG4gICAgZmVhdHVyZUlkOiBvcHRzLmZlYXR1cmVJZCxcbiAgICB5YW1sLFxuICB9KTtcbiAgY29uc3QgbGlzdCA9ICh2YWx1ZXM6IHN0cmluZ1tdKTogc3RyaW5nID0+ICh2YWx1ZXMubGVuZ3RoID4gMCA/IHZhbHVlcy5qb2luKCcsICcpIDogJyhub25lKScpO1xuICByZXR1cm4gW1xuICAgIGBpbXBvcnRlZDogJHtsaXN0KHJlc3VsdC5pbXBvcnRlZCl9YCxcbiAgICBgdXBkYXRlZDogJHtsaXN0KHJlc3VsdC51cGRhdGVkKX1gLFxuICAgIGB3YXJuaW5nczogJHtsaXN0KHJlc3VsdC53YXJuaW5ncyl9YCxcbiAgXS5qb2luKCdcXG4nKTtcbn1cblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBldmVudHNcbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5leHBvcnQgaW50ZXJmYWNlIEV2ZW50c09wdGlvbnMge1xuICBzdHJlYW1JZD86IHN0cmluZztcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGV2ZW50c0NvbW1hbmQoXG4gIGNsaWVudDogT2Foc0NsaWVudCxcbiAgb3B0czogRXZlbnRzT3B0aW9ucyA9IHt9LFxuKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgY29uc3QgZXZlbnRzID0gYXdhaXQgY2xpZW50LmNhbGw8U3BpbmVFdmVudFtdPihcbiAgICAncXVlcnlfZXZlbnRzJyxcbiAgICBvcHRzLnN0cmVhbUlkICE9PSB1bmRlZmluZWQgPyB7IHN0cmVhbUlkOiBvcHRzLnN0cmVhbUlkIH0gOiB7fSxcbiAgKTtcbiAgcmV0dXJuIHJlbmRlclRhYmxlKFxuICAgIFsnc2VxJywgJ3R5cGUnLCAnc3RyZWFtJywgJ2FjdG9yJ10sXG4gICAgZXZlbnRzLm1hcCgoZXZlbnQpID0+IFtcbiAgICAgIGV2ZW50Lmdsb2JhbFNlcSxcbiAgICAgIGV2ZW50LnR5cGUsXG4gICAgICBgJHtldmVudC5zdHJlYW1UeXBlfS8ke2V2ZW50LnN0cmVhbUlkfSMke2V2ZW50LnN0cmVhbVNlcX1gLFxuICAgICAgZXZlbnQuYWN0b3JJZCxcbiAgICBdKSxcbiAgKTtcbn1cblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBvdXRwdXQgaGFybmVzcyAoc2hhcmVkIGJ5IGNsaS50cyBhbmQgdGhlIHRlc3RzKVxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbmV4cG9ydCBpbnRlcmZhY2UgQ29tbWFuZE91dHB1dCB7XG4gIHRleHQ6IHN0cmluZztcbiAgZXhpdENvZGU6IG51bWJlcjtcbn1cblxuLyoqXG4gKiBSdW4gb25lIGNvbW1hbmQgZnVuY3Rpb24gdG8gYSBwcmludGFibGUgb3V0Y29tZTogc3VjY2VzcyBcdTIxOTIgaXRzIHRleHQgd2l0aFxuICogZXhpdCAwOyBmYWlsdXJlIFx1MjE5MiBgPGVycm9yLm5hbWU+OiA8bWVzc2FnZT5gIChPYWhzUmVtb3RlRXJyb3IgY2FycmllcyB0aGVcbiAqIHdpcmUgZXJyb3IgY2xhc3MgbmFtZSkgd2l0aCBleGl0IDEuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBydW5Ub091dHB1dChmbjogKCkgPT4gUHJvbWlzZTxzdHJpbmc+KTogUHJvbWlzZTxDb21tYW5kT3V0cHV0PiB7XG4gIHRyeSB7XG4gICAgcmV0dXJuIHsgdGV4dDogYXdhaXQgZm4oKSwgZXhpdENvZGU6IDAgfTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBpZiAoZXJyb3IgaW5zdGFuY2VvZiBFcnJvcikge1xuICAgICAgcmV0dXJuIHsgdGV4dDogYCR7ZXJyb3IubmFtZX06ICR7ZXJyb3IubWVzc2FnZX1gLCBleGl0Q29kZTogMSB9O1xuICAgIH1cbiAgICByZXR1cm4geyB0ZXh0OiBTdHJpbmcoZXJyb3IpLCBleGl0Q29kZTogMSB9O1xuICB9XG59XG4iLCAiLyoqXG4gKiBQbGFpbi10ZXh0IHRhYmxlIHJlbmRlcmluZyBcdTIwMTQgZGVsaWJlcmF0ZWx5IGRlcGVuZGVuY3ktZnJlZSAoc3RvcnkgMTM6XG4gKiBcImJcdTFFQTNuZyB0ZXh0IFx1MDExMVx1MDFBMW4gZ2lcdTFFQTNuLCBraFx1MDBGNG5nIGRlcCBiXHUxRUEzbmcgbmdvXHUwMEUwaVwiKS4gTW9ub3NwYWNlIGNvbHVtbnMgcGFkZGVkIHRvXG4gKiB0aGUgd2lkZXN0IGNlbGw7IGFuIGVtcHR5IHJvdyBzZXQgcmVuZGVycyBhcyBcIihlbXB0eSlcIi5cbiAqL1xuXG5leHBvcnQgdHlwZSBDZWxsID0gc3RyaW5nIHwgbnVtYmVyIHwgYm9vbGVhbiB8IG51bGwgfCB1bmRlZmluZWQ7XG5cbmZ1bmN0aW9uIHRvVGV4dChjZWxsOiBDZWxsKTogc3RyaW5nIHtcbiAgaWYgKGNlbGwgPT09IG51bGwgfHwgY2VsbCA9PT0gdW5kZWZpbmVkKSByZXR1cm4gJy0nO1xuICByZXR1cm4gU3RyaW5nKGNlbGwpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVuZGVyVGFibGUoaGVhZGVyczogc3RyaW5nW10sIHJvd3M6IENlbGxbXVtdKTogc3RyaW5nIHtcbiAgaWYgKHJvd3MubGVuZ3RoID09PSAwKSByZXR1cm4gJyhlbXB0eSknO1xuICBjb25zdCB0ZXh0Um93cyA9IHJvd3MubWFwKChyb3cpID0+IHJvdy5tYXAodG9UZXh0KSk7XG4gIGNvbnN0IHdpZHRocyA9IGhlYWRlcnMubWFwKChoZWFkZXIsIGNvbCkgPT5cbiAgICBNYXRoLm1heChoZWFkZXIubGVuZ3RoLCAuLi50ZXh0Um93cy5tYXAoKHJvdykgPT4gKHJvd1tjb2xdID8/ICcnKS5sZW5ndGgpKSxcbiAgKTtcbiAgY29uc3QgbGluZSA9IChjZWxsczogc3RyaW5nW10pOiBzdHJpbmcgPT5cbiAgICBjZWxscy5tYXAoKGNlbGwsIGNvbCkgPT4gY2VsbC5wYWRFbmQod2lkdGhzW2NvbF0gPz8gY2VsbC5sZW5ndGgpKS5qb2luKCcgICcpLnRyaW1FbmQoKTtcbiAgY29uc3Qgc2VwYXJhdG9yID0gd2lkdGhzLm1hcCgodykgPT4gJy0nLnJlcGVhdCh3KSkuam9pbignICAnKTtcbiAgcmV0dXJuIFtsaW5lKGhlYWRlcnMpLCBzZXBhcmF0b3IsIC4uLnRleHRSb3dzLm1hcChsaW5lKV0uam9pbignXFxuJyk7XG59XG4iLCAiLyoqXG4gKiBgb2FocyBzZXJ2ZWAgXHUyMDE0IGJvb3QgdGhlIHNwaW5lLWFwaSBpbi1wcm9jZXNzLlxuICpcbiAqIEVuZ2luZSBzZWxlY3Rpb246XG4gKiAgLSBkZWZhdWx0OiBAb2Focy9jb3JlIGNyZWF0ZU1lbW9yeUVuZ2luZSAoemVybyBwZXJzaXN0ZW5jZSwgaW5zdGFudCk7XG4gKiAgLSAtLWRhdGEgPGRpcj46IERVUkFCTEUgUEdsaXRlIHZpYSBAb2Focy9kYiBjcmVhdGVQZ1N5bmNFbmdpbmUoe2RhdGFEaXJ9KVxuICogICAgcGx1cyBhIHBlcnNpc3RlZCBUb2tlblN0b3JlLCBzbyBhY3RvcnMvdG9rZW5zL3N0YXRlIHN1cnZpdmUgcmVzdGFydHMuXG4gKlxuICogQG9haHMvZGIgaXMgaW1wb3J0ZWQgTEFaSUxZOiBpdHMgc3luY2hyb25vdXMgZmFjYWRlIHNwYXducyBhIHN5bmNraXRcbiAqIHdvcmtlciAoUEdsaXRlIHdhc20pIGF0IG1vZHVsZSBsb2FkLCB3aGljaCBubyBtZW1vcnktZW5naW5lIHNlcnZlIFx1MjAxNCBhbmQgbm9cbiAqIGdhdGUtaG9sZGVyIGNvbW1hbmQgXHUyMDE0IHNob3VsZCBldmVyIHBheSBmb3IuXG4gKlxuICogRW52IGlzIHJlYWQgaW4gY2xpLnRzICh0aGUgZW50cnlwb2ludCksIG5ldmVyIGhlcmU6IHRoaXMgbW9kdWxlIHRha2VzXG4gKiBldmVyeXRoaW5nIGFzIHBhcmFtZXRlcnMsIG1pcnJvcmluZyB0aGUgc3BpbmUtYXBpIGNvbnZlbnRpb24uXG4gKi9cbmltcG9ydCB7IHJhbmRvbUJ5dGVzIH0gZnJvbSAnbm9kZTpjcnlwdG8nO1xuaW1wb3J0IHsgbWtkaXJTeW5jIH0gZnJvbSAnbm9kZTpmcyc7XG5pbXBvcnQgdHlwZSB7IEFkZHJlc3NJbmZvIH0gZnJvbSAnbm9kZTpuZXQnO1xuaW1wb3J0IHsgam9pbiB9IGZyb20gJ25vZGU6cGF0aCc7XG5cbmltcG9ydCB7IGNyZWF0ZU1lbW9yeUVuZ2luZSB9IGZyb20gJ0BvYWhzL2NvcmUnO1xuaW1wb3J0IHsgVG9rZW5TdG9yZSwgYnVpbGRTZXJ2ZXIgfSBmcm9tICdAb2Focy9zcGluZS1hcGknO1xuXG5leHBvcnQgY29uc3QgREVGQVVMVF9QT1JUID0gNDUxNztcblxuZXhwb3J0IGludGVyZmFjZSBTZXJ2ZU9wdGlvbnMge1xuICAvKiogVENQIHBvcnQgKDAgPSBlcGhlbWVyYWwpLiBEZWZhdWx0IDQ1MTcuICovXG4gIHBvcnQ/OiBudW1iZXI7XG4gIC8qKiBCaW5kIGhvc3QuIERlZmF1bHQgMC4wLjAuMC4gKi9cbiAgaG9zdD86IHN0cmluZztcbiAgLyoqIEJvb3RzdHJhcCBhZG1pbiBjcmVkZW50aWFsLiBPbWl0dGVkIFx1MjE5MiBnZW5lcmF0ZWQgKHNlZSBoYW5kbGUuYWRtaW5Ub2tlbkdlbmVyYXRlZCkuICovXG4gIGFkbWluVG9rZW4/OiBzdHJpbmc7XG4gIC8qKiBQZXJzaXN0ZW5jZSByb290OiBQR2xpdGUgZGF0YSB1bmRlciA8ZGF0YURpcj4vcGcsIHRva2VucyBpbiA8ZGF0YURpcj4vdG9rZW5zLmpzb24uICovXG4gIGRhdGFEaXI/OiBzdHJpbmc7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgU2VydmVIYW5kbGUge1xuICB1cmw6IHN0cmluZztcbiAgcG9ydDogbnVtYmVyO1xuICBhZG1pblRva2VuOiBzdHJpbmc7XG4gIC8qKiB0cnVlIHdoZW4gbm8gYWRtaW4gdG9rZW4gd2FzIHByb3ZpZGVkIGFuZCBvbmUgd2FzIGdlbmVyYXRlZC4gKi9cbiAgYWRtaW5Ub2tlbkdlbmVyYXRlZDogYm9vbGVhbjtcbiAgZW5naW5lS2luZDogJ21lbW9yeScgfCAncGdsaXRlJztcbiAgY2xvc2UoKTogUHJvbWlzZTx2b2lkPjtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHN0YXJ0U2VydmUob3B0aW9uczogU2VydmVPcHRpb25zID0ge30pOiBQcm9taXNlPFNlcnZlSGFuZGxlPiB7XG4gIGNvbnN0IGFkbWluVG9rZW5HZW5lcmF0ZWQgPSBvcHRpb25zLmFkbWluVG9rZW4gPT09IHVuZGVmaW5lZDtcbiAgY29uc3QgYWRtaW5Ub2tlbiA9IG9wdGlvbnMuYWRtaW5Ub2tlbiA/PyByYW5kb21CeXRlcygzMikudG9TdHJpbmcoJ2hleCcpO1xuXG4gIGxldCBlbmdpbmVLaW5kOiBTZXJ2ZUhhbmRsZVsnZW5naW5lS2luZCddO1xuICBsZXQgZW5naW5lO1xuICBsZXQgdG9rZW5TdG9yZTogVG9rZW5TdG9yZTtcbiAgaWYgKG9wdGlvbnMuZGF0YURpciAhPT0gdW5kZWZpbmVkKSB7XG4gICAgbWtkaXJTeW5jKG9wdGlvbnMuZGF0YURpciwgeyByZWN1cnNpdmU6IHRydWUgfSk7XG4gICAgY29uc3QgeyBjcmVhdGVQZ1N5bmNFbmdpbmUgfSA9IGF3YWl0IGltcG9ydCgnQG9haHMvZGInKTtcbiAgICBlbmdpbmUgPSBjcmVhdGVQZ1N5bmNFbmdpbmUoeyBkYXRhRGlyOiBqb2luKG9wdGlvbnMuZGF0YURpciwgJ3BnJykgfSk7XG4gICAgdG9rZW5TdG9yZSA9IG5ldyBUb2tlblN0b3JlKHsgcGVyc2lzdFBhdGg6IGpvaW4ob3B0aW9ucy5kYXRhRGlyLCAndG9rZW5zLmpzb24nKSB9KTtcbiAgICBlbmdpbmVLaW5kID0gJ3BnbGl0ZSc7XG4gIH0gZWxzZSB7XG4gICAgZW5naW5lID0gY3JlYXRlTWVtb3J5RW5naW5lKCk7XG4gICAgdG9rZW5TdG9yZSA9IG5ldyBUb2tlblN0b3JlKCk7XG4gICAgZW5naW5lS2luZCA9ICdtZW1vcnknO1xuICB9XG5cbiAgY29uc3QgYXBwID0gYXdhaXQgYnVpbGRTZXJ2ZXIoeyBlbmdpbmUsIHRva2VuU3RvcmUsIGFkbWluVG9rZW4gfSk7XG4gIGF3YWl0IGFwcC5saXN0ZW4oeyBwb3J0OiBvcHRpb25zLnBvcnQgPz8gREVGQVVMVF9QT1JULCBob3N0OiBvcHRpb25zLmhvc3QgPz8gJzAuMC4wLjAnIH0pO1xuICBjb25zdCB7IHBvcnQgfSA9IGFwcC5zZXJ2ZXIuYWRkcmVzcygpIGFzIEFkZHJlc3NJbmZvO1xuXG4gIHJldHVybiB7XG4gICAgdXJsOiBgaHR0cDovLzEyNy4wLjAuMToke3BvcnR9YCxcbiAgICBwb3J0LFxuICAgIGFkbWluVG9rZW4sXG4gICAgYWRtaW5Ub2tlbkdlbmVyYXRlZCxcbiAgICBlbmdpbmVLaW5kLFxuICAgIGNsb3NlOiBhc3luYyAoKSA9PiB7XG4gICAgICBhd2FpdCBhcHAuY2xvc2UoKTtcbiAgICB9LFxuICB9O1xufVxuIiwgIi8qKlxuICogQG9haHMvc3BpbmUtYXBpIFx1MjAxNCBIVFRQICsgTUNQIHN1cmZhY2VzIG92ZXIgdGhlIG9uZSBjb21tYW5kIGJ1cy5cbiAqXG4gKiBFbnYgaXMgcmVhZCBPTkxZIGhlcmUgKHN0YXJ0KCksIGZvciB0aGUgQ0xJIGVudHJ5cG9pbnQpOyB0aGUgbGlicmFyeVxuICogbW9kdWxlcyB0YWtlIGV2ZXJ5dGhpbmcgYXMgcGFyYW1ldGVycy5cbiAqL1xuaW1wb3J0IHsgY3JlYXRlTWVtb3J5RW5naW5lIH0gZnJvbSAnQG9haHMvY29yZSc7XG5cbmltcG9ydCB7IFRva2VuU3RvcmUgfSBmcm9tICcuL2F1dGguanMnO1xuaW1wb3J0IHsgYnVpbGRTZXJ2ZXIgfSBmcm9tICcuL3NlcnZlci5qcyc7XG5cbmV4cG9ydCB7IFRva2VuU3RvcmUsIHR5cGUgUmVzb2x2ZWRUb2tlbiB9IGZyb20gJy4vYXV0aC5qcyc7XG5leHBvcnQgeyBjcmVhdGVDb21tYW5kQnVzIH0gZnJvbSAnLi9idXMuanMnO1xuZXhwb3J0IHsgYnVpbGRTZXJ2ZXIsIGVycm9yRW52ZWxvcGUsIGVycm9yTmFtZSwgdHlwZSBCdWlsZFNlcnZlck9wdGlvbnMgfSBmcm9tICcuL3NlcnZlci5qcyc7XG5leHBvcnQgeyBidWlsZE1jcFNlcnZlciwgcmVnaXN0ZXJNY3BSb3V0ZSB9IGZyb20gJy4vbWNwLmpzJztcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHN0YXJ0KCk6IFByb21pc2U8dm9pZD4ge1xuICBjb25zdCBwb3J0ID0gTnVtYmVyKHByb2Nlc3MuZW52WydQT1JUJ10gPz8gJzMwMDAnKTtcbiAgY29uc3QgYWRtaW5Ub2tlbiA9IHByb2Nlc3MuZW52WydPQUhTX0FETUlOX1RPS0VOJ107XG4gIGlmIChhZG1pblRva2VuID09PSB1bmRlZmluZWQgfHwgYWRtaW5Ub2tlbi5sZW5ndGggPT09IDApIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ09BSFNfQURNSU5fVE9LRU4gbXVzdCBiZSBzZXQgKGJvb3RzdHJhcCBhZG1pbiBjcmVkZW50aWFsKScpO1xuICB9XG4gIGNvbnN0IHBlcnNpc3RQYXRoID0gcHJvY2Vzcy5lbnZbJ09BSFNfVE9LRU5fU1RPUkVfUEFUSCddO1xuICBjb25zdCB0b2tlblN0b3JlID0gbmV3IFRva2VuU3RvcmUocGVyc2lzdFBhdGggIT09IHVuZGVmaW5lZCA/IHsgcGVyc2lzdFBhdGggfSA6IHt9KTtcbiAgY29uc3QgZW5naW5lID0gY3JlYXRlTWVtb3J5RW5naW5lKCk7XG4gIGNvbnN0IGFwcCA9IGF3YWl0IGJ1aWxkU2VydmVyKHsgZW5naW5lLCB0b2tlblN0b3JlLCBhZG1pblRva2VuIH0pO1xuICBhd2FpdCBhcHAubGlzdGVuKHsgcG9ydCwgaG9zdDogJzAuMC4wLjAnIH0pO1xuICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICBjb25zb2xlLmxvZyhgb2FocyBzcGluZS1hcGkgbGlzdGVuaW5nIG9uIDoke3BvcnR9IChIVFRQIC9ycGMvKiwgTUNQIC9tY3ApYCk7XG59XG4iLCAiLyoqXG4gKiBUb2tlblN0b3JlIFx1MjAxNCBiZWFyZXItdG9rZW4gYXV0aGVudGljYXRpb24gZm9yIGJvdGggc3VyZmFjZXMgKEhUVFAgKyBNQ1ApLlxuICpcbiAqIFRva2VucyBhcmUgb3BhcXVlIDMyLWJ5dGUgcmFuZG9tIGhleCBzdHJpbmdzOyBvbmx5IHRoZWlyIHNoYTI1NiBoYXNoIGlzXG4gKiBzdG9yZWQgKGFuZCBvcHRpb25hbGx5IHBlcnNpc3RlZCksIHNvIGEgbGVha2VkIHN0b3JlIGZpbGUgbmV2ZXIgbGVha3MgYVxuICogdXNhYmxlIGNyZWRlbnRpYWwuIFRoZSBib290c3RyYXAgYWRtaW4gdG9rZW4gYXJyaXZlcyBhcyBhIFBBUkFNRVRFUiBcdTIwMTQgdGhpc1xuICogbW9kdWxlIG5ldmVyIHJlYWRzIHRoZSBlbnZpcm9ubWVudCAoZW52IGhhbmRsaW5nIGxpdmVzIGluIGluZGV4LnRzIHN0YXJ0KCkpLlxuICovXG5pbXBvcnQgeyBjcmVhdGVIYXNoLCByYW5kb21CeXRlcyB9IGZyb20gJ25vZGU6Y3J5cHRvJztcbmltcG9ydCB7IGV4aXN0c1N5bmMsIG1rZGlyU3luYywgcmVhZEZpbGVTeW5jLCB3cml0ZUZpbGVTeW5jIH0gZnJvbSAnbm9kZTpmcyc7XG5pbXBvcnQgeyBkaXJuYW1lIH0gZnJvbSAnbm9kZTpwYXRoJztcblxuZXhwb3J0IGludGVyZmFjZSBSZXNvbHZlZFRva2VuIHtcbiAgYWN0b3JJZDogc3RyaW5nO1xuICBpc0FkbWluOiBib29sZWFuO1xufVxuXG5pbnRlcmZhY2UgUGVyc2lzdFNoYXBlIHtcbiAgdmVyc2lvbjogMTtcbiAgdG9rZW5zOiBSZWNvcmQ8c3RyaW5nLCBSZXNvbHZlZFRva2VuPjsgLy8gc2hhMjU2KHRva2VuKSBoZXggLT4gcmVjb3JkXG59XG5cbmZ1bmN0aW9uIGhhc2hUb2tlbih0b2tlbjogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIGNyZWF0ZUhhc2goJ3NoYTI1NicpLnVwZGF0ZSh0b2tlbiwgJ3V0ZjgnKS5kaWdlc3QoJ2hleCcpO1xufVxuXG5leHBvcnQgY2xhc3MgVG9rZW5TdG9yZSB7XG4gIHByaXZhdGUgcmVhZG9ubHkgYnlIYXNoID0gbmV3IE1hcDxzdHJpbmcsIFJlc29sdmVkVG9rZW4+KCk7XG4gIHByaXZhdGUgcmVhZG9ubHkgcGVyc2lzdFBhdGg6IHN0cmluZyB8IHVuZGVmaW5lZDtcblxuICBjb25zdHJ1Y3RvcihvcHRpb25zPzogeyBwZXJzaXN0UGF0aD86IHN0cmluZyB9KSB7XG4gICAgdGhpcy5wZXJzaXN0UGF0aCA9IG9wdGlvbnM/LnBlcnNpc3RQYXRoO1xuICAgIGlmICh0aGlzLnBlcnNpc3RQYXRoICE9PSB1bmRlZmluZWQgJiYgZXhpc3RzU3luYyh0aGlzLnBlcnNpc3RQYXRoKSkge1xuICAgICAgY29uc3QgcmF3ID0gSlNPTi5wYXJzZShyZWFkRmlsZVN5bmModGhpcy5wZXJzaXN0UGF0aCwgJ3V0ZjgnKSkgYXMgUGVyc2lzdFNoYXBlO1xuICAgICAgZm9yIChjb25zdCBbaGFzaCwgcmVjb3JkXSBvZiBPYmplY3QuZW50cmllcyhyYXcudG9rZW5zKSkge1xuICAgICAgICB0aGlzLmJ5SGFzaC5zZXQoaGFzaCwgeyBhY3RvcklkOiByZWNvcmQuYWN0b3JJZCwgaXNBZG1pbjogcmVjb3JkLmlzQWRtaW4gfSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFJlZ2lzdGVyIHRoZSBib290c3RyYXAgYWRtaW4gdG9rZW4gKHN1cnZpdmVzIHJlc3RhcnRzIGJ5IHJlLWJvb3RzdHJhcCxcbiAgICogbm90IHBlcnNpc3RlbmNlIFx1MjAxNCB0aGUgYWRtaW4gY3JlZGVudGlhbCBpcyBjb25maWd1cmF0aW9uLCBub3Qgc3RhdGUpLlxuICAgKi9cbiAgYm9vdHN0cmFwQWRtaW4odG9rZW46IHN0cmluZywgYWN0b3JJZCA9ICdhZG1pbicpOiB2b2lkIHtcbiAgICB0aGlzLmJ5SGFzaC5zZXQoaGFzaFRva2VuKHRva2VuKSwgeyBhY3RvcklkLCBpc0FkbWluOiB0cnVlIH0pO1xuICB9XG5cbiAgLyoqIElzc3VlIGEgZnJlc2ggdG9rZW4gZm9yIGFuIGFjdG9yLiBUaGUgcGxhaW50ZXh0IGlzIHJldHVybmVkIGV4YWN0bHkgb25jZS4gKi9cbiAgaXNzdWUoYWN0b3JJZDogc3RyaW5nKTogc3RyaW5nIHtcbiAgICBjb25zdCB0b2tlbiA9IHJhbmRvbUJ5dGVzKDMyKS50b1N0cmluZygnaGV4Jyk7XG4gICAgdGhpcy5ieUhhc2guc2V0KGhhc2hUb2tlbih0b2tlbiksIHsgYWN0b3JJZCwgaXNBZG1pbjogZmFsc2UgfSk7XG4gICAgdGhpcy5zYXZlKCk7XG4gICAgcmV0dXJuIHRva2VuO1xuICB9XG5cbiAgcmVzb2x2ZSh0b2tlbjogc3RyaW5nKTogUmVzb2x2ZWRUb2tlbiB8IG51bGwge1xuICAgIGNvbnN0IHJlY29yZCA9IHRoaXMuYnlIYXNoLmdldChoYXNoVG9rZW4odG9rZW4pKTtcbiAgICByZXR1cm4gcmVjb3JkID8geyAuLi5yZWNvcmQgfSA6IG51bGw7XG4gIH1cblxuICBwcml2YXRlIHNhdmUoKTogdm9pZCB7XG4gICAgaWYgKHRoaXMucGVyc2lzdFBhdGggPT09IHVuZGVmaW5lZCkgcmV0dXJuO1xuICAgIGNvbnN0IHNoYXBlOiBQZXJzaXN0U2hhcGUgPSB7IHZlcnNpb246IDEsIHRva2Vuczoge30gfTtcbiAgICBmb3IgKGNvbnN0IFtoYXNoLCByZWNvcmRdIG9mIHRoaXMuYnlIYXNoKSB7XG4gICAgICAvLyBBZG1pbiBib290c3RyYXAgZW50cmllcyBhcmUgY29uZmlndXJhdGlvbjsgcGVyc2lzdCBvbmx5IGlzc3VlZCB0b2tlbnMuXG4gICAgICBpZiAocmVjb3JkLmlzQWRtaW4pIGNvbnRpbnVlO1xuICAgICAgc2hhcGUudG9rZW5zW2hhc2hdID0geyAuLi5yZWNvcmQgfTtcbiAgICB9XG4gICAgbWtkaXJTeW5jKGRpcm5hbWUodGhpcy5wZXJzaXN0UGF0aCksIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xuICAgIHdyaXRlRmlsZVN5bmModGhpcy5wZXJzaXN0UGF0aCwgSlNPTi5zdHJpbmdpZnkoc2hhcGUsIG51bGwsIDIpLCAndXRmOCcpO1xuICB9XG59XG4iLCAiLyoqXG4gKiBGYXN0aWZ5IEhUVFAgYWRhcHRlcjogUE9TVCAvcnBjLzxjb21tYW5kPiBcdTIwMTQgYSB0aGluIHBhcnNlciBpbiBmcm9udCBvZiB0aGVcbiAqIGNvbW1hbmQgYnVzLiBFdmVyeSByZWplY3Rpb24gY3Jvc3NlcyB0aGUgd2lyZSBhcyB0aGUgY29udHJhY3RzIGVudmVsb3BlLFxuICogc3RhdHVzLW1hcHBlZCBieSBIVFRQX1NUQVRVUyBzbyBlcnJvciBzZW1hbnRpY3Mgc3Vydml2ZSB0aGUgdHJhbnNwb3J0LlxuICovXG5pbXBvcnQgRmFzdGlmeSwgeyB0eXBlIEZhc3RpZnlJbnN0YW5jZSwgdHlwZSBGYXN0aWZ5UmVxdWVzdCB9IGZyb20gJ2Zhc3RpZnknO1xuaW1wb3J0IHtcbiAgQ29uZmxpY3RFcnJvcixcbiAgR3VhcmRGYWlsZWRFcnJvcixcbiAgSW52YWxpZFRyYW5zaXRpb25FcnJvcixcbiAgUGVybWlzc2lvbkRlbmllZEVycm9yLFxuICBTdG9yaWVzVmFsaWRhdGlvbkVycm9yLFxuICB0eXBlIFNwaW5lRW5naW5lLFxufSBmcm9tICdAb2Focy9jb3JlJztcbmltcG9ydCB7XG4gIENPTU1BTkRfTUFQLFxuICBIVFRQX1NUQVRVUyxcbiAgdHlwZSBBY3RvckNvbnRleHQsXG4gIHR5cGUgRXJyb3JFbnZlbG9wZSxcbn0gZnJvbSAnQG9haHMvY29udHJhY3RzJztcblxuaW1wb3J0IHR5cGUgeyBUb2tlblN0b3JlIH0gZnJvbSAnLi9hdXRoLmpzJztcbmltcG9ydCB7IGNyZWF0ZUNvbW1hbmRCdXMgfSBmcm9tICcuL2J1cy5qcyc7XG5pbXBvcnQgeyByZWdpc3Rlck1jcFJvdXRlIH0gZnJvbSAnLi9tY3AuanMnO1xuXG5leHBvcnQgaW50ZXJmYWNlIEJ1aWxkU2VydmVyT3B0aW9ucyB7XG4gIGVuZ2luZTogU3BpbmVFbmdpbmU7XG4gIHRva2VuU3RvcmU6IFRva2VuU3RvcmU7XG4gIC8qKiBCb290c3RyYXAgYWRtaW4gY3JlZGVudGlhbCBcdTIwMTQgcGFzc2VkIGluLCBuZXZlciByZWFkIGZyb20gZW52IGhlcmUuICovXG4gIGFkbWluVG9rZW46IHN0cmluZztcbn1cblxuLyoqIE1hcCBhIHRocm93biBjb3JlIGVycm9yIG9udG8gdGhlIHdpcmUgZXJyb3IgdGF4b25vbXkuICovXG5leHBvcnQgZnVuY3Rpb24gZXJyb3JOYW1lKGVycm9yOiB1bmtub3duKTogRXJyb3JFbnZlbG9wZVsnZXJyb3InXVsnbmFtZSddIHtcbiAgaWYgKGVycm9yIGluc3RhbmNlb2YgUGVybWlzc2lvbkRlbmllZEVycm9yKSByZXR1cm4gJ1Blcm1pc3Npb25EZW5pZWRFcnJvcic7XG4gIGlmIChlcnJvciBpbnN0YW5jZW9mIENvbmZsaWN0RXJyb3IpIHJldHVybiAnQ29uZmxpY3RFcnJvcic7XG4gIGlmIChlcnJvciBpbnN0YW5jZW9mIEd1YXJkRmFpbGVkRXJyb3IpIHJldHVybiAnR3VhcmRGYWlsZWRFcnJvcic7XG4gIGlmIChlcnJvciBpbnN0YW5jZW9mIEludmFsaWRUcmFuc2l0aW9uRXJyb3IpIHJldHVybiAnSW52YWxpZFRyYW5zaXRpb25FcnJvcic7XG4gIGlmIChlcnJvciBpbnN0YW5jZW9mIFN0b3JpZXNWYWxpZGF0aW9uRXJyb3IpIHJldHVybiAnU3Rvcmllc1ZhbGlkYXRpb25FcnJvcic7XG4gIHJldHVybiAnRXJyb3InO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZXJyb3JFbnZlbG9wZShlcnJvcjogdW5rbm93bik6IEVycm9yRW52ZWxvcGUge1xuICByZXR1cm4ge1xuICAgIG9rOiBmYWxzZSxcbiAgICBlcnJvcjoge1xuICAgICAgbmFtZTogZXJyb3JOYW1lKGVycm9yKSxcbiAgICAgIG1lc3NhZ2U6IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKSxcbiAgICB9LFxuICB9O1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gYnVpbGRTZXJ2ZXIob3B0aW9uczogQnVpbGRTZXJ2ZXJPcHRpb25zKTogUHJvbWlzZTxGYXN0aWZ5SW5zdGFuY2U+IHtcbiAgY29uc3QgeyBlbmdpbmUsIHRva2VuU3RvcmUsIGFkbWluVG9rZW4gfSA9IG9wdGlvbnM7XG4gIHRva2VuU3RvcmUuYm9vdHN0cmFwQWRtaW4oYWRtaW5Ub2tlbik7XG4gIGNvbnN0IGJ1cyA9IGNyZWF0ZUNvbW1hbmRCdXMoZW5naW5lLCB0b2tlblN0b3JlKTtcblxuICBjb25zdCBhcHAgPSBGYXN0aWZ5KHsgbG9nZ2VyOiBmYWxzZSB9KTtcblxuICBjb25zdCBhdXRoZW50aWNhdGUgPSAocmVxdWVzdDogRmFzdGlmeVJlcXVlc3QpOiBBY3RvckNvbnRleHQgfCBudWxsID0+IHtcbiAgICBjb25zdCBoZWFkZXIgPSByZXF1ZXN0LmhlYWRlcnMuYXV0aG9yaXphdGlvbjtcbiAgICBpZiAodHlwZW9mIGhlYWRlciAhPT0gJ3N0cmluZycgfHwgIWhlYWRlci5zdGFydHNXaXRoKCdCZWFyZXIgJykpIHJldHVybiBudWxsO1xuICAgIGNvbnN0IHJlc29sdmVkID0gdG9rZW5TdG9yZS5yZXNvbHZlKGhlYWRlci5zbGljZSgnQmVhcmVyICcubGVuZ3RoKS50cmltKCkpO1xuICAgIHJldHVybiByZXNvbHZlZCA9PT0gbnVsbCA/IG51bGwgOiB7IGFjdG9ySWQ6IHJlc29sdmVkLmFjdG9ySWQsIGlzQWRtaW46IHJlc29sdmVkLmlzQWRtaW4gfTtcbiAgfTtcblxuICBhcHAuZ2V0KCcvaGVhbHRoeicsIGFzeW5jICgpID0+ICh7IG9rOiB0cnVlIH0pKTtcblxuICBhcHAucG9zdCgnL3JwYy86Y29tbWFuZCcsIGFzeW5jIChyZXF1ZXN0LCByZXBseSkgPT4ge1xuICAgIGNvbnN0IGN0eCA9IGF1dGhlbnRpY2F0ZShyZXF1ZXN0KTtcbiAgICBpZiAoY3R4ID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gcmVwbHkuY29kZSg0MDEpLnNlbmQoe1xuICAgICAgICBvazogZmFsc2UsXG4gICAgICAgIGVycm9yOiB7IG5hbWU6ICdFcnJvcicsIG1lc3NhZ2U6ICd1bmF1dGhvcml6ZWQ6IG1pc3Npbmcgb3IgaW52YWxpZCBiZWFyZXIgdG9rZW4nIH0sXG4gICAgICB9IHNhdGlzZmllcyBFcnJvckVudmVsb3BlKTtcbiAgICB9XG4gICAgY29uc3QgeyBjb21tYW5kIH0gPSByZXF1ZXN0LnBhcmFtcyBhcyB7IGNvbW1hbmQ6IHN0cmluZyB9O1xuICAgIGlmICghQ09NTUFORF9NQVAuaGFzKGNvbW1hbmQpKSB7XG4gICAgICByZXR1cm4gcmVwbHkuY29kZSg0MDQpLnNlbmQoe1xuICAgICAgICBvazogZmFsc2UsXG4gICAgICAgIGVycm9yOiB7IG5hbWU6ICdFcnJvcicsIG1lc3NhZ2U6IGB1bmtub3duIGNvbW1hbmQ6ICR7Y29tbWFuZH1gIH0sXG4gICAgICB9IHNhdGlzZmllcyBFcnJvckVudmVsb3BlKTtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGJ1cy5leGVjdXRlKGNvbW1hbmQsIHJlcXVlc3QuYm9keSA/PyB7fSwgY3R4KTtcbiAgICAgIHJldHVybiByZXBseS5jb2RlKDIwMCkuc2VuZCh7IG9rOiB0cnVlLCByZXN1bHQgfSk7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGNvbnN0IGVudmVsb3BlID0gZXJyb3JFbnZlbG9wZShlcnJvcik7XG4gICAgICByZXR1cm4gcmVwbHkuY29kZShIVFRQX1NUQVRVU1tlbnZlbG9wZS5lcnJvci5uYW1lXSkuc2VuZChlbnZlbG9wZSk7XG4gICAgfVxuICB9KTtcblxuICByZWdpc3Rlck1jcFJvdXRlKGFwcCwgYnVzLCBhdXRoZW50aWNhdGUpO1xuXG4gIHJldHVybiBhcHA7XG59XG4iLCAiLyoqXG4gKiBUaGUgY29tbWFuZCBidXMgXHUyMDE0IHRoZSBPTkUgcGxhY2UgY29tbWFuZHMgZXhlY3V0ZSAocm9hZG1hcCBcdTAwQTcwLjE6IG5vIHdyaXRlc1xuICogb3V0c2lkZSB0aGUgY29tbWFuZCBidXMpLiBIVFRQICgvcnBjLzpjb21tYW5kKSBhbmQgTUNQIChvYWhzXyogdG9vbHMpIGFyZVxuICogdGhpbiBwYXJzZXJzIGluIGZyb250IG9mIGV4ZWN1dGUoKTsgbmVpdGhlciBjYXJyaWVzIGl0cyBvd24gbG9naWMuXG4gKlxuICogQWN0b3IgaWRlbnRpdHkgQUxXQVlTIGNvbWVzIGZyb20gdGhlIGF1dGhlbnRpY2F0ZWQgY29udGV4dCwgbmV2ZXIgZnJvbSB0aGVcbiAqIHJlcXVlc3QgYm9keSBcdTIwMTQgYSBsaWZlY3ljbGUgY29tbWFuZCBjYW4gb25seSBhY3QgYXMgdGhlIGFjdG9yIHdob3NlIHRva2VuXG4gKiBzaWduZWQgdGhlIHJlcXVlc3QuXG4gKi9cbmltcG9ydCB7XG4gIEd1YXJkRmFpbGVkRXJyb3IsXG4gIFBlcm1pc3Npb25EZW5pZWRFcnJvcixcbiAgdHlwZSBCbG9ja2VkUmVhc29uLFxuICB0eXBlIEV2aWRlbmNlLFxuICB0eXBlIEdhdGVDb2RlLFxuICB0eXBlIFBlcm1pc3Npb24sXG4gIHR5cGUgU3BpbmVFbmdpbmUsXG4gIHR5cGUgV29ya0l0ZW1TdGF0ZSxcbn0gZnJvbSAnQG9haHMvY29yZSc7XG5pbXBvcnQgeyBDT01NQU5EX01BUCwgdHlwZSBBY3RvckNvbnRleHQsIHR5cGUgQ29tbWFuZEJ1cywgdHlwZSBDb21tYW5kTmFtZSB9IGZyb20gJ0BvYWhzL2NvbnRyYWN0cyc7XG5cbmltcG9ydCB0eXBlIHsgVG9rZW5TdG9yZSB9IGZyb20gJy4vYXV0aC5qcyc7XG5cbi8vIFBhcnNlZC1pbnB1dCBzaGFwZXMgKG1pcnJvciB0aGUgem9kIHNjaGVtYXMgaW4gQG9haHMvY29udHJhY3RzOyB0aGUgem9kXG4vLyBwYXJzZSBpbiBleGVjdXRlKCkgaXMgdGhlIHJ1bnRpbWUgZ3VhcmFudGVlLCB0aGVzZSBhcmUgdGhlIHN0YXRpYyB2aWV3KS5cbmludGVyZmFjZSBDcmVhdGVBY3RvckluIHsgdHlwZTogJ3VzZXInIHwgJ2FnZW50JzsgZGlzcGxheU5hbWU6IHN0cmluZyB9XG5pbnRlcmZhY2UgR3JhbnRJbiB7IGFjdG9ySWQ6IHN0cmluZzsgcGVybWlzc2lvbjogc3RyaW5nOyBzY29wZT86IHN0cmluZyB8IHVuZGVmaW5lZCB9XG5pbnRlcmZhY2UgSW1wb3J0U3Rvcmllc0luIHsgZmVhdHVyZUlkOiBzdHJpbmc7IHlhbWw6IHN0cmluZyB9XG5pbnRlcmZhY2UgQ2xhaW1UYXNrSW4geyB3b3JrSXRlbUlkOiBzdHJpbmc7IHR0bE1zPzogbnVtYmVyIHwgdW5kZWZpbmVkIH1cbmludGVyZmFjZSBIZWFydGJlYXRJbiB7IGNsYWltSWQ6IHN0cmluZyB9XG5pbnRlcmZhY2UgUmVsZWFzZUNsYWltSW4geyBjbGFpbUlkOiBzdHJpbmc7IHJlYXNvbj86IHN0cmluZyB8IHVuZGVmaW5lZCB9XG5pbnRlcmZhY2UgQWR2YW5jZUluIHsgd29ya0l0ZW1JZDogc3RyaW5nOyB0bzogV29ya0l0ZW1TdGF0ZTsgZmVuY2luZ1Rva2VuPzogbnVtYmVyIHwgdW5kZWZpbmVkOyBpZGVtcG90ZW5jeUtleT86IHN0cmluZyB8IHVuZGVmaW5lZCB9XG5pbnRlcmZhY2UgQmxvY2tJbiB7IHdvcmtJdGVtSWQ6IHN0cmluZzsgcmVhc29uOiBCbG9ja2VkUmVhc29uOyBmZW5jaW5nVG9rZW4/OiBudW1iZXIgfCB1bmRlZmluZWQgfVxuaW50ZXJmYWNlIFdvcmtJdGVtSW4geyB3b3JrSXRlbUlkOiBzdHJpbmcgfVxuaW50ZXJmYWNlIFN1Ym1pdEV2aWRlbmNlSW4geyB3b3JrSXRlbUlkOiBzdHJpbmc7IGV2aWRlbmNlOiBFdmlkZW5jZTsgZmVuY2luZ1Rva2VuPzogbnVtYmVyIHwgdW5kZWZpbmVkIH1cbmludGVyZmFjZSBBcHByb3ZlR2F0ZUluIHsgd29ya0l0ZW1JZDogc3RyaW5nOyBnYXRlOiBHYXRlQ29kZTsgcGlubmVkVmVyaWZpY2F0aW9uPzogc3RyaW5nW10gfCB1bmRlZmluZWQgfVxuaW50ZXJmYWNlIFJlamVjdEdhdGVJbiB7IHdvcmtJdGVtSWQ6IHN0cmluZzsgZ2F0ZTogR2F0ZUNvZGUgfVxuaW50ZXJmYWNlIEZlYXR1cmVJbiB7IGZlYXR1cmVJZDogc3RyaW5nIH1cbmludGVyZmFjZSBMaXN0V29ya0l0ZW1zSW4geyBzdGF0ZT86IFdvcmtJdGVtU3RhdGUgfCB1bmRlZmluZWQ7IGZlYXR1cmVJZD86IHN0cmluZyB8IHVuZGVmaW5lZDsgY2xhaW1hYmxlPzogYm9vbGVhbiB8IHVuZGVmaW5lZCB9XG5pbnRlcmZhY2UgUXVlcnlFdmVudHNJbiB7IHN0cmVhbUlkPzogc3RyaW5nIHwgdW5kZWZpbmVkIH1cblxuLyoqIENvbXBhY3Qgb25lLWxpbmUgc3VtbWFyeSBvZiB6b2QgaXNzdWVzIChkdWNrLXR5cGVkOiB6b2QgY29waWVzIG1heSBkaWZmZXIpLiAqL1xuZnVuY3Rpb24gem9kTWVzc2FnZShlcnJvcjogdW5rbm93bik6IHN0cmluZyB7XG4gIGNvbnN0IGlzc3VlcyA9IChlcnJvciBhcyB7IGlzc3Vlcz86IEFycmF5PHsgcGF0aD86IEFycmF5PHN0cmluZyB8IG51bWJlcj47IG1lc3NhZ2U/OiBzdHJpbmcgfT4gfSlcbiAgICAuaXNzdWVzO1xuICBpZiAoIUFycmF5LmlzQXJyYXkoaXNzdWVzKSkgcmV0dXJuIFN0cmluZyhlcnJvcik7XG4gIHJldHVybiBpc3N1ZXNcbiAgICAubWFwKChpc3N1ZSkgPT4ge1xuICAgICAgY29uc3QgcGF0aCA9IGlzc3VlLnBhdGggJiYgaXNzdWUucGF0aC5sZW5ndGggPiAwID8gaXNzdWUucGF0aC5qb2luKCcuJykgOiAnKHJvb3QpJztcbiAgICAgIHJldHVybiBgJHtwYXRofTogJHtpc3N1ZS5tZXNzYWdlID8/ICdpbnZhbGlkJ31gO1xuICAgIH0pXG4gICAgLmpvaW4oJzsgJyk7XG59XG5cbmZ1bmN0aW9uIHJlcXVpcmVBZG1pbihjdHg6IEFjdG9yQ29udGV4dCwgY29tbWFuZDogc3RyaW5nKTogdm9pZCB7XG4gIGlmICghY3R4LmlzQWRtaW4pIHtcbiAgICB0aHJvdyBuZXcgUGVybWlzc2lvbkRlbmllZEVycm9yKGBhZG1pbjoke2NvbW1hbmR9YCBhcyBQZXJtaXNzaW9uLCBjdHguYWN0b3JJZCk7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUNvbW1hbmRCdXMoZW5naW5lOiBTcGluZUVuZ2luZSwgdG9rZW5zOiBUb2tlblN0b3JlKTogQ29tbWFuZEJ1cyB7XG4gIGFzeW5jIGZ1bmN0aW9uIGV4ZWN1dGUoY29tbWFuZDogc3RyaW5nLCBpbnB1dDogdW5rbm93biwgY3R4OiBBY3RvckNvbnRleHQpOiBQcm9taXNlPHVua25vd24+IHtcbiAgICBjb25zdCBkZWYgPSBDT01NQU5EX01BUC5nZXQoY29tbWFuZCk7XG4gICAgaWYgKCFkZWYpIHRocm93IG5ldyBHdWFyZEZhaWxlZEVycm9yKGB1bmtub3duIGNvbW1hbmQ6ICR7Y29tbWFuZH1gKTtcblxuICAgIGNvbnN0IHBhcnNlZFJlc3VsdCA9IGRlZi5pbnB1dC5zYWZlUGFyc2UoaW5wdXQgPz8ge30pO1xuICAgIGlmICghcGFyc2VkUmVzdWx0LnN1Y2Nlc3MpIHtcbiAgICAgIHRocm93IG5ldyBHdWFyZEZhaWxlZEVycm9yKGBpbnZhbGlkIGlucHV0IGZvciAke2NvbW1hbmR9OiAke3pvZE1lc3NhZ2UocGFyc2VkUmVzdWx0LmVycm9yKX1gKTtcbiAgICB9XG4gICAgY29uc3QgcGFyc2VkOiB1bmtub3duID0gcGFyc2VkUmVzdWx0LmRhdGE7XG5cbiAgICBzd2l0Y2ggKGNvbW1hbmQgYXMgQ29tbWFuZE5hbWUpIHtcbiAgICAgIC8vIC0tIHNldHVwIC8gYWRtaW4gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgIGNhc2UgJ2NyZWF0ZV9hY3Rvcic6IHtcbiAgICAgICAgcmVxdWlyZUFkbWluKGN0eCwgY29tbWFuZCk7XG4gICAgICAgIGNvbnN0IHAgPSBwYXJzZWQgYXMgQ3JlYXRlQWN0b3JJbjtcbiAgICAgICAgY29uc3QgYWN0b3IgPSBlbmdpbmUuY3JlYXRlQWN0b3IoeyB0eXBlOiBwLnR5cGUsIGRpc3BsYXlOYW1lOiBwLmRpc3BsYXlOYW1lIH0pO1xuICAgICAgICBjb25zdCB0b2tlbiA9IHRva2Vucy5pc3N1ZShhY3Rvci5pZCk7XG4gICAgICAgIHJldHVybiB7IGFjdG9yLCB0b2tlbiB9O1xuICAgICAgfVxuICAgICAgY2FzZSAnZ3JhbnRfcGVybWlzc2lvbic6IHtcbiAgICAgICAgcmVxdWlyZUFkbWluKGN0eCwgY29tbWFuZCk7XG4gICAgICAgIGNvbnN0IHAgPSBwYXJzZWQgYXMgR3JhbnRJbjtcbiAgICAgICAgZW5naW5lLmdyYW50KHtcbiAgICAgICAgICBhY3RvcklkOiBwLmFjdG9ySWQsXG4gICAgICAgICAgcGVybWlzc2lvbjogcC5wZXJtaXNzaW9uIGFzIFBlcm1pc3Npb24sXG4gICAgICAgICAgLi4uKHAuc2NvcGUgIT09IHVuZGVmaW5lZCA/IHsgc2NvcGU6IHAuc2NvcGUgfSA6IHt9KSxcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiB7IGdyYW50ZWQ6IHRydWUgfTtcbiAgICAgIH1cbiAgICAgIGNhc2UgJ3Jldm9rZV9wZXJtaXNzaW9uJzoge1xuICAgICAgICByZXF1aXJlQWRtaW4oY3R4LCBjb21tYW5kKTtcbiAgICAgICAgY29uc3QgcCA9IHBhcnNlZCBhcyBHcmFudEluO1xuICAgICAgICBlbmdpbmUucmV2b2tlKHtcbiAgICAgICAgICBhY3RvcklkOiBwLmFjdG9ySWQsXG4gICAgICAgICAgcGVybWlzc2lvbjogcC5wZXJtaXNzaW9uIGFzIFBlcm1pc3Npb24sXG4gICAgICAgICAgLi4uKHAuc2NvcGUgIT09IHVuZGVmaW5lZCA/IHsgc2NvcGU6IHAuc2NvcGUgfSA6IHt9KSxcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiB7IHJldm9rZWQ6IHRydWUgfTtcbiAgICAgIH1cbiAgICAgIGNhc2UgJ2NyZWF0ZV9mZWF0dXJlJzoge1xuICAgICAgICByZXR1cm4gZW5naW5lLmNyZWF0ZUZlYXR1cmUoeyBhY3RvcklkOiBjdHguYWN0b3JJZCB9KTtcbiAgICAgIH1cbiAgICAgIGNhc2UgJ2ltcG9ydF9zdG9yaWVzJzoge1xuICAgICAgICBjb25zdCBwID0gcGFyc2VkIGFzIEltcG9ydFN0b3JpZXNJbjtcbiAgICAgICAgcmV0dXJuIGVuZ2luZS5pbXBvcnRTdG9yaWVzKHsgZmVhdHVyZUlkOiBwLmZlYXR1cmVJZCwgeWFtbDogcC55YW1sLCBhY3RvcklkOiBjdHguYWN0b3JJZCB9KTtcbiAgICAgIH1cblxuICAgICAgLy8gLS0gY2xhaW1zIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICBjYXNlICdjbGFpbV90YXNrJzoge1xuICAgICAgICBjb25zdCBwID0gcGFyc2VkIGFzIENsYWltVGFza0luO1xuICAgICAgICByZXR1cm4gZW5naW5lLmNsYWltVGFzayh7XG4gICAgICAgICAgd29ya0l0ZW1JZDogcC53b3JrSXRlbUlkLFxuICAgICAgICAgIGFjdG9ySWQ6IGN0eC5hY3RvcklkLFxuICAgICAgICAgIC4uLihwLnR0bE1zICE9PSB1bmRlZmluZWQgPyB7IHR0bE1zOiBwLnR0bE1zIH0gOiB7fSksXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgY2FzZSAnaGVhcnRiZWF0Jzoge1xuICAgICAgICBjb25zdCBwID0gcGFyc2VkIGFzIEhlYXJ0YmVhdEluO1xuICAgICAgICBlbmdpbmUuaGVhcnRiZWF0KHsgY2xhaW1JZDogcC5jbGFpbUlkIH0pO1xuICAgICAgICByZXR1cm4geyByZW5ld2VkOiB0cnVlIH07XG4gICAgICB9XG4gICAgICBjYXNlICdyZWxlYXNlX2NsYWltJzoge1xuICAgICAgICBjb25zdCBwID0gcGFyc2VkIGFzIFJlbGVhc2VDbGFpbUluO1xuICAgICAgICBlbmdpbmUucmVsZWFzZUNsYWltKHtcbiAgICAgICAgICBjbGFpbUlkOiBwLmNsYWltSWQsXG4gICAgICAgICAgLi4uKHAucmVhc29uICE9PSB1bmRlZmluZWQgPyB7IHJlYXNvbjogcC5yZWFzb24gfSA6IHt9KSxcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiB7IHJlbGVhc2VkOiB0cnVlIH07XG4gICAgICB9XG5cbiAgICAgIC8vIC0tIGxpZmVjeWNsZSAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICBjYXNlICdhZHZhbmNlX3N0YXRlJzoge1xuICAgICAgICBjb25zdCBwID0gcGFyc2VkIGFzIEFkdmFuY2VJbjtcbiAgICAgICAgcmV0dXJuIGVuZ2luZS5hZHZhbmNlU3RhdGUoe1xuICAgICAgICAgIHdvcmtJdGVtSWQ6IHAud29ya0l0ZW1JZCxcbiAgICAgICAgICB0bzogcC50byBhcyBXb3JrSXRlbVN0YXRlLFxuICAgICAgICAgIGFjdG9ySWQ6IGN0eC5hY3RvcklkLFxuICAgICAgICAgIC4uLihwLmZlbmNpbmdUb2tlbiAhPT0gdW5kZWZpbmVkID8geyBmZW5jaW5nVG9rZW46IHAuZmVuY2luZ1Rva2VuIH0gOiB7fSksXG4gICAgICAgICAgLi4uKHAuaWRlbXBvdGVuY3lLZXkgIT09IHVuZGVmaW5lZCA/IHsgaWRlbXBvdGVuY3lLZXk6IHAuaWRlbXBvdGVuY3lLZXkgfSA6IHt9KSxcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICBjYXNlICdibG9ja190YXNrJzoge1xuICAgICAgICBjb25zdCBwID0gcGFyc2VkIGFzIEJsb2NrSW47XG4gICAgICAgIHJldHVybiBlbmdpbmUuYmxvY2tUYXNrKHtcbiAgICAgICAgICB3b3JrSXRlbUlkOiBwLndvcmtJdGVtSWQsXG4gICAgICAgICAgcmVhc29uOiBwLnJlYXNvbixcbiAgICAgICAgICBhY3RvcklkOiBjdHguYWN0b3JJZCxcbiAgICAgICAgICAuLi4ocC5mZW5jaW5nVG9rZW4gIT09IHVuZGVmaW5lZCA/IHsgZmVuY2luZ1Rva2VuOiBwLmZlbmNpbmdUb2tlbiB9IDoge30pLFxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIGNhc2UgJ3VuYmxvY2tfdGFzayc6IHtcbiAgICAgICAgY29uc3QgcCA9IHBhcnNlZCBhcyBXb3JrSXRlbUluO1xuICAgICAgICByZXR1cm4gZW5naW5lLnVuYmxvY2tUYXNrKHsgd29ya0l0ZW1JZDogcC53b3JrSXRlbUlkLCBhY3RvcklkOiBjdHguYWN0b3JJZCB9KTtcbiAgICAgIH1cbiAgICAgIGNhc2UgJ3N1Ym1pdF9ldmlkZW5jZSc6IHtcbiAgICAgICAgY29uc3QgcCA9IHBhcnNlZCBhcyBTdWJtaXRFdmlkZW5jZUluO1xuICAgICAgICBlbmdpbmUuc3VibWl0RXZpZGVuY2Uoe1xuICAgICAgICAgIHdvcmtJdGVtSWQ6IHAud29ya0l0ZW1JZCxcbiAgICAgICAgICBldmlkZW5jZTogcC5ldmlkZW5jZSBhcyBFdmlkZW5jZSxcbiAgICAgICAgICBhY3RvcklkOiBjdHguYWN0b3JJZCxcbiAgICAgICAgICAuLi4ocC5mZW5jaW5nVG9rZW4gIT09IHVuZGVmaW5lZCA/IHsgZmVuY2luZ1Rva2VuOiBwLmZlbmNpbmdUb2tlbiB9IDoge30pLFxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHsgc3VibWl0dGVkOiB0cnVlIH07XG4gICAgICB9XG4gICAgICBjYXNlICdhcHByb3ZlX2dhdGUnOiB7XG4gICAgICAgIGNvbnN0IHAgPSBwYXJzZWQgYXMgQXBwcm92ZUdhdGVJbjtcbiAgICAgICAgcmV0dXJuIGVuZ2luZS5hcHByb3ZlR2F0ZSh7XG4gICAgICAgICAgd29ya0l0ZW1JZDogcC53b3JrSXRlbUlkLFxuICAgICAgICAgIGdhdGU6IHAuZ2F0ZSxcbiAgICAgICAgICBhY3RvcklkOiBjdHguYWN0b3JJZCxcbiAgICAgICAgICAuLi4ocC5waW5uZWRWZXJpZmljYXRpb24gIT09IHVuZGVmaW5lZFxuICAgICAgICAgICAgPyB7IHBpbm5lZFZlcmlmaWNhdGlvbjogcC5waW5uZWRWZXJpZmljYXRpb24gfVxuICAgICAgICAgICAgOiB7fSksXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgY2FzZSAncmVqZWN0X2dhdGUnOiB7XG4gICAgICAgIGNvbnN0IHAgPSBwYXJzZWQgYXMgUmVqZWN0R2F0ZUluO1xuICAgICAgICByZXR1cm4gZW5naW5lLnJlamVjdEdhdGUoeyB3b3JrSXRlbUlkOiBwLndvcmtJdGVtSWQsIGdhdGU6IHAuZ2F0ZSwgYWN0b3JJZDogY3R4LmFjdG9ySWQgfSk7XG4gICAgICB9XG4gICAgICBjYXNlICdyZWxlYXNlX2Rpc3BhdGNoX2hvbGQnOiB7XG4gICAgICAgIGNvbnN0IHAgPSBwYXJzZWQgYXMgRmVhdHVyZUluO1xuICAgICAgICByZXR1cm4gZW5naW5lLnJlbGVhc2VEaXNwYXRjaEhvbGQoeyBmZWF0dXJlSWQ6IHAuZmVhdHVyZUlkLCBhY3RvcklkOiBjdHguYWN0b3JJZCB9KTtcbiAgICAgIH1cblxuICAgICAgLy8gLS0gb3BzIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICAgY2FzZSAnZm9yY2VfcmVsZWFzZV9jbGFpbSc6IHtcbiAgICAgICAgY29uc3QgcCA9IHBhcnNlZCBhcyBXb3JrSXRlbUluO1xuICAgICAgICBjb25zdCB1bnJlbGVhc2VkID0gZW5naW5lLmdldENsYWltcyhwLndvcmtJdGVtSWQpLmZpbHRlcigoY2xhaW0pID0+ICFjbGFpbS5yZWxlYXNlZCk7XG4gICAgICAgIGlmICh1bnJlbGVhc2VkLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgIHRocm93IG5ldyBHdWFyZEZhaWxlZEVycm9yKGBubyBsaXZlIGNsYWltIG9uIHdvcmsgaXRlbSAke3Aud29ya0l0ZW1JZH1gKTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGNvbnN0IGNsYWltIG9mIHVucmVsZWFzZWQpIHtcbiAgICAgICAgICBlbmdpbmUucmVsZWFzZUNsYWltKHsgY2xhaW1JZDogY2xhaW0uaWQsIHJlYXNvbjogJ29wcyBmb3JjZSByZWxlYXNlJyB9KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4geyByZWxlYXNlZDogdW5yZWxlYXNlZC5tYXAoKGNsYWltKSA9PiBjbGFpbS5pZCkgfTtcbiAgICAgIH1cblxuICAgICAgLy8gLS0gcXVlcmllcyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICBjYXNlICdnZXRfd29ya19pdGVtJzoge1xuICAgICAgICBjb25zdCBwID0gcGFyc2VkIGFzIFdvcmtJdGVtSW47XG4gICAgICAgIHJldHVybiBlbmdpbmUuZ2V0V29ya0l0ZW0ocC53b3JrSXRlbUlkKTtcbiAgICAgIH1cbiAgICAgIGNhc2UgJ2dldF9mZWF0dXJlJzoge1xuICAgICAgICBjb25zdCBwID0gcGFyc2VkIGFzIEZlYXR1cmVJbjtcbiAgICAgICAgcmV0dXJuIGVuZ2luZS5nZXRGZWF0dXJlKHAuZmVhdHVyZUlkKTtcbiAgICAgIH1cbiAgICAgIGNhc2UgJ2dldF90YXNrX2NvbnRleHQnOiB7XG4gICAgICAgIGNvbnN0IHAgPSBwYXJzZWQgYXMgV29ya0l0ZW1JbjtcbiAgICAgICAgcmV0dXJuIGVuZ2luZS5nZXRUYXNrQ29udGV4dCh7IHdvcmtJdGVtSWQ6IHAud29ya0l0ZW1JZCB9KTtcbiAgICAgIH1cbiAgICAgIGNhc2UgJ2xpc3Rfd29ya19pdGVtcyc6IHtcbiAgICAgICAgY29uc3QgcCA9IHBhcnNlZCBhcyBMaXN0V29ya0l0ZW1zSW47XG4gICAgICAgIHJldHVybiBlbmdpbmUubGlzdFdvcmtJdGVtcyh7XG4gICAgICAgICAgLi4uKHAuc3RhdGUgIT09IHVuZGVmaW5lZCA/IHsgc3RhdGU6IHAuc3RhdGUgYXMgV29ya0l0ZW1TdGF0ZSB9IDoge30pLFxuICAgICAgICAgIC4uLihwLmZlYXR1cmVJZCAhPT0gdW5kZWZpbmVkID8geyBmZWF0dXJlSWQ6IHAuZmVhdHVyZUlkIH0gOiB7fSksXG4gICAgICAgICAgLi4uKHAuY2xhaW1hYmxlICE9PSB1bmRlZmluZWQgPyB7IGNsYWltYWJsZTogcC5jbGFpbWFibGUgfSA6IHt9KSxcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICBjYXNlICdpbmJveCc6IHtcbiAgICAgICAgY29uc3QgYXdhaXRpbmdTcGVjID0gZW5naW5lXG4gICAgICAgICAgLmxpc3RXb3JrSXRlbXMoeyBzdGF0ZTogJ2RyYWZ0JyB9KVxuICAgICAgICAgIC5maWx0ZXIoKGl0ZW0pID0+IGl0ZW0uc3BlY0NoZWNrcG9pbnQpO1xuICAgICAgICBjb25zdCBhd2FpdGluZ1JldmlldyA9IGVuZ2luZS5saXN0V29ya0l0ZW1zKHsgc3RhdGU6ICdpbl9yZXZpZXcnIH0pO1xuICAgICAgICByZXR1cm4geyBhd2FpdGluZ1NwZWMsIGF3YWl0aW5nUmV2aWV3IH07XG4gICAgICB9XG4gICAgICBjYXNlICdxdWVyeV9ldmVudHMnOiB7XG4gICAgICAgIGNvbnN0IHAgPSBwYXJzZWQgYXMgUXVlcnlFdmVudHNJbjtcbiAgICAgICAgcmV0dXJuIGVuZ2luZS5ldmVudHMocC5zdHJlYW1JZCk7XG4gICAgICB9XG4gICAgICBjYXNlICdnZXRfY2xhaW1zJzoge1xuICAgICAgICBjb25zdCBwID0gcGFyc2VkIGFzIFdvcmtJdGVtSW47XG4gICAgICAgIHJldHVybiBlbmdpbmUuZ2V0Q2xhaW1zKHAud29ya0l0ZW1JZCk7XG4gICAgICB9XG4gICAgICBjYXNlICd3aG9hbWknOiB7XG4gICAgICAgIHJldHVybiB7IGFjdG9ySWQ6IGN0eC5hY3RvcklkLCBpc0FkbWluOiBjdHguaXNBZG1pbiB9O1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIFVucmVhY2hhYmxlIHdoaWxlIHRoZSBzd2l0Y2ggY292ZXJzIHRoZSByZWdpc3RyeTsga2VlcHMgdGhlIGNvbXBpbGVyIGhvbmVzdC5cbiAgICB0aHJvdyBuZXcgR3VhcmRGYWlsZWRFcnJvcihgY29tbWFuZCBub3Qgd2lyZWQgdG8gdGhlIGJ1czogJHtjb21tYW5kfWApO1xuICB9XG5cbiAgcmV0dXJuIHsgZXhlY3V0ZSwgZW5naW5lIH07XG59XG4iLCAiLyoqXG4gKiBNQ1AgYWRhcHRlciBcdTIwMTQgZXZlcnkgcmVnaXN0cnkgZW50cnkgaW4gQ09NTUFORFMgYmVjb21lcyBvbmUgdG9vbDsgZXZlcnlcbiAqIHRvb2wgaGFuZGxlciBjYWxscyB0aGUgU0FNRSBidXMuZXhlY3V0ZSB0aGUgSFRUUCByb3V0ZSBjYWxscy4gTm8gbG9naWNcbiAqIGxpdmVzIGhlcmUgKHJvYWRtYXAgXHUwMEE3Mi4yOiBzdHJ1Y3R1cmFsbHkgaWRlbnRpY2FsIHNlbWFudGljcywgRDUpLlxuICpcbiAqIERFQ0lTSU9OIChyZWNvcmRlZCk6IHdlIHVzZSB0aGUgbG93LWxldmVsIGBTZXJ2ZXJgICtcbiAqIHNldFJlcXVlc3RIYW5kbGVyKExpc3RUb29scy9DYWxsVG9vbCkgaW5zdGVhZCBvZiBgTWNwU2VydmVyLnJlZ2lzdGVyVG9vbGAuXG4gKiBTREsgMS4yOSdzIE1jcFNlcnZlciBhY2NlcHRzIHpvZCBzY2hlbWFzIGFuZCByZS1lbWl0cyBKU09OIFNjaGVtYSB0aHJvdWdoXG4gKiBpdHMgb3duIGNvbXBhdCBsYXllciAoem9kIHY0IGJyYW5jaCB0YXJnZXRzIGRyYWZ0LTcpOyBjb250cmFjdHMnXG4gKiBpbnB1dEpzb25TY2hlbWEoKSBpcyB6b2QgdjQncyBuYXRpdmUgZHJhZnQtMjAyMC0xMiBlbWlzc2lvbi4gRmVlZGluZyB0aGVcbiAqIGNvbnRyYWN0cyBKU09OIFNjaGVtYSB2ZXJiYXRpbSB0aHJvdWdoIHRoZSBsb3ctbGV2ZWwgQVBJIGtlZXBzXG4gKiBcInRvb2wgaW5wdXRTY2hlbWEgPT09IGlucHV0SnNvblNjaGVtYShjb21tYW5kKVwiIGJ5dGUtaWRlbnRpY2FsIFx1MjAxNCBwYXJpdHkgaXNcbiAqIGFzc2VydGVkIGJ5IGRlZXAtZXF1YWxpdHkgaW4gdGVzdC9wYXJpdHkudGVzdC50cy5cbiAqL1xuaW1wb3J0IHsgU2VydmVyIH0gZnJvbSAnQG1vZGVsY29udGV4dHByb3RvY29sL3Nkay9zZXJ2ZXIvaW5kZXguanMnO1xuaW1wb3J0IHsgU3RyZWFtYWJsZUhUVFBTZXJ2ZXJUcmFuc3BvcnQgfSBmcm9tICdAbW9kZWxjb250ZXh0cHJvdG9jb2wvc2RrL3NlcnZlci9zdHJlYW1hYmxlSHR0cC5qcyc7XG5pbXBvcnQge1xuICBDYWxsVG9vbFJlcXVlc3RTY2hlbWEsXG4gIExpc3RUb29sc1JlcXVlc3RTY2hlbWEsXG4gIHR5cGUgQ2FsbFRvb2xSZXN1bHQsXG59IGZyb20gJ0Btb2RlbGNvbnRleHRwcm90b2NvbC9zZGsvdHlwZXMuanMnO1xuaW1wb3J0IHR5cGUgeyBGYXN0aWZ5SW5zdGFuY2UsIEZhc3RpZnlSZXF1ZXN0IH0gZnJvbSAnZmFzdGlmeSc7XG5pbXBvcnQge1xuICBDT01NQU5EUyxcbiAgaW5wdXRKc29uU2NoZW1hLFxuICBtY3BUb29sTmFtZSxcbiAgdHlwZSBBY3RvckNvbnRleHQsXG4gIHR5cGUgQ29tbWFuZEJ1cyxcbn0gZnJvbSAnQG9haHMvY29udHJhY3RzJztcblxuaW1wb3J0IHsgZXJyb3JOYW1lIH0gZnJvbSAnLi9zZXJ2ZXIuanMnO1xuXG5jb25zdCBUT09MX1RPX0NPTU1BTkQ6IFJlYWRvbmx5TWFwPHN0cmluZywgc3RyaW5nPiA9IG5ldyBNYXAoXG4gIENPTU1BTkRTLm1hcCgoY29tbWFuZCkgPT4gW21jcFRvb2xOYW1lKGNvbW1hbmQubmFtZSksIGNvbW1hbmQubmFtZV0pLFxuKTtcblxuLyoqXG4gKiBCdWlsZCBvbmUgTUNQIHNlcnZlciBib3VuZCB0byBhbiBhdXRoZW50aWNhdGVkIGFjdG9yIGNvbnRleHQuIFN0YXRlbGVzc1xuICogSFRUUCBtb3VudHMgY29uc3RydWN0IG9uZSBwZXIgcmVxdWVzdDsgdGVzdHMgd2lyZSBvbmUgdG8gYW5cbiAqIEluTWVtb3J5VHJhbnNwb3J0IGRpcmVjdGx5LlxuICovXG5leHBvcnQgZnVuY3Rpb24gYnVpbGRNY3BTZXJ2ZXIoYnVzOiBDb21tYW5kQnVzLCBjdHg6IEFjdG9yQ29udGV4dCk6IFNlcnZlciB7XG4gIGNvbnN0IHNlcnZlciA9IG5ldyBTZXJ2ZXIoXG4gICAgeyBuYW1lOiAnb2Focy1zcGluZScsIHZlcnNpb246ICcwLjAuMScgfSxcbiAgICB7IGNhcGFiaWxpdGllczogeyB0b29sczoge30gfSB9LFxuICApO1xuXG4gIHNlcnZlci5zZXRSZXF1ZXN0SGFuZGxlcihMaXN0VG9vbHNSZXF1ZXN0U2NoZW1hLCBhc3luYyAoKSA9PiAoe1xuICAgIHRvb2xzOiBDT01NQU5EUy5tYXAoKGNvbW1hbmQpID0+ICh7XG4gICAgICBuYW1lOiBtY3BUb29sTmFtZShjb21tYW5kLm5hbWUpLFxuICAgICAgZGVzY3JpcHRpb246IGNvbW1hbmQuZGVzY3JpcHRpb24sXG4gICAgICAvLyBWZXJiYXRpbSBmcm9tIGNvbnRyYWN0cyBcdTIwMTQgdGhlIHBhcml0eSB0ZXN0IGRlZXAtZXF1YWxzIHRoaXMuXG4gICAgICBpbnB1dFNjaGVtYTogaW5wdXRKc29uU2NoZW1hKGNvbW1hbmQubmFtZSkgYXMgeyB0eXBlOiAnb2JqZWN0JzsgW2s6IHN0cmluZ106IHVua25vd24gfSxcbiAgICB9KSksXG4gIH0pKTtcblxuICBzZXJ2ZXIuc2V0UmVxdWVzdEhhbmRsZXIoQ2FsbFRvb2xSZXF1ZXN0U2NoZW1hLCBhc3luYyAocmVxdWVzdCk6IFByb21pc2U8Q2FsbFRvb2xSZXN1bHQ+ID0+IHtcbiAgICBjb25zdCBjb21tYW5kTmFtZSA9IFRPT0xfVE9fQ09NTUFORC5nZXQocmVxdWVzdC5wYXJhbXMubmFtZSk7XG4gICAgaWYgKGNvbW1hbmROYW1lID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGNvbnRlbnQ6IFt7IHR5cGU6ICd0ZXh0JywgdGV4dDogYHVua25vd24gdG9vbDogJHtyZXF1ZXN0LnBhcmFtcy5uYW1lfWAgfV0sXG4gICAgICAgIGlzRXJyb3I6IHRydWUsXG4gICAgICB9O1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgLy8gVGhlIGV4YWN0IHNhbWUgY2FsbCB0aGUgSFRUUCByb3V0ZSBtYWtlcyBcdTIwMTQgbm8gTUNQLW9ubHkgbG9naWMuXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBidXMuZXhlY3V0ZShjb21tYW5kTmFtZSwgcmVxdWVzdC5wYXJhbXMuYXJndW1lbnRzID8/IHt9LCBjdHgpO1xuICAgICAgcmV0dXJuIHsgY29udGVudDogW3sgdHlwZTogJ3RleHQnLCB0ZXh0OiBKU09OLnN0cmluZ2lmeShyZXN1bHQgPz8gbnVsbCkgfV0gfTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgY29udGVudDogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIHR5cGU6ICd0ZXh0JyxcbiAgICAgICAgICAgIHRleHQ6IEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgICAgICAgZXJyb3I6IHtcbiAgICAgICAgICAgICAgICBuYW1lOiBlcnJvck5hbWUoZXJyb3IpLFxuICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKSxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0pLFxuICAgICAgICAgIH0sXG4gICAgICAgIF0sXG4gICAgICAgIGlzRXJyb3I6IHRydWUsXG4gICAgICB9O1xuICAgIH1cbiAgfSk7XG5cbiAgcmV0dXJuIHNlcnZlcjtcbn1cblxuLyoqXG4gKiBNb3VudCBQT1NUIC9tY3Agb24gdGhlIEZhc3RpZnkgYXBwIFx1MjAxNCBzdGF0ZWxlc3MgU3RyZWFtYWJsZUhUVFAgcGF0dGVyblxuICogKHNlc3Npb25JZEdlbmVyYXRvcjogdW5kZWZpbmVkKTogYSBmcmVzaCBzZXJ2ZXIrdHJhbnNwb3J0IHBhaXIgcGVyIHJlcXVlc3QsXG4gKiBmdWxseSBpc29sYXRlZCwgbm8gc2Vzc2lvbiBzdGF0ZSB0byBsZWFrIGJldHdlZW4gYWN0b3JzLlxuICovXG5leHBvcnQgZnVuY3Rpb24gcmVnaXN0ZXJNY3BSb3V0ZShcbiAgYXBwOiBGYXN0aWZ5SW5zdGFuY2UsXG4gIGJ1czogQ29tbWFuZEJ1cyxcbiAgYXV0aGVudGljYXRlOiAocmVxdWVzdDogRmFzdGlmeVJlcXVlc3QpID0+IEFjdG9yQ29udGV4dCB8IG51bGwsXG4pOiB2b2lkIHtcbiAgYXBwLnBvc3QoJy9tY3AnLCBhc3luYyAocmVxdWVzdCwgcmVwbHkpID0+IHtcbiAgICBjb25zdCBjdHggPSBhdXRoZW50aWNhdGUocmVxdWVzdCk7XG4gICAgaWYgKGN0eCA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIHJlcGx5XG4gICAgICAgIC5jb2RlKDQwMSlcbiAgICAgICAgLnNlbmQoeyBqc29ucnBjOiAnMi4wJywgZXJyb3I6IHsgY29kZTogLTMyMDAxLCBtZXNzYWdlOiAndW5hdXRob3JpemVkJyB9LCBpZDogbnVsbCB9KTtcbiAgICB9XG5cbiAgICBjb25zdCBzZXJ2ZXIgPSBidWlsZE1jcFNlcnZlcihidXMsIGN0eCk7XG4gICAgLy8gU3RhdGVsZXNzIG1vZGU6IHNlc3Npb25JZEdlbmVyYXRvciBvbWl0dGVkIChcdTIyNjEgdW5kZWZpbmVkIFx1MjAxNCB0aGUgU0RLJ3NcbiAgICAvLyBkb2N1bWVudGVkIHN0YXRlbGVzcyBwYXR0ZXJuOyB0aGUga2V5IGlzIGxlZnQgb3V0IG9ubHkgYmVjYXVzZSB0aGUgU0RLXG4gICAgLy8gb3B0aW9ucyB0eXBlIGlzIG5vdCBleGFjdE9wdGlvbmFsUHJvcGVydHlUeXBlcy1jbGVhbikuXG4gICAgY29uc3QgdHJhbnNwb3J0ID0gbmV3IFN0cmVhbWFibGVIVFRQU2VydmVyVHJhbnNwb3J0KHsgZW5hYmxlSnNvblJlc3BvbnNlOiB0cnVlIH0pO1xuXG4gICAgcmVwbHkuaGlqYWNrKCk7XG4gICAgdHJ5IHtcbiAgICAgIC8vIENhc3Q6IHRoZSBTREsncyBUcmFuc3BvcnQgaW50ZXJmYWNlIGlzIG5vdCBleGFjdE9wdGlvbmFsUHJvcGVydHlUeXBlcy1jbGVhbi5cbiAgICAgIGF3YWl0IHNlcnZlci5jb25uZWN0KHRyYW5zcG9ydCBhcyB1bmtub3duIGFzIFBhcmFtZXRlcnM8dHlwZW9mIHNlcnZlci5jb25uZWN0PlswXSk7XG4gICAgICAvLyBKU09OLXJlc3BvbnNlIG1vZGU6IHJlc29sdmVzIG9uY2UgdGhlIHJlc3BvbnNlIGhhcyBiZWVuIHdyaXR0ZW4uXG4gICAgICAvLyAoRG8gTk9UIGNsb3NlIG9uIHJlcXVlc3QucmF3ICdjbG9zZScgXHUyMDE0IE5vZGUgZW1pdHMgaXQgYXMgc29vbiBhcyB0aGVcbiAgICAgIC8vIHBhcnNlZCByZXF1ZXN0IHN0cmVhbSBlbmRzLCB3aGljaCB3b3VsZCBraWxsIHRoZSBwZW5kaW5nIHJlc3BvbnNlLilcbiAgICAgIGF3YWl0IHRyYW5zcG9ydC5oYW5kbGVSZXF1ZXN0KHJlcXVlc3QucmF3LCByZXBseS5yYXcsIHJlcXVlc3QuYm9keSk7XG4gICAgfSBmaW5hbGx5IHtcbiAgICAgIHZvaWQgdHJhbnNwb3J0LmNsb3NlKCk7XG4gICAgICB2b2lkIHNlcnZlci5jbG9zZSgpO1xuICAgIH1cbiAgICByZXR1cm4gcmVwbHk7XG4gIH0pO1xufVxuIl0sCiAgIm1hcHBpbmdzIjogIjs7Ozs7Ozs7Ozs7OztBQUFBLElBMEJhLHVCQVdBLGtCQVFBLGVBUUEsd0JBV0Esd0JBYUEsa0JBV0EsaUJBMkNBO0FBbkliO0FBQUE7QUFBQTtBQTBCTyxJQUFNLHdCQUFOLGNBQW9DLE1BQU07QUFBQSxNQUMvQyxZQUNrQixZQUNBLFNBQ2hCO0FBQ0EsY0FBTSxzQkFBc0IsVUFBVSxjQUFjLE9BQU8sRUFBRTtBQUg3QztBQUNBO0FBR2hCLGFBQUssT0FBTztBQUFBLE1BQ2Q7QUFBQSxJQUNGO0FBR08sSUFBTSxtQkFBTixjQUErQixNQUFNO0FBQUEsTUFDMUMsWUFBNEIsT0FBZTtBQUN6QyxjQUFNLGlCQUFpQixLQUFLLEVBQUU7QUFESjtBQUUxQixhQUFLLE9BQU87QUFBQSxNQUNkO0FBQUEsSUFDRjtBQUdPLElBQU0sZ0JBQU4sY0FBNEIsTUFBTTtBQUFBLE1BQ3ZDLFlBQTRCLFFBQWdCO0FBQzFDLGNBQU0sYUFBYSxNQUFNLEVBQUU7QUFERDtBQUUxQixhQUFLLE9B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QU0sMkJBQXNCLElBQUksSUFBSSxLQUFLLElBQUksT0FBTztBQUFBLENBQUk7QUFDdkUsZ0JBQVEsV0FBVztBQUFBLE1BQ3JCO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFFRixTQUFPO0FBQ1Q7QUFFQSxlQUFzQixLQUFLLE9BQWlCLFFBQVEsTUFBcUI7QUFDdkUsUUFBTSxhQUFhLEVBQUUsV0FBVyxJQUFJO0FBQ3RDO0FBR0EsS0FBSyxLQUFLOyIsCiAgIm5hbWVzIjogWyJ3b3JrSXRlbUlkIiwgImZlbmNpbmdUb2tlbiIsICJzcWwiLCAiUkFOSyIsICJUUkFOU0lUSU9OUyIsICJMRUdBQ1lfU1RBVFVTIiwgIndvcmtJdGVtSWQiLCAiZmVuY2luZ1Rva2VuIiwgImRpcm5hbWUiLCAiaW5pdF9zcmMiLCAic3JjX2V4cG9ydHMiLCAiZXhpc3RzU3luYyIsICJta2RpclN5bmMiLCAicmVhZEZpbGVTeW5jIiwgIndyaXRlRmlsZVN5bmMiLCAiam9pbiIsICJyZXNvbHZlIiwgIndvcmtJdGVtSWQiLCAiZXZpZGVuY2UiLCAiYmFzZWxpbmUiLCAib3V0Y29tZSIsICJpbml0X3NyYyIsICJyZXNvbHZlIiwgImVycm9yTmFtZSIsICJmZWF0dXJlcyIsICJldmVudHMiLCAicmFuZG9tQnl0ZXMiLCAibWtkaXJTeW5jIiwgImpvaW4iLCAicmVhZEZpbGVTeW5jIiwgImRlZiIsICJyYW5kb21CeXRlcyIsICJta2RpclN5bmMiLCAiY3JlYXRlUGdTeW5jRW5naW5lIiwgImpvaW4iLCAidGV4dCIsICJyZXNvbHZlIiwgIndvcmtJdGVtSWQiXQp9Cg==
