# @dpo2u/core

> Núcleo de compliance **independente de rede**. Planos 1 a 3 da arquitetura —
> política como código versionado, evidência no perímetro, avaliação e trilha —
> mais o contrato de adaptador do plano 5. Não importa nenhum SDK de blockchain,
> e isso é verificado no CI.

Este pacote é o Marco 1 do blueprint da camada bancária. Ele existe para ser
extraído deste repositório quando a camada virar produto próprio: nada aqui
depende de Soroban, Stellar ou de qualquer outra rede.

## Por que independente de rede

Banco não compra dependência de uma rede específica, e a escolha vai mudar pelo
menos uma vez durante a vida de um contrato comercial. A promessa só é real se
tipos nativos de rede nunca subirem para os planos 1 a 3 — por isso
`scripts/no-chain-deps.mjs` roda no CI e falha o build se um SDK de cadeia, um
tipo nativo ou uma dependência de runtime aparecer aqui.

```bash
npm run no-chain-deps
# ✓ core is network-independent: no chain SDK, no chain-native types, no runtime deps
```

Quando um adaptador precisar de algo que o contrato em `src/adapter.ts` não
oferece, a resposta é ampliar aquele contrato em termos que o núcleo já fala —
strings e hashes hex — nunca importar o SDK aqui.

## Módulos

| Módulo | Plano | O que resolve |
| --- | --- | --- |
| `canonical.ts` | — | Serialização determinística e hash reproduzível por um auditor que só tem as entradas. |
| `predicate.ts` | P1 | Predicado puro e versionado. Jurisdição é parâmetro, nunca bifurcação. |
| `policy-pack.ts` | P1 | Conjunto de predicados que uma instalação recebe e que a atestação cita. |
| `engine.ts` | P3 | Avaliação determinística e agregação de veredito. |
| `attestation.ts` | P3 | Registro com **validade e revogação** — não só carimbo de tempo. |
| `trail.ts` | — | Trilha append-only encadeada por hash, com verificação. |
| `adapter.ts` | P5 | O único contrato que sabe que blockchain existe. |

## Predicados incluídos

**`ubo_threshold`** — beneficiário final. A Circular BCB 3.978 não fixa limiar:
exige que cada instituição defina o seu **com base em risco**, apenas limitado a
25%, e trata como beneficiário final também quem exerce **controle de fato**.
Na América Latina o próprio teto varia (5% na Colômbia, 10% na Argentina, 15% no
Uruguai, 25% no Brasil). Um limiar compilado como constante não atende a norma em
nenhum desses lugares.

```ts
const pack = definePolicyPack({
  useCaseId: 'kyb_onboarding',
  version: 1,
  jurisdiction: 'BR',
  basis: ['Circular BCB 3.978/2020', 'Lei 9.613/1998'],
  predicates: [
    {
      predicate: uboThreshold,
      params: brazilUboParams({
        institutionThresholdPct: 10,   // escolha da instituição, abaixo do teto
        riskBasisRef: 'ARC-2026-004',  // onde essa escolha está justificada
      }),
    },
  ],
});
```

O mesmo predicado a 10% e a 25% produz `predicateHash` diferente — é isso que
faz a atestação registrar **qual regra estava em vigor**, e não apenas que uma
regra com aquele nome existia.

**`bank_change_*`** — os cinco predicados do UC-1 do piloto anticorrupção
(`bank_change_v1`, PRD v0.3 §5.1), portados um a um: titularidade da conta,
origem da solicitação, histórico de alterações, pagamento iminente e instituição
de destino. São, sem alteração, o controle de fraude em pagamento a fornecedor
que o mercado B2B privado descreve.

**`vasp_classification`** — fase 0 da Travel Rule portável. O artigo 89 da
Resolução BCB 520 admite autodeclaração do cliente nas duas fases; o predicado
aceita, porque a norma aceita, mas nunca em silêncio: `REVIEW` com motivo
`counterparty.unhosted_on_self_declaration`, para que a instituição enxergue
quanto da carteira dela repousa na palavra de alguém.

## Frescor: a atestação responde "ainda é verdade agora?"

Com KYC perpétuo virando padrão operacional, atestação com só carimbo de tempo
perde valor a cada dia. `assessFreshness` separa quatro estados — válida,
expirada, revogada e obsoleta para a parte confiante — e a revogação vem antes
da expiração porque é assim que um supervisor lê.

```ts
assessFreshness(att, agora, { maxAgeSeconds: 7 * 86_400 });
// { status: 'STALE', reason: 'age 1209600s exceeds relying-party limit of 604800s', ageSeconds: … }
```

O limite de idade é da **parte que confia**, não de quem emite: uma contraparte
pode aceitar checagem de seis meses onde um supervisor não aceitaria.

## Trilha probatória

`AuditTrail` encadeia cada entrada ao hash da anterior, então qualquer alteração
quebra todos os elos seguintes e `verify()` diz onde. É o que permite
**demonstrar** — e não apenas afirmar — os "testes aplicados" que os arts. 62 a
65 da Circular 3.978 exigem no relatório anual de efetividade.

Um limite honesto, coberto por teste: encadeamento de hash prova que nada foi
*alterado*, não que nada foi *omitido*. Truncar a cauda deixa uma cadeia
internamente válida. Só publicar o hash da cabeça externamente fecha essa brecha
— e é para isso que a âncora serve.

## Desenvolvimento

```bash
npm install --legacy-peer-deps   # npm 10.9.x quebra ao resolver o peer set do vitest 4.x
npm run typecheck
npm run test:run
npm run no-chain-deps
npm run build
```

## O que este pacote deliberadamente não faz

- Não coleta evidência: quem coleta é o plano 2, dentro do perímetro.
- Não fala com rede nenhuma: isso é um adaptador, em pacote separado.
- Não assina nem persiste a trilha: assinatura e retenção são da instalação, e
  variam por banco.
- Não gera prova de conhecimento zero: é o Marco 6, e depende deste núcleo estar
  estável primeiro.

## Licença

Apache-2.0.
