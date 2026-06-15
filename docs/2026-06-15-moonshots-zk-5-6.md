# DPO2U × Stellar "Real-World ZK" — Moonshots #5 & #6 (live on testnet)

> 2026-06-15. Two of the SDF "Real-World ZK" moonshots, built on the existing PoR
> BN254 stack (`por-verifier` `CBM6WJTEN…MVCAC`, `por-filing` `CC73EARB…UWC2Q`).
> All BN254/Groth16. Testnet; DEV coordinator ceremony; no fabricated data.

## #5 — Aggregate N jurisdiction proofs into 1 (SnarkPack)

**True recursive proof aggregation** (SnarkPack TIPP/MIPP, via `arkworks-rs/ripp`),
not a batch circuit: N independently generated Groth16/BN254 jurisdiction-compliance
proofs (`score ≥ threshold`, bound to a per-jurisdiction `context`) are folded into ONE
aggregate proof and verified **off-chain**.

- Circuit: `zk-prover/agg/jurisdiction_compliance.circom` (BN254, public `[compliant, threshold, context]`).
- Off-chain aggregator: `zk-prover-agg/` (Rust). **Dual-vertical batch of 29**: the full
  **24-jurisdiction data-protection corpus** (canonical `JURISDICTION_CODES`: LGPD/GDPR/
  DPDP/MICAR/MICAR-CASP/PDPA/UAE/POPIA/NDPA/CCPA/PIPEDA/LAW25/PIPA/PDP/APPI/MEXICO/VIETNAM/
  MALAYSIA/KENYA/GHANA/COLOMBIA/TANZANIA/RWANDA/UGANDA) **+ 5 scored AI-governance
  frameworks** (CAIDP, UNESCO-RAM, MGF-Agentic, Japan, Korea) → 1 aggregate,
  `verify_aggregate == true`. All 29 share one generic circuit/vk ("private score ≥
  threshold, bound to context") — data-protection AND AI-governance compliance in one
  proof; SnarkPack folds a power-of-two batch, so 29 is padded to **32** internally.
  (Structural AI frameworks — EU-AIA risk-tier, Hiroshima attestation, AI-Gov-Stack
  methodology — need a separate predicate circuit; see the #2 study doc.)
- On-chain seal: `agg-filing` Soroban contract — seals the aggregate **result** and verifies ONE
  jurisdiction-compliance proof (same circuit) **on-chain** via cross-call to `por-verifier`.

**⚠️ Honest gap (confirmed, fundamental):** on-chain verification of the SnarkPack
*aggregate* is infeasible on Soroban today. The `bn254` host (`soroban-sdk 26.0.0`)
exposes only `g1_add/g1_mul/g1_msm`, `pairing_check` (boolean) and `Fr` arithmetic —
**no GT type / `miller_loop` / `final_exp`**, which TIPP/MIPP require. So the aggregate
is verified off-chain; the on-chain seal attests the result (`off_chain_verified: true`)
**plus** one constituent proof verified on-chain (`member_zk_verified: true`). On-chain
aggregate verification = roadmap, gated on Stellar adding GT host functions.

**Live (testnet):**
- `agg-filing`: `CCXTDJD46KNCV7YOZ4X3SNBICAN3TYXJPN4GAWMHDH6VI5XHNFJLMA4D`
- `seal_aggregate` tx (29 = 24 data + 5 AI): `ce44ed908968945ad03bb96ba030e10946916abd8f1aa6f41c033e70b9bf47d7`
- readback: `count=29, verdict=true, member_zk_verified=true, off_chain_verified=true`,
  `agg_commitment=0x4ab35523…1aa6`, `context_root=0xe2196c56…3632`
- artifacts: `zk-prover/agg/aggregate.json` (count 29, data 24 + AI 5, padded_to 32), `docs/demos/runs/2026-06-15T18-58-40Z-agg-filing-testnet-deploy.json`

**Reproduce:**
```bash
POW=14 bash zk-prover/agg/build-jurisdictions.sh     # N snarkjs jurisdiction proofs (shared vk)
cd zk-prover-agg && cargo run --release --bin aggregate   # SnarkPack aggregate + verify off-chain
cargo test -p agg-filing                              # 6 tests
bash scripts/deploy-agg-filing-testnet.sh             # deploy + live seal_aggregate
```

## #6 — Private cross-chain bridge (BN254 mirrors Ethereum)

BN254 is Ethereum's precompile curve, so a Groth16/BN254 proof from the EVM world
verifies natively on Soroban (`env.crypto().bn254()`). The proof bytes are the same
field elements, re-encoded (G2 c1-first = EVM convention; handled by
`zk-prover/por/snarkjs2soroban-bn254.js`).

### #6-B — "Two chains, one proof"
The SAME proof verifies on an EVM `Groth16Verifier` (snarkjs `export solidityverifier`,
from the same `por_final.zkey`) and on the Soroban `por-verifier` — both return `true`.
- `forge test` (EVM): `test_VerifiesRealPorProof` + `test_RejectsTamperedContext` pass.
- anvil deploy + `cast call verifyProof` → `true`; Soroban testnet `verify_proof` → `true`.
- artifact: `docs/demos/runs/2026-06-15T18-41-32Z-two-chains-one-proof.json`
```bash
bash scripts/evm/install-foundry.sh
bash zk-prover/por/export-evm-verifier.sh
bash scripts/evm/two-chains-one-proof.sh
```

### #6-C — Live relayer (EVM origin → Stellar on-chain verify)
A proof posted+verified on an EVM origin (`ProofRegistry`) is carried by a relayer to
Stellar, where `xchain-attest` **re-verifies it on-chain** (fail-closed) and records a
`CrossChainClaim`.

**⚠️ Trust model:** the relayer is a trusted **courier** (transport only), **NOT** a
trustless light-client bridge — no EVM state proof. The *verification* is trustless
on-chain on Soroban (pinned vk). A lying relayer cannot forge a claim: a bad proof reverts.

**Live (testnet):**
- `xchain-attest`: `CCROBTVOGWKJCNDWWCMTG3STNMCUR7TYFHXVILBBFMEXQRPCRNDXWLR2`
- `verify_and_attest` tx: `dfc7e5b87ed165ce8a7c3cd3bd5273d7cf184b959e483e12df74e906965485a6`
- EVM origin (anvil): `ProofRegistry 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512`
- `get_claim` readback: `origin_chain=anvil, zk_verified=true, proof_context=0x…075bcd15`
- artifact: `docs/demos/runs/2026-06-15T19-08-35Z-xchain-relayer.json`
```bash
cd relayer && npm test                                # EVM→Soroban conversion (no network)
bash scripts/relayer/run-xchain-demo.sh               # anvil origin → relayer → Stellar live tx
```
Origin defaults to local anvil; set `RPC`/`EVM_KEY`/`ORIGIN` for a public EVM testnet (Base Sepolia).

### #6 ported to Solana — same proof, a THIRD chain (live on devnet)
BN254 is also Solana's `alt_bn128` precompile curve, so the SAME proof verifies on-chain
on Solana too. A native Solana program (`solana-xchain/`, using `groth16-solana` =
`alt_bn128` syscalls, pinned vk, fail-closed) re-verifies the relayed BN254 proof and
seals a `CrossChainClaim` PDA. The relayer's Solana target (`relayer/solana.mjs`) negates
`pi_a`, builds the instruction, and submits it.
- **Live (devnet):** program `9muJSDtxSsKLKML5SPLn3XvKJoxaiZ6TzMjyGeFFtAib`,
  `verify_and_attest` tx `4s5CmdewD7t9yHLpsEq2bKTSZhxaEQrSBpGLeXphHnmTZgPtzSdKkHa5azJW4ZwqTWdDY7Szwt3Fr8KRsEXrdVBa`,
  claim PDA `EpPgQzTVBJUbXedQorrPfwj5sj1STwxy5vQShhapsKUi` (`origin=evm`, `zk_verified=true`,
  97964 CU). Registry: `solana-xchain/devnet-deploy.json`; artifact `docs/demos/runs/…-xchain-solana.json`.
```bash
cargo run --features host --bin validate   # (solana-xchain/) host: our snarkjs bytes verify under groth16-solana
bash scripts/relayer/run-xchain-solana-demo.sh   # build-sbf → deploy devnet → relayer verify_and_attest (live tx)
```
**One BN254 proof, verified on-chain on THREE chains: Stellar + EVM + Solana.** (Midnight
can't re-verify foreign Groth16 on-chain — different proof system; it could only be a
proof *origin* via the attestation pattern.)

## Tests
- Soroban workspace: por-verifier 4 · por-filing 11 · **agg-filing 6** · **xchain-attest 6** (+ anticorruption/zk-verifier) — all green.
- Off-chain: `zk-prover-agg` 3 · relayer convert 2 · EVM `forge test` 2.

## Guardrails
Testnet only; DEV coordinator (1-party + beacon) ceremony — not multi-party MPC (that's
SCF Tranche #0); never present a DEV vk as production; trust models stated in every
contract + README. The SnarkPack on-chain-verification gap and the relayer-courier trust
model are documented, not hidden.
