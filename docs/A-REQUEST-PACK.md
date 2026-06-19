# A — Request Pack

**Status:** draft institucional  
**Data:** 2026-06-18

## Objetivo

Servir como base para um pedido formal de convergência da lane operacional da DPO2U para a Opção A.

## 1. Tese do pedido

A DPO2U já provou tecnicamente o fluxo completo de enforcement:
- leitura da decisão canônica no `protocol-registry`;
- tradução da revogação em blocked action;
- execução on-chain do bloqueio;
- automação idempotente com records.

O passo remanescente para a Opção A não é nova integração técnica; é **mandato de governança** sobre a lane alvo.

## 2. O que estamos pedindo

### Pedido preferencial
Transferência formal de autoridade/admin da lane alvo para uma conta institucional ou multisig da DPO2U.

### Pedido alternativo
Delegação operacional formal, com responsabilidade, SLA e trilha de decisão explicitados.

### Pedido de contingência
Discussão de migração/redeploy para instância compartilhada com governança redesenhada desde o início.

## 3. Por que esse pedido é razoável

- a DPO2U já provou o enforcement ponta a ponta em lane própria;
- a integração técnica com o fluxo/semântica já está fechada;
- a convergência para A aumentaria alinhamento institucional e comparabilidade pública;
- a DPO2U já está produzindo documentação de governança, arquitetura e readiness para operar isso com mais maturidade.

## 4. O que a DPO2U oferece em troca

- operação técnica já validada;
- capacidade de manter watcher/records/runbooks;
- boundary honesto entre execução e auditoria;
- disposição para operar sob modelo institucional explícito, não custodial informal.

## 5. O que a DPO2U não está pedindo

- seed informal de conta pessoal;
- bypass de governança existente;
- autoridade não auditável;
- narrativa pública que esconda quem controla a lane.

## 6. Conta/authority target recomendada

A autoridade transferida ou delegada deve apontar para:
- conta institucional dedicada; ou
- multisig/equivalente de governança clara.

Não deve apontar para:
- key pessoal sem processo de continuidade;
- arranjo sem rotação ou sem trilha de responsabilidade.

## 7. Condições mínimas para aceitar A

A DPO2U só deve aceitar convergência para A se houver:
- clareza formal sobre quem autoriza mutações;
- processo de incidente e reversão;
- entendimento claro de quem responde por erro operacional;
- condições de equivalência com o fluxo que já roda em B.

## 8. Proposta de próximos passos

1. reunião técnica/institucional curta para validar interesse;
2. apresentação do boundary atual B-first e dos artefatos de prova;
3. definição do caminho desejado:
   - transfer
   - delegate
   - migrate
4. definição da conta target e da política de custódia;
5. execução controlada de teste de equivalência.

## 9. Mensagem curta sugerida

> A DPO2U já opera uma lane própria e verificável de enforcement. Se houver abertura institucional, estamos prontos para convergir essa operação para uma lane compartilhada sob governança explícita, sem improviso e sem overclaim.

## Veredito
Este request pack existe para garantir que a Opção A seja perseguida como movimento institucional sério, e não como favor operacional ad hoc.
