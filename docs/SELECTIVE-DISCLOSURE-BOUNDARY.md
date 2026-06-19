# Selective Disclosure Boundary — Bounded MVP

**Status:** boundary/spec draft  
**Data:** 2026-06-19

## 1. Purpose

This document defines the **bounded MVP** disclosure story that can be truthfully attached to the current DPO2U public-base protocol work.

It does **not** claim a final institutional disclosure network. It defines what can be safely said now and what remains future work.

## 2. Core principle

DPO2U aims for:
> privacy from the public, accountability to the authorized party.

In the current repo, the strongest honest statement is:
- public/base verification should reveal as little as possible,
- disclosed payloads, when needed, must be authorized, bounded, and cryptographically or hash-bound to the sealed verdict/evidence surface,
- the full regulator/institution-grade disclosure architecture is **not yet implemented** as a complete production system.

## 3. Current implementation boundary

### Real now
- the protocol surfaces are already commitment/root/verdict oriented rather than plaintext-PII oriented,
- public verification and gating rely on commitments, roots, policy fit, revocation and proof validity,
- the prototype-real pool binds public signals to `root`, `nullifierHash`, `recipient`, `context` rather than revealing full witness contents,
- `disclosure-helper` now provides a **bounded grant surface**: authorized operator, reviewer-specific grant, payload hash binding, expiry/revocation, and fail-closed dependency on `protocol-registry.verify_attestation_proof(...)`.

### Not fully implemented now
- a general-purpose on-chain view-key system,
- a multi-party disclosure key-management scheme,
- a regulator-operated disclosure workflow,
- a universal disclosure registry across chains.

## 4. Authorized actors (bounded MVP framing)

A bounded MVP may distinguish these roles conceptually:
- **subject / holder** — party whose compliance state is being proven,
- **issuer / verifier operator** — party that issued or manages the attestation surface,
- **authorized reviewer** — specifically authorized counterparty who may receive bounded disclosure,
- **public observer** — can see public-chain state but not private evidence payload.

Current repo status: these roles now have a **minimal contract-level implementation** through `disclosure-helper`, but still not a universal or institution-grade disclosure subsystem.

## 5. What may be revealed in a bounded disclosure flow

Permissible bounded disclosure surface for the current public-base story:
- verdict class or compliance status,
- claim/jurisdiction/use-case scope,
- evidence hash or root binding,
- issuer identity or issuer profile class where relevant,
- validity/freshness metadata,
- proof context binding proving the disclosed statement corresponds to the sealed one.

## 6. What should remain sealed

The following should remain sealed or out of public surface by default:
- raw subject PII,
- full private witness inputs,
- sensitive underlying documentary payloads,
- regulator-grade internal notes or work product,
- any disclosure material not explicitly authorized and hash-bound to the current statement.

## 7. Minimum consistency requirement

Any bounded disclosure story must preserve:
1. **identity of statement** — disclosed payload refers to the same subject/claim/jurisdiction context as the sealed verdict,
2. **binding** — disclosed payload/root/hash can be matched to the public attestation/proof surface,
3. **authorization** — not every observer can retrieve the disclosed payload,
4. **revocability** — authorization or validity can be withdrawn or expire,
5. **auditability** — the system can later explain what was revealed, to whom, and under what boundary.

## 8. View-key framing

The term **view-key** should be used carefully in current public surfaces.

### Acceptable now
- “bounded disclosure / view-key boundary”
- “selective disclosure MVP boundary”
- “authorized disclosure path is specified as a next public-base extension”

### Avoid as present-tense claim
- “fully implemented robust view-key disclosure system”
- “institution-grade selective disclosure network already operational”

## 9. Trust model

For the current bounded MVP framing, trust remains concentrated in:
- the operator/issuer side that controls disclosed payload availability,
- the auth boundary determining who receives additional information,
- the integrity of the hash/root binding back to the public or sealed statement.

This is still materially better than public plaintext disclosure, but it is **not** yet a decentralized disclosure fabric.

## 10. Revocation and rotation

A bounded disclosure extension should support, at minimum conceptually:
- disclosure grant creation,
- disclosure grant expiry,
- disclosure grant revocation,
- issuer/operator key rotation,
- invalidation when the underlying credential is revoked or stale.

Current repo status: grant creation, expiry semantics, revocation and fail-closed invalidation now exist in `disclosure-helper`; key management, encrypted transport and regulator workflow do not.

## 11. Relation to the current protocol track

Selective disclosure in this phase is an **extension of the public-base verifier story**, not a replacement for:
- canonical registry verification,
- ASP membership gating,
- blocked-lane enforcement,
- prototype-real ZK pool semantics.

The protocol spine remains valid without claiming full disclosure maturity.

## 12. Honest short form

> DPO2U already minimizes public exposure through commitments, roots and proof-based verification. We now also have a bounded selective-disclosure helper: reviewer-specific grants, payload-hash binding, expiry/revocation and fail-closed invalidation when the backing canonical statement stops verifying. A full institution-grade disclosure network remains future work.
