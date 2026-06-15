#!/usr/bin/env bash
# DPO2U cross-chain BN254 (#6-C) — live relay: EVM origin → Stellar on-chain verify.
#
# 1. anvil (EVM origin). Deploy Groth16Verifier + ProofRegistry.
# 2. postProof: a Groth16/BN254 proof is verified ON the EVM chain and registered.
# 3. Deploy xchain-attest to Stellar testnet, pin the vk, authorize the relayer.
# 4. Relayer reads the proof from the EVM registry, carries it to Stellar, where
#    xchain-attest RE-VERIFIES it on-chain (trustless) and records a CrossChainClaim.
#
# Origin defaults to local anvil (a real EVM node). Set RPC/EVM_KEY/ORIGIN for a public
# testnet like Base Sepolia. Trust model: courier relayer, NOT a trustless bridge.
set -euo pipefail
export PATH="$HOME/.foundry/bin:$HOME/.cargo/bin:$PATH"
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
EVM="$REPO/contracts-evm"
BUILD="$REPO/zk-prover/por/build"
SRC="${STELLAR_SRC:-dpo2u-deployer}"
NET="${NET:-testnet}"
POR_VERIFIER="${POR_VERIFIER:-CBM6WJTENB7MT6MZCGA4KOVEDBLOGHKOGFDHBCJRPQ5TINTU6EDMVCAC}"
ANVIL_KEY="${EVM_KEY:-0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80}"
RPC="${RPC:-http://127.0.0.1:8545}"
ORIGIN="${ORIGIN:-anvil}"
DEPLOYER="$(stellar keys address "$SRC")"

# cast args for the PoR proof (derived from soroban-bn254.json; EVM byte order).
hexchunks() { jq -r ".$1" "$BUILD/soroban-bn254.json" | fold -w64 | sed 's/^/0x/'; }
read -r A0 A1 < <(hexchunks PROOF_A | paste -sd' ')
read -r B0 B1 B2 B3 < <(hexchunks PROOF_B | paste -sd' ')
read -r C0 C1 < <(hexchunks PROOF_C | paste -sd' ')
PA="[$A0,$A1]"; PB="[[$B0,$B1],[$B2,$B3]]"; PC="[$C0,$C1]"
PUB="$(jq -r '.PUBLIC | "[" + join(",") + "]"' "$BUILD/soroban-bn254.json")"
# PoR vk for pinning on the Stellar side (the relayed proof verifies against it).
jq -c '{alpha:.VK_ALPHA,beta:.VK_BETA,gamma:.VK_GAMMA,delta:.VK_DELTA,ic:.VK_IC}' "$BUILD/soroban-bn254.json" > /tmp/xchain-vk.json
PROOF_CONTEXT="$(jq -r '.PUBLIC[2]' "$BUILD/soroban-bn254.json")"
CTX_HEX="$(printf '%064x' "$PROOF_CONTEXT")"

echo "== [1/6] anvil (EVM origin) =="
ANVIL_STARTED=0
if [ "$ORIGIN" = "anvil" ]; then
  anvil --silent > /tmp/anvil-xchain.log 2>&1 & ANVIL_PID=$!; ANVIL_STARTED=1
  trap 'kill $ANVIL_PID 2>/dev/null || true' EXIT
  sleep 3
fi

echo "== [2/6] deploy Groth16Verifier + ProofRegistry on EVM =="
VADDR="$(cd "$EVM" && forge create src/Verifier.sol:Groth16Verifier --rpc-url "$RPC" --private-key "$ANVIL_KEY" --broadcast 2>/dev/null | grep 'Deployed to:' | awk '{print $3}')"
RADDR="$(cd "$EVM" && forge create src/ProofRegistry.sol:ProofRegistry --rpc-url "$RPC" --private-key "$ANVIL_KEY" --broadcast --constructor-args "$VADDR" 2>/dev/null | grep 'Deployed to:' | awk '{print $3}')"
echo "Groth16Verifier(EVM): $VADDR"
echo "ProofRegistry(EVM):   $RADDR"

echo "== [3/6] postProof on EVM (verifies on EVM, emits ProofPosted) =="
cast send "$RADDR" "postProof(uint256[2],uint256[2][2],uint256[2],uint256[3])" "$PA" "$PB" "$PC" "$PUB" \
  --private-key "$ANVIL_KEY" --rpc-url "$RPC" >/dev/null
echo "posted proof id=0 (EVM-verified)"

echo "== [4/6] deploy xchain-attest to Stellar $NET =="
stellar contract build >/dev/null 2>&1
XCHAIN_ID="$(stellar contract deploy --wasm "$REPO/target/wasm32v1-none/release/xchain_attest.wasm" \
  --source "$SRC" --network "$NET" -- --admin "$DEPLOYER" 2>/dev/null | tail -1)"
echo "xchain-attest: $XCHAIN_ID"
stellar contract invoke --id "$XCHAIN_ID" --source "$SRC" --network "$NET" \
  -- set_verifier --admin "$DEPLOYER" --verifier "$POR_VERIFIER" --vk-file-path /tmp/xchain-vk.json >/dev/null
stellar contract invoke --id "$XCHAIN_ID" --source "$SRC" --network "$NET" \
  -- authorize_submitter --admin "$DEPLOYER" --submitter "$DEPLOYER" --allowed true >/dev/null
echo "xchain-attest wired (vk pinned, relayer authorized)"

echo "== [5/6] RUN RELAYER: EVM origin → Stellar on-chain verify =="
REGISTRY="$RADDR" XCHAIN_ID="$XCHAIN_ID" RPC="$RPC" PROOF_ID=0 ORIGIN="$ORIGIN" \
  STELLAR_SRC="$SRC" NET="$NET" node "$REPO/relayer/relay.mjs"

echo "== [6/6] get_claim readback (Stellar) =="
CLAIM="$(stellar contract invoke --id "$XCHAIN_ID" --source "$SRC" --network "$NET" \
  -- get_claim --origin_chain "$ORIGIN" --proof_context "$CTX_HEX" 2>/dev/null)"
echo "$CLAIM"

[ "$ANVIL_STARTED" = "1" ] && { kill $ANVIL_PID 2>/dev/null || true; trap - EXIT; }

# seal tx hash (most recent successful on deployer)
SEAL_HASH="$(curl -s "https://horizon-testnet.stellar.org/accounts/$DEPLOYER/transactions?order=desc&limit=3" | jq -r '._embedded.records[] | select(.successful==true) | .hash' | head -1)"
TS="$(date -u +%Y-%m-%dT%H-%M-%SZ)"
OUT="$REPO/docs/demos/runs/${TS}-xchain-relayer.json"
cat > "$OUT" <<JSON
{
  "what": "DPO2U cross-chain BN254 (#6-C) — proof relayed from an EVM origin and verified ON-CHAIN on Stellar",
  "timestamp_utc": "${TS}",
  "evm_origin": { "chain": "${ORIGIN}", "rpc": "${RPC}", "verifier": "${VADDR}", "proof_registry": "${RADDR}", "proof_id": 0 },
  "stellar": { "network": "${NET}", "xchain_attest": "${XCHAIN_ID}", "por_verifier": "${POR_VERIFIER}",
    "verify_and_attest_tx": "${SEAL_HASH}", "explorer": "https://stellar.expert/explorer/testnet/tx/${SEAL_HASH}",
    "claim_readback": ${CLAIM:-null} },
  "claim": "A proof minted+verified on an EVM chain, relayed to Stellar, and RE-VERIFIED on-chain (Groth16/BN254 pairing) — courier relayer, not a trustless bridge.",
  "honesty": "EVM origin = ${ORIGIN}; relayer is a trusted courier (no EVM light client/state proof). Verification is trustless on-chain on Soroban. DEV vk; testnet."
}
JSON
echo "artifact: $OUT"
