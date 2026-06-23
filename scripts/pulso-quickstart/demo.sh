#!/usr/bin/env bash
# Pulso × DeFindex — one-command proof-bound execution demo.
#
# Proves on Stellar testnet that a DeFindex vault rebalance only executes when a
# DPO2U compliance verdict (or ZK proof) bound to the EXACT intent passes — and
# FAILS CLOSED otherwise. Three lanes:
#   1. readiness — the gate IS the vault's rebalance_manager (role-as-contract)
#   2. positive  — a policy-bound rebalance forwards to the vault   (SEND=yes)
#   3. negative  — a tampered intent is rejected on-chain (fail-closed)
#
# Verified in this build: shell lints clean (`bash -n`). NOT run live here (needs
# a funded testnet identity). Run `make demo` on a machine with the `stellar`
# CLI + a funded identity to reproduce.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"

# Load .env if present (falls back to the proven-live defaults below).
if [ -f "$HERE/.env" ]; then set -a; . "$HERE/.env"; set +a; fi

IDENTITY="${IDENTITY:-dpo2u-deployer}"
NETWORK="${NETWORK:-testnet}"
GATE="${GATE:-CDVOKZMLIAHSESPHH47K76X2OYYOSDFRHXSUHLXV6JRCQRYRE4SWNL3E}"
VAULT="${VAULT:-CB5YHBXELSXGNWGJURUD5W23C4VVRIN7CX4WMDNZ7FR5TUVNEJPEOF5W}"
SEND="${SEND:-no}"

bold() { printf '\n\033[1m%s\033[0m\n' "$1"; }
ok()   { printf '  \033[0;32m✓\033[0m %s\n' "$1"; }
info() { printf '  \033[0;36m▸\033[0m %s\n' "$1"; }
fail() { printf '  \033[0;31m✗\033[0m %s\n' "$1" >&2; exit 1; }

command -v stellar >/dev/null 2>&1 || fail "stellar CLI not found (see https://developers.stellar.org)."

bold "Pulso × DeFindex — proof-bound execution"
echo "  gate=$GATE"
echo "  vault=$VAULT  network=$NETWORK  send=$SEND"

# ── Lane 1: readiness — role-as-contract ────────────────────────────────────
bold "1) Readiness — the gate IS the vault's rebalance_manager"
MANAGER="$(stellar contract invoke --id "$VAULT" --source "$IDENTITY" --network "$NETWORK" --send no -- \
  get_rebalance_manager 2>/dev/null | tr -d '"' || true)"
info "vault.get_rebalance_manager => ${MANAGER:-<none>}"
if [ "$MANAGER" = "$GATE" ]; then
  ok "role-as-contract confirmed: a contract, not an EOA, governs rebalance"
else
  fail "rebalance_manager ($MANAGER) is not the gate ($GATE). Wire it first (rollforward script)."
fi

# ── Lane 2: positive — policy-bound rebalance forwards to the vault ──────────
bold "2) Positive — a compliant rebalance executes"
if [ "$SEND" = "yes" ]; then
  info "delegating to the proven rollforward execute lane (spends testnet funds)…"
  SEND=yes EXECUTE_ACK=policy-vault-rollforward PHASE=execute \
    IDENTITY="$IDENTITY" NETWORK="$NETWORK" GATE="$GATE" NEW_VAULT="$VAULT" \
    bash "$ROOT/scripts/rollforward-defindex-policy-vault-testnet.sh"
  ok "policy-bound rebalance forwarded to the vault"
else
  info "SEND=no — skipping the value-moving submission (set SEND=yes to execute)."
  info "proven live previously: tx cf790f4d96e7087c… (Invest 1000 → invested 999/1000)."
fi

# ── Lane 3: negative — fail-closed on a tampered intent ─────────────────────
bold "3) Negative — a tampered/unattested intent is REJECTED on-chain"
bash "$HERE/negative-rebalance.sh"

# ── Lane 4 (opt-in): ZK admission — membership proof bound to the intent ─────
if [ "${ADMISSION_ZK:-no}" = "yes" ]; then
  bash "$HERE/demo-admission-zk.sh"
else
  info "ZK admission lane skipped (set ADMISSION_ZK=yes to include it)."
fi

bold "Done."
echo "  Admission is a proof that executes — not a dashboard. Remove the proof, the tx reverts."
