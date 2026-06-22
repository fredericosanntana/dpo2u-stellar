# Operator admission scope sprint report

**Data:** 2026-06-21

## Arquivos alterados

- `sdk/src/defindex-policy-types.ts`
- `sdk/src/DefindexPolicyGateway.ts`
- `sdk/src/__tests__/DefindexPolicyGateway.test.ts`
- `docs/PHASE2-OPERATOR-SAFEGUARDS-PRD.md`
- `docs/MICA-BINANCE-COVERAGE-AUDIT.md`

## Testes adicionados

- `service-scope-mismatched operator admission denies before verifier is called`
- `requested-jurisdiction-mismatched operator admission denies before verifier is called`
- `PASS operator admission with matching scope and requested jurisdiction requires PASS attestation`
- `binds every operation to its canonical operator service scope`

## Validações rodadas

- `npm run test:run` em `/root/dpo2u-stellar/sdk` -> ok, 8 arquivos / 100 testes
- `npm run build` em `/root/dpo2u-stellar/sdk` -> ok

## Limitações honestas

- A mudança endurece o gateway operator-side; não implementa IAM multi-entidade.
- `requestedJurisdiction` é um bind mecânico opcional, não enforcement regulatório multi-jurisdição completo.
- `requiredServiceScope` é policy metadata local do SDK/gateway; não prova sozinho autorização legal, custódia, Travel Rule ou MiCA/CASP full.
- Depósitos e saques retail continuam fora do escopo.
