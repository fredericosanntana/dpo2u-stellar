#!/usr/bin/env bash
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
cd "$HERE"

POW="${POW:-14}"
BEACON="${BEACON:-0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20}"
CIRCUIT_NAME="${CIRCUIT_NAME:-compliance_intent_policy}"
CIRCUIT_FILE="${CIRCUIT_FILE:-${CIRCUIT_NAME}.circom}"
BUILD_DIR="${BUILD_DIR:-build}"
INPUT_JSON="${INPUT_JSON:-$BUILD_DIR/input.json}"
OUT_JSON="${OUT_JSON:-$BUILD_DIR/soroban-bn254.json}"

mkdir -p "$BUILD_DIR"

if [ ! -f "$INPUT_JSON" ]; then
  cat > "$INPUT_JSON" <<'JSON'
{
  "jurisdiction_code": "76",
  "policy_version": "1",
  "mandate_class": "2",
  "risk_bucket": "3",
  "counterparty_class": "4",
  "threshold": "700",
  "policy_score": "725",
  "context": "123456789"
}
JSON
fi

echo "== [0/6] circomlib =="
[ -d node_modules/circomlib ] || npm install --no-save circomlib >/dev/null 2>&1
echo "circomlib OK"

echo "== [1/6] compile (${CIRCUIT_NAME}, bn128) =="
circom "$CIRCUIT_FILE" --r1cs --wasm --sym -l node_modules -o "$BUILD_DIR"
snarkjs r1cs info "$BUILD_DIR/${CIRCUIT_NAME}.r1cs"

echo "== [2/6] powers of tau (bn128, pow=$POW) =="
(
  cd "$BUILD_DIR"
  snarkjs powersoftau new bn128 "$POW" pot_0000.ptau -v >/dev/null
  snarkjs powersoftau contribute pot_0000.ptau pot_0001.ptau --name="policy-coord" -e="$(head -c64 /dev/urandom | base64)" >/dev/null
  snarkjs powersoftau beacon pot_0001.ptau pot_beacon.ptau "$BEACON" 10 -n="policy phase1 beacon" >/dev/null
  snarkjs powersoftau prepare phase2 pot_beacon.ptau pot_final.ptau -v >/dev/null
)
echo "ptau OK"

echo "== [3/6] groth16 setup + beacon -> vk =="
(
  cd "$BUILD_DIR"
  snarkjs groth16 setup "${CIRCUIT_NAME}.r1cs" pot_final.ptau "${CIRCUIT_NAME}_0000.zkey" >/dev/null
  snarkjs zkey contribute "${CIRCUIT_NAME}_0000.zkey" "${CIRCUIT_NAME}_0001.zkey" --name="policy-coord" -e="$(head -c64 /dev/urandom | base64)" >/dev/null
  snarkjs zkey beacon "${CIRCUIT_NAME}_0001.zkey" "${CIRCUIT_NAME}_final.zkey" "$BEACON" 10 -n="policy final beacon" >/dev/null
  snarkjs zkey verify "${CIRCUIT_NAME}.r1cs" pot_final.ptau "${CIRCUIT_NAME}_final.zkey"
  snarkjs zkey export verificationkey "${CIRCUIT_NAME}_final.zkey" verification_key.json
)
echo "vk OK"

echo "== [4/6] witness + prove =="
node "$BUILD_DIR/${CIRCUIT_NAME}_js/generate_witness.js" "$BUILD_DIR/${CIRCUIT_NAME}_js/${CIRCUIT_NAME}.wasm" "$INPUT_JSON" "$BUILD_DIR/witness.wtns"
(
  cd "$BUILD_DIR"
  snarkjs groth16 prove "${CIRCUIT_NAME}_final.zkey" witness.wtns proof.json public.json
)

echo "== [5/6] snarkjs verify (off-chain fidelity) =="
(
  cd "$BUILD_DIR"
  snarkjs groth16 verify verification_key.json public.json proof.json
)

echo "== [6/6] convert -> Soroban BN254 hex =="
echo "public signals (order = [policy_pass, policy_commit, context]):"
read_file="${BUILD_DIR}/public.json"
cat "$read_file"
node "$HERE/snarkjs2soroban-bn254.js" "$BUILD_DIR/verification_key.json" "$BUILD_DIR/proof.json" "$BUILD_DIR/public.json" "$OUT_JSON"
echo
echo "vk sha256 (fail-closed pin):"
sha256sum "$BUILD_DIR/verification_key.json"
