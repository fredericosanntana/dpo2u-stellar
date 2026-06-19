# S5 — ASP Non-Membership Blocked-Lane Report

**Data:** 2026-06-18  
**Status:** `executed on owned testnet instance; audit deployment authority not proven from this host`

## Resumo executivo

A S5 foi fechada com evidência on-chain real.

Foi comprovado que a blocked-lane do `asp-non-membership` funciona como esperado:
1. uma key ausente passa em `verify_non_membership == true`;
2. ao inserir essa key no SMT, a prova passa a falhar (`verify_non_membership == false`);
3. ao remover a key, o estado limpo é restaurado (`verify_non_membership == true`).

## Limite honesto

A instância auditada do `asp-non-membership` em `deployments/testnet` não está sob a autoridade da key local deste host.

Tentativa real contra ela retornou:
- `Missing signing key for account GDF4BXPQY5N4BEO24UIHM4NVB62MW7HDWH7SVHKLVZAMLP5IIHCFQORC`

Logo, o que foi provado nesta sprint é:
- **a mecânica da lane blocked/non-membership**;
- **não** a autoridade operacional sobre a instância auditada do deployment externo.

## Evidência de bloqueio

### Instância própria
| Item | Valor |
|---|---|
| contract id | `CAEJBGQDGTFZ5DGRZZ5SYPSFUWRI4IX2V3KMDLS5ANUAI4TX52RTEUUS` |
| upload tx | `7238c831d142eb7fe5904bf5f19302eb8bf4994b7da7574a6d2cd7c23f3eb030` |
| deploy tx | `a6ef3baba1faca3581634386c562a9afed0db0b3c5e74c5406c2238b481dccc7` |
| admin | `GDJSDCHTRQYZNKJMUFZ76NAIZ3ZNMBWWAPQ5UHI3JUSOFPSB7NEGQ6UN` |

### Public key usada no teste
| Campo | Valor |
|---|---|
| private key (fixture) | `0x0000000000000000000000000000000000000000000000000000000000000007` |
| derived public key | `0x012108242248c06711d179bd459c5b1f1d37244d8de02f3c7641a555e2589703` |
| decimal | `510674989860353591028510149437186995841978718442233018268594652882555934467` |

## Execução real

### Antes do bloqueio
- `get_root() == 0`
- `find_key(pk)` → `found=false`
- `verify_non_membership(pk, ...) == true`

### Bloqueio explícito
- `insert_leaf(key=pk, value=1)`
- tx: `538026824852d7ddf718661db100ae1d66233eb96aee2516f20e7dc0a7bb0d0e`
- `root_after_insert = 12167638434740738412350459348713108078053694686908743555288356863478133228669`

### Estado bloqueado
- `find_key(pk)` → `found=true`, `found_value=1`
- `verify_non_membership(pk, ...) == false`

### Desbloqueio / restauração
- `delete_leaf(key=pk)`
- tx: `39034e29f52a6219f0ed6f0ae3be1722bc92e08b10666a5d1d58b876c5b1772c`
- `root_after_delete = 0`
- `find_key(pk)` → `found=false`
- `verify_non_membership(pk, ...) == true`

## Artefatos
- `scripts/deploy-asp-non-membership-testnet.json`
- `integration/spp-adapter/examples/non-membership-blocked-lane.record.json`

## Conclusão

A S5 fecha o gap técnico principal:

### Agora está provado
- a revogação canônica no `protocol-registry` já existia (S4);
- a lane blocked/non-membership também já tem execução real e reversão real em testnet (S5).

### Ainda não está provado
- operar a **instância auditada externa** do `asp-non-membership` sem a chave do admin dela;
- acoplar automaticamente a revogação do registry a essa lane numa única pipeline de produção.
