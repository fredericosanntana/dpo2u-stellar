---
type: grant-plan
title: "SCF + Instawards Grant Application Plan"
version: 1.0
status: draft
date: 2026-05-13
source_prd: "DPO2U_PRD_Piloto_Anticorrupcao_v0.3.docx §17"
related: ["STELLAR37-ROADMAP.md", "SECURITY_AUDIT.md", "MONETIZATION.md", "GTM_PLAN.md"]
target_window: "2026-Q3 (post-mainnet)"
target_amount: "USD 100,000 – 250,000"
---

# SCF + INSTAWARDS GRANT APPLICATION

Plan for the Stellar Community Fund (SCF) and Instawards grant applications to fund DPO2U Anti-corruption Pilot post-mainnet expansion (audit + legal opinions + jurisdictional expansion + 12-month runway). Submission target window: **2026-Q3 post-mainnet**, gated by Stellar37° M8 deliverable.

> **What this document is**: the structured input the Chairman uses to assemble the actual application forms. The forms themselves go to SCF and Instawards portals, signed by Chairman + advogada parceira.

---

## 1. Story arc (1 paragraph elevator pitch)

> DPO2U operates **Verifiable Compliance Protocol** on Stellar Soroban: real-time compliance attestations registered on-chain so that external auditors verify decisions **without our cooperation**. Our MVP — the Anti-corruption Pilot for Brazilian municipal governments — went live on testnet in May 2026 during Stellar37°, with two production use cases (bank account change detection, payment document conformity) covering the TJDFT R$5.5M anchor case. We are requesting USD 100–250k to fund (a) external security audit pre-mainnet, (b) LGPD + GDPR + PIPEDA + CCPA legal opinions across our target jurisdictions (Brazil + Canada + EU + California), and (c) 12 months of operational runway to onboard the first 10 paying clients and reach USD 30k MRR self-sustainability.

## 2. Track record (mandatory section in SCF + Instawards)

### Built in 2 days during Stellar37° (2026-05-12 → 2026-05-13)
- 1 Soroban contract live on testnet (`CC4TJGDR…QRRZHM5`, 6709 bytes wasm, 4 functions exported per PRD §F1)
- 17 PRs across 2 public repos (`dpo2u-stellar`, `DPO2U`)
- 374+ unit tests new, 0 regression
- 1 trustless CLI ready for npm publish (`@dpo2u/stellar-sdk` exposing `dpo2u-attest verify`)
- F2 plane end-to-end: L1 REST + L2 MCP + L3 stellar-submitter + L4 contract + 11 real predicates (UC-1 + UC-2)
- Compliance: DPIA v0.1, threat model v0.1, LGPD Art. 18 erasure flow, Passkeys + SEP-30 multisig

### Pre-Stellar37° foundation (DPO2U platform, 4+ years)
- DPO2U Compliance MCP server: 17 jurisdictions covered (LGPD, GDPR, CCPA, PIPEDA, PIPA-KR, PDPA, POPIA, NDPA, ADGM, MICAR, Hiroshima ICOC, etc.)
- 14 Solana programs deployed on devnet (sister project — multi-chain capability proven)
- 70+ countries reachable via existing compliance stack
- Author of ERC-8004 spec, DAO governance paper 2024
- Frederico Santana — Mestre em Direito, Tecnologia e Inovação (FGV), DPO há 15 anos

## 3. Budget breakdown (USD)

Targeting the upper band (USD 250k) with line-item granularity. Application allows tiering — even if only partially funded, the audit + legal core (USD 50k) is the minimum viable.

### 3.1 Security audit (USD 30,000 – 50,000) — HIGHEST PRIORITY

External smart-contract + infrastructure audit covering the 3 surfaces in [`SECURITY_AUDIT.md`](SECURITY_AUDIT.md):
- Soroban contract
- MCP server (predicate engine, REST routes, oracles)
- WebAuthn + SEP-30 flow

Candidate firms: OtterSec, Halborn, Sec3, Trail of Bits, Statemind. Selection per [`SECURITY_AUDIT.md`](SECURITY_AUDIT.md) §6.

**Justification**: mainnet deployment (Stellar37° M7) is gated on this audit. Pilot revenue alone cannot fund it within timeline (Sprint L target).

### 3.2 Legal opinions — multi-jurisdiction (USD 10,000 – 20,000)

Customised LGPD compliance opinion for the pilot (Brazil): USD 4–6k via [`advogada partner`].

Equivalent opinions for:
- Canada PIPEDA — USD 3–5k (target a Toronto firm with privacy practice)
- EU GDPR — USD 3–5k (target a Berlin/Lisbon firm with DPIA experience)
- California CCPA — USD 0–4k (optional in this round; already covered in DPO2U platform stack)

**Justification**: design partner / subscription clients across jurisdictions need formal opinion that DPO2U is compliant in their territory. Generic compliance posture is insufficient for institutional sales.

### 3.3 Jurisdictional expansion (USD 40,000 – 60,000)

- **New predicate sets** for 2 use cases beyond UC-1 / UC-2 (USD 15–20k):
  - UC-3 candidate: licitação anti-direct (BR) — predicates verifying public procurement irregularities
  - UC-4 candidate: AML threshold detection (cross-border applicability)
- **OCR template packs** for 5 município templates (USD 10–15k) — accelerates onboarding speed
- **Translation + localisation** of CLI + docs to Portuguese + Spanish + English (USD 5–10k)
- **DPO2U Compliance MCP additions** to extend the predicate engine to non-municipal contexts (USD 10–15k)

### 3.4 Operating runway 12 months (USD 20,000 – 120,000)

- DPO2U engineer (Chairman ops 10h/sem during 90-day pilot post-mainnet, then 15h/sem expansion) — pro-rated against existing comp model
- DevOps infra: hosting + Stellar mainnet fees + monitoring (USD 100/mo × 12 = USD 1.2k)
- Conference / events: USD 20k (Web3 Brasil, Stellar Meridian, Devconnect)
- Advogada parceira retainer: USD 10–20k for 12 months of ongoing legal support
- Auditing surplus / unexpected: USD 5k buffer

**Target**: by month 12 post-mainnet, MRR ≥ USD 30k (per [`MONETIZATION.md`](MONETIZATION.md) §5) → self-sustainability without further grant funding.

### 3.5 Total

| Category | Floor (USD) | Ceiling (USD) |
|---|---|---|
| Security audit | 30,000 | 50,000 |
| Legal opinions | 10,000 | 20,000 |
| Jurisdictional expansion | 40,000 | 60,000 |
| Operating runway | 20,000 | 120,000 |
| **TOTAL** | **100,000** | **250,000** |

## 4. Milestones tied to funding tranches

Standard SCF structure: funding released in tranches, each tied to verifiable milestone.

| Tranche | Amount (USD) | Trigger | Verification |
|---|---|---|---|
| **T1 — kickoff** | 25% (25–62.5k) | Contract signed | n/a |
| **T2 — audit done** | 25% (25–62.5k) | Audit report PDF published with wasm hash match | Public PR + Sigstore signature |
| **T3 — mainnet live** | 25% (25–62.5k) | Mainnet contract deployed; 5 active wallets verified | Stellar Expert mainnet link + canary report |
| **T4 — paying clients** | 25% (25–62.5k) | ≥3 paying subscription clients OR USD 10k MRR | Public quarterly report |

Failure to reach any tranche pauses the rest. SCF policy: unspent tranches return to fund.

## 5. Ecosystem fit (mandatory SCF section)

Why this is a Stellar ecosystem investment, not just a portfolio company:

1. **Soroban-native by design**: not a port from another chain. The immutability-as-feature, the predicate-set-as-Symbol design, the FeeBump as a sustainability pattern — all leverage Stellar primitives.
2. **Demonstrates trustless verification primitive**: the `dpo2u-attest verify` CLI proves a high-value compliance assertion via `simulateTransaction` with zero auth, zero fee. This is a category-defining demo for what Soroban can do that Ethereum L2s + Solana cannot trivially replicate.
3. **Cross-pollinates with Reflector Network**: predicates can consume Reflector oracle feeds (CEIS/CNEP roadmap when published). When DPO2U is operational, we generate demand for new BR-specific Reflector feeds.
4. **Multi-jurisdiction template**: 17 jurisdictions covered by the existing DPO2U Compliance MCP create a path for **any** Stellar project to plug in compliance attestations (post-MVP roadmap §M2+).
5. **Adoption multiplier**: each município that signs a pilot generates ~5 referrals to other LatAm public-sector orgs. Web3 founders in our ICP §1 generate ~3 referrals to other LatAm founders. Network-effect potential strong.

## 6. Risk + mitigation (mandatory)

| Risk | Probability | Mitigation |
|---|---|---|
| Audit reveals critical findings requiring contract redesign | Low | Threat model + 374 tests pre-audit; mitigation budget within T2 |
| Mainnet adoption slower than projected | Medium | Design partner free tier accelerates; subscription gate ≥3 partners flexible |
| Brazilian regulatory landscape shifts (ANPD, BCB) | Low–Medium | 14-year DPO experience + advogada parceira monitoring; multi-jurisdiction approach diversifies risk |
| Stellar ecosystem changes (Soroban breaking changes) | Low | Contract is immutable post-deploy; v0.2 contract architecture absorbs future changes |
| Chairman bandwidth | Medium | Grant funds expand bandwidth; design partner free reduces sales urgency |

## 7. Application portals (logistics)

- **Stellar Community Fund**: https://communityfund.stellar.org — quarterly cycle, 3 rounds in 2026.
- **Instawards** (Stellar37° program tail) — application portal opens 2026-06-11 (M8 deadline).

Both applications use the same content base; format-specific tweaks per portal requirement. Application drafted in `docs/grant-drafts/` (Sprint M.x — pending portal release).

## 8. Status

- **2026-05-13**: this plan v1.0 committed (Stellar37° M8 prep)
- **2026-06-04**: M6 demos generate first case study material for application
- **2026-06-09**: mainnet live (M7) provides T3 evidence
- **2026-06-11**: Instawards application submitted (M8 deliverable)
- **2026-Q3**: SCF round 3 application submitted
- **2026-Q4**: T1 tranche received (if approved)

## 9. History

| Date | Author | Change |
|---|---|---|
| 2026-05-13 | Chairman | v1.0 — initial draft aligned with PRD v0.3 §17 for Stellar37° M8. |
