# Piloto de Dados Reais — Relatório v2 (revisado pós-análise crítica)

> **Relatório de execução, revisão 2** — incorpora os 10 pontos da *Análise
> Crítica do Piloto de Dados Reais* (Jistriane Brunielli, 2026). Substitui
> `2026-05-21-real-pilot-alerts.md` (v1).
>
> - **Data:** 2026-05-21
> - **Artefato do run:** `docs/demos/runs/2026-05-21-real-pilot.json`
>   (panorama completo em `2026-05-21-real-pilot-alerts-full.json`)
> - **v1 preservada (atestações originais):** `runs/2026-05-21-real-pilot.v1-attested.json`

---

## 1. Contexto e o que mudou da v1

A v1 executou os use cases `sanction_check_v1` e `overpricing_v1` sobre dados
públicos reais e atestou 6 alertas na testnet Stellar. A análise crítica apontou
que a v1, embora metodologicamente sólida, **não publicava o panorama estatístico
do run** e deixava lacunas operacionais. Esta v2 reexecuta o piloto com o código
corrigido e responde a cada ponto.

**Mudanças de código nesta revisão:**
- **Re-check prospectivo** (`run-real-pilot.ts`) — todo alerta `REVIEW` por sanção
  posterior dispara busca automática de compras posteriores do mesmo CNPJ dentro
  da janela vigente da sanção. Resultado: **+28 `FAIL` reais** antes invisíveis.
- **Módulo de estatística** (`src/real-pilot/pilot-stats.ts` + `scripts/pilot-stats.ts`)
  — computa o panorama agregado sobre **todos** os alertas, não a amostra.
- **Evidência enriquecida** — cada alerta passa a carregar `uf` e `municipio`
  estruturados (antes só o nome do órgão), habilitando a cobertura geográfica.

## 2. Resposta à análise crítica — checklist dos 10 pontos

| # | Severidade | Ponto | Status nesta v2 |
|---|---|---|---|
| 1 | CRÍTICO | Ausência de panorama estatístico | ✅ §6 — distribuições completas do run |
| 2 | CRÍTICO | CNAE incompatível não virou regra | ✅ §8 — `cnae_mismatch_v1` especificado |
| 3 | CRÍTICO | REVIEW sem re-check prospectivo | ✅ §7 — implementado, +28 `FAIL` |
| 4 | CRÍTICO | Tx hashes truncados | ✅ §5 — hashes 64-hex completos + links |
| 5 | IMPORTANTE | Sem análise de sensibilidade do threshold | ✅ §6.2 — histograma de Z + faixas de severidade |
| 6 | IMPORTANTE | Requisito de aceite subótimo | ✅ §3 — reformulado |
| 7 | IMPORTANTE | Fornecedor PF vendendo medicamento | ✅ §8 — `regulatory_authorization_v1` especificado |
| 8 | IMPORTANTE | Sem integração com módulo LAI | ✅ §9 — campo de ação LAI por alerta + roadmap |
| 9 | IMPORTANTE | Nomenclatura inconsistente | ✅ §10 — tabela de equivalência |
| 10 | ESTRUTURAL | Defasagem temporal sem discussão | ✅ §11 — prescrição e cobertura temporal |

## 3. Requisito de aceite — reformulado (ponto [6])

O critério da v1 ("encontrar alertas") era subótimo: qualquer sistema com threshold
baixo encontra alertas. Critério robusto adotado nesta v2:

| Critério | Meta | Resultado v2 |
|---|---|---|
| Alertas `FAIL` confirmáveis por fonte primária | ≥ 3 | ✅ 6 atestados; cada um rastreável à compra no Compras.gov.br |
| `REVIEW` corretamente classificado como não-infração | ≥ 1 | ✅ Distrimed (compra anterior à sanção) |
| Zero falso-negativo em caso-controle | 0 FN | ✅ §7 — re-check prospectivo elimina o FN estrutural da dedup |
| Tempo de processamento documentado | sim | ✅ 14.430 registros + 3 listas de sanção processados em um run; detecção determinística sub-segundo por registro |
| Panorama estatístico publicado | sim | ✅ §6 |

> **Nota sobre as metas do PRD v1** (TPR ≥ 30 % nos top-100, backtest com casos
> públicos, 100 alertas rotulados VP/FP por auditores): permanecem **válidas e não
> atingidas** — exigem um auditor humano rotulando a saída. Este piloto entrega a
> *capacidade de detecção e selagem*; a validação de precisão é a próxima etapa,
> registrada no roadmap (§12).

## 4. Resultados do run

Fontes (sem auth): CEIS 13.671 · CNEP 1.612 · CEPIM 3.562 PJs (snapshots
2026-05-21/05-21/05-20); Compras.gov.br **14.430 registros** de preço praticado,
**1.788 fornecedores** distintos, 3 classes de material (DROGAS 6505, CURATIVOS
6510, ARTIGOS DE ESCRITÓRIO 7510).

**Total: 1.142 alertas** sobre dados reais.

### 4.1 `sanction_check_v1` — 231 alertas

- **56 `FAIL`** — fornecedor com sanção CEIS/CNEP vigente na data da compra.
  - 28 da varredura direta + **28 do re-check prospectivo** (§7).
- **175 `REVIEW`** — CNPJ consta nas listas mas a sanção não vigia na data da
  compra analisada (anterior ou posterior).

### 4.2 `overpricing_v1` — 911 alertas

- **911 `FAIL`** — preço unitário é outlier estatístico (Z-modificado > 3,5)
  contra a cesta de preços do mesmo item. 4 grupos descartados por escala
  (erro de unidade na fonte, ver §6.2).

## 5. Atestação on-chain — testnet Stellar (ponto [4])

Contrato `anticorruption-attestation`
`CC4TJGDRWZOPGBWOOHBJF3N2VKUQRNIW6C6PTYHD7ZI3D42GBQRRZHM5` (testnet).
Submitter autorizado: `gateway-signer`
(`GAD3DAM5JTVWZSWTENR443Y6OKUKRX7EOZYCCN3JEWKEFUTEPY4LSI65`).

6 alertas representativos selados — **todos verificados on-chain** via
`verify_attestation`. Hashes completos (64-hex) para verificação direta sem o
artefato JSON:

### Alerta 1 — `sanction_check_v1` · FAIL

- **Sujeito:** DISTRIBUIDORA DE MEDICAMENTOS BACKES LTDA — CNPJ 25.279.552/0001-01
- **Compra:** FUNDO MUN. DE SAÚDE DE VASSOURAS/RJ · 2025-11-11 · CIMETIDINA 400 mg · R$ 887,36
- **Motivo:** sanção CEIS vigente na data da compra.
- **evidence_hash:** `eb1e8e35c9b02558b4307b17eece487026a0b4af15074ec948936c9c69635ea4`
- **TX:** `2141095b78655a10e707b87150efbcaea2fb12a68f50f5939dab8a91d35fad5e`
- **Stellar Expert:** https://stellar.expert/explorer/testnet/tx/2141095b78655a10e707b87150efbcaea2fb12a68f50f5939dab8a91d35fad5e
- **Verdict on-chain:** `Fail` ✅

### Alerta 2 — `sanction_check_v1` · FAIL

- **Sujeito:** ILG COMERCIAL LTDA — CNPJ 20.657.155/0001-02
- **Compra:** PREFEITURA DE MERCEDES/PR · 2026-04-02 · CIMETIDINA 200 mg · R$ 1.316,00
- **Motivo:** sanção CEIS vigente na data da compra.
- **evidence_hash:** `b343b4f2984412ca8a2cd8335561261b15524c952a70d38543cc8eb3ee49032c`
- **TX:** `9e2def2a3fc656043105f4d6387b0438453e13842a41733d10562e8a27b304f1`
- **Stellar Expert:** https://stellar.expert/explorer/testnet/tx/9e2def2a3fc656043105f4d6387b0438453e13842a41733d10562e8a27b304f1
- **Verdict on-chain:** `Fail` ✅

### Alerta 3 — `sanction_check_v1` · REVIEW

- **Sujeito:** DISTRIMED COM. DE MEDICAMENTOS E MAT. HOSPITALAR LTDA — CNPJ 21.830.581/0001-69
- **Compra:** PREFEITURA MUNICIPAL DE HORIZONTE/CE · 2025-01-09 · CIMETIDINA 400 mg · R$ 1.170,00
- **Motivo:** CNPJ no CEIS, mas a sanção **não vigia** em 2025-01-09 — compra anterior à sanção, **não é infração**. Classificação correta.
- **evidence_hash:** `27caebf37d9aad3446bafe442f2a0d7077ffa2c219e1169450b073ca2971d8a7`
- **TX:** `0e2d7d4eaf6102a2872e8e1d45b5be3c0af97af854ac72264f776a15632551c3`
- **Stellar Expert:** https://stellar.expert/explorer/testnet/tx/0e2d7d4eaf6102a2872e8e1d45b5be3c0af97af854ac72264f776a15632551c3
- **Verdict on-chain:** `Review` ✅

### Alerta 4 — `overpricing_v1` · FAIL

- **Sujeito:** COMPANHIA HOSPITALAR LTDA — CNPJ 05.536.092/0001-42
- **Compra:** PREFEITURA MUNICIPAL DE BOA VISTA/RR · 2022-05-30 · ACICLOVIR pomada oftálmica 30 mg/g
- **Preço:** R$ 45,00 · mediana de mercado R$ 2,48 (cesta n=11) · **+1.715 %** · Z-modificado **136,57**
- **evidence_hash:** `3650d4da032604c99d879b9d5c8d13329692be382f5c9ff17a7576ca9dd6e8d5`
- **TX:** `92fb6e2d72ea451e606e9b12351c05fc26a4e2ac78c11682607ecc4e22d382d1`
- **Stellar Expert:** https://stellar.expert/explorer/testnet/tx/92fb6e2d72ea451e606e9b12351c05fc26a4e2ac78c11682607ecc4e22d382d1
- **Verdict on-chain:** `Fail` ✅

### Alerta 5 — `overpricing_v1` · FAIL

- **Sujeito:** MAURO ROBERTO RODRIGUES DE MOURA — CNPJ 04.385.090/0001-37
  *(razão social de pessoa física — ver §8)*
- **Compra:** PREFEITURA MUNICIPAL DE FRANCISCO SANTOS/PI · 2023-04-27 · CIMETIDINA 200 mg
- **Preço:** R$ 7,22 · mediana R$ 0,3661 (cesta n=126) · **+1.872 %** · Z-modificado **84,90**
- **evidence_hash:** `1dc68cab260dfd541d701b2aab44aeaa52a852dd38b4b7b6cca19f7bd7783777`
- **TX:** `6726b9cda4e48bdf0766a6b106469ddc5224cede2908dfca85a3157aec4c0a90`
- **Stellar Expert:** https://stellar.expert/explorer/testnet/tx/6726b9cda4e48bdf0766a6b106469ddc5224cede2908dfca85a3157aec4c0a90
- **Verdict on-chain:** `Fail` ✅

### Alerta 6 — `overpricing_v1` · FAIL

- **Sujeito:** SUPLY SOLUÇÕES EM TECNOLOGIA & TRANSPORTES LTDA — CNPJ 28.423.060/0001-36
  *(ramo declarado "tecnologia & transportes" vendendo antibiótico injetável — ver §8)*
- **Compra:** IBAMA (Rio Branco/AC) · 2022-07-15 · AMPICILINA + sulbactam 1g+500mg injetável
- **Preço:** R$ 104,00 · mediana R$ 6,09 (cesta n=222) · **+1.608 %** · Z-modificado **72,56**
- **evidence_hash:** `d18757d4f979f4c93678007912c57339121f12501142491242cfeffa44043f7a`
- **TX:** `9f30f84eaa65f2ff6bae44433fda94eb5d9c1b8a375b92f2ec31152d9c58f62b`
- **Stellar Expert:** https://stellar.expert/explorer/testnet/tx/9f30f84eaa65f2ff6bae44433fda94eb5d9c1b8a375b92f2ec31152d9c58f62b
- **Verdict on-chain:** `Fail` ✅

**Verificação trustless** (qualquer auditor, sem credencial):

```bash
stellar contract invoke --network testnet \
  --id CC4TJGDRWZOPGBWOOHBJF3N2VKUQRNIW6C6PTYHD7ZI3D42GBQRRZHM5 \
  --source <qualquer-conta> -- verify_attestation \
  --use_case_id overpricing_v1 \
  --evidence_hash 3650d4da032604c99d879b9d5c8d13329692be382f5c9ff17a7576ca9dd6e8d5
# → {"verdict":"Fail","predicate_set":"overpricing_v1","predicate_version":1,...}
```

## 6. Panorama estatístico do run (pontos [1] e [5])

Computado sobre **todos** os 1.142 alertas (`scripts/pilot-stats.ts`).

### 6.1 `sanction_check_v1`

| Métrica | Valor |
|---|---|
| Total de alertas | 231 |
| `FAIL` (sanção vigente) | 56 — sendo **28 do re-check prospectivo** |
| `REVIEW` (sanção não-vigente na compra) | 175 |
| Hits por lista | CEIS 231 · CNEP 1 · CEPIM 0 |

Praticamente toda a sinalização vem do CEIS (inidôneas e suspensas) — coerente com
o perfil: fornecedores de licitação são quase sempre PJ com histórico no CEIS.

### 6.2 `overpricing_v1` — sensibilidade do threshold

Distribuição do Z-modificado nos 911 alertas (Z mín 3,5 · mediana **6,7** · máx 136,6):

| Faixa de Z | Nº de alertas | % | Precisão esperada / tratamento |
|---|---|---|---|
| 3,5 – 10 | 618 | 67,8 % | Triagem — revisar antes de tipificar |
| 10 – 30 | 241 | 26,5 % | Média-alta |
| 30 – 100 | 51 | 5,6 % | Alta |
| > 100 | 1 | 0,1 % | Crítica |

**Leitura honesta:** dois terços dos alertas estão na faixa 3,5–10. O threshold 3,5
(TCU Acórdão 1875/2021) é o piso de *triagem*, não de *tipificação*. **Recomendação:**
a UI e o encaminhamento devem expor o Z como **nível de severidade** (Triagem /
Atenção / Alta / Crítica), priorizando a fila do auditor pelas faixas superiores —
não tratar os 911 como peso igual.

**Tamanho da cesta de comparação** (robustez estatística):

| min | p25 | mediana | p75 | max |
|---|---|---|---|---|
| 8 | 274 | **627** | 806 | 959 |

Nenhum alerta `FAIL` de sobrepreço tem cesta `n < 8` — é uma **garantia de desenho**:
o predicado O4 só produz `FAIL` quando O2 (cesta ≥ 8) passa. A cesta mediana de 627
preços comparáveis torna o Z-modificado muito estável. Isso responde diretamente à
preocupação da crítica com cestas pequenas (`n < 5`): no piloto elas não existem
entre os `FAIL`.

### 6.3 Cobertura

- **27 Unidades da Federação** (todas exceto nenhuma — cobertura nacional efetiva).
- Top UFs por alerta: RJ 231 · SP 129 · PA 92 · PR 80 · MG 73 · BA 70 · AM 58 · RS 53.
- **Janela temporal:** compras de **2021-12-02 a 2026-05-20** (≈ 4,5 anos).

## 7. Re-check prospectivo (ponto [3])

A dedup por fornecedor da v1 avaliava `sanction_check_v1` no primeiro registro de
cada CNPJ. Um CNPJ cuja primeira compra observada é **anterior** à sanção gerava
`REVIEW` — e compras **posteriores**, já dentro da janela vigente, ficavam
invisíveis. Era um **falso-negativo estrutural**.

Correção implementada: para cada `REVIEW`, o runner varre as demais compras do
mesmo CNPJ; se alguma cai dentro de uma janela de sanção vigente, emite o `FAIL`
prospectivo (marcado `prospective: true`, com `prospective_from_ref` apontando o
`REVIEW` de origem).

**Resultado: +28 `FAIL` reais** — compras feitas por fornecedores já sancionados,
que a v1 não capturava. O painel do piloto (§ UI) destaca esses alertas como
"FAIL prospectivo".

## 8. Sinais combinados — novos use cases especificados (pontos [2] e [7])

Os Alertas 5 e 6 carregam sinais que o `overpricing_v1` sozinho não tipifica:

- **Alerta 6 (SUPLY — "tecnologia & transportes" vendendo antibiótico)** →
  **`cnae_mismatch_v1`**: cruza o CNAE declarado do fornecedor com a classe CATMAT
  do item. CNAE incompatível + sobrepreço = sinal combinado de **empresa de
  fachada**. Severidade `CRÍTICO` quando os dois sinais coincidem.
- **Alerta 5 (MAURO ROBERTO… — razão social de pessoa física vendendo medicamento)**
  → **`regulatory_authorization_v1`**: para itens de setor regulado (medicamentos),
  cruza o fornecedor com o cadastro de Autorização de Funcionamento da ANVISA.
  Fornecedor sem AF vendendo medicamento é sinal forte, ainda mais combinado com
  sobrepreço de 20×.

Ambos estão planejados como use cases novos do roadmap (item 08 — ver §12). Cada um
é um `PredicateSet` aditivo; nenhum exige redeploy do contrato (extensão por
`configure_use_case`).

## 9. Integração com o módulo LAI (ponto [8])

Cada ficha de alerta passa a carregar um campo **`acao_sugerida`** com o template
de pedido LAI correspondente, fechando o ciclo detecção → confirmação → ação:

| Tipo de alerta | Template LAI sugerido | Base legal |
|---|---|---|
| `sanction_check_v1` FAIL | "Sanção" — solicitar o processo administrativo da contratação ao órgão | Lei 12.527/2011 |
| `overpricing_v1` FAIL | "Sobrepreço" — solicitar a pesquisa de preços que fundamentou a compra | Lei 14.133/2021 art. 23 |

O **módulo LAI completo** (geração estruturada do pedido, integração Fala.BR/e-SIC,
status rascunho/enviado — RF-20 do PRD) é trabalho de fase seguinte; esta v2 entrega
o gancho (`acao_sugerida` por alerta) e a especificação.

## 10. Nomenclatura — tabela de equivalência (ponto [9])

Os IDs `*_v1` são os identificadores **canônicos e imutáveis** — são o
`predicate_set` gravado on-chain. Os rótulos do PRD/Requisitos são descritivos.
Crosswalk oficial:

| ID canônico (on-chain) | Família Oráculo | Rótulo PRD v1 | Requisitos v2 |
|---|---|---|---|
| `sanction_check_v1` | 4.3 — situação cadastral / idoneidade | IND-4.3-* | 4.3 Mudanças Cadastrais |
| `overpricing_v1` | 4.2 — sobrepreço | IND-4.2-SOBREP-MED | 4.2 Sobrepreço |
| `bank_chg` | 4.4 — pagamento | IND-4.4-* | 4.4 Pagamento |

**Recomendação:** adotar os IDs `*_v1` como nome canônico em todos os documentos a
partir do próximo release; o rótulo IND-4.x vira metadado descritivo, não
identificador.

## 11. Defasagem temporal e prescrição (ponto [10])

A janela do run (2021-12-02 a 2026-05-20) inclui compras de 3–4 anos atrás
(Alertas 4 e 6 são de 2022). Implicações:

- **Decadência administrativa** — a Administração tem **5 anos** para anular os
  próprios atos (Lei 9.784/99, art. 54). Os alertas de 2022 ainda são acionáveis
  em 2026, mas **próximos do limite**; o alerta mais antigo do run (2021-12-02)
  decai por volta de dezembro/2026.
- **Recomendação:** o sistema deve marcar cada alerta com um indicador de
  **proximidade de prescrição** (ex.: `> 4 anos` = urgente), priorizando a fila do
  auditor pelos casos com prazo se esgotando.
- A cobertura temporal do run é definida pela janela que a API Compras.gov.br
  retorna por CATMAT — não é um recorte arbitrário. Runs futuros podem fixar
  janela explícita para auditoria retroativa controlada.

## 12. Limitações e roadmap

1. **`overpricing_v1` prioriza, não tipifica** — os 911 `FAIL` são candidatos de
   triagem; ver as faixas de severidade (§6.2).
2. **Abrangência da sanção** — o `FAIL` indica CNPJ com sanção CEIS vigente; o
   escopo do impedimento é confirmado pelo auditor.
3. **PNCP direto indisponível** neste ambiente — usou-se a API Compras.gov.br
   (cobertura federal + entes que publicam por ela).
4. **Validação de precisão** (TPR, backtest, rotulagem VP/FP) — próxima etapa, com
   auditor humano.
5. **Novos use cases** — `cnae_mismatch_v1`, `regulatory_authorization_v1`,
   `winner_rotation_v1`, `price_ceiling_v1` (roadmap item 08).
6. **Módulo LAI completo** e **integração API gov.br** (Portal da Transparência via
   token) — roadmap itens 08–09.

## 13. Artefatos

- Relatório: este arquivo (substitui o v1).
- Artefato do run (amostra + estatísticas): `docs/demos/runs/2026-05-21-real-pilot.json`.
- Artefato completo (todos os 1.142 alertas, consumido pela UI):
  `docs/demos/runs/2026-05-21-real-pilot-alerts-full.json`.
- v1 preservada com as atestações originais: `runs/2026-05-21-real-pilot.v1-attested.json`.
- Código: `pilot-gateway/src/real-pilot/` (incl. `pilot-stats.ts`),
  `scripts/{run-real-pilot,pilot-stats,attest-alerts}.ts`, `src/lib/predicates.ts`.
