# Known gaps & honest boundaries — DPO2U × DeFindex (Pulso)

_Last updated: 2026-06-22._

The truthful boundary of the composability slice. Read it before claiming
anything externally.

## What is real and verified

- On-chain **role-as-contract**: the gate (`CDVOKZ…`) is the DeFindex vault's
  (`CB5YHB…`) `rebalance_manager` — confirmed by on-chain readback.
- On-chain **proof-bound execution**: `execute_rebalance_with_proof` verifies a
  real Groth16/BN254 proof via `por-verifier` (`CBM6WJ…`) before forwarding.
- Live testnet rebalance: `Invest(1000)` tx `cf790f4d…` (invested 999 / total 1000).
- SDK over the real `@defindex/sdk@0.3.0`: build green, **107 tests**.

## Known gaps (do not overclaim)

1. **Lane coverage.** Only the `rebalance` lane has the on-chain role-occupation
   proof. `rescue` / `pause` / `distributeFees` exist in the SDK but are not
   gated on-chain the same way. Roadmap.
2. **DeFindex managed API 403.** The managed API returns `403` for vault/operator
   surfaces. We bypass it by calling the factory/vault contracts directly. The
   role-occupation is verified on-chain; the managed API is convenience, not the
   proof. **No formal DeFindex partnership is implied.**
3. **Operator-side, not retail deposits.** The gate governs privileged operator
   actions. DeFindex deposits are user-facing with no on-chain allowlist; we do
   not gate them today.

   _Update:_ the **ZK admission lane** now exists in the gate. `execute_rebalance_with_proof`
   accepts a 4-signal membership proof `[root, nullifierHash, recipient, context]`,
   checks `root` against an **admin-pinned admitted positive-set root**
   (`set_admitted_root`), consumes the `nullifierHash` for anti-replay, and binds
   `context` to `derive_zk_context(evidence_hash)`. A real depth-4 Groth16/BN254
   membership proof verifies on-chain in the gate test suite (23 tests green).
   **Mainnet-gated:** the admitted root is admin-pinned (the live cross-call to an
   association-set provider's `current_root()` is the documented upgrade); the
   trusted setup is a 1-party dev ceremony; Merkle depth is fixed at 4.
4. **Amount precision.** The `@defindex/sdk` `amount` field is a JS `number`. The
   adapter now **refuses** amounts above `2^53-1` instead of silently rounding
   (fail-closed); the SDK's HTTP surface still caps precision at the JS
   safe-integer range. The on-chain gate uses `i128` and is unaffected.
5. **Testnet only.** No mainnet; no governance/multisig over the gate's verifier
   and operator set; no MiCA/CASP/Travel Rule enforcement.
6. **ZK ceremony.** The membership / policy circuits use a 1-party dev coordinator
   ceremony — fine for a demo, gated for mainnet.
