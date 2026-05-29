#!/usr/bin/env bash
#
# configure-mainnet-usecases.sh — ativa TODOS os use cases do catálogo "estado da arte"
# no contrato de attestation em MAINNET via configure_use_case (admin-only, idempotente).
#
# Ids vêm da FONTE ÚNICA: o catálogo do SDK (sdk/src/use-cases.ts → dist). 62 use cases
# (6 B2G + 22 jurisdições + 8 eventos + 12 AI gov + 13 cripto/setorial + 1 ZK).
#
# ROBUSTEZ (shake-down): fail-fast por invoke (stderr capturado, NÃO silenciado),
# checkpoint do último uc OK, e RESUME_FROM=<uc> para retomar sem regastar gas.
# zk_compliance_v1 incluído se INCLUDE_ZK=1 (cerimônia concluída → confiável).
#
# Uso:
#   ./scripts/configure-mainnet-usecases.sh
#   RESUME_FROM=ai_eu_aia_v1 ./scripts/configure-mainnet-usecases.sh   # retoma de um ponto
#   INCLUDE_ZK=0 ./scripts/configure-mainnet-usecases.sh

set -euo pipefail
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"; cd "$REPO_ROOT"

IDENTITY="${STELLAR_MAINNET_IDENTITY:-dpo2u-pilot-mainnet}"
NETWORK="public"
PREDICATE_VERSION="${PREDICATE_VERSION:-1}"
INCLUDE_ZK="${INCLUDE_ZK:-1}"
RESUME_FROM="${RESUME_FROM:-}"
CHECKPOINT="scripts/.configure-mainnet.checkpoint"

say(){ printf '\033[1;36m▸ %s\033[0m\n' "$*"; }
ok(){ printf '\033[1;32m✓ %s\033[0m\n' "$*"; }
err(){ printf '\033[1;31m✗ %s\033[0m\n' "$*" >&2; }

# SDK buildado (fonte dos ids) — fail-fast, sem silenciar.
if [ ! -f sdk/dist/use-cases.js ]; then
  say "Buildando SDK (fonte dos ids)…"
  ( cd sdk && npm run build ) || { err "build do SDK falhou — abortando"; exit 1; }
fi

mapfile -t USE_CASES < <(node -e "
const m=require('./sdk/dist/use-cases.js');
const inc='${INCLUDE_ZK}'==='1';
const list = inc ? m.USE_CASES : m.deployableUseCases();
for (const u of list) console.log(u.id);
")
[[ ${#USE_CASES[@]} -gt 0 ]] || { err "catálogo vazio — build do SDK falhou?"; exit 1; }

[[ -f scripts/deploy-mainnet.json ]] || { err "scripts/deploy-mainnet.json ausente — rode o deploy primeiro"; exit 1; }
CONTRACT_ID="$(jq -r '.contracts.anticorruption_attestation.contract_id' scripts/deploy-mainnet.json)"
ADMIN_PUBKEY="$(stellar keys address "$IDENTITY")"
say "Contract: $CONTRACT_ID   Admin: $ADMIN_PUBKEY   use cases: ${#USE_CASES[@]} (INCLUDE_ZK=$INCLUDE_ZK)"

skipping=0; [[ -n "$RESUME_FROM" ]] && { skipping=1; say "Retomando a partir de '$RESUME_FROM'…"; }
done_count=0
for uc in "${USE_CASES[@]}"; do
  if [[ $skipping -eq 1 ]]; then
    [[ "$uc" == "$RESUME_FROM" ]] && skipping=0 || { say "(pulado: $uc — antes do RESUME_FROM)"; continue; }
  fi
  say "configure_use_case: $uc (v$PREDICATE_VERSION)"
  LOG="$(mktemp)"
  if stellar contract invoke \
      --id "$CONTRACT_ID" --source "$IDENTITY" --network "$NETWORK" \
      -- configure_use_case \
      --admin "$ADMIN_PUBKEY" \
      --use_case_id "$uc" \
      --config "{\"active\":true,\"predicate_set\":\"$uc\",\"predicate_version\":$PREDICATE_VERSION}" \
      >/dev/null 2>"$LOG"; then
    echo "$uc" > "$CHECKPOINT"
    done_count=$((done_count+1))
    ok "$uc ativo"
  else
    err "FALHA ao configurar '$uc' (config $((done_count+1))/${#USE_CASES[@]}). Stderr:"
    sed 's/^/    /' "$LOG" >&2
    err "Retome de onde parou (não regasta os já feitos):"
    err "    RESUME_FROM=$uc ./scripts/configure-mainnet-usecases.sh"
    exit 1
  fi
done

ok "$done_count use cases configurados (estado da arte). checkpoint: $CHECKPOINT"
