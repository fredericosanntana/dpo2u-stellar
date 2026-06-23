# Pulso × DeFindex — proof-bound execution quickstart

One command proves, on Stellar testnet, the DPO2U thesis: a DeFindex vault
rebalance executes **only** when a compliance verdict / ZK proof bound to the
exact intent passes — and **fails closed** otherwise.

## Run

```bash
cp scripts/pulso-quickstart/.env.example scripts/pulso-quickstart/.env
# edit .env: set IDENTITY to a funded testnet key (see `stellar keys`)
make demo
```

## What you'll see

1. **Readiness** — `vault.get_rebalance_manager` returns the **gate** contract,
   not an EOA. Role-as-contract: a contract governs rebalance.
2. **Positive** — with `SEND=yes`, a policy-bound `Invest` rebalance forwards to
   the vault (proven live previously: tx `cf790f4d…`, invested 999/1000).
3. **Negative** — a tampered intent (zero evidence hash, no attestation) is
   **rejected on-chain**. The rejection is the product.

## Lanes & safety

| Lane | Spends? | Default |
|------|---------|---------|
| readiness | no (query) | always |
| positive  | yes | only when `SEND=yes` |
| negative  | no (`--send no` simulation) | always |

## ZK admission lane (moonshot)

The gate also gates a rebalance on a **ZK membership proof** of the positive-set,
bound to the exact intent — `execute_rebalance_with_proof` with 4 public signals
`[root, nullifierHash, recipient, context]`:

- `root` is checked against an admin-pinned admitted-set root (`set_admitted_root`);
- `nullifierHash` is consumed for anti-replay;
- `context` must equal `derive_zk_context(evidence_hash)` (bound to the action).

A real depth-4 Groth16/BN254 membership proof verifies on-chain in the gate suite:

```bash
make gate-test     # cargo test -p defindex-rebalance-gate (23 tests)
```

To wire it live: pin the admitted root, `set_verifier` with the membership VK
(`zk-prover/membership/soroban-bn254.json`), then regenerate the membership proof
bound to the live intent's `derive_zk_context` (edit `CONTEXT` in
`zk-prover/membership/gen-input.js`, re-run the prove/convert steps in
`zk-prover/membership/build.sh`), and call `execute_rebalance_with_proof`.

## Honesty

- Verified in this repo: SDK build + **107 SDK tests** + **23 gate tests** green
  (incl. a real on-chain-verified membership proof); these scripts lint clean
  (`bash -n`).
- The **live** testnet run requires a funded `stellar` CLI identity and per-intent
  proof regeneration; it is not executed by the build itself. See
  [`docs/KNOWN-GAPS.md`](../../docs/KNOWN-GAPS.md).
