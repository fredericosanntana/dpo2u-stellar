# S1 CVM 175 Rebalance Predicate Map Report

## Files changed

- `docs/S1-CVM175-REBALANCE-PREDICATE-MAP.md`
- `docs/DPO2U-STELLAR-DEFINDEX-COMPLIANCE-LAYER-PRD.md`
- `docs/STELLAR-DEFINDEX-LEGAL-CIRCUITS-MEMO.md`
- `.hermes/reports/2026-06-20_s1-cvm175-rebalance-predicate-map-report.md`

## Commands run

- `sed -n '1,240p' .hermes/plans/2026-06-20_165554-s1-predicate-map-cvm175-rebalance.txt`
- `sed -n '1,260p' docs/DPO2U-STELLAR-DEFINDEX-COMPLIANCE-LAYER-PRD.md`
- `sed -n '1,260p' docs/STELLAR-DEFINDEX-LEGAL-CIRCUITS-MEMO.md`
- `sed -n '1,260p' docs/PULSO-DPO2U-DEFINDEX-PRD-v0.1.md`
- `sed -n '1,260p' docs/DEFINDEX-PROOF-BOUND-EXECUTION-LIVE-SLICE.md`
- `sed -n '1,260p' sdk/src/use-cases.ts`
- `sed -n '1,320p' sdk/src/defindex-policy-types.ts`
- `sed -n '1,320p' sdk/src/DefindexPolicyGateway.ts`
- `git status --short`
- `ls .hermes/reports | tail -20`
- `test -f docs/S1-CVM175-REBALANCE-PREDICATE-MAP.md && printf 'exists\n'`
- `rg -n "CVM 175|rebalanceVault|Rebalance Manager|sect_cvm_175_v1|defindex_rebalance_v1|PASS / FAIL / REVIEW" docs/S1-CVM175-REBALANCE-PREDICATE-MAP.md`
- `sed -n '1,260p' docs/S1-CVM175-REBALANCE-PREDICATE-MAP.md`
- `sed -n '1,340p' docs/DPO2U-STELLAR-DEFINDEX-COMPLIANCE-LAYER-PRD.md`
- `git diff -- docs/DPO2U-STELLAR-DEFINDEX-COMPLIANCE-LAYER-PRD.md docs/STELLAR-DEFINDEX-LEGAL-CIRCUITS-MEMO.md`
- `sed -n '1,220p' .hermes/reports/2026-06-20_s1-cvm175-rebalance-predicate-map-report.md`
- `git status --short docs/S1-CVM175-REBALANCE-PREDICATE-MAP.md docs/DPO2U-STELLAR-DEFINDEX-COMPLIANCE-LAYER-PRD.md docs/STELLAR-DEFINDEX-LEGAL-CIRCUITS-MEMO.md .hermes/reports/2026-06-20_s1-cvm175-rebalance-predicate-map-report.md`
- `rg -n "primeiro circuito parceiro público|Governança de rebalance via CVM 175|S1 canônico|defindex_rebalance_v1|sect_cvm_175_v1" docs/DPO2U-STELLAR-DEFINDEX-COMPLIANCE-LAYER-PRD.md docs/STELLAR-DEFINDEX-LEGAL-CIRCUITS-MEMO.md .hermes/reports/2026-06-20_s1-cvm175-rebalance-predicate-map-report.md`

## What S1 is now

S1 is now fixed as **Governança de rebalance via CVM 175**.

- DeFindex action: `rebalanceVault`
- DeFindex role: Rebalance Manager
- Operator predicate / `use_case_id`: `defindex_rebalance_v1`
- Primary legal anchor: `sect_cvm_175_v1`
- Evidence principle: the `evidence_hash` binds a canonical, PII-minimized rebalance payload to the exact action, predicate, vault, caller, instructions, policy version and validity window.
- Gate behavior: only `PASS` allows preparing the unsigned rebalance action; `FAIL`, `REVIEW`, missing, expired or revoked evidence deny fail-closed.

The S1 document keeps PSAV/VASP safeguards and Travel Rule settlement evidence as adjacent later circuits, not the selected first lane.

## What remains open

- S2 must harden the DeFindex adapter around the real operator surface and unsigned XDR return path.
- S2 must implement or standardize canonical payload hashing and denial tests for `FAIL`, `REVIEW`, missing evidence and hash mismatch.
- S3 must demonstrate the full proof-bound path from payload hash to prepared/executed rebalance and record transaction evidence only when actually executed.
- Partner/legal review is still required before public marketing claims imply legal sufficiency beyond the narrow S1 anchor.
