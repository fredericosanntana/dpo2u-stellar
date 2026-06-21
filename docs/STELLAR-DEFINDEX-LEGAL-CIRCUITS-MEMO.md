# Memo — circuitos legais Stellar + DeFindex

**Status:** memo estratégico canônico  
**Escopo:** DPO2U como layer de conformidade para Stellar/DeFindex  
**Docs relacionados:** `docs/PULSO-DPO2U-DEFINDEX-PRD-v0.1.md`, `docs/DEFINDEX-PROOF-BOUND-EXECUTION-LIVE-SLICE.md`, `docs/composability-quickstart.md`, `docs/PHASE2-OPERATOR-SAFEGUARDS-PRD.md`, `docs/PHASE2-CLAIM-BOUNDARY.md`, `docs/PHASE2-TRAVEL-RULE-ADJACENT-FLOW.md`, `docs/MICA-BINANCE-SIGNAL-MEMO.md`

> **S1 canônico:** o primeiro circuito público escolhido é Governança de rebalance via CVM 175: `rebalanceVault` sob Rebalance Manager, predicado `defindex_rebalance_v1`, âncora principal `sect_cvm_175_v1`. Ver `docs/S1-CVM175-REBALANCE-PREDICATE-MAP.md`.

## Tese executiva

A DPO2U não está "fazendo KYC" dentro de Stellar ou da DeFindex. A DPO2U transforma **resultados de compliance obtidos a montante** em **condições verificáveis de admissão e execução**: uma decisão de política vira uma atestação, a atestação fica ligada a um `evidence_hash`, e uma ação privilegiada só pode ser permitida quando esse resultado já foi provado — sem reexpor PII on-chain.

Para Stellar + DeFindex, o framing jurídico correto **não é uma lei só**. É uma pilha:

- **LGPD** define o boundary de privacidade, minimização e disclosure;
- **PSAV/VASP** define o regime operacional do prestador, incluindo admissão, deveres do operador, salvaguardas e Travel Rule quando aplicável;
- **CVM 175** é a âncora institucional mais forte para mandato, gestão, alocação e governança de rebalance de veículos/vaults;
- **Travel Rule** e obrigações de reporte são circuitos específicos dentro desse regime — não o regime inteiro.

A tese de produto, portanto, é estreita e carregadora de peso:

> **A DPO2U cerca as operações privilegiadas da DeFindex com circuitos legais/políticos, para que ações institucionais em vault só executem quando o resultado de compliance relevante já tiver sido atestado.**

Este memo **não** alega gate nativo de depósito retail na DeFindex. A própria verdade atual do repo e das docs da DeFindex indica que depósitos/saques são superfícies user-facing, enquanto o ponto nativo de integração é o plano de operador role-gated: **Manager, Rebalance Manager, Emergency Manager e Fee Receiver**.

## Sinal de mercado adicional — MiCA/Binance

O caso Reuters/Binance consultado nesta sessão adiciona um sinal externo relevante ao framing deste memo: em regime MiCA, a licença deixa de ser ornamento reputacional e passa a funcionar como **filtro de existência operacional**. Em termos de tese, isso reforça que o ponto mais institucionalmente legível da DPO2U não é “UX regulatória” nem KYC decorativo; é **admissibilidade de operador + safeguards + reporting verificável**.

Para este memo, a consequência prática é simples:

- `operator admission` ganha peso como primitive central;
- `safeguards` e `reporting` deixam de parecer extensões tardias e passam a parecer partes naturais do regime;
- `Travel Rule` continua relevante, mas como circuito específico, não como resumo do regime inteiro;
- o framing certo permanece `operator-side institutional execution`, e não `VASP full` horizontal.

## Estado reconciliado após a Fase 2

Depois do fechamento de S1–S5, o repo já materializou uma expansão parcial do seam original em uma **camada operator/safeguards/reporting-aware**, ainda no plano operator-side e ainda sem claim de `VASP/PSAV full`.

Em termos práticos, isso significa que a verdade atual já comporta:

- lane original `rebalanceVault` proof-bound preservada;
- tipos canônicos adicionais de `operator admission`, `safeguards`, `reporting` e `Travel Rule` adjacente no SDK/docs;
- deny paths fail-closed adicionais no gateway para posture de operador, safeguards e reporting;
- demo reproduzível de `reporting artifact -> hash -> verify -> allow -> prepare`.

A tese mais forte do memo, portanto, deixa de ser apenas `proof-bound rebalance` e passa a ser:

> **a DPO2U já provou em DeFindex/Stellar uma camada de execução institucional privilegiada que é proof-bound, operator-aware, safeguards-aware e reporting-aware — sem fingir cobertura horizontal da jornada VASP inteira.**

## Stack legal por relação

| Relação | Superfície legal/política | Papel do circuito DPO2U | Âncoras canônicas |
|---|---|---|---|
| **Participante** | elegibilidade, suitability, consentimento, notice, minimização | condição de admissão para membership/onboarding/política UX off-chain; não allowlist nativa de depósito DeFindex | LGPD, regras setoriais de onboarding, credencial positiva |
| **Operador** | quem pode gerir ou disparar ação privilegiada | condição de execução para operações role-gated da DeFindex | PSAV/VASP, governança, perfil de issuer/operator |
| **Vault** | mandato, limites de alocação, autoridade de rebalance, autoridade de emergência | aprovação proof-bound de create/rebalance/rescue/pause/unpause | CVM 175, mandato de investimento, política de tesouraria |
| **Ativo** | ativos permitidos, status do emissor, reservas/safeguards | predicado de política ligado ao payload de criação ou rebalance | regras CVM de token, analogias MiCAR ART/CASP, salvaguardas VASP |
| **Disclosure** | o que pode ser revelado, retido ou verificado sem expor PII | atestação ligada a hash; nenhuma PII crua on-chain | LGPD, selective disclosure boundary |
| **Reporting** | reportes regulatórios e operacionais exigidos | geração de evidência e atestação de hash de relatório; prova pública de cumprimento sem publicar conteúdo sensível | IN RFB 1888, reportes CVM, reportes BCB/PSAV, trilha de auditoria |
| **Cross-border** | roteamento jurisdicional, base de transferência, regime da contraparte | seleção de predicado por jurisdição e scope do issuer | LGPD (transferência internacional), FATF, regimes locais VASP |
| **Safeguards** | segregação, proof of reserve, incident controls, resposta de emergência | atestação de safeguards antes de ação operacional ou ação emergencial | salvaguardas PSAV/VASP, `vasp_por_br_v1`, analogia MiCAR Art.36 |

## Circuitos regulatórios para everyday finance

Um **circuito** é um loop repetível que começa com uma pergunta jurídico-regulatória e termina numa condição de allow/deny sobre uma ação em Stellar. Para habilitar soluções financeiras do dia a dia via Stellar + DeFindex, a DPO2U deve cercar pelo menos os circuitos abaixo:

| Circuito | Pergunta respondida | Ação Stellar/DeFindex | `use_case_id` / surface sugerida |
|---|---|---|---|
| **Privacidade / disclosure** | essa prova pode ser verificada sem expor dado pessoal? | qualquer prova de admissão ou execução que, sem isso, vazaria PII | `lgpd_compliance_v1`, `consent_record_v1`, `erasure_v1`, política de selective disclosure |
| **Admissão de operador VASP** | esse operador pode rodar esse serviço regulado de cripto? | onboarding de operador, atribuição de papel, acesso ao policy gateway | `sect_bcb_14478_v1`, `micar_casp_v1`, `vasp_por_br_v1` |
| **Criação de vault sob mandato** | esse vault bate com o mandato e o modelo de governança aprovados? | `createVault` sob Manager | `defindex_vault_create_v1`, `sect_cvm_175_v1`, `cvm_token_v1` |
| **Governança de rebalance** | esse rebalance permanece dentro do mandato, risco e regras de ativo? | `rebalanceVault` sob Rebalance Manager | `defindex_rebalance_v1`, `sect_cvm_175_v1`, política de ativo |
| **Ação emergencial** | esse rescue/pause/unpause está autorizado e documentado? | `rescueVault`, `pauseStrategy`, `unpauseStrategy` sob Emergency Manager | `defindex_rescue_v1`, `defindex_pause_v1`, `defindex_unpause_v1` |
| **Fee / settlement** | o fee receiver ou destino de settlement está aprovado? | `distributeFees` sob Fee Receiver | `defindex_fee_distrib_v1`, política AML/sanctions do settlement |
| **Travel Rule** | uma transferência coberta tem mensagem originador/beneficiário e screening exigidos? | orquestração de transferência fora do plano de role de vault, ou fluxos de settlement | `travel_rule_v1`, `sect_fatf_tr_v1` |
| **Safeguards / reserve** | segregação, PoR e salvaguardas de custódia foram evidenciadas? | criação do vault, revisão de operador, atestações periódicas | `vasp_por_br_v1`, `micar_art_v1`, `sect_bcb_14478_v1` |
| **Reporting** | um reporte ou artefato de auditoria exigido foi produzido e committed? | prova periódica, evidence hash, verificação por parceiro/auditor | `sect_rfb_1888_v1`, `sect_cvm_175_v1`, predicados específicos de reporte |

Esses circuitos são **deliberadamente menores** do que um mega-circuito multi-jurisdição. O V1 deve escolher **uma relação, uma surface de ação e uma âncora legal por vez**.

## Loop de admissão vs loop de execução

### Loop de admissão
Responde: **"esse sujeito pode entrar ou permanecer num conjunto permitido?"**

1. participante, operador, issuer ou strategy é avaliado a montante;
2. o compliance engine computa um verdict a partir da evidência;
3. a DPO2U submete ou verifica uma atestação para `(use_case_id, evidence_hash)`;
4. registry, ASP, UX gate ou workflow operacional admite, bloqueia ou revoga o sujeito.

### Loop de execução
Responde: **"essa ação exata pode executar agora?"**

1. uma operação privilegiada é preparada: criação de vault, rebalance, rescue, fee distribution, pause ou unpause;
2. o payload exato da ação é hasheado;
3. a DPO2U verifica que o predicado correspondente retornou `PASS` para esse `evidence_hash`;
4. a surface de operador da DeFindex só prepara a transação não assinada se o verdict for `PASS`;
5. o operador assina e transmite; a DPO2U não custodia chave nem move valor.

O repo já carrega os dois padrões: ASP/SPP documenta admissão, enquanto `DefindexPolicyGateway` e o live slice de proof-bound execution documentam execução.

## Surfaces de política sugeridas

### Predicados dedicados para operações DeFindex

| Operação DeFindex | Papel | Predicado DPO2U |
|---|---|---|
| `createVault` | Manager | `defindex_vault_create_v1` |
| `rebalanceVault` | Rebalance Manager | `defindex_rebalance_v1` |
| `rescueVault` | Emergency Manager | `defindex_rescue_v1` |
| `distributeFees` | Fee Receiver | `defindex_fee_distrib_v1` |
| `pauseStrategy` | Emergency Manager | `defindex_pause_v1` |
| `unpauseStrategy` | Emergency Manager | `defindex_unpause_v1` |

### Predicados legais transversais do catálogo

| Necessidade | IDs candidatos |
|---|---|
| boundary de privacidade/disclosure BR | `lgpd_compliance_v1`, `consent_record_v1`, `erasure_v1`, `dsr_request_v1` |
| operador e safeguards VASP/PSAV BR | `sect_bcb_14478_v1`, `vasp_por_br_v1` |
| mandato de vault / governança de fundo | `sect_cvm_175_v1`, `cvm_token_v1` |
| mensageria de transferência | `travel_rule_v1`, `sect_fatf_tr_v1` |
| safeguards de reserve/asset | `micar_art_v1`, `micar_casp_v1`, `vasp_por_br_v1` |
| reporting | `sect_rfb_1888_v1`, `sect_cvm_175_v1` |

## Anti-overclaim

A DPO2U **não** está alegando:

- executar KYC, liveness, sanctions screening ou coleta documental por si só;
- colocar PII em Stellar ou dentro de vault DeFindex;
- que a DeFindex suporta allowlist nativa on-chain para depósitos retail;
- que todo depósito de usuário em vault DeFindex está gated por KYC neste repo;
- que já existe um mega-circuito legal multi-jurisdição em V1;
- que permissões de API/operator da DeFindex estão totalmente abertas para nós;
- que o sistema está pronto para produção/mainnet, governança completa ou substitui parecer jurídico regulatório.

A claim mais forte e honesta é mais estreita:

> **A DPO2U consegue transformar resultados jurídico-políticos em condições verificáveis de admissão e execução, e o slice DeFindex prova que uma ação financeira privilegiada pode ser bound a proof-gated execution em Stellar.**

## Escopo V1 e non-goals

### Escopo V1

- framing canônico da DPO2U como infraestrutura de resultado de compliance, não como operação de KYC;
- um loop de execução privilegiada DeFindex por vez;
- binding de `evidence_hash` ao payload exato da ação;
- autorização fail-closed: `PASS` permite; `FAIL`, `REVIEW` ou ausência de atestação negam;
- LGPD como boundary de disclosure/privacidade;
- PSAV/VASP como regime de operador/safeguards;
- CVM 175 como âncora de mandato institucional e governança de rebalance;
- Travel Rule como circuito específico de transferência/reporting, e não o regime inteiro.

### Non-goals

- claims de gating retail para depósitos DeFindex;
- circuito global generalizado de compliance;
- custódia, assinatura ou movimentação de valor pela DPO2U;
- determinação legal final para toda e qualquer jurisdição;
- substituição da DeFindex, do SPP, do onboarding wallet ou da operação de prestador regulado.
