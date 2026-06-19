# Depth-N Merkle Tree + Root History Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Evoluir o `privacy-pool` de uma árvore Merkle fixa de 2 folhas para uma árvore depth-N parametrizada com `root history`, mantendo withdraw ZK real, nullifier spend-once e compatibilidade com o modelo Soroban atual.

**Architecture:** Separar a evolução em 3 camadas: (1) estado on-chain do `privacy-pool` para árvore incremental + histórico de roots; (2) circuito/witness ZK para path de profundidade configurável; (3) testes/fixtures/docs para garantir que depósitos, withdraws e roots antigos válidos continuem coerentes. O desenho deve ser conservador: primeiro suportar depth fixo > 1 e path completo; depois introduzir janela de roots recentes sem reabrir superfície de double-spend.

**Tech Stack:** Rust + Soroban SDK, Circom 2.x, snarkjs, Node.js witness tooling, testes `cargo test`, build `zk-prover/membership/build.sh`.

---

## Current context / assumptions

- Estado atual já saiu de singleton para **2-leaf Merkle proof**.
- `contracts/privacy-pool/src/lib.rs` usa `TREE_DEPTH = 1` e capacidade `2`.
- `zk-prover/membership/membership_withdraw.circom` aceita `siblings[1]` e `pathIndices[1]`.
- `zk-prover/membership/gen-input.js` gera witness/fixtures determinísticos para 2 folhas.
- `withdraw(...)` hoje exige igualdade com `current_root()`; ainda não há janela de roots antigos.
- `pool_balance` é simbólico; não há token custody.
- `protocol-registry` e o restante do workspace já estão verdes; a próxima mudança não deve quebrar esse baseline.

---

## Proposed approach

1. **Generalizar a árvore on-chain primeiro**
   - Trocar lógica ad hoc de 2 folhas por estrutura incremental depth-N.
   - Manter hashing canônico do contrato e do circuito rigorosamente alinhado.

2. **Generalizar o circuito para arrays depth-N fixos por versão**
   - Não tentar depth dinâmico em runtime no Circom.
   - Escolher uma profundidade de MVP (ex.: 8 ou 16) e codificá-la como constante do circuito.

3. **Adicionar `root history` com janela fixa pequena**
   - Ex.: ring buffer de 32 ou 64 roots.
   - Withdraw aceita qualquer root presente e ainda válido na janela.

4. **Só depois otimizar DX/perf**
   - witness builder mais completo
   - scripts auxiliares
   - docs e claims públicas atualizadas

---

## Design decisions (recommended)

### 1) Depth alvo da próxima versão
Recomendo:
- **MVP depth-N = 8** para primeira generalização séria
- capacidade simbólica: `256` leaves

Racional:
- já é qualitativamente diferente de 2 folhas
- mantém custo do circuito mais administrável do que depth 16
- suficiente para validar estrutura, root history e toolchain

Se o objetivo for narrativa mais forte para demo estratégica, depth 16 também é aceitável, mas vai pressionar bastante o build Groth16.

### 2) Hash canônico
Manter o hash interno do path como:
- `trunc248(SHA256(left || right))`

Motivo:
- já está alinhado entre contrato e circuito atual
- reduz risco de migração dupla agora

### 3) Root history policy
Recomendo:
- armazenar **current root + últimos 31** (`ROOT_HISTORY_SIZE = 32`)
- withdraw aceita root se `is_known_root(root) == true`
- não invalidar nullifier por root; nullifier continua global por nota

### 4) Inserção incremental
Não recomendo recalcular a árvore inteira a cada depósito quando depth subir.

Implementar:
- índice da próxima folha (`next_index`)
- zeros default por nível (`zero_value(level)` ou constantes pré-calculadas)
- cache de subárvore/filled nodes por nível (`filled_subtree[level]`)
- função incremental `insert_leaf(commitment) -> new_root`

---

## Files likely to change

### Core contract
- Modify: `contracts/privacy-pool/src/lib.rs`
- Modify: `contracts/privacy-pool/src/test.rs`
- Possibly create: `contracts/privacy-pool/src/merkle.rs` (se extrair helpers)

### ZK tooling
- Modify: `zk-prover/membership/membership_withdraw.circom`
- Modify: `zk-prover/membership/gen-input.js`
- Modify: `zk-prover/membership/build.sh`
- Modify: `zk-prover/membership/fixtures.json`
- Modify: `zk-prover/membership/soroban-bn254.json`

### Docs
- Modify: `contracts/privacy-pool/README.md`
- Modify: `docs/asp-protocol-mvp.md`
- Possibly modify: `docs/composability-quickstart.md`

---

## Step-by-step plan

### Task 1: Congelar os invariantes alvo da árvore depth-N

**Objective:** Definir com precisão os invariantes on-chain/ZK antes de editar implementação.

**Files:**
- Modify: `contracts/privacy-pool/README.md`
- Modify: `docs/asp-protocol-mvp.md`
- Create: `.hermes/notes/privacy-pool-depth-n-invariants.md` (opcional, se quiser artefato interno)

**Step 1: Documentar invariantes obrigatórios**

Registrar os seguintes invariantes:
- leaf = `commitment`
- parent = `trunc248(SHA256(left || right))`
- zero leaf = `0x00..00` ou outro valor fixado explicitamente
- root inicial = árvore completa de zeros
- depósito usa `next_index`, depois incrementa
- withdraw aceita root presente no history window
- nullifier continua spend-once global

**Step 2: Definir profundidade do circuito/contrato**

Escolher e registrar:
- `TREE_DEPTH = 8` (recomendado)
- `TREE_CAPACITY = 1 << TREE_DEPTH`
- `ROOT_HISTORY_SIZE = 32`

**Step 3: Registrar critérios de aceite**

Critérios mínimos:
- 3+ depósitos distintos alteram root incrementalmente
- witness de uma folha intermediária verifica off-chain e on-chain
- withdraw com root antigo recente funciona
- withdraw com root fora da janela falha
- nullifier repetido falha mesmo com root diferente da janela

**Step 4: Commit**

```bash
git add contracts/privacy-pool/README.md docs/asp-protocol-mvp.md .hermes/notes/privacy-pool-depth-n-invariants.md
git commit -m "docs: freeze depth-n merkle invariants"
```

---

### Task 2: Escrever testes falhos para inserção incremental depth-N

**Objective:** Capturar em teste o comportamento correto da árvore antes da implementação.

**Files:**
- Modify: `contracts/privacy-pool/src/test.rs`

**Step 1: Adicionar teste de múltiplos depósitos**

Criar teste no estilo:

```rust
#[test]
fn deposit_sequence_updates_root_across_multiple_levels() {
    let ctx = setup();
    let leaves = [b32(&ctx.env, 1), b32(&ctx.env, 2), b32(&ctx.env, 3), b32(&ctx.env, 4)];

    for leaf in leaves.iter() {
        ctx.client.deposit(&ctx.user, leaf);
    }

    assert_eq!(ctx.client.deposit_count(), 4);
    assert_ne!(ctx.client.current_root(), BytesN::from_array(&ctx.env, &[0u8; 32]));
}
```

**Step 2: Adicionar teste de capacidade**

```rust
#[test]
#[should_panic(expected = "Error(Contract, #X)")]
fn deposit_rejected_when_tree_is_full() {
    let ctx = setup();
    for i in 0..TREE_CAPACITY {
        ctx.client.deposit(&ctx.user, &leaf_for(i));
    }
    ctx.client.deposit(&ctx.user, &leaf_for(TREE_CAPACITY));
}
```

**Step 3: Rodar teste para verificar falha**

Run:
```bash
cargo test -p privacy-pool deposit_sequence_updates_root_across_multiple_levels -- --nocapture
```

Expected:
- FAIL enquanto a lógica ainda for depth 1 ou recalcular errado

**Step 4: Commit**

```bash
git add contracts/privacy-pool/src/test.rs
git commit -m "test: add failing depth-n deposit coverage"
```

---

### Task 3: Implementar utilitários Merkle incrementais no contrato

**Objective:** Criar a base on-chain para inserir folhas em árvore depth-N sem recomputar tudo de forma ingênua.

**Files:**
- Modify: `contracts/privacy-pool/src/lib.rs`
- Possibly create: `contracts/privacy-pool/src/merkle.rs`

**Step 1: Extrair helpers puros**

Criar helpers como:

```rust
fn hash_node(env: &Env, left: &BytesN<32>, right: &BytesN<32>) -> BytesN<32>
fn zero_value(env: &Env, level: u32) -> BytesN<32>
fn compute_initial_root(env: &Env) -> BytesN<32>
```

**Step 2: Adicionar storage para inserção incremental**

Persistir algo como:
- `next_index: u32`
- `filled_subtree(level) -> BytesN<32>`

Se o padrão atual usar enum `DataKey`, adicionar:

```rust
FilledSubtree(u32)
NextIndex
```

**Step 3: Implementar `insert_leaf`**

Pseudocódigo:

```rust
fn insert_leaf(env: &Env, leaf: BytesN<32>) -> BytesN<32> {
    let mut current = leaf;
    let mut idx = next_index(env);

    for level in 0..TREE_DEPTH {
        if idx % 2 == 0 {
            set_filled_subtree(level, current.clone());
            current = hash_node(env, &current, &zero_value(env, level));
        } else {
            let left = get_filled_subtree(level);
            current = hash_node(env, &left, &current);
        }
        idx /= 2;
    }

    current
}
```

**Step 4: Fazer `deposit` usar `insert_leaf`**

`deposit(...)` deve:
- rejeitar duplicata
- rejeitar árvore cheia
- persistir leaf/commitment
- atualizar `next_index`
- atualizar `current_root`
- empurrar root para history

**Step 5: Rodar testes focados**

Run:
```bash
cargo test -p privacy-pool deposit_sequence_updates_root_across_multiple_levels -- --nocapture
```

Expected:
- PASS

**Step 6: Commit**

```bash
git add contracts/privacy-pool/src/lib.rs contracts/privacy-pool/src/merkle.rs contracts/privacy-pool/src/test.rs
git commit -m "feat: add depth-n incremental merkle insertion"
```

---

### Task 4: Adicionar testes falhos de root history

**Objective:** Fixar o comportamento esperado da janela de roots antes da implementação.

**Files:**
- Modify: `contracts/privacy-pool/src/test.rs`

**Step 1: Adicionar teste de root antigo ainda válido**

```rust
#[test]
fn recent_root_remains_withdrawable_after_newer_deposits() {
    let ctx = setup();
    // deposit leaves A, B -> capture root_1
    // deposit leaves C, D -> current_root becomes root_2
    // withdraw using proof against root_1 should still succeed
}
```

**Step 2: Adicionar teste de root expirado**

```rust
#[test]
#[should_panic(expected = "Error(Contract, #Y)")]
fn withdraw_rejected_for_root_outside_history_window() {
    let ctx = setup();
    // produce old root, then roll history past the window, then withdraw with old root
}
```

**Step 3: Adicionar teste de known root lookup**

```rust
#[test]
fn known_root_lookup_tracks_recent_window_only() {
    let ctx = setup();
    // assert true for current and recent roots, false for ancient root
}
```

**Step 4: Rodar para confirmar falha**

Run:
```bash
cargo test -p privacy-pool recent_root_remains_withdrawable_after_newer_deposits -- --nocapture
```

Expected:
- FAIL antes da implementação do history

**Step 5: Commit**

```bash
git add contracts/privacy-pool/src/test.rs
git commit -m "test: add failing root history coverage"
```

---

### Task 5: Implementar ring buffer de roots conhecidos

**Objective:** Permitir withdraw contra roots recentes sem aceitar roots arbitrários.

**Files:**
- Modify: `contracts/privacy-pool/src/lib.rs`

**Step 1: Adicionar storage do history**

Persistir algo como:
- `root_history_head: u32`
- `root_history_count: u32`
- `RootHistory(slot)` -> `BytesN<32>`

**Step 2: Adicionar push do root atual após cada depósito**

Função sugerida:

```rust
fn push_root_history(env: &Env, root: &BytesN<32>) {
    let head = read_head(env);
    let slot = head % ROOT_HISTORY_SIZE;
    env.storage().persistent().set(&DataKey::RootHistory(slot), root);
    write_head(env, head + 1);
    write_count(env, min(count + 1, ROOT_HISTORY_SIZE));
}
```

**Step 3: Adicionar lookup de root conhecido**

```rust
fn is_known_root(env: &Env, root: &BytesN<32>) -> bool {
    // scan linear na janela pequena de 32; suficiente para MVP
}
```

**Step 4: Trocar verificação de withdraw**

Hoje:
- deve estar equivalente a `public_root == current_root`

Novo comportamento:
- `public_root` deve satisfazer `is_known_root(public_root)`

**Step 5: Expor método de leitura útil para testes**

Se necessário, adicionar getter:

```rust
pub fn is_known_root(env: Env, root: BytesN<32>) -> bool
```

**Step 6: Rodar testes de root history**

Run:
```bash
cargo test -p privacy-pool known_root_lookup_tracks_recent_window_only -- --nocapture
cargo test -p privacy-pool recent_root_remains_withdrawable_after_newer_deposits -- --nocapture
```

Expected:
- PASS

**Step 7: Commit**

```bash
git add contracts/privacy-pool/src/lib.rs contracts/privacy-pool/src/test.rs
git commit -m "feat: add privacy pool root history window"
```

---

### Task 6: Generalizar o circuito Circom para depth-N fixo

**Objective:** Fazer o ZK proof aceitar path completo da profundidade escolhida.

**Files:**
- Modify: `zk-prover/membership/membership_withdraw.circom`

**Step 1: Introduzir constante de profundidade**

Exemplo:

```circom
pragma circom 2.1.6;

include "circomlib/circuits/poseidon.circom";
include "circomlib/circuits/bitify.circom";
include "circomlib/circuits/sha256/sha256.circom";

var TREE_DEPTH = 8;
```

Se Circom local preferir template param, usar:

```circom
template MembershipWithdraw(treeDepth) { ... }
component main {public [...]} = MembershipWithdraw(8);
```

**Step 2: Generalizar witness arrays**

Trocar:
```circom
signal input siblings[1];
signal input pathIndices[1];
```

Por:
```circom
signal input siblings[TREE_DEPTH];
signal input pathIndices[TREE_DEPTH];
```

**Step 3: Generalizar fold do Merkle path**

Pseudocódigo Circom:

```circom
signal cur[TREE_DEPTH + 1];
cur[0] <== leafTrunc.out;
for (var i = 0; i < TREE_DEPTH; i++) {
    pathIndices[i] * (pathIndices[i] - 1) === 0;
    signal left;
    signal right;
    left <== cur[i] + pathIndices[i] * (siblings[i] - cur[i]);
    right <== siblings[i] + pathIndices[i] * (cur[i] - siblings[i]);
    component h = Trunc248Sha256Pair();
    h.left <== left;
    h.right <== right;
    cur[i + 1] <== h.out;
}
root === cur[TREE_DEPTH];
```

**Step 4: Recompilar para ver falhas cedo**

Run:
```bash
bash zk-prover/membership/build.sh
```

Expected:
- pode falhar inicialmente até witness builder ser atualizado

**Step 5: Commit**

```bash
git add zk-prover/membership/membership_withdraw.circom
git commit -m "feat: generalize membership circuit to depth-n merkle path"
```

---

### Task 7: Generalizar witness builder para depth-N e root history fixtures

**Objective:** Produzir witness determinístico válido para uma folha em árvore maior.

**Files:**
- Modify: `zk-prover/membership/gen-input.js`
- Modify: `zk-prover/membership/fixtures.json`

**Step 1: Implementar builder de árvore no JS**

Criar funções:

```js
function hashNode(left, right) { ... }
function zeroValue(level) { ... }
function buildTree(leaves, depth) { ... }
function merkleProof(leaves, targetIndex, depth) { ... }
```

**Step 2: Gerar conjunto determinístico > 2 folhas**

Sugestão MVP:
- 5 notas reais preenchidas
- resto preenchido com zero leaves
- target index = 2

**Step 3: Emitir `siblings[]` e `pathIndices[]` completos**

`input.json` deve conter:
```json
{
  "nullifier": "...",
  "secret": "...",
  "siblings": ["...", "...", "..."],
  "pathIndices": ["0", "1", "0"],
  "root": "...",
  "nullifierHash": "...",
  "recipient": "...",
  "context": "..."
}
```

**Step 4: Emitir fixtures ricos para Rust**

`fixtures.json` deve conter pelo menos:
- `depth`
- `witness_index`
- `commitments`
- `siblings`
- `path_indices`
- `root`
- `nullifier_hash`
- `recipient`
- `context`
- opcional: `recent_roots` para testes de history

**Step 5: Rodar build completo**

Run:
```bash
bash zk-prover/membership/build.sh
```

Expected:
- `snarkjs groth16 verify` = OK
- `soroban-bn254.json` regenerado

**Step 6: Commit**

```bash
git add zk-prover/membership/gen-input.js zk-prover/membership/fixtures.json zk-prover/membership/soroban-bn254.json
 git commit -m "feat: generate depth-n merkle witness fixtures"
```

---

### Task 8: Integrar withdraw on-chain com roots recentes

**Objective:** Provar end-to-end que proof de root antigo recente funciona no contrato.

**Files:**
- Modify: `contracts/privacy-pool/src/test.rs`

**Step 1: Escrever teste happy path com root antigo recente**

Exemplo lógico:
1. depositar lote A → capturar `root_a`
2. depositar lote B → `current_root = root_b`
3. usar witness/proof contra `root_a`
4. `withdraw(...)` deve passar porque `root_a` ainda está no history

**Step 2: Escrever teste fail path de root expirado**

1. capturar `root_old`
2. fazer depósitos suficientes para ejetar `root_old` da janela
3. tentar withdraw com `root_old`
4. esperar erro de root inválido/desconhecido

**Step 3: Validar nullifier invariants**

Adicionar teste:
- root antigo recente válido não reabilita nullifier já gasto

**Step 4: Rodar testes focados**

Run:
```bash
cargo test -p privacy-pool root -- --nocapture
```

Expected:
- PASS nos testes novos

**Step 5: Commit**

```bash
git add contracts/privacy-pool/src/test.rs
git commit -m "test: verify withdraw against recent historical roots"
```

---

### Task 9: Revalidar workspace e ajustar performance/ergonomia

**Objective:** Garantir que a evolução não quebrou o repo e que o custo operacional está explícito.

**Files:**
- Modify: `zk-prover/membership/build.sh`
- Possibly modify: docs de operação

**Step 1: Rodar bateria completa**

Run:
```bash
cargo test -p privacy-pool
cargo test -p protocol-registry
cargo test --workspace
bash zk-prover/membership/build.sh
```

Expected:
- tudo verde

**Step 2: Medir impacto do build**

Registrar:
- tempo de `circom compile`
- tempo de `powersoftau prepare phase2`
- tempo de `groth16 setup`
- tamanho do `.ptau` e `.zkey`

**Step 3: Se necessário, parametrizar modo dev vs full**

Exemplo:
- `TREE_DEPTH=8` e `POW=16` como default dev
- documentar que aumentar depth exige revisar `POW`

**Step 4: Commit**

```bash
git add zk-prover/membership/build.sh docs/asp-protocol-mvp.md contracts/privacy-pool/README.md
git commit -m "chore: document depth-n build and validation flow"
```

---

### Task 10: Atualizar narrativa pública e limites honestos

**Objective:** Fechar a evolução sem overclaim.

**Files:**
- Modify: `contracts/privacy-pool/README.md`
- Modify: `docs/asp-protocol-mvp.md`
- Modify: `docs/composability-quickstart.md`

**Step 1: Atualizar “What is real”**

Declarar apenas:
- depósitos em árvore depth-N
- root history recente
- withdraw Groth16 real contra root conhecido
- nullifier spend-once real

**Step 2: Atualizar “What is not real yet”**

Declarar explicitamente:
- ainda não há privacy pool de produção
- sem token custody
- sem root pruning governance elaborada
- sem MPC production-grade
- sem anonymity set de escala operacional comprovada

**Step 3: Adicionar guia de regeneração**

```bash
bash zk-prover/membership/build.sh
cargo test -p privacy-pool
```

**Step 4: Commit**

```bash
git add contracts/privacy-pool/README.md docs/asp-protocol-mvp.md docs/composability-quickstart.md
git commit -m "docs: describe depth-n merkle pool and root history honestly"
```

---

## Suggested storage/API shape for the contract

### Storage keys

```rust
enum DataKey {
    Admin,
    VerifyingKey,
    CurrentRoot,
    NextIndex,
    DepositCount,
    WithdrawCount,
    PoolBalance,
    Commitment(BytesN<32>),
    Nullifier(BytesN<32>),
    FilledSubtree(u32),
    RootHistory(u32),
    RootHistoryHead,
    RootHistoryCount,
}
```

### Constants

```rust
const TREE_DEPTH: u32 = 8;
const TREE_CAPACITY: u32 = 1 << TREE_DEPTH;
const ROOT_HISTORY_SIZE: u32 = 32;
```

### Public getters worth adding

```rust
pub fn current_root(env: Env) -> BytesN<32>
pub fn deposit_count(env: Env) -> u32
pub fn next_index(env: Env) -> u32
pub fn is_known_root(env: Env, root: BytesN<32>) -> bool
pub fn root_history_count(env: Env) -> u32
```

---

## Tests / validation matrix

### Contract unit tests
- empty tree root is deterministic
- first deposit updates root from zero tree
- deposits across level boundaries update root correctly
- duplicate commitment rejected
- deposit rejected when tree full
- current root recognized as known
- recent prior root recognized as known
- expired root rejected
- withdraw succeeds against recent non-current root
- nullifier repeated fails across historical roots

### ZK validation
- build script succeeds end-to-end
- `snarkjs groth16 verify` = OK
- tampered root fails
- tampered sibling/path fails
- proof for index `i` does not validate for index `j`

### Workspace regression
- `cargo test -p privacy-pool`
- `cargo test -p protocol-registry`
- `cargo test --workspace`

---

## Risks, tradeoffs, and open questions

### Risk 1: Build cost explode com depth maior
- **Impacto:** toolchain ZK fica lenta demais
- **Mitigação:** depth 8 primeiro; só subir para 16 com medição real

### Risk 2: Desalinhamento entre hash do circuito e do contrato
- **Impacto:** proof verifica off-chain mas falha on-chain
- **Mitigação:** centralizar fixtures; adicionar testes cruzados root/commitment/path

### Risk 3: Root history abrir superfície indevida
- **Impacto:** aceitar roots arbitrários ou muito antigos
- **Mitigação:** ring buffer fixo, scan só da janela conhecida, testes de expiração explícitos

### Risk 4: Inserção incremental bugada em fronteiras de nível
- **Impacto:** roots incorretos após certos índices
- **Mitigação:** testes para índices 0, 1, 2, 3, 7, 8, 15, 16

### Risk 5: Overclaim narrativo
- **Impacto:** parecer privacy pool “pronto” sem estar
- **Mitigação:** docs devem chamar de “depth-N symbolic privacy-pool slice with recent-root withdraw support”

### Open questions
1. Depth inicial deve ser 8 ou 16?
2. `ROOT_HISTORY_SIZE` deve ser 32 ou 64?
3. Vale expor histórico via getter paginado ou basta `is_known_root`?
4. Queremos manter SHA256-trunc248 no path ou migrar para Poseidon tree numa fase posterior?

---

## Recommended exact next execution order

1. Task 2 — testes falhos de depth-N deposit
2. Task 3 — inserção incremental on-chain
3. Task 4 — testes falhos de root history
4. Task 5 — ring buffer de roots
5. Task 6 — circuito depth-N
6. Task 7 — witness builder/fixtures depth-N
7. Task 8 — end-to-end withdraw com root histórico
8. Task 9 — revalidação completa
9. Task 10 — docs honestas

---

## Decision recommendation

Se a meta é **ganhar verdade protocolar máxima pelo menor risco**, faça:
- **depth 8 + history 32** agora
- **poseidon tree / depth 16+ / root batching** depois

Isso entrega a próxima evolução substantiva sem tentar pular direto para “privacy pool de produção”.
