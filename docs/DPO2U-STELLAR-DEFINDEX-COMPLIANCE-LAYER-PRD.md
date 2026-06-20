# PRD — DPO2U Stellar/DeFindex Compliance Layer

**Status:** PRD canônico  
**Produto:** layer de policy/attestation da DPO2U para Stellar + DeFindex  
**Tese principal:** resultados de compliance viram condições verificáveis de admissão e execução  
**Memo relacionado:** `docs/STELLAR-DEFINDEX-LEGAL-CIRCUITS-MEMO.md`  
**S1 canônico:** `docs/S1-CVM175-REBALANCE-PREDICATE-MAP.md`  
**Fase 2 relacionada:** `docs/PHASE2-OPERATOR-SAFEGUARDS-PRD.md`, `docs/PHASE2-CLAIM-BOUNDARY.md`, `docs/PHASE2-TRAVEL-RULE-ADJACENT-FLOW.md`, `docs/PHASE2-OPERATOR-SAFEGUARDS-DEMO-RUNBOOK.md`

## Objetivo

Definir a superfície de produto **estreita, honesta e institucionalmente legível** para a DPO2U como layer de conformidade em torno das operações de vault institucional da DeFindex em Stellar.

A DPO2U não deve ser posicionada como KYC embutido. Ela deve ser posicionada como o **control plane** que converte resultados jurídico-regulatórios obtidos a montante em atestações verificáveis que podem gatear admissão e execução privilegiada. Para DeFindex, a primeira surface nativa **não** é depósito retail gated; é o plano de operador role-gated.

Depois de S1–S5, a verdade do repo já evoluiu um passo adicional: hoje a tese suportada já não é apenas `proof-bound rebalance`, mas uma camada **operator/safeguards/reporting-aware** ainda estreita, ainda institutional operator-side e ainda explicitamente fora de `VASP/PSAV full`.

## Matriz — verdade atual / alvo / não-objetivos

| Área | Verdade atual no repo | Alvo | Não-objetivo |
|---|---|---|---|
| **Verificação de atestação** | `AttestationClient.verify` lê atestações DPO2U por `use_case_id` + `evidence_hash` | verificador estável para apps, gateways e contratos | reexecutar KYC dentro do verificador |
| **Padrão ASP/admission** | docs de registry/ASP já provam admissão em positive set e revogação | reutilizar admission loops para SPP e outros conjuntos positivos | alegar governança final sobre toda lane externa SPP/admin |
| **Gateway DeFindex** | `DefindexPolicyGateway` já modela gating de ação privilegiada com verifier/client injetados, incluindo paths adicionais de operator admission, safeguards e reporting | adapter sobre `@defindex/sdk` real + caminho role-as-contract | custódia, assinatura ou movimentação de valor pela DPO2U |
| **Evidência live DeFindex** | existe slice live com rebalance proof-bound contra vault real DeFindex e demo reproduzível de reporting evidence loop | loop de execução repetível para ações privilegiadas escolhidas | alegar acesso total à API/operator da DeFindex ou prontidão mainnet |
| **Catálogo legal** | catálogo do SDK inclui LGPD, VASP/PSAV, CVM 175, Travel Rule, MiCAR/CASP e reporting | selecionar IDs de política por circuito e por ação | mega-circuito multi-lei/global no V1 |
| **Fase 2 operator/safeguards/reporting** | docs, tipos, testes e demo parcial já existem no repo | endurecer fontes live e expandir só se houver demanda real de partner/GTM | chamar isso de `VASP full` ou retail/full-stack gating |
| **Gating de depósito** | repo evita explicitamente alegar allowlist nativa de depósito retail DeFindex | política UX off-chain opcional, claramente marcada | alegar que depósitos DeFindex são nativamente KYC-gated |

## Problema

Apps financeiros institucionais em Stellar precisam de mais do que um dashboard dizendo que compliance aconteceu. Eles precisam de uma forma de tornar ações reguladas **condicionais a um resultado de policy verificável**, sem publicar evidência sensível e sem reconstruir lógica regulatória dentro de cada app.

A DeFindex expõe a surface correta porque suas ações institucionais são role-gated:

- criação de vault;
- rebalance;
- emergency rescue;
- pause/unpause de estratégia;
- fee distribution.

Essas ações se conectam naturalmente a circuitos legais de:

- autoridade do operador;
- mandato do vault;
- elegibilidade de ativo;
- safeguards;
- reporting;
- resposta a incidentes.

O problema de produto é tornar esses circuitos **executáveis** sem overclaim:

- **LGPD** define o que pode ser revelado e o que precisa ficar off-chain;
- **PSAV/VASP** define o regime operacional e de safeguards; Travel Rule é só um circuito dentro dele;
- **CVM 175** fornece a melhor âncora institucional brasileira para mandato, gestão e governança de rebalance;
- superfícies de depósito/withdraw da DeFindex não devem ser vendidas como gates nativos de KYC retail se a própria DeFindex não suporta isso.

## Posicionamento do produto

### One-liner

> **A DPO2U é o control plane de compliance que permite a ações em Stellar e DeFindex provarem que estão autorizadas sem expor o dossiê regulatório subjacente.**

### O que a DPO2U é

- camada de attestation e policy;
- gate verificável de admissão/execução;
- ponte entre resultado legal e condição em Stellar;
- control plane fail-closed para ações privilegiadas da DeFindex.

### O que a DPO2U não é

- vendor de KYC;
- substituto de onboarding wallet;
- ferramenta só de Travel Rule;
- allowlist retail de depósito da DeFindex;
- motor final de parecer jurídico para toda jurisdição.

## Arquitetura do control plane

```text
Evidência de compliance a montante
  - revisão de privacidade/disclosure
  - checks de operador VASP/PSAV
  - mandato de vault sob CVM 175
  - evidência de Travel Rule/reporting
  - safeguards / reserve / incident evidence
        |
        v
Compliance engine / policy evaluator DPO2U
  - computa PASS / FAIL / REVIEW
  - faz binding do resultado ao evidence_hash
  - seleciona use_case_id
        |
        v
Registry / verifier DPO2U
  - verify(use_case_id, evidence_hash)
  - semântica fail-closed
        |
        v
Loop de admissão ou loop de execução
  - admissão: positive set / SPP / elegibilidade de operador
  - execução: ação privilegiada de vault DeFindex
        |
        v
Ação Stellar / DeFindex
  - prepara tx não assinada apenas quando permitido
  - operador assina e transmite
```

## Atores canônicos

| Ator | Papel |
|---|---|
| **Participante** | pessoa/entidade/commitment buscando admissão ou permanência |
| **Operador** | entidade que roda operações de vault ou workflow regulado |
| **Issuer / compliance evaluator** | parte ou engine upstream que computa o resultado jurídico-político |
| **Registry/verifier DPO2U** | camada verificável que lê/grava atestações por `use_case_id` + `evidence_hash` |
| **DeFindex Manager** | papel que cria/administra configuração de vault |
| **DeFindex Rebalance Manager** | papel que realoca posições de estratégia |
| **DeFindex Emergency Manager** | papel que resgata, pausa ou despausa em situações excepcionais |
| **DeFindex Fee Receiver** | papel/endereço associado à distribuição de taxas |
| **Auditor / regulador / parceiro** | verifica se a ação teve outcome de policy atestado, sem ver PII crua |

## Circuitos canônicos e transições de estado

### Circuito 1 — Privacidade / disclosure

**Objetivo:** garantir que o sistema prove conformidade sem vazar PII.

| Estado | Significado |
|---|---|
| `evidence_collected_offchain` | o dossiê regulatório existe fora da chain |
| `disclosure_minimized` | só hash/commitment/verdict devem chegar a Stellar |
| `attested` | a DPO2U já registrou ou consegue verificar o predicado de privacy/disclosure |
| `revoked_or_expired` | admissão/execução deve falhar fechado ou exigir recheck |

IDs candidatos: `lgpd_compliance_v1`, `consent_record_v1`, `erasure_v1`, `dsr_request_v1`.

### Circuito 2 — Operador e safeguards VASP/PSAV

**Objetivo:** estabelecer que a postura do operador/prestador foi avaliada além de uma única mensagem de Travel Rule.

| Estado | Significado |
|---|---|
| `operator_unreviewed` | não existe outcome utilizável |
| `operator_review` | evidência está sendo avaliada |
| `operator_passed` | predicado de operador/safeguard pode admitir ou autorizar |
| `operator_blocked` | predicado falhou, expirou ou foi revogado |

IDs candidatos: `sect_bcb_14478_v1`, `vasp_por_br_v1`, `micar_casp_v1`.

### Circuito 3 — Criação de vault sob mandato

**Objetivo:** ligar a criação do vault DeFindex a um mandato institucional aprovado.

| Estado | Significado |
|---|---|
| `draft_vault_payload` | roles, assets, fees e mandato foram preparados |
| `payload_hashed` | o payload exato da ação vira `evidence_hash` |
| `mandate_attested_pass` | `defindex_vault_create_v1` ou predicado de mandato retornou `PASS` |
| `unsigned_tx_prepared` | tx DeFindex de criação foi preparada para assinatura do operador |
| `denied` | ausência, `FAIL` ou `REVIEW` impedem a preparação |

IDs candidatos: `defindex_vault_create_v1`, `sect_cvm_175_v1`, `cvm_token_v1`.

### Circuito 4 — Governança de rebalance

**Objetivo:** garantir que cada rebalance respeite mandato, risco e policy de ativo.

| Estado | Significado |
|---|---|
| `rebalance_intent` | instruções de estratégia foram definidas |
| `intent_bound` | hash do intent prende a prova à instrução exata |
| `policy_pass` | predicado de rebalance retornou `PASS` |
| `rebalance_prepared` | tx não assinada de rebalance foi preparada |
| `executed_or_rejected` | operador transmite ou o gateway nega fail-closed |

IDs candidatos: `defindex_rebalance_v1`, `sect_cvm_175_v1`, predicados específicos de ativo.

### Circuito 5 — Emergência e incidente

**Objetivo:** tornar ações excepcionais auditáveis e autorizadas.

| Estado | Significado |
|---|---|
| `incident_declared` | incidente ou trigger de risco foi documentado |
| `incident_attested` | predicado de emergência foi ligado ao payload |
| `rescue_pause_or_unpause_prepared` | tx privilegiada só é preparada com `PASS` |
| `post_incident_review` | follow-up/report pode ser committed separadamente |

IDs candidatos: `defindex_rescue_v1`, `defindex_pause_v1`, `defindex_unpause_v1`.

### Circuito 6 — Travel Rule e reporting

**Objetivo:** tratar mensageria coberta e reportes periódicos sem confundir isso com o regime VASP inteiro.

| Estado | Significado |
|---|---|
| `message_or_report_required` | a policy determinou obrigação de mensagem/reporte |
| `artifact_generated` | mensagem Travel Rule ou reporte foi gerado off-chain |
| `artifact_hash_attested` | hash/verdict foi registrado ou verificado |
| `settlement_or_audit_allowed` | fluxo downstream pode prosseguir com evidência |

IDs candidatos: `travel_rule_v1`, `sect_fatf_tr_v1`, `sect_rfb_1888_v1`, `sect_cvm_175_v1`.

## Roadmap / sprints

### Estado atual reconciliado

- **S0–S5**: fechadas no recorte original de lane pública `rebalanceVault` proof-bound + role-as-contract + boundary partner/legal.
- **Fase 2 parcial**: já materializada no SDK/docs com surface adicional de `operator admission`, `safeguards`, `reporting` e modelagem de `Travel Rule` adjacente.
- **Boundary atual**: o repo suporta `operator/safeguards/reporting-aware layer`; ainda não suporta claim de `VASP/PSAV full`.

| Fase | Objetivo | Entregável |
|---|---|---|
| **S0 — Verdade canônica** | congelar framing legal/produto e linguagem anti-overclaim | este PRD + memo de circuitos legais |
| **S1 — Predicate map** | escolher uma operação DeFindex e sua âncora legal principal | `use_case_id` final, schema do payload, critérios PASS/FAIL |
| **S2 — Adapter hardening** | encapsular a surface real de operador do SDK DeFindex | adapter tipado retornando unsigned XDR + testes de deny path |
| **S3 — Proof-bound execution demo** | reproduzir uma ação do payload hash até tx preparada/executada | runbook com tx IDs e verificação |
| **S4 — Role-as-contract validation** | validar se um contrato DPO2U pode ocupar papel na DeFindex | vault testnet com role de policy ou blocker documentado |
| **S5 — Partner/legal validation** | revisar wording e fluxo com DeFindex/operator/jurídico | claims públicas aprovadas, open questions, handoff parceiro |

## Decisão S1 — primeiro circuito público

O primeiro circuito parceiro público está resolvido: **Governança de rebalance via CVM 175**.

S1 congela uma única operação DeFindex e uma âncora legal principal:

| Campo | Decisão S1 |
|---|---|
| Ação DeFindex | `rebalanceVault` |
| Papel DeFindex | Rebalance Manager |
| Predicado de operador / `use_case_id` | `defindex_rebalance_v1` |
| Âncora legal principal | `sect_cvm_175_v1` |
| Artefato canônico | `docs/S1-CVM175-REBALANCE-PREDICATE-MAP.md` |

Racional: rebalance é a surface mais clara para provar execução privilegiada, bound ao payload exato, sem transformar a DPO2U em KYC vendor ou prometer gate retail de depósito. CVM 175 é a âncora institucional brasileira mais legível para mandato, alocação, risco e governança de rebalance. PSAV/VASP safeguards e Travel Rule continuam como circuitos adjacentes posteriores: importantes, mas não são a primeira lane pública de S1.

### Saídas e critérios de aceite S1

S1 está aceito quando:

- `docs/S1-CVM175-REBALANCE-PREDICATE-MAP.md` existe e define `rebalanceVault`, Rebalance Manager, `sect_cvm_175_v1` e `defindex_rebalance_v1`;
- o documento S1 explica por que CVM 175 rebalance governance foi escolhido em vez de PSAV/VASP safeguards e Travel Rule settlement evidence;
- o payload de evidência proposto é estreito, canônico e hasheável, sem PII crua on-chain;
- o princípio de `evidence_hash` prende o veredito ao payload exato da ação;
- os critérios `PASS`, `FAIL` e `REVIEW` estão definidos e mantêm semântica fail-closed;
- os limites anti-overclaim deixam claro que CVM 175 é o primeiro anchor público, não substituto de LGPD, PSAV/VASP, Travel Rule ou parecer jurídico final;
- as dependências para S2/S3 estão explícitas: adapter real, hashing canônico, deny paths, unsigned XDR e demonstração proof-bound.

## Padrão de validação e evidência

Toda claim deve cair num destes níveis:

| Nível | Requisito |
|---|---|
| **Code-real** | implementado e testado neste repo |
| **Live-slice** | executado em testnet/mainnet com tx IDs e notas de replay |
| **Documented-target** | claramente marcado como alvo, com dependência ou open question |
| **Non-goal** | explicitamente fora de escopo para não induzir juiz/parceiro/usuário ao erro |

### Regras de validação

- o gate de policy deve falhar fechado: só `PASS` permite;
- o `evidence_hash` deve estar ligado ao payload exato da ação autorizada;
- helpers de ação DeFindex não podem chamar o client injetado quando negados;
- a DPO2U não pode assinar, custodiar ou transmitir como parte da claim do gateway;
- docs públicas devem distinguir loop de admissão de loop de execução;
- **LGPD, VASP/PSAV, CVM 175, Travel Rule, DeFindex e circuitos** precisam aparecer nos docs canônicos.

## Perguntas abertas

1. quais papéis da DeFindex podem ser ocupados com segurança por um contrato Soroban no fluxo atual?
2. quais métodos exatos do `@defindex/sdk` retornam unsigned XDR para cada ação privilegiada?
3. quais validações partner/legal são necessárias antes de publicar a claim S1 de governança de rebalance via CVM 175?
4. qual schema de evidência deve ser congelado depois para `defindex_vault_create_v1` e circuitos adjacentes a `defindex_rebalance_v1`?
5. quais artefatos de reporting podem ser hasheados/atestados sem criar problema de disclosure sob LGPD?
6. que revisão partner/legal é obrigatória antes de usar "PSAV/VASP compliance layer" em marketing público?
7. como a revogação deve propagar de um predicado de operador/safeguard para a operação do papel DeFindex numa implantação de produção?
