# privacy-pool

Symbolic fixed-denomination Soroban privacy-pool prototype.

What is real:

- `deposit(depositor, commitment)` persists unique note commitments.
- The contract maintains a 2-leaf Merkle root compatible with `zk-prover/membership`.
- `withdraw(...)` verifies a real Groth16/BN254 membership proof against the admin-configured VK currently stored on-chain.
- Public signals bind `root`, `nullifierHash`, `recipient`, and `context`.
- A nullifier set prevents the same note from withdrawing twice.
- `pool_balance` and `withdraw_count` change on successful withdraw.

What is not real yet:

- No Soroban token custody or transfers.
- This is still not a production privacy pool; the current circuit proves membership in a 2-leaf Merkle root only.
- No production MPC ceremony; current artifacts are dev/test fixtures.
- Rust tests consume the latest generated `fixtures.json` + `soroban-bn254.json`; run `zk-prover/membership/build.sh` before treating regenerated artifacts as canonical.
- No fee logic, relayer incentives, root history window, or audited verifier.

Regenerate the dev proof artifacts with:

```bash
zk-prover/membership/build.sh
```
