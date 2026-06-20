# Memo — gap entre o estado atual e VASP/PSAV full

**Status:** memo canônico  
**Escopo:** diferença entre o slice atual provado em Stellar/DeFindex e uma tese operacional mais próxima de `VASP/PSAV full`  
**Relacionado:** `docs/STELLAR-DEFINDEX-LEGAL-CIRCUITS-MEMO.md`, `docs/DPO2U-STELLAR-DEFINDEX-COMPLIANCE-LAYER-PRD.md`, `docs/S5-PARTNER-LEGAL-VALIDATION-PACK.md`

## Resumo executivo

A DPO2U **não** está hoje em posição honesta de dizer que já é uma stack **VASP/PSAV full**.

O que existe, com evidência, é um slice mais estreito e forte:

> **execução privilegiada compliance-gated no plano de operador, com um rebalance DeFindex/Stellar ligado a um fluxo proof-bound e a um control plane verificável.**

Isso já é valioso e institucionalmente legível. Mas ainda é **parcial** frente ao que seria necessário para enquadrar a solução como algo mais próximo de uma camada **VASP/PSAV full**.

A diferença principal é simples:

- **hoje** a DPO2U prova bem um circuito de **operator-side privileged execution**;
- **VASP/PSAV full** exigiria cercar também **admissão mais ampla, safeguards, reporting, Travel Rule operacional, jornada transacional maior e readiness institucional de produção**.

## O que já está provado

Com base em `S1` a `S5`, já está provado que:

- existe uma lane DeFindex/Stellar de `rebalanceVault` role-gated;
- um contrato/gate DPO2U já ocupou o papel de `Rebalance Manager` em testnet;
- o payload de rebalance pode ser canonizado e preso a um `evidence_hash` determinístico;
- o gateway já faz verify + deny path + preparação de unsigned XDR apenas após `PASS`;
- houve rebalance live em testnet ligado a essa topologia.

Isso suporta a claim estreita de **proof-bound privileged execution**.

## O que isso ainda não equivale

Esse estado **não** equivale a:

- stack VASP/PSAV completa;
- gate nativo de depósitos/saques retail na DeFindex;
- resolução integral de onboarding, safeguards, reporting e mensageria regulatória;
- prontidão multi-jurisdição para uso público amplo;
- solução pronta para produção institucional regulada.

## Gap canônico para VASP/PSAV full

### 1. Admissão de operador e participante mais ampla

Hoje o slice forte está no operador role-gated. Para uma narrativa VASP/PSAV full, faltaria fechar melhor os circuitos de:

- elegibilidade de operador/prestador;
- revalidação periódica;
- expiração, revogação e suspensão operacional;
- elegibilidade mais ampla de participante/contraparte quando aplicável;
- diferenciação por jurisdição e escopo do serviço.

Em outras palavras: falta sair do **“quem pode rebalancear este vault”** e avançar para **“quem pode operar este serviço regulado, em que escopo e sob que condições contínuas”**.

### 2. Safeguards e postura operacional

VASP/PSAV full exige mais do que governança de ação privilegiada. Falta materializar de forma mais robusta:

- segregação;
- proof of reserve / proof of assets quando aplicável;
- postura de custódia/salvaguarda;
- incident controls;
- critérios de resposta a evento excepcional;
- evidência de manutenção contínua desses controles.

O repo já aponta esse circuito no framing (`vasp_por_br_v1`, safeguards, incident controls), mas ele ainda **não** é o coração do slice público atual.

### 3. Travel Rule como circuito operacional real

O framing atual está correto ao dizer que **Travel Rule não é o regime inteiro**. Mas, se quisermos subir para algo mais próximo de VASP full, a Travel Rule precisa existir como circuito operacional concreto, não apenas como categoria de policy.

Isso significa fechar algo como:

- quando a obrigação de mensagem existe;
- qual artefato é gerado;
- como ele é ligado ao fluxo downstream;
- como screening e compliance messaging são evidenciados;
- como settlement / transferência ficam condicionados a essa prova.

Sem isso, a tese VASP continua incompleta para operações cobertas.

### 4. Reporting e trilha de auditoria contínua

O slice atual é forte em **autorização de execução privilegiada**. Para VASP/PSAV full, faltaria avançar para **obrigações contínuas**:

- reporting operacional/regulatório;
- hash/atestado de relatório e evidência de entrega;
- retenção e expiração de artefatos;
- trilha de auditoria verificável;
- políticas de periodicidade e reattestation.

Isso é essencial porque o regime VASP/PSAV não é só gate de entrada/execução; ele também é regime de **manutenção e prestação de contas**.

### 5. Surface além do operator-side

Esse é um dos gaps mais importantes.

Hoje o que está suportado com força é:

- operator-side;
- role-gated privileged actions;
- control plane para create/rebalance/emergency/fees em termos de framing.

O que ainda **não** está suportado como claim atual:

- gate nativo de depósitos retail;
- gate nativo de saques retail;
- cobertura da jornada pública de onboarding/withdraw/settlement ponta a ponta em surface DeFindex;
- equivalência entre operator gating e jornada transacional completa.

Então o salto para “VASP full” exigiria ou:

- surfaces adicionais da contraparte/protocolo;
- ou uma arquitetura onde a DPO2U controla também as etapas adjacentes fora da DeFindex.

### 6. Boundary jurídico/comercial endurecido

Mesmo com mais implementação, ainda faltaria endurecimento de:

- wording jurídico-comercial;
- claim boundary por jurisdição;
- distinção entre o que é operator/safeguards layer e o que é oferta regulada mais ampla;
- revisão externa do framing PSAV/VASP;
- política clara do que pode ser dito em material público/institucional.

Sem isso, existe risco de a solução ser mais forte tecnicamente do que a forma segura de comunicá-la externamente.

### 7. Hardening de produção

Para algo mais próximo de VASP/PSAV full, também faltaria:

- readiness de produção;
- estabilidade de surfaces parceiras;
- runbooks de incidente maduros;
- governança operacional contínua;
- eventuais auditorias de contrato/infra;
- controles institucionais de change/release/recovery.

O estado atual é mais forte como **lane validada** do que como **infra regulada pronta para produção institucional ampla**.

## Matriz — estado atual vs VASP/PSAV full

| bloco | estado atual | para VASP/PSAV full |
|---|---|---|
| governança de rebalance proof-bound | **feito** | manter |
| role-as-contract em testnet | **feito** | endurecer em direção a produção |
| operator-side privileged action gating | **feito** | ampliar para mais circuitos |
| safeguards / reserve / segregation | **parcial / framing** | materializar como circuito central |
| Travel Rule operacional | **framing** | implementar fluxo real |
| reporting / audit trail contínuo | **framing** | implementar e provar |
| depósitos/saques / jornada transacional ampla | **não suportado** | depende de surface ou arquitetura adicional |
| partner/legal/public boundary | **parcialmente fechado** | sign-off externo e wording endurecido |
| readiness de produção | **não** | hardening institucional |

## Leitura estratégica

A conclusão estratégica é:

> **tentar “virar VASP full” agora provavelmente nos empurra para overengineering e overclaim ao mesmo tempo.**

O melhor caminho é tratar isso em fases:

### Fase 1 — o que já existe e deve ser embalado
- proof-bound privileged execution;
- operator-side control plane;
- rebalance governance sob CVM 175;
- selective disclosure / LGPD boundary.

### Fase 2 — o que mais naturalmente aproxima de VASP/PSAV
- safeguards layer;
- operator admission posture;
- reporting / evidence loops;
- Travel Rule como circuito real.

### Fase 3 — o que seria de fato ambição VASP/PSAV mais ampla
- broader transaction journey;
- deposit/withdraw related gating quando houver surface real;
- partner-integrated production posture;
- sign-off regulatório/comercial por país/vertical.

## Formulação correta hoje

A frase honesta hoje é:

> **A DPO2U já provou uma lane de execução privilegiada compliance-gated em Stellar/DeFindex.**

A frase que ainda seria overclaim é:

> **A DPO2U já é uma stack VASP/PSAV full.**

## Decisão recomendada

A decisão recomendada é:

1. **não** tentar vender VASP full agora;
2. usar o slice atual como tese institucional forte para Pulso;
3. organizar a evolução futura em trilhas separadas, para não misturar:
   - demo/hackathon,
   - upgrade do predicado/prova,
   - expansão comercial/regulatória.

Esse desdobramento em trilhas é o próximo passo lógico e está refletido em `docs/THREE-TRACK-ROADMAP-PULSO-ZK-GTM.md`.
