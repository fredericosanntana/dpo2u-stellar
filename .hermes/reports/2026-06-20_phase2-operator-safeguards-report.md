# Report — Fase 2 parcial: operator/safeguards/reporting layer

**Data:** 2026-06-20  
**Status:** evidência interna parcial executada  
**Escopo deste report:** registrar o que já foi materializado e executado de verdade na Fase 2 até aqui.

## Resumo executivo

A Fase 2 avançou do plano para artefatos reais no SDK e na documentação.

O estado atual já sustenta, com evidência de build/test/demo, que a DPO2U evoluiu o seam DeFindex/Stellar para uma camada mais ampla de evidência operator-side, ainda sem extrapolar para `VASP/PSAV full`.

## O que foi materializado

### Docs
- `docs/PHASE2-OPERATOR-SAFEGUARDS-PRD.md`
- `docs/PHASE2-CLAIM-BOUNDARY.md`
- `docs/PHASE2-TRAVEL-RULE-ADJACENT-FLOW.md`
- `docs/PHASE2-OPERATOR-SAFEGUARDS-DEMO-RUNBOOK.md`

### SDK / código
- novos tipos canônicos em `sdk/src/defindex-policy-types.ts`
- novos exports em `sdk/src/index.ts`
- contract test em `sdk/src/__contracts__/phase2-policy-types.contract.ts`
- testes em:
  - `sdk/src/__tests__/defindex-policy-types.test.ts`
  - `sdk/src/__tests__/DefindexPolicyGateway.test.ts`
  - `sdk/src/__tests__/ReportingEvidenceFlow.test.ts`
- demo script em `sdk/scripts/defindex-reporting-evidence-demo.mjs`
- comando npm `demo:defindex:reporting`

## Evidência executada

### 1. Build
Executado com sucesso:

```bash
npm run build
```

### 2. Gateway tests
Executado com sucesso:

```bash
npm run test:run -- src/__tests__/DefindexPolicyGateway.test.ts
```

Resultado observado:
- `26 tests passed`

### 3. Reporting flow tests
Executado com sucesso:

```bash
npm run test:run -- src/__tests__/ReportingEvidenceFlow.test.ts
```

Resultado observado:
- `5 tests passed`

### 4. Demo reporting
Executado com sucesso:

```bash
npm run demo:defindex:reporting
```

Artefato persistido:
- `/root/dpo2u-stellar/.hermes/reports/2026-06-20_phase2-reporting-demo-output.json`

Hash observado:
- `fce477d0ecb9b31f9562c51207465f0adf50b02f6f5737d14faa4a3f4862a19d`

Resultado observado:
- `ALLOW:PASS`
- `operation = rebalanceVault`
- `requiredRole = RebalanceManager`
- `verifyCalls[0].useCaseId = defindex_rebalance_v1`

### 5. Demo base proof-bound (reexecutado)
Executado com sucesso:

```bash
npm run demo:defindex:proof-bound
```

Artefato persistido:
- `/root/dpo2u-stellar/.hermes/reports/2026-06-20_phase2-proof-bound-demo-output.json`

Hash observado:
- `3ba2310525acdd99b634e880fd81d31e69ef5a86a30c65af00350dd5a443b66c`

## O que isso já prova

- o seam original `proof-bound rebalance` continua íntegro;
- o SDK agora comporta tipos canônicos adicionais de evidência;
- operator/safeguards/reporting já têm superfície clara de modelagem no gateway/SDK;
- reporting já tem loop reproduzível de `artifact -> hash -> verify -> allow -> prepare`.

## O que isso ainda não prova

- operator admission live com atestado real externo;
- safeguards live com fonte real de reserve/segregation/incidente;
- Travel Rule prototipada end-to-end;
- cobertura da jornada pública DeFindex;
- readiness VASP/PSAV full.

## Conclusão honesta

A Fase 2 já saiu do plano e entrou em execução real no SDK.  
O framing correto, neste ponto, é:

> a DPO2U já demonstrou uma camada operator/safeguards/reporting-aware em DeFindex/Stellar, ainda no plano institutional operator-side e ainda sem alegar VASP full.
