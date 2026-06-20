# S3 — Runbook do demo proof-bound execution

**Status:** artefato canônico da S3  
**Circuito:** governança de rebalance via CVM 175  
**Ação DeFindex:** `rebalanceVault`  
**Predicado:** `defindex_rebalance_v1`  
**Âncora legal principal:** `sect_cvm_175_v1`

## Objetivo

Fechar a S3 com um caminho reproduzível que conecte:

1. **payload canônico** de rebalance;
2. **hash determinístico** do payload;
3. **verificação de attestation** bound ao hash;
4. **preparação de unsigned XDR** via helper endurecido da S2;
5. **referência live-slice** já executada em testnet com tx IDs reais.

A S3 não pretende fingir um novo live execution. Ela junta duas camadas honestas:

- **code-real:** demo executável no SDK atual, com hash → verify → prepare;
- **live-slice:** execução testnet já comprovada em `docs/DEFINDEX-PROOF-BOUND-EXECUTION-LIVE-SLICE.md`.

## Artefatos da S3

- `sdk/scripts/defindex-proof-bound-demo.mjs`
- `sdk/src/DefindexPolicyGateway.ts`
- `sdk/src/defindex-policy-types.ts`
- `sdk/src/__tests__/DefindexPolicyGateway.test.ts`
- `.hermes/reports/2026-06-20_s3-proof-bound-demo-output.json`
- `docs/DEFINDEX-PROOF-BOUND-EXECUTION-LIVE-SLICE.md`

## Pré-requisitos

No pacote `sdk`:

```bash
npm install
npm run build
```

## Comando canônico

```bash
cd /root/dpo2u-stellar/sdk
npm run demo:defindex:proof-bound
```

## O que o demo faz

O script:

1. monta um `RebalanceEvidencePayload` canônico para `rebalanceVault`;
2. deriva o `derivedEvidenceHashHex` com `hashRebalanceEvidencePayload(...)`;
3. injeta um verifier fake com verdict `PASS`;
4. chama `prepareRebalanceFromEvidenceIfAuthorized(...)`;
5. confirma que o gateway:
   - usa `defindex_rebalance_v1`;
   - passa o hash derivado ao verifier;
   - só retorna `prepared` quando o verdict é `PASS`.

## Evidência executada

O output salvo em `.hermes/reports/2026-06-20_s3-proof-bound-demo-output.json` mostra:

- `operation: rebalanceVault`
- `use_case_id: defindex_rebalance_v1`
- `primary_legal_anchor: sect_cvm_175_v1`
- `derivedEvidenceHashHex` derivado do payload canônico
- `verifyCalls[0].evidenceHashHex` igual ao hash derivado
- `decision.allowed = true`
- `prepared.unsignedXdr` presente

## Cadeia de prova da S3

### Camada 1 — code-real

A S2/S3 agora prova no código deste repo que:

- o payload de rebalance pode ser serializado de forma canônica;
- o hash é determinístico;
- `hash mismatch` nega antes de verifier/client;
- `FAIL`, `REVIEW` e missing continuam fail-closed;
- o helper de rebalance só prepara a unsigned XDR depois de `PASS`.

### Camada 2 — live-slice já executada

A execução live continua ancorada em:

- `docs/DEFINDEX-PROOF-BOUND-EXECUTION-LIVE-SLICE.md`
- `.hermes/reports/2026-06-20_policy-vault-rollforward-live.md`
- `scripts/rollforward-defindex-policy-vault-testnet.sh`

Referências principais:

| item | valor |
|---|---|
| vault live | `CB5YHBXELSXGNWGJURUD5W23C4VVRIN7CX4WMDNZ7FR5TUVNEJPEOF5W` |
| gate live | `CDVOKZMLIAHSESPHH47K76X2OYYOSDFRHXSUHLXV6JRCQRYRE4SWNL3E` |
| evidence hash live | `395ae02e84d72e73a18ded2818a40e30f48248fda85f2c2963ca7e2e7605228e` |
| rebalance tx live | `cf790f4d96e7087c0c756531d2bea89f45b88a2e1389d579ed5f9ada5832e3d5` |

## Interpretação correta

A S3 permite dizer, com honestidade:

> a DPO2U já tem um caminho reproduzível de payload canônico → hash → policy verify → prepare unsigned XDR no SDK, e esse caminho aponta para uma execução testnet já comprovada de proof-bound rebalance em DeFindex/Stellar.

A S3 **não** permite dizer que:

- o verifier fake do demo é uma attestation live;
- o demo substitui a execução testnet histórica;
- toda surface operator da DeFindex já está aberta por API;
- a integração inteira já está pronta para produção.

## Critérios de aceite da S3

A S3 está aceita quando:

- [x] existe demo executável do SDK (`npm run demo:defindex:proof-bound`)
- [x] o demo deriva hash do payload canônico
- [x] o demo chama verify com `defindex_rebalance_v1`
- [x] o demo retorna `prepared` somente após `PASS`
- [x] a evidência do output foi salva em `.hermes/reports/2026-06-20_s3-proof-bound-demo-output.json`
- [x] o runbook liga explicitamente o demo ao live slice com tx IDs reais
- [x] os limites honestos permanecem documentados

## Próximo passo lógico

**S4 — role-as-contract validation**

Pergunta central:

> um contrato/control plane DPO2U pode ocupar com segurança um papel DeFindex como `Rebalance Manager` no fluxo real, ou existe blocker técnico/parceiro que precisa ser assumido explicitamente?
