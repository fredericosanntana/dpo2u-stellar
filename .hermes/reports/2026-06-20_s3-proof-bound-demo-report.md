# S3 Proof-Bound Execution Demo Report — 2026-06-20

## Objetivo
Fechar a S3 conectando o endurecimento do SDK (S2) ao live slice DeFindex já provado em testnet, sem overclaim.

## O que foi feito
1. endurecido o gateway de policy para aceitar payload canônico de rebalance e derivar `evidence_hash` determinístico;
2. adicionados testes RED→GREEN para:
   - hash determinístico;
   - `hash mismatch` fail-closed;
   - uso do hash derivado no fluxo autorizado;
3. criado demo executável em `sdk/scripts/defindex-proof-bound-demo.mjs`;
4. executado `npm run demo:defindex:proof-bound` com saída salva em `.hermes/reports/2026-06-20_s3-proof-bound-demo-output.json`;
5. escrito runbook canônico em `docs/S3-PROOF-BOUND-EXECUTION-DEMO-RUNBOOK.md`.

## Comandos executados
```bash
cd /root/dpo2u-stellar/sdk
npm test -- --run src/__tests__/DefindexPolicyGateway.test.ts
npm run build
npm run test:run
npm run demo:defindex:proof-bound > /root/dpo2u-stellar/.hermes/reports/2026-06-20_s3-proof-bound-demo-output.json
```

## Resultados validados
- suíte focal de gateway: **16/16 testes PASS**;
- suíte completa do pacote sdk: **77/77 testes PASS**;
- build TypeScript: **PASS**;
- demo S3: **PASS**.

## Evidência do demo
Campos-chave do output salvo:
- `operation = rebalanceVault`
- `vault = CVAULT`
- `use_case_id = defindex_rebalance_v1`
- `primary_legal_anchor = sect_cvm_175_v1`
- `decision.allowed = true`
- `prepared.unsignedXdr` presente
- `verifyCalls[0].evidenceHashHex == derivedEvidenceHashHex`

## Live references preservadas
- evidence hash live: `395ae02e84d72e73a18ded2818a40e30f48248fda85f2c2963ca7e2e7605228e`
- rebalance tx live: `cf790f4d96e7087c0c756531d2bea89f45b88a2e1389d579ed5f9ada5832e3d5`
- canonical live doc: `docs/DEFINDEX-PROOF-BOUND-EXECUTION-LIVE-SLICE.md`
- canonical live report: `.hermes/reports/2026-06-20_policy-vault-rollforward-live.md`

## Leitura honesta
A S3 agora está fechada como combinação de:
- **code-real** no SDK atual (payload → hash → verify → prepare)
- **live-slice** já executada em testnet (hash/prova/tx reais)

Ainda **não** foi provado nesta S3 que:
- o demo usa attestation live em tempo real;
- a DeFindex API já expõe todas as operator surfaces necessárias;
- um contrato DPO2U já ocupa papel DeFindex em produção.

## Blocker remanescente que sobe para S4
Validar role-as-contract: se um contrato/control plane DPO2U pode ocupar o papel `Rebalance Manager` com segurança operacional no fluxo real, ou se isso depende de ajuste parceiro/SDK/contrato.
