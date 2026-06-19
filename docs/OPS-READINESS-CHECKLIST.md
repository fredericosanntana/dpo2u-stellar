# Ops — Readiness Checklist

**Status:** draft operacional  
**Data:** 2026-06-18

## Objetivo

Checklist mínima para rodar, revisar ou apresentar a lane operacional B-first sem depender de memória informal.

## 1. Identidade da lane

- [ ] Confirmar contrato da lane própria: `CAEJBGQDGTFZ5DGRZZ5SYPSFUWRI4IX2V3KMDLS5ANUAI4TX52RTEUUS`
- [ ] Confirmar boundary externo auditado: `CDREZXZILERCSD7VMS4SKVRQY4FNIYJCTYA2AY4TKFRV6Y3L3M2OK3O3`
- [ ] Confirmar contrato do `protocol-registry` em uso
- [ ] Confirmar network (`testnet` nesta fase)

## 2. Autoridade operacional

- [ ] Confirmar que a source account usada pela DPO2U tem autoridade para mutar a lane própria
- [ ] Confirmar que não estamos assumindo escrita na instância externa
- [ ] Confirmar quem aprova mutações manuais de alto impacto

## 3. Scripts canônicos

- [ ] `integration/spp-adapter/scripts/extract_live_registry_decision.py`
- [ ] `integration/spp-adapter/scripts/prepare_non_membership_from_registry.py`
- [ ] `integration/spp-adapter/scripts/run_revocation_watcher.py`

## 4. Pré-check técnico

- [ ] Ler `get_root` da lane própria
- [ ] Validar leitura do registry para um caso conhecido
- [ ] Confirmar que o watcher consegue persistir records
- [ ] Confirmar que o diretório de artefatos/examples está acessível
- [ ] Confirmar horário UTC do host se o record depende de timestamp

## 5. Execução esperada

### Caso ativo
- [ ] worker deve retornar `no-op-active`
- [ ] não deve haver nova tx de insert
- [ ] record deve registrar no-op

### Caso revogado
- [ ] worker deve preparar blocked action
- [ ] se a key não estiver bloqueada, deve haver insert
- [ ] deve existir record com estado final e referências on-chain

### Caso já bloqueado
- [ ] rerun deve ser idempotente
- [ ] root não deve mudar sem necessidade
- [ ] record deve marcar ausência de nova mutação

## 6. Evidência mínima a guardar

- [ ] contract ids
- [ ] tx ids relevantes
- [ ] root antes/depois, quando aplicável
- [ ] key afetada
- [ ] snapshot do registry
- [ ] watcher record correspondente

## 7. Regras de apresentação pública

- [ ] dizer explicitamente que a lane oficial atual é própria
- [ ] não sugerir controle da instância externa
- [ ] mencionar A como convergência institucional, não como capability já adquirida

## 8. Regras de pausa / no-go

Se qualquer item abaixo for verdadeiro, parar e revisar antes de mutar:
- [ ] autoridade administrativa incerta
- [ ] divergência entre snapshot do registry e package preparado
- [ ] record anterior inconsistente ou ausente
- [ ] dúvida sobre qual key está sendo bloqueada
- [ ] dúvida sobre ambiente/rede/contract id

## 9. Pós-execução

- [ ] reler estado final (`find_key`, `verify_non_membership` ou equivalente)
- [ ] salvar record
- [ ] anexar referência de tx/root no relatório pertinente
- [ ] registrar se foi execução nova, no-op ou rerun idempotente

## Veredito
Se esta checklist não pode ser satisfeita, a operação não está pronta para ser tratada como enforcement sério, só como experimento.
