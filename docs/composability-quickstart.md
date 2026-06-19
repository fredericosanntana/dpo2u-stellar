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

## Protocol track — on-chain gating `registry → ASP → pool-adapter` (real now)

**Status labels used across the current public-base docs:**
- **real now** — already implemented and evidenced in this repo,
- **prototype-real** — real cryptographic/contract machinery with bounded scope,
- **symbolic** — stateful model of a production concept without full value-moving/economic finality,
- **roadmap** — not yet closed in the current stack.

**Current operating mode:** the revocation-to-blocked-lane enforcement path currently executes on a **DPO2U-controlled own `asp-non-membership` lane**. The externally audited lane is readable and useful for comparability, but not currently writable by DPO2U without separate governance/admin authority.

Beyond the SDK/verify surface above, a dedicated **protocol track** proves contract-to-contract
composability on Soroban. Three contracts in `contracts/` chain via **real fail-closed
cross-contract calls**:

| Contract | Role | Real now |
|---|---|---|
| `protocol-registry` | canonical multi-issuer attestation registry; canonical verification now includes revocation + issuer profile/policy fit | ✅ |
| `asp-mvp` | mutable association set; `add_to_set` admits only when the registry verifies; `remove_from_set` propagates invalidation; `current_root` is now a real Merkle root of the active set | ✅ |
| `pool-adapter-mock` | gates a mock pool action by `asp.contains(...)` **or** plain Merkle membership proof against the ASP root | ✅ (mock pool) |
| `privacy-pool` | symbolic fixed-denomination pool; deposits commitments, verifies BN254 ZK membership withdraws, records nullifiers | ✅ (symbolic pool) |

```bash
cargo test -p protocol-registry -p asp-mvp -p pool-adapter-mock   # the thesis, end-to-end
```

**Honest scope (real vs mock):** *real now* — registry revocation, issuer profile/policy plus
symbolic stake/slash checks, mutable ASP membership, authenticated Merkle root, adapter proof
plumbing, and a separate symbolic `privacy-pool` with real BN254 membership-proof verification
and nullifier spend prevention. **Still not done** — token custody, production MPC/audit,
decentralized issuer governance, and a value-moving private pool. The old pool adapter remains a
**mock** (no value, no anonymity).
Full real-vs-mock matrix: `docs/asp-protocol-mvp.md` · standard/lifecycle/gates: `docs/OPEN-STANDARD-DRAFT.md`, `docs/CREDENTIAL-LIFECYCLE-SPEC.md`, `docs/PRODUCTION-READINESS-GATES.md` · runnable demo: `examples/pool-adapter-mock/`.

## Who this is for at the hack

Any team building **fintech / remittance / stablecoin / RWA** for Brazil, Argentina or
Colombia. Add a compliance seal check to your submission in 3 lines — and your app is
"compliant by composition". We'll co-present integrations. See `examples/` for copy-paste
templates.
