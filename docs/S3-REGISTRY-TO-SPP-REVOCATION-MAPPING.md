# S3 — Registry → SPP Revocation Mapping

## Objetivo

Fechar a lacuna de honestidade entre a revogação canônica do `protocol-registry` e as consequências operacionais sobre a lane ASP do SPP.

## Princípio

O `protocol-registry` é a fonte canônica de verdade para revogação da credencial.

O SPP não precisa entender a policy da DPO2U; ele precisa receber a consequência operacional certa para o caso certo.

## Casos

### 1. Revogado antes da admissão
**Situação:** o registry marca a attestation como revogada antes de qualquer `insert_leaf`.

**Ação esperada:**
- `go/no-go = no-go`
- não gerar `prepared_command`
- não executar `insert_leaf`
- persistir um record de negação operacional

**Conseqüência SPP:** `no-op`

---

### 2. Revogado depois da admissão, com semântica deny-future-only
**Situação:** a credencial deixa de servir para novas admissões futuras, mas não exige bloqueio retroativo imediato no lane de non-membership.

**Ação esperada:**
- tombstone no `protocol-registry`
- bloquear novas passagens do bridge para esse `subject_commitment`
- não reenviar membership leaf
- registrar decisão de revogação

**Conseqüência SPP:** `no-op` no contrato de non-membership por enquanto

**Observação:** este é o caminho mais conservador para fases iniciais.

---

### 3. Revogado depois da admissão, exigindo blocked-lane explícito
**Situação:** a política DPO2U exige que o sujeito passe a provar não-pertencimento a uma blocked list do ASP.

**Ação esperada:**
- tombstone no `protocol-registry`
- gerar ação operacional para `asp-non-membership`
- preparar record específico do blocked-lane
- só chamar de concluído após evidência on-chain equivalente à da lane membership

**Conseqüência SPP:** `prepared non-membership action` agora; `executed non-membership action` numa sprint seguinte

---

## Arquivo de entrada desta S3

- `integration/spp-adapter/examples/revocation-decision.example.json`

## Status honesto atual

### Já fechado
- mapeamento conceitual `registry revoke -> effect on admission bridge`
- caso 1 e caso 2 definidos como comportamento operacional
- caso 3 delimitado como próximo build explícito

### Ainda não fechado
- helper automatizado para non-membership lane
- execução on-chain comprovada da blocked-lane
- política final de retroatividade por lane/produto
