# Phase 2 — Operator + Safeguards Layer Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Expandir o slice atual DeFindex/Stellar de `rebalance proof-bound` para uma Fase 2 focada em `operator admission + safeguards + reporting evidence + Travel Rule adjacente`, sem vender “VASP/PSAV full” nem abrir surfaces que a DeFindex não suporta hoje.

**Architecture:** A Fase 2 deve reutilizar o seam já provado (`role occupancy -> payload hash -> verify -> prepare/execute`) e só ampliar o conjunto de predicados e evidências em torno do plano operator-side. O trabalho deve acontecer principalmente no `sdk/`, nos docs canônicos e em scripts/runbooks de demonstração, mantendo a surface pública estreita: nada de retail gating, nada de nova arquitetura paralela, nada de mega-policy engine multi-jurisdição.

**Tech Stack:** TypeScript/Vitest no `sdk/`, contratos/scripts Soroban já existentes no repo, docs Markdown em `docs/`, reports/plans em `.hermes/`.

---

## Current context / assumptions

- O repo já provou a lane de `rebalanceVault` sob `Rebalance Manager` com binding a `evidence_hash` e validação fail-closed.
- Os docs canônicos já congelaram que a claim pública atual **não** é “VASP full”.
- O memo `docs/VASP-PSAV-FULL-GAP-MEMO.md` diz que a Fase 2 natural é: safeguards layer, operator admission posture, reporting/evidence loops e Travel Rule como circuito real/adjacente.
- O memo `docs/STELLAR-DEFINDEX-LEGAL-CIRCUITS-MEMO.md` também já deixa claro que DeFindex é forte no plano operator-side e **não** é a surface certa para forçar retail deposit/withdraw gating.

## Scope boundaries for this plan

### In scope
- Operator admission posture para ações role-gated
- Safeguards / reserve / incident posture como predicados e evidências
- Reporting evidence loop (hash/attest/verify)
- Travel Rule apenas como circuito adjacente de settlement/transfer quando fizer sentido
- Docs, testes e demos do `sdk` que provem esses circuitos sem depender de production claims

### Out of scope
- Depósito retail gateado nativamente em DeFindex
- Withdraw retail gateado nativamente em DeFindex
- Claim pública de “VASP/PSAV full”
- Nova arquitetura paralela ou novo pacote separado sem necessidade
- Mega-engine regulatório multi-jurisdição

## Proposed approach

Construir a Fase 2 em quatro trilhas técnicas pequenas e verificáveis:

1. **Operator Admission** — modelar e verificar se um operador/prestador pode ocupar ou manter um papel sensível.
2. **Safeguards** — modelar evidência de segregação/PoR/incident posture ligada a ações operator-side.
3. **Reporting** — criar um fluxo canônico de `artifact -> artifact_hash -> verify -> allow/deny` para obrigações periódicas.
4. **Travel Rule Adjacent** — desenhar um circuito específico para mensageria/screening/settlement, sem fingir que isso cobre toda a DeFindex.

A ordem é importante: primeiro os circuitos que reforçam mais diretamente o seam atual (operator + safeguards), depois reporting, e por último Travel Rule adjacente.

---

## Files likely to change

### Docs / planning
- Create: `docs/PHASE2-OPERATOR-SAFEGUARDS-PRD.md`
- Create: `docs/PHASE2-CLAIM-BOUNDARY.md`
- Create: `docs/PHASE2-DEMO-RUNBOOK.md`
- Update: `docs/STELLAR-DEFINDEX-LEGAL-CIRCUITS-MEMO.md`
- Update: `docs/DPO2U-STELLAR-DEFINDEX-COMPLIANCE-LAYER-PRD.md`
- Update: `docs/S5-PARTNER-LEGAL-VALIDATION-PACK.md`

### SDK / types / gateway
- Modify: `sdk/src/defindex-policy-types.ts`
- Modify: `sdk/src/DefindexPolicyGateway.ts`
- Modify: `sdk/src/index.ts`
- Create/Modify tests under: `sdk/src/__tests__/`
- Create demo scripts under: `sdk/scripts/`

### Reports / plans
- Create: `.hermes/reports/<timestamp>_phase2-*.md`
- Create: `.hermes/plans/<timestamp>-phase2-*.md`

---

## Step-by-step plan

### Task 1: Freeze the canonical Phase 2 framing

**Objective:** Criar um PRD curto da Fase 2 para evitar que a execução derive para “VASP full”.

**Files:**
- Create: `docs/PHASE2-OPERATOR-SAFEGUARDS-PRD.md`
- Reference: `docs/VASP-PSAV-FULL-GAP-MEMO.md`
- Reference: `docs/THREE-TRACK-ROADMAP-PULSO-ZK-GTM.md`

**Step 1: Write the Phase 2 PRD**
Incluir:
- objetivo da Fase 2;
- truth / target / non-goals;
- 4 circuitos foco: operator admission, safeguards, reporting, Travel Rule adjacente;
- claims liberadas vs proibidas;
- critérios de aceite.

**Step 2: Verify coherence manually**
Read back the file and check it does **not** claim:
- retail gating;
- full DeFindex coverage;
- VASP full;
- production readiness.

**Step 3: Commit**
```bash
git add docs/PHASE2-OPERATOR-SAFEGUARDS-PRD.md
git commit -m "docs: add phase 2 operator safeguards prd"
```

---

### Task 2: Add canonical types for operator admission and safeguards

**Objective:** Estender o modelo do SDK para representar circuitos de operator admission e safeguards sem acoplar network I/O.

**Files:**
- Modify: `sdk/src/defindex-policy-types.ts`
- Modify: `sdk/src/index.ts`
- Test: `sdk/src/__tests__/defindex-policy-types.test.ts` (create if missing)

**Step 1: Write failing tests**
Cobrir ao menos:
- `OperatorAdmissionEvidencePayload`
- `SafeguardsEvidencePayload`
- `ReportingEvidencePayload`
- `TravelRuleEvidencePayload`
- enum/status mínimos para posture, expiry, incident severity, reporting artifact state

**Step 2: Run test to verify failure**
Run: `npm test -- --run src/__tests__/defindex-policy-types.test.ts`
Expected: FAIL por tipos/exports ausentes.

**Step 3: Write minimal implementation**
Adicionar interfaces/types mínimos e exports necessários, preservando a compatibilidade com o gateway atual.

**Step 4: Run tests to verify pass**
Run: `npm test -- --run src/__tests__/defindex-policy-types.test.ts`
Expected: PASS.

**Step 5: Commit**
```bash
git add sdk/src/defindex-policy-types.ts sdk/src/index.ts sdk/src/__tests__/defindex-policy-types.test.ts
git commit -m "feat: add phase 2 policy evidence types"
```

---

### Task 3: Add operator admission authorization path

**Objective:** Permitir que o gateway autorize/negue operações role-gated com base em um circuito de admissibilidade do operador.

**Files:**
- Modify: `sdk/src/DefindexPolicyGateway.ts`
- Modify: `sdk/src/defindex-policy-types.ts`
- Test: `sdk/src/__tests__/DefindexPolicyGateway.test.ts`

**Step 1: Write failing tests**
Adicionar cenários para:
- operador `PASS` autoriza ação sensível;
- operador `FAIL` nega;
- operador `REVIEW` nega;
- operador expirado/revogado nega;
- ausência de atestação nega.

**Step 2: Run test to verify failure**
Run: `npm test -- --run src/__tests__/DefindexPolicyGateway.test.ts`
Expected: FAIL.

**Step 3: Write minimal implementation**
Adicionar helper(s) do gateway para verificar um predicado de operator admission antes de preparar a ação downstream.

**Step 4: Run focused tests**
Run: `npm test -- --run src/__tests__/DefindexPolicyGateway.test.ts`
Expected: PASS nos novos casos.

**Step 5: Commit**
```bash
git add sdk/src/DefindexPolicyGateway.ts sdk/src/defindex-policy-types.ts sdk/src/__tests__/DefindexPolicyGateway.test.ts
git commit -m "feat: add operator admission authorization path"
```

---

### Task 4: Add safeguards policy path

**Objective:** Ligar segregação/PoR/incident posture ao fluxo operator-side já provado.

**Files:**
- Modify: `sdk/src/DefindexPolicyGateway.ts`
- Modify: `sdk/src/defindex-policy-types.ts`
- Test: `sdk/src/__tests__/DefindexPolicyGateway.test.ts`

**Step 1: Write failing tests**
Cobrir:
- safeguards `PASS` permite;
- `FAIL` nega;
- `REVIEW` nega;
- `missing proof-of-reserve attestation` nega;
- `incident open` nega operações selecionadas.

**Step 2: Run test to verify failure**
Run: `npm test -- --run src/__tests__/DefindexPolicyGateway.test.ts`
Expected: FAIL.

**Step 3: Write minimal implementation**
Implementar o menor conjunto de checks para compor safeguards com o fluxo existente. Preferir composição simples ao invés de “policy engine” genérico.

**Step 4: Run focused tests**
Run: `npm test -- --run src/__tests__/DefindexPolicyGateway.test.ts`
Expected: PASS.

**Step 5: Commit**
```bash
git add sdk/src/DefindexPolicyGateway.ts sdk/src/defindex-policy-types.ts sdk/src/__tests__/DefindexPolicyGateway.test.ts
git commit -m "feat: add safeguards authorization path"
```

---

### Task 5: Add reporting evidence loop

**Objective:** Provar um circuito onde um artefato/report é hasheado, verificado e usado para allow/deny sem expor conteúdo sensível.

**Files:**
- Modify: `sdk/src/DefindexPolicyGateway.ts`
- Create: `sdk/src/__tests__/ReportingEvidenceFlow.test.ts`
- Create: `sdk/scripts/defindex-reporting-evidence-demo.mjs`

**Step 1: Write failing tests**
Cobrir:
- `artifact_hash` válido + verdict `PASS` libera;
- `hash mismatch` nega;
- `artifact missing` nega;
- expiração do reporte nega.

**Step 2: Run test to verify failure**
Run: `npm test -- --run src/__tests__/ReportingEvidenceFlow.test.ts`
Expected: FAIL.

**Step 3: Write minimal implementation**
Adicionar utilitários e helper(s) para o reporting evidence loop, reaproveitando canonical hash quando possível.

**Step 4: Run focused test**
Run: `npm test -- --run src/__tests__/ReportingEvidenceFlow.test.ts`
Expected: PASS.

**Step 5: Add a demo script**
Criar script que imprime o fluxo:
- artifact metadata
- canonical hash
- verify result
- downstream allow/deny result

**Step 6: Commit**
```bash
git add sdk/src/DefindexPolicyGateway.ts sdk/src/__tests__/ReportingEvidenceFlow.test.ts sdk/scripts/defindex-reporting-evidence-demo.mjs
git commit -m "feat: add reporting evidence loop"
```

---

### Task 6: Design Travel Rule adjacent flow (docs-first)

**Objective:** Desenhar o circuito Travel Rule de forma específica e adjacente, sem fingir cobertura integral da DeFindex.

**Files:**
- Create: `docs/PHASE2-TRAVEL-RULE-ADJACENT-FLOW.md`
- Update: `docs/PHASE2-OPERATOR-SAFEGUARDS-PRD.md`

**Step 1: Write the doc**
Descrever:
- quando Travel Rule entra;
- quais atores existem;
- qual artefato é gerado off-chain;
- qual hash/verdict é publicado/verificado;
- onde isso encosta em settlement/fee flow;
- o que permanece fora do escopo DeFindex.

**Step 2: Verify non-overclaim**
Check that the doc does **not** imply:
- Travel Rule = VASP inteiro;
- coverage total de transações DeFindex;
- readiness de produção.

**Step 3: Commit**
```bash
git add docs/PHASE2-TRAVEL-RULE-ADJACENT-FLOW.md docs/PHASE2-OPERATOR-SAFEGUARDS-PRD.md
git commit -m "docs: add phase 2 travel rule adjacent flow"
```

---

### Task 7: Build the Phase 2 demo runbook

**Objective:** Fechar um runbook demonstrável da Fase 2, reaproveitando a lane atual e adicionando as novas camadas de operator/safeguards/reporting.

**Files:**
- Create: `docs/PHASE2-DEMO-RUNBOOK.md`
- Create: `.hermes/reports/<timestamp>_phase2-demo-report.md`
- Possibly create demo scripts in: `sdk/scripts/`

**Step 1: Write the runbook**
Estruturar a demo em ordem:
1. operator posture
2. safeguards posture
3. reporting artifact hash
4. action intent hash
5. verify sequence
6. allow/deny outcome

**Step 2: Execute validation commands**
Run:
- `npm run build`
- `npm run test:run`
- quaisquer demos adicionados em `sdk/scripts/`

**Step 3: Capture output in a report**
Salvar outputs relevantes em `.hermes/reports/` com limitações honestas.

**Step 4: Commit**
```bash
git add docs/PHASE2-DEMO-RUNBOOK.md .hermes/reports/<timestamp>_phase2-demo-report.md sdk/scripts/
git commit -m "docs: add phase 2 demo runbook and report"
```

---

### Task 8: Update canonical boundary docs

**Objective:** Reconciliar a nova Fase 2 com os docs canônicos existentes sem quebrar a claim pública atual.

**Files:**
- Modify: `docs/STELLAR-DEFINDEX-LEGAL-CIRCUITS-MEMO.md`
- Modify: `docs/DPO2U-STELLAR-DEFINDEX-COMPLIANCE-LAYER-PRD.md`
- Modify: `docs/S5-PARTNER-LEGAL-VALIDATION-PACK.md`

**Step 1: Update memo and PRD**
Adicionar referência explícita à Fase 2 como expansão natural de operator/safeguards/reporting.

**Step 2: Update S5 boundary**
Refinar:
- o que vira claim suportada após Fase 2;
- o que continua proibido;
- o que ainda depende de partner/legal.

**Step 3: Read back and verify consistency**
Confirmar que todos os docs continuam alinhados em:
- no retail gating claim;
- no VASP full claim;
- DeFindex = operator-side fit.

**Step 4: Commit**
```bash
git add docs/STELLAR-DEFINDEX-LEGAL-CIRCUITS-MEMO.md docs/DPO2U-STELLAR-DEFINDEX-COMPLIANCE-LAYER-PRD.md docs/S5-PARTNER-LEGAL-VALIDATION-PACK.md
git commit -m "docs: align canonical boundary with phase 2"
```

---

### Task 9: Final validation

**Objective:** Confirmar que a Fase 2 foi fechada com evidência real e boundary honesto.

**Files:**
- Inspect modified files above
- Create: `.hermes/reports/<timestamp>_phase2-closeout.md`

**Step 1: Run full validation**
Run:
```bash
cd /root/dpo2u-stellar/sdk
npm run build
npm run test:run
```

Expected: PASS.

**Step 2: Inspect git status**
Run:
```bash
git -C /root/dpo2u-stellar status --short
```

Expected: only intended files changed.

**Step 3: Write closeout report**
Listar:
- arquivos mudados;
- testes executados;
- claims agora suportadas;
- claims ainda bloqueadas;
- blockers externos remanescentes.

**Step 4: Commit**
```bash
git add .hermes/reports/<timestamp>_phase2-closeout.md
git commit -m "docs: add phase 2 closeout report"
```

---

## Tests / validation summary

Minimum validation bar:
- focused Vitest for new policy types
- focused Vitest for gateway deny/pass paths
- full `npm run build`
- full `npm run test:run`
- at least one Phase 2 demo script output captured in a report
- canonical docs reread for anti-overclaim consistency

## Risks / tradeoffs / open questions

### Risks
- derivar para “policy engine” genérico cedo demais;
- tentar cobrir retail deposit/withdraw sem surface real;
- vender safeguards/reporting como production-ready antes de prova suficiente;
- misturar Travel Rule adjacente com a tese core da DeFindex.

### Tradeoffs
- docs-first em Travel Rule reduz risco de overclaim, mas adia implementação mais profunda;
- focar operator/safeguards é menos “amplo”, porém muito mais coerente com o fit real da DeFindex;
- reporting evidence loop pode gerar valor institucional sem exigir surface nova do parceiro.

### Open questions
- quais operator surfaces adicionais a DeFindex toparia suportar/publicar oficialmente?
- existe posição formal do parceiro sobre contracts ocuparem mais papéis além de `Rebalance Manager`?
- quais tipos de safeguards evidenciáveis geram mais valor real para o Pulso/GTM?
- Travel Rule deve encostar em `fee/settlement` ou ficar inicialmente só no nível de doc/modelo?

## Recommended execution order

1. Task 1 — freeze framing
2. Task 2 — types
3. Task 3 — operator admission
4. Task 4 — safeguards
5. Task 5 — reporting loop
6. Task 6 — Travel Rule adjacent doc
7. Task 7 — demo runbook
8. Task 8 — canonical boundary updates
9. Task 9 — final validation

## Success criteria

A Fase 2 será considerada bem-sucedida quando:
- a DPO2U puder dizer algo mais forte do que “rebalance proof-bound”;
- mas ainda **não** precisar dizer “VASP full”;
- houver evidência real para operator admission + safeguards + reporting loop;
- Travel Rule estiver corretamente posicionado como circuito específico/adjacente;
- a integração continuar claramente ancorada no fit real da DeFindex: **operator-side privileged execution**.
