# S4 — Live Registry → SPP — Execution Report

**Data:** 2026-06-18  
**Status:** `live-registry extraction verified + live admission executed + canonical revocation executed`

## Resumo executivo

A S4 substituiu com sucesso o `decision package` de exemplo da S3 por uma extração a partir de um `protocol-registry` vivo criado e operado nesta própria testnet.

Isso fecha três provas novas:

1. **deploy vivo do registry** em testnet;
2. **extração live** da decisão canônica para JSON de bridge;
3. **revogação canônica executada** com bloqueio efetivo do re-entry no adapter.

## Registry vivo criado

| Item | Valor |
|---|---|
| contract id | `CAUDSMRKMZPZNCVHJZ3JFYVV2ZNK7TC7MFZCJNN75QUBZ2W4AYTEWTYP` |
| upload tx | `6d13d49e4115f0e9a6ad969473e68814006c4d06a81ad680aaabb0d6890ddf6e` |
| deploy tx | `fe61dc28a86246318b4ca53df00d68e8d99db779686999b1eb1961522a60a988` |
| wasm hash | `be7be266cbcbdd92bb0bdbec45f9948cdb3a49fc886742e1080aa5158183717c` |
| deploy metadata | `scripts/deploy-protocol-registry-testnet.json` |

## Lane viva armada no registry

- issuer profile ativo: `trust_tier = 2`
- claim scope: `kyc = true`
- jurisdiction scope: `BR = true`
- stake creditado: `5000`
- policy lane: `active = true`, `min_trust_tier = 2`, `min_stake = 1000`

### Txs da configuração
- `configure_issuer_profile`: `35f4e507eb88362f53578d5f543b10844f927b1bd674d85f76c05dc8396da4fb`
- `set_issuer_claim_scope`: `8711e1b1cb3e052219c57915d135d9eb4cd6f60c31894f16b84c2dc8fdbe1e13`
- `set_issuer_jurisdiction_scope`: `97484d2c7c37d03d17ed8a92740199fa513df5871c4c4d7816b48560ea64f08a`
- `credit_issuer_stake`: `9b6755c82e5c0b53391430fc404852b59a848512a629ca0424d0e1d9c7c3e00f`
- `set_policy_stake`: `2053708a33ba8bb1cb88add0fea13819f61eb1fc45215a98b6488f319883de7a`

## Attestation viva registrada

| Item | Valor |
|---|---|
| subject commitment | `0x0707...0707` |
| claim type | `kyc` |
| jurisdiction | `BR` |
| attestation root | `0x0909...0909` |
| register tx | `6cccfcd60ff1a818730c287e92729f98f9c425d911d3601ac3e02cdb86caac00` |
| verify result | `true` |
| active result | `true` |

## Bridge live → SPP executado

### Artefatos
- `integration/spp-adapter/examples/live-registry-decision.json`
- `integration/spp-adapter/examples/live-registry-admission.json`
- `integration/spp-adapter/examples/live-registry-executed.prepared.json`
- `integration/spp-adapter/examples/live-registry-executed.record.json`

### Execução SPP
| Item | Valor |
|---|---|
| membership leaf dec | `3871082018245165477559437847806445936377965106787990480414602868505781126891` |
| root before | `3112493447093092447340008945066405796186336486671058006004419926999845738659` |
| insert tx | `070ac69a39fc394d7f162b392e1868c16a9aed26b48f9ff785ebbb90977de8f9` |
| event index | `9` |
| root after | `6364575985414069761033481363863949771522450256224246499636173165731378662774` |

## Revogação canônica executada

### Tx
- `0987dd69f909c7a4a0ec4270b53d8399e0d9032b8f75eccc6e5e4b4edeec101e`

### Efeito observado
- `verify_attestation_proof(...) == false`
- `is_attestation_active(...) == false`
- nova tentativa de bridge falhou com: `registry decision is not verified`

### Artefatos
- `integration/spp-adapter/examples/live-registry-decision.revoked.json`
- `integration/spp-adapter/examples/live-registry-revocation.record.json`

## Limite honesto restante

A S4 **não** executou ainda a ação do blocked-lane no `asp-non-membership`.

O que ela fechou foi:
- revogação canônica viva no registry;
- bloqueio efetivo de reentrada no bridge;
- documentação do próximo passo operacional.

Portanto, a próxima sprint correta é:

## S5 — non-membership / blocked-lane execution

Entregável mínimo da S5:
- helper operacional para lane `asp-non-membership`;
- payload preparado;
- execução on-chain comprovada;
- record de blocked-lane com tx hash e evidência.
