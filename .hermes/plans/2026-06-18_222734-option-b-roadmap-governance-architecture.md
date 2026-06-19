# Roadmap B-First + Convergência para A — Implementation Plan

> **For Hermes:** Use this as the canonical plan for the next phase after S8. This turn is planning only; do not implement from this file blindly without re-checking live repo truth.

**Goal:** formalizar a **Opção B** como lane operacional oficial da DPO2U para o hackathon e para o MVP de ASP, preparando resposta forte para questionamentos de governança e arquitetura, enquanto abrimos uma trilha separada e disciplinada para eventualmente alcançar a **Opção A**.

**Architecture:** tratar a instância própria do `asp-non-membership` como **data plane operacional atual**, e elevar ao redor dela um **control plane mínimo de governança, observabilidade, evidência e política pública**. Em paralelo, tratar a instância externa auditada como **boundary de leitura/auditoria** até que exista delegação/admin formal ou migração institucional. Não reescrever o que já funciona; extrair narrativa, governança, interfaces e runbooks sobre o que já foi provado on-chain.

**Tech Stack:** Markdown docs, scripts Python existentes em `integration/spp-adapter/scripts/`, contratos Soroban já implantados, artefatos de evidência em `integration/spp-adapter/examples/`, reports S5–S8, possíveis futuras automações via cron/watcher.

---

## 1. Verdade atual congelada

### O que já está provado
- A DPO2U já opera uma instância própria do `asp-non-membership` com autoridade de escrita.
- O fluxo `protocol-registry revoke -> blocked-lane` já roda on-chain nessa instância.
- Existe watcher/worker idempotente que observa revogação e aplica bloqueio automaticamente.
- A instância externa auditada é legível, mas não mutável por nós sem a signing key/admin dela.

### Decisão de produto agora
- **B é a lane oficial de execução.**
- **A vira trilha de convergência institucional, não pré-condição de operação.**

### Claim oficial recomendada
> A DPO2U opera hoje uma lane própria e verificável de enforcement regulatório on-chain, com boundary explícito entre execução soberana e auditoria externa. A convergência para infraestrutura compartilhada depende de governança/autorização, não de bloqueio técnico da integração.

---

## 2. Objetivos desta nova fase

### Objetivo principal
Tornar a Opção B **defensável para juiz, parceiro técnico, auditor e investidor**, sem parecer improviso ou centralização disfarçada.

### Objetivo secundário
Preparar desde já os pré-requisitos técnicos, documentais e políticos para uma futura migração/convergência à Opção A.

### Não-objetivos desta fase
- Não tentar forçar escrita na instância externa sem autoridade.
- Não vender B como se fosse A.
- Não reabrir circuitos ZK, pool ou protocolo base só para “parecer mais institucional”.
- Não fazer redesign grande do stack que já provou execução.

---

## 3. Perguntas que o roadmap precisa responder

### Governança
1. Quem controla a lane operacional oficial da DPO2U?
2. Essa autoridade é pessoal, institucional ou multisig?
3. Como ocorre troca de admin, incidente, rollback e continuidade?
4. Quem pode bloquear e desbloquear uma key?
5. Quais logs/evidências ficam para auditoria posterior?

### Arquitetura
1. O que é control plane e o que é data plane na operação DPO2U?
2. Onde entra `protocol-registry`, onde entra `asp-non-membership`, onde entra o watcher?
3. Como a blocked-lane evita double insert / drift / race condition?
4. Como uma revogação é observada, traduzida e executada?
5. O que é público, o que é privado e o que é operado por nós?

### Estratégia institucional
1. Por que a lane oficial não é a instância externa auditada?
2. O que falta para convergir para ela?
3. Como mostramos que B não é beco sem saída, e sim base operacional?

---

## 4. Plane separation recomendada

## 4.1 Control Plane (governa)
Responsável por:
- policy truth / narrativa oficial
- operador autorizado
- runbooks
- cadência de resposta a incidentes
- trilha de decisão e evidência
- interface com parceiros/admins externos
- status board e documentos de boundary

### Sementes já existentes no repo
- `docs/S5-ASP-NON-MEMBERSHIP-BLOCKED-LANE-REPORT.md`
- `docs/S6-REGISTRY-REVOKE-TO-BLOCKED-LANE-REPORT.md`
- `docs/S7-REVOCATION-WATCHER-REPORT.md`
- `docs/S8-EXTERNAL-ASP-BOUNDARY-REPORT.md`
- `integration/spp-adapter/examples/*.record.json`

## 4.2 Data Plane (executa)
Responsável por:
- leitura do `protocol-registry`
- tradução de decisão para action package
- mutação da instância própria do `asp-non-membership`
- persistência dos records de execução

### Componentes já existentes
- `integration/spp-adapter/scripts/extract_live_registry_decision.py`
- `integration/spp-adapter/scripts/prepare_non_membership_from_registry.py`
- `integration/spp-adapter/scripts/run_revocation_watcher.py`
- instância própria `CAEJBGQDGTFZ5DGRZZ5SYPSFUWRI4IX2V3KMDLS5ANUAI4TX52RTEUUS`

## 4.3 Boundary externo (audita / potencial futura convergência)
Responsável por:
- leitura pública
- prova de comparabilidade
- futura migração institucional se houver autoridade

### Componente atual
- instância externa auditada `CDREZXZILERCSD7VMS4SKVRQY4FNIYJCTYA2AY4TKFRV6Y3L3M2OK3O3`

---

## 5. Novo sprint map

| Sprint | Nome | Objetivo | Resultado esperado |
|---|---|---|---|
| **B0** | Truth freeze B-first | congelar narrativa oficial da Opção B e da fronteira com A | memo/FAQ/claims oficiais sem ambiguidade |
| **B1** | Governance hardening | transformar controle da lane em modelo institucional defensável | documento de governança + runbook de admin/incident/change |
| **B2** | Architecture hardening | explicar control plane/data plane/boundary externo com precisão | arquitetura publicável + FAQ técnico |
| **B3** | Operational hardening | subir maturidade do watcher e records para operação mais séria | readiness checklist + auditoria de idempotência + cron/runbook |
| **B4** | Public surface standardization | alinhar README, pitch, demo, FAQ, docs e claims públicos | narrativa única para judges/parceiros |
| **B5** | A-readiness | preparar terreno político/técnico para convergência com A | pacote de handoff/admin-transfer/delegation request |
|

---

## 6. Sprint detalhada

### B0 — Truth freeze B-first

**Objective:** congelar a linguagem oficial para que ninguém da DPO2U descreva B como A por acidente.

**Files:**
- Modify: `docs/PULSO-DPO2U-ASP-SPP-roadmap-executivo.md`
- Create: `docs/B-FIRST-OPERATING-MODE.md`
- Create: `docs/B-FIRST-FAQ.md`
- Modify: `docs/hack-submission-latam-composability.md`
- Modify: `README.md` (se existir surface pública principal no repo)

**Work items:**
1. escrever o statement oficial da lane operacional atual;
2. definir wording único para “instância própria”, “instância auditada externa”, “boundary de leitura”, “convergência futura”;
3. criar tabela “o que afirmamos / o que não afirmamos”;
4. alinhar pitch de hackathon, README e docs centrais com essa linguagem.

**Validation:**
- nenhum doc principal sugere controle da instância externa sem prova;
- a descrição da arquitetura bate com S5–S8;
- existe uma frase curta de palco reutilizável.

**Risk:** baixo.

---

### B1 — Governance hardening

**Objective:** substituir a aparência de “key pessoal operando demo” por modelo de autoridade institucional explicável.

**Files:**
- Create: `docs/GOVERNANCE-LANE-OWNERSHIP.md`
- Create: `docs/GOVERNANCE-INCIDENT-RUNBOOK.md`
- Create: `docs/GOVERNANCE-ADMIN-ROTATION.md`
- Create: `docs/GOVERNANCE-RACI.md`
- Possibly modify later: `scripts/deploy-asp-non-membership-testnet.json`

**Work items:**
1. nomear explicitamente quem é o operador atual e qual conta/admin controla a lane;
2. definir target state: conta institucional ou multisig, nunca key pessoal como steady state;
3. descrever fluxo de rotação de admin (`update_admin`) e pré-condições;
4. descrever incidente: bloqueio indevido, falha do watcher, perda de key, falsa revogação, necessidade de reversão;
5. definir RACI: quem decide policy, quem executa, quem aprova mudanças, quem responde a incidentes.

**Validation:**
- uma terceira parte entende quem manda na lane sem inferir;
- há caminho claro de evolução de custódia pessoal para custódia institucional;
- existe plano de continuidade operacional.

**Risk:** médio — pode expor gaps reais de custódia e processo.

---

### B2 — Architecture hardening

**Objective:** converter o que foi implementado em um desenho defendível de control plane/data plane.

**Files:**
- Create: `docs/ARCHITECTURE-B-FIRST-CONTROL-PLANE.md`
- Create: `docs/ARCHITECTURE-SEQUENCE-REVOCATION-TO-BLOCKED-LANE.md`
- Create: `docs/ARCHITECTURE-BOUNDARIES-AND-TRUST.md`
- Reuse references: `docs/S6-REGISTRY-REVOKE-TO-BLOCKED-LANE-REPORT.md`, `docs/S7-REVOCATION-WATCHER-REPORT.md`, `docs/S8-EXTERNAL-ASP-BOUNDARY-REPORT.md`

**Work items:**
1. desenhar os componentes: registry, extraction, preparation, watcher, own ASP non-membership, external audited boundary;
2. definir trust boundaries e authority boundaries;
3. explicitar estados: active, revoked, prepared, blocked, idempotent-rerun;
4. explicitar garantias e limitações atuais;
5. produzir diagrama/fluxo que sirva tanto para pitch quanto para auditoria técnica.

**Validation:**
- um engenheiro externo entende a arquitetura sem ler o histórico das sprints;
- um auditor distingue claramente execução soberana vs leitura externa;
- o desenho não promete nada que o contrato externo não permita.

**Risk:** baixo/médio.

---

### B3 — Operational hardening

**Objective:** sair de “demo que funciona” para “operação mínima séria”.

**Files:**
- Create: `docs/OPS-WATCHER-RUNBOOK.md`
- Create: `docs/OPS-EVIDENCE-RETENTION.md`
- Create: `docs/OPS-READINESS-CHECKLIST.md`
- Possibly modify: `integration/spp-adapter/scripts/run_revocation_watcher.py`
- Possibly create: `scripts/run_revocation_watcher_once.sh`
- Possibly create: `cron/` or Hermes cron job specs later

**Work items:**
1. formalizar modo de operação manual/cron/batch do watcher;
2. definir estrutura canônica dos `*.record.json`;
3. adicionar readiness checklist: source account, network, contract ids, disk/log retention, dry-run/read-only checks;
4. definir política de retries, alerting e condições de no-op;
5. definir como provar pós-fato que uma revogação gerou ou não gerou bloqueio.

**Validation:**
- existe runbook para rodar o watcher sem depender de memória informal;
- existe checklist de auditoria operacional;
- existe política explícita para idempotência e replay.

**Risk:** médio.

---

### B4 — Public surface standardization

**Objective:** alinhar discurso público, comercial e técnico ao modo B-first.

**Files:**
- Modify: `docs/hack-submission-latam-composability.md`
- Modify: `docs/composability-quickstart.md`
- Create: `docs/FAQ-JUDGES-PARTNERS-AUDITORS.md`
- Create: `docs/MESSAGING-B-FIRST.md`
- Possibly modify: pitch/deck source files if stored elsewhere

**Work items:**
1. produzir FAQ para judges: “por que instância própria?”, “quem controla?”, “isso invalida a tese?”;
2. produzir FAQ para parceiro técnico: “como convergir para A?”;
3. produzir FAQ para auditor/investidor: “qual é o risco de governança?”;
4. alinhar README/landing/write-up com as mesmas respostas.

**Validation:**
- respostas públicas não entram em conflito entre si;
- a defesa da Opção B não soa como rationalization, e sim como decisão arquitetural honesta;
- a trilha para A aparece como roadmap, não desculpa.

**Risk:** baixo.

---

### B5 — A-readiness

**Objective:** preparar o terreno para alcançar A sem bloquear a execução atual.

**Files:**
- Create: `docs/A-READINESS-PLAN.md`
- Create: `docs/A-REQUEST-PACK.md`
- Create: `docs/A-ADMIN-TRANSFER-PLAYBOOK.md`
- Create: `docs/A-DELEGATED-OPS-MODEL.md`
- Create: `docs/A-MIGRATION-CHECKLIST.md`

**Work items:**
1. definir os três caminhos legítimos para A:
   - transferência de admin para conta institucional DPO2U;
   - delegação operacional formal;
   - migração/redeploy para instância governada corretamente;
2. preparar o pacote de pedido institucional para o controlador externo;
3. definir a conta target ideal (institucional/multisig) para eventual `update_admin`;
4. listar pré-requisitos técnicos e de governança para aceitar essa autoridade;
5. definir condições de sucesso/falha da trilha A.

**Validation:**
- existe plano executável para pedir/administer A sem improviso;
- a DPO2U sabe o que faria no dia seguinte caso a autoridade externa fosse concedida;
- o pedido externo não transmite imaturidade de governança.

**Risk:** médio/alto — depende de política externa, não só de engenharia.

---

## 7. Como alcançar A sem sabotar B

### Regra principal
B continua sendo a lane oficial até que **três** condições sejam verdadeiras ao mesmo tempo:
1. existe autorização/admin formal sobre a instância externa **ou** uma nova instância institucional compartilhada;
2. existe runbook de operação e responsabilidade aceito pelas partes;
3. existe equivalência operacional provada entre a lane atual e a lane A-target.

### Estratégia de convergência
1. manter B operando e documentada;
2. usar a instância externa como boundary de leitura/comparabilidade;
3. abrir trilha política/jurídica para autoridade;
4. quando houver abertura, testar migração em ambiente controlado;
5. só então mudar claim público de lane oficial.

### Anti-padrões
- pedir admin sem ter modelo institucional de custódia pronto;
- afirmar que a migração para A é “simples” antes de provar equivalência;
- enfraquecer a narrativa do hackathon esperando permissão externa.

---

## 8. Perguntas duras e resposta recomendada

### “Por que a lane oficial é própria?”
Porque a DPO2U precisa de enforcement verificável e operável agora; a instância externa hoje não nos concede autoridade de mutação.

### “Isso não é centralizado?”
Há um operador explícito hoje, com roadmap de hardening de governança para conta institucional/multisig. O ponto não é esconder autoridade; é torná-la explícita, auditável e evolutiva.

### “Então vocês não estão integrados ao ecossistema?”
Estamos integrados tecnicamente ao padrão/fluxo e mantemos boundary de leitura/auditoria com a instância externa; o gap remanescente é de governança/admin, não de integração base.

### “O que falta para A?”
Admin/delegação formal ou migração para uma instância institucionalmente governada.

---

## 9. Ordem recomendada de execução

1. **B0** Truth freeze
2. **B1** Governance hardening
3. **B2** Architecture hardening
4. **B4** Public surface standardization
5. **B3** Operational hardening
6. **B5** A-readiness

### Motivo da ordem
- primeiro congelamos a verdade;
- depois resolvemos quem manda e como explicamos isso;
- só então polimos operação e superfície pública;
- por fim profissionalizamos a trilha A.

---

## 10. Próximos arquivos concretos a produzir primeiro

### Prioridade P0
- `docs/B-FIRST-OPERATING-MODE.md`
- `docs/GOVERNANCE-LANE-OWNERSHIP.md`
- `docs/ARCHITECTURE-B-FIRST-CONTROL-PLANE.md`
- `docs/FAQ-JUDGES-PARTNERS-AUDITORS.md`
- `docs/A-READINESS-PLAN.md`

### Prioridade P1
- `docs/GOVERNANCE-INCIDENT-RUNBOOK.md`
- `docs/ARCHITECTURE-BOUNDARIES-AND-TRUST.md`
- `docs/OPS-READINESS-CHECKLIST.md`
- `docs/A-REQUEST-PACK.md`

---

## 11. Validation / Definition of Done desta fase

A fase B-first + A-readiness estará pronta quando:
- a DPO2U tiver uma resposta consistente para governança, autoridade e boundary;
- houver uma doc set mínima que permita defender B perante judges, parceiros e auditores;
- houver um caminho institucional plausível e documentado para A;
- nenhum claim público relevante dependa de autoridade que não temos.

---

## 12. Open questions que precisam de decisão do Shareholder

1. A conta/admin target futura deve ser pessoal, institucional simples ou multisig desde já?
2. Queremos expor publicamente já no hackathon a distinção entre lane operacional e lane auditada, ou manter isso para FAQ técnica sob demanda?
3. A DPO2U quer perseguir A como prioridade política imediata, ou apenas deixá-la madura como opcional pós-hackathon?
4. O watcher deve virar cron job formal já nesta fase ou ficar como runbook + execução assistida?

---

## 13. Execução recomendada após este plano

### Fase imediata
Transformar P0 em docs reais dentro de `docs/`.

### Fase seguinte
Revisar mensagens públicas e deck do hackathon com base nesses docs.

### Fase paralela
Preparar `A-REQUEST-PACK.md` e o modelo de pedido institucional de admin/delegação.
