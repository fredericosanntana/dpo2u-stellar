# DeFindex direct factory alternative — 2026-06-20

## Goal
Prove the alternative path before escalating to the DeFindex team: create a new vault directly on Soroban through the DeFindex factory, bypassing the API's `403 Forbidden` vault surface.

## What was verified before the write path
- DeFindex docs explicitly support direct integration through:
  - factory contract calls
  - direct vault contract calls
- Current DeFindex API key authenticates and reaches `/health` and `/factory/address`
- The same key still returns `403 Forbidden` on vault/operator endpoints (`/vault/{address}`, `/vault/{address}/rebalance`, role reads)
- The API creation endpoints also return `403 Forbidden` with the current key

## Readiness on this host
- Stellar identity alias: `dpo2u-deployer`
- Public key: `GDJSDCHTRQYZNKJMUFZ76NAIZ3ZNMBWWAPQ5UHI3JUSOFPSB7NEGQ6UN`
- Testnet balance at check time: `19980.9257600 XLM`

## Direct factory execution performed
Command family used:
- `stellar contract invoke --id CDSCWE4GLNBYYTES2OCYDFQA2LLY4RBIAX6ZI32VSUXD7GO6HRPO4A32 --source dpo2u-deployer --network testnet -- create_defindex_vault_deposit ...`

Parameters used:
- caller / all four roles: `GDJSDCHTRQYZNKJMUFZ76NAIZ3ZNMBWWAPQ5UHI3JUSOFPSB7NEGQ6UN`
- asset: native XLM SAC `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC`
- strategy: XLM blend strategy `CDVLOSPJPQOTB6ZCWO5VSGTOLGMKTXSFWYTUP572GTPNOWX4F76X3HPM`
- router: `CCJUD55AG6W5HAI5LRVNKAE5WDP5XGZBUDS5WNTIVDU7O264UZZE7BRD`
- vault metadata: `DPO2U ProofBound XLM / DPBXLM`
- initial deposit: `1001` stroops
- fee: `100` bps
- upgradable: `true`

## Real result
- Transaction hash: `8fa697c07c323f0b035a27d556177eabeecb3cfb45587b2d52ff117257be597f`
- New vault contract: `CB5YHBXELSXGNWGJURUD5W23C4VVRIN7CX4WMDNZ7FR5TUVNEJPEOF5W`

Observed events from the transaction:
- factory `create`
- native XLM transfer of `1001`
- vault mint to self of `1000` (anti-inflation lock)
- vault mint to caller of `1`
- vault `deposit`

## Post-create on-chain reads
- `get_rebalance_manager` => `GDJSDCHTRQYZNKJMUFZ76NAIZ3ZNMBWWAPQ5UHI3JUSOFPSB7NEGQ6UN`
- `get_manager` => `GDJSDCHTRQYZNKJMUFZ76NAIZ3ZNMBWWAPQ5UHI3JUSOFPSB7NEGQ6UN`
- `fetch_total_managed_funds` => idle `1001`, invested `0`

## Strategic read
This proves the alternative is real and already working on our side:
1. We do **not** need privileged DeFindex API vault permissions to keep moving.
2. We can create a clean DeFindex vault directly through the protocol's factory contract.
3. The next move is to rotate `rebalance_manager` from the temporary `G...` holder to the gate we actually want to prove live.

## Honest caveat
This run created the vault with all roles temporarily bound to the deployer account. That is intentional and aligned with the live finding already recorded earlier: assigning a `C...` contract directly in the role map during constructor time was not the reliable path; creating with `G...` and rotating afterward is the stable path.

## Next logical live move
- Deploy / wire the compliance-proof gate intended for the refreshed lane
- Rotate the new vault's `rebalance_manager` to that gate
- Point the gate to this new vault
- Authorize operator
- Execute the first live policy-bound rebalance
