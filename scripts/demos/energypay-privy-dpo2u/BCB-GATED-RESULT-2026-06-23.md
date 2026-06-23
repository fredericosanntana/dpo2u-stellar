# Settlement gated by a REAL BCB predicate set — live (2026-06-23)

Replaces the F1 toy policy (amount ≤ threshold) with the verified BCB pack
(`evaluateBcbVasp`): a settlement only executes when **segregation + buffer ≤5% +
counterparty-authorized** pass, each carrying its legal citation; the BCB evidence
hash is pinned on-chain in the memo.

## ALLOW ✅
- DPO2U verdict: **PASS** (predicate_set=`bcb_vasp_v1`)
  - `bcb_segregation` PASS — Res. BCB 520 Art. 30 I
  - `bcb_buffer_5pct` PASS — Res. BCB 520 Art. 30 §3º II
  - `bcb_counterparty_admission` PASS — Res. BCB 520 (corte 30/10/2026)
- Privy-signed settlement: tx `d18ef8d85d8afe1d4788e9f2f9ed66b4a884ac395140d7c645d4374d79e34196`
  ([explorer](https://stellar.expert/explorer/testnet/tx/d18ef8d85d8afe1d4788e9f2f9ed66b4a884ac395140d7c645d4374d79e34196));
  evidence hash `fe7e1d43…` pinned as MemoHash.

## DENY ✅
- Buffer 6% (> 5%) → `bcb_buffer_5pct` **FAIL** → overall FAIL → blocked fail-closed,
  Privy signature never requested.

## What this proves
The DPO2U gate enforces a **real BCB predicate set** (not a demo policy) end to end:
verdict bound to the action, legal citations in the result, Privy operator signs only
on PASS, evidence pinned on-chain. The "lei BCB → gate → Privy → settlement" loop is live.
