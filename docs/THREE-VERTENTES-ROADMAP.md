# Roadmap — 3 vertentes da DPO2U

**Data:** 2026-06-22  
**Status:** direção executiva ativa  
**Objetivo:** organizar a execução da DPO2U em três vertentes claras — **Pulso hackathon**, **hackathon ZK Stellar** e **GTM** — sem abrir três produtos distintos nem cair em overengineering.

---

## 1. Tese central

A DPO2U não deve se apresentar como "stack regulatória completa" nem como coleção dispersa de demos.

A tese unificadora é:

> **compliance gates verificáveis para ações institucionais sensíveis**.

O que muda entre as vertentes não é o produto-base, e sim:
- o **ambiente de prova**;
- o **caso de uso visível**;
- a **superfície de distribuição**.

---

## 2. Veredito honesto sobre overengineering

### Sim: existe risco real de overengineering se misturarmos as três vertentes
O erro seria tentar construir ao mesmo tempo:
- infraestrutura ZK completa;
- integração protocolar Stellar ampla;
- produto enterprise multi-jurisdição pronto para venda;
- narrativa de hackathon e narrativa institucional no mesmo artefato.

### Não: o trabalho atual ainda é defensável se fizermos o recorte certo
As duas últimas features implementadas no SDK (`operator admission` + `safeguards scope binding`) **não são overengineering**.

Elas aprofundam o seam certo:
- `operator-side`
- `fail-closed`
- `evidence-bound`
- `privileged actions only`

Ou seja: o problema não é o hardening atual. O risco está em **abrir frentes demais sem separar objetivo, demo e claim**.

---

## 3. Regra mestra

Não construir 3 produtos.

Construir **1 primitive base** e empacotá-la em **3 narrativas de execução**:

1. **Pulso** = distribuição/aplicação institucional em Stellar
2. **ZK Stellar** = prova criptográfica do gate
3. **GTM** = monetização da primitive como compliance layer institucional

---

## 4. Vertente 1 — Pulso hackathon

## Objetivo
Vencer pela **aplicação institucional mais clara em Stellar**, não pela complexidade técnica máxima.

## Tese recomendada
Para Pulso, o framing mais forte é:

> **DPO2U + DeFindex + Etherfuse** como primitive de admissão/compliance para operação institucional em fluxos de treasury / vault / ramp.

O ASP entra como primitive de admissão/compliance; não como fim em si mesmo.

## O que mostrar
- um operador/entidade só executa ação privilegiada se a evidência estiver válida;
- o gate já considera:
  - role
  - service scope
  - jurisdição solicitada
  - safeguards posture
  - bind de vault/operator
- o efeito prático é controle verificável sobre uma superfície institucional real.

## O que NÃO tentar agora
- privacy pool real
- governance/staking/slashing completo
- regime regulatório completo
- onboarding retail completo
- stack full de exchange/custody

## Entregável principal
Uma demo institucional replayável com narrativa simples:

> "esta ação sensível só aconteceu porque o operador certo, no escopo certo, com safeguards corretos, apresentou evidência válida."

## Próximo passo da vertente
Fechar um **demo path único** com o parceiro/superfície principal (preferência: DeFindex × Etherfuse × Stellar institutional framing) e cortar tudo o que não reforça esse caminho.

---

## 5. Vertente 2 — Hackathon ZK Stellar

## Objetivo
Provar que a DPO2U não é só policy engine; ela pode virar **gating com privacidade/prova criptográfica**, mas sem fingir protocolo ZK completo.

## Tese correta

> usar ZK para provar elegibilidade/admissão sem expor desnecessariamente os dados subjacentes.

## Recorte certo
O hackathon ZK deve focar em **uma prova narrow**, por exemplo:
- membership/eligibility proof;
- claim válido dentro de uma policy;
- admissibilidade de operador/entidade sem revelar mais do que o necessário.

## O que mostrar
- vínculo entre evidência/policy e decisão;
- prova de elegibilidade ou membership;
- integração mínima com o lane institucional já construído.

## O que NÃO fazer
- inventar privacy protocol inteiro;
- criar nullifier/governance/slashing só para “parecer mais ZK”;
- abrir arquitetura multi-circuito antes de existir um caso vencedor.

## Entregável principal
Uma demonstração de que:

> o gate institucional da DPO2U pode evoluir para um regime de prova privada verificável.

## Próximo passo da vertente
Escolher **uma única claim/prova** como demo oficial do hackathon e congelar o resto como backlog.

---

## 6. Vertente 3 — GTM da solução

## Objetivo
Traduzir a primitive em oferta comprável por contrapartes institucionais.

## Tese comercial
A DPO2U deve ser vendida como:

> **compliance layer verificável para ações operacionais privilegiadas**.

Não como:
- "MiCA full"
- "compliance completo de exchange"
- "custody stack"
- "KYC de ponta a ponta"

## Oferta que o repo já sustenta melhor
Hoje, o que está mais honesto para vender é:
- operator admission gate
- safeguards posture gate
- reporting evidence loop
- adapter para operator surface / unsigned tx prep
- trilha auditável e verificável

## ICPs mais aderentes agora
1. **protocolos / treasury / RWA / DeFi institucional**
2. **exchanges ou integradores** que precisam gatear operadores e fluxos sensíveis
3. **parceiros Stellar** onde compliance verificável melhora admissão/execução

## Risco comercial a evitar
Falar com o mercado como se já existisse produto pronto multi-jurisdição full-stack.

## Entregável principal
Uma oferta simples e repetível:
- problema: quem pode executar qual ação sensível e sob quais condições
- mecanismo: evidence-bound compliance gate
- prova: demo + docs + deny paths reais + adapter funcional

## Próximo passo da vertente
Reescrever o posicionamento comercial em torno de **privileged-action compliance gate** e separar explicitamente:
- o que já existe;
- o que está endurecido mas ainda narrow;
- o que continua roadmap.

---

## 7. Ordem de prioridade entre as três vertentes

### Prioridade 1 — Pulso
Porque é o melhor campo para aplicação institucional concreta em Stellar e o melhor lugar para mostrar utilidade.

### Prioridade 2 — GTM
Porque a narrativa comercial precisa acompanhar o que já está sendo construído, senão o produto fica sem comprador claro.

### Prioridade 3 — ZK hackathon
Porque ele deve reforçar a tese central, não sequestrar a agenda inteira.

---

## 8. Próximo passo previsto

O próximo passo mais correto não é abrir nova feature genérica.

É:

1. **fechar o pacote atual como checkpoint de hardening**;
2. **definir o demo path único do Pulso**;
3. **escolher uma claim ZK única para o hackathon**;
4. **reposicionar o GTM em torno do gate institucional narrow já provado**.

---

## 9. Decisões executivas

### Decisão 1
A primitive-base da DPO2U neste ciclo é:
- `operator admission`
- `safeguards scope binding`
- `reporting/evidence loop`
- `policy-gated privileged execution`

### Decisão 2
Pulso não deve ser tratado como projeto de pesquisa ZK. Deve ser tratado como **aplicação institucional convincente em Stellar**.

### Decisão 3
O hackathon ZK não deve abrir outra arquitetura. Deve provar **uma extensão privada do mesmo gate**.

### Decisão 4
O GTM deve sair de "compliance geral" para **institutional privileged-action compliance gate**.

---

## 10. Resumo de uma linha por vertente

- **Pulso:** mostrar utilidade institucional real em Stellar.
- **ZK Stellar:** provar que esse gate pode preservar privacidade/eligibilidade com criptografia.
- **GTM:** vender a primitive como camada verificável para ações privilegiadas.

---

## 11. Veredito final

Se disciplinarmos as três vertentes em torno da mesma primitive, **não estamos fazendo overengineering**.

Se deixarmos cada vertente puxar uma arquitetura própria, **estaremos sim abrindo três frentes demais**.

A decisão correta agora é:

> **menos superfície, mais prova; menos tese solta, mais demo institucional; menos plataforma abstrata, mais gate verificável.**
