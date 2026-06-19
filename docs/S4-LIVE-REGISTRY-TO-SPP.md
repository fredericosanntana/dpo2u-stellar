# S4 — Live Registry → SPP

## Objetivo

Substituir o `decision package` de exemplo da S3 por extração a partir de um `protocol-registry` vivo na testnet e fechar a prova de revogação canônica no registry.

## Escopo desta sprint

- deploy testnet real do `protocol-registry`
- configuração viva da lane `kyc/BR`
- registro vivo de attestation
- extração live para decision package JSON
- bridge para o adapter SPP
- revogação canônica real no registry

## Artefatos esperados

- `scripts/deploy-protocol-registry-testnet.json`
- `integration/spp-adapter/examples/live-registry-decision.json`
- `integration/spp-adapter/examples/live-registry-admission.json`
- `integration/spp-adapter/examples/live-registry-executed.record.json`
- `integration/spp-adapter/examples/live-registry-revocation.record.json`

## Status alcançado

- deploy testnet do `protocol-registry` executado
- lane `kyc/BR` configurada no registry vivo
- attestation viva registrada e verificada
- extraction live → adapter → SPP executada
- revogação canônica viva executada
- re-entry do bridge bloqueado após revogação
