# DeFindex × DPO2U — Proof-Bound Execution Live Slice

## Executive summary

This document captures the smallest honest live slice proving the DPO2U thesis on Stellar: a privileged financial action only executes when a valid ZK proof, bound to the exact live intent, passes on-chain verification.

It should be read as supporting evidence for the broader DPO2U/Stellar story:
- **Pulso / SPP framing:** DPO2U can sit in the path of admission and privileged action as a compliance primitive.
- **ZK framing:** the proof is not ornamental; it is the authorization mechanism for one exact live action.
- **GTM framing:** this is compliance-gated execution, not compliance as a dashboard.

---

## What was already true before this slice

- The DeFindex API authenticated successfully for health/factory discovery.
- The API still returned `403 Forbidden` for vault/operator surfaces on the tested vault.
- That meant the protocol path had to be proven **without depending on privileged DeFindex API access**.

---

## What this slice proved live

### 1. A new DeFindex vault was created directly via factory
- Factory tx: `8fa697c07c323f0b035a27d556177eabeecb3cfb45587b2d52ff117257be597f`
- New vault: `CB5YHBXELSXGNWGJURUD5W23C4VVRIN7CX4WMDNZ7FR5TUVNEJPEOF5W`

### 2. The already-live ZK gate was reused
- Gate: `CDVOKZMLIAHSESPHH47K76X2OYYOSDFRHXSUHLXV6JRCQRYRE4SWNL3E`
- Verifier: `CBM6WJTENB7MT6MZCGA4KOVEDBLOGHKOGFDHBCJRPQ5TINTU6EDMVCAC`

### 3. The gate was rewired live to the new vault
- `set_vault_contract`: `06dc44ef70f8c795d1ad1cc4681d40eab67f67090edf767481396ab4601b6c7a`
- `set_verifier`: `2848b71d283d34a4e2fb55c2d8f017c7c85f8684282380ea4dcf8ea81d7ed29a`
- `set_rebalance_manager`: `2573a34bc6e76ac4f318edbf6219ae32615cdafb9c62cbd7505056a5111602bf`

### 4. A new compliance-intent proof was regenerated against the gate-derived context
- Evidence hash: `395ae02e84d72e73a18ded2818a40e30f48248fda85f2c2963ca7e2e7605228e`
- Derived context: `00275e1d3b8e484252657f2f78510cc8d3d809c0ffaf597914f6809f9ba62d17`
- Scope: `invest`
- Nonce: `2026062001`

### 5. The first policy-bound rebalance executed live
- Rebalance tx: `cf790f4d96e7087c0c756531d2bea89f45b88a2e1389d579ed5f9ada5832e3d5`
- Instruction: `Invest(strategy=CDVLOSPJPQOTB6ZCWO5VSGTOLGMKTXSFWYTUP572GTPNOWX4F76X3HPM, amount=1000)`

### 6. Post-execution state confirmed the effect on-chain
- Gate `vault_contract` => `CB5YHBXELSXGNWGJURUD5W23C4VVRIN7CX4WMDNZ7FR5TUVNEJPEOF5W`
- Vault `rebalance_manager` => `CDVOKZMLIAHSESPHH47K76X2OYYOSDFRHXSUHLXV6JRCQRYRE4SWNL3E`
- Vault funds => idle `1`, invested `999`, total `1000`

---

## Why this matters

This slice proves a very specific claim:

> **A privileged financial action on Stellar executed only after a ZK proof, tied to the exact live intent, passed through a gate controlling a real DeFindex vault.**

That is the core of the DPO2U proof-bound execution thesis.

It is **not** a claim that:
- DeFindex API vault/operator permissions are fully open to us;
- the final multi-jurisdiction policy engine already exists;
- the whole system is mainnet-ready or governance-complete.

---

## How this supports the Pulso narrative

For Pulso, this slice should be used as **supporting evidence**, not as a replacement for the SPP admission story.

The right reading is:
- DPO2U already proved it can sit in the path of privileged financial action on Stellar.
- The Pulso-specific application is to make DPO2U the admission/compliance primitive for the positive-set / SPP lane.
- Therefore, the SPP landing is not a speculative reinvention; it is a productization of a primitive already validated elsewhere in the same ecosystem.

---

## Honest boundary

- The DeFindex API key proved health/factory access, but not vault/operator permissions.
- This slice intentionally bypassed that API dependency by using the factory/vault contracts directly.
- The old vault was not destroyed or generalized; the live gate was repointed to the new vault for this proof slice.

---

## Canonical repo references

- Reframe thesis: `docs/PROOF-BOUND-EXECUTION-COMPLIANCE-REFRAME.md`
- Internal live report: `.hermes/reports/2026-06-20_policy-vault-rollforward-live.md`
- Replay script: `scripts/rollforward-defindex-policy-vault-testnet.sh`
- Pulso SPP evidence: `docs/S4-LIVE-REGISTRY-TO-SPP-REPORT.md`
- External boundary honesty: `docs/S8-EXTERNAL-ASP-BOUNDARY-REPORT.md`
