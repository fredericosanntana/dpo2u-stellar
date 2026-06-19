# Architecture — B-First Control Plane

**Status:** draft técnico  
**Data:** 2026-06-18

## Resumo executivo

A arquitetura atual da DPO2U deve ser lida em três planos:

1. **Control Plane** — governa policy, narrativa, autoridade, evidência e operação;
2. **Data Plane** — executa leitura de revogação, preparação de action package e blocked-lane na instância própria;
3. **External Audit Boundary** — expõe comparabilidade pública e futura convergência institucional, sem autoridade de mutação pela DPO2U nesta fase.

A decisão B-first não substitui a arquitetura; ela **explicita** a arquitetura que já emergiu das sprints S5–S8.

---

## 1. Componentes

### 1.1 Source of policy truth
- `protocol-registry`
- origem da decisão canônica: ativa / revogada

### 1.2 Extraction layer
- `integration/spp-adapter/scripts/extract_live_registry_decision.py`
- extrai snapshot usável da decisão live

### 1.3 Translation layer
- `integration/spp-adapter/scripts/prepare_non_membership_from_registry.py`
- converte decisão revogada em blocked action canônica

### 1.4 Execution layer
- `integration/spp-adapter/scripts/run_revocation_watcher.py`
- observa, decide no-op vs execução, persiste record

### 1.5 Operational blocked lane
- own `asp-non-membership`
- contrato: `CAEJBGQDGTFZ5DGRZZ5SYPSFUWRI4IX2V3KMDLS5ANUAI4TX52RTEUUS`

### 1.6 External audit boundary
- external audited `asp-non-membership`
- contrato: `CDREZXZILERCSD7VMS4SKVRQY4FNIYJCTYA2AY4TKFRV6Y3L3M2OK3O3`

---

## 2. Plane separation

## 2.1 Control Plane

### Responsabilidades
- congelar claims públicos;
- governar autoridade/admin da lane oficial;
- manter runbooks e readiness;
- manter trilha de evidência;
- responder a incidentes e dúvidas de auditoria;
- definir se/quando migrar para A.

### Artefatos atuais que já funcionam como control-plane seeds
- `docs/S5-ASP-NON-MEMBERSHIP-BLOCKED-LANE-REPORT.md`
- `docs/S6-REGISTRY-REVOKE-TO-BLOCKED-LANE-REPORT.md`
- `docs/S7-REVOCATION-WATCHER-REPORT.md`
- `docs/S8-EXTERNAL-ASP-BOUNDARY-REPORT.md`
- `integration/spp-adapter/examples/*.record.json`

## 2.2 Data Plane

### Responsabilidades
- ler o registry;
- decidir se o caso está ativo ou revogado;
- preparar a blocked action;
- executar `insert_leaf` quando necessário;
- evitar duplicação via idempotência;
- registrar output verificável.

### Invariantes desejadas
- se a decisão está ativa, o worker faz `no-op-active`;
- se a decisão está revogada e a key ainda não está bloqueada, o worker executa insert;
- se a key já está bloqueada, o worker não duplica mutação;
- todo resultado relevante gera record persistido.

## 2.3 External Audit Boundary

### Responsabilidades
- leitura pública;
- simulação/verificação externa;
- comparabilidade de estado;
- futura convergência institucional.

### Não-responsabilidades nesta fase
- executar a blocked-lane pela DPO2U;
- servir como lane operacional oficial;
- substituir a autoridade da instância própria.

---

## 3. Fluxo principal

1. uma decisão do `protocol-registry` é produzida/consultada;
2. a camada de extração gera um snapshot live;
3. o worker avalia:
   - `registry_verified`
   - `attestation_active`
4. se ativo → `no-op-active`;
5. se revogado → gerar package para non-membership;
6. checar `find_key` na lane própria;
7. se ainda não bloqueado → `insert_leaf`;
8. persistir record com estado, tx e root relevante.

---

## 4. State model mínimo

### Estados úteis
- `active`
- `revoked`
- `prepared`
- `blocked`
- `idempotent-rerun`
- `boundary-external-readonly`

### Interpretação
- `active`: registry ainda válido, nenhuma blocked action executada;
- `revoked`: registry invalidado;
- `prepared`: blocked package pronto para execução;
- `blocked`: key presente na blocked-lane operacional;
- `idempotent-rerun`: reprocessamento sem nova mutação;
- `boundary-external-readonly`: instância externa observável, não mutável por nós.

---

## 5. Trust boundaries

### Boundary 1 — registry truth
Confiamos no `protocol-registry` como origem de decisão canônica do caso.

### Boundary 2 — operator execution
Confiamos no operador/watcher da DPO2U para transformar decisão revogada em mutação na lane própria.

### Boundary 3 — external audited lane
Não presumimos autoridade. Apenas leitura e comparabilidade.

---

## 6. Why B-first is architecturally coherent

B-first não é um remendo porque:
- o data plane já provou execução completa;
- o control plane já existe em embrião via reports/records/runbooks;
- o boundary externo já está explicitado por evidência;
- o gap remanescente é governança, não falta de componente técnico essencial.

---

## 7. Questions this architecture answers

### “Onde está o enforcement real?”
Na instância própria do `asp-non-membership`.

### “Onde está a decisão canônica?”
No `protocol-registry`.

### “Onde está a automação?”
No watcher/worker do adapter.

### “Onde está a auditoria externa?”
Na instância externa auditada e nos artefatos persistidos.

### “Onde está o gap?”
Na autoridade institucional para convergir execução para a lane externa.

---

## 8. Próximo endurecimento arquitetural

1. documentar trust boundaries com mais detalhe;
2. padronizar records e runbooks;
3. tornar o watcher schedulable/monitorável;
4. preparar equivalência e playbook para eventual convergência A.

## Veredito
A arquitetura correta nesta fase é:
- **policy truth no registry**;
- **execution truth na lane própria**;
- **audit/comparability truth na boundary externa**.
