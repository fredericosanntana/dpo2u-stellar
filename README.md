# dpo2u-stellar

> **DPO2U = compliance as a protocol on Stellar.**
> Este repo concentra a vertical protocolar atual: **registry canônico de atestações → ASP de credencial positiva → lane de privacy pool / proof verification em Soroban**.

[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![Network](https://img.shields.io/badge/Network-Stellar%20Testnet-purple.svg)](https://stellar.expert/explorer/testnet)
[![Status](https://img.shields.io/badge/Status-Hackathon%20submission%20build-orange.svg)](#estado-real-hoje)

## Tese

A DPO2U constrói a **camada de credencial positiva** que permite uma ação ser **privada** e **comprovadamente conforme** ao mesmo tempo.

Em vez de reenviar PII ou reexecutar compliance a cada integração, o protocolo prova um predicado verificável:

> **prove, don’t perform**

No contexto deste repo, isso significa:

- um **registry canônico** decide se uma atestação ainda verifica;
- um **ASP** admite ou revoga membros do conjunto positivo com base nessa verificação;
- uma lane de **privacy pool / verifier** consome esse estado para gating e prova criptográfica em Stellar.

---

## O que este repo suporta hoje

### 1) Track Pulso / integração Stellar

**Real hoje:**
- `protocol-registry`: registry canônico multi-issuer com revogação explícita, scope por claim/jurisdição e trust/stake simbólico;
- `asp-mvp`: conjunto mutável com **Merkle root real** do conjunto ativo;
- `pool-adapter-mock`: gating fail-closed por membership e por Merkle proof;
- `integration/spp-adapter/`: adapter e artefatos do fluxo **registry -> admission -> leaf -> execução**;
- relatórios e runbooks de demo em `docs/S3-*`, `docs/S4-*`, `docs/S5-*`, `docs/S6-*`, `docs/S7-*`, `docs/S8-*`.

**Claim honesta do track Pulso:**
- a DPO2U já provou uma integração **load-bearing** em Stellar entre atestação canônica, admissão ASP e lane operacional replayável de SPP/ASP;
- o boundary remanescente para instância externa auditada é de **governança / autoridade operacional**, não de viabilidade técnica.

### 2) Track ZK on Stellar

**Real hoje:**
- `privacy-pool`: vertical slice stateful com depósitos simbólicos, **proof BN254/Groth16 real**, **nullifier real** e **root history**;
- `zk-verifier`: verificador on-chain com testes de prova válida, sinal público adulterado e verificador malformado;
- `zk-prover/membership/`: circuito, fixtures e proving artifacts para a lane BN254 de membership.

**Claim honesta do track ZK:**
- a DPO2U já provou em código que Stellar pode verificar uma lane ZK **load-bearing** para membership/withdraw com root history e nullifier;
- este slice ainda é **simbólico**, não custody/value-moving e não production-scale anonymity.

---

## Estado real hoje

| Bloco | Estado | Evidência |
|---|---|---|
| Registry canônico com revogação | **Real agora** | `contracts/protocol-registry`, testes passando |
| ASP com root real e remoção por revogação | **Real agora** | `contracts/asp-mvp`, testes passando |
| Gating fail-closed no adapter | **Real agora** | `contracts/pool-adapter-mock`, testes passando |
| Bridge live registry -> lane SPP | **Real agora** | `docs/S4-LIVE-REGISTRY-TO-SPP-REPORT.md` |
| Boundary da instância externa auditada | **Real agora** | `docs/S8-EXTERNAL-ASP-BOUNDARY-REPORT.md` |
| Privacy pool com root history + nullifier | **Real agora** | `contracts/privacy-pool`, testes passando |
| Verificação on-chain de proof ZK | **Real agora** | `contracts/zk-verifier`, testes passando |
| Mainnet-grade pool / MPC final / custody real | **Não alegado** | fora de escopo do hack |
| Unificação com instância externa sem nossa chave admin | **Não alegado** | depende de governança/autorização |

---

## Estrutura principal

```text
dpo2u-stellar/
├── contracts/
│   ├── protocol-registry/        # registry canônico de atestações
│   ├── asp-mvp/                  # ASP mutable com root real do conjunto ativo
│   ├── pool-adapter-mock/        # lane fail-closed de integração/gating
│   ├── privacy-pool/             # vertical slice com BN254 Groth16 + nullifier
│   ├── zk-verifier/              # verificador on-chain de proof
│   └── ...
├── integration/spp-adapter/      # adapter, schemas, scripts e artefatos replayáveis
├── zk-prover/membership/         # circuito, fixtures e proving artifacts da lane ZK
├── docs/
│   ├── S3-... S8-...             # relatórios/runbooks do track Pulso/SPP
│   ├── submissions/              # material pronto para submissão
│   └── ...
└── scripts/
```

---

## Como validar rapidamente

### Testes críticos usados nesta auditoria

```bash
cargo test -p protocol-registry -p asp-mvp -p pool-adapter-mock
cargo test -p privacy-pool -p zk-verifier
```

### Runbooks e evidências

- Pulso / integração:
  - `docs/S3-REGISTRY-TO-SPP-DEMO-RUNBOOK.md`
  - `docs/S4-LIVE-REGISTRY-TO-SPP-REPORT.md`
  - `docs/S8-EXTERNAL-ASP-BOUNDARY-REPORT.md`
- ZK / proof path:
  - `contracts/privacy-pool/src/test.rs`
  - `contracts/zk-verifier/src/test.rs`
  - `docs/asp-protocol-mvp.md`

---

## Pacote de submissão no repo

- `docs/submissions/HACKATHON-SUBMISSION-CHECKLIST.md`
- `docs/submissions/PULSO-PITCH-DECK.md`
- `docs/submissions/PULSO-PITCH-DECK.html`
- `docs/submissions/PULSO-VIDEO-SCRIPT.md`
- `docs/submissions/ZK-VIDEO-SCRIPT.md`

---

## Escopo honesto / não-objetivos do hack

Este repo **não** alega, neste momento:

- privacy pool production-ready;
- MPC ceremony final para todos os flows;
- governance/staking/slashing descentralizados de issuer;
- custody/token movement de produção;
- integração permissionless com instância externa cujo admin não controlamos.

O que ele alega — e prova — é mais importante para o hackathon:

- **integração load-bearing em Stellar** no track Pulso;
- **ZK load-bearing em Stellar** no track ZK;
- uma tese coerente de produto: **credencial positiva como primitive de compliance-preserving privacy**.

---

## Estratégia de submissão

### Pulso
Foco em **integração**:
- registry vivo;
- bridge/admission real;
- lane operacional replayável;
- revogação que bloqueia re-entry;
- framing de ecossistema e composability.

### Real-World ZK on Stellar
Foco em **profundidade ZK**:
- proof path real;
- root history;
- nullifier real;
- on-chain verification em Soroban;
- framing de credencial positiva e private compliance.

---

## Licença

[Apache-2.0](LICENSE)
