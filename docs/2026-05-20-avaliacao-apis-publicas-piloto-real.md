# Avaliação de APIs Públicas para o Piloto Real do dpo2u-stellar

> **Documento de avaliação** — correlaciona o catálogo de fontes públicas do *Oráculo
> Anticorrupção* (PRD v1 + Requisitos v2) com os predicados do `dpo2u-stellar`, para
> identificar **quais dados de quais APIs sem autenticação viabilizam um piloto
> funcional com dados reais**.
>
> - **Data:** 2026-05-20
> - **Autor:** Chairman (Claude Code)
> - **Fontes:** `00-INBOX/Oraculo_Anticorrupcao_PRD_v1.pdf`, `Oraculo_Anticorrupcao_Requisitos_v2.pdf`
> - **Escopo desta entrega:** somente avaliação. Nenhuma alteração de código.
> - **Status:** recomendação para decisão do Chairman.

---

## 1. Contexto e objetivo

O `dpo2u-stellar` é a **camada de atestação on-chain** da pilha compliance-as-protocol:
o contrato Soroban `anticorruption-attestation` (testnet `CC4TJGDR…RRZHM5`) sela na
blockchain o veredito — `PASS` / `FAIL` / `REVIEW` — de cada decisão de compliance,
armazenando apenas hashes (sem PII).

O problema que este documento ataca: **o piloto roda hoje em dados sintéticos e
hardcoded.** A auditoria consolidada de 2026-05-15 registrou isso como **DEBT-007** —
*"predicates `bank_change_v1` + `payment_doc_v1` shipping como PASS stubs — trust
collapse risk se tráfego externo passar antes da substituição"*.

Estado verificado dos predicados:

| Arquivo | Estado |
|---|---|
| `mcp-server/src/predicates/sets/bank_change_v1.ts` | 5 predicados — **todos `stubPass`** (retornam PASS fixo) |
| `mcp-server/src/predicates/sets/payment_doc_v1.ts` | 6 predicados — **todos `stubPass`** |
| `pilot-gateway/src/lib/predicates.ts` (`evaluateBankChg`) | Determinístico e vivo, **porém** P1 (CNPJ) é só comparação estrutural — não consulta a Receita; P4 (banco) usa **lista top-50 ISPB hardcoded** (linhas 3-57; comentário: *"Hardcoded pra MVP; consultar API BCB em sprint K.2"*) |

O *Oráculo Anticorrupção* é a contrapartida: uma **engine de detecção** que cataloga
~30 fontes públicas brasileiras cujo cruzamento gera alertas de irregularidade em
licitações. É exatamente o **insumo de dados reais** que falta ao `dpo2u-stellar`.

**Requisito declarado pelo Chairman:** rodar um **piloto funcional com dados reais**,
**priorizando APIs sem autenticação** (a API do Portal da Transparência, que exige token
Gov.br, fica para fase 2).

---

## 2. Sumário executivo — recomendação

**Conclusão central:** os dois use cases atuais (UC-1 troca de conta bancária, UC-2
pacote de pagamento) dependem de **dados que só o município detém** — pedidos de troca
de conta, notas fiscais, empenhos, atestos escaneados. **Nenhum deles é público.**
Enquanto não houver município com convênio assinado (gargalo do Sprint I), esses use
cases **não podem rodar sobre dados reais** — só sobre evidência fornecida por terceiro.

Logo, a via mais curta para um piloto funcional sobre dados reais é **adicionar um caso
de uso nativo de dados abertos**, alimentado 100% por APIs sem autenticação. O contrato
Soroban já suporta isto sem redeploy: `configure_use_case` registra um novo
`use_case_id` apontando para um novo predicate set — o contrato é **agnóstico ao
conjunto de predicados**.

**Recomendação — dois novos use cases, ambos 100% sem-auth:**

| Onda | Use case | Sinal | Fontes (todas sem-auth) | Por quê |
|---|---|---|---|---|
| **1 (MVP)** | `sanction_check_v1` — fornecedor sancionado venceu licitação | Binário, determinístico | PNCP (resultados/vencedores) + downloads bulk CEIS/CNEP/CEPIM | Mais leve e rápido; zero ambiguidade estatística; alto interesse público; não precisa do bulk CNPJ de 85 GB |
| **2** | `overpricing_v1` — sobrepreço em item de contratação | Estatístico (Z-modificado) | PNCP + Compras.gov.br (nova) + CMED + SINAPI/SICRO | Exercita o motor estatístico do Oráculo (família 4.2); ainda 100% sem-auth |

Com `sanction_check_v1`, **qualquer auditor ou cidadão** pode puxar um resultado real do
PNCP, cruzar com a lista de sanções e atestar o veredito on-chain — sem depender de
município, sem token, sem PII sensível. Esse é o piloto funcional.

---

## 3. Os dois projetos e sua correlação

| | Oráculo Anticorrupção | dpo2u-stellar |
|---|---|---|
| **Papel** | Engine de **detecção** | Camada de **atestação** |
| **O que faz** | Cruza fontes públicas → gera alertas priorizados de irregularidade | Sela o veredito da decisão na blockchain (selo de cera digital) |
| **Insumo** | ~30 APIs/bases públicas | O veredito + hashes produzidos por um predicate set |
| **Saída** | Alerta para auditor humano | `AttestationRecord` imutável e verificável por qualquer um |

Não são concorrentes — são camadas complementares. O Oráculo **detecta**; o stellar
**sela** de forma trustless (auditor externo verifica via `verify_attestation` sem
cooperação do ente). Este documento usa o catálogo de APIs do Oráculo como cardápio de
dados reais para alimentar os predicados que o stellar atesta.

---

## 4. Avaliação das APIs públicas

### 4.1 Grupo A — Fontes SEM autenticação (prioritárias)

| Fonte | Acesso / formato | Atualização | Cobertura | Estabilidade / risco |
|---|---|---|---|---|
| **PNCP — Portal Nacional de Contratações Públicas** | API REST de consulta, Swagger público, **sem token** (`pncp.gov.br/api/consulta`) + dados abertos bulk | Tempo real (publicação é condição de eficácia — art. 176 Lei 14.133/21) | Todos os entes (União, estados, municípios) — editais, contratos, atas SRP, itens, resultados/vencedores, aditivos | Alta — fonte oficial e legalmente obrigatória. Paginação obrigatória; rate limit moderado; **cache local recomendado**. ⚠️ *Em teste 2026-05-20: `api-docs` respondeu HTTP 200; consulta de contratações ficou lenta (>30s) — exige retry + cache na ingestão.* |
| **Compras.gov.br (API nova)** | API REST/JSON, `dadosabertos.compras.gov.br`, **sem auth** | Diária (D-1) | Federal | Boa — substituiu a legada `compras.dados.gov.br` em 2025 (DW-SIASG descontinuado) |
| **CNPJ — base bruta RFB** | Download bulk CSV/ZIP, **sem auth** (`arquivos.receitafederal.gov.br/dados/cnpj/dados_abertos_cnpj/`) | Mensal | Nacional — Empresas, Estabelecimentos, Socios, Simples, CNAE etc. Chave `cnpj_basico` (8 díg.) | Média — ~5 GB compactado / **~85 GB descompactado**, ~10 partes/tabela. ⚠️ Mudou de hospedagem em 2026; `dados.gov.br` virou só catálogo de metadados — scripts antigos quebraram |
| **APIs de consulta CNPJ pontual** | REST JSON | Tempo real | Por CNPJ | **BrasilAPI** (`brasilapi.com.br/api/cnpj/v1/{cnpj}` — sem auth, sem SLA — ✅ *verificado funcional 2026-05-20*), **OpenCNPJ** (`opencnpj.org` — sem auth, ~50 req/s), **Minha Receita** (`minhareceita.org` — sem auth, auto-hospedável), CNPJá Open. Servem para verificação pontual, não varredura em massa |
| **Querido Diário (Open Knowledge Brasil)** | API REST, Swagger, **sem chave** (`queridodiario.ok.org.br/api/docs`) | Contínua | +350 municípios indexados; spiders para 3.000+ em integração | Média — depende de mantenedor cívico (OKBR); cobertura municipal desigual |
| **DOU — Imprensa Nacional** | Download bulk XML mensal (`in.gov.br/dados-abertos`) | Diária/mensal | Federal | Alta |
| **CEIS / CNEP / CEPIM / CEAF — downloads bulk** | CSV/ZIP open data (`portaldatransparencia.gov.br/download-de-dados`), **sem auth** | Mensal | Nacional — empresas inidôneas, punidas (Lei 12.846), OSCs impedidas, servidores expulsos | **Nuance crítica:** a *API* do Portal da Transparência exige token, mas os **downloads de dados abertos não** — sanções entram no piloto sem token |
| **CMED (Anvisa)** | Download XLS/PDF, **sem auth** | Mensal | Medicamentos (teto PMVG) | Alta |
| **SINAPI (IBGE/Caixa) / SICRO (DNIT)** | Download ZIP/XLSX, **sem auth** | Mensal / periódica por UF | Custos de obras (edificação, infra, rodoviária) | Alta |
| **BPS — Banco de Preços em Saúde** | Web + CSV (`bps.saude.gov.br`), **sem auth** | Contínua | Medicamentos e insumos | Boa |
| **TSE Dados Abertos** | Download/API (`dadosabertos.tse.jus.br`), **sem auth** | Por eleição | Doadores de campanha | Boa |
| **TCU Inidôneos** | REST (`contas.tcu.gov.br/ords/condenacao/consulta/inabilitados/{CPF}`) | — | Pessoas físicas inabilitadas pelo TCU | Boa — útil para enriquecer `sanction_check_v1` |
| **BCB — instituições reguladas** | Lista pública de participantes do SPB (ISPB), **sem auth** | Periódica | Bancos/instituições de pagamento | Alta — substitui a lista top-50 hardcoded do `pilot-gateway` |

### 4.2 Grupo B — Fontes com autenticação ou atrito (fase 2)

| Fonte | Atrito | Tratamento |
|---|---|---|
| **Portal da Transparência — API** (`api.portaldatransparencia.gov.br`) | Token Gov.br Prata/Ouro (gratuito, exige cadastro). Rate limit 90 req/min (06h-24h) / 300/min (00h-06h) | Fase 2. No piloto, usar os **downloads bulk** equivalentes (Grupo A) |
| **API Contratos (Comprasnet)** | OAuth2 | Fase 2 |
| **Portal Transparência — Ordens Bancárias / Despesas** | Token | Fase 2 — necessária para a família 4.4 (pagamento), fora do escopo do piloto inicial |
| **SP municipal — APILIB** | Token | Fase 2 |
| **CNJ Improbidade (CNCIAI)** | Sem API REST — exige scraping | Fase 2 |

### 4.3 Risco transversal — descontinuação de API pública

O **Painel de Preços** (`paineldeprecos.planejamento.gov.br`), historicamente a
principal fonte de preços praticados, foi **descontinuado em 04/07/2025** (Comunicado
30/2025). Precedente concreto de que fonte pública pode sumir. Mitigação adotada no
desenho: diversificar fontes, tolerar falhas no pipeline e manter cache/snapshot local
de tudo que é ingerido.

---

## 5. Matriz de correlação — API → predicado / use case

### 5.1 Use cases atuais (UC-1, UC-2)

| Predicado | O que precisa | Fonte | Viável sem-auth? | Gap |
|---|---|---|---|---|
| UC-1 P1 — `cnpj_holder_match` | CNPJ do titular = CNPJ do fornecedor, e fornecedor existe/ativo | BrasilAPI / OpenCNPJ | ✅ Sim | Hoje só compara strings; **dá para elevar** a CNPJ verificado |
| UC-1 P4 — `bcb_regulated_bank` | ISPB do banco destino na lista de instituições reguladas | Lista BCB (SPB) | ✅ Sim | Hoje **top-50 hardcoded**; trocar pela lista BCB completa |
| UC-1 P2 — `official_channel` | Canal/2FA do pedido | Metadados do município | ❌ Não público | Depende de convênio |
| UC-1 P3 — `sender_domain` | Domínio do e-mail do solicitante | Município | ❌ Não público | Depende de convênio |
| UC-1 P5 — `no_recent_change` | Histórico de troca de conta | Município | ❌ Não público | Depende de convênio |
| UC-2 P2.6 — `ceis_cnep_clean` | Fornecedor não está em CEIS/CNEP | **Bulk CEIS/CNEP** | ✅ Sim | Viável já via bulk; API com token = fase 2 |
| UC-2 P2.1–P2.5 | NF, empenho, atesto, contrato escaneados | Município | ❌ Não público | Depende de convênio + OCR |

**Leitura:** dá para **enriquecer** UC-1 P1 e P4 e UC-2 P2.6 com APIs sem-auth, mas o
*caso-base* de UC-1 e UC-2 continua dependente de município. Enriquecer não produz, por
si só, um piloto funcional sobre dados reais.

### 5.2 Use case novo recomendado — `sanction_check_v1` (Onda 1, MVP)

Atesta: *"o fornecedor vencedor de uma contratação estava, na data da homologação,
sancionado/inidôneo?"* — endereça a família 4.3 do Oráculo ("lavagem de inidoneidade").

| Predicado | Regra | Fonte (sem-auth) |
|---|---|---|
| O1 — `contract_identifiable` | Resultado tem CNPJ vencedor, órgão, data, valor | PNCP (resultados) |
| O2 — `not_in_ceis` | CNPJ vencedor ∉ CEIS (inidôneas/suspensas) | Bulk CEIS |
| O3 — `not_in_cnep` | CNPJ vencedor ∉ CNEP (punidas Lei 12.846) | Bulk CNEP |
| O4 — `not_in_cepim` (se OSC) | CNPJ ∉ CEPIM | Bulk CEPIM |

Veredito: `FAIL` se em qualquer lista; `PASS` se limpo; `REVIEW` se a janela de
vigência da sanção for ambígua. `evidence_hash` = SHA-256 do payload (resultado PNCP +
snapshot da lista de sanções consultada); `metadata_hash` = versão dos predicados +
hash da base de sanções + timestamp. Flui para
`register_attestation(submitter, use_case_id="sanction", verdict, evidence_hash, metadata_hash)`.

Por que MVP: determinístico e binário (zero estatística para calibrar), leve (não precisa
do bulk CNPJ de 85 GB), 100% sem-auth, e roda E2E **sem município**.

### 5.3 Use case novo — `overpricing_v1` (Onda 2)

Atesta sobrepreço em um item de contratação — família 4.2 do Oráculo.

| Predicado | Regra | Fonte (sem-auth) |
|---|---|---|
| O1 — `item_identifiable` | Item tem CATMAT/CATSER + unidade de medida | PNCP |
| O2 — `basket_sufficient` | ≥ N observações do mesmo item no último ano | PNCP + Compras.gov.br |
| O3 — `within_cmed` (medicamento) | Valor ≤ PMVG/CMED | CMED |
| O4 — `within_sinapi` (obra) | Valor ≤ SINAPI/SICRO + BDI máximo | SINAPI/SICRO |
| O5 — `not_outlier` | Z-modificado \|z_m\| ≤ 3,5 contra a mediana da cesta | PNCP |

Exercita o motor estatístico (Z-modificado `z_m = 0,6745·(x − mediana)/MAD`,
deflacionamento IPCA). Ainda 100% sem-auth. Vem depois do MVP porque exige calibração de
cesta de preços e thresholds.

### 5.4 Sem redeploy de contrato

O contrato `anticorruption-attestation` não muda. `register_attestation` recebe
`use_case_id: Symbol` e dois `BytesN<32>` — é agnóstico ao predicate set. Adicionar
`sanction_check_v1` e `overpricing_v1` é **configuração** (`configure_use_case`) + código
off-chain de predicados, não alteração on-chain.

---

## 6. Lacunas e riscos

| Risco | Impacto | Mitigação |
|---|---|---|
| Descontinuação de API pública (precedente: Painel de Preços) | Pipeline quebra | Snapshot local de tudo que é ingerido; fontes redundantes (PNCP + Compras.gov.br) |
| Lentidão/instabilidade do PNCP (observada em teste) | Ingestão trava | Retry com backoff + cache; ingestão em janela noturna |
| Bulk CNPJ ~85 GB | Custo de armazenamento/processamento | `sanction_check_v1` **não usa** o bulk CNPJ — adiar para o UC de conluio |
| Cobertura municipal desigual (Querido Diário) | Indicadores de diário ficam parciais | Fora do escopo do piloto inicial |
| Sanção com janela de vigência ambígua | Falso positivo no `sanction_check_v1` | Veredito `REVIEW` quando a vigência não for inequívoca; auditor humano decide |
| LGPD | Exposição indevida | PJ pode ser exposta integralmente (Lei 8.934/94); **CPF de sócio deve ser pseudonimizado**; nada de PII sensível on-chain — o contrato já guarda só hashes |
| Token Gov.br ausente | API do Portal da Transparência indisponível | Piloto usa os **downloads bulk** equivalentes; API fica para fase 2 |

---

## 7. Próximos passos (fora do escopo desta entrega)

Caso o Chairman aprove a direção:

1. Implementar clientes das APIs sem-auth: PNCP (consulta + cache) e ingestão dos bulks
   CEIS/CNEP/CEPIM.
2. Definir e codar o predicate set `sanction_check_v1` (substituindo o padrão de
   `stubPass`) no `mcp-server` e no `pilot-gateway`.
3. `configure_use_case` na testnet para o `use_case_id` novo.
4. Rodar um caso real E2E: resultado PNCP → predicados → `register_attestation` na
   testnet → `verify_attestation` por terceiro.
5. Substituir, em paralelo, a lista BCB hardcoded de UC-1 P4 pela lista oficial BCB e
   elevar UC-1 P1 a CNPJ verificado via BrasilAPI.
6. Onda 2: `overpricing_v1` com o motor estatístico.

---

## Anexo — fontes citadas

- `00-INBOX/Oraculo_Anticorrupcao_Requisitos_v2.pdf` — seções 4 (indicadores) e 5 (catálogo de fontes).
- `00-INBOX/Oraculo_Anticorrupcao_PRD_v1.pdf` — 4 famílias de indicadores, 23 RFs.
- `contracts/anticorruption-attestation/src/lib.rs` — `register_attestation`, `configure_use_case`.
- `mcp-server/src/predicates/sets/{bank_change_v1,payment_doc_v1}.ts` — predicados stub.
- `pilot-gateway/src/lib/predicates.ts` — `evaluateBankChg`, lista ISPB hardcoded (linhas 3-57).
- `DPO2U/06-Memory/Strategic/2026-05-15-total-audit-consolidated.md` — DEBT-007.
- Verificações ao vivo 2026-05-20: BrasilAPI CNPJ (✅ JSON sem auth), PNCP `api-docs` (✅ HTTP 200).
