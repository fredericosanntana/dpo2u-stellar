#!/usr/bin/env bash
#
# prepare-attestation-xdr.sh — monta a transação register_attestation
# NÃO-ASSINADA para um membro assinar no Stellar Lab (Freighter), sem frontend.
#
# O operador roda isto; o membro recebe o XDR, abre lab.stellar.org →
# "Sign Transaction", cola, confere, assina com o Freighter dele e submete.
# Como o membro é a CONTA-FONTE, a assinatura dele satisfaz submitter.require_auth().
#
# O VEREDITO deve vir da avaliação de predicado do gateway (lógica auditável).
# Aqui ele é um parâmetro — o operador roda o predicado antes e passa o resultado.
#
# Pré: membro já autorizado (authorize-members-mainnet.sh) e a conta dele
#      financiada (existe on-chain, para a simulação obter o sequence number).
#
# Uso:
#   ./scripts/prepare-attestation-xdr.sh \
#       --use-case sanction_check_v1 \
#       --member G...AAA \
#       --verdict Pass \
#       --evidence-file ./evidence.json \
#       [--request-id req-2026-05-29-001]

set -euo pipefail
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"; cd "$REPO_ROOT"
NETWORK="public"

USE_CASE="" MEMBER="" VERDICT="" EVIDENCE_FILE="" REQ_ID=""
while [[ $# -gt 0 ]]; do case "$1" in
  --use-case) USE_CASE="$2"; shift 2;;
  --member) MEMBER="$2"; shift 2;;
  --verdict) VERDICT="$2"; shift 2;;
  --evidence-file) EVIDENCE_FILE="$2"; shift 2;;
  --request-id) REQ_ID="$2"; shift 2;;
  *) echo "arg desconhecido: $1" >&2; exit 1;;
esac; done

err(){ printf '\033[1;31m✗ %s\033[0m\n' "$*" >&2; }
ok(){ printf '\033[1;32m✓ %s\033[0m\n' "$*"; }

[[ -n "$USE_CASE" && -n "$MEMBER" && -n "$VERDICT" && -n "$EVIDENCE_FILE" ]] \
  || { err "uso: --use-case <uc> --member <G..> --verdict <Pass|Fail|Review> --evidence-file <path>"; exit 1; }
[[ -f "$EVIDENCE_FILE" ]] || { err "evidence-file não encontrado: $EVIDENCE_FILE"; exit 1; }
[[ "$MEMBER" =~ ^G[A-Z2-7]{55}$ ]] || { err "pubkey de membro inválido: $MEMBER"; exit 2; }
case "$VERDICT" in Pass|Fail|Review) ;; *) err "verdict deve ser Pass|Fail|Review"; exit 2;; esac

[[ -f scripts/deploy-mainnet.json ]] || { err "scripts/deploy-mainnet.json ausente"; exit 1; }
CONTRACT_ID="$(jq -r '.contracts.anticorruption_attestation.contract_id' scripts/deploy-mainnet.json)"
[[ -n "$REQ_ID" ]] || REQ_ID="req-$(date -u +%s)"

# Hashes (mesma convenção do demo-testnet-roundtrip.sh: sha256 dos bytes exatos).
EVIDENCE_JSON="$(cat "$EVIDENCE_FILE")"
EVIDENCE_HASH="$(printf '%s' "$EVIDENCE_JSON" | sha256sum | awk '{print $1}')"
VERDICT_UPPER="$(echo "$VERDICT" | tr '[:lower:]' '[:upper:]')"
METADATA_JSON="{\"schema\":\"dpo2u.attestation.metadata/v1\",\"request_id\":\"$REQ_ID\",\"use_case_id\":\"$USE_CASE\",\"verdict\":\"$VERDICT_UPPER\"}"
METADATA_HASH="$(printf '%s' "$METADATA_JSON" | sha256sum | awk '{print $1}')"

# Monta a tx NÃO-ASSINADA (--build-only → source aceita pubkey, não assina).
XDR="$(stellar contract invoke \
  --id "$CONTRACT_ID" --source "$MEMBER" --network "$NETWORK" --build-only \
  -- register_attestation \
  --submitter "$MEMBER" \
  --use_case_id "$USE_CASE" \
  --verdict "$VERDICT" \
  --evidence_hash "$EVIDENCE_HASH" \
  --metadata_hash "$METADATA_HASH")"

# Persiste o artefato.
OUT_DIR="docs/demos/runs/mainnet"; mkdir -p "$OUT_DIR"
SLUG="$(date -u +%FT%H-%M-%S)-${USE_CASE}-${MEMBER:0:6}"
OUT="$OUT_DIR/$SLUG.json"
cat > "$OUT" <<EOF
{
  "network": "public",
  "contract_id": "$CONTRACT_ID",
  "use_case_id": "$USE_CASE",
  "submitter": "$MEMBER",
  "verdict": "$VERDICT",
  "request_id": "$REQ_ID",
  "evidence_hash": "$EVIDENCE_HASH",
  "metadata_hash": "$METADATA_HASH",
  "unsigned_xdr": "$XDR",
  "prepared_at": "$(date -u +%FT%TZ)"
}
EOF

ok "evidence_hash: $EVIDENCE_HASH"
ok "metadata_hash: $METADATA_HASH"
ok "artefato: $OUT"
echo ""
echo "── Envie ao membro $MEMBER ──────────────────────────────────────────"
echo "1) Abra https://lab.stellar.org → Sign Transaction (rede: Public/Mainnet)"
echo "2) Cole o XDR abaixo, confira (submitter=$MEMBER, use_case=$USE_CASE, verdict=$VERDICT)"
echo "3) Assine com o Freighter e submeta."
echo ""
echo "XDR (não-assinado):"
echo "$XDR"
echo ""
echo "Verificação pública depois (qualquer um, sem credencial):"
echo "  dpo2u-attest verify $USE_CASE $EVIDENCE_HASH   # via mainnetClient"
