---
type: program-roadmap
title: "Stellar37° Acceleration — DPO2U Roadmap (M1–M8)"
version: 1.0
status: in-flight
date: 2026-05-13
source_prd: "DPO2U_PRD_Piloto_Anticorrupcao_v0.3.docx §13"
window: "2026-05-12 → 2026-06-11"
---

# STELLAR37° ACCELERATION — DPO2U ROADMAP

Cronograma operacional do acelerador Stellar37° (31 dias, 2026-05-12 → 2026-06-11). Esta é a **camada de execução comercial e institucional** sobre o stack técnico já entregue nos 17 PRs anteriores.

> **Status no início do programa**: backbone técnico (contrato Soroban testnet + F2 plane + Passkeys + erasure + ceremony docs) entregue em 2 dias antes do kickoff. Os milestones M1–M8 abaixo destravam adoção, audit, mainnet, e o ciclo SCF/Instawards.

---

## Estrutura

8 milestones discretos, cada um com **owner**, **deliverable observável**, **prazo absoluto** e **gate criterion**. Status atualizado durante o programa via PR neste documento.

| ID | Milestone | Owner | Deadline | Status |
|---|---|---|---|---|
| **M1** | Testnet contract live + 3 significant commits | DPO2U eng | 2026-05-14 | ✅ done 2026-05-12 |
| **M2** | Discovery: 5 prospect calls + 1 carta de intenção | Chairman | 2026-05-21 | 🟡 in progress |
| **M3** | x402 decision documented (closed N/A for MVP) | Chairman + advogada | 2026-05-22 | ✅ see [`X402_DECISION.md`](X402_DECISION.md) |
| **M4** | Hackathon participation (Stellar37° demo day) | DPO2U eng + Chairman | 2026-05-28 | 🟡 prep |
| **M5** | Security audit kickoff with engaged firm | DPO2U eng | 2026-05-30 | 🔴 not started |
| **M6** | User demos (3 recorded sessions, ICP-anchored) | Chairman | 2026-06-04 | 🔴 not started |
| **M7** | Mainnet deploy with multisig + 5 active wallets | Chairman + DPO2U eng | 2026-06-09 | 🔴 not started |
| **M8** | Village showcase + SCF/Instawards application submitted | Chairman | 2026-06-11 | 🔴 not started |

Legend: 🟢 not gating · 🟡 in progress · 🔴 blocked / not started · ✅ done

---

## M1 — Testnet contract live + 3 significant commits (✅ done)

**Deliverable**: Soroban contract `anticorruption-attestation` deployed na Stellar testnet com pelo menos 3 commits significativos demonstrando profundidade técnica.

**Status**: **done 2026-05-12**.

**Artefatos**:
- Contract ID: `CC4TJGDRWZOPGBWOOHBJF3N2VKUQRNIW6C6PTYHD7ZI3D42GBQRRZHM5`
- Deploy tx: `dc7608ac5a85ed23de28b398fce1197ae1f46359cd6ececf489b9f90a4f60a35`
- 17 PRs cobrindo: F1 contrato + G.{1..6} F2 plane + H.1 UC-1 real + J.{1,2,3} UC-2 + I.B sales pack + K.{1,2,boot} compliance + L mainnet readiness
- 374+ testes novos verdes, 0 regressão
- Stellar Expert: <https://stellar.expert/explorer/testnet/contract/CC4TJGDRWZOPGBWOOHBJF3N2VKUQRNIW6C6PTYHD7ZI3D42GBQRRZHM5>

**Gate**: aberto por default — backbone técnico completo é pré-requisito para todos os outros milestones.

---

## M2 — Discovery: 5 prospect calls + 1 carta de intenção (🟡 in progress)

**Deliverable**: 5 conversas qualificadas com prospects + pelo menos 1 carta de intenção assinada.

**ICP per [GTM_PLAN.md](GTM_PLAN.md)**: 
- Primário: Web3 founders LatAm operando produtos com compliance LGPD/GDPR sensível
- Secundário: prefeituras municipais BR ≤ 50k habitantes (anchor case TJDFT)
- Terciário: ONGs e instituições filantrópicas brasileiras

**Owner**: Chairman.

**Procedure**:
1. Lista curta de 15 prospects (Superteam BR network + Stellar Development Foundation contacts + Web3 LatAm).
2. Email opener customizado por persona usando sales-pack.
3. 30 min discovery call com cada — registrar perfil + objeções + interesse.
4. Pelo menos 5 fecham primeira call; pelo menos 1 evolui pra LoI até 21-mai.

**Gate criterion**: 5 calls registradas em `docs/discovery/YYYY-MM-DD-<empresa>.md` + 1 LoI no `docs/loi/`. Sem isso, M6 (demos) parte de cold.

---

## M3 — x402 decision documented (✅ done)

**Deliverable**: Decisão formal sobre x402 com justificativa + reentry trigger.

**Status**: ✅ — documentada em [`X402_DECISION.md`](X402_DECISION.md). Q5 fechada N/A para MVP. Reentry trigger: post-mainnet AND ≥5 paying clients AND demanda explícita.

---

## M4 — Hackathon participation (🟡 prep)

**Deliverable**: Demo ao vivo no Stellar37° demo day mostrando UC-1 round-trip.

**Owner**: DPO2U eng (demo técnica) + Chairman (pitch institucional).

**Format**: 5 min demo + 3 min Q&A.

**Demo script** (rascunho — refinado nas semanas antes):
1. **0:00–0:30** — Contexto: caso TJDFT R$ 5,5M (anchor case real).
2. **0:30–1:30** — Submissão via REST (curl ao vivo, evidência sintética).
3. **1:30–2:30** — Verdict propagation (5 predicates rodam, FAIL com reason code visível).
4. **2:30–3:30** — Auditor verifica trustlessly via CLI público (`dpo2u-attest verify`).
5. **3:30–4:30** — DPIA + threat model + LGPD Art. 18 erasure mostrado.
6. **4:30–5:00** — CTA: Web3 founders LatAm + municípios convidados pra design partner.

**Gate criterion**: vídeo gravado da demo arquivado em `docs/demos/M4-hackathon-{date}.mp4`.

---

## M5 — Security audit kickoff (🔴 not started)

**Deliverable**: Audit firm contratada e kickoff realizado.

**Owner**: DPO2U eng (technical liaison) + Chairman (engagement + budget).

**Surfaces a auditar** (per [SECURITY_AUDIT.md](SECURITY_AUDIT.md)):
1. **Soroban contract** (`contracts/anticorruption-attestation/`): require_auth checks, idempotency, immutability, storage rent.
2. **MCP server** (`packages/mcp-server/`): predicate engine determinism, oracle layered failover, secure-erase invariant, attempt store concurrency.
3. **Passkey auth flow** (`packages/mcp-server/src/auth/passkey/`): challenge replay defence, sign-count monotonicity, SEP-30 multisig topology.

**Candidate firms** (per PRD v0.3 §17.3): Trail of Bits, Statemind, Halborn. Adicionados ao pool da RUNBOOK §0.2: OtterSec, Sec3. Decisão final por Chairman + budget.

**Budget**: USD 30–50k (do grant SCF/Instawards alocado em [GRANT_APPLICATION.md](GRANT_APPLICATION.md) §3.1).

**Gate criterion**: contract assinado + kickoff call realizada + scope statement compartilhado.

---

## M6 — User demos (🔴 not started)

**Deliverable**: 3 demos individuais gravadas com prospects qualificados.

**Owner**: Chairman.

**Protocolo** (per [GTM_PLAN.md](GTM_PLAN.md) §2):
- 45 min screen-share gravado (consent registrado).
- Estrutura: 5 min contexto / 15 min demo round-trip / 15 min Q&A / 10 min design partner discussion.
- Output: vídeo arquivado + notas estruturadas em `docs/demos/{prospect}/M6-{date}.md`.

**Gate criterion**: 3 demos com ≥1 manifestação concreta de interesse (design partner OR LoI).

---

## M7 — Mainnet deploy with multisig + ≥5 active wallets (🔴 not started)

**Deliverable**: Contrato deployado em Stellar mainnet com multisig 2-of-3 ATIVO + **≥5 carteiras com atividade real** (não auto-tráfego).

**Owner**: Chairman (gate humano) + DPO2U eng (cerimônia técnica).

**Pré-requisitos** — ALL must be green:
- ✅ Sprint L `MAINNET-CEREMONY.md` artefatos gerados (RUNBOOK, ceremony script, canary).
- 🔴 Audit findings: 0 critical, 0 high não-mitigados (depende M5).
- 🔴 3 tabletop drills A/B/C dentro do tempo-alvo (RUNBOOK §7).
- 🔴 3 Ledger Nano S+ provisionados.
- 🔴 DPIA v1.0 + Threat Model v1.0 assinados pelas 3 partes (depende município ou design partner).
- 🔴 **NOVO em v0.3**: ≥5 carteiras com atividade real definida como ≥1 atestação on-chain cada nos últimos 30 dias antes do go-live, NÃO sob controle exclusivo da DPO2U.
- 🔴 Chairman approve formal PDF.

**Gate criterion v0.3**: a métrica das 5-wallets ativas é a inovação que separa v0.3 de v0.2 — força "demo with real users" antes do mainnet, evitando cerimônia institucional sobre infra vazia.

**Execução**: `scripts/deploy-mainnet.sh` (já entregue em Sprint L) com `EXPECTED_WASM_HASH` do audit + confirmação verbatim.

---

## M8 — Village showcase + SCF/Instawards application (🔴 not started)

**Deliverable**: Apresentação no Village (showcase Stellar37°) + grant application formal submetida via SCF/Instawards.

**Owner**: Chairman.

**Components**:
1. **Village showcase** (2026-06-11): pitch institucional final ao ecossistema Stellar. Format TBD pela organização.
2. **SCF application** — per [GRANT_APPLICATION.md](GRANT_APPLICATION.md):
   - Target: USD 100–250k.
   - Breakdown: audit 30–50k / legal 10–20k / jurisdictional expansion 40–60k / runway 20–120k.
   - Roadmap pós-grant: BR + CA legal opinions, audit completo, dois novos use cases.

**Gate criterion**: application submitted + reception confirmation by program officers.

---

## Riscos + mitigações ao calendário

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| M2 não fecha LoI em 9 dias | Média | Alto (cascata M6/M7) | Expandir ICP secundário (municípios) + acionar Superteam BR network |
| M5 audit firm sem janela em maio | Alta | Alto (gate M7) | Engagement pré-aprovado com firma reserve + budget pre-allocated |
| M7 não atinge 5 carteiras ativas | Alta | Crítico (gate principal) | Design partner free tier acelera adoção; sales-pack + monetization model alinhados |
| M8 SCF application incompleta | Baixa | Médio | Draft em paralelo com M6/M7; revisão por advogada parceira no dia anterior |
| Atraso em qualquer M cascateia | Média | Médio | Buffer de 2 dias entre M7→M8; M5 pode iniciar paralelo a M2 se budget aprovado |

---

## Atualizações

Esta tabela é **fonte da verdade**. PRs futuros que tocarem o roadmap atualizam apenas este arquivo (não duplicam em outros lugares).

| Data | Quem | Mudança |
|---|---|---|
| 2026-05-13 | Chairman | Versão 1.0 inicial — M1 marcado done, M3 marcado done (X402_DECISION committed) |

---

## Referências cruzadas

- PRD v0.3 §13 — fonte canônica deste roadmap
- [`X402_DECISION.md`](X402_DECISION.md) — M3 deliverable
- [`SECURITY_AUDIT.md`](SECURITY_AUDIT.md) — M5 scope
- [`MONETIZATION.md`](MONETIZATION.md) — M6/M7 commercial framing
- [`GTM_PLAN.md`](GTM_PLAN.md) — ICP + demo protocol
- [`GRANT_APPLICATION.md`](GRANT_APPLICATION.md) — M8 deliverable
- [`MAINNET-CEREMONY.md`](MAINNET-CEREMONY.md) — M7 execution procedure
- [`RUNBOOK.md`](RUNBOOK.md) — M7 operational gate (drills)
