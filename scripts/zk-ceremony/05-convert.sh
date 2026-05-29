#!/usr/bin/env bash
# Gera um proof de teste com a VK final e converte VK+proof para o hex que o
# verificador Soroban consome (via zk-prover/src/bin/snarkjs2soroban.rs).
# O conversor VALIDA com Groth16::verify antes de emitir — se falhar, aborta.
#
#   ./05-convert.sh <score> <threshold> <context>
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
ZKP="$(cd "$HERE/../../zk-prover" && pwd)"
B="$ZKP/circom/build"; cd "$B"
SCORE="${1:-85}"; THRESHOLD="${2:-70}"; CONTEXT="${3:-1}"

echo "{\"threshold\":\"$THRESHOLD\",\"context\":\"$CONTEXT\",\"score\":\"$SCORE\"}" > input.json
node score_threshold_js/generate_witness.js score_threshold_js/score_threshold.wasm input.json witness.wtns
snarkjs groth16 prove circuit_final.zkey witness.wtns proof.json public.json
snarkjs groth16 verify verification_key.json public.json proof.json

echo "── hex Soroban (cole no canonical-vk.ts / test_ceremony.rs) ──"
( cd "$ZKP" && cargo run --release --quiet --bin snarkjs2soroban -- \
    "$B/verification_key.json" "$B/proof.json" "$B/public.json" )
