# ASP / Protocol Track — Sprint 3 baseline

> **Status — 2026-06-18.** The protocol track is now past pure PRD validation and into a
> **concrete protocol proof**. The original registry/ASP/mock-adapter lane is implemented and
> a new prototype-real `privacy-pool` lane adds symbolic deposits, BN254 ZK membership withdraws,
> and a nullifier set.
>
> Sprint 3 is materially reflected in code:
> 1. **revogação canônica no registry**,
> 2. **trust model de issuer com profile/policy/stake simbólico**,
> 3. **groundwork de membership proof com Merkle root real**,
> 4. **privacy-pool simbólica com saque ZK e nullifier real**.

## Track shape

| Contract | Role | Status |
|---|---|---|
| `contracts/protocol-registry` | canonical multi-issuer attestation registry | **Implemented** |
| `contracts/asp-mvp` | mutable association set gated by the registry | **Implemented** |
| `contracts/pool-adapter-mock` | mock pool gate consuming ASP membership or Merkle proof | **Implemented** |
| `contracts/privacy-pool` | symbolic fixed-denomination pool with BN254 membership-proof withdraws | **Prototype implemented** |

Execution dependency remains fixed:

`protocol-registry → asp-mvp → pool-adapter-mock`

---

## 1. `protocol-registry` — canonical registry with revocation + issuer profile + stake

A neutral registry where downstream contracts ask one canonical question:

`verify_attestation_proof(subject_commitment, claim_type, jurisdiction, attestation_root) -> bool`

### Surface

- `__constructor(admin)`
- `authorize_issuer(admin, issuer, allowed)`
- `configure_issuer_profile(admin, issuer, active, trust_tier, valid_until)`
- `set_issuer_claim_scope(admin, issuer, claim_type, allowed)`
- `set_issuer_jurisdiction_scope(admin, issuer, jurisdiction, allowed)`
- `set_claim_policy(admin, claim_type, jurisdiction, active)`
- `set_claim_policy_requirements(admin, claim_type, jurisdiction, active, min_trust_tier)`
- `set_policy_stake(admin, claim_type, jurisdiction, active, min_trust_tier, min_stake)`
- `credit_issuer_stake(admin, issuer, amount) -> i128`
- `slash_issuer(admin, issuer, amount) -> i128`
- `issuer_stake(issuer) -> i128`
- `register_attestation(issuer, subject_commitment, claim_type, jurisdiction, valid_until, attestation_root) -> seq`
- `revoke_attestation(caller, subject_commitment, claim_type, jurisdiction)`
- `get_attestation(...) -> Option<AttestationRecord>`
- `get_issuer_profile(issuer) -> Option<IssuerProfile>`
- `get_claim_policy(claim_type, jurisdiction) -> ClaimPolicy`
- `is_attestation_active(subject_commitment, claim_type, jurisdiction) -> bool`
- `verify_attestation_proof(subject_commitment, claim_type, jurisdiction, attestation_root) -> bool`

### Canonical predicate semantics

`verify_attestation_proof(...)` returns `true` iff:

1. the attestation slot exists,
2. the `(claim_type, jurisdiction)` policy is active,
3. the attestation has **not** been revoked,
4. the attestation has not expired,
5. the stored `attestation_root` matches exactly,
6. the issuer still fits the active trust model:
   - legacy coarse authorization gate is on,
   - issuer profile is active / not expired,
   - issuer claim scope allows that claim,
   - issuer jurisdiction scope allows that jurisdiction,
   - issuer `trust_tier >= policy.min_trust_tier`,
   - issuer symbolic stake is at least `policy.min_stake`.

### Honest scope

This is already beyond a binary `allowed: bool`, and slashing can now make existing attestations
fail verification if the issuer drops below policy stake. The stake ledger is still
**symbolic/admin-credited**: no token escrow, no decentralized validator set, no quorum politics,
and no autonomous dispute process.

---

## 2. `asp-mvp` — mutable set with authenticated active root

The ASP admits a `deposit_commitment` **only** when the registry cross-call verifies the backing
claim. Admission is still fail-closed.

### Surface

- `__constructor(admin, registry)`
- `add_to_set(submitter, deposit_commitment, subject_commitment, claim_type, jurisdiction, attestation_root) -> u32`
- `remove_from_set(admin, deposit_commitment) -> u32`
- `contains(deposit_commitment) -> bool`
- `current_root() -> BytesN<32>`
- `leaf_count() -> u32`
- `get_member(deposit_commitment) -> Option<MemberRecord>`

### What changed in Sprint 2

#### Before
- append-only hash-chain root,
- admit-only set,
- no revocation propagation.

#### Now
- the set is **mutable**,
- `remove_from_set(...)` only succeeds when the backing registry claim **no longer verifies**,
- `current_root()` is a **real Merkle root** over the **active** members,
- `leaf_count()` now means **active leaf count**.

### Root semantics

`current_root()` is now a deterministic Merkle root over active commitments in insertion order.
That means:

- the root changes on admission,
- the root also changes on removal,
- a stale proof becomes invalid after revocation/removal changes the active set.

This is the correct groundwork for future membership-proof plumbing.

### Honest scope

This is **not** yet a privacy pool and **not** yet a ZK proof system.
The ASP now exposes an authenticated root suitable for proof plumbing, but there is still no
zero-knowledge membership proof or anonymity set claim.

---

## 3. `pool-adapter-mock` — gate by membership OR plain Merkle proof

A mock pool adapter that proves the final composability lane.

### Surface

- `__constructor(admin, asp)`
- `execute_if_member(user, deposit_commitment) -> u32`
- `execute_with_membership_proof(user, deposit_commitment, siblings, index) -> u32`
- `can_execute(deposit_commitment) -> bool`
- `can_execute_with_proof(deposit_commitment, siblings, index) -> bool`
- `verify_membership_proof(deposit_commitment, siblings, index, expected_root) -> bool`
- `has_executed(deposit_commitment) -> bool`
- `exec_count() -> u32`

### Two real gate paths

#### A. Membership oracle path
`execute_if_member(...)`
- cross-calls `asp.contains(...)`
- no membership ⇒ blocked
- membership ⇒ released

#### B. Authenticated-root proof path
`execute_with_membership_proof(...)`
- fetches the ASP `current_root()`
- verifies a plain Merkle sibling path on-chain
- only releases if the proof reconstructs the current root

This is **not** a ZK proof, but it is the first concrete step from explicit membership lookup
into proof-based gating.

### Honest scope

`pool-adapter-mock` is still a **mock pool**:
- no value movement,
- no anonymity,
- no nullifier system beyond a mock spend-once guard,
- no privacy-pool economics.

---

## 4. `privacy-pool` — symbolic pool with ZK membership withdraws

`contracts/privacy-pool` is the first **prototype-real** privacy-pool vertical slice in this repo.
It is separate from `pool-adapter-mock`.

### Surface

- `__constructor(admin)`
- `set_verifying_key(admin, vk)`
- `deposit(depositor, commitment) -> index`
- `withdraw(proof, pub_signals, recipient, context, nullifier_hash) -> withdraw_count`
- `current_root() -> BytesN<32>`
- `deposit_count() -> u32`
- `withdraw_count() -> u32`
- `pool_balance() -> i128`
- `nullifier_spent(nullifier_hash) -> bool`

### What is real

- deposits are persisted by commitment into a **depth-4 incremental Merkle tree** for this vertical slice,
- `current_root()` is the truncated-SHA256 Merkle root consumed by
  `zk-prover/membership/membership_withdraw.circom`,
- the validated fixtures represent the current **depth-4** circuit/profile used by the contract,
- `withdraw(...)` verifies a real Groth16/BN254 proof against the configured on-chain VK,
- public signals bind `root`, `nullifierHash`, `recipient`, and `context`,
- withdraw accepts any **known root** in the on-chain root-history window, not only the latest root,
- nullifiers are written before a second withdraw can succeed,
- symbolic `pool_balance` decreases on withdraw.

### Honest scope

This pool is **symbolic-stateful**, not value-moving. The current membership circuit proves a
**depth-4** Merkle membership path so the Groth16 dev setup remains buildable and reproducible in the
current environment; it proves the note/nullifier flow with real multi-deposit state and root history,
but not production-scale anonymity. It does not custody Soroban tokens, enforce denominations with
token transfers, charge fees, or provide a production MPC setup. The current VK/proof fixtures come
from a dev one-party setup under `zk-prover/membership/`.

---

## What is real now vs not yet

### Real now

- canonical registry verification with explicit per-attestation revocation,
- issuer profile + scope + minimum-tier + symbolic stake policy model,
- mutable ASP membership tied to registry invalidation,
- authenticated **Merkle** root of the active set,
- pool gating by direct membership lookup,
- pool gating by plain Merkle membership proof,
- symbolic privacy-pool deposits,
- real BN254/Groth16 ZK membership withdrawal verification,
- real nullifier set for spend-once withdrawals,
- end-to-end real cross-contract composition across the three contracts.

### Not in scope for this track

- token-moving private pool custody,
- production MPC ceremony / audited verifier,
- decentralized issuer staking/slashing governance,
- autonomous revocation watcher/relayer pipeline.

---

## Validation

```bash
cargo test -p protocol-registry
cargo test -p asp-mvp
cargo test -p pool-adapter-mock
cargo test -p protocol-registry -p asp-mvp -p pool-adapter-mock
cargo test --workspace
```

### Latest verified results

- `protocol-registry`: **21 tests passed**
- `asp-mvp`: **11 tests passed**
- `pool-adapter-mock`: **11 tests passed**
- `privacy-pool`: **5 tests passed**
- `zk-prover/membership/build.sh`: **passed** (`snarkjs groth16 verify: OK!`)
- protocol trio together: **all green**
- full workspace: **all green**

### What the tests now prove

- registry revocation invalidates canonical verification,
- issuer tier / claim scope / jurisdiction scope are enforced,
- ASP removal is blocked while the claim still verifies,
- ASP removal succeeds after registry revocation or policy invalidation,
- active Merkle root updates on add/remove,
- pool adapter blocks stale membership after revocation,
- plain Merkle proof path releases only against the ASP's **current** root,
- stale proofs fail after the active set changes.
