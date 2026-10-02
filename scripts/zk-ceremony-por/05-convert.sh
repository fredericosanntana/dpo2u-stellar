#!/usr/bin/env bash
# Gera uma prova de solvência com a zkey final, verifica off-chain (snarkjs) e
# converte VK + prova para o formato do por-verifier (snarkjs2soroban-bn254.js).
#   ./05-convert.sh [input.json]
# input.json padrão: 4 ativos, Σreservas=4.25M ≥ Σobrigações=3.98M, context=123456789.
. "$(dirname "$0")/common.sh"
INPUT="${1:-$WORK/input.json}"
if [ ! -f "$INPUT" ]; then
cat > "$INPUT" <<'JSON'
{
  "reserves":    ["1500000", "1250000", "1000000", "500000"],
  "liabilities": ["1400000", "1180000",  "900000", "500000"],
  "context": "123456789"
}
JSON
fi
cd "$WORK"
node "$WITGEN" "$WASM" "$INPUT" witness.wtns
snarkjs groth16 prove por_final.zkey witness.wtns proof.json public.json
snarkjs groth16 verify verification_key.json public.json proof.json | tee groth16-verify.log
grep -q "OK" groth16-verify.log || die "snarkjs groth16 verify falhou"
rm -f witness.wtns   # witness = posições privadas; não fica no disco
node "$POR/snarkjs2soroban-bn254.js" verification_key.json proof.json public.json soroban-bn254.json
echo "✓ soroban-bn254.json (cole os hex em contracts/por-verifier/src/test_ceremony.rs)"
