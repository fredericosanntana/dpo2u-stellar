# A — Delegated Ops Model

**Status:** draft institucional-operacional  
**Data:** 2026-06-18

## Objetivo

Descrever o modelo de transição em que a DPO2U **não recebe a admin final**, mas passa a operar a lane A sob **delegação formal** da autoridade atual.

## 1. Quando usar

Usar este modelo quando:
- a contraparte não quiser transferir admin de imediato;
- houver confiança suficiente para um fluxo de cooperação controlada;
- existir interesse em validar convergência institucional sem reconfiguração definitiva no primeiro momento.

## 2. O que este modelo é

É um arranjo em que:
- a autoridade formal continua com a contraparte;
- a DPO2U ganha mandato operacional delimitado;
- critérios de execução, SLA, evidência e responsabilidade ficam escritos.

## 3. O que este modelo não é

- não é favor ad hoc por mensagem;
- não é “me chama que eu assino quando puder”;
- não é terceirização nebulosa sem RACI;
- não é justificativa para mudar a narrativa pública antes da hora.

## 4. Estrutura mínima do acordo

### 4.1 Escopo
- quais mutações a DPO2U pode solicitar/executar;
- em quais condições;
- com base em quais evidências do registry.

### 4.2 SLA
- tempo esperado para processamento;
- janelas de manutenção;
- exceções/escalação.

### 4.3 Evidência
- toda ação precisa de record;
- toda decisão precisa de referência de caso;
- toda mutação precisa de tx id e timestamp.

### 4.4 Responsabilidade
- quem decide bloquear;
- quem executa tecnicamente;
- quem responde em caso de erro;
- quem aprova desbloqueio/correção.

## 5. Fluxo recomendado

1. DPO2U detecta revogação e prepara blocked action;
2. DPO2U gera package com evidência mínima;
3. contraparte executa ou autoriza execução segundo o acordo;
4. resultado on-chain é devolvido/registrado;
5. DPO2U valida equivalência e arquiva o record.

## 6. Versões possíveis

### Modelo D1 — execução pela contraparte com input da DPO2U
Mais seguro politicamente, menos autônomo operacionalmente.

### Modelo D2 — execução por automação autorizada com guarda de logs
Mais eficiente, mas exige confiança e observabilidade superiores.

### Modelo D3 — janelas de co-assinatura / gate formal
Intermediário entre prudência institucional e velocidade.

## 7. Critérios mínimos para ser aceitável

O modelo só é aceitável se houver:
- regra clara de quem autoriza mutação;
- compromisso de prazo razoável;
- trilha de evidência verificável;
- procedimento de incidente e reversão;
- clareza de que a lane oficial pública continua sendo B até equivalência comprovada.

## 8. Riscos

- gargalo humano;
- atraso operacional;
- ambiguidade de responsabilidade;
- narrativa pública confusa se o modelo for vendido como “controle” em vez de delegação.

## 9. Vantagens

- abre trilha institucional sem exigir transferência imediata;
- reduz fricção política inicial;
- pode servir como ponte para admin transfer futuro.

## 10. Frase correta de posicionamento

> A DPO2U está validando convergência para a lane A sob um modelo formal de delegated ops, preservando boundary de autoridade explícito enquanto testa equivalência operacional.

## 11. Critério de saída

O modelo de delegated ops deve evoluir para:
- transferência formal de admin; ou
- migração institucional compartilhada; ou
- encerramento documentado se a operação ficar politicamente inviável.

## Veredito
Delegated ops é aceitável como **ponte disciplinada**, não como estado final confortável.
