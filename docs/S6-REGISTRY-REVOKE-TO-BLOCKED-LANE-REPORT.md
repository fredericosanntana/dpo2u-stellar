# S6 — Registry Revoke -> Blocked Lane Report

**Data:** 2026-06-18  
**Status:** `confirmed`

## Resumo executivo

A S6 foi fechada com acoplamento fim-a-fim entre a revogação canônica do `protocol-registry` e a blocked-lane do `asp-non-membership`.

Nesta sprint, o fluxo real executado foi:
1. registrar uma attestation viva no `protocol-registry`;
2. extrair uma decisão live contendo `note_public_key` válido no domínio BN254;
3. revogar a attestation on-chain;
4. reextrair a decisão já revogada;
5. transformar automaticamente essa decisão em ação `insert_leaf` para o `asp-non-membership`;
6. executar a blocked-lane e verificar o estado final.

## Evidência registry

| Item | Valor |
|---|---|
| registry contract | `CAUDSMRKMZPZNCVHJZ3JFYVV2ZNK7TC7MFZCJNN75QUBZ2W4AYTEWTYP` |
| subject commitment | `0x0808…0808` |
| claim/jurisdiction | `kyc / BR` |
| attestation root | `0x0a0a…0a0a` |
| register tx | `145c083b758b3d27e3e8842f5de18f35b44467c89b2d285784e0d3176a257e2a` |
| revoke tx | `056f3930bad0ad72fa78ce953392256f6aa7ca9a8aca770646aa20dfa4158f54` |
| post-revoke verify | `false` |
| post-revoke active | `false` |

## Evidência blocked-lane

| Item | Valor |
|---|---|
| non-membership contract | `CAEJBGQDGTFZ5DGRZZ5SYPSFUWRI4IX2V3KMDLS5ANUAI4TX52RTEUUS` |
| blocked key hex | `0x012108242248c06711d179bd459c5b1f1d37244d8de02f3c7641a555e2589703` |
| blocked key dec | `510674989860353591028510149437186995841978718442233018268594652882555934467` |
| insert tx | `2abe3083ffa7a63a53307ac22b3d82da90c9b71c6486d6cb9d9b64396f33593c` |
| root after insert | `12167638434740738412350459348713108078053694686908743555288356863478133228669` |
| find_key | `found=true, found_value=1` |
| verify_non_membership | `false` |

## Helper materializado

Script novo:
- `integration/spp-adapter/scripts/prepare_non_membership_from_registry.py`

Função:
- lê uma decisão do registry;
- exige que ela já esteja desativada (`registry_verified=false` e `attestation_active=false`);
- valida `operator.note_public_key` como escalar BN254;
- produz a ação canônica de blocked-lane para `asp-non-membership`.

## Artefatos

- `integration/spp-adapter/examples/live-registry-decision.s6.active.json`
- `integration/spp-adapter/examples/live-registry-decision.s6.revoked.json`
- `integration/spp-adapter/examples/live-registry-s6-blocked-lane.prepared.json`
- `integration/spp-adapter/examples/live-registry-s6-blocked-lane.record.json`
- `docs/S6-REGISTRY-REVOKE-TO-BLOCKED-LANE.md`

## Conclusão

A cadeia mínima agora está comprovada:

### Provado
- `protocol-registry` vivo registra e revoga;
- a decisão revogada pode ser reextraída do registry;
- essa decisão pode gerar automaticamente uma ação blocked-lane;
- a ação blocked-lane executa on-chain no `asp-non-membership`.

### Ainda não provado
- operação sobre a instância externa auditada do `asp-non-membership` sem a key do admin dela;
- watcher/event daemon contínuo que observe revogações e execute isso sozinho sem intervenção.
