/**
 * Entitlements — the replayable authz trace and every governance-gated write:
 * delivery roles, workspace plan (a ceiling), restrict-only workspace policy,
 * gate policy (quorum as data), and governance role. entitlement = plan ×
 * governance role × delivery role, resolved by a pure function (roadmap §3).
 * Every write is engine-gated on the caller's governance role; the UI attempts
 * and surfaces ALLOWED/DENIED, it never decides authority itself.
 */
import type { AuthzExplanation, RoleAssignment } from '@oahs/core';

import { clear, el, run, setStatus } from '../core/dom.js';
import { rpc } from '../core/rpc.js';
import type { View } from '../core/router.js';
import {
  DELIVERY_ROLE_CODES,
  GATES,
  GOVERNANCE_ROLES,
  PERMISSIONS,
  PLANS,
} from '../core/vocab.js';
import {
  badge,
  button,
  card,
  cardSub,
  cardTitle,
  emptyState,
  field,
  section,
  select,
  table,
  textInput,
} from '../components/widgets.js';

function triState(): HTMLSelectElement {
  return select(['(unchanged)', 'true', 'false'], '(unchanged)');
}

function checkbox(label: string): { wrap: HTMLElement; input: HTMLInputElement } {
  const wrap = el('label', 'field');
  const input = el('input');
  input.type = 'checkbox';
  input.style.width = 'auto';
  wrap.appendChild(input);
  wrap.appendChild(el('span', 'field-label', label));
  return { wrap, input };
}

export const entitlementsView: View = {
  mount(container: HTMLElement): () => void {
    const view = el('div', 'view');
    view.appendChild(el('h2', undefined, 'Entitlements'));

    // -- authz trace
    const authz = section('Authz trace (authz_explain)');
    const authzActor = textInput('actorId');
    const authzPerm = select(PERMISSIONS, 'gate.review.approve');
    const authzOut = el('div', 'section-body');
    const authzRow = el('div', 'toolbar');
    authzRow.appendChild(field('Actor', authzActor));
    authzRow.appendChild(field('Permission', authzPerm));
    authzRow.appendChild(
      button(
        'Explain',
        () => {
          run(async () => {
            const actorId = authzActor.value.trim();
            if (actorId === '') throw new Error('actorId is required');
            const trace = await rpc<AuthzExplanation>('authz_explain', {
              actorId,
              permission: authzPerm.value,
            });
            clear(authzOut);
            const line = card();
            const title = el('div', 'c-title');
            title.textContent = `${trace.permission} `;
            title.appendChild(badge(trace.allowed ? 'done' : 'blocked'));
            title.appendChild(document.createTextNode(trace.allowed ? ' ALLOWED' : ' DENIED'));
            line.appendChild(title);
            line.appendChild(cardSub(`source: ${trace.source ?? 'none'}`));
            line.appendChild(
              cardSub(
                `governance ${trace.governanceRole} · plan ${trace.plan} · planAllows ${trace.planAllows} · policyAllows ${trace.policyAllows}`,
              ),
            );
            line.appendChild(cardSub(`versions: plan ${trace.versions.plan} · policy ${trace.versions.policy}`));
            authzOut.appendChild(line);
          });
        },
        'primary',
      ),
    );
    authz.body.appendChild(authzRow);
    authz.body.appendChild(authzOut);
    view.appendChild(authz.section);

    // -- delivery roles
    const roles = section('Delivery roles');
    const roleActor = textInput('actorId');
    const roleSel = select(DELIVERY_ROLE_CODES, 'reviewer');
    const roleOut = el('div', 'section-body');
    const roleRow = el('div', 'toolbar');
    roleRow.appendChild(field('Actor', roleActor));
    roleRow.appendChild(field('Role', roleSel));
    roleRow.appendChild(
      button('Assign', () => {
        run(async () => {
          const actorId = roleActor.value.trim();
          if (actorId === '') throw new Error('actorId is required');
          await rpc('assign_role', { actorId, roleCode: roleSel.value });
          setStatus(`assigned ${roleSel.value} to ${actorId}`);
          loadAssignments();
        });
      }),
    );
    roleRow.appendChild(
      button(
        'Revoke',
        () => {
          run(async () => {
            const actorId = roleActor.value.trim();
            if (actorId === '') throw new Error('actorId is required');
            await rpc('revoke_role', { actorId, roleCode: roleSel.value });
            setStatus(`revoked ${roleSel.value} from ${actorId}`);
            loadAssignments();
          });
        },
        'danger',
      ),
    );
    roleRow.appendChild(button('List assignments', () => loadAssignments()));
    roles.body.appendChild(roleRow);
    roles.body.appendChild(roleOut);
    view.appendChild(roles.section);

    function loadAssignments(): void {
      run(async () => {
        const assignments = await rpc<RoleAssignment[]>('list_role_assignments', {});
        clear(roleOut);
        if (assignments.length === 0) {
          roleOut.appendChild(emptyState('No role assignments.'));
          return;
        }
        const rows = assignments.map((assignment) => [
          assignment.actorId,
          assignment.roleCode,
          assignment.grantedBy,
          assignment.revoked ? badge('revoked') : badge('active'),
        ]);
        roleOut.appendChild(table(['Actor', 'Role', 'Granted by', 'Status'], rows));
      });
    }

    // -- plan + governance
    const plan = section('Workspace plan & governance');
    const planSel = select(PLANS, 'enterprise');
    const planRow = el('div', 'toolbar');
    planRow.appendChild(field('Plan', planSel));
    planRow.appendChild(
      button('Set plan', () => {
        run(async () => {
          await rpc('set_plan', { plan: planSel.value });
          setStatus(`plan set to ${planSel.value}`);
        });
      }),
    );
    const govActor = textInput('actorId');
    const govSel = select(GOVERNANCE_ROLES, 'member');
    planRow.appendChild(field('Actor', govActor));
    planRow.appendChild(field('Gov role', govSel));
    planRow.appendChild(
      button('Set governance', () => {
        run(async () => {
          const actorId = govActor.value.trim();
          if (actorId === '') throw new Error('actorId is required');
          await rpc('set_governance_role', { actorId, role: govSel.value });
          setStatus(`governance role of ${actorId} set to ${govSel.value}`);
        });
      }),
    );
    plan.body.appendChild(planRow);
    view.appendChild(plan.section);

    // -- workspace policy (restrict-only)
    const policy = section('Workspace policy (restrict-only)');
    const gateApprovals = triState();
    const selfDispatch = triState();
    const policyRow = el('div', 'toolbar');
    policyRow.appendChild(field('agentGateApprovals', gateApprovals));
    policyRow.appendChild(field('agentSelfDispatch', selfDispatch));
    policyRow.appendChild(
      button('Set policy', () => {
        run(async () => {
          const body: Record<string, boolean> = {};
          if (gateApprovals.value !== '(unchanged)') body.agentGateApprovals = gateApprovals.value === 'true';
          if (selfDispatch.value !== '(unchanged)') body.agentSelfDispatch = selfDispatch.value === 'true';
          if (Object.keys(body).length === 0) throw new Error('choose at least one policy key');
          await rpc('set_workspace_policy', { policy: body });
          setStatus('workspace policy updated');
        });
      }),
    );
    policy.body.appendChild(policyRow);
    view.appendChild(policy.section);

    // -- gate policy (quorum as data)
    const gatePolicy = section('Gate policy (quorum as data)');
    const gateSel = select(GATES, 'review_approval');
    const minApprovals = textInput('min approvals (e.g. 2)');
    minApprovals.type = 'number';
    const reqUser = checkbox('require user');
    const reqAgent = checkbox('require agent');
    const gateRow = el('div', 'toolbar');
    gateRow.appendChild(field('Gate', gateSel));
    gateRow.appendChild(field('Min approvals', minApprovals));
    gateRow.appendChild(reqUser.wrap);
    gateRow.appendChild(reqAgent.wrap);
    gateRow.appendChild(
      button('Set gate policy', () => {
        run(async () => {
          const gatePolicyBody: { minApprovals?: number; requiredActorTypes?: string[] } = {};
          const min = minApprovals.value.trim();
          if (min !== '') gatePolicyBody.minApprovals = Number(min);
          const types: string[] = [];
          if (reqUser.input.checked) types.push('user');
          if (reqAgent.input.checked) types.push('agent');
          if (types.length > 0) gatePolicyBody.requiredActorTypes = types;
          if (Object.keys(gatePolicyBody).length === 0) {
            throw new Error('set min approvals and/or a required actor type');
          }
          await rpc('set_gate_policy', { gate: gateSel.value, policy: gatePolicyBody });
          setStatus(`gate policy for ${gateSel.value} updated`);
        });
      }),
    );
    gatePolicy.body.appendChild(gateRow);
    view.appendChild(gatePolicy.section);

    container.appendChild(view);
    return () => {};
  },
};
