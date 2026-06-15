#!/usr/bin/env bash
# DPO2U moonshot #5 — deploy agg-filing to Stellar testnet + live seal_aggregate.
#
# Seals the SnarkPack-aggregated multi-jurisdiction result (from zk-prover/agg/
# aggregate.json) and verifies ONE constituent jurisdiction proof ON-CHAIN via the
# pinned por-verifier. Honest: the SnarkPack aggregate itself is verified OFF-CHAIN
# (GT gap); the seal attests the result + one on-chain-verified member proof.
set -euo pipefail
export PATH="$HOME/.cargo/bin:$PATH"
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="${SRC:-dpo2u-deployer}"
NET="${NET:-testnet}"
POR_VERIFIER="${POR_VERIFIER:-CBM6WJTENB7MT6MZCGA4KOVEDBLOGHKOGFDHBCJRPQ5TINTU6EDMVCAC}"
AGG="$REPO/zk-prover/agg"
BUILD="$AGG/build"
DEPLOYER="$(stellar keys address "$SRC")"

# member proof = BR jurisdiction proof, converted to Soroban hex
node "$REPO/zk-prover/por/snarkjs2soroban-bn254.js" \
  "$BUILD/verification_key.json" "$BUILD/proof_BR.json" "$BUILD/public_BR.json" "$BUILD/soroban-jur-BR.json" >/dev/null
jq -c '{a:.PROOF_A,b:.PROOF_B,c:.PROOF_C}' "$BUILD/soroban-jur-BR.json" > /tmp/agg-member-proof.json
jq -c '{alpha:.VK_ALPHA,beta:.VK_BETA,gamma:.VK_GAMMA,delta:.VK_DELTA,ic:.VK_IC}' "$BUILD/soroban-jur-BR.json" > /tmp/agg-member-vk.json
jq -c '.PUBLIC' "$BUILD/soroban-jur-BR.json" > /tmp/agg-member-pub.json

# aggregate result (off-chain SnarkPack verify)
AGG_COMMIT="$(jq -r '.agg_commitment' "$AGG/aggregate.json")"
CTX_ROOT="$(jq -r '.context_root' "$AGG/aggregate.json")"
COUNT="$(jq -r '.count' "$AGG/aggregate.json")"
VERDICT="$(jq -r '.verdict_all_compliant' "$AGG/aggregate.json")"

echo "== build wasm =="; stellar contract build >/dev/null 2>&1
echo "== deploy agg-filing =="
AGG_ID="$(stellar contract deploy --wasm "$REPO/target/wasm32v1-none/release/agg_filing.wasm" \
  --source "$SRC" --network "$NET" -- --admin "$DEPLOYER" 2>/dev/null | tail -1)"
echo "agg-filing: $AGG_ID"

echo "== set_verifier (pin jurisdiction vk, fail-closed) =="
stellar contract invoke --id "$AGG_ID" --source "$SRC" --network "$NET" \
  -- set_verifier --admin "$DEPLOYER" --verifier "$POR_VERIFIER" --vk-file-path /tmp/agg-member-vk.json >/dev/null

echo "== authorize_submitter =="
stellar contract invoke --id "$AGG_ID" --source "$SRC" --network "$NET" \
  -- authorize_submitter --admin "$DEPLOYER" --submitter "$DEPLOYER" --allowed true >/dev/null

echo "== seal_aggregate (live tx; verifies BR member proof on-chain) =="
SEAL_TX="$(stellar contract invoke --id "$AGG_ID" --source "$SRC" --network "$NET" --send=yes \
  -- seal_aggregate --submitter "$DEPLOYER" --scope_code GLOBAL --period 202606 \
     --agg_commitment "$AGG_COMMIT" --count "$COUNT" --verdict "$VERDICT" --context_root "$CTX_ROOT" \
     --member_proof-file-path /tmp/agg-member-proof.json --member_signals-file-path /tmp/agg-member-pub.json 2>&1 | tail -1)"
echo "seal seq/result: $SEAL_TX"

echo "== get_aggregate readback =="
stellar contract invoke --id "$AGG_ID" --source "$SRC" --network "$NET" \
  -- get_aggregate --scope_code GLOBAL --period 202606

TS="$(date -u +%Y-%m-%dT%H-%M-%SZ)"
OUT="$REPO/docs/demos/runs/${TS}-agg-filing-testnet-deploy.json"
cat > "$OUT" <<JSON
{
  "what": "DPO2U moonshot #5 — SnarkPack multi-jurisdiction aggregate sealed on Stellar testnet",
  "timestamp_utc": "${TS}",
  "network": "${NET}",
  "agg_filing_contract": "${AGG_ID}",
  "por_verifier": "${POR_VERIFIER}",
  "aggregate": { "count": ${COUNT}, "verdict_all_compliant": ${VERDICT},
    "agg_commitment": "${AGG_COMMIT}", "context_root": "${CTX_ROOT}" },
  "member_proof": "BR jurisdiction proof (threshold 60), verified ON-CHAIN via por-verifier",
  "explorer": "https://stellar.expert/explorer/testnet/contract/${AGG_ID}",
  "honesty": "SnarkPack aggregate verified OFF-CHAIN (Soroban lacks GT arithmetic); on-chain seal attests the result + one constituent proof verified on-chain. DEV vk; testnet."
}
JSON
echo "artifact: $OUT"
