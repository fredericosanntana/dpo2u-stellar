# S2 — DPO2U ASP Adapter (admin-mediated v1)

## Executive thesis

A DPO2U não precisa construir um novo privacy pool para pousar no SPP.

Ela precisa construir um **adapter de admissão** entre:

- o seu plano canônico de verdade regulatória (`protocol-registry`), e
- o plano real de enforcement do SPP (`asp-membership` / `asp-non-membership`).

O produto correto da S2 é:

> **transformar uma decisão canônica de compliance da DPO2U em uma ação real e auditável de admissão no ASP do SPP**.

---

## 1. O que a S2 é

A S2 é um **adapter operacional e técnico**.

Ela recebe uma decisão DPO2U do tipo:

- este sujeito
- sob este claim type
- nesta jurisdição
- com este `attestation_root`
- emitido por issuer elegível
- sob política ativa e stake/tier válidos

E converte isso em:

- `membership_blinding`
- `membership_leaf`
- payload de submissão para `insert_leaf`
- registro auditável da operação

---

## 2. O que a S2 não é

A S2 **não é**:

- um novo pool de privacidade;
- uma substituição do SPP;
- uma unificação protocolar completa DPO2U-SPP;
- um gateway trustless fully-on-chain;
- um mecanismo final de governança/slash econômico.

Ela é um **pouso admin-mediated v1**.

---

## 3. Componentes canônicos já existentes

## DPO2U / truth layer

### `protocol-registry`
Superfícies relevantes já presentes:
- `register_attestation(...)`
- `revoke_attestation(...)`
- `verify_attestation_proof(...)`
- `configure_issuer_profile(...)`
- `set_issuer_claim_scope(...)`
- `set_issuer_jurisdiction_scope(...)`
- `set_policy_stake(...)`
- `credit_issuer_stake(...)`
- `slash_issuer_stake(...)`

Papel na S2:
- dizer se a credencial positiva está válida **agora**.

---

## DPO2U / operational ASP semantics

### `asp-mvp`
Superfícies relevantes já presentes:
- `add_to_set(...)`
- `remove_from_set(...)`
- `contains(...)`
- `current_root()`
- `get_member(...)`

Papel na S2:
- servir como referência de semântica operacional DPO2U:
  - admissão fail-closed
  - remoção condicionada à invalidação
  - root operacional do conjunto ativo

---

## SPP / execution target

### `asp-membership`
Superfície alvo:
- `insert_leaf(leaf)`

### `asp-non-membership`
Superfície alvo:
- inserção de blocked key/value na sparse Merkle tree

### `pool`
Consome:
- `asp_membership_root`
- `asp_non_membership_root`

E invalida a proof se não baterem com os contracts ASP atuais.

---

## 4. Arquitetura da S2

## 4.1 Control plane DPO2U
Responsável por:
- política
- issuer gating
- escopo
- stake simbólico
- validade temporal
- revogação
- trilha de decisão

## 4.2 Adapter plane
Responsável por:
- receber a decisão válida
- receber `note_public_key`
- produzir `membership_blinding`
- derivar `membership_leaf`
- preparar ou executar `insert_leaf`
- registrar o resultado

## 4.3 Data plane SPP
Responsável por:
- armazenar membership root / non-membership root
- forçar roots corretos na proof
- executar o fluxo privado

---

## 5. Contrato de entrada da S2

## 5.1 AdmissionDecisionInput

Campos mínimos:

| Campo | Origem | Descrição |
|---|---|---|
| `subject_commitment` | DPO2U | sujeito canônico da attestation |
| `claim_type` | DPO2U | tipo de claim |
| `jurisdiction` | DPO2U | jurisdição da lane |
| `attestation_root` | DPO2U | root da attestation registrada |
| `note_public_key` | usuário / onboarding | chave pública usada no SPP |
| `target_network` | ops | testnet/futurenet/etc |
| `membership_contract_id` | SPP | contrato destino para `insert_leaf` |
| `non_membership_contract_id` | SPP/opcional | contrato de blocked list |
| `operator_mode` | ops | `prepared` ou `executed` |

---

## 6. Pré-condições obrigatórias

A S2 só pode seguir se `verify_attestation_proof(...) == true` no `protocol-registry`.

Na prática, isso implica que já passaram:
- existência da attestation;
- policy ativa para `(claim_type, jurisdiction)`;
- issuer profile válido;
- trust tier suficiente;
- stake mínimo suficiente, se configurado;
- attestation não revogada;
- validade temporal satisfeita;
- root correto.

Se qualquer ponto falhar, a S2 deve terminar em:

`policy_denied`

sem derivar nem submeter leaf.

---

## 7. Material de membership

## 7.1 Campo novo da S2

### `membership_blinding`
É o valor usado para compor o leaf de membership aceito pelo SPP.

### decisão de produto
Na S2, esse campo deve ser tratado como **material operacional controlado**, não como detalhe descartável.

---

## 7.2 Fórmula canônica

O leaf de membership deve seguir exatamente o contrato do SPP:

```text
membership_leaf = Poseidon2(note_public_key, membership_blinding, domain=0x01)
```

Isso não é conjectura de arquitetura.
É a landing zone real já auditada na S1.

---

## 8. Modos de execução

## 8.1 Prepared mode
A S2 produz:
- material derivado
- payload final
- instrução pronta para submissão
- registro auditável em status `prepared`

Mas **não** toca on-chain.

Uso correto:
- fase inicial
- validação operacional
- ambientes em que a assinatura admin fica fora do adapter

---

## 8.2 Executed mode
A S2 produz e também executa:
- submissão para `insert_leaf`
- captura de `tx hash` / handle equivalente
- leitura de root antes/depois, quando disponível
- registro auditável em status `submitted/confirmed`

Uso correto:
- demo fechada
- ambiente com credencial operacional controlada

---

## 9. Contrato de saída da S2

## 9.1 AdmissionExecutionRecord

Campos mínimos:

| Campo | Descrição |
|---|---|
| `request_id` | id da operação |
| `status` | `draft`, `policy_verified`, `prepared`, `submitted`, `confirmed`, `failed` |
| `subject_commitment` | sujeito canônico |
| `claim_type` | claim usada |
| `jurisdiction` | lane regulatória |
| `attestation_root` | root usada na verificação |
| `note_public_key` | chave pública do usuário |
| `membership_blinding` | material usado na derivação |
| `membership_leaf` | leaf final |
| `membership_contract_id` | contrato destino |
| `root_before` | root observada antes |
| `root_after` | root observada depois |
| `tx_handle` | tx hash / invocation handle / receipt |
| `executed_by` | operador ou bot |
| `executed_at` | timestamp |
| `failure_reason` | se houver |

---

## 10. Semântica de revogação

A S2 não pode ter só happy path.

## 10.1 Tipos de reação à revogação

### Caso A — deny future admissions only
Usado quando a preocupação é impedir novas admissões, sem tocar o conjunto já usado no SPP.

### Caso B — soft operational removal
Usado quando a semântica local DPO2U exigir que o membro deixe o conjunto operacional observado no `asp-mvp`.

### Caso C — explicit block action in SPP
Usado quando a revogação deve se refletir no `asp-non-membership` do SPP para endurecer o enforcement futuro.

## 10.2 Regra de produto para S2
A S2 deve pelo menos:
- documentar qual caso se aplica por lane;
- registrar o motivo da revogação;
- registrar se houve ou não ação no `asp-non-membership`.

---

## 11. Fluxo alvo da demo S2

1. policy lane configurada no `protocol-registry`
2. issuer válido com trust/stake compatíveis
3. attestation registrada
4. `verify_attestation_proof(...) == true`
5. usuário entrega `note_public_key`
6. adapter gera `membership_blinding`
7. adapter deriva `membership_leaf`
8. adapter prepara ou executa `insert_leaf`
9. root do `asp-membership` muda ou a tx fica comprovada
10. registro final da operação é persistido

---

## 12. Critério de pronto

A S2 só está pronta quando existir evidência verificável de:

- decisão DPO2U válida;
- derivação correta do leaf SPP;
- payload ou submissão real para `insert_leaf`;
- root/tx comprovável;
- trilha auditável legível por operador.

Sem isso, a sprint não está pronta — está só descrita.

---

## 13. Recomendação de implementação

### Ordem correta
1. spec
2. runbook
3. exemplos de payload
4. helper de derivação do leaf
5. helper de payload de submissão
6. opcional: executor admin
7. demo validada

### Evitar agora
- generalized gateway novo
- nova abstração ZK
- refatoração ampla do SPP
- fusão conceitual entre `asp-mvp` e `asp-membership`

---

## 14. Veredito

A S2 correta não é “construir mais protocolo”.

A S2 correta é:

> **operacionalizar a passagem entre verdade regulatória DPO2U e admissão efetiva no ASP do SPP**

com o menor número de partes novas, máxima auditabilidade e zero overclaim.