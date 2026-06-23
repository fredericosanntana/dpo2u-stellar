# Pulso × DeFindex — Live Testnet Run (2026-06-23)

Live, on-chain evidence that the DPO2U compliance gate sits in the path of a
DeFindex vault rebalance: the privileged action executes **only** when a ZK
proof bound to the exact intent verifies on-chain, and **fails closed** otherwise.

## Environment

| | |
|---|---|
| Network | Stellar **testnet** |
| Signer | `dpo2u-deployer` = `GDJSDCHTRQYZNKJMUFZ76NAIZ3ZNMBWWAPQ5UHI3JUSOFPSB7NEGQ6UN` (gate admin + authorized operator) |
| Gate | `CDVOKZMLIAHSESPHH47K76X2OYYOSDFRHXSUHLXV6JRCQRYRE4SWNL3E` |
| Vault | `CB5YHBXELSXGNWGJURUD5W23C4VVRIN7CX4WMDNZ7FR5TUVNEJPEOF5W` |
| ZK verifier | `CBM6WJTENB7MT6MZCGA4KOVEDBLOGHKOGFDHBCJRPQ5TINTU6EDMVCAC` |
| Strategy | `CDVLOSPJPQOTB6ZCWO5VSGTOLGMKTXSFWYTUP572GTPNOWX4F76X3HPM` (Blend) |

## Lane 1 — Readiness (role-as-contract)

`vault.get_rebalance_manager()` → `CDVOKZ…` (the gate). A **contract**, not an EOA,
governs rebalance. `gate.is_operator(deployer)` → `true`; `gate.verifier_contract()`
→ `CBM6WJ…`.

## Lane 2 — Negative (fail-closed) ✅ LIVE

A tampered intent (zero evidence hash, no attestation) submitted to
`execute_rebalance`:

```
→ Error(Contract, #4)   // GateError::EvidenceHashMismatch
```

The gate rejected the tampered intent on-chain. **Remove the binding, the action
reverts.**

## Lane 3 — Positive (proof-bound execution) ✅ LIVE

A ZK proof was generated bound to the live intent's `derive_zk_context`, the
verifier dry-run returned `true`, and the rebalance was submitted:

- **Tx:** `1a2f08b1f6f0acc6f9286f4fc4fd2c40d89d9b44fdf804c42974683a23eef6f5`
  ([stellar.expert](https://stellar.expert/explorer/testnet/tx/1a2f08b1f6f0acc6f9286f4fc4fd2c40d89d9b44fdf804c42974683a23eef6f5))
- **Instruction:** `Unwind(strategy, 1000)`
- **evidence_hash:** `f10be12383918f2907fbf28ca1c66580d3a16d89887b5b574b60812cea405995`
- **zk_context:** `003954b18604c843fd39b1778a2f8925f7083eeeb73f762e293a18734e881db2`
- **Gate event:** `auth_mode = zk`, `use_case = pulso_zk`, `nonce = 2026062302`
- **On-chain call chain:** `gate.execute_rebalance_with_proof` → `verifier.verify_proof` ⇒ **true** → `vault.rebalance(unwind)` → `BlendStrategy.withdraw`
- **Vault state:** idle `1` / invested `1008` / total `1009` → idle `1002` / invested `7` / total `1009`

### Honest note — the Invest(1) attempt

A first attempt used `Invest(strategy, 1)`. The compliance gate **passed** on-chain
(`verify_proof` ⇒ `true`, and the gate forwarded the call to the vault), but the
downstream Blend strategy rejected the 1-stroop deposit with `Error(Contract, #416)`
— a DeFi pool-minimum detail, **not** a gate/compliance failure (idle balance was
only 1). Switching to `Unwind(1000)` produced the clean success above. This is
recorded for transparency: the gate behaved correctly in both attempts.

## What this proves

> A privileged DeFindex vault action on Stellar executed **only after** a ZK proof,
> tied to the exact live intent, verified on-chain through a gate that occupies the
> vault's `rebalance_manager` role — and the same gate **rejects** a tampered intent.

## Reproduce

```bash
# readiness + negative (no spend)
make demo-negative
# proof-bound positive (spends testnet funds; needs a funded identity)
NONCE=<fresh> SCOPE=unwind \
  INSTRUCTIONS='[{"Unwind":{"0":"CDVLOSPJPQOTB6ZCWO5VSGTOLGMKTXSFWYTUP572GTPNOWX4F76X3HPM","1":"1000"}}]' \
  PHASE=proof bash scripts/rollforward-defindex-policy-vault-testnet.sh
NONCE=<same> SCOPE=unwind INSTRUCTIONS='...' \
  PHASE=execute SEND=yes EXECUTE_ACK=policy-vault-rollforward \
  bash scripts/rollforward-defindex-policy-vault-testnet.sh
```

The contract-level ZK **admission** lane (membership proof) is covered by
`make gate-test` (26 tests, incl. a real Groth16/BN254 proof verified on-chain).
