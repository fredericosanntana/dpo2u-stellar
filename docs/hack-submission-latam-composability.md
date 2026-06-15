# DPO2U — the composable compliance primitive for LatAm on Stellar
### Submission — regional hack (Brazil · Argentina · Colombia): integration & composability

> **One line:** any Stellar app moving regulated value in BR/AR/CO plugs in **one call** and
> becomes *compliant by composition*. We don't compete with the apps — we're the compliance
> edge every one of them needs. The verdict it reads is a **real ZK proof that composes
> across chains** — so the primitive is deep, not a thin wrapper.

---

## 1. The product surface — compose compliance in 3 lines (live)

```ts
import { AttestationClient, testnetClient } from '@dpo2u/sdk';
const dpo2u = new AttestationClient(testnetClient());
const { found, record } = await dpo2u.verify({ useCaseId, evidenceHashHex });
// gate your action: allow only if found && record.verdict === 'PASS'
```

Read-only Soroban simulation against the public attestation contract
`CC4TJGDRWZOPGBWOOHBJF3N2VKUQRNIW6C6PTYHD7ZI3D42GBQRRZHM5` — no wallet, no fee, no DPO2U
cooperation. **Live right now:** `verify()` returns `found=true verdict=PASS`.

**Four composition surfaces** (pick your depth):

| Layer | Plug in | |
|---|---|---|
| **SDK** | `dpo2u.verify({...})` → `{found, record:{verdict, predicate_set, …}}` | 3 lines |
| **On-chain** | cross-call `verify_attestation(...)` from your Soroban contract | inside your logic |
| **MCP (law-as-code)** | 65+ tools (`check_compliance`, `generate_dpia`, …) over **25 jurisdictions** | compute a verdict |
| **x402** | gate a paid compliance API with Stellar USDC micropayments | monetize |

Copy-paste templates: `examples/remittance-gate` (gate a transfer on a seal) ·
`examples/rwa-attest` (counterparty verifies an issuer's seal). Quickstart:
`docs/composability-quickstart.md`.

## 2. Regional — built for BR/AR/CO (law-as-code)

- **Brazil** — LGPD + BCB/PSAV (Lei 14.478) + CVM.
- **Argentina** — Ley 25.326 + PSAV/CNV (Ley 27.739); **EU-adequate** (one of ~3 non-EU
  jurisdictions) — the stablecoin epicenter of LatAm.
- **Colombia** — Ley 1581 (Habeas Data) + SFC Sandbox.
- **Mexico** + 21 more jurisdictions, 8 AI-governance frameworks, 10 sectoral.

## 3. Why we're not a thin wrapper — the ZK backbone (all live, testnet/devnet)

The verdict an app composes isn't a database row — it's a **zero-knowledge proof**: the
entity proves it meets the bar *without revealing its internals*. And because it's
BN254/Groth16, **the same proof composes across chains**:

- **Confidential Proof-of-Reserve** — issuer proves `reserves ≥ liabilities`, positions
  private. `por-filing` `CC73EARB…`, seal tx `1c4258c7…76ba` (`solvent:true, zk_verified:true`).
- **One proof, three chains** — the same BN254 proof verifies on **Stellar** (`por-verifier`
  `CBM6WJTEN…`), an **EVM** chain (snarkjs Solidity verifier), and **Solana** (`alt_bn128`,
  program `9muJSDtx…`, tx `4s5Cmdew…`). BN254 as cross-chain lingua franca.
- **Aggregation** — 24 data-protection jurisdictions **+ 5 AI-governance frameworks = 29**
  folded into one SnarkPack proof; sealed `agg-filing` `CCXTDJD4…`, seal tx `ce44ed90…`.
- **Structural AI-governance predicates** — Hiroshima ICOC (N-of-M) + EU-AIA (risk-tier),
  verified on-chain; sealed `CBA3UVX7…`, and live on Solana too.

Full technical closeout: `docs/2026-06-15-moonshots-zk-5-6.md` + the study
`docs/2026-06-15-ai-governance-zk-predicates-study.md`.

## 4. The play — composability *is* distribution

We integrate DPO2U into **other teams' submissions**. Building a BR/AR/CO fintech,
remittance, stablecoin or RWA app? **Add a compliance seal check in 3 lines — free for the
hack — and we co-present.** Every integration makes both submissions stronger; a composable
primitive only matters if others compose with it.

## 5. The moat (so this isn't a commodity)

The ZK verification is a capability, not the moat. The moat is the **law-as-code corpus**
(25 jurisdictions + AI governance, regionally grounded), being the **system-of-record of the
verdict**, and **founder-fit** (DPO 15y, FGV master, **ERC-8004 co-author**). DPO2U is a
research house: the cross-chain ZK is the published depth; the composable primitive is the
surface builders touch.

## Honest scope
Testnet/devnet; DEV ceremony vk; multi-party MPC ceremony + external audit are mainnet gates.
Corpus entries are KB snapshots for builder use, not licensed legal advice. The predicate
constants (jurisdiction thresholds, AI tiers, red-lines) encode legal classifications that
need DPO/legal review — the chain seals the encoded verdict, it does not adjudicate the law.
No fabricated data.
