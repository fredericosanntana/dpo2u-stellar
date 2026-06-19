# Protocol Registry + ASP MVP Soroban + Pool Adapter Mock — Sprint Plan

> **For Hermes:** Use subagent-driven-development / claude-code para executar este plano sprint a sprint, fechando e validando cada fase antes de abrir a próxima.

**Goal:** sair de “validação do PRD” para uma prova protocolar concreta com três artefatos reais: um registry canônico distribuído, um ASP Soroban com `add_to_set(...)` + `current_root()`, e um pool-adapter mock que demonstre gating por membership.

**Architecture:** preservar o contrato piloto atual como prova de atestação simples e abrir uma trilha protocolar nova em contratos dedicados. O registry vira a superfície canônica de verificação de claims; o ASP consome o registry via cross-contract call e materializa o set limpo; o pool-adapter mock prova o withdraw/deposit gating consumindo o root/membership produzido pelo ASP.

**Tech Stack:** Soroban/Rust (`soroban-sdk 26.0.0`), testes de contrato em Rust, examples/scripts TypeScript, padrão de cross-contract call já usado em `xchain-attest` e `por-filing`.

---

## Contexto atestado no repositório

### O que já existe e pode ser reaproveitado
- `contracts/anticorruption-attestation/src/lib.rs`
  - já prova o padrão `verify_attestation(...) -> Option<Record>`
  - já tem `authorize_submitter(...)` e modelo básico de issuer/admin
- `contracts/xchain-attest/src/lib.rs`
  - já prova padrão de cross-contract call fail-closed
  - bom molde para wiring do novo ASP chamando um registry externo
- `examples/remittance-gate/gate.ts`
  - já demonstra gating off-chain por leitura trustless
  - bom ponto de partida semântico para o mock de pool gating
- `docs/composability-quickstart.md` e `docs/hack-submission-latam-composability.md`
  - já posicionam a tese de composabilidade e ajudam a manter o framing correto

### O que explicitamente AINDA NÃO está implementado neste recorte
- ASP Soroban com `add_to_set(...)`
- `current_root()`
- membership gating em pool
- registry canônico distribuído
- revogação no set
- trust model de issuer

### Decisão de escopo deste sprint
**In-scope agora:**
1. `protocol-registry`
2. ASP MVP Soroban
3. pool-adapter mock para gating

**Fora do sprint, mas com hooks explícitos:**
- revogação no set
- trust model pleno de issuer

Esses dois itens não devem ser “fingidos” como prontos. O sprint só precisa deixar contrato/interface/eventos preparados para encaixá-los depois.

---

## Estrutura proposta de arquivos

### Novos contratos
- Create: `contracts/protocol-registry/Cargo.toml`
- Create: `contracts/protocol-registry/src/lib.rs`
- Create: `contracts/protocol-registry/src/test.rs`
- Create: `contracts/asp-mvp/Cargo.toml`
- Create: `contracts/asp-mvp/src/lib.rs`
- Create: `contracts/asp-mvp/src/test.rs`
- Create: `contracts/pool-adapter-mock/Cargo.toml`
- Create: `contracts/pool-adapter-mock/src/lib.rs`
- Create: `contracts/pool-adapter-mock/src/test.rs`

### Docs/examples a atualizar
- Modify: `docs/composability-quickstart.md`
- Modify: `docs/hack-submission-latam-composability.md`
- Create: `docs/asp-protocol-mvp.md`
- Create: `examples/pool-adapter-mock/README.md`

---

## Design objetivo por artefato

### 1) `protocol-registry`
Função: superfície canônica distribuída de verificação.

**MVP do contrato:**
- `__constructor(admin: Address)`
- `authorize_issuer(admin, issuer, allowed)`
- `set_claim_policy(admin, claim_type, jurisdiction, active)`
- `register_attestation(issuer, subject_commitment, claim_type, jurisdiction, valid_until, attestation_root)`
- `verify_attestation_proof(subject_commitment, claim_type, jurisdiction, attestation_root) -> bool`
- `get_attestation(subject_commitment, claim_type, jurisdiction) -> Option<AttestationRecord>`

**Observação de honestidade:** neste MVP, “distributed” significa **registry protocolar neutro com múltiplos issuers autorizáveis**, não trust model completo resolvido.

### 2) `asp-mvp`
Função: manter o association set limpo e só aceitar entradas que passem no registry.

**MVP do contrato:**
- `__constructor(admin: Address, registry: Address)`
- `set_registry(admin, registry)` se quiser swap no ambiente de teste; se não, fixar no constructor
- `add_to_set(submitter, deposit_commitment, subject_commitment, claim_type, jurisdiction, attestation_root)`
- `contains(deposit_commitment) -> bool`
- `current_root() -> BytesN<32>`
- `leaf_count() -> u32`

**Nota técnica:** o root pode começar como **MVP append-only deterministic root** (ex.: hash incremental `root_{n+1}=sha256(root_n || leaf)`), desde que seja documentado como mock honesto de association set, não Merkle tree completa ainda.

### 3) `pool-adapter-mock`
Função: provar o gating protocolar consumindo o ASP.

**MVP do contrato:**
- `__constructor(admin: Address, asp: Address)`
- `set_asp(admin, asp)` (opcional em teste)
- `request_deposit(user, deposit_commitment)` ou `request_withdraw(user, deposit_commitment)`
- `execute_if_member(user, deposit_commitment)`
- bloqueia se `asp.contains(deposit_commitment) == false`
- libera se `true`

**Observação:** o mock não precisa implementar pool privada real. Precisa provar o contrato lógico: **sem membership, não passa; com membership vinda do ASP, passa**.

---

## Ordem de execução recomendada

### Fase A — Protocol Registry primeiro
Motivo: o ASP depende da superfície canônica; começar pelo adapter ou pelo ASP antes do registry cria retrabalho narrativo e técnico.

### Fase B — ASP MVP Soroban depois
Motivo: aqui acontece a prova nova de composabilidade `ASP -> Registry -> inclusion`.

### Fase C — Pool adapter mock por último
Motivo: ele existe para provar consumo do ASP, então deve ser a validação final da fase, não a primeira.

---

# Plano detalhado

## Task 1: Congelar a linha de base do sprint

**Objective:** registrar exatamente o que já existe e o que vira trilha nova.

**Files:**
- Read: `contracts/anticorruption-attestation/src/lib.rs`
- Read: `contracts/xchain-attest/src/lib.rs`
- Create: `docs/asp-protocol-mvp.md`

**Step 1: Documentar baseline**
Escrever em `docs/asp-protocol-mvp.md`:
- contrato piloto atual continua como artefato legado de attestation simples
- nova trilha protocolar usa três contratos novos
- revogação/trust model ficam explicitamente fora do MVP

**Step 2: Validar baseline atual**
Run: `cargo test -p anticorruption-attestation -p xchain-attest`
Expected: suites atuais verdes, sem regressão antes do novo trabalho.

**Step 3: Commit**
```bash
git add docs/asp-protocol-mvp.md
git commit -m "docs: freeze protocol MVP baseline"
```

---

## Task 2: Criar o esqueleto de `protocol-registry`

**Objective:** abrir o novo contrato com tipos e storage layout corretos.

**Files:**
- Create: `contracts/protocol-registry/Cargo.toml`
- Create: `contracts/protocol-registry/src/lib.rs`
- Create: `contracts/protocol-registry/src/test.rs`

**Step 1: Write failing test**
Criar testes para:
- constructor define admin
- issuer não autorizado falha em `register_attestation`
- `verify_attestation_proof` retorna `false` para claim ausente

**Step 2: Run test to verify failure**
Run: `cargo test -p protocol-registry`
Expected: FAIL — crate/funções ainda inexistentes.

**Step 3: Write minimal implementation**
Modelar:
- `DataKey::Admin`
- `DataKey::AuthorizedIssuer(Address)`
- `DataKey::ClaimPolicy(Symbol, Symbol)`
- `DataKey::Attestation(BytesN<32>, Symbol, Symbol)`
- `AttestationRecord { issuer, valid_until, attestation_root, timestamp }`

**Step 4: Run test to verify pass**
Run: `cargo test -p protocol-registry`
Expected: PASS nos testes básicos do esqueleto.

**Step 5: Commit**
```bash
git add contracts/protocol-registry
git commit -m "feat: scaffold protocol registry contract"
```

---

## Task 3: Implementar verificação canônica no `protocol-registry`

**Objective:** tornar o registry consumível por outros contratos.

**Files:**
- Modify: `contracts/protocol-registry/src/lib.rs`
- Modify: `contracts/protocol-registry/src/test.rs`

**Step 1: Write failing tests**
Cobrir:
- policy ativa permite registro
- policy inativa bloqueia
- `verify_attestation_proof(...)` retorna `true` só quando `subject_commitment + claim_type + jurisdiction + attestation_root` baterem
- claim expirada retorna `false`

**Step 2: Run test to verify failure**
Run: `cargo test -p protocol-registry`
Expected: FAIL nos novos cenários.

**Step 3: Write minimal implementation**
Implementar comparação determinística sem ZK completa ainda:
- registry guarda o record protocolar
- `verify_attestation_proof(...)` no MVP vira verificação canônica de existência + policy + validade temporal
- emitir evento `verified` ou `registered` para rastreabilidade

**Step 4: Run test to verify pass**
Run: `cargo test -p protocol-registry`
Expected: PASS.

**Step 5: Commit**
```bash
git add contracts/protocol-registry
git commit -m "feat: implement canonical registry verification"
```

---

## Task 4: Criar o esqueleto do `asp-mvp`

**Objective:** abrir o contrato do association set com dependência explícita do registry.

**Files:**
- Create: `contracts/asp-mvp/Cargo.toml`
- Create: `contracts/asp-mvp/src/lib.rs`
- Create: `contracts/asp-mvp/src/test.rs`

**Step 1: Write failing test**
Cobrir:
- constructor salva admin + registry
- `current_root()` inicial retorna root zero
- `contains()` inicial retorna `false`

**Step 2: Run test to verify failure**
Run: `cargo test -p asp-mvp`
Expected: FAIL.

**Step 3: Write minimal implementation**
Modelar:
- `DataKey::Admin`
- `DataKey::Registry`
- `DataKey::Root`
- `DataKey::LeafCount`
- `DataKey::Member(BytesN<32>)`

**Step 4: Run test to verify pass**
Run: `cargo test -p asp-mvp`
Expected: PASS básico.

**Step 5: Commit**
```bash
git add contracts/asp-mvp
git commit -m "feat: scaffold asp membership contract"
```

---

## Task 5: Implementar `add_to_set(...)` no ASP

**Objective:** provar a composabilidade central do sprint.

**Files:**
- Modify: `contracts/asp-mvp/src/lib.rs`
- Modify: `contracts/asp-mvp/src/test.rs`
- Read pattern: `contracts/xchain-attest/src/lib.rs`

**Step 1: Write failing tests**
Cobrir:
- `add_to_set(...)` falha quando registry retornar `false`
- `add_to_set(...)` insere member quando registry retornar `true`
- segunda inserção idêntica é noop idempotente ou falha com erro explícito

**Step 2: Run test to verify failure**
Run: `cargo test -p asp-mvp`
Expected: FAIL.

**Step 3: Write minimal implementation**
Implementar:
- cross-contract call para `ProtocolRegistryClient::verify_attestation_proof(...)`
- se `false`, fail-closed
- se `true`, grava membership e recalcula root determinístico
- incrementa `leaf_count`

**Step 4: Run test to verify pass**
Run: `cargo test -p asp-mvp`
Expected: PASS.

**Step 5: Commit**
```bash
git add contracts/asp-mvp
git commit -m "feat: add set insertion gated by protocol registry"
```

---

## Task 6: Implementar `current_root()` e semântica do set

**Objective:** expor a superfície mínima que o pool adapter consumirá.

**Files:**
- Modify: `contracts/asp-mvp/src/lib.rs`
- Modify: `contracts/asp-mvp/src/test.rs`

**Step 1: Write failing tests**
Cobrir:
- root muda após inserção válida
- root não muda após tentativa inválida
- `contains()` reflete membership
- `leaf_count()` incrementa só em inserção válida

**Step 2: Run test to verify failure**
Run: `cargo test -p asp-mvp`
Expected: FAIL.

**Step 3: Write minimal implementation**
Definir root MVP:
- `root0 = 0x00..00`
- `root_{n+1} = sha256(root_n || deposit_commitment)`

**Step 4: Run test to verify pass**
Run: `cargo test -p asp-mvp`
Expected: PASS.

**Step 5: Commit**
```bash
git add contracts/asp-mvp
git commit -m "feat: expose current_root and deterministic membership state"
```

---

## Task 7: Criar o esqueleto do `pool-adapter-mock`

**Objective:** abrir o contrato consumidor do ASP.

**Files:**
- Create: `contracts/pool-adapter-mock/Cargo.toml`
- Create: `contracts/pool-adapter-mock/src/lib.rs`
- Create: `contracts/pool-adapter-mock/src/test.rs`

**Step 1: Write failing tests**
Cobrir:
- constructor salva admin + asp
- tentativa de executar ação sem membership falha

**Step 2: Run test to verify failure**
Run: `cargo test -p pool-adapter-mock`
Expected: FAIL.

**Step 3: Write minimal implementation**
Modelar:
- `DataKey::Admin`
- `DataKey::Asp`
- `DataKey::Executed(BytesN<32>)`
- `execute_if_member(...)`

**Step 4: Run test to verify pass**
Run: `cargo test -p pool-adapter-mock`
Expected: PASS básico.

**Step 5: Commit**
```bash
git add contracts/pool-adapter-mock
git commit -m "feat: scaffold pool adapter mock"
```

---

## Task 8: Fechar o gating ponta-a-ponta

**Objective:** demonstrar a tese protocolar completa dentro do workspace.

**Files:**
- Modify: `contracts/pool-adapter-mock/src/lib.rs`
- Modify: `contracts/pool-adapter-mock/src/test.rs`
- Modify: `contracts/asp-mvp/src/test.rs`
- Modify: `contracts/protocol-registry/src/test.rs`

**Step 1: Write failing integration-style tests**
Cobrir fluxo:
1. issuer autorizado registra claim válida no registry
2. ASP chama registry e aceita `add_to_set(...)`
3. pool adapter chama ASP e libera a ação
4. commitment sem claim válida continua bloqueado

**Step 2: Run test to verify failure**
Run: `cargo test -p protocol-registry -p asp-mvp -p pool-adapter-mock`
Expected: FAIL até o wiring completar.

**Step 3: Write minimal implementation**
- cross-call ASP -> registry
- cross-call pool -> ASP
- evento de liberação/bloqueio no pool adapter

**Step 4: Run test to verify pass**
Run: `cargo test -p protocol-registry -p asp-mvp -p pool-adapter-mock`
Expected: PASS.

**Step 5: Commit**
```bash
git add contracts/protocol-registry contracts/asp-mvp contracts/pool-adapter-mock
git commit -m "feat: prove protocol gating end-to-end"
```

---

## Task 9: Atualizar docs de verdade sem vender o que não existe

**Objective:** alinhar a narrativa pública ao que foi realmente implementado.

**Files:**
- Modify: `docs/composability-quickstart.md`
- Modify: `docs/hack-submission-latam-composability.md`
- Modify: `examples/README.md`
- Create: `examples/pool-adapter-mock/README.md`

**Step 1: Documentar o que é real vs mock**
Explicitar:
- real: registry canônico MVP, ASP MVP, current_root, pool adapter mock gating
- mock/hook: revogação no set, trust model completo de issuer, prova ZK/membership full privacy-pool

**Step 2: Add exact validation commands**
Incluir:
```bash
cargo test -p protocol-registry -p asp-mvp -p pool-adapter-mock
cargo test --workspace
```

**Step 3: Commit**
```bash
git add docs examples
git commit -m "docs: align protocol MVP claims with implemented scope"
```

---

## Validação final obrigatória

### Comandos
```bash
cargo test -p protocol-registry -p asp-mvp -p pool-adapter-mock
cargo test --workspace
```

### Evidência esperada
- testes verdes nos três contratos novos
- teste ponta-a-ponta mostrando `registry -> asp -> pool-adapter`
- docs dizendo claramente o que ainda não existe

---

## Critérios de aceite do sprint

O sprint só fecha como **prova protocolar concreta** se existir evidência de que:

1. Um issuer autorizado consegue registrar uma claim válida no `protocol-registry`.
2. O `asp-mvp` chama o registry e só aceita `add_to_set(...)` quando a claim for válida.
3. `current_root()` muda após inserção válida e permanece estável em tentativa inválida.
4. O `pool-adapter-mock` bloqueia ação sem membership e libera com membership vinda do ASP.
5. A documentação separa claramente:
   - **implementado agora**
   - **não implementado ainda**

---

## Riscos e decisões explícitas

### Risco 1 — “distributed registry” virar claim inflada
**Mitigação:** no sprint, definir isso como registry canônico multi-issuer com policy configurável, não como governança distribuída resolvida.

### Risco 2 — `current_root()` parecer Merkle tree pronta
**Mitigação:** chamar de **deterministic append-only root (MVP)** em todo lugar. Não vender prova de inclusão eficiente ainda.

### Risco 3 — pool mock parecer pool privada real
**Mitigação:** nomear sempre como `pool-adapter-mock`; foco é gating protocolar, não anonimato completo.

### Risco 4 — revogação e trust model contaminarem o sprint
**Mitigação:** deixar apenas hooks de interface/eventos/keys; não abrir Fase 2 antes da Fase 1 fechar.

---

## Próximo sprint natural (não abrir antes de validar este)
1. revogação no set
2. trust model de issuer
3. membership proof mais próximo de privacy pool real
4. integração com referência Nethermind real

---

**Resumo executivo:** a ordem correta é **protocol-registry -> ASP MVP Soroban -> pool-adapter mock**. Se isso fechar com testes e docs honestos, a DPO2U sai de “PRD validado” e entra em **prova protocolar concreta**.