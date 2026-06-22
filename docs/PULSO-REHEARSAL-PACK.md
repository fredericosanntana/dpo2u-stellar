# Pulso — Rehearsal Pack

**Data:** 2026-06-22  
**Status:** pacote operacional de ensaio e palco  
**Base:** `docs/PULSO-LIVE-DEMO-SCRIPT.md` + `docs/PULSO-JUDGE-MODE-CARD.md`

---

## 1. Objetivo

Este documento não redefine a narrativa. Ele resolve a operação da apresentação.

Serve para:
- organizar a demo antes da call/palco;
- reduzir risco de travar em arquivo, terminal ou mudança de aba;
- definir recovery paths rápidos;
- deixar a performance repetível.

---

## 2. Operating principle

A demo não deve depender de improviso técnico.

Ela deve depender de:
1. **ordem fixa de janelas**;
2. **frases decoradas por bloco**;
3. **fallback explícito**;
4. **corte consciente de blocos menos importantes antes dos centrais**.

---

## 3. Ordem de prioridade dos blocos

## Blocos que nunca podem cair
1. framing B-first
2. registry vivo
3. admissão
4. revogação
5. blocked-lane / consequência operacional
6. boundary honesto

## Blocos que podem ser encurtados
7. watcher detalhado
8. helper detalhado

## Bloco sacrificável se faltar tempo
9. DeFindex supporting evidence

---

## 4. Layout de tela recomendado

## Janela 1 — docs principais
Usar para a narrativa central.

### Abas na ordem exata
1. `docs/PULSO-JUDGE-MODE-CARD.md`
2. `docs/PULSO-LIVE-DEMO-SCRIPT.md`
3. `docs/B-FIRST-OPERATING-MODE.md`
4. `docs/S4-LIVE-REGISTRY-TO-SPP-REPORT.md`
5. `docs/S5-ASP-NON-MEMBERSHIP-BLOCKED-LANE-REPORT.md`
6. `docs/S6-REGISTRY-REVOKE-TO-BLOCKED-LANE-REPORT.md`
7. `docs/S7-REVOCATION-WATCHER-REPORT.md`
8. `docs/S8-EXTERNAL-ASP-BOUNDARY-REPORT.md`
9. `docs/DEFINDEX-PROOF-BOUND-EXECUTION-LIVE-SLICE.md`

## Janela 2 — artefatos / explorer / terminal de apoio
Usar só quando precisar mostrar evidência bruta.

### Abas ou arquivos prontos
1. `integration/spp-adapter/examples/live-registry-decision.json`
2. `integration/spp-adapter/examples/live-registry-admission.json`
3. `integration/spp-adapter/examples/live-registry-executed.record.json`
4. `integration/spp-adapter/scripts/prepare_non_membership_from_registry.py`
5. `integration/spp-adapter/scripts/run_revocation_watcher.py`

## Janela 3 — opcional
Somente se for realmente usar:
- explorer / tx lookup
- README de apoio
- notas privadas do apresentador

### Regra
Se houver dúvida, **não usar Janela 3**.

---

## 5. Pre-flight checklist (T-15 min)

- [ ] abrir o repo em `/root/dpo2u-stellar`
- [ ] abrir `docs/PULSO-JUDGE-MODE-CARD.md`
- [ ] abrir `docs/PULSO-LIVE-DEMO-SCRIPT.md`
- [ ] abrir todos os relatórios S4/S5/S6/S7/S8
- [ ] abrir `docs/DEFINDEX-PROOF-BOUND-EXECUTION-LIVE-SLICE.md` por último
- [ ] abrir os 3 JSONs principais de admissão
- [ ] abrir os 2 scripts principais (`prepare_non_membership_from_registry.py`, `run_revocation_watcher.py`)
- [ ] decidir antes da call: **full demo** ou **judge mode**
- [ ] memorizar opener de 30s
- [ ] memorizar frase de boundary honesto
- [ ] memorizar frase final

---

## 6. Warm-up checklist (T-3 min)

- [ ] respirar e começar no modo mais simples possível
- [ ] confirmar que a primeira aba aberta é o `PULSO-JUDGE-MODE-CARD.md`
- [ ] confirmar que a segunda aba é o `PULSO-LIVE-DEMO-SCRIPT.md`
- [ ] deixar a mão pronta para pular diretamente do S4 para o S5
- [ ] decidir antecipadamente se o bloco DeFindex será mostrado ou cortado

---

## 7. Sequência exata de navegação — full demo

## Step 0 — abertura silenciosa
Antes de falar, já deixar visível:
- `docs/PULSO-JUDGE-MODE-CARD.md`

### Motivo
É o melhor anti-pânico: você começa com fala pronta.

---

## Step 1 — opener
### Tela
- `docs/PULSO-JUDGE-MODE-CARD.md`

### Fala
Usar o **30-second opener**.

### Quando avançar
Assim que acabar a frase “É compliance como infraestrutura operacional.”

### Próxima aba
- `docs/B-FIRST-OPERATING-MODE.md`

---

## Step 2 — B-first truth
### Tela
- `docs/B-FIRST-OPERATING-MODE.md`

### O que apontar
- lane própria oficial
- boundary externo auditável
- gap restante = governança

### Fala curta
> Hoje a lane oficial é a nossa. A externa é auditável, mas não operada por nós sem autoridade formal.

### Próxima aba
- `docs/S4-LIVE-REGISTRY-TO-SPP-REPORT.md`

---

## Step 3 — registry vivo
### Tela
- `docs/S4-LIVE-REGISTRY-TO-SPP-REPORT.md`

### O que apontar
- contract id
- register tx
- revoke tx
- `verify=true/false`

### Fala curta
> Aqui a verdade canônica nasce: registro vivo, verificação viva e revogação viva.

### Próxima aba
- voltar rapidamente para Janela 2 com os JSONs

---

## Step 4 — admissão
### Tela
- `live-registry-decision.json`
- `live-registry-admission.json`
- `live-registry-executed.record.json`

### O que apontar
- a decisão saiu do registry
- virou artefato operacional
- gerou admissão materializada

### Fala curta
> A decisão canônica sai do registry e vira admissão operacional na lane.

### Próxima aba
- voltar a `docs/S4-LIVE-REGISTRY-TO-SPP-REPORT.md`

---

## Step 5 — revogação
### Tela
- `docs/S4-LIVE-REGISTRY-TO-SPP-REPORT.md`

### O que apontar
- revogação executada
- `verify_attestation_proof(...) == false`
- `is_attestation_active(...) == false`
- falha de nova tentativa de bridge

### Fala curta
> Quando a decisão é revogada, a lane muda de comportamento.

### Próxima aba
- `docs/S5-ASP-NON-MEMBERSHIP-BLOCKED-LANE-REPORT.md`

---

## Step 6 — blocked-lane isolada
### Tela
- `docs/S5-ASP-NON-MEMBERSHIP-BLOCKED-LANE-REPORT.md`

### O que apontar
- instância própria
- insert tx
- delete tx
- before/after do `verify_non_membership`

### Fala curta
> A blocked-lane já foi provada de forma isolada: antes passa, depois bloqueia, depois reverte.

### Próxima aba
- `docs/S6-REGISTRY-REVOKE-TO-BLOCKED-LANE-REPORT.md`

---

## Step 7 — revoke -> blocked-lane
### Tela
- `docs/S6-REGISTRY-REVOKE-TO-BLOCKED-LANE-REPORT.md`

### O que apontar
- helper materializado
- revoke tx
- blocked insert tx

### Fala curta
> A revogação canônica já vira consequência operacional de bloqueio.

### Próxima aba
- `docs/S7-REVOCATION-WATCHER-REPORT.md`

---

## Step 8 — watcher
### Tela
- `docs/S7-REVOCATION-WATCHER-REPORT.md`

### O que apontar
- rodada 1 = no-op-active
- rodada 2 = bloqueio
- rodada 3 = rerun sem duplicação

### Fala curta
> O worker já sabe quando não agir, quando bloquear e como evitar duplicação.

### Próxima aba
- `docs/S8-EXTERNAL-ASP-BOUNDARY-REPORT.md`

---

## Step 9 — boundary honesto
### Tela
- `docs/S8-EXTERNAL-ASP-BOUNDARY-REPORT.md`

### O que apontar
- leitura pública funciona
- mutação exige admin key
- gap = governança

### Fala curta
> A lane externa é legível, mas não controlada por nós sem autoridade formal. Então não inventamos permissão inexistente.

### Próxima aba
- opcional: `docs/DEFINDEX-PROOF-BOUND-EXECUTION-LIVE-SLICE.md`

---

## Step 10 — supporting evidence DeFindex
### Tela
- `docs/DEFINDEX-PROOF-BOUND-EXECUTION-LIVE-SLICE.md`

### Regra
Só mostrar se houver tempo e o público já tiver entendido a narrativa principal.

### Fala curta
> E a mesma primitive já foi forte o bastante para sentar no caminho de uma ação privilegiada real em DeFindex.

### Fechamento
Voltar para fala final, sem abrir mais nada.

---

## 8. Recovery paths

## Caso 1 — travou JSON/terminal
### Fazer
- abandonar a aba técnica imediatamente
- voltar para o relatório correspondente (`S4`, `S6` ou `S7`)

### Falar
> Em vez de abrir o artefato bruto, vou apontar a evidência já consolidada no relatório correspondente.

## Caso 2 — tempo encurtou no meio
### Cortar nesta ordem
1. DeFindex
2. detalhe do watcher
3. detalhe do helper

### Nunca cortar
- framing B-first
- registry
- admissão
- revogação
- boundary honesto

## Caso 3 — pergunta puxou para ZK cedo demais
### Responder
> ZK aqui é extensão da primitive, não o centro da demo do Pulso. O centro do Pulso é registry-backed admission e blocked-lane verificável.

## Caso 4 — pergunta puxou para “vocês operam a instância externa?”
### Responder
> Não. A instância externa é auditável; a lane oficial atual é a nossa própria. A convergência externa depende de governança.

## Caso 5 — nervosismo / branco
### Fazer
- voltar para `docs/PULSO-JUDGE-MODE-CARD.md`
- usar o opener de 30s ou o close de 10s

---

## 9. Judge mode — navegação mínima

### Ordem
1. `docs/PULSO-JUDGE-MODE-CARD.md`
2. `docs/B-FIRST-OPERATING-MODE.md`
3. `docs/S4-LIVE-REGISTRY-TO-SPP-REPORT.md`
4. `docs/S8-EXTERNAL-ASP-BOUNDARY-REPORT.md`

### Regra
Não abrir JSONs, scripts nem DeFindex em judge mode, salvo pergunta explícita.

---

## 10. Backup mode — navegação mínima

### Ordem
1. `docs/PULSO-JUDGE-MODE-CARD.md`
2. `docs/S4-LIVE-REGISTRY-TO-SPP-REPORT.md`
3. `docs/S6-REGISTRY-REVOKE-TO-BLOCKED-LANE-REPORT.md`
4. `docs/S7-REVOCATION-WATCHER-REPORT.md`
5. `docs/S8-EXTERNAL-ASP-BOUNDARY-REPORT.md`

### Regra
Se a call estiver ruim, ficar 100% em docs consolidadas. Não depender de detalhe bruto.

---

## 11. Memorization anchors

Memorizar exatamente estas 4 linhas:

### Linha 1 — opener
> A DPO2U transforma decisões canônicas de compliance em consequências operacionais verificáveis on-chain.

### Linha 2 — núcleo
> No Pulso, a cadeia principal é registry, admissão, revogação e blocked-lane.

### Linha 3 — boundary
> A instância externa é auditável, mas a lane oficial hoje é a nossa própria.

### Linha 4 — close
> Não é compliance em PDF. É compliance como comportamento de infraestrutura.

---

## 12. Final rule

Se algo falhar, **simplificar sem mudar a verdade**.

Nunca improvisar claim maior para compensar falha operacional.
