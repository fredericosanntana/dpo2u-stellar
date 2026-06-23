# Phase 2 — on-chain enforcement live: Privy → DPO2U gate → DeFindex (2026-06-23)

Phase 1 proved the off-chain admit (decision + evidence). Phase 2 closes the
TOCTOU at the **enforcement** level: the privileged treasury action runs through
the DPO2U **on-chain gate**, the **operator is the Privy wallet**, and **DeFindex**
is the execution sink.

`Privy (operator, signs the Soroban invocation) → DPO2U gate on-chain (ENFORCES:
only forwards after the ZK proof verifies + operator authorized) → DeFindex vault
(rebalance executes)`.

## Live run

1. **Privy authorized as gate operator** (admin = dpo2u-deployer)
   — tx `a41e10e7bbfbfe1c659c366accb01cf137d8f4c94b99b377da8d6868536c3b57`,
   `is_operator(GCGPXORX…) = true`.
2. **ZK proof generated for operator = Privy** (rollforward `PHASE=proof`,
   `OPERATOR=GCGPXORX…`): evidence `f0df9a1d…`, zk-context `004d61d9…`,
   verifier dry-run `true`.
3. **Invocation built** with `--build-only --source-account=<Privy>` (the CLI
   encodes the BN254 args; Privy as tx source satisfies `require_auth(operator)`
   via the envelope signature — no auth-entry needed).
4. **Privy signed the tx hash** (raw-sign, verified ed25519) and submitted via
   Soroban RPC →
   **tx `92e20c8a0162dfb6554daecf5f24aec27c72519c55e483e1ece85be4ba268c4c` — SUCCESS**
   ([explorer](https://stellar.expert/explorer/testnet/tx/92e20c8a0162dfb6554daecf5f24aec27c72519c55e483e1ece85be4ba268c4c)).

## On-chain verification

- `source_account` of the gated tx = the **Privy wallet** `GCGPXORX…` — the Privy
  operator signed and drove the privileged action.
- DeFindex vault state: **idle 1002 → 3, invested 7 → 1005** — the `Invest(1000)`
  rebalance executed (the gate forwarded only because the proof verified on-chain).

## What this proves

- A Privy-held operator key signs a **Soroban contract invocation** (not just a
  classic envelope) — the spike's anticipated path, now live against a real gate.
- The DPO2U gate is the **enforcement** layer: the rebalance cannot execute without
  the ZK proof bound to the exact intent (`context == derive_zk_context(evidence)`),
  authorized operator, and anti-replay — checked **on-chain**, not in a database.
- DeFindex is the treasury execution sink (Phase-2 role, "proof of depth").

## Reproduce

```bash
# 2) proof for the Privy operator
OPERATOR=<privy G…> NONCE=<fresh> SCOPE=invest AMOUNT=1000 \
  INSTRUCTIONS='[{"Invest":{"0":"<strategy C…>","1":"1000"}}]' \
  PHASE=proof bash scripts/rollforward-defindex-policy-vault-testnet.sh
# 3) build unsigned invocation (Privy as source)
stellar contract invoke --id <GATE> --source-account <privy G…> --network testnet \
  --build-only -- execute_rebalance_with_proof --operator <privy G…> --scope invest \
  --nonce <same> --expires_at 1800000000 --evidence_hash <derived> \
  --instructions-file-path <…/instructions.json> \
  --proof "$(jq -c '{a:.PROOF_A,b:.PROOF_B,c:.PROOF_C}' <…/soroban.json>)" \
  --pub_signals "$(jq -c '.PUBLIC' <…/soroban.json>)" > unsigned.xdr
# 4) Privy signs + submits (needs PRIVY_APP_ID/SECRET, PRIVY_WALLET_ID)
node scripts/demos/energypay-privy-dpo2u/phase2-gate-sign-submit.mjs unsigned.xdr
```

## Housekeeping

The Privy wallet was granted the gate **operator** role for this demo (reversible
via `authorize_operator --allowed false`). Consider revoking it after the demo to
restore least privilege. Privy app secret used via env only; **rotate it.**
