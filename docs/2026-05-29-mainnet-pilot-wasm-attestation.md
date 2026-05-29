# Auto-atestação de build — piloto mainnet (2026-05-29)

Build reproduzível dos dois contratos para o piloto mainnet enxuto. Sem auditoria externa
(gate A3 conscientemente adiado); estes hashes são **auto-atestados** e servem de
`EXPECTED_WASM_HASH` no `scripts/deploy-mainnet-pilot.sh`.

## Toolchain (PINADO — reprodutível)
- `cargo` 1.95.0 / `rustc` 1.95.0 (59807616e 2026-04-14) — **pinado** via `rust-toolchain.toml`
  (channel "1.95.0"). **Não atualizar** sem re-atestar os hashes abaixo.
- `stellar` CLI 26.0.0 · `soroban-sdk` 26.0.0 (pinado no `Cargo.toml`)
- target `wasm32v1-none`, profile release (opt-level=z, lto, strip=symbols)
- ✔ 2026-05-29: rebuild com o toolchain pinado **reproduziu os 2 hashes idênticos** (abaixo).
- git commit: `487ab9b32a958824d1885ed6a55b5d96ce79ff2e`
  (branch `chore/backup-audit-snapshot-2026-05-20`)

## Testes (baseline verde)
- `anticorruption-attestation`: **10/10** ok
- `zk-verifier`: **2/2** ok

## Hashes SHA-256 (wasm OTIMIZADO)
| Contrato | Arquivo | Tamanho | SHA-256 |
|---|---|---|---|
| anticorruption-attestation | `anticorruption_attestation.optimized.wasm` | 5865 B | `d706a07161d784dcf2790c95c5e5e516c0993dfbbd0c8eb7a61cdefd4a6d7595` |
| zk-verifier | `zk_verifier.optimized.wasm` | 5393 B | `4af767bbf4fbf17428a0312e0879176f64d49cda0c78d0cfcec74f231471a9a0` |

> ✔ O hash do `anticorruption_attestation` é **idêntico** ao já deployado em testnet
> (`CC4TJGDR…`), confirmando reprodutibilidade do build.

## Uso no deploy
```bash
export EXPECTED_WASM_HASH_ATTEST=d706a07161d784dcf2790c95c5e5e516c0993dfbbd0c8eb7a61cdefd4a6d7595
export EXPECTED_WASM_HASH_ZK=4af767bbf4fbf17428a0312e0879176f64d49cda0c78d0cfcec74f231471a9a0
```
