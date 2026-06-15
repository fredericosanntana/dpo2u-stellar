#!/usr/bin/env bash
# DPO2U cross-chain BN254 (#6-B) — export the EVM Solidity verifier + calldata
# from the SAME por_final.zkey that produced the proof verified on Stellar Soroban.
# That shared origin is what makes "one proof, two chains" true (not two unrelated proofs).
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUILD="$HERE/build"
EVM_SRC="$HERE/../../contracts-evm/src"
EVM_ROOT="$HERE/../../contracts-evm"

[ -f "$BUILD/por_final.zkey" ] || { echo "missing $BUILD/por_final.zkey — run build.sh first"; exit 1; }
mkdir -p "$EVM_SRC"

echo "[export-evm] off-chain sanity verify..."
snarkjs groth16 verify "$BUILD/verification_key.json" "$BUILD/public.json" "$BUILD/proof.json"

echo "[export-evm] exporting Solidity verifier -> $EVM_SRC/Verifier.sol"
snarkjs zkey export solidityverifier "$BUILD/por_final.zkey" "$EVM_SRC/Verifier.sol"

echo "[export-evm] exporting Solidity calldata -> $EVM_ROOT/calldata.txt"
snarkjs zkey export soliditycalldata "$BUILD/public.json" "$BUILD/proof.json" > "$EVM_ROOT/calldata.txt"

echo "[export-evm] done. Verifier contract:"
grep -nE "contract |function verifyProof" "$EVM_SRC/Verifier.sol"
