# S3 — Registry → SPP Demo Runbook

## Objetivo

Reproduzir a demo da S3: decisão canônica shape-real do registry → admission input → leaf → `insert_leaf` → evidência confirmada.

## Pré-requisitos

- repo em `/root/dpo2u-stellar`
- adapter workspace existente em `integration/spp-adapter/`
- Stellar CLI funcional
- source account local com capacidade de invocar o deployment testnet auditado

## Arquivos usados

- source decision: `integration/spp-adapter/examples/registry-decision.example.json`
- transformer: `integration/spp-adapter/scripts/build_admission_from_registry.py`
- normalized admission input: `integration/spp-adapter/examples/registry-verified-admission.example.json`
- prepared record: `integration/spp-adapter/examples/executed-from-registry.prepared.json`
- confirmed record: `integration/spp-adapter/examples/executed-from-registry.record.json`

## Passo 1 — Gerar o input do adapter

```bash
python3 /root/dpo2u-stellar/integration/spp-adapter/scripts/build_admission_from_registry.py \
  /root/dpo2u-stellar/integration/spp-adapter/examples/registry-decision.example.json \
  > /root/dpo2u-stellar/integration/spp-adapter/examples/registry-verified-admission.example.json
```

## Passo 2 — Preparar a execução

```bash
python3 /root/dpo2u-stellar/integration/spp-adapter/scripts/prepare_insert_leaf.py \
  /root/dpo2u-stellar/integration/spp-adapter/examples/registry-verified-admission.example.json \
  > /root/dpo2u-stellar/integration/spp-adapter/examples/executed-from-registry.prepared.json
```

## Passo 3 — Ler root antes

```bash
stellar contract invoke \
  --id CBULZZIAHWL33XD5OBL2LBPYSFBYCNCOCIJITGJ74OSRRA7IZKIUBTKN \
  --source-account dpo2u-deployer \
  --network testnet -- get_root
```

## Passo 4 — Executar o insert_leaf

```bash
stellar contract invoke \
  --id CBULZZIAHWL33XD5OBL2LBPYSFBYCNCOCIJITGJ74OSRRA7IZKIUBTKN \
  --source-account dpo2u-deployer \
  --network testnet -- insert_leaf \
  --leaf 1520050341710383583104687106204726168507110032311949978306657155685631797131
```

## Passo 5 — Ler root depois

```bash
stellar contract invoke \
  --id CBULZZIAHWL33XD5OBL2LBPYSFBYCNCOCIJITGJ74OSRRA7IZKIUBTKN \
  --source-account dpo2u-deployer \
  --network testnet -- get_root
```

## Passo 6 — Confirmar artefatos

Checklist:
- `registry-verified-admission.example.json` existe
- `executed-from-registry.prepared.json` existe
- `executed-from-registry.record.json` existe
- `tx_handle` está presente no record final
- `root_before` e `root_after` estão presentes no record final

## Branch de revogação

Para a trilha de revogação desta S3, usar:
- `integration/spp-adapter/examples/revocation-decision.example.json`
- `docs/S3-REGISTRY-TO-SPP-REVOCATION-MAPPING.md`

Nesta fase, a revogação está **documentada e mapeada**, mas a execução non-membership ainda não foi provada on-chain.
