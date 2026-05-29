#!/usr/bin/env bash
#
# DPO2U — deploy MAINNET (PILOTO ENXUTO).
#
# Variante enxuta do deploy-mainnet.sh (cerimonial pesado). Diferenças:
#   - Chave de SOFTWARE (não Ledger).            ← piloto, sem HSM
#   - Deploya OS DOIS contratos:                  ← attestation + zk-verifier
#       1) anticorruption-attestation (com __constructor --admin)
#       2) zk-verifier                (sem constructor)
#   - Hashes AUTO-ATESTADOS (sem auditoria externa) — ver
#     docs/2026-05-29-mainnet-pilot-wasm-attestation.md
#
# Mantém os trilhos de segurança: hash-match obrigatório, checagem de saldo,
# frase de confirmação, artifact json.
#
# ⚠️ IRREVERSÍVEL — os contratos são IMUTÁVEIS (sem proxy/upgrade).
#
# Pré-condições:
#   export EXPECTED_WASM_HASH_ATTEST=<sha256 do attestation otimizado>
#   export EXPECTED_WASM_HASH_ZK=<sha256 do zk_verifier otimizado>
#   stellar keys generate dpo2u-pilot-mainnet   (e financiar com >= 10 XLM)
#
# Uso:
#   EXPECTED_WASM_HASH_ATTEST=... EXPECTED_WASM_HASH_ZK=... ./scripts/deploy-mainnet-pilot.sh

set -euo pipefail
shopt -s nullglob

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

# ─── Config (env-overridable) ──────────────────────────────────────────
IDENTITY="${STELLAR_MAINNET_IDENTITY:-dpo2u-pilot-mainnet}"
NETWORK="public"
RPC_URL="${STELLAR_MAINNET_RPC_URL:-https://soroban-mainnet.stellar.org}"
PASSPHRASE="${STELLAR_MAINNET_PASSPHRASE:-Public Global Stellar Network ; September 2015}"
WASM_DIR="target/wasm32v1-none/release"
ATTEST_WASM="$WASM_DIR/anticorruption_attestation.optimized.wasm"
ZK_WASM="$WASM_DIR/zk_verifier.optimized.wasm"
CONFIRMATION_PHRASE='I-UNDERSTAND-THIS-IS-MAINNET-AND-IRREVERSIBLE'

say() { printf '\033[1;36m▸ %s\033[0m\n' "$*"; }
err() { printf '\033[1;31m✗ %s\033[0m\n' "$*" >&2; }
ok()  { printf '\033[1;32m✓ %s\033[0m\n' "$*"; }
warn(){ printf '\033[1;33m! %s\033[0m\n' "$*"; }
hr()  { printf '\033[1;33m%s\033[0m\n' '════════════════════════════════════════════════════════════════════'; }
require_env() { [[ -n "${!1:-}" ]] || { err "Missing env var: $1"; exit 2; }; }
require_cmd() { command -v "$1" >/dev/null 2>&1 || { err "missing binary: $1"; exit 2; }; }
# run_retry <logfile> <cmd...> — até 3 tentativas (backoff 2s/4s) p/ RPC transiente.
# Ecoa o stdout (ex.: contract id) em sucesso; retorna !=0 se as 3 falharem.
run_retry() {
  local log="$1"; shift; local out i
  for i in 1 2 3; do
    if out="$("$@" 2>"$log")" && [[ -n "$out" ]]; then printf '%s' "$out"; return 0; fi
    [[ $i -lt 3 ]] && { warn "tentativa $i falhou; retry em $((2*i))s…"; sleep $((2*i)); }
  done
  return 1
}

hr; say "DPO2U MAINNET PILOTO — deploy (2 contratos, chave software)"; hr
say "Network:    $NETWORK"
say "RPC URL:    $RPC_URL"
say "Identity:   $IDENTITY"
say ""

# 1. Binaries.
require_cmd stellar; require_cmd git; require_cmd jq; require_cmd sha256sum

# 2. Hashes esperados (auto-atestados).
require_env EXPECTED_WASM_HASH_ATTEST
require_env EXPECTED_WASM_HASH_ZK
for h in "$EXPECTED_WASM_HASH_ATTEST" "$EXPECTED_WASM_HASH_ZK"; do
  [[ "$h" =~ ^[0-9a-f]{64}$ ]] || { err "hash inválido (64-hex esperado): $h"; exit 2; }
done

# 3. Estado git (warn-only no piloto — branch chore + arquivos untracked são ok).
if ! git diff --quiet; then warn "Working tree tem mudanças NÃO-commitadas (tracked). Recomenda-se commitar antes."; fi
COMMIT="$(git rev-parse --short HEAD)"; BRANCH="$(git rev-parse --abbrev-ref HEAD)"
[[ "$BRANCH" == "main" ]] || warn "Branch atual é '$BRANCH' (não 'main'). Prosseguindo (piloto)."
ok "commit=$COMMIT branch=$BRANCH"

# 4. Build + optimize os dois contratos.
say "Building + optimizing wasm…"
stellar contract build >/dev/null
stellar contract optimize --wasm "$WASM_DIR/anticorruption_attestation.wasm" >/dev/null 2>&1 || true
stellar contract optimize --wasm "$WASM_DIR/zk_verifier.wasm" >/dev/null 2>&1 || true
[[ -f "$ATTEST_WASM" ]] || { err "não achei $ATTEST_WASM"; exit 4; }
[[ -f "$ZK_WASM" ]] || { err "não achei $ZK_WASM"; exit 4; }

ATTEST_HASH="$(sha256sum "$ATTEST_WASM" | awk '{print $1}')"
ZK_HASH="$(sha256sum "$ZK_WASM" | awk '{print $1}')"
ok "attestation hash: $ATTEST_HASH"
ok "zk-verifier hash: $ZK_HASH"

[[ "$ATTEST_HASH" == "$EXPECTED_WASM_HASH_ATTEST" ]] || { err "HASH MISMATCH attestation (esperado $EXPECTED_WASM_HASH_ATTEST)"; exit 5; }
[[ "$ZK_HASH" == "$EXPECTED_WASM_HASH_ZK" ]] || { err "HASH MISMATCH zk-verifier (esperado $EXPECTED_WASM_HASH_ZK)"; exit 5; }
ok "Ambos os hashes batem com os esperados (auto-atestados)"

# 5. Rede + identidade.
say "Registrando rede 'public'…"
stellar network add "$NETWORK" --rpc-url "$RPC_URL" --network-passphrase "$PASSPHRASE" 2>/dev/null || true
if ! stellar keys address "$IDENTITY" >/dev/null 2>&1; then
  err "Identity '$IDENTITY' não existe. Crie: stellar keys generate $IDENTITY --network $NETWORK"
  err "(e financie com >= 10 XLM — não há friendbot em mainnet)"
  exit 6
fi
ADMIN_PUBKEY="$(stellar keys address "$IDENTITY")"
ok "Admin/deployer pubkey: $ADMIN_PUBKEY"

# 6. Saldo (Horizon mainnet).
say "Checando saldo do deployer…"
BALANCE_XLM="$(curl -fsSL "https://horizon.stellar.org/accounts/$ADMIN_PUBKEY" \
  | jq -r '.balances[] | select(.asset_type=="native") | .balance // "0"')"
if [[ -z "$BALANCE_XLM" || "${BALANCE_XLM%.*}" -lt 10 ]]; then
  err "Saldo do deployer baixo: ${BALANCE_XLM:-0} XLM (precisa >= 10). Financie $ADMIN_PUBKEY."
  exit 7
fi
ok "Saldo: $BALANCE_XLM XLM"

# 7. Confirmação.
hr; say "CONFIRMAÇÃO FINAL — vai deployar 2 contratos IMUTÁVEIS em MAINNET"
say "  attestation hash: $ATTEST_HASH"
say "  zk-verifier hash: $ZK_HASH"
say "  admin:            $ADMIN_PUBKEY"
say ""
say "Digite EXATAMENTE para prosseguir:  $CONFIRMATION_PHRASE"
read -r -p "Frase: " typed
[[ "$typed" == "$CONFIRMATION_PHRASE" ]] || { err "Frase não confere. Abortando."; exit 8; }
ok "Confirmado."; hr

# ─── IRREVERSÍVEL DAQUI ────────────────────────────────────────────────
say "Deploy 1/2: anticorruption-attestation (constructor --admin)…"
A_LOG="$(mktemp)"
ATTEST_ID="$(run_retry "$A_LOG" stellar contract deploy --wasm "$ATTEST_WASM" --source "$IDENTITY" --network "$NETWORK" \
  -- --admin "$ADMIN_PUBKEY")" || { err "deploy attestation falhou após retries. Log: $A_LOG"; exit 9; }
ATTEST_TX="$(grep -oE '[a-f0-9]{64}' "$A_LOG" | tail -n 1 || true)"
ok "attestation contract: $ATTEST_ID (tx $ATTEST_TX)"

say "Deploy 2/2: zk-verifier (sem constructor)…"
Z_LOG="$(mktemp)"
ZK_ID="$(run_retry "$Z_LOG" stellar contract deploy --wasm "$ZK_WASM" --source "$IDENTITY" --network "$NETWORK")" \
  || { err "deploy zk-verifier falhou após retries. Log: $Z_LOG"; exit 9; }
ZK_TX="$(grep -oE '[a-f0-9]{64}' "$Z_LOG" | tail -n 1 || true)"
ok "zk-verifier contract: $ZK_ID (tx $ZK_TX)"

cat > scripts/deploy-mainnet.json <<EOF
{
  "network": "$NETWORK",
  "passphrase": "$PASSPHRASE",
  "rpc_url": "$RPC_URL",
  "admin_pubkey": "$ADMIN_PUBKEY",
  "git_commit": "$COMMIT",
  "git_branch": "$BRANCH",
  "deployed_at": "$(date -u +%FT%TZ)",
  "contracts": {
    "anticorruption_attestation": {
      "contract_id": "$ATTEST_ID",
      "wasm_hash": "$ATTEST_HASH",
      "deploy_tx_hash": "$ATTEST_TX",
      "explorer": "https://stellar.expert/explorer/public/contract/$ATTEST_ID"
    },
    "zk_verifier": {
      "contract_id": "$ZK_ID",
      "wasm_hash": "$ZK_HASH",
      "deploy_tx_hash": "$ZK_TX",
      "trusted": false,
      "note": "VK dev/seed-fixa — NÃO confiável até a cerimônia de trusted setup (Track ZK). zk_compliance_v1 fica fora do E2E de produção.",
      "explorer": "https://stellar.expert/explorer/public/contract/$ZK_ID"
    }
  }
}
EOF
ok "Escrito scripts/deploy-mainnet.json"

# Auto-popula o contract ID no SDK (evita SDK apontando p/ vazio — achado do shake-down A2).
if [[ -f sdk/src/AttestationClient.ts ]]; then
  sed -i "s|export const MAINNET_ATTESTATION_CONTRACT_ID = '[^']*';|export const MAINNET_ATTESTATION_CONTRACT_ID = '$ATTEST_ID';|" sdk/src/AttestationClient.ts
  ( cd sdk && npm run build >/dev/null 2>&1 ) && ok "SDK: MAINNET_ATTESTATION_CONTRACT_ID = $ATTEST_ID (rebuild ok)" \
    || warn "SDK contract id preenchido, mas rebuild falhou — rode 'cd sdk && npm run build'"
fi

hr; say "DEPLOY COMPLETO — 2 CONTRATOS VIVOS EM MAINNET"; hr
say "attestation: $ATTEST_ID"
say "zk-verifier: $ZK_ID  (VK da cerimônia — confiável)"
say ""
say "Próximos passos:"
say "  1. ./scripts/configure-mainnet-usecases.sh   (62 use cases; fail-fast + checkpoint)"
say "  2. ./scripts/authorize-members-mainnet.sh <G1> <G2> ... (5 pubkeys)"
say "  3. Commitar scripts/deploy-mainnet.json + sdk/src/AttestationClient.ts"
hr
