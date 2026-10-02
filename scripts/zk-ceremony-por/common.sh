#!/usr/bin/env bash
# Configuração compartilhada da cerimônia PoR (por_solvency, BN254/bn128).
# Fonte com `. "$(dirname "$0")/common.sh"`. Tudo sobrescrevível por env.
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="$(cd "$HERE/../.." && pwd)"
POR="$REPO/zk-prover/por"
CIRCUIT_NAME="por_solvency"
CIRCUIT_FILE="$POR/${CIRCUIT_NAME}.circom"
# Diretório de trabalho (gitignored via zk-prover/por/build/). Nunca contém entropia.
WORK="${WORK:-$POR/build/ceremony}"
mkdir -p "$WORK"

# Phase 1 pública: Hermez/Polygon "powersOfTau28_hez_final" (54 contribuições + beacon),
# hash blake2b-512 publicado no README oficial do snarkjs (iden3/snarkjs, tabela
# "Prepared (phase2) Ptau files for bn128"). O circuito tem 1113 constraints → 2^12=4096 sobra.
PTAU_POW="${PTAU_POW:-12}"
PTAU_FILE="$WORK/powersOfTau28_hez_final_${PTAU_POW}.ptau"
PTAU_URL="${PTAU_URL:-https://circom.info/powersOfTau28_hez_final_${PTAU_POW}.ptau}"
# blake2b-512 publicado (snarkjs README) para pow 12. Mudar PTAU_POW exige mudar este pin.
PTAU_B2_12="ded2694169b7b08e898f736d5de95af87c3f1a64594013351b1a796dbee393bd825f88f9468c84505ddd11eb0b1465ac9b43b9064aa8ec97f2b73e04758b8a4a"
PTAU_B2="${PTAU_B2:-$PTAU_B2_12}"

R1CS="$WORK/${CIRCUIT_NAME}.r1cs"
WASM="$WORK/${CIRCUIT_NAME}_js/${CIRCUIT_NAME}.wasm"
WITGEN="$WORK/${CIRCUIT_NAME}_js/generate_witness.js"
TRANSCRIPT_LOG="$WORK/contributions.log"   # recibos públicos (nome, hashes) — sem entropia

zkey_name() { printf '%s/por_%04d.zkey' "$WORK" "$1"; }
sha() { sha256sum "$1" | awk '{print $1}'; }
die() { echo "ERRO: $*" >&2; exit 1; }
# Extrai os hashes blake2b-512 (formatHash do snarkjs: título + 4 linhas de 4×8 hex)
# que seguem cada linha contendo <padrão>. Imprime um hash (128 hex) por ocorrência.
hashes_after() {
  awk -v pat="$1" 'index($0,pat){f=1;s="";n=0;next}
    f && match($0,/[0-9a-f]+ [0-9a-f]+ [0-9a-f]+ [0-9a-f]+/){x=substr($0,RSTART,RLENGTH);gsub(/ /,"",x);s=s x;n++;if(n==4){print s;f=0}}' "$2"
}
