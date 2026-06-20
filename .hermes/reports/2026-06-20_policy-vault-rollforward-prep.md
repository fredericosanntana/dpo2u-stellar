# Policy Vault Rollforward Prep — 2026-06-20

## Files added / changed by this prep
- Added `scripts/rollforward-defindex-policy-vault-testnet.sh`
- Generated `zk-prover/por/build/live-rollforward/instructions.json`
- Generated `zk-prover/por/build/live-rollforward/input.json`
- Generated `zk-prover/por/build/live-rollforward/witness.wtns`
- Generated `zk-prover/por/build/live-rollforward/proof.json`
- Generated `zk-prover/por/build/live-rollforward/public.json`
- Generated `zk-prover/por/build/live-rollforward/soroban.json`
- Added this report: `.hermes/reports/2026-06-20_policy-vault-rollforward-prep.md`

Pre-existing dirty/untracked files in the working tree were not reverted or edited for this prep.

## Exact commands run
```bash
sed -n '1,240p' .hermes/plans/2026-06-20-claude-policy-vault-rollforward.txt
pwd && rg --files -g '!*node_modules*' -g '!*.png' -g '!*.jpg' | sed -n '1,160p'
rg --files scripts contracts target .soroban .stellar .hermes 2>/dev/null | sed -n '1,240p'
rg -n "CDVOKZML|CB5YHBX|set.*vault|vault|rebalance_manager|Verifier|verifier|vk|proof|authorize|operator|rebalance" -S . --glob '!node_modules/**' --glob '!target/**'
find . -maxdepth 5 -type f \( -name '*.json' -o -name '*.wasm' -o -name '*.sh' -o -name '*.ts' -o -name '*.js' -o -name '*.rs' \) | sed -n '1,260p'
sed -n '1,260p' contracts/defindex-rebalance-gate/src/lib.rs
sed -n '1,260p' contracts/defindex-rebalance-gate/src/test.rs
sed -n '1,260p' .hermes/reports/2026-06-20_defindex-direct-factory-vault-alternative.md
sed -n '1,260p' .hermes/reports/2026-06-20_policy-proof-sprint-report.md
find scripts -maxdepth 2 -type f -print | sort | sed -n '1,160p' && find .hermes -maxdepth 3 -type f | sort | sed -n '1,220p'
sed -n '160,360p' contracts/defindex-rebalance-gate/src/lib.rs
sed -n '1,260p' scripts/create-defindex-testnet-vault-direct.sh
find zk-prover/por/build -maxdepth 3 -type f | sort | sed -n '1,220p'
sed -n '1,220p' zk-prover/por/snarkjs2soroban-bn254.js
jq . .hermes/reports/2026-06-20_policy-vault-rollforward-claude.json | sed -n '1,260p'
for f in zk-prover/por/build/live-zk/soroban.json zk-prover/por/build/gate-zk/soroban-bn254.json .hermes/evidence/2026-06-19_pulso_df_rebalance_payload.json .hermes/evidence/2026-06-19_pulso_df_metadata.json; do printf '%s\n' "$f"; jq . "$f" | sed -n '1,220p'; done
stellar --version && stellar contract invoke --help | sed -n '1,220p'
stellar contract inspect --help | sed -n '1,220p'
stellar contract invoke --id CDVOKZMLIAHSESPHH47K76X2OYYOSDFRHXSUHLXV6JRCQRYRE4SWNL3E --source dpo2u-deployer --network testnet -- --help
stellar contract invoke --id CB5YHBXELSXGNWGJURUD5W23C4VVRIN7CX4WMDNZ7FR5TUVNEJPEOF5W --source dpo2u-deployer --network testnet -- --help
stellar contract invoke --id CBM6WJTENB7MT6MZCGA4KOVEDBLOGHKOGFDHBCJRPQ5TINTU6EDMVCAC --source dpo2u-deployer --network testnet -- --help
stellar contract invoke --id CDVOKZMLIAHSESPHH47K76X2OYYOSDFRHXSUHLXV6JRCQRYRE4SWNL3E --source dpo2u-deployer --network testnet -- set_verifier --help
stellar contract invoke --id CDVOKZMLIAHSESPHH47K76X2OYYOSDFRHXSUHLXV6JRCQRYRE4SWNL3E --source dpo2u-deployer --network testnet -- authorize_operator --help
stellar contract invoke --id CDVOKZMLIAHSESPHH47K76X2OYYOSDFRHXSUHLXV6JRCQRYRE4SWNL3E --source dpo2u-deployer --network testnet -- derive_evidence_hash --help
stellar contract invoke --id CDVOKZMLIAHSESPHH47K76X2OYYOSDFRHXSUHLXV6JRCQRYRE4SWNL3E --source dpo2u-deployer --network testnet -- execute_rebalance_with_proof --help
stellar contract invoke --id CB5YHBXELSXGNWGJURUD5W23C4VVRIN7CX4WMDNZ7FR5TUVNEJPEOF5W --source dpo2u-deployer --network testnet -- set_rebalance_manager --help
jq . zk-prover/por/build/input-live-zk.json zk-prover/por/build/input-gate-zk.json | sed -n '1,220p'
stellar contract invoke --id CDVOKZMLIAHSESPHH47K76X2OYYOSDFRHXSUHLXV6JRCQRYRE4SWNL3E --source dpo2u-deployer --network testnet --send no -- vault_contract && stellar contract invoke --id CDVOKZMLIAHSESPHH47K76X2OYYOSDFRHXSUHLXV6JRCQRYRE4SWNL3E --source dpo2u-deployer --network testnet --send no -- verifier_contract && stellar contract invoke --id CDVOKZMLIAHSESPHH47K76X2OYYOSDFRHXSUHLXV6JRCQRYRE4SWNL3E --source dpo2u-deployer --network testnet --send no -- is_operator --operator GDJSDCHTRQYZNKJMUFZ76NAIZ3ZNMBWWAPQ5UHI3JUSOFPSB7NEGQ6UN
stellar contract invoke --id CB5YHBXELSXGNWGJURUD5W23C4VVRIN7CX4WMDNZ7FR5TUVNEJPEOF5W --source dpo2u-deployer --network testnet --send no -- get_rebalance_manager && stellar contract invoke --id CB5YHBXELSXGNWGJURUD5W23C4VVRIN7CX4WMDNZ7FR5TUVNEJPEOF5W --source dpo2u-deployer --network testnet --send no -- get_manager
rg -n "nonce|expires_at|derive_evidence_hash|00a07a|192121|283540|500000|execute_rebalance" .hermes docs scripts zk-prover contracts/defindex-rebalance-gate -S
jq -r '.PUBLIC[2]' zk-prover/por/build/live-zk/soroban.json | node -e 'let s=""; process.stdin.on("data",d=>s+=d).on("end",()=>console.log(BigInt(s.trim()).toString(16).padStart(64,"0")))'
sed -n '1,180p' zk-prover/por/build.sh
bash -n scripts/rollforward-defindex-policy-vault-testnet.sh
chmod +x scripts/rollforward-defindex-policy-vault-testnet.sh && ls -l scripts/rollforward-defindex-policy-vault-testnet.sh
PHASE=all SEND=no scripts/rollforward-defindex-policy-vault-testnet.sh
tmp=$(mktemp); printf '[{"Invest":["CDVLOSPJPQOTB6ZCWO5VSGTOLGMKTXSFWYTUP572GTPNOWX4F76X3HPM",500000]}]' > $tmp; stellar contract invoke --id CDVOKZMLIAHSESPHH47K76X2OYYOSDFRHXSUHLXV6JRCQRYRE4SWNL3E --source dpo2u-deployer --network testnet --send no -- derive_evidence_hash --operator GDJSDCHTRQYZNKJMUFZ76NAIZ3ZNMBWWAPQ5UHI3JUSOFPSB7NEGQ6UN --scope invest --nonce 2026062001 --expires_at 1800000000 --instructions-file-path $tmp; rm $tmp
tmp=$(mktemp); printf '[{"tag":"Invest","values":["CDVLOSPJPQOTB6ZCWO5VSGTOLGMKTXSFWYTUP572GTPNOWX4F76X3HPM","500000"]}]' > $tmp; stellar contract invoke --id CDVOKZMLIAHSESPHH47K76X2OYYOSDFRHXSUHLXV6JRCQRYRE4SWNL3E --source dpo2u-deployer --network testnet --send no -- derive_evidence_hash --operator GDJSDCHTRQYZNKJMUFZ76NAIZ3ZNMBWWAPQ5UHI3JUSOFPSB7NEGQ6UN --scope invest --nonce 2026062001 --expires_at 1800000000 --instructions-file-path $tmp; rm $tmp
tmp=$(mktemp); printf '[{"Invest":{"0":"CDVLOSPJPQOTB6ZCWO5VSGTOLGMKTXSFWYTUP572GTPNOWX4F76X3HPM","1":"500000"}}]' > $tmp; stellar contract invoke --id CDVOKZMLIAHSESPHH47K76X2OYYOSDFRHXSUHLXV6JRCQRYRE4SWNL3E --source dpo2u-deployer --network testnet --send no -- derive_evidence_hash --operator GDJSDCHTRQYZNKJMUFZ76NAIZ3ZNMBWWAPQ5UHI3JUSOFPSB7NEGQ6UN --scope invest --nonce 2026062001 --expires_at 1800000000 --instructions-file-path $tmp; rm $tmp
tmp=$(mktemp); printf '[{"Invest":{"0":"CDVLOSPJPQOTB6ZCWO5VSGTOLGMKTXSFWYTUP572GTPNOWX4F76X3HPM","1":"500000"}}]' > $tmp; wc -c $tmp; od -An -t x1 $tmp | tail -1; stellar contract invoke --id CDVOKZMLIAHSESPHH47K76X2OYYOSDFRHXSUHLXV6JRCQRYRE4SWNL3E --source dpo2u-deployer --network testnet --send no -- derive_evidence_hash --operator GDJSDCHTRQYZNKJMUFZ76NAIZ3ZNMBWWAPQ5UHI3JUSOFPSB7NEGQ6UN --scope invest --nonce 2026062001 --expires_at 1800000000 --instructions-file-path $tmp; echo exit=$?; rm $tmp
wc -c zk-prover/por/build/live-rollforward/instructions.json 2>/dev/null || true; od -An -t x1 zk-prover/por/build/live-rollforward/instructions.json 2>/dev/null | tail -1 || true; stellar contract invoke --id CDVOKZMLIAHSESPHH47K76X2OYYOSDFRHXSUHLXV6JRCQRYRE4SWNL3E --source dpo2u-deployer --network testnet --send no -- derive_evidence_hash --operator GDJSDCHTRQYZNKJMUFZ76NAIZ3ZNMBWWAPQ5UHI3JUSOFPSB7NEGQ6UN --scope invest --nonce 2026062001 --expires_at 1800000000 --instructions-file-path zk-prover/por/build/live-rollforward/instructions.json; echo exit=$?
rg -n '^INSTRUCTIONS=' scripts/rollforward-defindex-policy-vault-testnet.sh && bash -n scripts/rollforward-defindex-policy-vault-testnet.sh
PHASE=all SEND=no scripts/rollforward-defindex-policy-vault-testnet.sh
git status --short
find zk-prover/por/build/live-rollforward -maxdepth 1 -type f -printf '%p\n' | sort && jq . zk-prover/por/build/live-rollforward/soroban.json | sed -n '1,120p'
git diff -- scripts/rollforward-defindex-policy-vault-testnet.sh | sed -n '1,260p'
```

## Dry-run validation
Validated in dry-run mode with:
```bash
bash -n scripts/rollforward-defindex-policy-vault-testnet.sh
PHASE=all SEND=no scripts/rollforward-defindex-policy-vault-testnet.sh
```

The final dry run:
- derived evidence hash `e793a60ac7b5883119c17bb9084994c61b63d05eaa4210a6ea78dd67b62a4fc1`
- derived ZK context `005029068640746045bd20edce7bdacea35f1b68efb6fbad8f22fe54c185bd31`
- generated context-matched proof artifacts under `zk-prover/por/build/live-rollforward/`
- verified the generated proof against live verifier `CBM6WJTENB7MT6MZCGA4KOVEDBLOGHKOGFDHBCJRPQ5TINTU6EDMVCAC` with `--send no`, returning `true`
- simulated `set_vault_contract`, `set_verifier`, and `set_rebalance_manager` with `SEND=no`
- skipped `authorize_operator` because the operator was already authorized
- skipped the rebalance execute phase

## Remaining blocker for final live execute
No final live execute was performed.

Before the final live rebalance execute, the operator must intentionally submit the admin wiring with `SEND=yes` and confirm on-chain readbacks:
- gate `vault_contract == CB5YHBXELSXGNWGJURUD5W23C4VVRIN7CX4WMDNZ7FR5TUVNEJPEOF5W`
- gate `verifier_contract == CBM6WJTENB7MT6MZCGA4KOVEDBLOGHKOGFDHBCJRPQ5TINTU6EDMVCAC`
- new vault `get_rebalance_manager == CDVOKZMLIAHSESPHH47K76X2OYYOSDFRHXSUHLXV6JRCQRYRE4SWNL3E`

The script keeps live rebalance execution separate: `PHASE=execute SEND=yes` also requires `EXECUTE_ACK=policy-vault-rollforward`.
