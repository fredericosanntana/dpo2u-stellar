# 2026-06-20 Policy Proof Sprint Report

## Scope completed
Replaced the PoR solvency proof fixture path used by `defindex-rebalance-gate` with a narrower compliance/policy predicate while preserving the gate's 3-signal proof interface and fail-closed behavior:
- public signal layout remains `[policy_pass, policy_commit, context]`
- gate semantics remain `len == 3`, `pub_signals[0] == 1`, `pub_signals[2] == expected_context`
- semantic change lives in the circuit + regenerated fixtures/tests

## Files changed
### Code / scripts
- `zk-prover/por/compliance_intent_policy.circom` (new)
- `zk-prover/por/build.sh`
- `contracts/defindex-rebalance-gate/src/test.rs`

### Generated / regenerated fixtures
- `zk-prover/por/build/input.json`
- `zk-prover/por/build/input-gate-zk.json`
- `zk-prover/por/build/input-live-zk.json`
- `zk-prover/por/build/verification_key.json`
- `zk-prover/por/build/proof.json`
- `zk-prover/por/build/public.json`
- `zk-prover/por/build/soroban-bn254.json`
- `zk-prover/por/build/gate-zk/proof.json`
- `zk-prover/por/build/gate-zk/public.json`
- `zk-prover/por/build/gate-zk/soroban-bn254.json`
- `zk-prover/por/build/live-zk/proof.json`
- `zk-prover/por/build/live-zk/public.json`
- `zk-prover/por/build/live-zk/soroban.json`
- snapshot refreshes under `contracts/defindex-rebalance-gate/test_snapshots/test/` for the proof-path tests

## Circuit summary
`compliance_intent_policy.circom` proves:
- private descriptors: `jurisdiction_code`, `policy_version`, `mandate_class`, `risk_bucket`, `counterparty_class`, `threshold`
- private score: `policy_score`
- public context: `context`
- enforced statement: `policy_score >= threshold`
- public commitment: `Poseidon(jurisdiction_code, policy_version, mandate_class, risk_bucket, counterparty_class, threshold)`

## Exact commands run
### Local circuit build / prove / verify
```bash
cd /root/dpo2u-stellar/zk-prover/por
chmod +x build.sh
./build.sh
mkdir -p build/gate-zk && \
  node build/compliance_intent_policy_js/generate_witness.js \
    build/compliance_intent_policy_js/compliance_intent_policy.wasm \
    build/input-gate-zk.json build/gate-zk/witness.wtns && \
  snarkjs groth16 prove build/compliance_intent_policy_final.zkey \
    build/gate-zk/witness.wtns build/gate-zk/proof.json build/gate-zk/public.json && \
  snarkjs groth16 verify build/verification_key.json \
    build/gate-zk/public.json build/gate-zk/proof.json && \
  node ./snarkjs2soroban-bn254.js \
    build/verification_key.json build/gate-zk/proof.json build/gate-zk/public.json \
    build/gate-zk/soroban-bn254.json
mkdir -p build/live-zk && \
  node build/compliance_intent_policy_js/generate_witness.js \
    build/compliance_intent_policy_js/compliance_intent_policy.wasm \
    build/input-live-zk.json build/live-zk/witness.wtns && \
  snarkjs groth16 prove build/compliance_intent_policy_final.zkey \
    build/live-zk/witness.wtns build/live-zk/proof.json build/live-zk/public.json && \
  snarkjs groth16 verify build/verification_key.json \
    build/live-zk/public.json build/live-zk/proof.json && \
  node ./snarkjs2soroban-bn254.js \
    build/verification_key.json build/live-zk/proof.json build/live-zk/public.json \
    build/live-zk/soroban.json
```

### Contract validations
```bash
cd /root/dpo2u-stellar
cargo test -p defindex-rebalance-gate
stellar contract build --package defindex-rebalance-gate
```

## Validation results
All requested validations passed.

- `./build.sh`: passed
- off-chain `snarkjs groth16 verify` for default sample: passed
- off-chain `snarkjs groth16 verify` for gate-bound sample: passed
- off-chain `snarkjs groth16 verify` for live-zk sample: passed
- `cargo test -p defindex-rebalance-gate`: passed (`15 passed; 0 failed`)
- `stellar contract build --package defindex-rebalance-gate`: passed

## Useful generated values
- gate-bound `policy_commit` (hex for tests):
  - `0ad8765d851bf1d46866debe73a7ceb6b6cbef879d28d36da82c9c0c2c65ef32`
- gate-bound `context` remained aligned with the contract test fixture:
  - `00a07a7e7f20e6f06d9692a8785fe7dc837f6094e817b3bbbe735be0c1db8ba0`
- latest VK sha256:
  - `8c1babb6804ea49621af14bc4423e418c5b5f802d1e43d6f623620ea062fa2cc`

## Limitations / later work
- No live redeploy was performed.
- No verifier/VK rotation was executed on any live/testnet contract.
- Existing contract deprecation warnings for `env.events().publish(...)` remain; they do not block this sprint.
- Old PoR build artifacts may still exist beside the new policy artifacts under `zk-prover/por/build/`; the active regenerated fixtures used here are the compliance-policy ones listed above.
