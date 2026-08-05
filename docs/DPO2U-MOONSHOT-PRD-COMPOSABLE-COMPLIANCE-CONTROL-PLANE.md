# PRD — DPO2U Moonshot: Composable Compliance Control Plane

**Status:** draft canônico para tese moonshot  
**Produto:** DPO2U como control plane de admissibilidade verificável para ações institucionais programáveis  
**Horizonte:** além do hackathon / 24–36 meses  
**Owner:** Frederico Santana / DPO2U  
**Base de evidência:** `docs/DEFINDEX-PROOF-BOUND-EXECUTION-LIVE-SLICE.md`, `docs/S4-LIVE-REGISTRY-TO-SPP-REPORT.md`, `docs/ARCHITECTURE-B-FIRST-CONTROL-PLANE.md`, `docs/2026-06-15-moonshots-zk-5-6.md`, `docs/DPO2U-STELLAR-DEFINDEX-COMPLIANCE-LAYER-PRD.md`, `docs/PHASE2-OPERATOR-SAFEGUARDS-PRD.md`, `docs/THREE-VERTENTES-ROADMAP.md`

---

## 0. Tese em uma frase

> **A DPO2U quer se tornar a camada canônica de admissibilidade verificável para ações institucionais privilegiadas — componível com wallets, intents, vaults, rails e múltiplas chains.**

Em termos mais duros:

> **A DPO2U é o control plane de compliance para execução institucional programável.**

Isso é maior do que:
- um app de compliance;
- um dashboard regulatório;
- um módulo de KYC;
- um plugin de Travel Rule;
- uma integração pontual de hackathon.

A categoria buscada é outra:

> **admission-as-protocol**.

---

## 1. Por que este PRD existe

O hackathon resolve apenas a primeira pergunta:

> "A tese básica funciona?"

O moonshot responde a pergunta importante:

> "Se essa tese funciona, qual é a arquitetura de categoria que a DPO2U deve ocupar no ecossistema?"

Os sinais recebidos em torno de **Privy**, **NEAR Intents** e **composability/cross-chain rails em Stellar** são úteis exatamente porque mostram que o mercado está convergindo para cinco camadas:

1. **wallet / identity / signer control**;
2. **intent orchestration**;
3. **execution sinks** (vaults, treasuries, strategies, issuers);
4. **asset/liquidity rails**;
5. **policy / admissibility**.

O moonshot da DPO2U é ocupar a quinta camada de forma canônica.

---

## 2. Problema estrutural

Hoje, quando uma ação institucional sensível acontece em crypto ou infra programável, a execução costuma depender de um destes modelos:

- confiança humana num operador;
- dashboard/regra off-chain sem enforcement real;
- política local de um parceiro isolado;
- auditoria ex post, sem capacidade real de impedir a ação;
- reexecução manual do mesmo raciocínio regulatório em cada aplicação.

Esse modelo falha exatamente onde instituições mais precisam de garantias:

- rebalance de vault;
- rescue / pause / unpause;
- movimentação de treasury;
- emissão / distribuição de ativo regulado;
- bridge / settlement cross-chain;
- delegated execution por bot, signer ou operador terceirizado.

O mercado tem rails e execution surfaces. O que ainda falta é uma primitive comum para responder:

> **esta ação pode acontecer, por este ator, neste contexto, com estas salvaguardas, e com trilha verificável suficiente?**

---

## 3. Insight central

A DPO2U não precisa substituir parceiros como Privy, NEAR Intents, DeFindex ou CCTP-like rails.

Ela precisa se colocar **entre intenção e execução**, convertendo:

- resultado jurídico-regulatório;
- mandato operacional;
- safeguards posture;
- evidência de disclosure/reporting;
- contexto exato da ação;

em uma coisa simples e composável:

> **um verdict verificável de admissão/execução**.

Esse verdict pode então gatear:

- criação de vault;
- rebalance;
- fee distribution;
- emergency rescue;
- operator admission;
- intent execution;
- bridge/transfer route;
- settlement right.

---

## 4. Base de evidência já provada

Este PRD não parte do zero. Ele só faz sentido porque o repo já sustenta algumas claims load-bearing.

### 4.1. Registry truth + revogação já existem

`docs/S4-LIVE-REGISTRY-TO-SPP-REPORT.md` já prova:
- deploy vivo de `protocol-registry` em testnet;
- extração live da decisão canônica;
- bridge live → SPP;
- revogação canônica com bloqueio efetivo de re-entry.

Leitura estratégica:
- a DPO2U já tem um embrião real de **policy truth**;
- a revogação já é parte da mecânica, não apêndice documental.

### 4.2. Ação privilegiada proof-bound já foi executada

`docs/DEFINDEX-PROOF-BOUND-EXECUTION-LIVE-SLICE.md` já prova:
- criação de vault real DeFindex em testnet;
- rewiring live do gate;
- geração de prova ligada ao contexto derivado do intent;
- rebalance live executado;
- confirmação on-chain do efeito.

Leitura estratégica:
- a DPO2U já deixou de ser só verificação e já entrou em **execution gating**.

### 4.3. A arquitetura de control plane já foi explicitada

`docs/ARCHITECTURE-B-FIRST-CONTROL-PLANE.md` já fixa a leitura correta:
- **policy truth** no registry;
- **execution truth** na lane própria;
- **audit/comparability truth** na boundary externa.

Leitura estratégica:
- a DPO2U já tem linguagem de control plane, mesmo antes de formalizar o moonshot.

### 4.4. A portabilidade cross-chain já foi parcialmente provada

`docs/2026-06-15-moonshots-zk-5-6.md` já prova:
- agregação off-chain de múltiplas provas/jurisdições;
- mesma família BN254/Groth16 sendo reutilizada;
- verificação on-chain em **Stellar + EVM + Solana**;
- padrão de attestation cross-chain com courier trust explicitado.

Leitura estratégica:
- a DPO2U já tem o início de um **proof fabric multi-chain**;
- o moonshot não é ficção; ele já tem trilho técnico aberto.

---

## 5. Definição do produto moonshot

## 5.1. One-liner

> **DPO2U é a camada de admissibilidade verificável que permite a qualquer aplicação institucional provar que uma ação sensível está autorizada antes de executá-la.**

## 5.2. O que o produto é

- control plane de policy/admission;
- registry canônico de verdicts e revogações;
- proof/attestation fabric ligado a contexto exato de ação;
- adapter network para execution surfaces;
- trilha auditável, revogável e componível.

## 5.3. O que o produto não é

- não é wallet provider;
- não é intent network;
- não é vault protocol;
- não é bridge;
- não é issuer de stablecoin;
- não é parecer jurídico universal autoexecutável para qualquer caso;
- não é um KYC vendor disfarçado.

---

## 6. Parceiros e caminho de composabilidade

### 6.1. Privy — wallet / identity / signer plane

**Função do parceiro:** autenticação, embedded wallets, server wallets, signers delegados, policy controls locais.

**Lugar da DPO2U:** gate externo de admissibilidade.

#### Composição alvo
1. Privy autentica operador e provisiona wallet/signer.
2. Operador ou bot monta uma ação institucional.
3. DPO2U recebe intent/payload/contexto.
4. DPO2U devolve `PASS / FAIL / REVIEW / EXPIRED / REVOKED` com binding ao hash/contexto.
5. Apenas então o signer/wallet executa.

#### Tese resultante
> **policy-attested delegated execution**.

#### Valor estratégico
A Privy resolve o problema de **quem assina / com qual custódia**. A DPO2U resolve **se essa assinatura pode destravar a ação**.

---

### 6.2. NEAR Intents — orchestration plane

**Função do parceiro:** estruturação de execução orientada por intents, verifier surfaces, bridges, orchestration.

**Lugar da DPO2U:** camada de **intent admission**.

#### Composição alvo
1. Usuário/operador declara a intent.
2. O orchestrator encontra ou propõe a rota de execução.
3. Antes da execução final, DPO2U verifica:
   - elegibilidade do ator;
   - jurisdição;
   - safeguards;
   - mandate fit;
   - reporting/disclosure obligations;
   - validade temporal do direito de executar.
4. O resultado admissível vira condição para settlement/execução.

#### Tese resultante
> **intent execution is cheap; intent admissibility is scarce**.

#### Valor estratégico
A NEAR Intents aponta a direção do mercado. A DPO2U não precisa disputar a rede de intents; ela precisa dominar a camada de **admissibilidade da intent**.

---

### 6.3. DeFindex — execution sink / treasury plane

**Função do parceiro:** vault fabric institucional, roles explícitos, rebalance/rescue/pause/fee flows.

**Lugar da DPO2U:** gate de ações privilegiadas.

#### Composição alvo
- `createVault` condicionado a mandato verificável;
- `rebalance` condicionado a intent/context proof-bound;
- `rescue/pause/unpause` condicionados a incidente / safeguards posture;
- `fee distribution` condicionada a reporting / settlement posture.

#### Tese resultante
> **institutional treasury actions should be policy-gated by default**.

#### Valor estratégico
DeFindex é hoje o melhor sink para provar que DPO2U não é “compliance as dashboard”, e sim **compliance as execution condition**.

---

### 6.4. Etherfuse / asset issuers — asset plane

**Função do parceiro:** ativo institucional, stable asset, issuance/distribution story.

**Lugar da DPO2U:** governança de acesso a superfícies sensíveis do ativo/fluxo.

#### Composição alvo
- admissão a produto/vault/canal de distribuição;
- autorização de operadores ou counterparties;
- settlement rights condicionados a política;
- distribuição institucional com disclosure mínimo e trilha verificável.

#### Tese resultante
> **asset legitimacy is not enough; action legitimacy around the asset must also be programmable**.

#### Valor estratégico
Etherfuse aproxima a tese de fluxos econômicos reais e ajuda a posicionar a DPO2U como infraestrutura de capital regulado, não apenas governança abstrata.

---

### 6.5. CCTP / cross-chain rails — liquidity mobility plane

**Função do parceiro:** mover valor/liquidez entre ambientes.

**Lugar da DPO2U:** âncora de policy para origem, rota e destino.

#### Composição alvo
- verificar quem pode iniciar a rota;
- verificar se a rota/destino é elegível sob dado mandato;
- prender a admissibilidade ao payload e à janela temporal;
- exigir attestation antes da emissão/execução no destino;
- reaproveitar proof fabric multi-chain quando possível.

#### Tese resultante
> **capital can move cross-chain, but admissibility should remain locally verifiable and globally portable**.

#### Valor estratégico
Aqui a DPO2U deixa de ser só uma camada Stellar-native e começa a virar **policy portability layer**.

---

## 7. Arquitetura-alvo

```text
┌─────────────────────────────────────────────────────────────────────┐
│ 1. POLICY TRUTH LAYER                                              │
│    - protocol-registry                                             │
│    - revocation truth                                              │
│    - canonical policy scopes                                       │
│    - operator / jurisdiction / mandate / safeguard states          │
└───────────────┬─────────────────────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 2. PROOF / ATTESTATION FABRIC                                      │
│    - evidence_hash / context binding                               │
│    - ZK or non-ZK verdicts                                         │
│    - aggregate proofs / context roots                              │
│    - cross-chain portable claims                                   │
└───────────────┬─────────────────────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 3. ADMISSION API / DECISION ENGINE                                 │
│    - request_admission(...)                                        │
│    - verify_claim(...)                                             │
│    - revoke_claim(...)                                             │
│    - explain_denial(...)                                           │
│    - attest_execution_window(...)                                  │
└───────────────┬─────────────────────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 4. ADAPTER NETWORK                                                 │
│    - wallet/signers (Privy-like)                                   │
│    - intents/orchestrators (NEAR-like)                             │
│    - vaults/treasuries (DeFindex-like)                             │
│    - asset/issuer surfaces                                         │
│    - cross-chain relayers/settlement surfaces                      │
└───────────────┬─────────────────────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 5. EXECUTION + AUDIT                                               │
│    - local execution                                               │
│    - external comparability                                        │
│    - audit trails                                                  │
│    - revocation / deny / expiry feedback loops                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 8. Primitivas canônicas do moonshot

O produto moonshot precisa convergir para um conjunto pequeno de primitivas reutilizáveis.

### 8.1. `request_admission(...)`
Recebe:
- ator;
- ação/intenção;
- payload hash;
- jurisdição;
- papel requerido;
- ativo/rota quando aplicável;
- escopo temporal;
- contexto adicional.

Retorna:
- `PASS / FAIL / REVIEW / EXPIRED / REVOKED`;
- claim/verdict id;
- expiry;
- explanation code;
- context root / evidence binding.

### 8.2. `verify_claim(...)`
Permite que qualquer sink de execução verifique, de modo independente, se o direito ainda é válido para aquele contexto.

### 8.3. `revoke_claim(...)`
Transforma revogação em parte nativa do produto.

### 8.4. `derive_context(...)`
Padroniza como o contexto exato da ação vira commitment verificável.

### 8.5. `explain_denial(...)`
Converte o deny path em algo auditável e operacionalmente útil, sem vazar dossiê bruto.

### 8.6. `attest_execution_window(...)`
Permite que direitos de execução sejam temporais, renováveis e fail-closed.

---

## 9. Casos de uso moonshot

### 9.1. Policy-gated treasury
Uma tesouraria institucional só rebalanceia, resgata ou redistribui taxas quando o mandato e a postura de safeguards ainda estiverem válidos.

### 9.2. Delegated operator finance
Bots, signers e operadores terceirizados podem agir, mas apenas com admissibilidade verificável e expirável.

### 9.3. Compliant capital routes
Fluxos de valor entre vaults, issuers e rails só executam quando origem, destino e contexto forem admissíveis.

### 9.4. Institutional intent execution
Uma intent pode ser resolvida por qualquer engine/orchestrator, mas a execução depende de verdict DPO2U.

### 9.5. Multi-jurisdiction proof portability
Uma claim de elegibilidade ou postura pode ser verificada em diferentes chains ou contexts, sem reprocessar o dossiê inteiro em cada uma.

### 9.6. Public-sector and enterprise policy lanes
O mesmo núcleo serve tanto para:
- setor público (`Gov`);
- tesouraria privada / Web3 institucional;
- operações reguladas transfronteiriças.

---

## 10. Usuários e compradores

### Usuário operacional
- operador institucional;
- tesouraria;
- time de risco/compliance;
- app integrador;
- orchestrator;
- auditor/parceiro.

### Comprador
- protocolo/partner que precisa destravar uso institucional;
- issuer/treasury/wealth layer;
- infra player que quer vender acesso institucional com melhor postura regulatória;
- organização pública ou enterprise com necessidade de enforcement verificável.

### Beneficiário indireto
- auditor independente;
- regulador;
- parceiro que precisa confiar sem ver todo o dossiê;
- usuário final cujo dado/PII não deve ser reexposto.

---

## 11. Roadmap do moonshot

### Horizonte 1 — 0 a 6 meses
**Objetivo:** consolidar a primitive em Stellar com sinks reais.

#### Entregas
1. endurecer `policy truth` + revocation loop como interface reutilizável;
2. consolidar DeFindex como sink canônico de privileged execution;
3. formalizar operador/safeguards/reporting layer da Fase 2;
4. publicar interface canônica de admission/verify/revoke;
5. preparar 1 adapter wallet/operator-side (Privy-compatible conceptually, mesmo que não integrado live ainda).

#### Critério de sucesso
- um sink real de execução provado repetivelmente;
- uma narrativa clara de “control plane”, não só demo ZK.

### Horizonte 2 — 6 a 18 meses
**Objetivo:** abrir composição com operador/wallet/intents/rails.

#### Entregas
1. primeiro adapter wallet/signer;
2. first-class intent admission model;
3. integração com um rail de asset/liquidity relevante;
4. claims temporais e revogáveis por action class;
5. prova comercial de que parceiro usa DPO2U para destravar acesso institucional.

#### Critério de sucesso
- DPO2U deixa de ser percebida como “feature legal” e vira “execution enabler”.

### Horizonte 3 — 18 a 36 meses
**Objetivo:** tornar a DPO2U um policy fabric multi-chain.

#### Entregas
1. proof portability madura entre Stellar + mais 1–2 chains;
2. aggregate claims / context roots para múltiplas jurisdições e frameworks;
3. control plane com múltiplos adapters ativos;
4. padrão de integração replicável para novos parceiros.

#### Critério de sucesso
- a categoria reconhecida pelo mercado passa a ser algo como:
  - compliance control plane;
  - verifiable admission network;
  - institutional authorization protocol.

---

## 12. Métricas norteadoras

### Produto
- número de execution sinks integrados;
- número de action classes gateadas;
- taxa de decisões verificáveis sem intervenção humana adicional;
- tempo médio entre `request_admission` e `verify_claim` consumível.

### Mercado
- número de partners que usam a DPO2U como enabler institucional;
- número de propostas onde DPO2U deixa de ser “compliance cost center” e vira “access unlock”; 
- quantidade de receitas associadas a surfaces operator-side / execution-side.

### Confiança
- % de deny/revoke paths auditáveis;
- % de claims com expiry bem definido;
- incidentes em que a revogação bloqueou execução indevida;
- superfícies onde o boundary honesto permanece explícito.

### Ecossistema
- número de chains onde a mesma lógica de admissibilidade pode ser verificada;
- número de policy templates reaproveitáveis por parceiros.

---

## 13. Trust boundaries e honestidade

Este moonshot só é bom se mantiver a disciplina do repo: **estreito, verdadeiro, anti-overclaim**.

### O que já podemos dizer
- existe policy truth viva;
- existe revogação canônica com efeito real;
- existe action gating live em sink real;
- existe base técnica de proof portability multi-chain.

### O que ainda não podemos dizer
- que a DPO2U já é um control plane multi-chain completo em produção;
- que integrações com Privy / NEAR Intents / CCTP estão prontas;
- que qualquer rail/partner já opera sob role-as-contract com DPO2U em produção;
- que todo fluxo retail ou público está nativamente gateado;
- que o agregador de provas já verifica tudo on-chain em qualquer target.

### Boundary canônico
O moonshot deve ser narrado como:

> **uma tese comprovada em primitives centrais e ainda em expansão nas surfaces de composição**.

Não como:

> **uma plataforma universal pronta e completa.**

---

## 14. Não-objetivos

Este PRD não manda a DPO2U:
- construir a melhor wallet stack do mercado;
- competir com intent networks como rede de matching/solver;
- competir com vault/asset/bridge providers no core business deles;
- oferecer cobertura regulatória irrestrita para qualquer jurisdição/vertical sem recorte;
- sacrificar boundary honesty em nome de narrativa comercial.

---

## 15. Decisão estratégica

Se a DPO2U seguir este PRD, a escolha estrutural é:

> **não ser app final, nem parceiro subordinado, nem plugin jurídico.**

A escolha é ser:

> **a primitive de admissibilidade verificável que outras superfícies precisam para vender, operar e auditar execução institucional programável.**

Essa é a leitura correta para além do hackathon.

---

## 16. Perguntas abertas

1. Qual parceiro deve virar o **primeiro adapter institucional comercial**: wallet/signer, vault, asset rail ou intent surface?
2. O primeiro produto comercial do moonshot deve vender:
   - `policy-gated treasury`,
   - `operator admission`,
   - `institutional intent admission`,
   - ou `cross-chain compliant routes`?
3. Onde a DPO2U captura mais valor primeiro: risco/compliance, execution unlock, ou audit portability?
4. Quais primitives devem virar API pública estável antes de expandir partners?
5. Em qual ponto vale formalizar um padrão de integração tipo `Admission Adapter Spec`?

---

## 17. Veredito

O moonshot não é “fazer mais integrações”.

O moonshot é:

> **transformar compliance de uma camada de opinião ou auditoria em uma condição universal de execução institucional.**

Se isso der certo, a DPO2U não será lembrada como um protocolo que “faz compliance para Stellar”.

Ela será lembrada como:

> **o control plane composável que tornou admissibilidade verificável uma primitive da economia programável.**
