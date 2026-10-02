#!/usr/bin/env bash
# ENSAIO ponta a ponta — NÃO É CERIMÔNIA DE PRODUÇÃO.
# Os 3 "contribuidores" são SIMULADOS nesta mesma máquina, pelo mesmo operador:
# não há independência, logo NÃO há garantia 1-of-N. Serve para provar que o pipeline
# (Phase 1 pública → Phase 2 encadeada → beacon commit-reveal → VK → prova → verificação
# independente da transcrição → por-verifier on-chain) funciona e é reproduzível.
#   ./rehearsal.sh            (saída pública em scripts/zk-ceremony-por/ensaio/)
. "$(dirname "$0")/common.sh"
OUT="${OUT:-$HERE/ensaio}"; mkdir -p "$OUT"
DRAND_CHAIN="${DRAND_CHAIN:-52db9ba70e0cc0f6eaf7803dd07447a1f5477735fd3f661792ba94600c84e971}"  # quicknet, 3s
DRAND_API="${DRAND_API:-https://api.drand.sh}"
DELAY="${BEACON_DELAY_ROUNDS:-40}"
N="${N_CONTRIB:-3}"

echo "######## ENSAIO — contribuidores simulados, NÃO é produção ########"
"$HERE/00-compile.sh" >/dev/null
"$HERE/01-phase1.sh"
"$HERE/02-phase2-init.sh"

# Beacon commit-reveal: a rodada drand é FIXADA antes da 1ª contribuição; o valor só
# passa a existir depois que a cadeia de contribuições já está fechada.
CUR="$(curl -sSf "$DRAND_API/$DRAND_CHAIN/public/latest" | node -pe 'JSON.parse(require("fs").readFileSync(0)).round')"
TARGET=$((CUR + DELAY))
COMMIT_AT="$(date -u +%FT%TZ)"
echo "beacon commit: drand $DRAND_CHAIN round $TARGET (rodada atual $CUR) em $COMMIT_AT"

for k in $(seq 1 "$N"); do
  ENTROPY_SOURCE=urandom "$HERE/03-contribute.sh" "$(zkey_name $((k-1)))" "$(zkey_name "$k")" "ENSAIO simulado #$k (mesma maquina)" \
    | grep -E "contribuidor|sha256|contribution hash"
done
CHAIN_CLOSED_AT="$(date -u +%FT%TZ)"

echo "aguardando drand round $TARGET ..."
until BJ="$(curl -sSf "$DRAND_API/$DRAND_CHAIN/public/$TARGET" 2>/dev/null)"; do sleep 3; done
RAND="$(echo "$BJ" | node -pe 'JSON.parse(require("fs").readFileSync(0)).randomness')"
echo "$BJ" > "$OUT/beacon-drand-round.json"
echo "beacon reveal: round $TARGET randomness $RAND"

"$HERE/04-beacon-finalize.sh" "$(zkey_name "$N")" "$RAND" 10 | grep -E "ZKey Ok|vk_sha256|✓"
"$HERE/05-convert.sh" | grep -E "OK|✓"

# Manifest público (o que um auditor recebe junto com os .zkey).
{
  echo "# ENSAIO — NÃO É CERIMÔNIA DE PRODUÇÃO (contribuidores simulados na mesma máquina)"
  grep -E '^(circom|snarkjs|circomlib|circuit_sha256|r1cs_sha256)=' "$WORK/build-info.txt"
  grep -E '^(ptau_source|ptau_b2sum|ptau_sha256)=' "$WORK/ptau-info.txt"
  for k in $(seq 0 "$N"); do i="$(printf %04d "$k")"; echo "zkey_${i}_sha256=$(sha "$WORK/por_$i.zkey")"; done
  awk -F'|' '$1 ~ /^[0-9]+$/ && $1 > 0 {printf "contrib_%04d_hash=%s\n", $1, $5}' "$TRANSCRIPT_LOG"
  echo "zkey_final_sha256=$(sha "$WORK/por_final.zkey")"
  echo "beacon_source=drand chain $DRAND_CHAIN round $TARGET"
  echo "beacon_committed_at=$COMMIT_AT"
  echo "beacon_round_at_commit=$CUR"
  echo "contributions_closed_at=$CHAIN_CLOSED_AT"
  echo "beacon_hash=$RAND"
  echo "beacon_iter=10"
  echo "vk_sha256=$(sha "$WORK/verification_key.json")"
} > "$OUT/manifest.txt"
cp "$TRANSCRIPT_LOG" "$OUT/contributions.log"
cp "$WORK"/{verification_key.json,proof.json,public.json,soroban-bn254.json,build-info.txt,ptau-info.txt} "$OUT/"
echo
echo "######## verificação independente da transcrição ########"
SKIP_PTAU_VERIFY="${SKIP_PTAU_VERIFY:-1}" "$HERE/verify-transcript.sh" "$WORK" "$OUT/manifest.txt" | tee "$OUT/verify-transcript.log"
echo "✓ ENSAIO concluído — artefatos públicos em $OUT"
