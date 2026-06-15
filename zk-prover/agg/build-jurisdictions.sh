#!/usr/bin/env bash
# DPO2U — build + setup (coordenador, dev) do circuito de compliance por-jurisdição
# BN254 + geração de N provas independentes (uma por jurisdição) para agregação
# SnarkPack (moonshot #5).
#
# COORDENADOR (1-party + beacon) = vk de DESENVOLVIMENTO. Cerimônia multi-party =
# Tranche #0 do SCF (ver scripts/zk-ceremony/). UMA vk compartilhada por TODAS as
# provas (requisito SnarkPack); só threshold/context mudam por jurisdição.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
cd "$HERE"
POW="${POW:-14}"
BEACON="${BEACON:-0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20}"

# Jurisdições do demo: code:threshold:context  (context = inteiro de campo, dev)
JURS=(
  "BR:60:1000001"
  "EU:75:1000002"
  "SG:70:1000003"
  "UAE:65:1000004"
)
# scores privados (>= threshold de cada jurisdição) — witness, nunca on-chain
SCORES=(82 90 88 79)

echo "== [0/5] circomlib =="
# Reuse the PoR circomlib (guaranteed present) to avoid npm hoisting surprises.
if [ ! -d node_modules/circomlib ]; then
  if [ -d ../por/node_modules/circomlib ]; then
    mkdir -p node_modules && cp -r ../por/node_modules/circomlib node_modules/
  else
    npm install --no-save circomlib >/dev/null 2>&1
  fi
fi
[ -f node_modules/circomlib/circuits/bitify.circom ] || { echo "circomlib missing"; exit 1; }
echo "circomlib OK"

echo "== [1/5] compile (bn128) =="
mkdir -p build
circom jurisdiction_compliance.circom --r1cs --wasm --sym -l node_modules -o build
snarkjs r1cs info build/jurisdiction_compliance.r1cs

echo "== [2/5] powers of tau (bn128, pow=$POW) =="
cd build
snarkjs powersoftau new bn128 "$POW" pot_0000.ptau -v >/dev/null
snarkjs powersoftau contribute pot_0000.ptau pot_0001.ptau --name="jur-coord" -e="$(head -c64 /dev/urandom | base64)" >/dev/null
snarkjs powersoftau beacon pot_0001.ptau pot_beacon.ptau "$BEACON" 10 -n="jur phase1 beacon" >/dev/null
snarkjs powersoftau prepare phase2 pot_beacon.ptau pot_final.ptau -v >/dev/null
echo "ptau OK"

echo "== [3/5] groth16 setup + beacon → vk (compartilhada) =="
snarkjs groth16 setup jurisdiction_compliance.r1cs pot_final.ptau jur_0000.zkey >/dev/null
snarkjs zkey contribute jur_0000.zkey jur_0001.zkey --name="jur-coord" -e="$(head -c64 /dev/urandom | base64)" >/dev/null
snarkjs zkey beacon jur_0001.zkey jur_final.zkey "$BEACON" 10 -n="jur final beacon" >/dev/null
snarkjs zkey verify jurisdiction_compliance.r1cs pot_final.ptau jur_final.zkey
snarkjs zkey export verificationkey jur_final.zkey verification_key.json
echo "shared vk sha256:"; sha256sum verification_key.json

echo "== [4/5] gerar N provas independentes (uma por jurisdição) =="
i=0
for entry in "${JURS[@]}"; do
  code="${entry%%:*}"; rest="${entry#*:}"; thr="${rest%%:*}"; ctx="${rest##*:}"
  score="${SCORES[$i]}"
  cat > "input_${code}.json" <<JSON
{ "threshold": "${thr}", "context": "${ctx}", "score": "${score}" }
JSON
  node jurisdiction_compliance_js/generate_witness.js jurisdiction_compliance_js/jurisdiction_compliance.wasm "input_${code}.json" "witness_${code}.wtns"
  snarkjs groth16 prove jur_final.zkey "witness_${code}.wtns" "proof_${code}.json" "public_${code}.json"
  snarkjs groth16 verify verification_key.json "public_${code}.json" "proof_${code}.json"
  echo "  [${code}] thr=${thr} ctx=${ctx} public=$(cat public_${code}.json | tr -d '\n ')"
  i=$((i+1))
done

echo "== [5/5] manifest =="
JLIST=$(printf '"%s",' "${JURS[@]%%:*}" | sed 's/,$//')
cat > jurisdictions.json <<JSON
{ "circuit": "jurisdiction_compliance.circom", "curve": "bn128 (BN254)",
  "public_signals_order": ["compliant","threshold","context"],
  "shared_vk_sha256": "$(sha256sum verification_key.json | awk '{print $1}')",
  "jurisdictions": [${JLIST}],
  "ceremony": "coordinator (1-party + beacon) — DEV vk. Multi-party MPC = SCF Tranche #0." }
JSON
echo "jurisdictions.json written. Proofs: proof_<CODE>.json (shared vk)."
