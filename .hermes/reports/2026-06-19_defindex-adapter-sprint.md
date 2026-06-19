# Sprint Report — DeFindex adapter over @defindex/sdk

**Date:** 2026-06-19  
**Branch:** `feat/mainnet-shakedown-x402-zk`

## Objective
Apply the DeFindex PRD in code by wiring a real adapter over `@defindex/sdk` into `sdk/`, keeping scope honest and operator-surface only.

## Files changed

| File | Status | What |
|---|---|---|
| `sdk/package.json` | modified | added runtime dependency `@defindex/sdk@^0.3.0` |
| `sdk/package-lock.json` | modified | locked `@defindex/sdk` install |
| `sdk/src/DefindexSdkAdapter.ts` | new | real thin adapter from DPO2U policy types to `@defindex/sdk` methods |
| `sdk/src/__tests__/DefindexSdkAdapter.test.ts` | new | offline mapping/error tests for adapter |
| `sdk/src/DefindexPolicyGateway.ts` | modified | added fee-distribution helper when client supports it |
| `sdk/src/defindex-policy-types.ts` | modified | added `DistributeFeesRequest` and optional `distributeFees` operator surface |
| `sdk/src/index.ts` | modified | exported adapter + new types |
| `sdk/README.md` | modified | added programmatic `attestation -> authorize -> prepare DeFindex XDR` example |
| `docs/PULSO-DPO2U-DEFINDEX-PRD-v0.1.md` | existing from prior sprint | PRD remains the design anchor for this implementation |

## Validation commands run

| # | Command | Result |
|---|---|---|
| 1 | `cd /root/dpo2u-stellar/sdk && npm install` | PASS |
| 2 | `cd /root/dpo2u-stellar/sdk && npm test` | PASS — 6 files, 74 tests |
| 3 | `cd /root/dpo2u-stellar/sdk && npm run build` | PASS |
| 4 | `cd /root/dpo2u-stellar && git status --short sdk docs .hermes` | PASS |

## Honest limitations / next slice

1. The adapter is real and typed against `@defindex/sdk`, but still runs against an injected SDK instance in tests — no live API call or signed tx was attempted.
2. The gateway remains operator-surface only. It does **not** claim retail deposit allowlisting on DeFindex.
3. We still have not occupied a DeFindex vault role with a DPO2U contract (`role-as-contract`), which remains the true moonshot slice.
4. Next credible slice: build a tiny demo flow that hashes a DeFindex operator payload, verifies a DPO2U attestation for it, and prepares a real unsigned DeFindex XDR through this adapter.
