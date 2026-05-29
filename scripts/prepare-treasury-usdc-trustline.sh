#!/usr/bin/env bash
#
# prepare-treasury-usdc-trustline.sh — monta a transação `changeTrust` (USDC)
# NÃO-ASSINADA para a treasury assinar no Stellar Lab (Freighter), habilitando-a a
# RECEBER USDC (necessário p/ ser o X402_PAY_TO do x402).
#
# USDC = Circle (issuer clássico abaixo). Custa +0,5 XLM de reserve na treasury.
# O operador roda isto; o Chairman assina o XDR em lab.stellar.org com o Freighter.
#
# Uso:
#   ./scripts/prepare-treasury-usdc-trustline.sh <G_treasury> [public|testnet]

set -euo pipefail
TREASURY="${1:?uso: prepare-treasury-usdc-trustline.sh <G_treasury> [public|testnet]}"
NETWORK="${2:-public}"

# USDC da Circle. pubnet (mainnet) vs testnet têm issuers diferentes.
if [[ "$NETWORK" == "testnet" ]]; then
  USDC_ISSUER="GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5" # USDC testnet (Circle)
  RPC="https://soroban-testnet.stellar.org"; PASS="Test SDF Network ; September 2015"
else
  USDC_ISSUER="GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN" # USDC pubnet (Circle)
  RPC="https://soroban-mainnet.stellar.org"; PASS="Public Global Stellar Network ; September 2015"
fi

[[ "$TREASURY" =~ ^G[A-Z2-7]{55}$ ]] || { echo "✗ G-address inválido: $TREASURY" >&2; exit 2; }

stellar network add "$NETWORK" --rpc-url "$RPC" --network-passphrase "$PASS" 2>/dev/null || true

echo "▸ Montando changeTrust (USDC:$USDC_ISSUER) p/ $TREASURY na rede $NETWORK…"
XDR="$(stellar tx new change-trust \
  --source "$TREASURY" --network "$NETWORK" \
  --line "USDC:$USDC_ISSUER" \
  --build-only)"

echo "✓ XDR NÃO-ASSINADO:"
echo "$XDR"
echo ""
echo "── Treasury assina ──────────────────────────────────────────────"
echo "1) Confira o issuer USDC: $USDC_ISSUER (Circle) em stellar.expert."
echo "2) Abra https://lab.stellar.org → Sign Transaction (rede: $NETWORK)."
echo "3) Cole o XDR, confira (changeTrust USDC), assine com o Freighter da treasury, submeta."
echo "4) Garanta ~0,5 XLM livres na treasury (reserve da trustline)."
echo "Depois: setar X402_PAY_TO=$TREASURY no gateway."
