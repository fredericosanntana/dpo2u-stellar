#!/usr/bin/env python3
import json
import sys
from pathlib import Path

REQUIRED_TOP = ["request_id", "registry", "issuer", "policy", "attestation", "operator", "target"]
REQUIRED_ATTESTATION_FLAGS = ["registry_verified", "attestation_active", "revoked"]


def fail(msg: str) -> int:
    print(msg, file=sys.stderr)
    return 1


def main() -> int:
    if len(sys.argv) != 2:
        print("usage: build_admission_from_registry.py <registry-decision.json>", file=sys.stderr)
        return 2

    src = Path(sys.argv[1]).resolve()
    data = json.loads(src.read_text())

    for key in REQUIRED_TOP:
        if key not in data:
            return fail(f"missing top-level key: {key}")

    att = data["attestation"]
    pol = data["policy"]
    issuer = data["issuer"]
    op = data["operator"]
    tgt = data["target"]

    for key in REQUIRED_ATTESTATION_FLAGS:
        if key not in att:
            return fail(f"missing attestation flag: {key}")

    if not att["registry_verified"]:
        return fail("registry decision is not verified")
    if not att["attestation_active"]:
        return fail("attestation is not active")
    if att["revoked"]:
        return fail("attestation is revoked")
    if not pol.get("lane_active", False):
        return fail("policy lane is not active")
    if not issuer.get("profile_active", False):
        return fail("issuer profile is not active")

    claim_type = att["claim_type"]
    jurisdiction = att["jurisdiction"]

    if not issuer.get("claim_scope", {}).get(claim_type, False):
        return fail(f"issuer missing claim scope for {claim_type}")
    if not issuer.get("jurisdiction_scope", {}).get(jurisdiction, False):
        return fail(f"issuer missing jurisdiction scope for {jurisdiction}")

    trust_tier = int(issuer.get("trust_tier", 0))
    min_trust = int(pol.get("min_trust_tier", 0))
    stake = int(issuer.get("credited_stake", 0))
    min_stake = int(pol.get("min_stake", 0))

    if trust_tier < min_trust:
        return fail(f"issuer trust tier {trust_tier} below minimum {min_trust}")
    if stake < min_stake:
        return fail(f"issuer stake {stake} below minimum {min_stake}")

    out = {
        "request_id": data["request_id"],
        "subject_commitment": att["subject_commitment"],
        "claim_type": claim_type,
        "jurisdiction": jurisdiction,
        "attestation_root": att["attestation_root"],
        "note_public_key": op["note_public_key"],
        "membership_blinding": str(op["membership_blinding"]),
        "target_network": tgt["network"],
        "membership_contract_id": tgt["asp_membership_contract_id"],
        "non_membership_contract_id": tgt["asp_non_membership_contract_id"],
        "operator_mode": op["mode"],
        "prepared_by": op.get("prepared_by", "unknown"),
        "registry_contract_id": data["registry"]["contract_id"],
        "issuer": issuer["address"],
        "valid_until": int(att.get("valid_until", 0)),
        "policy_min_trust_tier": min_trust,
        "policy_min_stake": min_stake,
        "decision_source": data.get("decision_source", "unknown"),
        "decision_provenance": data.get("decision_provenance", {}),
    }

    print(json.dumps(out, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
