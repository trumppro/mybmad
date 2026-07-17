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

**Git của runner chạy không hook.** git *thực thi hook phía client* lấy từ chính repo mà
agent có quyền ghi, và hook chạy với env của tiến trình gọi git. Một agent cắm
`.git/hooks/pre-push` (hoặc trỏ `core.hooksPath` / `core.fsmonitor` sang script của nó)
sẽ đọc được đúng những bí mật mà allowlist ở trên giữ lại, ngay lần runner push kế tiếp.
Vì vậy mọi lệnh git của runner đều kèm `-c core.hooksPath=/dev/null
-c core.fsmonitor=false -c protocol.ext.allow=never`. **Hệ quả vận hành:** hook trong repo
của bạn (`pre-push`, `post-checkout`, …) KHÔNG chạy cho các thao tác git *của runner*;
hook vẫn chạy bình thường với git do agent tự gọi.

**Và git của runner cũng chạy env tối thiểu** (`buildGitEnv`). Chặn hook là chưa đủ:
`.git/config` **repo-local cũng do agent ghi được** (mọi worktree dùng chung common dir),
và nó còn trỏ tới lệnh khác mà git sẽ chạy — `filter.<n>.smudge` gắn qua `.gitattributes`
nổ ngay lúc runner `worktree add`; `core.sshCommand` / `credential.helper` nổ lúc push.
Không chặn được *việc chúng chạy*, nên ta lấy đi phần env: git của runner chỉ nhận một
allowlist riêng cho git (PATH/HOME, `GIT_*`, proxy, CA, XDG, askpass…), tuyệt đối không có
`OAHS_TOKEN` / `OAHS_MODEL_*`. Thêm hai lớp: các **broker credential**
(`SSH_AUTH_SOCK`, bus D-Bus của keyring) chỉ cấp cho lệnh thật sự chạm remote (`push`,
`ls-remote`) — lệnh cục bộ như `worktree add` không giữ chúng; và các biến **con trỏ repo**
(`GIT_DIR`, `GIT_WORK_TREE`, `GIT_INDEX_FILE`, …) bị loại kể cả khi khớp `GIT_*`, vì một
`GIT_DIR` lạc sẽ khiến runner đo và chứng thực **nhầm repo**.

**Đừng hiểu quá lời cam kết này.** Một knob đã nổ là *code chạy dưới đúng uid của runner*:
nó đọc được mọi thứ uid đó đọc được — kể cả `~/.oahs/config.json` (ở deployment supervisor,
file này giữ **mọi** identity: po/dev/admin) và `~/.ssh/id_*` chưa đặt passphrase, tức là
vẫn **ký được** bằng khoá của bạn dù không có `SSH_AUTH_SOCK`. Bỏ `HOME` không cứu được
(code vẫn tra ra home qua `getpwuid`) mà chỉ làm git mất chỗ đọc config. Vì vậy đây là
**phòng thủ theo lớp** cho hướng env, **không phải** một ranh giới cách ly — ranh giới thật
là sandbox cho agent (roadmap §10).

Nếu hạ tầng của bạn cần biến env mà allowlist không lường trước (helper credential nội bộ,
SSO của hãng), mở cửa thoát: `OAHS_GIT_INHERIT_ENV=1` trả lại **toàn bộ** env cho git của
runner — cùng tinh thần `--inherit-env`, và cùng đánh đổi.

**Runner chỉ push khi cấu hình push khớp ảnh chụp trước-agent.** Cùng `.git/config` mà
agent ghi được có thể (a) **đổi chỗ push**: `remote.origin.url`, `url.<attacker>.insteadOf`,
`pushurl` thứ hai, hoặc một proxy vận chuyển (`http.proxy`, tắt `http.sslVerify`,
`core.gitProxy`) — đẩy nhánh sang remote kẻ tấn công *và* viết lại `ls-remote` để dựng
`reachableOnRemote=true` (thứ gate "done" tin), tức vừa lộ nhánh vừa **giả mạo bằng chứng**;
hoặc (b) **chạy lệnh** lúc push/ls-remote: `core.sshCommand`, `credential.helper`,
`remote.<n>.uploadpack`/`receivepack` — chạy dưới uid runner đang giữ socket ssh-agent mà
env của agent bị tước. Runner **chụp vân tay** (URL push hiệu dụng + các khoá cấu hình trên,
đọc ở mọi scope kể cả `include.path`) *trước khi* agent chạy, ghi vào rails qua bằng chứng
`push_target` (để đường crash-adopt — vốn không chạy lại agent — vẫn đối chiếu được), rồi
**từ chối push** nếu vân tay đã đổi. Đây là **phát hiện thay đổi**, không phải ghim giá trị:
cấu hình hợp lệ của operator (một `insteadOf` toàn cục, `http.proxy` doanh nghiệp, một
`core.sshCommand` riêng) nằm trong **cả hai** ảnh chụp nên không bao giờ bị chặn nhầm — chỉ
giá trị *xuất hiện trong lượt chạy* mới lệch. Repo **git-lfs** cũng bị từ chối (git-lfs
upload object bằng hook pre-push mà HOOK_ISOLATION đã tắt → nhánh thiếu object): thà block
còn hơn chứng thực một nhánh hỏng.

Cùng giới hạn "phòng thủ theo lớp": chụp *trước agent* chỉ bắt thao túng trong lượt này. Cấu
hình bị đầu độc từ **trước** mốc chụp (agent lượt trước ghi bẩn config chung, hoặc sửa
`~/.gitconfig` toàn cục) thì không reader nào thấy — đó là phần của sandbox §10, như việc
đọc `~/.ssh`. Danh sách khoá lệnh là *denylist* (best-effort): một knob nằm ngoài nó cũng
thuộc về sandbox.

Cấp key cho agent qua kênh tường minh, không qua env thừa kế:

```bash
# Truyền đúng thứ agent cần (lặp lại được); ví dụ khoá model của riêng agent:
oahs work --agent-cmd '…' --agent-env ANTHROPIC_API_KEY=sk-… --agent-env MY_FLAG=1

# Cửa thoát cho setup BYO phụ thuộc toàn bộ process env (opt-in, không mặc định):
oahs work --agent-cmd '…' --inherit-env
```

### Credential push theo claim (§10.3)

Credential push là của **runner/dispatcher**, không bao giờ của agent. Có **hai hình
dạng**, chọn theo cách bạn chạy — cùng một nguyên tắc: credential nên **ngắn hạn** và chỉ
uỷ quyền đúng **một ref**, `refs/heads/claim/<claimId>`. Rò rỉ thì kẻ cầm chỉ ghi được
đúng nhánh của claim đó, không phải cả repo.

**BYO `oahs work` — askpass theo lượt dispatch.** Đặt `OAHS_PUSH_TOKEN` (tuỳ chọn
`--push-user`, mặc định `x-access-token`). Runner ghi một script GIT_ASKPASS **chmod 700**
vào `<repo>/.oahs/tmp` (đã nằm trong `info/exclude`) **chỉ cho lượt push đó**, và xoá nó
trong `finally`. Bí mật **không nằm trên đĩa**: script chỉ `echo` biến env của chính tiến
trình git. Không đặt `OAHS_PUSH_TOKEN` → dùng credential helper sẵn có của bạn, y như cũ.

> **Hệ quả vận hành:** khi (và chỉ khi) bạn đưa `OAHS_PUSH_TOKEN`, lượt push đó chạy kèm
> `-c credential.helper=` — **xoá sạch danh sách helper** cho đúng lệnh đó. Bắt buộc, vì
> credential helper **được hỏi trước** GIT_ASKPASS: trên máy đã có helper (osxkeychain,
> libsecret, GCM, `store` — git của Apple bật sẵn ở gitconfig hệ thống) thì broker sẽ
> **không bao giờ được gọi**, push âm thầm dùng credential **toàn-repo** của bạn (mất sạch
> claim-scoping, không một dòng lỗi), và tệ hơn: sau khi push thành công git chạy
> `credential approve` → helper **ghi token claim-scoped xuống đĩa/keychain**, sống lâu hơn
> lease mà nó được cấp cho. Helper của bạn vẫn nguyên vẹn cho mọi lệnh git khác.

```bash
OAHS_PUSH_TOKEN=ghs_… oahs work --project my-app --agent-cmd '…'
```

**`oahs dispatch` — dispatcher push hộ.** Container **không hề nhận** credential push:
nó commit lên `claim/<claimId>` rồi dừng, ghi bằng chứng `commit` trung thực
(`reachableOnRemote: false`, `pushDeferred: dispatcher`). Sau khi container thoát 0,
**dispatcher trên host** mới push nhánh đó bằng `OAHS_PUSH_TOKEN` của mình và ghi thêm
`commit{reachableOnRemote: true}` — thứ mà gate "done" đọc (nó chấp nhận *bất kỳ* bằng
chứng commit nào reachable, và evidence là log chỉ-thêm).

Điều quan trọng: **bảo đảm §8 đi theo người push**. Dispatcher đối chiếu push-config với
**mốc neo sớm nhất** trên rails (bằng chứng `push_target` đầu tiên; chỉ khi item chưa có
neo nào thì mới chụp và ghi mốc mới), rồi kiểm lại sau khi container thoát — một agent viết
lại `remote.url`/`insteadOf` trong repo bind-mount sẽ bị **từ chối push** và item bị block,
chứ không bị đẩy sang remote của kẻ tấn công. Hai điểm tinh tế: (1) vân tay phải chụp **trên
host** vì đó là nơi push chạy — chụp trong container sẽ lẫn config global của container và
chặn nhầm; (2) phải neo vào **rails**, không phải đọc lại config sống mỗi lượt, vì checkout
của dispatcher **dùng chung và tồn tại lâu dài** giữa các lượt dispatch — đọc lại config sống
sẽ âm thầm "phong thánh" đúng cái redirect mà agent lượt trước để lại thành baseline mới.

### Công của agent sống lâu hơn cái máy chạy nó (§10.4)

Ngay khi agent xong và **§8 cho phép push**, runner publish nhánh `claim/<claimId>` — *trước*
giai đoạn kiểm chứng vốn có thể chạy hàng chục phút. Mất máy sau đó không còn mất trắng cả
một lượt agent: máy khác nhận cùng item sẽ **adopt** phần việc đã publish (nộp evidence muộn)
thay vì trả tiền chạy agent lần nữa. Lượt push này là *best-effort, không ghi evidence* — push
chính thức phía sau vẫn là bên đo `reachableOnRemote` và ghi `commit`. Nó dùng **đúng** các điều
kiện từ chối của §8 (khớp mốc neo + không phải repo LFS), nên agent thao túng config vẫn không
đẩy được gì đi đâu.

Điều quyết định **an toàn** là chỗ lấy niềm tin. Commit trên nhánh claim — **kể cả message** —
do agent viết, mà §8/§10.3 coi agent là *đối thủ*. Nên không có gì trong **nội dung repo** được
quyền quyết định nhánh nào thuộc item nào, baseline ở đâu, hay đã dùng chưa. Ba câu trả lời đó lấy từ:

- **nhánh nào là của item này** → spine (`list_claims`, và tên `claim/<claimId>` là quy ước của
  runner, không phải của agent);
- **work bắt đầu từ đâu** → `git merge-base` (cấu trúc, không giả mạo được);
- **đã tiêu thụ chưa** → bằng chứng `commit` trên spine, khoá theo **sha** chứ không theo tên
  nhánh. Quan trọng: lượt adopt chứng thực sha đã adopt dưới nhánh **mới** của chính nó, nên nếu
  khoá theo tên nhánh thì nhánh nguồn sẽ mãi "còn mới" và mọi lần rework sau đều adopt lại đúng
  cái vừa bị reject. Sha thì ở đâu cũng là nó.

Mốc neo §8 luôn chụp **ở nơi thực sự push** — cùng quy tắc khiến §10.3 không chụp trong container.
Lượt adopt không import mốc neo của máy đã chết: vân tay trải cả global/system config, nên mốc của
máy A sẽ đọc **cấu hình hợp lệ của máy B** thành "agent thao túng" và block oan.

Dispatcher chỉ push khi container **thật sự thành công** (item ở `in_review`, không bị
block). Một lượt tự-block vẫn để lại nhánh `claim/<id>` — `git worktree add -b` tạo nhánh
*trước khi* agent chạy và `worktree remove` không xoá nhánh — nên "có nhánh" **không** đồng
nghĩa với thành công; push nó sẽ chứng thực `reachableOnRemote: true` cho công việc mà chính
HALT của nó đã bác bỏ. Push **thất bại** (auth/mạng) cũng được ghi bằng chứng + block chứ
không im lặng bỏ mặc item ở `in_review`.

```bash
OAHS_PUSH_TOKEN=ghs_… oahs dispatch --image oahs-runner:local \
  --repo /abs/host/path/repo --spec-folder delivery/main --agent-cmd '…'
```

Trong manifest supervisor, mỗi entry mang `agentEnv` (map KEY→VALUE) và `inheritEnv`
(bool) tương ứng. `--inherit-env` chỉ nên dùng khi bạn hiểu rằng nó trả lại **toàn bộ**
env của runner cho child, kể cả các bí mật ở trên.

---

Tiếp theo: [Hướng dẫn sử dụng →](02-huong-dan-su-dung.md) ·
[Tham chiếu →](03-tham-chieu.md)
