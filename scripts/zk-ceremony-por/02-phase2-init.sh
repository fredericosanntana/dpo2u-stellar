#!/usr/bin/env bash
# Phase 2 — init (específica do circuito). Coordenador roda 1x → por_0000.zkey.
# por_0000 é determinístico dado (r1cs, ptau): qualquer auditor o regenera e compara.
. "$(dirname "$0")/common.sh"
[ -f "$R1CS" ] || die "rode 00-compile.sh"
[ -f "$PTAU_FILE" ] || die "rode 01-phase1.sh"
Z0="$(zkey_name 0)"
snarkjs groth16 setup "$R1CS" "$PTAU_FILE" "$Z0"
: > "$TRANSCRIPT_LOG"
echo "0|init (coordenador)|-|$(sha "$Z0")|-" | tee -a "$TRANSCRIPT_LOG"
echo "✓ $Z0 — envie ao contribuidor 1 (03-contribute.sh)"
