#!/usr/bin/env bash
#
# configure-trilha-testnet.sh — registra os 3 use cases da Trilha de Conformidade
# de Valor no contrato anticorruption-attestation (testnet):
#
#   • vasp_por_br_v1   — VASP PoR + segregação patrimonial (BCB Res 519/520/521)
#   • cvm_token_v1     — classificação CVM (Howey, Parecer 40/2022)
#   • agent_runtime_v1 — runtime governance de agente (assess + enforcement plan)
#
# `configure_use_case` é idempotente (no-op se já aplicado). predicate_set == id
# (espelha o set_id do gateway pilot-gateway/src/lib/predicates.ts).
#
# Pre-conditions: stellar-cli ≥ 26.0.0; identidade `dpo2u-deployer` (admin) funded;
# scripts/deploy.json com o contract_id. gateway-signer já deve estar autorizado
# (authorize_submitter) — senão register_attestation dá NotAuthorized.
#
# Uso: ./scripts/configure-trilha-testnet.sh
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

IDENTITY="${STELLAR_IDENTITY:-dpo2u-deployer}"
NETWORK="testnet"

# id : predicate_set : predicate_version
WEDGES=(
  "vasp_por_br_v1:vasp_por_br_v1:1"
  "cvm_token_v1:cvm_token_v1:2"
  "agent_runtime_v1:agent_runtime_v1:1"
)

say() { printf '\033[1;36m▸ %s\033[0m\n' "$*"; }
ok()  { printf '\033[1;32m✓ %s\033[0m\n' "$*"; }
hr()  { printf '\033[1;33m%s\033[0m\n' '═══════════════════════════════════════════════════════════════'; }

CONTRACT_ID="$(jq -r .contract_id scripts/deploy.json)"
ADMIN_PUBKEY="$(stellar keys address "$IDENTITY")"

hr
say "DPO2U — Trilha de Conformidade de Valor (3 use cases)"
hr
say "Contract: $CONTRACT_ID"
say "Admin:    $ADMIN_PUBKEY"
say ""

OUT_DIR="docs/demos/runs"
mkdir -p "$OUT_DIR"
RUN_ID="$(date -u +%FT%H-%M-%S)"
OUT="$OUT_DIR/$RUN_ID-trilha-config.json"
echo "{ \"run_id\": \"$RUN_ID\", \"network\": \"$NETWORK\", \"contract_id\": \"$CONTRACT_ID\", \"admin\": \"$ADMIN_PUBKEY\", \"use_cases\": [" > "$OUT"

first=1
for w in "${WEDGES[@]}"; do
  IFS=":" read -r UC PSET PVER <<< "$w"
  say "configure_use_case → $UC (v$PVER)"
  LOG="$(mktemp)"
  stellar contract invoke \
    --id "$CONTRACT_ID" --source "$IDENTITY" --network "$NETWORK" \
    -- configure_use_case \
    --admin "$ADMIN_PUBKEY" \
    --use_case_id "$UC" \
    --config "{\"active\":true,\"predicate_set\":\"$PSET\",\"predicate_version\":$PVER}" \
    2>&1 | tee "$LOG" >/dev/null
  TX="$(grep -oE '[a-f0-9]{64}' "$LOG" | head -n 1 || echo unknown)"
  ok "$UC tx: $TX"
  [ $first -eq 0 ] && echo "," >> "$OUT"
  first=0
  printf '{ "use_case_id": "%s", "predicate_set": "%s", "predicate_version": %s, "tx": "%s", "tx_url": "https://stellar.expert/explorer/testnet/tx/%s" }' \
    "$UC" "$PSET" "$PVER" "$TX" "$TX" >> "$OUT"
done

echo "], \"completed_at\": \"$(date -u +%FT%TZ)\" }" >> "$OUT"

hr
ok "Trilha configurada — 3 use cases ativos"
say "Log:      $OUT"
say "Contract: https://stellar.expert/explorer/testnet/contract/$CONTRACT_ID"
hr
