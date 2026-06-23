# EnergyPay × Privy × DPO2U — Phase-1 end-to-end demo

Runs the F1 composability live on Stellar testnet:

```
Privy (operator signer) → DPO2U admit() (decides, evidence bound to the action)
  → Stellar settlement (executes) → evidence hash pinned on-chain (memo)
```

- **ALLOW lane:** a compliant settlement is admitted, the Privy wallet raw-signs it,
  it settles, and the DPO2U evidence hash is pinned as the tx `MemoHash`.
- **DENY lane:** an over-mandate settlement is denied — the Privy signature is never
  requested; nothing settles (fail-closed).

Latest live run + on-chain verification: [`RESULT-2026-06-23.md`](RESULT-2026-06-23.md).

## Run

```bash
export PRIVY_APP_ID=...        # the DPO2U/EnergyPay Privy app
export PRIVY_APP_SECRET=...    # never committed
# optional overrides: PRIVY_WALLET_ID, OPERATOR_ADDRESS, RECIPIENT
node scripts/demos/energypay-privy-dpo2u/demo.mjs
```

The operator wallet defaults to the Phase-0 spike's Privy Stellar wallet; the demo
funds it via friendbot if needed.

## Components (lift-able into the EnergyPay backend)

- `admit(action)` / `deriveActionDigest(action)` — the `EnergyPaySettlementGateway`:
  off-chain policy → `{ decision, evidenceHash (bound to the action digest), reason,
  expiresAt }`.
- `privyRawSign(hash)` — the operator signer (Privy `/raw_sign`).
- `settle(action)` — orchestrator: admit → TOCTOU guard → Privy sign → submit →
  evidence pinned in the memo.

Reuses `@stellar/stellar-sdk` from the repo's `sdk/` via `createRequire`.
