#!/usr/bin/env sh
# Seed an admin-driven demo into a RUNNING oahs server so /ui has something to
# show: grant the admin the delivery perms it needs, create a feature + two
# work items, and provision the six BMAD personas. Idempotent-ish (re-running
# creates fresh features; personas provision idempotently).
#
#   OAHS_ADMIN_TOKEN=change-me OAHS_PORT=4521 ./tools/oahs-bootstrap.sh
#
# Everything goes through /rpc — the same rails as every client.
set -eu

URL="${OAHS_URL:-http://localhost:${OAHS_PORT:-4521}}"
TOKEN="${OAHS_ADMIN_TOKEN:-change-me}"

rpc() { # rpc <command> <json>
  curl -fsS -X POST "$URL/rpc/$1" \
    -H "authorization: Bearer $TOKEN" \
    -H 'content-type: application/json' \
    -d "$2"
}

# Extract a top-level "id" from a JSON envelope without jq.
json_id() { sed -E 's/.*"id":"([^"]+)".*/\1/'; }

echo "→ oahs bootstrap against $URL"
curl -fsS "$URL/healthz" >/dev/null || { echo "server not reachable at $URL"; exit 1; }

ADMIN=$(rpc whoami '{}' | sed -E 's/.*"actorId":"([^"]+)".*/\1/')
echo "  admin actor: $ADMIN"

echo "  granting feature.init + task.plan"
rpc grant_permission "{\"actorId\":\"$ADMIN\",\"permission\":\"feature.init\"}" >/dev/null
rpc grant_permission "{\"actorId\":\"$ADMIN\",\"permission\":\"task.plan\"}" >/dev/null

FID=$(rpc create_feature '{}' | json_id)
echo "  feature: $FID"

rpc create_work_item "{\"featureId\":\"$FID\",\"externalKey\":\"1-1\",\"title\":\"Wire the ops board\",\"kind\":\"code\"}" >/dev/null
rpc create_work_item "{\"featureId\":\"$FID\",\"externalKey\":\"1-2\",\"title\":\"PRD: rate limits\",\"kind\":\"spec_draft\"}" >/dev/null
echo "  work items: 1-1, 1-2"

rpc provision_personas '{}' >/dev/null
echo "  personas: provisioned (6 BMAD agents)"

echo "✓ done — open $URL/ui and log in with the admin token"
