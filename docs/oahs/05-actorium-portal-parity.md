# 05 — Đối chiếu Actorium portal ↔ oahs

> Khảo sát trực tiếp portal vận hành Actorium (app.actorium.ai) ngày 2026-07-16, đọc cả
> 8 màn hình + org/workspace settings + các dialog + command palette. Tài liệu này đối
> chiếu từng bề mặt với oahs và trỏ tới mục roadmap/backlog đã tiếp nhận. Đây là input
> thứ 3 sau 2 PDF (kiến trúc + user manual) đã vào roadmap §8–§12.

## Kết luận một dòng

Actorium hơn oahs ở **bề mặt vận hành (UI, IA)** và một vài **công đoạn LLM cụ thể**;
oahs hơn Actorium ở **lõi tất định** (các *action* gate/dispatch trong command palette
Actorium hiện vẫn là **PLACEHOLDER**, còn oahs đã có lệnh thật + test). Đề xuất: mượn IA
và các phase-model của Actorium, giữ nguyên rails tất định của oahs.

## Phân cấp

| Actorium | oahs hôm nay | oahs sau tenancy (§7/§12) |
|---|---|---|
| **Organization** (members, governance role, billing/Usage) | — (chưa có) | Thêm Org layer bên trên |
| **Workspace** (repos, features, model policies) | `workspace` hardcoded đơn + entity `project` (Cockpit) | `project` → **Workspace** |
| Feature | `feature` | `feature` |
| Task | `work_item` | `work_item` |

Auth Actorium = **Google OAuth/SSO**; oahs = bearer token (OIDC ở §7/§12 story 1).

## 8 màn hình ↔ oahs

| # | Màn Actorium | Chức năng quan sát được | oahs tương ứng | Trạng thái |
|---|---|---|---|---|
| 1 | **Board** | Features board 7 cột: In Design → **In TDD** → Ready for Impl → In Implementation → In Handoff → Done → Cancelled | FSM feature §9 | §9: thêm **In TDD**, cột board (story 1 + 7) |
| 2 | **Feature IDE** | Workspace chi tiết per-feature (tabs Spec/Design/Tasks/Handoff/Activity); vào bằng click 1 feature | Cockpit item/feature view | §9 story 7 (workspace UI) |
| 3 | **Files** | Duyệt tài liệu workspace | Spec/artifact trong git (D3) | §11 `get_spec_content` (story 3) |
| 4 | **Chat** | Kiểu Slack: Saved + **Channels** + Sessions + **DMs** + Threads | Phase 3 threads/mentions | §5.5 + §12 story 6 (channels/DMs/saved) |
| 5 | **Activity** | Feed thông báo: All / **DMs** / Mentions + Mark all read | `notifications` + inbox | Đã có; DM cần §12 story 6 |
| 6 | **Repositories** | Registry per-workspace: `{repoId, gitUrl SSH, baseBranch=main}`; "Add repo" | `projects.repoPath` (local) | §9 story 6: thêm `gitUrl`/`baseBranch` |
| 7 | **Model Policies** | Model **theo phase**: PR Description, Suggested Next Step, Self Review, Implementation, Conflict Resolution — mỗi phase 1 chuỗi fallback, default Claude Sonnet 4.6, per-workspace, UI | Gateway per-persona, không UI, chỉ `default` từ env | §2.5 + §11 story 8: per-phase policy + UI |
| 8 | **Settings** | Profile / Security / Notifications / **Usage** (billing token) | Bearer token; `Meter` không UI | §12 story 7 (Usage) + §7 OIDC |
| — | **Command palette ⌘K** | NAVIGATE + ACTIONS (Approve Design, Mark Task Ready, Request Changes) + AGENT (Start Agent Run) — **đều PLACEHOLDER** | Registry `COMMANDS` (đầy đủ, không có palette) | §9 story 7: palette trên registry |

## 5 phase model của Actorium = 5 điểm chạm LLM của workflow

Model Policies lộ đúng các chỗ workflow gọi model (tất cả **ngoài spine** — §0.1 giữ nguyên):

| Phase Actorium | Nghĩa | oahs tiếp nhận |
|---|---|---|
| **PR Description** | Sinh mô tả PR | §9 forge (story 6) + route `pr_description` |
| **Suggested Next Step** | Gợi ý bước tiếp cho task blocked | Runbook 9-blocked-reason (§9 story 7) + route `suggested_next_step` |
| **Self Review** | Agent tự review diff trước review người | §11 story 7 (evidence `self_review`, **không guard** — D12) |
| **Implementation** | Viết code | Runner workLoop + route `implementation` |
| **Conflict Resolution** | Giải quyết merge conflict | §10 phase runner (route `conflict_resolution`) |

Đây là hình hài cụ thể của gateway §2.5: routing **per-phase** (không per-persona), cấu
hình **as-data** (như gate-policy), per-workspace, có UI. Spine không bao giờ là client
của gateway (§0.1) — policy là dữ liệu spine lưu, gateway đọc, runner/dispatcher gọi model.

## oahs đang mạnh hơn (giữ nguyên)

- **Lõi tất định thật, không stub**: claim + fencing token, evidence-gated done,
  entitlements as data, event log append-only — trong khi các *action* của Actorium
  (approve/mark-ready/request-changes/start-agent) còn PLACEHOLDER.
- **MCP ≡ HTTP** một command bus, máy-kiểm parity.
- **Ranh giới thiêng**: chat không mutate lifecycle; agent không subscribe event bus thô.
- **Reconcile detect-only** (D6); **no-LLM-in-spine** (§0.1).

## Gap oahs cần lấp (đều đã vào backlog)

| Gap | Roadmap | Story |
|---|---|---|
| Model policy per-phase + UI | §2.5/§11 | phase-11 story 8 |
| Stage In TDD + board vocabulary | §9 | phase-9 story 1, 7 |
| Self review + conflict resolution phase | §11/§10 | phase-11 story 7, phase-10 §conflict |
| Command palette ⌘K | §9 | phase-9 story 7 |
| Repo registry `{gitUrl, baseBranch}` | §9 | phase-9 story 6 |
| Org→Workspace tenancy | §7/§12 | (khi tenancy) |
| Chat channels/DMs/saved | §5.5/§12 | phase-12 story 6 |
| OIDC + Usage view | §7/§12 | phase-12 story 1, 7 |

## Không lấy từ Actorium

- Không đưa *action* vào dạng "LLM phán gate" — oahs giữ gate tất định (self-check #4).
- Không dựng document-storage service (D3: artifact ở git).
- Không dựng vector-DB riêng (D14: pgvector trong Postgres/PGlite).
- Không để output knowledge/self-review làm guard (D12).
