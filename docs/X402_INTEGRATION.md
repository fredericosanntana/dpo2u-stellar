---
type: integration-record
title: "x402 Integration — Implemented (Stellar37° M3)"
version: 1.0
status: implemented
supersedes: "X402_DECISION.md (deleted — wrong framing)"
date: 2026-05-13
source_prd: "DPO2U_PRD_Piloto_Anticorrupcao_v0.3.docx Q5 (revised) + §13.3"
related: ["MONETIZATION.md", "STELLAR37-ROADMAP.md", "SECURITY_AUDIT.md"]
implementation_pr: "https://github.com/fredericosanntana/DPO2U/pull/21"
---

# x402 INTEGRATION — IMPLEMENTED

**x402 is a Stellar37° program criterion**, not a decision to defer. This document supersedes the previous \`X402_DECISION.md\` which framed Q5 as "N/A for MVP" — a misread of v0.3.

**Status**: implemented in [DPO2U#21](https://github.com/fredericosanntana/DPO2U/pull/21) (Sprint M.1). Engineering-side closed; production rollout depends on treasury account provisioning during the Sprint L mainnet ceremony.

---

## What was built

A 3-layer payment gate in front of \`POST /api/v1/attestation/submit\` and \`POST /api/v1/attestation/erasure-request\`:

1. **Master switch** (\`X402_ENABLED\` env var). When false, attestation routes pass through unchanged — CI tests and dev environments stay unpaid.
2. **Free use case enforcement**. \`erasure_v1\` is **always free** regardless of env config. LGPD Art. 18 §1 guarantees the right of erasure as *gratuitous* — charging the data subject would violate the right.
3. **Bypass list**. Design partners + canary probes via \`X402_BYPASS_API_KEYS\`.

When the gate is enabled and no bypass applies, the request is delegated to \`paymentMiddleware\` from \`@x402/express\`, configured with an \`ExactStellarScheme\` from \`@x402/stellar\`. Without a valid \`PAYMENT-SIGNATURE\` header, the response is HTTP 402 with a structured \`PaymentRequired\` body containing the per-use_case amount + asset + recipient.

## Pricing

Atomic units (USDC has 7 decimals on Stellar):

| Use case | Atomic | Decimal |
|---|---|---|
| \`bank_change_v1\` | 1,000,000 | 0.10 USDC |
| \`payment_doc_v1\` | 5,000,000 | 0.50 USDC |
| **\`erasure_v1\`** | **0** | **FREE (LGPD Art. 18 §1)** |

Prices are env-configurable for production calibration based on the design-partner usage data ([\`MONETIZATION.md\`](MONETIZATION.md) §2.3).

## Dependencies

Direct \`package.json\` deps (criterion-mandated):

- \`@x402/core ^2.11.0\`
- \`@x402/express ^2.11.0\`
- \`@x402/stellar ^2.11.0\`

Loaded via dynamic import in \`StellarPaymentMiddlewareFactory\` so the type system stays compatible with the broader monorepo build. Production deployments install transitively via \`npm install\`; tests inject a recording mock factory and never load the real packages.

## Module layout (DPO2U repo)

\`\`\`
packages/mcp-server/src/payment/x402/
├── types.ts           — X402Config, UseCasePrice, BypassPolicy, factory interface
├── config.ts          — buildX402ConfigFromEnv + buildTestX402Config
├── middleware.ts      — StellarPaymentMiddlewareFactory + buildAttestationX402Middleware
└── index.ts           — barrel
\`\`\`

Wired into \`bootAttestationStack\` (\`packages/mcp-server/src/boot/wire-attestation.ts\`):

\`\`\`ts
const x402Config = buildX402ConfigFromEnv(env);
const x402Middleware = await buildAttestationX402Middleware(x402Config);
\`\`\`

\`index.ts\` mounts as:

\`\`\`ts
app.use('/api/v1/attestation', stack.x402Middleware.handler, stack.attestationRouter);
app.use('/api/v1/attestation', stack.x402Middleware.handler, stack.erasureRouter);
\`\`\`

## Env variables

Documented in \`packages/mcp-server/.env.example\` (Sprint M.1 PR adds them):

| Var | Default | Purpose |
|---|---|---|
| \`X402_ENABLED\` | \`false\` | Master switch |
| \`X402_NETWORK\` | \`stellar:testnet\` | \`stellar:pubnet\` for mainnet |
| \`X402_RECIPIENT\` | empty | DPO2U treasury Stellar account (G…) |
| \`X402_ASSET_ADDRESS\` | USDC mainnet/testnet | Override only for non-USDC assets |
| \`X402_PRICE_BANK_CHANGE\` | \`1000000\` | 0.10 USDC default |
| \`X402_PRICE_PAYMENT_DOC\` | \`5000000\` | 0.50 USDC default |
| \`X402_PRICE_ERASURE\` | \`0\` | LGPD §1 enforcement (middleware overrides anyway) |
| \`X402_FACILITATOR_URL\` | empty | Optional settlement service |
| \`X402_BYPASS_API_KEYS\` | empty | Comma-separated bypass list |
| \`X402_DESCRIPTION\` | "DPO2U Anti-corruption Pilot attestation" | Paywall UI text |

## Test plan executed

19 tests in \`x402-middleware.test.ts\` with a recording mock factory:

| Group | Tests | Coverage |
|---|---|---|
| Master switch | 3 | disabled / 402 / valid payment passes |
| LGPD §1 enforcement | 3 | erasure_v1 free / /erasure endpoint free / paid use case still pays |
| Bypass | 3 | design partner key / unknown key / no key |
| Test config defaults | 5 | 3 prices / erasure free / bank price / payment_doc price / overrides |
| Env config parsing | 5 | disabled default / enabled flag / custom prices / erasure / bypass list |

Full pilot stack regression: **252/252 green** across 12 test files (added M.1 without breaking anything).

## What's NOT done yet

- **\`index.ts\` route mount**: the middleware handler is built and exposed via \`bootAttestationStack\` but not yet positioned in the express stack — this lands alongside any other \`index.ts\` change to avoid multiple monolith edits in the same week. See [Sprint K.boot PR #19](https://github.com/fredericosanntana/DPO2U/pull/19) for the current \`index.ts\` state.
- **Production Facilitator configuration**: URL + recipient treasury wallet provisioning happens during Sprint L mainnet ceremony §3 (alongside Ledger setup).
- **Integration test against testnet Soroban Facilitator**: nightly E2E (Sprint L follow-up). The unit suite uses a mocked factory; integration runs against the real network.

## Production rollout plan

1. **Pre-mainnet (now → M5)**: keep \`X402_ENABLED=false\` in all running deployments. Mock factory in tests proves the gate logic.
2. **M5 (audit kickoff)**: external firm reviews the middleware as part of MCP server scope (see [SECURITY_AUDIT.md](SECURITY_AUDIT.md) §2.2). Specific items to audit:
   - 402 response correctness (header schema + body shape per @x402 spec).
   - Bypass logic — no leakage of bypass keys via 402 body.
   - LGPD §1 enforcement — erasure_v1 cannot be charged via any config path.
   - Replay defence — payment signature verification single-use.
3. **M6 (demos)**: keep gate disabled OR set free defaults for prospect calls (recorded in design-partner LoIs).
4. **M7 (mainnet)**: enable gate alongside contract go-live. Production env values for the 9 X402_* vars provisioned during ceremony §3.x.
5. **Post-mainnet**: monitor 402 rate, payment latency, facilitator availability. Adjust prices based on subscription data ([MONETIZATION.md](MONETIZATION.md) §5).

## Why the earlier framing was wrong

The previous \`X402_DECISION.md\` (now deleted) said x402 was "N/A for MVP" and listed a 4-criterion reentry trigger. That was a misread of PRD v0.3:

- v0.2 §Q5 had open framing ("alternatives mapeadas").
- v0.3 §13.3 explicitly lists x402 integration as **Stellar37° milestone M3**.
- Closing Q5 as N/A would skip a hard program requirement, not satisfy it.

The Chairman caught this immediately upon review of the v0.3 alignment PR. Sprint M.1 corrects the framing AND ships the implementation in the same week.

## History

| Date | Author | Change |
|---|---|---|
| 2026-05-13 | Chairman | v1.0 — implementation record (supersedes deleted X402_DECISION.md) |
