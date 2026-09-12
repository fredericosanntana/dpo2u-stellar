# ADR-001 — Capacidades da âncora e o que o contrato atual não guarda

**Status:** aceito
**Data:** 2026-09-12
**Contexto:** construção do primeiro adaptador do plano 5 (`@dpo2u/adapter-stellar`)

## Contexto

O núcleo (`@dpo2u/core`) passou a emitir atestações com **janela de validade** e
**revogação**, porque KYC perpétuo virou padrão operacional e uma atestação que
carrega apenas carimbo de tempo não responde à única pergunta que a parte
confiante faz: *isto ainda é verdade agora?*

Ao escrever o primeiro adaptador, ficou evidente que a interface do plano 5
carregava uma suposição não declarada: **a de que toda rede consegue guardar
tudo que uma atestação carrega.** Ela não consegue.

O contrato `anticorruption-attestation` hoje implantado guarda exatamente:

```rust
pub struct AttestationRecord {
    pub verdict: Verdict,
    pub predicate_set: Symbol,
    pub predicate_version: u32,
    pub submitted_by: Address,
    pub timestamp: u64,
    pub metadata_hash: BytesN<32>,
}
```

Não há fim de validade. Não há revogação. Não há hash do conjunto de predicados
— apenas nome e versão. Não há jurisdição.

A consequência é assimétrica e perigosa numa direção só: uma atestação que
**expira** no núcleo, ancorada nesse contrato, **lê como vigente para sempre**
por quem verifica olhando apenas a cadeia. O verificador externo é justamente a
persona para quem o produto existe.

## Decisão

**Não alteramos o contrato implantado.** A imutabilidade é deliberada e é
argumento institucional: *código verificado é código executado*. Evoluir
significa novo contrato em novo endereço, e atestações antigas continuam
verificáveis no contrato original.

Em vez disso, **o núcleo pergunta antes de escrever**. Três mudanças:

1. `NetworkDescriptor` passa a declarar `capabilities`: `validityWindow`,
   `revocation`, `packHash`, `jurisdiction`.

2. `anchorFidelity()` classifica o que se perde em duas categorias:
   - **bloqueante** — muda o que o registro *significa* para quem lê só a
     cadeia (validade, revogação);
   - **reduzido** — perde detalhe que o verificador ainda recupera do pacote
     fora da cadeia, dado o hash do resultado (hash do pacote, jurisdição).

3. `assertAnchorable()` recusa a escrita quando há perda bloqueante. O
   adaptador chama isso **antes** de invocar o contrato, então nada chega à
   cadeia pela metade.

O adaptador Stellar declara `false` nas quatro capacidades e falha alto em
`revoke()`, dizendo onde a revogação de fato vive enquanto isso: apenas na
trilha interna.

É o mesmo princípio do handshake de habilitação da regra do viajante, uma
camada abaixo: estabelecer o que o outro lado consegue fazer *antes* de lhe
entregar algo, em vez de descobrir a lacuna anos depois numa auditoria.

## Consequências

**Imediatas.** Atestação com validade não pode ser ancorada em Stellar hoje.
Isso é limitação real e declarada, não regressão: antes ela seria ancorada e a
validade sumiria em silêncio.

**A trilha registra o que a cadeia não soube lembrar.** Toda ancoragem deve
gravar o resultado de `anchorFidelity` na trilha interna. Numa inspeção, a
pergunta "por que este registro não tem validade?" tem resposta datada.

**O contrato v2 tem escopo definido.** Quando houver janela de implantação, o
novo contrato precisa de:

| Campo | Tipo | Por quê |
| --- | --- | --- |
| `valid_until` | `Option<u64>` | Sem ele, atestação vencida lê como vigente. |
| `revoked_at` | `Option<u64>` | Revogação precisa ser visível a quem lê só a cadeia. |
| `revocation_reason` | `Option<Symbol>` | Motivo codificado, nunca texto livre — texto livre vaza. |
| `pack_hash` | `BytesN<32>` | Identidade do conjunto de predicados, não só nome e versão. |
| `jurisdiction` | `Symbol` | Qual regime a regra aplicou. |

O registro Anchor do `dpo2u-solana` já carrega `expires_at`, `revoked_at` e
`revocation_reason`. O modelo de dados correto já existe na casa; falta portá-lo
para Soroban.

**A revogação exige uma decisão de autorização que ainda não foi tomada.** Quem
pode revogar? O emissor original, o admin, ou ambos? A resposta muda o desenho
do contrato v2 e tem implicação de segregação de funções. Fica em aberto
deliberadamente, para não ser decidida por acidente de implementação.

## Alternativas descartadas

**Deixar o adaptador ignorar os campos.** Escreveria com sucesso e perderia
significado em silêncio — o modo de falha que custaria mais confiança e seria
descoberto mais tarde.

**Alterar o contrato implantado agora.** Contradiz a imutabilidade por desenho,
e o guarda de deriva do CI corretamente exigiria nova implantação com atualização
de `scripts/deploy.json`, que depende de cerimônia e de acesso à rede.

**Guardar validade e revogação fora da cadeia e ligá-las por referência.**
Reintroduz exatamente a dependência de cooperação da instituição que o produto
existe para eliminar: o verificador externo teria de perguntar ao banco se
aquela atestação ainda vale.
