# pool-adapter-mock — protocol gating demo (`registry → ASP → pool-adapter`)

This example is **on-chain (Soroban) and Rust-native**, unlike the read-only TypeScript
templates in this folder (`remittance-gate`, `rwa-attest`). It proves the protocol-track
thesis end-to-end: a pool action is released **only** for a `deposit_commitment` that the
association-set provider (ASP) admits, and the ASP only admits what the canonical registry
verifies.

The contract lives at `../../contracts/pool-adapter-mock`. The proof lives in its test
suite, which wires the **three real contracts** together (no stubs):

```
protocol-registry  ── canonical verification + revocation + issuer profile/policy
        ▲ cross-call: verify_attestation_proof(...)
asp-mvp            ── mutable set + active Merkle root
        ▲ cross-call: contains(...) / root consumer
pool-adapter-mock  ── execute_if_member OR execute_with_membership_proof
```

## Run

```bash
# from the repo root — runs the whole gating proof:
cargo test -p pool-adapter-mock

# the full protocol track together:
cargo test -p protocol-registry -p asp-mvp -p pool-adapter-mock
```

Key tests to read:
- `end_to_end_registry_asp_pool_gating_and_proof_path` — full thesis across both gate paths.
- `execute_blocked_without_membership` — no membership ⇒ `NotMember`.
- `execute_with_membership_proof_released_against_current_root` — plain Merkle proof path works.
- `stale_proof_fails_after_revocation_changes_root` — revocation/removal invalidates stale proof.

## The gating contract (what is real)

- `execute_if_member(user, deposit_commitment)` cross-calls `asp.contains(...)`. **No
  membership ⇒ blocked**. **Membership from the ASP ⇒ released.**
- `execute_with_membership_proof(user, deposit_commitment, siblings, index)` verifies a plain
  Merkle path against the ASP's **current** root.
- `can_execute(...)` and `can_execute_with_proof(...)` expose the two read-only gate paths.
- The cross-calls are real — exercised against the actual `asp-mvp`, which itself cross-calls
  the real `protocol-registry`.

## Honest scope — what is mock / NOT implemented

- **This is a MOCK pool.** It moves no value, holds no balances, and provides no privacy or
  anonymity. The release is symbolic and observable.
- **`has_executed` is a mock spend-once guard**, not a real nullifier and not an anonymity
  mechanism.
- **This is not a ZK membership proof.** The proof path is a plain Merkle inclusion proof
  against the ASP root — useful protocol groundwork, not privacy-pool cryptography.
- **Issuer trust is improved but not intended to become staking/slashing governance in this
  track.** The objective is policy-driven protocol gating, not a crypto-economic issuer market.

Full track write-up and the real-vs-mock matrix: `../../docs/asp-protocol-mvp.md`.
