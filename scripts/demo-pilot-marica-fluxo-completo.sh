#!/usr/bin/env bash
#
# demo-pilot-marica-fluxo-completo.sh
#
# Demonstra o fluxo completo do Piloto Anticorrupção da DPO2U pra apresentar
# ao município de Maricá:
#
#   Ato 1 — Operador município abre o console (gateway /healthz)
#   Ato 2 — Operador submete payload bank_chg via POST /api/v1/attestation/submit
#   Ato 3 — Gateway roda 5 predicates, assina e ancora on-chain na Stellar testnet
#   Ato 4 — Operador faz polling GET /api/v1/attestation/:id até COMPLETED
#   Ato 5 — Auditor externo (TCE/CGU) verifica trustless via @dpo2u/stellar-sdk
#
# Diferença vs demo-testnet-roundtrip.sh:
#   - aquele invocava o contrato direto via stellar CLI (caminho admin)
#   - este passa pelo gateway REST (caminho operador município = produção real)
#
# Pre-conditions:
#   - PILOT_API_KEY no env (PILOT_DEMO_API_KEY do gateway, ou JWT raw)
#   - jq, curl, sha256sum disponíveis
#   - opcional: @dpo2u/stellar-sdk instalado globalmente (npm i -g @dpo2u/stellar-sdk)
#
# Usage:
#   PILOT_API_KEY=xxx ./scripts/demo-pilot-marica-fluxo-completo.sh
#   PILOT_API_KEY=xxx VERDICT=fail ./scripts/demo-pilot-marica-fluxo-completo.sh   # variante FAIL
#
# Output:
#   docs/demos/runs/<UTC-ISO>-pilot-marica.json

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

GATEWAY_URL="${PILOT_GATEWAY_URL:-https://mcp.dpo2u.com}"
API_KEY="${PILOT_API_KEY:-}"
USE_CASE="${USE_CASE:-bank_chg}"
VERDICT_TARGET="${VERDICT:-pass}"   # pass | fail
POLL_MAX_SEC="${POLL_MAX_SEC:-60}"

if [[ -z "$API_KEY" ]]; then
  echo "ERROR: PILOT_API_KEY env var not set." >&2
  echo "Hint: PILOT_API_KEY=\$(cd /root/DPO2U/packages/pilot-gateway && sops -d --input-type=dotenv --output-type=dotenv .env.encrypted | grep ^PILOT_DEMO_API_KEY= | cut -d= -f2- | tr -d '\"')" >&2
  exit 2
fi

CONTRACT_ID="$(jq -r .contract_id scripts/deploy.json)"
EXPLORER="https://stellar.expert/explorer/testnet"

say()    { printf '\033[1;36m▸ %s\033[0m\n' "$*"; }
ok()     { printf '\033[1;32m✓ %s\033[0m\n' "$*"; }
warn()   { printf '\033[1;33m! %s\033[0m\n' "$*"; }
err()    { printf '\033[1;31m✗ %s\033[0m\n' "$*" >&2; }
hr()     { printf '\033[1;33m%s\033[0m\n' '═══════════════════════════════════════════════════════════════'; }
banner() { hr; printf '\033[1;35m  %s\033[0m\n' "$*"; hr; }

# ----------------------------------------------------------------------------
banner "DPO2U Pilot Anticorrupção — Fluxo Completo (Maricá)"
say "Contrato Soroban:   $CONTRACT_ID"
say "Gateway REST:        $GATEWAY_URL"
say "Use case:            $USE_CASE (predicate v1)"
say "Verdict alvo:        $VERDICT_TARGET"
echo ""

# ============================================================================
# Ato 1 — Operador entra no console
# ============================================================================
banner "Ato 1/5 — Operador município abre o console"
HEALTHZ_RESP="$(curl -sS -H "x-api-key: $API_KEY" -w "\n%{http_code}" "$GATEWAY_URL/api/v1/healthz")"
HEALTHZ_CODE="$(echo "$HEALTHZ_RESP" | tail -n 1)"
HEALTHZ_BODY="$(echo "$HEALTHZ_RESP" | head -n -1)"
if [[ "$HEALTHZ_CODE" != "200" ]]; then
  err "Login falhou — HTTP $HEALTHZ_CODE: $HEALTHZ_BODY"
  exit 3
fi
ok "Login OK — $(echo "$HEALTHZ_BODY" | jq -c '{status, version}')"
echo ""

# ============================================================================
# Ato 2 — Operador submete payload (mudança de conta bancária)
# ============================================================================
banner "Ato 2/5 — Operador submete pedido de mudança de conta bancária"
REQ_ID="marica-demo-$(date -u +%s)-$(head -c 4 /dev/urandom | xxd -p)"
# audit_seed garante evidence_hash único por run — útil pra apresentação.
# Em produção real, o operador fornece evidência sobre uma operação concreta
# (uma operação = um hash determinístico), então NÃO há audit_seed.
AUDIT_SEED="$(date -u +%s%N)-$(head -c 8 /dev/urandom | xxd -p)"

if [[ "$VERDICT_TARGET" == "fail" ]]; then
  # Caminho fraude — CNPJ diferente, canal não-oficial, domínio inválido.
  EVIDENCE="$(jq -n --arg seed "$AUDIT_SEED" '{
    supplier_cnpj: "11.222.333/0001-81",
    new_account_holder_cnpj: "99.888.777/0001-66",
    new_account_bank_ispb: "00000000",
    request_channel: "email_externo",
    sender_email_domain: "atacante.example.com",
    expected_municipal_domain: "marica.rj.gov.br",
    audit_seed: $seed
  }')"
  say "Variante FAIL — paint da fraude TJDFT (CNPJ divergente, canal externo)"
else
  # Caminho legítimo — CNPJ bate, canal oficial, domínio confere, banco regulado.
  EVIDENCE="$(jq -n --arg seed "$AUDIT_SEED" '{
    supplier_cnpj: "11.222.333/0001-81",
    new_account_holder_cnpj: "11.222.333/0001-81",
    new_account_bank_ispb: "60701190",
    request_channel: "portal_oficial",
    sender_email_domain: "marica.rj.gov.br",
    expected_municipal_domain: "marica.rj.gov.br",
    audit_seed: $seed
  }')"
  say "Variante PASS — operação legítima conforme controle interno"
fi

PAYLOAD="$(jq -n --arg use_case "$USE_CASE" --arg req_id "$REQ_ID" --argjson evidence "$EVIDENCE" \
  '{use_case_id: $use_case, request_id: $req_id, evidence: $evidence}')"
say "request_id: $REQ_ID"

SUBMIT_RESP="$(curl -sS -X POST \
  -H "x-api-key: $API_KEY" \
  -H "content-type: application/json" \
  -d "$PAYLOAD" \
  -w "\n%{http_code}" \
  "$GATEWAY_URL/api/v1/attestation/submit")"
SUBMIT_CODE="$(echo "$SUBMIT_RESP" | tail -n 1)"
SUBMIT_BODY="$(echo "$SUBMIT_RESP" | head -n -1)"
if [[ "$SUBMIT_CODE" != "200" ]]; then
  err "Submit falhou — HTTP $SUBMIT_CODE: $SUBMIT_BODY"
  exit 4
fi
ATTEMPT_ID="$(echo "$SUBMIT_BODY" | jq -r .attempt_id)"
SUBMIT_STATUS="$(echo "$SUBMIT_BODY" | jq -r .status)"
ok "Gateway aceitou — attempt_id=$ATTEMPT_ID status=$SUBMIT_STATUS"
echo ""

# ============================================================================
# Ato 3 + 4 — Gateway ancora on-chain; operador faz polling até COMPLETED
# ============================================================================
banner "Ato 3-4/5 — Gateway âncora a evidência on-chain (Stellar testnet)"
say "Predicates rodando off-chain; gateway assina e envia tx Soroban..."
echo ""
START="$(date +%s)"
POLL_RESULT=""
while true; do
  NOW="$(date +%s)"
  ELAPSED=$(( NOW - START ))
  if [[ $ELAPSED -ge $POLL_MAX_SEC ]]; then
    err "Polling timeout — ${POLL_MAX_SEC}s sem COMPLETED/FAILED"
    exit 5
  fi
  POLL_RESP="$(curl -sS -H "x-api-key: $API_KEY" "$GATEWAY_URL/api/v1/attestation/$ATTEMPT_ID")"
  POLL_STATUS="$(echo "$POLL_RESP" | jq -r .status)"
  printf '\r  [%2ds] status=%s' "$ELAPSED" "$POLL_STATUS"
  if [[ "$POLL_STATUS" == "COMPLETED" || "$POLL_STATUS" == "FAILED" ]]; then
    POLL_RESULT="$POLL_RESP"
    echo ""
    break
  fi
  sleep 2
done

if [[ "$POLL_STATUS" == "FAILED" ]]; then
  err "Atestação falhou:"
  echo "$POLL_RESULT" | jq .error
  exit 6
fi

VERDICT_FINAL="$(echo "$POLL_RESULT" | jq -r .result.verdict)"
EVIDENCE_HASH="$(echo "$POLL_RESULT" | jq -r .result.evidence_hash_hex)"
METADATA_HASH="$(echo "$POLL_RESULT" | jq -r .result.metadata_hash_hex)"
TX_HASH="$(echo "$POLL_RESULT" | jq -r .result.tx.innerTxHash)"
LEDGER="$(echo "$POLL_RESULT" | jq -r .result.tx.ledger)"
PRED_COUNT="$(echo "$POLL_RESULT" | jq '.result.predicate_results | length')"
ok "Atestação COMPLETED em ${ELAPSED}s"
say "verdict:        $VERDICT_FINAL"
say "evidence_hash:  $EVIDENCE_HASH"
say "metadata_hash:  $METADATA_HASH"
say "tx hash:        $TX_HASH"
say "ledger:         $LEDGER"
say "predicates:     $PRED_COUNT/5 avaliados"
echo ""
say "Predicate results:"
echo "$POLL_RESULT" | jq -r '.result.predicate_results[] | "  \(.id) → \(.verdict)  \(.reason)"'
echo ""
say "Stellar Expert:"
say "  tx       → $EXPLORER/tx/$TX_HASH"
say "  contract → $EXPLORER/contract/$CONTRACT_ID"
echo ""

# ============================================================================
# Ato 5 — Auditor externo verifica trustless (sem credencial DPO2U)
# ============================================================================
banner "Ato 5/5 — Auditor externo verifica trustless"
say "Auditor (TCE/CGU/imprensa/cidadão) roda da máquina dele, sem cooperação"
say "do município e sem credencial nenhuma da DPO2U:"
echo ""
echo "    \$ dpo2u-attest verify $USE_CASE $EVIDENCE_HASH"
echo ""
VERIFY_CMD=""
LOCAL_CLI="$REPO_ROOT/sdk/dist/cli.js"
if command -v dpo2u-attest >/dev/null 2>&1; then
  VERIFY_CMD="dpo2u-attest"
elif [[ -f "$LOCAL_CLI" ]]; then
  VERIFY_CMD="node $LOCAL_CLI"
  warn "Usando CLI local (sdk/dist/cli.js) — sem dependência de npm registry"
elif command -v npx >/dev/null 2>&1; then
  VERIFY_CMD="npx -y --package=@dpo2u/stellar-sdk dpo2u-attest"
  warn "Tentando npx (depende do pacote estar publicado): $VERIFY_CMD"
else
  warn "Nem CLI nem npx encontrados — pulando ato 5 (não fatal)"
fi

VERIFY_OUTPUT=""
VERIFY_EXIT=0
if [[ -n "$VERIFY_CMD" ]]; then
  set +e
  VERIFY_OUTPUT="$($VERIFY_CMD verify "$USE_CASE" "$EVIDENCE_HASH" 2>&1)"
  VERIFY_EXIT=$?
  set -e
  echo "$VERIFY_OUTPUT" | sed 's/^/  /'
  echo ""
  if [[ $VERIFY_EXIT -eq 0 ]]; then
    ok "Auditor confirma: atestação $VERDICT_FINAL on-chain, sem precisar confiar no município"
  else
    warn "CLI saiu com exit=$VERIFY_EXIT (ainda assim a evidência está on-chain — abra Stellar Expert)"
  fi
fi
echo ""

# ============================================================================
# Persistência do run report
# ============================================================================
OUT_DIR="docs/demos/runs"
mkdir -p "$OUT_DIR"
RUN_ID="$(date -u +%FT%H-%M-%S)"
OUT="$OUT_DIR/$RUN_ID-pilot-marica.json"
jq -n \
  --arg run_id "$RUN_ID" \
  --arg network "testnet" \
  --arg contract_id "$CONTRACT_ID" \
  --arg gateway_url "$GATEWAY_URL" \
  --arg use_case "$USE_CASE" \
  --arg verdict_target "$VERDICT_TARGET" \
  --arg attempt_id "$ATTEMPT_ID" \
  --arg request_id "$REQ_ID" \
  --argjson payload "$PAYLOAD" \
  --argjson gateway_response "$POLL_RESULT" \
  --arg verify_output "$VERIFY_OUTPUT" \
  --arg verify_exit "$VERIFY_EXIT" \
  --arg tx_hash "$TX_HASH" \
  --arg ledger "$LEDGER" \
  --arg evidence_hash "$EVIDENCE_HASH" \
  --arg metadata_hash "$METADATA_HASH" \
  --arg verdict_final "$VERDICT_FINAL" \
  --arg completed_at "$(date -u +%FT%TZ)" \
  '{
    run_id: $run_id,
    network: $network,
    contract_id: $contract_id,
    gateway_url: $gateway_url,
    use_case_id: $use_case,
    verdict_target: $verdict_target,
    verdict_final: $verdict_final,
    attempt_id: $attempt_id,
    request_id: $request_id,
    submitted_payload: $payload,
    hashes: { evidence_hash: $evidence_hash, metadata_hash: $metadata_hash },
    onchain: {
      tx_hash: $tx_hash,
      ledger: $ledger,
      explorer_tx: ("https://stellar.expert/explorer/testnet/tx/" + $tx_hash),
      explorer_contract: ("https://stellar.expert/explorer/testnet/contract/" + $contract_id)
    },
    gateway_response: $gateway_response,
    auditor_verify: {
      command: ("dpo2u-attest verify " + $use_case + " " + $evidence_hash),
      output: $verify_output,
      exit_code: ($verify_exit | tonumber)
    },
    completed_at: $completed_at
  }' > "$OUT"

banner "Fluxo completo encerrado — Maricá pode reproduzir em ~30 segundos"
ok "Run report:  $OUT"
ok "Tx pública:  $EXPLORER/tx/$TX_HASH"
ok "Auditor CLI: dpo2u-attest verify $USE_CASE $EVIDENCE_HASH"
hr
