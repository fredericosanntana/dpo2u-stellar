# Defindex role-gate live slice — 2026-06-19

## Goal
Provar um lane real em testnet onde a DPO2U ocupa um papel real de autoridade na DeFindex e só encaminha `rebalance` quando há attestation PASS on-chain.

## Strategic decision
- Papel alvo escolhido: `RebalanceManager`
- Operação mínima escolhida: `rebalance -> Invest`
- Motivo: menor privilégio útil, suficiente para provar `role-as-contract` sem abrir a frente inteira de governança do vault.

## Contracts / addresses
- Attestation contract (testnet): `CC4TJGDRWZOPGBWOOHBJF3N2VKUQRNIW6C6PTYHD7ZI3D42GBQRRZHM5`
- New gate contract (testnet): `CAVLKG3KCRVURO354NDYRF3GQPOS6WC2AMD4QXRCGZQ6I6MZ4HTX4JUD`
- New DeFindex vault (testnet): `CDULZOS7UILDYPRPHUFJZJGPGK4QTRCVITZIDOIJZMXA7EXJZGSIFEIT`
- DeFindex factory (testnet): `CDSCWE4GLNBYYTES2OCYDFQA2LLY4RBIAX6ZI32VSUXD7GO6HRPO4A32`
- XLM blend strategy (testnet): `CDVLOSPJPQOTB6ZCWO5VSGTOLGMKTXSFWYTUP572GTPNOWX4F76X3HPM`
- Native XLM contract (testnet): `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC`
- Router used: `CCJUD55AG6W5HAI5LRVNKAE5WDP5XGZBUDS5WNTIVDU7O264UZZE7BRD`

## New code added in repo
- `contracts/defindex-rebalance-gate/Cargo.toml`
- `contracts/defindex-rebalance-gate/src/lib.rs`
- `contracts/defindex-rebalance-gate/src/test.rs`
- root `Cargo.toml` updated to include the new crate

## Local validation
- `cargo test -p defindex-rebalance-gate` ✅
- `stellar contract build --package defindex-rebalance-gate` ✅

## Important live findings
1. Creating a DeFindex vault with a `C...` contract address directly in the `roles` map for `rebalance_manager` failed inside the real vault constructor.
2. Creating the vault with a `G...` manager/rebalance manager succeeded.
3. Rotating `rebalance_manager` after creation via `set_rebalance_manager` to the gate contract succeeded.
4. Therefore, the viable live path today is:
   - create vault with a regular account as manager/rebalance manager
   - rotate `rebalance_manager` to the gate contract post-create
   - point the gate to the vault
   - authorize operator(s)
   - execute `rebalance` through the gate with on-chain attestation verification

## On-chain actions executed successfully
1. Deployed gate contract
   - tx: `d9e51f4bbef2773f775716886e7f441458775b2b7f768f47b379f8105c638db8` (WASM upload)
   - tx: `b94171cda9bba4175fe8951b4becf23976f96de7058b8caeb736ad6c6f302df5` (deploy)

2. Created a DeFindex vault in testnet
   - tx: `0e6b66a0b6483d1706ded15e48af6124ef4b042a4aa0ab21cac7fc1a51c4e25a`

3. Rotated `rebalance_manager` on the live vault to the gate contract
   - tx: `4a6d9286099648bf0768f3a457f2234b2978d35630649d4a53f9c8811775bdd3`

4. Pointed the gate to the live vault
   - tx: `66ce2a0159c6eb4b0541937d472a30b66877bb1d047eedeab785fa88f886c9bb`

5. Authorized the operator on the gate
   - tx: `51a10672b32106c7959e9d603738dd68f0e63490cdc330a92e053105ca8653bc`

6. Verified existing PASS attestation on-chain for use case `bank_chg`
   - tx: `20f0c7689e77dc7b156c777dadd2b22c78e4af8c2abc5fb9aa6229af924e2c34`
   - evidence hash: `0dbf43ad5862d6e1c3f16958056e531f09bd23eed0fb515d4185bdbf1206bed4`

7. Deposited native XLM into the new DeFindex vault
   - tx: `7eff6e8f6ec94a1fcc2df25658d383c1183913356be7c8fb71d20ffe46aa2843`
   - amount: `10_000_000`

8. Executed a real gate-mediated rebalance (`Invest`) using the PASS attestation
   - tx: `f57564b62a452a0da2800a58af5af5ba4dc25eaca54e48fb01eea061e306d211`
   - invest instruction amount requested: `1_000_000`
   - result observed on vault after execution:
     - idle: `9_000_001`
     - invested: `999_998`

## Failure that taught us something real
- Calling gate `execute_rebalance` with empty instructions failed with DeFindex vault error `#125`.
- Mapped error: `NoInstructions`.
- This confirmed the call path already reached the real vault; the failure was semantic, not architectural.

## What is now proven
- A DPO2U-controlled Soroban contract can occupy a real DeFindex role on testnet (`RebalanceManager`) after vault creation.
- The gate can verify an on-chain PASS attestation before forwarding a live rebalance.
- The forwarded rebalance can execute successfully against a real DeFindex vault/strategy on testnet.

## Bound attestation upgrade (`pulso_df`)
After the initial live slice, we upgraded the lane from generic evidence to payload-bound evidence.

### New artifacts
- payload file: `.hermes/evidence/2026-06-19_pulso_df_rebalance_payload.json`
- metadata file: `.hermes/evidence/2026-06-19_pulso_df_metadata.json`
- payload `evidence_hash`: `2732df580ef3aed68d01c082b5d7d89db92f573e5234f4edc853666a5323f302`
- metadata `metadata_hash`: `c9bf98e977d247f61e8303659e34f28aba9b3e4832a74069e80979161566e56f`

### New live actions
1. Authorized submitter again explicitly for the new lane
   - tx: `e4a1c3f4a2368b8e32ee1c9b915aa7076241ff1c7d762013a315750127894d9e`
2. Configured dedicated attestation use case `pulso_df`
   - tx: `5a28a14ba60d764f317ffa195b8656f87e472365e50e33c5138dd539a983616d`
3. Updated the gate contract to require `pulso_df`
   - tx: `989d5f59279410f6a2d39c323c3f741905d188aa99cb452927537a1285c28c35`
4. Registered PASS attestation bound to the exact rebalance payload hash
   - tx: `78503a529a91a8f3b4ba361ff3dc82ed8d384db6659d7e8ad7bcfa69f23ecb7f`
5. Executed the exact bound rebalance payload live through the gate
   - tx: `38a0f5d34637a08b7f52808951c2d31a62e377881024bd354db7832d4fa9618d`
   - payload: `Invest(strategy=CDVLOSPJPQOTB6ZCWO5VSGTOLGMKTXSFWYTUP572GTPNOWX4F76X3HPM, amount=500000)`

### Live state after bound execution
- gate use case confirmed on-chain: `pulso_df`
- vault idle: `8500002`
- vault invested: `1500017`
- total managed funds: `10000019`

## What is now proven
- A DPO2U-controlled Soroban contract can occupy a real DeFindex role on testnet (`RebalanceManager`) after vault creation.
- The gate can verify an on-chain PASS attestation before forwarding a live rebalance.
- The forwarded rebalance can execute successfully against a real DeFindex vault/strategy on testnet.
- The attestation can now be semantically bound to the exact rebalance payload, not merely to a generic business use case label.

## Honest limits still open
- The constructor path for `C...` role addresses failed at vault creation time; the exact DeFindex-side root cause remains to be explained from their code/runtime behavior.
- The current payload binding is deterministic and auditable, but still off-chain/canonical-JSON based; a stricter future version could hash Soroban XDR or instruction ScVals directly.
- We have not yet added a production-quality operator policy surface (expiry, nonce, replay policy, rotation queues, richer events).
- We have not yet combined this lane with a ZK-backed predicate/verifier; current verdict logic is attestation-driven, not proof-driven.

## Strategic read across the 3 vertentes
### 1. Pulso hackathon
This is now the strongest near-term thesis: `Pulso = compliance-gated capital movement primitive on Stellar`, not a dashboard and not a static attestation registry.

### 2. ZK Stellar hackathon
The right ZK insertion point is no longer abstract. It is the predicate/verdict layer that authorizes the exact payload hash consumed by the gate.

### 3. GTM da solução
The product framing is now much clearer: DPO2U can sell a control primitive that sits in the execution path of institutional on-chain actions, instead of selling only monitoring, paperwork, or policy advisory.

## XDR-bound gate upgrade
We upgraded the role-gate contract so the gate itself now derives the attestation hash from canonical Soroban XDR, rather than trusting an off-chain JSON hash supplied by the caller.

### Contract change
- new public method: `derive_evidence_hash(operator, instructions)`
- implementation: domain-separated tuple encoded with `soroban_sdk::xdr::ToXdr`, then hashed with `env.crypto().sha256(...)`
- payload currently bound into the hash:
  - `"df_gate"` domain tag
  - gate contract address
  - target vault contract
  - `use_case_id`
  - operator address
  - exact `instructions` vector
- enforcement: `execute_rebalance` now recomputes the hash internally and rejects mismatches with `GateError::EvidenceHashMismatch = 4`

### Local validation
- `cargo test -p defindex-rebalance-gate` ✅ (`8 passed`)
- `stellar contract build --package defindex-rebalance-gate` ✅
- wasm hash: `1ec505a94ec0cf58ce7917d95992b0df1fba6e7c8faf4f77d0cfa97fab81d917`

### New live rollout
- new gate contract deployed: `CDYGNJFDJM4UDLZ6LLUMLX3JP3QRB245ONMX3NKMLWTFQRPHEABRYCOD`
- wasm upload tx: `e87c185be1c37b6d89a0eccf12d959a73f70979b837d831407d93cf3afa9fd5c`
- deploy tx: `26cad0df3eb48a956320dae7cbb65dc97ca1240249677630e27e36a0096b382f`
- operator authorization tx: `c426e69103601149c239f8930f9b0d71e3b0d76cfafc88f3b95ba07c47ed286b`
- vault role rotation to new gate tx: `0e1aec96d0dc0a0dcf532602c17270ab4cb10c924ab3419bc4278aa3e4a6c003`

### Derived live hash
For payload:
- `Invest(strategy=CDVLOSPJPQOTB6ZCWO5VSGTOLGMKTXSFWYTUP572GTPNOWX4F76X3HPM, amount=250000)`

The live gate derived:
- `evidence_hash = 0734ac64cfd2c9b167d128a6146e1fd692840483a2e379e2f9514e683d733d25`

### Bound live attestation + execution
- PASS attestation tx: `5b74794ec2a62c1d31b1e8dccec3d2adea7e1fb129273a6d2dfadc7cddc5c74f`
- gate-mediated live rebalance tx: `75ff0ad596b84813d3a94e24c4377f027d144cf343ebc7d75e29ada39cc93ca4`

### Final vault state after XDR-bound execution
- idle: `8250003`
- invested: `1750088`
- total managed funds: `10000091`

## What is now proven
- A DPO2U-controlled Soroban contract can occupy a real DeFindex role on testnet (`RebalanceManager`) after vault creation.
- The gate can verify an on-chain PASS attestation before forwarding a live rebalance.
- The forwarded rebalance can execute successfully against a real DeFindex vault/strategy on testnet.
- The attestation can be semantically bound to the exact rebalance payload.
- The payload hash can now be derived by the gate itself from canonical Soroban XDR, closing the trust gap where a caller could previously supply an off-chain hash format.

## Honest limits still open
- The constructor path for `C...` role addresses failed at vault creation time; the exact DeFindex-side root cause remains to be explained from their code/runtime behavior.
- The current XDR binding is canonical at the Soroban value layer, but not yet the full signed transaction envelope / auth-entry layer.
- We now have a minimal operator policy surface (`scope`, `nonce`, `expiry`, replay consumption), but not yet richer policy controls such as rotation queues, multi-operator segregation, intent cancellation, or structured policy registries.
- We have not yet combined this lane with a ZK-backed predicate/verifier; current verdict logic is attestation-driven, not proof-driven.

## Replay-control gate upgrade (`scope + nonce + expiry`)
We then hardened the XDR-bound gate with a minimal production-relevant policy surface that avoids obvious replay and stale-evidence risk without pushing the lane into unnecessary overengineering.

### Contract change
- `derive_evidence_hash` now binds:
  - `scope`
  - `nonce`
  - `expires_at`
  - plus the prior XDR-bound payload fields (`gate`, `vault`, `use_case`, `operator`, `instructions`)
- `execute_rebalance` now requires those fields explicitly and enforces:
  - `GateError::EvidenceExpired = 5` when `ledger.timestamp() > expires_at`
  - `GateError::EvidenceReplay = 6` when the same `evidence_hash` was already consumed
- consumed evidence is stored on-chain under `ConsumedEvidence(BytesN<32>)`

### Local validation
- `cargo test -p defindex-rebalance-gate` ✅ (`10 passed`)
- `stellar contract build --package defindex-rebalance-gate` ✅
- wasm hash: `8a7a0a2300687c96d8ce1dd396534beea1e0005656bc1942090bbb4ace6d11c3`

### New live rollout
- replay-control gate deployed: `CD4ZUN3SXCUBWXY5JIIZLEPRDISPLF6HI3AWSUCTTC7OJHI5WGRPYLAE`
- wasm upload tx: `f8c8eae9b6b14abf1297e6c9b1171c91d690f03aa262af4824583d75f803f6f1`
- deploy tx: `a7d24dd64a6f757f2a424eea6cde64648a350e0a7a16c0cd5a251aa182d875bf`
- operator authorization tx: `0a913a241e46cc7969687ab0982148f6a70592a56412f82d895b2c55fa0b2d96`
- vault role rotation tx: `bdddd0ba725c0c84a5432e5c754d17667373e50b414cb6b946e7162de78400b5`
- vault manager confirmed on-chain: `CD4ZUN3SXCUBWXY5JIIZLEPRDISPLF6HI3AWSUCTTC7OJHI5WGRPYLAE`

### Derived live intent
- `scope = invest`
- `nonce = 42`
- `expires_at = 1781904800`
- payload: `Invest(strategy=CDVLOSPJPQOTB6ZCWO5VSGTOLGMKTXSFWYTUP572GTPNOWX4F76X3HPM, amount=260000)`
- derived `evidence_hash`: `7716160e45b709c224dedcc236dc7d4adaf513e98400fb9f21e1131161ae20c0`

### Bound live attestation + execution
- PASS attestation tx: `395bb6b5f3a058ddde1397597cf141b1adb4e69ea05449a92a93a54e32e1e1ff`
- gate-mediated live rebalance tx: `642422695b085d04f713a8fe524afdb24902226304c113dd1b1d4d93ea6607a4`
- replay attempt with same evidence rejected in simulation with `Error(Contract, #6)` ✅

### Final vault state after replay-control execution
- idle: `7990004`
- invested: `2010205`
- total managed funds: `10000209`

## What this changes strategically
- **Pulso hackathon:** this is now a credible institutional admission/execution primitive, not just a compliance-themed wrapper.
- **ZK Stellar hackathon:** the clean insertion point is now sharper — a proof system should authorize a scoped, expiring, single-use intent hash, not a vague business event.
- **GTM:** this is enough control surface to be legible to an institution. Going beyond this immediately into full transaction-envelope binding, governance layers, or generalized policy engines would likely be overengineering before partner pull.

## ZK-bound gate upgrade (`proof/verifier` on the same lane)
We then replaced the verdict source for the same rebalance lane: instead of requiring a PASS attestation, the gate can now require a Groth16/BN254 proof whose public `context` is derived by the gate itself from the exact scoped intent hash.

### Contract change
- new admin wiring: `set_verifier(admin, verifier, vk)`
- new public helper: `derive_zk_context(evidence_hash)`
- new execution path: `execute_rebalance_with_proof(...)`
- proof requirements enforced on-chain:
  - verifier contract must be pinned
  - vk must be pinned in the gate (submitter never supplies vk)
  - `pub_signals[0] == 1` (`solvent = true`)
  - `pub_signals[2] == derive_zk_context(evidence_hash)`
  - the same replay/expiry/operator/scope/nonce checks from the XDR-bound lane still apply
- trust upgrade: the proof is now bound to the exact live intent hash, not to a generic business label and not to an off-chain caller-chosen context

### Local validation
- `cargo test -p defindex-rebalance-gate` ✅ (`15 passed`)
- `stellar contract build --package defindex-rebalance-gate` ✅
- wasm hash: `378ceddd0d606aab506b8554197e2979b54fca09ff6dcbab6376a0b109ca4de4`

### New live rollout
- ZK gate deployed: `CDVOKZMLIAHSESPHH47K76X2OYYOSDFRHXSUHLXV6JRCQRYRE4SWNL3E`
- deploy tx: `9252a113c6801a9228a5c530f6d44936f04cb111a102509aad262ac2ba2e44b8`
- pinned verifier tx: `a4f1a08b0a28d20f0c0b77bf3d524a3f669291e1261753671dd6a434b2d09774`
- operator authorization tx: `6752531a9372618833623258ff81bc31c6a7ecb42fdd2b2681ec553077b419f4`
- vault rebalance-manager rotation tx: `facfb9f48065638a0650088b543c8446ee86fe668028cc156879c04d2ff38a0e`
- live rebalance-manager confirmed on vault: `CDVOKZMLIAHSESPHH47K76X2OYYOSDFRHXSUHLXV6JRCQRYRE4SWNL3E`

### Derived live intent
- `scope = zk_invest`
- `nonce = 43`
- `expires_at = 1781908830`
- payload: `Invest(strategy=CDVLOSPJPQOTB6ZCWO5VSGTOLGMKTXSFWYTUP572GTPNOWX4F76X3HPM, amount=270000)`
- derived `evidence_hash`: `051cec350be86e0d2927990eaefca34d74102fca158e3a943c486c06fb09c036`
- derived `zk_context`: `006cbcb2678f51bc4e8769d1eb5cea884b35b80688bf8a019d6a61a3f438f22f`

### Proof artifacts used
- circuit family: PoR solvency (`pub_signals = [solvent, commit, context]`)
- proof regenerated with the live gate-derived context before execution
- off-chain `snarkjs groth16 verify` on the regenerated proof: ✅
- pinned verifier contract on testnet: `CBM6WJTENB7MT6MZCGA4KOVEDBLOGHKOGFDHBCJRPQ5TINTU6EDMVCAC`

### Bound live proof execution
- gate-mediated live ZK rebalance tx: `7ac2ba1a0a8c25fa1fafd1e7166d03899f9f42abdaa9fc880e0a64f4cb87e70e`
- live event emitted by the gate includes:
  - operator = `GDJSDCHTRQYZNKJMUFZ76NAIZ3ZNMBWWAPQ5UHI3JUSOFPSB7NEGQ6UN`
  - evidence hash = `051cec350be86e0d2927990eaefca34d74102fca158e3a943c486c06fb09c036`
  - use case = `pulso_zk`
  - execution mode = `zk`
  - scope = `zk_invest`
  - nonce = `43`
  - expiry = `1781908830`
  - zk context = `006cbcb2678f51bc4e8769d1eb5cea884b35b80688bf8a019d6a61a3f438f22f`
  - solvent signal = `1`

### Final vault state after ZK-bound execution
- idle: `7720004`
- invested: `2280528`
- total managed funds: `10000532`

### What is now proven
- A DPO2U-controlled Soroban contract can occupy a real DeFindex `RebalanceManager` role on testnet.
- The gate can bind a live rebalance intent to a single-use, expiring, replay-protected intent hash.
- The gate can derive a public ZK `context` from that exact intent hash on-chain.
- A Groth16/BN254 proof regenerated for that exact live context can be verified through a pinned verifier/VK and can successfully authorize a real live rebalance.
- The same execution lane now supports both attestation-backed and proof-backed authorization models, with the ZK path living in the exact same operator surface.

### Honest limits still open
- The proof currently attests the PoR solvency predicate (`solvent, commit, context`) using a DEV ceremony / DEV vk; this is still testnet-grade, not production ceremony-grade.
- The witness data behind the live proof remains off-chain and operator-controlled; what is trustless on-chain is the verification of a proof against the pinned vk and exact live context.
- The predicate is still a solvency predicate, not yet a richer compliance policy circuit. So the lane is now `proof-bound execution`, but not yet the final institutional policy thesis.
- We have not yet shown automated proof issuance from a watcher/worker pipeline; the live proof here was regenerated manually for the scoped intent.

## Recommended next step
Do **not** broaden the policy surface yet. The next smart move is to package the same proven lane differently per vertente:
1. **Pulso hackathon:** operator UX + narrative around scoped institutional approval on Stellar.
2. **ZK Stellar hackathon:** evolve the predicate from solvency to a compliance-relevant policy circuit while keeping the exact same intent-bound lane.
3. **GTM:** present this as `compliance-gated execution` and explicitly avoid over-claiming it as a full policy engine or production MPC ZK stack yet.
