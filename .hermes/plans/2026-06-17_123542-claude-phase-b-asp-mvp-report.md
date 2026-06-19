# Phase B — `asp-mvp` — Execution Report

**Date:** 2026-06-17
**Sprint:** protocol-registry → ASP MVP → pool-adapter (source plan
`.hermes/plans/2026-06-17_123119-protocol-registry-asp-pool-gating.md`)
**Scope of this run:** Phase B only — the `contracts/asp-mvp` Soroban contract.
**Result:** ✅ implemented and green. `cargo test -p asp-mvp` → **10 passed, 0 failed**.

---

## 1. Files created / modified

### Created
- `contracts/asp-mvp/Cargo.toml`
  - New workspace crate. `protocol-registry` added as a **path dependency**
    (`{ path = "../protocol-registry" }`) so the ASP can use its generated client for the
    cross-contract call — mirroring how `xchain-attest` depends on `por-verifier`.
- `contracts/asp-mvp/src/lib.rs`
  - The ASP contract: `__constructor(admin, registry)`, `add_to_set(...)`, `contains(...)`,
    `current_root()`, `leaf_count()`, plus getters `admin()` / `registry()`.
- `contracts/asp-mvp/src/test.rs`
  - 10 Rust tests exercising the real cross-contract call against the **actual** Phase-A
    `ProtocolRegistry` contract (not a stub/mock).

### Modified
- `docs/asp-protocol-mvp.md`
  - Status header: Phase B is now implemented; Phase C remains out of scope.
  - Track-shape table: Phase B row flipped to **Implemented**.
  - Added a **Phase B — `asp-mvp` (implemented)** section describing the surface, the
    fail-closed registry gate, and the deterministic append-only root (explicitly **not** a
    Merkle tree, **not** an inclusion/ZK proof).
  - Updated "implemented now vs NOT yet": ASP moved to implemented; revocation, full issuer
    trust model, and ZK/membership proof remain honestly out-of-scope. Clarified the
    registry kill-switch does **not** retroactively remove an already-admitted member.
  - Validation section: added `cargo test -p asp-mvp` and the Phase B test summary.

No other files were touched. `pool-adapter-mock`, revocation, issuer trust model, and broad
docs were left untouched as required.

---

## 2. Design decisions

1. **Registry fixed at construction (no `set_registry`).** The plan offered `set_registry`
   as optional "if you want a swap in the test env". I deliberately omitted it to keep the
   trust surface obvious and the MVP minimal. Tests wire the registry via the constructor.

2. **`add_to_set` gate = fail-closed cross-call, nothing else.** The contract reads the
   stored registry address and calls
   `ProtocolRegistryClient::new(&env, &registry).verify_attestation_proof(subject_commitment,
   claim_type, jurisdiction, attestation_root)`. If it returns `false`, the call
   `panic_with_error!(NotVerified=#1)` **before any state write** — so a rejected admission
   leaves root, leaf_count, and membership untouched. This is the exact `xchain-attest`
   pattern (re-verify on-chain, fail closed).

3. **`submitter.require_auth()` is for legibility, not trust.** The caller is recorded as
   the initiator; the actual admission decision is 100% the registry's. This does not
   introduce an ASP-side trust model (which stays out of scope).

4. **Deterministic append-only root (MVP), honestly named.** Implemented exactly as the plan
   specified: `root_0 = 0x00..00`, `root_{n+1} = sha256(root_n || deposit_commitment)`, via
   `env.crypto().sha256(prev_root || commitment)`. It is an order-dependent hash chain,
   reproducible off-chain — enough to prove `registry → ASP → inclusion`. It is **not** a
   Merkle tree and gives **no** efficient inclusion proof / membership ZK proof. Inclusion is
   answered by the explicit `contains(...)` lookup. The code module docs and the public docs
   both state this plainly.

5. **Admit-only set, no revocation.** A duplicate `deposit_commitment` is rejected with
   `AlreadyMember=#3` (insert-once, matching the registry's insert-only canonical-slot
   style) rather than a silent no-op — so accidental re-adds are visible. No
   `remove_from_set` exists; revocation is explicitly out of scope.

6. **Storage layout.** Singletons (`Admin`, `Registry`, `Root`, `LeafCount`) live in
   instance storage; the unbounded `Member(BytesN<32>)` flag lives in persistent storage —
   consistent with the registry's convention (instance for config, persistent for the
   growing record set).

7. **Error codes aligned with sibling contracts:** `NotVerified=1`, `AlreadyMember=3`,
   `AlreadyInitialized=6` — same numeric conventions used by `protocol-registry` /
   `xchain-attest` so cross-contract reasoning stays consistent.

---

## 3. Commands executed

```bash
# inspection / pattern study
#   read source plan, protocol-registry (lib + Cargo + tests), xchain-attest (lib + Cargo + tests)
ls contracts/
grep -rn "sha256" contracts/

# validation (mandatory)
cargo test -p asp-mvp
```

---

## 4. Test results (real output)

`cargo test -p asp-mvp`:

```
running 10 tests
test test::constructor_sets_admin_and_registry ... ok
test test::contains_false_before_any_admission ... ok
test test::add_to_set_fails_closed_when_registry_unverified - should panic ... ok
test test::failed_admission_leaves_root_and_count_untouched ... ok
test test::empty_set_root_is_zero_and_count_zero ... ok
test test::add_to_set_admits_when_registry_verifies ... ok
test test::root_is_deterministic_sha256_chain_over_zero ... ok
test test::duplicate_admission_rejected - should panic ... ok
test test::verify_gate_tracks_registry_policy_kill_switch ... ok
test test::two_admissions_advance_root_and_count_deterministically ... ok

test result: ok. 10 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```

### What the tests actually prove
- **constructor** persists admin + registry; empty set ⇒ `current_root()` is the zero root,
  `leaf_count()` is 0, `contains(x)` is false.
- **fail-closed:** with the registry un-armed, `add_to_set` panics `#1 NotVerified`.
- **happy path:** after arming the registry (authorize issuer → activate policy → register
  attestation), `add_to_set` returns 1, `contains` is true, `leaf_count` is 1, root ≠ zero.
- **deterministic root:** `current_root()` equals an independent test-side recomputation of
  `sha256(0x00..00 || deposit)`, and after a second admission equals
  `sha256(root_1 || deposit_b)`.
- **no side effects on failure:** a rejected admission (unverified subject) leaves root,
  count, and membership exactly as before (verified via `try_add_to_set` + state asserts).
- **admit-only:** a duplicate commitment panics `#3 AlreadyMember`.
- **kill-switch propagation:** deactivating the registry policy makes the ASP fail closed
  (the ASP re-asks the registry every call) and admits nothing.

The cross-contract call is exercised against a **real** `ProtocolRegistry` instance
registered in the test env — this is a genuine `ASP → registry` composability test, not a
mocked boolean.

---

## 5. Blockers / honest limitations

- **No blockers.** Phase B compiled and all tests passed on the first full run.
- **MVP boundaries (by design, not faked):**
  - `current_root()` is a hash chain, **not** a Merkle tree → no efficient/ZK inclusion
    proof. Membership is answered only by `contains(...)`.
  - The set is **admit-only**: no removal/revocation. The registry's policy kill-switch
    blocks *future* admissions but does not retroactively evict an existing member.
  - No ASP-side issuer trust model — admission trust is delegated entirely to the registry,
    whose issuer model is itself a binary admin flag (Phase A scope).
  - `set_registry` intentionally omitted (registry fixed at construction).
- **Out of scope this run (untouched):** `contracts/pool-adapter-mock` (Phase C), revocation,
  full issuer trust model, broad docs beyond the baseline.

No commit and no push were made, per instructions.
