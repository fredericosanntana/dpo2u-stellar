**DPO**

**2U.**

*Compliance as protocol.*

---

# PRD — DPO2U-Gov

**Módulo de compliance protocolar para Administração Pública**

*Documento preparado para discussão com Paulo Henrique Figueiredo de Oliveira e equipe de desenvolvimento.*

**Versão 0.5 — Estratégia Joinville · Stack Stellar**

DPO2U Research House — Maio de 2026 (revisão pós-implementação testnet)

Autor: Fred Santana

---

> **O que mudou da v0.4 para a v0.5.** A versão anterior descrevia a camada on-chain do módulo Gov como programa Solana em Anchor. Entre o draft de abril e o draft atual, a research house implementou e fez o deploy do primeiro contrato em produção pública (testnet) — não em Solana, mas em **Stellar Soroban**. A v0.5 reflete essa decisão arquitetural, atualiza os argumentos institucionais correspondentes, e substitui o anexo de "Programa Solana — esboço de contas" pelo contrato real já em testnet, com tx hashes públicos verificáveis. O restante do escopo (módulos, divisão de responsabilidades, estratégia de adoção em três níveis, casos de uso, cronograma, riscos) permanece. Não mudou o sujeito regulado, não mudou a estratégia, mudou a chain. E a chain mudou porque o argumento institucional é mais sólido em Stellar.

---

# PARTE 1

# Visão Executiva

## 1. Contexto

Em maio de 2026 a DPO2U foi convidada a apoiar o projeto de pesquisa apresentado por Paulo Henrique Figueiredo de Oliveira como Projeto Final no curso da PUC-Rio, intitulado *"Contratos Inteligentes em Blockchain na Administração Pública: uma proposta anticorrupção com inteligência artificial validadora"*. O trabalho propõe uma arquitetura jurídico-tecnológica em camadas para reduzir brechas de manipulação na execução contratual pública, combinando IA auxiliar, motor de regras determinístico, smart contracts e blockchain pública permissionada.

A leitura técnica do resumo executivo evidenciou que a arquitetura descrita por Paulo é, em essência, compliance-as-protocol aplicada ao setor público — exatamente o framework conceitual e técnico que a DPO2U opera há mais de um ano para o setor privado. A research house mantém hoje 17 jurisdições modeladas em predicados verificáveis, infraestrutura on-chain (Solana para os módulos Enterprise/Web3 e Stellar para o módulo Gov), e camada MCP em produção. O que separa o caso público do privado não é arquitetura, é base normativa, sujeito regulado e ciclo documental.

Esse documento propõe transformar essa convergência em colaboração estruturada. A DPO2U está lançando um novo módulo da sua suíte de produtos — **DPO2U-Gov** — voltado a compliance protocolar para entes públicos. O projeto do Paulo é o piloto inaugural deste módulo: um caso real, com time dedicado de duas desenvolvedoras e suporte jurídico, que valida a arquitetura em campo enquanto a DPO2U fornece a infraestrutura de produção.

A v0.5 deste documento difere da v0.4 num único ponto material: a camada on-chain do módulo Gov foi implementada em **Stellar Soroban**, não em Solana. Contrato `anticorruption-attestation` deployed em Stellar testnet em 12 de maio de 2026, identificador público `CC4TJGDRWZOPGBWOOHBJF3N2VKUQRNIW6C6PTYHD7ZI3D42GBQRRZHM5`. A escolha da chain é justificada na §9 — e ela importa institucionalmente, não tecnicamente.

## 2. Princípios da colaboração

Antes de descrever produto, escopo ou cronograma, importa fixar como a parceria é desenhada. A DPO2U é uma research house que entrega código — não uma fábrica de software nem uma consultoria. Isso define como entramos:

- **Autonomia preservada.** O projeto continua sendo do Paulo, sob sua autoria intelectual e jurídica. A DPO2U entra como camada de protocolo: infraestrutura, modelagem jurídica, on-chain. A camada de aplicação, integração com sistemas brasileiros e relação com o ente piloto permanece com o time dele.

- **Sem cobrança no piloto.** O instrumento jurídico-formal define o vínculo institucional, mas não há cobrança financeira da DPO2U pelo piloto. O valor que extraímos é o caso real — validação de mercado para o módulo Gov, primeiro estudo de caso publicável no setor público.

- **Reciprocidade técnica.** Predicados que o time do Paulo modelar para o caso público entram no Compliance Registry da DPO2U sob licença aberta. Oráculos que o time construir podem ficar sob ownership deles, expostos via tools MCP gov_*. Documentação técnica do que rodou no piloto vira insumo público para outros entes adotarem.

- **Compliance-as-protocol é o protocolo.** A DPO2U define o protocolo (schemas, contratos de tools MCP, tipos de atestação on-chain). O time do Paulo é o primeiro consumidor desse protocolo no setor público, com a vantagem de poder dialogar com o protocolo em desenho.

- **Velocidade pragmática.** Pilotos públicos morrem por excesso de fricção institucional. A DPO2U entra para reduzir fricção: tudo o que for arquitetura de compliance já tem resposta pronta; tudo o que for específico do caso brasileiro fica com o time do Paulo. Workshop arquitetural e definição de escopo cabem em uma semana.

## 3. Arquitetura DPO2U — onde Gov se encaixa

A DPO2U organiza seus produtos em três módulos verticais que compartilham um core de research house. Os três módulos consomem a mesma infraestrutura — modelagem jurídica, predicados versionados, Compliance Registry, AgentRegistry, MCP server, explainability — e diferem apenas no domínio normativo coberto e, no caso do Gov, na chain de transparência.

### 3.1. Os três módulos

**DPO2U Enterprise.** Compliance B2B em jurisdições privadas — LGPD, GDPR, PIPEDA, FINTRAC, SOX, HIPAA, entre outras. Em produção sobre Solana (14 programas devnet, 18 manifestos legais on-chain).

**DPO2U Web3.** Compliance on-chain para protocolos DeFi, Travel Rule, sanctions screening, token issuance. Em produção sobre Solana.

**DPO2U Gov.** Compliance protocolar para Administração Pública — Lei 14.133/21, LGPD setor público, execução contratual, atos administrativos parametrizáveis. **Módulo novo, com primeiro contrato Soroban deployed em Stellar testnet em 12 de maio de 2026.** Piloto inaugural: caso Paulo.

### 3.2. O core compartilhado

Os três módulos consomem a mesma infraestrutura de research house:

- **Modelagem jurídica** — tradução de norma em predicado verificável, versionado, com referência normativa. 17 jurisdições já mapeadas; Lei 14.133/21 e LGPD setor público são adições naturais do módulo Gov.

- **DPO2U-MCP** — interface única com tools organizadas por namespace (enterprise, web3, gov). 70 tools em produção; namespace `gov_*` é a extensão proposta neste piloto.

- **docs.dpo2u.com** — especificação técnica viva do protocolo, schemas de tools, contratos de integração, mantida pela research house.

A camada on-chain é a única que diverge por módulo:

- Enterprise e Web3 rodam sobre **Solana** (custo baixíssimo, throughput alto, ecossistema DeFi maduro). Compliance Registry e AgentRegistry estão deployed em devnet com 14 programas e 18 manifestos legais.

- Gov roda sobre **Stellar Soroban** (argumento institucional discutido na §9). O primeiro contrato — `anticorruption-attestation` — está deployed em testnet desde 12 de maio de 2026, com cinco funções públicas (`configure_use_case`, `authorize_submitter`, `register_attestation`, `verify_attestation`, `admin`) e duas atestações reais já ancoradas durante a fase de demonstração.

A divergência de chain entre módulos é uma escolha deliberada, não um acidente. Cada chain serve melhor a um público diferente. A §9 desenvolve o argumento institucional para Stellar no caso público.

## 4. Divisão de responsabilidades no piloto

O ponto crítico da colaboração é a separação clara entre o que a DPO2U entrega como camada de protocolo e o que o time do Paulo entrega como camada de aplicação no caso brasileiro real:

| DPO2U entrega — protocolo de compliance | Time Paulo entrega — aplicação no caso real |
|------------------------------------------|---------------------------------------------|
| Modelagem jurídica completa: Lei 14.133/21 e LGPD setor público traduzidas em predicados versionados | UI/UX do servidor público: submissão documental, dashboard de fluxo, painel de auditoria |
| Compliance Registry e AgentRegistry em **Stellar (contrato Soroban `anticorruption-attestation`, testnet `CC4TJGDR…ZHM5`)** | Oráculos para fontes oficiais brasileiras: CEIS, CNEP, SIAFI, gov.br, Receita, Caixa |
| DPO2U-MCP-Gov: tools `gov_*` expondo predicados, atestações, registro on-chain e explainability | Integração com sistema de pagamento do ente piloto: SIAFI, SIAFEM ou sistema municipal |
| Atestações verificáveis e trilha auditável para controle externo (TCU, CGU, MP) | Coordenação institucional com o ente piloto e operação em produção |
| Especificação técnica viva em docs.dpo2u.com | Fundamentação jurídica em campo, eventual paper acadêmico próprio |
| Suporte técnico contínuo durante o piloto | Calibração do uso das tools MCP-Gov para o universo documental do ente |

### 4.1. Como os dois lados se conectam

O ponto de contato técnico é o **DPO2U-MCP-Gov**: servidor MCP que expõe tools `gov_*` consumidas pelo cliente IA do ente público. O cliente IA, que vive no ambiente do ente, é orquestrador — recebe documentos do servidor, decide consultas a oráculos, chama tools MCP-Gov para verificar predicados, recebe veredito e registra atestação on-chain. O fluxo de operação detalhado está no Anexo A.3.

A separação tem efeito prático: o time do Paulo nunca precisa tocar em Stellar, Soroban, smart contract ou trilha on-chain. Tudo isso é abstraído pelas tools MCP. O time consome chamadas, recebe respostas estruturadas. Idem para a DPO2U: nunca precisa entender como SEI, SIAFI ou gov.br se comportam em cada município. Cada lado opera na sua superfície técnica.

## 5. O que muda para o time do Paulo

Concretamente, o que as duas desenvolvedoras dele recebem ao adotar DPO2U-Gov como infraestrutura:

- **Tempo.** Não precisam construir Compliance Registry, AgentRegistry, motor de predicados, atestações on-chain, integração com Stellar, camada MCP, modelagem jurídica da Lei 14.133 e LGPD setor público. Tudo isso é consumido pronto.

- **Auditabilidade pronta.** TCU, CGU e Ministério Público vão querer ver trilha auditável e explicabilidade. Isso já está implementado e em produção em outros módulos da DPO2U. No módulo Gov, a verificação independente já é demonstrável via CLI público `dpo2u-attest verify <use_case> <evidence_hash>` que lê on-chain sem credencial — qualquer auditor externo reproduz da máquina dele.

- **On-chain de custo institucional.** Stellar oferece custo de transação compatível com volume público (~0,00001 XLM, frações de centavo de centavo) e finalidade rápida — crítico para fluxo de ateste a pagamento. E mais: é a chain pública usada por instituições financeiras reguladas (MoneyGram, Circle/USDC, IBM World Wire), com track record de 12+ anos de operação contínua sem incidentes catastróficos. O argumento institucional é mais sólido do que com Solana.

- **Foco no que ninguém mais pode fazer.** As duas devs concentram esforço onde têm domínio insubstituível: UI/UX que o servidor público vai operar, oráculos calibrados para APIs oficiais brasileiras, integração com sistemas legados de pagamento.

- **Suporte técnico contínuo.** Acesso direto à equipe técnica da DPO2U para discussão de arquitetura, code review nos pontos de integração, debugging conjunto quando necessário.

- **Posicionamento na suíte DPO2U.** O piloto é caso inaugural do módulo Gov, mencionado em docs.dpo2u.com, materiais de comunicação e narrativa pública da casa.

## 6. O que muda para a DPO2U

A DPO2U ganha o que toda research house precisa para validar uma vertical nova: um caso real, com time dedicado, em domínio relevante (administração pública brasileira), executado em parceria com um pesquisador-praticante do direito público. O DPO2U-Gov nasce com piloto inaugural, em vez de nascer especulativamente.

O módulo passa a fazer parte da suíte oficial da DPO2U, ao lado do core Enterprise e Web3, com posicionamento, documentação técnica em docs.dpo2u.com e roadmap próprios. A escolha de Stellar como chain do módulo Gov consolida uma estratégia multi-chain explícita: cada vertical regulatória adota a chain que melhor sustenta seu argumento institucional.

## 7. Estratégia de adoção em três níveis

A adoção do DPO2U-Gov por um ente público obedece a três níveis de profundidade institucional, com risco operacional crescente. O piloto começa rigorosamente no Nível 1.

### 7.1. Nível 1 — Observador (entrega imediata, 90 dias)

DPO2U-Gov roda em paralelo aos sistemas oficiais do ente, sem integração. O servidor submete cópia de documentos numa interface separada construída pela equipe do Paulo; o cliente IA orquestra extração documental via tools MCP-Gov; o motor de predicados verifica conformidade; atestações são registradas em **Stellar testnet** (e em produção, mainnet); relatório consultivo auditável é emitido. O processo oficial segue paralelamente sem mudança.

**Vantagens.** Zero risco operacional. Não toca em SEI, ERP ou sistema financeiro do ente. Demonstra valor sem exigir mudança de processo institucional. Permite que o controle interno faça comparação direta entre o fluxo manual existente e o fluxo auditado pela DPO2U-Gov, sem dependência.

**Critérios de sucesso.** Concordância entre relatório consultivo DPO2U-Gov e parecer manual do controle interno acima de 95% nos casos analisados; tempo médio de geração do relatório abaixo de cinco minutos por processo; zero incidentes operacionais.

**Prova reproduzível já existente.** O fluxo Nível 1 está demonstrado end-to-end em testnet via o script `scripts/demo-pilot-marica-fluxo-completo.sh` do repositório `dpo2u-stellar`. Duas atestações reais ancoradas em 18 de maio de 2026 (uma PASS, uma FAIL), com tx hashes públicos verificáveis em Stellar Expert. Detalhes técnicos no Anexo G.

### 7.2. Nível 2 — Consultor (próxima fase, ativada quando oráculos brasileiros estiverem maduros)

DPO2U-Gov se integra read-only ao SEI via API. Quando um processo de pagamento é instaurado no SEI, o sistema lê documentos automaticamente, consulta oráculos brasileiros (CEIS, CNEP, Receita, Caixa, gov.br) e emite parecer auditável que vai junto do processo eletrônico. O servidor decide se segue. Atestação on-chain de cada parecer.

**Vantagens.** Servidor não digita nada. Trilha auditável completa para TCE-SC e MP. Oráculos sob ownership da equipe do Paulo permitem consultas automatizadas sem ônus operacional para o servidor.

**Pré-requisito.** Nível 1 maduro e validado pelo controle interno; oráculos brasileiros prioritários (CEIS, CNEP, Receita) em produção; instrumento jurídico-formal definido.

### 7.3. Nível 3 — Gate (must-have do roadmap futuro)

DPO2U-Gov se integra ao ERP municipal e bloqueia preventivamente a transição de liquidação para pagamento autorizado quando predicados não são satisfeitos. O servidor competente recebe alerta e pode (i) corrigir, (ii) justificar e prosseguir com registro auditável de override, ou (iii) escalar.

**Posicionamento.** Roadmap futuro, não escopo de piloto. Apresentado para que o ente público enxergue onde a história chega, mas não é proposta na primeira conversa. Exige maturidade técnica, validação jurídica e maturidade institucional que só Nível 1 e 2 produzem.

## 8. Casos de uso do piloto

A escolha do caso de uso de entrada para o Nível 1 é estratégica. Pagamento de fornecedor após nota fiscal é o candidato natural mas tem dois problemas para um primeiro piloto: volume alto, variação documental grande entre secretarias, e sensibilidade política (qualquer atraso é percebido como obstáculo).

A DPO2U-Gov recomenda, como caso de uso de entrada, a **alteração de dados bancários de fornecedor** — caso de uso com perfil ideal para Nível 1.

### 8.1. Caso de entrada — alteração de dados bancários

Toda alteração de conta bancária de fornecedor passa por verificação de predicados rigorosos: solicitação assinada digitalmente pelo representante legal do fornecedor, comprovação de titularidade da nova conta, conferência de CNPJ, validação contra cadastro do fornecedor no ente público, verificação de sanções (CEIS, CNEP) e regularidade fiscal.

**Por que esse caso funciona melhor como entrada.** Volume baixo (algumas dezenas de alterações por mês) reduz complexidade operacional do piloto. Risco enorme — é exatamente o vetor de fraude que causou o desvio de R$5,5 milhões no TJDFT em 2024, vulnerabilidade reconhecida em toda Procuradoria e Controladoria. Predicados claros e verificáveis objetivamente. Defensabilidade política máxima: é proteção, não substituição. Ganho concreto e mensurável: o ente piloto torna-se referência nacional em proteção rastreável contra fraude de troca bancária.

**Estado atual da implementação.** O use case `bank_chg` está implementado em testnet com cinco predicates determinísticos:

| ID | Predicate | Verifica |
|----|-----------|----------|
| P1 | `cnpj_match` | CNPJ do fornecedor confere com titular da nova conta |
| P2 | `official_channel` | Solicitação veio pelo canal oficial do ente |
| P3 | `sender_domain` | Domínio do email remetente bate com o domínio municipal |
| P4 | `bank_regulated` | ISPB da nova conta está na lista de instituições reguladas pelo BCB |
| P5 | `no_recent_change` | Última mudança de conta foi há mais de 90 dias |

Avaliação ocorre off-chain (motor determinístico em TypeScript, gateway DPO2U), e apenas o veredito agregado e os hashes da evidência + metadata são registrados on-chain via `register_attestation`. Idempotência por `evidence_hash` impede dupla ancoragem da mesma operação real.

### 8.2. Caso de expansão — pagamento de fornecedor por documento textual

Núcleo originalmente proposto no projeto do Paulo, ativado após sucesso do caso de entrada. Fluxo: o servidor submete documentos referentes a uma fase de execução contratual; o cliente IA orquestra extração e validação; oráculos consultam fontes oficiais quando aplicável; tools MCP-Gov validam contra predicados; se todos forem satisfeitos, o estado avança e o efeito (autorização para pagamento) é registrado on-chain; senão, o fluxo é bloqueado e o servidor recebe explicação em linguagem simples.

Importante: a DPO2U-Gov não autoriza pagamento — autoriza a transição de estado que habilita o sistema de pagamento do ente público a prosseguir. Há separação rígida entre três camadas: autorização para pagar (DPO2U-Gov), ordem de pagamento (ato administrativo indelegável do ordenador, nos termos da Lei 4.320/64 art. 64), e liquidação financeira (saída de recursos da conta única do tesouro pelo Banco do Brasil).

### 8.3. Tipos contratuais cobertos no piloto de Nível 1

Recomendação: começar pelo caso de alteração bancária aplicado a todos os fornecedores ativos do ente piloto. Volume controlado, alta defensabilidade, baixa variação documental. Expansão posterior para classes de contrato de baixo risco e alta repetibilidade — manutenção predial, locação de equipamentos, serviços continuados — seguindo critério de validação institucional.

### 8.4. Fora do escopo do piloto

Atos administrativos não-contratuais, contratos complexos com múltiplas fases sobrepostas, processos sancionatórios, decisões discricionárias do gestor público. Visão computacional, cooperação jurídica internacional e provas de conhecimento zero ficam como roadmap futuro do módulo, não como escopo de piloto.

## 9. Stellar como camada de transparência institucional

A escolha de **Stellar Soroban** como camada de registro on-chain do módulo Gov é apresentada explicitamente ao ente público como feature de transparência institucional, não como detalhe técnico escondido. A v0.4 deste documento propunha Solana; a v0.5 reflete a escolha implementada após análise institucional aprofundada e o primeiro deploy real em testnet. Cinco argumentos sustentam a posição:

**Imutabilidade auditável.** Uma vez registrada, a atestação não pode ser alterada por administrador do sistema, nem por ataque interno, nem por mudança de gestão. TCE, CGM, MP e cidadão podem auditar a qualquer momento, sem depender de cooperação ativa do ente público auditado. Esse argumento é independente da chain — qualquer blockchain pública o atende.

**Custo de transação institucional.** Em Stellar mainnet, cada atestação custa frações de centavo de centavo (cerca de 0,00001 XLM, alguns micro-dólares por transação). Não há restrição orçamentária para registrar tudo o que importa. Volume público de atestações torna-se compatível com qualquer orçamento municipal.

**Independência de fornecedor.** O registro existe em rede pública descentralizada, sem depender da DPO2U continuar existindo. Se a parceria terminar por qualquer razão, o histórico permanece auditável e verificável. É o oposto de vendor lock-in — é compromisso explícito de continuidade institucional. Esse ponto merece destaque: gestores públicos têm trauma legítimo de dependência de fornecedor. Apresentar o registro on-chain como garantia de continuidade institucional, e não como amarra técnica, é argumento que ressoa em Procuradoria, Controladoria e Secretaria de Tecnologia.

**Posicionamento institucional da chain.** Stellar tem 12+ anos de operação contínua, sem incidentes catastróficos, sem halts não programados de mainnet, sem associação histórica com NFTs especulativos ou memecoins. A rede é usada em produção por MoneyGram (remessas globais), Circle (emissão de USDC), IBM World Wire, plataformas reguladas de remessa internacional. A Stellar Development Foundation é organização sem fins lucrativos, com governança documentada e relação institucional com reguladores em múltiplas jurisdições. Apresentar Stellar para Procuradoria e Controladoria é uma conversa muito mais curta do que apresentar Solana — o que importa em piloto público, onde fricção institucional mata projetos.

**Verificação trustless já entregue.** O contrato `anticorruption-attestation` em testnet já tem SDK público (`@dpo2u/stellar-sdk`) e CLI (`dpo2u-attest verify`) que permite a qualquer auditor externo ler uma atestação on-chain sem credencial, sem cooperação do município, sem servidor próprio. Em 18 de maio de 2026, esse fluxo foi demonstrado end-to-end com duas atestações reais (uma PASS e uma FAIL), com vídeo institucional gravado e documentação reproduzível em três comandos. Detalhes no Anexo G.

A escolha de Stellar não é religião de chain. É escolha pragmática para um módulo cujo público primário — gestor público, controle interno, controle externo, Ministério Público — não compartilha o vocabulário e a tolerância a risco do público cripto-native. A chain é parte da entrega institucional, não detalhe técnico.

## 10. Fases e cronograma indicativo

Cronograma indicativo para entrega do Nível 1 (Observador) em 90 dias, sujeito a ajuste após alinhamento com o ente público âncora e a equipe do Paulo. Atualizado para refletir o estado de implementação atual:

| Fase | Janela | DPO2U entrega | Time Paulo entrega |
|------|--------|---------------|--------------------|
| 0. Alinhamento | Semanas 1–2 | Workshop arquitetural; ajuste fino dos predicados de alteração bancária ao contexto do ente piloto; spec de integração em docs.dpo2u.com | Mapeamento do fluxo de alteração bancária no ente piloto; levantamento das fontes oficiais relevantes (CEIS, CNEP, Receita) |
| 1. Build piloto | Semanas 3–8 | MCP-Gov v1 com tools `gov_predicate_evaluate`, `gov_document_attest`, `gov_audit_trail_query`; integração Stellar via SDK `@dpo2u/stellar-sdk`; tools oráculos v1 para CEIS e CNEP entregues à equipe do Paulo | Cliente IA + UI servidor + integração ao SEI consultivo do ente; calibração documental nos casos reais |
| 2. Smoke + dry-run | Semana 9 | Suporte técnico; ajustes finos; documentação operacional | Smoke test com fluxos reais selecionados; coleta de feedback inicial do controle interno |
| 3. Operação consultiva | Semanas 10–12 | Trilha auditável renderizada em formato apto a TCE/MP; relatório de métricas de validação | Operação consultiva em produção; comparação com parecer manual do controle; relatório de campo |

O contrato Soroban já em testnet (Anexo G) reduz o esforço da Fase 0: o workshop arquitetural pode ser parcialmente substituído por uma sessão de walkthrough do que já está deployed. A modelagem do `bank_chg` v1 também já está pronta — o que sobra para a Fase 0 é o ajuste fino dos predicates à realidade documental do ente piloto.

## 11. Riscos e mitigações

- **Risco regulatório.** Automação de fluxos administrativos pode encontrar resistência interpretativa. Mitigação: arquitetura preserva revisão humana, autotutela e inafastabilidade da jurisdição. DPO2U-Gov não decide, apenas executa transição parametrizada após verificação formal.

- **Risco de governança da IA.** O caso "Diella" na Albânia, citado pelo próprio Paulo, é alerta válido. Mitigação: cliente IA é estritamente auxiliar, registrado via AgentRegistry, com trilha de operação auditável e responsabilidade jurídica preservada com o servidor público.

- **Risco de integração com sistemas legados.** SIAFI, SEI e similares não foram desenhados para interoperar com camadas modernas. Mitigação: integração via APIs documentadas e camada de adaptação construída pelo time do Paulo. DPO2U-Gov expõe interface limpa e estável via MCP.

- **Risco LGPD setor público.** Tratamento de dados pessoais por ente público tem base legal específica. Mitigação: Compliance Registry registra hashes e atestações, não dados pessoais brutos. Documentos sensíveis permanecem off-chain sob controle do ente público.

- **Risco de escopo.** Tentação natural de ampliar para fluxos complexos antes de validar o núcleo. Mitigação: piloto cirúrgico em classe restrita de contratos, com expansão apenas após métricas de validação.

- **Risco de chain.** Stellar mainnet tem histórico estável, mas qualquer chain pública carrega risco de incidente. Mitigação: contrato é imutável por design (não tem proxy, não tem upgrade após deploy mainnet); chave de admin sob multisig (Stellar account com multiple signers); plano de continuidade documentado (`docs/RUNBOOK.md`) cobrindo cenários de halt, fork, vazamento de chave, descomissionamento.

## 12. Decisões pendentes

Pontos abertos que precisam ser fechados na primeira conversa conjunta:

- **Ente público âncora.** Prefeitura de Joinville foi sinalizada como candidato prioritário, com reunião de aproximação em curso. Confirmar composição da reunião (CIO, Procuradoria, Controladoria, Secretaria de Administração) e calendário definitivo.

- **Stack técnico das duas devs.** Experiência prévia com APIs de governo brasileiro, frontend, infraestrutura.

- **Caminho jurídico-formal.** CPSI sugerido pelo Paulo, parceria com PUC-Rio, contrato direto, outro instrumento.

- **Política de fallback e versionamento dos oráculos.** Como tratar APIs oficiais fora do ar ou com schema mudando — definição interna do time do Paulo.

- **Cadência de comunicação entre os times.** Weekly conjunto, canal Slack/Discord, milestones compartilhados.

- **Política de divulgação.** Quando e como anunciar a colaboração publicamente; alinhamento com calendário acadêmico do Paulo.

- **Gestão de chave Stellar.** Quem opera a chave do ente público em produção: custódia, multisig na própria rede Stellar (suporte nativo a multisignature), HSM externo. Decisão importa porque o contrato `authorize_submitter` precisa ser invocado pelo admin para autorizar a entidade signatária do ente — e essa autorização precisa ser auditável.

## 13. Próximos passos sugeridos

- Validação deste documento com Paulo e com as duas desenvolvedoras.

- Reunião de alinhamento (60–90 min) para fechar pontos pendentes.

- Workshop técnico-arquitetural de Fase 0 (meio dia, presencial ou remoto), com walkthrough do contrato testnet já deployed e participação das devs e da equipe técnica DPO2U.

- Acordo de colaboração simples de uma página: escopo, princípios, propriedade intelectual, confidencialidade. Modelo comercial fora deste escopo.

- Início da Fase 1.

---

# PARTE 2

# Anexo Técnico

*Para a equipe de desenvolvimento*

## A. Visão de arquitetura técnica

DPO2U-Gov é construído sobre o core compartilhado da DPO2U, com adições específicas para o domínio público:

### A.1. Camadas DPO2U

- **Contrato `anticorruption-attestation` (Stellar Soroban, Rust).** Contrato imutável que registra atestações de compliance emitidas pelo motor de predicados off-chain. Sem PII on-chain — apenas hashes de evidência e metadata, mais o veredito agregado (`Pass`/`Fail`/`Review`). Cinco funções públicas: `__constructor`, `configure_use_case`, `authorize_submitter`, `register_attestation`, `verify_attestation`. Storage estruturado em quatro chaves: `Admin`, `UseCaseConfig(Symbol)`, `Authorized(Address)`, `Attestation(Symbol, BytesN<32>)`. Detalhes no Anexo C.

- **AgentRegistry (roadmap).** No módulo Enterprise/Web3, AgentRegistry vive em Solana (programa Anchor deployed devnet). No módulo Gov, a entidade equivalente é implementada via o mecanismo `authorize_submitter` do contrato Soroban: cada agente IA do ente é autorizado individualmente pelo admin, com revogação suportada. AgentRegistry completo em contrato Soroban dedicado (com metadata de modelo, capabilities, operador) é roadmap pós-Nível 1.

- **DPO2U-MCP-Gov.** Tools no namespace `gov_*` expondo predicados, atestações, registro on-chain e explainability. Cliente MCP do ente consome essas tools. As primeiras tools — `gov_predicate_evaluate`, `gov_document_attest`, `gov_audit_trail_query` — já estão demonstráveis via o gateway REST do piloto, com versão experimental do MCP Gov programada para a Fase 1.

- **docs.dpo2u.com.** Especificação técnica viva: schemas das tools, contratos de integração, ciclo de vida de predicados, formato de atestação. O contrato Soroban tem documentação canônica em `docs/` do repositório `github.com/fredericosanntana/dpo2u-stellar`.

### A.2. Camadas time do Paulo

- **UI/UX do servidor público.** Submissão documental, dashboard de fluxo, painel de auditoria, explicabilidade renderizada para o servidor.

- **Cliente IA.** Hospedado no ambiente do ente público. Orquestra o fluxo, lê documentos submetidos, decide consultas, amarra resultados de oráculos com tools MCP-Gov.

- **Oráculos brasileiros.** CEIS, CNEP, SIAFI, gov.br, Receita Federal, Caixa. Bibliotecas que consultam fontes oficiais e retornam resultado estruturado para o cliente IA.

- **Integração de pagamento.** Camada que recebe sinal de transição autorizada do MCP-Gov e dispara fluxo de pagamento no sistema do ente (SIAFI, SIAFEM, sistema municipal).

### A.3. Fluxo típico — autorização de transição

Sequência operacional típica em produção:

1. Servidor submete documentos via UI do time Paulo.
2. Cliente IA extrai campos estruturados e consulta oráculos relevantes (CEIS, CNEP, etc.).
3. Cliente IA chama `gov_predicate_evaluate` no MCP-Gov com a evidência consolidada.
4. MCP-Gov executa motor de predicados off-chain (determinístico, sem I/O externo).
5. Se todos os predicados PASS, MCP-Gov chama `register_attestation` no contrato Soroban, ancorando hash de evidência + hash de metadata + veredito.
6. Stellar testnet (ou mainnet em produção) retorna tx hash e ledger sequence.
7. UI mostra ao servidor o veredito + tx pública + link Stellar Expert.
8. Auditor externo, em qualquer momento, roda `dpo2u-attest verify <use_case> <evidence_hash>` da máquina dele e recebe o registro on-chain — sem credencial, sem cooperação do ente.

## B. Tools MCP do namespace gov_*

Conjunto inicial de ferramentas a serem expostas pela DPO2U. Nomes e schemas são propostas e podem ser ajustados no workshop arquitetural. Especificação completa em docs.dpo2u.com após Fase 0.

### gov_predicate_define

Registra predicado de compliance no Compliance Registry. Recebe definição estruturada e retorna ID mais hash on-chain. Idempotente por hash de definição. Em Stellar, materializa-se como invocação `configure_use_case(admin, use_case_id, UseCaseConfig)`.

Input: `{ name, version, schema, normative_ref, validator_spec }`

Output: `{ predicate_id, on_chain_hash, tx_signature }`

### gov_document_attest

Gera atestação verificável de que documento foi submetido em determinado momento, vinculado a predicado e fluxo. Registra hash do documento e metadados, nunca conteúdo bruto. Em Stellar, materializa-se como invocação `register_attestation(submitter, use_case_id, verdict, evidence_hash, metadata_hash)`.

Input: `{ flow_id, predicate_id, document_hash, submitter_id, metadata }`

Output: `{ attestation_id, on_chain_proof, tx_signature }`

### gov_predicate_evaluate

Avalia conjunto de evidências (extraídas pelo cliente IA, validadas por oráculos do time Paulo) contra predicado. Retorna sucesso ou lista estruturada de gaps. Off-chain, determinístico.

Input: `{ predicate_id, evidence_bundle, agent_id }`

Output: `{ is_satisfied, gaps[], evaluation_signed_hash }`

### gov_payment_gate

Verifica se todos os predicados de uma fase estão satisfeitos para autorizar transição de estado. Não autoriza pagamento — autoriza a transição que o sistema do ente público interpreta como sinal verde.

Input: `{ flow_id, target_state }`

Output: `{ can_transition, missing_predicates[], blocking_reasons[] }`

### gov_audit_trail_query

Recupera trilha auditável completa de um fluxo. Inclui prova de integridade on-chain (tx hashes Stellar). Saída pensada para consumo por TCU, CGU, MP.

Input: `{ flow_id, format ('json' | 'pdf_signed') }`

Output: `{ trail[], integrity_proof, generated_at }`

### gov_explainability_render

Gera laudo em linguagem simples explicando o que aconteceu em um fluxo. Saída pensada para servidor público, controle social e cidadão.

Input: `{ flow_id, audience ('servidor' | 'controle' | 'cidadao'), language }`

Output: `{ explanation_text, key_events[], generated_at }`

### gov_agent_register

Registra identidade do cliente IA usado pelo ente. Vincula modelo, operador, capabilities. Em Stellar, materializa-se como invocação `authorize_submitter(admin, submitter_address, allowed=true)` do contrato `anticorruption-attestation`.

Output: `{ agent_id, on_chain_pubkey, tx_signature }`

## C. Contrato Soroban — esboço de storage

Substitui o anexo "Programa Solana — esboço de contas" da v0.4. Aqui descrevemos o contrato `anticorruption-attestation` já deployed em testnet (estado atual) mais as extensões previstas para o módulo Gov completo.

### C.1. Estado atual (deployed em testnet, 2026-05-12)

**Contract ID:** `CC4TJGDRWZOPGBWOOHBJF3N2VKUQRNIW6C6PTYHD7ZI3D42GBQRRZHM5`
**Wasm hash:** `d706a07161d784dcf2790c95c5e5e516c0993dfbbd0c8eb7a61cdefd4a6d7595`
**Deploy tx:** `dc7608ac5a85ed23de28b398fce1197ae1f46359cd6ececf489b9f90a4f60a35`
**Source:** `contracts/anticorruption-attestation/src/lib.rs`

Storage keys (DataKey enum):

#### `Admin`
- Tipo: `Address`
- Imutável após inicialização. Detém a capacidade de configurar use cases e autorizar/revogar submitters.

#### `UseCaseConfig(Symbol)`
- Chave: identificador do caso de uso (e.g. `bank_chg`)
- Valor: `UseCaseConfig { active: bool, predicate_set: Symbol, predicate_version: u32 }`
- Versão substituível por nova configuração; auditoria histórica preservada pelos eventos.

#### `Authorized(Address)`
- Chave: endereço Stellar do submitter (entidade autorizada a ancorar atestações)
- Valor: `bool` — autorização ativa ou revogada
- Revogação não invalida atestações anteriores; impede apenas novas atestações por aquele submitter.

#### `Attestation(Symbol, BytesN<32>)`
- Chave: `(use_case_id, evidence_hash)`
- Valor: `AttestationRecord { submitter, verdict, metadata_hash, ledger_sequence }`
- Imutável após registro. Tentativa de re-registrar mesma evidência retorna erro `AttestationExists (#3)`.

Eventos emitidos:
- `config(use_case_id)` — em `configure_use_case`
- `auth(submitter)` — em `authorize_submitter`
- `attest(use_case_id, evidence_hash)` — em `register_attestation`

### C.2. Extensão para módulo Gov completo (roadmap)

As entidades adicionais propostas na v0.4 (Flow, Agent, StateTransition) materializam-se como extensões opcionais do contrato existente ou como contratos Soroban irmãos. Mapeamento sugerido:

#### Flow
- Storage key proposta: `Flow(Symbol)` onde Symbol é o `flow_external_id`
- Fields: `{ contract_ref_hash, current_state, predicates_satisfied, created_by, created_at }`
- Necessário apenas para Nível 2/3 onde o fluxo completo é orquestrado on-chain.

#### Agent
- Hoje materializado via `Authorized(Address)` simples (bool)
- Extensão Gov: storage key `Agent(Address)` com fields `{ name, model_ref, capabilities, operator, registered_at, status }`. Permite metadata rica do agente IA.

#### StateTransition
- Storage key proposta: `Transition(Symbol, u64)` onde Symbol é `flow_id` e u64 é o `sequence`
- Fields: `{ from_state, to_state, predicates_satisfied, timestamp, signer }`
- Permite reconstruir histórico de transições de um fluxo a partir do storage on-chain.

A decisão entre extensão do contrato atual versus contrato Soroban dedicado depende de governance: contratos Soroban são imutáveis após deploy, então adicionar funções requer novo deploy com novo `contract_id`. Estratégia recomendada: manter o `anticorruption-attestation` atual estável e focado em registro de atestação simples; o módulo Gov completo (Flow + Agent + StateTransition) entra como contrato Soroban dedicado deployed quando o Nível 2 estiver maduro.

## D. Considerações de segurança

- **Submitter authentication.** Servidor público autentica via gov.br ou ICP-Brasil; mapeamento gov.br para keypair Stellar (Ed25519) gerenciado pela camada do time do Paulo. O contrato Soroban recebe apenas o endereço Stellar do submitter e o `evidence_hash`; nenhum dado pessoal trafega no contrato. Multisig nativa do Stellar pode ser usada na conta do ente para exigir N-de-M assinaturas em operações críticas.

- **Document hashing.** SHA-256 do documento original. Conteúdo nunca sobe. Storage do documento permanece no ente público ou em camada off-chain definida em conjunto com o ente.

- **Predicate immutability.** Predicados ativos não podem ser alterados, apenas substituídos por nova versão via `configure_use_case`. O versionamento (`predicate_version: u32`) preserva auditoria histórica de fluxos já executados.

- **Agent revocation.** O mecanismo `authorize_submitter(allowed: false)` revoga um submitter. Atestações geradas antes da revogação permanecem válidas; novas operações por submitter revogado são rejeitadas com erro `NotAuthorized (#1)`.

- **Audit access.** Stellar é blockchain pública; qualquer um pode auditar via Stellar Expert ou Horizon API. Para dados sensíveis com restrição de publicidade legal, hashing oferece privacidade prática enquanto preserva verificabilidade.

- **Rate limiting.** MCP server expõe rate limits por operador e namespace. Gateway REST do piloto também aplica rate limit por API key (default 30 req/min, configurável por tenant). Logs de uso são preservados para auditoria interna.

- **Imutabilidade do contrato.** O contrato `anticorruption-attestation` é imutável por design — não tem proxy, não tem upgrade. Em mainnet, isso significa que vulnerabilidades só são corrigíveis via novo deploy com novo `contract_id` e migração explícita do estado. Trade-off consciente: imutabilidade é o argumento de venda institucional.

## E. LGPD setor público e interoperabilidade

DPO2U-Gov foi pensado para operar dentro das restrições da LGPD aplicada ao setor público. Princípios operacionais:

- Nenhum dado pessoal bruto sobe para a blockchain. Apenas hashes e metadados estruturais.

- Base legal aplicável é tipicamente cumprimento de obrigação legal ou exercício regular de competências (art. 23 LGPD), validada pelo encarregado do ente público.

- Direito do titular é exercido sobre o documento off-chain. A atestação on-chain permanece como prova de que o documento existiu naquele estado em determinado momento.

- Compatibilidade com Lei 14.129/21 (Governo Digital) e princípios de interoperabilidade da Plataforma de Cidadania Digital.

- Encarregado do ente público recebe documentação completa do fluxo de tratamento para registro em ROPA.

- Erasure (LGPD Art. 18): suporte explícito no gateway REST via endpoint `/api/v1/attestation/erasure-request`. A solicitação gera nova atestação `erasure_v1` no contrato Soroban, vinculando o hash da evidência original a um pedido de apagamento — preservando a trilha auditável sem apagar o registro do tratamento original (que é o que o auditor precisa ver).

## F. Perguntas para o workshop

Pontos técnicos a fechar com as duas desenvolvedoras na primeira sessão conjunta:

- Stack atual de desenvolvimento: linguagens, frameworks, experiência prévia com integração de APIs de governo.

- Cliente IA: vai usar LLM hospedado (Claude, GPT) ou modelo próprio? Onde roda — servidor do ente, infra dedicada?

- Sistema de pagamento do ente: SIAFI federal, SIAFEM estadual, sistema próprio municipal.

- Volume esperado no piloto: número de fluxos por mês, número de documentos por fluxo, picos sazonais.

- Política de logs e retenção do ente público: quanto tempo mantém o quê, sob qual base legal.

- Quem opera a chave Stellar do ente público em produção? Custódia, multisig (suporte nativo na rede Stellar), HSM externo.

- Quais oráculos são prioridade na Fase 1 — qual a sequência de implementação?

- Calendário do CPSI ou instrumento equivalente: prazo, documentação exigida, parecer jurídico necessário.

## G. Estado da implementação testnet (apêndice novo da v0.5)

Inventário do que já está construído no repositório `github.com/fredericosanntana/dpo2u-stellar` em 18 de maio de 2026.

### G.1. Contrato Soroban

- **Path:** `contracts/anticorruption-attestation/`
- **Linguagem:** Rust 1.83, soroban-sdk 26.0.0
- **Wasm otimizado:** 5.8 KB
- **Deploy testnet:** 2026-05-12, contract ID `CC4TJGDRWZOPGBWOOHBJF3N2VKUQRNIW6C6PTYHD7ZI3D42GBQRRZHM5`
- **Stellar Expert:** https://stellar.expert/explorer/testnet/contract/CC4TJGDRWZOPGBWOOHBJF3N2VKUQRNIW6C6PTYHD7ZI3D42GBQRRZHM5
- **Testes:** 10/10 unitários verdes + 161 testes E2E via SDK
- **CI:** per-push GitHub Actions com `cargo fmt`, `cargo clippy`, `cargo test`, `stellar contract build`, `cargo audit`

### G.2. SDK e CLI auditor

- **Package:** `@dpo2u/stellar-sdk` (TypeScript, Node 22+)
- **CLI:** `dpo2u-attest verify <use_case> <evidence_hash>` — leitura trustless, zero credenciais
- **Source:** `sdk/src/`
- **Exit codes:** 0 PASS, 3 FAIL, 4 REVIEW, 1 NOT_FOUND

### G.3. Pilot Gateway (operator console backend)

- **Path:** `/root/DPO2U/packages/pilot-gateway/` (monorepo DPO2U)
- **Stack:** Node 22, Express 5, TypeScript, @stellar/stellar-sdk 14.6.1
- **Endpoints:**
  - `GET /api/v1/healthz` (auth-required)
  - `POST /api/v1/attestation/submit` (use case `bank_chg`, 5 predicates determinísticos)
  - `GET /api/v1/attestation/:attempt_id` (polling)
  - `POST /api/v1/attestation/erasure-request` (LGPD Art. 18)
- **Signer:** conta dedicada `gateway-signer` (`GAD3DAM5JTVWZSWTENR443Y6OKUKRX7EOZYCCN3JEWKEFUTEPY4LSI65`), autorizada como submitter no contrato em tx `45214cbe28d9bb534c08f17d3f165c8552c68a58e151a9b9753cf4b1b5ad003c`
- **Operator console:** `mcp.dpo2u.com/pilot/login` (CTA ativo)

### G.4. Demos reproduzíveis end-to-end

Script único `scripts/demo-pilot-marica-fluxo-completo.sh` encadeia: login no console → submit do payload → polling até COMPLETED → verificação trustless via CLI auditor. Duas atestações reais já produzidas durante a fase de demonstração:

| Cenário | Tx | Ledger | Verdict |
|---------|----|--------|---------|
| Legítimo  | [`c573ddc5…fc6c2002`](https://stellar.expert/explorer/testnet/tx/c573ddc586232a032c0dbbc42421de343f4329813f2b53551e786413fc6c2002) | 2.621.105 | PASS 5/5 |
| Fraude    | [`9d2a7bbc…d6d0d302`](https://stellar.expert/explorer/testnet/tx/9d2a7bbcb1568d88c192788ecb526c0914a1ff156f39b6a20ca6725ed6d0d302) | 2.621.109 | FAIL 3/5 |

Run reports JSON arquivados em `docs/demos/runs/2026-05-18T*.json`. Vídeo institucional PT-BR (2:38) com identidade sealed DPO2U em `07-Content/videos/2026-05-18-pilot-marica-fluxo-completo-v2-sealed.mp4`. Doc walkthrough institucional em `docs/demos/2026-05-18-pilot-marica-fluxo-completo.md`.

### G.5. Documentação institucional

- `docs/RUNBOOK.md` — operações, incident playbooks, P0–P3 escalation matrix
- `docs/THREAT-MODEL-Piloto-v0.1.md` — modelo de ameaças
- `docs/DPIA-Piloto-Anticorrupcao-v0.1.md` — Data Protection Impact Assessment
- `docs/SECURITY_AUDIT.md` — checklist auditoria de segurança
- `docs/MAINNET-CEREMONY.md` — cerimônia de deploy mainnet (gate humano explícito)
- `docs/mainnet-readiness-checklist.md` — checklist pré-mainnet

### G.6. O que ainda não existe

Para honestidade institucional:

- **AgentRegistry completo em contrato Soroban dedicado** — hoje materializado via `Authorized(Address)` simples. Roadmap pós-Nível 1.
- **Flow + StateTransition on-chain** — o gateway hoje mantém estado off-chain (PostgreSQL via volume Docker); apenas o veredito final é ancorado. Roadmap Nível 2.
- **MCP Gov server completo com tools `gov_*`** — as primeiras três tools (`gov_predicate_evaluate`, `gov_document_attest`, `gov_audit_trail_query`) estão demonstráveis via gateway REST; servidor MCP dedicado entra na Fase 1.
- **Oráculos brasileiros** — responsabilidade do time do Paulo. CEIS, CNEP, Receita, gov.br, Caixa.
- **Mainnet deploy** — bloqueado pela conclusão da auditoria externa de segurança (M5, 2026-05-30) e pela cerimônia documentada em `docs/MAINNET-CEREMONY.md` com gate humano explícito do Chairman + ordenador do ente.

---

> *Este documento é a versão 0.5 do PRD DPO2U-Gov, atualizada após o primeiro deploy real em Stellar testnet em 12 de maio de 2026 e a primeira demonstração end-to-end em 18 de maio de 2026. A versão 0.4 referenciava Solana como camada on-chain; a v0.5 reflete a escolha implementada de Stellar Soroban, com argumentos institucionais correspondentes na §9. Sujeito a revisão após primeira reunião conjunta com Paulo e equipe. Modelo comercial e instrumentos jurídicos formais ficam para conversa específica posterior.*
