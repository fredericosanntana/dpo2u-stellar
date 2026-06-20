# Fase 2 — Demo runbook: operator + safeguards + reporting layer

**Status:** runbook canônico da Fase 2  
**Objetivo:** descrever a ordem mínima e reproduzível para demonstrar a evolução da DPO2U em DeFindex/Stellar além do slice original de `rebalance proof-bound`, preservando o anti-overclaim.  
**Relacionado:** `docs/PHASE2-OPERATOR-SAFEGUARDS-PRD.md`, `docs/PHASE2-CLAIM-BOUNDARY.md`, `docs/PHASE2-TRAVEL-RULE-ADJACENT-FLOW.md`

## Resumo executivo

A Fase 2 não substitui a prova da Fase 1. Ela **empilha** uma camada nova em cima do mesmo seam real.

A ordem correta do demo é:

1. mostrar o slice original `proof-bound rebalance`;
2. mostrar que o SDK agora reconhece circuitos adicionais de evidência (`operator admission`, `safeguards`, `reporting`);
3. mostrar um loop real de `reporting artifact -> hash determinístico -> allow/deny path -> prepare unsigned XDR`.

## Pré-requisitos

Executar a partir de:

`/root/dpo2u-stellar/sdk`

## Passo 1 — validar build

```bash
npm run build
```

Resultado esperado:

- `tsc` conclui com exit 0.

## Passo 2 — validar tipos/circuitos novos

```bash
npm run test:run -- src/__tests__/defindex-policy-types.test.ts
npm run test:run -- src/__tests__/DefindexPolicyGateway.test.ts
npm run test:run -- src/__tests__/ReportingEvidenceFlow.test.ts
```

Resultado esperado:

- contract/type tests passam;
- gateway tests passam;
- reporting evidence flow passa.

## Passo 3 — reexecutar o demo base (slice original)

```bash
npm run demo:defindex:proof-bound
```

Artefato persistido nesta sessão:

`/root/dpo2u-stellar/.hermes/reports/2026-06-20_phase2-proof-bound-demo-output.json`

O que esse passo prova:

- a lane original continua íntegra;
- `rebalanceVault` segue bound ao hash canônico;
- o verifier ainda é consultado com `useCaseId = defindex_rebalance_v1`;
- o SDK ainda prepara um unsigned XDR quando a decisão é `ALLOW:PASS`.

Hash observado nesta sessão:

- `derivedEvidenceHashHex = 3ba2310525acdd99b634e880fd81d31e69ef5a86a30c65af00350dd5a443b66c`

## Passo 4 — executar o demo novo de reporting evidence

```bash
npm run demo:defindex:reporting
```

Artefato persistido nesta sessão:

`/root/dpo2u-stellar/.hermes/reports/2026-06-20_phase2-reporting-demo-output.json`

O que esse passo prova:

- um artefato de reporting pode ser canonicalizado;
- o SDK deriva um `artifactHashHex` determinístico;
- o gateway aceita um payload de reporting em `PASS` e o usa como pré-condição adicional;
- o verifier é chamado com esse hash;
- a ação privilegiada segue para `prepare` quando a postura está válida.

Hash observado nesta sessão:

- `artifactHashHex = fce477d0ecb9b31f9562c51207465f0adf50b02f6f5737d14faa4a3f4862a19d`

## Passo 5 — interpretar corretamente o demo

### O que o demo autoriza dizer

- a DPO2U já vai além de um payload único de rebalance;
- a DPO2U já tem surface de tipos e gateway para camadas adicionais de evidência;
- reporting já pode funcionar como `hash/verdict/allow-deny` loop reproduzível;
- o seam continua operator-side e institucional.

### O que o demo não autoriza dizer

- que a DeFindex inteira virou stack VASP full;
- que depósitos/saques retail estão gateados;
- que Travel Rule já está implementada end-to-end em produção;
- que o reporting loop já equivale a reporting regulatório completo multi-jurisdição.

## Ordem recomendada de apresentação externa

Se for mostrar isso para parceiro/jurado/cliente institucional, a ordem correta é:

1. **Fase 1:** `proof-bound privileged execution`;
2. **Fase 2:** `operator/safeguards/reporting-aware layer`;
3. **Travel Rule:** mencionar só como circuito adjacente modelado, não como tese central.

## Frase final recomendada

> a DPO2U já demonstrou em DeFindex/Stellar que evidência operacional adicional — incluindo reporting — pode ser ligada de forma verificável à autorização de ações institucionais privilegiadas, sem precisar alegar VASP full.
