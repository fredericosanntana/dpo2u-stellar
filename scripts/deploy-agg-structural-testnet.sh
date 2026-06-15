#!/usr/bin/env bash
# DPO2U study #2 implemented — deploy a SECOND agg-filing instance pinning the STRUCTURAL
# vk (governance_predicate) and seal the structural AI-governance aggregate on Stellar
# testnet. The member proof (Hiroshima N-of-M) is verified ON-CHAIN against the pinned
# structural vk via cross-call to por-verifier (fail-closed).
set -euo pipefail
export PATH="$HOME/.cargo/bin:$PATH"
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="${SRC:-dpo2u-deployer}"
NET="${NET:-testnet}"
POR_VERIFIER="${POR_VERIFIER:-CBM6WJTENB7MT6MZCGA4KOVEDBLOGHKOGFDHBCJRPQ5TINTU6EDMVCAC}"
AGG="$REPO/zk-prover/agg"
BUILD="$AGG/build"
DEPLOYER="$(stellar keys address "$SRC")"

# Member proof = Hiroshima governance proof, converted to Soroban hex (structural vk).
node "$REPO/zk-prover/por/snarkjs2soroban-bn254.js" \
  "$BUILD/verification_key_gov.json" "$BUILD/proof_HIROSHIMA.json" "$BUILD/public_HIROSHIMA.json" "$BUILD/soroban-gov-HIROSHIMA.json" >/dev/null
jq -c '{a:.PROOF_A,b:.PROOF_B,c:.PROOF_C}' "$BUILD/soroban-gov-HIROSHIMA.json" > /tmp/gov-member-proof.json
jq -c '{alpha:.VK_ALPHA,beta:.VK_BETA,gamma:.VK_GAMMA,delta:.VK_DELTA,ic:.VK_IC}' "$BUILD/soroban-gov-HIROSHIMA.json" > /tmp/gov-member-vk.json
jq -c '.PUBLIC' "$BUILD/soroban-gov-HIROSHIMA.json" > /tmp/gov-member-pub.json

AGG_COMMIT="$(jq -r '.agg_commitment' "$AGG/structural-aggregate.json")"
CTX_ROOT="$(jq -r '.context_root' "$AGG/structural-aggregate.json")"
COUNT="$(jq -r '.count' "$AGG/structural-aggregate.json")"

echo "== build + deploy structural agg-filing =="
stellar contract build >/dev/null 2>&1
AGG_ID="$(stellar contract deploy --wasm "$REPO/target/wasm32v1-none/release/agg_filing.wasm" \
  --source "$SRC" --network "$NET" -- --admin "$DEPLOYER" 2>/dev/null | tail -1)"
echo "structural agg-filing: $AGG_ID"

echo "== set_verifier (pin STRUCTURAL vk) + authorize =="
stellar contract invoke --id "$AGG_ID" --source "$SRC" --network "$NET" \
  -- set_verifier --admin "$DEPLOYER" --verifier "$POR_VERIFIER" --vk-file-path /tmp/gov-member-vk.json >/dev/null
stellar contract invoke --id "$AGG_ID" --source "$SRC" --network "$NET" \
  -- authorize_submitter --admin "$DEPLOYER" --submitter "$DEPLOYER" --allowed true >/dev/null

echo "== seal_aggregate (structural; verifies Hiroshima member proof on-chain) =="
stellar contract invoke --id "$AGG_ID" --source "$SRC" --network "$NET" --send=yes \
  -- seal_aggregate --submitter "$DEPLOYER" --scope_code AIGOV --period 202606 \
     --agg_commitment "$AGG_COMMIT" --count "$COUNT" --verdict true --context_root "$CTX_ROOT" \
     --member_proof-file-path /tmp/gov-member-proof.json --member_signals-file-path /tmp/gov-member-pub.json 2>&1 | grep -E "🔗" | tail -1

echo "== get_aggregate readback =="
stellar contract invoke --id "$AGG_ID" --source "$SRC" --network "$NET" -- get_aggregate --scope_code AIGOV --period 202606 2>/dev/null

SEAL="$(curl -s "https://horizon-testnet.stellar.org/accounts/$DEPLOYER/transactions?order=desc&limit=2" | jq -r '._embedded.records[]|select(.successful)|.hash' | head -1)"
TS="$(date -u +%Y-%m-%dT%H-%M-%SZ)"
OUT="$REPO/docs/demos/runs/${TS}-agg-structural-testnet.json"
cat > "$OUT" <<JSON
{
  "what": "DPO2U study #2 implemented — STRUCTURAL AI-governance aggregate (Hiroshima + EU-AIA) sealed on Stellar testnet",
  "timestamp_utc": "${TS}",
  "network": "${NET}",
  "structural_agg_filing": "${AGG_ID}",
  "por_verifier": "${POR_VERIFIER}",
  "aggregate": { "count": ${COUNT}, "agg_commitment": "${AGG_COMMIT}", "context_root": "${CTX_ROOT}" },
  "member_proof": "Hiroshima N-of-M governance proof (framework_id=1), verified ON-CHAIN via por-verifier with the structural vk",
  "seal_tx": "${SEAL}",
  "explorer": "https://stellar.expert/explorer/testnet/contract/${AGG_ID}",
  "honesty": "governance_predicate circuit (Hiroshima N-of-M + EU-AIA tier); structural predicates encode legal classifications needing legal review. DEV vk; testnet; aggregate verified off-chain (GT-host gap)."
}
JSON
echo "artifact: $OUT (seal tx $SEAL)"
