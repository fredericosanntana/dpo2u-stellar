# Credential Lifecycle Spec — DPO2U Public Base

**Status:** draft lifecycle spec  
**Data:** 2026-06-19

## 1. Scope

This document defines the lifecycle semantics already implied by the current DPO2U protocol slice and makes them explicit for integrators, reviewers and future standardization.

It covers:
- issuance,
- verification,
- revocation,
- expiry,
- freshness,
- issuer-policy invalidation,
- gating consequences in ASP / blocked-lane,
- where nullifier/epoch semantics apply and where they do not.

## 2. Lifecycle states

| State | Meaning | Current basis |
|---|---|---|
| **issued** | attestation slot exists in the registry | real now |
| **verifiable** | issued + policy active + not revoked + not expired + root matches + issuer still fits trust model | real now |
| **revoked** | slot explicitly invalidated | real now |
| **expired** | `valid_until` or issuer-profile expiry has lapsed | real now |
| **policy-invalid** | claim policy, issuer profile, scope, trust tier or symbolic stake conditions no longer satisfy verification | real now |
| **removed-from-ASP** | membership removed after backing verification no longer holds | real now |
| **blocked-lane executed** | operational consequence applied in the DPO2U-owned enforcement lane | real now in B-first mode |
| **withdrawn/nullified** | prototype-real pool note spent once and prevented from replay | prototype-real |

## 3. Issue

An attestation is **issued** when an authorized issuer registers it in the canonical registry with:
- `subject_commitment`,
- `claim_type`,
- `jurisdiction`,
- `valid_until`,
- `attestation_root`.

Issue alone does **not** guarantee future verifiability. Verifiability remains conditional on:
- active policy,
- issuer profile,
- scope constraints,
- freshness,
- absence of revocation,
- trust tier / symbolic stake constraints.

## 4. Verify

Verification answers the canonical question:

`verify_attestation_proof(subject_commitment, claim_type, jurisdiction, attestation_root) -> bool`

A credential is **verifiable** only when all current invariants hold simultaneously:
1. slot exists,
2. policy active,
3. not revoked,
4. not expired,
5. root matches,
6. issuer authorized and active,
7. issuer claim scope allows claim,
8. issuer jurisdiction scope allows jurisdiction,
9. issuer trust tier satisfies policy minimum,
10. issuer symbolic stake satisfies policy minimum where configured.

## 5. Revoke

Revocation is explicit and per attestation slot.

### Effect of revocation
- canonical verification becomes false,
- ASP membership backed by that credential becomes removable,
- downstream blocked-lane action can be triggered by the operational watcher,
- any stale membership proof against a changed active root becomes invalid.

Revocation is therefore both:
- a **registry state transition**, and
- an **enforcement trigger** for downstream composition.

## 6. Expire

Expiry is freshness-driven invalidation.

A credential is expired when:
- its own `valid_until` is in the past, or
- the issuer profile / validity envelope no longer permits it under current trust rules.

Expiry is fail-closed: an expired attestation does not remain verifiable just because it still exists in storage.

## 7. Freshness window

Freshness in the current public-base slice is driven by:
- attestation validity horizon,
- issuer-profile validity horizon,
- still-active claim policy,
- still-valid claim/jurisdiction/issuer scope.

This repo does **not** currently define a separate global freshness oracle or epoch rollover contract for attestations. Freshness is expressed through existing registry/policy time semantics.

## 8. Issuer-policy invalidation

A credential can become non-verifiable without explicit revocation if the issuer or policy envelope changes.

Examples:
- issuer profile deactivated,
- issuer profile expired,
- issuer loses claim scope,
- issuer loses jurisdiction scope,
- trust tier falls below minimum,
- symbolic stake falls below policy minimum,
- claim policy itself is deactivated.

This matters because lifecycle is not only `issued` vs `revoked`; it is also **trust-model-sensitive**.

## 9. ASP consequences

ASP membership is not an independent truth source.

### Admission
`add_to_set(...)` is allowed only if canonical verification currently succeeds.

### Removal
`remove_from_set(...)` succeeds only when the backing registry claim no longer verifies.

### Root semantics
The ASP root represents the **active** set, not a historical append-only ledger.

Consequences:
- add/remove changes the root,
- stale proofs stop validating against the new current root,
- downstream proof gating can fail-closed after revocation/invalidation.

## 10. Blocked-lane consequences

In B-first mode, registry invalidation can be transformed into a concrete blocked action on the DPO2U-controlled lane.

Current real-now flow:
- registry invalidation detected,
- watcher derives blocked consequence,
- on-chain mutation occurs on the DPO2U-controlled `asp-non-membership` instance,
- idempotent records prevent repeated or drifting operations.

The external audited lane remains read/audit boundary unless governance/admin authority changes.

## 11. Nullifier and epoch semantics

### Nullifier semantics — applies only to the prototype-real pool lane
In `privacy-pool`, a successful withdraw records a `nullifier_hash` so the note cannot be spent twice.

This is a **spend-once** property for the ZK pool slice. It is **not** the same thing as registry revocation.

### Epoch semantics — not a canonical registry lifecycle primitive today
This repo does not currently implement a separate epoch-based attestation lifecycle authority for the canonical registry.
Where time semantics matter, they are expressed via validity/freshness windows and the active root history in the pool lane.

## 12. Root history semantics

### Registry / ASP
Current truth is the current verifiability state and active ASP root.

### Prototype-real pool
The pool may accept withdrawal against a **known root** in the configured root-history window, not only the latest root. This is a proof-system convenience and replay window control, not a statement that stale credentials remain compliant.

## 13. Non-goals of this spec

This spec does **not** imply:
- mature selective disclosure network,
- value-moving private custody,
- multi-party MPC provenance,
- decentralized verifier network,
- anonymity-at-scale guarantees.

## 14. Current implementation summary

| Lifecycle part | Current label |
|---|---|
| Issue / verify / revoke / expire semantics | real now |
| Issuer-policy invalidation semantics | real now |
| ASP add/remove/current-root coupling | real now |
| Blocked-lane operationalization in B-first mode | real now |
| Nullifier spend-once semantics in `privacy-pool` | prototype-real |
| Epoch-based lifecycle authority beyond existing validity windows | roadmap |
