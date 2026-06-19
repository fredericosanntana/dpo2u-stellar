# A — Migration & Equivalence Checklist

**Status:** draft técnico-institucional  
**Data:** 2026-06-18

## Objetivo

Checklist para validar que a convergência da lane B para a lane A preserva a semântica operacional, a responsabilidade institucional e a honestidade da narrativa pública.

## 1. Pré-condições de governança

- [ ] autoridade formal para mutação na lane A existe
- [ ] conta/authority target foi definida institucionalmente
- [ ] há processo de incidente e reversão
- [ ] há responsável explícito por mutações de alto impacto
- [ ] não dependemos de seed informal/pessoal

## 2. Pré-condições técnicas

- [ ] contract id da lane A confirmado
- [ ] network/ambiente confirmado
- [ ] leitura (`get_root`, `find_key`, equivalentes) validada
- [ ] escrita controlada possível sob authority legítima
- [ ] watcher/package atual pode apontar para a lane A sem gambiarra perigosa

## 3. Equivalência funcional mínima

- [ ] caso ativo continua gerando `no-op`
- [ ] caso revogado gera blocked action semanticamente idêntica
- [ ] insert ocorre com o mesmo critério de key/case
- [ ] rerun continua idempotente
- [ ] record continua preservando tx/root/evidência

## 4. Equivalência de observabilidade

- [ ] tx ids podem ser capturados do mesmo modo ou de modo documentado
- [ ] roots podem ser lidos/registrados
- [ ] `find_key`/verificação equivalente pode ser reexecutada
- [ ] evidência pode ser comparada com a baseline B

## 5. Equivalência de governança

- [ ] está claro quem autoriza mutações
- [ ] está claro quem responde por erro
- [ ] está claro quem aprova desbloqueio/correção
- [ ] runbook de incidente foi adaptado para A

## 6. Teste controlado obrigatório

Antes de alterar claim pública:
- [ ] selecionar caso de teste conhecido
- [ ] rodar leitura da origem
- [ ] preparar blocked action
- [ ] executar mutação legítima na lane A
- [ ] validar estado final
- [ ] guardar record completo
- [ ] comparar contra baseline da lane B

## 7. Go / no-go para mudar a narrativa pública

Só mudar a claim oficial se:
- [ ] a autoridade estiver formalmente resolvida
- [ ] a equivalência estiver provada
- [ ] a documentação de governança estiver atualizada
- [ ] não houver overclaim residual sobre quem controla o quê

## 8. Fallback rule

Se qualquer item crítico falhar:
- [ ] a lane oficial permanece B
- [ ] A continua em validação
- [ ] a falha é registrada como institucional/técnica conforme o caso

## 9. Evidência mínima da migração

- [ ] contrato alvo
- [ ] autoridade usada
- [ ] tx ids de teste
- [ ] root/estado antes e depois
- [ ] record do watcher/adaptador
- [ ] decisão formal de atualização de narrativa

## Veredito
A só pode ser declarada “alcançada” depois de passar nesta checklist; antes disso, ela é intenção séria, não fato operacional.
