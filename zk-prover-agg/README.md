# zk-prover-agg — SnarkPack aggregation of N jurisdiction proofs (moonshot #5)

Aggregates **N independent Groth16/BN254 jurisdiction-compliance proofs into one**
SnarkPack aggregate proof (TIPP/MIPP, via [`arkworks-rs/ripp`](https://github.com/arkworks-rs/ripp)),
and verifies the aggregate **off-chain**. The aggregated *result* (verdict + commitment +
count) is then sealed on Stellar by the `agg-filing` contract.

This is **true recursive proof aggregation** — N separately generated proofs folded into
one — **not** a batch circuit (which would prove N statements inside a single circuit).

## Run

```bash
cargo run --release --bin aggregate   # proves N, aggregates, verifies, writes ../zk-prover/agg/aggregate.json
cargo test --release                  # aggregate_then_verify / tampered_statement_fails / commitment_is_deterministic
```

## ⚠️ Trust model — read this

- **The SnarkPack aggregate is verified OFF-CHAIN.** It is genuinely verified (see
  `verify_aggregate == true`), but **not on Stellar**: SnarkPack's TIPP/MIPP verifier
  needs **target-group (GT) arithmetic**, and the Soroban `bn254` host exposes only
  `g1_add/g1_mul/g1_msm`, `pairing_check` (a boolean), and `Fr` arithmetic — **no GT
  type, no `miller_loop`/`final_exp`**. On-chain aggregate verification is therefore
  **infeasible today** and is roadmap, gated on Stellar adding GT host functions.
- **What IS on-chain:** the `agg-filing` contract seals the aggregate *result*
  (`off_chain_verified: true`) **and** cross-calls the `por-verifier` to verify ONE
  representative constituent jurisdiction proof **on-chain** (`member_zk_verified: true`).
  So the on-chain seal proves the constituent proofs are real BN254 Groth16 proofs
  (one checked live) and binds the off-chain-verified aggregate's commitment.
- **DEV setup.** Coordinator (1-party) Groth16 setup — not the multi-party MPC ceremony.
  Fixed RNG seed for reproducibility. Never present a DEV vk as production.
- The arkworks-native proofs aggregated here prove the SAME jurisdiction statement
  (`score >= threshold`, bound to `context`) as the snarkjs proofs in `../zk-prover/agg/`
  (BR/EU/SG/UAE), whose individual proofs verify on the Soroban `por-verifier`.
