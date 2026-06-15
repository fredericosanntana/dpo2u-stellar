#!/usr/bin/env bash
# DPO2U cross-chain BN254 (#6, Solana port) — verify a relayed BN254 Groth16 proof
# ON-CHAIN on Solana devnet and seal a CrossChainClaim. The SAME proof already verifies
# on Stellar (por-verifier) and an EVM chain (Groth16Verifier) — BN254 lingua franca.
#
# Trust model: relayer = trusted courier; verification is trustless on-chain (pinned vk).
set -euo pipefail
export PATH="$HOME/.cargo/bin:$HOME/.local/share/solana/install/active_release/bin:$PATH"
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PROG="$REPO/solana-xchain"
RPC="${RPC:-https://api.devnet.solana.com}"
ORIGIN="${ORIGIN:-evm}"

echo "== [1/4] build SBF =="
( cd "$PROG" && cargo build-sbf >/dev/null 2>&1 )

echo "== [2/4] deploy/upgrade on devnet (stable program id from keypair) =="
DEPLOY_OUT="$(cd "$PROG" && solana program deploy target/deploy/solana_xchain_attest.so --url "$RPC" 2>&1 | tail -3)"
echo "$DEPLOY_OUT"
PROGRAM_ID="$(echo "$DEPLOY_OUT" | grep -oE 'Program Id: [A-Za-z0-9]+' | awk '{print $3}')"
[ -z "$PROGRAM_ID" ] && PROGRAM_ID="$(solana address -k "$PROG/target/deploy/solana_xchain_attest-keypair.json")"
echo "program: $PROGRAM_ID"

echo "== [3/4] relayer → Solana: verify_and_attest (live tx) =="
SIG_OUT="$(cd "$REPO/relayer" && PROGRAM_ID="$PROGRAM_ID" RPC="$RPC" ORIGIN="$ORIGIN" node solana.mjs 2>&1)"
echo "$SIG_OUT"
SIG="$(echo "$SIG_OUT" | grep -oE 'verify_and_attest tx: [A-Za-z0-9]+' | awk '{print $3}')"
PDA="$(echo "$SIG_OUT" | grep -oE 'claim PDA: https[^ ]+/address/[A-Za-z0-9]+' | grep -oE '[A-Za-z0-9]+\?' | tr -d '?')"

echo "== [4/4] artifact =="
TS="$(date -u +%Y-%m-%dT%H-%M-%SZ)"
OUT="$REPO/docs/demos/runs/${TS}-xchain-solana.json"
cat > "$OUT" <<JSON
{
  "what": "DPO2U cross-chain BN254 (#6, Solana) — same proof verified ON-CHAIN on a 3rd chain (Solana devnet)",
  "timestamp_utc": "${TS}",
  "network": "solana devnet",
  "program_id": "${PROGRAM_ID}",
  "origin": "${ORIGIN}",
  "verify_and_attest_tx": "${SIG}",
  "claim_pda": "${PDA}",
  "explorer_tx": "https://explorer.solana.com/tx/${SIG}?cluster=devnet",
  "claim": "BN254 Groth16 verified on-chain via alt_bn128 (groth16-solana). One proof, three chains: Stellar + EVM + Solana.",
  "honesty": "courier relayer (transport only); trustless on-chain verification; pinned vk; devnet."
}
JSON
echo "artifact: $OUT"
