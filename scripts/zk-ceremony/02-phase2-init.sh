#!/usr/bin/env bash
# Phase 2 — init (circuit-specific). Coordenador roda 1x → circuit_0000.zkey.
# Esse arquivo é o ponto de partida que vai passando de contribuidor em contribuidor.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
B="$(cd "$HERE/../../zk-prover/circom" && pwd)/build"; cd "$B"
snarkjs groth16 setup score_threshold.r1cs pot_final.ptau circuit_0000.zkey
echo "✓ circuit_0000.zkey — envie ao 1º contribuidor (03-contribute.sh)"
