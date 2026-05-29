#!/usr/bin/env bash
#
# authorize-members-mainnet.sh — autoriza os pubkeys Freighter dos 5 membros
# como submitters no contrato de attestation em MAINNET (authorize_submitter,
# admin-only, idempotente).
#
# Os membros mantêm autocustódia (Freighter); aqui só registramos o pubkey
# DELES na whitelist on-chain. A assinatura de cada register_attestation é
# feita pelo próprio membro (no Stellar Lab) — ver scripts/prepare-attestation-xdr.sh.
#
# Uso:
#   ./scripts/authorize-members-mainnet.sh G...AAA G...BBB G...CCC G...DDD G...EEE
#   # ou, um pubkey por linha:
#   ./scripts/authorize-members-mainnet.sh --file scripts/mainnet-members.txt

set -euo pipefail
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"; cd "$REPO_ROOT"

IDENTITY="${STELLAR_MAINNET_IDENTITY:-dpo2u-pilot-mainnet}"
NETWORK="public"

say(){ printf '\033[1;36m▸ %s\033[0m\n' "$*"; }
ok(){ printf '\033[1;32m✓ %s\033[0m\n' "$*"; }
err(){ printf '\033[1;31m✗ %s\033[0m\n' "$*" >&2; }

# Coleta pubkeys (args ou --file).
MEMBERS=()
if [[ "${1:-}" == "--file" ]]; then
  [[ -f "${2:-}" ]] || { err "arquivo não encontrado: ${2:-}"; exit 1; }
  while IFS= read -r line; do
    line="$(echo "$line" | tr -d '[:space:]')"
    [[ -n "$line" && ! "$line" =~ ^# ]] && MEMBERS+=("$line")
  done < "$2"
else
  MEMBERS=("$@")
fi
[[ ${#MEMBERS[@]} -gt 0 ]] || { err "nenhum pubkey informado"; exit 1; }

[[ -f scripts/deploy-mainnet.json ]] || { err "scripts/deploy-mainnet.json ausente — rode o deploy primeiro"; exit 1; }
CONTRACT_ID="$(jq -r '.contracts.anticorruption_attestation.contract_id' scripts/deploy-mainnet.json)"
ADMIN_PUBKEY="$(stellar keys address "$IDENTITY")"
say "Contract: $CONTRACT_ID   Admin: $ADMIN_PUBKEY   Membros: ${#MEMBERS[@]}"

for pk in "${MEMBERS[@]}"; do
  [[ "$pk" =~ ^G[A-Z2-7]{55}$ ]] || { err "pubkey inválido (formato G...): $pk"; exit 2; }
  say "authorize_submitter: $pk"
  stellar contract invoke \
    --id "$CONTRACT_ID" --source "$IDENTITY" --network "$NETWORK" \
    -- authorize_submitter \
    --admin "$ADMIN_PUBKEY" \
    --submitter "$pk" \
    --allowed true \
    >/dev/null 2>&1
  ok "$pk autorizado"
done

ok "${#MEMBERS[@]} membros autorizados como submitters."
