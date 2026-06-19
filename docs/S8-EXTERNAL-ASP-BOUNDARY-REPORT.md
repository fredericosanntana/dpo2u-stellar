# S8 — External ASP Non-Membership Boundary Report

**Data:** 2026-06-18  
**Status:** `confirmed-boundary`

## Resumo executivo

A S8 fecha o track com um boundary operacional verificável: a instância externa auditada do `asp-non-membership` pode ser **lida publicamente**, mas **não pode ser operada por nós sem a signing key do admin dela**. Não existe, neste estado, uma superfície pública alternativa que permita executar `insert_leaf`/`delete_leaf` sem essa autoridade.

## Evidência 1 — comportamento on-chain da instância externa

Instância auditada:
- `CDREZXZILERCSD7VMS4SKVRQY4FNIYJCTYA2AY4TKFRV6Y3L3M2OK3O3`

### Leitura pública funciona
Comandos executados:
- `get_root` → retornou `"0"`
- `find_key --key 1` → retornou `found=false`

Isso confirma que a superfície de leitura/simulação está aberta.

### Escrita falha sem a key do admin
Comando executado:
- `insert_leaf --key 1 --value 1`

Resultado real:
```text
❌ error: Missing signing key for account GDF4BXPQY5N4BEO24UIHM4NVB62MW7HDWH7SVHKLVZAMLP5IIHCFQORC
```

Isso prova que a instância exige a assinatura de `GDF4BXPQY5N4BEO24UIHM4NVB62MW7HDWH7SVHKLVZAMLP5IIHCFQORC` para mutação.

## Evidência 2 — código do contrato SPP

Arquivo:
- `_external/spp/contracts/asp-non-membership/src/lib.rs`

### Trecho estrutural
- `DataKey::Admin` é armazenado no constructor (`lines 104-110`)
- `insert_leaf(...)` exige:
  - `let admin: Address = store.get(&DataKey::Admin)...`
  - `admin.require_auth();` (`lines 361-364`)
- `delete_leaf(...)` exige:
  - `let admin: Address = store.get(&DataKey::Admin)...`
  - `admin.require_auth();` (`lines 516-519`)

### Leitura pública
O mesmo contrato expõe leitura sem auth para:
- `find_key(...)` (`lines 329-335`)
- `get_root(...)` / root via storage
- `verify_non_membership(...)` (já exercitado nas sprints anteriores por simulação read-only)

## Conclusão operacional

### Está provado
- conseguimos operar integralmente a nossa instância própria do `asp-non-membership`;
- conseguimos acoplar `registry revoke -> blocked-lane` nela;
- conseguimos automatizar isso com watcher idempotente;
- **não** conseguimos mutar a instância externa auditada sem a key do admin dela.

### Boundary final do track
O boundary correto e honesto passa a ser:

1. **Boundary de leitura/auditoria externa:**
   - a instância auditada externa pode ser usada para leitura, prova, inspeção de estado e futura verificação pública.

2. **Boundary de execução operacional atual:**
   - a blocked-lane automática roda na instância própria controlada pela DPO2U.

3. **Condição para unificar os boundaries no futuro:**
   - obter delegação/admin da instância externa; **ou**
   - fazer redeploy/migração para uma instância governada por chave sob nossa operação/autorização explícita.

## Implicação estratégica

O track ASP/SPP fica **fechado** como demo/prova operacional replayável.

O item remanescente não é técnico de integração; é de **governança/autoridade operacional**.

## Artefatos de referência
- `docs/S5-ASP-NON-MEMBERSHIP-BLOCKED-LANE-REPORT.md`
- `docs/S6-REGISTRY-REVOKE-TO-BLOCKED-LANE-REPORT.md`
- `docs/S7-REVOCATION-WATCHER-REPORT.md`
- `_external/spp/contracts/asp-non-membership/src/lib.rs`

## Veredito final

**S8 concluída como boundary confirmado.**

Não falta mais sprint técnica para este track. O próximo passo, se desejado, é uma decisão de governança:
- conseguir autoridade sobre a instância externa auditada; ou
- cristalizar a instância própria como lane operacional oficial da DPO2U.
