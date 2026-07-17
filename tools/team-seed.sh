#!/usr/bin/env sh
# Seed the two-role team from the operations manual (docs/oahs/04-so-tay-van-hanh.md,
# source: docs/ref/actorium-user-manual.pdf) into a RUNNING oahs server:
#
#   PO            user  — role product_owner
#   Tech Lead     user  — roles tech_lead + reviewer, plus direct grants
#                         gate.spec.approve (team convention: TL approves the
#                         spec / Definition of Ready) and task.block (TL unblocks)
#   Coding agent  agent — role developer (picked up by `oahs work`)
#   Teammate      agent — no role; reply-only jobs need no lifecycle authority
#   Gate policy   review_approval requires at least one HUMAN approver
#
# Display names come from env (placeholders by default — keep real names out of
# the repo): OAHS_PO_NAME, OAHS_TL_NAME, OAHS_DEV_NAME, OAHS_MATE_NAME.
#
#   OAHS_ADMIN_TOKEN=<the token `oahs serve` printed> OAHS_PORT=4521 ./tools/team-seed.sh
#
# Run once per workspace: re-running creates NEW actors (actor create is not
# idempotent by name — tokens are per-actor). Everything goes through /rpc,
# the same rails as every client.
set -eu

URL="${OAHS_URL:-http://localhost:${OAHS_PORT:-4521}}"
TOKEN="${OAHS_ADMIN_TOKEN:?is unset. oahs serve generates a random admin token and prints it at startup - export that one. (It used to default to change-me, so every machine shared one guessable admin token; now an unset token fails here instead of 401-ing later.)}"
PO_NAME="${OAHS_PO_NAME:-PO}"
TL_NAME="${OAHS_TL_NAME:-Tech Lead}"
DEV_NAME="${OAHS_DEV_NAME:-Coding agent}"
MATE_NAME="${OAHS_MATE_NAME:-Teammate}"

rpc() { # rpc <command> <json>
  curl -fsS -X POST "$URL/rpc/$1" \
    -H "authorization: Bearer $TOKEN" \
    -H 'content-type: application/json' \
    -d "$2"
}

field() { # field <name>  — extract the last "name":"value" from a JSON envelope without jq
  sed -E "s/.*\"$1\":\"([^\"]+)\".*/\1/"
}

actor() { # actor <type> <name> — create, print "id token"
  OUT=$(rpc create_actor "{\"type\":\"$1\",\"displayName\":\"$2\"}")
  printf '%s %s\n' "$(printf %s "$OUT" | field id)" "$(printf %s "$OUT" | field token)"
}

echo "→ team seed against $URL"
curl -fsS "$URL/healthz" >/dev/null || { echo "server not reachable at $URL"; exit 1; }

# `actor` prints "<id> <token>"; the unquoted expansion IS the mechanism — word
# splitting is what fills $1/$2. Both fields are generated (actor_00000N, a sha256
# hex token), so they can carry neither whitespace nor a glob character.
# shellcheck disable=SC2046
set -- $(actor user "$PO_NAME");   PO_ID=$1;   PO_TOKEN=$2
# shellcheck disable=SC2046
set -- $(actor user "$TL_NAME");   TL_ID=$1;   TL_TOKEN=$2
# shellcheck disable=SC2046
set -- $(actor agent "$DEV_NAME"); DEV_ID=$1;  DEV_TOKEN=$2
# shellcheck disable=SC2046
set -- $(actor agent "$MATE_NAME"); MATE_ID=$1; MATE_TOKEN=$2

echo "  roles: $PO_NAME → product_owner"
rpc assign_role "{\"actorId\":\"$PO_ID\",\"roleCode\":\"product_owner\"}" >/dev/null

echo "  roles: $TL_NAME → tech_lead + reviewer (+ gate.spec.approve, task.block)"
rpc assign_role "{\"actorId\":\"$TL_ID\",\"roleCode\":\"tech_lead\"}" >/dev/null
rpc assign_role "{\"actorId\":\"$TL_ID\",\"roleCode\":\"reviewer\"}" >/dev/null
rpc grant_permission "{\"actorId\":\"$TL_ID\",\"permission\":\"gate.spec.approve\"}" >/dev/null
rpc grant_permission "{\"actorId\":\"$TL_ID\",\"permission\":\"task.block\"}" >/dev/null

echo "  roles: $DEV_NAME → developer"
rpc assign_role "{\"actorId\":\"$DEV_ID\",\"roleCode\":\"developer\"}" >/dev/null

echo "  gate policy: review_approval requires a human approver"
rpc set_gate_policy '{"gate":"review_approval","policy":{"requiredActorTypes":["user"]}}' >/dev/null

cat <<EOF
✓ done — tokens print ONCE, store them now (e.g. oahs login <name> --token …):

  $PO_NAME (user, product_owner)
    actorId: $PO_ID
    token:   $PO_TOKEN

  $TL_NAME (user, tech_lead + reviewer + spec gate + unblock)
    actorId: $TL_ID
    token:   $TL_TOKEN

  $DEV_NAME (agent, developer — use with: OAHS_TOKEN=… oahs work)
    actorId: $DEV_ID
    token:   $DEV_TOKEN

  $MATE_NAME (agent, reply-only — use with: OAHS_TOKEN=… oahs work --jobs)
    actorId: $MATE_ID
    token:   $MATE_TOKEN
EOF
