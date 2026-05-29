#!/usr/bin/env bash
# Compila o circuito Circom (bls12381) → r1cs + wasm. Coordenador roda 1x.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
CIRCUIT="$(cd "$HERE/../../zk-prover/circom" && pwd)"
OUT="$CIRCUIT/build"; mkdir -p "$OUT"
circom "$CIRCUIT/score_threshold.circom" --r1cs --wasm --sym --prime bls12381 -o "$OUT"
snarkjs r1cs info "$OUT/score_threshold.r1cs"
echo "✓ r1cs/wasm em $OUT"
