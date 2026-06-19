# Governance — Incident Runbook

**Status:** draft operacional  
**Data:** 2026-06-18

## Objetivo

Definir a resposta mínima da DPO2U a incidentes que afetem a lane operacional oficial da Opção B, preservando clareza de autoridade, evidência e comunicação honesta.

## 1. Princípios

1. **Não esconder autoridade** — incidentes de blocked-lane são incidentes de operação governada.
2. **Não fabricar normalidade** — se a lane falhou, isso deve ser registrado.
3. **Preservar evidência primeiro** — antes de “arrumar”, capturar contratos, roots, txs, records e contexto.
4. **Fail-closed quando necessário** — se o estado estiver incerto, suspender automação é melhor que mutação errada.

## 2. Incidentes cobertos

### I1 — bloqueio indevido
Uma key foi inserida na blocked-lane sem que a revogação/policy justificasse isso.

### I2 — revogação equivocada na origem
O `protocol-registry` revogou ou pareceu revogar um caso por erro de input, operação ou interpretação.

### I3 — watcher fora do ar
O worker não está rodando, não consegue ler a origem ou não consegue persistir/executar.

### I4 — divergência entre registry e blocked-lane
O registry marca revogado, mas a key não está bloqueada; ou a key está bloqueada sem evidência coerente do registry.

### I5 — perda/risco da autoridade administrativa
Suspeita de comprometimento, perda de acesso, necessidade de rotação emergencial ou concentração excessiva da custódia.

## 3. Passos universais

### Passo 1 — classificar o incidente
Responder imediatamente:
- qual contrato foi afetado?
- houve mutação on-chain?
- qual a última tx relevante?
- há risco de nova mutação automática?

### Passo 2 — preservar evidência
Capturar:
- contract id envolvido;
- root atual;
- key afetada;
- tx ids relevantes;
- record `.json` mais recente;
- horário UTC;
- operador/automation source.

### Passo 3 — decidir contenção
Uma destas ações:
- manter watcher ativo;
- pausar watcher/cron;
- congelar mutações manuais até revisão;
- escalar decisão ao Shareholder.

### Passo 4 — registrar decisão
Toda resposta deve responder:
1. quem classificou;
2. quem aprovou contenção;
3. qual evidência foi usada;
4. se houve ou não mutação corretiva.

## 4. Runbooks por incidente

## I1 — bloqueio indevido

### Contenção
- pausar automação se a causa ainda não estiver clara;
- capturar `find_key`, `get_root`, record e tx do insert.

### Diagnóstico
- verificar se a decisão original estava de fato revogada;
- verificar se houve erro de parsing / package / input;
- verificar se a key corresponde ao caso certo.

### Correção
- se o erro for confirmado e houver autoridade apropriada, executar `delete_leaf`;
- persistir record de correção com causa explícita;
- revisar watcher/rule que permitiu o erro.

## I2 — revogação equivocada na origem

### Contenção
- não tratar automaticamente como bug da lane;
- congelar ação corretiva até validar se a origem mudou novamente.

### Diagnóstico
- reextrair o caso do registry;
- comparar snapshots/records;
- verificar se o erro está no registry ou na tradução local.

### Correção
- se a origem voltar ao estado correto e o bloqueio tiver sido indevido, processar remoção segundo I1.

## I3 — watcher fora do ar

### Contenção
- registrar indisponibilidade;
- avaliar se operação manual temporária é necessária.

### Diagnóstico
- falha de source account?
- falha de rede?
- falha do script?
- falha na persistência de records?

### Correção
- restaurar watcher;
- rodar checklist de readiness;
- executar replay controlado dos casos pendentes.

## I4 — divergência registry vs blocked-lane

### Contenção
- tratar como incidente de consistência;
- pausar mutações adicionais do caso afetado.

### Diagnóstico
- comparar snapshot live do registry;
- comparar records do watcher;
- comparar estado atual de `find_key`/`verify_non_membership`.

### Correção
- se faltar bloqueio para caso revogado, reprocessar controladamente;
- se houver bloqueio sem base, aplicar fluxo de remoção com registro.

## I5 — perda/risco de autoridade administrativa

### Contenção
- suspender mutações não essenciais;
- escalar imediatamente ao Shareholder.

### Diagnóstico
- a key está comprometida ou apenas indisponível?
- há caminho de rotação/admin-transfer?
- existe backup institucional?

### Correção
- executar rotação para target mais seguro quando suportado;
- atualizar docs de governança e readiness após o incidente.

## 5. Comunicação

### Comunicação interna mínima
- tipo do incidente;
- impacto atual;
- lane/contrato afetado;
- status da contenção;
- próxima decisão necessária.

### Comunicação externa mínima (se necessária)
- declarar fatos verificados apenas;
- não esconder boundary de autoridade;
- não prometer resolução antes de validar o estado on-chain.

## 6. Critério de encerramento

Um incidente só fecha quando:
- o estado atual foi revalidado;
- a contenção foi retirada ou tornada permanente;
- a evidência foi persistida;
- o aprendizado foi refletido em doc/runbook/checklist.

## Veredito
Este runbook existe para garantir que a lane própria seja defendida não só por execução, mas por **disciplina de resposta**.
