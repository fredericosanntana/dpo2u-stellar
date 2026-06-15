#!/usr/bin/env bash
# DPO2U — build + setup (coordenador, dev) do circuito PoR BN254.
# NOTA: este é um setup de COORDENADOR (1-party + beacon) para um vk FUNCIONAL de
# desenvolvimento. A cerimônia multi-party externa (1-of-N + beacon drand) é o
# deliverable do Tranche #0 do SCF — ver scripts/zk-ceremony/ (padrão BLS já feito).
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
cd "$HERE"
POW="${POW:-14}"
BEACON="${BEACON:-0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20}"

echo "== [0/6] circomlib =="
[ -d node_modules/circomlib ] || npm install --no-save circomlib >/dev/null 2>&1
echo "circomlib OK"

echo "== [1/6] compile (bn128) =="
mkdir -p build
circom por_solvency.circom --r1cs --wasm --sym -l node_modules -o build
snarkjs r1cs info build/por_solvency.r1cs

echo "== [2/6] powers of tau (bn128, pow=$POW) =="
cd build
snarkjs powersoftau new bn128 "$POW" pot_0000.ptau -v >/dev/null
snarkjs powersoftau contribute pot_0000.ptau pot_0001.ptau --name="por-coord" -e="$(head -c64 /dev/urandom | base64)" >/dev/null
snarkjs powersoftau beacon pot_0001.ptau pot_beacon.ptau "$BEACON" 10 -n="por phase1 beacon" >/dev/null
snarkjs powersoftau prepare phase2 pot_beacon.ptau pot_final.ptau -v >/dev/null
echo "ptau OK"

echo "== [3/6] groth16 setup + beacon → vk =="
snarkjs groth16 setup por_solvency.r1cs pot_final.ptau por_0000.zkey >/dev/null
snarkjs zkey contribute por_0000.zkey por_0001.zkey --name="por-coord" -e="$(head -c64 /dev/urandom | base64)" >/dev/null
snarkjs zkey beacon por_0001.zkey por_final.zkey "$BEACON" 10 -n="por final beacon" >/dev/null
snarkjs zkey verify por_solvency.r1cs pot_final.ptau por_final.zkey
snarkjs zkey export verificationkey por_final.zkey verification_key.json
echo "vk OK"

echo "== [4/6] sample witness + prove =="
cat > input.json <<'JSON'
{
  "reserves":    ["1000000", "500000", "2000000", "750000"],
  "liabilities": ["900000",  "480000", "1900000", "700000"],
  "context":     "123456789"
}
JSON
node por_solvency_js/generate_witness.js por_solvency_js/por_solvency.wasm input.json witness.wtns
snarkjs groth16 prove por_final.zkey witness.wtns proof.json public.json

echo "== [5/6] snarkjs verify (off-chain fidelity) =="
snarkjs groth16 verify verification_key.json public.json proof.json

echo "== [6/6] convert → Soroban BN254 hex =="
echo "public signals (order = [solvent, commit, context]):"
cat public.json
echo "---- Soroban hex ----"
node "$HERE/snarkjs2soroban-bn254.js" verification_key.json proof.json public.json soroban-bn254.json
echo
echo "vk sha256 (fail-closed pin):"
sha256sum verification_key.json
