---
type: gtm-plan
title: "DPO2U Anti-corruption Pilot — Go-to-Market Plan"
version: 1.0
status: in-execution (M2)
date: 2026-05-13
source_prd: "DPO2U_PRD_Piloto_Anticorrupcao_v0.3.docx §16"
related: ["sales-pack/", "MONETIZATION.md", "STELLAR37-ROADMAP.md"]
---

# GO-TO-MARKET PLAN

How DPO2U acquires the first 5–10 clients (design partners + early subscriptions) during the Stellar37° program window and the 90 days post-mainnet.

> **Strategic anchor**: the Sprint I sales-pack (already shipped — [`sales-pack/`](sales-pack/)) targets **municípios brasileiros**. PRD v0.3 §16 expands the ICP to include **Web3 founders LatAm** as the primary audience for the Stellar37° demo + showcase phase. Both tracks remain active; this document harmonises them.

---

## 1. ICP — Ideal Customer Profile

### 1.1 Primary: Web3 founders LatAm
- **Company stage**: pre-seed to Series A.
- **Domain**: any Web3 product with **compliance-sensitive operations** — DeFi protocol with LGPD/GDPR obligations, DAO with treasury attestation needs, NFT marketplace with KYC trail, RWA tokenization with audit requirements.
- **Geography**: Brazil, Argentina, Mexico, Colombia, Chile primarily. LatAm Spanish + Portuguese.
- **Buyer**: founder/co-founder, CTO, or Head of Compliance. Reaches us via Stellar37°, Superteam BR, or referral.
- **Pain**: "I need to prove compliance to investors / regulators / users WITHOUT building bespoke audit infrastructure."
- **Why they pay**: subscription is cheaper than building + maintaining their own.

### 1.2 Secondary: Brazilian municipal governments
- **Profile**: prefeitura municipal ≤ 50k habitantes, CGM ativa, gestão atual em primeiro mandato (reputational incentive maximised).
- **Buyer**: Prefeito + CGM-chefe + DPO designado (Art. 41 LGPD).
- **Pain**: TJDFT-pattern fraud risk + TCE fiscalization friction.
- **Sales-pack already shipped**: [`sales-pack/overview.md`](sales-pack/overview.md) + [`sales-pack/roi.md`](sales-pack/roi.md) + [`sales-pack/pilot-terms.md`](sales-pack/pilot-terms.md).
- **Why they pay** (post-pilot): subscription replaces ad-hoc consultoria forense that TCE often demands.

### 1.3 Tertiary: ONGs e instituições filantrópicas brasileiras
- **Profile**: organizações ≥ R$ 1M arrecadação anual sujeitas a auditoria pública.
- **Buyer**: Diretor financeiro + DPO.
- **Pain**: doadores institucionais (BNDES, fundações) exigem auditoria de processo de uso de recursos.
- **Volume estimate**: smaller than ICP primary/secondary, but politically strategic (DPO2U mission alignment).

## 2. Demo Protocol (Stellar37° M6)

Standardized 45-minute screen-share session with each qualified prospect. **Recorded** (consent obtained at booking) for follow-up + sales enablement library.

### 2.1 Agenda

| Time | Section | Owner |
|---|---|---|
| 0–5 min | Welcome + context | Chairman |
| 5–20 min | Live demo round-trip (UC-1 + auditor CLI) | DPO2U eng |
| 20–35 min | Q&A — anticipated objections (§3) | Chairman + DPO2U eng |
| 35–45 min | Next-step discussion: design partner vs subscription vs no-go | Chairman |

### 2.2 Live demo round-trip (15 min — the technical core)

1. **Setup screen** (1 min): show `https://stellar.expert/explorer/testnet/contract/CC4TJGDR…QRRZHM5` + the project README in another tab.
2. **Submit attestation** (3 min): use `curl` to POST a UC-1 payload (synthetic data prepared per prospect). Show the 202 response.
3. **Worker fires** (2 min): show the MCP logs in real-time — predicates running, hashes computed.
4. **Webhook callback** (2 min): show the HMAC-signed callback hitting a Beeceptor URL.
5. **Stellar Expert** (2 min): refresh; show the new `attest` event on-chain.
6. **Auditor CLI** (3 min): in a different terminal (representing third-party auditor), run `dpo2u-attest verify bank_change_v1 <hash>`. Same verdict shows. **Auditor never touched DPO2U or the município.**
7. **Erasure** (2 min): if time permits, show `POST /api/v1/attestation/erasure-request` and the resulting `erasure_v1` attestation on-chain.

### 2.3 Q&A — anticipated objections (15 min)

Per-prospect customisation; baseline set:

- **"Why blockchain?"** → [`sales-pack/overview.md`](sales-pack/overview.md) §"Por que blockchain". Independent audit without our cooperation is the unique property.
- **"LGPD compliance?"** → [`DPIA-Piloto-Anticorrupcao-v0.1.md`](DPIA-Piloto-Anticorrupcao-v0.1.md). Hashes on-chain, not PII.
- **"What if x402 / payment infra changes?"** → [`X402_DECISION.md`](X402_DECISION.md). Sponsored model is durable.
- **"Migration cost?"** → API-shaped integration via REST + webhook. We do not require client to change their existing system financial system.
- **"Lock-in risk?"** → Apache-2.0 license + open contract + open SDK. Client can fork and self-host if they want; we offer operational stack as the value.
- **"Pricing?"** → [`MONETIZATION.md`](MONETIZATION.md). Design partner free + subscription USD 500–2k post-mainnet.

### 2.4 Next-step decision tree

| Prospect signal | Path |
|---|---|
| Strong interest + budget within 30 days | Custom enterprise contract; Chairman leads |
| Strong interest + no budget yet | Design partner offer; 6-month free → conversion |
| Interest but pricing concern | Subscription tier with month-1 free trial |
| Tepid interest | Schedule 60-day follow-up; add to nurture sequence |
| No fit | Polite decline; refer to ecosystem (Superteam BR, etc.) if useful |

## 3. Sales pipeline structure

### 3.1 Lead sources (priority order)
1. **Stellar37° program** — direct referrals from program officers + co-cohort founders. Highest fit/intent.
2. **Superteam Brasil** — Pedro Marafiotti network + chapter events.
3. **Stellar Development Foundation** — bizdev intros (separate from Stellar37°).
4. **LinkedIn outbound** — Chairman targeted on founders matching ICP §1.1.
5. **Content marketing** — DPO2U technical blog posts + case studies once design partners produce them.
6. **Conference / event** — pre-allocated USD 20k from grant (per [GRANT_APPLICATION.md](GRANT_APPLICATION.md)) for 1–2 events 2026-H2.

### 3.2 Sales cycle stages

```
LEAD → QUALIFIED CALL → DEMO → DESIGN PARTNER LOI → CONTRACT → ONBOARDED
  ↓         ↓               ↓          ↓                   ↓         ↓
 nurture  outright pass   nurture   schedule M+1     legal review  case study
```

Stage gates:
- **LEAD → QUALIFIED**: 30 min discovery, ICP fit confirmed, decision-maker identified.
- **QUALIFIED → DEMO**: M6 protocol (§2).
- **DEMO → LOI**: prospect signs design partner LoI per template in [`sales-pack/pilot-terms.md`](sales-pack/pilot-terms.md).
- **LOI → CONTRACT**: 14-day customisation (DPIA + Threat Model + DPA) per município or per Web3 founder.
- **CONTRACT → ONBOARDED**: technical integration call + first attestation in production.

### 3.3 Targets — 90 days post-mainnet (M7+90 ≈ 2026-09-09)

| Stage | Target count | Sources |
|---|---|---|
| Leads | 60 | Pipeline §3.1 |
| Qualified calls | 30 | 50% conversion from lead |
| Demos | 20 | 67% conversion from qualified |
| LoIs signed | 10 | 50% conversion from demo |
| Contracts onboarded | 6–8 | 60–80% conversion from LoI |
| Of which subscriptions converted by month 7 | 3–4 | per [MONETIZATION.md](MONETIZATION.md) §5 |

## 4. 90-day post-mainnet traction goals

| Metric | Target by 2026-09-09 |
|---|---|
| Active design partners | 5–10 |
| Atestações on-chain mainnet | ≥ 5,000 |
| Independent verifications by P4/P5 personas (auditor + journalist) | ≥ 50 distinct queries via Stellar Expert + CLI |
| Case studies published | 2 (one município + one Web3 founder) |
| Subscription conversions | 1+ (activation gate hit) |
| Press coverage | 2 articles (Brazilian tech press + Stellar ecosystem blog) |
| GitHub stars on `dpo2u-stellar` | 100+ |
| npm downloads of `@dpo2u/stellar-sdk` | 500+ |

## 5. Brand & narrative

### 5.1 Positioning statement
> DPO2U is the **Verifiable Compliance Protocol** for organisations that need to prove compliance trustlessly. Our deployed Soroban contract registers PASS/FAIL/REVIEW verdicts produced by deterministic off-chain predicates, so external auditors verify decisions without our cooperation. We are *compliance-as-protocol*, not compliance-as-PDF.

### 5.2 Three taglines (test which resonates)
1. "Compliance is a protocol, not a PDF." (current — used in [`sales-pack/overview.md`](sales-pack/overview.md))
2. "Audit yourself. Then let anyone else audit too."
3. "The same hash. The same verdict. Forever."

Track which tagline lead-source attributes; iterate after M6 demos.

### 5.3 Content roadmap

| Month | Content piece | Channel | Author |
|---|---|---|---|
| 2026-06 (M7 + week) | "We deployed our first Soroban contract during Stellar37°" | DPO2U blog + LinkedIn | Chairman |
| 2026-07 | "Design partner spotlight #1" | DPO2U blog | Chairman + DP1 |
| 2026-08 | "How LGPD Art. 18 works when the contract is immutable" | technical deep-dive | DPO2U eng |
| 2026-09 | "90-day pilot retrospective" | blog + Stellar dev portal | Chairman |
| 2026-10 | "Multi-jurisdiction compliance via predicate sets" | tech blog | DPO2U eng |

## 6. Operational hooks

- **CRM**: lightweight — track in `docs/sales/pipeline.json` (Sprint M.x). Mistake to over-tool early.
- **Booking calendar**: Cal.com link for 30 min discovery + 45 min demo.
- **Demo environment**: testnet contract + scripted prospect-specific evidence + canned slack-style log viewer.
- **Follow-up cadence**: D+1 (recap email + recording link), D+7 (technical deep-dive if requested), D+30 (case study or check-in).

## 7. What we will NOT do

- **Cold email mass sequences**: ICP is too narrow + reputational cost of spam.
- **Paid ads** before M7: efficient channel-fit unproven; budget conserved for events.
- **White-label / OEM**: distorts the trustless-verification primitive (third parties can't tell who actually operates the contract).
- **Discounting below USD 500/mo for subscription**: undermines the value frame.
- **Pre-mainnet free trials**: contract isn't on mainnet yet; offering "production" without it is a misrepresentation. Design partner = free on **testnet** + auto-convert to subscription post-mainnet.

## 8. History

| Date | Author | Change |
|---|---|---|
| 2026-05-13 | Chairman | v1.0 — initial GTM plan aligned with PRD v0.3 §16 + Sprint I sales-pack harmonised. |
