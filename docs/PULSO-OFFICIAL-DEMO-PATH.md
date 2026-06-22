# Pulso — Official Demo Path

**Data:** 2026-06-22  
**Status:** proposto como caminho oficial de demo  
**Objetivo:** congelar o caminho de demonstração do Pulso para evitar dispersão, overengineering e conflito entre narrativa ASP/SPP, ZK e DeFindex.

---

## 1. Executive decision

O **demo path oficial do Pulso** deve ser:

> **registry-backed admission + blocked-lane enforcement na lane própria ASP/SPP da DPO2U, usando o slice DeFindex apenas como evidência de suporte da mesma primitive em ação privilegiada real.**

Em termos simples:
- **narrativa principal:** ASP/SPP
- **mecanismo principal:** admissibilidade + revogação + blocked-lane
- **prova principal:** lane própria B-first, replayável, sob nossa autoridade
- **evidência de suporte:** DeFindex mostra que a mesma primitive também segura privileged action em Stellar

---

## 2. Why this is the right path

### 2.1 É o caminho mais honesto
A documentação atual do repo já fecha uma verdade operacional forte:
- a DPO2U **opera uma lane própria verificável**;
- a revogação canônica do registry **já acopla** ao blocked-lane;
- o watcher já existe e é idempotente;
- o boundary externo já foi provado como **read/audit only** sem admin authority.

Isso está ancorado em:
- `docs/B-FIRST-OPERATING-MODE.md`
- `docs/S4-LIVE-REGISTRY-TO-SPP-REPORT.md`
- `docs/S8-EXTERNAL-ASP-BOUNDARY-REPORT.md`

### 2.2 É o caminho mais soberano
O hackathon não deve depender de:
- permissão operacional de terceiro;
- API privilegiada de parceiro;
- governança externa ainda não concedida.

A lane própria B-first resolve isso.

### 2.3 É o caminho com melhor disciplina narrativa
Se o Pulso tentar virar ao mesmo tempo:
- ASP/SPP demo,
- proof-bound treasury control,
- full institutional DeFi stack,
- e ZK architecture showcase,

vamos diluir a mensagem.

O demo path oficial precisa responder uma pergunta só:

> **como a DPO2U controla admissão e bloqueio verificável numa lane institucional em Stellar?**

---

## 3. Core story to tell

A história oficial do Pulso deve ser:

1. uma decisão/política canônica nasce no registry;
2. essa decisão permite admissão na lane positiva;
3. enquanto a decisão está válida, a lane segue liberada;
4. quando a decisão é revogada, a blocked-lane é acionada;
5. o re-entry falha e a mudança fica verificável on-chain;
6. tudo isso acontece numa lane real, replayável e sob controle operacional da DPO2U.

### One-line pitch

> **DPO2U turns registry-backed compliance decisions into verifiable admission and revocation enforcement on Stellar.**

### One-line pitch em PT-BR

> **A DPO2U transforma decisões de compliance ancoradas em registry em admissão e bloqueio verificáveis on-chain na Stellar.**

---

## 4. Official demo structure

## Stage 1 — Context framing
### O que dizer
- a DPO2U não está vendendo “compliance em PDF”;
- está mostrando um **gate operacional verificável**;
- o lane oficial nesta fase é **B-first**: execução própria + boundary externo auditável.

### Artefato-base
- `docs/B-FIRST-OPERATING-MODE.md`

### Mensagem-chave
> controlamos a lane operacional real; não inventamos autoridade sobre a lane externa.

---

## Stage 2 — Live registry truth
### O que mostrar
- registry vivo em testnet;
- claim scope / jurisdiction / issuer constraints configurados;
- attestation viva registrada e verificável.

### Artefato-base
- `docs/S4-LIVE-REGISTRY-TO-SPP-REPORT.md`

### Mensagem-chave
> a política não é decorativa; ela já existe como origem canônica da decisão.

---

## Stage 3 — Admission into the lane
### O que mostrar
- extração live da decisão do registry para os artefatos do bridge;
- admissão executada na lane ASP/SPP;
- leaf/root/resultados registrados.

### Artefatos-base
- `integration/spp-adapter/examples/live-registry-decision.json`
- `integration/spp-adapter/examples/live-registry-admission.json`
- `integration/spp-adapter/examples/live-registry-executed.record.json`

### Mensagem-chave
> uma decisão canônica virou admissão operacional verificável.

---

## Stage 4 — Canonical revocation
### O que mostrar
- revogação canônica no registry;
- `verify_attestation_proof(...) == false`;
- `is_attestation_active(...) == false`;
- nova tentativa de bridge falhando com `registry decision is not verified`.

### Artefato-base
- `docs/S4-LIVE-REGISTRY-TO-SPP-REPORT.md`

### Mensagem-chave
> a revogação não fica só no registro; ela muda o comportamento da lane.

---

## Stage 5 — Blocked-lane enforcement in our own operational instance
### O que mostrar
- blocked-lane aplicada na instância própria;
- watcher/worker idempotente;
- evidência persistida;
- re-execução segura/no-op quando aplicável.

### Artefatos-base
- `docs/S5-ASP-NON-MEMBERSHIP-BLOCKED-LANE-REPORT.md`
- `docs/S6-REGISTRY-REVOKE-TO-BLOCKED-LANE-REPORT.md`
- `docs/S7-REVOCATION-WATCHER-REPORT.md`

### Mensagem-chave
> a DPO2U não para em policy evaluation; ela chega ao enforcement lane-level.

---

## Stage 6 — Honest external boundary
### O que mostrar
- instância externa auditada pode ser lida;
- `insert_leaf`/`delete_leaf` exigem admin auth;
- portanto a unificação com a instância externa é tema de governança, não de integração técnica pendente.

### Artefato-base
- `docs/S8-EXTERNAL-ASP-BOUNDARY-REPORT.md`

### Mensagem-chave
> mantemos o boundary explícito e não overclaimamos autoridade inexistente.

---

## Stage 7 — Supporting evidence: DeFindex live slice
### O que mostrar
Não como demo principal. Mostrar como **prova lateral de robustez da tese**.

### Leitura correta
- a DPO2U já provou que consegue sentar no caminho de uma ação financeira privilegiada em Stellar;
- isso reforça que o pouso ASP/SPP não é uma reinvenção especulativa;
- é a aplicação institucional de uma primitive já exercitada em outra superfície real.

### Artefato-base
- `docs/DEFINDEX-PROOF-BOUND-EXECUTION-LIVE-SLICE.md`

### Mensagem-chave
> a mesma primitive já foi forte o bastante para gatear ação privilegiada real; no Pulso, ela aparece como admissão e blocked-lane.

---

## 5. What should NOT be the official Pulso path

O Pulso **não** deve ser organizado como:

### 5.1 DeFindex-first pitch
Errado porque desloca o eixo da demo para operator/treasury action antes de fechar a narrativa de admissão/lane.

### 5.2 ZK architecture showcase
Errado porque o hackathon passa a parecer tese de pesquisa, não aplicação institucional convincente.

### 5.3 External-instance convergence story
Errado porque hoje isso depende de autoridade/governança não concedida.

### 5.4 Multi-product story
Errado porque parece que estamos mostrando:
- um produto de registry,
- um produto de SPP,
- um produto de treasury gating,
- um produto de ZK,

em vez de **uma primitive com diferentes superfícies**.

---

## 6. Canonical claim for Pulso

A claim oficial do Pulso deve ser esta:

> **DPO2U already operates a replayable, verifiable compliance lane on Stellar where canonical registry decisions drive admission and revocation consequences.**

Versão em PT-BR:

> **A DPO2U já opera uma lane replayável e verificável de compliance na Stellar, na qual decisões canônicas de registry dirigem admissão e consequências de revogação.**

---

## 7. Honest boundaries to repeat

Sempre repetir no Pulso:
- a lane oficial hoje é a **própria**;
- a instância externa é **auditável**, não operada por nós;
- a convergência externa depende de **governança**;
- o slice DeFindex é **supporting evidence**, não o centro da demo;
- o track ZK é uma **extensão da primitive**, não outro produto.

---

## 8. Minimal screen/demo order

Se for preciso reduzir a demo a 5 blocos, usar esta ordem:

1. **B-first operating truth**
2. **live registry decision**
3. **admission execution**
4. **revocation -> blocked-lane consequence**
5. **external boundary + DeFindex as supporting evidence**

---

## 9. Deliverable expected from this decision

Depois de congelar este path, o time deve produzir:
- um runbook único da demo do Pulso;
- uma ordem fixa de telas/comandos/evidências;
- uma versão curta de pitch de 30s;
- uma versão de 3 min;
- uma versão longa com Q&A de boundary honesto.

---

## 10. Final verdict

O **demo path oficial do Pulso** deve ser:

> **ASP/SPP B-first com registry-backed admission e revocation-driven blocked-lane, usando DeFindex apenas como evidência de que a primitive também governa ação privilegiada real em Stellar.**

Esse é o caminho com:
- maior honestidade;
- maior soberania operacional;
- menor risco de overengineering;
- melhor clareza institucional.
