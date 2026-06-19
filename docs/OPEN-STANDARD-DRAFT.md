# Open Standard Draft — DPO2U Public-Base Compliance Protocol

**Status:** draft público-base  
**Data:** 2026-06-19

## 1. Purpose

This draft turns the current DPO2U Stellar protocol slice into a portable public-base standard.
It describes the **implemented verification spine** and clearly separates:

- **real now** — behavior already grounded in contracts/tests/docs in this repo,
- **prototype-real** — behavior with real cryptographic or contract machinery but bounded scope,
- **symbolic** — stateful logic that models a production concept without full value-moving/economic finality,
- **roadmap** — not implemented or not verifiable on-chain in the current stack.

## 2. Conformance profiles

| Profile | Meaning |
|---|---|
| `demo` | replayable testnet/devnet slice, honest boundary, suitable for demos/hackathon |
| `public-base` | documented verifier/lifecycle/registry semantics that can be externally reviewed and built against |
| `production-target` | target profile requiring audit, MPC, custody, governance and rollout gates not yet closed |

Current repo status:
- `protocol-registry` / `asp-mvp` / blocked-lane watcher: **public-base candidate**
- `privacy-pool`: **prototype-real / symbolic**, not `production-target`

## 3. Terms

- **attestation** — issuer statement bound to `(subject_commitment, claim_type, jurisdiction, attestation_root, valid_until)`
- **subject_commitment** — privacy-preserving subject identifier used for verification and gating
- **claim_type** — claim category being asserted (for example KYC/KYB-like semantics)
- **jurisdiction** — legal/policy context under which the claim is evaluated
- **attestation_root** — root or commitment representing upstream evidence/verdict binding
- **issuer profile** — policy object constraining which issuers are active and trusted
- **claim policy** — active/inactive rule plus minimum trust and optional symbolic stake threshold for `(claim_type, jurisdiction)`
- **revocation** — explicit invalidation of an attestation slot
- **freshness** — time validity expressed through `valid_until` and issuer-profile expiry constraints
- **ASP** — mutable association set gated by canonical registry verification
- **blocked lane** — operational consequence path triggered after registry invalidation/revocation
- **nullifier** — spend-once marker preventing replay/double-withdraw in the prototype-real ZK pool

## 4. Roles

| Role | Current status | Responsibility |
|---|---|---|
| **Admin** | real now | configures registry policy, issuer scope/profile, ASP authority, verifier VKs where applicable |
| **Issuer** | real now | registers attestations and is evaluated under profile/scope/trust constraints |
| **Submitter / operator** | real now | submits to ASP or runs watcher/blocked-lane operations under configured authority |
| **Verifier / integrator** | real now | reads contract state or cross-calls verifier surfaces to gate actions |
| **Authorized disclosure recipient** | bounded MVP / real now via helper | recipient of reviewer-specific disclosure grant under explicit auth boundary |

## 5. Required interfaces

### 5.1 Canonical registry

A conforming canonical registry exposes a verification surface equivalent to:

`verify_attestation_proof(subject_commitment, claim_type, jurisdiction, attestation_root) -> bool`

and enough admin/read methods to support:
- issuer authorization,
- issuer-profile activation/expiry,
- issuer claim scope,
- issuer jurisdiction scope,
- claim-policy activation,
- minimum trust tier,
- optional symbolic minimum stake,
- explicit revocation lookup.

### 5.2 Mutable gating set (ASP)

A conforming ASP exposes:
- admission gated by canonical registry verification,
- removal only after backing verification no longer holds,
- `contains(commitment) -> bool`,
- authenticated active-set root (`current_root`) derived from active membership.

### 5.3 Operational enforcement lane

A conforming public-base deployment documents:
- which lane is writable under present authority,
- whether any external lane is read-only vs writable,
- how invalidation becomes blocked action,
- how watcher/idempotency are achieved.

### 5.4 Prototype-real ZK pool (optional profile extension)

If present, the pool must clearly label whether it is:
- symbolic-stateful,
- token-custodial or not,
- using dev VK or audited production VK,
- using single-party/dev setup or mature MPC.

### 5.5 Bounded disclosure helper (optional public-base extension)

If present, a bounded disclosure helper should expose semantics equivalent to:
- reviewer-specific disclosure grants,
- payload-hash binding instead of payload plaintext storage,
- expiry and revocation,
- fail-closed invalidation when the backing canonical registry statement no longer verifies.

## 6. Verification invariants

A canonical verification result is `true` iff all of the following hold:
1. attestation slot exists,
2. claim policy for `(claim_type, jurisdiction)` is active,
3. attestation is not revoked,
4. attestation is not expired,
5. stored `attestation_root` matches the queried root,
6. issuer remains authorized under the active trust model,
7. issuer claim scope allows the queried claim,
8. issuer jurisdiction scope allows the queried jurisdiction,
9. issuer trust tier satisfies policy minimum,
10. issuer symbolic stake satisfies policy minimum where configured.

These invariants are **real now** for the current `protocol-registry` semantics described in `docs/asp-protocol-mvp.md`.

## 7. Revocation and freshness semantics

- **revocation** is explicit, per attestation slot,
- **expiry** is time-based and fail-closed,
- **issuer-policy invalidation** can make an otherwise present attestation fail canonical verification,
- **freshness** depends on both attestation validity and issuer-profile/policy still being active.

## 8. Membership and proof semantics

### Real now
- mutable ASP membership is derived from canonical registry verification,
- active-set root changes on add/remove,
- stale proofs become invalid after active-set changes,
- pool-adapter proof gating can require proof against the current ASP root.

### Prototype-real
- `privacy-pool` verifies real BN254/Groth16 membership withdraw proofs,
- current public signals bind `root`, `nullifierHash`, `recipient`, and `context`,
- nullifier replay is prevented on-chain,
- root history allows known-root withdrawal in the configured window.

### Not implied by this draft
- production anonymity set,
- value-moving private custody,
- audited production verifier,
- mature MPC ceremony,
- decentralized verifier network.

## 9. Claim / jurisdiction / issuer-profile / stake semantics

- `claim_type` and `jurisdiction` form the policy coordinate,
- issuer profile is an active trust envelope, not just a boolean allowlist,
- claim scope and jurisdiction scope are separate controls,
- trust tier is a policy threshold,
- stake in the current repo is **symbolic/admin-credited**, not decentralized crypto-economic governance.

## 10. Deployment boundary requirements

A public-base deployment MUST state:
- which verifier/registry surfaces are testnet/devnet vs mainnet,
- whether VK provenance is dev vs MPC-backed,
- whether any external lane is read-only vs writable,
- whether cross-chain verification is trustless on-chain, relayed, or only sealed off-chain.

## 11. Current DPO2U mapping

| Surface | Current label |
|---|---|
| SDK / attestation verify | real now |
| `protocol-registry` | real now |
| `asp-mvp` | real now |
| blocked-lane + watcher on DPO2U-owned instance | real now |
| external audited ASP lane write authority | roadmap / governance-dependent |
| `pool-adapter-mock` | real now as mock gate |
| `privacy-pool` | prototype-real + symbolic |
| `disclosure-helper` | real now as bounded disclosure helper |
| on-chain SnarkPack aggregate verification | roadmap |
| decentralized verifier network | roadmap |

## 12. Production-target gates (not yet closed)

To claim `production-target`, an implementation must additionally close:
- multi-party MPC / ceremony provenance,
- external audit of verifier/circuit/contract surfaces,
- custody and denomination logic where value movement exists,
- governance/authority model for shared lanes,
- operational monitoring, incident response, and rollout gates.

See `docs/PRODUCTION-READINESS-GATES.md`.
