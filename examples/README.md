# DPO2U composability examples

Copy-paste templates showing how a third-party Stellar app composes DPO2U's compliance
primitive. Both are **thin** (one function each) and trustless (read-only Soroban
simulation; no wallet, no fee, no DPO2U cooperation). See `../docs/composability-quickstart.md`.

| Example | What it shows |
|---|---|
| `remittance-gate/` | A payment/remittance app **blocks a transfer unless** a PASS compliance seal exists on-chain (`gateTransfer`). |
| `rwa-attest/` | A counterparty **independently verifies an issuer's** compliance seal before accepting an RWA/stablecoin (`acceptAssetIfCompliant`). |

## Run

```bash
# from this repo (uses the local SDK source):
cd ../sdk && npx tsx ../examples/remittance-gate/gate.ts
cd ../sdk && npx tsx ../examples/rwa-attest/verify-issuer.ts
```

In your own app: `npm i @dpo2u/sdk` and change the import to `from '@dpo2u/sdk'`.

Both verify against the public testnet attestation contract
`CC4TJGDRWZOPGBWOOHBJF3N2VKUQRNIW6C6PTYHD7ZI3D42GBQRRZHM5`. The demos use a real on-chain
PASS seal (`bank_chg` / `0dbf43ad…`) for the allow path and a non-existent pair for the
block path.
