#!/usr/bin/env bash
# Phase 2 — contribuição. CADA MEMBRO roda isto na sua máquina:
#   ./03-contribute.sh circuit_{i-1}.zkey circuit_{i}.zkey "Nome do contribuidor"
# Recebe o zkey anterior, adiciona aleatoriedade FRESCA, gera o próximo.
# A entropia é digitada e NUNCA salva — o membro deve descartá-la.
# Publica circuit_{i}.zkey + o hash impresso, e passa adiante.
set -euo pipefail
IN="${1:?uso: 03-contribute.sh <in.zkey> <out.zkey> <nome>}"
OUT="${2:?falta out.zkey}"
NAME="${3:?falta o nome do contribuidor}"

echo "Contribuidor: $NAME"
echo "Digite uma string longa e aleatória (movimente o teclado). Ela será descartada após uso."
read -r -s -p "Entropia: " ENTROPY; echo
snarkjs zkey contribute "$IN" "$OUT" --name="$NAME" -e="$ENTROPY"
echo "── hash da sua contribuição (publique junto com $OUT) ──"
snarkjs zkey export bellman "$OUT" /dev/null 2>/dev/null || true
echo "✓ $OUT gerado. Envie $OUT ao coordenador/próximo contribuidor e publique o hash acima."
