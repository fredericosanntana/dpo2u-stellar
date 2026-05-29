# Runbook — piloto mainnet enxuto (5 carteiras Freighter)

Sequência de execução. Fases 0-2 já feitas (código pronto + baseline verde). Fases 3-6
ficam GATED em: (a) Chairman adquirir ~60 XLM, (b) 5 pubkeys Freighter dos membros.

## Pré (Fase 0) — gated no Chairman
1. Email de onboarding enviado (cópia de revisão) ✅
2. Adquirir ~60 XLM numa conta mainnet de origem (sem friendbot em mainnet).
3. Membros instalam Freighter (Public), respondem com o pubkey `G…`.
4. Criar a identidade de software do deployer:
   ```
   stellar keys generate dpo2u-pilot-mainnet --network public
   stellar keys address dpo2u-pilot-mainnet     # → financiar com ≥10 XLM
   ```

## Deploy (Fase 3) — ⚠️ IRREVERSÍVEL, só com "go" do Chairman
```
export EXPECTED_WASM_HASH_ATTEST=d706a07161d784dcf2790c95c5e5e516c0993dfbbd0c8eb7a61cdefd4a6d7595
export EXPECTED_WASM_HASH_ZK=4af767bbf4fbf17428a0312e0879176f64d49cda0c78d0cfcec74f231471a9a0
./scripts/deploy-mainnet-pilot.sh        # frase de confirmação obrigatória
# → escreve scripts/deploy-mainnet.json (2 contract IDs)
```
Depois: copiar `contracts.anticorruption_attestation.contract_id` para
`MAINNET_ATTESTATION_CONTRACT_ID` em `sdk/src/AttestationClient.ts` e rebuildar o SDK.

## Configuração (Fase 4) — custo baixo
```
./scripts/configure-mainnet-usecases.sh                 # 14 use cases não-ZK
# financiar as 5 contas de membro (~3 XLM cada) a partir da conta de origem
./scripts/authorize-members-mainnet.sh --file scripts/mainnet-members.txt
```

## E2E (Fase 5) — assinatura no Lab pelos membros
```
# operador roda o predicado do gateway → verdict; depois:
./scripts/prepare-attestation-xdr.sh \
    --use-case sanction_check_v1 --member G...AAA --verdict Pass \
    --evidence-file ./evidence.json
# → envia o XDR ao membro; ele assina em lab.stellar.org (Freighter) e submete
```
Smoke com 1 membro primeiro; depois os 5. Idempotência: re-submeter o mesmo
`evidence_hash` falha com `AttestationExists` (#3).

## Verificação pública (Fase 6) — sem credencial
```
dpo2u-attest verify sanction_check_v1 <evidence_hash>    # via mainnetClient
# + conferir em https://stellar.expert/explorer/public/contract/<id>
```

## Track ZK (paralelo) — habilitar zk_compliance_v1
Ver `docs/zk-trusted-setup-runbook.md`: porte Circom → snarkjs Phase 2 (≥3
contribuidores = os membros + beacon) → trocar `CANONICAL_VK` em
`packages/pilot-gateway/src/lib/canonical-vk.ts` → só então configurar
`zk_compliance_v1` e incluí-lo no E2E.

## Artefatos da Fase 2 (prontos)
- `scripts/deploy-mainnet-pilot.sh` — deploy dos 2 contratos (chave software, hash-match)
- `scripts/configure-mainnet-usecases.sh` — 14 use cases não-ZK
- `scripts/authorize-members-mainnet.sh` — whitelist dos 5 pubkeys
- `scripts/prepare-attestation-xdr.sh` — tx não-assinada p/ assinar no Lab
- `sdk/src/AttestationClient.ts` — `mainnetClient()` + `MAINNET_ATTESTATION_CONTRACT_ID`
- `packages/pilot-gateway/.env.mainnet.example` — config mainnet (gateway só avalia, não assina)
- `docs/onboarding-email-mainnet-pilot.{html,txt}` — email brandizado (template equipe)
