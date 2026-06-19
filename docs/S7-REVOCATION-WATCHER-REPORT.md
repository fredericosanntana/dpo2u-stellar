# S7 — Revocation Watcher / Worker Report

**Data:** 2026-06-18  
**Status:** `confirmed`

## Resumo executivo

A S7 fechou o gap operacional principal que restava após a S6: agora existe um worker executável e idempotente capaz de observar um caso do `protocol-registry`, detectar revogação e executar automaticamente a blocked-lane no `asp-non-membership`.

## Worker materializado

Script:
- `integration/spp-adapter/scripts/run_revocation_watcher.py`

Comportamento:
1. extrai a decisão live do registry;
2. se a attestation ainda está ativa/verificada, faz `no-op-active`;
3. se a attestation já está revogada, prepara a blocked action;
4. verifica se a key já estava bloqueada;
5. executa `insert_leaf` apenas quando necessário;
6. persiste um record idempotente.

## Caso de prova final

### Registry
| Item | Valor |
|---|---|
| contract | `CAUDSMRKMZPZNCVHJZ3JFYVV2ZNK7TC7MFZCJNN75QUBZ2W4AYTEWTYP` |
| subject commitment | `0x0d0d…0d0d` |
| claim/jurisdiction | `kyc / BR` |
| attestation root | `0x0e0e…0e0e` |
| register tx | `678f05d098a9a227d752cd78754c86778901a6bb6250acc0e57482e46cd469cb` |
| revoke tx | `208a41b0437b728effb68df7a1692c2cedb5245b919be0ccb4eec436f79fbc51` |

### Operator key
| Item | Valor |
|---|---|
| note public key hex | `0x1104db8aeb04f20209069956ab4840fa943672e17c9ba7f878439d097538bb02` |
| note public key dec | `7697901041847652278373069429766641116678382066147338054927251606026390649602` |
| membership blinding | `999999999` |

## Prova do worker

### Rodada 1 — antes da revogação
Resultado:
- `status = no-op-active`
- nenhuma blocked action executada

Record:
- `integration/spp-adapter/examples/watcher-0d0d0d0d0d0d0d0d-kyc-br.watcher.record.json` (primeira versão)

### Rodada 2 — depois da revogação
Resultado:
- worker detectou `registry_verified=false` e `attestation_active=false`
- gerou a blocked action
- executou `insert_leaf` automaticamente

Blocked-lane tx:
- `0223660c0548b94c1dce9ea8c6b7c4ac4b4041a5fba147339ef10df31b278ada`

Estado final:
- `find_key(pk)` → `found=true`, `found_value=1`
- `verify_non_membership(pk, ...) == false`
- `root_before = 12167638434740738412350459348713108078053694686908743555288356863478133228669`
- `root_after = 9861249458501117131279585441979904682512680416410122145997957174983865950610`

### Rodada 3 — rerun idempotente
Resultado:
- `blocked_before = true`
- `insert_executed = false`
- `root_before == root_after`
- nenhuma duplicação do bloqueio

## Artefatos
- `integration/spp-adapter/scripts/run_revocation_watcher.py`
- `integration/spp-adapter/examples/watcher-0d0d0d0d0d0d0d0d-kyc-br.active.json`
- `integration/spp-adapter/examples/watcher-0d0d0d0d0d0d0d0d-kyc-br.revoked.json`
- `integration/spp-adapter/examples/watcher-0d0d0d0d0d0d0d0d-kyc-br.blocked.prepared.json`
- `integration/spp-adapter/examples/watcher-0d0d0d0d0d0d0d0d-kyc-br.watcher.record.json`
- `docs/S7-REVOCATION-WATCHER.md`

## Conclusão

A S7 está fechada.

### Agora está provado
- existe worker executável;
- ele faz no-op quando a attestation ainda está ativa;
- ele bloqueia automaticamente após revogação;
- ele é idempotente em reruns.

### O que falta
- operar a instância externa auditada do `asp-non-membership` sem a key do admin dela, ou formalizar esse limite como boundary operacional final.
