# Tham chiếu

Bảng tra cứu: lệnh CLI, endpoints HTTP/MCP/SSE, các enum & permission, biến môi trường,
và định dạng `stories.yaml`. Nguồn chân lý: [apps/oahs/src/cli.ts](../../apps/oahs/src/cli.ts)
(CLI), [packages/contracts/src/index.ts](../../packages/contracts/src/index.ts) (registry
command), [apps/spine-api/ui-src/core/vocab.ts](../../apps/spine-api/ui-src/core/vocab.ts)
(enum).

## Lệnh CLI

Mọi lệnh client nhận `--url <url>` (mặc định env `OAHS_URL`, rồi `http://localhost:4521`)
và `--token <token>` (mặc định biến môi trường `OAHS_TOKEN`). `serve` là ngoại lệ
(không phải client).

### Server

| Lệnh | Tham số | Việc |
|---|---|---|
| `serve` | `--port <n>` (4521) · `--admin-token <t>` (env `OAHS_ADMIN_TOKEN`) · `--data <dir>` (env `OAHS_DATA`, mặc định `~/.oahs/data`) · `--ephemeral` | Khởi động spine-api (HTTP `/rpc/*` + MCP `/mcp` + UI `/ui`). Bền theo mặc định; `--ephemeral` = in-memory, mất sạch khi tắt. |

### Project (Phase 7 Wave 2 — đơn vị chạy song song)

| Lệnh | Tham số | Việc |
|---|---|---|
| `project create <name>` | `--slug` · `--kind code\|doc\|mixed` · `--repo <path>` · `--spec-folder <rel>` | Tạo project; slug sinh từ tên; repo binding để `work --project` khỏi cần cờ. |
| `project ls` | `--all` | Toàn cảnh: mỗi project một dòng — items theo state, blocked, claims sống, gates chờ. |
| `project show <id\|slug>` | — | Chi tiết + repo binding. |
| `project archive <id\|slug>` | — | Ẩn khỏi ls, chặn feature mới; lịch sử vẫn đọc được. |
| `feature create` | `--project <id\|slug>` · `--name <tên>` | Feature gắn vào project (bỏ trống = default project). |
| `status` | `--project <id\|slug>` | Bảng trạng thái CHỈ của một project. |
| `work` | `--project <slug>` · `--claim-ttl <ms>` · `--heartbeat <ms>` | Runner bind theo project: repo + spec folder đọc từ record, chỉ nhận việc của project đó; heartbeat giữ lease khi agent chạy lâu (server chạy wall-clock lease — runner chết thì lease TỰ hết hạn sau TTL). |

**Handle theo project:** hai project được phép trùng key story (vd cùng có `1-1`).
Handle trần chỉ resolve khi duy nhất toàn server; trùng → lỗi "ambiguous", dùng
dạng đầy đủ **`<slug>:<key>`** (vd `alpha-app:1-1`) ở MỌI lệnh.

**Memory theo project (D-H):** memory của agent gắn `projectId` (bài học dự án
nào ở dự án đó); không gắn = craft toàn cục, recall được ở mọi project.

### Ops (Phase 7 Wave 1)

| Lệnh | Tham số | Việc |
|---|---|---|
| `whoami` | — | Token này là actor nào (`actorId`, `isAdmin`). |
| `claim ls` | `--released` | Claim đang sống trên TOÀN workspace (story, người giữ, fencing token); `--released` xem cả lịch sử. |
| `claim release <workItemId>` | `--force` (bắt buộc) | Giải phóng mọi claim sống trên một work item — cứu runner chết. |
| `token list` | — | (ADMIN) Kiểm kê token đã cấp: actor + số lượng, không bao giờ lộ secret. |
| `token reissue <actorId>` | — | (ADMIN) Thu hồi token cũ của actor, in MỘT token mới (cứu mất token). |
| `work` | thêm `--feature <id>` | Runner chỉ nhận việc của đúng feature — BẮT BUỘC về kỷ luật khi server có từ 2 backlog. |

### Vòng đời & gate

| Lệnh | Tham số | Việc |
|---|---|---|
| `status` | — | Mọi work item theo trạng thái + dispatch hold của feature |
| `inbox` | — | Item đang chờ quyết định gate |
| `advance <workItemId>` | `--to <state>` (bắt buộc) · `--fencing-token <n>` | Chuyển item qua FSM (vùng planning cho người) |
| `approve <workItemId>` | `--gate <gate>` (bắt buộc) · `--pin <cmd>` (lặp lại, chỉ `spec_approval`) | Duyệt gate; `spec_approval` ghim lệnh verification |
| `reject <workItemId>` | `--gate <gate>` (bắt buộc) | Từ chối gate; review reject bắn loopback tất định |
| `events [streamId]` | — | Truy vấn audit trên append-only event log |

### Feature & work item

| Lệnh | Tham số | Việc |
|---|---|---|
| `feature create` | — | Tạo feature; in `featureId` |
| `import <featureId> <path>` | — | Nhập một `stories.yaml` vào feature (idempotent) |
| `item create` | `--feature` `--key` `--title` (bắt buộc) · `--kind` · `--spec-checkpoint` · `--done-checkpoint` · `--invoke-dev-with` · `--depends-on` (lặp lại) | Tạo một work item; `--kind` chọn evidence guard |
| `doclint <file>` | `--require-section <name>` (lặp lại) · `--work-item <id>` · `--submit` · `--fencing-token <n>` | Lint tài liệu tất định; `--submit` gửi bằng chứng `doc_lint`; exit 1 khi chưa schema-valid |

### Actors, quyền, entitlements

| Lệnh | Tham số | Việc |
|---|---|---|
| `actor create` | `--type <user\|agent>` `--name` (bắt buộc) · `--governance-role` | Tạo actor; in `actorId` + token (admin) |
| `actors` | — | Liệt kê MỌI actor (người, agent, persona, hệ thống) |
| `personas provision` | — | Provision idempotent 6 persona BMAD (governance-admin) |
| `grant <actorId> <permission>` | — | Cấp một permission cho actor (admin) |
| `role assign <actorId> <roleCode>` | — | Gán delivery role (governance-admin) |
| `role revoke <actorId> <roleCode>` | — | Thu hồi delivery role (governance-admin) |
| `role list [actorId]` | — | Liệt kê gán delivery role |
| `plan set <plan>` | — | Đặt plan workspace: `free\|team\|enterprise` (một trần) |
| `policy set` | `--agent-gate-approvals <bool>` · `--agent-self-dispatch <bool>` | Đặt policy restrict-only |
| `gate-policy set <gate>` | `--min-approvals <n>` · `--require-type <type>` (lặp lại) | Đặt quorum / yêu cầu loại actor của gate |
| `governance set <actorId> <role>` | — | Đặt governance role: `admin\|member\|auditor` |
| `authz <actorId> <permission>` | — | In trace quyết định quyền (phát lại được) |

### Cộng tác

| Lệnh | Tham số | Việc |
|---|---|---|
| `thread create` | `--kind <kind>` (bắt buộc) · `--feature` · `--work-item` · `--visibility <open\|private>` | Tạo thread |
| `thread list` | `--feature` · `--work-item` | Liệt kê thread (private chỉ khi bạn tham gia) |
| `post <threadId> <body>` | `--mention <actorId>` (lặp lại) · `--reply-to <messageId>` | Đăng tin nhắn; mention là actorId có cấu trúc |
| `messages <threadId>` | `--since <seq>` | Liệt kê tin nhắn (kèm system narration) |
| `notifications` | `--unread` | Thông báo của bạn (mention + hoàn tất agent-job) |
| `jobs` | `--agent <actorId>` · `--status <queued\|done\|blocked>` | Liệt kê agent job |
| `job done <jobId>` | `--note <note>` | Hoàn tất job (chỉ agent của job); báo người mention |
| `advise next-task` | `--thread <threadId>` (bắt buộc) | Đăng thứ tự claim gợi ý vào thread |
| `advise reconcile` | `--thread <threadId>` (bắt buộc) · `--file <wi>=<status>` (lặp lại, bắt buộc) | Đăng báo cáo lệch file↔DB (detect-only) |

### Teammate, memory, metrics

| Lệnh | Tham số | Việc |
|---|---|---|
| `work` | `--agent-cmd <template>` (bắt buộc) · `--jobs` · `--repo` · `--spec-folder` · `--once` · `--poll <ms>` | Chạy runner: coding (`--repo`+`--spec-folder`) hoặc teammate jobs (`--jobs`) |
| `memory` | `--kind <episodic\|procedural\|entity>` · `--query <text>` · `--context <threadId>` | Ký ức của CHÍNH bạn (owner-scoped by construction) |
| `stats reviews` | — | Vòng lặp review theo kind + theo item (thước đo cải thiện) |

### Model gateway (client tầng runtime, không phải spine)

| Lệnh | Tham số | Việc |
|---|---|---|
| `models` | — | Liệt kê model mà gateway cấu hình có thể tới |
| `ping` | `--message <text>` · `--route <route>` · `--model <id>` | Gửi một prompt qua gateway; in reply + token usage |
| `brain` | `--context-file <path>` · `--reply-file <path>` · `--route <route>` | Brain teammate: đọc context → gateway → viết reply (agent-cmd cho `work --jobs`) |

> `models` / `ping` / `brain` đọc cấu hình từ `OAHS_MODEL_*`, **không** chạm client spine.

## Endpoints HTTP / MCP / SSE

| Method · Path | Auth | Mô tả |
|---|---|---|
| `POST /rpc/<command>` | Bearer | Command bus. Body JSON. `<command>` là tên trong registry contracts. |
| `POST /mcp` | Bearer | MCP stateless (StreamableHTTP). Mỗi command là tool `oahs_*`, cùng handler với `/rpc`. |
| `GET /events/stream` | Bearer | SSE relay của event log. Resume qua header `Last-Event-ID` hoặc `?since=<seq>`. |
| `GET /healthz` | — | Health check → `{ "ok": true }`. |
| `GET /ui` | — | Web console tĩnh (đăng nhập trong app bằng token). |

### Định dạng phản hồi (envelope)

```jsonc
// thành công
{ "ok": true, "result": { /* … */ } }

// lỗi (HTTP status ánh xạ theo loại lỗi)
{ "ok": false, "error": { "name": "PermissionDeniedError", "message": "…" } }
```

Tên lỗi: `PermissionDeniedError` · `ConflictError` · `GuardFailedError` ·
`InvalidTransitionError` · `StoriesValidationError` · `Error`. Ngoài ra: `401` khi thiếu/
sai bearer token, `404` khi command không tồn tại.

### Tên command RPC

CLI dùng tên thân thiện; qua `/rpc` chúng là các command trong registry (snake_case). Ví
dụ đã dùng trong [tools/oahs-bootstrap.sh](../../tools/oahs-bootstrap.sh):
`whoami`, `grant_permission`, `create_feature`, `create_work_item`, `provision_personas`;
UI dùng `approve_gate` / `reject_gate`. Danh sách đầy đủ nằm trong
[packages/contracts/src/index.ts](../../packages/contracts/src/index.ts).

## Enum & vocabulary

Nguồn: [apps/spine-api/ui-src/core/vocab.ts](../../apps/spine-api/ui-src/core/vocab.ts)
(server vẫn là chân lý và từ chối giá trị cũ).

| Nhóm | Giá trị |
|---|---|
| **Work item states** | `backlog` · `draft` · `ready_for_dev` · `in_progress` · `in_review` · `done` |
| **Work item kinds** | `code` · `spec_draft` · `design_review` · `qa_report` · `doc` |
| **Blocked reasons** | `unclear_intent` · `no_stories_yaml_found` · `ambiguous_story_file_match` · `review_non_convergence` · `no_subagents` · `dirty_tree` · `stale_worktree` · `awaiting_human_input` · `other` |
| **Delivery roles** | `product_owner` · `tech_lead` · `reviewer` · `developer` · `qa` · `contributor` |
| **Plans** | `free` · `team` · `enterprise` |
| **Governance roles** | `admin` · `member` · `auditor` |
| **Gates** | `spec_approval` · `review_approval` |
| **Actor types** | `user` · `agent` |
| **Memory kinds** | `episodic` · `procedural` · `entity` |

### Permissions

`task.plan` · `task.claim` · `task.advance` · `task.block` · `gate.spec.approve` ·
`gate.review.approve` · `gate.review.reject` · `feature.init` · `feature.advance` ·
`dispatch.release_hold` · `intent.edit` · `state.downgrade` · `ops.force_release_claim` ·
`governance.admin` · `thread.post` · `thread.read` · `thread.invite` ·
`agent_job.complete`

## Biến môi trường

| Biến | Đọc bởi | Ý nghĩa |
|---|---|---|
| `OAHS_ADMIN_TOKEN` | `serve` / docker | Token admin bootstrap. Bỏ trống → sinh ngẫu nhiên, in ra khi khởi động. |
| `OAHS_TOKEN` | Lệnh CLI client | Bearer token của actor đang thao tác. |
| `OAHS_PORT` | `make serve` / docker | Cổng HTTP. |
| `OAHS_MODEL_BASE_URL` | gateway | Endpoint router tương thích OpenAI. |
| `OAHS_MODEL_API_KEY` | gateway | API key router (giữ trong `.env` gitignore). |
| `OAHS_MODEL_DEFAULT` | gateway | Model id mặc định. |
| `OAHS_CONTEXT_FILE` | `oahs brain` | Đường dẫn file context `{ job, messages, memories }` (runtime jobs đặt). |
| `OAHS_REPLY_FILE` | `oahs brain` | Đường dẫn file để brain ghi trả lời. |

Placeholder trong `--agent-cmd` của `oahs work`:

- Chế độ coding: `{SPEC_FOLDER}` `{STORY_ID}` `{INVOKE_WITH}` `{WORKTREE}`.
- Chế độ `--jobs`: `{CONTEXT_FILE}` `{REPLY_FILE}` `{THREAD_ID}` `{JOB_ID}`.

## Định dạng `stories.yaml`

Một danh sách YAML ở cấp cao nhất; mỗi entry là một work item. Nguồn parse:
[packages/core/src/stories.ts](../../packages/core/src/stories.ts); đặc tả đầy đủ:
[src/core-skills/bmad-spec/assets/stories-schema.md](../../src/core-skills/bmad-spec/assets/stories-schema.md).
Mẫu thật: [delivery/phase-1-spine-mvp/stories.yaml](../../delivery/phase-1-spine-mvp/stories.yaml).

| Field | Bắt buộc | Ghi chú |
|---|---|---|
| `id` | có | Chuỗi YAML **có nháy** (`id: "1"`); chỉ chữ, số, dấu gạch. Không trùng, prefix-free theo quy ước `<id>-`. |
| `title` | có | Không rỗng. |
| `description` | có | Không rỗng. |
| `spec_checkpoint` | không | `true` → yêu cầu `spec_approval` trước `ready_for_dev`. |
| `done_checkpoint` | không | `true` → giữ dispatch feature sau khi item này done. |
| `invoke_dev_with` | không | Gợi ý lời gọi agent. |

> **Không có field `status`, không bao giờ** — trạng thái do FSM giữ, không do file mô tả.
> (Phụ thuộc giữa item được đặt qua `oahs item create --depends-on`, không qua `stories.yaml`.)

```yaml
- id: "1"
  title: FSM transition engine passing the transitions conformance tests
  description: >-
    Implement the versioned transition table and advanceState in @oahs/core.
  spec_checkpoint: true
  invoke_dev_with: >-
    Engine is pure in-memory TypeScript; do not modify test files.

- id: "2"
  title: Claim protocol with lease and fencing tokens
  description: >-
    Single live claim per work item, TTL lease with heartbeat, monotonic
    fencing token required on every worker mutation.
```

---

[← Hướng dẫn sử dụng](02-huong-dan-su-dung.md) · [← Tổng quan](00-tong-quan.md) ·
[Bản tóm tắt kỹ thuật (OAHS.md) →](../../OAHS.md)
