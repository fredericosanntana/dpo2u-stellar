# A — Admin Transfer Playbook

**Status:** draft institucional-operacional  
**Data:** 2026-06-18

## Objetivo

Definir o caminho mais sério e preferencial para alcançar a Opção A: **transferência formal de autoridade administrativa** da lane alvo para uma conta institucional ou multisig da DPO2U.

## 1. Quando usar este playbook

Usar este playbook quando:
- a contraparte reconhecer valor em convergir para uma lane compartilhada operável pela DPO2U;
- houver abertura para mover a autoridade da instância alvo;
- houver concordância de que seed informal/pessoal não é solução aceitável.

## 2. Princípio central

A DPO2U **não** deve pedir posse informal de credencial.

O pedido correto é:
- transferência formal de admin; ou
- atualização formal da authority target; ou
- governança compartilhada explicitada em conta institucional/multisig.

## 3. Pré-requisitos internos antes da conversa

- `docs/B-FIRST-OPERATING-MODE.md` fechado
- `docs/GOVERNANCE-LANE-OWNERSHIP.md` fechado
- `docs/GOVERNANCE-INCIDENT-RUNBOOK.md` fechado
- `docs/OPS-READINESS-CHECKLIST.md` fechado
- `docs/A-REQUEST-PACK.md` fechado
- definição da **conta target** da DPO2U
- definição do modelo de custódia/continuidade dessa conta

## 4. Perguntas que precisamos responder internamente antes do pedido

1. Qual conta exatamente receberia a autoridade?
2. Essa conta é institucional ou apenas pessoal disfarçada?
3. Existe processo de rotação?
4. Existe continuidade se um operador falhar?
5. Quem aprova mutações de alto impacto?
6. Como incidentes serão comunicados?

## 5. Forma correta do pedido

### Pedido principal
> Queremos convergir a lane operacional para a Opção A por meio de uma transferência formal de admin/authority para uma conta institucional ou multisig da DPO2U, preservando trilha auditável, responsabilidade explícita e equivalência operacional com o fluxo já provado.

### O que o pedido deve incluir
- justificativa institucional;
- prova de capacidade técnica já demonstrada;
- descrição do target de governança;
- compromisso de não operar sob arranjo custodial informal;
- proposta de teste controlado de equivalência após a transferência.

## 6. O que não pedir

- seed ou chave pessoal “emprestada”;
- acesso informal via DM;
- exceção operacional sem registro;
- autoridade sem responsabilidade definida.

## 7. Sequência recomendada

### Etapa 1 — alinhamento institucional
- apresentar o boundary atual B-first;
- explicar que o gap remanescente é governança, não técnica;
- perguntar se existe abertura real para transfer/delegation.

### Etapa 2 — apresentar a conta target
- informar a conta institucional/multisig pretendida;
- explicar política de custódia e continuidade;
- explicar quem aprova mutações e incidentes.

### Etapa 3 — transferência formal
- contraparte executa `update_admin` ou mecanismo equivalente;
- mudança é registrada com tx/hash/ata notarial operacional se necessário;
- nova authority é validada em leitura e escrita controladas.

### Etapa 4 — teste de equivalência
- rodar caso conhecido do fluxo `registry revoke -> blocked-lane`;
- confirmar que a lane A reproduz a semântica já provada em B;
- guardar evidência antes de alterar qualquer claim pública.

## 8. Critérios de aceite

A transferência só deve ser dada como concluída quando:
1. a nova authority estiver formalmente configurada;
2. a DPO2U conseguir provar mutação controlada na lane alvo;
3. a responsabilidade institucional estiver documentada;
4. houver plano de reversão/rotação.

## 9. Red flags

Interromper ou rebaixar a prioridade se a contraparte propuser:
- compartilhamento informal de seed;
- controle pessoal não institucionalizado;
- “façam como quiserem e depois vemos a governança”;
- autoridade sem clareza de responsabilidade por incidente.

## 10. Resultado esperado

Se este playbook der certo, a DPO2U poderá dizer de forma honesta:
> A convergência para A foi alcançada por transferência formal de autoridade para uma conta institucional/governada, e não por improviso custodial.

## Veredito
Este é o caminho preferencial porque entrega o máximo de legitimidade institucional com o mínimo de ambiguidade operacional.
