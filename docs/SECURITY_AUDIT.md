---
type: security-plan
title: "Security Audit Framework — DPO2U Anti-corruption Pilot"
version: 1.0
status: pre-engagement
date: 2026-05-13
source_prd: "DPO2U_PRD_Piloto_Anticorrupcao_v0.3.docx §14"
related: ["THREAT-MODEL-Piloto-v0.1.md", "RUNBOOK.md", "MAINNET-CEREMONY.md", "STELLAR37-ROADMAP.md"]
---

# SECURITY AUDIT FRAMEWORK

External security audit of the DPO2U Anti-corruption Pilot, gating Stellar37° M5 and the M7 mainnet deploy. This document is the **scope statement** the chosen firm receives — not the audit report itself (that will be archived as `docs/AUDIT-{firm}-{date}.pdf` post-completion).

---

## 1. Goals

1. **Validate that the deployed Soroban contract** (`CC4TJGDR…QRRZHM5`) does what the threat model says it does. No on-chain backdoors, no privilege escalation paths beyond the explicit admin role, no storage exhaustion vectors.
2. **Validate the MCP server's invariants** — predicate determinism, oracle failover, secure-erase ordering, idempotency keying.
3. **Validate the WebAuthn + SEP-30 flow** — replay defence, sign-count monotonicity, multisig threshold correctness, recovery edge cases.
4. **Produce a public report** — findings + mitigations + residuals, attached to the repo for transparency.
5. **Document 1 critical vulnerability** if found (PRD v0.3 §14 explicit deliverable — the audit must demonstrate it found *something*, even if non-blocking).

## 2. Surfaces

### 2.1 Soroban contract (Surface A)

**Scope**:
- [`contracts/anticorruption-attestation/src/lib.rs`](../contracts/anticorruption-attestation/src/lib.rs) — 5 instructions + DataKey storage layout.
- Build reproducibility: same source → same wasm hash (CI-enforced).
- `Cargo.toml` dependency tree (soroban-sdk pinned version).

**Threat vectors to verify** (from [THREAT-MODEL-Piloto-v0.1.md](THREAT-MODEL-Piloto-v0.1.md)):
- T1 spoofing — submitter authorization check (`Authorized(submitter)` map lookup) cannot be bypassed.
- T2 tampering — evidence_hash uniqueness within use_case_id (no key collision via DataKey aliasing).
- T6 admin EoP — admin role cannot be transferred or re-initialized post-deploy; `AlreadyInitialized` error wired correctly.
- T7 storage rent — TTL behaviour under load + extend pattern.

**Specific Soroban-isms** (additional to the threat model):
- `panic_with_error!` exhaustiveness — no implicit panics that would leak error info to the client.
- Symbol vs String — `use_case_id` constraint to 32 ASCII chars enforced.
- `BytesN<32>` deserialization — no off-by-one on hash inputs.
- No `unsafe` blocks in the contract crate.

### 2.2 MCP server (Surface B)

**Scope**:
- [`packages/mcp-server/src/predicates/`](../../DPO2U/packages/mcp-server/src/predicates/) — engine + 3 sets + 3 integrations + OCR pipeline.
- [`packages/mcp-server/src/routes/`](../../DPO2U/packages/mcp-server/src/routes/) — attestation + erasure REST endpoints.
- [`packages/mcp-server/src/erasure/secure-erase.ts`](../../DPO2U/packages/mcp-server/src/erasure/secure-erase.ts) — secure-erase invariant.
- [`packages/stellar-submitter/`](../../DPO2U/packages/stellar-submitter/) — L3 submitter (fee cap + retry classification).
- [`packages/mcp-server/src/boot/wire-attestation.ts`](../../DPO2U/packages/mcp-server/src/boot/wire-attestation.ts) — boot factory.

**Threat vectors to verify**:
- T2 tampering — canonical JSON serialisation produces stable hash across input orderings (G.2 test asserts this; auditor verifies algebraic property).
- T3 repudiation — HMAC reverse-webhook signature verification is constant-time.
- T4 info disclosure — predicate REVIEW reasons do NOT leak raw evidence fields (PII safety smoke test).
- T5 DoS — `feeCapPerUseCase` rejects runaway resource estimates; rate-limit per tenant.
- T8 stale oracle — REVIEW path triggers correctly; no silent fallback to "PASS" with stale data.

**Specific server-isms**:
- Erasure flow §1.7 invariant — secure-erase failure MUST prevent on-chain submit (regression-tested).
- Idempotency — same `request_id` produces same `attempt_id` (regression-tested); deduplication of `evidence_hash` collisions.
- Predicate engine determinism — no `Date.now()` or `Math.random()` leaks into predicate verdict (only into metadata.timestamp).
- TypeScript strict mode adherence in the audited modules.

### 2.3 WebAuthn + SEP-30 (Surface C)

**Scope**:
- [`packages/mcp-server/src/auth/passkey/`](../../DPO2U/packages/mcp-server/src/auth/passkey/) — ceremonies + store + SEP-30.

**Threat vectors to verify**:
- **Challenge replay**: `consumeChallenge` is atomic single-use.
- **Sign-count replay**: monotonicity enforced; exception for 0=0 (no-counter authenticators) is bounded.
- **User binding**: challenge issued for user A cannot complete for user B (`user_mismatch`).
- **Credential binding**: when `beginAuthentication` restricts to a credential_id, completion with a different one is rejected.
- **SEP-30 topology**: thresholds 2/2/2 + 3 cosigners weight 1 = exactly 2-of-3. Auditor verifies the typed `Operations` array against the spec, not just the description.

## 3. Methodology

The audit firm has discretion over methodology. Expected:
- **Manual code review** of all listed files.
- **Threat modelling validation** — re-derive the threat model from code; compare to [`THREAT-MODEL-Piloto-v0.1.md`](THREAT-MODEL-Piloto-v0.1.md). Disagreements are findings.
- **Differential analysis** vs Soroban best-practices (`require_auth` placement, storage usage, host function safety).
- **Property-based testing** opportunistically (fuzz the contract instruction set if firm has tooling).
- **Threat scenario walk-through** with DPO2U engineer (1h session) covering each T1–T8.

The firm does **not** need to penetration-test live infrastructure. Bug bounty for production code is a Sprint M concern.

## 4. Deliverables

### 4.1 Audit report PDF

Archived at `docs/AUDIT-{firm}-{YYYY-MM-DD}.pdf`. Structure:
1. Executive summary (1 page)
2. Methodology
3. Findings by severity (Critical / High / Medium / Low / Informational)
4. Each finding: ID / surface / description / impact / recommendation / DPO2U response
5. **Wasm hash of the audited build** (this binds the report to a specific compiled artifact — `deploy-mainnet.sh` enforces match via `EXPECTED_WASM_HASH`)
6. Methodology notes (tools used, time spent)
7. Statement of independence (no shared equity with DPO2U)

### 4.2 At least 1 critical vulnerability documented

Per PRD v0.3 §14 — the audit MUST demonstrate it actually probed the surfaces. If no critical is found, the firm documents 1 "would have been critical if" hypothetical scenario based on the threat model — this satisfies the deliverable requirement and gives institutional evidence of audit depth.

### 4.3 Mitigation commits

For each Critical / High finding, a DPO2U engineer creates a PR mitigating it BEFORE the report is publicised. The audit report includes the post-mitigation commit hash. Findings closed mid-audit get a `[mitigated in commit X]` annotation.

## 5. Findings classification

| Severity | Definition | Required action before M7 mainnet |
|---|---|---|
| **Critical** | Direct fund/data loss path OR contract permanent breakage | **Must mitigate**. Re-audit specific commit. |
| **High** | Authentication bypass OR predicate determinism breakage OR LGPD principle violation | **Must mitigate** OR documented residual with risk acceptance signed by Chairman + advogada. |
| **Medium** | Operational fragility OR partial info disclosure OR DoS amplification | Mitigate OR document residual. |
| **Low** | Code quality, error message clarity, missed best practices | Document residual in `docs/audit-residuals.md`. |
| **Informational** | Suggestions, defensive coding ideas | Discretion. |

## 6. Candidate firms

Per PRD v0.3 §17.3 + Sprint L [`RUNBOOK.md`](RUNBOOK.md):

| Firm | Specialty | Cost estimate USD | Soroban prior work |
|---|---|---|---|
| **OtterSec** | Solana, Soroban, Ethereum | 30–45k | ✅ audited Reflector Network |
| **Halborn** | Multi-chain, infrastructure | 35–50k | ✅ multiple Stellar projects |
| **Sec3** | Solana-focused, expanding | 25–40k | Limited Soroban experience |
| **Trail of Bits** | Top-tier multi-chain | 50–80k | Some Stellar work |
| **Statemind** | Smart contracts, infra | 30–45k | Strong Soroban portfolio |

**Selection criteria**:
1. Soroban-specific experience (auditor familiar with host functions + storage rent + Contract trait).
2. Availability within the Stellar37° timeline (kickoff by M5 deadline 2026-05-30).
3. Public reports of comparable scope (Reflector, Soroswap, etc).
4. Cost within USD 30–50k budget envelope (per [GRANT_APPLICATION.md](GRANT_APPLICATION.md)).
5. No conflict of interest (no DPO2U equity stake, no overlap with DPO2U advisory board).

Final choice: **decision at M5 kickoff**, by Chairman with DPO2U eng technical advice.

## 7. Engagement timeline

| Day | Activity | Owner |
|---|---|---|
| D-7 | Send NDA + scope statement to top 3 candidate firms | Chairman |
| D-3 | Receive proposals; select firm | Chairman + DPO2U eng |
| **D0 (M5)** | Engagement signed; kickoff call | All |
| D+1 | Repo access granted (read-only auditor account on GitHub) | DPO2U eng |
| D+3 | Threat scenario walk-through call (1h) | DPO2U eng |
| D+14 | Findings draft received | Audit firm |
| D+17 | DPO2U responses written | DPO2U eng |
| D+21 | Final report published; mitigation PRs merged | All |
| D+22 | M7 mainnet ceremony pre-flight check (audit gate green) | Chairman |

Total audit window: **21 days**. Compatible with Stellar37° calendar (M5 2026-05-30 → M7 2026-06-09 leaves 10 days; tight but feasible if findings are Low-Medium only).

**Buffer plan**: if findings include High items requiring multi-day mitigation, M7 slips by 3–5 days. Documented as expected risk.

## 8. Reference

- [Stellar Smart Contract Security Best Practices](https://developers.stellar.org/docs/learn/encyclopedia/contract-development/security)
- [Soroban Audit Checklist (community)](https://github.com/stellar/soroban-examples) — informal reference
- DPO2U threat model: [`THREAT-MODEL-Piloto-v0.1.md`](THREAT-MODEL-Piloto-v0.1.md) (will become v1.0 post-audit if findings change assumptions)

## History

| Date | Author | Change |
|---|---|---|
| 2026-05-13 | DPO2U eng + Chairman | v1.0 — pre-engagement scope statement for Stellar37° M5. |
