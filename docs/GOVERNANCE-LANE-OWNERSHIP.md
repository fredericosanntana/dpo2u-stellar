# Governance — Lane Ownership

**Status:** draft operacional  
**Data:** 2026-06-18

## Objetivo

Explicar, sem ambiguidade, quem controla a lane operacional oficial da DPO2U, como essa autoridade deve evoluir e quais princípios de governança se aplicam enquanto a operação ainda está em fase de hardening.

## 1. Princípio central

A DPO2U não deve esconder autoridade operacional.

Se existe uma conta capaz de mutar a blocked-lane, isso precisa ser:
- explícito;
- auditável;
- evolutivo;
- sujeito a runbook e futura institucionalização.

## 2. Estado atual

### Lane oficial atual
- contrato: `CAEJBGQDGTFZ5DGRZZ5SYPSFUWRI4IX2V3KMDLS5ANUAI4TX52RTEUUS`

### Poderes relevantes nessa lane
- inserir bloqueio (`insert_leaf`);
- remover bloqueio (`delete_leaf`);
- trocar admin, conforme suporte do contrato/stack operacional aplicável;
- operar o watcher que transforma revogação em blocked-lane.

### Verdade atual
A lane é operacionalmente controlada pela DPO2U neste host/workspace. Isso é suficiente para execução e demo, mas **não deve ser tratado como estado final de governança** se a custódia ainda estiver excessivamente concentrada.

## 3. Target state de governança

### Estado aceitável de longo prazo
A lane oficial deve ser governada por uma destas formas, nesta ordem de preferência:

1. **conta institucional com processo formal de custódia**;
2. **multisig institucional**;
3. **conta dedicada de operação com segregação de função e rotação documentada**.

### Estado não desejado como steady state
- key pessoal informal;
- seed única fora de política institucional;
- operação dependente da memória de uma pessoa;
- ausência de processo de rotação/admin-transfer.

## 4. Papéis mínimos

### Shareholder / DPO
- aprova mudanças estruturais de governança;
- aprova eventual migração para A;
- aprova delegações sensíveis.

### Operador da lane
- executa mudanças autorizadas;
- mantém watcher, runbooks e records;
- responde a incidentes operacionais.

### Revisor / controle
- revisa mudanças de política e claims públicos;
- valida que boundary de autoridade continua honesto.

## 5. Regras de autoridade

### Quem pode bloquear
Só a autoridade administrativa da lane oficial ou processo automatizado autorizado por ela.

### Quem pode desbloquear
Mesmo princípio: desbloqueio é ato de alto impacto e não deve ocorrer por improviso operacional.

### Quem pode trocar admin
Apenas a autoridade atual, conforme o contrato/processo suportado.

## 6. Regras de mudança

Toda mudança de governança relevante deve responder:
1. quem autorizou;
2. quem executou;
3. por qual motivo;
4. em qual contrato/conta;
5. qual evidência foi guardada.

## 7. Incidentes que precisam de runbook explícito

- bloqueio indevido;
- revogação equivocada na origem;
- watcher fora do ar;
- divergência entre registry e blocked-lane;
- perda/rotação de autoridade administrativa;
- necessidade de congelar operação pública temporariamente.

## 8. Relação com a instância externa auditada

A instância externa auditada **não** está sob nossa autoridade atual.

Logo:
- ela não faz parte da governança executiva da lane oficial atual;
- ela entra como referência externa e potencial futura convergência;
- qualquer narrativa que a trate como lane governada pela DPO2U está errada.

## 9. Regra de messaging

### Fórmula correta
> A DPO2U opera hoje sua própria lane de enforcement e está endurecendo sua governança para um modelo institucional explícito.

### Fórmula incorreta
> A DPO2U já controla a instância auditada externa.

## 10. Próximos passos de governança

1. mapear a custódia real atual da conta administrativa;
2. decidir target institucional ou multisig;
3. escrever runbook de rotação de admin;
4. escrever RACI operacional;
5. revisar se o hackathon deve explicitar o modelo atual ou apenas o princípio e o target state.

## Veredito
A lane própria é aceitável como base operacional **desde que sua autoridade seja tratada como problema de governança a ser endurecido, não como detalhe a ser escondido**.
