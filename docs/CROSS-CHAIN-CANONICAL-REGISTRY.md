# Cross-Chain Canonical Registry — Semantics and Boundary

**Status:** draft cross-chain semantics  
**Data:** 2026-06-19

## 1. Purpose

This document clarifies what is **canonical now** in the DPO2U protocol slice and how current cross-chain artifacts relate to registry semantics.

The key distinction is:
- **canonical registry** = the on-chain truth surface that downstream contracts use to answer whether a claim is currently valid under the active trust model,
- **cross-chain evidence** = proofs, seals or attestations that may originate elsewhere or verify elsewhere, but only become canonical for this slice when bound into the DPO2U verification surface.

## 2. What is canonical now

The canonical question for the current protocol slice is answered by:

`protocol-registry.verify_attestation_proof(subject_commitment, claim_type, jurisdiction, attestation_root) -> bool`

That result is canonical because downstream gating (`asp-mvp`, blocked-lane logic) depends on it directly.

### Canonical now
- canonical registry verification with explicit revocation,
- issuer profile / claim scope / jurisdiction scope / trust-tier semantics,
- symbolic minimum stake policy threshold,
- mutable ASP membership derived from canonical verification,
- blocked-lane operationalization on the DPO2U-controlled lane.

### Not canonical now
- off-chain aggregate verification result by itself,
- external read-only lane state that DPO2U cannot mutate,
- relay transport claims without on-chain re-verification,
- future shared-governance lane not yet under granted authority.

## 3. Cross-chain evidence classes in this repo

| Evidence class | Current status | Canonical effect |
|---|---|---|
| Same BN254 proof verified on Stellar/EVM/Solana | real now in dedicated demos | demonstrates proof portability; does not by itself redefine canonical registry semantics |
| EVM-origin proof re-verified on Soroban via `xchain-attest` | real now in dedicated demo | canonical only within that contract's own claim surface, not automatically the protocol-registry |
| SnarkPack aggregate verified off-chain and sealed on-chain | real now as sealed result | canonical as a sealed published result only to the contract that stores it; not equivalent to full on-chain aggregate verify |
| External audited ASP lane readable by DPO2U | real now | audit/comparability boundary, not DPO2U write authority |

## 4. Trust assumptions by cross-chain mode

### A. Same proof, multiple chains
Current repo evidence shows the same BN254/Groth16 proof can verify on-chain on Stellar, EVM and Solana.

**Trust assumption:** each chain verifies the proof under its own pinned verifier/VK assumptions.

### B. Relayer courier model
The EVM→Soroban relay demo uses a trusted courier for transport, but Soroban re-verifies the proof on-chain.

**Trust assumption:**
- courier is trusted for transport ordering/delivery,
- proof validity is enforced fail-closed on-chain,
- courier cannot forge a valid claim with an invalid proof.

### C. Off-chain SnarkPack aggregate + on-chain seal
Current aggregate result is verified off-chain because Soroban lacks GT operations needed for on-chain TIPP/MIPP verification.

**Trust assumption:**
- off-chain aggregate verifier result is honestly produced,
- on-chain contract seals the result and may verify one member proof on-chain,
- this is not equivalent to native on-chain aggregate verification.

## 5. Accepted proof origins in the current public-base story

The current repo supports a strong claim about **proof portability**, not a claim that every origin is already wired into one universal canonical registry.

Acceptable statement now:
> DPO2U demonstrates cross-chain ZK depth and proof portability across Stellar, EVM and Solana, while the protocol-registry remains the canonical policy/verdict surface for the current Stellar public-base slice.

Overclaim to avoid:
> all chains already feed one fully mature canonical registry under one decentralized governance model.

## 6. Replayable artifact references

### Stellar / EVM / Solana proof portability
- `docs/2026-06-15-moonshots-zk-5-6.md`
- `docs/demos/runs/2026-06-15T18-41-32Z-two-chains-one-proof.json`

### Relayed re-verification on Soroban
- `docs/2026-06-15-moonshots-zk-5-6.md`
- `docs/demos/runs/2026-06-15T19-08-35Z-xchain-relayer.json`

### Aggregate sealed result
- `docs/2026-06-15-moonshots-zk-5-6.md`
- `zk-prover/agg/aggregate.json`
- `docs/demos/runs/2026-06-15T18-58-40Z-agg-filing-testnet-deploy.json`

### B-first operational boundary
- `docs/S8-EXTERNAL-ASP-BOUNDARY-REPORT.md`
- `docs/S7-REVOCATION-WATCHER-REPORT.md`

## 7. Mapping to the canonical registry story

### Real now
- DPO2U can demonstrate cross-chain proof verification depth,
- DPO2U can demonstrate a canonical registry on Stellar whose answer drives downstream gating,
- DPO2U can operationalize invalidation on its own controlled lane.

### Public-base interpretation
The public-base story is therefore:
1. **policy/verdict canonicality** lives in the protocol-registry-driven Stellar slice,
2. **proof portability** is demonstrated cross-chain,
3. **shared external authority** is still a governance milestone, not current reality.

## 8. Roadmap boundary

Still roadmap / not closed in the current slice:
- one universal cross-chain canonical registry with shared governance,
- trustless light-client bridge semantics across all origins,
- on-chain SnarkPack aggregate verification on Soroban,
- decentralized verifier network.

## 9. Short form for public surfaces

> Cross-chain is real in the proof layer; canonicality is real in the Stellar registry layer. What is not yet closed is a single shared-governance cross-chain canonical registry under one decentralized authority model.
