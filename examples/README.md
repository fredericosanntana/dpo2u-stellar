# DPO2U composability examples

Copy-paste templates showing how a third-party Stellar app composes DPO2U's compliance
primitive. The two TypeScript templates are **thin** (one function each) and trustless
(read-only Soroban simulation; no wallet, no fee, no DPO2U cooperation). See
`../docs/composability-quickstart.md`.

| Example | What it shows |
|---|---|
| `remittance-gate/` | A payment/remittance app **blocks a transfer unless** a PASS compliance seal exists on-chain (`gateTransfer`). |
| `rwa-attest/` | A counterparty **independently verifies an issuer's** compliance seal before accepting an RWA/stablecoin (`acceptAssetIfCompliant`). |
| `pool-adapter-mock/` | **On-chain (Soroban/Rust):** the protocol-track gating thesis `registry → ASP → pool-adapter` — canonical verification, mutable membership, active Merkle root, and mock pool release by membership/proof. Honest scope. |

## Run

```bash
# TypeScript templates — from this repo (uses the local SDK source):
cd ../sdk && npx tsx ../examples/remittance-gate/gate.ts
cd ../sdk && npx tsx ../examples/rwa-attest/verify-issuer.ts

# On-chain protocol-track gating (Rust/Soroban) — from the repo root:
cargo test -p protocol-registry -p asp-mvp -p pool-adapter-mock
```

The `pool-adapter-mock/` example is Rust-native (it gates inside a Soroban contract via a
real cross-contract call), so it runs through `cargo test` rather than the SDK — see its own
`pool-adapter-mock/README.md`.

In your own app: `npm i @dpo2u/sdk` and change the import to `from '@dpo2u/sdk'`.

Both verify against the public testnet attestation contract
`CC4TJGDRWZOPGBWOOHBJF3N2VKUQRNIW6C6PTYHD7ZI3D42GBQRRZHM5`. The demos use a real on-chain
PASS seal (`bank_chg` / `0dbf43ad…`) for the allow path and a non-existent pair for the
block path.
