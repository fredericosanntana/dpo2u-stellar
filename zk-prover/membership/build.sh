#!/usr/bin/env bash
# DPO2U — build + setup (coordenador, dev) do circuito de membership ZK da privacy pool.
# Setup de COORDENADOR (1-party + beacon) para um vk FUNCIONAL de desenvolvimento/testnet.
# Produção exige cerimônia multi-party por circuito (ver scripts/zk-ceremony/).
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
cd "$HERE"
POW="${POW:-18}"
BEACON="${BEACON:-0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20}"
PTAU_ENTROPY="${PTAU_ENTROPY:-dpo2u-membership-ptau-dev-fixed-entropy}"
ZKEY_ENTROPY="${ZKEY_ENTROPY:-dpo2u-membership-zkey-dev-fixed-entropy}"

echo "== [0/7] deps (circomlib + circomlibjs) =="
[ -d node_modules/circomlib ] || npm install --no-save circomlib circomlibjs >/dev/null 2>&1
echo "deps OK"

echo "== [1/7] compile (bn128) =="
mkdir -p build
circom membership_withdraw.circom --r1cs --wasm --sym -l node_modules -o build
snarkjs r1cs info build/membership_withdraw.r1cs

echo "== [2/7] powers of tau (bn128, pow=$POW) =="
cd build
if [ ! -f pot_final.ptau ] || [ ! -f pot_final.pow ] || [ "$(cat pot_final.pow 2>/dev/null || true)" != "$POW" ]; then
  rm -f pot_0000.ptau pot_0001.ptau pot_beacon.ptau pot_final.ptau pot_final.pow
  snarkjs powersoftau new bn128 "$POW" pot_0000.ptau -v >/dev/null
  snarkjs powersoftau contribute pot_0000.ptau pot_0001.ptau --name="memb-coord" -e="$PTAU_ENTROPY" >/dev/null
  snarkjs powersoftau beacon pot_0001.ptau pot_beacon.ptau "$BEACON" 10 -n="memb phase1 beacon" >/dev/null
  snarkjs powersoftau prepare phase2 pot_beacon.ptau pot_final.ptau -v >/dev/null
  printf '%s\n' "$POW" > pot_final.pow
fi
echo "ptau OK"

echo "== [3/7] groth16 setup + beacon -> vk =="
snarkjs groth16 setup membership_withdraw.r1cs pot_final.ptau memb_0000.zkey >/dev/null
snarkjs zkey contribute memb_0000.zkey memb_0001.zkey --name="memb-coord" -e="$ZKEY_ENTROPY" >/dev/null
snarkjs zkey beacon memb_0001.zkey memb_final.zkey "$BEACON" 10 -n="memb final beacon" >/dev/null
snarkjs zkey verify membership_withdraw.r1cs pot_final.ptau memb_final.zkey
snarkjs zkey export verificationkey memb_final.zkey verification_key.json
echo "vk OK"

echo "== [4/7] gerar testemunha determinística =="
cd "$HERE"
node gen-input.js

echo "== [5/7] witness + prove =="
cd build
node membership_withdraw_js/generate_witness.js membership_withdraw_js/membership_withdraw.wasm input.json witness.wtns
snarkjs groth16 prove memb_final.zkey witness.wtns proof.json public.json

echo "== [6/7] snarkjs verify (off-chain fidelity) =="
snarkjs groth16 verify verification_key.json public.json proof.json
echo "public signals (ordem = [root, nullifierHash, recipient, context]):"
cat public.json

echo "== [7/7] converte -> Soroban BN254 hex =="
node "$HERE/../por/snarkjs2soroban-bn254.js" verification_key.json proof.json public.json "$HERE/soroban-bn254.json"
echo
echo "vk sha256 (audit/reference):"
sha256sum verification_key.json
