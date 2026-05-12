# Sales Pack — DPO2U Piloto Anticorrupção

Documentação institucional pra prospecção de município piloto (Sprint I Track A do roadmap).

## Como usar

Os 3 documentos compõem um pacote de apresentação em ordem:

1. **[`overview.md`](overview.md)** — 1-pager pra primeira reunião (15 min). Para quem é, o que é, o que NÃO é, custos, próximos passos. Linguagem direta, sem jargão técnico.
2. **[`roi.md`](roi.md)** — Calculadora de retorno baseada no caso âncora TJDFT R$ 5,5M + cenários conservador/médio/raro. Inclui template pra customização pós-NDA.
3. **[`pilot-terms.md`](pilot-terms.md)** — Carta de intenção + minuta de Termo de Cooperação Técnica. Sem ônus financeiro para o piloto de 90 dias. Customizado por município em Sprint K.

## Documentos institucionais auxiliares

- **[`../DPIA-Piloto-Anticorrupcao-v0.1.md`](../DPIA-Piloto-Anticorrupcao-v0.1.md)** — DPIA pré-município (Sprint I Track B). Versão v1.0 assinada no Sprint K com município contratado.
- **[`../THREAT-MODEL-Piloto-v0.1.md`](../THREAT-MODEL-Piloto-v0.1.md)** — STRIDE-light v0.1, refinado em workshop 2h no Sprint K.

## Verificação independente (qualquer um pode rodar agora)

```bash
npm i -g @dpo2u/stellar-sdk
dpo2u-attest verify bank_change_v1 0000000000000000000000000000000000000000000000000000000000000000
```

Resultado esperado: `NOT FOUND` (não há atestação para esse hash), com link para o contrato no Stellar Expert. Comando funciona sem nenhuma credencial DPO2U ou municipal.

## Lista alvo (interna — não distribuir)

Critérios Sprint I prospecção (5 municípios curtos):
- População até 50.000 habitantes.
- CGM (Controladoria-Geral do Município) ativa, com chefe nomeado por portaria.
- Histórico de relacionamento Superteam BR (Pedro Marafiotti network).
- Preferência geográfica: RS / SC / MG (proximidade DPO2U + cultura de modernização administrativa).
- Eleições municipais 2024 com prefeito em primeiro mandato (incentivo reputacional alto).

## Pipeline de conversão alvo

| Etapa | Quando | Quem |
|---|---|---|
| Primeira mensagem | semana 1 | Chairman, via Superteam BR + LinkedIn |
| Primeira reunião 30 min | semana 2 | Chairman + ponto-focal município |
| Demo round-trip ao vivo 60 min | semana 3 | Chairman + DPO município + CGM + IT |
| Carta de intenção | semana 4 | DPO2U + Prefeito + DPO |
| Termo de Cooperação | semana 6-7 | Procuradoria municipal + DPO2U + parceira jurídica |
| Go-live técnico testnet | semana 8 | DPO2U + IT município |
| Relatório mensal #1 | semana 12 | DPO2U → Prefeito + CGM |

## Pós-piloto (Sprint L+)

Critério de sucesso pra escalar: ≥1 município em Observer L1 ao final do Sprint H/I + métricas pós-30d positivas → carta de aval do Prefeito + CGM + publicação conjunta. Próximo município adquirido com referência cruzada.

> **Lembrete institucional**: DPO2U é compliance-as-protocol, não compliance-as-PDF. O sales-pack acima é a apresentação do "what" — o "why" é a tese institucional do DPO2U Chairman (Frederico Santana, mestre FGV, DPO 15 anos, co-autor ERC-8004 e paper DAO governance 2024).
