#!/usr/bin/env bash
#
# configure-bid-protest.sh — registra UC bid_protest_overpricing_v1 (16º use case)
# no contrato anticorruption-attestation testnet.
#
# Use case: impugnação de licitação por sobrepreço (Art. 165 Lei 14.133/2021,
# 3 dias úteis após publicação da ata de julgamento). Empresa derrotada usa a
# atestação on-chain como evidência digitalmente fixada com timestamp.
#
# Predicate set: bid_protest_overpricing_v1 (5 predicados B1-B5, threshold Z>5).
# Idempotente: configure_use_case é no-op se já aplicado.
#
# Pre-conditions:
#   - stellar-cli >= 26.0.0
#   - testnet configurado (deploy-testnet.sh)
#   - identidade `dpo2u-deployer` existe e está funded
#   - scripts/deploy.json contém contract_id do anticorruption-attestation
#
# Uso:
#   ./scripts/configure-bid-protest.sh
#
# Outputs:
#   docs/demos/runs/<ISO>-bid-protest-config.json
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

IDENTITY="${STELLAR_IDENTITY:-dpo2u-deployer}"
NETWORK="testnet"
USE_CASE="bid_protest_overpricing_v1"
PREDICATE_SET="bid_protest_overpricing_v1"
PREDICATE_VERSION=1

say() { printf '\033[1;36m▸ %s\033[0m\n' "$*"; }
ok()  { printf '\033[1;32m✓ %s\033[0m\n' "$*"; }
hr()  { printf '\033[1;33m%s\033[0m\n' '═══════════════════════════════════════════════════════════════'; }

CONTRACT_ID="$(jq -r .contract_id scripts/deploy.json)"
ADMIN_PUBKEY="$(stellar keys address "$IDENTITY")"

hr
say "DPO2U — Bid Protest Use Case Registration (16º)"
hr
say "Contract:   $CONTRACT_ID"
say "Admin:      $ADMIN_PUBKEY"
say "Use case:   $USE_CASE"
say "Predicate:  $PREDICATE_SET v$PREDICATE_VERSION"
say "Reference:  Art. 165 Lei 14.133/2021 (3 dias úteis)"
say ""

# configure_use_case (idempotente)
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

# Persist log
OUT_DIR="docs/demos/runs"
mkdir -p "$OUT_DIR"
RUN_ID="$(date -u +%FT%H-%M-%S)"
OUT="$OUT_DIR/$RUN_ID-bid-protest-config.json"
cat > "$OUT" <<EOF
{
  "run_id": "$RUN_ID",
  "network": "$NETWORK",
  "contract_id": "$CONTRACT_ID",
  "admin": "$ADMIN_PUBKEY",
  "use_case_id": "$USE_CASE",
  "predicate_set": "$PREDICATE_SET",
  "predicate_version": $PREDICATE_VERSION,
  "legal_basis": "Lei 14.133/2021 Art. 165 — recurso administrativo (3 dias úteis)",
  "configure_use_case_tx": "$CONFIG_TX",
  "explorer_links": {
    "contract": "https://stellar.expert/explorer/testnet/contract/$CONTRACT_ID",
    "configure_use_case_tx": "https://stellar.expert/explorer/testnet/tx/$CONFIG_TX"
  },
  "completed_at": "$(date -u +%FT%TZ)"
}
EOF

hr
ok "Registro completo — use case bid_protest_overpricing_v1 ativo"
hr
say "Log:      $OUT"
say "Explorer: https://stellar.expert/explorer/testnet/contract/$CONTRACT_ID"
say "Próximo: rodar bid-protest-scan, atestar alertas via /api/v1/attestation/submit"
hr
