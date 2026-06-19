# Codex Privacy Pool/Staking Report — 2026-06-18

## Files changed

- `contracts/protocol-registry/src/lib.rs`
  - Added symbolic issuer stake ledger.
  - Added `credit_issuer_stake`, `slash_issuer`, `issuer_stake`, and `set_policy_stake`.
  - Extended `ClaimPolicy` with `min_stake`.
  - `verify_attestation_proof`/`is_attestation_active` now fail if issuer stake falls below policy.
- `contracts/protocol-registry/src/test.rs`
  - Added tests for stake-required registration and slashing breaking canonical verification.
- `contracts/privacy-pool/`
  - New Soroban contract with symbolic deposit state, current root, pinned VK, BN254 proof-gated withdraw, and nullifier set.
  - New tests for deposit state, valid ZK withdraw, tampered public root rejection, and nullifier replay rejection.
- `zk-prover/membership/`
  - Kept the membership proof path real Groth16/BN254.
  - Narrowed the circuit to a singleton membership vertical slice so setup/prove runs reliably in this environment.
  - Generated `fixtures.json`, `soroban-bn254.json`, and `build/*` proof/VK artifacts.
- `docs/asp-protocol-mvp.md`
- `docs/composability-quickstart.md`
- `docs/hack-submission-latam-composability.md`
- `contracts/privacy-pool/README.md`

## Architecture implemented

- Registry staking/slashing is symbolic/admin-controlled, not token escrow.
- Claim policies can require both trust tier and minimum symbolic issuer stake.
- Slashing can make previously registered attestations fail `verify_attestation_proof`.
- `privacy-pool` is symbolic-stateful:
  - unique deposit commitment persisted,
  - `pool_balance` increments/decrements,
  - pinned VK stored by admin,
  - withdraw validates public signals against current root/nullifier/recipient/context,
  - Groth16/BN254 proof verifies on-chain via Soroban BN254 host functions,
  - spent nullifier blocks repeat withdraw.

## Commands and results

```bash
cargo test -p protocol-registry
```

Result: passed, 21 tests.

```bash
cargo test -p privacy-pool
```

Result: passed, 5 tests.

```bash
cargo test -p por-verifier
```

Result: passed, 4 tests.

```bash
cargo test -p protocol-registry -p por-verifier -p privacy-pool
```

Result: passed, 30 tests total across the three packages.

```bash
zk-prover/membership/build.sh
```

Result: passed.

Key output:
- circuit constraints: 1,190
- `snarkjs groth16 verify`: `OK!`
- VK hash: `ae26267cfda264d85246af6c120d811a994d324d1cb9862e2b3512f997b8854a`
- public signal order: `[root, nullifierHash, recipient, context]`

```bash
cargo test --workspace
```

Result: passed. Workspace tests all green. Existing `zk-verifier` BLS12-381 deprecation warnings remain.

## Limitations

- The pool is not value-moving. No Soroban token custody or transfers are implemented.
- The membership circuit is a singleton proof for this vertical slice: it proves knowledge of the note behind the deposited root and exercises the real nullifier/proof flow, but it does not provide anonymity among multiple deposits yet.
- The trusted setup is a dev one-party setup with beacon, not a production MPC ceremony.
- Issuer stake/slash is symbolic admin state, not decentralized crypto-economic governance.
- No root history window, relayer fee, token denomination enforcement, or external audit.
