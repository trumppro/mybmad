# Cài đặt & vận hành

Hướng dẫn cho **người vận hành / self-host**: chạy spine, cấu hình, kết nối model
gateway, lưu trữ và sao lưu. Muốn *dùng* nền tảng để chạy quy trình delivery, xem
[Hướng dẫn sử dụng](02-huong-dan-su-dung.md).

## Yêu cầu

- **Node 22** (xem [.nvmrc](../../.nvmrc)).
- **pnpm** (monorepo dùng pnpm workspace).
- **Docker** + Docker Compose — tuỳ chọn, cho đường self-host bằng container.

Cài phụ thuộc workspace một lần:

```bash
pnpm install     # hoặc: make install
```

## Ba cách chạy spine

| Cách | Lệnh | Cổng mặc định | Lưu trữ | Dùng khi |
|---|---|---|---|---|
| **Makefile (local)** | `make serve` | `4521` | PGlite bền tại `~/.oahs/data` | Dev/dogfood trên máy bạn |
| **Docker Compose** | `docker compose up -d --build oahs` | `4521` | Volume `oahs-data:/data` | Self-host, chạy nền, khởi động lại tự động |
| **Node trực tiếp** | `node apps/oahs/bin/oahs.mjs serve` | `4521` | PGlite bền tại `~/.oahs/data` (đổi bằng `--data <dir>` / env `OAHS_DATA`) | Kiểm soát thủ công / script hoá |

> **Persistence là mặc định** (Phase 7 Wave 1): `serve` không có cờ gì vẫn bền
> tại `~/.oahs/data`. Muốn chạy tạm in-memory (mất sạch khi tắt) phải nói rõ:
> `oahs serve --ephemeral`. Truyền cả `--data` lẫn `--ephemeral` sẽ báo lỗi.

### Makefile (local)

```bash
make build      # build CLI bundle (bin + PGlite worker + web UI)
make serve      # build xong chạy spine, PGlite bền dưới .oahs/data, cổng 4521
```

`make serve` đặt `OAHS_ADMIN_TOKEN` mặc định là `change-me` nếu bạn chưa export.
Đổi cổng hoặc thư mục data:

```bash
OAHS_PORT=8080 DATA_DIR=/var/lib/oahs make serve
```

### Docker Compose (self-host)

```bash
cp .env.example .env                 # điền OAHS_MODEL_*; đặt OAHS_ADMIN_TOKEN
docker compose up -d --build oahs    # → http://localhost:4521/ui
```

- App ghi vào volume bền `oahs-data:/data` — **không cần** dịch vụ database để chạy.
- `serve` bind `0.0.0.0` mặc định (không có cờ `--host`).
- Vòng đời container: `make up | down | restart | logs | ps | sh` (bọc `docker compose`).

Dịch vụ `postgres` trong [docker-compose.yaml](../../docker-compose.yaml) nằm sau một
*profile* opt-in (`make pg-up`) và dành cho đường `DATABASE_URL` **tương lai** (roadmap
§7) — spine hiện chưa dùng nó.

### Cổng: 4521 ở mọi nơi

Từ Phase 7 Wave 1, cổng mặc định thống nhất **4521** trên cả ba đường chạy
(`DEFAULT_PORT` trong [apps/oahs/src/serve.ts](../../apps/oahs/src/serve.ts),
`OAHS_PORT` trong [Makefile](../../Makefile) và
[docker-compose.yaml](../../docker-compose.yaml)). CLI client cũng mặc định
`http://localhost:4521`, và nhận env `OAHS_URL` khi server ở nơi khác.
URL web console là `http://<host>:<cổng>/ui`.

## Cấu hình (`.env`)

Chép từ [.env.example](../../.env.example) và điền. Toàn bộ cấu hình đến từ biến
môi trường, **không hardcode**.

| Biến | Ý nghĩa |
|---|---|
| `OAHS_ADMIN_TOKEN` | Token admin bootstrap. Dán vào `/ui` để đăng nhập, hoặc `export OAHS_TOKEN=$OAHS_ADMIN_TOKEN` cho CLI. Nếu bỏ trống khi `serve`, hệ thống **sinh ngẫu nhiên** và in ra `admin token (generated): …`. |
| `OAHS_PORT` | Cổng HTTP cho `make serve` và container. |
| `OAHS_MODEL_BASE_URL` | Endpoint router tương thích OpenAI (ví dụ `https://…/v1`). |
| `OAHS_MODEL_API_KEY` | API key của router. **Nằm trong `.env` đã gitignore — không lọt vào file nguồn.** |
| `OAHS_MODEL_DEFAULT` | Model id mặc định (ví dụ `cc/claude-haiku-4-5-20251001`). |

Ngoài ra, khi chạy lệnh CLI phía client bạn cần `OAHS_TOKEN` (bearer token của actor
đang thao tác) — xem [Hướng dẫn sử dụng](02-huong-dan-su-dung.md).

## Model gateway

Gateway là dịch vụ **tầng runtime**, độc lập hoàn toàn với spine (spine không import
nó — bất biến kiểm bằng CI). Sau khi điền `OAHS_MODEL_*` trong `.env`, kiểm chứng
endpoint/key **trước** khi chạy teammate:

```bash
oahs models                 # liệt kê các model router có thể tới
oahs ping --message "test"  # gửi một completion thật, in reply + token usage
```

`oahs ping` in ra `model`, nội dung trả lời, và `usage: prompt=… completion=… total=…`
(đơn vị tính phí). Nếu hai lệnh này chạy được, teammate brain thật (`oahs work --jobs`)
sẽ hoạt động — xem [mục teammate trong hướng dẫn](02-huong-dan-su-dung.md#learning-teammate-brain-thật).

## Lưu trữ & sao lưu

Với `serve --data <dir>` (hoặc container), trạng thái nằm ở:

- `<dir>/pg/` — dữ liệu PGlite (Postgres nhúng): lifecycle, claims, gates, threads,
  entitlements, memory, event log.
- `<dir>/tokens.json` — ánh xạ token → actor (gồm cả actor admin bootstrap).

Vị trí theo cách chạy:

- `make serve` / `oahs serve` → `~/.oahs/data/` (state của operator, nằm NGOÀI checkout).
- Docker → volume `oahs-data` (ánh xạ `/data` trong container).

**Sao lưu** = sao lưu cả thư mục `<dir>` (hoặc snapshot volume `oahs-data`) khi server
đã dừng hoặc ở trạng thái ổn định. **Khôi phục** = đặt lại thư mục đó rồi `serve --data`
trỏ vào. Nâng cấp phiên bản giữ nguyên data: engine có đường *upgrade* (ALTER TABLE) cho
data dir tạo bởi bản cũ, nên khởi động lại trên data cũ là an toàn.

> Event log là *append-only* (và từ Phase 7 Wave 1 mỗi event có `occurred_at`) — nền móng
> cho audit export/hash-chain. **Lưu ý cho đúng sự thật:** schema hiện tại là
> single-workspace, CHƯA có cột `workspace_id` trên các bảng; cột `scope` của grants có
> lưu nhưng chưa được enforce. Backup hôm nay chỉ cần thư mục data.

## Sức khoẻ, log, vòng đời

- **Health check**: `GET /healthz` → `{ "ok": true }`. Container đã cấu hình healthcheck
  gọi endpoint này.
- **Log**: `make logs` (theo dõi log container). Bản `make serve` in log ra stdout tại
  chỗ chạy.
- **Restart / dừng**: `make restart` (giữ data trên volume), `make down` (dừng + xoá
  container, **giữ** volume).
- **Vào shell container**: `make sh`.
- **Audit**: dùng `oahs events [streamId]` hoặc trang *Audit events* trong `/ui` — truy
  vấn append-only event log (ai, dưới grant nào, trên bằng chứng gì).

## Bảng lệnh Makefile

Nguồn: [Makefile](../../Makefile). Chạy `make` hoặc `make help` để xem danh sách.

| Target | Việc |
|---|---|
| `help` | In danh sách target |
| `install` | `pnpm install` |
| `build` | Build CLI bundle (bin + PGlite worker + web UI) |
| `build-ui` | Chỉ build lại bundle web UI |
| `serve` / `dev` | Build rồi chạy spine (PGlite bền dưới `DATA_DIR`) |
| `test` | Chạy toàn bộ test gói `@oahs/*` (vitest) |
| `typecheck` | Typecheck toàn bộ gói `@oahs/*` (cổng TypeScript) |
| `lint` | Lint repo (eslint flat config) |
| `check` | `typecheck` + `test` |
| `clean` | Xoá artifact build + data local (`.oahs`, `dist`, …) |
| `docker-build` | Build image `oahs` |
| `up` / `down` / `restart` | Vòng đời container |
| `logs` / `ps` / `sh` | Theo dõi log / trạng thái / shell container |
| `pg-up` | Bật dịch vụ postgres tuỳ chọn (đường `DATABASE_URL` tương lai) |
| `bootstrap` | Seed demo admin vào server đang chạy (feature + work items + personas) |

### `make bootstrap` (seed demo nhanh)

Chạy [tools/oahs-bootstrap.sh](../../tools/oahs-bootstrap.sh) trên một server **đang
chạy**: cấp cho admin quyền `feature.init` + `task.plan`, tạo một feature + hai work
item (`1-1` kind `code`, `1-2` kind `spec_draft`), và provision 6 persona BMAD — để
`/ui` có sẵn dữ liệu để xem. Mọi thứ đi qua `/rpc`, cùng đường ống như mọi client.

```bash
OAHS_ADMIN_TOKEN=change-me OAHS_PORT=4521 ./tools/oahs-bootstrap.sh
# → mở http://localhost:4521/ui và đăng nhập bằng admin token
```

## Kiểm thử

Nền tảng có bộ test lớn (490+ tests). Chạy toàn bộ hoặc theo gói:

```bash
make check                       # typecheck + test tất cả @oahs/*
pnpm -C packages/core test       # 115 conformance tests — CHÍNH LÀ đặc tả (engine bộ nhớ)
pnpm -C packages/db test         # cùng bộ đó trên PGlite/Postgres + ping
pnpm -C apps/spine-api test      # auth, golden flow qua HTTP, MCP≡HTTP parity
pnpm -C apps/oahs test           # CLI e2e, durable-restart persistence, smoke binary
pnpm -C packages/runner test     # worker loop e2e: happy path, từ chối allowlist, crash+adopt
```

> Bộ conformance của `packages/core` **là đặc tả**: đổi một conformance test tức là đổi
> luật — ghi lại trong [packages/core/test/CONFORMANCE.md](../../packages/core/test/CONFORMANCE.md)
> với mức nghiêm cẩn ngang một chỉnh sửa roadmap.

## Ranh giới tin cậy (BYO — Phase 1)

Bằng chứng thu trên máy dev mạnh đến đâu là tuỳ giả định "operator trung thực" — đủ cho
dogfood và dùng nội bộ đội. Gate "done" mức enterprise sẽ bổ sung bằng chứng CI độc lập
phía server, và về sau là sandbox phía server (roadmap §4.3, Phase 6). Nêu ở đây để không
ai nhầm *sàn* với *trần*. Chi tiết trong [OAHS.md](../../OAHS.md).

### Môi trường của agent child (§8)

Runner giữ bí mật của cả đội: `OAHS_TOKEN` (danh tính runner trên rails),
`OAHS_MODEL_*` (khoá router), và có thể cả `SSH_AUTH_SOCK`. Tiến trình agent do runner
spawn (`agentCmd` tuỳ ý) **không** thừa kế các biến này — mặc định child chỉ nhận một
*allowlist* tối thiểu (`PATH`, `HOME`, `SHELL`, `USER`, `LANG`, `TZ`, `TERM`, `TMPDIR`, …)
cộng các biến dispatch (`OAHS_SPEC_FILE`/`OAHS_STORY_ID` ở coding mode,
`OAHS_CONTEXT_FILE`/`OAHS_REPLY_FILE` ở jobs mode). Một agent bị lộ hoặc tò mò không nhặt
được credential miễn phí từ môi trường.

Cùng ranh giới đó áp cho **lệnh kiểm chứng ghim** (`pinnedVerification` — `npm test`,
`pytest`, …): chúng chạy **code do agent viết** trong worktree, nên nhận đúng env tối
thiểu như agent, không phải env đầy đủ của runner. `--inherit-env` nới cho cả hai.

Cấp key cho agent qua kênh tường minh, không qua env thừa kế:

```bash
# Truyền đúng thứ agent cần (lặp lại được); ví dụ khoá model của riêng agent:
oahs work --agent-cmd '…' --agent-env ANTHROPIC_API_KEY=sk-… --agent-env MY_FLAG=1

# Cửa thoát cho setup BYO phụ thuộc toàn bộ process env (opt-in, không mặc định):
oahs work --agent-cmd '…' --inherit-env
```

Trong manifest supervisor, mỗi entry mang `agentEnv` (map KEY→VALUE) và `inheritEnv`
(bool) tương ứng. `--inherit-env` chỉ nên dùng khi bạn hiểu rằng nó trả lại **toàn bộ**
env của runner cho child, kể cả các bí mật ở trên.

---

Tiếp theo: [Hướng dẫn sử dụng →](02-huong-dan-su-dung.md) ·
[Tham chiếu →](03-tham-chieu.md)
