# Fase 2 — Claim boundary

**Status:** boundary canônico da Fase 2  
**Objetivo:** congelar o que a Fase 2 permitirá dizer, o que continuará bloqueado e quais pontos ainda dependem de surface externa, partner alignment ou hardening futuro.  
**Relacionado:** `docs/PHASE2-OPERATOR-SAFEGUARDS-PRD.md`, `docs/S5-PARTNER-LEGAL-VALIDATION-PACK.md`

## Resumo executivo

A Fase 2 amplia a claim da DPO2U em DeFindex/Stellar, mas **não** muda a natureza fundamental do fit.

O fit continua sendo:

> **operator-side privileged execution com evidência regulatória/verificável ligada à decisão de allow/deny.**

O que a Fase 2 faz é adicionar quatro camadas em volta desse seam:

- operator admission posture;
- safeguards posture;
- reporting evidence loop;
- Travel Rule adjacente.

## Claim principal recomendada após Fase 2

> a DPO2U já sustenta em DeFindex/Stellar uma camada operator/safeguards/reporting-aware que transforma política e evidência operacional em condição verificável de execução para ações institucionais privilegiadas.

## Claim curta recomendada

> DPO2U transforma postura regulatória e evidência operacional em condição verificável de execução institucional em Stellar.

## Matriz de claims da Fase 2

| claim | status-alvo pós-Fase 2 | condição para liberar | pode ir a público? |
|---|---|---|---|
| DPO2U sustenta operator admission para ações role-gated | **suportada se implementada e validada** | tipos + gateway + testes + report | **sim** |
| DPO2U sustenta safeguards-aware privileged execution | **suportada se implementada e validada** | tipos + gateway + testes + report | **sim** |
| DPO2U sustenta reporting evidence loop verificável | **suportada se implementada e validada** | hash/verdict/demo/report | **sim** |
| Travel Rule é tratada como circuito específico adjacente | **suportada como framing/docs** | doc canônico + boundary coerente | **sim, com cuidado** |
| DPO2U já é stack VASP/PSAV full | **não suportada** | exigiria fase posterior + surface + hardening | **não** |
| DPO2U já gateia depósitos retail nativamente na DeFindex | **não suportada** | falta surface real | **não** |
| DPO2U já cobre jornada transacional pública ponta a ponta | **não suportada** | falta surface/arquitetura adicional | **não** |
| solução pronta para produção regulada multi-jurisdição | **não suportada** | faltam partner/legal/prod controls | **não** |

## O que continua fora de escopo

Continuam fora de escopo mesmo após a Fase 2:

- deposit gating retail nativo;
- withdraw gating retail nativo;
- allowlist pública on-chain para usuários finais na DeFindex;
- equivalência entre operator gating e jornada pública completa;
- claim de cobertura regulatória total;
- readiness institucional multi-país para produção.

## O que pode subir de tom com segurança

Se a Fase 2 for fechada com evidência, pode subir de tom com segurança em três pontos:

### 1. Do “rebalance proof-bound” para “operator-aware execution layer”
Porque deixamos de provar só uma ação e passamos a provar admissibilidade/postura do operador.

### 2. Do “payload gating” para “safeguards-aware execution”
Porque a ação passa a depender também de uma postura operacional verificável.

### 3. Do “proof-bound action” para “evidence-aware operational control plane”
Porque reporting entra como loop verificável adicional.

## O que ainda depende de alinhamento externo

Mesmo com a Fase 2 implementada, ainda dependem de parceiro/jurídico:

- wording final para materiais externos mais agressivos;
- linguagem de PSAV/VASP por jurisdição;
- limites formais de operator surfaces públicas/experimentais da DeFindex;
- claims sobre readiness institucional mais ampla;
- qualquer statement que aproxime demais a solução de “camada regulatória completa”.

## Frases liberadas

### Frase institucional
> a DPO2U já demonstrou em Stellar/DeFindex que política de operador, safeguards e evidência operacional podem condicionar ações institucionais privilegiadas de forma verificável.

### Frase técnica
> a execução privilegiada pode ser bloqueada ou autorizada a partir de tipos canônicos de evidência, hash verificável e verdict fail-closed no gateway.

### Frase regulatória
> o framing continua em stack: LGPD como boundary de disclosure, PSAV/VASP como regime de operador e safeguards, CVM 175 como âncora de mandato e governança, e Travel Rule como circuito específico de mensageria/reporting.

## Frases proibidas

Não usar após a Fase 2, salvo nova evidência forte:

- “A DPO2U já é VASP full em DeFindex.”
- “A DeFindex inteira já está compliance-gated pela DPO2U.”
- “A DPO2U já resolve onboarding, custody, settlement e reporting end-to-end.”
- “Travel Rule resolve o enquadramento regulatório inteiro.”
- “A solução já está pronta para produção institucional regulada.”

## Perguntas abertas que a Fase 2 não resolve sozinha

1. Quais operator surfaces adicionais a DeFindex toparia tornar públicas/suportadas?
2. Há interesse do parceiro em expandir além de `Rebalance Manager`?
3. Quais evidências de safeguards têm mais valor real para Pulso/GTM?
4. O circuito Travel Rule deve ficar apenas documental nesta fase ou já ganhar protótipo leve adjacente?
5. Quais claims precisariam de revisão jurídica antes de deck/site/outreach?

## Regra de fechamento

A Fase 2 só está realmente fechada quando:

- os artefatos existem;
- os testes/build rodam;
- a demo é reproduzível;
- o boundary final continua mais estreito do que “VASP full”.

Se a implementação produzir algo tecnicamente bom mas a claim resultante exigir “VASP full” para soar valiosa, então a Fase 2 foi desenhada errada.