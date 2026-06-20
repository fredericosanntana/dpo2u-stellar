#!/usr/bin/env bash
set -euo pipefail

# Direct DeFindex factory path on Stellar testnet.
# Safe default: simulate only. Set SEND=yes to actually submit.

IDENTITY="${IDENTITY:-dpo2u-deployer}"
NETWORK="${NETWORK:-testnet}"
SEND="${SEND:-no}"
CALLER="${CALLER:-$(stellar keys address "$IDENTITY")}" 
FACTORY="${FACTORY:-CDSCWE4GLNBYYTES2OCYDFQA2LLY4RBIAX6ZI32VSUXD7GO6HRPO4A32}"
ROUTER="${ROUTER:-CCJUD55AG6W5HAI5LRVNKAE5WDP5XGZBUDS5WNTIVDU7O264UZZE7BRD}"
ASSET="${ASSET:-CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC}"
STRATEGY="${STRATEGY:-CDVLOSPJPQOTB6ZCWO5VSGTOLGMKTXSFWYTUP572GTPNOWX4F76X3HPM}"
STRATEGY_NAME="${STRATEGY_NAME:-XLM Blend Strategy}"
VAULT_NAME="${VAULT_NAME:-DPO2U ProofBound XLM}"
VAULT_SYMBOL="${VAULT_SYMBOL:-DPBXLM}"
VAULT_FEE="${VAULT_FEE:-100}"
AMOUNT="${AMOUNT:-1001}"
UPGRADABLE="${UPGRADABLE:-true}"

ROLES=$(cat <<JSON
{"0":"$CALLER","1":"$CALLER","2":"$CALLER","3":"$CALLER"}
JSON
)

ASSETS=$(cat <<JSON
[{"address":"$ASSET","strategies":[{"address":"$STRATEGY","name":"$STRATEGY_NAME","paused":false}]}]
JSON
)

NAME_SYMBOL=$(cat <<JSON
{"name":"$VAULT_NAME","symbol":"$VAULT_SYMBOL"}
JSON
)

echo "identity=$IDENTITY"
echo "caller=$CALLER"
echo "factory=$FACTORY"
echo "network=$NETWORK"
echo "send=$SEND"
echo "asset=$ASSET"
echo "strategy=$STRATEGY"
echo "amount=$AMOUNT"

echo "== invoking direct factory path =="
stellar contract invoke \
  --id "$FACTORY" \
  --source "$IDENTITY" \
  --network "$NETWORK" \
  --send "$SEND" \
  -- create_defindex_vault_deposit \
  --caller "$CALLER" \
  --roles "$ROLES" \
  --vault_fee "$VAULT_FEE" \
  --assets "$ASSETS" \
  --soroswap_router "$ROUTER" \
  --name_symbol "$NAME_SYMBOL" \
  --upgradable "$UPGRADABLE" \
  --amounts "[\"$AMOUNT\"]"
