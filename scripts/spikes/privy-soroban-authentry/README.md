# Phase-0 spike — Privy ↔ Soroban auth-entry signing

**Proves the one assumption that can sink Phase 1:** that a Privy operator-held
embedded wallet can sign a **Soroban contract invocation** (a
`SorobanAuthorizationEntry`), not just a classic Stellar envelope.

## The pattern (confirmed by docs)

- Stellar `authorizeEntry(entry, signer, validUntilLedgerSeq, passphrase)` takes a
  signer callback `(preimage) => Promise<Buffer>` that returns an ed25519 signature
  over `sha256(preimage.toXDR())`.
- Privy exposes **raw hash signing for Stellar** — `useSignRawHash({ address,
  chainType: 'stellar', hash })` (client) or the server wallet rawSign API. That is
  exactly the callback shape.
- A separate **fee-payer** sources the tx (pays fees + sequence); the operator only
  signs the invocation. (Auth-entry signing decouples authorization from submission.)

So the integration is: compute the auth-entry preimage hash → Privy raw-signs it →
attach the signature to the entry → fee-payer submits.

## Run

```bash
cd scripts/spikes/privy-soroban-authentry
npm i @stellar/stellar-sdk     # spike-local; not added to the repo

# Stellar half only (NO Privy needed) — proves auth-entry assembly + submit:
RPC_URL=https://soroban-testnet.stellar.org \
FEEPAYER_SECRET=S... OPERATOR_ADDRESS=G... OPERATOR_SECRET=S... \
CONTRACT_ID=C... METHOD=pin \
node spike.mjs --mock

# Full spike — swap the local signer for Privy raw-sign (one function):
#   implement signHashWithPrivy() with PRIVY_APP_ID/SECRET/WALLET_ID, then:
PRIVY_APP_ID=... PRIVY_APP_SECRET=... PRIVY_WALLET_ID=... \
FEEPAYER_SECRET=S... OPERATOR_ADDRESS=G... CONTRACT_ID=C... \
node spike.mjs
```

## Status

- **Pattern:** confirmed by Privy + Stellar docs (see spec §4 / §11).
- **Harness:** written, `node --check` clean. Encodes the exact `authorizeEntry` +
  raw-sign flow; `--mock` proves the Stellar half with zero Privy dependency.
- **Privy raw-sign half: PASSED LIVE (2026-06-23)** — a Privy Stellar wallet
  raw-signed a hash and it verified as Stellar ed25519. See `PHASE0-RESULT.md`.
  This closes the only Privy-specific unknown.
- **Remaining (low-risk):** the full `authorizeEntry`-against-a-contract run via
  `spike.mjs` needs a target Soroban contract + funded fee-payer; the signer
  callback calls the same Privy `raw_sign`. Standard stellar-sdk plumbing.

## Decision gate

- **Pass** (Privy raw-signs the entry; tx confirms on testnet) → proceed to the
  implementation plan; the rest of Phase 1 is routine.
- **Fail** (Privy can't produce a usable ed25519 sig over the entry hash) → re-scope
  so signing happens outside Privy (Privy keeps identity), before any plan.
