#!/usr/bin/env bash
# DPO2U — deploy the Soroban travel-rule-gate to Stellar TESTNET and pin the Midnight preview gate.
#
#   MIDNIGHT_GATE=<TravelRuleGate v10 address on preview, hex> POLICY_HASH=<hex32> \
#   STELLAR_SRC=dpo2u-deployer [RELAYERS="dpo2u-relayer-1 dpo2u-relayer-2"] [THRESHOLD=1] \
#   bash scripts/relayer/deploy-travel-rule-gate-testnet.sh
#
# Then relay a verdict:
#   TRG_ID=<printed id> STELLAR_SRC=dpo2u-relayer-1 MIDNIGHT_REPO=/path/to/dpo2u-midnight \
#   node relayer/midnight-verdict.mjs --transfer <id> --tx <evaluate|release tx>
#
# Trust model: operator trust, not a proof (docs/TRAVEL-RULE-MIDNIGHT-RELAY.md).
set -euo pipefail
export PATH="$HOME/.cargo/bin:$PATH"
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SRC="${STELLAR_SRC:-dpo2u-deployer}"
NET="${NET:-testnet}"
THRESHOLD="${THRESHOLD:-1}"
RELAYERS="${RELAYERS:-$SRC}"
SOURCE_CHAIN="${SOURCE_CHAIN:-midnight:preview}"
: "${MIDNIGHT_GATE:?set MIDNIGHT_GATE to the TravelRuleGate address on Midnight preview (hex)}"
: "${POLICY_HASH:?set POLICY_HASH to the policy_hash the Midnight gate records (hex32)}"
[ "$NET" = "testnet" ] || { echo "this script deploys to testnet only"; exit 1; }

ADMIN="$(stellar keys address "$SRC")"
echo "== build =="
(cd "$REPO" && stellar contract build --package travel-rule-gate)
WASM="$REPO/target/wasm32v1-none/release/travel_rule_gate.wasm"
sha256sum "$WASM"

echo "== deploy (admin $ADMIN, threshold $THRESHOLD) =="
ID="$(stellar contract deploy --wasm "$WASM" --source "$SRC" --network "$NET" -- --admin "$ADMIN" --threshold "$THRESHOLD")"
echo "TRG_ID=$ID"
inv() { stellar contract invoke --id "$ID" --source "$SRC" --network "$NET" --send=yes -- "$@"; }

echo "== pin source $SOURCE_CHAIN / $MIDNIGHT_GATE and policy $POLICY_HASH =="
inv set_source --source_chain "$SOURCE_CHAIN" --source_contract "$MIDNIGHT_GATE" --allowed true
inv set_policy --policy_hash "$POLICY_HASH" --allowed true
RELAYER_ADDRS=""
for r in $RELAYERS; do
  addr="$(stellar keys address "$r")"
  RELAYER_ADDRS="${RELAYER_ADDRS:+$RELAYER_ADDRS }$addr"
  echo "== authorize relayer $r ($addr) =="
  inv set_relayer --relayer "$addr" --allowed true
done

mkdir -p "$REPO/deployments"
jq -n --arg id "$ID" --arg net "$NET" --arg admin "$ADMIN" --arg src "$SOURCE_CHAIN" --arg gate "$MIDNIGHT_GATE" \
  --arg policy "$POLICY_HASH" --argjson threshold "$THRESHOLD" --arg relayers "$RELAYER_ADDRS" --arg aliases "$RELAYERS" --arg wasm "$(sha256sum "$WASM" | cut -d' ' -f1)" \
  '{contract:"travel-rule-gate", id:$id, network:$net, admin:$admin, threshold:$threshold, relayers:($relayers|split(" ")), relayer_aliases:($aliases|split(" ")),
    source:{chain:$src, contract:$gate}, policy_hash:$policy, wasm_sha256:$wasm, trust_model:"operator", deployed_at:(now|todate)}' \
  > "$REPO/deployments/travel-rule-gate-$NET.json"
echo "wrote deployments/travel-rule-gate-$NET.json"
