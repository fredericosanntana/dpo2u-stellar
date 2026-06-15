#!/usr/bin/env bash
# DPO2U cross-chain BN254 (#6-B) — "two chains, one proof".
#
# Proves the SAME Groth16/BN254 PoR proof verifies on BOTH:
#   (1) an EVM chain  — Verifier.sol (snarkjs-exported) deployed to a local anvil, and
#   (2) Stellar       — the deployed Soroban por-verifier (CBM6…MVCAC) on testnet.
#
# The shared origin is zk-prover/por/build/por_final.zkey. The byte conventions
# already match (G2 c1-first = EVM convention), handled by snarkjs2soroban-bn254.js.
# Soroban side needs ZERO changes — it reuses the already-deployed verifier.
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
EVM="$REPO/contracts-evm"
BUILD="$REPO/zk-prover/por/build"
SOROBAN_VERIFIER="${SOROBAN_VERIFIER:-CBM6WJTENB7MT6MZCGA4KOVEDBLOGHKOGFDHBCJRPQ5TINTU6EDMVCAC}"
SOROBAN_SOURCE="${SOROBAN_SOURCE:-dpo2u-deployer}"
ANVIL_KEY="${ANVIL_KEY:-0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80}"
RPC="${RPC:-http://127.0.0.1:8545}"
export PATH="$HOME/.foundry/bin:$HOME/.cargo/bin:$PATH"

[ -f "$BUILD/soroban-bn254.json" ] || { echo "missing soroban-bn254.json — run zk-prover/por/build.sh"; exit 1; }

TS="$(date -u +%Y-%m-%dT%H-%M-%SZ)"
OUT_DIR="$REPO/docs/demos/runs"; mkdir -p "$OUT_DIR"
OUT="$OUT_DIR/${TS}-two-chains-one-proof.json"
PROOF_HASH="$(sha256sum "$BUILD/proof.json" | awk '{print $1}')"

# --- derive cast args from soroban-bn254.json (EVM byte order, c1-first) ---
hexchunks() { jq -r ".$1" "$BUILD/soroban-bn254.json" | fold -w64 | sed 's/^/0x/'; }
read -r A0 A1 < <(hexchunks PROOF_A | paste -sd' ')
read -r B0 B1 B2 B3 < <(hexchunks PROOF_B | paste -sd' ')
read -r C0 C1 < <(hexchunks PROOF_C | paste -sd' ')
PA="[$A0,$A1]"; PB="[[$B0,$B1],[$B2,$B3]]"; PC="[$C0,$C1]"
PUB="$(jq -r '.PUBLIC | map("0x" + (.|tonumber|tostring)) | "[" + join(",") + "]"' "$BUILD/soroban-bn254.json" 2>/dev/null || true)"
# PUBLIC is decimal; cast accepts decimal directly:
PUB="$(jq -r '.PUBLIC | "[" + join(",") + "]"' "$BUILD/soroban-bn254.json")"

echo "=== [1/3] forge test (EVM verifier unit tests) ==="
( cd "$EVM" && forge test -vv ) | tail -8

echo "=== [2/3] EVM: deploy to anvil + cast call verifyProof ==="
anvil --silent > /tmp/anvil-2c1p.log 2>&1 &
ANVIL_PID=$!; trap 'kill $ANVIL_PID 2>/dev/null || true' EXIT
sleep 3
EVM_ADDR="$(cd "$EVM" && forge create src/Verifier.sol:Groth16Verifier --rpc-url "$RPC" --private-key "$ANVIL_KEY" --broadcast 2>/dev/null | grep 'Deployed to:' | awk '{print $3}')"
EVM_RESULT="$(cast call "$EVM_ADDR" 'verifyProof(uint256[2],uint256[2][2],uint256[2],uint256[3])(bool)' "$PA" "$PB" "$PC" "$PUB" --rpc-url "$RPC")"
echo "EVM verifier ($EVM_ADDR) verifyProof => $EVM_RESULT"
kill $ANVIL_PID 2>/dev/null || true; trap - EXIT

echo "=== [3/3] Stellar: Soroban por-verifier verify_proof (testnet) ==="
jq -c '{a: .PROOF_A, b: .PROOF_B, c: .PROOF_C}' "$BUILD/soroban-bn254.json" > /tmp/2c1p-proof.json
jq -c '{alpha: .VK_ALPHA, beta: .VK_BETA, gamma: .VK_GAMMA, delta: .VK_DELTA, ic: .VK_IC}' "$BUILD/soroban-bn254.json" > /tmp/2c1p-vk.json
jq -c '.PUBLIC' "$BUILD/soroban-bn254.json" > /tmp/2c1p-pub.json
SOROBAN_RESULT="$(stellar contract invoke --id "$SOROBAN_VERIFIER" --network testnet --source "$SOROBAN_SOURCE" \
  -- verify_proof --vk-file-path /tmp/2c1p-vk.json --proof-file-path /tmp/2c1p-proof.json --pub_signals-file-path /tmp/2c1p-pub.json 2>/dev/null | tail -1)"
echo "Soroban verifier ($SOROBAN_VERIFIER) verify_proof => $SOROBAN_RESULT"

cat > "$OUT" <<JSON
{
  "what": "DPO2U cross-chain BN254 (#6-B) — one Groth16/BN254 proof, verified on two chains",
  "timestamp_utc": "${TS}",
  "shared_origin_zkey": "zk-prover/por/build/por_final.zkey",
  "proof_sha256": "${PROOF_HASH}",
  "public_signals": $(cat /tmp/2c1p-pub.json),
  "evm": {
    "verifier_contract": "Groth16Verifier (snarkjs zkey export solidityverifier)",
    "chain": "local anvil (EVM)",
    "deployed_to": "${EVM_ADDR}",
    "verifyProof_result": ${EVM_RESULT}
  },
  "stellar": {
    "verifier_contract": "${SOROBAN_VERIFIER}",
    "network": "testnet",
    "verify_proof_result": ${SOROBAN_RESULT},
    "explorer": "https://stellar.expert/explorer/testnet/contract/${SOROBAN_VERIFIER}"
  },
  "claim": "The same BN254 proof bytes verify on an EVM verifier and on Stellar Soroban. BN254 = the cross-chain bridge primitive.",
  "honesty": "EVM side = local anvil deploy; Stellar side = live testnet read-only simulation (executes the on-chain BN254 pairing_check). DEV vk; testnet."
}
JSON
echo "=== artifact written: $OUT ==="
cat "$OUT"
