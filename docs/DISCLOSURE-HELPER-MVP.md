# Disclosure Helper MVP — Bounded Selective Disclosure

**Status:** implemented bounded helper  
**Data:** 2026-06-19

## Goal

Materialize a minimal disclosure surface that is honest for the current DPO2U public-base phase:
- no payload decryption on-chain,
- no universal view-key network,
- no regulator workflow claim,
- but a **real authorized grant** that is hash-bound to the disclosed off-chain package and fail-closed against canonical registry invalidation.

## Contract

- `contracts/disclosure-helper/src/lib.rs`
- package: `disclosure-helper`

## What it does (real now)

The helper records a `DisclosureGrant` keyed by `grant_id` with:
- `reviewer`
- `issued_by`
- `subject_commitment`
- `claim_type`
- `jurisdiction`
- `attestation_root`
- `disclosed_payload_hash`
- `active`
- `valid_until`
- issuance timestamp / sequence

### Grant issuance
`issue_grant(...)` succeeds only when:
1. caller is an authorized operator,
2. the grant id is unused,
3. expiry is valid,
4. `protocol-registry.verify_attestation_proof(...) == true` for the bound statement.

### Review check
`can_review(grant_id, reviewer)` returns true only when:
1. grant exists,
2. grant is still active,
3. caller matches the bound reviewer,
4. grant is not expired,
5. the backing canonical registry statement still verifies.

### Revocation
`revoke_grant(...)` can be executed by:
- admin, or
- the operator who issued the grant.

## Why this matters

This is enough to support an honest bounded-disclosure flow:
- the sensitive package remains off-chain,
- the reviewer-specific authorization becomes explicit,
- the disclosed package can be matched by hash to the grant,
- if the credential is revoked or policy-invalidated, review access fails closed.

## What it does NOT do

Still not implemented:
- payload encryption / decryption on-chain,
- general-purpose view keys,
- multi-party disclosure key management,
- regulator workflow engine,
- cross-chain universal disclosure registry,
- institution-grade privacy transport.

## Honest claim after this helper

> DPO2U now has a bounded selective-disclosure helper: reviewer-specific, hash-bound disclosure grants that remain valid only while the underlying canonical registry statement still verifies.

## Validation run

Command run:
```bash
cargo test -p disclosure-helper
```

Observed result:
- `disclosure-helper`: **7 passed**

## Key tests

- happy path grant issuance and reviewer check
- fail-closed issuance when registry verification is false
- review turns false after registry revocation
- review turns false after expiry
- operator/admin revoke path
- unauthorized operator rejected
