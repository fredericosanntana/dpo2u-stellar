---
type: business-model
title: "DPO2U Anti-corruption Pilot — Monetization Model"
version: 1.0
status: draft (commercial)
date: 2026-05-13
source_prd: "DPO2U_PRD_Piloto_Anticorrupcao_v0.3.docx §15"
related: ["GTM_PLAN.md", "X402_DECISION.md", "STELLAR37-ROADMAP.md"]
---

# MONETIZATION MODEL

How the DPO2U Anti-corruption Pilot generates revenue **without breaking the verifiable-compliance promise**. Three tiers (design partner / subscription / x402 future) with explicit activation gates and overlap rules.

> **Strategic positioning**: DPO2U is a **Verifiable Compliance Protocol category** (PRD v0.3 §15.2). We are not a RegTech vendor, not a legal services firm, not an internal-tooling supplier. Our durable moat is the **trustless verification primitive**: any third party can audit any decision without our cooperation. Pricing models that compromise that primitive (e.g., gated read access) are excluded.

---

## 1. Design Partner Tier (FREE, first 5–10 clients)

**Target**: 5 to 10 clients onboarded between M2 (2026-05-21) and M7 + 30 days (around mid-July 2026).

**Inclusion criteria**:
- Fits ICP per [GTM_PLAN.md](GTM_PLAN.md) §1.
- Commits to **case study cooperation** (logo + quote + structured interview) at month 3 and month 6.
- Commits to **monthly feedback call** (45 min, recorded) for the duration of the partnership.
- Commits to use the platform in **production traffic**, not just sandbox testing — at least 1 attestation per week.

**Compensation to DPO2U**:
- Zero cash.
- Logo + case study in marketing materials.
- Feedback that calibrates Sprint M roadmap, predicate weights, OCR template packs.
- Reference call to future paying customers when relevant.

**Duration**: 6 months from contract effective date.

**End of design partner period**:
- Auto-converts to **subscription tier** (§2) at month 7 unless either party signals discontinuation with 30-day notice.
- Conversion price is the **subscription tier price valid at the time of conversion** — early adopters lock in early pricing.

**Why free**:
1. **Reduces sales cycle to 0**. Design partners are sold on the **case study + feedback exchange**, not on price negotiation. We can onboard 5+ in M2/M6 window.
2. **Calibrates pricing**. The 6-month window generates the usage data we need to defensibly set subscription pricing (§2.3).
3. **Builds the network effect**. Each design partner produces 1 video case study + 1 written reference + 3 referrals (target). Pipeline for paying customers comes from this layer.
4. **Doesn't compromise mainnet operations**. Sponsored transactions cover fees; design partner volume is bounded.

**Limits**:
- Maximum 1,000 attestations/month per design partner (fair-use ceiling, soft-limit with notification).
- No 24/7 support obligation (best-effort 9x5 BRT).
- No bespoke jurisdictional expansion (BR + GDPR EU coverage stays as-is).

## 2. Subscription Tier (USD 500–2,000 / month)

**Activation gates** — ALL must be true to start charging:
1. Mainnet contract live (Stellar37° M7 done).
2. At least 30 days of post-mainnet operation with zero P0/P1 incidents.
3. At least 3 active design partners providing usage data to calibrate price.
4. **Chairman approve formal** to begin charging (PRD §15.1 explicit gate).

**Price calibration logic**:
- Floor (USD 500/mo): covers infrastructure cost per tenant + 20% margin. Suitable for low-volume design partners converting to paid.
- Ceiling (USD 2,000/mo): reflects the value delivered per the [ROI calculator](sales-pack/roi.md). For a município catching 1 TJDFT-scale incident per 3 years, that's R$5,5M → roughly R$50/atestação over the pilot, dwarfing the subscription cost.
- Price within the band per client: based on usage tier and jurisdictional coverage.

### 2.1 Tier structure (preliminary, calibrate from §1 data)

| Tier | Monthly | Attestations/mo | Use cases | Jurisdictions | SLA |
|---|---|---|---|---|---|
| **Starter** | USD 500 | up to 500 | UC-1 only | LGPD (BR) | 9x5 BRT |
| **Standard** | USD 1,000 | up to 2,000 | UC-1 + UC-2 | LGPD + GDPR | 9x5 BRT, 4h response |
| **Pro** | USD 2,000 | up to 10,000 | UC-1, UC-2, custom | LGPD + GDPR + PIPEDA | 24x5, 1h response |

Above Pro: custom enterprise contract (≥USD 10k/mo). Bespoke SLAs, dedicated infra, jurisdictional expansion (e.g., Mexico LFPDPPP, South Korea PIPA — leveraging DPO2U's existing 17-jurisdiction stack from MCP-server side).

### 2.2 What subscription INCLUDES

- Unlimited write attestations within tier ceiling.
- **Unlimited public READ access** (auditor CLI + Stellar Expert) — non-negotiable per the trustless promise.
- SLA per tier.
- Quarterly business review (Chairman + client lead).
- Software updates (predicate set bumps, new OCR templates, new oracle data sources).
- DPO2U eng support during major audits (TCE/TCU/CGU) — first 5 hours included per quarter.

### 2.3 What subscription does NOT include

- Custom predicate development beyond the 11 PRD-canonical predicates → bespoke contract.
- Jurisdictional expansion beyond the tier — bespoke contract.
- LGPD legal opinion for client's specific workflow — partnership with `[advogada partner]` (separate contract direct between client and partner).
- Bug bounty payouts to third parties who report vulnerabilities — funded out of DPO2U treasury, not from subscription revenue.

## 3. x402 Per-Request Tier (DEFERRED — gated, see [X402_DECISION.md](X402_DECISION.md))

x402 is **N/A for MVP**. Will be reconsidered when:
1. Post-mainnet ≥30 days stable.
2. ≥5 paying clients on subscription.
3. ≥2 of those clients independently request per-request pricing.
4. x402 ecosystem maturity signals (3+ production projects + maintained library).

If x402 activates, it slots in as an **alternative to subscription** for highly variable volumes. Subscription tier remains primary.

## 4. Custom Enterprise Tier (≥USD 10k / month)

For:
- Public-sector entities needing dedicated infrastructure (single-tenant deployment).
- Multi-national clients requiring jurisdictional coverage beyond Pro tier.
- Clients requiring bespoke OCR template packs or new use cases.

Procurement model: fixed-fee annual contract, paid quarterly. Onboarding fee USD 5–25k depending on scope (covers contract customization + on-site enablement).

Sales process: Chairman-led, 4–8 week cycle.

## 5. Revenue projection (2026 H2 / 2027 H1)

> **Caveat**: these are planning numbers, NOT promises. Will be replaced with actuals once subscription tier activates.

| Month | Design partners | Paying subs | MRR (USD) | Notes |
|---|---|---|---|---|
| 2026-06 (M7) | 5 | 0 | 0 | Mainnet go-live |
| 2026-07 | 6 | 0 | 0 | First design partners reach month-3 case studies |
| 2026-08 | 8 | 0 | 0 | Activation gate count opens (3 design partners ≥30d operation) |
| 2026-09 | 8 | 1 | 1,000 | First subscription converts; Chairman approve granted |
| 2026-10 | 9 | 2 | 2,000 | First case study published; pipeline accelerates |
| 2026-11 | 10 | 3 | 4,000 | One Pro tier conversion |
| 2026-12 | 10 | 4 | 5,000 | First custom enterprise contract closes |
| 2027-Q1 | 10 cap | 8 | 12,000 + 10k enterprise = 22,000 | 22k MRR — burn rate viable |
| 2027-Q2 | 10 cap | 12 | 18,000 + 25k enterprise = 43,000 | Scaling |

**Sustainability gate**: MRR ≥ USD 30k by 2027-Q2 to operate without further grant funding (per [GRANT_APPLICATION.md](GRANT_APPLICATION.md) §4 contingency).

## 6. Compliance + governance

- **Tax registration**: DPO2U Plataforma de Compliance LTDA (Brasil). Receita Federal CNPJ + ICP-Brasil for digital invoices.
- **Pricing currency**: USD billed (international clients) OR BRL converted at ptax-3-days-ago (Brazilian clients). No crypto-denominated subscription invoices in MVP.
- **Refund policy**: pro-rated refund within 30 days of contract start; no refunds after 30 days. Documented in standard terms.
- **Data residency**: per client jurisdiction (BR clients → BR / EU clients → EU). DPA enforces.

## 7. What we are NOT charging for (durable moat)

- **Reading the chain**: `dpo2u-attest verify <hash>` is and will remain free + open-source. Auditors, journalists, citizens never pay DPO2U a cent to verify a published decision. This is the **anti-RegTech moat**: we cannot extract rent from the audit primitive.
- **The contract source code**: Apache-2.0 license, anyone can fork and deploy. Our value is the **operational stack + jurisdictional coverage + audit reputation**, not the bytecode.
- **The predicate engine source code**: same logic — Apache-2.0 once published, currently in private repo `DPO2U` while pilot stabilises.

## 8. History

| Date | Author | Change |
|---|---|---|
| 2026-05-13 | Chairman | v1.0 — initial model aligned with PRD v0.3 §15. Subscription tier prices preliminary; calibrate from design partner data at month-3 reviews. |
