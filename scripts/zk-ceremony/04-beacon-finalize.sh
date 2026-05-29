#!/usr/bin/env bash
# Phase 2 — beacon final + export da VK. Coordenador roda APÓS os ≥3 contribuidores.
#   ./04-beacon-finalize.sh circuit_{N}.zkey [beaconHash]
# O beacon (aleatoriedade pública verificável — ex.: hash de bloco futuro do BTC)
# garante que conluio dos contribuidores não compromete o resultado.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
B="$(cd "$HERE/../../zk-prover/circom" && pwd)/build"; cd "$B"
LAST="${1:?uso: 04-beacon-finalize.sh <circuit_N.zkey> [beaconHash]}"
BEACON="${2:-0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20}"

snarkjs zkey beacon "$LAST" circuit_final.zkey "$BEACON" 10 -n="final beacon"
snarkjs zkey verify score_threshold.r1cs pot_final.ptau circuit_final.zkey
snarkjs zkey export verificationkey circuit_final.zkey verification_key.json
echo "✓ circuit_final.zkey + verification_key.json"
echo "  Próximo: gerar um proof de teste e rodar 05-convert.sh para obter o hex Soroban,"
echo "  depois substituir CANONICAL_VK em packages/pilot-gateway/src/lib/canonical-vk.ts."
