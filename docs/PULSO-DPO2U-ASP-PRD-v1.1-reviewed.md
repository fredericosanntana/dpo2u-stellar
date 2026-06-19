# PRD — STRIX Compliance como ASP de Credencial Positiva sobre Stellar Privacy Pools

**Produto:** ASP Layer × SPP (Stellar Private Payments)  
**Contexto:** PULSO Hackathon (NearX × Stellar Development Foundation)  
**Tese central:** *Prove, don't perform* — compliance como primitiva verificável, não como serviço executado.

---

## 0. Controle do documento

| Campo | Valor |
|---|---|
| **Versão** | 1.1 (reviewed) |
| **Owner** | Fred (arquitetura / posicionamento) |
| **Build** | Lionel (lead dev) |
| **Discovery / comercial** | Paulo |
| **Status** | Revisado para execução; alinhado ao estado atual do repo + target do hackathon |
| **Audiência** | Time interno |
| **Docs relacionados** | `PULSO-Brasil-DPO2U-Briefing.md`, `docs/asp-protocol-mvp.md` |
| **Entidade** | DPO2U (camada de infraestrutura de atestação). Este build é DPO2U, distinto de produto Web2. |

---

## 1. Sumário executivo

A DPO2U está construindo a **camada de ASP (Association Set Provider) de credencial positiva** para Privacy Pools em Stellar, usando como alvo de integração o trilho **SPP (Stellar Private Payments)** da Nethermind.

A tese do build é simples:

> uma transferência pode ser **privada** e **comprovadamente conforme** ao mesmo tempo, desde que a associação ao conjunto permitido deixe de ser uma decisão manual e passe a ser **dirigida por atestação verificável**.

O ponto crítico de honestidade é este:

- o **substrato protocolar DPO2U** já está provado no repo `dpo2u-stellar`;
- a **integração específica com o SPP** é o alvo de execução deste build, não algo já totalmente concluído neste repo.

Hoje, o que já temos comprovado em código é:
- **registry canônico** com verificação de atestação, revogação, perfil/scope de issuer e stake/slash simbólico;
- **ASP MVP** com admissão gated por verificação canônica e **Merkle root real** do conjunto ativo;
- **privacy-pool slice** com prova BN254/Groth16 real, **nullifier real**, e **root history**, validado no slice atual `depth-4`;
- **cross-contract composition fail-closed** em Soroban.

O que o hackathon pede que aterrissemos agora é o próximo passo:
- ligar a atestação DPO2U ao ponto de admissão do SPP;
- substituir a inserção manual por um **Gateway ASP dirigido por atestação**;
- fechar uma demo ponta a ponta: **credencial → admissão → membership → transação privada**.

Por que isso é forte:
- a integração é **load-bearing**;
- o build está ancorado no core real da DPO2U (atestação verificável);
- o risco técnico central deixou de ser “isso funciona?” e passou a ser “como pousar isso no SPP com o escopo certo?”.

**Não** estamos construindo KYC/AML. Estamos construindo a camada que transforma o **resultado** de um KYC/AML feito a montante numa credencial verificável, privada e composable.

---

## 2. Problema & oportunidade

### 2.1 A tensão privacidade × compliance

Blockchains públicas forçam uma escolha falsa: transparência total ou opacidade total. Privacy Pools resolvem parte disso com ASPs — mas um ASP só é útil se o critério de associação for verificável e crível.

O default da indústria é exclusão: “todo mundo menos os ruins”. Isso não resolve o caso mais valioso para infraestrutura regulatória:

> provar **inclusão positiva** — isto é, que o sujeito satisfaz uma credencial exigida pela política, sem revelar sua identidade nem expor sua PII.

### 2.2 Por que agora

O substrato técnico amadureceu em Stellar:
- BLS12-381 desde o Protocol 22;
- BN254 + Poseidon/Poseidon2 no Protocol 25;
- novas host functions BN254 no Protocol 26;
- custo de verificação Groth16 compatível com uso em testnet;
- trilho público em construção via SDF + Nethermind (SPP).

O mercado, por sua vez, continua preso à falsa dicotomia:
- ou privacidade sem controle regulatório;
- ou compliance operacional que reexpõe dados e destrói portabilidade.

### 2.3 A tese DPO2U

Compliance deixa de ser um serviço que se **executa** e vira uma primitiva que se **prova**.

A DPO2U:
- não faz KYC documental;
- não roda sanções/PEP como surface principal;
- não toca PII on-chain;
- não compete com o pool.

A DPO2U transforma o resultado de uma verificação a montante numa credencial verificável, reutilizável e composable.

---

## 3. Posicionamento do produto

### 3.1 O que a DPO2U é

A camada de **atestação e credenciamento** que fornece o critério de associação ao conjunto conforme.

Em termos de produto/protocolo:
- a pool preserva privacidade;
- o circuito preserva integridade criptográfica;
- a DPO2U define **quem pode pertencer ao conjunto positivo**.

### 3.2 O que a DPO2U NÃO é

- **Não** executa KYC (documento, liveness, onboarding operacional).  
- **Não** executa AML/sanções/PEP como motor principal deste build.  
- **Não** custodia nem vê PII on-chain.  
- **Não** substitui o SPP/pool.  
- **Não** está alegando, neste build, um privacy pool production-ready.  

### 3.3 Pitch de uma linha

> A DPO2U é a camada de credencial positiva que permite a uma transação ser privada e comprovadamente conforme ao mesmo tempo — provando que você qualifica, sem revelar quem você é.

---

## 4. Estado atual vs build alvo

### 4.1 Matriz de verdade pública

| Bloco | Estado atual | Observação |
|---|---|---|
| Registry canônico de atestações | **Real agora** | Implementado e testado em `protocol-registry` |
| Revogação explícita | **Real agora** | Já muda o resultado de verificação canônica |
| Perfil/scope/trust tier/stake-slash simbólico | **Real agora** | Útil para modelagem de política; não é governança descentralizada |
| ASP mutable com root real | **Real agora** | Implementado em `asp-mvp` |
| Cross-contract fail-closed | **Real agora** | Registry → ASP e outros padrões no repo |
| Privacy-pool simbólica com ZK proof real + nullifier real | **Real agora** | Slice validado, `depth-4`, não custody/value-moving |
| Root history no privacy slice | **Real agora** | Já implementado no contrato atual |
| Gateway DPO2U → SPP `insert_leaf` | **Target do build** | Ainda precisa ser aterrado |
| Mapeamento atestação → leaf do SPP | **Target do build** | Ainda precisa ser congelado |
| Frontend credentialed-join no SPP | **Target do build** | Ainda precisa ser construído |
| Demo E2E sobre SPP | **Target do build** | Ainda sem evidência fechada neste repo |
| Mudança de circuito SPP / nova ceremony | **Fora de escopo** | Só roadmap |
| Mainnet | **Fora de escopo** | Testnet-first |

### 4.2 Implicação estratégica

O hackathon **não começa do zero**. O que já existe reduz o risco de viabilidade técnica do lado DPO2U. O trabalho agora é o **pouso de integração** no trilho SPP.

---

## 5. Visão da solução

### 5.1 O modelo em camadas

Privacy Pools têm três camadas:
1. **Contrato/pool** — gerencia estado/ativos;
2. **ZK** — garante privacidade/integridade criptográfica;
3. **ASP** — define o conjunto conforme.

A DPO2U entra no terceiro slot.

### 5.2 O que já está provado do lado DPO2U

No repo `dpo2u-stellar`, já existe uma prova material de que sabemos construir o lado de política e gating:
- verificação canônica de atestação;
- propagação de revogação;
- admission gate por cross-call fail-closed;
- Merkle root autenticada do conjunto ativo;
- slice ZK real com nullifier real.

### 5.3 O ponto de integração alvo

No SPP, a admissão na árvore de membership ainda depende de um caminho administrativo/manual.

**O hook de produto é este:**
- a DPO2U verifica uma credencial positiva;
- se válida, autoriza a entrada da chave/leaf no conjunto de association;
- a partir daí, o usuário pode provar pertencer ao conjunto positivo na transação privada.

### 5.4 O delta load-bearing da DPO2U

O build novo é um **ASP Gateway** que substitui curadoria humana por admissão dirigida por atestação.

Ele deve:
1. receber a credencial / prova necessária;
2. verificar issuer, predicado e validade;
3. derivar o leaf correto;
4. acionar a inserção no conjunto do SPP;
5. falhar fechado quando a verificação não passar.

### 5.5 Posturas de implementação

#### (A) Gateway atestação-gated — recomendado
- mantém controle de acesso;
- remove o humano manual;
- sustenta a narrativa mais forte.

#### (B) Admin único DPO2U — fallback
- verificação ocorre off-chain;
- a conta DPO2U faz a inserção;
- mais simples para deadline, menos elegante.

#### (C) Fallback de demo sobre primitives internas
Se o pouso no SPP ficar instável no prazo, ainda existe uma demo honesta apoiada no track interno:
- `protocol-registry → asp-mvp → privacy-pool`

Essa demo não substitui o target SPP, mas preserva a prova do mecanismo.

---

## 6. Arquitetura-alvo do build

### 6.1 Componentes

| Camada | Origem | Papel |
|---|---|---|
| Pool / circuitos / verifier | **SPP / Nethermind** | trilho de privacy pool alvo |
| Attestation registry / policy model | **DPO2U existente** | critério canônico de conformidade |
| ASP Gateway | **DPO2U novo** | converte credencial válida em admissão no set |
| Serviço de atestação | **DPO2U existente** | emite/verifica o predicado sem expor PII |
| Frontend credentialed-join | **DPO2U novo** | UX de ingresso no conjunto positivo |

### 6.2 Fluxo canônico

1. Usuário obtém credencial positiva.  
2. Usuário apresenta a credencial ao Gateway.  
3. Gateway verifica issuer, claim, jurisdição, validade e binding necessário.  
4. Gateway deriva o leaf e autoriza a inserção no conjunto do SPP.  
5. Usuário faz deposit.  
6. Usuário faz withdraw/transfer privada provando membership no conjunto positivo.  

---

## 7. Modelo de dados mínimo do v1

### 7.1 Campos mínimos da credencial

O v1 precisa congelar um schema mínimo:
- `subject_key` ou commitment equivalente;
- `claim_type` (ex.: `compliance_cleared`);
- `jurisdiction`;
- `valid_until`;
- `attestation_root` ou commitment verificável;
- metadado mínimo de issuer verificável.

### 7.2 Regra de simplificação

Para o hackathon:
- **um tipo de credencial**;
- **uma jurisdição principal**;
- **um issuer path**;
- sem multiplicar políticas cedo demais.

---

## 8. Requisitos funcionais

### P0 — críticos para o demo

- **FR-1** Trazer o SPP exato para o workspace e congelar a superfície de integração.  
- **FR-2** Definir o hook de admissão (`insert_leaf` ou equivalente) com seu modelo de auth e formato de leaf.  
- **FR-3** Construir o **ASP Gateway DPO2U → SPP**.  
- **FR-4** Congelar o schema v1 da credencial positiva.  
- **FR-5** Implementar o mapeamento credencial → leaf.  
- **FR-6** Demonstrar o caminho **credencial → admissão → membership → transação privada**.  
- **FR-7** Documentar runbook, endereços e evidência do fluxo.  

### P1 — fortalecem muito

- **FR-8** Caminho de revogação / remoção de membership.  
- **FR-9** View/log do conjunto de associação.  
- **FR-10** Frontend credentialed-join polish.  
- **FR-11** Fallback demo explícito sobre o track interno se necessário.  

### P2 — roadmap

- **FR-12** Binding mais forte dentro do circuito.  
- **FR-13** Ceremony/MPC mais robusta.  
- **FR-14** Mainnet.  
- **FR-15** Multi-issuer / governança mais descentralizada.  
- **FR-16** Gating de pagamentos agênticos (x402/MPP).  

---

## 9. Requisitos não-funcionais

- **Privacidade:** PII nunca on-chain.  
- **Segurança:** o Gateway não pode enfraquecer o controle de acesso.  
- **Honestidade de escopo:** o slice atual de privacy-pool é **prototype-real**, `depth-4`, não production-ready.  
- **Confiabilidade:** priorizar testnet fresca e replay controlado.  
- **Licenciamento:** respeitar obrigações do stack usado.  
- **Auditabilidade:** toda claim pública precisa ser sustentada por artefato verificável.  

---

## 10. Escopo do hackathon

### Dentro
- Pousar a integração de atestação no ponto de admissão do SPP.  
- Um tipo de credencial positiva.  
- Uma demo ponta a ponta.  
- Evidência verificável e replayável.  

### Fora
- Reescrever circuitos do SPP.  
- Mainnet.  
- Governança descentralizada de issuer.  
- Expansão completa de políticas/jurisdições no fluxo demo.  

---

## 11. Riscos & mitigação

| Risco | Mitigação |
|---|---|
| SPP landing zone mais complexa que o esperado | Fase de auditoria da superfície antes de codar |
| Overclaim entre repo atual e target SPP | Matriz explícita de verdade pública |
| Scope creep | 1 credencial, 1 jurisdição, 1 issuer, 1 happy path |
| Demo travar por integração final | Fallback B (admin-mediated) e fallback C (track interno) |
| Confusão sobre stake/slash | Manter como **simbólico/admin-controlled** |
| Narrativa de privacy pool exagerada | Usar “prototype-real slice”, não “pool production-ready” |

---

## 12. Como vencemos

### A tese vencedora

Não estamos adicionando um selo cosmético a uma pool existente.

Estamos tornando **load-bearing** a definição de quem pertence ao conjunto permitido — e fazendo isso de forma verificável, portable e privacy-preserving.

### O que isso mostra para juiz / investidor / ecossistema

- **Profundidade técnica:** integração real entre attestation layer e privacy stack.  
- **Impacto:** resolve a tensão privacidade × compliance sem reexpor PII.  
- **Execução:** usa componentes reais já provados, em vez de promessas abstratas.  
- **Disciplina de produto:** scope reduzido, tese forte, mecanismo comprovável.  

---

## 13. Frase de posicionamento final

> A DPO2U está aterrissando sua primitive de credencial positiva sobre o trilho de Privacy Pools em Stellar: o objetivo deste build é substituir curadoria manual por associação dirigida por atestação verificável, preservando privacidade sem abrir mão de conformidade comprovável.

---

## 14. Decisões executivas imediatas

1. Congelar wording público com base nesta versão.  
2. Trazer/inspecionar o SPP exato antes de nova implementação.  
3. Escolher o caminho A com fallback B.  
4. Congelar schema v1 da credencial antes de construir o Gateway.  
5. Defender P0 rígido: **nada de mexer em circuito se isso ameaçar o prazo**.  
