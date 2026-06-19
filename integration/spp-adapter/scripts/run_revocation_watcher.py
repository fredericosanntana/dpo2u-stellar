#!/usr/bin/env python3
import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

BN254_MODULUS = 21888242871839275222246405745257275088548364400416034343698204186575808495617


def run(cmd: list[str]) -> str:
    return subprocess.check_output(cmd, text=True).strip()


def invoke(contract_id: str, source_account: str, network: str, function: str, *args: str) -> str:
    cmd = [
        "stellar", "contract", "invoke",
        "--id", contract_id,
        "--source-account", source_account,
        "--network", network,
        "--", function,
        *args,
    ]
    return run(cmd)


def extract_decision(registry_contract_id: str, issuer: str, subject_commitment_no0x: str, claim_type: str, jurisdiction: str, note_public_key: str, membership_blinding: str, out_path: Path) -> dict:
    cmd = [
        "python3",
        "/root/dpo2u-stellar/integration/spp-adapter/scripts/extract_live_registry_decision.py",
        registry_contract_id,
        issuer,
        subject_commitment_no0x,
        claim_type,
        jurisdiction,
        note_public_key,
        membership_blinding,
    ]
    out = run(cmd)
    out_path.write_text(out + "\n")
    return json.loads(out)


def prepare_blocked(decision_path: Path, non_membership_contract_id: str, source_account: str, out_path: Path) -> dict:
    cmd = [
        "python3",
        "/root/dpo2u-stellar/integration/spp-adapter/scripts/prepare_non_membership_from_registry.py",
        str(decision_path),
        non_membership_contract_id,
        source_account,
    ]
    out = run(cmd)
    out_path.write_text(out + "\n")
    return json.loads(out)


def iso_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace('+00:00', 'Z')


def main() -> int:
    if len(sys.argv) != 10:
        print(
            "usage: run_revocation_watcher.py <registry_contract_id> <issuer_address> <subject_commitment_hex_no0x> <claim_type> <jurisdiction> <note_public_key_0xhex> <membership_blinding> <non_membership_contract_id> <source_account>",
            file=sys.stderr,
        )
        return 2

    registry_contract_id, issuer, subject_commitment, claim_type, jurisdiction, note_public_key, membership_blinding, non_membership_contract_id, source_account = sys.argv[1:10]
    network = "testnet"
    key_dec = int(note_public_key[2:], 16)
    if key_dec >= BN254_MODULUS:
        raise SystemExit("operator.note_public_key is outside BN254 scalar field")

    base_dir = Path("/root/dpo2u-stellar/integration/spp-adapter/examples")
    stem = f"watcher-{subject_commitment[:16]}-{claim_type.lower()}-{jurisdiction.lower()}"
    active_path = base_dir / f"{stem}.active.json"
    revoked_path = base_dir / f"{stem}.revoked.json"
    prepared_path = base_dir / f"{stem}.blocked.prepared.json"
    record_path = base_dir / f"{stem}.watcher.record.json"

    active_decision = extract_decision(
        registry_contract_id,
        issuer,
        subject_commitment,
        claim_type,
        jurisdiction,
        note_public_key,
        membership_blinding,
        active_path,
    )

    att = active_decision["attestation"]
    if att["registry_verified"] or att["attestation_active"]:
        result = {
            "request_id": f"watcher_{subject_commitment[:16]}",
            "status": "no-op-active",
            "reason": "attestation still active/verified; blocked-lane not executed",
            "registry_contract_id": registry_contract_id,
            "subject_commitment": f"0x{subject_commitment}",
            "claim_type": claim_type,
            "jurisdiction": jurisdiction,
            "active_decision": str(active_path),
            "executed_at": iso_now(),
        }
        record_path.write_text(json.dumps(result, indent=2) + "\n")
        print(json.dumps(result, indent=2))
        return 0

    revoked_decision = active_decision
    revoked_path.write_text(json.dumps(revoked_decision, indent=2) + "\n")

    find_before = json.loads(invoke(non_membership_contract_id, source_account, network, "find_key", "--key", str(key_dec)).splitlines()[-1])
    blocked_before = bool(find_before.get("found")) and str(find_before.get("found_value")) == "1"

    prepared = prepare_blocked(revoked_path, non_membership_contract_id, source_account, prepared_path)

    root_before = invoke(non_membership_contract_id, source_account, network, "get_root").splitlines()[-1].strip('"')

    inserted = False
    insert_tx = None
    if not blocked_before:
        insert_output = invoke(non_membership_contract_id, source_account, network, "insert_leaf", "--key", str(key_dec), "--value", "1")
        insert_tx = None
        for line in insert_output.splitlines():
            if "explorer/testnet/tx/" in line:
                insert_tx = line.strip().rsplit('/', 1)[-1]
                break
        inserted = True

    root_after = invoke(non_membership_contract_id, source_account, network, "get_root").splitlines()[-1].strip('"')
    find_after = json.loads(invoke(non_membership_contract_id, source_account, network, "find_key", "--key", str(key_dec)).splitlines()[-1])
    verify_after = invoke(non_membership_contract_id, source_account, network, "verify_non_membership", "--key", str(key_dec), "--siblings", "[]", "--not_found_key", str(key_dec), "--not_found_value", "1").splitlines()[-1] == "true"

    result = {
        "request_id": f"watcher_{subject_commitment[:16]}",
        "status": "confirmed" if (find_after.get("found") and str(find_after.get("found_value")) == "1") else "incomplete",
        "registry": {
            "contract_id": registry_contract_id,
            "subject_commitment": f"0x{subject_commitment}",
            "claim_type": claim_type,
            "jurisdiction": jurisdiction,
            "post_revoke_registry_verified": revoked_decision["attestation"]["registry_verified"],
            "post_revoke_attestation_active": revoked_decision["attestation"]["attestation_active"],
        },
        "operator": {
            "note_public_key_hex": note_public_key,
            "note_public_key_dec": str(key_dec),
            "membership_blinding": membership_blinding,
        },
        "non_membership": {
            "contract_id": non_membership_contract_id,
            "root_before": root_before,
            "root_after": root_after,
            "blocked_before": blocked_before,
            "insert_executed": inserted,
            "insert_tx": insert_tx,
            "find_after": find_after,
            "verify_non_membership_after": verify_after,
        },
        "artifacts": {
            "active_decision": str(active_path),
            "revoked_decision": str(revoked_path),
            "prepared_blocked_lane": str(prepared_path),
        },
        "executed_at": iso_now(),
    }
    record_path.write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps(result, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
