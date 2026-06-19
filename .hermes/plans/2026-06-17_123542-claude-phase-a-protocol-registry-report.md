# Phase A Report — `protocol-registry` (DPO2U protocol track)

**Date:** 2026-06-17
**Scope of this run:** Phase A only — the `protocol-registry` Soroban contract.
**Source plan:** `.hermes/plans/2026-06-17_123119-protocol-registry-asp-pool-gating.md`
**Status:** ✅ Complete. `cargo test -p protocol-registry` → 16 passed, 0 failed.

---

## 1. Files created / modified

### Created
- `contracts/protocol-registry/Cargo.toml` — new workspace member (picked up by `members = ["contracts/*"]`). Depends only on `soroban-sdk` (workspace `26.0.0`); `testutils` as dev-dep. Mirrors the `anticorruption-attestation` crate layout.
- `contracts/protocol-registry/src/lib.rs` — the contract (`#![no_std]`).
- `contracts/protocol-registry/src/test.rs` — 16 real Rust contract tests.
- `docs/asp-protocol-mvp.md` — baseline/scope freeze for the protocol track (Phase A frozen; B/C and revocation/trust-model explicitly out of scope).

### Modified
- None. No existing contract, doc, or workspace file was touched (no refactors, per scope).

> Not committed / not pushed, per instructions.

---

## 2. What was implemented (Phase A surface)

Exactly the six functions from the plan, plus two read-only getters and `admin()`:

| Function | Behaviour |
|----------|-----------|
| `__constructor(admin)` | Sets admin; fail-closed on re-init (`AlreadyInitialized #6`). |
| `authorize_issuer(admin, issuer, allowed)` | Admin-only binary issuer flag. Emits `issuer` event. |
| `set_claim_policy(admin, claim_type, jurisdiction, active)` | Admin-only per-`(claim_type, jurisdiction)` activation. Emits `policy` event. |
| `register_attestation(issuer, subject_commitment, claim_type, jurisdiction, valid_until, attestation_root) -> seq` | Issuer-auth + authorized + active policy; insert-only canonical slot. Emits `register` event; returns ledger seq as receipt. |
| `get_attestation(subject_commitment, claim_type, jurisdiction) -> Option<AttestationRecord>` | Canonical read. |
| `verify_attestation_proof(subject_commitment, claim_type, jurisdiction, attestation_root) -> bool` | Canonical predicate, never panics. |
| `is_authorized_issuer` / `claim_policy_active` / `admin` | Read-only getters (legibility + downstream/ASP convenience). |

**Storage layout** (matches the plan's `DataKey` proposal):
- `DataKey::Admin` (instance)
- `DataKey::AuthorizedIssuer(Address)` (instance)
- `DataKey::ClaimPolicy(Symbol, Symbol)` (instance)
- `DataKey::Attestation(BytesN<32>, Symbol, Symbol)` (persistent)

`AttestationRecord { issuer, claim_type, jurisdiction, valid_until, attestation_root, timestamp }`.

**`verify_attestation_proof` returns `true` iff:** record exists AND policy active AND `attestation_root` matches exactly AND not expired (`valid_until == 0` ⇒ no expiry).

---

## 3. Design decisions (and the honesty rationale behind each)

1. **`verify_attestation_proof` is a deterministic canonical check, NOT a ZK proof.** The
   plan explicitly de-scopes ZK/membership for Phase A. The function name reflects the
   *protocol role* (the surface the ASP will consume); the body is existence + policy +
   validity + root match. This is called out in the module docs and the baseline doc so the
   name can't be read as a ZK claim.

2. **Insert-only canonical slots (first authorized writer wins).** The slot key is
   `(subject_commitment, claim_type, jurisdiction)` — it does **not** include the issuer, per
   the plan's `DataKey` layout. A second `register_attestation` on the same triple (even from
   a different authorized issuer) is rejected with `AttestationExists #3`. Rationale: with **no
   revocation and no overwrite in Phase A**, allowing silent overwrite would either fake a
   renewal/revocation path or let issuers clobber each other. Insert-only is the honest MVP;
   renewal/revocation are explicit later-phase hooks.

3. **Policy `active=false` is a coarse kill-switch, NOT per-attestation revocation.**
   `verify` re-checks policy at call time, so deactivating a policy stops *all* claims under
   that `(claim_type, jurisdiction)` from verifying. This is deliberately distinguished from
   revocation (which stays out of scope) in both code comments and the baseline doc, so it
   isn't mistaken for the revocation feature.

4. **Issuer trust model is a binary admin flag — and labelled as such.** No reputation /
   quorum / staking. "Distributed registry" is defined narrowly as "neutral registry multiple
   issuers can be *authorized* to write into," not decentralized governance. This avoids the
   inflated-claim risk the plan flags (Risk 1).

5. **`valid_until == 0` sentinel = no expiry.** Keeps the common "non-expiring attestation"
   case explicit and testable without special types. Documented in the record field and the
   predicate contract.

6. **`verify` is side-effect-free (no event emission).** The plan offered "emit `verified`
   *or* `registered`." Chose `registered`-only (on `register_attestation`) so `verify` stays a
   clean, queryable predicate suitable for cross-contract read-style use by the ASP.

7. **Storage tier choice mirrors the pilot:** config (admin/issuer/policy) in `instance`
   storage, attestations in `persistent` — consistent with `anticorruption-attestation`.

8. **No PII on-chain.** `subject_commitment` and `attestation_root` are opaque off-chain
   commitments; `subject_commitment` lives only in the storage key (not duplicated in the
   record).

---

## 4. Test coverage (16 tests, all green)

Scaffold-level: `constructor_sets_admin`, `verify_false_for_missing_claim`,
`get_attestation_none_until_registered`, `unauthorized_issuer_cannot_register (#1)`.

Admin gating: `authorize_issuer_admin_only (#5)`, `set_claim_policy_admin_only (#5)`,
`authorize_and_policy_getters_reflect_state`.

Canonical register + verify: `register_with_active_policy_then_verify_true`,
`register_blocked_when_policy_inactive (#2)`,
`register_blocked_when_policy_explicitly_deactivated (#2)`, `verify_false_on_wrong_root`,
`verify_false_when_policy_later_deactivated`, `verify_false_when_expired` (uses ledger
timestamp advance), `duplicate_registration_rejected_insert_only (#3)`,
`second_authorized_issuer_cannot_clobber_slot (#3)`, `distinct_triples_are_independent`.

These map directly to the plan's Task 2 (scaffold) and Task 3 (canonical verification)
acceptance points, including the four `verify` truth conditions and the temporal-expiry case.

---

## 5. Commands executed

```bash
# explored reference contracts (anticorruption-attestation, xchain-attest) + workspace manifest
cargo --version   # cargo 1.95.0
rustc --version   # rustc 1.95.0

# iterative validation
cargo test -p protocol-registry   # first run: 2 compile errors (missing testutils::Ledger import)
# fix: imported `testutils::{Address as _, Ledger as _}`
cargo test -p protocol-registry   # 16 passed
cargo build -p protocol-registry  # clean, no warnings
cargo test -p protocol-registry   # final: 16 passed
```

### Final test result (verbatim tail)

```
running 16 tests
test result: ok. 16 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.05s
```

---

## 6. Blockers / honest limitations

- **None blocking.** Phase A is self-contained and green.
- **One iteration needed during dev:** the expiry test used `env.ledger().with_mut(...)`
  without importing the `testutils::Ledger` trait → compile error, fixed by adding the import.
  No logic change.
- **Honest limitations carried forward (by design, not defects):**
  - No revocation, no overwrite, no renewal of an attestation in Phase A.
  - Binary issuer trust model only.
  - `verify_attestation_proof` is canonical, not ZK.
  - The ASP and pool adapter (Phases B/C) are **not** in this run — no `add_to_set`,
    `current_root`, or membership gating exists yet. The registry is built to be consumed by
    them but does not itself prove the end-to-end gating thesis.
- **Workspace note:** only `protocol-registry` was compiled/tested in this run (scope). A full
  `cargo test --workspace` was not run because Phase A's mandated validation is
  `cargo test -p protocol-registry`, and no other crate was modified.

---

## 7. Next (do not start before Phase A is accepted)

Per the plan: Phase B = `asp-mvp` (`add_to_set` gated by this registry via cross-contract
call + `current_root`), then Phase C = `pool-adapter-mock` (membership gating). Revocation and
full issuer trust model remain the natural follow-on sprint.
