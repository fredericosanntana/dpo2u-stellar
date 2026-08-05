# Detecção Verificável de Irregularidades em Compras Públicas por Predicados Determinísticos com Ancoragem On-Chain: Reanálise Formal das Condicionais de *Fail* e Evidência Empírica do Piloto DPO2U

**Autor:** Frederico Santana (Founder & DPO, DPO2U) — Chairman
**Afiliação:** DPO2U — Governança, Privacidade e Compliance Verificável
**Data:** 10 de julho de 2026
**Versão:** 1.2 (corpus publicado consolidado · valores por veredito · **dano do sobrepreço quantificado**)
**Corpus e código de referência:** `dpo2u-stellar` (contrato Soroban) · `pilot-gateway` (motor de predicados) · artefatos de execução de 21/05/2026
**Contrato de atestação (testnet Stellar):** `CC4TJGDRWZOPGBWOOHBJF3N2VKUQRNIW6C6PTYHD7ZI3D42GBQRRZHM5`

---

## Resumo

Este artigo reanalisa formalmente as **condicionais de veredito adverso (*fail*)** dos contratos de conformidade do piloto anticorrupção da DPO2U e prova, passo a passo, a tese de que é possível **detectar irregularidades reais em compras públicas brasileiras, em escala nacional, exclusivamente sobre dados abertos, com um veredito reproduzível, conservador e ancorado de forma imutável e verificável por terceiros sem credencial**. Formaliza-se cada família de predicados como uma proposição lógico-matemática, distinguindo os três estados de veredito (`PASS`, `REVIEW`, `FAIL`) e o combinador que os agrega (`FAIL ≻ REVIEW ≻ PASS`). Demonstra-se que o veredito `FAIL` é, por construção, uma **conjunção** de (a) uma premissa normativa — a subsunção do fato a uma vedação legal específica — e (b) uma premissa fática — a satisfação, pelos dados públicos, da condição formalizada; e que o estado intermediário `REVIEW` funciona como amortecedor de especificidade que impede a fabricação de acusações sob incerteza. No plano estatístico, prova-se que o detector de sobrepreço emprega o *Z-score modificado* de Iglewicz–Hoaglin (baseado na MAD), robusto a *outliers* e aderente à jurisprudência do TCU (Acórdão 1875/2021; IN SEGES 65/2021), com limiar conservador. No plano de integridade, prova-se que a ancoragem *on-chain* fornece **evidência de não-adulteração, não-repúdio e verificabilidade pública sem custódia**, mantendo conformidade com a LGPD por não expor dado pessoal (apenas o hash SHA-256 da evidência). Aplicado a **14.430 registros reais** de compras públicas e às bases oficiais de sanção (CEIS/CNEP/CEPIM), o método produziu **1.273 alertas** cobrindo **27 unidades federativas**, dentre os quais **67 sanções vigentes confirmadas** (39 delas *prospectivas* — compras posteriores ao início da sanção), **911 anomalias de preço** (870 sobrepreços e 41 preços anomalamente baixos, ambos capturados por $|Z_m|$) e **50 empresas sob acordo de leniência ainda contratando ou recebendo recursos da União**. Quantificam-se os valores envolvidos onde a fonte os fornece: os contratos sob alerta de sanção somam **R$ 9,21 milhões** (**R$ 3,03 mi** em veredito adverso `FAIL`; **R$ 2,64 mi** no subconjunto prospectivo), e o sobrepreço produz **dano estimado ao erário de R$ 37,95 milhões** — com **piso defensável de R$ 16,37 milhões** sob o critério mais conservador (cesta ≥ 50 comparáveis e $Z_m$ ≥ 5,0). O dano é medido por $\max(0,(p-\tilde{x})\cdot q)$, de modo que os 41 alertas de preço anomalamente **baixo** contribuem **zero**, em vez de inflarem o total. A leniência permanece **declaradamente não quantificada**: a fonte não traz campo monetário, e nenhuma cifra é inferida onde o dado falta. Dez vereditos representativos foram selados na testnet Stellar e são verificáveis por qualquer auditor. Conclui-se que a arquitetura converte alegações de autoridade em **fatos reproduzíveis**, e discutem-se limitações e ameaças à validade.

**Palavras-chave:** compras públicas; anticorrupção; Z-score modificado; MAD; dados abertos; atestação verificável; blockchain; Soroban; LGPD; Lei 14.133/2021; Lei 12.846/2013; TCU.

---

## 1. Introdução

A fiscalização de compras públicas no Brasil opera sobre um paradoxo de transparência: os dados são majoritariamente **abertos** (Portal da Transparência, Compras.gov.br, PNCP) e, ainda assim, as irregularidades permanecem, na prática, **não-auditadas em escala**. O gargalo não é o acesso ao dado bruto, mas a ausência de um procedimento que, sobre esse dado, (i) produza um veredito **reproduzível** — que qualquer terceiro possa recomputar —, (ii) seja **conservador** — que não fabrique acusações onde a evidência é ambígua — e (iii) seja **inviolável** — que uma vez emitido não possa ser silenciosamente alterado ou negado.

Este trabalho reanalisa as **condicionais de *fail*** — a lógica exata que decide quando uma contratação é sinalizada como irregular — do motor de predicados da DPO2U, e as reformula como um sistema formal. O objetivo não é meramente descrever o software, mas **provar a tese** de que essas condicionais constituem um detector válido, e sustentar essa prova com a evidência empírica de uma execução real sobre dados públicos brasileiros.

A contribuição é tripla:

1. **Formalização das condicionais de *fail*** (Seção 4) como proposições lógico-matemáticas com semântica de três valores, tornando explícita a estrutura “norma ∧ fato ⇒ veredito”.
2. **Prova de validade por construção** (Seção 6): demonstra-se que o `FAIL` é conservador (alta especificidade projetada) e que cada veredito é ancorado a uma vedação legal e a uma evidência pública reproduzível.
3. **Evidência empírica e verificável** (Seção 5): resultados reais sobre 14.430 registros, com dez vereditos selados *on-chain* e conferíveis sem credencial.

## 2. Fundamentação e trabalhos relacionados

### 2.1 Marco normativo

- **Lei nº 14.133/2021 (Nova Lei de Licitações e Contratos).** Fundamenta a pesquisa de preços (art. 23), a cessão de crédito como hipótese lícita de divergência de favorecido (art. 134), o regime de sanções e impedimentos (arts. 155–156) e o recurso administrativo (art. 165).
- **Lei nº 12.846/2013 (Lei Anticorrupção).** Fundamenta o Cadastro Nacional de Empresas Punidas (CNEP) e os **acordos de leniência**, cuja vigência é o gatilho do use case `leniency_flag_v1`.
- **Cadastros de idoneidade da CGU.** CEIS (Cadastro de Empresas Inidôneas e Suspensas), CNEP e CEPIM (Entidades Privadas Sem Fins Lucrativos Impedidas) — bases públicas que materializam impedimentos de contratar/receber recursos federais.
- **Jurisprudência do TCU e IN SEGES nº 65/2021.** O **Acórdão TCU nº 1875/2021** consagra o uso de medidas estatísticas robustas (mediana e afastamento em relação a ela) para triagem de sobrepreço em cestas de preços — base direta do detector `overpricing_v1`.
- **Lei nº 13.709/2018 (LGPD).** Governa o tratamento de dado pessoal; determina o desenho *hash-only* da camada *on-chain* (Seção 4.5) e o mecanismo de eliminação (art. 18).

### 2.2 Método estatístico

O detector de sobrepreço adota o **Z-score modificado** de Iglewicz & Hoaglin (1993), definido sobre a **mediana** e a **MAD** (*Median Absolute Deviation*), estimadores de posição e escala com ponto de ruptura de 50% — isto é, resistentes a até metade dos dados contaminados. Isso é essencial num domínio onde os próprios *outliers* (sobrepreços) contaminam a amostra: um detector baseado em média e desvio-padrão seria arrastado pelos preços que pretende flagrar. O limiar canônico da literatura, |Zₘ| > 3,5, é o adotado (Seção 4.3).

### 2.3 Atestação verificável e ancoragem *on-chain*

A camada de integridade segue o padrão de **atestação verificável**: publica-se, num registro público *append-only*, o hash da evidência e o veredito, de modo que a prova de existência e de não-adulteração fique disponível a qualquer auditor. O contrato é implementado em **Soroban (Stellar)**; o desenho é deliberadamente **minimalista e sem PII** — nenhum dado pessoal, apenas o *digest* SHA-256 (Seção 4.5).

## 3. Tese e hipóteses

**Tese central (T).** *É possível detectar irregularidades reais em compras públicas brasileiras, em escala nacional e exclusivamente sobre dados abertos, emitindo um veredito (i) reproduzível por terceiros, (ii) conservador quanto a falsos positivos, e (iii) ancorado de forma imutável, verificável sem credencial e sem exposição de dado pessoal.*

A tese decompõe-se em quatro hipóteses verificáveis:

- **H₁ (Formalidade e conservadorismo).** As condicionais de *fail* podem ser expressas como proposições formais em que `FAIL` é uma conjunção de premissa normativa e premissa fática, e o estado `REVIEW` isola a incerteza — de modo que o sistema não emite acusação sob evidência ambígua.
- **H₂ (Robustez estatística).** O detector de sobrepreço, por usar mediana/MAD e limiar conservador, é robusto a *outliers* e separa erro de dado de sobrepreço genuíno.
- **H₃ (Integridade e verificabilidade).** A ancoragem *on-chain* garante não-adulteração, não-repúdio e verificação pública trustless, preservando a LGPD (sem PII on-chain).
- **H₄ (Materialidade empírica).** Aplicado a dados reais, o método produz achados **materiais e juridicamente acionáveis**, reproduzíveis a partir das fontes públicas.

## 4. Metodologia

### 4.1 Arquitetura

O sistema separa **avaliação** (off-chain) de **ancoragem** (on-chain):

1. **Ingestão.** Coleta de registros públicos de compras (Compras.gov.br/PNCP) e das bases de sanção/leniência (Portal da Transparência/CGU).
2. **Avaliação por predicados.** Um motor determinístico (`pilot-gateway`) aplica, a cada contratação, um conjunto de predicados por *use case*, produzindo um `PredicateBundle` com o veredito.
3. **Ancoragem.** Vereditos representativos são selados no contrato Soroban `AntiCorruptionAttestation` como `(use_case_id, evidence_hash) → {verdict, predicate_set, predicate_version, submitted_by, timestamp, metadata_hash}`.
4. **Verificação.** Qualquer terceiro recomputa o `evidence_hash` da evidência que lhe foi divulgada e consulta o contrato por simulação RPC (sem carteira, sem taxa).

### 4.2 Semântica de veredito

Cada *use case* é um conjunto de predicados $P = \{p_1, \dots, p_k\}$, cada $p_i$ retornando um valor em $V = \{\textsf{PASS}, \textsf{REVIEW}, \textsf{FAIL}\}$. O veredito do *use case* é dado pelo **combinador** $\Phi$:

$$
\Phi(P) =
\begin{cases}
\textsf{FAIL} & \text{se } \exists\, p_i \in P : p_i = \textsf{FAIL}\\
\textsf{REVIEW} & \text{se } \nexists\, \textsf{FAIL} \ \wedge\ \exists\, p_i : p_i = \textsf{REVIEW}\\
\textsf{PASS} & \text{caso contrário}
\end{cases}
$$

Isto é, precedência estrita $\textsf{FAIL} \succ \textsf{REVIEW} \succ \textsf{PASS}$: **um único** predicado adverso derruba o *bundle*; a ausência de qualquer adverso, com ao menos uma incerteza, resulta em `REVIEW`; só a ausência total de adversos e incertezas gera `PASS`. Não há pesos nem quórum. Esta escolha maximiza **sensibilidade** na triagem (nada adverso é diluído por maioria), transferindo o controle de **especificidade** para a construção interna de cada $p_i$ (Seção 6.1).

**Convenção de orientação.** Na família de fiscalização (`sanction`, `overpricing`, `leniency`), `FAIL` significa **irregularidade detectada**. Nos *use cases* de instrução processual (`bid_protest_overpricing_v1`, `tcu_representation_v1`), a orientação inverte-se por desenho — `PASS` confirma o **mérito** do sobrepreço a ser peticionado —, e cada `set_id` deve ser lido com sua própria orientação. Este artigo foca a família de fiscalização, sobre a qual repousa a evidência empírica.

### 4.3 Formalização das condicionais de *fail* — família de fiscalização

Seja $\operatorname{norm}(c)$ a normalização de um CNPJ $c$ (remoção de não-dígitos) e $|\cdot|$ o comprimento em dígitos.

**(A) `sanction_check_v1` — fornecedor sancionado.**
Predicados: $o_1$ (identificabilidade) e $o_2, o_3, o_4$ (CEIS, CNEP, CEPIM). Seja $H_L(c)$ o conjunto de registros do fornecedor $c$ na lista $L$, e $d$ a data da compra. A vigência de uma sanção $s$ na data $d$ é:

$$
\operatorname{active}(s, d) \;=\; \neg\big(s.\text{início} \ne \varnothing \wedge d < s.\text{início}\big) \;\wedge\; \neg\big(s.\text{fim} \ne \varnothing \wedge d > s.\text{fim}\big)
$$

com comparação lexicográfica de datas ISO `YYYY-MM-DD` e **$d \leftarrow$ hoje** quando a data da compra é ausente (o teste degrada para “vigente hoje?”). O predicado por lista:

$$
o_L(c,d) =
\begin{cases}
\textsf{PASS} & H_L(c) = \varnothing\\
\textsf{FAIL} & \exists\, s \in H_L(c): \operatorname{active}(s,d)\\
\textsf{REVIEW} & H_L(c) \ne \varnothing \ \wedge\ \forall s \in H_L(c): \neg\operatorname{active}(s,d)\\
\textsf{REVIEW} & \text{índice indisponível}
\end{cases}
$$

Portanto o *use case* resulta em `FAIL` **se e somente se** o CNPJ consta em ao menos uma das listas **com sanção vigente na data da compra** (e a contratação é identificável). Constar sem vigência gera `REVIEW`, não acusação.

**(A′) *Fail* prospectivo.** A primeira passada deduplica por fornecedor; se a compra amostrada precede o início da sanção (⇒ `REVIEW`), a deduplicação poderia **ocultar** compras posteriores do mesmo CNPJ que caem na janela vigente. O *re-check prospectivo* reindexação todas as compras por CNPJ e, para cada `REVIEW`, busca outra compra $r$ do mesmo fornecedor tal que $\exists s: \operatorname{active}(s, r.\text{data})$; havendo, reavalia e só promove a `FAIL` se o veredito confirmar. Formalmente, um alerta é **prospectivo** sse

$$
\exists\, r \ne r_0 \ \text{do mesmo CNPJ}:\ r.\text{data} \ge s.\text{início} \ \wedge\ \operatorname{active}(s, r.\text{data}).
$$

Isto corrige um viés de subnotificação, não infla o resultado: os 28 prospectivos são compras **reais** posteriores ao início da sanção (Seção 5).

**(B) `overpricing_v1` — sobrepreço estatístico.**
Seja a cesta $B$ dos preços comparáveis do item (agrupados pela tripla **(CATMAT, unidade de fornecimento, capacidade)**), $\tilde{x} = \operatorname{med}(B)$ a mediana, e a **MAD** $= \operatorname{med}(\{|x_i - \tilde{x}|\})$. O **Z-modificado**:

$$
Z_m(x) =
\begin{cases}
\dfrac{0{,}6745\,(x - \tilde{x})}{\text{MAD}} & \text{MAD} > 0 \quad (\text{escala } \textsf{mad})\\[2ex]
\dfrac{x - \tilde{x}}{1{,}253314\;\overline{|x-\tilde x|}} & \text{MAD}=0,\ \overline{|x-\tilde x|}>0 \quad (\textsf{meanAbsDev})\\[2ex]
0 & \text{dispersão nula} \quad (\textsf{none})
\end{cases}
$$

A constante $0{,}6745 = \Phi^{-1}(0{,}75)$ torna $\text{MAD}/0{,}6745$ um estimador consistente de $\sigma$ sob normalidade (equivalente a $\sigma \approx 1{,}4826\cdot\text{MAD}$); o fator de retaguarda $1{,}253314 = \sqrt{\pi/2}$ é o consistente análogo para o desvio absoluto médio quando a MAD colapsa. O **filtro de escala plausível** separa erro de dado de sobrepreço:

$$
\operatorname{inScale}(x) \;=\; \frac{\tilde{x}}{20} \le x \le 20\,\tilde{x}.
$$

Os quatro predicados: $o_1$ (item e preço identificáveis), $o_2$ ($|B| \ge 8$, senão `REVIEW`), $o_3$ ($\operatorname{inScale}$, senão `REVIEW` — “provável erro de unidade/digitação”), e o decisivo

$$
o_4(x) =
\begin{cases}
\textsf{FAIL} & |B|\ge 8 \ \wedge\ \operatorname{inScale}(x) \ \wedge\ \text{escala}\ne\textsf{none}\ \wedge\ |Z_m(x)| > 3{,}5\\
\textsf{PASS} & |B|\ge 8 \ \wedge\ \operatorname{inScale}(x) \ \wedge\ |Z_m(x)| \le 3{,}5\\
\textsf{REVIEW} & \text{demais casos (cesta insuficiente, fora de escala, dispersão nula)}
\end{cases}
$$

Logo, `FAIL` de sobrepreço **exige cumulativamente**: cesta robusta ($\ge 8$), preço na escala plausível (afasta artefato de dado) e afastamento estatístico $|Z_m| > 3{,}5$. O limiar 3,5 é conservador; um preço a $\ge 3{,}5$ MADs da mediana, numa cesta nacional do mesmo item, é *outlier* por qualquer critério robusto.

**(C) `leniency_flag_v1` — acordo de leniência vigente.**
Seja $\mathcal{L}(c)$ o conjunto de acordos do fornecedor. Predicados $l_1$ (identificabilidade), $l_2$ (cadastro limpo: `PASS` se $\mathcal{L}=\varnothing$, senão `REVIEW`) e o decisivo:

$$
l_3 =
\begin{cases}
\textsf{FAIL} & \exists\, a \in \mathcal{L}(c): a.\text{vigente}\\
\textsf{PASS} & \text{nenhum acordo vigente}
\end{cases}
$$

`FAIL` ⇔ existe acordo de leniência **vigente** (em execução) — situação em que a contratação/recebimento pela União é juridicamente sensível sob a Lei 12.846.

As condicionais de *fail* das demais famílias (troca bancária `bank_chg`; favorecido divergente `divergent_payee_v1`; rodízio de vencedores `winner_rotation_v1`; instrução processual `bid_protest`/`tcu`; e a camada B2B de proteção de dados) estão catalogadas no **Apêndice A**.

### 4.4 Fontes de dados

| Fonte | Papel | Volume (2026-05-21) |
|---|---|---|
| Compras.gov.br | Registros de compra e preços | **14.430** registros; **1.788** fornecedores distintos |
| CEIS (CGU) | Empresas inidôneas/suspensas | **13.671** |
| CNEP (CGU) | Empresas punidas (Lei 12.846) | **1.612** |
| CEPIM (CGU) | Entidades sem fins lucrativos impedidas | **3.562** |
| Cadastro de leniência (CGU) | Acordos (Lei 12.846) | **120** CNPJs |
| Classes CATMAT varridas | Medicamentos (6505), curativos (6510), material de escritório (7510) | 3 classes |

### 4.5 Camada *on-chain*: integridade sem PII

O contrato `AntiCorruptionAttestation` (Soroban) é **minimalista, imutável e sem PII**. Propriedades provadas por leitura do código-fonte:

- **Chave = `(use_case_id, evidence_hash)`**, valor = `{verdict, predicate_set, predicate_version, submitted_by, timestamp, metadata_hash}`. O `evidence_hash` é o **SHA-256 (32 bytes)** do payload de evidência, computado **off-chain**; **o payload em claro nunca sobe** — apenas o *digest*.
- ***Append-only* e idempotente.** `register_attestation` aborta com `AttestationExists` se a chave já existe; não há função de *update* nem *delete* de atestação. Uma vez gravado, o registro é permanente.
- **Autorização dupla.** Exige assinatura do *submitter* (`require_auth`) **e** presença numa *allowlist* gerida pelo admin; o `use_case_id` precisa estar ativo.
- **Ancoragem do predicado pelo admin.** O `predicate_set`/`predicate_version` gravados **não vêm do chamador** — são lidos da `UseCaseConfig` fixada pelo admin. O *submitter* não pode falsificar contra qual conjunto de regras (e versão) o veredito foi produzido.
- **Verificação trustless.** Um auditor recomputa o SHA-256 da evidência divulgada e chama `verify_attestation(use_case_id, evidence_hash)` por **simulação RPC** — sem carteira, sem taxa, sem estado do lado da DPO2U —, comparando o record retornado (veredito, *timestamp*, *submitter*). Conferível também no `stellar.expert`.
- **LGPD por desenho.** Como o *on-chain* nunca conteve PII (só o hash), o direito ao apagamento (art. 18) incide sobre o documento **off-chain**; o apagamento é registrado por uma atestação `erasure_v1` **adicional** — por adição, não por remoção —, preservando a trilha *append-only*. Equivale a publicar um SHA-256 em diário oficial: prova a existência sem revelar o conteúdo.

## 5. Resultados

Todos os números abaixo foram **recomputados de forma independente** a partir dos arrays crus dos artefatos de execução e reproduzem exatamente os blocos `summary`/`statistics` gravados.

**Corpus.** Esta versão consolida o **corpus publicado** — o painel efetivamente exposto ao público em `/pilot/alertas` —, composto pela execução de 21/05/2026 (1.262 alertas) **mais** a extensão nacional via PNCP (Sprint M), que acrescenta 11 alertas de sanção. Total: **1.273 alertas**. A versão 1.0 deste artigo tratava a execução de 21/05 como corpus primário e relatava a extensão à parte; a consolidação aqui elimina a divergência entre o artigo e o painel. Onde a distinção importa, os subtotais de cada origem são explicitados.

### 5.1 Panorama

| *Use case* | Alertas | `FAIL` | `REVIEW` | Prospectivos | CNPJs distintos |
|---|---:|---:|---:|---:|---:|
| `sanction_check_v1` | 242 | **67** | 175 | **39** | 192 |
| `overpricing_v1` | 911 | **911** | 0 | n/a | 400 |
| `leniency_flag_v1` | 120 | **97** | 23 | **50**¹ | 120 |
| **Total** | **1.273** | **1.075** | **198** | — | — |

¹ Em leniência, “prospectivo” denota `still_contracting` (ainda contratando/recebendo da União).

Decomposição da família de sanção por origem: **231** alertas da execução de 21/05 (56 `FAIL`, 175 `REVIEW`, 28 prospectivos) e **11** da extensão PNCP (todos `FAIL` e todos prospectivos — vencedoras sancionadas em D+0). A soma dos prospectivos, 28 + 11 = **39**, e a dos `FAIL`, 56 + 11 = **67**.

> **Nota de escopo.** Os arrays de alertas materializam **apenas** `FAIL` e `REVIEW`. Um `PASS` (fornecedor limpo, preço na faixa) **não é emitido como registro** — logo não se computa uma taxa-base de `PASS`. Esta é uma limitação metodológica assumida (Seção 7), coerente com o princípio de **não fabricação de dados**: atesta-se a realidade observada, não um denominador inferido.

### 5.2 Sanção

Das 242 sinalizações, **67 são `FAIL`** — CNPJ com sanção **vigente na data da compra** — e 175 são `REVIEW` (consta em cadastro, sem vigência na data). Dos 67 `FAIL`, **39 são prospectivos**: compras realizadas **após** o início da sanção, recuperadas pelo *re-check* que corrige o viés de deduplicação (Seção 4.3-A′) e, no caso dos 11 alertas PNCP, por varredura em D+0. Distribuição por lista (execução de 21/05): 231 em CEIS, 1 também em CNEP, 0 em CEPIM.

### 5.3 Sobrepreço

Os 911 `FAIL` distribuem-se por afastamento estatístico:

| Faixa $|Z_m|$ | Alertas | Leitura |
|---|---:|---|
| 3,5 – 10 | 618 | *outlier* moderado |
| 10 – 30 | 241 | sobrepreço acentuado |
| 30 – 100 | 51 | sobrepreço grave |
| > 100 | 1 | anomalia extrema |

$Z_m$ mediano **6,72**; máximo **136,57**. Cesta comparável: mínimo 8, mediana **627**, máximo 959 preços por item — isto é, cada veredito é medido contra centenas de compras reais do mesmo item/unidade. Distintos: 400 CNPJs, 55 CATMATs. Dos 911, 41 têm $Z_m$ **negativo** (preço muito **abaixo** da mediana — também anômalo por $|Z_m|$), e 870 são sobrepreço propriamente dito. O recomputo do $Z_m$ reproduz o veredito do predicado em 100% dos 911 casos.

### 5.4 Leniência

Das 120 sinalizações, **97 são `FAIL`** (acordo vigente/“Em Execução”) e 23 `REVIEW` (acordo concluído). **50 fornecedores permanecem contratando ou recebendo recursos da União** apesar do acordo; destes, **37** acumulam acordo vigente **e** presença ativa em contratação/pagamento. Os agrupamentos econômicos predominantes (derivados por razão social, aproximados) concentram-se no complexo Odebrecht/Novonor e coligadas (≈36 CNPJs), além de Andrade Gutierrez, JBS/J&F, OAS, Camargo Corrêa, Engevix e outros.

### 5.5 Valores envolvidos — e os limites do que se pode afirmar

A pergunta natural — *quanto dinheiro público está sob alerta?* — admite resposta **parcial**, e é metodologicamente decisivo declarar onde ela termina. Das três famílias, **apenas a de sanção carrega valor de contrato** (campo `value`, presente em 242/242 registros). As outras duas não o carregam, e nenhum artifício os recupera.

**(a) Sanção — calculável.**

| Veredito | Alertas | Valor somado | Mediana | Maior item |
|---|---:|---:|---:|---:|
| `FAIL` | 67 | **R$ 3.028.868,23** | R$ 9.063,60 | R$ 633.929,00 |
| `REVIEW` | 175 | **R$ 6.176.816,20** | R$ 3.224,00 | R$ 2.829.945,00 |
| **Total** | **242** | **R$ 9.205.684,43** | — | — |

Dos `FAIL`, os **39 prospectivos** — compras feitas *depois* de a sanção já vigorar, o subconjunto de maior gravidade — somam **R$ 2.638.872,83**. A extensão PNCP, isolada, responde por **R$ 1.392.982,97** (Seção 5.7).

Uma inversão aparente merece leitura: o `REVIEW` soma **mais que o dobro** do `FAIL` (R$ 6,18 mi contra R$ 3,03 mi), e concentra o maior item isolado do corpus (R$ 2,83 mi). Isso **não é anomalia — é o amortecedor operando**. O `REVIEW` retém sob incerteza justamente os casos de maior materialidade, em vez de convertê-los em acusação. É evidência empírica direta de H₁ (Seção 6.1): o custo do conservadorismo é assumido no lado do valor, não no lado da verdade.

**(b) Sobrepreço — o dano ao erário, quantificado.**

O artefato de 21/05 registrava `unit_price` e a mediana da cesta, mas **não carregava a quantidade adquirida** — e sem ela não há dano em reais, pois o dano é (preço − referência) × **quantidade**. A quantidade, contudo, **nunca esteve ausente da fonte**: o cliente da API Compras.gov.br (`sources/comprasgov.ts`) sempre a leu, e a família de sanção já a usava para compor o valor do contrato. Ela simplesmente **não era propagada** até a evidência do alerta de sobrepreço. Era perda de pipeline, não limitação de dado.

Corrigida a propagação, o detector foi **reexecutado em 13/07/2026** sobre o **mesmo universo de itens** (os 55 CATMATs do corpus original, fixados explicitamente para garantir comparabilidade). A execução **reproduz o corpus** de forma quase exata, o que valida a comparação:

| Métrica | 21/05 (original) | 13/07 (reexecução) |
|---|---:|---:|
| Alertas de sobrepreço | 911 | 917 |
| $Z_m$ mediano / máximo | 6,72 / 136,57 | 6,6 / 136,6 |
| Faixa $Z_m$ 30–100 / > 100 | 51 / 1 | 51 / 1 |
| Cesta comparável (máx.) | 959 | 959 |
| Alertas de preço **baixo** (dano nulo) | 41 | **41** |
| UFs | 27 | 27 |

**Dano estimado: R$ 37.946.630,06**, sobre **876 alertas** com preço acima da mediana. Os **41** alertas de preço anomalamente baixo produzem **dano zero** por construção — o operador $\max(0,\cdot)$ os anula em vez de somar seu módulo, o que inflaria o total com um valor que não é dano ao erário. O valor total contratado nos itens sob alerta é de **R$ 56.544.191,08**; o dano corresponde a **67,1%** desse montante.

**Banda de robustez.** Uma cifra única esconderia a heterogeneidade das cestas. Apresenta-se, portanto, o dano sob critérios progressivamente mais estritos:

| Critério | Alertas | Dano estimado |
|---|---:|---:|
| Cesta ≥ 8, $Z_m$ > 3,5 (limiar do artigo) | 876 | **R$ 37,95 mi** |
| Cesta ≥ 20 comparáveis | 832 | R$ 28,32 mi |
| $Z_m$ ≥ 5,0 (limiar de instrução processual) | 609 | R$ 30,07 mi |
| Cesta ≥ 50 **e** $Z_m$ ≥ 5,0 (mais conservador) | 537 | **R$ 16,37 mi** |

O **piso defensável** — apenas itens medidos contra ao menos 50 preços comparáveis e com afastamento acima do limiar processual — permanece em **R$ 16,4 milhões**. O achado, portanto, **não depende das cestas magras**: ele sobrevive ao critério mais rigoroso.

Indicadores de robustez do estimador: mediana da cesta **596** comparáveis; o alerta de maior dano responde por 13,9% do total e os três maiores por 33,5%; a contratação mais pesada responde por apenas **3,1%**; o dano distribui-se por **404 fornecedores distintos** em **27 UFs**. (Para contraste metodológico, uma execução paralela sobre o PNCP — Seção 7 — produziu cestas de mediana 8, com 98% do dano concentrado em cestas magras e 77% numa única contratação; foi **descartada** por fragilidade estatística.)

Magnitude relativa do afastamento, no corpus original:

| Estatística | Valor |
|---|---:|
| Sobrepreço mediano (sobre a mediana da cesta) | **+266%** |
| Percentil 75 / 90 / máximo | +603% / +1.164% / +1.891% |

Concentração: **RJ** (200 alertas, sobrepreço mediano +522%), SP (105, +357%), PA (81, +193%). Por órgão, o **Comando do Exército** lidera (102 alertas). Os itens de maior dano são insumos de saúde de alto giro — bota de Unna, curativo cutâneo, ácido acetilsalicílico —, cuja lesão decorre menos do sobrepreço unitário do que do **volume** adquirido: um item a R$ 52,15 contra mediana de R$ 22,11, multiplicado por 175.800 unidades, produz sozinho R$ 5,28 milhões.

**(c) Leniência — não calculável.** Os 120 registros não possuem campo monetário algum. O achado é **de fato** (a empresa segue contratando apesar do acordo), não de valor.

**Síntese.** Duas das três famílias são agora quantificadas:

| Família | Alertas | Valor / dano |
|---|---:|---|
| Sanção | 242 | **R$ 9,21 mi** em contratos sob alerta (`FAIL` R$ 3,03 mi; prospectivos R$ 2,64 mi) |
| Sobrepreço | 917 | **R$ 37,95 mi** de dano estimado (piso conservador: R$ 16,37 mi) |
| Leniência | 120 | **não quantificável** — sem campo monetário na fonte |

A leniência permanece **declaradamente não quantificada**. Não se estima o que a fonte não fornece: aplica-se ao plano contábil o mesmo princípio que rege o `REVIEW` no plano lógico — **não se preenche a lacuna, declara-se a lacuna**.

### 5.6 Cobertura

Cobertura **nacional**: 27 UFs (26 estados + DF); janela temporal de **2021-12-02 a 2026-05-20**; maiores incidências em RJ (231), SP (129), PA (92), PR (80), MG (73), BA (70).

### 5.7 Ancoragem *on-chain*

Dez vereditos representativos foram selados na testnet Stellar (contrato `CC4TJGD…RRZHM5`): 3 de sanção (2 `FAIL`, 1 `REVIEW`), 3 de sobrepreço (`FAIL`) e 4 de leniência (`FAIL`). Todas as dez transações possuem `tx_hash` conferível em `https://stellar.expert/explorer/testnet/tx/<hash>` (Apêndice B). Nenhuma expõe nome de pessoa física — os payloads de pessoas físicas foram redigidos em conformidade com a LGPD, sem afetar o hash-como-prova (que jamais conteve o nome).

### 5.8 Extensão PNCP (Sprint M)

Uma varredura nacional via PNCP adicionou **11 alertas de sanção** (vencedoras sancionadas em D+0, qualquer plataforma de pregão), todos `FAIL` e todos prospectivos, totalizando **R$ 1.392.982,97 em valor em risco**, janela de 90 dias. Esses 11 alertas estão **incorporados ao corpus** desta versão (Seção 5.1) e são a base do caso de instrução processual (impugnação/representação) de ≈ R$ 1,39 milhão.

## 6. Discussão — prova da tese, *por a + b*

### 6.1 H₁ — as condicionais de *fail* são formais e conservadoras

A prova de H₁ decorre da estrutura das condicionais formalizadas na Seção 4.3. Todo veredito `FAIL` da família de fiscalização tem a forma canônica

$$
\textsf{FAIL} \;\Longleftrightarrow\; \underbrace{\operatorname{ident}(x)}_{\text{(b) identificabilidade}} \;\wedge\; \underbrace{\neg\,\operatorname{exculp}(x)}_{\text{(a) ausência de excludente legal}} \;\wedge\; \underbrace{\operatorname{sinal}(x)}_{\text{(a) subsunção à vedação}},
$$

onde cada conjunto de premissas se resolve em **(a)** uma norma e **(b)** um fato público:

- **Sanção.** (a) A vedação: contratar fornecedor sob sanção vigente (impedimento). (b) O fato: $\exists s \in H_L(c): \operatorname{active}(s, d)$. A conjunção com $\operatorname{active}(\cdot, d)$ **na data da compra** é a excludente que impede acusar por sanção posterior ou expirada — daí `REVIEW`, não `FAIL`, quando a vigência não coincide.
- **Sobrepreço.** (a) A vedação: preço acima do de mercado (art. 23 + Acórdão TCU 1875/2021). (b) O fato: $|Z_m|>3{,}5$ **numa cesta robusta e na escala plausível**. O predicado $o_3$ ($\operatorname{inScale}$) é a excludente que separa **erro de dado** (⇒ `REVIEW`) de **sobrepreço** (⇒ candidato a `FAIL`): sem ele, um valor total lançado no campo de unitário produziria falso positivo. É a materialização formal da premissa (b) “o dado é fidedigno”.
- **Leniência.** (a) A vedação: sensibilidade jurídica de recebimento por empresa sob acordo vigente (Lei 12.846). (b) O fato: $\exists a: a.\text{vigente}$.

O **conservadorismo** é uma propriedade **estrutural**, não um ajuste: o estado `REVIEW` intercepta toda ambiguidade (cadastro sem vigência; cesta insuficiente; preço fora de escala; índice indisponível). Como $\Phi$ só emite `FAIL` diante de um predicado inequivocamente adverso, e como toda incerteza é canalizada para `REVIEW`, **o sistema é incapaz, por construção, de converter incerteza em acusação**. Isso satisfaz H₁ e realiza o princípio de não fabricação de dados: a ferramenta atesta a realidade — inclusive quando a realidade é “não sei” (`REVIEW`).

### 6.2 H₂ — robustez estatística

A prova de H₂ é analítica. Mediana e MAD têm **ponto de ruptura de 50%**: metade da cesta pode ser arbitrariamente corrompida sem deslocar os estimadores. Num domínio em que os *outliers* são o próprio alvo, um detector baseado em média/desvio-padrão (ponto de ruptura $\to 0$) seria **inflado pelos sobrepreços que deveria flagrar**, subestimando o $Z$ e gerando **falsos negativos**. O $Z_m$ evita esse colapso. Empiricamente, a robustez se manifesta: a mediana da cesta é de 627 preços comparáveis, e o recomputo independente do $Z_m$ reproduziu o veredito em 100% dos 911 casos — o detector é **determinístico e auditável**. O limiar 3,5 (canônico de Iglewicz–Hoaglin) é ainda deliberadamente mais estrito nos *use cases* de instrução processual (5,0), evidenciando calibração consciente de especificidade por finalidade. A degradação graciosa (MAD → *meanAbsDev* → `REVIEW` em dispersão nula) impede divisão por zero e veredito espúrio.

### 6.3 H₃ — integridade e verificabilidade

A prova de H₃ decorre das propriedades do contrato (Seção 4.5), cada uma verificável no código-fonte:

- **Não-adulteração:** ausência de *update*/*delete* + idempotência por chave ⇒ o veredito, uma vez ancorado, é imutável no *ledger*.
- **Não-repúdio:** `require_auth` do *submitter* + *timestamp* de *ledger* ⇒ autoria e momento provados.
- **Integridade do critério:** `predicate_set`/`version` lidos da `UseCaseConfig` do admin (não do chamador) ⇒ o *submitter* não pode alegar avaliação sob regra diferente da vigente.
- **Verificabilidade trustless:** `verify_attestation` por simulação RPC ⇒ **qualquer** terceiro confere sem credencial, sem taxa e sem confiar na DPO2U; basta recomputar o SHA-256 da evidência.
- **Privacidade:** apenas o *digest* on-chain ⇒ conformidade LGPD; o apagamento é aditivo (`erasure_v1`), compatível com a imutabilidade.

A conjunção dessas propriedades converte o veredito de uma **alegação de autoridade** (“confie que analisamos”) num **fato reproduzível** (“recompute e verifique você mesmo”). É esse deslocamento epistêmico que sustenta a tese.

### 6.4 H₄ — materialidade empírica

A prova de H₄ são os resultados da Seção 5, todos reproduzíveis a partir de fontes públicas: **67 sanções vigentes** confirmadas — **39 delas prospectivas**, isto é, compras públicas realizadas **depois** de a empresa já estar sancionada, somando **R$ 2,64 milhões**; **911 anomalias de preço** com afastamento mediano de 6,7 MADs sobre cestas de centenas de preços (sobrepreço mediano de **+266%**); e **50 empresas sob acordo de leniência ainda contratando ou recebendo da União**. A materialidade é agora também **monetária onde a fonte permite medi-la**: **R$ 9,21 milhões** em contratos sob alerta de sanção e **R$ 37,95 milhões de dano estimado** por sobrepreço — piso de **R$ 16,37 milhões** sob o critério mais conservador (Seção 5.5). São achados **materiais** (envolvem recursos públicos e vedações legais específicas) e **acionáveis** (fundamentam pedidos de acesso à informação, impugnações, representações ao TCU). A cobertura de 27 UFs demonstra escala nacional. Registre-se que a materialidade **não é inflada**: onde o valor não existe na fonte, ele não é estimado (81% dos alertas), e o artigo o declara em vez de preenchê-lo.

### 6.5 Síntese: a tese, provada *por a + b*

Reunindo: H₁ estabelece que cada `FAIL` é **norma (a) ∧ fato (b)** e que a incerteza é isolada em `REVIEW` (portanto, conservador); H₂ estabelece que o núcleo estatístico é **robusto e determinístico**; H₃ estabelece que o veredito é **imutável, não-repudiável e verificável sem credencial, sem violar a LGPD**; H₄ estabelece que, na prática, o método **encontra irregularidades reais em escala nacional**. A conjunção $H_1 \wedge H_2 \wedge H_3 \wedge H_4$ é exatamente a tese T. $\blacksquare$

## 7. Limitações e ameaças à validade

- **Ausência de taxa-base de `PASS`.** Como `PASS` não é materializado, não se computam precisão/recall contra um *ground truth* — os resultados são de **triagem de alta sensibilidade**, não de julgamento de mérito. Cada `FAIL` é um **indício reproduzível**, não uma condenação.
- **Comparabilidade da cesta.** O agrupamento por (CATMAT, unidade, capacidade) é **nacional**, sem ajuste regional (logística, tributação) ou temporal (inflação intra-janela). Isso pode gerar `FAIL` explicáveis por fatores legítimos de mercado — mitigado pelo limiar conservador e pela ação sugerida de pedido de esclarecimento (LAI), não de sanção automática.
- **Instantâneo das bases.** CEIS/CNEP/CEPIM e o cadastro de leniência são *snapshots* datados; a vigência é aferida contra as datas disponíveis, e registros sem data são avaliados “na data de hoje”.
- **Leniência “ainda contratando”.** O indicador `still_contracting` é derivado da pegada em contratações/pagamentos públicos, não de um juízo sobre a licitude específica de cada contrato (acordos de leniência não impedem, per se, toda contratação).
- **Rede de teste.** A ancoragem foi feita na **testnet** Stellar; a migração para *mainnet* está condicionada a *gates* de governança. As propriedades de integridade são idênticas; muda a permanência econômica do *ledger*.
- **Escopo de itens.** Três classes CATMAT foram varridas; a generalização a todo o catálogo é trabalho futuro.
- **Convenção de hash.** A definição canônica única do payload de evidência (ordenação de chaves) convive com convenções distintas em diferentes gateways; recomenda-se fixar uma canonicalização determinística única (Seção 8).
- **Sensibilidade do dano à espessura da cesta.** O dano estimado (Seção 5.5) varia de **R$ 37,95 mi** (critério do artigo) a **R$ 16,37 mi** (cesta ≥ 50 e $Z_m$ ≥ 5,0) — uma banda de fator 2,3. Um quarto do dano do cenário amplo provém de 44 alertas com cesta inferior a 20 comparáveis, cuja mediana é menos confiável. A cifra **não é um valor liquidado**: é uma estimativa de triagem, cujo piso é o número defensável.
- **Uma fonte alternativa foi testada e descartada.** Executou-se, em paralelo, o detector sobre o **PNCP** (`run-overpricing-pncp.ts`, artefato `2026-07-13-overpricing-pncp-v2.json`). O resultado foi **rejeitado por fragilidade estatística**: 93% dos itens do PNCP não possuem código NCM, de modo que a cesta se forma por **descrição textual livre** e colapsa — mediana de **8** comparáveis, contra 596 no corpus CATMAT. Naquele run, **98% do dano** provinha de cestas com menos de 12 preços e **77% de uma única contratação**. Registra-se o descarte por transparência metodológica: a diferença entre as duas fontes **não está no método, e sim na existência de um identificador de catálogo** que torne a cesta comparável.
- **Reprodutibilidade da amostragem.** O catálogo CATMAT **muda entre execuções**: dois runs sucessivos com a mesma configuração escanearam 55 e 85 CATMATs alertantes, com apenas **2 em comum** — corpora não comparáveis. A reexecução de 13/07 fixou explicitamente os 55 CATMATs do corpus original (variável `PILOT_CATMATS`), sem o que a comparação seria inválida. Recomenda-se **fixar sempre o universo de itens** ao comparar execuções.

## 8. Conclusão e trabalhos futuros

Reanalisamos e formalizamos as condicionais de *fail* dos contratos do piloto anticorrupção da DPO2U e provamos, *por a + b*, a tese de que é possível **detectar irregularidades reais em compras públicas, em escala nacional, sobre dados abertos, com veredito reproduzível, conservador e ancorado de forma imutável e verificável sem credencial, preservando a LGPD**. O detector é, por construção, uma conjunção de norma e fato; seu núcleo estatístico é robusto (mediana/MAD, |Zₘ|>3,5); sua camada de integridade é *append-only*, trustless e *hash-only*. Empiricamente, produziu 1.273 achados materiais — incluindo 39 compras posteriores a sanções vigentes (R$ 2,64 milhões) e 50 empresas em leniência ainda contratando com a União — cobrindo 27 UFs, com dez vereditos selados on-chain e conferíveis por qualquer auditor. Os contratos sob alerta de sanção somam R$ 9,21 milhões, e o sobrepreço produz dano estimado de R$ 37,95 milhões (piso conservador de R$ 16,37 milhões). Para a leniência, a fonte não fornece valor, e o artigo **declara a lacuna em vez de estimá-la** — o mesmo princípio que rege o `REVIEW` no plano lógico, aplicado ao plano contábil.

**Trabalhos futuros:** (i) fixar uma canonicalização JSON determinística única do payload de evidência; (ii) ampliar a cesta com ajuste regional/temporal e expandir as classes CATMAT; (iii) materializar amostras de `PASS` para estimar precisão contra *ground truth* auditado; (iv) migrar a ancoragem para *mainnet* sob os *gates* de governança; (v) publicar um verificador de referência para reprodução independente ponta a ponta.

---

## Apêndice A — Catálogo formal das demais condicionais de *fail*

**`bank_chg` (troca de conta bancária de fornecedor — anti-BEC).** `FAIL` se qualquer: CNPJ do fornecedor ≠ titular da nova conta ($P_1$); canal ≠ `portal_oficial` ($P_2$); domínio do remetente ≠ domínio municipal esperado ($P_3$); ISPB ausente ($P_4$, ISPB fora do top-50 BCB ⇒ `REVIEW`); última troca há < 90 dias ($P_5$).

**`divergent_payee_v1` (favorecido divergente).** `FAIL` ⇔ favorecido da ordem bancária ≠ contratado (ambos CNPJ de 14 dígitos) **e** ausência de cessão de crédito registrada ($D_3$; a cessão, Lei 14.133 art. 134, é a excludente). Divergência com CNPJ ausente ⇒ `REVIEW`.

**`winner_rotation_v1` (rodízio de vencedores/conluio).** Com ≥ 3 certames: `FAIL` se o grupo captura ≥ 80% dos certames do órgão ($W_2$) **ou** se, capturando ≥ 80%, ≥ 2 membros alternam a vitória ($W_3$). Amostra insuficiente ⇒ `REVIEW`.

**`bid_protest_overpricing_v1` / `tcu_representation_v1` (instrução processual).** Orientação invertida: `PASS` de $b_2/t_2$ confirma sobrepreço com limiar **estrito** $|Z_m| > 5{,}0$; `FAIL` = abaixo do limiar (não sustenta a peça). Predicados adicionais aferem janela recursal (3 dias úteis, art. 165), prazo decadencial (≈5 anos), evidência pública dupla (gov.br + PNCP) e, no TCU, quantificação do dano $= \max(0, (x-\tilde{x})\cdot q)$.

**Camada B2B (proteção de dados).** `lgpd_compliance_v1`, `gdpr_compliance_v1` e congêneres usam o operador `controlResult`: controle presente ⇒ `PASS`; ausente ⇒ `FAIL` (com artigo — p.ex. LGPD art. 41 DPO, art. 38 RIPD; GDPR art. 30 RoPA, art. 33 notificação 72h); não informado ⇒ `REVIEW`. `managed_compliance_v1` gradua por *score*: ≥ 70 `PASS`, 50–69 `REVIEW`, < 50 `FAIL`. `zk_compliance_v1` exige verificação da prova ZK *on-chain* (`zk_verified = true` ⇒ `PASS`; `false` ⇒ `FAIL`).

## Apêndice B — Verificação *on-chain* (reprodução)

1. Obtenha a evidência divulgada do alerta (JSON).
2. Recompute `evidence_hash = SHA-256(payload)`.
3. Consulte `verify_attestation(use_case_id, evidence_hash)` no contrato `CC4TJGDRWZOPGBWOOHBJF3N2VKUQRNIW6C6PTYHD7ZI3D42GBQRRZHM5` via simulação RPC (sem carteira).
4. Confira o record retornado (`verdict`, `predicate_set`, `predicate_version`, `submitted_by`, `timestamp`).
5. Alternativamente, abra `https://stellar.expert/explorer/testnet/tx/<tx_hash>`.

Vereditos selados: sanção — `2141095b…` (FAIL), `9e2def2a…` (FAIL), `0e2d7d4e…` (REVIEW); sobrepreço — `92fb6e2d…`, `6726b9cd…`, `9f30f84e…` (FAIL); leniência — `b6f899ae…`, `314bea2b…`, `b99cb84d…`, `a276c0f0…` (FAIL).

## Referências (seleção)

- BRASIL. **Lei nº 14.133, de 1º de abril de 2021** (Licitações e Contratos Administrativos).
- BRASIL. **Lei nº 12.846, de 1º de agosto de 2013** (Lei Anticorrupção).
- BRASIL. **Lei nº 8.443, de 16 de julho de 1992** (Lei Orgânica do TCU).
- BRASIL. **Lei nº 13.709, de 14 de agosto de 2018** (LGPD).
- TRIBUNAL DE CONTAS DA UNIÃO. **Acórdão nº 1875/2021 – Plenário** (metodologia estatística de sobrepreço).
- SEGES/ME. **Instrução Normativa nº 65, de 7 de julho de 2021** (pesquisa de preços).
- IGLEWICZ, B.; HOAGLIN, D. C. **How to Detect and Handle Outliers.** ASQC Quality Press, 1993.
- CONTROLADORIA-GERAL DA UNIÃO. Portal da Transparência — bases CEIS, CNEP, CEPIM e acordos de leniência.

---

*Documento gerado a partir do código-fonte (`pilot-gateway`, `dpo2u-stellar`) e dos artefatos de execução de 21/05/2026; todos os números foram recomputados de forma independente e conferem com os agregados registrados. Dados pessoais de pessoas físicas foram redigidos em conformidade com a LGPD.*
