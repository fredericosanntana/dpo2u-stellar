# Integração da API gov.br — Portal da Transparência (item 09 do roadmap)

> Conecta o piloto à **API oficial autenticada** do Portal da Transparência
> (`api.portaldatransparencia.gov.br`), habilitada pelo token Gov.br nível
> Prata/Ouro. Destrava o que o download bulk não dá: fonte primária ao vivo de
> sanções e a família 4.4 do Oráculo (pagamento).
>
> - Data: 2026-05-21
> - Chave: `chave-api-dados` em `pilot-gateway/.env.local` (gitignored).

## 1. Cliente — `transparencia-api.ts`

`pilot-gateway/src/real-pilot/sources/transparencia-api.ts` — cliente autenticado,
throttle 800ms (limite da API ~90 req/min), retry com backoff em 429:

- `lookupSanctionsApi(cnpj)` — consulta CEIS/CNEP/CEPIM por `codigoSancionado`;
  devolve o registro oficial normalizado: tipo de sanção, fonte, órgão
  sancionador, fundamentação legal, datas exatas de início/fim.
- `isApiSanctionActive(rec, data)` — vigência da sanção numa data.
- `fetchDocumentosByFavorecido(cnpj, …)` — documentos de despesa (fase 3 =
  ordem bancária) por favorecido — insumo do `divergent_payee_v1`.

## 2. Corroboração de sanções — fonte primária

O `sanction_check_v1` detecta sobre o download bulk CEIS/CNEP/CEPIM (um snapshot).
O script `scripts/sanction-cross-check.ts` cruza cada alerta **FAIL** com a API
oficial ao vivo.

**Resultado: 25/25 alertas FAIL CONFIRMADOS** — para cada CNPJ, a API oficial
confirmou sanção vigente na data da compra. Zero divergências, zero sem-registro.
É a validação independente do detector contra a fonte primária.

Detalhe completo: `docs/demos/2026-05-21-sanction-api-cross-check.md`.

## 3. Novo use case — `divergent_payee_v1` (família 4.4)

UC-5: compara o CNPJ **contratado** numa licitação com o CNPJ **favorecido** da
ordem bancária que liquidou o pagamento. Favorecido divergente sem cessão de
crédito registrada (Lei 14.133/2021, art. 134) é sinal forte de desvio.

- PredicateSet: `mcp-server/src/predicates/sets/divergent_payee_v1.ts`
  (D1 pagamento identificável · D2 concordância de favorecido · D3 divergência
  sem cessão registrada). Registrado no `registry.ts`/`index.ts`.
- Evaluator: `pilot-gateway/src/lib/predicates.ts` → `evaluateDivergentPayee`.
- **Configurado on-chain** (testnet): `configure_use_case divergent_payee_v1` —
  tx [`cdf7911e…`](https://stellar.expert/explorer/testnet/tx/cdf7911e7cd39da841435d4c4f36d5b908c88c6035c401551731290483367390).
  Verdito: divergência **com** cessão → `REVIEW`; **sem** cessão → `FAIL`.

## 4. Pendente

A execução real do `divergent_payee_v1` exige casar contratos (Compras.gov.br)
com ordens bancárias (Portal da Transparência) — o endpoint `/despesas/documentos`
exige iterar por unidade gestora. Essa camada de junção é o próximo passo de
engenharia de dados; o detector e a configuração on-chain já estão prontos.
