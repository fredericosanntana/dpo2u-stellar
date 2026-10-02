#!/usr/bin/env bash
# Phase 2 — UMA contribuição. Em produção CADA contribuidor roda na máquina DELE:
#   ./03-contribute.sh <in.zkey> <out.zkey> "<nome/organização>"
# Pré: ter rodado 00-compile.sh e 01-phase1.sh localmente (r1cs + ptau públicos) para
# VERIFICAR a entrada antes de contribuir e ler o próprio hash depois.
# Entropia:
#   - padrão (produção): o snarkjs PEDE a entropia direto no terminal. A saída NÃO é
#     redirecionada (nada do que você digita vai para arquivo, argv ou histórico).
#   - ENTROPY_SOURCE=urandom (só ENSAIO): 64 bytes de /dev/urandom, nunca gravados.
# Publica: sha256(out.zkey) + o "contribution hash" (blake2b) — ambos públicos.
. "$(dirname "$0")/common.sh"
IN="${1:?uso: 03-contribute.sh <in.zkey> <out.zkey> <nome>}"
OUT="${2:?falta out.zkey}"
NAME="${3:?falta o nome do contribuidor}"
[ -f "$IN" ] || die "não achei $IN"
[ -f "$R1CS" ] && [ -f "$PTAU_FILE" ] || die "falta r1cs/ptau em $WORK (rode 00-compile.sh e 01-phase1.sh)"
echo "Contribuidor: $NAME"
echo "sha256(entrada) = $(sha "$IN")   ← confira com o publicado pelo contribuidor anterior"
V="$(mktemp)"; trap 'rm -f "$V"' EXIT
snarkjs zkey verify "$R1CS" "$PTAU_FILE" "$IN" > "$V" 2>&1 || true
grep -q "ZKey Ok" "$V" || die "a zkey de ENTRADA não verifica contra r1cs+ptau — não contribua"
echo "✓ entrada verificada (ZKey Ok)"
if [ "${ENTROPY_SOURCE:-prompt}" = "urandom" ]; then
  snarkjs zkey contribute "$IN" "$OUT" --name="$NAME" -e="$(head -c 64 /dev/urandom | base64 -w0)" >/dev/null
else
  snarkjs zkey contribute "$IN" "$OUT" --name="$NAME"
fi
# Lê o hash da própria contribuição de volta (o snarkjs lista da mais nova p/ a mais antiga) — sem tocar a entropia.
snarkjs zkey verify "$R1CS" "$PTAU_FILE" "$OUT" > "$V" 2>&1 || true
grep -q "ZKey Ok" "$V" || die "a zkey de SAÍDA não verifica"
CH="$(hashes_after "contribution #" "$V" | head -1)"
[ ${#CH} -eq 128 ] || die "não consegui ler o contribution hash"
IDX="$(basename "$OUT" .zkey | sed 's/[^0-9]//g')"
echo "${IDX:-?}|$NAME|$(sha "$IN")|$(sha "$OUT")|$CH" >> "$TRANSCRIPT_LOG"
echo "── PUBLIQUE ──"
echo "contribuidor     : $NAME"
echo "sha256(saída)    : $(sha "$OUT")"
echo "contribution hash: $CH"
echo "✓ Envie $OUT ao próximo. Descarte a entropia (não anote, não reuse)."
