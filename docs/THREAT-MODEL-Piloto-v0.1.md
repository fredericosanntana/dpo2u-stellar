---
type: threat-model
title: "Threat Model — Piloto Anticorrupção (STRIDE-light v0.1)"
version: 0.1
status: draft
date: 2026-05-12
related: ["DPIA-Piloto-Anticorrupcao-v0.1.md"]
---

# THREAT MODEL — PILOTO ANTICORRUPÇÃO (STRIDE-LIGHT v0.1)

**Status**: v0.1 — draft institucional, **não validado externamente**. Workshop formal de 2h com DPO município + IT município + DPO2U eng + advogada parceira fica pra Sprint K, produzindo v1.0.

**Método**: STRIDE-light (Spoofing / Tampering / Repudiation / Info disclosure / DoS / Elevation of privilege). Sem CVSS por enquanto — qualitativo H/M/L em probabilidade × impacto.

---

## 1. System diagram (text)

```
                                     ┌─ Cidadão / Jornalista (P5) ──┐
                                     │  npm i -g @dpo2u/stellar-sdk │
                                     │  dpo2u-attest verify …       │  read-only,
                                     └────────────┬─────────────────┘  no auth
                                                  ▼
┌─ Município (Controlador) ────────────────┐    Stellar
│                                          │    Soroban
│  CGM (P1)   Operator (P2)   IT (P3)      │    testnet/mainnet
│  ───────    ──────────      ──────       │     ▲    ▲    ▲
│   alerts     submits          ops        │     │    │    │
│      │           │              │        │     │    │    │
│      └────┬──────┴──────────────┘        │     │    │    │
│           ▼                              │     │    │    │
│  Sistema financeiro municipal            │     │    │    │
│  (SIAFI / próprio)                       │     │    │    │
└───────────┬──────────────────────────────┘     │    │    │
            │                                    │    │    │
            │ POST /api/v1/attestation/submit    │    │    │
            │   (TLS + API key + opt mTLS)       │    │    │
            ▼                                    │    │    │
┌─ DPO2U-MCP (Operador, VPS) ──────────────┐     │    │    │
│  L1 REST  → validate                     │     │    │    │
│  L2 MCP   → predicate engine             │     │    │    │
│              (CNPJ, BCB, CEIS/CNEP)──────┼─────┘    │    │
│  L3 Stellar Submitter ───────────────────┼──────────┘    │
│  L1 reverse webhook (HMAC) ◀─── callback │               │
└────┬──────────────────────────────────────┘               │
     │                                                      │
     ▼ External auditor (P4 — TCE/TCU/CGU) ─────────────────┘
       Stellar Expert + Soroban RPC simulate
```

**Trust boundaries (TB)**:
- TB1: client (município) ↔ DPO2U-MCP (TLS + API key + future mTLS)
- TB2: DPO2U-MCP ↔ Stellar Soroban RPC (TLS, no auth — public)
- TB3: DPO2U-MCP ↔ brasilapi.com.br / BCB CSV / portaltransparencia.gov.br (TLS, no auth)
- TB4: DPO2U-MCP ↔ Reflector oracle (Sprint J.3 — TLS, signature verified)
- TB5: DPO2U process ↔ on-disk secrets (`.env`, fee-sponsor private key)
- TB6: DPO2U-MCP ↔ Postgres (Sprint K) — local socket

## 2. Assets

| ID | Asset | Confidentiality | Integrity | Availability | Notes |
|---|---|---|---|---|---|
| A1 | Stellar **issuer** private key (submitter, whitelisted on-chain) | **Critical** | **Critical** | Medium | Storage off-chain; rotation playbook in RUNBOOK |
| A2 | Stellar **fee_sponsor** private key | **Critical** | **Critical** | High | Multisig 2-of-3 (Sprint L) — Chairman + co-founder + DPO2U safe |
| A3 | `WEBHOOK_SIGNING_KEY` HMAC secret | **High** | **Critical** | Low | Per-tenant in postgres (Sprint K) |
| A4 | API keys per municipal tenant | High | **Critical** | Medium | Per-tenant scope |
| A5 | Evidence payload (off-chain) — contains PII | **Critical** | High | Medium | Encrypted at rest; 90d retention |
| A6 | AttestationAttempt state (in-process / Sprint K postgres) | Low (PII-free) | High | Medium | Idempotency depends on integrity |
| A7 | Predicate engine source code | Low | **High** | Medium | Audit trail of `predicate_set@version` is on-chain |
| A8 | BCB regulated banks snapshot | Low | High | Low | Stale list ≠ adversarial |

## 3. Trust assumptions (explicit)

| # | Assumption | If violated |
|---|---|---|
| TA1 | DPO2U engineers handling the issuer key are non-malicious | Submitter can register false PASS for a paid-off pattern — mitigated by per-attestation events being publicly observable; CGM can detect anomalies post-facto |
| TA2 | Município intake channel (portal/email) is correctly authenticating its own officers (Passkeys SEP-30 in Sprint K) | A spoofed intake can submit fraudulent evidence — predicates p1_1 + p1_2 are exactly the FAIL pathway for this case |
| TA3 | Stellar testnet/mainnet has > 33% honest validator majority | Beyond our control; same trust model as any Stellar consumer |
| TA4 | brasilapi.com.br returns correct Receita Federal data | Treated as best-effort; predicate p1_1 gracefully degrades to structural CNPJ match on API failure (FAIL only on adversarial signal, never on integration error) |
| TA5 | Reflector / DPO2U-owned oracle correctly publishes CEIS/CNEP snapshot | Mitigated by 24h freshness check (predicate REVIEWs if stale) + dual-oracle option (Reflector primary, DPO2U fallback) |

## 4. Threat scenarios

### T1 — Spoofing: fraudulent submission via stolen API key
- **Adversary**: insider at município OR external attacker who phished API key.
- **Pre-condition**: TB1 boundary compromised.
- **Attack**: POST `/api/v1/attestation/submit` with forged evidence claiming `verdict=PASS` for a TJDFT-pattern payment.
- **Mitigation**:
  - Predicates evaluate evidence server-side, NOT honor client-supplied verdict.
  - Per-tenant rate-limit (Sprint K).
  - API key rotation playbook + Statuspage anomaly alerts.
- **Residual risk**: Low — attacker controls input but not evaluation.

### T2 — Tampering: replay attestation with modified evidence
- **Adversary**: MITM between município and DPO2U-MCP.
- **Pre-condition**: TLS broken OR TB1 compromised.
- **Attack**: intercept POST, alter `evidence` payload to make a FAIL look like PASS.
- **Mitigation**:
  - TLS 1.3 with strong cipher suites.
  - HSTS + future cert pinning at município SDK (Sprint K).
  - **Evidence hash is computed server-side** by the MCP tool BEFORE the predicates run — caller cannot pre-stage a different hash.
- **Residual risk**: Low.

### T3 — Repudiation: município claims it never submitted X
- **Adversary**: município itself (or a rogue operator inside it).
- **Pre-condition**: dispute arises post-facto.
- **Attack**: deny having authorised a payment after the fact.
- **Mitigation**:
  - Every submission emits an on-chain `attest` event with the submitter's whitelisted address + ledger sequence + timestamp.
  - HMAC-signed callback (`x-dpo2u-signature: sha256=<hex>`) gives município a non-repudiable receipt.
  - Logs are timestamped, signed, and exported to immutable storage daily (Sprint K).
- **Residual risk**: Very low — repudiation requires colluding with the Stellar network majority.

### T4 — Information disclosure: leak of evidence payload
- **Adversary**: DPO2U-side breach OR insider with disk access.
- **Pre-condition**: TB5 or TB6 compromised.
- **Attack**: read raw evidence files containing PII (CPF, NF photos, etc.).
- **Mitigation**:
  - AES-256 encryption at rest with key in HSM (Sprint K).
  - 90-day retention then secure-erase.
  - Off-chain payloads NEVER leave the issuer's data plane — no remote backup containing PII.
  - On-chain stores only SHA-256(payload), not the payload — chain breach reveals 0 PII.
- **Residual risk**: Low (issuer breach) / Mínimum (chain breach).

### T5 — DoS: flood `/api/v1/attestation/submit` to exhaust fee_sponsor
- **Adversary**: external attacker OR competitor.
- **Pre-condition**: API endpoint reachable.
- **Attack**: spam submissions to drain the fee_sponsor account.
- **Mitigation**:
  - Per-tenant rate-limit (default 100/min, Sprint K).
  - Per-use_case fee cap in stellar-submitter (`feeCapPerUseCase`) — runaway resource estimate cannot drain treasury.
  - Statuspage alert when `fee_sponsor` balance < 1000 XLM.
- **Residual risk**: Low — limited to financial impact, not service outage of the audit trail.

### T6 — Elevation of privilege: take over `Admin` role on contract
- **Adversary**: any attacker.
- **Pre-condition**: A1 (issuer key) compromised AND issuer is also the Admin (current testnet setup).
- **Attack**: call `authorize_submitter(self, true)` from a new address; submit fraudulent attestations.
- **Mitigation**:
  - **Sprint L**: separate Admin key from submitter key. Admin held in hardware wallet, requires multisig.
  - On-chain `auth` event is publicly observable — any new submitter added would be flagged by Statuspage monitor within 1 minute.
  - Contract is **immutable** (no `__upgrade__`) — attacker cannot rewrite logic.
- **Residual risk** (testnet): Medium — single-key model. (mainnet): Low.

### T7 — Storage rent expiry: attestation evicted from Soroban state
- **Adversary**: none — this is an availability concern, not adversarial.
- **Pre-condition**: contract data not extended.
- **Attack**: N/A; risk is operational neglect.
- **Mitigation**:
  - Quarterly cron `extend_ttl` batch script (RUNBOOK).
  - Statuspage alert when any attestation has < 30 days of rent.
  - Audit log of every TTL bump.
- **Residual risk**: Low.

### T8 — Oracle stale: CEIS/CNEP list out of date when fraud check needed
- **Adversary**: time + network unreliability.
- **Pre-condition**: Reflector down for > 24h AND DPO2U oracle cron failed.
- **Attack**: not adversarial — predicate p2_6 must NOT accidentally clear a fraudulent supplier.
- **Mitigation**:
  - Predicate p2_6 returns REVIEW when `list_age_hours > 24`.
  - Dual-source (Reflector + DPO2U) with both publishing on-chain attestations of their list hash.
  - PagerDuty page when EITHER source > 12h stale.
- **Residual risk**: Mínimum — REVIEW outcome routes to human CGM for manual check.

## 5. Per-asset controls matrix

| Asset | Spoof | Tamper | Repud | InfoDisc | DoS | EoP |
|---|---|---|---|---|---|---|
| A1 issuer key | mTLS + key-in-HSM | HSM | event log | HSM | rate-limit | multisig (L) |
| A2 fee sponsor | multisig | multisig | event log | HSM | cap + alert | multisig |
| A3 webhook secret | per-tenant | per-tenant | event log | encrypted | — | per-tenant rotation |
| A4 API key | rotation | hash + per-tenant | per-tenant log | hash | rate-limit | per-tenant scope |
| A5 evidence payload (off-chain) | API auth | AES-256 | log | retention | rate-limit | RBAC |
| A6 attempt state | — | postgres tx | log | PII-free | — | RBAC |
| A7 predicate code | git signed | git signed | git log | open source | — | review gate |
| A8 BCB snapshot | — | hash | log | open | — | — |

## 6. Open items for Sprint K workshop

- [ ] CVSS scoring per scenario (currently qualitative)
- [ ] mTLS certificate model — who issues, who rotates
- [ ] Passkey SEP-30 attestation flow walk-through with DPO município
- [ ] Postgres encryption-at-rest validation (LUKS at host OR pgcrypto at column)
- [ ] Statuspage alert routing (PagerDuty primary, email secondary)
- [ ] Tabletop exercise: T1 + T6 simulated incident response

## 7. Verification — automated controls

| Threat | Test that asserts mitigation works | Sprint |
|---|---|---|
| T1 (spoofed submission honored verdict) | `submit-public-attestation.test.ts` — predicates evaluate evidence server-side; verdict NOT honored from body | G.2 |
| T2 (tampered hash) | `submit-public-attestation.test.ts` — canonical JSON + server-side SHA-256 | G.2 |
| T3 (repudiation) | `attestation-routes.test.ts` — HMAC sign+verify round-trip | G.4 |
| T4 (info disclosure on-chain) | DPIA §3.3 + contract code review: only hashes + non-PII fields | F1 |
| T5 (fee cap) | `feeCap.test.ts` — over-budget rejected | G.1 |
| T6 (admin role) | Sprint L hardware wallet ceremony | L |
| T7 (rent) | Sprint L RUNBOOK + cron | L |
| T8 (stale oracle) | `predicates-payment_doc_v1.test.ts` — REVIEW on `list_age > 24h` | J.1 |

## 8. Histórico de versões

| Versão | Data | Mudança |
|---|---|---|
| 0.1 | 2026-05-12 | Draft pré-município. STRIDE-light coverage de T1–T8. |
| 1.0 | _Sprint K_ | Workshop formal: CVSS, mTLS, tabletop, assinaturas. |
| 1.x | _Sprint L_ | Refinamento pós-audit externo. |
