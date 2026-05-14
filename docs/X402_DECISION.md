---
type: decision-record
title: "x402 Integration — Decision: N/A for MVP"
version: 1.0
status: closed
date: 2026-05-13
source_prd: "DPO2U_PRD_Piloto_Anticorrupcao_v0.3.docx Q5 + §13.3"
related: ["MONETIZATION.md", "STELLAR37-ROADMAP.md"]
---

# X402 INTEGRATION — DECISION RECORD

**Question**: should the DPO2U Anti-corruption Pilot integrate the [x402 payment protocol](https://x402.org) for per-attestation pricing in the MVP?

**Decision**: **N/A for MVP**. x402 integration is deferred indefinitely behind an explicit reentry trigger.

**Status**: closed (PRD v0.3 §13.3 — Stellar37° milestone M3).

---

## Context

x402 is a recently announced HTTP-level payment protocol designed for per-request micro-billing on Stellar. The MVP needs a sustainable cost model for attestation submissions:

| Model | Description | MVP fit |
|---|---|---|
| **Sponsored transactions** (current) | DPO2U pays fees via `STELLAR_FEE_SPONSOR_SECRET`; clients (municípios / design partners) never hold XLM. | ✅ chosen |
| **x402 per-request** | Each REST call carries an HTTP 402 challenge → Stellar payment → response. | ❌ premature |
| **Subscription** | Monthly fee (USD 500–2k) covers unlimited attestations within a fair-use ceiling. | ✅ post-pilot ([MONETIZATION.md](MONETIZATION.md)) |

## Why N/A for MVP

1. **Adoption friction** — x402 requires clients to integrate a new HTTP payment flow + hold XLM. Municípios cannot custody crypto under current Brazilian regulatory framework (BCB / Receita Federal sandbox is opt-in, not default for municipal treasuries). Web3 founders (secondary ICP) can do it but expect dollar pricing.
2. **Pricing not yet validated** — x402 only adds value when a per-request price is well-calibrated. With zero paying customers, any number we set is a guess. PRD §15 explicitly says "subscription tier is calibrated post-pilot from 90-day usage data."
3. **Protocol maturity** — x402 is in early adoption. Reference implementations exist but integration patterns for high-value B2G/B2B flows are not yet established. The DPO2U pilot is **not the right venue for protocol exploration**; we serve municípios + design partners who need stability.
4. **Engineering bandwidth** — wiring x402 properly would consume ~2 sprints (server-side 402 challenge + client SDK + retry semantics + dispute flow). This is opportunity cost against UC-3 / UC-4 / mainnet readiness work.
5. **Stack diversification not yet warranted** — DPO2U already runs sponsored transactions reliably (G.1 stellar-submitter with FeeBump + fee cap + retry, 31 tests green). Adding x402 alongside doubles the surface to maintain without doubling capability.

## Reentry trigger

x402 integration **may** be reconsidered when **ALL** of the following are true:

1. **Post-mainnet stability**: mainnet contract deployed and operating for ≥30 days without P0/P1 incidents.
2. **≥5 paying clients**: subscription tier ([MONETIZATION.md](MONETIZATION.md) §2) has at least 5 paid contracts at USD 500–2k/month.
3. **Explicit demand**: at least 2 paying clients independently request per-request pricing instead of (or alongside) subscription, citing a use case where micro-billing makes sense (e.g., very high volume + variable usage).
4. **x402 maturity signals**: at least 3 production-grade Stellar projects shipped x402 with documented integration patterns AND there is at least 1 well-maintained server library (Node.js / Python) that handles 402 challenges idempotently.

When all four are satisfied, the Chairman reopens this decision via a new PR that:
- Updates this document with the reopen rationale + date.
- Schedules a Sprint M.x for x402 wiring.
- Adjusts [MONETIZATION.md](MONETIZATION.md) to add a third "per-request via x402" tier alongside subscription + design partner.

## What about clients who explicitly demand pay-per-use today?

Until the reentry trigger fires, clients with that requirement are politely declined for the MVP. We offer:

- **Design partner tier**: free for the first 6 months in exchange for case study cooperation.
- **Subscription tier** ([MONETIZATION.md](MONETIZATION.md) §2): predictable monthly fee.
- **Custom enterprise**: large fixed-fee contracts (≥USD 10k/mo) for clients who need bespoke SLAs or jurisdictional expansion.

Clients who **insist** on per-attestation pricing are filed in `docs/x402-interest-log.md` (Sprint K.x follow-up) so we can track demand toward trigger #3 above.

## Operational consequences of "N/A for MVP"

Code paths that **stay**:
- `STELLAR_FEE_SPONSOR_SECRET` (env var, [`.env.example`](../packages/mcp-server/.env.example))
- `feeCapPerUseCase` (Sprint G.1 — defends sponsor against runaway costs)
- Per-tenant rate limit (Sprint G.4 — defends sponsor against DoS)
- Fee depletion alert at 1000 XLM (RUNBOOK §1.2)

Code paths that **do NOT need to exist yet**:
- HTTP 402 challenge generation
- Client-side wallet integration
- Per-request charge ledger
- Dispute flow

## Disclosure

This decision is published in the repo and referenced in the PRD §13.3 + §15. If a client cites the absence of x402 as a deal-breaker, refer them to this document — the reasoning is institutional, not technical hesitancy.

## History

| Date | Author | Change |
|---|---|---|
| 2026-05-13 | Chairman | v1.0 — decision recorded as part of PRD v0.3 alignment (Stellar37° M3 deliverable). |
