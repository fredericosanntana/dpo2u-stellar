# B-First Operating Mode

**Status:** oficial  
**Data:** 2026-06-18

## Resumo executivo

A DPO2U adota, a partir desta fase, o modo **B-first**:

- a **instância própria** do `asp-non-membership` é a **lane operacional oficial**;
- a **instância externa auditada** é o **boundary de leitura/auditoria e comparabilidade**;
- a convergência para a Opção A depende de **governança/autorização formal**, não de descoberta técnica adicional.

## Objetivo do modo B-first

Permitir que a DPO2U:
- opere enforcement regulatório verificável agora;
- mantenha narrativa honesta no hackathon e no MVP;
- responda com clareza a perguntas de governança e arquitetura;
- preserve a possibilidade de migrar/convergir para uma lane institucional compartilhada depois.

## Verdade operacional congelada

### O que afirmamos
- Operamos uma lane própria e verificável de blocked-lane no `asp-non-membership`.
- O fluxo `protocol-registry revoke -> blocked-lane` já foi provado on-chain.
- Existe watcher/worker idempotente para observar revogação e aplicar bloqueio.
- A instância externa auditada é legível publicamente e útil para auditoria/comparabilidade.
- O gap remanescente para a Opção A é de **governança/admin authority**.

### O que não afirmamos
- Não afirmamos controlar a instância externa auditada.
- Não afirmamos executar `insert_leaf`/`delete_leaf` nela.
- Não afirmamos que a lane oficial já é compartilhada/canônica do ecossistema.
- Não afirmamos que o problema remanescente é técnico de integração.

## Lane operacional oficial

### Contrato operacional atual
- **Own ASP non-membership:** `CAEJBGQDGTFZ5DGRZZ5SYPSFUWRI4IX2V3KMDLS5ANUAI4TX52RTEUUS`

### Capacidades já provadas nesta lane
- blocked-lane real com `insert_leaf` e `delete_leaf`;
- `verify_non_membership` pré e pós-bloqueio;
- acoplamento a revogação canônica do `protocol-registry`;
- watcher executável e idempotente.

## Boundary externo

### Contrato externo auditado
- **External audited ASP non-membership:** `CDREZXZILERCSD7VMS4SKVRQY4FNIYJCTYA2AY4TKFRV6Y3L3M2OK3O3`

### Papel oficial dele nesta fase
- leitura pública;
- prova de comparabilidade;
- auditoria de estado;
- potencial futura convergência institucional.

### Limite oficial
Sem a admin/signing key correspondente, a DPO2U **não opera mutação** nessa instância.

## Modelo de operação

### Fluxo oficial
1. uma decisão do `protocol-registry` é lida/extraída;
2. se a decisão está ativa, o watcher faz `no-op`;
3. se a decisão está revogada, o action package de blocked-lane é preparado;
4. a blocked-lane é executada na instância própria;
5. um record de evidência é persistido.

### Fail-closed atual
Se não houver autoridade para mutação na instância alvo, não vendemos sucesso parcial como se fosse enforcement concluído.

## Frase curta oficial
> A DPO2U opera hoje uma lane própria, verificável e automatizável de enforcement regulatório on-chain; a convergência para uma instância externa compartilhada depende de autorização de governança, não de capacidade técnica ainda ausente.

## Uso recomendado por contexto

### Hackathon
Apresentar B-first como:
- decisão de execução soberana;
- prova operacional replayável;
- base honesta para evolução institucional posterior.

### Parceiro técnico
Apresentar B-first como:
- lane operacional sob nosso controle;
- boundary externo preservado para auditoria;
- trilha futura de migração/convergência documentada.

### Auditor / investidor
Apresentar B-first como:
- arquitetura com authority boundary explícito;
- governança ainda em hardening;
- ausência de overclaim sobre infra externa.

## Artefatos de referência
- `docs/S5-ASP-NON-MEMBERSHIP-BLOCKED-LANE-REPORT.md`
- `docs/S6-REGISTRY-REVOKE-TO-BLOCKED-LANE-REPORT.md`
- `docs/S7-REVOCATION-WATCHER-REPORT.md`
- `docs/S8-EXTERNAL-ASP-BOUNDARY-REPORT.md`

## Veredito
A Opção B deixa de ser fallback tácito e passa a ser o **modo operacional oficial da DPO2U nesta fase**.
