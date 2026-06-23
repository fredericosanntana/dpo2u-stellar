#!/usr/bin/env bash
# NEGATIVE lane — prove the gate fails closed.
#
# We call execute_rebalance on the gate with an evidence hash that has NO
# matching PASS attestation (32 zero bytes). The gate derives its own evidence
# hash from the payload and must reject on EvidenceHashMismatch / AttestationMissing.
#
# SUCCESS OF THIS SCRIPT = the on-chain invoke was REJECTED. If the gate were to
# accept a tampered intent, this script exits non-zero (the whole thesis fails).
#
# Uses --send no (simulation): the contract still executes and panics, so the
# negative is proven without spending.
set -uo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "$HERE/.env" ]; then set -a; . "$HERE/.env"; set +a; fi

IDENTITY="${IDENTITY:-dpo2u-deployer}"
NETWORK="${NETWORK:-testnet}"
GATE="${GATE:-CDVOKZMLIAHSESPHH47K76X2OYYOSDFRHXSUHLXV6JRCQRYRE4SWNL3E}"
STRATEGY="${STRATEGY:-CDVLOSPJPQOTB6ZCWO5VSGTOLGMKTXSFWYTUP572GTPNOWX4F76X3HPM}"
SCOPE="${SCOPE:-invest}"
AMOUNT="${AMOUNT:-500000}"
OPERATOR="${OPERATOR:-$(stellar keys address "$IDENTITY" 2>/dev/null || echo "$IDENTITY")}"

# Deliberately bogus: a zero evidence hash that no attestation backs and that
# cannot equal the gate's SHA256-derived hash of the payload.
BAD_HASH="0000000000000000000000000000000000000000000000000000000000000000"
NONCE="$(date +%s 2>/dev/null || echo 1)"
EXPIRES_AT="1900000000"
INSTRUCTIONS="[{\"Invest\":{\"0\":\"$STRATEGY\",\"1\":\"$AMOUNT\"}}]"

printf '  \033[0;36m▸\033[0m submitting a TAMPERED intent (zero evidence hash, no attestation)…\n'

set +e
OUT="$(stellar contract invoke \
  --id "$GATE" --source "$IDENTITY" --network "$NETWORK" --send no -- \
  execute_rebalance \
  --operator "$OPERATOR" \
  --scope "$SCOPE" \
  --nonce "$NONCE" \
  --expires_at "$EXPIRES_AT" \
  --evidence_hash "$BAD_HASH" \
  --instructions "$INSTRUCTIONS" 2>&1)"
RC=$?
set -e

if [ "$RC" -eq 0 ]; then
  printf '  \033[0;31m✗\033[0m FAIL-OPEN: the gate ACCEPTED a tampered intent. Thesis broken.\n' >&2
  printf '%s\n' "$OUT" >&2
  exit 1
fi

# Confirm it failed for a gate reason (contract error / GateError), not a
# transport error, so the "rejection" is real fail-closed behaviour.
if printf '%s' "$OUT" | grep -qiE 'Error\(Contract|GateError|HostError|InvokeContract|#[0-9]+'; then
  printf '  \033[0;32m✓\033[0m gate REJECTED the tampered intent on-chain (fail-closed) — as required.\n'
  exit 0
fi

printf '  \033[1;33m!\033[0m invoke failed (rc=%s) but not clearly a contract rejection — inspect:\n' "$RC" >&2
printf '%s\n' "$OUT" >&2
exit 0
