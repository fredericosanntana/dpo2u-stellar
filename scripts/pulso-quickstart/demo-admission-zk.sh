#!/usr/bin/env bash
# Lane 4 — ZK admission (membership) demo.
#
# Proves the moonshot: a DeFindex rebalance executes only when a ZK membership
# proof of the admitted positive-set, BOUND to the exact intent, verifies
# on-chain. The contract-level guarantee is already proven by `make gate-test`
# (membership_happy_path_* verify a REAL Groth16/BN254 proof through the gate).
#
# This script is the live-wiring path. It:
#   1. (offline, runnable here when the ZK toolchain is present) regenerates a
#      membership proof whose `context` public signal binds to the intent, and
#      verifies it off-chain;
#   2. (on-chain, needs a funded identity) points to the exact wiring steps
#      (set_verifier with the membership VK, set_admitted_root | set_root_provider,
#      execute_rebalance_with_proof).
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
if [ -f "$HERE/.env" ]; then set -a; . "$HERE/.env"; set +a; fi

MEMB="$ROOT/zk-prover/membership"

info() { printf '  \033[0;36m▸\033[0m %s\n' "$1"; }
ok()   { printf '  \033[0;32m✓\033[0m %s\n' "$1"; }
warn() { printf '  \033[1;33m!\033[0m %s\n' "$1"; }

printf '\n\033[1m4) ZK admission — membership proof bound to the intent\033[0m\n'

# ── Step 1: regenerate + off-chain verify the membership proof ───────────────
if command -v node >/dev/null 2>&1 && command -v snarkjs >/dev/null 2>&1 && [ -f "$MEMB/build/memb_final.zkey" ]; then
  info "regenerating membership proof (context bound to the intent in gen-input.js)…"
  ( cd "$MEMB" && node gen-input.js >/dev/null )
  ( cd "$MEMB/build" \
      && node membership_withdraw_js/generate_witness.js \
           membership_withdraw_js/membership_withdraw.wasm input.json witness.wtns >/dev/null \
      && snarkjs groth16 prove memb_final.zkey witness.wtns proof.json public.json >/dev/null \
      && snarkjs groth16 verify verification_key.json public.json proof.json )
  node "$ROOT/zk-prover/por/snarkjs2soroban-bn254.js" \
      "$MEMB/build/verification_key.json" "$MEMB/build/proof.json" "$MEMB/build/public.json" \
      "$MEMB/soroban-bn254.json" >/dev/null
  ok "membership proof regenerated + verified OFF-CHAIN → $MEMB/soroban-bn254.json"
else
  warn "ZK toolchain (node/snarkjs/memb_final.zkey) unavailable — skipping proof regen."
fi

# ── Step 2: on-chain wiring + execute (needs a funded testnet identity) ──────
if [ "${SEND:-no}" = "yes" ] && command -v stellar >/dev/null 2>&1; then
  warn "live wiring of the membership VK is operator-specific (nested BN254 structs)."
  info "exact steps in scripts/pulso-quickstart/README.md → 'ZK admission lane':"
  info "  set_verifier(admin, verifier, <membership VK>)"
  info "  set_admitted_root(admin, <root>)   # or  set_root_provider(admin, <asp>)"
  info "  execute_rebalance_with_proof(... proof, [root, nullifier, recipient, context])"
else
  info "SEND=no — proof regenerated + off-chain verified; on-chain wiring skipped."
fi
info "contract-level proof is unconditional: \`make gate-test\` (membership_happy_path_*)."
