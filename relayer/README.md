# DPO2U cross-chain relayer (moonshot #6-C)

Carries a Groth16/BN254 proof from an **EVM origin chain** (a `ProofRegistry` contract)
to **Stellar**, where the `xchain-attest` Soroban contract **re-verifies it on-chain**
and records a `CrossChainClaim`. BN254 mirrors Ethereum's precompile curve, so the same
proof bytes verify on both ecosystems (the EVM half is proven in `#6-B`).

## ⚠️ Trust model — read this (bold on purpose)

**This is a trusted COURIER, not a trustless bridge.**
- The relayer is trusted only to **transport** proof bytes from chain A to Stellar.
- It is **NOT** trusted about validity: the Groth16/BN254 verification runs **on-chain
  on Soroban** against a **pinned vk** (fail-closed). A lying relayer cannot forge an
  attestation — a bad proof simply reverts (`ZkVerifyFailed`).
- There is **no EVM light client and no state proof**. A fully trustless bridge (EVM
  state verified on Stellar) is roadmap, not this.

## Run

```bash
npm test     # unit: EVM->Soroban conversion reproduces known-good PoR hex (no network)
# live relay (see scripts/relayer/run-xchain-demo.sh for the full origin+Stellar wiring):
REGISTRY=0x... XCHAIN_ID=C... RPC=http://127.0.0.1:8545 PROOF_ID=0 ORIGIN=anvil \
  STELLAR_SRC=dpo2u-deployer node relay.mjs
```

Origin chain is configurable via `RPC`/`ORIGIN`: a local **anvil** (default, reliable
for demos) or a public EVM testnet like **Base Sepolia** (set `RPC` + fund an EVM key).
The cross-chain claim is identical either way — Stellar verifies an EVM-originated proof.
