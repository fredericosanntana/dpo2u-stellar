# PRD — Pulso × DPO2U × DeFindex: Compliance as the Policy Gate for Institutional Vaults on Stellar

**Produto:** DPO2U Policy Gateway × DeFindex Vault Fabric
**Contexto:** PULSO Hackathon (NearX × Stellar Development Foundation)
**Tese central:** *Prove, don't perform* — compliance como primitiva verificável que **autoriza operações privilegiadas de vault**, não como KYC re-executado em cada depósito.

---

## 0. Controle do documento

| Campo | Valor |
|---|---|
| **Versão** | 0.1 (draft, honest scope) |
| **Owner** | Fred (arquitetura / posicionamento) |
| **Status** | Draft para validação com o time DeFindex; slice de SDK já implementado neste repo |
| **Audiência** | Time interno + handoff técnico para DeFindex |
| **Docs relacionados** | `README.md`, `docs/DPO2U-STELLAR-DEFINDEX-COMPLIANCE-LAYER-PRD.md`, `docs/STELLAR-DEFINDEX-LEGAL-CIRCUITS-MEMO.md`, `docs/PULSO-DPO2U-ASP-PRD-v1.1-reviewed.md`, `docs/S4-LIVE-REGISTRY-TO-SPP-REPORT.md`, `docs/S8-EXTERNAL-ASP-BOUNDARY-REPORT.md` |
| **Código** | `sdk/src/DefindexPolicyGateway.ts`, `sdk/src/defindex-policy-types.ts`, `sdk/src/__tests__/DefindexPolicyGateway.test.ts` |
| **Entidade** | DPO2U (camada de infraestrutura de atestação verificável em Stellar/Soroman). |

---

> **Canonical update:** the current canonical legal/product framing for DPO2U as the Stellar/DeFindex compliance layer is now split into `docs/STELLAR-DEFINDEX-LEGAL-CIRCUITS-MEMO.md` and `docs/DPO2U-STELLAR-DEFINDEX-COMPLIANCE-LAYER-PRD.md`. This draft remains useful for the original DeFindex gateway thesis and SDK slice, but the newer docs are the source of truth for the LGPD + PSAV/VASP + CVM 175 + Travel Rule legal-circuit framing and the explicit anti-overclaim boundaries.

## 1. Sumário executivo (tese)

A DPO2U constrói a **camada de credencial positiva** sobre Stellar: uma atestação on-chain prova, de forma verificável e sem reexpor PII, que um predicado de compliance foi satisfeito (`prove, don't perform`). Esse substrato já está provado em código neste repo — registry canônico com revogação, ASP com Merkle root real, e lane ZK BN254/Groth16 (ver `README.md` → *Estado real hoje*).

A DeFindex é o **vault fabric** institucional de Stellar: cria e opera cofres geridos, com papéis on-chain explícitos — **Manager, Emergency Manager, Rebalance Manager, Fee Receiver** — e operações role-gated de criação, rebalance, resgate de emergência, pausa de estratégia e distribuição de taxas.

A tese deste PRD é a interseção honesta dessas duas camadas:

> **DPO2U é o gate de política para as operações privilegiadas de um vault DeFindex.**
> Antes de um Manager criar um vault, de um Rebalance Manager rebalancear, ou de um Emergency Manager resgatar fundos, a ação é autorizada por uma **atestação DPO2U que verifica on-chain**.

O ponto load-bearing é estrutural, não cosmético: **um endereço de papel (role) num vault DeFindex pode ser um smart contract.** Logo, um contrato de política DPO2U pode, no alvo, **ocupar um papel** e só emitir/assinar a ação privilegiada quando o veredito verificar. O slice de SDK entregue neste sprint é a expressão off-chain (operator-surface) desse alvo: uma direção concreta de integração que pode ser entregue ao time DeFindex.

---

## 2. Por que DeFindex é o framing institucional mais forte que Etherfuse para Stellar

| Eixo | Etherfuse (stablecoin/yield bond-backed) | **DeFindex (vault fabric)** |
|---|---|---|
| **Superfície de controle** | Emissão/colateral de um produto de dívida; o ponto de compliance é o emissor, não componível por terceiros | **Papéis on-chain explícitos** (Manager/Emergency/Rebalance/Fee) que são exatamente os pontos onde uma política externa pode plugar |
| **Componibilidade da política** | Limitada; compliance é interno ao emissor | Role address **pode ser contrato** → DPO2U pode ocupar um papel sem fork do protocolo |
| **Tese institucional** | "compre um instrumento conforme" | "**opere uma tesouraria conforme**" — mandato, rebalance sob risco aprovado, resgate sancionado |
| **Encaixe com a DPO2U** | DPO2U seria um selo externo ao produto | DPO2U vira **gate de autorização** das ações privilegiadas — *load-bearing*, não decorativo |
| **Narrativa de hackathon** | "outro stablecoin com selo" | "**fabric de vaults institucionais com política verificável**" |

O argumento decisivo: a DeFindex já expõe a articulação (papéis role-gated + role-as-contract) que a tese DPO2U precisa para ser **carregadora de peso**. Com Etherfuse, a DPO2U seria um adesivo de conformidade ao lado do produto; com DeFindex, a DPO2U é a **condição de execução** da operação privilegiada.

---

## 3. Verdade atual / alvo / não-objetivos

| Item | **Verdade hoje (neste repo)** | **Alvo** | **Não-objetivo (não alegamos)** |
|---|---|---|---|
| Atestação verificável on-chain | Real — `AttestationClient.verify` lê `verify_attestation` por simulação read-only | — | — |
| Policy gateway DPO2U→DeFindex | Real como **slice de SDK** com cliente DeFindex injetado (sem I/O de rede em teste) | Adapter real sobre `@defindex/sdk` + role-as-contract on-chain | Integração live em mainnet DeFindex já concluída |
| Papéis de vault gated por atestação | Modelado e testado (PASS autoriza, FAIL/ausente nega) | Contrato de política DPO2U ocupando um papel do vault | "Vault DeFinex já controlado por nós em produção" |
| Gating de depósito de usuário | **Não alegado como capacidade on-chain** | Possível política off-chain de UX, claramente marcada | Allowlist on-chain de depósito retail (DeFindex **não** documenta isso) |
| Assinatura/broadcast da ação | Fora de escopo do gateway — só **prepara** tx não assinada | Operator assina e envia (`sendTransaction`) | Gateway custodiando chave ou movendo valor |

**Princípio de honestidade (idêntico ao do track ASP/SPP, ver `S8`):** o boundary que falta para a versão on-chain plena é de **governança/autoridade operacional** (ocupar um papel num vault real), não de viabilidade técnica do gating.

---

## 4. Arquitetura do control-plane

Três camadas, com fronteiras explícitas:

```text
┌──────────────────────────────────────────────────────────────────────┐
│ 1. DPO2U REGISTRY + ASP / POLICY LAYER  (já real neste repo)           │
│    - protocol-registry: atestação canônica + revogação                 │
│    - asp-mvp: conjunto positivo com Merkle root real                   │
│    - AttestationClient.verify(useCaseId, evidenceHash) -> Verdict      │
│      (PASS / FAIL / REVIEW), leitura read-only sem fee                  │
└───────────────┬──────────────────────────────────────────────────────┘
                │  verdict verificável (prove, don't perform)
                ▼
┌──────────────────────────────────────────────────────────────────────┐
│ 2. DPO2U POLICY GATEWAY  (slice entregue: sdk/DefindexPolicyGateway)   │
│    - mapeia operação privilegiada -> (papel DeFindex, use_case_id)     │
│    - authorize(): fail-closed; só PASS autoriza                        │
│    - prepara tx não assinada quando autorizado; nunca quando negado    │
└───────────────┬──────────────────────────────────────────────────────┘
                │  PolicyDecision { allowed, reason, requiredRole, ... }
                ▼
┌──────────────────────────────────────────────────────────────────────┐
│ 3. DEFINDEX VAULT / OPERATOR LAYER                                     │
│    - papéis: Manager / Emergency Manager / Rebalance Manager / Fee     │
│    - createVault / rebalance / emergencyRescue / pause / distribute    │
│    - DEPÓSITOS/SAQUES são user-facing (sem allowlist on-chain)         │
│    - role address pode ser contrato -> hook para política on-chain     │
└──────────────────────────────────────────────────────────────────────┘
```

Fluxo de uma operação:

1. Operator solicita uma operação privilegiada (ex.: rebalance) + um **evidence hash** (hash do payload da ação).
2. O **DPO2U compliance engine** (MCP/gateway off-chain) computa o veredito e **submete a atestação** sob `(use_case_id, evidence_hash)`.
3. O **Policy Gateway** chama `verify(useCaseId, evidenceHash)`; se `PASS`, autoriza; senão, **nega fail-closed**.
4. Quando autorizado, o gateway chama o **cliente DeFindex injetado** para **preparar** a tx; o operator assina e faz broadcast.

---

## 5. Pontos de integração honestos (exatos)

Cada operação privilegiada é mapeada para o papel DeFindex que a executa nativamente e para o `use_case_id` DPO2U que a porteia. (Tabela espelha `DEFAULT_OPERATION_POLICIES` em `sdk/src/defindex-policy-types.ts`.)

| Operação | Papel DeFindex | DPO2U `use_case_id` | Racional do gate |
|---|---|---|---|
| `createVault` | Manager | `defindex_vault_create_v1` | Novo vault gerido precisa passar por mandato de tesouraria / MiCAR-ART / CVM-175 antes de provisionar |
| `rebalanceVault` | Rebalance Manager | `defindex_rebalance_v1` | Realocação entre estratégias deve casar com o mandato/risco aprovado e ligado no evidence hash |
| `rescueVault` (emergency) | Emergency Manager | `defindex_rescue_v1` | Resgate de emergência é alto impacto; gate por atestação de incidente/autorização (resgate provadamente sancionado) |
| `distributeFees` | Fee Receiver | `defindex_fee_distrib_v1` | Distribuição de taxas ao destino gated por atestação de settlement/AML do destinatário |
| `pauseStrategy` | Emergency Manager | `defindex_pause_v1` | Pausa é ação protetiva; exigir atestação de incidente/risco para manter trilha de auditoria |
| `unpauseStrategy` | Emergency Manager | `defindex_unpause_v1` | Retomar estratégia pausada deve re-passar pela atestação de risco que justificou a pausa |

**Superfícies `@defindex/sdk` úteis (do material DeFindex):** `createVault`, `getVaultInfo`, `getVaultBalance`, `getVaultAPY`, `depositToVault`, `withdrawFromVault`, `rebalance`, emergency rescue, pause/unpause strategy, `sendTransaction`. O gateway consome apenas as **operator surfaces** (create/rebalance/rescue/pause/unpause/fee) — não as de depósito/saque do usuário.

> **Nota explícita (anti-overclaim):** os docs DeFindex descrevem **depósitos e saques como abertos ao usuário**, sem allowlist on-chain. Apenas as operações **privilegiadas** são role-gated. Portanto este produto **não** alega "gate de KYC retail em cada depósito" como capacidade nativa on-chain. Qualquer política de depósito seria **off-chain (UX), e marcada como tal** — não está no slice atual.

---

## 6. Moonshot — Compliant Treasury Rails / Policy-Controlled Institutional Vault Fabric on Stellar

O alvo de longo prazo: a DPO2U como **camada de autorização programável de tesourarias institucionais** sobre o vault fabric da DeFindex.

- **Role-as-contract pleno:** um contrato de política DPO2U ocupa o papel de Manager/Emergency/Rebalance de um vault. A ação privilegiada só é assinável quando o veredito verifica on-chain — autorização **na própria mecânica do protocolo**, não num middleware confiável.
- **Mandato verificável:** cada vault carrega um mandato (risco, jurisdição, contraparte) cujo cumprimento é provado por atestação a cada rebalance — *compliance contínuo*, não auditoria pontual.
- **Rails de tesouraria conforme:** fundos institucionais (ex.: stablecoin reserve / ART sob MiCAR, fundo CVM-175) operados como vaults DeFindex onde cada operação privilegiada deixa trilha de atestação pública e revogável.
- **Componibilidade com a lane ASP/ZK existente:** o mesmo registry que admite/revoga membros do conjunto positivo (track ASP/SPP) pode revogar a autorização operacional de um papel — *kill-switch* de governança verificável.

A tese: **transformar "fundo conforme" de um selo de auditoria num invariante de execução on-chain.**

---

## 7. MVP do hackathon e fases seguintes

### MVP (entregue neste sprint)
- `DefindexPolicyGateway` no SDK: mapeia operação → (papel, use_case_id), autoriza fail-closed via atestação DPO2U, e prepara tx via cliente DeFindex injetado.
- Cobertura de teste: PASS autoriza; FAIL/ausente/REVIEW negam; mapeamento de múltiplas operações; helper de execução não chama o cliente DeFindex quando negado.
- `npm test` e `npm run build` verdes (ver relatório de sprint).

### Fase 1 — Adapter real `@defindex/sdk`
- Implementar `DefindexSdkAdapter implements DefindexOperatorClient` envolvendo o SDK DeFindex real (sketch já documentado em `defindex-policy-types.ts`).
- Demo testnet: createVault e rebalance preparados e assinados após PASS real.

### Fase 2 — Role-as-contract on-chain
- Contrato de política DPO2U que ocupa um papel (ex.: Rebalance Manager) de um vault testnet e exige `verify_attestation` antes de `require_auth`.
- Espelha o boundary fechado do track ASP/SPP: viável tecnicamente, dependente de **governança/autoridade** sobre o vault.

### Fase 3 — Mandato verificável + integração ASP/ZK
- Ligar revogação canônica (registry) ao kill-switch operacional do papel.
- Mandato de risco como predicado ZK (lane BN254 existente) para rebalance privado-mas-conforme.

---

## 8. Perguntas abertas para validar com o time DeFindex

1. **Role-as-contract:** o `createVault` aceita endereços de papel `C…` (contrato) hoje em testnet? Há `require_auth` no contrato de papel ou a autorização é por endereço simples?
2. **Assinatura das ações privilegiadas:** `rebalance`/emergency rescue exigem assinatura do endereço do papel via `require_auth`, ou há um fluxo de autorização delegável que um contrato de política poderia satisfazer?
3. **Superfície exata do `@defindex/sdk`:** nomes/assinaturas reais de `createVault`, `rebalance`, emergency rescue e pause/unpause (para fechar o adapter). O SDK retorna XDR não assinada para o caller assinar?
4. **Fee Receiver:** a distribuição de taxas é uma ação ativa (chamável) ou um endpoint passivo? Isso define se `distributeFees` é gateável como operação.
5. **Pausa de estratégia:** quais papéis podem pausar/despausar? Confirmar Emergency Manager vs Manager.
6. **Eventos on-chain:** quais eventos as operações privilegiadas emitem? (Necessário para o watcher idempotente, espelhando `S7`.)
7. **Boundary de governança:** caminho recomendado para um terceiro (DPO2U) deter um papel num vault gerido por um operador institucional — delegação vs redeploy.

---

## 9. Glossário de honestidade (o que é real vs. alvo)

- **Real agora:** verificação de atestação on-chain; o gateway de política como código TypeScript testado com cliente DeFindex injetado.
- **Alvo (Fase 1+):** adapter sobre o `@defindex/sdk` real e contrato de papel on-chain.
- **Nunca alegado:** allowlist on-chain de depósito retail; custódia/movimentação de valor pelo gateway; integração DeFindex mainnet já concluída.

> Mesma disciplina do resto do repo: o slice é **estreito e verdadeiro**, não uma abstração genérica que promete mais do que o código entrega.
