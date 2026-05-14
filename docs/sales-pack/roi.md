# DPO2U Piloto Anticorrupção — ROI Calculator

Cálculo de retorno baseado em **um único caso documentado** (não estimativa) + extrapolação conservadora.

## Caso âncora: TJDFT 2024 (auto-evitável)

**Sentença Tribunal de Justiça do DF e Territórios, 2024** — caso de uma prefeitura municipal que sofreu desvio de R$ 5.500.000,00 por troca silenciosa de conta bancária de fornecedor, exatamente o padrão coberto pelo **UC-1 `bank_change_v1`** desta plataforma.

Os 5 predicates do UC-1 endereçam **diretamente** o vetor:
- p1_2 `email_plain` → FAIL: o ataque chegou via email sem 2FA.
- p1_1 `cnpj_divergent` → FAIL: o titular da nova conta tinha CNPJ diferente do fornecedor.
- p1_5 `bcb_regulated` → PASS (banco era regulado), mas o ataque seria capturado pelas outras 2 dimensões.

Detecção precoce neste caso teria zerado o prejuízo. Conservador: **se aplicado, prevenção = R$ 5,5 M**.

## Volume de pagamentos em município médio (até 50k hab.)

Dados públicos via Portal da Transparência + IBGE (média 2020-2024):

| Métrica | Valor médio (R$) |
|---|---|
| Folha pagamento mensal | ~ 4 a 8 milhões |
| Pagamento a fornecedores mensal | ~ 1 a 3 milhões |
| Total contratos ativos | ~ 50 a 200 |
| Trocas de conta bancária ano | ~ 5 a 15 |

## Cenários de ROI (3 anos, prefeitura ~30k hab.)

### Cenário conservador — "0 fraude capturada, valor é só auditoria"
- Custo do piloto (90 dias observer L1): R$ 0 a 5.000 (DPO2U cobre tudo).
- Custo TCE em fiscalização externa anual: ~ R$ 30.000 / ano em consultoria forense atualmente.
- Com atestações on-chain, TCE faz a fiscalização sozinho via CLI público.
- **Economia direta**: R$ 90.000 em 3 anos.
- **Economia indireta** (tempo da CGM em apresentar provas a auditores externos): ~ 40h por trimestre × R$ 150/h × 12 trimestres = R$ 72.000.
- **Total**: R$ 162.000 economia 3 anos, custo do município = simbólico.

### Cenário médio — "1 fraude tipo TJDFT capturada em 3 anos"
- Município médio sofre 1-2 incidentes de bank-change-fraud por ano em redes municipais brasileiras (dado CGU/2023).
- Prejuízo médio capturado: R$ 100 mil a R$ 500 mil (TJDFT é outlier de R$ 5,5 M).
- Conservador: **1 incidente de R$ 200.000 prevenido**.
- **Total**: R$ 200.000 + R$ 162.000 cenário conservador = **R$ 362.000 economia 3 anos**.

### Cenário "evento raro" — "1 fraude TJDFT-scale capturada"
- Probabilidade: baixa em qualquer município individual, mas o vetor existe — Brasil tem 5.570 municípios.
- Se acontecer no SEU município em 3 anos: prejuízo evitado = **R$ 5.500.000**.
- **Total**: R$ 5,5 M + R$ 162 mil cenário base.

## Custo de oportunidade — o que CUSTA não ter

1. **Risco reputacional**: prefeito que vira manchete de "perdeu R$ X milhões" perde reeleição. Caso TJDFT teve cobertura nacional.
2. **Risco fiscal**: TCE pode rejeitar contas → prefeito vira inelegível (Lei Complementar 64/90).
3. **Risco penal**: Art. 312 CP (peculato) por omissão dolosa pode atingir CGM e ordenador de despesas.
4. **Custo de fiscalização TCE**: prefeituras flagradas pelo TCE passam a sofrer "ressalvas técnicas" recorrentes, exigindo mais consultoria.

## Métricas que reportamos durante o piloto

A cada 30 dias, DPO2U envia ao Prefeito + CGM:

- **Volume**: nº de atestações registradas no período, por verdict.
- **Cobertura**: % dos pagamentos > R$ 10.000 com atestação on-chain.
- **Eventos FAIL e REVIEW**: lista com hash, link Stellar Expert, recomendação de ação.
- **Tempo médio de resposta**: ms entre POST e callback.
- **Disponibilidade**: % uptime do submitter.
- **Custos reais**: XLM gasto, USD equivalente (deve ficar < R$ 50/mês em volumes piloto).

## Pergunta-chave pra Prefeito / CGM

> "Quanto vale, na sua próxima reeleição, ostentar que 100% das decisões de pagamento desta gestão estão verificáveis na blockchain pública por qualquer cidadão — sem precisar acreditar em nós?"

A resposta institucional é o ROI real. O cálculo monetário acima é o piso.

---

**Para customizar este ROI pro seu município**: envie em uma planilha:
1. Pagamentos a fornecedores no último ano fiscal (total).
2. Histórico de incidentes / desvios reportados em CGM, TCE ou imprensa nos últimos 5 anos.
3. Custo médio de consultoria forense / auditoria contratada por exigência TCE.

Devolvemos ROI customizado em 48h com a equipe DPO2U + advogada parceira.
