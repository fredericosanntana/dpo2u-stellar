#!/usr/bin/env bash
# Deploy dpo2u-stellar anticorruption-attestation to Stellar testnet.
# Idempotent: skips funding/network add if already configured. Writes deploy.json.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

IDENTITY="${STELLAR_IDENTITY:-dpo2u-deployer}"
NETWORK="testnet"
RPC_URL="https://soroban-testnet.stellar.org"
PASSPHRASE="Test SDF Network ; September 2015"
WASM="target/wasm32v1-none/release/anticorruption_attestation.optimized.wasm"

echo "▸ Configuring network ($NETWORK)..."
stellar network add "$NETWORK" \
  --rpc-url "$RPC_URL" \
  --network-passphrase "$PASSPHRASE" 2>/dev/null || true

echo "▸ Ensuring identity ($IDENTITY) exists and is funded..."
if ! stellar keys address "$IDENTITY" >/dev/null 2>&1; then
  stellar keys generate "$IDENTITY" --network "$NETWORK" --fund
else
  # Try to fund again in case the account was created earlier without funding.
  stellar keys fund "$IDENTITY" --network "$NETWORK" 2>/dev/null || true
fi

DEPLOYER_PUBKEY="$(stellar keys address "$IDENTITY")"
echo "▸ Deployer public key: $DEPLOYER_PUBKEY"

echo "▸ Building + optimizing wasm..."
stellar contract build
stellar contract optimize --wasm target/wasm32v1-none/release/anticorruption_attestation.wasm

echo "▸ Deploying to $NETWORK..."
DEPLOY_LOG="$(mktemp)"
CONTRACT_ID="$(stellar contract deploy \
  --wasm "$WASM" \
  --source "$IDENTITY" \
  --network "$NETWORK" \
  -- __constructor --admin "$DEPLOYER_PUBKEY" 2> "$DEPLOY_LOG")"

# Tx hash is logged to stderr by stellar-cli; grep it.
TX_HASH="$(grep -oE '[a-f0-9]{64}' "$DEPLOY_LOG" | tail -n 1 || true)"

cat > scripts/deploy.json <<EOF
{
  "network": "$NETWORK",
  "passphrase": "$PASSPHRASE",
  "deployer_pubkey": "$DEPLOYER_PUBKEY",
  "contract_id": "$CONTRACT_ID",
  "deploy_tx_hash": "$TX_HASH",
  "wasm": "$WASM",
  "deployed_at": "$(date -u +%FT%TZ)"
}
EOF

echo ""
echo "════════════════════════════════════════════════════"
echo "  Deploy OK"
echo "════════════════════════════════════════════════════"
echo "  Deployer:    $DEPLOYER_PUBKEY"
echo "  Contract:    $CONTRACT_ID"
echo "  Deploy tx:   $TX_HASH"
echo "  Explorer:    https://stellar.expert/explorer/testnet/contract/$CONTRACT_ID"
echo "════════════════════════════════════════════════════"
