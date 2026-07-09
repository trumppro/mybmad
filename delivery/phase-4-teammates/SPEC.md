# Phase 4 — Non-coding teammates

Feature spec for roadmap Build phases Phase 4: the worker broadens. BMAD personas become default agent actors; work items carry kinds beyond code with non-code evidence rules (§1.4). Exit criterion: a PRD change drafted by the PM agent, reviewed by a reviewer agent, approved by a human PO — three actor kinds, one rails.

## Scope

- `work_item.kind`: code | spec_draft | design_review | qa_report | doc — kind selects machine-evidence guards, never gate authority.
- Non-code evidence: latest `doc_lint` schema-valid to enter review; no commit requirement at the done gate; pinned verification and review-report rules unchanged.
- `provisionPersonas` (gated, idempotent): six BMAD personas as agent actors, floor-state roles, zero default gate authority.
- `lintDoc` measuring tool in the runner (deterministic: frontmatter parse, required sections, placeholder scan) + `oahs doclint --submit`.
- Rails: create_work_item, list_actors, provision_personas; CLI `oahs actors|personas provision|item create|doclint`; UI mention picker from list_actors.

## Out of scope

LLM-driven persona runtimes (the playbooks run via `oahs work`/jobs — Phase 5 Hermes deepens them), QA gate (`qa-passed`) as a distinct gate code, per-feature role scopes.
