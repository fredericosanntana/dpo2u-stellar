#!/usr/bin/env bash
# Compila por_solvency.circom (bn128) → r1cs + wasm + sym. Coordenador roda 1x.
# Qualquer auditor roda o mesmo e compara o sha256 do r1cs com o da transcrição.
. "$(dirname "$0")/common.sh"
command -v circom >/dev/null || die "circom ausente (>= 2.1.6)"
command -v snarkjs >/dev/null || die "snarkjs ausente (npm i -g snarkjs@0.7.x)"
[ -d "$POR/node_modules/circomlib" ] || ( cd "$POR" && npm install --no-save circomlib@2.0.5 >/dev/null 2>&1 )
circom "$CIRCUIT_FILE" --r1cs --wasm --sym --prime bn128 -l "$POR/node_modules" -o "$WORK"
snarkjs r1cs info "$R1CS"
{
  echo "circom=$(circom --version | awk '{print $NF}')"
  echo "snarkjs=$(snarkjs --version 2>/dev/null | head -1 | awk '{print $1}')"
  echo "circomlib=$(node -p "require('$POR/node_modules/circomlib/package.json').version")"
  echo "circuit_sha256=$(sha "$CIRCUIT_FILE")"
  echo "r1cs_sha256=$(sha "$R1CS")"
} | tee "$WORK/build-info.txt"
echo "✓ r1cs/wasm em $WORK"
