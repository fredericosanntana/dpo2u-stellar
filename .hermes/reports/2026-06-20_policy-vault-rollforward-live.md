# Policy Vault Rollforward Live — 2026-06-20

## Objective
Move the already-live ZK gate onto the new direct-factory DeFindex vault and prove the first policy-bound rebalance live on testnet with the regenerated compliance-intent proof artifacts.

## Grounded starting point
- Existing live gate: `CDVOKZMLIAHSESPHH47K76X2OYYOSDFRHXSUHLXV6JRCQRYRE4SWNL3E`
- Existing verifier: `CBM6WJTENB7MT6MZCGA4KOVEDBLOGHKOGFDHBCJRPQ5TINTU6EDMVCAC`
- Old vault: `CDULZOS7UILDYPRPHUFJZJGPGK4QTRCVITZIDOIJZMXA7EXJZGSIFEIT`
- New vault: `CB5YHBXELSXGNWGJURUD5W23C4VVRIN7CX4WMDNZ7FR5TUVNEJPEOF5W`
- New vault starting funds: idle `1001`, invested `0`

## Commands executed
```bash
bash -n scripts/rollforward-defindex-policy-vault-testnet.sh
PHASE=all SEND=no scripts/rollforward-defindex-policy-vault-testnet.sh
PHASE=admin SEND=yes scripts/rollforward-defindex-policy-vault-testnet.sh
AMOUNT=1000 PHASE=proof SEND=no scripts/rollforward-defindex-policy-vault-testnet.sh
AMOUNT=1000 PHASE=execute SEND=no EXECUTE_ACK=policy-vault-rollforward scripts/rollforward-defindex-policy-vault-testnet.sh
AMOUNT=1000 PHASE=execute SEND=yes EXECUTE_ACK=policy-vault-rollforward scripts/rollforward-defindex-policy-vault-testnet.sh
stellar contract invoke --id CB5YHBXELSXGNWGJURUD5W23C4VVRIN7CX4WMDNZ7FR5TUVNEJPEOF5W --source dpo2u-deployer --network testnet --send no -- fetch_total_managed_funds
stellar contract invoke --id CDVOKZMLIAHSESPHH47K76X2OYYOSDFRHXSUHLXV6JRCQRYRE4SWNL3E --source dpo2u-deployer --network testnet --send no -- vault_contract
```

## Live admin wiring transactions
- Gate `set_vault_contract` tx: `06dc44ef70f8c795d1ad1cc4681d40eab67f67090edf767481396ab4601b6c7a`
- Gate `set_verifier` tx: `2848b71d283d34a4e2fb55c2d8f017c7c85f8684282380ea4dcf8ea81d7ed29a`
- New vault `set_rebalance_manager` tx: `2573a34bc6e76ac4f318edbf6219ae32615cdafb9c62cbd7505056a5111602bf`

## Live policy-bound rebalance transaction
- Rebalance tx: `cf790f4d96e7087c0c756531d2bea89f45b88a2e1389d579ed5f9ada5832e3d5`
- Intent scope: `invest`
- Nonce: `2026062001`
- Expires at: `1800000000`
- Bound evidence hash: `395ae02e84d72e73a18ded2818a40e30f48248fda85f2c2963ca7e2e7605228e`
- Derived ZK context: `00275e1d3b8e484252657f2f78510cc8d3d809c0ffaf597914f6809f9ba62d17`
- Instruction executed: `Invest(strategy=CDVLOSPJPQOTB6ZCWO5VSGTOLGMKTXSFWYTUP572GTPNOWX4F76X3HPM, amount=1000)`

## Post-execution readback
- Gate `vault_contract` => `CB5YHBXELSXGNWGJURUD5W23C4VVRIN7CX4WMDNZ7FR5TUVNEJPEOF5W`
- New vault `get_rebalance_manager` => `CDVOKZMLIAHSESPHH47K76X2OYYOSDFRHXSUHLXV6JRCQRYRE4SWNL3E`
- New vault funds => idle `1`, invested `999`, total `1000`
- Strategy allocation on new vault => `999` to `CDVLOSPJPQOTB6ZCWO5VSGTOLGMKTXSFWYTUP572GTPNOWX4F76X3HPM`

## Interpretation
This completes the smallest honest live path:
1. New DeFindex vault created directly via factory under our control.
2. Existing live ZK gate reused instead of redeploying another gate.
3. Compliance-intent proof artifacts regenerated against the gate-derived context for the new intent.
4. Gate wired to the new vault and verifier pinned live.
5. First policy-bound rebalance executed live through the gate on testnet.

## Important nuance
The old vault was not rotated during this slice. Repointing the gate means the gate now targets the new vault; any future operations intended for the old vault need either its own gate instance or a deliberate retargeting back.
