# PRD — EnergyPay × Privy × DPO2U (Phase 1)

**Date:** 2026-06-23 · **Owner:** Frederico (DPO2U) · **Status:** Draft for build
**Design source:** `docs/superpowers/specs/2026-06-23-energypay-privy-dpo2u-composability-design.md`

## 1. Problem

EnergyPay settles energy payments on Stellar mainnet, but its hardest, most
valuable problem is no longer "execute a transaction" — it is **governing who may
execute, under which conditions, with which accountability trail.** Today the
operator surface (auth, roles, server-side signing of `PLATFORM_MANAGED` wallets)
is the most fragile and least institutionally defensible part of the product.

## 2. Goal

Make a settlement **execute only when DPO2U admits it**, with the operator signing
through a Privy-held wallet, and a verifiable evidence hash — bound to the exact
transaction — pinned to the settlement receipt. Turn EnergyPay from "settlement
infra" into "institutional financial-operation infra: governed operator identity,
policy-gated execution, verifiable trail."

## 3. Users

- **Operator** — authenticates into EnergyPay, signs settlements via a Privy wallet.
- **Compliance/DPO** — defines the admissibility policy DPO2U enforces.
- **Auditor / enterprise buyer / regulator** — consumes the verifiable receipt.

## 4. Layering (fixed)

EnergyPay = commercial surface · Privy = operator/wallet/signer · DPO2U = admission
gate (decides if the action executes) · DeFindex = treasury sink (**Phase 2 only**).
Principle: **all layers execute; DPO2U decides whether they execute.**

## 5. Phase-0 — de-risking spike (BLOCKING)

Before the implementation plan, prove that a Privy operator wallet can sign a
**Soroban auth-entry** end to end on testnet.
- **Pattern (confirmed by research):** Privy raw hash signing (`useSignRawHash`,
  chainType `stellar`) + Stellar `authorizeEntry(...)` — sign the
  `SorobanAuthorizationEntry` preimage hash; a separate fee-payer sources the tx.
- **Done =** a Privy-held key signs a real Soroban invocation, submitted and
  confirmed on testnet (the PLD-pin call is a fine target). Harness:
  `scripts/spikes/privy-soroban-authentry/`.
- **If it fails:** re-scope so signing happens outside Privy (Privy keeps identity).

## 6. Functional requirements (Phase 1)

| # | Requirement |
|---|---|
| FR1 | EnergyPay backend builds the exact settlement tx and computes its canonical digest. |
| FR2 | Backend calls `admit(action, txDigest)` on a DPO2U `EnergyPaySettlementGateway` (mirrors `DefindexPolicyGateway`) → `{ decision, evidenceHash, expiresAt, reason }`, `evidenceHash` bound to `txDigest`. |
| FR3 | `deny` / `review` → backend refuses to sign (review = deny in P1, parked, no auto-approve); blocked attempt logged with evidence hash. |
| FR4 | `allow` → operator signs THAT exact tx via Privy; backend submits only if the to-be-submitted digest equals the admitted digest (TOCTOU guard) and the decision is unexpired. |
| FR5 | The DPO2U evidence hash is pinned to the settlement receipt/memo (reuse PLD-pin), verifiable against the admitted tx. |
| FR6 | Operator wallet is a Privy operator-held embedded wallet (hardened `USER_CONTROLLED` mode; no stored secret). |

## 7. Acceptance criteria

- **PRIMARY:** a `deny` provably prevents the Privy signature; the audit trail shows
  the blocked attempt with its evidence hash. (The deny is the proof — without it,
  "settle only after allow" passes vacuously.)
- An `allow` lets the operator sign the exact tx; submitted digest = admitted digest.
- Each settled tx carries a tx-bound DPO2U evidence hash pinned to its receipt.
- Demo-able end to end on testnet with the deny/allow contrast visible.

## 8. Out of scope (YAGNI for Phase 1)

On-chain Soroban settlement gate; DeFindex/treasury; rail/CCTP; new custody/MPC; a
full `review` workflow as code (P1 maps review→deny); replacing EnergyPay's
billing/identity/notification stack.

## 9. Milestones

1. **Phase 0 spike** (Privy↔Soroban auth-entry on testnet) — blocking.
2. `EnergyPaySettlementGateway` (DPO2U admit, tx-digest-bound evidence).
3. Backend seam: insert `admit()` before `.sign()` in the settlement path; TOCTOU
   guard + expiry check.
4. Privy operator wallet adapter (`USER_CONTROLLED`).
5. Evidence pin to receipt (reuse PLD-pin) + audit of blocked attempts.
6. Testnet end-to-end demo (deny + allow).

## 10. Commercial wedge

EnergyPay = front door ("institutional financial operation on Stellar," not "a stack
of protocols"). Operator identity governed (Privy). Execution conditioned (DPO2U).
**The verifiable receipt is the hero, owned by DPO2U** — "EnergyPay liquida; a DPO2U
é o que você mostra na auditoria." Depth on demand (DeFindex, Phase 2). Institutional
posture for due diligence. DeFindex is proof of depth, not the pitch.

## 11. Risks

- **TOCTOU** (off-chain decision vs on-chain execution) — mitigated in P1 at the
  evidence level (digest-bound hash); fully closed on-chain in Phase 2's gate.
- **Privy can't sign Soroban auth-entries** — retired by the Phase-0 spike.
- **DPO2U disappears in the narrative** — countered by making the receipt its face.
