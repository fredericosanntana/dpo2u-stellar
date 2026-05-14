# Termo de Cooperação — Piloto Observer L1 (template)

> 📄 Este é um **template de carta de intenção** seguido de minuta de contrato. Customizado pelo time DPO2U + advogada parceira em até 2 sessões com o município. Versão final deste documento será gerada per-município em Sprint K.

---

## I. CARTA DE INTENÇÃO

Pela presente, a **Prefeitura Municipal de `[MUNICIPIO]`** ("Município"), por seu representante legal, e a **DPO2U Plataforma de Compliance LTDA** ("DPO2U"), CNPJ `[DPO2U_CNPJ]`, manifestam intenção mútua de celebrar **Termo de Cooperação Técnica** sem ônus financeiro recíproco, com o objetivo de validar conjuntamente a aplicação da plataforma **DPO2U Piloto Anticorrupção** sobre a rede pública Stellar Soroban (testnet inicialmente), em modo **Observador Level-1** por período de **90 dias úteis**.

**Status atual da plataforma**: contrato Soroban `CC4TJGDRWZOPGBWOOHBJF3N2VKUQRNIW6C6PTYHD7ZI3D42GBQRRZHM5` deployado em testnet (2026-05-12, verificável em https://stellar.expert/explorer/testnet/contract/CC4TJGDR…), com 141 testes unitários verdes cobrindo as 6 camadas (contrato Rust, predicate engine TypeScript, submissor Stellar, MCP tools, REST API, SDK auditor).

A carta de intenção não cria obrigação contratual; serve para demarcar a janela técnica de 2 semanas durante a qual ambas as partes:
1. Customizam a DPIA (Lei 13.709/2018) e o threat model.
2. Acordam o escopo técnico (use cases ativos, callback URL, política de retenção off-chain).
3. Definem indicadores de avaliação trimestral.

---

## II. MINUTA — TERMO DE COOPERAÇÃO TÉCNICA

### Cláusula 1 — Objeto
Cooperação técnica sem ônus para registro auditável de decisões de compliance em pagamentos públicos do Município, mediante uso da plataforma DPO2U sobre a rede Stellar (testnet durante o piloto, mainnet condicionado a auditoria externa pré-go-live).

### Cláusula 2 — Casos de uso cobertos
**UC-1 — Troca de conta bancária de fornecedor**: detecção e atestação de pedidos de alteração de dados bancários, aplicando 5 verificações determinísticas conforme PRD v0.2 §6, incluindo cruzamento de CNPJ contra Receita Federal e checagem de instituição financeira na lista regulada do Bacen.

**UC-2 — Conformidade documental de pagamento**: validação cruzada de NF + empenho + atesto + contrato com 6 verificações, incluindo consulta CEIS/CNEP via oracle Reflector (ou oracle DPO2U-owned como fallback).

### Cláusula 3 — Modo de operação
**Observer Level-1**: a plataforma registra atestações e emite alertas à Controladoria-Geral do Município. **A plataforma NÃO bloqueia, suspende, ou interfere de qualquer outra forma no fluxo financeiro do Município.** Decisões finais permanecem 100% sob responsabilidade dos agentes públicos municipais.

### Cláusula 4 — Dados pessoais
**Princípio fundamental**: nenhum dado pessoal — em texto claro ou identificável por correlação — é registrado on-chain. O registro on-chain contém exclusivamente:
1. SHA-256 do payload de evidência.
2. SHA-256 de metadados públicos (request ID, predicate set, versão, veredito, timestamp).
3. Endereço Stellar do submissor institucional DPO2U.
4. Veredito enumerado (PASS / FAIL / REVIEW).

O Município é Controlador (Art. 5º, VI LGPD); a DPO2U é Operadora (Art. 5º, VII LGPD). A DPIA específica deste piloto, contendo análise detalhada por categoria de titular, fica anexa como **Anexo I**.

### Cláusula 5 — Direitos do titular
A DPO2U se compromete a, em até 15 (quinze) dias do recebimento de solicitação de direito de titular encaminhada pelo DPO do Município:
- Confirmar a existência de atestação (verbal e por CLI público).
- Fornecer cópia da atestação on-chain.
- Registrar atestação corretiva ou de revogação se aplicável (Art. 18, IV e VI da LGPD).
- Coordenar com o Município o secure-erase de payloads off-chain associados.

### Cláusula 6 — Auditoria externa
O Município autoriza expressamente que TCE/TCU/CGU, advogados representantes de licitantes, jornalistas, e qualquer cidadão consultem **diretamente** o estado da blockchain Stellar para verificar atestações registradas, sem necessidade de envolver o Município ou a DPO2U na consulta. A CLI pública `dpo2u-attest verify` (disponível em https://github.com/fredericosanntana/dpo2u-stellar) e o explorador https://stellar.expert/explorer/testnet são as ferramentas oficiais.

### Cláusula 7 — Prazo
**90 (noventa) dias úteis** a contar da data de go-live técnico (data em que ambas as partes confirmam por escrito conclusão do setup integração). Renovação automática por novo período de 90 dias salvo manifestação contrária por qualquer das partes com 15 dias de antecedência.

### Cláusula 8 — Custos
**Sem ônus financeiro recíproco durante o piloto**. A DPO2U arca com:
- Hospedagem e operação da plataforma.
- Custos de transação na rede Stellar testnet (zero) e mainnet (estimado < R$ 100/mês).
- Auditoria externa de contrato pré-mainnet (estimada USD 15-30k).
- Suporte técnico 9x5 durante o piloto via canal definido.

O Município arca com:
- Tempo da equipe interna (CGM, IT, DPO).
- Eventual ajuste técnico em seu sistema financeiro para integração via API REST (esforço estimado: 1 a 3 dias-pessoa, single-shot).

### Cláusula 9 — Indicadores de avaliação
A cada 30 dias, relatório consolidado é enviado ao Prefeito e à CGM contendo:
- Volume de atestações registradas.
- Cobertura de pagamentos.
- Lista de FAILs e REVIEWs com recomendações.
- Tempo médio de resposta.
- Disponibilidade do serviço.
- Comparação com expectativa contratada.

Ao final dos 90 dias, **comitê paritário** (DPO+CGM municipal + DPO2U) avalia se o piloto deve evoluir para:
(a) **Observer L2** (bloqueio assistido, exige assinatura humana antes de pagamento com FAIL).
(b) **Mainnet** (registro em rede pública principal Stellar).
(c) **Encerramento honroso** com publicação conjunta dos aprendizados.

### Cláusula 10 — Confidencialidade
Dados e documentos compartilhados durante a integração técnica que não estejam destinados a atestação on-chain são tratados como confidenciais. Atestações on-chain são por natureza públicas. Nenhuma das partes divulgará detalhes deste piloto à imprensa sem consentimento mútuo expresso.

### Cláusula 11 — Rescisão
Qualquer das partes pode rescindir mediante notificação por escrito com 15 dias de antecedência, sem necessidade de motivação. Em caso de rescisão:
- Atestações já registradas on-chain permanecem (rede é imutável).
- Payloads off-chain são submetidos a secure-erase mediante solicitação do Município.
- Sumário final é enviado ao Prefeito e à CGM em até 30 dias.

### Cláusula 12 — Foro
Comarca do Município.

---

## ANEXOS (gerados em Sprint K, customizados por município)

- **Anexo I** — DPIA específica deste piloto, assinada por DPO Município + DPO2U + advogada externa parceira.
- **Anexo II** — Threat Model do escopo deste piloto, validado em workshop 2h.
- **Anexo III** — Acordo de Processamento de Dados (DPA) detalhando o papel Operador da DPO2U.
- **Anexo IV** — Plano de Resposta a Incidentes (Runbook) com canais de escalonamento mútuo.
- **Anexo V** — Especificação técnica de integração (REST API + webhook reverso + payload schemas).

---

## Para iniciar

1. **Município** indica DPO, CGM-chefe e ponto-focal de TI por email.
2. **DPO2U** envia draft customizado deste termo em até 5 dias úteis.
3. **2 sessões de 60min** (uma jurídica, uma técnica) com partes acima.
4. **Carta de intenção assinada** → 14 dias pra preparar minuta final.
5. **Termo de Cooperação assinado** → 5 dias úteis pra go-live técnico.

Contato: Frederico Santana — fredericosanntana@gmail.com.
