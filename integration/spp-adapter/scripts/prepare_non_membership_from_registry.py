#!/usr/bin/env python3
import json
import sys
from pathlib import Path

BN254_MODULUS = 21888242871839275222246405745257275088548364400416034343698204186575808495617

def fail(msg: str) -> int:
    print(msg, file=sys.stderr)
    return 1

def main() -> int:
    if len(sys.argv) != 4:
        return fail("usage: prepare_non_membership_from_registry.py <decision.json> <non_membership_contract_id> <source_account>")

    decision_path = Path(sys.argv[1])
    contract_id = sys.argv[2]
    source_account = sys.argv[3]

    data = json.loads(decision_path.read_text())
    att = data.get("attestation", {})
    op = data.get("operator", {})
    target = data.get("target", {})

    note_public_key = op.get("note_public_key")
    if not isinstance(note_public_key, str) or not note_public_key.startswith("0x"):
        return fail("missing operator.note_public_key hex")

    key_dec = int(note_public_key[2:], 16)
    if key_dec >= BN254_MODULUS:
        return fail("operator.note_public_key is outside BN254 scalar field")

    registry_verified = bool(att.get("registry_verified"))
    attestation_active = bool(att.get("attestation_active"))
    revoked = bool(att.get("revoked"))

    if registry_verified or attestation_active:
        return fail("decision is still active/verified; blocked-lane prep only valid after revocation")

    out = {
        "request_id": data.get("request_id", "unknown") + "_blocked_lane",
        "status": "prepared",
        "decision_source": data.get("decision_source"),
        "registry_contract_id": data.get("registry", {}).get("contract_id"),
        "subject_commitment": att.get("subject_commitment"),
        "claim_type": att.get("claim_type"),
        "jurisdiction": att.get("jurisdiction"),
        "attestation_root": att.get("attestation_root"),
        "registry_verified": registry_verified,
        "attestation_active": attestation_active,
        "revoked": revoked,
        "blocked_key_hex": note_public_key,
        "blocked_key_dec": str(key_dec),
        "blocked_value": "1",
        "target_network": target.get("network", "testnet"),
        "asp_non_membership_contract_id": contract_id,
        "source_account": source_account,
        "prepared_command": (
            f"stellar contract invoke --id {contract_id} --source-account {source_account} --network testnet -- "
            f"insert_leaf --key {key_dec} --value 1"
        ),
    }
    print(json.dumps(out, indent=2))
    return 0

if __name__ == '__main__':
    raise SystemExit(main())
