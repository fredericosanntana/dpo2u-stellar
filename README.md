# dpo2u-stellar

> **DPO2U Piloto Anticorrupção** — primeiro contrato Soroban da pilha
> *compliance-as-protocol* da DPO2U para execução de contratos públicos no
> Brasil. Selo de cera digital sobre cada decisão de pagamento — não bloqueia,
> registra.

[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![Network](https://img.shields.io/badge/Network-Stellar%20Testnet-purple.svg)](https://stellar.expert/explorer/testnet)
[![Status](https://img.shields.io/badge/Phase-Observer%20L1-yellow.svg)](docs/DPO2U_PRD_Piloto_Anticorrupcao_v0.3.docx)

## O que é

Este repositório materializa o **primeiro contrato on-chain** do *Piloto
Anticorrupção* especificado na [PRD v0.3](docs/DPO2U_PRD_Piloto_Anticorrupcao_v0.3.docx). Histórico institucional + cronograma do acelerador Stellar37° em [`docs/STELLAR37-ROADMAP.md`](docs/STELLAR37-ROADMAP.md).
O contrato é um **registro de atestações** que opera junto ao MCP da DPO2U:
o MCP avalia predicados sobre evidências (fora da cadeia), o contrato grava
o veredito (`PASS` / `FAIL` / `REVIEW`) junto do `hash` da evidência e dos
metadados públicos. Nenhum dado pessoal vai pra blockchain.

Princípios não-negociáveis (PRD §3):

1. **Sem dado pessoal on-chain** — só hash + metadados públicos + predicate id.
2. **Determinismo total no contrato Soroban** — zero oráculos, zero chamadas externas.
3. **Extensibilidade por configuração** — novo *use case* = novo predicate no
   MCP, não redeploy de contrato.

## Por que Stellar / Soroban

Auditor externo (TCE/TCU/CGU) precisa verificar **sem cooperação do
município**. Soroban + Horizon + Stellar Expert dão essa propriedade
prontos — `verify_attestation` é read-only e qualquer cidadão lê.
Sobre custo: deploy < 1 XLM testnet, atestação ≈ ms-cents em mainnet.

## Contrato — `anticorruption-attestation`

**Imutável por design**: sem proxy, sem `__upgrade__`. Argumento institucional:
*verified code = executed code*. Evolução = novo contrato em novo endereço;
atestações antigas continuam verificáveis no contrato original.

| Função                  | Quem chama   | O que faz                                                    |
| ----------------------- | ------------ | ------------------------------------------------------------ |
| `__constructor(admin)`  | deployer     | Grava o admin imutavelmente (`AlreadyInitialized` na repeat). |
| `configure_use_case`    | admin        | Define `predicate_set` + versão + status ativo de um UC.     |
| `authorize_submitter`   | admin        | Adiciona/remove signer da whitelist de submitters.           |
| `register_attestation`  | submitter    | Persiste veredito + hash + metadata, emite evento `attest`.   |
| `verify_attestation`    | qualquer um  | Read-only. Retorna `Option<AttestationRecord>`.              |

**DataKeys** (storage instance + persistent):

```rust
DataKey::Admin                              // Address
DataKey::UseCaseConfig(Symbol)              // UseCaseConfig
DataKey::Authorized(Address)                // bool
DataKey::Attestation(Symbol, BytesN<32>)    // AttestationRecord (persistent)
```

**Eventos** (indexáveis via Horizon):

```
("attest", use_case_id, evidence_hash) -> AttestationRecord
("config", use_case_id)                -> UseCaseConfig
("auth",   submitter_address)          -> bool
```

**Erros** (`#[contracterror]`):

| Code | Variant              |
| ---- | -------------------- |
| 1    | NotAuthorized        |
| 2    | UseCaseInactive      |
| 3    | AttestationExists    |
| 4    | AttestationNotFound  |
| 5    | AdminOnly            |
| 6    | AlreadyInitialized   |

## Deploy testnet — coordenadas

> 🟡 **Stellar Testnet — sem valor econômico, sem PII real.** Pra produção
> ver issues marcadas `mainnet` neste repo.

<!-- AUTO:DEPLOY:BEGIN -->
> Valores reais do deploy live; ver `scripts/deploy.json` para o JSON canônico.

| Campo                | Valor                                                              |
| -------------------- | ------------------------------------------------------------------ |
| Network              | `Test SDF Network ; September 2015`                                |
| Deployer pubkey      | `GDJSDCHTRQYZNKJMUFZ76NAIZ3ZNMBWWAPQ5UHI3JUSOFPSB7NEGQ6UN`         |
| Contract ID          | `CC4TJGDRWZOPGBWOOHBJF3N2VKUQRNIW6C6PTYHD7ZI3D42GBQRRZHM5`         |
| Wasm hash            | `d706a07161d784dcf2790c95c5e5e516c0993dfbbd0c8eb7a61cdefd4a6d7595` |
| Upload tx            | `8bbef03d174e4ff0412e474a46dd97a98b0c78f6b36df24ac2cb8f9ad921cd1d` |
| **Deploy tx**        | `dc7608ac5a85ed23de28b398fce1197ae1f46359cd6ececf489b9f90a4f60a35` |
| Smoke invoke tx      | `56d18b84b8a2aa41c141e117c8204a6bcdc18de59ab69d26e210ff128a84dc49` |
| Wasm size (optimized)| 5865 bytes                                                         |

**Explorer**:
- Contract: <https://stellar.expert/explorer/testnet/contract/CC4TJGDRWZOPGBWOOHBJF3N2VKUQRNIW6C6PTYHD7ZI3D42GBQRRZHM5>
- Deploy tx: <https://stellar.expert/explorer/testnet/tx/dc7608ac5a85ed23de28b398fce1197ae1f46359cd6ececf489b9f90a4f60a35>
- Account: <https://stellar.expert/explorer/testnet/account/GDJSDCHTRQYZNKJMUFZ76NAIZ3ZNMBWWAPQ5UHI3JUSOFPSB7NEGQ6UN>
<!-- AUTO:DEPLOY:END -->

## Reproduzir do zero

```bash
# 1) Pré-requisitos
rustup target add wasm32-unknown-unknown
cargo install --locked stellar-cli

# 2) Clone
git clone https://github.com/fredericosanntana/dpo2u-stellar
cd dpo2u-stellar

# 3) Testes unitários
cargo test -p anticorruption-attestation

# 4) Build + optimize wasm
stellar contract build
stellar contract optimize \
  --wasm target/wasm32v1-none/release/anticorruption_attestation.wasm

# 5) Deploy testnet (idempotente; cria identidade e funda via friendbot na 1ª vez)
./scripts/deploy-testnet.sh
```

## Estrutura

```
dpo2u-stellar/
├── contracts/anticorruption-attestation/   # Soroban contract (Rust → wasm)
│   ├── src/lib.rs                          # types + entrypoints
│   ├── src/test.rs                         # 10 testes unitários
│   ├── Cargo.toml
│   └── Makefile                            # build/test/optimize/deploy
├── docs/
│   └── DPO2U_PRD_Piloto_Anticorrupcao_v0.3.docx
├── scripts/
│   └── deploy-testnet.sh                   # one-shot deploy
├── Cargo.toml                              # workspace
├── LICENSE                                 # Apache-2.0
└── README.md
```

## Roadmap

- [x] **F1** — Contrato MVP imutável (4 funções, eventos, errors) + testes
- [x] **F1** — Deploy testnet automatizado
- [ ] **F2** — MCP tools `submit_public_attestation` + `verify_public_attestation`
- [ ] **F2** — REST API (`POST /v1/attestation/submit`) + reverse webhook
- [ ] **F2** — Passkey auth via Stellar SEP-30 recovery
- [ ] **F3** — Mainnet deploy (após 90 dias de observer L1 com município piloto)
- [ ] **F3** — Reflector oracle binding pra CEIS/CNEP (UC-2 P2.6)

## Por que isso importa

Caso TJDFT documenta fraude de **R$ 5,5 M** por troca silenciosa de conta
bancária de fornecedor (UC-1). O Brasil tem 5.570 municípios; o piloto roda
em modo observador 90 dias úteis num município pequeno antes de qualquer
*go-live* bloqueante. Quando o auditor do TCE pedir prova, ele não pede pro
município — ele consulta a blockchain.

## Licença

[Apache-2.0](LICENSE).

## Voz da casa

Construído pela **DPO2U** — *Privacy & AI compliance protocol*, 17 jurisdições
em produção, 14 programas Solana ao vivo, 70+ países cobertos, AdGM Foundation
registrada. Contato: `fredericosanntana@gmail.com`.

> *"Compliance is a protocol, not a PDF."*
