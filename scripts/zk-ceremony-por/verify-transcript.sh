#!/usr/bin/env bash
# Verificação INDEPENDENTE da cerimônia PoR — qualquer um roda, sem confiar no coordenador.
#   ./verify-transcript.sh <dir-com-os-zkeys-publicados> <transcript.manifest>
# O manifest (publicado junto com a transcrição) tem linhas `chave=valor`:
#   r1cs_sha256, ptau_b2sum, vk_sha256, zkey_<i>_sha256 (i=0000..N), zkey_final_sha256,
#   contrib_<i>_hash (blake2b do snarkjs, i=0001..N), beacon_hash, beacon_iter
# Checagens (todas fail-closed):
#   1. recompila o circuito do código-fonte e compara sha256(r1cs);
#   2. ptau: blake2b == o publicado no README do snarkjs (Hermez) + `powersoftau verify`;
#   3. regenera por_0000 a partir de (r1cs, ptau) e compara o sha256 (setup é determinístico);
#   4. cada por_i.zkey: sha256 == manifest e `snarkjs zkey verify r1cs ptau por_i` = ZKey Ok
#      (prova que cada contribuição publicada estende a anterior, sem pular elo);
#   5. por_final: zkey verify = ZKey Ok, os contribution hashes listados pelo snarkjs ==
#      os publicados por cada contribuidor, e o beacon aplicado == beacon_hash anunciado;
#   6. VK exportada da por_final == vk_sha256 publicado (é a VK que o por-verifier recebe).
. "$(dirname "$0")/common.sh"
PUB="${1:?uso: verify-transcript.sh <dir-zkeys> <manifest>}"
MAN="${2:?falta manifest}"
PUB="$(cd "$PUB" && pwd)"; MAN="$(cd "$(dirname "$MAN")" && pwd)/$(basename "$MAN")"
get() { grep -E "^$1=" "$MAN" | head -1 | cut -d= -f2-; }
ok() { echo "  ✓ $*"; }
FAIL=0; bad() { echo "  ✗ $*"; FAIL=1; }

AUD="$(mktemp -d)"; trap 'rm -rf "$AUD"' EXIT
export WORK="$AUD"
echo "[1] recompila o circuito e compara o r1cs"
"$HERE/00-compile.sh" >/dev/null 2>&1 || die "compilação falhou"
R="$AUD/${CIRCUIT_NAME}.r1cs"
[ "$(sha "$R")" = "$(get r1cs_sha256)" ] && ok "r1cs sha256 = $(get r1cs_sha256)" || bad "r1cs diverge: $(sha "$R")"

echo "[2] ptau público"
P="$PUB/$(basename "$PTAU_FILE")"
[ -f "$P" ] || { curl -sSfL --retry 3 -o "$AUD/p.ptau" "$PTAU_URL" && P="$AUD/p.ptau"; }
B2="$(b2sum "$P" | awk '{print $1}')"
[ "$B2" = "$PTAU_B2" ] && [ "$B2" = "$(get ptau_b2sum)" ] && ok "blake2b = publicado (snarkjs README)" || bad "ptau blake2b diverge: $B2"
if [ "${SKIP_PTAU_VERIFY:-0}" != "1" ]; then
  snarkjs powersoftau verify "$P" > "$AUD/ptau.log" 2>&1 && grep -q "Powers of Tau Ok" "$AUD/ptau.log" && ok "powersoftau verify = Ok" || bad "powersoftau verify falhou"
fi

echo "[3] regenera por_0000 (determinístico)"
snarkjs groth16 setup "$R" "$P" "$AUD/por_0000.zkey" >/dev/null 2>&1
[ "$(sha "$AUD/por_0000.zkey")" = "$(get zkey_0000_sha256)" ] && ok "por_0000 sha256 confere" || bad "por_0000 regenerado diverge"

echo "[4] cadeia de contribuições"
N=0
for Z in "$PUB"/por_[0-9][0-9][0-9][0-9].zkey; do
  i="$(basename "$Z" .zkey | sed 's/por_//')"
  [ "$(sha "$Z")" = "$(get "zkey_${i}_sha256")" ] && ok "por_$i sha256 confere" || bad "por_$i sha256 diverge"
  if [ "$i" != "0000" ]; then
    snarkjs zkey verify "$R" "$P" "$Z" > "$AUD/v$i.log" 2>&1 && grep -q "ZKey Ok" "$AUD/v$i.log" && ok "por_$i zkey verify = ZKey Ok" || bad "por_$i zkey verify falhou"
    N=$((N+1))
  fi
done
EXP="$(grep -cE '^contrib_[0-9]{4}_hash=' "$MAN")"
[ "$N" = "$EXP" ] && ok "$N contribuições publicadas = $EXP no manifest" || bad "$N zkeys vs $EXP hashes no manifest"

echo "[5] zkey final: cadeia completa + hashes + beacon"
F="$PUB/por_final.zkey"
[ "$(sha "$F")" = "$(get zkey_final_sha256)" ] && ok "por_final sha256 confere" || bad "por_final sha256 diverge"
snarkjs zkey verify "$R" "$P" "$F" > "$AUD/vf.log" 2>&1 && grep -q "ZKey Ok" "$AUD/vf.log" && ok "por_final zkey verify = ZKey Ok" || bad "por_final zkey verify falhou"
# snarkjs lista cada contribuição como "contribution #k <nome>:" + 4 linhas hex.
# A posição importa: o hash publicado pelo contribuidor k tem de ser a contribuição #k.
for k in $(seq 1 "$N"); do
  i="$(printf %04d "$k")"; H="$(get "contrib_${i}_hash")"
  L="$(hashes_after "contribution #$k " "$AUD/vf.log" | head -1)"
  [ -n "$H" ] && [ "$L" = "$H" ] && ok "contribuição #$k: hash publicado = #$k da cadeia" || bad "contribuição #$k: publicado ${H:0:16}… ≠ cadeia ${L:0:16}…"
done
TOT="$(grep -c "contribution #" "$AUD/vf.log")"
[ "$TOT" = "$((N+1))" ] && ok "cadeia final = $N contribuições + 1 beacon (sem elo extra)" || bad "cadeia final tem $TOT entradas, esperado $((N+1))"
U="$(for k in $(seq 1 "$N"); do get "contrib_$(printf %04d "$k")_hash"; done | sort -u | wc -l)"
[ "$U" = "$N" ] && ok "$N contribution hashes distintos" || bad "contribution hashes repetidos"
BH="$(get beacon_hash)"
grep -qi "Beacon generator: *$BH" "$AUD/vf.log" && ok "beacon aplicado = $BH" || bad "beacon da zkey final != beacon_hash publicado"

echo "[6] VK"
snarkjs zkey export verificationkey "$F" "$AUD/vk.json" >/dev/null 2>&1
[ "$(sha "$AUD/vk.json")" = "$(get vk_sha256)" ] && ok "vk sha256 = $(get vk_sha256)" || bad "vk diverge: $(sha "$AUD/vk.json")"

echo
if [ "$FAIL" = 0 ]; then echo "TRANSCRIPT OK — cadeia íntegra ($N contribuições + beacon)"; else echo "TRANSCRIPT FALHOU"; exit 1; fi
