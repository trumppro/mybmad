/**
 * Phase 2 entitlements over a DURABLE data directory (story 13 seam):
 * plan, workspace policy, gate policy, delivery roles, and governance roles
 * must survive an engine restart on the same PGlite directory. This is a
 * @oahs/db test (persistence semantics), not a core conformance test.
 */
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createPgSyncEngine } from '../src/sync-engine.js';

describe('entitlements durable restart (Phase 2 × story 13)', () => {
  it('plan, policy, gate policy, roles, and governance survive a restart', () => {
    const dataDir = mkdtempSync(join(tmpdir(), 'oahs-entitlements-'));

    const first = createPgSyncEngine({ dataDir });
    const admin = first.createActor({ type: 'user', displayName: 'Admin', governanceRole: 'admin' });
    const user = first.createActor({ type: 'user', displayName: 'Reviewer-to-be' });
    first.setPlan({ plan: 'team', byActorId: admin.id });
    first.setWorkspacePolicy({ policy: { agentSelfDispatch: false }, byActorId: admin.id });
    first.setGatePolicy({ gate: 'review_approval', policy: { minApprovals: 2 }, byActorId: admin.id });
    first.assignRole({ actorId: user.id, roleCode: 'reviewer', byActorId: admin.id });

    // "Restart": a second engine over the same data directory (no truncate).
    const second = createPgSyncEngine({ dataDir });
    expect(second.getPlan()).toBe('team');
    expect(second.getWorkspacePolicy().agentSelfDispatch).toBe(false);
    expect(second.getGatePolicy('review_approval').minApprovals).toBe(2);
    expect(second.getGovernanceRole(admin.id)).toBe('admin');
    expect(second.getGovernanceRole(user.id)).toBe('member');
    expect(
      second.listRoleAssignments(user.id).some((a) => a.roleCode === 'reviewer' && !a.revoked),
    ).toBe(true);
    const explanation = second.authzExplain({ actorId: user.id, permission: 'gate.review.approve' });
    expect(explanation.allowed).toBe(true);
    expect(explanation.source).toBe('role:reviewer');
    expect(explanation.plan).toBe('team');
  });
});
