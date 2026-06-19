# S3 — Registry → SPP Execution Spec

## Objetivo

Conectar uma decisão canônica do `protocol-registry` a uma execução real do adapter SPP sem mover a policy engine para dentro da landing zone do SPP.

## O que foi executado nesta S3

A S3 validou um bridge em quatro etapas:

1. **decision package shape** inspirado no `protocol-registry` (`registry-decision.example.json`)
2. **normalização** para `AdmissionDecisionInput` via `build_admission_from_registry.py`
3. **preparação** do leaf/payload via `prepare_insert_leaf.py`
4. **execução real** do `asp-membership.insert_leaf` na testnet auditada do SPP

## Lane congelada

| Campo | Valor |
|---|---|
| `claim_type` | `kyc` |
| `jurisdiction` | `BR` |
| `min_trust_tier` | `2` |
| `min_stake` | `1000` |
| target network | `testnet` |
| membership contract | `CBULZZIAHWL33XD5OBL2LBPYSFBYCNCOCIJITGJ74OSRRA7IZKIUBTKN` |
| non-membership contract | `CDREZXZILERCSD7VMS4SKVRQY4FNIYJCTYA2AY4TKFRV6Y3L3M2OK3O3` |

## Artefatos da execução

| Tipo | Caminho |
|---|---|
| decision package canônico | `integration/spp-adapter/examples/registry-decision.example.json` |
| normalized admission input | `integration/spp-adapter/examples/registry-verified-admission.example.json` |
| prepared record | `integration/spp-adapter/examples/executed-from-registry.prepared.json` |
| confirmed record | `integration/spp-adapter/examples/executed-from-registry.record.json` |
| transformer | `integration/spp-adapter/scripts/build_admission_from_registry.py` |
| mapping | `integration/spp-adapter/spec/decision-to-admission-mapping.md` |

## Evidência executada

| Item | Valor |
|---|---|
| `membership_leaf_dec` | `1520050341710383583104687106204726168507110032311949978306657155685631797131` |
| `root_before` | `19245902434736527897415462227423823215302591791930935735232744133550686355488` |
| `tx_handle` | `9b57c112d780bb7a0a632218a136a67a3ebe0207791eb32fca02a714b2d8f0d6` |
| `event_index` | `8` |
| `root_after` | `3112493447093092447340008945066405796186336486671058006004419926999845738659` |
| explorer | `https://stellar.expert/explorer/testnet/tx/9b57c112d780bb7a0a632218a136a67a3ebe0207791eb32fca02a714b2d8f0d6` |

## Limite honesto desta S3

O lado `protocol-registry` desta S3 está **shape-real e semanticamente ancorado** em `contracts/protocol-registry/src/lib.rs` e `src/test.rs`, mas o package usado aqui ainda é um **decision package de exemplo**, não uma extração de um deployment vivo do registry.

Portanto, esta S3 prova:
- o bridge documental e técnico entre o registry canônico e o adapter;
- a transformação determinística para `AdmissionDecisionInput`;
- a execução real do lado SPP.

Ela **não prova ainda**:
- leitura automática a partir de um deployment vivo do `protocol-registry`;
- revogação automatizada já conectada ao `asp-non-membership`.
