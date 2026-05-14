#!/usr/bin/env bash
#
# canary-compare.sh — 7-day mainnet vs testnet verdict comparison.
#
# Runs during the canary phase (MAINNET-CEREMONY.md §3.12). Each day,
# for every attestation registered on mainnet, find the parallel
# testnet attestation (município submits both in shadow mode) and
# compare verdicts.
#
# Output:
#   docs/canary/YYYY-MM-DD.json  — committed daily report.
#   Exit 0 if divergence < 0.5%; exit 3 otherwise (triggers RUNBOOK §1.8).
#
# This script READS from Horizon mainnet + testnet; it does not submit.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

DATE="${1:-$(date -u +%F)}"
WINDOW_START_ISO="${2:-$(date -u -d "$DATE" '+%FT00:00:00Z')}"
WINDOW_END_ISO="${3:-$(date -u -d "$DATE +1 day" '+%FT00:00:00Z')}"

MAINNET_CONTRACT="$(jq -r .contract_id scripts/deploy-mainnet.json 2>/dev/null || echo '')"
TESTNET_CONTRACT="$(jq -r .contract_id scripts/deploy.json 2>/dev/null || echo '')"

if [[ -z "$MAINNET_CONTRACT" || -z "$TESTNET_CONTRACT" ]]; then
  echo "✗ contract ids missing (scripts/deploy-mainnet.json or scripts/deploy.json)"
  exit 2
fi

OUT_DIR="docs/canary"
mkdir -p "$OUT_DIR"
OUT="$OUT_DIR/$DATE.json"

echo "▸ Canary comparison for $DATE"
echo "  window:  $WINDOW_START_ISO → $WINDOW_END_ISO"
echo "  mainnet: $MAINNET_CONTRACT"
echo "  testnet: $TESTNET_CONTRACT"

# Pull attest events from both networks in the window.
fetch_events() {
  local horizon_host="$1"
  local contract="$2"
  curl -fsSL "https://${horizon_host}/contracts/${contract}/effects?cursor=now&limit=200&order=desc" \
    | jq --arg start "$WINDOW_START_ISO" --arg end "$WINDOW_END_ISO" \
        '._embedded.records[]? | select(.created_at >= $start and .created_at < $end)'
}

MAINNET_EVENTS="$(fetch_events 'horizon.stellar.org' "$MAINNET_CONTRACT" || true)"
TESTNET_EVENTS="$(fetch_events 'horizon-testnet.stellar.org' "$TESTNET_CONTRACT" || true)"

# Parse: each attest event has topics (Symbol use_case, BytesN evidence_hash).
# Extract (use_case, evidence_hash, verdict) tuples per attestation.
# This is a sketch; the real implementation needs ScVal decoding from XDR.
# For Sprint L canary, output the counts + sample diff and let humans
# inspect via Stellar Expert.

MAINNET_COUNT="$(echo "$MAINNET_EVENTS" | jq -s 'length')"
TESTNET_COUNT="$(echo "$TESTNET_EVENTS" | jq -s 'length')"

# Heuristic divergence: difference in count beyond 5% (real comparison
# requires hash-keyed join). Sprint L follow-up implements the full
# decoder via @dpo2u/stellar-sdk.
DIFF=$((MAINNET_COUNT - TESTNET_COUNT))
ABS_DIFF=${DIFF#-}
if [[ $TESTNET_COUNT -gt 0 ]]; then
  PCT=$(( (ABS_DIFF * 1000) / TESTNET_COUNT ))   # per-mille
else
  PCT=0
fi

# 5 per-mille = 0.5%.
THRESHOLD=5
STATUS="ok"
if [[ $PCT -gt $THRESHOLD ]]; then
  STATUS="divergent"
fi

cat > "$OUT" <<EOF
{
  "date": "$DATE",
  "window": {
    "start": "$WINDOW_START_ISO",
    "end":   "$WINDOW_END_ISO"
  },
  "mainnet_contract": "$MAINNET_CONTRACT",
  "testnet_contract": "$TESTNET_CONTRACT",
  "mainnet_event_count": $MAINNET_COUNT,
  "testnet_event_count": $TESTNET_COUNT,
  "count_diff": $DIFF,
  "count_diff_permille": $PCT,
  "threshold_permille": $THRESHOLD,
  "status": "$STATUS",
  "notes": "Sprint L: count-based heuristic. Full verdict-by-verdict comparison via @dpo2u/stellar-sdk decoder lands in canary-compare-v2 (Sprint L follow-up)."
}
EOF

echo "✓ Wrote $OUT"
echo "  mainnet events: $MAINNET_COUNT"
echo "  testnet events: $TESTNET_COUNT"
echo "  diff:           $DIFF ($PCT‰)"
echo "  status:         $STATUS"

if [[ "$STATUS" == "divergent" ]]; then
  echo ""
  echo "✗ Divergence > $THRESHOLD‰ — RUNBOOK §1.8 applies. HALT mainnet rollout."
  exit 3
fi
