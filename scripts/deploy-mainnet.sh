#!/usr/bin/env bash
#
# DPO2U Anti-corruption Pilot — MAINNET deploy script.
#
# This script is invoked DURING the ceremony described in
# docs/MAINNET-CEREMONY.md §3.6. It is NOT a standalone tool.
#
# Pre-conditions (verified by this script before any irreversible op):
#   - EXPECTED_WASM_HASH env var set to the hash from the audit report.
#   - Built wasm hash matches EXPECTED_WASM_HASH.
#   - Network "public" configured.
#   - Identity "dpo2u-admin-mainnet" exists (ledger-backed).
#   - Manual confirmation phrase typed verbatim.
#
# Outputs:
#   scripts/deploy-mainnet.json  — committed artifact with contract id,
#                                  wasm hash, deploy tx hash, ledger seq.
#
# Cost: ~1 XLM (well within 200 XLM funded admin account).
#
# THIS DEPLOY IS IRREVERSIBLE — THE CONTRACT IS IMMUTABLE.

set -euo pipefail
shopt -s nullglob

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

# ─── Configurable via env ──────────────────────────────────────────────
IDENTITY="${STELLAR_MAINNET_IDENTITY:-dpo2u-admin-mainnet}"
NETWORK="public"
RPC_URL="${STELLAR_MAINNET_RPC_URL:-https://soroban-mainnet.stellar.org}"
PASSPHRASE="${STELLAR_MAINNET_PASSPHRASE:-Public Global Stellar Network ; September 2015}"
CONTRACT_NAME="anticorruption_attestation"
WASM_DIR="target/wasm32v1-none/release"
WASM="$WASM_DIR/${CONTRACT_NAME}.optimized.wasm"
RAW_WASM="$WASM_DIR/${CONTRACT_NAME}.wasm"

CONFIRMATION_PHRASE='I-UNDERSTAND-THIS-IS-MAINNET-AND-IRREVERSIBLE'

# ─── Hard checks (fail-fast before anything irreversible) ──────────────
say() { printf '\033[1;36m▸ %s\033[0m\n' "$*"; }
err() { printf '\033[1;31m✗ %s\033[0m\n' "$*" >&2; }
ok()  { printf '\033[1;32m✓ %s\033[0m\n' "$*"; }
hr()  { printf '\033[1;33m%s\033[0m\n' '════════════════════════════════════════════════════════════════════'; }

require_env() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    err "Missing required env var: $name"
    exit 2
  fi
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || { err "missing binary: $1"; exit 2; }
}

hr
say "DPO2U MAINNET DEPLOY CEREMONY — execution"
hr
say "Repository:     $REPO_ROOT"
say "Network:        $NETWORK"
say "Passphrase:     $PASSPHRASE"
say "RPC URL:        $RPC_URL"
say "Identity:       $IDENTITY"
say ""

# 1. Binaries present.
require_cmd stellar
require_cmd git
require_cmd jq
require_cmd sha256sum

# 2. Repo state clean.
say "Checking git state…"
if ! git diff --quiet || ! git diff --cached --quiet; then
  err "Working tree is dirty. Aborting."
  git status --short
  exit 3
fi
if [[ "$(git rev-parse --abbrev-ref HEAD)" != "main" ]]; then
  err "Must run from 'main' branch. Currently on $(git rev-parse --abbrev-ref HEAD)"
  exit 3
fi
LOCAL_MAIN="$(git rev-parse main)"
REMOTE_MAIN="$(git rev-parse origin/main 2>/dev/null || true)"
if [[ -n "$REMOTE_MAIN" && "$LOCAL_MAIN" != "$REMOTE_MAIN" ]]; then
  err "Local main ($LOCAL_MAIN) ≠ origin/main ($REMOTE_MAIN). Pull or push first."
  exit 3
fi
COMMIT="$(git rev-parse --short HEAD)"
ok "Repo clean, on main, commit=$COMMIT"

# 3. Expected wasm hash from audit.
require_env EXPECTED_WASM_HASH
if [[ ! "$EXPECTED_WASM_HASH" =~ ^[0-9a-f]{64}$ ]]; then
  err "EXPECTED_WASM_HASH must be 64-hex; got: $EXPECTED_WASM_HASH"
  exit 2
fi
ok "Expected wasm hash (from audit): $EXPECTED_WASM_HASH"

# 4. Build artifact.
say "Building wasm…"
stellar contract build >/dev/null
stellar contract build --optimize >/dev/null 2>&1 || true
if [[ ! -f "$WASM" ]]; then
  # Older stellar-cli used contract optimize as separate step.
  stellar contract optimize --wasm "$RAW_WASM" >/dev/null
fi
[[ -f "$WASM" ]] || { err "optimized wasm not found: $WASM"; exit 4; }

BUILT_HASH="$(sha256sum "$WASM" | awk '{print $1}')"
ok "Built wasm:    $WASM"
ok "Built hash:    $BUILT_HASH"

if [[ "$BUILT_HASH" != "$EXPECTED_WASM_HASH" ]]; then
  err "WASM HASH MISMATCH"
  err "  expected: $EXPECTED_WASM_HASH"
  err "  built:    $BUILT_HASH"
  err "DO NOT proceed — the deployed bytes would not match the audited bytes."
  exit 5
fi
ok "Built hash matches audit hash"

# 5. Network registered.
say "Ensuring network 'public' is registered…"
stellar network add "$NETWORK" \
  --rpc-url "$RPC_URL" \
  --network-passphrase "$PASSPHRASE" 2>/dev/null || true
ok "Network ready"

# 6. Identity check.
if ! stellar keys address "$IDENTITY" >/dev/null 2>&1; then
  err "Identity '$IDENTITY' does not exist."
  err "Provision via: stellar keys add $IDENTITY --ledger --hd-path \"m/44'/148'/0'/0'/0'\""
  exit 6
fi
ADMIN_PUBKEY="$(stellar keys address "$IDENTITY")"
ok "Admin pubkey: $ADMIN_PUBKEY"

# 7. Funding sanity.
say "Checking admin balance (Horizon mainnet)…"
BALANCE_XLM="$(curl -fsSL "https://horizon.stellar.org/accounts/$ADMIN_PUBKEY" \
  | jq -r '.balances[] | select(.asset_type=="native") | .balance // "0"')"
if [[ -z "$BALANCE_XLM" || "${BALANCE_XLM%.*}" -lt 10 ]]; then
  err "Admin balance too low: $BALANCE_XLM XLM (need ≥ 10)"
  err "Fund $ADMIN_PUBKEY before retrying."
  exit 7
fi
ok "Admin balance: $BALANCE_XLM XLM"

# 8. Final confirmation gate.
hr
say "FINAL CONFIRMATION"
hr
say "About to deploy:"
say "  contract:     anticorruption-attestation"
say "  wasm hash:    $BUILT_HASH"
say "  git commit:   $COMMIT"
say "  to network:   $NETWORK"
say "  with admin:   $ADMIN_PUBKEY"
say ""
say "Type the following EXACT phrase to proceed (will be visible on the ceremony recording):"
say ""
say "  $CONFIRMATION_PHRASE"
say ""
read -r -p "Type phrase: " typed
if [[ "$typed" != "$CONFIRMATION_PHRASE" ]]; then
  err "Phrase did not match. Aborting."
  exit 8
fi
ok "Phrase confirmed."
hr

# ─── IRREVERSIBLE FROM HERE ────────────────────────────────────────────

say "Submitting deploy tx (Ledger Nano will prompt — confirm with both buttons)…"
DEPLOY_LOG="$(mktemp)"
CONTRACT_ID="$(stellar contract deploy \
  --wasm "$WASM" \
  --source "$IDENTITY" \
  --network "$NETWORK" \
  -- --admin "$ADMIN_PUBKEY" 2> "$DEPLOY_LOG")"

if [[ -z "$CONTRACT_ID" ]]; then
  err "Deploy returned empty contract id. See $DEPLOY_LOG"
  exit 9
fi
TX_HASH="$(grep -oE '[a-f0-9]{64}' "$DEPLOY_LOG" | tail -n 1 || true)"

ok "Contract deployed!"
ok "  contract id:  $CONTRACT_ID"
ok "  tx hash:      $TX_HASH"

# Capture ledger seq from Horizon (best-effort).
sleep 2
LEDGER_SEQ="$(curl -fsSL "https://horizon.stellar.org/transactions/$TX_HASH" 2>/dev/null \
  | jq -r '.ledger // empty')"

cat > scripts/deploy-mainnet.json <<EOF
{
  "network": "$NETWORK",
  "passphrase": "$PASSPHRASE",
  "rpc_url": "$RPC_URL",
  "admin_pubkey": "$ADMIN_PUBKEY",
  "contract_id": "$CONTRACT_ID",
  "wasm_hash": "$BUILT_HASH",
  "expected_wasm_hash_audit": "$EXPECTED_WASM_HASH",
  "deploy_tx_hash": "$TX_HASH",
  "ledger_seq": ${LEDGER_SEQ:-null},
  "git_commit": "$COMMIT",
  "deployed_at": "$(date -u +%FT%TZ)",
  "explorer": {
    "contract": "https://stellar.expert/explorer/public/contract/$CONTRACT_ID",
    "deploy_tx": "https://stellar.expert/explorer/public/tx/$TX_HASH"
  }
}
EOF
ok "Wrote scripts/deploy-mainnet.json"

hr
say "DEPLOY COMPLETE — CONTRACT LIVE ON MAINNET"
hr
say "Contract:    $CONTRACT_ID"
say "Explorer:    https://stellar.expert/explorer/public/contract/$CONTRACT_ID"
say ""
say "Next ceremony steps (see docs/MAINNET-CEREMONY.md §3.7 onward):"
say "  1. Setup SEP-30 multisig (setOptions ops + 2 cosigner adds)"
say "  2. authorize_submitter for the operating issuer"
say "  3. configure_use_case for bank_change_v1, payment_doc_v1, erasure_v1"
say "  4. Smoke attestation E2E + canary"
say ""
say "Commit scripts/deploy-mainnet.json to the repo BEFORE the next ceremony step."
hr
