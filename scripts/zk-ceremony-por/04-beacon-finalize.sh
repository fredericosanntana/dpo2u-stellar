#!/usr/bin/env bash
# Phase 2 — beacon público + verify + export da VK. Coordenador, após N contribuições.
#   ./04-beacon-finalize.sh <por_N.zkey> <beaconHashHex> [iterExp=10]
# Produção: o beaconHash é a randomness de uma fonte pública FUTURA anunciada ANTES
# da última contribuição (ex.: rodada drand R, ou hash do bloco BTC de altura H).
# Não há default: sem beacon explícito o script recusa.
. "$(dirname "$0")/common.sh"
LAST="${1:?uso: 04-beacon-finalize.sh <por_N.zkey> <beaconHash> [iterExp]}"
BEACON="${2:?beaconHash obrigatório (hex) — sem default}"
ITER="${3:-10}"
[[ "$BEACON" =~ ^[0-9a-fA-F]{64,}$ ]] || die "beaconHash deve ser hex (>=32 bytes)"
FINAL="$WORK/por_final.zkey"
snarkjs zkey beacon "$LAST" "$FINAL" "$BEACON" "$ITER" -n="final beacon" >/dev/null
snarkjs zkey verify "$R1CS" "$PTAU_FILE" "$FINAL" > "$WORK/zkey-verify-final.log" 2>&1 || true
grep -q "ZKey Ok" "$WORK/zkey-verify-final.log" || die "zkey verify falhou (log: $WORK/zkey-verify-final.log)"
echo "✓ snarkjs zkey verify por_final = ZKey Ok"
CH="$(hashes_after "contribution #" "$WORK/zkey-verify-final.log" | head -1)"
echo "final|beacon $BEACON iter=2^$ITER|$(sha "$LAST")|$(sha "$FINAL")|$CH" >> "$TRANSCRIPT_LOG"
snarkjs zkey export verificationkey "$FINAL" "$WORK/verification_key.json" >/dev/null
echo "vk_sha256=$(sha "$WORK/verification_key.json")"
echo "✓ por_final.zkey + verification_key.json. Próximo: 05-convert.sh"
