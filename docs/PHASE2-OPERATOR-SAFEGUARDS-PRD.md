# Fase 2 — PRD curto: operator admission + safeguards layer

**Status:** PRD canônico da Fase 2  
**Objetivo:** expandir o seam atual da DPO2U em DeFindex/Stellar além de `rebalance proof-bound`, sem forçar a narrativa de `VASP/PSAV full` e sem inventar surfaces que a DeFindex não suporta hoje.  
**Relacionado:** `docs/VASP-PSAV-FULL-GAP-MEMO.md`, `docs/STELLAR-DEFINDEX-LEGAL-CIRCUITS-MEMO.md`, `docs/S5-PARTNER-LEGAL-VALIDATION-PACK.md`, `docs/THREE-TRACK-ROADMAP-PULSO-ZK-GTM.md`

## Resumo executivo

A Fase 1 provou uma lane estreita e forte:

> um contrato/gate DPO2U pode ocupar o papel de `Rebalance Manager` em DeFindex/Stellar, e uma ação privilegiada de rebalance pode ser condicionada a um fluxo proof-bound ligado ao intent exato.

A Fase 2 **não** tenta transformar isso em “VASP full”.

A Fase 2 tem um objetivo mais realista e mais útil:

> ampliar o control plane provado para cobrir **admissão de operador**, **safeguards**, **reporting evidence** e **Travel Rule como circuito adjacente**, sempre no plano operator-side e sempre com anti-overclaim explícito.

## Truth / target / non-goals

### Truth now
Hoje está provado que:

- existe lane `rebalanceVault` role-gated em DeFindex/Stellar;
- o papel `Rebalance Manager` já foi ocupado por contrato/gate DPO2U em testnet;
- o SDK já faz `payload canônico -> hash determinístico -> verify -> prepare unsigned XDR`;
- o deny path já é fail-closed (`FAIL`, `REVIEW`, missing, hash mismatch);
- houve rebalance live em testnet com essa topologia.

### Target da Fase 2
Ao final da Fase 2, a DPO2U deve poder sustentar algo mais forte do que “rebalance proof-bound”, sem dizer “VASP full”.

A claim-alvo é:

> a DPO2U já sustenta em DeFindex/Stellar uma camada **operator/safeguards/reporting-aware** que transforma postura regulatória e evidência operacional em condição verificável para ações institucionais privilegiadas.

### Non-goals
A Fase 2 **não** tenta provar:

- gate nativo de depósitos retail na DeFindex;
- gate nativo de saques retail na DeFindex;
- cobertura ponta a ponta da jornada pública transacional;
- stack VASP/PSAV completa;
- prontidão multi-jurisdição de produção;
- Travel Rule como “o regime inteiro”.

## Por que essa fase faz sentido para DeFindex

A truth canônica do repo já congelou que DeFindex é mais forte para nós no plano:

- operator-side;
- role-gated actions;
- privileged execution;
- governança/verificação associada a vaults e operadores.

Então a Fase 2 faz sentido porque ela **aprofunda o mesmo seam real**.

Ela **não** depende de forçar um fit artificial em:

- retail onboarding nativo;
- deposit allowlists nativas;
- withdraw gating público ponta a ponta.

## Quatro circuitos foco da Fase 2

### 1. Operator admission posture
Pergunta respondida:

> esse operador/prestador pode ocupar ou manter um papel sensível sob este escopo de serviço?

Exemplos de elementos do circuito:

- elegibilidade do operador;
- jurisdição/escopo do serviço;
- expiração/revalidação;
- suspensão/revogação;
- postura mínima para manter `Manager`, `Rebalance Manager`, `Emergency Manager` ou `Fee Receiver`.

### 2. Safeguards / reserve / incident posture
Pergunta respondida:

> este operador/vault/arranjo ainda está dentro da postura mínima de safeguards exigida para executar a ação?

Exemplos de elementos do circuito:

- proof of reserve / proof of assets quando aplicável;
- segregação;
- postura de salvaguarda;
- incident controls;
- resposta a evento excepcional;
- bloqueio de ação quando posture crítica falha.

### 3. Reporting evidence loop
Pergunta respondida:

> o artefato/report exigido foi produzido, committed e continua válido?

Exemplos de elementos do circuito:

- hash determinístico de artefato;
- verify do hash/atestado;
- retenção/expiração;
- evidência de entrega/produção;
- allow/deny com base em `PASS`, `FAIL`, `REVIEW`, missing ou expired.

### 4. Travel Rule adjacente
Pergunta respondida:

> quando houver obrigação específica de mensageria/screening/settlement, existe prova suficiente para seguir?

Posicionamento correto:

- Travel Rule aqui é **circuito específico**;
- não é tese core da DeFindex;
- não substitui PSAV/VASP;
- não vira claim de cobertura total das transações DeFindex.

## Superfície de implementação

A Fase 2 deve se concentrar principalmente em:

- `sdk/src/defindex-policy-types.ts`
- `sdk/src/DefindexPolicyGateway.ts`
- `sdk/src/index.ts`
- testes em `sdk/src/__tests__/`
- scripts de demo em `sdk/scripts/`
- docs canônicos em `docs/`

A superfície pública deve permanecer estreita e legível:

- helpers explícitos por circuito,
- tipos de evidência claros,
- deny paths verificáveis,
- demos/reports reprodutíveis.

## Claims liberadas ao final da Fase 2

Se a Fase 2 for implementada e validada, as claims que podem subir de nível são:

- a DPO2U já vai além de `rebalance proof-bound` e sustenta uma camada **operator-aware**;
- a DPO2U já sustenta **safeguards-aware privileged execution**;
- a DPO2U já consegue transformar **artefatos/reportes operacionais** em condição verificável de allow/deny;
- a DPO2U já posiciona Travel Rule como circuito adjacente e específico, sem inflar a tese central.

## Claims que continuam proibidas mesmo após a Fase 2

Mesmo com a Fase 2 pronta, continuam proibidas sem nova evidência:

- “A DPO2U já é a camada VASP/PSAV completa da DeFindex.”
- “A DPO2U já gateia depósitos/saques retail nativamente na DeFindex.”
- “Toda operação pública da DeFindex já é compliance-gated.”
- “A solução já está pronta para produção regulada multi-jurisdição.”
- “Travel Rule resolve sozinho o enquadramento VASP.”

## Critérios de aceite

A Fase 2 só pode ser considerada fechada quando existir:

1. tipos canônicos de evidência para operator admission, safeguards, reporting e Travel Rule adjacente;
2. gateway/SDK com pass/deny path verificável para operator admission;
3. gateway/SDK com pass/deny path verificável para safeguards;
4. pelo menos um reporting evidence loop demonstrável com hash/verdict/allow-deny;
5. demo/runbook reprodutível da Fase 2;
6. boundary docs atualizados sem overclaim;
7. build/test/report final executados de verdade.

## Anti-overclaim explícito

A Fase 2 existe precisamente para **aproximar** a tese de VASP/PSAV sem fingir que o salto já foi dado.

A frase correta ao fim desta fase deve ser algo como:

> a DPO2U já provou em DeFindex/Stellar uma camada operator/safeguards/reporting-aware de execução institucional privilegiada.

A frase incorreta continua sendo:

> a DPO2U já é uma stack VASP/PSAV full em DeFindex.

## Próximo passo após este PRD

Executar em ordem:

1. types canônicos da Fase 2;
2. operator admission path;
3. safeguards path;
4. reporting evidence loop;
5. Travel Rule adjacente docs-first (`docs/PHASE2-TRAVEL-RULE-ADJACENT-FLOW.md`);
6. demo runbook e boundary update final.
