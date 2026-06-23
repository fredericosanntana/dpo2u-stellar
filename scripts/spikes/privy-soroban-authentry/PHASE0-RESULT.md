# Phase-0 spike RESULT — Privy ↔ Stellar raw-sign (PASS, live)

**Date:** 2026-06-23

## Proven (live)

A Privy Stellar wallet raw-signs an arbitrary 32-byte hash, and the signature
verifies as **Stellar ed25519** over that exact hash:

- `POST https://api.privy.io/v1/wallets` `{ chain_type: "stellar" }` → wallet
  `GCGPXORXCF2DLCYSYZ652DCDRAFKXAXZLJFL2YXOOWHWSOLVUDSZXZAQ`
- `POST /v1/wallets/{id}/raw_sign` `{ params: { hash } }` over
  `0xb52fca78540a6e7c6ec13f1b705cb8b41e2592e1597b3454232b337b87deef65`
  → 64-byte ed25519 signature
- `Keypair.fromPublicKey(address).verify(hash, sig)` → **TRUE ✅**

Harness lived in scratchpad (reads `PRIVY_APP_ID` / `PRIVY_APP_SECRET` from env;
the secret is **not** committed).

## Why this retires the blocker

Soroban auth-entry signing is ed25519 over `sha256(SorobanAuthorizationEntry
preimage)`. Privy raw-sign produces exactly that — a valid Stellar ed25519
signature over an arbitrary 32-byte hash. So the operator signs the auth-entry
via Privy; a separate fee-payer sources the tx. The remaining assembly
(`authorizeEntry`, fee-payer submit) is standard `@stellar/stellar-sdk`, encoded
in `spike.mjs` — its signer callback just calls the same Privy `raw_sign`.

## Status

- **Privy-specific unknown: CLOSED (live).**
- Full auth-entry-against-a-contract run: standard stellar-sdk plumbing, low risk.
- **Phase-0 gate: GREEN** → safe to write the implementation plan.

## Housekeeping

A Privy wallet was created under the app during the spike (id/address above).
The app secret was shared in chat — **rotate it in the Privy dashboard.**
