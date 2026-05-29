#!/usr/bin/env bash
# Phase 1 — Powers of Tau (bls12381, universal, independe do circuito).
# Coordenador roda 1x. Potência 12 (2^12=4096) sobra p/ ~11 constraints.
# Para Phase 1 multi-party, encadeie `powersoftau contribute` como na Phase 2.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
B="$(cd "$HERE/../../zk-prover/circom" && pwd)/build"; cd "$B"
POW="${POW:-12}"
BEACON="${BEACON:-0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20}"

snarkjs powersoftau new bls12381 "$POW" pot_0000.ptau -v
read -r -p "Entropia fresca p/ a contribuição Phase 1 (será descartada): " ENTROPY
snarkjs powersoftau contribute pot_0000.ptau pot_0001.ptau --name="phase1-coord" -e="$ENTROPY"
snarkjs powersoftau beacon pot_0001.ptau pot_beacon.ptau "$BEACON" 10 -n="phase1 beacon"
snarkjs powersoftau prepare phase2 pot_beacon.ptau pot_final.ptau -v
snarkjs powersoftau verify pot_final.ptau
echo "✓ pot_final.ptau pronto"
