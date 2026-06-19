# SOTA Public Base — Execution Roadmap

**Status:** draft executivo-operacional  
**Data:** 2026-06-18

## Objetivo

Levar a DPO2U do estado atual de **hack slice forte e honesto** para uma **public-base compliance protocol spine** defensável perante hackathon, SCF, parceiros técnicos e auditoria preliminar.

## Princípio de escopo

Este roadmap **não** tenta entregar o whitepaper inteiro em um sprint.

Ele foca em fechar o pacote que mais aumenta verdade pública por unidade de esforço:

1. **Soroban verifier maduro como base pública**
2. **credential lifecycle completo**
3. **cross-chain canonical registry maduro**
4. **open standard**
5. **view-key / selective disclosure bounded e robusto**
6. **production-readiness gates explícitos**

## Fora do escopo desta fase

Não prometer como “done” nesta fase:
- verifier network descentralizado
- pool privado production-grade
- MPC ceremony madura
- anonimato de escala
- governance/staking/slashing descentralizados

---

## Estado de partida

### Já provado no repo
- `protocol-registry` com revogação canônica
- `asp-mvp` com membership mutável e root autenticada
- `registry -> blocked-lane` operacional na instância própria B-first
- watcher idempotente com persistência de evidência
- `privacy-pool` prototype-real com BN254/Groth16, root history e nullifier real
- boundary honesto: testnet/devnet, dev VK, sem token custody, sem MPC de produção

### Gap real para o whitepaper
Falta transformar esse conjunto em:
- **base pública padronizável**
- **semântica explícita de lifecycle**
- **disclosure bounded confiável**
- **gates claros de produção**

---

## Roadmap por sprints

| Sprint | Nome | Resultado | Owner primário | Gate de saída |
|---|---|---|---|---|
| **R1** | Public Truth Freeze | linguagem e superfícies públicas reconciliadas | Chairman/Hermes | docs centrais sem drift crítico |
| **R2** | Open Standard Draft | especificação inicial pública do protocolo | Chairman/Hermes | spec cobrindo invariantes/interfaces |
| **R3** | Credential Lifecycle | lifecycle completo documentado e reconciliado com contratos/testes | CEO/Claude Code | semântica issue/verify/revoke/freshness explícita |
| **R4** | Canonical Registry Maturity | história cross-chain/registry clara, com exemplos replayáveis | CEO/Claude Code | docs + scripts + trust assumptions fechados |
| **R5** | Disclosure Bounded MVP | selective disclosure/view-key bounded com trust model explícito | CEO/Claude Code | auth + consistency + docs de boundary |
| **R6** | Production Readiness Gates | pacote de gates para auditoria/pre-mainnet/public rollout | Chairman/Hermes | checklist/go-no-go fechado |
| **R7** | Full Revalidation & Public Surface Rewrite | revalidação total + rewrite final de superfícies públicas | Chairman/Hermes + CEO | testes verdes + wording honesto consolidado |

---

# Sprint R1 — Public Truth Freeze

## Objetivo
Congelar a verdade pública antes de expandir a surface.

## Entregáveis
- matriz `real / prototype-real / symbolic / roadmap`
- reconciliação dos docs centrais
- wording consistente entre:
  - `docs/asp-protocol-mvp.md`
  - `docs/hack-submission-latam-composability.md`
  - `docs/composability-quickstart.md`
  - whitepaper positioning surface

## Arquivos-alvo
- `docs/asp-protocol-mvp.md`
- `docs/hack-submission-latam-composability.md`
- `docs/composability-quickstart.md`
- `docs/FAQ-JUDGES-PARTNERS-AUDITORS.md`

## Dependências
- nenhuma

## Validação
- search zero para claims proibidas desta fase:
  - “production privacy pool”
  - “decentralized verifier network live”
  - “mature MPC”
  - “anonymity at scale”
- leitura manual dos 4 docs centrais

## Gate de saída
> Nenhum doc central induz o leitor a acreditar que production pool / MPC / shared governance já estão fechados.

---

# Sprint R2 — Open Standard Draft

## Objetivo
Converter comportamento do repo em uma **spec portável**.

## Entregáveis
Criar:
- `docs/OPEN-STANDARD-DRAFT.md`

## Conteúdo mínimo
- glossário
- entidades e papéis
- interfaces mínimas
- invariantes de verificação
- semântica de revogação e freshness
- semântica de claim / jurisdiction / issuer profile / stake scope
- perfis de conformidade:
  - `demo`
  - `public-base`
  - `production-target`

## Dependências
- R1 concluída

## Validação
- leitura completa do draft
- checagem de coerência com `protocol-registry` e `asp-mvp`

## Gate de saída
> Existe uma spec que permite descrever o protocolo sem depender de narrativa solta de README/hack pitch.

---

# Sprint R3 — Credential Lifecycle

## Objetivo
Fechar a semântica completa do credential lifecycle.

## Entregáveis
Criar:
- `docs/CREDENTIAL-LIFECYCLE-SPEC.md`

Reconciliar, se necessário:
- contratos
- testes
- comments/docs de surface pública

## Lifecycle mínimo
- issue
- verify
- revoke
- expire
- freshness window
- nullifier/epoch semantics (onde aplicável)
- status after revocation
- status after issuer-policy invalidation

## Arquivos prováveis
- `contracts/protocol-registry/**`
- `contracts/asp-mvp/**`
- `contracts/privacy-pool/**` (somente se lifecycle tocar semantics de proof/public signals)
- `docs/asp-protocol-mvp.md`

## Dependências
- R2 concluída

## Validação
- testes por pacote
- `cargo test -p protocol-registry`
- `cargo test -p asp-mvp`
- se houver alteração ZK/lifecycle: rebuild de artifacts e testes correlatos

## Gate de saída
> Um leitor técnico consegue responder “o que é uma credencial válida, inválida, revogada, expirada ou stale?” sem inferência subjetiva.

---

# Sprint R4 — Canonical Registry Maturity

## Objetivo
Transformar “cross-chain depth existe” em “canonical registry story clara e verificável”.

## Entregáveis
- doc consolidado de semântica do registry cross-chain
- exemplos replayáveis com artifacts existentes
- trust assumptions por origin chain
- boundary explícito do que é aceito hoje e do que ainda é roadmap

## Arquivos-alvo
- `docs/asp-protocol-mvp.md`
- novo doc: `docs/CROSS-CHAIN-CANONICAL-REGISTRY.md`
- scripts/examples correlatos

## Dependências
- R3 concluída

## Validação
- examples script-backed
- caminhos de artifact explicitados
- leitura cruzada com docs de ZK/cross-chain já existentes

## Gate de saída
> A história do canonical registry não depende mais de retórica; depende de doc + artifact + script replayável.

---

# Sprint R5 — Disclosure Bounded MVP

## Objetivo
Materializar um disclosure path robusto, mas bounded.

## Entregáveis
- semântica de selective disclosure / view-key
- auth model dos atores autorizados
- consistência entre payload selado e payload revelado
- rotação/revogação de acesso documentadas
- se necessário, helper/contract bounded para esse fluxo

## Arquivos-alvo
- novo doc: `docs/SELECTIVE-DISCLOSURE-BOUNDARY.md`
- eventual novo módulo/contract helper
- `docs/A-READINESS-PLAN.md` se disclosure authority tocar governança

## Dependências
- R4 concluída

## Validação
- testes de autorização
- testes de consistency/hash binding
- exemplos explícitos de:
  - o que é revelado
  - o que não é revelado
  - quem pode ver

## Gate de saída
> Dá para explicar “privacy from the public, accountability to the authorized party” sem fingir uma arquitetura institucional final que ainda não existe.

---

# Sprint R6 — Production Readiness Gates

## Objetivo
Fechar o pacote que separa base pública de produção real.

## Entregáveis
Criar:
- `docs/PRODUCTION-READINESS-GATES.md`

## Conteúdo mínimo
- audit gates
- MPC gates
- custody/value-movement gates
- governance authority gates
- operational monitoring gates
- incident-response gates
- release checklist de mainnet/public rollout

## Dependências
- R5 concluída

## Validação
- checklist fechada sem ambiguidades
- coerência com runbooks e ownership docs já criados

## Gate de saída
> O projeto sabe exatamente por que ainda não pode dizer “produção plena” — e sabe o que precisa acontecer para dizer.

---

# Sprint R7 — Full Revalidation & Public Surface Rewrite

## Objetivo
Fechar a fase com validação real e alinhamento da surface pública.

## Entregáveis
- rerun de testes relevantes
- rerun workspace
- update final dos docs públicos centrais
- wording final pronto para hackathon/SCF/partners
- memo executivo do estado final da fase

## Arquivos-alvo
- `docs/asp-protocol-mvp.md`
- `docs/hack-submission-latam-composability.md`
- `docs/composability-quickstart.md`
- `docs/FAQ-JUDGES-PARTNERS-AUDITORS.md`
- novo memo de fechamento da fase

## Dependências
- R6 concluída

## Validação mínima
- `cargo test -p protocol-registry`
- `cargo test -p asp-mvp`
- `cargo test -p pool-adapter-mock`
- `cargo test -p privacy-pool` (ou equivalente no workspace)
- `cargo test --workspace`
- se houver mudança em circuit/public signals: pipeline de ZK correspondente

## Gate de saída
> Podemos afirmar, com evidência, que DPO2U virou uma **public-base compliance protocol spine** em Stellar.

---

## Ordem de execução recomendada

### Bloco 1 — sem dispersão
- **R1** Public Truth Freeze
- **R2** Open Standard Draft
- **R3** Credential Lifecycle

### Bloco 2 — endurecimento do protocolo
- **R4** Canonical Registry Maturity
- **R5** Disclosure Bounded MVP

### Bloco 3 — fechamento institucional/técnico
- **R6** Production Readiness Gates
- **R7** Full Revalidation & Public Surface Rewrite

---

## Sequência de owners

| Faixa | Owner primário | Papel |
|---|---|---|
| Estratégia / wording / boundary | **Chairman / Hermes** | escopo, truth surface, docs executivos |
| Implementação técnica / reconciliação contrato-teste-doc | **CEO / Claude Code** | execução de sprint técnica |
| Chores mecânicos / scripts / validações repetitivas | **Worker / Codex** | suporte operacional |

---

## Critério de sucesso da fase

Ao final desta roadmap, a frase honesta passa a ser:

> **DPO2U já não é só um hack slice forte; ela passa a ser uma base pública de protocolo de compliance em Stellar, com verifier, lifecycle, revogação, registry e disclosure bounded explicitados, testados e padronizáveis.**

## Critério do que ainda NÃO estará fechado
Mesmo após esta fase, ainda não devemos dizer que fechamos:
- verifier network descentralizado
- privacy pool production-grade
- MPC madura
- anonimato de escala

---

## Minha recomendação executiva

Se tivermos que cortar ainda mais:

### fechar primeiro
- **R1 + R2 + R3 + R6**

Porque isso já entrega:
- verdade pública
- standardização
- lifecycle sólido
- maturidade institucional de produção

E só depois empurrar:
- **R4 + R5**

Se tivermos mais fôlego, fazemos os seis blocos e aí sim reescrevemos toda a surface pública final em R7.
