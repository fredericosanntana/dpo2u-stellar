# SPP Adapter

Adapter mínimo entre a verdade canônica da DPO2U e a landing zone real de admissão do SPP.

## Escopo desta primeira entrega

Esta pasta materializa a S2 em modo **admin-mediated v1**.

Ela inclui:
- schema de entrada de decisão de admissão;
- schema de registro de execução;
- exemplos de payload;
- utilitário real para derivar `membership_leaf` compatível com o SPP;
- helper para preparar a submissão `insert_leaf`.

## Verdade de integração congelada

- função destino: `asp-membership.insert_leaf(leaf)`
- fórmula do leaf:

```text
Poseidon2(note_public_key, membership_blinding, domain=0x01)
```

## Estrutura

- `spec/adapter-schema.md`
- `spec/admission-decision-input.schema.json`
- `spec/admission-execution-record.schema.json`
- `examples/admission-request.example.json`
- `examples/admission-record.example.json`
- `tools/leaf-derive/` — utilitário Rust
- `scripts/prepare_insert_leaf.py` — helper de payload/command prep

## Modos operacionais

### Prepared
Gera material e payload sem tocar na chain.

### Executed
Fica explicitamente fora desta entrega inicial, salvo se credenciais operacionais forem adicionadas depois.

## Execução rápida

Derivar leaf a partir do exemplo:

```bash
cargo run --manifest-path integration/spp-adapter/tools/leaf-derive/Cargo.toml -- \
  --pubkey 0x1111111111111111111111111111111111111111111111111111111111111111 \
  --blinding 123456789
```

Preparar submissão:

```bash
python3 integration/spp-adapter/scripts/prepare_insert_leaf.py \
  integration/spp-adapter/examples/admission-request.example.json
```
