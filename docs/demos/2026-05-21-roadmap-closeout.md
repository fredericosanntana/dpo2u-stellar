# Fechamento do Roadmap — Piloto Anticorrupção DPO2U (Fase 4)

> Encerra o roadmap de 9 itens. A Fase 4 (itens 07/08) foi executada após uma
> verificação da API gov.br, que abriu use cases melhores e novos.
>
> - Data: 2026-05-21
> - Contrato testnet: `CC4TJGDRWZOPGBWOOHBJF3N2VKUQRNIW6C6PTYHD7ZI3D42GBQRRZHM5`

## 1. Verificação da API gov.br (106 endpoints)

Antes de fechar, avaliou-se o que a API do Portal da Transparência habilita:

- **Melhor:** `/licitacoes/participantes` (campo completo de licitantes);
  a cadeia `/licitacoes/empenhos → /despesas/documentos-relacionados →
  /favorecidos-finais-por-documento` (executar o `divergent_payee_v1`).
- **Novo:** `/acordos-leniencia` — fornecedor que admitiu corrupção (Lei 12.846).
- **Enriquecimento:** `/pessoa-juridica` — footprint do CNPJ.
- **Atrito confirmado:** gov.br **não** fornece CNAE nem QSA/sócios → `cnae_mismatch`,
  `regulatory_authorization` e `price_ceiling` exigem fontes externas → backlog.

## 2. Item 08 — novos use cases gov.br-native

Cada use case = `PredicateSet` (mcp-server) + evaluator (pilot-gateway) +
`configure_use_case` on-chain.

### leniency_flag_v1 — fornecedor sob acordo de leniência ✅

Família 4.3. Cruzou os **120 CNPJs do cadastro oficial de leniência** com o
footprint `/pessoa-juridica` de cada um.

**Resultado: 120 alertas reais**
- **97 `FAIL`** — acordo de leniência vigente.
- **23 `REVIEW`** — acordo concluído (a empresa admitiu o ato lesivo).
- **50 dessas empresas seguem com contratação ou recebimento de recursos
  federais** (`possuiContratacao` / `favorecidoDespesas` = verdadeiro).

São empresas reais e reconhecíveis dos grandes casos de corrupção — OAS,
Odebrecht (ODBINV), OCYAN, UNIDAS, CONSTRUTORA COESA, METHA. Empresas que
**assinaram acordo admitindo corrupção e continuam recebendo dinheiro público**.

Configurado on-chain: tx [`b7d70d91…`](https://stellar.expert/explorer/testnet/tx/b7d70d91366c4e78eed073b6b2b1f245ed981ab246992e51cfc9d11632789510).
**4 alertas atestados e verificados** (testnet):

| Empresa | Verdito | TX |
|---|---|---|
| UNIDAS LOCAÇÕES E SERVIÇOS S/A | FAIL | [`b6f899ae…`](https://stellar.expert/explorer/testnet/tx/b6f899ae58692c6185539e4bec34e22ca0f0d7e24281f944260a829c51ee41f6) |
| CONSTRUTORA COESA S.A. | FAIL | [`314bea2b…`](https://stellar.expert/explorer/testnet/tx/314bea2b9c611c9f0c898acb0b228347244e70623dd85405e15a0c04dcfd04f2) |
| METHA S.A. | FAIL | [`b99cb84d…`](https://stellar.expert/explorer/testnet/tx/b99cb84ddd68ea1c40d1f232bb3a6bdca567864383c057024907ae579d65a635) |
| OAS EMPREENDIMENTOS S.A. | FAIL | [`a276c0f0…`](https://stellar.expert/explorer/testnet/tx/a276c0f0560a0aeea8ad4a2f4f749b04298143c6e6693c60ae4848f872f1357c) |

### divergent_payee_v1 — favorecido divergente (família 4.4)

Construído no item 09, configurado on-chain
([`cdf7911e…`](https://stellar.expert/explorer/testnet/tx/cdf7911e7cd39da841435d4c4f36d5b908c88c6035c401551731290483367390)),
evaluator verificado. **Run real:** 345 ordens bancárias varridas
(`/despesas/documentos-por-favorecido` + `/favorecidos-finais-por-documento`),
**0 divergências favorecido-final** na amostra — o campo é esparso em pagamentos
diretos a fornecedor. O detector está pronto; a varredura ampla via a cadeia de
empenho completa é o próximo passo iterativo (honestidade do piloto).

### winner_rotation_v1 — rodízio de vencedores (família 4.1)

Construído, configurado on-chain
([`f5e1f053…`](https://stellar.expert/explorer/testnet/tx/f5e1f053a63b075549f93d227e0a7051ae1ead1c636ce7e3266a22e9276132cd)),
evaluator verificado. O endpoint `/licitacoes` da API tem cobertura federal
esparsa pós-Lei 14.133 (licitações migraram para o PNCP) — o detector está
pronto; a fonte ideal de licitantes é o PNCP participantes.

## 3. Enriquecimento por footprint gov.br

`fetchPessoaJuridica(cnpj)` anexa a cada alerta gov.br o footprint do CNPJ:
sancionado CEIS/CNEP/CEPIM/CEAF, participou de licitação, possui contratação,
emitiu NFe, beneficiou-se de renúncia fiscal — uma chamada por CNPJ.

## 4. Item 07 — buscar mais alertas

`SCAN_CLASSES` do `run-real-pilot.ts` ampliado de 3 para **6 classes de material**
(+ instrumentos médicos 6515, mobiliário hospitalar 6530, material de limpeza
7920) — runs futuros cobrem mais itens. O reforço de volume real desta fase veio
dos **120 alertas de leniência** (novo use case gov.br).

## 5. Estado final do piloto

- **6 use cases ativos** no contrato testnet: `sanction_check_v1`,
  `overpricing_v1`, `divergent_payee_v1`, `leniency_flag_v1`,
  `winner_rotation_v1` (+ `bank_chg`).
- **1.262 alertas reais**: 1.142 (sanção + sobrepreço, run v2) + 120 (leniência).
- **10 atestações on-chain** verificáveis: 6 do run v2 + 4 de leniência.
- Painel `/pilot/alertas` (dpo2u.com) mostra os 1.262 com filtro por use case.

## 6. Backlog (fora de escopo — exigem fontes externas)

- `cnae_mismatch_v1` — CNAE do fornecedor (ReceitaWS / dados CNPJ).
- `regulatory_authorization_v1` — Autorização de Funcionamento ANVISA.
- `price_ceiling_v1` — teto CMED (medicamento) / SINAPI (obra).
- `divergent_payee_v1` — varredura ampla via cadeia de empenho completa.
- `winner_rotation_v1` — fonte de licitantes via PNCP.

## 7. Artefatos

- Use cases gov.br: `runs/2026-05-21-govbr-usecases.json`,
  `runs/2026-05-21-leniency-check.json` (com `attested_alerts`).
- Integração gov.br (item 09): `docs/2026-05-21-govbr-api-integration.md`.
- Código: `pilot-gateway/src/real-pilot/sources/transparencia-api.ts`,
  `pilot-gateway/scripts/{run-govbr-usecases,run-leniency-check,attest-govbr}.ts`,
  `mcp-server/src/predicates/sets/{leniency_flag_v1,winner_rotation_v1,divergent_payee_v1}.ts`.
