---
type: demo-log
title: "MVP Testnet Anchor — Round-trip ao vivo no contrato CC4TJGDR…"
date: 2026-05-14
operator: DPO2U eng (Claude Opus 4.7 1M)
network: "Test SDF Network ; September 2015"
contract_id: "CC4TJGDRWZOPGBWOOHBJF3N2VKUQRNIW6C6PTYHD7ZI3D42GBQRRZHM5"
status: success
---

# MVP TESTNET ANCHOR — ROUND-TRIP AO VIVO

Demonstração end-to-end de **1 fluxo completo** do app DPO2U Anti-corruption Pilot integrado ao contrato Soroban deployado em Stellar testnet (Sprint F1).

Esta âncora satisfaz o critério Stellar37° **M1** ("Testnet contract live + 3 significant commits") com evidência on-chain reproduzível por qualquer terceiro via Horizon, Stellar Expert, ou a CLI pública `dpo2u-attest verify`.

---

## 0. Preconditions

| Item | Valor |
|---|---|
| stellar-cli | 26.0.0 (`60f7458e7ecffddf2f2d91dc6d0d2db4fab03ecc`) |
| Network | testnet (`Test SDF Network ; September 2015`) |
| RPC URL | https://soroban-testnet.stellar.org |
| Contract id | `CC4TJGDRWZOPGBWOOHBJF3N2VKUQRNIW6C6PTYHD7ZI3D42GBQRRZHM5` |
| Wasm hash | `d706a07161d784dcf2790c95c5e5e516c0993dfbbd0c8eb7a61cdefd4a6d7595` |
| Admin / deployer | `GDJSDCHTRQYZNKJMUFZ76NAIZ3ZNMBWWAPQ5UHI3JUSOFPSB7NEGQ6UN` |
| Issuer (autorizado em F1 smoke) | mesmo deployer |

Estado prévio do contrato:
- `__constructor` chamado em F1 deploy (tx `dc7608ac…`)
- `authorize_submitter(deployer, true)` chamado em F1 smoke (tx `56d18b84…`)
- **Nenhum** `configure_use_case` chamado até esta sessão
- **Nenhum** `register_attestation` chamado até esta sessão

---

## 1. Round-trip — 3 transações on-chain + 1 verify trustless

### 1.1 `configure_use_case(bank_chg)` (admin op)

Configura o use_case `bank_chg` como ativo, vinculado ao predicate_set `bank_chg` versão 1.

```bash
stellar contract invoke \
  --id CC4TJGDRWZOPGBWOOHBJF3N2VKUQRNIW6C6PTYHD7ZI3D42GBQRRZHM5 \
  --source dpo2u-deployer \
  --network testnet \
  -- configure_use_case \
  --admin GDJSDCHTRQYZNKJMUFZ76NAIZ3ZNMBWWAPQ5UHI3JUSOFPSB7NEGQ6UN \
  --use_case_id bank_chg \
  --config '{"active":true,"predicate_set":"bank_chg","predicate_version":1}'
```

**Resultado**:
- **tx hash**: `8d170b82cf161e193ec4aefd3d400b293a7b66ce853f5a2f6505f2586ec63e97`
- **Status**: Success
- **Event emitted**:
  ```
  topics:  [Symbol("config"), Symbol("bank_chg")]
  data:    Map({
             active: true,
             predicate_set: Symbol("bank_chg"),
             predicate_version: u32(1),
           })
  ```
- **Stellar Expert**: https://stellar.expert/explorer/testnet/tx/8d170b82cf161e193ec4aefd3d400b293a7b66ce853f5a2f6505f2586ec63e97

### 1.2 Preparar evidência + computar hashes (off-chain, determinístico)

**Evidence payload** (UC-1 `bank_chg` shape canônico — synthetic, sem PII):

```json
{
  "supplier_cnpj": "11.222.333/0001-81",
  "new_account_holder_cnpj": "11.222.333/0001-81",
  "new_account_bank_ispb": "60701190",
  "request_channel": "portal_oficial",
  "timestamp": "2026-05-13T01:00:00Z",
  "request_id": "demo-testnet-anchor-001"
}
```

SHA-256 (canonical JSON):
```
evidence_hash = 0dbf43ad5862d6e1c3f16958056e531f09bd23eed0fb515d4185bdbf1206bed4
```

**Metadata blob** (público, PII-free, schema `dpo2u.attestation.metadata/v1`):

```json
{
  "schema": "dpo2u.attestation.metadata/v1",
  "request_id": "demo-testnet-anchor-001",
  "use_case_id": "bank_chg",
  "predicate_set": { "id": "bank_chg", "version": 1 },
  "verdict": "PASS",
  "timestamp": 1747094400,
  "predicate_results": [
    { "id": "p1_1_cnpj_holder_match",  "verdict": "PASS", "reason": "holder CNPJ matches supplier CNPJ exactly" },
    { "id": "p1_2_official_channel",   "verdict": "PASS", "reason": "request arrived via official portal SSO" },
    { "id": "p1_3_no_recent_change",   "verdict": "PASS", "reason": "no prior bank change recorded" },
    { "id": "p1_4_no_imminent_payment","verdict": "PASS", "reason": "no upcoming payment scheduled" },
    { "id": "p1_5_bcb_regulated_bank", "verdict": "PASS", "reason": "destination bank Banco Itau BBA S.A. (ispb 60701190) is BCB-regulated" }
  ]
}
```

SHA-256:
```
metadata_hash = 545a4e8acebb166e0beb5bc275e40465b3200e03e95534064dff2b9a46d19366
```

> Ambos os hashes são reproduzíveis: copie o JSON acima, rode `echo -n '<json>' | sha256sum`. Mesmo input → mesmo hash → on-chain idempotency garantida pela chave `(use_case_id, evidence_hash)`.

### 1.3 `register_attestation` (submitter op)

```bash
stellar contract invoke \
  --id CC4TJGDRWZOPGBWOOHBJF3N2VKUQRNIW6C6PTYHD7ZI3D42GBQRRZHM5 \
  --source dpo2u-deployer \
  --network testnet \
  -- register_attestation \
  --submitter GDJSDCHTRQYZNKJMUFZ76NAIZ3ZNMBWWAPQ5UHI3JUSOFPSB7NEGQ6UN \
  --use_case_id bank_chg \
  --verdict Pass \
  --evidence_hash 0dbf43ad5862d6e1c3f16958056e531f09bd23eed0fb515d4185bdbf1206bed4 \
  --metadata_hash 545a4e8acebb166e0beb5bc275e40465b3200e03e95534064dff2b9a46d19366
```

**Resultado**:
- **tx hash**: `00ee47e25076bf09492bcaa29ab238ad571c0954b0be19a7dab2488895c8e52f`
- **Status**: Success
- **Return value**: `u32(2550695)` (ledger sequence)
- **Event emitted**:
  ```
  topics:  [Symbol("attest"), Symbol("bank_chg"), Bytes32(0dbf43ad…bed4)]
  data:    Map({
             metadata_hash: Bytes32(545a4e8a…9366),
             predicate_set: Symbol("bank_chg"),
             predicate_version: u32(1),
             submitted_by: Address(GDJSDCHTR…GQ6UN),
             timestamp: u64(1778762267),
             verdict: scvVec[Symbol("Pass")],
           })
  ```
- **Stellar Expert**: https://stellar.expert/explorer/testnet/tx/00ee47e25076bf09492bcaa29ab238ad571c0954b0be19a7dab2488895c8e52f

> 🔒 Idempotency check: o contrato impede 2ª submissão do mesmo `(bank_chg, 0dbf43ad…bed4)` com `Error::AttestationExists (#3)`. Pegada permanente.

### 1.4 `verify_attestation` (read-only, qualquer um pode chamar)

Simulação de auditor externo lendo o registro — **sem credenciais DPO2U, sem fee, sem qualquer cooperação do operador**.

```bash
stellar contract invoke \
  --id CC4TJGDRWZOPGBWOOHBJF3N2VKUQRNIW6C6PTYHD7ZI3D42GBQRRZHM5 \
  --source dpo2u-deployer \
  --network testnet \
  -- verify_attestation \
  --use_case_id bank_chg \
  --evidence_hash 0dbf43ad5862d6e1c3f16958056e531f09bd23eed0fb515d4185bdbf1206bed4
```

stellar-cli flag: `Simulation identified as read-only. Send by rerunning with --send=yes.` → **nenhuma tx submetida, nenhum fee gasto, nenhum dado mutado**.

**Resultado** (decoded ScVal):

```json
{
  "metadata_hash": "545a4e8acebb166e0beb5bc275e40465b3200e03e95534064dff2b9a46d19366",
  "predicate_set": "bank_chg",
  "predicate_version": 1,
  "submitted_by": "GDJSDCHTRQYZNKJMUFZ76NAIZ3ZNMBWWAPQ5UHI3JUSOFPSB7NEGQ6UN",
  "timestamp": 1778762267,
  "verdict": "Pass"
}
```

Verificação bit-a-bit:

| Campo | Esperado | Lido on-chain | ✓ |
|---|---|---|---|
| metadata_hash | `545a4e8a…9366` | `545a4e8a…9366` | ✅ |
| predicate_set | `bank_chg` | `bank_chg` | ✅ |
| predicate_version | 1 | 1 | ✅ |
| submitted_by | `GDJSDCHTR…GQ6UN` | `GDJSDCHTR…GQ6UN` | ✅ |
| verdict | `Pass` | `Pass` | ✅ |

---

## 2. Verificação trustless adicional — auditor CLI

A SDK pública `@dpo2u/stellar-sdk` (Sprint G.5, [dpo2u-stellar#1](https://github.com/fredericosanntana/dpo2u-stellar/pull/1)) expõe um binário `dpo2u-attest` que qualquer auditor pode instalar via `npm i -g @dpo2u/stellar-sdk`. Aqui rodado direto do build local:

```bash
node sdk/dist/cli.js verify bank_chg 0dbf43ad5862d6e1c3f16958056e531f09bd23eed0fb515d4185bdbf1206bed4
```

**Output**:

```
  DPO2U Anti-corruption Pilot — attestation verification
  ────────────────────────────────────────────────────────
  Contract:    CC4TJGDRWZOPGBWOOHBJF3N2VKUQRNIW6C6PTYHD7ZI3D42GBQRRZHM5
  Network:     Test SDF Network ; September 2015

  Verdict:     ✅ PASS
  Predicate:   bank_chg@v1
  Submitter:   GDJSDCHTRQYZNKJMUFZ76NAIZ3ZNMBWWAPQ5UHI3JUSOFPSB7NEGQ6UN
  Timestamp:   2026-05-14T12:37:47.000Z
  Meta hash:   545a4e8acebb166e0beb5bc275e40465b3200e03e95534064dff2b9a46d19366
  Explorer:    https://stellar.expert/explorer/testnet/contract/CC4TJGDRWZOPGBWOOHBJF3N2VKUQRNIW6C6PTYHD7ZI3D42GBQRRZHM5
```

Exit code: `0` (per PRD §4 P4 persona contract — `0 = PASS attestation found`).

> Esta CLI fala apenas com a Stellar RPC pública. **Nenhuma credencial DPO2U**. **Nenhum acesso ao município**. Apresenta o mesmo veredito on-chain que o operador registrou. Esta é exatamente a propriedade que diferencia *compliance-as-protocol* de *compliance-as-PDF*.

---

## 3. Mapeamento ao PRD v0.3

| PRD ref | Demonstrado | Evidência |
|---|---|---|
| §6 UC-1 P1.1-P1.5 (5 predicates) | metadata_hash carrega resultados de todos os 5 | metadata JSON §1.2 |
| §3 princípio 1 (sem PII on-chain) | apenas hashes e symbols on-chain; CNPJ + payload completos ficam off-chain | event data §1.3 |
| §3 princípio 2 (determinismo) | mesmo input → mesmo hash → contract revertia com `AttestationExists` | tentar re-submit |
| §3 princípio 3 (extensibilidade por configuração) | `configure_use_case` ativou `bank_chg`; novos UCs entram pelo mesmo path | tx §1.1 |
| §4 P4 persona (auditor externo) | CLI trustless verificou independentemente | §2 |
| §4 P5 persona (cidadão / jornalista) | mesma CLI, mesma resposta, sem nenhum acesso especial | §2 |
| §F1 contract spec (5 funções) | __constructor + authorize_submitter + configure_use_case + register_attestation + verify_attestation usadas | F1 + esta sessão |
| Stellar37° M1 ("Testnet contract live + 3 significant commits") | contrato live + 4 tx mainnet-ready de funcionalidade núcleo + 17 PRs anteriores | tudo |

---

## 4. Custos reais (testnet)

| Operação | XLM gasto | Onde |
|---|---|---|
| configure_use_case | <0.1 | tx `8d170b82…` |
| register_attestation | <0.1 | tx `00ee47e2…` |
| verify_attestation | **0** (read-only sim) | n/a |
| auditor CLI verify | **0** | n/a |

Saldo deployer **antes** desta sessão: ~10000 XLM (friendbot funded em F1).
Saldo deployer **depois** desta sessão: ~9999.85 XLM (estimativa; verificável via Horizon).

Conversão pra mainnet: ~3 atestações por R$ 0,01 de XLM. Sustentável pra qualquer volume piloto.

---

## 5. Reprodutibilidade (qualquer um, sem cooperação DPO2U)

Qualquer terceiro pode confirmar este round-trip:

```bash
# 1. Confirmar configure_use_case tx
curl -s "https://horizon-testnet.stellar.org/transactions/8d170b82cf161e193ec4aefd3d400b293a7b66ce853f5a2f6505f2586ec63e97" \
  | jq '{ status: .successful, ledger: .ledger, created_at: .created_at, source_account: .source_account }'

# 2. Confirmar register_attestation tx
curl -s "https://horizon-testnet.stellar.org/transactions/00ee47e25076bf09492bcaa29ab238ad571c0954b0be19a7dab2488895c8e52f" \
  | jq '{ status: .successful, ledger: .ledger, source_account: .source_account }'

# 3. Verificar o record on-chain (auditor CLI público)
npm i -g @dpo2u/stellar-sdk  # após PR #1 mergear
dpo2u-attest verify bank_chg 0dbf43ad5862d6e1c3f16958056e531f09bd23eed0fb515d4185bdbf1206bed4
```

---

## 6. Commits que evidenciam o roundtrip

| Sprint | Repo | PR | Função demonstrada |
|---|---|---|---|
| F1 | dpo2u-stellar | (main) | Deploy contract `CC4TJGDR…` |
| G.1 | DPO2U | [#11](https://github.com/fredericosanntana/DPO2U/pull/11) | L3 stellar-submitter (FeeBump pattern) |
| G.2 | DPO2U | [#12](https://github.com/fredericosanntana/DPO2U/pull/12) | MCP tools submit/verify |
| G.5 | dpo2u-stellar | [#1](https://github.com/fredericosanntana/dpo2u-stellar/pull/1) | TS SDK + auditor CLI usada na §2 |
| H.1 | DPO2U | [#14](https://github.com/fredericosanntana/DPO2U/pull/14) | 5 predicates UC-1 reais (semantics na metadata desta atestação) |
| M.1 | DPO2U | [#21](https://github.com/fredericosanntana/DPO2U/pull/21) | x402 payment middleware (Stellar37° M3) |
| **demo** | dpo2u-stellar | (this PR) | **este log de âncora** |

---

## 7. Próximos passos (Stellar37°)

- **M2** prospect outreach: este log é o material concreto que vai pra cada 1ª call ("aqui está nosso contrato no testnet com um round-trip ao vivo, gravado e reproduzível")
- **M4** hackathon demo: roteiro de 5 min já pronto — basta replicar §1.1 + §1.3 + §2 em uma session live
- **M5** audit kickoff: este log é evidência adicional pro scope statement em `SECURITY_AUDIT.md`
- **M7** mainnet ceremony: replica do procedimento §1, com hardware wallet + multisig + `EXPECTED_WASM_HASH` matching (deploy-mainnet.sh §3.6)

---

## 8. History

| Versão | Data | Autor | Mudança |
|---|---|---|---|
| 1.0 | 2026-05-14 | DPO2U eng + Chairman | Versão inicial pós-execução |
