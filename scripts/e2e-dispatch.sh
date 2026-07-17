#!/usr/bin/env bash
# §10.2/§10.3 END-TO-END, against a REAL docker daemon.
#
# Every other test of the dispatcher injects a fake spawner, so until this ran,
# the container path had never executed once: the agent image had never been
# built, the claim container had never started, and nothing had proved a
# container can even reach the spine. This drives the real thing:
#
#   spine (host) → oahs dispatch --once (host) → docker run <agent image>
#     → `oahs work --once` in ASSIGNED mode inside the container
#     → agent commits → container exits, having pushed NOTHING (§10.3)
#     → dispatcher pushes claim/<id> on the host and certifies it
#
# Asserts the outcome the product promises: the item reaches in_review, the claim
# branch lands on the remote, and the evidence says the revision is reachable.
#
# Usage: scripts/e2e-dispatch.sh   (needs: docker, node, git)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OAHS="node $ROOT/apps/oahs/bin/oahs.mjs"
PORT="${E2E_PORT:-4599}"
WORK="$(mktemp -d "${TMPDIR:-/tmp}/oahs-e2e-XXXXXX")"
SPEC_FOLDER="delivery/e2e"

# How a CONTAINER reaches a spine running on this host. Docker Desktop resolves
# host.docker.internal; on Linux CI the daemon shares the host network namespace,
# so 127.0.0.1 is the host and --network host is the route.
if [ "$(uname -s)" = "Linux" ]; then
  CONTAINER_URL="http://127.0.0.1:${PORT}"
  NETWORK_ARGS=(--network host)
else
  CONTAINER_URL="http://host.docker.internal:${PORT}"
  NETWORK_ARGS=()
fi

SPINE_PID=""
cleanup() {
  if [ -n "$SPINE_PID" ]; then
    kill "$SPINE_PID" 2>/dev/null || true
    wait "$SPINE_PID" 2>/dev/null || true   # reap it, so bash prints no "Terminated"
  fi
  rm -rf "$WORK"
}
trap cleanup EXIT

say() { printf '\n\033[1m== %s\033[0m\n' "$1"; }
# Ask the spine directly rather than parsing CLI prose.
rpc() { # rpc <command> <json> <token> -> raw JSON result
  curl -sS -X POST "http://127.0.0.1:${PORT}/rpc/$1" \
    -H "authorization: Bearer $3" -H 'content-type: application/json' -d "$2"
}
field() { node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf8'));process.stdout.write(String(d.result?.$1 ?? ''))"; }
fail() { printf '\033[31mFAIL: %s\033[0m\n' "$1" >&2; exit 1; }

say "build the agent-runtime image (the one no test has ever built)"
docker build -q -f "$ROOT/apps/oahs/Dockerfile.runner" -t oahs-runner:e2e "$ROOT" > /dev/null

say "start the spine (ephemeral, host)"
$OAHS serve --ephemeral --port "$PORT" > "$WORK/spine.log" 2>&1 &
SPINE_PID=$!
for _ in $(seq 1 40); do
  curl -sf "http://127.0.0.1:${PORT}/healthz" > /dev/null 2>&1 && break
  sleep 0.5
done
curl -sf "http://127.0.0.1:${PORT}/healthz" > /dev/null || fail "spine did not come up"
ADMIN="$(sed -n 's/^admin token (generated): //p' "$WORK/spine.log" | head -1)"
[ -n "$ADMIN" ] || fail "no admin token in spine log"
export OAHS_URL="http://127.0.0.1:${PORT}"

say "create the runner identity + grants"
ACTOR_OUT="$($OAHS actor create --type agent --name Runner --token "$ADMIN")"
ACTOR_ID="$(sed -n 's/^actorId: //p' <<< "$ACTOR_OUT")"
RUNNER_TOKEN="$(sed -n 's/^token: //p' <<< "$ACTOR_OUT")"
for p in feature.init task.plan task.claim task.advance task.block gate.spec.approve; do
  $OAHS grant "$ACTOR_ID" "$p" --token "$ADMIN" > /dev/null
done
export OAHS_TOKEN="$RUNNER_TOKEN"

say "seed the project: a checkout, a bare origin, one story"
REPO="$WORK/repo"
mkdir -p "$REPO/$SPEC_FOLDER/stories"
cd "$REPO"
git init -q -b main
git config user.email e2e@test.local && git config user.name e2e
echo 'process.exit(0);' > .oahs-verify.mjs
# The "coding agent": commits work + a terminal HALT report, exactly as the real
# contract requires. It runs INSIDE the container, from the claim worktree.
cat > e2e-agent.mjs <<'AGENT'
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
console.log('e2e agent: running inside the container as', process.env.USER ?? 'runner');
mkdirSync('src', { recursive: true });
writeFileSync('src/done.txt', 'work by the containerised agent\n');
writeFileSync(process.env.OAHS_SPEC_FILE, ['---','status: done','---','','## Auto Run Result','Status: done',''].join('\n'));
execFileSync('git', ['add', '-A']);
execFileSync('git', ['-c','user.name=Agent','-c','user.email=agent@test.local','commit','-m','e2e: agent work']);
AGENT
printf -- '- id: "e2e-1"\n  title: Containerised dispatch\n  description: proves the container path runs\n' > "$SPEC_FOLDER/stories.yaml"

FEATURE_ID="$($OAHS feature create | sed -n 's/^featureId: //p')"
$OAHS import "$FEATURE_ID" "$SPEC_FOLDER/stories.yaml" > /dev/null
SPEC_PATH="$(rpc get_work_item '{"workItemId":"e2e-1"}' "$RUNNER_TOKEN" | field specPath)"
printf -- '---\nstatus: backlog\n---\n\n# e2e-1\n' > "$SPEC_FOLDER/$SPEC_PATH"
git add -A && git commit -qm 'e2e baseline'
git clone -q --bare "$REPO" "$WORK/origin.git"
git remote add origin "$WORK/origin.git"

$OAHS advance e2e-1 --to draft > /dev/null
$OAHS approve e2e-1 --gate spec_approval --pin 'node .oahs-verify.mjs' > /dev/null

say "DISPATCH — the real thing: a container per claim"
$OAHS dispatch --once \
  --image oahs-runner:e2e \
  --repo "$REPO" \
  --spec-folder "$SPEC_FOLDER" \
  --agent-cmd 'node /repo/e2e-agent.mjs' \
  --container-url "$CONTAINER_URL" \
  ${NETWORK_ARGS[@]+"${NETWORK_ARGS[@]}"} 2>&1 | sed 's/^/  /'

say "assert"
STATE="$(rpc get_work_item '{"workItemId":"e2e-1"}' "$RUNNER_TOKEN" | field state)"
[ "$STATE" = "in_review" ] || fail "expected in_review, got '$STATE'"
echo "  ✓ item reached in_review"

BRANCH="$(git --git-dir="$WORK/origin.git" for-each-ref --format='%(refname:short)' 'refs/heads/claim/*' | head -1)"
[ -n "$BRANCH" ] || fail "the dispatcher never pushed a claim branch to the remote"
echo "  ✓ dispatcher pushed $BRANCH on the host (the container pushed nothing)"

git --git-dir="$WORK/origin.git" show --stat "$BRANCH" | grep -q 'src/done.txt' \
  || fail "the pushed branch does not contain the agent's work"
echo "  ✓ the pushed branch carries the containerised agent's commit"

rpc list_evidence '{"workItemId":"e2e-1"}' "$RUNNER_TOKEN" | grep -q 'halt_report' || fail "no halt_report evidence"
echo "  ✓ the agent's HALT report reached the spine (from inside the container)"
rpc list_evidence '{"workItemId":"e2e-1"}' "$RUNNER_TOKEN" | grep -q '"reachableOnRemote":true' \
  || fail "no commit evidence certifying the revision is reachable"
echo "  ✓ commit evidence certifies the revision reachable (the dispatcher's push)"

printf '\n\033[32mE2E PASSED — the §10.2 container path really runs.\033[0m\n'
