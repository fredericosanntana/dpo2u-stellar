#!/usr/bin/env bash
#
# demo-testnet-roundtrip.sh — full anchor round-trip on Stellar testnet.
#
# Reproduces docs/demos/2026-05-14-testnet-anchor-roundtrip.md end-to-end.
# Idempotent: configure_use_case + authorize_submitter are no-ops if already
# applied. register_attestation will revert (AttestationExists #3) on second
# run with the same evidence hash — that revert IS the demo's idempotency
# guarantee.
#
# Pre-conditions:
#   - stellar-cli >= 26.0.0 installed
#   - testnet network configured (deploy-testnet.sh does this)
#   - identity `dpo2u-deployer` exists and is funded
#   - contract id in scripts/deploy.json
#
# Usage:
#   ./scripts/demo-testnet-roundtrip.sh
#
# Outputs:
#   docs/demos/runs/<UTC-ISO>-roundtrip.json
#
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

IDENTITY="${STELLAR_IDENTITY:-dpo2u-deployer}"
NETWORK="testnet"
USE_CASE="${USE_CASE:-bank_chg}"
PREDICATE_SET="${PREDICATE_SET:-bank_chg}"
PREDICATE_VERSION="${PREDICATE_VERSION:-1}"

say() { printf '\033[1;36m▸ %s\033[0m\n' "$*"; }
ok()  { printf '\033[1;32m✓ %s\033[0m\n' "$*"; }
hr()  { printf '\033[1;33m%s\033[0m\n' '═══════════════════════════════════════════════════════════════'; }

CONTRACT_ID="$(jq -r .contract_id scripts/deploy.json)"
ADMIN_PUBKEY="$(stellar keys address "$IDENTITY")"

hr
say "DPO2U Testnet Anchor — Full Round-Trip"
hr
say "Contract:  $CONTRACT_ID"
say "Admin:     $ADMIN_PUBKEY"
say "Use case:  $USE_CASE (predicate_set $PREDICATE_SET v$PREDICATE_VERSION)"
say ""

# 1. Configure use case.
say "Step 1/4: configure_use_case"
CONFIG_LOG="$(mktemp)"
stellar contract invoke \
  --id "$CONTRACT_ID" --source "$IDENTITY" --network "$NETWORK" \
  -- configure_use_case \
  --admin "$ADMIN_PUBKEY" \
  --use_case_id "$USE_CASE" \
  --config "{\"active\":true,\"predicate_set\":\"$PREDICATE_SET\",\"predicate_version\":$PREDICATE_VERSION}" \
  2>&1 | tee "$CONFIG_LOG" >/dev/null
CONFIG_TX="$(grep -oE '[a-f0-9]{64}' "$CONFIG_LOG" | head -n 1 || echo unknown)"
ok "configure_use_case tx: $CONFIG_TX"

# 2. Authorize submitter (idempotent — no-op if already authorized).
say "Step 2/4: authorize_submitter (idempotent)"
AUTH_LOG="$(mktemp)"
stellar contract invoke \
  --id "$CONTRACT_ID" --source "$IDENTITY" --network "$NETWORK" \
  -- authorize_submitter \
  --admin "$ADMIN_PUBKEY" \
  --submitter "$ADMIN_PUBKEY" \
  --allowed true \
  2>&1 | tee "$AUTH_LOG" >/dev/null
AUTH_TX="$(grep -oE '[a-f0-9]{64}' "$AUTH_LOG" | head -n 1 || echo unknown)"
ok "authorize_submitter tx: $AUTH_TX"

# 3. Build evidence + metadata, compute hashes.
say "Step 3/4: register_attestation"
TIMESTAMP_ISO="$(date -u +%FT%H:%M:%SZ)"
REQ_ID="demo-$(date -u +%s)"
EVIDENCE_JSON="{\"supplier_cnpj\":\"11.222.333/0001-81\",\"new_account_holder_cnpj\":\"11.222.333/0001-81\",\"new_account_bank_ispb\":\"60701190\",\"request_channel\":\"portal_oficial\",\"timestamp\":\"$TIMESTAMP_ISO\",\"request_id\":\"$REQ_ID\"}"
EVIDENCE_HASH="$(echo -n "$EVIDENCE_JSON" | sha256sum | awk '{print $1}')"
METADATA_JSON="{\"schema\":\"dpo2u.attestation.metadata/v1\",\"request_id\":\"$REQ_ID\",\"use_case_id\":\"$USE_CASE\",\"verdict\":\"PASS\"}"
METADATA_HASH="$(echo -n "$METADATA_JSON" | sha256sum | awk '{print $1}')"
ok "evidence_hash: $EVIDENCE_HASH"
ok "metadata_hash: $METADATA_HASH"

REG_LOG="$(mktemp)"
stellar contract invoke \
  --id "$CONTRACT_ID" --source "$IDENTITY" --network "$NETWORK" \
  -- register_attestation \
  --submitter "$ADMIN_PUBKEY" \
  --use_case_id "$USE_CASE" \
  --verdict Pass \
  --evidence_hash "$EVIDENCE_HASH" \
  --metadata_hash "$METADATA_HASH" \
  2>&1 | tee "$REG_LOG" >/dev/null
REG_TX="$(grep -oE '[a-f0-9]{64}' "$REG_LOG" | head -n 1 || echo unknown)"
LEDGER_SEQ="$(tail -n 1 "$REG_LOG" | grep -oE '^[0-9]+$' || echo unknown)"
ok "register_attestation tx: $REG_TX  (ledger $LEDGER_SEQ)"

# 4. Verify (read-only, no tx).
say "Step 4/4: verify_attestation (read-only)"
VERIFY_LOG="$(mktemp)"
stellar contract invoke \
  --id "$CONTRACT_ID" --source "$IDENTITY" --network "$NETWORK" \
  -- verify_attestation \
  --use_case_id "$USE_CASE" \
  --evidence_hash "$EVIDENCE_HASH" \
  2>&1 | tee "$VERIFY_LOG" >/dev/null
VERIFY_RESULT="$(tail -n 1 "$VERIFY_LOG")"
ok "verify_attestation returned: $VERIFY_RESULT"

# 5. Persist log.
OUT_DIR="docs/demos/runs"
mkdir -p "$OUT_DIR"
RUN_ID="$(date -u +%FT%H-%M-%S)"
OUT="$OUT_DIR/$RUN_ID-roundtrip.json"
cat > "$OUT" <<EOF
{
  "run_id": "$RUN_ID",
  "network": "$NETWORK",
  "contract_id": "$CONTRACT_ID",
  "admin": "$ADMIN_PUBKEY",
  "use_case_id": "$USE_CASE",
  "predicate_set": "$PREDICATE_SET",
  "predicate_version": $PREDICATE_VERSION,
  "request_id": "$REQ_ID",
  "evidence_hash": "$EVIDENCE_HASH",
  "metadata_hash": "$METADATA_HASH",
  "transactions": {
    "configure_use_case": "$CONFIG_TX",
    "authorize_submitter": "$AUTH_TX",
    "register_attestation": "$REG_TX"
  },
  "ledger_seq": "$LEDGER_SEQ",
  "verify_result": $VERIFY_RESULT,
  "explorer_links": {
    "contract": "https://stellar.expert/explorer/testnet/contract/$CONTRACT_ID",
    "configure_use_case": "https://stellar.expert/explorer/testnet/tx/$CONFIG_TX",
    "register_attestation": "https://stellar.expert/explorer/testnet/tx/$REG_TX"
  },
  "completed_at": "$(date -u +%FT%TZ)"
}
EOF

hr
ok "Round-trip complete"
hr
say "Log:        $OUT"
say "Explorer:   https://stellar.expert/explorer/testnet/contract/$CONTRACT_ID"
say "Auditor CLI (qualquer um, sem credencial DPO2U):"
say "  npm i -g @dpo2u/stellar-sdk"
say "  dpo2u-attest verify $USE_CASE $EVIDENCE_HASH"
hr
