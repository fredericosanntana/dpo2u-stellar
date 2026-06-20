# Fase 2 — Travel Rule adjacente em DeFindex/Stellar

**Status:** doc canônico do circuito adjacente  
**Objetivo:** descrever onde a Travel Rule entra na tese da DPO2U para DeFindex/Stellar sem inflar a claim para “VASP full” nem fingir que a DeFindex inteira vira um produto de mensageria regulatória.  
**Relacionado:** `docs/PHASE2-OPERATOR-SAFEGUARDS-PRD.md`, `docs/PHASE2-CLAIM-BOUNDARY.md`, `docs/STELLAR-DEFINDEX-LEGAL-CIRCUITS-MEMO.md`

## Resumo executivo

No contexto DeFindex/Stellar, a Travel Rule **não** é a tese central.

A tese central continua sendo:

> **operator-side privileged execution condicionado por política e evidência verificável.**

A Travel Rule entra como um **circuito adjacente** para situações em que uma obrigação específica de mensageria, screening ou settlement-surveillance precise ser satisfeita antes de uma ação institucional seguir.

## O que este doc faz

Este doc responde:

- quando a Travel Rule faz sentido no recorte DeFindex/DPO2U;
- quais artefatos podem existir off-chain;
- qual hash/verdict é relevante on-chain ou no gateway;
- onde isso se liga ao fluxo operator-side;
- o que continua fora de escopo.

## O que este doc não faz

Este doc **não** afirma que:

- Travel Rule = regime VASP/PSAV inteiro;
- toda transação DeFindex está coberta por Travel Rule;
- depósitos/saques retail da DeFindex já estão gateados por esse circuito;
- a DPO2U já resolve settlement/comms regulatório ponta a ponta em produção.

## Onde a Travel Rule entra de forma honesta

No recorte atual, a Travel Rule só faz sentido quando houver um contexto como:

1. uma ação institucional privilegiada que encosta em transferência/liquidação relevante;
2. necessidade de screening ou mensageria regulatória entre contrapartes;
3. obrigação específica de provar que esse artefato existiu e estava válido;
4. interesse em **ligar essa validade ao allow/deny** de uma ação operator-side.

Ou seja:

> **a Travel Rule entra como predicado adjacente de settlement/comms, não como narrativa principal do vault.**

## Atores do circuito

### 1. Operador institucional / prestador
Quem pretende executar ou autorizar a ação privilegiada.

### 2. Contraparte / beneficiário / originador referenciado
As partes relevantes para o circuito regulatório específico, quando existirem.

### 3. DPO2U control plane
Quem recebe/estrutura o artefato off-chain, produz um verdict e o prende a um hash verificável.

### 4. Gateway / role-holder path
Quem usa esse verdict para permitir ou negar a ação privilegiada no plano operator-side.

## Artefato off-chain esperado

O artefato real não precisa ir à chain.

O que faz sentido é um artefato off-chain contendo, por exemplo:

- referência de originador e beneficiário;
- contexto jurisdicional;
- status de screening;
- status da mensagem exigida;
- timestamp e validade;
- referências internas/auditáveis do dossiê.

O gateway não precisa ler o conteúdo sensível completo. Ele precisa de:

- **hash determinístico** do artefato;
- **verdict** (`PASS`, `FAIL`, `REVIEW`);
- estados específicos (mensagem presente/ausente, screening ok/falho);
- validade temporal.

## Shape do circuito na Fase 2

### Etapa 1 — artefato off-chain
A DPO2U recebe ou gera um artefato Travel Rule/screening fora da chain.

### Etapa 2 — canonicalização e hash
O artefato é canonicalizado e transformado em `artifactHashHex`.

### Etapa 3 — verdict DPO2U
A DPO2U produz um payload/verdict do tipo:

- `PASS`
- `FAIL`
- `REVIEW`

mais campos como:

- `screeningStatus`
- `messageStatus`
- `validUntil`
- `jurisdictionPair`

### Etapa 4 — bind ao fluxo operator-side
O gateway usa esse payload para:

- negar imediatamente em caso de `FAIL`, `REVIEW`, `MISSING`, expirado;
- permitir seguir para a verificação principal quando o circuito Travel Rule adjacente estiver satisfatório.

### Etapa 5 — ação privilegiada
Só então a ação operator-side (por exemplo um rebalance/fee flow com settlement relevance) segue para o restante do fluxo proof-bound.

## Onde isso encosta em DeFindex

No seam atual, isso encosta melhor em:

- `rebalanceVault`, quando o contexto institucional exigir controles adjacentes de settlement/comms;
- `distributeFees`, quando a destinação/liquidação exigir screening/mensageria;
- eventualmente outras operator actions, se o parceiro expuser um caso real que peça esse predicado.

Não encosta honestamente, por enquanto, em:

- depósitos retail nativos;
- saques retail nativos;
- jornada pública completa de usuário final.

## Relação com o restante da Fase 2

A Travel Rule aqui é a **quarta camada**, depois de:

1. operator admission;
2. safeguards;
3. reporting evidence loop.

Ela existe para ampliar a capacidade de bindar uma obrigação regulatória específica ao allow/deny.

Ela **não** substitui:

- safeguards,
- reporting,
- operator admission,
- nem o seam principal de rebalance proof-bound.

## Claim correta

A claim correta é:

> a DPO2U já modela a Travel Rule como um circuito adjacente específico que pode condicionar ações institucionais privilegiadas quando houver relevância regulatória de mensageria/screening/settlement.

## Claim incorreta

A claim incorreta seria:

> a DPO2U já transformou a DeFindex em uma stack Travel Rule/VASP completa.

## O que ainda fica em aberto

Mesmo com este doc, continuam em aberto:

1. quais operator surfaces reais da DeFindex exigiriam esse circuito na prática;
2. se o primeiro passo deve ser só docs/modelo ou já um protótipo leve adicional;
3. qual wording jurídico/comercial é mais seguro por jurisdição;
4. quais contrapartes/parceiros realmente puxam esse valor em GTM.

## Decisão recomendada

A decisão correta para a Fase 2 é:

- manter Travel Rule como **circuito adjacente e específico**;
- não reorientar a tese inteira da DeFindex ao redor dela;
- só aprofundar implementação se houver caso real de settlement/comms que justifique o predicado.
