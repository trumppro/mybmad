# 04 — Sổ tay vận hành theo vai trò

> Nguồn đối chiếu: [user manual vận hành](../ref/actorium-user-manual.pdf) (docs/ref) —
> sổ tay cho người làm việc hằng ngày với một hệ thống cùng kiến trúc. Tài liệu này
> **áp quy trình đó vào oahs hiện tại**: vai trò dùng placeholder (PO / Tech Lead /
> Reviewer), lệnh nào chạy được *hôm nay* ghi rõ, phần nào tới Phase 9/11 mới có ghi rõ.
> Lệnh cơ bản và giải thích khái niệm: xem [02 — Hướng dẫn sử dụng](02-huong-dan-su-dung.md)
> và [03 — Tham chiếu](03-tham-chieu.md); tài liệu này chỉ nói *ai làm gì, lúc nào*.

Nguyên tắc chung của manual giữ nguyên trên oahs: **duyệt không phải việc riêng — nó là
một phần của vai trò**. Mỗi handoff giữa hai vai trò là một gate tất định, không phải
một lời nhắn.

## Vai trò → quyền oahs

| Vai trò | Sản xuất | Duyệt | Trên oahs |
|---|---|---|---|
| **Product Owner** | Product spec (vấn đề, thế nào là "chạy được", ngoài phạm vi, tài liệu tham chiếu) | Nghiệm thu cuối (handoff) | role `product_owner` (task.plan, feature.init, feature.advance, gate.spec.approve, dispatch.release_hold) |
| **Tech Lead** | Technical design → task breakdown (mỗi task một phần codebase, khai báo dependencies) | Product spec ("có build được không"); review/PR từng task; unblock task kẹt | role `tech_lead` + role `reviewer` + grant bổ sung `gate.spec.approve`, `task.block` (xem Seed) |
| **Coding Agent** | Claim task ready → code → push branch + evidence → biến mất | — | agent actor, role `developer`, chạy qua `oahs work` |
| **Teammate chat** | Trả lời câu hỏi trong thread, nhớ ngữ cảnh | — (không bao giờ đụng vòng đời) | agent actor + `oahs work --jobs` (mention → job → reply) |

Hai điểm khớp nguyên văn với manual:

- **Agent tự nhặt việc, không ai dispatch tay**: runner poll các item `ready_for_dev`
  chưa bị block; guard `deps_done` chặn claim khi dependency chưa xong. "Task becomes
  ready → Coding Agent picks it up automatically" chính là vòng poll này.
- **Một người kiêm hai vai vẫn ổn**: gán cả `product_owner` lẫn `tech_lead` cho cùng
  actor — các gate vẫn nổ đủ, audit vẫn ghi ai duyệt dưới grant nào.

Một điểm phải nói thẳng: theo bundle mặc định, `gate.spec.approve` nằm trong
`product_owner`. Manual muốn **TL là người duyệt spec** (Definition of Ready). Cách làm
đúng triết lý oahs (grant tường minh, không sửa bundle): cấp thêm cho TL grant trực tiếp
`gate.spec.approve` — script Seed bên dưới làm sẵn. PO vẫn giữ quyền đó trong bundle;
quy ước đội: TL bấm duyệt.

## Ánh xạ quy trình nội bộ

| Stage nội bộ | oahs hôm nay | Sau Phase 9 (roadmap §9) |
|---|---|---|
| Tiếp nhận & thống nhất input/output | `oahs feature create` + thread kind `spec` để bàn | Feature state `spec` trên board |
| Thiết kế UI/UX (nếu cần) | **Ngoài tool** — tiếp tục như hiện tại | Ngoài tool |
| Soạn BRD/SRS, xác nhận đủ input | Gate `spec_approval` + `--pin` lệnh verification (D7) — đây chính là Definition of Ready | Thêm gate `design_approval` cho technical design |
| Phát triển & kiểm thử | `ready_for_dev → in_progress → in_review` qua runner + evidence máy đo | Không đổi |
| Nghiệm thu nội bộ | Duyệt `review_approval` từng task; feature done khi mọi task xong | Gate `handoff_approval` cấp feature — PO duyệt một lần, đúng nghĩa "In Handoff" |
| Trả bài lãnh đạo | **Ngoài tool** — sau khi feature done | Ngoài tool |

Hai nguyên tắc đội đã theo, máy đã khoá sẵn:

- **"Không có input đủ – không bắt đầu"** = guard `deps_done` trên cạnh claim + gate
  `spec_approval` phải qua trước khi item rời vùng planning + lệnh verification được
  ghim ngay lúc duyệt. Không đủ input thì không có trạng thái nào cho phép agent bắt đầu.
- **"Một yêu cầu – một ticket"** = một work item, một `externalKey`, một file spec
  (`spec_path`). Id story phải prefix-free — đây là luật của parser, không phải văn hoá.

## Thuật ngữ manual ↔ trạng thái oahs

| Manual | oahs | Ghi chú |
|---|---|---|
| Feature | `feature` (+ `project` bên trên) | |
| Task | `work_item` (kind `code`/`spec_draft`/`design_review`/`qa_report`/`doc`) | |
| Dependency | `dependency` — guard `deps_done` chặn ở cạnh claim | |
| Ready | `ready_for_dev` **và** deps đã done | Cockpit lọc đúng tập claimable; trạng thái DB không đổi tên |
| Blocked | Overlay `blockedReason` (D8) — không phải state | Unblock xong item **đứng nguyên chỗ cũ** — đúng "resumes from where it left off" |
| Review passed | `in_review` + evidence đạt (lệnh pin exit 0, diff không rỗng, commit trên remote), chờ gate | Gate approve mới là "merged/done" |
| Handoff | Phase 9: feature state `handoff` + gate `handoff_approval` | Hôm nay: duyệt review từng task là bước nghiệm thu |
| Done | `done` (task) / feature `done` | Feature done tự động là *không bao giờ* — phải có actor có quyền |
| Cancelled | Phase 9: state `cancelled` qua lệnh privileged | Hôm nay chưa có — dùng archive project nếu bỏ cả dự án |

## Walkthrough 1 — Một feature từ đầu tới cuối

Vai diễn: PO viết spec, TL duyệt và bẻ task, agent làm, TL duyệt review.

```bash
# --- PO ---
oahs feature create                                  # in featureId
oahs import <featureId> path/to/stories.yaml         # backlog sinh ra trong git (D9)
oahs advance <storyId> --to draft                    # đưa vào vùng planning

# --- TL: duyệt spec = Definition of Ready, ghim luôn lệnh kiểm chứng ---
oahs inbox                                           # việc chờ quyết định gate
oahs approve <storyId> --gate spec_approval --pin "pnpm -C packages/core test"
#   → item sang ready_for_dev; deps xong tới đâu, agent tự nhặt tới đó

# --- Coding agent (chạy sẵn ở đâu đó, không ai dispatch tay) ---
oahs work --repo /path/to/repo --spec-folder path/to/spec-folder \
  --agent-cmd 'claude -p "…" --permission-mode acceptEdits'

# --- TL: khi task lên in_review ---
oahs inbox                                           # thấy task chờ duyệt review
oahs events <workItemId>                             # evidence trail: test_run/git_diff/commit
oahs approve <storyId> --gate review_approval        # pass CHỈ khi evidence đạt
oahs status                                          # nhìn cả feature
```

Từ chối ở bất kỳ gate nào không mất gì — `oahs reject <id> --gate review_approval` bắn
loopback tất định về `in_progress` (system actor, có causation), agent sửa rồi nộp lại.
Đúng tinh thần "nothing is lost, it just goes back a step" của manual.

## Walkthrough 2 — Gỡ một task kẹt (runbook)

Task kẹt hiện trên `oahs inbox`/`oahs status` và `/ui` với `blockedReason`. Gỡ xong,
item **đứng nguyên trạng thái cũ** và agent tiếp tục từ chỗ dừng — không bao giờ tụt bậc.

Cách unblock: mở `/ui` → **Work** (hoặc trang item) → nút *Unblock*; hoặc gọi thẳng rails:

```bash
curl -fsS -X POST "$OAHS_URL/rpc/unblock_task" \
  -H "authorization: Bearer $OAHS_TOKEN" -H 'content-type: application/json' \
  -d '{"workItemId":"<id>"}'
```

Quyền: cần `task.block` (TL được seed cấp sẵn). Riêng `review_non_convergence` chỉ người
giữ `gate.review.approve` gỡ được — đó là van an toàn, không phải bug.

| `blockedReason` | Nghĩa là gì | Bước tiếp theo gợi ý |
|---|---|---|
| `unclear_intent` | Agent không xác định được ý định từ spec | PO/TL làm rõ spec trong file + thread task, rồi unblock |
| `no_stories_yaml_found` | Runner không thấy `stories.yaml` ở spec-folder | Kiểm tra `--spec-folder`/đường dẫn, sửa, unblock |
| `ambiguous_story_file_match` | Nhiều file spec khớp cùng một id | Đổi tên file cho prefix-free (`<id>-…`), unblock |
| `review_non_convergence` | Vòng review thứ 6 — ping-pong quá giới hạn | Reviewer-gate holder họp lại scope; reject để sửa tiếp hoặc tách task mới; chỉ họ unblock được |
| `no_subagents` | Môi trường agent thiếu subagent cần có | Sửa cấu hình CLI agent trên máy runner, unblock |
| `dirty_tree` | Worktree bẩn trước khi làm | Dọn worktree (commit/stash rác), unblock |
| `stale_worktree` | Worktree đổ nát sau crash, không adopt được | Xem transcript `.oahs/logs/<claimId>.log`, xoá worktree hỏng, unblock để re-dispatch |
| `awaiting_human_input` | Agent cần một quyết định của người | Trả lời trong thread task / bổ sung input vào spec, unblock |
| `other` | Ngoài taxonomy | Đọc `halt_report` trong evidence trail của item rồi xử lý theo nội dung |

## Walkthrough 3 — Review và merge một task đã đạt

Manual: *"PR passes automated review → you look over → you merge → done."* Trên oahs
hôm nay chưa có PR — evidence là branch `claim/<claimId>` đã push + kết quả lệnh pin.
Quy trình tạm thời của TL:

1. `oahs inbox` → thấy task ở `in_review`; `oahs events <id>` xem evidence
   (`test_run` exit 0, `git_diff` không rỗng, `commit` reachable trên remote) —
   hoặc mở trang item trên `/ui` để nhìn cả trail.
2. Xem diff và **merge tay** branch `claim/<claimId>` vào nhánh chính
   (`git fetch && git merge --no-ff claim/<claimId>` hoặc PR thủ công trên forge).
3. `oahs approve <id> --gate review_approval` — gate nổ `in_review → done`.

> Phase 9 story 6 (GitHub PR integration) sẽ thay bước 2: runner tự mở PR khi task vào
> `in_review`, evidence `pr.merged_into_default` được đo qua forge API, và gate-policy
> (dữ liệu, không hardcode) có thể *bắt buộc* merged trước khi done. Khi đó walkthrough
> này đúng nguyên văn manual.

## Walkthrough 4 — Hỏi teammate giữa dự án

```bash
oahs thread create --kind general --feature <fid>
oahs post <threadId> "tình hình sprint thế nào? vì sao chọn PGlite?" --mention <teammateActorId>
oahs messages <threadId>       # teammate reply qua job; mention ngược khi cần bạn quyết
```

Đúng như manual: teammate **không phải đường ship code** — nếu câu trả lời dẫn tới việc
phải đổi sản phẩm, tạo work item chứ đừng nhờ teammate "sửa luôn". Chat không bao giờ
mutate vòng đời (ranh giới thiêng §5.2).

Giới hạn hôm nay, nói thẳng: teammate nhớ **thread + memory của chính nó**, chưa trích
dẫn được spec/design/quyết định trong workspace. Năng lực "answers by citing the
workspace's own documents" tới ở **Phase 11** (knowledge layer — `get_spec_content`,
`search_knowledge`); vì kỳ vọng vận hành này, story spec-read-surface được xếp đầu
phase đó.

## Seed đội hình theo vai trò

Chạy một lần trên server đang chạy (xem [tools/team-seed.sh](../../tools/team-seed.sh)):

```bash
OAHS_ADMIN_TOKEN=<admin> ./tools/team-seed.sh
# tuỳ biến tên hiển thị (mặc định "PO" / "Tech Lead"):
OAHS_PO_NAME="PO" OAHS_TL_NAME="Tech Lead" OAHS_ADMIN_TOKEN=<admin> ./tools/team-seed.sh
```

Script tạo: 2 user actor (PO, TL), 1 coding agent, 1 teammate agent, và gán:

| Actor | Role/grant | Vì sao |
|---|---|---|
| PO | role `product_owner` | spec + feature init + release hold |
| TL | role `tech_lead` + `reviewer`, grant `gate.spec.approve`, `task.block` | duyệt spec (quy ước đội), duyệt review, unblock — đúng bảng vai trò manual |
| Coding agent | role `developer` | claim/advance/block trong lúc làm |
| Teammate | (không role) | reply-only; job không cần quyền vòng đời |
| Gate policy | `review_approval` require-type `user` | human-in-the-loop mặc định: agent không tự duyệt review dù được cấp nhầm |

Token in ra một lần — cất vào profile store (`oahs login <name> --token …`) rồi dùng
`--as <name>` thay vì export tay (xem 02 §Quickstart).

## Ranh giới ngoài tool (trung thực như manual)

Thiết kế UI/UX, báo cáo/trả bài lãnh đạo, và mọi stage chưa liệt kê **tiếp tục y như
hiện tại, bên ngoài oahs**. Đưa một stage vào tool là quyết định riêng, có gate riêng —
không phải hệ quả tự động của việc dùng oahs cho hai vai trò đầu tiên.
