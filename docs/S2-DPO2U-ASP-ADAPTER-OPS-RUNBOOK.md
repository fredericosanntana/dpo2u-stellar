# S2 — DPO2U ASP Adapter — Ops Runbook

## Objetivo

Operar a admissão SPP a partir de uma decisão válida do `protocol-registry`, com trilha de auditoria e sem abrir a guarda operacional.

---

## Modo suportado na S2

### 1. Prepared mode
Use quando:
- a assinatura admin não ficará com o adapter;
- você quer validar payload/material antes da submissão;
- está em ambiente de homologação operacional.

### 2. Executed mode
Use quando:
- há credencial operacional autorizada;
- o objetivo é demo/execução real;
- você consegue comprovar `tx_handle` e root observada.

---

## Pré-check obrigatório

Antes de qualquer admissão:

- [ ] `subject_commitment` definido
- [ ] `claim_type` definido
- [ ] `jurisdiction` definida
- [ ] `attestation_root` definido
- [ ] `note_public_key` recebido
- [ ] `membership_contract_id` confirmado
- [ ] network confirmada
- [ ] issuer lane ativa
- [ ] `verify_attestation_proof(...) == true`

Se qualquer item falhar, **não seguir**.

---

## Fluxo operacional

### Etapa 1 — Confirmar elegibilidade canônica
Conferir no `protocol-registry`:
- issuer ativo
- tier/stake compatível
- scope compatível
- attestation existente
- attestation não revogada
- root correta

**Saída esperada:** status `policy_verified`

---

### Etapa 2 — Preparar material de membership
Gerar ou receber:
- `membership_blinding`
- `membership_leaf`

Regra canônica:

```text
membership_leaf = Poseidon2(note_public_key, membership_blinding, domain=0x01)
```

**Saída esperada:** status `material_prepared`

---

### Etapa 3 — Montar registro da operação
Criar um `AdmissionExecutionRecord` com:
- request id
- payload de entrada
- leaf derivado
- contrato destino
- modo (`prepared`/`executed`)
- operador
- timestamp

**Saída esperada:** status `submission_ready`

---

### Etapa 4A — Prepared mode
Emitir:
- leaf final
- contrato destino
- instrução de submissão
- root atual observada (se disponível)

**Saída esperada:** status `prepared`

---

### Etapa 4B — Executed mode
Executar a submissão de `insert_leaf`.

Capturar:
- tx hash / invocation handle
- root antes
- root depois
- operador que executou

**Saída esperada:** status `submitted` -> `confirmed`

---

### Etapa 5 — Handoff final
Entregar ao time:
- registro final da admissão
- root resultante ou handle verificável
- observações de risco se houver

**Saída esperada:** status `handoff_complete`

---

## Revogação

Quando houver revogação no DPO2U:

1. registrar o evento de revogação;
2. classificar se o efeito é:
   - deny future admissions only;
   - soft removal semântica DPO2U;
   - inclusão no `asp-non-membership` do SPP;
3. executar a ação aplicável;
4. registrar tx/root/estado final.

---

## Evidência mínima aceitável

Uma admissão só conta como real se houver pelo menos um dos itens abaixo:

- tx hash / invocation handle verificável; ou
- root before/after observável; ou
- artefato inequívoco de submissão assinado.

Sem isso, tratar como **prepared only**.

---

## Anti-overclaim checklist

- [ ] não dizer “gateway pronto” se só houver payload preparado
- [ ] não dizer “integração automática” se a submissão ainda for manual-admin
- [ ] não dizer “revogação coberta” se a blocked-list não tiver sido mapeada por lane
- [ ] não dizer “trustless” se houver dependência de operator/admin

---

## Critério de encerramento da S2

- [ ] spec fechada
- [ ] runbook fechado
- [ ] payload de exemplo pronto
- [ ] derivação do leaf congelada
- [ ] modo prepared funcional
- [ ] modo executed definido ou explicitamente adiado
- [ ] demo com evidência real
