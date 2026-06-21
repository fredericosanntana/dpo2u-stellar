# Roadmap — três vertentes: Pulso, hackathon ZK Stellar e GTM

**Status:** roadmap canônico  
**Objetivo:** organizar a evolução da DPO2U sem overengineering, separando claramente três trilhas que reutilizam o mesmo seam provado em vez de abrir arquiteturas paralelas desnecessárias.

## Resumo executivo

A DPO2U já tem um seam real, provado e institucionalmente legível:

> **um control plane que condiciona uma ação privilegiada em Stellar/DeFindex a um resultado de policy/proof ligado ao intent exato.**

A decisão correta agora não é abrir mais arquitetura. É **embalar o mesmo seam em três vertentes distintas**, cada uma com objetivo próprio:

1. **Pulso hackathon** → mostrar o primitive institucional e a lane real;
2. **hackathon ZK Stellar** → fortalecer a semântica do predicado/prova no mesmo lane;
3. **GTM da solução** → descrever isso como compliance-gated institutional execution.

## Princípio central

As três vertentes **não** devem partir de três produtos diferentes.

Devem partir do **mesmo seam já provado**:

- role occupancy (`Rebalance Manager`);
- payload canônico + `evidence_hash`;
- verify/deny/prepare fail-closed;
- rebalance proof-bound;
- boundary LGPD + PSAV/VASP + CVM 175.

O que muda entre as vertentes é **a embalagem e o próximo incremento**, não o core do sistema.

---

## Vertente 1 — Pulso hackathon

### Objetivo
Ganhar clareza institucional e demoabilidade com uma claim estreita, forte e verificável.

### Tese
> ações financeiras privilegiadas podem ser condicionadas a um resultado regulatório verificável sem publicar o dossiê jurídico na chain.

### O que mostrar
- o papel `Rebalance Manager` ocupado por contrato/gate DPO2U;
- o intent de rebalance;
- o `evidence_hash` ligado ao intent;
- o gate `PASS/FAIL/REVIEW`;
- a preparação/execução do rebalance proof-bound;
- a leitura de estado do vault antes/depois quando útil.

### O que não mostrar como claim
- VASP full;
- depósito retail gateado nativamente;
- “camada regulatória completa da DeFindex”;
- prontidão de produção multi-jurisdição.

### Critério de pronto
A vertente Pulso está pronta quando existir:

- demo walkthrough reproduzível;
- narrativa única de judges;
- claim pública congelada;
- visual/script de apresentação alinhado ao seam real.

### Próximos passos específicos
1. fechar argumento curto de judges;
2. alinhar submission/deck/vídeo ao seam já provado;
3. eliminar qualquer wording que empurre para overclaim.

---

## Vertente 2 — Hackathon ZK Stellar

### Objetivo
Fortalecer o valor protocolar/ZK do mesmo seam, substituindo ou endurecendo o predicado sem reabrir o control plane inteiro.

### Tese
> o valor diferencial não é só atestar um PASS; é prender a autorização a uma prova mais forte sobre o intent exato da ação.

### Foco correto
Não reconstruir tudo. O foco correto é:

- manter a lane estável;
- preservar a topologia role-as-contract;
- trocar ou fortalecer o predicado/circuito;
- manter o binding com o intent/payload;
- rerodar a mesma validação local/live.

### Bons exemplos de evolução aqui
- sair de um predicado fraco/place-holder para um predicado de policy mais institucionalmente legível;
- melhorar VK/verifier pinning;
- fortalecer replay/staleness/scope/nonce/expiry;
- melhorar a semântica pública da prova sem mudar a narrativa core.

### O que evitar
- abrir um mega-policy engine multi-lei;
- criar uma nova arquitetura paralela só para parecer mais “ZK”;
- transformar o hackathon ZK em um novo produto inteiro;
- descolar a prova do intent real da execução.

### Critério de pronto
A vertente ZK está pronta quando:

- o mesmo lane continua funcionando;
- o predicado ficou mais forte e mais legível;
- a prova continua bound ao intent exato;
- a mudança aumenta credibilidade sem inflar escopo.

### Próximos passos específicos
1. escolher o predicado ZK mais institucionalmente legível para substituir/endurecer o atual;
2. preservar shape e runbook do lane;
3. rerodar validações e registrar a melhoria sem mudar o claim core.

---

## Vertente 3 — GTM da solução

### Objetivo
Traduzir o seam provado para uma narrativa comercial/institucional utilizável.

### Tese
> a DPO2U é a camada que transforma resultado de compliance em condição verificável de execução para ações on-chain institucionais.

### ICP / leitura de mercado inicial
Essa vertente conversa melhor com:

- gestores / operadores institucionais on-chain;
- estruturas que precisam de policy-governed treasury / vault operations;
- ecossistemas que já têm role-gated actions e precisam de compliance verifiável;
- ambientes onde selective disclosure é relevante.

### O produto vendido aqui não é
- KYC provider;
- wallet onboarding tool;
- “Travel Rule only”;
- plataforma regulatória universal desde o dia zero.

### O produto vendido aqui é
- compliance-gated execution layer;
- operator/safeguards control primitive;
- policy/attestation bridge entre dossiê regulatório e execução institucional.

### Sinal de mercado que reforça o GTM
O caso MiCA/Binance (`docs/MICA-BINANCE-SIGNAL-MEMO.md`) reforça a urgência desta vertente: quando licença e admissibilidade regulatória passam a determinar se um player pode ou não seguir atendendo um mercado inteiro, o budget institucional tende a migrar para primitives que tornam esse estado demonstrável, auditável e operacionalmente reutilizável.

Isso favorece exatamente o nosso framing de GTM:
- não vender “tooling de compliance” genérico;
- vender `operator admission + safeguards + reporting-aware execution`;
- tratar Travel Rule como peça específica da oferta, não como descrição total do produto.

### O que falta para GTM forte
Para o GTM ficar mais forte, o principal não é mais engenharia profunda. É:

- packaging comercial correto;
- matrix de claims suportadas;
- casos de uso institucionais claros;
- boundary de overclaim;
- eventualmente uma Fase 2 de safeguards/reporting se o mercado puxar.

### Critério de pronto
A vertente GTM está pronta quando existir:

- one-liner forte;
- ICP claro;
- materials de sales/partner outreach coerentes com o S5;
- narrative de “why now / why this seam / why institutional”.

### Próximos passos específicos
1. transformar o S5 em argumentário comercial;
2. escrever one-pager / partner memo / outreach note;
3. mapear quais conversas exigem Fase 2 (safeguards, reporting, Travel Rule real).

---

## Matriz de priorização

| trilha | o que reaproveita | o que muda | risco principal |
|---|---|---|---|
| Pulso | demo lane atual inteiro | narrativa e apresentação | overclaim para judges/parceiros |
| ZK Stellar | lane + topologia + runbook | semântica do predicado/prova | overengineering do circuito |
| GTM | claim estreita + evidência S1–S5 | packaging comercial/institucional | vender amplitude além do provado |

## Ordem recomendada

### Ordem 1 — curto prazo
1. **Pulso**
2. **GTM packaging mínimo**
3. **ZK uplift focal**

### Observação pós-sinal MiCA
O sinal MiCA/Binance não muda a ordem; ele só aumenta a confiança de que a segunda vertente certa depois de Pulso é mesmo **GTM packaging** — porque o mercado está dando mais evidência de que operator-side compliance primitives podem deixar de ser “nice to have” e virar condição de acesso.

### Por quê
Porque hoje o maior ganho marginal não vem de abrir mais engenharia. Vem de:

- cristalizar a claim certa;
- melhorar a narrativa externa;
- só depois fortalecer o predicado, se isso realmente aumentar a legibilidade/competitividade da tese.

## Anti-overengineering

Se houver dúvida sobre o próximo passo, aplicar esta regra:

> **se a mudança não fortalece diretamente a demo do seam atual, a prova bound ao intent, ou a narrativa institucional/comercial desse seam, provavelmente é escopo cedo demais.**

## Decisão operacional

A decisão operacional recomendada é:

- **Pulso:** empacotar o seam já provado;
- **ZK Stellar:** endurecer o predicado no mesmo seam;
- **GTM:** vender “compliance-gated institutional execution”, não “VASP full”.

## Próximo passo lógico

O próximo passo lógico é derivar deste roadmap uma peça de execução concreta. As opções naturais são:

1. `docs/PULSO-SUBMISSION-NARRATIVE-v1.md`
2. `docs/ZK-STELLAR-UPGRADE-PLAN.md`
3. `docs/GTM-ONE-PAGER-DPO2U-STELLAR.md`

Mas isso já deve ser feito como trilhas separadas, sem misturar narrativa de judge, upgrade de circuito e packaging comercial no mesmo sprint.
