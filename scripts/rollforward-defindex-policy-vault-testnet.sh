#!/usr/bin/env bash
set -euo pipefail

# Roll forward the existing live DPO2U DeFindex gate to the new direct-factory
# vault, reusing the live verifier and regenerated compliance-policy proof path.
#
# Safe default: simulate only. Set SEND=yes for admin wiring submissions.
# The rebalance execute phase is also guarded by EXECUTE_ACK=policy-vault-rollforward.

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

IDENTITY="${IDENTITY:-dpo2u-deployer}"
NETWORK="${NETWORK:-testnet}"
SEND="${SEND:-no}"
PHASE="${PHASE:-readiness}" # readiness | proof | admin | execute | all

ADMIN="${ADMIN:-$(stellar keys address "$IDENTITY")}"
OPERATOR="${OPERATOR:-$ADMIN}"
GATE="${GATE:-CDVOKZMLIAHSESPHH47K76X2OYYOSDFRHXSUHLXV6JRCQRYRE4SWNL3E}"
NEW_VAULT="${NEW_VAULT:-CB5YHBXELSXGNWGJURUD5W23C4VVRIN7CX4WMDNZ7FR5TUVNEJPEOF5W}"
OLD_VAULT="${OLD_VAULT:-CDULZOS7UILDYPRPHUFJZJGPGK4QTRCVITZIDOIJZMXA7EXJZGSIFEIT}"
VERIFIER="${VERIFIER:-CBM6WJTENB7MT6MZCGA4KOVEDBLOGHKOGFDHBCJRPQ5TINTU6EDMVCAC}"

SCOPE="${SCOPE:-invest}"
NONCE="${NONCE:-2026062001}"
EXPIRES_AT="${EXPIRES_AT:-1800000000}"
STRATEGY="${STRATEGY:-CDVLOSPJPQOTB6ZCWO5VSGTOLGMKTXSFWYTUP572GTPNOWX4F76X3HPM}"
AMOUNT="${AMOUNT:-500000}"
if [ -z "${INSTRUCTIONS+x}" ]; then
  INSTRUCTIONS="[{\"Invest\":{\"0\":\"$STRATEGY\",\"1\":\"$AMOUNT\"}}]"
fi

POR_BUILD_DIR="${POR_BUILD_DIR:-$ROOT/zk-prover/por/build}"
CIRCUIT_NAME="${CIRCUIT_NAME:-compliance_intent_policy}"
ROLLFORWARD_DIR="${ROLLFORWARD_DIR:-$POR_BUILD_DIR/live-rollforward}"
ROLLFORWARD_INPUT="$ROLLFORWARD_DIR/input.json"
ROLLFORWARD_PROOF="$ROLLFORWARD_DIR/proof.json"
ROLLFORWARD_PUBLIC="$ROLLFORWARD_DIR/public.json"
ROLLFORWARD_SOROBAN="$ROLLFORWARD_DIR/soroban.json"
ROLLFORWARD_INSTRUCTIONS="$ROLLFORWARD_DIR/instructions.json"
VK_JSON="${VK_JSON:-$POR_BUILD_DIR/verification_key.json}"
ZKEY="${ZKEY:-$POR_BUILD_DIR/${CIRCUIT_NAME}_final.zkey}"
WASM="${WASM:-$POR_BUILD_DIR/${CIRCUIT_NAME}_js/${CIRCUIT_NAME}.wasm}"
WITNESS_GEN="${WITNESS_GEN:-$POR_BUILD_DIR/${CIRCUIT_NAME}_js/generate_witness.js}"
CONVERTER="${CONVERTER:-$ROOT/zk-prover/por/snarkjs2soroban-bn254.js}"

require_file() {
  if [ ! -f "$1" ]; then
    echo "missing required file: $1" >&2
    exit 1
  fi
}

invoke_gate() {
  stellar contract invoke --id "$GATE" --source "$IDENTITY" --network "$NETWORK" --send "$SEND" -- "$@"
}

invoke_gate_read() {
  stellar contract invoke --id "$GATE" --source "$IDENTITY" --network "$NETWORK" --send no -- "$@"
}

invoke_vault() {
  stellar contract invoke --id "$NEW_VAULT" --source "$IDENTITY" --network "$NETWORK" --send "$SEND" -- "$@"
}

invoke_vault_read() {
  stellar contract invoke --id "$NEW_VAULT" --source "$IDENTITY" --network "$NETWORK" --send no -- "$@"
}

json_string() {
  printf '%s' "$1" | jq -R .
}

strip_json_string() {
  sed -e 's/^"//' -e 's/"$//'
}

dec_to_hex32() {
  node -e 'const v=BigInt(process.argv[1]); console.log(v.toString(16).padStart(64, "0"));' "$1"
}

hex_to_dec() {
  node -e 'const h=process.argv[1].replace(/^0x/, ""); console.log(BigInt("0x"+h).toString(10));' "$1"
}

vk_arg() {
  jq -c '{
    alpha: .VK_ALPHA,
    beta: .VK_BETA,
    gamma: .VK_GAMMA,
    delta: .VK_DELTA,
    ic: .VK_IC
  }' "$ROLLFORWARD_SOROBAN"
}

proof_arg() {
  jq -c '{
    a: .PROOF_A,
    b: .PROOF_B,
    c: .PROOF_C
  }' "$ROLLFORWARD_SOROBAN"
}

public_arg() {
  jq -c '.PUBLIC' "$ROLLFORWARD_SOROBAN"
}

print_config() {
  cat <<EOF
== policy vault rollforward config ==
network=$NETWORK
identity=$IDENTITY
send=$SEND
phase=$PHASE
admin=$ADMIN
operator=$OPERATOR
gate=$GATE
old_vault=$OLD_VAULT
new_vault=$NEW_VAULT
verifier=$VERIFIER
scope=$SCOPE
nonce=$NONCE
expires_at=$EXPIRES_AT
instructions=$INSTRUCTIONS
vk_json=$VK_JSON
zkey=$ZKEY
rollforward_soroban=$ROLLFORWARD_SOROBAN
EOF
}

derive_live_context() {
  mkdir -p "$ROLLFORWARD_DIR"
  printf '%s' "$INSTRUCTIONS" > "$ROLLFORWARD_INSTRUCTIONS"

  EVIDENCE_HASH="$(invoke_gate_read derive_evidence_hash \
    --operator "$OPERATOR" \
    --scope "$SCOPE" \
    --nonce "$NONCE" \
    --expires_at "$EXPIRES_AT" \
    --instructions-file-path "$ROLLFORWARD_INSTRUCTIONS" | strip_json_string)"

  ZK_CONTEXT_HEX="$(invoke_gate_read derive_zk_context \
    --evidence_hash "$EVIDENCE_HASH" | strip_json_string)"
  ZK_CONTEXT_DEC="$(hex_to_dec "$ZK_CONTEXT_HEX")"

  echo "derived_evidence_hash=$EVIDENCE_HASH"
  echo "derived_zk_context_hex=$ZK_CONTEXT_HEX"
  echo "derived_zk_context_dec=$ZK_CONTEXT_DEC"
}

phase_readiness() {
  require_file "$VK_JSON"
  require_file "$ZKEY"
  require_file "$WASM"
  require_file "$WITNESS_GEN"
  require_file "$CONVERTER"
  command -v jq >/dev/null
  command -v node >/dev/null
  command -v snarkjs >/dev/null
  command -v stellar >/dev/null

  print_config
  echo "== live readback =="
  echo "gate_admin=$(invoke_gate_read admin)"
  echo "gate_vault=$(invoke_gate_read vault_contract)"
  echo "gate_verifier=$(invoke_gate_read verifier_contract)"
  echo "gate_operator_allowed=$(invoke_gate_read is_operator --operator "$OPERATOR")"
  echo "new_vault_manager=$(invoke_vault_read get_manager)"
  echo "new_vault_rebalance_manager=$(invoke_vault_read get_rebalance_manager)"

  if [ "$(invoke_gate_read vault_contract | strip_json_string)" = "$OLD_VAULT" ]; then
    echo "readiness_note=gate still points at old vault; admin phase will target only new_vault"
  fi

  derive_live_context
}

phase_proof() {
  require_file "$VK_JSON"
  require_file "$ZKEY"
  require_file "$WASM"
  require_file "$WITNESS_GEN"
  require_file "$CONVERTER"
  derive_live_context

  mkdir -p "$ROLLFORWARD_DIR"
  jq --arg context "$ZK_CONTEXT_DEC" '
    .context = $context
  ' "$POR_BUILD_DIR/input-live-zk.json" > "$ROLLFORWARD_INPUT"

  echo "== generating live-rollforward proof =="
  echo "rollforward_input=$ROLLFORWARD_INPUT"
  node "$WITNESS_GEN" "$WASM" "$ROLLFORWARD_INPUT" "$ROLLFORWARD_DIR/witness.wtns"
  snarkjs groth16 prove "$ZKEY" "$ROLLFORWARD_DIR/witness.wtns" "$ROLLFORWARD_PROOF" "$ROLLFORWARD_PUBLIC"
  snarkjs groth16 verify "$VK_JSON" "$ROLLFORWARD_PUBLIC" "$ROLLFORWARD_PROOF"
  node "$CONVERTER" "$VK_JSON" "$ROLLFORWARD_PROOF" "$ROLLFORWARD_PUBLIC" "$ROLLFORWARD_SOROBAN" >/dev/null

  ARTIFACT_CONTEXT_DEC="$(jq -r '.PUBLIC[2]' "$ROLLFORWARD_SOROBAN")"
  ARTIFACT_CONTEXT_HEX="$(dec_to_hex32 "$ARTIFACT_CONTEXT_DEC")"
  echo "artifact_context_dec=$ARTIFACT_CONTEXT_DEC"
  echo "artifact_context_hex=$ARTIFACT_CONTEXT_HEX"
  test "$ARTIFACT_CONTEXT_HEX" = "$ZK_CONTEXT_HEX"

  echo "== verifier dry-run proof check =="
  stellar contract invoke \
    --id "$VERIFIER" \
    --source "$IDENTITY" \
    --network "$NETWORK" \
    --send no \
    -- verify_proof \
    --vk "$(vk_arg)" \
    --proof "$(proof_arg)" \
    --pub_signals "$(public_arg)"
}

phase_admin() {
  require_file "$ROLLFORWARD_SOROBAN"
  phase_readiness

  CURRENT_GATE_VAULT="$(invoke_gate_read vault_contract | strip_json_string)"
  if [ "$CURRENT_GATE_VAULT" = "$NEW_VAULT" ]; then
    echo "skip_set_vault_contract=already_new_vault"
  else
    echo "== set gate vault contract =="
    invoke_gate set_vault_contract --admin "$ADMIN" --vault_contract "$NEW_VAULT"
  fi

  echo "== set verifier + regenerated compliance VK =="
  invoke_gate set_verifier --admin "$ADMIN" --verifier "$VERIFIER" --vk "$(vk_arg)"

  CURRENT_OPERATOR_ALLOWED="$(invoke_gate_read is_operator --operator "$OPERATOR")"
  if [ "$CURRENT_OPERATOR_ALLOWED" = "true" ]; then
    echo "skip_authorize_operator=already_allowed"
  else
    echo "== authorize operator =="
    invoke_gate authorize_operator --admin "$ADMIN" --operator "$OPERATOR" --allowed true
  fi

  CURRENT_REBALANCE_MANAGER="$(invoke_vault_read get_rebalance_manager | strip_json_string)"
  if [ "$CURRENT_REBALANCE_MANAGER" = "$GATE" ]; then
    echo "skip_set_rebalance_manager=already_gate"
  else
    echo "== rotate new vault rebalance_manager to gate =="
    invoke_vault set_rebalance_manager --new_rebalance_manager "$GATE"
  fi
}

phase_execute() {
  require_file "$ROLLFORWARD_SOROBAN"
  derive_live_context

  ARTIFACT_CONTEXT_HEX="$(dec_to_hex32 "$(jq -r '.PUBLIC[2]' "$ROLLFORWARD_SOROBAN")")"
  if [ "$ARTIFACT_CONTEXT_HEX" != "$ZK_CONTEXT_HEX" ]; then
    echo "proof artifact context does not match derived gate context; run PHASE=proof first" >&2
    exit 1
  fi

  if [ "$SEND" = "yes" ] && [ "${EXECUTE_ACK:-}" != "policy-vault-rollforward" ]; then
    echo "refusing live execute: set EXECUTE_ACK=policy-vault-rollforward to submit" >&2
    exit 1
  fi

  echo "== execute_rebalance_with_proof (${SEND}) =="
  invoke_gate execute_rebalance_with_proof \
    --operator "$OPERATOR" \
    --scope "$SCOPE" \
    --nonce "$NONCE" \
    --expires_at "$EXPIRES_AT" \
    --evidence_hash "$EVIDENCE_HASH" \
    --instructions-file-path "$ROLLFORWARD_INSTRUCTIONS" \
    --proof "$(proof_arg)" \
    --pub_signals "$(public_arg)"
}

case "$PHASE" in
  readiness)
    phase_readiness
    ;;
  proof)
    phase_proof
    ;;
  admin)
    phase_admin
    ;;
  execute)
    phase_execute
    ;;
  all)
    phase_proof
    phase_admin
    echo "execute_phase_skipped=run PHASE=execute explicitly; SEND defaults to no"
    ;;
  *)
    echo "unknown PHASE=$PHASE (expected readiness|proof|admin|execute|all)" >&2
    exit 2
    ;;
esac
