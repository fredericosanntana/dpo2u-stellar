#!/usr/bin/env python3
import json
import subprocess
import sys
from pathlib import Path


def main() -> int:
    if len(sys.argv) != 2:
        print("usage: prepare_insert_leaf.py <admission-request.json>", file=sys.stderr)
        return 2

    request_path = Path(sys.argv[1]).resolve()
    data = json.loads(request_path.read_text())

    cmd = [
        "cargo", "run",
        "--quiet",
        "--manifest-path", "/root/dpo2u-stellar/integration/spp-adapter/tools/leaf-derive/Cargo.toml",
        "--",
        "--pubkey", data["note_public_key"],
        "--blinding", data["membership_blinding"],
    ]
    leaf_json = subprocess.check_output(cmd, text=True)
    leaf = json.loads(leaf_json)

    prepared_command = (
        f"stellar contract invoke --id {data['membership_contract_id']} "
        f"--source-account <ASP_ADMIN_ACCOUNT> --network {data['target_network']} -- "
        f"insert_leaf --leaf {leaf['membership_leaf_dec']}"
    )

    record = {
        "request_id": data["request_id"],
        "status": "prepared",
        "subject_commitment": data["subject_commitment"],
        "claim_type": data["claim_type"],
        "jurisdiction": data["jurisdiction"],
        "attestation_root": data["attestation_root"],
        "note_public_key": data["note_public_key"],
        "membership_blinding": data["membership_blinding"],
        "membership_leaf_hex": leaf["membership_leaf_hex"],
        "membership_leaf_dec": leaf["membership_leaf_dec"],
        "membership_contract_id": data["membership_contract_id"],
        "target_network": data["target_network"],
        "operator_mode": data["operator_mode"],
        "prepared_command": prepared_command,
        "executed_by": data.get("prepared_by", "unknown"),
    }

    print(json.dumps(record, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
