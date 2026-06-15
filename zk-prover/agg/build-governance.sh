#!/usr/bin/env bash
# DPO2U — build + setup (coordinator, dev) of the STRUCTURAL AI-governance predicate
# circuit (BN254) + Hiroshima (N-of-M) and EU-AIA (tier) proofs (study #2 implemented).
# COORDINATOR (1-party + beacon) = DEV vk; multi-party = SCF Tranche #0.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
cd "$HERE"
POW="${POW:-14}"
BEACON="${BEACON:-0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20}"

echo "== [0/5] circomlib =="
if [ ! -d node_modules/circomlib ]; then
  if [ -d ../por/node_modules/circomlib ]; then mkdir -p node_modules && cp -r ../por/node_modules/circomlib node_modules/;
  else npm install --no-save circomlib >/dev/null 2>&1; fi
fi
[ -f node_modules/circomlib/circuits/comparators.circom ] || { echo "circomlib missing"; exit 1; }

echo "== [1/5] compile (bn128) =="
mkdir -p build
circom governance_predicate.circom --r1cs --wasm --sym -l node_modules -o build
snarkjs r1cs info build/governance_predicate.r1cs

echo "== [2/5] powers of tau =="
cd build
snarkjs powersoftau new bn128 "$POW" gpot_0000.ptau -v >/dev/null
snarkjs powersoftau contribute gpot_0000.ptau gpot_0001.ptau --name="gov-coord" -e="$(head -c64 /dev/urandom | base64)" >/dev/null
snarkjs powersoftau beacon gpot_0001.ptau gpot_beacon.ptau "$BEACON" 10 -n="gov phase1 beacon" >/dev/null
snarkjs powersoftau prepare phase2 gpot_beacon.ptau gpot_final.ptau -v >/dev/null

echo "== [3/5] groth16 setup + beacon → structural vk (shared) =="
snarkjs groth16 setup governance_predicate.r1cs gpot_final.ptau gov_0000.zkey >/dev/null
snarkjs zkey contribute gov_0000.zkey gov_0001.zkey --name="gov-coord" -e="$(head -c64 /dev/urandom | base64)" >/dev/null
snarkjs zkey beacon gov_0001.zkey gov_final.zkey "$BEACON" 10 -n="gov final beacon" >/dev/null
snarkjs zkey verify governance_predicate.r1cs gpot_final.ptau gov_final.zkey
snarkjs zkey export verificationkey gov_final.zkey verification_key_gov.json
echo "structural vk sha256:"; sha256sum verification_key_gov.json

gen() { # code framework_id input.json
  local code="$1"
  node governance_predicate_js/generate_witness.js governance_predicate_js/governance_predicate.wasm "$2" "wit_${code}.wtns"
  snarkjs groth16 prove gov_final.zkey "wit_${code}.wtns" "proof_${code}.json" "public_${code}.json"
  snarkjs groth16 verify verification_key_gov.json "public_${code}.json" "proof_${code}.json"
  echo "  [${code}] public=$(cat public_${code}.json | tr -d '\n ')"
}

echo "== [4/5] HIROSHIMA proof (framework_id=1, N-of-M: all 11 principles attested) =="
cat > in_HIROSHIMA.json <<'JSON'
{ "framework_id": "1", "context": "2000001",
  "attested": ["1","1","1","1","1","1","1","1","1","1","1"],
  "tier": "0", "redline_clear": "1", "hr_met": "0" }
JSON
gen HIROSHIMA in_HIROSHIMA.json

echo "== [5/5] EU-AIA proof (framework_id=2, tier=high-risk, red-line clear, obligations met) =="
cat > in_EUAIA.json <<'JSON'
{ "framework_id": "2", "context": "2000002",
  "attested": ["0","0","0","0","0","0","0","0","0","0","0"],
  "tier": "2", "redline_clear": "1", "hr_met": "1" }
JSON
gen EUAIA in_EUAIA.json

cat > governance.json <<JSON
{ "circuit": "governance_predicate.circom", "curve": "bn128 (BN254)",
  "public_signals_order": ["compliant","framework_id","context"],
  "structural_vk_sha256": "$(sha256sum verification_key_gov.json | awk '{print $1}')",
  "frameworks": { "1": "Hiroshima ICOC (N-of-M, K=11/11)", "2": "EU-AIA (tier<=high, red-line clear, obligations met)" },
  "ceremony": "coordinator (1-party + beacon) — DEV vk." }
JSON
echo "governance.json + proofs written (proof_HIROSHIMA / proof_EUAIA, shared structural vk)."
