# DPO2U — Compliance in 3 lines (composability quickstart)

> For the regional Stellar hack (BR / AR / CO, *integration & composability*).
> **DPO2U is the composable compliance primitive for LatAm.** Any Stellar app moving
> regulated value plugs in one call and becomes *compliant by composition* — without
> competing with you, without cooperation, trustless and zero-fee.

Coverage today: **Brazil** (LGPD + BCB/PSAV Lei 14.478 + CVM), **Argentina** (Ley 25.326 +
PSAV/CNV Ley 27.739, EU-adequate), **Colombia** (Ley 1581 + SFC Sandbox), **Mexico** (LFPDPPP)
— plus 21 more jurisdictions, 8 AI-governance frameworks, 10 sectoral frameworks.

## The 3-line integration (Layer 1 — SDK)

```ts
import { AttestationClient, testnetClient } from '@dpo2u/sdk';
const dpo2u = new AttestationClient(testnetClient());
const { found, record } = await dpo2u.verify({ useCaseId, evidenceHashHex });
// gate your action: allow only if found && record.verdict === 'PASS'
```

Read-only Soroban simulation against the public attestation contract
`CC4TJGDRWZOPGBWOOHBJF3N2VKUQRNIW6C6PTYHD7ZI3D42GBQRRZHM5` — no wallet, no fee, no DPO2U
state. See `examples/remittance-gate` (gate a transfer) and `examples/rwa-attest`
(counterparty verifies an issuer's seal).

## Four ways to compose (pick your depth)

| Layer | What you plug in | When |
|---|---|---|
| **1 — SDK** | `dpo2u.verify({useCaseId, evidenceHashHex})` → `{found, record:{verdict, predicate_set, submitted_by, timestamp}}`. CLI: `dpo2u-attest verify <uc> <hash>` (exit 0=PASS). | Embed a compliance gate in any app in minutes. |
| **2 — On-chain** | Cross-call `verify_attestation(use_case_id, evidence_hash) -> AttestationRecord` on the Soroban contract from YOUR contract. | Put a compliance check inside your smart-contract logic. |
| **3 — MCP (law-as-code)** | Call DPO2U's MCP tools (`check_compliance`, `generate_dpia`, `audit_ai_governance`, …, 65+) — returns structured compliance evidence for 25 jurisdictions. | Your app/agent needs to COMPUTE a verdict, not just read one. |
| **4 — x402** | Gate a paid compliance API with x402 Stellar USDC micropayments. | Monetize compliance-as-a-service, pay-per-use. |

## Verdict shape

`record.verdict ∈ { 'PASS', 'FAIL', 'REVIEW' }` · `predicate_set` (which rule) ·
`predicate_version` · `submitted_by` (G…) · `timestamp` · `metadata_hash`.

## Who this is for at the hack

Any team building **fintech / remittance / stablecoin / RWA** for Brazil, Argentina or
Colombia. Add a compliance seal check to your submission in 3 lines — and your app is
"compliant by composition". We'll co-present integrations. See `examples/` for copy-paste
templates.
