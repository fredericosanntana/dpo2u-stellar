# Mainnet Readiness Checklist

Single-page checklist consolidating the gate requirements from [MAINNET-CEREMONY.md](MAINNET-CEREMONY.md) §0. This file is the executive view; the ceremony doc is the operational spec.

> **Convention**: each item is one of:
> - `[ ]` not started
> - `[~]` in progress
> - `[x]` done with artifact link
> - `[!]` blocked / risk

Update as items move; commit each transition.

---

## Engineering (self-attestable, signed by DPO2U eng)

- [x] Sprint F1 — Soroban contract deployed testnet → [`scripts/deploy.json`](../scripts/deploy.json)
- [x] Sprint G.{1..6} — F2 plane (L1/L2/L3 + SDK + CI) → DPO2U PRs #10/#11/#12/#13, dpo2u-stellar PR #1
- [x] Sprint H.1 — UC-1 `bank_change_v1` real predicates → DPO2U PR #14
- [x] Sprint J.1 — UC-2 `payment_doc_v1` typed predicates → DPO2U PR #15
- [x] Sprint J.2 — OCR pipeline (Mock + Tesseract opt-in) → DPO2U PR #17
- [x] Sprint J.3 — CEIS/CNEP oracle (Reflector + DPO2U layered) → DPO2U PR #16
- [x] Sprint K.1 — LGPD Art. 18 erasure flow → DPO2U PR #18
- [x] Sprint K boot — boot factory + env-driven config → DPO2U PR #19
- [x] Sprint K.2 — Passkeys + SEP-30 server-side → DPO2U PR #20
- [ ] All Sprint G/H/J/K PRs MERGED to `main` (currently open as separate stack)
- [ ] Pilot stack ≥ 233/233 tests green; 0 regression
- [ ] CI per-push green for 7 contiguous days
- [ ] Nightly E2E green for 14 contiguous days

## Audit (external, irreversible)

- [ ] Audit firm selected — preference: OtterSec / Halborn / Sec3
- [ ] Engagement contracted ($15-30k USD)
- [ ] Audit kicked off (typically 2-3 weeks)
- [ ] Findings draft received
- [ ] Critical findings: 0
- [ ] High findings: 0 unmitigated
- [ ] Medium findings: each has a mitigation PR or accepted residual
- [ ] Low findings: documented in `docs/audit-residuals.md`
- [ ] Final audit report PDF archived: `docs/AUDIT-{firm}-{YYYY-MM-DD}.pdf`
- [ ] Wasm hash in audit report matches the wasm hash that will be deployed

## Operations (humans + drills)

- [ ] [RUNBOOK.md](RUNBOOK.md) v1.0 published
- [ ] Tabletop Drill A (issuer key rotation, 15 min target) — ata in `docs/drills/`
- [ ] Tabletop Drill B (fee depletion, 30 min target) — ata
- [ ] Tabletop Drill C (oracle stall, 1h target) — ata
- [ ] PagerDuty primary on-call defined + tested
- [ ] PagerDuty secondary on-call defined + tested
- [ ] Statuspage public + monitoring 5 probes configured
- [ ] 3 Ledger Nano S+ hardware wallets provisioned (admin + municipal IT + DPO2U engineer)
- [ ] Multisig 2-of-3 reproduced on testnet via setOptions
- [ ] Server-side HSM cosigner provisioned (added during ceremony §3.11)
- [ ] Off-chain payload backup (rsync → encrypted bucket) tested with restore drill
- [ ] Statuspage alerts wired:
  - [ ] `fee_sponsor_low_balance` (< 1000 XLM)
  - [ ] `attestation_rent_below_30d`
  - [ ] `oracle_stale` (> 24h)
  - [ ] `unexpected_authorize_submitter` (new submitter on-chain)
  - [ ] `predicate_drift` (canary divergence > 0.5%)

## Compliance (legal + signatures)

- [ ] [DPIA-Piloto-Anticorrupcao-v0.1.md](DPIA-Piloto-Anticorrupcao-v0.1.md) customised → v1.0 per município
- [ ] DPIA v1.0 signed by DPO município + DPO2U + advogada parceira (3 signatures)
- [ ] [THREAT-MODEL-Piloto-v0.1.md](THREAT-MODEL-Piloto-v0.1.md) → v1.0 via 2h workshop with municipal IT + DPO2U + advogada
- [ ] DPA (Data Processing Agreement) signed between município and DPO2U
- [ ] Termo de Cooperação Técnica signed (90 days Observer L1)
- [ ] LGPD Art. 18 erasure flow demonstrated to município DPO with synthetic DSR

## Reputational / external

- [ ] Município press contact briefed on what we will (and will NOT) announce post-go-live
- [ ] DPO2U blog post drafted (not yet published) — reviewed by advogada parceira
- [ ] Sales pack consistency check ([../docs/sales-pack/](sales-pack/)) — matches what is actually deployed

## Chairman approve (final gate)

- [ ] **Frederico Santana** (Founder + DPO2U Chairman) — written approval, signed digitally or via ICP-Brasil
- [ ] Archived as `docs/CHAIRMAN-APPROVE-MAINNET-{YYYY-MM-DD}.pdf`

---

## Status snapshot

Quando todos os checkboxes acima estiverem `[x]`, este documento é renomeado para `mainnet-readiness-{YYYY-MM-DD}-PASSED.md` e committado como **artefato durável** que autoriza a execução do MAINNET-CEREMONY.md.

Última atualização: 2026-05-13 (Sprint L PR — checklist initial state).
