# Tài liệu oahs — Hướng dẫn sử dụng & vận hành

**oahs — Open Agents Harness System** là một *agent-native delivery system*: một đội ngũ
phát triển phần mềm gồm **cả người lẫn AI agent**, chạy trên một *deterministic spine*.
Mọi thay đổi trạng thái đi qua luật tất định, không bao giờ qua hội thoại của LLM.

> **AI làm việc, luật chạy quy trình, actor có quyền giữ các gate.**

Bộ tài liệu này (tiếng Việt) hướng dẫn *sử dụng* và *vận hành* nền tảng. Nó **mở rộng**,
không thay thế, bản tóm tắt kỹ thuật [OAHS.md](../../OAHS.md) ở gốc repo.

## Đọc gì trước — theo vai trò

| Bạn là… | Bắt đầu ở |
|---|---|
| Muốn hiểu bản chất nền tảng | [00 — Tổng quan & khái niệm cốt lõi](00-tong-quan.md) |
| Người vận hành / self-host | [01 — Cài đặt & vận hành](01-cai-dat-va-van-hanh.md) |
| PO / reviewer / dev / dùng hằng ngày | [02 — Hướng dẫn sử dụng](02-huong-dan-su-dung.md) |
| Cần tra lệnh / API / biến môi trường | [03 — Tham chiếu](03-tham-chieu.md) |
| PO / Tech Lead vận hành theo quy trình đội | [04 — Sổ tay vận hành theo vai trò](04-so-tay-van-hanh.md) |
| Đối chiếu với portal Actorium & lộ trình | [05 — Đối chiếu Actorium portal ↔ oahs](05-actorium-portal-parity.md) |

## Các tài liệu

1. **[00 — Tổng quan & khái niệm cốt lõi](00-tong-quan.md)** — oahs là gì, triết lý bốn
   lớp (Rules / Skills / Agents / Humans), kiến trúc monorepo, command bus, và mọi khái
   niệm: work item & kind, FSM/gates, claims, threads/mentions/jobs, entitlements, memory,
   model gateway.
2. **[01 — Cài đặt & vận hành](01-cai-dat-va-van-hanh.md)** — yêu cầu, ba cách chạy
   (Makefile / Docker Compose / Node), cấu hình `.env`, model gateway, lưu trữ & sao lưu,
   health/log, bảng lệnh Makefile, ranh giới tin cậy.
3. **[02 — Hướng dẫn sử dụng](02-huong-dan-su-dung.md)** — web console `/ui`, bootstrap
   actors/roles/grants, vòng đời một công việc (feature → gate spec → review → done),
   cộng tác (threads/mentions/jobs), teammate không-code & personas, learning teammate
   (brain thật), runner coding, và MCP cho Claude Code.
4. **[03 — Tham chiếu](03-tham-chieu.md)** — bảng đầy đủ lệnh CLI, endpoints HTTP/MCP/SSE,
   enum & permissions, biến môi trường, định dạng `stories.yaml`.
5. **[04 — Sổ tay vận hành theo vai trò](04-so-tay-van-hanh.md)** — quy trình đội áp lên
   oahs (từ [user manual](../ref/actorium-user-manual.pdf)): vai trò PO/TL và quyền tương
   ứng, ánh xạ stage nội bộ, 4 walkthrough (feature end-to-end, unblock runbook, review &
   merge, hỏi teammate), seed đội hình `tools/team-seed.sh`.
6. **[05 — Đối chiếu Actorium portal ↔ oahs](05-actorium-portal-parity.md)** — khảo sát
   trực tiếp portal vận hành (8 màn hình, org/workspace, model policies, command palette):
   bảng đối chiếu từng bề mặt ↔ oahs, 5 phase-model = 5 điểm chạm LLM, và các gap đã tiếp
   nhận vào roadmap §2.5/§9/§11/§12.

## Chạy thử trong 3 lệnh

```bash
cp .env.example .env                 # đặt OAHS_ADMIN_TOKEN; (tuỳ chọn) điền OAHS_MODEL_*
docker compose up -d --build oahs    # → http://localhost:4521/ui
OAHS_ADMIN_TOKEN=<token mà serve in ra> OAHS_PORT=4521 ./tools/oahs-bootstrap.sh   # seed demo
```

Sau đó mở `http://localhost:4521/ui`, đăng nhập bằng admin token. Chi tiết:
[01 — Cài đặt & vận hành](01-cai-dat-va-van-hanh.md).

## Tài liệu nền tảng (gốc repo)

- [OAHS.md](../../OAHS.md) — bản tóm tắt kỹ thuật / quick reference.
- [product-thesis.md](../../product-thesis.md) — triết lý sản phẩm (đọc khi phân vân về hướng đi).
- [product-roadmap.md](../../product-roadmap.md) — lộ trình Phase 0–7.
- [delivery/](../../delivery) — backlog của chính nền tảng (mẫu `stories.yaml`).
