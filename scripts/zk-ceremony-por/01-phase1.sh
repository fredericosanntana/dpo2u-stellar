#!/usr/bin/env bash
# Phase 1 — Powers of Tau (universal). NÃO rodamos Phase 1 própria: reusamos a
# cerimônia pública Hermez/Polygon (bn128, 54 contribuições + beacon), verificando o
# blake2b publicado. Se o download falhar e LOCAL_PHASE1=1, roda uma Phase 1 local
# (1 parte + beacon) — SÓ para ensaio; a transcrição registra isso como fraqueza.
. "$(dirname "$0")/common.sh"
if [ "${LOCAL_PHASE1:-0}" = "1" ]; then
  echo "⚠ LOCAL_PHASE1=1 — Phase 1 LOCAL (não serve para produção)"
  cd "$WORK"
  snarkjs powersoftau new bn128 "$PTAU_POW" pot_local_0000.ptau
  snarkjs powersoftau contribute pot_local_0000.ptau pot_local_0001.ptau --name="local-phase1" -e="$(head -c 64 /dev/urandom | base64)"
  snarkjs powersoftau beacon pot_local_0001.ptau pot_local_beacon.ptau "${BEACON:?BEACON (hex) obrigatório}" 10 -n="local phase1 beacon"
  snarkjs powersoftau prepare phase2 pot_local_beacon.ptau "$PTAU_FILE"
  echo "ptau_source=LOCAL (1-party + beacon)" > "$WORK/ptau-info.txt"
else
  if [ ! -f "$PTAU_FILE" ]; then
    curl -sSfL --retry 3 -o "$PTAU_FILE.part" "$PTAU_URL" || die "download falhou ($PTAU_URL). Espelho alternativo: PSE ppot_0080 (ver README) ou LOCAL_PHASE1=1 p/ ensaio"
    mv "$PTAU_FILE.part" "$PTAU_FILE"
  fi
  GOT="$(b2sum "$PTAU_FILE" | awk '{print $1}')"
  [ "$GOT" = "$PTAU_B2" ] || die "blake2b do ptau NÃO confere com o publicado: $GOT"
  echo "✓ blake2b confere com o publicado no README do snarkjs"
  { echo "ptau_source=$PTAU_URL"; echo "ptau_b2sum=$GOT"; echo "ptau_sha256=$(sha "$PTAU_FILE")"; } > "$WORK/ptau-info.txt"
fi
# Passo OPCIONAL — verificação completa da cadeia Phase 1 (`powersoftau verify`: recalcula
# o hash inicial sobre 2^28 potências + as 54 contribuições + beacon). LENTA: ~horas
# (o ensaio de 2026-10-02 interrompeu após 34 min ainda no hash inicial). O padrão é
# conferir o blake2b publicado (acima); ligue com FULL_PTAU_VERIFY=1.
if [ "${FULL_PTAU_VERIFY:-0}" = "1" ]; then
  snarkjs powersoftau verify "$PTAU_FILE" > "$WORK/ptau-verify.log" 2>&1 || { tail -20 "$WORK/ptau-verify.log"; die "powersoftau verify falhou"; }
  grep -q "Powers of Tau Ok" "$WORK/ptau-verify.log" || die "powersoftau verify sem 'Powers of Tau Ok'"
  echo "✓ snarkjs powersoftau verify = Powers of Tau Ok (log: $WORK/ptau-verify.log)"
fi
cat "$WORK/ptau-info.txt"
