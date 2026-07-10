# Hướng dẫn sử dụng

Cách *dùng* oahs để chạy quy trình delivery: qua **web console** và qua **CLI**. Giả
định bạn đã có một spine đang chạy (xem [Cài đặt & vận hành](01-cai-dat-va-van-hanh.md))
và biết các khái niệm trong [Tổng quan](00-tong-quan.md).

## Chuẩn bị CLI

Sau `make build`, binary nằm ở `apps/oahs/bin/oahs.mjs`. Trong tài liệu, `oahs` nghĩa là
binary đó — bạn có thể tạo alias cho gọn:

```bash
alias oahs='node /đường/dẫn/mybmad/apps/oahs/bin/oahs.mjs'
```

Hai điều mọi lệnh client cần biết:

- **Token**: đặt `export OAHS_TOKEN=<token-của-actor>` (hoặc truyền `--token`). Mỗi actor
  có token riêng; token quyết định bạn *là ai* và *được làm gì*.
- **URL**: mặc định CLI trỏ `http://localhost:4521` (cổng đã thống nhất mọi nơi từ
  Phase 7 Wave 1). Server ở nơi khác? Đặt một lần `export OAHS_URL=http://host:port`
  — mọi lệnh tự dùng, khỏi truyền `--url` từng lệnh.

```bash
export OAHS_TOKEN=change-me         # admin token bootstrap
oahs status --url http://localhost:4521
```

## Web console (`/ui`)

Mở `http://<host>:<cổng>/ui`. Màn hình đăng nhập yêu cầu **Server URL** + **API token**;
`whoami` sẽ phân giải actor và biết bạn có phải admin không (trang admin-only ẩn với
non-admin, server vẫn luôn enforce). Thông tin lưu ở localStorage nên tải lại là tự kết nối.

Thanh điều hướng gồm **8 trang** (nguồn: [apps/spine-api/ui-src/app.ts](../../apps/spine-api/ui-src/app.ts)):

| Trang | Bạn làm gì ở đây |
|---|---|
| **Chat** | Trang chủ. Threads + tin nhắn trực tiếp qua SSE; composer với mention có cấu trúc. Trên các *task thread*, quyết định gate hiện thành nút **Approve/Reject** gọi thẳng `/rpc` (gate đi qua rails, không qua chat). |
| **Work items** | Danh sách work item theo trạng thái; xem chi tiết một item. |
| **Features** | Danh sách feature và dispatch hold. |
| **Claims** | Các claim đang sống (worker nào đang giữ task nào). |
| **Audit events** | Truy vấn append-only event log — ai, dưới grant nào, trên bằng chứng gì. |
| **Entitlements** *(admin)* | Roles, plan, policy, gate-policy, governance. |
| **Actors** *(admin)* | Toàn bộ actor: người, agent, persona, actor hệ thống. |
| **Insights** | Số liệu delivery (ví dụ vòng lặp review theo kind). |

> Mọi thao tác trên `/ui` là `fetch POST /rpc/<command>` — **đúng** đường ống mà CLI và
> agent dùng. Không có logic đường tắt riêng cho UI.

## Bootstrap workspace (admin)

Dùng admin token. Tạo actor, cấp quyền tường minh — **không actor nào giữ một gate nó
chưa được cấp**.

```bash
export OAHS_TOKEN=<admin-token>

# 1) Tạo actor — in ra actorId + token của actor đó
oahs actor create --type user  --name "PO"
oahs actor create --type agent --name "Dev agent"

# 2a) Cấp quyền hạt mịn (grant trực tiếp)
oahs grant <po>  task.plan
oahs grant <po>  gate.spec.approve
oahs grant <po>  gate.review.approve
oahs grant <po>  feature.init
oahs grant <dev> task.claim
oahs grant <dev> task.advance
oahs grant <dev> task.block

# 2b) …hoặc cấp theo BÓ bằng delivery role
oahs role assign <po>  product_owner
oahs role assign <dev> developer
```

### Entitlements nâng cao (admin quản trị)

```bash
oahs governance set <actorId> admin        # ai được thực hiện ghi entitlement
oahs plan set team                          # TRẦN cho việc cấp gate cho agent — không tự là grant
oahs policy set --agent-gate-approvals false   # restrict-only: chỉ thu hẹp, không nới
oahs gate-policy set review_approval --min-approvals 2 --require-type user
                                            # quorum + bắt buộc có người, dưới dạng DỮ LIỆU
oahs authz <actorId> gate.review.approve    # in trace ALLOWED/DENIED + nguồn + version
```

`oahs authz` là công cụ kiểm tra quyền *phát lại được*: nó cho biết vì sao một actor được
(hoặc bị từ chối) một permission, kèm nguồn và trace.

## Vòng đời một công việc (end-to-end)

Kịch bản chuẩn: PO lập kế hoạch và giữ gate, agent/dev làm việc.

```bash
# --- PO (token PO) ---
oahs feature create                         # in ra featureId
oahs import <featureId> delivery/phase-1-spine-mvp/stories.yaml   # nhập backlog (idempotent)
# hoặc tạo lẻ một work item với kind tuỳ chọn:
oahs item create --feature <fid> --key prd-1 --kind spec_draft --title "PRD: rate limits"

oahs advance <storyId> --to draft           # đưa item vào vùng planning
oahs inbox                                  # xem item đang chờ quyết định gate
oahs approve <storyId> --gate spec_approval --pin "pnpm -C packages/core test"
                                            # duyệt spec VÀ ghim lệnh verification (D7)

# --- Dev/agent (token dev) ---
# claim + làm việc thường do runner tự động (xem "Runner coding" bên dưới),
# hoặc thủ công qua advance khi phù hợp.

# --- PO review gate ---
oahs inbox
oahs approve <storyId> --gate review_approval
      # CHỈ pass nếu: lệnh đã pin exit 0, diff không rỗng, commit đã có trên remote
oahs events <workItemId>                    # audit: ai/dưới grant nào/trên bằng chứng gì
oahs status                                 # toàn bộ item theo trạng thái + dispatch hold
```

Từ vựng `--gate`: `spec_approval` | `review_approval`. Muốn *từ chối*:

```bash
oahs reject <storyId> --gate review_approval   # bắn loopback tất định (quay lại vòng review)
```

## Cộng tác: threads, mentions, jobs

Chat không bao giờ đổi vòng đời. Đây là nơi người và agent bàn việc; thay đổi trạng thái
vẫn qua gate.

```bash
oahs thread create --kind task --work-item <id> --feature <fid>   # in ra threadId
oahs post <threadId> "nhờ bạn nhận việc này" --mention <agentActorId>
        # mention là actorId CÓ CẤU TRÚC — body không bao giờ bị parse
oahs messages <threadId>          # system narration (kind=system) hiện xen kẽ
oahs jobs --status queued         # job mà mention router đã materialize
oahs job done <jobId>             # chỉ agent của job mới hoàn tất; người mention được báo
oahs notifications --unread       # mention + hoàn tất agent-job của chính bạn
```

Kind của thread: `spec | design | task | general | private`. Thread `private` chỉ người
tham gia mới thấy.

### Advisor bots (đọc + đăng, không phải mutation)

Bot tất định, chỉ *đọc và đăng vào thread* — audit của chúng có **0 gate**:

```bash
oahs advise next-task --thread <id>                       # gợi ý thứ tự claim (ready_for_dev)
oahs advise reconcile --thread <id> --file <wi>=<status>  # báo cáo lệch file↔DB (detect-only)
```

## Teammate không-code & personas

Work item mang **`kind`** để chọn *loại bằng chứng máy* — không đổi ai được duyệt gate.
Kind `doc`/`spec_draft`/… được duyệt bằng **document lint** thay vì diff.

`oahs personas provision` tạo 6 persona BMAD dưới dạng agent actor: **Mary** (Analyst),
**John** (PM), **Winston** (Architect), **Sally** (UX), **Amelia** (Dev), **Paige**
(Tech Writer). Floor-state: Amelia giữ `developer`, còn lại `contributor`, **không ai
giữ gate** cho tới khi được cấp tường minh.

```bash
oahs personas provision      # 6 persona BMAD thành agent actor — floor-state:
                             # Amelia giữ developer, còn lại contributor, KHÔNG ai giữ gate
oahs actors                  # liệt kê tất cả actor, kèm personaCode

oahs item create --feature <fid> --key prd-change-1 --kind spec_draft \
  --title "PRD change: rate limits"

# Lint tài liệu tất định (không LLM). --submit gửi bằng chứng doc_lint qua rails:
oahs doclint draft.md --require-section Intent --require-section Rollout \
  --work-item prd-change-1 --submit
```

`doclint` quét frontmatter, các `## section` bắt buộc, và placeholder; exit 1 khi chưa
schema-valid. Đây là *công cụ đo tất định*, không phải checklist do LLM tick.

## Learning teammate (brain thật)

Teammate runtime poll các agent job (do mention router materialize) và trả lời qua rails,
với bộ nhớ phạm vi workspace do nền tảng quản lý. **Brain là pluggable** qua `--agent-cmd`.

```bash
# Brain thật dùng model gateway (đọc job context → gateway → viết reply):
OAHS_TOKEN=<agent-token> oahs work --jobs \
  --agent-cmd "node $(pwd)/apps/oahs/bin/oahs-brain.mjs"

# Hoặc brain của bạn / Hermes:
OAHS_TOKEN=<agent-token> oahs work --jobs --agent-cmd 'node my-teammate.mjs'
```

Cơ chế `--jobs`: runtime ghi một *context file* `{ job, messages, memories }` ra
`OAHS_CONTEXT_FILE`, gọi `--agent-cmd`, đọc trả lời từ `OAHS_REPLY_FILE`, đăng qua rails,
hoàn tất job và ghi một ký ức *episodic*. Nó **không gọi bất kỳ lệnh lifecycle nào** —
guardrail kiểm bằng audit (0 gate).

Xem/đo:

```bash
oahs memory --query "verification"   # CHỈ ký ức của token này (không có tham số cross-actor)
oahs memory --kind episodic
oahs stats reviews                   # số vòng review theo kind — thước đo "cải thiện theo tuần"
```

> **Guardrail (kiến trúc, không phải prompt):** API bộ nhớ không có đường tới grant; một
> agent giàu ký ức không giàu thêm một quyền nào; event bộ nhớ không mang nội dung. *Học
> làm worker giỏi hơn, không làm nó có thêm quyền.*

## Runner coding (BYO máy dev)

Với work item kind `code`, worker chạy vòng lặp: claim → worktree đặt tên theo claim →
mirror → gọi coding agent → phân tích HALT → verification đã pin (allowlist) → push → nộp
bằng chứng thô.

```bash
OAHS_TOKEN=<dev-agent-token> oahs work \
  --repo /đường/tới/project-đích \
  --spec-folder delivery/phase-1-spine-mvp \
  --agent-cmd 'claude -p "Use the bmad-dev-auto skill. spec_folder: {SPEC_FOLDER}  story_id: {STORY_ID}  {INVOKE_WITH}" --permission-mode acceptEdits'
```

Placeholder trong `--agent-cmd` (chế độ coding): `{SPEC_FOLDER}` `{STORY_ID}`
`{INVOKE_WITH}` `{WORKTREE}`. Cờ hữu ích: `--once` (chạy đúng một chu kỳ rồi thoát),
`--poll <ms>` (nhịp poll).

Đẩy commit lên remote là một phần của hợp đồng HALT — gate "done" có guard
`final_revision_reachable_on_remote`. Runner *đo*, core *phán xử* verdict.

## MCP cho Claude Code (agent-native)

Mọi command cũng là một MCP tool `oahs_*` tại `POST /mcp`. Trỏ Claude Code (hoặc client
MCP bất kỳ) vào endpoint đó với một agent bearer token, rồi "hỏi tiến độ sprint" hay thao
tác — **qua đúng** đường ống rails, cùng phép kiểm tra quyền, không có đường tắt. "MCP ≡
HTTP" là cấu trúc: cùng một handler phía sau.

---

Tiếp theo: [Tham chiếu (CLI, API, biến môi trường) →](03-tham-chieu.md) ·
[← Cài đặt & vận hành](01-cai-dat-va-van-hanh.md)
