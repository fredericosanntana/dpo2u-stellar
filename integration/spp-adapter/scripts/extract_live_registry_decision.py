#!/usr/bin/env python3
import json
import subprocess
import sys


def run(cmd: list[str]) -> str:
    return subprocess.check_output(cmd, text=True).strip()


def main() -> int:
    if len(sys.argv) != 8:
        print(
            "usage: extract_live_registry_decision.py <registry_contract_id> <issuer_address> <subject_commitment_hex_no0x> <claim_type> <jurisdiction> <note_public_key_0xhex> <membership_blinding>",
            file=sys.stderr,
        )
        return 2

    registry_contract_id, issuer, subject_commitment, claim_type, jurisdiction, note_public_key, membership_blinding = sys.argv[1:8]
    network = "testnet"
    source = "dpo2u-deployer"

    def invoke(function: str, *args: str) -> str:
        cmd = [
            "stellar", "contract", "invoke",
            "--id", registry_contract_id,
            "--source-account", source,
            "--network", network,
            "--", function,
            *args,
        ]
        return run(cmd)

    profile = json.loads(invoke("get_issuer_profile", "--issuer", issuer).splitlines()[-1])
    policy = json.loads(invoke("get_claim_policy", "--claim_type", claim_type, "--jurisdiction", jurisdiction).splitlines()[-1])
    attestation = json.loads(invoke(
        "get_attestation",
        "--subject_commitment", subject_commitment,
        "--claim_type", claim_type,
        "--jurisdiction", jurisdiction,
    ).splitlines()[-1])
    registry_verified = invoke(
        "verify_attestation_proof",
        "--subject_commitment", subject_commitment,
        "--claim_type", claim_type,
        "--jurisdiction", jurisdiction,
        "--attestation_root", attestation["attestation_root"],
    ).splitlines()[-1] == "true"
    attestation_active = invoke(
        "is_attestation_active",
        "--subject_commitment", subject_commitment,
        "--claim_type", claim_type,
        "--jurisdiction", jurisdiction,
    ).splitlines()[-1] == "true"
    claim_scope = invoke(
        "issuer_claim_scope",
        "--issuer", issuer,
        "--claim_type", claim_type,
    ).splitlines()[-1] == "true"
    jurisdiction_scope = invoke(
        "issuer_jurisdiction_scope",
        "--issuer", issuer,
        "--jurisdiction", jurisdiction,
    ).splitlines()[-1] == "true"
    stake = int(invoke("issuer_stake", "--issuer", issuer).splitlines()[-1].strip('"'))

    result = {
        "request_id": "live_registry_bridge_001",
        "decision_source": "live-protocol-registry-testnet",
        "registry": {
            "contract_id": registry_contract_id,
            "verify_function": "verify_attestation_proof",
        },
        "issuer": {
            "address": issuer,
            "profile_active": profile["active"],
            "trust_tier": profile["trust_tier"],
            "credited_stake": stake,
            "claim_scope": {claim_type: claim_scope},
            "jurisdiction_scope": {jurisdiction: jurisdiction_scope},
        },
        "policy": {
            "claim_type": claim_type,
            "jurisdiction": jurisdiction,
            "lane_active": policy["active"],
            "min_trust_tier": policy["min_trust_tier"],
            "min_stake": int(policy["min_stake"]),
        },
        "attestation": {
            "subject_commitment": f"0x{subject_commitment}",
            "claim_type": attestation["claim_type"],
            "jurisdiction": attestation["jurisdiction"],
            "attestation_root": f"0x{attestation['attestation_root']}",
            "valid_until": attestation["valid_until"],
            "registry_verified": registry_verified,
            "attestation_active": attestation_active,
            "revoked": False,
            "registered_timestamp": attestation["timestamp"],
        },
        "operator": {
            "note_public_key": note_public_key,
            "membership_blinding": membership_blinding,
            "mode": "prepared",
            "prepared_by": "hermes",
        },
        "target": {
            "network": "testnet",
            "asp_membership_contract_id": "CBULZZIAHWL33XD5OBL2LBPYSFBYCNCOCIJITGJ74OSRRA7IZKIUBTKN",
            "asp_non_membership_contract_id": "CDREZXZILERCSD7VMS4SKVRQY4FNIYJCTYA2AY4TKFRV6Y3L3M2OK3O3",
        },
        "decision_provenance": {
            "extracted_from_live_registry": True,
            "source_account": source,
            "network": network,
        },
    }

    print(json.dumps(result, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
