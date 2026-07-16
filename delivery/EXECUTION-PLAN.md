# OAHS — Kế hoạch thực thi phase 8→12 (EXECUTION-PLAN)

> Tổng hợp từ một workflow 7-agent (5 agent phân rã per-phase **grounded vào code thật** → tổng hợp → **critic đối kháng**), 2026-07. Critic ra verdict REVISE với 3 fix; **cả 3 đã áp dụng** vào bản này (đánh dấu **✎ critic-fix** tại chỗ):
> 1. Thêm `pnpm -C packages/db test` vào verify của **8.3, 8.5, 9.3, 9.5** — chúng port sang pg-engine và db-suite là **cổng parity duy nhất** (spine-api/runner/parity đều chạy memory engine).
> 2. Bỏ cạnh phụ thuộc giả `12.7 → 12.6`; thêm tiền đề thật: **wire `JsonlMeter` ledger** (hiện chỉ có `InMemoryMeter`) + chỉ định vị trí/transport để product-stack đọc usage của runtime-stack mà không import `@oahs/gateway`.
> 3. Ghi chú merge-order **12.1b trước 12.1c** (cả hai đụng `PersistShape`/`TokenStore`).

## 1. Mở đầu

Tài liệu này biến backlog phase 8–12 (trong `delivery/phase-*/`) thành **một chuỗi PR có thể thực thi tuần tự**, tổng hợp từ năm kế hoạch per-phase. Mỗi story trong `stories.yaml` được chia thành các đơn vị review nhỏ (PR); tổng cộng **40 PR** trên 5 phase. Không có story/PR nào bị bịa thêm ngoài các input.

**Một luật cứng, không ngoại lệ:** mọi story đều đi qua chính vòng dogfood của spine — `import` → **spec gate** (chốt một pin verify) → work → **review gate**. Pin chính là lệnh verify của story (D7): runner chạy nó, core yêu cầu exit 0 trước khi review gate được duyệt. Đây không phải quy ước tùy chọn: đó là cách nền tảng tự chứng minh chính nó.

**Global definition-of-done** trong `delivery/README.md` áp dụng cho **mọi PR**:
- **Conformance-first**: hành vi engine mới bắt đầu bằng test fail trong `packages/core/test/` + một pin trong `packages/core/test/CONFORMANCE.md`; viết engine cho xanh; rồi port sang `packages/db/src/pg-engine.ts` — db vitest chạy lại nguyên vẹn core suite trên PGlite, **parity là bắt buộc**.
- **One command bus**: lệnh mới = một `def(...)` trong `packages/contracts/src/index.ts` + một `case` trong `apps/spine-api/src/bus.ts`; `apps/spine-api/test/parity.test.ts` phải luôn xanh (deep-equal HTTP vs MCP).
- **Không LLM SDK, không `@oahs/gateway`** trong `packages/{core,db,contracts}` hoặc `apps/spine-api` (§0.1) — CI enforce từ 8.1 trở đi.
- **Event cho mọi mutation**, append cùng transaction, có actor + causation; read không bao giờ append.
- **Không marker việc-chưa-xong** (doclint `PLACEHOLDER_RE`); `make check` xanh; docs bị làm cũ được cập nhật trong cùng story.

---

## 2. Đường tới hạn (critical path)

`8.1` là cổng chặn toàn cục — nó dựng CI workflow với hai grep §0.1; mọi assertion boundary của phase 9–12 dựa vào nó. Làm `8.1` **trước tiên**.

```
                            ┌─────────────────────────────────────────────┐
   8.1 (CI greps) ─────────>│  gate MỌI PR còn lại của 8..12               │
                            └─────────────────────────────────────────────┘
PHASE 8  8.1 ─> 8.2 ─> 8.3 ─> 8.4 ─> 8.5        (chỉ hard-dep 8.1; merge theo THỨ TỰ SỐ
              └─────────────────────> 8.6         vì cùng đụng engine.ts/pg-engine.ts/types.ts/bus.ts)

PHASE 9  8.1 ─> 9.1a ─> 9.1b ─> 9.2 ─> 9.7        (9.7 cần 9.1b + 9.2)
         8.1 ─> 9.3   (song song)
         8.1 ─> 9.4   (song song, đụng agent_jobs + claims index)
         8.1 ─> 9.5   (song song, đụng agent_jobs — sắp ALTER sau 9.4)
         8.1 ─> 9.6   (song song, forge.ts NGOÀI spine)

PHASE 10 10.1a ─> 10.1b ─> 10.2 ─> 10.3 ─> 10.4   (CHUỖI; 10.3 cần 8.6; 10.4 đụng push step như 10.3)
   (8.3) ───────────────> 10.5a                    (reaper dùng lại engine.releaseChanged của 8.3)
         10.5b  độc lập; 10.4 độc lập với chuỗi token

PHASE 11 11.3  (dẫn đầu, spine-only, không dep DB driver)
         11.1 ─> 11.2 ─> 11.4b     (11.4b cần 11.1+11.2+11.3+11.4a)
         11.4a  độc lập
         11.5  độc lập ; 11.8a ─> 11.8b ; 11.8a + 11.5 ─> 11.7 ; 11.2 ─> 11.6

PHASE 12 (10.1)─> 12.1a ─> 12.1b
                     └────> 12.1c
   (10.2+11.4) ─> 12.2 ; (11.1) ─> 12.3 ; (8.3) ─> 12.4 ; (8.5) ─> 12.5 ;
   12.6 ─> 12.7 (get_usage) ; 12.6 độc lập
```

**Cross-phase edges quan trọng (đọc kỹ trước khi bắt đầu bất kỳ PR nào ngoài phase 8):**
- `8.1` → mọi thứ (CI grep là deliverable của 8.1; nếu chưa có, các assertion §0.1 của 11.2/11.4b/11.8a/12.7 không có gì để enforce — không để chúng pass như no-op).
- `10.1 → 12.1a` (auth package mở rộng scoped-token mà 10.1 tạo ra).
- `10.2 + 11.4 → 12.2` (compose stacks cần image dispatcher + indexer để compose).
- `11.1 → 12.3` (outbox LISTEN/NOTIFY chỉ chạy trên Postgres thật).
- `8.3 → 10.5a` và `8.3 → 12.4` (reaper và runner registry dùng lại release/heartbeat đã được xác thực).
- `8.5 → 12.5` (webhook egress áp dụng đúng visibility filter của 8.5).
- `8.6 → 10.3` (push-credential isolation xây trên env stripping của 8.6).

**Chạy được SONG SONG:**
- Trong phase 8: 8.2/8.3/8.4/8.5/8.6 độc lập chức năng — review song song, chỉ **merge theo thứ tự số** để tuần tự hóa 4 file dùng chung.
- Trong phase 9: ba track (A: 9.1a→9.1b→9.2→9.7 / B: 9.3, 9.4, 9.5 / C: 9.6) chạy song song sau khi 8.1 xanh.
- Trong phase 10: 10.4 và 10.5b độc lập với chuỗi token 10.1→10.3.
- Trong phase 11: 11.3, 11.1, 11.4a, 11.5, 11.8a khởi động song song ngay sau 8.1.
- Trong phase 12: 12.4 / 12.5 / 12.6 độc lập nhau một khi upstream (8.3 / 8.5) đã xanh.

**Thứ tự build tổng thể vẫn là 8 → 9 → 10 → 11 → 12** (theo `delivery/README.md`), quan trọng nhất vì **phase 9 đổi tên state feature `in_progress` → `executing`**; giữ toàn bộ phase 8 land **trước** phase 9 để 8.x không bị rebase qua migration đổi tên.

---

## 3. Kế hoạch theo phase

### Phase 8 — Hardening & the trust floor

Sáu story defect/enforcement làm cho các lời hứa sẵn có của docs trở thành sự thật, **trước** mọi lớp mới. `8.1` đứng dựng CI (đã xác nhận cả hai grep §0.1 hiện exit 1 sạch, `delivery/` + `docs/oahs/` sạch marker → có thể xanh ngay). Thay đổi hành vi trung tâm là `8.2`: bootstrap admin có governance-role `admin` nhưng **không grant nào**, `requirePermission` không có bypass admin → force_release qua engine sẽ **deny** admin trần; operator phải chạy dưới `tech_lead`.

| PR | Title | Stories | Effort | Depends on | Verify |
|---|---|---|---|---|---|
| **8.1** | Net-new CI workflow with invariant greps + resolve the one live in-code marker | 1 | M | — | `make check` |
| **8.2** | Gate force_release_claim on ops.force_release_claim in the engine (bus stops composing getClaims+releaseClaim) | 2 | M | 8.1 | `pnpm -C packages/core test && pnpm -C packages/db test && pnpm -C apps/spine-api test` |
| **8.3** | Authenticate heartbeat/release_claim (holder OR presented fencing token) and permission-check runner liveness | 3 | L | 8.1 | `pnpm -C packages/core test && pnpm -C packages/db test && pnpm -C packages/runner test` ✎ |
| **8.4** | Audit the credential plane: token.issued / token.reissued events (id + hash prefix, never the token) | 4 | S | 8.1 | `pnpm -C apps/spine-api test` |
| **8.5** | Visibility-filtered event egress: eventsVisibleTo() masks private-thread events (query_events + SSE) | 5 | L | 8.1 | `pnpm -C packages/core test && pnpm -C packages/db test && pnpm -C apps/spine-api test` ✎ |
| **8.6** | Minimal agent child env (allowlist + agentEnv + dispatch vars, opt-in --inherit-env) and Dockerfile 4517→4521 port drift | 6 | M | 8.1 | `pnpm -C packages/runner test` |

> Merge 8.2 → 8.3 → 8.4 → 8.5 theo thứ tự số: cả bốn đụng `engine.ts` + `pg-engine.ts` + `types.ts` (SpineEngine interface) + `bus.ts`. Mỗi method engine mới (`forceReleaseClaim`, `noteTokenEvent`, `eventsVisibleTo`) và mỗi đổi chữ ký (`heartbeat`/`releaseClaim`) phải soi gương ở cả hai engine **và** interface, nếu không typecheck/db vỡ.

### Phase 9 — Feature layer thành FSM gate-fired

Biến lớp feature thành FSM bắn theo gate và bịt ba lỗ concurrency ở lớp task, tất cả tests-first qua pipeline conformance→core→pg-engine→contracts→bus. `9.1a` cô lập riêng rủi ro đổi tên state + data migration. Mọi `def()` mới phải giữ `parity.test.ts` xanh.

| PR | Title | Stories | Effort | Depends on | Verify |
|---|---|---|---|---|---|
| **9.1a** | Rename feature state in_progress→executing + FEATURE_STATES enum + data migration | 1 | M | 8.1 | `pnpm -C packages/core test && pnpm -C packages/db test` |
| **9.1b** | Feature FSM: FEATURE_TRANSITIONS table, design/handoff gates, cancel, In-TDD guard, label map | 1 | L | 9.1a | `pnpm -C packages/core test && pnpm -C packages/db test && pnpm -C apps/spine-api test -t parity` |
| **9.2** | Handoff then done: children_done guard + handoff→done gate + rollup buckets | 2 | M | 9.1b | `pnpm -C packages/core test && pnpm -C packages/db test` |
| **9.3** | Intent hash wired: pin at spec_approval, guard at ready_for_dev→in_progress, intent.edit rebaseline | 3 | M | 8.1 | `pnpm -C packages/core test && pnpm -C packages/db test && pnpm -C packages/runner test && pnpm -C apps/spine-api test -t parity` ✎ |
| **9.4** | Atomic reviewer dispatch: claims.kind + per-(item,kind) unique index, claimReview, autoDispatchReviewer | 4 | L | 8.1 | `pnpm -C packages/core test && pnpm -C packages/db test && pnpm -C apps/spine-api test -t parity` |
| **9.5** | Atomic agent-job claim: claim_agent_job CAS + live-claim index, runner claims before replying | 5 | M | 8.1 | `pnpm -C packages/core test && pnpm -C packages/db test && pnpm -C packages/runner test && pnpm -C apps/spine-api test -t parity` ✎ |
| **9.6** | GitHub PR integration + repo registry: forge.ts client, pr evidence, requireMergedPr gate policy | 6 | L | 8.1 | `pnpm -C packages/runner test && pnpm -C packages/core test` |
| **9.7** | Feature board + workspace (Feature IDE) + ⌘K command palette over COMMANDS | 7 | L | 9.1b, 9.2 | `pnpm -C apps/spine-api test && pnpm -C apps/oahs test` |

> 9.4 và 9.5 cùng ALTER `agent_jobs`; 9.4 cũng đổi unique index của bảng `claims`. Land 9.4 trước 9.5, giữ mọi ALTER idempotent (`ADD COLUMN IF NOT EXISTS` / `CREATE UNIQUE INDEX IF NOT EXISTS`). 9.6 giữ forge fetch **ngoài** `packages/{core,db}` + `apps/spine-api`; `requireMergedPr` là **gate-policy DATA**, không phải guard hardcode (D12).

### Phase 10 — Isolation (thực thi cô lập credential)

Năm story, bảy PR. Chuỗi `10.1→10.2→10.3` chạy **đúng thứ tự** (dispatcher inject token của 10.1, push guard của 10.3). Chỉ đúng **một** PR là conformance-first: `10.5a` (`reapExpiredClaims` là hành vi engine mới) — verify **phải** gồm db suite (parity), điều CHECKLIST 10.5 bỏ sót.

| PR | Title | Stories | Effort | Depends on | Verify |
|---|---|---|---|---|---|
| **10.1a** | Job-bound scoped tokens on the spine (mint_claim_token + bus allowlist) | 1 | M | 8.1 | `pnpm -C apps/spine-api test` |
| **10.1b** | Runner mints and uses the scoped token for dispatch mutations | 1 | S | 10.1a | `pnpm -C packages/runner test` |
| **10.2** | Dispatcher service with container-per-claim (oahs dispatch) | 2 | L | 10.1a, 10.1b | `pnpm -C apps/oahs test` |
| **10.3** | Claim-scoped push credentials (askpass for BYO, dispatcher-push under dispatch) | 3 | M | 10.2, 8.6 | `pnpm -C packages/runner test` |
| **10.4** | Dispatch-start branch push and cross-machine adoption | 4 | M | — | `pnpm -C packages/runner test` |
| **10.5a** | Server-side lease reaper: claim.expired event + notification (conformance-first) | 5 | M | 8.3 | `pnpm -C packages/core test && pnpm -C packages/db test` |
| **10.5b** | Live transcripts: stream agent stdout/stderr to .oahs/logs/<claimId>.log | 5 | M | — | `pnpm -C packages/runner test` |

> Land `10.1a` **sau** `8.4` (cả hai đụng `auth.ts`/`PersistShape`). 10.3 (push credential) và 10.4 (baseline branch push) cùng sửa push step `index.ts:487` → sắp `10.3` rồi `10.4`. **Loại trừ có chủ đích:** runner-phase `conflict_resolution` của roadmap §10 KHÔNG thuộc backlog phase 10 — route model của nó ship ở Phase 11; đừng thêm vào đây. 10.2 phải gỡ `env_file: .env` khỏi service oahs/spine trong `docker-compose.yaml` để spine giữ **zero model keys**.

### Phase 11 — Knowledge layer (ngoài spine)

Knowledge sống **ngoài** spine (D12/D14): output không bao giờ là gate guard, store là pgvector trong Postgres/PGlite (không service vector mới). `11.3` dẫn đầu (spine-only). `11.1` (DATABASE_URL) là nền cho mọi story pgvector. Mọi LLM touchpoint (embed, distill, self_review, policy resolution) chạy trong runner/knowledge-service/CLI, không bao giờ trong spine (§0.1).

| PR | Title | Stories | Effort | Depends on | Verify |
|---|---|---|---|---|---|
| **11.3** | Spec read surface — get_spec_content renders the document the gate-holder approves | 3 | M | — | `pnpm -C apps/spine-api test` |
| **11.1** | DATABASE_URL activation — real Postgres 16 behind the existing sync-engine factory | 1 | L | — | `pnpm -C packages/db test` |
| **11.2** | SQL + vector memory search — predicate pushed into SQL, additive embedding column, ranked recall | 2 | L | 11.1, 8.1 | `pnpm -C packages/db test` |
| **11.4a** | Gateway embeddings — Provider.embed on OpenAICompatibleProvider (POST /embeddings) | 4 | S | — | `pnpm -C packages/gateway test` |
| **11.4b** | Knowledge package — indexer + search_knowledge over its own MCP surface, off the spine | 4 | L | 11.1, 11.2, 11.3, 11.4a, 8.1 | `pnpm -C packages/knowledge test` |
| **11.5** | Code-graph impact evidence — deterministic impact_report, never a guard | 5 | M | — | `pnpm -C packages/runner test` |
| **11.8a** | Per-phase model policy — set/get_model_policy data + gateway per-phase resolver with fallback | 8 | L | 8.1 | `pnpm -C packages/gateway test && pnpm -C apps/spine-api test` |
| **11.8b** | Model Policies UI — cockpit view, one card per phase, ordered model list via the rails | 8 | M | 11.8a | `pnpm -C apps/spine-api test` |
| **11.7** | Agent self-review evidence — runner phase before in_review, self_review route, never a guard | 7 | M | 11.8a, 11.5 | `pnpm -C packages/runner test` |
| **11.6** | Memory distillation — oahs memory distill, the first procedural writer | 6 | M | 11.2 | `pnpm -C apps/oahs test` |

> `impact_report` (11.5) và `self_review` (11.7) mở rộng **cùng** enum `evidenceSchema` (contracts) + `EvidenceKind` union (types.ts) + CONFORMANCE.md → land 11.5 trước để edit thứ hai chỉ là additive; mỗi cái phải có conformance test khẳng định `checkReviewEvidence` (chỉ đọc `test_run + commit`) **không đổi** (pin D12). 11.6 sắp cột `distilled-cursor` **sau** ALTER của 11.2 để tránh hai migration đua nhau.

### Phase 12 — Topology (three-stack Actorium)

Dùng compose profiles (không microservices; K8s vẫn cấm) và làm cứng các seam để scale ngang. `12.1` quá lớn cho một review → tách `12.1a` (extract `@oahs/auth` bảo toàn hành vi) / `12.1b` (TTL + revoke + PersistShape v2) / `12.1c` (OIDC); **✎ merge `12.1b` trước `12.1c`** — cả hai mutate `PersistShape`/`TokenStore` của package auth vừa tách. Phase 12 phụ thuộc upstream chưa ship — bám dependsOn.

| PR | Title | Stories | Effort | Depends on | Verify |
|---|---|---|---|---|---|
| **12.1a** | Extract @oahs/auth package (behavior-preserving) | 1 | M | 10.1, 8.1 | `pnpm -C packages/auth test && pnpm -C apps/spine-api test` |
| **12.1b** | Per-token TTL, per-token revoke, PersistShape v2 migration + CLI | 1 | M | 12.1a | `pnpm -C packages/auth test && pnpm -C apps/spine-api test` |
| **12.1c** | OIDC user sign-in (auth-code flow, stub-injectable provider) | 1 | L | 12.1a | `pnpm -C packages/auth test && pnpm -C apps/spine-api test` |
| **12.2** | Compose profiles: product / runtime / knowledge stacks | 2 | M | 10.2, 11.4 | `pnpm -C apps/oahs test` |
| **12.3** | Transactional outbox EventTail (LISTEN/NOTIFY) replacing the 300ms poll | 3 | L | 11.1 | `pnpm -C apps/spine-api test` |
| **12.4** | Durable runner registry — announce/heartbeat/exit as engine events | 4 | L | 8.3 | `pnpm -C packages/core test && pnpm -C packages/db test && pnpm -C apps/spine-api test` |
| **12.5** | Webhook notification egress (resumable SSE sink, HMAC, retry) | 5 | M | 8.5 | `pnpm -C apps/oahs test` |
| **12.6** | Chat channels, DMs, and saved messages | 6 | L | — | `pnpm -C packages/core test && pnpm -C packages/db test && pnpm -C apps/spine-api test` |
| **12.7a** ✎ | Wire a `JsonlMeter` ledger (currently only `InMemoryMeter` exists) + fix its path/transport for the three-stack split | 7 | S | 11.8a | `pnpm -C packages/gateway test && pnpm -C apps/oahs test` |
| **12.7b** ✎ | Usage view: read-only `get_usage` over the JSONL ledger (parses the file, does NOT import `@oahs/gateway`) | 7 | M | 12.7a | `pnpm -C apps/spine-api test` |

> **✎ critic-fix (Issue 2):** cạnh phụ thuộc cũ `12.7 → 12.6` là **giả** (usage không liên quan chat; cả hai chỉ tình cờ đụng `bus.ts`) — đã bỏ. Tiền đề **thật**: hôm nay **không code path nào ghi `JsonlMeter`** (`oahs serve`/gateway CLI dùng `new InMemoryMeter()`), nên "the existing Meter JSONL ledger" mà story 12.7 giả định **chưa tồn tại** → tách `12.7a` wire ledger trước. Vì model call chạy **runtime-side** (§0.1), dưới three-stack split (12.2) product-stack serve `get_usage` **không share filesystem** với runtime-stack writer → 12.7a phải chốt vị trí/transport ledger để product-stack đọc được **mà không import `@oahs/gateway`**.
>
> `12.7b get_usage` tự parse JSONL, không import `meter.ts`. Mọi test/pin mới của 12.4 + 12.6 dùng **tên state sau rename** (`executing`, không `in_progress`).

---

## 4. Kickoff — 5 PR đầu tiên (Phase 8)

Tuần đầu tiên cụ thể. Thiết lập một lần, rồi drive từng PR qua spine. Toàn bộ đều copy-paste được. Story ids của phase 8 là `1..6` trong `delivery/phase-8-hardening/stories.yaml`; sau `import` chúng thành work item — đọc id thực từ `oahs status` hoặc cockpit (README dùng `1`).

### Thiết lập một lần (serve + team-seed + import)

```bash
# 0. serve + seed đội hai-vai (PO/product_owner, TL/tech_lead+reviewer, dev/developer, teammate)
export OAHS_ADMIN_TOKEN=<admin-token>
node apps/oahs/bin/oahs.mjs serve --data ~/.oahs/data &     # cổng 4521
./tools/team-seed.sh                                        # in ra TL_TOKEN, DEV_TOKEN

# 1. tạo feature Sprint-1 và import backlog phase 8 (idempotent)
oahs feature create                                         # -> <featureId>
oahs import <featureId> delivery/phase-8-hardening/stories.yaml
oahs status                                                 # đọc id các work item 8.1..8.6

# LƯU Ý ergonomics (do 8.2): sau khi 8.2 land, force_release cần tech_lead.
# Chạy các lệnh gate với token TL, KHÔNG dùng admin token:
export OAHS_TOKEN=<TL_TOKEN>
```

---

### PR 8.1 — CI workflow + resolve marker  ·  verify: `make check`

**Tests-to-write-first (viết trước khi wiring):**
- Chạy tay hai grep để xác nhận đều exit 1 (no match) trước khi đưa vào workflow:
  - LLM-SDK: `@anthropic-ai/|openai|@google/generative|mistralai|cohere|ollama` trên `packages/core/src packages/db/src packages/contracts/src apps/spine-api/src`
  - gateway: `@oahs/gateway` trên cùng 4 tree
- Grep thứ ba: doclint marker set trên `delivery/ docs/oahs/` (phải sạch).

**Files to touch:**
- new `.gitlab-ci.yml` (remote là GitLab — GitHub Actions không chạy; không đụng workflow BMAD upstream)
- `packages/core/test/stories-import.test.ts` (gỡ marker deferred ở ~line 274)
- `product-roadmap.md`, `OAHS.md`, `delivery/phase-8-hardening/stories.yaml` (gỡ truth-notes)

> CI tự sinh `pnpm-workspace.yaml` (gitignored): `printf 'packages:\n  - packages/*\n  - apps/*\nallowBuilds:\n  esbuild: true\n' > pnpm-workspace.yaml` — sai printf sẽ vỡ `pnpm install`/`make check` trên CI mà local vẫn xanh.

**Dogfood:**
```bash
STORY=<work-item-id-của-8.1>
oahs advance $STORY --to draft
oahs approve $STORY --gate spec_approval --pin "make check"
# work (agent/tay) -> rồi review gate:
oahs approve $STORY --gate review_approval
```

---

### PR 8.2 — Gate force_release_claim  ·  verify: `pnpm -C packages/core test && pnpm -C packages/db test && pnpm -C apps/spine-api test`

**Tests-to-write-first** (`packages/core/test/ops.test.ts` mới; ghi pin vào `CONFORMANCE.md`):
- Actor zero-grant gọi force-release → `PermissionDeniedError`.
- Actor role `tech_lead` (bundle đã có `ops.force_release_claim`) → succeeds, claim released.
- Event `claim.force_released` `{claimId, workItemId, holderActorId}`, authored by acting actor.
- Holder bị evict: fencing token cũ → `ConflictError` + `fencing.rejected` ở mutation kế (dùng `setupZombie` trong `packages/core/test/claims.test.ts`).
- **Viết lại** `apps/spine-api/test/flow.test.ts:233` `s2: force_release_claim` từ admin.call (expect success) → **tech_lead** actor; thêm case 403 cho token zero-grant.

**Files to touch:** `packages/core/src/engine.ts` (add `forceReleaseClaim({workItemId, actorId})`), `packages/core/src/types.ts` (SpineEngine interface), `packages/db/src/pg-engine.ts` (port), `apps/spine-api/src/bus.ts` (`force_release_claim` case: bỏ getClaims+releaseClaim ~line 531, gọi engine), `apps/spine-api/test/flow.test.ts`, `packages/core/test/CONFORMANCE.md`.

**Dogfood:**
```bash
STORY=<work-item-id-của-8.2>
oahs advance $STORY --to draft
oahs approve $STORY --gate spec_approval \
  --pin "pnpm -C packages/core test && pnpm -C packages/db test && pnpm -C apps/spine-api test"
oahs approve $STORY --gate review_approval
```

---

### PR 8.3 — Authenticate heartbeat/release_claim + runner liveness  ·  verify: `pnpm -C packages/core test && pnpm -C packages/db test && pnpm -C packages/runner test`

**Tests-to-write-first** (mở rộng `packages/core/test/claims.test.ts`; e2e `packages/runner/test/runner.heartbeat.e2e.test.ts`):
- `heartbeat` bởi non-holder không có token → `ConflictError` + `fencing.rejected`; holder → renews; ai trình token còn sống → renews (seam dispatcher-mode cho 10.2).
- `release_claim` cùng ma trận; release idempotent bởi holder giữ idempotent.
- `runner_announce`/`runner_heartbeat` bởi actor thiếu `task.claim` → `PermissionDeniedError`; role `developer` → ok.

**Files to touch:** `packages/contracts/src/index.ts` (heartbeat/release_claim thêm **optional** `fencingToken` — additive, parity giữ xanh), `packages/core/src/engine.ts` (`heartbeat`/`releaseClaim` ~785–801: holder OR presented token, dùng lại `validatePresentedToken`), `packages/core/src/types.ts` (interface), `packages/db/src/pg-engine.ts`, `apps/spine-api/src/bus.ts` (~352–364 pass `ctx.actorId`; ~606–630 `requirePermission(actor,'task.claim')`), `packages/runner/src/index.ts` (heartbeat loop + 3 release calls gửi fencing token), `CONFORMANCE.md`.

**Dogfood:**
```bash
STORY=<work-item-id-của-8.3>
oahs advance $STORY --to draft
oahs approve $STORY --gate spec_approval \
  --pin "pnpm -C packages/core test && pnpm -C packages/db test && pnpm -C packages/runner test"
oahs approve $STORY --gate review_approval
```

---

### PR 8.4 — Audit credential plane  ·  verify: `pnpm -C apps/spine-api test`

**Tests-to-write-first** (`apps/spine-api/test/auth.test.ts` — bus/TokenStore behavior thuộc spine-api suite):
- `create_actor` append `token.issued` trên stream `actor/<id>` payload `{tokenHashPrefix}` (8 hex), system-actor authored, causation = event create_actor; token thô **không** xuất hiện ở bất kỳ payload nào.
- `reissue_token` append `token.reissued` với hash prefix mới.
- `list_tokens` append **nothing** (read không append).

**Files to touch:** `packages/core/src/engine.ts` + `packages/core/src/types.ts` + `packages/db/src/pg-engine.ts` (add `noteTokenEvent({actorId, kind, tokenHashPrefix})` ở cả hai engine + interface), `apps/spine-api/src/bus.ts` (gọi sau `tokens.issue(...)` ở `create_actor` ~147 và `reissue_token` ~638–646), `apps/spine-api/src/auth.ts` (hash prefix từ sha256 TokenStore đã tính).

**Dogfood:**
```bash
STORY=<work-item-id-của-8.4>
oahs advance $STORY --to draft
oahs approve $STORY --gate spec_approval --pin "pnpm -C apps/spine-api test"
oahs approve $STORY --gate review_approval
```

---

### PR 8.5 — Visibility-filtered event egress  ·  verify: `pnpm -C packages/core test && pnpm -C packages/db test && pnpm -C apps/spine-api test`

**Tests-to-write-first** (core: thêm vào `packages/core/test/collaboration.test.ts` — **không phải** `collab.test.ts`; spine-api: `apps/spine-api/test/sse.test.ts` mới):
- Non-participant query events → không thấy event của thread `private`; participant thấy; governance role `auditor` thấy.
- SSE: hai stream đồng thời (participant/non-participant) nhận tập event khác nhau cho cùng message posted; `Last-Event-ID` resume vẫn chạy trên stream đã lọc (ids là global-seq → **gap là mong đợi**, ghi rõ trong test).

**Files to touch:** `packages/core/src/engine.ts` + `types.ts` + `pg-engine.ts` (add `eventsVisibleTo(actorId, streamId?)` cả hai engine), `apps/spine-api/src/bus.ts` (`query_events` ~583 chuyển sang), `apps/spine-api/src/sse.ts` (`registerEventStream` thêm predicate per-connection), `apps/spine-api/src/server.ts` (call site ~126), `packages/core/test/collaboration.test.ts`, `CONFORMANCE.md`.

**Dogfood:**
```bash
STORY=<work-item-id-của-8.5>
oahs advance $STORY --to draft
oahs approve $STORY --gate spec_approval \
  --pin "pnpm -C packages/core test && pnpm -C packages/db test && pnpm -C apps/spine-api test"
oahs approve $STORY --gate review_approval
```

> **✎ critic-fix (Issue 1, blocking):** 8.3 và 8.5 (cùng 9.3/9.5) port hành vi sang `pg-engine.ts`; `packages/db test` là suite **duy nhất** chạy lại core-conformance trên PGlite — nó phải nằm trong pin, nếu không port pg-engine hỏng vẫn để gate xanh.

---

## 5. Sổ rủi ro (risk register)

Nhóm theo loại nguy cơ; mỗi mục có bước giảm rủi ro (de-risk).

### A. Data-migration & đổi tên state
- **Feature rename `in_progress` → `executing` (9.1a).** `SCHEMA_SQL` exec mỗi lần mở DB (`worker.ts:78/95`), nên `UPDATE features SET state='executing' WHERE state='in_progress'` chạy **mỗi boot** → phải scope **chỉ bảng `features`**; `work_items.in_progress` là state riêng, **không** đổi (đổi sẽ vỡ hàng chục pin lớp task). `epic-lift.test.ts`, `engine.ts:966`, `pg-engine.ts:1410` assert `feature.state==='in_progress'` phải lật sang `'executing'` như back-compat được pin, **không** sửa event history.
  → **De-risk:** land 9.1a **riêng một PR** = conformance pins back-compat + migration idempotent trước; không có precedent data-UPDATE trong `schema-sql.ts` (chỉ có DDL) nên viết assertion idempotency tường minh.
- **DATABASE_URL / Postgres path (11.1).** Worker synckit phải host postgres-js drizzle làm I/O mạng thật; esbuild worker bundle phải nhét `postgres`.
  → **De-risk:** giữ **PGlite là default**; gate path Postgres sau env `DATABASE_URL`; suite database-url **skip-with-log** khi không reachable để CI không-DB vẫn xanh (không để thành no-op im lặng).
- **pgvector loading (11.1/11.2).** `@electric-sql/pglite/vector` phải load ở **cả hai** path `new PGlite()` (line 76) và `new PGlite(dataDir)` (line 93); `CREATE EXTENSION` trước mọi vector DDL; `resetDb()` TRUNCATE…CASCADE không được drop extension; dimension `N` là hằng single-source.

### B. Shared-file / thứ tự merge
- **Phase 8 four-file contention.** `engine.ts` / `pg-engine.ts` / `types.ts` / `bus.ts` bị 8.2/8.3/8.4/8.5 cùng sửa. → **De-risk:** merge **đúng thứ tự số**; tránh xung đột pin trong `CONFORMANCE.md`.
- **10.1a sau 8.4.** Cả hai đụng `auth.ts`/`PersistShape`. → land 10.1a sau khi 8.4 merged.
- **agent_jobs ALTER (9.4 trước 9.5).** 9.4 (`review_round` + review index) và 9.5 (`claimed_by`/`claim_expires_at`/`state_version` + live-claim index) cùng ALTER `agent_jobs`; 9.4 cũng đổi unique index bảng `claims`. → land 9.4 trước, mọi ALTER `IF NOT EXISTS`.
- **push step index.ts:487 (10.3 rồi 10.4; và 8.6 vùng lân cận).** → tuần tự, không land song song.
- **evidence-kind enum (11.5 trước 11.7).** Cùng enum contracts + union types + CONFORMANCE. → 11.5 trước, 11.7 additive.
- **11.6 distilled-cursor sau 11.2 ALTER.** → tránh hai migration đua.

### C. Conformance / parity
- **✎ db-suite là cổng parity DUY NHẤT (critic Issue 1, blocking).** `packages/db/vitest.config.ts` chạy lại **nguyên vẹn** core-conformance suite trên PGlite; `apps/spine-api` và `packages/runner` đều build server bằng `createMemoryEngine()` (kể cả `parity.test.ts`). Do đó bất kỳ PR nào port hành vi sang `pg-engine.ts` **phải** có `pnpm -C packages/db test` trong pin — nếu không port hỏng/thiếu vẫn để pin xanh. Đã sửa cho **8.3, 8.5, 9.3, 9.5** (khớp 8.2/9.4/10.5a vốn đã có). Nguy hiểm nhất là 9.5: đảm bảo "races lose by constraint" của nó là **partial-unique index chỉ tồn tại trên pg-engine**; pin không chạy db-suite sẽ không kiểm được đúng engine mang bảo đảm đó.
- **Engine → pg-engine port.** Mọi thay đổi engine (feature FSM, intent guard, claimReview, claimAgentJob, `reapExpiredClaims`, runner events, channels/DMs, model_policies) phải mirror sang `pg-engine.ts` — db vitest chạy lại core suite trên PGlite; core-only sẽ **âm thầm** vỡ parity.
- **10.5a pin gap.** CHECKLIST 10.5 chỉ pin core+runner, nhưng `reapExpiredClaims` port sang pg-engine → verify của 10.5a **phải** thêm `pnpm -C packages/db test` (đã phản ánh ở bảng).
- **pgvector parity trap (11.2).** SQL `ILIKE` coi `%`/`_` là wildcard còn core `.toLowerCase().includes()` coi literal → phải **escape** query; thứ tự cosine `<=>` phải tái lập deterministic trong JS core engine, nếu không db-vs-core parity fail.
- **parity.test.ts.** Mọi `def()` mới (feature_advance, approve/reject/cancel_feature, claim_review, claim_agent_job, rebaseline_intent, list_features, mint_claim_token, set/get_model_policy, get_spec_content, save/unsave, get_usage, runner events) = một contracts def + một bus case, cả hai surface, nếu không parity đỏ. `get_spec_content` phải `readonly=true`.

### D. §0.1 boundary
- **forge (9.6), knowledge (11.4b), model policy (11.8a), usage (12.7).** Giữ mọi LLM/network/forge touchpoint **ngoài** `packages/{core,db,contracts}` + `apps/spine-api`; `forge.ts` trong runner với injectable fetch; `OAHS_GITHUB_TOKEN` không vào spine; `packages/knowledge` không được import bởi spine; `get_usage` parse JSONL tự thân. → **De-risk:** 8.1 CI grep là hàng rào; nếu 8.1 chưa land, các assertion này không có gì enforce — **land/track 8.1 trước**.
- **docker-compose env keys.** 10.2 + 12.2 gỡ `env_file: .env` khỏi service oahs/spine để spine giữ zero model keys; regroup postgres service sang profile `knowledge`.
- **✎ Meter ledger chưa tồn tại (critic Issue 2).** `JsonlMeter` (`meter.ts`) chưa được construct ở đâu — chỉ `new InMemoryMeter()` (`apps/oahs/src/commands/gateway.ts:35`). `get_usage` (12.7b) đọc ledger đó → phải wire `JsonlMeter` trước (12.7a). Vì ledger ghi runtime-side còn `get_usage` chạy product-side, dưới three-stack split (12.2) hai stack **không share filesystem** → 12.7a chốt vị trí/transport (vd volume chung, hoặc runtime đẩy usage-event qua rails) để product đọc **không import `@oahs/gateway`**.

### E. Cross-phase upstream sequencing
- **HEAD là c10e9cd (Phase 7); phase 8–11 mới chỉ là checklist.** 12.1x không thể mở rộng scoped token mà 10.1 chưa thêm; 12.2 không có image dispatcher/indexer; 12.3 không có Postgres cho LISTEN/NOTIFY; 12.4 không có runner permissioning của 8.3; 12.5 không có visibility filter của 8.5. → **Không bắt đầu PR 12.x trước khi dependsOn upstream xanh.**
- **Phase 9 rename land trước Phase 12.** Mọi test/pin mới của 12.4 + 12.6 dùng tên state **sau** rename; `in_progress` hardcode sẽ diverge âm thầm.

### F. Auth / back-compat
- **8.2 admin-ergonomics break.** Bootstrap admin (governanceRole `admin`, zero grant) bị deny force_release → operator/docs/tooling chuyển sang `tech_lead` grant; `flow.test.ts:233` viết lại.
- **12.1a extract.** `parity.test.ts` và `serve.ts` import `TokenStore` từ path local → giữ `apps/spine-api/src/auth.ts` làm **re-export shim** (hoặc update mọi importer atomically). 12.1b **PersistShape v2** phải forward-migrate `tokens.json` v1 (không field `expiresAt`) mà không vô hiệu token đang sống; giữ `reissue()` nuke-all cho recovery, thêm `revoke(hash)` là path phẫu thuật.
- **8.6 default-minimal env behavior-breaking.** BYO agent hiện thừa kế full `process.env`; sau 8.6 mất trừ khi `--inherit-env`/`--agent-env`. → thêm flag vào `cli.ts` + `ManifestEntry` **và** path supervisor/manifest, nếu không agent do supervisor start mất env không đường khôi phục.

### G. Correctness ở seam SSE/outbox/registry
- **8.5 SSE resume.** Lọc per-connection tạo gap trong id global-seq non-participant nhận → test `Last-Event-ID`/`?since` trên id có gap (ghi là expected); `EventTail` interface không đổi.
- **12.3 outbox.** `NOTIFY oahs_events` phải emit trong **cùng** transaction append (`pg-engine.ts appendTx`); NOTIFY ngoài tx (hoặc path PGlite — không có LISTEN/NOTIFY) tái sinh mất/trùng event; test two-instance gate trên `DATABASE_URL`, skip-with-log ngược lại; `pollingEventTail` giữ làm fallback PGlite single-node.
- **12.4 registry inversion.** Bỏ in-memory `RunnerRegistry` Map (state vận hành cố ý ngoài engine) → stale flag phải tính từ event history + wall-clock TTL; semantics "unknown runner → re-register" phải sống qua restart spine, không chỉ gap trong-process.
- **10.4 marker.** `.oahs-work-item` hiện git-EXCLUDED qua `info/exclude`; cross-machine adoption cần marker **committed riêng biệt** — không hợp nhất, giữ invariant "agent git add không bao giờ vơ bookkeeping".
- **10.5b transcript.** Runner bị kill phải để lại log **một phần** (không rỗng); giữ PR này ở runner-side streaming + local tail (true cockpit live-tail cross-host là việc sau).

---

## 6. Anchor drift — Cần đối chiếu lại trước khi code

Các anchor sau đã **drift** so với tree tại thời điểm viết checklist; **sửa/đối chiếu lại trước khi implement** để pin/anchor không trỏ sai.

**Phase 8:**
- `packages/core/test/collab.test.ts` (CHECKLIST 8.5 trích dẫn) **không tồn tại** — suite thật là `packages/core/test/collaboration.test.ts`. Mở rộng file này.
- `apps/oahs/Dockerfile` "4517 ở dòng 50/59" (CHECKLIST 8.6) **thiếu**: 4517 còn ở **line 64** trong healthcheck CMD fallback (`process.env.OAHS_PORT||4517`); cả **ba** (50 ENV, 59 EXPOSE, 64 CMD) phải đổi → 4521.
- `oahs work --inherit-env` (CHECKLIST 8.6): command `work` tại `apps/oahs/src/cli.ts:696` **chưa có** `--inherit-env`/`--agent-env`; `ManifestEntry` (`apps/oahs/src/supervisor.ts:31–46) **chưa có** field `inheritEnv`/`agentEnv`. Phải **THÊM MỚI** vào `cli.ts` + `supervisor.ts`, không phải chỉ "thread" (chỉ có option `agentEnv` mức-loop tồn tại sẵn).

**Phase 9:**
- CHECKLIST 9.4 "agent_jobs gains nullable work_item_id + review_round": `work_item_id` (và `feature_id`) **đã tồn tại** trong `agent_jobs` (`schema-sql.ts:230`, drizzle `schema.ts:308`); chỉ `review_round` + partial unique index là mới thật.
- CHECKLIST 9.6 "wire vào runOnce sau push step (~line 487)": push tại line 487 nằm trong **`finishRun`** (định nghĩa line 444), **không** `runOnce` (line 563); PR-open thuộc `finishRun` (hoặc ngay sau khi `finishRun` trả `'in_review'`).
- CHECKLIST 9.7 board "từ project_list/get_feature reads only": không read nào source được board group theo stage (`project_list` bus.ts:194–221 trả state-count per-project; `get_feature` bus.ts:548 by-id); **cần `list_features` read command mới** (def + bus + cả hai engine).
- CHECKLIST 9.1 nói rename reuse "existing ALTER-IF-NOT-EXISTS pattern": `schema-sql.ts` chỉ có DDL migration, **không có** precedent data-UPDATE; UPDATE tuy naturally idempotent nhưng precedent trích dẫn không phủ data update.

**Phase 10:** không report anchorDrift.

**Phase 11:**
- `packages/runner/src/jobs.ts`: CHECKLIST 11.2 (line 50) nói "replaces `slice(-20)` at ~line 144" — line 144 đúng nhưng code là `memories = recalled.slice(-RECALL_LIMIT);` với `const RECALL_LIMIT = 20;` ở line 71; **không có literal `slice(-20)`**. Grep `RECALL_LIMIT` (line 71) + chỗ dùng (line 144), không grep literal.

**Phase 12:**
- CHECKLIST 12.6 trích `packages/core/test/collab.test.ts` — **không tồn tại**; suite sacred-boundary/mention thật là `packages/core/test/collaboration.test.ts` (~21KB). Mở rộng file đó.
- CHECKLIST 12.7 trích `packages/gateway/src/meter.ts` làm nguồn ledger cho `get_usage`, nhưng §0.1 cấm `apps/spine-api` import `@oahs/gateway`; **parse JSONL trực tiếp**, không import. Ngoài ra chưa có `JsonlMeter` wire vào `oahs serve` (gateway CLI dùng `InMemoryMeter`) → path ledger **chưa tồn tại**, phải wire trước.
- CHECKLIST 12.2 khẳng định service product (oahs) không `env_file: .env`, nhưng `docker-compose.yaml` hiện cấp `env_file: [{path: .env, required: false}]` cho service oahs — 12.2 phải gỡ/relocate; service `postgres` hiện profile `["postgres"]` phải regroup dưới profile `knowledge`.

---

## 7. Ước lượng & nhịp

**Roll-up effort per phase** (S = nhỏ, M = vừa, L = lớn):

| Phase | #PR | S | M | L |
|---|---|---|---|---|
| 8 — hardening | 6 | 1 | 3 | 2 |
| 9 — feature layer | 8 | 0 | 4 | 4 |
| 10 — isolation | 7 | 1 | 5 | 1 |
| 11 — knowledge | 10 | 1 | 5 | 4 |
| 12 — topology | 10 | 1 | 5 | 4 |
| **Tổng** | **41** | **4** | **22** | **15** |

> ✎ Phase 12 là 10 PR (không 9) sau khi tách `12.7 → 12.7a + 12.7b` theo critic-fix Issue 2.

**Milestone gợi ý:**

- **M0 — Trust floor (Phase 8, 6 PR).** Bắt buộc trước tất cả. Tuần 1 = 5 PR kickoff (8.1→8.5), 8.6 theo sau. Cổng: `make check` xanh trên main, CI grep §0.1 hoạt động.
- **M1 — Feature layer (Phase 9, 8 PR).** Ba track song song sau khi 8.1 xanh. Điểm rủi ro tập trung: 9.1a (rename) land đầu và riêng. Nặng L (4/8) — dành nhịp rộng nhất.
- **M2 — Isolation (Phase 10, 7 PR).** Chuỗi token 10.1a→10.3 là xương sống; 10.4/10.5b chèn song song. Nhẹ hơn (chỉ 1 L).
- **M3 — Knowledge (Phase 11, 10 PR).** PR nhiều nhất và 4 L — nhịp dài nhất. 11.3 + 11.1 + 11.4a + 11.5 + 11.8a khởi động song song; hội tụ ở 11.4b.
- **M4 — Topology (Phase 12, 9 PR).** Chỉ bắt đầu khi upstream (10.1/10.2/11.1/11.4/8.3/8.5) đã xanh. 12.1 tách ba; 12.4/12.5/12.6 song song.

Trọng tâm effort dồn về **M1 + M3** (8 L trên tổng 15). Ưu tiên năng lực review sâu cho hai milestone này; M0 tuy chỉ 6 PR nhưng là điều kiện tiên quyết tuyệt đối — không mở M1–M4 khi M0 chưa xanh trên main.