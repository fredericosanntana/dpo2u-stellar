# @dpo2u/adapter-stellar

> Adaptador Stellar/Soroban do plano 5. Implementa `ChainAdapter` do
> `@dpo2u/core` contra o contrato `anticorruption-attestation`, declarando
> exatamente quais semânticas de atestação esse contrato consegue preservar.

Este é o primeiro adaptador — e, por isso, o primeiro teste de verdade da
abstração de rede. Ele reprovou parte dela, o que era o objetivo.

## O que a construção revelou

A interface do plano 5 supunha, sem dizer, que toda rede guarda tudo que uma
atestação carrega. O contrato implantado guarda seis campos:

```rust
verdict, predicate_set, predicate_version, submitted_by, timestamp, metadata_hash
```

Sem validade. Sem revogação. Sem hash do pacote. Sem jurisdição.

A consequência é assimétrica: uma atestação que **expira** no núcleo, ancorada
aqui, **lê como vigente para sempre** por quem verifica olhando só a cadeia — e
esse verificador é a persona para quem o produto existe.

A correção não foi ampliar o contrato, que é imutável por desenho. Foi fazer o
núcleo **perguntar antes de escrever**. Ver
[`docs/ADR-001-anchor-capabilities.md`](../../docs/ADR-001-anchor-capabilities.md).

## Capacidades declaradas

```ts
export const DEPLOYED_CONTRACT_CAPABILITIES = {
  validityWindow: false,
  revocation: false,
  packHash: false,
  jurisdiction: false,
};
```

Cada `false` é um achado, não uma escolha de desenho. O ADR lista os campos do
contrato v2.

## Comportamento

| Operação | Hoje |
| --- | --- |
| `register` | Ancora. **Recusa** antes de escrever se a atestação tem validade ou revogação — nada chega à cadeia pela metade. |
| `read` | Somente leitura, sem carteira e sem taxa. Devolve os campos ausentes como `undefined`, nunca com valor padrão. |
| `revoke` | Falha alto com `UnsupportedByContractError`, dizendo que a revogação vive só na trilha interna enquanto não houver contrato v2. |
| `setAuthorized` | Funciona. |

Um valor padrão em `read` seria mentira num lugar onde ninguém pensaria em
conferir. Por isso `undefined`.

## Injeção

Assinatura e submissão são da instalação — custódia de chave muda por banco, e
este pacote não pode presumir carteira. Duas interfaces injetadas:

- `SorobanReader` — satisfeita por `AttestationClient` do `@dpo2u/stellar-sdk`.
- `SorobanInvoker` — quem assina e envia a transação.

Isso é o que mantém o adaptador testável sem rede: os testes usam implementações
falsas e verificam **o que foi pedido à cadeia**, não o que a cadeia respondeu.

```ts
const adapter = new StellarAdapter({ reader, invoker });

await adapter.register(attestation);        // ok
await adapter.register(attestationComValidade);
// UnpreservableSemanticsError: network "stellar-testnet" cannot preserve: validUntil
```

## Desenvolvimento

O `@dpo2u/core` entra como dependência local (`file:../../core`), então precisa
estar compilado antes:

```bash
cd ../../core && npm install --legacy-peer-deps && npm run build
cd ../adapters/stellar
npm install --legacy-peer-deps
npm run typecheck
npm run test:run
```

## Licença

Apache-2.0.
