#!/usr/bin/env bash
# DPO2U cross-chain BN254 (#6) — one-time Foundry install for the EVM half.
# Reversible dev tooling, isolated to contracts-evm/ (NOT in the cargo workspace),
# zero impact on the 1.95.0-pinned Soroban build and its attested WASM hashes.
set -euo pipefail

if command -v forge >/dev/null 2>&1 && command -v anvil >/dev/null 2>&1; then
  echo "[install-foundry] forge + anvil already present: $(forge --version | head -1)"
  exit 0
fi

echo "[install-foundry] installing foundryup..."
curl -L https://foundry.paradigm.xyz | bash
echo "[install-foundry] running foundryup..."
"$HOME/.foundry/bin/foundryup"
echo "[install-foundry] done. Add to PATH: export PATH=\"\$HOME/.foundry/bin:\$PATH\""
