# A-Readiness Plan

**Status:** preparação institucional  
**Data:** 2026-06-18

## Objetivo

Preparar a DPO2U para alcançar a **Opção A** — operar uma instância externa auditada/shared ou convergir para uma lane institucionalmente compartilhada — sem interromper a operação atual na Opção B.

## 1. Premissa

A Opção A **não** será alcançada por “mais integração técnica”.

A base técnica já existe. O que falta é uma das seguintes condições:
- autoridade administrativa formal sobre a instância alvo;
- delegação operacional formal;
- migração para uma instância compartilhada com governança acordada.

## 2. Caminhos legítimos para A

### Caminho A1 — admin transfer
O admin atual executa `update_admin` para uma conta institucional ou multisig controlada pela DPO2U.

### Caminho A2 — delegated ops
A autoridade externa mantém a posse formal do admin, mas delega um fluxo operacional acordado à DPO2U.

### Caminho A3 — institutional redeploy / migration
As partes convergem para uma nova instância ou lane compartilhada com governança já desenhada desde o início.

## 3. Ordem de preferência

1. **admin transfer para conta institucional/multisig**
2. **redeploy/migração institucional compartilhada**
3. **delegated ops como ponte temporária**

## 4. Pré-requisitos antes de pedir A

A DPO2U não deve pedir autoridade sobre uma instância externa sem ter pronto:
- modelo de custódia alvo;
- processo de rotação/admin-transfer;
- runbook de incidente;
- mensagem pública coerente sobre quem governa a lane;
- readiness operacional mínima do watcher e dos records.

## 5. Pacote institucional que precisa existir

### Documentos mínimos
- pedido formal de convergência (`A-REQUEST-PACK.md`)
- playbook de transferência/admin (`A-ADMIN-TRANSFER-PLAYBOOK.md`)
- modelo de delegated ops (`A-DELEGATED-OPS-MODEL.md`)
- checklist de migração/equivalência (`A-MIGRATION-CHECKLIST.md`)

## 6. O que pedir ao operador externo

### Pedido ideal
- transferência para conta institucional/multisig da DPO2U

### Pedido aceitável de transição
- fluxo formal de delegated ops com SLA, critérios de execução e trilha de evidência

### Pedido ruim
- envio informal de seed/key pessoal

## 7. Conta target recomendada

A autoridade futura não deve apontar para:
- key pessoal informal;
- conta sem processo de continuidade.

Deve apontar para:
- conta institucional dedicada;
- preferencialmente multisig ou equivalente de governança clara.

## 8. Critérios de sucesso para A

A será considerada alcançada só quando:
1. existir autoridade formal para mutação na lane alvo;
2. a responsabilidade operacional estiver documentada;
3. houver equivalência operacional comprovada com o fluxo já rodando em B;
4. a narrativa pública puder mudar sem overclaim.

## 9. Critérios de falha para A

A tentativa de convergência falha se:
- a autoridade não for concedida;
- a autoridade depender de custodial setup ruim;
- a governança proposta for mais frágil que a da lane própria endurecida;
- não houver clareza sobre responsabilidades e incidentes.

## 10. Como perseguir A sem fragilizar o hackathon

### Regra
A lane oficial continua sendo B até a convergência estar pronta e provada.

### Conduta recomendada
- não prometer migração iminente;
- não insinuar autoridade inexistente;
- tratar A como roadmap institucional opcional, porém sério.

## 11. Plano de execução resumido

### Fase 1 — readiness interna
- fechar docs de governança;
- definir target de custódia;
- organizar request pack.

### Fase 2 — abordagem externa
- apresentar o caso técnico e o boundary honesto;
- pedir transfer/delegation com estrutura madura;
- registrar a resposta e próximos passos.

### Fase 3 — equivalência e migração
- validar que a lane A-target reproduz o fluxo já provado em B;
- só então atualizar a claim pública de lane oficial.

## 12. Veredito
A Opção A deve ser perseguida como **convergência institucional disciplinada**, não como aposta de curto prazo para salvar narrativa. O melhor ativo da DPO2U para alcançá-la é justamente já operar bem a Opção B.
