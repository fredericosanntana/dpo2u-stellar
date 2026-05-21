# Piloto de Dados Reais — Execução dos Use Cases `sanction_check_v1` e `overpricing_v1`

> **Relatório de execução** — roda os dois use cases nativos de dados abertos sobre
> dados públicos reais, coleta alertas de irregularidade e os atesta on-chain na
> testnet Stellar.
>
> - **Data:** 2026-05-21
> - **Artefato do run:** `docs/demos/runs/2026-05-21-real-pilot.json`
> - **Requisito de aceite:** encontrar alertas no processo — **✅ ATINGIDO**
>   (203 alertas de sanção + 906 alertas de sobrepreço, sobre dados reais).

---

## 1. Contexto

O documento `docs/2026-05-20-avaliacao-apis-publicas-piloto-real.md` recomendou dois use
cases nativos de dados abertos para tirar o piloto do `dpo2u-stellar` dos dados
sintéticos (DEBT-007). Este relatório registra a **execução** dos dois — detecção sobre
dados públicos reais e atestação on-chain — conforme pedido do Chairman.

O fluxo executado:

```
APIs públicas (sem auth)  →  predicados  →  vereditos  →  ALERTAS  →  atestação testnet
   CEIS/CNEP/CEPIM            evaluate()     PASS/FAIL/      203+906     register_attestation
   Compras.gov.br             (gateway)      REVIEW          alertas     (contrato CC4TJ…)
```

---

## 2. O que foi construído e executado

| Componente | Arquivo |
|---|---|
| Ingestão de sanções (CEIS/CNEP/CEPIM) | `pilot-gateway/src/real-pilot/sources/sanctions.ts` |
| Cliente Compras.gov.br (preços + fornecedores) | `pilot-gateway/src/real-pilot/sources/comprasgov.ts` |
| Estatística robusta (Z-modificado, cesta trimada) | `pilot-gateway/src/real-pilot/stats.ts` |
| Avaliadores dos use cases | `pilot-gateway/src/lib/predicates.ts` (`evaluateSanctionCheck`, `evaluateOverpricing`) |
| PredicateSets canônicos | `mcp-server/src/predicates/sets/{sanction_check_v1,overpricing_v1}.ts` |
| Runner E2E | `pilot-gateway/scripts/run-real-pilot.ts` |
| Atestação on-chain | `pilot-gateway/scripts/attest-alerts.ts` |

O serviço `pilot-gateway` (container `dpo2u-pilot-gateway`) foi **reconstruído e
reativado** com os dois use cases novos no `evaluate()` — verificado healthy, sem
regressão de `bank_chg`.

---

## 3. Fontes de dados reais

| Fonte | Endpoint | Auth | Resultado no run |
|---|---|---|---|
| **CEIS** — inidôneas e suspensas | `portaltransparencia.gov.br/download-de-dados/ceis` | Sem (User-Agent de navegador) | 13.676 PJs (snapshot 20260520) |
| **CNEP** — punidas Lei 12.846 | `…/download-de-dados/cnep` | Sem | 1.613 PJs (20260520) |
| **CEPIM** — entidades impedidas | `…/download-de-dados/cepim` | Sem | 3.562 PJs (20260518) |
| **Compras.gov.br** — preços praticados | `dadosabertos.compras.gov.br/modulo-pesquisa-preco/1_consultarMaterial` | Sem | 14.417 registros reais, 1.787 fornecedores distintos |

> **Nota:** o PNCP direto (`pncp.gov.br/api/consulta`) ficou inacessível neste ambiente
> (toda query de dados expira). A API Compras.gov.br — que também serve dados PNCP da
> Lei 14.133 — foi a substituta confirmada. Um único endpoint (`consultarMaterial`)
> alimenta os dois use cases: traz `precoUnitario` (sobrepreço) **e** `niFornecedor`
> (sanção).

---

## 4. Resultados — alertas reais encontrados (requisito de aceite)

### 4.1 `sanction_check_v1` — fornecedor sancionado em contratação pública

**203 alertas** sobre 1.787 fornecedores reais distintos:

- **28 `FAIL`** — fornecedor com sanção **vigente** no CEIS na data da compra.
- **175 `REVIEW`** — fornecedor consta no CEIS/CNEP/CEPIM mas a sanção não está
  vigente na data da compra (expirada ou posterior) — ainda assim digno de revisão.

Exemplos atestados (ver §5):

- **DISTRIBUIDORA DE MEDICAMENTOS BACKES LTDA** (CNPJ 25.279.552/0001-01) — venceu
  compra do *Fundo Municipal de Saúde de Vassouras/RJ* enquanto sob
  *"Impedimento/proibição de contratar com prazo determinado"* no CEIS. Veredito `FAIL`.
- **ILG COMERCIAL LTDA** (CNPJ 20.657.155/0001-02) — venceu compra da *Prefeitura de
  Mercedes/PR* com impedimento vigente no CEIS. Veredito `FAIL`.

### 4.2 `overpricing_v1` — sobrepreço estatístico em item de contratação

**906 alertas** `FAIL` — preço unitário é outlier estatístico (Z-modificado > 3,5)
contra a cesta de preços do mesmo item. A cesta passa por filtro de escala plausível
(`[mediana/20, mediana×20]`) para separar **erro de unidade/digitação** (vira `REVIEW`)
de **sobrepreço real** (vira `FAIL`) — 4 grupos foram descartados por escala.

Exemplos atestados:

- **ACICLOVIR pomada oftálmica** (CATMAT 268373) — *Prefeitura de Boa Vista/RR* pagou
  **R$ 45,00** com mediana de mercado **R$ 2,48** — **1.715% acima**, Z-modificado 136.
- **CIMETIDINA 200 mg** (CATMAT 267627) — *Prefeitura de Francisco Santos/PI* pagou
  **R$ 7,22** com mediana **R$ 0,3661** — **1.872% acima**, Z-modificado 85.
- **AMPICILINA + sulbactam** (CATMAT 270556) — *IBAMA* pagou **R$ 104,00** com
  mediana **R$ 6,09** — **1.608% acima**, Z-modificado 73.

---

## 5. Atestação on-chain — testnet Stellar

Contrato `anticorruption-attestation`:
`CC4TJGDRWZOPGBWOOHBJF3N2VKUQRNIW6C6PTYHD7ZI3D42GBQRRZHM5` (testnet).

### 5.1 Configuração dos use cases (admin `dpo2u-deployer`)

| Operação | Tx |
|---|---|
| `configure_use_case sanction_check_v1` | [`37cce618…`](https://stellar.expert/explorer/testnet/tx/37cce6188520d4271770a35419c2bfa16f6b2b8b8e8e224fbef2bd91cae6040b) |
| `configure_use_case overpricing_v1` | [`eceec1c9…`](https://stellar.expert/explorer/testnet/tx/eceec1c9d210865dbc2703d036285b71c82a4ba415782bb8f5eb3229322764d3) |
| `authorize_submitter` (gateway-signer) | [`1b106fd1…`](https://stellar.expert/explorer/testnet/tx/1b106fd1061700311c7c81c06ebbcbd022f5ba26528dace5adc5cf61127d4968) |

### 5.2 Alertas atestados (`register_attestation`, submitter `gateway-signer`)

6 alertas representativos selados on-chain — **todos verificados** via
`verify_attestation`:

| # | Use case | Veredito | Sujeito | Tx |
|---|---|---|---|---|
| 1 | sanction_check_v1 | FAIL | DISTRIBUIDORA DE MEDICAMENTOS BACKES | [`ee417591…`](https://stellar.expert/explorer/testnet/tx/ee417591759d78e1d1df5b6f32e5bb56ec408b716e1bfe7d39a258827329cfef) |
| 2 | sanction_check_v1 | FAIL | ILG COMERCIAL LTDA | [`8948bc06…`](https://stellar.expert/explorer/testnet/tx/8948bc065b5cffdb4d225270220f1dfedd421bb275d7f4881bcf4fd8d704e024) |
| 3 | sanction_check_v1 | REVIEW | DISTRIMED COMERCIO DE MEDICAMENTOS | [`5ca45373…`](https://stellar.expert/explorer/testnet/tx/5ca45373d4c4c06f4880b8700140cdfd2fad2621d5dc27dafdac874ebbe47278) |
| 4 | overpricing_v1 | FAIL | ACICLOVIR — Boa Vista/RR | [`d6c8bbe8…`](https://stellar.expert/explorer/testnet/tx/d6c8bbe8d076c54a52b6442643bca7bf027d1717e320e1954b0e9422dc8f9a61) |
| 5 | overpricing_v1 | FAIL | CIMETIDINA — Francisco Santos/PI | [`cc6becff…`](https://stellar.expert/explorer/testnet/tx/cc6becfff2af0755aeea9d7c11a084a7fd74051b5213041f351731753a392ef6) |
| 6 | overpricing_v1 | FAIL | AMPICILINA — IBAMA | [`c992a412…`](https://stellar.expert/explorer/testnet/tx/c992a4128df7ab8cee93b30bef71d46e3d99fa8c527814343dd98e5e9d481a14) |

### 5.3 Como qualquer auditor verifica (trustless, sem credencial)

```bash
stellar contract invoke --network testnet \
  --id CC4TJGDRWZOPGBWOOHBJF3N2VKUQRNIW6C6PTYHD7ZI3D42GBQRRZHM5 \
  --source <qualquer-conta> -- verify_attestation \
  --use_case_id sanction_check_v1 \
  --evidence_hash <evidence_hash_hex do artefato>
# → {"verdict":"Fail","predicate_set":"sanction_check_v1","predicate_version":1,...}
```

O `evidence_hash` é determinístico — `sha256(canonicalJson(evidence))`. Qualquer um
recomputa a partir da evidência no artefato e confere o registro on-chain.

---

## 6. Limitações (honestidade do piloto)

1. **`overpricing_v1` prioriza, não tipifica.** Os 906 `FAIL` são *candidatos* para
   triagem do auditor (modelo do Oráculo: "prioriza, não tipifica"). A cesta agrupa por
   `(CATMAT, unidade de fornecimento, capacidade)` e descarta preços fora de 20× da
   mediana; ainda assim, variação de embalagem/quantidade dentro da faixa pode inflar a
   contagem. Refinamento recomendado: normalizar preço por capacidade e cruzar com o
   teto regulatório CMED (medicamentos) / SINAPI (obras).
2. **`sanction_check_v1` e a abrangência da sanção.** O alerta `FAIL` indica CNPJ com
   sanção CEIS vigente na data da compra. O **escopo do impedimento** (se alcança o
   órgão contratante) deve ser confirmado pelo auditor — o oráculo sinaliza, não decide.
3. **PNCP direto indisponível** neste ambiente — usou-se a API Compras.gov.br
   (cobertura federal + entes que publicam via Compras.gov.br). Cobertura nacional
   plena exige o PNCP estável.
4. **Atestação via `stellar` CLI.** A selagem on-chain foi feita com a identidade
   autorizada `gateway-signer` via `stellar contract invoke` — o **mesmo** call que o
   `StellarDriver` do gateway faz internamente. O gateway HTTP está reativado com o
   código novo; exercitar o `POST /api/v1/attestation/submit` pela camada de auth exige
   a API key (JWT) do piloto, que é segredo gerido por SOPS.

---

## 7. Outros use cases identificados

Mapeados às 4 famílias de indicadores do Oráculo Anticorrupção. Os marcados ✅ rodam
sobre as **mesmas APIs sem-auth já integradas**.

| Use case proposto | Família | Sinal | Fontes | Viável sem-auth |
|---|---|---|---|---|
| `winner_rotation_v1` — rodízio de vencedores | 4.1 conluio | Mesmo grupo de empresas alterna vencedor em ≥3 certames do mesmo órgão | Compras.gov.br (resultados) | ✅ |
| `supplier_concentration_v1` — concentração de fornecedor | 4.1 | Mesmo CNPJ vence parcela dominante das compras de um órgão pequeno | Compras.gov.br | ✅ |
| `price_ceiling_v1` — teto regulatório | 4.2 sobrepreço | Preço acima do PMVG/CMED (medicamento) ou SINAPI+BDI (obra) | CMED + SINAPI (downloads) | ✅ |
| `collusion_partners_v1` — sócios em comum | 4.1 | Licitantes concorrentes compartilham sócio (CPF) | CNPJ RFB bulk (sócios) | ✅ (exige bulk 85 GB) |
| `cadastral_change_v1` — troca de QSA pré-licitação | 4.3 | Quadro societário muda na janela do edital | CNPJ RFB (snapshots mensais) | ✅ |
| `reactivation_v1` — reativação súbita | 4.3 | Empresa inativa/suspensa é reativada e vence licitação em ≤180 dias | CNPJ RFB (situação cadastral) | ✅ |
| `electoral_donation_v1` — doação convergente | 4.1 | Concorrentes doaram ao mesmo candidato/partido | TSE Dados Abertos × Compras.gov.br | ✅ |
| `divergent_payee_v1` — favorecido divergente | 4.4 pagamento | CNPJ que recebe ordem bancária ≠ CNPJ contratado | Portal da Transparência (Ordens Bancárias) | ❌ exige token Gov.br (fase 2) |

**Recomendação de onda seguinte:** `price_ceiling_v1` (extensão determinística do
`overpricing_v1`, fecha a família 4.2) e `winner_rotation_v1` (conluio sem precisar do
bulk CNPJ).

---

## 8. Artefatos

- Relatório: este arquivo.
- Artefato do run (JSON, alertas + atestações): `docs/demos/runs/2026-05-21-real-pilot.json`.
- Código: `pilot-gateway/src/real-pilot/`, `pilot-gateway/scripts/{run-real-pilot,attest-alerts}.ts`,
  `pilot-gateway/src/lib/predicates.ts`, `mcp-server/src/predicates/sets/`.
- Avaliação de fontes que originou os use cases: `docs/2026-05-20-avaliacao-apis-publicas-piloto-real.md`.
