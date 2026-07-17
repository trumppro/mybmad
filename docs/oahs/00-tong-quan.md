# Tổng quan & khái niệm cốt lõi

Tài liệu này giải thích **oahs là gì**, triết lý đứng sau, kiến trúc tổng thể và
toàn bộ khái niệm bạn sẽ gặp khi dùng/vận hành nền tảng. Đọc phần này trước khi
sang [Cài đặt & vận hành](01-cai-dat-va-van-hanh.md) hay
[Hướng dẫn sử dụng](02-huong-dan-su-dung.md).

> Tài liệu nền tảng: [product-thesis.md](../../product-thesis.md) (triết lý),
> [product-roadmap.md](../../product-roadmap.md) (lộ trình), và
> [OAHS.md](../../OAHS.md) (bản tóm tắt kỹ thuật ở gốc repo). Bộ `docs/oahs/`
> mở rộng chứ không thay thế các file đó.

## oahs là gì

**oahs — Open Agents Harness System** là một *agent-native delivery system*: một
đội ngũ phát triển phần mềm mà thành viên **vừa là người vừa là AI agent**, cùng
làm việc trên một *deterministic spine* (bộ khung xử lý tất định).

Người và agent dùng chung threads, đi qua cùng các *gate* (cổng duyệt), và thay
đổi trạng thái qua cùng một đường ống. Điểm mấu chốt tạo nên giá trị doanh nghiệp:
**mọi thay đổi trạng thái đều đi qua luật tất định, không bao giờ qua hội thoại
của LLM.**

Câu định vị một dòng, đúng cả về kỹ thuật lẫn marketing:

> **AI làm việc, luật chạy quy trình, actor có quyền giữ các gate.**
> *(AI does the work, rules run the process, permissioned actors hold the gates.)*

### Điều oahs KHÔNG làm

oahs **không** để một LLM *diễn giải* luật của quy trình phát triển (SDLC) tại thời
điểm chạy. Một agent có thể *làm việc bên trong* một task (viết code, soạn PRD, review
PR…), nhưng nó không bao giờ tự "quyết định" rằng một task được phép chuyển trạng thái
— việc đó do luật tất định kiểm tra, và do *actor được cấp quyền* bấm nút.

Đây là ranh giới sống còn: một agent *được cấp quyền* đi qua gate thông qua phép kiểm
tra tất định là **hợp lệ**; một LLM *diễn giải* xem gate có nên mở hay không là **cái
bẫy** mà nền tảng cố tình chặn (xem [product-thesis.md](../../product-thesis.md)).

## Triết lý: bốn lớp

Sản phẩm là một hệ thống phân lớp. Mỗi lớp có nguyên tắc vận hành và nhịp thay đổi
khác nhau — nhầm lẫn giữa chúng là sai lầm kiến trúc phổ biến nhất.

| Lớp | Là gì | Nguyên tắc |
|---|---|---|
| **Rules** (Luật) | FSM vòng đời, chuyển trạng thái, gỡ phụ thuộc, giao thức claim, ngữ nghĩa gate | Code tất định. Không có LLM. Chỉ đổi qua feature có phiên bản, không đổi lúc chạy. |
| **Skills** (Kỹ năng) | `start-implementation`, `approve-feature`, `respond-to-review`… | Thủ tục, script hoá, side-effect rõ ràng. Skill *thực thi* luật, không thương lượng luật. |
| **Agents** (Tác nhân) | Phiên Claude Code trong executor; agent review; agent design tương lai | Worker phi tất định. Mỗi agent bó vào một task. Đọc tự do; chỉ ghi qua skill/tool. |
| **Humans / Actors** | Product owner, tech lead, reviewer | Người giữ gate *mặc định*. Nếu tổ chức cấp cho một agent delivery role, agent đó giữ gate qua **cùng** phép kiểm tra tất định. |

**Rules là code. Skills là công cụ. Agents là worker. Actor-có-quyền giữ gate.**
Cả bốn lớp cùng tồn tại; không lớp nào thay thế lớp nào.

- Không được agentify: vòng đời, gate, claim, phụ thuộc, phạm vi file, kỷ luật branch.
  Đây là *spine*.
- Nên agentify mạnh tay: mọi thứ xảy ra *bên trong* một task — code, design, review, QA,
  soạn tài liệu. Đây là *phần cơ bắp*.

## Kiến trúc: monorepo TypeScript

Ngăn xếp: TypeScript, Fastify, Postgres 16 (Drizzle ORM), zod, pnpm workspace. Node 22
(xem [.nvmrc](../../.nvmrc)).

| Đường dẫn | Vai trò |
|---|---|
| [`packages/core`](../../packages/core) | Lớp **Rules dưới dạng code**: FSM vòng đời, claims (lease + fencing), gates, verdict bằng chứng, event log, reconciler. Bộ conformance trong `test/` **chính là đặc tả**. Không được import bất kỳ SDK LLM nào ở đây. |
| [`packages/contracts`](../../packages/contracts) | Một zod registry = mọi command. HTTP routes, MCP tools và typed client đều **sinh ra từ đây** — "MCP ≡ HTTP" là cấu trúc, không phải trùng lặp. |
| [`packages/db`](../../packages/db) | Drizzle schema + `PgEngine` bất đồng bộ. Một facade synckit + PGlite chạy **nguyên vẹn** bộ conformance của core trên ngữ nghĩa Postgres thật. |
| [`apps/spine-api`](../../apps/spine-api) | Fastify: `POST /rpc/<command>` + MCP tại `/mcp`, cùng một command bus phía sau. Auth bearer-token theo actor. Phục vụ web console tại `/ui`. |
| [`apps/oahs`](../../apps/oahs) | Binary `oahs`: `serve` + các lệnh giữ gate (`inbox`, `approve`, `reject`, `advance`, `status`, `events`), admin (`actor`, `grant`, `feature`, `import`) và `work` (runner). |
| [`packages/runner`](../../packages/runner) | Vòng lặp worker BYO: claim → worktree đặt tên theo claim → mirror-on-dispatch → gọi coding agent → phân tích HALT → verification đã pin (allowlist) → push → nộp bằng chứng thô. Runner *đo*; core *phán xử*. |
| [`packages/gateway`](../../packages/gateway) | Model gateway ở **tầng runtime** — nói giao thức tương thích OpenAI, định tuyến tên model, đo token. **Spine không bao giờ import gói này** (bất biến kiểm bằng CI). |
| [`delivery/`](../../delivery) | Backlog của chính nền tảng: các thư mục feature kèm `stories.yaml`. |
| [`src/`](../../src) | Nội dung BMAD (skills, personas) — lớp **playbook** cho worker, giữ nguyên trạng. |

## Một command bus duy nhất

Mọi thay đổi trạng thái đi qua **một** command bus. Ba mặt tiền, cùng handler:

```text
CLI (oahs …)  ─┐
Web UI (/ui)  ─┤→  POST /rpc/<command>  ─┐
Runner        ─┘                         ├→  command bus  →  engine (Rules) → event log
MCP client    ──→  POST /mcp (oahs_*)   ─┘
```

- **HTTP**: `POST /rpc/<command>` với body JSON. Trả `{ "ok": true, "result": … }`
  hoặc `{ "ok": false, "error": { "name", "message" } }`.
- **MCP**: mỗi command cũng là một MCP tool tên `oahs_*` tại `POST /mcp` — trỏ Claude
  Code vào đó và "hỏi tiến độ sprint" qua **đúng** đường ống đó.
- **Auth**: header `Authorization: Bearer <token>`; token map về một actor. Không có
  đường ghi nào nằm ngoài bus này.

Hệ quả — các *bất biến* của spine, được thực thi bằng những cách KHÁC nhau: không SDK LLM
trong spine (grep trong CI) và `@oahs/gateway` không bị spine import (grep trong CI) là hai
tính chất được MÁY kiểm; không ghi ngoài command bus là bất biến giữ bằng KIẾN TRÚC (chỉ một
command bus, không có đường ghi thứ hai) chứ không có lint nào quét; còn bằng chứng được *đo*
/ verdict được *tính*, reconcile chỉ phát hiện, và chat không đổi vòng đời được khoá bằng bộ
test conformance.

## Khái niệm cốt lõi

### Work item và `kind`

Đơn vị công việc. Mỗi work item có một **`kind`** quyết định *loại bằng chứng máy* nào
áp dụng — **không** quyết định ai được duyệt gate:

`code` · `spec_draft` · `design_review` · `qa_report` · `doc`

Ví dụ: `kind = doc` được duyệt dựa trên *document lint* thay vì diff, và gate "done" của
nó không đòi commit — hoàn thành là bằng chứng doc kiểm-được-bằng-máy cộng quyết định
hợp lệ.

### Vòng đời (FSM) và trạng thái

Trạng thái tiến theo một máy trạng thái tất định:

```text
backlog → draft → ready_for_dev → in_progress → in_review → done
```

- **Never-downgrade**: không tự tụt trạng thái (trừ downgrade có đặc quyền).
- **blocked là overlay**, không phải một state: work item bị chặn mang thêm cột
  `blocked_reason` (ví dụ `awaiting_human_input`, `review_non_convergence`,
  `dirty_tree`…) mà không đổi state gốc.

### Gates (cổng duyệt)

Hai gate, là điểm con người/actor-có-quyền quyết định:

- **`spec_approval`**: duyệt spec *và* **pin** (ghim) các lệnh verification vào work item.
  Từ đó về sau, đây là các lệnh duy nhất được chạy để lấy bằng chứng. *Một lệnh do LLM tự
  soạn không bao giờ là guard.*
- **`review_approval`**: gate "done". Guard tất định: các lệnh đã pin phải exit 0, diff
  không rỗng, và commit đã có trên remote.

### Claims và fencing token

Để một worker làm việc trên một task, nó phải **claim** task đó: một live claim duy nhất
mỗi work item, lease có TTL + heartbeat, và một **fencing token** đơn điệu bắt buộc trên
mọi thao tác ghi của worker. Đua tranh (race) *thua bằng cấu trúc* (ràng buộc DB), không
phải bằng kiểm tra best-effort.

### Threads, messages, mentions

Lớp cộng tác (Phase 3):

- **Thread**: một phiên hội thoại, `kind` ∈ `spec | design | task | general | private`,
  có thể gắn với một feature hoặc work item.
- **Message**: tác giả là *user hoặc agent*. Server **không bao giờ parse text** để tìm
  mention.
- **Mention**: là **actor id có cấu trúc**, không phải chuỗi `@ai` trong body. Bộ **mention
  router** mặc định từ chối (default-deny) và cấp quyền dựa trên *actor gây ra thay đổi*.
- **Ranh giới thiêng**: chat không bao giờ làm đổi vòng đời. Chiều duy nhất được phép là
  *rails → chat*: hệ thống tự thuật lại (system narration) mỗi thay đổi trạng thái vào các
  task thread liên quan.

### Agent jobs

Khi một agent được `@mention`, mention router *materialize* một **job**. Job là **ngữ cảnh
chỉ-để-trả-lời (reply-only)**: nó không tự phát một claim, và chỉ agent của job mới được
hoàn tất job đó. Trả lời của agent đi qua rails; hoàn tất job sẽ báo cho người đã mention —
không có gì khác trong vòng đời dịch chuyển.

### Actors, roles, entitlements

- **Actor**: `user` hoặc `agent`. Mỗi actor có token riêng.
- **Grant**: quyền hạt mịn cấp trực tiếp cho actor (ví dụ `task.claim`, `gate.review.approve`).
- **Delivery role**: bó quyền theo vai trò — `product_owner`, `tech_lead`, `reviewer`,
  `developer`, `qa`, `contributor`.
- **Governance role**: `admin | member | auditor` — ai được thực hiện *ghi entitlement*.
- **Plan**: `free | team | enterprise` — một **trần** cho việc cấp gate cho agent, *không
  bao giờ tự nó là một grant*.
- **Policy** (restrict-only): chỉ thu hẹp trần, không nới rộng.
- **Gate-policy**: định nghĩa gate dưới dạng dữ liệu — quorum (`min-approvals`), yêu cầu loại
  actor (`require-type user`).

Quyền thực tế = **plan × governance role × delivery role**, giải bằng một hàm thuần tuý.
Lệnh `oahs authz <actor> <permission>` in ra *dấu vết quyết định phát lại được*
(ALLOWED/DENIED + nguồn + trace).

### Agent memory (teammate biết học)

Teammate (Phase 5) có **bộ nhớ phạm vi workspace** do nền tảng quản lý:
`episodic | procedural | entity`. Bảo đảm kiến trúc (không phải prompt):

- **Owner-scoped by construction**: API bộ nhớ không có tham số cross-actor — bạn chỉ đọc
  ký ức của chính token mình.
- **Visibility-filtered**: ký ức có nguồn private chỉ hiện trong đúng thread nguồn.
- **Event bộ nhớ không mang nội dung**: học riêng tư nằm ngoài audit log dùng chung.
- **Học ≠ quyền**: một agent giàu ký ức không giàu thêm một grant nào. Quyền chỉ đến từ
  grant tường minh.

### Model gateway

`@oahs/gateway` ngồi giữa các agent runtime và nhà cung cấp model, nói giao thức tương
thích OpenAI (hoạt động với 9router, OpenRouter, hay bất kỳ endpoint tương thích nào),
định tuyến tên thân thiện → model id, và đo token. Nó ở **tầng runtime**: spine tất định
không bao giờ là client của nó. Cấu hình đến từ biến môi trường, không hardcode.

---

Tiếp theo:
[Cài đặt & vận hành →](01-cai-dat-va-van-hanh.md) ·
[Hướng dẫn sử dụng →](02-huong-dan-su-dung.md) ·
[Tham chiếu →](03-tham-chieu.md)
