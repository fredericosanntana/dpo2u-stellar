# EnergyPay × Privy × DPO2U — Composability Design (Phase 1)

**Date:** 2026-06-23
**Status:** Design — approved direction, pending written-spec review
**Scope of this spec:** Phase 1 only (EnergyPay + Privy + DPO2U, off-chain gateway). DeFindex (Phase 2) and rail/CCTP (Phase 3) are roadmap, not in scope here.

---

## 1. Thesis

EnergyPay stops being "settlement infra on Stellar" and becomes **institutional
financial-operation infra on Stellar: governed operator identity, policy-gated
execution, and a verifiable evidence trail.**

Commercial one-liner: **settlement + operator controls + policy-gated execution.**

## 2. Fixed layering (do not invert)

| Layer | Role |
|---|---|
| **EnergyPay** | Commercial surface — the product the customer sees; settlement & operation |
| **Privy** | Identity, wallet, signer, operator surface |
| **DPO2U** | Admissibility, governance, evidence loop, revocation — **decides if the action may happen** |
| **DeFindex** _(Phase 2)_ | Treasury / vault / privileged financial action — execution sink |

Load-bearing principle: **all layers execute; DPO2U decides whether they execute.**
If the narrative ever becomes "Privy for identity, EnergyPay for settlement,
DeFindex for treasury," DPO2U disappears in the middle — that must not happen.

## 3. Phasing

- **Phase 1 (this spec):** EnergyPay + Privy + DPO2U → operator admission + signer
  governance + settlement admissibility. Attacks the most-alive pain in the repo
  (operator / roles / signing / authorization runtime / audit trail).
- **Phase 2:** + DeFindex → same governance that gates settlement also gates
  treasury/privileged action (reserve mgmt, rebalance, allocation).
- **Phase 3:** rail / asset mobility (CCTP-type) — only if value must circulate
  across counterparties/chains.

## 4. Feasibility (verified)

- **Privy supports Stellar** embedded wallets and exposes the underlying keypair
  for signing Stellar transactions. Signing a Soroban/settlement tx is signing a
  Stellar envelope — covered at keypair level. _Assumption to confirm in build:_
  Soroban-auth-entry signing ergonomics via Privy (vs. plain payment/tx-envelope).
- **EnergyPay** already has: Stellar mainnet settlement, JWT + operator-role
  validation, server-side signing for `PLATFORM_MANAGED` wallets (`wallet_modes`),
  `pending_roles` for privileged roles, receipts (txHash + ledger + memo), PLD
  snapshots pinned to settlement, Supabase audit trail.
- **DPO2U** already has: an off-chain policy gateway pattern (`DefindexPolicyGateway`
  in the dpo2u-stellar SDK) that reads an attestation/verdict and returns a
  structured allow/deny with an evidence hash; a compliance gateway/MCP; and a
  proof-bound execution gate validated live on testnet.

## 5. Phase-1 architecture — off-chain policy gateway

The DPO2U gate sits **in EnergyPay's backend, before it signs** (Approach 1).
No new Soroban contract in Phase 1; the on-chain gate is the Phase-2/DeFindex shape.

### Data flow

```
1. Operator authenticates into EnergyPay.
2. Identity + wallet + signer resolved via Privy (operator-held embedded wallet).
3. EnergyPay backend builds the settlement instruction (asset, amount, parties, memo).
4. EnergyPay backend calls the DPO2U admission gateway with the action payload.
5. DPO2U returns { decision: allow | deny | review, evidenceHash, expiresAt, reason }.
6a. deny  → backend refuses to sign; surfaced to operator; logged.
6b. review→ action parked in a review queue (reuses pending_roles semantics).
6c. allow → operator signs the settlement via Privy; backend submits to Stellar.
7. EnergyPay pins the DPO2U evidenceHash into the settlement receipt/memo
   (reusing the existing PLD-pin mechanism) → on-chain-anchored evidence trail.
```

### Components & interfaces (each unit: purpose · interface · depends on)

- **Privy operator wallet adapter** (EnergyPay frontend/edge)
  - _Purpose:_ authenticate the operator and obtain a Stellar signer bound to that
    operator's identity (embedded wallet, operator-held key).
  - _Interface:_ `getOperatorSigner(session) → { publicKey, signTransaction(xdr) }`.
  - _Depends on:_ Privy SDK (Stellar), EnergyPay auth/session.

- **DPO2U admission client** (EnergyPay backend)
  - _Purpose:_ ask DPO2U whether a built action is admissible, before signing.
  - _Interface:_ `admit(action) → { decision, evidenceHash, expiresAt, reason }`
    where `action = { operatorId, role, jurisdiction, instruction, threshold }`.
  - _Depends on:_ DPO2U gateway/MCP (reuse the `DefindexPolicyGateway` shape;
    a new `EnergyPaySettlementGateway` mirrors it for the settlement use case).

- **Settlement orchestrator** (EnergyPay backend)
  - _Purpose:_ sequence admit → sign → submit → pin-evidence; enforce fail-closed.
  - _Interface:_ `settle(action, signer) → { txHash, ledger, receipt, evidenceHash }`.
  - _Depends on:_ DPO2U admission client, Privy signer, `@stellar/stellar-sdk`,
    EnergyPay receipt/PLD-pin module, Supabase audit.

- **Evidence pin** (EnergyPay backend)
  - _Purpose:_ bind the DPO2U decision to the settlement so it is re-auditable.
  - _Interface:_ `pinEvidence(txMemo|receipt, evidenceHash)`.
  - _Depends on:_ existing PLD-pin path.

### Locked sub-decisions

1. **Privy = operator-held embedded wallet** (operator's own key, signs client/edge
   side). Stronger governance story than a custodial server wallet: the operator
   key is theirs, and DPO2U admission — not custody of the key — is what gates the
   action. (Server/delegated Privy wallets remain a fallback for `PLATFORM_MANAGED`
   flows that must stay custodial.)
2. **DPO2U evidence hash pinned to the settlement receipt/memo**, reusing the PLD-pin
   mechanism. The decision travels with the transaction, not in a side database only.

## 6. Error handling / fail-closed

- **deny / no decision / gateway unreachable** → backend does **not** sign. Fail
  closed is the correct posture for an admissibility gate.
- **review** → action parked (review queue, `pending_roles`-style), no signature
  until a human/secondary approval clears it.
- **expired evidence** (`now > expiresAt`) → re-admit before signing; never sign on
  a stale decision.
- **post-allow signature failure** (Privy) → no submission; logged; evidence not pinned.

## 7. Guard-rails (the three risks, made explicit)

1. **No big-bang.** Ship Phase 1 (3 layers) and validate real value before adding
   DeFindex. Do not launch the full stack as one product.
2. **DeFindex stays in Phase 2.** EnergyPay's live pain is operator/signer/
   governance/custody/audit — not sophisticated treasury strategy. Bringing
   DeFindex early solves a problem the customer doesn't yet feel as central.
3. **DPO2U must not disappear.** Every artifact and demo frames DPO2U as the
   decision layer ("all layers execute; DPO2U decides if they execute"), never as
   a passive compliance dashboard.

## 8. Commercial wedge — 6 bullets

1. EnergyPay is the **front door** — sell "institutional financial operation on
   Stellar," not "a stack of protocols."
2. **Operator identity is governed** (Privy): who is authorized, with which wallet,
   which signer, under which session.
3. **Execution is conditioned** (DPO2U): can this operator execute? is the role
   valid? does the threshold need review? is it within mandate? is the window open?
4. **Evidence is verifiable**: every settlement carries a DPO2U evidence hash pinned
   to the receipt — "who approved and why" travels with "the transaction happened."
5. **Depth on demand** (Phase 2): the same admission layer that gates settlement
   also gates treasury/privileged action via DeFindex — proof of depth, not the pitch.
6. **Institutional posture**: due diligence, partners, auditors, enterprise buyers
   get a runtime control plane, not a slide.

## 9. Out of scope (YAGNI for Phase 1)

- On-chain Soroban settlement gate (that is Phase 2's shape with DeFindex).
- DeFindex / treasury / vault integration.
- Cross-chain rail / CCTP / asset mobility.
- New custody/MPC infrastructure (Privy embedded wallet is the Phase-1 answer).
- Replacing EnergyPay's billing/identity/notification stack.

## 10. Success criteria (Phase 1)

- A settlement executes **only** after a DPO2U `allow`; a `deny` provably blocks the
  signature (fail-closed), observable in the audit trail.
- The operator signs via a Privy-held Stellar wallet bound to their identity.
- Each settled tx carries a DPO2U evidence hash pinned to its receipt/memo,
  re-auditable after the fact.
- Demo-able end to end on testnet, with the deny/allow contrast visible.

## 11. Open questions / assumptions to confirm in implementation

- Privy Soroban auth-entry signing ergonomics (vs. plain tx-envelope signing).
- The exact seam in EnergyPay's backend where signing happens today (to insert the
  `admit()` call before it) — confirm in `energypay-protocol-mainnet/backend`.
- Whether `pending_roles` semantics can be reused directly for the `review` queue.
- DPO2U use-case id + predicate set for "settlement admissibility" (new, mirrors
  `defindex_rebalance_v1`).
