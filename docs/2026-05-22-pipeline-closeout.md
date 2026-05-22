# Fechamento do pipeline DPO2U-Stellar — estado consolidado

> Documento-fonte do estado do pipeline (B2G anticorrupção + B2B compliance +
> ZK). Atualizado após os blocos A · B · C7 · E11 · E12 (2026-05-22).
>
> **Status: ~92% — núcleo completo e verificado em testnet.** O que resta é
> portão de produção (cerimônia, auditoria, mainnet), não invenção.

## 1. O que está pronto e verificado (testnet)

| Componente | Estado |
|---|---|
| Contrato de atestação genérico | ✅ testnet `CC4TJGDR…QRRZHM5` |
| Contrato verificador ZK | ✅ testnet `CBOOYCOU…FMNT` |
| Use cases on-chain | ✅ **15** (6 B2G + 9 B2B) |
| Pilot Gateway (HTTP + StellarDriver) | ✅ no ar, healthy |
| Alertas reais B2G atestados | ✅ 1.262 (sanção/sobrepreço/leniência) |
| Camada B2B — 16 jurisdições | ✅ `compliance_attestation_v1` |
| ZK — score privado, prova pública | ✅ verificado on-chain, com binding anti-replay |
| Painéis `/pilot/*` | ✅ alertas · compliance · **atestar** · verify · dashboard · contract |
| Suítes de teste | ✅ mcp-server **372** · pilot-gateway **63** |

## 2. Entregue nos blocos A·B·C7·E11·E12 (2026-05-22)

- **C7** — suíte de testes do pilot-gateway: de **0 → 63 testes** (15 evaluators,
  estatística, `resolveZkCompliance`/`verifyZkProof` on-chain).
- **B5** — gateway HTTP E2E: `app.ts` extraído + 6 testes `supertest` do
  `POST /api/v1/attestation/submit` (bypass `PILOT_DEMO_API_KEY`).
- **B6** — alvo Soroban no MCP: tool `submit_attestation_stellar` (dual-chain).
- **B4** — scoring→evidência: `buildComplianceEvidence` + tool
  `build_compliance_evidence` (input de auditoria → evidência selável).
- **A2** — binding anti-replay: 2º sinal público `context` no circuito; o
  verificador rejeita prova com `context` adulterado (confirmado on-chain).
- **E12** — UI `/pilot/atestar`: formulário cliente-facing de atestação B2B.
- **E11** — varredura `divergent_payee` (163 docs · 0 divergências, honesto).

## 3. O que resta para 100%

### Portão de produção — não executável solo
| Item | Estado | Referência |
|---|---|---|
| **A1** Cerimônia de trusted setup (MPC multi-party) | ⚠️ runbook pronto; cerimônia exige participantes externos | `zk-trusted-setup-runbook.md` |
| **A3** Auditoria de segurança do verificador | ⚠️ threat model + checklist prontos; exige auditor externo | `zk-verifier-threat-model.md` |
| **D** Deploy mainnet | ⚠️ portão humano explícito (sempre foi gate no roadmap) | `mainnet-readiness-checklist.md` |

### Hardening — executável, fora do escopo atacado
| Item | Estado |
|---|---|
| **T1** Gateway fixar a vk canônica (não aceitá-la do cliente) | aberto — bloqueador de produção; landa junto da vk da cerimônia |
| **C8** Multisig no admin/submitter do contrato (hoje single-sig) | aberto |
| **winner_rotation_v1** — fonte de dados | ⚠️ PNCP trava no ambiente; predicado pronto |

### Backlog declarado — exige fontes externas
- `cnae_mismatch` / `regulatory_authorization` / `price_ceiling` — dependem de
  ReceitaWS, ANVISA, CMED/SINAPI.

## 4. Síntese

O pipeline criptográfico/computacional **funciona ponta-a-ponta em testnet** e é
demonstrável hoje. Os blocos B (wires) e C7 (testes) estão **100%**. O bloco A
está com a engenharia feita (A2 binding) e o processo documentado (A1 runbook,
A3 threat model). O caminho para 100% real é:

1. Executar a cerimônia de trusted setup (A1) → fixar a vk canônica (T1).
2. Auditoria externa do verificador (A3).
3. Multisig no contrato (C8).
4. Decisão humana de deploy mainnet (D).

Nenhum desses é trabalho de invenção — é trabalho de processo, cerimônia e
decisão. O resíduo de ~8% é exatamente isso.

## Referências

- Fase 1 B2B — `2026-05-21-stellar-b2b-fase1.md`
- Fase 2 ZK — `2026-05-22-fase2-zk-verifier.md`
- Cobertura E11 — `2026-05-22-e11-coverage.md`
- Runbook de setup — `zk-trusted-setup-runbook.md`
- Threat model — `zk-verifier-threat-model.md`
- Roadmap anticorrupção — `demos/2026-05-21-roadmap-closeout.md`
