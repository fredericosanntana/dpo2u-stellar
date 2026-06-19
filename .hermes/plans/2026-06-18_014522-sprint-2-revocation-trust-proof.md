# Sprint 2 — Revogação, trust model de issuer e aproximação de membership proof

> **Para Hermes/CEO:** executar em fases fechadas, com validação real ao fim de cada fase. Não vender privacy pool nem ZK membership antes da fase 3 estar verde e documentada.

**Goal:** sair do MVP append-only (`protocol-registry -> asp-mvp -> pool-adapter-mock`) para uma trilha que suporte revogação explícita, confiança de issuer menos binária, e uma base honesta para evoluir a um membership proof real.

**Ponto arquitetural crítico:** o `asp-mvp` atual usa `current_root()` como **hash chain append-only** (`sha256(root_n || leaf)`), e o `pool-adapter-mock` assume membership permanente após admissão. Isso fecha o Sprint 1, mas **não suporta revogação semanticamente** e **não é base suficiente para membership proof de verdade**. Portanto, o próximo sprint precisa começar por uma **troca de modelo do set** antes de falar em prova.

---

## Estado atual atestado

### Já implementado e verde
- `contracts/protocol-registry`
  - multi-issuer autorizado por admin
  - policy por `(claim_type, jurisdiction)`
  - `verify_attestation_proof(...) -> bool`
- `contracts/asp-mvp`
  - `add_to_set(...)`, `contains(...)`, `current_root()`, `leaf_count()`
  - root append-only honesto, **não Merkle**
- `contracts/pool-adapter-mock`
  - gating via `asp.contains(...)`
- Docs já honestas sobre limites do MVP

### Limites explicitamente presentes no código atual
- `contracts/asp-mvp/src/lib.rs`
  - root é hash chain append-only
  - sem `remove_from_set` / revogação
- `contracts/pool-adapter-mock/src/lib.rs`
  - membership uma vez admitida continua liberando
  - sem nullifier real, sem anonimato
- `contracts/protocol-registry/src/lib.rs`
  - issuer trust model ainda binário (`authorize_issuer(..., allowed: bool)`)

---

## Decisão de ordem para Sprint 2

A ordem natural do enunciado do fundador é correta no macro, mas tecnicamente precisa deste refinamento:

1. **Revogação / mutabilidade do set primeiro**
2. **Trust model de issuer depois**
3. **Só então aproximação de membership proof real**

### Por quê
Sem um set mutável/autenticado, qualquer “membership proof” em cima do root atual nasce torto:
- o root atual não representa remoções;
- `contains(...)` segue sendo a verdade operacional, então o proof seria cosmético;
- o pool adapter continuaria sem refletir revogação.

Logo, a Fase 1 do novo sprint não é só “adicionar revoke”; é **migrar o ASP de hash chain append-only para authenticated mutable set MVP**.

---

# Fase 1 — Revogação protocolar real (registry + ASP + adapter)

## Objetivo
Introduzir revogação explícita e propagação fail-closed para que um membro possa deixar de ser elegível de forma verificável.

## Decisão de design
### Registry
Adicionar revogação por attestation canônica, sem fingir trust model completo.

**Novos comportamentos propostos:**
- `revoke_attestation(admin_or_issuer, subject_commitment, claim_type, jurisdiction)`
- `is_attestation_active(...) -> bool`
- `verify_attestation_proof(...)` passa a retornar `false` para claim revogada

**Storage adicional sugerido:**
- `DataKey::Revoked(BytesN<32>, Symbol, Symbol)` ou flag equivalente dentro do record
- opcionalmente `revoked_at: u64`, `revoked_by: Address`

### ASP
Parar de tratar membership como permanente.

**Mudança estrutural necessária:**
- substituir o root atual por um **authenticated mutable set MVP**
- caminho mínimo honesto: manter storage por membro + recomputar um root determinístico ordenado sobre membros ativos
- NÃO chamar isso de Merkle tree ainda, a menos que a árvore exista de fato

**Novos comportamentos propostos:**
- `add_to_set(...)`
- `remove_from_set(...)` ou `revoke_member(...)`
- `contains(...)` passa a refletir estado ativo/inativo
- `current_root()` passa a representar **somente membros ativos**
- `active_leaf_count()` ou evolução de `leaf_count()` para deixar semântica explícita

**Importante:** se a remoção for controlada pelo registry, o ASP deve revalidar antes de admitir e deve permitir invalidação explícita depois. O MVP mais simples é admin/relayer chamar remoção com base em revogação observada no registry.

### Pool adapter
Parar de liberar membership revogada.

**Novos comportamentos propostos:**
- `can_execute(...)` continua cross-calling o ASP, mas agora membership pode voltar a `false`
- novo teste deve provar: admitiu -> executável; revogou -> bloqueado

## Arquivos prováveis
- Modify: `contracts/protocol-registry/src/lib.rs`
- Modify: `contracts/protocol-registry/src/test.rs`
- Modify: `contracts/asp-mvp/src/lib.rs`
- Modify: `contracts/asp-mvp/src/test.rs`
- Modify: `contracts/pool-adapter-mock/src/lib.rs`
- Modify: `contracts/pool-adapter-mock/src/test.rs`
- Modify: `docs/asp-protocol-mvp.md`

## Testes obrigatórios
```bash
cargo test -p protocol-registry
cargo test -p asp-mvp
cargo test -p pool-adapter-mock
cargo test -p protocol-registry -p asp-mvp -p pool-adapter-mock
```

## Critério de done
- uma attestation revogada deixa `verify_attestation_proof(...) == false`
- um membro removido deixa `asp.contains(...) == false`
- o adapter volta a bloquear
- docs atualizadas sem inflar para “privacy pool”

---

# Fase 2 — Trust model de issuer (de binário para policyado)

## Objetivo
Sair de `issuer allowed: bool` e introduzir confiança mínima estruturada sem inventar governança descentralizada completa.

## Decisão de design
O próximo passo honesto não é staking/quorum completo; é **issuer metadata + policy constraints**.

### Modelo MVP proposto
- `IssuerProfile { status, jurisdiction_scope, claim_scope, valid_until, trust_tier }`
- `ClaimPolicy` pode exigir atributos mínimos do issuer
- `register_attestation(...)` falha se issuer não cumprir a policy

### O que isso prova
- o registry não depende mais só de uma flag booleana global
- diferentes claims/jurisdições podem exigir diferentes tipos de issuer

### O que ainda NÃO prova
- reputação descentralizada
- quorum inter-issuer
- staking/slashing
- delegated governance completa

## Arquivos prováveis
- Modify: `contracts/protocol-registry/src/lib.rs`
- Modify: `contracts/protocol-registry/src/test.rs`
- Modify: `docs/asp-protocol-mvp.md`
- Modify: `docs/composability-quickstart.md`
- Modify: `docs/hack-submission-latam-composability.md`

## Testes obrigatórios
Casos mínimos:
- issuer dentro do escopo da policy registra com sucesso
- issuer fora do escopo falha
- policy por claim/jurisdição diferencia tiers/escopos
- revogação segue funcionando com o novo modelo

---

# Fase 3 — Aproximação honesta de membership proof real

## Objetivo
Criar uma base verificável para afirmar “estamos aproximando membership proof”, sem ainda prometer ZK privacy pool completa.

## Pré-condição
Só abrir esta fase se a Fase 1 tiver trocado o set para um modelo autenticado mutável coerente.

## Caminho recomendado
### Opção A — mais honesta e incremental
Trocar `current_root()` para uma **Merkle root real de membros ativos**, com:
- leaf = hash(commitment)
- ordenação determinística
- prova de inclusão fora do contrato (test/helper first)
- verificação on-chain simples ou primeiro só test-side, dependendo do custo

### Opção B — mais profunda, maior risco
Começar a desenhar circuito/proof de membership já acoplado à pool.

**Recomendação:** não abrir a opção B ainda. Primeiro conquistar **Merkle root real + path verification**.

## Escopo MVP da fase
- `asp-mvp` expõe root de árvore real de membros ativos
- helper/testes geram proof de inclusão
- `pool-adapter-mock` pode ganhar `execute_with_membership_proof(...)` em paralelo ao `contains(...)`
- se a verificação on-chain ainda ficar cara/ruim, documentar explicitamente como “proof plumbing MVP”, não como pool privada real

## Arquivos prováveis
- Modify: `contracts/asp-mvp/src/lib.rs`
- Modify: `contracts/asp-mvp/src/test.rs`
- Modify: `contracts/pool-adapter-mock/src/lib.rs`
- Modify: `contracts/pool-adapter-mock/src/test.rs`
- Possibly create: `contracts/asp-mvp/src/merkle.rs`
- Modify: `docs/asp-protocol-mvp.md`
- Modify: `examples/pool-adapter-mock/README.md`

## Critério de done
- root deixa de ser hash chain e passa a ser root autenticada de conjunto ativo
- há prova de inclusão reproduzível em teste
- docs dizem claramente se a verificação é on-chain, off-chain, ou híbrida

---

## Riscos e tradeoffs

### 1. Revogação mexe no contrato narrativo do Sprint 1
Sim — mas é a evolução natural. O antídoto é manter docs muito claras sobre “Sprint 1 = append-only MVP”, “Sprint 2 = mutable/authenticated set”.

### 2. Recomputar root sobre membros ativos pode ser O(n)
Aceitável no MVP se o objetivo for prova protocolar, não performance de produção.

### 3. Tentar enfiar trust model completo agora explode escopo
Evitar staking/quorum/governança nesta rodada. Fazer primeiro policyed issuer profiles.

### 4. Chamar qualquer coisa de ZK membership proof cedo demais destrói credibilidade
Só usar esse framing quando houver root autenticada + proof path real. Antes disso, chamar de “proof plumbing” ou “Merkle-membership groundwork”.

---

## Próxima ação recomendada
Abrir **Sprint 2 / Fase 1** como uma execução focada em:
1. revogação canônica no `protocol-registry`
2. remoção/inativação de membership no `asp-mvp`
3. propagação do bloqueio no `pool-adapter-mock`
4. atualização honesta de docs

## Prompt de execução sugerido para o CEO
"Implemente Sprint 2 / Fase 1 no repositório `/root/dpo2u-stellar`: revogação canônica no `protocol-registry`, membership mutável no `asp-mvp`, propagação fail-closed no `pool-adapter-mock`, sem fingir Merkle/ZK ainda. Rode `cargo test -p protocol-registry -p asp-mvp -p pool-adapter-mock` e escreva report em `.hermes/plans/` antes de parar."