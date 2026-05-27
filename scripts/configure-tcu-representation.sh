#!/usr/bin/env bash
# configure-tcu-representation.sh — registra UC tcu_representation_v1 (17º)
# no contrato anticorruption-attestation testnet.
#
# Use case: Representação ao TCU por sobrepreço (Art. 237 RITCU + Art. 53 Lei
# 8.443/1992). Prazo decadencial 5 anos. Cobertura nacional (qualquer plataforma
# consolidada no PNCP), sem janela de 3 dias úteis.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

IDENTITY="${STELLAR_IDENTITY:-dpo2u-deployer}"
NETWORK="testnet"
USE_CASE="tcu_representation_v1"
PREDICATE_SET="tcu_representation_v1"
PREDICATE_VERSION=1

say() { printf '\033[1;36m▸ %s\033[0m\n' "$*"; }
ok()  { printf '\033[1;32m✓ %s\033[0m\n' "$*"; }
hr()  { printf '\033[1;33m%s\033[0m\n' '═══════════════════════════════════════════════════════════════'; }

CONTRACT_ID="$(jq -r .contract_id scripts/deploy.json)"
ADMIN_PUBKEY="$(stellar keys address "$IDENTITY")"

hr
say "DPO2U — TCU Representation Use Case Registration (17º)"
hr
say "Contract:   $CONTRACT_ID"
say "Admin:      $ADMIN_PUBKEY"
say "Use case:   $USE_CASE"
say "Predicate:  $PREDICATE_SET v$PREDICATE_VERSION"
say "Reference:  Art. 237 RITCU + Art. 53 Lei 8.443/1992 (prazo decadencial 5 anos)"
say ""

say "configure_use_case → $USE_CASE"
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

OUT_DIR="docs/demos/runs"
mkdir -p "$OUT_DIR"
RUN_ID="$(date -u +%FT%H-%M-%S)"
OUT="$OUT_DIR/$RUN_ID-tcu-representation-config.json"
cat > "$OUT" <<EOF
{
  "run_id": "$RUN_ID",
  "network": "$NETWORK",
  "contract_id": "$CONTRACT_ID",
  "admin": "$ADMIN_PUBKEY",
  "use_case_id": "$USE_CASE",
  "predicate_set": "$PREDICATE_SET",
  "predicate_version": $PREDICATE_VERSION,
  "legal_basis": "Art. 237 RITCU + Art. 53 Lei 8.443/1992 + Lei Complementar 105/2001 Art. 23",
  "configure_use_case_tx": "$CONFIG_TX",
  "explorer_links": {
    "contract": "https://stellar.expert/explorer/testnet/contract/$CONTRACT_ID",
    "configure_use_case_tx": "https://stellar.expert/explorer/testnet/tx/$CONFIG_TX"
  },
  "completed_at": "$(date -u +%FT%TZ)"
}
EOF

hr
ok "Registro completo — use case tcu_representation_v1 ativo"
hr
say "Log:      $OUT"
say "Explorer: https://stellar.expert/explorer/testnet/contract/$CONTRACT_ID"
hr
